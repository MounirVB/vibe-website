/* ============================================================
   PIJPLIJN — documentsoort: wat IS dit document eigenlijk?
   ------------------------------------------------------------
   HET DEFECT DAT DEZE LAAG OPLOST. Gemeten in productie op
   30 oktober 2026, niet vermoed.

   `pijplijn/uitspraken.ts` zette de bewijskracht van elke claim op één
   regel:

     magBevestigen       = invoer.isPrimaireBron && invoer.betrouwbaarheid >= 4
     bewijs_kwaliteit    = min(5, max(1, invoer.betrouwbaarheid))

   Beide getallen komen uit `intel.bronnen` en horen bij de UITGEVER, niet
   bij het document. `netbeheer-nederland-nieuws` staat daar met
   `betrouwbaarheid 5` en `is_primaire_bron true`, dus:

     45 claims uit Netbeheer Nederland
     45 bevestigd
     bewijs_kwaliteit 5,0 gemiddeld en 5 maximaal

   Dat waren 45 van de 51 bevestigde claims in het hele platform. En de
   documenten waar ze uit komen zijn niet van één soort:

     'ACM stelt de nettarieven voor 2026 vast'
         -> een branchevereniging die een besluit van de TOEZICHTHOUDER
            navertelt. Netbeheer Nederland is niet de bron van dat besluit.
     'Bouw versnelt opnieuw, maar de vraag loopt nog steeds op'
         -> eigen wachtlijstcijfers, waarvan zij wél de bron zijn.
     'Inbreng voor het eerste debat Netcongestie van de nieuwe Kamer'
         -> een LOBBYDOCUMENT. De claim die eruit kwam en bevestigd werd:
            'Schaal daarom de bestaande Flex-E-regeling op naar een
            Flex-E regeling XL van structureel EUR 125 miljoen per jaar'
            — met bewijs_kwaliteit 5.

   Die laatste is een VERZOEK aan de Kamer, opgeslagen als vastgesteld
   feit met de hoogste bewijskracht die dit systeem kent. Een artikel dat
   daarop bouwt zou een lobbywens als beleid publiceren.

   ------------------------------------------------------------
   WAT DEZE MODULE DOET, EN WAT NIET

   Hij bepaalt de SOORT van één documentversie uit de titel, de tekst, de
   URL en het gezag van de uitgever, en geeft de grondslag mee: welk
   signaal vuurde, met het stukje tekst dat het veroorzaakte. Daarmee is
   de uitslag na te rekenen zonder de motor te draaien.

   Hij is PUUR: geen database, geen netwerk, geen model. Dat is geen
   zuinigheid maar een eis. Een classificatie die van een taalmodel
   afhangt is niet reproduceerbaar, niet uitlegbaar in een audit, en in
   de productiecontainer bovendien dood: `OPENAI_API_KEY` is daar niet
   gezet (gemeten 29 oktober 2026).

   ------------------------------------------------------------
   DE VEILIGHEIDSREGEL, EN WAAROM HIJ ZO IS GEBOUWD

   De opdracht eist: een branchevereniging mag nooit automatisch de
   status van een toezichthouder, ministerie, wetgever of netbeheerder
   krijgen. Dat is hier geen controle achteraf maar een eigenschap van de
   constructie:

     TEKST KAN ALLEEN VERLAGEN, NOOIT VERHOGEN.

   De twee zwaarste soorten (OFFICIEEL_BESLUIT, OFFICIELE_REGELGEVING)
   zijn alleen bereikbaar als het GEZAG van de uitgever ze kan uitvaardigen.
   Geen enkele formulering in de brontekst brengt een document daar.
   Omgekeerd mogen lobby-, opinie- en persberichtsignalen een document
   wél naar beneden halen, ook bij een gezaghebbende uitgever.

   Dat is precies de kant die een aanvaller niet kan gebruiken: wie de
   brontekst beheerst, kan zijn eigen document hoogstens LAGER laten
   classificeren. Zie test/adversarieel/documentsoort-manipulatie.test.ts.

   ------------------------------------------------------------
   DERDE REGEL, NIEUW IN V2: EEN BERICHT OVER EEN REGEL IS DE REGEL NIET

   V1 las twee assen — het gezag van de uitgever en de formuleringen in
   de tekst — en dat was voor één vraag te weinig. De authentieke
   regeling en het nieuwsbericht erover gebruiken dezelfde woorden
   ('treedt in werking', 'wijziging van de wet'), en het ministerie is in
   beide gevallen bevoegd. Gemeten op 31 oktober 2026:

     "Nieuwsbericht 29-10-2026 | 10:14  Vanaf 1 november 2026 treedt de
      wijziging van de Wet toeristische verhuur in werking."
     -> OFFICIELE_REGELGEVING, plafond 5, mag zichzelf bevestigen

   Wat die twee onderscheidt is de VORM, en die as zat er niet in.
   `documentvorm.ts` leest hem uit STRUCTUURMARKERINGEN — de
   zelfbenoeming 'Nieuwsbericht', de aanhef 'Gelet op artikel', de
   rechtsmiddelenclausule, een zaakkenmerk — en niet uit de strekking.
   Vaststellen vraagt nu drie dingen die ALLE DRIE moeten gelden:

     uitgever   het gezag kan het uitvaardigen
     inhoud     de tekst draagt een besluit of een regel
     vorm       het stuk is aantoonbaar het AUTHENTIEKE stuk

   DE VORM IS EEN EXTRA EIS EN NOOIT EEN VERVANGING. Een marktpartij die
   een rechtsmiddelenclausule onder zijn tekst zet haalt de vorm wel,
   maar niet het gezag, en komt dus nergens. Omgekeerd verlaagt een
   nieuwsbericht-markering ook bij een ministerie. Dezelfde asymmetrie
   als hierboven: tekst verlaagt, gezag verhoogt.

   Twee soorten vullen het gat dat daardoor benoembaar werd:
   NIEUWSBERICHT_REGELGEVING (plafond 3, mag niet zelf bevestigen) en
   ONTWERPBESLUIT (plafond 2, draagt niets).

   ------------------------------------------------------------
   TWEEDE REGEL: WIE EEN BESLUIT NAVERTELT, IS ER NIET DE BRON VAN

   Noemt een document een ander gezag als handelende partij ('ACM stelt
   vast', 'de minister besluit'), en is de uitgever dat gezag niet, dan is
   het SECUNDAIRE_BERICHTGEVING en draagt het de naam van dat gezag mee in
   `beschrijftBesluitVan`. De claimlaag gebruikt dat veld om te eisen dat
   het oorspronkelijke besluit ook bij de bevoegde instantie is gezien
   voordat de claim als vastgesteld geldt.
   ============================================================ */

import {
  bepaalDocumentvorm,
  vormKanVaststellen,
  type Documentvorm,
  type DocumentvormUitslag,
} from "./documentvorm.ts";

