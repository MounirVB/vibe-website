/* ============================================================
   BEDRIJFSRELEVANTIE — waar gaat Vibe Energy iets aan doen?
   ------------------------------------------------------------
   WAAROM DIT BESTAAT

   `berekenMaterialiteit()` meet hoe ZWAAR een publicatie is: hoe
   betrouwbaar de bron, hoe vers het bericht, hoeveel harde uitspraken
   eruit komen. Dat is nuttig, maar het is geen antwoord op de enige
   vraag die de gebruiker heeft: gáát dit ons aan?

   Gemeten in productie op 12 oktober 2026, over 62 gebeurtenissen:

     75  Nettarieven 2027 stijgen ...                      RELEVANT
     61  Wetsvoorstel hardere aanpak SCHADUWVLOOT          niet relevant
     61  subsidieregeling mvr                              niet relevant
     59  Slimmer stroomgebruik door HUISHOUDENS            consument
     58  Elektriciteitsbalans; aanbod en verbruik          geen handeling
     56  Realisatie zonnepanelen Limburgs Museum           RELEVANT
     51  subsidieregeling extensivering melkveehouderij    niet relevant
     51  isde wat wijzigt er 2026                          consument

   Een wetsvoorstel over maritieme handhaving scoorde dus HOGER dan een
   echte aanbesteding voor zonnepanelen bij een museum. Niet omdat de
   motor stuk is, maar omdat hij nooit is gevraagd of het onderwerp bij
   het bedrijf past.

   WAT DEZE MODULE TOEVOEGT, EN WAT HIJ BEWUST NIET DOET

   Toevoegt: een tweede, ORTHOGONALE as. Materialiteit blijft meten hoe
   zwaar iets is; `classificeer()` meet of het ons aangaat en WAT voor
   soort kans het is. De twee worden niet in één getal gepropt — §6 van
   de opdracht vraagt expliciet om aparte scores, omdat één getal elke
   onzekerheid verstopt.

   Doet niet: de vocabulairelaag overnemen. `herkenOnderwerpen()` weet
   al welke onderwerpen in een tekst zitten en weegt titel en body apart.
   Deze module leest die treffers en legt er een oordeel over. Twee
   implementaties van dezelfde woordenlijst betekent dat er een stil
   veroudert.

   DE DRIE LAGEN UIT §4 BLIJVEN GESCHEIDEN
   Feit        : welke onderwerpen staan er aantoonbaar in de tekst.
   Gevolgtrekking: welke categorie dat oplevert.
   Aanbeveling : wat de gebruiker ermee zou kunnen doen.
   `Relevantie.grondslag` draagt alle drie apart, zodat een lezer kan
   zien waaróm iets hoog of laag staat.
   ============================================================ */

import type { Onderwerp } from "../bronnen/soorten.ts";
import { isProcedureel, type OnderwerpTreffer } from "./onderwerpen.ts";

/**
 * De zes categorieën uit §9.
 *
 * `achtergrond` bestaat omdat de opdracht expliciet zegt: gooi iets niet
 * weg alleen omdat het niet meteen commercieel is. CBS-reeksen en
 * dagprijzen horen niet bovenaan, maar ze horen wel vindbaar te blijven.
 */
export type Categorie =
  | "commerciele_kans"
  | "redactionele_kans"
  | "regelgeving"
  | "marktintelligentie"
  | "achtergrond"
  | "niet_relevant";

export const CATEGORIE_LABEL: Record<Categorie, string> = {
  commerciele_kans: "Commerciële kans",
  redactionele_kans: "Redactionele kans",
  regelgeving: "Regelgeving",
  marktintelligentie: "Marktinformatie",
  achtergrond: "Achtergrond",
  niet_relevant: "Niet relevant",
};

/**
 * Hoe dicht staat een onderwerp bij wat Vibe Energy verkoopt?
 *
 * KERN      het onderwerp IS de propositie: opslag, EMS, congestie,
 *           flexibiliteit, laadinfrastructuur.
 * NABIJ     het raakt de businesscase rechtstreeks: nettarieven,
 *           netbeheer, zonnestroom, vastgoedverduurzaming, subsidie.
 * CONTEXT   het is de markt waarin dat speelt, zonder eigen handeling:
 *           prijzen, statistiek, geografie.
 * VORM      het zegt alleen welke SOORT publicatie dit is.
 */
