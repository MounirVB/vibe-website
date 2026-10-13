/* ============================================================
   TEST — migreren tegen PRODUCTIEVORMIGE data
   ------------------------------------------------------------
   HET GEMETEN INCIDENT (13 oktober 2026).

   Migratie 0027 zette een CHECK op intel.uitspraken. CI toetste hem
   tegen een VERSE, LEGE database en was groen. In productie, met
   bestaande rijen, brak de migratieloper af:

     migratie 0027_tijdgrens.sql mislukt: check constraint
     "uitspraken_tijdgebonden_vraagt_tijd" of relation "uitspraken"
     is violated by some row

   Gevolg: 0027 t/m 0030 niet toegepast, vibe-intel-api bleef op de oude
   image staan, en vibe-intel-worker en vibe-intel-planner draaiden wél
   de nieuwe code tegen een oud schema. De release stond een halfuur half
   uitgerold.

   De oorzaak van de BLINDHEID was het harnas: maakWegwerpdatabase() kon
   alleen 'alles migreren'. Er was geen manier om te migreren tot de
   versie die in productie stond, data in te voegen, en dan verder te
   gaan. Sinds 3.0.4 kan dat (totNummer + migreerVerder), en deze toetsen
   gebruiken het.

   Deze toetsen zouden het incident hebben gevangen: met de oude 0027
   (zonder NOT VALID) faalt toets 2 op precies die foutmelding.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import {
  alsEigenaar,
  maakOrganisatie,
  maakWegwerpdatabase,
  migreerVerder,
  type Wegwerpdatabase,
} from "../harnas.ts";

/* De versie die op 13 oktober 2026 in productie stond toen 0027 werd
   uitgerold. Alles t/m 0026 was toegepast. */
const PRODUCTIEVERSIE = 26;

