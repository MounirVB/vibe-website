/* ============================================================
   TEST — getalparsing: het staartje van een dubbelzinnig getal
   ------------------------------------------------------------
   WAAROM DIT BESTAND BESTAAT.

   `leesUitdrukkingen()` had op 13 oktober 2026 GEEN enkele
   eenheidstoets. Dat is de reden dat het defect hieronder drie releases
   heeft overleefd, inclusief 3.0.2 en 3.0.3 die juist over getrouwe
   getallen gingen.

   HET DEFECT, GEMETEN MET DE ECHTE FUNCTIE.

   `GETAL` kent twee alternatieven: met duizendpunten (`1.250,5`) en
   zonder (`250`). Een punt die NIET door exact drie cijfers wordt
   gevolgd past op geen van beide. De regexmotor geeft dan niet op: hij
   schuift één teken op en matcht het STAARTJE.

       "een rendement van 19.5%"     ->  5 %        werkelijk 19,5
       "de prijs is 164.09 euro"     ->  09 EUR     werkelijk 164,09
       "groei van 7.5% naar 12.25%"  ->  5 % en 25 %

   WAAROM DE KRUISCONTROLE HET NIET ZAG, EN WAT DAT BETEKENT VOOR DEZE
   TOETS.

   `verrijk()` vergelijkt de uitkomst van pijplijn/uitdrukking.ts met die
   van pijplijn/uitspraken.ts als kruiscontrole. Beide bestanden droegen
   hetzelfde patroon en dus dezelfde fout, dus kwamen ze op hetzelfde
   verkeerde getal uit en BEVESTIGDEN ze elkaar.

   Daarom toetst dit bestand NIET of de twee parsers het eens zijn. Die
   toets was vóór de reparatie al groen — beide zeiden 5. Wat hier wordt
   afgedwongen is dat GEEN VAN BEIDE een waarde teruggeeft voor een
   dubbelzinnig getal. Een kruiscontrole tussen twee kopieën van dezelfde
   fout is geen controle, en een toets die alleen gelijkheid eist, erft
   die eigenschap.

   De reparatie is `(?<![\d.,])` in beide patronen: strikt beperkender,
   nooit ruimer. Een dubbelzinnig getal levert NIETS in plaats van iets
   verkeerds.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { leesUitdrukkingen } from "../../src/pijplijn/uitdrukking.ts";
import { extraheerUitspraken } from "../../src/pijplijn/uitspraken.ts";

/** De drie gemeten gevallen waarin het staartje werd gematcht. */
const DUBBELZINNIG: readonly { zin: string; wasFout: string }[] = [
  { zin: "Het rendement komt uit op 19.5% op jaarbasis.", wasFout: "5 %" },
  { zin: "De prijs is 164.09 euro per maand.", wasFout: "09 EUR" },
  { zin: "De groei liep van 7.5% naar 12.25% in twee jaar.", wasFout: "5 % en 25 %" },
];

test("een punt die geen duizendscheiding is, levert GEEN uitdrukking", () => {
  for (const { zin, wasFout } of DUBBELZINNIG) {
    const u = leesUitdrukkingen(zin);
    assert.equal(
      u.length,
      0,
      `'${zin}' gaf ${JSON.stringify(u.map((x) => `${x.waarde} ${x.eenheid ?? ""}`))} — ` +
        `vóór de reparatie was dit '${wasFout}'. Een dubbelzinnig getal hoort NIETS te leveren.`,
    );
  }
});

test("de TWEEDE parser maakt dezelfde fout niet — en gelijkheid is hier geen bewijs", () => {
  /* extraheerUitspraken() is de andere helft van de kruiscontrole. Vóór
     de reparatie gaf hij óók 5 voor '19.5%', en een toets op gelijkheid
     tussen de twee parsers was dus groen terwijl beide fout waren.
     Daarom wordt hier de AFWEZIGHEID van een numerieke waarde geëist. */
  for (const { zin } of DUBBELZINNIG) {
    const ruw = extraheerUitspraken("Titel zonder getal", zin);
    const metGetal = ruw.filter((r) => r.waardeNumeriek !== null);
    assert.equal(
      metGetal.length,
      0,
      `'${zin}' leverde ${JSON.stringify(metGetal.map((r) => `${r.waardeNumeriek} ${r.eenheid ?? ""}`))}`,
    );
  }
});

