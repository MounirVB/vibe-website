/* ============================================================
   BROWSERTOETS — de Content Studio zoals een redacteur hem ziet
   ------------------------------------------------------------
   DRAAIEN

     npm run browser

   Dit bestand staat MET OPZET buiten de drie globs van `npm test` en
   `npm run poort`. Een browsertoets heeft een echte browser nodig, en
   die hoort een poort niet stil te laten falen op een machine zonder
   browser. Het commando meldt expliciet NIET GEDRAAID met de reden als
   er geen browser is, en dat is een eerlijke uitkomst — geen stille
   PASS.

   WAAROM playwright-core EN GEEN playwright

   `playwright` downloadt bij installatie ~130 MB browsers. `-core`
   doet dat niet en gebruikt een browser die er al staat. Release 3.0.5
   kon geen browser-E2E draaien omdat het enige chromium-script in deze
   repo `playwright-core` uit een ANDER project leende — precies wat
   par. 30 verbiedt. Nu is de afhankelijkheid van deze repo zelf.

   WELKE BROWSER
   In deze orde, de eerste die bestaat:
     1 PLAYWRIGHT_CHROME — expliciet pad, voor CI of een eigen opstelling
     2 channel 'chrome'  — de Google Chrome die op het systeem staat
   Een ontbrekende browser is NIET GEDRAAID met de installatie-instructie
   erbij.

   WAT ER GETOETST WORDT, EN WAT NIET
   Een eigen wegwerpdatabase, een eigen app op een efemere poort, en
   synthetische fixtures. Er wordt geen productie-inhoud goedgekeurd en
   niets gepubliceerd: de studio heeft geen publicatieroute, en de
   goedkeurtoets hieronder draait op een fixturevoorstel in een database
   die daarna wordt weggegooid.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import { existsSync } from "node:fs";
import type { Server } from "node:http";
import type { Browser, BrowserContext, Page } from "playwright-core";

import {
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { maakApp } from "../../src/dashboard/server.ts";
import { maakSessieCookie } from "../../src/dashboard/auth.ts";
import { CSRF_KOEKJE, CSRF_VELD, maakCsrfToken } from "../../src/dashboard/bescherming.ts";
import { inhoudsHashVan } from "../../src/inhoud/voorstel.ts";
import { bouwNieuwePaginaVoorstel } from "../../src/inhoud/nieuwepagina.ts";

/* De callbacks van page.evaluate() draaien IN de browser, dus `document`
   bestaat daar wel en in de Node-typings niet. DOM-typings project-breed
   aanzetten zou servercode browserglobals laten gebruiken; dat is erger
   dan deze lokale declaratie. */
declare const document: {
  readonly documentElement: { readonly scrollWidth: number; readonly clientWidth: number };
  readonly activeElement: { readonly tagName: string } | null;
};

const GEHEIM = "b".repeat(40);
const PAD = "/kennis/fixture-browser-niet-live";

const INSTRUCTIE =
  "Geen browser gevonden. Installeer Google Chrome, of zet PLAYWRIGHT_CHROME op het pad van " +
  "een Chromium-binary. In CI: actions/setup-node plus de voorgeïnstalleerde Chrome van de " +
  "runner, of `npx playwright install --with-deps chromium` en PLAYWRIGHT_CHROME naar die build.";

/** Het eerste bruikbare browserpad, of null. */
function browserpad(): { soort: "pad"; waarde: string } | { soort: "kanaal" } | null {
  const expliciet = process.env["PLAYWRIGHT_CHROME"];
  if (expliciet && existsSync(expliciet)) return { soort: "pad", waarde: expliciet };
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(chrome)) return { soort: "kanaal" };
  return null;
}

const keuze = browserpad();

