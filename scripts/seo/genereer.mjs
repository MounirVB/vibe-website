/* ============================================================================
   VIBE ENERGY — GENERATOR
   ----------------------------------------------------------------------------
   Schrijft HTML voor elke INDEX-route die niet al bestond. PENDING-routes
   krijgen GEEN bestand, geen sitemapregel, geen canonical en geen interne
   link — dat is het hele punt van de toestandsmachine.

   Draaien: node scripts/seo/genereer.mjs
   Daarna:  node scripts/seo/sitemap.mjs && node scripts/seo/audit.mjs
   ============================================================================ */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HOST, href, url, bestand, routeGemeente, routeGemeenteFamilie, routeProvincie, routeProvincieFamilie, REGIO_WORTEL } from './lib/paden.mjs';
import { pagina, opening, directAntwoord, tekstsectie, kaarten, specs, faqSectie, verwant, conversie, esc, bronregel, ic, zetNavToets } from './lib/sjabloon.mjs';
import { artikel, dienst, faq as faqLd, gebied } from './lib/schema.mjs';
import { Linkmotor, naamVan } from './lib/links.mjs';
import {
  netbeheerderAlinea,
  terreinenAlinea,
  vestigingenAlinea,
  congestieAlinea,
  projectenBlok,
  FAMILIE_BELOFTE,
  getal,
} from './lib/regio-inhoud.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');
const lees = (...p) => JSON.parse(readFileSync(resolve(wortel, ...p), 'utf8'));

const reg = lees('data', 'seo', 'routes.json');
const provincies = lees('data', 'geo', 'provincies.json').provincies;
const gemeenten = lees('data', 'geo', 'gemeenten.json').gemeenten;
const opl = lees('data', 'seo', 'oplossingen.json');
const vestBron = lees('data', 'bewijs', 'vestigingen.json');
const terrBron = lees('data', 'bewijs', 'bedrijventerreinen.json');
const nbBron = lees('data', 'bewijs', 'netbeheerders.json');
const projBron = lees('data', 'bewijs', 'projecten-geo.json');

const register = new Map(reg.routes.map((r) => [r.route, r]));
const motor = new Linkmotor(register);

/* De voorwaardelijke navigatie-items (nu: /nieuws) mogen alleen in de
   <noscript>-navigatie staan als hun route echt op INDEX staat. Dit MOET vóór
   de eerste pagina gezet worden, anders draagt de eerst gegenereerde pagina
   een andere navigatie dan de rest. */
zetNavToets((route) => motor.isIndex(route));

const provOp = new Map(provincies.map((p) => [p.provinciecode, p]));
const gemOp = new Map(gemeenten.map((g) => [g.gemeentecode, g]));
const famOp = new Map(opl.families.map((f) => [f.slug, f]));

/* Bronverwijzingen, één keer gedefinieerd zodat elke pagina dezelfde bron en
   datum noemt. */
const BRON = {
  vestigingen: { naam: `CBS, tabel ${'81575NED'} — vestigingen van bedrijven per gemeente`, url: 'https://opendata.cbs.nl/statline/#/CBS/nl/dataset/81575NED/table', datum: vestBron.bron_datum },
  terreinen: { naam: 'IBIS Bedrijventerreinen (Interprovinciaal Overleg, CC0)', url: 'https://data.overheid.nl/dataset/35825-ligging-bedrijventerreinen', datum: terrBron.bron_datum },
  netbeheer: { naam: 'Netbeheergebieden elektriciteit, Stichting Mijnaansluiting.nl', url: 'https://data.overheid.nl/dataset/81000-netbeheergebieden-elektriciteit--gas--media--riolering--warmte-en-water', datum: nbBron.bron_datum },
  geo: { naam: 'CBS gemeente-indeling 2026 / PDOK Bestuurlijke Grenzen', url: 'https://www.pdok.nl/', datum: '2026-10-10' },
};

const geschreven = [];
function schrijf(route, html) {
  const pad = resolve(wortel, bestand(route));
  mkdirSync(dirname(pad), { recursive: true });
  writeFileSync(pad, html);
  geschreven.push(bestand(route));
}

/* ------------------------------------------------- opruimen van oude output
   Een route die van INDEX naar PENDING gaat moet zijn bestand kwijtraken,
   anders blijft er een pagina staan die nergens meer bij hoort. Het manifest
   van de vorige run is daarvoor de administratie. */
const manifestPad = resolve(wortel, 'data', 'seo', 'gegenereerd.json');
if (existsSync(manifestPad)) {
  const vorige = JSON.parse(readFileSync(manifestPad, 'utf8'));
  const nuIndex = new Set(reg.routes.filter((r) => r.staat === 'INDEX' && !r.bestaand).map((r) => bestand(r.route)));
  for (const f of vorige.bestanden || []) {
    if (nuIndex.has(f)) continue;
    const p = resolve(wortel, f);
    if (existsSync(p)) {
      rmSync(p);
      console.log(`opgeruimd (niet langer INDEX): ${f}`);
    }
  }
}

/* ============================================================ hulpstukken */

function bewijsVanGemeente(code) {
  return {
    vestigingen: vestBron.per_gemeente[code] ?? null,
    terreinen: terrBron.per_gemeente[code] || [],
    netbeheerder: nbBron.per_gemeente[code] || null,
    projecten: projBron.per_gemeente[code] || [],
  };
}