/**
 * De soorten, van zwaarste bewijs naar lichtste.
 *
 * TWEE SOORTEN ERBIJ IN V2, en ze zitten precies in het gat dat v1 niet
 * kon benoemen. V1 kende alleen "dit IS een regeling" en "dit vertelt
 * een regeling van een ANDER na". Een ministerie dat zijn eigen
 * wetswijziging in een nieuwsbericht aankondigt viel in geen van beide
 * en kwam daarom in de eerste terecht — met bewijskrachtplafond 5.
 *
 *   NIEUWSBERICHT_REGELGEVING  het bevoegde gezag bericht OVER zijn
 *                              eigen regel of besluit, maar het stuk is
 *                              niet het authentieke stuk
 *   ONTWERPBESLUIT             het stuk is een ontwerp of consultatie;
 *                              er is nog niets vastgesteld
 */
export type Documentsoort =
  | "OFFICIEEL_BESLUIT"
  | "OFFICIELE_REGELGEVING"
  | "FEITELIJKE_MEDEDELING"
  | "ONDERZOEKSRAPPORT"
  | "SECTORANALYSE"
  | "NIEUWSBERICHT_REGELGEVING"
  | "ONTWERPBESLUIT"
  | "PERSBERICHT"
  | "OPINIE"
  | "LOBBYDOCUMENT"
  | "SECUNDAIRE_BERICHTGEVING"
  | "ONVOLDOENDE_VERIFIEERBAAR";

/**
 * Verhoog dit bij elke wijziging die een uitslag kan veranderen.
 *
 * V2 (31 oktober 2026) voegt de VORM-as toe. Zie documentvorm.ts voor
 * het gemeten defect: een rijksoverheid-nieuwsbericht over een
 * wetswijziging werd OFFICIELE_REGELGEVING met plafond 5 en mocht
 * zichzelf bevestigen.
 */
export const DOCUMENTSOORT_VERSIE = "documentsoort-v2";

/**
 * Het GEZAG van een uitgever: wat mag deze partij uit zichzelf vaststellen.
 *
 * Dit is iets anders dan betrouwbaarheid. Een branchevereniging kan
 * volstrekt betrouwbaar zijn over zijn eigen cijfers en tegelijk geen
 * enkele bevoegdheid hebben om een tarief vast te stellen.
 */
export type Gezag =
  /** Kan besluiten en regelgeving uitvaardigen: ministeries, toezichthouders. */
  | "BEVOEGD_GEZAG"
  /** Gezaghebbend over de eigen infrastructuur, niet over besluiten. */
  | "NETBEHEERDER"
  /** Gezaghebbend over eigen statistiek en geodata. */
  | "STATISTIEK"
  /** Behartigt een belang. Kan feiten melden, maar heeft een agenda. */
  | "BELANGENBEHARTIGER"
  /** Marktpartij, vakmedium, platform. */
  | "MARKT";

/**
 * Uitgeverssoort uit `bronnen/register.ts` naar gezag.
 *
 * Deze kaart is met opzet NIET dezelfde als BRONSOORT_UIT_UITGEVER in
 * site/nieuwsregister.ts. Die kaart beantwoordt de vraag "mag deze bron
 * een nieuwsbericht dragen" en daar is `branchevereniging` MARKTPARTIJ.
 * Hier gaat het om "wat mag deze partij vaststellen", en dan is een
 * branchevereniging iets anders dan een vakmedium: hij is vaak wél de
 * bron van zijn eigen sectorcijfers. Twee vragen, twee kaarten; ze
 * samenvoegen zou één van beide antwoorden verslechteren.
 */
export const GEZAG_UIT_UITGEVER: Readonly<Record<string, Gezag>> = {
  rijksoverheid: "BEVOEGD_GEZAG",
  toezichthouder: "BEVOEGD_GEZAG",
  netbeheerder: "NETBEHEERDER",
  statistiek: "STATISTIEK",
  geodata: "STATISTIEK",
  branchevereniging: "BELANGENBEHARTIGER",
  aanbestedingen: "MARKT",
  vakmedium: "MARKT",
  marktplatform: "MARKT",
};

/** Een onbekende uitgeverssoort valt naar de laagste bevoegdheid. */
export function gezagVan(uitgeverSoort: string): Gezag {
  return GEZAG_UIT_UITGEVER[uitgeverSoort] ?? "MARKT";
}

/**
 * De soorten die ALLEEN een bevoegd gezag kan voortbrengen.
 *
 * Dit is de hele veiligheidsregel in één constante. Hij wordt op twee
 * plekken afgedwongen: bij het classificeren (de signalen kunnen er niet
 * komen) en in een expliciete eindcontrole, zodat een latere wijziging
 * in de signaallogica de regel niet stil kan omzeilen.
 */
export const ALLEEN_BEVOEGD_GEZAG: readonly Documentsoort[] = [
  "OFFICIEEL_BESLUIT",
  "OFFICIELE_REGELGEVING",
];

/**
 * De soorten die zelf een JURIDISCHE toestand vaststellen.
 *
 * EEN TWEEDE NAAM VOOR DEZELFDE LIJST, en dat is hier bewust. De vraag
 * "wie mag dit uitvaardigen" (ALLEEN_BEVOEGD_GEZAG) en de vraag "stelt
 * dit stuk recht vast" zijn verschillend, en ze vallen voor deze twaalf
 * soorten samen. Door de ene uit de andere te DEFINIEREN kunnen ze niet
 * uiteenlopen als er een soort bijkomt, terwijl de naam op de plek van
 * gebruik wel zegt welke vraag er gesteld wordt.
 *
 * `uitspraken.ts` leest deze lijst: een juridische claim bevestigt
 * zichzelf alleen uit zo'n stuk. Zie claimaard.ts voor het gemeten gat.
 */
export const VASTSTELLENDE_SOORTEN: readonly Documentsoort[] = ALLEEN_BEVOEGD_GEZAG;

/* ------------------------------------------------------------------
   DE SIGNALEN

   Elk signaal draagt zijn eigen reden en een voorbeeld, zodat de
   grondslag leesbaar is zonder de code ernaast. De patronen zijn
   bewust smal: 'besluit' alleen is te algemeen ('het besluit van de
   ondernemer'), dus de besluitsignalen eisen een vorm die in een
   bekendmaking staat.
   ------------------------------------------------------------------ */

type Signaal = {
  readonly naam: string;
  readonly patroon: RegExp;
  readonly reden: string;
};

