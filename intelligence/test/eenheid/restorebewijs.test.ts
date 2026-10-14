/* ============================================================
   EENHEID — wanneer mag een back-up 'aantoonbaar herstelbaar' heten?
   ------------------------------------------------------------
   WAAROM DIT BESTAND BESTAAT — een gemeten verschil tussen twee
   services die DEZELFDE code op DEZELFDE commit draaiden.

   14 oktober 2026, dezelfde minuut:

     vibe-intel-worker  OK            restoretest: laatste PASS 0,5 dagen
                                      geleden, 10 toetsen, restore 639 ms
     vibe-intel-api     NIET GEMETEN  restoretest: geen bewijs gevonden
                                      (geen bucket)      -> CRITICAL

   De back-up was herstelbaar en het bewijs bestond. Alleen lag het in
   gs://vibe-energy-intel-backups, en alleen de worker draagt
   INTEL_GCS_*. Het back-updomein is een KRITIEK domein (ops/ernst.ts),
   dus 'NIET GEMETEN' wordt daar CRITICAL — een CRITICAL over een
   meetplaats, niet over een back-up.

   En de gedeelde bron die dit had kunnen oplossen, bestond niet.
   Gemeten in productie dezelfde dag:

     soort       status  n   laatste
     backup      gereed  3   2026-10-14T00:00:29Z
     ... (negen andere soorten)
     (geen enkele rij met soort 'restoretest')

   WAT DEZE TOETSEN BEWAKEN

   Niet dat de ernst daalt — dat de ernst alleen daalt MET BEWIJS. De
   opdracht was expliciet: "Een ontbrekende, verlopen, onvolledige of
   mislukte restoretest mag nooit als OK worden geclassificeerd." Alle
   vier die gevallen staan hieronder, plus onbereikbare opslag en
   tegenstrijdige statusinformatie.

   EN ÉÉN REGEL DIE GEEN GEDRAGSTOETS KAN VANGEN: de restore-eis mag
   NIET te bevredigen zijn met een back-uptaak. Een dump van een uur oud
   zegt niets over herstelbaarheid. Dat is een structurele grendel,
   onderaan.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  bewijsIsVolledigGeslaagd,
  restoreAanvaardbaar,
  restoreSleutel,
  VEREISTE_RESTORETOETSEN,
  type Bewijsbron,
} from "../../src/ops/restorebewijs.ts";

/** DREMPELS.restoretestLeeftijdDagen. */
const DREMPEL = 30;

/** Een bron die NIETS kan zeggen — bijvoorbeeld een service zonder bucket. */
const STIL = (bron: string): Bewijsbron => ({ uitslag: null, volledig: false, dagen: null, bron });

/** Een volledig geslaagde, verse proef. */
const GOED = (bron: string, dagen = 0.5): Bewijsbron => ({
  uitslag: "PASS",
  volledig: true,
  dagen,
  bron,
});

const TAKEN = "intel.taken (soort 'restoretest')";
const BUCKET = "gs://vibe-energy-intel-backups/restoretest/laatste.json";