/** Families met een INDEX-pagina voor deze gemeente. */
function familiesVanGemeente(g) {
  return opl.families
    .map((f) => ({ f, route: routeGemeenteFamilie(g.provincie_slug, g.slug, f.slug) }))
    .filter((x) => motor.isIndex(x.route))
    .map((x) => ({ naam: x.f.naam, belofte: FAMILIE_BELOFTE[x.f.slug] || x.f.naam, route: x.route, slug: x.f.slug }));
}

function familiesVanProvincie(p) {
  return opl.families
    .map((f) => ({ f, route: routeProvincieFamilie(p.slug, f.slug) }))
    .filter((x) => motor.isIndex(x.route))
    .map((x) => ({ naam: x.f.naam, belofte: FAMILIE_BELOFTE[x.f.slug] || x.f.naam, route: x.route, slug: x.f.slug }));
}

function gemeentenMetPagina(p) {
  return gemeenten
    .filter((g) => g.provinciecode === p.provinciecode)
    .map((g) => ({ g, route: routeGemeente(g.provincie_slug, g.slug) }))
    .filter((x) => motor.isIndex(x.route));
}

function provinciesMetPagina() {
  return provincies.map((p) => ({ p, route: routeProvincie(p.slug) })).filter((x) => motor.isIndex(x.route));
}

/** De verwante-blokken, altijd gefilterd op INDEX. */
function verwantBlok(route, groepen) {
  const schoon = groepen
    .map((g) => ({ kop: g.kop, items: motor.filter(g.items) }))
    .filter((g) => g.items.length);
  for (const g of schoon) motor.tel(route, g.items);
  return verwant(schoon);
}

/* ======================================================= /regios (wortel) */
function bouwRegioWortel() {
  const route = REGIO_WORTEL;
  if (!motor.isIndex(route)) return;
  const lijst = provinciesMetPagina();

  const rijen = lijst
    .map(({ p, route: pr }) => {
      const gem = gemeentenMetPagina(p);
      const projecten = gem.reduce((a, x) => a + (projBron.per_gemeente[x.g.gemeentecode] || []).length, 0);
      return {
        kop: p.naam,
        tekst: `${getal(projecten)} gerealiseerd${projecten === 1 ? ' project' : 'e projecten'} in ${getal(gem.length)} gemeente${gem.length === 1 ? '' : 'n'}: ${gem
          .map((x) => esc(x.g.naam))
          .join(', ')}.`,
        route: pr,
        label: `Bekijk ${p.naam}`,
      };
    });
  motor.tel(route, lijst.map((x) => ({ route: x.route, naam: x.p.naam })));

  const totaalGem = lijst.reduce((a, x) => a + gemeentenMetPagina(x.p).length, 0);

  const inhoud = [
    opening({
      kruimels: [],
      kruimelLabel: "Regio's",
      h1: 'Waar Vibe Energy heeft gebouwd',
      lead:
        'Vibe Energy werkt door heel Nederland. Deze regiopagina&rsquo;s gaan alleen over gebieden waar er ' +
        'daadwerkelijk iets is opgeleverd. Staat uw gemeente er niet bij, dan betekent dat niet dat we er niet ' +
        'komen &mdash; alleen dat we er nog geen project hebben dat we kunnen laten zien.',
      acties: [
        `<a class="ve-btn ve-btn--primair ve-btn--lg" href="${href('contact')}">Plan een adviesgesprek${ic('pijl')}</a>`,
        `<a class="ve-btn ve-btn--ghost ve-btn--lg" href="${href('projecten')}">Alle projecten</a>`,
      ],
    }),
    directAntwoord({
      vraag: 'In welke regio&rsquo;s is Vibe Energy actief?',
      antwoord:
        `Vibe Energy is gevestigd in Arnhem en levert landelijk. Er zijn op dit moment gerealiseerde projecten in ` +
        `${getal(lijst.length)} provincie${lijst.length === 1 ? '' : 's'} en ${getal(totaalGem)} gemeenten: ` +
        lijst.map((x) => esc(x.p.naam)).join(', ') +
        `. Voor die gebieden staat hieronder wat er is gebouwd en wat de zakelijke energiecontext er is.`,
      voorbehoud:
        'Deze lijst is beperkt tot gebieden met een gepubliceerd, opgeleverd project. Het is geen uitspraak over ' +
        'waar Vibe Energy wel of niet kan leveren.',
    }),
    kaarten({
      kop: 'Provincies met gerealiseerd werk',
      lead: 'Per provincie: wat er staat, in welke gemeenten, en welke oplossingen daar zijn aangetoond.',
      kaarten: rijen,
      variant: 've-sec--paper ve-sec--line-y',
    }),
    tekstsectie({
      kop: 'Waarom hier geen lijst van 342 gemeenten staat',
      prose:
        '<p>Een regiopagina heeft alleen zin als hij iets zegt wat een landelijke pagina niet zegt. Een pagina met ' +
        'een gemeentenaam en verder dezelfde tekst is geen informatie, maar ruis &mdash; voor de bezoeker en voor de ' +
        'zoekmachine.</p>' +
        '<p>Daarom publiceren we een gemeentepagina pas als er minstens twee onafhankelijke, verifieerbare feiten ' +
        'over die gemeente op staan die ergens anders niet staan. In de praktijk betekent dat: een opgeleverd ' +
        'project in die gemeente, naast de officiële cijfers over bedrijvigheid en bedrijventerreinen.</p>' +
        '<p>De overige gemeenten zitten wel in ons routeregister, met hun bewijs erbij. Zodra daar werk staat dat ' +
        'we mogen laten zien, komt de pagina erbij.</p>',
    }),
    verwantBlok(route, [
      { kop: 'Oplossingen', items: [
        { route: 'netcongestie', naam: naamVan('netcongestie') },
        { route: 'systeem-energieopslag', naam: naamVan('systeem-energieopslag') },
        { route: 'systeem-zonnepanelen', naam: naamVan('systeem-zonnepanelen') },
        { route: 'systeem-laadpalen', naam: naamVan('systeem-laadpalen') },
        { route: 'laadplein', naam: naamVan('laadplein') },
      ] },
      { kop: 'Achtergrond', items: [
        { route: 'kennis', naam: naamVan('kennis') },
        { route: 'toepassingen', naam: naamVan('toepassingen') },
        { route: 'sectoren', naam: naamVan('sectoren') },
        { route: 'subsidies', naam: naamVan('subsidies') },
      ] },
      { kop: 'Vibe Energy', items: [
        { route: 'projecten', naam: naamVan('projecten') },
        { route: 'over-ons', naam: naamVan('over-ons') },
        { route: 'contact', naam: naamVan('contact') },
      ] },
    ]),
    conversie({
      kop: 'Werkt u in een gemeente die er niet bij staat?',
      tekst:
        'Dat is geen bezwaar. Vertel ons waar uw locatie staat en wat er knelt; wij komen kijken of het met de ' +
        'bestaande aansluiting op te lossen is.',
      primair: { route: 'contact', label: 'Plan een adviesgesprek' },
    }),
  ].join('\n\n');

  schrijf(
    route,
    pagina({
      route,
      titel: "Regio's — waar Vibe Energy heeft gebouwd | Vibe Energy",
      beschrijving:
        'Gerealiseerde energie-infrastructuur van Vibe Energy per provincie en gemeente, met de officiële cijfers ' +
        'over bedrijvigheid, bedrijventerreinen en netbeheerder per gebied.',
      ogTitel: "Regio's — waar Vibe Energy heeft gebouwd",
      dataPagina: 'regios',
      kruimels: [],
      kruimelLabel: "Regio's",
      gewijzigd: reg._gegenereerd,
      inhoud,
    })
  );
}

