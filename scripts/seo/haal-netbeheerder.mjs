/* ============================================================================
   VIBE ENERGY — NETBEHEERDER PER GEMEENTE
   ----------------------------------------------------------------------------
   Er bestaat GEEN officiële tabel die per gemeentecode de netbeheerder geeft.
   Wel bestaan er twee officiële lagen die samen het antwoord geven:

     A · Netbeheergebieden elektriciteit — Stichting Mijnaansluiting.nl,
         gepubliceerd via het Nationaal Georegister en geregistreerd op
         data.overheid.nl als dataset 81000. Licentie: Publiek domein
         (Public Domain Mark 1.0), zelf gelezen uit de CKAN-registratie.
         Zes netbeheerders als MultiPolygon.
     B · Gemeentegrenzen 2026 — PDOK, CBS Gebiedsindelingen, laag
         gemeente_gegeneraliseerd. Sleutel statcode = GM + CBS-gemeentecode.

   WAT DIT SCRIPT WEL EN NIET BEWEERT
   Een gemeente is geen netbeheergebied. Dit script bemonstert elke gemeente
   met een raster van punten binnen haar eigen grens en kijkt in welk
   netbeheergebied elk punt valt. Dan geldt:

     · valt ALLES bij één netbeheerder  -> zeker = true
     · valt het verdeeld                -> zeker = false, met het aandeel per
                                           netbeheerder, en de pagina mag geen
                                           enkele netbeheerder als DE
                                           netbeheerder van die gemeente noemen

   Het aandeel is een oppervlakte-aandeel bij benadering (gelijkmatig raster in
   graden), geen inwoner- of aansluitingenaandeel. Zo staat het ook in de
   uitvoer, en zo moet een pagina het formuleren.

   Draaien: node scripts/seo/haal-netbeheerder.mjs
   ============================================================================ */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bereidVoor, inVlak, rasterpunten } from './lib/geometrie.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');
const uit = resolve(wortel, 'data', 'bewijs');

const OPHAALDATUM = process.env.BEWIJS_OPHAALDATUM || new Date().toISOString().slice(0, 10);
const INDELING_JAAR = process.env.GEBIEDSINDELING_JAAR || '2026';

const NETBEHEER_URL =
  'https://public.geodata.mijnaansluiting.nl/geoserver/mijnaansluiting_open/wfs' +
  '?service=wfs&version=2.0.0&request=GetFeature' +
  '&typeNames=mijnaansluiting_open:netbeheergebieden_elektriciteit' +
  '&outputFormat=application/json&srsName=EPSG:4326';

const GEMEENTE_URL =
  `https://service.pdok.nl/cbs/gebiedsindelingen/${INDELING_JAAR}/wfs/v1_0` +
  '?service=WFS&version=2.0.0&request=GetFeature&typeNames=gemeente_gegeneraliseerd' +
  '&outputFormat=application/json&srsName=EPSG:4326';

const LICENTIE_NETBEHEER =
  'Publiek domein (Public Domain Mark 1.0) — bronhouder Stichting Mijnaansluiting.nl, ' +
  'geregistreerd op data.overheid.nl als dataset 81000-netbeheergebieden-elektriciteit--gas--media--riolering--warmte-en-water';

