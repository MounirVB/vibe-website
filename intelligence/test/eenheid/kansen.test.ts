/* ============================================================
   TEST — van vier publicaties naar drie aanbestedingen
   ------------------------------------------------------------
   §30 vraagt één ding scherp: zijn de twee Rotterdam-aankondigingen
   één inkoopkans of twee? Deze toets legt het gemeten antwoord vast,
   inclusief het antwoord dat ik eerst gaf en dat door meten is
   veranderd.

   WAT ER EERST UITKWAM, EN WAAROM DAT NIET GENOEG WAS

   Op de data die het platform HAD was de uitkomst 'onbekend': twee
   publicaties, zelfde opdrachtgever, zelfde titel, 76 dagen ertussen,
   geen brontekst om een kenmerk uit te halen. Dat was eerlijk, maar
   het was een antwoord over onze pijplijn, niet over de aanbesteding.

   WAT METEN OPLEVERDE (12 oktober 2026, geregistreerd endpoint)

   `kenmerk` ligt gewoon in de lijst-API en is op BEIDE publicaties
   599611. De relatie is dus `zelfde_inkoop`, hard bewezen:
     434533  AAO  Aankondiging opdracht   sluit 2026-10-08
     443632  REC  Rectificatie            sluit 2026-12-02

   EN DAARMEE KWAM ER EEN TWEEDE, ERNSTIGER FEIT BOVEN

   De rectificatie heeft de sluitingstermijn VERZET. Wie de eerste
   publicatie aanhoudt, ziet 2026-10-08 — verstreken — en schrijft een
   lopende aanbesteding af. De toets 'de verzette termijn wint' staat
   er daarom expliciet in, met de val ernaast gemodelleerd.

   EN EEN DERDE: ÉÉN VAN DE VIER SIGNALEN IS AL GEGUND

   Publicatie 441673 ('Realisatie zonnepanelen Limburgs Museum') heeft
   publicatiesoort AGO — Aankondiging gegunde opdracht. Die stond in
   productie als openstaande commerciële kans. De titel verraadt het
   niet; de code wel. Een platform dat een gegunde opdracht als kans
   toont, verzint werk.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { faseVan, PUBLICATIESOORT } from "../../src/commercieel/aanbesteding.ts";
import {
  groepeer,
  kwalificeer,
  relatieVan,
  type Kans,
  type KansInvoer,
  type Publicatie,
} from "../../src/commercieel/kansen.ts";
import { beperkCitaat, controleerGeenCitaat } from "../../src/bronnen/citaat.ts";
import { classificeer } from "../../src/pijplijn/relevantie.ts";
import { herkenOnderwerpen } from "../../src/pijplijn/onderwerpen.ts";

const HIER = dirname(fileURLToPath(import.meta.url));

/** Vandaag staat vast, zodat deze toets niet aan de klok hangt. */
const VANDAAG = "2026-10-12";

type FixtureRij = {
  readonly externId: string;
  readonly url: string;
  readonly titel: string;
  readonly gepubliceerdOp: string;
  readonly uitgever: string;
  readonly tekstLengte: number;
  readonly tekstSha256: string;
  readonly extra: Record<string, unknown>;
};

const FIXTURE: { readonly publicaties: readonly FixtureRij[] } = JSON.parse(
  readFileSync(join(HIER, "..", "data", "tenderned-vier-signalen.json"), "utf8"),
) as { publicaties: readonly FixtureRij[] };

function alsPublicatie(r: FixtureRij): Publicatie {
  return {
    gebeurtenisId: null,
    brondocumentId: Number(r.externId),
    url: r.url,
    titel: r.titel,
    gepubliceerdOp: r.gepubliceerdOp,
    uitgever: r.uitgever,
    tekstLengte: r.tekstLengte,
    extra: r.extra,
  };
}

const RIJEN = FIXTURE.publicaties.map((r) => ({
  opdrachtgever: String(r.extra["opdrachtgeverNaam"] ?? ""),
  publicatie: alsPublicatie(r),
}));