describe("restoreAanvaardbaar — de vier gevallen die NOOIT OK mogen zijn", () => {
  it("ONTBREKEND bewijs: geen taakrij en geen leesbare bucket", () => {
    /* Exact de stand op vibe-intel-api vóór deze release, en de stand
       direct ná de deploy zolang er nog geen registrerende proef heeft
       gedraaid. Dit MOET NIET GEMETEN blijven: het is geen 'in orde' en
       het is ook geen aangetoonde storing. */
    const r = restoreAanvaardbaar({
      takenlogboek: STIL(TAKEN),
      bucket: STIL(BUCKET),
      drempelDagen: DREMPEL,
    });
    assert.equal(r.niveau, "NIET GEMETEN");
    assert.notEqual(r.niveau, "OK");
    assert.match(r.grond, /geen restorebewijs in het takenlogboek/);
    /* Beide namen moeten erbij, want de lezer moet zien WAAR niet
       gekeken kon worden. */
    assert.deepEqual([...r.bronnen], [TAKEN, BUCKET]);
  });

  it("MISLUKTE proef: een FAIL is FOUT, ook als er een oudere PASS bestond", () => {
    const r = restoreAanvaardbaar({
      takenlogboek: { uitslag: "FAIL", volledig: false, dagen: 0.1, bron: TAKEN },
      bucket: STIL(BUCKET),
      drempelDagen: DREMPEL,
    });
    assert.equal(r.niveau, "FOUT");
    assert.match(r.grond, /FAIL/);
  });

  it("VERLOPEN bewijs: een PASS ouder dan de drempel is LET OP, niet OK", () => {
    const net = restoreAanvaardbaar({
      takenlogboek: GOED(TAKEN, DREMPEL),
      bucket: STIL(BUCKET),
      drempelDagen: DREMPEL,
    });
    assert.equal(net.niveau, "OK", "precies op de grens mag het nog");

    const over = restoreAanvaardbaar({
      takenlogboek: GOED(TAKEN, DREMPEL + 0.1),
      bucket: STIL(BUCKET),
      drempelDagen: DREMPEL,
    });
    assert.equal(over.niveau, "LET OP");
    assert.notEqual(over.niveau, "OK");
    assert.match(over.grond, /ouder dan 30 dagen/);
  });

  it("ONVOLLEDIGE proef: een PASS met te weinig uitgevoerde controles is FOUT", () => {
    /* Het gevaarlijkste geval, want het LIJKT een geslaagde proef. Een
       controle die niet is uitgevoerd staat niet in de foutenlijst, dus
       `geen fouten` is geen bewijs van volledigheid. */
    const r = restoreAanvaardbaar({
      takenlogboek: { uitslag: "PASS", volledig: false, dagen: 0.1, bron: TAKEN },
      bucket: STIL(BUCKET),
      drempelDagen: DREMPEL,
    });
    assert.equal(r.niveau, "FOUT");
    assert.match(r.grond, /ONVOLLEDIG/);
  });

  it("een PASS ZONDER TIJDSTIP bewijst geen versheid", () => {
    const r = restoreAanvaardbaar({
      takenlogboek: { uitslag: "PASS", volledig: true, dagen: null, bron: TAKEN },
      bucket: STIL(BUCKET),
      drempelDagen: DREMPEL,
    });
    assert.equal(r.niveau, "NIET GEMETEN");
    assert.notEqual(r.niveau, "OK");
    assert.match(r.grond, /leeftijd is onbekend/);
  });
});

describe("restoreAanvaardbaar — onbereikbare opslag mag niet tegenstemmen", () => {
  it("ONBEREIKBARE BUCKET met een geldige taakrij: OK, uit het takenlogboek", () => {
    /* DIT IS DE REPARATIE. Een service zonder INTEL_GCS_* — of een
       bucket die even niet antwoordt — levert een STILLE bron. Die mag
       het antwoord niet omlaag trekken, want afwezige meetMOGELIJKHEID
       is geen bevinding over de back-up. Het takenlogboek staat in de
       database die elke service al open heeft. */
    const r = restoreAanvaardbaar({
      takenlogboek: GOED(TAKEN),
      bucket: STIL(BUCKET),
      drempelDagen: DREMPEL,
    });
    assert.equal(r.niveau, "OK");
    assert.deepEqual([...r.bronnen], [TAKEN], "alleen de bron die iets zei mag genoemd worden");
  });

  it("omgekeerd ook: bucketbewijs zonder taakrij blijft bruikbaar", () => {
    /* De stand op vibe-intel-worker vóór deze release. Het ORIGINELE
       bewijs is geldig bewijs; het probleem was nooit dat het onwaar
       was, maar dat het onleesbaar was voor de andere service. Oud
       bewijs mag dus niet ongeldig worden door deze wijziging. */
    const r = restoreAanvaardbaar({
      takenlogboek: STIL(TAKEN),
      bucket: GOED(BUCKET),
      drempelDagen: DREMPEL,
    });
    assert.equal(r.niveau, "OK");
    assert.deepEqual([...r.bronnen], [BUCKET]);
  });

  it("een stille bucket maakt een MISLUKTE taakrij niet milder", () => {
    const r = restoreAanvaardbaar({
      takenlogboek: { uitslag: "FAIL", volledig: false, dagen: 0.1, bron: TAKEN },
      bucket: STIL(BUCKET),
      drempelDagen: DREMPEL,
    });
    assert.equal(r.niveau, "FOUT");
  });
});