async function geojson(url, wat) {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${wat}: HTTP ${r.status} op ${url}`);
  const d = await r.json();
  if (!d.features || !d.features.length) throw new Error(`${wat}: lege FeatureCollection`);
  return d;
}

const register = JSON.parse(readFileSync(resolve(wortel, 'data', 'geo', 'gemeenten.json'), 'utf8'));
const codes = new Set(register.gemeenten.map((g) => g.gemeentecode));
const naamVan = new Map(register.gemeenten.map((g) => [g.gemeentecode, g.naam]));

const nb = await geojson(NETBEHEER_URL, 'netbeheergebieden');
const gm = await geojson(GEMEENTE_URL, 'gemeentegrenzen');

const beheerders = nb.features.map((f) => ({
  label: f.properties.netbeheerderLabel,
  naam: f.properties.netbeheerderName,
  code: f.properties.netbeheerderCode,
  website: f.properties.website || null,
  vlakken: bereidVoor(f.geometry),
}));

console.log(`netbeheergebieden: ${beheerders.length} (${beheerders.map((b) => b.label).join(', ')})`);
console.log(`gemeentegrenzen  : ${gm.features.length} uit indeling ${INDELING_JAAR}`);

const perGemeente = {};
const buitenRegister = [];
let gesplitst = 0;
let zonderPunten = 0;

for (const f of gm.features) {
  const statcode = String(f.properties.statcode || f.properties.jrstatcode || '');
  const code = statcode.replace(/^\d{4}/, '').replace(/^GM/, '');
  if (!codes.has(code)) { buitenRegister.push(statcode); continue; }

  const vlakken = bereidVoor(f.geometry);
  const { punten, raster } = rasterpunten(vlakken, { minimaal: 40 });
  if (!punten.length) { zonderPunten += 1; continue; }

  const telling = new Map();
  let buitenAlles = 0;
  for (const [x, y] of punten) {
    const hit = beheerders.find((b) => inVlak(x, y, b.vlakken));
    if (!hit) { buitenAlles += 1; continue; }
    telling.set(hit.label, (telling.get(hit.label) || 0) + 1);
  }

  const totaal = [...telling.values()].reduce((a, b) => a + b, 0);
  if (totaal === 0) { zonderPunten += 1; continue; }

  const gesorteerd = [...telling.entries()]
    .map(([label, n]) => ({ label, aandeel: Math.round((n / totaal) * 1000) / 10 }))
    .sort((a, b) => b.aandeel - a.aandeel);

  const zeker = gesorteerd.length === 1;
  if (!zeker) gesplitst += 1;

  /* Drie zekerheidsklassen, zodat de pagina niet zelf hoeft te beslissen hoe
     voorzichtig hij moet formuleren:
       EENDUIDIG  — alle steekproefpunten bij één netbeheerder.
       OVERWEGEND — grootste aandeel >= 90%. Een smalle rand valt elders; dat
                    is vaak een randeffect van het raster, maar het mag niet
                    worden weggelaten.
       VERDEELD   — grootste aandeel < 90%. Geen enkele netbeheerder mag hier
                    als DE netbeheerder van de gemeente worden genoemd. */
  const zekerheid = zeker ? 'EENDUIDIG' : gesorteerd[0].aandeel >= 90 ? 'OVERWEGEND' : 'VERDEELD';

  const hoofd = beheerders.find((b) => b.label === gesorteerd[0].label);
  perGemeente[code] = {
    netbeheerder: gesorteerd[0].label,
    netbeheerder_naam: hoofd.naam,
    website: hoofd.website,
    zeker,
    zekerheid,
    aandeel_grootste: gesorteerd[0].aandeel,
    verdeling: gesorteerd,
    steekproefpunten: punten.length,
    punten_buiten_elk_gebied: buitenAlles,
    raster,
  };
}

mkdirSync(uit, { recursive: true });
writeFileSync(
  resolve(uit, 'netbeheerders.json'),
  JSON.stringify(
    {
      _toelichting:
        'Netbeheerder elektriciteit per gemeente, bepaald door punt-in-vlak op een raster binnen de gemeentegrens. Bij zeker=false raakt de gemeente meer dan één netbeheergebied en mag geen enkele netbeheerder als DE netbeheerder van die gemeente worden genoemd.',
      _aandeel_betekent:
        'Benaderd oppervlakte-aandeel op een gelijkmatig raster in graden. Geen aandeel in inwoners of aansluitingen.',
      bron_netbeheergebieden: 'Stichting Mijnaansluiting.nl — WFS mijnaansluiting_open:netbeheergebieden_elektriciteit',
      bron_netbeheergebieden_url: NETBEHEER_URL,
      licentie_netbeheergebieden: LICENTIE_NETBEHEER,
      bron_gemeentegrenzen: `PDOK — CBS Gebiedsindelingen ${INDELING_JAAR}, laag gemeente_gegeneraliseerd`,
      bron_gemeentegrenzen_url: GEMEENTE_URL,
      bron_datum: OPHAALDATUM,
      scope: 'NETBEHEERDERGEBIED, toegerekend aan GEMEENTELIJK',
      netbeheerders: beheerders.map((b) => ({ label: b.label, naam: b.naam, code: b.code, website: b.website })),
      _zekerheid_klassen: {
        EENDUIDIG: 'alle steekproefpunten bij één netbeheerder',
        OVERWEGEND: 'grootste aandeel >= 90%; een rand valt elders en moet genoemd worden',
        VERDEELD: 'grootste aandeel < 90%; GEEN netbeheerder mag als DE netbeheerder worden genoemd',
      },
      gemeenten_bepaald: Object.keys(perGemeente).length,
      gemeenten_eenduidig: Object.values(perGemeente).filter((x) => x.zekerheid === 'EENDUIDIG').length,
      gemeenten_overwegend: Object.values(perGemeente).filter((x) => x.zekerheid === 'OVERWEGEND').length,
      gemeenten_verdeeld: Object.values(perGemeente).filter((x) => x.zekerheid === 'VERDEELD').length,
      gemeenten_gesplitst: gesplitst,
      per_gemeente: perGemeente,
    },
    null,
    2
  ) + '\n'
);

console.log(`bepaald          : ${Object.keys(perGemeente).length} van ${codes.size}`);
console.log(`eenduidig        : ${Object.values(perGemeente).filter((x) => x.zeker).length}`);
console.log(`gesplitst        : ${gesplitst}`);
if (zonderPunten) console.log(`zonder steekproef: ${zonderPunten}`);
if (buitenRegister.length) console.log(`buiten register  : ${buitenRegister.length} (${buitenRegister.slice(0, 5).join(', ')})`);

const perBeheerder = {};
for (const v of Object.values(perGemeente)) perBeheerder[v.netbeheerder] = (perBeheerder[v.netbeheerder] || 0) + 1;
console.log('verdeling (hoofdnetbeheerder per gemeente):');
for (const [k, n] of Object.entries(perBeheerder).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(16)} ${n}`);

const split = Object.entries(perGemeente).filter(([, v]) => !v.zeker);
if (split.length) {
  console.log(`gesplitste gemeenten (${split.length}):`);
  for (const [code, v] of split.sort((a, b) => a[1].aandeel_grootste - b[1].aandeel_grootste)) {
    console.log(`  ${code} ${String(naamVan.get(code)).padEnd(22)} ${v.verdeling.map((x) => `${x.label} ${x.aandeel}%`).join(' / ')}`);
  }
}
