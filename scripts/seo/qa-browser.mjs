/* ============================================================================
   VIBE ENERGY — BROWSER-QA
   ----------------------------------------------------------------------------
   Wat een bestandscontrole niet kan zien: of de pagina in een echte browser
   klopt. Per pagina en per breedte wordt gemeten:

     · horizontaal schuiven        documentElement.scrollWidth > innerWidth
     · de chrome is geinjecteerd   chrome.js bouwt header en footer; zonder dat
                                   heeft de pagina geen navigatie
     · de noscript-fallback is weg chrome.js hoort hem te verwijderen, anders
                                   staat de navigatie er twee keer
     · consolefouten en mislukte verzoeken
     · kruimelpad aanwezig en zichtbaar
     · de primaire CTA is aanklikbaar en groot genoeg om te raken
     · afbeeldingen die niet laden

   Playwright-core komt uit een naburig project; er wordt niets geinstalleerd.

   Draaien:
     QA_BASIS=http://127.0.0.1:18751 \
     PW=/Users/mounirvanbinsbergen/projects/vibehome/node_modules/playwright-core \
     node scripts/seo/qa-browser.mjs
   ============================================================================ */
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');
const BASIS = (process.env.QA_BASIS || 'http://127.0.0.1:18751').replace(/\/$/, '');
const PW = process.env.PW || '/Users/mounirvanbinsbergen/projects/vibehome/node_modules/playwright-core';
const UIT = process.env.QA_UIT || '/private/tmp/claude-501/-Users-mounirvanbinsbergen/a3e2e4e2-cf52-46a5-843a-66b2c85630a9/scratchpad/qa-schermen';

/* playwright-core exporteert geen named ESM-binding vanuit index.js; de
   module-namespace komt op default te staan. Beide vormen afvangen. */
const pw = await import(`${PW}/index.mjs`).catch(() => import(`${PW}/index.js`));
const chromium = pw.chromium || (pw.default && pw.default.chromium);
if (!chromium) throw new Error('playwright-core geeft geen chromium; controleer het pad in PW');

const reg = JSON.parse(readFileSync(resolve(wortel, 'data', 'seo', 'routes.json'), 'utf8'));
const indexRoutes = reg.routes.filter((r) => r.staat === 'INDEX');

/* Een representatieve doorsnede: één pagina per paginatype, plus de twee
   zwaarste bestaande pagina's als regressiecontrole op de chrome-wijziging. */
function kies() {
  const pak = (fn) => indexRoutes.find(fn);
  const kandidaten = [
    { route: '', waarom: 'homepage — regressie op chrome.js' },
    { route: 'systeem-energieopslag', waarom: 'bestaande oplossingspagina — regressie op chrome.js' },
    { route: 'projecten', waarom: 'bestaande overzichtspagina met filter' },
    { route: 'contact', waarom: 'conversiepagina met formulier' },
    { route: 'netcongestie', waarom: 'nieuwe nationale oplossingspagina' },
    { route: 'kennis', waarom: 'nieuwe hub' },
    { route: 'subsidies', waarom: 'nieuwe subsidiepagina' },
    { route: 'regios', waarom: 'regiowortel' },
    { route: 'regios/gelderland', waarom: 'provinciehub — één map diep' },
    { route: 'regios/gelderland/duiven', waarom: 'gemeentehub — twee mappen diep' },
    pak((r) => r.subsoort === 'sector'),
    pak((r) => r.subsoort === 'toepassing'),
    pak((r) => r.subsoort === 'kennis'),
    pak((r) => r.subsoort === 'project'),
  ].filter(Boolean);
  const gezien = new Set();
  return kandidaten
    .map((k) => (typeof k === 'object' && k.route !== undefined ? k : { route: k.route, waarom: k.subsoort }))
    .filter((k) => indexRoutes.some((r) => r.route === k.route))
    .filter((k) => (gezien.has(k.route) ? false : (gezien.add(k.route), true)));
}

const BREEDTES = [
  { naam: 'desktop', breedte: 1440, hoogte: 900, mobiel: false },
  { naam: 'telefoon', breedte: 390, hoogte: 844, mobiel: true },
];

mkdirSync(UIT, { recursive: true });

const browser = await chromium.launch();
const fouten = [];
const rapport = [];

