/* ============================================================================
   VIBE ENERGY — BEDRIJFSTAKPROFIEL PER GEMEENTE
   ----------------------------------------------------------------------------
   Haalt uit CBS 81575NED het aantal vestigingen per BEDRIJFSTAK per gemeente
   en leidt daaruit een economisch profiel af. Dit is de bewijslaag die
   Release 3.1 mogelijk maakt.

   WAAROM DEZE LAAG BESTAAT

   Release 1 publiceerde 11 gemeentepagina's en hield 327 gemeenten met
   toereikend bewijs vast. De reden was gemeten en terecht: met alleen een
   vestigingstotaal, een lijst bedrijventerreinen en een netbeheerder deelden
   die pagina's 55 tot 57 procent van hun vijfwoordreeksen. Het bewijs
   verschilde wel per gemeente, maar het was te WEINIG bewijs om een pagina
   van 480 woorden te vullen; de rest was onvermijdelijk sjabloon.

   Een bedrijfstakprofiel lost dat structureel op. Het is geen extra
   tekstvariatie maar een extra FEIT per gemeente, en het verandert wat de
   pagina adviseert: welke sector hier dominant is bepaalt welke
   oplossingsfamilie en welke sectorpagina relevant zijn.

   DE MAATSTAF: LOCATIEQUOTIENT, NIET HET RUWE AANTAL

   Een absoluut aantal zegt vooral hoe groot een gemeente is. Amsterdam heeft
   in elke bedrijfstak meer vestigingen dan Vlieland. Dat is geen profiel.

   Het locatiequotient (LQ) is het aandeel van een bedrijfstak in deze
   gemeente gedeeld door het aandeel van die bedrijfstak landelijk:

       LQ = (vestigingen_tak_gemeente / vestigingen_totaal_gemeente)
          / (vestigingen_tak_landelijk / vestigingen_totaal_landelijk)

   LQ = 1 betekent precies landelijk gemiddeld. LQ = 2 betekent twee keer zo
   sterk vertegenwoordigd als landelijk. Dat is een standaardmaat uit de
   economische geografie, hij is uit de brondata zelf te berekenen, en hij
   verschilt ECHT per gemeente. Hij is daarmee onderscheidend bewijs en geen
   synonymenwisseling.

   DRIE REGELS DIE DE DATA ZELF OPLEGT — niet versoepelen.

   1 · CBS RONDT AF OP VIJFVOUDEN. Elke waarde is een veelvoud van 5; dat is
       de onthullingsbeperking van CBS. Een waarde 5 kan dus 3 of 7 zijn.
       Daarom publiceren wij GEEN LQ voor een bedrijfstak met minder dan
       MIN_VESTIGINGEN vestigingen in de gemeente: bij kleine aantallen is de
       afronding groter dan het signaal. Dit filter is de reden dat sommige
       gemeenten minder profielregels krijgen dan andere, en dat is correct:
       er is daar minder te zeggen.

   2 · DE DELEN TELLEN NIET EXACT OP TOT HET TOTAAL, EN DAT IS CORRECT.
       T001081 is "alle economische activiteiten" en wordt ZELF afgerond op
       een vijfvoud, onafhankelijk van de 21 secties. De som van 21 afgeronde
       getallen is dus bijna nooit gelijk aan het afgeronde totaal.

       Gemeten over 342 gemeenten: 252 gemeenten wijken af, elke afwijking is
       een veelvoud van 5, en de grootste is 20 vestigingen (0,23%). De
       theoretische bovengrens van dit mechanisme is 21 secties x 2,5 plus
       2,5 voor het totaal = 55. De controle hieronder toetst dus het
       MECHANISME: veelvoud van 5 en binnen de grens. Een afwijking die geen
       vijfvoud is, of groter dan de grens, betekent dat de tabelindeling is
       veranderd en niet dat CBS heeft afgerond — dan moet de keten stoppen.

       Gevolg voor de rekenkunde: aandelen worden gedeeld door de SOM VAN DE
       SECTIES, niet door T001081. Alleen dan tellen de aandelen op een pagina
       op tot 100%. Het CBS-totaal blijft wel bewaard, want dat is het getal
       dat de bestaande vestigingen-alinea noemt en twee verschillende
       totalen op een site zijn een fout.

   3 · $top CAPT STIL OP 10.000 ZONDER nextLink. Gemeten: een aanvraag met
       $top=10000 levert 10.000 van 10.626 rijen en GEEN @odata.nextLink.
       Wie daarop vertrouwt mist 626 rijen en weet het niet. Daarom pagineert
       deze code expliciet met $skip en vergelijkt het eindtotaal met
       @odata.count. Bij een verschil stopt hij.

   Draaien: node scripts/seo/haal-bedrijfstakken.mjs
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

const TABEL = '81575NED';
const PERIODE = process.env.CBS_PERIODE || '2026JJ00';
const PAGINA = 1000;
const TOTAAL_CODE = 'T001081';

/* Minimaal aantal vestigingen in een bedrijfstak voordat wij er een
   locatiequotient over publiceren. CBS rondt op vijfvouden af; onder dit
   aantal is de afrondingsruis te groot voor een uitspraak. */