function kansenVanFixture(): Kans[] {
  return groepeer(RIJEN).map((g) => {
    const titel = g.publicaties[g.publicaties.length - 1]!.titel;
    const invoer: KansInvoer = {
      opdrachtgever: g.opdrachtgever,
      publicaties: g.publicaties,
      relevantie: classificeer({
        titel,
        onderwerpen: herkenOnderwerpen(titel, ""),
        gebeurtenisSoort: "aanbesteding",
      }),
      relevanteOplossingen: ["batterijopslag", "zonnestroom"],
      vandaag: VANDAAG,
      identiteit: g.identiteit,
      identiteitGrondslag: g.identiteitGrondslag,
    };
    return kwalificeer(invoer);
  });
}

/* ------------------------------------------------------------------
   De fixture zelf
   ------------------------------------------------------------------ */

test("de fixture draagt de vier echte signalen met hun gemeten velden", () => {
  assert.equal(FIXTURE.publicaties.length, 4, "er horen vier publicaties in te staan");
  const perId = new Map(FIXTURE.publicaties.map((p) => [p.externId, p]));
  for (const id of ["434533", "443632", "443550", "441673"]) {
    assert.ok(perId.has(id), `publicatie ${id} ontbreekt in de fixture`);
  }
  /* De gemeten identiteit: beide Rotterdam-publicaties delen kenmerk 599611. */
  assert.equal(String(perId.get("434533")!.extra["kenmerk"]), "599611");
  assert.equal(String(perId.get("443632")!.extra["kenmerk"]), "599611");
  assert.equal(perId.get("434533")!.extra["typePublicatie.code"], "AAO");
  assert.equal(perId.get("443632")!.extra["typePublicatie.code"], "REC");
  assert.equal(perId.get("441673")!.extra["typePublicatie.code"], "AGO");
});

test("de fixture bevat GEEN verbatim brontekst", () => {
  /* Deze bron heeft mag_citeren=false en citaat_limiet_tekens=0. Een
     fixture is geen uitzondering op dat beleid. Wat er staat is een
     lengte en een hash — genoeg om op te toetsen, niets om over te nemen. */
  for (const p of FIXTURE.publicaties) {
    assert.ok(p.tekstLengte > 0, `${p.externId} hoort een gemeten tekstlengte te hebben`);
    assert.match(p.tekstSha256, /^[0-9a-f]{64}$/, `${p.externId} mist een geldige hash`);
    assert.ok(
      !("tekst" in p),
      `${p.externId} draagt verbatim brontekst; dat mag bij deze bron niet`,
    );
  }
});

/* ------------------------------------------------------------------
   §30: één of meerdere kansen?
   ------------------------------------------------------------------ */

test("vier publicaties leveren DRIE onderscheiden aanbestedingen", () => {
  const groepen = groepeer(RIJEN);
  assert.equal(
    groepen.length,
    3,
    `verwacht 3 aanbestedingen uit 4 publicaties, kreeg ${groepen.length}: ` +
      groepen.map((g) => `${g.opdrachtgever} (${g.publicaties.length})`).join(" | "),
  );
});

test("Rotterdam is EEN kans met TWEE publicaties, samengenomen op kenmerk", () => {
  const groepen = groepeer(RIJEN);
  const rotterdam = groepen.find((g) => /Rotterdam/i.test(g.opdrachtgever));
  assert.ok(rotterdam, "de Rotterdam-groep ontbreekt");
  assert.equal(rotterdam.publicaties.length, 2, "beide aankondigingen horen in een groep");
  assert.equal(rotterdam.identiteit, "kenmerk:599611");
  assert.match(
    rotterdam.identiteitGrondslag,
    /kenmerk 599611/,
    "de grondslag moet het kenmerk noemen waarop is samengenomen",
  );
  /* De andere twee staan los: eigen kenmerk, eigen aanbesteding. */
  for (const g of groepen.filter((x) => x !== rotterdam)) {
    assert.equal(g.publicaties.length, 1, `${g.opdrachtgever} hoort een losse aanbesteding te zijn`);
  }
});

test("de relatie tussen de twee Rotterdam-publicaties is BEWEZEN, niet onbekend", () => {
  const perId = new Map(FIXTURE.publicaties.map((p) => [p.externId, alsPublicatie(p)]));
  const aankondiging = perId.get("434533")!;
  const rectificatie = perId.get("443632")!;

  const uit = relatieVan(aankondiging, rectificatie);
  assert.equal(
    uit.relatie,
    "zelfde_inkoop",
    `verwacht zelfde_inkoop op grond van het kenmerk, kreeg ${uit.relatie}: ${uit.grondslag}`,
  );
  assert.match(uit.grondslag, /599611/, "de grondslag moet het bewijs noemen");
  assert.match(uit.grondslag, /rectificatie/i, "de grondslag moet de fase noemen");
  /* En de eerste blijft de eerste. */
  assert.equal(relatieVan(aankondiging, aankondiging).relatie, "eerste");
});

