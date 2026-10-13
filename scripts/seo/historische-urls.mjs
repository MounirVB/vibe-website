#!/usr/bin/env node
/* ============================================================================
   VIBE ENERGY — CLASSIFICATOR EN INVENTARISRAPPORT VOOR HISTORISCHE URL'S
   ----------------------------------------------------------------------------
     node scripts/seo/historische-urls.mjs            samenvatting + te doen
     node scripts/seo/historische-urls.mjs --alles     alle rijen als tabel
     node scripts/seo/historische-urls.mjs --csv       alle rijen als CSV
     node scripts/seo/historische-urls.mjs --json      alle rijen als JSON
     node scripts/seo/historische-urls.mjs --familie <naam>
     node scripts/seo/historische-urls.mjs --actie <ACTIE>

   Dit is een RAPPORT, geen poort. Het leest alleen: data/seo/routes.json,
   data/seo/historische-urls.json, de HTML in de werkboom en de drie sitemaps.
   Het schrijft niets. Exitcode 0 is dus geen vrijbrief en een rij met
   REQUIRES_REVIEW is geen fout maar werk.

   WAAROM HET BESTAAT

   Google rapporteert 7.728 niet-gevonden URL's; die lijst bestaat alleen in
   Search Console. Zonder export classificeert dit script de inventarissen die
   wel GEMETEN zijn — de 430 canonieke pagina's, de 16 doorverwijsstubs, de
   172 gearchiveerde Wayback-URL's en de 13 oude sitemapeindpunten — en zegt
   het van de GSC-inventaris expliciet NOT_AVAILABLE. Met een export
   (scripts/seo/gsc-import.mjs) rolt diezelfde beslissingsmotor over de
   geïmporteerde URL's heen.

   WAAROM DE CONTROLES WEIGEREN IN PLAATS VAN WAARSCHUWEN

   Een verkeerde 301 is duurder dan een 404: de 404 verliest één URL, de
   verkeerde 301 verplaatst het signaal van die URL naar een pagina waar het
   niet hoort en laat de bezoeker op iets anders landen dan hij zocht. Daarom
   staan de verboden (geen homepage-verzamelbak, geen onverwante bestemming,
   geen PENDING, geen noindex, geen keten, geen lus) in de code als controles
   C1 tot C10 en niet in een leesinstructie. Een voorstel dat er een schendt
   krijgt GEEN bestemming. Komt het voorstel van een mens — uit
   handle_afbeelding of uit een familieregel — dan faalt dit script met
   exitcode 3, want dan is er een besluit opgeschreven dat niet uitvoerbaar is.

   DE 15 KOLOMMEN

   De opdracht eist vijftien kolommen; die staan hieronder in KOLOMMEN en in
   die volgorde. Er komen twee kolommen bij: `seo_risico` (de opdracht eist dat
   per URL, maar niet als kolom) en `uitvoering` (wat de actie in deze
   repository kost: niets, een hostregel die hier niet bestaat, een redactie,
   of een handmatige stap in Search Console). Een lege cel bestaat niet: elke
   kolom draagt een waarde, of NOT_AVAILABLE, of ONBEKEND.
   ============================================================================ */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST, url as urlVan, bestand } from './lib/paden.mjs';
import { normaliseerUrl, HOOFDHOST, GSC_AFKAPGRENS } from './gsc-import.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const WORTEL = resolve(hier, '..', '..');
const lees = (...p) => JSON.parse(readFileSync(resolve(WORTEL, ...p), 'utf8'));

const reg = lees('data', 'seo', 'routes.json');
const hist = lees('data', 'seo', 'historische-urls.json');

const ACTIES = [
  'KEEP', 'FIX_TECHNICAL', 'IMPROVE_CONTENT', 'IMPROVE_LINKING', 'REDIRECT_301',
  'RETURN_404', 'RETURN_410', 'CANONICALIZE', 'NOINDEX', 'REMOVE_FROM_SITEMAP', 'REQUIRES_REVIEW',
];

export const KOLOMMEN = [
  'volledige_url', 'genormaliseerd_pad', 'broninventaris', 'http_status', 'redirectbestemming',
  'canonical', 'robots_richtlijn', 'sitemaplidmaatschap', 'interne_inkomende_links', 'paginafamilie',
  'historisch_bewijs', 'zoekprestatie', 'aanbevolen_actie', 'reden', 'vertrouwen',
  /* twee kolommen extra, zie de kop */
  'seo_risico', 'uitvoering',
];

/* ================================================= DE GEMETEN SITESTAND === */

const register = new Map(reg.routes.map((r) => [r.route, r]));
const telPerStaat = { INDEX: 0, NOINDEX: 0, PENDING: 0 };
for (const r of reg.routes) telPerStaat[r.staat] = (telPerStaat[r.staat] || 0) + 1;

/* De productiemeting verloopt zichzelf. Wijkt het register af van wat op
   13 oktober 2026 is gemeten, dan mag dit script "200 GEMETEN" niet meer
   zeggen; het zegt dan "200 AFGELEID" met de reden erbij. */
const pm = hist.productiemeting;
const metingGeldig =
  telPerStaat.INDEX === pm.aantal_index &&
  telPerStaat.NOINDEX === pm.aantal_noindex &&
  telPerStaat.PENDING === pm.aantal_pending;

function alleHtml() {
  const uit = [];
  const loop = (map, prefix) => {
    for (const d of readdirSync(map, { withFileTypes: true })) {
      if (['.git', 'node_modules', 'docs', 'api', 'scripts', 'data', 'intelligence', 'review', 'new-pages'].includes(d.name)) continue;
      const p = join(map, d.name);
      if (d.isDirectory()) loop(p, `${prefix}${d.name}/`);
      else if (d.name.endsWith('.html')) uit.push(`${prefix}${d.name}`);
    }
  };
  loop(WORTEL, '');
  return uit.sort();
}
const htmlBestanden = alleHtml();
const routeVanBestand = (f) => (f === 'index.html' ? '' : f.replace(/\.html$/, ''));

/* Interne inkomende links: GEMETEN in deze werkboom, niet overgenomen uit een
   eerdere crawl. Geteld worden ONDERSCHEIDEN bronpagina's, niet links: drie
   links vanaf dezelfde pagina zijn één ingang. Dezelfde telwijze als poort 8
   van scripts/seo/audit.mjs, zodat de twee niet uit elkaar lopen. */
const inkomend = new Map();
for (const f of htmlBestanden) {
  const vanRoute = routeVanBestand(f);
  const s = readFileSync(resolve(WORTEL, f), 'utf8');
  for (const m of s.matchAll(/<a\b[^>]*href="([^"]+)"/gi)) {
    const h = m[1];
    if (/^(https?:|mailto:|tel:|#|javascript:)/.test(h)) continue;
    const route = h.split('#')[0].split('?')[0].replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '');
    if (route === vanRoute) continue;
    if (!inkomend.has(route)) inkomend.set(route, new Set());
    inkomend.get(route).add(vanRoute);
  }
}
const ingangen = (route) => (inkomend.get(route)?.size ?? 0);

