#!/usr/bin/env node
/* ============================================================================
   DESKTOPGOVERNANCE — echte browsermeting bij 1440 / 1774 / 1920
   ----------------------------------------------------------------------------
   Lost het oorspronkelijke probleem op: mobiel acceptabel, desktop generiek,
   smal en dood. Statische analyse kan dat niet meten, dus dit harnas meet het
   in Chromium. Het WIJZIGT NIETS: het opent pagina's alleen-lezen.

       node docs/qa/desktop-governance.mjs <url-basis> <pagina> [<pagina> ...]
       node docs/qa/desktop-governance.mjs http://127.0.0.1:8033 index.html

   DE KERNTOETS. Een HIGH-sectie mag smal zijn als dat de compositie is
   (DOCUMENT MODE). Zij mag NIET smal zijn doordat een max-width- of
   clamp-plafond haar bevroor. Het verschil is meetbaar: een bevroren sectie
   houdt bij 1920 exact dezelfde contentbreedte als bij 1440.
   ============================================================================ */

import { chromium } from '/Users/mounirvanbinsbergen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const BREEDTES = [1440, 1774, 1920];
const TOL = 0.02;           // 2% meetruis op proportionele schaling
const CH_TOL = 0.06;        // 6% op leesmaat in ch

const [basis, ...paginas] = process.argv.slice(2);
if (!basis || !paginas.length) {
  console.error('gebruik: node docs/qa/desktop-governance.mjs <url-basis> <pagina.html> [...]');
  process.exit(2);
}

/* In de pagina uitgevoerd. Meet per sectie wat sectie 18 van de opdracht vraagt. */
const METEN = () => {
  const vw = window.innerWidth;
  const zichtbaar = el => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };

  const secties = [...document.querySelectorAll('section, main > div[class], header')].filter(zichtbaar);

  /* leesmaat: breedste lopende-tekstelement, omgerekend naar ch met de ECHTE
     ch-breedte van zijn eigen font. Geen universele ch->px-constante. */
  const leesmaat = root => {
    const kand = [...root.querySelectorAll('p, li, blockquote')].filter(el => zichtbaar(el) && el.textContent.trim().split(/\s+/).length >= 12);
    if (!kand.length) return null;
    const el = kand.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    const px = el.getBoundingClientRect().width;
    const probe = document.createElement('span');
    const cs = getComputedStyle(el);
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
    probe.textContent = '0'.repeat(100);
    el.appendChild(probe);
    const chpx = probe.getBoundingClientRect().width / 100;
    probe.remove();
    return { px: +px.toFixed(1), chpx: +chpx.toFixed(3), ch: +(px / chpx).toFixed(1), fontpx: +parseFloat(cs.fontSize).toFixed(1) };
  };

  return secties.map((sec, i) => {
    const r = sec.getBoundingClientRect();
    /* ontworpen canvasbreedte = breedste zichtbare directe-of-diepere container
       die de inhoud werkelijk begrenst; benaderd door de breedste niet-sectie
       wrapper, anders de sectie zelf */
    const kinderen = [...sec.querySelectorAll('*')].filter(zichtbaar);
    let bezetL = Infinity, bezetR = -Infinity;
    for (const k of kinderen) {
      const kr = k.getBoundingClientRect();
      if (kr.width < 4 || kr.height < 4) continue;
      bezetL = Math.min(bezetL, kr.left); bezetR = Math.max(bezetR, kr.right);
    }
    if (!isFinite(bezetL)) { bezetL = r.left; bezetR = r.right; }

    const media = [...sec.querySelectorAll('img, video, svg, canvas, picture')].filter(zichtbaar)
      .map(m => m.getBoundingClientRect().width);
    const dominant = media.length ? Math.max(...media) : 0;

    /* grootste BEDOELD lege veld: de breedste horizontale gaping tussen twee
       opeenvolgende zichtbare blokken op dezelfde hoogteband */
    const blokken = kinderen.map(k => k.getBoundingClientRect())
      .filter(b => b.width > 40 && b.height > 20)
      .sort((a, b) => a.left - b.left);
    let gat = 0;
    for (let j = 1; j < blokken.length; j++) {
      if (Math.abs(blokken[j].top - blokken[j - 1].top) < 60) gat = Math.max(gat, blokken[j].left - blokken[j - 1].right);
    }

    const tekst = sec.textContent.trim().split(/\s+/).filter(Boolean).length;
    return {
      index: i,
      id: sec.id || sec.getAttribute('data-screen-label') || sec.className.split(/\s+/)[0] || `sectie-${i}`,
      vw,
      sectiehoogte: +r.height.toFixed(0),
      contentbreedte: +(bezetR - bezetL).toFixed(1),
      bezet_pct: +(((bezetR - bezetL) / vw) * 100).toFixed(1),
      dominant_media: +dominant.toFixed(1),
      dominant_pct: +((dominant / vw) * 100).toFixed(1),
      grootste_gat: +gat.toFixed(1),
      leesmaat: leesmaat(sec),
      woorden: tekst,
      randrakend: bezetL <= 2 || bezetR >= vw - 2,
    };
  });
};

