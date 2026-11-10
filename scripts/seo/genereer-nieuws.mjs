/* ============================================================================
   VIBE ENERGY — HET NIEUWSKANAAL (/nieuws)
   ----------------------------------------------------------------------------
   Release 1 reserveerde het padsegment en legde het contract vast in
   data/seo/nieuws-architectuur.json. Dit bestand vult het in.

   WAT HIER ANDERS IS DAN BIJ EEN NATIONALE PAGINA
   Een nieuwsartikel typt zijn navigatie niet uit. Het kruimelpad, de verwante
   links en de bronnenlijst worden AFGELEID uit de contractvelden
   (`onderwerp_eigenaar`, `oplossing_links`, `regio_links`, `bronnen`). Reden:
   die velden worden door het intelligenceplatform geschreven, en een
   machine die zijn eigen kruimelpad uittypt kan dat fout doen zonder dat
   iemand het merkt. Afleiden kan niet uit de pas lopen.

   WAT DE PAGINA TOONT (herzien in november 2026)
   De hub is een publieke nieuws- en kennisomgeving: een opening met de
   onderwerpenbalk, het uitgelichte bericht, de berichten per onderwerp, de
   kennisbank en het slotblok. Hij toont GEEN interne werking meer — geen
   redactioneel vrijgaveproces, geen publicatiestatus, geen claimcontrole.
   Die norm is naar intelligence/docs/REDACTIENORM.md verhuisd en wordt daar
   door poort 16 bewaakt; zie data/seo/nieuws-architectuur.json,
   _correctie_op_dit_contract_4. Op deze pagina staat alleen wat een bezoeker
   iets zegt.

   VIER DINGEN DIE HIER BEWUST NIET GEBEUREN

   0 · GEEN INTERNE TOESTAND IN DE ETALAGE. Zie hierboven. Een lezer hoort te
       zien wat er IS, niet hoe de machine erachter werkt of waarom er iets
       nog niet is.

   1 · GEEN CATEGORIEROUTES. De opdracht vraagt categorieën. Die zijn hier
       groepen OP de overzichtspagina, met een anker per onderwerp — niet
       /nieuws/categorie/<x> als eigen URL. Met nul tot enkele artikelen per
       onderwerp zou elke categoriepagina een dunne pagina zijn die de
       nationale pagina op dezelfde term beconcurreert. Het contract verbiedt
       dat laatste expliciet ("De bestaande commerciële pagina's laten
       kannibaliseren door een nieuwsartikel op dezelfde term"). Zodra een
       onderwerp genoeg artikelen heeft om een eigen pagina te verdienen, is
       dat een redactioneel besluit, geen automatisch gevolg van een teller.

   2 · GEEN AUTEURSNAAM. De site heeft geen redactieprofielen. De organisatie
       is auteur; een verzonnen journalist is een verzinsel.

   3 · GEEN SAMENVATTING VAN EEN ANDER ARTIKEL. Dat staat in het contract
       onder `wat_release_2_NIET_mag_doen` en wordt aan de schrijvende kant
       afgedwongen, niet hier. Deze generator maakt alleen op wat hij krijgt.

   Draaien: via scripts/seo/genereer.mjs
   ============================================================================ */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { url, href, routeGemeente, routeProvincie } from './lib/paden.mjs';
import {
  pagina,
  opening,
  directAntwoord,
  tekstsectie,
  faqSectie,
  verwant,
  conversie,
  esc,
  ic,
  mediaBlok,
  canvasband,
  artikelkop,
} from './lib/sjabloon.mjs';
import { beeldTag, beeldenVoor, themaVoorBasis } from './lib/beeld.mjs';
import { nieuwsartikel, faq as faqLd } from './lib/schema.mjs';
import { naamVan } from './lib/links.mjs';
import { normaliseerHrefs, sectieHtml, metRitme } from './genereer-nationaal.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');
const lees = (...p) => JSON.parse(readFileSync(resolve(wortel, ...p), 'utf8'));

export const NIEUWS_WORTEL = 'nieuws';

/* Labels voor de brontypen uit het contract. Zichtbaar op de pagina, zodat een
   lezer ziet of een feit van een wetgever of van een leverancier komt. */
const BRONSOORT_LABEL = {
  WETGEVING: 'wetgeving',
  TOEZICHTHOUDER: 'toezichthouder',
  NETBEHEERDER: 'netbeheerder',
  STATISTIEK: 'statistiek',
  MARKTPARTIJ: 'marktpartij',
  EIGEN_MEETDATA: 'eigen meetdata',
};

/* ===================================================== HET BEELDREGISTER ===
   De gegenereerde laag gebruikte tot nu toe nul fotografie. Deze pagina wel:
   een nieuws- en kennisomgeving zonder beeld leest als een linklijst.

   TWEE REGELS DIE HIER WORDEN AFGEDWONGEN, NIET BELOOFD
   1 · Alleen bestanden die werkelijk op schijf staan. beeldHtml() toetst elke
       breedte met existsSync; een breedte die ontbreekt valt uit de srcset en
       een sleutel waarvan niets bestaat levert een kaart ZONDER beeld op. Een
       gebroken <img> kan deze pagina dus niet produceren.
   2 · De alt-tekst beschrijft wat er werkelijk op de foto staat, niet wat de
       pagina erachter verkoopt. Alle zes zijn bekeken voordat ze hier kwamen.

   De beeldverhouding staat NIET op het bestand maar op het vlak eromheen
   (.ve-proj__vlak = 16/10, .ve-media--16x9), zodat de kaarten in een raster
   dezelfde hoogte houden en er geen layout shift is terwijl het beeld laadt. */
