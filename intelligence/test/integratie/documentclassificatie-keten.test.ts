/* ============================================================
   INTEGRATIE — de keten bron -> document -> claim met R3 erin
   ------------------------------------------------------------
   WAT HIER WORDT NAGESPEELD. Het gemeten defect liep over drie lagen:
   `intel.bronnen` droeg betrouwbaarheid 5 en is_primaire_bron true,
   `clusteren.ts` gaf die twee waarden door, en `uitspraken.ts` maakte er
   bewijs_kwaliteit 5 plus verificatie_status 'bevestigd' van. Geen van
   die lagen deed iets fout; de fout zat in wat ze samen opleverden. Een
   eenheidstoets op één laag kan dat niet zien.

   Daarom draait deze toets de ECHTE `clusterNieuweVersies()` tegen een
   ECHTE database, met drie documenten van dezelfde uitgever:

     1 een lobbydocument    — moet niets bevestigen
     2 een eigen mededeling — mag meer, maar niet bevestigen
     3 een RVO-bekendmaking — mag wel bevestigen

   De teksten zijn productietekst, op lengte gebracht. De lobbyclaim is
   de rij die het defect zichtbaar maakte.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import {
  alsEigenaar,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { clusterNieuweVersies } from "../../src/pijplijn/clusteren.ts";

/* Lang genoeg voor de ondergrens van 40 tekens, en met genoeg
   onderwerpwoorden dat de clusterlaag het oppakt. */
/* DE GETALVORM IS PRODUCTIEVORM, en dat moest ook.
   Eerste versie van deze fixture schreef '125 miljoen euro per jaar'.
   `extraheerUitspraken()` herkent het schaalwoord ACHTER de eenheid
   ('€125 miljoen'), niet ervoor, dus die zin leverde nul claims op en
   de toets kon niets meten. De productierij staat er nu letterlijk. */
const LOBBY_TEKST =
  "Netcongestie vraagt om keuzes. Schaal daarom de bestaande Flex-E-regeling op naar " +
  "een Flex-E regeling XL van structureel €125 miljoen per jaar (2027-2030). " +
  "Het elektriciteitsnet en de netbeheerders hebben die ruimte nodig.";

const EIGEN_TEKST =
  "Eind 2025 waren er 238 contracten actief voor invoeding (849 MW) op het " +
  "elektriciteitsnet, die 757 keer zijn afgeroepen. Netcongestie blijft daarmee " +
  "een factor voor netbeheerders.";

const RVO_TEKST =
  "Ondernemers kunnen van 27 oktober tot 26 november 2026 een aanvraag indienen bij de " +
  "Rijksdienst voor Ondernemend Nederland. De subsidieregeling geldt voor netcongestie " +
  "en opslag van elektriciteit op het elektriciteitsnet.";

type Doc = {
  readonly bronSleutel: string;
  readonly uitgever: string;
  readonly betrouwbaarheid: number;
  readonly titel: string;
  readonly tekst: string;
  readonly extern: string;
};

const DOCUMENTEN: readonly Doc[] = [
  {
    bronSleutel: "netbeheer-nederland-nieuws",
    uitgever: "Netbeheer Nederland",
    betrouwbaarheid: 5,
    titel: "Inbreng voor het eerste debat Netcongestie van de nieuwe Kamer",
    tekst: LOBBY_TEKST,
    extern: "r3-lobby",
  },
  {
    bronSleutel: "netbeheer-nederland-nieuws",
    uitgever: "Netbeheer Nederland",
    betrouwbaarheid: 5,
    titel: "Bouw versnelt opnieuw, maar de vraag loopt nog steeds op",
    tekst: EIGEN_TEKST,
    extern: "r3-eigen",
  },
  {
    bronSleutel: "rvo-opendata-artikelen",
    uitgever: "RVO",
    betrouwbaarheid: 5,
    titel: "Aanvraagperiode subsidieregeling bekend",
    tekst: RVO_TEKST,
    extern: "r3-rvo",
  },
];

