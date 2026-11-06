/* ============================================================
   ADVERSARIEEL — besluiten vol 'standpunt', 'stelt' en 'volgens'
   ------------------------------------------------------------
   §2 vraagt deze toetsen met naam: "Voeg adversariële tests toe voor
   besluiten die veel woorden als 'standpunt', 'stelt' en 'volgens'
   bevatten."

   DE MEETGRONDSLAG, 6 november 2026. Het echte ACM-geschilbesluit
   Jumbo – Liander (8 pagina's, 24.054 tekens) kwam uit op:

     soort OPINIE, gezag BEVOEGD_GEZAG, vorm BEKENDMAKING, plafond 1
     grondslag: 1 opiniesignaal — "standpunt"

   Eén woord, uit de paragraafkop 'Standpunten van partijen', haalde
   een besluit van het bevoegd gezag van plafond 5 naar plafond 1 — en
   daarmee uit de enige bronsoort die een bevestigde claim kan dragen.

   In datzelfde stuk staat 'Volgens Jumbo' 14 keer en 'stelt dat' 5
   keer. Dat zijn de woorden waarmee een zorgvuldig besluit de
   standpunten van partijen weergeeft, en ze mogen het stuk niet
   degraderen.

   DE VIER ONDERSCHEIDINGEN UIT §2 worden hier alle vier getoetst, en
   elk met zijn tegenproef:

     a een officieel besluit dat standpunten beschrijft -> BESLUIT
     b een opinieartikel van een organisatie            -> OPINIE
     c een aankondiging van een besluit                 -> geen besluit
     d een werkelijk vastgesteld besluit                -> BESLUIT
   ============================================================ */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bepaalDocumentsoort,
  bewijskrachtPlafond,
  magZelfBevestigen,
  leesBesluitStructuur,
  EIGEN_GEZAG_NAMEN,
} from "../../src/pijplijn/documentsoort.ts";
import { steltStukDeClaimVast } from "../../src/pijplijn/vaststelling.ts";

/* ------------------------------------------------------------------
   DE FIXTURES

   Woordelijk gemodelleerd op het echte besluit: dezelfde
   paragraafkoppen, dezelfde administratieve kop, dezelfde dichtheid
   aan 'Volgens X' en 'stelt dat'.
   ------------------------------------------------------------------ */

const ACM_BESLUIT_TITEL = "Geschilbesluit Jumbo – Liander over congestierapport";
const ACM_BESLUIT = [
  "Ons kenmerk : ACM/UIT/1123013",
  "Zaaknummer : ACM/25/198549",
  "Datum : 25 september 2026",
  "Besluit van de Autoriteit Consument en Markt als bedoeld in artikel 5.4 van de Energiewet",
  "op de klacht van Jumbo Supermarkten B.V. over de inhoud van het door Liander N.V.",
  "herziene congestierapport van 17 april 2025.",
  "",
  "1. Verloop van de procedure",
  "Op 6 oktober 2025 heeft de ACM een klacht ontvangen van Jumbo Supermarkten B.V.",
  "",
  "4. Wettelijk kader",
  "Op grond van artikel 5.4 van de Energiewet beslecht de ACM geschillen.",
  "",
  "5. Standpunten van partijen:",
  "Jumbo stelt dat de gronden om geen congestiemanagement toe te passen niet voldoen.",
  "Volgens Jumbo heeft Liander onvoldoende onderzocht of flexibiliteit beschikbaar is.",
  "Volgens Jumbo is het rapport ondeugdelijk. Volgens Jumbo stelt Liander te hoge eisen.",
  "Liander stelt dat het rapport wel aan de eisen voldoet. Volgens Liander is er geen ruimte.",
  "Volgens Liander stelt de Netcode geen verdere eisen. Volgens Liander is het onderzoek compleet.",
  "",
  "6. Beoordeling van het geschil",
  "De ACM stelt vast dat het congestierapport van Liander niet in overeenstemming is met",
  "de eisen van de Netcode.",
  "",
  "7. Dictum",
  "De Autoriteit Consument en Markt verklaart de klacht van Jumbo gegrond.",
  "Belanghebbenden kunnen tegen dit besluit beroep instellen bij de rechtbank.",
].join("\n");