for (const bm of BREEDTES) {
  const ctx = await browser.newContext({
    viewport: { width: bm.breedte, height: bm.hoogte },
    deviceScaleFactor: 1,
    isMobile: bm.mobiel,
    hasTouch: bm.mobiel,
    userAgent: bm.mobiel
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });

  for (const k of kies()) {
    const pad = k.route === '' ? '/' : `/${k.route}`;
    const page = await ctx.newPage();
    const console_fouten = [];
    const mislukt = [];
    const extern_mislukt = [];
    page.on('console', (m) => { if (m.type() === 'error') console_fouten.push(m.text().slice(0, 160)); });
    page.on('requestfailed', (r) => {
      const u = r.url();
      /* Eigen bestanden die niet laden zijn een defect. Externe hosts zijn
         dat niet: gemeten is dat alleen googletagmanager.com hier
         ERR_CONNECTION_REFUSED geeft — de testbrowser mag niet naar buiten.
         Die ene mislukking produceert ook de enige consolefout, en die wordt
         hieronder van de telling afgetrokken in plaats van de hele pagina af
         te keuren. */
      if (u.startsWith(BASIS)) mislukt.push(`${u.replace(BASIS, '')} (${r.failure()?.errorText || '?'})`);
      else extern_mislukt.push(u.replace(/^https?:\/\//, '').split('/')[0]);
    });

    let meting;
    try {
      const resp = await page.goto(`${BASIS}${pad}`, { waitUntil: 'networkidle', timeout: 30000 });
      if (!resp || resp.status() !== 200) fouten.push(`${bm.naam} ${pad}: status ${resp && resp.status()}`);
      await page.waitForTimeout(400);

      meting = await page.evaluate(() => {
        const de = document.documentElement;
        const hdr = document.querySelector('header.ve-header');
        const ftr = document.querySelector('footer.ve-footer');
        const nav = document.querySelectorAll('header.ve-header a[href]').length;
        const fallback = document.querySelector('[data-chrome-fallback]');
        const kruimels = document.querySelector('.ve-kruimels');
        const cta = [...document.querySelectorAll('a.ve-btn--primair')][0];
        const ctaRect = cta ? cta.getBoundingClientRect() : null;
        /* Welke elementen steken buiten de viewport uit? */
        const breed = [];
        if (de.scrollWidth > window.innerWidth + 1) {
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.right > window.innerWidth + 1) {
              breed.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').filter(Boolean).slice(0, 2).join('.')} r=${Math.round(r.right)}`);
              if (breed.length >= 4) break;
            }
          }
        }
        const beelden = [...document.querySelectorAll('img')];
        const kapot = beelden.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src'));
        return {
          scrollWidth: de.scrollWidth,
          innerWidth: window.innerWidth,
          overflow: de.scrollWidth > window.innerWidth + 1,
          breed,
          header: !!hdr,
          footer: !!ftr,
          navLinks: nav,
          fallbackNogAanwezig: !!fallback,
          kruimels: !!kruimels,
          ctaHoogte: ctaRect ? Math.round(ctaRect.height) : null,
          ctaZichtbaar: ctaRect ? ctaRect.width > 0 && ctaRect.height > 0 : false,
          kapotteBeelden: kapot,
          h1: (document.querySelector('h1') || {}).textContent?.trim().slice(0, 60) || null,
        };
      });

      if (meting.overflow) fouten.push(`${bm.naam} ${pad}: horizontaal schuiven ${meting.scrollWidth} > ${meting.innerWidth} — ${meting.breed.join(' | ')}`);
      if (!meting.header) fouten.push(`${bm.naam} ${pad}: chrome.js heeft geen header gebouwd`);
      if (!meting.footer) fouten.push(`${bm.naam} ${pad}: chrome.js heeft geen footer gebouwd`);
      if (meting.fallbackNogAanwezig) fouten.push(`${bm.naam} ${pad}: de noscript-fallback staat er nog — dubbele navigatie`);
      if (meting.navLinks < 3) fouten.push(`${bm.naam} ${pad}: slechts ${meting.navLinks} navigatielinks in de header`);
      if (!meting.h1) fouten.push(`${bm.naam} ${pad}: geen h1 in de DOM`);
      if (meting.kapotteBeelden.length) fouten.push(`${bm.naam} ${pad}: ${meting.kapotteBeelden.length} beeld(en) laden niet: ${meting.kapotteBeelden.slice(0, 3).join(', ')}`);
      if (meting.ctaZichtbaar && meting.ctaHoogte < 36) fouten.push(`${bm.naam} ${pad}: primaire CTA is ${meting.ctaHoogte}px hoog, te klein om te raken`);
      /* Elke mislukte externe aanvraag levert één "Failed to load resource";
         alleen wat daarbovenop komt is een echte consolefout. */
      const eigenConsole = console_fouten.filter((t) => !/Failed to load resource/.test(t));
      const resterend = Math.max(0, console_fouten.length - extern_mislukt.length - eigenConsole.length);
      if (eigenConsole.length) fouten.push(`${bm.naam} ${pad}: ${eigenConsole.length} consolefout(en): ${eigenConsole.slice(0, 2).join(' | ')}`);
      if (resterend) fouten.push(`${bm.naam} ${pad}: ${resterend} onverklaarde resourcefout(en)`);
      if (mislukt.length) fouten.push(`${bm.naam} ${pad}: ${mislukt.length} mislukt eigen verzoek: ${mislukt.slice(0, 3).join(', ')}`);

      const naam = (k.route || 'home').replace(/\//g, '_');
      await page.screenshot({ path: `${UIT}/${bm.naam}-${naam}.png`, fullPage: false });
      rapport.push({ breedte: bm.naam, pad, ...meting, console: eigenConsole.length, extern: extern_mislukt.length, mislukt: mislukt.length });
    } catch (e) {
      fouten.push(`${bm.naam} ${pad}: uitzondering ${e.message.slice(0, 120)}`);
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();

console.log(`BROWSER-QA tegen ${BASIS}`);
console.log(`schermafbeeldingen: ${UIT}`);
console.log('');
const w = (s, n) => String(s === null || s === undefined ? '-' : s).padEnd(n).slice(0, n);
console.log(w('breedte', 10) + w('pad', 34) + w('scrollW', 9) + w('hdr', 5) + w('ftr', 5) + w('nav', 5) + w('kruim', 7) + w('cta', 6) + w('cons', 6) + w('extern', 7) + 'h1');
for (const r of rapport) {
  console.log(
    w(r.breedte, 10) + w(r.pad, 34) + w(r.scrollWidth, 9) + w(r.header ? 'ja' : 'NEE', 5) + w(r.footer ? 'ja' : 'NEE', 5) +
      w(r.navLinks, 5) + w(r.kruimels ? 'ja' : '-', 7) + w(r.ctaHoogte, 6) + w(r.console, 6) + w(r.extern, 7) + (r.h1 || '')
  );
}
console.log('');
if (fouten.length) {
  console.log(`FOUTEN (${fouten.length}):`);
  for (const f of fouten) console.log(`  · ${f}`);
}
console.log(`BROWSER-QA = ${fouten.length === 0 ? 'PASS' : 'FAIL'}`);
process.exit(fouten.length === 0 ? 0 : 1);
