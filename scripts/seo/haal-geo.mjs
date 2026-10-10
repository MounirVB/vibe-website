/* ============================================================================
   VIBE ENERGY — GEOGRAFISCHE BRONDATA OPHALEN
   ----------------------------------------------------------------------------
   Schrijft data/geo/ uit één officiële bron: PDOK Locatieserver, die de
   Bestuurlijke Grenzen van BZK ontsluit. Dat register draagt de CBS-
   gemeentecode, en die is hier de enige sleutel.

   Waarom niet op naam koppelen — gemeten op 10 oktober 2026:
     · "Velp" bestaat twee keer: gemeente Rheden (0275) en Land van Cuijk (1982).
     · "Hengelo" bestaat twee keer: Hengelo (O) (0164) en Hengelo (Gld), dat in
       de gemeente Bronckhorst (1876) ligt.
     · "Heelsum" is geen gemeente maar een dorp in Renkum (0274).
     · "Bergen" is twee gemeenten: 0373 (NH) en 0893 (L).
   Een koppeling op naam zou dus stil het verkeerde gebied aanwijzen.

   Draaien:  node scripts/seo/haal-geo.mjs
   Netwerk:  verplicht. Zonder netwerk faalt het script en blijft data/geo staan.
   ============================================================================ */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');
const uit = resolve(wortel, 'data', 'geo');

const BASIS = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1';
const BRON_NAAM = 'PDOK Locatieserver v3_1 (bron: BZK Bestuurlijke Grenzen)';
const PAGINA = 100; // harde bovengrens van de API; meer geeft HTTP 400

const OPHAALDATUM = process.env.GEO_OPHAALDATUM || new Date().toISOString().slice(0, 10);

const OVER = JSON.parse(readFileSync(resolve(hier, 'geo-overschrijvingen.json'), 'utf8'));

