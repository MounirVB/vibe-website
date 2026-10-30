/* ============================================================
   PIJPLIJN — nieuwsselectie en prioritering
   ------------------------------------------------------------
   WAAROM DEZE LAAG BESTAAT, EN WAAROM HIJ NAAST DE BESLUITMOTOR STAAT
   EN ER NIET IN.

   `besluit/motor.ts` beslist wat er met een gebeurtenis moet gebeuren
   op het niveau van de SITESTRUCTUUR: bestaat er al een pagina die deze
   zoekintentie bezit? Dan verbeteren we die (UPDATE_EXISTING) en maken
   we geen tweede URL. Dat is daar letterlijk "de belangrijkste regel
   van de hele motor", en die regel is juist.

   Maar hij sluit een nieuwsbericht uit, en dat is gemeten. Over 144
   kandidaten uit 2.171 brondocumenten op b2de0c4: NEW_ARTICLE = 0.
   Twaalf van de vijftien clusters hebben een canonieke pagina, dus daar
   kan NEW_ARTICLE niet; de drie clusters zonder eigenaar staan niet in
   CLUSTER_NAAR_ROUTE, dus daar weigert publiceerViaRegister(). De
   verzamelingen zijn disjunct.

   HET CONTRACT LOST DIT OP, en het staat er al in. Uit
   data/seo/nieuws-architectuur.json, artikelschema.onderwerp_eigenaar:

     "Een nieuwsartikel bezit NOOIT zelf een commerciële zoekintentie;
      het leent die van zijn eigenaar en linkt ernaartoe."

   Een nieuwsbericht VEREIST dus een eigenaar, waar NEW_ARTICLE er juist
   geen mag hebben. Het zijn geen varianten van hetzelfde besluit maar
   spiegelbeelden. Daarom een eigen besluit (NEWS_ITEM, migratie 0041)
   en een eigen pas, met een eigen `motor_versie`, zodat de bestaande
   19 paginavoorstellen onaangeroerd blijven staan.

   DRIE ASSEN, APART GEHOUDEN — en dat is geen opmaak.
   §6 van de oorspronkelijke opdracht en de kop van relevantie.ts zeggen
   hetzelfde: één getal verstopt elke onzekerheid. Daarom levert deze
   module drie assen met benoemde componenten, elk met hun eigen bewijs,
   plus een totaal. Een redacteur kan navertellen waarom iets achtste
   staat en niet tweede.

   WAT HIER MET OPZET NIET GEBEURT
   Er wordt GEEN zoekvolume geschat, geen CTR voorspeld en geen
   positiekans berekend. Dat zijn de drie cijfers die een SEO-laag
   normaal verzint, en ze zijn hier niet te meten: er is geen
   Search Console-koppeling (zie analytics/koppelingen.ts) en een
   geschat volume zou als feit in een prioritering landen. De SEO-as
   gebruikt daarom uitsluitend dingen die in deze repository of database
   NA TE REKENEN zijn: bestaat de eigenaarroute, staat hij op INDEX, hoe
   oud is de bron, en bestaat deze slug al.

   SCORES PRIORITEREN, POORTEN BESLISSEN
   Dezelfde scheiding die motor.ts aanhoudt. De score bepaalt de
   VOLGORDE van de werkvoorraad. Of er een bericht MAG komen, beslissen
   de harde gronden hieronder plus — later in de keten — toetsConcept()
   en weigerNieuws(). Deze module versoepelt geen van beide; hij weigert
   juist vooraf wat verderop toch zou stranden, zodat een redacteur geen
   concept krijgt dat nooit gepubliceerd kan worden.
   ============================================================ */

