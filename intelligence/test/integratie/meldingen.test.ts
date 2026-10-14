/* ============================================================
   TEST — meldingen: deduplicatie, sluiten en bezorgfouten
   ------------------------------------------------------------
   §16 van de opdracht eist zes eigenschappen die geen van alle uit
   "stuur een bericht bij FOUT" volgen. Ze worden hier tegen een echte
   database getoetst, want de deduplicatie zit in een partiële unieke
   index en niet in applicatiecode.

   De zes:
     · een mislukte back-up opent een melding
     · een stilgevallen planner opent een melding
     · een worker-storing opent een melding
     · een databasestoring opent een melding
     · herhaalde meldingen worden GEDEDUPLICEERD
     · een opgeloste storing SLUIT
   plus: een mislukte bezorging wordt vastgelegd en verdwijnt niet.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import { maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie, rijen } from "../../src/kern/db.ts";
import { bezorgMeldingen, meldBestemming, synchroniseerMeldingen } from "../../src/ops/melden.ts";
import type { Signaal } from "../../src/ops/gezondheid.ts";

const sig = (groep: string, naam: string, niveau: Signaal["niveau"], meting = "gemeten"): Signaal => ({
  groep,
  naam,
  niveau,
  meting,
});

describe("meldingen", () => {
  let db: Wegwerpdatabase;
  let organisatieId: number;

  before(async () => {
    db = await maakWegwerpdatabase("meldingen");
    organisatieId = await maakOrganisatie(db, "vibe-energy");
  });

  after(async () => {
    await db?.opruimen();
  });

  const open = () =>
    metOrganisatie(db.pool, { organisatieId }, (c) =>
      rijen<{ sleutel: string; niveau: string; keren_gezien: number; bezorgpogingen: number; laatste_bezorgfout: string | null }>(
        c,
        `select sleutel, niveau, keren_gezien, bezorgpogingen, laatste_bezorgfout
           from intel.meldingen where organisatie_id = $1 and gesloten_op is null order by sleutel`,
        [organisatieId],
      ),
    );

  test("de vier kritieke storingen openen elk een melding", async () => {
    const signalen: Signaal[] = [
      sig("backup", "leeftijd nieuwste back-up", "FOUT", "48 uur oud"),
      sig("planner", "hartslag", "FOUT", "laatste run 5 uur geleden"),
      sig("worker", "hartslag", "FOUT", "nog geen enkele taak afgerond"),
      sig("database", "bereikbaarheid", "FOUT", "connection refused"),
      sig("beveiliging", "accountblokkades", "OK"),
    ];
    const r = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      synchroniseerMeldingen(c, organisatieId, signalen),
    );
    assert.equal(r.geopend, 4, "vier FOUT-signalen, vier meldingen");
    assert.equal(r.gesloten, 0);
    const o = await open();
    assert.deepEqual(
      o.map((x) => x.sleutel),
      ["backup/leeftijd nieuwste back-up", "database/bereikbaarheid", "planner/hartslag", "worker/hartslag"],
    );
  });

  test("dezelfde storing opnieuw melden DEDUPLICEERT in plaats van te stapelen", async () => {
    const signalen: Signaal[] = [
      sig("backup", "leeftijd nieuwste back-up", "FOUT", "49 uur oud"),
      sig("planner", "hartslag", "FOUT", "laatste run 6 uur geleden"),
      sig("worker", "hartslag", "FOUT", "nog geen enkele taak afgerond"),
      sig("database", "bereikbaarheid", "FOUT", "connection refused"),
    ];
    for (let ronde = 0; ronde < 3; ronde += 1) {
      const r = await metOrganisatie(db.pool, { organisatieId }, (c) =>
        synchroniseerMeldingen(c, organisatieId, signalen),
      );
      assert.equal(r.geopend, 0, `ronde ${ronde}: niets nieuws`);
      assert.equal(r.bijgewerkt, 4, `ronde ${ronde}: vier bijgewerkt`);
    }
    const o = await open();
    assert.equal(o.length, 4, "nog steeds vier meldingen, niet zestien");
    const backup = o.find((x) => x.sleutel === "backup/leeftijd nieuwste back-up");
    assert.equal(backup?.keren_gezien, 4, "een keer geopend plus drie keer gezien");
  });

  test("een NIET GEMETEN signaal is ook meldwaardig, LET OP niet", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      synchroniseerMeldingen(c, organisatieId, [
        sig("koppelingen", "analytics en CRM", "NIET GEMETEN", "5 van 5 niet aangesloten"),
        sig("ingestie", "brongezondheid", "LET OP", "1 bron niet HEALTHY"),
      ]),
    );
    assert.equal(r.geopend, 1, "alleen NIET GEMETEN opent; LET OP is geen piket");
    const o = await open();
    assert.ok(o.some((x) => x.sleutel === "koppelingen/analytics en CRM"));
    assert.ok(!o.some((x) => x.sleutel === "ingestie/brongezondheid"));
  });

  test("een opgeloste storing SLUIT, en de rest blijft open", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      synchroniseerMeldingen(c, organisatieId, [
        sig("database", "bereikbaarheid", "OK", "antwoord in 1 ms"),
        sig("worker", "hartslag", "OK", "laatste taak 0.1 uur geleden"),
      ]),
    );
    assert.equal(r.gesloten, 2);
    const o = await open();
    assert.ok(!o.some((x) => x.sleutel === "database/bereikbaarheid"));
    assert.ok(!o.some((x) => x.sleutel === "worker/hartslag"));
    assert.ok(o.some((x) => x.sleutel === "planner/hartslag"), "de planner is nog niet opgelost");
  });

  test("een storing die terugkomt na sluiten opent een NIEUWE melding", async () => {
    /* Niet de oude heropenen: twee storingen met een herstel ertussen
       zijn twee incidenten, en het verschil is bij nameten relevant. */
    const r = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      synchroniseerMeldingen(c, organisatieId, [sig("database", "bereikbaarheid", "FOUT", "weer weg")]),
    );
    assert.equal(r.geopend, 1);
    const alle = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      rijen<{ n: number }>(
        c,
        "select count(*)::int as n from intel.meldingen where organisatie_id = $1 and sleutel = 'database/bereikbaarheid'",
        [organisatieId],
      ),
    );
    assert.equal(alle[0]?.n, 2, "twee incidenten in de historie");
  });

  test("zonder bestemming wordt er niets bezorgd, en dat is geen fout", async () => {
    delete process.env["INTEL_MELD_WEBHOOK"];
    const b = meldBestemming();
    assert.equal(b.soort, "geen");
    const r = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      bezorgMeldingen(c, organisatieId),
    );
    /* `berichten` is in 3.0.9 toegevoegd: dat is het aantal MAILS, en
       dat verschilt van het aantal meldingen zodra er gebundeld wordt. */
    assert.deepEqual(r, { bezorgd: 0, fouten: 0, berichten: 0 });
  });

  test("http wordt geweigerd als bestemming", () => {
    process.env["INTEL_MELD_WEBHOOK"] = "http://voorbeeld.invalid/hook";
    assert.equal(meldBestemming().soort, "geen", "een melding gaat niet over http");
    delete process.env["INTEL_MELD_WEBHOOK"];
  });

  test("een MISLUKTE bezorging wordt vastgelegd en de melding blijft bestaan", async () => {
    process.env["INTEL_MELD_WEBHOOK"] = "https://voorbeeld.invalid/hook";
    try {
      const r = await metOrganisatie(db.pool, { organisatieId }, (c) =>
        bezorgMeldingen(c, organisatieId, {
          maxPogingen: 5,
          nu: async () => new Response("nee", { status: 503 }),
        }),
      );
      assert.equal(r.bezorgd, 0);
      assert.ok(r.fouten > 0, "er zijn open meldingen, dus er is geprobeerd");
      const o = await open();
      const metFout = o.filter((x) => x.laatste_bezorgfout !== null);
      assert.ok(metFout.length > 0, "de fout hoort vastgelegd te zijn");
      assert.match(metFout[0]!.laatste_bezorgfout!, /HTTP 503/);
      assert.ok(metFout[0]!.bezorgpogingen >= 1);
    } finally {
      delete process.env["INTEL_MELD_WEBHOOK"];
    }
  });

  test("de BACK-OFF houdt een directe tweede poging tegen", async () => {
    /* NIEUW IN 3.0.9, en gevonden doordat de toets hieronder omviel.
       De vorige toets ("een MISLUKTE bezorging...") heeft net een
       poging gedaan en `laatste_poging_op` op nu gezet. De bezorgquery
       laat een melding pas terugkomen als zijn wachttijd om is: 1, 4,
       16, 64 minuten. Een tweede poging in dezelfde seconde hoort dus
       NIETS te doen.

       Tot 3.0.8 bestond die wachttijd niet en werd er elke ronde
       opnieuw geprobeerd — bij een uurlijkse taak was de teller na vijf
       uur leeg en gebeurde er daarna nooit meer iets. */
    process.env["INTEL_MELD_WEBHOOK"] = "https://voorbeeld.invalid/hook";
    try {
      let geprobeerd = 0;
      const r = await metOrganisatie(db.pool, { organisatieId }, (c) =>
        bezorgMeldingen(c, organisatieId, {
          maxPogingen: 9,
          nu: async () => {
            geprobeerd += 1;
            return new Response("ok", { status: 200 });
          },
        }),
      );
      assert.equal(geprobeerd, 0, "er is toch een poging gedaan terwijl de wachttijd niet om was");
      assert.equal(r.berichten, 0);
    } finally {
      delete process.env["INTEL_MELD_WEBHOOK"];
    }
  });

  test("een GESLAAGDE bezorging markeert de melding als bezorgd", async () => {
    process.env["INTEL_MELD_WEBHOOK"] = "https://voorbeeld.invalid/hook";
    try {
      /* De wachttijd laten verstrijken. In productie gebeurt dat door
         te WACHTEN; hier door het tijdstip terug te zetten, want een
         toets die vier minuten slaapt is geen toets. */
      await metOrganisatie(db.pool, { organisatieId }, (c) =>
        c.query("update intel.meldingen set laatste_poging_op = now() - interval '2 hours' where organisatie_id = $1", [
          organisatieId,
        ]),
      );
      const r = await metOrganisatie(db.pool, { organisatieId }, (c) =>
        bezorgMeldingen(c, organisatieId, {
          maxPogingen: 9,
          nu: async () => new Response("ok", { status: 200 }),
        }),
      );
      assert.ok(r.bezorgd > 0);
      const o = await open();
      assert.equal(
        o.filter((x) => x.laatste_bezorgfout !== null).length,
        0,
        "na een geslaagde bezorging is de laatste fout gewist",
      );
    } finally {
      delete process.env["INTEL_MELD_WEBHOOK"];
    }
  });

  test("na maxPogingen wordt er niet meer geprobeerd, maar blijft de melding open", async () => {
    process.env["INTEL_MELD_WEBHOOK"] = "https://voorbeeld.invalid/hook";
    try {
      await metOrganisatie(db.pool, { organisatieId }, (c) =>
        synchroniseerMeldingen(c, organisatieId, [sig("ai", "stroomonderbreker", "FOUT", "open")]),
      );
      for (let i = 0; i < 4; i += 1) {
        await metOrganisatie(db.pool, { organisatieId }, (c) =>
          bezorgMeldingen(c, organisatieId, {
            maxPogingen: 2,
            nu: async () => new Response("nee", { status: 500 }),
          }),
        );
      }
      const o = await open();
      const m = o.find((x) => x.sleutel === "ai/stroomonderbreker");
      assert.ok(m, "de melding staat er nog; een onbezorgde melding verdwijnt niet");
      assert.ok(m.bezorgpogingen <= 2, `pogingen begrensd op 2, kreeg ${m.bezorgpogingen}`);
    } finally {
      delete process.env["INTEL_MELD_WEBHOOK"];
    }
  });
});
