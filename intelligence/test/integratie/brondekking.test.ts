/* ============================================================
   TEST — een overgeslagen bron is geen gefaalde bron
   ------------------------------------------------------------
   HET GEMETEN PROBLEEM (13 oktober 2026).

   Een ophaalronde meldde `bronnen 1 (ok 1, fout 0, overgeslagen 19)`.
   Dat getal 19 is onleesbaar: het kan negentien kapotte bronnen
   betekenen of negentien die netjes nog niet toe waren. Gemeten bleek
   het laatste: van de negen UITGEZETTE bronnen was er geen enkele kapot
   — twee met robots verboden, drie met een TDM-voorbehoud, drie waar de
   toestemming niet is vastgesteld, en één met botbescherming waarvoor
   een geautoriseerd alternatief bestaat.

   Deze toetsen leggen de classificatie vast, inclusief de regel die het
   hele punt is: alleen opeenvolgende FOUTEN maken een bron ongezond.
   Een ontbrekende toestemming is ACCESS_RESTRICTED en blijft dat, hoe
   lang hij ook niet is opgehaald.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { meetBrondekking, vatBrondekkingSamen } from "../../src/ops/brondekking.ts";

type Bron = {
  sleutel: string;
  actief: boolean;
  robots: string;
  tdm: string;
  fouten?: number;
  storingssoort?: string | null;
  intervalMin?: number;
  opgehaaldMinutenTerug?: number | null;
  opgeschortMinuten?: number | null;
  resultaat?: string | null;
};

/* Eén bron per klasse, met opzet: zo bewijst de toets de volledige
   beslisboom en niet één tak ervan. */
const BRONNEN: readonly Bron[] = [
  { sleutel: "t-success", actief: true, robots: "toegestaan", tdm: "geen_voorbehoud", opgehaaldMinutenTerug: 5, intervalMin: 60, resultaat: "ok" },
  { sleutel: "t-niet-toe", actief: true, robots: "toegestaan", tdm: "geen_voorbehoud", opgehaaldMinutenTerug: 5, intervalMin: 1440, resultaat: "ok" },
  { sleutel: "t-degraded-fout", actief: true, robots: "toegestaan", tdm: "geen_voorbehoud", fouten: 2, opgehaaldMinutenTerug: 10, resultaat: "fout" },
  { sleutel: "t-degraded-storing", actief: true, robots: "toegestaan", tdm: "geen_voorbehoud", storingssoort: "TIJDELIJKE_STORING", opgehaaldMinutenTerug: 10 },
  { sleutel: "t-degraded-opgeschort", actief: true, robots: "toegestaan", tdm: "geen_voorbehoud", opgeschortMinuten: 120, opgehaaldMinutenTerug: 10 },
  { sleutel: "t-failed", actief: true, robots: "toegestaan", tdm: "geen_voorbehoud", fouten: 4, opgehaaldMinutenTerug: 10, resultaat: "fout" },
  { sleutel: "t-onbekend", actief: true, robots: "toegestaan", tdm: "geen_voorbehoud", opgehaaldMinutenTerug: null },
  { sleutel: "t-robots-verboden", actief: false, robots: "verboden", tdm: "onbekend" },
  { sleutel: "t-tdm-voorbehoud", actief: false, robots: "toegestaan", tdm: "voorbehoud" },
  { sleutel: "t-disabled", actief: false, robots: "toegestaan", tdm: "geen_voorbehoud" },
];