const MIN_VESTIGINGEN = 50;

/* De 21 secties A-U. De titels komen uit de bron zelf (BedrijfstakkenBranches
   SBI2008Codes) en worden bij het ophalen gecontroleerd; ze staan hier zodat
   de letter en een korte, leesbare naam vastliggen. */
const SECTIES = {
  301000: { letter: 'A', naam: 'landbouw, bosbouw en visserij' },
  305700: { letter: 'B', naam: 'delfstoffenwinning' },
  307500: { letter: 'C', naam: 'industrie' },
  346600: { letter: 'D', naam: 'energievoorziening' },
  348000: { letter: 'E', naam: 'waterbedrijven en afvalbeheer' },
  350000: { letter: 'F', naam: 'bouwnijverheid' },
  354200: { letter: 'G', naam: 'handel' },
  383100: { letter: 'H', naam: 'vervoer en opslag' },
  389100: { letter: 'I', naam: 'horeca' },
  391600: { letter: 'J', naam: 'informatie en communicatie' },
  396300: { letter: 'K', naam: 'financiële dienstverlening' },
  402000: { letter: 'L', naam: 'verhuur en handel van onroerend goed' },
  403300: { letter: 'M', naam: 'specialistische zakelijke diensten' },
  410200: { letter: 'N', naam: 'verhuur en overige zakelijke diensten' },
  417400: { letter: 'O', naam: 'openbaar bestuur en overheidsdiensten' },
  419000: { letter: 'P', naam: 'onderwijs' },
  422400: { letter: 'Q', naam: 'gezondheids- en welzijnszorg' },
  428100: { letter: 'R', naam: 'cultuur, sport en recreatie' },
  435500: { letter: 'S', naam: 'overige dienstverlening' },
  440000: { letter: 'T', naam: 'huishoudens' },
  440900: { letter: 'U', naam: 'extraterritoriale organisaties' },
};

/* ----------------------------------------------------------------- ophalen */
const BASIS =
  `https://datasets.cbs.nl/odata/v1/CBS/${TABEL}/Observations` +
  `?$filter=Perioden eq '${PERIODE}' and startswith(RegioS,'GM')` +
  `&$select=RegioS,BedrijfstakkenBranchesSBI2008,Value`;

