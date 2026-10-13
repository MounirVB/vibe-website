/* ============================================================
   TEST — het geheim mag niet in de DATABASE belanden
   ------------------------------------------------------------
   HET GEMETEN DEFECT (13 oktober 2026).

   kern/wachtrij.ts nam `fout.message` ruw over en schreef die in
   intel.taken.laatste_fout. Node zet bij een mislukte execFile de HELE
   commandoregel in die message, en ops/backup.ts gaf de verbindings-URL
   als laatste argv-element aan pg_dump. Een falende dagelijkse back-up
   schreef daarmee het productiewachtwoord in de database.

   De logger schermde al wél af. Juist deze route liep er niet langs —
   en dit is de route die blijft staan, want een databasekolom wordt
   niet geroteerd.

   Deze toets bewijst de kolom, niet de intentie. Hij faalt op de code
   van vóór 3.0.4.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import { maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { dlqInhoud, laatMislukken, pakTaak, zetInWachtrij } from "../../src/kern/wachtrij.ts";
import { IntelFout } from "../../src/kern/fouten.ts";

/* Synthetisch; hoort nergens te werken. */
const WACHTWOORD = "zW9-synthetisch-wachtwoord-niet-echt";
const URL = `postgresql://vibe_intel_app:${WACHTWOORD}@db.intern:5432/vibe_intel`;

/* Precies de vorm die Node maakt van een mislukte execFile. */
const NODE_FOUT =
  `Command failed: /usr/lib/postgresql/17/bin/pg_dump --format=custom --compress=9 ` +
  `--no-owner --no-privileges --file /tmp/vibe-intel-2026-10-13.dump ${URL}\n` +
  `pg_dump: error: server version mismatch\n`;

describe("een foutmelding die wordt BEWAARD draagt geen geheim", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("geheimlek");
    org = await maakOrganisatie(db, "vibe-energy");
  });

  after(async () => {
    await db.opruimen();
  });

  async function laatFalenEnLees(soort: string, fout: unknown): Promise<string> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await zetInWachtrij(c, org, { soort });
      const taak = await pakTaak(c, org, "toets-worker", [soort]);
      assert.ok(taak, "de taak hoort gepakt te kunnen worden");
      await laatMislukken(c, taak, fout);
      const r = await c.query<{ laatste_fout: string | null }>(
        "select laatste_fout from intel.taken where id = $1",
        [taak.id],
      );
      return r.rows[0]?.laatste_fout ?? "";
    });
  }

  test("1. de opgeslagen fout van een mislukte pg_dump bevat het wachtwoord niet", async () => {
    const bewaard = await laatFalenEnLees("backup", new Error(NODE_FOUT));

    assert.ok(bewaard.length > 0, "er hoort wél een melding bewaard te zijn");
    assert.ok(
      !bewaard.includes(WACHTWOORD),
      `het wachtwoord staat in intel.taken.laatste_fout: ${bewaard.slice(0, 300)}`,
    );
    assert.ok(
      !/:\/\/[^/@\s:]+:[^@\s]+@/.test(bewaard),
      `er staat nog een credential-URL in de kolom: ${bewaard.slice(0, 300)}`,
    );
    /* En de diagnose moet overblijven, anders is de redactie te grof. */
    assert.match(bewaard, /server version mismatch/);
  });

  test("2. ook op de DLQ-route blijft de kolom schoon", async () => {
    /* Een niet-herhaalbare fout gaat direct naar de dlq; dat is een
       ANDERE update-tak in laatMislukken, met zijn eigen parameter. */
    const bewaard = await laatFalenEnLees(
      "backup-dlq",
      new IntelFout("configuratie", NODE_FOUT, { herhaalbaar: false }),
    );
    assert.ok(
      !bewaard.includes(WACHTWOORD),
      `het wachtwoord staat in de dlq-melding: ${bewaard.slice(0, 300)}`,
    );

    const dlq = await metOrganisatie(db.pool, { organisatieId: org }, (c) => dlqInhoud(c, org));
    const rij = dlq.find((x) => x.soort === "backup-dlq");
    assert.ok(rij, "de taak hoort in de dlq te staan");
    assert.ok(
      !(rij.laatsteFout ?? "").includes(WACHTWOORD),
      "het wachtwoord komt via dlqInhoud() alsnog naar buiten",
    );
  });

  test("3. een gewone fout zonder geheim wordt niet verminkt", async () => {
    const bewaard = await laatFalenEnLees("gewoon", new Error("bron gaf HTTP 503"));
    assert.match(bewaard, /HTTP 503/);
  });
});
