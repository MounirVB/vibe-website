/* ============================================================
   INTEGRATIE — het restorebewijs in intel.taken, tegen een echte database
   ------------------------------------------------------------
   WAAROM DIT BESTAND BESTAAT

   De eenheidstoetsen in test/eenheid/restorebewijs.test.ts bewaken het
   OORDEEL: wanneer mag een back-up 'aantoonbaar herstelbaar' heten.
   Ze kunnen niet bewaken of de registratie zelf werkt, en daar zitten
   de dingen die alleen een database laat zien:

     · gaat een PASS echt op status 'gereed' en een FAIL op 'mislukt'
     · doet de unieke index zijn werk bij een retry
     · blijft een MISLUKTE poging staan nadat een volgende poging slaagt
     · leest leesRestorebewijsUitTaken() de LAATSTE poging, ook als dat
       een mislukking is die ná een PASS komt
     · komt het bewijs — inclusief de verwijzing naar het originele
       GCS-object en de sha256 — ongeschonden uit de payload terug

   EEN BUG DIE HIER UITKWAM EN DIE TYPECHECK NIET ZAG.
   `registreerRestoretest()` gaf eerst `nieuw: r !== undefined` terug.
   `eenRij()` geeft bij nul rijen NULL, dus `null !== undefined` is waar
   en elke dubbele registratie meldde zich als nieuw. Geldig TypeScript,
   onjuist gedrag, en alleen zichtbaar door het twee keer te doen.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie, rijen } from "../../src/kern/db.ts";
import {
  leesRestorebewijsUitTaken,
  metRestoretestSlot,
  registreerRestoretest,
  ruimWegwerpdatabasesOp,
  RESTORETEST_TAAK_SOORT,
  VEREISTE_RESTORETOETSEN,
  type RestoretestBewijs,
} from "../../src/ops/restorebewijs.ts";

const BUCKET_URI = "gs://vibe-energy-intel-backups/restoretest/laatste.json";

/** Bewijs zoals cli/restoretest.ts het samenstelt. */
function bewijs(over: Partial<RestoretestBewijs> = {}): RestoretestBewijs {
  return {
    op: "2026-10-14T06:12:40.000Z",
    uitslag: "PASS",
    toetsen_geslaagd: VEREISTE_RESTORETOETSEN,
    toetsen_vereist: VEREISTE_RESTORETOETSEN,
    toetsen_mislukt: [],
    restore_ms: 639,
    dump_object: "vibe-intel-2026-10-14T00-00-25.dump",
    dump_sha256: "a".repeat(64),
    bronserver: "17.6",
    bewijs_uri: BUCKET_URI,
    doelvorm: "wegwerpdatabase",
    uit_bucket: true,
    ...over,
  };
}

