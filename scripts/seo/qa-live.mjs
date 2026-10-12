/* ============================================================================
   VIBE ENERGY — LIVE VERIFICATIE NA DE UITROL
   ----------------------------------------------------------------------------
   qa-http.mjs toetst een lokale Caddy met de railpack-configuratie. Dit script
   toetst de ECHTE host, na de deploy. Dat is iets anders: tussen die twee
   zitten Railway, de excludelijst uit railpack.json, een CDN-laag en DNS.

   Getoetst tegen https://www.vibeenergy.nl (of QA_LIVE_BASIS):

     · elke INDEX-route geeft 200 en draagt de canonical van zichzelf
     · de 96 URL's van vóór deze release geven nog steeds 200   <- regressie
     · elke PENDING-steekproef geeft 404 (geen stil gepubliceerde pagina)
     · de sitemapindex en elk deelbestand geven 200 en kloppen met het register
     · robots.txt wijst naar de sitemap op de www-host
     · interne paden geven 404                                  <- geen lek
     · de apex stuurt met 301 door naar www

   Draaien: node scripts/seo/qa-live.mjs [--snel]
            --snel doet een steekproef in plaats van alle routes.
   ============================================================================ */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST, url } from './lib/paden.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');
const BASIS = (process.env.QA_LIVE_BASIS || HOST).replace(/\/$/, '');
const SNEL = process.argv.includes('--snel');
const GELIJKTIJDIG = Number(process.env.QA_LIVE_PARALLEL || 8);

const reg = JSON.parse(readFileSync(resolve(wortel, 'data', 'seo', 'routes.json'), 'utf8'));
const indexRoutes = reg.routes.filter((r) => r.staat === 'INDEX');
const pendingRoutes = reg.routes.filter((r) => r.staat === 'PENDING');

const fouten = [];
const tellingen = {};
const tel = (k, n = 1) => (tellingen[k] = (tellingen[k] || 0) + n);

async function haal(pad, { volg = 'follow' } = {}) {
  const u = pad.startsWith('http') ? pad : `${BASIS}${pad}`;
  for (let poging = 1; poging <= 3; poging++) {
    try {
      const r = await fetch(u, { redirect: volg, headers: { 'user-agent': 'vibe-qa-live/1.0' } });
      const body = r.headers.get('content-type')?.includes('text') || /xml|json/.test(r.headers.get('content-type') || '')
        ? await r.text()
        : '';
      return { status: r.status, body, locatie: r.headers.get('location') };
    } catch (e) {
      if (poging === 3) return { status: 0, body: '', fout: String(e.message) };
      await new Promise((k) => setTimeout(k, 400 * poging));
    }
  }
}

/** Draait een lijst taken met een vaste gelijktijdigheid. */
async function perPloeg(items, fn) {
  let i = 0;
  const werkers = Array.from({ length: Math.min(GELIJKTIJDIG, items.length) }, async () => {
    while (i < items.length) {
      const eigen = items[i++];
      await fn(eigen);
    }
  });
  await Promise.all(werkers);
}

const een = (re, s) => { const m = s.match(re); return m ? m[1] : null; };

/* -------------------------------------------- 1. alle INDEX-routes 200 */
/* De 96 URL's van vóór deze release apart gemerkt, want een regressie
   daarop is erger dan een nieuwe pagina die het niet doet. */
const bestaandeRoutes = new Set(indexRoutes.filter((r) => r.bestaand).map((r) => r.route));

const teToetsen = SNEL
  ? indexRoutes.filter((r, i) => r.bestaand || i % 11 === 0)
  : indexRoutes;

await perPloeg(teToetsen, async (r) => {
  const pad = r.route === '' ? '/' : `/${r.route}`;
  const { status, body } = await haal(pad);
  const oud = bestaandeRoutes.has(r.route);
  if (status !== 200) {
    fouten.push(`${pad}: status ${status}, verwacht 200${oud ? '  [REGRESSIE — bestond al vóór deze release]' : ''}`);
    return;
  }
  tel(oud ? 'bestaande URL 200' : 'nieuwe URL 200');
  const canon = een(/<link rel="canonical" href="([^"]+)"/, body);
  if (canon !== url(r.route)) fouten.push(`${pad}: canonical is ${canon}, verwacht ${url(r.route)}`);
  else tel('canonical klopt');
  if (/<meta name="robots"[^>]*noindex/i.test(body)) fouten.push(`${pad}: draagt noindex terwijl de route op INDEX staat`);
});