/* ------------------------------------------------------------------
   De val: welke sluitingsdatum geldt?
   ------------------------------------------------------------------ */

test("de VERZETTE sluitingstermijn wint, en de vervangen datum blijft zichtbaar", () => {
  const perId = new Map(FIXTURE.publicaties.map((p) => [p.externId, p]));
  const fase = faseVan(
    ["434533", "443632"].map((id) => {
      const r = perId.get(id)!;
      return {
        externId: r.externId,
        gepubliceerdOp: r.gepubliceerdOp,
        publicatieSoort: String(r.extra["typePublicatie.code"]),
        sluitingsDatum: r.extra["sluitingsDatum"] as string | null,
      };
    }),
  );

  assert.equal(fase.fase, "open", "een rectificatie houdt de aanbesteding open");
  assert.equal(fase.bepalendeBron, "443632", "de nieuwste publicatie bepaalt de fase");
  assert.equal(fase.sluitOp, "2026-12-02", "de termijn uit de rectificatie geldt");
  assert.equal(fase.sluitOpBron, "443632");
  assert.ok(
    fase.vervangenSluitdatums.some((d) => d.includes("2026-10-08")),
    `de vervangen datum hoort vermeld te blijven, kreeg ${JSON.stringify(fase.vervangenSluitdatums)}`,
  );
  assert.ok(
    fase.grondslag.some((g) => /verlopen|vervangt/i.test(g)),
    "de grondslag moet uitleggen dat de oudste publicatie misleidend is",
  );
});

test("DE VAL: de oudste publicatie alleen zou deze aanbesteding afschrijven", () => {
  /* Dit is geen theoretisch risico. Zonder de 'nieuwste wint'-regel ziet
     het platform 2026-10-08, vier dagen voor VANDAAG, en concludeert
     'verstreken' voor een aanbesteding die nog 51 dagen openstaat. */
  const perId = new Map(FIXTURE.publicaties.map((p) => [p.externId, p]));
  const alleenOud = faseVan([
    {
      externId: "434533",
      gepubliceerdOp: perId.get("434533")!.gepubliceerdOp,
      publicatieSoort: "AAO",
      sluitingsDatum: perId.get("434533")!.extra["sluitingsDatum"] as string,
    },
  ]);
  assert.equal(alleenOud.sluitOp, "2026-10-08");
  assert.ok(
    alleenOud.sluitOp! < VANDAAG,
    "de oude termijn is inderdaad verstreken — daarom moet groeperen vooraf gaan aan scoren",
  );

  /* Met beide publicaties erbij is de uitkomst het tegenovergestelde. */
  const kans = kansenVanFixture().find((k) => /Rotterdam/i.test(k.opdrachtgever))!;
  assert.equal(kans.sluitOp, "2026-12-02");
  assert.ok(
    kans.scores.urgentie > 0,
    `een aanbesteding die nog openstaat hoort urgentie te hebben, kreeg ${kans.scores.urgentie}`,
  );
  assert.match(
    kans.scores.grondslag.urgentie!.reden,
    /2026-12-02/,
    "de urgentiegrondslag moet de geldende datum noemen",
  );
});

/* ------------------------------------------------------------------
   De gegunde opdracht
   ------------------------------------------------------------------ */

test("een GEGUNDE opdracht is geen openstaande kans", () => {
  const kans = kansenVanFixture().find((k) => /Limburg/i.test(k.opdrachtgever));
  assert.ok(kans, "de Limburg-kans ontbreekt");
  assert.equal(kans.fase, "gegund", `verwacht fase gegund, kreeg ${kans.fase}`);
  assert.equal(kans.faseLabel, "Gegund");
  assert.equal(kans.scores.urgentie, 0, "een gegunde opdracht heeft geen lopende termijn");
  assert.equal(kans.scores.handelbaar, 0, "er valt niets meer op in te schrijven");
  assert.equal(kans.status, "GEARCHIVEERD");
  assert.match(
    kans.aanbevolenActie,
    /niet opvolgen/i,
    `de aanbeveling moet dit afraden, kreeg: ${kans.aanbevolenActie}`,
  );
  /* En de reden moet de GUNNING zijn, niet 'te lage relevantie' — het
     onderwerp paste juist goed. */
  assert.match(kans.aanbevolenActie, /gegund/i);
  assert.ok(
    !/relevantie te laag/i.test(kans.aanbevolenActie),
    "een gegunde opdracht mag niet als 'irrelevant' worden afgedaan",
  );
});

