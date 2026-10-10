/* ============================================================================
   VIBE ENERGY — HTTP-QA TEGEN HET ECHTE HOSTGEDRAG
   ----------------------------------------------------------------------------
   De poort in audit.mjs toetst bestanden. Dit script toetst URL's, tegen een
   lokale Caddy met exact de railpack-staticfile-configuratie die op Railway
   draait (`try_files {path} {path}.html {path}/index.html`, foutpagina via
   handle_errors). Daarmee is dit de laatste controle vóór de release: wat de
   bezoeker opvraagt, komt dat ook terug.

   Getoetst wordt:
     · elke INDEX-route geeft 200 en levert de verwachte canonical
     · elke NOINDEX-stub geeft 200 met noindex en een canonical naar INDEX
     · een steekproef PENDING-routes geeft 404
     · een onbestaande URL geeft 404 met de eigen foutpagina
     · de .html-vorm van een route is bereikbaar maar canonicaliseert naar de
       extensieloze vorm (geen tweede indexeerbare URL)
     · de afsluitende schuine streep bestaat niet, zoals gemeten
     · sitemap.xml en robots.txt zijn bereikbaar en geldig

   Draaien:  QA_BASIS=http://127.0.0.1:18751 node scripts/seo/qa-http.mjs
   ============================================================================ */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST, url } from './lib/paden.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');
const BASIS = (process.env.QA_BASIS || 'http://127.0.0.1:18751').replace(/\/$/, '');

const reg = JSON.parse(readFileSync(resolve(wortel, 'data', 'seo', 'routes.json'), 'utf8'));
const indexRoutes = reg.routes.filter((r) => r.staat === 'INDEX');
const noindexRoutes = reg.routes.filter((r) => r.staat === 'NOINDEX');
const pendingRoutes = reg.routes.filter((r) => r.staat === 'PENDING');

const fouten = [];
const tellingen = {};
function tel(k) { tellingen[k] = (tellingen[k] || 0) + 1; }

async function haal(pad) {
  const r = await fetch(`${BASIS}${pad}`, { redirect: 'manual' });
  const body = r.status === 200 || r.status === 404 ? await r.text() : '';
  return { status: r.status, locatie: r.headers.get('location'), body };
}

const een = (re, s) => { const m = s.match(re); return m ? m[1] : null; };

/* --------------------------------------------------- 1 · INDEX-routes */
for (const r of indexRoutes) {
  const pad = r.route === '' ? '/' : `/${r.route}`;
  const { status, body } = await haal(pad);
  if (status !== 200) { fouten.push(`${pad}: status ${status}, verwacht 200`); continue; }
  tel('index 200');
  const canon = een(/<link rel="canonical" href="([^"]*)"/, body);
  if (canon !== url(r.route)) fouten.push(`${pad}: canonical is ${canon}, verwacht ${url(r.route)}`);
  const robots = een(/<meta name="robots" content="([^"]*)"/, body);
  if (!/^index/.test(robots || '')) fouten.push(`${pad}: robots is '${robots}'`);
  if (!/<h1/.test(body)) fouten.push(`${pad}: geen h1 in de respons`);
}

/* ------------------------------------- 2 · .html-vorm en schuine streep */
for (const r of indexRoutes.slice(0, 12)) {
  if (r.route === '') continue;
  const dot = await haal(`/${r.route}.html`);
  if (dot.status === 200) {
    tel('.html bereikbaar');
    const canon = een(/<link rel="canonical" href="([^"]*)"/, dot.body);
    if (canon !== url(r.route)) fouten.push(`/${r.route}.html: canonical is ${canon}, moet naar de extensieloze vorm wijzen`);
  }
  const slash = await haal(`/${r.route}/`);
  if (slash.status === 200) fouten.push(`/${r.route}/: geeft 200; de afsluitende schuine streep hoort niet te bestaan en zou een tweede URL zijn`);
  else tel('schuine streep 404');
}

