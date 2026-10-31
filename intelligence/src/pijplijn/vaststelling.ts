/* ============================================================
   PIJPLIJN — stelt DIT STUK DEZE CLAIM vast?
   ------------------------------------------------------------
   HET GEMETEN GAT, en het is één laag dieper dan claimaard.ts keek.

   claimaard.ts beantwoordt: "is deze ZIN een juridische vaststelling?"
   uitspraken.ts voegde daar één documenteis aan toe:

     authentiekeGrondslag = gezag === BEVOEGD_GEZAG
                            && vormKanVaststellen(documentvorm)

   Dat is een eigenschap van het DOCUMENT en zegt niets over de CLAIM.
   Gevolg, geforceerd en gemeten op 31 oktober 2026 met de echte
   functies:

     titel: "Concentratiebesluit Alfa - Beta"
     "De Autoriteit Consument en Markt heeft op 26 oktober 2026 besloten
      dat Alfa Holding uitsluitende zeggenschap mag verkrijgen over Beta
      Energie. Gelet op artikel 37 van de Mededingingswet.
      TER ACHTERGROND: het maximumtarief bedraagt vanaf 1 juli 2027 nog
      45 euro per maand. De verplichte gegevensdeling voor netbeheerders
      geldt vanaf 1 juli 2027. Belanghebbenden kunnen binnen zes weken
      bezwaar maken tegen dit besluit."

     -> OFFICIEEL_BESLUIT / BEKENDMAKING / BEVOEGD_GEZAG, plafond 5
     -> authentiekeGrondslag = true
     -> BEIDE juridische zinnen uit de achtergrondalinea: BEVESTIGD

   Een concentratiebesluit beslist over zeggenschap. Het beslist niets
   over een maximumtarief. De tariefzin stond er letterlijk als
   ACHTERGROND bij, en bevestigde zichzelf op de hoogste bewijskracht
   die dit systeem kent.

   ------------------------------------------------------------
   WAT DEZE MODULE DOET

   Hij beantwoordt de vraag die ontbrak: stelt dit stuk DEZE claim vast,
   of staat de claim er alleen IN? Zes uitslagen, en vijf ervan
   bevestigen niet.

   DE PASSAGETOETS IS EENZIJDIG, EN DAT IS HET BELANGRIJKSTE ONTWERP-
   BESLUIT HIER. Hij blokkeert ALLEEN bij positief bewijs dat de zin
   buiten het vaststellende deel staat. Staan er in het document geen
   achtergrondmarkeringen, dan blokkeert hij niet.

   Waarom eenzijdig en niet "bewijs dat hij IN het dictum staat": die
   strengere vorm breekt de keten. Het commentaar bij uitspraken.ts
   regel 555-572 legt dat al vast met een meting — een ECHT
   tariefbesluit ("Gelet op artikel 41 ... Het maximumtarief bedraagt
   vanaf 1 juli 2027 nog 45 euro per maand. Belanghebbenden kunnen
   binnen zes weken bezwaar maken.") komt uit op FEITELIJKE_MEDEDELING
   en draagt geen enkele dictummarkering. Zou ik een dictummarkering
   EISEN, dan blokkeert de authentieke bron zijn eigen juridische claim
   en kan bronverificatie.ts nergens meer ankeren. Dat is geen
   strengheid maar een kapotte keten.

   Dus: verlaag niets, blokkeer alleen wat aantoonbaar achtergrond is.

   OVER "inhoudelijke match op waarde en eenheid". Bij ZELFbevestiging is
   de claim letterlijk een zin UIT dit document; getal, eenheid en
   onderwerp komen per constructie overeen met zichzelf. Een match
   daarop zou een tautologie zijn en geen toets. De inhoudelijke vraag
   die hier wél iets toevoegt is WAAR de zin staat en WIE hem vaststelt.
   De echte getal-, eenheid-, onderwerp- en tijdvenstermatch hoort bij de
   NAVERTELLING en staat in bronverificatie.ts (verifieerBijGezag), waar
   twee verschillende documenten tegen elkaar worden gelegd.

   PUUR: geen database, geen netwerk, geen model.
   ============================================================ */

import type { Documentsoort, Gezag } from "./documentsoort.ts";
import { type Documentvorm, vormKanVaststellen } from "./documentvorm.ts";
import type { Modaliteit } from "./claimmodaliteit.ts";

