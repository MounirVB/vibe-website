/* ============================================================================
   VIBE ENERGY — TECHNISCH SEO-HERSTEL OP DE BESTAANDE PAGINA'S
   ----------------------------------------------------------------------------
   Vier gemeten defecten op de 35 bestaande pagina's, en wat dit script eraan
   doet. Idempotent: twee keer draaien verandert niets extra.

   1 · CANONICAL WIJST NAAR EEN DOORVERWIJZING.
       Gemeten 10 okt 2026: alle 50 canonicals staan op https://vibeenergy.nl/.
       Die host staat op nginx/Plesk en antwoordt met 301 naar
       https://www.vibeenergy.nl/, waar Railway de site serveert. Een canonical
       hoort naar de URL te wijzen die zelf 200 geeft. Alles gaat naar www.

   2 · GEEN STRUCTURED DATA.
       Gemeten: 1 van de 51 bestanden draagt JSON-LD (index.html). De overige
       krijgen hier een @graph met Organization, WebSite, WebPage en
       BreadcrumbList. Geen rating, geen review, geen offer — daar is geen bron
       voor.

   3 · og:url ONTBREEKT OP 18 BESTANDEN.
       Zonder og:url valt de kanonieke keuze bij sociale deling terug op de
       aangeroepen URL.

   4 · DE DOORVERWIJSSTUBS WIJZEN NAAR DE VERKEERDE OPVOLGER.
       Zestien oude URL's zijn noindex-stubs met een canonical naar de pagina
       die hun inhoud overnam. Door de nieuwe architectuur is die opvolger voor
       tien van de zestien veranderd. Twee stonden al fout: de twee
       exploitatie-stubs gaan over laadpleinexploitatie maar wezen naar
       energieopslag. Laten staan zou betekenen dat /netcongestie concurreert
       met /energy-hubs en /systeem-energieopslag om dezelfde zoekvraag, en
       /laadplein met /systeem-laadpalen.

   Draaien: node scripts/seo/herstel-bestaand.mjs [--droog]
   ============================================================================ */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST, HOST_APEX, url, href } from './lib/paden.mjs';
import { graaf, organisatie, website, webpagina, kruimelpad } from './lib/schema.mjs';
import { noscriptNav, zetNavToets } from './lib/sjabloon.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');
const DROOG = process.argv.includes('--droog');

/* Voorwaardelijke navigatie-items (nu: /nieuws) horen alleen in de navigatie
   als hun route op INDEX staat. Dit script draait als stap 6, dus na
   bouw-routes: het register is er en is actueel. Zonder deze toets zou elke
   bestaande pagina een link naar een PENDING-route krijgen. */
const registerRoutes = JSON.parse(
  readFileSync(resolve(wortel, 'data', 'seo', 'routes.json'), 'utf8')
).routes;
const indexRoutes = new Set(registerRoutes.filter((r) => r.staat === 'INDEX').map((r) => r.route));
zetNavToets((route) => indexRoutes.has(route));

/* ------------------------------------------------- de stubs en hun opvolger
   Per stub: de nieuwe opvolger en waarom. Deze tabel IS het besluit; de
   oude waarde staat erbij zodat de wijziging navolgbaar is. */
