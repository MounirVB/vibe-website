/* ============================================================
   TEST — ook een TESTMAIL gaat maar één keer de deur uit
   ------------------------------------------------------------
   WAT HIER IS GEBEURD, EN WAAROM DEZE TOETS BESTAAT.

   Op 14 oktober 2026 om 05:10Z is de gecontroleerde testmail naar
   marketing@vibeenergy.nl verstuurd via de ops-runner. Er gingen TWEE
   mails uit, niet één: berichten 1 en 2, met twee verschillende
   provider-ids (…d1… en …d2…). De oorzaak was een dubbele
   containerstart — een variabelewijziging en de ops-redeploy vielen
   samen — en het commando liep daardoor twee keer.

   Dat de keten dat niet ving, was MIJN fout en geen toeval. De hele
   deduplicatie hangt aan de unieke index
   `meldberichten_eenmalig (organisatie, soort, bundel, vingerafdruk)`,
   en de TESTweg was de enige die daar niet door werd gedekt: de
   vingerafdruk kwam uit de volledige ISO-tijd, dus elke poging was per
   definitie een ander bericht. De grendel kon niets doen.

   Twee reparaties, en beide staan hieronder vast:

     1 de vingerafdruk van een test is stabiel PER MINUUT
     2 de insert gebruikt `on conflict do nothing`, zodat de tweede
       poging niets schrijft en dus ook niets verstuurt

   Par. 4.5 vraagt bescherming tegen gelijktijdige workers. Die moet voor
   ELKE soort gelden, ook voor de soort die een mens zelf aftrapt.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import { maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie, rijen } from "../../src/kern/db.ts";
import { testVingerafdruk } from "../../src/ops/meldmail.ts";

describe("de testmail is idempotent", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("testgrendel");
    org = await maakOrganisatie(db, "testgrendel");
  });

  after(async () => {
    await db?.opruimen();
  });

  /** Precies de insert die src/cli/meldmail.ts doet. */
  async function pogingTotTest(vinger: string): Promise<number | null> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ id: number }>(
        `insert into intel.meld_berichten
           (organisatie_id, soort, bundel, vingerafdruk, ernst, onderwerp, html, tekst, aangeboden_op)
         values ($1,'TEST','test',$2,null,$3,$4,$5, now())
         on conflict (organisatie_id, soort, bundel, vingerafdruk) do nothing
         returning id`,
        [org, vinger, "[Vibe Energy Intelligence] [TEST] testbericht van de alerteerder", "<p>x</p>", "x"],
      );
      return r.rows[0]?.id ?? null;
    });
  }

  test("1. de vingerafdruk van een test is STABIEL binnen dezelfde minuut", () => {
    /* Dit is de kern van het defect: met de volledige ISO-tijd waren twee
       starts in dezelfde seconde al twee verschillende berichten. */
    const a = testVingerafdruk(new Date("2026-10-14T05:10:03.120Z"));
    const b = testVingerafdruk(new Date("2026-10-14T05:10:59.880Z"));
    assert.equal(a, b, "twee pogingen in dezelfde minuut horen dezelfde vingerafdruk te hebben");

    /* En een minuut later is het wel een nieuwe test, want dan wil een
       mens hem echt opnieuw. */
    const c = testVingerafdruk(new Date("2026-10-14T05:11:00.000Z"));
    assert.notEqual(a, c, "een minuut later hoort een nieuwe test mogelijk te zijn");
    assert.match(a, /^[0-9a-f]{16,64}$/, "en de vorm past in de constraint van 0039");
  });

  test("2. twee pogingen in dezelfde minuut leveren EEN rij, dus EEN mail", () => {
    const vinger = testVingerafdruk(new Date("2026-10-14T05:10:03.120Z"));
    return (async () => {
      const eerste = await pogingTotTest(vinger);
      const tweede = await pogingTotTest(vinger);
      assert.ok(eerste !== null, "de eerste poging hoort te slagen");
      assert.equal(
        tweede,
        null,
        "de TWEEDE poging hoort niets in te voegen; dat is wat de dubbele mail van 05:10Z voorkomt",
      );
      const n = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
        rijen<{ n: number }>(
          c,
          "select count(*)::int as n from intel.meld_berichten where organisatie_id = $1 and soort = 'TEST'",
          [org],
        ),
      );
      assert.equal(n[0]!.n, 1, "er mag precies EEN testbericht in het logboek staan");
    })();
  });

  test("3. GELIJKTIJDIG levert ook EEN rij op", async () => {
    /* De echte oorzaak was gelijktijdigheid, dus die hoort ook getoetst.
       De unieke index is wat dit afdwingt; een controle in code zou hier
       een race zijn. */
    const vinger = testVingerafdruk(new Date("2026-10-14T06:22:00.000Z"));
    const uitkomsten = await Promise.all([
      pogingTotTest(vinger),
      pogingTotTest(vinger),
      pogingTotTest(vinger),
    ]);
    const geslaagd = uitkomsten.filter((x) => x !== null);
    assert.equal(
      geslaagd.length,
      1,
      `drie gelijktijdige pogingen horen EEN rij te geven, kreeg ${geslaagd.length}`,
    );
  });

  test("4. een test in een ANDERE minuut mag wel", async () => {
    const later = testVingerafdruk(new Date("2026-10-14T07:00:00.000Z"));
    assert.ok(await pogingTotTest(later), "een echte nieuwe test hoort niet geblokkeerd te worden");
  });
});
