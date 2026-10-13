#!/usr/bin/env node
/* ============================================================
   OPS — DESTRUCTIEVE MIGRATIES ZICHTBAAR MAKEN VOOR DE MERGE
   ------------------------------------------------------------
   WAAROM DIT BESTAAT — een gemeten gebeurtenis, geen voorzorg.

   Op 13 oktober 2026 bevatte migratie 0034 naast een additieve tabel
   ook twee onomkeerbare statements:

     alter table intel.pagina_register drop column if exists live_http_status;
     alter table intel.pagina_register drop column if exists live_gemeten_op;

   Die zijn in productie uitgevoerd zonder dat iemand er expliciet
   toestemming voor gaf. Niet door een handmatig commando, maar doordat
   `vibe-intel-api` een preDeployCommand draagt:

     npm run migreer && npm run zaai && npm run geo

   Die draait binnen het privénet bij ELKE deploy, vóór de nieuwe
   container live gaat. EEN MERGE NAAR MAIN PAST DUS MIGRATIES TOE OP
   PRODUCTIE. Dat staat nergens in een PR, en het stond tot die dag ook
   niet in deploy/railway.md.

   Het was deze keer onschadelijk, en dat is gemeten: beide kolommen
   waren leeg (449 rijen in pagina_register, 0 non-null in beide), en
   over de HELE git-historie bestaat geen commit die ze in src/ of test/
   leest of schrijft — alleen de commit die ze definieerde. Maar
   "onschadelijk" was een uitkomst, geen controle.

   WAT DEZE POORT DOET

   Hij maakt de destructieve statements in migraties ZICHTBAAR en eist
   dat ze BENOEMD zijn. Niet meer en niet minder:

     1. hij print elke destructieve statement per migratie, zodat een
        reviewer vóór de merge ziet wat er op productie gaat gebeuren;
     2. een destructieve statement in een migratie die NIET in de
        basislijn staat, moet een regel
             -- DESTRUCTIEF: <reden>
        in het bestand hebben. Ontbreekt die, dan faalt deze poort.

   WAT HIJ BEWUST NIET DOET

   Hij eist NIET dat een destructieve statement in een eigen
   migratiebestand staat. Dat was de eerste opzet en die is verworpen op
   een meting: 14 van de 34 bestaande migraties combineren al een
   `drop column` met andere wijzigingen. Een regel die veertien keer in
   de basislijn moet, is geen regel maar een ritueel.

   `drop constraint` en `drop not null` tellen hier NIET als
   destructief. Ze verwijderen een REGEL, geen DATA, en zijn met een
   voorwaartse migratie terug te zetten. Ze meenemen zou 23 van de 34
   migraties markeren en de poort tot ruis maken.

   WAAROM DE BASISLIJN NIET LEEG IS, EN WAAROM 0034 ERIN STAAT EN NIET
   GEMARKEERD IS

   Een reeds TOEGEPASTE migratie mag je niet meer aanraken. De
   migratierunner hasht elk bestand en WEIGERT te draaien als een
   toegepaste migratie op schijf is gewijzigd (src/db/migraties.ts). Een
   `-- DESTRUCTIEF:`-regel in 0034 bijschrijven zou dus drift geven en
   de eerstvolgende preDeployCommand — en daarmee de eerstvolgende
   deploy — laten falen. Daarom: alles tot en met 0034 staat in de
   basislijn, en de eis geldt vanaf 0035.

   Draaien: node intelligence/ops/migratiepoort.mjs
   Exitcode 1 zodra een niet-gemarkeerde destructieve statement opduikt.
   ============================================================ */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const MIGRATIEMAP = resolve(hier, '..', 'db', 'migraties');

/**
 * Statements die DATA onomkeerbaar weggooien. Bewust kort gehouden; zie
 * de kop voor wat er met opzet buiten staat.
 */
const DESTRUCTIEF = [
  { soort: 'drop column', patroon: /\bdrop\s+column\b/gi },
  { soort: 'drop table', patroon: /\bdrop\s+table\b/gi },
  { soort: 'drop schema', patroon: /\bdrop\s+schema\b/gi },
  { soort: 'truncate', patroon: /\btruncate\b/gi },
];

/** De marker die een destructieve statement verantwoordt. */
const MARKER = /--\s*DESTRUCTIEF:\s*\S+/i;