/** Een verzoek, een oproep, een wens. Verlaagt altijd. */
const LOBBY: readonly Signaal[] = [
  {
    naam: "inbreng",
    patroon: /\binbreng\b[^.]{0,40}\b(debat|kamer|commissie|hoorzitting|consultatie)\b/iu,
    reden: "de tekst is ingediend als inbreng voor een politiek debat",
  },
  {
    naam: "pleidooi",
    patroon: /\b(pleit(en|ten)?\s+(?:er\s+)?voor|pleidooi|position\s*paper)\b/iu,
    reden: "de tekst pleit expliciet voor een standpunt",
  },
  {
    naam: "oproep",
    patroon: /\b(roep(en|t)\s+(?:wij\s+)?(?:de\s+)?\w+\s+op|oproep\s+aan|dringen\s+aan\s+op)\b/iu,
    reden: "de tekst roept een partij op iets te doen",
  },
  {
    naam: "verzoek-tot-wijziging",
    patroon:
      /\b(schaal\b[^.]{0,60}\bop\s+naar|verhoog\b[^.]{0,40}\bnaar|moet(en)?\s+(?:de\s+)?(overheid|minister|kabinet|kamer)\b|wij\s+vragen\b|zou(den)?\s+moeten\s+worden\s+(verhoogd|verruimd|aangepast))/iu,
    reden: "de tekst vraagt om een andere regel of een ander bedrag",
  },
  {
    naam: "aanbeveling-aan-gezag",
    patroon: /\baanbeveling(en)?\s+aan\s+(de\s+)?(kamer|minister|kabinet|acm|overheid)\b/iu,
    reden: "de tekst richt aanbevelingen tot een bevoegd gezag",
  },
];

/** Een mening of standpunt. Verlaagt. */
const OPINIE: readonly Signaal[] = [
  {
    naam: "standpunt",
    patroon: /\b(standpunt|onze\s+visie|opinie|column|blog)\b/iu,
    reden: "de tekst presenteert zich als standpunt of opinie",
  },
  {
    naam: "wij-vinden",
    patroon: /\b(wij\s+(vinden|menen|geloven)|naar\s+onze\s+mening|volgens\s+ons)\b/iu,
    reden: "de tekst spreekt in de eerste persoon een mening uit",
  },
  {
    naam: "waardering",
    patroon: /\b(biedt\s+stevige\s+handvatten|goede\s+stap|teleurstellend|onacceptabel|verheugd)\b/iu,
    reden: "de tekst waardeert een ontwikkeling in plaats van hem te melden",
  },
];

/* DE PERSBERICHTPATRONEN STAAN NU IN documentvorm.ts.
   Zelfbenoeming is een VORMvraag ("wat is dit voor stuk") en geen
   inhoudsvraag, en hij hoort daarom op één plek te staan. Stap 2 van
   bepaalDocumentsoort leest de vorm-as. */

const ONDERZOEK: readonly Signaal[] = [
  {
    naam: "methode",
    patroon:
      /\b(methodologie|onderzoeksmethode|steekproef|respondenten|n\s*=\s*\d+|meetmethode|verantwoording\s+van\s+de\s+cijfers)\b/iu,
    reden: "de tekst beschrijft een controleerbare methode",
  },
  {
    naam: "rapport",
    patroon: /\b(rapport|onderzoeksrapport|studie|analyse\s+in\s+opdracht\s+van)\b/iu,
    reden: "de tekst presenteert zich als rapport of studie",
  },
];

const SECTORANALYSE: readonly Signaal[] = [
  {
    naam: "marktbeeld",
    patroon:
      /\b(marktanalyse|sectoranalyse|monitor|kwartaalcijfers|jaaroverzicht|trendrapport|barometer)\b/iu,
    reden: "de tekst geeft een sectorbreed beeld",
  },
];

/**
 * Een bekendmaking van een besluit. Bereikbaar alleen voor bevoegd gezag
 * EN alleen in een vaststellende documentvorm; zie stap 4.
 *
 * DE BESLUITTAAL VAN DE ACM ONTBRAK, en dat was meetbaar. Gemeten op
 * 30 oktober 2026 over alle 3.679 productieversies: `OFFICIEEL_BESLUIT`
 * kwam NUL keer voor. Daardoor kon `bronverificatie.ts` — die eist dat
 * het origineel `documentsoort in (OFFICIEEL_BESLUIT,
 * OFFICIELE_REGELGEVING)` heeft — nooit een origineel vinden, en bleven
 * alle 111 navertellingen permanent NIET_TERUGGEVONDEN. De verificatie
 * was in de praktijk inert.
 *
 * En dat terwijl er 19 ACM-documenten in het corpus staan die een
 * besluit in titel én tekst dragen:
 *
 *   "Baltisse en Arcola mogen gezamenlijke zeggenschap verkrijgen
 *    over HBG (concentratiebesluit)"
 *   "Geschilbesluit ZonOffensief - Stedin"
 *   "De ACM concludeert dat de klacht van Jumbo gegrond is."
 *
 * De oude patronen eisten `heeft besloten`, `wij besluiten` of
 * `stelt vast dat`. Zo schrijft de ACM niet. De patronen hieronder komen
 * uit de werkelijke formuleringen op www.acm.nl, deze sessie gelezen.
 */
