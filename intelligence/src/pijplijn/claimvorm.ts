/* ============================================================
   PIJPLIJN — de NIET-NUMERIEKE claimvormen
   ------------------------------------------------------------
   HET GEMETEN GAT, op 6 november 2026 na de volledige herverwerking
   van 4.004 bronversies.

   intel.uitspraken staat negen soorten toe: feit, cijfer, datum, regel,
   prijs, specificatie, status, berekening, interpretatie. De extractie
   produceerde er drie — cijfer en prijs uit zoekGetallen(), datum uit
   zoekDatums(). Van de 109 claims in productie is er geen enkele van
   soort feit, regel, specificatie of status. Die vier soorten bestonden
   uitsluitend als toegestane waarde in een CHECK.

   Dat is geen theoretisch gat. Een steekproef van 135 versies uit
   datzelfde corpus (3.610 zinnen) geeft voor elk van de acht vormen
   uit de opdracht treffers:

     congestiestatus     92 zinnen
     projectstatus       28
     specificatie        14
     beleidswijziging    13
     subsidievenster     10
     verplichting         6
     besluit              5
     inwerkingtreding     2

   Een nieuwskanaal over netcongestie dat geen congestiestatus kan
   opslaan, mist niet een nuance maar zijn onderwerp.

   ------------------------------------------------------------
   WAT DEZE MODULE DOET, EN WAT NADRUKKELIJK NIET

   WEL: één zin in, nul of meer vormclaims uit. Elke claim draagt de
   LETTERLIJKE passage die hem aanwijst, de vorm, de tijdstand en de
   velden die de bestaande claimketen al kent.

   NIET: ze bevestigt niets. De vorm is een waarneming over de
   formulering, geen bewijs over de werkelijkheid. Of een claim mag
   bevestigen beslist uitspraken.ts met magZelfBevestigen(),
   bepaalClaimAard() en steltStukDeClaimVast() — ongewijzigd, en voor
   een vormclaim precies zo streng als voor een getalclaim.

   PUUR: geen database, geen netwerk, geen model. Om dezelfde reden als
   claimmodaliteit.ts en documentsoort.ts: een oordeel dat in een audit
   moet standhouden mag niet van een modelaanroep afhangen.

   ------------------------------------------------------------
   DRIE REGELS DIE DE PATRONEN SMAL HOUDEN

   1. ELKE VORM EIST EEN WERKWOORD OF EEN NAAMWOORD UIT DE BRON, geen
      onderwerpswoord. 'congestie' alleen is geen status — dat woord
      staat in elk netbeheerbericht. 'is vol verklaard', 'congestie-
      gebied aangewezen', 'congestierapport gepubliceerd' zijn het wel.

   2. DE PASSAGE IS HET BEWIJS. Een vorm zonder aanwijsbaar fragment
      wordt niet opgeslagen; migratie 0054 weigert hem ook.

   3. DE TIJDSTAND STAAT LOS VAN DE MODALITEIT. 'aangekondigd' is iets
      anders dan 'voorgenomen': een aankondiging is een vastgesteld
      feit over een toestand die nog niet geldt. Wie die twee in één
      veld stopt, verliest een van beide.
   ============================================================ */

import { kort } from "../kern/tekst.ts";
import { JURIDISCH, type Markering } from "./claimaard.ts";
import { herkenBetreft } from "./datumrol.ts";
import type { UitspraakSoort } from "./uitspraken.ts";

/** Verhoog dit bij elke wijziging die een uitslag kan veranderen. */
export const CLAIMVORM_VERSIE = "claimvorm-v1";

/** De acht vormen uit de opdracht. De lijst is gesloten; zie 0054. */
export type Claimvorm =
  | "BESLUIT"
  | "VERPLICHTING"
  | "INWERKINGTREDING"
  | "SUBSIDIEVENSTER"
  | "CONGESTIESTATUS"
  | "PROJECTSTATUS"
  | "SPECIFICATIE"
  | "BELEIDSWIJZIGING";

/**
 * De TOESTAND van wat de claim beschrijft.
 *
 * ONBEPAALD is de standaard en dat is de veilige kant: zonder signaal
 * weten we niet of de regel geldt, en dan hoort niemand aan te nemen
 * dat hij geldt. De poort in vormpoort.ts weigert ONBEPAALD voor de
 * vormen waar de toestand de bewering draagt.
 */
