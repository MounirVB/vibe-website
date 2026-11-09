/* ============================================================
   TEST — de goedkeuringscategorie, door de twee ECHTE poorten
   ------------------------------------------------------------
   WAAROM DEZE SUITE BESTAAT.

   De twee poorten die beslissen of een nieuwsartikel publiek wordt,
   stonden tot nu toe BUITEN elke toets van dit platform. Gemeten op
   9 november 2026: `grep -rl publicatiecontract intelligence/test/`
   gaf nul treffers, en er was geen enkele toets die
   scripts/seo/bouw-routes.mjs draaide. Beide zijn `.mjs` in de
   repowortel, dus ze vielen ook buiten `npm run typecheck`.

   Dat is precies de verkeerde kant om blind te zijn:

     · scripts/seo/bouw-routes.mjs is de HARDE STOP. Zet weigerNieuws()
       de route op PENDING, dan maakt de generator de pagina niet — ook
       niet als alle andere poorten groen zijn. Er bestaat dan geen
       pagina om te repareren.
     · intelligence/ops/publicatiecontract.mjs is een REQUIRED CHECK op
       main (werkstroomtaak "Geheimen, kwetsbaarheden en
       publicatiecontract", .github/workflows/poort.yml). Elke
       publicatie-PR loopt hierop stuk of komt hierdoor.

   WAT ER WORDT GEDRAAID, EN NIET NAGEBOOTST.
   Beide scripts worden als kindproces op een WEGWERPBOOM gedraaid, niet
   geïmporteerd en niet nagebouwd. Een nagebouwde poort toetst de
   nabouw. Ze bepalen hun wortel uit hun eigen bestandspad
   (`resolve(hier, '..', '..')`) en kennen geen omgevingsvariabele om
   die te verzetten, dus de boom krijgt dezelfde vorm als de
   repository: `scripts/seo/`, `intelligence/ops/`, `data/`.

   De artikelbestanden komen uit bouwNieuwsRecord() — de functie die ze
   in productie ook schrijft. Zo meet deze suite de hele naad: wat het
   platform wegschrijft moet zijn wat de twee poorten accepteren. Een
   met de hand geschreven fixture zou juist de velden kunnen dragen die
   het platform niet produceert; dat is de fout die qa-nieuws.mjs eerder
   maakte met een zelfverzonnen `soort: 'tekst'` (zie de toelichting bij
   Sectie in src/site/nieuwsregister.ts).

   DE VIJF GEVALLEN, EN DE TWEE DIE ERBIJ HOREN.
     1 een mens met naam                          door
     2 het beleid, laag risico, met beleidsversie  door
     3 het beleid met risico 'hoog'                geweigerd
     4 GOEDGEKEURD zonder enige goedkeuring        geweigerd
     5 het beleid zonder beleidsversie             geweigerd
     6 een bestand van VOOR deze regel             door (achterwaarts)
     7 een met de hand op INDEX gezette route      geweigerd door de poort

   Geval 6 is er omdat de drie velden optioneel zijn: een bestand dat ze
   niet kent mag niet stil rood worden. Geval 7 is er omdat
   data/seo/routes.json GEGENEREERD is en een PR hem dus met de hand
   anders kan maken dan het bestand waaruit hij hoort te volgen — dan is
   de generator omzeild en is de poort het enige dat er nog staat.
   ============================================================ */

import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { after, before, describe, test } from "node:test";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { bouwNieuwsRecord, type NieuwsInvoer } from "../../src/site/nieuwsregister.ts";

const uitvoeren = promisify(execFile);

/** De echte repowortel: test/integratie -> test -> intelligence -> wortel. */
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const SLUG = "acm-stelt-nettarieven-2027-vast";
const ARTIKELROUTE = `nieuws/${SLUG}`;
/** De nationale pagina waarvan het artikel zijn commerciële intentie leent. */
const EIGENAAR = "netcongestie";

/* ------------------------------------------------------------------
   De omgeving van het kindproces.

   SEO_BASIS_SHA en SEO_BASIS_INDEX worden BEWUST WEGGEHAALD. Stap 7 van
   het publicatiecontract (de depublicatiegrendel) leest ze, en in een
   wegwerpboom zonder `.git` hoort die stap OVERGESLAGEN te zijn — niet
   groen en niet rood. Zou een van beide variabelen uit de buitenwereld
   doorlekken, dan vergeleek de grendel een vreemde stand en meldde hij
   onzin over "verdwenen" routes. ROUTES_DATUM gaat mee weg om dezelfde
   reden: hij pint een datum die hier niets te pinnen heeft.
   ------------------------------------------------------------------ */