test("de scoregrondslag legt bij elke as uit waarom", () => {
  for (const kans of kansenVanFixture()) {
    for (const as of ["relevantie", "vertrouwen", "urgentie", "handelbaar"]) {
      const g = kans.scores.grondslag[as];
      assert.ok(g, `${kans.opdrachtgever}: as ${as} heeft geen grondslag`);
      assert.ok(
        g.reden.length > 15,
        `${kans.opdrachtgever}: de reden bij ${as} is te kort om iets te betekenen`,
      );
    }
    assert.ok(kans.faseGrondslag.length > 0, `${kans.opdrachtgever} legt zijn fase niet uit`);
    assert.ok(
      kans.identiteitGrondslag.length > 0,
      `${kans.opdrachtgever} legt niet uit waarop gegroepeerd is`,
    );
  }
});

test("urgentie nul betekent niet vast te stellen, niet laag", () => {
  /* §6 verbiedt het samenpersen van onzekerheid. Een nul moet zich
     verklaren: of er is geen termijn, of de aanbesteding is voorbij. */
  for (const kans of kansenVanFixture().filter((k) => k.scores.urgentie === 0)) {
    assert.match(
      kans.scores.grondslag.urgentie!.reden,
      /niet vast te stellen|eindstand|verstreken|nog geen sluitingsdatum/i,
      `${kans.opdrachtgever}: urgentie 0 zonder uitleg welke van de redenen geldt`,
    );
  }
});

/* ------------------------------------------------------------------
   §8: geen ongevraagde benadering
   ------------------------------------------------------------------ */

test("geen enkele aanbeveling nodigt uit tot ongevraagd contact", () => {
  /* De opdracht verbiedt dit platform expliciet om te benaderen, in te
     schrijven of een CRM te vullen zonder toestemming. Een aanbeveling
     gaat daarom over het vaststellen van feiten. */
  const verboden = /\b(bel|bellen|mail(?:en)?|e-?mail(?:en)?|neem contact|contact opnemen|benader|schrijf in|inschrijven op|offerte (?:sturen|uitbrengen))\b/i;
  for (const kans of kansenVanFixture()) {
    assert.ok(
      !verboden.test(kans.aanbevolenActie),
      `${kans.opdrachtgever} beveelt contact aan: "${kans.aanbevolenActie}"`,
    );
    assert.ok(
      kans.aanbevolenActie.length > 30,
      `${kans.opdrachtgever} heeft geen bruikbare aanbeveling`,
    );
  }
});

test("geen kans wordt gekwalificeerd genoemd zonder genoeg bewijs", () => {
  /* De acceptatie-eis uit §30: een signaal mag geen gekwalificeerde lead
     heten op grond van een titel. */
  for (const kans of kansenVanFixture()) {
    if (kans.status === "GEKWALIFICEERD") {
      assert.equal(kans.ontbrekend.length, 0, `${kans.opdrachtgever} heet gekwalificeerd met gaten`);
      assert.ok(kans.scores.vertrouwen >= 60, `${kans.opdrachtgever} heet gekwalificeerd op zwak bewijs`);
    }
  }
  /* En wat nog niet rond is, noemt zijn gaten. */
  for (const kans of kansenVanFixture().filter((k) => k.status === "ONDERZOEK_NODIG")) {
    assert.ok(kans.ontbrekend.length > 0, `${kans.opdrachtgever} heet onderzoek-nodig zonder gaten`);
  }
});

/* ------------------------------------------------------------------
   Het fasevocabulaire
   ------------------------------------------------------------------ */

