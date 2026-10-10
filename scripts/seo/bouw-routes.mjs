/* ============================================================================
   VIBE ENERGY — ROUTEREGISTER EN PUBLICATIETOESTANDSMACHINE
   ----------------------------------------------------------------------------
   Genereert het VOLLEDIGE kandidaat-routeregister en zet per route de staat:

     PENDING  geen bestand, geen sitemapregel, geen canonical, geen interne link
     INDEX    alle verplichte poorten gehaald; publiek, in de sitemap, gelinkt
     NOINDEX  bewust publiek met een reden (de bestaande doorverwijsstubs, 404)

   Een route gaat NOOIT automatisch naar INDEX omdat er genoeg routes zijn of
   omdat een drempelgetal is gehaald. Elke INDEX-route heeft een reden en elke
   PENDING-route heeft er ook een.

   HET GEREEDHEIDSMODEL
   Niet elk lokaal feit maakt een pagina lokaal uniek. De weging drukt uit
   hoe ONDERSCHEIDEND een feit is:

     eigen project in deze gemeente                 4   uniek voor 11 gemeenten
     eigen zakelijk project dat deze familie draagt 4   uniek per familie
     bedrijventerreinen met naam en oppervlak       1   verschilt echt per gemeente
     aantal vestigingen (CBS)                       1   verschilt echt per gemeente
     netbeheerder                                   0   ~130 gemeenten delen er één

   De netbeheerder weegt dus NUL. Hij mag wel op de pagina staan als context,
   maar hij maakt een pagina niet uniek — precies het verschil dat de opdracht
   eist tussen echte lokale waarde en cosmetische tekstvariatie.

   Draaien: node scripts/seo/bouw-routes.mjs
   ============================================================================ */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeGemeente, routeGemeenteFamilie, routeProvincie, routeProvincieFamilie, REGIO_WORTEL, botsendeSlugs } from './lib/paden.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');

const lees = (...p) => JSON.parse(readFileSync(resolve(wortel, ...p), 'utf8'));

const provincies = lees('data', 'geo', 'provincies.json').provincies;
const gemeenten = lees('data', 'geo', 'gemeenten.json').gemeenten;
const opl = lees('data', 'seo', 'oplossingen.json');
const doel = lees('data', 'seo', 'nationaal-doel.json');
const vestigingen = lees('data', 'bewijs', 'vestigingen.json').per_gemeente;
const terreinen = lees('data', 'bewijs', 'bedrijventerreinen.json').per_gemeente;
const netbeheer = lees('data', 'bewijs', 'netbeheerders.json').per_gemeente;
const projecten = lees('data', 'bewijs', 'projecten-geo.json').per_gemeente;

/* Het redactionele besluit. Hierin staat welke routes die het bewijs WEL
   halen, toch bewust worden vastgehouden. Zonder dit bestand promoveert er
   niets automatisch. */
const besluitPad = resolve(wortel, 'data', 'seo', 'publicatiebesluit.json');
const besluit = existsSync(besluitPad) ? JSON.parse(readFileSync(besluitPad, 'utf8')) : { vrijgegeven: {}, vastgehouden: {} };

/* Welke families komen in het regionale register? Alle twaalf kandidaten,
   ook die permanent PENDING blijven — de opdracht vraagt om de volledige
   routegeneratiecapaciteit, niet om een ingekorte lijst. */
const families = opl.families.filter((f) => !f.samengevoegd_in);
const familiesAlle = opl.families;

/* ------------------------------------------------------------ slugbotsing */
const botsing = botsendeSlugs(gemeenten, familiesAlle);
if (botsing.length) {
  console.error('FATAAL — een familieslug is gelijk aan een gemeenteslug; /regios/<prov>/<x> zou dubbelzinnig zijn:');
  console.error(JSON.stringify(botsing, null, 2));
  process.exit(1);
}

/* ------------------------------------------------------- inhoudsbestanden */
function inhoudsbestanden() {
  const basis = resolve(wortel, 'data', 'inhoud');
  const uit = new Map();
  if (!existsSync(basis)) return uit;
  const loop = (map, prefix) => {
    for (const naam of readdirSync(map, { withFileTypes: true })) {
      const p = join(map, naam.name);
      if (naam.isDirectory()) loop(p, prefix);
      else if (naam.name.endsWith('.json')) {
        try {
          const j = JSON.parse(readFileSync(p, 'utf8'));
          if (j.route !== undefined) uit.set(String(j.route).replace(/^\/+/, ''), { pad: p, inhoud: j });
        } catch (e) {
          console.error(`inhoudsbestand onleesbaar: ${p} — ${e.message}`);
          process.exitCode = 1;
        }
      }
    }
  };
  loop(basis, '');
  return uit;
}
const inhoud = inhoudsbestanden();

