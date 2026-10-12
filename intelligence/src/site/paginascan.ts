/* ============================================================
   SITE — het pagina-register vullen uit gemeten feiten
   ------------------------------------------------------------
   Het pagina-register bepaalt wie welke URL bezit. Dat mag niet op
   aannames rusten, dus wordt het gescand: welke .html staat er in de
   worktree, wat zit er in de head, en staat de URL in sitemap.xml.

   Gemeten contract van deze site (10 okt 2026):
   - 51 .html in de wortel = 35 echte pagina's + 16 meta-refresh-stubs;
   - publieke URL's zijn extensieloos, bestanden houden .html;
   - alleen index.html heeft <!--SEO-FOUNDATION-->-markers;
   - sitemap.xml is handgeschreven, 34 locs, zonder lastmod.

   Alles wat deze scan vindt krijgt eigenaar_release='release1' en
   beheer='handmatig'. Release 2 claimt niets wat al bestaat.
   ============================================================ */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { normaliseerTekst } from "../kern/tekst.ts";

export type PaginaSoort =
  | "home"
  | "systeem"
  | "oplossing"
  | "sector"
  | "project"
  | "kennis"
  | "nieuws"
  | "regio"
  | "juridisch"
  | "overig";

export type GescandePagina = {
  readonly bestandsnaam: string;
  /** Extensieloos publiek pad, met leidende slash. '/' voor de home. */
  readonly pad: string;
  readonly soort: PaginaSoort;
  readonly titel: string | null;
  readonly metaOmschrijving: string | null;
  readonly canoniek: string | null;
  readonly robots: string | null;
  readonly indexeerbaar: boolean;
  readonly isRedirectStub: boolean;
  readonly heeftOgImage: boolean;
  readonly heeftJsonLd: boolean;
  readonly heeftSeoMarkers: boolean;
  readonly dataPagina: string | null;
  readonly heeftChrome: boolean;
  readonly woorden: number;
  readonly inSitemap: boolean;
};

function soortVan(relatiefPad: string): PaginaSoort {
  const naam = relatiefPad.replace(/\\/g, "/").replace(/\.html$/i, "");
  if (naam === "index") return "home";
  /* De MAP bepaalt de soort zodra de pagina er in zit. Dit stond alleen
     op een bestandsnaam en kende dus geen submappen; met 370 pagina's
     onder kennis/, regios/, sectoren/ en toepassingen/ is dat het
     grootste deel van de site. */
  const map = naam.includes("/") ? naam.slice(0, naam.indexOf("/")) : "";
  if (map === "kennis") return "kennis";
  if (map === "regios") return "regio";
  if (map === "sectoren") return "sector";
  if (map === "nieuws" || map === "artikel") return "nieuws";
  if (map === "toepassingen") return "oplossing";
  if (/^systeem-/.test(naam) || naam === "vibe-control" || naam === "microgrids" || naam === "energy-hubs") {
    return "systeem";
  }
  if (/^oplossing-/.test(naam)) return "oplossing";
  if (/^industrie-/.test(naam)) return "sector";
  if (/^project-/.test(naam) || naam === "projecten") return "project";
  if (["privacy", "algemene-voorwaarden", "cookiebeleid"].includes(naam)) return "juridisch";
  if (/^(nieuws|artikel)/.test(naam)) return "nieuws";
  if (/^kennis/.test(naam)) return "kennis";
  if (/^regio-/.test(naam)) return "regio";
  return "overig";
}

function eersteMatch(html: string, patroon: RegExp): string | null {
  const m = patroon.exec(html);
  return m?.[1] ? normaliseerTekst(m[1]) : null;
}

/**
 * Extensieloos publiek pad; de home is '/', niet '/index'.
 *
 * Werkt op een RELATIEF pad, niet op een bestandsnaam. Dat is het
 * verschil tussen 60 en 430 pagina's: 'kennis/peak-shaving.html' hoort
 * '/kennis/peak-shaving' te worden en niet overgeslagen te worden omdat
 * hij niet in de wortel staat.
 */
