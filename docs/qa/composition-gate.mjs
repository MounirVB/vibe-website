#!/usr/bin/env node
/* ============================================================================
   VIBE COMPOSITIEPOORT — uitvoerbaar
   ----------------------------------------------------------------------------
   Draait op compositiekaarten (docs/compositions/*.json) en het siteregister
   (docs/data/vibe-site-register.json). Wijzigt NIETS in productie.

       node docs/qa/composition-gate.mjs            alles
       node docs/qa/composition-gate.mjs <kaart>    één kaart
       node docs/qa/composition-gate.mjs --packet <kaart>   reviewerpakket

   WAAROM DIT HARNAS BESTAAT. De vorige poort gaf een opzettelijk generieke
   pagina en een premiumpagina dezelfde uitkomstvector. De oorzaak was dat
   zij INFRASTRUCTUUR mat (staat er een beeld, staat er een vlak) in plaats van
   RELATIES (ligt er iets OP iets, herhaalt de pagina zichzelf, draagt elke
   HIGH-sectie een eigen hoofdrol). De regels hieronder meten relaties.

   DRIE UITKOMSTEN, nooit meer. PASS / FAIL / NVT-met-reden-en-vervanger.
   Een lege verzameling is NOOIT PASS: zij is NVT en haar vervanger moet zelf
   in PASS of FAIL eindigen. Dat is afgedwongen in `verdict()`.
   ============================================================================ */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const DOCS = dirname(HIER);
const KAARTEN = join(DOCS, 'compositions');
const REGISTER = join(DOCS, 'data', 'vibe-site-register.json');

/* ---------------------------------------------------------------- hulpjes */
const lees = p => JSON.parse(readFileSync(p, 'utf8'));
const telOp = a => a.reduce((x, y) => x + y, 0);
const uniek = a => [...new Set(a)];
const freq = a => a.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});

/** PASS/FAIL/NVT met de harde regel: NVT zonder geslaagde vervanger = FAIL. */
function verdict(code, uitkomst, waarde, grens, extra = {}) {
  const r = { code, uitkomst, waarde, grens, ...extra };
  if (uitkomst === 'NVT') {
    if (!extra.reden) { r.uitkomst = 'FAIL'; r.fout = 'NVT zonder reden'; return r; }
    if (!extra.vervanger) { r.uitkomst = 'FAIL'; r.fout = 'NVT zonder vervangende eis'; return r; }
    if (!['PASS', 'FAIL'].includes(extra.vervanger.uitkomst)) {
      r.uitkomst = 'FAIL'; r.fout = 'vervanger eindigt niet in PASS of FAIL'; return r;
    }
    if (extra.vervanger.uitkomst === 'FAIL') r.uitkomst = 'FAIL';
  }
  return r;
}

/* -------------------------------------------------- archetypeprofielen */
/* HERKOMST. De sectiebanden zijn de GEMETEN sectietellingen van de echte
   pagina's per archetype (docs/data/vibe-site-register.json, veld
   measured.secties), met een marge van ongeveer een sectie aan beide kanten
   omdat de kaart de INTENTIE beschrijft en niet de legacy-DOM:
     B1 index 7 · B2 8·8·8·10 · B3 8-11 · B4 9×5 · B5 6-7 · B6 6·7
     B7 0 (ongemigreerd; REG-5 zet alle kapittels in EEN sectie) · S2 0·1·5
   Het fotobudget komt uit de gemeten voorraad: 10 klasse-A-opnamen over 48
   pagina's is minder dan een sterk beeld per pagina, dus de budgetten zijn
   laag en niet-fotografische dragers moeten het werk doen.
   klasse: A = overal geldend · B = referentiebereik · C = mastermeting.      */
