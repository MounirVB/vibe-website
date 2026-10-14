/* ============================================================
   EENHEID — onveranderbaar restorebewijs en de wekelijkse cadans
   ------------------------------------------------------------
   WAAROM DIT BESTAND BESTAAT — een gemeten defect dat precies één keer
   werkte en daarna onzichtbaar stilstond.

   Op 14 oktober 2026, 03:26 UTC, tijdens de eerste productie-restoretest
   met registratie, werd de upload van het bewijs GEWEIGERD:

     HTTP 403 — intel-backup-schrijver@...iam.gserviceaccount.com does
     not have storage.objects.delete access to the Google Cloud Storage
     object

   Overschrijven is in GCS intern delete + create. Google bevestigde de
   rechten zelf via testIamPermissions — toegekend zijn:

     storage.objects.create     JA
     storage.objects.get        JA
     storage.objects.list       JA
     storage.objects.delete     NEE
     storage.buckets.get        NEE  (403 op de bucketconfiguratie)

   Gevolg: `restoretest/laatste.json` is sinds 13 oktober 13:28 UTC
   bevroren op 483 bytes. Het pad werkte één keer. De code printte een
   waarschuwing en ging door, dus het LEEK te werken.

   WAT DEZE TOETSEN BEWAKEN

   Dat bewijs per run een eigen, onveranderbaar object krijgt; dat de
   lezer de NIEUWSTE uitkomst kiest en nooit de beste; dat een
   onbereikbare of weigerende opslag niet als mislukte restore leest; en
   dat 'zondag 03:00 UTC' werkelijk zondag 03:00 UTC is.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  bewijsObjectnaam,
  inventariseerBucketBewijs,
  RESTOREBEWIJS_VOORVOEGSEL,
  restoreAanvaardbaar,
  RESTORETESTRONDE_TAAK_SOORT,
  RESTORETEST_TAAK_SOORT,
  WEGWERP_DB_PATROON,
  type Bewijsbron,
} from "../../src/ops/restorebewijs.ts";
import { NIET_HARTSLAGWAARDIGE_SOORTEN, PLAN, wekelijksVenster } from "../../src/kern/taken.ts";
import type { GcsConfig, GcsObject } from "../../src/ops/gcsopslag.ts";

const GCS: GcsConfig = { bucket: "vibe-energy-intel-backups" } as GcsConfig;

/** Bouwt een nagebootste bucket: objectlijst plus inhoud per naam. */
function nepBucket(inhoud: Record<string, { gemaaktOp: string; json: unknown | string }>) {
  const objecten: GcsObject[] = Object.entries(inhoud).map(([naam, v]) => ({
    naam,
    bytes: 100,
    gemaaktOp: v.gemaaktOp,
  }));
  return {
    lijst: async () => objecten,
    haal: async (_g: GcsConfig, naam: string) => {
      const v = inhoud[naam];
      if (!v) throw new Error(`GCS-download mislukte (HTTP 404)`);
      return Buffer.from(typeof v.json === "string" ? v.json : JSON.stringify(v.json), "utf8");
    },
  };
}

const PASS_BEWIJS = (op: string) => ({
  op,
  uitslag: "PASS",
  toetsen_geslaagd: 10,
  toetsen_vereist: 10,
  toetsen_mislukt: [],
  restore_ms: 2979,
  dump_object: "vibe-intel-2026-10-14T00-00-25.dump",
  dump_sha256: "a".repeat(64),
});
const FAIL_BEWIJS = (op: string) => ({
  ...PASS_BEWIJS(op),
  uitslag: "FAIL",
  toetsen_geslaagd: 3,
  toetsen_mislukt: ["pg_restore mislukte"],
});