import { eenRij, metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { slug } from "../kern/tekst.ts";
import { NIET_DRAGENDE_DOCUMENTSOORTEN } from "./documentsoort.ts";
import { NOODZAKELIJKE_ZEKERHEID } from "./claimmodaliteit.ts";

const log = maakLogger("nieuwsselectie");

/** Eigen versiesleutel, zodat de besluitmotor zijn kandidaten houdt. */
export const NIEUWSMOTOR_VERSIE = "nieuwsmotor-v1";

/**
 * De vier bronsoorten die een nieuwsfeit zelfstandig kunnen dragen.
 *
 * Deze lijst is NIET hier bedacht. Hij staat in
 * data/seo/nieuws-architectuur.json en wordt door
 * scripts/seo/bouw-routes.mjs (DRAGENDE_BRONSOORTEN, regel 410)
 * afgedwongen. Een kandidaat zonder zo'n bron haalt weigerNieuws()
 * nooit, dus hem toch tot concept maken kost een redacteur tijd voor
 * iets dat niet kan publiceren.
 */
export const DRAGENDE_BRONSOORTEN: readonly string[] = [
  "WETGEVING",
  "TOEZICHTHOUDER",
  "NETBEHEERDER",
  "STATISTIEK",
];

/**
 * De tien zakelijke thema's uit de opdracht, afgebeeld op de clusters
 * die in intel.onderwerp_clusters bestaan.
 *
 * `elektrificatie` staat hier omdat het thema "warmtepompen en
 * elektrificatie" gevraagd is en als enige van de tien geen eigen
 * onderwerp had: 'warmtepomp' kwam alleen voor als ZWAKKE term onder
 * vastgoedverduurzaming, en de dempers in relevantie.ts onderdrukken
 * 'warmtepompsubsidie' juist (terecht: dat is een particuliere
 * regeling). Zakelijke elektrificatie — industriële warmtepomp,
 * procesverwarming, e-boiler — was daarmee onvindbaar.
 */
export const ZAKELIJKE_THEMACLUSTERS: Readonly<Record<string, string>> = {
  netcongestie: "netcongestie",
  bess: "zakelijke batterijopslag",
  "zonne-energie": "zonnepanelen",
  laadinfrastructuur: "laadpleinen en laadinfrastructuur",
  ems: "energiemanagement",
  elektrificatie: "warmtepompen en elektrificatie",
  subsidie: "subsidies",
  regelgeving: "energiewetgeving",
  marktprijs: "flexibiliteitsmarkten",
  netbeheer: "netbeheer en transportcapaciteit",
};

/** Soorten die een commercieel signaal zijn; die gaan naar de kansenlaag. */
const SIGNAALSOORTEN = new Set(["aanbesteding", "vergunning", "vastgoedontwikkeling"]);

/** Soorten die per dag veranderen; een gedateerd bericht verouderd meteen. */
const DAGREEKSSOORTEN = new Set(["marktprijs", "statistiek"]);

/** Drempels op één plek, zodat ze te verantwoorden zijn. */
export const NIEUWSDREMPELS = {
  /** Onder deze materialiteit is het geen bericht. Gelijk aan motor.ts. */
  materialiteit: 45,
  /** Gelijk aan DREMPELS.bewijsNieuwArtikel in motor.ts. */
  bewijskwaliteit: 4,
  /** Onder deze totaalscore is het geen werkvoorraad maar ruis. */
  totaalscore: 45,
  /**
   * Hoeveel dagen oud mag de bron zijn?
   *
   * 120 en niet 30, en dat is een meting. De ophaalronde van 29 oktober
   * 2026 leverde 200 nieuwe documenten, maar de gebeurtenissen met
   * BEVESTIGDE uitspraken in de database dateren van de ronde van
   * 12 oktober. Een grens van 30 dagen zou vandaag alles afwijzen en
   * de keten onbewijsbaar maken. 120 dagen houdt 'nieuws' nog
   * betekenisvol — een kwartaal — en laat de actualiteitscomponent het
   * verschil tussen vers en oud in de SCORE doen in plaats van in een
   * harde grens.
   */
  maxLeeftijdDagen: 120,
} as const;

export type Component = {
  readonly naam: string;
  readonly score: number;
  readonly max: number;
  /** Waarom deze score. Navertelbaar zonder de code te lezen. */
  readonly bewijs: string;
};

export type As = {
  readonly as: "zakelijk" | "seogeo" | "bronkwaliteit";
  readonly score: number;
  readonly max: number;
  readonly componenten: readonly Component[];
};

export type NieuwsOordeel = {
  readonly geschikt: boolean;
  /** 0-100, som van de drie assen. Stuurt alleen de volgorde. */
  readonly totaalscore: number;
  readonly assen: readonly As[];
  /** De bindende afwijsgrond, of de reden dat hij geschikt is. */
  readonly oordeel: string;
  /** Alle gronden die faalden, in de orde waarin ze getoetst zijn. */
  readonly afwijsgronden: readonly string[];
};

export type NieuwsselectieInvoer = {
  readonly gebeurtenisId: number;
  readonly titel: string;
  readonly gebeurtenisSoort: string;
  readonly materialiteit: number;
  /** Uit classificeer(); null betekent NIET GECLASSIFICEERD, niet nul. */
  readonly bedrijfsrelevantie: number | null;
  readonly relevantieCategorie: string | null;
  readonly clusterSleutel: string | null;
  /** De route die dit cluster bezit, uit CLUSTER_NAAR_ROUTE. */
  readonly eigenaarRoute: string | null;
  /** Staat die route op INDEX in data/seo/routes.json? */
  readonly eigenaarOpIndex: boolean;
  readonly heeftTegenspraak: boolean;
  readonly uitsprakenBevestigd: number;
  readonly uitsprakenTotaal: number;
  readonly besteBewijskwaliteit: number;
  readonly aantalOnafhankelijkeBronnen: number;
  readonly heeftPrimaireBron: boolean;
  /** De bronsoorten langs dezelfde join die publiceerViaRegister() gebruikt. */
  readonly bronsoorten: readonly string[];
  /** Nieuwste brondatum (ISO), of null als geen bron een datum heeft. */
  readonly nieuwsteBrondatum: string | null;
  /** Slugs die al onder data/inhoud/nieuws/ bestaan. */
  readonly bestaandeNieuwsSlugs: ReadonlySet<string>;
  readonly vandaag: string;

  /* ---------------- R3 ---------------- */

  /**
   * Claims die een bericht kunnen DRAGEN: modaliteit VASTGESTELD met
   * voldoende zekerheid, én bewijskracht die niet uit een navertelling
   * of een pleidooi komt.
   *
   * WAAROM DIT EEN EIGEN GETAL IS EN NIET `uitsprakenBevestigd`.
   * Gemeten op 30 oktober 2026 waren 45 van de 51 bevestigde claims in
   * productie afkomstig uit één branchevereniging, met bewijs_kwaliteit
   * 5, en zat daar deze bij: 'Schaal daarom de bestaande Flex-E-regeling
   * op naar een Flex-E regeling XL van structureel EUR 125 miljoen per
   * jaar (2027-2030).' Een verzoek aan de Kamer. `uitsprakenBevestigd`
   * telde die mee; dit getal niet.
   *
   * NULL betekent NIET GEMETEN — de classificatie heeft deze
   * gebeurtenis nog niet gezien. Dat is iets anders dan nul dragende
   * claims, en de poort hieronder behandelt het ook anders.
   */
  readonly dragendeClaims: number | null;
  /** Hoeveel claims per modaliteit, voor de uitleg aan de redactie. */
  readonly claimsPerModaliteit: Readonly<Record<string, number>>;
  /** De documentsoorten van de bronnen onder deze gebeurtenis. */
  readonly documentsoorten: readonly string[];
};

const ISO_VORM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Is dit een ECHTE datum, en niet alleen de vorm van een datum?
 *
 * DE VORM ALLEEN IS NIET GENOEG, en dat is gemeten met de eigen toets:
 * '2026-13-45' haalt `^\d{4}-\d{2}-\d{2}$` — maand 13, dag 45. De
 * regexcontrole meldde 'geldig', terwijl dagenTussen() er NaN van maakte
 * en de actualiteitscomponent 'geen geldige datum' zei. Twee onderdelen
 * met een ander antwoord op dezelfde vraag.
 *
 * Erger: `weigerNieuws()` in scripts/seo/bouw-routes.mjs gebruikt
 * dezelfde vormcontrole (ISO_DATUM op regel 419). Een onmogelijke datum
 * zou daar dus ook doorkomen en het artikel op INDEX zetten met een
 * peildatum die niet bestaat.
 *
 * De terugvergelijking is de goedkoopste echte controle: Date rolt
 * maand 13 door naar het volgende jaar, dus een datum die niet
 * byte-identiek terugkomt, bestond niet.
 */
function isEchteDatum(d: string | null): d is string {
  if (d === null || !ISO_VORM.test(d)) return false;
  const t = Date.parse(`${d}T00:00:00Z`);
  if (!Number.isFinite(t)) return false;
  return new Date(t).toISOString().slice(0, 10) === d;
}

function dagenTussen(vanaf: string, tot: string): number | null {
  if (!isEchteDatum(vanaf) || !isEchteDatum(tot)) return null;
  const a = Date.parse(`${vanaf}T00:00:00Z`);
  const b = Date.parse(`${tot}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** De punten per relevantiecategorie, en waarom elk zo ligt. */
const CATEGORIEPUNTEN: Readonly<Record<string, { punten: number; waarom: string }>> = {
  /* Dit is de categorie die classificeer() juist voor inhoud bedoelt. */
  redactionele_kans: { punten: 12, waarom: "classificeer() merkt dit aan als geschikt voor inhoud" },
  regelgeving: { punten: 10, waarom: "regelgeving die commerciële energie-infrastructuur raakt" },
  /* Lager dan regelgeving: een commerciële kans hoort in de kansenlaag
     en wordt pas nieuws als er ook een vaststelling onder ligt. */
  commerciele_kans: { punten: 8, waarom: "commercieel interessant, maar de kansenlaag is de eerste bestemming" },
  marktintelligentie: { punten: 4, waarom: "relevant onderwerp zonder eigen handelingsmoment" },
  achtergrond: { punten: 1, waarom: "context, er valt niets op te besluiten" },
  niet_relevant: { punten: 0, waarom: "buiten de propositie" },
};

/**
 * Beoordeelt één gebeurtenis op nieuwswaarde.
 *
 * Deterministisch, zonder database en zonder netwerk, zodat hij in een
 * eenheidstoets tegen echte productietitels gehouden kan worden —
 * precies zoals classificeer() in relevantie.ts.
 */
export function beoordeelNieuwswaarde(inv: NieuwsselectieInvoer): NieuwsOordeel {
  const afwijsgronden: string[] = [];

  /* ---------------- as 1: zakelijke relevantie (max 40) ---------------- */
  const zakelijk: Component[] = [];

  if (inv.bedrijfsrelevantie === null) {
    zakelijk.push({
      naam: "bedrijfsrelevantie",
      score: 0,
      max: 20,
      bewijs:
        "NIET GECLASSIFICEERD — classificeer() heeft deze gebeurtenis nooit beoordeeld. " +
        "Dat is iets anders dan relevantie 0; draai `npm run pijplijn` of de herclassificatie.",
    });
  } else {
    zakelijk.push({
      naam: "bedrijfsrelevantie",
      score: Math.round((inv.bedrijfsrelevantie / 100) * 20),
      max: 20,
      bewijs: `bedrijfsrelevantie ${inv.bedrijfsrelevantie}/100 uit classificeer()`,
    });
  }

  const cat = CATEGORIEPUNTEN[inv.relevantieCategorie ?? ""] ?? {
    punten: 0,
    waarom: `categorie '${inv.relevantieCategorie ?? "ontbreekt"}' is onbekend in deze weging`,
  };
  zakelijk.push({
    naam: "relevantiecategorie",
    score: cat.punten,
    max: 12,
    bewijs: `${inv.relevantieCategorie ?? "ontbreekt"}: ${cat.waarom}`,
  });

  const thema = inv.clusterSleutel ? ZAKELIJKE_THEMACLUSTERS[inv.clusterSleutel] : undefined;
  zakelijk.push({
    naam: "zakelijk_thema",
    score: thema ? 8 : 0,
    max: 8,
    bewijs: thema
      ? `cluster '${inv.clusterSleutel}' is het thema '${thema}'`
      : `cluster '${inv.clusterSleutel ?? "ontbreekt"}' hoort bij geen van de tien zakelijke thema's`,
  });

  /* ---------------- as 2: SEO/GEO (max 30) ---------------- */
  const seogeo: Component[] = [];

  const leeftijd =
    inv.nieuwsteBrondatum === null ? null : dagenTussen(inv.nieuwsteBrondatum, inv.vandaag);
  let actualiteit = 0;
  let actualiteitBewijs: string;
  if (leeftijd === null) {
    actualiteitBewijs =
      "geen enkele bron draagt een geldige datum; een nieuwsbericht zonder peildatum veroudert onzichtbaar";
  } else if (leeftijd < 0) {
    actualiteit = 10;
    actualiteitBewijs = `brondatum ${inv.nieuwsteBrondatum} ligt in de toekomst; behandeld als vers`;
  } else if (leeftijd <= 7) {
    actualiteit = 10;
    actualiteitBewijs = `${leeftijd} dag(en) oud`;
  } else if (leeftijd <= 14) {
    actualiteit = 8;
    actualiteitBewijs = `${leeftijd} dagen oud`;
  } else if (leeftijd <= 30) {
    actualiteit = 5;
    actualiteitBewijs = `${leeftijd} dagen oud`;
  } else if (leeftijd <= 90) {
    actualiteit = 2;
    actualiteitBewijs = `${leeftijd} dagen oud; nog binnen een kwartaal maar niet actueel`;
  } else {
    actualiteitBewijs = `${leeftijd} dagen oud`;
  }
  seogeo.push({ naam: "actualiteit", score: actualiteit, max: 10, bewijs: actualiteitBewijs });

  /* DE ZOEKINTENTIE WORDT NIET GESCHAT MAAR OPGEZOCHT.
     Of er commerciële zoekvraag op dit onderwerp bestaat, is af te
     leiden uit het feit dat Release 1 er een INDEX-pagina voor heeft
     gebouwd — dat is een besluit van een mens op grond van eigen
     onderzoek. Dat is een zwakker signaal dan een zoekvolume, maar het
     is NA TE REKENEN, en een geschat volume is dat niet. */
  seogeo.push({
    naam: "zoekintentie_eigenaar",
    score: inv.eigenaarRoute && inv.eigenaarOpIndex ? 8 : 0,
    max: 8,
    bewijs:
      inv.eigenaarRoute && inv.eigenaarOpIndex
        ? `'${inv.eigenaarRoute}' staat op INDEX en bezit deze zoekintentie; het bericht leent die en linkt erheen`
        : inv.eigenaarRoute
          ? `'${inv.eigenaarRoute}' bestaat maar staat niet op INDEX`
          : `cluster '${inv.clusterSleutel ?? "ontbreekt"}' heeft geen eigenaarroute in CLUSTER_NAAR_ROUTE`,
  });

  const voorgenomenSlug = slug(inv.titel);
  const slugBestaat = inv.bestaandeNieuwsSlugs.has(voorgenomenSlug);
  seogeo.push({
    naam: "onderscheidbaarheid",
    score: slugBestaat ? 0 : 7,
    max: 7,
    bewijs: slugBestaat
      ? `nieuws/${voorgenomenSlug} bestaat al; een tweede bericht op dezelfde slug is een duplicaat`
      : `nieuws/${voorgenomenSlug} is vrij`,
  });

  /* KANNIBALISATIE IS HIER EEN EIGENSCHAP, GEEN RISICO-INSCHATTING.
     Het contract verbiedt "de bestaande commerciële pagina's laten
     kannibaliseren door een nieuwsartikel op dezelfde term". De
     constructie die dat voorkomt is juist de eigenaar: het bericht is
     zelfverwijzend canoniek, claimt de commerciële term niet en linkt
     naar de pagina die hem wel bezit. Mét eigenaar is er dus geen
     kannibalisatie; zonder eigenaar zou het bericht die term zelf
     claimen, en dan wel. */
  seogeo.push({
    naam: "geen_kannibalisatie",
    score: inv.eigenaarRoute ? 5 : 0,
    max: 5,
    bewijs: inv.eigenaarRoute
      ? `het bericht leent de intentie van '${inv.eigenaarRoute}' en concurreert er dus niet mee`
      : "zonder eigenaar zou dit bericht zelf een commerciële term claimen",
  });

  /* ---------------- as 3: bronkwaliteit (max 30) ---------------- */
  const bronkwaliteit: Component[] = [];

  const dragend = inv.bronsoorten.filter((s) => DRAGENDE_BRONSOORTEN.includes(s));
  bronkwaliteit.push({
    naam: "dragende_bron",
    score: dragend.length > 0 ? 12 : 0,
    max: 12,
    bewijs:
      dragend.length > 0
        ? `dragende bronsoort(en): ${[...new Set(dragend)].join(", ")}`
        : `alleen ${[...new Set(inv.bronsoorten)].join(", ") || "geen bron"}; het contract eist minstens één van ${DRAGENDE_BRONSOORTEN.join(", ")}`,
  });

  bronkwaliteit.push({
    naam: "primaire_bron",
    score: inv.heeftPrimaireBron ? 6 : 0,
    max: 6,
    bewijs: inv.heeftPrimaireBron
      ? "minstens één uitspraak hangt aan een bron met rol 'primair'"
      : "geen enkele uitspraak heeft een primaire bron; dan is dit een artikel over een artikel",
  });

  bronkwaliteit.push({
    naam: "bewijskwaliteit",
    score: Math.min(6, Math.max(0, Math.round((inv.besteBewijskwaliteit / 5) * 6))),
    max: 6,
    /* DE BEWIJSREGEL ZEGT NU WAAR HET GETAL VANDAAN KOMT.
       Hier stond 'over N bevestigde van M uitspraken', terwijl het
       getal uit een ongeverifieerde claim kon komen. Die regel wordt
       in `beoordeling` opgeslagen en door de studio aan een redacteur
       getoond; een onware regel in een bewaard oordeel is erger dan
       geen regel, want hij wordt geloofd. De noemer is nu de
       verzameling waaruit het maximum werkelijk is genomen. */
    bewijs:
      inv.dragendeClaims === null
        ? `beste bewijskwaliteit ${inv.besteBewijskwaliteit}/5; dragende claims NIET GEMETEN ` +
          `(${inv.uitsprakenBevestigd} bevestigd van ${inv.uitsprakenTotaal} uitspraken)`
        : `beste bewijskwaliteit ${inv.besteBewijskwaliteit}/5 over ${inv.dragendeClaims} ` +
          `dragende van ${inv.uitsprakenTotaal} uitspraken ` +
          `(bevestigd: ${inv.uitsprakenBevestigd}), afgetopt op het bewijskrachtplafond`,
  });

  bronkwaliteit.push({
    naam: "onafhankelijke_bronnen",
    score: inv.aantalOnafhankelijkeBronnen >= 2 ? 4 : inv.aantalOnafhankelijkeBronnen === 1 ? 2 : 0,
    max: 4,
    bewijs: `${inv.aantalOnafhankelijkeBronnen} onafhankelijke bron(nen) over dezelfde gebeurtenis`,
  });

  const datumGeldig = isEchteDatum(inv.nieuwsteBrondatum);
  bronkwaliteit.push({
    naam: "brondatum",
    score: datumGeldig ? 2 : 0,
    max: 2,
    bewijs: datumGeldig
      ? `nieuwste brondatum ${inv.nieuwsteBrondatum}`
      : "geen geldige ISO-brondatum",
  });

  const bouwAs = (naam: As["as"], comp: Component[]): As => ({
    as: naam,
    score: comp.reduce((a, b) => a + b.score, 0),
    max: comp.reduce((a, b) => a + b.max, 0),
    componenten: comp,
  });

  const assen: As[] = [
    bouwAs("zakelijk", zakelijk),
    bouwAs("seogeo", seogeo),
    bouwAs("bronkwaliteit", bronkwaliteit),
  ];
  const totaalscore = Math.max(0, Math.min(100, assen.reduce((a, b) => a + b.score, 0)));

  /* ---------------- de harde gronden ----------------
     In deze volgorde, en elke grond staat er omdat hij VERDEROP in de
     keten toch zou blokkeren. Vooraf weigeren is eerlijker dan een
     redacteur een concept geven dat weigerNieuws() op PENDING zet. */

  if (!inv.clusterSleutel) {
    afwijsgronden.push("geen onderwerpcluster, dus geen aantoonbare relevantie voor Vibe Energy");
  }
  if (inv.relevantieCategorie === "niet_relevant") {
    afwijsgronden.push(
      "classificeer() merkt dit aan als niet_relevant; buiten de propositie wordt het geen bericht",
    );
  }
  if (SIGNAALSOORTEN.has(inv.gebeurtenisSoort)) {
    afwijsgronden.push(
      `gebeurtenissoort '${inv.gebeurtenisSoort}' is een commercieel signaal; dat hoort in de kansenlaag, niet op de nieuwspagina`,
    );
  }
  if (DAGREEKSSOORTEN.has(inv.gebeurtenisSoort)) {
    afwijsgronden.push(
      `'${inv.gebeurtenisSoort}' verandert per dag; een gedateerd bericht zou direct verouderen`,
    );
  }
  if (inv.heeftTegenspraak) {
    afwijsgronden.push(
      "bronnen spreken elkaar numeriek tegen; dat hoort opgelost te worden, niet gepubliceerd",
    );
  }
  if (inv.materialiteit < NIEUWSDREMPELS.materialiteit) {
    afwijsgronden.push(
      `materialiteit ${inv.materialiteit} ligt onder de drempel ${NIEUWSDREMPELS.materialiteit}`,
    );
  }
  if (inv.uitsprakenBevestigd === 0) {
    afwijsgronden.push(
      `geen bevestigde uitspraak (${inv.uitsprakenTotaal} ongeverifieerd); zonder bewijs geen bericht`,
    );
  }
  if (inv.besteBewijskwaliteit < NIEUWSDREMPELS.bewijskwaliteit) {
    afwijsgronden.push(
      `beste bewijskwaliteit ${inv.besteBewijskwaliteit} ligt onder de drempel ${NIEUWSDREMPELS.bewijskwaliteit}`,
    );
  }

  /* ---------------- R3: DE DRAGENDE CLAIM ----------------
     `uitsprakenBevestigd > 0` is niet genoeg, en dat is gemeten. Op
     30 oktober 2026 stonden 45 van de 51 bevestigde claims in productie
     op naam van één branchevereniging met bewijs_kwaliteit 5, en daar
     zat een verzoek aan de Tweede Kamer tussen. Een bericht dat daarop
     rust, publiceert een lobbywens als beleid.

     Een dragende claim is er één die VASTGESTELD is met voldoende
     zekerheid én bewijskracht heeft die niet uit een navertelling of een
     pleidooi komt. Zonder zo'n claim is er niets om over te berichten —
     ook niet als er tien onbevestigde claims liggen.

     NIET GEMETEN IS GEEN NUL. Is `dragendeClaims` null, dan heeft de
     classificatie deze gebeurtenis nog niet gezien. Dan is dit geen
     afwijzing maar een ontbrekend oordeel, en dat hoort als zodanig in
     de uitvoer: anders leest een redacteur 'geen dragende claim' terwijl
     niemand heeft gekeken. */
  if (inv.dragendeClaims === null) {
    afwijsgronden.push(
      "dragende claims NIET GEMETEN; de documentclassificatie heeft deze gebeurtenis nog niet " +
        "gezien — draai 'npm run documentsoort' en daarna de pijplijn opnieuw",
    );
  } else if (inv.dragendeClaims === 0) {
    const verdeling = Object.entries(inv.claimsPerModaliteit)
      .map(([m, n]) => `${n}x ${m}`)
      .join(", ");
    afwijsgronden.push(
      `geen dragende claim: geen enkele uitspraak is vastgesteld MET voldoende bewijskracht ` +
        `(${verdeling || "geen uitspraken"}); een voorstel of verwachting draagt geen bericht`,
    );
  }

  /* Alle bronnen een navertelling, een opinie of een lobbydocument? Dan
     is er geen eigen bewijs, hoe betrouwbaar de uitgevers ook zijn. Deze
     grond staat los van de dragende claim, want hij zegt iets anders:
     niet "de claims houden niet" maar "er is geen enkel document dat
     iets vaststelt". Die twee vragen om een andere handeling — wachten
     op het origineel versus wachten op een betere formulering. */
  if (inv.documentsoorten.length > 0) {
    const dragendeDocumenten = inv.documentsoorten.filter(
      (s) => !NIET_DRAGENDE_DOCUMENTSOORTEN.includes(s),
    );
    if (dragendeDocumenten.length === 0) {
      afwijsgronden.push(
        `alle ${inv.documentsoorten.length} bronnen zijn navertelling, opinie of lobby ` +
          `(${[...new Set(inv.documentsoorten)].join(", ")}); geen document stelt zelf iets vast`,
      );
    }
  }
  /* DE EIGENAAR, en dit is de grond die het contract afdwingt. */
  if (!inv.eigenaarRoute) {
    afwijsgronden.push(
      `cluster '${inv.clusterSleutel ?? "ontbreekt"}' heeft geen onderwerp-eigenaar in CLUSTER_NAAR_ROUTE; ` +
        "publiceerViaRegister() zou dit bericht weigeren omdat het zijn commerciële intentie niet kan lenen",
    );
  } else if (!inv.eigenaarOpIndex) {
    afwijsgronden.push(
      `onderwerp-eigenaar '${inv.eigenaarRoute}' staat niet op INDEX; weigerNieuws() zet het bericht dan op PENDING`,
    );
  }
  if (dragend.length === 0) {
    afwijsgronden.push(
      `geen dragende bronsoort; weigerNieuws() eist minstens één van ${DRAGENDE_BRONSOORTEN.join(", ")} ` +
        "en een marktpartij alleen is niet genoeg",
    );
  }
  if (!datumGeldig) {
    afwijsgronden.push("geen geldige ISO-brondatum; weigerNieuws() eist een raadpleegdatum per bron");
  } else if (leeftijd !== null && leeftijd > NIEUWSDREMPELS.maxLeeftijdDagen) {
    afwijsgronden.push(
      `de nieuwste bron is ${leeftijd} dagen oud, boven de grens van ${NIEUWSDREMPELS.maxLeeftijdDagen}; dat is geen nieuws meer`,
    );
  }
  if (slugBestaat) {
    afwijsgronden.push(
      `nieuws/${voorgenomenSlug} bestaat al; een tweede bericht op dezelfde slug is een duplicaat`,
    );
  }
  if (afwijsgronden.length === 0 && totaalscore < NIEUWSDREMPELS.totaalscore) {
    afwijsgronden.push(
      `totaalscore ${totaalscore} ligt onder de werkvoorraaddrempel ${NIEUWSDREMPELS.totaalscore}; ` +
        "alle harde gronden zijn gehaald, maar dit weegt te licht om een redacteur voor te leggen",
    );
  }

  const geschikt = afwijsgronden.length === 0;
  const oordeel = geschikt
    ? `GESCHIKT (${totaalscore}/100) — ` +
      assen.map((a) => `${a.as} ${a.score}/${a.max}`).join(", ") +
      `; dragend via ${[...new Set(dragend)].join(", ")}, eigenaar '${inv.eigenaarRoute}'`
    : `ONGESCHIKT (${totaalscore}/100) — ${afwijsgronden[0]}`;

  return { geschikt, totaalscore, assen, oordeel: oordeel.slice(0, 300), afwijsgronden };
}

