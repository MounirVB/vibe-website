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
  /* DE KOP ZONDER DUBBELE PUNT, met het subparagraafnummer erachter —
     exact de vorm in de opgeslagen tekst van het echte besluit
     (brondocument_versie 4394):

       "... bij dit besluit. 5. Standpunten van partijen\n5.1. Jumbo\n14. ..."

     Een fixture met ':' achter de kop toetst een vorm die in productie
     niet voorkomt; de terminator [:\n] van het patroon moet hier op de
     NEWLINE aanslaan, niet op een dubbele punt. */
  "5. Standpunten van partijen",
  "5.1. Jumbo",
  "14. Jumbo heeft kort samengevat het volgende naar voren gebracht.",
  "15. Jumbo stelt dat de gronden om geen congestiemanagement toe te passen niet voldoen.",
  /* EEN STANDPUNTZIN MET EEN GETAL EN EEN DATUM, zodat er uit deze
     sectie ook werkelijk een claim te extraheren is. Zonder zo'n zin
     levert de standpuntensectie geen enkele claim op en meet de zaak
     "op het ECHTE besluit" niets — gemeten: oud 7, nieuw 7. */
  "Volgens Jumbo is in het congestierapport van 17 april 2025 slechts 40 procent van de flexibiliteit onderzocht.",
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

/* ================================================================
   DE PASSAGETOETS GELDT VOOR ÉLKE CLAIM UIT EEN OFFICIEEL STUK
   ------------------------------------------------------------------
   HET GEMETEN DEFECT, 6 november 2026 — claim 138 in productie:

     bron    acm-besluiten, OFFICIEEL_BESLUIT / BEVOEGD_GEZAG /
             BEKENDMAKING, plafond 5
     tekst   "Jumbo stelt dat de in het congestierapport van
              17 april 2025 opgenomen gronden om geen …"
     soort   datum, geen claimvorm
     status  BEVESTIGD, en met 0055 ook DIRECT_BEVESTIGD

   De zin staat gemeten binnen 'Standpunten van partijen'. Het is het
   standpunt van een supermarkt, en het stond als vastgesteld feit van
   de toezichthouder in de database.

   isJuridischeClaim() liet hem langs: een datumclaim uit een
   standpuntzin draagt geen juridische markering en geen juridische
   claimvorm, dus de passagetoets werd niet eens geraadpleegd —
   terwijl diezelfde toets de regel-claims uit dezelfde sectie wél
   blokkeerde.
   ================================================================ */

import {
  extraheerUitspraken,
  isJuridischeClaim,
} from "../../src/pijplijn/uitspraken.ts";
import { bepaalModaliteit } from "../../src/pijplijn/claimmodaliteit.ts";
import { bepaalClaimAard } from "../../src/pijplijn/claimaard.ts";
import { vormKanVaststellen } from "../../src/pijplijn/documentvorm.ts";
import type { Documentsoort, Gezag } from "../../src/pijplijn/documentsoort.ts";
import type { Documentvorm } from "../../src/pijplijn/documentvorm.ts";

type Stuk = {
  readonly documentTitel: string;
  readonly documentTekst: string;
  readonly documentsoort: Documentsoort;
  readonly gezag: Gezag;
  readonly documentvorm: Documentvorm;
  readonly modaliteit: "VASTGESTELD";
  readonly eigenGezagNamen: readonly string[];
};

/** Bevestigt dit stuk deze claim, met de poort zoals uitspraken.ts hem stelt? */
function bevestigt(claimTekst: string, stuk: Stuk) {
  const mod = bepaalModaliteit({
    tekst: claimTekst,
    documentsoort: stuk.documentsoort,
    peildatum: "2026-09-25",
  });
  const aard = bepaalClaimAard(claimTekst);
  const vast = steltStukDeClaimVast({ ...stuk, claimTekst, modaliteit: mod.modaliteit });
  const juridisch = isJuridischeClaim(aard.juridisch, null);
  /* DE DRIE GRONDEN, woordelijk zoals in schrijfUitspraken(). */
  const officieel =
    stuk.gezag === "BEVOEGD_GEZAG" && vormKanVaststellen(stuk.documentvorm);
  return {
    oud: !(juridisch && !vast.steltVast),
    nieuw: !((officieel || juridisch) && !vast.steltVast),
    uitslag: vast.uitslag,
    officieel,
  };
}

