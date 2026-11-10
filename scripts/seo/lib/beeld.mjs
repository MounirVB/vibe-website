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
/* ============================================================================
   HET ASSETREGISTER

   Elk beeld is BEKEKEN voordat het hier is opgeschreven. Dat is geen
   formaliteit. De vorige versie van dit bestand leidde alt-teksten af uit de
   bestandsnaam, en vijf daarvan bleken onjuist:

     netcongestie-hero   stond als 'twee batterijkasten achter een hekwerk'.
                         Het zijn er DRIE, op betonnen voeten.
     img/ev-charging     stond als 'een elektrische auto aan een laadpunt'.
                         Het is een LUCHTFOTO van een autobedrijf met
                         zonnecarports. Niets van de beschrijving klopte.
     img/control-meting  stond als 'meetapparatuur in een schakelkast'. Er
                         staat een monteur op die de installatie bedient.
     img/ems-tech        stond als 'technische installatie'. Ook hier staat
                         een persoon op.
     assets/home/s2-ems  stond als 'het energiemanagementsysteem'. Idem.

   EN EEN TWEEDE, GROTER PROBLEEM. Dertig bestanden tonen samen ongeveer
   veertien onderwerpen: dezelfde drie kasten staan in netcongestie-hero,
   home/s2-accu en systeem/s4-systeem; dezelfde houten omkasting in
   capaciteit-hero, home/s7-opslag en systeem/s1-hero; dezelfde twee mensen
   bij dezelfde tekening in over-ons-hero en img/monteurs-werktekening.

   Een register dat die dertig als dertig onderwerpen behandelt, zet vroeg of
   laat twee keer dezelfde foto op een pagina. Daarom draagt elk beeld een
   `groep`, en levert beeldenVoor() nooit twee beelden uit dezelfde groep.
   De zelftest onderaan dit bestand bewaakt dat.
   ========================================================================== */
