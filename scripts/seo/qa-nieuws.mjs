/* ============================================================================
   VIBE ENERGY — QA VAN HET NIEUWSKANAAL
   ----------------------------------------------------------------------------
   Het nieuwskanaal wordt opgeleverd met NUL gepubliceerde artikelen. Dat is
   geen half werk maar het contract: alleen een mens zet een artikel op
   GOEDGEKEURD, en er is in deze release niets goedgekeurd.

   Dat levert een bewijsprobleem op. Een kanaal zonder artikelen ziet er in de
   poort identiek uit aan een kanaal dat niet werkt. Dit script lost dat op:
   het zet een FIXTURE neer, draait de ECHTE keten, meet de uitkomst, en ruimt
   de fixture daarna weer op.

   DE FIXTURE IS GEEN INHOUD.
   De tekst is zichtbaar een testbericht en de bron heet ook zo. Er wordt hier
   geen marktfeit beweerd en er komt niets van in een commit: de laatste fase
   controleert dat de werkboom na opruimen weer gelijk is aan de staat
   waarin hij begon. Faalt dat, dan faalt dit script.

   Draaien: node scripts/seo/qa-nieuws.mjs
   ============================================================================ */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');

const NIEUWSMAP = resolve(wortel, 'data', 'inhoud', 'nieuws');
const FIXTURE = resolve(NIEUWSMAP, 'qa-fixture-testbericht.json');
const FIXTURE_ROUTE = 'nieuws/qa-fixture-testbericht';

/* De fixture leent het onderwerp van een pagina die echt op INDEX staat. */
const EIGENAAR = 'netcongestie';

let geslaagd = 0;
const mislukt = [];

function toets(naam, voorwaarde, toelichting = '') {
  if (voorwaarde) {
    geslaagd += 1;
    console.log(`  PASS  ${naam}`);
  } else {
    mislukt.push(naam + (toelichting ? ` — ${toelichting}` : ''));
    console.log(`  FAIL  ${naam}${toelichting ? ` — ${toelichting}` : ''}`);
  }
}

