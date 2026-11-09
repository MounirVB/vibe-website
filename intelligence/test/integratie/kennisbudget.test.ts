/* ============================================================
   TEST — de kennisstroom heeft een EIGEN budget, met eigen eerlijkheid
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET.

   De conceptaak (prioriteit 38) verwerkt sinds V1.1 uitsluitend
   NEWS_ITEM. De UPDATE_EXISTING-kandidaten gaan naar `voorstel`
   (prioriteit 60), en die werkvoorraad had tot V1.2 GEEN grens:
   `order by k.id` over alles. Dat is dezelfde vorm als het defect dat
   de nieuwsketen stillegde — een werkvoorraad zonder grens die bij
   groei een hele ronde opeet — alleen dan in de andere stroom.

   GEMETEN IN PRODUCTIE, 9 november 2026: 20 open
   UPDATE_EXISTING-kandidaten, en in oktober stonden er vijf die ALLE
   VIJF naar /kennis/transportvermogen-versus-aansluitwaarde wezen. Met
   één grens op de ronde zouden die vijf samen het budget vullen terwijl
   andere pagina's wachten. Vandaar twee sleutels in plaats van één.

   WAT HIER MET OPZET NIET WORDT GETOETST: of een voorstel inhoudelijk
   goed is. Dat doen de vier controles in voorstel.ts (bronverwijzing,
   actualiteit, duplicatie, seo) en hun eigen toetsen. Deze zaken gaan
   uitsluitend over de VERDELING van de ronde, en gebruiken daarom
   kandidaten zonder gebeurtenis: `bouwVoorstel()` geeft daar null op,
   wat in `zonderVoorstel` wordt geteld. De selectie is dan zuiver
   meetbaar zonder de rest van de keten na te bouwen.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, beforeEach, describe, test } from "node:test";
import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { voorstelronde } from "../../src/inhoud/voorstel.ts";
import type { SitekennisBestand } from "../../src/site/sitekennis.ts";

/* Een minimale sitekennis: deze zaken komen niet tot het lezen ervan,
   want elke kandidaat valt al op 'geen gebeurtenis' af. Hij is er omdat
   de signatuur hem eist. */
const KENNIS = { schema: 3, paginas: [], clusters: [] } as unknown as SitekennisBestand;

