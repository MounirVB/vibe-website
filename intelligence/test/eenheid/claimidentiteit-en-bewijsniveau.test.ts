/* ============================================================
   EENHEID — claimidentiteit (§4), bewijsniveau (§3), entiteiten (§5)
   ------------------------------------------------------------
   DE DRIE GEMETEN GEVALLEN DIE DEZE MODULES DRAGEN, 6 november 2026:

   §4  brondocument 73052 (rijksoverheid.nl, subsidieregeling
       groepshulpen) heeft 2 versies met dezelfde zin en hetzelfde
       bedrag, en dus 2 claimrijen voor 1 feit. De dedupsleutel in
       schrijfUitspraken() bevat `versie_id` en kan dat niet zien.

   §3  Vijf echte gebeurtenissen gaven 15 ruwe claims en NUL
       bevestigde. Geen van de drie bronnen mag zichzelf bevestigen:
       energie-nederland en netbeheer-nederland staan op
       SECUNDAIRE_BERICHTGEVING / BELANGENBEHARTIGER (plafond 2),
       nkl-laadinfra op FEITELIJKE_MEDEDELING / BELANGENBEHARTIGER
       (plafond 3). 111 van 4.352 bronversies (2,6%) kan zichzelf
       bevestigen.

   §5  32 bronversies over drie bronnen dragen HTML-entiteiten in
       `ruwe_tekst`; 2 claims dragen een DUBBEL geëscapeerde entiteit.
       decodeerEntiteiten() bestond al en werd nergens aangeroepen.
   ============================================================ */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  claimAfdruk,
  canoniekeSleutel,
  kernVanBewering,
  verschilTussen,
  type ClaimKenmerken,
} from "../../src/pijplijn/claimidentiteit.ts";
import {
  bepaalBewijsniveau,
  BEWIJSNIVEAU_LABEL,
  type Waarneming,
} from "../../src/pijplijn/bewijsniveau.ts";
import { decodeerEntiteiten, brontekst } from "../../src/kern/tekst.ts";

/* ================================================================
   §4 · DE CANONIEKE CLAIMIDENTITEIT
   ================================================================ */

const BASIS: ClaimKenmerken = {
  soort: "prijs",
  waardeNumeriek: 1_775_000,
  eenheid: "EUR",
  claimvorm: null,
  datumrol: null,
  geldigVanaf: null,
  geldigTot: null,
  modaliteit: "VASTGESTELD",
  tijdstand: null,
  onderwerp: "subsidie",
  tekst: "Het beschikbare subsidiebudget voor de aanvraagperiode 2026 is EUR 1.775.000.",
};

test("DE KERNZAAK — dezelfde zin in twee bronversies geeft DEZELFDE afdruk", () => {
  /* Het echte geval: brondocument 73052, versies 3925 en 4120. De
     bronversie zit NIET in de afdruk, en dat is het hele punt. */
  assert.equal(claimAfdruk(BASIS), claimAfdruk({ ...BASIS }));
});

test("de afdruk is stabiel en van een vaste lengte", () => {
  const a = claimAfdruk(BASIS);
  assert.equal(a.length, 32);
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.equal(a, claimAfdruk(BASIS), "twee keer dezelfde invoer, twee keer dezelfde afdruk");
});

test("een geherformuleerde zin geeft een ANDERE afdruk — de veilige kant", () => {
  /* Een gemiste samenvoeging kost twee rijen waar één had gekund. De
     andere fout — twee beweringen als één feit tellen — is de dure. */
  const anders = { ...BASIS, tekst: "Voor de aanvraagperiode 2026 is EUR 1.775.000 beschikbaar." };
  assert.notEqual(claimAfdruk(BASIS), claimAfdruk(anders));
});

test("§4-eis · een gewijzigd BEDRAG blijft afzonderlijk herkenbaar", () => {
  const anders = { ...BASIS, waardeNumeriek: 1_800_000 };
  assert.notEqual(claimAfdruk(BASIS), claimAfdruk(anders));
  assert.ok(verschilTussen(BASIS, anders).some((v) => v.startsWith("waarde:")));
});