/* ------------------------------------------------------- 3 · NOINDEX-stubs */
for (const r of noindexRoutes) {
  if (r.route === '404') continue;
  const pad = `/${r.route}`;
  const { status, body } = await haal(pad);
  if (status !== 200) { fouten.push(`${pad}: status ${status}, een stub moet 200 geven zodat oude links niet doodlopen`); continue; }
  tel('stub 200');
  const robots = een(/<meta name="robots" content="([^"]*)"/, body);
  if (!/noindex/.test(robots || '')) fouten.push(`${pad}: robots is '${robots}', verwacht noindex`);
  const canon = een(/<link rel="canonical" href="([^"]*)"/, body);
  const doel = String(canon || '').replace(`${HOST}/`, '');
  const rd = reg.routes.find((x) => x.route === doel);
  if (!rd) fouten.push(`${pad}: canonical ${canon} hoort bij geen bekende route`);
  else if (rd.staat !== 'INDEX') fouten.push(`${pad}: canonical wijst naar een ${rd.staat}-route`);
  const refresh = een(/http-equiv="refresh" content="0; url=([^"]*)"/, body);
  if (refresh !== `/${doel}`) fouten.push(`${pad}: de refresh (${refresh}) wijkt af van de canonical (/${doel})`);
}

/* -------------------------------------------- 4 · PENDING geeft echt 404 */
const steekproef = [
  ...pendingRoutes.filter((r) => r.subsoort === 'gemeente').slice(0, 6),
  ...pendingRoutes.filter((r) => r.subsoort === 'gemeente-familie').slice(0, 6),
  ...pendingRoutes.filter((r) => r.subsoort === 'provincie').slice(0, 4),
  ...pendingRoutes.filter((r) => r.subsoort === 'provincie-familie').slice(0, 4),
];
for (const r of steekproef) {
  const { status } = await haal(`/${r.route}`);
  if (status !== 404) fouten.push(`/${r.route}: PENDING-route geeft ${status}, verwacht 404`);
  else tel('pending 404');
}

/* ------------------------------------------------- 5 · foutpagina en assets */
const nep = await haal('/deze-pagina-bestaat-niet-xyz');
if (nep.status !== 404) fouten.push(`onbestaande URL geeft ${nep.status}, verwacht 404`);
else if (!/Vibe/i.test(nep.body)) fouten.push('de 404-respons bevat niet de eigen foutpagina');
else tel('404 met eigen pagina');

for (const a of ['/sitemap.xml', '/robots.txt', '/vibe/vibe.css', '/vibe/tokens.css', '/vibe/chrome.js', '/_consent.js', '/_clarity.js', '/assets/vibe-mark.svg']) {
  const { status } = await haal(a);
  if (status !== 200) fouten.push(`${a}: status ${status}, verwacht 200`);
  else tel('asset 200');
}

/* De sitemap moet exact de INDEX-set bevatten, ook via HTTP opgehaald. */
const sm = await haal('/sitemap.xml');
const locs = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (locs.length !== indexRoutes.length) fouten.push(`sitemap via HTTP heeft ${locs.length} regels, register heeft ${indexRoutes.length} INDEX-routes`);

/* ---------------------------------------------------------------- rapport */
console.log(`HTTP-QA tegen ${BASIS}`);
console.log('');
for (const [k, v] of Object.entries(tellingen).sort()) console.log(`  ${k.padEnd(28)} ${v}`);
console.log('');
if (fouten.length) {
  console.log(`FOUTEN (${fouten.length}):`);
  for (const f of fouten.slice(0, 40)) console.log(`  · ${f}`);
  if (fouten.length > 40) console.log(`  · ... en nog ${fouten.length - 40}`);
}
console.log(`HTTP-QA = ${fouten.length === 0 ? 'PASS' : 'FAIL'}`);
process.exit(fouten.length === 0 ? 0 : 1);
