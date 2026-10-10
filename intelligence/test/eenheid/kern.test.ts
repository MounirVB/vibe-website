/* ============================================================
   TEST — kern: normalisatie, hashing, wijzigingsdetectie, logging
   ============================================================ */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  bepaalWijziging,
  gebeurtenisSleutel,
  htmlNaarTekst,
  inhoudHash,
  kort,
  normaliseerTekst,
  slug,
  verschilRatio,
  voorHash,
} from "../../src/kern/tekst.ts";
import { schoon } from "../../src/kern/log.ts";
import { httpHerhaalbaar, IntelFout } from "../../src/kern/fouten.ts";

test("normaliseerTekst haalt zero-width en harde spaties weg", () => {
  const ruw = "net​congestie is lastig";
  assert.equal(normaliseerTekst(ruw), "netcongestie is lastig");
});

test("normaliseerTekst is idempotent", () => {
  const een = normaliseerTekst("  a \n\n\n b  \t c  ");
  assert.equal(normaliseerTekst(een), een);
});

test("htmlNaarTekst houdt blokstructuur en decodeert entiteiten", () => {
  const html = "<p>Vermogen&nbsp;is 5&nbsp;MW</p><li>tarief &euro; 12</li>";
  const tekst = htmlNaarTekst(html);
  assert.match(tekst, /Vermogen is 5 MW/);
  assert.match(tekst, /tarief € 12/);
});

test("htmlNaarTekst gooit script- en styleblokken weg", () => {
  const html = "<p>echt</p><script>alert('nep')</script><style>.x{}</style>";
  assert.equal(htmlNaarTekst(html), "echt");
});

test("voorHash maakt tijdstempels en cachebusters onzichtbaar", () => {
  const a = voorHash("Gepubliceerd 2026-10-10T08:30:00Z met ?v=123 en abcdef0123456789abcdef0123456789");
  const b = voorHash("Gepubliceerd 2026-10-11T09:31:00Z met ?v=999 en 99999999999999999999999999999999");
  assert.equal(a, b, "alleen wisselende metadata mag de hash niet veranderen");
});

test("inhoudHash is stabiel bij alleen een nieuw tijdstempel", () => {
  const a = inhoudHash("Titel", "Bijgewerkt op 2026-01-01T10:00:00Z. Vermogen 5 MW.");
  const b = inhoudHash("Titel", "Bijgewerkt op 2026-02-02T11:11:11Z. Vermogen 5 MW.");
  assert.equal(a, b);
});

test("inhoudHash verandert wel bij een ander getal", () => {
  const a = inhoudHash("Titel", "Vermogen 5 MW.");
  const b = inhoudHash("Titel", "Vermogen 6 MW.");
  assert.notEqual(a, b);
});

test("bepaalWijziging noemt een eerste versie nieuw", () => {
  const r = bepaalWijziging(null, "wat dan ook");
  assert.equal(r.soort, "nieuw");
});

test("bepaalWijziging ziet een gewijzigd getal als materieel, ook bij lage ratio", () => {
  const oud = "De beschikbare transportcapaciteit in dit gebied bedraagt 120 MW volgens de netbeheerder.";
  const nieuw = "De beschikbare transportcapaciteit in dit gebied bedraagt 140 MW volgens de netbeheerder.";
  const r = bepaalWijziging(oud, nieuw);
  assert.equal(r.getalWijziging, true);
  assert.equal(r.soort, "materieel", "een ander getal is altijd materieel");
});

test("bepaalWijziging: alleen witruimte verschil is cosmetisch", () => {
  const oud = "De netbeheerder meldt dat er geen transportcapaciteit beschikbaar is.";
  const nieuw = "De netbeheerder   meldt dat er geen\n\ntransportcapaciteit beschikbaar is.";
  const r = bepaalWijziging(oud, nieuw);
  assert.equal(r.ratio, 0, "normalisatie hoort witruimte weg te poetsen");
  assert.equal(r.soort, "cosmetisch");
});

