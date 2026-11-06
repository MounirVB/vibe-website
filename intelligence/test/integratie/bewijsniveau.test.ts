/* ============================================================
   INTEGRATIE — claimidentiteit en bewijsniveau in de database
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET:

     §4  1 dezelfde bewering in twee versies van één document krijgt
           DEZELFDE afdruk, en BEIDE rijen blijven staan
         2 een gewijzigd bedrag geeft een andere afdruk
     §3  3 twee versies van één bron zijn ÉÉN onafhankelijke bron
         4 twee verschillende bronnen zijn er twee
         5 het niveau raakt de verificatiestatus niet aan
     0055 6 de database weigert 'bevestigd' bij een niveau dat geen
           DIRECT_BEVESTIGD is
         7 de database weigert een VERWOORDBARE tegenspraak
         8 de database weigert een niveau zonder reden
         9 de database weigert een onbekend niveau

   DE MEETHAKEN ZIJN ECHTE UPDATES. Een CHECK die niemand ooit heeft
   laten vuren is een bewering en geen bescherming.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import {
  maakOrganisatie,
  maakWegwerpdatabase,
  alsEigenaar,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { clusterNieuweVersies } from "../../src/pijplijn/clusteren.ts";
import {
  vulClaimAfdrukkenIn,
  vulBewijsniveauIn,
} from "../../src/pijplijn/bewijsniveau.ts";
import { DOCUMENTSOORT_VERSIE } from "../../src/pijplijn/documentsoort.ts";

/* DE ZIN IS WOORDELIJK DIE UIT PRODUCTIE. Brondocument 73052, versies
   3925 en 4120: dezelfde zin, hetzelfde bedrag, twee claimrijen. */
const TITEL = "Subsidieregeling en nettarief: budget voor de aanvraagperiode 2026";
const ZIN =
  "Het beschikbare subsidiebudget voor de aanvraagperiode 2026 is 1.775.000 euro.";
const TEKST_A = `${ZIN} De regeling valt onder het nettarief van de netbeheerders.`;
const TEKST_B = `${ZIN} De regeling valt onder het nettarief en is licht herzien.`;

