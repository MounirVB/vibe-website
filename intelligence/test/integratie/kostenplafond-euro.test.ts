/* ============================================================
   INTEGRATIE — het kostenplafond in euro's
   ------------------------------------------------------------
   DIT IS BEWIJS NUMMER 5 UIT DE OPDRACHT: geen publicatie — en
   algemener: geen modelaanroep — bij budgetoverschrijding.

   De bestaande plafonds telden AANROEPEN (200 per dag) en TOKENS
   (400.000 uit per dag). Dat zijn geen geldgrenzen: wat 200 aanroepen
   kosten hangt af van het model. Migratie 0053 voegt €5 per dag en
   €0,25 per artikel toe.

   DE ZAAK DIE HET BELANGRIJKST IS staat hieronder als 'onbekend
   tarief'. intel.ai_prijzen is bij installatie leeg, met opzet. Dan is
   kosten_schatting NULL, en een som over NULL komt op NUL uit — een
   geldplafond zou dus €0,00 besteed melden terwijl er onbeperkt wordt
   uitgegeven. Dat is dezelfde fout als een ontbrekende meting voor een
   nul aanzien, nu met geld eraan. De controle weigert daarom.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, beforeEach, describe, test } from "node:test";
import type pg from "pg";

import { maakOrganisatie, maakWegwerpdatabase, alsEigenaar, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { controleerBudget } from "../../src/inhoud/model.ts";

const PROVIDER = "openai";
const MODEL = "gpt-5-mini-2026-08-01";

describe("het kostenplafond in euro's", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("kostenplafond");
    org = await maakOrganisatie(db, "kosten-org");
  });

  after(async () => {
    await db?.opruimen();
  });

  beforeEach(async () => {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query("delete from intel.ai_aanroepen");
      await c.query("delete from intel.ai_prijzen");
      await c.query("delete from intel.kostenplafonds");
    });
  });

  async function zetPlafond(o: {
    readonly perDag?: number;
    readonly perArtikel?: number;
    readonly aanroepen?: number;
    readonly valuta?: string;
    readonly actief?: boolean;
  } = {}): Promise<void> {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.kostenplafonds
           (organisatie_id, max_ai_aanroepen_per_dag, max_kosten_per_dag,
            max_kosten_per_artikel, kosten_valuta, actief)
         values ($1,$2,$3,$4,$5,$6)`,
        [
          org,
          o.aanroepen ?? 200,
          o.perDag ?? 5,
          o.perArtikel ?? 0.25,
          o.valuta ?? "EUR",
          o.actief ?? true,
        ],
      );
    });
  }

  async function zetTarief(o: { readonly uit?: number; readonly in?: number; readonly valuta?: string } = {}): Promise<void> {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.ai_prijzen
           (provider, model, prijs_in_per_miljoen, prijs_uit_per_miljoen, valuta, bron_url, gemeten_op)
         values ($1,$2,$3,$4,$5,'https://openai.com/api/pricing/', current_date)`,
        [PROVIDER, MODEL, o.in ?? 0.25, o.uit ?? 2.0, o.valuta ?? "EUR"],
      );
    });
  }

  /** Boekt een aanroep van vandaag met bekende of onbekende kosten. */
  async function boek(kosten: number | null): Promise<void> {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.ai_aanroepen
           (organisatie_id, doel, provider, model, prompt_hash, tokens_in, tokens_uit,
            kosten_schatting, valuta, kosten_bron, duur_ms, geslaagd)
         values ($1,'toets',$2,$3,'hash',100,500,$4,'EUR',$5,10,true)`,
        [org, PROVIDER, MODEL, kosten, kosten === null ? "onbekend" : "gemeten"],
      );
    });
  }

  const toets = (opties: Parameters<typeof controleerBudget>[2] = {}) =>
    metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      controleerBudget(c as pg.PoolClient, org, opties),
    );

  /* ---------- het gat dat 0053 dicht ---------- */

  test("1 · ZONDER GEMETEN TARIEF wordt de aanroep GEWEIGERD", async () => {
    /* DE KERNZAAK. Een geldplafond over onbekende kosten telt op tot
       nul en laat onbeperkt uitgeven door. Weigeren is het enige
       eerlijke antwoord. */
    await zetPlafond();
    const r = await toets({ provider: PROVIDER, model: MODEL, maxTokensUit: 900, tokensIn: 400 });
    assert.equal(r.mag, false);
    assert.match(r.reden, /GEEN GEMETEN TARIEF/);
    assert.match(r.reden, /intel\.ai_prijzen/);
    assert.match(r.reden, /onbeperkt wordt uitgegeven/);
    assert.equal(r.geschatteKosten, null);
  });

  test("1b · MET tarief mag het, en de schatting staat in de uitkomst", async () => {
    await zetPlafond();
    await zetTarief({ in: 0.25, uit: 2.0 });
    const r = await toets({ provider: PROVIDER, model: MODEL, maxTokensUit: 900, tokensIn: 400 });
    assert.equal(r.mag, true, r.reden);
    /* 400/1e6 * 0,25 + 900/1e6 * 2,00 = 0,0001 + 0,0018 = 0,0019 */
    assert.ok(Math.abs((r.geschatteKosten ?? 0) - 0.0019) < 1e-9, `geschat: ${r.geschatteKosten}`);
    assert.equal(r.kostenPlafondPerDag, 5);
  });

  /* ---------- het artikelplafond ---------- */

  test("2 · een aanroep die over het ARTIKELplafond gaat weigert", async () => {
    await zetPlafond({ perArtikel: 0.25 });
    /* Een duur model: 500 per miljoen uit. 900 tokens = 0,45 euro. */
    await zetTarief({ in: 100, uit: 500 });
    const r = await toets({ provider: PROVIDER, model: MODEL, maxTokensUit: 900, tokensIn: 400 });
    assert.equal(r.mag, false);
    assert.match(r.reden, /over het artikelplafond van 0\.2500/);
  });

  test("2b · de schatting gaat over het MAXIMUM aan tokens, niet over een gemiddelde", async () => {
    /* Zou de controle op een verwacht aantal rekenen, dan laat hij de
       uitschieter er juist door. Met hetzelfde tarief en een lager
       maximum mag het wel. */
    await zetPlafond({ perArtikel: 0.25 });
    await zetTarief({ in: 100, uit: 500 });
    const hoog = await toets({ provider: PROVIDER, model: MODEL, maxTokensUit: 900, tokensIn: 0 });
    const laag = await toets({ provider: PROVIDER, model: MODEL, maxTokensUit: 400, tokensIn: 0 });
    assert.equal(hoog.mag, false, "900 tokens maal 500 per miljoen is 0,45 en gaat erover");
    assert.equal(laag.mag, true, `400 tokens maal 500 per miljoen is 0,20 en mag: ${laag.reden}`);
  });

  /* ---------- het dagplafond ---------- */

  test("3 · het DAGplafond telt het bestede bedrag plus deze aanroep", async () => {
    await zetPlafond({ perDag: 0.01, perArtikel: 0.01 });
    await zetTarief({ in: 0, uit: 2.0 });
    await boek(0.009);
    /* 900 tokens maal 2,00 per miljoen is 0,0018; samen 0,0108 > 0,01 */
    const r = await toets({ provider: PROVIDER, model: MODEL, maxTokensUit: 900, tokensIn: 0 });
    assert.equal(r.mag, false);
    assert.match(r.reden, /dagplafond in geld bereikt/);
    assert.ok(Math.abs((r.kostenVandaag ?? 0) - 0.009) < 1e-9);
  });

  test("3b · ONBEKENDE kosten van VANDAAG maken het dagplafond onhandhaafbaar", async () => {
    /* Staat er één aanroep van vandaag zonder gemeten kosten, dan is
       het bedrag van vandaag een ONDERGRENS. Dan kan de grens al
       overschreden zijn zonder dat het te zien is. Weigeren, niet
       gokken. */
    await zetPlafond();
    await zetTarief();
    await boek(null);
    const r = await toets({ provider: PROVIDER, model: MODEL, maxTokensUit: 900, tokensIn: 0 });
    assert.equal(r.mag, false);
    assert.match(r.reden, /GEEN gemeten kosten/);
    assert.match(r.reden, /ondergrens/);
  });

  /* ---------- valuta ---------- */

  test("4 · een tarief in een ANDERE valuta dan het plafond weigert", async () => {
    await zetPlafond({ valuta: "EUR" });
    await zetTarief({ valuta: "USD" });
    const r = await toets({ provider: PROVIDER, model: MODEL, maxTokensUit: 900, tokensIn: 0 });
    assert.equal(r.mag, false);
    assert.match(r.reden, /appels met peren/);
  });

  /* ---------- de bestaande grenzen blijven ---------- */

  test("5 · het AANROEPENplafond blijft gelden en gaat vóór de geldgrenzen", async () => {
    /* Het is het snelste net tegen een doorgeschoten lus: dat vangt een
       duizendvoudige herhaling eerder dan een geldplafond dat per
       aanroep een fractie oploopt. */
    await zetPlafond({ aanroepen: 2 });
    await zetTarief();
    await boek(0.001);
    await boek(0.001);
    const r = await toets({ provider: PROVIDER, model: MODEL, maxTokensUit: 900, tokensIn: 0 });
    assert.equal(r.mag, false);
    assert.match(r.reden, /dagplafond bereikt: 2 van 2 aanroepen/);
  });

  test("5b · zonder ACTIEF plafond blijft het gedrag onveranderd", async () => {
    await zetPlafond({ actief: false });
    const r = await toets({ provider: PROVIDER, model: MODEL, maxTokensUit: 900 });
    assert.equal(r.mag, true);
    assert.match(r.reden, /geen actief plafond/);
  });

  test("5c · zonder model blijven de geldgrenzen buiten beschouwing", async () => {
    /* ACHTERWAARTS COMPATIBEL. Een aanroeper die geen model meegeeft
       vraagt niet om een geldtoets; die krijgt het aanroepenplafond.
       Dat is expliciet in de reden, zodat niemand denkt dat de
       geldgrens is gehaald. */
    await zetPlafond();
    const r = await toets();
    assert.equal(r.mag, true);
    assert.match(r.reden, /geen model is opgegeven/);
    assert.equal(r.geschatteKosten, null);
  });

  /* ---------- de grendels in het schema ---------- */

  test("6 · het ARTIKELplafond kan niet boven het DAGplafond liggen", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.kostenplafonds
               (organisatie_id, max_kosten_per_dag, max_kosten_per_artikel)
             values ($1, 1.0, 2.0)`,
            [org],
          );
        }),
      /artikel_binnen_dag/i,
      "één artikel mag niet meer mogen kosten dan een hele dag",
    );
  });

  test("6b · een negatief plafond kan niet bestaan", async () => {
    /* DAG -1 EN ARTIKEL -2, niet -1 en 0: met 0 <= -1 valt
       artikel_binnen_dag als eerste om en toetst deze zaak de verkeerde
       constraint. Met -2 <= -1 houdt die wel, zodat alleen de
       negativiteitseis overblijft. Beide constraints doen hun werk; het
       ging erom WELKE hier wordt vastgezet. */
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.kostenplafonds
               (organisatie_id, max_kosten_per_dag, max_kosten_per_artikel)
             values ($1, -1.0, -2.0)`,
            [org],
          );
        }),
      /kosten_niet_negatief/i,
    );
  });

  test("6c · de standaardwaarden zijn de gevraagde 5 en 0,25 euro", async () => {
    /* DE OPDRACHT NOEMT TWEE BEDRAGEN. Als ze als default in het schema
       staan, geldt de grens ook voor een organisatie die later wordt
       aangemaakt zonder dat iemand eraan denkt. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query("insert into intel.kostenplafonds (organisatie_id) values ($1)", [org]);
    });
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ dag: string; artikel: string; valuta: string }>(
        `select max_kosten_per_dag::text as dag, max_kosten_per_artikel::text as artikel,
                kosten_valuta as valuta
           from intel.kostenplafonds where organisatie_id = $1`,
        [org],
      ),
    );
    assert.equal(Number(r.rows[0]?.dag), 5);
    assert.equal(Number(r.rows[0]?.artikel), 0.25);
    assert.equal(r.rows[0]?.valuta, "EUR");
  });
});
