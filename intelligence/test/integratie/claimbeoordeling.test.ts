/* ============================================================
   TEST — het claimbeoordelingsregister (de juridische terugvalroute)
   ------------------------------------------------------------
   WAT DIT REPAREERT. De juridische poort blokkeerde een claim en legde
   dat alleen in een LOGREGEL vast. Een logregel hoort bij de huidige
   Railway-deployment en is na de volgende deploy weg: er was niets om
   op te handelen.

   De toelichtingen beloofden dat zo'n claim "via bronverificatie het
   origineel bij het bevoegde gezag moet vinden". Gemeten op 31 oktober
   2026: die route bestaat alleen voor NAVERTELLINGEN —
   verifieerBijGezag() stapt op bronverificatie.ts:261 uit met
   NIET_VAN_TOEPASSING zodra beschrijftBesluitVan null is, en bij
   precies de geblokkeerde claims is dat altijd zo.

   DRIE EIGENSCHAPPEN, en elke eigenschap is een eis uit de opdracht:

     1 GEEN LUS — dezelfde claim onder dezelfde motorversies vraagt
       precies EEN keer om beoordeling, hoe vaak de pijplijn ook draait
     2 GEEN AUTOMATISCHE OPWAARDERING — een menselijk oordeel verandert
       de uitspraak NIET; alleen de bestaande weg doet dat
     3 BEVESTIGBAAR VRAAGT EEN AUTORISATIE, afgedwongen door de
       database en niet door code
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import {
  alsEigenaar,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { schrijfUitspraken } from "../../src/pijplijn/uitspraken.ts";
import {
  beslisBeoordeling,
  openBeoordelingen,
  vraagOmBeoordeling,
} from "../../src/pijplijn/claimbeoordeling.ts";

/* Een juridische claim die in een ACHTERGRONDpassage staat. Precies de
   gemeten faalwijze: het document is authentiek (bevoegd gezag +
   bekendmakingsvorm) maar stelt deze claim niet vast. */
const DOCUMENTTEKST =
  "De Autoriteit Consument en Markt heeft op 26 oktober 2026 besloten dat Alfa Holding " +
  "uitsluitende zeggenschap mag verkrijgen over Beta Energie. " +
  "Ter achtergrond: het maximumtarief bedraagt vanaf 1 juli 2027 nog 45 euro per maand. " +
  "Belanghebbenden kunnen binnen zes weken bezwaar maken tegen dit besluit.";

