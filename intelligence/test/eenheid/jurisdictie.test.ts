/* ============================================================
   TEST — het toepassingsgebied van een feitelijke uitspraak
   ------------------------------------------------------------
   HET GEVAL DAT DEZE TOETS BESTAAT OM TE VANGEN is gemeten, niet
   verzonnen. Op de huidige code gaat dit erdoor als VERWOORDBAAR:

     bron: "De Belgische netbeheerder Fluvius verhoogt het nettarief in
            2027 met 8%."
     zin:  "Volgens Fluvius stijgt het nettarief voor de netbeheerders
            in 2027 met 8%."

   De tien controles van verwoordbaarheidspoort() kijken niet naar
   plaats, land of rechtsgebied; het woord 'Belgische' matcht niets.
   Die zin staat hieronder letterlijk, en hij is de eerste toets.

   ELKE TOETS BEWEERT OP DE JUISTE GROND. Een assertie op alleen het
   gebied is te zwak: dan kan een module die altijd BELGIE roept
   groen blijven. Daarom wordt er ook getoetst WELK signaal gevonden is
   en dat de grondslag dat signaal benoemt — want een oordeel zonder
   navraagbare reden is in dit platform geen oordeel (zie de constraints
   uitspraken_verwoordbaar_heeft_reden in 0024 en
   uitspraken_gebied_heeft_grondslag in 0037).

   TWEE TOETSEN KIJKEN BUITEN DE MODULE, met opzet:

     * NL_AUTORITEITEN wordt tegen het ECHTE bronregister gelegd. Een
       uitgeversnaam die nergens in src/bronnen/register.ts staat, is een
       verzinsel; die toets maakt dat onmogelijk.
     * De waardenlijsten worden tegen 0038_toepassingsgebied.sql gelegd.
       Het type in TypeScript en de CHECK in de database moeten dezelfde
       vier waarden kennen, anders slaagt de pijplijn op iets dat de
       database weigert.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { BRONNEN } from "../../src/bronnen/register.ts";
import {
  bepaalToepassingsgebied,
  NL_AUTORITEITEN,
  type Jurisdictieoordeel,
  type Toepassingsgebied,
} from "../../src/pijplijn/jurisdictie.ts";

const HIER = dirname(fileURLToPath(import.meta.url));

/** De gemeten defectzin, letterlijk. */
const DEFECTZIN = "De Belgische netbeheerder Fluvius verhoogt het nettarief in 2027 met 8%.";

/** Een zin zonder enig gebiedswoord. Hierop beslist alleen de uitgever. */
const ZONDER_SIGNAAL = "Het nettarief voor grootverbruikers stijgt in 2027 met 8%.";

/**
 * Minimum uit uitspraken_gebied_heeft_grondslag (0038). De code moet
 * minstens zo veel grondslag leveren als de database eist, anders komt
 * de pijplijn niet door zijn eigen insert.
 */
const GRONDSLAG_MINIMUM = 15;

const oordeel = (tekst: string, uitgever: string | null = null, isPrimaireBron = false) =>
  bepaalToepassingsgebied({ tekst, uitgever, isPrimaireBron });

const grondslagTekst = (o: Jurisdictieoordeel) => o.grondslag.join(" | ");

/* ------------------------------------------------------------------
   1. De gemeten defectzin
   ------------------------------------------------------------------ */

test("de gemeten defectzin over Fluvius wordt BELGIE, niet NEDERLAND", () => {
  const o = oordeel(DEFECTZIN);
  assert.equal(o.gebied, "BELGIE", `defectzin kreeg ${o.gebied}: ${grondslagTekst(o)}`);
  /* Op de juiste grond: beide Belgische signalen moeten gezien zijn. */
  assert.ok(
    o.signalen.be.includes("Belgische"),
    `'Belgische' is niet als signaal herkend; be=[${o.signalen.be.join(", ")}]`,
  );
  assert.ok(
    o.signalen.be.includes("Fluvius"),
    `'Fluvius' is niet als signaal herkend; be=[${o.signalen.be.join(", ")}]`,
  );
  assert.deepEqual(o.signalen.nl, [], "er staat geen Nederlands signaal in deze zin");
  /* En de grondslag moet het signaal BENOEMEN, niet alleen de uitslag. */
  assert.match(grondslagTekst(o), /Belgische/, "de grondslag noemt het woord 'Belgische' niet");
  assert.match(grondslagTekst(o), /Fluvius/, "de grondslag noemt 'Fluvius' niet");
});

