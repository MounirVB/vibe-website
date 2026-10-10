/* ============================================================
   BRONNEN — parsers per brontype
   ------------------------------------------------------------
   Elke parser levert RuwItem[]. Geen enkele parser gooit op een
   onbegrijpelijk item: die wordt overgeslagen en geteld. Een feed met
   drie kapotte en zevenentwintig goede items levert dus 27 items, niet
   een exception.

   Elke parser zet `datumHerkomst` expliciet. Een datum uit een feed is
   iets anders dan een `lastmod` uit een sitemap, en dat verschil
   bepaalt later de versheid van een gebeurtenis.
   ============================================================ */

import { htmlNaarTekst, normaliseerTekst, sha256hex } from "../kern/tekst.ts";
import type { DatumHerkomst, RuwItem } from "./soorten.ts";
import { diepeTekst, kind, kindTekst, parseerXml, vindAlle, type XmlKnoop } from "./xml.ts";

export type ParseUitkomst = {
  items: RuwItem[];
  overgeslagen: number;
  /** Wat de parser werkelijk zag; gaat in het verificatiebewijs. */
  opmerking: string;
};

/**
 * Inhoud van het eerste directe kind met een van deze namen. Heeft dat
 * kind zelf kinderen — zoals een feed die ruwe HTML in <title> zet —
 * dan wordt de diepe tekst genomen in plaats van de lege eigen tekst.
 */
function kindInhoud(knoop: XmlKnoop, ...namen: string[]): string {
  for (const naam of namen) {
    const k = kind(knoop, naam);
    if (!k) continue;
    const inhoud = k.kinderen.length > 0 ? diepeTekst(k) : k.tekst;
    const t = inhoud.trim();
    if (t) return t;
  }
  return "";
}

/** Veilige datumlezer. Geeft null bij onzin in plaats van Invalid Date. */
export function leesDatum(waarde: string | null | undefined): Date | null {
  if (!waarde) return null;
  const t = waarde.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  // Een datum ver in de toekomst of voor 1990 is in deze markt onzin en
  // wijst op een parsefout, niet op een feit.
  const jaar = d.getUTCFullYear();
  if (jaar < 1990 || jaar > new Date().getUTCFullYear() + 2) return null;
  return d;
}

function absoluteUrl(ruw: string, basis: string): string | null {
  try {
    return new URL(ruw.trim(), basis).toString();
  } catch {
    return null;
  }
}

/** Query-parameters die alleen tracking zijn; weg voor de canonieke URL. */
const TRACKING = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|source$)/i;

export function canoniekeUrl(ruw: string): string {
  try {
    const u = new URL(ruw);
    u.hash = "";
    const teVerwijderen: string[] = [];
    u.searchParams.forEach((_w, sleutel) => {
      if (TRACKING.test(sleutel)) teVerwijderen.push(sleutel);
    });
    for (const s of teVerwijderen) u.searchParams.delete(s);
    // Trailing slash normaliseren, behalve op de wortel.
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.replace(/\/+$/, "");
    }
    return u.toString();
  } catch {
    return ruw;
  }
}

// ------------------------------------------------------------
// RSS 2.0 en Atom
// ------------------------------------------------------------

export function parseerFeed(xmlTekst: string, basisUrl: string): ParseUitkomst {
  const wortel = parseerXml(xmlTekst);
  const items = vindAlle(wortel, "item");
  const entries = vindAlle(wortel, "entry");
  const bronKnopen = items.length > 0 ? items : entries;
  const vorm = items.length > 0 ? "rss" : entries.length > 0 ? "atom" : "onbekend";

  const uit: RuwItem[] = [];
  let overgeslagen = 0;

  for (const k of bronKnopen) {
    // Netbeheer Nederland zet een ruwe <a>-anchor IN <title>. De XML-lezer
    // ziet dat als een kindelement, waardoor de eigen tekst van <title>
    // leeg is. Daarom hier diepe tekst nemen zodra er kinderen zijn, en
    // daarna door htmlNaarTekst voor het ge-escapete geval.
    const titel = normaliseerTekst(htmlNaarTekst(kindInhoud(k, "title")));
    const url = feedLink(k, basisUrl);
    if (!titel || !url) {
      overgeslagen += 1;
      continue;
    }

    const samenvattingRuw = kindInhoud(k, "description", "summary", "content", "encoded");
    const samenvatting = samenvattingRuw ? htmlNaarTekst(samenvattingRuw) : null;
    const datum =
      leesDatum(kindTekst(k, "pubdate", "published", "date", "updated", "modified")) ?? null;

    const guid = kindTekst(k, "guid", "id") || url;
    const categorieen = k.kinderen
      .filter((c) => c.naam === "category")
      .map((c) => c.attributen["term"] ?? c.tekst.trim())
      .filter((c) => c.length > 0);

    uit.push({
      externId: guid,
      url: canoniekeUrl(url),
      titel,
      samenvatting,
      tekst: samenvatting,
      gepubliceerdOp: datum,
      datumHerkomst: datum ? "feed" : "onbekend",
      extra: { vorm, categorieen },
    });
  }

  return {
    items: uit,
    overgeslagen,
    opmerking: `${vorm}: ${uit.length} items geparseerd, ${overgeslagen} overgeslagen`,
  };
}

