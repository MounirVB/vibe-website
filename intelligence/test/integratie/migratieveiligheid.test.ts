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

/* ============================================================
   0040 OP EEN GEVULD LOGBOEK — issue #45
   ------------------------------------------------------------
   De toetsen hierboven repeteren historische rijen voor
   intel.uitspraken, want dat is de tabel die 0027 kelderde.
   intel.meld_berichten is daar in BEIDE paden leeg, en dus zou de
   poort een botsing op die tabel niet zien. 0040 voegt er een CHECK
   aan toe (meldberichten_opgeven_klopt), en dat is precies de klasse
   wijziging die in 0027 is misgegaan.

   Daarom hier hetzelfde scenario voor dat logboek: een database op
   0039 met de rijvormen die op productie echt voorkomen, en dan
   migreren.
   ============================================================ */

const VOOR_OPGEVEN = 39;

describe("0040 op een database met een GEVULD meldberichtenlogboek", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("opgevenmigr", { totNummer: VOOR_OPGEVEN });
    org = await maakOrganisatie(db, "opgevenmigr");

    /* De drie vormen die op productie voorkomen of voorkwamen, gemeten
       op 19 oktober 2026: elf rijen, alle geaccepteerd. De tweede en
       derde vorm staan er bewust bij omdat ZIJ de rijen zijn waar een
       keten-CHECK over struikelt als hij verkeerd is opgeschreven. */
    await alsEigenaar(db, async (c) => {
      await c.query(
        `insert into intel.meld_berichten
           (organisatie_id, soort, bundel, vingerafdruk, ernst, onderwerp,
            aangeboden_op, geaccepteerd_op, provider, provider_id, pogingen)
         values ($1,'FOUT','bron:rendo-nieuws', repeat('a',32),'FOUT',
                 'storing: bron rendo-nieuws levert niet',
                 now(), now(), 'resend', 'een-echte-verzending', 1)`,
        [org],
      );
      /* Een rij die is aangeboden en mislukt, met een wachttijd. */
      await c.query(
        `insert into intel.meld_berichten
           (organisatie_id, soort, bundel, vingerafdruk, ernst, onderwerp,
            aangeboden_op, pogingen, laatste_fout, volgende_poging_op)
         values ($1,'FOUT','bron:tenderned', repeat('b',32),'FOUT',
                 'storing: bron tenderned levert niet',
                 now(), 2, 'HTTP 503: service unavailable', now() + interval '15 minutes')`,
        [org],
      );
      /* En de rij uit issue #45: definitief mislukt, volgende_poging_op
         null, dus door de oude selectie als 'nu te verzenden' gelezen. */
      await c.query(
        `insert into intel.meld_berichten
           (organisatie_id, soort, bundel, vingerafdruk, ernst, onderwerp,
            aangeboden_op, pogingen, laatste_fout)
         values ($1,'WARNING','dagoverzicht', repeat('c',32),'WARNING',
                 'overzicht: 2 waarschuwing(en)',
                 now(), 1, 'HTTP 422: the domain is not verified')`,
        [org],
      );
    });
  });

  after(async () => {
    await db?.opruimen();
  });

  test("1. de database staat op 0039 en kent opgegeven_op nog niet", async () => {
    const kolom = await alsEigenaar(db, (c) =>
      c.query(
        `select 1 from information_schema.columns
          where table_schema = 'intel' and table_name = 'meld_berichten'
            and column_name = 'opgegeven_op'`,
      ),
    );
    assert.equal(kolom.rowCount, 0, "0039 hoort de kolom nog niet te hebben");
    const n = await alsEigenaar(db, (c) =>
      c.query("select count(*)::int as n from intel.meld_berichten"),
    );
    assert.equal(n.rows[0].n, 3, "en er staan drie historische rijen in");
  });

  test("2. 0040 loopt door op een gevuld logboek", async () => {
    const r = await migreerVerder(db);
    assert.ok(
      r.toegepast.some((n) => n.startsWith("0040_")),
      `0040 hoort toegepast te zijn, kreeg: ${r.toegepast.join(", ")}`,
    );
  });

  test("3. de historische rijen zijn intact en niemand is stil opgegeven", async () => {
    const b = await alsEigenaar(db, (c) =>
      c.query(
        `select bundel, pogingen, opgegeven_op, geaccepteerd_op
           from intel.meld_berichten order by id`,
      ),
    );
    assert.equal(b.rowCount, 3, "geen rij verdwenen");
    for (const r of b.rows) {
      assert.equal(
        r.opgegeven_op,
        null,
        `${r.bundel} hoort NIET door de migratie te zijn opgegeven; een migratie neemt geen besluiten over bestaande rijen`,
      );
    }
  });

  test("4. de nieuwe keten-CHECK staat NOT VALID, en dat is bewust", async () => {
    const c = await alsEigenaar(db, (cl) =>
      cl.query(
        `select convalidated from pg_constraint
          where conname = 'meldberichten_opgeven_klopt'`,
      ),
    );
    assert.equal(c.rowCount, 1, "de constraint bestaat");
    assert.equal(
      c.rows[0].convalidated,
      false,
      "NOT VALID: 0027 heeft een productiedeploy gesloopt met een CHECK die bestaande rijen afkeurde",
    );
  });

  test("5. maar hij bindt wel elke wijziging vanaf nu", async () => {
    /* Opgeven kan niet zonder aanbieding. */
    await assert.rejects(
      alsEigenaar(db, (c) =>
        c.query(
          `insert into intel.meld_berichten
             (organisatie_id, soort, bundel, vingerafdruk, onderwerp, opgegeven_op)
           values ($1,'FOUT','bron:nieuw', repeat('d',32),
                   'een bericht dat nooit is aangeboden', now())`,
          [org],
        ),
      ),
      /meldberichten_opgeven_klopt/,
      "opgegeven zonder aangeboden hoort geweigerd te worden",
    );

    /* En opgegeven sluit geaccepteerd uit. */
    await assert.rejects(
      alsEigenaar(db, (c) =>
        c.query(
          `update intel.meld_berichten
              set opgegeven_op = now()
            where bundel = 'bron:rendo-nieuws'`,
        ),
      ),
      /meldberichten_opgeven_klopt/,
      "een geaccepteerd bericht hoort niet opgegeven te kunnen worden",
    );
  });

  test("6. de partiële index dekt de nieuwe eindtoestand", async () => {
    const idx = await alsEigenaar(db, (c) =>
      c.query(
        `select indexdef from pg_indexes
          where schemaname = 'intel' and indexname = 'meldberichten_te_verzenden_idx'`,
      ),
    );
    assert.equal(idx.rowCount, 1, "de index bestaat nog, met dezelfde naam");
    assert.match(
      idx.rows[0].indexdef,
      /opgegeven_op IS NULL/i,
      "zonder deze term blijven opgegeven rijen voorgoed in de verzendindex staan",
    );
  });

  test("7. opnieuw migreren is een no-op", async () => {
    const r = await migreerVerder(db);
    assert.equal(r.toegepast.length, 0, "een tweede run hoort niets toe te passen");
  });
});
