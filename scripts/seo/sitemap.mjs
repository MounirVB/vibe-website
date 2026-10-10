/* ============================================================================
   VIBE ENERGY — SITEMAP EN ROBOTS
   ----------------------------------------------------------------------------
   De sitemap wordt uit het routeregister gebouwd, niet uit de bestandenlijst.
   Gevolg: een PENDING-route kan er per constructie niet in staan.

   LASTMOD IS ECHT.
   De opdracht eist een werkelijke wijzigingsdatum. Daarom:
   · wijkt het bestand in de werkboom af van HEAD, dan is vandaag de
     wijzigingsdatum — het bestand is in deze release aangepast;
   · is het gelijk aan HEAD, dan de commitdatum van dat bestand uit git.
   Er wordt nergens een datum verzonnen en nergens pauschal "vandaag" gezet.

   PRIORITY EN CHANGEFREQ STAAN ER NIET IN.
   De oude sitemap droeg <priority>. Google negeert dat veld en Bing
   documenteert het als niet-gebruikt; een zelfverzonnen prioriteitsgetal is
   ruis die suggereert dat er een meting achter zit.

   Draaien: node scripts/seo/sitemap.mjs
   ============================================================================ */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST, url, bestand } from './lib/paden.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');

const reg = JSON.parse(readFileSync(resolve(wortel, 'data', 'seo', 'routes.json'), 'utf8'));
const VANDAAG = process.env.SITEMAP_DATUM || new Date().toISOString().slice(0, 10);

function git(args) {
  try {
    return execFileSync('git', args, { cwd: wortel, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function afwijkendVanHead(relpad) {
  try {
    execFileSync('git', ['diff', '--quiet', 'HEAD', '--', relpad], { cwd: wortel, stdio: 'ignore' });
    return false;
  } catch {
    return true; // exitcode != 0 betekent: er is verschil, of het bestand is nieuw
  }
}

function isGevolgd(relpad) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', relpad], { cwd: wortel, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function laatsteWijziging(relpad) {
  /* Een nieuw bestand is vandaag gemaakt; git weet er nog niets van, dus
     `git diff HEAD` zou misleidend "geen verschil" melden. */
  if (!isGevolgd(relpad)) return { datum: VANDAAG, herkomst: 'nieuw in deze release' };
  if (afwijkendVanHead(relpad)) return { datum: VANDAAG, herkomst: 'gewijzigd in deze release' };
  const d = git(['log', '-1', '--format=%cs', '--', relpad]);
  if (d) return { datum: d, herkomst: 'git commitdatum' };
  return { datum: VANDAAG, herkomst: 'geen git-historie' };
}

const index = reg.routes.filter((r) => r.staat === 'INDEX');
const regels = [];
const ontbrekend = [];
const herkomsten = {};

for (const r of index.sort((a, b) => a.route.localeCompare(b.route))) {
  const relpad = bestand(r.route);
  if (!existsSync(resolve(wortel, relpad))) {
    ontbrekend.push({ route: r.route, bestand: relpad });
    continue;
  }
  const { datum, herkomst } = laatsteWijziging(relpad);
  herkomsten[herkomst] = (herkomsten[herkomst] || 0) + 1;
  regels.push(`  <url>\n    <loc>${url(r.route)}</loc>\n    <lastmod>${datum}</lastmod>\n  </url>`);
}

if (ontbrekend.length) {
  console.error('FATAAL — INDEX-routes zonder bestand. De generator is niet gedraaid of hij faalde:');
  for (const o of ontbrekend) console.error(`  ${o.route} -> ${o.bestand}`);
  process.exit(1);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${regels.join('\n')}
</urlset>
`;
writeFileSync(resolve(wortel, 'sitemap.xml'), xml);

/* robots.txt — de sitemapverwijzing moet naar de host die 200 geeft, en de
   bouwinvoer hoort geen crawlbudget te kosten. De staticfile-host serveert de
   hele repowortel, dus data/, scripts/ en docs/ zijn publiek opvraagbaar. Daar
   staat niets geheims in, maar het is samen enkele megabytes JSON en Markdown
   die geen zoekresultaat horen te worden. */
const robots = `User-agent: *
Allow: /

# Bouwinvoer, geen inhoud. Deze mappen worden door de statische host wel
# geserveerd maar horen niet gecrawld te worden:
#   data/    het routeregister, de geo- en bewijsdata en de inhoudsbestanden
#   scripts/ de generator en de poorten
#   docs/    interne ontwerp- en redactiedocumentatie
Disallow: /data/
Disallow: /scripts/
Disallow: /docs/
Disallow: /api/

# Sitemap op de host die zelf 200 geeft. De apex vibeenergy.nl stuurt met 301
# door naar www; een sitemapverwijzing naar een doorverwijzing is onnodig.
Sitemap: ${HOST}/sitemap.xml
`;
writeFileSync(resolve(wortel, 'robots.txt'), robots);

console.log(`sitemap.xml : ${regels.length} URL's`);
console.log(`robots.txt  : sitemap op ${HOST}`);
console.log('lastmod-herkomst:');
for (const [k, v] of Object.entries(herkomsten)) console.log(`  ${k.padEnd(32)} ${v}`);