/* ================================================== /regios/<provincie> */
function bouwProvincie(p) {
  const route = routeProvincie(p.slug);
  if (!motor.isIndex(route)) return;

  const gem = gemeentenMetPagina(p);
  const alleGem = gemeenten.filter((g) => g.provinciecode === p.provinciecode);
  const fams = familiesVanProvincie(p);
  const projectLijst = gem.flatMap((x) => (projBron.per_gemeente[x.g.gemeentecode] || []).map((pr) => ({ ...pr, gemeente: x.g.naam })));

  /* Netbeheerders die in deze provincie voorkomen — dat is een echt
     provinciaal feit, afgeleid uit de gemeentetoewijzing. */
  const nbTel = new Map();
  for (const g of alleGem) {
    const nb = nbBron.per_gemeente[g.gemeentecode];
    if (!nb) continue;
    nbTel.set(nb.netbeheerder, (nbTel.get(nb.netbeheerder) || 0) + 1);
  }
  const nbLijst = [...nbTel.entries()].sort((a, b) => b[1] - a[1]);

  const terreinTotaal = alleGem.reduce((a, g) => a + (terrBron.per_gemeente[g.gemeentecode] || []).length, 0);
  const vestTotaal = alleGem.reduce((a, g) => a + (vestBron.per_gemeente[g.gemeentecode] || 0), 0);

  const naam = p.naam + (p.aliassen?.length ? ` (${p.aliassen.join(', ')})` : '');

  const gemLijst = alleGem
    .map((g) => {
      const r = routeGemeente(g.provincie_slug, g.slug);
      return motor.isIndex(r)
        ? `          <li><a href="${href(r)}">${esc(g.naam)}</a></li>`
        : `          <li><span>${esc(g.naam)}</span></li>`;
    })
    .join('\n');

  const inhoud = [
    opening({
      kruimels: [{ naam: "Regio's", route: REGIO_WORTEL }],
      kruimelLabel: p.naam,
      h1: `Energie-infrastructuur voor bedrijven in ${esc(p.naam)}`,
      lead:
        `Wat Vibe Energy in ${esc(p.naam)} heeft gebouwd, bij welke netbeheerders u hier terechtkomt, en hoe groot ` +
        `de zakelijke energiemarkt in deze provincie is &mdash; met de bron bij elk cijfer.`,
      acties: [
        `<a class="ve-btn ve-btn--primair ve-btn--lg" href="${href('contact')}">Vraag een energiescan aan${ic('pijl')}</a>`,
        `<a class="ve-btn ve-btn--ghost ve-btn--lg" href="#bewijs">Bekijk het gerealiseerde werk</a>`,
      ],
    }),
    directAntwoord({
      vraag: `Wat heeft Vibe Energy in ${esc(p.naam)} gerealiseerd?`,
      antwoord:
        `In ${esc(p.naam)} heeft Vibe Energy ${getal(projectLijst.length)} ${projectLijst.length === 1 ? 'project' : 'projecten'} opgeleverd, ` +
        `in ${getal(gem.length)} gemeente${gem.length === 1 ? '' : 'n'}: ${gem.map((x) => esc(x.g.naam)).join(', ')}. ` +
        (nbLijst.length === 1
          ? `De netbeheerder voor elektriciteit in deze provincie is ${esc(nbLijst[0][0])}.`
          : `De provincie wordt bediend door ${nbLijst.length} netbeheerders: ${nbLijst.map(([n, c]) => `${esc(n)} (${c} gemeenten)`).join(', ')}.`),
      voorbehoud:
        'De netbeheerderverdeling is bepaald per gemeente en per gemeente afgerond; een gemeente kan door meer dan ' +
        'één netbeheerder worden bediend.',
      bronnen: [BRON.netbeheer, BRON.geo],
    }),
    tekstsectie({
      id: 'bewijs',
      kop: `Gerealiseerd in ${esc(p.naam)}`,
      prose: projectenBlok(p.naam, projectLijst),
      variant: 've-sec--paper ve-sec--line-y',
    }),
    tekstsectie({
      kop: `De zakelijke energiecontext van ${esc(p.naam)}`,
      lead: 'Officiële cijfers, met bron en datum. Geen schattingen.',
      prose:
        `<p>${esc(p.naam)} telt ${getal(alleGem.length)} gemeenten, samen ongeveer ${getal(vestTotaal)} ingeschreven ` +
        `vestigingen van bedrijven en ${getal(terreinTotaal)} bedrijventerreinen in het IBIS-register.</p>` +
        bronregel([BRON.vestigingen, BRON.terreinen]) +
        (nbLijst.length
          ? `<p>De netbeheerders in deze provincie, geteld naar het aantal gemeenten waarvan het grootste deel ` +
            `onder hen valt: ${nbLijst.map(([n, c]) => `<strong>${esc(n)}</strong> (${c})`).join(', ')}.</p>` +
            bronregel([BRON.netbeheer])
          : '') +
        congestieAlinea(p.naam),
    }),
    fams.length
      ? kaarten({
          kop: `Oplossingen met gerealiseerd werk in ${esc(p.naam)}`,
          lead: 'Alleen de oplossingen waarvan hier een opgeleverd zakelijk project bestaat.',
          kaarten: fams.map((f) => ({ kop: f.naam, tekst: f.belofte, route: f.route, label: `${f.naam} in ${p.naam}` })),
          variant: 've-sec--sunken ve-sec--line-y',
        })
      : '',
    `  <section class="ve-sec ve-sec--lg">
    <div class="ve-wrap">
      <div class="ve-head">
        <h2 class="ve-h2">Gemeenten in ${esc(p.naam)}</h2>
        <p class="ve-lead">De gemeenten met een eigen pagina zijn aanklikbaar. De overige staan hier omdat ze bij
        deze provincie horen, niet omdat er een pagina voor is &mdash; die komt er pas als er werk staat dat we
        mogen laten zien.</p>
      </div>
      <ul class="ve-regios">
${gemLijst}
      </ul>
      ${bronregel([BRON.geo])}
    </div>
  </section>`,
    verwantBlok(route, [
      { kop: 'Gemeenten met een eigen pagina', items: gem.map((x) => ({ route: x.route, naam: x.g.naam })) },
      { kop: `Oplossingen in ${p.naam}`, items: fams.map((f) => ({ route: f.route, naam: f.naam })) },
      { kop: 'Landelijk', items: [
        { route: 'netcongestie', naam: naamVan('netcongestie') },
        { route: 'systeem-energieopslag', naam: naamVan('systeem-energieopslag') },
        { route: 'kennis', naam: naamVan('kennis') },
        { route: REGIO_WORTEL, naam: naamVan(REGIO_WORTEL) },
      ] },
    ]),
    conversie({
      kop: `Een locatie in ${esc(p.naam)} die niet verder kan?`,
      tekst:
        'Stuur ons het kwartiersprofiel of de aansluitgegevens. Wij rekenen door wat er binnen de bestaande ' +
        'aansluiting mogelijk is, en wat niet.',
      primair: { route: 'contact', label: 'Vraag een energiescan aan' },
      secundair: { route: 'projecten', label: 'Bekijk alle projecten' },
    }),
  ]
    .filter(Boolean)
    .join('\n\n');

  const paginaUrl = url(route);
  schrijf(
    route,
    pagina({
      route,
      titel: `Zakelijke energie-infrastructuur in ${p.naam} | Vibe Energy`,
      beschrijving:
        `Gerealiseerde batterijopslag, zonnedaken en laadinfrastructuur in ${p.naam}, met de netbeheerders in deze ` +
        `provincie en de officiële cijfers over bedrijventerreinen en bedrijvigheid.`,
      ogTitel: `Zakelijke energie-infrastructuur in ${p.naam}`,
      dataPagina: 'regios',
      kruimels: [{ naam: "Regio's", route: REGIO_WORTEL }],
      kruimelLabel: p.naam,
      gewijzigd: reg._gegenereerd,
      extraKnopen: [
        gebied(paginaUrl, { naam: p.naam, soort: 'provincie', code: p.provinciecode, ouderNaam: 'Nederland' }),
        dienst(paginaUrl, {
          naam: 'Energie-infrastructuur achter de meter',
          beschrijving: `Ontwerp, realisatie en beheer van batterijopslag, zonne-energie en laadinfrastructuur voor bedrijven in ${p.naam}.`,
          gebied: { '@type': 'AdministrativeArea', name: p.naam },
        }),
      ],
      inhoud,
    })
  );
}

