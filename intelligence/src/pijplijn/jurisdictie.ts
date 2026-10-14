/* ============================================================
   JURISDICTIE — waar geldt deze uitspraak eigenlijk?
   ------------------------------------------------------------
   HET GEMETEN DEFECT

   De verwoordbaarheidspoort (semantiek.ts, tien controles) kijkt naar
   het getal, de eenheid, het fenomeen, het subject, de richting, de
   tijd en de bronrechten. Geen van die tien controles kijkt naar PLAATS,
   LAND of RECHTSGEBIED. Gemeten gevolg:

     bron: "De Belgische netbeheerder Fluvius verhoogt het nettarief in
            2027 met 8%."
     zin:  "Volgens Fluvius stijgt het nettarief voor de netbeheerders
            in 2027 met 8%."
     uitslag: VERWOORDBAAR

   Het woord 'Belgische' matcht niets in de poort. Er komt dus een
   publiceerbare Nederlandse zin uit over een BELGISCH tarief, en de
   lezer heeft geen enkele aanwijzing dat het niet over zijn eigen
   netgebied gaat. Hetzelfde geldt voor een Vlaamse subsidie of een
   Waalse wettelijke verplichting.

   Deze module stelt het TOEPASSINGSGEBIED vast. Hij doet dat zuiver:
   tekst en uitgever in, oordeel uit. Geen database, geen netwerk, geen
   tijd — zodat hij in een toets volledig vast te zetten is.

   ------------------------------------------------------------
   DE BESLISREGEL, EN WAAROM

   1 Een BUITENLANDS signaal zonder Nederlands signaal -> dat gebied.
     De tekst noemt Fluvius of Vlaanderen en noemt Nederland niet: dan
     is het geen Nederlands feit.

   2 Een NL-signaal EN een BE-signaal samen -> ONBEKEND.
     "Liander en Fluvius" kan een vergelijking zijn, een gezamenlijk
     onderzoek of een Belgisch bericht met een Nederlandse zijsprong.
     Welke van de drie, weet alleen de bron. Gokken levert hier precies
     de fout op die we aan het repareren zijn, dus wordt er niet gegokt.
     ONBEKEND is geen tussenstand maar een uitslag: hij kan niet
     verwoord worden.

   3 Alleen NL-signalen -> NEDERLAND.

   4 Alleen EU-signalen -> EU. Een EU-verordening of een verplichting
     voor lidstaten geldt ook in Nederland; dat is iets anders dan een
     Belgisch tarief, dat hier niets betekent. Daarom is EU een eigen
     waarde en geen ONBEKEND.

   5 NL-signaal EN EU-signaal samen -> NEDERLAND. Regels 3 en 4 dekken
     dit geval niet, en het valt niet onder 1 (er IS een Nederlands
     signaal) of 2 (er is geen Belgisch signaal). Het wordt bewust het
     SMALSTE van de twee: de tekst noemt het land zelf, en een uitspraak
     over Nederland binnen een EU-kader is een uitspraak over Nederland.

   6 BE-signaal EN EU-signaal zonder NL -> BELGIE. Ook hier het smalste
     gebied, en dat is tegelijk de strengste uitkomst: BELGIE kan niet
     verwoord worden en EU wel. Een verkeerd label faalt zo naar
     'niet publiceren' en niet naar 'wel publiceren'.

   7 GEEN ENKEL SIGNAAL -> alleen NEDERLAND als de uitgever een
     Nederlandse AUTORITEIT uit het bronregister is EN de bron primair
     is. In elk ander geval ONBEKEND.

   'Geen signaal' mag NOOIT stil NEDERLAND worden. Dat is letterlijk het
   mechanisme waar het defect uit bestaat: de poort zag niets over
   plaats, en behandelde de uitspraak daarom als een feit over ons eigen
   land. Een leeg veld is geen bewijs.

   ------------------------------------------------------------
   WAT DIT NIET DOET

   * GEEN TLD EN GEEN UITGEVERSNAAM ALS GEOGRAFIE. Gemeten onbetrouwbaar:
     stedin.net is Nederlands, api.energy-charts.info is een DUITSE
     uitgever met NL-data, en zeven Nederlandse vakmedia op .nl
     publiceren over buitenland. Daarom weegt de uitgever alleen mee in
     regel 7, alleen als autoriteit, en alleen bij een primaire bron.

   * GEEN BINDING AAN intel.geo_bereiken. Die tabel bevat alleen
     Nederland (1 land, 12 provincies, 342 gemeenten, 6
     netbeheerdergebieden); er is geen BE- en geen EU-rij. En
     herkenGebieden() (src/regio/gebieden.ts) geeft gemeten 0 treffers
     EN 0 afwijzingen op zowel Belgische als Nederlandse proefzinnen,
     terwijl laadIndex() (src/regio/impacts.ts) de 'land'-rij niet
     laadt. Landniveau is vandaag dus niet te binden. Dit oordeel is
     daarom een TEKSTOORDEEL met een benoembare grondslag, en wordt
     bewust niet als een geo-binding voorgesteld.

   * GEEN intel.bronnen.geo_bereik. Dat veld staat op 'nl' voor alle 29
     bronnen en is een eigenschap van de BRON, niet van het item. Het
     kan dus niets zeggen over een losse uitspraak — het is precies de
     aanname die het defect veroorzaakt, alleen een laag hoger.

   * GEEN DUITSLAND, GEEN OVERIG BUITENLAND. Het type kent vier waarden;
     een Duits of Frans feit zonder BE/EU-woord komt op ONBEKEND uit als
     de uitgever geen Nederlandse autoriteit is, en op NEDERLAND als hij
     dat wel is. Dat laatste is een open gat, bewust begrensd: de
     opdracht vraagt NEDERLAND/BELGIE/EU/ONBEKEND, en een waarde
     toevoegen die nergens in de database is afgedwongen zou een
     verzinsel zijn. Het gat staat hiermee opgeschreven in plaats van
     verzwegen.

   * GEEN SCHRIJFACTIE. Deze module stelt vast; wie het wegschrijft en
     wie er een verwoordbaarheidsuitslag aan hangt, staat elders.
   ============================================================ */

