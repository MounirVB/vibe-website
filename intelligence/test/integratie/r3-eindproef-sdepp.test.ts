/* ============================================================
   INTEGRATIE — de volledige keten op de echte kandidaat (R3, sectie 9)
   ------------------------------------------------------------
   WAT HIER WORDT NAGESPEELD, EN WAAROM ZO.

   De opdracht vraagt de bestaande geschikte kandidaat helemaal door de
   keten te halen:

     'Ondernemers krijgen in 2026 meer tijd voor subsidieaanvraag SDE++'
     bestaande score 71/100

   In productie is dat gebeurtenis g30, met één dragende claim uit
   `rvo-opendata-artikelen`. De brontekst en de claim hieronder zijn die
   productierij, letterlijk overgenomen (gemeten 30 oktober 2026):

     'Zij kunnen van 27 oktober tot 26 november 2026 een aanvraag
      indienen bij de Rijksdienst voor Ondernemend Nederland.'

   De proef draait in een WEGWERPDATABASE en niet op productie. Dat is
   geen voorzichtigheid om de voorzichtigheid: `maakConcept()` SCHRIJFT
   een inhoudsversie, en dat is een redactionele mutatie die niemand
   heeft gevraagd. Hier wordt hij in een eigen database gedaan en daarna
   weggegooid.

   WAT DEZE PROEF AANTOONT
     1 de bron wordt geclassificeerd als wat hij is
     2 de claim krijgt een modaliteit en draagt
     3 de selectie levert een NEWS_ITEM
     4 het concept wordt gebouwd, met SEO-velden en interne links
     5 het concept staat op ter_review en is NIET goedgekeurd
     6 goedkeuren zonder recht kan niet
     7 de maker kan zijn eigen concept niet goedkeuren (vier ogen)
     8 met recht én een tweede paar ogen kan het wel
     9 er is na dit alles nog NIETS gepubliceerd
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import {
  alsEigenaar,
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { clusterNieuweVersies } from "../../src/pijplijn/clusteren.ts";
import { nieuwsselectieronde } from "../../src/pijplijn/nieuwsselectie.ts";
import { maakConcept } from "../../src/inhoud/concept.ts";
import { keurGoed } from "../../src/inhoud/publiceer.ts";

/** De productietekst van het RVO-artikel achter g30. */
const RVO_TEKST =
  "De openstelling van de SDE++ 2026 is bekend. Ondernemers krijgen meer tijd voor hun " +
  "aanvraag. Zij kunnen van 27 oktober tot 26 november 2026 een aanvraag indienen bij de " +
  "Rijksdienst voor Ondernemend Nederland. De regeling richt zich op CO2-reductie en raakt " +
  "netcongestie, zonnepanelen en opslag van elektriciteit op het elektriciteitsnet. " +
  "Het subsidieplafond bedraagt 8 miljard euro voor deze ronde.";

const TITEL = "Ondernemers krijgen in 2026 meer tijd voor subsidieaanvraag SDE++";