const THEMA = {
  /* ---- opslag buiten: drie kasten op betonnen voeten ---- */
  kastenDrie: { groep: 'opslag-buiten', basis: 'assets/netcongestie-hero', alt: 'Drie witte batterijkasten van Vibe Energy op betonnen voeten naast een bedrijfspand' },
  accu: { groep: 'opslag-buiten', basis: 'assets/home/s2-accu', alt: 'Drie batterijkasten van Vibe Energy in de buitenopstelling op een bedrijfsterrein' },
  systeem: { groep: 'opslag-buiten', basis: 'assets/systeem/s4-systeem', alt: 'Opstelling van drie batterijkasten op een bedrijfsterrein, achter een hekwerk' },

  /* ---- opslag buiten: twee kasten in een houten omkasting ---- */
  omkasting: { groep: 'opslag-omkasting', basis: 'assets/capaciteit-hero', alt: 'Twee batterijkasten in een houten omkasting naast een bedrijfspand' },
  opslag: { groep: 'opslag-omkasting', basis: 'assets/home/s7-opslag', alt: 'Batterijkasten van Vibe Energy in een houten omkasting naast een bedrijfspand' },

  /* ---- opslag: detail en binnenwerk ---- */
  kast: { groep: 'opslag-detail', basis: 'assets/bedrijf-hero', alt: 'Batterijcontainer van Vibe Energy met het merklogo op de zijwand' },
  binnenwerk: { groep: 'opslag-binnen', basis: 'img/batterij-binnenwerk', alt: 'Het open binnenwerk van een batterijsysteem, met de modules en de oranje verbindingskabels' },

  /* ---- laden ---- */
  laadpaal: { groep: 'laden-auto', basis: 'assets/laadpalen-hero', alt: 'Een auto aan een laadpunt, met de laadkabel aangesloten' },
  laden: { groep: 'laden-auto', basis: 'assets/home/s2-laad', alt: 'Een elektrische auto die laadt aan een laadpunt op een bedrijfsterrein' },
  wandlader: { groep: 'laden-wand', basis: 'assets/exploitatie-hero', alt: "Wandlaadpunten met kabels naast geparkeerde auto's" },
  carport: { groep: 'laden-carport', basis: 'assets/laadplein-hero', alt: 'Luchtfoto van een parkeerterrein met een lange overkapping van zonnepanelen en de skyline op de achtergrond' },
  autobedrijf: { groep: 'laden-autobedrijf', basis: 'assets/logistiek-hero', alt: 'Luchtfoto van een autobedrijf met zonnecarports op het terrein en windturbines op de achtergrond' },
  autobedrijfTwee: { groep: 'laden-autobedrijf', basis: 'img/ev-charging', alt: 'Luchtfoto van een autobedrijf met zonnepanelen op het dak en zonnecarports langs de showroom' },

  /* ---- zon op het dak, vanaf het dak gezien ---- */
  platdak: { groep: 'zon-dak', basis: 'assets/dakvlak-hero', alt: 'Zonnepanelen op een plat bedrijfsdak, met het looppad en de kabelgoot ertussen' },
  panelen: { groep: 'zon-dak', basis: 'assets/zonnepanelen-hero', alt: 'Rijen zonnepanelen op een plat dak tegen een bewolkte lucht' },
  zon: { groep: 'zon-dak', basis: 'assets/home/s2-zon', alt: 'Zonnepanelen in rijen op het platte dak van een bedrijfspand' },

  /* ---- zon op het dak, van bovenaf: bedrijfspanden ---- */
  luchtvastgoed: { groep: 'zon-pand-lucht', basis: 'assets/vastgoed-hero', alt: 'Luchtfoto van een bedrijfspand met zonnepanelen op het dak en een parkeerterrein ernaast' },
  luchtkantoor: { groep: 'zon-pand-lucht', basis: 'assets/kantoor-hero', alt: 'Luchtfoto van een bedrijfspand met een donker dak dat deels met zonnepanelen is belegd' },
  luchtretail: { groep: 'zon-pand-lucht', basis: 'img/comm-retail', alt: 'Luchtfoto van een winkelpand met zonnepanelen op het dak' },
  dak: { groep: 'zon-pand-lucht', basis: 'img/comm-rooftop', alt: 'Luchtfoto van een gebouwdak dat vrijwel volledig met zonnepanelen is belegd' },

  /* ---- zon op het dak, van bovenaf: woningen ---- */
  luchtwonen: { groep: 'zon-wonen-lucht', basis: 'assets/residentieel-hero', alt: 'Luchtfoto van een wooncomplex waarvan de daken met zonnepanelen zijn belegd' },
  luchtvve: { groep: 'zon-wonen-lucht', basis: 'assets/vve-hero', alt: 'Luchtfoto van een rij woningen met zonnepanelen op de daken en achtertuinen ertussen' },
  luchtcomplex: { groep: 'zon-wonen-lucht', basis: 'assets/energielabel-hero', alt: 'Luchtfoto van een gebouwencomplex met zonnepanelen op de daken' },

  /* ---- mensen: techniek, overleg, montage ---- */
  meting: { groep: 'mens-techniek', basis: 'img/control-meting', alt: 'Monteur van Vibe Energy bedient een installatie in een technische ruimte' },
  emstech: { groep: 'mens-techniek', basis: 'img/ems-tech', alt: 'Monteur van Vibe Energy bij een geopende schakelkast' },
  ems: { groep: 'mens-techniek', basis: 'assets/home/s2-ems', alt: 'Monteur van Vibe Energy bij de regelkast van het energiemanagementsysteem' },
  werkplaats: { groep: 'mens-overleg', basis: 'assets/over-ons-hero', alt: 'Twee medewerkers van Vibe Energy bij een tekening op de werkplek' },
  werktekening: { groep: 'mens-overleg', basis: 'img/monteurs-werktekening', alt: 'Twee medewerkers van Vibe Energy buigen zich over een werktekening' },
  montage: { groep: 'mens-montage', basis: 'assets/waarom-vibe-hero', alt: 'Monteur op een ladder bij een staalconstructie' },

  /* ---- meten ---- */
  meters: { groep: 'meting-meters', basis: 'assets/ems-hero', alt: 'Een rij kilowattuurmeters met digitale displays' },
};


/** Het thematische beeld voor een sleutel; werpt als de sleutel niet bestaat. */
export function thema(sleutel) {
  const t = THEMA[sleutel];
  if (!t) throw new Error(`thema: onbekende sleutel ${sleutel}`);
  if (!bestaat(t.basis)) throw new Error(`thema: ${sleutel} wijst naar ${t.basis}, dat niet bestaat`);
  return t;
}

/** Het thema dat bij een basispad hoort, of null.
    Nodig omdat genereer-nieuws.mjs zijn beelden bij bestandsnaam kende en
    niet bij sleutel. Zo kan die motor op DIT register aansluiten in plaats
    van een tweede register met eigen alt-teksten te onderhouden — en die
    liepen uiteen: netcongestie-hero stond daar als "drie witte
    batterijcontainers", hier als "twee batterijkasten achter een hekwerk",
    en geen van beide klopte volledig. */
