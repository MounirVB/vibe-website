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
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, rmSync } from 'node:fs';
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

/* Het vingerafdrukgrootboek is de AUTORITEIT voor gegenereerde routes.

   Zonder dit stond `lastmod` op VANDAAG voor elk bestand dat van HEAD
   afweek, en week elk bestand af zodra de generator zijn eigen datum in de
   JSON-LD had bijgewerkt. Dat is rond: de klok verandert de pagina, de
   veranderde pagina verandert de lastmod.

   Het grootboek bepaalt de datum uit de inhoud (zie lib/vingerafdruk.mjs).
   Staat een route erin, dan is dat de datum, en dan zeggen `lastmod` en
   `dateModified` hetzelfde. Bestaande, met de hand geschreven pagina's staan
   niet in het grootboek; die houden de git-weg. */
const vingerPad = resolve(wortel, 'data', 'seo', 'vingerafdrukken.json');
const vingers = existsSync(vingerPad) ? JSON.parse(readFileSync(vingerPad, 'utf8')).routes || {} : {};

function laatsteWijziging(relpad, route) {
  const v = vingers[route];
  if (v?.gewijzigd) return { datum: v.gewijzigd, herkomst: 'inhoudsvingerafdruk' };
  /* Een nieuw bestand is vandaag gemaakt; git weet er nog niets van, dus
     `git diff HEAD` zou misleidend "geen verschil" melden. */
  if (!isGevolgd(relpad)) return { datum: VANDAAG, herkomst: 'nieuw in deze release' };
  if (afwijkendVanHead(relpad)) return { datum: VANDAAG, herkomst: 'gewijzigd in deze release' };
  const d = git(['log', '-1', '--format=%cs', '--', relpad]);
  if (d) return { datum: d, herkomst: 'git commitdatum' };
  return { datum: VANDAAG, herkomst: 'geen git-historie' };
}

/* ====================================================== SITEMAPARCHITECTUUR

   RELEASE 3.1 — EEN SITEMAPINDEX MET TWEE GROEPEN.

   Met 96 URL's was één bestand goed. Met 430 nog steeds: de limiet van het
   protocol is 50.000 URL's en 50 MB, en daar zitten we ver onder. Splitsen is
   hier dus GEEN technische noodzaak, en dat moet gezegd worden voordat iemand
   denkt dat het dat wel is.

   De reden om het tóch te doen is meetbaarheid. Search Console rapporteert
   dekking PER SITEMAP. Met één bestand zie je straks "430 ingediend, N
   geïndexeerd" en weet je niet of de 334 nieuwe regiopagina's het doen of dat
   het de bestaande 96 zijn. Met twee groepen is dat één blik. Precies de
   vraag die deze release oproept.

   De groepen volgen de boom en niet het toeval:
     sitemap-nationaal.xml  alles buiten /regios  (oplossingen, sectoren,
                            toepassingen, kennis, projecten, juridisch)
     sitemap-regios.xml     /regios en alles eronder (provincies, gemeenten)

   `sitemap.xml` blijft het adres dat robots.txt noemt en dat bij Search
   Console is ingediend; hij is nu de INDEX. Dat is een geldige waarde voor
   dat bestand en vraagt geen nieuwe indiening.

   De drempel staat op MAX_PER_BESTAND zodat een groep die ooit te groot
   wordt vanzelf in genummerde delen uiteenvalt in plaats van stil het
   protocol te overtreden. */
const MAX_PER_BESTAND = 10000;

const index = reg.routes.filter((r) => r.staat === 'INDEX');
const ontbrekend = [];
const herkomsten = {};
const perGroep = new Map();

for (const r of index.sort((a, b) => a.route.localeCompare(b.route))) {
  const relpad = bestand(r.route);
  if (!existsSync(resolve(wortel, relpad))) {
    ontbrekend.push({ route: r.route, bestand: relpad });
    continue;
  }
  const { datum, herkomst } = laatsteWijziging(relpad, r.route);
  herkomsten[herkomst] = (herkomsten[herkomst] || 0) + 1;
  const groep = r.soort === 'regio' ? 'regios' : 'nationaal';
  if (!perGroep.has(groep)) perGroep.set(groep, []);
  perGroep.get(groep).push(`  <url>\n    <loc>${url(r.route)}</loc>\n    <lastmod>${datum}</lastmod>\n  </url>`);
}