function schoneOmgeving(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const sleutel of [
    "SEO_BASIS_SHA",
    "SEO_BASIS_INDEX",
    "GITHUB_EVENT_PATH",
    "GITHUB_BASE_REF",
    "ROUTES_DATUM",
  ]) {
    delete env[sleutel];
  }
  return env;
}

type Uitkomst = { readonly code: number; readonly uit: string };

/** Draait een script en geeft de exitcode terug in plaats van te werpen. */
async function draai(script: string, boom: string): Promise<Uitkomst> {
  try {
    const { stdout, stderr } = await uitvoeren("node", [join(boom, script)], {
      cwd: boom,
      env: schoneOmgeving(),
      maxBuffer: 32 * 1024 * 1024,
    });
    return { code: 0, uit: stdout + stderr };
  } catch (e) {
    const f = e as { code?: unknown; stdout?: string; stderr?: string };
    return {
      code: typeof f.code === "number" ? f.code : 1,
      uit: `${f.stdout ?? ""}${f.stderr ?? ""}`,
    };
  }
}

/* ------------------------------------------------------------------
   Het artikelbestand, langs de echte schrijver.
   ------------------------------------------------------------------ */

const BASISINVOER: NieuwsInvoer = {
  pad: `/${ARTIKELROUTE}`,
  titel: "ACM stelt de nettarieven voor 2027 vast | Vibe Energy",
  metaOmschrijving:
    "De ACM heeft de nettarieven voor 2027 vastgesteld. Wat dat betekent voor zakelijke " +
    "afnemers met een grootverbruikaansluiting.",
  h1: "ACM stelt de nettarieven voor 2027 vast",
  lead: "De ACM heeft de nettarieven voor 2027 vastgesteld.",
  bodyMarkdown:
    "De ACM heeft de nettarieven voor 2027 vastgesteld.\n\n" +
    "## Wat er is besloten\n\nHet besluit staat in het tarievenbesluit.\n",
  gepubliceerd: "2026-11-02",
  gewijzigd: "2026-11-02",
  status: "goedgekeurd",
  goedgekeurdDoor: "R. Reviewer",
  goedgekeurdOp: "2026-11-02",
  onderwerpEigenaar: EIGENAAR,
  oplossingLinks: [],
  kennisLinks: [],
  regioLinks: [],
  bronnen: [
    { naam: "ACM tarievenbesluit", url: "https://www.acm.nl/", datum: "2026-11-02", soort: "TOEZICHTHOUDER" },
  ],
  claims: [],
  directAntwoord: null,
  herkomst: { inhoudVersieId: 1, inhoudAfdruk: null, besluitSoort: "nieuw_artikel" },
};

/** Het registerrecord zoals het platform het schrijft, met een afwijking erin. */
function record(afwijking: Partial<NieuwsInvoer>): Record<string, unknown> {
  return bouwNieuwsRecord({ ...BASISINVOER, ...afwijking });
}

/* ------------------------------------------------------------------
   De wegwerpboom.

   Minimaal, maar met ECHTE bestanden op de plekken waar de twee scripts
   kijken. `netcongestie` staat in nationaal-doel.json onder `bestaand`
   en komt daarmee onvoorwaardelijk op INDEX; dat is nodig omdat
   weigerNieuws() eist dat de onderwerp-eigenaar op INDEX staat.
   ------------------------------------------------------------------ */
const bomen: string[] = [];

