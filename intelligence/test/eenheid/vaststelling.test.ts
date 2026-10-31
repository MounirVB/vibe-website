/* ============================================================
   TEST — stelt dit stuk deze claim vast?
   ------------------------------------------------------------
   WAAROM DEZE TOETS BESTAAT. De juridische poort uit 2f40c93 vroeg
   alleen of het DOCUMENT een authentieke bron was. Geforceerd en
   gemeten op 31 oktober 2026: een echt ACM-concentratiebesluit met de
   regel "Ter achtergrond: het maximumtarief bedraagt vanaf 1 juli 2027
   nog 45 euro per maand" bevestigde die tariefzin op plafond 5. Een
   concentratiebesluit beslist over zeggenschap en niets over een tarief.

   DE TWEE TEGENPROEVEN ZIJN HIER HET BELANGRIJKST. Een poort die alles
   blokkeert is makkelijk en kapot: dan kan een ECHT tariefbesluit zijn
   eigen claim niet meer dragen en heeft bronverificatie nergens meer
   een anker. Die twee gevallen staan hieronder als eerste, zodat een
   latere verscherping er meteen op stukloopt.
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import {
  steltStukDeClaimVast,
  VASTSTELLING_VERSIE,
  type VaststellingInvoer,
} from "../../src/pijplijn/vaststelling.ts";
import { bepaalClaimAard } from "../../src/pijplijn/claimaard.ts";

const TARIEFCLAIM = "Het maximumtarief bedraagt vanaf 1 juli 2027 nog 45 euro per maand.";

/** De stand van een authentiek ACM-besluit, als basis om van af te wijken. */
function acmBesluit(over: Partial<VaststellingInvoer> = {}): VaststellingInvoer {
  return {
    claimTekst: TARIEFCLAIM,
    documentTitel: "Tariefbesluit 2027",
    documentTekst: TARIEFCLAIM,
    documentsoort: "OFFICIEEL_BESLUIT",
    gezag: "BEVOEGD_GEZAG",
    documentvorm: "BEKENDMAKING",
    modaliteit: "VASTGESTELD",
    eigenGezagNamen: ["ACM"],
    ...over,
  };
}

/** De volledige poortuitkomst, zoals uitspraken.ts hem samenstelt. */
function bevestigt(inv: VaststellingInvoer): boolean {
  const aard = bepaalClaimAard(inv.claimTekst);
  const v = steltStukDeClaimVast(inv);
  return !(aard.juridisch && !v.steltVast);
}

describe("de tegenproeven: wat NIET geblokkeerd mag worden", () => {
  test("een ECHT tariefbesluit draagt zijn eigen juridische claim", () => {
    /* Dit is de meting uit het commentaar bij uitspraken.ts:555-572.
       Zo'n besluit komt uit op FEITELIJKE_MEDEDELING en draagt geen
       enkele dictummarkering. Zou de passagetoets een dictummarkering
       EISEN, dan blokkeert de authentieke bron hier zijn eigen claim en
       kan bronverificatie.ts nergens meer ankeren. */
    const inv = acmBesluit({
      documentsoort: "FEITELIJKE_MEDEDELING",
      documentTekst:
        "Gelet op artikel 41 van de Elektriciteitswet. " +
        TARIEFCLAIM +
        " Belanghebbenden kunnen binnen zes weken bezwaar maken.",
    });
    const v = steltStukDeClaimVast(inv);
    assert.equal(v.uitslag, "STELT_VAST", v.reden);
    assert.equal(bevestigt(inv), true, "een echt besluit hoort zijn eigen claim te dragen");
  });

  test("een dictum NA een achtergrondalinea blijft vaststellend", () => {
    /* Zonder sluiters zou één 'ter achtergrond' de rest van het stuk
       vergiftigen, inclusief het dictum dat erna komt. */
    const inv = acmBesluit({
      documentTekst: "Ter achtergrond: de markt is krap. Artikel 1. " + TARIEFCLAIM,
    });
    assert.equal(steltStukDeClaimVast(inv).uitslag, "STELT_VAST");
    assert.equal(bevestigt(inv), true);
  });

  test("het eigen gezag dat zichzelf noemt is geen navertelling", () => {
    const inv = acmBesluit({
      claimTekst: "De ACM heeft besloten dat het maximumtarief vanaf 1 juli 2027 geldt.",
      documentTekst: "De ACM heeft besloten dat het maximumtarief vanaf 1 juli 2027 geldt.",
    });
    assert.equal(steltStukDeClaimVast(inv).uitslag, "STELT_VAST");
  });

  test("de voluit geschreven naam van het eigen gezag telt ook", () => {
    const inv = acmBesluit({
      claimTekst:
        "De Autoriteit Consument en Markt heeft besloten dat het maximumtarief geldt vanaf 1 juli 2027.",
      documentTekst:
        "De Autoriteit Consument en Markt heeft besloten dat het maximumtarief geldt vanaf 1 juli 2027.",
    });
    assert.equal(
      steltStukDeClaimVast(inv).uitslag,
      "STELT_VAST",
      "EIGEN_GEZAG_NAMEN draagt 'ACM'; de voluit geschreven vorm hoort hetzelfde te doen",
    );
  });

  test("een feitelijke mededeling raakt deze poort niet", () => {
    /* claimaard.juridisch = false, dus de vaststellingstoets is niet
       van toepassing en een benoeming bevestigt zichzelf zoals altijd. */
    const inv = acmBesluit({
      claimTekst: "De ministerraad heeft ingestemd met de benoeming van X.",
      documentsoort: "FEITELIJKE_MEDEDELING",
      documentvorm: "NIEUWSBERICHT",
      gezag: "BEVOEGD_GEZAG",
    });
    assert.equal(bepaalClaimAard(inv.claimTekst).juridisch, false);
    assert.equal(bevestigt(inv), true, "een eigen activiteit blijft zelfbevestigend");
  });
});

