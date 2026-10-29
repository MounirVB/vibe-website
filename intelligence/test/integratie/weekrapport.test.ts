/* ============================================================
   TEST — de wekelijkse operationele rapportage
   ------------------------------------------------------------
   DE GRENDEL DIE HIER HET BELANGRIJKST IS: altijd tien cijfers, en
   een cijfer dat niet te meten is krijgt null MET een reden.

   Nul gepubliceerde artikelen en nul MEETBARE artikelen zien er in een
   tabel identiek uit. Bij een nieuwskanaal dat nog niets heeft
   gepubliceerd is dat geen theoretisch onderscheid maar precies het
   verschil tussen "de redactie heeft niets vrijgegeven" en "wij kunnen
   het niet zien".

   En: deze suite toetst de KOLOMNAMEN tegen een echte database. De
   eerste versie van dit rapport viel om met 'column "aangemaakt_op"
   does not exist' — intel.bron_ophalingen heeft `gestart_op` en
   intel.publicaties en intel.publicatiebesluiten hebben `op`. Een query
   met een verkeerde kolom werpt; erger is een query met een verkeerde
   WAARDE, want die geeft stil 0 terug. Daar is de laatste toets voor.
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
  meetWeek,
  rapportAlsTekst,
  WEEKRAPPORT_CIJFERS,
} from "../../src/ops/weekrapport.ts";

const TOT = "2026-10-29";

describe("het weekrapport", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("weekrapport");
    org = await maakOrganisatie(db, "week-org");
  });

  after(async () => {
    await db.opruimen();
  });

  test("een leeg platform levert tien cijfers, geen negen", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      meetWeek(c, org, { totDatum: TOT }),
    );
    assert.equal(r.cijfers.length, 10);
    assert.deepEqual(
      r.cijfers.map((x) => x.sleutel),
      [...WEEKRAPPORT_CIJFERS],
      "de orde en de verzameling cijfers staan vast",
    );
  });

  test("de week loopt van zeven dagen terug tot de peildatum", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      meetWeek(c, org, { totDatum: TOT }),
    );
    assert.equal(r.totDatum, "2026-10-29");
    assert.equal(r.vanDatum, "2026-10-22");
  });

  test("elk cijfer draagt een bron, een label en een toelichting", async () => {
    /* Een getal zonder bron is niet na te rekenen, en een getal zonder
       label verbergt of het gemeten of geschat is. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      meetWeek(c, org, { totDatum: TOT }),
    );
    for (const cf of r.cijfers) {
      assert.ok(cf.bron.length > 3, `${cf.sleutel} heeft geen bron`);
      assert.ok(
        ["GEMETEN", "NIET_MEETBAAR", "NIET_GEMETEN"].includes(cf.label),
        `${cf.sleutel} heeft label '${cf.label}'`,
      );
      assert.ok(cf.toelichting.length > 20, `${cf.sleutel} heeft geen toelichting`);
    }
  });

  test("zonder Search Console is SEO NIET_MEETBAAR en nooit 0", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      meetWeek(c, org, { totDatum: TOT }),
    );
    const seo = r.cijfers.find((x) => x.sleutel === "seo_prestaties")!;
    assert.equal(seo.label, "NIET_MEETBAAR");
    assert.equal(seo.aantal, null, "een onmeetbaar cijfer mag geen 0 zijn");
    assert.match(seo.toelichting, /Search Console/);
  });

  test("zonder GA4 zijn doorkliks NIET_MEETBAAR en nooit 0", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      meetWeek(c, org, { totDatum: TOT }),
    );
    const dk = r.cijfers.find((x) => x.sleutel === "doorkliks_commercieel")!;
    assert.equal(dk.label, "NIET_MEETBAAR");
    assert.equal(dk.aantal, null);
    assert.match(dk.toelichting, /browser van een bezoeker/);
  });

  test("zonder enige ophaling is de laatste controle NIET_GEMETEN, niet een datum", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      meetWeek(c, org, { totDatum: TOT }),
    );
    const lc = r.cijfers.find((x) => x.sleutel === "laatste_geslaagde_controle")!;
    assert.equal(lc.label, "NIET_GEMETEN");
    assert.equal(lc.waarde, null);
    assert.ok(r.aandacht.some((a) => /geslaagde broncontrole/.test(a)), r.aandacht.join(" | "));
  });

  test("de cijfers bewegen mee met echte rijen", async () => {
    /* Fixtures die de ingestie- en redactiekant allebei raken, zodat
       bewezen is dat de queries de juiste kolommen én de juiste
       periodegrens gebruiken. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const bron = await c.query<{ id: string }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            laatst_opgehaald_op, laatste_resultaat)
         values ($1,'week-bron','Weekbron','rss','https://example.test/feed','https://example.test',
                 true,'toegestaan','geen_voorbehoud','geverifieerd','fixture',
                 $2::date, 'ok')
         returning id::text`,
        [org, TOT],
      );
      /* Eén brondocument BINNEN de week en één ERBUITEN, zodat de
         periodegrens aantoonbaar werkt. */
      for (const [extern, datum] of [
        ["binnen", "2026-10-27"],
        ["buiten", "2026-10-01"],
      ] as const) {
        await c.query(
          `insert into intel.brondocumenten
             (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort, aangemaakt_op)
           values ($1, $2::bigint, $3, $4, 'Weekfixture', 'Weekbron', 'rss', $5::date)`,
          [org, bron.rows[0]!.id, extern, `https://example.test/${extern}`, datum],
        );
      }
      /* Een conceptversie die de poorten haalt: die wacht op een mens. */
      await c.query(
        `insert into intel.inhoud_versies
           (organisatie_id, pad, versie, soort, titel, meta_omschrijving, canonieke_url,
            body_markdown, status, risico_klasse, auteur_soort, poorten_geslaagd, inhoud_afdruk)
         values ($1, '/nieuws/weekfixture', 1, 'nieuw_artikel', 'Een weekfixture met een titel',
                 'Een metabeschrijving voor de weekfixture die lang genoeg is om er niet over te hoeven zeuren.',
                 'https://www.vibeenergy.nl/nieuws/weekfixture', 'De tekst.', 'ter_review',
                 'laag', 'ai', true, 'afdruk-week')`,
        [org],
      );
      /* En een die ze NIET haalt: die wacht op een reparatie. */
      await c.query(
        `insert into intel.inhoud_versies
           (organisatie_id, pad, versie, soort, titel, meta_omschrijving, canonieke_url,
            body_markdown, status, risico_klasse, auteur_soort, poorten_geslaagd, inhoud_afdruk)
         values ($1, '/nieuws/weekfixture-stuk', 1, 'nieuw_artikel', 'Een tweede weekfixture',
                 'Nog een metabeschrijving voor de tweede weekfixture, ook weer lang genoeg hiervoor.',
                 'https://www.vibeenergy.nl/nieuws/weekfixture-stuk', 'De tekst.', 'ter_review',
                 'laag', 'ai', false, 'afdruk-week-2')`,
        [org],
      );
    });

    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      meetWeek(c, org, { totDatum: TOT }),
    );
    const bij = (s: string) => r.cijfers.find((x) => x.sleutel === s)!;

    assert.equal(bij("actieve_bronnen").aantal, 1);
    assert.equal(bij("laatste_geslaagde_controle").label, "GEMETEN");
    assert.equal(
      bij("nieuwe_bronitems").aantal,
      1,
      "alleen het document BINNEN de week hoort mee te tellen",
    );
    assert.equal(
      bij("conceptartikelen").aantal,
      2,
      "beide versies staan op ter_review en zijn dus in behandeling",
    );
    assert.equal(
      bij("wachtende_goedkeuringen").aantal,
      1,
      "alleen de versie die de poorten haalt wacht echt op een mens",
    );
    assert.equal(bij("gepubliceerde_artikelen").aantal, 0);
  });

  test("de tekstvorm noemt elk cijfer en zegt dat er niets is gepubliceerd", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      meetWeek(c, org, { totDatum: TOT }),
    );
    const tekst = rapportAlsTekst(r);
    for (const cf of r.cijfers) {
      assert.ok(tekst.includes(cf.naam), `'${cf.naam}' staat niet in de tekst`);
    }
    assert.match(tekst, /publiceert niets en keurt niets goed/);
    assert.match(tekst, /WEEKRAPPORT 2026-10-22 t\/m 2026-10-29/);
  });

  test("de publicatiefoutenquery gebruikt een BESTAANDE besluitwaarde", async () => {
    /* De eerste versie zocht besluit = 'geweigerd', en die waarde staat
       niet in de check-constraint. Zo'n query werpt niet maar geeft
       eeuwig 0 — een cijfer dat 'geen fouten' meldt omdat het de
       verkeerde waarde zoekt. Deze toets leest de constraint zelf en
       bewijst dat de waarden die het rapport gebruikt bestaan. */
    const r = await alsEigenaar(db, (c) =>
      c.query<{ def: string }>(
        `select pg_get_constraintdef(oid) as def from pg_constraint
          where conrelid = 'intel.publicatiebesluiten'::regclass and contype = 'c'
            and pg_get_constraintdef(oid) like '%besluit%'`,
      ),
    );
    const def = r.rows.map((x) => x.def).join(" ");
    for (const waarde of ["automatisch_geblokkeerd", "teruggedraaid"]) {
      assert.ok(
        def.includes(waarde),
        `het rapport telt besluit '${waarde}', maar de constraint kent hem niet: ${def}`,
      );
    }
    assert.ok(
      !def.includes("'geweigerd'"),
      "als 'geweigerd' ooit een geldige waarde wordt, hoort het rapport hem mee te tellen",
    );
  });
});