/* Dit bestand hield een EIGEN beeldregister bij, met eigen alt-teksten. Die
   liepen uiteen met scripts/seo/lib/beeld.mjs: netcongestie-hero stond hier
   als "drie witte batterijcontainers" en daar als "twee batterijkasten achter
   een hekwerk", en geen van beide beschreef het beeld volledig juist. Twee
   registers voor dezelfde dertig bestanden is per definitie een bron van zulke
   verschillen. Het register staat nu op een plek; hier alleen de opzoeking. */
const BEELDSLEUTEL = (naam) => `assets/${naam}`;

const BEELDMAP = resolve(wortel, 'assets');

/* De kaarten staan op desktop in drie kolommen binnen een container van
   1280px; 400px is daar de echte weergavebreedte. Daaronder twee kolommen en
   op mobiel vol. */
const KAART_SIZES = '(min-width:1200px) 400px, (min-width:768px) 33vw, (min-width:640px) 50vw, 100vw';
const ARTIKEL_SIZES = '(min-width:1200px) 1216px, 100vw';
const UITGELICHT_SIZES = '(min-width:1200px) 720px, (min-width:640px) 60vw, 100vw';

function beeldHtml(sleutel, sizes, { eager = false } = {}) {
  const basis = BEELDSLEUTEL(sleutel);
  const t = themaVoorBasis(basis);
  if (!t) return '';
  try {
    return beeldTag({ basis: t.basis, alt: t.alt, sizes, lazy: !eager, fetchpriority: eager ? 'high' : null });
  } catch (e) {
    /* geen bestand op schijf — dan geen beeldvlak, geen gebroken <img> */
    return '';
  }
}

/* ================================================== DE PAGINABOUWSTENEN ===
   Alles hieronder is gebouwd uit klassen die al in vibe/vibe.css staan:
   .ve-proj is de kaart met beeld van /projecten, .ve-media de beeldvlakken,
   .ve-split het asymmetrische raster, .ve-rail de redactionele lijst. Nieuw
   is alleen de onderwerpenbalk (.nw-chip), en die staat als paginalokale CSS
   in dit bestand — net zoals /projecten zijn filterbalk lokaal houdt. Zo kan
   deze pagina geen enkele andere pagina van vorm veranderen. */
const PAGINA_CSS = `  /* Onderwerpenbalk — paginaspecifiek, dezelfde vorm als de filterbalk op /projecten. */
  .nw-chips{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:var(--ve-s-xl)}
  .nw-chip{
    padding:.55rem 1.1rem;border-radius:var(--ve-r-pill);
    border:1px solid var(--ve-line-strong);background:var(--ve-surface);
    font-size:var(--ve-body-sm-size);font-weight:var(--ve-w-med);color:var(--ve-text-soft);
    transition:border-color var(--ve-dur) var(--ve-ease),color var(--ve-dur) var(--ve-ease);
  }
  .nw-chip:hover{border-color:var(--ve-action);color:var(--ve-action-ink)}
  /* Kaartraster: één kolom, vanaf 640 twee, vanaf 1024 drie — dezelfde trap als
     .pr-raster op /projecten. ve-cols--3 springt al op 768 naar drie kolommen,
     en dan is een kolom op een tablet ~230px breed: gemeten op 834px brak
     "Laadinfrastructuur" daar middenin het woord af. */
  .nw-raster{display:grid;gap:var(--ve-s-xl)}
  @media (min-width:640px){.nw-raster{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media (min-width:1024px){.nw-raster{grid-template-columns:repeat(3,minmax(0,1fr))}}
  /* Een beeldvlak dat zelf de link is; .ve-media zet geen display en zou als
     <a> inline vallen, waardoor de beeldverhouding niet pakt. */
  a.ve-media{display:block}
  a.ve-media img{transition:transform var(--ve-dur-slow) var(--ve-ease)}
  a.ve-media:hover img{transform:scale(1.04)}
  /* Dezelfde vier bewegingen als .ve-proj, geen vijfde: de titel kleurt naar
     het accent en het beeld schaalt. Niets anders beweegt. */
  .nw-uit__t{margin:0}
  .nw-uit__t a:hover{color:var(--ve-action-ink)}
  a.ve-rail{display:block}
  a.ve-rail:hover h3{color:var(--ve-action-ink)}`;

/** Een kaart met beeld, in de vorm die /projecten al gebruikt.
    `beeld` is een sleutel uit BEELDEN; `beeldHtml` is kant-en-klare markup —
    die weg gebruikt een nieuwsbericht, dat zijn eigen beeld meebrengt.
    Geen van beide? Dan dezelfde kaart, zonder beeldvlak. */
function beeldkaart({ route, label, kop, tekst, voet, beeld, beeldHtml: vooraf, id, vlakAltijd = false }) {
  const vlak = vooraf !== undefined ? vooraf : beeld ? beeldHtml(beeld, KAART_SIZES) : '';
  return (
    `        <a class="ve-proj" href="${href(route)}"${id ? ` id="${id}"` : ''}>\n` +
    (vlak || vlakAltijd ? `          <div class="ve-proj__vlak">${vlak}</div>\n` : '') +
    '          <div class="ve-proj__tekst">\n' +
    (label ? `            <span class="ve-proj__sector">${esc(label)}</span>\n` : '') +
    `            <h3 class="ve-proj__t">${esc(kop)}</h3>\n` +
    `            <p class="ve-proj__d">${tekst}</p>\n` +
    `            <span class="ve-proj__voet">${voet}</span>\n` +
    '          </div>\n' +
    '        </a>'
  );
}