function feedLink(k: XmlKnoop, basisUrl: string): string | null {
  // RSS: <link>url</link>. Atom: <link rel="alternate" href="url"/>.
  const directe = kindTekst(k, "link");
  if (directe) return absoluteUrl(directe, basisUrl);

  const linkKnopen = k.kinderen.filter((c) => c.naam === "link");
  const alternate =
    linkKnopen.find((c) => (c.attributen["rel"] ?? "alternate") === "alternate") ?? linkKnopen[0];
  const href = alternate?.attributen["href"];
  if (href) return absoluteUrl(href, basisUrl);

  const id = kindTekst(k, "id");
  if (id.startsWith("http")) return absoluteUrl(id, basisUrl);
  return null;
}

// ------------------------------------------------------------
// Sitemap en sitemapindex
// ------------------------------------------------------------

export type SitemapUitkomst = ParseUitkomst & {
  /** Gevuld als dit een sitemapindex is: de onderliggende sitemaps. */
  subSitemaps: { url: string; lastmod: Date | null }[];
};

export function parseerSitemap(xmlTekst: string, basisUrl: string): SitemapUitkomst {
  const wortel = parseerXml(xmlTekst);

  const indexKnopen = vindAlle(wortel, "sitemap");
  const subSitemaps: { url: string; lastmod: Date | null }[] = [];
  for (const k of indexKnopen) {
    const loc = kindTekst(k, "loc");
    const abs = loc ? absoluteUrl(loc, basisUrl) : null;
    if (abs) subSitemaps.push({ url: abs, lastmod: leesDatum(kindTekst(k, "lastmod")) });
  }

  const urlKnopen = vindAlle(wortel, "url");
  const uit: RuwItem[] = [];
  let overgeslagen = 0;
  let metLastmod = 0;
  let metNews = 0;

  for (const k of urlKnopen) {
    const loc = kindTekst(k, "loc");
    const abs = loc ? absoluteUrl(loc, basisUrl) : null;
    if (!abs) {
      overgeslagen += 1;
      continue;
    }

    const lastmod = leesDatum(kindTekst(k, "lastmod"));
    if (lastmod) metLastmod += 1;

    // news-sitemap geeft een echte publicatiedatum en een titel.
    const news = kind(k, "news");
    let titel = "";
    let datum: Date | null = lastmod;
    let herkomst: DatumHerkomst = lastmod ? "sitemap_lastmod" : "onbekend";
    if (news) {
      metNews += 1;
      titel = normaliseerTekst(kindTekst(news, "title"));
      const nieuwsDatum = leesDatum(kindTekst(news, "publication_date"));
      if (nieuwsDatum) {
        datum = nieuwsDatum;
        herkomst = "news_sitemap";
      }
    }

    if (!titel) {
      // Zonder titel wordt het laatste padsegment gebruikt; de echte
      // titel komt later uit de pagina zelf.
      try {
        const pad = new URL(abs).pathname.replace(/\/+$/, "");
        titel = decodeURIComponent(pad.split("/").filter(Boolean).pop() ?? abs)
          .replace(/[-_]+/g, " ")
          .trim();
      } catch {
        titel = abs;
      }
    }

    uit.push({
      externId: abs,
      url: canoniekeUrl(abs),
      titel,
      samenvatting: null,
      tekst: null,
      gepubliceerdOp: datum,
      datumHerkomst: herkomst,
      extra: { lastmod: lastmod?.toISOString() ?? null, uitNewsSitemap: news !== null },
    });
  }

  return {
    items: uit,
    overgeslagen,
    subSitemaps,
    opmerking:
      subSitemaps.length > 0 && urlKnopen.length === 0
        ? `sitemapindex: ${subSitemaps.length} sub-sitemaps`
        : `sitemap: ${uit.length} urls, ${metLastmod} met lastmod, ${metNews} met news-blok, ${overgeslagen} overgeslagen`,
  };
}