test("DE KERNZAAK — een DATUMclaim uit een standpuntzin bevestigt niet meer", () => {
  const r = bevestigt(
    "Jumbo stelt dat de gronden om geen congestiemanagement toe te passen niet voldoen aan de Netcode van 17 april 2025.",
    BESLUITSTUK,
  );
  assert.equal(r.officieel, true, "het stuk is bevoegd gezag in een vaststellende vorm");
  assert.equal(r.uitslag, "ACHTERGRONDPASSAGE");
  assert.equal(r.oud, true, "vóór de reparatie bevestigde deze claim wél — dat was het defect");
  assert.equal(r.nieuw, false, "en na de reparatie niet meer");
});

test("en een CIJFERclaim uit een standpuntzin ook niet", () => {
  /* DE ZIN STAAT LETTERLIJK IN DE FIXTURE. steltStukDeClaimVast()
     localiseert de claim op de eerste 48 tekens van zijn tekst
     (vaststelling.ts:263); een zin die niet in het document staat, is
     niet te localiseren en valt dus buiten elke achtergrondregio. Mijn
     eerste versie van deze zaak gebruikte een zin die er niet in stond
     en kwam daardoor op STELT_VAST uit — de toets meette niets. */
  const r = bevestigt(
    "Volgens Jumbo is in het congestierapport van 17 april 2025 slechts 40 procent van de flexibiliteit onderzocht.",
    BESLUITSTUK,
  );
  assert.equal(r.uitslag, "ACHTERGRONDPASSAGE");
  assert.equal(r.nieuw, false, `uitslag ${r.uitslag}`);
});

test("maar een claim uit het DICTUM blijft bevestigen", () => {
  /* Zonder deze zaak zou de reparatie alles kunnen blokkeren en nog
     steeds groen staan. Dan meet hij niets. */
  const r = bevestigt(
    "De Autoriteit Consument en Markt verklaart de klacht van Jumbo gegrond.",
    BESLUITSTUK,
  );
  assert.equal(r.uitslag, "STELT_VAST");
  assert.equal(r.nieuw, true, `uitslag ${r.uitslag}`);
});

test("en een claim uit de BEOORDELING ook", () => {
  const r = bevestigt(
    "De ACM stelt vast dat het congestierapport van Liander niet in overeenstemming is met de eisen van de Netcode.",
    BESLUITSTUK,
  );
  assert.equal(r.nieuw, true, `uitslag ${r.uitslag}`);
});

test("MEETHAAK — een NIET-vaststellend stuk houdt de OUDE grens", () => {
  /* DIT IS DE BEGRENZING VAN DE REPARATIE, en zonder deze zaak zou hij
     de keten breken. Gemeten: FEITELIJKE_MEDEDELING bij een
     NETBEHEERDER heeft plafond 4 en MAG zichzelf bevestigen, maar
     haalt vormKanVaststellen() niet. Zou de passagetoets ook daar voor
     élke claim gelden, dan bevestigde geen enkele claim van een
     netbeheerder, een statistiekbureau of een ministerieel
     nieuwsbericht nog — en dan kan bronverificatie.ts nergens meer
     ankeren. */
  const nietVaststellend = {
    ...BESLUITSTUK,
    documentsoort: "FEITELIJKE_MEDEDELING" as const,
    gezag: "NETBEHEERDER" as const,
    documentvorm: "NIEUWSBERICHT" as const,
  };
  const r = bevestigt(
    "Het aantal aansluitingen in de wachtrij bedroeg vorig jaar 8.500.",
    nietVaststellend,
  );
  assert.equal(r.officieel, false, "dit stuk stelt geen recht vast");
  assert.equal(r.oud, r.nieuw, "de reparatie verandert hier niets");
  assert.equal(r.nieuw, true, "en een feitelijke mededeling blijft zijn eigen cijfer dragen");
});

