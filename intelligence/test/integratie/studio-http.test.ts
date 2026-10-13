/* ============================================================
   TEST — de Content Studio over HTTP, zoals een browser hem raakt
   ------------------------------------------------------------
   HET GAT DAT DIT VULT.

   Na Release 3.0.4 was de HTTP-laag van het dashboard volledig ongetest
   in de poort: `npm run poort` draait test/eenheid, test/integratie en
   test/adversarieel, en geen van die bestanden startte maakApp. Alle
   autorisatietoetsen gingen direct door beoordeel(). Daarmee was bewezen
   dat de GRENDEL werkt, maar niet dat de ROUTE hem aanroept, niet dat de
   middleware in de juiste orde staat, en niet dat de weergave het eens
   is met de backend.

   Die laatste twee bleken ook echt mis te zijn, gevonden door deze suite
   te schrijven:

     1 De studio rendeerde GEEN goedkeurformulier voor een voorstel met
       eindoordeel KLAAR_VOOR_LINKREVIEW, terwijl beoordeel() dat besluit
       sinds 3.0.4 toestaat en migratie 0032 de databasegrendel er
       expliciet voor verruimde. Een besluit dat volgens de regels mag,
       maar waarvoor geen knop bestond.
     2 Een autorisatieweigering uit beoordeel() viel in de 500-tak: de
       gebruiker kreeg "De beoordeling kon niet worden vastgelegd" in
       plaats van 403 met de reden.

   WAT HIER NIET WORDT GETOETST, EN WAAROM.
   Publiceren loopt niet over HTTP: er is geen publicatieroute en het
   recht inhoud.publiceren komt in geen enkele vereistRecht voor. Een
   "ongeautoriseerde publicatiepoging" is over HTTP dus alleen te
   bewijzen als AFWEZIGHEID — en dat doet toets 11.

   De app praat met een eigen wegwerpdatabase op een efemere poort. Er
   wordt niets aan productie aangeraakt en niets gepubliceerd.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import type { Server } from "node:http";

import {
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { maakApp } from "../../src/dashboard/server.ts";
import { maakSessieCookie } from "../../src/dashboard/auth.ts";
import { CSRF_KOEKJE, CSRF_VELD, maakCsrfToken } from "../../src/dashboard/bescherming.ts";
import { inhoudsHashVan } from "../../src/inhoud/voorstel.ts";

const PAD = "/kennis/fixture-studio-http-niet-live";
const GEHEIM = "t".repeat(40);

type Rol = "beheerder" | "redacteur" | "analist" | "lezer";

describe("Content Studio over HTTP", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let server: Server;
  let basis = "";
  const gebruikers: Partial<Record<Rol, number>> = {};
  /** voorstel-id en hash per soort. */
  const voorstel: Record<"feitelijk" | "link" | "hoog" | "geblokkeerd", { id: string; hash: string }> = {
    feitelijk: { id: "", hash: "" },
    link: { id: "", hash: "" },
    hoog: { id: "", hash: "" },
    geblokkeerd: { id: "", hash: "" },
  };

  before(async () => {
    /* Het sessiegeheim wordt PER VERZOEK gelezen, niet bij import, dus
       hier zetten is genoeg. 'test' houdt cookieSecure() leeg en zet
       geen HSTS. */
    process.env["INTEL_SESSIE_GEHEIM"] = GEHEIM;
    process.env["INTEL_OMGEVING"] = "test";

    db = await maakWegwerpdatabase("studiohttp");
    org = await maakOrganisatie(db, "vibe-energy");
    for (const rol of ["beheerder", "redacteur", "analist", "lezer"] as const) {
      gebruikers[rol] = await maakGebruiker(db, org, `${rol}@vibeenergy.nl`, rol);
    }

    const soorten = [
      { sleutel: "feitelijk" as const, eindoordeel: "KLAAR_VOOR_REVIEW", status: "READY_FOR_REVIEW", soort: "alinea_toevoegen", risico: "laag", fail: false },
      { sleutel: "link" as const, eindoordeel: "KLAAR_VOOR_LINKREVIEW", status: "READY_FOR_LINK_REVIEW", soort: "interne_link", risico: "laag", fail: true },
      { sleutel: "hoog" as const, eindoordeel: "KLAAR_VOOR_REVIEW", status: "READY_FOR_REVIEW", soort: "alinea_toevoegen", risico: "hoog", fail: false },
      { sleutel: "geblokkeerd" as const, eindoordeel: "AFWIJZEN", status: "DRAFT", soort: "geen", risico: "laag", fail: true },
    ];

    for (const s of soorten) {
      const tekst = `Fixturetekst voor ${s.sleutel}. Testmateriaal, hoort niet op de website.`;
      const hash = inhoudsHashVan({
        doelPad: PAD,
        doelSectie: "Wat dit kost",
        wijzigingSoort: s.soort,
        nieuweTekst: tekst,
        feiten: [s.sleutel],
        links: [],
        ctaTekst: "Laat uw fixture doorrekenen",
        ctaDoel: "/contact",
      });
      const id = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
        const g = await c.query<{ id: string }>(
          `insert into intel.markt_gebeurtenissen
             (organisatie_id, sleutel, titel, gebeurtenis_soort, risico_klasse)
           values ($1, $2, 'Fixture voor de studio-HTTP-toets', 'overig', $3)
           returning id::text`,
          [org, `fixture-studio-${s.sleutel}`, s.risico],
        );
        const k = await c.query<{ id: string }>(
          `insert into intel.inhoud_kandidaten
             (organisatie_id, gebeurtenis_id, besluit, motor_versie)
           values ($1, $2::bigint, 'UPDATE_EXISTING', 'fixture-studio')
           returning id::text`,
          [org, g.rows[0]!.id],
        );
        const v = await c.query<{ id: string }>(
          `insert into intel.inhoud_voorstellen
             (organisatie_id, kandidaat_id, gebeurtenis_id, doel_pad, wijziging_soort,
              doel_sectie, nieuwe_tekst, huidige_tekst, cta_tekst, cta_doel, cta_grondslag,
              eindoordeel, oordeel_reden, inhouds_hash, publicatie_status)
           values ($1, $2::bigint, $3::bigint, $4, $5, 'Wat dit kost', $6,
                   'De bestaande fixturetekst.', 'Laat uw fixture doorrekenen', '/contact',
                   'fixture', $7, 'fixture voor de studio-HTTP-toets van release 3.0.5', $8, $9)
           returning id::text`,
          [org, k.rows[0]!.id, g.rows[0]!.id, PAD, s.soort, tekst, s.eindoordeel, hash, s.status],
        );
        if (s.fail) {
          await c.query(
            `insert into intel.inhoud_voorstel_controles
               (voorstel_id, organisatie_id, naam, oordeel, reden, bewijs)
             values ($1::bigint, $2, 'verwoordbaarheid', 'FAIL', 'fixture: niet verwoordbaar', '{}')`,
            [v.rows[0]!.id, org],
          );
        }
        return v.rows[0]!.id;
      });
      voorstel[s.sleutel] = { id, hash };
    }

    const app = maakApp(db.pool);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", () => r()));
    basis = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });

  after(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await db.opruimen();
  });

  /** Een geldig sessiekoekje plus een geldig CSRF-paar voor één rol. */
  function sessie(rol: Rol): { koekjes: string; csrf: string } {
    const koekje = maakSessieCookie(gebruikers[rol]!, org, 1);
    const csrf = maakCsrfToken(GEHEIM);
    return { koekjes: `intel_sessie=${koekje}; ${CSRF_KOEKJE}=${csrf}`, csrf };
  }

  async function beoordeel(
    rol: Rol | null,
    welk: keyof typeof voorstel,
    opties: { besluit?: string; hash?: string; zonderCsrf?: boolean; id?: string } = {},
  ): Promise<{ status: number; body: string }> {
    const s = rol ? sessie(rol) : null;
    const body = new URLSearchParams({
      beoordeling: opties.besluit ?? "GOEDGEKEURD",
      inhouds_hash: opties.hash ?? voorstel[welk].hash,
      notitie: "fixture: een notitie van ruim tien tekens",
    });
    if (s && !opties.zonderCsrf) body.set(CSRF_VELD, s.csrf);
    const r = await fetch(`${basis}/voorstellen/${opties.id ?? voorstel[welk].id}/beoordeel`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...(s ? { cookie: s.koekjes } : {}),
      },
      body: body.toString(),
    });
    return { status: r.status, body: await r.text() };
  }

  /* ---------------------------------------------------- autorisatie */

  test("1. zonder sessie leidt /studio naar de inlogpagina", async () => {
    const r = await fetch(`${basis}/studio`, { redirect: "manual" });
    assert.ok([302, 303].includes(r.status), `verwacht een redirect, kreeg ${r.status}`);
    assert.match(r.headers.get("location") ?? "", /\/inloggen/);
  });

  test("2. een LEZER mag de studio zien maar niet goedkeuren (403 van de middleware)", async () => {
    const s = sessie("lezer");
    const zien = await fetch(`${basis}/studio`, { headers: { cookie: s.koekjes } });
    assert.equal(zien.status, 200, "inhoud.lezen heeft de lezer wel");

    const r = await beoordeel("lezer", "feitelijk");
    assert.equal(r.status, 403);
    assert.match(r.body, /inhoud\.goedkeuren/, "de 403 hoort het ontbrekende recht te noemen");
  });

  test("3. een ANALIST mag niet goedkeuren — dit was het defect van 3.0.4", async () => {
    /* De route hing aan distributie.concept, en dat recht heeft de
       analist wél. Nu eist hij inhoud.goedkeuren. */
    const r = await beoordeel("analist", "feitelijk");
    assert.equal(r.status, 403);
  });

  test("4. een REDACTEUR mag een feitelijke revisie goedkeuren (303 naar /studio)", async () => {
    const r = await beoordeel("redacteur", "feitelijk");
    assert.equal(r.status, 303, `verwacht 303, kreeg ${r.status}: ${r.body.slice(0, 200)}`);
  });

  test("5. een REDACTEUR mag HOOG risico niet goedkeuren, en krijgt 403 en geen 500", async () => {
    /* beoordeel() verzwaart naar inhoud.hoogrisico.goedkeuren. Die
       weigering viel in de 500-tak van de foutafbeelding; nu 403. */
    const r = await beoordeel("redacteur", "hoog");
    assert.equal(r.status, 403, `verwacht 403, kreeg ${r.status}: ${r.body.slice(0, 200)}`);
    assert.match(r.body, /hoogrisico/i);
  });

  test("6. een BEHEERDER mag hoog risico wel goedkeuren", async () => {
    const r = await beoordeel("beheerder", "hoog");
    assert.equal(r.status, 303, `${r.status}: ${r.body.slice(0, 200)}`);
  });

  test("7. zonder CSRF-veld wordt het besluit geweigerd", async () => {
    const r = await beoordeel("beheerder", "link", { zonderCsrf: true });
    assert.equal(r.status, 403);
    assert.match(r.body, /verlopen|formulier/i);
  });

  test("8. een VEROUDERDE hash geeft 409 en niet stil een ander besluit", async () => {
    const r = await beoordeel("beheerder", "link", { hash: "a".repeat(64) });
    assert.equal(r.status, 409, `${r.status}: ${r.body.slice(0, 200)}`);
  });

  test("9. een onbekend voorstel geeft 404 en geen 500", async () => {
    const r = await beoordeel("beheerder", "link", { id: "999999" });
    assert.equal(r.status, 404, `${r.status}: ${r.body.slice(0, 200)}`);
  });

  test("10. een GEBLOKKEERD voorstel is niet goed te keuren (409)", async () => {
    const r = await beoordeel("beheerder", "geblokkeerd");
    assert.equal(r.status, 409, `${r.status}: ${r.body.slice(0, 200)}`);
  });

  test("11. er is GEEN publicatieroute over HTTP — publiceren blijft de CLI", async () => {
    /* Dit is met opzet een afwezigheidstoets. Zou hier ooit een route
       bijkomen, dan valt deze toets om en moet iemand expliciet
       besluiten of publiceren via het web mag. */
    const s = sessie("beheerder");
    for (const pad of ["/publiceer", "/voorstellen/1/publiceer", "/uitrollen"]) {
      const r = await fetch(`${basis}${pad}`, {
        method: "POST",
        redirect: "manual",
        headers: { cookie: s.koekjes, "content-type": "application/x-www-form-urlencoded" },
        body: `${CSRF_VELD}=${s.csrf}`,
      });
      assert.equal(r.status, 404, `${pad} bestaat wel (${r.status}); publiceren hoort niet over HTTP`);
    }
  });

  /* ------------------------------------------- consistentie (par. 14) */

  test("12. de studio TOONT een goedkeurformulier voor een LINKVOORSTEL", async () => {
    /* HET DEFECT DAT DEZE SUITE VOND. De weergave testte op
       `eindoordeel === "KLAAR_VOOR_REVIEW"`, terwijl beoordeel() en
       migratie 0032 ook KLAAR_VOOR_LINKREVIEW toestaan. Backend en
       weergave waren het oneens over wat beoordeelbaar is. */
    const s = sessie("beheerder");
    const r = await fetch(`${basis}/studio`, { headers: { cookie: s.koekjes } });
    const html = await r.text();
    assert.equal(r.status, 200);
    assert.match(
      html,
      new RegExp(`/voorstellen/${voorstel.link.id}/beoordeel`),
      "het linkvoorstel hoort een goedkeurformulier te hebben",
    );
  });

  test("13. en GEEN formulier voor een geblokkeerd voorstel", async () => {
    const s = sessie("beheerder");
    const html = await (await fetch(`${basis}/studio`, { headers: { cookie: s.koekjes } })).text();
    assert.ok(
      !html.includes(`/voorstellen/${voorstel.geblokkeerd.id}/beoordeel`),
      "een geblokkeerd voorstel mag geen goedkeuractie tonen",
    );
  });

  test("14. de studio toont de staat, de controles en het auditspoor", async () => {
    const s = sessie("beheerder");
    const html = await (await fetch(`${basis}/studio`, { headers: { cookie: s.koekjes } })).text();
    /* Na toets 4 en 6 staan er twee goedgekeurde voorstellen; het spoor
       hoort dat te laten zien. */
    assert.match(html, /GOEDGEKEURD/, "het besluit hoort zichtbaar te zijn");
    assert.match(html, /verwoordbaarheid/, "de controles horen per voorstel te staan");
    assert.match(html, /Linkvoorstel/i, "de aparte klasse hoort benoemd te worden");
  });

  test("15. /gereed en /gezond antwoorden zonder sessie", async () => {
    for (const pad of ["/gereed", "/gezond"]) {
      const r = await fetch(`${basis}${pad}`);
      assert.equal(r.status, 200, `${pad} gaf ${r.status}`);
    }
  });

  test("16. de beveiligingskoppen staan op elk antwoord", async () => {
    const r = await fetch(`${basis}/inloggen`);
    assert.equal(r.headers.get("x-frame-options"), "DENY");
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.ok(r.headers.get("content-security-policy"), "een CSP hoort er te zijn");
    assert.match(r.headers.get("x-robots-tag") ?? "", /noindex/);
  });
});