describe("de achtergrondpassage", () => {
  test("DE GEMETEN FAALWIJZE — een tariefzin ter achtergrond in een concentratiebesluit", () => {
    const tekst =
      "De Autoriteit Consument en Markt heeft op 26 oktober 2026 besloten dat Alfa Holding " +
      "uitsluitende zeggenschap mag verkrijgen over Beta Energie. " +
      "Gelet op artikel 37 van de Mededingingswet. " +
      "Ter achtergrond: " +
      TARIEFCLAIM.charAt(0).toLowerCase() +
      TARIEFCLAIM.slice(1) +
      " De verplichte gegevensdeling voor netbeheerders geldt vanaf 1 juli 2027. " +
      "Belanghebbenden kunnen binnen zes weken bezwaar maken tegen dit besluit.";

    for (const zin of [
      "Ter achtergrond: het maximumtarief bedraagt vanaf 1 juli 2027 nog 45 euro per maand.",
      "De verplichte gegevensdeling voor netbeheerders geldt vanaf 1 juli 2027.",
    ]) {
      const inv = acmBesluit({
        claimTekst: zin,
        documentTitel: "Concentratiebesluit Alfa - Beta",
        documentTekst: tekst,
      });
      const v = steltStukDeClaimVast(inv);
      assert.equal(v.uitslag, "ACHTERGRONDPASSAGE", `"${zin.slice(0, 50)}" → ${v.uitslag}`);
      assert.equal(bevestigt(inv), false, "een achtergrondzin mag nooit zelfbevestigen");
    }
  });

  test("de considerans 'Overwegende dat' is geen vaststelling", () => {
    const inv = acmBesluit({
      documentTekst: "Overwegende dat de netbeheerders hebben aangegeven. " + TARIEFCLAIM,
    });
    assert.equal(steltStukDeClaimVast(inv).uitslag, "ACHTERGRONDPASSAGE");
  });

  test("elke achtergrondmarkering wordt herkend", () => {
    for (const opener of [
      "Ter informatie:",
      "Ten overvloede:",
      "Ter vergelijking:",
      "Voor de volledigheid:",
    ]) {
      const inv = acmBesluit({ documentTekst: `${opener} ${TARIEFCLAIM}` });
      assert.equal(
        steltStukDeClaimVast(inv).uitslag,
        "ACHTERGRONDPASSAGE",
        `'${opener}' hoort een achtergrondregio te openen`,
      );
    }
  });

  test("zonder documenttekst vervalt de passagetoets in plaats van te gokken", () => {
    /* Productie heeft vandaag 1872 van 3740 versies met een LEGE
       ruwe_tekst. Zonder tekst is er geen bewijs van achtergrond, en
       dan hoort de poort niet te blokkeren op een aanname. */
    const inv = acmBesluit({ documentTekst: "", documentTitel: "" });
    assert.equal(steltStukDeClaimVast(inv).uitslag, "STELT_VAST");
  });
});