async function haalAlles() {
  const rijen = [];
  let verwacht = null;
  for (let skip = 0; ; skip += PAGINA) {
    const u = `${BASIS}&$top=${PAGINA}&$skip=${skip}${skip === 0 ? '&$count=true' : ''}`;
    const r = await fetch(u, { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`CBS ${TABEL}: HTTP ${r.status} bij skip=${skip}`);
    const d = await r.json();
    if (skip === 0) verwacht = Number(d['@odata.count']);
    const batch = d.value || [];
    rijen.push(...batch);
    if (batch.length < PAGINA) break;
    if (rijen.length > 60000) throw new Error('onverwacht veel rijen; paginering stuk');
  }
  /* Regel 3: het eindtotaal MOET gelijk zijn aan @odata.count. */
  if (verwacht !== rijen.length) {
    throw new Error(`CBS leverde ${rijen.length} rijen maar @odata.count zegt ${verwacht} — paginering incompleet`);
  }
  return { rijen, verwacht };
}

async function haalSectietitels() {
  const r = await fetch(`https://datasets.cbs.nl/odata/v1/CBS/${TABEL}/BedrijfstakkenBranchesSBI2008Codes`, {
    headers: { accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`CBS ${TABEL} codes: HTTP ${r.status}`);
  const d = await r.json();
  return new Map((d.value || []).map((x) => [String(x.Identifier), String(x.Title)]));
}

/* ------------------------------------------------------------------ hoofd */
const titels = await haalSectietitels();

/* Controleer dat elke sectie die wij kennen ook in de bron staat, met de
   letter die wij denken. Een stille herindeling van de tabel moet hier
   stuklopen en niet pas op de pagina. */
const titelfouten = [];
for (const [code, s] of Object.entries(SECTIES)) {
  const t = titels.get(code);
  if (!t) { titelfouten.push(`${code} (${s.letter}) staat niet in de bron`); continue; }
  if (!new RegExp(`^${s.letter}\\s`).test(t)) titelfouten.push(`${code}: bron zegt "${t}", wij verwachtten sectie ${s.letter}`);
}
if (!titels.has(TOTAAL_CODE)) titelfouten.push(`${TOTAAL_CODE} (totaal) staat niet in de bron`);
if (titelfouten.length) {
  console.error('CBS-bedrijfstakindeling is gewijzigd:');
  for (const f of titelfouten) console.error(`  ${f}`);
  process.exit(1);
}

const { rijen, verwacht } = await haalAlles();

/* Rangschik per gemeente. */
const ruw = new Map(); // code -> { totaal, secties: {sbi: waarde} }
let buitenRegister = 0;
let leeg = 0;
let onbekendeTak = 0;
for (const rij of rijen) {
  const code = String(rij.RegioS).replace(/^GM/, '');
  if (!register.has(code)) { buitenRegister += 1; continue; }
  const tak = String(rij.BedrijfstakkenBranchesSBI2008).trim();
  if (rij.Value === null || rij.Value === undefined) { leeg += 1; continue; }
  const waarde = Math.round(Number(rij.Value));
  const g = ruw.get(code) || { totaal: null, secties: {} };
  if (tak === TOTAAL_CODE) g.totaal = waarde;
  else if (SECTIES[tak]) g.secties[tak] = waarde;
  else onbekendeTak += 1;
  ruw.set(code, g);
}

/* Regel 2: toets het AFRONDINGSMECHANISME, niet exacte gelijkheid.
   Bovengrens = 21 secties x 2,5 (eigen afronding) + 2,5 (afronding van het
   totaal) = 55. Alles daarbinnen en op een vijfvoud is CBS-afronding; al het
   andere is een gewijzigde tabelindeling. */
const AFRONDING_GRENS = 55;
const somfouten = [];
const afwijkingen = [];
for (const [code, g] of ruw) {
  if (g.totaal === null) { somfouten.push(`${code}: geen totaal (T001081 ontbreekt)`); continue; }
  const som = Object.values(g.secties).reduce((a, b) => a + b, 0);
  const d = som - g.totaal;
  if (d !== 0) afwijkingen.push(Math.abs(d));
  if (d % 5 !== 0) {
    somfouten.push(`${code} (${register.get(code).naam}): afwijking ${d} is geen vijfvoud — geen CBS-afronding`);
  } else if (Math.abs(d) > AFRONDING_GRENS) {
    somfouten.push(`${code} (${register.get(code).naam}): afwijking ${d} boven de afrondingsgrens ${AFRONDING_GRENS}`);
  }
}

/* Landelijke aandelen als noemer voor het locatiequotient. Opgeteld uit onze
   eigen 342 gemeenten, niet uit de NL-rij van CBS: dan is de noemer precies
   dezelfde populatie als de teller en kan een afwijking geen artefact zijn
   van opgeheven gemeenten die de tabel nog meeneemt. */
const landPerTak = {};
for (const g of ruw.values()) for (const [tak, v] of Object.entries(g.secties)) landPerTak[tak] = (landPerTak[tak] || 0) + v;
/* Noemer = som van de secties, zodat de landelijke aandelen op 100% uitkomen. */
const landTotaalSecties = Object.values(landPerTak).reduce((a, b) => a + b, 0);
const landTotaalCbs = [...ruw.values()].reduce((a, g) => a + (g.totaal || 0), 0);
const landAandeel = {};
for (const [tak, v] of Object.entries(landPerTak)) landAandeel[tak] = v / landTotaalSecties;

/* ------------------------------------------------------------- profielen */
const perGemeente = {};
for (const [code, g] of ruw) {
  if (!g.totaal) continue;
  const somSecties = Object.values(g.secties).reduce((a, b) => a + b, 0);
  if (!somSecties) continue;
  const takken = [];
  for (const [tak, aantal] of Object.entries(g.secties)) {
    const s = SECTIES[tak];
    const aandeel = aantal / somSecties;
    const lq = landAandeel[tak] ? aandeel / landAandeel[tak] : null;
    takken.push({
      sbi: tak,
      letter: s.letter,
      naam: s.naam,
      vestigingen: aantal,
      aandeel_pct: Math.round(aandeel * 1000) / 10,
      lq: lq === null ? null : Math.round(lq * 100) / 100,
      /* Regel 1: onder MIN_VESTIGINGEN publiceren wij geen LQ-uitspraak. */
      lq_publiceerbaar: aantal >= MIN_VESTIGINGEN && lq !== null,
    });
  }
  takken.sort((a, b) => b.vestigingen - a.vestigingen);
  perGemeente[code] = {
    /* totaal_cbs is T001081 en is het getal dat de bestaande
       vestigingen-alinea noemt. totaal_secties is de noemer van de aandelen.
       Beide staan erin zodat de pagina nooit twee verschillende totalen
       noemt en de rekenkunde toch op 100% uitkomt. */
    totaal_cbs: g.totaal,
    totaal_secties: somSecties,
    afronding_verschil: somSecties - g.totaal,
    takken,
  };
}

mkdirSync(uit, { recursive: true });
writeFileSync(
  resolve(uit, 'bedrijfstakken.json'),
  JSON.stringify(
    {
      _toelichting:
        'Vestigingen per bedrijfstak (SBI 2008 secties A-U) per gemeente, plus het locatiequotient per bedrijfstak. ' +
        'Scope GEMEENTELIJK. Het locatiequotient is het aandeel van een bedrijfstak in de gemeente gedeeld door het ' +
        'landelijke aandeel, opgeteld over dezelfde 342 gemeenten. lq_publiceerbaar is false onder ' +
        `${MIN_VESTIGINGEN} vestigingen, omdat CBS op vijfvouden afrondt en de afronding dan groter is dan het signaal.`,
      bron: `CBS OData, tabel ${TABEL} "Vestigingen van bedrijven; bedrijfstak, gemeente"`,
      bron_url: `${BASIS}&$top=${PAGINA}&$skip=0&$count=true`,
      bron_datum: OPHAALDATUM,
      periode: PERIODE,
      licentie: 'CBS — CC BY 4.0',
      scope: 'GEMEENTELIJK',
      stabiele_sleutel: "CBS-gemeentecode (RegioS zonder 'GM')",
      min_vestigingen_voor_lq: MIN_VESTIGINGEN,
      secties: SECTIES,
      observaties_in_bron: verwacht,
      overgeslagen_buiten_register: buitenRegister,
      overgeslagen_zonder_waarde: leeg,
      overgeslagen_onbekende_tak: onbekendeTak,
      afronding_grens: AFRONDING_GRENS,
      afronding_gemeenten_met_verschil: afwijkingen.length,
      afronding_grootste_verschil: afwijkingen.length ? Math.max(...afwijkingen) : 0,
      somcontrole_afwijkingen: somfouten.length,
      landelijk_totaal_cbs: landTotaalCbs,
      landelijk_totaal_secties: landTotaalSecties,
      landelijk_aandeel: landAandeel,
      gemeenten_met_profiel: Object.keys(perGemeente).length,
      per_gemeente: perGemeente,
    },
    null,
    2
  ) + '\n'
);

/* --------------------------------------------------------------- rapport */
console.log('=== CBS bedrijfstakken per gemeente ===');
console.log(`  observaties in bron      : ${verwacht}`);
console.log(`  rijen opgehaald          : ${rijen.length}`);
console.log(`  buiten register          : ${buitenRegister}`);
console.log(`  zonder waarde            : ${leeg}`);
console.log(`  onbekende bedrijfstak    : ${onbekendeTak}`);
console.log(`  gemeenten met profiel    : ${Object.keys(perGemeente).length} van ${register.size}`);
console.log(`  landelijk totaal (CBS)   : ${landTotaalCbs} vestigingen`);
console.log(`  landelijk totaal (secties): ${landTotaalSecties} vestigingen`);
console.log(
  `  CBS-afronding            : ${afwijkingen.length} gemeenten met verschil, grootste ${afwijkingen.length ? Math.max(...afwijkingen) : 0} (grens ${AFRONDING_GRENS})`
);
console.log(`  somcontrole fouten       : ${somfouten.length}`);
for (const f of somfouten.slice(0, 10)) console.log(`     ${f}`);
if (somfouten.length > 10) console.log(`     ... en nog ${somfouten.length - 10}`);

const publiceerbaar = Object.values(perGemeente).map((p) => p.takken.filter((t) => t.lq_publiceerbaar).length);
publiceerbaar.sort((a, b) => a - b);
const q = (f) => publiceerbaar[Math.floor(f * (publiceerbaar.length - 1))];
console.log(`  publiceerbare LQ-takken  : min ${q(0)} · p50 ${q(0.5)} · max ${q(1)}`);
console.log(`  gemeenten met 0           : ${publiceerbaar.filter((n) => n === 0).length}`);

if (somfouten.length) {
  console.error('\nDE AFWIJKING IS GEEN CBS-AFRONDING. De tabelindeling is vermoedelijk gewijzigd; zie regel 2 in de kop.');
  process.exit(1);
}
