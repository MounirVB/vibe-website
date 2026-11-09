#!/usr/bin/env node
/* ============================================================
   OPS — valideert de GitHub-werkstromen vóór GitHub het doet
   ------------------------------------------------------------
   WAAROM DEZE POORT BESTAAT.

   Op 9 november 2026 stond .github/workflows/uitgifte.yml drie runs
   lang op `failure` in 0 seconden. GitHub meldde alleen "This run
   likely failed because of a workflow file issue"; de API gaf nul jobs
   en nul check-runs, dus er was geen regel log om te lezen. De echte
   melding kwam pas uit een dispatch-poging:

     failed to parse workflow: (Line: 232, Col: 14):
     An expression was expected

   DE OORZAAK WAS EEN COMMENTAARREGEL. Binnen een `run:`-blok stond
   letterlijk een leeg expressiehaakje in een shell-commentaar. Actions
   vouwt expressies in een run-blok uit VOORDAT de shell het script
   ziet, dus een shell-# beschermt niets, en een leeg haakjespaar is
   geen expressie.

   Dat defect is onzichtbaar in elke lokale controle: de YAML is geldig,
   de typechecker ziet het niet, en geen enkele toets draait GitHub.
   Het bleef dus staan tot het in productie op main stond. Deze poort
   vangt precies die klasse, plus een paar eisen die dit platform aan
   zijn werkstromen stelt.

   WAT HIER NIET GEBEURT: een volledige YAML-parse. Dit platform heeft
   precies twee runtime-dependencies en de CI-poort rekent daarop; een
   YAML-bibliotheek erbij zou die belofte breken voor een controle die
   met regelbewerking te doen is. De eigenlijke parse doet GitHub, en
   een dispatch-poging is de manier om hem te meten (zie het runbook).
   ============================================================ */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HIER, "..", "..");
const MAP = join(REPO, ".github", "workflows");

let geslaagd = 0;
const fouten = [];

function toets(naam, ok, meting) {
  if (ok) {
    geslaagd += 1;
    console.log(`  PASS  ${naam}${meting ? ` — ${meting}` : ""}`);
  } else {
    fouten.push(`${naam}: ${meting}`);
    console.log(`  FAIL  ${naam} — ${meting}`);
  }
}

console.log("\nWERKSTROOMPOORT");
console.log("=".repeat(78));

if (!existsSync(MAP)) {
  console.log(`\n${MAP} bestaat niet; er is niets te toetsen.`);
  process.exit(0);
}

const bestanden = readdirSync(MAP).filter((b) => b.endsWith(".yml") || b.endsWith(".yaml"));
console.log(`\n${bestanden.length} werkstroom/werkstromen in .github/workflows/\n`);