/** Verhoog dit bij elke wijziging die een uitslag kan veranderen. */
export const VASTSTELLING_VERSIE = "vaststelling-v1";

/* ------------------------------------------------------------------
   DE REGIO'S VAN EEN OFFICIEEL STUK

   Een bekendmaking heeft delen die iets vaststellen en delen die iets
   uitleggen. De openers hieronder zijn de Nederlandse standaardvormen.
   Ze zijn met opzet SMAL: een te breed achtergrondpatroon zou een echt
   besluit blokkeren, en dat is de duurdere fout.
   ------------------------------------------------------------------ */

const ACHTERGROND_OPENERS: readonly { naam: string; patroon: RegExp }[] = [
  { naam: "ter-achtergrond", patroon: /\bter\s+achtergrond\b/iu },
  { naam: "achtergrond-kop", patroon: /(^|[.\n])\s*achtergrond\s*[:\n]/iu },
  { naam: "ter-informatie", patroon: /\bter\s+informatie\b/iu },
  { naam: "toelichting-kop", patroon: /(^|[.\n])\s*toelichting\s*[:\n]/iu },
  { naam: "ten-overvloede", patroon: /\bten\s+overvloede\b/iu },
  { naam: "ter-vergelijking", patroon: /\bter\s+vergelijking\b/iu },
  { naam: "voor-de-volledigheid", patroon: /\bvoor\s+de\s+volledigheid\b/iu },
  /* "Overwegende dat" is de considerans: de motivering vóór het dictum.
     Daar staat wat het bestuursorgaan in aanmerking neemt, niet wat het
     vaststelt. */
  { naam: "overwegende", patroon: /\boverwegende\s+(dat|het\s+volgende)\b/iu },
];

/* Wat een achtergrondregio weer SLUIT. Zonder sluiters zou één
   "ter achtergrond" halverwege de rest van het stuk vergiftigen,
   inclusief een dictum dat erna komt. */
const VASTSTELLEND_OPENERS: readonly { naam: string; patroon: RegExp }[] = [
  { naam: "besluit-kop", patroon: /(^|[.\n])\s*besluit\s*[:\n]/iu },
  { naam: "besluit-de-minister", patroon: /\bbesluit(en)?\s+(de|het|wij)\b/iu },
  { naam: "artikel", patroon: /(^|[.\n])\s*artikel\s+\d+/iu },
  { naam: "wordt-gewijzigd", patroon: /\bwordt\s+als\s+volgt\s+gewijzigd\b/iu },
  { naam: "treedt-in-werking-slot", patroon: /\bdit\s+besluit\s+treedt\s+in\s+werking\b/iu },
  /* De rechtsmiddelenclausule staat ná het dictum en sluit de
     achtergrond dus ook. */
  { naam: "rechtsmiddel", patroon: /\b(bezwaar|beroep)\s+(maken|instellen)\b/iu },
];

/* ------------------------------------------------------------------
   TOESCHRIJVING AAN EEN ANDER GEZAG

   "Verwijzingen naar besluiten van andere instanties" uit de opdracht.
   Een stuk dat MELDT dat een ander orgaan iets heeft vastgesteld, is
   daarvan geen bron — ook niet als het stuk zelf bevoegd gezag is.

   SMAL GEHOUDEN, en met een uitzondering voor het EIGEN gezag: een
   ACM-besluit dat zegt "de ACM heeft besloten" is juist zelfbevestigend.
   Die namen komen uit EIGEN_GEZAG_NAMEN in documentsoort.ts, zodat er
   één kaart is en niet twee.
   ------------------------------------------------------------------ */
const BESLUITWERKWOORD =
  /\b(heeft|hebben)\s+(?:op\s+\d{1,2}\s+\w+\s+\d{4}\s+)?(besloten|vastgesteld|bepaald)\b|\b(besloot|stelde\s+vast)\b/iu;

/** "op grond van het besluit van X", "volgens de regeling van X" */
const VERWIJZING_NAAR_BESLUIT =
  /\b(op\s+grond\s+van|volgens|ingevolge|conform|krachtens)\s+(het\s+besluit|de\s+regeling|de\s+beschikking|het\s+aanwijzingsbesluit)\s+van\b/iu;