/**
 * BASISLIJN — migraties die al zijn toegepast vóór deze poort bestond.
 * Deze lijst mag NOOIT groeien zonder dat iemand uitlegt waarom. Een
 * nieuwe migratie hoort de marker te dragen, niet hier te landen.
 *
 * Afgeleid op 13 oktober 2026 met exact de patronen hierboven, over de
 * 34 migraties van commit 8cbf6b5.
 */
const BASISLIJN_TOT_EN_MET = '0034';
const BASISLIJN_REDEN =
  'Toegepast vóór deze poort bestond. Een toegepaste migratie is niet meer te wijzigen: de runner ' +
  'hasht elk bestand en weigert bij drift, dus een marker bijschrijven zou de eerstvolgende deploy breken.';

function nummerVan(naam) {
  const m = naam.match(/^(\d{4})_/);
  return m ? m[1] : null;
}

/** Verwijder commentaar en stringliteralen, zodat een woord in proza niet meetelt. */
function alleenCode(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/\$([a-z]*)\$[\s\S]*?\$\1\$/gi, ' ');
}

const bestanden = readdirSync(MIGRATIEMAP).filter((f) => f.endsWith('.sql')).sort();
const bevindingen = [];
const inventaris = [];

for (const naam of bestanden) {
  const nummer = nummerVan(naam);
  const ruw = readFileSync(resolve(MIGRATIEMAP, naam), 'utf8');
  const code = alleenCode(ruw);

  const gevonden = [];
  for (const { soort, patroon } of DESTRUCTIEF) {
    const n = (code.match(patroon) || []).length;
    if (n) gevonden.push(`${soort}×${n}`);
  }
  if (!gevonden.length) continue;

  /* De marker mag in commentaar staan — daar hoort hij juist. Dus tegen
     de RUWE inhoud toetsen, niet tegen de gestripte. */
  const gemarkeerd = MARKER.test(ruw);
  const inBasislijn = nummer !== null && nummer <= BASISLIJN_TOT_EN_MET;

  inventaris.push({ naam, gevonden, gemarkeerd, inBasislijn });

  if (!inBasislijn && !gemarkeerd) {
    bevindingen.push(
      `${naam}: ${gevonden.join(', ')} zonder een regel '-- DESTRUCTIEF: <reden>' in het bestand.\n` +
        `      Een merge naar main voert dit UIT op productie via de preDeployCommand van vibe-intel-api.\n` +
        `      Benoem wat er wordt weggegooid en waarom dat verantwoord is, zodat een reviewer het ziet.`,
    );
  }
}

/* ---------------------------------------------------------------- rapport */
console.log('');
console.log('MIGRATIEPOORT — destructieve statements');
console.log('='.repeat(92));
console.log(`  migraties            ${bestanden.length}`);
console.log(`  met destructieve DDL ${inventaris.length}`);
console.log(`  basislijn t/m        ${BASISLIJN_TOT_EN_MET}`);
console.log('');

const nieuw = inventaris.filter((x) => !x.inBasislijn);
if (nieuw.length) {
  console.log('  NA DE BASISLIJN — dit gaat bij een merge op productie gebeuren:');
  for (const x of nieuw) {
    console.log(`    ${x.gemarkeerd ? 'benoemd ' : 'ONBENOEMD'}  ${x.naam}  ${x.gevonden.join(', ')}`);
  }
  console.log('');
} else {
  console.log('  Geen destructieve migratie na de basislijn.');
  console.log('');
}

console.log(`  basislijn (${inventaris.length - nieuw.length} migraties, niet meer te wijzigen):`);
for (const x of inventaris.filter((v) => v.inBasislijn)) {
  console.log(`    bekend    ${x.naam}  ${x.gevonden.join(', ')}`);
}
console.log('');
console.log(`  reden basislijn      ${BASISLIJN_REDEN}`);
console.log('');

if (bevindingen.length) {
  console.log('='.repeat(92));
  for (const b of bevindingen) console.log(`  FAIL  ${b}`);
  console.log('');
  console.log('EINDOORDEEL MIGRATIEPOORT = FAIL');
  process.exit(1);
}

console.log('='.repeat(92));
console.log('EINDOORDEEL MIGRATIEPOORT = PASS');
