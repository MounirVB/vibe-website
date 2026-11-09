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

/* ALLEEN ALS TYPE. De helpers hieronder krijgen de eigenaarsclient van
   alsEigenaar() door en moeten hem kunnen benoemen; een echte import van
   pg zou een tweede poolimplementatie in deze toets halen. */
import type pg from "pg";

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

/* ============================================================
   HET CONCEPTBUDGET — wie mag de drie plekken van een ronde hebben
   ------------------------------------------------------------
   DE GEMETEN RONDE DIE DEZE ZAKEN BESCHRIJVEN.

   Plannerronde 714, 9 november 2026 09:04, de eerste productieronde
   waarin de taak 'concept' meedraaide. Uitkomstregel:

     kandidaten 3 van maximaal 3, poorten ok 0, geblokkeerd 3

   en de drie versies die eruit kwamen (v3, v4, v5) stonden ALLE DRIE
   op hetzelfde pad /kennis/transportvermogen-versus-aansluitwaarde,
   met versienummer 1, 2 en 3, alle drie geblokkeerd op
   'kernclaim_heeft_bewijs'. Het rondebudget van drie was dus op
   voordat er één nieuwsitem aan de beurt was.

   WAAROM DAT GEEN TOEVAL WAS. Het pad van een kennisupdate is het pad
   van zijn DOELPAGINA (inhoud/concept.ts regel 372-375), dus drie
   kandidaten die naar dezelfde pagina wijzen leveren per definitie drie
   versies op dat ene pad; het versienummer loopt op omdat maakConcept()
   `max(versie) + 1 where pad = $2` neemt (regel 983-988).

   WAT ER MET DIE DRIE VERSIES GEBEURT NA DE REPARATIE — afgeleid uit de
   code, want de productiedatabase is hier niet te benaderen en wordt
   ook niet aangeraakt. Ze staan op 'ter_review' met één blokkade, en:

     * de taak pakt ze NOOIT meer op. Twee onafhankelijke redenen: hun
       kandidaten staan op 'in_concept' (de werkvoorraad vraagt 'open')
       en hun besluit is geen NEWS_ITEM. Niets in src/ zet een kandidaat
       terug naar 'open' — gemeten: alleen concept.ts regel 1074 en
       commercieel/signalen.ts regel 282 schrijven die kolom.
     * de autopublicatie pakt ze ook niet op: die werkvoorraad eist
       `poorten_geslaagd` én `cardinality(blokkades) = 0`
       (inhoud/autopublicatie.ts regel 292-295), en zij hebben beide niet.
     * ze blijven wél meetellen voor MAX_OPEN_CONCEPTEN, want dat plafond
       telt élke versie op 'ter_review'. Drie van de tien plekken blijven
       dus bezet tot een mens ze afwijst of goedkeurt. Dat is een
       redactionele handeling, geen taak.

   EEN EIGEN WEGWERPDATABASE, en dat is geen smaak. De zaken hierboven
   laten tien tot dertien versies op 'ter_review' achter — ze mogen niet
   worden opgeruimd, want het publicatiebesluit eraan verwijst met
   ON DELETE RESTRICT. Met die stapel staat het plafond
   MAX_OPEN_CONCEPTEN al vol en meet elke zaak hieronder "overgeslagen"
   in plaats van de budgetverdeling. Twee suites in één bestand delen
   de pool niet: db.opruimen() sluit alle pools, en node:test draait
   suites binnen een bestand op volgorde.
   ============================================================ */