/* ------------------------------------------------------------ bewijsscore */
function bewijsVanGemeente(g) {
  const code = g.gemeentecode;
  const items = [];
  const v = vestigingen[code];
  if (typeof v === 'number') items.push({ soort: 'vestigingen', gewicht: 1, waarde: v, scope: 'GEMEENTELIJK' });
  const t = terreinen[code] || [];
  if (t.length) items.push({ soort: 'bedrijventerreinen', gewicht: 1, waarde: t.length, scope: 'BEDRIJVENTERREIN' });
  const nb = netbeheer[code];
  if (nb) items.push({ soort: 'netbeheerder', gewicht: 0, waarde: nb.netbeheerder, scope: 'NETBEHEERDERGEBIED', zekerheid: nb.zekerheid });
  const p = projecten[code] || [];
  if (p.length) items.push({ soort: 'eigen_project', gewicht: 4, waarde: p.length, scope: 'PROJECTLOCATIE' });
  const score = items.reduce((a, b) => a + b.gewicht, 0);
  const hoogOnderscheidend = items.some((i) => i.gewicht >= 4);
  return { items, score, hoogOnderscheidend, projecten: p, terreinen: t.length, vestigingen: v ?? null, netbeheerder: nb || null };
}

/* Welke families een gemeente zakelijk kan dragen. */
function zakelijkeFamilies(code) {
  const p = projecten[code] || [];
  return [...new Set(p.flatMap((x) => x.families_zakelijk || []))];
}

const projectenPerProvincie = new Map();
for (const g of gemeenten) {
  const p = projecten[g.gemeentecode] || [];
  if (!p.length) continue;
  if (!projectenPerProvincie.has(g.provinciecode)) projectenPerProvincie.set(g.provinciecode, { gemeenten: [], projecten: [], familiesZakelijk: new Set() });
  const b = projectenPerProvincie.get(g.provinciecode);
  b.gemeenten.push(g.gemeentecode);
  b.projecten.push(...p.map((x) => x.slug));
  for (const f of zakelijkeFamilies(g.gemeentecode)) b.familiesZakelijk.add(f);
}

/* --------------------------------------------------------------- register */
const routes = [];
function zet(r) {
  routes.push(r);
}

/* ---- nationaal: bestaand ---- */
for (const b of doel.bestaand) {
  zet({
    route: b.route,
    soort: 'nationaal',
    subsoort: b.type,
    staat: 'INDEX',
    reden: 'Bestaande, geïndexeerde pagina. Blijft bestaan; URL niet gewijzigd.',
    bezit: b.bezit,
    bestaand: true,
  });
}

/* ---- nationaal: de projectpagina's ----
   Niet met de hand in nationaal-doel.json gezet maar afgeleid uit
   scripts/projecten.json, de bron waaruit scripts/maak-projecten.mjs ze ook
   genereert. Zo kan het register niet uit de pas lopen met de projectset. */
const projectData = JSON.parse(readFileSync(resolve(wortel, 'scripts', 'projecten.json'), 'utf8'));
for (const p of projectData.projecten) {
  zet({
    route: p.slug,
    soort: 'nationaal',
    subsoort: 'project',
    staat: 'INDEX',
    reden: 'Bestaande projectpagina, gegenereerd uit scripts/projecten.json door scripts/maak-projecten.mjs. URL niet gewijzigd.',
    bezit: `${p.titel} — ${p.plaats}`,
    bestaand: true,
  });
}

/* ---- nationaal: nieuw ---- */
for (const n of doel.nieuw) {
  const heeftInhoud = inhoud.has(n.route);
  zet({
    route: n.route,
    soort: 'nationaal',
    subsoort: n.type,
    staat: heeftInhoud ? 'INDEX' : 'PENDING',
    reden: heeftInhoud
      ? 'Inhoudsbestand aanwezig; de inhoudspoorten worden door scripts/seo/audit.mjs afgedwongen.'
      : 'Nog geen inhoudsbestand onder data/inhoud/. Architectonisch bestaat de route; publicatie wacht op redactie.',
    bezit: n.bezit,
    prioriteit: n.prioriteit,
    bestaand: false,
  });
}

