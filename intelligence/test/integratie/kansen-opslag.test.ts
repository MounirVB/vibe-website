/* ============================================================
   TEST — kansen opslaan: dedup in de database, besluit bij de mens
   ------------------------------------------------------------
   DRIE DINGEN DIE HIER ECHT KUNNEN MISGAAN

   1. DUBBELTELLING. Gemeten op de bron: 100 publicaties, 72 unieke
      kenmerken. De dedup zit in `identiteit` plus het partiële unieke
      index uit 0020. Een toets die alleen de code aanroept bewijst de
      code; deze toets probeert ook de database zelf te laten dubbelen.

   2. EEN TWEEDE RONDE DIE EEN MENSBESLUIT WIST. De pijplijn draait elke
      zes uur. Als die een kans die op IN_BEHANDELING staat terugzet naar
      ONDERZOEK_NODIG, is het dashboard onbruikbaar — en dat soort fout
      merk je pas weken later.

   3. EEN RECTIFICATIE DIE NIET DOORKOMT. Precies het omgekeerde: de
      FEITEN moeten wel bijwerken, ook bij een kans die in behandeling
      is. Kenmerk 599611 verzette zijn sluitingsdatum van 2026-10-08
      naar 2026-12-02; een platform dat die wijziging tegenhoudt omdat
      een mens de kans had opgepakt, laat hem een deadline missen.

   Punt 2 en 3 trekken tegengesteld, en daarom staan ze hier beide.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie, rijen } from "../../src/kern/db.ts";
import { leesWerkvoorraad, schrijfKansen } from "../../src/commercieel/kansenopslag.ts";
import { groepeer, kwalificeer, type Kans, type Publicatie } from "../../src/commercieel/kansen.ts";
import { classificeer } from "../../src/pijplijn/relevantie.ts";
import { herkenOnderwerpen } from "../../src/pijplijn/onderwerpen.ts";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const VANDAAG = "2026-10-12";

type FixtureRij = {
  externId: string;
  url: string;
  titel: string;
  gepubliceerdOp: string;
  uitgever: string;
  tekstLengte: number;
  extra: Record<string, unknown>;
};

const FIXTURE = JSON.parse(
  readFileSync(join(HIER, "..", "data", "tenderned-vier-signalen.json"), "utf8"),
) as { publicaties: FixtureRij[] };

/**
 * Zaait de bronketen voor een organisatie en geeft externId -> brondocument_id terug.
 *
 * DIT MOET ECHT. De eerste versie van deze toets gebruikte het
 * TenderNed-publicatienummer als brondocument_id, en de foreign key
 * kans_publicaties_brondocument_id_fkey wees dat terecht af. Dat was
 * geen testprobleem om weg te configureren: in productie IS dat veld een
 * verwijzing naar intel.brondocumenten, en een toets die dat niet
 * nabouwt, toetst de verkeerde vorm.
 */
