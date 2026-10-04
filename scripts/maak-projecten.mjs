/* ============================================================================
   Genereert de elf projectpagina's uit scripts/projecten.json op basis van één
   template — de "Project Detail"-master uit het Stitch-systeem.

     node scripts/maak-projecten.mjs

   De gegenereerde bestanden worden gecommit; er is geen build-stap op de server.
   Pas de inhoud aan in projecten.json, niet in de gegenereerde HTML.
   ============================================================================ */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..');
const data = JSON.parse(readFileSync(resolve(hier, 'projecten.json'), 'utf8'));
const projecten = data.projecten;
const opSlug = Object.fromEntries(projecten.map((p) => [p.slug, p]));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ic = (n, extra = '') => `<svg viewBox="0 0 24 24" ${extra} aria-hidden="true"><use href="#ve-i-${n}"/></svg>`;

/* Gerenderde breedte van een kaart in "Andere projecten".
   Die staat in .ve-wrap--wide (max 100rem) > .ve-cols--2 .ve-cols--gap-xl,
   dus: (containerbreedte - 2x gutter - 1x gap) / 2, met gutter 1,5/2/3rem per
   breekpunt en gap 2,5rem. Onder 640px is het één kolom over de volle breedte.
   Gemeten in de browser: 650px @1440, 396px @900, 342px @390, 732px vanaf 1600. */
const KAART_SIZES = [
  '(min-width:1600px) 732px',
  '(min-width:1200px) calc((100vw - 8.5rem) / 2)',
  '(min-width:768px) calc((100vw - 6.5rem) / 2)',
  '(min-width:640px) calc((100vw - 5.5rem) / 2)',
  'calc(100vw - 3rem)',
].join(', ');

/* <img> met de responsive varianten die scripts/maak-webp.sh genereert.
   Valt terug op de .jpg wanneer een variant (nog) niet bestaat. */
function beeld(basis, alt, { sizes, eager = false, ratio = '' } = {}) {
  const heeft = (w) => existsSync(resolve(wortel, `${basis}-${w}.webp`));
  const varianten = [640, 800, 1200, 1800].filter(heeft);
  const src = varianten.length ? `${basis}-${varianten.at(-1)}.webp` : `${basis}.jpg`;
  const srcset = varianten.length
    ? ` srcset="${varianten.map((w) => `${basis}-${w}.webp ${w}w`).join(', ')}" sizes="${sizes || '100vw'}"`
    : '';
  const laden = eager ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<img src="${src}"${srcset} alt="${esc(alt)}"${laden} decoding="async">`;
}

function metriekBlok(metrics) {
  const n = Math.min(metrics.length, 4);
  return `<div class="ve-metriek ve-metriek--${n} ve-metriek--groot ve-metriek--lijn-t">
${metrics
  .map(
    (m) => `          <div class="ve-metriek__i--rail">
            <span class="ve-metriek__w${m.accent ? ' ve-metriek__w--accent' : ''}">${esc(m.waarde)}</span>
            <span class="ve-metriek__l">${esc(m.label)}</span>
          </div>`
  )
  .join('\n')}
        </div>`;
}

function pagina(p) {
  const url = `https://vibeenergy.nl/${p.slug}`;
  const ogBeeld = `https://vibeenergy.nl/${p.beeld}.jpg`;
  const gerelateerd = (p.gerelateerd || []).map((s) => opSlug[s]).filter(Boolean);

  /* Twee modi, bepaald door wat er écht aan beeld bestaat. Tien van de elf
     projecten hebben één foto; die krijgen een typografische opbouw met één
     heroïsch beeld in plaats van een galerijsjabloon met gaten erin. */
  const multi = Array.isArray(p.galerij) && p.galerij.length >= 3;

  const heroMedia = p.video
    ? `<video src="${p.video}" poster="${p.beeld}.jpg" autoplay muted loop playsinline
             width="1920" height="1080" aria-label="${esc(p.beeldAlt)}"></video>`
    : beeld(p.beeld, p.beeldAlt, { sizes: '(min-width:1200px) 1216px, 100vw', eager: true });

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<script src="_consent.js"></script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KM2V7VQ3');</script>
<script src="_clarity.js"></script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.titel)} — ${esc(p.kop)} | Vibe Energy</title>
<meta name="description" content="${esc(p.lead)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow">
<link rel="icon" type="image/png" href="assets/logo.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Vibe Energy">
<meta property="og:locale" content="nl_NL">
<meta property="og:title" content="${esc(p.titel)} — ${esc(p.kop)}">
<meta property="og:description" content="${esc(p.lead)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogBeeld}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogBeeld}">
<meta name="theme-color" content="#0052FF">
<link rel="preload" href="assets/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="vibe/tokens.css">
<link rel="stylesheet" href="vibe/vibe.css">
<script src="vibe/chrome.js" defer></script>
</head>