/* ---- nationaal: subsidiepagina's, alleen als er een inhoudsbestand is ---- */
for (const [route, { inhoud: j }] of inhoud) {
  if (!route.startsWith('subsidies/')) continue;
  const geldig = Array.isArray(j.claims) && j.claims.length > 0 && j.claims.every((c) => c.bron_url && c.bron_datum);
  zet({
    route,
    soort: 'nationaal',
    subsoort: 'subsidie',
    staat: geldig ? 'INDEX' : 'PENDING',
    reden: geldig
      ? 'Regeling geverifieerd: elke claim draagt een bron-URL en een brondatum.'
      : 'Een subsidiepagina zonder bron-URL en brondatum per claim wordt niet gepubliceerd.',
    bezit: j.bezit || j.h1 || route,
    bestaand: false,
  });
}

/* ---- regionaal: wortel ---- */
const provinciesMetProject = provincies.filter((p) => projectenPerProvincie.has(p.provinciecode));
zet({
  route: REGIO_WORTEL,
  soort: 'regio',
  subsoort: 'wortel',
  staat: provinciesMetProject.length ? 'INDEX' : 'PENDING',
  reden: provinciesMetProject.length
    ? `Overzicht van ${provinciesMetProject.length} provincies met gerealiseerd werk. Geen lege hub.`
    : 'Geen enkele provincie heeft gepubliceerd bewijs; een lege hub wordt niet gepubliceerd.',
});

/* ---- regionaal: provinciehubs ---- */
for (const p of provincies) {
  const b = projectenPerProvincie.get(p.provinciecode);
  zet({
    route: routeProvincie(p.slug),
    soort: 'regio',
    subsoort: 'provincie',
    provinciecode: p.provinciecode,
    staat: b ? 'INDEX' : 'PENDING',
    reden: b
      ? `${b.projecten.length} gerealiseerd project(en) in ${b.gemeenten.length} gemeente(n) in deze provincie. De hub draagt eigen bewijs en is geen lege verzamelpagina.`
      : 'Geen gerealiseerd project in deze provincie. Een provinciehub zonder eigen bewijs zou alleen een lijst gemeentenamen zijn.',
    bewijs: b ? { projecten: b.projecten.length, gemeenten: b.gemeenten.length } : null,
  });
}

/* ---- regionaal: provincie x familie ----
   Het redactionele besluit in oplossingen.json.familieroutes_publiceren gaat
   vóór het bewijs. Staat dat op NEE, dan blijft de route PENDING met die
   reden — ook als het bewijs toereikend is. Dat is geen omweg maar precies de
   bedoeling van de toestandsmachine: bewijs is een noodzakelijke voorwaarde,
   geen voldoende voorwaarde. */
const FAMILIEROUTES = opl.familieroutes_publiceren || { besluit: 'JA', reden: '' };
const familieroutesAan = FAMILIEROUTES.besluit === 'JA';

for (const p of provincies) {
  const b = projectenPerProvincie.get(p.provinciecode);
  for (const f of familiesAlle) {
    const route = routeProvincieFamilie(p.slug, f.slug);
    const niveauOk = (f.regionale_niveaus || []).includes('provincie');
    const draagt = b ? b.familiesZakelijk.has(f.slug) : false;
    const bewijsOk = niveauOk && !f.samengevoegd_in && !!b && draagt;
    let staat = 'PENDING';
    let reden;
    if (f.samengevoegd_in) reden = `Familie samengevoegd in '${f.samengevoegd_in}'. Deze route krijgt nooit een eigen pagina; zie data/seo/oplossingen.json, sleutel consolidaties.`;
    else if (!niveauOk) reden = `Familie niet provinciaal zinvol: ${f.reden}`;
    else if (!b) reden = 'Geen gerealiseerd project in deze provincie.';
    else if (!draagt) reden = `Geen zakelijk project in deze provincie dat de familie '${f.slug}' aantoont. Een pagina zou lokaal bewijs suggereren dat er niet is.`;
    else if (!familieroutesAan) reden = `Bewijs toereikend, publicatie vastgehouden. ${FAMILIEROUTES.reden}`;
    else { staat = 'INDEX'; reden = `Aangetoond door minstens één zakelijk project in deze provincie dat ${f.naam.toLowerCase()} draagt.`; }
    zet({ route, soort: 'regio', subsoort: 'provincie-familie', provinciecode: p.provinciecode, familie: f.slug, staat, reden, bewijs_toereikend: bewijsOk });
  }
}

