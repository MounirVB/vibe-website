#!/usr/bin/env node
/* ============================================================
   PUBLIEK ARTEFACT — de allowlist die bepaalt wat de website serveert
   ------------------------------------------------------------
     node scripts/publiek-artefact.mjs              controleer (poort)
     node scripts/publiek-artefact.mjs --lijst      print de publieke set
     node scripts/publiek-artefact.mjs --intern     print wat buitenblijft
     node scripts/publiek-artefact.mjs --bouw <map> zet het artefact klaar
     node scripts/publiek-artefact.mjs --railpack   print de excludelijst

   WAAROM DIT BESTAAT

   De statische host serveerde de HELE repowortel. Gemeten op 12 oktober
   2026 gaf `https://www.vibeenergy.nl/intelligence/src/kern/db.ts`
   HTTP 200, en `/data/seo/routes.json` leverde 2,4 MB routeregister uit.
   `robots.txt` sloot die paden al uit, maar robots is CRAWLADVIES en
   geen toegangscontrole: een directe GET kreeg het bestand gewoon.

   DE ALLOWLIST IS HET CONTRACT, DE EXCLUDELIJST IS HET MECHANISME

   Hieronder staat wat publiek IS. `railpack.json` bevat een excludelijst
   die daarvan is afgeleid en bepaalt wat er in de bouwcontext belandt.
   Deze poort controleert dat die twee niet uit elkaar lopen. Dat is het
   hele punt: een nieuwe interne map die iemand morgen toevoegt, valt
   automatisch buiten de allowlist en laat deze poort FALEN totdat hij
   ook in de excludelijst staat. Een denylijst alleen zou die map stil
   publiceren.

   WAAROM GEEN VERHUIZING NAAR public/

   Dat is onderzocht en te duur gebleken. Tien generatoren schrijven hard
   naar de repowortel (genereer.mjs:66-68, sitemap.mjs:96 en :127,
   maak-projecten.mjs:628, bouw-routes.mjs:519 en de drie haal-*.mjs), twee
   scripts ENUMEREREN de wortel en zouden stil nul bestanden vinden
   (herstel-bestaand.mjs:195, bouw-routes.mjs:312), het intelligenceplatform
   leest de site ook vanaf de wortel (paginascan.ts:189, config.ts:149), en
   de CI-poort eist dat `git status` leeg is na een ketenrun. Eén fout pad
   en de keten herschrijft de wortel.

   De kopieervorm werkt omdat HTML, assets/, img/, vibe/ en de twee
   losse scripts op hetzelfde onderlinge niveau blijven staan. Daardoor
   blijven zowel de 35 pagina's met RELATIEVE paden als de 78 met
   root-absolute paden kloppen, en blijft `vibe/chrome.js:125` werken,
   dat tijdens runtime '/assets/' + bestand samenstelt. Er hoeft geen
   enkele HTML-regel herschreven te worden.
   ============================================================ */

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, rmSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const WORTEL = resolve(hier, '..');

/* ---------------- DE ALLOWLIST ---------------- */

/** Mappen die in hun geheel publiek zijn. */
export const PUBLIEKE_MAPPEN = [
  'assets',       // afbeeldingen, webp-derivaten, fonts
  'img',          // oudere afbeeldingen
  'kennis',       // 17 kennispagina's
  'regios',       // 15 regiopagina's
  'sectoren',     // 11 sectorpagina's
  'toepassingen', // 10 toepassingspagina's
  'vibe',         // vibe.css en chrome.js: de huisstijllaag
];

/**
 * Extensies die een bestand IN DE WORTEL publiek maken.
 *
 * Bewust GEEN `json`: gemeten op 12 oktober 2026 staat er geen enkel
 * publiek json-bestand in de wortel. De drie die er liggen
 * (package.json, package-lock.json, railpack.json) zijn alle drie
 * bouwconfiguratie. Door json weg te laten hoeft daar geen
 * uitzonderingslijst voor te bestaan.
 */
export const PUBLIEKE_WORTEL_EXT = [
  'html', 'css', 'js',
  'woff2', 'woff', 'ttf',
  'jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'ico',
  'mp4', 'webm',
  'xml',  // sitemap.xml
  'txt',  // robots.txt
];

/** Mappen en bestanden die NOOIT geserveerd mogen worden. */
export const INTERNE_WORTELPADEN = [
  'intelligence', // de broncode van het intelligenceplatform
  'data',         // routeregister, geo-, bewijs- en inhoudsdata
  'docs',         // interne ontwerp- en redactiedocumentatie
  'scripts',      // de generator en de poorten
  'api',          // de Express-brochuredienst (eigen Railway-service)
  '.github',      // werkstromen
  'package.json',
  'package-lock.json',
  'railpack.json',
  '.gitignore',
];

