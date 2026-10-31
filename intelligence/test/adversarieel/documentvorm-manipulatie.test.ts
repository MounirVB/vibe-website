/* ============================================================
   ADVERSARIEEL — kan de VORM-as worden misbruikt?
   ------------------------------------------------------------
   DE AANNAME DIE HIER WORDT AANGEVALLEN. V2 voegt een derde as toe:
   OFFICIEEL_BESLUIT en OFFICIELE_REGELGEVING eisen nu ook een
   vaststellende documentvorm. Die vorm wordt uit de BRONTEKST en de URL
   gelezen — precies wat een tegenstander beheerst.

   Er zijn twee richtingen om dat aan te vallen, en ze zijn niet even
   gevaarlijk:

     OMHOOG  een stuk bekendmakingsvorm aanmeten om bij plafond 5 te
             komen. Dit is de gevaarlijke richting, en de verdediging is
             dat de vorm een EXTRA eis is bovenop het gezag en nooit een
             vervanging ervan. Wie geen bevoegd gezag is, komt er met
             geen enkele vormmarkering.

     OMLAAG  een stuk 'Nieuwsbericht' op het hoofd zetten zodat het geen
             bewijs meer is. Dat kan, en het is bewust toegestaan: de
             hele motor rust erop dat tekst alleen verlaagt. Een
             uitgever die zijn eigen bewijskracht verlaagt schaadt
             alleen zichzelf.

   Daarnaast de vier gevallen die de opdracht expliciet noemt:
   nieuwsberichten die wettelijke formuleringen citeren, ontwerpbesluiten,
   brancheberichten die de ACM citeren, en officiële besluiten zonder
   numerieke vaststelling.
   ============================================================ */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  ALLEEN_BEVOEGD_GEZAG,
  bepaalDocumentsoort,
  bewijskrachtPlafond,
  magZelfBevestigen,
  NIET_DRAGENDE_DOCUMENTSOORTEN,
} from "../../src/pijplijn/documentsoort.ts";
import { bepaalDocumentvorm } from "../../src/pijplijn/documentvorm.ts";
import { bepaalModaliteit } from "../../src/pijplijn/claimmodaliteit.ts";
import { extraheerUitspraken } from "../../src/pijplijn/uitspraken.ts";

const NIET_BEVOEGD = [
  "netbeheerder",
  "statistiek",
  "geodata",
  "branchevereniging",
  "aanbestedingen",
  "vakmedium",
  "marktplatform",
  "onbekende-soort",
];

/** Teksten die de VORM van een authentiek besluit nabootsen. */
const VORMAANVALLEN: readonly { naam: string; titel: string; tekst: string; url?: string }[] = [
  {
    naam: "zet de rechtsmiddelenclausule eronder",
    titel: "Vaststelling nettarieven 2027",
    tekst:
      "Het tarief wordt vastgesteld op 12,50 euro per maand. Belanghebbenden kunnen " +
      "binnen zes weken bezwaar maken tegen dit besluit.",
  },
  {
    naam: "bootst de aanhef van een besluit na",
    titel: "Regeling tariefstructuur",
    tekst:
      "Gelet op artikel 41, eerste lid, van de Elektriciteitswet 1998, besluit de minister " +
      "van Klimaat en Groene Groei dat het tarief 12,50 euro wordt.",
  },
  {
    naam: "verzint een zaakkenmerk",
    titel: "Besluit tariefvaststelling",
    tekst:
      "Ons kenmerk ACM/2026/12345. Zaaknummer 98765. Het tarief is vastgesteld op " +
      "12,50 euro per maand en treedt in werking per 1 januari 2027.",
  },
  {
    naam: "zet 'Besluit' als kop",
    titel: "Besluit vaststelling transportcapaciteit",
    tekst: "De capaciteit wordt vastgesteld op 90 MW. Dat heeft de autoriteit op 1 maart 2027 besloten.",
  },
  {
    naam: "claimt een publicatie in de Staatscourant",
    titel: "Wijziging subsidieregeling",
    tekst:
      "Deze regeling is gepubliceerd in de Staatscourant 2026, nr. 12345 en treedt in " +
      "werking op 1 januari 2027. Het plafond bedraagt 125 miljoen euro per jaar.",
  },
  {
    naam: "bootst een besluitnotitie met datum na",
    titel: "Overname toegestaan",
    tekst:
      "De partijen mogen uitsluitende zeggenschap verkrijgen over de netbeheerder. " +
      "Dat heeft de autoriteit op 26 oktober 2026 besloten.",
  },
  {
    naam: "zet alle vormmarkeringen tegelijk",
    titel: "Geschilbesluit inzake transportcapaciteit",
    tekst:
      "Gelet op artikel 5. Ons kenmerk ACM/2026/1. Gepubliceerd in de Staatscourant. " +
      "Ter inzage gelegd. Belanghebbenden kunnen binnen zes weken bezwaar maken. " +
      "Het tarief is vastgesteld op 12,50 euro.",
  },
  {
    naam: "legt het pad naar bekendmakingen in de URL",
    titel: "Tariefbesluit 2027",
    tekst: "Het tarief wordt 12,50 euro per maand per 1 januari 2027.",
    url: "https://kwaadaardig.test/besluiten/tariefbesluit-2027",
  },
];