/** Een raster van kaarten onder een kop. */
function kaartsectie({ id, kop, lead, cellen, variant = '' }) {
  return `  <section class="ve-sec ve-sec--lg${variant ? ` ${variant}` : ''}"${id ? ` id="${id}"` : ''}>
    <div class="ve-wrap">
      <div class="ve-head">
        <h2 class="ve-h2">${kop}</h2>${lead ? `\n        <p class="ve-lead">${lead}</p>` : ''}
      </div>
      <div class="nw-raster">
${cellen.join('\n')}
      </div>
    </div>
  </section>`;
}

/** De onderwerpenbalk onder de lead. Alleen zinvol vanaf twee onderwerpen. */
function onderwerpenbalk(items) {
  if (!items || items.length < 2) return '';
  return (
    '<nav class="nw-chips" aria-label="Onderwerpen">\n' +
    items.map((i) => `        <a class="nw-chip" href="${i.href}">${esc(i.label)}</a>`).join('\n') +
    '\n      </nav>'
  );
}

/** Alle artikelbestanden onder data/inhoud/nieuws/, op route gesorteerd. */
function artikelbestanden() {
  const map = resolve(wortel, 'data', 'inhoud', NIEUWS_WORTEL);
  if (!existsSync(map)) return [];
  return readdirSync(map)
    .filter((b) => b.endsWith('.json'))
    .map((b) => {
      const pad = join(map, b);
      return { pad, bestandsnaam: b, j: JSON.parse(readFileSync(pad, 'utf8')) };
    })
    .sort((a, b) => String(a.j.route).localeCompare(String(b.j.route)));
}

/* Geo is nodig om een regio_link (een gemeente- of provinciecode) om te zetten
   naar de route die erbij hoort. Een code zonder gepubliceerde pagina levert
   geen link op; de linkmotor filtert dat er daarna nog eens uit. */
function geoIndex() {
  const provincies = lees('data', 'geo', 'provincies.json').provincies;
  const gemeenten = lees('data', 'geo', 'gemeenten.json').gemeenten;
  const op = new Map();
  for (const p of provincies) op.set(p.provinciecode, { naam: p.naam, route: routeProvincie(p.slug) });
  for (const g of gemeenten) {
    op.set(g.gemeentecode, { naam: g.naam, route: routeGemeente(g.provincie_slug, g.slug) });
  }
  return op;
}

/** De datumregel. Zichtbaar, want een nieuwsfeit zonder datum veroudert blind. */
function datumregel(j) {
  const delen = [`<time datetime="${esc(j.gepubliceerd)}">Gepubliceerd op ${esc(j.gepubliceerd)}</time>`];
  if (j.gewijzigd && j.gewijzigd !== j.gepubliceerd) {
    delen.push(`<time datetime="${esc(j.gewijzigd)}">bijgewerkt op ${esc(j.gewijzigd)}</time>`);
  }
  return `<p class="ve-small" data-nieuws-datum>${delen.join(' &middot; ')}</p>`;
}

/**
 * De zichtbare bronnenlijst. Verplicht op elk artikel: het contract eist een
 * zichtbare peildatum per bron, en poort 16 faalt als die ontbreekt.
 */
function bronnenSectie(bronnen) {
  const rijen = bronnen
    .map((b) => {
      const soort = BRONSOORT_LABEL[String(b.soort || '').toUpperCase()] || 'bron';
      return (
        `          <li><a class="ve-link" href="${esc(b.url)}" rel="nofollow noopener" target="_blank">${esc(b.naam)}</a>` +
        ` <span class="ve-small">(${esc(soort)}, geraadpleegd op ${esc(b.datum)})</span></li>`
      );
    })
    .join('\n');
  return tekstsectie({
    id: 'bronnen',
    kop: 'Bronnen',
    lead: 'Elk feit in dit bericht is terug te voeren op een van deze bronnen, met de datum waarop die is geraadpleegd.',
    prose: `        <ul>\n${rijen}\n        </ul>`,
    variant: 've-sec--paper ve-sec--line-y',
  });
}