const BESLUIT: readonly Signaal[] = [
  {
    naam: "bekendmaking",
    patroon:
      /\b(staatscourant|staatsblad|gepubliceerd\s+in\s+de\s+staatscourant|ter\s+inzage\s+gelegd|kenmerk\s+acm\/)\b/iu,
    reden: "de tekst verwijst naar een officiële bekendmaking",
  },
  /* DRIE PATROONFOUTEN UIT HET LABELWERK, hier gerepareerd. Mijn eerste
     versie eiste `heeft besloten` als aaneengesloten woorden; de ACM
     schrijft "Dat heeft de ACM op 26 oktober 2026 besloten" en dat
     matcht niet. Vier van de vijf concentratiebesluiten in de labelset
     vielen daardoor terug op FEITELIJKE_MEDEDELING. Nu met een
     woordafstand binnen dezelfde zin. */
  {
    naam: "besluitvorm",
    patroon:
      /\b(besluit\s+van\s+de\s+(minister|autoriteit|staatssecretaris)|he(eft|bben)\b[^.]{0,70}\bbesloten|he(eft|bben)\s+(een\s+)?besluit\s+genomen|wij\s+besluiten|stelt\s+(hierbij\s+)?vast\s+dat|vastgesteld\s+besluit)\b/iu,
    reden: "de tekst draagt de vorm van een besluit van het eigen gezag",
  },
  /* Het dictum van een toezichthouder. 'Oordeelt dat', 'wijst af' en
     'goedgekeurd' kwamen uit de labelset; de oude patronen misten ze
     alle drie. De gap stond eerst op 40 tekens en viel 4 tekens te kort
     voor "heeft de registratie van Stichting digiGO als
     databemiddelingsdienst goedgekeurd" — dat soort marge hoort
     gemeten, niet geraden. */
  {
    naam: "dictum",
    patroon:
      /\b(oordeelt\s+dat|he(eft|bben)\b[^.]{0,80}\bgoedgekeurd|is\s+goedgekeurd\s+onder|wijst\s+(het|de)\s+(verzoek|klacht|aanvraag)\s+af)\b/iu,
    reden: "de tekst spreekt het oordeel van het bevoegde gezag uit",
  },
  /* De beslissing op een geschil of klacht. 'Gegrond' en 'ongegrond'
     zijn juridische uitkomsten, geen journalistieke woorden. */
  {
    naam: "geschilbeslissing",
    patroon:
      /\bde\s+klacht\b[^.]{0,60}\b(is\s+)?(gegrond|ongegrond|afgewezen|toegewezen)\b|\bconcludeert\s+dat\s+de\s+klacht\b/iu,
    reden: "de tekst beslist op een klacht of geschil",
  },
  /* Een concentratiebesluit: toestemming voor zeggenschap of overname.
     'Mogen verkrijgen' is de standaardformulering van de ACM. */
  /* `mog(en|t)` matchte 'mogen' maar niet 'mag', en de ACM schrijft
      "Standard Investment mag uitsluitende zeggenschap verkrijgen".
      Vier besluiten in de labelset vielen daarop. */
  {
    naam: "concentratiebeslissing",
    patroon:
      /\b(mag|mogen)\b[^.]{0,70}\b(zeggenschap\s+verkrijgen|overnemen|verkrijgen\s+over)\b|\bgezamenlijke\s+zeggenschap\s+verkrijgen\b/iu,
    reden: "de tekst verleent toestemming voor zeggenschap of een overname",
  },
  /* Verlenen, weigeren of intrekken van een bevoegdheidsstuk. */
  {
    naam: "beschikking",
    patroon:
      /\b(ontheffing|vergunning|erkenning|toestemming|machtiging)\s+(is\s+)?(verleend|geweigerd|ingetrokken|afgegeven)\b|\bmag\b[^.]{0,50}\b(leveren\s+aan\s+eindafnemers|elektriciteit\s+en\s+gas\s+leveren)\b/iu,
    reden: "de tekst verleent, weigert of trekt een bevoegdheidsstuk in",
  },
  /* DE PASSIEVE VASTSTELLING, en die ontbrak volledig. De oude
     patronen eisten de actieve vorm `stelt vast dat`, maar een
     Nederlands tariefbesluit schrijft:

       "Het nettarief is vastgesteld op 12,50 euro per maand."
       "De capaciteit wordt vastgesteld op 90 MW."
       "Gelet op artikel 41 besluit de minister dat ..."

     Gemeten tijdens de adversariële ronde: een tariefbesluit IN
     BEKENDMAKINGSVORM, van de ACM, met een getal en een
     rechtsmiddelenclausule, kwam uit op FEITELIJKE_MEDEDELING. Precies
     het document waar de primaire-bronverificatie op moet ankeren viel
     erbuiten.

     Dit kan niets omhoog praten: de vormeis en de gezagseis staan er
     onverkort naast. Wat het repareert is een besluit dat we niet als
     besluit herkenden. */
  {
    naam: "vaststelling",
    patroon:
      /\b((is|wordt|worden|zijn)\s+vastgesteld\s+op|stelt\b[^.]{0,40}\bvast\s+op|besluit\s+de\s+(minister|autoriteit|staatssecretaris|raad)\s+dat)\b/iu,
    reden: "de tekst stelt een grootheid vast in besluitvorm",
  },
  /* Een sanctie is per definitie een besluit. */
  {
    naam: "sanctie",
    patroon:
      /\b(boete\s+(van\s+)?(€|eur|opgelegd)|last\s+onder\s+dwangsom|dwangsom\s+opgelegd|bestuurlijke\s+boete)\b/iu,
    reden: "de tekst legt een sanctie op",
  },
];

const REGELGEVING: readonly Signaal[] = [
  {
    naam: "regelingvorm",
    patroon:
      /\b(regeling\s+van\s+de\s+minister|wijziging\s+van\s+de\s+(wet|regeling|beleidsregel)|treedt\s+in\s+werking|inwerkingtreding|beleidsregel)\b/iu,
    reden: "de tekst stelt regelgeving of beleid vast",
  },
];

/**
 * Een ander gezag als handelende partij. Het signaal draagt de NAAM van
 * dat gezag mee, want de claimlaag moet weten waar het origineel te
 * halen is.
 */
const ANDER_GEZAG: readonly { readonly naam: string; readonly patroon: RegExp }[] = [
  { naam: "ACM", patroon: /\bacm\b(?![\w/])/iu },
  { naam: "de minister", patroon: /\b(de\s+)?minister\s+(van|voor)\s+\w+/iu },
  { naam: "het kabinet", patroon: /\bhet\s+kabinet\b/iu },
  { naam: "de Tweede Kamer", patroon: /\b(tweede\s+kamer|de\s+kamer)\b/iu },
  { naam: "de Europese Commissie", patroon: /\beuropese\s+commissie\b/iu },
  { naam: "RVO", patroon: /\brvo\b/iu },
  { naam: "TenneT", patroon: /\btennet\b/iu },
];

/**
 * Vormt deze uitgever zelf het genoemde gezag? Dan is het geen navertelling.
 *
 * GEEXPORTEERD omdat `bronverificatie.ts` de OMGEKEERDE kaart nodig
 * heeft — welke bronsleutels vormen gezag X — en die daaruit AFLEIDT.
 * Een tweede, met de hand bijgehouden kaart liep uiteen: een audit vond
 * dat `koop-gemeenteblad-vergunningen` hier onder 'de minister' staat
 * maar in die kaart ontbrak, juist de bron met de regionale
 * bekendmakingen. Eén kaart, twee leesrichtingen.
 */
export const EIGEN_GEZAG_NAMEN: Readonly<Record<string, readonly string[]>> = {
  "acm-besluiten": ["ACM"],
  "rijksoverheid-nieuws": ["de minister", "het kabinet", "de Tweede Kamer"],
  "rvo-opendata-artikelen": ["RVO"],
  "rvo-subsidie-sitemap": ["RVO"],
  "koop-staatscourant-energie": ["de minister", "het kabinet"],
  "koop-gemeenteblad-vergunningen": ["de minister"],
  "tennet-publicaties": ["TenneT"],
};

/**
 * Bronnen die bekendmakingen van MEERDERE instanties bundelen.
 *
 * WAAROM DIT ERBIJ MOET, en waarom `EIGEN_GEZAG_NAMEN` in twee
 * richtingen niet dezelfde relatie is.
 *
 * Voor de classificatievraag — "vertelt dit document een besluit van
 * een ANDER na?" — is de kaart hierboven juist. De Staatscourant IS het
 * officiële kanaal waarin een ministerieel besluit verschijnt, dus een
 * Staatscourantbericht over de minister is daar geen navertelling van.
 *
 * Voor de OMGEKEERDE vraag — "welke bron VORMT gezag X?", die
 * bronverificatie.ts stelt — klopt het niet. Een
 * bekendmakingenkanaal is geen instantie: de Staatscourant publiceert
 * besluiten van ministers, de ACM, provincies en waterschappen door
 * elkaar, en het Gemeenteblad publiceert besluiten van colleges van
 * B&W — niet van de minister, hoe de kaart hierboven ook leest.
 *
 * HET GEMETEN RISICO. Zonder deze lijst kon een navertelling van een
 * ministerieel besluit worden bevestigd door een GEMEENTELIJKE
 * vergunning in het Gemeenteblad die toevallig hetzelfde getal met
 * dezelfde eenheid over hetzelfde onderwerp noemt binnen het
 * tijdvenster. Dan zegt de uitslag TERUGGEVONDEN terwijl het document
 * van een heel ander bestuursorgaan is.
 *
 * DE OPLOSSING VERSOEPELT NIETS. Voor een bron uit deze lijst moet het
 * gevonden document het gezag ook ZELF noemen; zie
 * `documentNoemtGezag()`. Dat is een extra eis, dus er kunnen alleen
 * MINDER treffers uit komen, nooit meer. De Staatscourant blijft dus
 * bruikbaar voor een ministerieel besluit en wordt onbruikbaar als
 * anker voor een besluit dat er niet in staat.
 */
