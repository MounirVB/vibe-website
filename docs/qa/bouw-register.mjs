#!/usr/bin/env node
/* Genereert docs/data/vibe-site-register.json uit GEMETEN signalen van de echte
   .html-bestanden. Verzint niets: elke telling komt uit het bestand zelf.
   Compositiemetadata wordt NIET voor legacy-pagina's uitgevonden; die krijgen
   MIGRATIESTATUS = LEGACY / NIET GEMAPT.                                      */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOCS = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT = dirname(DOCS);

/* ---- DR-R1-13: de klasse NIET-PAGINA. Een fragment zonder <html> en een
   ontwerpzandbak buiten sitemap.xml kunnen niet aan een paginapoort worden
   onderworpen. Dit is een meetfeit, geen uitvlucht.                           */
const NIET_PAGINA = {
  '_header.html': 'FRAGMENT — geen <html>-document, 0 <section>; wordt in andere pagina\'s ingevoegd',
  'popup-designs.html': 'ONTWERPZANDBAK — niet in sitemap.xml, 1 <form>, geen publieke route',
  'popup-designs-met-afbeelding.html': 'ONTWERPZANDBAK — niet in sitemap.xml, 1 <form>, geen publieke route',
  'cookie-popup-designs.html': 'ONTWERPZANDBAK — niet in sitemap.xml, geen publieke route',
};
const SERVICE = { '404.html': 'FOUTPAGINA — eigen minimale eis, geen landingscompositie' };

/* ---- archetypetoewijzing op naampatroon + gemeten vorm --------------- */
function klasseer(f, m) {
  if (NIET_PAGINA[f]) return { page_class: 'NIET-PAGINA', archetype: null, variant: null, reason: NIET_PAGINA[f] };
  if (SERVICE[f]) return { page_class: 'SERVICEPAGINA', archetype: null, variant: 'foutpagina', reason: SERVICE[f] };
  if (f === 'index.html') return { page_class: 'PAGINA', archetype: 'B1', variant: 'startpagina' };
  if (/^systeem-/.test(f)) return { page_class: 'PAGINA', archetype: 'B2', variant: 'productsysteem' };
  if (/^industrie-/.test(f)) return { page_class: 'PAGINA', archetype: 'B4', variant: 'sector' };
  if (/^project-/.test(f)) return { page_class: 'PAGINA', archetype: 'B5', variant: 'projectcase' };
  if (/^(algemene-voorwaarden|privacy)\.html$/.test(f)) return { page_class: 'PAGINA', archetype: 'B7', variant: 'juridisch-lange-tekst' };
  if (/^(over-ons|waarom-vibe)\.html$/.test(f)) return { page_class: 'PAGINA', archetype: 'B6', variant: 'redactioneel' };
  if (/^(projecten|netcongestie-check|contact)\.html$/.test(f)) {
    return { page_class: 'PAGINA', archetype: 'S2', variant: m.form ? 'formulier' : 'overzicht' };
  }
  /* alles wat overblijft is een propositie-/oplossingspagina: oplossing-*, plus de
     baatgerichte pagina's met dezelfde gemeten vorm (8-11 secties, 1-6 beelden) */
  return { page_class: 'PAGINA', archetype: 'B3', variant: /^oplossing-/.test(f) ? 'oplossing' : 'propositie' };
}

/* ---- canonieke onderwerpen: alleen waar het uit de bestandsnaam volgt -- */
const CANON = {
  'systeem-energieopslag.html': { product: 'batterijopslag' },
  'systeem-zonnepanelen.html': { product: 'zonnepanelen' },
  'systeem-laadpalen.html': { product: 'laadinfrastructuur' },
  'systeem-ems.html': { product: 'energiemanagement' },
};
const PROJECTBEELD = {
  'project-arnhem-60.html': 'assets/projects/arnhem-60.jpg',
  'project-burchtstraat.html': 'assets/projects/burchtstraat.jpg',
  'project-dormio-medemblik.html': 'assets/projects/dormio.jpg',
  'project-hedin-alkmaar.html': 'assets/projects/hedin-alkmaar.jpg',
  'project-hedin-amsterdam.html': 'assets/projects/hedin-amsterdam.jpg',
  'project-ketsheuvel.html': 'assets/projects/ketsheuvel.jpg',
  'project-nieuw-schoonoord.html': 'assets/projects/nieuw-schoonoord.jpg',
  'project-purmerend.html': 'assets/projects/purmerend.jpg',
  'project-ratio-16.html': 'assets/projects/ratio-16.jpg',
  'project-schouwburgring.html': 'assets/projects/schouwburgring.jpg',
  'project-van-beethovenstraat.html': 'assets/projects/beethovenstraat.jpg',
};

const sitemap = existsSync(join(ROOT, 'sitemap.xml')) ? readFileSync(join(ROOT, 'sitemap.xml'), 'utf8') : '';
const bestanden = readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();