describe("1+2. de objectnaam per run is uniek en onveranderbaar", () => {
  it("elke run krijgt een EIGEN naam, met de tijd vooraan", () => {
    const naam = bewijsObjectnaam({
      op: "2026-10-14T03:26:00.287Z",
      uitslag: "PASS",
      dump_object: "vibe-intel-2026-10-14T00-00-25.dump",
    });
    assert.ok(naam.startsWith(`${RESTOREBEWIJS_VOORVOEGSEL}2026-10-14T03-26-00Z-`), naam);
    assert.ok(naam.endsWith(".json"), naam);
    assert.doesNotMatch(naam, /:/, "een dubbelepunt in een objectnaam moet in elke URL ge-escaped worden");
    assert.notEqual(naam, "restoretest/laatste.json", "het oude, bevroren pad mag niet terugkomen");
  });

  it("een HERHAALDE poging van dezelfde run levert DEZELFDE naam", () => {
    /* Samen met ifGenerationMatch=0 geeft dat HTTP 412 — "al
       vastgelegd" — in plaats van een tweede object of een 403 die niet
       van een rechtenprobleem te onderscheiden is. */
    const b = {
      op: "2026-10-14T03:26:00.287Z",
      uitslag: "PASS" as const,
      dump_object: "d.dump",
    };
    assert.equal(bewijsObjectnaam(b), bewijsObjectnaam({ ...b }));
  });

  it("een andere UITSLAG of DUMP geeft een andere naam", () => {
    const b = { op: "2026-10-14T03:26:00.287Z", uitslag: "PASS" as const, dump_object: "d.dump" };
    assert.notEqual(bewijsObjectnaam(b), bewijsObjectnaam({ ...b, uitslag: "FAIL" }));
    assert.notEqual(bewijsObjectnaam(b), bewijsObjectnaam({ ...b, dump_object: "e.dump" }));
  });

  it("twee runs in dezelfde SECONDE botsen niet als ze iets anders bewijzen", () => {
    const a = bewijsObjectnaam({ op: "2026-10-14T03:26:00.100Z", uitslag: "PASS", dump_object: "a.dump" });
    const b = bewijsObjectnaam({ op: "2026-10-14T03:26:00.900Z", uitslag: "PASS", dump_object: "b.dump" });
    assert.notEqual(a, b, "dezelfde seconde, andere dump: dat moeten twee objecten zijn");
  });
});

describe("3. ontbrekende objecten", () => {
  it("een LEGE map levert geen bewijs — en dat is geen FAIL", async () => {
    const nep = nepBucket({});
    const inv = await inventariseerBucketBewijs(GCS, nep);
    assert.equal(inv.nieuwste, null);
    assert.equal(inv.gevonden, 0);
    assert.deepEqual([...inv.bedorven], [], "een lege map is geen leesprobleem");
    assert.equal(inv.nietOpgesomd, null);
    assert.equal(inv.afgekapt, 0);

    /* En het oordeel mag daar geen mislukte restore van maken. */
    const stil: Bewijsbron = { uitslag: null, volledig: false, dagen: null, bron: "bucket" };
    const r = restoreAanvaardbaar({
      takenlogboek: { uitslag: "PASS", volledig: true, dagen: 1, bron: "intel.taken" },
      bucket: stil,
      drempelDagen: 30,
    });
    assert.equal(r.niveau, "OK", "een leeg bewijsarchief mag een geldige taakrij niet omlaag halen");
  });

  it("een object dat in de lijst staat maar niet op te halen is, wordt GEMELD", async () => {
    /* Precies het 404/403-geval op één object: de lijst noemt hem, de
       download weigert. Dat is geen afwezigheid maar een leesprobleem. */
    const nep = {
      lijst: async () => [{ naam: "restoretest/2026-10-14T03-00-00Z-aaaa.json", bytes: 1, gemaaktOp: "2026-10-14T03:00:00Z" }],
      haal: async () => {
        throw new Error("GCS-download mislukte (HTTP 403): does not have storage.objects.get access");
      },
    };
    const inv = await inventariseerBucketBewijs(GCS, nep);
    assert.equal(inv.nieuwste, null);
    assert.equal(inv.gevonden, 1);
    assert.equal(inv.bedorven.length, 1, "een onophaalbaar object dat WEL bestaat, is bedorven");
    assert.match(inv.bedorven[0] ?? "", /niet op te halen/);
    assert.match(inv.bedorven[0] ?? "", /403/);
    assert.equal(inv.nietOpgesomd, null, "de bucket was wel op te sommen");
  });

  it("BEDORVEN JSON is geen bewijs, en wordt gemeld", async () => {
    const nep = nepBucket({
      "restoretest/2026-10-14T03-00-00Z-aaaa.json": { gemaaktOp: "2026-10-14T03:00:00Z", json: "{dit is geen json" },
    });
    const inv = await inventariseerBucketBewijs(GCS, nep);
    assert.equal(inv.nieuwste, null);
    assert.match(inv.bedorven.join(" "), /geen geldige JSON/);
  });
});

