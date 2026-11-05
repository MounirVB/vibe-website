/* ============================================================
   EENHEID — twee vocabulairetermen, en één besluit om NIET uit te breiden
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET.

   1 DE TWEE TERMEN. `telTermen()` eist harde woordgrenzen, dus een
     Nederlandse samenstelling matcht niet op zijn kern:
     'congestierapport' viel niet onder 'congestie' en
     'tariefbeschikking' niet onder 'nettarief'. Twee ACM-besluiten die
     WEL over ons domein gaan kregen daardoor 0 onderwerptreffers en
     konden nooit een gebeurtenis worden.

   2 DAT DIE DOCUMENTEN GEEN CLAIM OPLEVEREN. Dat is de kern van de eis
     'voorkom onterechte juridische claimbevestiging'. Een
     OFFICIEEL_BESLUIT van een BEVOEGD_GEZAG mag zichzelf bevestigen —
     dus als deze documenten claims zouden produceren, zouden die direct
     bevestigd worden. Ze doen dat niet, want ze bevatten geen getal met
     een eenheid. Dat is hier gemeten en niet aangenomen.

   3 HET BESLUIT OM `vastgoedontwikkeling` NIET TE SPLITSEN, met de
     getallen waarop dat rust.

   DE TITELS ZIJN DE ECHTE PRODUCTIETITELS, letterlijk overgenomen uit
   intel.brondocument_versies op 1 november 2026. Een verzonnen titel
   zou deze toets laten slagen op een tekst die niet bestaat.
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import { gebeurtenisSoortVan, herkenOnderwerpen } from "../../src/pijplijn/onderwerpen.ts";
import { extraheerUitspraken } from "../../src/pijplijn/uitspraken.ts";
import { NIEUWSDREMPELS, SIGNAALSOORTEN } from "../../src/pijplijn/nieuwsselectie.ts";

/** De vijf productiedocumenten die de twee termen raken, met hun id. */
const DOCUMENTEN = [
  {
    versie: 18,
    titel: "Beslissingen op bezwaren tegen tariefbeschikkingen Bonaire 2026",
    bron: "acm-besluiten",
    soort: "FEITELIJKE_MEDEDELING",
    gezag: "BEVOEGD_GEZAG",
    onderwerp: "netbeheer",
  },
  {
    versie: 3673,
    titel: "Geschilbesluit Jumbo – Liander over congestierapport",
    bron: "acm-besluiten",
    soort: "OFFICIEEL_BESLUIT",
    gezag: "BEVOEGD_GEZAG",
    onderwerp: "netcongestie",
  },
  {
    versie: 1325,
    titel: "netbeheerders publiceren nieuwe congestierapporten voor teruglevering",
    bron: "liander-sitemap",
    soort: "ONVOLDOENDE_VERIFIEERBAAR",
    gezag: "NETBEHEERDER",
    onderwerp: "netcongestie",
  },
  {
    versie: 1405,
    titel: "netbeheerders publiceren nieuwe congestierapporten levering van elektriciteit",
    bron: "liander-sitemap",
    soort: "ONVOLDOENDE_VERIFIEERBAAR",
    gezag: "NETBEHEERDER",
    onderwerp: "netcongestie",
  },
] as const;