/* ========================================================== artikelpagina */
function bouwArtikel({ j, route, motor, schrijf, geo }) {
  const paginaUrl = url(route);
  const eigenaar = String(j.onderwerp_eigenaar || '').replace(/^\/+/, '');
  const eigenaarNaam = naamVan(eigenaar, j.onderwerp_eigenaar_naam || eigenaar);
  const bronnen = Array.isArray(j.bronnen) ? j.bronnen : [];

  const kruimels = [{ naam: 'Nieuws', route: NIEUWS_WORTEL }];

  /* Verwante links, in de keten die de opdracht vraagt: van het bericht naar
     het onderwerp dat het bezit, dan naar de oplossing, dan naar de regio. */
  const groepen = [
    { kop: 'Het onderwerp', items: [{ route: eigenaar, naam: eigenaarNaam }] },
    {
      kop: 'Oplossingen',
      items: (j.oplossing_links || []).map((r) => {
        const k = String(r).replace(/^\/+/, '');
        return { route: k, naam: naamVan(k) };
      }),
    },
    {
      kop: 'Kennis',
      items: (j.kennis_links || []).map((r) => {
        const k = String(r).replace(/^\/+/, '');
        return { route: k, naam: naamVan(k) };
      }),
    },
    {
      kop: "Regio's",
      items: (j.regio_links || [])
        .map((code) => geo.get(code))
        .filter(Boolean)
        .map((g) => ({ route: g.route, naam: g.naam })),
    },
  ]
    .map((g) => ({ kop: g.kop, items: motor.filter(g.items) }))
    .filter((g) => g.items.length);

  for (const g of groepen) motor.tel(route, g.items);

  /* HET ARTIKELBEELD.
     Een nieuwsbericht droeg GEEN beeld: gemeten op de QA-fixture waren het
     nul <img> in <main>, op een pagina van 4.533px. Het beeld volgt het
     ONDERWERP van het bericht (onderwerp_eigenaar is een echte route, zoals
     netcongestie), niet de kop. Zo toont een bericht over netcongestie de
     batterijkasten die bij dat onderwerp horen, en nooit een foto die alleen
     bij de titel lijkt te passen.
     Draagt het bericht zelf een beeld mee (kaartbeeld of og_beeld), dan wint
     dat: de redactie weet beter wat erbij hoort dan het register. */
  const eigenBeeld = artikelBeeld(j, ARTIKEL_SIZES, { eager: true });
  const beelden = beeldenVoor(eigenaar || 'nieuws', 'nieuws', 5);
  const heroImg = beeldTag({
    basis: beelden[0].basis,
    alt: beelden[0].alt,
    sizes: ARTIKEL_SIZES,
    lazy: false,
    fetchpriority: 'high',
  });
  const heroAlt = eigenBeeld ? '' : beelden[0].alt;

  /* De artikelkop in plaats van de gewone opening: kruimelpad, H1, lead, een
     ZICHTBARE feitenregel en daaronder het openingsbeeld met bijschrift.
     De publicatiedatum stond eerst als een grijze regel van 13px onder de
     lead. Alle drie de feiten staan al op de pagina — de datum in de
     <time>-regel, het onderwerp in 'Verder lezen', het bronaantal in de
     bronnensectie — dus er komt geen bewering bij. */
  const delen = [
    artikelkop({
      kruimels,
      kruimelLabel: j.kruimel_label || j.og_titel || j.h1,
      h1: j.h1,
      lead: normaliseerHrefs(j.lead, motor),
      feiten: [
        { label: 'Gepubliceerd', waarde: datumNl(j.gepubliceerd) },
        j.gewijzigd && j.gewijzigd !== j.gepubliceerd ? { label: 'Bijgewerkt', waarde: datumNl(j.gewijzigd) } : null,
        eigenaar ? { label: 'Onderwerp', waarde: esc(eigenaarNaam), accent: true } : null,
        bronnen.length ? { label: bronnen.length === 1 ? 'Bron' : 'Bronnen', waarde: String(bronnen.length) } : null,
      ].filter(Boolean),
      img: eigenBeeld || heroImg,
      bijschrift: heroAlt,
      breedte: '56rem',
    }),
    j.direct_antwoord
      ? directAntwoord({
          vraag: j.direct_antwoord.vraag,
          antwoord: normaliseerHrefs(j.direct_antwoord.antwoord, motor),
          voorbehoud: j.direct_antwoord.voorbehoud
            ? normaliseerHrefs(j.direct_antwoord.voorbehoud, motor)
            : null,
          bronnen: bronnen.slice(0, 2),
        })
      : '',
    /* Dezelfde ritme-pass als de nationale pagina's, niet een tweede versie
       ervan: elke derde tekstsectie wordt een beeldband en er komt een
       canvasband na de middelste sectie. De canvasband draagt og_titel en
       beschrijving uit het artikelbestand — die stonden alleen in de <head>. */
    ...metRitme({
      secties: j.secties || [],
      motor,
      banden: [beelden[1], beelden[3], beelden[4]].filter(Boolean),
      canvas: canvasband({
        img: beeldTag({
          basis: beelden[2].basis,
          alt: beelden[2].alt,
          sizes: ARTIKEL_SIZES,
        }),
        kop: j.og_titel || j.h1,
        tekst: esc(j.beschrijving || ''),
      }),
    }),
    bronnenSectie(bronnen),
    j.faq && j.faq.length
      ? faqSectie({
          kop: j.faq_kop || 'Veelgestelde vragen',
          vragen: j.faq.map((v) => ({ vraag: v.vraag, antwoord: normaliseerHrefs(v.antwoord, motor) })),
        })
      : '',
    verwant(groepen),
    conversie({
      kop: j.conversie?.kop || 'Wat betekent dit voor uw locatie?',
      tekst:
        j.conversie?.tekst ||
        'Een marktontwikkeling zegt nog niets over uw aansluiting, uw profiel of uw contract. Leg uw situatie naast dit bericht in een adviesgesprek.',
      primair:
        j.conversie?.primair && motor.isIndex(String(j.conversie.primair.route).replace(/^\/+/, ''))
          ? j.conversie.primair
          : { route: 'contact', label: 'Plan een adviesgesprek' },
      secundair: motor.isIndex(eigenaar) ? { route: eigenaar, label: `Over ${eigenaarNaam}` } : null,
    }),
  ].filter(Boolean);

  const extra = [
    nieuwsartikel(paginaUrl, {
      titel: j.og_titel || j.h1,
      beschrijving: j.beschrijving,
      gepubliceerd: j.gepubliceerd,
      gewijzigd: j.gewijzigd || j.gepubliceerd,
      bronnen,
      eigenaarUrl: motor.isIndex(eigenaar) ? url(eigenaar) : null,
    }),
  ];
  if (j.faq && j.faq.length) extra.push(faqLd(paginaUrl, j.faq));

  schrijf(
    route,
    pagina({
      route,
      titel: j.titel,
      beschrijving: j.beschrijving,
      ogTitel: j.og_titel || j.h1,
      ogBeschrijving: j.og_beschrijving || j.beschrijving,
      ogBeeld: j.og_beeld || null,
      dataPagina: j.data_pagina || 'nieuws',
      kruimels,
      kruimelLabel: j.kruimel_label || j.og_titel || j.h1,
      gewijzigd: j.gewijzigd || j.gepubliceerd,
      extraKnopen: extra,
      inhoud: delen.join('\n\n'),
    })
  );
}