describe("documentvorm — manipulatie door broninhoud", () => {
  test("geen enkele vormaanval brengt een niet-bevoegde uitgever in een vaststellende soort", () => {
    /* DE KERN. De vorm is een EXTRA eis, geen vervanging van het gezag.
       Alle acht aanvallen halen hun vormmarkering binnen — dat mag —
       maar de soort blijft buiten de twee zwaarste. */
    let pogingen = 0;
    let vormGelukt = 0;
    for (const a of VORMAANVALLEN) {
      for (const uitgeverSoort of NIET_BEVOEGD) {
        pogingen += 1;
        const v = bepaalDocumentvorm({
          titel: a.titel,
          tekst: a.tekst,
          ...(a.url === undefined ? {} : { url: a.url }),
        });
        if (v.vorm === "BEKENDMAKING") vormGelukt += 1;

        const u = bepaalDocumentsoort({
          titel: a.titel,
          tekst: a.tekst,
          uitgeverSoort,
          ...(a.url === undefined ? {} : { url: a.url }),
        });
        assert.ok(
          !ALLEEN_BEVOEGD_GEZAG.includes(u.soort),
          `'${a.naam}' bij uitgever '${uitgeverSoort}' werd ${u.soort}`,
        );
        /* TWEE KEER TE STERK GEWEEST, en beide keren wees de toets een
           eigenschap van v1 aan in plaats van een gat in v2.

           Eerst stond hier `<= 3`: een NETBEHEERDER die een feit over
           zijn eigen net meldt komt legitiem op 4. Toen `< 5`: een
           STATISTIEK-uitgever is gezaghebbend over zijn eigen cijfers
           en komt daar legitiem op 5. Beide zijn plafonds van
           FEITELIJKE_MEDEDELING en hebben niets met de vorm-as te maken.

           Wat v2 WEL belooft, en wat hier dus hoort te staan: geen
           enkele niet-bevoegde uitgever komt in een vaststellende
           soort, en een pure marktpartij blijft op 2. */
        if (["vakmedium", "marktplatform", "aanbestedingen", "onbekende-soort"].includes(uitgeverSoort)) {
          assert.ok(
            bewijskrachtPlafond(u.soort, u.gezag) <= 2,
            `'${a.naam}' bij marktpartij '${uitgeverSoort}' haalde plafond ${bewijskrachtPlafond(u.soort, u.gezag)}`,
          );
        }
      }
    }
    assert.equal(pogingen, VORMAANVALLEN.length * NIET_BEVOEGD.length);
    assert.ok(
      vormGelukt > 0,
      "de vormaanvallen moeten de VORM wel halen, anders toetst dit niets over het gezag",
    );
  });

  test("de vorm kan een stuk wel OMLAAG halen, en dat is bewust", () => {
    /* Een bevoegd gezag dat 'Nieuwsbericht' boven zijn eigen besluit
       zet, verliest plafond 5. Dat is de toegestane richting: de hele
       motor rust erop dat tekst alleen verlaagt. */
    const basis =
      "Gelet op artikel 41 van de Elektriciteitswet. Het tarief is vastgesteld op 12,50 euro. " +
      "Belanghebbenden kunnen binnen zes weken bezwaar maken.";
    const echt = bepaalDocumentsoort({
      titel: "Tariefbesluit 2027",
      tekst: basis,
      uitgeverSoort: "toezichthouder",
      bronSleutel: "acm-besluiten",
    });
    const verlaagd = bepaalDocumentsoort({
      titel: "Tariefbesluit 2027",
      tekst: `Nieuwsbericht 01-03-2027 | 09:00 ${basis}`,
      uitgeverSoort: "toezichthouder",
      bronSleutel: "acm-besluiten",
    });
    assert.equal(echt.soort, "OFFICIEEL_BESLUIT");
    assert.equal(verlaagd.soort, "NIEUWSBERICHT_REGELGEVING");
    assert.ok(
      bewijskrachtPlafond(verlaagd.soort, verlaagd.gezag) <
        bewijskrachtPlafond(echt.soort, echt.gezag),
      "zelfverlaging hoort te werken",
    );
  });

  /* ---------- geval 1 · nieuwsberichten die wettelijke taal citeren ---------- */

  test("een nieuwsbericht dat wettelijke formuleringen citeert stelt niets vast", () => {
    /* Dit is het gemeten defect, hier in zijn scherpste vorm: het
       bericht citeert de wettekst WOORDELIJK, inclusief de aanhef. De
       zelfbenoeming moet het alsnog buiten de vaststellende soorten
       houden. */
    const citaten = [
      "In de regeling staat: 'Gelet op artikel 41 van de Elektriciteitswet 1998 besluit de " +
        "minister dat het tarief wordt vastgesteld op 12,50 euro.' Dat is nu bekendgemaakt.",
      "De wetswijziging treedt in werking op 1 januari 2027. De Staatscourant publiceerde " +
        "het besluit vandaag onder kenmerk ACM/2026/1.",
      "Letterlijk uit het besluit: 'Belanghebbenden kunnen binnen zes weken bezwaar maken.' " +
        "De inwerkingtreding is per 1 juli 2027.",
      "De beleidsregel is vastgesteld en ter inzage gelegd. De minister heeft besloten dat " +
        "het plafond 125 miljoen euro per jaar wordt.",
    ];
    for (const tekst of citaten) {
      for (const bron of [
        { sleutel: "rijksoverheid-nieuws", soort: "rijksoverheid" },
        { sleutel: "acm-besluiten", soort: "toezichthouder" },
      ]) {
        const u = bepaalDocumentsoort({
          titel: "Nieuwe regels aangekondigd",
          tekst: `Nieuwsbericht 29-10-2026 | 10:14 ${tekst}`,
          url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/29/nieuwe-regels",
          uitgeverSoort: bron.soort,
          bronSleutel: bron.sleutel,
        });
        assert.ok(
          !ALLEEN_BEVOEGD_GEZAG.includes(u.soort),
          `een nieuwsbericht met citaat werd ${u.soort}: "${tekst.slice(0, 50)}"`,
        );
        assert.equal(
          magZelfBevestigen(u.soort, u.gezag),
          false,
          `een nieuwsbericht met citaat mocht zelf bevestigen: ${u.soort}`,
        );
      }
    }
  });

  /* ---------- geval 2 · ontwerpbesluiten ---------- */

  test("een ontwerpbesluit stelt nooit iets vast, met of zonder besluittaal", () => {
    const ontwerpen = [
      {
        titel: "Ontwerpbesluit vaststelling nettarieven 2027",
        tekst:
          "Gelet op artikel 41 van de Elektriciteitswet. De ACM stelt hierbij vast dat het " +
          "tarief 12,50 euro wordt. Belanghebbenden kunnen binnen zes weken bezwaar maken.",
      },
      {
        titel: "Ontwerpregeling subsidie zonnepanelen",
        tekst:
          "Het plafond bedraagt 90 MW per jaar. U kunt uw zienswijze indienen tot " +
          "1 maart 2027. Gepubliceerd in de Staatscourant.",
      },
      {
        titel: "Voorgenomen besluit intrekking vergunning",
        tekst:
          "Het voorgenomen besluit strekt tot intrekking van de vergunning per 1 juli 2027. " +
          "Ons kenmerk ACM/2026/9.",
      },
      {
        titel: "Conceptregeling warmtetarieven",
        tekst:
          "De conceptregeling stelt het tarief op 45 euro per gigajoule. Memorie van " +
          "toelichting bijgevoegd.",
      },
    ];
    for (const o of ontwerpen) {
      const v = bepaalDocumentvorm({ titel: o.titel, tekst: o.tekst });
      assert.equal(v.vorm, "ONTWERP", `${o.titel} kreeg vorm ${v.vorm}`);

      for (const bron of [
        { sleutel: "acm-besluiten", soort: "toezichthouder" },
        { sleutel: "koop-staatscourant-energie", soort: "rijksoverheid" },
      ]) {
        const u = bepaalDocumentsoort({
          titel: o.titel,
          tekst: o.tekst,
          uitgeverSoort: bron.soort,
          bronSleutel: bron.sleutel,
        });
        assert.ok(
          !ALLEEN_BEVOEGD_GEZAG.includes(u.soort),
          `${o.titel} werd ${u.soort} bij ${bron.sleutel}`,
        );
        assert.equal(magZelfBevestigen(u.soort, u.gezag), false, `${o.titel} mocht bevestigen`);
        assert.ok(
          NIET_DRAGENDE_DOCUMENTSOORTEN.includes(u.soort),
          `${o.titel} werd ${u.soort} en mag daarmee een gepubliceerde kernclaim dragen`,
        );
      }
    }
  });

  test("een ontwerp wordt geen vaststelling door 'definitief' erbij te zetten", () => {
    const u = bepaalDocumentsoort({
      titel: "Ontwerpbesluit nettarieven — definitieve versie",
      tekst:
        "Dit is het definitieve en vastgestelde ontwerpbesluit. Het tarief is vastgesteld " +
        "op 12,50 euro en treedt onherroepelijk in werking.",
      uitgeverSoort: "toezichthouder",
      bronSleutel: "acm-besluiten",
    });
    assert.equal(u.soort, "ONTWERPBESLUIT");
  });

  /* ---------- geval 3 · brancheberichten die de ACM citeren ---------- */

  test("een branchebericht dat de ACM citeert blijft een navertelling", () => {
    /* HET OORSPRONKELIJKE DEFECT VAN R3, nu met de volledige
       besluittaal van de ACM erin. Netbeheer Nederland had 45 claims op
       bewijskracht 5; dit moet onbereikbaar blijven, ook nu de
       ACM-patronen ruimer zijn. */
    const berichten = [
      "De ACM concludeert dat de klacht gegrond is. Het congestierapport voldoet niet aan " +
        "de Netcode. Dat heeft de ACM op 26 oktober 2026 besloten.",
      "De ACM heeft vandaag de nettarieven voor 2027 vastgesteld op 12,50 euro per maand. " +
        "Gelet op artikel 41 van de Elektriciteitswet.",
      "Geschilbesluit: de ACM oordeelt dat de netbeheerder juist heeft gehandeld. " +
        "Belanghebbenden kunnen binnen zes weken bezwaar maken.",
      "De ACM heeft de registratie goedgekeurd onder de Data Governance Act. " +
        "Ons kenmerk ACM/2026/1.",
    ];
    for (const tekst of berichten) {
      for (const bron of [
        { sleutel: "netbeheer-nederland-nieuws", soort: "branchevereniging" },
        { sleutel: "een-vakmedium", soort: "vakmedium" },
        { sleutel: "een-platform", soort: "marktplatform" },
      ]) {
        const u = bepaalDocumentsoort({
          titel: "ACM stelt de nettarieven voor 2027 vast",
          tekst,
          uitgeverSoort: bron.soort,
          bronSleutel: bron.sleutel,
        });
        assert.ok(
          !ALLEEN_BEVOEGD_GEZAG.includes(u.soort),
          `${bron.sleutel} werd ${u.soort}`,
        );
        assert.equal(
          magZelfBevestigen(u.soort, u.gezag),
          false,
          `${bron.sleutel} mocht zelf bevestigen als ${u.soort}`,
        );
        assert.ok(
          bewijskrachtPlafond(u.soort, u.gezag) <= 3,
          `${bron.sleutel} haalde plafond ${bewijskrachtPlafond(u.soort, u.gezag)}`,
        );
      }
    }
  });

  test("de eigenHandelt-uitzondering geldt alleen bij een eigen gezagsnaam", () => {
    /* De uitzondering uit stap 3 laat een ACM-besluit over TenneT een
       besluit van de ACM blijven. Hij mag niet overslaan naar een bron
       die de ACM alleen CITEERT: die heeft geen eigen gezagsnaam in
       EIGEN_GEZAG_NAMEN. */
    const tekst =
      "De ACM oordeelt dat TenneT in lijn met de regelgeving heeft gehandeld. " +
      "De ACM heeft een besluit genomen in het geschil.";
    const eigen = bepaalDocumentsoort({
      titel: "Geschilbesluit Kallista Tethys - TenneT",
      tekst,
      uitgeverSoort: "toezichthouder",
      bronSleutel: "acm-besluiten",
    });
    const vreemd = bepaalDocumentsoort({
      titel: "Geschilbesluit Kallista Tethys - TenneT",
      tekst,
      uitgeverSoort: "branchevereniging",
      bronSleutel: "netbeheer-nederland-nieuws",
    });
    assert.equal(eigen.soort, "OFFICIEEL_BESLUIT", "de ACM beslist zelf");
    assert.equal(vreemd.soort, "SECUNDAIRE_BERICHTGEVING", "de branchevereniging vertelt na");
    assert.ok(
      vreemd.beschrijftBesluitVan !== null,
      "en de naam van het beslissende gezag moet mee, zodat het origineel te vinden is",
    );
  });

  /* ---------- geval 4 · besluiten zonder numerieke vaststelling ---------- */

  test("een officieel besluit zonder grootheid levert geen getalmatige claim", () => {
    /* DE SCHERPSTE TOETS VAN DEZE RONDE. Requirement 3 maakt
       concentratiebesluiten bereikbaar als OFFICIEEL_BESLUIT met
       plafond 5. Maar 'mag uitsluitende zeggenschap verkrijgen' stelt
       geen GROOTHEID vast. Zo'n besluit mag dus nooit het origineel
       worden voor een getalmatige navertelling.

       Dat is hier geen controle in de classificatielaag maar een
       eigenschap van de keten: een besluit zonder getal levert geen
       uitspraak met `waarde_numeriek`, en bronverificatie.ts eist
       `u.waarde_numeriek = $4`. Geen getal, geen anker. */
    const zonderGetal = [
      {
        titel: "DSW mag Salland overnemen (concentratiebesluit)",
        tekst:
          "DSW Zorgverzekeraar U.A. mag uitsluitende zeggenschap verkrijgen over Salland " +
          "Holding B.V. Dat heeft de ACM op 21 oktober 2026 besloten.",
      },
      {
        titel: "Woo-besluit met betrekking tot Roblox",
        tekst: "De ACM wijst het verzoek af op grond van artikel 7 Iw en artikel 12w Iw.",
      },
    ];
    for (const d of zonderGetal) {
      const u = bepaalDocumentsoort({
        titel: d.titel,
        tekst: d.tekst,
        uitgeverSoort: "toezichthouder",
        bronSleutel: "acm-besluiten",
      });
      /* Het IS een besluit — dat is wat requirement 3 vraagt. */
      assert.equal(u.soort, "OFFICIEEL_BESLUIT", d.titel);
      assert.equal(bewijskrachtPlafond(u.soort, u.gezag), 5);

      /* Maar er valt geen getalmatige uitspraak uit te halen, dus er is
         niets om een navertelling aan te ankeren. */
      const metGetal = extraheerUitspraken(d.titel, d.tekst).filter((x) => x.waardeNumeriek !== null);
      assert.deepEqual(
        metGetal.map((x) => x.tekst),
        [],
        `${d.titel} leverde een getalmatige uitspraak: ${JSON.stringify(metGetal)}`,
      );
    }
  });

  test("een besluit dat WEL een grootheid vaststelt levert een vaststellende claim", () => {
    /* De tegenproef. Zonder deze toets zou een extractie die altijd
       niets vindt de toets hierboven ook groen maken. */
    const titel = "Tariefbesluit 2027";
    const tekst =
      "Gelet op artikel 41 van de Elektriciteitswet. De ACM stelt hierbij vast dat het " +
      "nettarief per 1 januari 2027 12,50 euro per maand bedraagt. Belanghebbenden kunnen " +
      "binnen zes weken bezwaar maken.";
    const u = bepaalDocumentsoort({
      titel,
      tekst,
      uitgeverSoort: "toezichthouder",
      bronSleutel: "acm-besluiten",
    });
    assert.equal(u.soort, "OFFICIEEL_BESLUIT");

    const uitspraken = extraheerUitspraken(titel, tekst);
    const metGetal = uitspraken.filter((x) => x.waardeNumeriek !== null);
    assert.ok(metGetal.length > 0, "een tariefbesluit hoort een getal op te leveren");

    const m = bepaalModaliteit({ tekst: metGetal[0]!.tekst, documentsoort: u.soort });
    assert.equal(m.modaliteit, "VASTGESTELD", `"${metGetal[0]!.tekst}" -> ${m.modaliteit}`);
  });
});
