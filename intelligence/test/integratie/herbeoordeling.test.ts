/* ============================================================
   INTEGRATIE — de claimpoort en de historische herbeoordeling
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET.

   R3 verandert wat een bevestigde claim waard is, maar migratie 0042
   raakt de bestaande rijen niet aan. Gemeten in productie op 30 oktober
   2026 stonden daardoor 46 van de 51 bevestigde claims op een waarde die
   onder de nieuwe regels niet klopt.

   Twee mechanismen vangen dat op, en ze zijn niet uitwisselbaar:

     de CLAIMPOORT  weigert elke laag die bewijs weegt zolang de
                    populatie gemengd is — de grendel;
     de HERBEOORDELING herrekent de oordelen en legt elke wijziging vast
                    in het append-only auditlogboek — de opruiming.

   De toetsen hieronder draaien tegen een echte database en dekken:
   de grendel die dichtvalt, de richting die eenzijdig is, de
   idempotentie, de hervatbaarheid, het auditspoor, en het met rust laten
   van een menselijk oordeel.
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
import {
  claimDraagt,
  eisHerbeoordeling,
  herbeoordeelStand,
  waaromNietDragend,
} from "../../src/pijplijn/claimpoort.ts";
import {
  HERBEOORDELING_HANDELING,
  herbeoordeelClaim,
  herbeoordeelClaims,
} from "../../src/pijplijn/herbeoordeling.ts";
import { DOCUMENTSOORT_VERSIE } from "../../src/pijplijn/documentsoort.ts";
import { MODALITEIT_VERSIE } from "../../src/pijplijn/claimmodaliteit.ts";

/* De productietekst van de lobbyclaim die het hele defect zichtbaar
   maakte: bevestigd, bewijs_kwaliteit 5, en in werkelijkheid een verzoek
   aan de Tweede Kamer. */
const LOBBYCLAIM =
  "Schaal daarom de bestaande Flex-E-regeling op naar een Flex-E regeling XL van " +
  "structureel €125 miljoen per jaar (2027-2030).";
const RVOCLAIM =
  "Zij kunnen van 27 oktober tot 26 november 2026 een aanvraag indienen bij de " +
  "Rijksdienst voor Ondernemend Nederland.";

