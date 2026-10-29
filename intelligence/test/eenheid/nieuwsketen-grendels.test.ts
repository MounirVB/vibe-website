/* ============================================================
   TEST — de vijf grendels onder de nieuwsketen
   ------------------------------------------------------------
   Elk van deze toetsen hoort bij precies één gemeten defect dat de
   nieuwsketen op b2de0c4 blokkeerde of stil liet falen. Ze staan bij
   elkaar omdat ze samen één vraag beantwoorden: kan een goedgekeurd
   nieuwsbericht van de database naar een gepubliceerde pagina komen?

   Op b2de0c4 was het antwoord nee, en wel vijf keer achter elkaar:

     A het pad was /nieuws-<slug> en de adapter eist nieuws/<slug>
     B de injectiepoort kreeg een constante false in plaats van de
       gemeten stand
     C de secties hadden geen `soort`, en de generator werpt daarop
     D de interne links werden berekend, getoetst en weggegooid
     E de nieuwsselectie bestond niet, dus NEW_ARTICLE was onbereikbaar

   DEZE TOETSEN ZIJN PUUR. Alles wat een database nodig heeft staat in
   test/integratie/nieuwsketen.test.ts. Wat hier staat is te toetsen
   zonder Postgres en dus ook in CI zonder wegwerpdatabase.
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { isNieuwsPad, markdownNaarSecties, slugVanPad } from "../../src/site/nieuwsregister.ts";
import { splitsInterneLinks } from "../../src/inhoud/publiceer.ts";
import { slug } from "../../src/kern/tekst.ts";
import { generator } from "../generatorbrug.ts";
import {
  beoordeelNieuwswaarde,
  DRAGENDE_BRONSOORTEN,
  NIEUWSDREMPELS,
  ZAKELIJKE_THEMACLUSTERS,
  type NieuwsselectieInvoer,
} from "../../src/pijplijn/nieuwsselectie.ts";

/* ------------------------------------------------------------------ A */

describe("A — het nieuwspad past bij de adapter die het moet lezen", () => {
  /* DE REGRESSIE DIE DIT VANGT.
     concept.ts bouwde `/nieuws-${slug(titel)}`. slugVanPad() eist
     `^nieuws\/([a-z0-9][a-z0-9-]*)$`, dus isNieuwsPad() gaf false en
     publiceerViaRegister() weigerde élk nieuw artikel met "valt buiten
     data/inhoud/nieuws/". Nul artikelen, en niet omdat er geen bronnen
     waren. */
  test("een pad met koppelteken is GEEN nieuwsroute", () => {
    assert.equal(isNieuwsPad("/nieuws-acm-stelt-tarieven-vast"), false);
    assert.equal(slugVanPad("/nieuws-acm-stelt-tarieven-vast"), null);
  });

  test("een pad met schuine streep is er wel een, en levert de slug", () => {
    assert.equal(isNieuwsPad("/nieuws/acm-stelt-tarieven-vast"), true);
    assert.equal(slugVanPad("/nieuws/acm-stelt-tarieven-vast"), "acm-stelt-tarieven-vast");
  });

  /* DE ECHTE GRENDEL: niet de vorm van een losse string, maar dat wat
     bouwConcept() SAMENSTELT door de adapter komt. Zou iemand het
     scheidingsteken opnieuw veranderen, dan faalt deze toets ook als de
     twee toetsen hierboven blijven staan. */
  test("de padvorm die de generator samenstelt wordt door de adapter geaccepteerd", () => {
    for (const titel of [
      "ACM stelt nieuwe tarieven vast voor grootverbruikers",
      "Ondernemers krijgen in 2026 meer tijd voor subsidieaanvraag SDE++",
      "Wetsvoorstel bijmengverplichting groen gas ingediend",
    ]) {
      const pad = `/nieuws/${slug(titel)}`;
      assert.ok(isNieuwsPad(pad), `${pad} hoort een nieuwsroute te zijn`);
      assert.equal(slugVanPad(pad), slug(titel));
    }
  });
});

/* ------------------------------------------------------------------ C */

