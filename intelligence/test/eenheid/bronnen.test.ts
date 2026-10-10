/* ============================================================
   TEST — bronnen: robots, toestemmingsbeleid, parsers, register
   ============================================================ */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { padToegestaan, parseerRobots } from "../../src/bronnen/robots.ts";
import { aangekondigdInRobots, bepaalToestemming } from "../../src/bronnen/toestemmingsbeleid.ts";
import {
  canoniekeUrl,
  leesDatum,
  parseerFeed,
  parseerJson,
  parseerSitemap,
  parseerSru,
  parseerTijdreeks,
} from "../../src/bronnen/parsers.ts";
import { parseerXml, vindAlle } from "../../src/bronnen/xml.ts";
import { BRONNEN } from "../../src/bronnen/register.ts";
import { controleerBron } from "../../src/bronnen/soorten.ts";
import { losDatumPlaatshoudersOp } from "../../src/bronnen/haal.ts";

// ---------------- robots ----------------

test("robots: opeenvolgende user-agent-regels vormen één groep", () => {
  const r = parseerRobots(
    ["User-agent: GPTBot", "User-agent: CCBot", "Disallow: /", "", "User-agent: *", "Allow: /"].join("\n"),
    "vibeenergyintelligence",
  );
  assert.deepEqual(r.volledigUitgesloten.sort(), ["ccbot", "gptbot"]);
  assert.equal(padToegestaan(r, "/rss"), true);
});

test("robots: longest match wint, Allow wint bij gelijke lengte", () => {
  const r = parseerRobots(
    ["User-agent: *", "Disallow: /map/", "Allow: /map/open/"].join("\n"),
    "vibeenergyintelligence",
  );
  assert.equal(padToegestaan(r, "/map/geheim"), false);
  assert.equal(padToegestaan(r, "/map/open/ding"), true);
});

test("robots: een lege Disallow betekent alles toegestaan", () => {
  const r = parseerRobots(["User-agent: *", "Disallow:"].join("\n"), "x");
  assert.equal(padToegestaan(r, "/wat-dan-ook"), true);
  assert.deepEqual(r.volledigUitgesloten, []);
});

test("robots: onze eigen token wint van de sterregel", () => {
  const r = parseerRobots(
    ["User-agent: *", "Disallow: /", "", "User-agent: vibeenergyintelligence", "Allow: /"].join("\n"),
    "vibeenergyintelligence",
  );
  assert.equal(padToegestaan(r, "/feed"), true);
});

test("robots: jokerteken en einde-anker", () => {
  const r = parseerRobots(
    ["User-agent: *", "Disallow: /*.pdf$", "Disallow: /prive*"].join("\n"),
    "x",
  );
  assert.equal(padToegestaan(r, "/map/stuk.pdf"), false);
  assert.equal(padToegestaan(r, "/map/stuk.pdf.html"), true, "$ ankert op het einde");
  assert.equal(padToegestaan(r, "/prive/map"), false);
});

test("robots: sitemapaankondiging wordt gelezen", () => {
  const r = parseerRobots(
    ["User-agent: *", "Allow: /", "Sitemap: https://x.nl/sitemap.xml"].join("\n"),
    "x",
  );
  assert.equal(aangekondigdInRobots(r, "https://x.nl/sitemap.xml"), true);
  assert.equal(aangekondigdInRobots(r, "https://x.nl/anders.xml"), false);
});

// ---------------- toestemmingsbeleid ----------------

test("beleid: een expliciet TDM-verbod is een hard nee", () => {
  const t = bepaalToestemming({
    explicietVerbod: "text and data mining is expressly prohibited",
    licentie: "CC BY 4.0",
    isSyndicatie: true,
  });
  assert.equal(t.mogenVerwerken, false);
  assert.equal(t.grondslag, "expliciet_verbod");
});

