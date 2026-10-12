/* ============================================================
   TEST — bedrijfsrelevantie tegen ECHTE productietitels
   ------------------------------------------------------------
   §28 van de opdracht eist acceptatietoetsen voor de echte
   productiegevallen uit §3. Dit is er een: `test/data/relevantie-corpus.json`
   bevat de 35 hoogst scorende gebeurtenistitels zoals ze op 12 oktober
   2026 in de productiedatabase stonden, met per titel de categorie die
   een mens eraan zou geven en de onderbouwing daarvan.

   WAAROM EEN CORPUS EN NIET EEN HANDVOL VERZONNEN GEVALLEN

   De klacht uit §3 is niet abstract. Er stond een wetsvoorstel over
   maritieme handhaving op materialiteit 61, hoger dan een echte
   aanbesteding voor zonnepanelen (56). Een toets met zelfbedachte
   titels zou dat nooit hebben gevonden, want je verzint geen
   schaduwvloot.

   HET CORPUS IS TWEE KEER HERZIEN, EN DAT STAAT ERIN

   Bij de eerste run gaf de motor 29/35. Zes afwijkingen bleken bij
   nameten voor het grootste deel MIJN label te zijn en niet de code:
   bij een titel zonder inhoud ('subsidieregeling mvr',
   'laadinfrastructuur') beweert 'niet relevant' meer dan we weten, en
   is 'achtergrond' — zichtbaar houden, geen actie — het eerlijkere
   antwoord. Die labels zijn aangepast MET de reden erbij, in
   `onderbouwing`.

   Eén afwijking was een echte codefout: 'laadinfra', de gangbare
   Nederlandse afkorting, stond niet in het vocabulaire. Daardoor
   matchte "Partijen in laadinfra maken werk van circulaire ambities"
   geen enkel onderwerp. Dat is gerepareerd in onderwerpen.ts.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { herkenOnderwerpen } from "../../src/pijplijn/onderwerpen.ts";
import { classificeer, isActiegericht, type Categorie } from "../../src/pijplijn/relevantie.ts";

const HIER = dirname(fileURLToPath(import.meta.url));

type CorpusRij = {
  readonly id: number;
  readonly titel: string;
  readonly soort: string;
  readonly huidige_materialiteit: number;
  readonly verwachte_categorie: Categorie;
  readonly onderbouwing: string;
};

const CORPUS: readonly CorpusRij[] = JSON.parse(
  readFileSync(join(HIER, "..", "data", "relevantie-corpus.json"), "utf8"),
) as CorpusRij[];

const classificeerTitel = (r: CorpusRij) =>
  classificeer({
    titel: r.titel,
    onderwerpen: herkenOnderwerpen(r.titel, ""),
    gebeurtenisSoort: r.soort,
    geverifieerdeUitspraken: 0,
  });

test("het corpus is niet stilletjes leeggelopen", () => {
  assert.ok(CORPUS.length >= 35, `corpus heeft ${CORPUS.length} rijen, verwacht minstens 35`);
  for (const r of CORPUS) {
    assert.ok(r.titel, "elke rij heeft een titel");
    assert.ok(r.verwachte_categorie, `rij ${r.id} heeft geen verwachte categorie`);
    assert.ok(r.onderbouwing, `rij ${r.id} heeft geen onderbouwing — een label zonder reden is geen label`);
  }
});

test("elke productietitel valt in de verwachte categorie", () => {
  const fout: string[] = [];
  for (const r of CORPUS) {
    const uit = classificeerTitel(r);
    if (uit.categorie !== r.verwachte_categorie) {
      fout.push(
        `"${r.titel.slice(0, 60)}" -> ${uit.categorie}, verwacht ${r.verwachte_categorie}\n` +
          `      uitleg: ${uit.uitleg}`,
      );
    }
  }
  assert.equal(fout.length, 0, `${fout.length} afwijking(en):\n    ${fout.join("\n    ")}`);
});

test("de vier echte aanbestedingen worden commerciele kansen", () => {
  /* De vier signalen uit §3. Een aanbesteding met een passend onderwerp
     is het enige geval waarin dit platform iets mag aanraden. */
  const aanbestedingen = CORPUS.filter((r) => r.soort === "aanbesteding");
  assert.equal(aanbestedingen.length, 4, "er horen vier aanbestedingen in het corpus te staan");
  for (const r of aanbestedingen) {
    const uit = classificeerTitel(r);
    assert.equal(uit.categorie, "commerciele_kans", `${r.titel} werd ${uit.categorie}`);
    assert.ok(uit.bedrijfsrelevantie >= 30, `${r.titel} kreeg maar ${uit.bedrijfsrelevantie}`);
  }
});

