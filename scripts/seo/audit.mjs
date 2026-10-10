/* ============================================================================
   VIBE ENERGY — SEO/GEO-POORT
   ----------------------------------------------------------------------------
   Vijftien poorten over de werkelijke HTML, niet over de bedoeling. Elke poort
   rapporteert PASS of FAIL met een getal erbij; één exitcode zonder tabel zegt
   te weinig om op te releasen.

   Draaien: node scripts/seo/audit.mjs
   Exitcode 1 zodra een VERPLICHTE poort faalt.

   Poorten gemarkeerd als [advies] falen de release niet, maar worden wel
   geteld en benoemd.
   ============================================================================ */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST, HOST_APEX, url, href, bestand } from './lib/paden.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');
const lees = (...p) => JSON.parse(readFileSync(resolve(wortel, ...p), 'utf8'));

const reg = lees('data', 'seo', 'routes.json');
const provincies = lees('data', 'geo', 'provincies.json').provincies;
const gemeenten = lees('data', 'geo', 'gemeenten.json').gemeenten;
const opl = lees('data', 'seo', 'oplossingen.json');
const projGeo = lees('data', 'bewijs', 'projecten-geo.json').per_gemeente;
const projecten = lees('scripts', 'projecten.json').projecten;

const register = new Map(reg.routes.map((r) => [r.route, r]));
const indexRoutes = reg.routes.filter((r) => r.staat === 'INDEX');
const pendingRoutes = reg.routes.filter((r) => r.staat === 'PENDING');
const noindexRoutes = reg.routes.filter((r) => r.staat === 'NOINDEX');

/* ------------------------------------------------------------- hulpstukken */
const poorten = [];
function poort(naam, verplicht, fn) {
  let uitkomst;
  try {
    uitkomst = fn();
  } catch (e) {
    uitkomst = { ok: false, meting: 'uitzondering', details: [String(e.message)] };
  }
  poorten.push({ naam, verplicht, ...uitkomst });
}

const een = (re, s) => { const m = s.match(re); return m ? m[1] : null; };
const alle = (re, s) => [...s.matchAll(re)].map((m) => m[1]);