function draai(script, stil = true) {
  try {
    const uit = execFileSync('node', [resolve(hier, script)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (!stil) process.stdout.write(uit);
    return { ok: true, uit };
  } catch (e) {
    return { ok: false, uit: (e.stdout || '') + (e.stderr || '') };
  }
}

function registerVan(route) {
  const reg = JSON.parse(readFileSync(resolve(wortel, 'data', 'seo', 'routes.json'), 'utf8'));
  return reg.routes.find((r) => r.route === route) || null;
}

/** De werkboomstaat van de gegenereerde uitvoer, zodat opruimen te meten is. */
function werkboomstaat() {
  return execFileSync('git', ['status', '--porcelain'], { cwd: wortel, encoding: 'utf8' })
    .split('\n')
    .filter((r) => r.trim() && !r.includes('scripts/seo/'))
    .sort()
    .join('\n');
}

/* ------------------------------------------------------------- de fixture */
function fixture() {
  return {
    _waarschuwing:
      'QA-FIXTURE. Geen redactionele inhoud, geen marktbewering. Wordt door scripts/seo/qa-nieuws.mjs neergezet en weer verwijderd.',
    route: FIXTURE_ROUTE,
    type: 'nieuws',
    titel: 'QA-testbericht van het nieuwskanaal | Vibe',
    beschrijving:
      'Testbericht waarmee de publicatieketen van het nieuwskanaal wordt gemeten. Dit bericht bevat geen marktfeit en hoort niet live te staan.',
    og_titel: 'QA-testbericht van het nieuwskanaal',
    h1: 'QA-testbericht van het nieuwskanaal',
    kruimel_label: 'QA-testbericht',
    lead:
      'Dit is een testbericht. Het staat hier om te meten of de keten van registerrecord naar ' +
      'gepubliceerde pagina, sitemapregel en structured data werkt zoals het contract voorschrijft. ' +
      'Er wordt in dit bericht niets over de markt beweerd.',
    gepubliceerd: '2026-10-10',
    gewijzigd: '2026-10-10',
    redactionele_staat: 'GOEDGEKEURD',
    goedgekeurd_door: 'QA-harnas',
    goedgekeurd_op: '2026-10-10',
    onderwerp_eigenaar: EIGENAAR,
    oplossing_links: ['systeem-energieopslag'],
    kennis_links: ['kennis/netcongestie-uitgelegd'],
    regio_links: [],
    bronnen: [
      {
        naam: 'QA-fixturebron — niet voor publicatie',
        url: 'https://www.acm.nl/',
        datum: '2026-10-10',
        soort: 'TOEZICHTHOUDER',
      },
    ],
    claims: [],
    direct_antwoord: {
      vraag: 'Waar dient dit testbericht voor?',
      antwoord:
        'Dit testbericht meet of het nieuwskanaal van Vibe Energy een goedgekeurd registerrecord ' +
        'omzet naar een gepubliceerde pagina met een zelfverwijzende canonical, een zichtbare ' +
        'publicatiedatum, een zichtbare bronnenlijst met peildatum en een NewsArticle in de ' +
        'structured data. Het bericht bevat zelf geen feit over de energiemarkt.',
      voorbehoud: 'Dit bericht zegt niets over netcongestie, tarieven of regelgeving.',
    },
    secties: [
      {
        soort: 'tekst',
        kop: 'Wat deze fixture meet',
        alineas: [
          'De keten loopt van een registerrecord onder data/inhoud/nieuws naar een pagina die de generator van het SEO-fundament maakt. De sitemap komt uit het routeregister en niet uit de bestandenlijst.',
          'De toestandsmachine laat een artikel alleen door als een mens het heeft goedgekeurd, met naam en datum, en als er minstens een dragende bron onder staat.',
        ],
      },
      {
        soort: 'tekst',
        kop: 'Wat deze fixture niet meet',
        variant: 've-sec--paper ve-sec--line-y',
        alineas: [
          'De fixture zegt niets over de kwaliteit van een echt bericht. Of een onderwerp een eigen pagina verdient is een redactioneel besluit en geen uitkomst van een poort.',
        ],
      },
      {
        soort: 'tekst',
        kop: 'Opruimen',
        alineas: [
          'Na de meting verwijdert het QA-script deze fixture en draait de keten opnieuw, zodat de werkboom weer gelijk is aan de staat van voor de meting.',
        ],
      },
    ],
  };
}

function zetFixture(j) {
  mkdirSync(NIEUWSMAP, { recursive: true });
  writeFileSync(FIXTURE, JSON.stringify(j, null, 2) + '\n');
}

function ruimFixtureOp() {
  if (existsSync(FIXTURE)) rmSync(FIXTURE);
  if (existsSync(NIEUWSMAP) && readdirSync(NIEUWSMAP).length === 0) rmSync(NIEUWSMAP, { recursive: true });
}

/* ========================================================================= */
const staatVoor = werkboomstaat();
console.log('\nVIBE ENERGY — QA NIEUWSKANAAL');
console.log('='.repeat(72));

try {
  /* ---------------------------------------------------------------- FASE A
     De toestandsmachine. Elke variant hieronder MOET geweigerd worden. Dit is
     de kern van het contract: een artikel promoveert zichzelf niet. */
  console.log('\nFASE A — de toestandsmachine weigert wat niet goedgekeurd is');

  const weigeringen = [
    ['CONCEPT blijft PENDING', { redactionele_staat: 'CONCEPT' }],
    ['TER_REDACTIE blijft PENDING', { redactionele_staat: 'TER_REDACTIE' }],
    ['INGETROKKEN blijft PENDING', { redactionele_staat: 'INGETROKKEN' }],
    ['goedkeuring zonder naam wordt geweigerd', { goedgekeurd_door: '' }],
    ['goedkeuring zonder datum wordt geweigerd', { goedgekeurd_op: '' }],
    ['artikel zonder publicatiedatum wordt geweigerd', { gepubliceerd: '' }],
    ['artikel zonder bron wordt geweigerd', { bronnen: [] }],
    [
      'alleen een marktpartij als bron is niet genoeg',
      { bronnen: [{ naam: 'QA-fixturebron', url: 'https://example.invalid/', datum: '2026-10-10', soort: 'MARKTPARTIJ' }] },
    ],
    [
      'bron zonder raadpleegdatum wordt geweigerd',
      { bronnen: [{ naam: 'QA-fixturebron', url: 'https://www.acm.nl/', datum: '', soort: 'TOEZICHTHOUDER' }] },
    ],
    ['claim zonder bron-URL wordt geweigerd', { claims: [{ tekst: '1 kW', bron: 'x', bron_datum: '2026-10-10' }] }],
    ['onbekende onderwerp-eigenaar wordt geweigerd', { onderwerp_eigenaar: 'bestaat-niet-als-route' }],
    ['onbekende regiocode wordt geweigerd', { regio_links: ['GM9999'] }],
    ['oplossing_link naar een PENDING-route wordt geweigerd', { oplossing_links: ['nieuws'] }],
  ];

  for (const [naam, patch] of weigeringen) {
    zetFixture({ ...fixture(), ...patch });
    const r = draai('bouw-routes.mjs');
    const rec = registerVan(FIXTURE_ROUTE);
    toets(
      naam,
      r.ok && rec && rec.staat === 'PENDING',
      rec ? `staat=${rec.staat} reden=${String(rec.reden).slice(0, 90)}` : 'route niet in register'
    );
  }

  /* De hub blijft PENDING zolang er geen enkel goedgekeurd artikel is. */
  const hubLeeg = registerVan('nieuws');
  toets('hub blijft PENDING zonder goedgekeurd artikel', hubLeeg && hubLeeg.staat === 'PENDING', hubLeeg?.staat);

  /* ---------------------------------------------------------------- FASE B
     De geldige fixture gaat door de hele keten. */
  console.log('\nFASE B — een goedgekeurd artikel wordt volledig gepubliceerd');

  zetFixture(fixture());
  const a = draai('bouw-routes.mjs');
  toets('bouw-routes draait', a.ok, a.ok ? '' : a.uit.slice(0, 200));

  const rec = registerVan(FIXTURE_ROUTE);
  toets('artikel staat op INDEX', rec && rec.staat === 'INDEX', rec ? `${rec.staat}: ${rec.reden}` : 'niet gevonden');
  toets('register noemt de goedkeurder', !!rec && /QA-harnas/.test(rec.reden || ''), rec?.reden);

  const hub = registerVan('nieuws');
  toets('hub staat op INDEX', hub && hub.staat === 'INDEX', hub ? `${hub.staat}: ${hub.reden}` : 'niet gevonden');

  const g = draai('genereer.mjs');
  toets('genereer draait', g.ok, g.ok ? '' : g.uit.slice(-400));

  const h = draai('herstel-bestaand.mjs');
  toets('herstel-bestaand draait', h.ok, h.ok ? '' : h.uit.slice(-300));

  const s = draai('sitemap.mjs');
  toets('sitemap draait', s.ok, s.ok ? '' : s.uit.slice(-300));

  const artikelPad = resolve(wortel, `${FIXTURE_ROUTE}.html`);
  const hubPad = resolve(wortel, 'nieuws.html');
  toets('artikelbestand bestaat', existsSync(artikelPad), artikelPad);
  toets('hubbestand bestaat', existsSync(hubPad), hubPad);

  const html = existsSync(artikelPad) ? readFileSync(artikelPad, 'utf8') : '';
  const hubHtml = existsSync(hubPad) ? readFileSync(hubPad, 'utf8') : '';

  toets(
    'canonical is zelfverwijzend',
    html.includes(`<link rel="canonical" href="https://www.vibeenergy.nl/${FIXTURE_ROUTE}">`),
    'canonical mag nooit naar de onderwerp-eigenaar wijzen'
  );
  toets('pagina staat op index, follow', /<meta name="robots" content="index, follow">/.test(html));
  toets('NewsArticle in de JSON-LD', /"@type":"NewsArticle"/.test(html));
  toets('datePublished in de JSON-LD', /"datePublished":"2026-10-10"/.test(html));
  toets('citation met de bron-URL', /"citation"/.test(html) && html.includes('https://www.acm.nl/'));
  toets('isBasedOn verwijst naar de onderwerp-eigenaar', html.includes(`"isBasedOn":"https://www.vibeenergy.nl/${EIGENAAR}"`));
  toets('zichtbare publicatiedatum', /data-nieuws-datum/.test(html) && />Gepubliceerd op 2026-10-10</.test(html));
  toets('zichtbare bronnensectie met peildatum', /id="bronnen"/.test(html) && /geraadpleegd op 2026-10-10/.test(html));
  toets('link naar de onderwerp-eigenaar', html.includes(`href="/${EIGENAAR}"`));
  toets('link naar de verwante kennispagina', html.includes('href="/kennis/netcongestie-uitgelegd"'));
  toets('kruimelpad via Nieuws', /href="\/nieuws"/.test(html) && /aria-current="page"/.test(html));
  toets('conversie naar contact', html.includes('href="/contact"'));

  toets('hub linkt naar het artikel', hubHtml.includes(`href="/${FIXTURE_ROUTE}"`));
  toets('hub groepeert op onderwerp', hubHtml.includes(`id="onderwerp-${EIGENAAR}"`));

  const sitemap = readFileSync(resolve(wortel, 'sitemap.xml'), 'utf8');
  toets('artikel in de sitemap', sitemap.includes(`<loc>https://www.vibeenergy.nl/${FIXTURE_ROUTE}</loc>`));
  toets('hub in de sitemap', sitemap.includes('<loc>https://www.vibeenergy.nl/nieuws</loc>'));

  /* De navigatie: nu de hub INDEX is, hoort /nieuws in de noscript-navigatie
     van zowel een gegenereerde als een bestaande pagina te staan. */
  const regioHtml = readFileSync(resolve(wortel, 'regios.html'), 'utf8');
  const indexHtml = readFileSync(resolve(wortel, 'index.html'), 'utf8');
  toets('gegenereerde pagina heeft /nieuws in de navigatie', /<noscript[\s\S]*?href="\/nieuws"[\s\S]*?<\/noscript>/.test(regioHtml));
  toets('bestaande pagina heeft /nieuws in de navigatie', /<noscript[\s\S]*?href="\/nieuws"[\s\S]*?<\/noscript>/.test(indexHtml));

  /* De poort moet dit alles goedkeuren — behalve poort 16, die terecht
     klaagt dat vibe/chrome.js de zichtbare navigatielink mist. Dat is geen
     fout van dit script maar het opleverpunt dat bij activering hoort. */
  const p = draai('audit.mjs');
  const poort16 = /16 Nieuwskanaal\s+(PASS|FAIL)\s+(.*)/.exec(p.uit);
  toets('poort 16 meet het artikel', !!poort16 && /1 gepubliceerd artikel/.test(poort16[2]), poort16 ? poort16[2] : 'poort 16 niet gevonden');
  toets(
    'poort 16 eist de zichtbare navigatielink in vibe/chrome.js',
    /chrome\.js heeft geen \/nieuws-link/.test(p.uit),
    'zonder deze bevinding kan het kanaal live staan zonder dat een bezoeker het kan vinden'
  );

  /* ---------------------------------------------------------------- FASE C */
  console.log('\nFASE C — opruimen laat geen spoor achter');
} finally {
  ruimFixtureOp();
  const r1 = draai('bouw-routes.mjs');
  const r2 = draai('genereer.mjs');
  const r3 = draai('herstel-bestaand.mjs');
  const r4 = draai('sitemap.mjs');
  const alleOk = r1.ok && r2.ok && r3.ok && r4.ok;
  toets('keten draait na opruimen', alleOk, alleOk ? '' : [r1, r2, r3, r4].filter((x) => !x.ok).map((x) => x.uit.slice(-200)).join(' | '));
  toets('artikelbestand is opgeruimd', !existsSync(resolve(wortel, `${FIXTURE_ROUTE}.html`)));
  toets('hubbestand is opgeruimd', !existsSync(resolve(wortel, 'nieuws.html')));
  const staatNa = werkboomstaat();
  toets('werkboom is weer als voor de meting', staatNa === staatVoor, staatNa === staatVoor ? '' : `voor:\n${staatVoor}\nna:\n${staatNa}`);
}

console.log('');
console.log('-'.repeat(72));
console.log(`geslaagd: ${geslaagd}   mislukt: ${mislukt.length}`);
if (mislukt.length) {
  for (const m of mislukt) console.log(`  FAIL ${m}`);
  console.log('EINDOORDEEL QA NIEUWSKANAAL = FAIL');
  process.exit(1);
}
console.log('EINDOORDEEL QA NIEUWSKANAAL = PASS');