test("beleid: een uitgesloten AI-crawler weegt zwaarder dan een syndicatiefeed", () => {
  const robots = parseerRobots(
    ["User-agent: GPTBot", "Disallow: /", "", "User-agent: *", "Allow: /"].join("\n"),
    "x",
  );
  const t = bepaalToestemming({ robots, isSyndicatie: true });
  assert.equal(t.mogenVerwerken, false);
  assert.equal(t.grondslag, "ai_crawler_uitgesloten");
  assert.match(t.bewijs, /gptbot/);
});

test("beleid: een open licentie geeft toestemming", () => {
  const t = bepaalToestemming({ licentie: "CC BY 4.0", licentieBewijs: "in de API-respons" });
  assert.equal(t.mogenVerwerken, true);
  assert.equal(t.grondslag, "open_licentie");
});

test("beleid: een hergebruikverklaring in eigen woorden geldt ook", () => {
  const t = bepaalToestemming({
    hergebruikVerklaring: "De informatie van RVO is openbaar. U mag deze hergebruiken.",
  });
  assert.equal(t.mogenVerwerken, true);
  assert.equal(t.grondslag, "hergebruik_verklaard");
});

test("beleid: zonder grondslag is het antwoord nee", () => {
  const t = bepaalToestemming({});
  assert.equal(t.mogenVerwerken, false);
  assert.equal(t.tdmStatus, "onbekend");
});

test("beleid: de ladder respecteert zijn eigen volgorde", () => {
  // Open licentie EN syndicatie: de licentie is de sterkere grondslag.
  const t = bepaalToestemming({ licentie: "CC0 1.0", isSyndicatie: true });
  assert.equal(t.grondslag, "open_licentie");
});

// ---------------- xml en parsers ----------------

test("xml: CDATA, commentaar en self-closing tags", () => {
  const w = parseerXml(
    "<r><a><![CDATA[rauw & ongemoeid]]></a><!-- weg --><b/><c attr=\"x\">tekst</c></r>",
  );
  const a = vindAlle(w, "a")[0];
  assert.equal(a?.tekst.trim(), "rauw & ongemoeid");
  assert.equal(vindAlle(w, "c")[0]?.attributen["attr"], "x");
});

test("xml: namespaceprefix wordt genegeerd bij het zoeken", () => {
  const w = parseerXml('<f xmlns:news="x"><url><news:publication_date>2026-01-01</news:publication_date></url></f>');
  assert.equal(vindAlle(w, "publication_date")[0]?.tekst.trim(), "2026-01-01");
});

test("feed: een titel met ruwe HTML-anchor levert toch platte tekst", () => {
  const rss = `<rss><channel><item>
    <title><a href="/x" hreflang="nl">Historisch laag aantal ongevallen</a></title>
    <link>https://www.netbeheernederland.nl/artikelen/nieuws/x</link>
    <description>&lt;p&gt;Een alinea&lt;/p&gt;</description>
    <pubDate>Thu, 09 Oct 2026 06:34:28 +0000</pubDate>
  </item></channel></rss>`;
  const r = parseerFeed(rss, "https://www.netbeheernederland.nl");
  assert.equal(r.items.length, 1, r.opmerking);
  assert.equal(r.items[0]?.titel, "Historisch laag aantal ongevallen");
  assert.equal(r.items[0]?.samenvatting, "Een alinea");
  assert.equal(r.items[0]?.datumHerkomst, "feed");
});

test("feed: een item zonder titel of link wordt overgeslagen, niet gegokt", () => {
  const rss = `<rss><channel>
    <item><title>Goed</title><link>https://x.nl/a</link></item>
    <item><link>https://x.nl/b</link></item>
    <item><title>Geen link</title></item>
  </channel></rss>`;
  const r = parseerFeed(rss, "https://x.nl");
  assert.equal(r.items.length, 1);
  assert.equal(r.overgeslagen, 2);
});

