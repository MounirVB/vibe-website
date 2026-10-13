/* ============================================================
   TEST — precies één primaire blokkeerreden per voorstel
   ------------------------------------------------------------
   WAAROM DE ORDE HET HELE VERHAAL IS.

   Gemeten op 13 oktober 2026: van de 19 voorstellen had 1 voorstel één
   gefaalde controle, 12 voorstellen twee, en 4 voorstellen drie. Wie
   simpelweg per gefaalde controle telt, telt dezelfde kandidaat drie
   keer en krijgt een beeld dat niets zegt over wat hem tegenhoudt.

   De besluitmotor hanteert een vaste prioriteit (voorstel.ts, weegAf):
   bronverwijzing, actualiteit, seo, duplicatie, verwoordbaarheid, dan
   de twee algemene drempels. ops/meting.ts spiegelt die orde. Loopt dat
   uiteen, dan rapporteert de meting een andere reden dan de motor
   gebruikt — en dan stuurt iemand op het verkeerde probleem.

   De gemeten verdeling op dezelfde database:
     DOELPAGINA_DEKT_ONDERWERP_NIET  11
     BRONBEWIJS_ONTBREEKT             5
     NIET_GEBLOKKEERD                 2
     RELEVANTIE_TE_LAAG               1
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { meetProductie } from "../../src/ops/meting.ts";

const PAD = "/kennis/fixture-meting-niet-live";

/** Een voorstel met een gegeven set gefaalde controles en eindoordeel. */
type Geval = {
  sleutel: string;
  eindoordeel: string;
  status: string;
  fails: readonly string[];
  voorbehouden?: readonly string[];
  verwacht: string;
};

const GEVALLEN: readonly Geval[] = [
  {
    sleutel: "bron-en-seo",
    eindoordeel: "AFWIJZEN",
    status: "DRAFT",
    /* TWEE fails. bronverwijzing gaat vóór seo in weegAf, dus dit moet
       BRONBEWIJS_ONTBREEKT worden en niet DOELPAGINA_DEKT_ONDERWERP_NIET. */
    fails: ["bronverwijzing", "seo"],
    verwacht: "BRONBEWIJS_ONTBREEKT",
  },
  {
    sleutel: "seo-en-verwoord",
    eindoordeel: "HERROUTEREN",
    status: "DRAFT",
    fails: ["seo", "verwoordbaarheid"],
    verwacht: "DOELPAGINA_DEKT_ONDERWERP_NIET",
  },
  {
    sleutel: "alleen-verwoord",
    eindoordeel: "NEEDS_RESEARCH",
    status: "DRAFT",
    fails: ["verwoordbaarheid"],
    verwacht: "FEIT_NIET_VERWOORDBAAR",
  },
  {
    sleutel: "duplicaat",
    eindoordeel: "UITSTELLEN",
    status: "DRAFT",
    fails: ["duplicatie"],
    verwacht: "DUPLICAAT",
  },
  {
    sleutel: "twee-voorbehouden",
    eindoordeel: "UITSTELLEN",
    status: "DRAFT",
    fails: [],
    voorbehouden: ["seo", "duplicatie"],
    verwacht: "TE_VEEL_VOORBEHOUD",
  },
  {
    sleutel: "gereed-feitelijk",
    eindoordeel: "KLAAR_VOOR_REVIEW",
    status: "READY_FOR_REVIEW",
    fails: [],
    verwacht: "NIET_GEBLOKKEERD",
  },
  {
    sleutel: "gereed-link",
    eindoordeel: "KLAAR_VOOR_LINKREVIEW",
    status: "READY_FOR_LINK_REVIEW",
    /* Een linkvoorstel HEEFT een gefaalde verwoordbaarheid en is toch
       niet geblokkeerd: het wacht op een mens in zijn eigen klasse. Dat
       onderscheid is in 0032 ingevoerd en moet hier overeind blijven. */
    fails: ["verwoordbaarheid"],
    verwacht: "NIET_GEBLOKKEERD",
  },
];