describe("de claimpoort en de herbeoordeling", () => {
  let db: Wegwerpdatabase;
  let org: number;
  let lobbyClaimId: number;
  let rvoClaimId: number;
  let menselijkClaimId: number;

  before(async () => {
    db = await maakWegwerpdatabase("herbeoordeling");
    org = await maakOrganisatie(db, "vibe-energy");

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);

      async function zetKlaar(opzet: {
        bronSleutel: string;
        uitgever: string;
        extern: string;
        titel: string;
        tekst: string;
        claim: string;
        oordeelBron: string | null;
      }): Promise<number> {
        const b = await c.query<{ id: number }>(
          `insert into intel.bronnen
             (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
              robots_status, tdm_status, verificatie_status, verificatie_bewijs,
              betrouwbaarheid, is_primaire_bron)
           values ($1,$2,$3,'rss',$4,$5,true,'toegestaan','geen_voorbehoud','geverifieerd',
                   'fixture',5,true)
           on conflict (organisatie_id, sleutel) do update set uitgever = excluded.uitgever
           returning id`,
          [
            org,
            opzet.bronSleutel,
            opzet.uitgever,
            `https://${opzet.bronSleutel}.test/feed`,
            `https://${opzet.bronSleutel}.test`,
          ],
        );
        const d = await c.query<{ id: number }>(
          `insert into intel.brondocumenten
             (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
              gepubliceerd_op)
           values ($1,$2,$3,$4,$5,$6,'rss','2026-10-01'::date)
           returning id`,
          [
            org,
            b.rows[0]!.id,
            opzet.extern,
            `https://${opzet.bronSleutel}.test/${opzet.extern}`,
            opzet.titel,
            opzet.uitgever,
          ],
        );
        /* GEEN documentsoort: dit is precies de historische stand. De
           herbeoordeling classificeert de versie zelf als die ontbreekt. */
        const v = await c.query<{ id: number }>(
          `insert into intel.brondocument_versies
             (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte)
           values ($1,$2,1,$3,$4,$5,$6)
           returning id`,
          [org, d.rows[0]!.id, `hash-${opzet.extern}`, opzet.titel, opzet.tekst, opzet.tekst.length],
        );
        /* De OUDE stand: bevestigd met bewijs_kwaliteit 5, zonder
           modaliteit en zonder motorversie. */
        const u = await c.query<{ id: number }>(
          `insert into intel.uitspraken
             (organisatie_id, tekst, soort, waarde_numeriek, eenheid, onderwerp,
              verificatie_status, bewijs_kwaliteit, oordeel_bron)
           values ($1,$2,'prijs',125000000,'EUR','subsidie','ongeverifieerd',5,$3)
           returning id`,
          [org, opzet.claim, opzet.oordeelBron],
        );
        await c.query(
          `insert into intel.uitspraak_bronnen (organisatie_id, uitspraak_id, versie_id, rol)
           values ($1,$2,$3,'primair')`,
          [org, u.rows[0]!.id, v.rows[0]!.id],
        );
        await c.query("update intel.uitspraken set verificatie_status = 'bevestigd' where id = $1", [
          u.rows[0]!.id,
        ]);
        return u.rows[0]!.id;
      }

      lobbyClaimId = await zetKlaar({
        bronSleutel: "netbeheer-nederland-nieuws",
        uitgever: "Netbeheer Nederland",
        extern: "lobby",
        titel: "Inbreng voor het eerste debat Netcongestie van de nieuwe Kamer",
        tekst:
          "Netcongestie vraagt om keuzes. " + LOBBYCLAIM + " Het elektriciteitsnet heeft die ruimte nodig.",
        claim: LOBBYCLAIM,
        oordeelBron: null,
      });

      rvoClaimId = await zetKlaar({
        bronSleutel: "rvo-opendata-artikelen",
        uitgever: "RVO",
        extern: "rvo",
        titel: "Aanvraagperiode subsidieregeling bekend",
        tekst:
          "De openstelling is bekend. " + RVOCLAIM + " De regeling richt zich op CO2-reductie.",
        claim: RVOCLAIM,
        oordeelBron: null,
      });

      menselijkClaimId = await zetKlaar({
        bronSleutel: "netbeheer-nederland-nieuws",
        uitgever: "Netbeheer Nederland",
        extern: "menselijk",
        titel: "Inbreng voor het debat Klimaatbeleid gebouwde omgeving",
        tekst: "Wij pleiten voor een verruiming. " + LOBBYCLAIM,
        claim: LOBBYCLAIM,
        oordeelBron: "mens",
      });
    });
  });

  after(async () => {
    await db?.opruimen();
  });

  /* ---------- de pure richtingsregel ---------- */

  test("de herbeoordeling kan een bevestiging alleen INTREKKEN, nooit toekennen", () => {
    /* De oude voorwaarde was `isPrimaireBron && betrouwbaarheid >= 4`;
       de nieuwe is diezelfde voorwaarde PLUS magZelfBevestigen. De
       nieuwe verzameling is dus een deelverzameling van de oude. Deze
       toets dwingt dat af over alle combinaties die kunnen voorkomen. */
    for (const soort of [
      "OFFICIEEL_BESLUIT",
      "OFFICIELE_REGELGEVING",
      "FEITELIJKE_MEDEDELING",
      "ONDERZOEKSRAPPORT",
      "SECTORANALYSE",
      "PERSBERICHT",
      "OPINIE",
      "LOBBYDOCUMENT",
      "SECUNDAIRE_BERICHTGEVING",
      "ONVOLDOENDE_VERIFIEERBAAR",
    ] as const) {
      for (const gezag of [
        "BEVOEGD_GEZAG",
        "NETBEHEERDER",
        "STATISTIEK",
        "BELANGENBEHARTIGER",
        "MARKT",
      ] as const) {
        const r = herbeoordeelClaim({
          oudeStatus: "ongeverifieerd",
          oudeBewijskracht: 3,
          betrouwbaarheid: 5,
          isPrimaireBron: true,
          documentsoort: soort,
          gezag,
          claimTekst: "Het tarief bedraagt 20 procent.",
          brondatum: "2026-10-01",
        });
        assert.notEqual(
          r.nieuweStatus,
          "bevestigd",
          `${soort} x ${gezag} kende een bevestiging TOE aan een ongeverifieerde claim`,
        );
        assert.ok(
          r.nieuweBewijskracht <= 3,
          `${soort} x ${gezag} verhoogde de bewijskracht naar ${r.nieuweBewijskracht}`,
        );
      }
    }
  });

  /* ---------- de grendel ---------- */

  test("de claimpoort staat DICHT zolang er claims op herbeoordeling wachten", async () => {
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(
      stand.openstaand,
      2,
      "de twee motorclaims wachten; de menselijke claim telt niet mee",
    );
    assert.match(stand.motorversies, new RegExp(DOCUMENTSOORT_VERSIE));
    assert.match(stand.motorversies, new RegExp(MODALITEIT_VERSIE));

    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          eisHerbeoordeling(c, org, "de testlaag"),
        ),
      /niet herbeoordeeld|geen bewijs wegen/i,
    );
  });

  test("de foutregel noemt geen terugvaloptie en wijst de herstelhandeling aan", async () => {
    try {
      await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
        eisHerbeoordeling(c, org, "de testlaag"),
      );
      assert.fail("de poort hoorde dicht te staan");
    } catch (e) {
      const bericht = String((e as Error).message);
      assert.match(bericht, /npm run herbeoordeel/);
      assert.match(bericht, /geen terugvaloptie/i);
      assert.match(bericht, /de testlaag/);
    }
  });

  /* ---------- de droge ronde ---------- */

  test("een DROGE ronde rapporteert alles en schrijft niets", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, { droog: true }),
    );
    assert.equal(r.droog, true);
    assert.equal(r.bekeken, 2, "de menselijke claim wordt niet eens geselecteerd");
    assert.equal(r.menselijkOvergeslagen, 1);
    assert.equal(r.herbeoordeeld, 2);
    assert.equal(r.bevestigingIngetrokken, 1, "de lobbyclaim verliest zijn bevestiging");
    assert.equal(r.bevestigingBehouden, 1, "de RVO-claim houdt hem");

    /* En er is niets veranderd. */
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(stand.openstaand, 2, "een droge ronde laat de populatie ongemoeid");
    const audit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: string }>(
        "select count(*)::text as n from intel.audit_gebeurtenissen where handeling = $1",
        [HERBEOORDELING_HANDELING],
      ),
    );
    assert.equal(Number(audit.rows[0]!.n), 0, "een droge ronde schrijft geen auditregel");
  });

  /* ---------- de echte ronde ---------- */

  test("de echte ronde trekt de lobbybevestiging in en houdt de RVO-bevestiging", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, {}),
    );
    assert.equal(r.herbeoordeeld, 2);
    assert.equal(r.bevestigingIngetrokken, 1);
    assert.equal(r.bevestigingBehouden, 1);
    assert.equal(r.menselijkOvergeslagen, 1);

    const rijen = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{
        id: number;
        verificatie_status: string;
        bewijs_kwaliteit: number;
        modaliteit: string | null;
        plafond: number | null;
        oordeel_bron: string | null;
        herbeoordeeld_op: Date | null;
      }>(
        `select id, verificatie_status, bewijs_kwaliteit, modaliteit,
                bewijskracht_plafond as plafond, oordeel_bron, herbeoordeeld_op
           from intel.uitspraken where organisatie_id = $1 order by id`,
        [org],
      ),
    );
    const lobby = rijen.rows.find((x) => x.id === lobbyClaimId)!;
    const rvo = rijen.rows.find((x) => x.id === rvoClaimId)!;
    const mens = rijen.rows.find((x) => x.id === menselijkClaimId)!;

    assert.equal(lobby.verificatie_status, "ongeverifieerd");
    assert.equal(lobby.bewijs_kwaliteit, 1, "een lobbydocument levert bewijskracht 1");
    assert.equal(lobby.modaliteit, "VOORSTEL");
    assert.equal(lobby.plafond, 1);
    assert.equal(lobby.oordeel_bron, "motor");
    assert.ok(lobby.herbeoordeeld_op !== null);

    assert.equal(rvo.verificatie_status, "bevestigd", "RVO is bevoegd gezag");
    assert.ok(rvo.bewijs_kwaliteit >= 4);
    assert.equal(rvo.modaliteit, "VASTGESTELD");

    assert.equal(
      mens.verificatie_status,
      "bevestigd",
      "een menselijk oordeel blijft staan zoals het stond",
    );
    assert.equal(mens.modaliteit, null, "en wordt ook niet van een modaliteit voorzien");
    assert.equal(mens.herbeoordeeld_op, null);
  });

  test("elke wijziging staat in het append-only auditspoor, met voor- en nawaarde", async () => {
    const audit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{
        object_id: string;
        voor_waarde: { verificatie_status?: string; bewijs_kwaliteit?: number };
        na_waarde: { verificatie_status?: string; documentsoort?: string };
        motivatie: string;
        herkomst: string;
        actor_soort: string;
      }>(
        `select object_id, voor_waarde, na_waarde, motivatie, herkomst, actor_soort
           from intel.audit_gebeurtenissen
          where handeling = $1 order by id`,
        [HERBEOORDELING_HANDELING],
      ),
    );
    assert.equal(audit.rows.length, 2, "één regel per herbeoordeelde claim");
    const lobbyRegel = audit.rows.find((r) => r.object_id === String(lobbyClaimId))!;
    assert.equal(lobbyRegel.voor_waarde.verificatie_status, "bevestigd");
    assert.equal(lobbyRegel.voor_waarde.bewijs_kwaliteit, 5);
    assert.equal(lobbyRegel.na_waarde.verificatie_status, "ongeverifieerd");
    assert.equal(lobbyRegel.na_waarde.documentsoort, "LOBBYDOCUMENT");
    assert.match(lobbyRegel.motivatie, /ingetrokken/);
    assert.match(lobbyRegel.herkomst, new RegExp(DOCUMENTSOORT_VERSIE));
    assert.equal(lobbyRegel.actor_soort, "systeem");

    /* EN HET SPOOR IS NIET BIJ TE WERKEN — op twee niveaus, en het
       sterkste bleek het eerste te zijn. De trigger uit 0001 weigert
       elke update met 'append-only'; maar de applicatierol heeft op deze
       tabel in het geheel geen UPDATE-recht, dus Postgres weigert al
       vóór de trigger. Deze toets accepteert beide weigeringen en eist
       alleen dat er GEEN manier is om het spoor te wijzigen. */
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query("update intel.audit_gebeurtenissen set motivatie = 'gewijzigd'"),
        ),
      /append-only|permission denied/i,
    );
  });

  test("de poort staat OPEN na een volledige ronde", async () => {
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(stand.openstaand, 0);
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      eisHerbeoordeling(c, org, "de testlaag"),
    );
  });

  test("een tweede en derde ronde vinden niets meer — idempotent", async () => {
    const tweede = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, {}),
    );
    assert.equal(tweede.bekeken, 0, "een tweede ronde selecteert niets meer");
    assert.equal(tweede.herbeoordeeld, 0);
    assert.equal(
      tweede.menselijkOvergeslagen,
      1,
      "het aantal menselijke oordelen is een feit over de populatie en blijft staan",
    );
    const derde = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, {}),
    );
    assert.equal(derde.bekeken, 0);

    const audit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: string }>(
        "select count(*)::text as n from intel.audit_gebeurtenissen where handeling = $1",
        [HERBEOORDELING_HANDELING],
      ),
    );
    assert.equal(
      Number(audit.rows[0]!.n),
      2,
      "een tweede ronde hoort geen tweede auditregel op te leveren",
    );
  });

  test("een ronde met max 1 is HERVATBAAR en laat de poort tot die tijd dicht", async () => {
    /* Terugzetten naar de historische stand om de hervatting te meten. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `update intel.uitspraken
            set modaliteit_versie = null, herbeoordeeld_op = null
          where organisatie_id = $1 and coalesce(oordeel_bron,'motor') <> 'mens'`,
        [org],
      );
    });

    const eerste = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, { max: 1 }),
    );
    assert.equal(eerste.herbeoordeeld, 1, "één claim per portie");

    const halverwege = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(halverwege.openstaand, 1, "er staat nog één claim open");
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          eisHerbeoordeling(c, org, "de testlaag"),
        ),
      /niet herbeoordeeld/i,
      "halverwege hoort de poort DICHT te staan en niet terug te vallen op de oude waarde",
    );

    const tweede = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, { max: 1 }),
    );
    assert.equal(tweede.herbeoordeeld, 1);
    const na = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(na.openstaand, 0);
  });

  /* ---------- claimDraagt ---------- */

  test("claimDraagt eist bevestiging, modaliteit EN documentsoort", () => {
    const basis = {
      verificatieStatus: "bevestigd",
      modaliteit: "VASTGESTELD",
      modaliteitZekerheid: 0.8,
      documentsoort: "OFFICIEEL_BESLUIT",
    };
    assert.equal(claimDraagt(basis), true);
    assert.equal(claimDraagt({ ...basis, verificatieStatus: "ongeverifieerd" }), false);
    assert.equal(claimDraagt({ ...basis, modaliteit: "VOORSTEL" }), false);
    assert.equal(claimDraagt({ ...basis, modaliteitZekerheid: 0.35 }), false);
    assert.equal(claimDraagt({ ...basis, modaliteit: null }), false);
    assert.equal(
      claimDraagt({ ...basis, documentsoort: "SECUNDAIRE_BERICHTGEVING" }),
      false,
      "een navertelling draagt niet, ook met een vaststellende zin",
    );
    assert.equal(
      claimDraagt({ ...basis, documentsoort: null }),
      false,
      "een ongeclassificeerd document is niet aantoonbaar dragend",
    );
  });

  test("waaromNietDragend noemt de bindende reden, en null als hij wel draagt", () => {
    assert.equal(
      waaromNietDragend({
        verificatieStatus: "bevestigd",
        modaliteit: "VASTGESTELD",
        modaliteitZekerheid: 0.8,
        documentsoort: "OFFICIEEL_BESLUIT",
      }),
      null,
    );
    assert.match(
      waaromNietDragend({
        verificatieStatus: "bevestigd",
        modaliteit: "VOORSTEL",
        modaliteitZekerheid: 0.75,
        documentsoort: "OFFICIEEL_BESLUIT",
      }) ?? "",
      /voorstel en geen vaststelling/,
    );
    assert.match(
      waaromNietDragend({
        verificatieStatus: "bevestigd",
        modaliteit: "VASTGESTELD",
        modaliteitZekerheid: 0.8,
        documentsoort: "LOBBYDOCUMENT",
      }) ?? "",
      /stelt zelf niets vast/,
    );
  });
});
