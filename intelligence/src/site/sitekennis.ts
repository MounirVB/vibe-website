/* ============================================================
   SITEKENNIS — de website zoals de intelligencelaag hem mag kennen
   ------------------------------------------------------------
   HET PROBLEEM DAT DEZE LAAG OPLOST

   De Railway-services draaien met rootDirectory=intelligence. De
   bouwcontext is dus alleen die map, en de 447 HTML-bestanden van de
   website zitten er niet in. Gemeten in de productiecontainer:

     INTEL_SITE_WORTEL   leeg
     /app/kennis         bestaat niet
     sitemap.xml         niet gevonden

   Daardoor gaf scanSite() nul pagina's, hadden de onderwerpclusters geen
   canonieke pagina, en stelde de besluitmotor NEW_ARTICLE voor (13) in
   plaats van UPDATE_EXISTING (0) — voor onderwerpen die al een pagina
   hebben. Content Studio had geen enkel beoordeelbaar voorstel.

   WAAROM NIET DE HELE REPO IN DE CONTAINER

   Dat zou de interne laag en de brondata meeleveren aan een service die
   ze niet nodig heeft, en de bouwcontext van 8 MB naar 128 MB tillen.
   De editorial analyse heeft de HTML niet nodig; ze heeft FEITEN OVER
   de pagina's nodig: welke bestaan er, wat is hun canonieke URL, welk
   onderwerp bezitten ze, waar gaan ze expliciet NIET over.

   DAAROM EEN ARTEFACT

   Eén JSON-bestand onder intelligence/data/, gegenereerd uit de
   bestaande Release 1-bronnen (de sitescan plus het routeregister),
   schemagevalideerd, met een inhoudshash, en gecommit zodat het
   meereist in de bouwcontext van precies dezelfde commit als de code.

   Dat laatste is de versiegarantie: het artefact en de website komen
   uit één commit. Een CI-poort regenereert het artefact en vergelijkt
   byte voor byte; wie de site wijzigt zonder te regenereren, wordt daar
   rood. Zo kan het artefact niet stil verouderen.

   WAT ER NIET IN GAAT

   Geen geheimen, geen interne broncode, geen PENDING-routes als
   gepubliceerde pagina, geen noindex-pagina's en geen redirect-stubs.
   Het artefact staat onder intelligence/ en die map is in railpack
   `exclude` uitgesloten van de websitebouw, dus hij is niet publiek
   opvraagbaar. `scripts/publiek-artefact.mjs` bewaakt dat.
   ============================================================ */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { normaliseerTekst } from "../kern/tekst.ts";
import { herkenOnderwerpen, vocabulaireTermen } from "../pijplijn/onderwerpen.ts";
import { FENOMEEN_ZINSVORM } from "../pijplijn/verwoord.ts";
import { scanSite, type GescandePagina } from "./paginascan.ts";

/**
 * Verhoog dit bij elke wijziging in de VORM van het artefact.
 *
 * Schema 2 voegde `secties` toe (kop plus eigen tekst). Tijdens die
 * wijziging bleef het oude artefact even staan, en een lezer die
 * `secties` verwachtte liep op een undefined stuk in plaats van een
 * nette weigering. Precies daarvoor is dit nummer er: een artefact met
 * een ander schema wordt geweigerd en niet half gelezen.
 */
export const SITEKENNIS_SCHEMA = 3;

/** Waar het artefact staat, relatief aan de intelligence-map. */
export const SITEKENNIS_PAD = "data/sitekennis.json";

