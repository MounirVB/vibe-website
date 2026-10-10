/* ============================================================
   PIJPLIJN — uitspraken extraheren
   ------------------------------------------------------------
   Een uitspraak is een atomair, naar één bronversie herleidbaar feit.
   De extractie is deterministisch: reguliere expressies op getallen,
   eenheden en datums. Geen model.

   Dat is een bewuste keuze. Een getal is het enige dat later een
   gepubliceerde bewering kan dragen, en bij een getal mag er geen
   ruimte zitten tussen wat de bron zei en wat wij opslaan. Een model
   mag straks interpreteren wat een getal betekent; het mag het niet
   bepalen.

   De verificatiestatus volgt één regel:
     * een primaire bron met betrouwbaarheid >= 4 die een getal in zijn
       eigen publicatie noemt IS het bewijs -> 'bevestigd';
     * al het andere blijft 'ongeverifieerd' tot een primaire bron het
       bevestigt.
   Vakmedia leveren dus nooit op zichzelf een bevestigde uitspraak.
   ============================================================ */

import type pg from "pg";
import { eenRij, rijen } from "../kern/db.ts";
import { kort, normaliseerTekst } from "../kern/tekst.ts";
import type { Onderwerp } from "../bronnen/soorten.ts";

export type UitspraakSoort =
  | "feit"
  | "cijfer"
  | "datum"
  | "regel"
  | "prijs"
  | "specificatie"
  | "status"
  | "berekening"
  | "interpretatie";

/** Plafonds zoals de databaseconstraint ze ook afdwingt. */
export const VERTROUWEN_PLAFOND: Readonly<Record<UitspraakSoort, number>> = {
  feit: 1.0,
  regel: 1.0,
  datum: 1.0,
  status: 1.0,
  cijfer: 0.9,
  prijs: 0.9,
  specificatie: 0.9,
  berekening: 0.8,
  interpretatie: 0.7,
};

type EenheidRegel = {
  readonly patroon: string;
  readonly eenheid: string;
  readonly soort: UitspraakSoort;
};

/**
 * Eenheden die in deze markt betekenis hebben. De volgorde telt: MWh
 * moet vóór MW gematcht worden, anders leest '5 MWh' als '5 MW'.
 */
const EENHEDEN: readonly EenheidRegel[] = [
  { patroon: "gwh", eenheid: "GWh", soort: "cijfer" },
  { patroon: "mwh", eenheid: "MWh", soort: "cijfer" },
  { patroon: "kwh", eenheid: "kWh", soort: "cijfer" },
  { patroon: "mwp", eenheid: "MWp", soort: "cijfer" },
  { patroon: "kwp", eenheid: "kWp", soort: "cijfer" },
  { patroon: "gw", eenheid: "GW", soort: "cijfer" },
  { patroon: "mva", eenheid: "MVA", soort: "cijfer" },
  { patroon: "kva", eenheid: "kVA", soort: "cijfer" },
  { patroon: "mw", eenheid: "MW", soort: "cijfer" },
  { patroon: "kw", eenheid: "kW", soort: "cijfer" },
  { patroon: "kv", eenheid: "kV", soort: "cijfer" },
  { patroon: "wp", eenheid: "Wp", soort: "cijfer" },
  { patroon: "%", eenheid: "%", soort: "cijfer" },
  { patroon: "ct/kwh", eenheid: "ct/kWh", soort: "prijs" },
  { patroon: "eur/mwh", eenheid: "EUR/MWh", soort: "prijs" },
  { patroon: "euro/mwh", eenheid: "EUR/MWh", soort: "prijs" },
];

const MAANDEN: Readonly<Record<string, number>> = {
  januari: 1,
  februari: 2,
  maart: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  augustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  december: 12,
};