describe("brondekking classificeert elke bron", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("brondekking");
    org = await maakOrganisatie(db, "vibe-energy");

    await alsEigenaar(db, async (c) => {
      for (const b of BRONNEN) {
        await c.query(
          `insert into intel.bronnen
             (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url,
              robots_status, tdm_status, storingssoort, storing_sinds,
              ophalen_opgeschort_tot, opeenvolgende_fouten, laatste_resultaat,
              ophaalinterval_minuten, laatst_opgehaald_op, actief)
           values ($1, $2, 'Toetsuitgever', 'rss',
                   'https://voorbeeld.invalid/' || $2, 'https://voorbeeld.invalid',
                   $3, $4, $5,
                   case when $5::text is null then null else now() end,
                   case when $6::int is null then null else now() + make_interval(mins => $6::int) end,
                   $7, $8, $9,
                   case when $10::int is null then null else now() - make_interval(mins => $10::int) end,
                   $11)`,
          [
            org,
            b.sleutel,
            b.robots,
            b.tdm,
            b.storingssoort ?? null,
            b.opgeschortMinuten ?? null,
            b.fouten ?? 0,
            b.resultaat ?? null,
            b.intervalMin ?? 60,
            b.opgehaaldMinutenTerug ?? null,
            b.actief,
          ],
        );
      }
    });
  });

  after(async () => {
    await db.opruimen();
  });

  const dekking = () => metOrganisatie(db.pool, { organisatieId: org }, (c) => meetBrondekking(c, org));

  test("1. elke bron krijgt precies één klasse, en het totaal klopt", async () => {
    const d = await dekking();
    assert.equal(d.totaal, BRONNEN.length);
    const som = Object.values(d.perKlasse).reduce((a, b) => a + b, 0);
    assert.equal(som, d.totaal, "de klassen tellen niet op tot het totaal");
    assert.equal(d.bronnen.length, d.totaal);
  });

  test("2. de klasse per bron is wat we verwachten", async () => {
    const d = await dekking();
    const k = new Map(d.bronnen.map((b) => [b.sleutel, b.klasse]));
    assert.equal(k.get("t-success"), "SUCCESS");
    assert.equal(k.get("t-niet-toe"), "SUCCESS", "nog niet toe is geen eigen klasse maar een vlag");
    assert.equal(k.get("t-degraded-fout"), "DEGRADED");
    assert.equal(k.get("t-degraded-storing"), "DEGRADED");
    assert.equal(k.get("t-degraded-opgeschort"), "DEGRADED");
    assert.equal(k.get("t-failed"), "FAILED");
    assert.equal(k.get("t-onbekend"), "ONBEKEND");
    assert.equal(k.get("t-robots-verboden"), "ACCESS_RESTRICTED");
    assert.equal(k.get("t-tdm-voorbehoud"), "ACCESS_RESTRICTED");
    assert.equal(k.get("t-disabled"), "DISABLED");
  });

  test("3. TOESTEMMING WEEGT ZWAARDER DAN UIT — anders lijkt het onze keuze", async () => {
    /* Een bron met robots 'verboden' staat ook uit. Zou DISABLED
       voorgaan, dan leest het dashboard 'wij hebben hem uitgezet'
       terwijl de uitgever ons weigert. Dat is een wezenlijk ander
       feit. */
    const d = await dekking();
    const b = d.bronnen.find((x) => x.sleutel === "t-robots-verboden");
    assert.ok(b);
    assert.equal(b.klasse, "ACCESS_RESTRICTED");
    assert.match(b.reden, /robots verboden/);
  });

  test("4. 'toe' spiegelt de collectorlogica, inclusief opschorting", async () => {
    const d = await dekking();
    const toe = new Map(d.bronnen.map((b) => [b.sleutel, b.toe]));
    assert.equal(toe.get("t-niet-toe"), false, "5 min geleden opgehaald met interval 1440 is niet toe");
    assert.equal(toe.get("t-onbekend"), true, "nog nooit opgehaald is altijd toe");
    assert.equal(
      toe.get("t-degraded-opgeschort"),
      false,
      "opgeschort blijft opgeschort; dat is de regel in isToeAanOphalen",
    );
    assert.equal(d.actief, 7);
    assert.equal(d.toe + d.nietToe, d.actief, "toe plus niet-toe hoort het actieve totaal te zijn");
  });

  test("5. ALLEEN fouten maken een bron ongezond, niet een ontbrekende toestemming", async () => {
    const d = await dekking();
    assert.equal(d.perKlasse.FAILED, 1, "alleen de bron met 4 fouten achtereen");
    assert.equal(d.perKlasse.DEGRADED, 3);
    assert.equal(d.perKlasse.ACCESS_RESTRICTED, 2);
    assert.equal(d.perKlasse.DISABLED, 1);
    /* Dit is de kern: acht van de tien bronnen zijn niet opgehaald, en
       slechts één daarvan is een storing. */
  });

  test("6. de samenvatting noemt alle klassen, zodat een logregel leesbaar is", async () => {
    const t = vatBrondekkingSamen(await dekking());
    for (const stuk of ["SUCCESS", "DEGRADED", "FAILED", "ACCESS_RESTRICTED", "DISABLED", "ONBEKEND"]) {
      assert.ok(t.includes(stuk), `de samenvatting mist ${stuk}: ${t}`);
    }
    assert.match(t, /nog niet toe/);
  });
});
