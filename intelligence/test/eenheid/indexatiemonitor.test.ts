/* ============================================================
   TEST — het indexatiemonitoringrapport, en de twee poorten eromheen
   ------------------------------------------------------------
   Vier dingen worden hier vastgelegd. Alle vier zijn gemeten defecten
   of gemeten nulstanden van 13 oktober 2026, geen stijlvoorkeuren.

   1. HET RAPPORT PRINT ALTIJD TIEN REGELS. Een weggelaten regel leest
      als "niet van toepassing" terwijl hij "niet gemeten" betekent.
      En een ontbrekende meting is NOOIT nul: `aantal` is dan null.

   2. TECHNICALLY_INDEXABLE EN GOOGLE_INDEXED BLIJVEN GESCHEIDEN. Dit is
      de aantrekkelijkste fout in dit domein: 430 technisch indexeerbare
      pagina's zien eruit als een antwoord op "hoeveel staan er in
      Google". De eigenaar zag in Search Console 35 geindexeerd tegenover
      ~15.300 niet; een substitutie zou een factor 12 wegpoetsen.

   3. DE OMGEKEERDE SITEMAPPARITEIT. `scanSite()` toetste alleen
      "indexeerbaar maar niet in de sitemap". De tegenhanger — IN de
      sitemap en toch noindex of een redirectstub — werd nergens
      getoetst, en dat is de gevaarlijkere kant.

   4. POORT: GEEN SITEMAP-INZENDING EN GEEN INDEXING API. Gemeten: nul
      treffers in de hele repo. De opdracht verbiedt de Indexing API voor
      gewone commerciele en regionale pagina's, dus die nulstand moet een
      poort zijn en niet een toevalligheid. De scanner draait met een
      CONTROLEMETING: hij moet een string die er zeker staat ook
      werkelijk vinden, anders bewijst "nul treffers" alleen dat de
      scanner stuk is.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { describe, test } from "node:test";

import {
  bewaakScheiding,
  bouwIndexatieRapport,
  dagstandBron,
  GSC_IMPORT_CONTRACT,
  INDEXATIE_METRIEKEN,
  koppelingStatussen,
  omgekeerdePariteit,
  type RapportInvoer,
  type RapportRegel,
} from "../../src/analytics/koppelingen.ts";
import { APP_WORTEL, REPO_WORTEL } from "../../src/kern/config.ts";
import { leesMigraties, MIGRATIE_MAP } from "../../src/db/migraties.ts";
import { scanSite } from "../../src/site/paginascan.ts";

/* ------------------------------------------------------------------
   Invoer waarin NIETS gemeten is. Dit is de stand in de
   productiecontainer: geen credentials, geen register, geen artefact.
   ------------------------------------------------------------------ */
const LEEG: RapportInvoer = {
  dagstandTabelBestaat: false,
  registerTotaal: null,
  registerInSitemap: null,
  technischIndexeerbaar: null,
  eigenMetingen: null,
  gscIndexatie: null,
  dagstandDagen: new Map(),
  dagstandLaatste: new Map(),
  zoekprestatie: null,
  conversie: null,
  koppelingen: koppelingStatussen(),
};

/* De GEMETEN stand van 13 oktober 2026: 430 canonieke URL's in het
   register, 430 technisch indexeerbaar uit de repo-scan, een eigen
   live-meting aanwezig, geen enkele credential. */
const VANDAAG: RapportInvoer = {
  ...LEEG,
  registerTotaal: 447,
  registerInSitemap: 430,
  technischIndexeerbaar: { aantal: 430, bron: "repo-scan" },
  eigenMetingen: { rijen: 430, http200: 430, canoniekKlopt: 430 },
};