describe("de twee vocabulairetermen", () => {
  for (const d of DOCUMENTEN) {
    test(`versie ${d.versie} (${d.bron}) wordt herkend als ${d.onderwerp}`, () => {
      const treffers = herkenOnderwerpen(d.titel, d.titel);
      assert.ok(
        treffers.length > 0,
        `deze titel hoorde 0 onderwerpen te geven vóór 1 november 2026 en moet er nu minstens ` +
          `één geven; zonder dat kan dit document nooit een gebeurtenis worden`,
      );
      assert.ok(
        treffers.some((t) => t.onderwerp === d.onderwerp),
        `verwacht ${d.onderwerp}, gevonden ${treffers.map((t) => t.onderwerp).join(", ")}`,
      );
    });
  }

  test("DE KERNEIS — geen van deze documenten levert een claim op die zichzelf bevestigt", () => {
    /* WAAROM DIT DE BELANGRIJKSTE ZAAK VAN DIT BESTAND IS.
       magZelfBevestigen() laat OFFICIEEL_BESLUIT bij BEVOEGD_GEZAG juist
       WEL zichzelf bevestigen. Versie 3673 is zo'n document. Zou hij een
       claim produceren die NIET als juridisch geldt, dan werd die direct
       bevestigd — en dan had het toevoegen van een vocabulaireterm een
       juridische bevestiging opgeleverd die niemand heeft gewogen.

       ------------------------------------------------------------------
       HERSCHREVEN OP 6 NOVEMBER 2026, EN DE EIS IS NIET VERZWAKT.

       Tot die dag stond hier `claims.length === 0` voor alle vier de
       documenten, met als grond: "Ze bevatten geen getal met een
       eenheid, en extraheerUitspraken() heeft een getal nodig."

       Die grond is vervallen. De vormextractie (§4) leest nu ook
       niet-numerieke claims, en versie 3673 — "Geschilbesluit Jumbo –
       Liander over congestierapport" — levert er terecht één op: dat IS
       een feitelijk besluit. Een nieuwskanaal over netcongestie dat een
       ACM-geschilbesluit niet als claim kan opslaan, mist zijn
       onderwerp.

       WAT DEZE TOETS BEWAAKTE is niet "nul claims" maar "geen
       ONGEWOGEN bevestiging". Die eigenschap wordt hier nu DIRECT
       getoetst in plaats van via een getal dat er toevallig nul was:
       een BESLUIT, een VERPLICHTING en een INWERKINGTREDING gelden in
       uitspraken.ts als JURIDISCHE claim, ongeacht wat
       bepaalClaimAard() in de zin vindt, en moeten dus langs
       steltStukDeClaimVast() voordat ze zichzelf mogen bevestigen.

       En deze toets heeft dat gat ook echt gevonden: hij werd rood toen
       de vormextractie erbij kwam, en de reparatie in uitspraken.ts
       (JURIDISCHE_VORMEN) is er het gevolg van. */
    const JURIDISCHE_VORMEN = new Set(["BESLUIT", "VERPLICHTING", "INWERKINGTREDING"]);

    for (const d of DOCUMENTEN) {
      const claims = extraheerUitspraken(d.titel, d.titel);

      /* 1 · GEEN ENKELE GETALCLAIM. Dat was en blijft nul: deze titels
         bevatten geen getal met een eenheid. */
      const getalclaims = claims.filter((c) => c.waardeNumeriek !== null);
      assert.equal(
        getalclaims.length,
        0,
        `versie ${d.versie} hoort geen getalclaim te produceren; gevonden: ` +
          JSON.stringify(getalclaims.map((c) => [c.soort, c.waardeNumeriek, c.eenheid])),
      );

      /* 2 · ELKE VORMCLAIM OVER RECHT MOET LANGS DE VASTSTELLINGSTOETS.
         Een claim die WEL uit deze documenten komt en NIET juridisch
         zou gelden, is precies het gat dat deze toets bewaakt. */
      for (const c of claims) {
        if (c.claimvorm == null) {
          assert.fail(
            `versie ${d.versie} leverde een claim zonder vorm en zonder getal: ` +
              JSON.stringify([c.soort, c.tekst.slice(0, 60)]),
          );
        }
        if (c.soort === "regel") {
          assert.ok(
            JURIDISCHE_VORMEN.has(c.claimvorm),
            `versie ${d.versie} leverde een claim van soort 'regel' met vorm ` +
              `${c.claimvorm}, die niet als juridisch geldt en dus zichzelf zou ` +
              `kunnen bevestigen`,
          );
        }
        /* 3 · EN HIJ DRAAGT ZIJN BRONPASSAGE. Zonder passage is niet na
           te gaan waarop het oordeel rust; 0054 weigert hem ook. */
        assert.ok(
          (c.bronpassage ?? "").length >= 10,
          `versie ${d.versie}: vorm ${c.claimvorm} zonder bronpassage`,
        );
      }
    }

    /* 4 · EN DE GEMETEN UITKOMST PER DOCUMENT, zodat een toekomstige
       verbreding van het vocabulaire zichtbaar wordt in plaats van stil
       door te glippen. */
    const perVersie = Object.fromEntries(
      DOCUMENTEN.map((d) => [
        d.versie,
        extraheerUitspraken(d.titel, d.titel)
          .map((c) => c.claimvorm)
          .filter((v): v is NonNullable<typeof v> => v != null)
          .sort(),
      ]),
    );
    assert.deepEqual(perVersie, {
      18: [],
      1325: [],
      1405: [],
      3673: ["BESLUIT"],
    });
  });

  test("de termen matchen niet op losse stukken van zichzelf", () => {
    /* GEEN OVERREIK. 'congestie' alleen is een ZWAKKE term elders en mag
       niet via deze nieuwe sterke termen binnenkomen; 'tarief' alleen
       evenmin. Zonder deze zaak zou een te ruime term het hele
       netcongestiecluster kunnen opblazen. */
    const losseCongestie = herkenOnderwerpen("Rapport over congestie", "Rapport over congestie");
    assert.ok(
      !losseCongestie.some((t) => t.onderwerp === "netcongestie"),
      "een losse 'congestie' zonder sterke term hoort netcongestie niet te raken",
    );
    const losTarief = herkenOnderwerpen("Nieuw tarief per 2027", "Nieuw tarief per 2027");
    assert.ok(
      !losTarief.some((t) => t.onderwerp === "netbeheer"),
      "een los 'tarief' hoort netbeheer niet te raken",
    );
  });
});

