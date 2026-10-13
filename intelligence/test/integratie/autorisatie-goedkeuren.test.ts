/* ============================================================
   TEST — wie mag een redactionele paginarevisie goedkeuren
   ------------------------------------------------------------
   HET GEMETEN DEFECT (13 oktober 2026).

   De goedkeurroute hing aan het recht `distributie.concept`
   (dashboard/server.ts:624). De rechtenmatrix in 0001 geeft dat recht
   ÓÓK aan de rol `analist`, die géén `inhoud.goedkeuren` heeft:

     beheerder  inhoud.goedkeuren + inhoud.hoogrisico.goedkeuren + distributie.concept
     redacteur  inhoud.goedkeuren                                + distributie.concept
     analist                                                       distributie.concept
     sales      —
     lezer      —

   Een analist kon dus redactionele revisies goedkeuren. Bovendien stond
   de controle ALLEEN op de HTTP-route: elke andere aanroeper van
   beoordeel() had geen enkele rechtencontrole.

   Sinds 3.0.4 toetst beoordeel() het recht zelf tegen
   intel.rol_rechten, en verzwaart hij naar
   `inhoud.hoogrisico.goedkeuren` als de gebeurtenis risicoklasse hoog
   draagt. Deze toetsen gaan daarom door beoordeel() heen en niet door
   express: ze bewijzen de grendel, niet de knop.
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
import { beoordeel, RECHT_BEOORDELEN, RECHT_HOOGRISICO } from "../../src/inhoud/beoordeling.ts";
import { inhoudsHashVan } from "../../src/inhoud/voorstel.ts";

const PAD = "/kennis/fixture-autorisatie-niet-live";
/* Een vaste, verzonnen websiteversie: beoordeel() eist een sha256 en legt
   hem vast, zodat publicatiePrecheck later twee onafhankelijke waarden
   vergelijkt. Zie migratie 0033. */
const WEBSITE_VERSIE = "f".repeat(64);