export const GEBUNDELDE_BEKENDMAKINGEN: ReadonlySet<string> = new Set([
  "koop-staatscourant-energie",
  "koop-gemeenteblad-vergunningen",
]);

/**
 * Noemt deze tekst het genoemde gezag?
 *
 * Gebruikt EXACT dezelfde patronen als de navertellingsdetectie
 * hierboven (`ANDER_GEZAG`), zodat er één formulering is van de vraag
 * "staat dit gezag in deze tekst". Een tweede set patronen voor
 * dezelfde vraag loopt uiteen; dat is in dit bestand al eerder gemeten.
 *
 * Een onbekende gezagsnaam geeft `false`: wat we niet kunnen aanwijzen,
 * wijzen we niet aan.
 */
export function documentNoemtGezag(gezagNaam: string, tekst: string): boolean {
  const regel = ANDER_GEZAG.find((a) => a.naam === gezagNaam);
  if (regel === undefined) return false;
  return regel.patroon.test(tekst);
}

/* ------------------------------------------------------------------
   UITSLAG
   ------------------------------------------------------------------ */

export type DocumentsoortInvoer = {
  readonly titel: string;
  readonly tekst: string;
  /** De canonieke URL; het pad draagt soms de soort ('/persberichten/'). */
  readonly url?: string;
  /** `uitgeverSoort` uit bronnen/register.ts. */
  readonly uitgeverSoort: string;
  /** De bronsleutel, voor de eigen-gezag-toets. */
  readonly bronSleutel?: string;
  /** Stond er een injectiepatroon in deze versie? Dan is de tekst verdacht. */
  readonly injectieVerdacht?: boolean;
};

export type DocumentsoortUitslag = {
  readonly soort: Documentsoort;
  readonly gezag: Gezag;
  /**
   * De VORM van het stuk, de derde as uit v2.
   *
   * Hij staat in de uitslag en niet alleen in de grondslag, omdat
   * `documentclassificatie.ts` hem naast de soort bewaart. Een audit
   * moet kunnen zien WAAROM een stuk met besluittaal geen besluit werd,
   * en dat is precies dit veld.
   */
  readonly vorm: Documentvorm;
  /**
   * 0,00–1,00. Hoe onzeker de uitslag is. Nul betekent niet "zeker" maar
   * "geen tegenstrijdige signalen"; de waarde is bedoeld om te sorteren,
   * niet om een kans uit te drukken.
   */
  readonly onzekerheid: number;
  /** Welk gezag hier een besluit neemt dat de uitgever navertelt. */
  readonly beschrijftBesluitVan: string | null;
  readonly versie: string;
  readonly grondslag: {
    /** Signalen die vuurden, met de getroffen tekst. */
    readonly signalen: readonly string[];
    /** Waarom het deze soort werd en geen andere. */
    readonly uitleg: string;
    /** Soorten die het gezag van de uitgever niet toestaat. */
    readonly geblokkeerd: readonly string[];
  };
};

/**
 * De ondergrens waaronder er geen zin te verifiëren is.
 *
 * GEMETEN EN NIET GEKOZEN. Eerste versie stond op 120 tekens. Dat liet
 * een korte maar echte bekendmaking vallen — 'De subsidieregeling wordt
 * verlengd met een plafond van 90 MW per 1 juli 2027.' is 76 tekens en
 * levert drie claims op. De verdeling over de 3.483 productiedocumenten
 * op 30 oktober 2026, met per klasse hoeveel er claims opleveren:
 *
 *   bodylengte   documenten   met claims
 *   < 20              1.760            0
 *   20 - 39               2            0
 *   40 - 79              12            0
 *   80 - 119             35            0
 *   >= 120            1.674           26
 *
 * De 1.762 documenten onder 40 tekens zijn sitemap- en catalogusregels:
 * een titel zonder body. Dáár is niets te verifiëren. Boven 40 staat een
 * zin, ook als hij kort is. De grens ligt dus op 40 en niet op 120; de
 * hogere grens sloot 47 documenten uit op een eigenschap die niets met
 * verifieerbaarheid te maken had.
 */
const MIN_TEKST = 40;

function treffers(
  signalen: readonly Signaal[],
  tekst: string,
): { naam: string; reden: string; fragment: string }[] {
  const uit: { naam: string; reden: string; fragment: string }[] = [];
  for (const s of signalen) {
    const m = s.patroon.exec(tekst);
    if (m === null) continue;
    uit.push({ naam: s.naam, reden: s.reden, fragment: m[0].slice(0, 90) });
  }
  return uit;
}

/**
 * Bepaalt de documentsoort.
 *
 * DE ORDE IS HET ONTWERP. Hij loopt van "kan ik dit document
 * vertrouwen" via "wie zegt het" naar "wat is het", en niet andersom:
 *
 *   0 onbruikbaar?            -> ONVOLDOENDE_VERIFIEERBAAR
 *   1 lobby of opinie?        -> altijd verlagen, ook bij bevoegd gezag
 *   2 persbericht?            -> verlagen
 *   3 navertelling?           -> SECUNDAIRE_BERICHTGEVING
 *   4 besluit of regelgeving? -> alleen als het gezag dat mag
 *   5 onderzoek, analyse      -> naar de inhoud
 *   6 anders                  -> FEITELIJKE_MEDEDELING binnen het gezag
 *
 * Stap 1 vóór stap 4 is geen detail. Een ministerie dat een opiniestuk
 * publiceert hoort geen besluitstatus te krijgen omdat de uitgever
 * bevoegd is; de inhoud beslist naar beneden, het gezag naar boven.
 */