describe("vastgoedverduurzaming krijgt GEEN eigen gebeurtenissoort", () => {
  /* HET BESLUIT, EN DE GETALLEN WAAROP HET RUST.
     ------------------------------------------------------------------
     De vraag was of `vastgoedverduurzaming` een eigen gebeurtenissoort
     nodig heeft, omdat hij nu op 'vastgoedontwikkeling' wordt afgebeeld
     en die in SIGNAALSOORTEN staat — waardoor het onderwerp per
     constructie nooit een nieuwsbericht kan worden.

     GEMETEN OP PRODUCTIE, 1 november 2026:

       gebeurtenissen met soort vastgoedontwikkeling        2
       daarvan boven NIEUWSDREMPELS.materialiteit (45)      0
       hoogste materialiteit van die twee                  36
       brondocumentversies die het vocabulaire raken        8  (van 3753)

     Een eigen soort zou vandaag dus NUL gebeurtenissen redden: beide
     vallen al af op materialiteit, een grond die vóór de
     signaalsoortgrond zou blijven staan.

     DE PRIJS is wel reëel: intel.markt_gebeurtenissen draagt
     markt_gebeurtenissen_gebeurtenis_soort_check met elf vaste waarden,
     dus een nieuwe soort is een MIGRATIE, en commercieel/bouwkansen.ts
     en commercieel/signalen.ts rekenen op de huidige naam.

     Nul voordeel tegen een schemawijziging plus twee afnemers: de
     uitbreiding is NIET gedaan. Deze toetsen leggen het gevolg vast,
     zodat een latere wijziging een bewuste wijziging is. */

  test("het onderwerp wordt op 'vastgoedontwikkeling' afgebeeld", () => {
    assert.equal(gebeurtenisSoortVan("vastgoedverduurzaming"), "vastgoedontwikkeling");
  });

  test("en die soort is een commercieel signaal, dus geen nieuws", () => {
    assert.ok(
      SIGNAALSOORTEN.has("vastgoedontwikkeling"),
      "zolang deze soort een signaalsoort is, kan vastgoedverduurzaming geen nieuwsbericht " +
        "worden; dat is het vastgelegde gevolg van het besluit om niet te splitsen",
    );
  });

  test("de materialiteitsdrempel die het besluit draagt staat op 45", () => {
    /* Het besluit rust op 'beide gebeurtenissen staan op 36, onder 45'.
       Zakt die drempel, dan verandert de rekensom en hoort iemand het
       besluit opnieuw te wegen. */
    assert.equal(
      NIEUWSDREMPELS.materialiteit,
      45,
      "het besluit om niet te splitsen rust op deze drempel; verandert hij, weeg dan opnieuw",
    );
  });
});