describe("de documentclassificatie in de keten", () => {
  let db: Wegwerpdatabase;
  let org: number;

  before(async () => {
    db = await maakWegwerpdatabase("r3-keten");
    org = await maakOrganisatie(db, "vibe-energy");

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);

      const bronIds = new Map<string, number>();
      for (const sleutel of new Set(DOCUMENTEN.map((d) => d.bronSleutel))) {
        const d = DOCUMENTEN.find((x) => x.bronSleutel === sleutel)!;
        const b = await c.query<{ id: number }>(
          `insert into intel.bronnen
             (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
              robots_status, tdm_status, verificatie_status, verificatie_bewijs,
              betrouwbaarheid, is_primaire_bron, levert_gebeurtenissen)
           values ($1,$2,$3,'rss','https://voorbeeld.test/feed','https://voorbeeld.test',
                   true,'toegestaan','geen_voorbehoud','geverifieerd','fixture',$4,true,true)
           returning id`,
          [org, sleutel, d.uitgever, d.betrouwbaarheid],
        );
        bronIds.set(sleutel, b.rows[0]!.id);
      }

      for (const d of DOCUMENTEN) {
        const doc = await c.query<{ id: number }>(
          `insert into intel.brondocumenten
             (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
              gepubliceerd_op)
           values ($1,$2,$3,$4,$5,$6,'rss', now())
           returning id`,
          [
            org,
            bronIds.get(d.bronSleutel),
            d.extern,
            `https://voorbeeld.test/${d.extern}`,
            d.titel,
            d.uitgever,
          ],
        );
        const v = await c.query<{ id: number }>(
          `insert into intel.brondocument_versies
             (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte)
           values ($1,$2,1,$3,$4,$5,$6)
           returning id`,
          [org, doc.rows[0]!.id, `hash-${d.extern}`, d.titel, d.tekst, d.tekst.length],
        );
        await c.query("update intel.brondocumenten set huidige_versie_id = $2 where id = $1", [
          doc.rows[0]!.id,
          v.rows[0]!.id,
        ]);
      }
    });

    /* De echte clusterronde: hij classificeert, schrijft de soort op de
       versie en geeft soort plus gezag door aan de claimlaag. */
    await clusterNieuweVersies(db.pool, org, {});
  });

  after(async () => {
    await db?.opruimen();
  });

  async function versieVan(extern: string) {
    return metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{
        documentsoort: string | null;
        documentsoort_gezag: string | null;
        documentsoort_versie: string | null;
        beschrijft_besluit_van: string | null;
        grondslag: unknown;
      }>(
        `select v.documentsoort, v.documentsoort_gezag, v.documentsoort_versie,
                v.beschrijft_besluit_van, v.documentsoort_grondslag as grondslag
           from intel.brondocument_versies v
           join intel.brondocumenten d on d.id = v.brondocument_id
          where d.extern_id = $1`,
        [extern],
      ),
    );
  }

  async function claimsVan(extern: string) {
    return metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{
        tekst: string;
        verificatie_status: string;
        bewijs_kwaliteit: number;
        modaliteit: string | null;
        modaliteit_zekerheid: string | null;
        bewijskracht_plafond: number | null;
      }>(
        `select u.tekst, u.verificatie_status, u.bewijs_kwaliteit, u.modaliteit,
                u.modaliteit_zekerheid, u.bewijskracht_plafond
           from intel.uitspraken u
           join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
           join intel.brondocument_versies v on v.id = ub.versie_id
           join intel.brondocumenten d on d.id = v.brondocument_id
          where d.extern_id = $1
          order by u.id`,
        [extern],
      ),
    );
  }

  test("de clusterronde schrijft de documentsoort op elke versie", async () => {
    for (const d of DOCUMENTEN) {
      const r = await versieVan(d.extern);
      assert.equal(r.rows.length, 1, d.extern);
      const v = r.rows[0]!;
      assert.ok(v.documentsoort, `${d.extern} heeft geen documentsoort`);
      assert.ok(v.documentsoort_gezag, `${d.extern} heeft geen gezag`);
      assert.ok(v.documentsoort_versie, `${d.extern} heeft geen motorversie`);
      assert.ok(
        typeof v.grondslag === "object" && v.grondslag !== null,
        `${d.extern} heeft geen grondslag`,
      );
    }
  });

  test("het lobbydocument wordt LOBBYDOCUMENT bij een BELANGENBEHARTIGER", async () => {
    const v = (await versieVan("r3-lobby")).rows[0]!;
    assert.equal(v.documentsoort, "LOBBYDOCUMENT");
    assert.equal(v.documentsoort_gezag, "BELANGENBEHARTIGER");
  });

  test("DE KERN — de lobbyclaim is niet bevestigd en heeft bewijskracht 1", async () => {
    /* Hiervoor: verificatie_status 'bevestigd', bewijs_kwaliteit 5. */
    const claims = await claimsVan("r3-lobby");
    assert.ok(claims.rows.length > 0, "er hoort minstens één claim uit dit document te komen");
    for (const c of claims.rows) {
      assert.notEqual(
        c.verificatie_status,
        "bevestigd",
        `een lobbydocument bevestigde: "${c.tekst.slice(0, 70)}"`,
      );
      assert.equal(
        c.bewijs_kwaliteit,
        1,
        `bewijskracht ${c.bewijs_kwaliteit} op "${c.tekst.slice(0, 60)}"`,
      );
      assert.equal(c.bewijskracht_plafond, 1, "het plafond hoort vastgelegd te zijn");
    }
  });

  test("de Flex-E-claim staat als VOORSTEL in de database", async () => {
    const claims = await claimsVan("r3-lobby");
    const flex = claims.rows.find((c) => c.tekst.includes("Flex-E"));
    assert.ok(flex, `geen Flex-E-claim gevonden; wel: ${claims.rows.map((c) => c.tekst.slice(0, 40)).join(" | ")}`);
    assert.equal(flex.modaliteit, "VOORSTEL");
    assert.ok(
      Number(flex.modaliteit_zekerheid) >= 0.5,
      `zekerheid ${flex.modaliteit_zekerheid} hoort hoog te zijn: de zin is onmiskenbaar een verzoek`,
    );
  });

  test("de eigen mededeling mag meer dan een lobbydocument, maar bevestigt niet", async () => {
    const v = (await versieVan("r3-eigen")).rows[0]!;
    assert.equal(v.documentsoort_gezag, "BELANGENBEHARTIGER");
    const claims = await claimsVan("r3-eigen");
    for (const c of claims.rows) {
      assert.notEqual(
        c.verificatie_status,
        "bevestigd",
        "een branchevereniging bevestigt niets op eigen kracht",
      );
      assert.ok(
        c.bewijs_kwaliteit <= 3,
        `bewijskracht ${c.bewijs_kwaliteit} is te hoog voor een belangenbehartiger`,
      );
    }
  });

  test("een bevoegd gezag met een feitelijke bekendmaking bevestigt WEL", async () => {
    /* De tegenproef. Zonder deze toets zou een reparatie die alles
       weigert er net zo goed uitzien als een die onderscheid maakt. */
    const v = (await versieVan("r3-rvo")).rows[0]!;
    assert.equal(v.documentsoort_gezag, "BEVOEGD_GEZAG");
    const claims = await claimsVan("r3-rvo");
    assert.ok(claims.rows.length > 0, "de RVO-bekendmaking hoort claims op te leveren");
    assert.ok(
      claims.rows.some((c) => c.verificatie_status === "bevestigd"),
      `geen enkele RVO-claim is bevestigd: ${claims.rows.map((c) => c.verificatie_status).join(",")}`,
    );
    assert.ok(
      claims.rows.some((c) => c.bewijs_kwaliteit >= 4),
      "een bekendmaking van een bevoegd gezag hoort bewijskracht 4 of 5 te halen",
    );
  });

  test("een bron buiten het coderegister kan geen claim bevestigen", async () => {
    /* De eigenschap die in R3 aan het licht kwam toen een bestaande
       adversariële toets omviel: een bron die in de database staat maar
       niet in bronnen/register.ts heeft GEEN vastgestelde bevoegdheid,
       en valt daarom naar het laagste gezag. "Ik weet de bevoegdheid
       niet" mag geen "bevoegd" worden. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const b = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            betrouwbaarheid, is_primaire_bron, levert_gebeurtenissen)
         values ($1,'bron-buiten-het-register','Onbekende Uitgever','rss',
                 'https://onbekend.test/feed','https://onbekend.test',true,'toegestaan',
                 'geen_voorbehoud','geverifieerd','fixture',5,true,true)
         returning id`,
        [org],
      );
      const doc = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort, gepubliceerd_op)
         values ($1,$2,'r3-onbekend','https://onbekend.test/1',
                 'De minister heeft besloten dat de regeling wordt vastgesteld','Onbekende Uitgever','rss', now())
         returning id`,
        [org, b.rows[0]!.id],
      );
      const tekst =
        "De minister heeft besloten dat de subsidieregeling wordt vastgesteld en in " +
        "werking treedt per 1 januari 2027 voor netcongestie op het elektriciteitsnet.";
      const v = await c.query<{ id: number }>(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte)
         values ($1,$2,1,'hash-r3-onbekend','De minister heeft besloten',$3,$4)
         returning id`,
        [org, doc.rows[0]!.id, tekst, tekst.length],
      );
      await c.query("update intel.brondocumenten set huidige_versie_id = $2 where id = $1", [
        doc.rows[0]!.id,
        v.rows[0]!.id,
      ]);
    });

    await clusterNieuweVersies(db.pool, org, {});

    const v = (await versieVan("r3-onbekend")).rows[0]!;
    assert.equal(
      v.documentsoort_gezag,
      "MARKT",
      "een onbekende bronsleutel hoort naar het LAAGSTE gezag te vallen",
    );
    const claims = await claimsVan("r3-onbekend");
    for (const c of claims.rows) {
      assert.notEqual(c.verificatie_status, "bevestigd");
      assert.ok(c.bewijs_kwaliteit <= 2, `bewijskracht ${c.bewijs_kwaliteit} is te hoog`);
    }
  });
});