test("bepaalWijziging: één woord anders in een lange alinea blijft cosmetisch", () => {
  // De drempel is 8%. In een alinea van deze lengte is één vervangen
  // woord daar ruim onder, en dan is er geen nieuwe verwerking nodig.
  const kern =
    "De regionale netbeheerder laat weten dat er in grote delen van het voorzieningsgebied " +
    "voorlopig geen ruimte is voor nieuwe aansluitingen van grootverbruikers, en dat " +
    "aanvragen in een wachtrij worden geplaatst die periodiek opnieuw beoordeeld wordt. " +
    "Bedrijven die eerder een aanvraag hebben ingediend houden hun plaats in die rij, en " +
    "worden schriftelijk bericht zodra er capaciteit beschikbaar komt in hun gebied.";
  const r = bepaalWijziging(kern, kern.replace("schriftelijk", "per brief"));
  assert.equal(r.getalWijziging, false);
  assert.ok(r.ratio < 0.08, `ratio was ${r.ratio}`);
  assert.equal(r.soort, "cosmetisch");
});

test("bepaalWijziging: een forse herschrijving is materieel, ook zonder nieuw getal", () => {
  const oud = "De netbeheerder meldt dat er geen transportcapaciteit beschikbaar is.";
  const nieuw = "Vanaf volgende maand komt er juist extra ruimte vrij op het net in deze regio.";
  const r = bepaalWijziging(oud, nieuw);
  assert.equal(r.soort, "materieel");
});

test("verschilRatio is 0 voor identiek en hoog voor onverwant", () => {
  assert.equal(verschilRatio("zelfde tekst hier", "zelfde tekst hier"), 0);
  assert.ok(verschilRatio("netcongestie in gelderland", "kantoormeubilair aanbesteding") > 0.8);
});

test("gebeurtenisSleutel is onafhankelijk van woordorde", () => {
  const datum = new Date("2026-05-05T00:00:00Z");
  const a = gebeurtenisSleutel("netcongestie", "Nettarieven stijgen in 2027 flink", datum);
  const b = gebeurtenisSleutel("netcongestie", "In 2027 stijgen nettarieven flink", datum);
  assert.equal(a, b);
});

test("gebeurtenisSleutel verschilt per onderwerp en per dag", () => {
  const titel = "Zelfde kop over netcapaciteit en tarieven";
  const d1 = new Date("2026-05-05T00:00:00Z");
  const d2 = new Date("2026-05-06T00:00:00Z");
  assert.notEqual(
    gebeurtenisSleutel("netcongestie", titel, d1),
    gebeurtenisSleutel("subsidie", titel, d1),
  );
  assert.notEqual(
    gebeurtenisSleutel("netcongestie", titel, d1),
    gebeurtenisSleutel("netcongestie", titel, d2),
  );
});

test("kort breekt op een woordgrens", () => {
  const r = kort("een tamelijk lange zin die afgekapt moet worden", 20);
  assert.ok(r.length <= 21);
  assert.ok(!r.includes("afgekapt"), "mag niet midden in een woord eindigen");
});

test("slug verwijdert diakrieten en leestekens", () => {
  assert.equal(slug("Zonnepark Súdwest-Fryslân, fase 2!"), "zonnepark-sudwest-fryslan-fase-2");
});

test("logafscherming verbergt verdachte sleutels", () => {
  const r = schoon({ api_key: "sk-geheimgeheimgeheim", gewoon: "zichtbaar" });
  assert.equal(r["api_key"], "[verborgen]");
  assert.equal(r["gewoon"], "zichtbaar");
});

test("logafscherming verbergt een token dat in een waarde staat", () => {
  const r = schoon({ bericht: "mislukt met sk-abcdefghijklmnopqrstuvwxyz123456" });
  assert.ok(!String(r["bericht"]).includes("abcdefghijkl"), String(r["bericht"]));
  assert.match(String(r["bericht"]), /\[verborgen\]/);
});

test("logafscherming verbergt een wachtwoord in een Postgres-DSN", () => {
  const r = schoon({ dsn: "postgresql://piet:supergeheim@host:5432/db" });
  assert.ok(!String(r["dsn"]).includes("supergeheim"));
});

test("httpHerhaalbaar onderscheidt tijdelijk van definitief", () => {
  assert.equal(httpHerhaalbaar(503), true);
  assert.equal(httpHerhaalbaar(429), true);
  assert.equal(httpHerhaalbaar(404), false);
  assert.equal(httpHerhaalbaar(403), false);
});

test("IntelFout kiest een verstandige herhaalbaarheid per soort", () => {
  assert.equal(new IntelFout("netwerk", "x").herhaalbaar, true);
  assert.equal(new IntelFout("poort", "x").herhaalbaar, false);
  assert.equal(new IntelFout("bron_voorwaarden", "x").herhaalbaar, false);
});