<body data-pagina="projecten">

<noscript data-chrome-fallback>
  <nav aria-label="Hoofdnavigatie">
    <a href="/">Home</a> · <a href="projecten">Projecten</a> ·
    <a href="systeem-energieopslag">Energieopslag</a> · <a href="vibe-control">VIBE.CONTROL</a> ·
    <a href="over-ons">Over Vibe</a> · <a href="contact">Plan een gesprek</a>
  </nav>
</noscript>

<main id="hoofdinhoud">

  <!-- 1 · TYPE A — PROJECTOPENING
       ${multi ? 'MULTI-IMAGE MODE: er bestaan meerdere echte foto\'s van dit project.'
               : 'ONE-IMAGE MODE: van dit project bestaat één sterke foto. Die draagt de\n            pagina als volbreed anker; de rest leunt op typografie en cijfers.'} -->
  <section class="ve-sec ve-sec--flush-t ve-sec--flush-b" style="padding-top:var(--ve-s-2xl)">
    <div class="ve-wrap ve-wrap--wide">
      <p class="ve-small"><a class="ve-link" href="projecten">Projecten</a></p>
      <h1 class="ve-display" style="max-width:64rem;margin-top:var(--ve-s-md)">${esc(p.kop)}</h1>
      <p class="ve-lead ve-measure-wide" style="margin-top:var(--ve-s-lg)">${esc(p.lead)}</p>
    </div>

    <div class="ve-wrap ve-wrap--wide" style="margin-top:var(--ve-s-2xl)">
      <div class="ve-media ${multi ? 've-media--21x9' : 've-media--16x9'} ve-media--vol ve-media--diep ve-media--overlay-onder">
        ${heroMedia}
        <div class="ve-overlay">
          <h2 class="ve-overlay__t">${esc(p.titel)}</h2>
          <p class="ve-overlay__d">${esc(p.sector)} &middot; ${esc(p.plaats)} &middot; opgeleverd ${esc(p.opgeleverd)}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 2 · FEITENBALK -->
  <section class="ve-sec--line-y ve-sec--paper" style="padding-block:var(--ve-s-xl)">
    <div class="ve-wrap ve-wrap--wide">
      <div class="ve-feiten" style="--ve-feiten-n:4">
        <div><span class="ve-feit__l">Locatie</span><span class="ve-feit__w">${esc(p.plaats)}</span></div>
        <div><span class="ve-feit__l">Sector</span><span class="ve-feit__w">${esc(p.sector)}</span></div>
        <div><span class="ve-feit__l">Opgeleverd</span><span class="ve-feit__w">${esc(p.opgeleverd)}</span></div>
        <div><span class="ve-feit__l">Besturing</span><span class="ve-feit__w" style="color:var(--ve-action-ink)">VIBE.CONTROL</span></div>
      </div>
    </div>
  </section>

  <!-- 3 · DE UITDAGING — REDACTIONELE SPLIT -->
  <section class="ve-sec ve-sec--lg">
    <div class="ve-wrap ve-wrap--wide">
      <div class="ve-split ve-split--5-7 ve-split--top">
        <div>
          <h2 class="ve-h2">De uitdaging</h2>
          <p class="ve-body" style="margin-top:var(--ve-s-md)">${esc(p.uitdaging)}</p>
        </div>
        <div>
          <h2 class="ve-h2">Wat Vibe deed</h2>
          <p class="ve-body" style="margin-top:var(--ve-s-md)">${esc(p.aanpak)}</p>
        </div>
      </div>
    </div>
  </section>