const OPINIESTUK_TITEL = "Onze visie op de nieuwe nettarieven";
const OPINIESTUK = [
  "Als branchevereniging volgen wij de ontwikkeling van de nettarieven nauwlettend.",
  "Ons standpunt is helder: de voorgestelde systematiek legt de rekening bij de verkeerde partij.",
  "Volgens ons is er een eerlijker verdeling mogelijk. Wij vinden dat de ACM dit moet herzien.",
  "Dit is een opinie van onze vereniging en geen weergave van vastgesteld beleid.",
].join("\n");

const AANKONDIGING_TITEL = "ACM stelt nieuwe tarieven vast voor 2027";
const AANKONDIGING = [
  "De Autoriteit Consument en Markt heeft vandaag de nettarieven voor 2027 vastgesteld.",
  "Volgens de ACM stijgen de tarieven gemiddeld met 20 procent.",
  "Het besluit is vanmiddag gepubliceerd. Meer informatie staat op de website van de ACM.",
].join("\n");

function classificeer(titel: string, tekst: string, bron: string, uitgeverSoort: string) {
  return bepaalDocumentsoort({
    titel,
    tekst,
    bronSleutel: bron,
    uitgeverSoort: uitgeverSoort as never,
  });
}

/* ================================================================
   a + d · EEN OFFICIEEL BESLUIT DAT STANDPUNTEN BESCHRIJFT
   ================================================================ */

test("a · een besluit met 7x 'volgens' en 5x 'stelt dat' blijft een BESLUIT", () => {
  const r = classificeer(ACM_BESLUIT_TITEL, ACM_BESLUIT, "acm-besluiten", "toezichthouder");
  assert.equal(r.soort, "OFFICIEEL_BESLUIT", JSON.stringify(r.grondslag));
  assert.equal(r.gezag, "BEVOEGD_GEZAG");
  assert.equal(bewijskrachtPlafond(r.soort, r.gezag), 5);
  assert.equal(magZelfBevestigen(r.soort, r.gezag), true);
});

test("a2 · de dichtheid van 'volgens' en 'stelt' maakt geen verschil", () => {
  /* DE ADVERSARIËLE KERN: verdrievoudig de standpuntensectie en de
     uitslag mag niet kantelen. Een classificatie die van een AANTAL
     afhangt, kantelt bij het volgende besluit dat net iets
     uitvoeriger is. */
  const meer = ACM_BESLUIT.replace(
    "Volgens Liander stelt de Netcode geen verdere eisen.",
    Array.from(
      { length: 12 },
      (_, i) => `Volgens Liander stelt de Netcode geen verdere eisen (${i}).`,
    ).join(" "),
  );
  const r = classificeer(ACM_BESLUIT_TITEL, meer, "acm-besluiten", "toezichthouder");
  assert.equal(r.soort, "OFFICIEEL_BESLUIT", JSON.stringify(r.grondslag));
  assert.equal(bewijskrachtPlafond(r.soort, r.gezag), 5);
});

test("a3 · zelfs met het woord 'opinie' erin blijft de structuur beslissen", () => {
  /* De structuurbescherming moet ook werken als een besluit het woord
     letterlijk gebruikt — "partijen hebben hun opinie gegeven". */
  const metOpinie = `${ACM_BESLUIT}\nPartijen hebben hun opinie schriftelijk gegeven.`;
  const r = classificeer(ACM_BESLUIT_TITEL, metOpinie, "acm-besluiten", "toezichthouder");
  assert.equal(r.soort, "OFFICIEEL_BESLUIT", JSON.stringify(r.grondslag));
  /* En het signaal blijft wél in de grondslag staan: gemeten is
     gemeten, ook als het niet beslist. */
  const regels = r.grondslag.signalen.join(" | ");
  assert.match(regels, /besluitstructuur/);
});

test("d · de structuurlezer vindt alle vijf de markeringen", () => {
  const s = leesBesluitStructuur(`${ACM_BESLUIT_TITEL}\n${ACM_BESLUIT}`);
  assert.equal(s.administratieveIdentiteit, true);
  assert.equal(s.wettelijkeGrondslag, true);
  assert.equal(s.dictum, true);
  assert.equal(s.rechtsmiddel, true);
  assert.equal(s.partijstandpunten, true);
  assert.equal(s.isVastgesteldBesluit, true);
});