export function themaVoorBasis(basis) {
  const b = String(basis).replace(/^\/+/, '');
  for (const [sleutel, t] of Object.entries(THEMA)) if (t.basis === b) return { sleutel, ...t };
  return null;
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
  netcongestie: ['kastenDrie', 'meters', 'omkasting'],
  laadplein: ['carport', 'laadpaal', 'wandlader'],
  energieadvies: ['werkplaats', 'meting', 'meters'],
  'verduurzaming-bedrijfspanden': ['platdak', 'luchtkantoor', 'montage'],
  /* hubs */
  sectoren: ['luchtvastgoed', 'platdak', 'kast'],
  toepassingen: ['omkasting', 'meters', 'emstech'],
  kennis: ['binnenwerk', 'meters', 'montage'],
  subsidies: ['montage', 'werktekening', 'luchtcomplex'],
  /* toepassingen */
  'toepassingen/batterij-slim-inzetten': ['omkasting', 'binnenwerk', 'meters'],
  'toepassingen/bestaande-aansluiting-optimaliseren': ['meters', 'meting', 'kast'],
  'toepassingen/elektrificatie-bedrijfswagens': ['laadpaal', 'wandlader', 'carport'],
  'toepassingen/geen-extra-transportvermogen': ['kastenDrie', 'meters', 'meting'],
  'toepassingen/laden-met-beperkte-aansluiting': ['wandlader', 'carport', 'laadpaal'],
  'toepassingen/meerdere-locaties': ['emstech', 'meters', 'luchtcomplex'],
  'toepassingen/netcongestie-bij-uitbreiding': ['kast', 'kastenDrie', 'meting'],
  'toepassingen/pieken-in-verbruik': ['meters', 'omkasting', 'meting'],
  'toepassingen/processen-sturen-met-ems': ['emstech', 'meters', 'kast'],
  'toepassingen/terugleverbeperking': ['panelen', 'meters', 'luchtvastgoed'],
  /* sectoren */
  'sectoren/automotive': ['laadpaal', 'wandlader', 'autobedrijf'],
  'sectoren/bedrijventerreinen': ['luchtvastgoed', 'platdak', 'kast'],
  'sectoren/bouw': ['montage', 'werktekening', 'luchtcomplex'],
  'sectoren/gebiedsontwikkeling': ['luchtcomplex', 'platdak', 'kast'],
  'sectoren/horeca': ['luchtkantoor', 'omkasting', 'panelen'],
  'sectoren/opslag-en-distributie': ['autobedrijf', 'luchtvastgoed', 'platdak'],
  'sectoren/parkeren': ['carport', 'laadpaal', 'wandlader'],
  'sectoren/productie-en-industrie': ['kast', 'omkasting', 'meters'],
  'sectoren/retail': ['luchtretail', 'platdak', 'kast'],
  'sectoren/transport-en-wagenparken': ['autobedrijf', 'laadpaal', 'wandlader'],
  'sectoren/zorgvastgoed': ['luchtwonen', 'panelen', 'omkasting'],
  /* kennis */
  'kennis/batterij-dimensioneren': ['binnenwerk', 'omkasting', 'meters'],
  'kennis/batterijdegradatie': ['binnenwerk', 'meters', 'kast'],
  'kennis/batterijveiligheid': ['kastenDrie', 'binnenwerk', 'montage'],
  'kennis/businesscase-batterij': ['meters', 'omkasting', 'werkplaats'],
  'kennis/ems-energiemanagementsysteem': ['emstech', 'meters', 'binnenwerk'],
  'kennis/energiehandel-en-flexibiliteit': ['meters', 'emstech', 'kast'],
  'kennis/energieprestatie-meten': ['meting', 'meters', 'platdak'],
  'kennis/kw-versus-kwh': ['meters', 'meting', 'binnenwerk'],
  'kennis/laadinfrastructuur-dimensioneren': ['laadpaal', 'carport', 'wandlader'],
  'kennis/load-balancing': ['wandlader', 'laadpaal', 'emstech'],
  'kennis/netaansluiting-aanvragen': ['meters', 'werktekening', 'montage'],
  'kennis/netcongestie-uitgelegd': ['kastenDrie', 'meters', 'omkasting'],
  'kennis/normen-en-keuringen': ['montage', 'werktekening', 'binnenwerk'],
  'kennis/peak-shaving': ['omkasting', 'meters', 'meting'],
  'kennis/subsidiemechanismen': ['werktekening', 'luchtcomplex', 'omkasting'],
  'kennis/terugleverbeperking': ['panelen', 'meters', 'luchtvastgoed'],
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
  ['kastenDrie', 'meters', 'platdak'],
  ['platdak', 'meters', 'kast'],
  ['kast', 'meting', 'panelen'],
  ['luchtvastgoed', 'meters', 'omkasting'],
];

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Beelden voor een pagina: [opening, band, canvas, ...].
    GARANDEERT dat er nooit twee beelden uit dezelfde visuele groep uit komen.
    Dertig bestanden tonen samen ongeveer veertien onderwerpen; zonder deze
    regel zet een pagina vroeg of laat twee uitsnedes van dezelfde foto naast
    elkaar. Gemeten vóór deze regel: elf van de tweeënvijftig sets deden dat.

    Een set die te kort is na het filteren, wordt aangevuld uit de overige
    groepen in een vaste volgorde — niet willekeurig, want de bouw moet
    reproduceerbaar blijven. */