describe("de meting wijst precies één blokkeerreden toe", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("metingfunnel");
    org = await maakOrganisatie(db, "vibe-energy");

    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const g = await c.query<{ id: string }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, gebeurtenis_soort)
         values ($1, 'fixture-meting', 'Fixture voor de meting', 'overig')
         returning id::text`,
        [org],
      );
      for (const geval of GEVALLEN) {
        const k = await c.query<{ id: string }>(
          `insert into intel.inhoud_kandidaten
             (organisatie_id, gebeurtenis_id, besluit, motor_versie)
           values ($1, $2::bigint, 'UPDATE_EXISTING', 'fixture-meting')
           returning id::text`,
          [org, g.rows[0]!.id],
        );
        const v = await c.query<{ id: string }>(
          `insert into intel.inhoud_voorstellen
             (organisatie_id, kandidaat_id, gebeurtenis_id, doel_pad, wijziging_soort,
              doel_sectie, nieuwe_tekst, huidige_tekst, cta_tekst, cta_doel, cta_grondslag,
              eindoordeel, oordeel_reden, inhouds_hash, publicatie_status)
           values ($1, $2::bigint, $3::bigint, $4, 'geen', 'Wat dit kost',
                   'Fixturetekst.', 'De bestaande fixturetekst.',
                   'Laat uw fixture doorrekenen', '/contact', 'fixture',
                   $5, 'fixture voor de blokkeerredentoets van release 3.0.5',
                   $6, $7)
           returning id::text`,
          [org, k.rows[0]!.id, g.rows[0]!.id, PAD, geval.eindoordeel,
           geval.sleutel.padEnd(64, "0").slice(0, 64).replace(/[^0-9a-f]/g, "a"), geval.status],
        );
        for (const naam of geval.fails) {
          await c.query(
            `insert into intel.inhoud_voorstel_controles
               (voorstel_id, organisatie_id, naam, oordeel, reden, bewijs)
             values ($1::bigint, $2, $3, 'FAIL', 'fixture: deze controle faalt', '{}')`,
            [v.rows[0]!.id, org, naam],
          );
        }
        for (const naam of geval.voorbehouden ?? []) {
          await c.query(
            `insert into intel.inhoud_voorstel_controles
               (voorstel_id, organisatie_id, naam, oordeel, reden, bewijs)
             values ($1::bigint, $2, $3, 'VOORBEHOUD', 'fixture: met voorbehoud', '{}')`,
            [v.rows[0]!.id, org, naam],
          );
        }
      }
    });
  });

  after(async () => {
    await db.opruimen();
  });

  /* ALS EIGENAAR, NIET ALS APPLICATIEROL.
     meetProductie leest intel.migraties en pg_constraint, en de
     applicatierol mag die eerste met opzet niet — dat is waarom
     cli/meting.ts een pool met `rol: null` gebruikt. Een toets die
     db.pool pakt krijgt daarom "permission denied for table migraties",
     en dat is correct gedrag van de database en geen testfout. De
     eigenaar ziet alle rijen zonder RLS-context, en elke query hier
     filtert toch al expliciet op organisatie_id. */
  const meet = () => alsEigenaar(db, (c) => meetProductie(c, org));

  test("1. de redenen tellen op tot het aantal voorstellen — niet meer en niet minder", async () => {
    const m = await meet();
    const som = m.blokkeerredenen.reduce((a, t) => a + t.aantal, 0);
    assert.equal(
      som,
      m.voorstellen,
      `${som} redenen op ${m.voorstellen} voorstellen; een voorstel met drie fails mag niet drie keer tellen`,
    );
    assert.equal(m.voorstellen, GEVALLEN.length);
  });

  test("2. de orde van weegAf wordt gespiegeld, per geval", async () => {
    const m = await meet();
    const per = new Map(m.blokkeerredenen.map((t) => [t.sleutel, t.aantal]));
    const verwacht = new Map<string, number>();
    for (const g of GEVALLEN) verwacht.set(g.verwacht, (verwacht.get(g.verwacht) ?? 0) + 1);
    for (const [reden, n] of verwacht) {
      assert.equal(per.get(reden), n, `${reden}: verwacht ${n}, kreeg ${per.get(reden) ?? 0}`);
    }
    assert.equal(per.size, verwacht.size, "er zijn redenen bijgekomen die geen geval dekt");
  });

  test("3. BRONBEWIJS gaat vóór DOELPAGINA — dat is de prioriteit van weegAf", async () => {
    /* Het geval 'bron-en-seo' heeft BEIDE controles op FAIL. Zou de
       meting de seo-reden kiezen, dan stuurt iemand op paginamatching
       terwijl het bronbewijs ontbreekt. */
    const m = await meet();
    const per = new Map(m.blokkeerredenen.map((t) => [t.sleutel, t.aantal]));
    assert.equal(per.get("BRONBEWIJS_ONTBREEKT"), 1);
    assert.equal(per.get("DOELPAGINA_DEKT_ONDERWERP_NIET"), 1, "alleen het geval zonder bronfout");
  });

  test("4. een KLAAR linkvoorstel is NIET geblokkeerd, ook met een gefaalde verwoordbaarheid", async () => {
    const m = await meet();
    const per = new Map(m.blokkeerredenen.map((t) => [t.sleutel, t.aantal]));
    assert.equal(per.get("NIET_GEBLOKKEERD"), 2, "de feitelijke revisie én het linkvoorstel");
    /* En de poortmismatch blijft nul: READY_FOR_REVIEW heeft geen FAIL. */
    assert.equal(m.poortMismatch, 0);
  });
});