/** Het rechtsgebied waarin een feitelijke uitspraak geldig is. */
export type Toepassingsgebied = "NEDERLAND" | "BELGIE" | "EU" | "ONBEKEND";

export type Jurisdictieoordeel = {
  readonly gebied: Toepassingsgebied;
  /** Benoembaar: per signaal een regel, plus de regel die het besluit draagt. */
  readonly grondslag: readonly string[];
  readonly signalen: { nl: readonly string[]; be: readonly string[]; eu: readonly string[] };
};

/* ------------------------------------------------------------------
   De patronen

   Vorm overgenomen van DEMPERS in relevantie.ts:119-150: een array van
   {patroon, gebied, reden}, en elke reden is een regel die een mens kan
   navertellen. Een gebiedslijst die uit de duim komt, labelt morgen het
   verkeerde; daarom staat bij elk patroon WAAROM het dat gebied aanwijst
   en waar nodig waarom het zo smal is afgebakend.

   NEDERLANDSE SAMENSTELLINGEN EN VERVOEGINGEN BREKEN \b — semantiek.ts:106
   legt uit dat vier patronen daar stil op faalden ('subsidiebudget' werd
   gemist door \bbudget\b, 'stijgen' door \bstijg\b). De oplossing daar:
   geen linkergrens waar het woord een achtervoegsel kan zijn, en \w* of
   \p{L}* voor vervoegingen en buigings-e's. Hier geldt hetzelfde:
   'Belgische', 'Vlaamse', 'Nederlandse' en 'lidstaten' moeten alle vier
   matchen. Waar een rechtergrens WEL nodig is om een Nederlandse naam
   buiten te houden ('Waalsdorpervlakte' is Haags, niet Waals), staat
   \b er expliciet.

   GEEN ENKEL PATROON HEEFT DE /g-VLAG. Deze RegExp-objecten staan op
   moduleniveau en worden hergebruikt; met /g zouden ze lastIndex
   onthouden en bij de tweede aanroep een ander antwoord geven.
   ------------------------------------------------------------------ */

