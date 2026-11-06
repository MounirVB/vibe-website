/* ============================================================
   INTEGRATIE — de vormclaims en de datumbeoordeling in de database
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET, en elk punt is een eis uit de opdracht:

     §4  1 de acht vormen landen echt in intel.uitspraken
         2 elke vormclaim draagt een bronpassage — en de DATABASE
           weigert hem zonder
         3 een BESLUIT uit een NIET-vaststellend stuk bevestigt zichzelf
           niet, ook niet als de uitgever betrouwbaarheid 5 heeft
         4 'aangekondigd' kan nooit stil 'in werking' worden
     §5  5 een datumclaim wordt WEL beoordeeld (de 39 bleven liggen)
         6 een LOSSE_DATUM wordt nooit verwoordbaar — in de poort EN in
           de database
         7 een datumrol hoort alleen bij een datumclaim

   DE MEETHAKEN ZIJN ECHTE INSERTS. Een CHECK die niemand ooit heeft
   laten vuren is geen bescherming maar een bewering; elke grendel
   hieronder wordt met een poging geforceerd en moet een fout geven.
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
import { backfillSemantiek } from "../../src/pijplijn/semantiekopslag.ts";
import { DOCUMENTSOORT_VERSIE } from "../../src/pijplijn/documentsoort.ts";

/* ------------------------------------------------------------------
   DE FIXTURE.

   De titel draagt een onderwerpterm, want zonder onderwerp maakt
   clusterNieuweVersies() geen gebeurtenis en dus geen claim. 'netcongestie'
   en 'nettarief' zijn gemeten termen uit het vocabulaire.

   De tekst bevat met opzet zes van de acht vormen plus een datum met een
   rol en een losse datum, zodat één fixture de hele keten dekt.
   ------------------------------------------------------------------ */
const TITEL = "Netcongestie en nettarief: ACM stelt prioriteringskader vast";
const TEKST = [
  "De Autoriteit Consument & Markt heeft het prioriteringskader voor netcongestie vastgesteld.",
  "Met de komst van de Energiewet geldt de verplichting dat alle netbeheerders de gegevens delen.",
  "Sinds 29 mei 2026 zijn de herziene eisen uit de Europese richtlijn EPBD IV van kracht in Nederland.",
  "Aanvragen voor de subsidieregeling kunnen van 1 maart 2027 tot en met 30 september 2027 worden ingediend.",
  "Liander heeft in april 2025 een herzien congestierapport gepubliceerd voor het gebied.",
  "De nieuwe laadlocatie in Nieuwegein is in gebruik genomen met zonnepanelen en een batterij.",
  "Tijdens het congres op 14 maart 2027 spreken verschillende deskundigen over het onderwerp.",
].join(" ");

/* DE TWEEDE FIXTURE — een nieuwsbericht van het BEVOEGD GEZAG.
   Drie juridische vormen in drie zinnen: een besluit, een verplichting
   en een inwerkingtreding. */
const TITEL_GEZAG = "Verplichte gegevensdeling voor netbeheerders en nettarief vastgesteld";
const TEKST_GEZAG = [
  "De minister heeft de verplichte gegevensdeling voor netbeheerders vastgesteld.",
  "Met de komst van de Energiewet geldt de verplichting dat alle netbeheerders de gegevens delen.",
  "Sinds 29 mei 2026 zijn de herziene eisen uit de Europese richtlijn EPBD IV van kracht in Nederland.",
].join(" ");