export type VaststellingUitslag =
  /** Dit stuk stelt deze claim vast; zelfbevestiging mag. */
  | "STELT_VAST"
  /** Geen authentieke juridische bron (uitgever of vorm). */
  | "GEEN_AUTHENTIEK_STUK"
  /** Een ontwerp stelt niets vast. */
  | "ONTWERP"
  /** De zin stelt niets vast maar stelt iets voor of verwacht iets. */
  | "NIET_VASTSTELLENDE_MODALITEIT"
  /** De zin staat aantoonbaar in een achtergrond- of considerans-passage. */
  | "ACHTERGRONDPASSAGE"
  /** De zin schrijft de vaststelling aan een ANDER orgaan toe. */
  | "ANDER_GEZAG";

export type Vaststelling = {
  readonly uitslag: VaststellingUitslag;
  /** Precies één plek waar 'mag zelfbevestigen' uit volgt. */
  readonly steltVast: boolean;
  readonly reden: string;
  readonly grondslag: Record<string, unknown>;
  readonly versie: string;
};

export type VaststellingInvoer = {
  /** De zin van de claim, zoals hij uit extraheerUitspraken komt. */
  readonly claimTekst: string;
  readonly documentTitel: string;
  /** De volledige documenttekst. Leeg mag: dan vervalt de passagetoets. */
  readonly documentTekst: string;
  readonly documentsoort: Documentsoort;
  readonly gezag: Gezag;
  readonly documentvorm: Documentvorm;
  readonly modaliteit: Modaliteit;
  /**
   * De namen die voor DIT document het eigen gezag zijn. Uit
   * EIGEN_GEZAG_NAMEN[bronSleutel]. Leeg betekent: geen enkele naam
   * geldt als eigen, dus elke toeschrijving is een ander gezag.
   */
  readonly eigenGezagNamen: readonly string[];
};

function antwoord(
  uitslag: VaststellingUitslag,
  reden: string,
  grondslag: Record<string, unknown>,
): Vaststelling {
  return {
    uitslag,
    steltVast: uitslag === "STELT_VAST",
    reden,
    grondslag: { ...grondslag, versie: VASTSTELLING_VERSIE },
    versie: VASTSTELLING_VERSIE,
  };
}

/** Splitst op zinseinden, met behoud van de oorspronkelijke tekst per stuk. */
function zinnen(tekst: string): string[] {
  return tekst
    .split(/(?<=[.!?])\s+/u)
    .map((z) => z.trim())
    .filter((z) => z.length > 0);
}

function raakt(patronen: readonly { naam: string; patroon: RegExp }[], tekst: string): string | null {
  for (const p of patronen) if (p.patroon.test(tekst)) return p.naam;
  return null;
}

/**
 * Staat de claimzin aantoonbaar in een achtergrondpassage?
 *
 * EENZIJDIG: `null` betekent "geen bewijs van achtergrond", niet
 * "bewezen dictum". Zie de kop van dit bestand.
 */
function achtergrondMarkering(documentTekst: string, claimTekst: string): string | null {
  const lijst = zinnen(documentTekst);
  if (lijst.length === 0) return null;

  /* De claimzin kan door extraheerUitspraken zijn genormaliseerd, dus
     niet op gelijkheid zoeken maar op een voldoende lang fragment. */
  const sleutel = claimTekst.replace(/\s+/gu, " ").trim().slice(0, 48).toLowerCase();
  if (sleutel.length < 12) return null;

  let regio: "onbekend" | "achtergrond" | "vaststellend" = "onbekend";
  let opener: string | null = null;

  for (const zin of lijst) {
    const genormaliseerd = zin.replace(/\s+/gu, " ").toLowerCase();

    /* Eerst de regio bijwerken MET deze zin erin, zodat een opener die
       in dezelfde zin als de claim staat ook geldt — precies het
       gemeten geval "Ter achtergrond: het maximumtarief bedraagt ...". */
    const vast = raakt(VASTSTELLEND_OPENERS, zin);
    if (vast !== null) {
      regio = "vaststellend";
      opener = vast;
    }
    const acht = raakt(ACHTERGROND_OPENERS, zin);
    if (acht !== null) {
      regio = "achtergrond";
      opener = acht;
    }

    if (genormaliseerd.includes(sleutel)) {
      return regio === "achtergrond" ? (opener ?? "achtergrond") : null;
    }
  }
  return null;
}