const PROFIEL = {
  B1: { secties: [6, 11], high: [2, 4], modi: { CANVAS: [3, 9], DOCUMENT: [0, 3], HYBRID: [0, 4] }, foto: [3, 8], klasse: 'C-master' },
  B2: { secties: [6, 12], high: [3, 3], modi: { CANVAS: [2, 5], DOCUMENT: [1, 4], HYBRID: [2, 5] }, foto: [1, 2], klasse: 'A' },
  B3: { secties: [7, 12], high: [2, 3], modi: { CANVAS: [1, 4], DOCUMENT: [1, 4], HYBRID: [1, 5] }, foto: [1, 2], klasse: 'B' },
  B4: { secties: [7, 11], high: [2, 2], modi: { CANVAS: [1, 4], DOCUMENT: [1, 4], HYBRID: [1, 4] }, foto: [1, 1], klasse: 'B' },
  B5: { secties: [5, 8], high: [2, 2], modi: { CANVAS: [0, 3], DOCUMENT: [1, 4], HYBRID: [1, 4] }, foto: [1, 1], klasse: 'B' },
  B6: { secties: [5, 9], high: [1, 2], modi: { CANVAS: [0, 2], DOCUMENT: [1, 4], HYBRID: [1, 4] }, foto: [0, 1], klasse: 'B' },
  B7: { secties: [3, 6], high: [0, 1], modi: { CANVAS: [0, 1], DOCUMENT: [2, 5], HYBRID: [0, 2] }, foto: [0, 0], klasse: 'A' },
  S2: { secties: [3, 8], high: [0, 2], modi: { CANVAS: [0, 2], DOCUMENT: [1, 6], HYBRID: [0, 3] }, foto: [0, 2], klasse: 'B' },
};

/* ====================================================================
   DE REGELS. Elke regel heeft een EVALUATOR en een KLASSE.
   MACHINE  = volledig uit de kaart te bepalen
   REVIEWER = mens, met een inspecteerbare vraag (hier alleen uitgegeven)
   ==================================================================== */

/* --- KP-01 .. KP-04 : vorm en volledigheid ------------------------------ */
function G01_schema(kaart, schema) {
  const fouten = [];
  const eis = (v, pad, msg) => { if (!v) fouten.push(`${pad}: ${msg}`); };
  eis(kaart.card_version === '1.0', 'card_version', 'moet 1.0 zijn');
  eis(PROFIEL[kaart.archetype], 'archetype', 'onbekend archetype');
  eis(Array.isArray(kaart.sections) && kaart.sections.length >= 3, 'sections', 'minstens 3');
  const velden = schema.properties.sections.items.required;
  (kaart.sections || []).forEach((s, i) => {
    velden.forEach(v => eis(s[v] !== undefined, `sections[${i}].${v}`, 'ontbreekt'));
    const toegestaan = Object.keys(schema.properties.sections.items.properties);
    Object.keys(s).forEach(k => eis(toegestaan.includes(k), `sections[${i}].${k}`, 'onbekend veld'));
  });
  const verboden = ['px', 'clip-path', 'font-size', 'class', 'cqw'];
  const tekst = JSON.stringify(kaart).toLowerCase();
  verboden.forEach(v => { if (tekst.includes(`"${v}`) || tekst.includes(`${v}:`)) fouten.push(`implementatiedetail "${v}" hoort niet in een kaart`); });
  return verdict('KP-01 SCHEMA', fouten.length ? 'FAIL' : 'PASS', `${fouten.length} fouten`, '0', { detail: fouten.slice(0, 6) });
}

function G02_omvang(kaart) {
  const p = PROFIEL[kaart.archetype]; const n = kaart.sections.length;
  const ok = n >= p.secties[0] && n <= p.secties[1];
  return verdict('KP-02 OMVANG', ok ? 'PASS' : 'FAIL', `${n} secties`, `${p.secties[0]}-${p.secties[1]}`);
}

function G03_impactritme(kaart) {
  const p = PROFIEL[kaart.archetype];
  const imp = kaart.sections.map(s => s.impact);
  const high = imp.filter(x => x === 'HIGH').length;
  const naast = imp.some((x, i) => x === 'HIGH' && imp[i + 1] === 'HIGH');
  const ok = high >= p.high[0] && high <= p.high[1] && !naast;
  return verdict('KP-03 IMPACTRITME', ok ? 'PASS' : 'FAIL',
    `${high} HIGH${naast ? ', twee naast elkaar' : ''}`, `${p.high[0]}-${p.high[1]}, nooit aangrenzend`);
}

function G04_modusband(kaart) {
  const p = PROFIEL[kaart.archetype];
  const t = freq(kaart.sections.map(s => s.canvas_mode));
  const mis = Object.entries(p.modi).filter(([m, [lo, hi]]) => (t[m] || 0) < lo || (t[m] || 0) > hi);
  const overgangen = kaart.sections.slice(1).filter((s, i) => s.canvas_mode !== kaart.sections[i].canvas_mode).length;
  const ok = mis.length === 0 && overgangen >= 2;
  return verdict('KP-04 MODUSBAND', ok ? 'PASS' : 'FAIL',
    `C${t.CANVAS || 0}·D${t.DOCUMENT || 0}·H${t.HYBRID || 0}, ${overgangen} overgangen`,
    `banden van ${kaart.archetype}, >=2 overgangen`, { detail: mis.map(([m, b]) => `${m} buiten ${b}`) });
}