// ------------------------------------------------------------
// SRU (officielebekendmakingen.nl)
// ------------------------------------------------------------

export function parseerSru(xmlTekst: string): ParseUitkomst {
  const wortel = parseerXml(xmlTekst);
  const records = vindAlle(wortel, "record");
  const uit: RuwItem[] = [];
  let overgeslagen = 0;

  const totaal = kindTekst(wortel, "numberofrecords") || vindAlle(wortel, "numberofrecords")[0]?.tekst.trim() || "?";

  for (const r of records) {
    // De identifier en titel zitten in owmskern/dcterms-velden; namen
    // verschillen per publicatiesoort, dus meerdere kandidaten.
    const identifier = eersteTekst(r, ["identifier", "recordidentifier"]);
    const titel = normaliseerTekst(eersteTekst(r, ["title", "titel", "onderwerp"]));
    const datum = leesDatum(
      eersteTekst(r, ["available", "date", "datum", "publicatiedatum", "issued", "modified"]),
    );
    const urlKandidaat =
      eersteTekst(r, ["preferredurl", "itemurl", "url"]) ||
      (identifier ? `https://zoek.officielebekendmakingen.nl/${identifier}.html` : "");

    if (!titel || !urlKandidaat) {
      overgeslagen += 1;
      continue;
    }

    uit.push({
      externId: identifier || urlKandidaat,
      url: canoniekeUrl(urlKandidaat),
      titel,
      samenvatting: null,
      tekst: normaliseerTekst(diepeTekst(r)).slice(0, 8000) || null,
      gepubliceerdOp: datum,
      datumHerkomst: datum ? "item_metadata" : "onbekend",
      extra: {
        organisatie: eersteTekst(r, ["creator", "publisher", "organisatietype"]) || null,
        soort: eersteTekst(r, ["type", "documenttype"]) || null,
        gemeente: eersteTekst(r, ["spatial", "gemeente", "locatie"]) || null,
      },
    });
  }

  return {
    items: uit,
    overgeslagen,
    opmerking: `sru: ${uit.length} records geparseerd van gemeld totaal ${totaal}, ${overgeslagen} overgeslagen`,
  };
}

function eersteTekst(knoop: XmlKnoop, namen: readonly string[]): string {
  for (const naam of namen) {
    const treffers = vindAlle(knoop, naam);
    for (const t of treffers) {
      const tekst = t.tekst.trim();
      if (tekst) return tekst;
    }
  }
  return "";
}

// ------------------------------------------------------------
// JSON en OData
// ------------------------------------------------------------

export type JsonVeldConfig = {
  /** Pad naar de lijst, puntgescheiden. Leeg = de wortel is de lijst. */
  readonly itemsPad?: string;
  readonly idVeld?: string;
  readonly titelVelden?: readonly string[];
  readonly datumVelden?: readonly string[];
  readonly urlVeld?: string;
  /** Sjabloon met {veld}-plaatshouders als er geen urlVeld is. */
  readonly urlSjabloon?: string;
  readonly tekstVelden?: readonly string[];
  readonly extraVelden?: readonly string[];
};

function volgPad(waarde: unknown, pad: string | undefined): unknown {
  if (!pad) return waarde;
  let huidig = waarde;
  for (const deel of pad.split(".")) {
    if (huidig === null || typeof huidig !== "object") return undefined;
    huidig = (huidig as Record<string, unknown>)[deel];
  }
  return huidig;
}

function alsTekst(waarde: unknown): string {
  if (waarde === null || waarde === undefined) return "";
  if (typeof waarde === "string") return waarde.trim();
  if (typeof waarde === "number" || typeof waarde === "boolean") return String(waarde);
  return "";
}