/* Sitemaplidmaatschap: GEMETEN uit de drie sitemapbestanden in de werkboom. */
const sitemapVan = new Map();
const sitemapBestanden = [];
if (existsSync(resolve(WORTEL, 'sitemap.xml'))) {
  const index = readFileSync(resolve(WORTEL, 'sitemap.xml'), 'utf8');
  for (const m of index.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const naam = m[1].replace(`${HOST}/`, '');
    if (existsSync(resolve(WORTEL, naam))) sitemapBestanden.push(naam);
  }
  for (const naam of sitemapBestanden) {
    const xml = readFileSync(resolve(WORTEL, naam), 'utf8');
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapVan.set(m[1], naam);
  }
}

/* Canonical en robots-richtlijn: GEMETEN uit de HTML in de werkboom. */
const paginaCache = new Map();
function paginaFeiten(route) {
  if (paginaCache.has(route)) return paginaCache.get(route);
  const p = resolve(WORTEL, bestand(route));
  let feiten = { bestaat: false, canonical: 'NOT_AVAILABLE', robots: 'NOT_AVAILABLE' };
  if (existsSync(p)) {
    const s = readFileSync(p, 'utf8');
    feiten = {
      bestaat: true,
      canonical: (s.match(/<link rel="canonical" href="([^"]*)"/i) || [])[1] || 'ONTBREEKT',
      robots: (s.match(/<meta name="robots" content="([^"]*)"/i) || [])[1] || 'ONTBREEKT',
    };
  }
  paginaCache.set(route, feiten);
  return feiten;
}

/* De doorverwijsstubs en hun GEMETEN opvolger. Dit is de enige bron voor een
   301 naar de opvolger van een opgegane URL: de canonical in de stub zelf.
   Kan hij niet gelezen worden, dan bestaat de afbeelding niet — faalgesloten,
   want een geraden opvolger is erger dan geen opvolger. */
