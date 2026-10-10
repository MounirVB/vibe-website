/* ============================================================================
   VIBE ENERGY — PAGINASJABLOON
   ----------------------------------------------------------------------------
   Het skelet dat elke gegenereerde pagina deelt. Volgt letterlijk de kop van
   de bestaande pagina's (consent voor GTM, Clarity daarna, dan de meta's,
   dan tokens.css en vibe.css, chrome.js met defer), met drie verschillen die
   bewust zijn:

   1 · ROOT-RELATIEVE PADEN. De bestaande pagina's staan allemaal in de wortel
       en gebruiken `vibe/vibe.css`. Een gegenereerde pagina kan drie mappen
       diep liggen; daar lost dat fout op. Alles begint hier met /.

   2 · EEN SEO-FOUNDATION-BLOK MET JSON-LD. Op de bestaande site draagt alleen
       index.html dat blok (gemeten: 1 van 51 bestanden). Elke gegenereerde
       pagina krijgt canonical, og:*, twitter:* en één @graph.

   3 · EEN STATISCH KRUIMELPAD IN <main>. De header en footer komen uit
       chrome.js en zijn dus pas na JavaScript zichtbaar. Bing en de meeste
       AI-crawlers voeren geen JavaScript uit. Het kruimelpad en de
       verwante-linkblokken staan daarom als echte HTML in de pagina.
   ============================================================================ */
import { HOST, href, url } from './paden.mjs';
import { graaf, kruimelpad, organisatie, website, webpagina } from './schema.mjs';

export const GTM_ID = 'GTM-KM2V7VQ3';

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function ic(naam) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ve-i-${naam}"/></svg>`;
}

/* De navigatie in <noscript>, identiek aan wat de bestaande pagina's dragen
   maar met root-relatieve paden. Dit is de crawlbare hoofdnavigatie zolang
   chrome.js niet heeft gedraaid. */
export const NOSCRIPT_NAV = [
  ['/', 'Home'],
  ['/netcongestie', 'Netcongestie'],
  ['/systeem-energieopslag', 'Energieopslag'],
  ['/systeem-zonnepanelen', 'Zonne-energie'],
  ['/systeem-laadpalen', 'Laadinfrastructuur'],
  ['/laadplein', 'Laadplein'],
  ['/vibe-control', 'VIBE.CONTROL'],
  ['/microgrids', 'Microgrids'],
  ['/energy-hubs', 'Energy Hubs'],
  ['/sectoren', 'Sectoren'],
  ['/toepassingen', 'Toepassingen'],
  ['/kennis', 'Kennisbank'],
  /* Voorwaardelijk: het nieuwskanaal staat alleen in de navigatie als de hub
     ook echt op INDEX staat. Zonder deze voorwaarde zou elke pagina naar een
     PENDING-route linken zodra er even geen goedgekeurd artikel is — een 404
     voor de bezoeker en een bevinding in poort 7. */
  ['/nieuws', 'Nieuws', true],
  ['/subsidies', 'Subsidies'],
  ['/regios', "Regio's"],
  ['/projecten', 'Projecten'],
  ['/over-ons', 'Over Vibe'],
  ['/contact', 'Plan een gesprek'],
  /* De juridische pagina's hangen in de echte footer, en die komt uit
     chrome.js. Zonder JavaScript zouden /algemene-voorwaarden en
     /cookiebeleid daardoor nergens gelinkt staan - poort 8 meldde ze als
     weespagina. Hier staan ze als sluitstuk van de crawlbare navigatie. */
  ['/privacy', 'Privacyverklaring'],
  ['/algemene-voorwaarden', 'Algemene voorwaarden'],
  ['/cookiebeleid', 'Cookiebeleid'],
];

/* De toets voor voorwaardelijke navigatie-items. Standaard FALSE: wie dit
   sjabloon gebruikt zonder de toets te zetten, krijgt geen voorwaardelijke
   links. Een vergeten aanroep kan dus nooit een dode link opleveren — alleen
   een ontbrekende, en dat meldt poort 8 als weespagina. */
let navToets = () => false;

/**
 * Zet de INDEX-toets voor voorwaardelijke navigatie-items.
 * De generator roept dit één keer aan, vóór de eerste pagina.
 * @param {(route:string)=>boolean} fn route zonder leidende schuine streep
 */
export function zetNavToets(fn) {
  navToets = fn;
}