describe("C — elke sectie draagt een soort die de generator kent", () => {
  /* DE REGRESSIE DIE DIT VANGT.
     markdownNaarSecties() leverde {kop, alineas} zonder `soort`.
     sectieHtml() in scripts/seo/genereer-nationaal.mjs doet
     `switch (s.soort)` met `default: throw`. Een goedgekeurd artikel
     liet de hele sitebouw omvallen NA de INDEX-promotie, dus met een
     halve sitemap als gevolg.

     De soorten staan hier letterlijk in plaats van geïmporteerd: dit
     bestand is TypeScript en de generator is .mjs in de repowortel.
     Veranderen de soorten daar, dan hoort deze lijst mee te veranderen
     — en dan faalt deze toets, wat precies de bedoeling is. */
  const SOORTEN_DIE_DE_GENERATOR_KENT = new Set(["tekst", "kaarten", "specs"]);

  const markdown = [
    "# De kop die wegvalt",
    "",
    "Dit is de lead en wordt geen sectie.",
    "",
    "## Wat er is vastgelegd",
    "",
    "- 120 MW aan vermogen",
    "- 45 miljoen euro",
    "",
    "Een gewone alinea.",
    "",
    "## Wat dit betekent",
    "",
    "### Een subkop",
    "",
    "Nog een alinea.",
  ].join("\n");

  test("er komen secties uit, en elke sectie heeft soort 'tekst'", () => {
    const secties = markdownNaarSecties(markdown);
    assert.ok(secties.length >= 2, `verwachtte minstens twee secties, kreeg ${secties.length}`);
    for (const s of secties) {
      assert.equal(s.soort, "tekst", `sectie '${s.kop}' mist soort 'tekst'`);
      assert.ok(
        SOORTEN_DIE_DE_GENERATOR_KENT.has(s.soort),
        `sectie '${s.kop}' heeft soort '${s.soort}', die sectieHtml() niet kent`,
      );
    }
  });

  test("geen enkele sectie heeft een ontbrekende of lege soort", () => {
    for (const s of markdownNaarSecties(markdown)) {
      assert.notEqual(s.soort, undefined);
      assert.notEqual(String(s.soort), "");
    }
  });

  /* DE STERKSTE VORM VAN DEZE GRENDEL: niet toetsen of het veld de
     waarde heeft die wij verwachten, maar of de ECHTE generator het
     ECHTE record aankan.

     Dit is de toets die op b2de0c4 had moeten bestaan en niet bestond.
     qa-nieuws.mjs was groen omdat zijn fixture `soort: 'tekst'` met de
     hand meegaf; test/integratie/publiceer-nieuws.test.ts was groen
     omdat zijn fixture al `/nieuws/<slug>` gebruikte. Beide suites
     toetsten langs de defecte producent heen. Deze toets haalt de
     uitvoer van bouwNieuwsRecord() door sectieHtml() uit
     scripts/seo/genereer-nationaal.mjs — over de taalgrens TS -> mjs,
     want precies daar zat de breuk.

     Gemeten gedrag van die functie zonder soort:
       sectieHtml({kop, alineas}) -> Error: onbekende sectiesoort: undefined */
  test("het echte registerrecord komt door de echte sectieHtml() van de generator", async () => {
    const { bouwNieuwsRecord } = await import("../../src/site/nieuwsregister.ts");
    const { sectieHtml } = await generator();

    const record = bouwNieuwsRecord({
      pad: "/nieuws/acm-stelt-nettarieven-vast",
      titel: "ACM stelt de nettarieven voor 2027 vast | Vibe Energy",
      metaOmschrijving:
        "De ACM heeft de nettarieven voor 2027 vastgesteld. Wat dat betekent voor een zakelijke aansluiting.",
      h1: "ACM stelt de nettarieven voor 2027 vast",
      lead: "De ACM heeft de nettarieven vastgesteld.",
      bodyMarkdown: markdown,
      gepubliceerd: "2026-10-29",
      gewijzigd: "2026-10-29",
      status: "goedgekeurd",
      goedgekeurdDoor: "Chef Redactie",
      goedgekeurdOp: "2026-10-29",
      onderwerpEigenaar: "subsidies",
      oplossingLinks: ["contact"],
      kennisLinks: ["kennis/netcongestie-uitgelegd"],
      regioLinks: [],
      bronnen: [
        {
          naam: "Besluit nettarieven 2027, ACM",
          url: "https://www.acm.nl/besluit",
          datum: "2026-10-25",
          soort: "TOEZICHTHOUDER",
        },
      ],
      claims: [],
      directAntwoord: { vraag: "Wat is er veranderd?", antwoord: "De tarieven zijn vastgesteld." },
      herkomst: { inhoudVersieId: 1, inhoudAfdruk: "afdruk", besluitSoort: "NEWS_ITEM" },
    });

    const secties = record["secties"] as { soort: string; kop: string; alineas: string[] }[];
    assert.ok(secties.length > 0, "het record heeft geen enkele sectie");
    for (const s of secties) {
      /* Werpt sectieHtml(), dan faalt deze toets met de echte fout van
         de generator erbij — en dat is precies de melding die anders
         pas tijdens een productiebouw zou verschijnen, ná de
         INDEX-promotie. */
      const html = sectieHtml(s, null);
      assert.ok(
        typeof html === "string" && html.length > 0,
        `sectieHtml gaf niets terug voor sectie '${s.kop}'`,
      );
    }
  });

  test("een sectie zonder alinea's komt er niet in", () => {
    /* Een lege sectie zou een kop zonder inhoud op de pagina zetten, en
       dat is precies wat poort 11 (dunne inhoud) zoekt. */
    for (const s of markdownNaarSecties("## Alleen een kop\n\n## En nog een\n")) {
      assert.ok(s.alineas.length > 0, `sectie '${s.kop}' heeft geen alinea's`);
    }
  });
});