describe("de overige vier uitslagen", () => {
  test("een nieuwsbericht over regelgeving is geen authentiek stuk", () => {
    const inv = acmBesluit({
      documentsoort: "NIEUWSBERICHT_REGELGEVING",
      documentvorm: "NIEUWSBERICHT",
      eigenGezagNamen: ["de minister"],
    });
    assert.equal(steltStukDeClaimVast(inv).uitslag, "GEEN_AUTHENTIEK_STUK");
    assert.equal(bevestigt(inv), false);
  });

  test("een belangenbehartiger is geen authentiek stuk, ook met een mooie vorm", () => {
    const inv = acmBesluit({ gezag: "BELANGENBEHARTIGER" });
    assert.equal(steltStukDeClaimVast(inv).uitslag, "GEEN_AUTHENTIEK_STUK");
  });

  test("een ontwerpbesluit stelt niets vast", () => {
    const inv = acmBesluit({ documentsoort: "ONTWERPBESLUIT" });
    assert.equal(steltStukDeClaimVast(inv).uitslag, "ONTWERP");
    assert.equal(bevestigt(inv), false);
  });

  test("een voorstel of verwachting stelt niets vast", () => {
    for (const m of ["VOORSTEL", "VERWACHTING"] as const) {
      const inv = acmBesluit({ modaliteit: m });
      assert.equal(steltStukDeClaimVast(inv).uitslag, "NIET_VASTSTELLENDE_MODALITEIT");
    }
  });

  test("een verwijzing naar het besluit van een ANDER orgaan is geen bron", () => {
    const zin =
      "Op grond van het besluit van de minister geldt vanaf 1 juli 2027 een maximumtarief.";
    const inv = acmBesluit({ claimTekst: zin, documentTekst: zin });
    assert.equal(steltStukDeClaimVast(inv).uitslag, "ANDER_GEZAG");
    assert.equal(bevestigt(inv), false);
  });

  test("een besluitwerkwoord zonder het eigen gezag is een navertelling", () => {
    const zin =
      "De minister heeft op 1 juli 2027 besloten dat het maximumtarief 45 euro per maand bedraagt.";
    const inv = acmBesluit({ claimTekst: zin, documentTekst: zin, eigenGezagNamen: ["ACM"] });
    assert.equal(
      steltStukDeClaimVast(inv).uitslag,
      "ANDER_GEZAG",
      "een ACM-besluit is geen bron voor een besluit van de minister",
    );
  });

  test("een leeg eigenGezagNamen maakt elke toeschrijving een ander gezag", () => {
    const zin = "De ACM heeft besloten dat het maximumtarief vanaf 1 juli 2027 geldt.";
    const inv = acmBesluit({ claimTekst: zin, documentTekst: zin, eigenGezagNamen: [] });
    assert.equal(steltStukDeClaimVast(inv).uitslag, "ANDER_GEZAG");
  });
});

describe("de orde en de vorm van het antwoord", () => {
  test("de hardste eis wint: geen authentiek stuk gaat vóór de passagetoets", () => {
    /* Anders zou de reden 'achtergrond' zijn bij een stuk dat om een
       heel andere grond faalt, en dan is de blokkade niet na te meten. */
    const inv = acmBesluit({
      gezag: "MARKT",
      documentvorm: "ARTIKEL",
      documentTekst: "Ter achtergrond: " + TARIEFCLAIM,
    });
    assert.equal(steltStukDeClaimVast(inv).uitslag, "GEEN_AUTHENTIEK_STUK");
  });

  test("steltVast is waar en alleen waar bij STELT_VAST", () => {
    const gevallen: VaststellingInvoer[] = [
      acmBesluit(),
      acmBesluit({ documentsoort: "ONTWERPBESLUIT" }),
      acmBesluit({ modaliteit: "VOORSTEL" }),
      acmBesluit({ gezag: "MARKT" }),
      acmBesluit({ documentTekst: "Ter achtergrond: " + TARIEFCLAIM }),
    ];
    for (const g of gevallen) {
      const v = steltStukDeClaimVast(g);
      assert.equal(
        v.steltVast,
        v.uitslag === "STELT_VAST",
        "steltVast mag nooit uit de uitslag lopen; het is de enige plek waar " +
          "'mag zelfbevestigen' uit volgt",
      );
    }
  });

  test("elke uitslag draagt een reden en de versie", () => {
    for (const g of [acmBesluit(), acmBesluit({ gezag: "MARKT" })]) {
      const v = steltStukDeClaimVast(g);
      assert.ok(v.reden.length >= 20, "een blokkade zonder reden is niet na te meten");
      assert.equal(v.versie, VASTSTELLING_VERSIE);
      assert.equal(v.grondslag["versie"], VASTSTELLING_VERSIE);
    }
  });

  test("de functie is puur: tweemaal dezelfde invoer geeft dezelfde uitslag", () => {
    const inv = acmBesluit({ documentTekst: "Ter achtergrond: " + TARIEFCLAIM });
    assert.deepEqual(steltStukDeClaimVast(inv), steltStukDeClaimVast(inv));
  });
});