describe("restoreAanvaardbaar — tegenstrijdige statusinformatie", () => {
  it("logboek PASS en bucket FAIL: FOUT, met BEIDE bronnen genoemd", () => {
    /* Nooit stil de gunstigste bron kiezen. Spreken de twee elkaar
       tegen, dan is er iets stuk in de registratie of in de opslag, en
       dan IS de herstelbaarheid niet vastgesteld — ongeacht welke van de
       twee het mooiste nieuws brengt. */
    const r = restoreAanvaardbaar({
      takenlogboek: GOED(TAKEN),
      bucket: { uitslag: "FAIL", volledig: false, dagen: 0.2, bron: BUCKET },
      drempelDagen: DREMPEL,
    });
    assert.equal(r.niveau, "FOUT");
    assert.equal(r.tegenstrijdig, true);
    assert.match(r.grond, /spreken elkaar tegen/);
    assert.ok(r.grond.includes(TAKEN) && r.grond.includes(BUCKET), "beide bronnen horen in de grond");
  });

  it("en andersom: logboek FAIL en bucket PASS is net zo tegenstrijdig", () => {
    const r = restoreAanvaardbaar({
      takenlogboek: { uitslag: "FAIL", volledig: false, dagen: 0.1, bron: TAKEN },
      bucket: GOED(BUCKET),
      drempelDagen: DREMPEL,
    });
    assert.equal(r.niveau, "FOUT");
    assert.equal(r.tegenstrijdig, true);
  });

  it("zeggen beide hetzelfde maar verschilt de LEEFTIJD, dan wint de zwaarste", () => {
    /* Geen tegenspraak in de uitslag, wel in de versheid. Een verse PASS
       in het logboek naast een bucketkopie van veertig dagen oud: er is
       iets niet bijgewerkt, en 'OK' zou dat verbergen. */
    const r = restoreAanvaardbaar({
      takenlogboek: GOED(TAKEN, 0.5),
      bucket: GOED(BUCKET, 40),
      drempelDagen: DREMPEL,
    });
    assert.equal(r.niveau, "LET OP");
    assert.equal(r.tegenstrijdig, false);
    assert.equal(r.bronnen.length, 2);
  });

  it("twee verse, geslaagde bronnen die het eens zijn: OK, beide genoemd", () => {
    /* De tegenproof: zonder dit geval zou een toets kunnen slagen
       doordat restoreAanvaardbaar nooit OK teruggeeft. */
    const r = restoreAanvaardbaar({
      takenlogboek: GOED(TAKEN, 0.5),
      bucket: GOED(BUCKET, 0.5),
      drempelDagen: DREMPEL,
    });
    assert.equal(r.niveau, "OK");
    assert.equal(r.bronnen.length, 2);
  });
});

describe("bewijsIsVolledigGeslaagd", () => {
  const basis = { uitslag: "PASS", toetsen_geslaagd: 10, toetsen_vereist: 10, toetsen_mislukt: [] };

  it("alle drie de voorwaarden moeten kloppen", () => {
    assert.equal(bewijsIsVolledigGeslaagd(basis), true);
    assert.equal(bewijsIsVolledigGeslaagd({ ...basis, uitslag: "FAIL" }), false, "FAIL");
    assert.equal(bewijsIsVolledigGeslaagd({ ...basis, toetsen_geslaagd: 9 }), false, "te weinig");
    assert.equal(bewijsIsVolledigGeslaagd({ ...basis, toetsen_mislukt: ["x"] }), false, "een fout");
  });

  it("MEER geslaagde controles dan vereist is ook niet goed", () => {
    /* Klinkt onschuldig, maar betekent dat de lijst is veranderd zonder
       dat VEREISTE_RESTORETOETSEN mee is gegaan. Dan weet niemand meer
       welke proef compleet is. */
    assert.equal(bewijsIsVolledigGeslaagd({ ...basis, toetsen_geslaagd: 11 }), false);
  });

  it("nul vereiste controles bewijst niets", () => {
    assert.equal(
      bewijsIsVolledigGeslaagd({ uitslag: "PASS", toetsen_geslaagd: 0, toetsen_vereist: 0, toetsen_mislukt: [] }),
      false,
      "een proef zonder controles is een proef zonder bewijs",
    );
  });
});