/* ---------------------------------------------------------------- oordelen */
function beoordeel(perBreedte, pagina) {
  const op = w => perBreedte[w];
  const b1440 = op(1440), b1920 = op(1920), b1774 = op(1774);
  const n = Math.min(b1440.length, b1920.length, b1774.length);
  const rijen = [];

  for (let i = 0; i < n; i++) {
    const a = b1440[i], m = b1774[i], z = b1920[i];
    const schaal = a.contentbreedte ? z.contentbreedte / a.contentbreedte : 0;
    const ideaal = 1920 / 1440;                       // 1,3333
    const bevroren = Math.abs(z.contentbreedte - a.contentbreedte) <= 1.5;
    const schaalt = Math.abs(schaal - ideaal) / ideaal <= TOL;
    const leesBegrensd = a.leesmaat && z.leesmaat
      ? Math.abs(z.leesmaat.ch - a.leesmaat.ch) / a.leesmaat.ch <= CH_TOL : null;

    /* AFGELEIDE canvasmodus — uit het gedrag, niet uit een declaratie.
       CANVAS   : de contentbreedte schaalt mee met de viewport
       DOCUMENT : de contentbreedte staat stil EN de leesmaat is begrensd
       HYBRID   : de breedte groeit, de leesmaat blijft staan             */
    let modus;
    if (schaalt && (!leesBegrensd || a.leesmaat === null)) modus = 'CANVAS';
    else if (schaalt && leesBegrensd) modus = 'HYBRID';
    else if (bevroren) modus = 'DOCUMENT';
    else modus = 'GEMENGD';

    /* De kerntoets. Een sectie met veel gewicht (hoog, randrakend of met een
       groot dominant beeld) die bij 1920 exact zo breed is als bij 1440 is
       bevroren door een plafond. Dat is de oorspronkelijke desktopfout. */
    const zwaar = a.sectiehoogte >= 400 || a.randrakend || a.dominant_pct >= 30;
    const verdacht = zwaar && bevroren;

    rijen.push({
      id: a.id, zwaar, modus,
      breedtes: { 1440: a.contentbreedte, 1774: m.contentbreedte, 1920: z.contentbreedte },
      bezet: { 1440: a.bezet_pct, 1774: m.bezet_pct, 1920: z.bezet_pct },
      dominant: { 1440: a.dominant_pct, 1774: m.dominant_pct, 1920: z.dominant_pct },
      leesmaat_ch: { 1440: a.leesmaat?.ch ?? null, 1774: m.leesmaat?.ch ?? null, 1920: z.leesmaat?.ch ?? null },
      grootste_gat: { 1440: a.grootste_gat, 1920: z.grootste_gat },
      hoogte: a.sectiehoogte,
      schaalfactor: +schaal.toFixed(4),
      bevroren, schaalt, leesBegrensd,
      /* DG-01 is MACHINE. DG-02 is de reviewervraag die hij oproept. */
      'DG-01': verdacht ? 'FAIL' : 'PASS',
      'DG-02-reviewervraag': verdacht
        ? 'Is deze smalheid bedoeld voor de compositie, of louter het gevolg van een container die zijn maximum bereikt?'
        : null,
      /* DG-03 responsieve schaling, per AFGELEIDE modus. Geen "alles moet schalen". */
      'DG-03': modus === 'CANVAS' ? (schaalt ? 'PASS' : 'FAIL')
        : modus === 'DOCUMENT' ? (leesBegrensd === false ? 'FAIL' : 'PASS')
        : modus === 'HYBRID' ? (schaalt && leesBegrensd ? 'PASS' : 'FAIL')
        : 'REVIEWER',
    });
  }
  return { pagina, secties: rijen };
}