/* ========================================= /regios/<provincie>/<familie> */
function bouwProvincieFamilie(p, f) {
  const route = routeProvincieFamilie(p.slug, f.slug);
  if (!motor.isIndex(route)) return;

  const gem = gemeenten.filter((g) => g.provinciecode === p.provinciecode);
  const dragend = gem
    .flatMap((g) => (projBron.per_gemeente[g.gemeentecode] || []).map((pr) => ({ ...pr, gemeente: g.naam, gemeentecode: g.gemeentecode })))
    .filter((pr) => (pr.families_zakelijk || []).includes(f.slug));

  const gemeenteRoutes = gem
    .map((g) => ({ g, route: routeGemeenteFamilie(g.provincie_slug, g.slug, f.slug) }))
    .filter((x) => motor.isIndex(x.route));

  const eigenaar = f.nationale_eigenaar;
  const terreinTotaal = gem.reduce((a, g) => a + (terrBron.per_gemeente[g.gemeentecode] || []).length, 0);

  const inhoud = [
    opening({
      kruimels: [
        { naam: "Regio's", route: REGIO_WORTEL },
        { naam: p.naam, route: routeProvincie(p.slug) },
      ],
      kruimelLabel: f.naam,
      h1: `${esc(f.naam)} in ${esc(p.naam)}`,
      lead: FAMILIE_BELOFTE[f.slug] || f.naam,
      acties: [
        `<a class="ve-btn ve-btn--primair ve-btn--lg" href="${href('contact')}">Vraag een analyse aan${ic('pijl')}</a>`,
        motor.isIndex(eigenaar) ? `<a class="ve-btn ve-btn--ghost ve-btn--lg" href="${href(eigenaar)}">Hoe het werkt</a>` : '',
      ].filter(Boolean),
    }),
    directAntwoord({
      vraag: `Heeft Vibe Energy ${esc(f.naam.toLowerCase())} in ${esc(p.naam)} gerealiseerd?`,
      antwoord:
        `Ja. In ${esc(p.naam)} ${dragend.length === 1 ? 'is' : 'zijn'} ${getal(dragend.length)} zakelijk ` +
        `${dragend.length === 1 ? 'project' : 'projecten'} opgeleverd waarin ${esc(f.naam.toLowerCase())} deel van de ` +
        `installatie is: ${dragend.map((d) => `${esc(d.titel)} (${esc(d.gemeente)})`).join(', ')}. ` +
        `De technische gegevens staan op de projectpagina's zelf.`,
    }),
    tekstsectie({
      kop: `Gerealiseerd in ${esc(p.naam)}`,
      prose: projectenBlok(p.naam, dragend),
      variant: 've-sec--paper ve-sec--line-y',
    }),
    tekstsectie({
      kop: `Waarom dit in ${esc(p.naam)} speelt`,
      prose:
        `<p>${esc(p.naam)} telt ${getal(terreinTotaal)} bedrijventerreinen in het IBIS-register. Dat zijn de locaties ` +
        `waar de zakelijke energievraag zich concentreert, en waar een beperkte aansluiting het eerst in de weg zit.</p>` +
        bronregel([BRON.terreinen]) +
        congestieAlinea(p.naam),
    }),
    gemeenteRoutes.length
      ? kaarten({
          kop: `${esc(f.naam)} per gemeente`,
          lead: 'Gemeenten in deze provincie waar dit is aangetoond met een opgeleverd project.',
          kaarten: gemeenteRoutes.map((x) => ({
            kop: x.g.naam,
            tekst: `Opgeleverd werk in ${esc(x.g.naam)} waarin ${esc(f.naam.toLowerCase())} deel van de installatie is.`,
            route: x.route,
            label: `${f.naam} in ${x.g.naam}`,
          })),
          variant: 've-sec--sunken ve-sec--line-y',
        })
      : '',
    verwantBlok(route, [
      { kop: 'Hoe het werkt', items: [
        { route: eigenaar, naam: naamVan(eigenaar, f.naam) },
        ...(f.kennis || []).map((k) => ({ route: `kennis/${k}`, naam: k.replace(/-/g, ' ') })),
      ] },
      { kop: 'Voor welke sectoren', items: (f.sectoren || []).map((s) => ({ route: s, naam: naamVan(s, s) })) },
      { kop: 'In deze regio', items: [
        { route: routeProvincie(p.slug), naam: p.naam },
        ...gemeenteRoutes.map((x) => ({ route: x.route, naam: `${f.naam} in ${x.g.naam}` })),
        { route: REGIO_WORTEL, naam: naamVan(REGIO_WORTEL) },
      ] },
    ]),
    conversie({
      kop: `${esc(f.naam)} voor uw locatie in ${esc(p.naam)}`,
      tekst:
        'Wij beginnen met meten: het kwartiersprofiel, de aansluitwaarde en wat er feitelijk over is. Daarna ' +
        'weet u of dit bij u iets oplost.',
      primair: { route: 'contact', label: 'Vraag een analyse aan' },
    }),
  ]
    .filter(Boolean)
    .join('\n\n');

  const paginaUrl = url(route);
  schrijf(
    route,
    pagina({
      route,
      titel: `${f.naam} in ${p.naam} | Vibe Energy`,
      beschrijving:
        `${f.naam} voor bedrijven in ${p.naam}, met gerealiseerde projecten in deze provincie en de officiële ` +
        `cijfers over bedrijventerreinen en netbeheer.`,
      ogTitel: `${f.naam} in ${p.naam}`,
      dataPagina: 'regios',
      kruimels: [
        { naam: "Regio's", route: REGIO_WORTEL },
        { naam: p.naam, route: routeProvincie(p.slug) },
      ],
      kruimelLabel: f.naam,
      gewijzigd: reg._gegenereerd,
      extraKnopen: [
        gebied(paginaUrl, { naam: p.naam, soort: 'provincie', code: p.provinciecode, ouderNaam: 'Nederland' }),
        dienst(paginaUrl, {
          naam: f.naam_lang || f.naam,
          beschrijving: FAMILIE_BELOFTE[f.slug] || f.naam,
          gebied: { '@type': 'AdministrativeArea', name: p.naam },
        }),
      ],
      inhoud,
    })
  );
}

