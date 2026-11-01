/* ============================================================
   EENHEID — welke besluiten kunnen een concept worden
   ------------------------------------------------------------
   HET GEMETEN GAT. De nieuwsselectie schrijft een kandidaat met besluit
   NEWS_ITEM. `soortVanBesluit()` in inhoud/concept.ts beeldt die soort
   af op 'nieuw_artikel' en ondersteunt hem dus volledig. Maar de
   selectiequery in cli/concept.ts had een HANDGESCHREVEN lijst waarin
   NEWS_ITEM ontbrak, en de geplande taak `voorstel` selecteert alleen
   UPDATE_EXISTING MET een doel_pagina_id — die een NEWS_ITEM niet heeft.
   Het dashboard importeert maakConcept niet.

   Gevolg, gemeten in productie op 1 november 2026: kandidaat 199
   (NEWS_ITEM, totaalscore 70, status open sinds 29 oktober) tegenover 0
   rijen in intel.inhoud_versies. De enige geschikte kandidaat die de
   motor ooit heeft opgeleverd kon langs GEEN ENKELE route een concept
   worden.

   Deze toets houdt de twee leesrichtingen tegen elkaar: wat
   CONCEPTEERBARE_BESLUITEN zegt, en wat soortVanBesluit() werkelijk
   afbeeldt. Dat laatste is een private functie, dus hij wordt gemeten
   via de bron met de commentaren eruit — een patroon over ruwe bron zou
   ook treffen op een case die alleen in een toelichting staat.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

import { CONCEPTEERBARE_BESLUITEN } from "../../src/inhoud/concept.ts";

const HIER = dirname(fileURLToPath(import.meta.url));
const WORTEL = resolve(HIER, "..", "..");

/** De bron zonder commentaar, zodat een patroon alleen CODE ziet. */
function zonderCommentaar(pad: string): string {
  return readFileSync(resolve(WORTEL, pad), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("welke besluiten een concept kunnen worden", () => {
  test("elke case van soortVanBesluit staat in CONCEPTEERBARE_BESLUITEN", () => {
    const bron = zonderCommentaar("src/inhoud/concept.ts");
    const blok = /function soortVanBesluit\([\s\S]*?\n}/.exec(bron);
    assert.ok(blok !== null, "soortVanBesluit() hoort in concept.ts te staan");

    const cases = [...blok[0].matchAll(/case\s+"([A-Z_]+)"/g)].map((m) => m[1]!);
    assert.ok(cases.length >= 5, `verwacht minstens vijf cases, gevonden ${cases.length}`);

    assert.deepEqual(
      [...cases].sort(),
      [...CONCEPTEERBARE_BESLUITEN].sort(),
      "soortVanBesluit() en CONCEPTEERBARE_BESLUITEN moeten dezelfde verzameling dragen; " +
        "loopt dat uiteen, dan kan een kandidaat met een ondersteund besluit alsnog door geen " +
        "enkele route een concept worden",
    );
  });

  test("de CLI selecteert op de constante en niet op een eigen lijst", () => {
    /* DE TEGENPROEF OP DE REPARATIE ZELF. De handgeschreven lijst in de
       CLI was de oorzaak; staat er ooit weer een besluitnaam in die
       query, dan valt deze assertie om. */
    const cli = zonderCommentaar("src/cli/concept.ts");
    assert.match(
      cli,
      /CONCEPTEERBARE_BESLUITEN/,
      "cli/concept.ts hoort de constante te gebruiken",
    );
    const eigenLijst = /besluit\s+in\s*\(\s*'[A-Z_]+'/.exec(cli);
    assert.equal(
      eigenLijst,
      null,
      `cli/concept.ts mag geen eigen besluitenlijst meer dragen; gevonden: ${eigenLijst?.[0]}`,
    );
  });

  test("NEWS_ITEM zit erin — het gemeten gat", () => {
    assert.ok(
      (CONCEPTEERBARE_BESLUITEN as readonly string[]).includes("NEWS_ITEM"),
      "NEWS_ITEM is het besluit van de nieuwsselectie en moet een concept kunnen worden",
    );
  });
});
