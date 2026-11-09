/* ============================================================
   BROWSERTOETS — het operationele overzicht van de uitgifte
   ------------------------------------------------------------
   DRAAIEN

     npm run browser
     node --test --import ./test/netwerk-uit.ts "test/browser/uitgifte.browser.test.ts"

   Dit bestand staat MET OPZET buiten de drie globs van `npm test` en
   `npm run poort`, net als studio.browser.test.ts: een browsertoets
   heeft een echte browser nodig, en een poort hoort niet stil te falen
   op een machine zonder browser. Zonder browser meldt deze suite NIET
   GEDRAAID met de installatie-instructie erbij — geen stille PASS.

   WAT HIER WORDT VASTGEZET, EN WAAROM EEN BROWSER DAARVOOR NODIG IS.

   /uitgifte is het scherm dat moet vertellen WAAROM dit platform nu
   niets publiceert. Een HTTP-toets op statuscode 200 bewijst daarvan
   niets: de pagina kan 200 geven met een lege tabel omdat een query
   faalde, omdat een sectie nooit is gerenderd, of omdat de
   stopconditiemeting een fout gooide. Deze suite laadt de pagina in een
   echte browser, kijkt naar de GERENDERDE inhoud, en vangt daarbij
   consolefouten op — een pagina die rendert maar in de console omvalt
   is niet in orde.

   DE FIXTURE SPEELT DE VIER TOESTANDEN NA DIE OP DIT SCHERM UITEENLOPEN:

     versie A  door BELEID goedgekeurd, registerrecord geschreven, en
               blijven staan op fase PR_AANGEMAAKT -> "niet geverifieerd"
     versie B  risico HOOG op ter_review -> vraagt altijd een mens
     versie C  een mislukte uitgifte (fase GEBLOKKEERD, grond uitgifte:*)
     versie D  gepubliceerd EN fase LIVE_GEVERIFIEERD -> publiek

   De fasen worden met de ECHTE schrijfpaden vastgelegd
   (legPublicatiebesluitVast en meldUitgifteFout), niet met losse
   inserts. Een fixture die de grendels van #79 omzeilt, toetst een
   logboek dat in productie niet kan bestaan.

   ER WORDT NIETS GEPUBLICEERD EN NIETS GOEDGEKEURD. Een eigen
   wegwerpdatabase, een eigen app op een efemere poort, synthetische
   fixtures, en /uitgifte is een LEESpagina zonder enig formulier — dat
   is zaak 15.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import { existsSync } from "node:fs";
import type { Server } from "node:http";
import type { Browser, BrowserContext, Page } from "playwright-core";

import {
  alsEigenaar,
  maakDragendeVersie,
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { maakApp } from "../../src/dashboard/server.ts";
import { maakSessieCookie } from "../../src/dashboard/auth.ts";
import { CSRF_KOEKJE, CSRF_VELD, maakCsrfToken } from "../../src/dashboard/bescherming.ts";
import { legPublicatiebesluitVast, systeemActor } from "../../src/inhoud/actor.ts";
import { meldUitgifteFout } from "../../src/uitgifte/opdracht.ts";

/* De callbacks van page.evaluate() draaien IN de browser, dus `document`
   bestaat daar wel en in de Node-typings niet. DOM-typings project-breed
   aanzetten zou servercode browserglobals laten gebruiken; dat is erger
   dan deze lokale declaratie. Zelfde afweging als in
   studio.browser.test.ts. */
declare const document: {
  readonly documentElement: { readonly scrollWidth: number; readonly clientWidth: number };
};

const GEHEIM = "u".repeat(40);

/** De beleidsversie van de fixture; hij hoort letterlijk op het scherm. */
const BELEIDSVERSIE = "uitgifte-browserfixture-v1";

/** De sleutel van de gestoorde bron; hoort letterlijk op het scherm. */
const STORINGSBRON = "acm-besluiten";

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