test("§4-eis · een gewijzigde DATUM blijft afzonderlijk herkenbaar", () => {
  const a = { ...BASIS, soort: "datum", waardeNumeriek: null, geldigVanaf: "2027-07-01" };
  const b = { ...BASIS, soort: "datum", waardeNumeriek: null, geldigVanaf: "2027-08-01" };
  assert.notEqual(claimAfdruk(a), claimAfdruk(b));
  assert.ok(verschilTussen(a, b).some((v) => v.startsWith("geldig_vanaf:")));
});

test("§4-eis · een gewijzigde MODALITEIT blijft afzonderlijk herkenbaar", () => {
  const anders = { ...BASIS, modaliteit: "VOORSTEL" };
  assert.notEqual(claimAfdruk(BASIS), claimAfdruk(anders));
  assert.ok(verschilTussen(BASIS, anders).some((v) => v.startsWith("modaliteit:")));
});

test("§4-eis · een gewijzigde STATUS blijft afzonderlijk herkenbaar", () => {
  const a = { ...BASIS, soort: "status", claimvorm: "SUBSIDIEVENSTER", tijdstand: "IN_WERKING" };
  const b = { ...BASIS, soort: "status", claimvorm: "SUBSIDIEVENSTER", tijdstand: "VERLOPEN" };
  assert.notEqual(claimAfdruk(a), claimAfdruk(b));
  assert.ok(verschilTussen(a, b).some((v) => v.startsWith("tijdstand:")));
});

test("de eenheid telt mee: 8% is niet 8 MW", () => {
  const a = { ...BASIS, soort: "cijfer", waardeNumeriek: 8, eenheid: "%" };
  const b = { ...BASIS, soort: "cijfer", waardeNumeriek: 8, eenheid: "MW" };
  assert.notEqual(claimAfdruk(a), claimAfdruk(b));
});

test("de ONTKENNING telt mee — en dat is de belangrijkste stopwoordkeuze", () => {
  /* 'niet' staat met opzet NIET in de stopwoorden. Zonder dat zouden
     twee tegengestelde beweringen dezelfde afdruk krijgen, en dan zou
     §3 ze als twee bevestigingen van hetzelfde feit tellen. */
  const wel = { ...BASIS, tekst: "Congestiemanagement kan in dit gebied worden toegepast." };
  const niet = { ...BASIS, tekst: "Congestiemanagement kan in dit gebied niet worden toegepast." };
  assert.notEqual(claimAfdruk(wel), claimAfdruk(niet));
});

test("de woordORDE telt mee: A hoger dan B is niet B hoger dan A", () => {
  const ab = { ...BASIS, tekst: "Het nettarief ligt hoger dan het leveringstarief." };
  const ba = { ...BASIS, tekst: "Het leveringstarief ligt hoger dan het nettarief." };
  assert.notEqual(claimAfdruk(ab), claimAfdruk(ba));
});

test("kernVanBewering strijkt stopwoorden en interpunctie, niet de getallen", () => {
  const k = kernVanBewering("De tarieven stijgen in 2027 met 19,4 procent!");
  assert.ok(k.includes("19,4"), k);
  assert.ok(k.includes("2027"), k);
  assert.ok(!k.includes("!"), k);
  assert.ok(!/\bde\b/.test(k), k);
});

test("diakriet maakt geen verschil in de kern", () => {
  assert.equal(
    kernVanBewering("De warmtepomp moet geïnstalleerd zijn"),
    kernVanBewering("De warmtepomp moet geinstalleerd zijn"),
  );
});

test("de leesbare sleutel bevat elk veld dat in de afdruk zit", () => {
  const s = canoniekeSleutel(BASIS);
  assert.ok(s.includes("prijs"));
  assert.ok(s.includes("1775000.000000"), s);
  assert.ok(s.includes("EUR"));
  assert.ok(s.includes("VASTGESTELD"));
  assert.ok(s.includes("subsidie"));
  /* En de velden die er NIET in horen, staan er ook niet in. */
  assert.ok(!s.includes("versie_id"));
  assert.ok(!s.includes("bevestigd"));
});