/* --- KP-05 .. KP-09 : DE SCHEIDENDE REGELS ------------------------------
   Deze vijf zijn de reden dat een generieke pagina zakt en een premium
   pagina slaagt. Zij meten RELATIES, niet aanwezigheid.                  */

/** KP-05 HERHAALDE DRIELING. Een generieke pagina herhaalt dezelfde sectie:
    zelfde impact, zelfde blauwdruk, zelfde vlakpatroon. Een ontworpen pagina
    doet dat nooit twee keer identiek. */
function G05_herhaling(kaart) {
  const sleutels = kaart.sections.map(s => `${s.impact}|${s.blueprint}|${s.surface_hierarchy.pattern}|${s.visual_role}`);
  const t = freq(sleutels);
  const dubbel = Object.entries(t).filter(([, n]) => n > 1);
  return verdict('KP-05 HERHAALDE DRIELING', dubbel.length === 0 ? 'PASS' : 'FAIL',
    `${dubbel.length} herhaalde combinaties`, '0',
    { detail: dubbel.map(([k, n]) => `${n}x  ${k}`) });
}

/** KP-06 HECHTING. Het gemeten verschil tussen Master v1 en de B2-kandidaat was
    "vlakken liggen OP beelden" tegenover "beelden staan NAAST tekst in een
    rastercel": 6 van 9 secties tegenover 0 van 11. Dit is die regel.
    Vloer: ten minste ceil(n/4) secties met een hechting, en minstens 2. */
function G06_hechting(kaart) {
  const met = kaart.sections.filter(s => (s.surface_hierarchy.bindings || []).length > 0);
  const vloer = Math.max(2, Math.ceil(kaart.sections.length / 4));
  return verdict('KP-06 HECHTING', met.length >= vloer ? 'PASS' : 'FAIL',
    `${met.length} van ${kaart.sections.length} secties met een hechting`, `>= ${vloer}`,
    { detail: met.map(s => `${s.id}: ${s.surface_hierarchy.bindings.map(b => b.kind).join(',')}`) });
}

/** KP-07 GELIJKE KAARTRIJEN. Toegestaan is er hoogstens een, en alleen met een
    opgeschreven rechtvaardiging dat de inhoud een gelijk register is. */
function G07_gelijkeRijen(kaart) {
  const rijen = kaart.sections.filter(s => (s.surface_hierarchy.equal_row?.count || 0) >= 3);
  const zonder = rijen.filter(s => !s.surface_hierarchy.equal_row.equal_register_justification);
  const ok = rijen.length <= 1 && zonder.length === 0;
  return verdict('KP-07 GELIJKE RIJEN', ok ? 'PASS' : 'FAIL',
    `${rijen.length} rijen, ${zonder.length} zonder rechtvaardiging`, '<=1 en altijd gerechtvaardigd',
    { detail: rijen.map(s => s.id) });
}

/** KP-08 HOOFDROL PER HIGH. Elke HIGH-sectie draagt een eigen hoofdrol. Draagt
    de pagina twee HIGH-secties met dezelfde hoofdrol, dan is de tweede een
    herhaling in plaats van een climax. */
function G08_highHoofdrol(kaart) {
  const high = kaart.sections.filter(s => s.impact === 'HIGH');
  if (high.length === 0) {
    const stil = kaart.sections.filter(s => s.impact === 'MEDIUM');
    return verdict('KP-08 HOOFDROL PER HIGH', 'NVT', '0 HIGH-secties', 'n.v.t.', {
      reden: `archetype ${kaart.archetype} kent geen verplichte HIGH-sectie`,
      vervanger: verdict('KP-08v MEDIUM-HOOFDROL', uniek(stil.map(s => s.protagonist)).length >= 2 ? 'PASS' : 'FAIL',
        `${uniek(stil.map(s => s.protagonist)).length} hoofdrollen over ${stil.length} MEDIUM`, '>=2'),
    });
  }
  const d = uniek(high.map(s => s.protagonist)).length;
  const eis = Math.min(high.length, 2);
  return verdict('KP-08 HOOFDROL PER HIGH', d >= eis ? 'PASS' : 'FAIL',
    `${d} verschillende hoofdrollen over ${high.length} HIGH`, `>= ${eis}`,
    { detail: high.map(s => `${s.id}: ${s.protagonist}`) });
}

/** KP-09 DRAGERVERSCHEIDENHEID. Vervangt het ingetrokken plafond op fotoloze
    secties (DR-I-22) door een vloer op de verscheidenheid van de dragers. */
