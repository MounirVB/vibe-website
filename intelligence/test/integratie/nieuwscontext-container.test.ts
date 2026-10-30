/* ============================================================
   INTEGRATIE — de nieuwsselectie in de containerindeling (R2.1)
   ------------------------------------------------------------
   WAT HIER WORDT NAGESPEELD, en waarom het een integratietoets moet
   zijn en geen eenheidstoets.

   De productiestoring van 29 oktober 2026 zat niet in de rekenlaag maar
   in de INDELING: `rootDirectory: intelligence` maakt `/app` gelijk aan
   de intelligence-map, `INTEL_SITE_WORTEL` is daar leeg, en
   `config.siteWortel` komt daardoor uit op een plek zonder
   `data/inhoud` en zonder `data/seo/routes.json`. Die situatie is
   alleen echt na te spelen door de ENV te zetten die de container zet,
   de ECHTE taakhandler te draaien en in een ECHTE database te kijken
   wat er geschreven is.

   Dat is precies wat hier gebeurt: een lege sitewortel plus het echte,
   gecommitte sitekennisartefact van deze checkout — de twee bronnen die
   de container óók heeft.

   WAT DEZE TOETS WEL EN NIET DEKT. De handler leest het artefact onder
   APP_WORTEL, en APP_WORTEL wordt uit het modulepad afgeleid. Een
   ONBRUIKBAAR artefact is daarom in deze toets niet af te dwingen zonder
   configuratie toe te voegen die alleen voor de test bestaat; dat pad
   staat in test/eenheid/nieuwscontext-bronorde.test.ts, waar beide
   wortels parameters zijn. Hier wordt het pad getoetst dat in productie
   stuk was: artefact aanwezig, repo-bronnen afwezig.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { maakWegwerpdatabase, maakOrganisatie, alsEigenaar, type Wegwerpdatabase } from "../harnas.ts";
import { configVergeten } from "../../src/kern/config.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { REGISTER } from "../../src/kern/taken.ts";
import { NIEUWSMOTOR_VERSIE, nieuwsselectieronde } from "../../src/pijplijn/nieuwsselectie.ts";
import { leesNieuwsContext } from "../../src/site/nieuwscontext.ts";

/* De eigenaarroute van het cluster `netcongestie` uit CLUSTER_NAAR_ROUTE.
   Hij staat in het echte artefact; dat is juist de hele claim. */
const EIGENAAR_ROUTE = "kennis/netcongestie-uitgelegd";