${
  p.galerij
    ? `
  <!-- 7 · PROJECTBEELDEN -->
  <section class="ve-sec ve-sec--lg">
    <div class="ve-wrap ve-wrap--wide">
      <div class="ve-head">
        <h2 class="ve-h2">Op locatie</h2>
        <p class="ve-lead">Locatiebeelden en de plaatsing van de installatie.</p>
      </div>
      <div class="ve-galerij">
${p.galerij
  .map(
    (g, i) => `        <div class="ve-media ${i === 0 ? 've-media--3x2' : 've-media--4x3'} ve-media--lijn">
          ${beeld(g.basis, g.alt, { sizes: i === 0 ? '(min-width:768px) 800px, 100vw' : '(min-width:768px) 400px, 100vw' })}
        </div>`
  )
  .join('\n')}
      </div>
    </div>
  </section>
`
    : ''
}

  <!-- 4 · HET SYSTEEM — één hoofdfeit groot, de rest als open rijen met
       haarlijnen. Geen kaartenraster: vier gelijke bakjes lazen generiek. -->
  <section class="ve-sec ve-sec--lg ve-sec--sunken ve-sec--line-y">
    <div class="ve-wrap ve-wrap--wide">
      <div class="ve-head"><h2 class="ve-h2">Het systeem op deze locatie.</h2></div>

      <div style="max-width:46rem">
        <span class="ve-ic ve-ic--vol">${ic(p.componenten[0].icoon)}</span>
        <h3 class="ve-h2">${esc(p.componenten[0].titel)}</h3>
        <p class="ve-lead" style="margin-top:var(--ve-s-md)">${esc(p.componenten[0].tekst)}</p>
      </div>
${p.componenten.length > 1 ? `
      <div class="ve-pijlers" style="margin-top:var(--ve-s-2xl)">
${p.componenten
  .slice(1)
  .map(
    (c) => `        <div class="ve-pijler">
          <span class="ve-pijler__ic">${ic(c.icoon)}</span>
          <div>
            <h3 class="ve-h4">${esc(c.titel)}</h3>
            <p class="ve-body">${esc(c.tekst)}</p>
          </div>
        </div>`
  )
  .join('\n')}
      </div>` : ''}
    </div>
  </section>

  <!-- 4b · DE STURING — beeldloos met opzet. Draagt de pagina's waar maar één
       foto bestaat, en legt de relatie met het product. -->
  <section class="ve-sec ve-sec--lg">
    <div class="ve-wrap ve-wrap--wide">
      <div class="ve-split ve-split--5-7 ve-split--top">
        <div>
          <h2 class="ve-h2">En wie stuurt het aan?</h2>
        </div>
        <div>
          <p class="ve-lead">
            De onderdelen hierboven leveren het vermogen; VIBE.CONTROL bepaalt per moment waar
            het heen gaat. Op deze locatie bewaakt de regelaar de grens van de aansluiting,
            geeft hij eigen opwek voorrang boven inkoop en wijkt optimalisatie altijd voor de
            bedrijfsvoering.
          </p>
          <p class="ve-body" style="margin-top:var(--ve-s-md)">
            Na de oplevering blijft Vibe die strategie bijstellen. Een installatie die niet wordt
            bijgestuurd, levert na een jaar minder op dan op de dag van ingebruikname.
          </p>
          <a class="ve-link" href="vibe-control" style="margin-top:var(--ve-s-lg)">
            Over VIBE.CONTROL ${ic('pijl')}
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- 5 · RESULTAAT — de cijfers krijgen displaygrootte, want op een
       projectpagina zijn zij het bewijs en niet een bijschrift. -->
  <section class="ve-sec ve-sec--xl">
    <div class="ve-wrap ve-wrap--wide">
      <div class="ve-head ve-head--wide ve-head--deep">
        <h2 class="ve-h2">Resultaat</h2>
        <p class="ve-lead">${esc(p.resultaat)}</p>
      </div>
      ${metriekBlok(p.metrics)}
    </div>
  </section>

  <!-- 6 · VOOR EN NA -->
  <section class="ve-sec ve-sec--lg ve-sec--paper ve-sec--line-y">
    <div class="ve-wrap ve-wrap--wide">
      <div class="ve-vn">
        <div class="ve-vn__blok ve-vn__blok--voor">
          <div class="ve-vn__kop">
            <span class="ve-stip" style="background:var(--ve-error)"></span>
            <h3 class="ve-h4">Vóór</h3>
          </div>
          <ul>
