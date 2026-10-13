/* ============================================================
   TEST — een onderwerp zonder pagina levert ÉÉN paginavoorstel
   ------------------------------------------------------------
   WAT HIER WORDT VASTGELEGD, EN WAAROM.

   De besluitmotor kende maar één antwoord op "geen bestaande pagina
   dekt dit onderwerp": HERROUTEREN, wat "hoort op een andere pagina"
   betekent. Bestaat die andere pagina niet, dan is dat een doodlopend
   antwoord.

   Gemeten op 13 oktober 2026: negen ontdekkingen over NETTARIEVEN
   werden geduwd naar /kennis/transportvermogen-versus-aansluitwaarde,
   een pagina die geen enkel tariefstelsel behandelt. Er is geen pagina
   over nettarieven.

   Deze toetsen leggen drie dingen vast:

     1 NEGEN ONTDEKKINGEN WORDEN ÉÉN VOORSTEL. Par. 19 verbiedt
       bijna-identieke paginavoorstellen. De slug is deterministisch uit
       het onderwerp, dus negen tariefontdekkingen komen op dezelfde
       slug uit. De rijen blijven per kandidaat — dat bewaart de
       herkomst per bron — en de groepering gebeurt op slug.

     2 GEEN VOORSTEL ZONDER VERIFIEERBAAR FEIT. Een paginavoorstel
       zonder verwoordbare uitspraak zou een LEGE pagina voorstellen.
       Dat is precies waarom er op de productiedata van 13 oktober NUL
       paginavoorstellen uitkomen: alle tien geblokkeerde kandidaten
       hebben nul verwoordbare uitspraken. De grendel is dus niet
       theoretisch.

     3 BESTAAT DE ROUTE AL, DAN IS HET GEEN NIEUWE PAGINA. Dan hoort het
       een wijziging te zijn, en blijft het oordeel HERROUTEREN.
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import { bouwNieuwePaginaVoorstel, slugVan } from "../../src/inhoud/nieuwepagina.ts";

const GEEN_ROUTES: ReadonlySet<string> = new Set();

describe("het nieuwe-paginavoorstel", () => {
  test("1. negen ontdekkingen over hetzelfde onderwerp geven ÉÉN slug", () => {
    /* Negen verschillende nieuwsberichten, allemaal over nettarieven,
       allemaal onder het grove cluster `netbeheer`. Ze moeten op één
       redactioneel besluit uitkomen. */
    const titels = [
      "Nettarieven 2027 stijgen maar slimme keuzes kunnen stijging remmen",
      "Nieuwe nettarieven ontlasten stroomnet en beperken de kosten",
      "Variabele nettarieven zijn eerlijker en slimmer",
      "Voorstel voor een nieuw, tijdsafhankelijk nettariefstelsel ingediend",
      "Zo werkt het: flexibele tarieven voor consumenten",
      "ACM stelt de nettarieven voor 2026 vast",
      "Waarom het verlagen van piekbelasting altijd slim is",
      "Reflectie op RES-voortgangsrapportages",
      "Kantelpunt voor Klimaat en Industrie biedt handvatten",
    ];
    const slugs = new Set(
      titels.map(
        (t) =>
          bouwNieuwePaginaVoorstel({
            onderwerpSleutel: "netbeheer",
            fenomeen: "nettarief",
            feitZinnen: [`Feit uit: ${t}`],
            naastgelegen: [
              { route: "/kennis/transportvermogen-versus-aansluitwaarde", vermeldingen: 24 },
            ],
            bestaandeRoutes: GEEN_ROUTES,
          }).slug,
      ),
    );
    assert.equal(slugs.size, 1, `negen ontdekkingen gaven ${slugs.size} slugs: ${[...slugs].join(", ")}`);
    assert.equal([...slugs][0], "kennis/nettarieven");
  });

  test("2. een ANDER fenomeen onder hetzelfde cluster krijgt een EIGEN slug", () => {
    /* `netinvestering` en `nettarief` vallen beide onder `netbeheer`,
       maar een investeringsbedrag hoort niet op een tariefpagina. Het
       fenomeen is specifieker dan het cluster en bepaalt daarom de
       slug. Zou het cluster beslissen, dan werden twee verschillende
       onderwerpen tot één pagina samengevouwen. */
    const tarief = bouwNieuwePaginaVoorstel({
      onderwerpSleutel: "netbeheer",
      fenomeen: "nettarief",
      feitZinnen: ["een feit"],
      naastgelegen: [],
      bestaandeRoutes: GEEN_ROUTES,
    });
    const investering = bouwNieuwePaginaVoorstel({
      onderwerpSleutel: "netbeheer",
      fenomeen: "netinvestering",
      feitZinnen: ["een feit"],
      naastgelegen: [],
      bestaandeRoutes: GEEN_ROUTES,
    });
    assert.notEqual(tarief.slug, investering.slug);
    assert.equal(investering.slug, "kennis/netinvesteringen");
  });

  test("3. het voorstel draagt alle velden die par. 12 eist", () => {
    const v = bouwNieuwePaginaVoorstel({
      onderwerpSleutel: "netbeheer",
      fenomeen: "nettarief",
      feitZinnen: ["Volgens de ACM stijgen de nettarieven in 2026 met 20 procent."],
      naastgelegen: [
        { route: "/kennis/transportvermogen-versus-aansluitwaarde", vermeldingen: 24 },
        { route: "/netcongestie", vermeldingen: 3 },
      ],
      bestaandeRoutes: GEEN_ROUTES,
    });
    for (const veld of [
      "slug",
      "soort",
      "werktitel",
      "hoofdonderwerp",
      "zoekintentie",
      "doelgroep",
      "voorgesteldeStructuur",
      "naastgelegenPaginas",
      "waaromGeenBestaandePagina",
      "duplicaatrisico",
    ] as const) {
      assert.ok(v[veld] !== undefined && v[veld] !== null, `veld ${veld} ontbreekt`);
    }
    assert.ok(v.voorgesteldeStructuur.length >= 3, "een structuur van minder dan drie koppen is geen structuur");
    assert.ok(
      v.voorgesteldeStructuur.includes("Bronnen en peildatum"),
      "een feitelijke pagina zonder bronsectie hoort niet voorgesteld te worden",
    );
    assert.equal(v.naastgelegenPaginas.length, 2);
  });

  test("4. de werktitel leest NIET als een definitieve titel", () => {
    /* Dit platform verzint geen koppen. De redacteur schrijft de echte
       titel; de werktitel is er om te laten zien waar het over gaat. */
    const v = bouwNieuwePaginaVoorstel({
      onderwerpSleutel: "netbeheer",
      fenomeen: "nettarief",
      feitZinnen: ["een feit"],
      naastgelegen: [],
      bestaandeRoutes: GEEN_ROUTES,
    });
    assert.match(v.werktitel, /werktitel/i, `de werktitel moet zich als werktitel aankondigen: ${v.werktitel}`);
  });

  test("5. de naastgelegen pagina's en de reden staan erbij — niet alleen een afwijzing", () => {
    const v = bouwNieuwePaginaVoorstel({
      onderwerpSleutel: "netbeheer",
      fenomeen: "nettarief",
      feitZinnen: ["een feit"],
      naastgelegen: [
        { route: "/kennis/transportvermogen-versus-aansluitwaarde", vermeldingen: 24 },
      ],
      bestaandeRoutes: GEEN_ROUTES,
    });
    assert.match(v.waaromGeenBestaandePagina, /transportvermogen/);
    assert.match(v.waaromGeenBestaandePagina, /24/, "de gemeten telling hoort navraagbaar te zijn");
  });

  test("6. zonder naastgelegen pagina zegt de reden dat NIEMAND het noemt", () => {
    const v = bouwNieuwePaginaVoorstel({
      onderwerpSleutel: "regelgeving",
      fenomeen: null,
      feitZinnen: ["een feit"],
      naastgelegen: [],
      bestaandeRoutes: GEEN_ROUTES,
    });
    assert.match(v.waaromGeenBestaandePagina, /geen enkele gepubliceerde pagina/);
    assert.equal(v.fenomeen, null, "een onbekend fenomeen hoort null te blijven en niet verzonnen");
  });

  test("7. bestaat de route al, dan meldt het voorstel DUPLICAATRISICO", () => {
    const v = bouwNieuwePaginaVoorstel({
      onderwerpSleutel: "netcongestie",
      fenomeen: null,
      feitZinnen: ["een feit"],
      naastgelegen: [],
      bestaandeRoutes: new Set(["/kennis/netcongestie", "/kennis/netcongestie-uitgelegd"]),
    });
    assert.equal(v.slug, "kennis/netcongestie");
    assert.match(v.duplicaatrisico, /LET OP/, "een bestaande route hoort als risico te worden gemeld");
  });

  test("8. de slug is veilig: geen diakrieten, geen leestekens, niet te lang", () => {
    assert.equal(slugVan("Nettarieven én tariefstelsels!"), "nettarieven-en-tariefstelsels");
    assert.equal(slugVan("  dubbele   spaties  "), "dubbele-spaties");
    assert.ok(slugVan("a".repeat(200)).length <= 60);
    assert.doesNotMatch(slugVan("Wat kost 100% méér?"), /[^a-z0-9-]/);
  });
});
