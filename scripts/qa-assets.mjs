#!/usr/bin/env node
// Statische asset-QA: controleert dat elke lokale image/video/font-referentie
// in HTML/CSS/JS/PHP naar een bestaand bestand wijst, met exacte case-match.
// Faalt (exit 1) bij: missende bestanden, kapotte assets/- of img/-paden, case mismatch.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, normalize, sep } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ASSET_EXT = /\.(jpe?g|png|webp|svg|gif|mp4|webm|woff2?)$/i;
const CODE_EXT = /\.(html|css|js|php|xml)$/i;
const IGNORE_DIRS = new Set([".git", "node_modules", "scripts"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Case-exacte existence check (APFS/HFS is case-insensitief; live servers niet).
function existsExactCase(relPath) {
  let dir = ROOT;
  for (const part of normalize(relPath).split(sep)) {
    if (!part) continue;
    if (!existsSync(dir) || !readdirSync(dir).includes(part)) return false;
    dir = join(dir, part);
  }
  return true;
}

const allFiles = walk(ROOT);
const codeFiles = allFiles.filter((f) => CODE_EXT.test(f));

// Vind lokale asset-referenties: quoted strings of url(...)-argumenten die op een
// asset-extensie eindigen. Property-access in geminificeerde JS (x.svg) matcht niet.
const REF_RE = /(?:url\(\s*['"]?|["'])((?:\.{0,2}\/)?[A-Za-z0-9_][A-Za-z0-9_./-]*\.(?:jpe?g|png|webp|svg|gif|mp4|webm|woff2?))(?=["')\s?#])/gi;

// og:image/twitter:image e.d. naar het eigen domein wijzen naar dezelfde repo-paden
// en worden ook lokaal geverifieerd.
const OWN_URL_RE = /https?:\/\/(?:www\.)?vibeenergy\.nl\/([A-Za-z0-9_][A-Za-z0-9_./-]*\.(?:jpe?g|png|webp|svg|gif|mp4|webm|woff2?))/gi;

const failures = [];
let checked = 0;

for (const file of codeFiles) {
  const rel = file.slice(ROOT.length);
  const text = readFileSync(file, "utf8");
  const matches = [...text.matchAll(REF_RE), ...text.matchAll(OWN_URL_RE)];
  for (const m of matches) {
    let ref = m[1].replace(/^\.\//, "");
    // Externe URLs en data-URIs overslaan (eigen domein wordt apart gematcht).
    const before = text.slice(Math.max(0, m.index - 30), m.index + 1);
    if (m[0].startsWith("http")) {
      // eigen-domein match: ref is al het repo-relatieve pad
    } else if (/https?:\/\/[^"'()]*$/.test(before) || /data:[^"'()]*$/.test(before)) {
      continue;
    }
    if (/^(www\.|.*schema\.org|.*w3\.org)/.test(ref)) continue;
    checked++;
    // Relatief t.o.v. het verwijzende bestand oplossen; root-relatief als fallback
    // (HTML staat in root, dus die zijn identiek).
    const relToFile = normalize(join(dirname(rel), ref));
    const target = existsExactCase(relToFile) ? relToFile : ref;
    if (!existsExactCase(target)) {
      const ciHit = allFiles.find((f) => f.toLowerCase().endsWith(("/" + ref).toLowerCase()));
      failures.push({
        file: rel,
        ref,
        reason: ciHit ? `CASE MISMATCH (bestaat als ${ciHit.slice(ROOT.length)})` : "BESTAND ONTBREEKT",
      });
    }
  }
}

if (failures.length) {
  console.error(`qa:assets FAILED — ${failures.length} kapotte referentie(s) van ${checked} gecontroleerd:\n`);
  for (const f of failures) console.error(`  ${f.file}: "${f.ref}" — ${f.reason}`);
  process.exit(1);
}
console.log(`qa:assets OK — ${checked} lokale asset-referenties gecontroleerd, 0 kapot, 0 case mismatches.`);
