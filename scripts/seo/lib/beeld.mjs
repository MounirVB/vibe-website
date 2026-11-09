/* ============================================================================
   VIBE ENERGY — BEELDLAAG VOOR DE GENERATOR
   ----------------------------------------------------------------------------
   Tot nu toe kende het inhoudsmodel van de generator GEEN beeld. Gemeten op
   basis aad232f: 417 van de 448 pagina's dragen geen enkele <img> in <main>,
   en alle 397 gegenereerde pagina's zitten in die 417. De 51 handgeschreven
   pagina's gebruiken wél beeld, en dat is het zichtbare verschil tussen beide
   helften van de site.

   DEZE MODULE VERZINT NIETS. Hij leest wat er op schijf ligt:

   · De naamconventie is <basis>-<breedte>.webp, met een .jpg op de kale
     basisnaam als terugval. Gemeten varianten verschillen per familie —
     projects 640/800/1200/1800, systeem 640/880/1000/1400/1800, home
     400/680/800/1360/1920/2560 — dus de breedtes worden UITGELEZEN en niet
     aangenomen.
   · width en height komen uit de grootste variant zelf, zodat de browser
     ruimte reserveert en er geen layout shift ontstaat. De bestaande
     handgeschreven pagina's doen dat ook.
   · Een ontbrekend beeld is een BOUWFOUT en geen stille leegte. Wie een pad
     verkeerd typt krijgt een harde melding, niet een gebroken <img> op 349
     pagina's.

   WebP-afmetingen worden hier zelf uit de RIFF-kop gelezen. sips is macOS-
   only en de CI draait op Linux; een extra afhankelijkheid voor drie
   getallen is dat niet waard.
   ============================================================================ */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, basename, join, resolve } from 'node:path';

const WORTEL = resolve(new URL('../../..', import.meta.url).pathname);

/* ----------------------------------------------------- webp-afmetingen
   Drie vormen, alle drie in het wild aanwezig:
     VP8  (lossy)    — 'VP8 ' chunk, 14 bytes offset, 16-bit breedte/hoogte
     VP8L (lossless) — 'VP8L' chunk, 14 bits breedte, 14 bits hoogte, -1
     VP8X (extended) — 'VP8X' chunk, 24-bit canvasmaten, -1
   Geeft null terug bij iets anders; de aanroeper beslist wat dat betekent. */
export function webpMaat(pad) {
  const b = readFileSync(pad);
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const soort = b.toString('ascii', 12, 16);
  if (soort === 'VP8 ') {
    return { breedte: b.readUInt16LE(26) & 0x3fff, hoogte: b.readUInt16LE(28) & 0x3fff };
  }
  if (soort === 'VP8L') {
    const n = b.readUInt32LE(21);
    return { breedte: (n & 0x3fff) + 1, hoogte: ((n >> 14) & 0x3fff) + 1 };
  }
  if (soort === 'VP8X') {
    const br = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
    const ho = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
    return { breedte: br, hoogte: ho };
  }
  return null;
}

/* ---------------------------------------------------------------- jpeg
   Alleen nodig voor de terugval; loopt de segmenten af tot een SOFn. */