export type Tijdstand =
  | "IN_WERKING"
  | "AANGEKONDIGD"
  | "VERLOPEN"
  | "TIJDELIJK"
  | "ONBEPAALD";

export type VormClaim = {
  readonly vorm: Claimvorm;
  /** De soort waarmee hij in intel.uitspraken komt te staan. */
  readonly soort: UitspraakSoort;
  /** De hele bronzin; het dragende veld van elke claim in dit systeem. */
  readonly tekst: string;
  /** Het LETTERLIJKE fragment dat de vorm aanwijst. Verplicht. */
  readonly passage: string;
  readonly tijdstand: Tijdstand;
  readonly tijdstandGrondslag: string;
  /**
   * WAT de claim betreft, uit het gedeelde vocabulaire in datumrol.ts.
   * Null als de bronzin niets herkenbaars noemt — en dan is er voor de
   * vormen die een onderwerp nodig hebben geen zin te maken.
   */
  readonly betreft: string | null;
  /** De semantiek_soort die bij deze vorm hoort; zie 0021. */
  readonly semantiekSoort: string;
  readonly vindplaats: string;
  readonly grondslag: readonly string[];
};

type VormRegel = {
  readonly vorm: Claimvorm;
  readonly soort: UitspraakSoort;
  readonly semantiekSoort: string;
  readonly markeringen: readonly Markering[];
};

/* ------------------------------------------------------------------
   1 · FEITELIJKE BESLUITEN

   Gemeten formuleringen uit het corpus:
     "het Programma ... dat het kabinet vandaag heeft vastgesteld"
     "na aanleiding van het besluit van het kabinet"
     "het prioriteringskader dat de ACM heeft vastgesteld"
     "Geschilbesluit Jumbo - Liander over congestierapport"

   'besluit' als los naamwoord is te breed: het staat in 'besluitvorming'
   en in 'Besluit houdende regels'. De markering eist dus een handeling
   of een samenstelling die alleen een genomen besluit kan zijn.
   ------------------------------------------------------------------ */
const BESLUIT: readonly Markering[] = [
  {
    naam: "besluithandeling",
    /* DE SCHEIDBARE WERKWOORDSVORM IS DE NORM IN HET NEDERLANDS, en
       mijn eerste patroon eiste de hulp- en voltooide vorm NAAST
       elkaar. Gemeten verschil:

         "dat het kabinet vandaag heeft vastgesteld"          -> matcht
         "heeft het prioriteringskader ... vastgesteld"        -> MISTE

       Beide zijn correct Nederlands en beide staan in het corpus; het
       lijdend voorwerp komt er in de tweede tussen. Betrapt door de
       eigen integratietoets 1. De afstand is begrensd op 60 tekens
       binnen dezelfde zin, zodat een 'heeft' en een 'vastgesteld' uit
       twee losse mededelingen niet aan elkaar worden geknoopt. */
    patroon:
      /\b(?:hee?ft|hebben)\b[^.]{0,60}?\b(?:besloten|vastgesteld|bepaald|goedgekeurd|toegewezen|afgewezen)\b|\b(?:besloot|stelt\s+vast|is\s+goedgekeurd)\b|\bhee?ft\s+ingestemd\s+met\b|\bverleent\s+(?:een\s+)?(?:ontheffing|vergunning|goedkeuring)\b/iu,
    reden: "de zin meldt een genomen besluit",
  },
  {
    naam: "besluitstuk",
    patroon:
      /\b(geschilbesluit|tariefbesluit|concentratiebesluit|boetebesluit|ontheffingsbesluit|codebesluit|methodebesluit|besluit\s+van\s+de\s+(?:ACM|minister|staatssecretaris|autoriteit))\b/iu,
    reden: "de zin noemt een besluit als stuk met een naam",
  },
];

/* ------------------------------------------------------------------
   4 · OPENSTELLING EN SLUITING VAN SUBSIDIES

   Gemeten:
     "Het beschikbare subsidiebudget voor de aanvraagperiode 2026"
     "de verlenging van de openstelling van de SDE++-regeling"
     "aanvragen kunnen worden ingediend"

   OPEN en DICHT zijn ALLEBEI een status en krijgen dezelfde vorm. De
   tijdstand maakt het verschil: een gesloten loket is VERLOPEN.
   ------------------------------------------------------------------ */