describe("restorebewijs in het takenlogboek", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("restorebewijs");
    org = await maakOrganisatie(db, "restorebewijs");
  });

  after(async () => {
    await db?.opruimen();
  });

  const leg = (b: RestoretestBewijs) =>
    metOrganisatie(db.pool, { organisatieId: org }, (c) => registreerRestoretest(c, org, b));
  const lees = () =>
    metOrganisatie(db.pool, { organisatieId: org }, (c) => leesRestorebewijsUitTaken(c, org));
  const tel = () =>
    metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await rijen<{ n: string }>(
        c,
        `select count(*)::text as n from intel.taken where soort = $1`,
        [RESTORETEST_TAAK_SOORT],
      );
      return Number(r[0]?.n ?? "0");
    });

  test("1. zonder enige registratie leest er GEEN bewijs — en dat is niet 'in orde'", async () => {
    /* De stand op vibe-intel-api vóór deze release, en de stand direct
       na de deploy totdat de eerste registrerende proef heeft gedraaid.
       `null` is het eerlijke antwoord; het signaal maakt daar NIET
       GEMETEN van, nooit OK. */
    assert.equal(await lees(), null);
    assert.equal(await tel(), 0);
  });

  test("2. een VOLLEDIG geslaagde proef gaat op 'gereed', met het bewijs in de payload", async () => {
    const u = await leg(bewijs());
    assert.equal(u.nieuw, true);
    assert.equal(u.status, "gereed");

    const g = await lees();
    assert.ok(g, "er hoort nu bewijs te staan");
    assert.equal(g.status, "gereed");
    assert.equal(g.reden, null, "een geslaagde proef draagt geen foutreden");

    /* Voorwaarde 2 van de opdracht: de verwijzing naar het ORIGINELE
       GCS-bewijs moet bewaard zijn, met tijdstip, uitslag en
       integriteitsgegevens. Alle vier moeten er ongeschonden uit komen. */
    assert.equal(g.bewijs.bewijs_uri, BUCKET_URI, "de verwijzing naar het originele bewijs is weg");
    assert.equal(g.bewijs.dump_sha256, "a".repeat(64), "de integriteitssom is weg");
    assert.equal(g.bewijs.dump_object, "vibe-intel-2026-10-14T00-00-25.dump");
    assert.equal(g.bewijs.uitslag, "PASS");
    assert.equal(g.bewijs.restore_ms, 639);
    assert.equal(g.bewijs.toetsen_vereist, VEREISTE_RESTORETOETSEN);
    assert.equal(g.op, "2026-10-14T06:12:40Z", `het tijdstip van de proef is niet bewaard: ${g.op}`);
  });

  test("3. een RETRY van dezelfde poging maakt GEEN tweede rij", async () => {
    /* "Voorkom dubbele registraties bij retries." De unieke index
       taken_idempotent_uniek doet dit, en `do nothing` maakt er geen
       fout van. De uitkomst moet dat wél eerlijk melden. */
    const voor = await tel();
    const u = await leg(bewijs({ op: "2026-10-14T06:59:59.999Z" }));
    assert.equal(u.nieuw, false, "een retry binnen hetzelfde uur hoort geen nieuwe rij te maken");
    assert.equal(await tel(), voor, "er is toch een rij bijgekomen");
  });

  test("4. een MISLUKTE proef gaat op 'mislukt', met de reden erbij", async () => {
    const u = await leg(
      bewijs({
        op: "2026-10-14T07:00:00.000Z",
        uitslag: "FAIL",
        toetsen_geslaagd: 7,
        toetsen_mislukt: ["de append-only bescherming op het auditspoor werkt na de restore"],
      }),
    );
    assert.equal(u.nieuw, true);
    assert.equal(u.status, "mislukt");

    const g = await lees();
    assert.equal(g?.status, "mislukt");
    assert.match(g?.reden ?? "", /FAIL/);
    assert.match(g?.reden ?? "", /append-only/, "de reden noemt niet WELKE controle faalde");
  });

  test("5. een ONVOLLEDIGE proef die zichzelf PASS noemt, gaat alsnog op 'mislukt'", async () => {
    /* Het gevaarlijkste geval: geen enkele controle faalde, maar er zijn
       er maar zeven van de tien uitgevoerd. `mislukt.length === 0` zou
       dat PASS noemen. Een onvolledige proef is geen bewijs. */
    const u = await leg(
      bewijs({ op: "2026-10-14T08:00:00.000Z", uitslag: "PASS", toetsen_geslaagd: 7, toetsen_mislukt: [] }),
    );
    assert.equal(u.status, "mislukt");
    const g = await lees();
    assert.equal(g?.status, "mislukt");
    assert.match(g?.reden ?? "", /ONVOLLEDIG: 7 van 10/);
  });

  test("6. een latere PASS verdringt de MISLUKKINGEN niet — de geschiedenis blijft", async () => {
    /* "behoud de bestaande auditgeschiedenis". Na deze geslaagde proef
       moeten de twee mislukkingen hierboven er nog staan; anders zou een
       volgende run het spoor van een storing uitwissen. */
    const voor = await tel();
    const u = await leg(bewijs({ op: "2026-10-14T09:00:00.000Z" }));
    assert.equal(u.nieuw, true);
    assert.equal(u.status, "gereed");
    assert.equal(await tel(), voor + 1, "er hoort precies één rij bij te komen");

    const alles = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<{ status: string; sleutel: string }>(
        c,
        /* Sorteren op het tijdstip UIT HET BEWIJS, niet op gereed_op:
           die kolom blijft met opzet leeg, anders blaast één
           restoretestrij `worker/hartslag` op. */
        `select status, idempotentie_sleutel as sleutel from intel.taken
          where soort = $1 order by (payload->>'op')::timestamptz`,
        [RESTORETEST_TAAK_SOORT],
      ),
    );
    assert.deepEqual(
      alles.map((r) => r.status),
      ["gereed", "mislukt", "mislukt", "gereed"],
      "de volledige geschiedenis hoort te blijven staan, in volgorde",
    );
    /* En elke rij heeft zijn eigen sleutel; anders had `do nothing` er
       een weggegooid. */
    assert.equal(new Set(alles.map((r) => r.sleutel)).size, alles.length, "sleutels zijn niet uniek");
  });

  test("7. een PASS en een FAIL in HETZELFDE uur zijn twee feiten, geen conflict", async () => {
    /* Hier zit de reden dat de uitslag in de idempotentiesleutel staat.
       Zonder dat zou de FAIL hieronder door `do nothing` verdwijnen
       achter de PASS van hetzelfde uur, en zou het logboek de laatste
       stand verkeerd weergeven. */
    const voor = await tel();
    const f = await leg(
      bewijs({
        op: "2026-10-14T09:30:00.000Z",
        uitslag: "FAIL",
        toetsen_geslaagd: 2,
        toetsen_mislukt: ["pg_restore mislukte"],
      }),
    );
    assert.equal(f.nieuw, true, "de FAIL van hetzelfde uur hoort zijn eigen rij te krijgen");
    assert.equal(await tel(), voor + 1);
  });

  test("8. de leesfunctie geeft de LAATSTE poging, ook als dat de mislukking is", async () => {
    /* DE KERN VAN 'TEGENSTRIJDIGE STATUSINFORMATIE'. Zou deze query op
       status filteren of op de laatste GESLAAGDE sorteren, dan was de
       verse mislukking onvindbaar achter de PASS van een half uur
       eerder — en dat is precies de blinde vlek die een monitor niet
       mag hebben. */
    const g = await lees();
    assert.equal(g?.status, "mislukt", "de verse mislukking hoort de laatste stand te zijn");
    assert.match(g?.reden ?? "", /pg_restore mislukte/);

    /* HET TIJDSTIP MOET IN UTC EN IN ISO-8601 TERUGKOMEN.
       De eerste versie van deze assertie was tijdzoneblind en faalde op
       een sessie met TZ=+04: de JUISTE rij kwam terug, maar als
       `2026-10-14 13:30:00+04`. Daarmee legde hij iets echts bloot —
       `timestamptz::text` rendert in de sessietijdzone, en die waarde
       bepaalt via urenSinds() de leeftijd van het bewijs. Een
       herstelstatus mag niet afhangen van de omgeving waarin je hem
       opvraagt; de query dwingt nu UTC af. */
    assert.equal(g?.op, "2026-10-14T09:30:00Z", `verkeerde rij of verkeerde rendering: ${g?.op}`);
    assert.ok(
      !Number.isNaN(new Date(g?.op ?? "").getTime()),
      "het tijdstip is niet door new Date() te lezen; urenSinds() zou null geven",
    );
  });

  test("9. de rijen zetten GEEN gereed_op, want dat blaast worker/hartslag op", async () => {
    /* `ops/gezondheid.ts` meet de hartslag van de worker als
       `max(gereed_op)` over intel.taken ZONDER soortfilter. Zou een
       restoretestrij daar een tijdstip in zetten, dan zou één proefrun
       vanaf een laptop een STILGEVALLEN worker verbergen — exact de
       klasse fout die deze hele exercitie repareert.

       Deze toets staat hier omdat typecheck hem niet kan zien en de
       eenheidstoetsen geen database hebben. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<{ met_gereed: string; met_duur: string; n: string }>(
        c,
        `select count(*) filter (where gereed_op is not null)::text as met_gereed,
                count(*) filter (where duur_ms is not null)::text   as met_duur,
                count(*)::text                                      as n
           from intel.taken where soort = $1`,
        [RESTORETEST_TAAK_SOORT],
      ),
    );
    assert.ok(Number(r[0]?.n) > 0, "er horen hier rijen te staan, anders toetst dit niets");
    assert.equal(Number(r[0]?.met_gereed), 0, "een restoretestrij vult gereed_op en vervuilt de hartslag");
    assert.equal(Number(r[0]?.met_duur), 0, "een restoretestrij vult duur_ms; dat is een wachtrijduur");

    /* En de hartslagmeting moet er dus ook echt niets van merken. */
    const hart = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<{ laatste: string | null }>(
        c,
        `select max(gereed_op)::text as laatste from intel.taken where organisatie_id = $1`,
        [org],
      ),
    );
    assert.equal(
      hart[0]?.laatste ?? null,
      null,
      "max(gereed_op) over alle taken vindt een restoretest; de hartslag zou OK melden zonder worker",
    );
  });

  test("10. het SLOT laat geen tweede proef naast de eerste draaien", async () => {
    /* Voorwaarde 5: voorkom overlappende runs. De wachtrij voorkomt dat
       twee workers dezelfde RIJ pakken, en de idempotentiesleutel
       voorkomt twee rijen per week. Wat geen van beide voorkomt: een
       lease die na 300 seconden verloopt terwijl de restore nog loopt.
       Dan geeft de opruimer de taak terug en start er een TWEEDE
       restore, met een tweede wegwerpdatabase op de productieserver.

       Deze toets gebruikt twee ECHTE verbindingen: advisory locks zijn
       sessiegebonden, dus met één verbinding zou de tweede poging het
       slot gewoon opnieuw krijgen en zou de toets niets bewijzen. */
    await alsEigenaar(db, async (eerste) => {
      await alsEigenaar(db, async (tweede) => {
        let binnenEerste = false;
        const a = await metRestoretestSlot(eerste, async () => {
          binnenEerste = true;
          /* Terwijl de eerste het slot heeft: de tweede moet worden
             afgewezen. */
          const b = await metRestoretestSlot(tweede, async () => "mag niet gebeuren");
          assert.equal(b.gedraaid, false, "een tweede proef kreeg het slot terwijl de eerste liep");
          return "klaar";
        });
        assert.equal(binnenEerste, true, "het werk van de eerste is niet gedraaid");
        assert.equal(a.gedraaid, true);

        /* En na afloop moet het slot LOS zijn, anders draait er nooit
           meer een restoretest op die verbinding. */
        const c = await metRestoretestSlot(tweede, async () => "nu wel");
        assert.equal(c.gedraaid, true, "het slot bleef hangen na de eerste run");
      });
    });
  });

  test("11. de opruiming dropt wegwerpdatabases en RAAKT NIETS ANDERS", async () => {
    /* Voorwaarde 6: ruim tijdelijke resources ook bij fouten op. Wordt
       het restoretestproces GEDOOD, dan draait zijn finally niet en
       blijft de wegwerpdatabase op de productieserver staan. De
       volgende ronde ruimt hem op.

       Deze toets maakt twee databases met een wegwerpnaam en één met
       een naam die eruit ziet maar het niet is, en controleert dat
       alleen de eerste twee verdwijnen — en dat de database waarin
       deze toets zelf draait blijft bestaan. */
    const weg1 = "restoretest_991_1";
    const weg2 = "restoretest_992_2";
    const lijktErop = "restoretest_993_x";

    await alsEigenaar(db, async (c) => {
      for (const n of [weg1, weg2, lijktErop]) {
        await c.query(`drop database if exists ${n}`);
        await c.query(`create database ${n}`);
      }

      const uit = await ruimWegwerpdatabasesOp(c, weg2);

      assert.deepEqual([...uit.opgeruimd], [weg1], "precies de wegwerpdatabase hoort te verdwijnen");
      assert.deepEqual([...uit.mislukt], [], `onverwachte mislukkingen: ${uit.mislukt.join(" | ")}`);

      const over = await c.query<{ datname: string }>(
        `select datname from pg_database where datname like 'restoretest_99%' order by 1`,
      );
      assert.deepEqual(
        over.rows.map((r) => r.datname),
        [weg2, lijktErop],
        "behouden database of de niet-wegwerpnaam is toch geraakt",
      );

      /* En het belangrijkste: de database waarin we dit draaien bestaat
         nog. Zou de vormtoets ooit verzwakt worden, dan valt deze om. */
      const zelf = await c.query<{ n: string }>(
        `select count(*)::text as n from pg_database where datname = $1`,
        [db.naam],
      );
      assert.equal(Number(zelf.rows[0]?.n), 1, "de eigen testdatabase is gedropt; de vormtoets is stuk");

      for (const n of [weg2, lijktErop]) await c.query(`drop database if exists ${n}`);
    });
  });

  test("12. de registratie raakt GEEN back-uptaken aan", async () => {
    /* "Een recente back-up is niet automatisch een bewezen herstelbare
       back-up." De twee soorten moeten gescheiden blijven: een
       restoretestregistratie mag nooit als back-uptaak meetellen, want
       dan zou hij de RPO-controle van 26 uur bevredigen. */
    const perSoort = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<{ soort: string; n: string }>(
        c,
        `select soort, count(*)::text as n from intel.taken group by 1 order by 1`,
      ),
    );
    assert.deepEqual(
      perSoort.map((r) => r.soort),
      [RESTORETEST_TAAK_SOORT],
      "er staan andere taaksoorten in deze database dan de restoretests die deze toets maakte",
    );
    const backups = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<{ n: string }>(
        c,
        `select count(*)::text as n from intel.taken where soort = 'backup' and status = 'gereed'`,
      ),
    );
    assert.equal(Number(backups[0]?.n), 0, "een restoretest is als back-uptaak geregistreerd");
  });
});