describe("vormclaims en datumbeoordeling", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let versieId = 0;

  before(async () => {
    db = await maakWegwerpdatabase("claimvorm");
    org = await maakOrganisatie(db, "claimvorm-org");

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const bron = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            is_primaire_bron, betrouwbaarheid, levert_gebeurtenissen, onderwerpen, mag_citeren)
         values ($1,'netbeheer-nederland-nieuws','Netbeheer Nederland','rss',
                 'https://www.netbeheernederland.nl/feed','https://www.netbeheernederland.nl',
                 true,'toegestaan','geen_voorbehoud','geverifieerd','fixture',
                 true,5,true,array['netcongestie','netbeheer'],true)
         returning id`,
        [org],
      );
      const doc = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort, gepubliceerd_op)
         values ($1,$2,'fix-v1','https://www.netbeheernederland.nl/vormbericht-1',
                 $3,'Netbeheer Nederland','rss', now() - interval '3 days')
         returning id`,
        [org, bron.rows[0]!.id, TITEL],
      );
      /* FEITELIJKE_MEDEDELING bij een NETBEHEERDER: betrouwbaarheid 5 en
         primaire bron, maar GEEN vaststellend stuk. Precies de
         combinatie waarin een juridische claim zichzelf niet mag
         bevestigen. */
      const v = await c.query<{ id: number }>(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte,
            documentsoort, documentsoort_gezag, documentsoort_versie)
         values ($1,$2,1,'hash-v1',$5,$3, length($3),
                 'FEITELIJKE_MEDEDELING','NETBEHEERDER',$4)
         returning id`,
        [org, doc.rows[0]!.id, TEKST, DOCUMENTSOORT_VERSIE, TITEL],
      );
      versieId = v.rows[0]!.id;
      await c.query(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam, risico_klasse)
         values ($1,'netcongestie','Netcongestie','midden'),
                ($1,'netbeheer','Netbeheer','midden')`,
        [org],
      );
    });

    /* ----------------------------------------------------------------
       DE TWEEDE FIXTURE, EN WAAROM HIJ NODIG IS.

       Voor de eerste fixture rekent classificeerVersie() uit:
       SECUNDAIRE_BERICHTGEVING / MARKT, plafond 1, magZelfBevestigen
       false. De documentsoortlaag blokkeert daar dus al, en dan zegt
       "de claim is ongeverifieerd" NIETS over de juridische poort.

       clusterNieuweVersies() classificeert elke versie ZELF — de
       kolommen uit de fixture worden overschreven — dus de soort is
       niet in te stellen maar wel te KIEZEN via bronsleutel, URL en
       tekst. Gemeten met classificeerVersie():

         rijksoverheid-nieuws + /actueel/nieuws/...
           -> FEITELIJKE_MEDEDELING / BEVOEGD_GEZAG / NIEUWSBERICHT
           -> plafond 4, magZelfBevestigen TRUE

       En vormKanVaststellen(NIEUWSBERICHT) is false, dus
       steltStukDeClaimVast() zegt nee. Dit is precies het geval uit de
       kop van claimaard.ts: een nieuwsbericht van het bevoegd gezag mag
       MELDEN dat een regel geldt, maar niet het BEWIJS zijn dat hij
       geldt. Hier wordt de juridische poort dus echt geraakt.
       ---------------------------------------------------------------- */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const bron = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            is_primaire_bron, betrouwbaarheid, levert_gebeurtenissen, onderwerpen, mag_citeren)
         values ($1,'rijksoverheid-nieuws','Rijksoverheid','rss',
                 'https://www.rijksoverheid.nl/feed','https://www.rijksoverheid.nl',
                 true,'toegestaan','geen_voorbehoud','geverifieerd','fixture',
                 true,5,true,array['netbeheer','regelgeving'],true)
         returning id`,
        [org],
      );
      const doc = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort, gepubliceerd_op)
         values ($1,$2,'fix-v2',
                 'https://www.rijksoverheid.nl/actueel/nieuws/2026/11/02/gegevensdeling',
                 $3,'Rijksoverheid','rss', now() - interval '2 days')
         returning id`,
        [org, bron.rows[0]!.id, TITEL_GEZAG],
      );
      await c.query(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte,
            documentsoort, documentsoort_gezag, documentsoort_versie)
         values ($1,$2,1,'hash-v2',$5,$3, length($3),
                 'FEITELIJKE_MEDEDELING','BEVOEGD_GEZAG',$4)`,
        [org, doc.rows[0]!.id, TEKST_GEZAG, DOCUMENTSOORT_VERSIE, TITEL_GEZAG],
      );
    });

    await clusterNieuweVersies(db.pool, org, { max: 10 });
  });

  after(async () => {
    await db?.opruimen();
  });

  /* ================================================================
     §4 · DE ACHT VORMEN LANDEN IN DE DATABASE
     ================================================================ */

  test("1 · de vormclaims staan in intel.uitspraken, met soort en vorm", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ claimvorm: string; soort: string; n: number }>(
        `select claimvorm, soort, count(*)::int as n
           from intel.uitspraken
          where claimvorm is not null
          group by claimvorm, soort order by claimvorm`,
      ),
    );
    const vormen = r.rows.map((x) => x.claimvorm);
    for (const verwacht of [
      "BESLUIT",
      "VERPLICHTING",
      "INWERKINGTREDING",
      "SUBSIDIEVENSTER",
      "CONGESTIESTATUS",
      "PROJECTSTATUS",
    ]) {
      assert.ok(vormen.includes(verwacht), `${verwacht} ontbreekt; gevonden: ${vormen.join(", ")}`);
    }
    /* DE SOORT MOET BIJ DE VORM PASSEN. Een BESLUIT als 'cijfer'
       opslaan zou de hele soortindeling waardeloos maken. */
    for (const x of r.rows) {
      const verwacht: Record<string, string> = {
        BESLUIT: "regel",
        VERPLICHTING: "regel",
        INWERKINGTREDING: "regel",
        SUBSIDIEVENSTER: "status",
        CONGESTIESTATUS: "status",
        PROJECTSTATUS: "status",
        SPECIFICATIE: "specificatie",
        BELEIDSWIJZIGING: "feit",
      };
      assert.equal(x.soort, verwacht[x.claimvorm], `${x.claimvorm} kreeg soort ${x.soort}`);
    }
  });

  test("2 · elke vormclaim draagt een bronpassage die echt in de bronzin staat", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ id: number; claimvorm: string; bronpassage: string; tekst: string }>(
        `select id, claimvorm, bronpassage, tekst from intel.uitspraken
          where claimvorm is not null order by id`,
      ),
    );
    assert.ok(r.rows.length >= 6);
    for (const x of r.rows) {
      assert.ok(x.bronpassage.length >= 10, `${x.claimvorm}: passage ${x.bronpassage.length} tekens`);
      assert.ok(
        x.tekst.toLowerCase().includes(x.bronpassage.toLowerCase().slice(0, 25)),
        `${x.claimvorm}: passage "${x.bronpassage}" staat niet in de bronzin`,
      );
    }
  });

  test("3 · MEETHAAK — de database weigert een vormclaim zonder passage", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, claimvorm, tijdstand, risico_klasse)
             values ($1,'Een zin die lang genoeg is om door te komen.','regel',
                     'BESLUIT','IN_WERKING','laag')`,
            [org],
          );
        }),
      /uitspraken_vorm_vereist_passage/,
      "een claimvorm zonder bronpassage hoort geweigerd te worden",
    );
  });

  test("4 · MEETHAAK — een AANGEKONDIGDE claim mag geen geldig_vanaf dragen", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, claimvorm, tijdstand, bronpassage,
                geldig_vanaf, risico_klasse)
             values ($1,'Een zin die lang genoeg is om door te komen.','regel',
                     'INWERKINGTREDING','AANGEKONDIGD','treedt in werking per',
                     '2026-01-01','laag')`,
            [org],
          );
        }),
      /uitspraken_aangekondigd_is_niet_in_werking/,
      "aangekondigd met een ingangsdatum zou stil als geldend recht lezen",
    );
  });

  test("5 · MEETHAAK — een datumrol hoort alleen bij een datumclaim", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, waarde_numeriek, eenheid, datumrol,
                bronpassage, risico_klasse)
             values ($1,'Een zin die lang genoeg is om door te komen.','cijfer',
                     12,'%','EINDDATUM','sluit op 31 december','laag')`,
            [org],
          );
        }),
      /uitspraken_datumrol_bij_datum/,
      "een percentage met een einddatumrol is een verkeerd gelabelde claim",
    );
  });

  test("6 · MEETHAAK — een LOSSE_DATUM kan nooit VERWOORDBAAR worden", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, datumrol, bronpassage, risico_klasse,
                toepassingsgebied, toepassingsgebied_grondslag,
                verwoordbaar, verwoordbaar_reden, verwoorde_zin)
             values ($1,'Een zin die lang genoeg is om door te komen.','datum',
                     'LOSSE_DATUM','een passage van voldoende lengte','laag',
                     'NEDERLAND','de bronzin noemt Nederland expliciet',
                     'VERWOORDBAAR','een reden van voldoende lengte voor de constraint',
                     'Volgens de bron is 14 maart 2027 een datum in de regeling.')`,
            [org],
          );
        }),
      /uitspraken_losse_datum_niet_verwoordbaar/,
      "de regel uit §5 hoort ook in de database te staan",
    );
  });

  test("7 · MEETHAAK — een onbekende claimvorm wordt geweigerd", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, claimvorm, bronpassage, risico_klasse)
             values ($1,'Een zin die lang genoeg is om door te komen.','regel',
                     'MARKTONTWIKKELING','een passage van voldoende lengte','laag')`,
            [org],
          );
        }),
      /uitspraken_claimvorm/,
      "de lijst van acht vormen is gesloten",
    );
  });

  /* ================================================================
     §4 · EEN JURIDISCHE VORMCLAIM BEVESTIGT ZICHZELF NIET
     ================================================================ */

  test("8 · DE KERNZAAK — BESLUIT, VERPLICHTING en INWERKINGTREDING blijven ongeverifieerd", async () => {
    /* DIT IS DE ZAAK DIE DE REPARATIE BEWIJST, en hij rust op een
       GEMETEN classificatie en niet op de fixturekolommen.

       Voor het rijksoverheid-document rekent classificeerVersie() uit:
       FEITELIJKE_MEDEDELING / BEVOEGD_GEZAG / NIEUWSBERICHT, plafond 4,
       magZelfBevestigen TRUE. De bron staat op betrouwbaarheid 5 en is
       primair. `magBevestigen` is daar dus WAAR — de documentsoortlaag
       houdt deze claims niet tegen.

       Wat ze tegenhoudt is de juridische poort: vormKanVaststellen(
       NIEUWSBERICHT) is false, dus steltStukDeClaimVast() zegt nee. Een
       nieuwsbericht van het bevoegd gezag mag MELDEN dat een regel
       geldt; het mag niet het BEWIJS zijn dat hij geldt.

       ZONDER isJuridischeClaim() ZOU 'BESLUIT' HIER BEVESTIGD STAAN:
       bepaalClaimAard() vuurt niet op "heeft de verplichte
       gegevensdeling vastgesteld" als besluitmarkering — hij vuurt daar
       wel op 'verplicht', maar voor een zin als "Geschilbesluit Jumbo –
       Liander" vuurt hij op niets, en dat was het gat.

       De eerste fixture (netbeheer-nederland-nieuws) komt uit op
       SECUNDAIRE_BERICHTGEVING / MARKT met plafond 1 en
       magZelfBevestigen false; daar blokkeert de documentsoortlaag al,
       en dan zegt 'ongeverifieerd' niets over deze poort. Daarom staat
       deze zaak op het gezagsdocument. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ claimvorm: string; verificatie_status: string }>(
        `select claimvorm, verificatie_status from intel.uitspraken
          where claimvorm in ('BESLUIT','VERPLICHTING','INWERKINGTREDING')
          order by claimvorm`,
      ),
    );
    assert.ok(r.rows.length >= 3, `verwacht drie juridische vormen, kreeg ${r.rows.length}`);
    for (const x of r.rows) {
      assert.equal(
        x.verificatie_status,
        "ongeverifieerd",
        `${x.claimvorm} bevestigde zichzelf uit een niet-vaststellend stuk`,
      );
    }
  });

  test("9 · en de blokkade staat navolgbaar in het beoordelingsregister", async () => {
    /* DE BRON MAG ZICHZELF BEVESTIGEN. Gemeten:
       bewijskrachtPlafond(FEITELIJKE_MEDEDELING, NETBEHEERDER) = 4 en
       magZelfBevestigen() = true. Deze claims zijn dus niet
       tegengehouden door de documentsoortlaag maar door de
       juridische poort — en dan hoort de blokkade in een register te
       staan waar een mens hem kan beslissen, niet alleen in een
       logregel die na een deploy weg is. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ aanleiding: string; reden: string; n: number }>(
        `select aanleiding, reden, count(*)::int as n
           from intel.claimbeoordeling group by aanleiding, reden order by n desc`,
      ),
    );
    const totaal = r.rows.reduce((s, x) => s + x.n, 0);
    assert.ok(
      totaal > 0,
      "een geblokkeerde juridische claim hoort in intel.claimbeoordeling te komen",
    );
    /* EN DE REDEN MOET DE GROND NOEMEN. Een register met een lege reden
       is geen register maar een teller. */
    for (const x of r.rows) {
      assert.ok((x.reden ?? "").length >= 15, `aanleiding ${x.aanleiding} zonder reden`);
    }
  });

  /* ================================================================
     §5 · DE DATUMCLAIMS WORDEN BEOORDEELD
     ================================================================ */

  test("10 · de datumclaims krijgen een rol, en de rollen worden onderscheiden", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ datumrol: string | null; n: number }>(
        `select datumrol, count(*)::int as n from intel.uitspraken
          where soort = 'datum' group by datumrol order by datumrol nulls last`,
      ),
    );
    const rollen = r.rows.map((x) => x.datumrol);
    assert.ok(rollen.includes("AANVRAAGPERIODE"), `gevonden rollen: ${rollen.join(", ")}`);
    /* De losse datum in de fixture ("Tijdens het congres op 14 maart
       2027") hoort GEEN rol en dus ook geen passage te krijgen: bij
       LOSSE_DATUM laat de extractie beide leeg, zodat de
       passage-constraint niet over een lege rol struikelt. */
    assert.ok(rollen.includes(null), `de losse datum hoort rolloos te blijven: ${rollen.join(", ")}`);
  });

  test("11 · DE KERNZAAK VAN §5 — een datumclaim wordt WEL beoordeeld", async () => {
    /* Vóór deze release gaf verrijk() null voor elke claim zonder
       waarde_numeriek, en bleven alle datumclaims op verwoordbaar NULL
       staan. Gemeten in productie op 6 november 2026: 39 datumclaims,
       nul beoordeeld. */
    const voor = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number }>(
        `select count(*)::int as n from intel.uitspraken
          where soort = 'datum' and verwoordbaar is null`,
      ),
    );
    assert.ok((voor.rows[0]?.n ?? 0) > 0, "er horen onbeoordeelde datumclaims te staan");

    await backfillSemantiek(db.pool, org, { max: 200 });

    const na = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ datumrol: string | null; verwoordbaar: string | null; reden: string | null }>(
        `select datumrol, verwoordbaar, verwoordbaar_reden as reden
           from intel.uitspraken where soort = 'datum' order by id`,
      ),
    );
    const metRol = na.rows.filter((x) => x.datumrol !== null);
    assert.ok(metRol.length > 0, "er hoort minstens één datumclaim met een rol te zijn");
    for (const x of metRol) {
      assert.ok(
        x.verwoordbaar !== null,
        `een datumclaim met rol ${x.datumrol} bleef onbeoordeeld — precies het defect uit §5`,
      );
      assert.ok((x.reden ?? "").length >= 15, "een oordeel hoort een navolgbare reden te hebben");
    }
  });

  test("11b · DE PRODUCTIEFOUT — een LOSSE datum laat zich wegschrijven", async () => {
    /* GEMETEN IN PRODUCTIE op 6 november 2026, direct na de uitrol van
       0055:

         uitspraken bekeken 84, verrijkt 33, mislukt 38
         new row for relation "uitspraken" violates check constraint
         "uitspraken_vorm_vereist_passage"

       De oorzaak: een afgeleide LOSSE_DATUM is een ROL met een LEGE
       passage, en verrijkVorm() schreef die rol weg met
       bronpassage NULL. 0055 weigert die combinatie terecht.

       zoekDatums() in uitspraken.ts deed het al goed — die zet bij een
       te korte passage ALLE TWEE op null. Twee schrijvers naar dezelfde
       kolommen, en maar één kende de regel.

       GEEN ENKELE TOETS VING DIT, en dat is de echte tekortkoming: de
       eenheidstoetsen keken naar bepaalDatumrol() en de integratietoets
       naar claims MET een rol. Deze zaak legt een claim neer waarvan de
       rol LOSSE_DATUM wordt en eist dat de verrijking slaagt. */
    const losseDatum =
      "Tijdens het congres op 14 maart 2027 spreken deskundigen over het nettarief.";
    const id = await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const r = await c.query<{ id: number }>(
        `insert into intel.uitspraken
           (organisatie_id, tekst, soort, onderwerp, risico_klasse,
            modaliteit, modaliteit_zekerheid, modaliteit_versie)
         values ($1,$2,'datum','netbeheer','laag','VASTGESTELD',0.80,'toets')
         returning id`,
        [org, losseDatum],
      );
      const uid = r.rows[0]!.id;
      await c.query(
        `insert into intel.uitspraak_bronnen
           (organisatie_id, uitspraak_id, versie_id, rol, vindplaats)
         values ($1,$2,$3,'primair','toets')`,
        [org, uid, versieId],
      );
      return uid;
    });

    /* DE VERRIJKING MOET SLAGEN. Mislukt hij, dan telt backfillSemantiek
       hem als `onveranderd` — en dat is precies wat in productie 38 keer
       gebeurde. */
    const r = await backfillSemantiek(db.pool, org, { max: 200, alles: true });
    assert.equal(
      r.onveranderd,
      0,
      `${r.onveranderd} verrijking(en) mislukt; dat is de productiefout van 6 november`,
    );

    const na = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ datumrol: string | null; passage: string | null; verwoordbaar: string | null; reden: string | null }>(
        `select datumrol, bronpassage as passage, verwoordbaar, verwoordbaar_reden as reden
           from intel.uitspraken where id = $1`,
        [id],
      ),
    );
    const rij = na.rows[0]!;
    /* EEN ROL EN EEN PASSAGE GAAN SAMEN, OF GEEN VAN BEIDE. */
    assert.equal(rij.datumrol, null, "een losse datum krijgt geen rol");
    assert.equal(rij.passage, null, "en dus ook geen passage");
    /* MAAR DE UITKOMST VERDWIJNT NIET: hij staat in het oordeel.

       EN DE UITSLAG WORDT HIER VASTGEPIND, niet alleen "niet
       verwoordbaar". Mijn eerste versie van deze zaak liet zowel
       CONTEXT_ONVOLLEDIG als VERIFICATIE_NODIG passeren, en daardoor
       kon het commentaar bij de fix een uitkomst beweren die de code
       niet gaf — vier onafhankelijke lezingen van PR #73 hebben dat
       weerlegd. Gemeten uitslag: met rol en passage beide null komt de
       claim bij vormpoort() niet bij de datumrolcontrole maar bij
       CONTROLE 2, de passage-eis. */
    assert.equal(
      rij.verwoordbaar,
      "VERIFICATIE_NODIG",
      `verwachtte VERIFICATIE_NODIG uit controle 2 van vormpoort, kreeg ${rij.verwoordbaar}`,
    );
    assert.match(
      rij.reden ?? "",
      /geen concrete bronpassage/,
      `de reden hoort de ontbrekende passage te noemen: ${rij.reden}`,
    );
    assert.ok((rij.reden ?? "").length >= 15, rij.reden ?? "geen reden");
  });

  test("12 · een onbevestigde datumclaim wordt niet verwoordbaar", async () => {
    /* GEEN DREMPEL VERLAAGD. De poort eist verificatie_status
       'bevestigd', net als de getalpoort. Deze fixture komt uit een
       niet-vaststellend stuk, dus niets bevestigt zichzelf en niets
       wordt verwoordbaar. Dat is het juiste antwoord, niet een
       tekortkoming. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number }>(
        `select count(*)::int as n from intel.uitspraken
          where soort = 'datum' and verwoordbaar = 'VERWOORDBAAR'`,
      ),
    );
    assert.equal(r.rows[0]?.n, 0);
  });

  test("13 · de vormclaims worden ook beoordeeld, en de reden noemt de grond", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ claimvorm: string; verwoordbaar: string | null; reden: string | null }>(
        `select claimvorm, verwoordbaar, verwoordbaar_reden as reden
           from intel.uitspraken where claimvorm is not null order by claimvorm`,
      ),
    );
    for (const x of r.rows) {
      assert.ok(x.verwoordbaar !== null, `${x.claimvorm} bleef onbeoordeeld`);
      assert.ok((x.reden ?? "").length >= 15, `${x.claimvorm} zonder navolgbare reden`);
    }
    /* En geen van hen is verwoordbaar, want geen van hen is bevestigd. */
    assert.equal(
      r.rows.filter((x) => x.verwoordbaar === "VERWOORDBAAR").length,
      0,
      "een onbevestigde vormclaim hoort niet verwoordbaar te zijn",
    );
  });

  test("14 · een tweede ronde verandert niets — idempotent", async () => {
    const stand = async () =>
      metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
        const r = await c.query(
          `select id, claimvorm, datumrol, tijdstand, bronpassage, verwoordbaar,
                  verwoordbaar_reden, semantiek_soort, toepassingsgebied
             from intel.uitspraken order by id`,
        );
        return JSON.stringify(r.rows);
      });
    const voor = await stand();
    await backfillSemantiek(db.pool, org, { max: 200, alles: true });
    assert.equal(await stand(), voor, "een tweede beoordelingsronde hoort dezelfde stand te geven");
  });

  test("15 · de herverwerking maakt geen dubbele vormclaims", async () => {
    const voor = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number }>("select count(*)::int as n from intel.uitspraken"),
    );
    const r = await clusterNieuweVersies(db.pool, org, { max: 10, herverwerk: true });
    assert.equal(
      r.uitsprakenAangemaakt,
      0,
      `een herverwerking van ongewijzigde tekst mag niets aanmaken; rapport: ${JSON.stringify(r)}`,
    );
    assert.ok(r.uitsprakenOvergeslagen > 0, "de bestaande claims horen als overgeslagen te tellen");
    const na = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number }>("select count(*)::int as n from intel.uitspraken"),
    );
    assert.equal(na.rows[0]?.n, voor.rows[0]?.n);

    /* EN GEEN TWEE CLAIMS MET DEZELFDE VORM OP DEZELFDE BRONVERSIE. */
    const dub = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number }>(
        `select count(*)::int as n from (
           select ub.versie_id, u.soort, u.tekst, u.claimvorm, u.datumrol
             from intel.uitspraken u
             join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
            group by 1,2,3,4,5 having count(*) > 1) z`,
      ),
    );
    assert.equal(dub.rows[0]?.n, 0, "er horen geen dubbele claims te staan");
  });

  test("16 · elke vormclaim is herleidbaar naar een PRIMAIRE bronversie", async () => {
    /* De eis is "herleidbaar naar zijn bronversie" en niet "naar DIE
       ene": er zijn twee fixtures, dus een toets die op één versie-id
       pint, meet de fixture en niet de eigenschap. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number }>(
        `select count(*)::int as n from intel.uitspraken u
          where u.claimvorm is not null
            and not exists (select 1 from intel.uitspraak_bronnen ub
                             where ub.uitspraak_id = u.id and ub.rol = 'primair')`,
      ),
    );
    assert.equal(r.rows[0]?.n, 0, "een vormclaim zonder primaire bronversie is niet herleidbaar");

    /* EN DE EERSTE FIXTURE DRAAGT ER ECHT EEN AANTAL, zodat deze toets
       niet groen kan staan bij nul vormclaims. */
    const eigen = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number }>(
        `select count(*)::int as n from intel.uitspraken u
           join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
          where u.claimvorm is not null and ub.versie_id = $1`,
        [versieId],
      ),
    );
    assert.ok((eigen.rows[0]?.n ?? 0) >= 6, `verwacht minstens zes, kreeg ${eigen.rows[0]?.n}`);
  });
});
