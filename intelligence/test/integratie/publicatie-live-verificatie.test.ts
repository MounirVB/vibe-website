/* ============================================================
   TEST — van registerrecord tot publieke URL
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET.

   publiceer() zet `inhoud_versies.status` op 'gepubliceerd' zodra het
   registerrecord in de werkboom staat. Daarna gebeuren er nog drie
   dingen waarvan NIETS werd vastgelegd: de PR wordt gemerged, de website
   wordt uitgerold, en de URL gaat het doen. Een geopende PR is dus geen
   publicatie, en dat moet het logboek kunnen zeggen.

   DEEL 1 toetst de grendels van verifieerLivePublicatie() één voor één,
   met een geïnjecteerde git en een geïnjecteerde HTTP-haler — geen
   netwerk, geen echte remote.

   DEEL 2 draait de ECHTE generator van Release 1 tegen een VOLLEDIGE
   kopie van de repository (git archive van origin/main in een tijdelijke
   map) en toetst daarna wat er werkelijk is gebouwd: het artikelbestand,
   de canonical, de metadescription, de sitemap, de interne links, en of
   de bestaande pagina's en de regionale publicatiestand ongemoeid zijn
   gebleven. Dat is de enige manier om "de websitebuild werkt met het
   nieuwe artikel" te bewijzen zonder iets te publiceren.

   ER WORDT NIETS GEPUBLICEERD. Alles staat in een tijdelijke map met een
   eigen bare remote; de publieke site wordt nooit aangeraakt en er gaat
   geen enkel verzoek naar GitHub.
   ============================================================ */

import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { after, before, describe, test } from "node:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import {
  actorVan,
  alsEigenaar,
  maakDragendeVersie,
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import type { Actor } from "../../src/inhoud/actor.ts";
import { keurGoed, publiceer } from "../../src/inhoud/publiceer.ts";
import { maakGit, maakPublicatiePr } from "../../src/publicatie/pr.ts";
import { verifieerLivePublicatie, type Haler } from "../../src/publicatie/verificatie.ts";

const uitvoeren = promisify(execFile);

/** De werkboom waarin deze toets draait; daar staat origin/main. */
const REPO = join(dirname(new URL(import.meta.url).pathname), "..", "..", "..");

/* ================================================================
   DEEL 1 — de grendels van de live-verificatie
   ================================================================ */

