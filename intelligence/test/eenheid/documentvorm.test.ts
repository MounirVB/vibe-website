/* ============================================================
   EENHEID — de documentvorm en de v2-soorten
   ------------------------------------------------------------
   Twee dingen staan hier vast. Eerst de vorm-as zelf: welke
   structuurmarkering welke vorm oplevert, en in welke orde ze elkaar
   verslaan. Daarna wat die vorm met de SOORT doet — en dat is waar het
   gemeten defect zat.

   Deze toetsen raken geen netwerk en geen database. `bepaalDocumentvorm`
   en `bepaalDocumentsoort` zijn puur, dus elk geval is hier exact te
   stellen.
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import {
  bepaalDocumentvorm,
  DOCUMENTVORM_VERSIE,
  vormKanVaststellen,
  VASTSTELLENDE_VORMEN,
} from "../../src/pijplijn/documentvorm.ts";
import {
  bepaalDocumentsoort,
  bewijskrachtPlafond,
  DOCUMENTSOORT_VERSIE,
  magZelfBevestigen,
  NIET_DRAGENDE_DOCUMENTSOORTEN,
} from "../../src/pijplijn/documentsoort.ts";
import {
  ACHTERGEHOUDEN,
  GELABELDE_DOCUMENTEN,
} from "../vast/gelabelde-documenten.ts";

/** Genoeg tekst om boven MIN_TEKST (40) te komen. */
const VULLING =
  " De regeling raakt alle netbeheerders in Nederland en wordt uitgevoerd door de toezichthouder.";

const vorm = (titel: string, tekst: string, url?: string) =>
  bepaalDocumentvorm({ titel, tekst, ...(url === undefined ? {} : { url }) }).vorm;

const soortVan = (
  titel: string,
  tekst: string,
  uitgeverSoort = "rijksoverheid",
  url?: string,
  bronSleutel?: string,
) =>
  bepaalDocumentsoort({
    titel,
    tekst,
    uitgeverSoort,
    ...(url === undefined ? {} : { url }),
    ...(bronSleutel === undefined ? {} : { bronSleutel }),
  });