describe("autorisatie op het redactionele besluit", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let beheerder = 0;
  let redacteur = 0;
  let analist = 0;
  let lezer = 0;

  /** voorstel-id per risicoklasse van de onderliggende gebeurtenis. */
  const voorstel: Record<"laag" | "hoog", { id: string; hash: string }> = {
    laag: { id: "", hash: "" },
    hoog: { id: "", hash: "" },
  };

  before(async () => {
    db = await maakWegwerpdatabase("autorisatie");
    org = await maakOrganisatie(db, "vibe-energy");
    beheerder = await maakGebruiker(db, org, "beheer@vibeenergy.nl", "beheerder");
    redacteur = await maakGebruiker(db, org, "redactie@vibeenergy.nl", "redacteur");
    analist = await maakGebruiker(db, org, "analyse@vibeenergy.nl", "analist");
    lezer = await maakGebruiker(db, org, "kijk@vibeenergy.nl", "lezer");

    for (const risico of ["laag", "hoog"] as const) {
      const tekst =
        `Volgens de fixture-uitgever bedraagt het fixturebedrag in 2026 ` +
        `EUR ${risico === "hoog" ? 9 : 1} miljoen. Testmateriaal.`;
      const hash = inhoudsHashVan({
        doelPad: PAD,
        doelSectie: "Wat dit kost",
        wijzigingSoort: "alinea_toevoegen",
        nieuweTekst: tekst,
        feiten: ["fixturefeit"],
        links: [],
        ctaTekst: "Laat uw fixture doorrekenen",
        ctaDoel: "/contact",
      });

      const id = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
        const g = await c.query<{ id: string }>(
          `insert into intel.markt_gebeurtenissen
             (organisatie_id, sleutel, titel, gebeurtenis_soort, risico_klasse)
           values ($1, $2, 'Fixture voor autorisatie', 'overig', $3)
           returning id::text`,
          [org, `fixture-autorisatie-${risico}`, risico],
        );
        const k = await c.query<{ id: string }>(
          `insert into intel.inhoud_kandidaten
             (organisatie_id, gebeurtenis_id, besluit, motor_versie)
           values ($1, $2::bigint, 'UPDATE_EXISTING', 'fixture-autorisatie')
           returning id::text`,
          [org, g.rows[0]!.id],
        );
        const v = await c.query<{ id: string }>(
          `insert into intel.inhoud_voorstellen
             (organisatie_id, kandidaat_id, gebeurtenis_id, doel_pad, wijziging_soort,
              doel_sectie, nieuwe_tekst, huidige_tekst, cta_tekst, cta_doel, cta_grondslag,
              eindoordeel, oordeel_reden, inhouds_hash, publicatie_status)
           values ($1, $2::bigint, $3::bigint, $4, 'alinea_toevoegen', 'Wat dit kost', $5,
                   'De bestaande fixturetekst.', 'Laat uw fixture doorrekenen', '/contact',
                   'fixture', 'KLAAR_VOOR_REVIEW',
                   'fixture voor de autorisatietoets: risicoklasse ${risico}',
                   $6, 'READY_FOR_REVIEW')
           returning id::text`,
          [org, k.rows[0]!.id, g.rows[0]!.id, PAD, tekst, hash],
        );
        return v.rows[0]!.id;
      });
      voorstel[risico] = { id, hash };
    }
  });

  after(async () => {
    await db.opruimen();
  });

  const keur = (gebruikerId: number, risico: "laag" | "hoog") =>
    metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      beoordeel(c, org, {
        voorstelId: voorstel[risico].id,
        besluit: "goedgekeurd",
        gebruikerId,
        notitie: "fixture",
        verwachteHash: voorstel[risico].hash,
        websiteVersie: WEBSITE_VERSIE,
      }),
    );

  test("1. de rechtenmatrix is nog steeds de reden dat dit defect bestond", async () => {
    const rollen = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ rol: string; rechten: string[] }>(
        `select gr.rol, array_agg(rr.recht order by rr.recht) as rechten
           from intel.gebruiker_rollen gr
           join intel.rol_rechten rr on rr.rol = gr.rol
          where gr.gebruiker_id = any($1::bigint[])
          group by gr.rol`,
        [[beheerder, redacteur, analist, lezer]],
      );
      return new Map(r.rows.map((x) => [x.rol, x.rechten]));
    });

    assert.ok(
      rollen.get("analist")?.includes("distributie.concept"),
      "zonder dit recht bij analist was er geen defect",
    );
    assert.ok(
      !rollen.get("analist")?.includes(RECHT_BEOORDELEN),
      "analist hoort geen inhoud.goedkeuren te hebben",
    );
    assert.ok(rollen.get("redacteur")?.includes(RECHT_BEOORDELEN));
    assert.ok(
      !rollen.get("redacteur")?.includes(RECHT_HOOGRISICO),
      "hoog risico zit met opzet alleen bij beheerder",
    );
    assert.ok(rollen.get("beheerder")?.includes(RECHT_HOOGRISICO));
  });

  test("2. een ANALIST mag niet goedkeuren, ook niet via een directe aanroep", async () => {
    await assert.rejects(() => keur(analist, "laag"), /inhoud\.goedkeuren ontbreekt/i);
  });

  test("3. een LEZER mag niet goedkeuren", async () => {
    await assert.rejects(() => keur(lezer, "laag"), /inhoud\.goedkeuren ontbreekt/i);
  });

  test("4. een REDACTEUR mag een voorstel met laag risico goedkeuren", async () => {
    const u = await keur(redacteur, "laag");
    assert.equal(u.statusNa, "APPROVED");
    assert.equal(u.gebondenHash, voorstel.laag.hash);
  });

  test("5. een REDACTEUR mag HOOG risico NIET goedkeuren", async () => {
    await assert.rejects(() => keur(redacteur, "hoog"), /hoogrisico\.goedkeuren/i);
  });

  test("6. een BEHEERDER mag hoog risico wel goedkeuren", async () => {
    const u = await keur(beheerder, "hoog");
    assert.equal(u.statusNa, "APPROVED");
  });

  test("7. de weigering laat geen spoor van goedkeuring achter", async () => {
    /* Een geweigerde poging mag niets aan de rij veranderen; anders zou
       een ongeautoriseerde poging alsnog de staat kunnen bewegen. */
    const rij = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ publicatie_status: string; beoordeeld_door: number | null }>(
        `select publicatie_status, beoordeeld_door
           from intel.inhoud_voorstellen where id = $1::bigint`,
        [voorstel.hoog.id],
      );
      return r.rows[0]!;
    });
    /* Toets 6 heeft hem inmiddels goedgekeurd door de BEHEERDER; de
       mislukte poging van de redacteur mag daar niet in staan. */
    assert.equal(rij.publicatie_status, "APPROVED");
    assert.equal(rij.beoordeeld_door, beheerder, "de redacteur mag niet als beoordelaar staan");
  });
});
