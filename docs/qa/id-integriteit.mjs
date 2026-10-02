#!/usr/bin/env node
/* ============================================================================
   REGEL-ID-INTEGRITEIT — valideert tegen het register, niet tegen opmaak
   ----------------------------------------------------------------------------
   De eerste versie van dit script leidde af wat een DEFINITIE was uit markdown-
   opmaak (vet, kop, tabelcel). Dat gaf valse duplicaten (archetype B2 in vijf
   documenten is correcte kruisverwijzing) en valse bungelaars (een tabelrij
   zonder vette code). De vraag "is dit een definitie" is een OORDEEL en hoort
   dus in data, niet in een regex.

   Daarom: docs/data/vibe-rule-id-registry.json is de bron van waarheid. Dit
   script toetst de documenten en het harnas DAARTEGEN.

       node docs/qa/id-integriteit.mjs            rapport
       node docs/qa/id-integriteit.mjs --json
       node docs/qa/id-integriteit.mjs --onbekend  alleen de onbekende codes

   DEFINITIES
   DUPLICATE ID       een code die op meer dan EEN reeks in het register past
   DANGLING REFERENCE een code met de vorm van een regel-ID die op GEEN reeks past
                      en ook niet als uitzondering is verklaard
   AMBIGUOUS REF      idem duplicaat: een tekenreeks met twee betekenissen
   ============================================================================ */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const DOCS = dirname(HIER);
const REG = join(DOCS, 'data', 'vibe-rule-id-registry.json');

if (!existsSync(REG)) {
  console.error('REGISTER ONTBREEKT: docs/data/vibe-rule-id-registry.json');
  process.exit(2);
}
const register = JSON.parse(readFileSync(REG, 'utf8'));

/* ------------------------------------------------- wat lijkt op een regel-ID */
/* Ruim gekozen: liever een kandidaat te veel die we daarna classificeren, dan
   een echte bungelaar missen.                                                */
const KANDIDAAT = /\b([A-Z]{1,4}[0-9]?-?[A-Z]?[0-9]{1,2}[a-z]?|[A-Z]{2,4}-[A-Z0-9]{1,3})\b/g;

/* uitzonderingen: tekenreeksen die GEEN regel-ID zijn */
const geenId = (register.not_rule_ids || []).map(x => ({ re: new RegExp(x.pattern), wat: x.meaning }));
const woordUitz = new Set(register.literal_exceptions || []);

const reeksen = (register.series || []).map(s => ({ ...s, re: new RegExp(s.pattern) }));

function classificeer(code) {
  const treffers = reeksen.filter(s => s.re.test(code));
  if (treffers.length) return { soort: treffers.length > 1 ? 'DUBBEL' : 'BEKEND', reeksen: treffers };
  if (woordUitz.has(code)) return { soort: 'UITZONDERING' };
  for (const g of geenId) if (g.re.test(code)) return { soort: 'GEEN-ID', wat: g.wat };
  return { soort: 'ONBEKEND' };
}

/* --------------------------------------------------------------- inventaris */
const DOCBESTANDEN = readdirSync(DOCS).filter(f => f.endsWith('.md')).sort();
const QA = readdirSync(join(DOCS, 'qa')).filter(f => f.endsWith('.mjs')).sort();
const DATA = ['schema/composition-card.schema.json', 'data/vibe-site-register.json', 'data/vibe-rule-id-registry.json']
  .concat(existsSync(join(DOCS, 'compositions')) ? readdirSync(join(DOCS, 'compositions')).map(f => `compositions/${f}`) : [])
  .filter(p => existsSync(join(DOCS, p)));

const gezien = new Map();   // code -> {n, plekken:Set, inHarnas:bool}
function scan(pad, tekst, harnas) {
  for (const m of tekst.matchAll(KANDIDAAT)) {
    const code = m[1];
    if (!gezien.has(code)) gezien.set(code, { n: 0, plekken: new Set(), inHarnas: false });
    const g = gezien.get(code);
    g.n++; g.plekken.add(pad); if (harnas) g.inHarnas = true;
  }
}
for (const f of DOCBESTANDEN) scan(`docs/${f}`, readFileSync(join(DOCS, f), 'utf8'), false);
for (const f of QA) scan(`docs/qa/${f}`, readFileSync(join(DOCS, 'qa', f), 'utf8'), true);
for (const p of DATA) scan(`docs/${p}`, readFileSync(join(DOCS, p), 'utf8'), true);

/* ------------------------------------------------------------------ analyse */
const bekend = [], dubbel = [], onbekend = [], geenIdLijst = [], uitz = [];
for (const [code, g] of gezien) {
  const c = classificeer(code);
  const rij = { code, n: g.n, plekken: [...g.plekken], inHarnas: g.inHarnas, ...c };
  if (c.soort === 'BEKEND') bekend.push(rij);
  else if (c.soort === 'DUBBEL') dubbel.push(rij);
  else if (c.soort === 'GEEN-ID') geenIdLijst.push(rij);
  else if (c.soort === 'UITZONDERING') uitz.push(rij);
  else onbekend.push(rij);
}

