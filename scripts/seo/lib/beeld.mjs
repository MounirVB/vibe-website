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
