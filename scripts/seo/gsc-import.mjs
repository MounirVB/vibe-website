#!/usr/bin/env node
/* ============================================================================
   VIBE ENERGY — IMPORTER VOOR SEARCH CONSOLE-EXPORTS
   ----------------------------------------------------------------------------
     node scripts/seo/gsc-import.mjs <export.csv> [meer.csv ...] [opties]

     --reden "<tekst>"   de reden waaronder deze export is gemaakt, als de CSV
                         zelf geen redenkolom heeft (GSC exporteert per reden)
     --totaal <n>        het GEZAGHEBBENDE totaal voor deze reden, overgenomen
                         uit de kolom Pagina's van het overzichtsblad
     --voeg-toe          voeg samen met wat er al in gsc_inventaris staat
     --uit <pad>         ander doelbestand (standaard data/seo/historische-urls.json)
     --droog             lees en rapporteer, schrijf niets

   WAAROM DIT BESTAAT

   Google rapporteert 7.728 niet-gevonden URL's. Die lijst bestaat NERGENS
   buiten een Search Console-export: er zijn geen GSC-credentials (gemeten op
   13 oktober 2026, lokaal noch op de vier Railway-services), het Wayback-
   archief kent voor het hele domein maar 169 URL's op de hoofdhost, en de
   git-historie bevat geen verloren URL's — alle 318 ooit verwijderde html- en
   xml-paden bestaan vandaag weer. De enige reproduceerbare weg is dus: de
   eigenaar exporteert, dit script normaliseert.

   HEADERGESTUURD EN WEIGEREND BIJ TWIJFEL

   De exacte kolomnamen van een GSC-export zijn INFERRED. Niemand in dit
   project heeft een echte export gezien, dus staat hieronder geen gemeten
   kopregel maar een lijst namen die we herkennen, in de Nederlandse en de
   Engelse interface. Herkent het script de kopregel niet, dan WEIGERT het en
   drukt het de gevonden kopregel letterlijk af. Raden zou hier het ergste
   zijn wat er kan gebeuren: een stil verkeerd ingelezen kolom levert
   duizenden URL's met de verkeerde reden, en daar wordt vervolgens beleid op
   gemaakt.

   ELKE TELLING UIT EEN IMPORT IS EEN ONDERGRENS

   Search Console exporteert maximaal 1.000 voorbeeld-URL's per reden. Daarom
   staat `afgekapt` op true tenzij de eigenaar met --totaal een gezaghebbend
   totaal meegeeft EN het aantal ingelezen rijen daaraan gelijk is. Het
   rapportcijfer is 7.728; een export levert er maximaal 1.000 per reden. Wie
   die twee getallen door elkaar haalt, denkt dat het probleem voor 13 procent
   in kaart is terwijl hij 87 procent niet gezien heeft.
   ============================================================================ */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const WORTEL = resolve(hier, '..', '..');
const STANDAARD_DOEL = resolve(WORTEL, 'data', 'seo', 'historische-urls.json');

/* De afkapgrens van Search Console. Staat hier als constante omdat hij in de
   uitvoer en in het datacontract hetzelfde moet zijn. */
export const GSC_AFKAPGRENS = 1000;

/* Wat er in de redenkolom staat als er geen indexeringsreden is. Geen lege
   cel: een leeg veld leest in elk rapport als nul of als onbekend, en dit is
   geen van beide. */
export const GEEN_REDEN = 'NIET VAN TOEPASSING (prestatie-export)';

/* ========================================================== NORMALISATIE ===
   EEN beleid, hier vastgelegd en door beide scripts gebruikt
   (scripts/seo/historische-urls.mjs importeert deze functie, zodat de
   importer en de classificator niet uit elkaar kunnen lopen).

     · http wordt https
     · vibeenergy.nl wordt www.vibeenergy.nl  (gemeten: de apex geeft 301)
     · fragment eraf                          (nooit deel van de serverrequest)
     · afsluitende streep eraf, behalve op de wortel
     · QUERYSTRING BLIJFT, inclusief parametervolgorde
     · het PAD gaat NIET naar kleine letters

   De querystring blijft omdat hij bij Shopify het onderscheidende deel is:
   /cdn/shop/files/green-city.png?v=1694261092&width=750 en dezelfde naam met
   width=360 zijn twee verschillende gearchiveerde URL's (gemeten, beide in de
   Wayback-inventaris). Wegstrepen zou de 113 gearchiveerde rijen onder
   /cdn/shop tot enkele tientallen samenvouwen en de afkapping erger maken dan
   hij al is.

   Het pad blijft hoofdlettergevoelig omdat de host dat ook is: GEMETEN geeft
   /X 404 en /x 200. Naar kleine letters omzetten verandert een bestaande URL
   in een niet-bestaande. Alleen de hostnaam gaat naar kleine letters, want
   DNS is wel hoofdletterongevoelig.

   De RUWE URL blijft altijd bewaard. Zonder de ruwe vorm is niet meer te zien
   of Google de slash- of de .html-variant rapporteerde, en juist dat verschil
   bepaalt de actie: GEMETEN geeft /x/ een 404 terwijl /x 200 geeft, en /x.html
   geeft 200 met een canonical naar /x. */