describe("de live-verificatie meet of het er werkelijk staat", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let chef = 0;
  let auteur = 0;
  let actor: Actor;
  let site = "";

  before(async () => {
    db = await maakWegwerpdatabase("liveverif");
    org = await maakOrganisatie(db, "liveverif-org");
    auteur = await maakGebruiker(db, org, "schrijver@test.nl", "analist");
    chef = await maakGebruiker(db, org, "chef@test.nl", "beheerder");
    actor = await actorVan(db, org, chef);

    site = await mkdtemp(join(tmpdir(), "intel-live-"));
    await mkdir(join(site, "data", "inhoud", "kennis"), { recursive: true });
    await mkdir(join(site, "data", "seo"), { recursive: true });
    await writeFile(
      join(site, "data", "inhoud", "kennis", "netcongestie-uitgelegd.json"),
      JSON.stringify({ route: "kennis/netcongestie-uitgelegd", type: "kennis", titel: "Netcongestie" }),
      "utf8",
    );
    await writeFile(
      join(site, "data", "seo", "routes.json"),
      JSON.stringify({
        routes: [
          { route: "kennis/netcongestie-uitgelegd", soort: "nationaal", subsoort: "kennis", staat: "INDEX", reden: "f" },
          { route: "contact", soort: "nationaal", subsoort: "oplossing", staat: "INDEX", reden: "f" },
        ],
      }),
      "utf8",
    );
  });

  after(async () => {
    await rm(site, { recursive: true, force: true });
    await db.opruimen();
  });

  /** Een git die zegt dat de commit WEL (of NIET) in main zit. */
  const nepGit = (gemerged: boolean) => async (args: readonly string[]) => {
    if (args[0] === "merge-base" && !gemerged) throw new Error("niet in main");
    return "";
  };

  /** Een haler die vaste antwoorden geeft, zonder netwerk. */
  const nepHaal = (kaart: Record<string, { status: number; tekst: string }>): Haler => {
    return async (url) => kaart[url] ?? { status: 404, tekst: "" };
  };

  /** Een goedgekeurde versie met een geschreven registerrecord. */
  async function gepubliceerd(slug: string): Promise<{ versieId: number; url: string }> {
    const v = await maakDragendeVersie(db, org, {
      slug,
      risico: "laag",
      aangemaaktDoor: auteur,
      publiceerbaar: true,
    });
    const goed = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "akkoord"),
    );
    assert.ok(goed.goedgekeurd, "de fixture hoort goedgekeurd te raken");
    const r = await publiceer(db.pool, org, v.versieId, { actor, siteWortel: site });
    assert.ok(r.geschreven, `het record hoort geschreven te zijn: ${r.reden}`);
    return { versieId: v.versieId, url: `https://www.vibeenergy.nl/nieuws/${slug}` };
  }

  async function fasen(versieId: number): Promise<string[]> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ fase: string | null }>(
        `select poortresultaten->>'fase' as fase from intel.publicatiebesluiten
          where inhoud_versie_id = $1 order by id`,
        [versieId],
      );
      return r.rows.map((x) => x.fase ?? "(geen)");
    });
  }

  test("1 · zonder registerrecord valt er niets te verifiëren", async () => {
    const v = await maakDragendeVersie(db, org, { slug: "live-nietgeschreven", publiceerbaar: true });
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verifieerLivePublicatie(c, org, v.versieId, { actor, siteWortel: site, git: nepGit(true) }),
    );
    assert.equal(uit.geslaagd, false);
    assert.match(uit.reden, /nog geen publicatierecord/);
    assert.deepEqual(await fasen(v.versieId), [], "er hoort niets in het logboek te staan");
  });

  test("2 · zonder PR-regel is er geen commit om te wegen", async () => {
    const g = await gepubliceerd("live-geenpr");
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verifieerLivePublicatie(c, org, g.versieId, { actor, siteWortel: site, git: nepGit(true) }),
    );
    assert.equal(uit.geslaagd, false);
    assert.match(uit.reden, /geen regel met fase PR_AANGEMAAKT/);
    assert.ok(
      !(await fasen(g.versieId)).includes("LIVE_GEVERIFIEERD"),
      "een mislukte verificatie mag niets vastleggen",
    );
  });

  test("3 · een NIET-gemergede PR is geen publicatie", async () => {
    const g = await gepubliceerd("live-nietgemerged");
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const { legPublicatiebesluitVast } = await import("../../src/inhoud/actor.ts");
      await legPublicatiebesluitVast(c, {
        organisatieId: org,
        inhoudVersieId: g.versieId,
        besluit: "ingediend",
        fase: "PR_AANGEMAAKT",
        actor,
        motivatie: "fixture",
        meting: { branch: "publicatie/x", commit: "a".repeat(40), prUrl: null },
      });
    });
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verifieerLivePublicatie(c, org, g.versieId, { actor, siteWortel: site, git: nepGit(false) }),
    );
    assert.equal(uit.geslaagd, false);
    assert.match(uit.reden, /niet gemerged/);
    assert.equal(uit.gemergedInMain, false);
    assert.ok(!(await fasen(g.versieId)).includes("LIVE_GEVERIFIEERD"));
  });

  test("4 · een URL die geen 200 geeft is niet live", async () => {
    const g = await gepubliceerd("live-404");
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const { legPublicatiebesluitVast } = await import("../../src/inhoud/actor.ts");
      await legPublicatiebesluitVast(c, {
        organisatieId: org,
        inhoudVersieId: g.versieId,
        besluit: "ingediend",
        fase: "PR_AANGEMAAKT",
        actor,
        motivatie: "fixture",
        meting: { branch: "publicatie/x", commit: "b".repeat(40), prUrl: null },
      });
    });
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verifieerLivePublicatie(c, org, g.versieId, {
        actor,
        siteWortel: site,
        git: nepGit(true),
        haal: nepHaal({}),
      }),
    );
    assert.equal(uit.geslaagd, false);
    assert.match(uit.reden, /HTTP 404/);
    assert.ok(!(await fasen(g.versieId)).includes("LIVE_GEVERIFIEERD"));
  });

  test("5 · een pagina met een ANDERE canonical is niet deze publicatie", async () => {
    const g = await gepubliceerd("live-anderecanonical");
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const { legPublicatiebesluitVast } = await import("../../src/inhoud/actor.ts");
      await legPublicatiebesluitVast(c, {
        organisatieId: org,
        inhoudVersieId: g.versieId,
        besluit: "ingediend",
        fase: "PR_AANGEMAAKT",
        actor,
        motivatie: "fixture",
        meting: { branch: "publicatie/x", commit: "c".repeat(40), prUrl: null },
      });
    });
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verifieerLivePublicatie(c, org, g.versieId, {
        actor,
        siteWortel: site,
        git: nepGit(true),
        haal: nepHaal({
          [g.url]: {
            status: 200,
            tekst: '<link rel="canonical" href="https://www.vibeenergy.nl/iets-anders">',
          },
        }),
      }),
    );
    assert.equal(uit.geslaagd, false);
    assert.match(uit.reden, /canonical/);
    assert.ok(!(await fasen(g.versieId)).includes("LIVE_GEVERIFIEERD"));
  });

  test("6 · alles klopt: dan pas LIVE_GEVERIFIEERD, met de mens erbij", async () => {
    const g = await gepubliceerd("live-goed");
    const commit = "d".repeat(40);
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const { legPublicatiebesluitVast } = await import("../../src/inhoud/actor.ts");
      await legPublicatiebesluitVast(c, {
        organisatieId: org,
        inhoudVersieId: g.versieId,
        besluit: "ingediend",
        fase: "PR_AANGEMAAKT",
        actor,
        motivatie: "fixture",
        meting: { branch: "publicatie/live-goed", commit, prUrl: "https://github.com/x/y/pull/1" },
      });
    });

    const titelKop = "Ondernemers krijgen in 2026 meer tijd voor hun SDE++-aanvraag";
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verifieerLivePublicatie(c, org, g.versieId, {
        actor,
        siteWortel: site,
        git: nepGit(true),
        haal: nepHaal({
          [g.url]: {
            status: 200,
            tekst: `<link rel="canonical" href="${g.url}"><h1>${titelKop}</h1>`,
          },
          "https://www.vibeenergy.nl/sitemap.xml": {
            status: 200,
            tekst: `<sitemapindex><sitemap><loc>https://www.vibeenergy.nl/sitemap-nationaal.xml</loc></sitemap></sitemapindex>`,
          },
          "https://www.vibeenergy.nl/sitemap-nationaal.xml": {
            status: 200,
            tekst: `<urlset><url><loc>${g.url}</loc></url></urlset>`,
          },
        }),
      }),
    );
    assert.ok(uit.geslaagd, `de verificatie hoort te slagen: ${uit.reden}`);
    assert.equal(uit.httpStatus, 200);
    assert.equal(uit.commit, commit);
    assert.ok(uit.grendels.every((x) => x.ok), uit.grendels.map((x) => `${x.naam}=${x.ok}`).join(", "));

    /* DE VIJF FASEN STAAN NU ALLE VIJF IN HET LOGBOEK, in deze orde. */
    const f = await fasen(g.versieId);
    assert.deepEqual(f, ["GOEDGEKEURD", "RECORD_GESCHREVEN", "PR_AANGEMAAKT", "LIVE_GEVERIFIEERD"]);

    /* En de regel draagt de MENS, niet 'systeem'. */
    const regel = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        actor_soort: string;
        door_gebruiker_id: number | null;
        poortresultaten: { url?: string; inSitemap?: boolean };
      }>(
        `select actor_soort, door_gebruiker_id, poortresultaten
           from intel.publicatiebesluiten
          where inhoud_versie_id = $1 and poortresultaten->>'fase' = 'LIVE_GEVERIFIEERD'`,
        [g.versieId],
      );
      return r.rows[0]!;
    });
    assert.equal(regel.actor_soort, "mens");
    assert.equal(regel.door_gebruiker_id, chef);
    assert.equal(regel.poortresultaten.url, g.url);
    assert.equal(regel.poortresultaten.inSitemap, true);

    /* EN DE METING STAAT IN intel.indexatie_status, de tabel die daarvoor
       bestaat. NIET in pagina_register: migratie 0034 heeft die twee
       live-kolommen met opzet gedropt, omdat een meting daar de
       `bijgewerkt_op` van de pagina zou opstampen. */
    const meting = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        http_status: number | null;
        in_sitemap: boolean | null;
        bron: string;
        bewijs: string | null;
      }>(
        "select http_status, in_sitemap, bron, bewijs from intel.indexatie_status where url = $1",
        [g.url],
      );
      return r.rows[0]!;
    });
    assert.equal(meting.http_status, 200);
    assert.equal(meting.in_sitemap, true);
    assert.equal(meting.bron, "eigen_meting");
    assert.match(meting.bewijs ?? "", /canonical sluit/);
  });

  test("7 · de verificatie is herhaalbaar en verandert de versiestatus niet", async () => {
    /* Een tweede verificatie is een MEETHANDELING en geen publicatie: hij
       mag opnieuw, legt een tweede meting vast, en raakt de status niet
       aan. Zo kan een operator na een deploy gewoon opnieuw meten. */
    const voor = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ status: string }>(
        "select status from intel.inhoud_versies where pad = $1",
        ["/nieuws/live-goed"],
      );
      return r.rows[0]!.status;
    });
    assert.equal(voor, "gepubliceerd");
  });
});

