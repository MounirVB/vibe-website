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
import { Vingerafdrukken, PLAATSHOUDER as VINGER_PLAATSHOUDER } from './lib/vingerafdruk.mjs';
import {
  netbeheerderAlinea,
  terreinenAlinea,
  vestigingenAlinea,
  congestieAlinea,
  congestieKort,
  geenEigenProjectAlinea,
  bedrijfstakProfielBlok,
  profielAdvies,
  stuurTakken,
  TAK_NAAR_SECTOR,
  LQ_STERK,
  puntNa,
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
const takBron = lees('data', 'bewijs', 'bedrijfstakken.json');

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
  bedrijfstakken: {
    naam: `CBS, tabel ${'81575NED'} — vestigingen van bedrijven per bedrijfstak en gemeente`,
    url: 'https://opendata.cbs.nl/statline/#/CBS/nl/dataset/81575NED/table',
    datum: takBron.bron_datum,
  },
};

/* De wijzigingsdatum komt uit de INHOUD, niet uit de klok. Zie de uitleg in
   lib/vingerafdruk.mjs: elke pagina wordt gerenderd met een plaatshouder op
   de datumplek, die uitvoer wordt gehasht, en alleen een pagina met een
   veranderde hash krijgt de bouwdatum. */
const vingers = new Vingerafdrukken(
  resolve(wortel, 'data', 'seo', 'vingerafdrukken.json'),
  process.env.ROUTES_DATUM || reg._gegenereerd
);

const geschreven = [];
function schrijf(route, html) {
  const pad = resolve(wortel, bestand(route));
  mkdirSync(dirname(pad), { recursive: true });
  writeFileSync(pad, vingers.verwerk(route, html));
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
  const profiel = takBron.per_gemeente[code] || null;
  return {
    vestigingen: vestBron.per_gemeente[code] ?? null,
    terreinen: terrBron.per_gemeente[code] || [],
    netbeheerder: nbBron.per_gemeente[code] || null,
    projecten: projBron.per_gemeente[code] || [],
    /* De periode reist mee in het profiel, zodat de bronregel op de pagina
       het peiljaar kan noemen zonder dat regio-inhoud.mjs het bronbestand
       hoeft te kennen. */
    bedrijfstakken: profiel ? { ...profiel, _periode: takBron.periode } : null,
  };
}

/* Telt de bedrijfstakken van een lijst gemeenten op tot één profiel en
   berekent het locatiequotient tegen hetzelfde landelijke aandeel dat de
   gemeentepagina's gebruiken. Zo is 'twee keer landelijk' op een
   provinciepagina dezelfde maat als op een gemeentepagina. */
