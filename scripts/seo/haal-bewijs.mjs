/* ============================================================================
   VIBE ENERGY — REGIONAAL BEWIJS OPHALEN
   ----------------------------------------------------------------------------
   Vult data/bewijs/ met feiten die per gemeente echt verschillen en die uit
   een officiële bron komen. Elk feit krijgt een geografische scope, een
   stabiele sleutel, een bron-URL en een brondatum mee.

   DE BRONNEN, met de eigen aanroep gemeten op 10 oktober 2026:

   1 · CBS OData 81575NED — "Vestigingen van bedrijven; bedrijfstak, gemeente".
       Scope GEMEENTELIJK. Sleutel RegioS = 'GM' + CBS-gemeentecode.
       Gemeten: 483 GM-rijen voor 2026JJ00 bij bedrijfstak T001081 (alle
       bedrijfstakken), waarvan een deel null is — dat zijn opgeheven
       gemeenten die de tabel nog meeneemt. Alleen codes uit ons eigen
       register worden overgenomen.

   2 · IBIS Bedrijventerreinen — WFS op warmteatlas.nl (GeoServer, RVO).
       Scope BEDRIJVENTERREIN, met een gemeentesleutel per terrein.
       Gemeten: numberMatched = 3744.
       Drie valkuilen die in de data zitten en hier worden afgevangen:
         · 88 terreinen dragen GEM_CODES 'GM0000' — geen bruikbare sleutel.
           Die worden overgeslagen en geteld als 'zonder sleutel'.
         · PROV_NAMEN is inconsistent gespeld; wij gebruiken dat veld niet en
           leiden de provincie af uit ons eigen register via de gemeentecode.
         · De laag mengt peiljaar 2024 en 2022. Het jaar gaat per terrein mee,
           zodat een pagina nooit een peiljaar suggereert dat er niet is.

   3 · De eigen projecten uit scripts/projecten.json, gekoppeld aan een
       gemeentecode via data/geo/plaatsresolutie.json. Dit is het enige bewijs
       met hoge onderscheidende kracht: het geldt voor één gemeente en niet
       voor honderd.

   Draaien: node scripts/seo/haal-bewijs.mjs
   ============================================================================ */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');
const uit = resolve(wortel, 'data', 'bewijs');

const OPHAALDATUM = process.env.BEWIJS_OPHAALDATUM || new Date().toISOString().slice(0, 10);

const geo = JSON.parse(readFileSync(resolve(wortel, 'data', 'geo', 'gemeenten.json'), 'utf8'));
const register = new Map(geo.gemeenten.map((g) => [g.gemeentecode, g]));

/* ------------------------------------------------------------------- CBS */
const CBS_TABEL = '81575NED';
const CBS_PERIODE = process.env.CBS_PERIODE || '2026JJ00';
const CBS_BEDRIJFSTAK = 'T001081'; // alle bedrijfstakken
const CBS_URL =
  `https://datasets.cbs.nl/odata/v1/CBS/${CBS_TABEL}/Observations` +
  `?$filter=BedrijfstakkenBranchesSBI2008 eq '${CBS_BEDRIJFSTAK}'` +
  ` and Perioden eq '${CBS_PERIODE}' and startswith(RegioS,'GM')` +
  `&$select=RegioS,Value&$top=1000&$count=true`;

async function haalVestigingen() {
  const r = await fetch(CBS_URL, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`CBS ${CBS_TABEL}: HTTP ${r.status}`);
  const d = await r.json();
  const perGemeente = {};
  let buitenRegister = 0;
  let leeg = 0;
  for (const rij of d.value) {
    const code = String(rij.RegioS).replace(/^GM/, '');
    if (!register.has(code)) { buitenRegister += 1; continue; }
    if (rij.Value === null || rij.Value === undefined) { leeg += 1; continue; }
    perGemeente[code] = Math.round(Number(rij.Value));
  }
  return { perGemeente, rijen: d['@odata.count'], buitenRegister, leeg };
}

/* ------------------------------------------------------------------ IBIS */
const IBIS_VELDEN = 'RIN_NUMMER,JAAR,PLAN_NAAM,GEM_CODES,HA_BRUTO,HA_NETTO,HA_TOTTUIT,WLOC_TYPE';
const IBIS_URL =
  'https://www.warmteatlas.nl/geoserver/WarmteAtlas/wfs?service=WFS&version=2.0.0' +
  '&request=GetFeature&typeNames=WarmteAtlas:IBISbedrijventerreinen' +
  `&outputFormat=application/json&propertyName=${IBIS_VELDEN}`;