function htmlVan(route) {
  const p = resolve(wortel, bestand(route));
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

function mainVan(s) {
  return een(/<main\b[^>]*>([\s\S]*)<\/main>/i, s) || '';
}

function tekstVan(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Alle HTML-bestanden in de wortel en onder regios/, sectoren/, kennis/,
   toepassingen/, subsidies/. */
function alleHtml() {
  const uit = [];
  const loop = (map, prefix) => {
    for (const d of readdirSync(map, { withFileTypes: true })) {
      if (d.name === '.git' || d.name === 'node_modules' || d.name === 'review' || d.name === 'new-pages' || d.name === 'docs' || d.name === 'api') continue;
      const p = join(map, d.name);
      if (d.isDirectory()) loop(p, `${prefix}${d.name}/`);
      else if (d.name.endsWith('.html')) uit.push(`${prefix}${d.name}`);
    }
  };
  loop(wortel, '');
  return uit.sort();
}
const htmlBestanden = alleHtml();
const bestandSet = new Set(htmlBestanden);

/* Routes waarvoor een bestand bestaat (als route, dus zonder .html). */
const routeVanBestand = (f) => (f === 'index.html' ? '' : f.replace(/\.html$/, ''));
const bestaandeRoutes = new Set(htmlBestanden.map(routeVanBestand));

/* ======================================================= 1 · REGISTER */
poort('1  Routeregister en pariteit met de schijf', true, () => {
  const fouten = [];
  const dubbel = new Map();
  for (const r of reg.routes) {
    dubbel.set(r.route, (dubbel.get(r.route) || 0) + 1);
    if (!['INDEX', 'PENDING', 'NOINDEX'].includes(r.staat)) fouten.push(`${r.route}: onbekende staat ${r.staat}`);
    if (!r.reden) fouten.push(`${r.route}: geen reden vastgelegd`);
  }
  for (const [route, n] of dubbel) if (n > 1) fouten.push(`${route}: ${n}x in het register`);
  for (const r of indexRoutes) if (!bestaandeRoutes.has(r.route)) fouten.push(`INDEX zonder bestand: ${r.route}`);
  for (const r of pendingRoutes) if (bestaandeRoutes.has(r.route)) fouten.push(`PENDING MET bestand: ${r.route}`);
  for (const r of noindexRoutes) if (!bestaandeRoutes.has(r.route)) fouten.push(`NOINDEX zonder bestand: ${r.route}`);
  const ongeregistreerd = [...bestaandeRoutes].filter((x) => !register.has(x));
  for (const o of ongeregistreerd) fouten.push(`bestand zonder registerregel: ${o}.html`);
  return {
    ok: fouten.length === 0,
    meting: `${reg.routes.length} kandidaten · ${indexRoutes.length} INDEX · ${pendingRoutes.length} PENDING · ${noindexRoutes.length} NOINDEX · ${htmlBestanden.length} bestanden`,
    details: fouten,
  };
});

/* ======================================================= 2 · GEO-INTEGRITEIT */
poort('2  Geografische broonintegriteit', true, () => {
  const fouten = [];
  const provCodes = new Set(provincies.map((p) => p.provinciecode));
  if (gemeenten.length !== 342) fouten.push(`aantal gemeenten is ${gemeenten.length}, verwacht 342 (CBS-indeling 2026)`);
  if (provincies.length !== 12) fouten.push(`aantal provincies is ${provincies.length}, verwacht 12`);
  const som = provincies.reduce((a, p) => a + p.aantal_gemeenten, 0);
  if (som !== gemeenten.length) fouten.push(`som per provincie is ${som}, gemeentelijst is ${gemeenten.length}`);
  const padGezien = new Map();
  for (const g of gemeenten) {
    if (!provCodes.has(g.provinciecode)) fouten.push(`${g.gemeentecode} ${g.naam}: onbekende provinciecode ${g.provinciecode}`);
    if (!/^\d{4}$/.test(g.gemeentecode)) fouten.push(`${g.naam}: gemeentecode '${g.gemeentecode}' is geen viercijferige CBS-code`);
    if (!g.slug) fouten.push(`${g.gemeentecode}: geen slug`);
    const pad = `${g.provincie_slug}/${g.slug}`;
    if (padGezien.has(pad)) fouten.push(`slugbotsing ${pad}: ${padGezien.get(pad)} en ${g.gemeentecode}`);
    padGezien.set(pad, g.gemeentecode);
  }
  const famSlugs = new Set(opl.families.map((f) => f.slug));
  for (const g of gemeenten) if (famSlugs.has(g.slug)) fouten.push(`gemeenteslug '${g.slug}' is ook een familieslug — /regios/<prov>/${g.slug} is dubbelzinnig`);
  return { ok: fouten.length === 0, meting: `${provincies.length} provincies · ${gemeenten.length} gemeenten · ${opl.families.length} families`, details: fouten };
});

/* ======================================================= 3 · LOKAAL BEWIJS */
poort('3  Lokaal bewijs achter elke regionale INDEX-route', true, () => {
  const fouten = [];
  for (const r of indexRoutes) {
    if (r.subsoort === 'gemeente') {
      const p = projGeo[r.gemeentecode] || [];
      if (!p.length) fouten.push(`${r.route}: gemeentehub op INDEX zonder gerealiseerd project`);
    }
    if (r.subsoort === 'gemeente-familie') {
      const p = projGeo[r.gemeentecode] || [];
      const fams = new Set(p.flatMap((x) => x.families_zakelijk || []));
      if (!fams.has(r.familie)) fouten.push(`${r.route}: geen zakelijk project in deze gemeente dat '${r.familie}' aantoont`);
    }
    if (r.subsoort === 'provincie-familie') {
      const inProv = gemeenten.filter((g) => g.provinciecode === r.provinciecode);
      const fams = new Set(inProv.flatMap((g) => (projGeo[g.gemeentecode] || []).flatMap((x) => x.families_zakelijk || [])));
      if (!fams.has(r.familie)) fouten.push(`${r.route}: geen zakelijk project in deze provincie dat '${r.familie}' aantoont`);
    }
  }
  const regio = indexRoutes.filter((r) => r.soort === 'regio').length;
  return { ok: fouten.length === 0, meting: `${regio} regionale INDEX-routes getoetst`, details: fouten };
});

/* ======================================================= 4 · METADATA */
poort('4  Metadata per gepubliceerde pagina', true, () => {
  const fouten = [];
  const waarschuwing = [];
  for (const r of indexRoutes) {
    const s = htmlVan(r.route);
    if (!s) { fouten.push(`${r.route}: geen bestand`); continue; }
    const titel = een(/<title>([\s\S]*?)<\/title>/i, s);
    const desc = een(/<meta name="description" content="([\s\S]*?)">/i, s);
    const canon = een(/<link rel="canonical" href="([^"]*)"/i, s);
    const robots = een(/<meta name="robots" content="([^"]*)"/i, s);
    const ogUrl = een(/<meta property="og:url" content="([^"]*)"/i, s);
    const h1 = alle(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, s);
    if (!titel) fouten.push(`${r.route}: geen <title>`);
    if (!desc) fouten.push(`${r.route}: geen description`);
    if (!canon) fouten.push(`${r.route}: geen canonical`);
    if (canon && canon !== url(r.route)) fouten.push(`${r.route}: canonical is niet zelfverwijzend (${canon})`);
    if (!/^index/.test(robots || '')) fouten.push(`${r.route}: robots is '${robots}', verwacht index`);
    if (!ogUrl) fouten.push(`${r.route}: geen og:url`);
    if (ogUrl && ogUrl !== url(r.route)) fouten.push(`${r.route}: og:url wijkt af van canonical`);
    if (h1.length !== 1) fouten.push(`${r.route}: ${h1.length} h1-elementen`);
    if (!/<html lang="nl">/.test(s)) fouten.push(`${r.route}: html lang is niet nl`);
    if (!/<meta name="viewport"/.test(s)) fouten.push(`${r.route}: geen viewport-meta`);
    if (titel && (titel.length < 25 || titel.length > 70)) waarschuwing.push(`${r.route}: titellengte ${titel.length}`);
    if (desc && (desc.length < 70 || desc.length > 165)) waarschuwing.push(`${r.route}: descriptionlengte ${desc.length}`);
  }
  return {
    ok: fouten.length === 0,
    meting: `${indexRoutes.length} pagina's · ${waarschuwing.length} lengteafwijkingen`,
    details: fouten,
    advies: waarschuwing,
  };
});