test("het fasevocabulaire dekt precies de gemeten codes", () => {
  /* Gemeten op pagina 0, 12 oktober 2026: AAO 37, REC 21, AGO 19,
     VAK 11, MAC 8, VBE 4. Komt er een code bij, dan hoort deze toets
     te breken en niet de productie. */
  assert.deepEqual(
    Object.keys(PUBLICATIESOORT).sort(),
    ["AAO", "AGO", "MAC", "REC", "VAK", "VBE"],
    "het vocabulaire wijkt af van wat op de bron is gemeten",
  );
  /* Alleen een lopende aankondiging laat inschrijven toe. */
  assert.ok(PUBLICATIESOORT.AAO!.kanNogIngeschrevenWorden);
  assert.ok(PUBLICATIESOORT.REC!.kanNogIngeschrevenWorden);
  for (const code of ["AGO", "VBE", "VAK", "MAC"]) {
    assert.ok(
      !PUBLICATIESOORT[code]!.kanNogIngeschrevenWorden,
      `${code} hoort geen inschrijving toe te laten`,
    );
  }
  assert.ok(PUBLICATIESOORT.AGO!.isEindstand);
  assert.ok(PUBLICATIESOORT.VBE!.isEindstand);
  assert.ok(!PUBLICATIESOORT.VAK!.isEindstand, "een vooraankondiging is geen eindstand");
});

test("een onbekende publicatiesoort blokkeert niet, maar zegt dat hij onbekend is", () => {
  const uit = faseVan([
    { externId: "999", gepubliceerdOp: "2026-10-01", publicatieSoort: "XYZ", sluitingsDatum: null },
  ]);
  assert.equal(uit.fase, "onbekend");
  assert.equal(uit.kanNogIngeschrevenWorden, false);
  assert.ok(
    uit.grondslag.some((g) => /XYZ/.test(g) && /vocabulaire/i.test(g)),
    "de grondslag moet de onbekende code noemen en zeggen dat het ons gat is",
  );
});

/* ------------------------------------------------------------------
   De citaatpoort
   ------------------------------------------------------------------ */

test("de citaatpoort weigert TenderNed-tekst en zegt waarom", () => {
  const beleid = { sleutel: "tenderned-publicaties", magCiteren: false, citaatLimietTekens: 0 };
  const uit = beperkCitaat(beleid, "De scope van deze opdracht omvat het ontwerpen en leveren.");
  assert.equal(uit.toegestaan, false);
  if (uit.toegestaan) return;
  assert.match(uit.reden, /mag_citeren=false/);
  assert.match(uit.reden, /vastgestelde feiten|bronlink/, "de weigering moet een alternatief noemen");
});

test("de citaatpoort kapt af op de limiet bij een bron die wel mag", () => {
  const beleid = { sleutel: "voorbeeld", magCiteren: true, citaatLimietTekens: 40 };
  const lang = "Dit is een lange brontekst die ruim over de ingestelde limiet van veertig tekens heen gaat.";
  const uit = beperkCitaat(beleid, lang);
  assert.equal(uit.toegestaan, true);
  if (!uit.toegestaan) return;
  assert.ok(uit.afgekapt, "er hoort afgekapt te zijn");
  assert.ok(uit.tekst.length <= 41, `te lang: ${uit.tekst.length} tekens`);
  assert.ok(uit.tekst.endsWith("…"));
  /* Kort genoeg blijft heel. */
  const kort = beperkCitaat(beleid, "Kort genoeg.");
  assert.equal(kort.toegestaan, true);
  if (kort.toegestaan) assert.equal(kort.afgekapt, false);
});

test("de citaatpoort betrapt een letterlijk overgenomen zin in uitvoer", () => {
  const beleid = { sleutel: "tenderned-publicaties", magCiteren: false, citaatLimietTekens: 0 };
  const bron =
    "De scope van deze opdracht omvat het ontwerpen leveren installeren in bedrijf stellen " +
    "en werkend opleveren van zonnepaneelinstallaties en energieopslag op vijf locaties.";

  const overgenomen = controleerGeenCitaat(
    beleid,
    bron,
    "Voorstel: de scope van deze opdracht omvat het ontwerpen leveren installeren in bedrijf stellen.",
  );
  assert.equal(overgenomen.ok, false, "acht opeenvolgende woorden uit de bron hoort betrapt te worden");
  if (!overgenomen.ok) assert.ok(overgenomen.fragment.split(" ").length === 8);

  /* Feiten in eigen woorden mogen wel. */
  const eigenWoorden = controleerGeenCitaat(
    beleid,
    bron,
    "Vijf locaties, zonnepanelen met opslag, openbare procedure, sluit op 2 december 2026.",
  );
  assert.equal(eigenWoorden.ok, true, "feiten in eigen formulering zijn geen citaat");
});