export function beeldenVoor(route, type, aantal = 3) {
  const r = String(route).replace(/^\/+/, '');
  let set = BEELDSET[r];
  if (!set && type === 'regio') set = REGIO_ROTATIE[hash(r) % REGIO_ROTATIE.length];
  if (!set) set = SET_PER_TYPE[type] || SET_PER_TYPE.oplossing;

  const uit = [];
  const gezien = new Set();
  for (const sleutel of set) {
    const t = thema(sleutel);
    if (gezien.has(t.groep)) continue;
    gezien.add(t.groep);
    uit.push(t);
  }

  /* BREEDE SLOTS KRIJGEN EEN BEELD MET VARIANTEN.
     Acht van de dertig beelden bestaan alleen als een grote jpg, zonder
     webp-breedtes: logistiek-hero, ev-charging, comm-retail, comm-rooftop,
     vve-hero, energielabel-hero, waarom-vibe-hero en ems-hero. In een kaart
     of een halve kolom is dat prima. In het openingsbeeld of de canvasband —
     die over de volle breedte staan — betekent het dat een telefoon het
     volledige bestand van enkele honderden kB binnenhaalt, omdat er geen
     kleinere variant is om uit te kiezen.
     De slots zijn niet gelijk: 0 is het openingsbeeld (volbreed), 1 is de
     beeldband (een halve kolom), 2 is de canvasband (volbreed). Een beeld
     zonder varianten hoort dus in het MIDDEN, niet achteraan. De set toont
     dezelfde beelden; alleen de slotvolgorde verandert. */
  const met = uit.filter((t) => varianten(t.basis).length);
  const zonder = uit.filter((t) => !varianten(t.basis).length);
  const geordend = [];
  if (met.length) geordend.push(met.shift());
  if (zonder.length) geordend.push(zonder.shift());
  else if (met.length) geordend.push(met.shift());
  geordend.push(...met, ...zonder);

  /* Draagt de set er TWEE zonder varianten, dan blijft er een in een breed
     slot staan. Dan haalt de selectie zelf een vervanger uit een groep die
     deze pagina nog niet gebruikt — deterministisch op de route, zodat de
     bouw reproduceerbaar blijft. De oorspronkelijke keuze blijft bestaan in
     het smalle slot; er verdwijnt dus geen onderwerp, er komt er een bij. */
  const breed = [0, 2];
  for (const i of breed) {
    const t = geordend[i];
    if (!t || varianten(t.basis).length) continue;
    const kandidaten = Object.keys(THEMA).filter(
      (k) => varianten(THEMA[k].basis).length && !geordend.some((x) => x && x.groep === THEMA[k].groep)
    );
    if (!kandidaten.length) continue;
    const k = kandidaten[hash(r + '|breed' + i) % kandidaten.length];
    geordend[i] = thema(k);
    geordend.push(t);
  }

  uit.length = 0;
  uit.push(...geordend);
  /* aanvullen tot `aantal`, deterministisch: op een hash van de route zodat
     twee pagina's niet dezelfde aanvulling krijgen, maar dezelfde pagina wel
     altijd dezelfde. */
  if (uit.length < aantal) {
    const rest = Object.keys(THEMA).filter((k) => !gezien.has(THEMA[k].groep));
    const start = hash(r + '|aanvulling');
    for (let i = 0; i < rest.length && uit.length < aantal; i++) {
      const k = rest[(start + i) % rest.length];
      const t = THEMA[k];
      if (gezien.has(t.groep)) continue;
      gezien.add(t.groep);
      uit.push(thema(k));
    }
  }
  return uit.slice(0, Math.max(aantal, 1));
}

/** Zelftest voor de poort: geen set mag twee beelden uit dezelfde groep
    dragen, en elke sleutel moet bestaan. Geeft de fouten terug, leeg = goed. */
export function controleerSets() {
  const fouten = [];
  const sets = [
    ...Object.entries(BEELDSET),
    ...Object.entries(SET_PER_TYPE).map(([k, v]) => [`type:${k}`, v]),
    ...REGIO_ROTATIE.map((v, i) => [`regio-rotatie:${i}`, v]),
  ];
  for (const [naam, lijst] of sets) {
    const groepen = [];
    for (const k of lijst) {
      if (!THEMA[k]) { fouten.push(`${naam}: onbekende sleutel ${k}`); continue; }
      groepen.push(THEMA[k].groep);
    }
    const dubbel = [...new Set(groepen.filter((g, i) => groepen.indexOf(g) !== i))];
    if (dubbel.length) fouten.push(`${naam}: twee beelden uit groep ${dubbel.join(', ')}`);
  }
  return fouten;
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
