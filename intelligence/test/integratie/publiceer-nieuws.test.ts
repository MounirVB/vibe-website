/* ============================================================
   TEST — publiceren en terugdraaien via het routeregister
   ------------------------------------------------------------
   De schrijvende adapter was tot nu toe alleen op zijn pure functies
   getoetst. Deze suite voert de ECHTE keten uit tegen een echte
   database met de applicatierol, en tegen een echte sitewortel op
   schijf:

     inhoudsversie -> goedkeuring -> publiceer() -> registerrecord
                   -> draaiTerug() -> record weg

   De sitewortel is een tijdelijke map met precies genoeg van het
   routeregister van Release 1 erin om de adapter te laten werken: een
   inhoudsbestand voor de onderwerp-eigenaar en een routes.json waarin
   die eigenaar op INDEX staat.

   WAAROM GEEN AI-AANROEP
   De inhoudsversie wordt hier als fixture gezet in plaats van door de
   conceptgenerator gemaakt. Wat hier getoetst wordt is de ADAPTER —
   van goedgekeurde versie naar registerrecord en terug. Een echte
   modelaanroep zou die toets niet scherper maken, wel duurder en
   afhankelijk van een externe dienst.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  alsEigenaar,
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { configVergeten } from "../../src/kern/config.ts";

const EIGENAAR_ROUTE = "kennis/netcongestie-uitgelegd";

describe("publiceren via het routeregister", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let auteur = 0;
  let goedkeurder = 0;
  let siteWortel = "";
  let versieId = 0;
  let publicatieId = 0;

  before(async () => {
    db = await maakWegwerpdatabase("publiceer");
    org = await maakOrganisatie(db, "publiceer-org");
    auteur = await maakGebruiker(db, org, "auteur@test.nl", "redacteur");
    goedkeurder = await maakGebruiker(db, org, "chef@test.nl", "beheerder");

    /* Een sitewortel met het minimum uit Release 1. */
    siteWortel = await mkdtemp(join(tmpdir(), "intel-site-"));
    await mkdir(join(siteWortel, "data", "inhoud", "kennis"), { recursive: true });
    await mkdir(join(siteWortel, "data", "seo"), { recursive: true });
    await writeFile(
      join(siteWortel, "data", "inhoud", "kennis", "netcongestie-uitgelegd.json"),
      JSON.stringify({ route: EIGENAAR_ROUTE, type: "kennis", titel: "Netcongestie uitgelegd" }),
      "utf8",
    );
    await writeFile(
      join(siteWortel, "data", "seo", "routes.json"),
      JSON.stringify({
        routes: [
          { route: EIGENAAR_ROUTE, soort: "nationaal", subsoort: "kennis", staat: "INDEX", reden: "fixture" },
        ],
      }),
      "utf8",
    );

    process.env["INTEL_SITE_WORTEL"] = siteWortel;
    configVergeten();

    /* De bronketen: bron -> document -> versie -> gebeurtenis -> uitspraak,
       plus een cluster en een kandidaat, want de adapter leidt de
       onderwerp-eigenaar uit het cluster van de kandidaat af. */
    await alsEigenaar(db, async (c) => {
      // SET accepteert geen bindparameters; set_config wel.
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
      const geb = await c.query<{ id: number }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, samenvatting, gebeurtenis_soort,
            materialiteit, onderwerp_cluster_id, aantal_bronnen)
         values ($1,'fix-geb','ACM stelt nettarieven vast','Samenvatting','regelgeving',70,$2,1)
         returning id`,
        [org, cluster.rows[0]!.id],
      );
      const uitspraak = await c.query<{ id: number }>(
        `insert into intel.uitspraken
           (organisatie_id, gebeurtenis_id, tekst, soort, verificatie_status, bewijs_kwaliteit)
         values ($1,$2,'De nettarieven stijgen met 12 procent in 2027.','cijfer','ongeverifieerd',4)
         returning id`,
        [org, geb.rows[0]!.id],
      );
      await c.query(
        `insert into intel.uitspraak_bronnen (organisatie_id, uitspraak_id, versie_id, rol)
         values ($1,$2,$3,'primair')`,
        [org, uitspraak.rows[0]!.id, versie.rows[0]!.id],
      );
      /* Pas NA de primaire bron mag de uitspraak bevestigd worden: de
         trigger uitspraken_bewijsplicht weigert dat anders. Dat is de
         bewijsplicht die dit platform juist moet hebben. */
      await c.query("update intel.uitspraken set verificatie_status = 'bevestigd' where id = $1", [
        uitspraak.rows[0]!.id,
      ]);
      const kandidaat = await c.query<{ id: number }>(
        `insert into intel.inhoud_kandidaten
           (organisatie_id, gebeurtenis_id, onderwerp_cluster_id, besluit, totaalscore, motor_versie)
         values ($1,$2,$3,'NEW_ARTICLE',70,'fixture') returning id`,
        [org, geb.rows[0]!.id, cluster.rows[0]!.id],
      );

      const iv = await c.query<{ id: number }>(
        `insert into intel.inhoud_versies
           (organisatie_id, kandidaat_id, pad, versie, soort, titel, meta_omschrijving,
            canonieke_url, direct_antwoord, body_markdown, status, risico_klasse,
            auteur_soort, poorten_geslaagd, inhoud_afdruk, aangemaakt_door)
         values ($1,$2,'/nieuws/acm-nettarieven-2027',1,'nieuw_artikel',
                 'ACM stelt de nettarieven voor 2027 vast | Vibe Energy',
                 'De ACM heeft de nettarieven voor 2027 vastgesteld. Wat dat betekent voor een zakelijke aansluiting.',
                 'https://www.vibeenergy.nl/nieuws/acm-nettarieven-2027',
                 'De ACM heeft de nettarieven voor 2027 vastgesteld.',
                 'Dit is de lead van het bericht.\n\n## Wat er is besloten\n\nDe tarieven zijn vastgesteld.\n',
                 'ter_review','laag','ai',true,'afdruk-1',$3)
         returning id`,
        [org, kandidaat.rows[0]!.id, auteur],
      );
      versieId = iv.rows[0]!.id;

      await c.query(
        `insert into intel.inhoud_uitspraken
           (organisatie_id, inhoud_versie_id, uitspraak_id, rol)
         values ($1,$2,$3,'kern')`,
        [org, versieId, uitspraak.rows[0]!.id],
      );
    });
  });

  after(async () => {
    delete process.env["INTEL_SITE_WORTEL"];
    configVergeten();
    await db.opruimen();
  });

  test("een versie die niet is goedgekeurd wordt geweigerd", async () => {
    const { publiceer } = await import("../../src/inhoud/publiceer.ts");
    const r = await publiceer(db.pool, org, versieId);
    assert.equal(r.geschreven, false);
    assert.match(r.reden, /alleen 'goedgekeurd'/);
  });

  test("de auteur kan zijn eigen versie niet goedkeuren (vier ogen)", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          // SET accepteert geen bindparameters; set_config wel.
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `update intel.inhoud_versies
                set status='goedgekeurd', goedgekeurd_door=$2, goedgekeurd_op=now(),
                    goedgekeurde_afdruk=inhoud_afdruk
              where id=$1`,
            [versieId, auteur],
          );
        }),
      /vier_ogen/,
    );
  });

  test("een goedgekeurde versie levert een registerrecord, geen HTML en geen sitemapregel", async () => {
    await alsEigenaar(db, async (c) => {
      // SET accepteert geen bindparameters; set_config wel.
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `update intel.inhoud_versies
            set status='goedgekeurd', goedgekeurd_door=$2, goedgekeurd_op=now(),
                goedgekeurde_afdruk=inhoud_afdruk
          where id=$1`,
        [versieId, goedkeurder],
      );
    });

    const { publiceer } = await import("../../src/inhoud/publiceer.ts");
    const r = await publiceer(db.pool, org, versieId);

    assert.equal(r.geschreven, true, `publiceren mislukte: ${r.reden}`);
    assert.equal(r.sitemapBijgewerkt, false, "de sitemap is van de generator van Release 1");
    assert.equal(r.bestandspad, join("data", "inhoud", "nieuws", "acm-nettarieven-2027.json"));
    publicatieId = r.publicatieId!;

    const pad = join(siteWortel, r.bestandspad);
    assert.ok(existsSync(pad), "het registerrecord staat niet op schijf");
    assert.ok(
      !existsSync(join(siteWortel, "nieuws", "acm-nettarieven-2027.html")),
      "de adapter mag geen HTML schrijven",
    );
    assert.ok(!existsSync(join(siteWortel, "sitemap.xml")), "de adapter mag geen sitemap schrijven");

    const record = JSON.parse(await readFile(pad, "utf8")) as Record<string, unknown>;
    assert.equal(record["route"], "nieuws/acm-nettarieven-2027");
    assert.equal(record["type"], "nieuws");
    assert.equal(record["redactionele_staat"], "GOEDGEKEURD");
    assert.equal(record["goedgekeurd_door"], "chef@test.nl");
    assert.equal(record["onderwerp_eigenaar"], EIGENAAR_ROUTE);

    // De bron reist mee, met soort en raadpleegdatum.
    const bronnen = record["bronnen"] as { url: string; soort: string; datum: string }[];
    assert.equal(bronnen.length, 1);
    assert.equal(bronnen[0]!.url, "https://www.acm.nl/besluit-1");
    assert.equal(bronnen[0]!.soort, "TOEZICHTHOUDER", "ACM is een toezichthouder, dus dragend");
    assert.match(bronnen[0]!.datum, /^\d{4}-\d{2}-\d{2}$/);

    // Het cijfer uit de uitspraak staat als claim met bron en datum.
    const claims = record["claims"] as { tekst: string; bron_url: string; bron_datum: string }[];
    assert.equal(claims.length, 1);
    assert.match(claims[0]!.tekst, /12 procent/);
    assert.ok(claims[0]!.bron_url && claims[0]!.bron_datum);

    // De lead is niet herhaald als sectie.
    const secties = record["secties"] as { kop: string; alineas: string[] }[];
    assert.equal(record["lead"], "Dit is de lead van het bericht.");
    for (const s of secties) {
      for (const a of s.alineas) assert.notEqual(a, record["lead"]);
    }

    // En de herkomst wijst terug naar de database.
    const herkomst = record["_herkomst"] as Record<string, unknown>;
    assert.equal(herkomst["inhoud_versie_id"], versieId);
    assert.equal(herkomst["inhoud_afdruk"], "afdruk-1");
  });

  test("de versie staat nu op gepubliceerd en het paginaregister weet het", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const v = await c.query<{ status: string }>(
        "select status from intel.inhoud_versies where id = $1",
        [versieId],
      );
      const p = await c.query<{ in_sitemap: boolean; bestaat_in_repo: boolean; eigenaar_release: string }>(
        "select in_sitemap, bestaat_in_repo, eigenaar_release from intel.pagina_register where organisatie_id = $1 and pad = $2",
        [org, "/nieuws/acm-nettarieven-2027"],
      );
      return { versie: v.rows[0]!, pagina: p.rows[0]! };
    });
    assert.equal(r.versie.status, "gepubliceerd");
    assert.equal(r.pagina.bestaat_in_repo, true);
    assert.equal(
      r.pagina.in_sitemap,
      false,
      "in_sitemap hoort false te zijn tot de generator van Release 1 heeft gedraaid",
    );
    assert.equal(r.pagina.eigenaar_release, "release2");
  });

  test("een voorstel voor een bestaande Release 1-pagina wordt geweigerd", async () => {
    let tweede = 0;
    await alsEigenaar(db, async (c) => {
      // SET accepteert geen bindparameters; set_config wel.
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const iv = await c.query<{ id: number }>(
        `insert into intel.inhoud_versies
           (organisatie_id, pad, versie, soort, titel, meta_omschrijving, canonieke_url,
            body_markdown, status, risico_klasse, auteur_soort, poorten_geslaagd,
            inhoud_afdruk, goedgekeurde_afdruk, goedgekeurd_door, goedgekeurd_op, aangemaakt_door)
         values ($1,'/kennis/netcongestie-uitgelegd',1,'pagina_update','Patch | Vibe',
                 'Een patchvoorstel voor een bestaande pagina van Release 1.',
                 'https://www.vibeenergy.nl/kennis/netcongestie-uitgelegd',
                 'Lead.\n\n## Kop\n\nTekst.\n','goedgekeurd','laag','ai',true,
                 'afdruk-2','afdruk-2',$2, now(), $3)
         returning id`,
        [org, goedkeurder, auteur],
      );
      tweede = iv.rows[0]!.id;
    });

    const { publiceer } = await import("../../src/inhoud/publiceer.ts");
    const r = await publiceer(db.pool, org, tweede);
    assert.equal(r.geschreven, false);
    assert.match(r.reden, /buiten data\/inhoud\/nieuws/);
    assert.match(r.reden, /schrijver per bestand/);
    assert.ok(
      !existsSync(join(siteWortel, "data", "inhoud", "kennis", "netcongestie-uitgelegd.json.bak")),
      "er mag niets naast het bestand van Release 1 zijn gezet",
    );

    // En het bestand van Release 1 is onaangeroerd.
    const nog = JSON.parse(
      await readFile(join(siteWortel, "data", "inhoud", "kennis", "netcongestie-uitgelegd.json"), "utf8"),
    ) as Record<string, unknown>;
    assert.equal(nog["titel"], "Netcongestie uitgelegd", "het bestand van Release 1 is gewijzigd");
  });

  test("terugdraaien verwijdert het registerrecord", async () => {
    const pad = join(siteWortel, "data", "inhoud", "nieuws", "acm-nettarieven-2027.json");
    assert.ok(existsSync(pad), "aanname: het record staat er nog");

    const { draaiTerug } = await import("../../src/inhoud/publiceer.ts");
    const r = await draaiTerug(db.pool, org, publicatieId);

    assert.equal(r.teruggezet, "verwijderd_uit_sitemap");
    assert.ok(!existsSync(pad), "het record had verwijderd moeten zijn");
    assert.match(r.reden, /generator van Release 1/);

    const na = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const v = await c.query<{ status: string }>(
        "select status from intel.inhoud_versies where id = $1",
        [versieId],
      );
      const p = await c.query<{ status: string }>(
        "select status from intel.publicaties where id = $1",
        [publicatieId],
      );
      const b = await c.query<{ besluit: string }>(
        "select besluit from intel.publicatiebesluiten where inhoud_versie_id = $1 order by op desc limit 1",
        [versieId],
      );
      return { versie: v.rows[0]!.status, publicatie: p.rows[0]!.status, besluit: b.rows[0]!.besluit };
    });
    assert.equal(na.versie, "teruggedraaid");
    assert.equal(na.publicatie, "teruggedraaid");
    assert.equal(na.besluit, "teruggedraaid", "het besluit hoort in het auditspoor te staan");
  });

  test("tweemaal terugdraaien is geen fout en verandert niets meer", async () => {
    const { draaiTerug } = await import("../../src/inhoud/publiceer.ts");
    const r = await draaiTerug(db.pool, org, publicatieId);
    assert.equal(r.teruggezet, "niets");
    assert.match(r.reden, /alleen een geschreven publicatie/);
  });
});