export function padVan(relatiefPad: string): string {
  const naam = relatiefPad.replace(/\\/g, "/").replace(/\.html$/i, "");
  if (naam === "index") return "/";
  /* Een map-index: 'regios/index' hoort '/regios' te zijn. */
  return `/${naam.replace(/\/index$/, "")}`;
}

export function leesPagina(
  bestandsnaam: string,
  html: string,
  sitemapPaden: ReadonlySet<string>,
): GescandePagina {
  const robots = eersteMatch(html, /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  const isRedirectStub = /<meta\s+http-equiv=["']refresh["']/i.test(html);
  const zonderScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const pad = padVan(bestandsnaam);

  return {
    bestandsnaam,
    pad,
    soort: soortVan(bestandsnaam),
    titel: eersteMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    metaOmschrijving: eersteMatch(
      html,
      /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
    ),
    canoniek: eersteMatch(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i),
    robots,
    // Zonder robots-meta is de standaard indexeerbaar; met 'noindex' niet.
    indexeerbaar: !(robots ?? "").toLowerCase().includes("noindex"),
    isRedirectStub,
    heeftOgImage: /<meta\s+property=["']og:image["']/i.test(html),
    heeftJsonLd: /type=["']application\/ld\+json["']/i.test(html),
    heeftSeoMarkers: html.includes("<!--SEO-FOUNDATION-->"),
    dataPagina: eersteMatch(html, /<body[^>]*\sdata-pagina=["']([^"']+)["']/i),
    heeftChrome: /vibe\/chrome\.js/i.test(html),
    woorden: normaliseerTekst(zonderScript).split(/\s+/).filter(Boolean).length,
    inSitemap: sitemapPaden.has(pad),
  };
}

/**
 * Haalt de publieke paden uit de LIVE sitemap. Gemeten noodzaak: de
 * repository loopt achter op productie. De repo-sitemap heeft 34 URL's
 * op de apex-host; de live sitemap heeft 96 op www, met /kennis (18
 * kennispagina's), /regios (provincies en gemeenten) en /sectoren die
 * in de repo niet bestaan.
 *
 * Het pagina-register moet dus BEIDE kennen: wat in de worktree staat
 * (bestaat_in_repo) en wat live staat (in_sitemap). Een cluster dat in
 * de repo geen eigenaar heeft, kan er live wel een hebben — en dan is
 * UPDATE_EXISTING het juiste besluit in plaats van NEW_ARTICLE.
 */
export async function leesLiveSitemap(
  basisUrl: string,
  haal: (url: string) => Promise<string | null>,
): Promise<Set<string>> {
  const basis = basisUrl.replace(/\/+$/, "");
  const xml = await haal(`${basis}/sitemap.xml`);
  if (xml === null) return new Set();

  /* VOLGT DE INDEX, net als leesSitemapPaden. Zonder dit gaf deze
     functie sinds Release 3.1 twee paden terug (de kindsitemaps zelf),
     en liep het pagina_register van 98 naar 2 bij de eerstvolgende
     zaai-run. */
  if (!isSitemapIndex(xml)) return new Set(locsAlsPaden(xml));

  const paden = new Set<string>();
  for (const kindPad of locsAlsPaden(xml)) {
    const kindXml = await haal(`${basis}${kindPad.startsWith("/") ? "" : "/"}${kindPad}`);
    if (kindXml === null) continue;
    for (const p of locsAlsPaden(kindXml)) paden.add(p);
  }
  return paden;
}

/** Alle <loc>-waarden uit een sitemap-XML, als paden. */
function locsAlsPaden(xml: string): string[] {
  const uit: string[] = [];
  const patroon = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = patroon.exec(xml)) !== null) {
    const loc = m[1];
    if (!loc) continue;
    try {
      const u = new URL(loc);
      const pad = u.pathname.replace(/\/+$/, "");
      uit.push(pad === "" ? "/" : pad);
    } catch {
      // onbruikbare loc overslaan
    }
  }
  return uit;
}

/** Is dit een sitemapINDEX in plaats van een urlset? */
export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

/**
 * Haalt de publieke paden uit sitemap.xml. Ontbreekt die, dan lege set.
 *
 * VOLGT EEN SITEMAPINDEX. Sinds Release 3.1 is sitemap.xml geen urlset
 * meer maar een index met twee kinderen (sitemap-nationaal.xml en
 * sitemap-regios.xml, samen 430 URL's). Deze functie las alleen de
 * buitenste laag en gaf dus TWEE paden terug — en die twee waren de
 * kindsitemaps zelf, niet pagina's. Elke afnemer concludeerde daarmee
 * dat de site uit twee URL's bestond.
 */
export async function leesSitemapPaden(siteWortel: string): Promise<Set<string>> {
  const lees = async (naam: string): Promise<string | null> => {
    try {
      return await readFile(join(siteWortel, naam.replace(/^\//, "")), "utf8");
    } catch {
      return null;
    }
  };
  const xml = await lees("sitemap.xml");
  if (xml === null) return new Set();

  if (!isSitemapIndex(xml)) return new Set(locsAlsPaden(xml));

  const paden = new Set<string>();
  for (const kindPad of locsAlsPaden(xml)) {
    const kindXml = await lees(kindPad);
    if (kindXml === null) continue;
    for (const p of locsAlsPaden(kindXml)) paden.add(p);
  }
  return paden;
}

export type ScanUitkomst = {
  readonly paginas: readonly GescandePagina[];
  readonly sitemapPaden: ReadonlySet<string>;
  /** Paden in de sitemap waarvoor geen bestand bestaat. */
  readonly sitemapZonderBestand: readonly string[];
  /** Indexeerbare pagina's die niet in de sitemap staan. */
  readonly indexeerbaarZonderSitemap: readonly string[];
};

/**
 * Mappen die geen website zijn en dus niet gescand worden.
 *
 * `intelligence` staat er met opzet bij: dat is de interne laag en die
 * hoort nooit als websitepagina te worden gelezen.
 */
const NIET_SCANNEN = new Set([
  "node_modules", ".git", ".github", "intelligence", "scripts", "data", "docs",
  "assets", "img", "vibe", "backups",
]);

/** Alle .html-bestanden onder een wortel, als paden relatief aan die wortel. */
async function htmlBestanden(wortel: string, prefix = ""): Promise<string[]> {
  const uit: string[] = [];
  const items = await readdir(join(wortel, prefix), { withFileTypes: true });
  for (const item of items) {
    const rel = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      if (NIET_SCANNEN.has(item.name) || item.name.startsWith(".")) continue;
      uit.push(...(await htmlBestanden(wortel, rel)));
    } else if (/\.html$/i.test(item.name)) {
      uit.push(rel);
    }
  }
  return uit;
}

/**
 * Scant de website.
 *
 * LAS ALLEEN DE WORTEL. `readdir(siteWortel)` zonder recursie zag 60
 * van de 430 gepubliceerde pagina's: alles onder kennis/, regios/,
 * sectoren/ en toepassingen/ bleef onzichtbaar. Dat is de reden dat de
 * besluitmotor geen bestaande doelpagina kon vinden en NEW_ARTICLE
 * voorstelde voor onderwerpen die al een pagina hebben.
 */
export async function scanSite(siteWortel: string): Promise<ScanUitkomst> {
  const sitemapPaden = await leesSitemapPaden(siteWortel);
  const bestanden = (await htmlBestanden(siteWortel)).sort();

  const paginas: GescandePagina[] = [];
  for (const relatiefPad of bestanden) {
    const html = await readFile(join(siteWortel, relatiefPad), "utf8");
    paginas.push(leesPagina(relatiefPad, html, sitemapPaden));
  }

  const bestaandePaden = new Set(paginas.map((p) => p.pad));
  return {
    paginas,
    sitemapPaden,
    sitemapZonderBestand: [...sitemapPaden].filter((p) => !bestaandePaden.has(p)).sort(),
    indexeerbaarZonderSitemap: paginas
      .filter((p) => p.indexeerbaar && !p.isRedirectStub && !p.inSitemap && p.pad !== "/404")
      .map((p) => p.pad)
      .sort(),
  };
}
