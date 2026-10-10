/* ============================================================
   TEST — de gecontroleerde publicatie-PR
   ------------------------------------------------------------
   Tegen een ECHTE git-repository, met een ECHTE bare remote, en een
   echte database. Geen mocks voor git.

   WAAROM EEN EIGEN SITEWORTEL EN NIET DE ECHTE
   De echte worktree is de repository die vibeenergy.nl publiceert.
   Een toets die daar branches aanmaakt en commits doet, rommelt in de
   productierepository. Deze suite bouwt daarom een minimale eigen
   sitewortel met een eigen bare remote: dezelfde git-mechanica,
   nul risico.

   WAT ER BEWEZEN WORDT
     · zonder goedkeuring komt er geen branch
     · een na de goedkeuring gewijzigde tekst wordt geweigerd
     · de branchnaam is deterministisch (dus idempotent)
     · een bestand buiten data/inhoud/nieuws/ laat de PR afbreken
     · main wordt nooit het doel
   ============================================================ */

import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { after, before, describe, test } from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { alsEigenaar, maakGebruiker, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import {
  branchVoor,
  maakGit,
  maakPublicatiePr,
  TOEGESTAAN_AUTEURSPAD,
} from "../../src/publicatie/pr.ts";
import { inhoudAfdruk } from "../../src/inhoud/concept.ts";

const uitvoeren = promisify(execFile);

/* ================= de padgrendel, puur ================= */

describe("de padgrendel laat alleen het eigen record door", () => {
  test("het eigen record mag", () => {
    assert.ok(TOEGESTAAN_AUTEURSPAD.test("data/inhoud/nieuws/acm-tarieven.json"));
  });

  test("alles buiten data/inhoud/nieuws/ wordt geweigerd", () => {
    for (const p of [
      "data/inhoud/kennis/netcongestie-uitgelegd.json",
      "data/seo/routes.json",
      "sitemap.xml",
      "nieuws/acm.html",
      "vibe/chrome.js",
      "data/inhoud/nieuws/../kennis/x.json",
      "data/inhoud/nieuws/Hoofdletter.json",
      "data/inhoud/nieuws/x.html",
      "data/inhoud/nieuws/genest/x.json",
      ".github/workflows/poort.yml",
    ]) {
      assert.equal(TOEGESTAAN_AUTEURSPAD.test(p), false, `'${p}' had geweigerd moeten worden`);
    }
  });

  test("de branchnaam is deterministisch en nooit main", () => {
    assert.equal(branchVoor("acm-tarieven", 42), "publicatie/acm-tarieven-v42");
    assert.equal(branchVoor("acm-tarieven", 42), branchVoor("acm-tarieven", 42));
    assert.notEqual(branchVoor("x", 1), "main");
    assert.ok(branchVoor("x", 1).startsWith("publicatie/"));
  });
});

/* ================= de hele keten ================= */

describe("de publicatie-PR tegen een echte git-repository", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let auteur = 0;
  let chef = 0;
  let werk = "";
  let site = "";
  let remote = "";
  let versieId = 0;
  const SLUG = "acm-nettarieven-2027";
  const EIGENAAR_ROUTE = "kennis/netcongestie-uitgelegd";

  before(async () => {
    db = await maakWegwerpdatabase("prtest");
    org = await maakOrganisatie(db, "pr-org");
    auteur = await maakGebruiker(db, org, "schrijver@test.nl", "redacteur");
    chef = await maakGebruiker(db, org, "chef@test.nl", "beheerder");

    werk = await mkdtemp(join(tmpdir(), "intel-pr-"));
    site = join(werk, "site");
    remote = join(werk, "remote.git");

    /* Een bare remote, zodat push en branch echt werken. */
    await uitvoeren("git", ["init", "--bare", "-b", "main", remote]);

    /* Een minimale sitewortel met precies wat de PR-keten leest. */
    await mkdir(join(site, "data", "inhoud", "kennis"), { recursive: true });
    await mkdir(join(site, "data", "seo"), { recursive: true });
    await mkdir(join(site, "scripts", "seo"), { recursive: true });

    await writeFile(
      join(site, "data", "inhoud", "kennis", "netcongestie-uitgelegd.json"),
      JSON.stringify({ route: EIGENAAR_ROUTE, type: "kennis", titel: "Netcongestie uitgelegd" }),
      "utf8",
    );
    await writeFile(
      join(site, "data", "seo", "routes.json"),
      JSON.stringify({
        routes: [
          { route: EIGENAAR_ROUTE, soort: "nationaal", subsoort: "kennis", staat: "INDEX", reden: "f" },
          { route: "regios/gelderland/arnhem", soort: "regio", subsoort: "gemeente", staat: "PENDING", reden: "f" },
        ],
      }),
      "utf8",
    );
    /* Een nepgenerator: hij raakt alleen gegenereerde paden aan, zodat
       de grendel op "wie heeft wat geauteurd" echt getoetst wordt. */
    await writeFile(
      join(site, "scripts", "seo", "bouw.mjs"),
      [
        "import { writeFileSync } from 'node:fs';",
        "import { dirname, resolve } from 'node:path';",
        "import { fileURLToPath } from 'node:url';",
        "const wortel = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');",
        "writeFileSync(resolve(wortel, 'sitemap.xml'), '<urlset><loc>x</loc></urlset>\\n');",
        "writeFileSync(resolve(wortel, 'nieuws.html'), '<html>hub</html>\\n');",
        "console.log('nepgenerator gedraaid');",
      ].join("\n"),
      "utf8",
    );

    const git = maakGit(site);
    await uitvoeren("git", ["init", "-b", "main", site]);
    await git(["remote", "add", "origin", remote]);
    await git(["add", "-A"]);
    await git([
      "-c", "user.name=toets", "-c", "user.email=t@t.nl",
      "commit", "-m", "basis",
    ]);
    await git(["push", "-u", "origin", "main"]);

    /* De inhoudsversie, nog NIET goedgekeurd. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const body = "Dit is de lead.\n\n## Wat er is besloten\n\nDe tarieven zijn vastgesteld.\n";
      const direct = "De ACM heeft de nettarieven voor 2027 vastgesteld.";
      const titel = "ACM stelt de nettarieven voor 2027 vast | Vibe Energy";
      const sd = { "@type": "NewsArticle" };
      const afdruk = inhoudAfdruk({
        titel,
        directAntwoord: direct,
        bodyMarkdown: body,
        structuredData: sd,
      });
      const r = await c.query<{ id: number }>(
        `insert into intel.inhoud_versies
           (organisatie_id, pad, versie, soort, titel, meta_omschrijving, canonieke_url,
            direct_antwoord, body_markdown, structured_data, status, risico_klasse,
            auteur_soort, poorten_geslaagd, inhoud_afdruk, aangemaakt_door)
         values ($1,$2,1,'nieuw_artikel',$3,
                 'De ACM heeft de nettarieven voor 2027 vastgesteld; wat dat betekent.',
                 $4,$5,$6,$7,'ter_review','laag','ai',true,$8,$9)
         returning id`,
        [
          org,
          `/nieuws/${SLUG}`,
          titel,
          `https://www.vibeenergy.nl/nieuws/${SLUG}`,
          direct,
          body,
          JSON.stringify(sd),
          afdruk,
          auteur,
        ],
      );
      versieId = r.rows[0]!.id;
    });
  });

  after(async () => {
    await rm(werk, { recursive: true, force: true });
    await db.opruimen();
  });

  test("zonder goedkeuring komt er geen branch en geen commit", async () => {
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      maakPublicatiePr(c, org, versieId, { siteWortel: site, pool: db.pool, basisBranch: "main" }),
    );
    assert.equal(uit.geslaagd, false);
    assert.equal(uit.branch, null);
    assert.equal(uit.commit, null);
    assert.match(uit.reden, /menselijke goedkeuring/);

    const branches = await maakGit(site)(["branch", "--list"]);
    assert.ok(!branches.includes("publicatie/"), `er is toch een branch gemaakt: ${branches}`);
  });

  test("een na de goedkeuring gewijzigde tekst wordt geweigerd", async () => {
    /* Goedkeuren op de HUIDIGE afdruk, daarna de tekst wijzigen. Dat is
       precies het scenario waarvoor de afdrukbinding bestaat. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `update intel.inhoud_versies
            set status='goedgekeurd', goedgekeurd_door=$2, goedgekeurd_op=now(),
                goedgekeurde_afdruk=inhoud_afdruk
          where id=$1`,
        [versieId, chef],
      );
      // En nu de tekst stilletjes aanpassen.
      await c.query(
        "update intel.inhoud_versies set body_markdown = body_markdown || '\\n\\nEen stille toevoeging.\\n' where id = $1",
        [versieId],
      );
    });

    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      maakPublicatiePr(c, org, versieId, { siteWortel: site, pool: db.pool, basisBranch: "main" }),
    );
    assert.equal(uit.geslaagd, false);
    assert.match(uit.reden, /na de goedkeuring gewijzigd/);
    const grendel = uit.grendels.find((g) => g.naam.includes("afdruk"));
    assert.equal(grendel?.ok, false);
  });

  test("droog draaien toetst de grendels en schrijft niets", async () => {
    /* De afdruk weer op de werkelijkheid zetten: opnieuw goedkeuren. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const r = await c.query<{ titel: string; direct_antwoord: string; body_markdown: string; structured_data: unknown }>(
        "select titel, direct_antwoord, body_markdown, structured_data from intel.inhoud_versies where id = $1",
        [versieId],
      );
      const rij = r.rows[0]!;
      const afdruk = inhoudAfdruk({
        titel: rij.titel,
        directAntwoord: rij.direct_antwoord,
        bodyMarkdown: rij.body_markdown,
        structuredData: rij.structured_data,
      });
      await c.query(
        "update intel.inhoud_versies set inhoud_afdruk = $2, goedgekeurde_afdruk = $2 where id = $1",
        [versieId, afdruk],
      );
    });

    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      maakPublicatiePr(c, org, versieId, {
        siteWortel: site,
        pool: db.pool,
        basisBranch: "main",
        droog: true,
      }),
    );
    assert.equal(uit.geslaagd, true, `droog had moeten slagen: ${uit.reden}`);
    assert.equal(uit.commit, null, "droog mag niet committen");
    assert.equal(uit.branch, branchVoor(SLUG, versieId));

    const status = (await maakGit(site)(["status", "--porcelain"])).trim();
    assert.equal(status, "", `droog liet de werkboom vuil achter: ${status}`);
  });

  test("elke grendel die droog slaagde heeft ook een meting", async () => {
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      maakPublicatiePr(c, org, versieId, {
        siteWortel: site,
        pool: db.pool,
        basisBranch: "main",
        droog: true,
      }),
    );
    assert.ok(uit.grendels.length >= 5, `te weinig grendels: ${uit.grendels.length}`);
    for (const g of uit.grendels) {
      assert.ok(g.naam.length > 3, "een grendel zonder naam");
      assert.ok(g.meting.length > 0, `grendel '${g.naam}' zonder meting`);
    }
  });

  test("een vuile werkboom breekt de publicatie af", async () => {
    await writeFile(join(site, "rommel.txt"), "iemand anders was hier\n", "utf8");
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      maakPublicatiePr(c, org, versieId, { siteWortel: site, pool: db.pool, basisBranch: "main" }),
    );
    assert.equal(uit.geslaagd, false);
    assert.match(uit.reden, /vuile werkboom|andermans werk/);
    await rm(join(site, "rommel.txt"));
  });

  test("de remote heeft nog steeds alleen main; er is niets gepusht", async () => {
    const { stdout } = await uitvoeren("git", ["--git-dir", remote, "branch", "--list"]);
    const branches = stdout.split("\n").map((r) => r.replace("*", "").trim()).filter(Boolean);
    assert.deepEqual(branches, ["main"], `onverwachte branches op de remote: ${branches.join(", ")}`);
  });
});