async function maakBoom(artikel: Record<string, unknown>): Promise<string> {
  const boom = await realpath(await mkdtemp(join(tmpdir(), "intel-goedkeuring-")));
  bomen.push(boom);

  const schrijf = async (relpad: string, waarde: unknown) => {
    const volledig = join(boom, relpad);
    await mkdir(dirname(volledig), { recursive: true });
    await writeFile(volledig, `${JSON.stringify(waarde, null, 2)}\n`, "utf8");
  };

  await schrijf("data/geo/provincies.json", {
    provincies: [{ provinciecode: "PV25", naam: "Gelderland", slug: "gelderland" }],
  });
  await schrijf("data/geo/gemeenten.json", {
    gemeenten: [
      {
        gemeentecode: "GM0202",
        naam: "Arnhem",
        slug: "arnhem",
        provinciecode: "PV25",
        provincie_slug: "gelderland",
      },
    ],
  });
  await schrijf("data/seo/oplossingen.json", {
    familieroutes_publiceren: { besluit: "NEE", reden: "Toetsboom; familieroutes doen hier niet mee." },
    families: [
      {
        slug: "energieopslag",
        naam: "Energieopslag",
        regionale_niveaus: [],
        reden: "Toetsboom; deze familie blijft permanent PENDING.",
      },
    ],
  });
  await schrijf("data/seo/nationaal-doel.json", {
    bestaand: [{ route: EIGENAAR, type: "kennis", bezit: "netcongestie", status: "BESTAAND" }],
    nieuw: [],
  });
  /* Leeg, maar wel aanwezig: stap 4 en 7 van het contract lezen hem. */
  await schrijf("data/seo/publicatiebesluit.json", { vrijgegeven: {}, ingetrokken: {} });
  for (const naam of ["vestigingen", "bedrijventerreinen", "netbeheerders", "projecten-geo"]) {
    await schrijf(`data/bewijs/${naam}.json`, { per_gemeente: {} });
  }
  await schrijf("scripts/projecten.json", { projecten: [] });
  await schrijf(`data/inhoud/nieuws/${SLUG}.json`, artikel);

  /* De twee scripts onder toets, plus de enige lib die bouw-routes.mjs
     importeert. Kopieën, zodat een toets nooit in de echte boom schrijft. */
  await mkdir(join(boom, "scripts", "seo", "lib"), { recursive: true });
  await mkdir(join(boom, "intelligence", "ops"), { recursive: true });
  await cp(join(REPO, "scripts", "seo", "bouw-routes.mjs"), join(boom, "scripts", "seo", "bouw-routes.mjs"));
  await cp(join(REPO, "scripts", "seo", "lib", "paden.mjs"), join(boom, "scripts", "seo", "lib", "paden.mjs"));
  await cp(
    join(REPO, "intelligence", "ops", "publicatiecontract.mjs"),
    join(boom, "intelligence", "ops", "publicatiecontract.mjs"),
  );

  /* Stap 6 van het contract eist de zichtbare navigatielink zodra de hub
     op INDEX staat; zonder dit bestand zou een PASS-geval rood worden om
     een reden die niets met goedkeuring te maken heeft. */
  await mkdir(join(boom, "vibe"), { recursive: true });
  await writeFile(join(boom, "vibe", "chrome.js"), "/* toetsnavigatie */ export const NAV = ['/nieuws'];\n", "utf8");

  return boom;
}

type Register = { routes: { route: string; staat: string; reden: string; redactionele_staat?: string }[] };

async function leesRegister(boom: string): Promise<Register> {
  return JSON.parse(await readFile(join(boom, "data", "seo", "routes.json"), "utf8")) as Register;
}

/**
 * De sitemap, afgeleid uit het register.
 *
 * Stap 5 van het contract toetst sitemappariteit, en die stap is hier
 * NIET het onderwerp: hij hoort groen te zijn zodat een rood eindoordeel
 * altijd over de goedkeuring gaat. Daarom wordt de sitemap uit hetzelfde
 * register gemaakt dat de poort ernaast legt. Dat maakt stap 5
 * tautologisch groen in deze suite — met opzet, en het is geen
 * verzwakking van die stap op de echte repository, waar
 * scripts/seo/sitemap.mjs hem bouwt.
 */