describe("Uitgifteoverzicht in een echte browser", { skip: keuze === null ? INSTRUCTIE : false }, () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let server: Server;
  let basis = "";
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  const gebruikers: Record<string, number> = {};
  /** De vier versies van de fixture, per rol in het scenario. */
  const versies: Record<"beleid" | "hoog" | "mislukt" | "live", number> = {
    beleid: 0,
    hoog: 0,
    mislukt: 0,
    live: 0,
  };

  before(async () => {
    process.env["INTEL_SESSIE_GEHEIM"] = GEHEIM;
    process.env["INTEL_OMGEVING"] = "test";

    db = await maakWegwerpdatabase("browseruitgifte");
    org = await maakOrganisatie(db, "vibe-energy");
    for (const rol of ["beheerder", "lezer", "redacteur"] as const) {
      gebruikers[rol] = await maakGebruiker(db, org, `${rol}@vibeenergy.nl`, rol);
    }

    /* HET BELEID MET BEIDE SCHAKELAARS UIT.
       Dat is de PRODUCTIESTAND (migratie 0058: beide default false), en
       dus de stand waarin dit scherm het vaakst gelezen wordt. De
       stopconditie `beleid_uit` hoort er dan actief te staan met beide
       schakelaarwaarden erin — zaak 6 rekent daarop. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.publicatiebeleid
           (organisatie_id, versie, auto_publiceren_aan, auto_uitgifte_aan, auto_max_risico,
            auto_toegestane_soorten, auto_min_bronnen, auto_min_bewijskwaliteit, actief)
         values ($1, $2, false, false, 'laag', array['nieuw_artikel'], 1, 3, true)`,
        [org, BELEIDSVERSIE],
      );
    });

    /* VERSIE A — door BELEID goedgekeurd.
       In twee stappen, want anders kan de rij niet bestaan: de
       insertvorm van maakDragendeVersie() zet `goedkeuring_soort` op de
       default 'mens', en de constraint inhoud_versies_goedkeuring_herkomst
       (0052) eist bij status 'goedgekeurd' dan een `goedgekeurd_door`.
       Eén UPDATE die status, soort, beleid en afdruk SAMEN zet is de
       enige stand die de database aanneemt — en precies wat
       autopublicatie.ts in productie schrijft: een goedkeuring zonder
       mens, met het mandaat erbij. */
    const a = await maakDragendeVersie(db, org, {
      slug: "uitgifte-browser-beleid",
      risico: "laag",
      publiceerbaar: true,
      bronSleutel: STORINGSBRON,
    });
    versies.beleid = a.versieId;
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `update intel.inhoud_versies
            set status              = 'goedgekeurd',
                goedkeuring_soort   = 'beleid',
                goedkeurend_beleid  = $2,
                goedgekeurd_door    = null,
                goedgekeurd_op      = now(),
                goedgekeurde_afdruk = inhoud_afdruk
          where id = $1`,
        [a.versieId, BELEIDSVERSIE],
      );
    });

    /* VERSIE B — risico HOOG op ter_review. Deze mag per ontwerp nooit
       automatisch; hij hoort als werk voor een mens op het scherm. */
    const b = await maakDragendeVersie(db, org, {
      slug: "uitgifte-browser-hoogrisico",
      risico: "hoog",
      status: "ter_review",
      publiceerbaar: true,
    });
    versies.hoog = b.versieId;

    /* VERSIE C — een mislukte uitgifte. */
    const c3 = await maakDragendeVersie(db, org, {
      slug: "uitgifte-browser-mislukt",
      risico: "laag",
      publiceerbaar: true,
    });
    versies.mislukt = c3.versieId;

    /* VERSIE D — geschreven EN live geverifieerd. */
    const dv = await maakDragendeVersie(db, org, {
      slug: "uitgifte-browser-live",
      risico: "laag",
      publiceerbaar: true,
    });
    versies.live = dv.versieId;

    /* DE FASEN VIA HET ECHTE SCHRIJFPAD.
       legPublicatiebesluitVast() leidt actor_soort, door_gebruiker_id en
       door_rol AF uit de actor en eist bij een systeemactor in een
       publieksrakende fase een beleidsversie. Een losse insert zou die
       drie grendels overslaan en dus een logboekvorm opleveren die in
       productie niet kan bestaan. */
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      for (const stap of [
        { fase: "GOEDGEKEURD", grond: "autopublicatie:goedkeuring", besluit: "goedgekeurd" },
        { fase: "RECORD_GESCHREVEN", grond: "uitgifte:record", besluit: "gepubliceerd" },
        { fase: "PR_AANGEMAAKT", grond: "uitgifte:pr", besluit: "ingediend" },
      ] as const) {
        await legPublicatiebesluitVast(c, {
          organisatieId: org,
          inhoudVersieId: versies.beleid,
          besluit: stap.besluit,
          fase: stap.fase,
          actor: systeemActor(stap.grond, { beleidVersie: BELEIDSVERSIE }),
          motivatie: `browserfixture: ${stap.fase}`,
          meting: { branch: "nieuws/browserfixture", commit: "abc1234def5678", gemetenDoor: "uitvoerder" },
        });
      }
      for (const stap of [
        { fase: "RECORD_GESCHREVEN", grond: "uitgifte:record", besluit: "gepubliceerd" },
        { fase: "PR_GEMERGED", grond: "uitgifte:merge", besluit: "ingediend" },
        { fase: "LIVE_GEVERIFIEERD", grond: "uitgifte:live", besluit: "gepubliceerd" },
      ] as const) {
        await legPublicatiebesluitVast(c, {
          organisatieId: org,
          inhoudVersieId: versies.live,
          besluit: stap.besluit,
          fase: stap.fase,
          actor: systeemActor(stap.grond, { beleidVersie: BELEIDSVERSIE }),
          motivatie: `browserfixture: ${stap.fase}`,
          meting: { url: "https://www.vibeenergy.nl/nieuws/uitgifte-browser-live", httpStatus: 200 },
        });
      }
    });

    /* DE MISLUKTE UITGIFTE, met de echte functie. Die schrijft de
       GEBLOKKEERD-regel met grond 'uitgifte:stop' in poortresultaten, en
       juist die grond is het filter waarop het scherm een mislukte
       uitgifte onderscheidt van een beleidsblokkade. */
    await meldUitgifteFout(db.pool, org, versies.mislukt, {
      stap: "generator",
      fout: "browserfixture: scripts/seo/bouw.mjs gaf exitcode 1 op poort 11",
      beleidVersie: BELEIDSVERSIE,
    });

    /* TWEE REGISTERRECORDS in intel.publicaties, zodat de kolom
       'Publiek' beide takken toont: versie A is geschreven maar niet
       geverifieerd, versie D staat live. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      for (const [versie, slug] of [
        [versies.beleid, "uitgifte-browser-beleid"],
        [versies.live, "uitgifte-browser-live"],
      ] as const) {
        await c.query(
          `insert into intel.publicaties
             (organisatie_id, inhoud_versie_id, bestandspad, bestand_hash, status)
           values ($1, $2, $3, $4, 'geschreven')`,
          [org, versie, `data/inhoud/nieuws/${slug}.json`, `hash-${slug}`],
        );
      }

      /* EEN BRONSTORING UIT DE TAXONOMIE VAN 0028. 'TOEGANG_BEPERKT' is
         de soort die niet door opnieuw proberen overgaat; daar hoort een
         opschorting bij, en dat is precies het paar dat in src/dashboard
         nog nergens werd gelezen. */
      await c.query(
        `update intel.bronnen
            set storingssoort          = 'TOEGANG_BEPERKT',
                storing_sinds          = now() - interval '2 days',
                storing_detail         = 'browserfixture: HTTP 403 op de feed',
                ophalen_opgeschort_tot = now() + interval '1 day',
                gezondheid             = 'BROKEN'
          where organisatie_id = $1 and sleutel = $2`,
        [org, STORINGSBRON],
      );

      /* BEIDE MELDINGENREGISTERS. intel.meldingen sluit met
         `gesloten_op`, intel.systeem_meldingen met `opgelost_op`; dat
         verschil is gemeten en staat ook op het scherm uitgelegd. */
      await c.query(
        `insert into intel.meldingen
           (organisatie_id, sleutel, groep, niveau, laatste_meting, laatste_advies, keren_gezien)
         values ($1, 'bron:acm-besluiten:403', 'bronnen', 'FOUT',
                 'browserfixture: 3 van 3 pogingen gaven HTTP 403',
                 'vraag de uitgever om toegang; opnieuw proberen helpt hier niet', 3)`,
        [org],
      );
      await c.query(
        `insert into intel.systeem_meldingen
           (organisatie_id, soort, ernst, bericht, dedup_sleutel, aantal)
         values ($1, 'worker_gevallen', 'waarschuwing',
                 'browserfixture: de worker gaf zijn lease terug', 'browserfixture', 2)`,
        [org],
      );

      /* DE PLANNER. Eén geslaagde run en één gefaalde, zodat de pagina
         de laatste GESLAAGDE kan noemen zonder dat de nieuwste rij dat
         is — anders zou "de laatste run" per ongeluk kloppen. */
      await c.query(
        `insert into intel.planner_runs
           (organisatie_id, soort, venster_sleutel, gestart_op, afgerond_op, resultaat,
            taken_aangemaakt)
         values ($1, 'ophalen', 'browserfixture-ok', now() - interval '2 hours',
                 now() - interval '2 hours', 'ok', 7),
                ($1, 'ophalen', 'browserfixture-fout', now() - interval '1 hour',
                 now() - interval '1 hour', 'fout', 0)`,
        [org],
      );

      /* ALLE VIER DE TAAKSTATUSSEN DIE HET OVERZICHT OP / NIET TELT, en
         'wachtend' erbij als controlegroep. */
      await c.query(
        `insert into intel.taken (organisatie_id, soort, status, gereed_op)
         values ($1, 'ophalen',  'gereed',     now() - interval '30 minutes'),
                ($1, 'ontleden', 'mislukt',    null),
                ($1, 'ontleden', 'afgebroken', null),
                ($1, 'ophalen',  'wachtend',   null),
                ($1, 'ontleden', 'dlq',        null)`,
        [org],
      );
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

  /* Elke test kan consolefouten opvangen: een pagina die rendert maar in
     de console omvalt, is niet in orde. */
  function vangConsole(p: Page): string[] {
    const fouten: string[] = [];
    p.on("console", (m) => {
      if (m.type() === "error") fouten.push(m.text());
    });
    p.on("pageerror", (e) => fouten.push(String(e)));
    return fouten;
  }

  /** De gerenderde pagina als tekst, voor beheerder. */
  async function laad(rol: "beheerder" | "lezer" | "redacteur" = "beheerder"): Promise<string> {
    const p = await alsRol(rol);
    await p.goto("/uitgifte", { waitUntil: "domcontentloaded" });
    return p.content();
  }

  /**
   * Eén sectie van de pagina: van zijn <h2> tot de volgende <h2>.
   *
   * WAAROM NIET OP TEKST TUSSEN TWEE LABELS SNIJDEN. Mijn eerste versie
   * sneed met `indexOf("Mislukte uitgiftes")` tot `indexOf("Gepubliceerd")`,
   * en dat ging mis: "Mislukte uitgiftes" staat ook op een TEGEL bovenaan
   * en die komt eerder dan de kop. Het resultaat was een lege string, en
   * een lege string laat `includes()` falen op alles — of erger, bij een
   * omgekeerde orde laat hij een halve pagina door en slaagt een zaak die
   * niets bewijst. De <h2>-grens is de enige snede die niet van de
   * leesorde van losse woorden afhangt.
   */
  function sectieVan(html: string, kopPrefix: string): string {
    const begin = html.indexOf(`<h2>${kopPrefix}`);
    assert.ok(begin >= 0, `er staat geen <h2> die begint met '${kopPrefix}'`);
    const rest = html.slice(begin + 4);
    const eind = rest.indexOf("<h2>");
    return eind < 0 ? rest : rest.slice(0, eind);
  }

  test("1. zonder sessie komt een bezoeker op de inlogpagina", async () => {
    const c = await browser.newContext({ baseURL: basis });
    const p = await c.newPage();
    await p.goto("/uitgifte", { waitUntil: "domcontentloaded" });
    assert.match(p.url(), /\/inloggen/, `verwacht de inlogpagina, kreeg ${p.url()}`);
    await c.close();
  });

  test("2. een BEHEERDER ziet de pagina, zonder consolefouten", async () => {
    const p = await alsRol("beheerder");
    const fouten = vangConsole(p);
    const r = await p.goto("/uitgifte", { waitUntil: "domcontentloaded" });
    assert.equal(r?.status(), 200, `verwacht 200, kreeg ${r?.status()}`);
    assert.deepEqual(fouten, [], `consolefouten op /uitgifte: ${fouten.join(" | ")}`);
  });

  test("3. een REDACTEUR mag hem ook lezen", async () => {
    const p = await alsRol("redacteur");
    const r = await p.goto("/uitgifte", { waitUntil: "domcontentloaded" });
    assert.equal(
      r?.status(),
      200,
      `de rol redacteur draagt inhoud.lezen en hoort 200 te krijgen, kreeg ${r?.status()}`,
    );
  });

  test("4. elke gevraagde sectie staat op de pagina, als eigen kop", async () => {
    const html = await laad();
    /* Twaalf koppen, en elke kop noemt de tabel of de kolom waaruit zijn
       getallen komen. Een sectie die ontbreekt is geen cosmetisch gebrek:
       dan is er een vraag uit par. 7 die het scherm niet beantwoordt.
       Getoetst als <h2> en niet als los woord: "Gepubliceerd" staat ook
       in een tegel, en dan zou een ontbrekende sectie onopgemerkt
       blijven. */
    for (const kop of [
      "Waarom er NU niets gebeurt",
      "Gevonden nieuws",
      "Gegenereerde artikelen",
      "Automatisch goedgekeurd",
      "Geblokkeerd op hoog risico",
      "De vijf fasen",
      "Gepubliceerd",
      "Mislukte uitgiftes",
      "De planner",
      "Taken",
      "Bronstoringen",
      "Operationele waarschuwingen",
    ]) {
      assert.ok(
        html.includes(`<h2>${kop}`),
        `de sectie '${kop}' staat niet als eigen kop op de pagina`,
      );
    }
  });

  test("5. de alinea bovenaan zegt dat een geopende PR geen publicatie is", async () => {
    const html = await laad();
    assert.match(
      html,
      /geopende pull request is[\s\S]{0,40}geen publicatie/i,
      "dezelfde regel die /studio/:id al draagt hoort hier boven de pagina te staan",
    );
    assert.match(html, /LAATSTE fase/i, "alleen de laatste fase zegt of iets publiek staat");
  });

  test("6. de stopcondities staan er, met BEIDE beleidsschakelaars uit", async () => {
    const html = await laad();
    /* Alle VIJF sleutels uit het register van stopcondities: ook de
       niet-actieve, want een lege tabel laat een lezer niet weten of er
       is gemeten. */
    for (const sleutel of [
      "geen_beleid",
      "beleid_uit",
      "dagplafond",
      "stroomonderbreker",
      "artefact_onbruikbaar",
    ]) {
      assert.ok(html.includes(sleutel), `stopconditie '${sleutel}' staat niet op de pagina`);
    }
    assert.ok(
      html.includes("ACTIEF — stopt de uitgifte"),
      "met beide schakelaars uit hoort er minstens één ACTIEVE stopconditie te staan",
    );
    assert.match(
      html,
      /auto_publiceren_aan=false/,
      "de reden van beleid_uit hoort de gemeten schakelaarstand te noemen",
    );
    assert.match(html, /auto_uitgifte_aan=false/);
    assert.ok(
      html.includes(BELEIDSVERSIE),
      "de beleidsversie van de actieve rij hoort bij de stopconditie te staan",
    );
  });

  test("7. elke stopconditie op de pagina is er ook een die wordt GEMETEN", async () => {
    /* WAT HIER WORDT AFGESLOTEN. Dit register stond even met zes
       sleutels, waarvan er één — 'websiteversie_verschoven' — alleen in
       het TYPE bestond: stopredenen() pushte hem nergens. Een
       stopconditie die je toont maar nooit meet, leest als een
       bescherming die er niet is; precies het patroon van het dode
       recht `inhoud.publiceren` dat #79 moest repareren. De sleutel is
       daarom uit het type gehaald in plaats van hier als 'niet gemeten'
       getoond, en de verwante bescherming staat waar hij meetbaar is:
       de UITVOERDER vergelijkt de productie-SHA uit /machine/stand met
       de SHA die hij verwacht.

       Deze zaak houdt dat zo: geen enkele rij in de tabel mag 'NIET
       GEMETEN' zeggen. */
    const html = await laad();
    const stop = sectieVan(html, "Waarom er NU niets gebeurt");
    assert.ok(
      !stop.includes("NIET GEMETEN"),
      "een stopconditie die niet wordt gemeten hoort niet in het register te staan",
    );
    assert.ok(
      !stop.includes("websiteversie_verschoven"),
      "deze sleutel is uit het type gehaald omdat niets hem produceerde",
    );
  });

  test("8. een door BELEID goedgekeurde versie staat in zijn sectie, met de beleidsversie", async () => {
    const html = await laad();
    const sectie = sectieVan(html, "Automatisch goedgekeurd");
    assert.ok(
      sectie.includes("/nieuws/uitgifte-browser-beleid"),
      "de door beleid goedgekeurde versie hoort in deze sectie te staan",
    );
    assert.ok(
      sectie.includes(BELEIDSVERSIE),
      "de beleidsversie is het mandaat en hoort naast de versie te staan",
    );
    assert.ok(
      sectie.includes(`/studio/${versies.beleid}`),
      "de versie hoort door te linken naar zijn conceptdetailpagina",
    );
    /* En hij staat NIET in de hoogrisico-sectie: die twee lijsten mogen
       elkaar niet overlappen. */
    const hoog = sectieVan(html, "Geblokkeerd op hoog risico");
    assert.ok(
      !hoog.includes("/nieuws/uitgifte-browser-beleid"),
      "een laagrisico-artikel hoort niet in de hoogrisicosectie",
    );
  });

  test("9. de hoogrisicoversie staat er, met de uitleg dat hij een mens vraagt", async () => {
    const html = await laad();
    const sectie = sectieVan(html, "Geblokkeerd op hoog risico");
    assert.ok(
      sectie.includes("/nieuws/uitgifte-browser-hoogrisico"),
      "de hoogrisicoversie hoort in deze sectie te staan",
    );
    assert.match(
      sectie,
      /ALTIJD een mens/i,
      "de sectie hoort uit te leggen dat hoog risico altijd een mens vraagt",
    );
    assert.ok(
      sectie.includes("inhoud.hoogrisico.goedkeuren"),
      "het recht dat ervoor nodig is hoort erbij te staan",
    );
  });

  test("10. de fasetabel toont per versie de LAATSTE fase uit het logboek", async () => {
    const html = await laad();
    const sectie = sectieVan(html, "De vijf fasen");
    /* Versie A kreeg GOEDGEKEURD, RECORD_GESCHREVEN en PR_AANGEMAAKT; de
       tabel hoort alleen de laatste te noemen. */
    assert.ok(
      sectie.includes("3 · Pull request aangemaakt"),
      "de laatste fase van versie A hoort 'pull request aangemaakt' te zijn",
    );
    assert.ok(
      sectie.includes("5 · Publieke URL gecontroleerd"),
      "versie D staat op LIVE_GEVERIFIEERD en hoort als fase 5 te staan",
    );
    assert.ok(
      sectie.includes("uitgifte:pr"),
      "de machineleesbare grond uit poortresultaten hoort in de tabel te staan",
    );
  });

  test("11. gepubliceerd scheidt 'record geschreven' van 'LIVE geverifieerd'", async () => {
    const html = await laad();
    const sectie = sectieVan(html, "Gepubliceerd");
    assert.ok(
      sectie.includes("data/inhoud/nieuws/uitgifte-browser-beleid.json"),
      "het geschreven registerrecord hoort met zijn bestandspad te staan",
    );
    assert.ok(
      sectie.includes("LIVE geverifieerd"),
      "versie D hoort als publiek geverifieerd te staan",
    );
    assert.ok(
      sectie.includes("niet geverifieerd"),
      "versie A is wel geschreven maar niet geverifieerd, en dat moet te onderscheiden zijn",
    );
  });

  test("12. de mislukte uitgifte staat er, met stap en reden", async () => {
    const html = await laad();
    const sectie = sectieVan(html, "Mislukte uitgiftes");
    assert.ok(sectie.includes("generator"), "de stap waarop het strandde hoort erbij te staan");
    assert.ok(
      sectie.includes("exitcode 1 op poort 11"),
      "de reden hoort leesbaar op het scherm te staan",
    );
    assert.ok(
      sectie.includes(`/studio/${versies.mislukt}`),
      "de mislukte versie hoort door te linken naar zijn detailpagina",
    );
  });

  test("13. de planner toont de laatste GESLAAGDE run en de gereed-taken per soort", async () => {
    const html = await laad();
    const sectie = sectieVan(html, "De planner");
    assert.match(
      sectie,
      /Laatste GESLAAGDE run/,
      "de laatste geslaagde run hoort apart genoemd te worden",
    );
    assert.match(
      sectie,
      /7\s+taak\/taken aangemaakt/,
      "het aantal aangemaakte taken van die run hoort erbij te staan",
    );
    assert.ok(sectie.includes("ophalen"), "de taaksoort met gereed-taken hoort in de tabel");
  });

  test("14. de taaktabel telt OOK 'mislukt' en 'afgebroken'", async () => {
    const html = await laad();
    const sectie = sectieVan(html, "Taken");
    for (const status of ["wachtend", "bezig", "gereed", "mislukt", "afgebroken", "dlq"]) {
      assert.ok(sectie.includes(status), `taakstatus '${status}' wordt niet geteld`);
    }
    /* De fixture zette één 'mislukt' en één 'afgebroken'. Het overzicht
       op / telt alleen 'wachtend' en 'dlq'; dat gat is precies wat deze
       zaak dichthoudt. */
    const rijen = sectie.split("<tr>").filter((r) => r.includes("mislukt") || r.includes("afgebroken"));
    assert.ok(rijen.length >= 2, "er horen eigen rijen te zijn voor 'mislukt' en 'afgebroken'");
  });

  test("15. de bronstoring staat er met soort, sinds en de opschorting", async () => {
    const html = await laad();
    const sectie = sectieVan(html, "Bronstoringen");
    assert.ok(sectie.includes(STORINGSBRON), "de bronsleutel hoort in de tabel te staan");
    assert.ok(
      sectie.includes("TOEGANG_BEPERKT"),
      "de storingssoort uit de taxonomie van 0028 hoort er te staan",
    );
    assert.ok(
      sectie.includes("HTTP 403 op de feed"),
      "het gemeten detail hoort leesbaar te zijn",
    );
    assert.ok(
      !sectie.includes("niet opgeschort"),
      "deze bron IS opgeschort; de kolom hoort de datum te tonen in plaats van 'niet opgeschort'",
    );
  });

  test("16. beide meldingenregisters staan er, open", async () => {
    const html = await laad();
    const sectie = sectieVan(html, "Operationele waarschuwingen");
    assert.ok(
      sectie.includes("bron:acm-besluiten:403"),
      "de open melding uit intel.meldingen hoort erbij te staan",
    );
    assert.ok(
      sectie.includes("de worker gaf zijn lease terug"),
      "de open melding uit intel.systeem_meldingen hoort erbij te staan",
    );
    assert.ok(
      sectie.includes("niet bezorgd"),
      "een melding die niet bezorgd kon worden is nog steeds een melding",
    );
  });

  test("17. de pagina linkt heen en terug naar de Content Studio", async () => {
    const uitgifte = await laad();
    assert.match(
      uitgifte,
      /href="\/studio"/,
      "/uitgifte hoort een zichtbare weg terug naar /studio te hebben",
    );
    const p = await alsRol("beheerder");
    await p.goto("/studio", { waitUntil: "domcontentloaded" });
    const studio = await p.content();
    assert.match(
      studio,
      /href="\/uitgifte"/,
      "/studio hoort een zichtbare link naar /uitgifte te hebben",
    );
    /* En die link werkt echt, niet alleen als tekst. */
    await Promise.all([
      p.waitForURL(/\/uitgifte$/, { timeout: 15_000 }),
      p.locator('a[href="/uitgifte"]').first().click(),
    ]);
    assert.match(await p.content(), /Uitgifte — de autonome redactie/);
  });

  test("18. /uitgifte is een LEESpagina: geen enkel formulier en geen publicatieactie", async () => {
    const html = await laad();
    assert.doesNotMatch(
      html,
      /<form/i,
      "dit overzicht hoort niets te kunnen veranderen; publiceren gebeurt niet vanuit een scherm",
    );
    assert.doesNotMatch(html, new RegExp(`name="${CSRF_VELD}"`));
  });

  test("19. een LEZER ziet hem ook, en krijgt geen enkele bedieningsactie", async () => {
    const p = await alsRol("lezer");
    const r = await p.goto("/uitgifte", { waitUntil: "domcontentloaded" });
    assert.equal(r?.status(), 200, "de rol lezer draagt inhoud.lezen");
    assert.equal(await p.locator("form").count(), 0);
  });

  test("20. de mobiele weergave scrollt niet horizontaal", async () => {
    await context?.close().catch(() => undefined);
    context = await browser.newContext({ baseURL: basis, viewport: { width: 390, height: 844 } });
    const csrf = maakCsrfToken(GEHEIM);
    await context.addCookies([
      { name: "intel_sessie", value: maakSessieCookie(gebruikers.beheerder!, org, 1), url: basis },
      { name: CSRF_KOEKJE, value: csrf, url: basis },
    ]);
    const p = await context.newPage();
    await p.goto("/uitgifte", { waitUntil: "domcontentloaded" });
    const overloop = await p.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overloop <= 2, `de pagina scrollt ${overloop}px horizontaal op 390px breed`);
  });
});