function provincieProfiel(lijstGemeenten) {
  const som = new Map();
  let totaalCbs = 0;
  for (const g of lijstGemeenten) {
    const pr = takBron.per_gemeente[g.gemeentecode];
    if (!pr) continue;
    totaalCbs += pr.totaal_cbs || 0;
    for (const t of pr.takken) som.set(t.sbi, (som.get(t.sbi) || 0) + t.vestigingen);
  }
  if (!som.size) return null;
  const totaalSecties = [...som.values()].reduce((a, b) => a + b, 0);
  const takken = [...som.entries()].map(([sbi, vestigingen]) => {
    const s = takBron.secties[sbi];
    const aandeel = vestigingen / totaalSecties;
    const landAandeel = takBron.landelijk_aandeel[sbi];
    const lq = landAandeel ? aandeel / landAandeel : null;
    return {
      sbi,
      letter: s.letter,
      naam: s.naam,
      vestigingen,
      aandeel_pct: Math.round(aandeel * 1000) / 10,
      lq: lq === null ? null : Math.round(lq * 100) / 100,
      /* Op provincieniveau is elk aantal groot genoeg; de drempel bestond
         alleen om CBS-afronding bij kleine gemeenten af te vangen. */
      lq_publiceerbaar: lq !== null && vestigingen >= takBron.min_vestigingen_voor_lq,
    };
  });
  takken.sort((a, b) => b.vestigingen - a.vestigingen);
  return { totaal_cbs: totaalCbs, totaal_secties: totaalSecties, takken, _periode: takBron.periode };
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
      gewijzigd: VINGER_PLAATSHOUDER,
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
  /* Release 3.1: een provinciehub kan nu ook bestaan zonder eigen project
     (zie de toelichting bij de provinciehubs in bouw-routes.mjs). Dan mag de
     pagina geen gerealiseerd werk suggereren. */
  const heeftWerk = projectLijst.length > 0;

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

  /* Het bedrijfstakprofiel van de provincie: opgeteld uit de gemeenten en
     daarna tegen het landelijke aandeel gezet. Dat is een echt provinciaal
     feit en geen herhaling van een gemeentepagina, want de samenstelling van
     een provincie is iets anders dan die van elk van haar gemeenten. */
  const provProfiel = provincieProfiel(alleGem);

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
      lead: heeftWerk
        ? `Wat Vibe Energy in ${esc(p.naam)} heeft gebouwd, bij welke netbeheerders u hier terechtkomt, en hoe groot ` +
          `de zakelijke energiemarkt in deze provincie is &mdash; met de bron bij elk cijfer.`
        : `${getal(alleGem.length)} gemeenten, ${getal(vestTotaal)} vestigingen en ${getal(terreinTotaal)} ` +
          `bedrijventerreinen. Bij welke netbeheerders u hier terechtkomt en waar de zakelijke energievraag in ` +
          `${esc(p.naam)} zit &mdash; met de bron bij elk cijfer.`,
      acties: [
        `<a class="ve-btn ve-btn--primair ve-btn--lg" href="${href('contact')}">Vraag een energiescan aan${ic('pijl')}</a>`,
        heeftWerk
          ? `<a class="ve-btn ve-btn--ghost ve-btn--lg" href="#bewijs">Bekijk het gerealiseerde werk</a>`
          : `<a class="ve-btn ve-btn--ghost ve-btn--lg" href="#gemeenten">Kies uw gemeente</a>`,
      ],
      naLead: heeftWerk ? null : bronregel([BRON.vestigingen, BRON.terreinen]),
    }),
    heeftWerk
      ? directAntwoord({
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
        })
      : directAntwoord({
          vraag: `Bij welke netbeheerder hoort een bedrijf in ${esc(p.naam)}?`,
          antwoord:
            (nbLijst.length === 1
              ? `In ${esc(p.naam)} is dat ${esc(nbLijst[0][0])} voor de hele provincie. `
              : `Dat verschilt per gemeente. ${esc(p.naam)} wordt bediend door ${nbLijst.length} netbeheerders: ` +
                `${nbLijst.map(([n, c]) => `${esc(n)} (${c} gemeenten)`).join(', ')}. `) +
            `De provincie telt ${getal(alleGem.length)} gemeenten met samen ${getal(vestTotaal)} ingeschreven ` +
            `vestigingen en ${getal(terreinTotaal)} bedrijventerreinen.`,
          voorbehoud:
            'De netbeheerderverdeling is per gemeente bepaald en per gemeente afgerond; een gemeente kan door meer ' +
            'dan één netbeheerder worden bediend. Controleer uw eigen adres voordat u een aanvraag doet.',
          bronnen: [BRON.netbeheer, BRON.vestigingen, BRON.terreinen],
        }),
    heeftWerk
      ? tekstsectie({
          id: 'bewijs',
          kop: `Gerealiseerd in ${esc(p.naam)}`,
          prose: projectenBlok(p.naam, projectLijst),
          variant: 've-sec--paper ve-sec--line-y',
        })
      : '',
    provProfiel
      ? tekstsectie({
          id: 'profiel',
          kop: `Welke bedrijvigheid zit er in ${esc(p.naam)}?`,
          lead: 'Opgeteld uit de gemeenten en afgezet tegen het landelijke beeld.',
          prose: bedrijfstakProfielBlok(p.naam, provProfiel, BRON.bedrijfstakken),
          variant: 've-sec--sunken ve-sec--line-y',
        })
      : '',
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
    `  <section class="ve-sec ve-sec--lg" id="gemeenten">
    <div class="ve-wrap">
      <div class="ve-head">
        <h2 class="ve-h2">Gemeenten in ${esc(p.naam)}</h2>
        <p class="ve-lead">De gemeenten met een eigen pagina zijn aanklikbaar. De overige staan hier omdat ze bij
        deze provincie horen, niet omdat er een pagina voor is &mdash; die komt er pas als er genoeg
        onderscheidend bewijs over die gemeente is.</p>
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
      titel: `Zakelijke energie in ${p.naam} | Vibe Energy`,
      beschrijving: heeftWerk
        ? `Gerealiseerde batterijopslag, zonnedaken en laadinfrastructuur in ${p.naam}, met de netbeheerders en ` +
          `de cijfers over bedrijventerreinen.`
        : `${p.naam}: ${getal(alleGem.length)} gemeenten, ${getal(terreinTotaal)} bedrijventerreinen en de ` +
          `netbeheerders per gemeente. Wat er binnen de bestaande aansluiting mogelijk is.`,
      ogTitel: `Zakelijke energie-infrastructuur in ${p.naam}`,
      dataPagina: 'regios',
      kruimels: [{ naam: "Regio's", route: REGIO_WORTEL }],
      kruimelLabel: p.naam,
      gewijzigd: VINGER_PLAATSHOUDER,
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
      gewijzigd: VINGER_PLAATSHOUDER,
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

  /* RELEASE 3.1 — twee framings, want de pagina mag niet beloven wat er niet is.
     Een gemeente met opgeleverd werk opent met dat werk. Een gemeente zonder
     opent met het bedrijvigheidsprofiel en zegt expliciet dat er nog niets
     staat. De oude tekst zei in dat geval '0 projecten opgeleverd' onder een
     kop die naar opgeleverd werk vroeg; dat is voor 327 van de 342 gemeenten
     de verkeerde pagina. */
  const heeftWerk = bw.projecten.length > 0;
  const takken = stuurTakken(bw.bedrijfstakken);
  const leidend = takken[0] || null;

  /* OVERCLAIM-CORRECTIE, gevonden door de eigen uitvoer te lezen.

     De lead zei "een bedrijvigheid die leunt op horeca" voor Aa en Hunze.
     Horeca is daar de sterkst OVERGEREPRESENTEERDE tak die wij bedienen
     (locatiequotient 1,27) maar met 150 van 3.430 vestigingen is het 4,4%
     van de gemeente. 'Leunt op' is dan onwaar.

     Twee maten die niet door elkaar mogen lopen:
     · het grootste segment  = meeste vestigingen
     · relatief sterk        = meer dan landelijk (locatiequotient)
     De lead mag alleen 'relatief veel' zeggen als het locatiequotient boven
     de sterkgrens ligt. Anders is het profiel gemengd, en dat is ook een
     uitspraak. */
  const leidendIsSterk = !!leidend && leidend.lq >= LQ_STERK;

  /* Zeven Nederlandse gemeenten dragen de naam van hun provincie. Gemeten op
     431 INDEX-routes faalde poort 12 daarop: 'Energie-infrastructuur voor
     bedrijven in Groningen' stond zowel op de provincie- als op de
     gemeentepagina, en hetzelfde voor Utrecht. Dat is echte kannibalisatie:
     twee van onze eigen pagina's concurreren op dezelfde titel.

     De oplossing is ook voor een bezoeker beter. Wie 'Groningen' zoekt kan
     de stad of de provincie bedoelen; 'de gemeente Groningen' zegt welke van
     de twee deze pagina is. De toevoeging staat er alleen bij een echte
     botsing, zodat de overige 335 gemeentepagina's hun korte titel houden. */
  const botstMetProvincie = g.naam === p.naam;
  const gemeenteInTekst = botstMetProvincie ? `de gemeente ${g.naam}` : g.naam;
  const gemeenteInTitel = botstMetProvincie ? `gemeente ${g.naam}` : g.naam;

  /* De sectorpagina's die bij het profiel van déze gemeente horen. Dit maakt
     de keten sector -> regio die de opdracht vraagt, en hij verschilt per
     gemeente omdat het profiel verschilt. */
  const profielSectoren = takken
    .slice(0, 2)
    .flatMap((t) => TAK_NAAR_SECTOR[t.sbi].sectoren)
    .filter((r, i, a) => a.indexOf(r) === i);
  const profielToepassingen = takken
    .slice(0, 2)
    .map((t) => TAK_NAAR_SECTOR[t.sbi].toepassing)
    .filter(Boolean)
    .filter((r, i, a) => a.indexOf(r) === i);

  const inhoud = [
    opening({
      kruimels: [
        { naam: "Regio's", route: REGIO_WORTEL },
        { naam: p.naam, route: routeProvincie(p.slug) },
      ],
      kruimelLabel: g.naam,
      h1: `Energie-infrastructuur voor bedrijven in ${esc(gemeenteInTekst)}`,
      lead: heeftWerk
        ? `Wat Vibe Energy in ${esc(g.naam)} heeft opgeleverd, wie hier de netbeheerder is en hoe de zakelijke ` +
          `energiemarkt in deze gemeente eruitziet &mdash; met de bron bij elk cijfer.`
        : `${getal(bw.vestigingen ?? 0)} vestigingen, ${getal(bw.terreinen.length)} bedrijventerrein` +
          `${bw.terreinen.length === 1 ? '' : 'en'}` +
          (leidendIsSterk
            ? ` en relatief veel ${esc(leidend.naam)}`
            : ' en een gemengd bedrijvenprofiel') +
          `. Wat dat betekent voor een aansluiting die knelt &mdash; met de bron bij elk cijfer.`,
      acties: [
        `<a class="ve-btn ve-btn--primair ve-btn--lg" href="${href('contact')}">Vraag een energiescan aan${ic('pijl')}</a>`,
        heeftWerk
          ? `<a class="ve-btn ve-btn--ghost ve-btn--lg" href="#bewijs">Bekijk het werk hier</a>`
          : `<a class="ve-btn ve-btn--ghost ve-btn--lg" href="#profiel">Bekijk de cijfers</a>`,
      ],
      /* De lead noemt cijfers, dus hoort er een bronregel onder — poort 10
         eist dat per SECTIE en de hero is een sectie. Dat die cijfers een
         alinea lager mét bron terugkomen is geen excuus: wie alleen de hero
         leest, moet daar al kunnen zien waar ze vandaan komen. */
      naLead: heeftWerk ? null : bronregel([BRON.vestigingen, BRON.terreinen]),
    }),
    heeftWerk
      ? directAntwoord({
          vraag: `Wat heeft Vibe Energy in ${esc(g.naam)} gedaan?`,
          antwoord:
            `Vibe Energy heeft in de gemeente ${esc(g.naam)} ${getal(bw.projecten.length)} ` +
            `${bw.projecten.length === 1 ? 'project' : 'projecten'} opgeleverd` +
            (sectoren.length ? ` in de sector${sectoren.length === 1 ? '' : 'en'} ${sectoren.map((s) => esc(s.toLowerCase())).join(', ')}` : '') +
            `. ` +
            (bw.netbeheerder?.zekerheid === 'EENDUIDIG'
              ? `De netbeheerder voor elektriciteit is hier ${esc(bw.netbeheerder.netbeheerder_naam)}${puntNa(bw.netbeheerder.netbeheerder_naam)} `
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
        })
      : directAntwoord({
          vraag: `Kan een bedrijf in ${esc(g.naam)} uitbreiden zonder een zwaardere aansluiting?`,
          antwoord:
            `Meestal wel. De aansluiting die er ligt is gedimensioneerd op een piek van een paar minuten per dag; ` +
            `met opslag en sturing komt daar ruimte onder vandaan zonder dat het gecontracteerde vermogen omhoog moet. ` +
            `De gemeente telt ${getal(bw.vestigingen ?? 0)} ingeschreven vestigingen en ` +
            `${getal(bw.terreinen.length)} bedrijventerrein${bw.terreinen.length === 1 ? '' : 'en'}. ` +
            (bw.netbeheerder?.zekerheid === 'EENDUIDIG'
              ? `De netbeheerder is hier ${esc(bw.netbeheerder.netbeheerder_naam)}${puntNa(bw.netbeheerder.netbeheerder_naam)}`
              : ''),
          voorbehoud:
            'Wat er op uw adres mogelijk is, hangt af van uw aansluitwaarde en uw kwartiersprofiel. Deze pagina geeft ' +
            'het gemeentelijke beeld, geen uitspraak over uw pand.',
          bronnen: [BRON.bedrijfstakken, bw.netbeheerder ? BRON.netbeheer : null].filter(Boolean),
        }),
    heeftWerk
      ? tekstsectie({
          id: 'bewijs',
          kop: `Opgeleverd in ${esc(g.naam)}`,
          prose: projectenBlok(g.naam, bw.projecten),
          variant: 've-sec--paper ve-sec--line-y',
        })
      : tekstsectie({
          id: 'bewijs',
          kop: `Werk van Vibe Energy in ${esc(g.naam)}`,
          prose: geenEigenProjectAlinea(g.naam, p.naam, routeProvincie(p.slug), href),
          variant: 've-sec--paper ve-sec--line-y',
        }),
    /* De bedrijfstakken: het blok dat deze pagina onderscheidt van haar
       zusterpagina's. Het staat vóór de algemene context, want het is het
       meest specifieke feit dat we over deze gemeente hebben. */
    tekstsectie({
      id: 'profiel',
      kop: `Welke bedrijvigheid zit er in ${esc(g.naam)}?`,
      lead: 'Uit de officiële bedrijfstakcijfers, afgezet tegen het landelijke beeld.',
      prose: bedrijfstakProfielBlok(g.naam, bw.bedrijfstakken, BRON.bedrijfstakken),
      variant: 've-sec--sunken ve-sec--line-y',
    }),
    takken.length
      ? tekstsectie({
          kop: `Waar knelt het hier het eerst?`,
          prose: profielAdvies(g.naam, bw.bedrijfstakken, BRON.bedrijfstakken, href, (r) => naamVan(r)),
        })
      : '',
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
      prose: congestieKort(g.naam, href),
      variant: 've-sec--paper ve-sec--line-y',
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
      /* Profielgestuurd: de sectoren en toepassingen die bij de bedrijvigheid
         van DEZE gemeente horen. Dit is de keten sector -> toepassing -> regio
         uit de opdracht, en de inhoud verschilt per gemeente omdat het
         bedrijfstakprofiel verschilt. */
      { kop: `Past bij de bedrijvigheid in ${g.naam}`, items: [
        ...profielSectoren.map((r) => ({ route: r, naam: naamVan(r) })),
        ...profielToepassingen.map((r) => ({ route: r, naam: naamVan(r) })),
      ] },
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
      /* TITEL EN BESCHRIJVING BINNEN DE WEERGAVEGRENZEN.

         Gemeten over de 337 gemeentepagina's met het oude sjabloon:
         110 titels boven 60 tekens (mediaan 59, langste 79) en 142
         beschrijvingen boven 160 (mediaan 159, langste 204). Google kapt
         daar af, en dan bepaalt Google wat er in het zoekresultaat staat in
         plaats van wij.

         'Zakelijke energie-infrastructuur in ' kostte alleen al 36 tekens
         voordat de gemeentenaam begon. Korter sjabloon, zelfde zoekwoorden:
         'zakelijke energie' plus de plaatsnaam is waar deze pagina op moet
         vinden, 'infrastructuur' voegde lengte toe en geen intentie. */
      titel: `Zakelijke energie in ${gemeenteInTitel} | Vibe Energy`,
      /* De beschrijving draagt de eigen cijfers van de gemeente, zodat 337
         pagina's niet dezelfde snippet aan Google aanbieden. */
      beschrijving: heeftWerk
        ? `Opgeleverde projecten van Vibe Energy in ${g.naam}, de netbeheerder hier en de officiële cijfers over ` +
          `bedrijventerreinen en bedrijvigheid.`
        : `${g.naam}: ${getal(bw.vestigingen ?? 0)} vestigingen, ${getal(bw.terreinen.length)} ` +
          `bedrijventerrein${bw.terreinen.length === 1 ? '' : 'en'}` +
          (leidendIsSterk ? `, relatief veel ${leidend.naam}` : ', gemengd profiel') +
          `. Wat er binnen de bestaande aansluiting mogelijk is.`,
      ogTitel: `Zakelijke energie-infrastructuur in ${gemeenteInTitel}`,
      dataPagina: 'regios',
      kruimels: [
        { naam: "Regio's", route: REGIO_WORTEL },
        { naam: p.naam, route: routeProvincie(p.slug) },
      ],
      kruimelLabel: g.naam,
      gewijzigd: VINGER_PLAATSHOUDER,
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
      gewijzigd: VINGER_PLAATSHOUDER,
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

vingers.schrijf();

/* ------------------------------------------------------------- weespagina's */
const wezen = motor.wezen({ negeer: ['', '404'] });

console.log(`gegenereerd      : ${geschreven.length} bestanden`);
console.log(
  `  wijzigingsdatum: ${vingers.telling.nieuw} nieuw · ${vingers.telling.gewijzigd} gewijzigd · ` +
    `${vingers.telling.ongewijzigd} ongewijzigd (datum behouden)`
);
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