/* Geëxporteerd omdat scripts/seo/herstel-bestaand.mjs dezelfde navigatie in de
   bestaande, met de hand geschreven pagina's zet. Dat bestand bouwde die regel
   eerder zelf uit NOSCRIPT_NAV; met een voorwaardelijk item ging dat mis — de
   voorwaarde werd daar niet toegepast en elke bestaande pagina kreeg een link
   naar een PENDING-route. Eén renderer, één waarheid. */
export function noscriptNav() {
  const items = NOSCRIPT_NAV.filter(
    ([h, , voorwaardelijk]) => !voorwaardelijk || navToets(String(h).replace(/^\/+/, ''))
  );
  return (
    '<noscript data-chrome-fallback>\n  <nav aria-label="Hoofdnavigatie">\n    ' +
    items.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join(' &middot;\n    ') +
    '\n  </nav>\n</noscript>'
  );
}

/** Statisch kruimelpad. kruimels: [{naam, route}] zonder de huidige pagina. */
export function kruimelsHtml(kruimels, huidig) {
  const delen = kruimels
    .map((k) => `<li><a href="${href(k.route)}">${esc(k.naam)}</a></li>`)
    .join('');
  return (
    '<nav class="ve-kruimels" aria-label="Kruimelpad">\n' +
    `      <ol>${delen}<li><span aria-current="page">${esc(huidig)}</span></li></ol>\n` +
    '    </nav>'
  );
}

/**
 * Bouwt een volledige pagina.
 *
 * @param {object} o
 * @param {string} o.route        route zonder schuine streep ervoor
 * @param {string} o.titel        <title>
 * @param {string} o.beschrijving meta description
 * @param {string} o.ogTitel      korter dan <title>, zonder merkstaart
 * @param {string} o.ogBeschrijving
 * @param {string} o.ogBeeld      absolute URL of null
 * @param {string} o.dataPagina   waarde voor body[data-pagina]
 * @param {boolean} o.index       true = index,follow
 * @param {Array}  o.kruimels     [{naam, route}] exclusief de huidige pagina
 * @param {string} o.kruimelLabel label van de huidige pagina in het kruimelpad
 * @param {Array}  o.extraKnopen  extra JSON-LD-knopen
 * @param {string} o.gewijzigd    ISO-datum van de laatste inhoudelijke wijziging
 * @param {string} o.inhoud       de <section>-stroom
 * @param {string} o.paginaCss    optionele <style> voor deze pagina
 */
export function pagina(o) {
  const paginaUrl = url(o.route);
  const kruimels = o.kruimels || [];
  const volledigPad = [{ naam: 'Home', route: '' }, ...kruimels];

  const knopen = [
    organisatie(),
    website(),
    webpagina({
      url: paginaUrl,
      titel: o.ogTitel || o.titel,
      beschrijving: o.beschrijving,
      gewijzigd: o.gewijzigd,
    }),
    kruimelpad(paginaUrl, [
      ...volledigPad.map((k) => ({ naam: k.naam, url: url(k.route) })),
      { naam: o.kruimelLabel || o.ogTitel || o.titel, url: paginaUrl },
    ]),
    ...(o.extraKnopen || []),
  ];

  const og = [
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Vibe Energy">',
    '<meta property="og:locale" content="nl_NL">',
    `<meta property="og:title" content="${esc(o.ogTitel || o.titel)}">`,
    `<meta property="og:description" content="${esc(o.ogBeschrijving || o.beschrijving)}">`,
    `<meta property="og:url" content="${paginaUrl}">`,
    o.ogBeeld ? `<meta property="og:image" content="${o.ogBeeld}">` : null,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(o.ogTitel || o.titel)}">`,
    `<meta name="twitter:description" content="${esc(o.ogBeschrijving || o.beschrijving)}">`,
    o.ogBeeld ? `<meta name="twitter:image" content="${o.ogBeeld}">` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<script src="/_consent.js"></script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');</script>
<script src="/_clarity.js"></script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.titel)}</title>
<meta name="description" content="${esc(o.beschrijving)}">
<!--SEO-FOUNDATION-->
<link rel="canonical" href="${paginaUrl}">
<meta name="robots" content="${o.index === false ? 'noindex, follow' : 'index, follow'}">
<link rel="icon" type="image/svg+xml" href="/assets/vibe-mark.svg">
${og}
<script type="application/ld+json">${graaf(knopen)}</script>
<!--/SEO-FOUNDATION-->
<meta name="theme-color" content="#0052FF">
<link rel="preload" href="/assets/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/vibe/tokens.css">
<link rel="stylesheet" href="/vibe/vibe.css">
<script src="/vibe/chrome.js" defer></script>${o.paginaCss ? '\n<style>\n' + o.paginaCss + '\n</style>' : ''}
</head>