describe("4. een oudere PASS mag een nieuwere FAIL nooit maskeren", () => {
  it("de NIEUWSTE wint, ook als dat slecht nieuws is", async () => {
    const nep = nepBucket({
      "restoretest/2026-10-07T03-00-00Z-oud1.json": {
        gemaaktOp: "2026-10-07T03:00:00Z",
        json: PASS_BEWIJS("2026-10-07T03:00:00.000Z"),
      },
      "restoretest/2026-10-14T03-00-00Z-nieuw.json": {
        gemaaktOp: "2026-10-14T03:00:00Z",
        json: FAIL_BEWIJS("2026-10-14T03:00:00.000Z"),
      },
    });
    const inv = await inventariseerBucketBewijs(GCS, nep);
    assert.equal(inv.nieuwste?.bewijs.uitslag, "FAIL", "de verse mislukking hoort te winnen");
    assert.equal(inv.nieuwste?.op, "2026-10-14T03:00:00.000Z");
  });

  it("en omgekeerd: een nieuwere PASS verdringt een oudere FAIL", async () => {
    /* De tegenproef. Zonder deze zou de toets hierboven ook slagen als
       de lezer altijd FAIL koos. */
    const nep = nepBucket({
      "restoretest/2026-10-07T03-00-00Z-oud1.json": {
        gemaaktOp: "2026-10-07T03:00:00Z",
        json: FAIL_BEWIJS("2026-10-07T03:00:00.000Z"),
      },
      "restoretest/2026-10-14T03-00-00Z-nieuw.json": {
        gemaaktOp: "2026-10-14T03:00:00Z",
        json: PASS_BEWIJS("2026-10-14T03:00:00.000Z"),
      },
    });
    const inv = await inventariseerBucketBewijs(GCS, nep);
    assert.equal(inv.nieuwste?.bewijs.uitslag, "PASS");
  });

  it("het BEVROREN laatste.json mag niet winnen op zijn NAAM", async () => {
    /* Lexicografisch komt 'laatste.json' ná elke '2026-...', dus een
       lezer die op naam sorteert zou altijd het oude object kiezen —
       precies het object dat niet meer bijgewerkt kan worden. Daarom
       sorteert de lezer op TIJD. */
    const nep = nepBucket({
      "restoretest/laatste.json": {
        gemaaktOp: "2026-10-13T13:28:35.048Z",
        json: PASS_BEWIJS("2026-10-13T13:28:00.000Z"),
      },
      "restoretest/2026-10-14T03-00-00Z-nieuw.json": {
        gemaaktOp: "2026-10-14T03:00:00Z",
        json: FAIL_BEWIJS("2026-10-14T03:00:00.000Z"),
      },
    });
    const inv = await inventariseerBucketBewijs(GCS, nep);
    assert.equal(inv.nieuwste?.objectnaam, "restoretest/2026-10-14T03-00-00Z-nieuw.json");
    assert.equal(inv.nieuwste?.bewijs.uitslag, "FAIL");
  });

  it("afgekapte inventarisatie wordt GEMELD, niet verzwegen", async () => {
    const veel: Record<string, { gemaaktOp: string; json: unknown }> = {};
    for (let i = 1; i <= 8; i++) {
      const dag = `2026-10-0${i}`;
      veel[`restoretest/${dag}T03-00-00Z-x${i}.json`] = {
        gemaaktOp: `${dag}T03:00:00Z`,
        json: PASS_BEWIJS(`${dag}T03:00:00.000Z`),
      };
    }
    const inv = await inventariseerBucketBewijs(GCS, { ...nepBucket(veel), maxKandidaten: 3 });
    assert.equal(inv.gevonden, 8);

    /* DE BEGRENZING IS GEEN FOUT. De eerste versie duwde deze melding in
       dezelfde lijst als bedorven objecten, en de lezer maakte van elke
       niet-lege lijst een FOUT in een KRITIEK domein. Er komt elke week
       een bewijsobject bij, dus bij het vierde object zou het
       back-updomein op CRITICAL slaan en daar nooit meer weggaan — want
       er wordt niets verwijderd. */
    assert.equal(inv.afgekapt, 5, "de afkap hoort geteld te worden");
    assert.deepEqual([...inv.bedorven], [], "een begrenzing is geen bedorven object");
    assert.equal(inv.nietOpgesomd, null);
    /* De nieuwste moet er wél bij zijn: de sortering gaat vóór de kap. */
    assert.equal(inv.nieuwste?.op, "2026-10-08T03:00:00.000Z");
  });
});