function G09_dragers(kaart) {
  const rollen = uniek(kaart.sections.map(s => s.visual_role));
  const vloer = Math.min(Math.ceil(kaart.sections.length / 2), 4);
  return verdict('KP-09 DRAGERVERSCHEIDENHEID', rollen.length >= vloer ? 'PASS' : 'FAIL',
    `${rollen.length} rollen (${rollen.sort().join(',')})`, `>= ${vloer}`);
}

/* --- KP-10 .. KP-12 : assets, inhoud, geometrie ------------------------- */
function G10_fotobudget(kaart) {
  const p = PROFIEL[kaart.archetype];
  const fotos = kaart.sections.filter(s => s.media_treatment !== 'M0' && s.asset_status === 'AANWEZIG');
  const bestanden = uniek(fotos.map(s => s.asset_ref).filter(Boolean));
  const klasseD = fotos.filter(s => s.asset_class === 'D');
  const klasseCinHigh = kaart.sections.filter(s => s.impact === 'HIGH' && s.asset_class === 'C' && ['M1', 'M2', 'M4'].includes(s.media_treatment));
  const ok = bestanden.length >= p.foto[0] && bestanden.length <= p.foto[1] && klasseD.length === 0 && klasseCinHigh.length === 0;
  return verdict('KP-10 FOTOBUDGET', ok ? 'PASS' : 'FAIL',
    `${bestanden.length} unieke bestanden, ${klasseD.length} klasse-D, ${klasseCinHigh.length} klasse-C in M1/M2/M4`,
    `${p.foto[0]}-${p.foto[1]} bestanden, 0 klasse-D, 0 klasse-C in een HIGH-podium`);
}

/** KP-11 INHOUD BLOKKEERT HET ONTWERP NIET, maar telt ook nooit als PASS.
    Een sectie waarvan de compositie instort zonder haar ongedekte cijfer is
    wel een ontwerpfout: dat is het ablatiecriterium. */
function G11_inhoud(kaart) {
  const pend = kaart.sections.filter(s => s.content_status === 'PENDING');
  const confl = kaart.sections.filter(s => s.content_status === 'CONFLICTING');
  const leunt = pend.filter(s => s.protagonist === 'metriek-bewijs' && (s.surface_hierarchy.equal_row?.count || 0) === 0 && s.visual_role === 'VR-F');
  const u = confl.length ? 'FAIL' : (pend.length ? 'NVT' : 'PASS');
  return verdict('KP-11 INHOUD', u, `${pend.length} PENDING, ${confl.length} CONFLICTING`, '0 CONFLICTING', {
    reden: pend.length ? `${pend.length} secties wachten op dekking; het ONTWERP wordt daar niet op afgekeurd` : undefined,
    vervanger: pend.length ? verdict('KP-11v ABLATIE', leunt.length === 0 ? 'PASS' : 'FAIL',
      `${leunt.length} secties storten in zonder hun ongedekte cijfer`, '0') : undefined,
    detail: pend.map(s => s.id),
  });
}

function G12_geometrie(kaart) {
  const met = kaart.sections.filter(s => s.geometry_role !== 'GEEN');
  if (met.length === 0) {
    return verdict('KP-12 GEOMETRIE', 'NVT', '0 geometrie-elementen', 'n.v.t.', {
      reden: 'de pagina declareert geen geometrie',
      vervanger: verdict('KP-12v RANDCONTACT', kaart.sections.some(s => ['M1', 'M2', 'M4', 'M6'].includes(s.media_treatment)) ? 'PASS' : 'FAIL',
        'minstens een randrakende beeldbehandeling', '>=1'),
    });
  }
  const rollen = uniek(met.map(s => s.geometry_role));
  return verdict('KP-12 GEOMETRIE', rollen.length >= 2 || met.length <= 2 ? 'PASS' : 'FAIL',
    `${met.length} dragers, ${rollen.length} rollen`, '>=2 rollen zodra er >2 dragers zijn');
}

/* --- XP-01 .. XP-03 : CROSS-PAGINA ------------------------------------- */
function vingerafdruk(kaart) {
  return {
    impact: kaart.sections.map(s => s.impact),
    blueprint: kaart.sections.map(s => s.blueprint),
    rol: kaart.sections.map(s => s.visual_role),
    media: kaart.sections.map(s => s.media_treatment),
    geo: kaart.sections.map(s => s.geometry_role),
    hoofdrol: kaart.sections.map(s => s.protagonist),
    overgang: kaart.sections.map(s => s.transition),
  };
}