/* ======================================================= 5 · CANONICAL */
poort('5  Canonical-conflicten en hostconsistentie', true, () => {
  const fouten = [];
  const perCanon = new Map();
  for (const f of htmlBestanden) {
    const route = routeVanBestand(f);
    const s = readFileSync(resolve(wortel, f), 'utf8');
    const canon = een(/<link rel="canonical" href="([^"]*)"/i, s);
    if (!canon) {
      if (route !== '404') fouten.push(`${f}: geen canonical`);
      continue;
    }
    if (canon.startsWith(`${HOST_APEX}/`)) fouten.push(`${f}: canonical op de apex, die 301 geeft`);
    if (!canon.startsWith(HOST)) fouten.push(`${f}: canonical op een vreemde host (${canon})`);
    const doelRoute = canon.replace(`${HOST}/`, '').replace(/\/$/, '');
    const reg2 = register.get(doelRoute === '' ? '' : doelRoute);
    if (!reg2) fouten.push(`${f}: canonical wijst naar een onbekende route (${doelRoute})`);
    else if (reg2.staat === 'PENDING') fouten.push(`${f}: canonical wijst naar een PENDING-route (${doelRoute})`);
    const r = register.get(route);
    if (r && r.staat === 'INDEX') {
      if (perCanon.has(canon)) fouten.push(`canonical dubbel geclaimd door twee INDEX-pagina's: ${perCanon.get(canon)} en ${f}`);
      perCanon.set(canon, f);
    }
  }
  return { ok: fouten.length === 0, meting: `${htmlBestanden.length} bestanden · ${perCanon.size} unieke canonicals op INDEX`, details: fouten };
});