/** De drie signaalsoorten. ONBEKEND is een uitkomst, geen signaal. */
type Signaalsoort = "nl" | "be" | "eu";

type Gebiedspatroon = {
  readonly patroon: RegExp;
  readonly gebied: Signaalsoort;
  readonly reden: string;
};

const PATRONEN: readonly Gebiedspatroon[] = [
  /* ---------------------------------------------------------- BELGIE */
  {
    patroon: /Belgi\p{L}*|\bBelg(en|e)?\b/iu,
    gebied: "be",
    reden: "het land Belgie wordt genoemd; dit is het woord dat in het gemeten defect niets matchte",
  },
  {
    patroon: /Vlaander\p{L}*|Vlaams\p{L}*/iu,
    gebied: "be",
    reden: "Vlaanderen is een Belgisch gewest met zijn eigen energieregels",
  },
  {
    patroon: /Wallon\p{L}*|\bWaalse?\b/iu,
    gebied: "be",
    /* \b aan het eind is hier nodig: zonder rechtergrens matcht 'Waals'
       ook 'Waalsdorpervlakte', en de Waal is een Nederlandse rivier. */
    reden: "Wallonie is een Belgisch gewest met zijn eigen energieregels",
  },
  {
    patroon: /Brussel\p{L}*/iu,
    gebied: "be",
    /* BEWUSTE ONNAUWKEURIGHEID, EN HIJ FAALT NAAR DE STRENGE KANT.
       'Brussel' wordt in Nederlandse berichtgeving ook gebruikt als
       metonym voor de Europese instellingen. Dan is het label BELGIE
       feitelijk mis en had EU er moeten staan. Die fout maakt de
       uitspraak STRENGER (BELGIE kan niet verwoord worden, EU wel) en
       maakt nooit een buitenlands feit Nederlands. Een EU-bericht dat
       ook 'Europese Commissie' of 'lidstaten' noemt, levert naast dit
       signaal gewoon een EU-signaal op. */
    reden: "Brussel is het Belgische hoofdstedelijk gewest (en in de pers soms het EU-metonym; beide zijn niet-Nederlands)",
  },
  {
    patroon: /\bFluvius\b|\bElia\b|\bCREG\b|\bVREG\b|\bSynergrid\b|\bSibelga\b|\bResa\b|Engie\s+Electrabel/i,
    gebied: "be",
    /* ASYMMETRIE DIE WE NIET ERVEN. ORGANISATIE (semantiek.ts:268-269)
       vlagt 'Netbeheer Nederland' wel en 'Fluvius'/'Elia' niet, omdat
       dat patroon op een Nederlands bedrijfsachtervoegsel let. Daardoor
       passeert een Belgische netbeheerder ongemerkt. Hier staan ze met
       naam en toenaam. */
    reden: "Belgische netbeheerder, toezichthouder of leverancier; dit zijn de namen die het ORGANISATIE-patroon in semantiek.ts niet vlagt",
  },
  {
    /* ALLEEN IN KAPITALEN, en dat is geen stijlkeuze: met /i matcht
       \bORES\b ook het Engelse woord 'ores' (ertsen), dat in een bericht
       over kritieke grondstoffen echt voorkomt. */
    patroon: /\bORES\b/,
    gebied: "be",
    reden: "ORES is de Waalse distributienetbeheerder; alleen in kapitalen gematcht, want 'ores' is ook een Engels woord",
  },

  /* -------------------------------------------------------------- EU */
  {
    patroon: /Europese\s+(Commissie|Unie)/i,
    gebied: "eu",
    reden: "de Europese Commissie of de Europese Unie wordt als handelende partij genoemd",
  },
  {
    patroon: /EU[-\s]?(richtlijn|verordening)\p{L}*/iu,
    gebied: "eu",
    reden: "een EU-richtlijn of EU-verordening werkt in alle lidstaten, dus ook in Nederland",
  },
  {
    patroon: /lidsta(at|ten)\p{L}*/iu,
    gebied: "eu",
    reden: "een verplichting voor lidstaten is een Europese verplichting",
  },
  {
    /* Case-sensitive: 'acer' is met /i ook een merknaam. */
    patroon: /\bACER\b/,
    gebied: "eu",
    reden: "ACER is het Europese agentschap voor de samenwerking tussen energieregulators",
  },
  {
    patroon: /\bENTSO-?E\b/i,
    gebied: "eu",
    reden: "ENTSO-E is het Europese samenwerkingsverband van transmissienetbeheerders",
  },

  /* --------------------------------------------------------- NEDERLAND */
  {
    /* DEZE STAAT VOOR HET LOSSE 'Nederland' — zie de lookbehind daar.
       'Netbeheer Nederland' en 'Nederland' overlappen, en zonder deze
       splitsing levert een zin met alleen de koepelnaam TWEE
       NL-signalen op met twee bijna gelijke grondslagregels. */
    patroon: /Netbeheer\s+Nederland/i,
    gebied: "nl",
    reden: "Netbeheer Nederland is de koepel van de Nederlandse netbeheerders",
  },
  {
    /* De lookbehind haalt de koepelnaam eruit, zodat 'Netbeheer
       Nederland' precies een signaal oplevert en niet twee. Komt het
       woord Nederland OOK los voor, dan matcht dit patroon die andere
       plek alsnog — exec zoekt verder. */
    patroon: /(?<!Netbeheer\s)Nederland\p{L}*/iu,
    gebied: "nl",
    reden: "het land Nederland wordt expliciet genoemd",
  },
  {
    patroon: /\bACM\b|Autoriteit\s+Consument/i,
    gebied: "nl",
    reden: "de ACM is de Nederlandse toezichthouder op de energiemarkt",
  },
  {
    patroon: /\bRVO\b|Rijksdienst\s+voor\s+Ondernemend/i,
    gebied: "nl",
    reden: "RVO voert Nederlandse regelingen uit",
  },
  {
    patroon: /\bCBS\b|Centraal\s+Bureau\s+voor\s+de\s+Statistiek/i,
    gebied: "nl",
    /* ACM en CBS hebben buitenlandse homonymen (ACM als computervereniging,
       CBS als Amerikaanse omroep). Die blijven staan omdat ze in dit
       corpus — Nederlandstalig energienieuws — een andere betekenis
       vrijwel uitsluiten. Zie EIA hieronder voor het geval waarin dat
       argument juist NIET opgaat; daar is het homonym zelf een
       energie-autoriteit, en dan is de afweging anders. */
    reden: "het CBS is het Nederlandse statistiekbureau",
  },
  {
    patroon: /Rijksoverheid\p{L}*/iu,
    gebied: "nl",
    reden: "de Rijksoverheid is de Nederlandse landsoverheid",
  },
  {
    patroon: /\bTenneT\b|\bLiander\b|\bStedin\b|\bEnexis\b|Westland\s+Infra|\bCoteq\b/i,
    gebied: "nl",
    /* Dezelfde zes namen staan al in SUBJECT_PATRONEN
       (semantiek.ts:232-246) onder sleutel 'netbeheerder'. Ze zijn hier
       opnieuw opgeschreven en niet geimporteerd: dat patroon dient om
       het SUBJECT van een uitspraak te vinden, niet om een rechtsgebied
       vast te stellen, en de twee lijsten horen onafhankelijk te kunnen
       bewegen. */
    reden: "een Nederlandse netbeheerder; dezelfde zes namen staan in SUBJECT_PATRONEN van semantiek.ts",
  },
  {
    patroon: /Elektriciteitswet\p{L}*|Energiewet\p{L}*|Warmtewet\p{L}*/iu,
    gebied: "nl",
    /* Belgie heeft OOK een Elektriciteitswet (federaal, 1999). Dat is
       geen reden om dit patroon te laten vallen: staat die Belgische wet
       in de tekst, dan staat er vrijwel zeker ook 'Belgisch', 'federaal'
       of de CREG bij, en dan grijpt regel 2 — NL plus BE is ONBEKEND.
       Precies waarvoor die regel bestaat. */
    reden: "Nederlandse energiewetgeving",
  },
  {
    patroon: /\bSDE\+\+|\bSDE\b|\bISDE\b|\bVamil\b|milieu-?investeringsaftrek|energie-?investeringsaftrek/i,
    gebied: "nl",
    reden: "een Nederlandse subsidie- of fiscale regeling",
  },
  {
    /* ALLEEN IN KAPITALEN: 'Mia' is een voornaam, en die staat met /i
       niet te onderscheiden van de regeling. Case-sensitive \bMIA\b
       matcht 'Mia' niet, want de tweede en derde letter zijn daar
       kleine letters. */
    patroon: /\bMIA\b/,
    gebied: "nl",
    reden: "de MIA (milieu-investeringsaftrek) is een Nederlandse fiscale regeling; alleen in kapitalen gematcht, want 'Mia' is ook een voornaam",
  },
  {
    /* EIA STAAT HIER NIET ALS LOS ACRONYM, EN DAT IS EEN BEWUSTE KEUZE.
       De EIA is in Nederland de energie-investeringsaftrek, maar 'EIA'
       is ook de U.S. Energy Information Administration — en die
       publiceert energiecijfers. Een los \bEIA\b zou dus een Amerikaans
       energiefeit tot NEDERLAND bestempelen, en dat is exact de fout
       die deze module bestaat om te voorkomen: hij faalt dan OPEN.
       Weglaten faalt GESLOTEN (ONBEKEND, dus niet verwoordbaar).

       De volledige naam staat in het patroon hierboven; het acronym
       wordt alleen geaccepteerd in de Nederlandse schuine-streepvorm
       waarin het in de praktijk wordt geschreven. */
    patroon: /\b(MIA|Vamil|KIA)\s*\/\s*EIA\b|\bEIA\s*\/\s*(MIA|Vamil|KIA)\b/,
    gebied: "nl",
    reden: "EIA in de Nederlandse combinatie met MIA, Vamil of KIA; los staat EIA niet in de lijst, want dat is ook de Amerikaanse Energy Information Administration",
  },
];