/* ================================================================
   b · EEN OPINIEARTIKEL VAN EEN ORGANISATIE
   ================================================================ */

test("b · een opiniestuk van een vereniging blijft OPINIE", () => {
  const r = classificeer(
    OPINIESTUK_TITEL,
    OPINIESTUK,
    "energie-nederland-nieuws",
    "belangenbehartiger",
  );
  assert.ok(
    r.soort === "OPINIE" || r.soort === "LOBBYDOCUMENT",
    `verwacht OPINIE of LOBBYDOCUMENT, kreeg ${r.soort}: ${JSON.stringify(r.grondslag)}`,
  );
  assert.ok(bewijskrachtPlafond(r.soort, r.gezag) <= 2);
  assert.equal(magZelfBevestigen(r.soort, r.gezag), false);
});

test("b2 · een opiniestuk heeft geen besluitstructuur", () => {
  const s = leesBesluitStructuur(`${OPINIESTUK_TITEL}\n${OPINIESTUK}`);
  assert.equal(s.administratieveIdentiteit, false);
  assert.equal(s.isVastgesteldBesluit, false);
});

test("b3 · MEETHAAK — een opiniestuk met een bevoegde afzender komt er niet door", () => {
  /* De uitzondering in stap 1 eist DRIE dingen. Hier is eis 1 gehaald
     (bevoegd gezag) maar eis 3 niet (geen besluitstructuur), dus het
     opiniesignaal verlaagt onverkort. Zonder deze zaak zou een
     toezichthouder die een blog schrijft plafond 5 krijgen. */
  const r = classificeer(
    "Onze visie op congestiemanagement",
    "Ons standpunt is dat congestiemanagement sneller moet. Wij vinden de huidige aanpak te traag. " +
      "Dit is een blog van onze organisatie.",
    "acm-besluiten",
    "toezichthouder",
  );
  assert.ok(
    r.soort === "OPINIE" || r.soort === "LOBBYDOCUMENT",
    `verwacht een verlaging, kreeg ${r.soort}`,
  );
  assert.ok(bewijskrachtPlafond(r.soort, r.gezag) <= 2);
});

/* ================================================================
   c · EEN AANKONDIGING VAN EEN BESLUIT
   ================================================================ */

test("c · een nieuwsbericht over een besluit is niet het besluit", () => {
  const r = bepaalDocumentsoort({
    titel: AANKONDIGING_TITEL,
    tekst: AANKONDIGING,
    bronSleutel: "rijksoverheid-nieuws",
    uitgeverSoort: "rijksoverheid",
  });
  assert.notEqual(r.soort, "OFFICIEEL_BESLUIT");
  assert.notEqual(r.soort, "OFFICIELE_REGELGEVING");
});

test("c2 · een aankondiging heeft geen administratieve identiteit", () => {
  /* HET ONDERSCHEID (c) TEGEN (d), zonder de vormcontrole. Een
     aankondiging noemt het besluit wel maar draagt geen zaaknummer:
     dat hoort bij het stuk en niet bij het nieuws erover. */
  const s = leesBesluitStructuur(`${AANKONDIGING_TITEL}\n${AANKONDIGING}`);
  assert.equal(s.administratieveIdentiteit, false);
  assert.equal(s.isVastgesteldBesluit, false);
});

/* ================================================================
   DE PER-CLAIM EIS UIT §2
   "Een officiële bron is niet automatisch bewijs voor iedere claim."
   ================================================================ */

const BESLUITSTUK = {
  documentTitel: ACM_BESLUIT_TITEL,
  documentTekst: ACM_BESLUIT,
  documentsoort: "OFFICIEEL_BESLUIT" as const,
  gezag: "BEVOEGD_GEZAG" as const,
  documentvorm: "BEKENDMAKING" as const,
  modaliteit: "VASTGESTELD" as const,
  eigenGezagNamen: EIGEN_GEZAG_NAMEN["acm-besluiten"] ?? [],
};

test("een claim uit het DICTUM stelt vast", () => {
  const r = steltStukDeClaimVast({
    ...BESLUITSTUK,
    claimTekst:
      "De Autoriteit Consument en Markt verklaart de klacht van Jumbo gegrond.",
  });
  assert.equal(r.steltVast, true, r.reden);
});

