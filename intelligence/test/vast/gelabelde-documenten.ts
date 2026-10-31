/* ============================================================
   GELABELDE DOCUMENTEN — de onafhankelijke proef op v2
   ------------------------------------------------------------
   WAAROM DIT BESTAAND NODIG IS. Wie zijn eigen patronen schrijft én
   zijn eigen toetsen bedenkt, meet uiteindelijk of zijn patronen doen
   wat hij bedacht. Dat is geen dekking maar een echo. De eis luidt
   daarom: onafhankelijk vooraf gelabelde voorbeelden, zodat de regels
   niet op de bekende gevallen worden afgestemd.

   HOE DE ONAFHANKELIJKHEID HIER IS GEREGELD, precies en zonder meer
   claim dan waar:

     · Alle 23 documenten hieronder zijn ECHTE pagina's, op
       31 oktober 2026 live opgehaald van rijksoverheid.nl en acm.nl in
       de ronde VOORDAT v2 bestond. Ze zijn niet verzonnen om een
       patroon te laten slagen en niet gekozen op uitkomst: het zijn
       alle items die de twee feeds op dat moment gaven.
     · De labels zijn met de hand gezet op grond van de VORM van het
       stuk — wat zegt dit document dat het is — en niet op grond van
       wat de motor ervan vindt.
     · Twee documenten (13 en 15) zijn bij het ONTWERP van v2 gebruikt;
       die staan gemarkeerd met `gebruiktBijOntwerp: true`. De overige
       21 vormen de ACHTERGEHOUDEN set. Een toets meet het percentage
       overeenstemming daarop apart, want alleen dat getal zegt iets
       over een document dat de motor nooit heeft gezien.

   WAT DE EERSTE METING OPLEVERDE, en waarom dat getal in het rapport
   hoort en niet alleen het eindgetal:

       eerste ronde, patronen zoals ONTWORPEN:
         vorm   23/23        achtergehouden 21/21
         soort  17/23        achtergehouden 15/21

   De labelset vond dus ZES defecten die mijn eigen toetsen niet vonden.
   Vier ervan waren domme patroonfouten — `heeft\\s+besloten` matcht niet
   op "Dat heeft de ACM op 26 oktober 2026 besloten", `mog(en|t)` matcht
   niet op "mag", en een tekenafstand van 40 viel vier tekens te kort.
   De vijfde was fundamenteel: een geschilbesluit OVER TenneT werd
   gelezen als een besluit VAN TenneT.

       tweede ronde, na reparatie:
         vorm   23/23        soort 23/23

   DAT TWEEDE GETAL IS GEEN ONAFHANKELIJKE METING MEER. Ik heb de
   patronen aangepast nadat ik wist waar ze faalden, en daarmee is de
   achtergehouden set voor die ronde niet meer achtergehouden. Het
   eerlijke cijfer over onbekende documenten is 15/21; wat de tweede
   ronde laat zien is dat de gevonden defecten verholpen zijn, niet dat
   de motor op nieuwe documenten 100% haalt.

   Dit bestand blijft daarom staan als REGRESSIEVANGNET: het houdt vast
   wat er na de reparatie uit kwam, zodat een latere wijziging aan de
   patronen zichtbaar rood wordt. Voor een nieuwe onafhankelijke meting
   is een nieuwe labelronde nodig op documenten van ná vandaag.

   DE TEKSTEN ZIJN INGEKORT tot wat de vorm en de soort bepaalt,
   letterlijk uit de opgehaalde pagina geknipt. De volledige teksten
   staan niet in de repo, want ze zijn van de uitgever; wat hier staat
   is het citaat dat de classificatie draagt.
   ============================================================ */

import type { Documentsoort } from "../../src/pijplijn/documentsoort.ts";
import type { Documentvorm } from "../../src/pijplijn/documentvorm.ts";

export type GelabeldDocument = {
  readonly nr: number;
  readonly bronSleutel: string;
  readonly uitgeverSoort: string;
  readonly titel: string;
  readonly url: string;
  readonly tekst: string;
  /** Mijn handmatige label: welke VORM heeft dit stuk. */
  readonly vorm: Documentvorm;
  /** Mijn handmatige label: welke SOORT is dit stuk. */
  readonly soort: Documentsoort;
  /** Waarom dit label; één regel, zodat een tweede lezer kan nakijken. */
  readonly waarom: string;
  /** Is dit document gebruikt bij het ontwerpen van de v2-patronen? */
  readonly gebruiktBijOntwerp?: boolean;
  /**
   * Een gemeten verschil tussen mijn label en de motor, met de reden.
   * Staat hier zodat het verschil zichtbaar blijft in plaats van
   * verdwijnt in een bijgesteld label.
   */
  readonly afwijking?: string;
};

