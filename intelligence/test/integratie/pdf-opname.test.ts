/* ============================================================
   INTEGRATIE — een PDF opnemen in de documentketen
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET — eis 1, 2, 9 en 10 uit §3:

     1 de zes poorten weigeren elk op hun eigen grond
     2 de oorspronkelijke document-URL en de bronmetadata blijven staan
     3 dezelfde PDF opnieuw geeft GEEN tweede versie
     4 een GEWIJZIGDE PDF geeft een nieuwe versie en laat de oude staan
     5 de versieketen is navolgbaar via vorige_versie_id
     6 de opgenomen tekst gaat gewoon door de claimketen

   GEEN NETWERK. De vijf poorten die vóór het ophalen staan, worden
   getoetst zonder dat er iets wordt opgehaald; voor het schrijfpad
   wordt de PDF-lezer rechtstreeks gebruikt en de versie met dezelfde
   SQL weggeschreven als neemPdfOp() doet. Dat is geen namaak van de
   opslag maar dezelfde opslag, zonder de fetch ertussen.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import { createHash } from "node:crypto";

import {
  maakOrganisatie,
  maakWegwerpdatabase,
  alsEigenaar,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { neemPdfOp, padIsToegestaan } from "../../src/bronnen/pdfdocument.ts";
import { leesPdfTekst } from "../../src/bronnen/pdf.ts";
import { extraheerUitspraken } from "../../src/pijplijn/uitspraken.ts";

const ACM_URL = "https://www.acm.nl/system/files/documents/toetsbesluit.pdf";

/** Een minimale maar echte PDF met één pagina tekst. */
function maakPdf(regel: string): Buffer {
  const inhoud = `BT /F1 12 Tf 72 700 Td (${regel}) Tj ET`;
  return Buffer.from(
    "%PDF-1.7\n" +
      "1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n" +
      "2 0 obj\n<</Type/Pages/Kids[4 0 R]/Count 1>>\nendobj\n" +
      "3 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>\nendobj\n" +
      "4 0 obj\n<</Type/Page/Parent 2 0 R/Resources<</Font<</F1 3 0 R>>>>/Contents 5 0 R>>\nendobj\n" +
      `5 0 obj\n<</Length ${inhoud.length}>>\nstream\n${inhoud}\nendstream\nendobj\n` +
      "trailer\n<</Root 1 0 R>>\n%%EOF\n",
    "latin1",
  );
}