/* ---- regionaal: gemeentehubs ---- */
let bewijsVolledigMaarVastgehouden = 0;
for (const g of gemeenten) {
  const route = routeGemeente(g.provincie_slug, g.slug);
  const bw = bewijsVanGemeente(g);
  const vrij = besluit.vrijgegeven?.[route] || null;
  let staat = 'PENDING';
  let reden;
  if (bw.hoogOnderscheidend) {
    staat = 'INDEX';
    reden = `${bw.projecten.length} gerealiseerd project(en) in deze gemeente, plus ${bw.terreinen} bedrijventerrein(en) en een CBS-vestigingscijfer. Bewijsscore ${bw.score}.`;
  } else if (vrij) {
    staat = 'INDEX';
    reden = `Redactioneel vrijgegeven: ${vrij}`;
  } else if (bw.score >= 2) {
    bewijsVolledigMaarVastgehouden += 1;
    reden = `Bewijs voldoende (score ${bw.score}: ${bw.terreinen} bedrijventerrein(en) + CBS-vestigingscijfer) maar geen gerealiseerd project in deze gemeente. ${
      besluit.vastgehouden?.reden || 'Vastgehouden in afwachting van redactionele vrijgave.'
    }`;
  } else {
    reden = `Onvoldoende onderscheidend lokaal bewijs (score ${bw.score}). ${bw.terreinen === 0 ? 'Geen bedrijventerrein in deze gemeente, dus geen aantoonbare zakelijke energiemarkt.' : ''}`.trim();
  }
  zet({
    route,
    soort: 'regio',
    subsoort: 'gemeente',
    gemeentecode: g.gemeentecode,
    provinciecode: g.provinciecode,
    staat,
    reden,
    bewijsscore: bw.score,
    bewijs: {
      vestigingen: bw.vestigingen,
      bedrijventerreinen: bw.terreinen,
      netbeheerder: bw.netbeheerder ? bw.netbeheerder.netbeheerder : null,
      netbeheerder_zekerheid: bw.netbeheerder ? bw.netbeheerder.zekerheid : null,
      eigen_projecten: bw.projecten.length,
    },
  });

  /* ---- regionaal: gemeente x familie ---- */
  const zak = zakelijkeFamilies(g.gemeentecode);
  for (const f of familiesAlle) {
    const r2 = routeGemeenteFamilie(g.provincie_slug, g.slug, f.slug);
    const niveauOk = (f.regionale_niveaus || []).includes('gemeente');
    let s2 = 'PENDING';
    let reden2;
    const bewijsOk2 = niveauOk && !f.samengevoegd_in && zak.includes(f.slug);
    if (f.samengevoegd_in) reden2 = `Familie samengevoegd in '${f.samengevoegd_in}'; krijgt nooit een eigen route.`;
    else if (!niveauOk) reden2 = `Familie niet gemeentelijk zinvol: ${f.reden}`;
    else if (!zak.includes(f.slug)) reden2 = `Geen zakelijk project in deze gemeente dat '${f.slug}' aantoont.`;
    else if (!familieroutesAan) reden2 = `Bewijs toereikend, publicatie vastgehouden. ${FAMILIEROUTES.reden}`;
    else { s2 = 'INDEX'; reden2 = `Aangetoond door een zakelijk project in deze gemeente dat ${f.naam.toLowerCase()} draagt.`; }
    zet({ route: r2, soort: 'regio', subsoort: 'gemeente-familie', gemeentecode: g.gemeentecode, provinciecode: g.provinciecode, familie: f.slug, staat: s2, reden: reden2, bewijs_toereikend: bewijsOk2 });
  }
}

/* ---- bestaande doorverwijsstubs: NOINDEX met reden ---- */
const stubs = readdirSync(wortel)
  .filter((f) => f.endsWith('.html'))
  .filter((f) => {
    const s = readFileSync(resolve(wortel, f), 'utf8');
    return /http-equiv="refresh"/.test(s);
  })
  .map((f) => f.replace(/\.html$/, ''));
