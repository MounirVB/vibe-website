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
  leesVormClaims,
  CLAIMVORM_VERSIE,
  type Claimvorm,
  type Tijdstand,
} from "./claimvorm.ts";
import { bepaalDatumrol, herkenBetreft, type Datumrol } from "./datumrol.ts";
import { claimAfdruk, CLAIMIDENTITEIT_VERSIE } from "./claimidentiteit.ts";
import {
  bewijskrachtPlafond,
  magZelfBevestigen,
  EIGEN_GEZAG_NAMEN,
  type Documentsoort,
  type Gezag,
} from "./documentsoort.ts";
import { vormKanVaststellen, type Documentvorm } from "./documentvorm.ts";
import { steltStukDeClaimVast, VASTSTELLING_VERSIE } from "./vaststelling.ts";
import { MOTORVERSIES } from "./motorversies.ts";
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
  /* HET WOORD NAAST HET TEKEN. '%' stond er wel, 'procent' niet, en
     gemeten op de brontekst schrijven deze bronnen het even vaak uit:
     "de tarieven dalen in 2026 met 12 procent" leverde nul uitspraken.
     De eenheid is dezelfde, dus de claim is dezelfde. */
  { patroon: "procent", eenheid: "%", soort: "cijfer" },
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
/* DEZE TABEL MOET GELIJK ZIJN AAN DIE IN uitdrukking.ts.

   Gemeten op 5 november 2026: daar stonden 'mille' en 'biljoen' wel en
   hier niet. schaalcorrectie.ts had 'biljoen' al toegevoegd met precies
   die reden erbij — "juist die asymmetrie tussen twee lagen is de klasse
   fout die PR #28 in de getalpatronen moest repareren".

   Waarom het ertoe doet: semantiek.ts laat rijmtMetUitdrukking() de
   uitkomst van dit bestand tegen die van uitdrukking.ts aanhouden als
   KRUISCONTROLE. Kent de ene laag een schaalwoord dat de andere niet
   kent, dan rijmt een correct geëxtraheerd bedrag niet met zijn eigen
   uitdrukking en valt de claim af — niet omdat hij fout is, maar omdat
   de twee lagen een ander woordenboek hebben. */