describe("de documentvorm", () => {
  test("de versie staat vast", () => {
    assert.equal(DOCUMENTVORM_VERSIE, "documentvorm-v1");
    assert.deepEqual(VASTSTELLENDE_VORMEN, ["BEKENDMAKING"]);
    assert.equal(vormKanVaststellen("BEKENDMAKING"), true);
    for (const v of ["ONTWERP", "NIEUWSBERICHT", "PERSBERICHT", "ARTIKEL"] as const) {
      assert.equal(vormKanVaststellen(v), false, `${v} mag niet vaststellen`);
    }
  });

  test("zonder vormmarkering is het ARTIKEL en niet BEKENDMAKING", () => {
    /* DE BODEM IS CONSERVATIEF. Geen aangetoonde vorm betekent geen
       authentiek stuk; anders zou een document dat niets over zichzelf
       zegt het voordeel van de twijfel krijgen bij de zwaarste soort. */
    assert.equal(vorm("Iets over tarieven", `Er gebeurt iets.${VULLING}`), "ARTIKEL");
  });

  test("een zelfbenoemd nieuwsbericht is NIEUWSBERICHT", () => {
    assert.equal(
      vorm("Nieuwe regels", `Nieuwsbericht 29-10-2026 | 10:14 Vanaf morgen geldt het.${VULLING}`),
      "NIEUWSBERICHT",
    );
  });

  test("het URL-pad van de uitgever telt ook als vormmarkering", () => {
    /* De redactie bepaalt het pad; de tekst kan geciteerd zijn. */
    assert.equal(
      vorm("Iets", `Er gebeurt iets.${VULLING}`, "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/29/iets"),
      "NIEUWSBERICHT",
    );
  });

  test("een nieuwsbericht dat de Staatscourant AANHAALT blijft een nieuwsbericht", () => {
    /* DE ORDE IS HET ONTWERP. De verwijzing naar de bekendmaking is
       juist het bewijs dat dit stuk de bekendmaking NIET is. */
    assert.equal(
      vorm(
        "Regeling gepubliceerd",
        `Nieuwsbericht 29-10-2026 De regeling is gepubliceerd in de Staatscourant.${VULLING}`,
      ),
      "NIEUWSBERICHT",
    );
  });

  test("een ontwerp verslaat elke andere markering", () => {
    assert.equal(
      vorm(
        "Ontwerpbesluit tariefstructuur",
        `Nieuwsbericht 29-10-2026 Gelet op artikel 5 van de Elektriciteitswet.${VULLING}`,
      ),
      "ONTWERP",
      "een ontwerp in bekendmakingsvorm is nog steeds een ontwerp",
    );
  });

  test("de rechtsmiddelenclausule maakt het een BEKENDMAKING", () => {
    /* De betrouwbaarste markering die er is: de Awb verplicht een
       bestuursorgaan te vermelden hoe en binnen welke termijn bezwaar
       openstaat. Een nieuwsbericht doet dat niet. */
    assert.equal(
      vorm(
        "Vaststelling tarieven",
        `De tarieven zijn vastgesteld. Belanghebbenden kunnen binnen zes weken bezwaar maken.${VULLING}`,
      ),
      "BEKENDMAKING",
    );
  });

  test("de aanhef 'gelet op artikel' maakt het een BEKENDMAKING", () => {
    assert.equal(
      vorm("Regeling", `Gelet op artikel 5, eerste lid, van de Elektriciteitswet 1998.${VULLING}`),
      "BEKENDMAKING",
    );
  });

  test("een besluitsoort in de naam maakt het een BEKENDMAKING", () => {
    for (const naam of [
      "Geschilbesluit Jumbo - Liander",
      "Concentratiebesluit inzake overname",
      "Woo-besluit met betrekking tot Roblox",
      "Tariefbesluit 2027",
      "Boetebesluit netbeheerder",
    ]) {
      assert.equal(vorm(naam, `Iets over de zaak.${VULLING}`), "BEKENDMAKING", naam);
    }
  });

  test("het losse woord 'besluit' in een zin is GEEN vormmarkering", () => {
    /* Anders is elk nieuwsbericht een bekendmaking: "het kabinet neemt
       een besluit over" staat overal. De markering eist een
       samenstelling of een kop. */
    assert.equal(
      vorm("Kabinet neemt besluit over netcongestie", `Het kabinet neemt een besluit.${VULLING}`),
      "ARTIKEL",
    );
  });

  test("'Besluit <onderwerp>' als kop is wel een vormmarkering", () => {
    assert.equal(
      vorm("Besluit databemiddelingsdienst Stichting digiGO", `De registratie is goedgekeurd.${VULLING}`),
      "BEKENDMAKING",
    );
  });

  test("orgaan plus besluitdatum plus beslissing is een BEKENDMAKING", () => {
    assert.equal(
      vorm("Overname toegestaan", `Dat heeft de ACM op 26 oktober 2026 besloten.${VULLING}`),
      "BEKENDMAKING",
    );
  });

  test("een datum ZONDER dag en jaar is geen besluitdatum", () => {
    /* Gemeten op de labelset: "Het kabinet heeft in maart toegezegd"
       mag geen bekendmaking worden. */
    assert.equal(
      vorm("Olievoorraad", `Het kabinet heeft in maart toegezegd 16% vrij te geven.${VULLING}`),
      "ARTIKEL",
    );
  });

  test("een nieuwsbericht OVER een wetsvoorstel in consultatie is geen ontwerp", () => {
    /* ZELFCORRECTIE. Mijn eerste versie had `wetsvoorstel`,
       `internetconsultatie` en `ter consultatie` als ontwerpmarkering.
       Daarmee werd elk nieuwsartikel dat een wetsvoorstel noemt een
       ONTWERPBESLUIT: plafond 2 en niet-dragend. De vorm moet zeggen
       "dit stuk IS het ontwerp", niet "dit stuk gaat erover". */
    assert.equal(
      vorm(
        "Inzet uitzendkrachten wordt begrensd in tijd",
        "Nieuwsbericht 29-10-2026 Een uitzendkracht mag straks nog maximaal 3 jaar bij " +
          "dezelfde inlener werken. Dit staat in het wetsvoorstel dat vandaag in " +
          "internetconsultatie gaat.",
      ),
      "NIEUWSBERICHT",
    );
  });
});

