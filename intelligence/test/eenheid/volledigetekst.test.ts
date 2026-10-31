/* ============================================================
   EENHEID — de extractie van de volledige tekst
   ------------------------------------------------------------
   Deze toetsen raken geen netwerk. `extraheerHoofdtekst()` en
   `snijdContainer()` zijn met opzet puur: geen fetch, geen database,
   geen klok. Daardoor is elk HTML-geval hier exact te stellen, en dat
   is precies wat een scraper nodig heeft — de variatie zit in de HTML,
   niet in het protocol.

   De zes gevallen uit de opdracht staan hieronder genummerd, plus de
   gevallen die ik tijdens het schrijven zelf tegenkwam.
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import {
  extraheerHoofdtekst,
  haalVolledigeTekst,
  snijdContainer,
  verrijkMetVolledigeTekst,
  VOLLEDIGE_TEKST_VERSIE,
  type VolledigeTekstBeleid,
} from "../../src/bronnen/volledigetekst.ts";
import { hostToegestaan, schemaEnDoelToegestaan } from "../../src/bronnen/http.ts";
import { BRONNEN } from "../../src/bronnen/register.ts";

const BELEID: VolledigeTekstBeleid = {
  grondslag: "toets",
  containers: ["main", "article"],
  minimumTekens: 400,
};

/** Een alinea van n tekens, zodat lengtedrempels te stellen zijn. */
const alinea = (n: number, woord = "netcongestie") =>
  (woord + " ").repeat(Math.ceil(n / (woord.length + 1))).slice(0, n).trim();