/* ======================================================= DE ONDERWERPEN ===
   De publieke categorie-indeling van het kanaal: zes onderwerpen die Vibe
   Energy volgt, elk gekoppeld aan de pagina die dat onderwerp nu al behandelt.

   DRIE REGELS
   1 · Elke route wordt gefilterd op INDEX (motor.isIndex). Een onderwerp
       waarvan de pagina niet gepubliceerd is, verdwijnt hier vanzelf; een
       dode link kan deze indeling dus niet opleveren.
   2 · De kaarttekst beschrijft wat op de doelpagina staat, niet wat we zouden
       willen dat er staat. De teksten zijn op de H1 van die pagina's geijkt.
   3 · Elk onderwerp is een enkelsegmentroute. Dat is geen toeval: de poort
       telt een uitgang met /href="\/([a-z0-9-]+)"/ en een diepe link
       (/kennis/peak-shaving) telt daar NIET in mee. */
const ONDERWERPEN = [
  {
    route: 'netcongestie',
    label: 'Netcongestie',
    kop: 'Netcongestie',
    tekst: 'Het net zit vol. Wat dat betekent voor uw aansluiting, en wat er binnen uw eigen grens nog kan.',
    beeld: 'netcongestie-hero',
  },
  {
    route: 'systeem-energieopslag',
    label: 'Batterijopslag',
    kop: 'Batterijopslag',
    tekst: 'Capaciteit vrijspelen op de aansluiting die u al heeft, in plaats van wachten op verzwaring.',
    beeld: 'capaciteit-hero',
  },
  {
    route: 'systeem-laadpalen',
    label: 'Laadinfrastructuur',
    kop: 'Laadinfrastructuur',
    tekst: 'Meer laadpunten op het vermogen dat er al ligt, zonder dat de piek erdoorheen schiet.',
    beeld: 'laadpalen-hero',
  },
  {
    route: 'systeem-zonnepanelen',
    label: 'Opwek',
    kop: 'Zonne-energie',
    tekst: 'Een dak levert pas rendement als de opwek ook benut wordt. Wat opslag en sturing daaraan veranderen.',
    beeld: 'zonnepanelen-hero',
  },
  {
    route: 'verduurzaming-bedrijfspanden',
    label: 'Verduurzaming',
    kop: 'Verduurzaming en energielabel',
    tekst: 'Het energielabel is een berekening, de meter is de werkelijkheid. Wat telt voor uw label en uw exploitatie.',
    beeld: 'kantoor-hero',
  },
  {
    route: 'subsidies',
    label: 'Subsidies',
    kop: 'Subsidies en regelingen',
    tekst: 'Welke regelingen er zijn, wat ze wel en niet dekken, en wat een batterij subsidiabel maakt.',
    beeld: 'bedrijf-hero',
  },
];

/* Zes kennisartikelen die er werkelijk staan, met de korte naam die /kennis
   zelf voor ze gebruikt. Deze routes staan NIET in NAAM van lib/links.mjs,
   dus de naam wordt hier expliciet meegegeven — naamVan() zou anders letterlijk
   'kennis/peak-shaving' als kop zetten. */
const KENNIS_UITGELICHT = [
  ['kennis/netcongestie-uitgelegd', 'Netcongestie uitgelegd', 'Waar in het net de grens werkelijk zit.'],
  ['kennis/businesscase-batterij', 'De businesscase van een batterij', 'Wat het rendement van een batterij werkelijk bepaalt.'],
  ['kennis/peak-shaving', 'Peak shaving', 'De piek afvlakken in plaats van hem inkopen.'],
  [
    'kennis/laadinfrastructuur-dimensioneren',
    'Laadinfrastructuur dimensioneren',
    'Drie vragen bepalen het ontwerp van uw laadplein.',
  ],
  ['kennis/subsidiemechanismen', 'Hoe subsidiemechanismen werken', 'Hoe een regeling werkt, en wanneer hij geld oplevert.'],
  ['kennis/terugleverbeperking', 'Terugleverbeperking', 'Wat u werkelijk kwijtraakt als het net dichtzit.'],
];

/** De zes onderwerpen, gefilterd op wat werkelijk gepubliceerd is. */
function gepubliceerdeOnderwerpen(motor) {
  return ONDERWERPEN.filter((o) => motor.isIndex(o.route));
}