for (const s of stubs) {
  zet({
    route: s,
    soort: 'nationaal',
    subsoort: 'doorverwijsstub',
    staat: 'NOINDEX',
    reden: 'Bestaande URL die is opgegaan in een andere pagina. Blijft bestaan zodat links en zoekresultaten niet doodlopen; noindex met een canonical naar de opvolger.',
    bestaand: true,
  });
}
zet({ route: '404', soort: 'nationaal', subsoort: 'fout', staat: 'NOINDEX', reden: 'Foutpagina. Hoort nooit in de sitemap of in een canonical.', bestaand: true });

/* ---- Release 2: het nieuwskanaal ----
   Release 1 claimde hier alleen het padsegment 'nieuws' en liet de rest
   PENDING. Release 2.1 vult de toestandsmachine in volgens het contract in
   data/seo/nieuws-architectuur.json.

   DE KERN: EEN ARTIKEL PROMOVEERT NOOIT ZICHZELF.
   De redactionele staat staat in het inhoudsbestand en komt daar van een
   mens. Het intelligenceplatform schrijft artikelen weg als CONCEPT of
   TER_REDACTIE; alleen GOEDGEKEURD — mét naam en datum van wie het vrijgaf —
   kan hier naar INDEX. Er is geen drempelgetal, geen teller en geen
   tijdslot dat dat kan overrulen. Zie intelligence/src/site/nieuwsregister.ts
   voor de schrijvende kant.

   INGETROKKEN GEEFT GEEN NOINDEX-PAGINA MAAR GEEN PAGINA.
   De generator maakt alleen bestanden voor INDEX-routes en ruimt met het
   manifest op wat dat niet meer is. Een ingetrokken artikel verdwijnt dus en
   de URL geeft 404. Moet een ingetrokken artikel zijn URL houden, dan hoort
   er een doorverwijsstub te komen zoals de bestaande stubs in de wortel;
   dat is een redactionele handeling, geen automatische. */
const NIEUWS_WORTEL = 'nieuws';

/* De vier brontypen die een nieuwsfeit zelfstandig kunnen dragen. MARKTPARTIJ
   staat er bewust niet bij: een persbericht van een leverancier is een
   belanghebbende, geen vaststelling. Het contract schrijft deze lijst
   letterlijk voor. EIGEN_MEETDATA ook niet — eigen data is geen publiek
   controleerbare bron. */
const DRAGENDE_BRONSOORTEN = new Set(['WETGEVING', 'TOEZICHTHOUDER', 'NETBEHEERDER', 'STATISTIEK']);

const gemeentecodes = new Set(gemeenten.map((g) => g.gemeentecode));
const provinciecodes = new Set(provincies.map((p) => p.provinciecode));

/* Wat tot hier in het register staat, is wat een artikel als eigenaar mag
   aanwijzen. Het nieuwsblok staat daarom bewust ONDERAAN dit bestand. */
const staatVan = new Map(routes.map((r) => [r.route, r.staat]));

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Toetst één nieuwsartikel tegen de zes publicatiepoorten uit het contract.
 * Geeft de eerste reden terug waarom het NIET door mag; null betekent door.
 */