describe("de extractie van de volledige tekst", () => {
  /* ---------------- 1 · volledige tekst ---------------- */

  test("1 · een gewone artikelpagina levert de hoofdtekst", () => {
    const html = `<!doctype html><html><head><title>x</title>
      <style>.a{color:red}</style><script>var a=1;</script></head>
      <body>
        <nav><a href="/">Home</a><a href="/nieuws">Nieuws</a></nav>
        <main>
          <h1>ACM stelt de tarieven voor 2027 vast</h1>
          <p>${alinea(500)}</p>
        </main>
        <footer>Copyright 2026</footer>
      </body></html>`;
    const u = extraheerHoofdtekst(html, BELEID);
    assert.ok(u !== null);
    assert.equal(u.container, "main");
    assert.match(u.tekst, /ACM stelt de tarieven voor 2027 vast/);
    assert.ok(u.tekst.length > 400, `verwacht meer dan 400 tekens, kreeg ${u.tekst.length}`);
    /* DE CHROME IS ERUIT, en dat is geen cosmetiek: een menu-item of een
       copyrightjaartal in de brontekst is een GETAL waar de
       claimextractie daarna een feit in kan zien. */
    assert.doesNotMatch(u.tekst, /Home/);
    assert.doesNotMatch(u.tekst, /Copyright/);
    assert.doesNotMatch(u.tekst, /color:red/);
    assert.doesNotMatch(u.tekst, /var a=1/);
  });

  test("1b · de hoofdtekst houdt een geneste structuur heel", () => {
    /* HIER GING MIJN EERSTE VERSIE STUK. Met een niet-greedy regex
       stopte de match bij de eerste </div> en verdween het midden van
       het artikel. `snijdContainer` telt daarom de diepte. */
    const html = `<body><main>
        <div class="intro"><p>Eerste deel over netcongestie.</p></div>
        <div class="body"><div class="sub"><p>${alinea(500)}</p></div></div>
        <p>Laatste deel met de slotsom.</p>
      </main></body>`;
    const u = extraheerHoofdtekst(html, BELEID);
    assert.ok(u !== null);
    assert.match(u.tekst, /Eerste deel over netcongestie/);
    assert.match(u.tekst, /Laatste deel met de slotsom/);
  });

  /* ---------------- 2 · lege pagina's ---------------- */

  test("2 · een lege pagina levert null, geen lege tekst", () => {
    assert.equal(extraheerHoofdtekst("", BELEID), null);
    assert.equal(extraheerHoofdtekst("   \n  ", BELEID), null);
  });

  test("2b · een pagina met alleen chrome levert null", () => {
    const html = `<body><nav>Menu</nav><main><nav>Submenu</nav>
      <footer>Voet</footer></main><footer>Voet</footer></body>`;
    const u = extraheerHoofdtekst(html, BELEID);
    assert.equal(u, null, "na het weghalen van de chrome blijft er niets over");
  });

  /* ---------------- 3 · RSS-samenvattingen ---------------- */

  test("3 · een pagina die alleen de samenvatting herhaalt valt onder het minimum", () => {
    /* Dit is het ACM-geval: de pagina achter de link bevat soms niet
       meer dan de samenvatting die de feed al gaf. Dan hoort de
       extractie 'te kort' te melden, zodat de collector de bestaande
       samenvatting houdt in plaats van hem te vervangen door hetzelfde. */
    const html = `<body><main><p>De ACM heeft de klacht afgewezen.</p></main></body>`;
    const u = extraheerHoofdtekst(html, BELEID);
    assert.ok(u !== null, "de extractie lukt wel");
    assert.ok(u.tekst.length < 400, "maar blijft onder het minimum");
    assert.match(u.tekst, /de klacht afgewezen/);
  });

  /* ---------------- 4 · HTML-varianten ---------------- */

  test("4 · article in plaats van main", () => {
    const html = `<body><article><p>${alinea(500)}</p></article></body>`;
    const u = extraheerHoofdtekst(html, BELEID);
    assert.ok(u !== null);
    assert.equal(u.container, "article");
  });

  test("4b · role=main als de pagina geen main-tag heeft", () => {
    const html = `<body><div role="main"><p>${alinea(500)}</p></div></body>`;
    const u = extraheerHoofdtekst(html, { grondslag: "toets", minimumTekens: 400 });
    assert.ok(u !== null);
    assert.equal(u.container, '[role="main"]');
  });

  test("4c · een classselector uit het register", () => {
    const html = `<body><div class="kop"></div><div class="artikel-body">
      <p>${alinea(500)}</p></div></body>`;
    const u = extraheerHoofdtekst(html, {
      grondslag: "toets", containers: [".artikel-body"], minimumTekens: 400,
    });
    assert.ok(u !== null);
    assert.equal(u.container, ".artikel-body");
  });

  test("4d · een idselector uit het register", () => {
    const html = `<body><div id="content"><p>${alinea(500)}</p></div></body>`;
    const u = extraheerHoofdtekst(html, {
      grondslag: "toets", containers: ["#content"], minimumTekens: 400,
    });
    assert.ok(u !== null);
    assert.equal(u.container, "#content");
  });

  test("4e · de eerste container die iets oplevert wint", () => {
    const html = `<body><main></main><article><p>${alinea(500)}</p></article></body>`;
    const u = extraheerHoofdtekst(html, BELEID);
    assert.ok(u !== null);
    assert.equal(u.container, "article", "main was leeg, dus article telt");
  });

  test("4f · een onafgesloten container levert de rest in plaats van niets", () => {
    const html = `<body><main><p>${alinea(500)}</p>`;
    const u = extraheerHoofdtekst(html, BELEID);
    assert.ok(u !== null, "een kapotte pagina is geen reden om alles weg te gooien");
    assert.ok(u.tekst.length > 400);
  });

  test("4g · HTML-entiteiten worden gedecodeerd", () => {
    const html = `<body><main><p>Tarieven stijgen met 12&nbsp;procent &amp; meer. ${alinea(450)}</p></main></body>`;
    const u = extraheerHoofdtekst(html, BELEID);
    assert.ok(u !== null);
    assert.match(u.tekst, /12 procent & meer/);
    assert.doesNotMatch(u.tekst, /&amp;|&nbsp;/);
  });

  test("4h · een cookiebanner met getallen komt niet in de tekst", () => {
    /* HET SCHERPSTE GEVAL. Een banner met "3 soorten cookies" zet een
       getal in de brontekst waar de claimextractie een feit in kan
       zien. Dit is geen opmaakprobleem maar een bron van valse claims. */
    const html = `<body><main>
        <div class="cookie-consent">Wij gebruiken 3 soorten cookies en bewaren ze 24 maanden.</div>
        <p>${alinea(500)}</p>
        <div class="deelbalk">Deel dit op 4 netwerken</div>
      </main></body>`;
    const u = extraheerHoofdtekst(html, BELEID);
    assert.ok(u !== null);
    assert.doesNotMatch(u.tekst, /cookies/i);
    assert.doesNotMatch(u.tekst, /3 soorten/);
    assert.doesNotMatch(u.tekst, /4 netwerken/);
  });

  test("4i · de tekst wordt afgekapt op het maximum", () => {
    const html = `<body><main><p>${alinea(5000)}</p></main></body>`;
    const u = extraheerHoofdtekst(html, {
      grondslag: "toets", containers: ["main"], minimumTekens: 10, maximumTekens: 1000,
    });
    assert.ok(u !== null);
    assert.equal(u.tekst.length, 1000);
  });

  /* ---------------- 5 · toegangsweigeringen ---------------- */

  test("5 · een inlogmuur zonder container levert null", () => {
    const html = `<body><div class="paywall">Log in om verder te lezen.</div></body>`;
    const u = extraheerHoofdtekst(html, BELEID);
    assert.equal(u, null, "geen main of article -> geen tekst, en dus geen aanname");
  });

  test("5b · een foutpagina met een main valt onder het minimum", () => {
    const html = `<body><main><h1>403 Verboden</h1><p>Geen toegang.</p></main></body>`;
    const u = extraheerHoofdtekst(html, BELEID);
    assert.ok(u !== null);
    assert.ok(u.tekst.length < 400, "een foutpagina haalt het minimum niet");
  });

  /* ---------------- 6 · gewijzigde bronteksten ---------------- */

  test("6 · dezelfde pagina geeft dezelfde tekst, een gewijzigde pagina een andere", () => {
    const maak = (slot: string) =>
      `<body><main><p>${alinea(500)}</p><p>${slot}</p></main></body>`;
    const a1 = extraheerHoofdtekst(maak("Het besluit geldt per 1 januari 2027."), BELEID);
    const a2 = extraheerHoofdtekst(maak("Het besluit geldt per 1 januari 2027."), BELEID);
    const b = extraheerHoofdtekst(maak("Het besluit geldt per 1 juli 2027."), BELEID);
    assert.ok(a1 !== null && a2 !== null && b !== null);
    assert.equal(a1.tekst, a2.tekst, "deterministisch: zonder wijziging dezelfde tekst");
    assert.notEqual(a1.tekst, b.tekst, "met wijziging een andere tekst");
    /* Dat verschil is wat `inhoudHash` straks tot een NIEUWE versie
       maakt, met vorige_versie_id en wijziging_soort erbij. */
  });

  test("6b · wisselende chrome verandert de hoofdtekst niet", () => {
    /* Een bezoekersteller of een wisselende banner mag geen nieuwe
       versie veroorzaken; anders groeit de versiehistorie elke ronde
       zonder dat de inhoud veranderde. */
    const maak = (teller: number) =>
      `<body><nav>Bezoekers: ${teller}</nav><main><p>${alinea(500)}</p></main>
       <footer>Pagina ${teller} keer bekeken</footer></body>`;
    const a = extraheerHoofdtekst(maak(11), BELEID);
    const b = extraheerHoofdtekst(maak(9999), BELEID);
    assert.ok(a !== null && b !== null);
    assert.equal(a.tekst, b.tekst);
  });

  /* ---------------- snijdContainer apart ---------------- */

  test("snijdContainer geeft null voor een onbekende selector", () => {
    assert.equal(snijdContainer("<body><main>x</main></body>", "main > p"), null);
    assert.equal(snijdContainer("<body><main>x</main></body>", "article"), null);
  });

  test("snijdContainer telt de diepte van gelijke tags", () => {
    const binnen = snijdContainer(
      "<main>a<main>b</main>c</main>na",
      "main",
    );
    assert.equal(binnen, "a<main>b</main>c");
  });

  test("de versiestempel staat vast", () => {
    assert.equal(VOLLEDIGE_TEKST_VERSIE, "volledigetekst-v1");
  });
});

