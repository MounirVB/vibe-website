/* ============================================================
   INTEGRATIE — de VOLLEDIGE semantiektaak op productievormige data
   ------------------------------------------------------------
   WAAROM DEZE TOETS BESTAAT, en waarom hij de ECHTE taak aanroept.

   Op 6 november 2026 lag de semantiekstap in productie stil. Taak 6887
   (semantiek:2026-11-06T08) stond in de DLQ met:

     new row for relation "uitspraken" violates check constraint
     "uitspraken_bevestigd_vraagt_direct"

   150 van 170 claims zonder bewijsniveau, en de claims van die ochtend
   zonder verwoordbaarheidsoordeel. De oorzaak lag niet in één functie
   maar in de SAMENLOOP van drie stappen die de taak achter elkaar zet:
   backfillSemantiek, vulClaimAfdrukkenIn en vulBewijsniveauIn. Elke
   stap had zijn eigen toetsen en was groen.

   DAAROM ROEPT DEZE TOETS REGISTER.semantiek AAN en niet de drie
   functies apart. Een toets die de taak NABOUWT, meet zijn eigen
   nabouw — dat is de klasse fout die deze repo bij de PDF-opname al
   heeft betaald (zie de kop van test/integratie/pdf-opname.test.ts).

   DE DATA IS PRODUCTIEVORMIG. Vier rijen die samen elke stand dekken
   die in productie voorkwam:

     1 een bevestigde claim uit een OFFICIEEL besluit, uit het
       vaststellende deel          -> hoort DIRECT_BEVESTIGD te worden
     2 een bevestigde claim uit datzelfde besluit, maar uit de sectie
       'Standpunten van partijen'  -> hoort NIET te bevestigen
     3 een bevestigde claim die GERECTIFICEERD is
       -> heeft geen levende waarneming, dus geen niveau, en moet naar
          het beoordelingsregister in plaats van de taak te laten vallen
     4 een losse datum zonder passage
       -> rol en passage blijven null, en de claim wordt wél beoordeeld
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
import { REGISTER } from "../../src/kern/taken.ts";
import { clusterNieuweVersies } from "../../src/pijplijn/clusteren.ts";
import { DOCUMENTSOORT_VERSIE } from "../../src/pijplijn/documentsoort.ts";

/* ------------------------------------------------------------------
   DE BRONTEKST — woordelijk gemodelleerd op het ACM-geschilbesluit
   Jumbo – Liander: dezelfde administratieve kop, dezelfde
   paragraafindeling, dezelfde dichtheid aan standpunten.
   ------------------------------------------------------------------ */
const TITEL = "Geschilbesluit over het congestierapport en het nettarief";
const BESLUIT = [
  "Ons kenmerk : ACM/UIT/1123013",
  "Zaaknummer : ACM/25/198549",
  "Besluit van de Autoriteit Consument en Markt als bedoeld in artikel 5.4 van de Energiewet",
  "over netcongestie en het nettarief.",
  "",
  "4. Wettelijk kader",
  "Op grond van artikel 5.4 van de Energiewet beslecht de ACM geschillen.",
  "",
  /* GEEN DUBBELE PUNT, en met subparagraafnummer — zo staat het in de
     ECHTE opgeslagen tekst (brondocument_versie 4394):
       "... bij dit besluit. 5. Standpunten van partijen\n5.1. Jumbo\n14. ..."
     Een fixture met ':' achter de kop toetst een vorm die in productie
     niet voorkomt. */
  "5. Standpunten van partijen",
  "5.1. Jumbo",
  "14. Jumbo heeft kort samengevat het volgende naar voren gebracht.",
  "15. Volgens Jumbo is in het congestierapport slechts 40 procent van de flexibiliteit onderzocht.",
  "",
  "6. Beoordeling van het geschil",
  "De ACM stelt vast dat het gecontracteerde transportvermogen 630 kVA bedraagt.",
  "",
  "7. Dictum",
  "De Autoriteit Consument en Markt verklaart de klacht gegrond.",
  "Belanghebbenden kunnen tegen dit besluit beroep instellen bij de rechtbank.",
].join("\n");