/* ===================================================== de lege staat =====
   Wat een bezoeker ziet zolang er geen bericht is vrijgegeven.

   VIER DINGEN DIE HIER BEWUST NIET STAAN
   1 · Geen voorbeeldbericht, geen placeholder-kaart, geen grijze skeletrij.
       Een lezer mag geen bericht zien dat niet bestaat.
   2 · Geen verzonnen verschijningsdatum. 'Binnenkort' is het enige wat we
       eerlijk kunnen zeggen; een datum zou een belofte zijn die we niet kennen.
   3 · Geen cijfer. Poort 10 laat de hub ongemoeid (die filtert op subsoort
       'nieuws', niet 'nieuws-hub'), maar een cijfer zonder zichtbare bron
       hoort op geen enkele pagina van deze site.
   4 · GEEN REDACTIONEEL PROCES. De vier voorwaarden waaronder een bericht
       verschijnt, de vrijgave door een mens en de claimcontrole stonden hier
       tot november 2026 als zichtbare tekst. Dat is interne werking en hoort
       op een publieke nieuwspagina niet thuis; de norm staat nu in
       intelligence/docs/REDACTIENORM.md en wordt daar door poort 16 bewaakt.
       Zie data/seo/nieuws-architectuur.json, _correctie_op_dit_contract_4.

   Wat er WEL staat: waar dit kanaal over gaat, en de inhoud die er nu al is.
   Zo is de pagina ook zonder bericht een echte ingang en geen doodlopend eind. */
function legeStaat(motor, route) {
  const uit = [];
  const onderwerpen = gepubliceerdeOnderwerpen(motor);

  if (onderwerpen.length) {
    uit.push(
      kaartsectie({
        id: 'onderwerpen',
        kop: 'Waar we over schrijven',
        lead:
          'Binnenkort vindt u hier het laatste nieuws en praktische inzichten over de energiemarkt. ' +
          'Tot die tijd vindt u per onderwerp de achtergrond die er nu al is.',
        cellen: onderwerpen.map((o) =>
          beeldkaart({
            route: o.route,
            label: o.label,
            kop: o.kop,
            tekst: esc(o.tekst),
            voet: 'Lees de achtergrond &rarr;',
            beeld: o.beeld,
          })
        ),
      })
    );
    motor.tel(route, motor.filter(onderwerpen.map((o) => ({ route: o.route, naam: o.kop }))));
  }

  return uit;
}

/* De kennisbanksectie staat op de hub in BEIDE toestanden: zonder bericht is
   het de inhoud die er al wel is, met berichten de achtergrond eronder. */
function kennisSectie(motor, route) {
  const kennis = KENNIS_UITGELICHT.filter(([r]) => motor.isIndex(r));
  if (!kennis.length) return '';
  motor.tel(route, motor.filter(kennis.map(([r, naam]) => ({ route: r, naam }))));
  motor.tel(route, motor.filter([{ route: 'kennis', naam: 'Kennisbank' }]));
  return `  <section class="ve-sec ve-sec--lg ve-sec--paper ve-sec--line-y" id="kennisbank">
    <div class="ve-wrap">
      <div class="ve-head">
        <h2 class="ve-h2">Uit de kennisbank</h2>
        <p class="ve-lead">De begrippen en rekenregels achter het nieuws, los van de dag van vandaag.</p>
      </div>
      <div class="ve-cols ve-cols--2 ve-cols--gap-xl">
${kennis
  .map(
    ([r, naam, tekst]) => `        <a class="ve-rail" href="${href(r)}">
          <h3 class="ve-h4">${esc(naam)}</h3>
          <p class="ve-body">${esc(tekst)}</p>
        </a>`
  )
  .join('\n')}
      </div>
      <div class="ve-row" style="margin-top:var(--ve-s-xl)">
        <a class="ve-btn ve-btn--ghost" href="${href('kennis')}">Naar de kennisbank${ic('pijl')}</a>
      </div>
    </div>
  </section>`;
}

/* ------------------------------------------------------------ de berichten */
const MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

/** 2026-10-10 -> '10 oktober 2026'. Onbekende vorm gaat ongewijzigd door. */
function datumNl(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  const maand = m ? MAANDEN[Number(m[2]) - 1] : null;
  if (!m || !maand) return esc(String(iso || ''));
  return `${Number(m[3])} ${maand} ${m[1]}`;
}

/**
 * Het beeld bij een bericht. Een artikel mag er een dragen, maar hoeft niet:
 * `kaartbeeld` wijst naar een set uit BEELDEN, `og_beeld` mag een los bestand
 * onder /assets zijn. Bestaat het bestand niet, dan krijgt de kaart geen beeld.
 * Er wordt nooit een plaatje van een ander onderwerp bijgezocht.
 */
function artikelBeeld(j, sizes, opties) {
  if (j.kaartbeeld && BEELDEN[j.kaartbeeld]) return beeldHtml(j.kaartbeeld, sizes, opties);
  const los = String(j.og_beeld || '');
  const m = /^\/assets\/([a-z0-9._-]+\.(?:webp|jpg|png))$/i.exec(los);
  if (!m || !existsSync(join(BEELDMAP, m[1]))) return '';
  const alt = esc(j.beeld_alt || j.og_titel || j.h1 || '');
  return `<img src="${los}" sizes="${sizes}" alt="${alt}" loading="lazy" decoding="async">`;
}

/** Een bericht als kaart in het raster.
    `vlakAltijd` houdt de kaarthoogtes gelijk zodra ÉÉN bericht in het raster
    een beeld draagt: een kaart zonder beeld krijgt dan het lege beeldvlak dat
    /projecten ook gebruikt. Draagt geen enkel bericht een beeld, dan staat er
    ook geen leeg vlak en is het gewoon een tekstraster. */