test("Fluvius zonder het woord Belgisch is al genoeg voor BELGIE", () => {
  const o = oordeel("Fluvius verhoogt het nettarief in 2027 met 8%.");
  assert.equal(o.gebied, "BELGIE", `kreeg ${o.gebied}: ${grondslagTekst(o)}`);
  assert.deepEqual(o.signalen.be, ["Fluvius"]);
  assert.match(grondslagTekst(o), /Fluvius/, "de grondslag noemt 'Fluvius' niet");
});

/* ------------------------------------------------------------------
   2. Nederlands, Europees, en de twee door elkaar
   ------------------------------------------------------------------ */

test("een Nederlandse zin met de ACM wordt NEDERLAND", () => {
  const o = oordeel("De ACM stelt het nettarief voor 2027 vast.");
  assert.equal(o.gebied, "NEDERLAND", `kreeg ${o.gebied}: ${grondslagTekst(o)}`);
  assert.deepEqual(o.signalen.be, [], "er staat geen Belgisch signaal in deze zin");
  assert.match(grondslagTekst(o), /ACM/, "de grondslag noemt de ACM niet");
});

test("een Nederlandse zin met Netbeheer Nederland wordt NEDERLAND", () => {
  const o = oordeel("Netbeheer Nederland verwacht een stijging van het nettarief met 8% in 2027.");
  assert.equal(o.gebied, "NEDERLAND", `kreeg ${o.gebied}: ${grondslagTekst(o)}`);
  assert.match(grondslagTekst(o), /Netbeheer Nederland/, "de grondslag noemt de koepel niet");
});

test("een EU-zin wordt EU en niet ONBEKEND", () => {
  const o = oordeel(
    "De Europese Commissie verplicht lidstaten tot een EU-verordening over flexibiliteit.",
  );
  assert.equal(o.gebied, "EU", `kreeg ${o.gebied}: ${grondslagTekst(o)}`);
  assert.ok(
    o.signalen.eu.includes("Europese Commissie"),
    `eu=[${o.signalen.eu.join(", ")}] mist 'Europese Commissie'`,
  );
  assert.match(grondslagTekst(o), /Europese Commissie/, "de grondslag noemt de Commissie niet");
  /* EU is een EIGEN uitslag: een EU-verplichting geldt ook in Nederland,
     dus hij mag verwoord worden. Dat verschil met BELGIE is de hele
     reden dat EU niet op ONBEKEND of BELGIE wordt gegooid. */
  assert.notEqual(o.gebied, "ONBEKEND");
});

test("NL en BE in dezelfde zin is ambigu en wordt ONBEKEND", () => {
  const o = oordeel("Liander en Fluvius vergelijken hun nettarieven in Nederland en Vlaanderen.");
  assert.equal(o.gebied, "ONBEKEND", `kreeg ${o.gebied}: ${grondslagTekst(o)}`);
  /* Beide kanten moeten gezien zijn, anders is het geen ambiguiteit maar
     een gemist patroon. */
  assert.ok(o.signalen.nl.length > 0, "het Nederlandse signaal is niet gezien");
  assert.ok(o.signalen.be.length > 0, "het Belgische signaal is niet gezien");
  /* En de ambiguiteit moet IN de grondslag staan: een lezer moet kunnen
     zien dat er niet gegokt is. */
  assert.match(
    grondslagTekst(o),
    /ambigu/i,
    `de grondslag benoemt de ambiguiteit niet: ${grondslagTekst(o)}`,
  );
  assert.match(grondslagTekst(o), /Fluvius/, "de grondslag noemt het Belgische signaal niet");
  assert.match(grondslagTekst(o), /Liander|Nederland/, "de grondslag noemt het NL-signaal niet");
});

/* ------------------------------------------------------------------
   3. De uitgeversregel — de enige route van 'geen signaal' naar NL
   ------------------------------------------------------------------ */

test("geen signaal, een vakmedium als uitgever en geen primaire bron: ONBEKEND", () => {
  const o = oordeel(ZONDER_SIGNAAL, "Solar365", false);
  assert.equal(o.gebied, "ONBEKEND", `kreeg ${o.gebied}: ${grondslagTekst(o)}`);
  assert.deepEqual(o.signalen.nl, []);
  assert.deepEqual(o.signalen.be, []);
  assert.deepEqual(o.signalen.eu, []);
  assert.match(
    grondslagTekst(o),
    /geen gebiedssignaal/i,
    `de grondslag zegt niet dat er geen signaal was: ${grondslagTekst(o)}`,
  );
  assert.match(grondslagTekst(o), /Solar365/, "de grondslag noemt de uitgever niet");
});

