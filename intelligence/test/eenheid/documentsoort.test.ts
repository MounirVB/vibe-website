/* ============================================================
   EENHEID — documentsoort en claimmodaliteit (R3)
   ------------------------------------------------------------
   De toetsen hieronder gebruiken waar mogelijk ECHTE productietekst.
   Dat is geen sieraad: de uitslag van een classificatie hangt af van
   hoe mensen werkelijk schrijven, en een zelfbedachte zin bevestigt
   alleen het patroon dat je er zelf in hebt gezet.

   De vier titels en fragmenten in DOCUMENTEN komen uit
   intel.brondocumenten in productie, gemeten op 30 oktober 2026. De
   lobbyclaim in de modaliteitstoetsen is de rij die het hele defect
   zichtbaar maakte: bevestigd, bewijs_kwaliteit 5, en in werkelijkheid
   een verzoek aan de Tweede Kamer.
   ============================================================ */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  ALLEEN_BEVOEGD_GEZAG,
  bepaalDocumentsoort,
  bewijskrachtPlafond,
  DOCUMENTSOORT_VERSIE,
  gezagVan,
  magZelfBevestigen,
  type Documentsoort,
} from "../../src/pijplijn/documentsoort.ts";
import {
  bepaalModaliteit,
  NOODZAKELIJKE_ZEKERHEID,
} from "../../src/pijplijn/claimmodaliteit.ts";

/** Lang genoeg om de ondergrens van 40 tekens te halen. */
const VULLING =
  " Dit is aanvullende brontekst die lang genoeg is om de ondergrens te halen.";