async function maakSitemap(boom: string): Promise<void> {
  const register = await leesRegister(boom);
  const urls = register.routes
    .filter((r) => r.staat === "INDEX")
    .map((r) => (r.route === "" ? "https://www.vibeenergy.nl/" : `https://www.vibeenergy.nl/${r.route}`))
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join("\n");
  await writeFile(
    join(boom, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n${urls}\n</urlset>\n`,
    "utf8",
  );
}

/** De volledige keten op één artikelbestand: generator, sitemap, poort. */
async function keten(artikel: Record<string, unknown>): Promise<{
  readonly boom: string;
  readonly generator: Uitkomst;
  readonly route: { route: string; staat: string; reden: string } | undefined;
  readonly poort: Uitkomst;
}> {
  const boom = await maakBoom(artikel);
  const generator = await draai("scripts/seo/bouw-routes.mjs", boom);
  assert.equal(generator.code, 0, `bouw-routes.mjs brak af: ${generator.uit.slice(-800)}`);
  const register = await leesRegister(boom);
  await maakSitemap(boom);
  const poort = await draai("intelligence/ops/publicatiecontract.mjs", boom);
  return { boom, generator, route: register.routes.find((r) => r.route === ARTIKELROUTE), poort };
}

/** De regel van één toets uit de poortuitvoer, op naamfragment. */
function poortregel(uit: string, fragment: string): string {
  const regel = uit.split("\n").find((r) => r.includes(fragment));
  return regel ?? `GEEN REGEL met '${fragment}' in de uitvoer`;
}

after(async () => {
  for (const boom of bomen) await rm(boom, { recursive: true, force: true });
});

/* ================================================================
   1 — EEN MENS MET NAAM
   ================================================================ */
describe("een menselijk goedgekeurd artikel komt door beide poorten", () => {
  let uit: Awaited<ReturnType<typeof keten>>;

  before(async () => {
    uit = await keten(record({ goedkeuringSoort: "mens", goedgekeurdDoor: "R. Reviewer" }));
  });

  test("de generator zet de route op INDEX en noemt de goedkeurder", () => {
    assert.equal(uit.route?.staat, "INDEX", `reden: ${uit.route?.reden}`);
    assert.match(uit.route?.reden ?? "", /Goedgekeurd door R\. Reviewer op 2026-11-02/);
  });

  test("het publicatiecontract is groen", () => {
    assert.equal(uit.poort.code, 0, uit.poort.uit.slice(-1500));
    assert.match(poortregel(uit.poort.uit, "zonder verantwoorde goedkeuring"), /^ {2}PASS/);
    assert.match(poortregel(uit.poort.uit, "elk goedgekeurd nieuwsbestand"), /^ {2}PASS/);
  });

  test("de depublicatiegrendel meldt zich als OVERGESLAGEN, niet als PASS", () => {
    /* In een boom zonder `.git` is er geen basisreferentie. Dat die stap
       dan OVERGESLAGEN heet en niet stil groen wordt, is de reden dat
       overslaan() in die poort bestaat; hier wordt dat ook gemeten. */
    assert.match(uit.poort.uit, /OVERGESLAGEN {2}geen gepubliceerde URL verdwijnt/);
    assert.match(uit.poort.uit, /EINDOORDEEL PUBLICATIECONTRACT = PASS — 1 stap NIET GETOETST/);
  });
});

/* ================================================================
   2 — HET BELEID, LAAG RISICO
   ================================================================ */
describe("een door beleid goedgekeurd laagrisico-artikel komt door beide poorten", () => {
  let uit: Awaited<ReturnType<typeof keten>>;

  before(async () => {
    uit = await keten(
      record({
        goedkeuringSoort: "beleid",
        goedkeurendBeleid: "nieuwsbeleid-2026.11",
        risicoKlasse: "laag",
        /* GEEN naam, en dat is het punt: migratie 0052 laat
           goedgekeurd_door met opzet leeg bij een beleidsgoedkeuring. */
        goedgekeurdDoor: null,
      }),
    );
  });

  test("het record draagt de categorie en laat het naamveld leeg", async () => {
    const bestand = JSON.parse(
      await readFile(join(uit.boom, "data", "inhoud", "nieuws", `${SLUG}.json`), "utf8"),
    ) as Record<string, unknown>;
    assert.equal(bestand["goedkeuring_soort"], "beleid");
    assert.equal(bestand["goedkeurend_beleid"], "nieuwsbeleid-2026.11");
    assert.equal(bestand["risico_klasse"], "laag");
    assert.equal(bestand["goedgekeurd_door"], "", "een beleidsgoedkeuring draagt geen naam");
  });

  test("de generator zet de route op INDEX en noemt de beleidsversie", () => {
    assert.equal(uit.route?.staat, "INDEX", `reden: ${uit.route?.reden}`);
    /* De versie MOET in de reden staan: zonder hem is in het register
       niet na te rekenen onder welke regels er is gepubliceerd. */
    assert.match(uit.route?.reden ?? "", /nieuwsbeleid-2026\.11/);
    assert.match(uit.route?.reden ?? "", /risico laag/);
  });

  test("het publicatiecontract is groen", () => {
    assert.equal(uit.poort.code, 0, uit.poort.uit.slice(-1500));
    assert.match(poortregel(uit.poort.uit, "zonder verantwoorde goedkeuring"), /^ {2}PASS/);
    assert.match(poortregel(uit.poort.uit, "elk goedgekeurd nieuwsbestand"), /^ {2}PASS/);
  });
});

/* ================================================================
   3 — HET BELEID MET RISICO 'HOOG'
   ================================================================ */
describe("een door beleid goedgekeurd artikel met risico 'hoog' wordt geweigerd", () => {
  let uit: Awaited<ReturnType<typeof keten>>;

  before(async () => {
    uit = await keten(
      record({
        goedkeuringSoort: "beleid",
        goedkeurendBeleid: "nieuwsbeleid-2026.11",
        risicoKlasse: "hoog",
        goedgekeurdDoor: null,
      }),
    );
  });

  test("de generator maakt de pagina niet", () => {
    assert.equal(uit.route?.staat, "PENDING");
    assert.match(uit.route?.reden ?? "", /risico_klasse` 'hoog'/);
    assert.match(uit.route?.reden ?? "", /vereist altijd een mens/);
  });

  test("het publicatiecontract faalt erop", () => {
    assert.equal(uit.poort.code, 1, `de poort had rood moeten zijn:\n${uit.poort.uit.slice(-1500)}`);
    assert.match(poortregel(uit.poort.uit, "elk goedgekeurd nieuwsbestand"), /^ {2}FAIL/);
    assert.match(uit.poort.uit, /beleid met risico_klasse 'hoog'/);
    assert.match(uit.poort.uit, /EINDOORDEEL PUBLICATIECONTRACT = FAIL/);
  });
});