export function parseerJson(
  jsonTekst: string,
  config: JsonVeldConfig,
  basisUrl: string,
): ParseUitkomst {
  let ontleed: unknown;
  try {
    ontleed = JSON.parse(jsonTekst);
  } catch (e) {
    return { items: [], overgeslagen: 0, opmerking: `json onleesbaar: ${(e as Error).message}` };
  }

  const lijstRuw = volgPad(ontleed, config.itemsPad);
  if (!Array.isArray(lijstRuw)) {
    return {
      items: [],
      overgeslagen: 0,
      opmerking: `json: pad '${config.itemsPad ?? "(wortel)"}' is geen lijst maar ${typeof lijstRuw}`,
    };
  }

  const uit: RuwItem[] = [];
  let overgeslagen = 0;

  for (const ruw of lijstRuw) {
    if (ruw === null || typeof ruw !== "object") {
      overgeslagen += 1;
      continue;
    }
    const rij = ruw as Record<string, unknown>;

    const titel = normaliseerTekst(
      (config.titelVelden ?? ["title", "titel", "naam", "name"])
        .map((v) => alsTekst(volgPad(rij, v)))
        .find((t) => t.length > 0) ?? "",
    );

    let url = config.urlVeld ? alsTekst(volgPad(rij, config.urlVeld)) : "";
    if (!url && config.urlSjabloon) {
      url = config.urlSjabloon.replace(/\{([A-Za-z0-9_.]+)\}/g, (_m, veld: string) =>
        encodeURIComponent(alsTekst(volgPad(rij, veld))),
      );
    }
    const absoluut = url ? absoluteUrl(url, basisUrl) : null;

    const datum =
      (config.datumVelden ?? ["date", "datum", "published", "modified"])
        .map((v) => leesDatum(alsTekst(volgPad(rij, v))))
        .find((d) => d !== null) ?? null;

    const id = config.idVeld ? alsTekst(volgPad(rij, config.idVeld)) : "";
    const externId = id || absoluut || sha256hex(JSON.stringify(rij)).slice(0, 32);

    if (!titel || !absoluut) {
      overgeslagen += 1;
      continue;
    }

    const tekstDelen = (config.tekstVelden ?? [])
      .map((v) => alsTekst(volgPad(rij, v)))
      .filter((t) => t.length > 0);

    const extra: Record<string, unknown> = {};
    for (const v of config.extraVelden ?? []) extra[v] = volgPad(rij, v) ?? null;

    uit.push({
      externId,
      url: canoniekeUrl(absoluut),
      titel,
      samenvatting: tekstDelen[0] ?? null,
      tekst: tekstDelen.length > 0 ? normaliseerTekst(tekstDelen.join("\n\n")) : null,
      gepubliceerdOp: datum,
      datumHerkomst: datum ? "item_metadata" : "onbekend",
      extra,
    });
  }

  return {
    items: uit,
    overgeslagen,
    opmerking: `json: ${uit.length} van ${lijstRuw.length} rijen bruikbaar, ${overgeslagen} overgeslagen`,
  };
}

// ------------------------------------------------------------
// Tijdreeks: parallelle arrays, geen lijst van objecten
// ------------------------------------------------------------

export type TijdreeksConfig = {
  readonly tijdVeld: string;
  readonly waardeVeld: string;
  readonly eenheidVeld?: string;
  readonly licentieVeld?: string;
  readonly citatieUrl: string;
  readonly reeksNaam: string;
};

/**
 * Een prijsreeks is geen nieuwsitem. Toch is er per dag één ding te
 * zeggen dat een marktgebeurtenis kan worden: het dagbeeld, met de
 * uitersten en het aantal uren met een negatieve prijs. Daarom wordt
 * de reeks per kalenderdag samengevat tot één item.
 */