test("een claim uit de BEOORDELING stelt vast", () => {
  const r = steltStukDeClaimVast({
    ...BESLUITSTUK,
    claimTekst:
      "De ACM stelt vast dat het congestierapport van Liander niet in overeenstemming is met de eisen van de Netcode.",
  });
  assert.equal(r.steltVast, true, r.reden);
});

test("DE KERNZAAK — een claim uit 'Standpunten van partijen' stelt NIET vast", () => {
  /* Dit is de keerzijde van de reparatie in documentsoort.ts. Nu het
     besluit op plafond 5 staat en zijn eigen claims MAG bevestigen,
     wordt deze vraag scherp: het standpunt van een supermarkt mag geen
     vastgesteld recht worden omdat het in een ACM-besluit staat. */
  const r = steltStukDeClaimVast({
    ...BESLUITSTUK,
    claimTekst:
      "Jumbo stelt dat de gronden om geen congestiemanagement toe te passen niet voldoen.",
  });
  assert.equal(r.steltVast, false, r.reden);
  assert.equal(r.uitslag, "ACHTERGRONDPASSAGE");
});

test("en een tweede standpuntclaim ook niet", () => {
  const r = steltStukDeClaimVast({
    ...BESLUITSTUK,
    claimTekst: "Volgens Liander is er geen ruimte.",
  });
  assert.equal(r.steltVast, false, r.reden);
});

test("de standpuntensectie vergiftigt het dictum NIET", () => {
  /* ZONDER SLUITERS zou één standpuntenkop de rest van het besluit
     onbruikbaar maken, inclusief het dictum dat erna komt. De
     koppen '6. Beoordeling' en '7. Dictum' sluiten de regio. */
  const dictum = steltStukDeClaimVast({
    ...BESLUITSTUK,
    claimTekst: "Belanghebbenden kunnen tegen dit besluit beroep instellen bij de rechtbank.",
  });
  assert.equal(dictum.steltVast, true, dictum.reden);
});

/* ================================================================
   DE SCOPE — één genoemde partij is geen klasse
   ------------------------------------------------------------------
   HET DEFECT DAT PUBLICABEL WAS, gemeten op 6 november 2026 nadat de
   classificatiereparatie hierboven het ACM-besluit op plafond 5 had
   gezet en het zijn claims dus MOCHT bevestigen:

     bronzin  "Op 14 juni 2021 bracht Liander een offerte uit met
               daarin opgenomen 0 kW aan transportvermogen."
     zin      "Volgens Autoriteit Consument & Markt bedraagt het
               gecontracteerde transportvermogen van DE NETBEHEERDERS
               0 kW."

   Eén netbeheerder, één offerte, één klant — gepubliceerd als een
   feit over de netbeheerders. Dit is de keerzijde van de
   classificatiereparatie: wat plafond 5 krijgt, moet ook scherper
   worden gewogen.
   ================================================================ */

import { leesUitdrukkingen } from "../../src/pijplijn/uitdrukking.ts";
import { leidSemantiekAf, verwoordbaarheidspoort } from "../../src/pijplijn/semantiek.ts";
import { verwoord } from "../../src/pijplijn/verwoord.ts";

function doorDePoort(zin: string, uitgever: string) {
  const u = leesUitdrukkingen(zin)[0];
  if (!u) return { uitslag: "GEEN_UITDRUKKING", reden: "", zin: null as string | null };
  const sem = leidSemantiekAf(zin, u, { uitgever, isPrimaireBron: true });
  const vi = { semantiek: sem, uitdrukking: u, uitgever, brondatum: "2026-09-25", bronzin: zin };
  const p = verwoordbaarheidspoort({
    semantiek: sem, uitdrukking: u, verificatieStatus: "bevestigd", bewijsKwaliteit: 5,
    heeftBewijs: true, vervangenDoor: null, dagenOud: 10, houdbaarheidDagen: 1100,
    magCiteren: false, kanVerwoorden: () => verwoord(vi) !== null,
  });
  return {
    uitslag: p.uitslag,
    reden: p.reden,
    zin: p.uitslag === "VERWOORDBAAR" ? verwoord(vi) : null,
  };
}