test("de waarde krijgt een vaste vorm, niet de drukvorm van een float", () => {
  const a = { ...BASIS, waardeNumeriek: 0.1 + 0.2 };
  const b = { ...BASIS, waardeNumeriek: 0.3 };
  /* 0.1+0.2 is 0.30000000000000004 in binaire floats. Een afdruk mag
     niet van die staart afhangen. */
  assert.equal(claimAfdruk(a), claimAfdruk(b));
});

test("verschilTussen zegt expliciet dat er GEEN verschil is", () => {
  assert.deepEqual(verschilTussen(BASIS, { ...BASIS }), [
    "geen verschil: dit is dezelfde claim",
  ]);
});

/* ================================================================
   §3 · DE VIJF BEWIJSNIVEAUS
   ================================================================ */

function waarneming(over: Partial<Waarneming> = {}): Waarneming {
  return {
    uitspraakId: 1,
    bronSleutel: "energie-nederland-nieuws",
    brondocumentId: 10,
    versieId: 100,
    gezag: "BELANGENBEHARTIGER",
    documentsoort: "SECUNDAIRE_BERICHTGEVING",
    magZelfBevestigen: false,
    verificatieStatus: "ongeverifieerd",
    waardeNumeriek: 20,
    eenheid: "%",
    ...over,
  };
}

test("niveau · DIRECT_BEVESTIGD bij een primaire bron met gezag", () => {
  const r = bepaalBewijsniveau([
    waarneming({
      bronSleutel: "acm-besluiten",
      gezag: "BEVOEGD_GEZAG",
      documentsoort: "OFFICIEEL_BESLUIT",
      magZelfBevestigen: true,
      verificatieStatus: "bevestigd",
    }),
  ]);
  assert.equal(r.niveau, "DIRECT_BEVESTIGD");
  assert.match(r.reden, /eigen publicatie/);
});

test("niveau · MEERVOUDIG_BEVESTIGD bij twee onafhankelijke bronnen", () => {
  const r = bepaalBewijsniveau([
    waarneming({ uitspraakId: 1, bronSleutel: "energie-nederland-nieuws" }),
    waarneming({ uitspraakId: 2, bronSleutel: "netbeheer-nederland-nieuws" }),
  ]);
  assert.equal(r.niveau, "MEERVOUDIG_BEVESTIGD");
  assert.equal(r.onafhankelijkeBronnen, 2);
  /* EN HET MOET ERBIJ STAAN DAT DIT GEEN VASTSTELLING IS. */
  assert.match(r.reden, /geen vaststelling/);
});

test("DE KERNZAAK VAN §3 — twee VERSIES van dezelfde bron zijn ÉÉN waarneming", () => {
  /* De opdracht noemt dit met naam: "Voorkom dat twee versies van
     dezelfde bron als twee onafhankelijke bevestigingen worden
     geteld." Het echte geval is brondocument 73052 met 2 versies. */
  const r = bepaalBewijsniveau([
    waarneming({ uitspraakId: 1, versieId: 3925, brondocumentId: 73052 }),
    waarneming({ uitspraakId: 2, versieId: 4120, brondocumentId: 73052 }),
  ]);
  assert.equal(r.onafhankelijkeBronnen, 1, "één bron, niet twee");
  assert.equal(r.waarnemingen, 2, "en wel twee waarnemingen — dat blijft zichtbaar");
  assert.notEqual(r.niveau, "MEERVOUDIG_BEVESTIGD");
  assert.equal(r.niveau, "ALLEEN_BELANGENBEHARTIGING");
});