/** positiegewijze overlap over de kortste lengte, per as */
function asOverlap(a, b) {
  const n = Math.min(a.length, b.length);
  let g = 0; for (let i = 0; i < n; i++) if (a[i] === b[i]) g++;
  return { gelijk: g, van: n, frac: n ? g / n : 0 };
}

function X01_kloon(kaart, andere) {
  const mij = vingerafdruk(kaart);
  const uitslagen = [];
  for (const [naam, k2] of andere) {
    const f2 = vingerafdruk(k2);
    const assen = Object.keys(mij).map(as => ({ as, ...asOverlap(mij[as], f2[as]) }));
    const boven = assen.filter(a => a.frac > 0.60 && a.van >= 4);
    uitslagen.push({ naam, assenBoven: boven.length, assen, lengteGelijk: kaart.sections.length === k2.sections.length });
  }
  const ergste = uitslagen.sort((a, b) => b.assenBoven - a.assenBoven)[0];
  if (!ergste) {
    return verdict('XP-01 KLOON', 'NVT', 'geen andere kaart om tegen te vergelijken', 'n.v.t.', {
      reden: 'het register bevat geen tweede kaart van dit type',
      vervanger: verdict('XP-01v EIGEN VINGERAFDRUK', uniek(mij.blueprint).length >= 3 ? 'PASS' : 'FAIL',
        `${uniek(mij.blueprint).length} verschillende blauwdrukken`, '>=3'),
    });
  }
  const ok = ergste.assenBoven < 3;
  return verdict('XP-01 KLOON', ok ? 'PASS' : 'FAIL',
    `${ergste.assenBoven} assen boven 60% tegen ${ergste.naam}`, '<3 assen',
    { detail: ergste.assen.filter(a => a.frac > 0.6).map(a => `${a.as} ${a.gelijk}/${a.van}`) });
}

function X02_highPatroon(kaart, andere) {
  const pos = k => k.sections.map((s, i) => s.impact === 'HIGH' ? i / Math.max(1, k.sections.length - 1) : null).filter(x => x !== null).map(x => x.toFixed(2)).join('|');
  const mijn = pos(kaart);
  const gelijk = andere.filter(([, k2]) => pos(k2) === mijn).map(([n]) => n);
  return verdict('XP-02 HIGH-PATROON', gelijk.length === 0 ? 'PASS' : 'FAIL',
    `${gelijk.length} kaarten met identieke relatieve HIGH-posities`, '0', { detail: gelijk });
}

function X03_hoofdrolpatroon(kaart, andere) {
  const sig = k => uniek(k.sections.filter(s => s.impact === 'HIGH').map(s => s.protagonist)).sort().join('+');
  const mijn = sig(kaart);
  const gelijk = andere.filter(([, k2]) => sig(k2) === mijn && mijn !== '').map(([n]) => n);
  return verdict('XP-03 HOOFDROLPATROON', gelijk.length <= 1 ? 'PASS' : 'FAIL',
    `${gelijk.length} andere kaarten met dezelfde HIGH-hoofdrolverzameling "${mijn}"`, '<=1', { detail: gelijk });
}

/* ------------------------------------------------- reviewervragen (R-xx) */
const REVIEWERVRAGEN = [
  { code: 'RQ-01', vraag: 'Draagt elke HIGH-sectie een duidelijk dominant visueel element, of concurreren er twee om de hoofdrol?', fail: 'twee elementen van vergelijkbaar gewicht zonder rangorde' },
  { code: 'RQ-02', vraag: 'Zou deze sectie vrijwel dezelfde compositie houden als je haar inhoud verving door een ONVERWANT Vibe-product? Zo ja, dan is zij generiek.', fail: 'ja — de compositie is inhoudsonafhankelijk' },
  { code: 'RQ-03', vraag: 'Communiceert de hiërarchie de inhoudsprioriteit, of ontstaat zij alleen door decoratief verschil in maat en kleur?', fail: 'alleen decoratief' },
  { code: 'RQ-04', vraag: 'Is de smalheid van deze sectie bedoeld voor de compositie, of is zij het gevolg van een container die zijn maximum raakt?', fail: 'gevolg van de cap' },
  { code: 'RQ-05', vraag: 'Hangt een vlak aan iets, of zweeft het in een raster?', fail: 'zweeft, terwijl de kaart een hechting claimt' },
  { code: 'RQ-06', vraag: 'Herkent de reviewer de pagina als Vibe ZONDER dat zij de homepage nadoet?', fail: 'alleen herkenbaar doordat zij de homepage nadoet' },
  { code: 'RQ-07', vraag: 'Draagt het beeld de sectie, of is het een illustratie naast de tekst?', fail: 'illustratie' },
  /* RQ-08 en RQ-09 zijn in de afsluitronde opgenomen uit de oude reviewerlaag B-01..B-07,
     die daarmee ophoudt een tweede gezag te zijn. Zie H7 §7.15. */
  { code: 'RQ-08', vraag: 'Zegt de tekst van deze sectie iets over DIT beeld, of zou een ander bestand uit de voorraad hier even goed passen? (omgekeerde ruiltest: inhoud blijft, beeld wisselt)', fail: 'het beeld is uitwisselbaar zonder dat een woord of een compositiebesluit verandert, of hetzelfde bestand staat elders op de site onder een ander onderwerp' },
  { code: 'RQ-09', vraag: 'Is het grootste lege veld een gecomponeerd interval, of restruimte die ontstond doordat een element niet meegroeide?', fail: 'restruimte — de leegte heeft geen eigenaar en verdwijnt zodra de inhoud langer wordt' },
];

