/* ============================================================
   BRONNEN — ophalen en parseren per brontype
   ------------------------------------------------------------
   Eén ingang voor de hele collector: geef een bron en de vorige
   validators, krijg items of een reden waarom niet.

   De toestemmingscontrole staat hier vóór het netwerkverkeer. Een
   bron die uit staat of waarvan het voorbehoud niet opgehelderd is
   wordt niet opgehaald, ook niet "even om te kijken".
   ============================================================ */

import { maakLogger } from "../kern/log.ts";
import { haalOp } from "./http.ts";
import {
  parseerFeed,
  parseerHtmlLijst,
  parseerJson,
  parseerSitemap,
  parseerSru,
  parseerTijdreeks,
  type HtmlLijstConfig,
  type JsonVeldConfig,
  type ParseUitkomst,
  type SitemapUitkomst,
  type TijdreeksConfig,
} from "./parsers.ts";
import type { Bron, OphaalResultaat, RuwItem } from "./soorten.ts";

const log = maakLogger("haal");

export type HaalBronOpties = {
  readonly etag?: string | null;
  readonly lastModified?: string | null;
  /** Negeert het actief-vlaggetje; alleen voor de verifieerstap. */
  readonly ookAlsInactief?: boolean;
};

function acceptVoor(bron: Bron): string {
  switch (bron.soort) {
    case "rss":
    case "atom":
      return "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5";
    case "sitemap":
    case "sru":
    case "wfs":
      return "application/xml, text/xml;q=0.9, */*;q=0.5";
    case "json_api":
    case "odata":
    case "tijdreeks":
      return "application/json, application/ld+json;q=0.9, */*;q=0.5";
    case "html_lijst":
      return "text/html, */*;q=0.5";
    case "dataset":
      return "text/csv, application/octet-stream, */*;q=0.5";
  }
}

/**
 * Sommige endpoints hebben een datumvenster nodig. Een vaste datum in
 * het register zou binnen een dag verlopen, dus staan er plaatshouders
 * in de URL die hier worden opgelost.
 */
export function losDatumPlaatshoudersOp(url: string, nu: Date): string {
  const dag = (verschuiving: number): string => {
    const d = new Date(nu.getTime() + verschuiving * 86_400_000);
    return d.toISOString().slice(0, 10);
  };
  return url
    .replace(/\{vandaag\}/g, dag(0))
    .replace(/\{morgen\}/g, dag(1))
    .replace(/\{gisteren\}/g, dag(-1))
    .replace(/\{(\d+)_dagen_terug\}/g, (_m, n: string) => dag(-Number.parseInt(n, 10)));
}

function parseer(bron: Bron, body: string): ParseUitkomst {
  switch (bron.soort) {
    case "rss":
    case "atom":
      return parseerFeed(body, bron.basisUrl);
    case "sitemap":
      return parseerSitemap(body, bron.basisUrl);
    case "sru":
      return parseerSru(body);
    case "json_api":
    case "odata":
      return parseerJson(body, bron.config as JsonVeldConfig, bron.basisUrl);
    case "html_lijst":
      return parseerHtmlLijst(body, bron.config as unknown as HtmlLijstConfig, bron.basisUrl);
    case "wfs":
      // WFS met outputFormat=application/json levert GeoJSON; features
      // zijn dan de lijst.
      return parseerJson(
        body,
        {
          itemsPad: "features",
          idVeld: "id",
          titelVelden: [
            "properties.naam",
            "properties.netbeheerderName",
            "properties.voedings_1",
            "id",
          ],
          urlSjabloon: `${bron.basisUrl}#{id}`,
          extraVelden: ["properties"],
          ...(bron.config as JsonVeldConfig),
        },
        bron.basisUrl,
      );
    case "tijdreeks":
      return parseerTijdreeks(body, bron.config as unknown as TijdreeksConfig);
    case "dataset":
      // Een dataset wordt niet in items geknipt; de ophaling zelf is
      // het signaal dat er een nieuwe uitgave staat.
      return {
        items: [],
        overgeslagen: 0,
        opmerking: `dataset van ${body.length} tekens opgehaald; niet in items gesplitst`,
      };
  }
}

/** Hoeveel subsitemaps er per ophaling maximaal gevolgd worden. */
const MAX_SUB_SITEMAPS = 8;

/**
 * Volgt de subsitemaps van een index. De selectie is bewust krap: een
 * grote site heeft tientallen subsitemaps en de meeste zijn voor ons
 * niet relevant. Als het urlPatroon van de bron op de sitemapnaam zelf
 * matcht wordt die voorgetrokken; anders worden de nieuwste gepakt.
 */