function weigerNieuws(j) {
  const staat = String(j.redactionele_staat || '').toUpperCase();

  if (staat === 'INGETROKKEN') return 'Redactionele staat is INGETROKKEN.';
  if (staat !== 'GOEDGEKEURD') {
    return `Redactionele staat is ${staat || 'niet gezet'}; alleen GOEDGEKEURD mag naar INDEX.`;
  }
  if (!j.goedgekeurd_door || !String(j.goedgekeurd_door).trim()) {
    return 'GOEDGEKEURD zonder `goedgekeurd_door`. Een goedkeuring zonder naam is geen goedkeuring.';
  }
  if (!ISO_DATUM.test(String(j.goedgekeurd_op || ''))) {
    return 'GOEDGEKEURD zonder geldige `goedgekeurd_op` (ISO-datum).';
  }
  if (!ISO_DATUM.test(String(j.gepubliceerd || ''))) {
    return '`gepubliceerd` ontbreekt of is geen ISO-datum; een nieuwsartikel zonder datum veroudert onzichtbaar.';
  }

  const bronnen = Array.isArray(j.bronnen) ? j.bronnen : [];
  if (!bronnen.length) return 'Geen enkele bron in `bronnen`.';
  for (const b of bronnen) {
    if (!b || !b.url || !b.naam) return 'Een bron zonder naam of URL.';
    if (!ISO_DATUM.test(String(b.datum || ''))) return `Bron '${b.naam}' zonder geldige raadpleegdatum.`;
  }
  const dragend = bronnen.filter((b) => DRAGENDE_BRONSOORTEN.has(String(b.soort || '').toUpperCase()));
  if (!dragend.length) {
    return `Geen dragende bron. Minstens één van ${[...DRAGENDE_BRONSOORTEN].join(', ')} is vereist; een marktpartij alleen is niet genoeg.`;
  }

  /* Elk cijfer met bron. Poort 10 van audit.mjs toetst de tekst zelf; hier
     wordt alleen afgedwongen dat het claimregister zelf compleet is. */
  const claims = Array.isArray(j.claims) ? j.claims : [];
  if (claims.some((c) => !c.bron_url || !c.bron_datum)) {
    return 'Een claim zonder `bron_url` of `bron_datum`.';
  }

  const eigenaar = String(j.onderwerp_eigenaar || '').replace(/^\/+/, '');
  if (!eigenaar) {
    return '`onderwerp_eigenaar` ontbreekt. Een nieuwsartikel leent zijn commerciële intentie en moet zeggen van wie.';
  }
  if (staatVan.get(eigenaar) !== 'INDEX') {
    return `Onderwerp-eigenaar '${eigenaar}' staat niet op INDEX (${staatVan.get(eigenaar) ?? 'bestaat niet'}).`;
  }

  for (const code of j.regio_links || []) {
    if (!gemeentecodes.has(code) && !provinciecodes.has(code)) {
      return `regio_link '${code}' is geen bestaande gemeentecode of provinciecode uit data/geo.`;
    }
  }

  for (const r of j.oplossing_links || []) {
    const k = String(r).replace(/^\/+/, '');
    if (staatVan.get(k) !== 'INDEX') return `oplossing_link '${k}' staat niet op INDEX.`;
  }

  return null;
}

const nieuwsRoutes = [...inhoud.keys()].filter((r) => r === `${NIEUWS_WORTEL}` || r.startsWith(`${NIEUWS_WORTEL}/`));
let nieuwsIndex = 0;

for (const route of nieuwsRoutes.sort()) {
  if (route === NIEUWS_WORTEL) continue; /* de hub bouwt de generator zelf */
  const j = inhoud.get(route).inhoud;
  const weigering = weigerNieuws(j);
  if (!weigering) nieuwsIndex += 1;
  zet({
    route,
    soort: 'nationaal',
    subsoort: 'nieuws',
    staat: weigering ? 'PENDING' : 'INDEX',
    reden: weigering
      ? `Niet gepubliceerd: ${weigering}`
      : `Goedgekeurd door ${j.goedgekeurd_door} op ${j.goedgekeurd_op}; ${(j.bronnen || []).length} bron(nen), waarvan minstens één dragend.`,
    bezit: j.onderwerp_eigenaar ? `leent van ${j.onderwerp_eigenaar}` : null,
    redactionele_staat: String(j.redactionele_staat || '').toUpperCase() || null,
    bestaand: false,
  });
}

/* De hub. Een overzichtspagina zonder artikelen is een lege pagina, dus hij
   komt pas op INDEX als er iets te overzien is. Zo blijft het kanaal volledig
   geïmplementeerd en tegelijk onzichtbaar tot de redactie iets vrijgeeft. */
zet({
  route: NIEUWS_WORTEL,
  soort: 'nationaal',
  subsoort: 'nieuws-hub',
  staat: nieuwsIndex > 0 ? 'INDEX' : 'PENDING',
  reden:
    nieuwsIndex > 0
      ? `Overzicht van ${nieuwsIndex} gepubliceerd(e) artikel(en).`
      : `Geen enkel goedgekeurd artikel (${nieuwsRoutes.filter((r) => r !== NIEUWS_WORTEL).length} kandidaten in data/inhoud/nieuws/). Een lege nieuwshub wordt niet gepubliceerd.`,
  bestaand: false,
});