/* ============================================================== uitvoeren */
function toetsKaart(kaart, schema, andere) {
  const r = [
    G01_schema(kaart, schema), G02_omvang(kaart), G03_impactritme(kaart), G04_modusband(kaart),
    G05_herhaling(kaart), G06_hechting(kaart), G07_gelijkeRijen(kaart), G08_highHoofdrol(kaart),
    G09_dragers(kaart), G10_fotobudget(kaart), G11_inhoud(kaart), G12_geometrie(kaart),
    X01_kloon(kaart, andere), X02_highPatroon(kaart, andere), X03_hoofdrolpatroon(kaart, andere),
  ];
  const fail = r.filter(x => x.uitkomst === 'FAIL');
  const nvt = r.filter(x => x.uitkomst === 'NVT');
  const pend = kaart.sections.filter(s => s.content_status === 'PENDING' || s.asset_status === 'PENDING');
  let eind;
  if (fail.length) eind = 'AFGEKEURD';
  else if (pend.length) eind = 'ONTWERP OK — CONTENT/ASSET PENDING';
  else eind = 'ONTWERP OK — WACHT OP VISUELE REVIEW';
  return { kaart, regels: r, fail, nvt, pend, eind };
}

function rapport(u) {
  const b = [];
  b.push(`\n${'='.repeat(78)}`);
  b.push(`${u.kaart.page}   [${u.kaart.archetype}/${u.kaart.variant}]   hoofdrol: ${u.kaart.visual_protagonist}`);
  b.push('='.repeat(78));
  for (const r of u.regels) {
    const vlag = r.uitkomst === 'PASS' ? ' PASS ' : r.uitkomst === 'FAIL' ? '>FAIL<' : ' NVT  ';
    b.push(`  ${vlag} ${r.code.padEnd(26)} ${String(r.waarde).padEnd(46)} eis: ${r.grens}`);
    if (r.fout) b.push(`         ! ${r.fout}`);
    if (r.reden) b.push(`         reden: ${r.reden}`);
    if (r.vervanger) b.push(`         vervanger ${r.vervanger.uitkomst}: ${r.vervanger.code} — ${r.vervanger.waarde}`);
    (r.detail || []).slice(0, 4).forEach(d => b.push(`         · ${d}`));
  }
  b.push(`  ---- ${u.eind}   (${u.fail.length} FAIL · ${u.nvt.length} NVT · ${u.pend.length} secties PENDING)`);
  return b.join('\n');
}

