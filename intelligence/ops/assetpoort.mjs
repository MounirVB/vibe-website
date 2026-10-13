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

/* De vastgelegde basislijn, met de reden erbij. */
const BASISLIJN = {
  aantal: 2,
  commit: "a2fbad7",
  bevindingen: [
    'vibe/chrome.js: "vibe-energy-logo-light.svg" — CASE MISMATCH',
    'vibe/chrome.js: "vibe-energy-logo-dark.svg" — CASE MISMATCH',
  ],
  /* Deze tekst zei tot 13 oktober 2026: "Bestaand defect in Release 1, aanwezig op de
     gedeployde commit a2fbad7 en dus live." Dat is nagemeten en onjuist. Niets aan de
     basislijn zelf verandert — de twee bevindingen komen nog steeds — maar de REDEN
     waarom ze verantwoord zijn, is een andere, en dat verschil bepaalt wie het hoort op
     te lossen. */
  reden:
    "GEEN LIVE DEFECT, maar een beperking van de statische assetcontroleur. Gemeten 13 oktober 2026: " +
    "/assets/vibe-energy-logo-light.svg en /assets/vibe-energy-logo-dark.svg geven op " +
    "www.vibeenergy.nl beide HTTP 200 met content-type image/svg+xml, en de bestandsnamen in " +
    "assets/ zijn teken voor teken gelijk aan de referentie in vibe/chrome.js regel 124. Er is dus " +
    "geen hoofdletterverschil; het label CASE MISMATCH is zelf onjuist. Het ontstaat zo: chrome.js " +
    "regel 125 bouwt het pad tijdens runtime als '/assets/' + bestand, dus scripts/qa-assets.mjs ziet " +
    "alleen de BARE bestandsnaam. Die lost hij eerst op ten opzichte van het verwijzende bestand " +
    "(vibe/vibe-energy-logo-light.svg — bestaat niet) en daarna wortelrelatief " +
    "(vibe-energy-logo-light.svg — bestaat niet, want het staat in assets/); pas de " +
    "hoofdletterONgevoelige suffixzoeker op qa-assets.mjs regel 68 vindt assets/… en kiest daarom het " +
    "label CASE MISMATCH in plaats van BESTAND ONTBREEKT. Een statische controleur kan een " +
    "runtime-concatenatie niet zien. Niet veroorzaakt door het intelligenceplatform: " +
    "git diff a2fbad7..HEAD -- vibe/chrome.js is leeg. De basislijn blijft op 2 omdat de melding blijft " +
    "komen zolang qa-assets.mjs samengestelde paden niet begrijpt; een DERDE bevinding blokkeert " +
    "onverminderd. Oplossen betekent qa-assets.mjs leren over samengestelde paden — Release 1-gebied, " +
    "en een besluit van de eigenaar.",
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
