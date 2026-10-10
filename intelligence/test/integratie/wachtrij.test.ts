/* ============================================================
   TEST — de duurzame wachtrij
   ------------------------------------------------------------
   Tegen een echte database, met de applicatierol en dus met RLS van
   kracht. De vier eigenschappen die deze wachtrij moet hebben worden
   hier afzonderlijk aangevallen:

     1 twee workers pakken nooit dezelfde taak
     2 een omgevallen worker verliest zijn taak niet
     3 de planner mag dubbel draaien
     4 een taak die blijft falen eindigt in de dlq en blokkeert niets
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import { maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import {
  geefVerlopenTerug,
  laatMislukken,
  pakTaak,
  rondAf,
  zetInWachtrij,
  wachtrijBeeld,
} from "../../src/kern/wachtrij.ts";
import { IntelFout } from "../../src/kern/fouten.ts";

describe("wachtrij", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("wachtrij");
    org = await maakOrganisatie(db, "wachtrij-org");
  });

  after(async () => {
    await db.opruimen();
  });

  test("een taak zonder idempotentiesleutel komt altijd erbij", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const a = await zetInWachtrij(c, org, { soort: "los" });
      const b = await zetInWachtrij(c, org, { soort: "los" });
      assert.ok(a.nieuw && b.nieuw);
      assert.notEqual(a.id, b.id);
    });
  });

  test("dezelfde idempotentiesleutel levert precies een taak", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const sleutel = "ophalen:2026-10-10T12";
      const eerste = await zetInWachtrij(c, org, { soort: "ophalen", idempotentieSleutel: sleutel });
      const tweede = await zetInWachtrij(c, org, { soort: "ophalen", idempotentieSleutel: sleutel });
      const derde = await zetInWachtrij(c, org, { soort: "ophalen", idempotentieSleutel: sleutel });

      assert.equal(eerste.nieuw, true);
      assert.equal(tweede.nieuw, false, "een tweede poging is GEEN fout maar 'bestaat al'");
      assert.equal(derde.nieuw, false);
      assert.match(tweede.reden, /bestaat al/);
    });
  });

  test("een andere soort met dezelfde sleutel is een andere taak", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const s = "venster:2026-10-10T13";
      const a = await zetInWachtrij(c, org, { soort: "ophalen", idempotentieSleutel: s });
      const b = await zetInWachtrij(c, org, { soort: "clusteren", idempotentieSleutel: s });
      assert.ok(a.nieuw && b.nieuw);
    });
  });

  test("twee workers pakken nooit dezelfde taak", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await zetInWachtrij(c, org, { soort: "race", payload: { n: 1 } });
      await zetInWachtrij(c, org, { soort: "race", payload: { n: 2 } });
    });

    // Twee aparte verbindingen, dus twee echte sessies.
    const [a, b] = await Promise.all([
      metOrganisatie(db.pool, { organisatieId: org }, (c) => pakTaak(c, org, "worker-a", ["race"])),
      metOrganisatie(db.pool, { organisatieId: org }, (c) => pakTaak(c, org, "worker-b", ["race"])),
    ]);

    assert.ok(a, "worker a hoort een taak te krijgen");
    assert.ok(b, "worker b hoort de ANDERE taak te krijgen, niet te blokkeren");
    assert.notEqual(a!.id, b!.id, "skip locked heeft gefaald: beide workers kregen dezelfde taak");
  });

  test("een derde worker krijgt niets als de wachtrij leeg is", async () => {
    const c3 = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pakTaak(c, org, "worker-c", ["race"]),
    );
    assert.equal(c3, null);
  });

  test("een pakbeurt verhoogt de pogingenteller", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await zetInWachtrij(c, org, { soort: "tellen" });
    });
    const t = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pakTaak(c, org, "w", ["tellen"]),
    );
    assert.equal(t?.pogingen, 1);
  });

  test("een verlopen lease komt terug in de wachtrij", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await zetInWachtrij(c, org, { soort: "lease" });
    });
    const t = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pakTaak(c, org, "worker-die-omvalt", ["lease"]),
    );
    assert.ok(t);

    // Nog niet verlopen: niets teruggeven.
    const nul = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      geefVerlopenTerug(c, org),
    );
    assert.equal(nul, 0, "een geldige lease mag niet worden afgepakt");

    // De worker valt om: zet de lease in het verleden.
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query("update intel.taken set zichtbaarheid_tot = now() - interval '1 minute' where id = $1", [
        t!.id,
      ]),
    );

    const terug = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      geefVerlopenTerug(c, org),
    );
    assert.equal(terug, 1);

    // En hij is weer te pakken.
    const opnieuw = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pakTaak(c, org, "worker-die-het-overneemt", ["lease"]),
    );
    assert.equal(opnieuw?.id, t!.id);
    assert.equal(opnieuw?.pogingen, 2, "de tweede poging hoort geteld te worden");
  });

  test("een herhaalbare fout wordt opnieuw gepland met backoff", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await zetInWachtrij(c, org, { soort: "faalt", maxPogingen: 3 });
    });
    const t = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pakTaak(c, org, "w", ["faalt"]),
    );
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      laatMislukken(c, t!, new IntelFout("netwerk", "tijdelijk weg", {})),
    );
    assert.equal(uit, "opnieuw");

    const rij = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ status: string; beschikbaar_op: Date; laatste_fout_soort: string }>(
        "select status, beschikbaar_op, laatste_fout_soort from intel.taken where id = $1",
        [t!.id],
      );
      return r.rows[0]!;
    });
    assert.equal(rij.status, "wachtend");
    assert.equal(rij.laatste_fout_soort, "netwerk");
    assert.ok(
      rij.beschikbaar_op.getTime() > Date.now() + 30_000,
      "de backoff hoort de taak naar de toekomst te zetten",
    );
  });

  test("een NIET-herhaalbare fout gaat direct naar de dlq", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await zetInWachtrij(c, org, { soort: "configfout", maxPogingen: 9 });
    });
    const t = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pakTaak(c, org, "w", ["configfout"]),
    );
    // herhaalbaar=false bij soort 'configuratie'; een vierde poging
    // vindt dezelfde ontbrekende variabele niet alsnog.
    const fout = new IntelFout("configuratie", "INTEL_IETS ontbreekt", {});
    assert.equal(fout.herhaalbaar, false, "aanname van deze test");

    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      laatMislukken(c, t!, fout),
    );
    assert.equal(uit, "dlq", "een configuratiefout hoort niet acht keer herhaald te worden");
  });

  test("na max_pogingen gaat een taak naar de dlq en blokkeert de rest niet", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await zetInWachtrij(c, org, { soort: "uitputten", maxPogingen: 2 });
      await zetInWachtrij(c, org, { soort: "uitputten", maxPogingen: 2 });
    });

    // Eerste taak twee keer laten falen.
    for (const verwacht of ["opnieuw", "dlq"] as const) {
      const t = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
        await c.query(
          "update intel.taken set beschikbaar_op = now() where organisatie_id = $1 and soort = 'uitputten' and status = 'wachtend'",
          [org],
        );
        return pakTaak(c, org, "w", ["uitputten"]);
      });
      assert.ok(t);
      const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
        laatMislukken(c, t!, new IntelFout("netwerk", "blijft weg", {})),
      );
      assert.equal(uit, verwacht);
    }

    // De tweede taak is nog gewoon te pakken: een dlq-taak blokkeert niet.
    const nog = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pakTaak(c, org, "w", ["uitputten"]),
    );
    assert.ok(nog, "een dlq-taak mag de wachtrij niet blokkeren");
  });

  test("afronden legt de duur vast en haalt de lease weg", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await zetInWachtrij(c, org, { soort: "klaar" });
    });
    const t = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pakTaak(c, org, "w", ["klaar"]),
    );
    await metOrganisatie(db.pool, { organisatieId: org }, (c) => rondAf(c, t!.id, 1234.7));

    const rij = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ status: string; duur_ms: number; zichtbaarheid_tot: Date | null }>(
        "select status, duur_ms, zichtbaarheid_tot from intel.taken where id = $1",
        [t!.id],
      );
      return r.rows[0]!;
    });
    assert.equal(rij.status, "gereed");
    assert.equal(rij.duur_ms, 1235);
    assert.equal(rij.zichtbaarheid_tot, null);
  });

  test("het wachtrijbeeld telt per status en soort", async () => {
    const beeld = await wachtrijBeeld(db.pool, org);
    assert.ok(beeld.length > 0);
    assert.ok(beeld.some((b) => b.status === "dlq"), "er is in deze suite een dlq-taak gemaakt");
    assert.ok(beeld.every((b) => b.aantal > 0));
  });

  test("de applicatierol mag taken NIET verwijderen", async () => {
    // Gevonden doordat deze suite eerst met DELETE opruimde en daarop
    // stuitte. Dat is geen testprobleem maar het bedoelde rechtenmodel:
    // een taak is een auditspoor van wat het systeem heeft gedaan, en de
    // applicatie hoort dat niet te kunnen wissen.
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query("delete from intel.taken where organisatie_id = $1", [org]),
        ),
      /permission denied/,
    );
  });

  test("RLS: een andere organisatie ziet deze taken niet", async () => {
    const andere = await maakOrganisatie(db, "wachtrij-org-2");
    const beeld = await wachtrijBeeld(db.pool, andere);
    assert.deepEqual(beeld, [], "taken van een andere organisatie horen onzichtbaar te zijn");
  });
});
