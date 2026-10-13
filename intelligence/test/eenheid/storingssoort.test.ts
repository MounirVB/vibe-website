/* ============================================================
   EENHEID — storingstaxonomie
   ------------------------------------------------------------
   Negen soorten, en de hele winst zit in de grensgevallen: wat is een
   storing, wat is een grens die de uitgever stelt, en wat is gewoon
   stilte.
   ============================================================ */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classificeerStoring, STORINGSSOORT_HANDELING } from "../../src/bronnen/storingssoort.ts";

const basis = {
  resultaat: "fout" as const,
  httpStatus: null,
  foutSoort: null,
  herhaalbaar: null,
  aantalItems: 0,
  robotsStatus: "toegestaan",
  tdmStatus: "geen_voorbehoud",
  overgeslagenReden: null,
};

describe("classificeerStoring", () => {
  it("noemt een geslaagde ophaling met items geen storing", () => {
    const r = classificeerStoring({ ...basis, resultaat: "ok", httpStatus: 200, aantalItems: 25 });
    assert.equal(r.soort, null);
    assert.equal(r.opschortenMinuten, null);
  });

  it("noemt 304 geen storing", () => {
    assert.equal(classificeerStoring({ ...basis, resultaat: "niet_gewijzigd" }).soort, null);
  });

  it("noemt nul items na filteren LEEG_MAAR_GEZOND, niet een fout", () => {
    /* Par. 18: een bron die door een uitsluitpatroon leegloopt werkt
       precies zoals bedoeld en mag het dashboard niet rood maken. */
    const r = classificeerStoring({ ...basis, resultaat: "ok", httpStatus: 200, aantalItems: 0 });
    assert.equal(r.soort, "LEEG_MAAR_GEZOND");
    assert.equal(r.opschortenMinuten, null, "hier hoort niets opgeschort te worden");
  });

  it("scheidt een ONLEESBARE robots.txt van een VERBODEN pad", () => {
    /* Het kerngeval. Gemeten bij TenderNed: /robots.txt geeft 302 naar
       /cms/robots.txt en die gaf bij vijf pogingen vier keer 200 en een
       keer 503. We halen op dat moment niets op (RFC 9309), maar dit is
       een haperende server en geen uitgever die ons buitensluit.
       Zouden die twee dezelfde soort krijgen, dan werd een werkende
       bron een week opgeschort. */
    const onleesbaar = classificeerStoring({ ...basis, foutSoort: "robots_onleesbaar" });
    assert.equal(onleesbaar.soort, "TIJDELIJKE_STORING");
    assert.equal(onleesbaar.opschortenMinuten, null, "niet opschorten bij een hapering");

    const verboden = classificeerStoring({ ...basis, foutSoort: "robots_verbod" });
    assert.equal(verboden.soort, "TOEGANG_BEPERKT");
    assert.ok(
      (verboden.opschortenMinuten ?? 0) >= 24 * 60,
      "een echt verbod hoort wel opgeschort te worden",
    );
  });

  it("doet dat ook na een redirect", () => {
    assert.equal(
      classificeerStoring({ ...basis, foutSoort: "robots_onleesbaar_na_redirect" }).soort,
      "TIJDELIJKE_STORING",
    );
    assert.equal(
      classificeerStoring({ ...basis, foutSoort: "robots_verbod_na_redirect" }).soort,
      "TOEGANG_BEPERKT",
    );
  });

  it("leest de HTTP-statussen die een eigen antwoord vragen", () => {
    const soortVan = (httpStatus: number) => classificeerStoring({ ...basis, httpStatus }).soort;
    assert.equal(soortVan(401), "NIET_GEAUTORISEERD");
    assert.equal(soortVan(403), "TOEGANG_BEPERKT");
    assert.equal(soortVan(429), "SNELHEIDSBEGRENSD");
    assert.equal(soortVan(404), "ONGELDIG_ENDPOINT");
    assert.equal(soortVan(410), "AFGESCHAFT");
    assert.equal(soortVan(500), "TIJDELIJKE_STORING");
    assert.equal(soortVan(503), "TIJDELIJKE_STORING");
  });

  it("noemt een 500 TIJDELIJK en schort niets op", () => {
    /* Gemeten: rvo-subsidie-sitemap stond op HTTP 500 en gaf live weer
       200 met 1,86 MB. Een 500 opschorten zou die bron voor niets
       stilgelegd hebben. */
    const r = classificeerStoring({ ...basis, httpStatus: 500 });
    assert.equal(r.soort, "TIJDELIJKE_STORING");
    assert.equal(r.opschortenMinuten, null);
  });

  it("scheidt een ontledingsfout van een routefout", () => {
    assert.equal(classificeerStoring({ ...basis, foutSoort: "bron_parse" }).soort, "ONTLEDING_MISLUKT");
    assert.equal(classificeerStoring({ ...basis, foutSoort: "netwerk_uit" }).soort, "NETWERKFOUT");
  });

  it("merkt een TDM-voorbehoud als toegangsbeperking aan, niet als stilte", () => {
    const r = classificeerStoring({
      ...basis,
      resultaat: "overgeslagen",
      tdmStatus: "voorbehoud",
      overgeslagenReden: "toestemming niet vastgesteld (robots=toegestaan, tdm=voorbehoud)",
    });
    assert.equal(r.soort, "TOEGANG_BEPERKT");
  });

  it("noemt 'onbekend' GEEN toegangsbeperking", () => {
    /* Gemeten: logistiek-hotspots heeft robots=onbekend en
       energieonderbrekingen heeft tdm=onbekend. Beide blokkeren het
       ophalen — terecht, zonder vastgestelde toestemming halen we niets
       op — maar niemand heeft nee gezegd; het is nooit nagetrokken.

       Dat als TOEGANG_BEPERKT aanmerken zou twee dingen fout doen: het
       zegt dat een uitgever ons weigert terwijl dat niet is vastgesteld,
       en het zou de bron zeven dagen opschorten terwijl de handeling
       juist is om VANDAAG het beleid na te trekken. */
    const r = classificeerStoring({
      ...basis,
      resultaat: "overgeslagen",
      robotsStatus: "onbekend",
      overgeslagenReden: "toestemming niet vastgesteld (robots=onbekend, tdm=geen_voorbehoud)",
    });
    assert.equal(r.soort, null, "onbekend is geen van de negen storingssoorten");

    const t = classificeerStoring({
      ...basis,
      resultaat: "overgeslagen",
      tdmStatus: "onbekend",
      overgeslagenReden: "toestemming niet vastgesteld (robots=toegestaan, tdm=onbekend)",
    });
    assert.equal(t.soort, null);
  });

  it("noemt een VASTGESTELD robotsverbod wel een toegangsbeperking", () => {
    const r = classificeerStoring({
      ...basis,
      resultaat: "overgeslagen",
      robotsStatus: "verboden",
      overgeslagenReden: "toestemming niet vastgesteld (robots=verboden, tdm=onbekend)",
    });
    assert.equal(r.soort, "TOEGANG_BEPERKT");
  });

  it("noemt een handmatig uitgezette bron geen storing", () => {
    const r = classificeerStoring({
      ...basis,
      resultaat: "overgeslagen",
      overgeslagenReden: "bron staat uit",
    });
    assert.equal(r.soort, null);
  });

  it("verzint bij een onbekende combinatie niets en bewaart de ruwe gegevens", () => {
    const r = classificeerStoring({ ...basis, httpStatus: null, foutSoort: "iets_nieuws" });
    assert.equal(r.soort, "TIJDELIJKE_STORING", "de mildste aanname");
    assert.match(r.detail, /foutsoort=iets_nieuws/, "de ruwe gegevens horen in het detail");
  });

  it("heeft voor elke soort een handeling", () => {
    /* Een taxonomie zonder handeling is een label. Elke soort hoort te
       zeggen wat een mens ermee moet. */
    for (const [soort, handeling] of Object.entries(STORINGSSOORT_HANDELING)) {
      assert.ok(handeling.length > 10, `${soort} heeft geen bruikbare handeling`);
    }
  });

  it("omzeilt niets: geen enkele handeling stelt een andere User-Agent of proxy voor", () => {
    /* Expliciete opdrachteis. Deze toets staat hier zodat een latere
       'oplossing' voor een 403 niet stil in de handelingstekst sluipt. */
    for (const [soort, handeling] of Object.entries(STORINGSSOORT_HANDELING)) {
      assert.doesNotMatch(
        handeling,
        /user-?agent|proxy|vermom|omzeil|spoof|scrape/i,
        `${soort} stelt een omzeiling voor: ${handeling}`,
      );
    }
  });
});