/* ------------------------------------------------------------------
   De Nederlandse autoriteiten — AFGELEID UIT HET BRONREGISTER

   Elke naam hieronder staat letterlijk als `uitgever` in
   src/bronnen/register.ts, met de `uitgeverSoort` die daar genoemd
   wordt. De toets jurisdictie.test.ts controleert dat tegen het echte
   register, zodat hier geen uitgever kan binnensluipen die niet bestaat.

   DE MAATSTAF: een Nederlandse autoriteit of netbeheerder. Niet
   'betrouwbaar', niet 'primair' — dat laatste is een aparte eis in
   regel 7. Het gaat erom of de uitgever zelf het rechtsgebied vastlegt.

   WIE ER BEWUST NIET IN STAAN, en waarom. Elke uitsluiting maakt de
   uitkomst STRENGER (ONBEKEND in plaats van NEDERLAND), nooit ruimer:

   * VAKMEDIA — Solar365, Warmte365, Installatie.nl, Logistiek.nl,
     Energeia, Solar & Storage Magazine. Gemeten: zeven Nederlandse
     vakmedia op .nl publiceren over buitenland. Een vakmedium is geen
     autoriteit; het heeft in het register ook isPrimaireBron: false.

   * BRANCHEVERENIGINGEN — Energy Storage NL, ElaadNL. Een
     belangenorganisatie is geen autoriteit, en het register zegt het
     zelf bij Energy Storage NL: "Standpunten van de brancheorganisatie
     zijn geen feiten".

     NETBEHEER NEDERLAND STOND HIER OOK, MET EEN ARGUMENT DAT MEETBAAR
     ONJUIST WAS: "die naam IS een NL-tekstsignaal, dus een uitspraak die
     de koepel noemt komt via regel 3 op NEDERLAND uit". De uitgeversnaam
     staat niet in de UITSPRAAKTEKST. Gemeten op de productiedatastand,
     14 oktober 2026: drie uitspraken van Netbeheer Nederland kwamen
     daardoor op ONBEKEND uit en vielen uit de stroom —

       53/54 "Uit het IBO Bekostiging Elektriciteitsinfrastructuur en
              FIEN 2026 blijkt dat gerichte keuzes van de overheid de
              investeringsopgave ..."
       57    "Tot 2040 investeren de netbeheerders meer dan EUR200
              miljard in het elektriciteitsnet, waterstofleidingen,
              warmtenetten ..."

     Dat zijn onmiskenbaar Nederlandse feiten: het IBO is een Nederlands
     interdepartementaal beleidsonderzoek en "de netbeheerders" betekent
     in een publicatie van de Nederlandse koepel de Nederlandse.

     DE MAATSTAF IS DAAROM BIJGESTELD, en hij is scherper dan
     'autoriteit': IS HET BEREIK VAN DE UITGEVER PER DEFINITIE
     NEDERLANDS? Dat is waarom TenneT er NIET in staat (het beheert ook
     een Duits net) en Fraunhofer ook niet (Duitse uitgever met
     NL-data), en waarom Netbeheer Nederland er wel in hoort: het is de
     koepel van de NEDERLANDSE netbeheerders en kan per constructie niet
     over een ander land publiceren.

   * TENNET — wel netbeheerder, en wel een NL-tekstsignaal, maar
     uitgesloten van regel 7. TenneT beheert naast het Nederlandse
     hoogspanningsnet ook een Duits transmissienet, dus een TenneT-bericht
     zonder gebiedswoord legt het rechtsgebied niet vast. Regel 7 is de
     enige route waarlangs een tekst ZONDER signaal Nederlands wordt;
     die route moet de smalste zijn.

   * TENDERNED — een publicatieplatform. De opdrachtbeschrijving is van
     de aanbestedende dienst, niet van TenderNed, dus het platform
     verklaart niets over het rechtsgebied van de inhoud.

   * FRAUNHOFER ISE (ENERGY-CHARTS) — gemeten een Duitse uitgever met
     NL-data, en isPrimaireBron: false. Dit is juist het voorbeeld
     waarmee is vastgesteld dat de uitgeversnaam geen geografie is.
   ------------------------------------------------------------------ */