export function jpegMaat(pad) {
  const b = readFileSync(pad);
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { hoogte: b.readUInt16BE(i + 5), breedte: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

/* --------------------------------------------------------- varianten
   basis is een pad ZONDER extensie en zonder breedte, bijvoorbeeld
   'assets/projects/ratio-16'. Geeft de gevonden breedtes gesorteerd terug. */
const cacheVarianten = new Map();
export function varianten(basis) {
  if (cacheVarianten.has(basis)) return cacheVarianten.get(basis);
  const map = join(WORTEL, dirname(basis));
  const naam = basename(basis);
  let breedtes = [];
  if (existsSync(map) && statSync(map).isDirectory()) {
    const re = new RegExp('^' + naam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-(\\d{3,4})\\.webp$');
    breedtes = readdirSync(map)
      .map((f) => { const m = re.exec(f); return m ? Number(m[1]) : null; })
      .filter((n) => n !== null)
      .sort((a, b) => a - b);
  }
  cacheVarianten.set(basis, breedtes);
  return breedtes;
}

export function bestaat(basis) {
  return varianten(basis).length > 0 || existsSync(join(WORTEL, basis + '.jpg'));
}

/* ------------------------------------------------------------ beeldTag
   Levert een <img> met srcset, sizes en harde width/height.

   sizes is VERPLICHT en wordt niet geraden: de juiste waarde hangt af van de
   compositie waarin het beeld staat, en een verkeerde sizes laat de browser
   stelselmatig een te grote variant kiezen. Dat was al een gemeten bevinding
   op deze site (PERF-03: sizes="100vw" waar de kolom 592px breed is).

   Een onbekend beeld werpt. Stil doorgaan zou een gebroken <img> op honderden
   pagina's opleveren en pas in productie zichtbaar worden. */
export function beeldTag({ basis, alt, sizes, klasse = '', lazy = true, fetchpriority = null }) {
  if (!basis) throw new Error('beeldTag: geen basispad');
  if (typeof alt !== 'string') throw new Error(`beeldTag: alt ontbreekt voor ${basis}`);
  if (!sizes) throw new Error(`beeldTag: sizes ontbreekt voor ${basis} — raad hem niet`);

  const br = varianten(basis);
  const jpg = join(WORTEL, basis + '.jpg');
  if (!br.length && !existsSync(jpg)) throw new Error(`beeldTag: geen enkel bestand voor ${basis}`);

  const grootste = br.length ? br[br.length - 1] : null;
  const bron = grootste ? `/${basis}-${grootste}.webp` : `/${basis}.jpg`;
  const maat = grootste ? webpMaat(join(WORTEL, `${basis}-${grootste}.webp`)) : jpegMaat(jpg);
  if (!maat) throw new Error(`beeldTag: afmetingen niet leesbaar voor ${basis}`);

  const srcset = br.length ? br.map((w) => `/${basis}-${w}.webp ${w}w`).join(', ') : null;

  return [
    `<img src="${bron}"`,
    srcset ? ` srcset="${srcset}"` : '',
    ` sizes="${sizes}"`,
    ` width="${maat.breedte}" height="${maat.hoogte}"`,
    ` alt="${alt.replace(/"/g, '&quot;')}"`,
    klasse ? ` class="${klasse}"` : '',
    lazy ? ' loading="lazy" decoding="async"' : ' decoding="async"',
    fetchpriority ? ` fetchpriority="${fetchpriority}"` : '',
    '>',
  ].join('');
}

/* --------------------------------------------------- de beeldtoewijzing
   WELK BEELD HOORT BIJ WELKE PAGINA.

   Twee bronnen, allebei al in de repo, en geen enkele nieuwe aanname:

   1. scripts/projecten.json — zestien ECHTE projecten met slug, plaats,
      sector, sectorFilter, beeld en beeldAlt. Een sectorpagina krijgt het
      beeld van een project uit DIE sector, en noemt het project bij naam en
      plaats. Er wordt geen project aan een sector gekoppeld waar het niet in
      zit.
   2. De thematische beelden in assets/systeem, assets/home en img/. Die
      tonen het ONDERWERP (een accu, een laadplein, meetapparatuur) en geen
      klantproject, dus ze dragen geen claim.

   WAT DE REGIOPAGINA'S KRIJGEN, EN WAAROM DAT EERLIJK MOET.
   Er zijn 349 regiopagina's en elf gemeenten met een eigen project. De elf
   krijgen hun eigen projectbeeld; de overige 338 krijgen een thematisch
   beeld dat bij de inhoud van die pagina hoort, en NOOIT een projectfoto uit
   een andere gemeente. Een foto van Arnhem op de pagina van Assen suggereert
   een project dat daar niet staat, en dat is precies de klasse fout die het
   claimregister van dit project verbiedt. */
const THEMA = {
  accu: { basis: 'assets/home/s2-accu', alt: 'Batterijsysteem van Vibe Energy naast een bedrijfspand' },
  opslag: { basis: 'assets/home/s7-opslag', alt: 'Batterijkasten van Vibe Energy in een houten omkasting naast een bedrijfspand' },
  laden: { basis: 'assets/home/s2-laad', alt: 'Laadinfrastructuur op een bedrijfsterrein' },
  zon: { basis: 'assets/home/s2-zon', alt: 'Zonnepanelen op een bedrijfsdak' },
  ems: { basis: 'assets/home/s2-ems', alt: 'Het energiemanagementsysteem van Vibe Energy' },
  systeem: { basis: 'assets/systeem/s4-systeem', alt: 'Opstelling van een energieopslagsysteem' },
  binnenwerk: { basis: 'img/batterij-binnenwerk', alt: 'Het binnenwerk van een batterijsysteem' },
  meting: { basis: 'img/control-meting', alt: 'Meetapparatuur in een schakelkast' },
  emstech: { basis: 'img/ems-tech', alt: 'Technische installatie van het energiemanagementsysteem' },
  dak: { basis: 'img/comm-rooftop', alt: 'Zonnepanelen op het dak van een commercieel pand' },
  laadpunt: { basis: 'img/ev-charging', alt: 'Een elektrische auto aan een laadpunt' },
  werktekening: { basis: 'img/monteurs-werktekening', alt: 'Monteurs bij een werktekening op locatie' },

  /* ------------------------------------------------------------------
     DE EIGEN FOTOGRAFIE DIE AL OP SCHIJF STOND.

     assets/ draagt 23 *-hero-families. De generator gebruikte er nul; hij
     koos altijd uit de twaalf algemene onderwerpen hierboven, waardoor 349
     regiopagina's dezelfde img/control-meting kregen. Deze beelden zijn van
     Vibe zelf — de kasten dragen het logo, de mensen dragen de bedrijfsjas.

     De alt-teksten hieronder zijn geschreven NA het bekijken van de beelden,
     niet afgeleid uit de bestandsnaam. Dat is geen formaliteit: drie namen
     dekten de lading niet.

     NIET OPGENOMEN, met reden:
       subsidies-hero     een plein met een kerktoren. Geen enkele relatie met
                          subsidies of met energie. Dit is precies de losse
                          stockfoto die hier niet hoort.
       energiehandel-hero bit-voor-bit hetzelfde beeld als ems-hero.
       microgrids-hero    vrijwel gelijk aan netcongestie-hero (zelfde kasten,
                          zelfde hek, andere uitsnede).
       energieopslag-hero vrijwel gelijk aan capaciteit-hero.
     Twee bijna-gelijke foto's op een pagina lezen als een fout, niet als
     ritme, dus een pagina krijgt er nooit twee uit hetzelfde paar. */
  kast: { basis: 'assets/bedrijf-hero', alt: 'Batterijkast van Vibe Energy tegen de gevel van een bedrijfspand' },
  omkasting: { basis: 'assets/capaciteit-hero', alt: 'Twee batterijkasten in een houten omkasting naast een bedrijfspand' },
  hekwerk: { basis: 'assets/netcongestie-hero', alt: 'Twee batterijkasten van Vibe Energy achter een hekwerk op het terrein' },
  platdak: { basis: 'assets/dakvlak-hero', alt: 'Zonnepanelen op een plat bedrijfsdak, met de kabelgoot langs de rij' },
  panelen: { basis: 'assets/zonnepanelen-hero', alt: 'Zonnepanelen op een dak tegen een bewolkte lucht' },
  luchtkantoor: { basis: 'assets/kantoor-hero', alt: 'Luchtfoto van een kantoorpand met zonnepanelen op het dak en een parkeerterrein ernaast' },
  luchtvastgoed: { basis: 'assets/vastgoed-hero', alt: 'Luchtfoto van een bedrijfspand met parkeerterrein' },
  luchtwonen: { basis: 'assets/residentieel-hero', alt: 'Luchtfoto van een woonblok met een volledig belegd zonnedak' },
  luchtvve: { basis: 'assets/vve-hero', alt: 'Luchtfoto van een rij woningen met zonnepanelen en achtertuinen' },
  luchtcomplex: { basis: 'assets/energielabel-hero', alt: 'Luchtfoto van een gebouwencomplex met zonnepanelen op de daken' },
  carport: { basis: 'assets/laadplein-hero', alt: 'Luchtfoto van een parkeerterrein met een overkapping van zonnepanelen' },
  laadpaal: { basis: 'assets/laadpalen-hero', alt: 'Een auto aan een laadpunt, met de laadkabel aangesloten' },
  wandlader: { basis: 'assets/exploitatie-hero', alt: "Wandlaadpunt met kabel naast geparkeerde auto's" },
  logistiek: { basis: 'assets/logistiek-hero', alt: 'Luchtfoto van een bedrijventerrein met zonnecarports en een windturbine' },
  meters: { basis: 'assets/ems-hero', alt: 'Een rij kilowattuurmeters in een meterkast' },
  werkplaats: { basis: 'assets/over-ons-hero', alt: 'Twee medewerkers van Vibe Energy bij een tekening op de werkplek' },
  montage: { basis: 'assets/waarom-vibe-hero', alt: 'Monteur op een ladder bij een staalconstructie' },
};

/** Het thematische beeld voor een sleutel; werpt als de sleutel niet bestaat. */
export function thema(sleutel) {
  const t = THEMA[sleutel];
  if (!t) throw new Error(`thema: onbekende sleutel ${sleutel}`);
  if (!bestaat(t.basis)) throw new Error(`thema: ${sleutel} wijst naar ${t.basis}, dat niet bestaat`);
  return t;
}

export function themaSleutels() {
  return Object.keys(THEMA);
}

/** Alle thematische beelden die werkelijk op schijf staan — voor de poort. */
export function controleerThema() {
  const ontbreekt = Object.entries(THEMA).filter(([, t]) => !bestaat(t.basis)).map(([k, t]) => `${k} -> ${t.basis}`);
  return { totaal: Object.keys(THEMA).length, ontbreekt };
}

/* ------------------------------------------------------- beeldVoor(route)
   WELK ONDERWERP HOORT BIJ WELKE ROUTE.

   Per route expliciet, en met een vangnet per type. Geen slimme afleiding uit
   de titel: een regel die 'accu' in een routenaam herkent, kiest vroeg of laat
   het verkeerde beeld bij een route die niemand heeft voorzien. Wie een route
   toevoegt zonder hem hier te noemen, krijgt het typevangnet — en dat is een
   onderwerpsbeeld, nooit een klantproject. */
const PER_ROUTE = {
  /* oplossingen */
  netcongestie: 'meting',
  laadplein: 'laadpunt',
  energieadvies: 'werktekening',
  'verduurzaming-bedrijfspanden': 'dak',
  /* hubs */
  sectoren: 'dak',
  toepassingen: 'systeem',
  kennis: 'binnenwerk',
  subsidies: 'werktekening',
  /* toepassingen */
  'toepassingen/batterij-slim-inzetten': 'accu',
  'toepassingen/bestaande-aansluiting-optimaliseren': 'meting',
  'toepassingen/elektrificatie-bedrijfswagens': 'laadpunt',
  'toepassingen/geen-extra-transportvermogen': 'meting',
  'toepassingen/laden-met-beperkte-aansluiting': 'laden',
  'toepassingen/meerdere-locaties': 'ems',
  'toepassingen/netcongestie-bij-uitbreiding': 'opslag',
  'toepassingen/pieken-in-verbruik': 'accu',
  'toepassingen/processen-sturen-met-ems': 'emstech',
  'toepassingen/terugleverbeperking': 'zon',
  /* sectoren */
  'sectoren/automotive': 'laadpunt',
  'sectoren/bedrijventerreinen': 'dak',
  'sectoren/bouw': 'werktekening',
  'sectoren/gebiedsontwikkeling': 'systeem',
  'sectoren/horeca': 'opslag',
  'sectoren/opslag-en-distributie': 'dak',
  'sectoren/parkeren': 'laden',
  'sectoren/productie-en-industrie': 'binnenwerk',
  'sectoren/retail': 'dak',
  'sectoren/transport-en-wagenparken': 'laadpunt',
  'sectoren/zorgvastgoed': 'zon',
};

const PER_TYPE = { hub: 'systeem', sector: 'dak', toepassing: 'accu', kennis: 'binnenwerk', oplossing: 'systeem', subsidie: 'werktekening', regio: 'meting' };

/** Het openingsbeeld voor een route: het eerste uit de set hieronder.
    Een route die zowel in PER_ROUTE als in BEELDSET staat, wordt door
    BEELDSET bepaald — anders zou de opening een ander onderwerp tonen dan
    de rest van de pagina. PER_ROUTE en PER_TYPE blijven het vangnet voor
    routes die nog geen set hebben. */
export function beeldVoor(route, type) {
  const r = String(route).replace(/^\/+/, '');
  if (BEELDSET[r] || type === 'regio' || SET_PER_TYPE[type]) return beeldenVoor(r, type)[0];
  const sleutel = PER_ROUTE[r] || PER_TYPE[type] || 'systeem';
  return thema(sleutel);
}

/* ===================================================================
   DRIE BEELDEN PER PAGINA IN PLAATS VAN EEN.

   Een pagina heeft meer dan een openingsbeeld nodig zodra er secties
   tussen staan die anders louter tekst zijn. Gemeten op de gegenereerde
   pagina's: netcongestie 10 van 12 secties pure tekst, laadplein 14 van
   15, sectoren/retail 10 van 11. De handgeschreven index.html heeft er
   2 van 10.

   De set is per route vastgelegd en niet afgeleid. Twee regels:
     1. Alle drie komen uit een ANDERE visuele groep waar dat kan — kast,
        dak, laden, techniek, mensen — zodat de pagina niet drie keer
        dezelfde foto in een andere uitsnede toont.
     2. Een beeld suggereert nooit een klantproject op die locatie. De
        projectfoto's lopen via SECTOR_PROJECTEN hieronder, en alleen
        daar. =================================================== */
const BEELDSET = {
  /* oplossingen */
  netcongestie: ['hekwerk', 'meters', 'omkasting'],
  laadplein: ['carport', 'laadpaal', 'wandlader'],
  energieadvies: ['werkplaats', 'meting', 'werktekening'],
  'verduurzaming-bedrijfspanden': ['platdak', 'panelen', 'luchtkantoor'],
  /* hubs */
  sectoren: ['luchtvastgoed', 'platdak', 'kast'],
  toepassingen: ['omkasting', 'meters', 'emstech'],
  kennis: ['binnenwerk', 'meters', 'montage'],
  subsidies: ['montage', 'werktekening', 'luchtcomplex'],
  /* toepassingen */
  'toepassingen/batterij-slim-inzetten': ['omkasting', 'binnenwerk', 'meters'],
  'toepassingen/bestaande-aansluiting-optimaliseren': ['meters', 'meting', 'kast'],
  'toepassingen/elektrificatie-bedrijfswagens': ['laadpaal', 'wandlader', 'carport'],
  'toepassingen/geen-extra-transportvermogen': ['hekwerk', 'meters', 'meting'],
  'toepassingen/laden-met-beperkte-aansluiting': ['wandlader', 'carport', 'laadpaal'],
  'toepassingen/meerdere-locaties': ['emstech', 'meters', 'luchtcomplex'],
  'toepassingen/netcongestie-bij-uitbreiding': ['kast', 'hekwerk', 'meting'],
  'toepassingen/pieken-in-verbruik': ['meters', 'omkasting', 'meting'],
  'toepassingen/processen-sturen-met-ems': ['emstech', 'meters', 'ems'],
  'toepassingen/terugleverbeperking': ['panelen', 'platdak', 'meters'],
  /* sectoren */
  'sectoren/automotive': ['laadpaal', 'wandlader', 'logistiek'],
  'sectoren/bedrijventerreinen': ['luchtvastgoed', 'platdak', 'kast'],
  'sectoren/bouw': ['montage', 'werktekening', 'luchtcomplex'],
  'sectoren/gebiedsontwikkeling': ['luchtcomplex', 'luchtwonen', 'platdak'],
  'sectoren/horeca': ['luchtkantoor', 'omkasting', 'panelen'],
  'sectoren/opslag-en-distributie': ['logistiek', 'luchtvastgoed', 'platdak'],
  'sectoren/parkeren': ['carport', 'laadpaal', 'wandlader'],
  'sectoren/productie-en-industrie': ['kast', 'omkasting', 'meters'],
  'sectoren/retail': ['luchtkantoor', 'platdak', 'kast'],
  'sectoren/transport-en-wagenparken': ['logistiek', 'laadpaal', 'wandlader'],
  'sectoren/zorgvastgoed': ['luchtwonen', 'luchtcomplex', 'panelen'],
  /* kennis */
  'kennis/batterij-dimensioneren': ['binnenwerk', 'omkasting', 'meters'],
  'kennis/batterijdegradatie': ['binnenwerk', 'meters', 'kast'],
  'kennis/batterijveiligheid': ['hekwerk', 'binnenwerk', 'montage'],
  'kennis/businesscase-batterij': ['meters', 'omkasting', 'werkplaats'],
  'kennis/ems-energiemanagementsysteem': ['emstech', 'meters', 'ems'],
  'kennis/energiehandel-en-flexibiliteit': ['meters', 'emstech', 'kast'],
  'kennis/energieprestatie-meten': ['meting', 'meters', 'emstech'],
  'kennis/kw-versus-kwh': ['meters', 'meting', 'binnenwerk'],
  'kennis/laadinfrastructuur-dimensioneren': ['laadpaal', 'carport', 'wandlader'],
  'kennis/load-balancing': ['wandlader', 'laadpaal', 'emstech'],
  'kennis/netaansluiting-aanvragen': ['meters', 'werktekening', 'montage'],
  'kennis/netcongestie-uitgelegd': ['hekwerk', 'meters', 'omkasting'],
  'kennis/normen-en-keuringen': ['montage', 'werktekening', 'binnenwerk'],
  'kennis/peak-shaving': ['omkasting', 'meters', 'meting'],
  'kennis/subsidiemechanismen': ['werktekening', 'werkplaats', 'luchtcomplex'],
  'kennis/terugleverbeperking': ['panelen', 'platdak', 'meters'],
  'kennis/transportvermogen-versus-aansluitwaarde': ['meters', 'meting', 'kast'],
};

const SET_PER_TYPE = {
  hub: ['luchtvastgoed', 'platdak', 'kast'],
  sector: ['luchtvastgoed', 'platdak', 'kast'],
  toepassing: ['omkasting', 'meters', 'meting'],
  kennis: ['binnenwerk', 'meters', 'montage'],
  oplossing: ['kast', 'meters', 'platdak'],
  subsidie: ['montage', 'werktekening', 'luchtcomplex'],
};

/* De 349 regiopagina's deelden tot nu toe EEN beeld: img/control-meting op
   alle 349. Dat leest als een sjabloon, want dat is het ook. Ze krijgen nu
   een beeld uit een vaste rotatie, gekozen op een stabiele hash van de
   route — dezelfde route levert altijd hetzelfde beeld, dus de bouw blijft
   reproduceerbaar, en twee buurgemeenten tonen niet hetzelfde.
   Alle vier zijn onderwerpsbeelden: geen van vieren suggereert een project
   op die plek. */
const REGIO_ROTATIE = [
  ['hekwerk', 'meters', 'platdak'],
  ['platdak', 'meters', 'kast'],
  ['kast', 'meting', 'panelen'],
  ['luchtvastgoed', 'meters', 'omkasting'],
];

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Drie onderscheidende beelden voor een pagina: [opening, band, canvas].
    Werpt nooit; valt terug op het type en daarna op de oplossingenset. */
export function beeldenVoor(route, type) {
  const r = String(route).replace(/^\/+/, '');
  let set = BEELDSET[r];
  if (!set && type === 'regio') set = REGIO_ROTATIE[hash(r) % REGIO_ROTATIE.length];
  if (!set) set = SET_PER_TYPE[type] || SET_PER_TYPE.oplossing;
  return set.map((s) => thema(s));
}

/* -------------------------------------------- projecten bij een sector
   ALLEEN BIJ EEN ECHTE OVEREENKOMST.

   scripts/projecten.json draagt per project een sectorFilter. De waarden zijn
   gemeten: automotive, bedrijfspanden, netcongestie, recreatie,
   woningportefeuilles. Een sectorpagina krijgt alleen projecten waarvan de
   sectorFilter daadwerkelijk bij die pagina hoort — niet 'ongeveer'. Een
   project uit de bedrijfspanden tonen op /sectoren/retail zou suggereren dat
   Vibe daar een retailproject heeft, en docs/vibe-claims-register-v2.md
   verbiedt precies die soort suggestie.

   TWEE routes hebben een echte overeenkomst; de rest krijgt geen projectband.
   Dat is geen omissie maar het eerlijke antwoord.

   /sectoren/transport-en-wagenparken stond hier eerst ook, gekoppeld aan de
   automotive-projecten. Dat is teruggedraaid: de Hedin-vestigingen zijn
   autobedrijven, geen wagenparkprojecten. 'Ongeveer dezelfde sector' is precies
   de afleiding die deze regel moet voorkomen. */
const SECTOR_PROJECTEN = {
  netcongestie: ['netcongestie'],
  'sectoren/automotive': ['automotive'],
};

export function projectFiltersVoor(route) {
  return SECTOR_PROJECTEN[String(route).replace(/^\/+/, '')] || null;
}