/* ====================================== /regios/<provincie>/<gemeente> */
function bouwGemeente(g) {
  const route = routeGemeente(g.provincie_slug, g.slug);
  if (!motor.isIndex(route)) return;

  const p = provOp.get(g.provinciecode);
  const bw = bewijsVanGemeente(g.gemeentecode);
  const fams = familiesVanGemeente(g);
  const buren = gemeentenMetPagina(p).filter((x) => x.g.gemeentecode !== g.gemeentecode);

  const segmenten = [...new Set(bw.projecten.map((x) => x.segment))];
  const sectoren = [...new Set(bw.projecten.map((x) => x.sector).filter(Boolean))];

  const inhoud = [
    opening({
      kruimels: [
        { naam: "Regio's", route: REGIO_WORTEL },
        { naam: p.naam, route: routeProvincie(p.slug) },
      ],
      kruimelLabel: g.naam,
      h1: `Energie-infrastructuur voor bedrijven in ${esc(g.naam)}`,
      lead:
        `Wat Vibe Energy in ${esc(g.naam)} heeft opgeleverd, wie hier de netbeheerder is en hoe de zakelijke ` +
        `energiemarkt in deze gemeente eruitziet &mdash; met de bron bij elk cijfer.`,
      acties: [
        `<a class="ve-btn ve-btn--primair ve-btn--lg" href="${href('contact')}">Vraag een energiescan aan${ic('pijl')}</a>`,
        `<a class="ve-btn ve-btn--ghost ve-btn--lg" href="#bewijs">Bekijk het werk hier</a>`,
      ],
    }),
    directAntwoord({
      vraag: `Wat heeft Vibe Energy in ${esc(g.naam)} gedaan?`,
      antwoord:
        `Vibe Energy heeft in de gemeente ${esc(g.naam)} ${getal(bw.projecten.length)} ` +
        `${bw.projecten.length === 1 ? 'project' : 'projecten'} opgeleverd` +
        (sectoren.length ? ` in de sector${sectoren.length === 1 ? '' : 'en'} ${sectoren.map((s) => esc(s.toLowerCase())).join(', ')}` : '') +
        `. ` +
        (bw.netbeheerder?.zekerheid === 'EENDUIDIG'
          ? `De netbeheerder voor elektriciteit is hier ${esc(bw.netbeheerder.netbeheerder_naam)}. `
          : '') +
        (typeof bw.vestigingen === 'number'
          ? `De gemeente telt ${getal(bw.vestigingen)} ingeschreven vestigingen van bedrijven en ${getal(bw.terreinen.length)} bedrijventerreinen.`
          : ''),
      voorbehoud:
        segmenten.length === 1 && segmenten[0] === 'residentieel'
          ? 'Het werk in deze gemeente betreft wooncomplexen en woningportefeuilles. Dat bewijst dat Vibe Energy hier ' +
            'heeft gebouwd, maar het is geen referentie voor een zakelijke installatie.'
          : null,
      bronnen: [BRON.vestigingen, BRON.terreinen, bw.netbeheerder ? BRON.netbeheer : null].filter(Boolean),
    }),
    tekstsectie({
      id: 'bewijs',
      kop: `Opgeleverd in ${esc(g.naam)}`,
      prose: projectenBlok(g.naam, bw.projecten),
      variant: 've-sec--paper ve-sec--line-y',
    }),
    tekstsectie({
      kop: `De zakelijke energiecontext van ${esc(g.naam)}`,
      lead: 'Officiële cijfers met bron en datum. Wat we niet weten, staat er niet.',
      prose:
        vestigingenAlinea(g.naam, bw.vestigingen, BRON.vestigingen) +
        terreinenAlinea(g.naam, bw.terreinen, BRON.terreinen) +
        netbeheerderAlinea(g.naam, bw.netbeheerder, BRON.netbeheer),
    }),
    tekstsectie({
      kop: `Is er transportcapaciteit in ${esc(g.naam)}?`,
      prose: congestieAlinea(g.naam),
      variant: 've-sec--sunken ve-sec--line-y',
    }),
    fams.length
      ? kaarten({
          kop: `Aangetoond in ${esc(g.naam)}`,
          lead: 'Alleen de oplossingen waarvan hier een opgeleverd zakelijk project bestaat.',
          kaarten: fams.map((f) => ({ kop: f.naam, tekst: f.belofte, route: f.route, label: `${f.naam} in ${g.naam}` })),
        })
      : '',
    verwantBlok(route, [
      { kop: `Oplossingen in ${g.naam}`, items: fams.map((f) => ({ route: f.route, naam: f.naam })) },
      { kop: 'Landelijke oplossingen', items: [
        { route: 'netcongestie', naam: naamVan('netcongestie') },
        { route: 'systeem-energieopslag', naam: naamVan('systeem-energieopslag') },
        { route: 'systeem-zonnepanelen', naam: naamVan('systeem-zonnepanelen') },
        { route: 'systeem-laadpalen', naam: naamVan('systeem-laadpalen') },
        { route: 'vibe-control', naam: naamVan('vibe-control') },
      ] },
      { kop: 'In de buurt', items: [
        { route: routeProvincie(p.slug), naam: p.naam },
        ...buren.map((x) => ({ route: x.route, naam: x.g.naam })),
        { route: REGIO_WORTEL, naam: naamVan(REGIO_WORTEL) },
      ] },
      { kop: 'Achtergrond', items: [
        { route: 'kennis', naam: naamVan('kennis') },
        { route: 'toepassingen', naam: naamVan('toepassingen') },
        { route: 'subsidies', naam: naamVan('subsidies') },
        { route: 'projecten', naam: naamVan('projecten') },
      ] },
    ]),
    conversie({
      kop: `Een pand in ${esc(g.naam)} dat niet verder kan?`,
      tekst:
        'Wij beginnen met de aansluitgegevens en het kwartiersprofiel. Daarna weet u wat er binnen de bestaande ' +
        'aansluiting mogelijk is &mdash; en of verzwaren echt nodig is.',
      primair: { route: 'contact', label: 'Vraag een energiescan aan' },
      secundair: { route: 'projecten', label: 'Bekijk alle projecten' },
    }),
  ]
    .filter(Boolean)
    .join('\n\n');

  const paginaUrl = url(route);
  schrijf(
    route,
    pagina({
      route,
      titel: `Zakelijke energie-infrastructuur in ${g.naam} | Vibe Energy`,
      beschrijving:
        `Opgeleverde projecten van Vibe Energy in ${g.naam}, de netbeheerder in deze gemeente en de officiële ` +
        `cijfers over bedrijventerreinen en bedrijvigheid.`,
      ogTitel: `Zakelijke energie-infrastructuur in ${g.naam}`,
      dataPagina: 'regios',
      kruimels: [
        { naam: "Regio's", route: REGIO_WORTEL },
        { naam: p.naam, route: routeProvincie(p.slug) },
      ],
      kruimelLabel: g.naam,
      gewijzigd: reg._gegenereerd,
      extraKnopen: [
        gebied(paginaUrl, {
          naam: g.naam,
          soort: 'gemeente',
          code: g.gemeentecode,
          ouderNaam: p.naam,
          centroide: g.centroide,
        }),
        dienst(paginaUrl, {
          naam: 'Energie-infrastructuur achter de meter',
          beschrijving: `Batterijopslag, zonne-energie en laadinfrastructuur voor bedrijven in ${g.naam}.`,
          gebied: { '@type': 'AdministrativeArea', name: g.naam },
        }),
      ],
      inhoud,
    })
  );
}

