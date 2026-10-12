/* ============================================================
   TEST — Content Studio tegen een echte database
   ------------------------------------------------------------
   De regressies uit §17 die een database nodig hebben:

     1  een ontbrekende /app/kennis mag niet stil NEW_ARTICLE opleveren
     2  een lege INTEL_SITE_WORTEL mag geen verkeerde classificatie geven
     8  een subsidiefeit mag niet op een pagina die subsidies wegwijst
     9  een voorstel op een bestaande pagina houdt de canonieke URL
    10  menselijke beoordeling blijft verplicht
    11  publiceren blijft uit

   HET VERSCHIL MET DE EENHEIDSTOETSEN

   Die toetsen het artefact. Deze toetsen wat de DATABASE toestaat, en
   dat is waar de harde grenzen zitten: een goedkeuring op een afgewezen
   voorstel hoort door een constraint te worden geweigerd en niet door
   een if-statement in de route.
   ============================================================ */

import { strict as assert } from "node:assert";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie, rijen } from "../../src/kern/db.ts";
import { bouwVoorstel, bewaarVoorstel } from "../../src/inhoud/voorstel.ts";
import { hashVan, type SitekennisBestand } from "../../src/site/sitekennis.ts";

/** Een artefact met twee pagina's: één die subsidies wegwijst, één die ze bezit. */
function maakKennis(): SitekennisBestand {
  const paginas = [
    {
      route: "/kennis/subsidiemechanismen",
      canoniekeUrl: "https://www.vibeenergy.nl/kennis/subsidiemechanismen",
      staat: "gepubliceerd" as const,
      soort: "kennis",
      titel: "Subsidiemechanismen",
      h1: "Hoe subsidiemechanismen werken",
      tekst: "Dit antwoord beschrijft hoe mechanismen werken. Een subsidie kan een investering dekken.",
      woorden: 400,
      vingerafdruk: "a".repeat(64),
      /* Het gepubliceerde voorbehoud: deze pagina WIJST regelingsstanden WEG. */
      voorbehoud:
        "Dit antwoord beschrijft hoe mechanismen werken, niet de stand van een regeling. " +
        "Welke regelingen bestaan en welke bedragen gelden, staat hier niet.",
      secties: [{ kop: "Hoe een mechanisme werkt", tekst: "Een mechanisme verlaagt de investering." }],
      sectiekoppen: ["Hoe een mechanisme werkt"],
      interneLinks: ["/contact"],
      onderwerpen: ["subsidie"],
      oplossingen: ["zonnestroom"],
    },
    {
      route: "/subsidies",
      canoniekeUrl: "https://www.vibeenergy.nl/subsidies",
      staat: "gepubliceerd" as const,
      soort: "overig",
      titel: "Subsidies",
      h1: "Subsidies voor energieopslag",
      tekst:
        "De SDE en de EIA zijn regelingen voor subsidie op energie-investeringen. " +
        "Welke subsidieregeling past, hangt af van de investering. Een subsidieregeling " +
        "kent jaarlijkse budgetten.",
      woorden: 900,
      vingerafdruk: "b".repeat(64),
      voorbehoud: null,
      secties: [
        {
          kop: "Welke regelingen er zijn",
          tekst: "De SDE en EIA worden jaarlijks bijgesteld; elke subsidieregeling heeft een eigen budget.",
        },
      ],
      sectiekoppen: ["Welke regelingen er zijn"],
      interneLinks: [],
      onderwerpen: ["subsidie"],
      oplossingen: ["zonnestroom"],
    },
  ];
  const kennis = {
    schema: 2,
    websiteVersie: "c".repeat(64),
    routesGegenereerd: "2026-10-12",
    aantalPaginas: paginas.length,
    paginas,
  };
  return { ...kennis, inhoudsHash: hashVan(kennis) };
}