test("scope · DE GEMETEN DEFECTZIN wordt niet meer verwoordbaar", () => {
  const r = doorDePoort(
    "Op 14 juni 2021 bracht Liander een offerte uit met daarin opgenomen 0 kW aan transportvermogen.",
    "Autoriteit Consument & Markt",
  );
  assert.equal(r.uitslag, "CONTEXT_ONVOLLEDIG", `uitslag ${r.uitslag}, zin: ${r.zin}`);
  assert.match(r.reden, /Liander/);
  assert.match(r.reden, /één genoemde partij/);
  assert.equal(r.zin, null);
});

test("scope · ook TenneT, Stedin en Enexis worden niet de klasse", () => {
  for (const partij of ["TenneT", "Stedin", "Enexis"]) {
    const r = doorDePoort(
      `${partij} verhoogt het nettarief in Nederland in 2027 met 8%.`,
      "Autoriteit Consument & Markt",
    );
    assert.equal(r.uitslag, "CONTEXT_ONVOLLEDIG", `${partij}: ${r.uitslag} — ${r.zin}`);
  }
});

test("scope · een MARKTBREDE zin komt er wel door", () => {
  /* Zonder deze zaak zou de controle alles kunnen blokkeren en nog
     steeds groen staan. Dan meet hij niets. */
  const r = doorDePoort(
    "De Nederlandse netbeheerders verhogen het nettarief in 2027 met 8%.",
    "Autoriteit Consument & Markt",
  );
  assert.equal(r.uitslag, "VERWOORDBAAR", `${r.uitslag}: ${r.reden}`);
  assert.ok(r.zin !== null);
  assert.match(r.zin, /netbeheerders/);
});

test("scope · de UITGEVER die zichzelf noemt is geen scopeprobleem", () => {
  /* Een stuk van TenneT dat 'TenneT' noemt, noemt zichzelf. Dat is een
     bronvermelding en geen oprekking; zonder deze uitzondering zou een
     eigen publicatie zijn eigen marktbrede claim blokkeren.

     DE FIXTURE GEBRUIKT TenneT EN NIET 'Netbeheer Nederland', en dat is
     een gemeten keuze. Mijn eerste opzet gebruikte die tweede naam en
     zakte:

       CONTEXT_ONVOLLEDIG: de bronzin gaat over 'Volgens Netbeheer
       Nederland', een organisatie die niet in het subjectvocabulaire
       staat.

     Die blokkade komt van de BESTAANDE ORGANISATIE-controle, niet van
     de partijcontrole: 'Netbeheer Nederland' eindigt op 'Nederland' en
     matcht daarmee het bedrijfsachtervoegselpatroon. Die controle heb
     ik met opzet NIET verruimd — hij verruimen zou meer laten
     publiceren, en dat is een besluit van de eigenaar.

     Wat hier dus wordt vastgezet is de uitzondering op de PARTIJ-as:
     'TenneT' matcht SPECIFIEKE_PARTIJ maar niet ORGANISATIE, en bij de
     eigen uitgever blokkeert hij niet. */
  const zin = "Volgens TenneT verhogen de Nederlandse netbeheerders het nettarief in 2027 met 8%.";
  const eigen = doorDePoort(zin, "TenneT");
  const ander = doorDePoort(zin, "Autoriteit Consument & Markt");
  assert.equal(eigen.uitslag, "VERWOORDBAAR", `${eigen.uitslag}: ${eigen.reden}`);
  /* Bij een ANDERE uitgever is TenneT een derde partij en blokkeert de
     partijcontrole onverkort. */
  assert.equal(ander.uitslag, "CONTEXT_ONVOLLEDIG");
  assert.match(ander.reden, /TenneT/);
});

test("scope · 'verhogen' wordt als stijging herkend", () => {
  /* De klinkerwisseltrap: `verhoog\\w*` matcht 'verhoogt' wel en
     'verhogen' niet. Dezelfde klasse fout die bij DALING in
     semantiek.ts al met naam staat beschreven. */
  const r = doorDePoort(
    "De Nederlandse netbeheerders verhogen het nettarief in 2027 met 8%.",
    "Autoriteit Consument & Markt",
  );
  assert.equal(r.uitslag, "VERWOORDBAAR");
  assert.match(r.zin ?? "", /stijgt/);
});