async function json(url) {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} op ${url}`);
  return r.json();
}

export function slugify(naam) {
  return String(naam)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function puntNaarLatLon(wkt) {
  const m = String(wkt || '').match(/POINT\(([-0-9.]+)\s+([-0-9.]+)\)/);
  if (!m) return null;
  return { lon: Number(m[1]), lat: Number(m[2]) };
}

/* ------------------------------------------------------------- gemeenten */
async function haalGemeenten() {
  const fl = 'gemeentecode,gemeentenaam,provinciecode,provincienaam,provincieafkorting,centroide_ll';
  const op = new Map();
  let start = 0;
  let totaal = null;
  for (;;) {
    const d = await json(`${BASIS}/free?q=*&fq=type:gemeente&rows=${PAGINA}&start=${start}&fl=${fl}&wt=json`);
    if (totaal === null) totaal = d.response.numFound;
    for (const g of d.response.docs) if (g.gemeentecode) op.set(g.gemeentecode, g);
    if (d.response.docs.length === 0) break;
    start += PAGINA;
    if (op.size >= totaal) break;
    if (start > 2000) throw new Error('paginering liep door; de bron gedraagt zich anders dan verwacht');
  }
  if (op.size !== totaal) throw new Error(`bron meldt ${totaal} gemeenten maar leverde ${op.size} unieke codes`);
  return { totaal, docs: [...op.values()] };
}

/* ---------------------------------------------------- woonplaatsresolutie
   Zet een plaatsnaam uit de projectdata om naar de gemeente waarin hij ligt.
   Met een adreshint wordt op een BAG-adres gezocht; dat is eenduidig. Zonder
   hint wordt op woonplaats gezocht en moet de naam exact matchen, anders
   sleept de fuzzy zoekmachine buurdorpen mee.
   Blijven er twee gemeenten over, dan is het resultaat AMBIGU en wordt er
   niets gekoppeld. Een gok is hier erger dan een gat. */
function exacteNaam(weergavenaam, plaats) {
  const eerste = String(weergavenaam).split(',')[0].trim();
  return slugify(eerste) === slugify(plaats);
}

async function resolveerPlaats(plaats, hint) {
  const vraag = hint ? `${hint} ${plaats}` : plaats;
  const fq = hint ? 'type:adres' : 'type:woonplaats';
  const fl = 'type,weergavenaam,gemeentecode,gemeentenaam,provincienaam';
  const bronUrl = `${BASIS}/free?q=${encodeURIComponent(vraag)}&fq=${fq}&rows=10&fl=${fl}&wt=json`;
  const d = await json(bronUrl);

  let docs = d.response.docs.filter((x) => x.gemeentecode);
  if (!hint) docs = docs.filter((x) => exacteNaam(x.weergavenaam, plaats));

  if (docs.length === 0) return { plaats, hint: hint || null, status: 'NIET_GEVONDEN', bron: BRON_NAAM, bron_url: bronUrl };

  const codes = [...new Set(docs.map((x) => x.gemeentecode))];
  if (codes.length > 1) {
    return {
      plaats,
      hint: hint || null,
      status: 'AMBIGU',
      kandidaten: codes.map((c) => {
        const d0 = docs.find((x) => x.gemeentecode === c);
        return { gemeentecode: c, gemeentenaam: d0.gemeentenaam, provincienaam: d0.provincienaam };
      }),
      bron: BRON_NAAM,
      bron_url: bronUrl,
    };
  }

  const t = docs[0];
  return {
    plaats,
    hint: hint || null,
    status: 'OPGELOST',
    gemeentecode: t.gemeentecode,
    gemeentenaam: t.gemeentenaam,
    provincienaam: t.provincienaam,
    treffer: t.weergavenaam,
    treffer_type: t.type,
    /* Vergelijk tegen de weergaveslug, niet tegen de registernaam: het register
       schrijft "Hengelo (O)" terwijl de plaats gewoon Hengelo heet. */
    plaats_is_gemeente:
      (OVER.gemeente_slug?.[t.gemeentecode]?.slug || slugify(t.gemeentenaam)) === slugify(plaats),
    bron: BRON_NAAM,
    bron_url: bronUrl,
    opgehaald: OPHAALDATUM,
  };
}

/* ------------------------------------------------------------------ main */
const { totaal, docs } = await haalGemeenten();

const provincieMap = new Map();
for (const g of docs) {
  if (!provincieMap.has(g.provinciecode)) {
    provincieMap.set(g.provinciecode, {
      provinciecode: g.provinciecode,
      naam: g.provincienaam,
      afkorting: g.provincieafkorting,
      slug: slugify(g.provincienaam),
      aliassen: OVER.provincie_alias?.[g.provinciecode] || [],
      aantal_gemeenten: 0,
    });
  }
  provincieMap.get(g.provinciecode).aantal_gemeenten += 1;
}
const provincies = [...provincieMap.values()].sort((a, b) => a.provinciecode.localeCompare(b.provinciecode));

const gemeenten = docs
  .map((g) => {
    const ov = OVER.gemeente_slug?.[g.gemeentecode];
    return {
      gemeentecode: g.gemeentecode,
      naam: ov?.weergave || g.gemeentenaam,
      naam_officieel: g.gemeentenaam,
      slug: ov?.slug || slugify(g.gemeentenaam),
      slug_afwijkt_reden: ov?.reden || null,
      aliassen: OVER.gemeente_alias?.[g.gemeentecode] || [],
      provinciecode: g.provinciecode,
      provincie: g.provincienaam,
      provincie_slug: slugify(g.provincienaam),
      centroide: puntNaarLatLon(g.centroide_ll),
    };
  })
  .sort((a, b) => a.gemeentecode.localeCompare(b.gemeentecode));

/* Slugbotsing binnen één provincie is fataal: twee gemeenten zouden dan op
   hetzelfde pad belanden en elkaars pagina overschrijven. */
const gezien = new Map();
const botsingen = [];
for (const g of gemeenten) {
  const pad = `${g.provincie_slug}/${g.slug}`;
  if (gezien.has(pad)) botsingen.push({ pad, codes: [gezien.get(pad), g.gemeentecode] });
  gezien.set(pad, g.gemeentecode);
}
if (botsingen.length) {
  console.error('FATAAL — slugbotsing binnen een provincie:');
  console.error(JSON.stringify(botsingen, null, 2));
  process.exit(1);
}

/* ------------------------------------------- projectplaatsen naar gemeente */
const projectBestand = resolve(wortel, 'scripts', 'projecten.json');
const HINTS = JSON.parse(readFileSync(resolve(hier, 'plaatshints.json'), 'utf8')).hints || {};
const resoluties = [];
if (existsSync(projectBestand)) {
  const pdata = JSON.parse(readFileSync(projectBestand, 'utf8'));
  const unieke = [...new Set(pdata.projecten.map((p) => p.plaats).filter(Boolean))].sort();
  for (const plaats of unieke) {
    const hint = HINTS[plaats] || null;
    try {
      resoluties.push(await resolveerPlaats(plaats, hint));
    } catch (e) {
      resoluties.push({ plaats, hint, status: 'FOUT', fout: String(e.message), bron: BRON_NAAM });
    }
  }
}

/* --------------------------------------------------------------- wegschrijven */
mkdirSync(uit, { recursive: true });

writeFileSync(
  resolve(uit, 'bron.json'),
  JSON.stringify(
    {
      _toelichting: 'Gegenereerd door scripts/seo/haal-geo.mjs. Niet met de hand bijwerken — draai het script opnieuw.',
      bron: BRON_NAAM,
      endpoint: `${BASIS}/free`,
      ophaaldatum: OPHAALDATUM,
      stabiele_sleutel: 'CBS-gemeentecode (vier tekens, met voorloopnul)',
      aantal_gemeenten: gemeenten.length,
      aantal_provincies: provincies.length,
      numfound_bij_ophalen: totaal,
      licentie: 'PDOK/BZK — open data, bronvermelding verplicht. Zie https://www.pdok.nl/',
      waarschuwing:
        'Het gemeenteregister verandert bij herindelingen, doorgaans per 1 januari. Draai dit script opnieuw voor elke release; de poort stelt het aantal dan opnieuw vast in plaats van het aan te nemen.',
    },
    null,
    2
  ) + '\n'
);

writeFileSync(resolve(uit, 'provincies.json'), JSON.stringify({ bron: BRON_NAAM, ophaaldatum: OPHAALDATUM, aantal: provincies.length, provincies }, null, 2) + '\n');
writeFileSync(resolve(uit, 'gemeenten.json'), JSON.stringify({ bron: BRON_NAAM, ophaaldatum: OPHAALDATUM, aantal: gemeenten.length, gemeenten }, null, 2) + '\n');
writeFileSync(
  resolve(uit, 'plaatsresolutie.json'),
  JSON.stringify(
    {
      _toelichting:
        'Plaatsnamen uit scripts/projecten.json, opgelost naar de gemeente waarin ze liggen. Een plaats is niet altijd een gemeente, en een plaatsnaam is niet altijd uniek.',
      bron: BRON_NAAM,
      ophaaldatum: OPHAALDATUM,
      resoluties,
    },
    null,
    2
  ) + '\n'
);

console.log(`provincies      : ${provincies.length}`);
console.log(`gemeenten       : ${gemeenten.length} (numFound ${totaal})`);
for (const p of provincies) console.log(`  ${p.provinciecode} ${p.naam.padEnd(16)} ${String(p.aantal_gemeenten).padStart(3)}`);
console.log(`plaatsresoluties: ${resoluties.length}`);
for (const r of resoluties) {
  const staart =
    r.status === 'OPGELOST'
      ? `-> ${r.gemeentecode} ${r.gemeentenaam}${r.plaats_is_gemeente ? '' : '   [plaats is geen gemeente]'}`
      : r.status === 'AMBIGU'
      ? `-> ${r.kandidaten.map((k) => k.gemeentecode + ' ' + k.gemeentenaam).join(' | ')}`
      : '';
  console.log(`  ${String(r.plaats).padEnd(14)} ${r.status.padEnd(14)} ${staart}`);
}