describe("het conceptbudget verdeelt eerlijk en laat de nieuwsketen door", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let teller = 0;

  /* HET PAD UIT DE GEMETEN RONDE, letterlijk. */
  const KENNISPAD = "/kennis/transportvermogen-versus-aansluitwaarde";

  /* GEEN GEBRUIKER IN DEZE SUITE, en dat is geen vergeetpunt. Elke
     kandidaat hieronder wordt door de TAAK verwerkt, en die heeft geen
     actor: een concept komt op 'ter_review' en `aangemaakt_door` blijft
     NULL omdat er geen menselijke auteur is (inhoud/concept.ts regel
     1018-1036). Een gebruiker aanmaken zou suggereren dat er een mens in
     deze keten staat. */
  before(async () => {
    db = await maakWegwerpdatabase("conceptbudget");
    org = await maakOrganisatie(db, "conceptbudget-org");
  });

  after(async () => {
    await db.opruimen();
  });

  /* ELKE ZAAK MEET ZIJN EIGEN RONDE.
     Een kandidaat die een ronde niet haalde blijft 'open' staan — dat is
     het ontwerp — maar dan draagt de volgende zaak de werkvoorraad van
     de vorige mee en meet hij een budget dat hij niet heeft gezet. De
     versies blijven wél staan: die mogen niet worden opgeruimd, want het
     publicatiebesluit eraan verwijst met ON DELETE RESTRICT. */
  beforeEach(async () => {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `update intel.inhoud_kandidaten set status = 'vervallen'
          where organisatie_id = $1 and status = 'open'`,
        [org],
      );
    });
  });

  const draai = () => REGISTER["concept"]!(db.pool, org, {});

  /** Het cluster met deze sleutel, aangemaakt als het nog niet bestaat. */
  async function cluster(c: pg.Client, sleutel: string): Promise<string> {
    const r = await c.query<{ id: string }>(
      `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam)
       values ($1, $2, $3)
       on conflict (organisatie_id, sleutel) do update set naam = excluded.naam
       returning id::text`,
      [org, sleutel, `Cluster ${sleutel}`],
    );
    return r.rows[0]!.id;
  }

  /**
   * Een kandidaat zonder claim — precies de drie uit de gemeten ronde.
   *
   * GEEN UITSPRAKEN, EN DAT IS DE BEDOELING. De drie productieversies
   * waren geblokkeerd op 'kernclaim_heeft_bewijs: geen enkele uitspraak
   * is als kernclaim gebonden'. Een fixture met een dragende claim zou
   * een andere uitkomst meten dan de ronde die deze zaken beschrijven.
   *
   * Het DOELPAD is bij een kennis- of pagina-update het pad van de
   * doelpagina, dus alle kandidaten die hier hetzelfde `pad` meekrijgen
   * botsen op precies dezelfde manier als in productie.
   */
  async function maakGeblokkeerdeKandidaat(opties: {
    readonly besluit: "KNOWLEDGE_UPDATE" | "UPDATE_EXISTING";
    readonly pad: string;
    readonly score: number;
    readonly clusterSleutel?: string;
  }): Promise<number> {
    teller += 1;
    const n = teller;
    return alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const clusterId = await cluster(c, opties.clusterSleutel ?? "netcongestie");
      const pagina = await c.query<{ id: string }>(
        `insert into intel.pagina_register
           (organisatie_id, pad, canonieke_url, soort, bestaat_in_repo, in_sitemap, beheer)
         values ($1, $2, 'https://www.vibeenergy.nl' || $2, 'kennis', true, true, 'handmatig')
         on conflict (organisatie_id, pad) do update set soort = excluded.soort
         returning id::text`,
        [org, opties.pad],
      );
      const geb = await c.query<{ id: string }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, gebeurtenis_soort, onderwerp_cluster_id, risico_klasse)
         values ($1, $2, $3, 'netcongestie', $4::bigint, 'laag')
         returning id::text`,
        [org, `kennis-${n}`, `Transportvermogen en aansluitwaarde, meting ${n}`, clusterId],
      );
      const k = await c.query<{ id: string }>(
        `insert into intel.inhoud_kandidaten
           (organisatie_id, gebeurtenis_id, onderwerp_cluster_id, doel_pagina_id, besluit,
            motor_versie, totaalscore, status)
         values ($1, $2::bigint, $3::bigint, $4::bigint, $5, 'besluitmotor-test', $6, 'open')
         returning id::text`,
        [org, geb.rows[0]!.id, clusterId, pagina.rows[0]!.id, opties.besluit, opties.score],
      );
      return Number(k.rows[0]!.id);
    });
  }

  /**
   * Een NEWS_ITEM-kandidaat met een eigen gebeurtenis en titel.
   *
   * DE TITEL IS HET PAD. Bij een nieuwsbericht is het pad
   * `/nieuws/<slug van de gebeurtenistitel>` (inhoud/concept.ts regel
   * 372-375), dus twee kandidaten met dezelfde titel landen op hetzelfde
   * pad en twee met een eigen titel niet. Daar hangt de hele
   * padverdeling aan, en daarom geeft elke zaak zijn titels expliciet
   * mee in plaats van ze aan een teller over te laten.
   *
   * `gebeurtenisId` meegeven hangt een TWEEDE kandidaat aan dezelfde
   * gebeurtenis — het geval dat één bronbesluit twee conceptversies zou
   * opleveren.
   */
  async function maakNieuwsKandidaat(opties: {
    readonly titel: string;
    readonly score: number;
    readonly clusterSleutel?: string;
    readonly gebeurtenisId?: number;
  }): Promise<{ readonly kandidaatId: number; readonly gebeurtenisId: number }> {
    teller += 1;
    const n = teller;
    return alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const clusterId = await cluster(c, opties.clusterSleutel ?? "netcongestie");
      const gebeurtenisId =
        opties.gebeurtenisId !== undefined
          ? String(opties.gebeurtenisId)
          : (
              await c.query<{ id: string }>(
                `insert into intel.markt_gebeurtenissen
                   (organisatie_id, sleutel, titel, gebeurtenis_soort, onderwerp_cluster_id,
                    risico_klasse)
                 values ($1, $2, $3, 'netcongestie', $4::bigint, 'laag')
                 returning id::text`,
                [org, `nieuws-${n}`, opties.titel, clusterId],
              )
            ).rows[0]!.id;
      const k = await c.query<{ id: string }>(
        `insert into intel.inhoud_kandidaten
           (organisatie_id, gebeurtenis_id, onderwerp_cluster_id, besluit, motor_versie,
            totaalscore, status)
         values ($1, $2::bigint, $3::bigint, 'NEWS_ITEM', 'nieuwsmotor-test', $4, 'open')
         returning id::text`,
        [org, gebeurtenisId, clusterId, opties.score],
      );
      return { kandidaatId: Number(k.rows[0]!.id), gebeurtenisId: Number(gebeurtenisId) };
    });
  }

  /** De versies van deze kandidaat, met hun pad en versienummer. */
  async function versiesVan(
    kandidaatId: number,
  ): Promise<readonly { pad: string; versie: number; status: string }[]> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ pad: string; versie: number; status: string }>(
        `select pad, versie, status from intel.inhoud_versies
          where organisatie_id = $1 and kandidaat_id = $2 order by versie`,
        [org, kandidaatId],
      );
      return r.rows;
    });
  }

  /** Alle versies met hun pad, voor de telling per pad. */
  async function allePaden(): Promise<readonly string[]> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ pad: string }>(
        "select pad from intel.inhoud_versies where organisatie_id = $1 order by id",
        [org],
      );
      return r.rows.map((x) => x.pad);
    });
  }

  async function statusVan(kandidaatId: number): Promise<string> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ status: string }>(
        "select status from intel.inhoud_kandidaten where id = $1",
        [kandidaatId],
      );
      return r.rows[0]!.status;
    });
  }

  /**
   * 6 · DE ZAAK DIE DE OPDRACHTGEVER EXPLICIET VROEG.
   *
   * Vijftien geblokkeerde kennisvoorstellen op één doelpagina, met een
   * HOGERE score dan het nieuwsitem — want zo lag het in productie: de
   * werkvoorraad sorteert op `totaalscore desc`, en een kennisstapel die
   * bovenaan staat eet het rondebudget op voordat het nieuws aan de beurt
   * is.
   *
   * ROOD OP DE CODE VAN e9f8cc64: de taak leest de hele
   * CONCEPTEERBARE_BESLUITEN-lijst, pakt de drie hoogste kennisvoorstellen
   * en laat het nieuwsitem staan.
   */
  test("6 · vijftien geblokkeerde kennisvoorstellen houden de nieuwsketen niet tegen", async () => {
    for (let i = 0; i < 15; i += 1) {
      await maakGeblokkeerdeKandidaat({
        besluit: i % 2 === 0 ? "KNOWLEDGE_UPDATE" : "UPDATE_EXISTING",
        pad: KENNISPAD,
        score: 90,
      });
    }
    const nieuws = await maakNieuwsKandidaat({
      titel: "ACM stelt de tarieven voor grootverbruikers vast",
      score: 40,
    });

    const uit = await draai();

    const versies = await versiesVan(nieuws.kandidaatId);
    assert.equal(
      versies.length,
      1,
      `de NEWS_ITEM-kandidaat hoort verwerkt te zijn; uitkomst was: ${String(uit)}`,
    );
    assert.equal(versies[0]!.status, "ter_review");
    assert.match(versies[0]!.pad, /^\/nieuws\//, "en op een nieuwspad te staan");
    assert.equal(
      await statusVan(nieuws.kandidaatId),
      "in_concept",
      "en de kandidaat hoort afgewerkt te zijn",
    );

    /* EN GEEN ENKELE KENNISVERSIE. De taak hangt vóór de
       beleidsgoedkeuring en de autonome uitgifte; die weg is voor
       nieuws. Kennisupdates lopen via `npm run concept`, de menselijke
       weg. */
    const paden = await allePaden();
    assert.equal(
      paden.filter((p) => p === KENNISPAD).length,
      0,
      "de taak hoort geen kennisupdate te concepten",
    );
  });

  /**
   * 7 · ÉÉN BRONBESLUIT, ÉÉN CONCEPTVERSIE.
   *
   * Drie kandidaten op DEZELFDE gebeurtenis is de nieuwsvariant van de
   * gemeten productieronde: één bronbesluit, één doelpad, en onder de
   * oude selectie drie versies met versienummer 1, 2 en 3.
   *
   * ROOD OP e9f8cc64: drie versies op één pad.
   */
  test("7 · één gebeurtenis levert binnen één ronde één conceptversie", async () => {
    const eerste = await maakNieuwsKandidaat({
      titel: "TenneT meldt nieuwe ruimte op het hoogspanningsnet",
      score: 70,
      clusterSleutel: "tennet-ronde7",
    });
    const tweede = await maakNieuwsKandidaat({
      titel: "TenneT meldt nieuwe ruimte op het hoogspanningsnet",
      score: 69,
      clusterSleutel: "tennet-ronde7",
      gebeurtenisId: eerste.gebeurtenisId,
    });
    const derde = await maakNieuwsKandidaat({
      titel: "TenneT meldt nieuwe ruimte op het hoogspanningsnet",
      score: 68,
      clusterSleutel: "tennet-ronde7",
      gebeurtenisId: eerste.gebeurtenisId,
    });

    const voor = (await allePaden()).length;
    await draai();
    const na = await allePaden();

    assert.equal(na.length, voor + 1, "precies één nieuwe versie voor dit bronbesluit");
    const samen =
      (await versiesVan(eerste.kandidaatId)).length +
      (await versiesVan(tweede.kandidaatId)).length +
      (await versiesVan(derde.kandidaatId)).length;
    assert.equal(samen, 1, "en niet drie versies op hetzelfde pad");
    /* GEEN TWEEDE VERSIENUMMER OP HETZELFDE PAD, de signatuur van de
       gemeten ronde. */
    const nieuwPad = na[na.length - 1]!;
    assert.equal(
      na.filter((p) => p === nieuwPad).length,
      1,
      "en het pad draagt geen tweede versie",
    );
  });

  /**
   * 7b · TWEE GEBEURTENISSEN MET DEZELFDE KOP ZIJN ÉÉN PAD.
   *
   * Dit is de padsleutel los van de bronsleutel: twee eigen
   * gebeurtenissen, dus twee eigen bronbesluiten, maar het pad van een
   * nieuwsbericht komt uit de TITEL
   * (`/nieuws/<slug(titel)>`, inhoud/concept.ts regel 372-375). Zonder
   * padsleutel zouden dit twee versies op één pad zijn — precies de vorm
   * van ronde 714, alleen in de nieuwsvariant.
   *
   * ROOD OP e9f8cc64: twee versies op hetzelfde pad, met versienummer 1
   * en 2.
   */
  test("7b · twee gebeurtenissen met dezelfde kop leveren één conceptversie", async () => {
    const kop = "Netbeheerder kondigt onderhoud aan het regionale net aan";
    const een = await maakNieuwsKandidaat({
      titel: kop,
      score: 60,
      clusterSleutel: "onderhoud-ronde7b",
    });
    const twee = await maakNieuwsKandidaat({
      titel: kop,
      score: 59,
      clusterSleutel: "onderhoud-ronde7b",
    });
    assert.notEqual(een.gebeurtenisId, twee.gebeurtenisId, "dit zijn twee bronbesluiten");

    const voor = await allePaden();
    const uit = String(await draai());
    const na = await allePaden();

    assert.equal(na.length, voor.length + 1, `precies één nieuwe versie; ronde: ${uit}`);
    const nieuwPad = na[na.length - 1]!;
    assert.equal(na.filter((p) => p === nieuwPad).length, 1, "en geen tweede versie op dat pad");
  });

  /**
   * 8 · ÉÉN ONDERWERP EET DE RONDE NIET OP.
   *
   * Drie kandidaten in één cluster met de hoogste scores plus één in een
   * ander cluster. Het plafond van drie blijft, maar de drie plekken
   * mogen niet alle drie naar hetzelfde onderwerp gaan.
   *
   * ROOD OP e9f8cc64: de drie hoogste scores komen uit één cluster en het
   * tweede onderwerp komt die ronde niet aan de beurt.
   */
  test("8 · één onderwerp mag het rondebudget niet opeten", async () => {
    const a1 = await maakNieuwsKandidaat({
      titel: "Netbeheerder opent een extra transportwindow in Twente",
      score: 88,
      clusterSleutel: "netcongestie-ronde8",
    });
    const a2 = await maakNieuwsKandidaat({
      titel: "Netbeheerder publiceert de wachtlijst voor Twente",
      score: 87,
      clusterSleutel: "netcongestie-ronde8",
    });
    const a3 = await maakNieuwsKandidaat({
      titel: "Netbeheerder verlengt de proef met congestiemanagement",
      score: 86,
      clusterSleutel: "netcongestie-ronde8",
    });
    const b1 = await maakNieuwsKandidaat({
      titel: "RVO verlengt de aanvraagtermijn van de SDE-regeling",
      score: 50,
      clusterSleutel: "subsidie-ronde8",
    });

    const uit = String(await draai());

    const uitA =
      (await versiesVan(a1.kandidaatId)).length +
      (await versiesVan(a2.kandidaatId)).length +
      (await versiesVan(a3.kandidaatId)).length;
    const uitB = (await versiesVan(b1.kandidaatId)).length;

    /* TWEE, EN NIET "ten hoogste twee". Het plafond per onderwerp is
       MAX_PER_RONDE - 1, dus het hoogste onderwerp hoort zijn twee
       plekken te KRIJGEN; een één zou betekenen dat de verdeling het
       budget onnodig laat liggen. */
    assert.equal(uitA, 2, `het hoogste onderwerp hoort twee plekken te krijgen; ronde: ${uit}`);
    assert.equal(uitB, 1, `het tweede onderwerp hoort aan de beurt te komen; ronde: ${uit}`);
    assert.equal(
      (await statusVan(a3.kandidaatId)),
      "open",
      "en de derde van dat onderwerp blijft staan voor de volgende ronde",
    );
  });

  /**
   * 9 · EEN GEBLOKKEERD CONCEPT KOMT NIET ELKE RONDE TERUG.
   *
   * Dit meet wat de kop van de handler BEWEERT: maakConcept() zet de
   * kandidaat op 'in_concept' en de werkvoorraad vraagt 'open', dus een
   * concept dat de poorten NIET haalt wordt niet elk uur opnieuw
   * opgebouwd. Zonder deze meting is dat een aanname — en de aanname gaat
   * precies over het geval dat in productie optrad: drie geblokkeerde
   * versies.
   *
   * DEZE ZAAK MEET DE HERSELECTIE EN NIET HET PLAFOND, en daarom worden
   * de versies van de vorige zaken eerst AFGEWEZEN. Gemeten in de rode
   * run: met acht of meer concepten op review meldt de taak
   * "overgeslagen: er staan al N concepten op review" en bouwt hij
   * helemaal niets — dan zou deze zaak groen of rood kunnen zijn om een
   * reden die niets met herselectie te maken heeft. Afwijzen en niet
   * verwijderen: intel.publicatiebesluiten verwijst met ON DELETE
   * RESTRICT naar de versie, en dat auditspoor blijft.
   *
   * Deze zaak hoorde op e9f8cc64 al groen te zijn — 'in_concept' is daar
   * al de rem — en hij staat er omdat de reparatie die rem niet mag
   * slopen.
   */
  test("9 · een geblokkeerd concept wordt niet elke ronde opnieuw opgepakt", async () => {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `update intel.inhoud_versies set status = 'afgewezen'
          where organisatie_id = $1 and status = 'ter_review'`,
        [org],
      );
    });

    const k = await maakNieuwsKandidaat({
      titel: "Gemeente Hengelo wijst een nieuw bedrijventerrein aan",
      score: 30,
      clusterSleutel: "vastgoed-ronde9",
    });

    const eerste = String(await draai());
    assert.doesNotMatch(
      eerste,
      /overgeslagen/,
      `het plafond hoort ruimte te hebben; ronde: ${eerste}`,
    );
    const na1 = await versiesVan(k.kandidaatId);
    assert.equal(na1.length, 1, "de eerste ronde maakt één versie");
    assert.equal(await statusVan(k.kandidaatId), "in_concept");

    await draai();
    assert.equal(
      (await versiesVan(k.kandidaatId)).length,
      1,
      "en de tweede ronde pakt hem niet opnieuw op",
    );
  });
});