/* ============================================================
   DE BEVEILIGINGEN OP HET NIEUWE PAD
   ------------------------------------------------------------
   `haalVolledigeTekst()` heeft geen eigen netwerkcode: hij geeft de
   artikel-URL aan `haalOp()`, en daarmee gelden de SSRF-poortwachter,
   de hostallowlist, de begrensde redirects met robotscontrole per hop,
   de bytelimiet en de hostklok van de bron zelf.

   Dat is een bewering, en die hoort getoetst. Hieronder staat de
   poortwachter zelf op de gevallen die bij een scraper tellen, plus
   het bewijs dat een mislukte ophaling een BENOEMDE weigering oplevert
   en geen stille lege tekst.
   ============================================================ */

describe("de beveiligingen op het volledige-tekstpad", () => {
  test("de SSRF-poortwachter weigert elk intern of niet-https doel", () => {
    const geweigerd = [
      "http://www.acm.nl/artikel",
      "https://127.0.0.1/artikel",
      "https://127.1.2.3/artikel",
      "https://10.0.0.5/artikel",
      "https://192.168.1.1/artikel",
      "https://172.16.0.1/artikel",
      "https://169.254.169.254/latest/meta-data",
      "https://0.0.0.0/",
      "https://localhost/artikel",
      "https://intern.localhost/artikel",
      "https://router.local/artikel",
      "https://db.internal/artikel",
      "https://[::1]/artikel",
      "https://[fe80::1]/artikel",
      "https://[fd00::1]/artikel",
      "https://[::ffff:127.0.0.1]/artikel",
      "ftp://www.acm.nl/artikel",
      "file:///etc/passwd",
      "geen-url",
    ];
    for (const u of geweigerd) {
      const reden = schemaEnDoelToegestaan(u);
      assert.ok(reden !== null, `${u} hoort geweigerd te worden, kreeg null`);
    }
    /* En de tegenproef: de twee echte artikelpaden mogen wel. Zonder
       deze regel zou een poortwachter die ALLES weigert groen zijn. */
    assert.equal(
      schemaEnDoelToegestaan("https://www.acm.nl/nl/publicaties/geschilbesluit-zonoffensief-stedin"),
      null,
    );
    assert.equal(
      schemaEnDoelToegestaan("https://www.rijksoverheid.nl/actueel/nieuws/2026/10/09/iets"),
      null,
    );
  });

  test("de hostallowlist laat alleen de bronhosts door", () => {
    const hosts = ["www.acm.nl", "acm.nl"];
    assert.equal(hostToegestaan("https://www.acm.nl/nl/publicaties/x", hosts), true);
    assert.equal(hostToegestaan("https://acm.nl/nl/publicaties/x", hosts), true);
    /* Een uitgever bepaalt zelf waar zijn pagina naartoe redirect.
       Zonder deze lijst bepaalt hij dus welke host wij aanspreken. */
    assert.equal(hostToegestaan("https://kwaadaardig.test/x", hosts), false);
    assert.equal(hostToegestaan("https://www.acm.nl.kwaadaardig.test/x", hosts), false);
    assert.equal(hostToegestaan("https://notacm.nl/x", hosts), false);
  });

  test("een bron zonder beleid haalt niets op", async () => {
    const bron = { sleutel: "x", toegestaneHosts: ["www.acm.nl"], maxBytes: 1000 } as never;
    const item = { url: "https://www.acm.nl/x" } as never;
    const u = await haalVolledigeTekst(bron, item);
    assert.equal(u.soort, "geen_beleid", "geen verklaring in het register -> geen verkeer");
  });

  test("een mislukte ophaling is een BENOEMDE weigering, geen stille leegte", async () => {
    /* In de testomgeving staat het netwerk uit, dus `haalOp` weigert
       met foutSoort 'netwerk_uit'. Wat deze toets vastzet is niet die
       specifieke reden maar de VORM: een mislukking komt terug als
       `geweigerd` met een reden erbij, zodat de collector het kan
       loggen in plaats van een lege tekst door te geven.

       DIE EERSTE ZIN WAS TOT 31 OKTOBER 2026 ONWAAR. De vlag stond op
       zijn standaard `true`, want alleen het integratieharnas zette hem
       om; deze toets ging dus echt naar www.acm.nl en kreeg HTTP 404 in
       895 ms. Groen om de verkeerde reden, omdat hieronder alleen werd
       gevraagd OF er een reden was. Sinds test/netwerk-uit.ts via
       `--import` meeloopt is hij wel waar, en daarom staat de reden nu
       VAST: zodra iemand die preambule weghaalt of de orde in haalOp()
       terugdraait, wordt deze toets rood in plaats van stil het
       internet op te gaan. */
    const bron = {
      sleutel: "acm-besluiten",
      toegestaneHosts: ["www.acm.nl"],
      maxBytes: 1_000_000,
      minIntervalSeconden: 10,
      volledigeTekst: { grondslag: "toets", containers: ["main"] },
    } as never;
    const item = { url: "https://www.acm.nl/nl/publicaties/x" } as never;
    const u = await haalVolledigeTekst(bron, item);
    assert.equal(u.soort, "geweigerd");
    if (u.soort === "geweigerd") {
      assert.ok(u.reden.length > 0, "er hoort een reden bij");
      assert.ok(u.foutSoort.length > 0, "en een foutsoort");
      assert.equal(
        u.foutSoort,
        "netwerk_uit",
        "de toets hoort NIET het internet op te gaan; een andere foutsoort " +
          "betekent dat er echt verkeer is geweest",
      );
    }
  });

  test("verrijken laat het item ongemoeid als de ophaling mislukt", async () => {
    const bron = {
      sleutel: "acm-besluiten",
      toegestaneHosts: ["www.acm.nl"],
      maxBytes: 1_000_000,
      volledigeTekst: { grondslag: "toets", containers: ["main"] },
    } as never;
    const item = {
      externId: "a", url: "https://www.acm.nl/nl/publicaties/x", titel: "T",
      samenvatting: "De samenvatting van de uitgever.", tekst: null,
      gepubliceerdOp: null, datumHerkomst: "feed", extra: {},
    } as never;
    const { items, rapport } = await verrijkMetVolledigeTekst(bron, [item]);
    assert.equal(items.length, 1);
    assert.equal(items[0]!.tekst, null, "tekst blijft leeg");
    assert.equal(
      items[0]!.samenvatting,
      "De samenvatting van de uitgever.",
      "en de samenvatting is niet weggenomen",
    );
    assert.equal(rapport.verrijkt, 0);
    assert.equal(rapport.behouden, 1);
  });

  test("verrijken doet niets voor een bron zonder beleid", async () => {
    const bron = { sleutel: "solar365", toegestaneHosts: [], maxBytes: 1 } as never;
    const item = { url: "https://x.test/a", tekst: null, samenvatting: "s" } as never;
    const { items, rapport } = await verrijkMetVolledigeTekst(bron, [item]);
    assert.equal(rapport.bekeken, 0, "geen enkele ophaling");
    assert.equal(items[0], item, "het item komt er ongewijzigd uit");
  });
});