const KERN: readonly Onderwerp[] = ["bess", "ems", "netcongestie", "flexibiliteit", "laadinfrastructuur"];
const NABIJ: readonly Onderwerp[] = ["netbeheer", "zonne-energie", "vastgoedverduurzaming", "subsidie", "regelgeving"];
const CONTEXT: readonly Onderwerp[] = ["marktprijs", "statistiek", "geografie"];

const GEWICHT: Record<string, number> = { kern: 26, nabij: 13, context: 4, vorm: 0 };

function laagVan(o: Onderwerp): "kern" | "nabij" | "context" | "vorm" {
  if (KERN.includes(o)) return "kern";
  if (NABIJ.includes(o)) return "nabij";
  if (CONTEXT.includes(o)) return "context";
  return "vorm";
}

/**
 * NEGATIEVE CRITERIA — §9 vraagt er expliciet om.
 *
 * Elk patroon hieronder is afgeleid van een ECHTE productietitel die te
 * hoog stond. Dat is bewust: een negatieve lijst die uit de duim komt,
 * dempt morgen het verkeerde.
 *
 * `hard` betekent: dit onderwerp valt buiten het domein, hoe vaak het
 * woord 'subsidie' er ook bij staat. `zacht` betekent: het is energie,
 * maar niet onze doelgroep of niet onze handeling — dan daalt het naar
 * marktinformatie of achtergrond in plaats van naar nul.
 */
type Demper = {
  readonly patroon: RegExp;
  readonly soort: "hard" | "zacht";
  readonly reden: string;
  readonly voorbeeld: string;
};

const DEMPERS: readonly Demper[] = [
  {
    patroon: /\bschaduwvloot|\bscheepvaart|\bzeevaart|\bmaritiem|\bvisserij|\bhavenstaat/iu,
    soort: "hard",
    reden: "maritieme handhaving of scheepvaart; geen raakvlak met energie-infrastructuur achter de meter",
    voorbeeld: "Wetsvoorstel voor hardere aanpak schaduwvloot naar Tweede Kamer (stond op 61)",
  },
  {
    patroon: /\bmelkveehouderij|\bveehouderij|\bakkerbouw|\bglastuinbouw\b(?!.*(warmte|wkk|net))|\bstikstofruimte|\bmestbeleid|\bextensivering/iu,
    soort: "hard",
    reden: "landbouwregeling zonder energiecomponent",
    voorbeeld: "subsidieregeling extensivering melkveehouderij sem (stond op 51)",
  },
  {
    patroon: /\bisde\b|\bwarmtepompsubsidie|\bparticuliere?\b|\bconsumenten?\b|\bwoningeigenaren|\bhuiseigenaren/iu,
    soort: "hard",
    reden: "regeling of doelgroep voor particulieren; Vibe Energy is B2B (Vibe Home doet consument)",
    voorbeeld: "isde wat wijzigt er 2026 (stond op 51)",
  },
  {
    patroon: /\bwarmtenet|\bnieuwe warmte\b|\bstadsverwarming|\bwarmtetransitie\b/iu,
    soort: "zacht",
    reden: "warmtenetten liggen buiten de propositie (elektriciteit achter de meter), maar wel in dezelfde markt",
    voorbeeld: "subsidieregeling nieuwe warmte nu (werd een redactionele kans)",
  },
  {
    patroon: /\bhuishoudens?\b|\bbewoners\b|\bwoningbouw\b/iu,
    soort: "zacht",
    reden: "huishoudens zijn geen doelgroep, maar netruimte die daardoor vrijkomt is wel context",
    voorbeeld: "Slimmer stroomgebruik door huishoudens creëert ruimte op het net (stond op 59)",
  },
];

/**
 * Titels zonder eigen inhoud.
 *
 * Gemeten: 'laadinfrastructuur', 'jaarcijfers 2025' en
 * 'subsidieregeling mvr' zijn volledige gebeurtenistitels in productie.
 * Zo'n titel kan geen kans dragen: er staat niets in om op te handelen.
 */
const INHOUDSLOOS = /^[\p{L}\s/+-]{0,28}$/u;

/** Een reeks die zich blijft herhalen, zoals een dagprijs of een CBS-tabel. */
const REEKS = /day-ahead|\bbalans;|\bjaarcijfers\b|\bmaandcijfers\b|aanbod en verbruik/iu;