test("en twee DOCUMENTEN van dezelfde uitgever ook", () => {
  const r = bepaalBewijsniveau([
    waarneming({ uitspraakId: 1, brondocumentId: 10 }),
    waarneming({ uitspraakId: 2, brondocumentId: 11 }),
  ]);
  assert.equal(r.onafhankelijkeBronnen, 1);
  assert.notEqual(r.niveau, "MEERVOUDIG_BEVESTIGD");
});

test("niveau · ALLEEN_BELANGENBEHARTIGING bij één branchebron", () => {
  const r = bepaalBewijsniveau([waarneming()]);
  assert.equal(r.niveau, "ALLEEN_BELANGENBEHARTIGING");
  assert.match(r.reden, /niet de bron van het feit/);
});

test("niveau · NIET_BEVESTIGD bij één marktbron", () => {
  const r = bepaalBewijsniveau([waarneming({ gezag: "MARKT" })]);
  assert.equal(r.niveau, "NIET_BEVESTIGD");
});

test("niveau · TEGENSTRIJDIG wint van alles", () => {
  const r = bepaalBewijsniveau([
    waarneming({ uitspraakId: 1, bronSleutel: "bron-a", waardeNumeriek: 20, eenheid: "%" }),
    waarneming({ uitspraakId: 2, bronSleutel: "bron-b", waardeNumeriek: 25, eenheid: "%" }),
    waarneming({
      uitspraakId: 3,
      bronSleutel: "acm-besluiten",
      gezag: "BEVOEGD_GEZAG",
      magZelfBevestigen: true,
      verificatieStatus: "bevestigd",
      waardeNumeriek: 20,
      eenheid: "%",
    }),
  ]);
  assert.equal(r.niveau, "TEGENSTRIJDIG", r.reden);
  assert.match(r.reden, /een mens hoort te kijken/);
});

test("dezelfde bron met twee waarden is GEEN tegenspraak tussen bronnen", () => {
  /* Dat is een correctie, en die hoort via intel.uitspraak_correcties
     te gaan. Een tegenspraak is per definitie tussen bronnen. */
  const r = bepaalBewijsniveau([
    waarneming({ uitspraakId: 1, waardeNumeriek: 20 }),
    waarneming({ uitspraakId: 2, waardeNumeriek: 25 }),
  ]);
  assert.notEqual(r.niveau, "TEGENSTRIJDIG");
});

test("een andere EENHEID is geen tegenspraak", () => {
  const r = bepaalBewijsniveau([
    waarneming({ uitspraakId: 1, bronSleutel: "bron-a", waardeNumeriek: 20, eenheid: "%" }),
    waarneming({ uitspraakId: 2, bronSleutel: "bron-b", waardeNumeriek: 25, eenheid: "MW" }),
  ]);
  assert.notEqual(r.niveau, "TEGENSTRIJDIG");
});

test("nul waarnemingen is NIET_BEVESTIGD en geen fout", () => {
  const r = bepaalBewijsniveau([]);
  assert.equal(r.niveau, "NIET_BEVESTIGD");
  assert.equal(r.onafhankelijkeBronnen, 0);
});

test("elk niveau heeft een label voor het dashboard", () => {
  for (const n of [
    "DIRECT_BEVESTIGD",
    "MEERVOUDIG_BEVESTIGD",
    "ALLEEN_BELANGENBEHARTIGING",
    "NIET_BEVESTIGD",
    "TEGENSTRIJDIG",
  ] as const) {
    assert.ok(BEWIJSNIVEAU_LABEL[n].length > 5, n);
  }
});

test("de reden haalt altijd de 20 tekens die 0055 eist", () => {
  const gevallen: Waarneming[][] = [
    [],
    [waarneming()],
    [waarneming({ gezag: "MARKT" })],
    [waarneming({ uitspraakId: 1, bronSleutel: "a" }), waarneming({ uitspraakId: 2, bronSleutel: "b" })],
    [
      waarneming({ bronSleutel: "a", waardeNumeriek: 1 }),
      waarneming({ bronSleutel: "b", waardeNumeriek: 2 }),
    ],
    [waarneming({ magZelfBevestigen: true, verificatieStatus: "bevestigd" })],
  ];
  for (const g of gevallen) {
    const r = bepaalBewijsniveau(g);
    assert.ok(r.reden.length >= 20, `${r.niveau}: "${r.reden}"`);
  }
});