export const GELABELDE_DOCUMENTEN: readonly GelabeldDocument[] = [
  /* ---------- rijksoverheid.nl — alle dertien zijn nieuwsberichten ----------
     Elk van deze pagina's begint met de letterlijke regel
     "Nieuwsbericht <datum> | <tijd>" en staat onder /actueel/nieuws/.
     Dat zijn twee onafhankelijke vormmarkeringen van de uitgever zelf. */
  {
    nr: 1,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
    titel: "Benoeming nieuwe voorzitter WRR",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/30/benoeming-nieuwe-voorzitter-wrr",
    tekst:
      "Nieuwsbericht 30-10-2026 | 16:30 De ministerraad heeft op voorstel van de " +
      "minister-president ingestemd met de benoeming van prof. dr. Dirk Schoenmaker tot " +
      "voorzitter van de Wetenschappelijke Raad voor het Regeringsbeleid (WRR).",
    vorm: "NIEUWSBERICHT",
    soort: "FEITELIJKE_MEDEDELING",
    waarom:
      "zelfbenoemd nieuwsbericht; meldt een eigen benoeming zonder besluit- of regelvorm",
  },
  {
    nr: 2,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
    titel: "Interim-voorzitter Milo Schoenmaker voorgedragen als voorzitter ACVG",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/30/interim-voorzitter-milo-schoenmaker-voorgedragen-als-voorzitter-acvg",
    tekst:
      "Nieuwsbericht 30-10-2026 | 16:30 De ministerraad heeft ingestemd met de voordracht " +
      "van Milo Schoenmaker als voorzitter van het Adviescollege Veiligheid Groningen (ACVG). " +
      "Schoenmaker is sinds maart 2026 interim-voorzitter van het college.",
    vorm: "NIEUWSBERICHT",
    soort: "FEITELIJKE_MEDEDELING",
    waarom: "zelfbenoemd nieuwsbericht; een voordracht is nog geen besluitbekendmaking",
  },
  {
    nr: 3,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
    titel: "Benoeming bij Gemeenschappelijk Hof van Justitie",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/30/benoeming-bij-gemeenschappelijk-hof-van-justitie",
    tekst:
      "Nieuwsbericht 30-10-2026 | 16:30 Bij het Gemeenschappelijk Hof van Justitie wordt " +
      "mr. L.N. (Lee-Ann Nathalie) Geerman benoemd tot lid, met als standplaats Curacao. " +
      "De Rijksministerraad heeft daarmee ingestemd op voorstel van staatssecretaris Van Bruggen.",
    vorm: "NIEUWSBERICHT",
    soort: "FEITELIJKE_MEDEDELING",
    waarom: "zelfbenoemd nieuwsbericht over een eigen benoeming",
  },
  {
    nr: 4,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
    titel: "Kabinet steunt EU Kids Act, maar uit zorgen over privacy en grondrechten",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/30/kabinet-steunt-eu-kids-act-maar-uit-zorgen-over-privacy-en-grondrechten",
    tekst:
      "Nieuwsbericht 30-10-2026 | 16:30 Het kabinet is positief over het wetsvoorstel van " +
      "de Europese Commissie om kinderen beter te beschermen tegen online risico's. De EU " +
      "Kids Act moet digitale diensten, zoals sociale media, online games en AI-chatbots, " +
      "veiliger maken.",
    vorm: "NIEUWSBERICHT",
    soort: "SECUNDAIRE_BERICHTGEVING",
    waarom:
      "nieuwsbericht over een voorstel van de Europese Commissie; dat is een ANDER gezag " +
      "dan de uitgever, dus een navertelling",
  },
  {
    nr: 5,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
    titel: "Benoemingen bij Gemeenschappelijk Hof van Justitie",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/30/benoemingen-bij-gemeenschappelijk-hof-van-justitie",
    tekst:
      "Nieuwsbericht 30-10-2026 | 16:30 Mr. Y (Yvonne) Sneevliet wordt benoemd tot " +
      "plaatsvervangend lid van het Gemeenschappelijk Hof van Justitie. De Rijksministerraad " +
      "heeft op voorstel van staatssecretaris Van Bruggen van Justitie en Veiligheid " +
      "ingestemd met de voordracht.",
    vorm: "NIEUWSBERICHT",
    soort: "FEITELIJKE_MEDEDELING",
    waarom: "zelfbenoemd nieuwsbericht over een eigen benoeming",
  },
  {
    nr: 6,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
    titel: "Kabinet wil vliegende start voor jonge kinderen",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/30/kabinet-wil-vliegende-start-voor-jonge-kinderen",
    tekst:
      "Nieuwsbericht 30-10-2026 | 16:30 Het kabinet wil dat organisaties en ministeries die " +
      "betrokken zijn bij het opgroeien van jonge kinderen meer en beter gaan samenwerken. " +
      "Met elkaar en met de ouders.",
    vorm: "NIEUWSBERICHT",
    soort: "FEITELIJKE_MEDEDELING",
    waarom:
      "zelfbenoemd nieuwsbericht; 'wil dat' is een voornemen, maar het stuk stelt niets " +
      "vast en draagt geen lobby- of opiniesignaal",
  },
  {
    nr: 7,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
    titel: "Tweede Loe de Jong-lezing door Rosita Steenbeek",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/30/tweede-loe-de-jong-lezing-door-rosita-steenbeek",
    tekst:
      "Nieuwsbericht 30-10-2026 | 11:00 Op 31 maart 2027 zal Rosita Steenbeek de tweede " +
      "Loe de Jong-lezing uitspreken. Deze lezing vindt jaarlijks plaats als sluitstuk van " +
      "de Werkconferentie Holocausteducatie.",
    vorm: "NIEUWSBERICHT",
    soort: "FEITELIJKE_MEDEDELING",
    waarom: "zelfbenoemd nieuwsbericht; een aankondiging van een lezing",
  },
  {
    nr: 8,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
    titel: "Minister-president Jetten ontvangt president Milatovic van Montenegro",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/30/minister-president-jetten-ontvangt-president-milatovic-van-montenegro",
    tekst: "",
    vorm: "NIEUWSBERICHT",
    soort: "ONVOLDOENDE_VERIFIEERBAAR",
    waarom:
      "de pagina leverde geen hoofdtekst; het URL-pad geeft de vorm, maar er is niets te " +
      "classificeren",
  },
  {
    nr: 9,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
    titel: "Inzet uitzendkrachten wordt begrensd in tijd",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/29/inzet-uitzendkrachten-wordt-begrensd-in-tijd",
    tekst:
      "Nieuwsbericht 29-10-2026 | 16:00 Een uitzendkracht mag straks nog maximaal 3 jaar " +
      "(36 maanden) bij dezelfde inlener werken. Dit staat in het wetsvoorstel dat vandaag " +
      "in internetconsultatie gaat.",
    vorm: "NIEUWSBERICHT",
    soort: "FEITELIJKE_MEDEDELING",
    waarom:
      "zelfbenoemd nieuwsbericht OVER een wetsvoorstel in consultatie; het stuk is zelf " +
      "geen ontwerp. Dat 'mag straks' nog niet geldt is een MODALITEITSvraag en hoort bij " +
      "claimmodaliteit.ts, niet bij de documentsoort",
  },
  {
    nr: 10,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
    titel: "Nederland voldoet aan IEA-actie vrijgave deel olievoorraad",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/29/nederland-voldoet-aan-iea-actie-vrijgave-deel-olievoorraad",
    tekst:
      "Nieuwsbericht 29-10-2026 | 15:45 Het kabinet heeft in maart toegezegd zo'n 16% van " +
      "de strategische olievoorraad vrij te geven, als onderdeel van de collectieve actie " +
      "met 31 landen die zijn aangesloten bij het Internationaal Energieagentschap (IEA).",
    vorm: "NIEUWSBERICHT",
    soort: "FEITELIJKE_MEDEDELING",
    waarom:
      "zelfbenoemd nieuwsbericht over eigen handelen; 'heeft in maart toegezegd' noemt geen " +
      "besluitdatum met dag en jaar en is dus geen besluitbekendmaking",
  },
  {
    nr: 11,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
    titel: "Secretaris-generaal Van den Dungen verlaat Financien",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/29/secretaris-generaal-van-den-dungen-verlaat-financien",
    tekst:
      "Nieuwsbericht 29-10-2026 | 15:00 Secretaris-generaal B.E. (Bas) van den Dungen heeft " +
      "bekendgemaakt dat hij uiterlijk per 1 februari 2027 het ministerie van Financien zal " +
      "verlaten. Zijn termijn van 7 jaar zit er dan op.",
    vorm: "NIEUWSBERICHT",
    soort: "FEITELIJKE_MEDEDELING",
    waarom: "zelfbenoemd nieuwsbericht; een personele mededeling binnen het eigen domein",
  },
  {
    nr: 12,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
    titel: "Doorlooptijden geneesmiddelen vindbaar in vernieuwd dashboard",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/29/doorlooptijden-geneesmiddelen-vindbaar-in-vernieuwd-dashboard",
    tekst:
      "Nieuwsbericht 29-10-2026 | 14:15 Het Dashboard Doorlooptijden Geneesmiddelen is " +
      "vernieuwd. Voor deze vernieuwing hebben patienten, apothekers, voorschrijvers en " +
      "geneesmiddelenfabrikanten hun ervaringen en wensen ingebracht.",
    vorm: "NIEUWSBERICHT",
    soort: "FEITELIJKE_MEDEDELING",
    waarom: "zelfbenoemd nieuwsbericht over een eigen instrument",
  },
  {
    nr: 13,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
    titel: "Nieuwe regels voor toeristische verhuur vanaf 1 november 2026",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/29/nieuwe-regels-voor-toeristische-verhuur-vanaf-1-november-2026",
    tekst:
      "Nieuwsbericht 29-10-2026 | 10:14 Vanaf 1 november 2026 treedt de wijziging van de " +
      "Wet toeristische verhuur in werking. De wetswijziging geeft gemeenten meer inzicht " +
      "en mogelijkheden om op toeristische verhuur te sturen.",
    vorm: "NIEUWSBERICHT",
    soort: "NIEUWSBERICHT_REGELGEVING",
    waarom:
      "HET GEMETEN DEFECT. Zelfbenoemd nieuwsbericht met regelgevingstaal ('treedt in " +
      "werking', 'wijziging van de Wet'). V1 maakte hier OFFICIELE_REGELGEVING van met " +
      "plafond 5 en zelfbevestiging; het stuk IS de regeling niet",
    gebruiktBijOntwerp: true,
  },

  /* ---------- acm.nl — besluiten van een toezichthouder ----------
     Deze tien staan onder /nl/publicaties/ en dragen hun vorm in de
     naam ('geschilbesluit', 'Woo-besluit', 'Besluit <onderwerp>') of in
     de besluitnotitie ('Dat heeft de ACM op <datum> besloten'). */
  {
    nr: 14,
    bronSleutel: "acm-besluiten",
    uitgeverSoort: "toezichthouder",
    titel: "Besluit databemiddelingsdienst onder de Data Governance Act Stichting digiGO",
    url: "https://www.acm.nl/nl/publicaties/besluit-databemiddelingsdienst-onder-de-data-governance-act-stichting-digigo",
    tekst:
      "De Autoriteit Consument & Markt (ACM) heeft de registratie van Stichting digiGO als " +
      "databemiddelingsdienst goedgekeurd onder de Europese Data Governance Act (DGA).",
    vorm: "BEKENDMAKING",
    soort: "OFFICIEEL_BESLUIT",
    waarom:
      "de kop is 'Besluit <onderwerp>', de uitgever is de toezichthouder zelf en de tekst " +
      "spreekt het dictum uit ('heeft de registratie goedgekeurd')",
  },
  {
    nr: 15,
    bronSleutel: "acm-besluiten",
    uitgeverSoort: "toezichthouder",
    titel: "Geschilbesluit Jumbo - Liander over congestierapport",
    url: "https://www.acm.nl/nl/publicaties/geschilbesluit-jumbo-liander-over-congestierapport",
    tekst:
      "De ACM concludeert dat de klacht van Jumbo gegrond is. Het congestierapport van " +
      "Liander is niet in overeenstemming met de eisen van de Netcode. Jumbo stelt dat de " +
      "gronden die Liander in het rapport heeft opgenomen om geen congestiemanagement toe " +
      "te passen, niet voldoen aan de eisen uit de Netcode Elektriciteit (NCE).",
    vorm: "BEKENDMAKING",
    soort: "OFFICIEEL_BESLUIT",
    waarom:
      "'geschilbesluit' in de naam is de vormmarkering, en de ACM beslist hier zelf op een " +
      "klacht; dit is het stuk waar de primaire-bronverificatie op hoort te kunnen ankeren",
    gebruiktBijOntwerp: true,
  },
  {
    nr: 16,
    bronSleutel: "acm-besluiten",
    uitgeverSoort: "toezichthouder",
    titel: "Woo-besluit met betrekking tot Roblox",
    url: "https://www.acm.nl/nl/publicaties/woo-besluit-met-betrekking-tot-roblox",
    tekst:
      "De ACM wijst het verzoek af op grond van artikel 7 Iw en artikel 12w Iw. " +
      "Documenten Woo-besluit met betrekking tot Roblox (PDF - 491.55 kB)",
    vorm: "BEKENDMAKING",
    soort: "OFFICIEEL_BESLUIT",
    waarom: "'Woo-besluit' in de naam; de ACM wijst zelf een verzoek af onder genoemde artikelen",
  },
  {
    nr: 17,
    bronSleutel: "acm-besluiten",
    uitgeverSoort: "toezichthouder",
    titel:
      "Greenchoice Solutions mag elektriciteit en gas leveren aan eindafnemers met een kleine aansluiting",
    url: "https://www.acm.nl/nl/publicaties/greenchoice-solutions-mag-elektriciteit-en-gas-leveren-aan-eindafnemers-met-een-kleine-aansluiting",
    tekst:
      "Greenchoice Solutions B.V. mag elektriciteit en gas leveren aan eindafnemers met een " +
      "kleine aansluiting. De ACM heeft op 23 oktober 2026 hiervoor een vergunning verleend.",
    vorm: "BEKENDMAKING",
    soort: "OFFICIEEL_BESLUIT",
    waarom:
      "besluitnotitie: orgaan, besluitdatum en beslissing staan er alle drie ('De ACM heeft " +
      "op 23 oktober 2026 hiervoor een vergunning verleend')",
  },
  {
    nr: 18,
    bronSleutel: "acm-besluiten",
    uitgeverSoort: "toezichthouder",
    titel:
      "Standard Investment mag uitsluitende zeggenschap verkrijgen over Marine People (concentratiebesluit)",
    url: "https://www.acm.nl/nl/publicaties/standard-investment-mag-uitsluitende-zeggenschap-verkrijgen-over-marine-people-concentratiebesluit",
    tekst:
      "Standard Investment mag uitsluitende zeggenschap verkrijgen over Marine People. " +
      "Dat heeft de ACM op 26 oktober 2026 besloten.",
    vorm: "BEKENDMAKING",
    soort: "OFFICIEEL_BESLUIT",
    waarom:
      "'concentratiebesluit' in de naam en een besluitnotitie met datum; let op: dit besluit " +
      "stelt GEEN grootheid vast, dus het mag nooit een getalmatige claim ankeren",
  },
  {
    nr: 19,
    bronSleutel: "acm-besluiten",
    uitgeverSoort: "toezichthouder",
    titel: "ANWB Energie mag NextEnergy Holding overnemen (concentratiebesluit)",
    url: "https://www.acm.nl/nl/publicaties/anwb-energie-mag-nextenergy-holding-overnemen-concentratiebesluit",
    tekst:
      "ANWB B.V. mag, via ANWB Energie B.V., NextEnergy Holding B.V. overnemen. " +
      "Dat heeft de ACM op 26 oktober 2026 besloten.",
    vorm: "BEKENDMAKING",
    soort: "OFFICIEEL_BESLUIT",
    waarom: "'concentratiebesluit' in de naam en een besluitnotitie met datum",
  },
  {
    nr: 20,
    bronSleutel: "acm-besluiten",
    uitgeverSoort: "toezichthouder",
    titel: "Soveria mag uitsluitende zeggenschap verkrijgen over Vanka-Kawat (concentratiebesluit)",
    url: "https://www.acm.nl/nl/publicaties/soveria-mag-uitsluitende-zeggenschap-verkrijgen-over-vanka-kawat-concentratiebesluit",
    tekst:
      "Soveria B.V., moederbedrijf van onder andere Asian Food Group en Unidex Group, mag " +
      "uitsluitende zeggenschap verkrijgen over Vanka-Kawat Holding B.V. inclusief " +
      "dochterondernemingen. Dat heeft de ACM op 23 oktober 2026 besloten.",
    vorm: "BEKENDMAKING",
    soort: "OFFICIEEL_BESLUIT",
    waarom: "'concentratiebesluit' in de naam en een besluitnotitie met datum",
  },
  {
    nr: 21,
    bronSleutel: "acm-besluiten",
    uitgeverSoort: "toezichthouder",
    titel: "DSW mag Salland overnemen (concentratiebesluit)",
    url: "https://www.acm.nl/nl/publicaties/dsw-mag-salland-overnemen-concentratiebesluit",
    tekst:
      "DSW Zorgverzekeraar U.A. mag uitsluitende zeggenschap verkrijgen over Salland " +
      "Holding B.V. Dat heeft de ACM op 21 oktober 2026 besloten.",
    vorm: "BEKENDMAKING",
    soort: "OFFICIEEL_BESLUIT",
    waarom: "'concentratiebesluit' in de naam en een besluitnotitie met datum",
  },
  {
    nr: 22,
    bronSleutel: "acm-besluiten",
    uitgeverSoort: "toezichthouder",
    titel: "Woo-besluit met betrekking tot TikTok op grond van de DSA",
    url: "https://www.acm.nl/nl/publicaties/woo-besluit-met-betrekking-tot-tiktok-op-grond-van-de-dsa",
    tekst:
      "De ACM wijst het verzoek af op grond van artikel 7 Iw en artikel 12w, vijfde lid in " +
      "combinatie met het vierde lid en artikel 12u, vierde lid, van de Iw.",
    vorm: "BEKENDMAKING",
    soort: "OFFICIEEL_BESLUIT",
    waarom: "'Woo-besluit' in de naam; de ACM wijst zelf af onder genoemde artikelen",
  },
  {
    nr: 23,
    bronSleutel: "acm-besluiten",
    uitgeverSoort: "toezichthouder",
    titel: "Geschilbesluit Kallista Tethys - TenneT",
    url: "https://www.acm.nl/nl/publicaties/geschilbesluit-kallista-tethys-tennet",
    tekst:
      "De ACM oordeelt dat TenneT in lijn met de geldende wet- en regelgeving heeft " +
      "gehandeld door Tethys geen aansluiting en transportcapaciteit aan te bieden. " +
      "De Autoriteit Consument & Markt ( ACM ) heeft een besluit genomen in het geschil.",
    vorm: "BEKENDMAKING",
    soort: "OFFICIEEL_BESLUIT",
    waarom:
      "'Geschilbesluit' in de naam; de ACM oordeelt zelf. TenneT staat in de tekst, maar " +
      "TenneT is hier de partij WAAROVER wordt beslist, niet het beslissende gezag",
    afwijking:
      "DIT DOCUMENT VOND HET DIEPSTE DEFECT. In de eerste ronde maakte de motor hier " +
      "SECUNDAIRE_BERICHTGEVING van met beschrijftBesluitVan='TenneT', omdat 'TenneT' in " +
      "ANDER_GEZAG staat en acm-besluiten TenneT niet als eigen gezag heeft. Een besluit " +
      "OVER TenneT werd dus gelezen als een besluit VAN TenneT — niet alleen te streng " +
      "maar onwaar, en het zou bronverificatie.ts bij TenneT naar een origineel laten " +
      "zoeken dat daar niet bestaat. Gerepareerd met de `eigenHandelt`-uitzondering in " +
      "stap 3 van bepaalDocumentsoort; zie het commentaar daar voor de vier voorwaarden",
  },
];

/** De documenten die bij het ontwerp van v2 niet zijn gebruikt. */
export const ACHTERGEHOUDEN: readonly GelabeldDocument[] = GELABELDE_DOCUMENTEN.filter(
  (d) => d.gebruiktBijOntwerp !== true,
);