describe("restoreSleutel — geen dubbele registraties, geen verdwenen geschiedenis", () => {
  const b = { op: "2026-10-14T06:12:40.000Z", uitslag: "PASS" as const, dump_object: "vibe-intel-2026-10-14.dump" };

  it("een RETRY binnen hetzelfde uur levert DEZELFDE sleutel", () => {
    /* Daarmee doet `on conflict do nothing` zijn werk: één poging, één
       rij, hoe vaak de runner hem ook herstart. */
    assert.equal(restoreSleutel(b), restoreSleutel({ ...b, op: "2026-10-14T06:59:59.999Z" }));
  });

  it("een LATERE poging krijgt een EIGEN sleutel", () => {
    assert.notEqual(restoreSleutel(b), restoreSleutel({ ...b, op: "2026-10-14T07:00:00.000Z" }));
  });

  it("een andere UITSLAG in hetzelfde uur krijgt een eigen sleutel", () => {
    /* Dit is de regel die geschiedenis bewaart. Zou de uitslag niet in
       de sleutel zitten, dan zou een PASS na een FAIL in hetzelfde uur
       door `do nothing` worden weggegooid — en zou het logboek dus
       liegen over de laatste stand. */
    assert.notEqual(restoreSleutel(b), restoreSleutel({ ...b, uitslag: "FAIL" }));
  });

  it("een andere DUMP krijgt een eigen sleutel", () => {
    assert.notEqual(restoreSleutel(b), restoreSleutel({ ...b, dump_object: "vibe-intel-2026-10-13.dump" }));
  });

  it("de sleutel begint met de soort, zodat hij in het logboek te vinden is", () => {
    assert.match(restoreSleutel(b), /^restoretest:/);
  });
});

/* ==================================================================
   STRUCTURELE GRENDELS — regels die geen gedragstoets kan vangen
   ================================================================== */

/**
 * Haalt commentaar weg, zodat een grendel de CODE toetst en niet het
 * proza eromheen.
 *
 * DIT IS EEN SCHERPSTELLING, GEEN VERSOEPELING, en ze is er omdat de
 * eerste versie van de grendel hieronder op mijn eigen modulekop
 * afging: die legt uit dat `DREMPELS.backupLeeftijdUren` met opzet NIET
 * wordt gebruikt, en de grendel zag alleen de naam. Het verbod
 * schrappen uit de uitleg zou de documentatie slechter maken en de
 * grendel niet beter. Elke echte verwijzing in code wordt nog steeds
 * gevonden.
 *
 * Alleen blokcommentaar en regels die met `//` of `*` beginnen gaan
 * eraf. `//` middenin een regel blijft staan: dat is meestal een URL
 * (`gs://...`), en die halve regel wegknippen zou juist code kunnen
 * verbergen.
 */
function alleenCode(bron: string): string {
  return bron
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((r) => !/^\s*(\/\/|\*)/.test(r))
    .join("\n");
}