for (const bestand of bestanden) {
  const pad = join(MAP, bestand);
  const regels = readFileSync(pad, "utf8").split("\n");
  console.log(`${bestand}`);

  /* ---------- 1. geen expressie binnen een run-blok ----------
     Het blok begint bij `run: |` (of `run: >`) en loopt tot een regel
     met minder of gelijke indentatie die zelf geen blokregel is. Voor
     deze controle is "tot de volgende stap of de volgende sleutel op
     het niveau van `run:`" genoeg, en dat is wat de inspringing zegt. */
  const treffers = [];
  let inrun = false;
  let runIndent = 0;
  regels.forEach((regel, i) => {
    const m = /^(\s*)run:\s*[|>]/.exec(regel);
    if (m) {
      inrun = true;
      runIndent = m[1].length;
      return;
    }
    if (inrun) {
      const leeg = regel.trim().length === 0;
      const indent = regel.length - regel.trimStart().length;
      if (!leeg && indent <= runIndent) {
        inrun = false;
      } else if (regel.includes("${{")) {
        treffers.push(`regel ${i + 1}: ${regel.trim().slice(0, 90)}`);
      }
    }
  });
  toets(
    `${bestand}: geen Actions-expressie binnen een run-blok`,
    treffers.length === 0,
    treffers.length === 0
      ? "nul treffers"
      : `${treffers.length} treffer(s) — ${treffers.join(" ;; ")}. Actions vouwt expressies in een ` +
        `run-blok uit vóór de shell; ook in een commentaar. Schrijf de token-naam uit in woorden.`,
  );

  /* ---------- 2. expliciete permissions ----------
     Een werkstroom zonder `permissions` erft de standaard van de
     repository, en die kan ruimer zijn dan de werkstroom nodig heeft.
     Deze repository is PUBLIEK, dus dat is geen theoretisch punt. */
  toets(
    `${bestand}: noemt zijn permissions expliciet`,
    regels.some((r) => /^permissions:/.test(r)),
    regels.some((r) => /^permissions:/.test(r))
      ? "aanwezig"
      : "ontbreekt; dan erft de werkstroom de standaardrechten van de repository",
  );

  /* ---------- 3. geen secret in een echo ----------
     Een `echo` met een secret erin zet hem in het runlog, en dat log is
     op een publieke repository leesbaar voor iedereen. */
  const echos = regels
    .map((r, i) => [i + 1, r])
    .filter(([, r]) => /echo\s+.*secrets\./.test(r));
  toets(
    `${bestand}: geen secret in een echo`,
    echos.length === 0,
    echos.length === 0 ? "nul treffers" : echos.map(([n, r]) => `regel ${n}: ${r.trim().slice(0, 70)}`).join(" ;; "),
  );

  /* ---------- 4. set -euo pipefail in meerregelige shellstappen ----------
     Zonder `-e` loopt een stap door na een mislukt commando en meldt
     hij succes; zonder `-o pipefail` verdwijnt een fout in het midden
     van een pijp. Alleen geteld voor blokken die méér dan één commando
     bevatten, want een eenregelige `run:` heeft het niet nodig. */
  let blokken = 0;
  let metVangnet = 0;
  let huidig = null;
  regels.forEach((regel) => {
    const m = /^(\s*)run:\s*\|/.exec(regel);
    if (m) {
      if (huidig !== null && huidig.regels > 1) {
        blokken += 1;
        if (huidig.vangnet) metVangnet += 1;
      }
      huidig = { indent: m[1].length, regels: 0, vangnet: false };
      return;
    }
    if (huidig !== null) {
      const leeg = regel.trim().length === 0;
      const indent = regel.length - regel.trimStart().length;
      if (!leeg && indent <= huidig.indent) {
        if (huidig.regels > 1) {
          blokken += 1;
          if (huidig.vangnet) metVangnet += 1;
        }
        huidig = null;
      } else if (!leeg && !regel.trim().startsWith("#")) {
        huidig.regels += 1;
        if (/set -euo pipefail/.test(regel)) huidig.vangnet = true;
      }
    }
  });
  if (huidig !== null && huidig.regels > 1) {
    blokken += 1;
    if (huidig.vangnet) metVangnet += 1;
  }
  /* GEEN HARDE EIS MAAR EEN MEETWAARDE voor poort.yml, dat ouder is dan
     deze regel en stappen heeft zonder vangnet. Voor uitgifte.yml is
     hij wel hard: die stap kan publiceren. */
  if (bestand === "uitgifte.yml") {
    toets(
      `${bestand}: elke meerregelige shellstap heeft 'set -euo pipefail'`,
      blokken === metVangnet,
      `${metVangnet} van ${blokken}`,
    );
  } else {
    console.log(`  INFO  ${bestand}: ${metVangnet} van ${blokken} meerregelige stappen met vangnet`);
  }
}

/* ---------- 5. de eisen aan de uitgiftewerkstroom ---------- */
const uitgifte = join(MAP, "uitgifte.yml");
if (existsSync(uitgifte)) {
  const t = readFileSync(uitgifte, "utf8");
  console.log("\nde uitgiftewerkstroom in het bijzonder");
  toets(
    "uitgifte.yml: vraagt id-token: write (het OIDC-kanaal)",
    /^\s+id-token:\s*write\s*$/m.test(t),
    /^\s+id-token:\s*write\s*$/m.test(t)
      ? "aanwezig"
      : "ontbreekt; zonder dit recht injecteert GitHub geen OIDC-variabelen en is er geen identiteit",
  );
  toets(
    "uitgifte.yml: gebruikt GEEN statisch machinegeheim meer",
    !/secrets\.INTEL_MACHINE_SLEUTEL/.test(t),
    !/secrets\.INTEL_MACHINE_SLEUTEL/.test(t)
      ? "nul verwijzingen"
      : "er staat nog een verwijzing naar secrets.INTEL_MACHINE_SLEUTEL; dat bewijs is vervangen door OIDC",
  );
  toets(
    "uitgifte.yml: vraagt per aanroep een nieuw OIDC-token",
    /ACTIONS_ID_TOKEN_REQUEST_URL/.test(t) && /oidc\(\)/.test(t),
    "een token werkt precies één keer (migratie 0059), dus hergebruik binnen één run zou falen",
  );
  toets(
    "uitgifte.yml: forceert geen merge",
    !/--admin|--force(?!-with-lease)/.test(t),
    !/--admin|--force(?!-with-lease)/.test(t)
      ? "geen --admin en geen kale --force"
      : "er staat een vlag die de branchbescherming zou omzeilen",
  );
}

console.log(`\n${"-".repeat(78)}`);
console.log(`geslaagd ${geslaagd}   gefaald ${fouten.length}`);
console.log(`\nEINDOORDEEL WERKSTROOMPOORT = ${fouten.length === 0 ? "PASS" : "FAIL"}`);
if (fouten.length > 0) {
  console.log("\nDe bevindingen:");
  for (const f of fouten) console.log(`  · ${f}`);
}
process.exit(fouten.length === 0 ? 0 : 1);