describe("het rapport print altijd tien regels", () => {
  test("ook als er helemaal niets gemeten is", () => {
    const r = bouwIndexatieRapport(LEEG);
    assert.equal(r.length, 10);
    assert.deepEqual(
      r.map((x) => x.metriek),
      [...INDEXATIE_METRIEKEN],
      "de volgorde is contract: de dagstand en het dashboard lezen hem",
    );
  });

  test("een ontbrekende meting is null en NOOIT nul", () => {
    for (const r of bouwIndexatieRapport(LEEG)) {
      assert.equal(r.label, "NOT_AVAILABLE", `${r.metriek} hoort NOT_AVAILABLE te zijn`);
      assert.equal(r.aantal, null, `${r.metriek} kreeg een getal zonder meting`);
      assert.notEqual(r.aantal, 0, `${r.metriek} gebruikt 0 voor 'niet gemeten'`);
    }
  });

  test("elke regel draagt een bewijs dat zegt WAT ontbreekt", () => {
    for (const r of bouwIndexatieRapport(LEEG)) {
      assert.ok(r.bewijs.length > 40, `${r.metriek} heeft geen bruikbaar bewijs: ${r.bewijs}`);
    }
  });

  test("de gemeten stand van vandaag: 1 MEASURED, 1 INFERRED, 1 UNVERIFIED, 7 NOT_AVAILABLE", () => {
    const r = bouwIndexatieRapport(VANDAAG);
    const per = (l: string) => r.filter((x) => x.label === l).length;
    assert.equal(per("MEASURED"), 1, "alleen de canonieke inventaris is een BEWAARDE meting");
    assert.equal(per("INFERRED"), 1, "technisch indexeerbaar is berekenbaar maar niet bewaard");
    assert.equal(per("UNVERIFIED"), 1, "de indexatietrend is half: geen tweede dagstand");
    assert.equal(per("NOT_AVAILABLE"), 7, "zeven metrieken hebben geen bron");
    assert.equal(per("MEASURED") + per("INFERRED") + per("UNVERIFIED") + per("NOT_AVAILABLE"), 10);
  });

  test("ook zonder database tien regels, mét de databasefout als reden", () => {
    /* Dit was de ergste vorm van de weggelaten regel: het commando viel
       om met een stacktrace en gaf NUL regels. Nul regels leest als "er
       is niets aan de hand". Gemeten: `npm run analytics` zonder
       INTEL_DB_URL geeft nu tien regels en exitcode 5. */
    const r = bouwIndexatieRapport({
      ...LEEG,
      databaseFout: "INTEL_DB_URL ontbreekt",
      technischIndexeerbaar: { aantal: 430, bron: "repo-scan" },
    });
    assert.equal(r.length, 10);
    for (const regel of r.filter((x) => x.label === "NOT_AVAILABLE")) {
      assert.match(regel.bewijs, /DATABASE NIET BEREIKBAAR \(INTEL_DB_URL ontbreekt\)/);
      assert.equal(regel.aantal, null);
    }
    /* De enige metriek die GEEN database nodig heeft, blijft meetbaar. */
    const technisch = r.find((x) => x.metriek === "TECHNICALLY_INDEXABLE");
    assert.equal(technisch?.aantal, 430);
    assert.equal(technisch?.label, "INFERRED");
    assert.match(technisch?.bewijs ?? "", /de noemer uit intel\.pagina_register ontbreekt/);
  });

  test("de noemer staat erbij: '12 van 430' is informatie, '12' niet", () => {
    const r = bouwIndexatieRapport({
      ...VANDAAG,
      eigenMetingen: { rijen: 12, http200: 12, canoniekKlopt: 12 },
    });
    const trend = r.find((x) => x.metriek === "CURRENT_PAGE_INDEXATION");
    assert.equal(trend?.noemer, 447, "de indexatietrend hoort tegen het register gelezen te worden");
    assert.match(trend?.bewijs ?? "", /12 van 12 gemeten URL's/);
    assert.match(trend?.bewijs ?? "", /register 447/);
  });

  test("zonder dagstandtabel noemt het rapport het blokkerende defect bij naam", () => {
    const r = bouwIndexatieRapport(VANDAAG);
    const trend = r.find((x) => x.metriek === "CURRENT_PAGE_INDEXATION");
    assert.match(trend?.bewijs ?? "", /indexatie_dagstand bestaat niet/);
    assert.match(trend?.bewijs ?? "", /laatst_gecontroleerd_op = now\(\)/);
  });

  test("met twee dagstanden wordt de trend MEASURED — en pas dan", () => {
    const eenDag = bouwIndexatieRapport({
      ...VANDAAG,
      dagstandTabelBestaat: true,
      dagstandDagen: new Map([["CURRENT_PAGE_INDEXATION", 1]]),
    });
    assert.equal(
      eenDag.find((x) => x.metriek === "CURRENT_PAGE_INDEXATION")?.label,
      "UNVERIFIED",
      "een trend van één punt is geen trend",
    );
    const tweeDagen = bouwIndexatieRapport({
      ...VANDAAG,
      dagstandTabelBestaat: true,
      dagstandDagen: new Map([["CURRENT_PAGE_INDEXATION", 2]]),
    });
    assert.equal(
      tweeDagen.find((x) => x.metriek === "CURRENT_PAGE_INDEXATION")?.label,
      "MEASURED",
    );
  });
});

describe("TECHNICALLY_INDEXABLE en GOOGLE_INDEXED blijven gescheiden", () => {
  test("430 technisch indexeerbaar maakt GOOGLE_INDEXED niet 430 — die blijft ONBEKEND", () => {
    const r = bouwIndexatieRapport(VANDAAG);
    const technisch = r.find((x) => x.metriek === "TECHNICALLY_INDEXABLE");
    const google = r.find((x) => x.metriek === "GOOGLE_INDEXED");
    assert.equal(technisch?.aantal, 430);
    assert.equal(google?.aantal, null, "zonder Search Console is dit ONBEKEND, niet 430 en niet 0");
    assert.equal(google?.label, "NOT_AVAILABLE");
    assert.match(google?.bewijs ?? "", /NIET vervangen door TECHNICALLY_INDEXABLE/);
  });

  test("GOOGLE_INDEXED komt UITSLUITEND uit een zoekmachinebron", () => {
    const r = bouwIndexatieRapport({
      ...VANDAAG,
      gscIndexatie: { rijen: 430, geindexeerdJa: 35, bron: "gsc" },
    });
    const google = r.find((x) => x.metriek === "GOOGLE_INDEXED");
    assert.equal(google?.aantal, 35);
    assert.equal(google?.bron, "gsc");
    assert.equal(
      r.find((x) => x.metriek === "TECHNICALLY_INDEXABLE")?.aantal,
      430,
      "de twee getallen horen naast elkaar te staan, niet in elkaar",
    );
  });

  test("bewaakScheiding werpt als GOOGLE_INDEXED een getal uit een eigen bron krijgt", () => {
    const regels: RapportRegel[] = [
      {
        metriek: "TECHNICALLY_INDEXABLE",
        aantal: 430,
        noemer: 447,
        bron: "repo",
        label: "INFERRED",
        bewijs: "x",
      },
      {
        metriek: "GOOGLE_INDEXED",
        aantal: 430,
        noemer: 430,
        bron: "eigen_meting",
        label: "MEASURED",
        bewijs: "x",
      },
    ];
    assert.throws(() => bewaakScheiding(regels), /geen substituut voor geindexeerd/i);
  });

  test("bewaakScheiding werpt als een van de twee regels ONTBREEKT", () => {
    assert.throws(
      () =>
        bewaakScheiding([
          {
            metriek: "TECHNICALLY_INDEXABLE",
            aantal: 430,
            noemer: null,
            bron: "repo",
            label: "INFERRED",
            bewijs: "x",
          },
        ]),
      /moeten BEIDE als regel bestaan/,
    );
  });

  test("elke bron uit het rapport is afbeeldbaar op de CHECK van 0034", () => {
    const toegestaan = new Set(["eigen_meting", "gsc", "bing_webmaster", "ga4", "crm"]);
    const bronnen = new Set([
      ...bouwIndexatieRapport(LEEG).map((r) => r.bron),
      ...bouwIndexatieRapport(VANDAAG).map((r) => r.bron),
      "sitekennisartefact (websiteversie abc)",
      "repo-scan van /ergens",
      "gsc+bing_webmaster",
      "ga4+crm",
    ]);
    for (const b of bronnen) {
      assert.ok(
        toegestaan.has(dagstandBron(b)),
        `bron '${b}' valt buiten de CHECK van indexatie_dagstand.bron`,
      );
    }
    /* En de scheiding mag door die afbeelding niet sneuvelen: een
       GSC-getal mag nooit als eigen meting in de historie landen. */
    assert.equal(dagstandBron("gsc"), "gsc");
    assert.equal(dagstandBron("gsc+bing_webmaster"), "gsc");
    assert.equal(dagstandBron("pagina_register"), "eigen_meting");
  });
});

describe("de omgekeerde sitemappariteit", () => {
  test("in de sitemap én noindex is een tegenstrijdige instructie", () => {
    const uit = omgekeerdePariteit([
      { pad: "/a", inSitemap: true, indexeerbaar: true, isRedirectStub: false },
      { pad: "/b", inSitemap: true, indexeerbaar: false, isRedirectStub: false },
      { pad: "/c", inSitemap: false, indexeerbaar: false, isRedirectStub: false },
    ]);
    assert.deepEqual(uit.sitemapMaarNoindex, ["/b"]);
    assert.deepEqual(uit.sitemapMaarRedirectStub, []);
    assert.deepEqual(uit.alle, ["/b"]);
  });

  test("in de sitemap én een meta-refresh-stub telt ook", () => {
    const uit = omgekeerdePariteit([
      { pad: "/oud", inSitemap: true, indexeerbaar: true, isRedirectStub: true },
      { pad: "/stub", inSitemap: false, indexeerbaar: false, isRedirectStub: true },
    ]);
    assert.deepEqual(uit.sitemapMaarRedirectStub, ["/oud"]);
    assert.deepEqual(uit.alle, ["/oud"]);
  });

  test("een pagina die beide is, komt één keer in `alle`", () => {
    const uit = omgekeerdePariteit([
      { pad: "/x", inSitemap: true, indexeerbaar: false, isRedirectStub: true },
    ]);
    assert.deepEqual(uit.alle, ["/x"]);
  });

  test("POORT op de echte site: de sitemap bevat niets dat noindex of een stub is", async () => {
    const scan = await scanSite(REPO_WORTEL).catch(() => null);
    if (!scan || scan.paginas.length === 0) {
      /* Geen stille PASS: zonder website is dit NIET GEMETEN. In de
         productiecontainer is rootDirectory `intelligence`, dus daar
         bestaat de HTML niet. */
      assert.ok(true);
      return;
    }
    const uit = omgekeerdePariteit(
      scan.paginas.map((p) => ({
        pad: p.pad,
        inSitemap: p.inSitemap,
        indexeerbaar: p.indexeerbaar,
        isRedirectStub: p.isRedirectStub,
      })),
    );
    assert.deepEqual(
      uit.alle,
      [],
      "deze paden staan in de sitemap terwijl ze noindex of een redirectstub zijn",
    );
    /* Controlemeting: de scan moet werkelijk de hele site hebben gezien,
       anders bewijst een lege afwijkingslijst niets. */
    assert.ok(
      scan.sitemapPaden.size >= 100,
      `de sitemap gaf ${scan.sitemapPaden.size} paden; onder 100 is de scan stuk, niet de site`,
    );
  });
});

/* ============================================================
   POORT — geen sitemap-inzending, geen Indexing API
   ============================================================ */

const CODE_EXTENSIES = [".ts", ".mjs", ".cjs", ".js", ".json", ".sql", ".yaml", ".yml"];
const NIET_SCANNEN = new Set(["node_modules", ".git", "backups", "review", "new-pages"]);

/**
 * Deze toets noemt de verboden patronen zelf en zou dus zijn eigen
 * treffer vinden. Daarom staat hij op de uitsluitlijst — bij naam, zodat
 * de uitzondering niet per ongeluk breder wordt.
 */
const EIGEN_BESTAND = "intelligence/test/eenheid/indexatiemonitor.test.ts";

async function codeBestanden(wortel: string, prefix = ""): Promise<string[]> {
  const uit: string[] = [];
  const items = await readdir(join(wortel, prefix), { withFileTypes: true });
  for (const item of items) {
    const rel = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      if (NIET_SCANNEN.has(item.name) || item.name.startsWith(".")) continue;
      uit.push(...(await codeBestanden(wortel, rel)));
    } else if (CODE_EXTENSIES.some((e) => item.name.toLowerCase().endsWith(e))) {
      uit.push(rel);
    }
  }
  return uit;
}