function pakket(u, andere) {
  const k = u.kaart;
  const L = [];
  L.push(`# REVIEWERPAKKET — ${k.page}`);
  L.push(`\n**${k.archetype} / ${k.variant}** · hoofdrol **${k.visual_protagonist}** · ${k.sections.length} secties\n`);
  L.push('## Impactkaart\n');
  L.push('| # | sectie | impact | modus | blauwdruk | hoofdrol | rol | media | vlakken | geometrie | overgang |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|');
  k.sections.forEach((s, i) => L.push(`| ${i + 1} | ${s.id} | ${s.impact} | ${s.canvas_mode} | ${s.blueprint} | ${s.protagonist} | ${s.visual_role} | ${s.media_treatment} | ${s.surface_hierarchy.pattern}${(s.surface_hierarchy.bindings || []).length ? ' +' + s.surface_hierarchy.bindings.length + 'h' : ''} | ${s.geometry_role} | ${s.transition} |`));
  L.push('\n## Machinepoort\n');
  L.push('| regel | uitkomst | waarde | eis |');
  L.push('|---|---|---|---|');
  u.regels.forEach(r => L.push(`| ${r.code} | **${r.uitkomst}** | ${r.waarde} | ${r.grens} |`));
  const pendC = k.sections.filter(s => s.content_status !== 'DEKKEND');
  const pendA = k.sections.filter(s => s.asset_status === 'PENDING');
  L.push(`\n## Content en assets\n`);
  L.push(`- CONTENT PENDING/CONFLICTING: ${pendC.length ? pendC.map(s => `${s.id} (${s.content_status})`).join(' · ') : 'geen'}`);
  L.push(`- ASSET PENDING: ${pendA.length ? pendA.map(s => s.id).join(' · ') : 'geen'}`);
  L.push(`\n## Cross-pagina\n`);
  const x = u.regels.filter(r => r.code.startsWith('X-'));
  x.forEach(r => L.push(`- ${r.code}: **${r.uitkomst}** — ${r.waarde}`));
  L.push(`\n## Desktopbewijs — in te vullen door de reviewer\n`);
  L.push('| breedte | werkbreedte % vw | dominant beeld % vw | leesmaat | grootste bedoelde leegte | oordeel |');
  L.push('|---|---|---|---|---|---|');
  ['1440', '1774', '1920'].forEach(w => L.push(`| ${w} | | | | | |`));
  L.push(`\n## Reviewervragen — NIET door de auteur te beantwoorden\n`);
  REVIEWERVRAGEN.forEach(q => L.push(`- **${q.code}** ${q.vraag}\n  - FAIL als: ${q.fail}\n  - antwoord: _______`));
  L.push(`\n## Verdict\n`);
  L.push(`- machinepoort: **${u.eind}**`);
  L.push(`- visuele review: _______ (AUTEUR MAG DIT NIET ZELF INVULLEN)`);
  L.push(`- eindoordeel: _______`);
  return L.join('\n');
}

/* ============================================================ zelftest
   Bewijst de twee eigenschappen die de vorige poort miste: een lege
   verzameling levert nooit PASS, en een NVT telt nooit als PASS. Dit is een
   toets op het HARNAS, niet op een pagina.                              */
function zelftest() {
  const t = [];
  const toon = (naam, ok, wat) => t.push({ naam, ok, wat });

  /* 1 — NVT zonder reden moet omslaan naar FAIL */
  let v = verdict('T1', 'NVT', '0 items', 'n.v.t.');
  toon('NVT zonder reden => FAIL', v.uitkomst === 'FAIL', v.uitkomst);

  /* 2 — NVT met reden maar zonder vervanger moet omslaan naar FAIL */
  v = verdict('T2', 'NVT', '0 items', 'n.v.t.', { reden: 'er zijn geen items' });
  toon('NVT zonder vervanger => FAIL', v.uitkomst === 'FAIL', v.uitkomst);

  /* 3 — NVT met een vervanger die zelf FAILt moet FAIL blijven */
  v = verdict('T3', 'NVT', '0 items', 'n.v.t.', { reden: 'geen items', vervanger: verdict('T3v', 'FAIL', '0', '>=1') });
  toon('NVT met falende vervanger => FAIL', v.uitkomst === 'FAIL', v.uitkomst);

  /* 4 — NVT met een vervanger die zelf NVT is, mag niet doorglippen */
  v = verdict('T4', 'NVT', '0', 'n.v.t.', { reden: 'geen items', vervanger: { code: 'T4v', uitkomst: 'NVT' } });
  toon('NVT met NVT-vervanger => FAIL', v.uitkomst === 'FAIL', v.uitkomst);

  /* 5 — alleen een NVT met een GESLAAGDE vervanger mag blijven staan */
  v = verdict('T5', 'NVT', '0', 'n.v.t.', { reden: 'geen items', vervanger: verdict('T5v', 'PASS', '3', '>=1') });
  toon('NVT met geslaagde vervanger => NVT', v.uitkomst === 'NVT', v.uitkomst);

  /* 6 — de LEGE-PAGINA-EXPLOIT. Een kaart met het minimum aan secties en
     overal leegte moet FAILen, niet door de poort glijden op NVT's. */
  const leeg = {
    card_version: '1.0', page: 'zelftest:leeg', archetype: 'B2', variant: 'leeg', status: 'CONTROL',
    canvas_strategy: { modes: { CANVAS: 0, DOCUMENT: 3, HYBRID: 0 } },
    visual_protagonist: 'propositie-tekst',
    sections: Array.from({ length: 3 }, (_, i) => ({
      id: `leeg-${i}`, purpose: 'niets', impact: 'QUIET', canvas_mode: 'DOCUMENT',
      blueprint: 'BR-06', protagonist: 'typografie', visual_role: 'VR-A', media_treatment: 'M0',
      surface_hierarchy: { pattern: '0D-1O-0A-0M', bindings: [] },
      geometry_role: 'GEEN', transition: 'RUST', content_status: 'DEKKEND', asset_status: 'NVT',
    })),
  };
  const u = toetsKaart(leeg, lees(join(DOCS, 'schema', 'composition-card.schema.json')), []);
  toon('lege pagina => AFGEKEURD', u.eind === 'AFGEKEURD' && u.fail.length >= 3, `${u.eind}, ${u.fail.length} FAIL`);

  /* 7 — geen enkele regel mag zonder uitkomst eindigen */
  const zonder = u.regels.filter(r => !['PASS', 'FAIL', 'NVT'].includes(r.uitkomst));
  toon('elke regel levert PASS/FAIL/NVT', zonder.length === 0, `${zonder.length} zonder`);

  /* 8 — geen enkele NVT in een echte uitslag mag als PASS worden geteld */
  const nvtAlsPass = u.regels.filter(r => r.uitkomst === 'NVT' && !r.vervanger);
  toon('geen NVT zonder vervanger in uitslag', nvtAlsPass.length === 0, `${nvtAlsPass.length}`);

  console.log('ZELFTEST VAN HET HARNAS');
  console.log('='.repeat(60));
  t.forEach(x => console.log(`  ${x.ok ? 'PASS' : 'FAIL'}  ${x.naam.padEnd(40)} ${x.wat}`));
  const f = t.filter(x => !x.ok).length;
  console.log(`\n  ${t.length} toetsen, ${f} FAIL`);
  process.exit(f ? 1 : 0);
}