export type KennisPagina = {
  /** Het publieke pad, met leidende slash. */
  readonly route: string;
  /** De canonieke URL zoals de pagina hem zelf opgeeft. */
  readonly canoniekeUrl: string | null;
  /** Alleen 'gepubliceerd' komt in dit artefact; het veld staat er voor de lezer. */
  readonly staat: "gepubliceerd";
  readonly soort: string;
  readonly titel: string | null;
  readonly h1: string | null;
  /**
   * De hoofdtekst, begrensd. Genoeg om te beoordelen of een pagina een
   * onderwerp dekt; niet de hele pagina, want dit artefact is geen kopie
   * van de website.
   */
  readonly tekst: string;
  readonly woorden: number;
  /** sha256 over de VOLLEDIGE genormaliseerde tekst, niet over het fragment. */
  readonly vingerafdruk: string;
  /**
   * Het voorbehoud dat de pagina zelf publiceert over zijn scope.
   * Dit veld heeft tien van de negentien voorstellen omgeleid: een
   * pagina die zegt dat tarieven elders staan, hoort geen tariefbedrag
   * te krijgen.
   */
  readonly voorbehoud: string | null;
  /**
   * De secties MET hun eigen tekst.
   *
   * Eerst stond hier alleen een lijst koppen en één afgekapte blob
   * hoofdtekst. Een voorstel dat zei "voeg dit toe aan sectie X" liet
   * dan de OPENING van de pagina zien als 'voor', want de kop van X
   * stond voorbij de afkapgrens. Een reviewer kreeg daarmee de verkeerde
   * vergelijking te zien, en dat is erger dan geen vergelijking.
   */
  readonly secties: readonly { readonly kop: string; readonly tekst: string }[];
  readonly sectiekoppen: readonly string[];
  /** Interne links die deze pagina uitgaand heeft. */
  readonly interneLinks: readonly string[];
  /** Herkende onderwerpen, sterkste eerst. */
  /**
   * Hoe vaak de pagina elk vocabulairewoord noemt, geteld over de
   * VOLLEDIGE paginatekst.
   *
   * Waarom dit bestaat: `tekst` en `secties[].tekst` zijn afgekapt om
   * het artefact klein te houden. De voorstelmotor telde termen in die
   * afgekapte tekst en concludeerde dat /kennis/businesscase-batterij
   * het woord 'nettarief' nul keer noemt, terwijl de pagina er vijf
   * vermeldingen van heeft — alleen voorbij de knipgrens. Daarop werd
   * een feit afgewezen dat gewoon op een andere pagina hoorde.
   *
   * Alleen vocabulairewoorden, want dat zijn de enige woorden waarop de
   * motor ooit zoekt; alleen waarden boven nul, zodat het artefact niet
   * volloopt met nullen.
   */
  readonly termfrequenties: Readonly<Record<string, number>>;
  readonly onderwerpen: readonly string[];
  /** Welke Vibe-oplossingsfamilies dit raakt. Interpretatie, geen bronfeit. */
  readonly oplossingen: readonly string[];
};

export type Sitekennis = {
  readonly schema: number;
  /** sha256 over de pagina's; de identiteit van deze momentopname. */
  readonly websiteVersie: string;
  /** Het `_gegenereerd`-veld uit routes.json, als dat er is. */
  readonly routesGegenereerd: string | null;
  readonly aantalPaginas: number;
  readonly paginas: readonly KennisPagina[];
};

/** Het artefact zoals het op schijf staat: kennis plus zijn eigen hash. */
export type SitekennisBestand = Sitekennis & {
  /** sha256 over de gecanonicaliseerde kennis zonder dit veld. */
  readonly inhoudsHash: string;
};

const OPLOSSING_PER_ONDERWERP: Readonly<Record<string, readonly string[]>> = {
  bess: ["batterijopslag", "energiemanagement"],
  ems: ["energiemanagement"],
  netcongestie: ["batterijopslag", "netaansluiting", "energiemanagement"],
  flexibiliteit: ["batterijopslag", "energiemanagement"],
  laadinfrastructuur: ["laadinfrastructuur"],
  "zonne-energie": ["zonnestroom"],
  netbeheer: ["netaansluiting"],
  rendement: ["batterijopslag"],
  vastgoedverduurzaming: ["energielabel", "zonnestroom"],
};

/**
 * De woorden waarop de sitekennis frequenties bijhoudt: het
 * onderwerpvocabulaire plus de fenomeensleutels van de uitspraaklaag.
 * Enkelvoud dekt het meervoud, want er wordt op deelstring geteld
 * ('nettarief' telt ook in 'nettarieven'); korte woorden blijven eruit
 * omdat die in willekeurige samenstellingen opduiken.
 */
const INDEXTERMEN: readonly string[] = [
  ...new Set([...vocabulaireTermen(), ...Object.keys(FENOMEEN_ZINSVORM)].map((t) => t.toLowerCase())),
]
  .filter((t) => t.length >= 4)
  .sort();

/** Telt de indextermen in de volledige paginatekst. Nullen blijven weg. */
export function telIndextermen(volledigeTekst: string): Record<string, number> {
  const alles = volledigeTekst.toLowerCase();
  const uit: Record<string, number> = {};
  for (const t of INDEXTERMEN) {
    const n = alles.split(t).length - 1;
    if (n > 0) uit[t] = n;
  }
  return uit;
}

const TEKST_LIMIET = 1500;
const SECTIE_LIMIET = 500;