<body data-pagina="${esc(o.dataPagina || '')}">

${noscriptNav()}

<main id="hoofdinhoud">
${o.inhoud}
</main>

<div data-chrome-footer></div>

</body>
</html>
`;
}

/* ------------------------------------------------------------------ blokken
   Kleine bouwstenen in de taal van vibe.css, zodat een gegenereerde pagina
   niet als vreemd element in het ontwerp staat. */

/** Opening met kruimelpad, H1 en lead.
    `naLead` is een optioneel blok direct onder de lead — gebruikt door het
    nieuwskanaal voor de zichtbare publicatiedatum. Zonder die parameter is de
    uitvoer byte-identiek aan daarvoor. */
export function opening({ kruimels, kruimelLabel, h1, lead, acties, naLead }) {
  return `  <section class="ve-sec ve-sec--flush-t" style="padding-top:var(--ve-s-xl)">
    <div class="ve-wrap">
    ${kruimelsHtml(kruimels || [], kruimelLabel)}
      <h1 class="ve-display" style="max-width:52rem;margin-top:var(--ve-s-lg)">${h1}</h1>
      <p class="ve-lead ve-measure-wide" style="margin-top:var(--ve-s-lg)">${lead}</p>${
    naLead ? `\n      ${naLead}` : ''
  }${
    acties && acties.length
      ? `
      <div class="ve-row" style="margin-top:var(--ve-s-xl)">
${acties.map((a) => `        ${a}`).join('\n')}
      </div>`
      : ''
  }
    </div>
  </section>`;
}

/** Het directe antwoord: één alinea die los van de pagina te citeren is.
    Dit is de GEO-bouwsteen — een AI-antwoordmachine moet hieruit kunnen
    citeren zonder de rest van de pagina te hebben gelezen. */
export function directAntwoord({ vraag, antwoord, voorbehoud, bronnen }) {
  /* Het directe antwoord is de alinea die een antwoordmachine letterlijk
     overneemt. Staat er een cijfer in, dan moet de bron MEE — anders reist het
     getal los van zijn herkomst de wereld in. Vandaar dat dit blok een eigen
     bronregel heeft en niet leunt op de bron verderop in de pagina. */
  return `  <section class="ve-sec ve-sec--tight ve-sec--paper ve-sec--line-y">
    <div class="ve-wrap">
      <div class="ve-kaart ve-kaart--ruim ve-measure-wide" data-direct-antwoord>
        <h2 class="ve-h4">${vraag}</h2>
        <p class="ve-body" style="margin-top:var(--ve-s-md)">${antwoord}</p>${
    voorbehoud
      ? `
        <p class="ve-small" style="margin-top:var(--ve-s-md)">${voorbehoud}</p>`
      : ''
  }${
    bronnen && bronnen.length
      ? `
        <div style="margin-top:var(--ve-s-md)">${bronregel(bronnen)}</div>`
      : ''
  }
      </div>
    </div>
  </section>`;
}

/** Een tekstsectie met kop. `prose` is al opgemaakte HTML. */
export function tekstsectie({ id, kop, lead, prose, variant = '' }) {
  return `  <section class="ve-sec ve-sec--lg ${variant}"${id ? ` id="${id}"` : ''}>
    <div class="ve-wrap">
      <div class="ve-head">
        <h2 class="ve-h2">${kop}</h2>${lead ? `\n        <p class="ve-lead">${lead}</p>` : ''}
      </div>
      <div class="ve-prose">
${prose}
      </div>
    </div>
  </section>`;
}

/** Kaartenrij. kaarten: [{kop, tekst, route?, label?}] */
export function kaarten({ id, kop, lead, kaarten: lijst, variant = '' }) {
  const cellen = lijst
    .map((k) => {
      const binnen = `<h3 class="ve-h4">${k.kop}</h3>\n          <p class="ve-body" style="margin-top:.4rem">${k.tekst}</p>`;
      if (!k.route) return `        <div class="ve-kaart ve-kaart--ruim">\n          ${binnen}\n        </div>`;
      return `        <a class="ve-kaart ve-kaart--ruim ve-kaart--hover" href="${href(k.route)}">\n          ${binnen}\n          <span class="ve-link" style="display:inline-block;margin-top:var(--ve-s-md)">${k.label || 'Lees verder'}</span>\n        </a>`;
    })
    .join('\n');
  return `  <section class="ve-sec ve-sec--lg ${variant}"${id ? ` id="${id}"` : ''}>
    <div class="ve-wrap">
      <div class="ve-head">
        <h2 class="ve-h2">${kop}</h2>${lead ? `\n        <p class="ve-lead">${lead}</p>` : ''}
      </div>
      <div class="ve-cols ve-cols--gap-xl">