export const HOOFDHOST = 'www.vibeenergy.nl';
export const APEX = 'vibeenergy.nl';

export function normaliseerUrl(ruw) {
  const tekst = String(ruw ?? '').trim().replace(/^["']|["']$/g, '');
  if (!tekst) return { ok: false, fout: 'leeg veld' };

  /* EEN URL IS EEN ABSOLUTE URL OF EEN PAD DAT MET / BEGINT — anders niets.
     Dit is de les uit een eigen proef: het overzichtsblad van de
     indexeringsrapportage heeft een kolom Pagina's met een TELLING erin, en
     die kolomnaam staat ook in de lijst met URL-namen. Zonder deze eis werd
     de telling 7728 netjes "genormaliseerd" naar
     https://www.vibeenergy.nl/7728 en belandde er een verzonnen URL in het
     datacontract. Iets wat niet met http(s):// of met / begint, is geen URL
     en wordt geweigerd in plaats van gerepareerd. */
  if (!/^https?:\/\//i.test(tekst) && !tekst.startsWith('/')) {
    return { ok: false, fout: `geen URL en geen pad (begint niet met http(s):// of /): ${tekst}` };
  }

  let u;
  try {
    u = new URL(tekst.startsWith('http://') || tekst.startsWith('https://') ? tekst : `https://${HOOFDHOST}${tekst.startsWith('/') ? '' : '/'}${tekst}`);
  } catch {
    return { ok: false, fout: `niet te ontleden als URL: ${tekst}` };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, fout: `protocol ${u.protocol} wordt niet ondersteund: ${tekst}` };
  }

  u.protocol = 'https:';
  u.hash = '';
  const host = u.hostname.toLowerCase();
  u.hostname = host === APEX ? HOOFDHOST : host;

  const padRuw = u.pathname;
  const eindigdeOpStreep = padRuw.length > 1 && padRuw.endsWith('/');

  /* DE SLEUTEL IS DE GERAPPORTEERDE VORM, DE URL DE CANONIEKE.
     /contact/ en /contact zijn na normalisatie dezelfde URL maar het zijn
     twee verschillende requests met twee verschillende GEMETEN antwoorden:
     404 en 200. Op de genormaliseerde vorm sleutelen voegde ze samen, en dan
     erfde de bestaande pagina de slash-beoordeling. Daarom twee velden:
     `sleutel` houdt schuine streep en .html vast (alleen schema, host en
     fragment zijn gelijkgetrokken), `url` is de canonieke vorm. */
  const sleutel = u.toString();
  if (eindigdeOpStreep) u.pathname = padRuw.replace(/\/+$/, '');

  return {
    ok: true,
    url: u.toString(),
    sleutel,
    ruwe_url: tekst,
    pad: u.pathname,
    query: u.search || '',
    host: u.hostname,
    buiten_hoofdhost: u.hostname !== HOOFDHOST,
    had_afsluitende_streep: eindigdeOpStreep,
    had_html_extensie: /\.html?$/i.test(u.pathname),
  };
}

/* ============================================================ CSV LEZEN ===
   Eigen parser in plaats van split(','): een GSC-export kan URL's met een
   komma in de query bevatten en een reden met een komma in de tekst. Een
   split zou die rijen stil verschuiven. Deze parser volgt RFC 4180:
   dubbele aanhalingstekens omsluiten een veld, twee achter elkaar zijn een
   letterlijk aanhalingsteken, en een scheidingsteken binnen aanhalingstekens
   is gewoon tekst. */
export function leesCsv(tekst, scheiding) {
  const rijen = [];
  let veld = '';
  let rij = [];
  let inQuote = false;
  for (let i = 0; i < tekst.length; i += 1) {
    const c = tekst[i];
    if (inQuote) {
      if (c === '"') {
        if (tekst[i + 1] === '"') { veld += '"'; i += 1; } else inQuote = false;
      } else veld += c;
      continue;
    }
    if (c === '"') { inQuote = true; continue; }
    if (c === scheiding) { rij.push(veld); veld = ''; continue; }
    if (c === '\n') { rij.push(veld); rijen.push(rij); rij = []; veld = ''; continue; }
    if (c === '\r') continue;
    veld += c;
  }
  if (veld !== '' || rij.length) { rij.push(veld); rijen.push(rij); }
  return rijen.filter((r) => r.some((v) => String(v).trim() !== ''));
}

/* Het scheidingsteken wordt GEMETEN op de kopregel en niet aangenomen: een
   CSV uit Google is kommagescheiden, maar een bestand dat door Excel met een
   Nederlandse landinstelling is heropgeslagen gebruikt een puntkomma. Tab
   komt voor als de eigenaar uit Google Spreadsheets kopieert. */
export function kiesScheiding(kopregel) {
  const buitenQuotes = kopregel.replace(/"[^"]*"/g, '');
  const kandidaten = [',', ';', '\t', '|'];
  let beste = ',';
  let max = -1;
  for (const k of kandidaten) {
    const n = buitenQuotes.split(k).length - 1;
    if (n > max) { max = n; beste = k; }
  }
  return { scheiding: beste, kolommen: max + 1 };
}

/* ============================================================= PROFIELEN ===
   Een profiel is een kopregel die we HERKENNEN. De namen hieronder zijn
   INFERRED, niet gemeten: ze dekken de Nederlandse en de Engelse interface en
   een paar vormen die Excel of Spreadsheets ervan maakt. Staat een naam er
   niet bij, dan weigert het script met de gevonden kopregel erbij — dan is
   deze lijst te smal en moet hij worden uitgebreid, niet omzeild. */
const KOP = {
  url: ['url', 'urls', "url's", 'volledige url', 'page', 'pages', 'pagina', "pagina's", 'bovenste pagina\'s', 'bovenste paginas', 'top pages', 'belangrijkste pagina\'s', 'meest voorkomende pagina\'s', 'adres', 'address', 'landingspagina', 'landing page'],
  laatst_gecrawld: ['last crawled', 'laatst gecrawld', 'laatst gecrawled', 'laatste crawl', 'datum laatste crawl', 'last crawl date'],
  reden: ['reason', 'reden', 'type', 'issue', 'probleem'],
  staat: ['status', 'staat', 'validation', 'validatie', 'verificatie', 'indexeringsstatus', 'indexing status'],
  klikken: ['clicks', 'klikken', 'aantal klikken'],
  vertoningen: ['impressions', 'vertoningen', 'weergaven', 'aantal vertoningen'],
  ctr: ['ctr', 'klikfrequentie', 'doorklikratio', 'click through rate', 'clickthrough rate', 'gemiddelde ctr', 'average ctr'],
  positie: ['position', 'positie', 'average position', 'gemiddelde positie', 'gem. positie'],
  paginas_telling: ['pages', "pagina's", 'paginas', 'aantal paginas', "aantal pagina's"],
  bron: ['source', 'bron'],
  trend: ['trend'],
};

/* De volgorde is betekenisvol: het overzichtsblad staat VOORAAN omdat zijn
   kolom Pagina's ook in de lijst met URL-namen staat (de Prestaties-export
   noemt de URL-kolom zo). Zonder die voorrang werd het overzichtsblad als een
   URL-lijst gelezen en werd de telling per reden als URL ingelezen. Dat is in
   een eigen proef gebeurd; daarom staat hij hier eerst en daarom weigert
   normaliseerUrl() alles wat niet met http(s):// of / begint. */
const PROFIELEN = [
  {
    naam: 'pagina-indexering-overzicht',
    omschrijving: "Pagina-indexering, OVERZICHTSBLAD: een telling per reden, zonder URL's.",
    bruikbaar: false,
    nodig: ['reden', 'paginas_telling'],
    minstens_een_van: ['trend', 'bron'],
    verboden: ['laatst_gecrawld', 'klikken', 'vertoningen'],
    weigering:
      "Dit is het overzichtsblad met een telling per reden en het bevat geen URL's. Open in Search Console de reden zelf (klik op de rij), en gebruik de exportknop in het detailvenster dat dan opengaat. Het getal uit de kolom Pagina's van DIT blad is wel bruikbaar: geef het bij de import van die reden mee als --totaal <n>, dan weet het rapport hoe groot de afkapping is.",
  },
  {
    naam: 'pagina-indexering',
    omschrijving: 'Pagina-indexering, detailvenster per reden: een URL-lijst met de laatste crawldatum.',
    bruikbaar: true,
    nodig: ['url'],
    minstens_een_van: ['laatst_gecrawld', 'reden', 'staat'],
    verboden: ['klikken', 'vertoningen'],
  },
  {
    naam: 'prestaties',
    omschrijving: 'Prestaties, tabblad Pagina\'s: URL met klikken, vertoningen, CTR en positie.',
    bruikbaar: true,
    nodig: ['url', 'klikken', 'vertoningen'],
    minstens_een_van: [],
    verboden: [],
  },
];

function normaliseerKop(s) {
  return String(s ?? '')
    .replace(/^﻿/, '')
    .replace(/^["']|["']$/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[‘’ʼ]/g, "'");
}

/** Welke logische velden zitten in deze kopregel, en in welke kolom? */
export function duidKopregel(kopcellen) {
  const kolomVan = {};
  kopcellen.forEach((cel, i) => {
    const n = normaliseerKop(cel);
    if (!n) return;
    for (const [veld, namen] of Object.entries(KOP)) {
      if (namen.includes(n) && kolomVan[veld] === undefined) kolomVan[veld] = i;
    }
  });
  return kolomVan;
}

export function kiesProfiel(kolomVan) {
  for (const p of PROFIELEN) {
    const heeftNodig = p.nodig.every((v) => kolomVan[v] !== undefined);
    const heeftEen = p.minstens_een_van.length === 0 || p.minstens_een_van.some((v) => kolomVan[v] !== undefined);
    const geenVerbodene = (p.verboden || []).every((v) => kolomVan[v] === undefined);
    if (heeftNodig && heeftEen && geenVerbodene) return p;
  }
  return null;
}

/* ======================================================== GETALLEN LEZEN ===
   Een Nederlandse export schrijft 1.234 waar een Engelse 1,234 schrijft, en
   12,4 waar de Engelse 12.4 schrijft. Voor een geheel getal mogen alle punten
   en komma's weg; voor een kommagetal is het LAATSTE scheidingsteken de
   decimaal. Zo leest 1.234,5 en 1,234.5 beide als 1234,5. */
export function geheelGetal(ruw) {
  const s = String(ruw ?? '').replace(/[\s  ']/g, '');
  if (s === '' || s === '-') return null;
  const n = Number.parseInt(s.replace(/[.,]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function kommaGetal(ruw) {
  let s = String(ruw ?? '').replace(/[\s  ']/g, '');
  if (s === '' || s === '-') return null;
  const procent = s.includes('%');
  s = s.replace('%', '');
  const laatstePunt = s.lastIndexOf('.');
  const laatsteKomma = s.lastIndexOf(',');
  const decimaalOp = Math.max(laatstePunt, laatsteKomma);
  if (decimaalOp >= 0) {
    s = `${s.slice(0, decimaalOp).replace(/[.,]/g, '')}.${s.slice(decimaalOp + 1)}`;
  }
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return procent ? n / 100 : n;
}

/* ================================================================ IMPORT === */
export function leesExport(pad, { reden = null } = {}) {
  const ruw = readFileSync(pad);
  if (ruw.length >= 2 && ruw[0] === 0x50 && ruw[1] === 0x4b) {
    return {
      ok: false,
      bestand: pad,
      weigering:
        'Dit is een ZIP-bestand. De Prestaties-export van Search Console is een ZIP met meerdere CSV\'s erin. Pak hem uit en geef het CSV-bestand mee dat de pagina\'s bevat (meestal Pages.csv of Pagina\'s.csv).',
    };
  }
  const tekst = ruw.toString('utf8').replace(/^﻿/, '');
  if (!tekst.trim()) return { ok: false, bestand: pad, weigering: 'Het bestand is leeg.' };

  const eersteRegel = tekst.split('\n', 1)[0];
  const { scheiding } = kiesScheiding(eersteRegel);
  const rijen = leesCsv(tekst, scheiding);
  if (!rijen.length) return { ok: false, bestand: pad, weigering: 'Geen leesbare rijen gevonden.' };

  const kopcellen = rijen[0];
  const kolomVan = duidKopregel(kopcellen);
  const profiel = kiesProfiel(kolomVan);

  if (!profiel) {
    return {
      ok: false,
      bestand: pad,
      kopregel: kopcellen.join(scheiding === '\t' ? ' | ' : scheiding),
      weigering: 'De kopregel is niet herkend. Zie hieronder wat er stond en wat dit script wel herkent.',
      onbekende_kop: true,
    };
  }
  if (!profiel.bruikbaar) {
    return { ok: false, bestand: pad, profiel: profiel.naam, kopregel: kopcellen.join(scheiding), weigering: profiel.weigering };
  }

  const urls = [];
  const geweigerd = [];
  const gezien = new Map();
  for (let i = 1; i < rijen.length; i += 1) {
    const r = rijen[i];
    const cel = (veld) => (kolomVan[veld] === undefined ? null : (r[kolomVan[veld]] ?? null));
    const n = normaliseerUrl(cel('url'));
    if (!n.ok) {
      geweigerd.push({ regel: i + 1, bestand: basename(pad), ruw: cel('url'), fout: n.fout });
      continue;
    }
    /* --reden geldt ALLEEN voor een indexeringsexport. Een prestatierij heeft
       geen indexeringsreden; die met --reden toch een reden geven zou een
       verzonnen feit zijn, en bij het samenvoegen zou die reden vervolgens aan
       een bestaande pagina blijven hangen. */
    const rijReden = (cel('reden') || '').trim()
      || (profiel.naam === 'pagina-indexering' ? reden : null)
      || (profiel.naam === 'prestaties' ? GEEN_REDEN : 'ONBEKEND');
    const rij = {
      url: n.url,
      ruwe_url: n.ruwe_url,
      pad: n.pad,
      query: n.query,
      buiten_hoofdhost: n.buiten_hoofdhost,
      had_afsluitende_streep: n.had_afsluitende_streep,
      had_html_extensie: n.had_html_extensie,
      reden: rijReden,
      staat: (cel('staat') || '').trim() || 'ONBEKEND',
      laatst_gecrawld: (cel('laatst_gecrawld') || '').trim() || 'ONBEKEND',
      klikken: kolomVan.klikken === undefined ? null : geheelGetal(cel('klikken')),
      vertoningen: kolomVan.vertoningen === undefined ? null : geheelGetal(cel('vertoningen')),
      ctr: kolomVan.ctr === undefined ? null : kommaGetal(cel('ctr')),
      positie: kolomVan.positie === undefined ? null : kommaGetal(cel('positie')),
      bronbestand: basename(pad),
      bronprofiel: profiel.naam,
    };
    /* Dubbele URL's binnen een export zijn geen fout maar wel een feit dat
       geteld moet worden: ze maken het verschil tussen "1.000 rijen" en
       "1.000 verschillende URL's". */
    if (gezien.has(n.url)) {
      gezien.set(n.url, gezien.get(n.url) + 1);
      continue;
    }
    gezien.set(n.url, 1);
    urls.push(rij);
  }

  /* DERDE SLOT: de uitkomst moet zelf kloppen, niet alleen de kopregel.
     Levert de kolom die wij voor de URL-kolom hielden meer onleesbare dan
     leesbare waarden, dan hielden wij hem voor het verkeerde ding. Dan is
     weigeren beter dan de helft inlezen: een halve inventaris ziet er in het
     rapport uit als een volledige. */
  if (!urls.length || geweigerd.length > urls.length) {
    return {
      ok: false,
      bestand: pad,
      profiel: profiel.naam,
      kopregel: kopcellen.join(' | '),
      weigering: `De kolom "${kopcellen[kolomVan.url]}" is als URL-kolom gelezen, maar leverde ${urls.length} leesbare en ${geweigerd.length} onleesbare waarden op${geweigerd.length ? ` (eerste: ${geweigerd[0].fout})` : ''}. Dat is geen URL-kolom. Controleer of dit het detailvenster per reden is en niet het overzichtsblad, en of de juiste kolom is geëxporteerd.`,
    };
  }

  return {
    ok: true,
    bestand: pad,
    profiel: profiel.naam,
    scheiding: scheiding === '\t' ? 'tab' : scheiding,
    kopregel: kopcellen.join(' | '),
    gevonden_kolommen: Object.fromEntries(Object.entries(kolomVan).map(([k, v]) => [k, kopcellen[v]])),
    rijen_in_bestand: rijen.length - 1,
    urls,
    dubbel: rijen.length - 1 - urls.length - geweigerd.length,
    geweigerd,
    reden_meegegeven: reden,
  };
}

/* ================================================================== CLI === */
function argumenten(argv) {
  const uit = { bestanden: [], reden: null, totaal: null, voegToe: false, doel: STANDAARD_DOEL, droog: false, hulp: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') uit.hulp = true;
    else if (a === '--reden') uit.reden = argv[++i] ?? null;
    else if (a === '--totaal') uit.totaal = geheelGetal(argv[++i]);
    else if (a === '--voeg-toe') uit.voegToe = true;
    else if (a === '--droog') uit.droog = true;
    else if (a === '--uit') uit.doel = resolve(process.cwd(), argv[++i] ?? '');
    else if (a.startsWith('--')) uit.onbekendeOptie = a;
    else uit.bestanden.push(resolve(process.cwd(), a));
  }
  return uit;
}

function hulp() {
  console.log(`IMPORTER VOOR SEARCH CONSOLE-EXPORTS

  node scripts/seo/gsc-import.mjs <export.csv> [meer.csv ...] [opties]

  --reden "<tekst>"  reden waaronder deze export is gemaakt (als de CSV zelf
                     geen redenkolom heeft; GSC exporteert per reden)
  --totaal <n>       gezaghebbend totaal voor deze reden, uit de kolom
                     Pagina's van het overzichtsblad
  --voeg-toe         samenvoegen met wat er al in gsc_inventaris staat
  --uit <pad>        ander doelbestand (standaard data/seo/historische-urls.json)
  --droog            lezen en rapporteren, niets schrijven

HERKENDE EXPORTS`);
  for (const p of PROFIELEN) {
    console.log(`\n  ${p.naam}${p.bruikbaar ? '' : '  (herkend maar NIET bruikbaar)'}`);
    console.log(`    ${p.omschrijving}`);
    console.log(`    nodig: ${p.nodig.join(', ')}${p.minstens_een_van.length ? ` + minstens een van: ${p.minstens_een_van.join(', ')}` : ''}`);
  }
  console.log('\nHERKENDE KOLOMNAMEN (Nederlands en Engels, INFERRED — niet gemeten)');
  for (const [veld, namen] of Object.entries(KOP)) console.log(`  ${veld.padEnd(18)} ${namen.join(' · ')}`);
  console.log('\nZie docs/seo-historische-urls.md voor hoe je de export maakt.');
}

function main() {
  const opt = argumenten(process.argv.slice(2));
  if (opt.hulp || !opt.bestanden.length) { hulp(); process.exit(opt.hulp ? 0 : 2); }
  if (opt.onbekendeOptie) { console.error(`onbekende optie: ${opt.onbekendeOptie}`); hulp(); process.exit(2); }

  for (const b of opt.bestanden) {
    if (!existsSync(b)) { console.error(`bestaat niet: ${b}`); process.exit(2); }
  }
  if (!existsSync(opt.doel)) {
    console.error(`FATAAL — het doelbestand bestaat niet: ${opt.doel}`);
    console.error('Dit script vult alleen de sleutel gsc_inventaris in een bestaand datacontract; het maakt er geen.');
    process.exit(2);
  }

  const uitkomsten = opt.bestanden.map((b) => leesExport(b, { reden: opt.reden }));
  const geweigerdeBestanden = uitkomsten.filter((u) => !u.ok);

  console.log('='.repeat(78));
  console.log('IMPORT VAN SEARCH CONSOLE-EXPORTS');
  console.log('='.repeat(78));

  for (const u of geweigerdeBestanden) {
    console.error(`\nGEWEIGERD  ${u.bestand}`);
    console.error(`  ${u.weigering}`);
    if (u.kopregel !== undefined) console.error(`  gevonden kopregel: ${u.kopregel}`);
    if (u.onbekende_kop) {
      console.error('\n  Dit script herkent deze exports:');
      for (const p of PROFIELEN) {
        console.error(`    · ${p.naam}${p.bruikbaar ? '' : ' (herkend, niet bruikbaar)'} — ${p.omschrijving}`);
        console.error(`      nodig: ${p.nodig.join(', ')}${p.minstens_een_van.length ? `; minstens een van: ${p.minstens_een_van.join(', ')}` : ''}`);
      }
      console.error('\n  Herkende kolomnamen:');
      for (const [veld, namen] of Object.entries(KOP)) console.error(`    ${veld.padEnd(18)} ${namen.join(' · ')}`);
      console.error('\n  Er wordt NIET geraden. Klopt de kopregel wel en staat de naam er niet bij,');
      console.error('  vul dan de lijst KOP in scripts/seo/gsc-import.mjs aan met de echte naam.');
    }
  }
  if (geweigerdeBestanden.length) {
    console.error(`\n${geweigerdeBestanden.length} van de ${opt.bestanden.length} bestand(en) geweigerd. Er is niets geschreven.`);
    process.exit(2);
  }

  /* Samenvoegen. Dedupliceren gaat op de GENORMALISEERDE URL; de eerste
     vermelding wint en latere redenen worden erbij geschreven, zodat een URL
     die onder twee redenen is geëxporteerd niet twee rijen oplevert maar wel
     beide redenen laat zien. */
  const doel = JSON.parse(readFileSync(opt.doel, 'utf8'));
  const bestaand = opt.voegToe && Array.isArray(doel.gsc_inventaris?.urls) ? doel.gsc_inventaris.urls : [];
  const perUrl = new Map(bestaand.map((r) => [r.url, r]));
  let nieuw = 0;
  let samengevoegd = 0;
  for (const u of uitkomsten) {
    for (const r of u.urls) {
      const eerder = perUrl.get(r.url);
      if (!eerder) { perUrl.set(r.url, r); nieuw += 1; continue; }
      samengevoegd += 1;
      const redenen = new Set([...String(eerder.reden).split(' + '), r.reden].filter((x) => x && x !== 'ONBEKEND' && x !== GEEN_REDEN));
      eerder.reden = redenen.size ? [...redenen].sort().join(' + ') : (eerder.reden === GEEN_REDEN || r.reden === GEEN_REDEN ? GEEN_REDEN : 'ONBEKEND');
      for (const veld of ['klikken', 'vertoningen', 'ctr', 'positie']) {
        if (eerder[veld] === null && r[veld] !== null) eerder[veld] = r[veld];
      }
      if (eerder.laatst_gecrawld === 'ONBEKEND' && r.laatst_gecrawld !== 'ONBEKEND') eerder.laatst_gecrawld = r.laatst_gecrawld;
    }
  }
  const urls = [...perUrl.values()].sort((a, b) => a.url.localeCompare(b.url));

  const perReden = {};
  for (const r of urls) {
    const sleutel = r.reden || 'ONBEKEND';
    perReden[sleutel] = (perReden[sleutel] || 0) + 1;
  }

  /* AFGEKAPT IS DE STANDAARD. Hij gaat alleen uit als de eigenaar een
     gezaghebbend totaal meegaf EN wij precies zoveel rijen hebben. Zodra een
     enkele reden op de grens van 1.000 zit, is het geheel ook afgekapt. */
  const raaktGrens = Object.values(perReden).some((n) => n >= GSC_AFKAPGRENS);
  const afgekapt = raaktGrens || opt.totaal === null || urls.length < opt.totaal;
  const dekking = opt.totaal ? Math.round((urls.length / opt.totaal) * 1000) / 10 : null;

  const inventaris = {
    _status: 'GEIMPORTEERD',
    _toelichting:
      'Genormaliseerde Search Console-export, geschreven door scripts/seo/gsc-import.mjs. Niet met de hand wijzigen: een volgende import overschrijft deze sleutel. De rest van dit bestand blijft daarbij ongemoeid.',
    _ingelezen_op: new Date().toISOString().slice(0, 10),
    afgekapt,
    telling_label: afgekapt ? 'ONDERGRENS' : 'VOLLEDIG',
    reden_label: afgekapt
      ? `Search Console exporteert maximaal ${GSC_AFKAPGRENS} voorbeeld-URL's per reden. ${raaktGrens ? 'Minstens een reden raakt die grens, dus er zijn URL\'s die niet in de export staan. ' : ''}${opt.totaal === null ? 'Er is geen gezaghebbend totaal meegegeven (--totaal), dus is niet vast te stellen hoe groot het deel is dat ontbreekt. ' : `Gezaghebbend totaal ${opt.totaal}, ingelezen ${urls.length}. `}Elke telling uit deze inventaris is daarom een ONDERGRENS.`
      : `Het aantal ingelezen URL's (${urls.length}) is gelijk aan het gezaghebbende totaal (${opt.totaal}) en geen enkele reden raakt de afkapgrens van ${GSC_AFKAPGRENS}. Deze inventaris is volledig voor de meegegeven redenen.`,
    gezaghebbend_totaal: opt.totaal,
    dekking_procent: dekking,
    aantal_urls: urls.length,
    per_reden: perReden,
    ingelezen: uitkomsten.map((u) => ({
      bestand: basename(u.bestand),
      profiel: u.profiel,
      scheidingsteken: u.scheiding,
      kopregel: u.kopregel,
      gevonden_kolommen: u.gevonden_kolommen,
      rijen_in_bestand: u.rijen_in_bestand,
      geaccepteerd: u.urls.length,
      dubbel: u.dubbel,
      geweigerde_rijen: u.geweigerd.length,
      reden_meegegeven: u.reden_meegegeven,
      raakt_afkapgrens: u.urls.length >= GSC_AFKAPGRENS,
    })),
    urls,
    geweigerde_rijen: uitkomsten.flatMap((u) => u.geweigerd),
  };

  for (const u of uitkomsten) {
    console.log(`\nINGELEZEN  ${basename(u.bestand)}`);
    console.log(`  profiel            ${u.profiel}`);
    console.log(`  scheidingsteken    ${u.scheiding}`);
    console.log(`  kopregel           ${u.kopregel}`);
    console.log('  kolomtoewijzing');
    for (const [veld, naam] of Object.entries(u.gevonden_kolommen)) console.log(`    ${veld.padEnd(18)} <- "${naam}"`);
    console.log(`  rijen              ${u.rijen_in_bestand} in het bestand · ${u.urls.length} unieke URL's · ${u.dubbel} dubbel · ${u.geweigerd.length} onleesbaar`);
    if (u.urls.length >= GSC_AFKAPGRENS) console.log(`  LET OP             ${u.urls.length} rijen raakt de afkapgrens van ${GSC_AFKAPGRENS}; deze export is afgekapt`);
    for (const g of u.geweigerd.slice(0, 5)) console.log(`    regel ${g.regel}: ${g.fout}`);
    if (u.geweigerd.length > 5) console.log(`    ... en nog ${u.geweigerd.length - 5} onleesbare regels`);
  }

  console.log(`\n${'-'.repeat(78)}`);
  console.log(`inventaris         ${urls.length} unieke URL's${opt.voegToe ? ` (${nieuw} nieuw, ${samengevoegd} samengevoegd met bestaande)` : ''}`);
  console.log(`afgekapt           ${afgekapt ? 'JA' : 'NEE'} · label ${inventaris.telling_label}`);
  console.log(`                   ${inventaris.reden_label}`);
  if (dekking !== null) console.log(`dekking            ${dekking}% van het gezaghebbende totaal ${opt.totaal} — ONDERGRENS`);
  console.log('per reden');
  for (const [r, n] of Object.entries(perReden).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(6)}  ${r}${n >= GSC_AFKAPGRENS ? '   << op de afkapgrens' : ''}`);
  }
  const buiten = urls.filter((r) => r.buiten_hoofdhost).length;
  if (buiten) console.log(`\n${buiten} URL('s) staan op een andere host dan ${HOOFDHOST}; de classificator zet die op REQUIRES_REVIEW.`);

  if (opt.droog) {
    console.log('\n--droog: er is niets geschreven.');
    process.exit(0);
  }

  doel.gsc_inventaris = inventaris;
  writeFileSync(opt.doel, `${JSON.stringify(doel, null, 2)}\n`);
  console.log(`\ngeschreven naar ${opt.doel} (alleen de sleutel gsc_inventaris)`);
  console.log("draai nu: node scripts/seo/historische-urls.mjs   voor het inventarisrapport");
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
