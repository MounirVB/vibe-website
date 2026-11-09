/* ============================================================
   INTEGRATIE — de taak die van een kandidaat een artikel maakt
   ------------------------------------------------------------
   WAAROM DEZE TOETS BESTAAT.

   Gemeten op 9 november 2026 had `maakConcept()` in heel src/ precies
   één aanroeper, en dat was cli/concept.ts. PLAN kende geen soort
   'concept' en REGISTER geen handler. De uurlijkse keten liep dus tot
   en met de kandidaat (taak nieuwsselectie) en stopte daar: de
   werkvoorraad van de autopublicatie vraagt inhoudsversies op
   'ter_review', en geen enkele geplande taak maakte er een.

   Een "autonome nieuwsredactie" zonder die schakel keurt niets goed,
   want er is nooit iets om goed te keuren. Deze toets zet de schakel
   vast, en vooral de twee grenzen eromheen: de taak mag niet twee keer
   hetzelfde artikel maken, en hij mag de review niet volstorten.

   DE HANDLER WORDT UIT HET REGISTER GEHAALD en niet rechtstreeks
   geïmporteerd. Dat is het verschil tussen "de functie werkt" en "de
   taak hangt in de keten": een handler die niet in REGISTER staat
   draait in productie nooit.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, beforeEach, describe, test } from "node:test";

import {
  alsEigenaar,
  maakDragendeVersie,
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { PLAN, REGISTER } from "../../src/kern/taken.ts";

describe("de taak 'concept' hangt de artikelbouw in de keten", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let auteur = 0;
  let teller = 0;

  before(async () => {
    db = await maakWegwerpdatabase("concepttaak");
    org = await maakOrganisatie(db, "concepttaak-org");
    auteur = await maakGebruiker(db, org, "schrijver@test.nl", "analist");
  });

  after(async () => {
    await db.opruimen();
  });

  /* GEEN OPRUIMING TUSSEN DE ZAKEN, EN DAT IS GEEN NALATIGHEID.
     Zodra maakConcept() een versie heeft gemaakt, hangt daar een
     publicatiebesluit aan, en intel.publicatiebesluiten verwijst met
     ON DELETE RESTRICT naar de versie. Een opruiming zou dus botsen op
     "violates foreign key constraint publicatiebesluiten_inhoud_versie_id_fkey"
     — gemeten — en dat is precies het ontwerp: een auditspoor dat je
     kunt wissen door de versie te verwijderen, is geen auditspoor.

     Elke zaak meet daarom het VERSCHIL en niet het totaal. */
  beforeEach(async () => {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        "update intel.inhoud_kandidaten set status = 'in_concept' where organisatie_id = $1",
        [org],
      );
    });
  });

  /**
   * Een kandidaat die maakConcept() kan dragen.
   *
   * HERGEBRUIKT HET HARNAS. maakDragendeVersie({publiceerbaar: true})
   * zet precies de omgeving op die de conceptbouw nodig heeft: een
   * cluster met een eigenaarsroute, een gebeurtenis, een kandidaat op
   * 'in_concept', een echte bron met een dragende uitgever en een
   * bevestigde claim. De VERSIE die hij daarnaast maakt is hier niet de
   * bedoeling — die wordt in beforeEach weggehaald — maar de kandidaat
   * blijft staan, en die is wat deze taak verwerkt.
   */
  async function maakKandidaat(): Promise<number> {
    const v = await maakDragendeVersie(db, org, {
      slug: `concepttaak-${(teller += 1)}`,
      publiceerbaar: true,
      aangemaaktDoor: auteur,
      bronSleutel: "acm-besluiten",
    });
    /* DE MUTATIES GAAN VIA DE EIGENAAR, het lezen via de
       applicatierol. De applicatierol heeft op intel.inhoud_versies
       alleen select, insert en update (migratie 0004 regel 398) en
       GEEN delete — en dat is juist: een applicatie die
       inhoudsversies kan verwijderen, kan een auditspoor wissen.
       Mijn eerste versie deed de delete via db.pool en kreeg terecht
       "permission denied for table inhoud_versies". */
    const kandidaatId = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ kandidaat_id: number }>(
        "select kandidaat_id from intel.inhoud_versies where id = $1",
        [v.versieId],
      );
      const id = r.rows[0]?.kandidaat_id;
      assert.ok(id != null, "de publiceerbare fixture hoort een kandidaat te hebben");
      return id;
    });

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      /* HET HARNAS ZET DE KANDIDAAT OP 'in_concept', want daar hoort bij
         zijn eigen gebruik een versie bij. Deze taak verwerkt juist de
         OPENSTAANDE kandidaten. */
      await c.query("update intel.inhoud_kandidaten set status = 'open' where id = $1", [kandidaatId]);
      /* EN DE VERSIE VAN DE FIXTURE GAAT WEG. Deze toets wil dat de
         TAAK er een maakt; met twee versies is "precies één nieuwe
         versie" niet te meten. De kandidaat, het cluster, de bron en de
         claim blijven staan — dat is wat de conceptbouw leest. */
      await c.query("delete from intel.inhoud_versies where id = $1", [v.versieId]);
    });

    return kandidaatId;
  }

  async function telVersies(): Promise<number> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ n: number }>(
        "select count(*)::int as n from intel.inhoud_versies where organisatie_id = $1",
        [org],
      );
      return r.rows[0]?.n ?? 0;
    });
  }

  const draai = () => REGISTER["concept"]!(db.pool, org, {});

  test("1 · de taak staat in het PLAN en in het REGISTER", () => {
    const regel = PLAN.find((p) => p.soort === "concept");
    assert.ok(regel !== undefined, "zonder planregel draait de taak nooit");
    assert.equal(typeof REGISTER["concept"], "function");
    /* DE ORDE IS DE HELE WAARDE. De kandidaat komt uit nieuwsselectie
       (35) en de goedkeuring kijkt in 'publiceren' (70); een concept dat
       daarbuiten valt, wordt in dezelfde ronde niet meer gezien. */
    const nieuws = PLAN.find((p) => p.soort === "nieuwsselectie")!;
    const publiceren = PLAN.find((p) => p.soort === "publiceren")!;
    assert.ok(
      regel.prioriteit > nieuws.prioriteit && regel.prioriteit < publiceren.prioriteit,
      `concept (${regel.prioriteit}) hoort tussen nieuwsselectie (${nieuws.prioriteit}) en ` +
        `publiceren (${publiceren.prioriteit}) te staan`,
    );
  });

  test("2 · zonder kandidaten doet de taak niets en zegt dat", async () => {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query("update intel.inhoud_kandidaten set status = 'in_concept' where organisatie_id = $1", [org]);
    });
    const uit = await draai();
    assert.match(String(uit), /geen openstaande kandidaten/);
    assert.equal(await telVersies(), 0, "en er hoort geen versie bij te komen");
  });

  test("3 · van een openstaande kandidaat maakt de taak een conceptartikel", async () => {
    const voor = await telVersies();
    const kandidaatId = await maakKandidaat();
    const uit = await draai();
    assert.match(String(uit), /kandidaten 1 van maximaal 3/);

    assert.equal(await telVersies(), voor + 1, "precies één nieuwe versie");
    const versies = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        id: number;
        status: string;
        soort: string;
        kandidaat_id: number | null;
        poorten_geslaagd: boolean;
        titel: string;
        auteur_soort: string;
      }>(
        `select id, status, soort, kandidaat_id, poorten_geslaagd, titel, auteur_soort
           from intel.inhoud_versies where organisatie_id = $1 and kandidaat_id = $2`,
        [org, kandidaatId],
      );
      return r.rows;
    });
    assert.equal(versies.length, 1, "en hij hoort bij deze kandidaat");
    const v = versies[0]!;
    assert.equal(v.status, "ter_review", "een concept wacht op beoordeling en is niet goedgekeurd");
    assert.equal(v.kandidaat_id, kandidaatId, "en hoort bij de kandidaat die hij verwerkte");
    assert.equal(v.auteur_soort, "ai", "de herkomst van de tekst wordt eerlijk vastgelegd");
    assert.ok(v.titel.length > 10, "met een titel");

    /* DE KANDIDAAT IS AFGEWERKT. Dat is de idempotentie: de
       werkvoorraad vraagt 'open', en maakConcept() zet hem op
       'in_concept'. */
    const kandidaat = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ status: string }>(
        "select status from intel.inhoud_kandidaten where id = $1",
        [kandidaatId],
      );
      return r.rows[0]!.status;
    });
    assert.equal(kandidaat, "in_concept");
  });

  test("4 · twee rondes achter elkaar maken ÉÉN artikel", async () => {
    const voor = await telVersies();
    await maakKandidaat();
    await draai();
    const na1 = await telVersies();
    const uit = await draai();
    const na2 = await telVersies();
    assert.equal(na1, voor + 1);
    assert.equal(na2, na1, "een tweede ronde hoort niets toe te voegen");
    assert.match(String(uit), /geen openstaande kandidaten/);
  });

  test("5 · met de review vol slaat de taak over", async () => {
    await maakKandidaat();
    /* Tien concepten op review: het plafond uit de taak. Ze worden hier
       met de hand gezet, want tien echte conceptbouwen zouden deze
       toets minuten laten duren zonder iets extra's te bewijzen. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      for (let i = 0; i < 10; i += 1) {
        await c.query(
          `insert into intel.inhoud_versies
             (organisatie_id, pad, versie, soort, titel, meta_omschrijving, canonieke_url,
              body_markdown, status, risico_klasse, auteur_soort)
           values ($1, $2, 1, 'nieuw_artikel', 'Een vol bureau', 'Een metabeschrijving die lang genoeg is om te bestaan.',
                   'https://www.vibeenergy.nl' || $2, 'Tekst.', 'ter_review', 'laag', 'ai')`,
          [org, `/nieuws/vol-${i}`],
        );
      }
    });

    const voor = await telVersies();
    const uit = await draai();
    assert.match(String(uit), /overgeslagen: er staan al \d+ concepten op review/);
    assert.equal(await telVersies(), voor, "en er komt er geen bij");
  });
});