test("legitieme getallen blijven ONVERANDERD, met hun echte waarde", () => {
  /* De reparatie mag niets wegnemen. Elk getal hieronder stond vóór de
     wijziging correct in de uitvoer en moet dat blijven doen — anders is
     de linkergrens te streng en kost hij echte metingen. */
  const goed: readonly { zin: string; waarde: number; eenheid: string }[] = [
    { zin: "Een opslag van 1.250,5 kW is voorzien.", waarde: 1250.5, eenheid: "kW" },
    { zin: "De capaciteit is 250 kW.", waarde: 250, eenheid: "kW" },
    { zin: "Een boete van 2.500 EUR is opgelegd.", waarde: 2500, eenheid: "EUR" },
    { zin: "Een budget van 8,7 miljoen euro is vrijgemaakt.", waarde: 8_700_000, eenheid: "EUR" },
    /* De Nederlandse decimaalKOMMA moet blijven werken; alleen de punt
       is dubbelzinnig. Dit is het geval dat bewijst dat de reparatie het
       juiste teken aanpakt. */
    { zin: "Het rendement komt uit op 19,5% op jaarbasis.", waarde: 19.5, eenheid: "%" },
  ];
  for (const g of goed) {
    const u = leesUitdrukkingen(g.zin);
    assert.ok(u.length > 0, `'${g.zin}' leverde niets; de linkergrens is te streng`);
    const treffer = u.find((x) => x.eenheid === g.eenheid);
    assert.ok(treffer, `'${g.zin}' leverde geen uitdrukking met eenheid ${g.eenheid}`);
    assert.equal(treffer.waarde, g.waarde, `'${g.zin}' gaf ${treffer.waarde} in plaats van ${g.waarde}`);
  }
});

test("een bereik houdt beide grenzen", () => {
  const u = leesUitdrukkingen("Een vermogen tussen 10 en 20 kW is gebruikelijk.");
  const bereik = u.find((x) => x.bereikMin !== null);
  assert.ok(bereik, "geen bereik gevonden");
  assert.equal(bereik.bereikMin, 10);
  assert.equal(bereik.bereikMax, 20);
});

test("de linkergrens staat in BEIDE patroonbestanden", () => {
  /* Een regressiegrendel op de oorzaak en niet op het symptoom: zodra
     iemand het patroon in één van de twee bestanden herschrijft zonder
     de grens, valt deze toets om. Dat is precies hoe het defect kon
     ontstaan — twee kopieën die onafhankelijk konden verschuiven. */
  /* TWEE LITERALE VORMEN, en dat is geen slordigheid van de bronbestanden.
     In uitdrukking.ts staat de grens in een String.raw-template en staat er
     dus letterlijk `(?<![\d.,])`. In uitspraken.ts staat hij in een gewone
     dubbelquote-string en in een regexliteraal, waar de backslash verdubbeld
     is: `(?<![\\d.,])`. Een toets die maar één vorm kent, faalt op het
     andere bestand — gemeten toen deze toets dat deed. */
  const ENKEL = String.raw`(?<![\d.,])`;
  const DUBBEL = String.raw`(?<![\\d.,])`;
  const bestanden = ["../../src/pijplijn/uitdrukking.ts", "../../src/pijplijn/uitspraken.ts"];
  for (const rel of bestanden) {
    const inhoud = readFileSync(new URL(rel, import.meta.url), "utf8");
    assert.ok(
      inhoud.includes(ENKEL) || inhoud.includes(DUBBEL),
      `${rel} draagt de linkergrens ${ENKEL} niet meer`,
    );
  }
});

test("elk getalpatroon in BEIDE bestanden draagt de linkergrens", () => {
  /* De vorige toets is te zwak op zichzelf: hij is al tevreden met ÉÉN
     grens per bestand, terwijl uitspraken.ts er DRIE getalpatronen heeft.
     Precies daar zat het gat — het euro-patroon op ~regel 200 werd bij de
     eerste reparatie overgeslagen en leverde '164.09 euro' nog als 9 EUR.
     Deze toets eist daarom dat elk patroon dat een cijferreeks met
     duizendpunten opent, direct door de grens wordt voorafgegaan. */
  const CIJFERGROEP = /\(\\{1,2}d\{1,3\}/g;
  for (const rel of ["../../src/pijplijn/uitdrukking.ts", "../../src/pijplijn/uitspraken.ts"]) {
    const inhoud = readFileSync(new URL(rel, import.meta.url), "utf8");
    for (const m of inhoud.matchAll(CIJFERGROEP)) {
      const voor = inhoud.slice(Math.max(0, m.index - 24), m.index);
      assert.match(
        voor,
        /\(\?<!\[\\{1,2}d\.,\]\)|GETALGRENS/,
        `${rel}: een getalpatroon op positie ${m.index} wordt niet voorafgegaan door de ` +
          `linkergrens. Zonder die grens matcht de motor het staartje van een dubbelzinnig ` +
          `getal. Context: ...${voor}${m[0]}...`,
      );
    }
  }
});