test("feed: atom met rel=alternate", () => {
  const atom = `<feed><entry>
    <title>Aankondiging</title>
    <link rel="self" href="https://x.nl/self"/>
    <link rel="alternate" href="https://x.nl/echt"/>
    <updated>2026-10-10T05:00:15.936+02:00</updated>
  </entry></feed>`;
  const r = parseerFeed(atom, "https://x.nl");
  assert.equal(r.items[0]?.url, "https://x.nl/echt");
});

test("sitemap: news-blok levert een echte publicatiedatum", () => {
  const xml = `<urlset xmlns:news="x"><url>
    <loc>https://x.nl/actueel/nieuws/2026/10/09/iets</loc>
    <lastmod>2026-10-09T15:30:38.908Z</lastmod>
    <news:news><news:title>Iets gebeurde</news:title>
    <news:publication_date>2026-10-09T15:00:00Z</news:publication_date></news:news>
  </url></urlset>`;
  const r = parseerSitemap(xml, "https://x.nl");
  assert.equal(r.items[0]?.titel, "Iets gebeurde");
  assert.equal(r.items[0]?.datumHerkomst, "news_sitemap");
});

test("sitemap: zonder news-blok komt de datum uit lastmod", () => {
  const xml = `<urlset><url><loc>https://x.nl/a-b-c</loc><lastmod>2026-01-02</lastmod></url></urlset>`;
  const r = parseerSitemap(xml, "https://x.nl");
  assert.equal(r.items[0]?.datumHerkomst, "sitemap_lastmod");
  assert.equal(r.items[0]?.titel, "a b c", "titel uit het laatste padsegment");
});

test("sitemap: een index levert subsitemaps en geen urls", () => {
  const xml = `<sitemapindex>
    <sitemap><loc>https://x.nl/a.xml</loc><lastmod>2026-01-01</lastmod></sitemap>
    <sitemap><loc>https://x.nl/b.xml</loc></sitemap>
  </sitemapindex>`;
  const r = parseerSitemap(xml, "https://x.nl");
  assert.equal(r.items.length, 0);
  assert.equal(r.subSitemaps.length, 2);
});

test("sru: records met identifier, titel en datum", () => {
  const xml = `<searchRetrieveResponse><numberOfRecords>15</numberOfRecords><records>
    <record><recordData><gzd><originalData>
      <dcterms:identifier>gmb-2026-471966</dcterms:identifier>
      <dcterms:title>Omgevingsvergunning batterijopslag</dcterms:title>
      <dcterms:available>2026-09-14</dcterms:available>
      <dcterms:creator>Tilburg</dcterms:creator>
    </originalData></gzd></recordData></record>
  </records></searchRetrieveResponse>`;
  const r = parseerSru(xml);
  assert.equal(r.items.length, 1, r.opmerking);
  assert.equal(r.items[0]?.externId, "gmb-2026-471966");
  assert.match(r.items[0]?.titel ?? "", /batterijopslag/);
  assert.equal(r.items[0]?.extra["organisatie"], "Tilburg");
});

test("json: itemspad, urlsjabloon en extra velden", () => {
  const json = JSON.stringify({
    content: [
      {
        publicatieId: "443961",
        aanbestedingNaam: "Zonnepanelen en Energieopslag",
        publicatieDatum: "2026-10-10",
        opdrachtgeverNaam: "Universiteit Twente",
      },
    ],
  });
  const r = parseerJson(
    json,
    {
      itemsPad: "content",
      idVeld: "publicatieId",
      titelVelden: ["aanbestedingNaam"],
      datumVelden: ["publicatieDatum"],
      urlSjabloon: "https://x.nl/aankondiging/{publicatieId}",
      extraVelden: ["opdrachtgeverNaam"],
    },
    "https://x.nl",
  );
  assert.equal(r.items.length, 1, r.opmerking);
  assert.equal(r.items[0]?.url, "https://x.nl/aankondiging/443961");
  assert.equal(r.items[0]?.extra["opdrachtgeverNaam"], "Universiteit Twente");
});