/* ======================================================= 6 · STRUCTURED DATA */
poort('6  Structured data', true, () => {
  const fouten = [];
  let metLd = 0;
  for (const r of indexRoutes) {
    const s = htmlVan(r.route);
    if (!s) continue;
    const blokken = alle(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi, s);
    if (!blokken.length) { fouten.push(`${r.route}: geen JSON-LD`); continue; }
    metLd += 1;
    for (const b of blokken) {
      let j;
      try { j = JSON.parse(b); } catch (e) { fouten.push(`${r.route}: JSON-LD is geen geldige JSON (${e.message})`); continue; }
      const knopen = j['@graph'] || [j];
      const types = knopen.map((n) => (Array.isArray(n['@type']) ? n['@type'].join('+') : n['@type']));
      for (const verplicht of ['Organization', 'WebSite', 'WebPage']) {
        if (!types.includes(verplicht)) fouten.push(`${r.route}: JSON-LD mist ${verplicht}`);
      }
      /* Verboden knopen: er is geen beoordelings-, review- of prijsbron. */
      for (const verboden of ['AggregateRating', 'Review', 'Offer', 'Rating']) {
        if (types.some((t) => String(t).includes(verboden))) fouten.push(`${r.route}: JSON-LD bevat ${verboden} zonder bron`);
      }
      /* Een FAQPage mag alleen vragen bevatten die ook zichtbaar op de pagina staan. */
      const faq = knopen.find((n) => n['@type'] === 'FAQPage');
      if (faq) {
        const tekst = tekstVan(mainVan(s));
        for (const q of faq.mainEntity || []) {
          const kern = String(q.name).replace(/<[^>]+>/g, '').slice(0, 40);
          if (!tekst.includes(kern.slice(0, 30))) fouten.push(`${r.route}: FAQ-vraag staat niet zichtbaar op de pagina: "${kern}"`);
        }
      }
      /* Elke knoop met een url moet op de juiste host staan. */
      for (const n of knopen) {
        for (const v of [n.url, n['@id']]) {
          if (typeof v === 'string' && v.startsWith(`${HOST_APEX}/`)) fouten.push(`${r.route}: JSON-LD gebruikt de apex-host in ${v}`);
        }
      }
    }
  }
  return { ok: fouten.length === 0, meting: `${metLd} van ${indexRoutes.length} pagina's met JSON-LD`, details: fouten };
});

