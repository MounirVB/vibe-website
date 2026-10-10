/* ============================================================
   TEST — AI-validatie, allowlist, budget en stroomonderbreker
   ------------------------------------------------------------
   De dure fout hier is niet een verkeerd getal maar een rekening.
   Elke grendel wordt daarom getoetst op zijn FAALGEVAL:

     sleutelvorm      verraadt hij de sleutel?
     allowlist        laat een lege lijst alles door?
     budget           handhaaft hij op een geschat bedrag?
     onderbreker      blijft hij na een crash voor altijd open?
     tarief           komt er een prijs in zonder herkomst?
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import {
  budgetStand,
  controleerTarief,
  isModelToegestaan,
  legTariefVast,
  meldMislukking,
  meldSucces,
  onderbrekerStand,
  sleutelVorm,
  ONDERBREKER_DREMPEL,
} from "../../src/ops/aibeheer.ts";

/* ================= de sleutel ================= */

describe("de sleutel wordt nooit onthuld", () => {
  test("de vorm bevat de sleutel NIET", () => {
    // geheimenscan: ok — nep-sleutel om de afscherming te toetsen
    const echt = "sk-proj-abcdefghijklmnopqrstuvwxyz0123456789ABCDEF";
    const v = sleutelVorm(echt);
    const alles = JSON.stringify(v);
    assert.ok(!alles.includes("abcdefghij"), `de vorm lekt de sleutel: ${alles}`);
    assert.ok(!alles.includes(echt.slice(8, 30)));
    assert.equal(v.prefix, "sk-proj-");
    assert.equal(v.staart, "CDEF");
    assert.equal(v.lengte, echt.length);
  });

  test("een andere sleutel geeft een andere vingerafdruk", () => {
    // geheimenscan: ok — nep-sleutel om de afscherming te toetsen
    const a = sleutelVorm("sk-proj-eenheelanderesleutel00001111");
    // geheimenscan: ok — nep-sleutel om de afscherming te toetsen
    const b = sleutelVorm("sk-proj-eenheelanderesleutel00002222");
    assert.notEqual(a.vingerafdruk, b.vingerafdruk);
  });

  test("geen sleutel geeft geen vorm", () => {
    const v = sleutelVorm(undefined);
    assert.equal(v.aanwezig, false);
    assert.equal(v.vingerafdruk, "geen");
  });
});

/* ================= tarieven ================= */

describe("een tarief zonder herkomst komt er niet in", () => {
  const goed = {
    provider: "openai",
    model: "gpt-5",
    prijsInPerMiljoen: 1.25,
    prijsUitPerMiljoen: 10,
    valuta: "USD",
    bronUrl: "https://openai.com/api/pricing/",
    gemetenOp: "2026-10-10",
  };

  test("een volledig tarief wordt geaccepteerd", () => {
    assert.deepEqual(controleerTarief(goed), []);
  });

  test("zonder bron-URL wordt het geweigerd", () => {
    const f = controleerTarief({ ...goed, bronUrl: "" });
    assert.ok(f.some((x) => /bron-URL/.test(x)), f.join("; "));
  });

  test("een niet-https bron wordt geweigerd", () => {
    assert.ok(controleerTarief({ ...goed, bronUrl: "openai.com/pricing" }).length > 0);
  });

  test("zonder meetdatum wordt het geweigerd, want tarieven veranderen", () => {
    const f = controleerTarief({ ...goed, gemetenOp: "" });
    assert.ok(f.some((x) => /meetdatum/.test(x)), f.join("; "));
  });

  test("een valuta die geen drieletterige code is wordt geweigerd", () => {
    for (const v of ["dollar", "$", "usd", ""]) {
      assert.ok(controleerTarief({ ...goed, valuta: v }).length > 0, `'${v}' hoort geweigerd`);
    }
  });

  test("een negatieve prijs wordt geweigerd", () => {
    assert.ok(controleerTarief({ ...goed, prijsInPerMiljoen: -1 }).length > 0);
  });
});

/* ================= tegen een echte database ================= */