${cellen}
      </div>
    </div>
  </section>`;
}

/** Definitielijst met harde specificaties. rijen: [[term, waarde]] */
export function specs({ kop, rijen, noot }) {
  return `  <section class="ve-sec ve-sec--lg ve-sec--sunken ve-sec--line-y">
    <div class="ve-wrap">
      <div class="ve-spec ve-measure-wide">
        <div class="ve-spec__kop">${ic('meter')}<h2 class="ve-h4">${kop}</h2></div>
        <dl>
${rijen.map(([t, w]) => `          <dt class="ve-small">${t}</dt>\n          <dd class="ve-body">${w}</dd>`).join('\n')}
        </dl>${noot ? `\n        <p class="ve-small" style="margin-top:var(--ve-s-md)">${noot}</p>` : ''}
      </div>
    </div>
  </section>`;
}

/** Zichtbare FAQ. De JSON-LD mag alleen deze vragen bevatten. */
export function faqSectie({ kop, vragen }) {
  return `  <section class="ve-sec ve-sec--lg" id="vragen">
    <div class="ve-wrap">
      <div class="ve-head">
        <h2 class="ve-h2">${kop}</h2>
      </div>
      <div class="ve-faq">
${vragen
  .map(
    (v) => `        <details>
          <summary>${v.vraag}${ic('caret')}</summary>
          <p>${v.antwoord}</p>
        </details>`
  )
  .join('\n')}
      </div>
    </div>
  </section>`;
}

/** Verwante links. groepen: [{kop, items:[{route, naam, tekst?}]}]
    Dit is de crawlbare interne-linkmotor: echte <a> in <main>. */
export function verwant(groepen) {
  const kolommen = groepen
    .filter((g) => g.items && g.items.length)
    .map(
      (g) => `        <div>
          <p class="ve-footer__kop">${g.kop}</p>
          <ul class="ve-footer__lijst">
${g.items.map((i) => `            <li><a href="${href(i.route)}">${esc(i.naam)}</a></li>`).join('\n')}
          </ul>
        </div>`
    )
    .join('\n');
  if (!kolommen) return '';
  return `  <section class="ve-sec ve-sec--lg ve-sec--paper ve-sec--line-t" id="verwant">
    <div class="ve-wrap">
      <div class="ve-head">
        <h2 class="ve-h2">Verder lezen</h2>
      </div>
      <div class="ve-cols ve-cols--gap-xl">
${kolommen}
      </div>
    </div>
  </section>`;
}

/** Afsluitende conversie. Gebruikt de bestaande, werkende paden. */
export function conversie({ kop, tekst, primair, secundair }) {
  const p = primair || { route: 'contact', label: 'Plan een adviesgesprek' };
  return `  <section class="ve-sec ve-sec--xl">
    <div class="ve-wrap">
      <div class="ve-slot ve-slot--dark">
        <div class="ve-slot__inhoud">
          <h2 class="ve-h2">${kop}</h2>
          <p class="ve-lead" style="margin-top:var(--ve-s-md)">${tekst}</p>
          <div class="ve-row" style="margin-top:var(--ve-s-xl)">
            <a class="ve-btn ve-btn--primair ve-btn--lg" href="${href(p.route)}">${p.label}${ic('pijl')}</a>${
    secundair
      ? `
            <a class="ve-btn ve-btn--ghost-dark ve-btn--lg" href="${href(secundair.route)}">${secundair.label}</a>`
      : ''
  }
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

/** Bronregel onder een feit. Verplicht zodra er een cijfer of status staat. */
export function bronregel(bronnen) {
  if (!bronnen || !bronnen.length) return '';
  const items = bronnen
    .map((b) =>
      b.url
        ? `<a class="ve-link" href="${esc(b.url)}" rel="nofollow noopener" target="_blank">${esc(b.naam)}</a>${b.datum ? ` (${esc(b.datum)})` : ''}`
        : `${esc(b.naam)}${b.datum ? ` (${esc(b.datum)})` : ''}`
    )
    .join(' &middot; ');
  return `<p class="ve-small" data-bron>Bron: ${items}</p>`;
}
