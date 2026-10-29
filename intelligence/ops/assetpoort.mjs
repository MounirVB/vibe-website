/* ============================================================
   OPS — assetpoort met een vastgelegde basislijn
   ------------------------------------------------------------
     node intelligence/ops/assetpoort.mjs

   `npm run qa:assets` van Release 1 FAALT op de gedeployde basislijn.
   Gemeten op commit a2fbad7, die op dit moment live staat:

     qa:assets FAILED — 2 kapotte referentie(s) van 698 gecontroleerd:
       vibe/chrome.js: "vibe-energy-logo-light.svg" — CASE MISMATCH
       vibe/chrome.js: "vibe-energy-logo-dark.svg"  — CASE MISMATCH

   Dat is een BESTAAND defect in Release 1 en niet door dit werk
   veroorzaakt: `git diff a2fbad7..HEAD -- vibe/chrome.js` is leeg.
   Het staat nu dus ook op www.vibeenergy.nl.

   DRIE SLECHTE OPLOSSINGEN EN ÉÉN GOEDE

   · chrome.js repareren — dat is Release 1-gebied en valt buiten de
     opdracht; de eigenaar beslist daarover.
   · de stap uit CI laten — dan merkt niemand het ooit, en een derde
     kapotte referentie glipt er net zo stil in.
   · de stap op non-blocking zetten — dan is hij decoratie.
   · DE BASISLIJN VASTLEGGEN. Precies deze twee bevindingen zijn
     bekend en verantwoord; een DERDE blokkeert. Dat is hetzelfde
     patroon dat Release 1 zelf in poort 10 gebruikt ("1 bevinding,
     waarvan 0 nieuw en blokkerend").

   Zodra iemand chrome.js repareert faalt deze poort OOK — want dan
   zijn er minder bevindingen dan de basislijn en hoort de basislijn
   omlaag. Dat is bedoeld: een verouderde basislijn is zelf een
   bevinding.
   ============================================================ */

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const WORTEL = resolve(HIER, "..", "..");

/* De vastgelegde basislijn, met de reden erbij.

   28 oktober 2026 — DE BASISLIJN IS NUL GEWORDEN, en dat is precies de
   uitkomst die de koptekst hierboven voorspelde ("Zodra iemand chrome.js
   repareert faalt deze poort OOK"). Hij faalde inderdaad, met
   "2 bevinding(en) MINDER dan de basislijn", en dat was terecht.

   Alleen is het niet chrome.js dat is gerepareerd maar de CONTROLEUR. De
   vorige reden wees de weg: "Oplossen betekent qa-assets.mjs leren over
   samengestelde paden — Release 1-gebied, en een besluit van de eigenaar."
   Dat besluit is genomen en uitgevoerd in dezelfde release als het
   nieuwskanaal: scripts/qa-assets.mjs telt een KALE bestandsnaam die exact
   zo gespeld ergens in de boom bestaat niet langer als defect, omdat een
   statische controleur een runtime-concatenatie niet kan volgen.

   Wat NIET is verzwakt: ontbreekt het bestand overal, dan faalt de poort
   nog steeds, en bestaat het alleen met andere hoofdletters, dan meldt hij
   een ECHTE case mismatch. Gemeten na de wijziging: 1703 referenties
   gecontroleerd, 0 kapot, 0 case mismatches.

   De basislijn gaat daarom naar 0. Vanaf nu blokkeert ELKE bevinding —
   dat is strenger dan ervoor, niet soepeler. */
const BASISLIJN = {
  aantal: 0,
  commit: "af84195",
  bevindingen: [],
  reden:
    "GEEN VERANTWOORDE BEVINDINGEN MEER. De twee bekende meldingen over " +
    "vibe-energy-logo-light.svg en vibe-energy-logo-dark.svg waren nooit een live defect — beide " +
    "URL's geven op www.vibeenergy.nl HTTP 200 — maar een beperking van scripts/qa-assets.mjs, die " +
    "het pad '/assets/' + bestand uit vibe/chrome.js niet kon volgen en de kale bestandsnaam daarom " +
    "ten onrechte als CASE MISMATCH labelde terwijl er geen hoofdletterverschil was. Die controleur is " +
    "op 28 oktober 2026 gecorrigeerd: een kale bestandsnaam die exact zo gespeld in de boom bestaat, " +
    "telt niet meer als defect; een ontbrekend bestand en een echte spellingsafwijking nog wel. " +
    "Daarmee is de basislijn leeg en blokkeert elke nieuwe bevinding onmiddellijk.",
};

let uit = "";
let faalde = false;
try {
  uit = execFileSync("node", [resolve(WORTEL, "scripts", "qa-assets.mjs")], {
    cwd: WORTEL,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
} catch (e) {
  faalde = true;
  uit = (e.stdout ?? "") + (e.stderr ?? "");
}

const m = /(\d+) kapotte referentie\(s\) van (\d+) gecontroleerd/.exec(uit);
const aantal = m ? Number(m[1]) : faalde ? -1 : 0;
const gecontroleerd = m ? Number(m[2]) : 0;

/* De gevonden regels, zodat een nieuwe bevinding te benoemen is. */
const regels = uit
  .split("\n")
  .map((r) => r.trim())
  .filter((r) => r.includes("CASE MISMATCH") || /^[a-z0-9_./-]+:\s*"/i.test(r));

const nieuw = regels.filter((r) => !BASISLIJN.bevindingen.some((b) => r.startsWith(b.split(" — ")[0])));

console.log("");
console.log("ASSETPOORT (met basislijn)");
console.log("");
console.log(`  gecontroleerd      ${gecontroleerd} referenties`);
console.log(`  bevindingen        ${aantal}`);
console.log(`  basislijn          ${BASISLIJN.aantal} (vastgelegd op ${BASISLIJN.commit})`);
console.log("");
for (const b of BASISLIJN.bevindingen) console.log(`  bekend   ${b}`);
if (nieuw.length) {
  console.log("");
  for (const n of nieuw) console.log(`  NIEUW    ${n}`);
}
console.log("");
console.log(`  reden basislijn    ${BASISLIJN.reden}`);
console.log("");

if (aantal === -1) {
  console.log("  UITSLAG  FAIL — qa-assets.mjs gaf geen leesbare uitkomst");
  console.log(uit.split("\n").slice(-10).join("\n"));
  process.exit(1);
}
if (aantal > BASISLIJN.aantal) {
  console.log(`  UITSLAG  FAIL — ${aantal - BASISLIJN.aantal} bevinding(en) MEER dan de basislijn`);
  process.exit(1);
}
if (aantal < BASISLIJN.aantal) {
  console.log(
    `  UITSLAG  FAIL — ${BASISLIJN.aantal - aantal} bevinding(en) MINDER dan de basislijn. ` +
      "Goed nieuws, maar de basislijn in dit bestand hoort dan omlaag; een verouderde basislijn " +
      "verbergt een volgende regressie.",
  );
  process.exit(1);
}
console.log("  UITSLAG  PASS — precies de verantwoorde basislijn, geen nieuwe bevinding");