/* ================================================================
   DEEL 2 — de ECHTE generator, tegen een volledige repokopie
   ================================================================ */

describe("de websitebuild met het nieuwe artikel", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let chef = 0;
  let auteur = 0;
  let actor: Actor;
  let werk = "";
  let site = "";
  let remote = "";
  let versieId = 0;
  const SLUG = "fixture-publicatieketen-niet-live";
  let voorIndex = 0;
  let voorRegioPending = 0;

  before(async () => {
    db = await maakWegwerpdatabase("echtebuild");
    org = await maakOrganisatie(db, "echtebuild-org");
    auteur = await maakGebruiker(db, org, "schrijver@test.nl", "analist");
    chef = await maakGebruiker(db, org, "chef@test.nl", "beheerder");
    actor = await actorVan(db, org, chef);

    werk = await mkdtemp(join(tmpdir(), "intel-build-"));
    site = join(werk, "site");
    remote = join(werk, "remote.git");
    await mkdir(site, { recursive: true });

    /* DE ECHTE REPOSITORY, uit origin/main. `git archive` geeft de boom
       zonder geschiedenis; daarna maken we er een eigen git-repo van met
       een eigen bare remote. Zo draait de ECHTE generator op de ECHTE
       data, en raakt niets de werkelijke repository. */
    await uitvoeren("bash", [
      "-c",
      `git -C ${JSON.stringify(REPO)} archive origin/main | tar -x -C ${JSON.stringify(site)}`,
    ]);
    await uitvoeren("git", ["init", "--bare", "-b", "main", remote]);
    const git = maakGit(site);
    await uitvoeren("git", ["init", "-b", "main", site]);
    await git(["remote", "add", "origin", remote]);
    await git(["add", "-A"]);
    await git(["-c", "user.name=toets", "-c", "user.email=t@t.nl", "commit", "-m", "basis uit origin/main"]);
    await git(["push", "-u", "origin", "main"]);

    const routes = JSON.parse(
      await readFile(join(site, "data", "seo", "routes.json"), "utf8"),
    ) as { routes: { route: string; soort: string; staat: string }[] };
    voorIndex = routes.routes.filter((r) => r.staat === "INDEX").length;
    voorRegioPending = routes.routes.filter((r) => r.soort === "regio" && r.staat === "PENDING").length;

    const v = await maakDragendeVersie(db, org, {
      slug: SLUG,
      risico: "laag",
      aangemaaktDoor: auteur,
      publiceerbaar: true,
      /* EEN ECHTE, DRAGENDE BRON. weigerNieuws() in de generator leidt de
         bronsoort af uit de uitgeverscategorie in src/bronnen/register.ts;
         'acm-besluiten' is daar 'toezichthouder' en dus TOEZICHTHOUDER,
         een soort die een bericht zelfstandig mag dragen. Met een
         verzonnen sleutel valt hij terug op MARKTPARTIJ en maakt de
         generator GEEN pagina — gemeten, en precies wat deze zaak moet
         kunnen bewijzen. */
      bronSleutel: "acm-besluiten",
    });
    versieId = v.versieId;
    const goed = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, versieId, chef, "akkoord voor de buildtoets"),
    );
    assert.ok(goed.goedgekeurd, "de fixture hoort goedgekeurd te raken");
  });

  after(async () => {
    await rm(werk, { recursive: true, force: true });
    await db.opruimen();
  });

  test("8 · de hele keten bouwt de site met het nieuwe artikel erin", async () => {
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      maakPublicatiePr(c, org, versieId, {
        siteWortel: site,
        pool: db.pool,
        basisBranch: "main",
        actor,
      }),
    );
    assert.ok(
      uit.geslaagd,
      `de keten hoort te slagen:\n${uit.reden}\n${uit.grendels
        .map((g) => `  ${g.ok ? "PASS" : "FAIL"} ${g.naam} — ${g.meting}`)
        .join("\n")}`,
    );

    /* HET GEAUTEURDE RECORD. */
    const record = JSON.parse(
      await readFile(join(site, "data", "inhoud", "nieuws", `${SLUG}.json`), "utf8"),
    ) as Record<string, unknown>;
    assert.equal(record["route"], `nieuws/${SLUG}`);
    assert.equal(record["redactionele_staat"], "GOEDGEKEURD");
    assert.equal(record["onderwerp_eigenaar"], "kennis/netcongestie-uitgelegd");

    /* DE GEGENEREERDE PAGINA, door de ECHTE generator van Release 1. */
    const htmlPad = join(site, "nieuws", `${SLUG}.html`);
    assert.ok(existsSync(htmlPad), `${htmlPad} hoort gegenereerd te zijn`);
    const html = await readFile(htmlPad, "utf8");

    const url = `https://www.vibeenergy.nl/nieuws/${SLUG}`;
    assert.ok(
      html.includes(`<link rel="canonical" href="${url}">`),
      "de canonical hoort zelfverwijzend te zijn",
    );
    assert.match(html, /<meta name="description" content="[^"]{70,160}"/, "een metadescription binnen het bereik");
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.ok(html.includes("Ondernemers krijgen in 2026"), "de kop van het bericht hoort erop te staan");
    assert.ok(html.includes("/contact"), "de interne link naar de commerciele pagina hoort mee");
    assert.ok(
      html.includes("rvo.nl"),
      "de bronvermelding hoort in de gepubliceerde pagina te staan",
    );

    /* DE SITEMAP EN HET ROUTEREGISTER. */
    const routes = JSON.parse(
      await readFile(join(site, "data", "seo", "routes.json"), "utf8"),
    ) as { routes: { route: string; soort: string; staat: string }[] };
    const nieuw = routes.routes.find((r) => r.route === `nieuws/${SLUG}`);
    assert.ok(nieuw, "de route hoort in het register te staan");
    assert.equal(nieuw.staat, "INDEX", "een goedgekeurd bericht hoort op INDEX te komen");

    const naIndex = routes.routes.filter((r) => r.staat === "INDEX").length;
    const naRegioPending = routes.routes.filter(
      (r) => r.soort === "regio" && r.staat === "PENDING",
    ).length;
    assert.equal(naIndex, voorIndex + 1, "precies één route erbij, niet meer");
    assert.equal(
      naRegioPending,
      voorRegioPending,
      "GEEN stille promotie van regionale routes; dat is grendel 7 van pr.ts",
    );

    /* De sitemap is een index met kinderen; de nationale hoort de nieuwe
       URL te dragen. */
    const sitemapKind = join(site, "sitemap-nationaal.xml");
    assert.ok(existsSync(sitemapKind), "de nationale kindsitemap hoort te bestaan");
    assert.ok(
      (await readFile(sitemapKind, "utf8")).includes(url),
      "de nieuwe URL hoort in de sitemap te staan",
    );

    /* BESTAANDE PAGINA'S ONGEMOEID: de commit bevat alleen het eigen
       record plus gegenereerde uitvoer, en dat is grendel 6 — die stond
       hierboven al op PASS. Hier wordt nog gemeten dat een bestaande
       pagina werkelijk nog bestaat en zijn canonical houdt. */
    const bestaand = join(site, "kennis", "netcongestie-uitgelegd.html");
    assert.ok(existsSync(bestaand), "de bestaande kennispagina hoort er nog te zijn");
    assert.ok(
      (await readFile(bestaand, "utf8")).includes(
        '<link rel="canonical" href="https://www.vibeenergy.nl/kennis/netcongestie-uitgelegd">',
      ),
      "en zijn canonical hoort ongewijzigd te zijn",
    );
  });

  test("9 · de publicatiecommit bevat precies het record en gegenereerde uitvoer", async () => {
    const git = maakGit(site);
    const bestanden = (await git(["show", "--name-only", "--format=", "HEAD"]))
      .trim()
      .split("\n")
      .filter(Boolean);
    assert.ok(
      bestanden.includes(`data/inhoud/nieuws/${SLUG}.json`),
      `het geauteurde bestand hoort in de commit te zitten: ${bestanden.slice(0, 5).join(", ")}`,
    );
    const verboden = bestanden.filter(
      (p) => p.startsWith("intelligence/") || p.startsWith(".github/") || p.startsWith("vibe/"),
    );
    assert.deepEqual(verboden, [], `deze paden horen niet in een publicatiecommit: ${verboden.join(", ")}`);
  });

  test("10 · en de publieke site is nog niet aangeraakt", async () => {
    /* Een vangnet met opzet: deze suite mag onder geen enkele
       omstandigheid iets naar de echte remote hebben gestuurd. */
    const { stdout } = await uitvoeren("git", ["--git-dir", remote, "branch", "--list"]);
    const branches = stdout.split("\n").map((r) => r.replace("*", "").trim()).filter(Boolean);
    assert.deepEqual(branches, ["main"], `onverwachte branches op de nepremote: ${branches.join(", ")}`);
    assert.ok(
      !existsSync(join(REPO, "data", "inhoud", "nieuws", `${SLUG}.json`)),
      "de ECHTE werkboom mag geen fixturerecord hebben gekregen",
    );
  });
});