test("de acht te hoog scorende gebeurtenissen zijn aantoonbaar gedegradeerd", () => {
  /* DIT IS DE KERN VAN DE KLACHT UIT §3, als meting.
     Acht gebeurtenissen stonden op materialiteit 50 of hoger terwijl ze
     geen kans zijn. Ze horen nu uit de actiegerichte categorieen weg te
     vallen. */
  const tehoog = CORPUS.filter(
    (r) =>
      r.huidige_materialiteit >= 50 &&
      (r.verwachte_categorie === "niet_relevant" || r.verwachte_categorie === "achtergrond"),
  );
  assert.ok(tehoog.length >= 6, `verwacht minstens 6 te hoog scorende rijen, kreeg ${tehoog.length}`);
  for (const r of tehoog) {
    const uit = classificeerTitel(r);
    assert.ok(
      !isActiegericht(uit.categorie),
      `"${r.titel.slice(0, 55)}" (was ${r.huidige_materialiteit}) staat nog in ${uit.categorie}`,
    );
    assert.ok(
      uit.bedrijfsrelevantie <= 30,
      `"${r.titel.slice(0, 55)}" houdt relevantie ${uit.bedrijfsrelevantie}`,
    );
  }
});

test("schaduwvloot scoort LAGER dan de laagste echte aanbesteding", () => {
  /* De vergelijking die het probleem het scherpst maakte: maritieme
     handhaving op 61 tegen een museumaanbesteding op 56. */
  const schaduw = CORPUS.find((r) => /schaduwvloot/i.test(r.titel));
  assert.ok(schaduw, "de schaduwvloot-titel hoort in het corpus te staan");
  const aanbestedingen = CORPUS.filter((r) => r.soort === "aanbesteding").map(classificeerTitel);
  const laagsteAanbesteding = Math.min(...aanbestedingen.map((u) => u.bedrijfsrelevantie));
  const uitSchaduw = classificeerTitel(schaduw);
  assert.ok(
    uitSchaduw.bedrijfsrelevantie < laagsteAanbesteding,
    `schaduwvloot ${uitSchaduw.bedrijfsrelevantie} tegen laagste aanbesteding ${laagsteAanbesteding}`,
  );
});

test("consumentenregelingen horen nooit bij de actiegerichte categorieen", () => {
  /* Vibe Energy is B2B; Vibe Home doet de consumentenmarkt. ISDE en
     warmtepompsubsidies voor particulieren mogen nooit als kans
     opduiken. */
  for (const r of CORPUS.filter((x) => /\bisde\b|warmtepompsubsidie/i.test(x.titel))) {
    const uit = classificeerTitel(r);
    assert.equal(uit.categorie, "niet_relevant", `${r.titel} werd ${uit.categorie}`);
    assert.ok(
      uit.grondslag.dempers.some((d) => /particulier|B2B|consument/i.test(d)),
      `${r.titel} mist de uitleg waarom hij gedempt is`,
    );
  }
});

test("elke uitslag legt zichzelf uit", () => {
  /* §6: een hoog scorende kans moet verdedigbaar zijn. Een score zonder
     uitleg is dat niet. */
  for (const r of CORPUS) {
    const uit = classificeerTitel(r);
    assert.ok(uit.uitleg.length > 12, `${r.titel} heeft geen uitleg`);
    const totaal =
      uit.grondslag.feiten.length + uit.grondslag.gevolgtrekkingen.length + uit.grondslag.dempers.length;
    assert.ok(totaal > 0, `${r.titel} heeft geen enkele grondslag`);
    assert.ok(uit.grondslag.gevolgtrekkingen.length > 0, `${r.titel} heeft geen gevolgtrekking`);
  }
});

test("relevantie en vertrouwen zijn aparte assen", () => {
  /* §6 verbiedt expliciet dat elke onzekerheid in een getal wordt
     samengeperst. Een aanbesteding ZONDER brontekst hoort relevant te
     zijn met een LAAG vertrouwen — niet irrelevant.
     Dit is precies de situatie van de vier echte signalen: TenderNed
     levert alleen een titel, tekst_lengte is 0. */
  const zonderTekst = classificeer({
    titel: "Zonnepanelen en Energieopslag",
    onderwerpen: herkenOnderwerpen("Zonnepanelen en Energieopslag", ""),
    gebeurtenisSoort: "aanbesteding",
  });
  const metTekst = classificeer({
    titel: "Zonnepanelen en Energieopslag",
    tekst:
      "De opdracht betreft de levering en installatie van zonnepanelen en een batterijsysteem " +
      "voor energieopslag op meerdere kazernelocaties. De sluitingsdatum voor inschrijving is " +
      "15 november 2026. Het betreft een Europese openbare procedure met een looptijd van vier jaar.",
    onderwerpen: herkenOnderwerpen(
      "Zonnepanelen en Energieopslag",
      "zonnepanelen batterijsysteem energieopslag inschrijving",
    ),
    gebeurtenisSoort: "aanbesteding",
  });

  assert.equal(zonderTekst.categorie, "commerciele_kans");
  assert.equal(metTekst.categorie, "commerciele_kans");
  assert.ok(
    metTekst.vertrouwen > zonderTekst.vertrouwen,
    `vertrouwen hoort te stijgen met bewijs: ${zonderTekst.vertrouwen} -> ${metTekst.vertrouwen}`,
  );
  assert.ok(
    zonderTekst.grondslag.dempers.some((d) => /geen brontekst/i.test(d)),
    "het ontbreken van brontekst hoort in de grondslag te staan",
  );
});