describe("het budget van de kennisstroom", () => {
  let db: Wegwerpdatabase;
  let org: number;

  before(async () => {
    db = await maakWegwerpdatabase("kennisbudget");
    org = await maakOrganisatie(db, "vibe-energy");
  });

  after(async () => {
    await db?.opruimen();
  });

  beforeEach(async () => {
    /* ELKE ZAAK ZET ZIJN EIGEN WERKVOORRAAD. Zonder opruimen erft de
       volgende zaak de kandidaten van de vorige en meet hij een budget
       dat hij niet heeft gezet — dezelfde meetval als in de
       conceptsuite. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query("delete from intel.inhoud_kandidaten where organisatie_id = $1", [org]);
      await c.query("delete from intel.pagina_register where organisatie_id = $1", [org]);
    });
  });

  /** Zet n kandidaten neer, verdeeld over de gegeven doelpagina's. */
  async function zetKandidaten(verdeling: readonly { pad: string; aantal: number }[]) {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      for (const { pad, aantal } of verdeling) {
        const p = await c.query<{ id: number }>(
          `insert into intel.pagina_register
             (organisatie_id, pad, canonieke_url, bestandspad, titel, soort,
              in_sitemap, bestaat_in_repo, eigenaar_release, beheer)
           values ($1,$2,$3,$4,$5,'kennis',true,true,'release1','handmatig')
           returning id`,
          [org, pad, `https://www.vibeenergy.nl${pad}`, `${pad.slice(1)}.html`, `Pagina ${pad}`],
        );
        const paginaId = p.rows[0]!.id;
        for (let i = 0; i < aantal; i += 1) {
          await c.query(
            `insert into intel.inhoud_kandidaten
               (organisatie_id, besluit, status, doel_pagina_id, totaalscore, motor_versie)
             values ($1,'UPDATE_EXISTING','open',$2,$3,'besluitmotor-v1')`,
            [org, paginaId, 50 + i],
          );
        }
      }
    });
  }

  async function openKandidaten() {
    const r = await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      return c.query<{ n: string }>(
        `select count(*) as n from intel.inhoud_kandidaten
          where organisatie_id = $1 and besluit = 'UPDATE_EXISTING' and status <> 'afgehandeld'`,
        [org],
      );
    });
    return Number(r.rows[0]!.n);
  }

  test("1 · de ronde verwerkt niet meer dan zijn budget", async () => {
    await zetKandidaten([{ pad: "/kennis/een", aantal: 12 }]);
    assert.equal(await openKandidaten(), 12, "voorwaarde: twaalf open kandidaten");

    const r = await voorstelronde(db.pool, org, KENNIS, { max: 4, maxPerDoelpagina: 10 });
    assert.equal(r.kandidaten, 4, `verwacht vier van de twaalf, kreeg ${JSON.stringify(r)}`);
    assert.equal(r.zonderVoorstel, 4, "en alle vier vallen af op 'geen gebeurtenis'");
  });

  test("2 · ÉÉN doelpagina kan het budget niet opeten", async () => {
    /* DE ZAAK UIT OKTOBER 2026, nagespeeld: vijf kandidaten naar
       dezelfde kennispagina en twee naar andere. Met alleen een grens op
       de ronde zouden de vijf de eerste plekken vullen (ze hebben de
       laagste ids) en kwamen de andere twee niet aan de beurt. */
    await zetKandidaten([
      { pad: "/kennis/transportvermogen-versus-aansluitwaarde", aantal: 5 },
      { pad: "/kennis/netcongestie-uitgelegd", aantal: 1 },
      { pad: "/kennis/salderingsregeling", aantal: 1 },
    ]);

    const r = await voorstelronde(db.pool, org, KENNIS, { max: 5, maxPerDoelpagina: 2 });
    assert.equal(
      r.kandidaten,
      4,
      `verwacht 2 van de stapel + 1 + 1 = 4, kreeg ${JSON.stringify(r)}`,
    );
  });

  test("3 · wat buiten het budget valt blijft staan en komt terug", async () => {
    /* NIETS WORDT AFGEWEZEN EN NIETS OVERGESLAGEN — het schuift op. Dat
       is het verschil tussen een budget en een filter, en het is de
       reden dat de kandidaat zijn status houdt. */
    await zetKandidaten([{ pad: "/kennis/een", aantal: 6 }]);
    const eerste = await voorstelronde(db.pool, org, KENNIS, { max: 2, maxPerDoelpagina: 10 });
    assert.equal(eerste.kandidaten, 2);
    assert.equal(await openKandidaten(), 6, "een budget wijst niemand af");

    const tweede = await voorstelronde(db.pool, org, KENNIS, { max: 10, maxPerDoelpagina: 10 });
    assert.equal(tweede.kandidaten, 6, "de volgende ronde ziet ze alle zes weer");
  });

  test("4 · de standaardwaarden zijn gezet en begrensd", async () => {
    /* Een budget dat alleen bestaat als de aanroeper eraan denkt, is
       geen budget. Zonder opties hoort de grens er te zijn. */
    await zetKandidaten([{ pad: "/kennis/een", aantal: 30 }]);
    const r = await voorstelronde(db.pool, org, KENNIS, {});
    assert.equal(r.kandidaten, 3, `standaard: 3 per doelpagina, kreeg ${JSON.stringify(r)}`);
  });

  test("5 · een afgehandelde kandidaat telt niet meer mee", async () => {
    await zetKandidaten([{ pad: "/kennis/een", aantal: 4 }]);
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `update intel.inhoud_kandidaten set status = 'afgehandeld'
          where organisatie_id = $1 and id in (
            select id from intel.inhoud_kandidaten where organisatie_id = $1 order by id limit 2)`,
        [org],
      );
    });
    const r = await voorstelronde(db.pool, org, KENNIS, { max: 10, maxPerDoelpagina: 10 });
    assert.equal(r.kandidaten, 2, "twee zijn afgehandeld, twee staan nog open");
  });
});
