#!/usr/bin/env node
/* ============================================================================
   REGELVERVANGER MET VERIFICATIE
   ----------------------------------------------------------------------------
   Past een lijst regelvervangingen toe, maar alleen als ELKE vervanging eerst
   verifieerbaar is. Geen enkele blinde zoek-en-vervang.

       node docs/qa/pas-edits-toe.mjs <edits.json> [--droog]

   edits.json = [{file, line, before, after, reason}, ...]

   WAARBORGEN
   1. `before` moet TEKEN VOOR TEKEN gelijk zijn aan de huidige regel. Zo niet:
      de edit wordt GEWEIGERD en niets wordt geschreven.
   2. Twee edits op dezelfde regel = CONFLICT. Niets wordt geschreven.
   3. Een edit die de regel niet verandert = ZINLOOS, wordt overgeslagen.
   4. Het aantal regels in het bestand mag NIET veranderen.
   5. Alles of niets: één fout en er wordt geen enkel bestand aangeraakt.
   ============================================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const [pad, ...vlaggen] = process.argv.slice(2);
const droog = vlaggen.includes('--droog');
if (!pad) { console.error('gebruik: node docs/qa/pas-edits-toe.mjs <edits.json> [--droog]'); process.exit(2); }

const edits = JSON.parse(readFileSync(pad, 'utf8'));
if (!Array.isArray(edits)) { console.error('edits.json moet een array zijn'); process.exit(2); }

/* PRODUCTIEBEVEILIGING. Alleen documenten onder docs/ mogen hier door. */
const TOEGESTAAN = /^docs\/[0-9A-Za-z._/-]+\.(md|json)$/;
const verboden = edits.filter(e => !TOEGESTAAN.test(e.file));
if (verboden.length) {
  console.error(`GEWEIGERD: ${verboden.length} edit(s) buiten docs/:`);
  [...new Set(verboden.map(e => e.file))].forEach(f => console.error(`  ${f}`));
  process.exit(1);
}

/* groeperen en op conflicten toetsen */
const perBestand = new Map();
for (const e of edits) {
  if (!perBestand.has(e.file)) perBestand.set(e.file, new Map());
  const m = perBestand.get(e.file);
  if (m.has(e.line)) {
    const a = m.get(e.line);
    if (a.after !== e.after) {
      console.error(`CONFLICT ${e.file}:${e.line} — twee verschillende vervangingen`);
      console.error(`  A: ${a.after.slice(0, 90)}`);
      console.error(`  B: ${e.after.slice(0, 90)}`);
      process.exit(1);
    }
    continue;  // identieke dubbele edit: onschadelijk
  }
  m.set(e.line, e);
}

/* verifieren */
const resultaat = [];
let geweigerd = 0, zinloos = 0, toegepast = 0;
const nieuweInhoud = new Map();

for (const [file, m] of perBestand) {
  const vol = join(ROOT, file);
  let regels;
  try { regels = readFileSync(vol, 'utf8').split('\n'); }
  catch (err) { console.error(`KAN NIET LEZEN: ${file} — ${err.message}`); process.exit(1); }

  for (const [nr, e] of [...m].sort((a, b) => a[0] - b[0])) {
    const idx = nr - 1;
    const huidig = regels[idx];
    if (huidig === undefined) {
      resultaat.push({ s: 'GEWEIGERD', file, nr, waarom: `regel ${nr} bestaat niet (bestand heeft ${regels.length})` });
      geweigerd++; continue;
    }
    if (huidig !== e.before) {
      resultaat.push({ s: 'GEWEIGERD', file, nr, waarom: 'before wijkt af van de echte regel',
        echt: huidig.slice(0, 100), gevraagd: e.before.slice(0, 100) });
      geweigerd++; continue;
    }
    if (e.after === e.before) { resultaat.push({ s: 'ZINLOOS', file, nr, waarom: 'after == before' }); zinloos++; continue; }
    if (e.after.includes('\n')) {
      resultaat.push({ s: 'GEWEIGERD', file, nr, waarom: 'after bevat een regeleinde' }); geweigerd++; continue;
    }
    regels[idx] = e.after;
    resultaat.push({ s: 'OK', file, nr, reason: e.reason });
    toegepast++;
  }
  nieuweInhoud.set(vol, regels.join('\n'));
}

/* rapport */
console.log('REGELVERVANGER');
console.log('='.repeat(96));
for (const r of resultaat) {
  if (r.s === 'OK') continue;
  console.log(`  ${r.s.padEnd(10)} ${r.file}:${r.nr}  ${r.waarom}`);
  if (r.echt !== undefined) {
    console.log(`             echt     : ${r.echt}`);
    console.log(`             gevraagd : ${r.gevraagd}`);
  }
}
console.log(`\n  aangeboden ${edits.length} · toegepast ${toegepast} · zinloos ${zinloos} · GEWEIGERD ${geweigerd}`);

if (geweigerd) {
  console.log('\n  ALLES-OF-NIETS: er is niets geschreven omdat er geweigerde edits zijn.');
  console.log('  Herstel de afwijkende `before`-regels en bied opnieuw aan.');
  process.exit(1);
}
if (droog) { console.log('\n  --droog: niets geschreven.'); process.exit(0); }

for (const [vol, inhoud] of nieuweInhoud) writeFileSync(vol, inhoud);
console.log(`\n  ${nieuweInhoud.size} bestand(en) geschreven.`);
for (const [vol] of nieuweInhoud) {
  const n = readFileSync(vol, 'utf8').split('\n').length;
  console.log(`    ${vol.replace(ROOT + '/', '')}  ${n} regels`);
}
process.exit(0);