/** Splitst op zinnen; houdt gangbare Nederlandse afkortingen heel. */
export function splitsZinnen(tekst: string): string[] {
  const beschermd = normaliseerTekst(tekst)
    .replace(/\b(bijv|o\.a|m\.n|resp|nl|art|lid|nr|ca|incl|excl|etc|e\.d|z\.g|t\.o\.v|i\.v\.m)\./gi, "$1«punt»");
  return beschermd
    .split(/(?<=[.!?])\s+(?=[A-Z0-9«"'(])|\n+/)
    .map((z) => z.replaceAll("«punt»", ".").trim())
    .filter((z) => z.length > 10);
}

function getalVan(ruw: string): number | null {
  // Nederlands: punt is duizendscheiding, komma is decimaalteken.
  const genormaliseerd = ruw.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number.parseFloat(genormaliseerd);
  return Number.isFinite(n) ? n : null;
}

export type RuweUitspraak = {
  readonly tekst: string;
  readonly soort: UitspraakSoort;
  readonly waardeNumeriek: number | null;
  readonly eenheid: string | null;
  readonly geldigVanaf: string | null;
  readonly geldigTot: string | null;
  readonly vindplaats: string;
};

function zoekGetallen(zin: string): RuweUitspraak[] {
  const uit: RuweUitspraak[] = [];
  const eenheidAlternatieven = EENHEDEN.map((e) =>
    e.patroon.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|");
  // Het eerste alternatief MOET zijn decimaaldeel meenemen. Zonder
  // `(?:,\\d+)?` matcht '1.250,5 kW' op '250,5' in plaats van op
  // '1.250,5' — een factor vijf eraf, en niets dat dat zou opvallen.
  const patroon = new RegExp(
    `(\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:,\\d+)?)\\s*(${eenheidAlternatieven})(?![\\p{L}])`,
    "giu",
  );

  let m: RegExpExecArray | null;
  while ((m = patroon.exec(zin)) !== null) {
    const ruwGetal = m[1];
    const ruweEenheid = m[2];
    if (!ruwGetal || !ruweEenheid) continue;
    const regel = EENHEDEN.find((e) => e.patroon === ruweEenheid.toLowerCase());
    if (!regel) continue;
    const waarde = getalVan(ruwGetal);
    if (waarde === null) continue;
    uit.push({
      tekst: kort(zin, 600),
      soort: regel.soort,
      waardeNumeriek: waarde,
      eenheid: regel.eenheid,
      geldigVanaf: null,
      geldigTot: null,
      vindplaats: `tekenpositie ${m.index}`,
    });
  }

  // Bedragen in euro's: '€ 1.250', '1.250 euro'.
  const euroPatroon = /(?:€\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?)|(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*euro\b)/giu;
  while ((m = euroPatroon.exec(zin)) !== null) {
    const waarde = getalVan(m[1] ?? m[2] ?? "");
    if (waarde === null) continue;
    uit.push({
      tekst: kort(zin, 600),
      soort: "prijs",
      waardeNumeriek: waarde,
      eenheid: "EUR",
      geldigVanaf: null,
      geldigTot: null,
      vindplaats: `tekenpositie ${m.index}`,
    });
  }

  return uit;
}

function isoDatum(dag: number, maand: number, jaar: number): string | null {
  if (maand < 1 || maand > 12 || dag < 1 || dag > 31) return null;
  if (jaar < 2000 || jaar > 2100) return null;
  // Echte kalendercontrole, niet alleen dag <= 31: '31 februari 2027'
  // haalde die test wel en leverde dan een datum op die niet bestaat.
  // Date rolt een ongeldige dag door naar de volgende maand, dus als de
  // componenten niet terugkomen zoals ze ingingen, bestaat de datum niet.
  const d = new Date(Date.UTC(jaar, maand - 1, dag));
  if (
    d.getUTCFullYear() !== jaar ||
    d.getUTCMonth() !== maand - 1 ||
    d.getUTCDate() !== dag
  ) {
    return null;
  }
  return `${jaar}-${String(maand).padStart(2, "0")}-${String(dag).padStart(2, "0")}`;
}

function zoekDatums(zin: string): RuweUitspraak[] {
  const uit: RuweUitspraak[] = [];
  const maandNamen = Object.keys(MAANDEN).join("|");

  // '1 januari 2027', eventueel met 'per', 'vanaf', 'tot' ervoor.
  const patroon = new RegExp(
    `\\b(per|vanaf|met ingang van|tot en met|tot|uiterlijk|voor)?\\s*(\\d{1,2})\\s+(${maandNamen})\\s+(\\d{4})`,
    "giu",
  );
  let m: RegExpExecArray | null;
  while ((m = patroon.exec(zin)) !== null) {
    const voorzetsel = (m[1] ?? "").toLowerCase();
    const dag = Number.parseInt(m[2] ?? "", 10);
    const maand = MAANDEN[(m[3] ?? "").toLowerCase()];
    const jaar = Number.parseInt(m[4] ?? "", 10);
    if (maand === undefined) continue;
    const datum = isoDatum(dag, maand, jaar);
    if (!datum) continue;

    const isEinde = ["tot en met", "tot", "uiterlijk", "voor"].includes(voorzetsel);
    const isStart = ["per", "vanaf", "met ingang van"].includes(voorzetsel);
    uit.push({
      tekst: kort(zin, 600),
      soort: "datum",
      waardeNumeriek: null,
      eenheid: null,
      geldigVanaf: isStart ? datum : null,
      geldigTot: isEinde ? datum : null,
      vindplaats: `tekenpositie ${m.index}`,
    });
  }
  return uit;
}

/**
 * Haalt uitspraken uit titel en tekst. Alleen wat er letterlijk staat;
 * er wordt niets bijgerekend of geïnterpreteerd.
 */
export function extraheerUitspraken(titel: string, tekst: string): RuweUitspraak[] {
  const zinnen = [titel, ...splitsZinnen(tekst)];
  const uit: RuweUitspraak[] = [];
  const gezien = new Set<string>();

  for (const zin of zinnen) {
    for (const u of [...zoekGetallen(zin), ...zoekDatums(zin)]) {
      // Dedup binnen één document: dezelfde waarde in dezelfde zin is
      // één uitspraak, ook als de regex hem twee keer vindt.
      const sleutel = `${u.soort}|${u.waardeNumeriek}|${u.eenheid}|${u.geldigVanaf}|${u.geldigTot}|${u.tekst}`;
      if (gezien.has(sleutel)) continue;
      gezien.add(sleutel);
      uit.push(u);
    }
  }
  return uit;
}

/** Hoe lang een uitspraak over dit onderwerp onbetwist mag blijven. */
export function herzieningstermijnDagen(onderwerp: Onderwerp): number {
  switch (onderwerp) {
    // Subsidievoorwaarden en netcapaciteit verschuiven het snelst, en
    // een verouderde claim daarover is het schadelijkst.
    case "subsidie":
    case "netcongestie":
      return 30;
    case "marktprijs":
      return 7;
    case "regelgeving":
    case "netbeheer":
      return 90;
    default:
      return 180;
  }
}

export type UitspraakSchrijfRapport = {
  readonly aangemaakt: number;
  readonly bevestigd: number;
  readonly overgeslagen: number;
};

/**
 * Schrijft uitspraken weg voor één bronversie en bindt ze aan die
 * versie als primaire herkomst. De bewijsplicht-trigger in de database
 * accepteert 'bevestigd' alleen als die binding bestaat; daarom wordt
 * de binding eerst gelegd en de status in dezelfde transactie gezet
 * (de constraint trigger is DEFERRABLE INITIALLY DEFERRED).
 */
export async function schrijfUitspraken(
  c: pg.PoolClient,
  organisatieId: number,
  invoer: {
    versieId: number;
    gebeurtenisId: number | null;
    titel: string;
    tekst: string;
    onderwerp: Onderwerp;
    risicoKlasse: "laag" | "midden" | "hoog";
    isPrimaireBron: boolean;
    betrouwbaarheid: number;
  },
): Promise<UitspraakSchrijfRapport> {
  const ruwe = extraheerUitspraken(invoer.titel, invoer.tekst);
  if (ruwe.length === 0) return { aangemaakt: 0, bevestigd: 0, overgeslagen: 0 };

  // De regel, op één plek: alleen een primaire bron van voldoende
  // betrouwbaarheid levert op zichzelf bewijs.
  const magBevestigen = invoer.isPrimaireBron && invoer.betrouwbaarheid >= 4;
  const hersienVoor = new Date(
    Date.now() + herzieningstermijnDagen(invoer.onderwerp) * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);

  let aangemaakt = 0;
  let bevestigd = 0;
  let overgeslagen = 0;

  for (const u of ruwe) {
    const vertrouwen = Math.min(
      VERTROUWEN_PLAFOND[u.soort],
      magBevestigen ? VERTROUWEN_PLAFOND[u.soort] : VERTROUWEN_PLAFOND[u.soort] * 0.7,
    );

    const bestaand = await eenRij<{ id: number }>(
      c,
      `select u.id
         from intel.uitspraken u
         join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
        where ub.versie_id = $1
          and u.soort = $2
          and u.tekst = $3
          and coalesce(u.waarde_numeriek, -1) = coalesce($4::numeric, -1)
          and coalesce(u.eenheid, '') = coalesce($5, '')
        limit 1`,
      [invoer.versieId, u.soort, u.tekst, u.waardeNumeriek, u.eenheid],
    );
    if (bestaand) {
      overgeslagen += 1;
      continue;
    }

    const nieuw = await eenRij<{ id: number }>(
      c,
      `insert into intel.uitspraken
         (organisatie_id, gebeurtenis_id, tekst, soort, waarde_numeriek, eenheid,
          onderwerp, geldig_vanaf, geldig_tot, hersien_voor, laatst_geverifieerd_op,
          verificatie_status, bewijs_kwaliteit, risico_klasse, vertrouwen,
          is_interpretatie, interpretatie_door)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),
               'ongeverifieerd',$11,$12,$13,false,null)
       returning id`,
      [
        organisatieId,
        invoer.gebeurtenisId,
        u.tekst,
        u.soort,
        u.waardeNumeriek,
        u.eenheid,
        invoer.onderwerp,
        u.geldigVanaf,
        u.geldigTot,
        hersienVoor,
        Math.min(5, Math.max(1, invoer.betrouwbaarheid)),
        invoer.risicoKlasse,
        vertrouwen.toFixed(2),
      ],
    );
    if (!nieuw) {
      overgeslagen += 1;
      continue;
    }
    aangemaakt += 1;

    await c.query(
      `insert into intel.uitspraak_bronnen
         (organisatie_id, uitspraak_id, versie_id, rol, vindplaats)
       values ($1, $2, $3, 'primair', $4)
       on conflict (uitspraak_id, versie_id) do nothing`,
      [organisatieId, nieuw.id, invoer.versieId, u.vindplaats],
    );

    if (magBevestigen) {
      await c.query(
        "update intel.uitspraken set verificatie_status = 'bevestigd' where id = $1",
        [nieuw.id],
      );
      bevestigd += 1;
    }
  }

  return { aangemaakt, bevestigd, overgeslagen };
}

/**
 * Zoekt tegenspraak binnen een gebeurtenis: twee uitspraken met
 * dezelfde eenheid maar een andere waarde, uit verschillende bronnen.
 * Dat is geen fout maar een signaal dat een mens moet kijken.
 */
export async function vindTegenspraak(
  c: pg.PoolClient,
  gebeurtenisId: number,
): Promise<{ tegenspraak: boolean; details: string[] }> {
  const botsingen = await rijen<{
    eenheid: string;
    waarden: string;
    bronnen: number;
  }>(
    c,
    `select u.eenheid,
            string_agg(distinct u.waarde_numeriek::text, ' vs ' order by u.waarde_numeriek::text) as waarden,
            count(distinct b.id)::int as bronnen
       from intel.uitspraken u
       join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
       join intel.brondocument_versies v on v.id = ub.versie_id
       join intel.brondocumenten d on d.id = v.brondocument_id
       join intel.bronnen b on b.id = d.bron_id
      where u.gebeurtenis_id = $1
        and u.eenheid is not null
        and u.waarde_numeriek is not null
      group by u.eenheid
     having count(distinct u.waarde_numeriek) > 1
        and count(distinct b.id) > 1`,
    [gebeurtenisId],
  );

  return {
    tegenspraak: botsingen.length > 0,
    details: botsingen.map(
      (b) => `${b.eenheid}: ${b.waarden} uit ${b.bronnen} verschillende bronnen`,
    ),
  };
}
