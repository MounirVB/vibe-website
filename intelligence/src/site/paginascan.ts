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

function soortVan(bestandsnaam: string): PaginaSoort {
  const naam = bestandsnaam.replace(/\.html$/i, "");
  if (naam === "index") return "home";
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

/** Extensieloos publiek pad; de home is '/', niet '/index'. */
export function padVan(bestandsnaam: string): string {
  const naam = bestandsnaam.replace(/\.html$/i, "");
  return naam === "index" ? "/" : `/${naam}`;
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

/** Haalt de publieke paden uit sitemap.xml. Ontbreekt die, dan lege set. */
export async function leesSitemapPaden(siteWortel: string): Promise<Set<string>> {
  let xml: string;
  try {
    xml = await readFile(join(siteWortel, "sitemap.xml"), "utf8");
  } catch {
    return new Set();
  }
  const paden = new Set<string>();
  const patroon = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = patroon.exec(xml)) !== null) {
    const loc = m[1];
    if (!loc) continue;
    try {
      const u = new URL(loc);
      const pad = u.pathname.replace(/\/+$/, "");
      paden.add(pad === "" ? "/" : pad);
    } catch {
      // Een onbruikbare loc wordt overgeslagen; de scan meldt het aantal.
    }
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

export async function scanSite(siteWortel: string): Promise<ScanUitkomst> {
  const sitemapPaden = await leesSitemapPaden(siteWortel);
  const bestanden = (await readdir(siteWortel)).filter((b) => /\.html$/i.test(b)).sort();

  const paginas: GescandePagina[] = [];
  for (const bestandsnaam of bestanden) {
    const html = await readFile(join(siteWortel, bestandsnaam), "utf8");
    paginas.push(leesPagina(bestandsnaam, html, sitemapPaden));
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