export type NlAutoriteit = {
  /** Exact zoals `uitgever` in src/bronnen/register.ts. */
  readonly uitgever: string;
  /** Exact zoals `uitgeverSoort` in src/bronnen/register.ts. */
  readonly soort: string;
  readonly waarom: string;
};

export const NL_AUTORITEITEN: readonly NlAutoriteit[] = [
  {
    uitgever: "Autoriteit Consument & Markt",
    soort: "toezichthouder",
    waarom: "de Nederlandse toezichthouder op de energiemarkt; stelt de tariefregulering vast",
  },
  {
    uitgever: "Rijksdienst voor Ondernemend Nederland",
    soort: "rijksoverheid",
    waarom: "uitvoerder van Nederlandse regelingen namens het ministerie",
  },
  {
    uitgever: "Rijksoverheid",
    soort: "rijksoverheid",
    waarom: "de Nederlandse landsoverheid zelf",
  },
  {
    uitgever: "KOOP / Officiële Bekendmakingen",
    soort: "rijksoverheid",
    waarom:
      "de officiele publicaties van de Nederlandse staat (Staatscourant, Gemeenteblad); " +
      "beide bronnen staan in het register op actief:false vanwege robots, maar de uitgever blijft wat hij is",
  },
  {
    uitgever: "Centraal Bureau voor de Statistiek",
    soort: "statistiek",
    waarom: "het Nederlandse statistiekbureau; zijn cijfers gaan over Nederland",
  },
  {
    uitgever: "PDOK / Kadaster",
    soort: "geodata",
    waarom:
      "het Kadaster is een Nederlands publiek lichaam; de bron levert de Nederlandse " +
      "bestuurlijke gebieden en staat in het register op levertGebeurtenissen:false, " +
      "dus hij draagt in de praktijk geen uitspraken",
  },
  {
    uitgever: "Mijn Aansluiting (gezamenlijke netbeheerders)",
    soort: "geodata",
    waarom:
      "de gezamenlijke Nederlandse netbeheerders; het register meet zes Nederlandse " +
      "elektriciteitsnetbeheergebieden, en ook deze bron levert geen gebeurtenissen",
  },
  {
    uitgever: "Netbeheer Nederland",
    soort: "branchevereniging",
    waarom:
      "de koepel van de NEDERLANDSE netbeheerders; haar bereik is per definitie Nederlands. " +
      "Stond hier bewust niet, op het argument dat de naam zelf een tekstsignaal is — gemeten " +
      "op 14 oktober 2026 was dat onjuist, want de uitgeversnaam staat niet in de " +
      "uitspraaktekst, en drie Nederlandse feiten vielen daardoor op ONBEKEND uit",
  },
  { uitgever: "Liander", soort: "netbeheerder", waarom: "regionale netbeheerder in Nederland" },
  { uitgever: "Enexis", soort: "netbeheerder", waarom: "regionale netbeheerder in Nederland" },
  { uitgever: "Stedin", soort: "netbeheerder", waarom: "regionale netbeheerder in Nederland" },
  { uitgever: "Coteq Netbeheer", soort: "netbeheerder", waarom: "regionale netbeheerder in Nederland" },
  {
    uitgever: "Westland Infra Netbeheer",
    soort: "netbeheerder",
    waarom: "regionale netbeheerder in Nederland",
  },
  { uitgever: "RENDO Groep", soort: "netbeheerder", waarom: "regionale netbeheerder in Nederland" },
  {
    uitgever: "Energieonderbrekingen.nl (gezamenlijke netbeheerders)",
    soort: "netbeheerder",
    waarom: "het storingsregister van de gezamenlijke Nederlandse netbeheerders",
  },
];

