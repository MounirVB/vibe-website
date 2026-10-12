/* ============================================================
   TEST — sitekennis: de twaalf regressies uit §17
   ------------------------------------------------------------
   Elk van deze toetsen injecteert het defect OPZETTELIJK en controleert
   dat de bijbehorende poort dichtvalt. Dat is het verschil tussen een
   toets die bewijst dat iets werkt en een toets die bewijst dat iets
   niet stil kan misgaan.

   DE OORSPRONKELIJKE PRODUCTIEFOUT, in drie lagen

   1. De container had de website niet (/app/kennis ontbrak), dus
      scanSite() gaf nul pagina's.
   2. Nul pagina's zag eruit als "de site heeft geen pagina's" in plaats
      van "ik kan de site niet zien". De clusters kregen geen canonieke
      pagina.
   3. Zonder canonieke pagina koos de besluitmotor NEW_ARTICLE. Content
      Studio had nul beoordeelbare voorstellen en zag er rustig uit.

   En twee fouten die bij het meten bovenkwamen en die ook zonder
   container-probleem bestonden:

   4. scanSite() las alleen de WORTEL: 60 van de 430 pagina's.
   5. leesSitemapPaden() volgde de sitemapINDEX niet: 2 paden in plaats
      van 430.
   ============================================================ */

import { strict as assert } from "node:assert";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { createHash } from "node:crypto";
import {
  bouwSitekennis,
  gepubliceerdeRoutes,
  hashVan,
  leesSitekennis,
  paginaVan,
  SITEKENNIS_PAD,
  SITEKENNIS_SCHEMA,
  type SitekennisBestand,
} from "../../src/site/sitekennis.ts";
import { isSitemapIndex, leesSitemapPaden, padVan, scanSite } from "../../src/site/paginascan.ts";

/* ------------------------------------------------------------------
   Een nagebouwde minisite, zodat de toetsen niet aan de echte repo hangen
   ------------------------------------------------------------------ */

const PAGINA = (titel: string, h1: string, extra = "") => `<!doctype html>
<html lang="nl"><head>
<title>${titel}</title>
<link rel="canonical" href="https://www.vibeenergy.nl/x">
${extra}
</head><body>
<h1>${h1}</h1>
<p>Netcongestie is een tekort aan transportcapaciteit op het elektriciteitsnet.</p>
<h2>Waarom netverzwaring tijd kost</h2>
<p>Een station bijbouwen is een bouwproject met een eigen doorlooptijd.</p>
<a href="/contact">contact</a>
</body></html>`;