${p.voor.map((x) => `            <li>${ic('kruis')}<span>${esc(x)}</span></li>`).join('\n')}
          </ul>
        </div>
        <div class="ve-vn__blok ve-vn__blok--na">
          <div class="ve-vn__kop">
            <span class="ve-stip ve-stip--actie"></span>
            <h3 class="ve-h4">Na</h3>
          </div>
          <ul>
${p.na.map((x) => `            <li>${ic('vink')}<span>${esc(x)}</span></li>`).join('\n')}
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- 7b · TYPE H — REDACTIONELE UITSPRAAK OP OBSIDIAAN
       Geen klantcitaat: dit is een uitspraak van Vibe over het ontwerp. -->
  <section class="ve-sec ve-sec--3xl ve-sec--dark">
    <div class="ve-wrap ve-wrap--wide">
      <p class="ve-citaat" style="max-width:52rem">${esc(p.statement)}</p>
      <span class="ve-citaat__bron">Vibe Energy &middot; ${esc(p.plaats)}, ${esc(p.opgeleverd)}</span>
    </div>
  </section>

  <!-- 7c · DE REALISATIECYCLUS -->
  <section class="ve-sec ve-sec--lg">
    <div class="ve-wrap ve-wrap--wide">
      <div class="ve-head">
        <h2 class="ve-h2">Hoe dit project tot stand kwam.</h2>
        <p class="ve-lead">Dezelfde vier stappen die wij op elke locatie doorlopen.</p>
      </div>
      <div class="ve-fasen">
        <div class="ve-fase ve-fase--nu">
          <span class="ve-fase__n">01</span>
          <h3 class="ve-h4">Meetdata</h3>
          <p class="ve-body" style="margin-top:.4rem">
            Het kwartiersprofiel van de aansluiting uitlezen, en vastleggen waar de piek zit en
            welke ruimte onbenut blijft.
          </p>
        </div>
        <div class="ve-fase">
          <span class="ve-fase__n">02</span>
          <h3 class="ve-h4">Ontwerp</h3>
          <p class="ve-body" style="margin-top:.4rem">
            Dimensionering van de onderdelen, de opstelling op het terrein, de veiligheid en de
            rol die de sturing krijgt.
          </p>
        </div>
        <div class="ve-fase">
          <span class="ve-fase__n">03</span>
          <h3 class="ve-h4">Realisatie</h3>
          <p class="ve-body" style="margin-top:.4rem">
            Plaatsing, netkoppeling en inbedrijfstelling, met één aanspreekpunt van begin tot
            eind.
          </p>
        </div>
        <div class="ve-fase">
          <span class="ve-fase__n">04</span>
          <h3 class="ve-h4">Beheer</h3>
          <p class="ve-body" style="margin-top:.4rem">
            Monitoring, onderhoud en het bijstellen van de regelstrategie zolang de installatie
            in bedrijf is.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- 8 · GERELATEERDE PROJECTEN -->
  <section class="ve-sec ve-sec--lg ve-sec--sunken ve-sec--line-y">
    <div class="ve-wrap ve-wrap--wide">
      <div class="ve-head"><h2 class="ve-h2">Andere projecten</h2></div>
      <div class="ve-cols ve-cols--2 ve-cols--gap-xl">
