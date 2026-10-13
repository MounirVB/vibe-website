/* ============================================================
   INTEGRATIE — de publicatieketen (par. 15, 16, 25)
   ------------------------------------------------------------
   Par. 25 vraagt om de publicatieketen te DEMONSTREREN zonder
   productie-inhoud goed te keuren en zonder iets naar de live website
   te schrijven. Dat gebeurt hier: een eigen voorstel in een
   wegwerpdatabase, met een eigen fixture-pagina die niet bestaat op
   vibeenergy.nl.

   En het belangrijkste deel van de demonstratie is de WEIGERING. Een
   keten die alleen de gelukkige route laat zien bewijst niets; wat
   bewezen moet worden is dat een goedkeuring vervalt zodra de inhoud
   verandert. Dat is de hele reden dat par. 15 bestaat.
   ============================================================ */

import { before, after, describe, test } from "node:test";
import assert from "node:assert/strict";
import { metOrganisatie } from "../../src/kern/db.ts";
import {
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import {
  beoordeel,
  beoordelingsgeschiedenis,
  goedkeuringGeldig,
  publicatiePrecheck,
} from "../../src/inhoud/beoordeling.ts";
import { inhoudsHashVan } from "../../src/inhoud/voorstel.ts";

/* EEN EIGEN PAGINA DIE NIET BESTAAT.
   Par. 25: geen testinhoud naar de live website. Dit pad staat niet in
   de sitemap van vibeenergy.nl en wordt hier alleen gebruikt om de
   keten te doorlopen. */
const FIXTURE_PAD = "/kennis/fixture-publicatieketen-niet-live";
const WEBSITE_VERSIE = "f".repeat(64);

describe("publicatieketen met een geisoleerde fixture", () => {
  let db: Wegwerpdatabase;
  let org: number;
  let voorstelId: string;
  let hash: string;
  let beoordelaar: number;

  before(async () => {
    db = await maakWegwerpdatabase("publicatieketen");
    org = await maakOrganisatie(db, "vibe-energy");
    /* De beoordelaar is een ECHT account: intel.inhoud_voorstellen
       .beoordeeld_door is een foreign key naar intel.gebruikers. Een
       vrije tekst zou niets bewijzen. */
    beoordelaar = await maakGebruiker(db, org, "beheer@vibeenergy.nl", "beheerder");

    hash = inhoudsHashVan({
      doelPad: FIXTURE_PAD,
      doelSectie: "Wat dit kost",
      wijzigingSoort: "alinea_toevoegen",
      nieuweTekst:
        "Volgens de fixture-uitgever bedraagt het fixturebedrag in 2026 €1 miljoen. " +
        "Deze zin is testmateriaal en hoort niet op de website.",
      feiten: ["fixturefeit"],
      links: [],
      ctaTekst: "Laat uw fixture doorrekenen",
      ctaDoel: "/contact",
    });

    voorstelId = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      /* `gebeurtenis_id` is NOT NULL: een voorstel zonder gebeurtenis
         bestaat niet, en dat is juist — een paginawijziging zonder
         aanleiding hoort niet te kunnen. De fixture krijgt dus een
         eigen gebeurtenis, met een sleutel die hem als testmateriaal
         aanwijst. */
      const g = await c.query<{ id: string }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, gebeurtenis_soort)
         values ($1, 'fixture-publicatieketen', 'Fixture voor de publicatieketen', 'overig')
         returning id::text`,
        [org],
      );
      const gebeurtenisId = g.rows[0]!.id;
      /* En `kandidaat_id` heeft een foreign key naar inhoud_kandidaten:
         een voorstel hangt altijd aan een besluit van de motor. Ook dat
         is juist — een voorstel dat uit de lucht komt vallen hoort niet
         te kunnen bestaan. De fixture doorloopt dus dezelfde keten als
         echte inhoud: gebeurtenis, kandidaat, voorstel. */
      const k = await c.query<{ id: string }>(
        `insert into intel.inhoud_kandidaten
           (organisatie_id, gebeurtenis_id, besluit, motor_versie)
         values ($1, $2::bigint, 'UPDATE_EXISTING', 'fixture-par-25')
         returning id::text`,
        [org, gebeurtenisId],
      );
      const kandidaatId = k.rows[0]!.id;
      const r = await c.query(
        `insert into intel.inhoud_voorstellen
           (organisatie_id, kandidaat_id, gebeurtenis_id, doel_pad, wijziging_soort,
            doel_sectie, nieuwe_tekst, huidige_tekst, cta_tekst, cta_doel, cta_grondslag,
            eindoordeel, oordeel_reden, inhouds_hash, publicatie_status)
         values ($1, $6::bigint, $5::bigint, $2, 'alinea_toevoegen', 'Wat dit kost', $3,
                 'De bestaande fixturetekst.', 'Laat uw fixture doorrekenen', '/contact',
                 'fixture', 'KLAAR_VOOR_REVIEW',
                 'fixture voor par. 25: de publicatieketen zonder productie-inhoud',
                 $4, 'READY_FOR_REVIEW')
         returning id::text`,
        [
          org,
          FIXTURE_PAD,
          "Volgens de fixture-uitgever bedraagt het fixturebedrag in 2026 €1 miljoen. " +
            "Deze zin is testmateriaal en hoort niet op de website.",
          hash,
          gebeurtenisId,
          kandidaatId,
        ],
      );
      return r.rows[0]!.id as string;
    });
  });

  after(async () => {
    await db.opruimen();
  });

  test("1. READY_FOR_REVIEW is nog geen goedkeuring", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query(
        `select publicatie_status, inhouds_hash, goedgekeurd_hash
           from intel.inhoud_voorstellen where id = $1::bigint`,
        [voorstelId],
      );
      const rij = r.rows[0]!;
      assert.equal(rij.publicatie_status, "READY_FOR_REVIEW");
      const g = goedkeuringGeldig(rij);
      assert.equal(g.geldig, false);
      assert.match(g.reden, /nog niet goedgekeurd/);
    });
  });

  test("2. een beoordeling zonder GELDIG ACCOUNT wordt geweigerd", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await assert.rejects(
        () =>
          beoordeel(c, org, {
            voorstelId,
            besluit: "goedgekeurd",
            /* Een gebruikers-id dat niet bestaat. */
            gebruikerId: 999999,
            verwachteHash: hash,
          }),
        /geen actief account/,
      );
    });
  });

  test("3. goedkeuren met een VEROUDERDE hash wordt geweigerd", async () => {
    /* De beoordelaar had een ander voorstel op zijn scherm. Dat mag
       geen goedkeuring worden van wat er nu staat. */
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await assert.rejects(
        () =>
          beoordeel(c, org, {
            voorstelId,
            besluit: "goedgekeurd",
            gebruikerId: beoordelaar,
            verwachteHash: "0".repeat(64),
          }),
        /gewijzigd sinds u het opende/,
      );
    });
  });

  test("4. goedkeuren bindt aan de inhoudshash", async () => {
    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      beoordeel(c, org, {
        voorstelId,
        besluit: "goedgekeurd",
        gebruikerId: beoordelaar,
        notitie: "fixture voor par. 25",
        verwachteHash: hash,
      }),
    );
    assert.equal(uitslag.statusNa, "APPROVED");
    assert.equal(uitslag.gebondenHash, hash);

    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query(
        `select publicatie_status, inhouds_hash, goedgekeurd_hash, beoordeeld_door
           from intel.inhoud_voorstellen where id = $1::bigint`,
        [voorstelId],
      );
      const g = goedkeuringGeldig(r.rows[0]!);
      assert.equal(g.geldig, true, g.reden);
    });
  });

  test("5. de precheck slaagt op een ongewijzigde website", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      publicatiePrecheck(c, org, voorstelId, {
        gepubliceerdeRoutes: [FIXTURE_PAD],
        websiteVersie: WEBSITE_VERSIE,
        huidigeWebsiteVersie: WEBSITE_VERSIE,
      }),
    );
    assert.equal(r.uitslag, "PASS", JSON.stringify(r.controles, null, 1));
    assert.ok(r.controles.length >= 5, "de precheck hoort meer dan een vinkje te zijn");
  });

  test("6. de precheck FAALT als de doelpagina niet meer bestaat", async () => {
    /* Tussen goedkeuren en uitrollen kan een pagina verdwijnen. Dan is
       de goedkeuring geldig en de uitrol toch onmogelijk. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      publicatiePrecheck(c, org, voorstelId, {
        gepubliceerdeRoutes: ["/kennis/een-heel-andere-pagina"],
        websiteVersie: WEBSITE_VERSIE,
        huidigeWebsiteVersie: WEBSITE_VERSIE,
      }),
    );
    assert.equal(r.uitslag, "FAIL");
    assert.ok(
      r.controles.some((x) => x.naam === "doelpagina bestaat nog" && x.oordeel === "FAIL"),
    );
  });

  test("7. de precheck FAALT als de website sinds de goedkeuring is gewijzigd", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      publicatiePrecheck(c, org, voorstelId, {
        gepubliceerdeRoutes: [FIXTURE_PAD],
        websiteVersie: WEBSITE_VERSIE,
        huidigeWebsiteVersie: "a".repeat(64),
      }),
    );
    assert.equal(r.uitslag, "FAIL");
    assert.ok(
      r.controles.some(
        (x) => x.naam === "website onveranderd sinds goedkeuring" && x.oordeel === "FAIL",
      ),
    );
  });

  /* ---------- HET KERNGEVAL VAN PAR. 15 ---------- */

  test("8. MANIPULATIE NA GOEDKEURING maakt de goedkeuring ongeldig", async () => {
    /* Dit is wat par. 25 'rejection after tampering' noemt en wat par.
       15 afdwingt. Iemand — of de voorstelmotor zelf — verandert de
       tekst nadat een mens heeft goedgekeurd. De oude goedkeuring mag
       daar niet op blijven staan.

       Let op WAT er gebeurt: de goedkeuring verdwijnt niet uit de
       geschiedenis. Alleen haar GELDIGHEID vervalt, en de precheck
       weigert. Zo blijft navraagbaar dat er is goedgekeurd, waarop, en
       dat het daarna is gewijzigd. */
    const gemanipuleerd =
      "Volgens de fixture-uitgever bedraagt het fixturebedrag in 2026 €9 miljard. " +
      "Deze zin is testmateriaal en hoort niet op de website.";
    const nieuweHash = inhoudsHashVan({
      doelPad: FIXTURE_PAD,
      doelSectie: "Wat dit kost",
      wijzigingSoort: "alinea_toevoegen",
      nieuweTekst: gemanipuleerd,
      feiten: ["fixturefeit"],
      links: [],
      ctaTekst: "Laat uw fixture doorrekenen",
      ctaDoel: "/contact",
    });
    assert.notEqual(nieuweHash, hash, "de manipulatie hoort de hash te veranderen");

    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await c.query(
        `update intel.inhoud_voorstellen
            set nieuwe_tekst = $2, inhouds_hash = $3
          where id = $1::bigint`,
        [voorstelId, gemanipuleerd, nieuweHash],
      );
      const r = await c.query(
        `select publicatie_status, inhouds_hash, goedgekeurd_hash
           from intel.inhoud_voorstellen where id = $1::bigint`,
        [voorstelId],
      );
      const g = goedkeuringGeldig(r.rows[0]!);
      assert.equal(g.geldig, false, "een gewijzigd voorstel hoort niet goedgekeurd te blijven");
      assert.match(g.reden, /na goedkeuring gewijzigd/);
    });
  });

  test("9. en de precheck weigert de uitrol van het gemanipuleerde voorstel", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      publicatiePrecheck(c, org, voorstelId, {
        gepubliceerdeRoutes: [FIXTURE_PAD],
        websiteVersie: WEBSITE_VERSIE,
        huidigeWebsiteVersie: WEBSITE_VERSIE,
      }),
    );
    assert.equal(r.uitslag, "FAIL");
    assert.ok(
      r.controles.some((x) => x.naam === "goedkeuring geldig" && x.oordeel === "FAIL"),
      JSON.stringify(r.controles),
    );
  });

  test("10. de database weigert DEPLOYMENT zonder geslaagde precheck", async () => {
    /* De poort staat niet alleen in de code. Zou iemand de status met
       de hand verzetten, dan houdt de constraint het tegen. */
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await assert.rejects(
        () =>
          c.query(
            `update intel.inhoud_voorstellen
                set publicatie_status = 'DEPLOYMENT', precheck_uitslag = 'FAIL'
              where id = $1::bigint`,
            [voorstelId],
          ),
        /voorstellen_uitrol_na_precheck/,
      );
    });
  });

  test("11. de database weigert LIVE_VERIFIED zonder bewijs", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await assert.rejects(
        () =>
          c.query(
            `update intel.inhoud_voorstellen
                set publicatie_status = 'LIVE_VERIFIED', precheck_uitslag = 'PASS',
                    precheck_op = now(), live_geverifieerd_op = null, live_bewijs = null
              where id = $1::bigint`,
            [voorstelId],
          ),
        /voorstellen_live_heeft_bewijs|voorstellen_goedkeuring_bindt/,
      );
    });
  });

  test("12. het auditspoor houdt elk besluit met zijn hash", async () => {
    const g = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      beoordelingsgeschiedenis(c, org, voorstelId),
    );
    assert.ok(g.length >= 1, "er hoort minstens een besluit in de geschiedenis te staan");
    const goedkeuring = g.find((x) => x.besluit === "goedgekeurd");
    assert.ok(goedkeuring, "de goedkeuring hoort bewaard te zijn, ook na de manipulatie");
    assert.equal(goedkeuring.inhouds_hash, hash, "gebonden aan de ORIGINELE hash");
    assert.equal(goedkeuring.door, "beheer@vibeenergy.nl");
    assert.equal(goedkeuring.door_gebruiker_id, String(beoordelaar), "gebonden aan het account");
    assert.equal(goedkeuring.status_voor, "READY_FOR_REVIEW");
    assert.equal(goedkeuring.status_na, "APPROVED");
  });

  test("13. het auditspoor is niet bij te werken", async () => {
    /* Append-only is pas append-only als de rol het ook niet mag. */
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const rol = await c.query("select current_user as u");
      if (rol.rows[0]!.u === "vibe_intel_app") {
        await assert.rejects(
          () => c.query("update intel.voorstel_beoordelingen set besluit = 'afgewezen'"),
          /permission denied|toegang/i,
        );
      }
    });
  });

  test("14. de fixturepagina staat NIET in de echte sitekennis", async () => {
    /* De laatste waarborg van par. 25: wat hier is gebruikt bestaat niet
       op de website. Zou dit pad ooit echt gepubliceerd worden, dan
       faalt deze test en is dat precies de bedoeling. */
    const { leesSitekennis } = await import("../../src/site/sitekennis.ts");
    const { dirname, resolve } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const wortel = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const uitslag = await leesSitekennis(wortel);
    if (!uitslag.ok) return; /* geen artefact: niets te toetsen */
    assert.ok(
      !uitslag.kennis.paginas.some((p) => p.route === FIXTURE_PAD),
      `${FIXTURE_PAD} hoort niet in de gepubliceerde sitekennis te staan`,
    );
  });
});