/* ============================================================
   HET REGISTER — wat er per bron is afgesproken
   ------------------------------------------------------------
   Deze toetsen bewaken de twee afspraken die buiten de code om
   stilletjes kunnen verschuiven: welke bronnen volledige tekst mogen,
   en of we de snelheid aanhouden die de bron zelf vraagt.
   ============================================================ */

describe("het register en de volledige tekst", () => {
  test("alleen de twee bronnen van bevoegd gezag mogen volledige tekst", () => {
    const met = BRONNEN.filter((b) => b.volledigeTekst).map((b) => b.sleutel).sort();
    assert.deepEqual(met, ["acm-besluiten", "rijksoverheid-nieuws"]);
  });

  test("elke bron met volledige tekst heeft een opgeschreven grondslag", () => {
    for (const b of BRONNEN.filter((x) => x.volledigeTekst)) {
      const g = b.volledigeTekst!.grondslag;
      assert.ok(g.length > 100, `${b.sleutel}: een grondslag van ${g.length} tekens is geen afweging`);
      assert.match(g, /gemeten/i, `${b.sleutel}: de grondslag hoort te zeggen wannneer hij is gemeten`);
    }
  });

  test("acm-besluiten houdt de crawl-delay van 10 seconden aan", () => {
    /* GEMETEN 2026-10-31: robots.txt van www.acm.nl zegt
       'Crawl-delay: 10'. STANDAARD in het register geeft 5. Zonder deze
       toets zet een latere opschoning de bron terug op de standaard en
       vragen we weer twee keer zo snel als de ACM vraagt — zonder dat
       iets rood wordt. */
    const acm = BRONNEN.find((b) => b.sleutel === "acm-besluiten")!;
    assert.ok(
      acm.minIntervalSeconden >= 10,
      `verwacht minstens 10 seconden, register geeft ${acm.minIntervalSeconden}`,
    );
  });

  test("de bron zonder crawl-delay houdt de standaard", () => {
    /* GEMETEN 2026-10-31: robots.txt van www.rijksoverheid.nl heeft geen
       crawl-delay (null) en nul regels voor ons. Dan is de standaard
       genoeg, en dat hoort zichtbaar te zijn — niet per ongeluk hoog. */
    const rijk = BRONNEN.find((b) => b.sleutel === "rijksoverheid-nieuws")!;
    assert.equal(rijk.minIntervalSeconden, 5);
  });
});
