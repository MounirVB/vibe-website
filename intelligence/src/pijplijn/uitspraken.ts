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
import { maakLogger } from "../kern/log.ts";
import { bepaalClaimAard, CLAIMAARD_VERSIE } from "./claimaard.ts";
import { bepaalModaliteit } from "./claimmodaliteit.ts";
import {
  bewijskrachtPlafond,
  magZelfBevestigen,
  EIGEN_GEZAG_NAMEN,
  type Documentsoort,
  type Gezag,
} from "./documentsoort.ts";
import type { Documentvorm } from "./documentvorm.ts";
import { steltStukDeClaimVast, VASTSTELLING_VERSIE } from "./vaststelling.ts";
import { vraagOmBeoordeling } from "./claimbeoordeling.ts";

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
const log = maakLogger("uitspraken");

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

/**
 * Schaalwoorden achter een bedrag.
 *
 * Nederlandse bronnen schrijven 'EUR 200 miljard', niet '200000000000'.
 * Wie het woord negeert, bewaart een getal dat negen ordes van grootte
 * naast de bron ligt.
 */
const SCHAAL: Readonly<Record<string, number>> = {
  duizend: 1_000,
  miljoen: 1_000_000,
  mln: 1_000_000,
  miljard: 1_000_000_000,
  mld: 1_000_000_000,
};

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
  //
  // `(?<![\\d.,])` is de LINKERGRENS, en hij staat hier om dezelfde reden
  // als in pijplijn/uitdrukking.ts — zie de uitleg bij GETALGRENS daar.
  // Een punt die niet door exact drie cijfers wordt gevolgd past op geen
  // van beide alternatieven, waarna de motor opschuift en het staartje
  // matcht: '19.5%' werd '5 %' en '164.09 euro' werd '09 euro'.
  //
  // DAT DEZE TWEE BESTANDEN HET PATROON DELEN WAS HET ECHTE PROBLEEM.
  // verrijk() vergelijkt de uitkomst van uitdrukking.ts met die van dit
  // bestand als KRUISCONTROLE. Zolang beide dezelfde fout maakten, kwamen
  // ze op hetzelfde verkeerde getal uit en bevestigden ze elkaar. Een
  // kruiscontrole tussen twee kopieën van dezelfde fout is geen controle.
  // Wijzig dit patroon daarom nooit zonder uitdrukking.ts mee te nemen.
  const patroon = new RegExp(
    `(?<![\\d.,])(\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:,\\d+)?)\\s*(${eenheidAlternatieven})(?![\\p{L}])`,
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

  /* Bedragen in euro's: '€ 1.250', '1.250 euro', '€200 miljard'.
     ------------------------------------------------------------------
     DE SCHAALWOORDEN STONDEN HIER NIET, EN DAT WAS EEN ECHTE FOUT.
     Gemeten in productie op 12 oktober 2026 stonden deze twee rijen in
     intel.uitspraken, beide met verificatie_status 'bevestigd',
     bewijs_kwaliteit 5 en vertrouwen 0,90:

       brontekst 'meer dan EUR 200 miljard in het elektriciteitsnet'
         -> waarde_numeriek 200, eenheid EUR
       brontekst 'structureel EUR 125 miljoen per jaar (2027-2030)'
         -> waarde_numeriek 125, eenheid EUR

     Een factor 10^9 respectievelijk 10^6 ernaast, met de hoogste
     bewijskwaliteit die dit systeem kent. Zonder deze reparatie zou een
     wijzigingsvoorstel '200 euro' op een publieke pagina zetten waar de
     bron 200 miljard zegt. */
  /* De linkergrens `(?<![\d.,])` staat op BEIDE alternatieven, om dezelfde
     reden als bij het eenheidspatroon hierboven — en dit patroon is een
     tweede vindplaats die bij de eerste reparatie werd overgeslagen. Een
     eenheidstoets ving dat: '164.09 euro' leverde hier nog '9 EUR', want
     `(?:\.\d{3})*` staat nul groepen toe, dus '164' matcht zonder de punt,
     waarna de motor opschuift en '09' als bedrag leest. Een factor 18
     eraf, met de hoogste bewijskwaliteit die dit systeem kent. */
  const euroPatroon =
    /(?:€\s*(?<![\d.,])(\d{1,3}(?:\.\d{3})*(?:,\d+)?)|(?<![\d.,])(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*euro\b)\s*(duizend|miljoen|miljard|mln\.?|mld\.?)?/giu;
  while ((m = euroPatroon.exec(zin)) !== null) {
    const basis = getalVan(m[1] ?? m[2] ?? "");
    if (basis === null) continue;
    const schaalWoord = (m[3] ?? "").toLowerCase().replace(/\.$/, "");
    const factor = SCHAAL[schaalWoord] ?? 1;
    uit.push({
      tekst: kort(zin, 600),
      soort: "prijs",
      waardeNumeriek: basis * factor,
      eenheid: "EUR",
      geldigVanaf: null,
      geldigTot: null,
      vindplaats: `tekenpositie ${m.index}${schaalWoord ? ` (schaal: ${schaalWoord})` : ""}`,
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
  /**
   * Claims die het document wél mocht bevestigen, maar die een
   * JURIDISCHE vaststelling zijn uit een niet-vaststellend stuk. Ze
   * staan op 'ongeverifieerd' en wachten op bronverificatie.
   */
  readonly juridischGeblokkeerd: number;
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
    /**
     * R3 — de soort van het document waaruit deze claims komen, en het
     * gezag van de uitgever. VERPLICHT, en dat is het ontwerp: zou het
     * optioneel zijn met een veilige standaard, dan kan een nieuwe
     * aanroeper hem vergeten en valt de hele reparatie stil terug op
     * het oude gedrag. Nu dwingt de typecheck elke aanroeper.
     */
    documentsoort: Documentsoort;
    gezag: Gezag;
    /**
     * De VORM van het brondocument. Nodig omdat de juridische poort
     * hieronder vraagt of dit stuk een AUTHENTIEKE juridische bron is,
     * en dat is een vraag over uitgever en vorm — niet over de inhoud.
     */
    documentvorm: Documentvorm;
    /**
     * De bronsleutel van het document. VERPLICHT, om dezelfde reden als
     * documentsoort hierboven: de vaststellingstoets heeft hem nodig om
     * te weten welke gezagsnamen voor DIT document het EIGEN gezag zijn
     * (EIGEN_GEZAG_NAMEN). Zonder die kaart zou "de ACM heeft besloten"
     * in een ACM-besluit als navertelling gelden, en dan blokkeert het
     * stuk zijn eigen claim.
     */
    bronSleutel: string;
    /**
     * De publicatiedatum van het brondocument (ISO), als peildatum voor
     * de modaliteit. Zie de toelichting bij ModaliteitInvoer.peildatum:
     * of een zin over een jaartal terugkijkt of vooruitkijkt, hangt af
     * van wanneer de schrijver hem opschreef — niet van onze klok.
     * Ontbreekt hij, dan vuurt het jaartalsignaal niet.
     */
    peildatum?: string | undefined;
  },
): Promise<UitspraakSchrijfRapport> {
  const ruwe = extraheerUitspraken(invoer.titel, invoer.tekst);
  if (ruwe.length === 0)
    return { aangemaakt: 0, bevestigd: 0, overgeslagen: 0, juridischGeblokkeerd: 0 };

  /* DE REGEL, OP ÉÉN PLEK — en in R3 met een tweede as erbij.
     ------------------------------------------------------------------
     Hiervoor stond hier alleen:

       magBevestigen = invoer.isPrimaireBron && invoer.betrouwbaarheid >= 4

     Beide waarden komen uit intel.bronnen en horen bij de UITGEVER.
     Gemeten gevolg in productie op 30 oktober 2026: `netbeheer-
     nederland-nieuws` staat op betrouwbaarheid 5 met is_primaire_bron
     true, en leverde daardoor 45 claims die ALLE 45 bevestigd waren met
     bewijs_kwaliteit 5 — 45 van de 51 bevestigde claims in het hele
     platform. Daaronder deze, uit een document met de titel 'Inbreng
     voor het eerste debat Netcongestie van de nieuwe Kamer':

       'Schaal daarom de bestaande Flex-E-regeling op naar een Flex-E
        regeling XL van structureel EUR 125 miljoen per jaar (2027-2030).'

     Een verzoek aan de Kamer, opgeslagen als vastgesteld feit met de
     hoogste bewijskracht die dit systeem kent.

     De documentsoort is nu de tweede voorwaarde. Navertellen, opiniëren
     en lobbyen bevestigen niets meer, ook niet van een partij die op 5
     staat. Zie magZelfBevestigen() in documentsoort.ts. */
  const magBevestigen =
    invoer.isPrimaireBron &&
    invoer.betrouwbaarheid >= 4 &&
    magZelfBevestigen(invoer.documentsoort, invoer.gezag);

  /* HET PLAFOND IS EEN PLAFOND EN GEEN WAARDE. De betrouwbaarheid van
     de bron blijft gelden; de documentsoort kan hem alleen verlagen.
     Een uitgever die om een andere reden op 3 staat, hoort niet door
     een mooie documentsoort op 5 te komen. */
  const plafond = bewijskrachtPlafond(invoer.documentsoort, invoer.gezag);
  const bewijsKwaliteit = Math.min(
    Math.min(5, Math.max(1, invoer.betrouwbaarheid)),
    plafond,
  );
  const hersienVoor = new Date(
    Date.now() + herzieningstermijnDagen(invoer.onderwerp) * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);

  let aangemaakt = 0;
  let bevestigd = 0;
  let overgeslagen = 0;
  let juridischGeblokkeerd = 0;

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

    /* DE MODALITEIT KOMT UIT DE ZIN, NIET UIT HET DOCUMENT.
       Ook in een gezaghebbend document staan voorstellen naast
       vaststellingen: een besluit van de minister kan in dezelfde
       alinea zeggen wat er nú geldt en wat er WORDT voorgesteld. De
       documentsoort weegt mee als aanvullend signaal, maar beslist
       niet. Zie bepaalModaliteit(). */
    const mod = bepaalModaliteit({
      tekst: u.tekst,
      documentsoort: invoer.documentsoort,
      ...(invoer.peildatum === undefined ? {} : { peildatum: invoer.peildatum }),
    });

    const nieuw = await eenRij<{ id: number }>(
      c,
      `insert into intel.uitspraken
         (organisatie_id, gebeurtenis_id, tekst, soort, waarde_numeriek, eenheid,
          onderwerp, geldig_vanaf, geldig_tot, hersien_voor, laatst_geverifieerd_op,
          verificatie_status, bewijs_kwaliteit, risico_klasse, vertrouwen,
          is_interpretatie, interpretatie_door,
          modaliteit, modaliteit_zekerheid, modaliteit_versie, modaliteit_grondslag,
          bewijskracht_plafond)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),
               'ongeverifieerd',$11,$12,$13,false,null,
               $14,$15,$16,$17,$18)
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
        bewijsKwaliteit,
        invoer.risicoKlasse,
        vertrouwen.toFixed(2),
        mod.modaliteit,
        mod.zekerheid.toFixed(2),
        mod.versie,
        JSON.stringify(mod.grondslag),
        plafond,
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

    /* DE POORT PER CLAIM, en niet per document.

       `magBevestigen` hierboven kijkt naar het DOCUMENT: is de uitgever
       een primaire bron, is hij betrouwbaar genoeg, en mag deze
       documentsoort zichzelf bevestigen. Dat is voor een feitelijke
       mededeling over eigen handelen het juiste antwoord.

       Maar niet elke zin in zo'n stuk gaat over eigen handelen.
       Gemeten op 31 oktober 2026, met rijksoverheid-nieuws
       (betrouwbaarheid 5, primaire bron):

         "De verplichte gegevensdeling voor netbeheerders geldt vanaf
          1 juli 2027."
         "Het maximumtarief bedraagt vanaf 1 juli 2027 nog 45 euro
          per maand."

       Beide kwamen uit een FEITELIJKE_MEDEDELING met plafond 4, kregen
       modaliteit VASTGESTELD met zekerheid 0,80, werden BEVESTIGD en
       haalden claimDraagt(). Dat zijn juridische vaststellingen — een
       verplichting en een wettelijk maximum — die zichzelf bevestigen
       uit een nieuwsbericht, zonder dat er ooit een authentieke
       juridische bron is gezien.

       Een nieuwsbericht mag MELDEN dat een regel geldt. Het mag niet het
       BEWIJS zijn dat hij geldt. Daarvoor moet bronverificatie.ts het
       origineel bij het bevoegde gezag vinden, met hetzelfde getal,
       dezelfde eenheid, hetzelfde onderwerp en modaliteit VASTGESTELD.

       DIT VERLAAGT NIETS. Het is een extra voorwaarde bovenop alle
       bestaande; geen claim die eerder niet bevestigde, bevestigt nu
       wel. */
    const aard = bepaalClaimAard(u.tekst);
    /* DE POORT KIJKT NAAR DE VORM EN NIET NAAR DE SOORT, en dat is een
       correctie op mijn eerste opzet.

       Ik liet hem eerst `VASTSTELLENDE_SOORTEN` lezen. De tegenproef
       zakte: een ECHT tariefbesluit — "Gelet op artikel 41 ... Het
       maximumtarief bedraagt vanaf 1 juli 2027 nog 45 euro per maand.
       Belanghebbenden kunnen binnen zes weken bezwaar maken." — kwam uit
       op FEITELIJKE_MEDEDELING, omdat `geldt vanaf` en `bedraagt` niet
       in de smalle BESLUIT- en REGELGEVING-patronen staan. Daarmee werd
       de authentieke bron geblokkeerd voor zijn eigen juridische claim,
       en dat is geen strengheid maar een kapotte keten: dan kan
       bronverificatie.ts nergens meer ankeren.

       De vraag "mag dit stuk recht vaststellen" hoort niet van een
       regex op de inhoud af te hangen maar van wie het uitvaardigt en
       in welke vorm. Bevoegd gezag plus een bekendmakingsvorm IS de
       authentieke juridische bron; de smalle inhoudspatronen zijn daar
       een onvolledige afgeleide van. */
    /* R3-CORRECTIE, 31 oktober 2026 — DE DOCUMENTEIS WAS NIET GENOEG.
       ----------------------------------------------------------------
       Hierboven stond alleen:

         authentiekeGrondslag = gezag === BEVOEGD_GEZAG
                                && vormKanVaststellen(documentvorm)

       Dat is een eigenschap van het DOCUMENT en zegt niets over DEZE
       claim. Geforceerd en gemeten: een echt concentratiebesluit van de
       ACM (OFFICIEEL_BESLUIT / BEKENDMAKING / BEVOEGD_GEZAG, plafond 5)
       met de regel "Ter achtergrond: het maximumtarief bedraagt vanaf
       1 juli 2027 nog 45 euro per maand" bevestigde die tariefzin, en
       ook "De verplichte gegevensdeling voor netbeheerders geldt vanaf
       1 juli 2027". Een concentratiebesluit beslist over zeggenschap en
       niets over een tarief.

       steltStukDeClaimVast() beantwoordt nu de vraag die ontbrak: stelt
       dit stuk DEZE claim vast, of staat de claim er alleen IN. Hij
       BEVAT de oude voorwaarde als eerste eis en voegt er vier toe —
       ontwerp, modaliteit, achtergrondpassage en toeschrijving aan een
       ander orgaan. Er is dus geen drempel verlaagd.

       De passagetoets is EENZIJDIG: hij blokkeert alleen bij positief
       bewijs van achtergrond. Zie de kop van vaststelling.ts voor de
       meting waarom "bewijs dat hij in het dictum staat" de keten
       breekt. */
    const vaststelling = steltStukDeClaimVast({
      claimTekst: u.tekst,
      documentTitel: invoer.titel,
      documentTekst: invoer.tekst,
      documentsoort: invoer.documentsoort,
      gezag: invoer.gezag,
      documentvorm: invoer.documentvorm,
      modaliteit: mod.modaliteit,
      eigenGezagNamen: EIGEN_GEZAG_NAMEN[invoer.bronSleutel] ?? [],
    });
    const juridischZonderGrondslag = aard.juridisch && !vaststelling.steltVast;

    if (magBevestigen && !juridischZonderGrondslag) {
      await c.query(
        "update intel.uitspraken set verificatie_status = 'bevestigd' where id = $1",
        [nieuw.id],
      );
      bevestigd += 1;
    } else if (magBevestigen && juridischZonderGrondslag) {
      /* De blokkade hoort navolgbaar te zijn. De claim blijft
         'ongeverifieerd' — wat het dashboard al toont — en de reden
         staat hier in het log, met de bronversie erbij. */
      juridischGeblokkeerd += 1;
      log.info("juridische claim niet zelfbevestigd", {
        uitspraakId: nieuw.id,
        versieId: invoer.versieId,
        documentsoort: invoer.documentsoort,
        reden: aard.reden,
        markeringen: aard.markeringen,
        /* WAAROM hij niet vaststelt, en niet alleen DAT hij het niet
           doet. Zonder deze uitslag is een blokkade op 'achtergrond'
           niet te onderscheiden van een blokkade op 'verkeerde vorm',
           en dan is hij niet na te meten. */
        vaststelling: vaststelling.uitslag,
        vaststellingReden: vaststelling.reden,
      });
      /* En de blokkade hoort niet alleen in een logregel te staan. Een
         logregel is na een deploy weg en niemand kan erop handelen.
         Zie vraagOmBeoordeling(): de claim komt in een register waar een
         mens hem kan beslissen. Fail-closed: lukt dat niet, dan blijft
         de claim gewoon 'ongeverifieerd'. */
      await vraagOmBeoordeling(c, organisatieId, {
        uitspraakId: nieuw.id,
        versieId: invoer.versieId,
        aanleiding: vaststelling.uitslag,
        reden: `${aard.reden}; ${vaststelling.reden}`,
        motorversies: `${CLAIMAARD_VERSIE} + ${VASTSTELLING_VERSIE}`,
      });
    }
  }

  return { aangemaakt, bevestigd, overgeslagen, juridischGeblokkeerd };
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