describe("de nieuwsselectie in de containerindeling", () => {
  let db: Wegwerpdatabase;
  let org: number;
  let gebeurtenisId: number;
  let origineleSiteWortel: string | undefined;

  before(async () => {
    db = await maakWegwerpdatabase("nieuwscontext-container");
    org = await maakOrganisatie(db, "vibe-energy");

    /* DE CONTAINER NAGESPEELD: een sitewortel waar de website niet staat.
       Dit is geen kunstgreep — het is wat `config.siteWortel` in
       productie oplevert, gemeten op 29 oktober 2026. */
    origineleSiteWortel = process.env["INTEL_SITE_WORTEL"];
    const leeg = await mkdtemp(join(tmpdir(), "container-zonder-site-"));
    process.env["INTEL_SITE_WORTEL"] = leeg;
    configVergeten();

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);

      const bron = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs)
         values ($1,'acm-besluiten','ACM','rss','https://www.acm.nl/feed','https://www.acm.nl',
                 true,'toegestaan','geen_voorbehoud','geverifieerd','fixture')
         returning id`,
        [org],
      );
      const doc = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort, gepubliceerd_op)
         values ($1,$2,'fix-1','https://www.acm.nl/besluit-1','ACM stelt nettarieven vast','ACM','rss', now())
         returning id`,
        [org, bron.rows[0]!.id],
      );
      const versie = await c.query<{ id: number }>(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte)
         values ($1,$2,1,'hash-1','ACM stelt nettarieven vast','De tarieven voor 2027 zijn vastgesteld.',38)
         returning id`,
        [org, doc.rows[0]!.id],
      );
      const cluster = await c.query<{ id: number }>(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam)
         values ($1,'netcongestie','Netcongestie') returning id`,
        [org],
      );
      /* `relevantie_grondslag` moet gevuld zijn: constraint
         gebeurtenissen_relevantie_heeft_grondslag eist dat een
         geclassificeerde gebeurtenis zijn onderbouwing draagt. Een score
         zonder uitleg is in dit systeem geen score. */
      const geb = await c.query<{ id: number }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, samenvatting, gebeurtenis_soort, materialiteit,
            bedrijfsrelevantie, relevantie_categorie, relevantie_grondslag,
            onderwerp_cluster_id, aantal_bronnen)
         values ($1,'fix-geb','ACM stelt de nettarieven voor 2027 vast','Samenvatting',
                 'regelgeving',70,85,'regelgeving',$3::jsonb,$2,1)
         returning id`,
        [
          org,
          cluster.rows[0]!.id,
          JSON.stringify({ termen: ["nettarief"], reden: "fixture voor de containertoets" }),
        ],
      );
      gebeurtenisId = geb.rows[0]!.id;

      const uitspraak = await c.query<{ id: number }>(
        `insert into intel.uitspraken
           (organisatie_id, gebeurtenis_id, tekst, soort, verificatie_status, bewijs_kwaliteit)
         values ($1,$2,'De nettarieven stijgen met 12 procent in 2027.','cijfer','ongeverifieerd',4)
         returning id`,
        [org, gebeurtenisId],
      );
      await c.query(
        `insert into intel.uitspraak_bronnen (organisatie_id, uitspraak_id, versie_id, rol)
         values ($1,$2,$3,'primair')`,
        [org, uitspraak.rows[0]!.id, versie.rows[0]!.id],
      );
      /* Pas NA de primaire bron mag de uitspraak bevestigd worden; de
         trigger uitspraken_bewijsplicht weigert dat anders.

         R3 — DE MODALITEIT HOORT HIER OOK GEZET TE WORDEN. Deze fixture
         schrijft claims rechtstreeks met SQL en gaat dus niet door
         schrijfUitspraken(), die de modaliteit normaal bepaalt. Zonder
         die velden is `dragende_claims` NULL en luidt de bindende
         afwijsgrond 'NIET GEMETEN' — correct gedrag, want een claim
         zonder modaliteitsoordeel mag geen bericht dragen, maar dan
         toetst deze test niet meer wat hij beweert te toetsen. De velden
         staan hier net zo expliciet als `verificatie_status` en
         `bewijs_kwaliteit` er al stonden. */
      await c.query(
        `update intel.uitspraken
            set verificatie_status   = 'bevestigd',
                modaliteit           = 'VASTGESTELD',
                modaliteit_zekerheid = 0.80,
                modaliteit_versie    = 'fixture',
                bewijskracht_plafond = 5
          where id = $1`,
        [uitspraak.rows[0]!.id],
      );
      /* De koppeling gebeurtenis -> document -> versie is wat de
         selectie als `onafhankelijke_bronnen` telt; zonder die rij is de
         bronas nul en haalt de kandidaat de totaalscoredrempel niet. */
      await c.query(
        `insert into intel.gebeurtenis_documenten
           (organisatie_id, gebeurtenis_id, brondocument_id, versie_id, rol)
         values ($1,$2,$3,$4,'primair')`,
        [org, gebeurtenisId, doc.rows[0]!.id, versie.rows[0]!.id],
      );
    });
  });

  after(async () => {
    if (origineleSiteWortel === undefined) delete process.env["INTEL_SITE_WORTEL"];
    else process.env["INTEL_SITE_WORTEL"] = origineleSiteWortel;
    configVergeten();
    await db?.opruimen();
  });

  /* ---------- 2 · de context komt uit het artefact ---------- */
  test("de context komt in de containerindeling uit het artefact, met eigenaren", async () => {
    const { configLezen } = await import("../../src/kern/config.ts");
    const ctx = await leesNieuwsContext(configLezen().siteWortel);

    assert.equal(ctx.herkomst.bron, "artefact", "de repo-bronnen staan niet in de container");
    assert.equal(ctx.toestand, "GELDIGE_CONTEXT_MET_EIGENAARS");
    assert.ok(
      ctx.herkomst.clustersMetEigenaar > 0,
      "dit getal was in productie 0 en is de hele reden van deze reparatie",
    );
    assert.equal(
      ctx.eigenaren.get("netcongestie")?.route,
      EIGENAAR_ROUTE,
      "het cluster van de fixture hoort zijn echte eigenaar te krijgen",
    );
  });

  /* ---------- 11 + 12 + 14 · de ECHTE taakhandler, zoals planner en worker hem draaien ---------- */
  test("11,12,14 · de taak nieuwsselectie draait en schrijft een NEWS_ITEM", async () => {
    const handler = REGISTER["nieuwsselectie"];
    assert.ok(handler, "de taaksoort nieuwsselectie hoort in het REGISTER te staan");

    /* Hiervóór gooide deze handler hier een IntelFout('configuratie'):
       hij toetste de aanwezigheid van twee bestanden uit de repo-wortel
       in plaats van de bruikbaarheid van de context. */
    const uitkomst = await handler(db.pool, org, {});

    assert.match(
      uitkomst,
      /context GELDIGE_CONTEXT_MET_EIGENAARS via artefact/,
      "de uitkomstregel moet de herkomst van de context noemen, anders is een nul niet te wegen",
    );
    assert.match(uitkomst, /geschikt 1/, `verwachtte één geschikte kandidaat, kreeg: ${uitkomst}`);

    const rijen = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ besluit: string; status: string; nieuwsscore: number; motor_versie: string }>(
        `select besluit, status, nieuwsscore, motor_versie
           from intel.inhoud_kandidaten
          where gebeurtenis_id = $1 and motor_versie = $2`,
        [gebeurtenisId, NIEUWSMOTOR_VERSIE],
      ),
    );

    assert.equal(rijen.rows.length, 1, "precies één NEWS_ITEM-rij");
    assert.equal(rijen.rows[0]!.besluit, "NEWS_ITEM");
    assert.equal(rijen.rows[0]!.status, "open", "een kandidaat staat open, niet goedgekeurd");
    assert.ok(rijen.rows[0]!.nieuwsscore >= 45, "de score hoort boven de werkvoorraaddrempel te staan");
  });

  /* ---------- 7 · idempotentie: geen bulk bij een tweede ronde ---------- */
  test("7 · een tweede ronde werkt dezelfde rij bij en maakt geen tweede kandidaat", async () => {
    const handler = REGISTER["nieuwsselectie"]!;
    await handler(db.pool, org, {});
    await handler(db.pool, org, {});

    const telling = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: string | number }>(
        `select count(*) as n from intel.inhoud_kandidaten
          where gebeurtenis_id = $1 and motor_versie = $2`,
        [gebeurtenisId, NIEUWSMOTOR_VERSIE],
      ),
    );

    /* count(*) is bigint; of de driver er een string of een getal van
       maakt hangt van de typeparsers af. De telling is het punt, niet
       het type. */
    assert.equal(
      Number(telling.rows[0]!.n),
      1,
      "drie rondes op dezelfde gebeurtenis mogen één rij opleveren; anders loopt een herstelde planner vol",
    );
  });

  /* ---------- 15 · geen eigenaar, geen kandidaat ---------- */
  test("15 · zonder eigenaren wordt er niets geschreven en noemt de afwijsgrond de eigenaar", async () => {
    const rapport = await nieuwsselectieronde(db.pool, org, {
      eigenaren: new Map(),
      bronsoortPerSleutel: new Map([["acm-besluiten", "TOEZICHTHOUDER"]]),
      bestaandeNieuwsSlugs: new Set(),
      droog: true,
    });

    assert.equal(rapport.geschikt, 0, "zonder eigenaar kan niets geschikt zijn");
    assert.equal(rapport.kandidatenGeschreven, 0);
    assert.ok(
      Object.keys(rapport.perAfwijsgrond).some((g) => g.includes("eigenaar")),
      `de bindende grond hoort de eigenaar te noemen; kreeg: ${JSON.stringify(rapport.perAfwijsgrond)}`,
    );
  });

  /* ---------- 13 · de CLI, als echt subproces in containerconfiguratie ---------- */
  test("13 · de CLI draait droog in de containerindeling en noemt het artefact als bron", async () => {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const uitvoeren = promisify(execFile);

    /* Een subproces, want alleen zo wordt de ECHTE opstartweg gedraaid:
       configLezen() op verse env, maakPool(), huidigeOrganisatie() en
       daarna de context. --droog zodat er niets geschreven wordt. */
    const { stdout } = await uitvoeren(
      process.execPath,
      ["src/cli/nieuws.ts", "--droog", "--toon", "5"],
      {
        cwd: new URL("../..", import.meta.url).pathname,
        env: {
          ...process.env,
          INTEL_DB_URL: db.url,
          INTEL_SITE_WORTEL: process.env["INTEL_SITE_WORTEL"]!,
          INTEL_OMGEVING: "test",
        },
      },
    );

    assert.match(stdout, /toestand\s+GELDIGE_CONTEXT_MET_EIGENAARS/);
    assert.match(stdout, /bron\s+artefact/);
    assert.match(stdout, /BEPERKING/, "de CLI hoort de beperkingen van de leesweg te tonen");
    assert.match(stdout, /Er is niets gepubliceerd en niets goedgekeurd\./);

    const telling = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: string | number }>(
        "select count(*) as n from intel.inhoud_kandidaten where motor_versie = $1",
        [NIEUWSMOTOR_VERSIE],
      ),
    );
    assert.equal(
      Number(telling.rows[0]!.n),
      1,
      "--droog mag de rij uit de eerdere toets niet vermeerderen en geen nieuwe schrijven",
    );
  });

  /* ---------- de drempels zijn niet verlaagd ---------- */
  test("13 · de drempels van de nieuwsmotor staan onveranderd", async () => {
    const { NIEUWSDREMPELS, DRAGENDE_BRONSOORTEN } = await import(
      "../../src/pijplijn/nieuwsselectie.ts"
    );

    /* EXACTE VERZAMELING, geen bevat-toets. Een reparatie aan de
       contextlaag mag de poort niet verruimen, en een nieuwe dragende
       bronsoort hoort een eigen besluit te zijn. */
    assert.deepEqual({ ...NIEUWSDREMPELS }, {
      materialiteit: 45,
      bewijskwaliteit: 4,
      totaalscore: 45,
      maxLeeftijdDagen: 120,
    });
    assert.deepEqual(
      [...DRAGENDE_BRONSOORTEN].sort(),
      ["NETBEHEERDER", "STATISTIEK", "TOEZICHTHOUDER", "WETGEVING"],
    );
  });
});