const STUBS = {
  'netcongestie-oplossen': { oud: 'Netcongestie oplossen', naar: 'netcongestie', was: 'energy-hubs', label: 'Netcongestie', reden: 'Deze zoekintentie heeft vanaf nu een eigen eigenaar, /netcongestie. De stub wees naar /energy-hubs, dat over gedeelde capaciteit gaat; dat is een andere vraag.' },
  'oplossing-netcongestie': { oud: 'Netcongestie oplossen', naar: 'netcongestie', was: 'systeem-energieopslag', label: 'Netcongestie', reden: 'Zelfde intentie. Wees naar de batterijpagina, waardoor de netcongestievraag bij een productpagina terechtkwam.' },
  'capaciteit-als-dienst': { oud: 'Capaciteit als dienst', naar: 'netcongestie', was: 'energy-hubs', label: 'Netcongestie', reden: 'Capaciteit als dienst is het antwoord op de netcongestievraag. /energy-hubs blijft bestaan voor capaciteit delen tussen panden; deze URL hoort bij het probleem.' },
  'netcongestie-check': { oud: 'Netcongestie Check', naar: 'energieadvies', was: 'contact', label: 'Energieadvies', reden: 'Een check is een analyse, geen contactformulier. /energieadvies bezit nu de scan- en analyse-intentie.' },
  'oplossing-laadplein': { oud: 'Laadplein zonder netverzwaring', naar: 'laadplein', was: 'systeem-laadpalen', label: 'Laadplein', reden: 'Een laadplein is een locatieproject en heeft nu een eigen pagina. /systeem-laadpalen blijft de productpagina voor laadpunten.' },
  'laadplein-zonder-verzwaring': { oud: 'Laadplein zonder netverzwaring', naar: 'laadplein', was: 'systeem-laadpalen', label: 'Laadplein', reden: 'Zelfde intentie als /oplossing-laadplein.' },
  'oplossing-exploitatie': { oud: 'Exploitatie zonder investering', naar: 'laadplein', was: 'systeem-energieopslag', label: 'Laadplein', reden: 'Stond al fout: de pagina gaat over exploitatie van een laadplein zonder eigen investering, maar wees naar de batterijpagina. Exploitatie is nu een sectie op /laadplein.' },
  'exploitatie-zonder-investering': { oud: 'Exploitatie zonder investering', naar: 'laadplein', was: 'systeem-energieopslag', label: 'Laadplein', reden: 'Zelfde onjuiste verwijzing als /oplossing-exploitatie.' },
  'oplossing-subsidies': { oud: 'Subsidies en businesscase', naar: 'subsidies', was: 'contact', label: 'Subsidies en regelingen', reden: 'Een subsidievraag hoort bij de subsidiepagina, niet bij het contactformulier.' },
  'oplossing-energielabel': { oud: 'Energielabel verhogen', naar: 'verduurzaming-bedrijfspanden', was: 'industrie-vastgoed', label: 'Verduurzaming bedrijfspanden', reden: 'Vier stubs claimden de verduurzamingsintentie voor /industrie-vastgoed. Die pagina is een doelgroeppagina (kantoren en vastgoed); de onderwerpintentie gaat naar /verduurzaming-bedrijfspanden. Alle vier worden verlegd; half uitvoeren zou twee pagina s om één zoekvraag laten concurreren.' },
  'energielabel-verhogen': { oud: 'Energielabel verhogen', naar: 'verduurzaming-bedrijfspanden', was: 'industrie-vastgoed', label: 'Verduurzaming bedrijfspanden', reden: 'Zie /oplossing-energielabel.' },
  'oplossing-paris-proof': { oud: 'Paris Proof vastgoed', naar: 'verduurzaming-bedrijfspanden', was: 'industrie-vastgoed', label: 'Verduurzaming bedrijfspanden', reden: 'Zie /oplossing-energielabel.' },
  'energie-als-vastgoedopbrengst': { oud: 'Energie als vastgoedopbrengst', naar: 'verduurzaming-bedrijfspanden', was: 'industrie-vastgoed', label: 'Verduurzaming bedrijfspanden', reden: 'Zie /oplossing-energielabel.' },
  /* Deze drie blijven staan waar ze stonden; de opvolger is nog steeds juist. */
  'systeem-ems': { oud: 'Systeem · EMS', naar: 'vibe-control', was: 'vibe-control', label: 'VIBE.CONTROL', reden: 'Ongewijzigd: het EMS heet VIBE.CONTROL en die pagina bezit de EMS-intentie.' },
  'energiehandel-flexmarkten': { oud: 'Energiehandel en flexmarkten', naar: 'vibe-control', was: 'vibe-control', label: 'VIBE.CONTROL', reden: 'Ongewijzigd: energiehandel en flexibiliteit zijn eigenschappen van de stuurlaag.' },
  'waarom-vibe': { oud: 'Waarom Vibe', naar: 'over-ons', was: 'over-ons', label: 'Over Vibe', reden: 'Ongewijzigd.' },
};

/* Een doorverwijsstub wordt VOLLEDIG uit dit sjabloon geschreven in plaats van
   met losse vervangingen bijgewerkt. Reden: na het verleggen van de canonical
   bleven titel, description, kop en lopende tekst de oude bestemming noemen
   ("nu op Energieopslag" terwijl de canonical naar /laadplein wees). Zo'n
   tegenspraak in één bestand is erger dan de oorspronkelijke fout. Volledig
   genereren maakt het bestand intern consistent en het script herhaalbaar. */
function stubHtml(route, st) {
  const doel = href(st.naar);
  const doelUrl = url(st.naar);
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(st.oud)} — nu op ${esc(st.label)} | Vibe Energy</title>
<meta name="description" content="Deze pagina is opgegaan in ${esc(st.label)}. U wordt doorgestuurd.">
<!-- Deze URL bestond als "${esc(st.oud)}". De inhoud is opgegaan in ${esc(st.naar)}.html.
     De URL blijft bestaan zodat bestaande links en zoekresultaten niet doodlopen;
     canonical en de doorverwijzing wijzen naar de opvolger.

     SEO-HERSTEL 2026-10-10 — bestemming ${st.was === st.naar ? 'ongewijzigd' : `gewijzigd van ${st.was} naar ${st.naar}`}.
     ${esc(st.reden)} -->