/* ------------------------------------------------------------------ main */
const args = process.argv.slice(2);
if (args.includes('--zelftest')) zelftest();
const packetModus = args.includes('--packet');
const filter = args.filter(a => !a.startsWith('--'))[0];

const schema = lees(join(DOCS, 'schema', 'composition-card.schema.json'));
if (!existsSync(KAARTEN)) { console.error('geen docs/compositions/'); process.exit(2); }
const bestanden = readdirSync(KAARTEN).filter(f => f.endsWith('.json')).sort();
const alle = bestanden.map(f => [basename(f, '.json'), lees(join(KAARTEN, f))]);

/* Controlekaarten doen niet mee als vergelijkingsmateriaal voor elkaar, behalve
   de homepage: die IS de benchmark. */
const benchmark = alle.filter(([n, k]) => k.status === 'MASTER');

let regels = 0, fails = 0;
const uitslagen = [];
for (const [naam, kaart] of alle) {
  if (filter && !naam.includes(filter)) continue;
  const andere = alle.filter(([n, k]) => n !== naam && (k.status === 'MASTER' || k.status === 'PAPER' || k.status === 'MIGRATED'));
  const u = toetsKaart(kaart, schema, andere);
  uitslagen.push([naam, u]);
  regels += u.regels.length; fails += u.fail.length;
  if (packetModus) console.log(pakket(u, andere));
  else console.log(rapport(u));
}

if (!packetModus) {
  console.log(`\n${'='.repeat(78)}\nSAMENVATTING`);
  console.log('='.repeat(78));
  const b = uitslagen.map(([n, u]) => `  ${(u.fail.length ? 'AFGEKEURD' : u.pend.length ? 'OK/PENDING' : 'OK').padEnd(11)} ${n.padEnd(30)} ${u.fail.length} FAIL  ${u.nvt.length} NVT  ${u.fail.map(f => f.code.split(' ')[0]).join(',')}`);
  console.log(b.join('\n'));
  console.log(`\n  ${alle.length} kaarten · ${regels} regeluitkomsten · ${fails} FAIL`);
  console.log(`  registerintegriteit: ${existsSync(REGISTER) ? 'register aanwezig' : 'REGISTER ONTBREEKT'}`);
  if (existsSync(REGISTER)) {
    const reg = lees(REGISTER);
    const zonder = reg.pages.filter(p => !p.governance_status);
    console.log(`  ${reg.pages.length} pagina's in het register · ${zonder.length} zonder governance_status`);
  }
}
process.exit(0);