const SCHAAL: Readonly<Record<string, number>> = {
  duizend: 1_000,
  mille: 1_000,
  miljoen: 1_000_000,
  mln: 1_000_000,
  miljard: 1_000_000_000,
  mld: 1_000_000_000,
  biljoen: 1_000_000_000_000,
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
  /* ----------------------------------------------------------------
     DE VELDEN VAN DE NIET-NUMERIEKE ROUTE (migratie 0054).

     Alle vier optioneel, en dat is geen slordigheid: een getalclaim
     HEEFT geen vorm en geen datumrol. Ze op null laten staan is de
     juiste waarde en niet een ontbrekende, precies zoals LOSSE_DATUM
     een uitkomst is en geen leegte.
     ---------------------------------------------------------------- */
  readonly claimvorm?: Claimvorm | null;
  readonly tijdstand?: Tijdstand | null;
  readonly datumrol?: Datumrol | null;
  /** Het letterlijke fragment uit de bron dat de vorm of rol aanwijst. */
  readonly bronpassage?: string | null;
  /** WAT de claim betreft, uit herkenBetreft(). */
  readonly betreft?: string | null;
  /** De semantiek_soort die bij deze vorm hoort. */
  readonly semantiekSoort?: string | null;
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
  /* DRIE VORMEN, EN DE DERDE ONTBRAK.

     Gemeten op 5 november 2026 op de echte brontekst van
     netbeheer-nederland-nieuws: "Het uitvoeren van alle IBO-maatregelen
     kan tot 30 miljard euro besparen" en "Netbeheerders investeren tot
     2040 meer dan 200 miljard euro" leverden NUL uitspraken. Tien
     claimloze gebeurtenissen van samen 85.000 tekens leverden samen nul.

     De oorzaak was de plaats van het schaalwoord. Dit patroon kende
     '€200 miljard' (symbool, getal, schaal) en '200 euro miljard' (een
     vorm die niemand schrijft), maar niet '200 miljard euro' — getal,
     schaal, dan het woord euro. En dat is juist de dominante
     Nederlandse vorm.

     DIT IS GEEN NIEUWE AANNAME MAAR HET WEGWERKEN VAN EEN ASYMMETRIE.
     uitdrukking.ts kende de vorm al: regel 300 daar leest
     '(€|EUR)? GETAL SCHAAL (euro|EUR)' en het commentaar noemt
     letterlijk '200 miljoen euro'. De twee lagen horen elkaar te
     kruiscontroleren via rijmtMetUitdrukking(), en één van de twee was
     blind voor een vorm die de ander wel las.

     'EUR' komt er ook bij, om dezelfde reden: uitdrukking.ts accepteert
     alle drie de spellingen, dit bestand alleen twee. */
  const SCHAALWOORDEN = String.raw`duizend|mille|miljoen|miljard|biljoen|mln\.?|mld\.?`;
  const GETAL = String.raw`\d{1,3}(?:\.\d{3})*(?:,\d+)?`;
  const euroPatronen = [
    /* A · symbool of EUR eerst, schaalwoord erachter: '€200 miljard'. */
    new RegExp(
      String.raw`(?:€|EUR)\s*(?<![\d.,])(${GETAL})\s*(${SCHAALWOORDEN})?`,
      "giu",
    ),
    /* B · getal, dan eventueel een schaalwoord, dan het woord euro:
       '200 miljard euro', '1.250 euro'. */
    new RegExp(
      String.raw`(?<![\d.,])(${GETAL})\s*(${SCHAALWOORDEN})?\s*(?:euro|EUR)\b`,
      "giu",
    ),
  ];
  for (const euroPatroon of euroPatronen) {
  while ((m = euroPatroon.exec(zin)) !== null) {
    const basis = getalVan(m[1] ?? "");
    if (basis === null) continue;
    const schaalWoord = (m[2] ?? "").toLowerCase().replace(/\.$/, "");
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

  /* DE ROL VAN DE DATUM, UIT DE HELE ZIN.
     ------------------------------------------------------------------
     Gemeten op 6 november 2026: 39 datumclaims in productie, alle 39
     onbeoordeeld, omdat semantiekopslag.verrijk() elke claim zonder
     `waarde_numeriek` teruggeeft als null. Zonder rol is er ook niets
     te beoordelen: '1 juli 2027' is geen bewering.

     De rol komt uit de ZIN en niet uit het voorzetsel alleen, want
     "gepubliceerd op 2 juni 2026" en "geldt per 2 juni 2026" hebben
     dezelfde datum en een tegengestelde betekenis. Zie datumrol.ts. */
  const rol = bepaalDatumrol(zin);

  // '1 januari 2027', eventueel met 'per', 'vanaf', 'tot' ervoor.
  /* 'van' STAAT ERBIJ, EN MET EEN VOORWAARDE.
     Gemeten in het corpus: "aanvragen kunnen van 1 maart tot en met
     30 september worden ingediend" — 'van' is daar de startgrens van
     een aanvraagperiode, en zonder dat woord kreeg die datum geen
     geldig_vanaf en bleef de periode half.

     MAAR 'van' is ook de genitief: "de brief van 3 juni 2026" is een
     publicatiedatum en geen ingangsdatum. Daarom geldt 'van' alleen
     als startgrens wanneer er LATER IN DE ZIN een eindgrens staat. Een
     losse 'van'-datum blijft zonder grens, en dat is juist: dan beslist
     de rol wat hij is. */
  const heeftEindgrens = /\b(tot\s+en\s+met|tot|t\/m|uiterlijk)\b/iu.test(zin);
  const patroon = new RegExp(
    `\\b(per|vanaf|met ingang van|tot en met|tot|uiterlijk|voor|van)?\\s*(\\d{1,2})\\s+(${maandNamen})\\s+(\\d{4})`,
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
    const isStart =
      ["per", "vanaf", "met ingang van"].includes(voorzetsel) ||
      (voorzetsel === "van" && heeftEindgrens);
    uit.push({
      tekst: kort(zin, 600),
      soort: "datum",
      waardeNumeriek: null,
      eenheid: null,
      geldigVanaf: isStart ? datum : null,
      geldigTot: isEinde ? datum : null,
      vindplaats: `tekenpositie ${m.index} (${rol.rol})`,
      datumrol: rol.rol,
      /* DE PASSAGE IS VERPLICHT ZODRA ER EEN ROL STAAT (0054), en bij
         LOSSE_DATUM is hij leeg. Daarom valt een lege passage terug op
         null voor beide velden: geen rol zonder passage, geen passage
         zonder rol. Zo kan de constraint niet struikelen over een
         LOSSE_DATUM. */
      ...(rol.passage.length >= 10
        ? { bronpassage: rol.passage }
        : { datumrol: null, bronpassage: null }),
      betreft: rol.betreft,
      semantiekSoort: "datum",
    });
  }

  /* EEN AANVRAAGPERIODE IS ÉÉN CLAIM MET TWEE GRENZEN.
     ------------------------------------------------------------------
     "van 1 maart tot en met 30 september 2027" levert hierboven twee
     rijen: een met geldig_vanaf en een met geldig_tot. Dat zijn geen
     twee feiten. Een lezer die alleen de tweede ziet, leest een
     einddatum zonder begin; een lezer die alleen de eerste ziet, leest
     een regeling die nooit sluit.

     Daarom: bij rol AANVRAAGPERIODE met een start én een einde komt er
     één claim met beide grenzen, en vervangen de twee halve rijen. De
     constraint uitspraken_geldigheid_logisch eist dat tot >= vanaf, dus
     een omgekeerd paar wordt niet samengevoegd maar blijft staan zoals
     het was — dan is er iets anders aan de hand dan een periode. */
  if (rol.rol === "AANVRAAGPERIODE" && uit.length >= 2) {
    const vanaf = uit.map((u) => u.geldigVanaf).filter((d): d is string => d !== null).sort()[0];
    const tot = uit
      .map((u) => u.geldigTot)
      .filter((d): d is string => d !== null)
      .sort()
      .at(-1);
    const eerste = uit[0];
    if (vanaf !== undefined && tot !== undefined && eerste && tot >= vanaf) {
      return [{ ...eerste, geldigVanaf: vanaf, geldigTot: tot }];
    }
  }

  return uit;
}

/**
 * De niet-numerieke claims uit één zin: de acht vormen uit §4.
 *
 * APART VAN zoekGetallen() EN zoekDatums(), met opzet. Een vormclaim
 * heeft geen waarde en geen eenheid; hem door de getalroute duwen zou
 * daar overslagtakken inbouwen, en elke overslagtak in de laag die
 * claims maakt is een plek waar later een getalclaim per ongeluk langs
 * kan.
 */
function zoekVormen(zin: string): RuweUitspraak[] {
  return leesVormClaims(zin).map((v) => ({
    tekst: v.tekst,
    soort: v.soort,
    waardeNumeriek: null,
    eenheid: null,
    /* EEN VORMCLAIM KRIJGT GEEN geldig_vanaf UIT DE VORM ZELF.
       uitspraken_aangekondigd_is_niet_in_werking (0054) weigert een
       AANGEKONDIGDE claim met een geldig_vanaf, en dat is precies de
       bedoeling: wie wil vastleggen dat de regel ook echt geldt, zet de
       tijdstand op IN_WERKING en neemt daarmee de bewijslast. De
       datumroute legt de datums vast; deze route legt de vorm vast. */
    geldigVanaf: null,
    geldigTot: null,
    vindplaats: v.vindplaats,
    claimvorm: v.vorm,
    tijdstand: v.tijdstand,
    bronpassage: v.passage,
    betreft: v.betreft,
    semantiekSoort: v.semantiekSoort,
  }));
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
    for (const u of [...zoekGetallen(zin), ...zoekDatums(zin), ...zoekVormen(zin)]) {
      // Dedup binnen één document: dezelfde waarde in dezelfde zin is
      // één uitspraak, ook als de regex hem twee keer vindt.
      /* DE VORM HOORT IN DE SLEUTEL.
         "Per 1 augustus 2026 gelden de nieuwe Aansluitspecificaties 4.0"
         is een SPECIFICATIE én een INWERKINGTREDING. Beide komen uit op
         dezelfde zin, en INWERKINGTREDING heeft soort 'regel' terwijl
         SPECIFICATIE soort 'specificatie' heeft — maar BESLUIT,
         VERPLICHTING en INWERKINGTREDING hebben alle drie soort 'regel'.
         Zonder de vorm in de sleutel zou van die drie alleen de eerste
         overblijven, en dat zijn drie verschillende beweringen met een
         eigen bewijslast. */
      const sleutel =
        `${u.soort}|${u.waardeNumeriek}|${u.eenheid}|${u.geldigVanaf}|${u.geldigTot}` +
        `|${u.claimvorm ?? ""}|${u.datumrol ?? ""}|${u.tekst}`;
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

/**
 * De drie vormen die naar hun AARD over recht gaan.
 *
 * GEEXPORTEERD EN PUUR, om dezelfde reden als bepaalClaimAard(): een
 * regel die alleen als neveneffect op een databaserij zichtbaar is, kan
 * niet rechtstreeks worden getoetst — en dan is niet te meten of hij er
 * nog is.
 */
export const JURIDISCHE_VORMEN: ReadonlySet<string> = new Set([
  "BESLUIT",
  "VERPLICHTING",
  "INWERKINGTREDING",
]);

/**
 * Is deze claim een uitspraak over RECHT, en moet hij dus langs
 * steltStukDeClaimVast() voordat een stuk hem mag bevestigen?
 *
 * TWEE INGANGEN, EN BEIDE ZIJN NODIG:
 *
 *   1 een juridische markering IN DE ZIN (bepaalClaimAard) — dat vangt
 *     "geldt vanaf", "is verplicht", "maximumtarief";
 *   2 de VORM van de claim — dat vangt wat (1) mist.
 *
 * Gemeten gat dat (2) toevoegde: "Geschilbesluit Jumbo – Liander over
 * congestierapport" (productieversie 3673, een OFFICIEEL_BESLUIT van
 * BEVOEGD_GEZAG) draagt geen enkele markering uit JURIDISCH — geen
 * verplichting, geen gebod, geen inwerkingtreding. De claim zou dus met
 * juridisch=false langs de vaststellingstoets zijn gegaan en zichzelf
 * hebben bevestigd. Betrapt door
 * test/eenheid/vocabulaire-uitbreiding.test.ts, die eist dat deze vijf
 * productiedocumenten geen ongewogen bevestiging opleveren.
 *
 * STRIKT BEPERKENDER: dit kan een claim alleen MEER bewijslast geven.
 */
export function isJuridischeClaim(
  aardJuridisch: boolean,
  claimvorm: string | null,
): boolean {
  return aardJuridisch || (claimvorm !== null && JURIDISCHE_VORMEN.has(claimvorm));
}

/**
 * De canonieke afdruk van een ruwe uitspraak.
 *
 * APART, zodat de toetsen hem rechtstreeks op een RuweUitspraak kunnen
 * houden zonder een database nodig te hebben.
 */
function afdrukVan(
  u: RuweUitspraak,
  onderwerp: Onderwerp,
  modaliteit: string,
): string {
  return claimAfdruk({
    soort: u.soort,
    waardeNumeriek: u.waardeNumeriek,
    eenheid: u.eenheid,
    claimvorm: u.claimvorm ?? null,
    datumrol: u.datumrol ?? null,
    geldigVanaf: u.geldigVanaf,
    geldigTot: u.geldigTot,
    modaliteit,
    tijdstand: u.tijdstand ?? null,
    onderwerp,
    tekst: u.tekst,
  });
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

    /* DE VORM EN DE ROL HOREN IN DE DEDUPSLEUTEL.
       ----------------------------------------------------------------
       Deze query bepaalt of een claim AL BESTAAT voor deze bronversie.
       BESLUIT, VERPLICHTING en INWERKINGTREDING hebben alle drie soort
       'regel', dus zonder claimvorm erin zouden twee van de drie uit
       dezelfde zin als 'al aanwezig' worden overgeslagen — stil, en
       met een overslagteller die zegt dat het goed ging.

       `coalesce(..., '')` houdt het gedrag voor de BESTAANDE rijen
       exact gelijk: die hebben claimvorm en datumrol NULL, en een
       getalclaim levert hier ook NULL aan, dus '' = '' en de
       vergelijking valt weg zoals hij altijd deed. Er is dus geen
       bestaande claim die hierdoor opnieuw wordt aangemaakt. */
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
          and coalesce(u.claimvorm, '') = coalesce($6, '')
          and coalesce(u.datumrol, '') = coalesce($7, '')
        limit 1`,
      [
        invoer.versieId,
        u.soort,
        u.tekst,
        u.waardeNumeriek,
        u.eenheid,
        u.claimvorm ?? null,
        u.datumrol ?? null,
      ],
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
          bewijskracht_plafond, herbeoordeeld_onder,
          claimvorm, tijdstand, bronpassage, datumrol,
          claim_afdruk, claim_afdruk_versie)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),
               'ongeverifieerd',$11,$12,$13,false,null,
               $14,$15,$16,$17,$18,$19,
               $20,$21,$22,$23,$24,$25)
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
        /* DE STEMPEL BIJ DE GEBOORTE, EN DIE IS NIET OPTIONEEL.
           Een nieuwe claim wordt hier al door de HUIDIGE motor beoordeeld
           — bewijsKwaliteit, plafond en modaliteit komen uit deze ronde.
           Hij is dus niet "nog te herbeoordelen", en zonder deze stempel
           zou de claimpoort hem als openstaand lezen en permanent DICHT
           blijven zodra de pijplijn één claim schrijft. Dat is exact de
           fout die het commentaar bij WACHT_OP_HERBEOORDELING_SQL
           beschrijft voor `herbeoordeeld_op`, en hij geldt onverkort
           voor dit veld. */
        MOTORVERSIES,
        /* DE VIER VELDEN VAN 0054. Voor een getalclaim zijn ze alle
           vier null, en dan raakt geen enkele nieuwe CHECK. */
        u.claimvorm ?? null,
        u.tijdstand ?? null,
        u.bronpassage ?? null,
        u.datumrol ?? null,
        /* DE CANONIEKE AFDRUK (0055). Hij wordt HIER berekend en niet
           in een latere ronde, om dezelfde reden als de motorstempel
           hierboven: een claim zonder afdruk is onzichtbaar voor de
           bewijsniveaulaag, en dan zou een nieuwe claim stil buiten de
           telling van onafhankelijke bronnen vallen. */
        afdrukVan(u, invoer.onderwerp, mod.modaliteit),
        CLAIMIDENTITEIT_VERSIE,
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
    /* EEN VORMCLAIM OVER RECHT IS JURIDISCH, OOK ALS DE ZIN GEEN
       JURIDISCHE MARKERING DRAAGT.
       ----------------------------------------------------------------
       GEVONDEN DOOR DE BESTAANDE TOETS, niet bedacht.
       test/eenheid/vocabulaire-uitbreiding.test.ts eist dat vijf echte
       productiedocumenten NUL claims opleveren, met deze grond erbij:
       "magZelfBevestigen() laat OFFICIEEL_BESLUIT bij BEVOEGD_GEZAG
       juist WEL zichzelf bevestigen. Versie 3673 is zo'n document. Zou
       hij een claim produceren, dan werd die direct bevestigd — en dan
       had het toevoegen van een vocabulaireterm een juridische
       bevestiging opgeleverd die niemand heeft gewogen."

       Die toets werd rood zodra de vormextractie erbij kwam. Versie
       3673 is "Geschilbesluit Jumbo – Liander over congestierapport",
       en dat IS een feitelijk besluit — de claim hoort er te zijn.
       Maar bepaalClaimAard() vuurde er niet op: 'geschilbesluit' is
       geen verplichting, geen gebod, geen inwerkingtreding. De claim
       zou dus met juridisch=false langs steltStukDeClaimVast() zijn
       gegaan en zichzelf hebben bevestigd.

       Een BESLUIT, een VERPLICHTING en een INWERKINGTREDING zijn naar
       hun aard uitspraken over RECHT. Of dit stuk dat recht ook
       vaststelt, is precies de vraag die steltStukDeClaimVast()
       beantwoordt. Die vraag moet dus altijd gesteld worden.

       STRIKT BEPERKENDER: dit voegt een voorwaarde toe. Geen claim die
       eerder bevestigde, bevestigt hierdoor minder vaak niet — want
       deze vormen bestonden gisteren nog niet. Voor een ECHT
       ACM-besluit (OFFICIEEL_BESLUIT, BEKENDMAKING, BEVOEGD_GEZAG)
       antwoordt de vaststellingstoets bevestigend, en dat is juist: dat
       stuk IS de authentieke bron. Een nieuwsbericht dat hetzelfde
       besluit navertelt, komt er niet door. */
    const juridischeClaim = isJuridischeClaim(aard.juridisch, u.claimvorm ?? null);

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
    /* DE PASSAGETOETS GELDT VOOR ÉLKE CLAIM UIT EEN OFFICIEEL STUK,
       EN NIET ALLEEN VOOR DE JURIDISCHE.
       ----------------------------------------------------------------
       HET GEMETEN DEFECT, 6 november 2026, claim 138 in productie:

         bron    acm-besluiten, OFFICIEEL_BESLUIT / BEVOEGD_GEZAG /
                 BEKENDMAKING, plafond 5
         tekst   "Jumbo stelt dat de in het congestierapport van
                  17 april 2025 opgenomen gronden om geen …"
         soort   datum, geen claimvorm
         status  BEVESTIGD, en sinds 0055 ook DIRECT_BEVESTIGD met de
                 reden "bron acm-besluiten (OFFICIEEL_BESLUIT /
                 BEVOEGD_GEZAG) noemt dit feit in zijn eigen publicatie"

       De zin staat GEMETEN binnen de sectie 'Standpunten van
       partijen'. Nagemeten op de opgeslagen tekst van bronversie 4394:
       de claimzin is zinsfragment 65 van 217, en fragment 61 is de kop
       "Standpunten van partijen\n5.1."; tussen 61 en 65 slaat geen
       enkele VASTSTELLEND_OPENER aan. steltStukDeClaimVast() geeft op
       die tekst dan ook ACHTERGRONDPASSAGE met markering
       'standpunten-van-partijen'. Het is het standpunt van een
       supermarkt, en het stond als vastgesteld feit van de
       toezichthouder in de database — met het hoogste bewijsniveau dat
       dit systeem kent.

       WAAROM DE BESTAANDE POORT HEM MISTE. isJuridischeClaim() laat
       alleen claims langs steltStukDeClaimVast() die een juridische
       markering in de zin dragen, of een claimvorm uit
       JURIDISCHE_VORMEN. Een DATUMclaim uit een standpuntzin is geen
       van beide, dus de passagetoets werd niet eens geraadpleegd —
       terwijl diezelfde toets claims uit dezelfde sectie met een
       juridische markering wél blokkeerde.

       WAT DE REPARATIE OP DE ECHTE DATA DOET. Gemeten over alle 85
       bevestigde claims die in productie aan een BEVOEGD_GEZAG-stuk
       hangen: met de oude poort zijn er 84 bevestigbaar, met de nieuwe
       78. De zes die afvallen zijn 137 en 161
       (NIET_VASTSTELLENDE_MODALITEIT) en 138, 139, 140 en 141
       (ACHTERGRONDPASSAGE). Geen enkele claim gaat de andere kant op.

       DE REGEL: draagt het stuk de vorm waarin recht wordt vastgesteld
       — bevoegd gezag én een vaststellende documentvorm — dan moet
       ELKE claim eruit aantonen dat hij in het vaststellende deel
       staat. Niet alleen de juridische.

       WAAROM DIE TWEE EISEN EN GEEN BREDERE. steltStukDeClaimVast()
       begint zelf met precies die twee voorwaarden; voor een stuk dat
       ze niet haalt, geeft hij per definitie `steltVast: false`. Zou ik
       de toets toepassen op ELK zelfbevestigend stuk, dan zou geen
       enkele claim van een netbeheerder, een statistiekbureau of een
       ministerieel nieuwsbericht nog bevestigen — en dat is geen
       scherpere regel maar een kapotte keten. Gemeten: FEITELIJKE_
       MEDEDELING bij NETBEHEERDER heeft plafond 4 en mag zichzelf
       bevestigen, maar haalt vormKanVaststellen() niet.

       Voor die stukken blijft de oude grens staan: alleen een
       juridische claim moet langs de passagetoets. Er verandert dus
       NIETS aan de 109 claims van vóór de PDF-route; de wijziging
       raakt uitsluitend documenten die zich als vastgesteld recht
       aandienen, en dáár is hij strikt beperkender. */
    const officieelVaststellendStuk =
      invoer.gezag === "BEVOEGD_GEZAG" && vormKanVaststellen(invoer.documentvorm);
    const moetLangsPassagetoets = officieelVaststellendStuk || juridischeClaim;
    const juridischZonderGrondslag = moetLangsPassagetoets && !vaststelling.steltVast;

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
      log.info("claim niet zelfbevestigd", {
        uitspraakId: nieuw.id,
        versieId: invoer.versieId,
        documentsoort: invoer.documentsoort,
        reden: aard.reden,
        markeringen: aard.markeringen,
        /* WAAROM deze claim langs de passagetoets moest. Er zijn nu DRIE
           gronden, en zonder dit onderscheid is een blokkade op een
           markering in de zin niet te scheiden van een blokkade op de
           VORM van de claim of op de vorm van het DOCUMENT — en dan is
           hij niet na te meten.

           De derde grond is nieuw: een officieel stuk dat recht kan
           vaststellen onderwerpt ELKE claim aan de passagetoets, ook
           een getal of een datum. Zie de toelichting bij
           officieelVaststellendStuk hierboven. */
        langsPassageVia: aard.juridisch
          ? "juridische markering in de zin"
          : u.claimvorm != null && JURIDISCHE_VORMEN.has(u.claimvorm)
            ? `juridische claimvorm ${u.claimvorm}`
            : `officieel vaststellend stuk (${invoer.gezag} / ${invoer.documentvorm})`,
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