test("dezelfde zin met een Nederlandse autoriteit als primaire uitgever: NEDERLAND", () => {
  const o = oordeel(ZONDER_SIGNAAL, "Autoriteit Consument & Markt", true);
  assert.equal(o.gebied, "NEDERLAND", `kreeg ${o.gebied}: ${grondslagTekst(o)}`);
  assert.match(
    grondslagTekst(o),
    /uitgeversregel/i,
    `de grondslag benoemt de uitgeversregel niet: ${grondslagTekst(o)}`,
  );
  assert.match(grondslagTekst(o), /Autoriteit Consument & Markt/, "de uitgever staat niet in de grondslag");
});

test("ONBEKEND wordt nooit per ongeluk NEDERLAND", () => {
  /* Acht manieren waarop een tekst zonder gebiedssignaal langskomt. Geen
     ervan mag NEDERLAND opleveren. De laatste twee zijn de gemeten
     valkuilen: TenneT beheert ook een Duits transmissienet, en
     Fraunhofer ISE is een DUITSE uitgever met NL-data.

     NETBEHEER NEDERLAND STOND HIER OOK, MET REDEN "belangenkoepel, geen
     autoriteit". Dat voorbeeld is op 14 oktober 2026 ingetrokken op een
     meting: drie uitspraken van Netbeheer Nederland kwamen daardoor op
     ONBEKEND uit terwijl het onmiskenbaar Nederlandse feiten zijn (het
     IBO Bekostiging Elektriciteitsinfrastructuur, en "de netbeheerders"
     in een publicatie van de Nederlandse koepel). De maatstaf is
     daarom niet 'autoriteit' maar 'is het bereik van de uitgever per
     definitie Nederlands'. TenneT en Fraunhofer blijven er juist WEL
     onder vallen, en dat is waarom die twee hier staan. */
  const gevallen: readonly { uitgever: string | null; primair: boolean; waarom: string }[] = [
    { uitgever: null, primair: false, waarom: "geen uitgever bekend" },
    { uitgever: "", primair: true, waarom: "lege uitgeversnaam" },
    { uitgever: "Solar365", primair: false, waarom: "vakmedium, niet primair" },
    { uitgever: "Solar365", primair: true, waarom: "vakmedium is geen autoriteit, ook niet als het primair heet" },
    {
      uitgever: "Autoriteit Consument & Markt",
      primair: false,
      waarom: "autoriteit, maar de bron is niet primair: beide eisen gelden",
    },
    { uitgever: "TenneT", primair: true, waarom: "TenneT beheert ook een Duits net" },
    {
      uitgever: "Installatie.nl",
      primair: true,
      waarom: "vakmedium; gemeten publiceren Nederlandse vakmedia ook over buitenland",
    },
    {
      uitgever: "Fraunhofer ISE (Energy-Charts)",
      primair: true,
      waarom: "Duitse uitgever met Nederlandse data",
    },
  ];
  for (const g of gevallen) {
    const o = oordeel(ZONDER_SIGNAAL, g.uitgever, g.primair);
    assert.equal(
      o.gebied,
      "ONBEKEND",
      `uitgever ${JSON.stringify(g.uitgever)} (primair=${g.primair}, ${g.waarom}) gaf ${o.gebied}: ${grondslagTekst(o)}`,
    );
  }
});

/* ------------------------------------------------------------------
   4. De overlap 'Netbeheer Nederland' / 'Nederland'
   ------------------------------------------------------------------ */

test("'Nederland' als deel van 'Netbeheer Nederland' levert EEN signaal op", () => {
  const o = oordeel("Netbeheer Nederland verwacht een stijging van het nettarief met 8% in 2027.");
  assert.equal(o.gebied, "NEDERLAND");
  assert.deepEqual(
    o.signalen.nl,
    ["Netbeheer Nederland"],
    `de koepelnaam is dubbel geteld: nl=[${o.signalen.nl.join(", ")}]`,
  );
  /* Een regel per signaal, plus de besluitregel: dus precies twee. Zonder
     deze assertie zou een dubbele grondslagregel onopgemerkt blijven. */
  assert.equal(o.grondslag.length, 2, `grondslag: ${grondslagTekst(o)}`);
});

test("staat 'Nederland' OOK los in de zin, dan zijn het wel twee signalen", () => {
  /* De tegenproef bij de vorige toets: de ontdubbeling mag het losse
     landwoord niet blind maken. */
  const o = oordeel("In Nederland eist Netbeheer Nederland meer ruimte op het net.");
  assert.equal(o.gebied, "NEDERLAND");
  assert.equal(o.signalen.nl.length, 2, `nl=[${o.signalen.nl.join(", ")}]`);
});