export function bepaalDocumentsoort(inv: DocumentsoortInvoer): DocumentsoortUitslag {
  const gezag = gezagVan(inv.uitgeverSoort);
  const volledig = `${inv.titel}\n${inv.tekst}`;
  const signalen: string[] = [];
  const geblokkeerd: string[] = [];

  /* De vorm wordt ALTIJD bepaald, ook als hij de uitslag niet raakt.
     Dat is bewust: hij komt in de uitslag terecht en dus in de
     database, zodat een latere herbeoordeling niet opnieuw hoeft te
     raden waarom een stuk niet mocht vaststellen. */
  const vorm: DocumentvormUitslag = bepaalDocumentvorm({
    titel: inv.titel,
    tekst: inv.tekst,
    ...(inv.url === undefined ? {} : { url: inv.url }),
  });

  const mag = (s: Documentsoort): boolean =>
    !ALLEEN_BEVOEGD_GEZAG.includes(s) || gezag === "BEVOEGD_GEZAG";

  const uitslag = (
    soort: Documentsoort,
    uitleg: string,
    onzekerheid: number,
    beschrijftBesluitVan: string | null = null,
  ): DocumentsoortUitslag => {
    /* DE EINDCONTROLE. De signaallogica kan hier per constructie niet
       komen, maar deze regel staat er zodat een latere wijziging de
       veiligheidsregel niet stil kan omzeilen. */
    if (!mag(soort)) {
      geblokkeerd.push(
        `${soort} is niet bereikbaar voor gezag ${gezag}; alleen BEVOEGD_GEZAG kan dit uitvaardigen`,
      );
      return {
        soort: "SECUNDAIRE_BERICHTGEVING",
        gezag,
        vorm: vorm.vorm,
        onzekerheid: Math.max(onzekerheid, 0.4),
        beschrijftBesluitVan,
        versie: DOCUMENTSOORT_VERSIE,
        grondslag: {
          signalen,
          uitleg:
            `${uitleg} — maar de uitgever heeft gezag ${gezag} en kan geen ${soort} uitvaardigen, ` +
            "dus dit is een navertelling",
          geblokkeerd,
        },
      };
    }
    return {
      soort,
      gezag,
      vorm: vorm.vorm,
      onzekerheid,
      beschrijftBesluitVan,
      versie: DOCUMENTSOORT_VERSIE,
      grondslag: { signalen, uitleg, geblokkeerd },
    };
  };

  /* ---------- 0 · is er iets te classificeren ---------- */
  if (inv.injectieVerdacht === true) {
    signalen.push("injectie_verdacht: de versie draagt een injectiepatroon");
    return uitslag(
      "ONVOLDOENDE_VERIFIEERBAAR",
      "de brontekst is als injectieverdacht gemarkeerd; de inhoud is geen betrouwbare basis",
      0.0,
    );
  }
  if (inv.tekst.trim().length < MIN_TEKST) {
    signalen.push(`tekstlengte ${inv.tekst.trim().length} < ${MIN_TEKST}`);
    return uitslag(
      "ONVOLDOENDE_VERIFIEERBAAR",
      `de tekst is te kort (${inv.tekst.trim().length} tekens) om een soort uit te lezen`,
      0.0,
    );
  }

  /* ---------- 1 · lobby en opinie verlagen altijd ---------- */
  const lobby = treffers(LOBBY, volledig);
  const opinie = treffers(OPINIE, volledig);
  for (const t of [...lobby, ...opinie]) {
    signalen.push(`${t.naam}: ${t.reden} — "${t.fragment}"`);
  }
  if (lobby.length > 0) {
    return uitslag(
      "LOBBYDOCUMENT",
      `${lobby.length} lobbysignaal(en); de tekst vraagt om iets in plaats van iets vast te stellen`,
      opinie.length > 0 ? 0.1 : 0.2,
    );
  }
  if (opinie.length > 0) {
    return uitslag(
      "OPINIE",
      `${opinie.length} opiniesignaal(en); de tekst geeft een standpunt`,
      0.2,
    );
  }

  /* ---------- 2 · persbericht ----------

     DIT LEEST NU DE VORM-AS en heeft geen eigen patronen meer. Er
     stonden twee identieke sets voor dezelfde vraag — één hier, één in
     documentvorm.ts — en dit bestand waarschuwt zelf al dat zulke
     tweelingen uiteenlopen (zie documentNoemtGezag). Eén formulering,
     één plek om te wijzigen. */
  if (vorm.vorm === "PERSBERICHT") {
    for (const m of vorm.markeringen) signalen.push(`vorm/${m}`);
    return uitslag(
      "PERSBERICHT",
      "de tekst of de URL merkt dit aan als persbericht; eigen communicatie, geen vaststelling",
      0.25,
    );
  }

  /* ---------- 3 · vertelt dit een besluit van een ander na ---------- */
  const eigen = EIGEN_GEZAG_NAMEN[inv.bronSleutel ?? ""] ?? [];
  const anderen = ANDER_GEZAG.filter(
    (a) => a.patroon.test(volledig) && !eigen.includes(a.naam),
  );
  const besluit = treffers(BESLUIT, volledig);
  const regel = treffers(REGELGEVING, volledig);

  /* EEN BESLUIT **OVER** EEN PARTIJ IS GEEN BESLUIT **VAN** DIE PARTIJ.
     Gevonden door te labelen, en het raakt juist de documenten waar dit
     platform om begonnen is:

       "Geschilbesluit Kallista Tethys - TenneT
        De ACM oordeelt dat TenneT in lijn met de geldende wet- en
        regelgeving heeft gehandeld ..."

     ANDER_GEZAG ziet 'TenneT' en concludeert: een ander gezag handelt
     hier, dus dit is een navertelling. Maar TenneT besluit hier niets —
     TenneT is de partij WAAROVER de ACM beslist. Het stuk werd daardoor
     SECUNDAIRE_BERICHTGEVING met plafond 2, en
     `beschrijftBesluitVan` kwam op 'TenneT' te staan. Dat is niet
     alleen te streng, het is onwaar, en het zou bronverificatie.ts bij
     TenneT naar een origineel laten zoeken dat daar niet bestaat.

     De uitzondering is smal en eist alle vier tegelijk:
       · de uitgever is BEVOEGD_GEZAG;
       · het stuk NOEMT zijn eigen gezag als handelende partij;
       · de vorm is een bekendmaking, dus aantoonbaar authentiek;
       · er is een besluit- of regelsignaal.

     Hij is niet te misbruiken door wie de brontekst beheerst: de eerste
     voorwaarde gaat over de uitgever en niet over de tekst. Een
     branchevereniging die ACM-besluittaal citeert heeft geen eigen
     gezagsnaam in EIGEN_GEZAG_NAMEN, blijft dus een navertelling, en
     loopt daarnaast tegen de eindcontrole van mag() aan. */
  const eigenHandelt =
    gezag === "BEVOEGD_GEZAG" &&
    vormKanVaststellen(vorm.vorm) &&
    eigen.some((n) => documentNoemtGezag(n, volledig));

  if (anderen.length > 0 && (besluit.length > 0 || regel.length > 0) && !eigenHandelt) {
    const naam = anderen[0]!.naam;
    signalen.push(`ander gezag: '${naam}' handelt in deze tekst en is niet de uitgever`);
    for (const t of [...besluit, ...regel]) {
      signalen.push(`${t.naam}: ${t.reden} — "${t.fragment}"`);
    }
    return uitslag(
      "SECUNDAIRE_BERICHTGEVING",
      `de tekst beschrijft een besluit van ${naam}; de uitgever is daar niet de bron van`,
      0.15,
      naam,
    );
  }

  /* ---------- 3b · een ontwerp stelt niets vast ----------

     DIT GAT VOND IK DOOR TE LABELEN, en niet door te bedenken. De
     vormcontrole in stap 4 vuurt alleen als er een besluit- of
     regelsignaal is. Een consultatiestuk zonder zo'n signaal viel er
     dus langs en kwam in stap 6 uit als FEITELIJKE_MEDEDELING: plafond
     4, en mag zichzelf bevestigen. Een ontwerpbesluit dat zijn eigen
     voorgenomen bedragen noemt was daarmee even sterk bewijs als een
     vastgestelde regeling.

     NA DE NAVERTELLINGSCONTROLE, met opzet. Vertelt het stuk het
     ontwerp van een ANDER gezag na, dan is dat het belangrijkere feit:
     `beschrijftBesluitVan` moet gevuld blijven, want bronverificatie.ts
     heeft die naam nodig om het origineel te zoeken. */
  if (vorm.vorm === "ONTWERP") {
    signalen.push(`documentvorm: ONTWERP — ${vorm.uitleg}`);
    for (const m of vorm.markeringen) signalen.push(`vorm/${m}`);
    return uitslag(
      "ONTWERPBESLUIT",
      "het stuk is een ontwerp of consultatieversie; er is nog niets vastgesteld",
      0.2,
    );
  }

  /* ---------- 4 · eigen besluit of eigen regelgeving ----------

     HIER ZIT DE CORRECTIE VAN V2. Vaststellen vraagt drie dingen die
     ALLE DRIE moeten gelden, en v1 toetste er twee:

       uitgever   het gezag moet het kunnen uitvaardigen  (v1: ja)
       inhoud     de tekst moet een besluit of regel dragen (v1: ja)
       vorm       het stuk moet het AUTHENTIEKE stuk zijn   (v1: NEE)

     Zonder de derde werd een nieuwsbericht over een wetswijziging de
     wetswijziging zelf. Zie documentvorm.ts voor de gemeten pagina.

     DE VORM IS EEN EXTRA EIS, GEEN VERVANGING. Voor een uitgever zonder
     bevoegdheid verandert er niets: die liep in v1 al tegen de
     eindcontrole van mag() aan en wordt SECUNDAIRE_BERICHTGEVING. De
     nieuwe aftakking geldt alleen bij BEVOEGD_GEZAG, want daar — en
     alleen daar — zat het gat. */
  if (regel.length > 0 || besluit.length > 0) {
    const beoogd: Documentsoort =
      regel.length > 0 ? "OFFICIELE_REGELGEVING" : "OFFICIEEL_BESLUIT";
    for (const t of [...regel, ...besluit]) {
      signalen.push(`${t.naam}: ${t.reden} — "${t.fragment}"`);
    }

    /* ONTWERP komt hier niet meer langs; stap 3b heeft die al
       afgevangen, ook zonder besluitsignaal. Wat hier overblijft is
       NIEUWSBERICHT en ARTIKEL: een stuk dat besluittaal draagt maar
       niet aantoonbaar het authentieke stuk is. */
    if (gezag === "BEVOEGD_GEZAG" && !vormKanVaststellen(vorm.vorm)) {
      signalen.push(`documentvorm: ${vorm.vorm} — ${vorm.uitleg}`);
      for (const m of vorm.markeringen) signalen.push(`vorm/${m}`);
      return uitslag(
        "NIEUWSBERICHT_REGELGEVING",
        `het bevoegde gezag bericht over een eigen regel of besluit, maar de vorm is ` +
          `${vorm.vorm} en niet het authentieke stuk; geen ${beoogd}`,
        0.2,
      );
    }

    if (gezag === "BEVOEGD_GEZAG") {
      signalen.push(`documentvorm: BEKENDMAKING — ${vorm.uitleg}`);
      for (const m of vorm.markeringen) signalen.push(`vorm/${m}`);
    }
    return uitslag(
      beoogd === "OFFICIELE_REGELGEVING"
        ? "OFFICIELE_REGELGEVING"
        : "OFFICIEEL_BESLUIT",
      beoogd === "OFFICIELE_REGELGEVING"
        ? "de tekst stelt regelgeving of beleid vast, de uitgever is daartoe bevoegd en het stuk draagt de vorm van een bekendmaking"
        : "de tekst draagt een besluit, de uitgever is daartoe bevoegd en het stuk draagt de vorm van een bekendmaking",
      0.1,
    );
  }

  /* ---------- 5 · onderzoek en sectoranalyse ---------- */
  const onderzoek = treffers(ONDERZOEK, volledig);
  const methode = onderzoek.some((t) => t.naam === "methode");
  if (methode) {
    for (const t of onderzoek) signalen.push(`${t.naam}: ${t.reden} — "${t.fragment}"`);
    return uitslag(
      "ONDERZOEKSRAPPORT",
      "de tekst beschrijft een controleerbare methode bij zijn cijfers",
      0.2,
    );
  }
  const analyse = treffers(SECTORANALYSE, volledig);
  if (analyse.length > 0 || onderzoek.length > 0) {
    for (const t of [...analyse, ...onderzoek]) {
      signalen.push(`${t.naam}: ${t.reden} — "${t.fragment}"`);
    }
    return uitslag(
      "SECTORANALYSE",
      "de tekst geeft een sectorbreed beeld zonder verantwoording van de methode",
      0.3,
    );
  }

  /* ---------- 6 · anders: een mededeling binnen het eigen gezag ---------- */
  if (anderen.length > 0) {
    const naam = anderen[0]!.naam;
    signalen.push(`ander gezag: '${naam}' komt voor in de tekst, zonder besluitvorm`);
    return uitslag(
      "SECUNDAIRE_BERICHTGEVING",
      `de tekst gaat over ${naam} zonder zelf iets vast te stellen`,
      0.35,
      naam,
    );
  }
  signalen.push("geen soortspecifiek signaal gevonden");
  return uitslag(
    "FEITELIJKE_MEDEDELING",
    "geen lobby-, opinie-, besluit- of onderzoekssignaal; een mededeling binnen het eigen gezag",
    0.4,
  );
}