/* ============================================================
   De ronde: dezelfde beoordeling, nu over de database.
   ============================================================ */

export type NieuwsselectieRapport = {
  readonly beoordeeld: number;
  readonly geschikt: number;
  readonly ongeschikt: number;
  readonly kandidatenGeschreven: number;
  /** De bindende afwijsgrond per gebeurtenis, geteld. */
  readonly perAfwijsgrond: Readonly<Record<string, number>>;
  readonly top: readonly {
    readonly gebeurtenisId: number;
    readonly titel: string;
    readonly score: number;
    readonly oordeel: string;
  }[];
};

type GebeurtenisRij = {
  id: number;
  titel: string;
  gebeurtenis_soort: string;
  materialiteit: number;
  bedrijfsrelevantie: number | null;
  relevantie_categorie: string | null;
  cluster_id: number | null;
  cluster_sleutel: string | null;
  risico_klasse: "laag" | "midden" | "hoog";
  heeft_tegenspraak: boolean;
  uitspraken_bevestigd: number;
  uitspraken_totaal: number;
  beste_bewijskwaliteit: number;
  onafhankelijke_bronnen: number;
  heeft_primaire_bron: boolean;
  bronsleutels: string[];
  nieuwste_brondatum: string | null;
  /* R3 */
  dragende_claims: number | null;
  claims_vastgesteld: number;
  claims_voorstel: number;
  claims_verwachting: number;
  claims_zonder_modaliteit: number;
  documentsoorten: string[];
};