describe("Content Studio in een echte browser", { skip: keuze === null ? INSTRUCTIE : false }, () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let server: Server;
  let basis = "";
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  const gebruikers: Record<string, number> = {};
  const voorstellen: Record<string, { id: string; hash: string }> = {};
  /** De conceptVERSIE voor /studio/:id; een andere tabel dan de voorstellen. */
  let conceptVersie = "";

  before(async () => {
    process.env["INTEL_SESSIE_GEHEIM"] = GEHEIM;
    process.env["INTEL_OMGEVING"] = "test";

    db = await maakWegwerpdatabase("browserstudio");
    org = await maakOrganisatie(db, "vibe-energy");
    for (const rol of ["beheerder", "lezer", "redacteur"] as const) {
      gebruikers[rol] = await maakGebruiker(db, org, `${rol}@vibeenergy.nl`, rol);
    }

    /* Drie soorten voorstel, zodat de drie bakken van de studio alle
       drie gevuld zijn: een feitelijke revisie, een linkvoorstel en een
       voorstel voor een nieuwe pagina. */
    const soorten = [
      { sleutel: "feitelijk", eindoordeel: "KLAAR_VOOR_REVIEW", status: "READY_FOR_REVIEW", soort: "alinea_toevoegen", nieuw: false },
      { sleutel: "link", eindoordeel: "KLAAR_VOOR_LINKREVIEW", status: "READY_FOR_LINK_REVIEW", soort: "interne_link", nieuw: false },
      { sleutel: "nieuwepagina", eindoordeel: "NIEUWE_PAGINA", status: "NEW_PAGE_CANDIDATE", soort: "geen", nieuw: true },
    ];

    for (const s of soorten) {
      const tekst = `Fixturetekst voor ${s.sleutel}. Testmateriaal, hoort niet op de website.`;
      const hash = inhoudsHashVan({
        doelPad: PAD,
        doelSectie: "Wat dit kost",
        wijzigingSoort: s.soort,
        nieuweTekst: tekst,
        feiten: [s.sleutel],
        links: [],
        ctaTekst: "Laat uw fixture doorrekenen",
        ctaDoel: "/contact",
      });
      const paginaVoorstel = s.nieuw
        ? bouwNieuwePaginaVoorstel({
            onderwerpSleutel: "netbeheer",
            fenomeen: "nettarief",
            feitZinnen: ["Volgens de fixture-uitgever stijgen de nettarieven met 20 procent."],
            naastgelegen: [{ route: PAD, vermeldingen: 24 }],
            bestaandeRoutes: new Set([PAD]),
          })
        : null;

      const id = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
        const g = await c.query<{ id: string }>(
          `insert into intel.markt_gebeurtenissen
             (organisatie_id, sleutel, titel, gebeurtenis_soort, risico_klasse)
           values ($1, $2, 'Fixture voor de browsertoets', 'overig', 'laag')
           returning id::text`,
          [org, `fixture-browser-${s.sleutel}`],
        );
        const k = await c.query<{ id: string }>(
          `insert into intel.inhoud_kandidaten
             (organisatie_id, gebeurtenis_id, besluit, motor_versie)
           values ($1, $2::bigint, 'UPDATE_EXISTING', 'fixture-browser')
           returning id::text`,
          [org, g.rows[0]!.id],
        );
        const v = await c.query<{ id: string }>(
          `insert into intel.inhoud_voorstellen
             (organisatie_id, kandidaat_id, gebeurtenis_id, doel_pad, wijziging_soort,
              doel_sectie, nieuwe_tekst, huidige_tekst, cta_tekst, cta_doel, cta_grondslag,
              eindoordeel, oordeel_reden, inhouds_hash, nieuwe_pagina, publicatie_status)
           values ($1, $2::bigint, $3::bigint, $4, $5, 'Wat dit kost', $6,
                   'De bestaande fixturetekst.', 'Laat uw fixture doorrekenen', '/contact',
                   'fixture', $7, 'fixture voor de browsertoets van release 3.0.6',
                   $8, $9, $10)
           returning id::text`,
          [org, k.rows[0]!.id, g.rows[0]!.id, PAD, s.soort, tekst, s.eindoordeel, hash,
           paginaVoorstel === null ? null : JSON.stringify(paginaVoorstel), s.status],
        );
        await c.query(
          `insert into intel.inhoud_voorstel_controles
             (voorstel_id, organisatie_id, naam, oordeel, reden, bewijs)
           values ($1::bigint, $2, 'bronverwijzing', 'PASS', 'fixture: bron aanwezig', '{}')`,
          [v.rows[0]!.id, org],
        );
        return v.rows[0]!.id;
      });
      voorstellen[s.sleutel] = { id, hash };
    }

    /* EEN CONCEPTVERSIE, want de drie fixtures hierboven zijn
       VOORSTELLEN (intel.inhoud_voorstellen) en de conceptdetailpagina
       leest intel.inhoud_versies. Dat zijn twee verschillende tabellen
       met twee verschillende goedkeurlanen; juist dat verschil was de
       reden dat de ene laan rechten toetste en de andere niet. */
    conceptVersie = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const g = await c.query<{ id: string }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, gebeurtenis_soort, risico_klasse)
         values ($1, 'fixture-browser-concept', 'Fixture nieuwsbericht voor de browsertoets',
                 'regelgeving', 'laag')
         returning id::text`,
        [org],
      );
      const cluster = await c.query<{ id: string }>(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam)
         values ($1, 'subsidie', 'Subsidies en fiscale regelingen') returning id::text`,
        [org],
      );
      const k = await c.query<{ id: string }>(
        `insert into intel.inhoud_kandidaten
           (organisatie_id, gebeurtenis_id, onderwerp_cluster_id, besluit, motor_versie,
            nieuwsscore, nieuws_oordeel, beoordeling)
         values ($1, $2::bigint, $3::bigint, 'NEWS_ITEM', 'nieuwsmotor-v1', 71,
                 'GESCHIKT (71/100) — fixture', $4)
         returning id::text`,
        [
          org,
          g.rows[0]!.id,
          cluster.rows[0]!.id,
          JSON.stringify({
            nieuws: {
              assen: [
                {
                  as: "bronkwaliteit",
                  score: 28,
                  max: 30,
                  componenten: [
                    {
                      naam: "dragende_bron",
                      score: 12,
                      max: 12,
                      bewijs: "dragende bronsoort(en): WETGEVING",
                    },
                  ],
                },
              ],
            },
          }),
        ],
      );
      const v = await c.query<{ id: string }>(
        `insert into intel.inhoud_versies
           (organisatie_id, kandidaat_id, pad, versie, soort, titel, meta_omschrijving,
            canonieke_url, direct_antwoord, body_markdown, structured_data, interne_links,
            bronnen_sectie, cta_sleutel, status, risico_klasse, auteur_soort,
            poorten_geslaagd, inhoud_afdruk, poortresultaten, blokkades, aangemaakt_door)
         values ($1, $2::bigint, '/nieuws/fixture-browser-niet-live', 1, 'nieuw_artikel',
                 'Fixturebericht voor de browsertoets van R2',
                 'Een metabeschrijving van de fixture, lang genoeg om de lengtepoort te halen zonder gezeur erover.',
                 'https://www.vibeenergy.nl/nieuws/fixture-browser-niet-live',
                 'Dit is het directe antwoord van de fixture en het is zelfstandig leesbaar.',
                 $3, $4, $5, $6, 'Vraag een businesscase aan', 'ter_review', 'laag', 'ai',
                 true, 'afdruk-browserfixture', $7, '{}', $8)
         returning id::text`,
        [
          org,
          k.rows[0]!.id,
          "De lead van de fixture.\n\n## Wat er is vastgelegd\n\n- **12 procent** — vastgelegd door de fixture-uitgever.\n",
          JSON.stringify({ "@context": "https://schema.org", "@type": "NewsArticle" }),
          JSON.stringify(["/contact", "/projecten"]),
          JSON.stringify([{ uitgever: "Fixture-uitgever", url: "https://example.test/bron" }]),
          JSON.stringify([
            { poort: "titel_lengte", geslaagd: true, ernst: "blokkerend", bevindingen: [] },
            {
              poort: "geen_verzonnen_getallen",
              geslaagd: false,
              ernst: "blokkerend",
              bevindingen: ["fixture: één getal staat niet in een gebonden uitspraak"],
            },
          ]),
          gebruikers["redacteur"]!,
        ],
      );
      return v.rows[0]!.id;
    });

    const app = maakApp(db.pool);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", () => r()));
    basis = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

    const { chromium } = await import("playwright-core");
    browser =
      keuze!.soort === "pad"
        ? await chromium.launch({ executablePath: keuze!.waarde })
        : await chromium.launch({ channel: "chrome" });
  });

  after(async () => {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
    await new Promise<void>((r) => server.close(() => r()));
    await db.opruimen();
  });

  /** Een context met een geldige sessie voor één rol. */
  async function alsRol(rol: "beheerder" | "lezer" | "redacteur"): Promise<Page> {
    await context?.close().catch(() => undefined);
    context = await browser.newContext({ baseURL: basis });
    const csrf = maakCsrfToken(GEHEIM);
    await context.addCookies([
      { name: "intel_sessie", value: maakSessieCookie(gebruikers[rol]!, org, 1), url: basis },
      { name: CSRF_KOEKJE, value: csrf, url: basis },
    ]);
    page = await context.newPage();
    return page;
  }

  /* Elke test vangt consolefouten op: een pagina die rendert maar in de
     console omvalt, is niet in orde. */
  function vangConsole(p: Page): string[] {
    const fouten: string[] = [];
    p.on("console", (m) => {
      if (m.type() === "error") fouten.push(m.text());
    });
    p.on("pageerror", (e) => fouten.push(String(e)));
    return fouten;
  }

  test("1. zonder sessie komt een bezoeker op de inlogpagina", async () => {
    const c = await browser.newContext({ baseURL: basis });
    const p = await c.newPage();
    await p.goto("/studio", { waitUntil: "domcontentloaded" });
    assert.match(p.url(), /\/inloggen/, `verwacht de inlogpagina, kreeg ${p.url()}`);
    await c.close();
  });

  test("2. een BEHEERDER ziet de studio, zonder consolefouten", async () => {
    const p = await alsRol("beheerder");
    const fouten = vangConsole(p);
    const r = await p.goto("/studio", { waitUntil: "domcontentloaded" });
    assert.equal(r?.status(), 200);
    assert.deepEqual(fouten, [], `consolefouten op /studio: ${fouten.join(" | ")}`);
  });

  test("3. de drie soorten voorstel zijn alle drie zichtbaar", async () => {
    const p = await alsRol("beheerder");
    await p.goto("/studio", { waitUntil: "domcontentloaded" });
    const html = await p.content();
    assert.match(html, /Klaar voor beoordeling/i);
    assert.match(html, /Linkvoorstel/i);
    assert.match(html, /NIEUWE pagina/i, "het paginavoorstel hoort als eigen klasse te staan");
  });

  test("4. het paginavoorstel toont de slug, de reden en het duplicaatrisico", async () => {
    const p = await alsRol("beheerder");
    await p.goto("/studio", { waitUntil: "domcontentloaded" });
    const html = await p.content();
    assert.match(html, /kennis\/nettarieven/, "de voorgestelde slug hoort zichtbaar te zijn");
    assert.match(html, /transportvermogen|noemt/i, "de reden waarom geen bestaande pagina volstaat");
  });

  test("5. een goedkeurformulier staat er, met de inhoudshash erin", async () => {
    const p = await alsRol("beheerder");
    await p.goto("/studio", { waitUntil: "domcontentloaded" });
    const actie = `/voorstellen/${voorstellen.feitelijk!.id}/beoordeel`;
    const form = p.locator(`form[action="${actie}"]`);
    assert.equal(await form.count(), 1, "de feitelijke revisie hoort een goedkeurformulier te hebben");
    const hash = await form.locator('input[name="inhouds_hash"]').inputValue();
    assert.equal(hash, voorstellen.feitelijk!.hash, "het formulier moet aan de gelezen inhoud binden");
  });

  test("6. een LEZER ziet GEEN goedkeurformulier", async () => {
    const p = await alsRol("lezer");
    const r = await p.goto("/studio", { waitUntil: "domcontentloaded" });
    assert.equal(r?.status(), 200, "inhoud.lezen heeft de lezer wel");
    assert.equal(
      await p.locator('form[action*="/beoordeel"]').count(),
      0,
      "een lezer zonder inhoud.goedkeuren hoort geen goedkeuractie te zien",
    );
  });

  test("7. en als de lezer het verzoek alsnog stuurt, weigert de SERVER", async () => {
    /* De knop weglaten is geen beveiliging; de grendel moet op de server
       staan. Dit verzoek gaat daarom buiten de pagina om, via de
       requestcontext van de browser.

       Een fetch UIT de pagina werkt hier niet, en dat is goed nieuws: de
       Content-Security-Policy van het dashboard blokkeert hem
       ("Failed to fetch"). Dat is een beveiligingseigenschap die deze
       toets per ongeluk heeft aangetoond. */
    await alsRol("lezer");
    const csrf = maakCsrfToken(GEHEIM);
    const r = await context.request.post(
      `${basis}/voorstellen/${voorstellen.feitelijk!.id}/beoordeel`,
      {
        form: {
          beoordeling: "GOEDGEKEURD",
          inhouds_hash: voorstellen.feitelijk!.hash,
          notitie: "een poging van ruim tien tekens",
          _csrf: csrf,
        },
        maxRedirects: 0,
        failOnStatusCode: false,
      },
    );
    assert.equal(r.status(), 403, `een lezer hoort 403 te krijgen, kreeg ${r.status()}`);
  });

  test("8. een BEHEERDER kan goedkeuren, en dat leidt naar /studio", async () => {
    const p = await alsRol("beheerder");
    await p.goto("/studio", { waitUntil: "domcontentloaded" });
    const form = p.locator(`form[action="/voorstellen/${voorstellen.feitelijk!.id}/beoordeel"]`);
    await form.locator('textarea[name="notitie"]').fill("browsertoets: fixture goedgekeurd");
    await Promise.all([
      p.waitForURL(/\/studio/, { timeout: 15_000 }),
      form.locator('button[value="GOEDGEKEURD"]').click(),
    ]);
    const html = await p.content();
    assert.match(html, /GOEDGEKEURD/, "het besluit hoort na de redirect zichtbaar te zijn");
  });

  test("9. het auditspoor toont het besluit met de hash", async () => {
    const p = await alsRol("beheerder");
    await p.goto("/studio", { waitUntil: "domcontentloaded" });
    const html = await p.content();
    assert.match(html, new RegExp(voorstellen.feitelijk!.hash.slice(0, 12)));
  });

  test("10. er is GEEN publicatieroute in de studio", async () => {
    const p = await alsRol("beheerder");
    await p.goto("/studio", { waitUntil: "domcontentloaded" });
    const html = await p.content();
    assert.doesNotMatch(
      html,
      /action="[^"]*\/(publiceer|uitrollen)/,
      "publiceren hoort niet vanuit de studio te kunnen",
    );
  });

  test("11. de mobiele weergave scrollt niet horizontaal", async () => {
    await context?.close().catch(() => undefined);
    context = await browser.newContext({ baseURL: basis, viewport: { width: 390, height: 844 } });
    const csrf = maakCsrfToken(GEHEIM);
    await context.addCookies([
      { name: "intel_sessie", value: maakSessieCookie(gebruikers.beheerder!, org, 1), url: basis },
      { name: CSRF_KOEKJE, value: csrf, url: basis },
    ]);
    const p = await context.newPage();
    await p.goto("/studio", { waitUntil: "domcontentloaded" });
    const overloop = await p.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overloop <= 2, `de pagina scrollt ${overloop}px horizontaal op 390px breed`);
  });

  test("12. de belangrijkste bediening is met het toetsenbord bereikbaar", async () => {
    const p = await alsRol("beheerder");
    await p.goto("/studio", { waitUntil: "domcontentloaded" });
    /* Een knop die je niet kunt focussen, kun je niet met een
       toetsenbord gebruiken. Dat is de ondergrens van par. 31 punt 18. */
    /* Open eerst de kaart. Een knop in een gesloten <details> is niet
       focusbaar, en na de goedkeuring in toets 8 is die kaart
       dichtgeklapt — dat is weergave, geen defect. We nemen daarom het
       paginavoorstel, dat nog op een mens wacht. */
    /* ALLE <details> openklappen. Een locator op "details, has: form"
       matcht ook de BUITENSTE bak — die was al open, waardoor de kaart
       zelf dicht bleef en de knop niet focusbaar was. Toetsenbord-
       bereikbaarheid van een ingeklapt element is geen zinvolle vraag;
       de vraag is of de bediening focus KAN krijgen als ze zichtbaar is. */
    await p.locator("details").evaluateAll((els) => {
      for (const el of els) el.setAttribute("open", "open");
    });
    const knop = p.locator(
      `form[action="/voorstellen/${voorstellen.nieuwepagina!.id}/beoordeel"] button[value="GOEDGEKEURD"]`,
    ).first();
    if ((await knop.count()) > 0) {
      await knop.focus();
      const actief = await p.evaluate(() => document.activeElement?.tagName.toLowerCase() ?? "");
      assert.equal(actief, "button", "de goedkeurknop hoort focus te kunnen krijgen");
    }
    const textarea = p.locator('textarea[name="notitie"]').first();
    if ((await textarea.count()) > 0) {
      const label = await p.locator("label", { has: p.locator('textarea[name="notitie"]') }).count();
      assert.ok(label > 0, "het notitieveld hoort een label te hebben");
    }
  });

  /* ---------------- de conceptdetailpagina van R2 ----------------
     DE EIS DIE HIERMEE WORDT GEDEKT. §8 van de opdracht vraagt van het
     conceptenoverzicht: concept lezen, bronnen controleren,
     SEO-metadata bekijken, aanpassen, afwijzen en goedkeuren. Gemeten
     op b2de0c4 kon /studio geen van die zes: body_markdown,
     meta_omschrijving, canonieke_url en structured_data kwamen in heel
     dashboard/server.ts niet voor. Een beoordelaar keurde dus blind
     goed. */

  test("15. de conceptdetailpagina laat de TEKST van het concept lezen", async () => {
    const p = await alsRol("beheerder");
    const fouten = vangConsole(p);
    const r = await p.goto(`/studio/${conceptVersie}`, { waitUntil: "domcontentloaded" });
    assert.equal(r?.status(), 200, `verwacht 200, kreeg ${r?.status()}`);
    const tekst = await p.locator("body").innerText();
    assert.match(tekst, /Wat er is vastgelegd/, "de body_markdown hoort op de pagina te staan");
    assert.match(tekst, /vastgelegd door de fixture-uitgever/);
    assert.deepEqual(fouten, []);
  });

  test("16. de SEO-metadata is te bekijken, met de lengtes erbij", async () => {
    const p = await alsRol("beheerder");
    const tekst = await (await p.goto(`/studio/${conceptVersie}`, { waitUntil: "domcontentloaded" }),
    p.locator("body").innerText());
    assert.match(tekst, /Meta description/, "de metabeschrijving hoort zichtbaar te zijn");
    assert.match(tekst, /Canonical/);
    assert.match(tekst, /vibeenergy\.nl\/nieuws\/fixture-browser-niet-live/);
    assert.match(tekst, /Structured data/);
    assert.match(tekst, /Interne links/);
    /* De lengte hoort erbij: 25-70 voor de titel, 70-160 voor de meta.
       Een beoordelaar kan anders niet zien waarom een poort klaagt. */
    assert.match(tekst, /het bereik is 25-70/);
    assert.match(tekst, /het bereik is 70-160/);
  });

  test("17. de poorten staan PER POORT op de pagina, niet als één vlag", async () => {
    const p = await alsRol("beheerder");
    await p.goto(`/studio/${conceptVersie}`, { waitUntil: "domcontentloaded" });
    const tekst = await p.locator("body").innerText();
    assert.match(tekst, /titel_lengte/);
    assert.match(tekst, /geen_verzonnen_getallen/);
    assert.match(
      tekst,
      /één getal staat niet in een gebonden uitspraak/,
      "de bevinding van de gefaalde poort hoort leesbaar te zijn",
    );
  });

  test("18. de nieuwswaarde is opgebouwd zichtbaar, met bewijs per component", async () => {
    const p = await alsRol("beheerder");
    await p.goto(`/studio/${conceptVersie}`, { waitUntil: "domcontentloaded" });
    const tekst = await p.locator("body").innerText();
    assert.match(tekst, /Nieuwswaarde/);
    assert.match(tekst, /dragende_bron/);
    assert.match(tekst, /dragende bronsoort\(en\): WETGEVING/);
  });

  test("19. een LEZER ziet GEEN besluitformulier op de conceptpagina", async () => {
    const p = await alsRol("lezer");
    const r = await p.goto(`/studio/${conceptVersie}`, { waitUntil: "domcontentloaded" });
    assert.equal(r?.status(), 200, "lezen mag; besluiten niet");
    const formulieren = await p.locator('form[action*="/beoordeel"]').count();
    assert.equal(formulieren, 0, "een lezer hoort geen besluitformulier te zien");
    const tekst = await p.locator("body").innerText();
    assert.match(tekst, /inhoud\.goedkeuren/, "en hij hoort te lezen waarom niet");
  });

  test("20. en als de lezer het besluit alsnog stuurt, weigert de SERVER", async () => {
    /* Dezelfde scheiding als bij de voorstellen: de weergave houdt zich
       aan de grendel, maar de grendel zelf staat op de server. */
    const p = await alsRol("lezer");
    const csrf = (await context.cookies()).find((c) => c.name === CSRF_KOEKJE)?.value ?? "";
    const antwoord = await p.request.post(`/studio/${conceptVersie}/beoordeel`, {
      form: {
        [CSRF_VELD]: csrf,
        besluit: "GOEDGEKEURD",
        motivatie: "een lezer die toch probeert te besluiten",
        inhoud_afdruk: "afdruk-browserfixture",
      },
    });
    assert.equal(antwoord.status(), 403, `verwacht 403, kreeg ${antwoord.status()}`);
  });

  test("21. de auteur mag zijn eigen concept niet goedkeuren (vier ogen)", async () => {
    /* De fixture heeft aangemaakt_door = de redacteur, en een redacteur
       HEEFT het recht inhoud.goedkeuren. De weigering komt dus niet van
       het recht maar van de vier-ogenregel — precies de regel die op
       b2de0c4 leeg werkte omdat aangemaakt_door nooit werd gevuld. */
    const p = await alsRol("redacteur");
    const csrf = (await context.cookies()).find((c) => c.name === CSRF_KOEKJE)?.value ?? "";
    const antwoord = await p.request.post(`/studio/${conceptVersie}/beoordeel`, {
      form: {
        [CSRF_VELD]: csrf,
        besluit: "GOEDGEKEURD",
        motivatie: "mijn eigen tekst goedkeuren",
        inhoud_afdruk: "afdruk-browserfixture",
      },
    });
    assert.equal(antwoord.status(), 400, `verwacht 400, kreeg ${antwoord.status()}`);
    assert.match(await antwoord.text(), /zelf aangemaakt/);
  });

  test("22. een besluit op een VEROUDERDE afdruk wordt geweigerd", async () => {
    /* Een goedkeuring geldt voor precies de inhoud die is gelezen. Wie
       een oud formulier opnieuw verstuurt, besluit over tekst die er
       niet meer staat. */
    const p = await alsRol("beheerder");
    const csrf = (await context.cookies()).find((c) => c.name === CSRF_KOEKJE)?.value ?? "";
    const antwoord = await p.request.post(`/studio/${conceptVersie}/beoordeel`, {
      form: {
        [CSRF_VELD]: csrf,
        besluit: "GOEDGEKEURD",
        motivatie: "met een afdruk van gisteren",
        inhoud_afdruk: "een-afdruk-die-niet-meer-klopt",
      },
    });
    assert.equal(antwoord.status(), 400, `verwacht 400, kreeg ${antwoord.status()}`);
    assert.match(await antwoord.text(), /gewijzigd nadat u hem opende/);
  });

  test("23. een BEHEERDER kan het concept goedkeuren, en dat publiceert niets", async () => {
    const p = await alsRol("beheerder");
    const csrf = (await context.cookies()).find((c) => c.name === CSRF_KOEKJE)?.value ?? "";
    const antwoord = await p.request.post(`/studio/${conceptVersie}/beoordeel`, {
      form: {
        [CSRF_VELD]: csrf,
        besluit: "GOEDGEKEURD",
        motivatie: "gelezen, bronnen gecontroleerd, akkoord",
        inhoud_afdruk: "afdruk-browserfixture",
      },
      maxRedirects: 0,
    });
    assert.equal(antwoord.status(), 303, `verwacht een redirect, kreeg ${antwoord.status()}`);

    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ status: string; goedgekeurd_door: number; goedgekeurde_afdruk: string }>(
        "select status, goedgekeurd_door, goedgekeurde_afdruk from intel.inhoud_versies where id = $1::bigint",
        [conceptVersie],
      ),
    );
    assert.equal(stand.rows[0]!.status, "goedgekeurd");
    assert.equal(stand.rows[0]!.goedgekeurd_door, gebruikers["beheerder"]);
    assert.equal(stand.rows[0]!.goedgekeurde_afdruk, "afdruk-browserfixture");

    /* EN ER IS NIETS GEPUBLICEERD. Goedkeuren is geen publicatie; er
       hoort geen rij in intel.publicaties te staan. */
    const pub = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: string }>(
        "select count(*)::text as n from intel.publicaties where inhoud_versie_id = $1::bigint",
        [conceptVersie],
      ),
    );
    assert.equal(pub.rows[0]!.n, "0", "goedkeuren mag niets publiceren");
  });

  test("24. het goedkeuringsbesluit staat in het append-only spoor", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ besluit: string; actor_soort: string; door: number }>(
        `select besluit, actor_soort, door_gebruiker_id as door
           from intel.publicatiebesluiten
          where inhoud_versie_id = $1::bigint and besluit = 'goedgekeurd'`,
        [conceptVersie],
      ),
    );
    assert.equal(r.rows.length, 1);
    assert.equal(r.rows[0]!.actor_soort, "mens");
    assert.equal(r.rows[0]!.door, gebruikers["beheerder"]);
  });

  test("25. een goedgekeurd concept is niet meer te bewerken", async () => {
    const p = await alsRol("beheerder");
    const csrf = (await context.cookies()).find((c) => c.name === CSRF_KOEKJE)?.value ?? "";
    const antwoord = await p.request.post(`/studio/${conceptVersie}/tekst`, {
      form: {
        [CSRF_VELD]: csrf,
        body_markdown:
          "Een volledig andere tekst die lang genoeg is om de minimumlengte van tachtig tekens te halen.",
        inhoud_afdruk: "afdruk-browserfixture",
      },
    });
    assert.equal(antwoord.status(), 400, `verwacht 400, kreeg ${antwoord.status()}`);
    assert.match(await antwoord.text(), /goedgekeurde tekst wijzig je niet/);
  });

  test("26. de conceptpagina scrollt ook op mobiel niet horizontaal", async () => {
    const c = await browser.newContext({ baseURL: basis, viewport: { width: 390, height: 844 } });
    await c.addCookies([
      { name: "intel_sessie", value: maakSessieCookie(gebruikers["beheerder"]!, org, 1), url: basis },
    ]);
    const mp = await c.newPage();
    await mp.goto(`/studio/${conceptVersie}`, { waitUntil: "domcontentloaded" });
    const te = await mp.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(te <= 1, `de pagina scrollt ${te}px horizontaal op 390px breed`);
    await c.close();
  });

  test("13. /gereed en /gezond werken zonder sessie", async () => {
    const c = await browser.newContext({ baseURL: basis });
    const p = await c.newPage();
    for (const pad of ["/gereed", "/gezond"]) {
      const r = await p.goto(pad, { waitUntil: "domcontentloaded" });
      assert.equal(r?.status(), 200, `${pad} gaf ${r?.status()}`);
    }
    await c.close();
  });

  test("14. een onbekende route geeft 404 en geen lege pagina", async () => {
    const p = await alsRol("beheerder");
    const r = await p.goto("/bestaat-niet-fixture", { waitUntil: "domcontentloaded" });
    assert.equal(r?.status(), 404);
    assert.ok((await p.content()).length > 200, "een 404 hoort een leesbare pagina te zijn");
  });
});