const SUBSIDIEVENSTER: readonly Markering[] = [
  {
    naam: "venster-open",
    /* OOK HIER DE SCHEIDBARE VORM. 'aanvragen kunnen' eiste de twee
       woorden naast elkaar en miste "Aanvragen voor de subsidieregeling
       kunnen ... worden ingediend" — de vorm waarin het onderwerp zijn
       bepaling meeneemt. Betrapt door de eigen integratietoets 1.

       De eis blijft dat er GEINDIEND of AANGEVRAAGD wordt: zonder dat
       werkwoord is 'aanvragen kunnen' geen venster maar een zinsnede. */
    patroon:
      /\b(aanvraagperiode|openstellingsperiode|openstelling|opengesteld|staat\s+open|loket\s+(?:opent|is\s+open))\b|\b(?:aanvragen|aanvraag|inschrijven|indienen)\b[^.]{0,60}?\b(?:kan|kunnen)\b[^.]{0,60}?\b(?:ingediend|aangevraagd|worden\s+gedaan)\b|\bkan\s+worden\s+aangevraagd\b|\bindienen\s+(?:kan|is\s+mogelijk)\s+(?:van|vanaf|tot)\b/iu,
    reden: "de zin noemt een openstelling of aanvraagperiode",
  },
  {
    naam: "venster-dicht",
    patroon:
      /\b(sluit\s+op|is\s+gesloten|gesloten\s+voor\s+aanvragen|subsidieplafond\s+is\s+bereikt|loket\s+(?:sluit|is\s+gesloten)|aanvraagperiode\s+is\s+(?:verstreken|afgelopen)|niet\s+langer\s+aan\s+te\s+vragen)\b/iu,
    reden: "de zin noemt een sluiting of een bereikt plafond",
  },
];

/* ------------------------------------------------------------------
   5 · NETCONGESTIESTATUSSEN

   Het grootste gat, en het onderwerp van dit platform. Gemeten:
     "Het congestierapport van Liander is niet in overeenstemming met
      de eisen van de Netcode."
     "deed Liander een vooraankondiging van capaciteitsproblemen"
     "concludeert zij dat congestiemanagement niet kan worden toegepast"
     "de wachtrij voor het stroomnet blijft te lang"

   DE MARKERING MAG NIET 'congestie' ZIJN. Dat woord staat in 92 van de
   3.610 gemeten zinnen, waarvan een groot deel geen status noemt maar
   een beleidswens of een uitleg. Elke markering hieronder eist een
   TOESTAND: aangewezen, opgeheven, gepubliceerd, geen ruimte,
   beschikbaar.
   ------------------------------------------------------------------ */
const CONGESTIESTATUS: readonly Markering[] = [
  {
    naam: "congestiegebied",
    patroon:
      /\b(congestiegebied|aangewezen\s+als\s+congestie\w*|congestie\s+(?:is\s+)?(?:vastgesteld|opgeheven|afgekondigd)|schaarsteverklaring|vol\s+verklaard|structurele\s+congestie)\b/iu,
    reden: "de zin stelt een congestietoestand voor een gebied vast",
  },
  {
    naam: "congestierapport",
    patroon:
      /\b(congestierapport(?:en)?\s+\w*\s*(?:gepubliceerd|vastgesteld|herzien|ingetrokken)|(?:gepubliceerde|herziene)\s+congestierapport(?:en)?|vooraankondiging\s+van\s+capaciteitsproblemen)\b/iu,
    reden: "de zin meldt de stand van een congestierapport",
  },
  {
    naam: "transportcapaciteit",
    patroon:
      /\b(geen\s+transportcapaciteit|transportcapaciteit\s+(?:beschikbaar|niet\s+beschikbaar|vrijgekomen)|transportbeperking|transportverzoek\s+(?:afgewezen|toegewezen)|geen\s+ruimte\s+op\s+het\s+net)\b/iu,
    reden: "de zin noemt de beschikbaarheid van transportcapaciteit",
  },
  {
    naam: "wachtrij",
    patroon:
      /\b(wachtrij|wachtlijst)\b[^.]{0,60}\b(voor|op|bij|blijft|groeit|daalt|is|staat|telt)\b/iu,
    reden: "de zin noemt de stand van de wachtrij voor netcapaciteit",
  },
  {
    naam: "congestiemanagement",
    patroon:
      /\bcongestiemanagement\b[^.]{0,60}\b(toegepast|ingevoerd|gestart|beeindigd|beëindigd|niet\s+kan|mogelijk|verplicht)\b/iu,
    reden: "de zin meldt of congestiemanagement wordt toegepast",
  },
];