/**
 * Beoordeelt alle gebeurtenissen op nieuwswaarde en schrijft de
 * geschikte als NEWS_ITEM-kandidaat.
 *
 * SCHRIJFT ONDER EEN EIGEN `motor_versie`, dus de kandidaten van
 * besluit/motor.ts blijven onaangeroerd. Dezelfde gebeurtenis kan
 * daarom zowel een paginaverbetering als een nieuwsbericht opleveren.
 *
 * PUBLICEERT NIETS EN KEURT NIETS GOED. Een NEWS_ITEM-kandidaat staat
 * op status 'open' en wordt pas een inhoudsversie als iemand (of de
 * conceptpas) `maakConcept` aanroept — en die schrijft op 'ter_review'.
 */
export async function nieuwsselectieronde(
  pool: Pool,
  organisatieId: number,
  opties: {
    readonly max?: number;
    readonly vandaag?: string;
    /** Eigenaarroutes per cluster, en of ze op INDEX staan. */
    readonly eigenaren: ReadonlyMap<string, { route: string; opIndex: boolean }>;
    /** Bronsoort per bronsleutel; de aanroeper leest het bronregister. */
    readonly bronsoortPerSleutel: ReadonlyMap<string, string>;
    readonly bestaandeNieuwsSlugs: ReadonlySet<string>;
    readonly droog?: boolean;
  },
): Promise<NieuwsselectieRapport> {
  const max = opties.max ?? 1000;
  const vandaag = opties.vandaag ?? new Date().toISOString().slice(0, 10);

  const gebeurtenissen = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<GebeurtenisRij>(
      c,
      /* De bronsleutels komen langs DEZELFDE join die
         publiceerViaRegister() gebruikt: uitspraak_bronnen met rol
         'primair'. Een andere join zou een andere bronsoort opleveren
         dan er straks in het registerrecord staat, en dan zou deze
         selectie iets goedkeuren dat weigerNieuws() afwijst. */
      `select g.id,
              g.titel,
              g.gebeurtenis_soort,
              g.materialiteit,
              g.bedrijfsrelevantie,
              g.relevantie_categorie,
              g.onderwerp_cluster_id as cluster_id,
              oc.sleutel             as cluster_sleutel,
              g.risico_klasse,
              g.heeft_tegenspraak,
              (select count(*)::int from intel.uitspraken u
                where u.gebeurtenis_id = g.id and u.verificatie_status = 'bevestigd')
                                     as uitspraken_bevestigd,
              (select count(*)::int from intel.uitspraken u
                where u.gebeurtenis_id = g.id)
                                     as uitspraken_totaal,
              /* R3 — DE BESTE BEWIJSKRACHT VAN EEN DRAGENDE CLAIM, en
                 niet het maximum over alles.
                 Hier stond
                   max(u.bewijs_kwaliteit) where u.gebeurtenis_id = g.id
                 zonder verificatie_status, zonder modaliteit en zonder
                 aftopping op het plafond. De zustersubquery's in dit
                 blok filteren allemaal wel; deze was de enige
                 aggregatie zonder predicaat. Drie gevolgen:
                   1 een ONGEVERIFIEERDE claim kon het maximum zetten,
                     terwijl de bewijsregel eronder zegt dat het getal
                     'over N bevestigde uitspraken' gaat;
                   2 een claim die nog de oude, uit de UITGEVER
                     afgeleide sterkte draagt (bewijs_kwaliteit boven
                     zijn plafond) telde met die oude waarde mee;
                   3 de zespuntscomponent kon daardoor 6 geven waar 5
                     hoort.
                 Dezelfde voorwaarden als dragende_claims hieronder,
                 plus least() op het plafond. De aftopping is geen
                 dubbelop: na een volledige herbeoordeling staat
                 bewijs_kwaliteit al onder zijn plafond, maar een
                 gekloonde of met de hand aangepaste rij hoeft dat niet
                 te zijn, en dan hoort de SCORE de laagste van de twee
                 te gebruiken.
                 NUL IS HIER EEN GEMETEN NUL: geen dragende claim
                 betekent geen bewijskracht, en de dragende-claimpoort
                 wijst de gebeurtenis dan toch al af. */
              coalesce((select max(least(u.bewijs_kwaliteit,
                                         coalesce(u.bewijskracht_plafond, u.bewijs_kwaliteit)))
                          from intel.uitspraken u
                         where u.gebeurtenis_id = g.id
                           and u.verificatie_status = 'bevestigd'
                           and u.modaliteit = 'VASTGESTELD'
                           and coalesce(u.modaliteit_zekerheid, 0) >= $3), 0)
                                     as beste_bewijskwaliteit,
              coalesce((select count(distinct bd.bron_id)::int
                          from intel.gebeurtenis_documenten gd
                          join intel.brondocument_versies bv on bv.id = gd.versie_id
                          join intel.brondocumenten bd on bd.id = bv.brondocument_id
                         where gd.gebeurtenis_id = g.id), 0)
                                     as onafhankelijke_bronnen,
              exists (select 1
                        from intel.uitspraken u
                        join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
                       where u.gebeurtenis_id = g.id and ub.rol = 'primair')
                                     as heeft_primaire_bron,
              coalesce((select array_agg(distinct b.sleutel)
                          from intel.uitspraken u
                          join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
                          join intel.brondocument_versies bv on bv.id = ub.versie_id
                          join intel.brondocumenten bd on bd.id = bv.brondocument_id
                          join intel.bronnen b on b.id = bd.bron_id
                         where u.gebeurtenis_id = g.id), '{}') as bronsleutels,
              (select max(coalesce(bd.gepubliceerd_op, bv.opgehaald_op))::date::text
                 from intel.uitspraken u
                 join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
                 join intel.brondocument_versies bv on bv.id = ub.versie_id
                 join intel.brondocumenten bd on bd.id = bv.brondocument_id
                where u.gebeurtenis_id = g.id) as nieuwste_brondatum,
              /* R3 — DE DRAGENDE CLAIM.
                 Bevestigd EN vastgesteld EN met voldoende zekerheid. Het
                 'bevestigd' draagt na R3 al de documenteis in zich: een
                 navertelling, een opinie of een lobbydocument bevestigt
                 niets meer (zie magZelfBevestigen). Daarom hoeft deze
                 subquery de documentsoort niet opnieuw te toetsen.

                 NULL BETEKENT NIET GEMETEN. Zijn er wel uitspraken maar
                 heeft geen enkele een modaliteit, dan heeft de
                 classificatie deze gebeurtenis nog niet gezien. Dat is
                 iets anders dan nul dragende claims, en de poort
                 behandelt het ook anders. Nul uitspraken is wél een
                 gemeten nul. */
              (select case
                        when count(*) = 0 then 0
                        when count(*) filter (where u.modaliteit is not null) = 0 then null
                        else count(*) filter (
                               where u.verificatie_status = 'bevestigd'
                                 and u.modaliteit = 'VASTGESTELD'
                                 and coalesce(u.modaliteit_zekerheid, 0) >= $3)
                      end::int
                 from intel.uitspraken u
                where u.gebeurtenis_id = g.id) as dragende_claims,
              (select count(*)::int from intel.uitspraken u
                where u.gebeurtenis_id = g.id and u.modaliteit = 'VASTGESTELD')
                                     as claims_vastgesteld,
              (select count(*)::int from intel.uitspraken u
                where u.gebeurtenis_id = g.id and u.modaliteit = 'VOORSTEL')
                                     as claims_voorstel,
              (select count(*)::int from intel.uitspraken u
                where u.gebeurtenis_id = g.id and u.modaliteit = 'VERWACHTING')
                                     as claims_verwachting,
              (select count(*)::int from intel.uitspraken u
                where u.gebeurtenis_id = g.id and u.modaliteit is null)
                                     as claims_zonder_modaliteit,
              /* De documentsoorten onder deze gebeurtenis, langs dezelfde
                 join als de bronsleutels hierboven. */
              coalesce((select array_agg(distinct bv.documentsoort)
                          from intel.uitspraken u
                          join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
                          join intel.brondocument_versies bv on bv.id = ub.versie_id
                         where u.gebeurtenis_id = g.id
                           and bv.documentsoort is not null), '{}') as documentsoorten
         from intel.markt_gebeurtenissen g
         left join intel.onderwerp_clusters oc on oc.id = g.onderwerp_cluster_id
        where g.organisatie_id = $1
          and g.status <> 'afgewezen'
        order by g.bedrijfsrelevantie desc nulls last, g.materialiteit desc, g.id
        limit $2`,
      [organisatieId, max, NOODZAKELIJKE_ZEKERHEID],
    ),
  );

  const perAfwijsgrond: Record<string, number> = {};
  const top: { gebeurtenisId: number; titel: string; score: number; oordeel: string }[] = [];
  let geschikt = 0;
  let ongeschikt = 0;
  let geschreven = 0;

  for (const g of gebeurtenissen) {
    const eigenaar = g.cluster_sleutel ? opties.eigenaren.get(g.cluster_sleutel) : undefined;
    const bronsoorten = g.bronsleutels.map(
      (s) => opties.bronsoortPerSleutel.get(s) ?? "MARKTPARTIJ",
    );

    const oordeel = beoordeelNieuwswaarde({
      gebeurtenisId: g.id,
      titel: g.titel,
      gebeurtenisSoort: g.gebeurtenis_soort,
      materialiteit: g.materialiteit,
      bedrijfsrelevantie: g.bedrijfsrelevantie,
      relevantieCategorie: g.relevantie_categorie,
      clusterSleutel: g.cluster_sleutel,
      eigenaarRoute: eigenaar?.route ?? null,
      eigenaarOpIndex: eigenaar?.opIndex ?? false,
      heeftTegenspraak: g.heeft_tegenspraak,
      uitsprakenBevestigd: g.uitspraken_bevestigd,
      uitsprakenTotaal: g.uitspraken_totaal,
      besteBewijskwaliteit: g.beste_bewijskwaliteit,
      aantalOnafhankelijkeBronnen: g.onafhankelijke_bronnen,
      heeftPrimaireBron: g.heeft_primaire_bron,
      bronsoorten,
      nieuwsteBrondatum: g.nieuwste_brondatum,
      bestaandeNieuwsSlugs: opties.bestaandeNieuwsSlugs,
      vandaag,
      dragendeClaims: g.dragende_claims,
      claimsPerModaliteit: {
        VASTGESTELD: g.claims_vastgesteld,
        VOORSTEL: g.claims_voorstel,
        VERWACHTING: g.claims_verwachting,
        "zonder modaliteit": g.claims_zonder_modaliteit,
      },
      documentsoorten: g.documentsoorten,
    });

    if (oordeel.geschikt) {
      geschikt += 1;
      top.push({
        gebeurtenisId: g.id,
        titel: g.titel,
        score: oordeel.totaalscore,
        oordeel: oordeel.oordeel,
      });
    } else {
      ongeschikt += 1;
      const grond = oordeel.afwijsgronden[0] ?? "onbekend";
      /* GROEPEREN OP DE SOORT GROND, NIET OP DE MEETWAARDE.
         Eerste poging groepeerde op de letterlijke tekst, en die draagt
         het gemeten getal: "materialiteit 41 ligt onder de drempel 45"
         en "materialiteit 36 ..." werden twee gronden. Gemeten op 144
         kandidaten gaf dat achttien regels waarvan twaalf dezelfde
         grond met een ander getal — een rapport dat de lezer laat
         optellen. De getallen worden daarom genormaliseerd; de volle
         tekst mét getal blijft per kandidaat in nieuws_oordeel staan,
         waar hij wél over één geval gaat. */
      const sleutel = grond
        .split(";")[0]!
        .replace(/\d+([.,]\d+)?/g, "N")
        .slice(0, 80);
      perAfwijsgrond[sleutel] = (perAfwijsgrond[sleutel] ?? 0) + 1;
    }

    /* ALLEEN GESCHIKTE KANDIDATEN KRIJGEN EEN RIJ.
       Een rij per afgewezen gebeurtenis zou 144 kandidaten opleveren
       waarvan 142 niets kunnen worden, en het dashboard onleesbaar
       maken. De afwijsgronden worden geteld en gelogd, zodat zichtbaar
       blijft WAAROM de oogst klein is; dat is de informatie die telt. */
    if (!oordeel.geschikt || opties.droog) continue;

    await metOrganisatie(pool, { organisatieId }, async (c) => {
      const beoordeling = {
        nieuws: {
          assen: oordeel.assen,
          drempels: NIEUWSDREMPELS,
          eigenaar: eigenaar?.route ?? null,
          bronsoorten: [...new Set(bronsoorten)],
          nieuwste_brondatum: g.nieuwste_brondatum,
          vandaag,
        },
      };

      const bestaand = await eenRij<{ id: number }>(
        c,
        `select id from intel.inhoud_kandidaten
          where organisatie_id = $1 and gebeurtenis_id = $2 and motor_versie = $3`,
        [organisatieId, g.id, NIEUWSMOTOR_VERSIE],
      );

      if (bestaand) {
        /* BIJWERKEN EN NIET OVERSLAAN: de score beweegt met de
           actualiteit mee (een bericht van vandaag is morgen een dag
           ouder), dus een bestaande kandidaat hoort de nieuwe stand te
           dragen. De STATUS wordt niet aangeraakt — had een mens hem al
           afgehandeld, dan blijft dat zo. */
        await c.query(
          `update intel.inhoud_kandidaten
              set besluit = 'NEWS_ITEM',
                  beoordeling = $2,
                  totaalscore = $3,
                  nieuwsscore = $3,
                  nieuws_oordeel = $4,
                  besluit_redenen = $5,
                  onderwerp_cluster_id = $6,
                  risico_klasse = $7,
                  bijgewerkt_op = now()
            where id = $1`,
          [
            bestaand.id,
            JSON.stringify(beoordeling),
            oordeel.totaalscore,
            oordeel.oordeel,
            [oordeel.oordeel],
            g.cluster_id,
            g.risico_klasse,
          ],
        );
      } else {
        await c.query(
          `insert into intel.inhoud_kandidaten
             (organisatie_id, gebeurtenis_id, onderwerp_cluster_id, besluit, beoordeling,
              totaalscore, nieuwsscore, nieuws_oordeel, besluit_redenen, motor_versie,
              risico_klasse, status)
           values ($1,$2,$3,'NEWS_ITEM',$4,$5,$5,$6,$7,$8,$9,'open')`,
          [
            organisatieId,
            g.id,
            g.cluster_id,
            JSON.stringify(beoordeling),
            oordeel.totaalscore,
            oordeel.oordeel,
            [oordeel.oordeel],
            NIEUWSMOTOR_VERSIE,
            g.risico_klasse,
          ],
        );
      }
      geschreven += 1;
    });
  }

  top.sort((a, b) => b.score - a.score);

  log.info("nieuwsselectie gereed", {
    beoordeeld: gebeurtenissen.length,
    geschikt,
    ongeschikt,
    geschreven,
    per_afwijsgrond: perAfwijsgrond,
  });

  return {
    beoordeeld: gebeurtenissen.length,
    geschikt,
    ongeschikt,
    kandidatenGeschreven: geschreven,
    perAfwijsgrond,
    top,
  };
}
