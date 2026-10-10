/* ============================================================
   TEST — schema, RLS, constraints en de wachtrij
   ------------------------------------------------------------
   Elke test krijgt een eigen wegwerpdatabase. De applicatiepool neemt
   de rol vibe_intel_app aan, dus RLS is hier echt van kracht en niet
   alleen op papier.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import {
  alsEigenaar,
  invarianten,
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie, zonderOrganisatie } from "../../src/kern/db.ts";

describe("schema en beveiliging", () => {
  let db: Wegwerpdatabase;
  let orgA = 0;
  let orgB = 0;

  before(async () => {
    db = await maakWegwerpdatabase("schema");
    orgA = await maakOrganisatie(db, "org-a");
    orgB = await maakOrganisatie(db, "org-b");
  });

  after(async () => {
    await db.opruimen();
  });

  test("migraties draaien vanaf nul en laten geen invariant open", async () => {
    assert.deepEqual(await invarianten(db), []);
  });

  test("de applicatierol is geen eigenaar, geen superuser en heeft geen BYPASSRLS", async () => {
    const r = await zonderOrganisatie(db.pool, (c) =>
      c.query<{ rol: string; su: boolean; bypass: boolean; eigenaar: number }>(
        `select current_user as rol,
                coalesce(r.rolsuper,false) as su,
                coalesce(r.rolbypassrls,false) as bypass,
                (select count(*)::int from pg_tables t
                  where t.schemaname='intel' and t.tableowner=current_user) as eigenaar
           from pg_roles r where r.rolname = current_user`,
      ),
    );
    const rij = r.rows[0];
    assert.equal(rij?.rol, "vibe_intel_app");
    assert.equal(rij?.su, false);
    assert.equal(rij?.bypass, false);
    assert.equal(rij?.eigenaar, 0);
  });

  test("RLS: zonder organisatiecontext is er niets te zien", async () => {
    const r = await zonderOrganisatie(db.pool, (c) =>
      c.query<{ n: number }>("select count(*)::int as n from intel.organisaties"),
    );
    assert.equal(r.rows[0]?.n, 0, "faalt dicht: geen context betekent geen rijen");
  });

  test("RLS: organisatie A ziet organisatie B niet", async () => {
    await metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
      c.query(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam)
         values ($1, 'alleen-a', 'Alleen A')`,
        [orgA],
      ),
    );
    const vanuitB = await metOrganisatie(db.pool, { organisatieId: orgB }, (c) =>
      c.query<{ n: number }>("select count(*)::int as n from intel.onderwerp_clusters"),
    );
    assert.equal(vanuitB.rows[0]?.n, 0, "cross-tenant lek");

    const vanuitA = await metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
      c.query<{ n: number }>("select count(*)::int as n from intel.onderwerp_clusters"),
    );
    assert.equal(vanuitA.rows[0]?.n, 1);
  });

  test("RLS: schrijven onder de verkeerde organisatie-id wordt geweigerd", async () => {
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgB }, (c) =>
          c.query(
            `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam)
             values ($1, 'smokkel', 'Smokkel')`,
            [orgA],
          ),
        ),
      /row-level security|policy/i,
    );
  });

  test("het auditspoor is append-only", async () => {
    await metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
      c.query(
        `insert into intel.audit_gebeurtenissen
           (organisatie_id, actor_soort, handeling, objectsoort)
         values ($1, 'systeem', 'test', 'niets')`,
        [orgA],
      ),
    );
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query("update intel.audit_gebeurtenissen set handeling = 'gewijzigd'"),
        ),
      /append-only|permission denied/i,
    );
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query("delete from intel.audit_gebeurtenissen"),
        ),
      /append-only|permission denied/i,
    );
  });

  test("de applicatierol kan niet in de referentiegeografie schrijven", async () => {
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query(
            `insert into intel.geo_bereiken (soort, code, naam, bron_sleutel)
             values ('gemeente', '9999', 'Verzonnen', 'test')`,
          ),
        ),
      /permission denied/i,
    );
  });

  test("een uitspraak kan niet bevestigd worden zonder primaire bronversie", async () => {
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, verificatie_status)
             values ($1, 'Zomaar een bewering', 'feit', 'bevestigd')`,
            [orgA],
          ),
        ),
      /zonder primaire bronversie/i,
    );
  });

  test("een interpretatie kan de soort 'feit' niet hebben", async () => {
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, is_interpretatie, interpretatie_door)
             values ($1, 'Onze gevolgtrekking', 'feit', true, 'ai')`,
            [orgA],
          ),
        ),
      /interpretatie_niet_als_feit/i,
    );
  });

  test("het vertrouwensplafond per soort wordt afgedwongen", async () => {
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, is_interpretatie, interpretatie_door, vertrouwen)
             values ($1, 'Te zeker', 'interpretatie', true, 'ai', 0.95)`,
            [orgA],
          ),
        ),
      /vertrouwensplafond/i,
    );
  });

  test("automatisch publiceren bij hoog risico is onmogelijk", async () => {
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query(
            `insert into intel.publicatiebeleid
               (organisatie_id, versie, auto_publiceren_aan, auto_max_risico)
             values ($1, 'roekeloos', true, 'hoog')`,
            [orgA],
          ),
        ),
      /hoog_risico_nooit_automatisch/i,
    );
  });

  test("een signaal kan geen persoonsgegevens bevatten", async () => {
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query(
            `insert into intel.commerciele_signalen
               (organisatie_id, subject_naam, subject_soort, geverifieerde_gebeurtenis,
                bevat_persoonsgegevens)
             values ($1, 'Iemand', 'organisatie', 'iets', true)`,
            [orgA],
          ),
        ),
      /geen_persoonsgegevens/i,
    );
  });

  test("een signaal kan niet gekwalificeerd zijn zonder geverifieerd feit", async () => {
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query(
            `insert into intel.commerciele_signalen
               (organisatie_id, subject_naam, subject_soort, geverifieerde_gebeurtenis,
                verificatie_status, status)
             values ($1, 'Bedrijf', 'organisatie', 'iets', 'onbevestigd', 'gekwalificeerd')`,
            [orgA],
          ),
        ),
      /kwalificatie_vereist_verificatie/i,
    );
  });

  test("een extern kanaal kan niet vrijgegeven worden zonder machtiging", async () => {
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query(
            `insert into intel.distributie_concepten
               (organisatie_id, kanaal, titel, body, status, machtiging_bewijs)
             values ($1, 'linkedin', 'Kop', 'Tekst', 'vrijgegeven', null)`,
            [orgA],
          ),
        ),
      /extern_vereist_machtiging/i,
    );
  });

  test("een netcapaciteitspatch op grondslag 'afgeleid' kan niet bestaan", async () => {
    const ids = await metOrganisatie(db.pool, { organisatieId: orgA }, async (c) => {
      const g = await c.query<{ id: number }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, gebeurtenis_soort)
         values ($1, 'geo-test', 'Test', 'netcongestie') returning id`,
        [orgA],
      );
      const gb = await c.query<{ id: number }>(
        "select id from intel.geo_bereiken where soort = 'land' limit 1",
      );
      return { gebeurtenis: g.rows[0]?.id ?? 0, gebied: gb.rows[0]?.id ?? 0 };
    });

    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query(
            `insert into intel.regio_impacts
               (organisatie_id, gebeurtenis_id, geo_bereik_id, impact_soort, grondslag, bewijs)
             values ($1, $2, $3, 'netcapaciteit', 'afgeleid', 'wij denken dat')`,
            [orgA, ids.gebeurtenis, ids.gebied],
          ),
        ),
      /netclaim_vereist_bronbewijs/i,
    );

    // Met bronbewijs mag het wel.
    await metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
      c.query(
        `insert into intel.regio_impacts
           (organisatie_id, gebeurtenis_id, geo_bereik_id, impact_soort, grondslag, bewijs)
         values ($1, $2, $3, 'netcapaciteit', 'bron_expliciet', 'de bron noemt dit gebied')`,
        [orgA, ids.gebeurtenis, ids.gebied],
      ),
    );
  });

  test("vier ogen: de goedkeurder mag niet de auteur zijn", async () => {
    const auteur = await maakGebruiker(db, orgA, "auteur@test.nl", "analist");
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query(
            `insert into intel.inhoud_versies
               (organisatie_id, pad, versie, soort, titel, canonieke_url, body_markdown,
                auteur_soort, aangemaakt_door, goedgekeurd_door, inhoud_afdruk,
                goedgekeurde_afdruk, status, poorten_geslaagd)
             values ($1,'/x',1,'nieuw_artikel','T','https://x/x','b','ai',$2,$2,'h','h','goedgekeurd',true)`,
            [orgA, auteur],
          ),
        ),
      /vier_ogen/i,
    );
  });

  test("goedkeuring bindt aan de afdruk: tekst wijzigen maakt publiceren onmogelijk", async () => {
    const auteur = await maakGebruiker(db, orgA, "auteur2@test.nl", "analist");
    const keurder = await maakGebruiker(db, orgA, "keurder@test.nl", "redacteur");

    const versieId = await metOrganisatie(db.pool, { organisatieId: orgA }, async (c) => {
      const r = await c.query<{ id: number }>(
        `insert into intel.inhoud_versies
           (organisatie_id, pad, versie, soort, titel, canonieke_url, body_markdown,
            auteur_soort, aangemaakt_door, goedgekeurd_door, inhoud_afdruk,
            goedgekeurde_afdruk, status, poorten_geslaagd)
         values ($1,'/y',1,'nieuw_artikel','T','https://x/y','b','ai',$2,$3,'afdruk1','afdruk1','goedgekeurd',true)
         returning id`,
        [orgA, auteur, keurder],
      );
      return r.rows[0]?.id ?? 0;
    });

    // De tekst wijzigen zonder opnieuw goed te keuren moet botsen.
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query("update intel.inhoud_versies set inhoud_afdruk = 'afdruk2' where id = $1", [
            versieId,
          ]),
        ),
      /goedkeuring_bindt/i,
    );
  });

  test("publiceren vereist geslaagde poorten en geen blokkades", async () => {
    const auteur = await maakGebruiker(db, orgA, "auteur3@test.nl", "analist");
    const keurder = await maakGebruiker(db, orgA, "keurder3@test.nl", "redacteur");
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query(
            `insert into intel.inhoud_versies
               (organisatie_id, pad, versie, soort, titel, canonieke_url, body_markdown,
                auteur_soort, aangemaakt_door, goedgekeurd_door, inhoud_afdruk,
                goedgekeurde_afdruk, status, poorten_geslaagd, blokkades)
             values ($1,'/z',1,'nieuw_artikel','T','https://x/z','b','ai',$2,$3,'h','h','gepubliceerd',false,'{iets}')`,
            [orgA, auteur, keurder],
          ),
        ),
      /publicatie_vereist_poorten/i,
    );
  });

  test("publicatiebesluiten zijn append-only", async () => {
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query("delete from intel.publicatiebesluiten"),
        ),
      /append-only|permission denied/i,
    );
  });

  test("wachtrij: dezelfde idempotentiesleutel kan niet twee keer bestaan", async () => {
    await metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
      c.query(
        `insert into intel.taken (organisatie_id, soort, idempotentie_sleutel)
         values ($1, 'ophalen', 'bron:1:2026-10-10T12')`,
        [orgA],
      ),
    );
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
          c.query(
            `insert into intel.taken (organisatie_id, soort, idempotentie_sleutel)
             values ($1, 'ophalen', 'bron:1:2026-10-10T12')`,
            [orgA],
          ),
        ),
      /taken_idempotent_uniek|duplicate key/i,
    );
  });

  test("wachtrij: twee workers claimen niet dezelfde taak", async () => {
    await metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
      c.query(
        `insert into intel.taken (organisatie_id, soort, idempotentie_sleutel)
         values ($1,'werk','a'), ($1,'werk','b')`,
        [orgA],
      ),
    );

    const claim = async (worker: string) =>
      metOrganisatie(db.pool, { organisatieId: orgA }, (c) =>
        c.query<{ id: number }>(
          `update intel.taken
              set status='bezig', pogingen=pogingen+1, vergrendeld_door=$1,
                  vergrendeld_op=now(), zichtbaarheid_tot=now()+interval '60 seconds'
            where id = (
              select id from intel.taken
               where status='wachtend' and soort='werk' and beschikbaar_op <= now()
               order by prioriteit, beschikbaar_op
               limit 1 for update skip locked
            )
            returning id`,
          [worker],
        ),
      );

    const [een, twee] = await Promise.all([claim("w1"), claim("w2")]);
    const id1 = een.rows[0]?.id;
    const id2 = twee.rows[0]?.id;
    assert.ok(id1 !== undefined && id2 !== undefined, "beide workers horen werk te krijgen");
    assert.notEqual(id1, id2, "SKIP LOCKED hoort een dubbele claim te voorkomen");
  });

  test("geen enkele functie in intel is uitvoerbaar door PUBLIC", async () => {
    const r = await alsEigenaar(db, (c) =>
      c.query<{ n: number }>(
        `select count(*)::int as n
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname in ('intel','intel_priv')
            and has_function_privilege('public', p.oid, 'EXECUTE')`,
      ),
    );
    assert.equal(r.rows[0]?.n, 0);
  });

  test("elke tenanttabel heeft RLS, op een gedocumenteerde uitzondering na", async () => {
    const r = await alsEigenaar(db, (c) =>
      c.query<{ tabel: string }>(
        `select t.tablename as tabel
           from pg_tables t
           join pg_class cl on cl.relname = t.tablename and cl.relnamespace = 'intel'::regnamespace
          where t.schemaname = 'intel'
            and not cl.relrowsecurity
            and t.tablename not in (select tabelnaam from intel.rls_uitzonderingen)`,
      ),
    );
    assert.deepEqual(r.rows.map((x) => x.tabel), []);
  });
});