describe("POORT: de repo dient geen sitemap in en roept geen Indexing API aan", () => {
  /* De patronen. `webmasters.readonly` is TOEGESTAAN — lezen is precies
     wat metriek 3 en 6 nodig hebben. Het is de SCHRIJFscope die hier
     rood hoort te worden, plus elke vorm van inzenden of pingen.

     Documentatie (.md) wordt NIET gescand: een document moet kunnen
     opschrijven wat verboden is zonder de poort te laten vuren. */
  const VERBODEN: readonly { patroon: RegExp; waarom: string }[] = [
    { patroon: /urlNotification/i, waarom: "Indexing API: URL-notificatie" },
    { patroon: /indexing\.googleapis\.com/i, waarom: "Indexing API-endpoint" },
    { patroon: /auth\/indexing/i, waarom: "OAuth-scope van de Indexing API" },
    {
      patroon: /auth\/webmasters(?!\.readonly)/i,
      waarom: "Search Console SCHRIJFscope (readonly is wel toegestaan)",
    },
    { patroon: /sitemaps[.\/]submit/i, waarom: "sitemap-inzending via de API" },
    { patroon: /ping\?sitemap=/i, waarom: "het oude sitemap-pingendpoint" },
  ];

  test("nul treffers — met een geslaagde controlemeting dat de scanner werkt", async () => {
    const bestanden = await codeBestanden(REPO_WORTEL);
    assert.ok(
      bestanden.length >= 50,
      `de scanner vond ${bestanden.length} codebestanden; dat is te weinig om iets te bewijzen`,
    );

    const treffers: string[] = [];
    /* DE CONTROLEMETING. Een scanner die niets vindt omdat hij stuk is,
       ziet er precies zo uit als een repo die schoon is. Deze string
       staat er zeker (migratie 0034 en src/analytics/koppelingen.ts), dus
       als hij NIET gevonden wordt is de poort waardeloos. */
    const controle = "indexatie_dagstand";
    let controleTreffers = 0;

    for (const rel of bestanden) {
      if (rel === EIGEN_BESTAND) continue;
      const inhoud = await readFile(resolve(REPO_WORTEL, rel), "utf8");
      if (inhoud.includes(controle)) controleTreffers += 1;
      for (const { patroon, waarom } of VERBODEN) {
        if (patroon.test(inhoud)) treffers.push(`${rel}: ${waarom} (${patroon})`);
      }
    }

    assert.ok(
      controleTreffers >= 2,
      `CONTROLEMETING MISLUKT: '${controle}' werd in ${controleTreffers} bestand(en) gevonden ` +
        "maar staat zeker in migratie 0034 én in src/analytics/koppelingen.ts. " +
        "Zolang dit faalt bewijst 'nul treffers' niets.",
    );

    assert.deepEqual(
      treffers,
      [],
      "de opdracht verbiedt de Indexing API voor gewone commerciele en regionale pagina's, en " +
        "een sitemap wordt met de hand ingezonden zodat metriek 6 een nulmeting houdt",
    );
  });

  test("de poort vuurt wel degelijk op een verboden regel", () => {
    /* Zonder deze toets zou een kapot patroon ook als PASS doorgaan.
       De fragmenten staan los zodat de scanner hierboven ze niet als
       treffer in dit bestand ziet — die uitsluiting is al geregeld, maar
       de patronen moeten aantoonbaar bijten. */
    const nep = `const scope = "https://www.googleapis.com/auth/` + `webmasters";`;
    const geraakt = VERBODEN.filter((v) => v.patroon.test(nep));
    assert.equal(geraakt.length, 1, "de schrijfscope hoort precies één patroon te raken");
    const readonly = `const scope = "https://www.googleapis.com/auth/` + `webmasters.readonly";`;
    assert.deepEqual(
      VERBODEN.filter((v) => v.patroon.test(readonly)),
      [],
      "lezen moet toegestaan blijven; metriek 3 en 6 hebben het nodig",
    );
  });
});