function artikelkaart(a, categorie, id, vlakAltijd) {
  return beeldkaart({
    route: a.route,
    label: categorie,
    kop: a.j.og_titel || a.j.h1,
    tekst: esc(a.j.beschrijving),
    voet: `<time datetime="${esc(a.j.gepubliceerd)}">${datumNl(a.j.gepubliceerd)}</time> &middot; lees het bericht &rarr;`,
    beeldHtml: artikelBeeld(a.j, KAART_SIZES),
    id,
    vlakAltijd,
  });
}

/** Het uitgelichte bericht: het nieuwste, groot, boven het raster. */
function uitgelichtBericht(a, categorie) {
  const beeld = artikelBeeld(a.j, UITGELICHT_SIZES, { eager: true });
  return `  <section class="ve-sec ve-sec--lg ve-sec--paper ve-sec--line-y" id="uitgelicht">
    <div class="ve-wrap">
      <div class="ve-head">
        <h2 class="ve-h2">Uitgelicht</h2>
      </div>
      <div class="ve-split ve-split--7-5 ve-split--top">
${
  beeld
    ? `        <a class="ve-media ve-media--16x9 ve-media--lijn" href="${href(a.route)}" tabindex="-1" aria-hidden="true">${beeld}</a>\n`
    : ''
}        <div>
          <h3 class="ve-h2 nw-uit__t"><a href="${href(a.route)}">${esc(a.j.og_titel || a.j.h1)}</a></h3>
          <p class="ve-lead" style="margin-top:var(--ve-s-md)">${esc(a.j.beschrijving)}</p>
          <p class="ve-small" style="margin-top:var(--ve-s-md)">${esc(categorie)} &middot; <time datetime="${esc(
    a.j.gepubliceerd
  )}">${datumNl(a.j.gepubliceerd)}</time></p>
          <div class="ve-row" style="margin-top:var(--ve-s-lg)">
            <a class="ve-btn ve-btn--ghost" href="${href(a.route)}">Lees het bericht${ic('pijl')}</a>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

/* ============================================================== de hub */
function bouwHub({ gepubliceerd, motor, schrijf }) {
  const route = NIEUWS_WORTEL;

  /* Groeperen op onderwerp-eigenaar. Dat IS de categorie: het onderwerp dat
     de commerciële intentie bezit. Nieuwste eerst binnen een groep. */
  const perOnderwerp = new Map();
  for (const a of gepubliceerd) {
    const eigenaar = String(a.j.onderwerp_eigenaar || '').replace(/^\/+/, '');
    if (!perOnderwerp.has(eigenaar)) perOnderwerp.set(eigenaar, []);
    perOnderwerp.get(eigenaar).push(a);
  }
  for (const lijst of perOnderwerp.values()) {
    lijst.sort((x, y) => String(y.j.gepubliceerd).localeCompare(String(x.j.gepubliceerd)));
  }

  /* Groepen op aflopende recentheid van hun nieuwste bericht, zodat wat leeft
     bovenaan staat en de orde deterministisch blijft. */
  const groepen = [...perOnderwerp.entries()].sort((a, b) => {
    const da = String(a[1][0].j.gepubliceerd);
    const db = String(b[1][0].j.gepubliceerd);
    return db.localeCompare(da) || a[0].localeCompare(b[0]);
  });

  const alles = gepubliceerd
    .slice()
    .sort((x, y) => String(y.j.gepubliceerd).localeCompare(String(x.j.gepubliceerd)));
  const nieuwste = alles[0];

  const indexItems = motor.filter(alles.map((a) => ({ route: a.route, naam: a.j.og_titel || a.j.h1 })));
  motor.tel(route, indexItems);

  /* De lege staat. Het kanaal staat open voordat er een bericht is; zie
     data/seo/nieuws-architectuur.json, _correctie_op_dit_contract_3 (de
     vrijgave) en _4 (de verhuizing van de redactienorm naar binnen). De pagina
     draagt dan geen lijst maar de onderwerpen die het kanaal bestrijkt, elk
     gelinkt aan de pagina die er nu al over gaat. Nergens staat een verzonnen
     bericht, een beloofde datum of een cijfer zonder bron. */
  const leeg = !gepubliceerd.length;

  /* De onderwerpenbalk onder de lead. Met berichten springt hij naar de groep
     op deze pagina; zonder berichten gaat hij naar de pagina die het onderwerp
     behandelt. In beide gevallen een werkende link, geen decor. */
  const balk = leeg
    ? gepubliceerdeOnderwerpen(motor).map((o) => ({ href: href(o.route), label: o.label }))
    : groepen.map(([eigenaar, lijst]) => ({
        href: `#onderwerp-${eigenaar.replace(/\//g, '-')}`,
        label: `${naamVan(eigenaar, eigenaar)} (${lijst.length})`,
      }));

  const secties = [
    opening({
      kruimels: [],
      kruimelLabel: 'Nieuws',
      h1: 'Nieuws & inzichten',
      lead:
        'Blijf op de hoogte van ontwikkelingen in energie, netcongestie, batterijopslag, ' +
        'laadinfrastructuur en verduurzaming.',
      naLead: onderwerpenbalk(balk),
    }),
  ];

  if (leeg) secties.push(...legeStaat(motor, route));

  /* Het uitgelichte bericht. Pas vanaf twee berichten: met één bericht zou de
     pagina datzelfde bericht twee keer tonen. */
  if (!leeg && alles.length > 1) {
    const eigenaar = String(nieuwste.j.onderwerp_eigenaar || '').replace(/^\/+/, '');
    secties.push(uitgelichtBericht(nieuwste, naamVan(eigenaar, eigenaar)));
  }

  /* DE BERICHTEN IN ÉÉN RASTER, nieuwste eerst.

     WAAROM NIET EEN SECTIE PER CATEGORIE. Dat was de eerste vorm en hij is
     gemeten: met één bericht per onderwerp levert hij drie koppen met elk één
     kaart in een driekolomsraster op — twee lege kolommen per sectie. Precies
     de lege vlakken die deze herontwerp moest wegnemen. Eén raster blijft bij
     elk aantal berichten dicht, en de categorie staat op de kaart zelf als
     label. De categorie-ankers uit de onderwerpenbalk hangen aan de EERSTE
     kaart van elk onderwerp, zodat een chip naar het nieuwste bericht van dat
     onderwerp springt.

     Er komen geen eigen categorie-URL's: met enkele berichten per onderwerp
     zou elke categoriepagina een dunne pagina zijn die de nationale pagina op
     dezelfde term beconcurreert, en dat verbiedt het contract. */
  if (!leeg) {
    const gezien = new Set();
    const linkbaar = alles.filter((a) => motor.isIndex(a.route));
    const metBeeld = linkbaar.some((a) => artikelBeeld(a.j, KAART_SIZES) !== '');
    const cellen = linkbaar.map((a) => {
      const eigenaar = String(a.j.onderwerp_eigenaar || '').replace(/^\/+/, '');
      const anker = eigenaar && !gezien.has(eigenaar) ? `onderwerp-${eigenaar.replace(/\//g, '-')}` : null;
      if (eigenaar) gezien.add(eigenaar);
      return artikelkaart(a, naamVan(eigenaar, eigenaar), anker, metBeeld);
    });
    if (cellen.length) {
      secties.push(
        kaartsectie({
          id: 'berichten',
          kop: alles.length === 1 ? 'Het laatste bericht' : 'Alle berichten',
          cellen,
        })
      );
    }
  }

  secties.push(kennisSectie(motor, route));

  secties.push(
    conversie({
      kop: 'Wat betekent dit voor uw locatie?',
      tekst:
        'Een marktontwikkeling zegt nog niets over uw aansluiting, uw verbruiksprofiel of uw contract. ' +
        'In een adviesgesprek leggen we ze naast uw situatie.',
      primair: { route: 'contact', label: 'Plan een adviesgesprek' },
      secundair: motor.isIndex('energieadvies') ? { route: 'energieadvies', label: 'Bekijk het energieadvies' } : null,
    })
  );

  schrijf(
    route,
    pagina({
      route,
      titel: 'Nieuws & inzichten over de energiemarkt | Vibe Energy',
      /* De beschrijving belooft geen berichten zolang die er niet zijn. Een
         snippet die een lijst suggereert op een pagina zonder lijst is een
         valse belofte in het zoekresultaat. */
      beschrijving: leeg
        ? 'Nieuws en inzichten van Vibe Energy over netcongestie, batterijopslag, laadinfrastructuur ' +
          'en verduurzaming. De eerste berichten verschijnen binnenkort.'
        : 'Nieuws en inzichten van Vibe Energy over netcongestie, batterijopslag, laadinfrastructuur ' +
          'en verduurzaming voor zakelijke locaties.',
      ogTitel: 'Nieuws & inzichten',
      dataPagina: 'nieuws',
      kruimels: [],
      kruimelLabel: 'Nieuws',
      gewijzigd: nieuwste ? nieuwste.j.gewijzigd || nieuwste.j.gepubliceerd : undefined,
      paginaCss: PAGINA_CSS,
      inhoud: secties.filter(Boolean).join('\n\n'),
    })
  );
}