export function parseerTijdreeks(jsonTekst: string, config: TijdreeksConfig): ParseUitkomst {
  let ontleed: Record<string, unknown>;
  try {
    ontleed = JSON.parse(jsonTekst) as Record<string, unknown>;
  } catch (e) {
    return { items: [], overgeslagen: 0, opmerking: `json onleesbaar: ${(e as Error).message}` };
  }

  const tijden = ontleed[config.tijdVeld];
  const waarden = ontleed[config.waardeVeld];
  if (!Array.isArray(tijden) || !Array.isArray(waarden)) {
    return {
      items: [],
      overgeslagen: 0,
      opmerking: `tijdreeks: '${config.tijdVeld}' of '${config.waardeVeld}' is geen array`,
    };
  }
  if (tijden.length !== waarden.length) {
    return {
      items: [],
      overgeslagen: 0,
      opmerking: `tijdreeks: ${tijden.length} tijdstempels tegen ${waarden.length} waarden; niet uitlijnbaar`,
    };
  }

  const eenheid = config.eenheidVeld ? alsTekst(ontleed[config.eenheidVeld]) : "";
  const licentie = config.licentieVeld ? alsTekst(ontleed[config.licentieVeld]) : "";

  const perDag = new Map<string, number[]>();
  let overgeslagen = 0;
  for (let i = 0; i < tijden.length; i += 1) {
    const t = tijden[i];
    const w = waarden[i];
    if (typeof t !== "number" || typeof w !== "number" || !Number.isFinite(w)) {
      overgeslagen += 1;
      continue;
    }
    const dag = new Date(t * 1000).toISOString().slice(0, 10);
    const lijst = perDag.get(dag);
    if (lijst) lijst.push(w);
    else perDag.set(dag, [w]);
  }

  const items: RuwItem[] = [];
  for (const [dag, reeks] of [...perDag.entries()].sort()) {
    const min = Math.min(...reeks);
    const max = Math.max(...reeks);
    const gemiddelde = reeks.reduce((a, b) => a + b, 0) / reeks.length;
    const negatief = reeks.filter((w) => w < 0).length;
    items.push({
      externId: `${config.reeksNaam}:${dag}`,
      // Anker per dag: de citatie wijst naar het endpoint, maar elke
      // dagsamenvatting krijgt een eigen verwijzing.
      url: `${config.citatieUrl}#${dag}`,
      titel: `${config.reeksNaam} ${dag}: gemiddeld ${gemiddelde.toFixed(2)} ${eenheid}`.trim(),
      samenvatting:
        `Dagbeeld ${dag}: laagste ${min.toFixed(2)}, hoogste ${max.toFixed(2)}, ` +
        `gemiddeld ${gemiddelde.toFixed(2)} ${eenheid}, ${negatief} van ${reeks.length} meetpunten negatief.`,
      tekst: null,
      gepubliceerdOp: new Date(`${dag}T00:00:00Z`),
      datumHerkomst: "item_metadata",
      extra: {
        reeks: config.reeksNaam,
        eenheid,
        licentie,
        min,
        max,
        gemiddelde,
        meetpunten: reeks.length,
        meetpunten_negatief: negatief,
      },
    });
  }

  return {
    items,
    overgeslagen,
    opmerking:
      `tijdreeks: ${tijden.length} meetpunten over ${items.length} dagen samengevat` +
      (licentie ? `; licentie in payload: ${licentie.slice(0, 80)}` : "") +
      (overgeslagen > 0 ? `; ${overgeslagen} onbruikbare punten` : ""),
  };
}

// ------------------------------------------------------------
// HTML-lijst: laatste redmiddel, alleen voor expliciet toegestane bronnen
// ------------------------------------------------------------

export type HtmlLijstConfig = {
  /** Regex met één capture group op de href. */
  readonly linkPatroon: string;
  readonly titelPatroon?: string;
};

export function parseerHtmlLijst(
  html: string,
  config: HtmlLijstConfig,
  basisUrl: string,
): ParseUitkomst {
  const patroon = new RegExp(config.linkPatroon, "gi");
  const gezien = new Set<string>();
  const uit: RuwItem[] = [];
  let overgeslagen = 0;
  let m: RegExpExecArray | null;

  while ((m = patroon.exec(html)) !== null) {
    const href = m[1];
    if (!href) {
      overgeslagen += 1;
      continue;
    }
    const abs = absoluteUrl(href, basisUrl);
    if (!abs || gezien.has(abs)) {
      overgeslagen += 1;
      continue;
    }
    gezien.add(abs);
    const titel = normaliseerTekst(htmlNaarTekst(m[2] ?? "")) || abs;
    uit.push({
      externId: abs,
      url: canoniekeUrl(abs),
      titel,
      samenvatting: null,
      tekst: null,
      gepubliceerdOp: null,
      datumHerkomst: "onbekend",
      extra: {},
    });
  }

  return {
    items: uit,
    overgeslagen,
    opmerking: `html_lijst: ${uit.length} unieke links, ${overgeslagen} overgeslagen`,
  };
}