async function zaaiDocumenten(
  db: Wegwerpdatabase,
  org: number,
): Promise<Map<string, number>> {
  const kaart = new Map<string, number>();
  await alsEigenaar(db, async (c) => {
    await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
    const bron = await c.query<{ id: number }>(
      `insert into intel.bronnen
         (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
          robots_status, tdm_status, verificatie_status, verificatie_bewijs,
          mag_citeren, citaat_limiet_tekens)
       values ($1,'tenderned-publicaties','TenderNed','json_api',
               'https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties',
               'https://www.tenderned.nl',true,'toegestaan','geen_voorbehoud',
               'geverifieerd','fixture 2026-10-12', false, 0)
       returning id`,
      [org],
    );
    for (const r of FIXTURE.publicaties) {
      const doc = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
            gepubliceerd_op, extra)
         values ($1,$2,$3,$4,$5,'TenderNed','json_api',$6,$7)
         returning id`,
        [
          org,
          bron.rows[0]!.id,
          r.externId,
          r.url,
          r.titel,
          r.gepubliceerdOp,
          JSON.stringify(r.extra),
        ],
      );
      kaart.set(r.externId, doc.rows[0]!.id);
    }
  });
  return kaart;
}

function rijenVoor(ids: readonly string[], docIds: Map<string, number>) {
  return FIXTURE.publicaties
    .filter((r) => ids.includes(r.externId))
    .map((r) => ({
      opdrachtgever: String(r.extra["opdrachtgeverNaam"] ?? ""),
      publicatie: {
        gebeurtenisId: null,
        brondocumentId: docIds.get(r.externId) ?? null,
        url: r.url,
        titel: r.titel,
        gepubliceerdOp: r.gepubliceerdOp,
        uitgever: r.uitgever,
        tekstLengte: r.tekstLengte,
        extra: r.extra,
      } satisfies Publicatie,
    }));
}

function kansenVoor(ids: readonly string[], docIds: Map<string, number>): Kans[] {
  return groepeer(rijenVoor(ids, docIds)).map((g) => {
    const titel = g.publicaties[g.publicaties.length - 1]!.titel;
    return kwalificeer({
      opdrachtgever: g.opdrachtgever,
      publicaties: g.publicaties,
      relevantie: classificeer({
        titel,
        onderwerpen: herkenOnderwerpen(titel, ""),
        gebeurtenisSoort: "aanbesteding",
      }),
      relevanteOplossingen: ["batterijopslag", "zonnestroom"],
      vandaag: VANDAAG,
      identiteit: g.identiteit,
      identiteitGrondslag: g.identiteitGrondslag,
    });
  });
}

describe("kansen opslaan", () => {
  let db: Wegwerpdatabase;
  let organisatieId: number;
  let docIds: Map<string, number>;

  before(async () => {
    db = await maakWegwerpdatabase("kansen-opslag");
    organisatieId = await maakOrganisatie(db, "vibe-energy");
    docIds = await zaaiDocumenten(db, organisatieId);
  });

  after(async () => {
    await db.opruimen();
  });

  test("vier publicaties worden drie rijen, en een tweede ronde verandert dat niet", async () => {
    const eerste = await schrijfKansen(db.pool, organisatieId, kansenVoor(["434533", "443632", "443550", "441673"], docIds));
    assert.equal(eerste.nieuw, 3, `verwacht 3 nieuwe kansen, kreeg ${eerste.nieuw}`);
    assert.equal(eerste.mislukt, 0);
    assert.equal(eerste.publicatiesToegevoegd, 4, "alle vier de publicaties horen bewaard te blijven");

    /* DE PIJPLIJN DRAAIT OPNIEUW. Niets mag verdubbelen. */
    const tweede = await schrijfKansen(db.pool, organisatieId, kansenVoor(["434533", "443632", "443550", "441673"], docIds));
    assert.equal(tweede.nieuw, 0, "een tweede ronde mag geen nieuwe kansen maken");
    assert.equal(tweede.bijgewerkt, 3);

    const geteld = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      rijen<{ n: string }>(c, "select count(*)::text as n from intel.kansen", []),
    );
    assert.equal(geteld[0]!.n, "3", "er horen precies drie kansen in de tabel te staan");

    const pubs = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      rijen<{ n: string }>(c, "select count(*)::text as n from intel.kans_publicaties", []),
    );
    assert.equal(pubs[0]!.n, "4", "en vier publicaties, niet acht");
  });

  test("de database WEIGERT een tweede rij voor hetzelfde kenmerk", async () => {
    /* Niet de code vragen of hij netjes is, maar de database proberen te
       laten dubbelen. Het partiële unieke index uit 0020 hoort dit te
       blokkeren, ook als de code ooit regresseert. */
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId }, (c) =>
          c.query(
            `insert into intel.kansen
               (organisatie_id, opdrachtgever, project, identiteit, identiteit_grondslag,
                fase, fase_grondslag, status)
             values ($1, 'Veiligheidsregio Rotterdam-Rijnmond', 'Dubbel', 'kenmerk:599611',
                     'poging tot dubbel', 'open', array['toets'], 'NIEUW')`,
            [organisatieId],
          ),
        ),
      /kansen_identiteit_uniek|duplicate key/i,
      "een tweede rij met kenmerk:599611 hoort door de database geweigerd te worden",
    );
  });

  test("de database weigert een eindstand in de werkvoorraad", async () => {
    /* De grendel onder de fout van publicatie 441673: een gegunde
       aanbesteding mag niet in een status staan die werk suggereert. */
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId }, (c) =>
          c.query(
            `insert into intel.kansen
               (organisatie_id, opdrachtgever, project, identiteit, fase, fase_grondslag, status)
             values ($1, 'Test', 'Gegund maar in behandeling', 'kenmerk:eindstandtoets',
                     'gegund', array['toets'], 'IN_BEHANDELING')`,
            [organisatieId],
          ),
        ),
      /kansen_eindstand_niet_in_werkvoorraad/i,
      "een gegunde aanbesteding hoort niet op IN_BEHANDELING te kunnen staan",
    );
  });

  test("een gegunde aanbesteding staat niet in de werkvoorraad", async () => {
    const werk = await leesWerkvoorraad(db.pool, organisatieId);
    const opdrachtgevers = werk.map((w) => w.opdrachtgever);
    assert.ok(
      !opdrachtgevers.some((o) => /Limburg/i.test(o)),
      `de gegunde Limburg-aanbesteding staat in de werkvoorraad: ${opdrachtgevers.join(", ")}`,
    );
    assert.equal(werk.length, 2, `verwacht 2 openstaande kansen, kreeg ${werk.length}`);
  });

  test("de werkvoorraad toont Nederlandse labels, niet de enum", async () => {
    /* §27: een technische enumwaarde is geen label voor een mens. */
    for (const w of await leesWerkvoorraad(db.pool, organisatieId)) {
      assert.ok(w.fase_label, `${w.opdrachtgever} mist een faselabel`);
      assert.notEqual(w.fase_label, w.fase, "het label mag niet de ruwe enumwaarde zijn");
      assert.ok(
        !/^[a-z_]+$/.test(w.fase_label),
        `'${w.fase_label}' ziet uit als een sleutel, niet als een label`,
      );
      assert.ok(
        !/^[A-Z_]+$/.test(w.status_label),
        `'${w.status_label}' is de ruwe status in plaats van een label`,
      );
    }
  });

  test("een mensbesluit overleeft de volgende pijplijnronde", async () => {
    const rot = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      rijen<{ id: string }>(
        c,
        "select id::text from intel.kansen where identiteit = 'kenmerk:599611'",
        [],
      ),
    );
    const id = rot[0]!.id;

    /* Een mens pakt de kans op. */
    await metOrganisatie(db.pool, { organisatieId }, (c) =>
      c.query("update intel.kansen set status = 'IN_BEHANDELING' where id = $1", [id]),
    );

    const uitslag = await schrijfKansen(db.pool, organisatieId, kansenVoor(["434533", "443632"], docIds));
    assert.equal(
      uitslag.statusBehouden,
      1,
      `de pijplijn hoort het besluit te laten staan; uitslag was ${JSON.stringify(uitslag)}`,
    );

    const na = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      rijen<{ status: string; sluit_op: string }>(
        c,
        "select status, sluit_op::text from intel.kansen where id = $1",
        [id],
      ),
    );
    assert.equal(na[0]!.status, "IN_BEHANDELING", "de status is overschreven door de pijplijn");
    /* EN TOCH ZIJN DE FEITEN BIJ. Dit is de andere helft: de verzette
       termijn moet doorkomen, ook bij een opgepakte kans. */
    assert.equal(na[0]!.sluit_op, "2026-12-02", "de verzette sluitingsdatum is niet doorgekomen");
  });

  test("de feiten werken bij als er een rectificatie bij komt", async () => {
    /* Scenario in de echte volgorde: eerst zag het platform alleen de
       aankondiging (sluit 2026-10-08, inmiddels verstreken), daarna komt
       de rectificatie binnen die de termijn verzet.

       Dit draait op een TWEEDE ORGANISATIE in dezelfde database, niet op
       een tweede wegwerpdatabase: harnas.opruimen() roept
       sluitAllePools() aan en dat sluit elke pool in het proces, ook die
       van deze suite. Bijkomend voordeel: het unieke index is
       (organisatie_id, identiteit), dus dit toetst ook dat twee
       organisaties hetzelfde kenmerk mogen dragen. */
    const org2 = await maakOrganisatie(db, "vibe-tweede");
    const docIds2 = await zaaiDocumenten(db, org2);

    await schrijfKansen(db.pool, org2, kansenVoor(["434533"], docIds2));
    const voor = await metOrganisatie(db.pool, { organisatieId: org2 }, (c) =>
      rijen<{ sluit_op: string; n: string }>(
        c,
        `select k.sluit_op::text, count(p.url)::text as n
           from intel.kansen k left join intel.kans_publicaties p on p.kans_id = k.id
          where k.identiteit = 'kenmerk:599611' group by k.sluit_op`,
        [],
      ),
    );
    assert.equal(voor.length, 1, "de tweede organisatie hoort zijn eigen kans te hebben");
    assert.equal(voor[0]!.sluit_op, "2026-10-08", "de eerste ronde ziet de oude termijn");
    assert.equal(voor[0]!.n, "1");

    /* De rectificatie komt binnen. */
    await schrijfKansen(db.pool, org2, kansenVoor(["434533", "443632"], docIds));
    const na = await metOrganisatie(db.pool, { organisatieId: org2 }, (c) =>
      rijen<{ sluit_op: string; n: string; fase: string }>(
        c,
        `select k.sluit_op::text, k.fase, count(p.url)::text as n
           from intel.kansen k left join intel.kans_publicaties p on p.kans_id = k.id
          where k.identiteit = 'kenmerk:599611' group by k.sluit_op, k.fase`,
        [],
      ),
    );
    assert.equal(na.length, 1, "het blijft EEN kans");
    assert.equal(na[0]!.n, "2", "met twee publicaties");
    assert.equal(na[0]!.sluit_op, "2026-12-02", "en de verzette termijn");
    assert.equal(na[0]!.fase, "open");

    /* Elke publicatie houdt zijn eigen gemelde termijn, zodat na te gaan
       is welke door welke is vervangen. */
    const perPublicatie = await metOrganisatie(db.pool, { organisatieId: org2 }, (c) =>
      rijen<{ publicatie_soort: string; sluitingsdatum_bron: string }>(
        c,
        `select p.publicatie_soort, p.sluitingsdatum_bron::text
           from intel.kans_publicaties p
           join intel.kansen k on k.id = p.kans_id
          where k.identiteit = 'kenmerk:599611'
          order by p.gepubliceerd_op`,
        [],
      ),
    );
    assert.deepEqual(
      perPublicatie.map((p) => [p.publicatie_soort, p.sluitingsdatum_bron]),
      [
        ["AAO", "2026-10-08"],
        ["REC", "2026-12-02"],
      ],
      "beide publicaties horen hun eigen gemelde termijn te houden",
    );
  });

  test("een identiteitswijziging maakt GEEN tweede rij", async () => {
    /* HET GEMETEN GEVAL. Zolang de TenderNed-config geen kenmerk
       bewaarde was de identiteit 'titel:<opdrachtgever>::<titelkern>'.
       Na het toevoegen van kenmerk aan extraVelden werd het
       'kenmerk:599611'. Zonder terugvalweg levert dat twee rijen voor
       een aanbesteding op; lokaal gaf dat 11 rijen waar 6 horen.

       Deze toets bouwt die overgang na: eerst opslaan onder het oude
       schema, dan onder het nieuwe. De publicatie-URL is de brug. */
    const org3 = await maakOrganisatie(db, "vibe-schemawissel");
    const docIds3 = await zaaiDocumenten(db, org3);

    const nieuweKansen = kansenVoor(["434533", "443632"], docIds3);
    const kans = nieuweKansen[0]!;

    /* Opslaan zoals het ONDER HET OUDE SCHEMA zou zijn gegaan. */
    const alsOud: Kans = {
      ...kans,
      identiteit: "titel:veiligheidsregio rotterdam-rijnmond::energieopslag zonnepanelen",
      identiteitGrondslag: "de bron levert geen kenmerk",
      referentie: null,
      sluitOp: null,
    };
    await schrijfKansen(db.pool, org3, [alsOud]);

    const na1 = await metOrganisatie(db.pool, { organisatieId: org3 }, (c) =>
      rijen<{ n: string }>(c, "select count(*)::text as n from intel.kansen", []),
    );
    assert.equal(na1[0]!.n, "1");

    /* En nu onder het NIEUWE schema, met kenmerk. */
    await schrijfKansen(db.pool, org3, nieuweKansen);

    const na2 = await metOrganisatie(db.pool, { organisatieId: org3 }, (c) =>
      rijen<{ n: string; identiteit: string; sluit_op: string }>(
        c,
        "select count(*) over ()::text as n, identiteit, sluit_op::text from intel.kansen limit 1",
        [],
      ),
    );
    assert.equal(na2[0]!.n, "1", "de identiteitswissel heeft een tweede rij gemaakt");
    assert.equal(
      na2[0]!.identiteit,
      "kenmerk:599611",
      "de rij hoort naar de nieuwe, hardere identiteit te zijn bijgewerkt",
    );
    assert.equal(na2[0]!.sluit_op, "2026-12-02", "en de feiten horen bij te werken");
  });

  test("een kans met een verstreken termijn valt uit de werkvoorraad", async () => {
    /* Gemeten geval: kenmerk 589425 stond op fase 'open' met
       sluitingsdatum 2026-07-14 — geen eindstand, dus de statusfilter
       laat hem door, terwijl er niets meer te doen is. */
    const org4 = await maakOrganisatie(db, "vibe-verstreken");
    await metOrganisatie(db.pool, { organisatieId: org4 }, (c) =>
      c.query(
        `insert into intel.kansen
           (organisatie_id, opdrachtgever, project, identiteit, fase, fase_grondslag,
            status, sluit_op, score_relevantie)
         values
           ($1,'Provincie Limburg','Verstreken','kenmerk:589425','open',array['toets'],
            'ONDERZOEK_NODIG','2026-07-14',35),
           ($1,'Provincie Limburg','Loopt nog','kenmerk:599999','open',array['toets'],
            'ONDERZOEK_NODIG','2026-12-02',35),
           ($1,'Provincie Limburg','Geen datum','kenmerk:599998','open',array['toets'],
            'ONDERZOEK_NODIG',null,35)`,
        [org4],
      ),
    );
    const werk = await leesWerkvoorraad(db.pool, org4, 50, VANDAAG);
    const projecten = werk.map((w) => w.project).sort();
    assert.deepEqual(
      projecten,
      ["Geen datum", "Loopt nog"],
      `een verstreken termijn hoort eruit, een ontbrekende datum hoort erin: ${projecten.join(", ")}`,
    );
  });

  test("de pijplijn zet nooit interesse_bewezen", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      rijen<{ n: string }>(
        c,
        "select count(*)::text as n from intel.kansen where interesse_bewezen",
        [],
      ),
    );
    assert.equal(r[0]!.n, "0", "een openbare aankondiging is geen bewijs van interesse");
  });

  test("elke opgeslagen kans draagt zijn grondslag", async () => {
    const alle = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      rijen<{
        opdrachtgever: string;
        fase_grondslag: string[];
        identiteit_grondslag: string;
        score_grondslag: Record<string, unknown>;
      }>(
        c,
        `select opdrachtgever, fase_grondslag, identiteit_grondslag, score_grondslag
           from intel.kansen where identiteit like 'kenmerk:%'`,
        [],
      ),
    );
    assert.ok(alle.length >= 3);
    for (const k of alle) {
      assert.ok(k.fase_grondslag.length > 0, `${k.opdrachtgever} mist fasegrondslag`);
      assert.ok(k.identiteit_grondslag, `${k.opdrachtgever} mist identiteitsgrondslag`);
      for (const as of ["relevantie", "vertrouwen", "urgentie", "handelbaar"]) {
        assert.ok(k.score_grondslag[as], `${k.opdrachtgever} mist grondslag voor ${as}`);
      }
    }
  });
});