/* ==================================================================
   BEWIJSKRACHT — gezag MAAL documentsoort, niet gezag alleen
   ------------------------------------------------------------------
   Dit is de tabel die het gemeten defect repareert. De oude regel stond
   in uitspraken.ts en kende alleen de kolom `betrouwbaarheid`; hier is
   de documentsoort de tweede as.

   De waarden zijn PLAFONDS. De bestaande betrouwbaarheid van de bron
   blijft gelden; deze tabel kan hem alleen verlagen. Dat is bewust: een
   uitgever die om een andere reden op 3 staat, hoort niet door een
   mooie documentsoort op 5 te komen.
   ================================================================== */

const PLAFOND: Readonly<Record<Documentsoort, Readonly<Partial<Record<Gezag, number>>>>> = {
  /* Een besluit van het bevoegde gezag is het sterkste dat er is. */
  OFFICIEEL_BESLUIT: { BEVOEGD_GEZAG: 5 },
  OFFICIELE_REGELGEVING: { BEVOEGD_GEZAG: 5 },
  /* Een mededeling binnen het eigen domein: sterk, maar geen besluit. */
  FEITELIJKE_MEDEDELING: {
    BEVOEGD_GEZAG: 4,
    NETBEHEERDER: 4,
    STATISTIEK: 5,
    BELANGENBEHARTIGER: 3,
    MARKT: 2,
  },
  /* Met verantwoording van de methode is een rapport navolgbaar. */
  ONDERZOEKSRAPPORT: {
    BEVOEGD_GEZAG: 4,
    NETBEHEERDER: 4,
    STATISTIEK: 5,
    BELANGENBEHARTIGER: 3,
    MARKT: 3,
  },
  /* Zonder methode blijft het een beeld. */
  SECTORANALYSE: {
    BEVOEGD_GEZAG: 3,
    NETBEHEERDER: 3,
    STATISTIEK: 3,
    BELANGENBEHARTIGER: 2,
    MARKT: 2,
  },
  /* HET BERICHT OVER DE REGEL, NIET DE REGEL.
     Drie en niet vier, en dat getal doet het werk: `magZelfBevestigen`
     eist minstens 4, dus een nieuwsbericht over een eigen wetswijziging
     kan géén claim op 'bevestigd' zetten. Het blijft bruikbaar als
     nieuwssignaal en als aanleiding, maar de claim eronder moet het
     authentieke stuk vinden via bronverificatie.ts.

     De waarden onder BEVOEGD_GEZAG zijn gelijk aan die van
     SECUNDAIRE_BERICHTGEVING. Dat is geen slordigheid: die soorten zijn
     daar onbereikbaar (stap 4 takt alleen af bij BEVOEGD_GEZAG), en
     mocht een latere wijziging ze toch bereikbaar maken, dan is het
     plafond niet hoger dan wat v1 daar gaf. Geen versoepeling langs een
     achterdeur. */
  NIEUWSBERICHT_REGELGEVING: {
    BEVOEGD_GEZAG: 3,
    NETBEHEERDER: 2,
    STATISTIEK: 2,
    BELANGENBEHARTIGER: 2,
    MARKT: 1,
  },
  /* Een ontwerp stelt niets vast, van wie het ook komt. Twee en niet
     drie, want een ontwerp is zwakker bewijs dan een bericht over een
     stuk dat al geldt. */
  ONTWERPBESLUIT: {
    BEVOEGD_GEZAG: 2,
    NETBEHEERDER: 1,
    STATISTIEK: 1,
    BELANGENBEHARTIGER: 1,
    MARKT: 1,
  },
  /* Eigen communicatie over eigen handelen. */
  PERSBERICHT: {
    BEVOEGD_GEZAG: 3,
    NETBEHEERDER: 3,
    STATISTIEK: 3,
    BELANGENBEHARTIGER: 2,
    MARKT: 2,
  },
  /* Navertellen levert geen eigen bewijs; het origineel wel. */
  SECUNDAIRE_BERICHTGEVING: {
    BEVOEGD_GEZAG: 2,
    NETBEHEERDER: 2,
    STATISTIEK: 2,
    BELANGENBEHARTIGER: 2,
    MARKT: 1,
  },
  /* Een mening is geen bewijs, van wie hij ook komt. */
  OPINIE: {
    BEVOEGD_GEZAG: 1,
    NETBEHEERDER: 1,
    STATISTIEK: 1,
    BELANGENBEHARTIGER: 1,
    MARKT: 1,
  },
  LOBBYDOCUMENT: {
    BEVOEGD_GEZAG: 1,
    NETBEHEERDER: 1,
    STATISTIEK: 1,
    BELANGENBEHARTIGER: 1,
    MARKT: 1,
  },
  ONVOLDOENDE_VERIFIEERBAAR: {
    BEVOEGD_GEZAG: 1,
    NETBEHEERDER: 1,
    STATISTIEK: 1,
    BELANGENBEHARTIGER: 1,
    MARKT: 1,
  },
};