/** Zodat 'Stedin ' en 'stedin' hetzelfde zijn, en niets anders. */
function normaliseerUitgever(naam: string): string {
  return naam.trim().toLowerCase().replace(/\s+/gu, " ");
}

const AUTORITEITSNAMEN: ReadonlySet<string> = new Set(
  NL_AUTORITEITEN.map((a) => normaliseerUitgever(a.uitgever)),
);

const LABEL: Record<Signaalsoort, string> = {
  nl: "NL-signaal",
  be: "BE-signaal",
  eu: "EU-signaal",
};

/**
 * Stel het toepassingsgebied van een feitelijke uitspraak vast.
 *
 * Zuiver: dezelfde invoer geeft altijd dezelfde uitvoer. Geen database,
 * geen netwerk, geen klok.
 *
 * `isPrimaireBron` komt uit het bronregister en hoort door de aanroeper
 * te worden meegegeven. Ontbreekt hij, dan geldt hij als false — de
 * strenge kant, want de uitgeversregel is de enige route waarlangs een
 * tekst zonder gebiedssignaal Nederlands kan worden.
 */
export function bepaalToepassingsgebied(invoer: {
  readonly tekst: string;
  readonly uitgever?: string | null;
  /** Is de uitgever een PRIMAIRE bron? Alleen dan mag hij meewegen. */
  readonly isPrimaireBron?: boolean;
}): Jurisdictieoordeel {
  const tekst = typeof invoer.tekst === "string" ? invoer.tekst : "";
  const gevonden: Record<Signaalsoort, string[]> = { nl: [], be: [], eu: [] };
  const grondslag: string[] = [];
  /* Twee patronen kunnen hetzelfde woord raken. Dan is het EEN signaal
     met EEN regel, anders telt de grondslag dubbel en lijkt het bewijs
     zwaarder dan het is. */
  const alGezien = new Set<string>();

  for (const p of PATRONEN) {
    const m = p.patroon.exec(tekst);
    if (!m) continue;
    const trefwoord = m[0].trim().slice(0, 40);
    const sleutel = `${p.gebied}|${trefwoord.toLowerCase()}`;
    if (alGezien.has(sleutel)) continue;
    alGezien.add(sleutel);
    gevonden[p.gebied].push(trefwoord);
    grondslag.push(`${LABEL[p.gebied]} "${trefwoord}" — ${p.reden}`);
  }

  const signalen = { nl: gevonden.nl, be: gevonden.be, eu: gevonden.eu };
  const heeftNl = gevonden.nl.length > 0;
  const heeftBe = gevonden.be.length > 0;
  const heeftEu = gevonden.eu.length > 0;

  /* --- regel 2: ambigu, en dan wordt er niet gegokt ---------------- */
  if (heeftNl && heeftBe) {
    grondslag.push(
      `AMBIGU: de tekst draagt zowel een Nederlands signaal (${gevonden.nl.join(", ")}) als een ` +
        `Belgisch signaal (${gevonden.be.join(", ")}). Welk rechtsgebied geldt, weet alleen de bron; ` +
        "het gebied wordt daarom ONBEKEND en niet gegokt.",
    );
    return { gebied: "ONBEKEND", grondslag, signalen };
  }

  /* --- regel 1 en 6: buitenlands signaal zonder NL ----------------- */
  if (heeftBe) {
    grondslag.push(
      heeftEu
        ? "BESLUIT BELGIE: een Belgisch signaal zonder Nederlands signaal. Er staat ook een " +
          "EU-signaal in; het smalste gebied gaat voor, en dat is hier tegelijk het strengste."
        : "BESLUIT BELGIE: een Belgisch signaal zonder Nederlands signaal. Een Belgisch tarief, " +
          "een Vlaamse subsidie of een Waalse verplichting geldt in Nederland niet.",
    );
    return { gebied: "BELGIE", grondslag, signalen };
  }

  /* --- regel 3 en 5: alleen NL, of NL binnen een EU-kader ---------- */
  if (heeftNl) {
    grondslag.push(
      heeftEu
        ? "BESLUIT NEDERLAND: een Nederlands signaal naast een EU-signaal. Een EU-kader waarin " +
          "Nederland zelf genoemd wordt, is een uitspraak over Nederland; het smalste gebied gaat voor."
        : "BESLUIT NEDERLAND: alleen Nederlandse signalen in de tekst.",
    );
    return { gebied: "NEDERLAND", grondslag, signalen };
  }

  /* --- regel 4: alleen EU ----------------------------------------- */
  if (heeftEu) {
    grondslag.push(
      "BESLUIT EU: alleen Europese signalen. Een EU-verplichting werkt door in Nederland, " +
        "dus dit is geen ONBEKEND.",
    );
    return { gebied: "EU", grondslag, signalen };
  }

  /* --- regel 7: geen enkel signaal, dus de uitgeversregel ---------- */
  const uitgever = typeof invoer.uitgever === "string" ? invoer.uitgever.trim() : "";
  const isAutoriteit = uitgever !== "" && AUTORITEITSNAMEN.has(normaliseerUitgever(uitgever));
  const primair = invoer.isPrimaireBron === true;

  grondslag.push(
    "GEEN GEBIEDSSIGNAAL in de tekst: geen Nederlands, Belgisch of Europees woord gevonden.",
  );

  if (isAutoriteit && primair) {
    grondslag.push(
      `UITGEVERSREGEL: "${uitgever}" staat in het bronregister als Nederlandse autoriteit of ` +
        "netbeheerder, en de bron is primair. Alleen die combinatie maakt een tekst zonder " +
        "gebiedssignaal NEDERLAND.",
    );
    return { gebied: "NEDERLAND", grondslag, signalen };
  }

  const waaromNiet = !isAutoriteit
    ? uitgever === ""
      ? "er is geen uitgever meegegeven"
      : `uitgever "${uitgever}" is geen Nederlandse autoriteit of netbeheerder in het bronregister`
    : `uitgever "${uitgever}" is wel een Nederlandse autoriteit, maar de bron is niet als primair aangemerkt`;

  grondslag.push(
    `BESLUIT ONBEKEND: ${waaromNiet}. Zonder signaal en zonder die uitgever wordt NEDERLAND ` +
      "niet aangenomen — stil NEDERLAND maken is precies het mechanisme dat een buitenlands " +
      "feit tot Nederlands feit maakt.",
  );
  return { gebied: "ONBEKEND", grondslag, signalen };
}