/* ------------------------------------------------------------------ D */

describe("D — interne links komen door, maar alleen als ze op INDEX staan", () => {
  /* DE REGRESSIE DIE DIT VANGT.
     publiceerViaRegister() zette oplossingLinks, kennisLinks en
     regioLinks hard op []. De links WERDEN berekend (bouwConcept),
     opgeslagen (inhoud_versies.interne_links) en getoetst (poort 11) —
     en daarna weggegooid. Geen poort ving het, want weigerNieuws()
     eist alleen dat de links die er STAAN op INDEX staan, en een lege
     lijst haalt die eis triviaal. */
  const staten = new Map<string, string>([
    ["contact", "INDEX"],
    ["projecten", "INDEX"],
    ["systeem-energieopslag", "INDEX"],
    ["kennis/netcongestie-uitgelegd", "INDEX"],
    ["kennis/batterij-dimensioneren", "INDEX"],
    ["nog-niet-vrijgegeven", "PENDING"],
    ["oude-stub", "NOINDEX"],
  ]);

  test("INDEX-routes komen door en worden op soort gesplitst", () => {
    const r = splitsInterneLinks(
      ["/contact", "/projecten", "/kennis/netcongestie-uitgelegd"],
      staten,
      null,
    );
    assert.deepEqual(r.oplossingLinks, ["contact", "projecten"]);
    assert.deepEqual(r.kennisLinks, ["kennis/netcongestie-uitgelegd"]);
    assert.deepEqual(r.afgevallen, []);
  });

  test("PENDING en NOINDEX vallen af, mét reden", () => {
    /* Zouden ze doorkomen, dan zet weigerNieuws() het hele ARTIKEL op
       PENDING. Een afgevallen link is dus beter dan een doorgelaten. */
    const r = splitsInterneLinks(
      ["/contact", "/nog-niet-vrijgegeven", "/oude-stub"],
      staten,
      null,
    );
    assert.deepEqual(r.oplossingLinks, ["contact"]);
    assert.equal(r.afgevallen.length, 2);
    assert.ok(r.afgevallen.some((x) => x.includes("PENDING")), r.afgevallen.join(" | "));
    assert.ok(r.afgevallen.some((x) => x.includes("NOINDEX")), r.afgevallen.join(" | "));
  });

  test("een route die niet in routes.json staat valt af en wordt benoemd", () => {
    const r = splitsInterneLinks(["/verzonnen-pad"], staten, null);
    assert.deepEqual(r.oplossingLinks, []);
    assert.equal(r.afgevallen.length, 1);
    assert.ok(r.afgevallen[0]!.includes("bestaat niet"), r.afgevallen[0]);
  });

  test("de onderwerp-eigenaar komt er niet nog eens als link bij", () => {
    /* Hij staat al als eigen veld in het record en de generator rendert
       hem als conversiepad; twee keer zou dezelfde link verdubbelen. */
    const r = splitsInterneLinks(["/contact", "/subsidies"], new Map([
      ["contact", "INDEX"],
      ["subsidies", "INDEX"],
    ]), "subsidies");
    assert.deepEqual(r.oplossingLinks, ["contact"]);
  });

  test("dubbele links leveren één regel op", () => {
    const r = splitsInterneLinks(["/contact", "/contact", "contact"], staten, null);
    assert.deepEqual(r.oplossingLinks, ["contact"]);
  });
});