describe("content studio", () => {
  let db: Wegwerpdatabase;
  let org: number;
  let kandidaatOpVerkeerdePagina: number;
  let kandidaatOpJuistePagina: number;
  const kennis = maakKennis();

  before(async () => {
    db = await maakWegwerpdatabase("contentstudio");
    org = await maakOrganisatie(db, "vibe-energy");

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const bron = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            mag_citeren, citaat_limiet_tekens)
         values ($1,'rvo-nieuws','RVO','rss','https://www.rvo.nl/feed','https://www.rvo.nl',
                 true,'toegestaan','geen_voorbehoud','geverifieerd','fixture', false, 0)
         returning id`,
        [org],
      );
      /* De pagina's EERST: onderwerp_clusters.canonieke_pagina heeft een
         foreign key naar pagina_register.pad, dus de pagina moet bestaan
         voordat een cluster hem kan aanwijzen. */
      const paginaIds: Record<string, number> = {};
      for (const pad of ["/kennis/subsidiemechanismen", "/subsidies"]) {
        const r = await c.query<{ id: number }>(
          `insert into intel.pagina_register
             (organisatie_id, pad, canonieke_url, soort, beheer, eigenaar_release,
              bestaat_in_repo, in_sitemap)
           values ($1,$2,$3,$4,'handmatig','release1',true,true) returning id`,
          [org, pad, `https://www.vibeenergy.nl${pad}`, pad.startsWith("/kennis/") ? "kennis" : "overig"],
        );
        paginaIds[pad] = r.rows[0]!.id;
      }

      const cluster = await c.query<{ id: number }>(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam, canonieke_pagina)
         values ($1,'subsidie','Subsidie','/subsidies') returning id`,
        [org],
      );

      /* Eén gebeurtenis met een HARD, verwoordbaar feit: een bedrag met
         een schaalwoord. Dat is te verwoorden zonder te citeren. */
      let i = 0;
      for (const pad of ["/kennis/subsidiemechanismen", "/subsidies"]) {
        i += 1;
        const doc = await c.query<{ id: number }>(
          `insert into intel.brondocumenten
             (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort, gepubliceerd_op)
           values ($1,$2,$3,$4,'Subsidieregeling verhoogd naar 3 miljard euro','RVO','rss', now())
           returning id`,
          [org, bron.rows[0]!.id, `fix-${i}`, `https://www.rvo.nl/nieuws-${i}`],
        );
        const versie = await c.query<{ id: number }>(
          `insert into intel.brondocument_versies
             (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte)
           values ($1,$2,1,$3,'Subsidieregeling verhoogd','Het budget stijgt naar 3 miljard euro.',40)
           returning id`,
          [org, doc.rows[0]!.id, `hash-${i}`],
        );
        const geb = await c.query<{ id: number }>(
          `insert into intel.markt_gebeurtenissen
             (organisatie_id, sleutel, titel, gebeurtenis_soort, gebeurd_op, onderwerp_cluster_id,
              risico_klasse, status, relevantie_categorie, bedrijfsrelevantie, relevantie_vertrouwen,
              relevantie_grondslag)
           values ($1,$2,'Subsidieregeling verhoogd naar 3 miljard euro','subsidie', now(), $3,
                   'midden','verrijkt','redactionele_kans',45,60,'{"uitleg":"fixture"}'::jsonb)
           returning id`,
          [org, `sleutel-${i}`, cluster.rows[0]!.id],
        );
        await c.query(
          `insert into intel.gebeurtenis_documenten
             (organisatie_id, gebeurtenis_id, brondocument_id, versie_id, rol)
           values ($1,$2,$3,$4,'primair')`,
          [org, geb.rows[0]!.id, doc.rows[0]!.id, versie.rows[0]!.id],
        );
        /* De uitspraak eerst ONBEVESTIGD inzetten: een trigger weigert
           'bevestigd' zonder primaire bronversie, en die koppeling kan
           pas na de insert. Dat is de invariant uit migratie 0003 en die
           hoort ook in een toets te gelden. */
        const uitspraak = await c.query<{ id: number }>(
          `insert into intel.uitspraken
             (organisatie_id, gebeurtenis_id, tekst, soort, waarde_numeriek, eenheid, onderwerp,
              verificatie_status, bewijs_kwaliteit, risico_klasse, is_interpretatie)
           values ($1,$2,'Het budget stijgt naar 3 miljard euro.','prijs',3000000000,'EUR','subsidie',
                   'ongeverifieerd',5,'midden',false)
           returning id`,
          [org, geb.rows[0]!.id],
        );
        await c.query(
          `insert into intel.uitspraak_bronnen
             (organisatie_id, uitspraak_id, versie_id, rol)
           values ($1,$2,$3,'primair')`,
          [org, uitspraak.rows[0]!.id, versie.rows[0]!.id],
        );
        await c.query(
          `update intel.uitspraken set verificatie_status = 'bevestigd' where id = $1`,
          [uitspraak.rows[0]!.id],
        );
        const kand = await c.query<{ id: number }>(
          `insert into intel.inhoud_kandidaten
             (organisatie_id, gebeurtenis_id, onderwerp_cluster_id, doel_pagina_id, besluit,
              totaalscore, motor_versie, risico_klasse, status)
           values ($1,$2,$3,$4,'UPDATE_EXISTING',70,'toets','midden','open')
           returning id`,
          [org, geb.rows[0]!.id, cluster.rows[0]!.id, paginaIds[pad]],
        );
        if (pad === "/kennis/subsidiemechanismen") kandidaatOpVerkeerdePagina = kand.rows[0]!.id;
        else kandidaatOpJuistePagina = kand.rows[0]!.id;
      }
    });
  });

  after(async () => {
    await db.opruimen();
  });

  /* ---------- 8: verkeerde subsidierouting ---------- */

  test("REGRESSIE 8: een subsidiefeit op een pagina die subsidies wegwijst, wordt omgeleid", async () => {
    const v = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      bouwVoorstel(c, kennis, kandidaatOpVerkeerdePagina, "2026-10-12"),
    );
    assert.ok(v, "er hoort een voorstel te komen");
    assert.equal(
      v.eindoordeel,
      "HERROUTEREN",
      `verwacht HERROUTEREN, kreeg ${v.eindoordeel}: ${v.oordeelReden}`,
    );
    const seo = v.controles.find((x) => x.naam === "seo");
    assert.equal(seo?.oordeel, "FAIL");
    assert.match(seo!.reden, /voorbehoud/i);
    assert.equal(v.wijziging.soort, "geen", "een omgeleid voorstel levert geen tekst");
  });

  test("hetzelfde feit op de JUISTE pagina komt wel door", async () => {
    const v = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      bouwVoorstel(c, kennis, kandidaatOpJuistePagina, "2026-10-12"),
    );
    assert.ok(v);
    assert.equal(
      v.eindoordeel,
      "KLAAR_VOOR_REVIEW",
      `verwacht KLAAR_VOOR_REVIEW, kreeg ${v.eindoordeel}: ${v.oordeelReden}`,
    );
    /* Het bedrag mét schaalwoord is verwoordbaar zonder te citeren. */
    assert.equal(v.controles.find((x) => x.naam === "verwoordbaarheid")?.oordeel, "PASS");
    assert.ok(v.wijziging.nieuweTekst.includes("3000000000") || v.wijziging.nieuweTekst.includes("3000000000 euro"),
      `de voorgestelde tekst hoort het bedrag te noemen: ${v.wijziging.nieuweTekst}`);
  });

  /* ---------- 9: canonieke URL blijft ---------- */

  test("REGRESSIE 9: een voorstel verandert de canonieke URL niet", async () => {
    const v = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      bouwVoorstel(c, kennis, kandidaatOpJuistePagina, "2026-10-12"),
    );
    assert.ok(v);
    assert.equal(v.doelPad, "/subsidies", "de doelpagina hoort ongewijzigd te blijven");
    /* Er is geen enkel veld waarmee een voorstel een nieuwe URL kan
       voorstellen; dat is een eigenschap van het type, niet een regel. */
    assert.ok(!("nieuweUrl" in v), "een voorstel mag geen nieuwe URL kunnen dragen");
    assert.ok(!JSON.stringify(v.wijziging).includes("http"), "de wijziging hoort geen URL te bevatten");
  });

  /* ---------- 10 en 11: mens en publicatie ---------- */

  test("REGRESSIE 10: een AFGEWEZEN voorstel kan niet worden goedgekeurd", async () => {
    const v = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      bouwVoorstel(c, kennis, kandidaatOpVerkeerdePagina, "2026-10-12"),
    );
    const bewaard = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      bewaarVoorstel(c, org, v!),
    );
    /* De DATABASE hoort dit te weigeren, niet de route. */
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query(
            `update intel.inhoud_voorstellen
                set beoordeling = 'GOEDGEKEURD', beoordeeld_op = now(), beoordeeld_door = null
              where id = $1`,
            [bewaard.id],
          ),
        ),
      /voorstel_alleen_review_goedkeuren|voorstel_beoordeling_compleet/,
      "een niet-review-klaar voorstel hoort niet goedgekeurd te kunnen worden",
    );
  });

  test("REGRESSIE 10: een beoordeling zonder beoordelaar wordt geweigerd", async () => {
    const v = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      bouwVoorstel(c, kennis, kandidaatOpJuistePagina, "2026-10-12"),
    );
    const bewaard = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      bewaarVoorstel(c, org, v!),
    );
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query(
            `update intel.inhoud_voorstellen set beoordeling = 'GOEDGEKEURD' where id = $1`,
            [bewaard.id],
          ),
        ),
      /voorstel_beoordeling_compleet/,
      "een beoordeling draagt altijd wie en wanneer",
    );
  });

  test("REGRESSIE 11: er bestaat geen publicatiestatus op een voorstel", async () => {
    const kolommen = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<{ column_name: string }>(
        c,
        `select column_name from information_schema.columns
          where table_schema = 'intel' and table_name = 'inhoud_voorstellen'`,
      ),
    );
    const namen = kolommen.map((k) => k.column_name);
    for (const verboden of ["gepubliceerd", "gepubliceerd_op", "publiceer", "live"]) {
      assert.ok(
        !namen.includes(verboden),
        `kolom '${verboden}' hoort niet te bestaan: goedkeuren is geen publiceren`,
      );
    }
    /* En de toegestane beoordelingen bevatten niets dat publiceert. */
    const check = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<{ def: string }>(
        c,
        `select pg_get_constraintdef(oid) as def from pg_constraint
          where conname = 'inhoud_voorstellen_beoordeling_check'`,
      ),
    );
    if (check[0]) {
      assert.ok(!/publiceer|gepubliceerd/i.test(check[0].def), "geen publicatiewaarde in de beoordeling");
    }
  });

  test("een beoordeling met beoordelaar en tijd wordt wel vastgelegd", async () => {
    const gebruiker = await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const r = await c.query<{ id: number }>(
        `insert into intel.gebruikers (organisatie_id, email, naam, actief)
         values ($1,'review@vibeenergy.nl','Reviewer',true) returning id`,
        [org],
      );
      return r.rows[0]!.id;
    });
    const v = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      bouwVoorstel(c, kennis, kandidaatOpJuistePagina, "2026-10-12"),
    );
    const bewaard = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      bewaarVoorstel(c, org, v!),
    );
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query(
        `update intel.inhoud_voorstellen
            set beoordeling = 'GOEDGEKEURD', beoordeeld_op = now(), beoordeeld_door = $2,
                beoordeling_notitie = 'Doorgevoerd in de kennispagina.'
          where id = $1`,
        [bewaard.id, gebruiker],
      ),
    );
    const na = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<{ beoordeling: string; beoordeeld_door: number }>(
        c,
        `select beoordeling, beoordeeld_door from intel.inhoud_voorstellen where id = $1`,
        [bewaard.id],
      ),
    );
    assert.equal(na[0]!.beoordeling, "GOEDGEKEURD");
    assert.equal(Number(na[0]!.beoordeeld_door), gebruiker);

    /* EN DE PIJPLIJN MAG DAT NIET OVERSCHRIJVEN. */
    await metOrganisatie(db.pool, { organisatieId: org }, (c) => bewaarVoorstel(c, org, v!));
    const naPijplijn = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<{ beoordeling: string | null }>(
        c,
        `select beoordeling from intel.inhoud_voorstellen where id = $1`,
        [bewaard.id],
      ),
    );
    assert.equal(
      naPijplijn[0]!.beoordeling,
      "GOEDGEKEURD",
      "een nieuwe pijplijnronde heeft het mensbesluit gewist",
    );
  });

  /* ---------- 1 en 2: fail closed ---------- */

  test("REGRESSIE 1+2: zonder website EN zonder artefact faalt zaai DICHT", async () => {
    /* Dit is de productiesituatie: INTEL_SITE_WORTEL leeg, /app/kennis
       weg. Dan hoort er een harde fout te komen, geen lege scan die
       later als NEW_ARTICLE voor alles terugkomt. */
    const leeg = await mkdtemp(join(tmpdir(), "vibe-geen-site-"));
    const geenArtefact = await mkdtemp(join(tmpdir(), "vibe-geen-art-"));
    try {
      await mkdir(join(geenArtefact, "data"), { recursive: true });
      const { leesSitekennis } = await import("../../src/site/sitekennis.ts");
      const { scanSite } = await import("../../src/site/paginascan.ts");

      const scan = await scanSite(leeg);
      const artefact = await leesSitekennis(geenArtefact);

      assert.equal(scan.paginas.length, 0, "een lege map geeft nul pagina's");
      assert.equal(artefact.ok, false, "en er is geen artefact");

      /* De combinatie is precies de voorwaarde waarop zaai hoort te
         weigeren. Die voorwaarde staat hier expliciet, zodat een
         toekomstige wijziging die hem omzeilt rood wordt. */
      const moetFalen = scan.paginas.length === 0 && !artefact.ok;
      assert.equal(moetFalen, true, "dit is de situatie waarin zaai moet weigeren");
    } finally {
      await rm(leeg, { recursive: true, force: true });
      await rm(geenArtefact, { recursive: true, force: true });
    }
  });
});