/* ======================================================= 7 · LINKS */
poort('7  Interne links: dood, naar PENDING, of niet-canoniek', true, () => {
  const fouten = [];
  const advies = [];
  let geteld = 0;
  for (const f of htmlBestanden) {
    const s = readFileSync(resolve(wortel, f), 'utf8');
    const route = routeVanBestand(f);
    const r0 = register.get(route);
    const diepte = route === '' ? 0 : route.split('/').length - 1;
    /* Een relatieve link is alleen fout als hij ook werkelijk fout oplost.
       Op een wortelpagina lost 'projecten' correct op naar /projecten; op een
       geneste pagina niet. De bestaande, met de hand geschreven wortelpagina's
       worden daarom niet herschreven — dat zou de vastgezette masters raken
       zonder dat er iets kapot is. Voor een GEGENEREERDE pagina geldt de
       strenge eis wel: die schrijven wij zelf en hij kan nesten. */
    const streng = diepte > 0 || (r0 && !r0.bestaand);
    const hrefs = alle(/<a\b[^>]*href="([^"]+)"/gi, s);
    for (const h of hrefs) {
      if (/^(https?:|mailto:|tel:|#|javascript:)/.test(h)) continue;
      geteld += 1;
      const schoon = h.split('#')[0].split('?')[0];
      if (schoon === '' || schoon === '/') continue;
      if (!schoon.startsWith('/')) {
        const melding = `${f}: relatieve link '${h}'`;
        if (streng) fouten.push(`${melding} — op een geneste of gegenereerde pagina lost die fout op`);
        else advies.push(`${melding} (lost op deze wortelpagina correct op; niet herschreven)`);
      }
      if (/\.html$/.test(schoon)) fouten.push(`${f}: link naar '${h}' met .html; de canonical is extensieloos`);
      const doel = schoon.replace(/^\//, '').replace(/\/$/, '');
      const rd = register.get(doel);
      if (!rd) {
        if (!existsSync(resolve(wortel, doel)) && !bestandSet.has(`${doel}.html`)) fouten.push(`${f}: dode link naar '${h}'`);
      } else if (rd.staat === 'PENDING') {
        fouten.push(`${f}: link naar PENDING-route '${doel}'`);
      }
    }
  }
  return {
    ok: fouten.length === 0,
    meting: `${geteld} interne links in ${htmlBestanden.length} bestanden · ${advies.length} relatieve links op wortelpagina's`,
    details: fouten,
    advies,
  };
});

/* ======================================================= 8 · WEESPAGINA'S */
poort('8  Weespagina\'s', true, () => {
  const inkomend = new Map();
  for (const f of htmlBestanden) {
    const vanRoute = routeVanBestand(f);
    const s = readFileSync(resolve(wortel, f), 'utf8');
    for (const h of alle(/<a\b[^>]*href="([^"]+)"/gi, s)) {
      if (/^(https?:|mailto:|tel:|#|javascript:)/.test(h)) continue;
      const route = h.split('#')[0].split('?')[0].replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '');
      if (route === vanRoute) continue;
      if (!inkomend.has(route)) inkomend.set(route, new Set());
      inkomend.get(route).add(vanRoute);
    }
  }
  /* De homepage is per definitie niet verweesd; 404 hoort nergens gelinkt. */
  const wezen = indexRoutes
    .map((r) => r.route)
    .filter((route) => route !== '')
    .filter((route) => !(inkomend.get(route) || new Set()).size);
  return {
    ok: wezen.length === 0,
    meting: `${indexRoutes.length - 1} pagina's getoetst · ${wezen.length} zonder inkomende statische link`,
    details: wezen.map((w) => `wees: ${w} (alleen bereikbaar via de JS-navigatie of de sitemap)`),
  };
});

/* ======================================================= 9 · SITEMAPPARITEIT */
poort('9  Sitemappariteit', true, () => {
  const fouten = [];
  const xml = readFileSync(resolve(wortel, 'sitemap.xml'), 'utf8');
  const locs = alle(/<loc>([^<]+)<\/loc>/g, xml);
  const inSitemap = new Set(locs);
  const verwacht = new Set(indexRoutes.map((r) => url(r.route)));
  for (const v of verwacht) if (!inSitemap.has(v)) fouten.push(`INDEX-route niet in de sitemap: ${v}`);
  for (const l of inSitemap) if (!verwacht.has(l)) fouten.push(`sitemapregel zonder INDEX-route: ${l}`);
  const zonderLastmod = locs.length - (xml.match(/<lastmod>/g) || []).length;
  if (zonderLastmod !== 0) fouten.push(`${zonderLastmod} sitemapregels zonder lastmod`);
  if (/<priority>/.test(xml)) fouten.push('de sitemap bevat <priority>; dat veld wordt door de zoekmachines genegeerd en suggereert een meting die er niet is');
  const robots = readFileSync(resolve(wortel, 'robots.txt'), 'utf8');
  if (!robots.includes(`${HOST}/sitemap.xml`)) fouten.push('robots.txt verwijst niet naar de sitemap op de www-host');
  return { ok: fouten.length === 0, meting: `${locs.length} sitemapregels tegenover ${verwacht.size} INDEX-routes`, details: fouten };
});

/* ======================================================= 10 · CLAIMS */
poort('10 Ongedekte en verboden claims', true, () => {
  const fouten = [];
  /* Letterlijk uit docs/vibe-claims-register-v2.md, rubriek "Verwijderd". */
  const VERBODEN = [
    [/\b47\s+(opgeleverde\s+)?projecten\b/i, '47 projecten'],
    [/\b12\s*MWp\b/i, '12 MWp'],
    [/\b24\s*MWp\b/i, '24 MWp'],
    [/\b98\s*%\s*(gemiddelde\s*)?uptime\b/i, '98% uptime'],
    [/\buptime\b/i, 'uptime (verboden categorie)'],
    [/\b645\s*kWh\b/i, '645 kWh'],
    [/\+\s*70\s*%\s*netvermogen/i, '+70% netvermogen'],
    [/\b240\s*kW\s*PV\b/i, '240 kW PV'],
    [/−\s*40\s*%|-\s*40\s*%\s*piek/i, '-40% piekreductie'],
    [/\b7\s+waardestromen\b/i, '7 waardestromen'],
    [/\b70\s*[–-]\s*85\s*%/, '70-85% eigen verbruik'],
    [/\bN\s*=\s*\d+\s*(locaties|sites)/i, 'niet-bestaande steekproef (N=)'],
    [/\b14\s+weken\b/i, '14 weken doorlooptijd'],
    [/\b3\s*[–-]\s*4×\s*zoveel/i, '3-4x zoveel laadpunten'],
    [/€\s*1\s*[–-]\s*5\s*mln/i, 'EUR 1-5 mln per locatie'],
    [/\b25\s+jaar\s+vermogensgarantie/i, '25 jaar vermogensgarantie'],
    [/\bTier-?1\b/i, 'Tier-1'],
    [/\bISO\s*\d{4,}/i, 'ISO-certificering'],
    [/\bNEN\s*[-\s]?\d{4}/i, 'NEN-norm'],
    [/\bIEC\s*\d{4,}/i, 'IEC-norm'],
  ];
  /* Scope 12 mag alleen op de bestaande projectpagina's staan, waar het uit de
     brondata komt; niet op een nieuw gegenereerde pagina als eigen claim. */
  const projectSlugs = new Set(projecten.map((p) => p.slug));

  for (const r of indexRoutes) {
    const s = htmlVan(r.route);
    if (!s) continue;
    const isBestaand = !!r.bestaand;
    const tekst = tekstVan(mainVan(s));
    for (const [re, naam] of VERBODEN) {
      if (!re.test(tekst)) continue;
      /* Een bestaande pagina die dit al droeg vóór deze release is een
         bevinding, maar geen regressie van dit werk. Beide worden gemeld,
         met onderscheid. */
      fouten.push(`${r.route}: verboden claim "${naam}"${isBestaand ? ' [stond er al vóór deze release]' : ' [NIEUW — blokkeert]'}`);
    }
    if (!isBestaand && /\bScope\s*12\b/i.test(tekst) && !projectSlugs.has(r.route)) {
      fouten.push(`${r.route}: noemt Scope 12 als eigen claim op een nieuwe pagina [NIEUW — blokkeert]`);
    }
  }
  /* Elk cijfer op een gegenereerde regionale pagina moet een zichtbare
     bronregel in dezelfde sectie hebben. */
  for (const r of indexRoutes.filter((x) => x.soort === 'regio')) {
    const s = htmlVan(r.route);
    if (!s) continue;
    const secties = alle(/<section\b[^>]*>([\s\S]*?)<\/section>/gi, s);
    for (const sec of secties) {
      const t = tekstVan(sec);
      /* Getallen met duizendscheiding of een eenheid: dat zijn beweringen. */
      const heeftCijfer = /\b\d{1,3}\.\d{3}\b|\b\d+\s*(hectare|ha|vestigingen|bedrijventerrein)/i.test(t);
      if (heeftCijfer && !/data-bron/.test(sec)) {
        fouten.push(`${r.route}: een sectie met een cijfer zonder zichtbare bronregel`);
        break;
      }
    }
  }
  const blokkerend = fouten.filter((f) => f.includes('[NIEUW'));
  return {
    ok: blokkerend.length === 0,
    meting: `${fouten.length} bevindingen, waarvan ${blokkerend.length} nieuw en blokkerend`,
    details: fouten,
  };
});

/* ======================================================= 11 · DUPLICAAT */
poort('11 Duplicaat-inhoud tussen gepubliceerde pagina\'s', true, () => {
  const fouten = [];
  const shingles = new Map();
  for (const r of indexRoutes) {
    const s = htmlVan(r.route);
    if (!s) continue;
    const woorden = tekstVan(mainVan(s)).toLowerCase().split(' ').filter(Boolean);
    const set = new Set();
    for (let i = 0; i + 5 <= woorden.length; i++) set.add(woorden.slice(i, i + 5).join(' '));
    shingles.set(r.route, set);
  }
  const lijst = [...shingles.entries()];
  const DREMPEL = 0.6;
  let paren = 0;
  for (let i = 0; i < lijst.length; i++) {
    for (let j = i + 1; j < lijst.length; j++) {
      const [ra, sa] = lijst[i];
      const [rb, sb] = lijst[j];
      if (sa.size < 40 || sb.size < 40) continue;
      paren += 1;
      let gedeeld = 0;
      const klein = sa.size < sb.size ? sa : sb;
      const groot = sa.size < sb.size ? sb : sa;
      for (const sh of klein) if (groot.has(sh)) gedeeld += 1;
      const jaccard = gedeeld / (sa.size + sb.size - gedeeld);
      const dekking = gedeeld / klein.size;
      if (jaccard > DREMPEL || dekking > 0.85) {
        fouten.push(`${ra} en ${rb}: jaccard ${jaccard.toFixed(2)}, overlap ${(dekking * 100).toFixed(0)}% van de kleinste`);
      }
    }
  }
  return { ok: fouten.length === 0, meting: `${paren} paren vergeleken op 5-woordreeksen, drempel jaccard ${DREMPEL}`, details: fouten };
});

/* ======================================================= 12 · KANNIBALISATIE */
poort('12 Kannibalisatie: dubbele titels en koppen', true, () => {
  const fouten = [];
  const perTitel = new Map();
  const perH1 = new Map();
  for (const r of indexRoutes) {
    const s = htmlVan(r.route);
    if (!s) continue;
    const titel = (een(/<title>([\s\S]*?)<\/title>/i, s) || '').trim();
    const h1 = (een(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i, s) || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (titel) {
      if (perTitel.has(titel)) fouten.push(`dezelfde <title> op ${perTitel.get(titel)} en ${r.route}`);
      perTitel.set(titel, r.route);
    }
    if (h1) {
      if (perH1.has(h1)) fouten.push(`dezelfde H1 op ${perH1.get(h1)} en ${r.route}`);
      perH1.set(h1, r.route);
    }
  }
  return { ok: fouten.length === 0, meting: `${perTitel.size} unieke titels en ${perH1.size} unieke H1's op ${indexRoutes.length} pagina's`, details: fouten };
});

/* ======================================================= 13 · CONVERSIE */
poort('13 Conversiepaden', true, () => {
  const fouten = [];
  const BOEKING = 'calendly.com/vibeenergy-sales/30min';
  /* Het formulier op contact.html moet een backend hebben; dit script
     verifieert het bestaan van de verwijzing, niet de werking van de dienst. */
  const contact = htmlVan('contact');
  if (!contact) fouten.push('contact.html ontbreekt');
  else {
    if (!/<form/.test(contact)) fouten.push('contact.html heeft geen <form>');
    if (!/api\/public\/site\/lead/.test(contact)) fouten.push('contact.html noemt het lead-endpoint niet');
  }
  /* Elke commerciële en regionale pagina moet een weg naar conversie hebben. */
  const commercieel = indexRoutes.filter(
    (r) => r.soort === 'regio' || ['oplossing', 'sector', 'toepassing', 'subsidie', 'hub'].includes(r.subsoort)
  );
  for (const r of commercieel) {
    const s = htmlVan(r.route);
    if (!s) continue;
    const m = mainVan(s);
    /* Zowel /contact als het relatieve contact telt: de bestaande pagina's
       staan in de wortel en gebruiken de relatieve vorm. */
    if (!/href="\/?contact"/.test(m) && !m.includes(BOEKING)) fouten.push(`${r.route}: geen link naar contact en geen boekings-CTA in <main>`);
  }
  return { ok: fouten.length === 0, meting: `${commercieel.length} commerciële pagina's getoetst · formulier en lead-endpoint aanwezig`, details: fouten };
});

/* ======================================================= 14 · MOBIEL */
poort('14 Mobiele regressierisico\'s', true, () => {
  const fouten = [];
  for (const r of indexRoutes.filter((x) => !x.bestaand)) {
    const s = htmlVan(r.route);
    if (!s) continue;
    if (!/<meta name="viewport" content="width=device-width,initial-scale=1">/.test(s)) fouten.push(`${r.route}: viewport-meta ontbreekt of wijkt af`);
    /* Een vaste pixelbreedte in een inline stijl is de klassieke oorzaak van
       horizontaal schuiven op een telefoon. */
    const vast = [...s.matchAll(/style="[^"]*width:\s*(\d{3,})px/gi)].map((m) => m[1]);
    if (vast.length) fouten.push(`${r.route}: ${vast.length} inline vaste breedte(s) (${vast.slice(0, 3).join(', ')}px)`);
    if (/<table/.test(s) && !/ve-scroll-x/.test(s)) fouten.push(`${r.route}: <table> zonder ve-scroll-x om hem te laten schuiven`);
  }
  return { ok: fouten.length === 0, meting: `${indexRoutes.filter((x) => !x.bestaand).length} nieuwe pagina's getoetst`, details: fouten };
});

/* ======================================================= 15 · PROJECTEN */
poort('15 Projectverwijzingen', true, () => {
  const fouten = [];
  const slugs = new Set(projecten.map((p) => p.slug));
  for (const r of indexRoutes.filter((x) => !x.bestaand)) {
    const s = htmlVan(r.route);
    if (!s) continue;
    for (const h of alle(/href="\/(project-[a-z0-9-]+)"/gi, s)) {
      if (!slugs.has(h)) fouten.push(`${r.route}: verwijst naar een niet-bestaand project '${h}'`);
    }
  }
  /* Elke projectroute waarnaar een regionale pagina verwijst, moet in die
     gemeente liggen volgens data/bewijs/projecten-geo.json. */
  for (const r of indexRoutes.filter((x) => x.subsoort === 'gemeente' || x.subsoort === 'gemeente-familie')) {
    const s = htmlVan(r.route);
    if (!s) continue;
    const hier = new Set((projGeo[r.gemeentecode] || []).map((p) => p.slug));
    const sectie = een(/<section[^>]*>([\s\S]*?Opgeleverd in[\s\S]*?)<\/section>/i, s) || een(/<section[^>]*>([\s\S]*?Het bewijs in[\s\S]*?)<\/section>/i, s) || '';
    for (const h of alle(/href="\/(project-[a-z0-9-]+)"/gi, sectie)) {
      if (!hier.has(h)) fouten.push(`${r.route}: noemt project '${h}' als lokaal bewijs, maar dat ligt niet in deze gemeente`);
    }
  }
  return { ok: fouten.length === 0, meting: `${slugs.size} echte projecten · verwijzingen op ${indexRoutes.filter((x) => !x.bestaand).length} nieuwe pagina's`, details: fouten };
});

/* ============================================================== rapport */
const breedte = 52;
console.log('');
console.log('VIBE ENERGY — SEO/GEO-POORT');
console.log('='.repeat(96));
console.log(`${'poort'.padEnd(breedte)} ${'uitslag'.padEnd(8)} meting`);
console.log('-'.repeat(96));
let gefaald = 0;
for (const p of poorten) {
  const uitslag = p.ok ? 'PASS' : 'FAIL';
  if (!p.ok && p.verplicht) gefaald += 1;
  console.log(`${p.naam.padEnd(breedte)} ${uitslag.padEnd(8)} ${p.meting}`);
}
console.log('-'.repeat(96));

/* Ook een poort die PASS geeft kan bevindingen hebben die niet blokkeren —
   bijvoorbeeld een verboden claim die al vóór deze release op de site stond.
   Die worden hier altijd getoond; stilzwijgend doorlaten zou de poort een
   vals gevoel van schoon geven. */
for (const p of poorten) {
  if (p.ok && !(p.advies || []).length && !(p.details || []).length) continue;
  console.log('');
  console.log(`### ${p.naam} — ${p.ok ? 'PASS met opmerkingen' : 'FAIL'}`);
  const d = p.details || [];
  for (const x of d.slice(0, 40)) console.log(`  · ${x}`);
  if (d.length > 40) console.log(`  · ... en nog ${d.length - 40} regels`);
  for (const x of (p.advies || []).slice(0, 15)) console.log(`  [advies] ${x}`);
  if ((p.advies || []).length > 15) console.log(`  [advies] ... en nog ${p.advies.length - 15} regels`);
}

console.log('');
console.log(`EINDOORDEEL POORT = ${gefaald === 0 ? 'PASS' : `FAIL (${gefaald} verplichte poorten)`}`);
process.exit(gefaald === 0 ? 0 : 1);