/* ================================================================
   §5 · DE ENTITEITEN
   ================================================================ */

test("DE KERNZAAK VAN §5 — de twee echte productiestrings worden schoon", () => {
  /* Woordelijk de twee claims uit productie, na de laag die ze
     opleverde: xmlEntiteiten() heeft de XML-laag al gedecodeerd, en
     wat overblijft is de HTML-laag die niemand decodeerde. */
  assert.equal(
    brontekst("De Autoriteit Consument &amp;amp; Markt (ACM) heeft een voorstel gepubliceerd"),
    "De Autoriteit Consument & Markt (ACM) heeft een voorstel gepubliceerd",
  );
  assert.equal(
    brontekst("De warmtepomp moet uiterlijk 31 december 2026 zijn ge&amp;iuml;nstalleerd"),
    "De warmtepomp moet uiterlijk 31 december 2026 zijn geïnstalleerd",
  );
});

test("alle acht gemeten entiteitsnamen worden gedecodeerd", () => {
  /* De namen zijn geteld in productie: nbsp 36, amp 12, rsquo 8,
     euml 8, iuml 4, eacute 4, ouml 2, ecirc 2. */
  const uit = brontekst("a&nbsp;b &amp; c&rsquo;d co&euml;p ge&iuml;n caf&eacute; co&ouml;p cr&ecirc;pe");
  assert.ok(!/&[a-z]+;/i.test(uit), `er staat nog een entiteit in: ${uit}`);
  assert.ok(uit.includes("coöp"), uit);
  assert.ok(uit.includes("geïn"), uit);
  assert.ok(uit.includes("café"), uit);
  assert.ok(uit.includes("crêpe"), uit);
});

test("MEETHAAK — dubbel geëscapete MARKUP wordt GEEN markup", () => {
  /* GEFORCEERD EN GEMETEN met de code van vóór deze reparatie:

       in : tekst &amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;
       uit: tekst <script>alert(1)</script>

     Dat is een betekeniswijziging in een broncitaat, en htmlNaarTekst()
     strijkt tags weg VOORDAT er wordt gedecodeerd — dus markup die ná
     het decoderen ontstaat, overleeft in ruwe_tekst. */
  const uit = decodeerEntiteiten("tekst &amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt; einde");
  assert.ok(!uit.includes("<script>"), uit);
  assert.ok(!uit.includes("</script>"), uit);
  /* Wat er WEL hoort te staan: de leesbare weergave van wat de bron
     bedoelde. */
  assert.ok(uit.includes("&lt;script&gt;"), uit);
});

test("MEETHAAK — een numerieke dubbel-escape levert ook geen markup", () => {
  const uit = decodeerEntiteiten("tekst &amp;#60;script&amp;#62; einde");
  assert.ok(!uit.includes("<script>"), uit);
});

test("ÉÉN slag decodeert markup wél — dat is de bedoelde decodering", () => {
  /* Een bron die één keer encodeert, bedoelt het teken. Alleen de
     TWEEDE slag is verdacht. */
  assert.equal(decodeerEntiteiten("a &lt;b&gt; c"), "a <b> c");
});

test("het uitpakken blijft begrensd", () => {
  const diep = "&amp;".repeat(20) + "amp;";
  const uit = decodeerEntiteiten(diep);
  assert.ok(uit.length < diep.length);
  assert.ok(uit.includes("&"));
});

test("brontekst normaliseert NA het decoderen", () => {
  /* Een gedecodeerde '&nbsp;' is een harde spatie, en die hoort de
     witruimteregel nog te zien. Andersom bleef er een U+00A0 staan. */
  const uit = brontekst("a&nbsp;&nbsp;&nbsp;b");
  assert.equal(uit, "a b");
  assert.ok(!uit.includes(" "));
});
