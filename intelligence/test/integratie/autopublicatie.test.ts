/* ============================================================
   INTEGRATIE — het handhavingspunt van het publicatiebeleid
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET. Deze zaken gaan over een pad dat een
   pagina naar de live site schrijft ZONDER dat een mens kijkt. Elke
   zaak hieronder is er om één manier af te sluiten waarop dat mis kan
   gaan, en bij elke zaak hoort de vraag: gaat hij rood als de
   bescherming weg is?

     1 HOOG RISICO KAN NOOIT AUTOMATISCH. Op drie niveaus: het beleid,
       de versierij, en de module. Alle drie worden hier geraakt.
     2 HET BELEID STAAT STANDAARD UIT. En 'uit' is niet één vlag maar
       drie toestanden die elk apart weigeren.
     3 GEEN PUBLICATIE ZONDER BEWIJS. Te weinig onafhankelijke bronnen,
       te lage bewijskwaliteit, of bewijs dat niet meer draagt.
     4 GEEN DUBBELE PUBLICATIE. Twee keer draaien publiceert één keer.
     6 GEEN VEROUDERDE OF CONFLICTERENDE CLAIMS.
     7 GEEN PRIVILEGE-ESCALATIE. Een beleidsgoedkeuring mag geen
       menselijke goedkeuring nabootsen, en de vier-ogenregel blijft
       voor de menselijke route gelden.
     8 HERSTEL BIJ EEN GEDEELTELIJKE FOUT.
     9 SITEMAP EN METADATA.

   De AI-budgetzaak (nummer 5 in de opdracht) hoort bij de
   modelintegratie en staat in de eenheidstoetsen van die laag; hier is
   geen modelaanroep in het spel.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, beforeEach, describe, test } from "node:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  alsEigenaar,
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { configVergeten } from "../../src/kern/config.ts";
import { DOCUMENTSOORT_VERSIE } from "../../src/pijplijn/documentsoort.ts";
import { MODALITEIT_VERSIE } from "../../src/pijplijn/claimmodaliteit.ts";
import { MOTORVERSIES } from "../../src/pijplijn/motorversies.ts";
import {
  automatischPubliceren,
  leesBeleid,
  MAX_GEBEURTENIS_LEEFTIJD_DAGEN,
} from "../../src/inhoud/autopublicatie.ts";

/* ELKE FIXTURE EEN EIGEN PAD. inhoud_versies_nummer_uniek staat op
   (organisatie, pad, versie), dus twee zaken die hetzelfde pad met
   versie 1 gebruiken botsen. In productie heeft elk nieuwsbericht
   vanzelf een eigen route; de teller bootst dat na. */
const EIGENAAR_ROUTE = "kennis/netcongestie-uitgelegd";
let padTeller = 0;
const versPad = () => `/nieuws/acm-nettarieven-${(padTeller += 1)}`;

