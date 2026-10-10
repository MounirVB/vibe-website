/* ============================================================
   TEST — dump en restore met een ECHTE goedkeuring erin
   ------------------------------------------------------------
   De restoretest-CLI bewijst het mechanisme tegen de
   ontwikkeldatabase, maar daar staan nul goedkeuringen in. Dan slaagt
   de toets "goedkeuringen zijn teruggezet" zonder iets te bewijzen.

   Deze suite vult dat gat. Hij zet een goedkeuring, een
   publicatiebesluit en een auditregel in een wegwerpdatabase, dumpt
   die, zet hem terug in een TWEEDE wegwerpdatabase en controleert of
   precies dat deel de reis heeft overleefd — inclusief de goedkeurder
   en de inhoudsafdruk waaraan de goedkeuring gebonden is.

   Dat is de enige laag van dit systeem die niet herbouwbaar is uit
   publieke bronnen, en dus de enige die een back-up echt moet redden.
   ============================================================ */

import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { after, before, describe, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import pg from "pg";
import { maakGebruiker, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { vindPgGereedschap } from "../../src/ops/backup.ts";

const uitvoeren = promisify(execFile);

describe("back-up en restore van de niet-herbouwbare laag", () => {
  let bron: Wegwerpdatabase;
  let doel: Wegwerpdatabase;
  let map = "";
  let dumpPad = "";
  let org = 0;
  let auteur = 0;
  let chef = 0;
  let serverMajor = 0;
  const AFDRUK = "afdruk-die-de-reis-moet-overleven";

  before(async () => {
    bron = await maakWegwerpdatabase("bron");
    doel = await maakWegwerpdatabase("doel");
    map = await mkdtemp(join(tmpdir(), "intel-bu-"));

    org = await maakOrganisatie(bron, "backup-org");
    auteur = await maakGebruiker(bron, org, "schrijver@test.nl", "redacteur");
    chef = await maakGebruiker(bron, org, "goedkeurder@test.nl", "beheerder");

    const c = new pg.Client({ connectionString: bron.url, options: "-c search_path=intel,public" });
    await c.connect();
    try {
      const v = await c.query<{ versie: string }>("select current_setting('server_version') as versie");
      serverMajor = Number(/^(\d+)/.exec(v.rows[0]!.versie)?.[1] ?? "0");

      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);

      const iv = await c.query<{ id: number }>(
        `insert into intel.inhoud_versies
           (organisatie_id, pad, versie, soort, titel, meta_omschrijving, canonieke_url,
            body_markdown, status, risico_klasse, auteur_soort, poorten_geslaagd,
            inhoud_afdruk, goedgekeurde_afdruk, goedgekeurd_door, goedgekeurd_op, aangemaakt_door)
         values ($1,'/nieuws/back-upbewijs',1,'nieuw_artikel','Back-upbewijs | Vibe',
                 'Een artikel dat alleen bestaat om een restore te kunnen verifieren.',
                 'https://www.vibeenergy.nl/nieuws/back-upbewijs',
                 'Lead.\n\n## Kop\n\nTekst.\n','goedgekeurd','laag','ai',true,
                 $2,$2,$3, now(), $4)
         returning id`,
        [org, AFDRUK, chef, auteur],
      );

      await c.query(
        `insert into intel.publicatiebesluiten
           (organisatie_id, inhoud_versie_id, besluit, door_gebruiker_id, actor_soort, motivatie)
         values ($1,$2,'goedgekeurd',$3,'mens','handmatig vrijgegeven voor de back-uptest')`,
        [org, iv.rows[0]!.id, chef],
      );

      await c.query(
        `insert into intel.audit_gebeurtenissen
           (organisatie_id, actor_soort, actor_id, actor_naam, handeling, objectsoort, object_id, herkomst)
         values ($1,'mens',$2,'goedkeurder@test.nl','goedkeuren','inhoud_versie',$3,'test')`,
        [org, chef, String(iv.rows[0]!.id)],
      );
    } finally {
      await c.end();
    }

    /* Dumpen met de binary die bij de server past. */
    const g = await vindPgGereedschap(serverMajor);
    dumpPad = join(map, "bron.dump");
    await uitvoeren(g.pgDump, [
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--file",
      dumpPad,
      bron.url,
    ]);
  });

  after(async () => {
    await rm(map, { recursive: true, force: true });
    await bron.opruimen();
    await doel.opruimen();
  });

  test("de dump bevat een leesbare inhoudsopgave", async () => {
    const g = await vindPgGereedschap(serverMajor);
    const { stdout } = await uitvoeren(g.pgRestore, ["--list", dumpPad], {
      maxBuffer: 64 * 1024 * 1024,
    });
    const regels = stdout.split("\n").filter((r) => r.trim() && !r.startsWith(";"));
    assert.ok(regels.length > 100, `inhoudsopgave te klein: ${regels.length} regels`);
  });

  test("de restore brengt de goedkeuring terug MET goedkeurder en afdruk", async () => {
    const g = await vindPgGereedschap(serverMajor);

    /* De doeldatabase is door het harnas al gemigreerd; een restore
       daarover zou botsen. Leegmaken en dan de dump erin. */
    const eigenaar = new pg.Client({ connectionString: doel.url });
    await eigenaar.connect();
    try {
      await eigenaar.query("drop schema if exists intel cascade");
      await eigenaar.query("drop schema if exists intel_priv cascade");
    } finally {
      await eigenaar.end();
    }

    await uitvoeren(
      g.pgRestore,
      ["--dbname", doel.url, "--no-owner", "--no-privileges", "--exit-on-error", dumpPad],
      { maxBuffer: 256 * 1024 * 1024 },
    );

    const c = new pg.Client({ connectionString: doel.url, options: "-c search_path=intel,public" });
    await c.connect();
    try {
      const v = await c.query<{
        pad: string;
        status: string;
        inhoud_afdruk: string;
        goedgekeurde_afdruk: string;
        goedkeurder: string;
        goedgekeurd_op: Date | null;
      }>(
        `select v.pad, v.status, v.inhoud_afdruk, v.goedgekeurde_afdruk,
                g.email as goedkeurder, v.goedgekeurd_op
           from intel.inhoud_versies v
           join intel.gebruikers g on g.id = v.goedgekeurd_door
          where v.pad = '/nieuws/back-upbewijs'`,
      );
      assert.equal(v.rowCount, 1, "de goedgekeurde versie is niet teruggekomen");
      const rij = v.rows[0]!;
      assert.equal(rij.status, "goedgekeurd");
      assert.equal(rij.goedkeurder, "goedkeurder@test.nl", "de goedkeurder is verloren");
      assert.equal(rij.inhoud_afdruk, AFDRUK);
      assert.equal(
        rij.goedgekeurde_afdruk,
        AFDRUK,
        "de binding tussen goedkeuring en inhoud is verloren",
      );
      assert.ok(rij.goedgekeurd_op instanceof Date, "het goedkeuringsmoment is verloren");

      const besluit = await c.query<{ besluit: string; actor_soort: string; motivatie: string }>(
        "select besluit, actor_soort, motivatie from intel.publicatiebesluiten",
      );
      assert.equal(besluit.rowCount, 1);
      assert.equal(besluit.rows[0]!.besluit, "goedgekeurd");
      assert.equal(besluit.rows[0]!.actor_soort, "mens");
      assert.match(besluit.rows[0]!.motivatie, /back-uptest/);

      const audit = await c.query<{ handeling: string; actor_naam: string }>(
        "select handeling, actor_naam from intel.audit_gebeurtenissen",
      );
      assert.equal(audit.rowCount, 1);
      assert.equal(audit.rows[0]!.handeling, "goedkeuren");
      assert.equal(audit.rows[0]!.actor_naam, "goedkeurder@test.nl");
    } finally {
      await c.end();
    }
  });

  test("na de restore is het auditspoor nog steeds onwijzigbaar", async () => {
    const c = new pg.Client({ connectionString: doel.url, options: "-c search_path=intel,public" });
    await c.connect();
    try {
      await assert.rejects(
        () => c.query("update intel.audit_gebeurtenissen set handeling = 'herschreven'"),
        /append|only|niet toegestaan|wijzig/i,
        "het auditspoor is na een restore wijzigbaar geworden",
      );
      await assert.rejects(
        () => c.query("delete from intel.publicatiebesluiten"),
        /append|only|niet toegestaan|verwijder/i,
        "publicatiebesluiten zijn na een restore verwijderbaar geworden",
      );
    } finally {
      await c.end();
    }
  });

  test("na de restore gelden de vier-ogen- en afdrukconstraints nog", async () => {
    const c = new pg.Client({ connectionString: doel.url, options: "-c search_path=intel,public" });
    await c.connect();
    try {
      await assert.rejects(
        () =>
          c.query(
            `update intel.inhoud_versies set goedgekeurd_door = aangemaakt_door
              where pad = '/nieuws/back-upbewijs'`,
          ),
        /vier_ogen/,
        "de vier-ogenconstraint is na een restore verdwenen",
      );
    } finally {
      await c.end();
    }
  });
});