describe("5. tijdzoneverschillen", () => {
  it("het tijdstip uit het BEWIJS gaat voor de objectdatum", async () => {
    const nep = nepBucket({
      "restoretest/2026-10-14T03-00-00Z-aaaa.json": {
        /* De objectdatum loopt een uur achter op het bewijs: GCS stempelt
           bij het schrijven, de proef draaide daarvoor. */
        gemaaktOp: "2026-10-14T04:00:00Z",
        json: PASS_BEWIJS("2026-10-14T03:00:00.000Z"),
      },
    });
    const inv = await inventariseerBucketBewijs(GCS, nep);
    assert.equal(inv.nieuwste?.op, "2026-10-14T03:00:00.000Z");
    assert.equal(inv.nieuwste?.opUitBewijs, true);
  });

  it("een bewijs ZONDER bruikbaar tijdstip valt terug op de objectdatum, en zegt dat", async () => {
    /* De objectdatum is de betrouwbaarste terugval: die kan een client
       niet zetten. Maar de lezer moet KUNNEN ZIEN welke van de twee
       gebruikt is, anders is 'de proef was 0,2 dagen oud' een bewering
       zonder herkomst. */
    for (const kapot of [undefined, "", "gisteren", "2026-13-45T99:99:99Z"]) {
      const nep = nepBucket({
        "restoretest/x.json": {
          gemaaktOp: "2026-10-14T04:00:00Z",
          json: { ...PASS_BEWIJS("x"), op: kapot },
        },
      });
      const inv = await inventariseerBucketBewijs(GCS, nep);
      assert.equal(inv.nieuwste?.op, "2026-10-14T04:00:00Z", `faalde op op=${String(kapot)}`);
      assert.equal(inv.nieuwste?.opUitBewijs, false);
    }
  });

  it("de objectnaam staat in UTC, ongeacht de tijdzone van de machine", () => {
    /* `bewijsObjectnaam` werkt op de ISO-string, die per definitie UTC
       is. Deze toets grendelt dat niemand hem later op een lokale
       tijdnotatie baseert: dan zouden twee services verschillende namen
       voor dezelfde run maken. */
    const naam = bewijsObjectnaam({
      op: "2026-10-14T03:26:00.287Z",
      uitslag: "PASS",
      dump_object: "d.dump",
    });
    assert.match(naam, /T03-26-00Z-/, `de naam volgt niet de UTC-tijd uit het bewijs: ${naam}`);
  });
});