describe("het handhavingspunt van het publicatiebeleid", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let auteur = 0;
  let goedkeurder = 0;
  let siteWortel = "";
  let bronVersieId = 0;
  let clusterId = 0;

  before(async () => {
    db = await maakWegwerpdatabase("autopub");
    org = await maakOrganisatie(db, "autopub-org");
    auteur = await maakGebruiker(db, org, "auteur@test.nl", "redacteur");
    goedkeurder = await maakGebruiker(db, org, "chef@test.nl", "beheerder");

    /* DE ONDERWERP-EIGENAAR HOORT ERBIJ, en dat is geen fixturedetail.
       publiceer() weigert een nieuwsartikel zonder nationale pagina die
       de zoekintentie bezit: "zonder die eigenaar zou het bericht die
       intentie zelf claimen en de bestaande pagina beconcurreren". De
       eigenaar wordt uit het ROUTEREGISTER gehaald op de clustersleutel,
       dus beide moeten kloppen. */
    siteWortel = await mkdtemp(join(tmpdir(), "intel-autopub-"));
    await mkdir(join(siteWortel, "data", "inhoud", "kennis"), { recursive: true });
    await mkdir(join(siteWortel, "data", "inhoud", "nieuws"), { recursive: true });
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

    /* De bronketen die de claimpoort nodig heeft. Eén keer; de
       versies erboven worden per zaak opnieuw gemaakt. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const bron = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs, is_primaire_bron)
         values ($1,'acm-besluiten','ACM','rss','https://www.acm.nl/feed','https://www.acm.nl',
                 true,'toegestaan','geen_voorbehoud','geverifieerd','fixture',true)
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
      const v = await c.query<{ id: number }>(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte,
            documentsoort, documentsoort_gezag, documentsoort_versie)
         values ($1,$2,1,'hash-1','ACM stelt nettarieven vast','De tarieven voor 2027 zijn vastgesteld.',38,
                 'OFFICIEEL_BESLUIT','BEVOEGD_GEZAG',$3)
         returning id`,
        [org, doc.rows[0]!.id, DOCUMENTSOORT_VERSIE],
      );
      bronVersieId = v.rows[0]!.id;
      const cl = await c.query<{ id: number }>(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam)
         values ($1,'netcongestie','Netcongestie') returning id`,
        [org],
      );
      clusterId = cl.rows[0]!.id;
    });
  });

  after(async () => {
    delete process.env["INTEL_SITE_WORTEL"];
    configVergeten();
    await db?.opruimen();
  });

  /* ZONDER VERWIJDEREN. intel.publicatiebesluiten en
     intel.audit_gebeurtenissen zijn append-only — een DELETE daarop
     wordt door een trigger geweigerd, en dat is juist: een auditspoor
     dat een toets kan wissen is geen auditspoor.

     De opruiming haalt de restanten daarom UIT DE WERKVOORRAAD in
     plaats van uit de tabel. De werkvoorraad vraagt
     `poorten_geslaagd`, dus die op false zetten is genoeg en raakt
     geen enkele grendel. Publicaties en besluiten uit eerdere zaken
     blijven staan; de assertieve tellingen hieronder zijn daarom op
     versie-id gericht en niet op de hele tabel. */
  beforeEach(async () => {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        "update intel.inhoud_versies set poorten_geslaagd = false where status = 'ter_review'",
      );
      await c.query("delete from intel.publicatiebeleid");
    });
  });

  type FixtureOpties = {
    readonly risico?: "laag" | "midden" | "hoog";
    readonly soort?: string;
    readonly bewijsKwaliteit?: number;
    readonly verificatieStatus?: string;
    /** Hoeveel dagen terug de gebeurtenis plaatsvond. */
    readonly dagenOud?: number;
    /** Laat gebeurd_op leeg, om voorwaarde 7 zonder datum te toetsen. */
    readonly zonderDatum?: boolean;
    readonly heeftTegenspraak?: boolean;
    /** Zet geldig_tot in het verleden. */
    readonly verlopen?: boolean;
    readonly afdruk?: string;
    readonly pad?: string;
    readonly status?: string;
    /** Laat de claimbinding weg, zodat er nul onafhankelijke bronnen zijn. */
    readonly zonderClaim?: boolean;
  };

  /** Bouwt een publiceerbare nieuwsversie met alles eronder. */
  async function maakVersie(o: FixtureOpties = {}): Promise<number> {
    return alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const dagen = o.dagenOud ?? 1;
      const pad = versPad();
      /* DE DATUM KOMT UIT JS, niet uit een SQL-tak. Mijn eerste versie
         zette `null` of een interval-expressie in de query afhankelijk
         van de optie, met een wisselend aantal parameters — en dan kan
         Postgres het type van $5 niet meer bepalen. Eén vorm, één
         parameterlijst. */
      const gebeurdOp =
        o.zonderDatum === true ? null : new Date(Date.now() - dagen * 86_400_000).toISOString();
      const geb = await c.query<{ id: number }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, samenvatting, gebeurtenis_soort,
            materialiteit, onderwerp_cluster_id, aantal_bronnen, risico_klasse,
            gebeurd_op, heeft_tegenspraak)
         values ($1,$2,'ACM stelt de nettarieven voor 2027 vast','Samenvatting','regelgeving',
                 70,$3,1,$4,$5::timestamptz,$6)
         returning id`,
        [
          org,
          `geb-${(padTeller += 1)}-${Math.round(performance.now() * 1000)}`,
          clusterId,
          o.risico ?? "laag",
          gebeurdOp,
          o.heeftTegenspraak ?? false,
        ],
      );
      const gebId = geb.rows[0]!.id;

      let uitspraakId: number | null = null;
      if (o.zonderClaim !== true) {
        const u = await c.query<{ id: number }>(
          `insert into intel.uitspraken
             (organisatie_id, gebeurtenis_id, tekst, soort, verificatie_status, bewijs_kwaliteit,
              geldig_tot)
           values ($1,$2,'De nettarieven stijgen met 12 procent in 2027.','cijfer','ongeverifieerd',$3,
                   ${o.verlopen === true ? "current_date - 5" : "null"})
           returning id`,
          [org, gebId, o.bewijsKwaliteit ?? 4],
        );
        uitspraakId = u.rows[0]!.id;
        await c.query(
          `insert into intel.uitspraak_bronnen (organisatie_id, uitspraak_id, versie_id, rol)
           values ($1,$2,$3,'primair')`,
          [org, uitspraakId, bronVersieId],
        );
        await c.query(
          `update intel.uitspraken
              set verificatie_status   = $2,
                  modaliteit           = 'VASTGESTELD',
                  modaliteit_zekerheid = 0.80,
                  modaliteit_versie    = $3,
                  bewijskracht_plafond = 5,
                  oordeel_bron         = 'motor',
                  herbeoordeeld_op     = now(),
                  herbeoordeeld_onder  = $4
            where id = $1`,
          [uitspraakId, o.verificatieStatus ?? "bevestigd", MODALITEIT_VERSIE, MOTORVERSIES],
        );
      }

      const kand = await c.query<{ id: number }>(
        `insert into intel.inhoud_kandidaten
           (organisatie_id, gebeurtenis_id, onderwerp_cluster_id, besluit, totaalscore, motor_versie)
         values ($1,$2,$3,'NEW_ARTICLE',70,'fixture') returning id`,
        [org, gebId, clusterId],
      );
      const iv = await c.query<{ id: number }>(
        `insert into intel.inhoud_versies
           (organisatie_id, kandidaat_id, pad, versie, soort, titel, meta_omschrijving,
            canonieke_url, direct_antwoord, body_markdown, structured_data, status, risico_klasse,
            auteur_soort, poorten_geslaagd, inhoud_afdruk, aangemaakt_door, invoer_versies)
         values ($1,$2,$3,1,$4,
                 'ACM stelt de nettarieven voor 2027 vast | Vibe Energy',
                 'De ACM heeft de nettarieven voor 2027 vastgesteld. Wat dat betekent voor een zakelijke aansluiting.',
                 $5,'De ACM heeft de nettarieven voor 2027 vastgesteld.',
                 'Dit is de lead.\n\n## Wat er is besloten\n\nDe tarieven zijn vastgesteld.\n',
                 $8::jsonb,
                 $9,$6,'ai',true,$7,$10,array[$11::bigint])
         returning id`,
        [
          org,
          kand.rows[0]!.id,
          o.pad ?? pad,
          o.soort ?? "nieuw_artikel",
          `https://www.vibeenergy.nl${o.pad ?? pad}`,
          o.risico ?? "laag",
          o.afdruk ?? `afdruk-${Math.round(performance.now() * 1000)}`,
          JSON.stringify({ "@context": "https://schema.org", "@type": "NewsArticle" }),
          o.status ?? "ter_review",
          auteur,
          bronVersieId,
        ],
      );
      const versieId = iv.rows[0]!.id;
      if (uitspraakId !== null) {
        await c.query(
          `insert into intel.inhoud_uitspraken
             (organisatie_id, inhoud_versie_id, uitspraak_id, rol)
           values ($1,$2,$3,'kern')`,
          [org, versieId, uitspraakId],
        );
      }
      return versieId;
    });
  }

  /** Zet een beleidsregel. */
  async function zetBeleid(o: {
    readonly autoAan?: boolean;
    readonly maxRisico?: string | null;
    readonly soorten?: readonly string[];
    readonly minBronnen?: number;
    readonly minKwaliteit?: number;
    readonly versie?: string;
  } = {}): Promise<void> {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query("delete from intel.publicatiebeleid");
      await c.query(
        `insert into intel.publicatiebeleid
           (organisatie_id, versie, auto_publiceren_aan, auto_max_risico,
            auto_toegestane_soorten, auto_min_bronnen, auto_min_bewijskwaliteit, actief)
         values ($1,$2,$3,$4,$5,$6,$7,true)`,
        [
          org,
          o.versie ?? "toets-beleid",
          o.autoAan ?? true,
          o.maxRisico === undefined ? "midden" : o.maxRisico,
          o.soorten ?? ["nieuw_artikel"],
          o.minBronnen ?? 1,
          o.minKwaliteit ?? 4,
        ],
      );
    });
  }

  const ronde = (droog = false) => automatischPubliceren(db.pool, org, { droog });

  /* ---------- 2 · het beleid staat standaard uit ---------- */

  test("2 · zonder beleidsrij wordt er niets bekeken en niets geschreven", async () => {
    const r = await ronde();
    assert.equal(r.beleid, null);
    assert.match(r.beleidReden ?? "", /geen ACTIEVE beleidsrij/);
    assert.equal(r.bekeken, 0);
    assert.equal(r.gepubliceerd.length, 0);
  });

  test("2b · het GEZAAIDE beleid staat uit, en dat is de productiestand", async () => {
    /* DE STANDAARD IS GEEN AANNAME. zaai.ts schrijft 'v1-propose-only'
       met auto_publiceren_aan = false en een LEGE soortenlijst. Deze
       zaak zet precies die rij en eist dat er niets gebeurt. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.publicatiebeleid
           (organisatie_id, versie, auto_publiceren_aan, auto_max_risico,
            auto_toegestane_soorten, auto_min_bronnen, auto_min_bewijskwaliteit, actief)
         values ($1,'v1-propose-only',false,'laag','{}',2,4,true)`,
        [org],
      );
    });
    await maakVersie();
    const r = await ronde();
    assert.equal(r.beleid?.autoAan, false);
    assert.match(r.beleidReden ?? "", /auto_publiceren_aan = false/);
    assert.equal(r.gepubliceerd.length, 0);
  });

  test("2c · een LEGE soortenlijst is geen jokerteken", async () => {
    await zetBeleid({ soorten: [] });
    await maakVersie();
    const r = await ronde();
    assert.match(r.beleidReden ?? "", /auto_toegestane_soorten is LEEG/);
    assert.equal(r.gepubliceerd.length, 0);
  });

  test("2d · auto_max_risico KAN niet leeg zijn; de database weigert dat", async () => {
    /* MIJN MODULE TOETST HIEROP, en dat blijft verdedigbare
       defensieve code, maar via de database is deze toestand
       onbereikbaar: de kolom is NOT NULL. Deze zaak legt vast WAAR de
       bescherming zit, zodat niemand later de null-tak uit de module
       haalt in de veronderstelling dat het geval kan voorkomen — of
       omgekeerd de NOT NULL weghaalt in de veronderstelling dat de
       module het wel opvangt. */
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.publicatiebeleid
               (organisatie_id, versie, auto_publiceren_aan, auto_max_risico)
             values ($1,'zonder-maximum',false,null)`,
            [org],
          );
        }),
      /not-null|null value in column "auto_max_risico"/i,
    );
  });

  /* ---------- 1 · hoog risico ---------- */

  test("1 · de DATABASE weigert een beleid dat hoog risico automatisch toestaat", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.publicatiebeleid
               (organisatie_id, versie, auto_publiceren_aan, auto_max_risico)
             values ($1,'roekeloos',true,'hoog')`,
            [org],
          );
        }),
      /hoog_risico_nooit_automatisch/i,
      "het beleid mag hoog risico nooit automatisch toestaan",
    );
  });

  test("1b · de DATABASE weigert een versierij die door beleid is goedgekeurd bij hoog risico", async () => {
    /* HET TWEEDE SLOT, uit migratie 0052. Zelfs als iemand de
       versierij rechtstreeks aanraakt. */
    const id = await maakVersie({ risico: "hoog" });
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `update intel.inhoud_versies
                set status = 'goedgekeurd', goedkeuring_soort = 'beleid',
                    goedkeurend_beleid = 'x', goedgekeurde_afdruk = inhoud_afdruk
              where id = $1`,
            [id],
          );
        }),
      /beleid_nooit_hoog_risico/i,
    );
  });

  test("1c · de MODULE weigert hoog risico ook als het beleid midden toestaat", async () => {
    await zetBeleid({ maxRisico: "midden" });
    await maakVersie({ risico: "hoog" });
    const r = await ronde();
    assert.equal(r.gepubliceerd.length, 0);
    const w = r.geweigerd.find((x) => x.voorwaarde.startsWith("2"));
    assert.ok(w !== undefined, "er hoort een weigering op voorwaarde 2 te staan");
    assert.match(w?.reden ?? "", /HOOG vereist altijd een menselijke goedkeuring/);
  });

  test("1d · midden risico valt buiten een beleid dat alleen laag toestaat", async () => {
    await zetBeleid({ maxRisico: "laag" });
    await maakVersie({ risico: "midden" });
    const r = await ronde();
    assert.equal(r.gepubliceerd.length, 0);
    assert.match(r.geweigerd[0]?.reden ?? "", /buiten het beleidsmaximum/);
  });

  /* ---------- 3 · geen publicatie zonder bewijs ---------- */

  test("3 · te weinig onafhankelijke bronnen weigert", async () => {
    await zetBeleid({ minBronnen: 2 });
    await maakVersie();
    const r = await ronde();
    assert.equal(r.gepubliceerd.length, 0);
    const w = r.geweigerd.find((x) => x.voorwaarde.startsWith("4"));
    assert.match(w?.reden ?? "", /1 onafhankelijke bron\(nen\).*eist 2/);
  });

  test("3b · een versie ZONDER gebonden claim haalt nul bronnen", async () => {
    await zetBeleid({ minBronnen: 1 });
    await maakVersie({ zonderClaim: true });
    const r = await ronde();
    assert.equal(r.gepubliceerd.length, 0);
    const w = r.geweigerd.find((x) => x.voorwaarde.startsWith("4"));
    assert.match(w?.reden ?? "", /0 onafhankelijke bron/);
  });

  test("3c · te lage bewijskwaliteit weigert", async () => {
    await zetBeleid({ minKwaliteit: 5 });
    await maakVersie({ bewijsKwaliteit: 4 });
    const r = await ronde();
    assert.equal(r.gepubliceerd.length, 0);
    const w = r.geweigerd.find((x) => x.voorwaarde.startsWith("5"));
    assert.match(w?.reden ?? "", /bewijskwaliteit 4; het beleid eist 5/);
  });

  /* ---------- 6 · verouderd of conflicterend ---------- */

  test("6 · een gebeurtenis met tegenspraak weigert", async () => {
    await zetBeleid();
    await maakVersie({ heeftTegenspraak: true });
    const r = await ronde();
    assert.equal(r.gepubliceerd.length, 0);
    const w = r.geweigerd.find((x) => x.voorwaarde.startsWith("6"));
    assert.match(w?.reden ?? "", /tegenspraak tussen bronnen/);
  });

  test("6b · een claim over zijn geldig_tot weigert", async () => {
    await zetBeleid();
    await maakVersie({ verlopen: true });
    const r = await ronde();
    assert.equal(r.gepubliceerd.length, 0);
    const w = r.geweigerd.find((x) => x.voorwaarde.startsWith("6"));
    assert.match(w?.reden ?? "", /over hun geldig_tot/);
  });

  test("6c · een ONGEVERIFIEERDE claim laat het bewijs niet dragen", async () => {
    await zetBeleid();
    await maakVersie({ verificatieStatus: "ongeverifieerd" });
    const r = await ronde();
    assert.equal(r.gepubliceerd.length, 0);
    const w = r.geweigerd.find((x) => x.voorwaarde.startsWith("6"));
    assert.ok(w !== undefined, `geen weigering op 6; wel: ${JSON.stringify(r.geweigerd)}`);
  });

  /* ---------- 7 · actualiteit ---------- */

  test("7 · een gebeurtenis zonder datum weigert", async () => {
    await zetBeleid();
    await maakVersie({ zonderDatum: true });
    const r = await ronde();
    assert.equal(r.gepubliceerd.length, 0);
    const w = r.geweigerd.find((x) => x.voorwaarde.startsWith("7"));
    assert.match(w?.reden ?? "", /geen datum/);
  });

  test("7b · een gebeurtenis ouder dan de grens weigert", async () => {
    await zetBeleid();
    await maakVersie({ dagenOud: MAX_GEBEURTENIS_LEEFTIJD_DAGEN + 5 });
    const r = await ronde();
    assert.equal(r.gepubliceerd.length, 0);
    const w = r.geweigerd.find((x) => x.voorwaarde.startsWith("7"));
    assert.match(w?.reden ?? "", new RegExp(`grens voor automatische publicatie is ${MAX_GEBEURTENIS_LEEFTIJD_DAGEN}`));
  });

  /* ---------- het gelukkige pad, en daarna 4, 8 en 9 ---------- */

  test("GELUKKIG PAD · alle negen gehaald levert een publicatie met beleidsgoedkeuring", async () => {
    await zetBeleid();
    const id = await maakVersie();
    const r = await ronde();
    assert.equal(
      r.gepubliceerd.length,
      1,
      `er hoort precies één publicatie te zijn; geweigerd: ${JSON.stringify(r.geweigerd)}`,
    );
    assert.equal(r.gepubliceerd[0]?.inhoudVersieId, id);

    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const v = await c.query<{
        status: string;
        goedkeuring_soort: string;
        goedkeurend_beleid: string | null;
        goedgekeurd_door: number | null;
      }>(
        `select status, goedkeuring_soort, goedkeurend_beleid, goedgekeurd_door
           from intel.inhoud_versies where id = $1`,
        [id],
      );
      /* DE GOEDKEURING IS ALS BELEID GEMARKEERD, EN goedgekeurd_door IS
         LEEG. Dat laatste is het punt van migratie 0052: er was geen
         mens, dus staat er geen mens. */
      assert.equal(v.rows[0]?.goedkeuring_soort, "beleid");
      assert.equal(v.rows[0]?.goedgekeurd_door, null);
      assert.equal(v.rows[0]?.goedkeurend_beleid, "toets-beleid");
      assert.equal(v.rows[0]?.status, "gepubliceerd");

      /* HET AUDITSPOOR NOEMT HET BELEID. */
      const b = await c.query<{ besluit: string; actor_soort: string; beleid_versie: string | null }>(
        `select besluit, actor_soort, beleid_versie from intel.publicatiebesluiten
          where inhoud_versie_id = $1 order by id`,
        [id],
      );
      assert.ok(
        b.rows.some((x) => x.actor_soort === "systeem" && x.beleid_versie === "toets-beleid"),
        `het auditspoor hoort het beleid te noemen: ${JSON.stringify(b.rows)}`,
      );
    });
  });

  test("4 · twee keer draaien publiceert ÉÉN keer", async () => {
    await zetBeleid();
    const eersteId = await maakVersie();
    const eerste = await ronde();
    assert.equal(eerste.gepubliceerd.length, 1);
    const tweede = await ronde();
    assert.equal(tweede.gepubliceerd.length, 0, "de tweede ronde mag niets publiceren");
    assert.equal(tweede.bekeken, 0, "de versie hoort niet meer in de werkvoorraad te zitten");

    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const p = await c.query<{ n: number }>(
        "select count(*)::int as n from intel.publicaties where inhoud_versie_id = $1",
        [eersteId],
      );
      assert.equal(p.rows[0]?.n, 1, "er hoort precies één publicatierij voor deze versie te zijn");
    });
  });

  test("4b · dezelfde INHOUD op een ander pad is ook een duplicaat", async () => {
    /* DE AFDRUK IS DE MAAT, niet het pad. Twee keer dezelfde tekst
       publiceren is een duplicaat, ook als iemand hem op een tweede
       route zet. */
    await zetBeleid();
    await maakVersie({ afdruk: "zelfde-afdruk", pad: "/nieuws/eerste" });
    const eerste = await ronde();
    assert.equal(eerste.gepubliceerd.length, 1);

    await maakVersie({ afdruk: "zelfde-afdruk", pad: "/nieuws/tweede" });
    const tweede = await ronde();
    assert.equal(tweede.gepubliceerd.length, 0);
    const w = tweede.geweigerd.find((x) => x.voorwaarde.startsWith("8"));
    assert.match(w?.reden ?? "", /al gepubliceerd als versie/);
  });

  /* ---------- 7 · privilege-escalatie ---------- */

  test("7-escalatie · een beleidsgoedkeuring kan geen MENS nabootsen", async () => {
    /* goedkeuring_soort 'beleid' MET een goedgekeurd_door zou precies
       de verwarring maken die 0052 wegneemt: een lezer die
       goedgekeurd_door ziet, concludeert dat een mens keek. */
    const id = await maakVersie();
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `update intel.inhoud_versies
                set status = 'goedgekeurd', goedkeuring_soort = 'beleid',
                    goedkeurend_beleid = 'x', goedgekeurd_door = $2,
                    goedgekeurde_afdruk = inhoud_afdruk
              where id = $1`,
            [id, goedkeurder],
          );
        }),
      /goedkeuring_herkomst/i,
      "beleid en een menselijke goedkeurder kunnen niet samen",
    );
  });

  test("7-escalatie b · een MENSELIJKE goedkeuring zonder goedkeurder blijft onmogelijk", async () => {
    const id = await maakVersie();
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `update intel.inhoud_versies
                set status = 'goedgekeurd', goedkeuring_soort = 'mens',
                    goedgekeurde_afdruk = inhoud_afdruk
              where id = $1`,
            [id],
          );
        }),
      /goedkeuring_herkomst/i,
    );
  });

  test("7-escalatie c · de vier-ogenregel blijft voor de menselijke route gelden", async () => {
    const id = await maakVersie();
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `update intel.inhoud_versies
                set status = 'goedgekeurd', goedkeuring_soort = 'mens',
                    goedgekeurd_door = $2, goedgekeurde_afdruk = inhoud_afdruk
              where id = $1`,
            [id, auteur],
          );
        }),
      /vier_ogen/i,
      "de auteur mag zijn eigen stuk niet goedkeuren",
    );
  });

  test("7-escalatie d · tekst wijzigen na een beleidsgoedkeuring maakt publiceren onmogelijk", async () => {
    await zetBeleid();
    const id = await maakVersie();
    /* Eerst goedkeuren via de module, maar droog zodat er niet
       gepubliceerd wordt; daarna de afdruk wijzigen. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `update intel.inhoud_versies
            set status = 'goedgekeurd', goedkeuring_soort = 'beleid',
                goedkeurend_beleid = 'x', goedgekeurde_afdruk = inhoud_afdruk
          where id = $1`,
        [id],
      );
    });
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query("update intel.inhoud_versies set inhoud_afdruk = 'gewijzigd' where id = $1", [id]);
        }),
      /goedkeuring_bindt/i,
      "de goedgekeurde afdruk moet aan de inhoud gebonden blijven",
    );
  });

  /* ---------- 8 en 9 · herstel en sitemap ---------- */

  test("8 · een versie die niet 'ter_review' is komt niet in de werkvoorraad", async () => {
    /* HERSTEL BIJ EEN GEDEELTELIJKE FOUT. Draait een ronde halverwege
       vast nadat de goedkeuring is geschreven maar vóór publiceer(),
       dan staat de versie op 'goedgekeurd'. De volgende ronde pakt hem
       NIET opnieuw op — de werkvoorraad vraagt 'ter_review' — zodat
       er geen dubbele publicatie uit komt. Hij wacht dan op
       `npm run publiceer`, en dat is zichtbaar in het dashboard. */
    await zetBeleid();
    const id = await maakVersie({ status: "ter_review" });
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `update intel.inhoud_versies
            set status = 'goedgekeurd', goedkeuring_soort = 'beleid',
                goedkeurend_beleid = 'halverwege', goedgekeurde_afdruk = inhoud_afdruk
          where id = $1`,
        [id],
      );
    });
    const r = await ronde();
    assert.equal(r.bekeken, 0, "een goedgekeurde versie hoort niet opnieuw opgepakt te worden");
    assert.equal(r.gepubliceerd.length, 0);
  });

  test("9 · de publicatie legt het registerrecord en de metadata vast", async () => {
    await zetBeleid();
    const id = await maakVersie();
    const r = await ronde();
    assert.equal(r.gepubliceerd.length, 1, JSON.stringify(r.geweigerd));

    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const p = await c.query<{
        bestandspad: string;
        sitemap_bijgewerkt: boolean;
        status: string;
        bestand_hash: string | null;
      }>(
        `select bestandspad, sitemap_bijgewerkt, status, bestand_hash
           from intel.publicaties where inhoud_versie_id = $1`,
        [id],
      );
      const rij = p.rows[0];
      assert.ok(rij !== undefined, "er hoort een publicatierij te zijn");
      /* 'geschreven' IS DE LEVENDE TOESTAND. De CHECK staat alleen
         'geschreven', 'teruggedraaid' en 'mislukt' toe; er is geen
         'geslaagd'. Deze assertie legde dat vast toen mijn module nog
         op de niet-bestaande waarde filterde. */
      assert.equal(rij?.status, "geschreven");
      assert.ok((rij?.bestand_hash ?? "").length > 0, "de publicatie legt een hash van het bestand vast");
      /* HET BESTAND STAAT IN DE GEISOLEERDE SITEWORTEL, niet in de repo. */
      assert.ok(
        existsSync(join(siteWortel, rij!.bestandspad)),
        `het geschreven bestand hoort te bestaan: ${rij?.bestandspad}`,
      );
    });
  });

  test("9b · droog draaien publiceert niets maar meldt wat het zou doen", async () => {
    await zetBeleid();
    const id = await maakVersie();
    const r = await ronde(true);
    assert.equal(r.droog, true);
    assert.equal(r.gepubliceerd.length, 1, "droog hoort te melden dat deze versie zou publiceren");
    assert.equal(r.gepubliceerd[0]?.publicatieId, null, "droog levert geen publicatie-id");
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const p = await c.query<{ n: number }>(
        "select count(*)::int as n from intel.publicaties where inhoud_versie_id = $1",
        [id],
      );
      assert.equal(p.rows[0]?.n, 0, "droog mag geen publicatierij schrijven");
      const v = await c.query<{ status: string }>(
        "select status from intel.inhoud_versies where id = $1",
        [id],
      );
      assert.equal(v.rows[0]?.status, "ter_review", "droog mag de status niet wijzigen");
    });
  });

  test("leesBeleid geeft de ACTIEVE rij, niet de nieuwste inactieve", async () => {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query("delete from intel.publicatiebeleid");
      await c.query(
        `insert into intel.publicatiebeleid
           (organisatie_id, versie, auto_publiceren_aan, auto_max_risico, actief, vastgesteld_op)
         values ($1,'oud-actief',false,'laag',true, now() - interval '10 days'),
                ($1,'nieuw-inactief',true,'midden',false, now())`,
        [org],
      );
    });
    const b = await metOrganisatie(db.pool, { organisatieId: org }, (c) => leesBeleid(c, org));
    assert.equal(b?.versie, "oud-actief");
    assert.equal(b?.autoAan, false);
  });
});