/* ================================================================
   4 — GOEDGEKEURD ZONDER ENIGE GOEDKEURING
   ================================================================ */
describe("een artikel zonder enige goedkeuring wordt geweigerd", () => {
  let uit: Awaited<ReturnType<typeof keten>>;

  before(async () => {
    /* Precies wat nieuwsregister.ts wegschreef vóór deze velden
       bestonden: redactionele_staat GOEDGEKEURD en een LEEG naamveld. */
    uit = await keten(record({ goedgekeurdDoor: null }));
  });

  test("het record draagt een leeg naamveld en soort 'mens'", async () => {
    const bestand = JSON.parse(
      await readFile(join(uit.boom, "data", "inhoud", "nieuws", `${SLUG}.json`), "utf8"),
    ) as Record<string, unknown>;
    assert.equal(bestand["redactionele_staat"], "GOEDGEKEURD");
    assert.equal(bestand["goedkeuring_soort"], "mens");
    assert.equal(bestand["goedgekeurd_door"], "");
  });

  test("de generator maakt de pagina niet", () => {
    assert.equal(uit.route?.staat, "PENDING");
    assert.match(uit.route?.reden ?? "", /zonder `goedgekeurd_door`/);
  });

  test("het publicatiecontract faalt erop", () => {
    assert.equal(uit.poort.code, 1, `de poort had rood moeten zijn:\n${uit.poort.uit.slice(-1500)}`);
    assert.match(poortregel(uit.poort.uit, "elk goedgekeurd nieuwsbestand"), /^ {2}FAIL/);
    assert.match(uit.poort.uit, /mens zonder goedgekeurd_door/);
  });
});

/* ================================================================
   5 — HET BELEID ZONDER BELEIDSVERSIE
   ================================================================ */
describe("een 'beleid'-record zonder goedkeurend_beleid wordt geweigerd", () => {
  let uit: Awaited<ReturnType<typeof keten>>;

  before(async () => {
    uit = await keten(
      record({
        goedkeuringSoort: "beleid",
        goedkeurendBeleid: null,
        risicoKlasse: "laag",
        goedgekeurdDoor: null,
      }),
    );
  });

  test("de generator maakt de pagina niet", () => {
    assert.equal(uit.route?.staat, "PENDING");
    assert.match(uit.route?.reden ?? "", /zonder `goedkeurend_beleid`/);
  });

  test("het publicatiecontract faalt erop", () => {
    assert.equal(uit.poort.code, 1, `de poort had rood moeten zijn:\n${uit.poort.uit.slice(-1500)}`);
    assert.match(poortregel(uit.poort.uit, "elk goedgekeurd nieuwsbestand"), /^ {2}FAIL/);
    assert.match(uit.poort.uit, /beleid zonder goedkeurend_beleid/);
  });
});