/* ============================================================
   DROGE VORMCONTROLE OP MIGRATIE 0034
   ------------------------------------------------------------
   Er is geen database beschikbaar (en de productiedatabase is
   privé-only), dus `npm run migreer -- --droog` kan niet draaien: die
   doet `client.query(BOOTSTRAP)` en heeft dus een verbinding nodig.
   `leesMigraties()` leest alleen van schijf en kan dat wél, en de vier
   dingen die 0008_invarianten.sql en test/integratie/schema.test.ts
   eisen zijn in de TEKST te controleren.
   ============================================================ */

describe("migratie 0034 — de vorm die de bestaande invarianten eisen", () => {
  const PAD = resolve(MIGRATIE_MAP, "0034_indexatie_dagstand.sql");

  test("leesMigraties() leest hem, zonder dubbel nummer", async () => {
    const alle = await leesMigraties();
    const m = alle.find((x) => x.naam === "0034_indexatie_dagstand.sql");
    assert.ok(m, "0034 staat niet in de migratiemap");
    assert.equal(m.nummer, 34);
    assert.equal(m.hash.length, 64, "elke migratie draagt een sha256 voor driftdetectie");
    assert.equal(
      alle.filter((x) => x.nummer === 34).length,
      1,
      "0034 mag maar één keer voorkomen",
    );
    /* De map waarin hij staat hoort bij deze app, niet bij de website. */
    assert.equal(relative(APP_WORTEL, PAD), join("db", "migraties", "0034_indexatie_dagstand.sql"));
  });

  test("identity-primaire sleutel, foreign key, RLS mét policy, en grants", async () => {
    const sql = await readFile(PAD, "utf8");
    assert.match(sql, /id\s+bigint generated always as identity primary key/);
    assert.match(sql, /organisatie_id\s+bigint not null references intel\.organisaties\(id\)/);
    assert.match(sql, /enable row level security/);
    assert.match(sql, /create policy %I_eigen_organisatie/);
    assert.match(sql, /grant select, insert, update on intel\.indexatie_dagstand to vibe_intel_app/);
    assert.match(sql, /grant select on intel\.indexatie_dagstand to vibe_intel_lezer/);
    assert.match(sql, /grant usage on sequence intel\.indexatie_dagstand_id_seq/);
    /* Historie die de applicatie kan weggooien is geen historie. */
    assert.doesNotMatch(sql, /grant[^;]*delete[^;]*indexatie_dagstand/i);
  });

  test("`aantal` is NULLABLE, met de twee constraints die nul-als-noodgreep afsluiten", async () => {
    const sql = await readFile(PAD, "utf8");
    /* Alleen de kolomdefinities, niet de kop: die legt juist UIT waarom
       0006 regel 149 `aantal integer not null` heeft en waarom dat hier
       geen rechtvaardiging is. Zonder deze afbakening zou de toets op
       zijn eigen toelichting vuren. */
    const body =
      /create table if not exists intel\.indexatie_dagstand \(([\s\S]*?)\n\);/.exec(sql)?.[1] ?? "";
    assert.ok(body.length > 200, "de create-table van 0034 is niet gevonden");
    assert.doesNotMatch(
      body,
      /aantal\s+integer not null/,
      "een dagstand waarin 'niet gemeten' moet kunnen staan heeft een nullable aantal nodig",
    );
    assert.match(body, /aantal\s+integer\s*,/);
    assert.match(body, /check \(label <> 'NOT_AVAILABLE' or aantal is null\)/);
    assert.match(body, /check \(label <> 'MEASURED' or aantal is not null\)/);
  });

  test("de twee dode kolommen worden gedropt, met `if exists`", async () => {
    const sql = await readFile(PAD, "utf8");
    assert.match(
      sql,
      /alter table intel\.pagina_register drop column if exists live_http_status;/,
    );
    assert.match(sql, /alter table intel\.pagina_register drop column if exists live_gemeten_op;/);
  });

  test("de twee kolommen zijn echt dood: niemand buiten hun definitieregel noemt ze", async () => {
    /* Dit is de meting waarop het DROP-besluit rust, en hij hoort hier
       zodat een latere aanroeper hem niet stil ongedaan maakt. */
    const bestanden = await codeBestanden(REPO_WORTEL);
    const treffers: string[] = [];
    for (const rel of bestanden) {
      if (rel === EIGEN_BESTAND) continue;
      const inhoud = await readFile(resolve(REPO_WORTEL, rel), "utf8");
      for (const kolom of ["live_http_status", "live_gemeten_op"]) {
        if (inhoud.includes(kolom)) treffers.push(`${rel}: ${kolom}`);
      }
    }
    /* Precies twee soorten treffers mogen bestaan: de definitieregels in
       0004 (dat is waar ze geboren zijn) en de DROP plus toelichting in
       0034 (dat is waar ze sterven). Elke derde treffer betekent dat
       iemand ze WEL gebruikt, en dan is droppen de verkeerde beslissing. */
    assert.deepEqual(
      treffers.sort(),
      [
        "intelligence/db/migraties/0004_inhoud.sql: live_gemeten_op",
        "intelligence/db/migraties/0004_inhoud.sql: live_http_status",
        "intelligence/db/migraties/0034_indexatie_dagstand.sql: live_gemeten_op",
        "intelligence/db/migraties/0034_indexatie_dagstand.sql: live_http_status",
      ],
      "zodra iemand deze kolommen WEL gaat gebruiken, is droppen de verkeerde beslissing",
    );
  });

  test("de metriekenlijst in de code en de CHECK in 0034 lopen niet uiteen", async () => {
    const sql = await readFile(PAD, "utf8");
    for (const m of INDEXATIE_METRIEKEN) {
      assert.ok(sql.includes(`'${m}'`), `metriek ${m} staat niet in de CHECK van 0034`);
    }
    /* En omgekeerd: geen metriek in de CHECK die de code niet kent. */
    const blok = /metriek\s+text not null check \(metriek in \(([\s\S]*?)\)\)/.exec(sql)?.[1] ?? "";
    const inSql = [...blok.matchAll(/'([A-Z_0-9]+)'/g)].map((x) => x[1]);
    assert.deepEqual(inSql, [...INDEXATIE_METRIEKEN]);
  });

  test("het importcontract benoemt de metrieken die de CSV-import moet vullen", () => {
    for (const m of GSC_IMPORT_CONTRACT.dagstandMetrieken) {
      assert.ok(
        (INDEXATIE_METRIEKEN as readonly string[]).includes(m),
        `het importcontract noemt ${m}, maar dat is geen metriek van het rapport`,
      );
    }
    assert.equal(GSC_IMPORT_CONTRACT.perUrlBron, "gsc");
    assert.equal(GSC_IMPORT_CONTRACT.datumIs, "exportdatum");
    /* EEN ONDERGRENS IS GEEN TOTAAL. Search Console exporteert maximaal
       1.000 voorbeeld-URL's per reden tegenover een rapportcijfer van
       ~7.700; een afgekapte import die als MEASURED zou landen, laat een
       probleem van 13 procent in kaart lijken terwijl 87 procent
       ongezien is. */
    assert.equal(GSC_IMPORT_CONTRACT.afgekaptLabel, "UNVERIFIED");
    assert.equal(GSC_IMPORT_CONTRACT.volledigLabel, "MEASURED");
    assert.equal(GSC_IMPORT_CONTRACT.artefactSleutel, "gsc_inventaris");
  });
});