${gerelateerd
  .map(
    (g) => `        <a class="ve-proj" href="${g.slug}">
          <div class="ve-proj__vlak">${beeld(g.beeld, g.beeldAlt, { sizes: KAART_SIZES })}</div>
          <div class="ve-proj__tekst">
            <span class="ve-proj__sector">${esc(g.sector)} &middot; ${esc(g.plaats)}</span>
            <h3 class="ve-proj__t">${esc(g.titel)}</h3>
            <p class="ve-proj__d">${esc(g.kop)}</p>
            <span class="ve-proj__voet">Bekijk het project &rarr;</span>
          </div>
        </a>`
  )
  .join('\n')}
      </div>
    </div>
  </section>

  <!-- 9 · TYPE I — AFSLUITING -->
  <section class="ve-sec ve-sec--lg ve-sec--flush-b" style="padding-bottom:var(--ve-s-3xl)">
    <div class="ve-wrap ve-wrap--wide">
      <div class="ve-slot ve-slot--center">
        <div class="ve-slot__inhoud">
          <h2 class="ve-h2">Een vergelijkbare situatie op uw locatie?</h2>
          <p class="ve-lead" style="margin-top:var(--ve-s-md)">
            Stuur ons uw verbruiksgegevens en plannen. Wij rekenen door wat er binnen uw
            bestaande aansluiting mogelijk is.
          </p>
          <div class="ve-row" style="margin-top:var(--ve-s-xl)">
            <a class="ve-btn ve-btn--primair ve-btn--lg" href="contact">Plan een gesprek ${ic('pijl')}</a>
            <a class="ve-btn ve-btn--ghost ve-btn--lg" href="projecten">Alle projecten</a>
          </div>
        </div>
      </div>
    </div>
  </section>

</main>

<div data-chrome-footer></div>

