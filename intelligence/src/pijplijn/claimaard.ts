/* ============================================================
   PIJPLIJN — de AARD van een claim: feitelijk of juridisch?
   ------------------------------------------------------------
   HET GEMETEN GAT. Op 31 oktober 2026 nagemeten met de echte motoren,
   niet beredeneerd.

   Documentsoort-v2 sluit de route waarlangs een nieuwsbericht de
   authentieke regeling kón worden. Maar negen van de dertien
   rijksoverheid-nieuwsberichten blijven FEITELIJKE_MEDEDELING, en die
   soort heeft bij BEVOEGD_GEZAG plafond 4 en mag zichzelf bevestigen.
   Terecht: een ministerie dat een benoeming meldt is de bron van dat
   feit.

   Het probleem is dat niet elke zin in zo'n bericht over een eigen
   activiteit gaat. Gemeten, met rijksoverheid-nieuws
   (betrouwbaarheid 5, is_primaire_bron true):

     "De verplichte gegevensdeling voor netbeheerders geldt vanaf
      1 juli 2027."
       -> FEITELIJKE_MEDEDELING, plafond 4, VASTGESTELD/0,80
       -> bevestigd, en claimDraagt() zegt JA

     "Het maximumtarief bedraagt vanaf 1 juli 2027 nog 45 euro per
      maand."
       -> prijs 45 EUR, VASTGESTELD/0,80
       -> bevestigd, en claimDraagt() zegt JA

   Dat zijn JURIDISCHE vaststellingen — een verplichting en een
   wettelijk maximum — die zichzelf bevestigen uit een nieuwsbericht,
   zonder dat er ooit een authentieke juridische bron is gezien. Precies
   wat R3 moest voorkomen, één laag lager dan waar v2 keek.

   WAAROM DE BESTAANDE POORTEN DIT NIET VINGEN. Ze keken alle drie naar
   het DOCUMENT en niet naar de ZIN:

     magZelfBevestigen(soort, gezag)   document
     bewijskrachtPlafond(soort, gezag) document
     claimDraagt(...)                  document + modaliteit

   De modaliteit komt wél uit de zin, maar die beantwoordt een andere
   vraag: "wordt hier iets vastgesteld of voorgesteld". Op beide
   voorbeelden antwoordt hij correct VASTGESTELD — er wordt inderdaad
   iets vastgesteld. Alleen niet DOOR DIT STUK.

   De zekerheid van 0,35 die de zes andere claims tegenhield is géén
   bescherming om op te bouwen: dat is een eigenschap van de
   modaliteitsweging, niet van de bewijsketen. Zodra een zin net anders
   is geformuleerd staat hij op 0,80 en valt hij erdoor.

   ------------------------------------------------------------
   WAT DEZE MODULE DOET

   Hij beantwoordt één vraag over één zin: stelt deze zin een
   JURIDISCHE TOESTAND vast — een verplichting, een verbod, een
   wettelijk maximum, een ingangsdatum, een bevoegdheid — of meldt hij
   een feit?

   Daarmee splitst hij de drie soorten claims die de opdracht
   onderscheidt:

     1 feitelijke mededeling over eigen activiteiten
         "De ministerraad heeft ingestemd met de benoeming van X."
         -> juridisch = false, mag zichzelf bevestigen
     2 juridische claim over wetgeving of verplichtingen
         "Gemeenten zijn vanaf 1 juli 2027 verplicht de gegevens te delen."
         -> juridisch = true, eist een authentiek juridisch document
     3 numerieke claim die een specifieke bronmatch nodig heeft
         "Het maximumtarief bedraagt 45 euro per maand."
         -> juridisch = true EN getalmatig; bovenop het bovenstaande
            eist bronverificatie.ts dan ook nog dat getal, eenheid,
            soort en onderwerp overeenkomen

   DE REGEL DIE EROP VOLGT staat in uitspraken.ts: een juridische
   vaststelling bevestigt zichzelf alleen uit een VASTSTELLENDE
   documentsoort. Uit elk ander stuk blijft hij 'ongeverifieerd' en moet
   bronverificatie.ts het origineel bij het bevoegde gezag vinden.

   DIT VERLAAGT GEEN ENKELE DREMPEL. Het is een extra voorwaarde bovenop
   alle bestaande; geen claim die eerder niet bevestigde, bevestigt nu
   wel. Een feitelijke mededeling over eigen handelen verandert niet.

   PUUR, zoals elke laag hier: geen database, geen netwerk, geen model.
   ============================================================ */

/** Verhoog dit bij elke wijziging die een uitslag kan veranderen. */
export const CLAIMAARD_VERSIE = "claimaard-v1";

type Markering = {
  readonly naam: string;
  readonly patroon: RegExp;
  readonly reden: string;
};