/* ============================ /regios/<provincie>/<gemeente>/<familie> */
function bouwGemeenteFamilie(g, f) {
  const route = routeGemeenteFamilie(g.provincie_slug, g.slug, f.slug);
  if (!motor.isIndex(route)) return;

  const p = provOp.get(g.provinciecode);
  const bw = bewijsVanGemeente(g.gemeentecode);
  const dragend = bw.projecten.filter((x) => (x.families_zakelijk || []).includes(f.slug));
  const eigenaar = f.nationale_eigenaar;
  const provFamRoute = routeProvincieFamilie(p.slug, f.slug);

  const inhoud = [
    opening({
      kruimels: [
        { naam: "Regio's", route: REGIO_WORTEL },
        { naam: p.naam, route: routeProvincie(p.slug) },
        { naam: g.naam, route: routeGemeente(g.provincie_slug, g.slug) },
      ],
      kruimelLabel: f.naam,
      h1: `${esc(f.naam)} in ${esc(g.naam)}`,
      lead: FAMILIE_BELOFTE[f.slug] || f.naam,
      acties: [
        `<a class="ve-btn ve-btn--primair ve-btn--lg" href="${href('contact')}">Vraag een analyse aan${ic('pijl')}</a>`,
        motor.isIndex(eigenaar) ? `<a class="ve-btn ve-btn--ghost ve-btn--lg" href="${href(eigenaar)}">Hoe het werkt</a>` : '',
      ].filter(Boolean),
    }),
    directAntwoord({
      vraag: `Heeft Vibe Energy ${esc(f.naam.toLowerCase())} in ${esc(g.naam)} gerealiseerd?`,
      antwoord:
        `Ja. In ${esc(g.naam)} ${dragend.length === 1 ? 'is' : 'zijn'} ${getal(dragend.length)} zakelijk ` +
        `${dragend.length === 1 ? 'project' : 'projecten'} opgeleverd waarin ${esc(f.naam.toLowerCase())} deel van de ` +
        `installatie is: ${dragend.map((d) => esc(d.titel)).join(', ')}. De gegevens van die installatie staan op de ` +
        `projectpagina.`,
    }),
    tekstsectie({
      kop: `Het bewijs in ${esc(g.naam)}`,
      prose: projectenBlok(g.naam, dragend),
      variant: 've-sec--paper ve-sec--line-y',
    }),
    tekstsectie({
      kop: `De lokale omstandigheden in ${esc(g.naam)}`,
      prose:
        vestigingenAlinea(g.naam, bw.vestigingen, BRON.vestigingen) +
        terreinenAlinea(g.naam, bw.terreinen, BRON.terreinen) +
        netbeheerderAlinea(g.naam, bw.netbeheerder, BRON.netbeheer),
    }),
    tekstsectie({
      kop: 'Transportcapaciteit op uw eigen adres',
      prose: congestieAlinea(g.naam),
      variant: 've-sec--sunken ve-sec--line-y',
    }),
    verwantBlok(route, [
      { kop: 'Hoe het werkt', items: [
        { route: eigenaar, naam: naamVan(eigenaar, f.naam) },
        ...(f.kennis || []).map((k) => ({ route: `kennis/${k}`, naam: k.replace(/-/g, ' ') })),
      ] },
      { kop: 'Voor welke sectoren', items: (f.sectoren || []).map((s) => ({ route: s, naam: naamVan(s, s) })) },
      { kop: 'In deze regio', items: [
        { route: routeGemeente(g.provincie_slug, g.slug), naam: g.naam },
        { route: provFamRoute, naam: `${f.naam} in ${p.naam}` },
        { route: routeProvincie(p.slug), naam: p.naam },
      ] },
    ]),
    conversie({
      kop: `${esc(f.naam)} voor uw pand in ${esc(g.naam)}`,
      tekst:
        'Stuur de aansluitgegevens en het kwartiersprofiel. Wij rekenen door wat er binnen uw bestaande ' +
        'aansluiting past.',
      primair: { route: 'contact', label: 'Vraag een analyse aan' },
    }),
  ]
    .filter(Boolean)
    .join('\n\n');

  const paginaUrl = url(route);
  schrijf(
    route,
    pagina({
      route,
      titel: `${f.naam} in ${g.naam} | Vibe Energy`,
      beschrijving:
        `${f.naam} voor bedrijven in ${g.naam}: wat Vibe Energy hier heeft opgeleverd, wie de netbeheerder is en ` +
        `hoe de lokale zakelijke markt eruitziet.`,
      ogTitel: `${f.naam} in ${g.naam}`,
      dataPagina: 'regios',
      kruimels: [
        { naam: "Regio's", route: REGIO_WORTEL },
        { naam: p.naam, route: routeProvincie(p.slug) },
        { naam: g.naam, route: routeGemeente(g.provincie_slug, g.slug) },
      ],
      kruimelLabel: f.naam,
      gewijzigd: reg._gegenereerd,
      extraKnopen: [
        gebied(paginaUrl, { naam: g.naam, soort: 'gemeente', code: g.gemeentecode, ouderNaam: p.naam, centroide: g.centroide }),
        dienst(paginaUrl, {
          naam: f.naam_lang || f.naam,
          beschrijving: FAMILIE_BELOFTE[f.slug] || f.naam,
          gebied: { '@type': 'AdministrativeArea', name: g.naam },
        }),
      ],
      inhoud,
    })
  );
}