async function volgSubSitemaps(bron: Bron, index: SitemapUitkomst): Promise<SitemapUitkomst> {
  const gesorteerd = [...index.subSitemaps].sort((a, b) => {
    const aRelevant = bron.urlPatroon?.test(a.url) ? 1 : 0;
    const bRelevant = bron.urlPatroon?.test(b.url) ? 1 : 0;
    if (aRelevant !== bRelevant) return bRelevant - aRelevant;
    return (b.lastmod?.getTime() ?? 0) - (a.lastmod?.getTime() ?? 0);
  });

  const items: RuwItem[] = [];
  const opmerkingen: string[] = [];
  let overgeslagen = index.overgeslagen;
  let gevolgd = 0;

  for (const sub of gesorteerd.slice(0, MAX_SUB_SITEMAPS)) {
    const uitkomst = await haalOp({
      url: sub.url,
      toegestaneHosts: bron.toegestaneHosts,
      maxBytes: bron.maxBytes,
      minIntervalSeconden: bron.minIntervalSeconden,
      accept: "application/xml, text/xml;q=0.9, */*;q=0.5",
    });
    if (uitkomst.soort !== "ok") {
      opmerkingen.push(`${sub.url} -> ${uitkomst.soort}`);
      continue;
    }
    gevolgd += 1;
    const deel = parseerSitemap(uitkomst.body, bron.basisUrl);
    items.push(...deel.items);
    overgeslagen += deel.overgeslagen;
    if (items.length >= bron.maxItemsPerOphaling * 3) break;
  }

  return {
    items,
    overgeslagen,
    subSitemaps: index.subSitemaps,
    opmerking:
      `sitemapindex met ${index.subSitemaps.length} subsitemaps; ${gevolgd} gevolgd, ` +
      `${items.length} urls opgehaald` +
      (opmerkingen.length > 0 ? `; mislukt: ${opmerkingen.join(", ")}` : ""),
  };
}

/** Past urlPatroon en uitsluitPatroon toe. Uitsluiten wint. */
export function filterItems(bron: Bron, items: RuwItem[]): { behouden: RuwItem[]; weg: number } {
  const behouden = items.filter((i) => {
    if (bron.uitsluitPatroon && bron.uitsluitPatroon.test(i.url)) return false;
    if (bron.urlPatroon && !bron.urlPatroon.test(i.url)) return false;
    return true;
  });
  return { behouden, weg: items.length - behouden.length };
}

export async function haalBron(
  bron: Bron,
  opties: HaalBronOpties = {},
): Promise<OphaalResultaat & { opmerking?: string }> {
  if (!bron.actief && !opties.ookAlsInactief) {
    return {
      resultaat: "overgeslagen",
      reden: bron.inactiefReden ?? "bron staat uit",
    };
  }
  if (bron.robotsStatus !== "toegestaan" || bron.tdmStatus !== "geen_voorbehoud") {
    return {
      resultaat: "overgeslagen",
      reden: `toestemming niet vastgesteld (robots=${bron.robotsStatus}, tdm=${bron.tdmStatus})`,
    };
  }

  const uitkomst = await haalOp({
    url: losDatumPlaatshoudersOp(bron.endpointUrl, new Date()),
    toegestaneHosts: bron.toegestaneHosts,
    maxBytes: bron.maxBytes,
    minIntervalSeconden: bron.minIntervalSeconden,
    etag: opties.etag ?? null,
    lastModified: opties.lastModified ?? null,
    accept: acceptVoor(bron),
  });

  if (uitkomst.soort === "niet_gewijzigd") {
    return { resultaat: "niet_gewijzigd", httpStatus: 304, duurMs: uitkomst.duurMs };
  }
  if (uitkomst.soort === "fout") {
    return {
      resultaat: "fout",
      httpStatus: uitkomst.httpStatus,
      foutSoort: uitkomst.foutSoort,
      foutBericht: uitkomst.bericht,
      herhaalbaar: uitkomst.herhaalbaar,
      duurMs: uitkomst.duurMs,
    };
  }

  let geparseerd: ParseUitkomst;
  try {
    geparseerd = parseer(bron, uitkomst.body);
    // Een sitemapindex bevat geen urls maar verwijzingen naar andere
    // sitemaps. robots.txt kondigt vaak alleen die index aan, dus die
    // is onze grondslag — en dan moeten de subsitemaps wel gevolgd
    // worden, begrensd en met dezelfde patronen.
    if (bron.soort === "sitemap") {
      const sitemap = geparseerd as SitemapUitkomst;
      if (sitemap.items.length === 0 && sitemap.subSitemaps.length > 0) {
        geparseerd = await volgSubSitemaps(bron, sitemap);
      }
    }
  } catch (e) {
    log.fout("parsen mislukt", { bron: bron.sleutel, fout: e });
    return {
      resultaat: "fout",
      httpStatus: uitkomst.httpStatus,
      foutSoort: "bron_parse",
      foutBericht: (e as Error).message,
      herhaalbaar: false,
      duurMs: uitkomst.duurMs,
    };
  }

  const { behouden, weg } = filterItems(bron, geparseerd.items);
  const begrensd = behouden.slice(0, bron.maxItemsPerOphaling);

  return {
    resultaat: "ok",
    httpStatus: uitkomst.httpStatus,
    items: begrensd,
    etag: uitkomst.etag,
    lastModified: uitkomst.lastModified,
    bytes: uitkomst.bytes,
    duurMs: uitkomst.duurMs,
    opmerking:
      `${geparseerd.opmerking}; ${weg} door patroon gefilterd; ` +
      `${begrensd.length} na begrenzing op ${bron.maxItemsPerOphaling}`,
  };
}