</body>
</html>
`;
}

/* ------------------------------------------------------------- overzicht */
/* De filterlabels staan hier en niet in de data, omdat ze bij de pagina horen
   en niet bij het project. */
const FILTERS = [
  ['alle', 'Alle projecten'],
  ['netcongestie', 'Netcongestie & capaciteit'],
  ['automotive', 'Automotive'],
  ['recreatie', 'Recreatie'],
  ['woningportefeuilles', 'Woningen & portefeuilles'],
  ['bedrijfspanden', 'Bedrijfspanden'],
];

function overzicht() {
  /* Eén uitgelicht project: Ratio 16 is de enige locatie waar opwek, opslag én
     laden samen binnen één onveranderde aansluiting draaien. Dat is het
     volledigste bewijs dat er is. */
  const uitgelicht = opSlug['project-ratio-16'] || projecten[0];
  const overige = projecten.filter((x) => x.slug !== uitgelicht.slug);
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<script src="_consent.js"></script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KM2V7VQ3');</script>
<script src="_clarity.js"></script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Projecten — gerealiseerde energiesystemen | Vibe Energy</title>
<meta name="description" content="Gerealiseerde projecten van Vibe Energy: batterijopslag, zonne-energie en laadinfrastructuur op bedrijfslocaties, wooncomplexen en recreatieparken in Nederland.">
<link rel="canonical" href="https://vibeenergy.nl/projecten">
<meta name="robots" content="index, follow">
<link rel="icon" type="image/png" href="assets/logo.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Vibe Energy">
<meta property="og:locale" content="nl_NL">
<meta property="og:title" content="Projecten — gerealiseerde energiesystemen">
<meta property="og:description" content="Gerealiseerde projecten van Vibe Energy op bedrijfslocaties, wooncomplexen en recreatieparken.">
<meta property="og:url" content="https://vibeenergy.nl/projecten">
<meta property="og:image" content="https://vibeenergy.nl/assets/projects/ratio-16.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://vibeenergy.nl/assets/projects/ratio-16.jpg">
<meta name="theme-color" content="#0052FF">
<link rel="preload" href="assets/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="vibe/tokens.css">
<link rel="stylesheet" href="vibe/vibe.css">
<script src="vibe/chrome.js" defer></script>
<style>
  /* Filterbalk — paginaspecifiek, komt alleen hier voor. */
  .pr-filters{display:flex;flex-wrap:wrap;gap:.6rem}
  .pr-filter{
    padding:.55rem 1.1rem;border-radius:var(--ve-r-pill);
    border:1px solid var(--ve-line-strong);background:var(--ve-surface);
    font-size:var(--ve-body-sm-size);font-weight:var(--ve-w-med);color:var(--ve-text-soft);
    cursor:pointer;transition:all var(--ve-dur) var(--ve-ease);
  }
  .pr-filter:hover{border-color:var(--ve-action);color:var(--ve-action-ink)}
  .pr-filter[aria-pressed="true"]{background:var(--ve-action);border-color:var(--ve-action);color:#fff}
  .pr-raster{display:grid;gap:var(--ve-s-xl)}
  @media (min-width:640px){.pr-raster{grid-template-columns:repeat(2,1fr)}}
  @media (min-width:1024px){.pr-raster{grid-template-columns:repeat(3,1fr)}}
  .pr-kaart[hidden]{display:none}
</style>
</head>

<body data-pagina="projecten">

<noscript data-chrome-fallback>
  <nav aria-label="Hoofdnavigatie">
    <a href="/">Home</a> · <a href="projecten">Projecten</a> ·
    <a href="systeem-energieopslag">Energieopslag</a> · <a href="vibe-control">VIBE.CONTROL</a> ·
    <a href="over-ons">Over Vibe</a> · <a href="contact">Plan een gesprek</a>
  </nav>
</noscript>

<main id="hoofdinhoud">

  <!-- A · PROJECTGEDREVEN OPENING -->
  <section class="ve-sec ve-sec--flush-t ve-sec--flush-b" style="padding-top:var(--ve-s-2xl)">
    <div class="ve-wrap">
      <h1 class="ve-display" style="max-width:46rem">Geen theorie. Gerealiseerd.</h1>
      <p class="ve-lead ve-measure-wide" style="margin-top:var(--ve-s-lg)">
        Gerealiseerde projecten uit de periode juli 2023 tot en met maart 2026 — van
        batterijopslag en laadpleinen tot complete wooncomplexen. De waarden hieronder zijn
        die van de oplevering.
      </p>
    </div>
  </section>

  <!-- B · UITGELICHT PROJECT — het volledige systeem op één locatie -->
  <section class="ve-sec ve-sec--lg">
    <div class="ve-wrap" style="margin-bottom:var(--ve-s-2xl)">
      <div class="ve-media ve-media--21x9 ve-media--vol ve-media--diep">
        ${beeld(uitgelicht.beeld, uitgelicht.beeldAlt, { sizes: '100vw', eager: true })}
      </div>
    </div>
    <div class="ve-wrap">
      <div class="ve-split ve-split--7-5 ve-split--end">
        <div>
          <h2 class="ve-h2" style="max-width:24ch">${esc(uitgelicht.kop)}</h2>
          <p class="ve-lead" style="margin-top:var(--ve-s-lg)">${esc(uitgelicht.lead)}</p>
        </div>
        <div class="ve-row">
          <a class="ve-btn ve-btn--primair ve-btn--lg" href="${uitgelicht.slug}">
            Bekijk ${esc(uitgelicht.titel)} ${ic('pijl')}
          </a>
        </div>
      </div>
      <div class="ve-metriek ve-metriek--4 ve-metriek--groot ve-metriek--lijn-t" style="margin-top:var(--ve-s-2xl)">
${uitgelicht.metrics
  .map((m) => `        <div class="ve-metriek__i--rail">
          <span class="ve-metriek__w${m.accent ? ' ve-metriek__w--accent' : ''}">${esc(m.waarde)}</span>
          <span class="ve-metriek__l">${esc(m.label)}</span>
        </div>`)
  .join('\n')}
      </div>
    </div>
  </section>

  <!-- D · WAAR WIJ WERKEN — korte uitspraak over de spreiding van het werk -->
  <section class="ve-sec ve-sec--xl ve-sec--dark">
    <div class="ve-wrap">
      <div class="ve-split ve-split--5-7 ve-split--top">
        <h2 class="ve-h2">Elf locaties. Eén manier van werken.</h2>
        <div>
          <p class="ve-lead">
            Een bedrijfspand op een bedrijventerrein, een autobedrijf in de stad, een
            recreatiepark en wooncomplexen met tientallen tot honderden woningen. De techniek
            verschilt per locatie; de volgorde niet: eerst het meetprofiel, dan het ontwerp, dan
            de bouw, en daarna het beheer.
          </p>
          <p class="ve-body" style="margin-top:var(--ve-s-md)">
            Wat hieronder staat, is wat er is opgeleverd. Geen prognoses, geen modellen.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- C · HET VERDERE WERK -->
  <section class="ve-sec ve-sec--lg">
    <div class="ve-wrap">
      <div class="ve-head">
        <h2 class="ve-h2">De overige projecten.</h2>
      </div>
      <div class="pr-filters" role="group" aria-label="Filter op sector">
${FILTERS.map(
  ([k, label], i) =>
    `        <button class="pr-filter" type="button" data-filter="${k}" aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(label)}</button>`
).join('\n')}
      </div>
      <p class="ve-small" style="margin-top:var(--ve-s-md)" id="pr-telling" aria-live="polite">
        ${overige.length} projecten
      </p>

      <div class="pr-raster" style="margin-top:var(--ve-s-xl)">
${overige
  .map(
    (p) => `        <a class="ve-proj pr-kaart" href="${p.slug}" data-sector="${p.sectorFilter}">
          <div class="ve-proj__vlak">${beeld(p.beeld, p.beeldAlt, { sizes: '(min-width:1024px) 400px, (min-width:640px) 50vw, 100vw' })}</div>
          <div class="ve-proj__tekst">
            <span class="ve-proj__sector">${esc(p.sector)} &middot; ${esc(p.plaats)}</span>
            <h2 class="ve-proj__t">${esc(p.titel)}</h2>
            <p class="ve-proj__d">${esc(p.kop)}</p>
            <span class="ve-proj__voet">${esc(p.opgeleverd)} &middot; bekijk het project &rarr;</span>
          </div>
        </a>`
  )
  .join('\n')}
      </div>
    </div>
  </section>

  <section class="ve-sec ve-sec--lg ve-sec--flush-b" style="padding-bottom:var(--ve-s-3xl)">
    <div class="ve-wrap">
      <div class="ve-slot">
        <div class="ve-slot__inhoud">
          <h2 class="ve-h2">Uw locatie als volgende?</h2>
          <p class="ve-lead" style="margin-top:var(--ve-s-md)">
            Stuur ons uw verbruiksgegevens en groeiplannen. Wij rekenen door wat er binnen uw
            bestaande aansluiting mogelijk is.
          </p>
          <div class="ve-row" style="margin-top:var(--ve-s-xl)">
            <a class="ve-btn ve-btn--primair ve-btn--lg" href="contact">Plan een gesprek ${ic('pijl')}</a>
            <a class="ve-btn ve-btn--ghost ve-btn--lg" href="over-ons">Over Vibe</a>
          </div>
        </div>
      </div>
    </div>
  </section>

</main>

<div data-chrome-footer></div>

<script>
/* Filter op sector. Zonder JavaScript staan alle projecten gewoon zichtbaar. */
(function () {
  var knoppen = document.querySelectorAll('.pr-filter');
  var kaarten = document.querySelectorAll('.pr-kaart');
  var telling = document.getElementById('pr-telling');
  knoppen.forEach(function (k) {
    k.addEventListener('click', function () {
      var f = k.dataset.filter, n = 0;
      knoppen.forEach(function (x) { x.setAttribute('aria-pressed', x === k ? 'true' : 'false'); });
      kaarten.forEach(function (c) {
        var toon = f === 'alle' || c.dataset.sector === f;
        c.hidden = !toon;
        if (toon) n++;
      });
      telling.textContent = n + (n === 1 ? ' project' : ' projecten');
    });
  });
})();
</script>

</body>
</html>
`;
}

let n = 0;
for (const p of projecten) {
  /* bestand op schijf houdt .html; de PUBLIEKE URL is extensieloos */
  writeFileSync(resolve(wortel, `${p.slug}.html`), pagina(p), 'utf8');
  console.log(`  ${p.slug}.html`);
  n++;
}
writeFileSync(resolve(wortel, 'projecten.html'), overzicht(), 'utf8');
console.log('  projecten.html');
console.log(`\n${n} projectpagina's + overzicht gegenereerd.`);