/** Schrijft de zin de vaststelling aan een ander orgaan toe? */
function anderGezagMarkering(
  claimTekst: string,
  eigenGezagNamen: readonly string[],
): string | null {
  const verwijzing = VERWIJZING_NAAR_BESLUIT.test(claimTekst);
  const werkwoord = BESLUITWERKWOORD.test(claimTekst);
  if (!verwijzing && !werkwoord) return null;

  /* Noemt de zin het EIGEN gezag, dan is dit zelfbevestiging en geen
     navertelling. Gemeten voorbeeld dat hierdoor terecht doorgaat:
     "De Autoriteit Consument en Markt heeft op 26 oktober 2026 besloten
     dat ..." in een ACM-besluit. */
  const laag = claimTekst.toLowerCase();
  for (const naam of eigenGezagNamen) {
    if (naam.length > 0 && laag.includes(naam.toLowerCase())) return null;
  }
  /* Ook de voluit geschreven variant van een eigen afkorting telt. */
  if (eigenGezagNamen.includes("ACM") && /\bautoriteit\s+consument\s+en\s+markt\b/iu.test(claimTekst)) {
    return null;
  }

  return verwijzing ? "verwijzing-naar-besluit-van-ander" : "besluitwerkwoord-zonder-eigen-gezag";
}

/**
 * Stelt dit stuk deze claim vast?
 *
 * De orde is niet willekeurig: eerst de goedkoopste en hardste eisen
 * (uitgever, vorm, soort, modaliteit), dan de twee tekstuele toetsen.
 * Elke uitslag behalve STELT_VAST betekent: NIET bevestigen.
 */
export function steltStukDeClaimVast(inv: VaststellingInvoer): Vaststelling {
  const basis: Record<string, unknown> = {
    documentsoort: inv.documentsoort,
    gezag: inv.gezag,
    documentvorm: inv.documentvorm,
    modaliteit: inv.modaliteit,
  };

  /* 1 · DE BESTAANDE EIS, ONGEWIJZIGD. Dit is de voorwaarde die er al
     stond; deze module voegt eisen TOE en haalt er geen weg. */
  if (inv.gezag !== "BEVOEGD_GEZAG" || !vormKanVaststellen(inv.documentvorm)) {
    return antwoord(
      "GEEN_AUTHENTIEK_STUK",
      "geen authentieke juridische bron: dat vraagt bevoegd gezag in een " +
        "vaststellende vorm",
      basis,
    );
  }

  /* 2 · Een ONTWERP stelt niets vast, ook niet van bevoegd gezag. */
  if (inv.documentsoort === "ONTWERPBESLUIT") {
    return antwoord(
      "ONTWERP",
      "een ontwerpbesluit stelt niets vast; het is een voornemen",
      basis,
    );
  }

  /* 3 · Voorstel of verwachting stelt niets vast. */
  if (inv.modaliteit !== "VASTGESTELD") {
    return antwoord(
      "NIET_VASTSTELLENDE_MODALITEIT",
      `de zin draagt modaliteit ${inv.modaliteit} en stelt dus niets vast`,
      basis,
    );
  }

  /* 4 · DE PASSAGETOETS. */
  const volledig = `${inv.documentTitel}. ${inv.documentTekst}`;
  const acht = achtergrondMarkering(volledig, inv.claimTekst);
  if (acht !== null) {
    return antwoord(
      "ACHTERGRONDPASSAGE",
      `de zin staat in een achtergrondpassage (markering '${acht}'); een stuk ` +
        "stelt niet vast wat het ter achtergrond vermeldt",
      { ...basis, markering: acht },
    );
  }

  /* 5 · DE TOESCHRIJVINGSTOETS. */
  const ander = anderGezagMarkering(inv.claimTekst, inv.eigenGezagNamen);
  if (ander !== null) {
    return antwoord(
      "ANDER_GEZAG",
      `de zin schrijft de vaststelling aan een ander orgaan toe (markering ` +
        `'${ander}'); een navertelling is geen bron`,
      { ...basis, markering: ander, eigenGezagNamen: inv.eigenGezagNamen },
    );
  }

  return antwoord(
    "STELT_VAST",
    "bevoegd gezag, vaststellende vorm, vastgestelde modaliteit, en de zin " +
      "staat niet in een achtergrondpassage en wordt niet aan een ander " +
      "orgaan toegeschreven",
    basis,
  );
}
