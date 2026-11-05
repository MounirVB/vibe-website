/* ============================================================
   INTEGRATIE — herverwerken zonder iets te verliezen
   ------------------------------------------------------------
   WAAROM DEZE ROUTE MOEST BESTAAN. clusterNieuweVersies() sluit
   versies uit die al aan een gebeurtenis hangen, en dat is juist:
   zonder die grens doet elke ronde alles opnieuw. Maar het betekent ook
   dat een VERBETERDE extractie de bestaande documenten nooit bereikt.
   Op 5 november 2026 stonden er 192 gebeurtenissen zonder claim terwijl
   de reparatie aan uitspraken.ts er 17 van had kunnen vullen.

   EN WAAROM 'npm run herbouw' NIET DE OPLOSSING IS. Die wist de
   afgeleide lagen zodat ze opnieuw berekend worden. Dat verliest de
   historische claims — ook de vier die via intel.uitspraak_correcties
   zijn gerectificeerd — en daarmee het spoor dat vastlegt WELKE waarde
   WELKE vervangt en waarom.

   WAT HIER WORDT VASTGEZET

     1 een tweede ronde maakt NIETS aan en slaat alles over
     2 er verdwijnt geen claim
     3 er komt geen tweede koppeling naar de gebeurtenis
     4 de correctieketen blijft intact
     5 een NIEUWE claim in dezelfde versie komt er wel bij
     6 de normale ronde blijft bestaande versies overslaan
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import { maakOrganisatie, maakWegwerpdatabase, alsEigenaar, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { clusterNieuweVersies } from "../../src/pijplijn/clusteren.ts";
import { DOCUMENTSOORT_VERSIE } from "../../src/pijplijn/documentsoort.ts";

/* Een brontekst met twee feiten die de GEREPAREERDE extractie vindt en
   de oude niet: een bedrag in de vorm 'getal schaal euro' en een
   percentage als woord. */
/* DE TITEL DRAAGT DE ONDERWERPTERM. herkenOnderwerpen() vond op mijn
   eerste fixture NUL onderwerpen, en zonder onderwerp maakt
   clusterNieuweVersies() geen gebeurtenis en dus geen claim —
   `zonderOnderwerp: 1`. Gemeten: 'nettarief' in de titel levert
   onderwerp 'netbeheer' met score 6. De fixture is daarop aangepast en
   NIET het vocabulaire: een term toevoegen om een toets te laten
   slagen zou de meting waardeloos maken. */
const TITEL = "Nettarief en netcongestie: netbeheerders investeren tot 2040";
const TEKST =
  "Netbeheer Nederland meldt dat het nettarief verandert en dat netbeheerders tot 2040 " +
  "meer dan 200 miljard euro investeren in het elektriciteitsnet. De betrouwbaarheid van " +
  "de netten blijft op ruim 99,99 procent. De aansluitcapaciteit bedraagt 849 MW.";