/* ------------------------------------------------------------------
   5. Patronen die precies NIET mogen vuren
   ------------------------------------------------------------------ */

test("een Nederlandse naam die op een buitenlands patroon lijkt, vuurt niet", () => {
  const nietBuitenlands: readonly string[] = [
    /* 'Waals' zonder rechtergrens zou dit matchen; de Waal is Nederlands. */
    "De Waalsdorpervlakte in Den Haag krijgt een laadplein.",
    /* 'Belg\w*' zonder scherpe grens zou Belgrado pakken. */
    "Belgrado investeert in zonnepanelen.",
    /* Met /i zou \bORES\b het Engelse woord voor ertsen matchen. */
    "De ores in deze mijn zijn rijk aan lithium.",
  ];
  for (const t of nietBuitenlands) {
    const o = oordeel(t);
    assert.deepEqual(o.signalen.be, [], `"${t}" gaf een Belgisch signaal: ${grondslagTekst(o)}`);
    assert.equal(o.gebied, "ONBEKEND", `"${t}" gaf ${o.gebied}`);
  }
});

test("MIA matcht alleen in kapitalen, want 'Mia' is een voornaam", () => {
  const voornaam = oordeel("Mia kocht zonnepanelen voor haar bedrijf.");
  assert.equal(voornaam.gebied, "ONBEKEND", `kreeg ${voornaam.gebied}: ${grondslagTekst(voornaam)}`);
  const regeling = oordeel("De MIA wijzigt per 2027 voor bedrijfsmiddelen.");
  assert.equal(regeling.gebied, "NEDERLAND", `kreeg ${regeling.gebied}: ${grondslagTekst(regeling)}`);
  assert.deepEqual(regeling.signalen.nl, ["MIA"]);
});

test("een los 'EIA' is de Amerikaanse toezichthouder en wordt geen Nederlands feit", () => {
  /* EIA is in Nederland de energie-investeringsaftrek, maar ook de U.S.
     Energy Information Administration — en die publiceert energiecijfers.
     Een los \bEIA\b zou een Amerikaans feit tot NEDERLAND bestempelen:
     precies de fout die deze module moet voorkomen. */
  const amerikaans = oordeel("De EIA meldt dat de Amerikaanse gasproductie verder stijgt.");
  assert.equal(
    amerikaans.gebied,
    "ONBEKEND",
    `kreeg ${amerikaans.gebied}: ${grondslagTekst(amerikaans)}`,
  );
  /* De Nederlandse schrijfwijze wordt WEL herkend. */
  const nederlands = oordeel("De MIA/Vamil en de EIA wijzigen per 2027.");
  assert.equal(nederlands.gebied, "NEDERLAND", `kreeg ${nederlands.gebied}`);
});

/* ------------------------------------------------------------------
   6. Vorm van het oordeel
   ------------------------------------------------------------------ */

test("elk oordeel draagt een grondslag die de database accepteert", () => {
  const corpus: readonly string[] = [
    DEFECTZIN,
    ZONDER_SIGNAAL,
    "De ACM stelt het nettarief voor 2027 vast.",
    "De Europese Commissie verplicht lidstaten tot een EU-verordening.",
    "Liander en Fluvius vergelijken hun nettarieven in Nederland en Vlaanderen.",
    "Vlaamse subsidie verdwijnt; Wallonie volgt.",
    "",
  ];
  for (const t of corpus) {
    const o = oordeel(t);
    assert.ok(o.grondslag.length >= 1, `"${t}" kreeg een leeg oordeel`);
    for (const regel of o.grondslag) {
      assert.ok(regel.trim().length > 0, `lege grondslagregel bij "${t}"`);
    }
    assert.ok(
      o.grondslag.join(" ").length >= GRONDSLAG_MINIMUM,
      `grondslag korter dan de ${GRONDSLAG_MINIMUM} tekens die uitspraken_gebied_heeft_grondslag eist: "${t}"`,
    );
  }
});

test("twee keer hetzelfde vragen geeft twee keer hetzelfde antwoord", () => {
  /* Geen enkel patroon mag de /g-vlag hebben. De RegExp-objecten staan op
     moduleniveau en worden hergebruikt; met /g onthouden ze lastIndex en
     geeft de tweede aanroep een ander oordeel. Dat is stil en bijna niet
     te vinden, dus staat het hier. */
  for (const t of [DEFECTZIN, "De ACM stelt het nettarief vast.", ZONDER_SIGNAAL]) {
    const eerste = oordeel(t, "Solar365", false);
    const tweede = oordeel(t, "Solar365", false);
    assert.deepEqual(tweede, eerste, `tweede aanroep wijkt af voor "${t}"`);
  }
});