export type Relevantie = {
  readonly categorie: Categorie;
  /** 0-100: hoe dicht staat dit bij wat Vibe Energy doet? */
  readonly bedrijfsrelevantie: number;
  /** 0-100: hoe zeker is die inschatting, gegeven het bewijs? */
  readonly vertrouwen: number;
  /** Eén regel die een mens kan navertellen. */
  readonly uitleg: string;
  /** De drie lagen uit §4, apart. */
  readonly grondslag: {
    readonly feiten: readonly string[];
    readonly gevolgtrekkingen: readonly string[];
    readonly dempers: readonly string[];
  };
};

export type ClassificatieInvoer = {
  readonly titel: string;
  readonly tekst?: string;
  readonly onderwerpen: readonly OnderwerpTreffer[];
  /** Soort uit markt_gebeurtenissen; 'aanbesteding' weegt zwaar. */
  readonly gebeurtenisSoort?: string;
  /** Aantal geverifieerde uitspraken; bewijs maakt een kans hard. */
  readonly geverifieerdeUitspraken?: number;
};

/**
 * Classificeert één ontwikkeling.
 *
 * Deterministisch en zonder database of netwerk, zodat hij in een
 * eenheidstoets tegen echte productietitels te houden is.
 */
export function classificeer(inv: ClassificatieInvoer): Relevantie {
  const titel = inv.titel ?? "";
  const volledig = `${titel}\n${inv.tekst ?? ""}`;
  const feiten: string[] = [];
  const gevolgtrekkingen: string[] = [];
  const dempers: string[] = [];

  /* ---------- 1. de positieve kant ---------- */
  const inhoudelijk = inv.onderwerpen.filter((t) => !isProcedureel(t.onderwerp));
  const lagen = inhoudelijk.map((t) => ({ t, laag: laagVan(t.onderwerp) }));
  const kern = lagen.filter((x) => x.laag === "kern");
  const nabij = lagen.filter((x) => x.laag === "nabij");
  const context = lagen.filter((x) => x.laag === "context");

  let score = 0;
  for (const { t, laag } of lagen) {
    score += GEWICHT[laag] ?? 0;
    feiten.push(`onderwerp '${t.onderwerp}' (${laag}) via ${t.termen.slice(0, 3).join(", ")}`);
  }
  /* Een aanbesteding is een handelingsmoment, geen onderwerp. Dat weegt
     apart, want juist die stonden te laag. */
  const isAanbesteding = inv.gebeurtenisSoort === "aanbesteding";
  if (isAanbesteding) {
    score += 22;
    feiten.push("gebeurtenissoort 'aanbesteding': een openbaar inkoopmoment");
  }
  if ((inv.geverifieerdeUitspraken ?? 0) > 0) {
    score += Math.min(8, (inv.geverifieerdeUitspraken ?? 0) * 4);
    feiten.push(`${inv.geverifieerdeUitspraken} geverifieerde uitspraak/uitspraken`);
  }
  score = Math.min(100, score);

  /* ---------- 2. de negatieve kant ---------- */
  let hardGedempt = false;
  let zachtGedempt = false;
  for (const d of DEMPERS) {
    if (!d.patroon.test(volledig)) continue;
    dempers.push(`${d.soort}: ${d.reden}`);
    if (d.soort === "hard") hardGedempt = true;
    else zachtGedempt = true;
  }

  const leegTitel = INHOUDSLOOS.test(titel.trim()) && !inv.tekst;
  if (leegTitel) {
    dempers.push("de titel draagt geen eigen inhoud; er is niets om op te handelen");
  }
  const isReeks = REEKS.test(titel);
  if (isReeks) {
    dempers.push("herhalende reeks (dagprijs of periodieke tabel), geen losse ontwikkeling");
  }

  /* ---------- 3. de categorie ---------- */
  /* De volgorde is de beslisboom, en elke stap heeft een reden. */
  let categorie: Categorie;

  if (hardGedempt && kern.length === 0) {
    /* Buiten het domein EN geen enkel kernonderwerp: dit gaat ons niet
       aan, ook al staat er 'subsidie' in de titel. */
    categorie = "niet_relevant";
    score = Math.min(score, 12);
    gevolgtrekkingen.push("buiten het domein zonder kernonderwerp: niet relevant");
  } else if (isAanbesteding && (kern.length > 0 || nabij.length > 0)) {
    categorie = "commerciele_kans";
    gevolgtrekkingen.push("een inkoopmoment met een onderwerp dat bij de propositie past");
  } else if (isReeks || leegTitel) {
    categorie = "achtergrond";
    score = Math.min(score, 30);
    gevolgtrekkingen.push("wel bruikbaar als context, maar er valt niets op te besluiten");
  } else if (zachtGedempt) {
    categorie = "marktintelligentie";
    score = Math.min(score, 45);
    gevolgtrekkingen.push("energierelevant maar buiten de doelgroep: marktinformatie");
  } else if (kern.length > 0 && (inv.geverifieerdeUitspraken ?? 0) > 0) {
    categorie = "redactionele_kans";
    gevolgtrekkingen.push("kernonderwerp met geverifieerd bewijs: geschikt voor inhoud");
  } else if (nabij.some((x) => x.t.onderwerp === "subsidie" || x.t.onderwerp === "netbeheer")) {
    /* Een B2B-regeling of een tariefwijziging is precies het soort
       ontwikkeling waar een ondernemer naar zoekt. */
    categorie = "redactionele_kans";
    gevolgtrekkingen.push("regeling of tariefwijziging die de businesscase van een ondernemer raakt");
  } else if (nabij.some((x) => x.t.onderwerp === "regelgeving")) {
    categorie = "regelgeving";
    gevolgtrekkingen.push("regelgeving die commerciële energie-infrastructuur kan raken");
  } else if (kern.length > 0 || nabij.length > 0) {
    categorie = "marktintelligentie";
    gevolgtrekkingen.push("relevant onderwerp, maar zonder eigen handelingsmoment");
  } else if (context.length > 0) {
    categorie = "achtergrond";
    score = Math.min(score, 30);
    gevolgtrekkingen.push("marktcontext zonder directe relevantie");
  } else {
    categorie = "niet_relevant";
    score = Math.min(score, 10);
    gevolgtrekkingen.push("geen enkel onderwerp uit de propositie gevonden");
  }

  /* ---------- 4. vertrouwen, apart van relevantie ---------- */
  /* §6: onzekerheid hoort niet in de relevantiescore verstopt te worden.
     Weinig tekst betekent een onzekere inschatting, niet een lage
     relevantie — dat zijn twee verschillende dingen. */
  let vertrouwen = 40;
  if ((inv.tekst ?? "").length > 400) vertrouwen += 25;
  else if ((inv.tekst ?? "").length > 0) vertrouwen += 10;
  else {
    grondslagLeeg(dempers);
  }
  if (inhoudelijk.length >= 2) vertrouwen += 15;
  if ((inv.geverifieerdeUitspraken ?? 0) > 0) vertrouwen += 15;
  if (leegTitel) vertrouwen -= 20;
  vertrouwen = Math.max(5, Math.min(100, vertrouwen));

  const uitleg = bouwUitleg(categorie, score, kern, nabij, dempers, isAanbesteding);

  return {
    categorie,
    bedrijfsrelevantie: score,
    vertrouwen,
    uitleg,
    grondslag: { feiten, gevolgtrekkingen, dempers },
  };
}

function grondslagLeeg(dempers: string[]): void {
  dempers.push("geen brontekst beschikbaar; de inschatting rust alleen op de titel");
}

function bouwUitleg(
  categorie: Categorie,
  score: number,
  kern: readonly { t: OnderwerpTreffer }[],
  nabij: readonly { t: OnderwerpTreffer }[],
  dempers: readonly string[],
  isAanbesteding: boolean,
): string {
  const delen: string[] = [`${CATEGORIE_LABEL[categorie]} (${score}/100)`];
  if (isAanbesteding) delen.push("openbaar inkoopmoment");
  if (kern.length) delen.push(`kernonderwerp: ${kern.map((x) => x.t.onderwerp).join(", ")}`);
  else if (nabij.length) delen.push(`aanpalend: ${nabij.map((x) => x.t.onderwerp).join(", ")}`);
  if (dempers.length) delen.push(`gedempt omdat ${dempers[0]!.replace(/^(hard|zacht): /, "")}`);
  return delen.join(" — ");
}

/** Categorieën die de gebruiker standaard wil zien. */
export function isActiegericht(c: Categorie): boolean {
  return c === "commerciele_kans" || c === "redactionele_kans" || c === "regelgeving";
}
