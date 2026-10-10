/* ============================================================
   TEST — gebiedsherkenning
   ------------------------------------------------------------
   De gevaarlijkste fout hier is een VALSE binding: een gemeentenaam
   die eigenlijk een gewoon woord was, waardoor een marktfeit aan de
   verkeerde regio hangt. De tweede is een GEMISTE binding, want een
   deel van de feeds schrijft volledig in kleine letters.

   Beide staan hieronder met echte voorbeelden uit de 138
   gebeurtenissen van 10 oktober 2026.
   ============================================================ */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  AMBIGUE_NAMEN,
  herkenGebieden,
  impactSoortVan,
  RISICONAMEN,
  type GebiedIndex,
} from "../../src/regio/gebieden.ts";

const index: GebiedIndex = {
  gemeenten: [
    { soort: "gemeente", code: "0268", naam: "Nijmegen" },
    { soort: "gemeente", code: "0202", naam: "Arnhem" },
    { soort: "gemeente", code: "0546", naam: "Leiden" },
    { soort: "gemeente", code: "0753", naam: "Best" },
    { soort: "gemeente", code: "0888", naam: "Beek" },
    { soort: "gemeente", code: "0355", naam: "Zeist" },
    { soort: "gemeente", code: "0014", naam: "Groningen" },
    { soort: "gemeente", code: "0344", naam: "Utrecht" },
    { soort: "gemeente", code: "1948", naam: "Berg en Dal" },
  ],
  provincies: [
    { soort: "provincie", code: "25", naam: "Gelderland" },
    { soort: "provincie", code: "28", naam: "Zuid-Holland" },
    { soort: "provincie", code: "20", naam: "Groningen" },
    { soort: "provincie", code: "26", naam: "Utrecht" },
  ],
  netbeheerders: [
    { soort: "netbeheerdergebied", code: "002Liander", naam: "Liander N.V" },
    { soort: "netbeheerdergebied", code: "stedin", naam: "Stedin" },
  ],
};

const codes = (titel: string, tekst = "") =>
  herkenGebieden(titel, tekst, index).treffers.map((t) => `${t.soort}:${t.code}`).sort();

// ---------------- echte gevallen uit de feeds ----------------

test("echt geval: een volledig kleingeschreven titel wordt toch herkend", () => {
  // Deze titel staat letterlijk in de database. Een eerdere versie
  // eiste een hoofdletter en vond hier NIETS.
  const t = codes(
    "vijf bedrijven in nijmegen zetten samen met liander belangrijke stap in aanpak netcongestie",
  );
  assert.ok(t.includes("gemeente:0268"), `Nijmegen niet gevonden: ${t.join(", ")}`);
  assert.ok(t.includes("netbeheerdergebied:002Liander"), `Liander niet gevonden: ${t.join(", ")}`);
});

test("echt geval: 'zuid holland' zonder streepje vindt de provincie Zuid-Holland", () => {
  const t = codes("actieplan netcongestie zuid holland slimmer omgaan met schaarse ruimte");
  assert.ok(t.includes("provincie:28"), `Zuid-Holland niet gevonden: ${t.join(", ")}`);
});

// ---------------- valse bindingen ----------------

test("valse binding: 'het best passende tarief' is niet de gemeente Best", () => {
  const t = codes("De netbeheerder kiest het best passende tarief voor grootverbruik");
  assert.deepEqual(t, [], `onverwachte treffers: ${t.join(", ")}`);
});

test("valse binding: 'Best' met hoofdletter maar zonder aanwijzing wordt geweigerd met reden", () => {
  const uit = herkenGebieden("Best of both worlds voor netbeheer", "", index);
  assert.deepEqual(uit.treffers, []);
  assert.equal(uit.afwijzingen.length, 1);
  assert.match(uit.afwijzingen[0]!.reden, /gewoon woord of te kort/);
});

test("valse binding: 'in de beek' met kleine letter raakt gemeente Beek niet", () => {
  const t = codes("Een warmtepomp die water uit de beek gebruikt");
  assert.deepEqual(t, []);
});

test("risiconaam MET aanwijzing wordt wel gebonden", () => {
  assert.ok(codes("Nieuw zonnepark in gemeente Best geopend").includes("gemeente:0753"));
  assert.ok(codes("Netverzwaring in Beek van start").includes("gemeente:0888"));
  assert.ok(codes("Batterij bij Zeist e.o. in gebruik").includes("gemeente:0355"));
});

test("elke risiconaam staat in de lijst om een reden", () => {
  // Regressiewacht: wie een naam uit RISICONAMEN haalt, moet dat
  // bewust doen. Deze namen zijn gemeten tegen de 342 gemeentenamen.
  for (const n of ["Best", "Beek", "Ede", "Epe", "Oss", "Urk", "Zeist", "Sluis", "Stein"]) {
    assert.ok(RISICONAMEN.has(n), `${n} hoort een risiconaam te zijn`);
  }
});

// ---------------- ambigue namen ----------------

test("ambigu: 'in Utrecht' zonder niveau bindt NIETS en zegt waarom", () => {
  const uit = herkenGebieden("Netcongestie in Utrecht loopt op", "", index);
  const t = uit.treffers.map((x) => `${x.soort}:${x.code}`);
  assert.deepEqual(t, [], `er had niets gebonden mogen worden, kreeg: ${t.join(", ")}`);
  assert.equal(uit.afwijzingen.length, 1);
  assert.match(uit.afwijzingen[0]!.reden, /zowel een gemeente als een provincie/);
});

test("ambigu: 'gemeente Utrecht' bindt de gemeente", () => {
  assert.deepEqual(codes("Zonnepark in gemeente Utrecht"), ["gemeente:0344"]);
});

test("ambigu: 'provincie Groningen' bindt de provincie", () => {
  assert.deepEqual(codes("Waterstofplan van provincie Groningen"), ["provincie:20"]);
});

test("ambigu: beide namen staan in de guard", () => {
  assert.ok(AMBIGUE_NAMEN.has("Groningen"));
  assert.ok(AMBIGUE_NAMEN.has("Utrecht"));
});

// ---------------- expliciete codes ----------------

test("code: een expliciete CBS-code wint en levert code_match", () => {
  const uit = herkenGebieden("Besluit over GM0268 en PV25", "", index);
  const t = uit.treffers.map((x) => `${x.soort}:${x.code}`).sort();
  assert.deepEqual(t, ["gemeente:0268", "provincie:25"]);
  for (const x of uit.treffers) assert.equal(x.grondslag, "code_match");
});

test("bewijs: elke treffer draagt een naspeurbare reden", () => {
  for (const t of herkenGebieden("Netcongestie in Arnhem", "", index).treffers) {
    assert.ok(t.bewijs.length > 10, "bewijs mag niet leeg zijn");
    assert.match(t.bewijs, /titel|tekst/, "het bewijs noemt de vindplaats");
  }
});

// ---------------- impactsoort ----------------

test("impactsoort: netcongestie en netbeheer worden netcapaciteit", () => {
  assert.equal(impactSoortVan("netcongestie"), "netcapaciteit");
  assert.equal(impactSoortVan("netbeheer"), "netcapaciteit");
});

test("impactsoort: een onbekend onderwerp levert NIETS, geen verzonnen soort", () => {
  assert.equal(impactSoortVan("iets-onbekends"), null);
  assert.equal(impactSoortVan(null), null);
});

test("meervoudige gemeentenaam met losse woorden blijft heel", () => {
  assert.ok(codes("Project in Berg en Dal opgeleverd").includes("gemeente:1948"));
});