function getal(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function haalBedrijventerreinen() {
  const r = await fetch(IBIS_URL, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`IBIS WFS: HTTP ${r.status}`);
  const d = await r.json();
  const perGemeente = {};
  let zonderSleutel = 0;
  let buitenRegister = 0;
  const jaren = {};
  for (const f of d.features) {
    const p = f.properties || {};
    const ruw = String(p.GEM_CODES || '').trim();
    const code = ruw.replace(/^GM/, '');
    if (!ruw || ruw === 'GM0000' || code === '0000') { zonderSleutel += 1; continue; }
    if (!register.has(code)) { buitenRegister += 1; continue; }
    jaren[p.JAAR] = (jaren[p.JAAR] || 0) + 1;
    (perGemeente[code] ||= []).push({
      rin: p.RIN_NUMMER || null,
      naam: String(p.PLAN_NAAM || '').trim() || null,
      jaar: p.JAAR || null,
      ha_bruto: getal(p.HA_BRUTO),
      ha_netto: getal(p.HA_NETTO),
      ha_uitgeefbaar: getal(p.HA_TOTTUIT),
      type: p.WLOC_TYPE || null,
    });
  }
  /* Sorteer per gemeente op netto oppervlak: het grootste terrein eerst, want
     dat is het terrein dat een pagina als eerste wil noemen. */
  for (const code of Object.keys(perGemeente)) {
    perGemeente[code].sort((a, b) => (b.ha_netto ?? b.ha_bruto ?? 0) - (a.ha_netto ?? a.ha_bruto ?? 0));
  }
  return { perGemeente, features: d.features.length, zonderSleutel, buitenRegister, jaren };
}

/* ------------------------------------------------------- eigen projecten */
/* Welke oplossingsfamilies een project aantoont, afgeleid uit de componenten
   en metrieken die al op de projectpagina staan.

   TWEE REGELS DIE MET SCHADE ZIJN GELEERD — niet versoepelen.

   1 · ALLEEN DE TITEL EN HET LABEL, NIET DE LOOPTEKST.
       De begeleidende tekst van een component kan iets noemen wat Vibe níét
       heeft geleverd. Gemeten geval: Hedin Alkmaar schrijft "begrenst de
       teruglevering van de bestaande zonnepanelen". Dat gaat over panelen die
       er al lagen. Op de looptekst matchen leverde een zonne-project in
       Alkmaar op dat niet bestaat. De titel en het metrieklabel vormen samen
       de geleverde-assetlijst; die is wel betrouwbaar.

   2 · WOORDGRENZEN.
       Het patroon /ems/i matchte de merknaam "APsystems" in het
       Kwakkenbergflat-project en kende die locatie een EMS toe. Elke
       afkorting krijgt daarom \b-grenzen. */
const FAMILIE_TREFWOORD = {
  'zakelijke-batterij': [/batterij/i, /energieopslag/i, /\bopslag\b/i, /noodstroom/i],
  'zonnepanelen-bedrijven': [/zonnepane/i, /zonnedak/i, /\bkwp\b/i, /omvormer/i],
  'zakelijke-laadpalen': [/laadpunt/i, /laadplek/i, /laadpaal/i],
  laadplein: [/laadplein/i],
  ems: [/\bEMS\b/, /energiemanagementsysteem/i, /capaciteitsregie/i, /realtime sturing/i, /\bbalanceren\b/i, /gestuurde inzet/i],
  netcongestie: [/transportvermogen/i, /bestaande netaansluiting/i, /bestaande aansluiting/i],
  'verduurzaming-bedrijfspanden': [/energielabel/i, /labelstappen/i],
};

/* Zakelijk of residentieel. Een zonneproject op een wooncomplex bewijst dat
   Vibe in die gemeente heeft gewerkt, maar het bewijst GEEN zakelijke
   zonne-installatie. Een familiepagina voor bedrijven mag daar dus niet op
   leunen. De waarden komen letterlijk uit het veld `sector` in
   scripts/projecten.json. */
const SECTOR_SEGMENT = {
  'Commercieel vastgoed': 'zakelijk',
  Automotive: 'zakelijk',
  Recreatie: 'zakelijk',
  Bedrijfspand: 'zakelijk',
  Kantoorpand: 'zakelijk',
  Wooncomplex: 'residentieel',
  Woningportefeuille: 'residentieel',
};

function assetlijst(p) {
  const uit = [];
  for (const c of p.componenten || []) uit.push(typeof c === 'string' ? c : String(c.titel || ''));
  for (const m of p.metrics || []) {
    if (typeof m === 'string') uit.push(m);
    else uit.push(`${m.waarde || ''} ${m.label || ''}`);
  }
  return uit.filter(Boolean).join(' | ');
}

function familiesVanProject(p) {
  const tekst = assetlijst(p);
  const uit = [];
  for (const [fam, patronen] of Object.entries(FAMILIE_TREFWOORD)) {
    const re = patronen.find((x) => x.test(tekst));
    if (re) uit.push({ familie: fam, aanleiding: tekst.match(re)[0] });
  }
  return uit;
}

function projectBewijs() {
  const pdata = JSON.parse(readFileSync(resolve(wortel, 'scripts', 'projecten.json'), 'utf8'));
  const res = JSON.parse(readFileSync(resolve(wortel, 'data', 'geo', 'plaatsresolutie.json'), 'utf8'));
  const naarCode = new Map();
  for (const r of res.resoluties) if (r.status === 'OPGELOST') naarCode.set(r.plaats, r);

  const perGemeente = {};
  const ongekoppeld = [];
  const onbekendeSector = new Set();
  for (const p of pdata.projecten) {
    const r = naarCode.get(p.plaats);
    if (!r) { ongekoppeld.push({ slug: p.slug, plaats: p.plaats, reden: 'plaats niet eenduidig opgelost' }); continue; }
    const fams = familiesVanProject(p);
    const segment = SECTOR_SEGMENT[p.sector] || 'onbekend';
    if (segment === 'onbekend') onbekendeSector.add(p.sector || '(leeg)');
    (perGemeente[r.gemeentecode] ||= []).push({
      slug: p.slug,
      route: p.slug,
      titel: p.titel,
      plaats: p.plaats,
      plaats_is_gemeente: r.plaats_is_gemeente,
      sector: p.sector || null,
      segment,
      opgeleverd: p.opgeleverd || null,
      status: p.status || 'opgeleverd',
      /* families = de assets die dit project aantoont.
         families_zakelijk = dezelfde lijst, maar leeg als het project
         residentieel is. Alleen die lijst mag een zakelijke familiepagina
         rechtvaardigen. */
      families: fams.map((f) => f.familie),
      families_zakelijk: segment === 'zakelijk' ? fams.map((f) => f.familie) : [],
      familie_aanleiding: Object.fromEntries(fams.map((f) => [f.familie, f.aanleiding])),
      assetlijst: assetlijst(p),
    });
  }
  return { perGemeente, ongekoppeld, totaal: pdata.projecten.length, onbekendeSector: [...onbekendeSector] };
}

/* ------------------------------------------------------------------ main */
const vest = await haalVestigingen();
const ibis = await haalBedrijventerreinen();
const proj = projectBewijs();

mkdirSync(uit, { recursive: true });

writeFileSync(
  resolve(uit, 'vestigingen.json'),
  JSON.stringify(
    {
      _toelichting: 'Aantal vestigingen van bedrijven per gemeente. Scope GEMEENTELIJK.',
      bron: `CBS OData, tabel ${CBS_TABEL} "Vestigingen van bedrijven; bedrijfstak, gemeente"`,
      bron_url: CBS_URL,
      bron_datum: OPHAALDATUM,
      periode: CBS_PERIODE,
      bedrijfstak: `${CBS_BEDRIJFSTAK} (alle bedrijfstakken)`,
      licentie: 'CBS — CC BY 4.0',
      scope: 'GEMEENTELIJK',
      stabiele_sleutel: "CBS-gemeentecode (RegioS zonder 'GM')",
      rijen_in_bron: vest.rijen,
      overgeslagen_buiten_register: vest.buitenRegister,
      overgeslagen_zonder_waarde: vest.leeg,
      gemeenten_met_waarde: Object.keys(vest.perGemeente).length,
      per_gemeente: vest.perGemeente,
    },
    null,
    2
  ) + '\n'
);

writeFileSync(
  resolve(uit, 'bedrijventerreinen.json'),
  JSON.stringify(
    {
      _toelichting:
        'Bedrijventerreinen per gemeente uit IBIS. Scope BEDRIJVENTERREIN; de gemeentesleutel komt uit de bron zelf. Het peiljaar staat per terrein, omdat de laag 2024 en 2022 mengt.',
      bron: 'IBIS Bedrijventerreinen via WFS op warmteatlas.nl (GeoServer, aanbieder RVO)',
      bron_url: IBIS_URL,
      bron_datum: OPHAALDATUM,
      licentie:
        'De registratie op data.overheid.nl (ligging bedrijventerreinen, Interprovinciaal Overleg) vermeldt CC-0 1.0. Op het WFS-endpoint staat geen licentieverklaring.',
      scope: 'BEDRIJVENTERREIN',
      stabiele_sleutel: "CBS-gemeentecode (GEM_CODES zonder 'GM')",
      features_in_bron: ibis.features,
      overgeslagen_zonder_gemeentesleutel: ibis.zonderSleutel,
      overgeslagen_buiten_register: ibis.buitenRegister,
      peiljaren: ibis.jaren,
      gemeenten_met_terrein: Object.keys(ibis.perGemeente).length,
      per_gemeente: ibis.perGemeente,
    },
    null,
    2
  ) + '\n'
);

writeFileSync(
  resolve(uit, 'projecten-geo.json'),
  JSON.stringify(
    {
      _toelichting:
        'De eigen, al gepubliceerde projecten gekoppeld aan een gemeentecode. Dit is het bewijs met hoge onderscheidende kracht: het geldt voor één gemeente. De familietoewijzing is afgeleid uit de componenten en metrieken die al op de projectpagina staan — er wordt niets toegevoegd wat daar niet staat.',
      bron: 'scripts/projecten.json + data/geo/plaatsresolutie.json',
      bron_datum: OPHAALDATUM,
      scope: 'PROJECTLOCATIE',
      _segmentregel:
        'families_zakelijk is leeg bij een residentieel project. Een zonneproject op een wooncomplex bewijst lokale aanwezigheid, maar geen zakelijke zonne-installatie; een familiepagina voor bedrijven mag daar niet op leunen.',
      projecten_totaal: proj.totaal,
      gemeenten_met_project: Object.keys(proj.perGemeente).length,
      sectoren_zonder_segment: proj.onbekendeSector,
      ongekoppeld: proj.ongekoppeld,
      per_gemeente: proj.perGemeente,
    },
    null,
    2
  ) + '\n'
);

/* --------------------------------------------------------------- rapport */
console.log('=== CBS vestigingen ===');
console.log(`  rijen in bron        : ${vest.rijen}`);
console.log(`  buiten register      : ${vest.buitenRegister}`);
console.log(`  zonder waarde        : ${vest.leeg}`);
console.log(`  gemeenten met waarde : ${Object.keys(vest.perGemeente).length} van ${register.size}`);
const zonderVest = [...register.keys()].filter((c) => !(c in vest.perGemeente));
if (zonderVest.length) console.log(`  ZONDER waarde        : ${zonderVest.length} -> ${zonderVest.slice(0, 10).join(', ')}`);

console.log('=== IBIS bedrijventerreinen ===');
console.log(`  features in bron     : ${ibis.features}`);
console.log(`  zonder gemeentecode  : ${ibis.zonderSleutel}`);
console.log(`  buiten register      : ${ibis.buitenRegister}`);
console.log(`  peiljaren            : ${JSON.stringify(ibis.jaren)}`);
console.log(`  gemeenten met terrein: ${Object.keys(ibis.perGemeente).length} van ${register.size}`);

console.log('=== eigen projecten ===');
console.log(`  projecten            : ${proj.totaal}`);
console.log(`  gemeenten met project: ${Object.keys(proj.perGemeente).length}`);
for (const [code, lijst] of Object.entries(proj.perGemeente).sort()) {
  const g = register.get(code);
  const zak = [...new Set(lijst.flatMap((p) => p.families_zakelijk))].sort();
  const seg = [...new Set(lijst.map((p) => p.segment))].join('+');
  console.log(
    `    ${code} ${String(g.naam).padEnd(14)} ${String(lijst.length).padStart(2)}x  ${seg.padEnd(24)} zakelijke families: ${zak.join(', ') || 'GEEN'}`
  );
}
if (proj.onbekendeSector.length) console.log(`  SECTOR ZONDER SEGMENT: ${proj.onbekendeSector.join(', ')}`);
if (proj.ongekoppeld.length) console.log(`  ONGEKOPPELD: ${JSON.stringify(proj.ongekoppeld)}`);