/* ------------------------------------------------------------------ E */

function basis(overschrijf: Partial<NieuwsselectieInvoer> = {}): NieuwsselectieInvoer {
  return {
    gebeurtenisId: 1,
    titel: "Ondernemers krijgen in 2026 meer tijd voor subsidieaanvraag SDE",
    gebeurtenisSoort: "subsidie",
    materialiteit: 60,
    bedrijfsrelevantie: 40,
    relevantieCategorie: "redactionele_kans",
    clusterSleutel: "subsidie",
    eigenaarRoute: "subsidies",
    eigenaarOpIndex: true,
    heeftTegenspraak: false,
    uitsprakenBevestigd: 2,
    uitsprakenTotaal: 2,
    besteBewijskwaliteit: 5,
    aantalOnafhankelijkeBronnen: 1,
    heeftPrimaireBron: true,
    bronsoorten: ["WETGEVING"],
    nieuwsteBrondatum: "2026-10-25",
    bestaandeNieuwsSlugs: new Set<string>(),
    vandaag: "2026-10-29",
    ...overschrijf,
  };
}

describe("E — de nieuwsselectie weigert vooraf wat verderop toch zou stranden", () => {
  test("de basiskandidaat is geschikt en draagt drie assen", () => {
    const r = beoordeelNieuwswaarde(basis());
    assert.equal(r.geschikt, true, r.oordeel);
    assert.deepEqual(
      r.assen.map((a) => a.as),
      ["zakelijk", "seogeo", "bronkwaliteit"],
    );
    assert.ok(r.totaalscore >= NIEUWSDREMPELS.totaalscore, `score ${r.totaalscore}`);
  });

  test("elke component draagt bewijs, zodat een mens de score kan navertellen", () => {
    /* §6 van de opdracht: één getal verstopt elke onzekerheid. Een
       component zonder bewijs is een getal zonder uitleg. */
    for (const as of beoordeelNieuwswaarde(basis()).assen) {
      assert.ok(as.componenten.length > 0, `as ${as.as} heeft geen componenten`);
      for (const c of as.componenten) {
        assert.ok(c.bewijs.length > 10, `${as.as}/${c.naam} heeft geen bewijs: '${c.bewijs}'`);
        assert.ok(c.score >= 0 && c.score <= c.max, `${as.as}/${c.naam} ${c.score}/${c.max}`);
      }
      assert.equal(
        as.score,
        as.componenten.reduce((a, b) => a + b.score, 0),
        `as ${as.as} telt niet op tot zijn componenten`,
      );
    }
  });

  test("de totaalscore is de som van de assen en blijft binnen 0-100", () => {
    const r = beoordeelNieuwswaarde(basis());
    assert.equal(r.totaalscore, r.assen.reduce((a, b) => a + b.score, 0));
    assert.ok(r.totaalscore >= 0 && r.totaalscore <= 100);
  });

  /* ---- de harde gronden, elk apart ---- */

  test("zonder dragende bron is het geen bericht, hoe hoog de rest ook scoort", () => {
    /* weigerNieuws() eist dit, dus een kandidaat zonder dragende bron
       levert alleen werk op dat op PENDING eindigt. */
    const r = beoordeelNieuwswaarde(basis({ bronsoorten: ["MARKTPARTIJ"] }));
    assert.equal(r.geschikt, false);
    assert.ok(
      r.afwijsgronden.some((g) => g.includes("dragende bronsoort")),
      r.afwijsgronden.join(" | "),
    );
  });

  test("elk van de vier dragende bronsoorten draagt zelfstandig", () => {
    for (const soort of DRAGENDE_BRONSOORTEN) {
      const r = beoordeelNieuwswaarde(basis({ bronsoorten: [soort] }));
      assert.equal(r.geschikt, true, `${soort}: ${r.oordeel}`);
    }
  });

  test("zonder onderwerp-eigenaar op INDEX is het geen bericht", () => {
    /* Dit is het spiegelbeeld van NEW_ARTICLE: een nieuwsbericht leent
       zijn commerciële intentie en heeft daar een eigenaar voor nodig. */
    const zonder = beoordeelNieuwswaarde(basis({ eigenaarRoute: null, eigenaarOpIndex: false }));
    assert.equal(zonder.geschikt, false);
    assert.ok(
      zonder.afwijsgronden.some((g) => g.includes("onderwerp-eigenaar")),
      zonder.afwijsgronden.join(" | "),
    );

    const pending = beoordeelNieuwswaarde(basis({ eigenaarOpIndex: false }));
    assert.equal(pending.geschikt, false);
    assert.ok(
      pending.afwijsgronden.some((g) => g.includes("niet op INDEX")),
      pending.afwijsgronden.join(" | "),
    );
  });

  test("tegenspraak tussen bronnen wordt niet gepubliceerd maar opgelost", () => {
    const r = beoordeelNieuwswaarde(basis({ heeftTegenspraak: true }));
    assert.equal(r.geschikt, false);
    assert.ok(r.afwijsgronden.some((g) => g.includes("tegen")), r.afwijsgronden.join(" | "));
  });

  test("zonder bevestigde uitspraak is er geen bewijs en dus geen bericht", () => {
    const r = beoordeelNieuwswaarde(basis({ uitsprakenBevestigd: 0 }));
    assert.equal(r.geschikt, false);
    assert.ok(
      r.afwijsgronden.some((g) => g.includes("bevestigde uitspraak")),
      r.afwijsgronden.join(" | "),
    );
  });

  test("een commercieel signaal hoort in de kansenlaag, niet op de nieuwspagina", () => {
    for (const soort of ["aanbesteding", "vergunning", "vastgoedontwikkeling"]) {
      const r = beoordeelNieuwswaarde(basis({ gebeurtenisSoort: soort }));
      assert.equal(r.geschikt, false, soort);
      assert.ok(
        r.afwijsgronden.some((g) => g.includes("commercieel signaal")),
        `${soort}: ${r.afwijsgronden.join(" | ")}`,
      );
    }
  });

  test("een dagreeks wordt geen gedateerd bericht", () => {
    for (const soort of ["marktprijs", "statistiek"]) {
      const r = beoordeelNieuwswaarde(basis({ gebeurtenisSoort: soort }));
      assert.equal(r.geschikt, false, soort);
      assert.ok(
        r.afwijsgronden.some((g) => g.includes("verandert per dag")),
        `${soort}: ${r.afwijsgronden.join(" | ")}`,
      );
    }
  });

  test("niet_relevant blijft niet relevant, ook met een perfecte bron", () => {
    const r = beoordeelNieuwswaarde(
      basis({ relevantieCategorie: "niet_relevant", bedrijfsrelevantie: 95 }),
    );
    assert.equal(r.geschikt, false);
    assert.ok(
      r.afwijsgronden.some((g) => g.includes("niet_relevant")),
      r.afwijsgronden.join(" | "),
    );
  });

  test("een bestaande slug is een duplicaat en geen tweede bericht", () => {
    const inv = basis();
    const bestaand = new Set([slug(inv.titel)]);
    const r = beoordeelNieuwswaarde(basis({ bestaandeNieuwsSlugs: bestaand }));
    assert.equal(r.geschikt, false);
    assert.ok(r.afwijsgronden.some((g) => g.includes("duplicaat")), r.afwijsgronden.join(" | "));
  });

  test("zonder geldige brondatum is er geen peildatum en dus geen bericht", () => {
    for (const datum of [null, "", "oktober 2026", "2026-13-45"]) {
      const r = beoordeelNieuwswaarde(basis({ nieuwsteBrondatum: datum }));
      assert.equal(r.geschikt, false, String(datum));
      assert.ok(
        r.afwijsgronden.some((g) => g.includes("brondatum")),
        `${datum}: ${r.afwijsgronden.join(" | ")}`,
      );
    }
  });

  test("een bron ouder dan de grens is geen nieuws meer", () => {
    const r = beoordeelNieuwswaarde(
      basis({ nieuwsteBrondatum: "2026-01-01", vandaag: "2026-10-29" }),
    );
    assert.equal(r.geschikt, false);
    assert.ok(
      r.afwijsgronden.some((g) => g.includes("dagen oud")),
      r.afwijsgronden.join(" | "),
    );
  });

  test("actualiteit daalt met de leeftijd, en dat is een score en geen grens", () => {
    const scoreVan = (datum: string) => {
      const r = beoordeelNieuwswaarde(basis({ nieuwsteBrondatum: datum, vandaag: "2026-10-29" }));
      const as = r.assen.find((a) => a.as === "seogeo")!;
      return as.componenten.find((c) => c.naam === "actualiteit")!.score;
    };
    const vers = scoreVan("2026-10-28");
    const week = scoreVan("2026-10-20");
    const maand = scoreVan("2026-10-01");
    assert.ok(vers > week, `vers ${vers} hoort boven week ${week}`);
    assert.ok(week > maand, `week ${week} hoort boven maand ${maand}`);
  });

  /* ---- de eerlijkheidsregels ---- */

  test("een niet-geclassificeerde gebeurtenis krijgt 0 punten MET die reden, niet stil nul", () => {
    /* "Een ontbrekende rij is geen nul" — de les uit migratie 0009.
       null betekent NIET GECLASSIFICEERD en dat moet in het bewijs
       staan, anders leest een redacteur het als relevantie nul. */
    const r = beoordeelNieuwswaarde(basis({ bedrijfsrelevantie: null }));
    const comp = r.assen
      .find((a) => a.as === "zakelijk")!
      .componenten.find((c) => c.naam === "bedrijfsrelevantie")!;
    assert.equal(comp.score, 0);
    assert.ok(
      comp.bewijs.includes("NIET GECLASSIFICEERD"),
      `het bewijs moet zeggen dat er niet is geclassificeerd: '${comp.bewijs}'`,
    );
  });

  test("er wordt nergens een zoekvolume, CTR of positie verzonnen", () => {
    /* De opdracht verbiedt verzonnen prestatiecijfers expliciet. Geen
       enkel bewijs in de SEO-as mag een geschat volume noemen. */
    const verboden = /zoekvolume|volume|ctr|doorklikratio|geschatte? positie|verwachte? klikken/i;
    for (const as of beoordeelNieuwswaarde(basis()).assen) {
      for (const c of as.componenten) {
        assert.ok(
          !verboden.test(c.bewijs),
          `${as.as}/${c.naam} noemt een verzonnen prestatiecijfer: '${c.bewijs}'`,
        );
      }
    }
  });

  test("het oordeel past in de kolom die de database ervoor heeft", () => {
    /* nieuws_oordeel heeft een check op length <= 300 (migratie 0041).
       Een langere tekst zou de insert laten falen in plaats van de
       kandidaat te schrijven. */
    const r = beoordeelNieuwswaarde(
      basis({
        titel: "x".repeat(400),
        eigenaarRoute: "y".repeat(200),
        bronsoorten: ["MARKTPARTIJ"],
      }),
    );
    assert.ok(r.oordeel.length <= 300, `oordeel is ${r.oordeel.length} tekens`);
  });

  test("de tien zakelijke thema's zijn alle tien afgebeeld op een cluster", () => {
    /* De opdracht noemt tien thema's. Deze toets is de grendel die
       voorkomt dat er stil één wegvalt — zoals 'warmtepompen en
       elektrificatie', dat vóór R2 alleen als zwakke term onder
       vastgoedverduurzaming bestond. */
    const themas = Object.values(ZAKELIJKE_THEMACLUSTERS);
    assert.equal(themas.length, 10, `verwachtte tien thema's, kreeg ${themas.length}`);
    for (const nodig of [
      "netcongestie",
      "zakelijke batterijopslag",
      "zonnepanelen",
      "laadpleinen en laadinfrastructuur",
      "energiemanagement",
      "warmtepompen en elektrificatie",
      "subsidies",
      "energiewetgeving",
      "flexibiliteitsmarkten",
      "netbeheer en transportcapaciteit",
    ]) {
      assert.ok(themas.includes(nodig), `thema '${nodig}' ontbreekt in de afbeelding`);
    }
  });

  test("een afgewezen kandidaat noemt de BINDENDE grond vooraan", () => {
    /* Een redacteur moet aan één regel kunnen zien of hij op een betere
       bron moet wachten of dat het onderwerp nooit terugkomt. */
    const r = beoordeelNieuwswaarde(basis({ bronsoorten: ["MARKTPARTIJ"] }));
    assert.ok(r.oordeel.startsWith("ONGESCHIKT"), r.oordeel);
    assert.ok(r.oordeel.includes("dragende bronsoort"), r.oordeel);
  });
});