/* ============================================================ hoofdingang */
export function bouwNieuws({ register, motor, schrijf }) {
  const bestanden = artikelbestanden();
  const geo = geoIndex();
  const fouten = [];
  const gepubliceerd = [];

  for (const { pad, j } of bestanden) {
    const route = String(j.route || '').replace(/^\/+/, '');
    if (!route) {
      fouten.push(`${pad}: geen route`);
      continue;
    }
    if (route === NIEUWS_WORTEL) {
      fouten.push(
        `${pad}: de hub /nieuws wordt gegenereerd uit de artikelen; een inhoudsbestand voor die route wordt genegeerd`
      );
      continue;
    }
    const r = register.get(route);
    if (!r) {
      fouten.push(`${pad}: route '${route}' staat niet in het register`);
      continue;
    }
    if (r.staat !== 'INDEX') continue;
    gepubliceerd.push({ route, j, pad });
  }

  /* De artikelen eerst: de hub linkt ernaar en moet weten wat INDEX is. */
  for (const a of gepubliceerd) bouwArtikel({ ...a, motor, schrijf, geo });

  /* Tot Release 3.3 was een INDEX-hub zonder artikel hier een FOUT. Dat is
     herzien: de hub rendert nu ook leeg, met de onderwerpen en de kennisbank
     als inhoud. De beslissing of de hub überhaupt op INDEX staat ligt niet hier maar in
     bouw-routes.mjs, dat daarvoor het publicatiebesluit leest. Deze functie
     voert dat besluit alleen uit. */
  const hubIsIndex = register.get(NIEUWS_WORTEL)?.staat === 'INDEX';
  if (hubIsIndex) bouwHub({ gepubliceerd, motor, schrijf });

  if (fouten.length) {
    for (const f of fouten) console.error(`NIEUWSFOUT: ${f}`);
    process.exitCode = 1;
  }

  return { artikelen: gepubliceerd.length, hub: hubIsIndex, kandidaten: bestanden.length, fouten };
}