test("json: een pad dat geen lijst is geeft nul items met uitleg", () => {
  const r = parseerJson(JSON.stringify({ features: { a: 1 } }), { itemsPad: "features" }, "https://x.nl");
  assert.equal(r.items.length, 0);
  assert.match(r.opmerking, /geen lijst/);
});

test("tijdreeks: parallelle arrays worden per dag samengevat", () => {
  const basis = Math.floor(Date.UTC(2026, 9, 9, 0, 0, 0) / 1000);
  const json = JSON.stringify({
    unix_seconds: [basis, basis + 3600, basis + 86_400],
    price: [10, -5, 20],
    unit: "EUR / MWh",
    license_info: "CC BY 4.0",
  });
  const r = parseerTijdreeks(json, {
    tijdVeld: "unix_seconds",
    waardeVeld: "price",
    eenheidVeld: "unit",
    licentieVeld: "license_info",
    citatieUrl: "https://api.x/price",
    reeksNaam: "day-ahead NL",
  });
  assert.equal(r.items.length, 2, "twee kalenderdagen");
  const dag1 = r.items[0];
  assert.equal(dag1?.extra["meetpunten_negatief"], 1);
  assert.equal(dag1?.extra["min"], -5);
  assert.ok(dag1?.url.endsWith("#2026-10-09"), dag1?.url);
});

test("tijdreeks: niet-uitlijnbare arrays leveren nul items", () => {
  const r = parseerTijdreeks(JSON.stringify({ t: [1, 2], p: [1] }), {
    tijdVeld: "t",
    waardeVeld: "p",
    citatieUrl: "https://x",
    reeksNaam: "r",
  });
  assert.equal(r.items.length, 0);
  assert.match(r.opmerking, /niet uitlijnbaar/);
});

test("canoniekeUrl haalt trackingparameters en fragment weg", () => {
  assert.equal(
    canoniekeUrl("https://x.nl/a/?utm_source=nieuwsbrief&id=7#kop"),
    "https://x.nl/a?id=7",
  );
});

test("leesDatum weigert onzin en datums buiten een plausibel bereik", () => {
  assert.equal(leesDatum("geen datum"), null);
  assert.equal(leesDatum("1850-01-01"), null);
  assert.equal(leesDatum(null), null);
  assert.ok(leesDatum("2026-10-10") instanceof Date);
});

test("datumplaatshouders worden opgelost", () => {
  const nu = new Date("2026-10-10T12:00:00Z");
  const url = losDatumPlaatshoudersOp("https://x/p?start={3_dagen_terug}&end={morgen}", nu);
  assert.equal(url, "https://x/p?start=2026-10-07&end=2026-10-11");
});

// ---------------- register ----------------

test("elke bron in het register is intern consistent", () => {
  const fouten = BRONNEN.flatMap((b) => controleerBron(b));
  assert.deepEqual(fouten, [], fouten.join("\n"));
});

test("geen actieve bron zonder gemeten toestemming", () => {
  for (const b of BRONNEN.filter((x) => x.actief)) {
    assert.equal(b.robotsStatus, "toegestaan", b.sleutel);
    assert.equal(b.tdmStatus, "geen_voorbehoud", b.sleutel);
    assert.equal(b.verificatie.status, "geverifieerd", b.sleutel);
  }
});

test("elke inactieve bron heeft een reden van betekenis", () => {
  for (const b of BRONNEN.filter((x) => !x.actief)) {
    assert.ok((b.inactiefReden ?? "").length > 40, `${b.sleutel}: reden te kort`);
  }
});

test("de endpointhost staat altijd in zijn eigen allowlist", () => {
  for (const b of BRONNEN) {
    assert.ok(
      b.toegestaneHosts.includes(new URL(b.endpointUrl).host),
      `${b.sleutel}: host ontbreekt in toegestaneHosts`,
    );
  }
});

test("alleen https in het register", () => {
  for (const b of BRONNEN) {
    assert.equal(new URL(b.endpointUrl).protocol, "https:", b.sleutel);
  }
});