/* ------------------------------------------------------------------
   6 · PROJECTSTATUSSEN

   Gemeten:
     "De nieuwe Carwash A27 in Nieuwegein is in gebruik genomen met ..."
     "Het pand is in 2000 in gebruik genomen als museum."
     "of die batterijen ook hebben opgeleverd wat er beloofd is"

   Die derde is een valkuil: 'opgeleverd' in de zin van 'resultaat
   geleverd' is geen projectoplevering. Daarom eist de markering een
   project- of installatiewoord in dezelfde zin, en niet alleen het
   werkwoord.
   ------------------------------------------------------------------ */
const PROJECTSTATUS: readonly Markering[] = [
  {
    naam: "in-bedrijf",
    patroon:
      /\b(in\s+gebruik\s+genomen|in\s+bedrijf\s+(?:gesteld|genomen)|operationeel\s+(?:sinds|per)|geopend\s+(?:op|per))\b/iu,
    reden: "de zin meldt dat iets in bedrijf is genomen",
  },
  {
    naam: "oplevering",
    patroon:
      /\b(opgeleverd|oplevering)\b[^.]{0,80}\b(project|installatie|park|station|batterij|laadplein|zonnedak|aansluiting|woningen)\b|\b(project|installatie|park|station|batterij|laadplein|zonnedak)\b[^.]{0,80}\b(opgeleverd|oplevering)\b/iu,
    reden: "de zin meldt de oplevering van een project of installatie",
  },
  {
    naam: "bouwstart",
    patroon:
      /\b(bouw\s+(?:is\s+)?(?:gestart|begonnen)|gestart\s+met\s+de\s+bouw|eerste\s+schop|start\s+van\s+de\s+bouw|bouw\s+van\s+\w+\s+(?:gestart|begonnen))\b/iu,
    reden: "de zin meldt de start van de bouw",
  },
  {
    naam: "vertraging",
    patroon:
      /\b(loopt\s+vertraging\s+op|is\s+vertraagd|zijn\s+vertraagd|uitgesteld\s+(?:tot|naar)|stilgelegd|afgeblazen|stopgezet)\b/iu,
    reden: "de zin meldt vertraging of stilleggen van een project",
  },
];

/* ------------------------------------------------------------------
   7 · TECHNISCHE SPECIFICATIES

   Gemeten:
     "Per 1 augustus 2026 gelden de nieuwe Aansluitspecificaties 4.0
      voor publieke laadpalen."
     "de toevoeging van technische eisen voor toepassing van de
      zogenoemde 'slimme fundering'"

   Een versienummer of een normnaam is het dragende deel. 'specificatie'
   zonder nummer of normnaam is een woord en geen feit.
   ------------------------------------------------------------------ */
const SPECIFICATIE: readonly Markering[] = [
  {
    naam: "genoemde-norm",
    patroon:
      /\b(NEN\s?-?\s?(?:EN\s?-?\s?)?\d{3,5}|IEC\s?\d{4,5}|EN\s?\d{4,5}|ISO\s?\d{4,5}|NTA\s?\d{4})\b/iu,
    reden: "de zin noemt een norm met nummer",
  },
  {
    naam: "specificatieversie",
    patroon:
      /\b((?:aansluit|technische?|functionele?)\s?specificaties?\s*\d+(?:[.,]\d+)?|\w+specificaties?\s+\d+(?:[.,]\d+)?|versie\s+\d+(?:[.,]\d+)?\s+van\s+de\s+\w*(?:specificatie|code|norm))\b/iu,
    reden: "de zin noemt een specificatie met versienummer",
  },
  {
    naam: "technische-eis",
    patroon:
      /\b(technische\s+eisen|technische\s+vereisten|aansluitvoorwaarden|netcode[- ]?eisen|protocoleis(?:en)?)\b/iu,
    reden: "de zin noemt technische eisen",
  },
];