describe("R3 eindproef — SDE++ van bron tot goedkeuring", () => {
  let db: Wegwerpdatabase;
  let org: number;
  let redacteur: number;
  let beheerder: number;
  let analist: number;
  let kandidaatId: number;
  let versieId: number;

  before(async () => {
    db = await maakWegwerpdatabase("r3-eindproef");
    org = await maakOrganisatie(db, "vibe-energy");
    redacteur = await maakGebruiker(db, org, "redactie@vibeenergy.nl", "redacteur");
    beheerder = await maakGebruiker(db, org, "beheer@vibeenergy.nl", "beheerder");
    analist = await maakGebruiker(db, org, "analist@vibeenergy.nl", "analist");

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);

      /* Het paginaregister: de eigenaarroute en de conversiepaden die
         bouwConcept() als interne link mag gebruiken. Alleen paden die
         hier staan komen in het concept; dat is de bestaande regel. */
      for (const pad of ["/subsidies", "/contact", "/projecten"]) {
        await c.query(
          `insert into intel.pagina_register
             (organisatie_id, pad, canonieke_url, soort, in_sitemap, bestaat_in_repo,
              eigenaar_release, beheer)
           values ($1,$2,$3,'oplossing',true,true,'release1','handmatig')`,
          [org, pad, `https://www.vibeenergy.nl${pad}`],
        );
      }

      const cluster = await c.query<{ id: number }>(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam)
         values ($1,'subsidie','Subsidies') returning id`,
        [org],
      );

      const bron = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            betrouwbaarheid, is_primaire_bron, levert_gebeurtenissen, mag_citeren,
            citaat_limiet_tekens)
         values ($1,'rvo-opendata-artikelen','RVO','json_api',
                 'https://opendata.rvo.nl/artikelen','https://www.rvo.nl',true,'toegestaan',
                 'geen_voorbehoud','geverifieerd','fixture',5,true,true,true,300)
         returning id`,
        [org],
      );
      const doc = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
            gepubliceerd_op)
         values ($1,$2,'sdepp-2026','https://www.rvo.nl/subsidies/sde-2026',$3,'RVO','json_api', now())
         returning id`,
        [org, bron.rows[0]!.id, TITEL],
      );
      const versie = await c.query<{ id: number }>(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte)
         values ($1,$2,1,'hash-sdepp',$3,$4,$5) returning id`,
        [org, doc.rows[0]!.id, TITEL, RVO_TEKST, RVO_TEKST.length],
      );
      await c.query("update intel.brondocumenten set huidige_versie_id = $2 where id = $1", [
        doc.rows[0]!.id,
        versie.rows[0]!.id,
      ]);

      /* Het cluster koppelen gebeurt door de clusterlaag zelf; de
         onderwerpherkenning pakt 'subsidie' uit de tekst. */
      void cluster;
    });

    // 1 + 2: classificeren en claims schrijven
    await clusterNieuweVersies(db.pool, org, {});
  });

  after(async () => {
    await db?.opruimen();
  });

  test("1 · de RVO-bron wordt geclassificeerd als bevoegd gezag", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ documentsoort: string; gezag: string; uitleg: string }>(
        `select documentsoort, documentsoort_gezag as gezag,
                documentsoort_grondslag->>'uitleg' as uitleg
           from intel.brondocument_versies where organisatie_id = $1`,
        [org],
      ),
    );
    assert.equal(r.rows.length, 1);
    assert.equal(r.rows[0]!.gezag, "BEVOEGD_GEZAG");
    assert.ok(r.rows[0]!.documentsoort, "er hoort een soort te staan");
    assert.ok(r.rows[0]!.uitleg.length > 20, "de grondslag hoort leesbaar te zijn");
  });

  test("2 · de aanvraagclaim is bevestigd, vastgesteld en draagt", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{
        tekst: string;
        verificatie_status: string;
        bewijs_kwaliteit: number;
        modaliteit: string;
        zekerheid: string;
        plafond: number;
      }>(
        `select tekst, verificatie_status, bewijs_kwaliteit, modaliteit,
                modaliteit_zekerheid::text as zekerheid, bewijskracht_plafond as plafond
           from intel.uitspraken where organisatie_id = $1 order by id`,
        [org],
      ),
    );
    assert.ok(r.rows.length > 0, "er horen claims uit deze tekst te komen");
    const dragend = r.rows.filter(
      (u) =>
        u.verificatie_status === "bevestigd" &&
        u.modaliteit === "VASTGESTELD" &&
        Number(u.zekerheid) >= 0.5,
    );
    assert.ok(
      dragend.length > 0,
      `geen dragende claim; kreeg: ${r.rows
        .map((u) => `${u.verificatie_status}/${u.modaliteit}/${u.zekerheid}`)
        .join(" | ")}`,
    );
    for (const u of dragend) {
      assert.ok(u.plafond >= 4, `plafond ${u.plafond} is te laag voor een bevoegd gezag`);
    }
  });

  test("3 · de selectie levert een NEWS_ITEM met een score", async () => {
    const rapport = await nieuwsselectieronde(db.pool, org, {
      eigenaren: new Map([["subsidie", { route: "subsidies", opIndex: true }]]),
      bronsoortPerSleutel: new Map([["rvo-opendata-artikelen", "WETGEVING"]]),
      bestaandeNieuwsSlugs: new Set(),
      vandaag: "2026-10-30",
    });
    assert.equal(rapport.geschikt, 1, JSON.stringify(rapport.perAfwijsgrond));
    assert.equal(rapport.kandidatenGeschreven, 1);
    assert.ok(rapport.top[0]!.score >= 45, `score ${rapport.top[0]!.score}`);

    const k = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ id: number; besluit: string; status: string; nieuwsscore: number }>(
        `select id, besluit, status, nieuwsscore from intel.inhoud_kandidaten
          where organisatie_id = $1 and besluit = 'NEWS_ITEM'`,
        [org],
      ),
    );
    assert.equal(k.rows.length, 1);
    assert.equal(k.rows[0]!.status, "open");
    kandidaatId = k.rows[0]!.id;
  });

  test("4 · het concept wordt gebouwd met SEO-velden en interne links", async () => {
    const rapport = await maakConcept(db.pool, org, kandidaatId);
    assert.ok(
      rapport.inhoudVersieId !== null,
      `er hoort een inhoudsversie te zijn; blokkades: ${rapport.blokkades.join(" | ")}`,
    );
    versieId = rapport.inhoudVersieId;

    const v = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{
        pad: string;
        titel: string;
        meta_omschrijving: string | null;
        canonieke_url: string;
        body_markdown: string;
        interne_links: string[] | null;
        structured_data: unknown;
        status: string;
        auteur_soort: string;
        soort: string;
      }>(
        `select pad, titel, meta_omschrijving, canonieke_url, body_markdown,
                interne_links, structured_data, status, auteur_soort, soort
           from intel.inhoud_versies where id = $1`,
        [versieId],
      ),
    );
    const c0 = v.rows[0]!;

    assert.match(c0.pad, /^\/nieuws\//, `pad ${c0.pad} hoort onder /nieuws/ te liggen`);
    assert.ok(c0.titel.length > 10 && c0.titel.length <= 70, `titel ${c0.titel.length} tekens`);
    assert.ok(c0.meta_omschrijving, "een metaomschrijving is verplicht voor SEO");
    assert.ok(
      c0.meta_omschrijving.length >= 50 && c0.meta_omschrijving.length <= 200,
      `metaomschrijving ${c0.meta_omschrijving.length} tekens`,
    );
    assert.match(c0.canonieke_url, /^https:\/\/www\.vibeenergy\.nl\/nieuws\//);
    assert.equal(c0.auteur_soort, "ai", "een door de motor opgesteld concept is auteur_soort ai");

    /* De verplichte secties. 'Bronnen' is er altijd; de sectie over
       voorstellen en verwachtingen alleen als er zo'n claim is. */
    assert.match(c0.body_markdown, /## Wat er is vastgelegd/);
    assert.match(c0.body_markdown, /## Wat dit betekent voor bedrijven/);
    assert.match(c0.body_markdown, /## Bronnen/);

    /* De bronvermelding draagt in R3 de documentsoort. */
    assert.match(
      c0.body_markdown,
      /\[(OFFICIEEL_BESLUIT|OFFICIELE_REGELGEVING|FEITELIJKE_MEDEDELING|ONDERZOEKSRAPPORT|SECTORANALYSE|PERSBERICHT)\]/,
      "de bronnenlijst hoort de documentsoort te noemen",
    );

    assert.ok(
      (c0.interne_links ?? []).length > 0,
      "er hoort minstens één interne link naar een bestaande INDEX-pagina te staan",
    );
    for (const l of c0.interne_links ?? []) {
      assert.ok(
        ["subsidies", "contact", "projecten"].includes(l.replace(/^\//, "")),
        `interne link '${l}' staat niet in het paginaregister`,
      );
    }
    assert.ok(c0.structured_data !== null, "structured data hoort gevuld te zijn");
  });

  test("5 · het concept staat op ter_review en is niet goedgekeurd", async () => {
    const v = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ status: string; goedgekeurd_door: number | null; goedgekeurd_op: Date | null }>(
        "select status, goedgekeurd_door, goedgekeurd_op from intel.inhoud_versies where id = $1",
        [versieId],
      ),
    );
    assert.equal(v.rows[0]!.status, "ter_review");
    assert.equal(v.rows[0]!.goedgekeurd_door, null);
    assert.equal(v.rows[0]!.goedgekeurd_op, null);
  });

  test("6 · goedkeuren zonder het recht kan niet", async () => {
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          keurGoed(c, versieId, analist, "ziet er goed uit"),
        ),
      /niet goedkeuren|autorisatie/i,
      "een analist heeft inhoud.goedkeuren niet en hoort geweigerd te worden",
    );
  });

  test("7 · de maker kan zijn eigen concept niet goedkeuren (vier ogen)", async () => {
    /* De motor maakt het concept zonder gebruiker; om de vierogenregel
       echt te raken wordt de redacteur als maker vastgelegd, precies
       zoals het dashboard dat doet bij een tekstwijziging. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        "update intel.inhoud_versies set aangemaakt_door = $2 where id = $1",
        [versieId, redacteur],
      );
    });

    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          keurGoed(c, versieId, redacteur, "eigen werk"),
        ),
      /vier ogen|zelf aangemaakt/i,
    );
  });

  test("8 · met recht en een tweede paar ogen kan het wel", async () => {
    /* DE UITSLAG WORDT GELEZEN. keurGoed() geeft sinds de
       acceptatiecorrectie een uitslag terug: bewijs dat niet meer
       draagt is een normale uitkomst en geen exceptie, omdat de
       blokkade auditeerbaar moet worden vastgelegd en een throw die
       regel zou terugrollen. Een toets die de uitslag negeert, zou een
       geblokkeerde goedkeuring niet van een geslaagde onderscheiden. */
    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, versieId, beheerder, "feiten nagelopen bij RVO, aanvraagtermijn klopt"),
    );
    assert.equal(
      uitslag.goedgekeurd,
      true,
      `de goedkeuring hoort te slagen; geblokkeerd op: ${
        uitslag.goedgekeurd ? "" : uitslag.blokkades.join(" | ")
      }`,
    );
    const v = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ status: string; goedgekeurd_door: number | null }>(
        "select status, goedgekeurd_door from intel.inhoud_versies where id = $1",
        [versieId],
      ),
    );
    assert.equal(v.rows[0]!.status, "goedgekeurd");
    assert.equal(v.rows[0]!.goedgekeurd_door, beheerder);
  });

  test("9 · er is niets gepubliceerd — goedkeuren is geen publiceren", async () => {
    /* DE EERSTE VERSIE VAN DEZE TOETS EISTE OOK NUL BESLUITEN, en dat
       was fout. `intel.publicatiebesluiten` is het AUDITSPOOR: elke stap
       in de keten legt daar vast wie wat besloot. Na deze proef staan er
       twee, van maakConcept() en van keurGoed(), en dat is precies wat
       er hoort te staan — een goedkeuring zonder spoor zou het defect
       zijn.

       Wat nul moet zijn is `intel.publicaties`: de tabel van werkelijk
       gepubliceerde inhoud. Goedkeuren is geen publiceren; publiceren
       vraagt daarna nog een generatorrun, een commit en een push. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ publicaties: string }>(
        "select count(*)::text as publicaties from intel.publicaties",
      ),
    );
    assert.equal(
      Number(r.rows[0]!.publicaties),
      0,
      "er mag na goedkeuring nog niets gepubliceerd zijn",
    );

    const besluiten = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ besluit: string; actor_soort: string; door_gebruiker_id: number | null }>(
        `select besluit, actor_soort, door_gebruiker_id
           from intel.publicatiebesluiten where inhoud_versie_id = $1 order by id`,
        [versieId],
      ),
    );
    assert.ok(
      besluiten.rows.length >= 2,
      "de keten hoort elke stap in het auditspoor te zetten",
    );
    assert.ok(
      besluiten.rows.some((b) => b.door_gebruiker_id === beheerder),
      "de goedkeuring hoort op naam van de goedkeurder te staan",
    );
    assert.ok(
      !besluiten.rows.some((b) => b.besluit === "gepubliceerd"),
      `er staat een publicatiebesluit in het spoor: ${besluiten.rows
        .map((b) => b.besluit)
        .join(", ")}`,
    );
  });
});