describe("herverwerken zonder iets te verliezen", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let versieId = 0;

  before(async () => {
    db = await maakWegwerpdatabase("herverwerk");
    org = await maakOrganisatie(db, "herverwerk-org");

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const bron = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            is_primaire_bron, betrouwbaarheid, levert_gebeurtenissen, onderwerpen)
         values ($1,'netbeheer-nederland-nieuws','Netbeheer Nederland','rss',
                 'https://www.netbeheernederland.nl/feed','https://www.netbeheernederland.nl',
                 true,'toegestaan','geen_voorbehoud','geverifieerd','fixture',
                 true,5,true,array['netbeheer'])
         returning id`,
        [org],
      );
      const doc = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort, gepubliceerd_op)
         values ($1,$2,'fix-h1','https://www.netbeheernederland.nl/bericht-1',
                 $3,
                 'Netbeheer Nederland','rss', now() - interval '3 days')
         returning id`,
        [org, bron.rows[0]!.id, TITEL],
      );
      const v = await c.query<{ id: number }>(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte,
            documentsoort, documentsoort_gezag, documentsoort_versie)
         values ($1,$2,1,'hash-h1',$5,$3, length($3),
                 'FEITELIJKE_MEDEDELING','NETBEHEERDER',$4)
         returning id`,
        [org, doc.rows[0]!.id, TEKST, DOCUMENTSOORT_VERSIE, TITEL],
      );
      versieId = v.rows[0]!.id;
      await c.query(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam, risico_klasse)
         values ($1,'netbeheer','Netbeheer','midden')`,
        [org],
      );
    });
  });

  after(async () => {
    await db?.opruimen();
  });

  /** De stand van de claimlaag, om vóór en ná te vergelijken. */
  async function stand(): Promise<{
    claims: number;
    koppelingen: number;
    gebeurtenissen: number;
    correcties: number;
    ids: number[];
  }> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        claims: number; koppelingen: number; gebeurtenissen: number; correcties: number;
      }>(
        `select (select count(*)::int from intel.uitspraken)             as claims,
                (select count(*)::int from intel.gebeurtenis_documenten) as koppelingen,
                (select count(*)::int from intel.markt_gebeurtenissen)   as gebeurtenissen,
                (select count(*)::int from intel.uitspraak_correcties)   as correcties`,
      );
      const ids = await c.query<{ id: number }>("select id from intel.uitspraken order by id");
      return { ...r.rows[0]!, ids: ids.rows.map((x) => x.id) };
    });
  }

  test("1 · de EERSTE ronde maakt de gebeurtenis en de claims", async () => {
    const r = await clusterNieuweVersies(db.pool, org, { max: 10 });
    assert.equal(r.versiesBekeken, 1, "er is één nieuwe versie");
    assert.ok(r.uitsprakenAangemaakt > 0, `er horen claims te komen; rapport: ${JSON.stringify(r)}`);
    assert.equal(r.uitsprakenOvergeslagen, 0, "de eerste ronde slaat niets over");

    const s = await stand();
    assert.equal(s.gebeurtenissen, 1);
    assert.equal(s.koppelingen, 1);
    assert.ok(s.claims >= 2, `twee feiten horen eruit te komen, gevonden ${s.claims}`);
  });

  test("2 · de NORMALE ronde slaat de al gekoppelde versie over", async () => {
    /* ZONDER --herverwerk blijft de grens staan. Dat is de bestaande
       bescherming tegen een ronde die elke keer alles opnieuw doet. */
    const voor = await stand();
    const r = await clusterNieuweVersies(db.pool, org, { max: 10 });
    assert.equal(r.versiesBekeken, 0, "de versie hangt al aan een gebeurtenis");
    assert.equal(r.uitsprakenAangemaakt, 0);
    const na = await stand();
    assert.deepEqual(na, voor, "de stand mag niet veranderen");
  });

  test("3 · HERVERWERKEN bekijkt de versie wél, en maakt NIETS nieuw aan", async () => {
    /* DE KERNZAAK. De tweede ronde over dezelfde tekst hoort alles over
       te slaan: schrijfUitspraken() ziet dat de claim er al staat. */
    const voor = await stand();
    const r = await clusterNieuweVersies(db.pool, org, { max: 10, herverwerk: true });
    assert.equal(r.versiesBekeken, 1, "met --herverwerk komt de versie wel in de werkvoorraad");
    assert.equal(
      r.uitsprakenAangemaakt,
      0,
      `een herverwerking van ONGEWIJZIGDE tekst mag niets aanmaken; rapport: ${JSON.stringify(r)}`,
    );
    assert.ok(
      r.uitsprakenOvergeslagen > 0,
      "en hoort de bestaande claims te TELLEN als overgeslagen",
    );

    const na = await stand();
    assert.equal(na.claims, voor.claims, "geen claim erbij");
    assert.deepEqual(na.ids, voor.ids, "en geen claim verdwenen of vervangen");
    assert.equal(na.koppelingen, voor.koppelingen, "geen tweede koppeling naar de gebeurtenis");
    assert.equal(na.gebeurtenissen, voor.gebeurtenissen, "geen tweede gebeurtenis");
  });

  test("4 · drie keer herverwerken verandert nog steeds niets", async () => {
    const voor = await stand();
    for (let i = 0; i < 3; i += 1) {
      await clusterNieuweVersies(db.pool, org, { max: 10, herverwerk: true });
    }
    const na = await stand();
    assert.deepEqual(na, voor);
  });

  test("5 · de CORRECTIEKETEN blijft intact bij een herverwerking", async () => {
    /* Een rectificatie legt vast welke claim welke vervangt. Een
       herverwerking mag daar niet aankomen — en mag de vervangen claim
       al helemaal niet opnieuw als nieuw aanmaken. */
    const eerste = (await stand()).ids[0]!;
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const nieuw = await c.query<{ id: number }>(
        `insert into intel.uitspraken
           (organisatie_id, gebeurtenis_id, tekst, soort, waarde_numeriek, eenheid,
            onderwerp, verificatie_status, bewijs_kwaliteit, risico_klasse)
         select organisatie_id, gebeurtenis_id, tekst, soort, 99999, eenheid,
                onderwerp, verificatie_status, bewijs_kwaliteit, risico_klasse
           from intel.uitspraken where id = $1
         returning id`,
        [eerste],
      );
      await c.query(
        `insert into intel.uitspraak_correcties
           (organisatie_id, vervangen_id, vervanger_id, soort, grondslag)
         values ($1,$2,$3,'rectificatie',$4)`,
        [
          org,
          eerste,
          nieuw.rows[0]!.id,
          /* MINSTENS TWINTIG TEKENS. correctie_heeft_grondslag eist dat,
             en terecht: een correctie die een bewaard feit vervangt
             zonder leesbare reden is niet na te rekenen. Mijn eerste
             poging gebruikte 'toetscorrectie' (14 tekens) en werd
             geweigerd. */
          "rectificatie binnen deze toets, om te bewijzen dat een herverwerking de keten niet raakt",
        ],
      );
    });
    const voor = await stand();
    assert.equal(voor.correcties, 1);

    await clusterNieuweVersies(db.pool, org, { max: 10, herverwerk: true });

    const na = await stand();
    assert.equal(na.correcties, 1, "de correctieregel blijft staan");
    assert.deepEqual(na.ids, voor.ids, "en beide kanten van de correctie blijven bestaan");
  });

  test("6 · een NIEUW feit in dezelfde versie komt er bij een herverwerking wél bij", async () => {
    /* HET PUNT VAN DE HELE ROUTE. Verandert de brontekst niet maar wel
       de EXTRACTIE, dan hoort het nieuwe feit erbij te komen zonder dat
       het oude verdwijnt. Dat wordt hier nagebootst door de tekst uit te
       breiden — de versie blijft dezelfde rij, zoals bij een
       extractieverbetering ook de rij dezelfde blijft. */
    const voor = await stand();
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `update intel.brondocument_versies
            set ruwe_tekst = ruwe_tekst || ' Het nieuwe tarief bedraagt 12 procent.',
                tekst_lengte = length(ruwe_tekst) + 40
          where id = $1`,
        [versieId],
      );
    });
    const r = await clusterNieuweVersies(db.pool, org, { max: 10, herverwerk: true });
    assert.ok(
      r.uitsprakenAangemaakt > 0,
      `het nieuwe feit hoort erbij te komen; rapport: ${JSON.stringify(r)}`,
    );
    const na = await stand();
    assert.ok(na.claims > voor.claims, "er hoort een claim bij te zijn gekomen");
    for (const id of voor.ids) {
      assert.ok(na.ids.includes(id), `claim ${id} mag niet verdwenen zijn`);
    }
  });
});