describe("structurele grendels", () => {
  const CLI = readFileSync(new URL("../../src/cli/restoretest.ts", import.meta.url), "utf8");
  const MODULE = readFileSync(new URL("../../src/ops/restorebewijs.ts", import.meta.url), "utf8");
  const MODULE_CODE = alleenCode(MODULE);

  it("VEREISTE_RESTORETOETSEN komt overeen met het aantal controles in de CLI", () => {
    /* Zonder deze grendel is 'onvolledig' niet detecteerbaar maar
       RAADBAAR. Komt er een elfde controle bij en blijft de constante op
       10, dan meldt elke voortaan geslaagde proef zich als onvolledig;
       verdwijnt er een controle, dan blijft dat onopgemerkt. Beide
       richtingen zijn stil, en daarom staat dit hier. */
    const aantal = (CLI.match(/^\s*toets\(/gm) ?? []).length;
    assert.equal(
      aantal,
      VEREISTE_RESTORETOETSEN,
      `de CLI doet ${aantal} controles, VEREISTE_RESTORETOETSEN zegt ${VEREISTE_RESTORETOETSEN}. ` +
        `Is er een controle bijgekomen of weggehaald? Pas dan de constante aan — en bedenk of ` +
        `oud bewijs daardoor als 'onvolledig' gaat lezen.`,
    );
  });

  it("de CLI legt het bewijs ook in het TAKENLOGBOEK vast, niet alleen in de bucket", () => {
    /* De kern van de reparatie is één aanroep. Valt die weg, dan werkt
       alles hierboven nog perfect en is het alleen nutteloos: het
       takenlogboek blijft dan leeg en elke service zonder bucket meldt
       weer 'geen bewijs'. Geen enkele gedragstoets in dit bestand valt
       daarvan om. */
    assert.match(CLI, /registreerRestoretest/, "de CLI registreert niets in intel.taken");
    assert.match(MODULE, /insert into intel\.taken/, "de registratie schrijft niet in intel.taken");
  });

  it("de registratie is APPEND-ONLY: geen update, geen delete", () => {
    /* "behoud de bestaande auditgeschiedenis". Een `do update` zou een
       mislukte poging overschrijven zodra een volgende poging slaagt, en
       dan is het logboek geen logboek meer. */
    assert.match(MODULE_CODE, /on conflict[\s\S]{0,120}do nothing/, "het conflictgedrag is geen 'do nothing'");
    assert.doesNotMatch(MODULE_CODE, /do update/, "de registratie werkt rijen bij in plaats van toe te voegen");
    assert.doesNotMatch(MODULE_CODE, /delete\s+from/i, "de registratie verwijdert rijen");
    assert.doesNotMatch(MODULE_CODE, /\bupdate\s+intel\./i, "de registratie wijzigt bestaande rijen");
  });

  it("ook een MISLUKTE en een AFGEBROKEN proef wordt vastgelegd", () => {
    /* Zonder dit ziet de monitor alleen 'geen nieuw bewijs', en dat is
       iets heel anders dan 'de laatste proef faalde'. */
    assert.match(CLI, /legBewijsVast\("FAIL"/, "een mislukking wordt niet vastgelegd");
    assert.ok(
      (CLI.match(/legBewijsVast\(/g) ?? []).length >= 3,
      "legBewijsVast() hoort op minstens drie plekken aangeroepen te worden: PASS, FAIL en afgebroken",
    );
  });

  it("de RESTORE-eis is NIET te bevredigen met een BACK-UPtaak", () => {
    /* "Een recente back-up is niet automatisch een bewezen herstelbare
       back-up." De twee beslissingen moeten gescheiden blijven: de
       back-up-RPO (26 uur) en de restoreleeftijd (30 dagen) zijn
       onafhankelijke eisen.

       Deze grendel bewaakt dat niemand ooit `soort = 'backup'` in de
       restorebeslissing laat meewegen om een CRITICAL weg te krijgen. */
    assert.doesNotMatch(
      MODULE_CODE,
      /'backup'|"backup"/,
      "ops/restorebewijs.ts noemt de back-uptaaksoort in code; de restore-eis mag daar niet op leunen",
    );
    assert.doesNotMatch(MODULE_CODE, /backupLeeftijdUren/, "de restorebeslissing gebruikt de back-up-RPO");
    assert.doesNotMatch(
      MODULE_CODE,
      /backupAanvaardbaar/,
      "de restorebeslissing leunt op de back-upbeslissing; dat zijn twee onafhankelijke eisen",
    );
    /* En de leesquery moet echt op de restoretestsoort filteren. */
    assert.match(MODULE_CODE, /soort = \$2/, "de leesquery filtert niet op soort");
    assert.match(MODULE_CODE, /RESTORETEST_TAAK_SOORT = "restoretest"/);
  });

  it("de insert zet GEEN gereed_op, want dat blaast worker/hartslag op", () => {
    /* `ops/gezondheid.ts` meet `worker/hartslag` als `max(gereed_op)`
       over intel.taken ZONDER soortfilter. Zou de registratie die kolom
       vullen, dan verbergt één restoretest een stilgevallen worker —
       precies het soort signaal-dat-iets-anders-meet waar deze module
       tegen bestaat.

       Deze grendel staat er omdat de verleiding om de kolom 'netjes te
       vullen' groot is: een 'gereed'-rij zonder gereed_op ziet er bij
       eerste lezing fout uit. De uitleg staat in de insert. */
    const insert = /insert into intel\.taken[\s\S]*?returning id/.exec(MODULE_CODE)?.[0] ?? "";
    assert.ok(insert.length > 0, "de insert is niet gevonden; is hij herschreven?");
    assert.doesNotMatch(insert, /gereed_op/, "de registratie vult gereed_op");
    assert.doesNotMatch(insert, /duur_ms/, "de registratie vult duur_ms; dat is een wachtrijduur");
    /* En de hartslagquery moet nog steeds zonder soortfilter kunnen,
       juist omdat wij die kolom leeg laten. Verandert dat, dan is deze
       grendel de plek waar het opvalt. */
    const G = readFileSync(new URL("../../src/ops/gezondheid.ts", import.meta.url), "utf8");
    assert.match(G, /max\(gereed_op\)/, "de hartslagmeting is veranderd; herzie deze afspraak");
  });

  it("de samenvattingsregel die e2e.ts parseert blijft letterlijk staan", () => {
    /* `src/cli/e2e.ts` leest de uitslag van de restoretest uit STDOUT
       met /geslaagd (\d+)\s+mislukt (\d+)/. Mijn eerste versie zette
       "geslaagd 10 van 10 vereist   mislukt 0" neer, en dan staat er
       ` van` waar de regex `\s+mislukt` verwacht: scenario 27 zou stil
       op FAIL gaan staan zonder dat er iets mis is met de back-up.

       Deze grendel toetst de koppeling in BEIDE richtingen: de regex
       staat nog in e2e.ts, en de regel die hij moet lezen staat nog in
       de CLI — in een vorm die hij echt matcht. */
    const E2E = readFileSync(new URL("../../src/cli/e2e.ts", import.meta.url), "utf8");
    const m = /\/geslaagd \(\\d\+\)\\s\+mislukt \(\\d\+\)\//.exec(E2E);
    assert.ok(m, "de regex in e2e.ts is veranderd; herzie de samenvattingsregel in de CLI");

    const regel = /console\.log\(`geslaagd \$\{geslaagd\}[^`]*`\)/.exec(CLI)?.[0] ?? "";
    assert.ok(regel.length > 0, "de samenvattingsregel is niet gevonden in de CLI");
    /* De echte proef: vul de regel in en laat de ECHTE regex erover. */
    const voorbeeld = regel
      .replace(/^console\.log\(`/, "")
      .replace(/`\)$/, "")
      .replace("${geslaagd}", "10")
      .replace("${mislukt.length}", "0")
      .replace("${restoreMs}", "639");
    assert.match(
      voorbeeld,
      /geslaagd (\d+)\s+mislukt (\d+)/,
      `e2e.ts kan deze regel niet lezen: "${voorbeeld}"`,
    );
  });

  it("de twee drempels staan los van elkaar in DREMPELS", () => {
    const G = readFileSync(new URL("../../src/ops/gezondheid.ts", import.meta.url), "utf8");
    assert.match(G, /backupLeeftijdUren: 26/, "de back-up-RPO is geen 26 uur meer");
    assert.match(G, /restoretestLeeftijdDagen: 30/, "de restoredrempel is geen 30 dagen meer");
    /* En het restoresignaal moet de restoredrempel gebruiken, niet de
       back-updrempel. */
    assert.match(
      G,
      /drempelDagen: DREMPELS\.restoretestLeeftijdDagen/,
      "het restoresignaal krijgt niet de restoredrempel mee",
    );
  });
});