describe("6. dubbele planning: zondag 03:00 UTC, één keer per week", () => {
  const REGEL = { weekdagUtc: 0, vanafUurUtc: 3 };

  it("op zondag vanaf 03:00 UTC levert hij een venster", () => {
    assert.equal(wekelijksVenster(new Date("2026-10-18T03:00:00Z"), REGEL), "2026-10-18");
    assert.equal(wekelijksVenster(new Date("2026-10-18T23:59:59Z"), REGEL), "2026-10-18");
  });

  it("vóór 03:00 UTC op zondag NIET", () => {
    assert.equal(wekelijksVenster(new Date("2026-10-18T02:59:59Z"), REGEL), null);
    assert.equal(wekelijksVenster(new Date("2026-10-18T00:00:00Z"), REGEL), null);
  });

  it("op geen enkele andere weekdag", () => {
    for (const d of ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"]) {
      assert.equal(wekelijksVenster(new Date(`${d}T03:00:00Z`), REGEL), null, `${d} hoort geen venster te geven`);
    }
  });

  it("ALLE plannerruns van die zondag geven HETZELFDE venster — dus één taak", () => {
    /* Dit is de dubbele-planningbescherming: de idempotentiesleutel
       wordt `restoretestronde:<venster>`, en de unieke index laat er
       precies één van bestaan. Geeft het venster per uur een andere
       waarde, dan zouden er 21 taken per zondag komen. */
    const vensters = new Set<string>();
    for (let uur = 3; uur <= 23; uur++) {
      const v = wekelijksVenster(new Date(`2026-10-18T${String(uur).padStart(2, "0")}:00:00Z`), REGEL);
      assert.ok(v, `uur ${uur} gaf geen venster`);
      vensters.add(v);
    }
    assert.equal(vensters.size, 1, `21 runs leverden ${vensters.size} vensters: ${[...vensters].join(", ")}`);
  });

  it("een gemiste 03:00-run wordt later die zondag alsnog gepland", () => {
    /* Was het UUR de sleutel, dan zou een planner die om 03:00 stillag
       de hele week overslaan. Nu maakt de run van 09:00 dezelfde taak. */
    assert.equal(
      wekelijksVenster(new Date("2026-10-18T09:00:00Z"), REGEL),
      wekelijksVenster(new Date("2026-10-18T03:00:00Z"), REGEL),
    );
  });

  it("twee opeenvolgende zondagen geven VERSCHILLENDE vensters", () => {
    assert.notEqual(
      wekelijksVenster(new Date("2026-10-18T03:00:00Z"), REGEL),
      wekelijksVenster(new Date("2026-10-25T03:00:00Z"), REGEL),
    );
  });

  it("de planregel staat er, met precies deze cadans", () => {
    const p = PLAN.find((x) => x.soort === RESTORETESTRONDE_TAAK_SOORT);
    assert.ok(p, "restoretestronde staat niet in PLAN");
    assert.deepEqual(p.wekelijks, { weekdagUtc: 0, vanafUurUtc: 3 }, "zondag 03:00 UTC is de afspraak");
    assert.equal(p.dagelijks, undefined, "hij mag niet ook dagelijks zijn");
  });

  it("de WEKELIJKSE taken zijn precies de restoretestronde", () => {
    /* Zusje van 'de dagelijkse taken zijn precies de back-up en de
       meting'. Uurlijks is de norm, wekelijks moet je verantwoorden. */
    const wekelijks = PLAN.filter((p) => p.wekelijks).map((p) => p.soort).sort();
    assert.deepEqual(wekelijks, [RESTORETESTRONDE_TAAK_SOORT]);
  });
});