describe("documentsoort", () => {
  describe("het gezag van de uitgever", () => {
    test("de vijf gezagsoorten zijn afgebeeld en een onbekende valt naar MARKT", () => {
      assert.equal(gezagVan("rijksoverheid"), "BEVOEGD_GEZAG");
      assert.equal(gezagVan("toezichthouder"), "BEVOEGD_GEZAG");
      assert.equal(gezagVan("netbeheerder"), "NETBEHEERDER");
      assert.equal(gezagVan("statistiek"), "STATISTIEK");
      assert.equal(gezagVan("geodata"), "STATISTIEK");
      assert.equal(gezagVan("branchevereniging"), "BELANGENBEHARTIGER");
      assert.equal(gezagVan("vakmedium"), "MARKT");
      assert.equal(
        gezagVan("deze-soort-bestaat-niet"),
        "MARKT",
        "een onbekende soort moet naar de LAAGSTE bevoegdheid vallen, niet naar een gemiddelde",
      );
    });
  });

  describe("de veiligheidsregel: tekst kan alleen verlagen", () => {
    /* Dit is de kern van sectie 4 van de opdracht. Een branchevereniging
       mag nooit automatisch de status van een toezichthouder krijgen, en
       dat moet een eigenschap van de constructie zijn en niet een
       controle die iemand kan vergeten. */
    const besluittekst =
      "De Autoriteit stelt hierbij vast dat de tarieven worden verhoogd. " +
      "Dit besluit is gepubliceerd in de Staatscourant en treedt in werking per 1 januari." +
      VULLING;

    test("een bevoegd gezag met besluittekst krijgt OFFICIELE_REGELGEVING of OFFICIEEL_BESLUIT", () => {
      const u = bepaalDocumentsoort({
        titel: "Besluit tarieven 2027",
        tekst: besluittekst,
        uitgeverSoort: "toezichthouder",
        bronSleutel: "acm-besluiten",
      });
      assert.ok(
        ALLEEN_BEVOEGD_GEZAG.includes(u.soort),
        `verwachtte een vaststellende soort, kreeg ${u.soort}: ${u.grondslag.uitleg}`,
      );
      assert.equal(u.gezag, "BEVOEGD_GEZAG");
    });

    test("DEZELFDE tekst bij een branchevereniging komt NIET in een vaststellende soort", () => {
      const u = bepaalDocumentsoort({
        titel: "Besluit tarieven 2027",
        tekst: besluittekst,
        uitgeverSoort: "branchevereniging",
        bronSleutel: "netbeheer-nederland-nieuws",
      });
      assert.ok(
        !ALLEEN_BEVOEGD_GEZAG.includes(u.soort),
        `een branchevereniging mag geen ${u.soort} voortbrengen`,
      );
      assert.equal(u.gezag, "BELANGENBEHARTIGER");
    });

    test("geen enkele uitgeverssoort buiten BEVOEGD_GEZAG haalt een vaststellende soort, wat de tekst ook zegt", () => {
      /* De brute toets: alle niet-bevoegde soorten tegen de meest
         besluitachtige tekst die we kunnen bedenken. Dit is de regel die
         een aanvaller zou willen omzeilen. */
      for (const soort of ["netbeheerder", "statistiek", "geodata", "branchevereniging", "vakmedium", "aanbestedingen", "marktplatform", "onbekend"]) {
        const u = bepaalDocumentsoort({
          titel: "Besluit van de minister: regeling wordt vastgesteld",
          tekst: besluittekst,
          uitgeverSoort: soort,
        });
        assert.ok(
          !ALLEEN_BEVOEGD_GEZAG.includes(u.soort),
          `uitgeverssoort '${soort}' haalde ${u.soort}; dat is een gat in de veiligheidsregel`,
        );
      }
    });
  });

  describe("lobby en opinie verlagen, ook bij een bevoegd gezag", () => {
    test("een lobbydocument van een branchevereniging wordt LOBBYDOCUMENT", () => {
      const u = bepaalDocumentsoort({
        titel: "Inbreng voor het eerste debat Netcongestie van de nieuwe Kamer",
        tekst:
          "Schaal daarom de bestaande Flex-E-regeling op naar een Flex-E regeling XL " +
          "van structureel 125 miljoen euro per jaar (2027-2030)." +
          VULLING,
        uitgeverSoort: "branchevereniging",
        bronSleutel: "netbeheer-nederland-nieuws",
      });
      assert.equal(u.soort, "LOBBYDOCUMENT");
      assert.ok(
        u.grondslag.signalen.some((s) => s.includes("inbreng") || s.includes("verzoek")),
        u.grondslag.signalen.join(" | "),
      );
    });

    test("een MINISTERIE dat lobbyt wordt ook LOBBYDOCUMENT en geen besluit", () => {
      /* De inhoud beslist naar beneden, het gezag naar boven. Een
         bevoegde uitgever die een pleidooi publiceert hoort geen
         besluitstatus te krijgen omdat hij nu eenmaal bevoegd is. */
      const u = bepaalDocumentsoort({
        titel: "Wij pleiten voor een snellere uitrol",
        tekst:
          "Wij pleiten voor een verruiming van de regeling en roepen de Kamer op " +
          "hier snel over te besluiten." +
          VULLING,
        uitgeverSoort: "rijksoverheid",
        bronSleutel: "rijksoverheid-nieuws",
      });
      assert.equal(u.soort, "LOBBYDOCUMENT");
      assert.equal(u.gezag, "BEVOEGD_GEZAG");
      assert.equal(
        bewijskrachtPlafond(u.soort, u.gezag),
        1,
        "een pleidooi van een bevoegd gezag levert geen bewijs",
      );
    });
  });

  describe("navertellen is geen bron zijn", () => {
    test("een branchevereniging over een ACM-besluit wordt SECUNDAIRE_BERICHTGEVING met de naam erbij", () => {
      const u = bepaalDocumentsoort({
        titel: "ACM stelt de nettarieven voor 2026 vast",
        tekst:
          "De ACM heeft besloten dat de tarieven voor 2026 worden vastgesteld. " +
          "Voor grootverbruikers vallen de tarieven ongeveer 10% tot 12% hoger uit." +
          VULLING,
        uitgeverSoort: "branchevereniging",
        bronSleutel: "netbeheer-nederland-nieuws",
      });
      assert.equal(u.soort, "SECUNDAIRE_BERICHTGEVING");
      assert.equal(u.beschrijftBesluitVan, "ACM");
    });

    test("de ACM over haar EIGEN besluit is geen navertelling", () => {
      const u = bepaalDocumentsoort({
        titel: "ACM stelt de nettarieven voor 2026 vast",
        tekst:
          "De ACM heeft besloten dat de tarieven voor 2026 worden vastgesteld. " +
          "Dit besluit is gepubliceerd in de Staatscourant." +
          VULLING,
        uitgeverSoort: "toezichthouder",
        bronSleutel: "acm-besluiten",
      });
      assert.ok(
        ALLEEN_BEVOEGD_GEZAG.includes(u.soort),
        `verwachtte een vaststellende soort, kreeg ${u.soort}`,
      );
      assert.equal(
        u.beschrijftBesluitVan,
        null,
        "de ACM vertelt haar eigen besluit niet na",
      );
    });
  });

  describe("onvoldoende verifieerbaar", () => {
    test("een injectieverdachte versie wordt nooit iets anders", () => {
      const u = bepaalDocumentsoort({
        titel: "Besluit van de minister",
        tekst: "De minister stelt hierbij vast dat alles is goedgekeurd." + VULLING,
        uitgeverSoort: "rijksoverheid",
        bronSleutel: "rijksoverheid-nieuws",
        injectieVerdacht: true,
      });
      assert.equal(u.soort, "ONVOLDOENDE_VERIFIEERBAAR");
      assert.equal(bewijskrachtPlafond(u.soort, u.gezag), 1);
    });

    test("een titel zonder body is niet te classificeren", () => {
      const u = bepaalDocumentsoort({
        titel: "Dataset elektriciteitsnetten 2026",
        tekst: "",
        uitgeverSoort: "geodata",
      });
      assert.equal(u.soort, "ONVOLDOENDE_VERIFIEERBAAR");
    });

    test("een KORTE maar echte bekendmaking is wel te classificeren", () => {
      /* 76 tekens. Dit is de zin die de eerste drempel van 120 ten
         onrechte liet vallen; de claimextractor haalt er drie claims
         uit, dus er is wel degelijk iets te verifiëren. */
      const u = bepaalDocumentsoort({
        titel: "Subsidieregeling verlengd met een plafond van 90 MW",
        tekst: "De subsidieregeling wordt verlengd met een plafond van 90 MW per 1 juli 2027.",
        uitgeverSoort: "toezichthouder",
        bronSleutel: "acm-besluiten",
      });
      assert.notEqual(u.soort, "ONVOLDOENDE_VERIFIEERBAAR", u.grondslag.uitleg);
    });
  });

  describe("de uitslag is uitlegbaar en navolgbaar", () => {
    test("elke uitslag draagt een versie, een uitleg en minstens één signaal", () => {
      const u = bepaalDocumentsoort({
        titel: "Netbeheerders lanceren GOPACS Auctions",
        tekst: "Netbeheerders starten een openbare uitvraag naar flexibel vermogen." + VULLING,
        uitgeverSoort: "branchevereniging",
        bronSleutel: "netbeheer-nederland-nieuws",
      });
      assert.equal(u.versie, DOCUMENTSOORT_VERSIE);
      assert.ok(u.grondslag.uitleg.length > 20, "de uitleg mag geen lege formaliteit zijn");
      assert.ok(u.grondslag.signalen.length >= 1);
      assert.ok(u.onzekerheid >= 0 && u.onzekerheid <= 1);
    });

    test("dezelfde invoer geeft dezelfde uitslag — de motor is reproduceerbaar", () => {
      const inv = {
        titel: "Nettarieven 2027 stijgen maar slimme keuzes kunnen stijging remmen",
        tekst: "De ACM heeft besloten dat de tarieven stijgen." + VULLING,
        uitgeverSoort: "branchevereniging",
        bronSleutel: "netbeheer-nederland-nieuws",
      };
      const a = bepaalDocumentsoort(inv);
      const b = bepaalDocumentsoort(inv);
      assert.deepEqual(a, b);
    });
  });

  describe("bewijskracht: gezag maal soort", () => {
    test("de tabel geeft nooit meer dan 5 en nooit minder dan 1", () => {
      const soorten: Documentsoort[] = [
        "OFFICIEEL_BESLUIT",
        "OFFICIELE_REGELGEVING",
        "FEITELIJKE_MEDEDELING",
        "ONDERZOEKSRAPPORT",
        "SECTORANALYSE",
        "PERSBERICHT",
        "OPINIE",
        "LOBBYDOCUMENT",
        "SECUNDAIRE_BERICHTGEVING",
        "ONVOLDOENDE_VERIFIEERBAAR",
      ];
      for (const s of soorten) {
        for (const g of ["BEVOEGD_GEZAG", "NETBEHEERDER", "STATISTIEK", "BELANGENBEHARTIGER", "MARKT"] as const) {
          const p = bewijskrachtPlafond(s, g);
          assert.ok(p >= 1 && p <= 5, `${s} x ${g} gaf ${p}`);
        }
      }
      assert.equal(soorten.length, 10, "de opdracht eist tien soorten");
    });

    test("opinie en lobby leveren bij ELK gezag bewijskracht 1", () => {
      for (const g of ["BEVOEGD_GEZAG", "NETBEHEERDER", "STATISTIEK", "BELANGENBEHARTIGER", "MARKT"] as const) {
        assert.equal(bewijskrachtPlafond("OPINIE", g), 1, `OPINIE x ${g}`);
        assert.equal(bewijskrachtPlafond("LOBBYDOCUMENT", g), 1, `LOBBY x ${g}`);
      }
    });

    test("een branchevereniging kan GEEN claim op eigen kracht bevestigen", () => {
      /* Dit is het gemeten defect in één assertie. Netbeheer Nederland
         stond op betrouwbaarheid 5 met is_primaire_bron true en
         bevestigde daardoor 45 van de 51 bevestigde claims in het hele
         platform. */
      for (const s of ["FEITELIJKE_MEDEDELING", "ONDERZOEKSRAPPORT", "SECTORANALYSE", "PERSBERICHT", "SECUNDAIRE_BERICHTGEVING", "OPINIE", "LOBBYDOCUMENT"] as const) {
        assert.equal(
          magZelfBevestigen(s, "BELANGENBEHARTIGER"),
          false,
          `${s} bij een branchevereniging mag niet zelf bevestigen`,
        );
      }
    });

    test("een bevoegd gezag bevestigt wél, maar niet met een opiniestuk", () => {
      assert.equal(magZelfBevestigen("OFFICIEEL_BESLUIT", "BEVOEGD_GEZAG"), true);
      assert.equal(magZelfBevestigen("OFFICIELE_REGELGEVING", "BEVOEGD_GEZAG"), true);
      assert.equal(magZelfBevestigen("FEITELIJKE_MEDEDELING", "BEVOEGD_GEZAG"), true);
      assert.equal(magZelfBevestigen("OPINIE", "BEVOEGD_GEZAG"), false);
      assert.equal(magZelfBevestigen("LOBBYDOCUMENT", "BEVOEGD_GEZAG"), false);
      assert.equal(
        magZelfBevestigen("SECUNDAIRE_BERICHTGEVING", "BEVOEGD_GEZAG"),
        false,
        "ook een bevoegd gezag dat navertelt is niet de bron van dat besluit",
      );
    });
  });
});