function tekstUit(html: string): string {
  return normaliseerTekst(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function eerste(html: string, patroon: RegExp): string | null {
  const m = patroon.exec(html);
  return m?.[1] ? normaliseerTekst(m[1].replace(/<[^>]+>/g, " ")) : null;
}

function alle(html: string, patroon: RegExp, groep = 1): string[] {
  const uit: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(patroon.source, patroon.flags.includes("g") ? patroon.flags : `${patroon.flags}g`);
  while ((m = re.exec(html)) !== null) {
    const v = m[groep];
    if (v) uit.push(v);
  }
  return uit;
}

/**
 * Het voorbehoud van de pagina.
 *
 * Eerst uit de JSON-bron (`direct_antwoord.voorbehoud`), want die is
 * gestructureerd. Is die er niet, dan uit de HTML via de klasse die de
 * generator eraan geeft.
 */
async function voorbehoudVan(repoWortel: string, route: string, html: string): Promise<string | null> {
  const m = /^\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(route);
  const enkel = /^\/([a-z0-9-]+)$/.exec(route);
  const kandidaten = m
    ? [join(repoWortel, "data", "inhoud", m[1]!, `${m[2]!}.json`)]
    : enkel
      ? [
          join(repoWortel, "data", "inhoud", "hub", `${enkel[1]!}.json`),
          join(repoWortel, "data", "inhoud", "pagina", `${enkel[1]!}.json`),
        ]
      : [];
  for (const p of kandidaten) {
    try {
      const bron = JSON.parse(await readFile(p, "utf8")) as {
        direct_antwoord?: { voorbehoud?: string };
      };
      if (bron.direct_antwoord?.voorbehoud) return normaliseerTekst(bron.direct_antwoord.voorbehoud);
    } catch {
      /* volgende kandidaat */
    }
  }
  const uitHtml = eerste(html, /class=["'][^"']*voorbehoud[^"']*["'][^>]*>([\s\S]{0,600}?)<\//i);
  return uitHtml && uitHtml.length > 20 ? uitHtml : null;
}

/** Canonicaliseert voor hashing: sleutels gesorteerd, geen witruimteverschillen. */
function canoniek(waarde: unknown): string {
  if (waarde === null || typeof waarde !== "object") return JSON.stringify(waarde) ?? "null";
  if (Array.isArray(waarde)) return `[${waarde.map(canoniek).join(",")}]`;
  const o = waarde as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canoniek(o[k])}`)
    .join(",")}}`;
}

export function hashVan(kennis: Sitekennis): string {
  return createHash("sha256").update(canoniek(kennis), "utf8").digest("hex");
}

/**
 * Bouwt het artefact uit de werkelijke website.
 *
 * Draait waar de site BESTAAT: lokaal en in CI. De productiecontainer
 * leest het resultaat, hij bouwt het niet.
 */
export async function bouwSitekennis(repoWortel: string): Promise<SitekennisBestand> {
  const scan = await scanSite(repoWortel);

  /* ALLEEN GEPUBLICEERDE CANONIEKE PAGINA'S.
     Een redirect-stub, een noindex-pagina of een pagina die niet in de
     sitemap staat is geen gepubliceerde pagina en mag dus nooit een
     doelpagina voor een voorstel worden. */
  const gepubliceerd = scan.paginas.filter(
    (p: GescandePagina) => p.indexeerbaar && !p.isRedirectStub && p.inSitemap,
  );

  const paginas: KennisPagina[] = [];
  for (const p of gepubliceerd) {
    const html = await readFile(join(repoWortel, p.bestandsnaam), "utf8");
    const volledig = tekstUit(html);
    const h1 = eerste(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
    /* Secties met hun eigen tekst: knip de HTML op de h2's en haal per
       blok de tekst eruit. Zo hoort 'voor' bij de juiste sectie. */
    const blokken = html.split(/(?=<h2[\s>])/i);
    const ruweSecties: { kop: string; tekst: string }[] = [];
    for (const blok of blokken) {
      const kop = eerste(blok, /<h2[^>]*>([\s\S]*?)<\/h2>/i);
      if (!kop) continue;
      const zonderKop = blok.replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, " ");
      ruweSecties.push({ kop, tekst: tekstUit(zonderKop).slice(0, SECTIE_LIMIET) });
    }
    const koppen = ruweSecties.map((x) => x.kop);
    const links = [
      ...new Set(
        alle(html, /<a[^>]+href=["'](\/[^"'#?]*)["']/i)
          .map((h) => h.replace(/\/+$/, "") || "/")
          .filter((h) => h !== p.pad),
      ),
    ].slice(0, 25);

    const treffers = herkenOnderwerpen(p.titel ?? "", `${h1 ?? ""} ${volledig}`);
    const onderwerpen = treffers.map((t) => t.onderwerp).slice(0, 6);
    const oplossingen = [
      ...new Set(onderwerpen.flatMap((o) => OPLOSSING_PER_ONDERWERP[o] ?? [])),
    ];

    paginas.push({
      route: p.pad,
      canoniekeUrl: p.canoniek,
      staat: "gepubliceerd",
      soort: p.soort,
      titel: p.titel,
      h1,
      tekst: onderwerpen.length > 0 ? volledig.slice(0, TEKST_LIMIET) : volledig.slice(0, 300),
      woorden: p.woorden,
      vingerafdruk: createHash("sha256").update(volledig, "utf8").digest("hex"),
      voorbehoud: await voorbehoudVan(repoWortel, p.pad, html),
      /* SECTIETEKST ALLEEN WAAR HIJ IETS KAN DOEN.
         Een pagina zonder herkend onderwerp wordt nooit een doelpagina
         voor een redactioneel voorstel, dus zijn sectietekst zou dood
         gewicht zijn. Gemeten: met tekst voor alle 430 pagina's werd het
         artefact 3,9 MB; met tekst alleen voor de pagina's met een
         onderwerp blijft de volledige editorial functie overeind bij een
         fractie daarvan. De koppen blijven er wel voor ALLE pagina's,
         want die zijn klein en maken de structuur navraagbaar. */
      secties:
        onderwerpen.length > 0
          ? ruweSecties.slice(0, 12)
          : ruweSecties.slice(0, 12).map((x) => ({ kop: x.kop, tekst: "" })),
      sectiekoppen: koppen.slice(0, 15),
      interneLinks: links,
      termfrequenties: telIndextermen(`${p.titel ?? ""} ${h1 ?? ""} ${volledig}`),
      onderwerpen,
      oplossingen,
    });
  }

  paginas.sort((a, b) => a.route.localeCompare(b.route));

  let routesGegenereerd: string | null = null;
  try {
    const r = JSON.parse(
      await readFile(join(repoWortel, "data", "seo", "routes.json"), "utf8"),
    ) as { _gegenereerd?: string };
    routesGegenereerd = r._gegenereerd ?? null;
  } catch {
    /* geen routeregister; het artefact kan nog steeds kloppen */
  }

  /* De websiteversie is een hash over de IDENTITEIT van de pagina's, niet
     over het hele artefact. Zo verandert hij als de site verandert en
     niet als dit bestandsformaat verandert. */
  const websiteVersie = createHash("sha256")
    .update(paginas.map((p) => `${p.route}:${p.vingerafdruk}`).join("\n"), "utf8")
    .digest("hex");

  const kennis: Sitekennis = {
    schema: SITEKENNIS_SCHEMA,
    websiteVersie,
    routesGegenereerd,
    aantalPaginas: paginas.length,
    paginas,
  };
  return { ...kennis, inhoudsHash: hashVan(kennis) };
}

/* ------------------------------------------------------------------
   Lezen, valideren en versie vergelijken — FAALT DICHT
   ------------------------------------------------------------------ */

export type KennisFout =
  | { readonly soort: "ontbreekt"; readonly bericht: string }
  | { readonly soort: "onleesbaar"; readonly bericht: string }
  | { readonly soort: "schema"; readonly bericht: string }
  | { readonly soort: "hash"; readonly bericht: string }
  | { readonly soort: "verouderd"; readonly bericht: string };

export type KennisUitslag =
  | { readonly ok: true; readonly kennis: SitekennisBestand }
  | { readonly ok: false; readonly fout: KennisFout };

function valideer(waarde: unknown): string | null {
  if (typeof waarde !== "object" || waarde === null) return "het artefact is geen object";
  const k = waarde as Partial<SitekennisBestand>;
  if (typeof k.schema !== "number") return "veld 'schema' ontbreekt of is geen getal";
  if (k.schema !== SITEKENNIS_SCHEMA) {
    return `schema ${k.schema} hoort ${SITEKENNIS_SCHEMA} te zijn`;
  }
  if (typeof k.websiteVersie !== "string" || !/^[0-9a-f]{64}$/.test(k.websiteVersie)) {
    return "veld 'websiteVersie' is geen sha256";
  }
  if (typeof k.inhoudsHash !== "string" || !/^[0-9a-f]{64}$/.test(k.inhoudsHash)) {
    return "veld 'inhoudsHash' is geen sha256";
  }
  if (!Array.isArray(k.paginas)) return "veld 'paginas' is geen lijst";
  if (k.aantalPaginas !== k.paginas.length) {
    return `aantalPaginas ${k.aantalPaginas} wijkt af van het werkelijke aantal ${k.paginas.length}`;
  }
  if (k.paginas.length === 0) return "het artefact bevat nul pagina's";
  for (const [i, p] of k.paginas.entries()) {
    const pg = p as Partial<KennisPagina>;
    if (typeof pg.route !== "string" || !pg.route.startsWith("/")) {
      return `pagina ${i} heeft geen geldige route`;
    }
    if (pg.staat !== "gepubliceerd") {
      return `pagina ${pg.route} heeft staat '${pg.staat}'; alleen 'gepubliceerd' mag in dit artefact`;
    }
    if (typeof pg.vingerafdruk !== "string" || !/^[0-9a-f]{64}$/.test(pg.vingerafdruk)) {
      return `pagina ${pg.route} heeft geen geldige vingerafdruk`;
    }
    /* Elk veld dat een lezer ZONDER vangnet gebruikt, moet hier worden
       afgedwongen. Anders verschuift een schemafout naar een crash in de
       laag die het veld leest. */
    if (!Array.isArray(pg.secties)) return `pagina ${pg.route} mist het veld 'secties'`;
    if (!Array.isArray(pg.sectiekoppen)) return `pagina ${pg.route} mist 'sectiekoppen'`;
    if (!Array.isArray(pg.interneLinks)) return `pagina ${pg.route} mist 'interneLinks'`;
    if (!Array.isArray(pg.onderwerpen)) return `pagina ${pg.route} mist 'onderwerpen'`;
    if (typeof pg.tekst !== "string") return `pagina ${pg.route} mist 'tekst'`;
  }
  return null;
}

/**
 * Leest en valideert het artefact.
 *
 * FAALT DICHT. Elke fout levert een expliciete uitslag op in plaats van
 * een lege scan. Dat is het hele punt: een lege scan zag eruit als "de
 * site heeft geen pagina's" en leidde tot NEW_ARTICLE voor alles. Een
 * weigering is zichtbaar, een lege lijst niet.
 */
export async function leesSitekennis(
  intelligenceWortel: string,
  verwachteWebsiteVersie?: string,
): Promise<KennisUitslag> {
  const pad = join(intelligenceWortel, SITEKENNIS_PAD);
  let ruw: string;
  try {
    ruw = await readFile(pad, "utf8");
  } catch (e) {
    return {
      ok: false,
      fout: {
        soort: "ontbreekt",
        bericht:
          `het sitekennis-artefact is niet gevonden op ${pad}. Zonder dat artefact kan de ` +
          `besluitmotor geen bestaande pagina's zien en zou hij voor elk onderwerp een NIEUW ` +
          `artikel voorstellen. Draai 'npm run sitekennis' in een checkout met de website erin. ` +
          `(${(e as Error).message})`,
      },
    };
  }

  let ontleed: unknown;
  try {
    ontleed = JSON.parse(ruw);
  } catch (e) {
    return {
      ok: false,
      fout: { soort: "onleesbaar", bericht: `het artefact is geen geldige JSON: ${(e as Error).message}` },
    };
  }

  const schemaFout = valideer(ontleed);
  if (schemaFout) return { ok: false, fout: { soort: "schema", bericht: schemaFout } };

  const bestand = ontleed as SitekennisBestand;
  const { inhoudsHash, ...kennis } = bestand;
  const herberekend = hashVan(kennis as Sitekennis);
  if (herberekend !== inhoudsHash) {
    return {
      ok: false,
      fout: {
        soort: "hash",
        bericht:
          `de inhoudshash klopt niet: opgeslagen ${inhoudsHash.slice(0, 12)}…, herberekend ` +
          `${herberekend.slice(0, 12)}…. Het artefact is na generatie gewijzigd.`,
      },
    };
  }

  if (verwachteWebsiteVersie && verwachteWebsiteVersie !== bestand.websiteVersie) {
    return {
      ok: false,
      fout: {
        soort: "verouderd",
        bericht:
          `het artefact beschrijft websiteversie ${bestand.websiteVersie.slice(0, 12)}… terwijl de ` +
          `website op ${verwachteWebsiteVersie.slice(0, 12)}… staat. Regenereer het artefact; ` +
          `doorgaan zou voorstellen op verouderde pagina's baseren.`,
      },
    };
  }

  return { ok: true, kennis: bestand };
}

/** De gepubliceerde routes, als set. Handig voor de besluitmotor. */
export function gepubliceerdeRoutes(kennis: Sitekennis): Set<string> {
  return new Set(kennis.paginas.map((p) => p.route));
}

/** Zoekt een pagina op route. */
export function paginaVan(kennis: Sitekennis, route: string): KennisPagina | null {
  const schoon = route.replace(/\/+$/, "") || "/";
  return kennis.paginas.find((p) => p.route === schoon) ?? null;
}