/* ------------------------------------------------------------------
   DE MARKERINGEN VAN EEN JURIDISCHE VASTSTELLING

   Elke markering staat voor een NORM: iets dat geldt omdat een regel
   het zegt. Ze zijn met opzet smal. Een te breed patroon zou elke
   mededeling van een ministerie juridisch maken, en dan is het
   onderscheid uit de opdracht weg — een benoeming is een eigen
   activiteit en hoort zichzelf te kunnen bevestigen.
   ------------------------------------------------------------------ */
const JURIDISCH: readonly Markering[] = [
  {
    naam: "verplichting",
    patroon: /\b(verplicht|verplichte|verplichting(en)?|verplichtstelling)\b/iu,
    reden: "de zin legt een verplichting vast",
  },
  /* `moeten` alleen is te breed — "Dat moet ervoor zorgen dat" staat in
     elk beleidsbericht. De norm zit in de combinatie met een termijn of
     een ondergrens: "moeten binnen 18 weken", "moeten vanaf 2027
     minimaal". Nagemeten op de dertien echte nieuwsberichten: geen
     ervan raakt dit patroon. */
  {
    naam: "gebod",
    patroon:
      /\b(moet|moeten|dient|dienen)\b[^.]{0,40}\b(binnen|vanaf|per|uiterlijk|minimaal|minstens|ten\s+minste|maximaal)\b/iu,
    reden: "de zin gebiedt iets binnen een termijn of boven een ondergrens",
  },
  {
    naam: "verbod",
    /* De ontkenning staat zelden pal achter het werkwoord. Gemeten:
       "Vanaf 1 januari 2028 mogen leveranciers geen opslagkosten meer
       doorberekenen" — tussen 'mogen' en 'geen' staat het subject.
       Daarom een woordafstand binnen dezelfde zin. */
    patroon:
      /\b(is\s+verboden|zijn\s+verboden|niet\s+langer\s+toegestaan)\b|\b(mag|mogen)\b[^.]{0,40}\b(niet|geen)\b/iu,
    reden: "de zin legt een verbod vast",
  },
  {
    naam: "inwerkingtreding",
    patroon:
      /\b(treedt\s+in\s+werking|treden\s+in\s+werking|inwerkingtreding|van\s+kracht|met\s+ingang\s+van|geldt\s+(vanaf|per)|gelden\s+(vanaf|per)|geldig\s+vanaf)\b/iu,
    reden: "de zin stelt vast vanaf wanneer een regel geldt",
  },
  {
    naam: "wettelijk-maximum",
    patroon:
      /\b(maximum\s?tarief|tariefplafond|prijsplafond|subsidieplafond|wettelijk(e)?\s+(maximum|minimum|tarief|plafond|norm)|maximaal\s+toegestane)\b/iu,
    reden: "de zin noemt een bij regel bepaald maximum of plafond",
  },
  {
    naam: "wettelijke-grondslag",
    patroon:
      /\b(op\s+grond\s+van\s+(artikel|de\s+wet)|krachtens|ingevolge\s+artikel|conform\s+artikel)\b/iu,
    reden: "de zin beroept zich op een wettelijke grondslag",
  },
  {
    naam: "aanspraak",
    patroon: /\b(recht\s+op|aanspraak\s+op|komt\s+in\s+aanmerking\s+voor)\b/iu,
    reden: "de zin vestigt een aanspraak",
  },
  {
    naam: "sanctie",
    patroon:
      /\b(boete\s+van|bestuurlijke\s+boete|dwangsom|last\s+onder\s+dwangsom|sanctie\s+van)\b/iu,
    reden: "de zin stelt een sanctie vast",
  },
];

export type ClaimAard = {
  /** Stelt deze zin een juridische toestand vast? */
  readonly juridisch: boolean;
  /** Welke markeringen vuurden, met het getroffen fragment. */
  readonly markeringen: readonly string[];
  /** Eén regel die een mens kan navertellen. */
  readonly reden: string;
  readonly versie: string;
};

/**
 * Is deze claim een juridische vaststelling?
 *
 * GEEXPORTEERD EN PUUR, zodat de toetsen hem rechtstreeks op een zin
 * kunnen houden. Zonder dat zou het antwoord alleen zichtbaar zijn als
 * neveneffect op een databaserij.
 */
export function bepaalClaimAard(tekst: string): ClaimAard {
  const markeringen: string[] = [];
  for (const m of JURIDISCH) {
    const t = m.patroon.exec(tekst);
    if (t === null) continue;
    markeringen.push(`${m.naam}: ${m.reden} — "${t[0].slice(0, 60)}"`);
  }
  if (markeringen.length === 0) {
    return {
      juridisch: false,
      markeringen: ["geen juridische markering gevonden"],
      reden: "de zin meldt een feit en stelt geen juridische toestand vast",
      versie: CLAIMAARD_VERSIE,
    };
  }
  return {
    juridisch: true,
    markeringen,
    reden:
      `${markeringen.length} juridische markering(en); de zin stelt een juridische ` +
      "toestand vast en kan daarvoor niet naar zichzelf verwijzen",
    versie: CLAIMAARD_VERSIE,
  };
}