/* ------------------------------------------- 2. PENDING blijft onzichtbaar */
const pendingSteekproef = pendingRoutes.filter((_, i) => i % 283 === 0).slice(0, 18);
await perPloeg(pendingSteekproef, async (r) => {
  const { status } = await haal(`/${r.route}`);
  if (status !== 404) fouten.push(`PENDING /${r.route}: status ${status}, verwacht 404 — stil gepubliceerd?`);
  else tel('PENDING 404');
});

/* ------------------------------------------------------ 3. de sitemapketen */
const sm = await haal('/sitemap.xml');
if (sm.status !== 200) fouten.push(`/sitemap.xml: status ${sm.status}`);
else {
  tel('sitemapindex 200');
  const locs = (s) => [...s.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  let alle = [];
  if (/<sitemapindex\b/.test(sm.body)) {
    for (const d of locs(sm.body)) {
      const r = await haal(d.replace(/^https?:\/\/[^/]+/, ''));
      if (r.status !== 200) { fouten.push(`sitemapdeel ${d}: status ${r.status}`); continue; }
      tel('sitemapdeel 200');
      alle.push(...locs(r.body));
    }
  } else {
    alle = locs(sm.body);
  }
  const verwacht = new Set(indexRoutes.map((r) => url(r.route)));
  const inSm = new Set(alle);
  for (const v of verwacht) if (!inSm.has(v)) fouten.push(`live sitemap mist ${v}`);
  for (const l of inSm) if (!verwacht.has(l)) fouten.push(`live sitemap heeft een URL die niet op INDEX staat: ${l}`);
  if (alle.length === verwacht.size) tel('sitemappariteit', alle.length);
}

/* ------------------------------------------------------------ 4. robots.txt */
const rb = await haal('/robots.txt');
if (rb.status !== 200) fouten.push(`/robots.txt: status ${rb.status}`);
else if (!rb.body.includes(`${HOST}/sitemap.xml`)) fouten.push('robots.txt verwijst niet naar de sitemap op www');
else tel('robots.txt klopt');

/* ---------------------------------------- 5. geen intern bestand opvraagbaar */
const INTERN = [
  '/data/seo/routes.json',
  '/data/seo/publicatiebesluit.json',
  '/data/bewijs/bedrijfstakken.json',
  '/scripts/seo/genereer.mjs',
  '/scripts/publiek-artefact.mjs',
  '/docs/seo-architectuur.md',
  '/intelligence/src/kern/db.ts',
  '/railpack.json',
  '/package.json',
  '/.github/workflows/poort.yml',
];
await perPloeg(INTERN, async (p) => {
  const { status } = await haal(p);
  if (status !== 404) fouten.push(`INTERN ${p}: status ${status}, verwacht 404 — dit bestand is publiek opvraagbaar`);
  else tel('intern pad 404');
});

/* ------------------------------------------------------------- 6. de apex */
const apex = await haal('https://vibeenergy.nl/', { volg: 'manual' });
if (![301, 308].includes(apex.status)) fouten.push(`apex vibeenergy.nl geeft ${apex.status}, verwacht 301`);
else if (!String(apex.locatie || '').startsWith('https://www.vibeenergy.nl')) {
  fouten.push(`apex stuurt door naar ${apex.locatie}, verwacht www.vibeenergy.nl`);
} else tel('apex 301 naar www');

/* ---------------------------------------------------------------- rapport */
console.log(`LIVE VERIFICATIE tegen ${BASIS}${SNEL ? '  (steekproef)' : ''}`);
console.log('');
for (const [k, v] of Object.entries(tellingen).sort()) console.log(`  ${k.padEnd(28)} ${v}`);
console.log('');
if (fouten.length) {
  const regressies = fouten.filter((f) => f.includes('REGRESSIE'));
  if (regressies.length) {
    console.log(`REGRESSIES OP BESTAANDE URL'S (${regressies.length}) — dit is het ergste wat hier kan staan:`);
    for (const f of regressies) console.log(`  · ${f}`);
    console.log('');
  }
  console.log(`FOUTEN (${fouten.length}):`);
  for (const f of fouten.slice(0, 40)) console.log(`  · ${f}`);
  if (fouten.length > 40) console.log(`  · ... en nog ${fouten.length - 40}`);
}
console.log(`LIVE VERIFICATIE = ${fouten.length ? 'FAIL' : 'PASS'}`);
if (fouten.length) process.exit(1);
