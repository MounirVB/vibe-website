/* ============================================================
   TEST — geen stap mag tussen plan en uitvoering verdwijnen
   ------------------------------------------------------------
   HET GEMETEN DEFECT (13 oktober 2026, op 078785a).

   PLAN stond in cli/planner.ts en REGISTER in cli/worker.ts. Beide zijn
   CLI's met top-level await, dus geen enkele toets kon ze importeren en
   naast elkaar leggen. Gevolg:

     · `semantiek` stond in geen van beide. Nieuwe uitspraken kregen
       daarom nooit een verwoordbaarheidsoordeel.
     · `voorstel` stond in geen van beide. Er werd dus nooit een
       paginarevisie herbouwd, en het dashboard bleef op dezelfde (of
       nul) READY_FOR_REVIEW-rijen staan.
     · `gezondheid` bestond volledig — drempels, ernstmodel, meldlaag,
       exitcodes — en werd door niets gestart.

   Alle drie waren onzichtbaar: er was geen fout, geen dlq-regel en geen
   rood signaal. Een stap die niets doet ziet er precies uit als een stap
   die niets te doen had.

   Deze toetsen zijn de grendel. Ze kosten geen database.
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import { GEPLANDE_SOORTEN, PLAN, REGISTER, TAAKSOORTEN } from "../../src/kern/taken.ts";

/* Soorten die met opzet NIET gepland zijn en alleen met de hand of door
   een andere trigger draaien. Leeg betekent: alles wordt gepland. Een
   nieuwe handler hoort hier of in PLAN te staan — anders draait hij
   nooit, en dat is precies het defect. */
const BEWUST_HANDMATIG: readonly string[] = [];

describe("plan en register lopen niet uit elkaar", () => {
  test("elke GEPLANDE soort heeft een handler", () => {
    const zonderHandler = GEPLANDE_SOORTEN.filter((s) => !TAAKSOORTEN.includes(s));
    assert.deepEqual(
      zonderHandler,
      [],
      `de planner plant ${zonderHandler.join(", ")} maar de worker kan dat niet uitvoeren`,
    );
  });

  test("elke HANDLER wordt gepland, of staat expliciet als handmatig genoteerd", () => {
    const nooitGepland = TAAKSOORTEN.filter(
      (s) => !GEPLANDE_SOORTEN.includes(s) && !BEWUST_HANDMATIG.includes(s),
    );
    assert.deepEqual(
      nooitGepland,
      [],
      `${nooitGepland.join(", ")} heeft een handler maar wordt nooit gepland; ` +
        `zet hem in PLAN of in BEWUST_HANDMATIG met een reden`,
    );
  });

  test("PLAN bevat geen dubbele soort", () => {
    assert.equal(new Set(GEPLANDE_SOORTEN).size, GEPLANDE_SOORTEN.length);
  });

  test("elke planregel heeft een toelichting en een prioriteit", () => {
    for (const p of PLAN) {
      assert.ok(p.toelichting.length > 20, `${p.soort} heeft geen bruikbare toelichting`);
      assert.ok(Number.isInteger(p.prioriteit) && p.prioriteit > 0, `${p.soort} mist een prioriteit`);
    }
  });
});

describe("de drie stappen die in 3.0.3 ontbraken", () => {
  for (const soort of ["semantiek", "voorstel", "gezondheid"] as const) {
    test(`${soort} is gepland EN uitvoerbaar`, () => {
      assert.ok(GEPLANDE_SOORTEN.includes(soort), `${soort} staat niet in PLAN`);
      assert.ok(TAAKSOORTEN.includes(soort), `${soort} heeft geen handler`);
      assert.equal(typeof REGISTER[soort], "function");
    });
  }
});

describe("de keten staat in de juiste orde", () => {
  const prioriteit = (soort: string): number => {
    const p = PLAN.find((x) => x.soort === soort);
    assert.ok(p, `${soort} staat niet in PLAN`);
    return p.prioriteit;
  };

  test("ophalen voedt clusteren voedt semantiek voedt beoordelen voedt voorstel", () => {
    /* De prioriteit bepaalt welke taak een worker eerst pakt. Staat
       `voorstel` vóór `beoordelen`, dan werkt een ronde de kandidaten af
       die de motor nog niet heeft geschreven, en loopt de keten een
       venster achter. */
    const keten = ["ophalen", "clusteren", "semantiek", "beoordelen", "voorstel"];
    for (let i = 1; i < keten.length; i += 1) {
      assert.ok(
        prioriteit(keten[i - 1]!) < prioriteit(keten[i]!),
        `${keten[i - 1]} hoort vóór ${keten[i]} te gaan`,
      );
    }
  });

  test("de back-up en de gezondheidsmeting gaan ná de keten", () => {
    const laatsteKetenstap = prioriteit("voorstel");
    assert.ok(prioriteit("backup") > laatsteKetenstap, "een back-up vóór de keten mist de dag");
    assert.ok(
      prioriteit("gezondheid") > prioriteit("backup"),
      "de gezondheidsmeting leest de leeftijd van de back-up en hoort dus erna",
    );
  });

  test("de dagelijkse taken zijn precies de back-up en de meting", () => {
    /* Uurlijks is de norm; dagelijks moet je verantwoorden. De back-up
       omdat een uurlijkse dump van een database die per uur een handvol
       rijen bijschrijft verspilling is, en de meting omdat die cijfers
       niet per uur bewegen en één regel per dag terug te vinden is. */
    const dagelijks = PLAN.filter((p) => p.dagelijks).map((p) => p.soort).sort();
    /* `meldsamenvatting` is er in 3.0.9 bij gekomen, en dagelijks is
       voor die taak de hele reden van bestaan: niveau NIET GEMETEN
       betekent "iets is niet gemeten", en dat elk uur als alarm
       versturen maakt van een alerteerder een ruisbron. Zie de
       toelichting bij de planregel. */
    assert.deepEqual(dagelijks, ["backup", "meldsamenvatting", "meting"]);
  });
});