/**
 * Tweede, ONAFHANKELIJKE controle op de uitkomst.
 *
 * De allowlist hierboven werkt op mappen en extensies. Dit patroon kijkt
 * naar de bestandsnamen die er daadwerkelijk uitkomen. Twee verschillende
 * manieren om hetzelfde te verbieden, zodat een fout in de ene laag niet
 * ongemerkt door de andere glipt.
 */
const VERBODEN = [
  { patroon: /\.(ts|tsx|mts|cts)$/i, reden: 'TypeScript-broncode' },
  { patroon: /\.(mjs|cjs)$/i, reden: 'generator- en poortscripts' },
  { patroon: /\.sql$/i, reden: 'databasemigraties' },
  { patroon: /\.(md|mdx)$/i, reden: 'interne documentatie' },
  { patroon: /\.(ya?ml|toml|ini|conf)$/i, reden: 'configuratie' },
  { patroon: /\.(dump|sql\.gz|bak|tar|tgz|zip|gz)$/i, reden: 'back-up of archief' },
  { patroon: /\.(pem|key|crt|cer|p12|pfx|jks)$/i, reden: 'sleutelmateriaal' },
  { patroon: /\.(sh|bash|zsh|py|rb|pl)$/i, reden: 'uitvoerbaar script' },
  { patroon: /(^|\/)\.env/i, reden: 'omgevingsbestand' },
  { patroon: /(^|\/)\./, reden: 'dotfile of dotmap' },
  { patroon: /(^|\/)(package|package-lock|tsconfig|railpack|nixpacks)\.json$/i, reden: 'bouwconfiguratie' },
  { patroon: /\.map$/i, reden: 'sourcemap' },
  { patroon: /(^|\/)(node_modules|coverage|\.cache|backups)(\/|$)/i, reden: 'werkmap' },
  { patroon: /\.(log|lock)$/i, reden: 'log of lockfile' },
];

/* ---------------- de set bepalen ---------------- */

