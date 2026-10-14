/* ============================================================
   TEST — de REDEN die weegAf meegeeft, mag niets beweren dat onwaar is
   ------------------------------------------------------------
   WAAROM DIT BESTAAT.

   `weegAf()` kiest het eindoordeel én schrijft de reden die de reviewer
   in de studio leest. Het eindoordeel was juist; de reden beweerde in
   één tak iets dat niet klopte.

   Op de tak `bedrijfsrelevantie < 25` stond onvoorwaardelijk "de
   controles zijn wel gehaald". Maar op dat punt zijn er VIER van de vijf
   controles getoetst — bronverwijzing, actualiteit, seo en duplicatie —
   en `verwoordbaarheid` nog NIET: die tak komt pas daarna. Een kandidaat
   met verwoordbaarheid FAIL en een lage relevantie kreeg dus UITSTELLEN
   met de mededeling dat alles gehaald was.

   Dat is geen cosmetiek in deze repo. Een reviewer die leest dat de
   controles gehaald zijn, gaat op zoek naar een relevantieprobleem en
   niet naar de uitspraak die niet te verwoorden is.

   Deze toets bewaakt de EIGENSCHAP en niet de letterlijke tekst: de
   reden mag niet beweren dat de controles gehaald zijn zolang er één
   faalt. Dat blijft gelden als iemand de formulering later herschrijft.
   ============================================================ */

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { weegAf } from "../../src/inhoud/voorstel.ts";

type Controle = Parameters<typeof weegAf>[0][number];

const ok = (naam: Controle["naam"]): Controle => ({
  naam,
  oordeel: "PASS",
  reden: `${naam} in orde`,
  bewijs: [],
});

const faalt = (naam: Controle["naam"]): Controle => ({
  naam,
  oordeel: "FAIL",
  reden: `${naam} faalt`,
  bewijs: [],
});

const VIER_OK: Controle[] = [
  ok("bronverwijzing"),
  ok("actualiteit"),
  ok("duplicatie"),
  ok("seo"),
];

test("lage relevantie MET een falende verwoordbaarheid beweert niet dat alles gehaald is", () => {
  const uit = weegAf([...VIER_OK, faalt("verwoordbaarheid")], { risico_klasse: "laag", bedrijfsrelevantie: 10 }, 0);
  assert.equal(uit.eindoordeel, "UITSTELLEN", "het eindoordeel zelf verandert niet");
  assert.doesNotMatch(
    uit.oordeelReden,
    /controles (zijn |)(wel )?gehaald/i,
    `de reden beweert dat de controles gehaald zijn terwijl verwoordbaarheid faalt: "${uit.oordeelReden}"`,
  );
  assert.match(
    uit.oordeelReden,
    /verwoordbaarheid/i,
    `de reden noemt de falende controle niet: "${uit.oordeelReden}"`,
  );
});

test("lage relevantie met VIJF gehaalde controles mag dat wel zeggen", () => {
  /* De tegenproef. Zonder deze toets zou "noem nooit dat de controles
     gehaald zijn" ook groen zijn, en dan was de reparatie een verarming
     in plaats van een correctie. */
  const uit = weegAf([...VIER_OK, ok("verwoordbaarheid")], { risico_klasse: "laag", bedrijfsrelevantie: 10 }, 0);
  assert.equal(uit.eindoordeel, "UITSTELLEN");
  assert.match(uit.oordeelReden, /gehaald/i, `de reden hoort hier wel te melden dat alles gehaald is: "${uit.oordeelReden}"`);
  assert.doesNotMatch(uit.oordeelReden, /faalt nog/i);
});

test("de bedrijfsrelevantie staat altijd in de reden", () => {
  const uit = weegAf([...VIER_OK, ok("verwoordbaarheid")], { risico_klasse: "laag", bedrijfsrelevantie: 7 }, 0);
  assert.match(uit.oordeelReden, /\b7\b/, `het gemeten getal hoort in de reden: "${uit.oordeelReden}"`);
});

test("de orde van de poorten blijft: bronverwijzing vóór seo vóór relevantie", () => {
  /* Een grendel op de PRIORITEIT, want de reparatie hierboven zit in
     dezelfde functie en mag die orde niet verschuiven. */
  const bronFaalt = weegAf(
    [faalt("bronverwijzing"), faalt("seo"), ok("actualiteit"), ok("duplicatie"), ok("verwoordbaarheid")],
    { risico_klasse: "laag", bedrijfsrelevantie: 10 },
    0,
  );
  assert.equal(bronFaalt.eindoordeel, "AFWIJZEN", "bronverwijzing gaat vóór seo");
  assert.match(bronFaalt.oordeelReden, /bronverwijzing/);

  const seoFaalt = weegAf(
    [ok("bronverwijzing"), ok("actualiteit"), ok("duplicatie"), faalt("seo"), ok("verwoordbaarheid")],
    { risico_klasse: "laag", bedrijfsrelevantie: 10 },
    0,
  );
  assert.equal(seoFaalt.eindoordeel, "HERROUTEREN", "seo zonder paginavoorstel blijft HERROUTEREN");
});