describe("een migratie op een database MET historische rijen", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("migratievorm", { totNummer: PRODUCTIEVERSIE });
    org = await maakOrganisatie(db, "vibe-energy");
  });

  after(async () => {
    await db.opruimen();
  });

  test("1. de database staat echt op de productieversie, niet verder", async () => {
    const stand = await alsEigenaar(db, async (c) => {
      const m = await c.query<{ hoogste: string; n: string }>(
        "select max(nummer)::text as hoogste, count(*)::text as n from intel.migraties",
      );
      const kolom = await c.query<{ n: string }>(
        `select count(*)::text as n from information_schema.columns
          where table_schema = 'intel' and table_name = 'uitspraken' and column_name = 'horizon'`,
      );
      return { hoogste: Number(m.rows[0]!.hoogste), kolommen: Number(kolom.rows[0]!.n) };
    });
    assert.equal(stand.hoogste, PRODUCTIEVERSIE, "het harnas hoort tot 0026 te migreren");
    assert.equal(
      stand.kolommen,
      0,
      "`horizon` komt pas met 0027; staat hij er al, dan toetst dit scenario niets",
    );
  });

  test("2. de klasse rij die 0027 kelderde laat de migratie NU doorlopen", async () => {
    /* Exact de vorm die in productie bestond: een VERWOORDBARE uitspraak
       over een tijdgebonden fenomeen, zonder periode. `horizon` bestaat
       hier nog niet, dus die kan per definitie niet gevuld zijn — en
       juist daardoor reduceerde de grendel voor historische data tot
       'periode is not null'. */
    await alsEigenaar(db, (c) =>
      c.query(
        `insert into intel.uitspraken
           (organisatie_id, tekst, soort, fenomeen, periode,
            verwoordbaar, verwoordbaar_reden, verwoorde_zin)
         values ($1, 'De netbeheerders investeren EUR 200 miljard.', 'feit',
                 'netinvestering', null, 'VERWOORDBAAR',
                 'historische rij uit de productievorm',
                 'De netbeheerders investeren EUR 200 miljard in het elektriciteitsnet.')`,
        [org],
      ),
    );

    /* DIT is de toets. Met de oude 0027 (zonder NOT VALID) faalt deze
       regel met "is violated by some row" — de letterlijke
       productiefout. */
    const r = await migreerVerder(db);
    assert.ok(
      r.toegepast.some((n) => n.startsWith("0027")),
      `0027 hoort nu toegepast te zijn; toegepast: ${r.toegepast.join(", ")}`,
    );
    assert.ok(
      r.toegepast.some((n) => n.startsWith("0030")),
      "de migraties NA 0027 horen ook te zijn gelopen; anders bleef de release half",
    );
  });

  test("3. de grendel staat op NOT VALID, en dat is bewust", async () => {
    const rij = await alsEigenaar(db, async (c) => {
      const r = await c.query<{ convalidated: boolean }>(
        `select convalidated from pg_constraint
          where conname = 'uitspraken_tijdgebonden_vraagt_tijd'
            and conrelid = 'intel.uitspraken'::regclass`,
      );
      return r.rows[0];
    });
    assert.ok(rij, "de constraint hoort te bestaan");
    assert.equal(
      rij.convalidated,
      false,
      "gevalideerd betekent dat bestaande rijen worden afgekeurd — daar brak de deploy op",
    );
  });

  test("4. de historische rij is NIET stilletjes weggepoetst", async () => {
    const n = await alsEigenaar(db, async (c) => {
      const r = await c.query<{ n: string }>(
        `select count(*)::text as n from intel.uitspraken
          where verwoordbaar_reden = 'historische rij uit de productievorm'`,
      );
      return Number(r.rows[0]!.n);
    });
    assert.equal(n, 1, "een migratie mag historisch bewijs niet verwijderen om groen te worden");
  });

  test("5. een NIEUWE schendende rij wordt alsnog geweigerd", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, (c) =>
          c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, fenomeen, periode,
                verwoordbaar, verwoordbaar_reden, verwoorde_zin)
             values ($1, 'Nog een bedrag zonder tijd.', 'feit',
                     'subsidiebudget', null, 'VERWOORDBAAR', 'nieuwe rij', 'Een zin.')`,
            [org],
          ),
        ),
      /uitspraken_tijdgebonden_vraagt_tijd/i,
      "NOT VALID mag de grendel voor nieuwe rijen niet uitzetten",
    );
  });

  test("6. opnieuw migreren is een no-op en geen fout", async () => {
    /* Een worker die herstart, een tweede deploy, een handmatige run:
       migreren moet idempotent zijn. */
    const r = await migreerVerder(db);
    assert.deepEqual(r.toegepast, [], "er hoort niets opnieuw te worden toegepast");
  });

  test("7. de volledige set migraties is nu gelijk aan die van een VERSE database", async () => {
    /* De upgradeweg (0026 + data -> alles) moet op hetzelfde schema
       uitkomen als de groene-weide-weg. Anders bestaan er twee
       schema's en betekent een groene CI niets voor productie. */
    const vers = await maakWegwerpdatabase("migratievers");
    try {
      const lees = (d: Wegwerpdatabase) =>
        alsEigenaar(d, async (c) => {
          const m = await c.query<{ naam: string }>(
            "select naam from intel.migraties order by naam",
          );
          const k = await c.query<{ sig: string }>(
            `select table_name || '.' || column_name || ':' || data_type as sig
               from information_schema.columns
              where table_schema = 'intel'
              order by table_name, column_name`,
          );
          return {
            migraties: m.rows.map((x) => x.naam),
            kolommen: k.rows.map((x) => x.sig),
          };
        });
      const a = await lees(db);
      const b = await lees(vers);
      assert.deepEqual(a.migraties, b.migraties, "de migratielijst hoort gelijk te zijn");
      assert.deepEqual(a.kolommen, b.kolommen, "het kolomschema hoort gelijk te zijn");
    } finally {
      await vers.opruimen();
    }
  });
});