const stubOpvolger = new Map();
for (const r of reg.routes) {
  if (r.staat !== 'NOINDEX' || r.subsoort !== 'doorverwijsstub') continue;
  const f = paginaFeiten(r.route);
  if (!f.bestaat || !f.canonical.startsWith(HOST)) continue;
  const doel = f.canonical.slice(HOST.length).replace(/^\//, '').replace(/\/$/, '');
  if (doel) stubOpvolger.set(r.route, doel);
}

/* ================================================ FAMILIES HERKENNEN ===
   Eerste treffer wint; de volgorde in data/seo/historische-urls.json is dus
   betekenisvol. /cdn/shop staat vóór de algemene /cdn-regel en vóór de
   eigen-assetregel, anders zou een Shopify-themabestand dat op .css eindigt
   als eigen bestand worden beoordeeld. */
function familieVan(pad) {
  for (const f of hist.familieregels) {
    if (f.soort === 'segment-prefix') {
      if (pad === f.patroon || pad.startsWith(`${f.patroon}/`)) return f;
    } else if (f.soort === 'regex') {
      if (new RegExp(f.patroon, 'i').test(pad)) return f;
    } else if (f.soort === 'lijst') {
      if ((hist[f.patroon]?.status_404 || []).includes(pad)) return f;
    }
  }
  return null;
}

/* ============================================ BESTEMMINGEN CONTROLEREN ===
   C1 tot C10 staan met reden in data/seo/historische-urls.json onder
   `controles`. C6 (keten) en C9 (verzamelbak) kunnen pas als ALLE voorstellen
   bekend zijn; die lopen in een tweede ronde. */
const HERKOMST_ONDERBOUWD = ['SLUG_GELIJK', 'STUB_CANONICAL_GEMETEN', 'TABEL_MET_REDEN', 'FAMILIEREGEL_MET_REDEN'];
const HERKOMST_DOOR_MENS = ['TABEL_MET_REDEN', 'FAMILIEREGEL_MET_REDEN'];

/* `bronVorm` is de URL ZOALS GERAPPORTEERD, niet de genormaliseerde. Dat
   verschil is hier het hele punt: /contact/ en /contact zijn na normalisatie
   dezelfde URL, maar een 301 van de eerste naar de tweede is geen lus — hij
   is precies de reparatie die de gemeten 404 op de slashvariant oplost. Op de
   genormaliseerde vorm toetsen maakte van die reparatie een lus (C7) en van
   /contact een doorverwijsbron, waardoor /pages/contact vervolgens vals op
   een keten (C6) sneuvelde. Beide zijn in een eigen proef gebeurd. */
function keurBestemming(bronVorm, bestemmingRoute, herkomst) {
  const blokkades = [];
  const route = String(bestemmingRoute ?? '').replace(/^\//, '').replace(/\/$/, '');
  if (!HERKOMST_ONDERBOUWD.includes(herkomst)) blokkades.push(`C8_ONDERBOUWD (herkomst ${herkomst})`);
  if (hist.verboden_bestemmingen.includes(route)) blokkades.push('C10_NIET_VERBODEN');
  if (route === '') blokkades.push('C1_GEEN_HOMEPAGE');
  const r = register.get(route);
  if (!r) blokkades.push('C2_IN_REGISTER');
  else {
    if (r.staat === 'PENDING') blokkades.push('C3_NIET_PENDING');
    if (r.staat === 'NOINDEX') blokkades.push('C4_NIET_NOINDEX');
  }
  if (!paginaFeiten(route).bestaat) blokkades.push('C5_HEEFT_BESTAND');
  if (urlVan(route) === bronVorm) blokkades.push('C7_GEEN_LUS');
  return { ok: blokkades.length === 0, route, herkomst, blokkades };
}

/** De route waarvan deze bronvorm EXACT de canonieke URL is. Een slash- of
 *  .html-variant levert hier niets op: die vorm is geen canonieke route en
 *  mag dus ook niet als doorverwijsbron in de ketencontrole meetellen. */
function routeVanBronVorm(bronVorm) {
  if (!bronVorm.startsWith(HOST)) return null;
  const pad = bronVorm.slice(HOST.length);
  const route = pad === '/' ? '' : pad.replace(/^\//, '');
  return urlVan(route) === bronVorm ? route : null;
}

/* =============================================== VERTROUWEN COMBINEREN ===
   Het zwakste bewijs in een rij bepaalt het vertrouwen van de hele rij. Een
   gemeten 404 op een afgeleide familie blijft INFERRED: dat de familie zo
   heet is dan nog steeds niet gemeten. */
const LADDER = ['MEASURED', 'INFERRED', 'UNVERIFIED', 'NOT_AVAILABLE'];
const zwakste = (...labels) => LADDER[Math.max(...labels.filter(Boolean).map((l) => LADDER.indexOf(l)).filter((i) => i >= 0))] || 'UNVERIFIED';

/* ===================================================== DE INVENTARISSEN ===
   Alles wat we van een URL weten komt hier samen, met per URL welke
   inventarissen hem noemen.

   De live steekproef eerst: veertien URL's, één per familie, GEMETEN. Staat
   een URL erin, dan mag zijn statuskolom MEASURED dragen in plaats van
   AFGELEID. */
const steekproefStatus = new Map(
  (hist.gemeten_steekproef?.metingen || []).map((m) => {
    const n = normaliseerUrl(m.url);
    return [n.ok ? n.url : m.url, m.status];
  })
);

/* Gesleuteld op de GERAPPORTEERDE vorm (zie normaliseerUrl): /contact/ en
   /contact zijn twee rijen, want het zijn twee requests met twee gemeten
   antwoorden. Dezelfde vorm uit twee inventarissen is wél één rij met twee
   bronnen — /over-ons staat zowel in het routeregister als in het
   Wayback-archief en is één URL, niet twee. */
const perUrl = new Map();
const genegeerd = [];
function voegToe(ruweUrl, bron, extra = {}) {
  const n = normaliseerUrl(ruweUrl);
  if (!n.ok) {
    /* Niet stil overslaan: een inventarisregel die geen URL blijkt, is een
       fout in de bron en moet in het rapport staan, niet verdwijnen. */
    genegeerd.push({ bron, ruw: String(ruweUrl), fout: n.fout });
    return;
  }
  const bestaand = perUrl.get(n.sleutel);
  if (!bestaand) {
    perUrl.set(n.sleutel, { n, bronnen: new Set([bron]), ...extra });
    return;
  }
  bestaand.bronnen.add(bron);
  for (const [k, v] of Object.entries(extra)) {
    if (bestaand[k] === undefined) bestaand[k] = v;
    else if (Array.isArray(bestaand[k]) && Array.isArray(v)) bestaand[k].push(...v);
  }
}

for (const r of reg.routes) {
  if (r.staat === 'PENDING') continue; // 4.254 routes zonder bestand en zonder sitemapregel; als aggregaat gerapporteerd
  voegToe(urlVan(r.route), r.staat === 'INDEX' ? 'ROUTEREGISTER_INDEX' : 'ROUTEREGISTER_NOINDEX', { registerRoute: r.route });
}
for (const rij of hist.wayback_inventaris.rijen) {
  voegToe(rij[0], 'WAYBACK', { wayback: [{ timestamp: rij[1], status: rij[2], mime: rij[3] }] });
}
for (const pad of hist.legacy_sitemapeindpunten.status_404) {
  voegToe(`${HOST}${pad}`, 'LEGACY_SITEMAPEINDPUNT', {});
}
const gsc = hist.gsc_inventaris || { _status: 'NOT_AVAILABLE', urls: [] };
for (const g of gsc.urls || []) {
  voegToe(g.ruwe_url || g.url, 'GSC_EXPORT', { gsc: g });
}

/* ======================================================= CLASSIFICEREN === */

function prestatieVan(g) {
  if (!g || (g.klikken === null && g.vertoningen === null)) return 'NOT_AVAILABLE';
  const d = (x, s = '') => (x === null || x === undefined ? 'ONBEKEND' : `${x}${s}`);
  return `klikken ${d(g.klikken)} · vertoningen ${d(g.vertoningen)} · ctr ${g.ctr === null ? 'ONBEKEND' : `${Math.round(g.ctr * 1000) / 10}%`} · positie ${d(g.positie)}`;
}

function redenregelVan(redenTekst) {
  if (!redenTekst || redenTekst === 'ONBEKEND') return null;
  for (const r of hist.gsc_redenregels) {
    if (new RegExp(r.patroon, 'i').test(redenTekst)) return r;
  }
  return null;
}

const UITVOERING = {
  KEEP: 'GEEN ACTIE NODIG',
  RETURN_404: 'GEEN ACTIE NODIG',
  RETURN_410: hist.hostgedrag.kan_410_per_pad
    ? 'VEREIST HOSTREGEL'
    : 'NIET UITVOERBAAR — een 410 per pad is op de staticfile-provider niet te configureren (gemeten: geen Caddyfile, nginx.conf, _redirects of static.json in de repository). 404 heeft voor Google vrijwel hetzelfde effect.',
  REDIRECT_301: 'VEREIST HOSTREGEL — bestaat vandaag niet in deze repository (gemeten: geen Caddyfile, nginx.conf, _redirects of static.json); het alternatief dat de repo wel heeft is een doorverwijsstub: 200 met noindex, canonical en meta-refresh',
  CANONICALIZE: 'VEREIST PAGINAWIJZIGING',
  NOINDEX: 'VEREIST PAGINAWIJZIGING',
  REMOVE_FROM_SITEMAP: 'VEREIST SITEMAPWIJZIGING (node scripts/seo/sitemap.mjs)',
  IMPROVE_CONTENT: 'VEREIST REDACTIE',
  IMPROVE_LINKING: 'VEREIST INTERNE LINKS',
  FIX_TECHNICAL: 'VEREIST TECHNISCHE INGREEP',
  REQUIRES_REVIEW: 'VEREIST BESLUIT',
};

/** Classificeer één URL. Levert exact één actie en, als die een bestemming
 *  heeft, een voorstel dat in ronde twee nog op keten en verzamelbak wordt
 *  getoetst. */
function classificeer(rij) {
  const { n } = rij;
  const pad = n.pad;
  const bronnen = [...rij.bronnen].sort().join('+');
  const g = rij.gsc || null;
  const redenregel = redenregelVan(g?.reden);

  const basis = {
    /* De gerapporteerde vorm in kolom 1, de canonieke vorm in kolom 2. Dat is
       waarom de opdracht die twee kolommen naast elkaar eist. */
    volledige_url: n.sleutel,
    genormaliseerd_pad: pad + (n.query || ''),
    broninventaris: bronnen,
    redirectbestemming: 'NIET VAN TOEPASSING',
    canonical: 'NOT_AVAILABLE',
    robots_richtlijn: 'NOT_AVAILABLE',
    sitemaplidmaatschap: sitemapVan.get(n.sleutel) || 'NEE',
    interne_inkomende_links: 0,
    historisch_bewijs: 'GEEN',
    zoekprestatie: prestatieVan(g),
  };

  /* Historisch bewijs: wat weten we over het verleden van deze URL? */
  const bewijsdelen = [];
  if (rij.wayback?.length) {
    const ts = rij.wayback.map((w) => w.timestamp).sort();
    bewijsdelen.push(`WAYBACK ${rij.wayback.length}x, eerst ${ts[0].slice(0, 4)}-${ts[0].slice(4, 6)}-${ts[0].slice(6, 8)} (status ${[...new Set(rij.wayback.map((w) => w.status))].join('/')})`);
  }
  if (rij.bronnen.has('LEGACY_SITEMAPEINDPUNT')) bewijsdelen.push('LEGACY SITEMAPEINDPUNT, gemeten 404 op 2026-10-13');
  if (g) bewijsdelen.push(`GSC-EXPORT reden "${g.reden}", laatst gecrawld ${g.laatst_gecrawld}`);
  if (bewijsdelen.length) basis.historisch_bewijs = bewijsdelen.join(' · ');

  /* ---- 0. Andere host dan de hoofdhost. */
  if (n.buiten_hoofdhost) {
    return {
      ...basis,
      http_status: 'ONBEKEND (niet gemeten)',
      paginafamilie: 'andere-host',
      aanbevolen_actie: 'REQUIRES_REVIEW',
      reden: `Deze URL staat op ${n.host} en niet op ${HOOFDHOST}. Dat is een andere dienst, niet deze statische site; deze repository kan er niets aan veranderen. Wie hem beheert en of hij nog draait, is in deze sessie NIET gemeten.`,
      vertrouwen: 'UNVERIFIED',
      seo_risico: 'ONBEKEND',
      uitvoering: 'VEREIST BESLUIT (buiten deze repository)',
    };
  }

  /* ---- 1. Een pagina die vandaag bestaat en gepubliceerd is, gaat vóór elke
     familieregel. Een gemeten bestaande pagina mag nooit een 404-advies
     krijgen omdat zijn pad op een Shopify-familie lijkt. */
  let route = pad === '/' ? '' : pad.slice(1);
  let viaHtml = false;
  if (/\.html$/i.test(route)) {
    const zonder = route.replace(/\.html$/i, '');
    const kandidaat = zonder === 'index' ? '' : zonder;
    if (register.has(kandidaat)) { route = kandidaat; viaHtml = true; }
  }
  const r = register.get(route);
  const feiten = paginaFeiten(route);

  if (r && feiten.bestaat) {
    basis.canonical = feiten.canonical;
    basis.robots_richtlijn = feiten.robots;
    basis.interne_inkomende_links = ingangen(route);
    /* De sitemap draagt de canonieke vorm. Voor een slash-, .html- of
       parametervariant is het antwoord dus NEE, met de vindplaats van de
       canonieke vorm erachter — anders leest de kolom als "staat er wel in"
       voor een URL die er niet in staat. */
    const inSitemap = sitemapVan.has(n.sleutel);
    basis.sitemaplidmaatschap = inSitemap
      ? sitemapVan.get(n.sleutel)
      : sitemapVan.has(urlVan(route))
        ? `NEE — deze vorm niet; de canonieke vorm staat in ${sitemapVan.get(urlVan(route))}`
        : 'NEE';
    const statusBewijs = metingGeldig && r.staat === 'INDEX' ? 'MEASURED' : 'INFERRED';
    const status = route === '404'
      ? 'ONBEKEND (de foutpagina zelf is niet als URL gemeten)'
      : `200 (${statusBewijs === 'MEASURED' ? `GEMETEN — ${pm.live_200} canonieke URL's gaven alle HTTP 200 op ${pm.gemeten_op}` : `AFGELEID — het routeregister wijkt af van de meting van ${pm.gemeten_op}`})`;

    /* 1a. De slashvariant. GEMETEN: /x/ geeft 404 terwijl /x 200 geeft. Dit is
       de enige groep waar een 301 technisch nodig is in plaats van netjes. */
    if (n.had_afsluitende_streep && route !== '') {
      return {
        ...basis,
        http_status: `404 op de slashvariant (GEMETEN hostgedrag ${pm.gemeten_op}: /x/ geeft 404, /x geeft 200)`,
        paginafamilie: 'slashvariant-van-bestaande-pagina',
        aanbevolen_actie: 'REDIRECT_301',
        voorstel: { route, herkomst: 'SLUG_GELIJK', doorMens: false, bronVorm: `${urlVan(route)}/` },
        reden: `De pagina bestaat en geeft 200 op ${urlVan(route)}, maar de gerapporteerde vorm eindigt op een schuine streep en die geeft GEMETEN een 404. Een 301 van de slashvariant naar de canonieke URL herstelt de URL zonder een nieuwe pagina te maken. Zonder hostregel blijft dit een verloren URL.`,
        vertrouwen: zwakste('MEASURED', statusBewijs),
        seo_risico: 'MIDDEL',
      };
    }

    /* 1b. De .html-tweeling en de parametervariant. Beide geven 200 en worden
       al door de gemeten zelfverwijzende canonical afgehandeld. */
    if (viaHtml || n.query) {
      const juist = feiten.canonical === urlVan(route);
      return {
        ...basis,
        http_status: `200 (GEMETEN: ${viaHtml ? `de .html-tweeling geeft 200 op ${pm.html_tweelingen_200} paden` : 'parametervarianten worden door de host genegeerd en leveren dezelfde pagina'})`,
        paginafamilie: viaHtml ? 'html-tweeling-van-bestaande-pagina' : 'parametervariant-van-bestaande-pagina',
        aanbevolen_actie: 'CANONICALIZE',
        reden: `${viaHtml ? 'De .html-vorm' : 'De parametervorm'} van een bestaande pagina. ${juist ? `De canonical op die pagina wijst GEMETEN naar ${urlVan(route)}, dus het dubbelingsrisico is al afgedekt en er hoeft niets te gebeuren.` : `De canonical op die pagina is "${feiten.canonical}" en wijst NIET naar ${urlVan(route)}; dat moet eerst recht voordat deze vorm veilig is.`}`,
        vertrouwen: zwakste('MEASURED', statusBewijs),
        seo_risico: juist ? 'LAAG' : 'MIDDEL',
        uitvoering: juist ? `GEEN ACTIE NODIG (de gemeten canonical wijst al naar ${urlVan(route)})` : 'VEREIST PAGINAWIJZIGING',
      };
    }

    /* 1c. Een NOINDEX-route. De 16 doorverwijsstubs doen precies wat ze moeten
       doen; alleen een stub die tóch in de sitemap staat is een fout. */
    if (r.staat === 'NOINDEX') {
      const opvolger = stubOpvolger.get(route);
      return {
        ...basis,
        http_status: `200 (GEMETEN: alle 16 doorverwijsstubs gaven 200 met noindex, follow op ${pm.gemeten_op})`,
        paginafamilie: r.subsoort === 'doorverwijsstub' ? 'doorverwijsstub' : 'foutpagina',
        aanbevolen_actie: inSitemap ? 'REMOVE_FROM_SITEMAP' : 'KEEP',
        reden: inSitemap
          ? `Deze route staat op NOINDEX en staat tóch in ${basis.sitemaplidmaatschap}. Een sitemap die een noindex-URL aanbiedt geeft twee tegengestelde signalen; de sitemap moet herbouwd worden.`
          : r.subsoort === 'doorverwijsstub'
            ? `Doorverwijsstub die doet wat hij moet doen: 200 zodat oude links en zoekresultaten niet doodlopen, noindex zodat hij niet met zijn opvolger concurreert, en een canonical naar ${opvolger ? `/${opvolger}` : 'de opvolger'}. Staat 0 keer in de sitemap. Niet weghalen: dan verdwijnt de enige brug van die oude URL.`
            : 'Foutpagina. Hoort nooit in de sitemap en nooit in een canonical, en heeft geen opvolger.',
        vertrouwen: 'MEASURED',
        seo_risico: inSitemap ? 'MIDDEL' : 'LAAG',
      };
    }

    /* 1d. Een bestaande, gepubliceerde pagina. De reden uit de export mag hier
       de actie overnemen: het is de enige plek waar Google iets weet dat wij
       niet kunnen meten. Zonder export blijft het KEEP of IMPROVE_LINKING.
       Rangorde, hoogste eerst: FIX_TECHNICAL, IMPROVE_CONTENT,
       IMPROVE_LINKING, CANONICALIZE, KEEP. */
    const telIngangen = basis.interne_inkomende_links;
    const teWeinigIngangen = route !== '' && telIngangen < hist.drempels.min_interne_ingangen;
    let actie = 'KEEP';
    let reden = `Bestaande, gepubliceerde pagina: ${metingGeldig ? 'GEMETEN' : 'volgens het register'} 200, canonical "${feiten.canonical}", robots "${feiten.robots}", ${basis.sitemaplidmaatschap === 'NEE' ? 'NIET in de sitemap' : `in ${basis.sitemaplidmaatschap}`}, ${telIngangen} interne ingang(en). Er is geen reden om aan deze URL te komen.`;
    let risico = 'LAAG';

    if (r.staat === 'INDEX' && /noindex/i.test(feiten.robots)) {
      actie = 'FIX_TECHNICAL';
      reden = `Het register zet deze route op INDEX maar de pagina draagt robots "${feiten.robots}". Twee tegengestelde signalen; de pagina wordt niet opgenomen zolang dit zo staat.`;
      risico = 'HOOG';
    } else if (r.staat === 'INDEX' && basis.sitemaplidmaatschap === 'NEE') {
      actie = 'FIX_TECHNICAL';
      reden = 'Het register zet deze route op INDEX en de pagina bestaat, maar hij staat in geen enkele sitemap. Draai scripts/seo/sitemap.mjs; de sitemap wordt uit het register gebouwd, dus dit hoort niet voor te komen.';
      risico = 'MIDDEL';
    } else if (redenregel && redenregel.actie !== 'VOLG_REGISTER') {
      const gekozen = redenregel.actie === 'IMPROVE_CONTENT_OF_LINKING'
        ? (teWeinigIngangen ? 'IMPROVE_LINKING' : 'IMPROVE_CONTENT')
        : redenregel.actie;
      actie = gekozen;
      reden = `Search Console meldt "${g.reden}" voor een pagina die vandaag bestaat en 200 geeft. ${redenregel.reden}${gekozen === 'IMPROVE_LINKING' ? ` Gemeten: ${telIngangen} interne ingang(en), onder de drempel van ${hist.drempels.min_interne_ingangen}.` : ''}${gekozen === 'IMPROVE_CONTENT' ? ` Gemeten: ${telIngangen} interne ingang(en), dus ontdekking is niet het probleem.` : ''}`;
      risico = redenregel.seo_risico;
    } else if (g && g.vertoningen !== null && g.vertoningen >= hist.drempels.vertoningen_zonder_klik && g.klikken === 0) {
      actie = 'IMPROVE_CONTENT';
      reden = `Gemeten in de export: ${g.vertoningen} vertoningen en 0 klikken${g.positie === null ? '' : `, gemiddelde positie ${g.positie}`}. De pagina wordt gevonden maar niet gekozen; dat is een titel-, description- of inhoudsprobleem, geen technisch probleem.`;
      risico = 'MIDDEL';
    } else if (teWeinigIngangen) {
      actie = 'IMPROVE_LINKING';
      reden = `Bestaande pagina met ${telIngangen} interne ingang(en), onder de beleidsdrempel van ${hist.drempels.min_interne_ingangen}. Gemeten is dat er 0 weespagina's zijn; dit is de laag eronder: wie aan één link hangt, is een wees zodra die link verdwijnt.`;
      risico = 'MIDDEL';
    }

    return {
      ...basis,
      http_status: status,
      paginafamilie: `huidige-pagina/${r.soort}${r.subsoort ? `/${r.subsoort}` : ''}`,
      aanbevolen_actie: actie,
      reden,
      vertrouwen: zwakste(statusBewijs, g ? 'MEASURED' : null),
      seo_risico: risico,
    };
  }

  /* ---- 2. Familieregels. */
  const fam = familieVan(pad);
  if (fam) {
    const statusBewijs = steekproefStatus.has(n.url) || rij.bronnen.has('LEGACY_SITEMAPEINDPUNT') ? 'MEASURED' : 'INFERRED';
    const status = `404 (${statusBewijs === 'MEASURED' ? `GEMETEN op ${hist.gemeten_steekproef.gemeten_op}` : `AFGELEID uit het gemeten hostgedrag: een onbekend pad geeft 404 met 404.html (${hist.hostgedrag.gemeten_op})`})`;
    const kop = {
      ...basis,
      http_status: status,
      paginafamilie: fam.familie,
      historisch_bewijs: basis.historisch_bewijs === 'GEEN' ? `${fam.bewijs}: ${fam.bewijsregel}` : `${basis.historisch_bewijs} · ${fam.bewijs}: ${fam.bewijsregel}`,
      seo_risico: fam.seo_risico,
      uitvoering: fam.handmatige_actie ? fam.uitvoering : UITVOERING[fam.actie] || fam.uitvoering,
    };

    const rest = pad.startsWith(`${fam.patroon}/`) ? pad.slice(fam.patroon.length + 1) : '';
    const tabel = (fam.tabelsleutel && hist.handle_afbeelding[fam.tabelsleutel]) || {};

    /* 2a. Een handmatige afbeelding voor deze handle. */
    if (rest && tabel[rest]) {
      const t = tabel[rest];
      if (t.actie === 'REDIRECT_301') {
        return {
          ...kop,
          aanbevolen_actie: 'REDIRECT_301',
          voorstel: { route: String(t.bestemming).replace(/^\//, ''), herkomst: 'TABEL_MET_REDEN', doorMens: true, tabel: `${fam.tabelsleutel}.${rest}` },
          reden: `Handmatig afgebeeld in handle_afbeelding.${fam.tabelsleutel}: ${t.reden}`,
          vertrouwen: zwakste(t.bewijs.includes('MEASURED') ? 'INFERRED' : 'INFERRED', statusBewijs),
          seo_risico: 'MIDDEL',
        };
      }
      return {
        ...kop,
        aanbevolen_actie: t.actie,
        reden: `Handmatig beoordeeld in handle_afbeelding.${fam.tabelsleutel}: ${t.reden}`,
        vertrouwen: zwakste('INFERRED', statusBewijs),
      };
    }

    /* 2b. Strategie van de familie. */
    if (fam.strategie === 'handle-of-review' && rest && !rest.includes('/')) {
      const alsRoute = register.get(rest);
      if (alsRoute && alsRoute.staat === 'INDEX' && paginaFeiten(rest).bestaat) {
        return {
          ...kop,
          aanbevolen_actie: 'REDIRECT_301',
          voorstel: { route: rest, herkomst: 'SLUG_GELIJK', doorMens: false },
          reden: `De handle "${rest}" is gelijk aan een bestaande INDEX-route in de wortel (${urlVan(rest)}, gemeten 200). Gelijke slug is hier het bewijs van verwantschap: de redactionele pagina van de winkel en de huidige pagina gaan over hetzelfde onderwerp onder dezelfde naam.`,
          vertrouwen: zwakste('INFERRED', statusBewijs),
          seo_risico: 'MIDDEL',
        };
      }
      if (stubOpvolger.has(rest)) {
        const doel = stubOpvolger.get(rest);
        return {
          ...kop,
          aanbevolen_actie: 'REDIRECT_301',
          voorstel: { route: doel, herkomst: 'STUB_CANONICAL_GEMETEN', doorMens: false },
          reden: `De handle "${rest}" is gelijk aan een van de 16 doorverwijsstubs. De 301 gaat naar ${urlVan(doel)} — de GEMETEN canonical van die stub — en NIET naar de stub zelf: dat zou een keten naar een noindex-pagina zijn.`,
          vertrouwen: zwakste('INFERRED', statusBewijs),
          seo_risico: 'MIDDEL',
        };
      }
      return {
        ...kop,
        aanbevolen_actie: 'REQUIRES_REVIEW',
        reden: `Redactionele pagina van de oude winkel zonder aantoonbare opvolger: de handle "${rest}" is geen bestaande route en geen doorverwijsstub. ${fam.reden} Zet hem met reden in handle_afbeelding.${fam.tabelsleutel} zodra bekend is waar hij over ging; raden is hier verboden.`,
        vertrouwen: zwakste('INFERRED', statusBewijs),
        seo_risico: fam.seo_risico,
        uitvoering: UITVOERING.REQUIRES_REVIEW,
      };
    }

    if (fam.strategie === 'blogindex-of-review') {
      const segmenten = rest ? rest.split('/') : [];
      if (segmenten.length === 1 && segmenten[0]) {
        return {
          ...kop,
          aanbevolen_actie: 'REDIRECT_301',
          voorstel: { route: fam.blogindex_bestemming, herkomst: 'FAMILIEREGEL_MET_REDEN', doorMens: true, tabel: `familieregels.${fam.familie}.blogindex_bestemming` },
          reden: `Blogindex van de oude winkel. ${fam.blogindex_reden}`,
          vertrouwen: zwakste('INFERRED', statusBewijs),
          seo_risico: 'MIDDEL',
        };
      }
      return {
        ...kop,
        aanbevolen_actie: 'REQUIRES_REVIEW',
        reden: `Blogartikel van de oude winkel. ${fam.blogartikel_reden}`,
        vertrouwen: zwakste('INFERRED', statusBewijs),
        uitvoering: UITVOERING.REQUIRES_REVIEW,
      };
    }

    if (fam.strategie === 'bestand-of-terugval') {
      const opSchijf = existsSync(resolve(WORTEL, pad.replace(/^\//, '')));
      if (opSchijf) {
        return {
          ...kop,
          http_status: '200 (AFGELEID: het bestand staat op schijf en de host serveert de wortel; niet per URL gemeten)',
          aanbevolen_actie: 'KEEP',
          reden: `Eigen bestand dat nog bestaat: ${pad} staat op schijf. Geen pagina, geen zoekintentie, niets te doen.`,
          vertrouwen: 'INFERRED',
          seo_risico: 'LAAG',
          uitvoering: UITVOERING.KEEP,
        };
      }
      return {
        ...kop,
        aanbevolen_actie: fam.actie,
        reden: `Eigen bestand dat NIET meer op schijf staat. ${fam.reden}`,
        vertrouwen: zwakste(fam.bewijs, statusBewijs),
        uitvoering: UITVOERING[fam.actie],
      };
    }

    /* 2c. Vaste familieactie, en de tabelterugval voor collecties, producten
       en beleidspagina's zonder eigen regel. */
    return {
      ...kop,
      aanbevolen_actie: fam.actie,
      reden: fam.handmatige_actie ? `${fam.reden} HANDMATIGE ACTIE: ${fam.handmatige_actie}` : fam.reden,
      vertrouwen: zwakste(fam.bewijs, statusBewijs),
    };
  }

  /* ---- 3. Geen familie, geen bestaande pagina: het register beslist. */
  if (r && r.staat === 'PENDING') {
    return {
      ...basis,
      http_status: `404 (AFGELEID: PENDING-routes hebben GEMETEN 0 bestanden en staan 0 keer in de sitemap, ${pm.gemeten_op})`,
      paginafamilie: 'pending-route',
      aanbevolen_actie: 'RETURN_404',
      reden: `Deze route bestaat in het register maar staat op PENDING: geen bestand, geen sitemapregel, geen interne link. 404 is vandaag het juiste antwoord. Publiceren gaat via het bewijsmodel en het publicatiebesluit, niet via een doorverwijzing: ${r.reden || 'zie data/seo/publicatiebesluit.json'}`,
      vertrouwen: 'MEASURED',
      seo_risico: 'LAAG',
      uitvoering: UITVOERING.RETURN_404,
    };
  }

  const opSchijf = existsSync(resolve(WORTEL, pad.replace(/^\//, '')));
  return {
    ...basis,
    http_status: opSchijf
      ? '200 (AFGELEID: er staat een bestand op dit pad)'
      : `404 (AFGELEID uit het gemeten hostgedrag: een onbekend pad geeft 404 met 404.html, ${hist.hostgedrag.gemeten_op})`,
    paginafamilie: 'onbekend',
    aanbevolen_actie: 'REQUIRES_REVIEW',
    reden: opSchijf
      ? `Er staat een bestand op ${pad} maar er is geen route in het register. Zo'n bestand wordt wel geserveerd en is dus een pagina buiten het register — dat hoort niet te bestaan en moet bekeken worden.`
      : `Geen bestaande pagina, geen bekende familie en geen regel in het datacontract. Raden is verboden: wat deze URL was, kan alleen iemand zeggen die hem herkent. Hoort hij bij een familie, voeg die dan toe aan familieregels in data/seo/historische-urls.json.`,
    vertrouwen: 'UNVERIFIED',
    seo_risico: 'ONBEKEND',
    uitvoering: UITVOERING.REQUIRES_REVIEW,
  };
}

/* ================================================= RONDE 1: CLASSIFICEREN */
const rijen = [];
for (const [, rij] of [...perUrl.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const uit = classificeer(rij);
  rijen.push({ ...uit, _voorstel: uit.voorstel || null, _rij: rij });
}

/* ========================== RONDE 2: KETEN, VERZAMELBAK EN DE CONTROLES ===
   C1 tot C5, C7, C8 en C10 zijn per rij te toetsen; C6 (keten) en C9
   (verzamelbak) kunnen pas als alle voorstellen bekend zijn. Een voorstel dat
   een controle niet doorstaat verliest zijn bestemming: is het door een mens
   opgeschreven, dan faalt het script; is het automatisch gevonden, dan valt
   de rij terug op REQUIRES_REVIEW en wordt dat geteld. */
const bronRoutes = new Set();
for (const rij of rijen) {
  if (!rij._voorstel) continue;
  const route = routeVanBronVorm(rij._voorstel.bronVorm || rij.volledige_url);
  if (route !== null) bronRoutes.add(route);
}
const bronnenPerBestemming = new Map();
for (const rij of rijen) {
  if (!rij._voorstel) continue;
  const d = rij._voorstel.route;
  bronnenPerBestemming.set(d, (bronnenPerBestemming.get(d) || 0) + 1);
}

const tabelfouten = [];
const teruggevallen = [];
for (const rij of rijen) {
  const v = rij._voorstel;
  if (!v) { rij.uitvoering = rij.uitvoering || UITVOERING[rij.aanbevolen_actie]; continue; }
  const keur = keurBestemming(v.bronVorm || rij.volledige_url, v.route, v.herkomst);
  const blokkades = [...keur.blokkades];
  if (bronRoutes.has(keur.route)) blokkades.push('C6_GEEN_KETEN');
  if ((bronnenPerBestemming.get(keur.route) || 0) > hist.drempels.max_bronnen_per_bestemming) blokkades.push('C9_GEEN_VERZAMELBAK');

  if (!blokkades.length) {
    rij.redirectbestemming = urlVan(keur.route);
    rij.uitvoering = UITVOERING.REDIRECT_301;
    continue;
  }
  const melding = `${rij.volledige_url} -> /${keur.route} (herkomst ${v.herkomst}${v.tabel ? `, uit ${v.tabel}` : ''}): ${blokkades.join(', ')}`;
  if (v.doorMens || HERKOMST_DOOR_MENS.includes(v.herkomst)) tabelfouten.push(melding);
  else teruggevallen.push(melding);
  rij.aanbevolen_actie = 'REQUIRES_REVIEW';
  rij.redirectbestemming = 'GEWEIGERD';
  rij.reden = `BESTEMMING GEWEIGERD door ${blokkades.join(' en ')}: /${keur.route} mag geen 301-bestemming zijn. ${rij.reden}`;
  rij.uitvoering = UITVOERING.REQUIRES_REVIEW;
  rij.seo_risico = 'HOOG';
}

for (const rij of rijen) {
  delete rij._voorstel;
  delete rij._rij;
  delete rij.voorstel;
  for (const k of KOLOMMEN) if (rij[k] === undefined || rij[k] === null || rij[k] === '') rij[k] = 'ONBEKEND';
}

/* ================================================================ UITVOER */
const argv = process.argv.slice(2);
const heeft = (v) => argv.includes(v);
const waarde = (v) => (argv.indexOf(v) >= 0 ? argv[argv.indexOf(v) + 1] : null);

let zichtbaar = rijen;
const familieFilter = waarde('--familie');
const actieFilter = waarde('--actie');
if (familieFilter) zichtbaar = zichtbaar.filter((r) => r.paginafamilie.includes(familieFilter));
if (actieFilter) zichtbaar = zichtbaar.filter((r) => r.aanbevolen_actie === actieFilter.toUpperCase());

if (heeft('--help') || heeft('-h')) {
  console.log(`CLASSIFICATOR EN INVENTARISRAPPORT VOOR HISTORISCHE URL'S

  node scripts/seo/historische-urls.mjs [opties]

  --alles              alle rijen als tabel in plaats van alleen de te-doen-rijen
  --csv                alle (gefilterde) rijen als CSV op stdout
  --json               alle (gefilterde) rijen als JSON op stdout
  --familie <naam>     filter op paginafamilie (deeltekst)
  --actie <ACTIE>      filter op aanbevolen actie
  --help               deze tekst

  Acties: ${ACTIES.join(', ')}

  Dit script schrijft niets en is geen poort. Wil je de uitvoer bewaren, leid
  hem dan zelf om: node scripts/seo/historische-urls.mjs --csv > ergens.csv`);
  process.exit(0);
}

function csvVeld(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

if (heeft('--csv')) {
  console.log(KOLOMMEN.join(','));
  for (const r of zichtbaar) console.log(KOLOMMEN.map((k) => csvVeld(r[k])).join(','));
  process.exit(tabelfouten.length ? 3 : 0);
}
if (heeft('--json')) {
  console.log(JSON.stringify({ kolommen: KOLOMMEN, aantal: zichtbaar.length, rijen: zichtbaar }, null, 2));
  process.exit(tabelfouten.length ? 3 : 0);
}

const perActie = {};
const perFamilie = {};
const perVertrouwen = {};
const perBron = {};
for (const r of rijen) {
  perActie[r.aanbevolen_actie] = (perActie[r.aanbevolen_actie] || 0) + 1;
  perFamilie[r.paginafamilie] = (perFamilie[r.paginafamilie] || 0) + 1;
  perVertrouwen[r.vertrouwen] = (perVertrouwen[r.vertrouwen] || 0) + 1;
  for (const b of r.broninventaris.split('+')) perBron[b] = (perBron[b] || 0) + 1;
}

const streep = '='.repeat(100);
console.log(streep);
console.log("INVENTARIS VAN HISTORISCHE URL'S — VIBE ENERGY");
console.log(streep);
console.log(`datacontract   data/seo/historische-urls.json versie ${hist._versie}, vastgesteld ${hist._vastgesteld}`);
console.log(`routeregister  INDEX ${telPerStaat.INDEX} · NOINDEX ${telPerStaat.NOINDEX} · PENDING ${telPerStaat.PENDING}`);
console.log(`productiemeting ${metingGeldig ? `GELDIG — het register is onveranderd sinds ${pm.gemeten_op}` : `VERLOPEN — het register wijkt af van de meting van ${pm.gemeten_op}; statusvelden staan op AFGELEID`}`);
console.log(`sitemaps       ${sitemapBestanden.length ? sitemapBestanden.join(', ') : 'GEEN'} · ${sitemapVan.size} URL's`);
console.log(`html in boom   ${htmlBestanden.length} bestanden · ${[...inkomend.keys()].length} linkdoelen gemeten`);
console.log(`genegeerde invoer ${genegeerd.length === 0 ? 'GEEN — elke inventarisregel was een geldige URL' : `${genegeerd.length} regel(s), hieronder`}`);
for (const g of genegeerd) console.log(`  ${g.bron}: ${g.fout}`);

console.log(`\n${'-'.repeat(100)}`);
console.log('DEKKING — WAT HIER NIET IN STAAT');
console.log('-'.repeat(100));
const ro = hist.rapportcijfers_eigenaar;
console.log(`GSC-inventaris       ${gsc._status}${gsc._status === 'GEIMPORTEERD' ? ` · ${gsc.aantal_urls} URL's · afgekapt ${gsc.afgekapt ? 'JA' : 'NEE'} · ${gsc.telling_label}` : ''}`);
if (gsc._status !== 'GEIMPORTEERD') {
  console.log(`                     Er is GEEN export aangeleverd. ${hist.dekking.reden_geen_api}`);
  console.log(`                     Zonder export zijn de ${ro.niet_gevonden_404} gerapporteerde niet-gevonden URL's hier NIET in beeld.`);
  console.log('                     Lever er een aan met: node scripts/seo/gsc-import.mjs <export.csv> --reden "..." --totaal <n>');
  console.log('                     Hoe: docs/seo-historische-urls.md');
} else {
  console.log(`                     ${gsc.reden_label}`);
  if (gsc.dekking_procent !== null) console.log(`                     dekking ${gsc.dekking_procent}% van ${gsc.gezaghebbend_totaal} — ONDERGRENS, nooit een totaal`);
}
console.log(`rapportcijfers       ${ro.niet_gevonden_404} niet gevonden, ${ro.geindexeerd} geindexeerd, ~${ro.niet_geindexeerd_ongeveer} niet geindexeerd`);
console.log(`                     HERKOMST ${ro._herkomst}, VERTROUWEN ${ro._vertrouwen} — schermafbeelding van ${ro.waargenomen_op}, GEEN meting. Nooit als telling noemen.`);
console.log(`wayback              ${hist.wayback_inventaris.aantal_rijen} momentopnames, ${hist.wayback_inventaris.aantal_op_hoofdhost} op de hoofdhost, ${hist.wayback_inventaris.aantal_op_subdomein} op een subdomein`);
console.log(`afkapping per reden  ${GSC_AFKAPGRENS} URL's; elke telling uit een import heet daarom ONDERGRENS`);

console.log(`\n${'-'.repeat(100)}`);
console.log(`GECLASSIFICEERD — ${rijen.length} URL'S, ELK PRECIES EEN ACTIE`);
console.log('-'.repeat(100));
/* Een nul krijgt een reden mee. "0 x NOINDEX" kan betekenen dat de site in
   orde is of dat de regel niet bestaat; dat verschil hoort niet aan de lezer
   overgelaten te worden. */
const WAAROM_NUL = {
  RETURN_410: 'niet uitvoerbaar op deze host (410 per pad kan niet); 404 doet hetzelfde werk',
  NOINDEX: 'geen gemeten geval: elke bestaande pagina draagt de robots-richtlijn die bij zijn registerstaat hoort',
  REMOVE_FROM_SITEMAP: `geen gemeten geval: de sitemap bevat ${sitemapVan.size} URL's en 0 NOINDEX- of PENDING-routes`,
  FIX_TECHNICAL: 'geen gemeten geval, en zonder export ook geen signaal van Google dat er een zou zijn',
  IMPROVE_CONTENT: 'vraagt een Prestaties-export; zonder die export is dit niet vast te stellen',
};
for (const a of ACTIES) {
  const n = perActie[a] || 0;
  const merk = n === 0 ? `   (${WAAROM_NUL[a] || 'geen gemeten geval dat deze actie vraagt'})` : '';
  console.log(`  ${String(n).padStart(5)}  ${a.padEnd(20)}${merk}`);
}
console.log('\nper inventaris');
for (const [b, n] of Object.entries(perBron).sort((a, b2) => b2[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${b}`);
console.log('\nper vertrouwen');
for (const [v, n] of Object.entries(perVertrouwen).sort((a, b2) => b2[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${v}`);
console.log('\nper familie');
for (const [f, n] of Object.entries(perFamilie).sort((a, b2) => b2[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${f}`);

console.log(`\n${'-'.repeat(100)}`);
console.log('CONTROLES OP VOORGESTELDE BESTEMMINGEN');
console.log('-'.repeat(100));
const met301 = rijen.filter((r) => r.aanbevolen_actie === 'REDIRECT_301');
console.log(`voorstellen die ALLE controles doorstaan   ${met301.length}`);
console.log(`voorstellen GEWEIGERD en teruggevallen     ${teruggevallen.length}`);
for (const t of teruggevallen) console.log(`  ${t}`);
console.log(`voorstellen GEWEIGERD uit mensenhand      ${tabelfouten.length}`);
for (const t of tabelfouten) console.log(`  FOUT IN HET DATACONTRACT: ${t}`);
for (const c of hist.controles) console.log(`  ${c.code.padEnd(24)} ${c.eis}`);
if (met301.length) {
  console.log('\nde voorgestelde 301\'s');
  for (const r of met301) console.log(`  ${r.volledige_url}\n      -> ${r.redirectbestemming}`);
  console.log(`\n  LET OP: ${hist.hostgedrag.reden_geen_301_mechanisme.split('Het mechanisme')[0].trim()}`);
  console.log('  Een 301 is dus een BESLUIT dat nog een mechanisme nodig heeft, geen uitgevoerde wijziging.');
}

const teDoen = rijen.filter((r) => !['KEEP', 'RETURN_404', 'CANONICALIZE'].includes(r.aanbevolen_actie) || r.uitvoering !== 'GEEN ACTIE NODIG');
const toon = heeft('--alles') ? zichtbaar : teDoen.filter((r) => zichtbaar.includes(r));
console.log(`\n${'-'.repeat(100)}`);
console.log(heeft('--alles') ? `ALLE RIJEN (${toon.length})` : `RIJEN DIE WERK VRAGEN (${toon.length} van ${rijen.length}; de rest is KEEP of een 404 die al klopt)`);
console.log('-'.repeat(100));
for (const r of toon) {
  console.log(`\n${r.aanbevolen_actie}  ${r.volledige_url}`);
  console.log(`  familie      ${r.paginafamilie}`);
  console.log(`  bron         ${r.broninventaris}`);
  console.log(`  status       ${r.http_status}`);
  if (r.redirectbestemming !== 'NIET VAN TOEPASSING') console.log(`  bestemming   ${r.redirectbestemming}`);
  console.log(`  canonical    ${r.canonical}`);
  console.log(`  robots       ${r.robots_richtlijn}`);
  console.log(`  sitemap      ${r.sitemaplidmaatschap}`);
  console.log(`  ingangen     ${r.interne_inkomende_links}`);
  console.log(`  zoekprestatie ${r.zoekprestatie}`);
  console.log(`  risico       ${r.seo_risico} · vertrouwen ${r.vertrouwen}`);
  console.log(`  uitvoering   ${r.uitvoering}`);
  console.log(`  reden        ${r.reden}`);
}

console.log(`\n${streep}`);
console.log(`${rijen.length} URL's geclassificeerd · ${met301.length} voorgestelde 301's · ${perActie.REQUIRES_REVIEW || 0} x REQUIRES_REVIEW · GSC-inventaris ${gsc._status}`);
if (tabelfouten.length) {
  console.log(`FAALT: ${tabelfouten.length} door een mens vastgelegde bestemming(en) schenden een controle. Repareer data/seo/historische-urls.json.`);
  process.exit(3);
}
console.log('Dit is een rapport, geen poort. Exitcode 0 betekent alleen dat het datacontract consistent is.');
process.exit(0);
