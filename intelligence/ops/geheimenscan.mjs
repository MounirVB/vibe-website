/* ============================================================
   OPS — geheimenscan over de gevolgde bestanden
   ------------------------------------------------------------
     node intelligence/ops/geheimenscan.mjs

   DEZE REPOSITORY IS PUBLIEK. Gemeten op 10 oktober 2026:
   `gh repo view` geeft visibility PUBLIC. Een gecommit geheim is dus
   onmiddellijk openbaar, en de enige echte herstelactie is het
   geheim rouleren — uit de historie halen helpt niet, want het is al
   gekloond en geïndexeerd.

   Daarom staat deze scan in de poort en niet in een checklist.

   WAT HIJ SCANT
   Alleen bestanden die git VOLGT. Een geheim in een genegeerd bestand
   (.env) is geen probleem; dat is juist de bedoeling van .gitignore.
   De scan draait dus op `git ls-files` en niet op de werkboom.

   WAAROM DE PATRONEN ZO SMAL ZIJN
   Een brede regex op "key" of "secret" levert in een codebase met
   woorden als `sessieGeheim`, `INTEL_SESSIE_GEHEIM` en `geheim:` alleen
   maar ruis, en een scan die altijd rood staat wordt genegeerd. De
   patronen hieronder matchen daarom op de VORM van echte credentials:
   het prefix dat een provider zelf uitgeeft, of een toewijzing met een
   waarde die eruitziet als een sleutel in plaats van een verwijzing.
   ============================================================ */

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const WORTEL = resolve(HIER, "..", "..");

/* Bestanden die per definitie voorbeelden bevatten. Een placeholder in
   een voorbeeldbestand is geen geheim. */
const UITGEZONDERD = [
  /(^|\/)\.env\.voorbeeld$/,
  /(^|\/)package-lock\.json$/,
  /(^|\/)ops\/geheimenscan\.mjs$/, // dit bestand zelf bevat de patronen
];

/* Binaire en grote bestanden overslaan: een .woff2 of .mp4 levert
   alleen valse treffers op. */
const BINAIR = /\.(woff2?|ttf|eot|png|jpe?g|gif|svg|ico|mp4|webm|webp|pdf|zip|gz|dump)$/i;
const MAX_BYTES = 2 * 1024 * 1024;

const PATRONEN = [
  {
    naam: "OpenAI-sleutel",
    // sk- gevolgd door minstens 20 sleuteltekens. Het echte formaat is
    // langer, maar korter afkappen zou een afgeknipte sleutel missen.
    re: /\bsk-[A-Za-z0-9_-]{20,}\b/,
  },
  {
    naam: "GitHub-token",
    re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  },
  {
    naam: "AWS-sleutel-ID",
    re: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    naam: "Google-API-sleutel",
    re: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    naam: "Slack-token",
    re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/,
  },
  {
    naam: "Resend-sleutel",
    re: /\bre_[A-Za-z0-9]{16,}\b/,
  },
  {
    naam: "privésleutel in PEM-vorm",
    re: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
  {
    naam: "databaseverbinding met wachtwoord",
    // postgres://gebruiker:wachtwoord@host — maar niet de
    // CI-wegwerpverbinding en niet een placeholder.
    re: /\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:(?!ci-wegwerp|wachtwoord|password|CHANGEME|xxx|\$\{)[^\s:@/]{6,}@/i,
  },
  {
    naam: "toewijzing van een geheim aan een letterlijke waarde",
    // KEY=waarde waar de waarde lang en sleutelachtig is. Een
    // verwijzing (${...}, process.env, secrets.) is juist goed en
    // wordt uitgesloten.
    re: /\b[A-Z0-9_]*(?:API_?KEY|SECRET|TOKEN|PASSWORD|PRIVATE_?KEY)\s*[:=]\s*["']?(?!\$\{|process\.env|secrets\.|\$\(|ci-|test-|voorbeeld|CHANGEME|xxx)[A-Za-z0-9+/_-]{24,}["']?/,
  },
];

function gevolgdeBestanden() {
  const uit = execFileSync("git", ["ls-files", "-z"], {
    cwd: WORTEL,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return uit.split("\0").filter(Boolean);
}

const bevindingen = [];
let gescand = 0;
let overgeslagen = 0;

for (const relpad of gevolgdeBestanden()) {
  if (UITGEZONDERD.some((re) => re.test(relpad)) || BINAIR.test(relpad)) {
    overgeslagen += 1;
    continue;
  }
  const vol = join(WORTEL, relpad);
  let s;
  try {
    s = statSync(vol);
  } catch {
    continue; // verwijderd maar nog in de index
  }
  if (s.size > MAX_BYTES) {
    overgeslagen += 1;
    continue;
  }

  let inhoud;
  try {
    inhoud = readFileSync(vol, "utf8");
  } catch {
    overgeslagen += 1;
    continue;
  }
  gescand += 1;

  const regels = inhoud.split("\n");
  for (let i = 0; i < regels.length; i += 1) {
    /* Een uitzondering per REGEL, met een reden erbij.
       -----------------------------------------------
       Nodig omdat sommige toetsen per definitie iets met
       credentialvorm moeten bevatten: de toetsen op de logafscherming
       voeren een nep-sleutel in om te bewijzen dat die verborgen
       wordt. Dat zijn geen geheimen, maar ze hebben wel de vorm.

       De uitzondering is bewust PER REGEL en niet per bestand. Een
       bestand uitsluiten zou een echt geheim dat er later in belandt
       stil doorlaten; een regel uitsluiten is zichtbaar in de diff en
       vraagt een reden. De patronen zelf blijven ongemoeid: ze
       verbreden zou juist een blinde vlek maken. */
    const markering = /geheimenscan:\s*ok\s*[—-]\s*(.+)$/.exec(
      regels[i] + " " + (regels[i - 1] ?? ""),
    );
    if (markering) continue;

    for (const p of PATRONEN) {
      if (p.re.test(regels[i])) {
        bevindingen.push({
          bestand: relpad,
          regel: i + 1,
          patroon: p.naam,
          // NOOIT de treffer zelf loggen: dat zou het geheim in de
          // CI-uitvoer zetten, en die is bij een publieke repository
          // ook publiek.
          fragment: `${regels[i].slice(0, 24).replace(/\s+/g, " ")}…`,
        });
      }
    }
  }
}

console.log("");
console.log("GEHEIMENSCAN");
console.log("");
console.log(`  gescand        ${gescand} gevolgde tekstbestanden`);
console.log(`  overgeslagen   ${overgeslagen} (binair, te groot of uitgezonderd)`);
console.log(`  patronen       ${PATRONEN.length}`);
console.log("");

if (bevindingen.length === 0) {
  console.log("  UITSLAG        PASS — geen credentialvormen in de gevolgde bestanden");
  console.log("");
  process.exit(0);
}

console.log(`  UITSLAG        FAIL — ${bevindingen.length} bevinding(en)`);
console.log("");
for (const b of bevindingen) {
  console.log(`  ${b.bestand}:${b.regel}  ${b.patroon}`);
  console.log(`      begin van de regel: ${b.fragment}`);
}
console.log("");
console.log("  Deze repository is PUBLIEK. Een gecommit geheim is openbaar;");
console.log("  rouleer het geheim en verwijder het daarna uit de boom.");
console.log("");
process.exit(1);