async function maakSite(wortel: string, opties: { index?: boolean } = {}): Promise<void> {
  await writeFile(join(wortel, "index.html"), PAGINA("Home", "Vibe Energy"), "utf8");
  await mkdir(join(wortel, "kennis"), { recursive: true });
  await writeFile(
    join(wortel, "kennis", "netcongestie-uitgelegd.html"),
    PAGINA("Netcongestie uitgelegd", "Netcongestie: waar de grens zit"),
    "utf8",
  );
  await writeFile(
    join(wortel, "kennis", "oud.html"),
    PAGINA("Oud", "Oud", '<meta name="robots" content="noindex">'),
    "utf8",
  );
  await mkdir(join(wortel, "regios"), { recursive: true });
  await writeFile(
    join(wortel, "regios", "utrecht.html"),
    PAGINA("Utrecht", "Netcongestie in Utrecht"),
    "utf8",
  );

  const urls = ["/", "/kennis/netcongestie-uitgelegd", "/regios/utrecht"];
  const urlset = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>https://www.vibeenergy.nl${u === "/" ? "/" : u}</loc></url>`).join("\n")}
</urlset>`;

  if (opties.index) {
    /* Precies de vorm die productie sinds Release 3.1 serveert. */
    await writeFile(
      join(wortel, "sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://www.vibeenergy.nl/sitemap-nationaal.xml</loc></sitemap>
  <sitemap><loc>https://www.vibeenergy.nl/sitemap-regios.xml</loc></sitemap>
</sitemapindex>`,
      "utf8",
    );
    await writeFile(join(wortel, "sitemap-nationaal.xml"), urlset.replace(/<url><loc>https:\/\/www\.vibeenergy\.nl\/regios[\s\S]*?<\/url>/, ""), "utf8");
    await writeFile(
      join(wortel, "sitemap-regios.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://www.vibeenergy.nl/regios/utrecht</loc></url>
</urlset>`,
      "utf8",
    );
  } else {
    await writeFile(join(wortel, "sitemap.xml"), urlset, "utf8");
  }
}

describe("sitekennis", () => {
  let site: string;
  let siteIndex: string;

  before(async () => {
    site = await mkdtemp(join(tmpdir(), "vibe-site-"));
    await maakSite(site);
    siteIndex = await mkdtemp(join(tmpdir(), "vibe-site-idx-"));
    await maakSite(siteIndex, { index: true });
  });

  after(async () => {
    await rm(site, { recursive: true, force: true });
    await rm(siteIndex, { recursive: true, force: true });
  });

  /* ---------- 4 en 5: de scanner zelf ---------- */

  test("REGRESSIE 4: de scan leest submappen, niet alleen de wortel", async () => {
    /* Dit was de stille helft van de productiefout: ook met de hele repo
       binnen handbereik zag scanSite() 60 van de 430 pagina's, want hij
       deed readdir() zonder recursie. */
    const s = await scanSite(site);
    const paden = s.paginas.map((p) => p.pad).sort();
    assert.ok(paden.includes("/kennis/netcongestie-uitgelegd"), `submap gemist: ${paden.join(", ")}`);
    assert.ok(paden.includes("/regios/utrecht"), "regiomap gemist");
    assert.ok(paden.includes("/"), "de home hoort '/' te zijn, niet '/index'");
  });

  test("REGRESSIE 5: een sitemapINDEX wordt gevolgd", async () => {
    /* Productie serveert sinds Release 3.1 een index met twee kinderen.
       De lezer gaf toen twee paden terug — en die twee waren de
       kindsitemaps zelf, niet pagina's. */
    const platte = await leesSitemapPaden(site);
    const viaIndex = await leesSitemapPaden(siteIndex);
    assert.equal(platte.size, 3, "de platte sitemap heeft drie URL's");
    assert.equal(viaIndex.size, 3, `via de index hoort hetzelfde eruit te komen, kreeg ${viaIndex.size}`);
    assert.ok(viaIndex.has("/regios/utrecht"), "de kindsitemap is niet gevolgd");
    assert.ok(!viaIndex.has("/sitemap-regios.xml"), "een kindsitemap is geen pagina");
  });

  test("padVan maakt van een submappad een publiek pad", () => {
    assert.equal(padVan("index.html"), "/");
    assert.equal(padVan("kennis/peak-shaving.html"), "/kennis/peak-shaving");
    assert.equal(padVan("regios/index.html"), "/regios");
  });

  test("isSitemapIndex onderscheidt een index van een urlset", () => {
    assert.equal(isSitemapIndex('<sitemapindex xmlns="x">'), true);
    assert.equal(isSitemapIndex('<urlset xmlns="x">'), false);
  });

  /* ---------- 3, 6 en 7: wat er in het artefact mag ---------- */

  test("REGRESSIE 3: een geldig artefact vindt de bestaande pagina's", async () => {
    const k = await bouwSitekennis(site);
    const routes = gepubliceerdeRoutes(k);
    assert.ok(routes.has("/kennis/netcongestie-uitgelegd"));
    assert.ok(routes.has("/regios/utrecht"));
    const pagina = paginaVan(k, "/kennis/netcongestie-uitgelegd");
    assert.ok(pagina, "de pagina hoort opzoekbaar te zijn");
    assert.equal(pagina.h1, "Netcongestie: waar de grens zit");
    assert.ok(
      pagina.secties.some((x) => x.kop === "Waarom netverzwaring tijd kost" && x.tekst.length > 20),
      "de sectie hoort zijn EIGEN tekst te dragen; anders toont een voorstel de verkeerde 'voor'",
    );
  });

  test("REGRESSIE 6 en 7: NOINDEX en niet-in-sitemap komen er niet in", async () => {
    const k = await bouwSitekennis(site);
    const routes = gepubliceerdeRoutes(k);
    /* kennis/oud.html heeft robots=noindex EN staat niet in de sitemap. */
    assert.ok(!routes.has("/kennis/oud"), "een noindex-pagina mag nooit een doelpagina worden");
    for (const p of k.paginas) {
      assert.equal(p.staat, "gepubliceerd", `${p.route} hoort alleen gepubliceerd te zijn`);
    }
  });

  /* ---------- 1 en 2: het artefact ontbreekt ---------- */

  test("REGRESSIE 1: een ontbrekend artefact wordt geweigerd, niet stil leeg", async () => {
    const leeg = await mkdtemp(join(tmpdir(), "vibe-leeg-"));
    try {
      const r = await leesSitekennis(leeg);
      assert.equal(r.ok, false);
      if (r.ok) return;
      assert.equal(r.fout.soort, "ontbreekt");
      /* De boodschap moet zeggen WAT het gevolg is, want dat was precies
         wat niemand zag: dat alles NEW_ARTICLE zou worden. */
      assert.match(r.fout.bericht, /NIEUW artikel|nieuw artikel/i);
      assert.match(r.fout.bericht, /npm run sitekennis/);
    } finally {
      await rm(leeg, { recursive: true, force: true });
    }
  });

  test("REGRESSIE 2: een leeg artefact wordt geweigerd", async () => {
    const dir = await mkdtemp(join(tmpdir(), "vibe-leeg2-"));
    try {
      await mkdir(join(dir, "data"), { recursive: true });
      const leegKennis = {
        schema: SITEKENNIS_SCHEMA,
        websiteVersie: "a".repeat(64),
        routesGegenereerd: null,
        aantalPaginas: 0,
        paginas: [],
      };
      await writeFile(
        join(dir, SITEKENNIS_PAD),
        JSON.stringify({ ...leegKennis, inhoudsHash: hashVan(leegKennis) }),
        "utf8",
      );
      const r = await leesSitekennis(dir);
      assert.equal(r.ok, false, "nul pagina's hoort een weigering te zijn");
      if (!r.ok) assert.match(r.fout.bericht, /nul pagina/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  /* ---------- 4 en 5 uit §17: ongeldig en verouderd ---------- */

  test("REGRESSIE: een gemanipuleerd artefact wordt op de hash betrapt", async () => {
    const dir = await mkdtemp(join(tmpdir(), "vibe-stuk-"));
    try {
      await mkdir(join(dir, "data"), { recursive: true });
      const echt = await bouwSitekennis(site);
      /* Iemand zet er een pagina bij zonder de hash bij te werken: precies
         wat een aanvaller of een slordige merge zou doen. */
      const gemanipuleerd = {
        ...echt,
        paginas: [
          ...echt.paginas,
          { ...echt.paginas[0]!, route: "/gesmokkeld", titel: "Niet van de site" },
        ],
        aantalPaginas: echt.aantalPaginas + 1,
      };
      await writeFile(join(dir, SITEKENNIS_PAD), JSON.stringify(gemanipuleerd), "utf8");
      const r = await leesSitekennis(dir);
      assert.equal(r.ok, false, "een gewijzigd artefact hoort te worden geweigerd");
      if (!r.ok) {
        assert.equal(r.fout.soort, "hash");
        assert.match(r.fout.bericht, /na generatie gewijzigd/);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("REGRESSIE: een artefact met een ander schema wordt geweigerd", async () => {
    const dir = await mkdtemp(join(tmpdir(), "vibe-schema-"));
    try {
      await mkdir(join(dir, "data"), { recursive: true });
      const echt = await bouwSitekennis(site);
      const oudSchema = { ...echt, schema: SITEKENNIS_SCHEMA - 1 };
      await writeFile(
        join(dir, SITEKENNIS_PAD),
        JSON.stringify({ ...oudSchema, inhoudsHash: hashVan(oudSchema) }),
        "utf8",
      );
      const r = await leesSitekennis(dir);
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.equal(r.fout.soort, "schema");
        assert.match(r.fout.bericht, /schema/);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("REGRESSIE 5 uit §17: een VEROUDERD artefact wordt geweigerd", async () => {
    const dir = await mkdtemp(join(tmpdir(), "vibe-oud-"));
    try {
      await mkdir(join(dir, "data"), { recursive: true });
      const echt = await bouwSitekennis(site);
      await writeFile(join(dir, SITEKENNIS_PAD), JSON.stringify(echt), "utf8");

      /* Zonder verwachte versie: geldig. */
      const zonder = await leesSitekennis(dir);
      assert.equal(zonder.ok, true, "zonder verwachte versie hoort hij geldig te zijn");

      /* Met een ANDERE verwachte versie: verouderd. */
      const met = await leesSitekennis(dir, "b".repeat(64));
      assert.equal(met.ok, false, "een afwijkende websiteversie hoort te worden geweigerd");
      if (!met.ok) {
        assert.equal(met.fout.soort, "verouderd");
        assert.match(met.fout.bericht, /Regenereer/i);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("de websiteversie verandert mee met de inhoud", async () => {
    /* Anders kan het artefact niet verouderen zonder dat iemand het ziet. */
    const voor = await bouwSitekennis(site);
    await writeFile(
      join(site, "kennis", "netcongestie-uitgelegd.html"),
      PAGINA("Netcongestie uitgelegd", "Netcongestie: waar de grens zit", "<!-- gewijzigd -->") +
        "<p>Een extra alinea die de inhoud verandert.</p>",
      "utf8",
    );
    const na = await bouwSitekennis(site);
    assert.notEqual(
      voor.websiteVersie,
      na.websiteVersie,
      "een inhoudswijziging hoort de websiteversie te veranderen",
    );
    /* En terugzetten, zodat de volgende toets de oude site ziet. */
    await writeFile(
      join(site, "kennis", "netcongestie-uitgelegd.html"),
      PAGINA("Netcongestie uitgelegd", "Netcongestie: waar de grens zit"),
      "utf8",
    );
  });

  test("REGRESSIE 12: het artefact bevat geen geheimen", async () => {
    const k = await bouwSitekennis(site);
    const alles = JSON.stringify(k);
    for (const patroon of [
      /sk-[a-zA-Z0-9]{10,}/,
      /postgres(ql)?:\/\//,
      /INTEL_SESSIE_GEHEIM/,
      /OPENAI_API_KEY/,
      /password\s*[:=]/i,
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    ]) {
      assert.ok(!patroon.test(alles), `het artefact bevat iets dat op een geheim lijkt: ${patroon}`);
    }
  });

  test("de inhoudshash is stabiel bij gelijke invoer", async () => {
    /* Reproduceerbaarheid is de voorwaarde voor de CI-poort: wie twee keer
       bouwt op dezelfde site, hoort hetzelfde artefact te krijgen. */
    const a = await bouwSitekennis(site);
    const b = await bouwSitekennis(site);
    assert.equal(a.inhoudsHash, b.inhoudsHash, "twee bouwruns geven een ander artefact");
    assert.equal(a.websiteVersie, b.websiteVersie);
    /* En de hash dekt de inhoud echt: een velddwijziging verandert hem. */
    const { inhoudsHash: _, ...kennis } = a;
    const anders = hashVan({ ...kennis, aantalPaginas: kennis.aantalPaginas + 1 });
    assert.notEqual(anders, a.inhoudsHash);
  });

  test("de vingerafdruk per pagina is de hash van zijn eigen tekst", async () => {
    const k = await bouwSitekennis(site);
    for (const p of k.paginas) {
      assert.match(p.vingerafdruk, /^[0-9a-f]{64}$/);
      /* De vingerafdruk gaat over de VOLLEDIGE tekst, dus hij mag niet
         gelijk zijn aan de hash van het afgekapte fragment — anders zou
         een wijziging voorbij de afkapgrens onzichtbaar blijven. */
      const vanFragment = createHash("sha256").update(p.tekst, "utf8").digest("hex");
      if (p.tekst.length >= 1500) {
        assert.notEqual(p.vingerafdruk, vanFragment);
      }
    }
  });
});