describe("de vorm beslist of een stuk mag vaststellen", () => {
  const REGELTEKST =
    "Vanaf 1 november 2026 treedt de wijziging van de Wet toeristische verhuur in werking." +
    VULLING;

  test("HET GEMETEN DEFECT — een nieuwsbericht wordt geen OFFICIELE_REGELGEVING", () => {
    const u = soortVan(
      "Nieuwe regels voor toeristische verhuur vanaf 1 november 2026",
      `Nieuwsbericht 29-10-2026 | 10:14 ${REGELTEKST}`,
      "rijksoverheid",
      "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/29/nieuwe-regels",
      "rijksoverheid-nieuws",
    );
    assert.equal(u.soort, "NIEUWSBERICHT_REGELGEVING");
    assert.equal(u.vorm, "NIEUWSBERICHT");
    assert.equal(bewijskrachtPlafond(u.soort, u.gezag), 3, "plafond 3, niet 5");
    assert.equal(
      magZelfBevestigen(u.soort, u.gezag),
      false,
      "en het mag geen claim op bevestigd zetten",
    );
  });

  test("dezelfde tekst IN BEKENDMAKINGSVORM is wel OFFICIELE_REGELGEVING", () => {
    /* DE TEGENPROEF. Zonder deze toets zou een poort die alles weigert
       ook groen staan. De inhoud is identiek; alleen de vorm verschilt. */
    const u = soortVan(
      "Wijziging van de Wet toeristische verhuur",
      `Gelet op artikel 5 van de Huisvestingswet. ${REGELTEKST} Gepubliceerd in de Staatscourant.`,
      "rijksoverheid",
      undefined,
      "koop-staatscourant-energie",
    );
    assert.equal(u.vorm, "BEKENDMAKING");
    assert.equal(u.soort, "OFFICIELE_REGELGEVING");
    assert.equal(bewijskrachtPlafond(u.soort, u.gezag), 5);
    assert.equal(magZelfBevestigen(u.soort, u.gezag), true);
  });

  test("een ontwerp met besluittaal wordt ONTWERPBESLUIT", () => {
    const u = soortVan(
      "Ontwerpbesluit vaststelling nettarieven 2027",
      `Gelet op artikel 41 van de Elektriciteitswet. De ACM stelt hierbij vast dat het tarief 12 euro wordt.${VULLING}`,
      "toezichthouder",
      undefined,
      "acm-besluiten",
    );
    assert.equal(u.vorm, "ONTWERP");
    assert.equal(u.soort, "ONTWERPBESLUIT");
    assert.equal(bewijskrachtPlafond(u.soort, u.gezag), 2);
    assert.equal(magZelfBevestigen(u.soort, u.gezag), false);
    assert.ok(
      NIET_DRAGENDE_DOCUMENTSOORTEN.includes(u.soort),
      "een ontwerp mag geen gepubliceerde kernclaim dragen",
    );
  });

  test("een ontwerp ZONDER besluittaal wordt ook ONTWERPBESLUIT", () => {
    /* HET GAT DAT HET LABELWERK VOND. De vormcontrole in stap 4 vuurt
       alleen bij een besluit- of regelsignaal. Een consultatiestuk
       zonder zo'n signaal viel erlangs en kwam uit op
       FEITELIJKE_MEDEDELING: plafond 4, mag zichzelf bevestigen.
       Stap 3b vangt dat nu af. */
    const u = soortVan(
      "Ontwerpregeling subsidie zonnepanelen",
      `Het plafond wordt 90 MW per jaar. U kunt uw zienswijze indienen tot 1 maart 2027.${VULLING}`,
      "rijksoverheid",
    );
    assert.equal(u.vorm, "ONTWERP");
    assert.equal(u.soort, "ONTWERPBESLUIT");
    assert.notEqual(u.soort, "FEITELIJKE_MEDEDELING");
  });

  test("de vorm staat in de uitslag, ook als hij de soort niet raakte", () => {
    /* Een audit moet kunnen zien WAAROM een stuk met besluittaal geen
       besluit werd; zonder dit veld is dat alleen uit de grondslag-json
       te vissen. */
    const u = soortVan("Gewoon bericht", `Er gebeurt iets.${VULLING}`);
    assert.equal(u.vorm, "ARTIKEL");
    assert.equal(u.soort, "FEITELIJKE_MEDEDELING");
    assert.equal(u.versie, DOCUMENTSOORT_VERSIE);
  });

  test("een besluit OVER een netbeheerder is geen besluit VAN die netbeheerder", () => {
    /* Het diepste defect uit het labelwerk. ANDER_GEZAG zag 'TenneT' en
       maakte er een navertelling van, met beschrijftBesluitVan='TenneT'.
       Dat is onwaar: TenneT is de partij waarover de ACM beslist, en
       bronverificatie zou bij TenneT naar een origineel zoeken dat daar
       niet bestaat. */
    const u = soortVan(
      "Geschilbesluit Kallista Tethys - TenneT",
      "De ACM oordeelt dat TenneT in lijn met de geldende wet- en regelgeving heeft " +
        "gehandeld door Tethys geen aansluiting aan te bieden. De ACM heeft een besluit genomen.",
      "toezichthouder",
      "https://www.acm.nl/nl/publicaties/geschilbesluit-kallista-tethys-tennet",
      "acm-besluiten",
    );
    assert.equal(u.soort, "OFFICIEEL_BESLUIT");
    assert.equal(u.beschrijftBesluitVan, null, "er is geen ander gezag dat hier besluit");
  });
});