<link rel="canonical" href="${doelUrl}">
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url=${doel}">
<link rel="icon" type="image/svg+xml" href="/assets/vibe-mark.svg">
<meta name="theme-color" content="#0052FF">
<link rel="stylesheet" href="/vibe/tokens.css">
<link rel="stylesheet" href="/vibe/vibe.css">
<script>location.replace('${doel}');</script>
</head>
<body>
<main id="hoofdinhoud">
  <section class="ve-sec ve-sec--2xl">
    <div class="ve-wrap ve-wrap--text">
      <h1 class="ve-h2">Deze pagina staat nu onder ${esc(st.label)}.</h1>
      <p class="ve-lead" style="margin-top:var(--ve-s-md)">
        De inhoud van &ldquo;${esc(st.oud)}&rdquo; is opgenomen in ${esc(st.label)}. U wordt automatisch
        doorgestuurd.
      </p>
      <p style="margin-top:var(--ve-s-lg)">
        <a class="ve-btn ve-btn--primair" href="${doel}">Ga naar ${esc(st.label)}</a>
      </p>
      <p class="ve-small" style="margin-top:var(--ve-s-lg)">
        Of ga naar de <a class="ve-link" href="/">homepage</a>.
      </p>
    </div>
  </section>
</main>
</body>
</html>
`;
}

/* Kruimelpad per bestaande pagina, zodat de BreadcrumbList klopt. Alleen de
   tussenliggende stappen; Home en de pagina zelf voegt de bouwer toe. */
const KRUIMELS = {
  projecten: [],
  'over-ons': [],
  contact: [],
  privacy: [],
  'algemene-voorwaarden': [],
  cookiebeleid: [],
  'systeem-energieopslag': [],
  'systeem-zonnepanelen': [],
  'systeem-laadpalen': [],
  'vibe-control': [],
  microgrids: [],
  'energy-hubs': [],
  'industrie-logistiek': [],
  'industrie-vastgoed': [],
  'industrie-vve': [],
  'industrie-recreatie': [],
  'industrie-residentieel': [],
};

const LABEL = {
  '': 'Home',
  projecten: 'Projecten',
  'over-ons': 'Over Vibe',
  contact: 'Plan een gesprek',
  privacy: 'Privacyverklaring',
  'algemene-voorwaarden': 'Algemene voorwaarden',
  cookiebeleid: 'Cookiebeleid',
  'systeem-energieopslag': 'Energieopslag',
  'systeem-zonnepanelen': 'Zonne-energie',
  'systeem-laadpalen': 'Laadinfrastructuur',
  'vibe-control': 'VIBE.CONTROL',
  microgrids: 'Microgrids',
  'energy-hubs': 'Energy Hubs',
  'industrie-logistiek': 'Logistiek',
  'industrie-vastgoed': 'Kantoren en vastgoed',
  'industrie-vve': "VvE's en wooncomplexen",
  'industrie-recreatie': 'Recreatie',
  'industrie-residentieel': 'Woningportefeuilles',
};

/* De crawlbare navigatie komt uit sjabloon.mjs, zodat een bestaande en een
   gegenereerde pagina per constructie dezelfde lijst dragen. */

const een = (re, s) => { const m = s.match(re); return m ? m[1] : null; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* De bestanden die dit script mag aanraken: de .html in de wortel die NIET
   door de generator zijn geschreven. */
const gegenereerd = new Set(
  (() => {
    try {
      return JSON.parse(readFileSync(resolve(wortel, 'data', 'seo', 'gegenereerd.json'), 'utf8')).bestanden || [];
    } catch { return []; }
  })()
);

const projectSlugs = new Set(
  JSON.parse(readFileSync(resolve(wortel, 'scripts', 'projecten.json'), 'utf8')).projecten.map((p) => p.slug)
);

const bestanden = readdirSync(wortel)
  .filter((f) => f.endsWith('.html'))
  .filter((f) => !gegenereerd.has(f))
  .sort();

const rapport = [];

for (const f of bestanden) {
  const pad = resolve(wortel, f);
  let s = readFileSync(pad, 'utf8');
  const voor = s;
  const route = f === 'index.html' ? '' : f.replace(/\.html$/, '');
  const paginaUrl = url(route);
  const acties = [];

  /* ---------- 1 · host van canonical, og:url en de beeld-URL's ---------- */
  const isStub = Object.prototype.hasOwnProperty.call(STUBS, route);
  if (!isStub) {
    if (s.includes(`${HOST_APEX}/`)) {
      s = s.split(`${HOST_APEX}/`).join(`${HOST}/`);
      acties.push('host apex -> www');
    }
  }

  /* ---------- 4 · stubs volledig opnieuw schrijven ---------- */
  if (isStub) {
    const st = STUBS[route];
    const nieuw = stubHtml(route, st);
    if (nieuw !== s) {
      s = nieuw;
      acties.push(
        `stub herschreven -> ${st.naar}${st.was !== st.naar ? ` (was ${st.was})` : ' (bestemming ongewijzigd)'}`
      );
    }
  }

  /* ---------- 2+3 · SEO-blok met og:* en JSON-LD ---------- */
  if (!isStub && route !== '404' && !s.includes('<!--SEO-FOUNDATION-->')) {
    const titel = een(/<title>([\s\S]*?)<\/title>/, s) || '';
    const beschrijving = een(/<meta name="description" content="([\s\S]*?)">/, s) || '';
    const ogTitel = een(/<meta property="og:title" content="([^"]*)"/, s) || titel.replace(/\s*\|\s*Vibe Energy\s*$/, '');
    const ogBeeld = een(/<meta property="og:image" content="([^"]*)"/, s);
    const heeftOgUrl = /<meta property="og:url"/.test(s);
    const heeftLd = /application\/ld\+json/.test(s);

    const tussen = KRUIMELS[route] ?? (projectSlugs.has(route) ? [{ naam: 'Projecten', route: 'projecten' }] : []);
    const kruimels = [
      { naam: 'Home', url: url('') },
      ...tussen.map((k) => ({ naam: k.naam, url: url(k.route) })),
      { naam: LABEL[route] || ogTitel || titel, url: paginaUrl },
    ];

    const knopen = [
      organisatie(),
      website(),
      webpagina({ url: paginaUrl, titel: ogTitel || titel, beschrijving, gewijzigd: null }),
      kruimelpad(paginaUrl, kruimels),
    ];

    const toevoegen = [];
    if (!heeftOgUrl) toevoegen.push(`<meta property="og:url" content="${paginaUrl}">`);
    if (!heeftLd) toevoegen.push(`<script type="application/ld+json">${graaf(knopen)}</script>`);

    if (toevoegen.length) {
      /* Plaats het blok direct na de canonical, zodat de kop van het bestand
         dezelfde opbouw houdt als index.html. */
      s = s.replace(
        /(<link rel="canonical" href="[^"]*">)/,
        `<!--SEO-FOUNDATION-->\n$1\n${toevoegen.join('\n')}\n<!--/SEO-FOUNDATION-->`
      );
      acties.push(...[!heeftOgUrl ? 'og:url toegevoegd' : null, !heeftLd ? 'JSON-LD toegevoegd' : null].filter(Boolean));
    }
  }

  /* ---------- 5 · de crawlbare noscript-navigatie bijwerken ----------
     De header en de footer komen uit vibe/chrome.js en bestaan dus pas nadat
     JavaScript heeft gedraaid. Googlebot rendert, maar Bing en de meeste
     AI-crawlers doen dat niet; voor hen is de <noscript>-navigatie de enige
     interne linkbron buiten <main>. Die stond nog op de oude, relatieve,
     onvolledige lijst. Hij wordt hier in zijn geheel opnieuw geschreven:
     root-relatief, extensieloos, en met de nieuwe hubs erin. Geen zichtbaar
     effect — chrome.js verwijdert het blok zodra het draait. */
  if (!isStub && /<noscript data-chrome-fallback>/.test(s)) {
    const vervangen = s.replace(/<noscript data-chrome-fallback>[\s\S]*?<\/noscript>/, noscriptNav());
    if (vervangen !== s) {
      s = vervangen;
      acties.push('noscript-navigatie bijgewerkt');
    }
  }

  if (s !== voor) {
    rapport.push({ bestand: f, acties });
    if (!DROOG) writeFileSync(pad, s);
  }
}

console.log(DROOG ? '=== DROOGLOOP, niets geschreven ===' : '=== HERSTELD ===');
console.log(`bestanden bekeken : ${bestanden.length}`);
console.log(`bestanden gewijzigd: ${rapport.length}`);
for (const r of rapport) console.log(`  ${r.bestand.padEnd(36)} ${r.acties.join(' | ')}`);
