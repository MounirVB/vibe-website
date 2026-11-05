/* ============================================================
   INTEGRATIE — hostsleutel, propertytotalen en koppelbewijs
   ------------------------------------------------------------
   DE DRIE BEVINDINGEN VAN 5 NOVEMBER 2026, vastgezet in de database
   zelf. Elk van deze zaken zou vóór migratie 0050 zijn gefaald.

   1 DE SLEUTEL KENT DE HOST. Een sc-domain-property dekt elke host
     onder het domein. Zonder de host in de unieke sleutel landen
     `www.vibeenergy.nl/` en `dashboard.vibeenergy.nl/` op dezelfde
     rij, en omdat de upsert overschrijft wint de laatste. Gemeten
     gevolg: 2 impressies en 0 kliks in de database waar Google 6 en 1
     gaf — en die 2/0 waren de dashboardwaarden, op de plek van de
     homepage.

   2 HET PROPERTYTOTAAL IS NIET HET DETAILTOTAAL. Google laat zeldzame
     zoekvragen uit elke gedimensioneerde respons weg. De detaillaag
     dekte 44% van de kliks. Zonder gemeten propertytotaal is de
     dekkingsgraad ONBEKEND — niet 100%, en niet 0%.

   3 EEN DIENST ZONDER CREDENTIALS MAG EEN WERKENDE KOPPELING NIET
     AFSCHRIJVEN. `npm run zaai` draait in de pre-deploy van
     vibe-intel-api, een dienst die INTEL_GCS_SLEUTEL niet heeft. Die
     overschreef de status van GSC met 'niet_geconfigureerd' terwijl de
     koppeling 4.361 rijen had weggeschreven.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { GSC_BRON, gscStand, websiteHost } from "../../src/analytics/gsc.ts";
import { legVastKoppelingBewijs, effectieveKoppelingStand } from "../../src/analytics/koppelingen.ts";
import { meetGezondheid } from "../../src/ops/gezondheid.ts";

const VANAF = "2026-10-06";
const TOT = "2026-11-03";

describe("GSC-integriteit: host, propertytotaal en koppelbewijs", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("gscint");
    org = await maakOrganisatie(db, "vibe-energy");
  });

  after(async () => {
    await db?.opruimen();
  });

  /** Schrijft één zoekvraagrij, net zoals de synchronisatie dat doet. */
  async function schrijf(
    c: { query: (s: string, p?: unknown[]) => Promise<unknown> },
    over: {
      host: string | null;
      pad: string;
      impressies: number;
      kliks: number;
      positie: number;
      datum?: string;
      zoekvraag?: string;
    },
  ) {
    await c.query(
      `insert into intel.zoekvraag_metingen
         (organisatie_id, bron, datum, zoekvraag, pagina_host, pagina_pad, land, apparaat,
          impressies, kliks, ctr, gemiddelde_positie, positie_som, positie_conventie, epoch_versie)
       values ($1,$2,$3::date,$4,$5,$6,'nld','DESKTOP',$7,$8,$9,$10,$11,'een_gebaseerd',0)
       on conflict (organisatie_id, bron, datum, zoekvraag, pagina_host, pagina_pad, land, apparaat)
         do update set impressies = excluded.impressies, kliks = excluded.kliks,
                       positie_som = excluded.positie_som`,
      [
        org,
        GSC_BRON,
        over.datum ?? "2026-10-17",
        over.zoekvraag ?? "vibe energy",
        over.host,
        over.pad,
        over.impressies,
        over.kliks,
        over.impressies > 0 ? over.kliks / over.impressies : null,
        over.positie,
        (over.positie - 1) * over.impressies,
      ],
    );
  }

  /* ---------- 1 · de hostsleutel ---------- */

  test("1 · twee hosts op hetzelfde pad geven TWEE rijen, elk met eigen kliks", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await schrijf(c, { host: "www.vibeenergy.nl", pad: "/", impressies: 4, kliks: 1, positie: 1.2 });
      await schrijf(c, { host: "dashboard.vibeenergy.nl", pad: "/", impressies: 2, kliks: 0, positie: 9 });

      const r = await c.query<{ pagina_host: string; impressies: number; kliks: number }>(
        `select pagina_host, impressies, kliks from intel.zoekvraag_metingen
          where organisatie_id = $1 and pagina_pad = '/' order by pagina_host`,
        [org],
      );
      assert.equal(r.rows.length, 2, "zonder de host in de sleutel zou dit ÉÉN rij zijn");
      const dash = r.rows.find((x) => x.pagina_host === "dashboard.vibeenergy.nl");
      const www = r.rows.find((x) => x.pagina_host === "www.vibeenergy.nl");
      /* DE KLIK VAN DE WEBSITE OVERLEEFT. In de oude vorm stond hier
         de dashboardrij met nul kliks. */
      assert.equal(www?.kliks, 1);
      assert.equal(www?.impressies, 4);
      assert.equal(dash?.kliks, 0);
      assert.equal(dash?.impressies, 2);
    });
  });

  test("1b · een tweede keer schrijven verandert niets — de upsert blijft idempotent", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await schrijf(c, { host: "www.vibeenergy.nl", pad: "/", impressies: 4, kliks: 1, positie: 1.2 });
      const r = await c.query<{ n: number; imp: number }>(
        `select count(*)::int as n, coalesce(sum(impressies),0)::int as imp
           from intel.zoekvraag_metingen where organisatie_id = $1 and pagina_pad = '/'`,
        [org],
      );
      assert.equal(r.rows[0]?.n, 2, "een hersync mag geen rij toevoegen");
      assert.equal(r.rows[0]?.imp, 6, "en ook niet dubbel tellen");
    });
  });

  test("1c · de view per host houdt de twee applicaties gescheiden", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        pagina_host: string | null;
        impressies: string;
        kliks: string;
        gemiddelde_positie: string | null;
      }>(
        `select pagina_host, impressies::text, kliks::text, gemiddelde_positie::text
           from intel.zoekvraag_per_host where organisatie_id = $1 and bron = $2
          order by pagina_host`,
        [org, GSC_BRON],
      );
      assert.equal(r.rows.length, 2);
      const www = r.rows.find((x) => x.pagina_host === "www.vibeenergy.nl");
      assert.equal(Number(www?.kliks), 1);
      /* DE POSITIE PER HOST, met de nul-gebaseerde teller en de +1:
         (1,2 - 1) * 4 / 4 + 1 = 1,2. Zou de +1 ontbreken, dan stond
         hier 0,2 — en een positie onder 1 bestaat niet. */
      assert.ok(Math.abs(Number(www?.gemiddelde_positie) - 1.2) < 1e-6);
    });
  });

  test("1d · een rij ZONDER host botst niet met dezelfde rij MET host", async () => {
    /* NULLS NOT DISTINCT maakt null een waarde, geen jokerteken. Dit is
       precies waarom de legacyrijen opgeruimd moeten worden: ze zouden
       anders náást de nieuwe blijven staan en elke som verdubbelen. */
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await schrijf(c, { host: null, pad: "/", impressies: 6, kliks: 1, positie: 2 });
      const r = await c.query<{ n: number }>(
        `select count(*)::int as n from intel.zoekvraag_metingen
          where organisatie_id = $1 and pagina_pad = '/'`,
        [org],
      );
      assert.equal(r.rows[0]?.n, 3, "de host-loze rij hoort een eigen rij te zijn");
    });
  });

  test("1e · gscStand() ziet de host-loze rijen en noemt ze apart", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const stand = await gscStand(c, org);
      assert.equal(stand.rijenZonderHost, 1);
      assert.equal(stand.perHost.length, 3, "drie groepen: www, dashboard en (geen host)");
      /* DE WEBSITE APART, zodat dashboardverkeer nooit in het
         websitecijfer zit. */
      assert.equal(stand.website?.host, websiteHost());
      assert.equal(stand.website?.kliks, 1);
      assert.equal(stand.website?.impressies, 4);
    });
  });

  /* ---------- 2 · propertytotaal tegen detailtotaal ---------- */

  test("2 · zonder propertytotaal is de dekkingsgraad ONBEKEND, niet 100%", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const stand = await gscStand(c, org);
      assert.equal(stand.dekking, null, "er is nog geen propertytotaal gemeten");
      const r = await c.query<{ n: number }>(
        "select count(*)::int as n from intel.analytics_dekkingsgraad",
      );
      assert.equal(r.rows[0]?.n, 0);
    });
  });

  test("2b · met propertytotaal rekent de view de dekkingsgraad uit", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      /* De gemeten cijfers van 5 november 2026. */
      await c.query(
        `insert into intel.analytics_propertytotalen
           (organisatie_id, bron, property, datum_vanaf, datum_tot,
            kliks, impressies, ctr, positie_som, positie_conventie,
            detail_kliks, detail_impressies, detail_rijen)
         values ($1,$2,'sc-domain:vibeenergy.nl',$3::date,$4::date,
                 126, 9891, 0.012739, $5, 'een_gebaseerd', 55, 7113, 4361)`,
        [org, GSC_BRON, VANAF, TOT, (26.21 - 1) * 9891],
      );
      const r = await c.query<{
        property_kliks: number;
        property_positie: string;
        kliks_dekking: string;
        impressies_dekking: string;
      }>(
        `select property_kliks, property_positie::text, kliks_dekking::text, impressies_dekking::text
           from intel.analytics_dekkingsgraad where organisatie_id = $1`,
        [org],
      );
      const x = r.rows[0];
      assert.equal(x?.property_kliks, 126);
      /* DE POSITIE VAN DE PROPERTY gaat door dezelfde nul-gebaseerde
         teller, dus moet er 26,21 uitkomen en niet 25,21. */
      assert.ok(Math.abs(Number(x?.property_positie) - 26.21) < 1e-6);
      /* 55 van 126 kliks = 43,7% — de detaillaag dekt NIET de site. */
      assert.ok(Math.abs(Number(x?.kliks_dekking) - 55 / 126) < 1e-9);
      assert.ok(Math.abs(Number(x?.impressies_dekking) - 7113 / 9891) < 1e-9);
      assert.ok(Number(x?.kliks_dekking) < 0.5, "de dekking hoort onder de helft te liggen");
    });
  });

  test("2c · gscStand() geeft beide totalen terug, nooit alleen het detailtotaal", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const stand = await gscStand(c, org);
      assert.notEqual(stand.dekking, null);
      assert.equal(stand.dekking?.propertyKliks, 126);
      assert.equal(stand.dekking?.detailKliks, 55);
      assert.ok((stand.dekking?.kliksDekking ?? 1) < 0.5);
    });
  });

  test("2d · een propertytotaal van nul kliks geeft dekking NULL en niet een deling door nul", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await c.query(
        `insert into intel.analytics_propertytotalen
           (organisatie_id, bron, property, datum_vanaf, datum_tot,
            kliks, impressies, detail_kliks, detail_impressies, detail_rijen)
         values ($1,$2,'sc-domain:leeg.nl','2026-09-01'::date,'2026-09-02'::date,
                 0, 0, 0, 0, 0)`,
        [org, GSC_BRON],
      );
      const r = await c.query<{ kliks_dekking: string | null; impressies_dekking: string | null }>(
        `select kliks_dekking::text, impressies_dekking::text
           from intel.analytics_dekkingsgraad
          where organisatie_id = $1 and property = 'sc-domain:leeg.nl'`,
        [org],
      );
      assert.equal(r.rows[0]?.kliks_dekking, null, "nul kliks mag geen 0% dekking opleveren");
      assert.equal(r.rows[0]?.impressies_dekking, null);
    });
  });

  /* ---------- 3 · het koppelbewijs ---------- */

  test("3 · bewijs zetten maakt de koppeling geverifieerd en vult laatste_sync_op", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await legVastKoppelingBewijs(c, org, "gsc", {
        status: "geverifieerd",
        bewijs: "4361 rij(en) weggeschreven over 2026-10-06 t/m 2026-11-03",
        door: "synchroniseerGsc",
      });
      const r = await c.query<{ status: string; laatste_sync_op: string | null; bewijs_door: string }>(
        `select status, laatste_sync_op::text, bewijs_door from intel.koppelingen
          where organisatie_id = $1 and sleutel = 'gsc'`,
        [org],
      );
      assert.equal(r.rows[0]?.status, "geverifieerd");
      assert.notEqual(r.rows[0]?.laatste_sync_op, null);
      assert.equal(r.rows[0]?.bewijs_door, "synchroniseerGsc");
    });
  });

  test("3b · de zaaier DEGRADEERT een koppeling met bewijs niet", async () => {
    /* DIT IS DE BEVINDING. Zonder deze regel zet de volgende uitrol van
       vibe-intel-api de status terug op 'niet_geconfigureerd', omdat
       die dienst de credential niet heeft. */
    const bewaard = {
      u: process.env["INTEL_GSC_SITE_URL"],
      g: process.env["INTEL_GCS_SLEUTEL"],
      e: process.env["INTEL_GSC_CLIENT_EMAIL"],
      k: process.env["INTEL_GSC_PRIVATE_KEY"],
    };
    delete process.env["INTEL_GSC_SITE_URL"];
    delete process.env["INTEL_GCS_SLEUTEL"];
    delete process.env["INTEL_GSC_CLIENT_EMAIL"];
    delete process.env["INTEL_GSC_PRIVATE_KEY"];
    try {
      const { zaaiKoppelingen } = await import("../../src/db/zaai.ts");
      await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
        await zaaiKoppelingen(c, org);
        const r = await c.query<{ status: string; ontbrekende_env: string[] }>(
          `select status, ontbrekende_env from intel.koppelingen
            where organisatie_id = $1 and sleutel = 'gsc'`,
          [org],
        );
        assert.equal(
          r.rows[0]?.status,
          "geverifieerd",
          "een dienst zonder credentials mag een bewezen koppeling niet afschrijven",
        );
        /* DE NAMENLIJST WORDT WEL BIJGEWERKT: dat is informatie over
           deze dienst en geen oordeel over de koppeling. */
        assert.ok(
          (r.rows[0]?.ontbrekende_env ?? []).includes("INTEL_GSC_SITE_URL"),
          "wat hier ontbreekt hoort wél vastgelegd te worden",
        );
      });
    } finally {
      for (const [naam, v] of [
        ["INTEL_GSC_SITE_URL", bewaard.u],
        ["INTEL_GCS_SLEUTEL", bewaard.g],
        ["INTEL_GSC_CLIENT_EMAIL", bewaard.e],
        ["INTEL_GSC_PRIVATE_KEY", bewaard.k],
      ] as const) {
        if (v === undefined) delete process.env[naam];
        else process.env[naam] = v;
      }
    }
  });

  test("3c · effectieveKoppelingStand scheidt 'bewezen' van 'hier bedienbaar'", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const standen = await effectieveKoppelingStand(c, org);
      const gsc = standen.find((s) => s.sleutel === "gsc");
      assert.equal(gsc?.status, "geverifieerd");
      assert.notEqual(gsc?.laatsteSyncOp, null);
      assert.match(gsc?.bewijs ?? "", /4361 rij/);
      /* En dat de credential hier niet staat is informatie, geen
         tegenspraak. */
      assert.equal(typeof gsc?.bedienbaarHier, "boolean");
    });
  });

  test("3d · een storing vult laatste_sync_op NIET, want er is niets geleverd", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const voor = await c.query<{ laatste_sync_op: string | null }>(
        `select laatste_sync_op::text from intel.koppelingen
          where organisatie_id = $1 and sleutel = 'ga4'`,
        [org],
      );
      assert.equal(voor.rows[0]?.laatste_sync_op, null);
      await legVastKoppelingBewijs(c, org, "ga4", {
        status: "fout",
        bewijs: "fase 'token': HTTP 401",
        door: "toets",
      });
      const na = await c.query<{ status: string; laatste_sync_op: string | null; fout_bericht: string }>(
        `select status, laatste_sync_op::text, fout_bericht from intel.koppelingen
          where organisatie_id = $1 and sleutel = 'ga4'`,
        [org],
      );
      assert.equal(na.rows[0]?.status, "fout");
      assert.equal(
        na.rows[0]?.laatste_sync_op,
        null,
        "een storing is geen levering en mag het bewijsveld niet vullen",
      );
      assert.match(na.rows[0]?.fout_bericht ?? "", /HTTP 401/);
    });
  });

  test("3e · 'bereikbaar' bestaat als eigen toestand tussen geconfigureerd en geverifieerd", async () => {
    /* DE TOESTAND DIE VIER DAGEN DE WERKELIJKHEID WAS: token geldig,
       API antwoordt, geen machtiging op de property. Niet
       geconfigureerd-en-klaar, niet geverifieerd, en niet stuk. */
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await legVastKoppelingBewijs(c, org, "bing_webmaster", {
        status: "bereikbaar",
        bewijs: "fase 'propertytoegang': het dienstaccount ziet geen enkele property",
        door: "toets",
      });
      const r = await c.query<{ status: string }>(
        `select status from intel.koppelingen where organisatie_id = $1 and sleutel = 'bing_webmaster'`,
        [org],
      );
      assert.equal(r.rows[0]?.status, "bereikbaar");
    });
  });

  test("3f · het gezondheidssignaal telt een BEWEZEN koppeling niet als afwezig", async () => {
    /* ZONDER DEZE ZAAK BLIJFT DE OUDE FOUT ONZICHTBAAR. Het signaal
       filterde op `status !== "geconfigureerd"`, dus zou een
       geverifieerde koppeling óók als NIET AANGESLOTEN zijn geteld —
       de reparatie van het ene zou het andere hebben verborgen. */
    /* ALS EIGENAAR: meetGezondheid leest intel.migraties, en de
       applicatierol mag die tabel niet lezen. In productie draait deze
       meting dan ook op een eigenaarspool. */
    {
      const signalen = await alsEigenaar(db, (c) => meetGezondheid(c as never, org));
      const s = signalen.find((x) => x.groep === "koppelingen" && x.naam === "analytics en CRM");
      assert.ok(s !== undefined, "het koppelingensignaal hoort te bestaan");
      assert.match(s?.meting ?? "", /GESYNCHRONISEERD/);
      assert.match(s?.meting ?? "", /gsc/);
      assert.ok(
        !/NIET AANGESLOTEN \([^)]*gsc/.test(s?.meting ?? ""),
        `gsc staat onder NIET AANGESLOTEN: ${s?.meting}`,
      );
      assert.match(s?.meting ?? "", /BEREIKBAAR/);
    }
  });

  test("3g · het GSC-signaal noemt de hosts, de dekkingsgraad en de host-loze rijen", async () => {
    /* HET SIGNAAL VERTAKT OP DE DEKKINGSRIJ, want nul dekkingsvensters
       betekent 'nooit gesynchroniseerd'. Zonder die rij zou deze zaak
       de NOOIT-tak toetsen en nooit aan de hostsplitsing toekomen. */
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query(
        `insert into intel.analytics_dekking
           (organisatie_id, bron, datum_vanaf, datum_tot, aantal_rijen, afgekapt, volledig)
         values ($1,$2,$3::date,$4::date,4361,false,true)
         on conflict (organisatie_id, bron, datum_vanaf, datum_tot) do nothing`,
        [org, GSC_BRON, VANAF, TOT],
      ),
    );
    {
      const signalen = await alsEigenaar(db, (c) => meetGezondheid(c as never, org));
      const s = signalen.find((x) => x.groep === "gsc" && x.naam === "synchronisatie");
      assert.ok(s !== undefined);
      /* HET DETAILTOTAAL NOOIT ZONDER HET PROPERTYTOTAAL. */
      assert.match(s?.meting ?? "", /HOSTS in deze property/);
      assert.match(s?.meting ?? "", /dashboard\.vibeenergy\.nl/);
      assert.match(s?.meting ?? "", /Propertytotaal 126 kliks/);
      assert.match(s?.meting ?? "", /dekking 44% van de kliks/);
      assert.match(s?.meting ?? "", /dragen nog geen host/);
    }
  });
});