if (ontbrekend.length) {
  console.error('FATAAL — INDEX-routes zonder bestand. De generator is niet gedraaid of hij faalde:');
  for (const o of ontbrekend) console.error(`  ${o.route} -> ${o.bestand}`);
  process.exit(1);
}

/* De deelbestanden. Vaste groepsvolgorde, zodat de uitvoer deterministisch is
   en een diff leesbaar blijft. */
const GROEPVOLGORDE = ['nationaal', 'regios'];
const deelbestanden = [];
let totaalUrls = 0;

for (const groep of GROEPVOLGORDE) {
  const regels = perGroep.get(groep) || [];
  if (!regels.length) continue;
  totaalUrls += regels.length;
  const delen = [];
  for (let i = 0; i < regels.length; i += MAX_PER_BESTAND) delen.push(regels.slice(i, i + MAX_PER_BESTAND));
  delen.forEach((deel, i) => {
    const naam = delen.length === 1 ? `sitemap-${groep}.xml` : `sitemap-${groep}-${i + 1}.xml`;
    writeFileSync(
      resolve(wortel, naam),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${deel.join('\n')}\n</urlset>\n`
    );
    /* De lastmod van een deelbestand is de nieuwste lastmod die erin staat.
       Niet de klok: anders hangt de index alsnog aan de tijd. */
    const nieuwste = deel
      .map((rg) => (rg.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1])
      .filter(Boolean)
      .sort()
      .pop();
    deelbestanden.push({ naam, aantal: deel.length, lastmod: nieuwste });
  });
}

/* Oude deelbestanden opruimen: een groep die krimpt mag geen weesbestand
   achterlaten dat nog in de index van gisteren stond. */
const actueel = new Set(deelbestanden.map((d) => d.naam));
for (const f of readdirSync(wortel)) {
  if (!/^sitemap-[a-z0-9-]+\.xml$/.test(f) || actueel.has(f)) continue;
  rmSync(resolve(wortel, f));
  console.log(`opgeruimd (geen groep meer): ${f}`);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${deelbestanden
  .map((d) => `  <sitemap>\n    <loc>${HOST}/${d.naam}</loc>\n    <lastmod>${d.lastmod}</lastmod>\n  </sitemap>`)
  .join('\n')}
</sitemapindex>
`;
writeFileSync(resolve(wortel, 'sitemap.xml'), xml);

/* robots.txt — de sitemapverwijzing moet naar de host die 200 geeft, en de
   bouwinvoer hoort geen crawlbudget te kosten. De staticfile-host serveert de
   hele repowortel, dus data/, scripts/, docs/ en intelligence/ zijn publiek
   opvraagbaar. Daar staat niets geheims in — .env en backups/ zijn genegeerd en
   de geheimenscan draait in CI — maar het is samen enkele megabytes JSON,
   Markdown en broncode die geen zoekresultaat horen te worden.

   LET OP: dit is GEEN toegangsbeperking. robots.txt vraagt een crawler iets;
   het houdt niemand tegen. De beveiliging van het platform zit in de
   authenticatie van het dashboard en in de rechten op de database, niet hier. */
const robots = `User-agent: *
Allow: /

# Bouwinvoer, geen inhoud. Deze mappen worden door de statische host wel
# geserveerd maar horen niet gecrawld te worden:
#   data/         het routeregister, de geo- en bewijsdata en de inhoudsbestanden
#   scripts/      de generator en de poorten
#   docs/         interne ontwerp- en redactiedocumentatie
#   intelligence/ de broncode van het intelligenceplatform
Disallow: /data/
Disallow: /scripts/
Disallow: /docs/
Disallow: /api/
Disallow: /intelligence/

# Sitemap op de host die zelf 200 geeft. De apex vibeenergy.nl stuurt met 301
# door naar www; een sitemapverwijzing naar een doorverwijzing is onnodig.
Sitemap: ${HOST}/sitemap.xml
`;
writeFileSync(resolve(wortel, 'robots.txt'), robots);

console.log(`sitemap.xml : sitemapindex met ${deelbestanden.length} deelbestand(en), samen ${totaalUrls} URL's`);
for (const d of deelbestanden) console.log(`  ${d.naam.padEnd(26)} ${String(d.aantal).padStart(5)} URL's · lastmod ${d.lastmod}`);
console.log(`robots.txt  : sitemap op ${HOST}`);
console.log('lastmod-herkomst:');
for (const [k, v] of Object.entries(herkomsten)) console.log(`  ${k.padEnd(32)} ${v}`);