/* ------------------------------------------------------------------
   8 · FEITELIJKE WIJZIGINGEN IN BELEID OF UITVOERING

   Gemeten:
     "Het kabinet vervangt de huidige stikstofdoelen in de wet door
      uitstootdoelen."
     "Sinds 29 mei 2026 zijn de herziene eisen ... van kracht"
     "Sinds eind mei 2026 zijn de regels voor monumenteneigenaren
      aangescherpt"

   'gewijzigd' alleen is te breed — het staat in elke
   wijzigingsgeschiedenis. De markering eist een OBJECT van de
   wijziging: een regeling, een regel, een doel, een systematiek, een
   tarief, een werkwijze.
   ------------------------------------------------------------------ */
const BELEIDSWIJZIGING: readonly Markering[] = [
  {
    naam: "vervanging",
    patroon:
      /\b(vervangt|vervangen\s+door|komt\s+te\s+vervallen|is\s+vervallen|ingetrokken\s+per|wordt\s+ingetrokken)\b/iu,
    reden: "de zin meldt dat iets wordt vervangen of vervalt",
  },
  {
    naam: "aanscherping",
    patroon:
      /\b(aangescherpt|verscherpt|versoepeld|verruimd|herzien(?:e)?|aangepast)\b[^.]{0,80}\b(regel|regels|regeling|eisen|voorwaarden|doelen|norm|normen|tarief|tarieven|systematiek|werkwijze|kader)\b|\b(regel|regels|regeling|eisen|voorwaarden|doelen|norm|normen|tarief|tarieven|systematiek|werkwijze|kader)\b[^.]{0,80}\b(aangescherpt|verscherpt|versoepeld|verruimd|herzien|aangepast)\b/iu,
    reden: "de zin meldt dat een regel, norm of tarief is gewijzigd",
  },
  {
    naam: "nieuwe-systematiek",
    patroon:
      /\b(nieuwe\s+(?:regeling|systematiek|methode|methodiek|werkwijze|tariefstructuur|beleidsregel)|overgangsregeling|beleidsregel\s+\w+)\b/iu,
    reden: "de zin introduceert een nieuwe regeling of systematiek",
  },
];

/* ------------------------------------------------------------------
   DE ACHT REGELS, met de soort en de semantiek_soort waarin ze landen.

   DE SOORTEN KOMEN UIT uitspraken_soort_check EN DE SEMANTIEK_SOORTEN
   UIT uitspraken_semantiek_soort. Beide lijsten bestonden al; er is
   geen nieuwe waarde nodig. Dat is geen toeval maar het bewijs dat deze
   soorten altijd bedoeld waren en alleen nooit werden geproduceerd.

   VERPLICHTING en INWERKINGTREDING hergebruiken de markeringen uit
   claimaard.ts in plaats van ze over te schrijven. Zie de toelichting
   bij de export daar.
   ------------------------------------------------------------------ */
const REGELS: readonly VormRegel[] = [
  {
    vorm: "BESLUIT",
    soort: "regel",
    semantiekSoort: "regelwijziging",
    markeringen: BESLUIT,
  },
  {
    vorm: "VERPLICHTING",
    soort: "regel",
    semantiekSoort: "regelwijziging",
    markeringen: JURIDISCH.filter((m) =>
      ["verplichting", "gebod", "verbod", "aanspraak", "sanctie"].includes(m.naam),
    ),
  },
  {
    vorm: "INWERKINGTREDING",
    soort: "regel",
    semantiekSoort: "regelwijziging",
    markeringen: JURIDISCH.filter((m) => m.naam === "inwerkingtreding"),
  },
  {
    vorm: "SUBSIDIEVENSTER",
    soort: "status",
    semantiekSoort: "subsidievoorwaarde",
    markeringen: SUBSIDIEVENSTER,
  },
  {
    vorm: "CONGESTIESTATUS",
    soort: "status",
    semantiekSoort: "netcapaciteit",
    markeringen: CONGESTIESTATUS,
  },
  {
    vorm: "PROJECTSTATUS",
    soort: "status",
    semantiekSoort: "aanbestedingsstatus",
    markeringen: PROJECTSTATUS,
  },
  {
    vorm: "SPECIFICATIE",
    soort: "specificatie",
    semantiekSoort: "kwalitatief",
    markeringen: SPECIFICATIE,
  },
  {
    vorm: "BELEIDSWIJZIGING",
    soort: "feit",
    semantiekSoort: "regelwijziging",
    markeringen: BELEIDSWIJZIGING,
  },
];