describe("het claimbeoordelingsregister", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let versieId = 0;
  let gebeurtenisId = 0;

  before(async () => {
    db = await maakWegwerpdatabase("claimbeoordeling");
    org = await maakOrganisatie(db, "cb-org");
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const b = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            betrouwbaarheid, is_primaire_bron)
         values ($1,'acm-besluiten','ACM','rss','https://www.acm.nl/rss',
                 'https://www.acm.nl',true,'toegestaan','geen_voorbehoud','geverifieerd',
                 'fixture',5,true)
         returning id`,
        [org],
      );
      const d = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
            taal, gepubliceerd_op, datum_herkomst)
         values ($1,$2,'cb-1','https://www.acm.nl/nl/publicaties/concentratie-alfa-beta',
                 'Concentratiebesluit Alfa - Beta','ACM','rss','nl',
                 '2026-10-26T00:00:00Z','feed') returning id`,
        [org, b.rows[0]!.id],
      );
      const v = await c.query<{ id: number }>(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst,
            tekst_lengte, wijziging_soort, injectie_verdacht)
         values ($1,$2,1,'cb-hash','Concentratiebesluit Alfa - Beta',$3,$4,'nieuw',false)
         returning id`,
        [org, d.rows[0]!.id, DOCUMENTTEKST, DOCUMENTTEKST.length],
      );
      versieId = v.rows[0]!.id;
      const g = await c.query<{ id: number }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, gebeurtenis_soort, gebeurd_op,
            risico_klasse, status)
         values ($1,'cb-geb','Concentratie','regelgeving','2026-10-26','laag','nieuw')
         returning id`,
        [org],
      );
      gebeurtenisId = g.rows[0]!.id;
    });
  });

  after(async () => {
    await db?.opruimen();
  });

  /** Precies de aanroep die clusteren.ts in productie doet. */
  async function draaiPijplijn() {
    return metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      schrijfUitspraken(c, org, {
        versieId,
        gebeurtenisId,
        titel: "Concentratiebesluit Alfa - Beta",
        tekst: DOCUMENTTEKST,
        onderwerp: "netbeheer",
        risicoKlasse: "laag",
        isPrimaireBron: true,
        betrouwbaarheid: 5,
        documentsoort: "OFFICIEEL_BESLUIT",
        gezag: "BEVOEGD_GEZAG",
        documentvorm: "BEKENDMAKING",
        bronSleutel: "acm-besluiten",
        peildatum: "2026-10-26",
      }),
    );
  }

  test("1 · een geblokkeerde claim landt in het register, niet alleen in een logregel", async () => {
    const rapport = await draaiPijplijn();
    assert.ok(
      rapport.juridischGeblokkeerd >= 1,
      `de achtergrondzin hoort geblokkeerd te worden (kreeg ${rapport.juridischGeblokkeerd})`,
    );

    const open = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      openBeoordelingen(c, org),
    );
    assert.ok(open.length >= 1, "er hoort een openstaande vraag te staan");
    const tarief = open.find((o) => o.tekst.includes("maximumtarief"));
    assert.ok(tarief, "de tariefclaim hoort erbij te staan");
    assert.equal(
      tarief!.aanleiding,
      "ACHTERGRONDPASSAGE",
      "de AANLEIDING hoort bewaard: 'achtergrond' vraagt een ander oordeel dan 'verkeerde vorm'",
    );
    assert.ok(tarief!.reden.length >= 20, "en een reden die een mens kan navertellen");
  });

  test("2 · de claim zelf blijft ONGEVERIFIEERD", async () => {
    const rij = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ verificatie_status: string }>(
        `select u.verificatie_status
           from intel.uitspraken u
           join intel.claimbeoordeling b on b.uitspraak_id = u.id
          where b.organisatie_id = $1 and u.tekst ilike '%maximumtarief%'
          limit 1`,
        [org],
      );
      return r.rows[0];
    });
    assert.equal(
      rij?.verificatie_status,
      "ongeverifieerd",
      "een doorverwijzing is geen bevestiging",
    );
  });

  test("3 · GEEN LUS — de pijplijn twee keer draaien geeft één rij", async () => {
    const voor = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ n: string }>(
        `select count(*)::text as n from intel.claimbeoordeling where organisatie_id = $1`,
        [org],
      );
      return Number(r.rows[0]!.n);
    });
    await draaiPijplijn();
    await draaiPijplijn();
    const na = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ n: string }>(
        `select count(*)::text as n from intel.claimbeoordeling where organisatie_id = $1`,
        [org],
      );
      return Number(r.rows[0]!.n);
    });
    assert.equal(
      na,
      voor,
      "dezelfde claim onder dezelfde motorversies hoort precies één vraag op te leveren; " +
        "anders groeit het register bij elke uurlijkse ronde",
    );
  });

  test("4 · een ANDERE motorversie is bewust een nieuwe vraag", async () => {
    /* Verandert een motorversie, dan kan het oordeel veranderen en hoort
       er opnieuw naar gekeken te worden. Dat is geen lus: binnen een
       versie blijft het één keer. */
    const uitspraakId = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ id: number }>(
        `select uitspraak_id as id from intel.claimbeoordeling
          where organisatie_id = $1 order by id limit 1`,
        [org],
      );
      return r.rows[0]!.id;
    });
    const nieuw = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      vraagOmBeoordeling(c, org, {
        uitspraakId,
        versieId,
        aanleiding: "ACHTERGRONDPASSAGE",
        reden: "zelfde claim, maar onder een nieuwe motorversie beoordeeld",
        motorversies: "claimaard-v2 + vaststelling-v2",
      }),
    );
    assert.equal(nieuw, true, "een nieuwe motorversie hoort een nieuwe vraag te geven");

    const weer = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      vraagOmBeoordeling(c, org, {
        uitspraakId,
        versieId,
        aanleiding: "ACHTERGRONDPASSAGE",
        reden: "zelfde claim, zelfde nieuwe motorversie, tweede poging",
        motorversies: "claimaard-v2 + vaststelling-v2",
      }),
    );
    assert.equal(weer, false, "en binnen die versie blijft het één keer");
  });

  test("5 · BEVESTIGBAAR zonder autorisatie wordt door de DATABASE geweigerd", async () => {
    const id = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ id: number }>(
        `select id from intel.claimbeoordeling
          where organisatie_id = $1 and besloten_op is null order by id limit 1`,
        [org],
      );
      return r.rows[0]!.id;
    });
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query(
            `update intel.claimbeoordeling
                set besloten_op = now(), besluit = 'BEVESTIGBAAR', door = 'toets'
              where organisatie_id = $1 and id = $2`,
            [org, id],
          ),
        ),
      /claimbeoordeling_bevestigbaar_vraagt_autorisatie/,
      "de onveilige kant hoort een naam te dragen, afgedwongen door de database",
    );
  });

  test("5b · AFGEWEZEN mag zonder autorisatie — dat is de veilige kant", async () => {
    const id = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ id: number }>(
        `select id from intel.claimbeoordeling
          where organisatie_id = $1 and besloten_op is null order by id limit 1`,
        [org],
      );
      return r.rows[0]!.id;
    });
    const ok = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      beslisBeoordeling(c, org, id, {
        besluit: "AFGEWEZEN",
        door: "toets",
        toelichting: "achtergrondzin, geen vaststelling door dit stuk",
      }),
    );
    assert.equal(ok, true);
  });

  test("6 · GEEN OPWAARDERING — een beslissing verandert de uitspraak niet", async () => {
    const id = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ id: number }>(
        `select id from intel.claimbeoordeling
          where organisatie_id = $1 and besloten_op is null order by id limit 1`,
        [org],
      );
      return r.rows[0]?.id ?? 0;
    });
    if (id === 0) return; // alle vragen al beslist in een eerdere toets

    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      beslisBeoordeling(c, org, id, {
        besluit: "BEVESTIGBAAR",
        door: "toets",
        autorisatie: "acceptatieronde 2026-10-31",
        toelichting: "een mens acht de claim juridisch gedekt",
      }),
    );

    const status = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ verificatie_status: string }>(
        `select u.verificatie_status
           from intel.uitspraken u
           join intel.claimbeoordeling b on b.uitspraak_id = u.id
          where b.organisatie_id = $1 and b.id = $2`,
        [org, id],
      );
      return r.rows[0]?.verificatie_status;
    });
    assert.equal(
      status,
      "ongeverifieerd",
      "zelfs BEVESTIGBAAR met autorisatie mag de claim niet opwaarderen; " +
        "dat is per constructie de enige garantie dat historische claims veilig zijn",
    );
  });

  test("7 · de identiteit van een vraag staat vast", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, (c) =>
          c.query(
            `update intel.claimbeoordeling set aanleiding = 'ANDER_GEZAG'
              where organisatie_id = $1`,
            [org],
          ),
        ),
      /identiteit van een claimbeoordeling staat vast/,
      "een andere aanleiding is een nieuwe rij, geen herschreven rij",
    );
  });

  test("8 · een mislukte doorverwijzing laat de ingestie niet vallen", async () => {
    /* Eigenschap 3 uit de kop van claimbeoordeling.ts: een reparatie aan
       de bewijsketen mag de ophaalronde niet breken. Een onbestaande
       uitspraak_id schendt de foreign key. */
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      vraagOmBeoordeling(c, org, {
        uitspraakId: 2_147_483_600,
        versieId,
        aanleiding: "ACHTERGRONDPASSAGE",
        reden: "een uitspraak die niet bestaat, om de foutweg te toetsen",
        motorversies: "toets",
      }),
    );
    assert.equal(uit, false, "hij hoort false te geven en niet te gooien");
  });
});
