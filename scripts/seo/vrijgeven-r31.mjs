/* ============================================================================
   VIBE ENERGY — RELEASE 3.1: HET PUBLICATIEBESLUIT SCHRIJVEN
   ----------------------------------------------------------------------------
   Schrijft data/seo/publicatiebesluit.json met één regel per gemeente die in
   Release 3.1 wordt vrijgegeven, en met de GEMETEN reden erbij.

   WAAROM DIT EEN SCRIPT IS EN GEEN HANDMATIGE LIJST
   De reden achter een vrijgave moet de cijfers van díe gemeente noemen,
   anders is het 327 keer dezelfde zin en dan is het geen besluit maar een
   vlag. Deze generator haalt die cijfers uit het bewijs zelf, zodat de reden
   naast de route klopt en bij een volgende bewijsronde meeverandert.

   DE DREMPEL IS NIET VERLAAGD — ER IS BEWIJS BIJGEKOMEN.
   Release 1 hield deze gemeenten vast met een gemeten argument: met alleen
   een vestigingstotaal, een terreinenlijst en een netbeheerder deelden de
   gemeentepagina's 55 tot 57 procent van hun vijfwoordreeksen (drempel 60).
   Te weinig bewijs voor te veel pagina's.

   Release 3.1 voegt het bedrijfstakprofiel toe (CBS 81575NED, 21 secties per
   gemeente, plus een locatiequotient tegen het landelijke aandeel) en haalt
   de landelijke netcongestie-uitleg van de gemeentepagina's af, waar hij
   woordelijk gelijk stond. Gemeten na die twee ingrepen op de bestaande 11
   pagina's: de hoogste jaccard zakte van 0,573 naar 0,509.

   WELKE GEMEENTEN NIET
   Een gemeente zonder bedrijventerrein in IBIS blijft PENDING, ook nu. De
   reden is niet formeel maar inhoudelijk: vestigingen en bedrijfstakprofiel
   komen uit DEZELFDE CBS-tabel. Dat zijn twee doorsnedes van één bron, niet
   twee onafhankelijke feiten. Zonder terrein is er dus één bron plus de
   netbeheerder, en die weegt nul omdat ~130 gemeenten hem delen. Dat raakt
   vier gemeenten: Rozendaal, Bloemendaal, Laren en Voorne aan Zee.

   Draaien: node scripts/seo/vrijgeven-r31.mjs [--droog]
   ============================================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');
const lees = (...p) => JSON.parse(readFileSync(resolve(wortel, ...p), 'utf8'));
const DROOG = process.argv.includes('--droog');
/** Waarde van --<naam> <waarde>, of undefined. */
function argv(naam) {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const reg = lees('data', 'seo', 'routes.json');
const tak = lees('data', 'bewijs', 'bedrijfstakken.json');
const terr = lees('data', 'bewijs', 'bedrijventerreinen.json');
const geo = lees('data', 'geo', 'gemeenten.json');
const naamVanCode = new Map(geo.gemeenten.map((g) => [g.gemeentecode, g.naam]));

const nf = new Intl.NumberFormat('nl-NL');
const getal = (n) => nf.format(n);
const komma = (n, d = 2) => nf.format(Number(Number(n).toFixed(d)));

const besluitPad = resolve(wortel, 'data', 'seo', 'publicatiebesluit.json');
const vorig = JSON.parse(readFileSync(besluitPad, 'utf8'));

/* DE KANDIDATEN KOMEN UIT HET BEWIJS, NIET UIT DE HUIDIGE STAAT.

   Eerste versie van dit script filterde op `staat === 'PENDING'` uit
   routes.json. Dat werkte één keer: na de eerste run stonden die routes op
   INDEX, en de tweede run vond nul kandidaten en schreef een LEEG besluit —
   waarmee alle 327 pagina's weer verdwenen. Een generator die zijn eigen
   uitvoer als invoer leest is niet herhaalbaar.

   Nu bepaalt het bewijs de kandidaat: geen eigen project (die staan al op
   INDEX en hebben geen regel nodig), wél een bedrijventerrein met naam en
   oppervlak, wél een CBS-vestigingscijfer, wél een publiceerbaar
   locatiequotient. Dezelfde invoer geeft nu altijd hetzelfde besluit. */
const projGeo = lees('data', 'bewijs', 'projecten-geo.json').per_gemeente;
const vest = lees('data', 'bewijs', 'vestigingen.json').per_gemeente;

/* ------------------------------------------------------- GEFASEERD UITROLLEN

   Een statische site wordt in één artefact uitgerold; Railway kan geen
   deelverzameling serveren. De knop die hier WEL bestaat is dit besluit:
   zet er minder gemeenten in en er staan minder pagina's live.

   Daarmee is een gefaseerde uitrol echt mogelijk, en elke tussenstand is
   een CORRECTE site: de provinciepagina toont de gemeenten zonder pagina
   als platte tekst in plaats van als link, de sitemap bevat precies wat er
   staat, en er ontstaat geen enkele link naar een niet-bestaande pagina.

   --fase <naam> beperkt tot de provincies van die fase. Zonder vlag: alles.
   De fasen zijn op OMVANG gekozen, niet op alfabet: fase 1 is klein genoeg
   om de deployketen te toetsen met een beperkte blast radius. */
const FASEN = {
  1: {
    toelichting: 'Twee kleine provincies plus alle provinciehubs. Toetst de deployketen op beperkte schaal.',
    provincies: ['drenthe', 'flevoland'],
  },
  2: {
    toelichting: 'De resterende provincies, nadat fase 1 live is geverifieerd.',
    provincies: null, // null = alle overige
  },
};
const faseArg = argv('fase');
const fase = faseArg ? FASEN[faseArg] : null;
if (faseArg && !fase) {
  console.error(`onbekende fase '${faseArg}'; beschikbaar: ${Object.keys(FASEN).join(', ')}`);
  process.exit(1);
}
const faseFilter = (g) => {
  if (!fase || !fase.provincies) return true;
  return fase.provincies.includes(g.provincie_slug);
};

const kandidaten = geo.gemeenten
  .filter((g) => !(projGeo[g.gemeentecode] || []).length)
  .filter((g) => (terr.per_gemeente[g.gemeentecode] || []).some((t) => t.naam && (t.ha_netto ?? t.ha_bruto)))
  .filter((g) => typeof vest[g.gemeentecode] === 'number')
  .filter(faseFilter)
  .map((g) => ({
    route: `regios/${g.provincie_slug}/${g.slug}`,
    gemeentecode: g.gemeentecode,
    subsoort: 'gemeente',
  }));

const vrijgegeven = {};
const overgeslagen = [];

for (const r of kandidaten) {
  const code = r.gemeentecode;
  const gnaam = naamVanCode.get(code) || code;
  const profiel = tak.per_gemeente[code];
  const terreinen = terr.per_gemeente[code] || [];

  if (!profiel) {
    overgeslagen.push(`${code} ${gnaam}: geen bedrijfstakprofiel`);
    continue;
  }

  /* Het derde bewijsveld moet er ECHT zijn. Een gemeente waarin geen enkele
     bedrijfstak 50 vestigingen haalt, heeft geen publiceerbaar
     locatiequotient: bij die aantallen is de CBS-afronding op vijfvouden
     groter dan het signaal. Dan valt het bewijs terug op twee velden en is
     dit dezelfde situatie als vóór Release 3.1.

     Gemeten raakt dit één gemeente: Schiermonnikoog, de kleinste van
     Nederland. Poort 3 vond hem; deze regel houdt hem tegen bij de bron in
     plaats van bij de poort. */
  const publiceerbareLq = profiel.takken.filter((t) => t.lq_publiceerbaar).length;
  if (!publiceerbareLq) {
    overgeslagen.push(
      `${code} ${gnaam}: geen enkele bedrijfstak haalt ${tak.min_vestigingen_voor_lq} vestigingen, dus geen ` +
        `publiceerbaar locatiequotient (totaal ${getal(profiel.totaal_cbs)} vestigingen)`
    );
    continue;
  }

  /* De onderscheidende feiten, in de volgorde waarin ze op de pagina staan. */
  const nettoHa = Math.round(terreinen.reduce((a, t) => a + (t.ha_netto ?? 0), 0));
  const grootste = terreinen.find((t) => t.naam);
  const sterk = profiel.takken
    .filter((t) => t.lq_publiceerbaar && t.lq >= 1.25)
    .sort((a, b) => b.lq - a.lq)
    .slice(0, 2);
  const publiceerbaar = publiceerbareLq;

  const stukken = [
    `${getal(profiel.totaal_cbs)} vestigingen`,
    `${getal(terreinen.length)} bedrijventerrein${terreinen.length === 1 ? '' : 'en'} (${getal(nettoHa)} ha netto${grootste ? `, grootste ${grootste.naam}` : ''})`,
    `${publiceerbaar} bedrijfstakken met een publiceerbaar locatiequotient`,
  ];
  if (sterk.length) {
    stukken.push(
      `bovengemiddeld: ${sterk.map((t) => `${t.naam} (${komma(t.lq)}x landelijk)`).join(' en ')}`
    );
  } else {
    stukken.push('geen bedrijfstak boven 1,25x het landelijke aandeel; het profiel is gemengd');
  }

  vrijgegeven[r.route] =
    `Release 3.1. Onderscheidend bewijs uit twee onafhankelijke bronnen (IBIS en CBS 81575NED): ` +
    `${stukken.join('; ')}. De landelijke netcongestie-uitleg staat niet meer op deze pagina maar op ` +
    `/kennis/netcongestie-uitgelegd, zodat de gedeelde sjabloontekst is verdwenen in plaats van herschreven.`;
}

const uit = {
  ...vorig,
  _versie: '2.0.0',
  _vastgesteld: '2026-10-12',
  _release: 'Release 3.1 — regionale uitbreiding op bedrijfstakbewijs',
  _fase: faseArg ? `${faseArg} — ${fase.toelichting}` : 'volledig (geen --fase opgegeven)',
  vastgehouden: {
    reden:
      'Vastgehouden zolang er niet genoeg onderscheidend lokaal bewijs is. Een gemeente zonder bedrijventerrein ' +
      'in IBIS haalt de poort niet: vestigingen en bedrijfstakprofiel komen uit dezelfde CBS-tabel en zijn dus twee ' +
      'doorsnedes van één bron, geen twee onafhankelijke feiten. De netbeheerder weegt nul omdat ongeveer 130 ' +
      'gemeenten er één delen. Die gemeenten blijven in het register staan met hun bewijs, zodat vrijgave later ' +
      'een regel in dit bestand is en geen herbouw.',
  },
  vrijgegeven,
  _hoe_vrijgeven: vorig._hoe_vrijgeven,
};

if (DROOG) {
  console.log('DROGE RUN — er is niets geschreven.');
} else {
  writeFileSync(besluitPad, JSON.stringify(uit, null, 2) + '\n');
}

console.log(`kandidaten (terrein + vestigingen, geen eigen project) : ${kandidaten.length}`);
console.log(`vrijgegeven                                           : ${Object.keys(vrijgegeven).length}`);
console.log(`overgeslagen                                          : ${overgeslagen.length}`);
for (const o of overgeslagen) console.log(`   ${o}`);
const eerste = Object.keys(vrijgegeven)[0];
if (eerste) {
  console.log(`\nvoorbeeldregel:\n  ${eerste}\n    ${vrijgegeven[eerste]}`);
}