/* ------------------------------------------------------------------
   DE TIJDSTAND

   "Aangekondigd ≠ in werking" en "tijdelijk ≠ permanent" uit de
   opdracht wonen hier.

   DE ORDE IS BEWUST EN NIET WILLEKEURIG:

     1 VERLOPEN     een afgesloten toestand overheerst alles. 'De
                    regeling is gesloten' is geen aankondiging meer.
     2 TIJDELIJK    een tijdelijke maatregel die in werking is, is
                    TIJDELIJK en niet IN_WERKING: het verschil is
                    precies wat de opdracht eist.
     3 AANGEKONDIGD vóór IN_WERKING, want 'treedt per 1 juli in werking'
                    bevat een inwerkingtredingswoord EN is een
                    aankondiging. De toekomende tijd wint.
     4 IN_WERKING   alleen bij een signaal dat het NU geldt.
     5 ONBEPAALD    geen signaal. De veilige kant.
   ------------------------------------------------------------------ */
const VERLOPEN_P =
  /\b(is\s+gesloten|zijn\s+gesloten|gesloten\s+voor\s+aanvragen|is\s+verstreken|is\s+afgelopen|is\s+vervallen|komt\s+te\s+vervallen|is\s+ingetrokken|niet\s+langer\s+(?:toegestaan|van\s+kracht|aan\s+te\s+vragen)|subsidieplafond\s+is\s+bereikt|is\s+beeindigd|is\s+beëindigd)\b/iu;

const TIJDELIJK_P =
  /\b(tijdelijk(?:e|heid)?|voor\s+de\s+duur\s+van|gedurende\s+(?:de\s+)?(?:periode|looptijd)|overgangsregeling|overgangsrecht|proef(?:project|fase|periode)|pilot|tot\s+nader\s+order|voorlopig(?:e)?)\b/iu;

/* DE DATUM STAAT TUSSEN 'TREEDT' EN 'IN WERKING', en dat is de
   gangbare Nederlandse woordorde: "treedt per 1 januari 2028 in
   werking". Mijn eerste patroon eiste 'in werking' direct na het
   voorzetsel en miste daardoor precies de vorm die bronnen
   gebruiken — betrapt door de eigen toets 'aangekondigd is niet in
   werking'. De afstand is begrensd op 40 tekens binnen dezelfde zin,
   zodat 'treedt' en een 'in werking' drie zinnen later niet aan elkaar
   worden geknoopt. */
const AANGEKONDIGD_P =
  /\b(aangekondigd|kondigt?\s+aan|kondigde\s+aan|tre(?:edt|den)\b[^.]{0,40}?\bin\s+werking|gaat\s+(?:in|gelden)\s+(?:op|per|vanaf)|zal\s+(?:gaan\s+)?gelden|wordt\s+(?:van\s+kracht|ingevoerd|opengesteld)|opent\s+(?:op|per)|vanaf\s+\d{1,2}\s+\w+\s+20\d\d\s+(?:geldt|gelden|gaat|moeten|moet))\b/iu;

const IN_WERKING_P =
  /\b(is\s+van\s+kracht|zijn\s+van\s+kracht|geldt\s+(?:nu|sinds|al)|gelden\s+(?:nu|sinds|al)|sinds\s+\d{1,2}\s+\w+\s+20\d\d|sinds\s+(?:begin|eind|medio)\s+\w+\s+20\d\d|is\s+in\s+werking\s+getreden|zijn\s+in\s+werking\s+getreden|inmiddels\s+(?:van\s+kracht|verplicht)|is\s+(?:al\s+)?verplicht|staat\s+open)\b/iu;