export function getrackteBestanden(wortel = WORTEL) {
  return execFileSync('git', ['-C', wortel, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter(Boolean);
}

export function isPubliek(pad) {
  /* Een pad met .. of een absoluut pad hoort hier nooit te komen; git
     ls-files levert dat niet. Toch weigeren, want deze functie bepaalt
     wat er naar buiten gaat. */
  if (pad.startsWith('/') || pad.split('/').includes('..') || pad.includes('\0')) return false;

  if (pad.includes('/')) return PUBLIEKE_MAPPEN.includes(pad.split('/')[0]);

  if (pad.startsWith('.')) return false;
  const ext = pad.includes('.') ? pad.split('.').pop().toLowerCase() : '';
  return PUBLIEKE_WORTEL_EXT.includes(ext);
}

export function splitsen(wortel = WORTEL) {
  const alles = getrackteBestanden(wortel);
  return {
    alles,
    publiek: alles.filter(isPubliek),
    intern: alles.filter((p) => !isPubliek(p)),
  };
}

/* ---------------- de excludelijst voor railpack ---------------- */

/**
 * Railpack sluit paden uit de BOUWCONTEXT uit (zoals .dockerignore).
 * De staticfile-provider kopieert die context naar /app en Caddy serveert
 * /app. Wat hier buiten valt, is dus niet opvraagbaar.
 *
 * De lijst is bewust EXPLICIET per intern pad en niet 'alles uitsluiten
 * en dan terugzetten'. Reden: de faalwijze. Sluit je per ongeluk te veel
 * uit met een negatiepatroon, dan bouwt de site prima maar mist hij
 * bestanden — dat is een stille 404 op productie. Sluit je per ongeluk
 * te weinig uit, dan staat er een intern bestand open. Dat tweede is
 * even onwenselijk, maar het wordt door `controleer()` hieronder
 * gegarandeerd gevonden, want de ALLOWLIST is daar de maatstaf. De
 * eerste faalwijze zou de site breken zonder dat een poort het ziet.
 */
export function railpackExclude() {
  /* Of iets een map is, bepaalt de SCHIJF en niet de naam. `.github` is
     een map met een punt erin en `package.json` een bestand; een test op
     de naam zet daar precies het verkeerde patroon op. */
  const isMap = (p) => {
    try { return statSync(resolve(WORTEL, p)).isDirectory(); } catch { return false; }
  };
  const uit = [];
  for (const p of INTERNE_WORTELPADEN) {
    uit.push(p);
    if (isMap(p)) uit.push(`${p}/**`);
  }
  return uit.sort();
}

/* ---------------- poort ---------------- */

function controleer() {
  const { alles, publiek, intern } = splitsen();
  const fouten = [];
  const opmerkingen = [];

  console.log('');
  console.log('PUBLIEK ARTEFACT');
  console.log('='.repeat(92));
  console.log('');
  console.log(`  getrackte bestanden   ${alles.length}`);
  console.log(`  publiek               ${publiek.length}`);
  console.log(`  intern                ${intern.length}`);
  console.log('');

  /* 1. Niets verboden in de publieke set. */
  const besmet = [];
  for (const pad of publiek) {
    for (const v of VERBODEN) {
      if (v.patroon.test(pad)) besmet.push(`${pad} (${v.reden})`);
    }
  }
  if (besmet.length) {
    fouten.push(`${besmet.length} verboden bestand(en) in de publieke set`);
    besmet.slice(0, 15).forEach((b) => console.log(`  VERBODEN  ${b}`));
  }
  console.log(`  ${besmet.length ? 'FAIL' : 'PASS'}  geen verboden bestandssoort in de publieke set`);

  /* 2. Elk intern wortelpad staat ook echt buiten de publieke set. */
  const lekken = [];
  for (const p of INTERNE_WORTELPADEN) {
    const treffers = publiek.filter((q) => q === p || q.startsWith(`${p}/`));
    if (treffers.length) lekken.push(`${p}: ${treffers.length}`);
  }
  if (lekken.length) fouten.push(`interne paden in de publieke set: ${lekken.join(', ')}`);
  console.log(`  ${lekken.length ? 'FAIL' : 'PASS'}  elk intern wortelpad valt buiten de publieke set`);

  /* 3. Elke interne map is gedekt door de excludelijst. Dit is de
        controle die een NIEUWE interne map vindt. */
  const exclude = railpackExclude();
  const dekt = (pad) => exclude.some((e) => {
    const basis = e.replace(/\/\*\*$/, '');
    return pad === basis || pad.startsWith(`${basis}/`);
  });
  const ongedekt = intern.filter((p) => !dekt(p));
  if (ongedekt.length) {
    const tops = [...new Set(ongedekt.map((p) => (p.includes('/') ? `${p.split('/')[0]}/` : p)))];
    fouten.push(`${ongedekt.length} intern bestand(en) niet gedekt door de excludelijst: ${tops.slice(0, 8).join(' ')}`);
    tops.slice(0, 10).forEach((t) => console.log(`  ONGEDEKT  ${t}  <- voeg toe aan INTERNE_WORTELPADEN`));
  }
  console.log(`  ${ongedekt.length ? 'FAIL' : 'PASS'}  de excludelijst dekt elk intern bestand`);

  /* 4. railpack.json loopt niet uit de pas met de allowlist. */
  const rpPad = resolve(WORTEL, 'railpack.json');
  if (!existsSync(rpPad)) {
    fouten.push('railpack.json ontbreekt');
    console.log('  FAIL  railpack.json bestaat');
  } else {
    const rp = JSON.parse(readFileSync(rpPad, 'utf8'));
    const gewenst = JSON.stringify(railpackExclude());
    const aanwezig = JSON.stringify([...(rp.exclude ?? [])].sort());
    const gelijk = gewenst === aanwezig;
    if (!gelijk) {
      fouten.push('railpack.json exclude wijkt af van de allowlist');
      console.log('  FAIL  railpack.json exclude klopt met de allowlist');
      console.log(`        verwacht: ${gewenst}`);
      console.log(`        aanwezig: ${aanwezig}`);
    } else {
      console.log('  PASS  railpack.json exclude klopt met de allowlist');
    }
    if (rp.provider !== 'staticfile') {
      fouten.push(`railpack provider is '${rp.provider}', verwacht 'staticfile'`);
    }
  }

  /* 5. Vijandige bestandsnamen. git ls-files levert geen .. op, maar
        een symlink die de wortel verlaat wel een pad dat erin lijkt te
        liggen. Caddy volgt symlinks. */
  const symlinks = [];
  for (const pad of publiek) {
    const abs = resolve(WORTEL, pad);
    try {
      if (!lstatSync(abs).isSymbolicLink()) continue;
      const doel = resolve(dirname(abs), readlinkSync(abs));
      const buiten = !doel.startsWith(`${WORTEL}/`);
      symlinks.push(`${pad} -> ${doel}${buiten ? '  (VERLAAT DE WORTEL)' : ''}`);
    } catch { /* verdwenen bestand; stap 6 vindt dat */ }
  }
  if (symlinks.length) {
    fouten.push(`${symlinks.length} symlink(s) in de publieke set`);
    symlinks.slice(0, 10).forEach((s) => console.log(`  SYMLINK   ${s}`));
  }
  console.log(`  ${symlinks.length ? 'FAIL' : 'PASS'}  geen symlinks in de publieke set`);

  const raar = publiek.filter((p) => /[\r\n\t]|\.\.|^\/|\/\/|[\x00-\x1f]/.test(p));
  if (raar.length) {
    fouten.push(`${raar.length} pad(en) met verdachte tekens`);
    raar.slice(0, 10).forEach((r) => console.log(`  VERDACHT  ${JSON.stringify(r)}`));
  }
  console.log(`  ${raar.length ? 'FAIL' : 'PASS'}  geen padtraversal of stuurtekens in de publieke set`);

  /* 6. Elk publiek bestand bestaat echt en is een gewoon bestand. */
  const stuk = publiek.filter((p) => {
    try { return !statSync(resolve(WORTEL, p)).isFile(); } catch { return true; }
  });
  if (stuk.length) {
    fouten.push(`${stuk.length} publiek bestand ontbreekt of is geen gewoon bestand`);
    stuk.slice(0, 10).forEach((s) => console.log(`  ONTBREEKT ${s}`));
  }
  console.log(`  ${stuk.length ? 'FAIL' : 'PASS'}  elk publiek pad is een bestaand gewoon bestand`);

  /* 7. De dingen die een bezoeker echt nodig heeft. */
  const MOET = ['index.html', '404.html', 'sitemap.xml', 'robots.txt', 'vibe/vibe.css', 'vibe/chrome.js'];
  const mist = MOET.filter((m) => !publiek.includes(m));
  if (mist.length) fouten.push(`onmisbaar bestand niet in de publieke set: ${mist.join(', ')}`);
  console.log(`  ${mist.length ? 'FAIL' : 'PASS'}  de onmisbare bestanden zitten erin (${MOET.length} gecontroleerd)`);

  /* 8. Gewicht, als observatie. Niet blokkerend: het afslanken van
        ongerefereerde wortel-assets is een eigenaarsbesluit, niet een
        beveiligingsvraag. */
  let bytesPubliek = 0;
  let bytesIntern = 0;
  for (const p of publiek) { try { bytesPubliek += statSync(resolve(WORTEL, p)).size; } catch { /* stap 6 */ } }
  for (const p of intern) { try { bytesIntern += statSync(resolve(WORTEL, p)).size; } catch { /* genegeerd */ } }
  const mb = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`;
  opmerkingen.push(`publiek ${mb(bytesPubliek)}, intern ${mb(bytesIntern)} blijft achter`);

  console.log('');
  opmerkingen.forEach((o) => console.log(`  opmerking  ${o}`));
  console.log('');
  console.log('='.repeat(92));
  if (fouten.length) {
    fouten.forEach((f) => console.log(`FAIL  ${f}`));
    console.log('');
    console.log('EINDOORDEEL PUBLIEK ARTEFACT = FAIL');
    return 1;
  }
  console.log('EINDOORDEEL PUBLIEK ARTEFACT = PASS');
  console.log(`${publiek.length} bestanden publiek, ${intern.length} intern en niet opvraagbaar.`);
  return 0;
}

/* ---------------- artefact bouwen (voor lokale verificatie) ---------------- */

function bouw(doel) {
  const uit = resolve(doel);
  if (!uit.startsWith('/') || uit === '/' || uit === WORTEL) {
    throw new Error(`weiger te bouwen naar ${uit}`);
  }
  const { publiek } = splitsen();
  rmSync(uit, { recursive: true, force: true });
  mkdirSync(uit, { recursive: true });
  for (const pad of publiek) {
    const bron = resolve(WORTEL, pad);
    const bestemming = resolve(uit, pad);
    mkdirSync(dirname(bestemming), { recursive: true });
    cpSync(bron, bestemming, { dereference: false });
  }
  console.log(`${publiek.length} bestanden gekopieerd naar ${uit}`);
  return 0;
}

/* ---------------- ingang ---------------- */

const argv = process.argv.slice(2);
const heeft = (n) => argv.includes(`--${n}`);
const waarde = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? undefined : argv[i + 1];
};

try {
  if (heeft('lijst')) {
    splitsen().publiek.forEach((p) => console.log(p));
    process.exit(0);
  } else if (heeft('intern')) {
    splitsen().intern.forEach((p) => console.log(p));
    process.exit(0);
  } else if (heeft('railpack')) {
    console.log(JSON.stringify(railpackExclude(), null, 2));
    process.exit(0);
  } else if (heeft('bouw')) {
    const doel = waarde('bouw');
    if (!doel) throw new Error('gebruik: --bouw <map>');
    process.exit(bouw(doel));
  } else {
    process.exit(controleer());
  }
} catch (e) {
  console.error(`PUBLIEK ARTEFACT AFGEBROKEN: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