describe("allowlist, budget en onderbreker", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("aibeheer");
    org = await maakOrganisatie(db, "ai-org");
  });

  after(async () => {
    await db.opruimen();
  });

  test("een LEGE allowlist laat niets door; dat is de veilige kant", async () => {
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      isModelToegestaan(c, "openai", "gpt-5"),
    );
    assert.equal(uit.toegestaan, false);
    assert.match(uit.reden, /leeg/);
  });

  test("de APPLICATIEROL mag de allowlist niet vullen", async () => {
    // Dit is het rechtenmodel en geen ongemak: de applicatie mag haar
    // eigen model niet toestaan. Dat is een operatorbesluit.
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query(
            "insert into intel.ai_toegestane_modellen (provider, model, reden) values ('openai','sluipweg','x')",
          ),
        ),
      /permission denied/,
    );
  });

  test("een model op de allowlist mag, een ander niet", async () => {
    // Vullen als EIGENAAR, zoals de CLI het ook doet.
    await alsEigenaar(db, (c) =>
      c.query(
        "insert into intel.ai_toegestane_modellen (provider, model, reden) values ('openai','gpt-5','toets')",
      ),
    );
    const ja = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      isModelToegestaan(c, "openai", "gpt-5"),
    );
    const nee = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      isModelToegestaan(c, "openai", "een-ander-model"),
    );
    assert.equal(ja.toegestaan, true);
    assert.equal(nee.toegestaan, false);
    assert.match(nee.reden, /staat niet op de allowlist/);
  });

  test("zonder plafond mag alles, en dat wordt gemeld", async () => {
    const b = await metOrganisatie(db.pool, { organisatieId: org }, (c) => budgetStand(c, org));
    assert.equal(b.mag, true);
    assert.match(b.reden, /geen actief kostenplafond/);
  });

  test("het dagplafond blokkeert", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query(
        `insert into intel.kostenplafonds
           (organisatie_id, max_ai_aanroepen_per_dag, max_tokens_uit_per_dag,
            max_bron_ophalingen_per_dag, max_concurrency, actief)
         values ($1, 2, 1000, 100, 2, true)`,
        [org],
      ),
    );
    for (let i = 0; i < 2; i += 1) {
      await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
        c.query(
          `insert into intel.ai_aanroepen
             (organisatie_id, doel, provider, model, prompt_hash, tokens_in, tokens_uit,
              kosten_bron, geslaagd)
           values ($1,'toets','openai','gpt-5','h',10,20,'onbekend',true)`,
          [org],
        ),
      );
    }
    const b = await metOrganisatie(db.pool, { organisatieId: org }, (c) => budgetStand(c, org));
    assert.equal(b.mag, false);
    assert.match(b.reden, /aanroepen vandaag/);
  });

  test("het maandplafond moet boven het dagplafond liggen", async () => {
    // Een maandplafond onder het dagplafond is een configuratiefout:
    // dan is de eerste dag al de hele maand.
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query(
            "update intel.kostenplafonds set max_ai_aanroepen_per_maand = 1 where organisatie_id = $1",
            [org],
          ),
        ),
      /maand_boven_dag/,
    );
  });

  test("ONBEKENDE kosten tellen NIET mee in de kostengrens", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query(
        `update intel.kostenplafonds
            set max_ai_aanroepen_per_dag = 100, max_kosten_per_maand = 0.0001
          where organisatie_id = $1`,
        [org],
      ),
    );
    const b = await metOrganisatie(db.pool, { organisatieId: org }, (c) => budgetStand(c, org));
    // Er staan twee aanroepen met kosten_bron 'onbekend'. Die worden
    // geteld en gemeld, maar mogen de grens niet dichtzetten: een
    // geschat bedrag zou het platform stilzetten op een ongemeten getal.
    assert.equal(b.maandKosten.onbekendeAanroepen, 2);
    assert.equal(b.maandKosten.gemeten, 0);
    assert.equal(b.mag, true, `onbekende kosten hebben de grens dichtgezet: ${b.reden}`);
  });

  test("een GEMETEN tarief maakt de kostengrens wel handhaafbaar", async () => {
    await alsEigenaar(db, (c) =>
      legTariefVast(c, {
        provider: "openai",
        model: "gpt-5",
        prijsInPerMiljoen: 1000,
        prijsUitPerMiljoen: 1000,
        valuta: "USD",
        bronUrl: "https://example.org/prijslijst",
        gemetenOp: "2026-10-10",
      }),
    );
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query(
        `insert into intel.ai_aanroepen
           (organisatie_id, doel, provider, model, prompt_hash, tokens_in, tokens_uit,
            kosten_schatting, valuta, kosten_bron, geslaagd)
         values ($1,'toets','openai','gpt-5','h',1000,1000,0.0100,'USD','intel.ai_prijzen',true)`,
        [org],
      ),
    );
    const b = await metOrganisatie(db.pool, { organisatieId: org }, (c) => budgetStand(c, org));
    assert.ok(b.maandKosten.gemeten > 0, "een gemeten bedrag hoort mee te tellen");
    assert.equal(b.mag, false, "de kostengrens hoort nu wel te blokkeren");
    assert.match(b.reden, /gemeten kosten/);
  });

  test("de onderbreker opent op de drempel en niet eerder", async () => {
    for (let i = 1; i < ONDERBREKER_DREMPEL; i += 1) {
      const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
        meldMislukking(c, org, `poging ${i}`),
      );
      assert.equal(stand.open, false, `na ${i} mislukkingen hoort hij nog dicht`);
    }
    const laatste = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      meldMislukking(c, org, "de druppel"),
    );
    assert.equal(laatste.open, true);
    assert.match(laatste.reden ?? "", /mislukte aanroepen achtereen/);
  });

  test("de onderbreker is TIJDELIJK: open_tot is een tijdstip, geen vlag", async () => {
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      onderbrekerStand(c, org),
    );
    assert.equal(stand.open, true);
    assert.ok(stand.openTot, "er hoort een einde aan te zitten");
    // Het einde in het verleden zetten simuleert het verstrijken.
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query(
        "update intel.ai_stroomonderbreker set open_tot = now() - interval '1 second' where organisatie_id = $1",
        [org],
      ),
    );
    const na = await metOrganisatie(db.pool, { organisatieId: org }, (c) => onderbrekerStand(c, org));
    assert.equal(na.open, false, "een verlopen onderbreker hoort dicht te zijn");
  });

  test("een geslaagde aanroep zet de teller terug op nul", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, (c) => meldMislukking(c, org, "een"));
    await metOrganisatie(db.pool, { organisatieId: org }, (c) => meldSucces(c, org));
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      onderbrekerStand(c, org),
    );
    assert.equal(stand.misluktAchtereen, 0);
  });

  test("een open onderbreker heeft altijd een reden (databaseconstraint)", async () => {
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query(
            "update intel.ai_stroomonderbreker set open_tot = now() + interval '1 hour', reden = null where organisatie_id = $1",
            [org],
          ),
        ),
      /open_heeft_reden/,
    );
  });

  test("RLS: een andere organisatie ziet deze onderbreker niet", async () => {
    const andere = await maakOrganisatie(db, "ai-org-2");
    const stand = await metOrganisatie(db.pool, { organisatieId: andere }, (c) =>
      onderbrekerStand(c, andere),
    );
    assert.equal(stand.open, false);
    assert.equal(stand.misluktAchtereen, 0);
  });
});