/* ------------------------------------------------------------------- main */
const browser = await chromium.launch();
const uit = [];
for (const pagina of paginas) {
  const perBreedte = {};
  for (const w of BREEDTES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 1000 }, deviceScaleFactor: 1 });
    /* consent- en popup-onderdrukking: anders meet je een overlay in plaats van de pagina */
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('vibe_consent_v1', JSON.stringify({ v: 1, analytics: true, marketing: true }));
        for (const k of ['systeem-energieopslag', 'index', 'home']) localStorage.setItem(`vibe_lead_done_${k}`, '1');
      } catch { }
    });
    const page = await ctx.newPage();
    await page.goto(`${basis}/${pagina}`, { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => document.querySelectorAll('.vlp-ov').forEach(e => e.remove()));
    /* alle lazy beelden echt laten laden, anders is dominant_media 0 */
    const imgs = await page.locator('img').all();
    for (const im of imgs) { try { await im.scrollIntoViewIfNeeded({ timeout: 2500 }); } catch { } }
    await page.evaluate(() => window.scrollTo(0, 0));
    try { await page.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 15000 }); } catch { }
    await page.waitForTimeout(400);
    perBreedte[w] = await page.evaluate(METEN);
    await ctx.close();
  }
  uit.push(beoordeel(perBreedte, pagina));
}
await browser.close();

/* -------------------------------------------------------------- rapportage */
for (const p of uit) {
  console.log(`\n${'='.repeat(104)}\n${p.pagina}   —   ${p.secties.length} secties gemeten bij 1440 / 1774 / 1920\n${'='.repeat(104)}`);
  console.log('  sectie                   zwaar modus      breedte 1440/1774/1920      bezet%          dominant%        leesmaat ch     DG-01  DG-03');
  for (const s of p.secties) {
    console.log('  ' + [
      s.id.slice(0, 24).padEnd(24),
      (s.zwaar ? ' ja  ' : ' --  '),
      s.modus.padEnd(10),
      `${s.breedtes[1440]}/${s.breedtes[1774]}/${s.breedtes[1920]}`.padEnd(27),
      `${s.bezet[1440]}/${s.bezet[1774]}/${s.bezet[1920]}`.padEnd(15),
      `${s.dominant[1440]}/${s.dominant[1774]}/${s.dominant[1920]}`.padEnd(16),
      `${s.leesmaat_ch[1440] ?? '-'}/${s.leesmaat_ch[1774] ?? '-'}/${s.leesmaat_ch[1920] ?? '-'}`.padEnd(15),
      (s['DG-01'] === 'FAIL' ? '>FAIL<' : ' PASS '),
      s['DG-03'],
    ].join(' '));
  }
  const f1 = p.secties.filter(s => s['DG-01'] === 'FAIL');
  const f3 = p.secties.filter(s => s['DG-03'] === 'FAIL');
  console.log(`  ---- DG-01 bevroren zware secties: ${f1.length}${f1.length ? ' (' + f1.map(s => s.id).join(', ') + ')' : ''}`);
  console.log(`  ---- DG-03 schalingsfouten: ${f3.length}${f3.length ? ' (' + f3.map(s => `${s.id}/${s.modus}`).join(', ') + ')' : ''}`);
  const modi = p.secties.reduce((a, s) => (a[s.modus] = (a[s.modus] || 0) + 1, a), {});
  console.log(`  ---- afgeleide modi: ${JSON.stringify(modi)}`);
}
console.log('\n' + JSON.stringify(uit).length + ' bytes JSON; volledige meting:');
console.log(JSON.stringify(uit, null, 1));
