/* ============================================================
   TEST — READY_FOR_REVIEW betekent vijf keer PASS
   ------------------------------------------------------------
   HET GEMETEN DEFECT (13 oktober 2026, op 078785a).

   weegAf gaf KLAAR_VOOR_REVIEW óók wanneer de controle
   `verwoordbaarheid` had GEFAALD, zolang er een interne-linkkans was.
   Zo'n voorstel is geen feitelijke paginarevisie — het feit is juist
   niet te verwoorden — maar het belandde in dezelfde staat als een
   gecontroleerde revisie, onder een studiokop die beloofde dat alle
   vijf de controles waren gehaald.

   Gemeten op de echte database: van de twee rijen op READY_FOR_REVIEW
   was er één een echte feitelijke revisie (voorstel 11, kandidaat 20)
   en één een linkvoorstel waarvan de eigen reden zei "het feit zelf is
   niet te verwoorden" (voorstel 10, kandidaat 19).

   Sinds 0032 heeft een linkvoorstel zijn eigen gereedheidsklasse.
   Deze toetsen leggen drie dingen vast:

     1 de INVARIANT: geen rij op READY_FOR_REVIEW met een FAIL
     2 een linkvoorstel landt in READY_FOR_LINK_REVIEW
     3 die nieuwe staat is GEEN doodlopende weg — hij is goed te keuren

   Punt 3 is niet academisch: de constraint voorstel_alleen_review_
   goedkeuren uit 0021 eiste `eindoordeel = 'KLAAR_VOOR_REVIEW'`, dus
   zonder de verruiming in 0032 zou niemand een linkvoorstel ooit
   kunnen goedkeuren.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import {
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { beoordeel } from "../../src/inhoud/beoordeling.ts";
import { inhoudsHashVan } from "../../src/inhoud/voorstel.ts";

const PAD = "/kennis/fixture-poort-niet-live";

describe("de poort van vijf controles", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let beheerder = 0;
  let linkVoorstel = { id: "", hash: "" };

  before(async () => {
    db = await maakWegwerpdatabase("poortvijf");
    org = await maakOrganisatie(db, "vibe-energy");
    beheerder = await maakGebruiker(db, org, "beheer@vibeenergy.nl", "beheerder");

    const tekst =
      "Verwijs vanuit deze sectie naar /kennis/fixture-ander; die pagina behandelt " +
      "hetzelfde onderwerp en wordt hier nog niet genoemd.";
    const hash = inhoudsHashVan({
      doelPad: PAD,
      doelSectie: "Wat dit kost",
      wijzigingSoort: "interne_link",
      nieuweTekst: tekst,
      feiten: ["fixturefeit"],
      links: ["kennis/fixture-ander"],
      ctaTekst: "Laat uw fixture doorrekenen",
      ctaDoel: "/contact",
    });

    const id = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const g = await c.query<{ id: string }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, gebeurtenis_soort, risico_klasse)
         values ($1, 'fixture-poort', 'Fixture voor de poort', 'overig', 'laag')
         returning id::text`,
        [org],
      );
      const k = await c.query<{ id: string }>(
        `insert into intel.inhoud_kandidaten
           (organisatie_id, gebeurtenis_id, besluit, motor_versie)
         values ($1, $2::bigint, 'UPDATE_EXISTING', 'fixture-poort')
         returning id::text`,
        [org, g.rows[0]!.id],
      );
      const v = await c.query<{ id: string }>(
        `insert into intel.inhoud_voorstellen
           (organisatie_id, kandidaat_id, gebeurtenis_id, doel_pad, wijziging_soort,
            doel_sectie, nieuwe_tekst, huidige_tekst, cta_tekst, cta_doel, cta_grondslag,
            eindoordeel, oordeel_reden, inhouds_hash, publicatie_status)
         values ($1, $2::bigint, $3::bigint, $4, 'interne_link', 'Wat dit kost', $5,
                 'De bestaande fixturetekst.', 'Laat uw fixture doorrekenen', '/contact',
                 'fixture', 'KLAAR_VOOR_LINKREVIEW',
                 'fixture: het feit is niet te verwoorden, de linkaanbeveling wel',
                 $6, 'READY_FOR_LINK_REVIEW')
         returning id::text`,
        [org, k.rows[0]!.id, g.rows[0]!.id, PAD, tekst, hash],
      );
      /* De gefaalde controle hoort erbij: zonder die rij is dit geen
         representatief linkvoorstel. */
      await c.query(
        `insert into intel.inhoud_voorstel_controles
           (voorstel_id, organisatie_id, naam, oordeel, reden, bewijs)
         values ($1::bigint, $2, 'verwoordbaarheid', 'FAIL',
                 'een bedrag zonder benoemde grootheid is geen bewering', '{}')`,
        [v.rows[0]!.id, org],
      );
      return v.rows[0]!.id;
    });
    linkVoorstel = { id, hash };
  });

  after(async () => {
    await db.opruimen();
  });

  test("1. de nieuwe staat en het nieuwe eindoordeel zijn toegestaan door de database", async () => {
    const rij = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ publicatie_status: string; eindoordeel: string }>(
        `select publicatie_status, eindoordeel from intel.inhoud_voorstellen
          where id = $1::bigint`,
        [linkVoorstel.id],
      );
      return r.rows[0]!;
    });
    assert.equal(rij.publicatie_status, "READY_FOR_LINK_REVIEW");
    assert.equal(rij.eindoordeel, "KLAAR_VOOR_LINKREVIEW");
  });

  test("2. INVARIANT: geen enkele rij op READY_FOR_REVIEW heeft een gefaalde controle", async () => {
    /* Dit is de meting die het defect van 3.0.3 zou hebben gevonden.
       READY_FOR_REVIEW belooft vijf PASS; een opgeslagen FAIL in
       diezelfde rij is een tegenspraak. */
    const n = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ n: string }>(
        `select count(distinct v.id)::text as n
           from intel.inhoud_voorstellen v
           join intel.inhoud_voorstel_controles ct
             on ct.voorstel_id = v.id and ct.organisatie_id = v.organisatie_id
          where v.organisatie_id = $1
            and v.publicatie_status = 'READY_FOR_REVIEW'
            and ct.oordeel = 'FAIL'`,
        [org],
      );
      return Number(r.rows[0]!.n);
    });
    assert.equal(n, 0, "een voorstel met een gefaalde controle hoort niet READY_FOR_REVIEW te heten");
  });

  test("3. een linkvoorstel is GEEN doodlopende weg: het is goed te keuren", async () => {
    /* Zonder de verruiming van voorstel_alleen_review_goedkeuren in 0032
       zou deze goedkeuring op de constraint van 0021 breken, en was de
       nieuwe staat een val in plaats van een verbetering. */
    const u = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      beoordeel(c, org, {
        voorstelId: linkVoorstel.id,
        besluit: "goedgekeurd",
        gebruikerId: beheerder,
        notitie: "fixture: linkaanbeveling overgenomen",
        verwachteHash: linkVoorstel.hash,
      }),
    );
    assert.equal(u.statusNa, "APPROVED");
    assert.equal(u.gebondenHash, linkVoorstel.hash);
  });

  test("4. en de goedkeuring staat in het auditspoor met de juiste beginstaat", async () => {
    const { beoordelingsgeschiedenis } = await import("../../src/inhoud/beoordeling.ts");
    const g = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      beoordelingsgeschiedenis(c, org, linkVoorstel.id),
    );
    const goedkeuring = g.find((x) => x.besluit === "goedgekeurd");
    assert.ok(goedkeuring, "de goedkeuring hoort bewaard te zijn");
    assert.equal(
      goedkeuring.status_voor,
      "READY_FOR_LINK_REVIEW",
      "het spoor hoort te laten zien dat dit een LINKvoorstel was",
    );
    assert.equal(goedkeuring.status_na, "APPROVED");
  });
});