/**
 * Het plafond voor `uitspraken.bewijs_kwaliteit` bij deze combinatie.
 *
 * Een combinatie die niet in de tabel staat — bijvoorbeeld
 * OFFICIEEL_BESLUIT bij een branchevereniging — kan niet voorkomen,
 * want `bepaalDocumentsoort()` levert die soort daar niet. Mocht hij
 * ooit toch langskomen, dan is 1 het antwoord: niets aannemen.
 */
export function bewijskrachtPlafond(soort: Documentsoort, gezag: Gezag): number {
  return PLAFOND[soort][gezag] ?? 1;
}

/**
 * De soorten die zelf niets vaststellen.
 *
 * Staat hier en niet in documentclassificatie.ts omdat deze module puur
 * is: `nieuwsselectie.ts` mag hem lezen zonder het bronregister en de
 * databaselaag mee te importeren.
 */
export const NIET_DRAGENDE_DOCUMENTSOORTEN: readonly string[] = [
  "OPINIE",
  "LOBBYDOCUMENT",
  /* ERBIJ IN V2. Een ontwerp stelt niets vast; een gepubliceerde
     kernclaim mag er dus niet op rusten. */
  "ONTWERPBESLUIT",
  "SECUNDAIRE_BERICHTGEVING",
  "ONVOLDOENDE_VERIFIEERBAAR",
];

/* WAAROM NIEUWSBERICHT_REGELGEVING HIER NIET STAAT, en waarom dat geen
   versoepeling is.

   De verleiding is om hem er bij te zetten: het stuk is immers niet het
   authentieke besluit. Maar deze lijst beantwoordt een andere vraag dan
   "mag dit zelf bevestigen". Hij bepaalt of een BEVESTIGDE claim een
   gepubliceerd artikel mag dragen, en bevestigd worden kan deze soort
   langs precies één weg: `bronverificatie.ts` vindt het authentieke
   stuk bij het bevoegde gezag, met hetzelfde getal, dezelfde eenheid,
   hetzelfde onderwerp en modaliteit VASTGESTELD.

   Komt een claim zo ver, dan IS er een vaststellend origineel gezien en
   is er geen reden hem alsnog te weigeren. Zou deze soort hier wel
   staan, dan werd die hele weg onbruikbaar en bleef de aankondiging van
   een energieregel permanent onpubliceerbaar — terwijl dat juist het
   signaal is waar dit platform voor bestaat.

   De poort die het gat dicht is het plafond 3, niet deze lijst:
   `magZelfBevestigen` eist 4. Zelfbevestiging is dus uitgesloten, en
   dat is wat de eis vraagt. */

/**
 * Mag dit document op eigen kracht een claim op 'bevestigd' zetten?
 *
 * De oude regel was `isPrimaireBron && betrouwbaarheid >= 4`. Die liet
 * een lobbydocument van Netbeheer Nederland 45 claims bevestigen. Nu
 * moet de SOORT het ook toestaan: alleen een vaststelling of een
 * mededeling binnen het eigen gezag bevestigt zichzelf. Navertellen,
 * opiniëren en lobbyen niet.
 */
export function magZelfBevestigen(soort: Documentsoort, gezag: Gezag): boolean {
  if (bewijskrachtPlafond(soort, gezag) < 4) return false;
  return (
    soort === "OFFICIEEL_BESLUIT" ||
    soort === "OFFICIELE_REGELGEVING" ||
    soort === "FEITELIJKE_MEDEDELING" ||
    soort === "ONDERZOEKSRAPPORT"
  );
}