test("op het ECHTE besluit: alle standpuntclaims vallen af, het dictum niet", () => {
  /* Woordelijk de fixture uit dit bestand, door de hele extractie. */
  const claims = extraheerUitspraken(ACM_BESLUIT_TITEL, ACM_BESLUIT);
  let oud = 0;
  let nieuw = 0;
  const afgevallen: string[] = [];
  for (const c of claims) {
    const r = bevestigt(c.tekst, BESLUITSTUK);
    if (r.oud) oud += 1;
    if (r.nieuw) nieuw += 1;
    if (r.oud && !r.nieuw) afgevallen.push(`${r.uitslag}: ${c.tekst.slice(0, 60)}`);
  }
  assert.ok(nieuw < oud, `verwacht dat er claims afvallen; oud ${oud}, nieuw ${nieuw}`);
  assert.ok(nieuw > 0, "maar niet alle claims — het dictum hoort te blijven staan");
  /* ELKE AFGEVALLEN CLAIM MOET EEN GROND HEBBEN. Een blokkade zonder
     uitslag is niet na te meten. */
  for (const a of afgevallen) {
    assert.match(
      a,
      /^(ACHTERGRONDPASSAGE|NIET_VASTSTELLENDE_MODALITEIT|ANDER_GEZAG|ONTWERP|GEEN_AUTHENTIEK_STUK):/,
      `afgevallen zonder bekende grond: ${a}`,
    );
  }
});

/* ================================================================
   DE VORM VAN DE PARAGRAAFKOP, vastgepind op de productietekst
   ------------------------------------------------------------------
   WAAROM DEZE TWEE ZAKEN BESTAAN.

   Bij het nameten van claim 138 gebruikte ik eerst een probe die
   `documenttekst` meegaf in plaats van `documentTekst`, verborgen
   achter een cast. De passagetoets kreeg dus GEEN documenttekst en
   kwam op STELT_VAST uit. Ik las dat als een defect in de
   achtergronddetectie en verbreedde de terminator van het
   standpuntpatroon. Die wijziging is teruggedraaid: met de juiste
   veldnamen geeft de ONGEWIJZIGDE code ACHTERGRONDPASSAGE.

   Wat overbleef is een echte meetval. In de opgeslagen tekst
   (brondocument_versie 4394) luidt de kop:

     "... bij dit besluit. 5. Standpunten van partijen\n5.1. Jumbo\n14. ..."

   Geen dubbele punt — de terminator [:\n] van het patroon slaat hier
   aan op de NEWLINE. Beide fixtures in dit bestand hadden een ':'
   achter de kop en toetsten dus een vorm die in productie niet
   voorkomt. Deze twee zaken pinnen de echte vorm vast, zodat een
   latere versmalling van die terminator rood wordt in plaats van
   stil door te glippen.
   ================================================================ */

test("de paragraafkop ZONDER dubbele punt opent de achtergrondregio", () => {
  const tekst = [
    "Besluit van de Autoriteit Consument en Markt als bedoeld in artikel 5.4 van de Energiewet.",
    "4. Wettelijk kader",
    "Het wettelijk kader is opgenomen in de bijlage bij dit besluit.",
    "5. Standpunten van partijen",
    "5.1. Jumbo",
    "14. Jumbo heeft kort samengevat het volgende naar voren gebracht.",
    "15. Volgens Jumbo is slechts 40 procent van de flexibiliteit onderzocht in 2025.",
  ].join("\n");
  const r = bevestigt(
    "Volgens Jumbo is slechts 40 procent van de flexibiliteit onderzocht in 2025.",
    { ...BESLUITSTUK, documentTekst: tekst },
  );
  assert.equal(r.uitslag, "ACHTERGRONDPASSAGE", "de kop zonder ':' hoort te openen");
  assert.equal(r.nieuw, false);
});

test("MEETHAAK — 'de standpunten van partijen' MIDDENIN een zin opent niets", () => {
  /* De keerzijde. Zou het patroon ook midden in een zin aanslaan, dan
     vergiftigde één terugblikkende zin de rest van het besluit,
     inclusief het dictum. Het patroon eist daarom dat de kop aan het
     begin van een zin staat, eventueel met een paragraafnummer ervoor:
     in 'heeft de standpunten van partijen beoordeeld' staat 'de ' voor
     'standpunten' en matcht hij niet. */
  const tekst = [
    "Besluit van de Autoriteit Consument en Markt als bedoeld in artikel 5.4 van de Energiewet.",
    "6. Beoordeling van het geschil",
    "De ACM heeft de standpunten van partijen beoordeeld en weegt ze hieronder.",
    "De ACM stelt vast dat het gecontracteerde transportvermogen 630 kVA bedraagt.",
  ].join("\n");
  const r = bevestigt(
    "De ACM stelt vast dat het gecontracteerde transportvermogen 630 kVA bedraagt.",
    { ...BESLUITSTUK, documentTekst: tekst },
  );
  assert.equal(r.uitslag, "STELT_VAST", "een terugblikkende zin mag het dictum niet vergiftigen");
  assert.equal(r.nieuw, true);
});