describe("claimidentiteit en bewijsniveau", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("bewijsniveau");
    org = await maakOrganisatie(db, "bewijsniveau-org");

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam, risico_klasse)
         values ($1,'subsidie','Subsidie','midden'), ($1,'netbeheer','Netbeheer','midden')`,
        [org],
      );

      /* TWEE BRONNEN DIE ZICHZELF NIET MOGEN BEVESTIGEN, en dat is een
         correctie op mijn eerste fixture.

         Ik koos eerst rijksoverheid-nieuws en rvo-subsidies. Gemeten
         met classificeerVersie(): rijksoverheid-nieuws komt uit op
         FEITELIJKE_MEDEDELING / BEVOEGD_GEZAG en MAG zichzelf
         bevestigen. Dan wint DIRECT_BEVESTIGD, en meet de toets niet
         de ONAFHANKELIJKHEID maar het gezag — precies de vraag die
         hier niet aan de orde is.

         energie-nederland-nieuws en netbeheer-nederland-nieuws komen
         beide uit op BELANGENBEHARTIGER met plafond 2 (gemeten op de
         echte productiedocumenten, 6 november 2026). Daar is "hoeveel
         onafhankelijke bronnen melden dit" de enige vraag die
         overblijft. */
      for (const [sleutel, uitgever, host] of [
        ["energie-nederland-nieuws", "Energie-Nederland", "https://www.energie-nederland.nl"],
        ["netbeheer-nederland-nieuws", "Netbeheer Nederland", "https://www.netbeheernederland.nl"],
      ] as const) {
        await c.query(
          `insert into intel.bronnen
             (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
              robots_status, tdm_status, verificatie_status, verificatie_bewijs,
              is_primaire_bron, betrouwbaarheid, levert_gebeurtenissen, onderwerpen, mag_citeren)
           values ($1,$2,$3,'rss',$4 || '/feed',$4,true,'toegestaan','geen_voorbehoud',
                   'geverifieerd','fixture',true,5,true,array['subsidie','netbeheer'],true)`,
          [org, sleutel, uitgever, host],
        );
      }
    });
  });

  after(async () => {
    await db?.opruimen();
  });

  /** Legt één document met één versie neer en clustert hem. */
  async function document(
    bronSleutel: string,
    externId: string,
    tekst: string,
    versie: number,
    vorigeDocId?: number,
  ): Promise<number> {
    return alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      let docId = vorigeDocId;
      if (docId === undefined) {
        const d = await c.query<{ id: number }>(
          `insert into intel.brondocumenten
             (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
              gepubliceerd_op)
           values ($1,(select id from intel.bronnen where organisatie_id=$1 and sleutel=$2),
                   $3, (select basis_url from intel.bronnen where organisatie_id=$1 and sleutel=$2) || '/' || $3,
                   $4,(select uitgever from intel.bronnen where organisatie_id=$1 and sleutel=$2),
                   'rss', now() - interval '3 days')
           returning id`,
          [org, bronSleutel, externId, TITEL],
        );
        docId = d.rows[0]!.id;
      }
      await c.query(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst,
            tekst_lengte, documentsoort, documentsoort_gezag, documentsoort_versie)
         values ($1,$2,$3,$4,$5,$6,length($6),'FEITELIJKE_MEDEDELING','BEVOEGD_GEZAG',$7)`,
        [org, docId, versie, `hash-${externId}-${versie}`, TITEL, tekst, DOCUMENTSOORT_VERSIE],
      );
      return docId;
    });
  }

  /* ================================================================
     §4 · DEZELFDE BEWERING IN TWEE VERSIES
     ================================================================ */

  test("1 · twee versies van één document geven twee claimrijen met DEZELFDE afdruk", async () => {
    const docId = await document("energie-nederland-nieuws", "doc-73052", TEKST_A, 1);
    await clusterNieuweVersies(db.pool, org, { max: 10 });
    await document("energie-nederland-nieuws", "doc-73052", TEKST_B, 2, docId);
    await clusterNieuweVersies(db.pool, org, { max: 10 });

    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ afdruk: string; n: number; ids: string }>(
        `select u.claim_afdruk as afdruk, count(*)::int as n,
                string_agg(u.id::text, ',' order by u.id) as ids
           from intel.uitspraken u
          where u.waarde_numeriek = 1775000
          group by u.claim_afdruk`,
      ),
    );
    assert.equal(r.rows.length, 1, `verwacht één afdruk, kreeg ${JSON.stringify(r.rows)}`);
    assert.equal(r.rows[0]?.n, 2, "en twee rijen: BEIDE blijven staan");
    assert.ok((r.rows[0]?.afdruk ?? "").length >= 16);
  });

  test("2 · GEEN DESTRUCTIEVE DEDUPLICATIE — beide bronversies blijven herleidbaar", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ uitspraak: number; versies: string }>(
        `select u.id as uitspraak, string_agg(ub.versie_id::text, ',') as versies
           from intel.uitspraken u
           join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
          where u.waarde_numeriek = 1775000
          group by u.id order by u.id`,
      ),
    );
    assert.equal(r.rows.length, 2);
    /* Elke claim hangt aan ZIJN EIGEN bronversie, en de twee zijn
       verschillend. Zonder dat zou de afdruk het auditspoor hebben
       opgeslokt. */
    const versies = r.rows.map((x) => x.versies);
    assert.notEqual(versies[0], versies[1], `beide claims hangen aan ${versies[0]}`);
  });

  test("3 · een gewijzigd BEDRAG geeft een andere afdruk", async () => {
    await document(
      "energie-nederland-nieuws",
      "doc-ander-bedrag",
      "Het beschikbare subsidiebudget voor de aanvraagperiode 2027 is 1.800.000 euro. " +
        "De regeling valt onder het nettarief.",
      1,
    );
    await clusterNieuweVersies(db.pool, org, { max: 10 });
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number }>(
        `select count(distinct claim_afdruk)::int as n from intel.uitspraken
          where waarde_numeriek in (1775000, 1800000)`,
      ),
    );
    assert.equal(r.rows[0]?.n, 2, "twee bedragen, twee afdrukken");
  });

  /* ================================================================
     §3 · DE ONAFHANKELIJKHEID
     ================================================================ */

  test("4 · DE KERNZAAK — twee versies van één bron zijn ÉÉN onafhankelijke bron", async () => {
    await vulClaimAfdrukkenIn(db.pool, org, { max: 500 });
    const r = await vulBewijsniveauIn(db.pool, org, { max: 500, alles: true });
    assert.ok(r.claimsBijgewerkt > 0, JSON.stringify(r));

    const n = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ niveau: string; reden: string }>(
        `select distinct bewijsniveau as niveau, bewijsniveau_reden as reden
           from intel.uitspraken where waarde_numeriek = 1775000`,
      ),
    );
    assert.equal(n.rows.length, 1, "twee rijen van één bewering, één niveau");
    /* De bewering staat in twee VERSIES van één document, dus één bron.
       MEERVOUDIG_BEVESTIGD zou hier onjuist zijn. */
    assert.notEqual(n.rows[0]?.niveau, "MEERVOUDIG_BEVESTIGD", n.rows[0]?.reden);
    assert.match(n.rows[0]?.reden ?? "", /1 bron\(nen\)/);
  });

  test("5 · twee VERSCHILLENDE bronnen geven wel MEERVOUDIG_BEVESTIGD", async () => {
    /* Dezelfde zin bij een tweede uitgever. De afdruk is gelijk omdat
       de bewering gelijk is; de bron is anders. */
    await document("netbeheer-nederland-nieuws", "nbnl-zelfde-feit", TEKST_A, 1);
    await clusterNieuweVersies(db.pool, org, { max: 10 });
    await vulClaimAfdrukkenIn(db.pool, org, { max: 500 });
    await vulBewijsniveauIn(db.pool, org, { max: 500, alles: true });

    const n = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ niveau: string; reden: string; n: number }>(
        `select bewijsniveau as niveau, bewijsniveau_reden as reden, count(*)::int as n
           from intel.uitspraken where waarde_numeriek = 1775000
          group by bewijsniveau, bewijsniveau_reden`,
      ),
    );
    assert.equal(n.rows.length, 1);
    assert.equal(n.rows[0]?.niveau, "MEERVOUDIG_BEVESTIGD", n.rows[0]?.reden);
    assert.match(n.rows[0]?.reden ?? "", /2 bron\(nen\)/);
    assert.equal(n.rows[0]?.n, 3, "drie claimrijen van één bewering uit twee bronnen");
    /* EN HET MOET ERBIJ STAAN DAT DIT GEEN VASTSTELLING IS. */
    assert.match(n.rows[0]?.reden ?? "", /geen vaststelling/);
  });

  test("6 · het niveau raakt de verificatiestatus NIET aan", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ status: string; n: number }>(
        `select verificatie_status as status, count(*)::int as n
           from intel.uitspraken group by verificatie_status order by n desc`,
      ),
    );
    /* Geen enkele claim is door de niveaulaag op 'bevestigd' gezet.
       MEERVOUDIG_BEVESTIGD is met opzet geen grond. */
    const bevestigd = r.rows.find((x) => x.status === "bevestigd")?.n ?? 0;
    const meervoudig = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number }>(
        `select count(*)::int as n from intel.uitspraken
          where bewijsniveau = 'MEERVOUDIG_BEVESTIGD' and verificatie_status = 'bevestigd'`,
      ),
    );
    assert.equal(meervoudig.rows[0]?.n, 0, `${bevestigd} claims staan op bevestigd`);
  });

  /* ================================================================
     DE REGRESSIE VAN 6 NOVEMBER 2026 — de ronde mag niet meer vallen
     ----------------------------------------------------------------
     GEMETEN OP PRODUCTIE: taak 6887 (semantiek:2026-11-06T08) stond in
     de DLQ met "new row for relation uitspraken violates check
     constraint uitspraken_bevestigd_vraagt_direct", na vijf pogingen.

     De oorzaak: vulBewijsniveauIn() werkte ELKE rij met dezelfde afdruk
     bij. Stond daar één rij tussen die al 'bevestigd' was, en kwam het
     niveau niet op DIRECT_BEVESTIGD uit, dan weigerde 0055 de UPDATE —
     en viel de hele ronde, de taak en daarmee de complete semantiekstap
     om. Gevolg in productie: 150 van 170 claims zonder niveau, en de
     nieuwe claims van die dag zonder verwoordbaarheidsoordeel.

     DE GRENDEL BLIJFT STAAN. Deze toets eist niet dat de claim alsnog
     een niveau krijgt — dat zou de drempel verlagen. Hij eist dat de
     ronde doorloopt, dat de strijdige rij GEEN label krijgt, dat zijn
     status onaangeroerd blijft en dat hij bij een mens terechtkomt.
     ================================================================ */

  test("7 · REGRESSIE — een al bevestigde rij laat de ronde niet vallen", async () => {
    /* Eén rij terugzetten naar de productiesituatie: 'bevestigd' met
       bewijsniveau NULL. Dat mag van 0055 (tak twee van de CHECK) en is
       precies hoe de 85 bevestigde claims in productie stonden. */
    const doel = await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const r = await c.query<{ id: number; afdruk: string }>(
        `update intel.uitspraken
            set bewijsniveau = null, bewijsniveau_reden = null, bewijsniveau_op = null,
                verificatie_status = 'bevestigd'
          where id = (select min(id) from intel.uitspraken
                       where organisatie_id = $1 and waarde_numeriek = 1775000)
        returning id, claim_afdruk as afdruk`,
        [org],
      );
      return r.rows[0]!;
    });

    /* DIT IS DE TOETS: geen uitzondering meer. Vóór de reparatie gooide
       deze aanroep de constraintfout en viel de taak om. */
    const ronde = await vulBewijsniveauIn(db.pool, org, { max: 500 });
    assert.ok(ronde.strijdigMetStatus >= 1, `strijdig niet geteld: ${JSON.stringify(ronde)}`);
    assert.ok(ronde.doorverwezen >= 1, `niet doorverwezen: ${JSON.stringify(ronde)}`);

    const na = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ niveau: string | null; status: string }>(
        `select bewijsniveau as niveau, verificatie_status as status
           from intel.uitspraken where id = $1`,
        [doel.id],
      ),
    );
    /* GEEN LABEL IS GEEN BEWERING: de rij blijft zonder niveau staan in
       plaats van er een te krijgen dat zijn status niet draagt. */
    assert.equal(na.rows[0]?.niveau, null, "de strijdige rij kreeg alsnog een niveau");
    /* EN ER IS NIETS AFGEWAARDEERD: de niveaulaag raakt geen status aan. */
    assert.equal(na.rows[0]?.status, "bevestigd", "de verificatiestatus is aangeraakt");

    const vraag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ aanleiding: string; reden: string }>(
        `select aanleiding, reden from intel.claimbeoordeling where uitspraak_id = $1`,
        [doel.id],
      ),
    );
    assert.equal(vraag.rows.length, 1, "de strijdige claim is niet doorverwezen");
    assert.equal(vraag.rows[0]?.aanleiding, "BEWIJSNIVEAU_STRIJDIG_MET_STATUS");
    assert.match(vraag.rows[0]?.reden ?? "", /MEERVOUDIG_BEVESTIGD/);
  });

  test("8 · REGRESSIE — de rest van de afdruk wordt gewoon bijgewerkt", async () => {
    /* De twee andere rijen van dezelfde bewering staan niet op
       'bevestigd' en horen hun niveau dus wél te houden. Zonder deze
       toets zou een reparatie die simpelweg de hele afdruk overslaat
       ook groen zijn — en dan zou de keten stilstaan in plaats van
       omvallen. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ niveau: string | null; n: number }>(
        `select bewijsniveau as niveau, count(*)::int as n
           from intel.uitspraken where waarde_numeriek = 1775000
          group by bewijsniveau order by n desc`,
      ),
    );
    const metNiveau = r.rows.find((x) => x.niveau === "MEERVOUDIG_BEVESTIGD")?.n ?? 0;
    assert.ok(metNiveau >= 2, `verwacht minstens twee rijen mét niveau: ${JSON.stringify(r.rows)}`);
  });

  /* ================================================================
     DE GRENDELS VAN 0055 — elk met een echte update
     ================================================================ */

  test("MEETHAAK 1 · 'bevestigd' met MEERVOUDIG_BEVESTIGD wordt geweigerd", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `update intel.uitspraken
                set verificatie_status = 'bevestigd'
              where organisatie_id = $1 and bewijsniveau = 'MEERVOUDIG_BEVESTIGD'`,
            [org],
          );
        }),
      /uitspraken_bevestigd_vraagt_direct/,
      "drie branchepartijen die elkaar naschrijven zijn geen vaststelling",
    );
  });

  test("MEETHAAK 2 · een VERWOORDBARE tegenspraak wordt geweigerd", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, waarde_numeriek, eenheid, risico_klasse,
                bewijsniveau, bewijsniveau_reden,
                toepassingsgebied, toepassingsgebied_grondslag,
                verwoordbaar, verwoordbaar_reden, verwoorde_zin)
             values ($1,'Een zin die lang genoeg is om door te komen.','cijfer',20,'%','laag',
                     'TEGENSTRIJDIG','twee bronnen melden een andere waarde voor dezelfde grootheid',
                     'NEDERLAND','de bronzin noemt Nederland expliciet',
                     'VERWOORDBAAR','een reden van voldoende lengte voor de constraint',
                     'Volgens de bron stijgt het nettarief met 20 procent.')`,
            [org],
          );
        }),
      /uitspraken_tegenstrijdig_niet_verwoordbaar/,
      "een tegenspraak hoort niet verwoordbaar te zijn",
    );
  });

  test("MEETHAAK 3 · een niveau zonder reden wordt geweigerd", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, risico_klasse, bewijsniveau)
             values ($1,'Een zin die lang genoeg is om door te komen.','feit','laag',
                     'NIET_BEVESTIGD')`,
            [org],
          );
        }),
      /uitspraken_bewijsniveau_heeft_reden/,
      "een niveau zonder reden is een teller en geen oordeel",
    );
  });

  test("MEETHAAK 4 · een onbekend niveau wordt geweigerd", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, risico_klasse, bewijsniveau, bewijsniveau_reden)
             values ($1,'Een zin die lang genoeg is om door te komen.','feit','laag',
                     'WAARSCHIJNLIJK_WEL','een reden van voldoende lengte voor de constraint')`,
            [org],
          );
        }),
      /uitspraken_bewijsniveau/,
      "de lijst van vijf niveaus is gesloten",
    );
  });

  test("MEETHAAK 5 · een afdruk zonder versiestempel wordt geweigerd", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, risico_klasse, claim_afdruk)
             values ($1,'Een zin die lang genoeg is om door te komen.','feit','laag',
                     'abcdef0123456789abcdef0123456789')`,
            [org],
          );
        }),
      /uitspraken_afdruk_heeft_versie/,
      "zonder versiestempel is niet te zien onder welke regel de afdruk is berekend",
    );
  });

  /* ================================================================
     IDEMPOTENTIE
     ================================================================ */

  test("7 · een tweede ronde verandert niets", async () => {
    const stand = async () =>
      metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
        const r = await c.query(
          `select id, claim_afdruk, claim_afdruk_versie, bewijsniveau, bewijsniveau_reden,
                  verificatie_status
             from intel.uitspraken order by id`,
        );
        return JSON.stringify(r.rows);
      });
    const voor = await stand();
    await vulClaimAfdrukkenIn(db.pool, org, { max: 500 });
    await vulBewijsniveauIn(db.pool, org, { max: 500, alles: true });
    assert.equal(await stand(), voor, "dezelfde invoer hoort dezelfde stand te geven");
  });

  test("8 · een claim zonder afdruk wordt gemeld en niet stil overgeslagen", async () => {
    /* Een rij van vóór 0055 heeft geen afdruk. vulBewijsniveauIn()
       hoort hem te TELLEN in `zonderAfdruk`, want een claim die niet
       wordt gewogen mag niet onzichtbaar zijn. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.uitspraken (organisatie_id, tekst, soort, risico_klasse)
         values ($1,'Een oude claim zonder afdruk, zoals voor migratie 0055.','feit','laag')`,
        [org],
      );
    });
    const r = await vulBewijsniveauIn(db.pool, org, { max: 500 });
    assert.ok(r.zonderAfdruk >= 1, JSON.stringify(r));
  });
});