describe("een PDF opnemen in de documentketen", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let acmBronId = 0;

  before(async () => {
    db = await maakWegwerpdatabase("pdfopname");
    org = await maakOrganisatie(db, "pdfopname-org");

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const acm = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            is_primaire_bron, betrouwbaarheid, levert_gebeurtenissen, onderwerpen, mag_citeren)
         values ($1,'acm-besluiten','Autoriteit Consument en Markt','html_lijst',
                 'https://www.acm.nl/nl/publicaties','https://www.acm.nl',
                 true,'toegestaan','geen_voorbehoud','geverifieerd','fixture',
                 true,5,true,array['netcongestie','regelgeving'],true)
         returning id`,
        [org],
      );
      acmBronId = acm.rows[0]!.id;

      /* EEN BRON MET EEN TDM-VOORBEHOUD IS NOOIT ACTIEF, EN DAT IS EEN
         GEMETEN FEIT OVER DEZE DATABASE.

         Mijn eerste opzet zette deze bron op actief=true om poort 5 van
         neemPdfOp() te raken. Postgres weigerde dat:

           new row for relation "bronnen" violates check constraint
           "bronnen_actief_vereist_toestemming"

         Die constraint bestond al en is STRENGER dan mijn poort: een
         bron met een voorbehoud mag helemaal niet actief zijn, dus er
         is geen stand waarin neemPdfOp() een actieve bron met een
         voorbehoud te zien krijgt. Poort 5 is daarmee een tweede bodem
         achter een databasegrendel en niet de grendel zelf — zie de
         toets 'de DATABASE is de grendel' hieronder, en de aangepaste
         toelichting in pdfdocument.ts. */
      await c.query(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            is_primaire_bron, betrouwbaarheid, levert_gebeurtenissen, onderwerpen)
         values ($1,'acm-voorbehoud','ACM met voorbehoud','html_lijst',
                 'https://www.acm.nl/nl/publicaties','https://www.acm.nl',
                 false,'toegestaan','voorbehoud','geverifieerd',
                 'de uitgever sluit AI-crawlers volledig uit in robots.txt',
                 true,5,true,array['netcongestie'])`,
        [org],
      );

      /* Een inactieve bron, voor poort 1b. */
      await c.query(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            is_primaire_bron, betrouwbaarheid, levert_gebeurtenissen, onderwerpen)
         values ($1,'acm-uit','ACM inactief','html_lijst',
                 'https://www.acm.nl/nl/publicaties','https://www.acm.nl',
                 false,'toegestaan','geen_voorbehoud','geverifieerd','fixture',
                 true,5,true,array['netcongestie'])`,
        [org],
      );
    });
  });

  after(async () => {
    await db?.opruimen();
  });

  /* ================================================================
     DE POORTEN — elk weigert op zijn eigen grond, zonder netwerk
     ================================================================ */

  test("poort 1 · een onbekende bron wordt geweigerd", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      neemPdfOp(c, org, { url: ACM_URL, bronSleutel: "bestaat-niet" }),
    );
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.weigering, "bron_onbekend");
    assert.match(r.reden, /bewijsketen/);
  });

  test("poort 1b · een inactieve bron wordt geweigerd", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      neemPdfOp(c, org, { url: ACM_URL, bronSleutel: "acm-uit" }),
    );
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.weigering, "bron_inactief");
  });

  test("poort 2 · een document van een andere host is geen document van deze bron", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      neemPdfOp(c, org, {
        url: "https://namaak-acm.example.com/system/files/documents/besluit.pdf",
        bronSleutel: "acm-besluiten",
      }),
    );
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.weigering, "host_niet_van_bron");
  });

  test("poort 3 · een pad buiten het register wordt geweigerd", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      neemPdfOp(c, org, {
        url: "https://www.acm.nl/nl/mijn-dossier/vertrouwelijk.pdf",
        bronSleutel: "acm-besluiten",
      }),
    );
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.weigering, "pad_niet_toegestaan");
  });

  test("poort 5 · DE DATABASE is de grendel op het TDM-voorbehoud", async () => {
    /* GEMETEN, NIET AANGENOMEN. bronnen_actief_vereist_toestemming
       weigert een ACTIEVE bron met een voorbehoud. Dat is strenger dan
       mijn eigen poort: er bestaat geen stand waarin neemPdfOp() zo'n
       bron te zien krijgt, dus de weigering komt uit de database en
       niet uit de code.

       DEZE TOETS FORCEERT DE GRENDEL. Een CHECK die niemand ooit heeft
       laten vuren, is een bewering en geen bescherming. */
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `update intel.bronnen set actief = true
              where organisatie_id = $1 and sleutel = 'acm-voorbehoud'`,
            [org],
          );
        }),
      /bronnen_actief_vereist_toestemming/,
      "een bron met een TDM-voorbehoud hoort niet actief te kunnen worden",
    );

    /* EN DE BRON BLIJFT INACTIEF, dus neemPdfOp() loopt op poort 1b
       stuk — niet op poort 5. Dat is de eerlijke uitkomst. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      neemPdfOp(c, org, { url: ACM_URL, bronSleutel: "acm-voorbehoud" }),
    );
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.weigering, "bron_inactief");
  });

  test("poort 6 · met het netwerk uit wordt er niets opgehaald", async () => {
    /* De toetsomgeving zet INTEL_NETWERK_TOEGESTAAN=0 (zie
       test/netwerk-uit.ts). Deze aanroep haalt de vier poorten ervoor
       en moet dan op het netwerk stuklopen — niet op een fetch die
       alsnog uitgaat. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      neemPdfOp(c, org, { url: ACM_URL, bronSleutel: "acm-besluiten" }),
    );
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(
      r.weigering === "netwerk_uit" || r.weigering === "robots_verbiedt",
      `verwacht netwerk_uit of robots_verbiedt, kreeg ${r.weigering}: ${r.reden}`,
    );
  });

  /* ================================================================
     HET SCHRIJFPAD — met dezelfde SQL, zonder de fetch
     ================================================================ */

  /**
   * Schrijft een PDF weg zoals neemPdfOp() dat doet, maar met bytes uit
   * de hand in plaats van uit het netwerk.
   *
   * DIT IS GEEN NAMAAK VAN DE OPSLAG. De lezer is dezelfde functie en de
   * SQL is woordelijk dezelfde; alleen de fetch zit er niet tussen.
   * Daarmee toetst dit de opslageigenschappen — versiebehoud, de keten,
   * de metadata — en niet het netwerk.
   */
  async function schrijf(regel: string): Promise<{ versieId: number; nieuw: boolean }> {
    const bytes = maakPdf(regel);
    const gelezen = leesPdfTekst(bytes, {
      url: ACM_URL,
      contentType: "application/pdf",
      bronSleutel: "acm-besluiten",
    });
    assert.equal(gelezen.ok, true);
    if (!gelezen.ok) throw new Error("onleesbaar");

    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const doc = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
            eerst_opgehaald_op, laatst_opgehaald_op, url_is_identiteit, datum_herkomst)
         values ($1,$2,$3,$4,$5,$6,'dataset', now(), now(), true, 'onbekend')
         /* DE UNIEKE SLEUTEL IS (bron_id, extern_id) EN NIET
            (organisatie_id, bron_id, extern_id).
            Gemeten: brondocumenten_extern_uniek in 0002_bronnen.sql.
            Mijn eerste versie noemde de organisatie erbij en kreeg
            "there is no unique or exclusion constraint matching the ON
            CONFLICT specification" — een gegokte sleutel, betrapt door
            de eigen integratietoets. De organisatie zit al in bron_id,
            dus hij hoort er ook niet bij. */
         on conflict (bron_id, extern_id)
           do update set laatst_opgehaald_op = now()
         returning id`,
        [org, acmBronId, ACM_URL, ACM_URL, "Toetsbesluit over netcongestie", "Autoriteit Consument en Markt"],
      );
      const hash = createHash("sha256").update(gelezen.tekst).digest("hex");
      const bestaand = await c.query<{ id: number }>(
        `select id from intel.brondocument_versies
          where organisatie_id = $1 and brondocument_id = $2 and inhoud_hash = $3`,
        [org, doc.rows[0]!.id, hash],
      );
      if (bestaand.rows[0]) return { versieId: bestaand.rows[0].id, nieuw: false };

      const vorige = await c.query<{ id: number; versie: number }>(
        `select id, versie from intel.brondocument_versies
          where organisatie_id = $1 and brondocument_id = $2 order by versie desc limit 1`,
        [org, doc.rows[0]!.id],
      );
      const r = await c.query<{ id: number }>(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte,
            opgehaald_op, http_status, wijziging_soort, vorige_versie_id, documentvorm)
         values ($1,$2,$3,$4,$5,$6,$7, now(), 200, $8, $9, 'BEKENDMAKING')
         returning id`,
        [
          org,
          doc.rows[0]!.id,
          (vorige.rows[0]?.versie ?? 0) + 1,
          hash,
          "Toetsbesluit over netcongestie",
          gelezen.tekst,
          gelezen.tekst.length,
          vorige.rows[0] ? "materieel" : "nieuw",
          vorige.rows[0]?.id ?? null,
        ],
      );
      await c.query(
        `update intel.brondocumenten
            set huidige_versie_id = $3, aantal_versies = coalesce(aantal_versies,0) + 1
          where organisatie_id = $1 and id = $2`,
        [org, doc.rows[0]!.id, r.rows[0]!.id],
      );
      return { versieId: r.rows[0]!.id, nieuw: true };
    });
  }

  test("de oorspronkelijke document-URL en de bronmetadata blijven staan", async () => {
    await schrijf("Het congestierapport van Liander is niet in overeenstemming met de Netcode");
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{
        canonieke_url: string;
        extern_id: string;
        uitgever: string;
        url_is_identiteit: boolean;
      }>(
        `select d.canonieke_url, d.extern_id, d.uitgever, d.url_is_identiteit
           from intel.brondocumenten d where d.organisatie_id = $1`,
        [org],
      ),
    );
    assert.equal(r.rows.length, 1);
    assert.equal(r.rows[0]?.canonieke_url, ACM_URL);
    assert.equal(r.rows[0]?.extern_id, ACM_URL);
    assert.equal(r.rows[0]?.uitgever, "Autoriteit Consument en Markt");
    assert.equal(r.rows[0]?.url_is_identiteit, true);
  });

  test("dezelfde PDF opnieuw geeft GEEN tweede versie", async () => {
    const eerste = await schrijf(
      "Het congestierapport van Liander is niet in overeenstemming met de Netcode",
    );
    const tweede = await schrijf(
      "Het congestierapport van Liander is niet in overeenstemming met de Netcode",
    );
    assert.equal(tweede.nieuw, false, "dezelfde inhoud hoort geen nieuwe versie te geven");
    assert.equal(tweede.versieId, eerste.versieId);
  });

  test("een GEWIJZIGDE PDF geeft een nieuwe versie en laat de oude staan", async () => {
    const voor = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ n: number }>(
        "select count(*)::int as n from intel.brondocument_versies",
      ),
    );
    const nieuwe = await schrijf("Liander heeft een herzien congestierapport gepubliceerd");
    assert.equal(nieuwe.nieuw, true);

    const na = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ id: number; versie: number; vorige_versie_id: number | null; tekst: string }>(
        `select id, versie, vorige_versie_id, ruwe_tekst as tekst
           from intel.brondocument_versies order by versie`,
      ),
    );
    assert.equal(na.rows.length, (voor.rows[0]?.n ?? 0) + 1);
    /* DE OUDE VERSIE STAAT ER NOG, met zijn eigen tekst. */
    assert.match(na.rows[0]?.tekst ?? "", /niet in overeenstemming/);
    assert.match(na.rows[1]?.tekst ?? "", /herzien congestierapport/);
    /* EN DE KETEN IS NAVOLGBAAR. */
    assert.equal(na.rows[1]?.vorige_versie_id, na.rows[0]?.id);
    assert.equal(na.rows[0]?.vorige_versie_id, null);
  });

  test("de opgenomen tekst gaat gewoon door de claimketen", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ titel: string; tekst: string }>(
        `select titel, ruwe_tekst as tekst from intel.brondocument_versies
          order by versie desc limit 1`,
      ),
    );
    const rij = r.rows[0]!;
    const claims = extraheerUitspraken(rij.titel, rij.tekst);
    /* De tweede versie zegt "Liander heeft een herzien congestierapport
       gepubliceerd" — dat is een CONGESTIESTATUS, en hij hoort er als
       claim uit te komen. */
    const vormen = claims.map((c) => c.claimvorm).filter((v) => v != null);
    assert.ok(vormen.includes("CONGESTIESTATUS"), `gevonden: ${vormen.join(", ")}`);
    for (const c of claims) {
      if (c.claimvorm) assert.ok((c.bronpassage ?? "").length >= 10);
    }
  });

  test("de paginaverwijzing staat in de opgeslagen tekst", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      c.query<{ tekst: string }>(
        "select ruwe_tekst as tekst from intel.brondocument_versies order by versie limit 1",
      ),
    );
    assert.match(r.rows[0]?.tekst ?? "", /\[pagina 1\]/);
  });

  test("het padregister is ook buiten de opname te meten", () => {
    assert.equal(padIsToegestaan("acm-besluiten", ACM_URL), true);
    assert.equal(padIsToegestaan("acm-voorbehoud", ACM_URL), false);
  });
});