/* ----------------------------------------------------------- dubbele routes */
const gezien = new Map();
const dubbel = [];
for (const r of routes) {
  if (gezien.has(r.route)) dubbel.push({ route: r.route, soorten: [gezien.get(r.route), r.subsoort] });
  gezien.set(r.route, r.subsoort);
}
if (dubbel.length) {
  console.error('FATAAL — dezelfde route staat twee keer in het register:');
  console.error(JSON.stringify(dubbel.slice(0, 20), null, 2));
  process.exit(1);
}

/* ------------------------------------------------------------- wegschrijven */
const tel = (p) => routes.filter(p).length;
const samenvatting = {
  totaal_kandidaten: routes.length,
  index: tel((r) => r.staat === 'INDEX'),
  pending: tel((r) => r.staat === 'PENDING'),
  noindex: tel((r) => r.staat === 'NOINDEX'),
  nationaal: {
    totaal: tel((r) => r.soort === 'nationaal'),
    index: tel((r) => r.soort === 'nationaal' && r.staat === 'INDEX'),
    pending: tel((r) => r.soort === 'nationaal' && r.staat === 'PENDING'),
    noindex: tel((r) => r.soort === 'nationaal' && r.staat === 'NOINDEX'),
    bestaand: tel((r) => r.soort === 'nationaal' && r.bestaand),
    nieuw_index: tel((r) => r.soort === 'nationaal' && !r.bestaand && r.staat === 'INDEX'),
  },
  regio: {
    totaal: tel((r) => r.soort === 'regio'),
    index: tel((r) => r.soort === 'regio' && r.staat === 'INDEX'),
    pending: tel((r) => r.soort === 'regio' && r.staat === 'PENDING'),
    provincie_hubs_index: tel((r) => r.subsoort === 'provincie' && r.staat === 'INDEX'),
    gemeente_hubs_index: tel((r) => r.subsoort === 'gemeente' && r.staat === 'INDEX'),
    provincie_familie_index: tel((r) => r.subsoort === 'provincie-familie' && r.staat === 'INDEX'),
    gemeente_familie_index: tel((r) => r.subsoort === 'gemeente-familie' && r.staat === 'INDEX'),
    gemeente_familie_kandidaten: tel((r) => r.subsoort === 'gemeente-familie'),
    provincie_familie_kandidaten: tel((r) => r.subsoort === 'provincie-familie'),
    gemeente_hubs_bewijs_volledig_vastgehouden: bewijsVolledigMaarVastgehouden,
    familieroutes_besluit: FAMILIEROUTES.besluit,
    gemeente_familie_bewijs_toereikend: tel((r) => r.subsoort === 'gemeente-familie' && r.bewijs_toereikend),
    provincie_familie_bewijs_toereikend: tel((r) => r.subsoort === 'provincie-familie' && r.bewijs_toereikend),
  },
  bewijsdekking: {
    gemeenten_totaal: gemeenten.length,
    met_vestigingscijfer: gemeenten.filter((g) => typeof vestigingen[g.gemeentecode] === 'number').length,
    met_bedrijventerrein: gemeenten.filter((g) => (terreinen[g.gemeentecode] || []).length > 0).length,
    met_netbeheerder: gemeenten.filter((g) => netbeheer[g.gemeentecode]).length,
    met_eigen_project: gemeenten.filter((g) => (projecten[g.gemeentecode] || []).length > 0).length,
    zonder_bedrijventerrein: gemeenten.filter((g) => (terreinen[g.gemeentecode] || []).length === 0).map((g) => `${g.gemeentecode} ${g.naam}`),
  },
};

mkdirSync(resolve(wortel, 'data', 'seo'), { recursive: true });
writeFileSync(
  resolve(wortel, 'data', 'seo', 'routes.json'),
  JSON.stringify(
    {
      _toelichting:
        'Gegenereerd door scripts/seo/bouw-routes.mjs. Niet met de hand bijwerken. PENDING betekent: geen bestand, geen sitemapregel, geen canonical, geen interne link.',
      _gegenereerd: process.env.ROUTES_DATUM || new Date().toISOString().slice(0, 10),
      samenvatting,
      routes: routes.sort((a, b) => a.route.localeCompare(b.route)),
    },
    null,
    2
  ) + '\n'
);

console.log(JSON.stringify(samenvatting, null, 2));