/* reeksen in het register die NERGENS voorkomen = dode registratie */
const gebruikt = new Set(bekend.concat(dubbel).flatMap(r => r.reeksen.map(s => s.prefix)));
const dodeReeksen = reeksen.filter(s => !gebruikt.has(s.prefix)).map(s => s.prefix);

const harnasCodes = [...gezien.entries()].filter(([, g]) => g.inHarnas).map(([c]) => c);
const harnasOpgelost = harnasCodes.filter(c => {
  const s = classificeer(c).soort; return s === 'BEKEND' || s === 'UITZONDERING' || s === 'GEEN-ID';
});
const harnasOnopgelost = harnasCodes.filter(c => !harnasOpgelost.includes(c));

const totaalRegelIds = bekend.length + dubbel.length;
const refsGeteld = [...gezien.values()].reduce((a, g) => a + g.n, 0);

/* ----------------------------------------------------------------- uitvoer */
const args = process.argv.slice(2);
if (args.includes('--json')) {
  console.log(JSON.stringify({
    total_rule_ids: totaalRegelIds, unique_rule_ids: totaalRegelIds,
    duplicate_ids: dubbel.length, references_checked: refsGeteld,
    dangling_references: onbekend.length, ambiguous_references: dubbel.length,
    harness_refs_resolved: `${harnasOpgelost.length}/${harnasCodes.length}`,
    dode_reeksen: dodeReeksen,
    duplicaten: dubbel.map(d => ({ code: d.code, reeksen: d.reeksen.map(s => `${s.prefix} (${s.meaning})`) })),
    bungelend: onbekend.map(o => ({ code: o.code, n: o.n, plekken: o.plekken })),
  }, null, 1));
  process.exit(dubbel.length + onbekend.length === 0 ? 0 : 1);
}

if (args.includes('--onbekend')) {
  onbekend.sort((a, b) => b.n - a.n).forEach(o =>
    console.log(`  ${o.code.padEnd(12)} ${String(o.n).padStart(4)}x  ${o.plekken.slice(0, 3).join(' · ')}`));
  console.log(`\n  ${onbekend.length} onbekende codes`);
  process.exit(0);
}

console.log('REGEL-ID-INTEGRITEIT — getoetst tegen docs/data/vibe-rule-id-registry.json');
console.log('='.repeat(96));
console.log(`  gescand                  ${DOCBESTANDEN.length} docs · ${QA.length} harnas · ${DATA.length} data`);
console.log(`  reeksen in het register  ${reeksen.length}`);
console.log(`  TOTAL RULE IDS           ${totaalRegelIds}`);
console.log(`  UNIQUE RULE IDS          ${totaalRegelIds}`);
console.log(`  REFERENCES CHECKED       ${refsGeteld}`);
console.log(`  DUPLICATE IDS            ${dubbel.length}`);
console.log(`  DANGLING REFERENCES      ${onbekend.length}`);
console.log(`  AMBIGUOUS REFERENCES     ${dubbel.length}`);
console.log(`  HARNESS REFS RESOLVED    ${harnasOpgelost.length} van ${harnasCodes.length}`);
console.log(`  als GEEN-ID verklaard    ${geenIdLijst.length} tekenreeksen (${geenIdLijst.reduce((a, r) => a + r.n, 0)} treffers)`);
console.log(`  letterlijke uitzonderingen ${uitz.length}`);

if (dubbel.length) {
  console.log('\n  DUPLICAAT / AMBIGU — een tekenreeks past op meer dan een reeks:');
  dubbel.forEach(d => console.log(`    ${d.code.padEnd(12)} ${d.reeksen.map(s => `${s.prefix} (${s.meaning})`).join('  ×  ')}`));
}
if (dodeReeksen.length) {
  console.log(`\n  DODE REGISTRATIE — in het register, nergens gebruikt: ${dodeReeksen.join(' · ')}`);
}
if (onbekend.length) {
  console.log('\n  BUNGELEND — lijkt op een regel-ID, staat niet in het register:');
  onbekend.sort((a, b) => b.n - a.n).slice(0, 30).forEach(o =>
    console.log(`    ${o.code.padEnd(12)} ${String(o.n).padStart(4)}x  ${o.plekken.slice(0, 2).join(' · ')}`));
  if (onbekend.length > 30) console.log(`    ... en ${onbekend.length - 30} meer (zie --onbekend)`);
}
if (harnasOnopgelost.length) {
  console.log(`\n  HARNASCODES ZONDER REGISTRATIE: ${harnasOnopgelost.join(' · ')}`);
}

const hard = dubbel.length + onbekend.length;
console.log(`\n  ${hard === 0 ? 'PASS' : 'FAIL'} — duplicaten ${dubbel.length} + bungelend ${onbekend.length} = ${hard}`);
process.exit(hard === 0 ? 0 : 1);
