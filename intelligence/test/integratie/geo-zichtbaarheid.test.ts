/* ============================================================
   INTEGRATIE — de GEO-meetlaag
   ------------------------------------------------------------
   DE KERNEIS VAN DEZE SUITE, en ze staat in de opdracht:

     "Ontbrekende GEO-metingen mogen niet als slechte zichtbaarheid
      worden gepresenteerd."

   Dat is dezelfde klasse fout als 'geen GSC-rij is nul vertoningen', en
   hij is hier op drie lagen afgedwongen:

     1 ELKE POGING KRIJGT EEN RIJ, ook een mislukte, met uitkomst
       'niet_gemeten' en een verplichte reden (CHECK-constraint);
     2 HET AANDEEL IS NULL bij nul gemeten pogingen — in de view, in
       geoStand() en in geoRonde(). 0 van 0 is geen nul procent;
     3 DE RONDE WEIGERT op de deterministische provider. Die noemt
       zichzelf beschikbaar maar weet niets van de wereld; zijn uitvoer
       als meting boeken zou een verzonnen nulmeting zijn.

   Laag 3 is de belangrijkste, want hij is de enige die vandaag echt
   afgaat: gemeten op 1 november 2026 is er op geen enkele service een
   modelsleutel gezet.
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
  detecteer,
  GEO_METHODE_VERSIE,
  GEO_PROMPTS,
  geoRonde,
  geoStand,
  MERKTERMEN,
  zaaiGeoPrompts,
} from "../../src/analytics/geo.ts";

describe("de GEO-meetlaag", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("geozicht");
    org = await maakOrganisatie(db, "vibe-energy");
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await zaaiGeoPrompts(c, org);
    });
  });

  after(async () => {
    await db?.opruimen();
  });

  /* ---------- 1 · de promptset ---------- */

  test("1 · de promptset dekt de acht gevraagde onderwerpen en is gezaaid", async () => {
    const n = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ n: string }>(
        "select count(*)::text as n from intel.geo_prompts where organisatie_id = $1 and actief",
        [org],
      );
      return Number(r.rows[0]!.n);
    });
    assert.equal(n, GEO_PROMPTS.length);
    assert.equal(n, 8, "acht zakelijke energievraagstukken");
  });

  test("1b · GEEN prompt noemt het merk — anders meet je herhaling, niet bekendheid", () => {
    /* DIT IS DE BELANGRIJKSTE REGEL VAN DE SET. Een prompt met 'Vibe
       Energy' erin levert bijna altijd een vermelding op, en dat getal
       zegt dan niets over zichtbaarheid. */
    for (const p of GEO_PROMPTS) {
      const laag = p.prompt.toLowerCase();
      for (const term of MERKTERMEN) {
        assert.ok(
          !laag.includes(term),
          `prompt '${p.sleutel}' noemt '${term}'; dan meet hij of het model kan herhalen`,
        );
      }
      assert.ok(!laag.includes("vibe"), `prompt '${p.sleutel}' noemt 'vibe'`);
    }
  });

  test("1c · zaaien is idempotent per sleutel en versie", async () => {
    const tweede = await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      return zaaiGeoPrompts(c, org);
    });
    assert.equal(tweede.toegevoegd, 0, "een tweede zaai hoort niets toe te voegen");
  });

  test("1d · een inactieve prompt MOET een reden dragen", async () => {
    /* Zonder die eis verdwijnt een prompt stil uit de set en is een
       trendbreuk later niet te verklaren. */
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            "update intel.geo_prompts set actief = false where organisatie_id = $1 and sleutel = $2",
            [org, "bess-zakelijk"],
          );
        }),
      /inactief_heeft_reden/,
    );
  });

  /* ---------- 2 · de detectie ---------- */

  test("2 · de detectie vindt het merk, een eigen pagina en andere bronnen", () => {
    const d = detecteer(
      "Voor zakelijke batterijopslag kun je terecht bij Vibe Energy " +
        "(https://www.vibeenergy.nl/oplossingen/batterij) of bij Acme BV, zie acme-energie.nl.",
    );
    assert.equal(d.merkVermeld, true);
    assert.ok(d.merkPositie !== null && d.merkPositie > 0);
    assert.deepEqual(
      d.eigenCitaten.map((e) => e.waarde),
      ["vibeenergy.nl"],
    );
    assert.deepEqual(
      d.andereBronnen.map((e) => e.waarde),
      ["acme-energie.nl"],
    );
  });

  test("2b · een antwoord zonder ons merk is een ECHTE nul, en dat mag", () => {
    const d = detecteer("Daarvoor kun je terecht bij Acme BV en bij Voorbeeld Energie.");
    assert.equal(d.merkVermeld, false);
    assert.equal(d.eigenCitaten.length, 0);
    /* Dit is het verschil met de zaken hieronder: hier IS gemeten, en de
       uitkomst is nul. Dat is een bevinding. Nul POGINGEN is dat niet. */
  });

  test("2c · 'vibe' alleen is geen merkvermelding", () => {
    /* 'Vibe' komt in willekeurige tekst voor. Zou die term meetellen,
       dan verzint de detectie vermeldingen. */
    const d = detecteer("De vibe op de energiemarkt is onrustig dit jaar.");
    assert.equal(d.merkVermeld, false, "een los 'vibe' mag geen vermelding zijn");
  });

  test("2d · een versienummer is geen domein", () => {
    const d = detecteer("Wij gebruiken versie 3.0 en norm 61.2 van de netcode.");
    assert.equal(
      d.andereBronnen.length,
      0,
      `'3.0' en '61.2' zijn geen bronnen; gevonden: ${JSON.stringify(d.andereBronnen)}`,
    );
  });

  test("2e · de positie onderscheidt 'eerste regel' van 'voetnoot'", () => {
    const vroeg = detecteer("Vibe Energy doet dit. " + "x".repeat(400));
    const laat = detecteer("x".repeat(400) + " Volgens Vibe Energy kan dat.");
    assert.ok(vroeg.merkPositie !== null && laat.merkPositie !== null);
    assert.ok(
      vroeg.merkPositie! < laat.merkPositie!,
      "de positie hoort het verschil te dragen; commercieel is dat het halve verhaal",
    );
  });

  /* ---------- 3 · ontbrekende meting is GEEN slechte zichtbaarheid ---------- */

  test("3 · zonder modelsleutel WEIGERT de ronde, met reden, en boekt niets als meting", async () => {
    /* DE GEMETEN PRODUCTIESTAND. Er is op geen enkele service een
       modelsleutel gezet, dus kiesProvider() valt terug op de
       deterministische provider. Die noemt zichzelf beschikbaar — en
       daar zit de val: zonder de extra eis zou deze ronde zijn
       sjabloonuitvoer als meting boeken en 'nul vermeldingen'
       rapporteren. */
    const uit = await geoRonde(db.pool, org, {});
    assert.equal(uit.provider, "deterministisch", "aanname: er is geen modelsleutel in de toets");
    assert.equal(uit.gemeten, 0, "er hoort niets GEMETEN te zijn");
    assert.equal(uit.nietGemeten, uit.prompts, "elke prompt hoort een niet-gemeten rij te krijgen");
    assert.equal(
      uit.aandeelMetMerk,
      null,
      "HET AANDEEL MOET NULL ZIJN. 0 van 0 is geen nul procent; 0% zou een ontbrekende " +
        "meting als slechte zichtbaarheid presenteren",
    );
    assert.ok(
      uit.redenNietGemeten.some((r) => /DETERMINISTISCHE provider/.test(r)),
      `de reden hoort de provider te noemen: ${uit.redenNietGemeten.join(" | ")}`,
    );
  });

  test("3b · die weigering STAAT in de database, als poging met reden", async () => {
    /* EEN ONTBREKENDE RIJ ZOU HET ERGSTE ZIJN. Dan leest nul
       vermeldingen als 'wij worden nooit genoemd' terwijl het 'wij
       hebben niet gekeken' betekent. */
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) => geoStand(c, org));
    assert.equal(stand.metingen, GEO_PROMPTS.length, "elke poging hoort een rij te hebben");
    assert.equal(stand.gemeten, 0);
    assert.equal(stand.nietGemeten, GEO_PROMPTS.length);
    assert.equal(stand.aandeelMetMerk, null, "ook hier NULL en niet 0");
    assert.ok(stand.laatsteMeting !== null, "er is wel degelijk een poging gedaan");

    const zonderReden = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ n: string }>(
        `select count(*)::text as n from intel.geo_metingen
          where organisatie_id = $1 and uitkomst = 'niet_gemeten' and reden is null`,
        [org],
      );
      return Number(r.rows[0]!.n);
    });
    assert.equal(zonderReden, 0, "een niet-gemeten poging zonder reden mag niet bestaan");
  });

  test("3c · de view geeft NULL aandeel bij nul metingen", async () => {
    const rijen = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        prompt_sleutel: string;
        pogingen: string;
        gemeten: string;
        aandeel_met_merk: string | null;
      }>(
        `select prompt_sleutel, pogingen::text, gemeten::text, aandeel_met_merk::text
           from intel.geo_zichtbaarheid_per_prompt where organisatie_id = $1
          order by prompt_sleutel`,
        [org],
      );
      return r.rows;
    });
    assert.ok(rijen.length > 0, "de view hoort rijen te geven voor de pogingen");
    for (const r of rijen) {
      assert.ok(Number(r.pogingen) > 0, `${r.prompt_sleutel} hoort pogingen te tonen`);
      assert.equal(Number(r.gemeten), 0);
      assert.equal(
        r.aandeel_met_merk,
        null,
        `${r.prompt_sleutel}: het aandeel hoort NULL te zijn bij nul gemeten pogingen`,
      );
    }
  });

  test("3d · een droge ronde boekt NIETS en doet geen aanroep", async () => {
    const voor = await metOrganisatie(db.pool, { organisatieId: org }, (c) => geoStand(c, org));
    const uit = await geoRonde(db.pool, org, { droog: true });
    const na = await metOrganisatie(db.pool, { organisatieId: org }, (c) => geoStand(c, org));
    assert.equal(uit.droog, true);
    assert.equal(na.metingen, voor.metingen, "droog mag geen rij toevoegen");
  });

  /* ---------- 4 · een gemeten poging, met de hand neergezet ---------- */

  test("4 · een GEMETEN poging levert wel een aandeel, en de zes velden staan erbij", async () => {
    /* HIER WORDT EEN ECHTE METING NAGEBOOTST, want zonder modelsleutel
       is er geen andere manier om de 'gemeten' tak te toetsen. De
       constraint geo_metingen_gemeten_heeft_antwoord dwingt af dat een
       gemeten rij ook een antwoord en een merkoordeel draagt. */
    const promptId = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ id: number }>(
        "select id from intel.geo_prompts where organisatie_id = $1 and sleutel = $2",
        [org, "netcongestie-aansluiting"],
      );
      return r.rows[0]!.id;
    });

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.geo_metingen
           (organisatie_id, prompt_id, prompt_sleutel, prompt_versie, provider, model,
            model_versie, methode_versie, uitkomst, antwoord, antwoord_lengte,
            merk_vermeld, eigen_citaten, bron_verwijzingen)
         values ($1,$2,'netcongestie-aansluiting',1,'openai','gpt-x-2026-01-01',
                 'gpt-x-2026-01-01',$3,'gemeten',
                 'Daarvoor kun je terecht bij Vibe Energy, zie www.vibeenergy.nl.',63,
                 true,1,1)`,
        [org, promptId, GEO_METHODE_VERSIE],
      );
    });

    const rij = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        pogingen: string;
        gemeten: string;
        met_merk: string;
        aandeel_met_merk: string | null;
        provider: string;
        model: string;
        methode_versie: string;
      }>(
        `select pogingen::text, gemeten::text, met_merk::text, aandeel_met_merk::text,
                provider, model, methode_versie
           from intel.geo_zichtbaarheid_per_prompt
          where organisatie_id = $1 and prompt_sleutel = 'netcongestie-aansluiting'
            and provider = 'openai'`,
        [org],
      );
      return r.rows[0]!;
    });
    assert.equal(Number(rij.gemeten), 1);
    assert.equal(Number(rij.met_merk), 1);
    assert.equal(Number(rij.aandeel_met_merk), 1, "één van één gemeten met merk is 100%");
    /* DE ZES VELDEN DIE EEN METING HERHAALBAAR MAKEN. */
    assert.equal(rij.provider, "openai");
    assert.equal(rij.model, "gpt-x-2026-01-01");
    assert.equal(rij.methode_versie, GEO_METHODE_VERSIE);
  });

  test("4b · een 'gemeten' rij ZONDER antwoord wordt door de database geweigerd", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.geo_metingen
               (organisatie_id, prompt_id, prompt_sleutel, prompt_versie, provider, model,
                methode_versie, uitkomst)
             values ($1,(select id from intel.geo_prompts where organisatie_id = $1 limit 1),
                     'x',1,'openai','m',$2,'gemeten')`,
            [org, GEO_METHODE_VERSIE],
          );
        }),
      /gemeten_heeft_antwoord/,
      "een gemeten poging zonder antwoord is een detectie op niets",
    );
  });
});