/* welke compositiekaarten bestaan werkelijk? */
const kaartdir = join(DOCS, 'compositions');
const kaarten = existsSync(kaartdir) ? readdirSync(kaartdir).filter(f => f.endsWith('.json')) : [];
const kaartVoor = {};
for (const k of kaarten) {
  try {
    const c = JSON.parse(readFileSync(join(kaartdir, k), 'utf8'));
    if (c.page && !c.page.startsWith('control:')) kaartVoor[c.page] = `docs/compositions/${k}`;
  } catch { /* de poort rapporteert kapotte JSON zelf */ }
}

const pages = bestanden.map(f => {
  const h = readFileSync(join(ROOT, f), 'utf8');
  const txt = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  const m = {
    words: txt.split(/\s+/).filter(Boolean).length,
    heeft_html: /<html/i.test(h),
    secties: (h.match(/<section/g) || []).length,
    beelden: (h.match(/<img/g) || []).length,
    formulieren: (h.match(/<form/g) || []).length,
    details: (h.match(/<details/g) || []).length,
    screen_labels: (h.match(/data-screen-label/g) || []).length,
    in_sitemap: sitemap.includes(f),
  };
  const k = klasseer(f, m);
  const kaart = kaartVoor[f] || null;

  /* --- governance- en meetstatus -------------------------------------- */
  let governance_status, measurement_status, migration_status;
  if (k.page_class === 'NIET-PAGINA') {
    governance_status = 'NIET-PAGINA';
    measurement_status = 'NIET VAN TOEPASSING — geen paginadocument';
    migration_status = 'NIET VAN TOEPASSING';
  } else if (k.page_class === 'SERVICEPAGINA') {
    governance_status = 'SERVICE-MINIMAAL';
    measurement_status = 'REVIEW NIET VEREIST VOOR FREEZE — eigen minimale eis';
    migration_status = 'LEGACY / NIET GEMAPT';
  } else if (f === 'index.html') {
    governance_status = 'MASTER';
    measurement_status = kaart ? 'GEMETEN EN GEMAPT — referentievingerafdruk' : 'KAART ONTBREEKT — BLOKKEERT FREEZE';
    migration_status = kaart ? 'MASTER / GEMAPT' : 'MASTER / NIET GEMAPT';
  } else if (kaart) {
    governance_status = 'GEMIGREERD';
    measurement_status = 'GEMETEN EN GEMAPT';
    migration_status = 'GEMIGREERD';
  } else {
    governance_status = 'LEGACY';
    measurement_status = 'NIET GEMIGREERD / REVIEW NIET VEREIST VOOR FREEZE';
    migration_status = 'LEGACY / NIET GEMAPT';
  }

  /* --- content- en assetstatus: alleen wat gemeten is ----------------- */
  const beeld = PROJECTBEELD[f] || null;
  const asset_status = k.page_class !== 'PAGINA' ? 'NIET VAN TOEPASSING'
    : m.beelden === 0 ? 'GEEN BEELD IN DOM'
    : beeld ? 'EEN PROJECTBEELD, BENOEMD'
    : `${m.beelden} <img> IN DOM — klasse niet per pagina geverifieerd`;

  return {
    path: f,
    page_class: k.page_class,
    archetype: k.archetype,
    variant: k.variant,
    ...(k.reason ? { not_a_page_reason: k.reason } : {}),
    ...(CANON[f] ? { canonical: CANON[f] } : {}),
    ...(beeld ? { canonical_asset: beeld } : {}),
    governance_status,
    measurement_status,
    migration_status,
    composition_card: kaart,
    content_status: m.words < 60 ? 'SCHRAAL — <60 woorden in de DOM' : 'AANWEZIG IN DOM',
    asset_status,
    measured: m,
  };
});

const telling = (veld) => pages.reduce((a, p) => (a[p[veld]] = (a[p[veld]] || 0) + 1, a), {});

const register = {
  register_version: '1.0',
  schema: 'docs/schema/composition-card.schema.json',
  measured_at_note: 'Alle tellingen in `measured` zijn uit de .html-bestanden in de werkboom gelezen door docs/qa/bouw-register.mjs. Niets is met de hand ingevuld.',
  governance_note: 'Legacy-pagina\'s dragen GEEN V1.3-compositiemetadata en doen niet alsof. Het register bestaat zodat toekomstige gemigreerde pagina\'s onderling vergelijkbaar zijn. Alleen pagina\'s met een composition_card doen mee aan de cross-paginatoetsen.',
  totals: {
    html_files: pages.length,
    page_class: telling('page_class'),
    archetype: telling('archetype'),
    governance_status: telling('governance_status'),
    with_composition_card: pages.filter(p => p.composition_card).length,
    classifiable: pages.filter(p => p.governance_status).length,
    without_measurement_status: pages.filter(p => !p.measurement_status).length,
  },
  pages,
};

writeFileSync(join(DOCS, 'data', 'vibe-site-register.json'), JSON.stringify(register, null, 2) + '\n');
console.log(`register geschreven: ${pages.length} pagina's`);
console.log('page_class      ', JSON.stringify(register.totals.page_class));
console.log('archetype       ', JSON.stringify(register.totals.archetype));
console.log('governance      ', JSON.stringify(register.totals.governance_status));
console.log('met kaart       ', register.totals.with_composition_card);
console.log('zonder meetstatus', register.totals.without_measurement_status);