/* ================================================================ aanroep */
bouwRegioWortel();
for (const p of provincies) {
  bouwProvincie(p);
  for (const f of opl.families) bouwProvincieFamilie(p, f);
}
for (const g of gemeenten) {
  bouwGemeente(g);
  for (const f of opl.families) bouwGemeenteFamilie(g, f);
}

/* Nationale pagina's uit inhoudsbestanden — in een eigen module, omdat de
   vorm daar uit het inhoudsbestand komt en niet uit het bewijs. */
const { bouwNationaal } = await import('./genereer-nationaal.mjs');
const nat = bouwNationaal({ register, motor, schrijf, reg });

/* Het nieuwskanaal. Eigen module omdat een nieuwsartikel zijn navigatie en
   bronnenlijst afleidt uit de contractvelden in plaats van ze uit te typen.
   Komt NA bouwNationaal: de hub en de artikelen linken naar nationale
   pagina's, en de linkmotor moet die al gezien hebben. */
const { bouwNieuws } = await import('./genereer-nieuws.mjs');
const nieuws = bouwNieuws({ register, motor, schrijf });

writeFileSync(
  resolve(wortel, 'data', 'seo', 'gegenereerd.json'),
  JSON.stringify(
    {
      _toelichting:
        'Administratie van de vorige generatorrun. Nodig om een bestand op te ruimen zodra zijn route van INDEX naar PENDING gaat.',
      _gegenereerd: reg._gegenereerd,
      aantal: geschreven.length,
      bestanden: geschreven.sort(),
    },
    null,
    2
  ) + '\n'
);

/* ------------------------------------------------------------- weespagina's */
const wezen = motor.wezen({ negeer: ['', '404'] });

console.log(`gegenereerd      : ${geschreven.length} bestanden`);
console.log(`  regionaal      : ${geschreven.filter((f) => f.startsWith('regios/')).length}`);
console.log(`  nationaal nieuw: ${nat.aantal}`);
console.log(
  `  nieuws         : ${nieuws.artikelen} artikel(en) van ${nieuws.kandidaten} kandidaat/kandidaten` +
    `, hub ${nieuws.hub ? 'INDEX' : 'PENDING'}`
);
if (wezen.length) {
  console.log(`WEESPAGINA'S (${wezen.length}) — INDEX zonder inkomende link uit een gegenereerde pagina:`);
  for (const w of wezen) console.log(`  ${w}`);
  console.log('  Let op: links in bestaande, met de hand geschreven pagina\'s worden hier niet meegeteld.');
  console.log('  scripts/seo/audit.mjs meet de echte linkgraaf uit de HTML.');
}