/* ------------------------------------------------------------------
   7. Buiten de module: het bronregister en de migratie
   ------------------------------------------------------------------ */

test("elke NL-autoriteit staat echt in het bronregister, als primaire bron", () => {
  assert.ok(NL_AUTORITEITEN.length > 0, "de autoriteitenlijst is leeg");
  for (const a of NL_AUTORITEITEN) {
    const bronnen = BRONNEN.filter((b) => b.uitgever === a.uitgever);
    assert.ok(
      bronnen.length > 0,
      `uitgever "${a.uitgever}" staat niet in src/bronnen/register.ts — een autoriteit die niet bestaat is een verzinsel`,
    );
    assert.ok(
      bronnen.some((b) => b.isPrimaireBron),
      `uitgever "${a.uitgever}" heeft geen enkele primaire bron in het register, en de uitgeversregel eist er een`,
    );
    /* De soort moet overeenkomen met wat het register zegt, anders
       verschuift de onderbouwing stil onder de lijst vandaan. */
    assert.ok(
      bronnen.some((b) => b.uitgeverSoort === a.soort),
      `uitgever "${a.uitgever}" heeft in het register niet de soort "${a.soort}"`,
    );
    assert.ok(a.waarom.length >= GRONDSLAG_MINIMUM, `"${a.uitgever}" heeft geen onderbouwing`);
  }
});

test("geen enkel vakmedium staat in de autoriteitenlijst", () => {
  /* Gemeten: zeven Nederlandse vakmedia op .nl publiceren over
     buitenland. Een vakmedium mag de uitgeversregel dus nooit halen. */
  const vakmedia = new Set(
    BRONNEN.filter((b) => b.uitgeverSoort === "vakmedium").map((b) => b.uitgever),
  );
  assert.ok(vakmedia.size > 0, "het register kent geen vakmedia meer; dan is deze toets zinloos");
  for (const a of NL_AUTORITEITEN) {
    assert.ok(
      !vakmedia.has(a.uitgever),
      `"${a.uitgever}" is in het register een vakmedium en hoort geen autoriteit te zijn`,
    );
  }
});

test("de vier waarden van het type staan ook in 0038_toepassingsgebied.sql", () => {
  const sql = readFileSync(
    join(HIER, "..", "..", "db", "migraties", "0038_toepassingsgebied.sql"),
    "utf8",
  );
  const vier: readonly Toepassingsgebied[] = ["NEDERLAND", "BELGIE", "EU", "ONBEKEND"];

  /* a de kolomgrendel kent exact deze vier waarden */
  const kolomgrendel = /add constraint uitspraken_toepassingsgebied check \(([\s\S]*?)\);/.exec(sql);
  assert.ok(kolomgrendel, "constraint uitspraken_toepassingsgebied staat niet in de migratie");
  for (const w of vier) {
    assert.match(
      kolomgrendel[1]!,
      new RegExp(`'${w}'`),
      `waarde '${w}' uit het type Toepassingsgebied ontbreekt in de CHECK — dan weigert de database wat de pijplijn schrijft`,
    );
  }

  /* b de zevende verwoordbaarheidswaarde is een EIGEN waarde */
  assert.match(
    sql,
    /'BUITEN_TOEPASSINGSGEBIED'/,
    "de zevende waarde BUITEN_TOEPASSINGSGEBIED ontbreekt; hergebruik van CONTEXT_ONVOLLEDIG maakt de weigering onzichtbaar in de verwoordbaarheidstrap",
  );

  /* c de voorwaardelijke grendel laat alleen NEDERLAND en EU door */
  const poort = /add constraint uitspraken_verwoordbaar_vraagt_gebied check \(([\s\S]*?)\)\s*not valid;/
    .exec(sql);
  assert.ok(poort, "de voorwaardelijke grendel staat niet (of niet op not valid) in de migratie");
  assert.match(poort[1]!, /'NEDERLAND'/, "NEDERLAND mag verwoordbaar zijn");
  assert.match(poort[1]!, /'EU'/, "EU mag verwoordbaar zijn: een EU-verplichting geldt ook hier");
  assert.doesNotMatch(
    poort[1]!,
    /'BELGIE'/,
    "BELGIE mag NOOIT verwoordbaar zijn: een Belgisch tarief geldt in Nederland niet",
  );
  assert.doesNotMatch(
    poort[1]!,
    /'ONBEKEND'/,
    "ONBEKEND mag NOOIT verwoordbaar zijn: een onvastgesteld rechtsgebied is geen bewijs",
  );
});