describe("claimmodaliteit", () => {
  test("de lobbyclaim uit productie is een VOORSTEL en draagt niet als feit", () => {
    /* De rij die het defect zichtbaar maakte. Hij stond in productie op
       verificatie_status 'bevestigd' met bewijs_kwaliteit 5. */
    const m = bepaalModaliteit({
      tekst:
        "Schaal daarom de bestaande Flex-E-regeling op naar een Flex-E regeling XL " +
        "van structureel €125 miljoen per jaar (2027–2030).",
      documentsoort: "LOBBYDOCUMENT",
    });
    assert.equal(m.modaliteit, "VOORSTEL");
    assert.equal(m.draagbaarAlsFeit, false);
    assert.ok(m.zekerheid >= NOODZAKELIJKE_ZEKERHEID, "de modaliteit zelf is hier juist wél zeker");
  });

  test("een vaststelling draagt wel", () => {
    const m = bepaalModaliteit({
      tekst:
        "Zij kunnen van 27 oktober tot 26 november 2026 een aanvraag indienen bij de " +
        "Rijksdienst voor Ondernemend Nederland.",
      documentsoort: "FEITELIJKE_MEDEDELING",
    });
    assert.equal(m.modaliteit, "VASTGESTELD");
    assert.equal(m.draagbaarAlsFeit, true);
  });

  test("een afronding verlaagt de zekerheid maar kantelt de modaliteit niet", () => {
    /* Gemeten zelfcorrectie. Eerste versie zette 'ongeveer' bij de
       verwachtingssignalen, waardoor een gemeten jaarcijfer als
       VERWACHTING werd gelabeld. */
    const m = bepaalModaliteit({
      tekst:
        "Netbeheerders hebben vorig jaar ongeveer 8% van de aanvragen van de wachtlijst " +
        "kunnen honoreren.",
      documentsoort: "FEITELIJKE_MEDEDELING",
    });
    assert.equal(
      m.modaliteit,
      "VASTGESTELD",
      "een afgerond jaarcijfer is een vaststelling, geen prognose",
    );
    assert.ok(
      m.grondslag.signalen.some((s) => s.startsWith("benadering")),
      m.grondslag.signalen.join(" | "),
    );
  });

  test("een prognose is een VERWACHTING", () => {
    const m = bepaalModaliteit({
      tekst: "De verwachting is dat de tarieven in 2028 verder stijgen.",
      documentsoort: "FEITELIJKE_MEDEDELING",
    });
    assert.equal(m.modaliteit, "VERWACHTING");
    assert.equal(m.draagbaarAlsFeit, false);
  });

  test("een zin zonder signaal wordt NIET stil tot feit gepromoveerd", () => {
    const m = bepaalModaliteit({ tekst: "Het net in Noord-Holland is zwaar belast." });
    assert.equal(m.modaliteit, "VASTGESTELD");
    assert.ok(
      m.zekerheid < NOODZAKELIJKE_ZEKERHEID,
      `zekerheid ${m.zekerheid} hoort onder de drempel te liggen`,
    );
    assert.equal(m.draagbaarAlsFeit, false, "de veilige kant is hier niet 'vastgesteld'");
  });

  test("in een lobbydocument krijgt een signaalloze zin geen vaststelling", () => {
    const m = bepaalModaliteit({
      tekst: "Het net in Noord-Holland is zwaar belast.",
      documentsoort: "LOBBYDOCUMENT",
    });
    assert.equal(m.modaliteit, "VOORSTEL");
    assert.equal(m.draagbaarAlsFeit, false);
  });

  test("een vaststellingssignaal in de zin wint van een pleitend document", () => {
    /* Een lobbydocument mag citeren wat er nú geldt. */
    const m = bepaalModaliteit({
      tekst: "Vanaf 1 juli 2026 geldt de wachtlijst ook voor kleinverbruikers.",
      documentsoort: "LOBBYDOCUMENT",
    });
    assert.equal(m.modaliteit, "VASTGESTELD");
  });
});