describe("7+8. storage-403 en netwerkstoringen stemmen niet tegen", () => {
  it("een ONBEREIKBARE bucket levert geen bewijs én geen mislukking", async () => {
    const nep = {
      lijst: async () => {
        throw new Error("fetch failed: getaddrinfo ENOTFOUND storage.googleapis.com");
      },
      haal: async () => Buffer.from("{}"),
    };
    const inv = await inventariseerBucketBewijs(GCS, nep);
    assert.equal(inv.nieuwste, null);
    assert.equal(inv.gevonden, 0);

    /* EN DIT IS GEEN BEDORVEN BEWIJS. Een onbereikbare bucket zegt
       NIETS; hij stemt niet tegen. De eerste versie zette dit in
       dezelfde lijst als een bedorven object, waardoor een GCS-hik van
       dertig seconden het back-updomein op CRITICAL zette — precies de
       meetplaats-bevinding waar deze release over gaat. */
    assert.deepEqual([...inv.bedorven], [], "een netwerkstoring is geen bedorven object");
    assert.match(inv.nietOpgesomd ?? "", /niet worden opgesomd/);

    /* En de kern: het oordeel mag dit niet als FAIL tellen. */
    const r = restoreAanvaardbaar({
      takenlogboek: { uitslag: "PASS", volledig: true, dagen: 0.5, bron: "intel.taken" },
      bucket: { uitslag: null, volledig: false, dagen: null, bron: "bucket" },
      drempelDagen: 30,
    });
    assert.equal(r.niveau, "OK", "een netwerkstoring in de opslag is geen mislukte restore");
    assert.deepEqual([...r.bronnen], ["intel.taken"]);
  });

  it("een 403 op de LIJST is hetzelfde geval als een netwerkstoring", async () => {
    const nep = {
      lijst: async () => {
        throw new Error("GCS-lijst mislukte (HTTP 403): does not have storage.objects.list access");
      },
      haal: async () => Buffer.from("{}"),
    };
    const inv = await inventariseerBucketBewijs(GCS, nep);
    assert.equal(inv.nieuwste, null);
    assert.match(inv.nietOpgesomd ?? "", /403/);
    assert.deepEqual([...inv.bedorven], [], "een 403 op de LIJST is geen bedorven object");
  });

  it("de drie uitkomsten krijgen DRIE verschillende ernsten in de meting", () => {
    /* Structurele grendel op de reparatie van twee regressies die ik
       zelf had ingebouwd: `nietOpgesomd` en `afgekapt` mochten nooit
       FOUT worden, en alleen `bedorven` wel. Een gedragstoets op
       inventariseerBucketBewijs kan dat niet vangen — het gaat om wat
       de LEZER ermee doet. */
    const G = readFileSync(new URL("../../src/ops/gezondheid.ts", import.meta.url), "utf8");
    assert.match(
      G,
      /if \(bucketInventaris\.bedorven\.length > 0\)/,
      "het FOUT-signaal hangt niet (meer) uitsluitend aan bedorven objecten",
    );
    assert.doesNotMatch(
      G,
      /bucketInventaris\.nietOpgesomd[\s\S]{0,200}niveau: "FOUT"/,
      "een onbereikbare bucket wordt weer als FOUT gemeld",
    );
    assert.doesNotMatch(
      G,
      /bucketInventaris\.afgekapt[\s\S]{0,200}niveau: "FOUT"/,
      "een afgekapte inventarisatie wordt weer als FOUT gemeld",
    );
    /* En ze moeten WEL zichtbaar zijn, in de meettekst. */
    assert.match(G, /bucketNoten/, "de twee niet-foutieve uitkomsten worden nergens gemeld");
  });

  it("de upload vraagt ifGenerationMatch=0, zodat 412 en 403 te scheiden zijn", () => {
    /* Structurele grendel. De waarde van de preconditie is dat
       "bestaat al" (412) iets ANDERS is dan "geen recht" (403), en dat
       onderscheid was er niet: tot 3.0.8 gaf een overschrijving 403 met
       "does not have storage.objects.delete access", en dat las als een
       rechtenprobleem.

       Een gedragstoets kan dit niet vangen zonder een echte bucket. */
    const G = readFileSync(new URL("../../src/ops/gcsopslag.ts", import.meta.url), "utf8");
    assert.match(G, /ifGenerationMatch=0/, "de preconditie is weg; overschrijven zou weer kunnen");
    assert.match(G, /antwoord\.status === 412/, "412 wordt niet apart behandeld");
    assert.match(
      G,
      /bestaat al MET ANDERE INHOUD/,
      "een 412 met andere bytes hoort een conflict te zijn, niet stil geaccepteerd",
    );

    const CLI = readFileSync(new URL("../../src/cli/restoretest.ts", import.meta.url), "utf8");
    assert.match(CLI, /alleenAlsNieuw: true/, "de CLI schrijft zonder preconditie");
    assert.doesNotMatch(
      CLI,
      /uploadNaarGcs\(\s*gcsMerk,\s*RESTORETEST_MERK_OBJECT/,
      "de CLI schrijft weer naar het vaste, bevroren pad",
    );
  });
});

/**
 * Haalt commentaar weg, zodat een grendel de CODE toetst en niet het
 * proza eromheen.
 *
 * Zelfde functie en zelfde reden als in test/eenheid/restorebewijs.test.ts:
 * de eerste versie van de grendel hieronder sloeg aan op mijn eigen
 * uitleg ("hier stond een eigen pg_try_advisory_lock"). Het verbod uit
 * de toelichting schrappen zou de documentatie slechter maken en de
 * grendel niet beter. Een scherpstelling, geen versoepeling.
 */
function alleenCode(bron: string): string {
  return bron
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((r) => !/^\s*(\/\/|\*)/.test(r))
    .join("\n");
}

describe("9. opruiming na fouten", () => {
  it("de naamvorm kan geen echte database treffen", () => {
    /* DIT IS DE HELE VEILIGHEID van de opruiming. Er wordt uitsluitend
       gedropt wat op deze vorm matcht; alleen cli/restoretest.ts maakt
       zulke namen. */
    for (const echt of [
      "railway",
      "postgres",
      "template0",
      "template1",
      "vibe_intel_dev",
      "vibe_intel_t_restorebewijs_123_1",
      "restoretest",
      "restoretest_",
      "restoretest_abc_1",
      "restoretest_1",
      "restoretest_1_2_3",
      "xrestoretest_1_2",
      "restoretest_1_2x",
    ]) {
      assert.equal(WEGWERP_DB_PATROON.test(echt), false, `${echt} mag NOOIT gedropt worden`);
    }
    for (const wegwerp of ["restoretest_156_27958", "restoretest_1_1", "restoretest_99999_0"]) {
      assert.equal(WEGWERP_DB_PATROON.test(wegwerp), true, `${wegwerp} is wel een wegwerpnaam`);
    }
  });

  it("de CLI ruimt op VOORDAT hij iets doet, en met het slot in de hand", () => {
    const CLI = readFileSync(new URL("../../src/cli/restoretest.ts", import.meta.url), "utf8");
    const iSlot = CLI.indexOf("pg_try_advisory_lock");
    /* De AANROEP, niet de import. Deze assertie is twee keer verkeerd
       geweest en dat is leerzaam:

         1 eerst zocht hij `ruimWegwerpdatabasesOp` en vond de
           IMPORTREGEL bovenaan — dus 'opruiming vóór slot', terwijl de
           code juist stond;
         2 toen zocht hij `ruimWegwerpdatabasesOp(slotClient`, en viel om
           zodra de opruiming (terecht) naar de beheerverbinding
           verhuisde omdat de applicatierol geen database mag droppen.

       Een grendel moet de EIGENSCHAP vastleggen, niet de variabelenaam.
       `await <naam>(` is de aanroep, welk argument er ook in gaat. */
    const iRuim = CLI.indexOf("await ruimWegwerpdatabasesOp(");
    assert.ok(iSlot > 0, "het slot is weg");
    assert.ok(iRuim > 0, "de aanroep van de opruiming is weg");
    assert.ok(iSlot < iRuim, "er wordt opgeruimd VOORDAT het slot genomen is; dan kan een lopende proef geraakt worden");

    /* En het slot moet weer los, anders draait er na één run nooit meer
       een restoretest op die verbinding. */
    assert.match(CLI, /geefRestoretestSlotTerug/, "het slot wordt nooit vrijgegeven");

    /* ÉÉN IMPLEMENTATIE VAN HET SLOT. De CLI had zijn eigen inline
       `pg_try_advisory_lock` met de sleutel erbij, naast de functie in
       ops/restorebewijs.ts. Twee implementaties van één regel, met één
       getal dat op twee plekken goed moet staan. */
    assert.doesNotMatch(alleenCode(CLI), /pg_try_advisory_lock/, "de CLI bouwt het slot weer zelf");
    assert.match(CLI, /neemRestoretestSlot/, "de CLI gebruikt de gedeelde slotfunctie niet");

    /* EN sluitAllePools() MAG NIET IN legBewijsVast STAAN. Die functie
       sluit ALLE gememoïseerde pools, inclusief de pool die het slot
       vasthoudt — waardoor het vrijgeven hierboven op een gesloten pool
       landt en stil in een catch verdwijnt. */
    const iLeg = CLI.indexOf("async function legBewijsVast");
    const iEindLeg = CLI.indexOf("\n}", iLeg);
    assert.ok(iLeg > 0 && iEindLeg > iLeg, "legBewijsVast is niet gevonden");
    assert.doesNotMatch(
      alleenCode(CLI.slice(iLeg, iEindLeg)),
      /sluitAllePools/,
      "legBewijsVast sluit de pool die het slot vasthoudt",
    );
  });

  it("de eigen wegwerpdatabase wordt ook bij een FOUT gedropt", () => {
    const CLI = readFileSync(new URL("../../src/cli/restoretest.ts", import.meta.url), "utf8");
    const iFinally = CLI.indexOf("} finally {");
    assert.ok(iFinally > 0, "de finally is weg");
    const finallyBlok = CLI.slice(iFinally);
    assert.match(finallyBlok, /drop database if exists \$\{WEGWERP_DB\}/, "de drop staat niet meer in de finally");
  });

  it("pg_restore weigert elk doel dat niet de verse wegwerpdatabase is", () => {
    /* De enige onherstelbare fout van dit bestand is pg_restore in de
       productiedatabase. `grendel()` toetst de VORM van de naam voordat
       die database bestaat; deze toets eist de controle op het
       WERKELIJKE doel, vlak voor de restore. */
    const CLI = readFileSync(new URL("../../src/cli/restoretest.ts", import.meta.url), "utf8");
    const iGrendel = CLI.indexOf("doelPad !== `/${WEGWERP_DB}`");
    const iRestore = CLI.indexOf("pgRestoreNaarDatabase(");
    assert.ok(iGrendel > 0, "de doelcontrole vlak voor pg_restore is weg");
    assert.ok(iRestore > 0, "pg_restore is niet gevonden");
    assert.ok(iGrendel < iRestore, "de doelcontrole staat NA de restore; dan beschermt hij niets");
  });
});

describe("de hartslag mag niet door zeldzame taken worden gesimuleerd", () => {
  it("de wekelijkse ronde telt niet mee voor worker/hartslag", () => {
    assert.ok(
      NIET_HARTSLAGWAARDIGE_SOORTEN.includes(RESTORETESTRONDE_TAAK_SOORT),
      "een taak die één keer per week afrondt zou de hartslag 26 uur lang OK laten melden",
    );
    assert.ok(NIET_HARTSLAGWAARDIGE_SOORTEN.includes(RESTORETEST_TAAK_SOORT));
  });

  it("de hartslagquery sluit die soorten ook werkelijk uit", () => {
    const G = readFileSync(new URL("../../src/ops/gezondheid.ts", import.meta.url), "utf8");
    assert.match(
      G,
      /max\(gereed_op\) filter \(where not \(soort = any\(\$2\)\)\)/,
      "de hartslag meet weer max(gereed_op) over ALLE soorten",
    );
    assert.match(G, /NIET_HARTSLAGWAARDIGE_SOORTEN/, "de lijst wordt niet meegegeven");
    /* De tellingen van wachtend/bezig/dlq moeten WEL over alles gaan:
       een restoretestronde in de dlq hoort gezien te worden. */
    assert.match(G, /count\(\*\) filter \(where status = 'dlq'\)/);
  });

  it("de twee soorten zijn verschillend, zodat een wachtende taak geen FAIL leest", () => {
    assert.notEqual(RESTORETEST_TAAK_SOORT, RESTORETESTRONDE_TAAK_SOORT);
    const M = readFileSync(new URL("../../src/ops/restorebewijs.ts", import.meta.url), "utf8");
    /* De leesquery moet op de BEWIJSsoort filteren en niet op de
       rondesoort; anders leest de wachtende zondagstaak als de laatste
       poging, en 'wachtend' is geen 'gereed', dus FAIL. */
    const iLees = M.indexOf("export async function leesRestorebewijsUitTaken");
    assert.ok(iLees > 0);
    const body = M.slice(iLees, iLees + 1800);
    assert.match(body, /RESTORETEST_TAAK_SOORT/);
    assert.doesNotMatch(body, /RESTORETESTRONDE_TAAK_SOORT/);
  });
});
