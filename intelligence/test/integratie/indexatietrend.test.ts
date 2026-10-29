/* ============================================================
   TEST — de vergelijking over 7, 28 en 90 dagen
   ------------------------------------------------------------
   WAT HIER WORDT BEWEZEN.

   §11 van de opdracht vraagt een vergelijking over 7, 28 en 90 dagen.
   Op b2de0c4 bestond die niet, en de reden was niet luiheid maar een
   ontbrekend tweede meetpunt: `intel.indexatie_status` heeft
   `unique (organisatie_id, url, bron)` en overschrijft bij elke meting
   de vorige stand. `intel.indexatie_dagstand` (migratie 0034) kan het
   wél bewaren, maar `--bewaar` stond in geen enkele planregel en de
   tabel had 0 rijen.

   Deze suite toetst de twee dingen die daaruit volgen:

     1 met te weinig dagstanden is het antwoord NIET GEMETEN, met het
       aantal erbij — en nooit een delta van 0, want dat zou beweren dat
       er niets is veranderd;
     2 met twee dagstanden komt er een echt verschil uit, en het juiste
       venster pakt het juiste meetpunt.

   Plus de eerlijkheidsregel die er dwars doorheen loopt: een metriek
   zonder getal (NOT_AVAILABLE) krijgt geen verschil. Een verschil
   tussen twee onbekenden is geen nul.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import {
  alsEigenaar,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import {
  INDEXATIE_METRIEKEN,
  SEGMENT_VAN_SOORT,
  segmentStanden,
  VERGELIJKVENSTERS,
  vergelijkVensters,
} from "../../src/analytics/koppelingen.ts";

const VANDAAG = "2026-10-29";

/** Een datum N dagen vóór VANDAAG. */
function dagenTerug(n: number): string {
  return new Date(Date.parse(`${VANDAAG}T00:00:00Z`) - n * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

describe("de indexatietrend over drie vensters", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  async function zetDagstand(
    datum: string,
    metriek: string,
    aantal: number | null,
    label: string,
  ): Promise<void> {
    await alsEigenaar(db, async (c) => {
      await c.query(
        `insert into intel.indexatie_dagstand
           (organisatie_id, datum, metriek, bron, aantal, noemer, label, bewijs)
         values ($1, $2, $3, 'eigen_meting', $4, null, $5, 'toetsfixture')
         on conflict do nothing`,
        [org, datum, metriek, aantal, label],
      );
    });
  }

  before(async () => {
    db = await maakWegwerpdatabase("indextrend");
    org = await maakOrganisatie(db, "trend-org");
  });

  after(async () => {
    await db.opruimen();
  });

  test("met nul dagstanden komen er nog steeds tien metrieken uit", () => {
    /* Altijd tien regels, net als het rapport zelf. Een weggelaten
       metriek leest als 'niet van toepassing' terwijl hij 'nooit
       gemeten' betekent. */
    assert.equal(INDEXATIE_METRIEKEN.length, 10);
  });

  test("zonder enige dagstand is elk venster NIET GEMETEN en geen enkel verschil 0", async () => {
    const r = await vergelijkVensters(db.pool, org, { vandaag: VANDAAG });
    assert.equal(r.dagstandenTotaal, 0);
    assert.equal(r.oudsteDatum, null);
    assert.equal(r.trends.length, 10);
    for (const t of r.trends) {
      assert.equal(t.vensters.length, 3);
      for (const v of t.vensters) {
        assert.equal(v.verschil, null, `${t.metriek}/${v.dagen}d hoort geen verschil te hebben`);
        assert.equal(v.meetpunten, 0);
        assert.match(v.toelichting, /NIET GEMETEN/);
      }
    }
  });

  test("met één dagstand is het nog geen trend, en dat wordt gezegd", async () => {
    await zetDagstand(VANDAAG, "TECHNICALLY_INDEXABLE", 431, "INFERRED");
    const r = await vergelijkVensters(db.pool, org, { vandaag: VANDAAG });
    const t = r.trends.find((x) => x.metriek === "TECHNICALLY_INDEXABLE")!;
    for (const v of t.vensters) {
      assert.equal(v.verschil, null);
      assert.equal(v.meetpunten, 1);
      assert.match(v.toelichting, /Twee meetpunten zijn een trend/);
    }
    /* De waarde van vandaag is er wél, alleen het verschil niet. */
    assert.equal(t.vensters[0]!.totAantal, 431);
  });

  test("met twee dagstanden komt er een echt verschil uit", async () => {
    await zetDagstand(dagenTerug(3), "TECHNICALLY_INDEXABLE", 425, "INFERRED");
    const r = await vergelijkVensters(db.pool, org, { vandaag: VANDAAG });
    const t = r.trends.find((x) => x.metriek === "TECHNICALLY_INDEXABLE")!;
    const zeven = t.vensters.find((v) => v.dagen === 7)!;
    assert.equal(zeven.vanAantal, 425);
    assert.equal(zeven.totAantal, 431);
    assert.equal(zeven.verschil, 6);
    assert.equal(zeven.meetpunten, 2);
  });

  test("elk venster pakt zijn eigen oudste meetpunt", async () => {
    /* Een stand van 40 dagen terug hoort in 90d mee te doen en in 7d en
       28d niet. Zou het venster niet filteren, dan zou 7d opeens een
       verschil over veertig dagen rapporteren. */
    await zetDagstand(dagenTerug(40), "TECHNICALLY_INDEXABLE", 300, "INFERRED");
    const r = await vergelijkVensters(db.pool, org, { vandaag: VANDAAG });
    const t = r.trends.find((x) => x.metriek === "TECHNICALLY_INDEXABLE")!;
    const bij = (d: number) => t.vensters.find((v) => v.dagen === d)!;

    assert.equal(bij(7).vanAantal, 425, "7d hoort de stand van drie dagen terug te pakken");
    assert.equal(bij(7).verschil, 6);
    assert.equal(bij(28).vanAantal, 425, "28d ook, want 40 dagen valt erbuiten");
    assert.equal(bij(90).vanAantal, 300, "90d hoort de stand van veertig dagen terug te pakken");
    assert.equal(bij(90).verschil, 131);
  });

  test("een metriek zonder getal krijgt geen verschil, ook met twee meetpunten", async () => {
    /* GOOGLE_INDEXED is NOT_AVAILABLE zolang er geen Search Console is.
       Twee rijen met aantal null leveren geen 0 op maar ONBEKEND — de
       les uit 0009 toegepast op een verschil. */
    await zetDagstand(dagenTerug(2), "GOOGLE_INDEXED", null, "NOT_AVAILABLE");
    await zetDagstand(VANDAAG, "GOOGLE_INDEXED", null, "NOT_AVAILABLE");
    const r = await vergelijkVensters(db.pool, org, { vandaag: VANDAAG });
    const t = r.trends.find((x) => x.metriek === "GOOGLE_INDEXED")!;
    const zeven = t.vensters.find((v) => v.dagen === 7)!;
    assert.equal(zeven.meetpunten, 2, "er zijn wel twee meetpunten");
    assert.equal(zeven.verschil, null, "maar geen verschil, want geen getallen");
    assert.match(zeven.toelichting, /ONBEKEND/);
    assert.equal(t.label, "NOT_AVAILABLE");
  });

  test("de drie vensters zijn precies 7, 28 en 90", () => {
    /* De opdracht noemt deze drie. Een stil toegevoegd of weggehaald
       venster verandert wat er gerapporteerd wordt zonder dat het
       opvalt. */
    assert.deepEqual([...VERGELIJKVENSTERS], [7, 28, 90]);
  });
});

describe("de segmentatie tussen nieuws, kennis en commercieel", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("segment");
    org = await maakOrganisatie(db, "segment-org");
    await alsEigenaar(db, async (c) => {
      /* Eén pagina per soort, zodat de afbeelding exact na te rekenen
         is. `juridisch` en `overig` horen in geen van de drie
         segmenten; die moeten als restpost verschijnen en niet
         stilletjes bij 'commercieel' belanden. */
      const soorten: [string, string][] = [
        ["/nieuws/een-bericht", "nieuws"],
        ["/kennis/iets", "kennis"],
        ["/oplossing-x", "oplossing"],
        ["/systeem-y", "systeem"],
        ["/sector-z", "sector"],
        ["/project-q", "project"],
        ["/regios/ergens", "regio"],
        ["/", "home"],
        ["/privacy", "juridisch"],
        ["/oude-stub", "overig"],
      ];
      for (const [pad, soort] of soorten) {
        await c.query(
          `insert into intel.pagina_register
             (organisatie_id, pad, canonieke_url, soort,
              bestaat_in_repo, in_sitemap, beheer, eigenaar_release)
           values ($1, $2, $3, $4, true, true, 'handmatig', 'release1')`,
          [org, pad, `https://www.vibeenergy.nl${pad}`, soort],
        );
      }
    });
  });

  after(async () => {
    await db.opruimen();
  });

  test("elk van de drie segmenten wordt geteld, en de restpost ook", async () => {
    const standen = await segmentStanden(db.pool, org);
    const bij = (s: string) => standen.find((x) => x.segment === s)!;

    assert.equal(bij("nieuws").paginas, 1);
    assert.equal(bij("kennis").paginas, 1);
    assert.equal(bij("commercieel").paginas, 6, "oplossing, systeem, sector, project, regio, home");
    assert.equal(bij("buiten_segmentatie").paginas, 2, "juridisch en overig");
  });

  test("de vier bakken tellen op tot het hele register", async () => {
    /* Een segmentatie waarin pagina's verdwijnen is erger dan geen
       segmentatie: de som leest dan als het totaal. */
    const standen = await segmentStanden(db.pool, org);
    assert.equal(standen.reduce((a, b) => a + b.paginas, 0), 10);
  });

  test("juridisch en overig vallen NIET onder commercieel", async () => {
    const standen = await segmentStanden(db.pool, org);
    const commercieel = standen.find((x) => x.segment === "commercieel")!;
    assert.ok(!commercieel.soorten.includes("juridisch"), commercieel.soorten.join(", "));
    assert.ok(!commercieel.soorten.includes("overig"), commercieel.soorten.join(", "));
    assert.equal(SEGMENT_VAN_SOORT["juridisch"], undefined);
    assert.equal(SEGMENT_VAN_SOORT["overig"], undefined);
  });

  test("elke bak noemt zijn eigen soorten, zodat de telling na te rekenen is", async () => {
    const standen = await segmentStanden(db.pool, org);
    assert.deepEqual(standen.find((x) => x.segment === "kennis")!.soorten, ["kennis"]);
    assert.deepEqual(standen.find((x) => x.segment === "buiten_segmentatie")!.soorten, [
      "juridisch",
      "overig",
    ]);
  });
});