describe("de gelabelde documenten", () => {
  /* REGRESSIEVANGNET, GEEN ONAFHANKELIJKE METING MEER. De eerste ronde
     gaf soort 17/23 en legde zes defecten bloot; na reparatie staat het
     op 23/23. Dat tweede getal zegt dat de defecten verholpen zijn, niet
     dat de motor op onbekende documenten 100% haalt — het eerlijke
     cijfer daarvoor is 15/21. Zie de kop van gelabelde-documenten.ts. */

  test("de vorm klopt voor alle 23 gelabelde documenten", () => {
    const mis: string[] = [];
    for (const d of GELABELDE_DOCUMENTEN) {
      const u = bepaalDocumentvorm({ titel: d.titel, tekst: d.tekst, url: d.url });
      if (u.vorm !== d.vorm) mis.push(`${d.nr}: ${u.vorm} ipv ${d.vorm}`);
    }
    assert.deepEqual(mis, [], `vormafwijkingen: ${mis.join(" | ")}`);
  });

  test("de soort klopt voor alle 23 gelabelde documenten", () => {
    const mis: string[] = [];
    for (const d of GELABELDE_DOCUMENTEN) {
      const u = bepaalDocumentsoort({
        titel: d.titel,
        tekst: d.tekst,
        url: d.url,
        uitgeverSoort: d.uitgeverSoort,
        bronSleutel: d.bronSleutel,
      });
      if (u.soort !== d.soort) mis.push(`${d.nr}: ${u.soort} ipv ${d.soort}`);
    }
    assert.deepEqual(mis, [], `soortafwijkingen: ${mis.join(" | ")}`);
  });

  test("de achtergehouden set is 21 van de 23 documenten", () => {
    assert.equal(GELABELDE_DOCUMENTEN.length, 23);
    assert.equal(ACHTERGEHOUDEN.length, 21);
    assert.deepEqual(
      GELABELDE_DOCUMENTEN.filter((d) => d.gebruiktBijOntwerp).map((d) => d.nr),
      [13, 15],
    );
  });

  test("elk label draagt een reden", () => {
    for (const d of GELABELDE_DOCUMENTEN) {
      assert.ok(d.waarom.length > 20, `${d.nr}: een label zonder reden is niet na te kijken`);
    }
  });

  test("geen enkel nieuwsbericht uit de set mag vaststellen", () => {
    /* De kern van de correctie, over de hele set gemeten in plaats van
       op één document. */
    for (const d of GELABELDE_DOCUMENTEN.filter((x) => x.vorm === "NIEUWSBERICHT")) {
      const u = bepaalDocumentsoort({
        titel: d.titel,
        tekst: d.tekst,
        url: d.url,
        uitgeverSoort: d.uitgeverSoort,
        bronSleutel: d.bronSleutel,
      });
      assert.notEqual(u.soort, "OFFICIELE_REGELGEVING", `${d.nr} werd regelgeving`);
      assert.notEqual(u.soort, "OFFICIEEL_BESLUIT", `${d.nr} werd een besluit`);
    }
  });
});
