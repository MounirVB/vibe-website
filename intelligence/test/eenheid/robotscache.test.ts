/* ============================================================
   EENHEID — een haperende robots.txt mag een bron niet permanent slopen
   ------------------------------------------------------------
   WAAROM DIT BESTAND BESTAAT — een gemeten toestand waar niet uit te
   komen was.

   `robotsPerOrigin` in bronnen/robots.ts bewaarde zijn belofte
   ONVOORWAARDELIJK, dus ook een negatieve uitkomst, en
   `vergeetRobotsCache()` had NUL aanroepers in de hele repo. De worker
   is een oneindige lus (cli/worker.ts). Daarmee gold:

     robots.txt geeft één keer 503
       -> uitkomst 'onbekend' -> grond 'onleesbaar' -> NIET ophalen
       -> opeenvolgende_fouten +1 elke ronde
       -> signaal 'bronnen met opeenvolgende fouten' op FOUT
       -> en de origin wordt NOOIT meer gelezen, ook niet als hij
          inmiddels weer 200 geeft

   De foutenteller reset alleen bij een niet-fout resultaat
   (pijplijn/verzamelen.ts), en dat resultaat kon niet meer voorkomen.

   DAT DIT ECHT GEBEURDE, GEMETEN. In de ophaalhistorie van 12 oktober
   2026 faalden tenderned-publicaties en tenderned-laatste-publicatie elf
   rondes achtereen op 'robots.txt geeft HTTP 503 na 3 poging(en)'. En de
   live probe van 14 oktober liet de hapering zelf zien: bij de ene
   lezing gaf /robots.txt 503, bij de andere 200 — terwijl beide
   data-endpoints 200 gaven.

   De reparatie is één aanroep van vergeetRobotsCache() aan het begin van
   verzamel(): de cache geldt één ophaalronde in plaats van de hele
   procesduur. FAALT-DICHT BLIJFT INTACT — elke ronde doet nog een echte
   robots-lezing met drie pogingen, en een onleesbaar beleid blijft
   ophalen blokkeren (RFC 9309).
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { parseerRobots, padToegestaan, vergeetRobotsCache } from "../../src/bronnen/robots.ts";

describe("de robotscache geldt één ronde, niet de hele procesduur", () => {
  it("vergeetRobotsCache() WORDT aangeroepen, en wel in verzamel()", () => {
    /* De kern van het defect was niet de cache maar het ONTBREKEN van
       een aanroep. Een gedragstoets zou dat niet vangen: de functie
       werkte altijd correct, hij werd alleen nooit gebruikt. Daarom een
       grendel op de bron, plus de eis dat hij in de ophaalronde staat en
       niet ergens anders. */
    const verzamelen = readFileSync(new URL("../../src/pijplijn/verzamelen.ts", import.meta.url), "utf8");
    assert.match(
      verzamelen,
      /import \{ vergeetRobotsCache \} from "\.\.\/bronnen\/robots\.ts"/,
      "pijplijn/verzamelen.ts importeert vergeetRobotsCache niet meer",
    );
    assert.match(verzamelen, /vergeetRobotsCache\(\)/, "vergeetRobotsCache() wordt niet aangeroepen");

    /* En hij moet BINNEN verzamel() staan en vóór de kandidatenquery
       daar: één keer per RONDE, niet één keer per proces en niet pas
       nadat de kandidaten al gekozen zijn.

       De eerste versie van deze toets zocht `from intel.bronnen` in het
       hele bestand en vergeleek met de eerste treffer — maar dat is de
       UPDATE verderop in een andere functie, dus de toets faalde terwijl
       de code klopte. Daarom nu begrensd op de body van verzamel(). */
    const iFunctie = verzamelen.indexOf("export async function verzamel(");
    assert.ok(iFunctie > 0, "verzamel() is niet gevonden; is hij herbenoemd?");
    const body = verzamelen.slice(iFunctie);

    const iWis = body.indexOf("vergeetRobotsCache()");
    const iQuery = body.indexOf("from intel.bronnen");
    assert.ok(iWis >= 0, "vergeetRobotsCache() staat niet IN verzamel()");
    assert.ok(iQuery > 0, "de kandidatenquery is niet gevonden in verzamel()");
    assert.ok(
      iWis < iQuery,
      "vergeetRobotsCache() staat NA de kandidatenquery; hij hoort aan het begin van de ronde",
    );
  });

  it("de cache is daadwerkelijk leeg te maken", () => {
    /* Geen netwerk nodig: de functie mag onder geen enkele omstandigheid
       gooien, want hij staat in het hete pad van elke ophaalronde. */
    assert.doesNotThrow(() => vergeetRobotsCache());
    assert.doesNotThrow(() => vergeetRobotsCache());
  });

  it("een LEGE Disallow is expliciete toestemming, geen verbod", () => {
    /* Precies het beleid van rendogroep.nl, en de reden dat die bron
       niet geparkeerd mag worden als 'toegang beperkt':

         User-agent: *
         Disallow:

       Zou dit als verbod gelden, dan zou het platform een uitgever die
       crawlen uitdrukkelijk toestaat als weigeraar vastleggen. */
    const r = parseerRobots("User-agent: *\nDisallow:\n", "vibeenergyintelligence");
    assert.equal(padToegestaan(r, "/feed/"), true);
    assert.equal(padToegestaan(r, "/"), true);
    assert.equal(padToegestaan(r, "/wat-dan-ook"), true);
  });

  it("een ECHT verbod blijft een verbod", () => {
    /* De tegenproef: de toets hierboven mag niet slagen doordat
       padToegestaan alles goedkeurt. */
    const r = parseerRobots("User-agent: *\nDisallow: /feed/\n", "vibeenergyintelligence");
    assert.equal(padToegestaan(r, "/feed/"), false);
    assert.equal(padToegestaan(r, "/iets-anders"), true);
  });

  it("de drie robots-pogingen en de faalt-dicht-regel staan er nog", () => {
    /* De reparatie mocht de blokkade niet versoepelen, alleen de
       GELDIGHEIDSDUUR van het oordeel. Deze grendel bewaakt dat een
       latere 'optimalisatie' niet de pogingen of RFC 9309 wegneemt. */
    const robots = readFileSync(new URL("../../src/bronnen/robots.ts", import.meta.url), "utf8");
    assert.match(robots, /export function vergeetRobotsCache/, "de functie is weg");
    assert.match(
      robots,
      /onleesbaar/,
      "de onleesbaar-uitkomst is weg; zonder die grond zou een haperende robots.txt stil doorgelaten worden",
    );
  });
});