export function bepaalTijdstand(zin: string): {
  tijdstand: Tijdstand;
  grondslag: string;
} {
  const pak = (p: RegExp): string | null => p.exec(zin)?.[0] ?? null;

  const verlopen = pak(VERLOPEN_P);
  if (verlopen !== null) {
    return {
      tijdstand: "VERLOPEN",
      grondslag: `de zin meldt een afgesloten toestand — "${kort(verlopen, 60)}"`,
    };
  }
  const tijdelijk = pak(TIJDELIJK_P);
  if (tijdelijk !== null) {
    return {
      tijdstand: "TIJDELIJK",
      grondslag:
        `de zin noemt de toestand tijdelijk — "${kort(tijdelijk, 60)}". Een tijdelijke ` +
        "maatregel is geen permanente, ook niet als hij nu geldt",
    };
  }
  const aangekondigd = pak(AANGEKONDIGD_P);
  if (aangekondigd !== null) {
    return {
      tijdstand: "AANGEKONDIGD",
      grondslag:
        `de zin kondigt aan en meldt niet dat het nu geldt — "${kort(aangekondigd, 60)}". ` +
        "Aangekondigd is niet in werking",
    };
  }
  const inWerking = pak(IN_WERKING_P);
  if (inWerking !== null) {
    return {
      tijdstand: "IN_WERKING",
      grondslag: `de zin meldt dat het nu geldt — "${kort(inWerking, 60)}"`,
    };
  }
  return {
    tijdstand: "ONBEPAALD",
    grondslag:
      "geen tijdsignaal in de zin; de toestand is niet vastgesteld en wordt niet aangenomen",
  };
}

/**
 * Leest de vormclaims uit één zin.
 *
 * MEER DAN ÉÉN VORM PER ZIN IS NORMAAL EN GEEN FOUT. "Per 1 augustus
 * 2026 gelden de nieuwe Aansluitspecificaties 4.0 voor publieke
 * laadpalen" is een SPECIFICATIE én een INWERKINGTREDING, en dat zijn
 * twee verschillende beweringen met een eigen bewijslast. Wie er één
 * van maakt, gooit de andere weg.
 *
 * WEL ÉÉN CLAIM PER VORM PER ZIN. Twee markeringen van dezelfde vorm
 * zijn hetzelfde feit, twee keer gezien.
 */
export function leesVormClaims(zin: string): VormClaim[] {
  const schoon = zin.trim();
  /* Een zin korter dan dit kan geen vorm MET passage dragen; de
     constraint in 0054 eist tien tekens passage en een losse kop als
     "Netcongestie" levert geen bewering op. */
  if (schoon.length < 25) return [];

  const tijd = bepaalTijdstand(schoon);
  const betreft = herkenBetreft(schoon);
  const uit: VormClaim[] = [];

  for (const regel of REGELS) {
    let beste: { fragment: string; index: number; grond: string } | null = null;
    for (const m of regel.markeringen) {
      const t = m.patroon.exec(schoon);
      if (t === null || !t[0]) continue;
      const fragment = t[0].trim();
      /* DE PASSAGE MOET DE EIS VAN 0054 HALEN. Een fragment van negen
         tekens is geen concrete bronpassage; dan wordt de zinsnede
         eromheen genomen, en wel uit de BRON — niet een eigen
         omschrijving. */
      const breed =
        fragment.length >= 10
          ? fragment
          : schoon.slice(
              Math.max(0, t.index - 20),
              Math.min(schoon.length, t.index + fragment.length + 20),
            ).trim();
      if (breed.length < 10) continue;
      /* De EERSTE markering in de zin wint, zodat de passage bij de
         vroegste aanwijzing hoort en de uitslag niet van de volgorde
         van de regels afhangt. */
      if (beste === null || t.index < beste.index) {
        beste = {
          fragment: kort(breed, 240),
          index: t.index,
          grond: `${m.naam}: ${m.reden} — "${kort(fragment, 60)}"`,
        };
      }
    }
    if (beste === null) continue;

    uit.push({
      vorm: regel.vorm,
      soort: regel.soort,
      tekst: kort(schoon, 600),
      passage: beste.fragment,
      tijdstand: tijd.tijdstand,
      tijdstandGrondslag: tijd.grondslag,
      betreft,
      semantiekSoort: regel.semantiekSoort,
      vindplaats: `tekenpositie ${beste.index} (${regel.vorm}: "${kort(beste.fragment, 80)}")`,
      grondslag: [beste.grond, tijd.grondslag],
    });
  }

  return uit.sort((a, b) => a.vorm.localeCompare(b.vorm));
}
