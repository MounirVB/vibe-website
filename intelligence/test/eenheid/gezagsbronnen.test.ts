/* ============================================================
   EENHEID — de twee leesrichtingen van EIGEN_GEZAG_NAMEN
   ------------------------------------------------------------
   WAAROM DEZE TOETS BESTAAT.

   Eén kaart, twee vragen, en de antwoorden zijn niet hetzelfde:

     "Vormt deze UITGEVER het genoemde gezag?"   documentsoort.ts
     "Welke BRONNEN vormen gezag X?"             bronverificatie.ts

   De tweede is de omgekeerde van de eerste, maar niet zijn spiegel: een
   bekendmakingenkanaal publiceert besluiten van veel bestuursorganen, en
   een netbeheerder is helemaal geen bevoegd gezag. bouwBronnenVanGezag()
   filtert daarom op gezagVan(uitgeverSoort) === 'BEVOEGD_GEZAG'.

   HET COMMENTAAR LIEP DAAR STIL VAN WEG. bronverificatie.ts beweerde dat
   'tennet-publicaties' als eigen gezag ongemoeid langs het bundelfilter
   gaat. Gemeten met de uitgerolde module op productie geeft
   bronnenVanGezag('TenneT') echter [] — tennet-publicaties heeft
   uitgeverSoort 'netbeheerder', en die mapt op NETBEHEERDER. Negen
   versies met beschrijft_besluit_van 'TenneT' en elf met 'de Europese
   Commissie' zijn daarmee per ONTWERP onverifieerbaar.

   Deze toets legt die gemeten stand vast, MET de reden per lege
   uitkomst. Hij codificeert gedrag dat er al is en verandert niets; wat
   hij voorkomt is dat dezelfde divergentie terugkomt zonder dat iets
   omvalt.
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import { bronnenVanGezag } from "../../src/pijplijn/bronverificatie.ts";
import {
  ANDER_GEZAG_NAMEN,
  EIGEN_GEZAG_NAMEN,
  gezagVan,
} from "../../src/pijplijn/documentsoort.ts";
import { BRONNEN } from "../../src/bronnen/register.ts";

/* DE VERWACHTE STAND, met per regel de reden. Een getal zonder reden is
   in een toets als deze waardeloos: wie hem later ziet omvallen moet
   kunnen zien of de nieuwe uitkomst juist of fout is. */
const VERWACHT: Readonly<Record<string, { readonly bronnen: number; readonly waarom: string }>> = {
  ACM: { bronnen: 1, waarom: "acm-besluiten, uitgeverSoort toezichthouder, bevoegd gezag" },
  "de minister": {
    bronnen: 3,
    waarom:
      "rijksoverheid-nieuws plus de twee KOOP-bronnen; die laatste staan uit maar blijven " +
      "in het register en dus in deze kaart",
  },
  "het kabinet": { bronnen: 2, waarom: "rijksoverheid-nieuws en koop-staatscourant-energie" },
  "de Tweede Kamer": { bronnen: 1, waarom: "alleen rijksoverheid-nieuws" },
  RVO: { bronnen: 2, waarom: "rvo-opendata-artikelen en rvo-subsidie-sitemap" },
  TenneT: {
    bronnen: 0,
    waarom:
      "LEEG EN BEDOELD: tennet-publicaties staat wel in EIGEN_GEZAG_NAMEN, maar zijn " +
      "uitgeverSoort 'netbeheerder' mapt op NETBEHEERDER. Een netbeheerder is geen bevoegd " +
      "gezag, dus bouwBronnenVanGezag() laat hem vallen",
  },
  "de Europese Commissie": {
    bronnen: 0,
    waarom:
      "LEEG EN BEDOELD: de naam staat in ANDER_GEZAG, maar bij geen enkele sleutel in " +
      "EIGEN_GEZAG_NAMEN. Er is geen bron in het register die dit gezag vormt",
  },
};

describe("de twee leesrichtingen van EIGEN_GEZAG_NAMEN", () => {
  test("elke herkenbare gezagsnaam staat in de verwachtingstabel", () => {
    /* DE KOPPELING MET DE CODE. Komt er een gezagsnaam bij, dan valt
       deze assertie om en moet iemand de reden erbij schrijven — in
       plaats van dat de nieuwe naam stil onbemeten blijft. */
    assert.deepEqual(
      [...ANDER_GEZAG_NAMEN].sort(),
      Object.keys(VERWACHT).sort(),
      "ANDER_GEZAG en de verwachtingstabel hieronder moeten dezelfde namen dragen",
    );
  });

  for (const [naam, verwacht] of Object.entries(VERWACHT)) {
    test(`bronnenVanGezag('${naam}') geeft ${verwacht.bronnen} bron(nen)`, () => {
      const gevonden = bronnenVanGezag(naam);
      assert.equal(
        gevonden.length,
        verwacht.bronnen,
        `${naam}: verwacht ${verwacht.bronnen} (${verwacht.waarom}); gevonden ` +
          `[${gevonden.join(", ")}]`,
      );
      /* EN ELKE GEVONDEN BRON IS ECHT BEVOEGD GEZAG. Dit is de tweede
         helft van de eis: niet alleen het AANTAL klopt, ook de aard.
         Zonder deze lus zou een verkeerd ingevulde uitgeverSoort het
         aantal kunnen halen met een bron die geen gezag is. */
      for (const sleutel of gevonden) {
        const bron = BRONNEN.find((b) => b.sleutel === sleutel);
        assert.ok(bron !== undefined, `${sleutel} hoort in het register te staan`);
        assert.equal(
          gezagVan(bron!.uitgeverSoort),
          "BEVOEGD_GEZAG",
          `${sleutel} is als gezag voor '${naam}' aangewezen en moet dus bevoegd gezag zijn`,
        );
      }
    });
  }

  test("een sleutel uit EIGEN_GEZAG_NAMEN die GEEN bevoegd gezag is valt aantoonbaar weg", () => {
    /* DE TEGENPROEF. Zonder deze toets zou 'TenneT geeft 0' ook groen
       blijven als de hele kaart leeg was. Hier wordt gemeten dat de
       sleutel er WEL in staat en dat de FILTER hem verwijdert. */
    const sleutelsZonderGezag = Object.keys(EIGEN_GEZAG_NAMEN).filter((sleutel) => {
      const bron = BRONNEN.find((b) => b.sleutel === sleutel);
      return bron !== undefined && gezagVan(bron.uitgeverSoort) !== "BEVOEGD_GEZAG";
    });
    assert.deepEqual(
      sleutelsZonderGezag,
      ["tennet-publicaties"],
      "tennet-publicaties is de enige sleutel in EIGEN_GEZAG_NAMEN die geen bevoegd gezag is; " +
        "komt er een tweede bij, dan hoort zijn gezagsnaam hierboven op 0 te staan",
    );
    for (const naam of EIGEN_GEZAG_NAMEN["tennet-publicaties"]!) {
      assert.deepEqual(
        bronnenVanGezag(naam),
        [],
        `'${naam}' hangt alleen aan tennet-publicaties en hoort daarom leeg te zijn`,
      );
    }
  });

  test("een onbekende gezagsnaam geeft leeg en gooit niet", () => {
    assert.deepEqual(bronnenVanGezag("het waterschap"), []);
    assert.deepEqual(bronnenVanGezag(""), []);
  });
});