describe("de volledige semantiektaak", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let versieId = 0;

  before(async () => {
    db = await maakWegwerpdatabase("semantiektaak");
    org = await maakOrganisatie(db, "semantiektaak-org");

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam, risico_klasse)
         values ($1,'netcongestie','Netcongestie','midden'),
                ($1,'netbeheer','Netbeheer','midden')`,
        [org],
      );
      const bron = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            is_primaire_bron, betrouwbaarheid, levert_gebeurtenissen, onderwerpen, mag_citeren)
         values ($1,'acm-besluiten','Autoriteit Consument en Markt','html_lijst',
                 'https://www.acm.nl/nl/publicaties','https://www.acm.nl',
                 true,'toegestaan','geen_voorbehoud','geverifieerd','fixture',
                 true,5,true,array['netcongestie','netbeheer'],true)
         returning id`,
        [org],
      );
      const doc = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
            gepubliceerd_op)
         values ($1,$2,'fix-besluit',
                 'https://www.acm.nl/system/files/documents/geschilbesluit.pdf',
                 $3,'Autoriteit Consument en Markt','dataset', now() - interval '2 days')
         returning id`,
        [org, bron.rows[0]!.id, TITEL],
      );
      const v = await c.query<{ id: number }>(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst,
            tekst_lengte, documentsoort, documentsoort_gezag, documentsoort_versie,
            documentvorm)
         values ($1,$2,1,'hash-besluit',$5,$3, length($3),
                 'OFFICIEEL_BESLUIT','BEVOEGD_GEZAG',$4,'BEKENDMAKING')
         returning id`,
        [org, doc.rows[0]!.id, BESLUIT, DOCUMENTSOORT_VERSIE, TITEL],
      );
      versieId = v.rows[0]!.id;
    });

    /* De echte extractie- en schrijfweg, niet een nabouw. */
    await clusterNieuweVersies(db.pool, org, { max: 10 });

    /* EEN GERECTIFICEERDE, BEVESTIGDE CLAIM — stand 3 uit de kop. Dit
       is de rij waarop de productietaak omviel: 'bevestigd' terwijl er
       geen levende waarneming meer is, dus een niveau dat de
       bevestiging niet draagt. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      /* EERST DE BRON, DAN DE STATUS — zoals schrijfUitspraken() het
         ook doet. `uitspraken_bewijsplicht` is een DEFERRABLE trigger
         die bij het afsluiten van de transactie eist dat een
         bevestigde claim een primaire bronversie heeft. Mijn eerste
         versie van deze fixture zette de status meteen op 'bevestigd'
         en kreeg woordelijk:

           uitspraak 6 kan niet bevestigd worden zonder primaire
           bronversie

         Dat is de grendel die werkt, niet een fout in de toets. */
      const oud = await c.query<{ id: number }>(
        `insert into intel.uitspraken
           (organisatie_id, tekst, soort, waarde_numeriek, eenheid, onderwerp,
            risico_klasse, verificatie_status, bewijs_kwaliteit, bewijskracht_plafond,
            modaliteit, modaliteit_zekerheid, modaliteit_versie)
         values ($1,'In 2025 is ruim 3 miljard euro aan netinvesteringen gedaan door de netbeheerders.',
                 'prijs',3,'EUR','netbeheer','laag','ongeverifieerd',5,5,
                 'VASTGESTELD',0.80,'fixture')
         returning id`,
        [org],
      );
      const nieuw = await c.query<{ id: number }>(
        `insert into intel.uitspraken
           (organisatie_id, tekst, soort, waarde_numeriek, eenheid, onderwerp,
            risico_klasse, verificatie_status, bewijs_kwaliteit, bewijskracht_plafond,
            modaliteit, modaliteit_zekerheid, modaliteit_versie)
         values ($1,'In 2025 is ruim 3 miljard euro aan netinvesteringen gedaan door de netbeheerders.',
                 'prijs',3000000000,'EUR','netbeheer','laag','ongeverifieerd',5,5,
                 'VASTGESTELD',0.80,'fixture')
         returning id`,
        [org],
      );
      for (const id of [oud.rows[0]!.id, nieuw.rows[0]!.id]) {
        await c.query(
          `insert into intel.uitspraak_bronnen
             (organisatie_id, uitspraak_id, versie_id, rol, vindplaats)
           values ($1,$2,$3,'primair','fixture')`,
          [org, id, versieId],
        );
      }
      /* NU de status, met de bronversie er al aan. */
      await c.query(
        `update intel.uitspraken set verificatie_status = 'bevestigd'
          where organisatie_id = $1 and id = $2`,
        [org, oud.rows[0]!.id],
      );
      await c.query(
        `insert into intel.uitspraak_correcties
           (organisatie_id, vervangen_id, vervanger_id, soort, grondslag)
         values ($1,$2,$3,'rectificatie',
                 'Schaalcorrectie: de brontekst zet miljard direct naast het getal, maar de bewaarde waarde was 3.')`,
        [org, oud.rows[0]!.id, nieuw.rows[0]!.id],
      );
    });
  });

  after(async () => {
    await db?.opruimen();
  });

  /** De uitkomst van de taak, zoals de worker hem zou krijgen. */
  async function draaiTaak(payload: Record<string, unknown> = {}): Promise<string> {
    const handler = REGISTER["semantiek"];
    assert.ok(handler, "er hoort een handler voor 'semantiek' te zijn");
    return handler(db.pool, org, payload);
  }

  /* ================================================================
     §1 · DE TAAK LOOPT NIET MEER VAST
     ================================================================ */

  test("1 · DE KERNZAAK — de taak draait zonder te vallen", async () => {
    /* Hier viel productie om. De rij met de gerectificeerde,
       bevestigde claim zit in de fixture, dus als de taak nog op zijn
       eigen grendel valt, faalt deze zaak met de constraintnaam erin. */
    const uitkomst = await draaiTaak();
    assert.match(uitkomst, /bekeken \d+/, uitkomst);
    assert.doesNotMatch(uitkomst, /violates check constraint/, uitkomst);
  });

  test("2 · en een tweede ronde ook — idempotent", async () => {
    const stand = async () =>
      metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
        const r = await c.query(
          `select id, bewijsniveau, bewijsniveau_reden, verificatie_status,
                  verwoordbaar, claim_afdruk, datumrol, bronpassage
             from intel.uitspraken order by id`,
        );
        return JSON.stringify(r.rows);
      });
    const voor = await stand();
    await draaiTaak();
    assert.equal(await stand(), voor, "dezelfde invoer hoort dezelfde stand te geven");
  });

  /* ================================================================
     ALLE GESCHIKTE CLAIMS KRIJGEN EEN CORRECT BEWIJSNIVEAU
     ================================================================ */

  test("3 · elke claim heeft een niveau, BEHALVE de strijdige", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ niveau: string | null; n: number }>(
        `select bewijsniveau as niveau, count(*)::int as n
           from intel.uitspraken group by 1 order by n desc`,
      ),
    );
    const zonder = r.rows.find((x) => x.niveau === null)?.n ?? 0;
    const met = r.rows.filter((x) => x.niveau !== null).reduce((s, x) => s + x.n, 0);
    assert.ok(met > 0, `geen enkele claim kreeg een niveau: ${JSON.stringify(r.rows)}`);
    /* De strijdige rij hoort GEEN label te krijgen — geen label is geen
       bewering — en precies één rij in deze fixture is strijdig. */
    assert.equal(zonder, 1, `verwacht precies één rij zonder niveau, kreeg ${zonder}`);
  });

  test("4 · de strijdige rij is de GERECTIFICEERDE, bevestigde claim", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ id: number; status: string; gerectificeerd: boolean }>(
        `select u.id, u.verificatie_status as status,
                exists (select 1 from intel.uitspraak_correcties k
                         where k.vervangen_id = u.id and k.soort='rectificatie') as gerectificeerd
           from intel.uitspraken u where u.bewijsniveau is null`,
      ),
    );
    assert.equal(r.rows.length, 1);
    assert.equal(r.rows[0]?.status, "bevestigd");
    assert.equal(r.rows[0]?.gerectificeerd, true);
  });

  test("5 · en zij staat in het beoordelingsregister, niet in een foutmelding", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ aanleiding: string; reden: string; n: number }>(
        `select aanleiding, min(reden) as reden, count(*)::int as n
           from intel.claimbeoordeling
          where aanleiding = 'BEWIJSNIVEAU_STRIJDIG_MET_STATUS'
          group by aanleiding`,
      ),
    );
    assert.equal(r.rows.length, 1, "de strijdige rij hoort doorverwezen te zijn");
    assert.ok((r.rows[0]?.reden ?? "").length >= 20);
  });

  test("6 · de HISTORISCHE bevestigingsstatus blijft staan", async () => {
    /* De gerectificeerde claim blijft 'bevestigd'. De taak verlaagt
       geen status en verwijdert geen rij; de correctieketen is
       append-only. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number; correcties: number }>(
        `select (select count(*)::int from intel.uitspraken
                  where verificatie_status='bevestigd') as n,
                (select count(*)::int from intel.uitspraak_correcties) as correcties`,
      ),
    );
    assert.ok((r.rows[0]?.n ?? 0) > 0, "er horen bevestigde claims te staan");
    assert.equal(r.rows[0]?.correcties, 1, "de correctieketen blijft intact");
  });

  /* ================================================================
     §2 · EEN PARTIJSTANDPUNT BEVESTIGT NIET
     ================================================================ */

  test("7 · DE KERNZAAK VAN §2 — de standpuntclaim is NIET bevestigd", async () => {
    /* "Volgens Jumbo is in het congestierapport slechts 40 procent van
       de flexibiliteit onderzocht" staat in de sectie 'Standpunten van
       partijen' van een OFFICIEEL_BESLUIT van BEVOEGD_GEZAG in de vorm
       BEKENDMAKING — een stuk dat zichzelf MAG bevestigen. Vóór de
       reparatie bevestigde deze cijferclaim, want hij draagt geen
       juridische markering en geen juridische claimvorm. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ id: number; status: string; tekst: string }>(
        `select id, verificatie_status as status, tekst
           from intel.uitspraken where tekst like 'Volgens Jumbo%' order by id`,
      ),
    );
    assert.ok(r.rows.length >= 1, "de standpuntclaim hoort geëxtraheerd te zijn");
    for (const x of r.rows) {
      assert.equal(
        x.status,
        "ongeverifieerd",
        `claim ${x.id} uit een partijstandpunt staat op ${x.status}: "${x.tekst.slice(0, 80)}"`,
      );
    }
  });

  test("8 · en zij is doorverwezen als ACHTERGRONDPASSAGE", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number }>(
        `select count(*)::int as n from intel.claimbeoordeling
          where aanleiding = 'ACHTERGRONDPASSAGE'`,
      ),
    );
    assert.ok((r.rows[0]?.n ?? 0) >= 1, "de blokkade hoort navolgbaar te zijn");
  });

  test("9 · MAAR de claim uit de BEOORDELING is wél bevestigd", async () => {
    /* Zonder deze zaak zou de reparatie alles kunnen blokkeren en nog
       steeds groen staan. "De ACM stelt vast dat het gecontracteerde
       transportvermogen 630 kVA bedraagt" staat in sectie 6 en is de
       vaststelling van het gezag zelf. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ id: number; status: string }>(
        `select id, verificatie_status as status from intel.uitspraken
          where tekst like 'De ACM stelt vast%'`,
      ),
    );
    assert.ok(r.rows.length >= 1, "de beoordelingsclaim hoort geëxtraheerd te zijn");
    for (const x of r.rows) assert.equal(x.status, "bevestigd", `claim ${x.id} is ${x.status}`);
  });

  /* ================================================================
     BRONPASSAGES EN PUBLICATIEBEVEILIGING
     ================================================================ */

  test("10 · geen rol zonder passage, en geen claim zonder primaire bron", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ rol_zonder_passage: number; zonder_bron: number }>(
        `select (select count(*)::int from intel.uitspraken
                  where (claimvorm is not null or datumrol is not null)
                    and (bronpassage is null or length(bronpassage) < 10)) as rol_zonder_passage,
                (select count(*)::int from intel.uitspraken u where not exists (
                   select 1 from intel.uitspraak_bronnen ub
                    where ub.uitspraak_id = u.id and ub.rol='primair')) as zonder_bron`,
      ),
    );
    assert.equal(r.rows[0]?.rol_zonder_passage, 0);
    assert.equal(r.rows[0]?.zonder_bron, 0);
  });

  test("11 · de taak publiceert niets", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ publicaties: number; versies: number; gepubliceerd: number }>(
        `select (select count(*)::int from intel.publicaties) as publicaties,
                (select count(*)::int from intel.inhoud_versies) as versies,
                (select count(*)::int from intel.inhoud_versies
                  where status='gepubliceerd') as gepubliceerd`,
      ),
    );
    assert.equal(r.rows[0]?.publicaties, 0);
    assert.equal(r.rows[0]?.gepubliceerd, 0);
  });

  test("12 · en zij verhoogt geen enkele verificatiestatus", async () => {
    /* De taak mag een claim beoordelen en labelen, niet bevestigen. */
    const voor = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number }>(
        `select count(*)::int as n from intel.uitspraken
          where verificatie_status='bevestigd'`,
      ),
    );
    await draaiTaak({ alles: true });
    const na = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number }>(
        `select count(*)::int as n from intel.uitspraken
          where verificatie_status='bevestigd'`,
      ),
    );
    assert.equal(na.rows[0]?.n, voor.rows[0]?.n, "het aantal bevestigde claims mag niet stijgen");
  });
});