/* ================================================================
   6 — ACHTERWAARTS COMPATIBEL
   ================================================================ */
describe("een bestand van voor deze regel blijft geldig", () => {
  let uit: Awaited<ReturnType<typeof keten>>;

  before(async () => {
    /* Een bestand zoals het er lag voordat de drie velden bestonden:
       alleen goedgekeurd_door en goedgekeurd_op. De velden worden hier
       VERWIJDERD en niet op een standaard gezet, want dat is precies de
       vorm die op schijf staat. */
    const basis = record({ goedgekeurdDoor: "R. Reviewer" });
    delete basis["goedkeuring_soort"];
    delete basis["goedkeurend_beleid"];
    delete basis["risico_klasse"];
    uit = await keten(basis);
  });

  test("de generator zet de route op INDEX", () => {
    assert.equal(uit.route?.staat, "INDEX", `reden: ${uit.route?.reden}`);
    assert.match(uit.route?.reden ?? "", /Goedgekeurd door R\. Reviewer/);
  });

  test("het publicatiecontract is groen", () => {
    assert.equal(uit.poort.code, 0, uit.poort.uit.slice(-1500));
    assert.match(poortregel(uit.poort.uit, "elk goedgekeurd nieuwsbestand"), /^ {2}PASS/);
  });
});

/* ================================================================
   7 — DE MET DE HAND OP INDEX GEZETTE ROUTE
   ================================================================ */
describe("een met de hand op INDEX gezette route wordt door de poort geweigerd", () => {
  let poort: Uitkomst;
  let generatorstaat = "";

  before(async () => {
    /* De generator weigert dit artikel (geen enkele goedkeuring) en zet
       de route op PENDING. Daarna wordt data/seo/routes.json MET DE HAND
       gewijzigd, zoals een PR dat kan doen: staat INDEX en
       redactionele_staat GOEDGEKEURD. Het bestand zelf blijft onveranderd
       en draagt nog steeds niets wat een goedkeuring verantwoordt. */
    const boom = await maakBoom(record({ goedgekeurdDoor: null }));
    const g = await draai("scripts/seo/bouw-routes.mjs", boom);
    assert.equal(g.code, 0, g.uit.slice(-800));

    const pad = join(boom, "data", "seo", "routes.json");
    const register = JSON.parse(await readFile(pad, "utf8")) as Register;
    const rij = register.routes.find((r) => r.route === ARTIKELROUTE);
    assert.ok(rij, "de nieuwsroute staat niet in het register");
    generatorstaat = rij.staat;
    rij.staat = "INDEX";
    rij.redactionele_staat = "GOEDGEKEURD";
    await writeFile(pad, `${JSON.stringify(register, null, 2)}\n`, "utf8");

    /* De sitemap NA de hand-wijziging, zodat stap 5 groen blijft en het
       rode eindoordeel alleen over de goedkeuring kan gaan. */
    await maakSitemap(boom);
    poort = await draai("intelligence/ops/publicatiecontract.mjs", boom);
  });

  test("de generator had de route zelf op PENDING gezet", () => {
    assert.equal(generatorstaat, "PENDING");
  });

  test("stap 1 van de poort ziet dat het bestand de boeking niet draagt", () => {
    assert.equal(poort.code, 1, `de poort had rood moeten zijn:\n${poort.uit.slice(-1500)}`);
    assert.match(poortregel(poort.uit, "zonder verantwoorde goedkeuring"), /^ {2}FAIL/);
    assert.match(poort.uit, new RegExp(`${ARTIKELROUTE}: GOEDGEKEURD door een mens zonder goedgekeurd_door`));
  });

  test("de sitemappariteit is niet de reden van het rode oordeel", () => {
    assert.match(poortregel(poort.uit, "de sitemap bevat exact"), /^ {2}PASS/);
  });
});
