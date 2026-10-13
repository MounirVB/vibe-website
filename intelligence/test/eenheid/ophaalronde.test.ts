/* ============================================================
   TEST — een ophaalronde mag niet liegen over haar uitkomst
   ------------------------------------------------------------
   Gemeten defect (13 oktober 2026): de worker meldde `ophalen GEREED`
   met alleen het aantal bronnen en nieuwe documenten. `bronnenFout`
   werd berekend en genegeerd. Bij 29 bronnen op HTTP 500 stond de taak
   op gereed, bleef de dlq leeg, en was een totale ingestiestoring
   operationeel onzichtbaar.

   Deze toetsen leggen de beslisregel vast — inclusief de twee gevallen
   die NIET als storing mogen gelden, want een te brede regel maakt van
   een rustige nacht een incident.
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import { beoordeelOphaalronde, type VerzamelRapport } from "../../src/pijplijn/verzamelen.ts";

function rapport(p: Partial<VerzamelRapport>): VerzamelRapport {
  return {
    bronnenGeprobeerd: 0,
    bronnenOk: 0,
    bronnenOvergeslagen: 0,
    bronnenFout: 0,
    nieuweDocumenten: 0,
    nieuweVersies: 0,
    materieleWijzigingen: 0,
    injectieVerdacht: 0,
    perBron: [],
    ...p,
  };
}

describe("beoordeelOphaalronde", () => {
  test("ALLE bronnen falen: niet geslaagd", () => {
    const u = beoordeelOphaalronde(
      rapport({ bronnenGeprobeerd: 29, bronnenOk: 0, bronnenFout: 29 }),
    );
    assert.equal(u.geslaagd, false, "dit is de storing die eerder GEREED meldde");
    assert.match(u.melding, /alle 29 geschikte bron\(nen\) faalden/);
    assert.match(u.melding, /fout 29/);
  });

  test("één bron faalt, de rest werkt: geslaagd, maar de fout staat in de melding", () => {
    const u = beoordeelOphaalronde(
      rapport({ bronnenGeprobeerd: 29, bronnenOk: 28, bronnenFout: 1, nieuweDocumenten: 4 }),
    );
    assert.equal(u.geslaagd, true, "een optionele bron die uitvalt is geen platformstoring");
    assert.match(u.melding, /fout 1/, "gedeeltelijke uitval hoort leesbaar te zijn");
    assert.match(u.melding, /ok 28/);
  });

  test("nul bronnen toe: geslaagd — niets te doen is geen fout", () => {
    const u = beoordeelOphaalronde(rapport({ bronnenGeprobeerd: 0, bronnenOvergeslagen: 29 }));
    assert.equal(u.geslaagd, true);
    assert.match(u.melding, /overgeslagen 29/);
  });

  test("alle bronnen werken maar leveren niets nieuws: geslaagd", () => {
    const u = beoordeelOphaalronde(
      rapport({ bronnenGeprobeerd: 29, bronnenOk: 29, nieuweDocumenten: 0, nieuweVersies: 0 }),
    );
    assert.equal(u.geslaagd, true, "nul nieuwe documenten is een normale uitkomst");
  });

  test("één bron toe en die faalt: niet geslaagd", () => {
    const u = beoordeelOphaalronde(rapport({ bronnenGeprobeerd: 1, bronnenOk: 0, bronnenFout: 1 }));
    assert.equal(u.geslaagd, false);
  });

  test("de melding draagt altijd alle vier de tellingen", () => {
    const u = beoordeelOphaalronde(
      rapport({ bronnenGeprobeerd: 3, bronnenOk: 2, bronnenFout: 1, bronnenOvergeslagen: 26 }),
    );
    for (const stuk of ["bronnen 3", "ok 2", "fout 1", "overgeslagen 26"]) {
      assert.ok(u.melding.includes(stuk), `de melding mist "${stuk}": ${u.melding}`);
    }
  });
});
