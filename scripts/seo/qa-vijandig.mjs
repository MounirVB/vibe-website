/* ============================================================================
   VIBE ENERGY — VIJANDIGE QA: BREEKT DE POORT ALS JE HEM BREEKT?
   ----------------------------------------------------------------------------
   Zestien groene poorten zeggen niets zolang niemand heeft geprobeerd ze rood
   te krijgen. Een poort die nooit faalt is niet bewezen streng; hij is
   onbewezen. Dit script injecteert per scenario één echt defect in een KOPIE
   van de werkboom, draait de keten daar, en eist dat de juiste poort FAALT.

   Een scenario dat GROEN blijft is hier een FOUT. Dat is de hele logica van
   dit bestand en het is omgekeerd aan alle andere poorten in deze repo.

   De kopie staat in een tijdelijke map; de echte werkboom wordt niet
   aangeraakt. Elk scenario krijgt een verse kopie, want een defect mag niet
   naar het volgende scenario lekken.

   Draaien: node scripts/seo/qa-vijandig.mjs [--houd]
            --houd laat de tijdelijke mappen staan om in te kijken.
   ============================================================================ */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');
const HOUD = process.argv.includes('--houd');

/* Wat een scenario nodig heeft om de keten te draaien. De zware media blijven
   achter: geen enkele poort leest een mp4 of een webp uit. */
const NODIG = ['data', 'scripts', 'docs', 'vibe', 'img', 'assets', 'api', 'intelligence'];

function versKopie(naam) {
  const map = mkdtempSync(join(tmpdir(), `vibe-vijandig-${naam}-`));
  for (const d of NODIG) {
    const bron = resolve(wortel, d);
    if (existsSync(bron)) cpSync(bron, join(map, d), { recursive: true });
  }
  /* De HTML in de wortel: nodig voor herstel-bestaand, stubdetectie en de
     duplicaat- en linkpoorten. */
  for (const f of execFileSync('git', ['-C', wortel, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter(Boolean)) {
    if (f.includes('/')) continue;
    if (!/\.(html|txt|xml|json|css|js)$/.test(f)) continue;
    const bron = resolve(wortel, f);
    if (existsSync(bron)) cpSync(bron, join(map, f));
  }
  /* De geneste gegenereerde HTML. */
  for (const d of ['regios', 'kennis', 'sectoren', 'toepassingen']) {
    const bron = resolve(wortel, d);
    if (existsSync(bron)) cpSync(bron, join(map, d), { recursive: true });
  }
  return map;
}

function lees(map, ...p) {
  return JSON.parse(readFileSync(resolve(map, ...p), 'utf8'));
}
function schrijf(map, pad, data) {
  const vol = resolve(map, pad);
  mkdirSync(dirname(vol), { recursive: true });
  writeFileSync(vol, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
}

/** Draait een script in de kopie en geeft {code, uit} terug. */
function draai(map, script, env = {}) {
  try {
    const uit = execFileSync('node', [resolve(map, 'scripts', 'seo', script)], {
      cwd: map,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
      maxBuffer: 64 * 1024 * 1024,
    });
    return { code: 0, uit };
  } catch (e) {
    return { code: e.status ?? 1, uit: (e.stdout || '') + (e.stderr || '') };
  }
}

/** Draait de hele keten offline en geeft de auditbevinding terug. */
function ketenEnAudit(map) {
  draai(map, 'bouw-routes.mjs');
  draai(map, 'genereer.mjs');
  draai(map, 'sitemap.mjs');
  return draai(map, 'audit.mjs');
}

/* ÉÉN TEKEN SCHAKELDE EEN POORT UIT EN DEZE QA MERKTE HET NIET.

   poortFaalt() las alleen de TABELRIJ van audit.mjs, en de aanroeper gooide
   `code` weg. Maar audit.mjs telt zijn eindoordeel als
   `fouten.filter(p => !p.ok && p.verplicht)`: zet je bij één poort de tweede
   parameter van poort() op `false`, dan print de rij nog steeds FAIL terwijl
   het script "EINDOORDEEL POORT = PASS" afdrukt en met exitcode 0 eindigt.
   Deze QA zag die FAIL-rij, riep GOED, en de release liep door met een
   uitgeschakelde poort. Alle zestien poorten zijn verplicht; dat is precies
   het soort gegeven dat per ongeluk verschuift.

   Een vijandig scenario is daarom pas geslaagd als DRIE dingen kloppen:
   de rij van poort n staat op FAIL, het EINDOORDEEL is FAIL, en de exitcode
   is niet nul. Dat is wat CI werkelijk afgaat. */
function poortFaalt(r, n) {
  const uit = typeof r === 'string' ? r : r.uit;
  const code = typeof r === 'string' ? null : r.code;
  const rijFaalt = new RegExp(`^\\s*${n}\\s+\\S.*\\sFAIL\\s`, 'm').test(uit);
  const eindFaalt = /EINDOORDEEL POORT = FAIL/.test(uit);
  const codeFaalt = code === null ? null : code !== 0;
  if (rijFaalt && eindFaalt && codeFaalt !== false) return { ok: true, waarom: `poort ${n} faalt zoals het hoort (rij FAIL, eindoordeel FAIL, exit ${code ?? '?'})` };
  const mist = [];
  if (!rijFaalt) mist.push(`de rij van poort ${n} staat niet op FAIL`);
  if (!eindFaalt) mist.push('het EINDOORDEEL is niet FAIL');
  if (codeFaalt === false) mist.push('de exitcode is 0');
  return {
    ok: false,
    waarom:
      rijFaalt && !eindFaalt
        ? `poort ${n} meldt FAIL in de tabel maar het script eindigt met PASS en exit ${code} — staat 'verplicht' van deze poort nog op true?`
        : `poort ${n} bleef GROEN terwijl het defect erin zat (${mist.join('; ')})`,
  };
}

/* De poortinventaris. Een poort die verdwijnt of niet-verplicht wordt, is een
   verzwakking van de keten en hoort niet stil te gebeuren. Deze lijst is geen
   documentatie maar een TOETS: wijkt audit.mjs ervan af, dan faalt de QA en
   moet iemand deze lijst met opzet bijwerken. */
const POORTINVENTARIS = 16;

/** Een willekeurig script in de kopie draaien, met de exitcode erbij. */
function draaiScript(map, pad, env = {}) {
  try {
    const uit = execFileSync('node', [pad], {
      cwd: map,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
      maxBuffer: 64 * 1024 * 1024,
    });
    return { code: 0, uit };
  } catch (e) {
    return { code: e.status ?? 1, uit: (e.stdout || '') + (e.stderr || '') };
  }
}

/** De eerste <n> doorverwijsstubs uit het register van de KOPIE. */
function stubRoutes(map, n = 1) {
  const reg = lees(map, 'data', 'seo', 'routes.json');
  const r = reg.routes.filter((x) => x.subsoort === 'doorverwijsstub').map((x) => x.route);
  if (r.length < n) throw new Error(`minder dan ${n} doorverwijsstub(s) in deze situatie`);
  return r.slice(0, n);
}

/**
 * De bestemming van een stub verleggen naar <naarRoute>, in canonical ÉN in
 * de meta-refresh ÉN in de JS-vervanging. Alle drie, want een scenario dat
 * er maar één verlegt, zou falen op "refresh wijkt af van canonical" in
 * plaats van op de bestemming zelf — en dan bewijst het de verkeerde poort.
 */
function verlegStub(map, route, naarRoute) {
  const p = resolve(map, `${route}.html`);
  if (!existsSync(p)) throw new Error(`stubbestand ontbreekt: ${route}.html`);
  const naarHref = naarRoute === '' ? '/' : `/${naarRoute}`;
  const naarUrl = naarRoute === '' ? 'https://www.vibeenergy.nl/' : `https://www.vibeenergy.nl/${naarRoute}`;
  const uit = readFileSync(p, 'utf8')
    .replace(/(<link rel="canonical" href=")[^"]*(")/i, `$1${naarUrl}$2`)
    .replace(/(http-equiv="refresh"[^>]*content="0; url=)[^"]*(")/i, `$1${naarHref}$2`)
    .replace(/(location\.replace\(')[^']*('\))/i, `$1${naarHref}$2`);
  writeFileSync(p, uit);
}

/* GEEN HARDGECODEERDE GEMEENTEPADEN IN DE SCENARIO'S.

   Eerst stond hier letterlijk 'regios/fryslan/leeuwarden'. Dat werkt zolang
   de hele inventaris live staat, maar bij een GEFASEERDE uitrol is Fryslân er
   nog niet en viel het scenario om met ENOENT — niet omdat de poort faalde,
   maar omdat de harnas naar een bestand greep dat er niet was. Een vijandige
   test die zichzelf breekt bewijst niets.

   Deze twee helpers kiezen hun slachtoffer uit het register van de KOPIE, dus
   altijd een route die in díe situatie echt bestaat. */
function gepubliceerdeGemeenten(map, n = 1) {
  const reg = lees(map, 'data', 'seo', 'routes.json');
  const r = reg.routes.filter((x) => x.subsoort === 'gemeente' && x.staat === 'INDEX').map((x) => x.route);
  if (r.length < n) throw new Error(`minder dan ${n} gepubliceerde gemeenten in deze situatie`);
  return r.slice(0, n);
}
function eenPendingGemeente(map) {
  const reg = lees(map, 'data', 'seo', 'routes.json');
  const r = reg.routes.find((x) => x.subsoort === 'gemeente' && x.staat === 'PENDING');
  if (!r) throw new Error('geen enkele gemeente op PENDING; scenario niet uitvoerbaar');
  return r.route;
}

/* ========================================================== de scenario's */
const SCENARIOS = [
  {
    naam: 'PENDING-route krijgt stiekem een bestand',
    waarom:
      'De hele toestandsmachine hangt hieraan: PENDING betekent GEEN bestand. Een los bestand in de webroot is ' +
      'een indexeerbare pagina die in geen enkel register staat.',
    poort: 1,
    breek(map) {
      const pending = eenPendingGemeente(map);
      schrijf(map, `${pending}.html`, '<!doctype html><html lang="nl"><body><main><h1>Spook</h1></main></body></html>');
    },
  },
  {
    naam: 'gemeente vrijgegeven zonder bedrijventerrein',
    waarom:
      'Dit is precies de drempel die Release 3.1 niet mag verlagen: twee onafhankelijke bronnen. Een vrijgave ' +
      'zonder IBIS-terrein heeft er maar één.',
    poort: 3,
    breek(map) {
      const b = lees(map, 'data', 'seo', 'publicatiebesluit.json');
      /* Rozendaal heeft geen bedrijventerrein en hoort niet vrijgegeven te zijn. */
      b.vrijgegeven['regios/gelderland/rozendaal'] = 'vijandige test: vrijgave zonder bewijs';
      schrijf(map, 'data/seo/publicatiebesluit.json', b);
    },
  },
  {
    naam: 'bewijs staat in het register maar niet op de pagina',
    waarom:
      'Een registerregel die bewijs claimt terwijl de pagina het niet toont, is het gat waar dit hele systeem ' +
      'voor is gebouwd. Poort 3 zoekt het terrein en het vestigingsaantal letterlijk in de HTML.',
    poort: 3,
    naKeten: true,
    breek(map) {
      /* Sloop de bewijsalinea uit een gegenereerde pagina, NA de keten: haal
         de naam van het grootste bedrijventerrein weg. */
      const [route] = gepubliceerdeGemeenten(map, 1);
      const reg = lees(map, 'data', 'seo', 'routes.json');
      const code = reg.routes.find((r) => r.route === route).gemeentecode;
      const terr = lees(map, 'data', 'bewijs', 'bedrijventerreinen.json').per_gemeente[code] || [];
      const naam = terr.find((t) => t.naam && (t.ha_netto ?? t.ha_bruto)).naam;
      const p = resolve(map, `${route}.html`);
      const s = readFileSync(p, 'utf8');
      writeFileSync(p, s.split(naam).join('Weggepoetst'));
    },
  },
  {
    naam: 'twee pagina\'s met dezelfde canonical',
    waarom: 'Een dubbele canonical laat twee URL\'s om dezelfde plek vechten en maakt de keuze voor de zoekmachine.',
    poort: 5,
    naKeten: true,
    breek(map) {
      const [a, b] = gepubliceerdeGemeenten(map, 2);
      const p = resolve(map, `${b}.html`);
      const s = readFileSync(p, 'utf8');
      writeFileSync(p, s.split(b).join(a));
    },
  },
  {
    naam: 'interne link naar een PENDING-route',
    waarom: 'Een link naar een niet-bestaande pagina is een 404 voor de bezoeker en verspild crawlbudget.',
    poort: 7,
    naKeten: true,
    breek(map) {
      const [route] = gepubliceerdeGemeenten(map, 1);
      const pending = eenPendingGemeente(map);
      const p = resolve(map, `${route}.html`);
      const s = readFileSync(p, 'utf8');
      writeFileSync(p, s.replace('</main>', `<p><a href="/${pending}">dode link</a></p></main>`));
    },
  },
  {
    naam: 'verboden claim uit het claimregister op een nieuwe pagina',
    waarom:
      'docs/vibe-claims-register-v2.md is bindend. Een verwijderde claim die via de inhoudsdata terugkruipt moet ' +
      'blokkeren, niet adviseren.',
    poort: 10,
    naKeten: true,
    breek(map) {
      const [route] = gepubliceerdeGemeenten(map, 1);
      const p = resolve(map, `${route}.html`);
      const s = readFileSync(p, 'utf8');
      writeFileSync(p, s.replace('</main>', '<p>Wij realiseerden 47 projecten met 98% uptime.</p></main>'));
    },
  },
  {
    naam: 'twee gemeentepagina\'s met bijna dezelfde inhoud',
    waarom:
      'De duplicaatpoort is de reden dat 327 gemeenten een release lang zijn vastgehouden. Hij moet een echte ' +
      'kloon zien, anders beschermt hij niets.',
    poort: 11,
    naKeten: true,
    breek(map) {
      const [a, b] = gepubliceerdeGemeenten(map, 2);
      const bron = readFileSync(resolve(map, `${a}.html`), 'utf8');
      const doel = resolve(map, `${b}.html`);
      const s = readFileSync(doel, 'utf8');
      /* Neem de hoofdtekst van Assen over, houd de kop van Meppel: dat is
         precies het patroon 'zelfde sjabloon, andere plaatsnaam'. */
      const main = (bron.match(/<main\b[^>]*>[\s\S]*<\/main>/i) || [])[0];
      writeFileSync(doel, s.replace(/<main\b[^>]*>[\s\S]*<\/main>/i, main));
    },
  },
  {
    naam: 'twee pagina\'s met dezelfde titel en H1',
    waarom: 'Kannibalisatie tussen eigen pagina\'s. Gemeten gevonden bij provincie en gemeente Groningen.',
    poort: 12,
    naKeten: true,
    breek(map) {
      const [a, b] = gepubliceerdeGemeenten(map, 2);
      const bron = readFileSync(resolve(map, `${a}.html`), 'utf8');
      const titelA = (bron.match(/<title>([^<]*)<\/title>/) || [])[1];
      const h1A = (bron.match(/<h1[^>]*>([^<]*)<\/h1>/) || [])[1];
      const p = resolve(map, `${b}.html`);
      const s = readFileSync(p, 'utf8');
      writeFileSync(
        p,
        s
          .replace(/<title>[^<]*<\/title>/, `<title>${titelA}</title>`)
          .replace(/<h1([^>]*)>[^<]*<\/h1>/, `<h1$1>${h1A}</h1>`)
      );
    },
  },
  {
    naam: 'kwaadaardige inhoud in een externe bron',
    waarom:
      'De terreinnamen komen uit een extern WFS-endpoint en belanden op honderden publieke pagina\'s. Een naam ' +
      'met HTML erin mag geen markup worden. Dit scenario toetst de ONTSNAPPING, niet een poort.',
    poort: null,
    eigenToets: true,
    breek(map) {
      /* Kies een gemeente die ECHT op INDEX staat. Een willekeurige sleutel
         uit het bewijsbestand kan een gemeente zijn die (nog) niet is
         vrijgegeven — bij een gefaseerde uitrol is dat zelfs waarschijnlijk,
         en dan genereert de keten geen pagina en toetst dit scenario niets.
         Gemeten: onder fase 1 viel het scenario daardoor om op "de pagina is
         niet gegenereerd". */
      const t = lees(map, 'data', 'bewijs', 'bedrijventerreinen.json');
      const reg = lees(map, 'data', 'seo', 'routes.json');
      const kandidaat = reg.routes.find(
        (r) => r.subsoort === 'gemeente' && r.staat === 'INDEX' && (t.per_gemeente[r.gemeentecode] || []).length
      );
      if (!kandidaat) throw new Error('geen gemeente op INDEX met een bedrijventerrein; scenario niet uitvoerbaar');
      const code = kandidaat.gemeentecode;
      t.per_gemeente[code][0].naam = '<script>alert(1)</script><img src=x onerror=alert(2)>';
      schrijf(map, 'data/bewijs/bedrijventerreinen.json', t);
      return { code };
    },
    toets(map, ctx) {
      const geo = lees(map, 'data', 'geo', 'gemeenten.json');
      const g = geo.gemeenten.find((x) => x.gemeentecode === ctx.code);
      const p = resolve(map, `regios/${g.provincie_slug}/${g.slug}.html`);
      if (!existsSync(p)) return { ok: false, waarom: 'de pagina is niet gegenereerd, dus niets getoetst' };
      const s = readFileSync(p, 'utf8');
      const rauwScript = /<script>alert\(1\)<\/script>/.test(s);
      const rauwImg = /<img src=x onerror=/.test(s);
      const ontsnapt = /&lt;script&gt;alert\(1\)&lt;\/script&gt;/.test(s);
      if (rauwScript || rauwImg) return { ok: false, waarom: 'de injectie staat ONGEESCAPED in de HTML' };
      if (!ontsnapt) return { ok: false, waarom: 'de naam staat er niet en is ook niet geescaped teruggevonden' };
      return { ok: true, waarom: 'de injectie staat geescaped op de pagina, niet als markup' };
    },
  },
  {
    naam: 'intern bestand sluipt de publieke set in',
    waarom:
      'De allowlist is het contract. Een nieuwe interne map die iemand morgen toevoegt moet de poort rood maken, ' +
      'niet stil gepubliceerd worden.',
    poort: null,
    eigenToets: true,
    breek(map) {
      schrijf(map, 'geheimen.env.txt', 'API_SLEUTEL=mag-niet-publiek\n');
      schrijf(map, 'data/intern-nieuw.json', '{"intern":true}\n');
    },
    toets(map) {
      /* publiek-artefact.mjs leest `git ls-files`: dat IS zijn definitie van
         "wat er in de repo zit". De kopie krijgt daarom een eigen git-repo,
         zodat de ECHTE poort draait en niet een nagebouwde variant. */
      for (const args of [['init', '-q'], ['add', '-A']]) {
        execFileSync('git', ['-C', map, ...args], { stdio: 'ignore' });
      }
      /* De poort exit met code 1 als hij rood is, en dat is hier juist de
         GEWENSTE uitkomst. execFileSync gooit dan; de uitvoer zit in e.stdout. */
      let r;
      try {
        r = execFileSync('node', [resolve(map, 'scripts', 'publiek-artefact.mjs')], {
          cwd: map,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          maxBuffer: 64 * 1024 * 1024,
        }).toString();
      } catch (e) {
        r = String(e.stdout || '') + String(e.stderr || '');
      }
      /* De poort meldt zelf of de excludelijst het nieuwe interne bestand
         dekt. Hij MOET hier rood zijn: railpack.json weet van geen van beide. */
      const rood = /EINDOORDEEL PUBLIEK ARTEFACT = FAIL/.test(r);
      const geheimPubliek = /geheimen\.env\.txt/.test(r) && /publieke set/.test(r);
      if (!rood) return { ok: false, waarom: 'de allowlistpoort bleef GROEN met een onbekend intern bestand erbij' };
      return {
        ok: true,
        waarom: `de allowlistpoort valt om${geheimPubliek ? ' en noemt het bestand bij naam' : ''}`,
      };
    },
  },

  /* ============================================================ SEO 3.2
     Vijf scenario's voor defecten die tot deze release ONGEDEKT waren. Elk
     is eerst op de oude code gemeten en bleef daar GROEN; dat is de reden
     dat ze bestaan. ============================================================ */

  {
    naam: 'de halve site wordt gedepubliceerd',
    waarom:
      'Gemeten op edc10d2: `vrijgeven-r31.mjs --fase 1` (aanbevolen in bouw.mjs:52) plus een normale ketenrun bracht ' +
      '430 INDEX-routes naar 116 en verwijderde 314 HTML-bestanden, waarna audit.mjs, publicatiecontract.mjs, ' +
      'qa-vijandig en — na de commit — ook publiek-artefact ALLE exit 0 gaven. Krimp is onzichtbaar voor elke poort ' +
      'die alleen de huidige stand toetst.',
    eigenToets: true,
    breek(map) {
      /* De basis-INDEX-set als BESTAND, want een verse kopie heeft geen
         `.git` (NODIG kopieert hem niet) en git geeft daar exit 128. Dat is
         precies waarom de grendel een bestandsval-terug heeft. */
      const reg = lees(map, 'data', 'seo', 'routes.json');
      const basis = reg.routes.filter((r) => r.staat === 'INDEX').map((r) => r.route);
      schrijf(map, 'basis-index.json', basis);
      /* Depubliceer net zoals het echte ongeluk dat doet: via het
         publicatiebesluit, en dan intern consistent doorwerken. */
      const slachtoffers = gepubliceerdeGemeenten(map, 12);
      const besluit = lees(map, 'data', 'seo', 'publicatiebesluit.json');
      for (const r of slachtoffers) delete besluit.vrijgegeven[r];
      schrijf(map, 'data/seo/publicatiebesluit.json', besluit);
      return { basis: basis.length, weg: slachtoffers.length };
    },
    toets(map, ctx) {
      const reg = lees(map, 'data', 'seo', 'routes.json');
      const nu = reg.routes.filter((r) => r.staat === 'INDEX').length;
      if (nu >= ctx.basis) return { ok: false, waarom: `de keten depubliceerde niets (basis ${ctx.basis}, nu ${nu}) — scenario heeft niets getoetst` };
      const r = draaiScript(map, resolve(map, 'intelligence', 'ops', 'publicatiecontract.mjs'), {
        SEO_BASIS_INDEX: resolve(map, 'basis-index.json'),
      });
      if (r.code === 0) return { ok: false, waarom: `${ctx.basis - nu} gepubliceerde routes verdwenen en het publicatiecontract gaf exit 0` };
      if (!/verdwenen/.test(r.uit)) return { ok: false, waarom: 'de poort faalde, maar niet op de depublicatiegrendel' };
      return { ok: true, waarom: `de depublicatiegrendel valt om bij ${ctx.basis - nu} verdwenen route(s), exit ${r.code}` };
    },
  },

  {
    naam: 'project uit een andere gemeente als lokaal bewijs',
    waarom:
      'Poort 15 beoordeelde tot deze release 0 van de 16 projectlinks: de sectieregex ankerde door de /i-vlag op het ' +
      'proza "opgeleverd in" in plaats van op de kop. Een project in de verkeerde gemeente was dus ongedekt, terwijl ' +
      'dat juist de bewering is die een regiopagina geloofwaardig maakt.',
    poort: 15,
    naKeten: true,
    breek(map) {
      const reg = lees(map, 'data', 'seo', 'routes.json');
      const projGeo = lees(map, 'data', 'bewijs', 'projecten-geo.json').per_gemeente;
      /* Een gemeentepagina MET een bewijssectie, en een project dat ergens
         anders ligt. Beide uit het register van de kopie, dus ook onder een
         gefaseerde uitrol kiest dit scenario iets dat echt bestaat. */
      const alleSlugs = new Set(Object.values(projGeo).flat().map((p) => p.slug));
      const doel = reg.routes.find((r) => {
        if (r.subsoort !== 'gemeente' || r.staat !== 'INDEX') return false;
        const p = resolve(map, `${r.route}.html`);
        return existsSync(p) && /id="bewijs"/.test(readFileSync(p, 'utf8'));
      });
      if (!doel) throw new Error('geen gepubliceerde gemeentepagina met een bewijssectie');
      const eigen = new Set((projGeo[doel.gemeentecode] || []).map((p) => p.slug));
      const vreemd = [...alleSlugs].find((s) => !eigen.has(s));
      if (!vreemd) throw new Error('geen project dat buiten deze gemeente ligt');
      const p = resolve(map, `${doel.route}.html`);
      const s = readFileSync(p, 'utf8');
      /* In de bewijssectie injecteren, niet er buiten: buiten de sectie is
         een projectlink legitiem (de verwant-blokken linken ook). */
      const uit = s.replace(/(<section[^>]*\bid="bewijs"[^>]*>)/i, `$1<p><a href="/${vreemd}">vals bewijs</a></p>`);
      if (uit === s) throw new Error('de bewijssectie is niet gevonden om in te injecteren');
      writeFileSync(p, uit);
    },
  },

  {
    naam: 'doorverwijsstub verwijst naar een andere stub',
    waarom:
      'Een keten van twee hops die eindigt op een noindex-pagina. De bestaande canonical-toets keurt dit goed, want ' +
      'de bestemming BESTAAT en is geen PENDING — alleen de STAAT van de bestemming was ongetoetst.',
    poort: 5,
    naKeten: true,
    breek(map) {
      const [a, b] = stubRoutes(map, 2);
      verlegStub(map, a, b);
    },
  },

  {
    naam: 'doorverwijsstub verwijst naar de homepage',
    waarom:
      'De wortelroute is een geldige INDEX-route, dus elke bestaande toets vindt dit goed. Het is precies het patroon ' +
      'dat verboden is: een gepensioneerde URL naar de homepage sturen in plaats van naar de inhoudelijke opvolger.',
    poort: 5,
    naKeten: true,
    breek(map) {
      const [a] = stubRoutes(map, 1);
      verlegStub(map, a, '');
    },
  },

  /* ---- Release 3.3: het nieuwskanaal krijgt eindelijk vijandig bewijs ----
     Poort 16 was tot nu toe de enige poort zonder scenario hier. Dat was te
     verdedigen zolang het kanaal PENDING stond en er niets live kon: er viel
     niets stuk te maken. Nu /nieuws echt op INDEX staat, bewaken twee regels
     iets dat een bezoeker merkt, en allebei zijn ze stil te breken. */
  {
    naam: 'lege nieuwshub op INDEX zonder vrijgave in het publicatiebesluit',
    waarom:
      'De lege hub mag alleen op INDEX staan omdat een mens hem in publicatiebesluit.json heeft vrijgegeven. ' +
      'Valt die sleutel weg — door een merge, een terugdraaiing of een schoonmaakactie — dan staat er een ' +
      'gepubliceerde pagina zonder enige grond, en dat is precies wat het register hoort te verbieden.',
    poort: 16,
    naKeten: true,
    breek(map) {
      /* NA de keten: het register zegt INDEX en nieuws.html bestaat. Alleen de
         handtekening verdwijnt. Zo meet dit scenario de VRIJGAVE en niet per
         ongeluk "INDEX zonder bestand", wat een andere regel is. */
      const b = lees(map, 'data', 'seo', 'publicatiebesluit.json');
      delete b.vrijgegeven.nieuws;
      schrijf(map, 'data/seo/publicatiebesluit.json', b);
    },
  },

  {
    naam: 'de zichtbare /nieuws-link verdwijnt uit chrome.js',
    waarom:
      'De noscript-navigatie regelt zichzelf uit het register, maar de ZICHTBARE navigatie staat in vibe/chrome.js ' +
      'en kan dat register niet lezen. Verdwijnt die link, dan is het kanaal nog wel crawlbaar maar voor een ' +
      'bezoeker onvindbaar — een defect dat geen enkele linkcontrole opmerkt, want er is geen dode link.',
    poort: 16,
    naKeten: true,
    breek(map) {
      const p = resolve(map, 'vibe', 'chrome.js');
      const s = readFileSync(p, 'utf8');
      const uit = s
        .replace(/^\s*\['nieuws',\s*'Nieuws'\],\n/m, '')
        .replace(/^\s*'<li><a href="\/nieuws">Nieuws<\/a><\/li>' \+\n/m, '');
      if (uit === s) throw new Error('de /nieuws-links in vibe/chrome.js zijn niet gevonden; is het bestand herschreven?');
      writeFileSync(p, uit);
    },
  },

  {
    naam: 'een poort wordt op niet-verplicht gezet',
    waarom:
      'audit.mjs telt zijn eindoordeel als `!p.ok && p.verplicht`. Eén teken — `true` naar `false` bij poort() — laat ' +
      'de FAIL-rij staan maar maakt het EINDOORDEEL PASS en de exitcode 0. Deze QA las alleen de tabelrij en riep ' +
      'GOED. Zolang dat kon, bewees geen enkele andere poortwijziging iets.',
    eigenToets: true,
    breek(map) {
      /* GEEN BESTAANDE POORT UITZETTEN. Dat was de eerste opzet en die
         bewees niets: het defect dat poort 1 hoort te vangen (een bestand op
         een PENDING-route) wordt óók door andere poorten gevangen, dus bleef
         het eindoordeel FAIL en was er geen tegenspraak te zien. Gemeten:
         "rij FAIL, eindoordeel FAIL, exit 1" terwijl poort 1 wél uitstond.

         Daarom een poort die ALLEEN dit scenario toevoegt en die met opzet
         rood is, met `verplicht` op false. Dan is er precies één rode rij en
         is de tegenspraak — rij FAIL, eindoordeel PASS, exit 0 — zuiver te
         meten, zonder afhankelijkheid van welke andere poort meevuurt. */
      const p = resolve(map, 'scripts', 'seo', 'audit.mjs');
      const s = readFileSync(p, 'utf8');
      const anker = "/* ============================================================== rapport */";
      if (!s.includes(anker)) throw new Error('het rapportanker in audit.mjs is niet gevonden; is het herschreven?');
      const proef = `poort('17 proefpoort — met opzet rood en niet-verplicht', false, () => ({\n  ok: false,\n  meting: 'opzettelijk rood',\n  details: ['deze poort hoort de keten te blokkeren maar staat op niet-verplicht'],\n}));\n\n`;
      writeFileSync(p, s.replace(anker, proef + anker));
    },
    toets(map) {
      const a = ketenEnAudit(map);
      const rijFaalt = /^\s*17\s+\S.*\sFAIL\s/m.test(a.uit);
      if (!rijFaalt) return { ok: false, waarom: 'de proefpoort staat niet als FAIL in de tabel; het scenario heeft niets opgezet' };
      if (a.code !== 0) return { ok: false, waarom: `audit.mjs gaf exit ${a.code} — een niet-verplichte poort blokkeert dus al; dit scenario is achterhaald` };
      const r = poortFaalt(a, 17);
      if (r.ok) return { ok: false, waarom: `de QA keurde een poort goed die FAIL meldt terwijl het script exit 0 geeft: ${r.waarom}` };
      if (!/verplicht/.test(r.waarom)) return { ok: false, waarom: `de QA faalde, maar noemt de oorzaak niet: ${r.waarom}` };
      return { ok: true, waarom: 'de QA ziet dat de rij FAIL meldt terwijl het eindoordeel PASS is en de exitcode 0' };
    },
  },
];

/* De poortinventaris van audit.mjs toetsen vóór de scenario's draaien: een
   verdwenen of niet-verplichte poort is een verzwakking van de keten en
   hoort niet stil te gebeuren. */
{
  const s = readFileSync(resolve(wortel, 'scripts', 'seo', 'audit.mjs'), 'utf8');
  /* `(?:[^'\\]|\\.)+` en niet `[^']+`: drie poortnamen dragen een ontsnapte
     apostrof ("Weespagina\'s"), en daar stopte een naïeve klasse. Gemeten:
     die regex vond 13 van de 16 poorten en deze toets riep vals alarm. */
  const decl = [...s.matchAll(/^poort\('((?:[^'\\]|\\.)+)',\s*(true|false),/gm)].map((m) => ({ naam: m[1], verplicht: m[2] === 'true' }));
  const nietVerplicht = decl.filter((d) => !d.verplicht);
  if (decl.length !== POORTINVENTARIS || nietVerplicht.length) {
    console.log('VIJANDIGE QA = FAIL  (poortinventaris)');
    console.log(`  verwacht ${POORTINVENTARIS} verplichte poorten, gevonden ${decl.length} waarvan ${nietVerplicht.length} niet-verplicht`);
    for (const d of nietVerplicht) console.log(`  · niet verplicht: ${d.naam}`);
    console.log('  Is dit met opzet, werk dan POORTINVENTARIS in dit bestand bij en leg de reden vast.');
    process.exit(1);
  }
  console.log(`poortinventaris: ${decl.length} poorten, alle verplicht`);
}

/* ================================================================ draaien */
console.log('VIJANDIGE QA — elk scenario MOET de poort rood krijgen');
console.log('='.repeat(92));

const uitslagen = [];
for (const sc of SCENARIOS) {
  const map = versKopie(sc.naam.replace(/[^a-z0-9]+/gi, '-').slice(0, 24));
  let uitslag;
  try {
    if (sc.naKeten) {
      /* Eerst een schone keten, dan het defect, dan alleen de audit: zo
         overschrijft de generator het defect niet meteen. */
      draai(map, 'bouw-routes.mjs');
      draai(map, 'genereer.mjs');
      draai(map, 'sitemap.mjs');
      sc.breek(map);
      const a = draai(map, 'audit.mjs');
      uitslag = poortFaalt(a, sc.poort);
    } else if (sc.eigenToets) {
      const ctx = sc.breek(map) || {};
      ketenEnAudit(map);
      uitslag = sc.toets(map, ctx);
    } else {
      sc.breek(map);
      const a = ketenEnAudit(map);
      uitslag = poortFaalt(a, sc.poort);
    }
  } catch (e) {
    uitslag = { ok: false, waarom: `scenario wierp een uitzondering: ${e.message}` };
  }
  uitslagen.push({ ...sc, ...uitslag });
  console.log(`  ${uitslag.ok ? 'GOED' : 'FOUT'}  ${sc.naam}`);
  console.log(`        ${uitslag.waarom}`);
  if (!HOUD) rmSync(map, { recursive: true, force: true });
  else console.log(`        kopie: ${map}`);
}

const fout = uitslagen.filter((u) => !u.ok);
console.log('='.repeat(92));
console.log(`VIJANDIGE QA = ${fout.length ? 'FAIL' : 'PASS'}  (${uitslagen.length - fout.length}/${uitslagen.length} scenario's vingen hun defect)`);
if (fout.length) {
  console.log('\nDeze poorten bleven groen terwijl er een echt defect in zat:');
  for (const f of fout) {
    console.log(`  · ${f.naam}`);
    console.log(`      uitkomst : ${String(f.waarom).split('\n')[0]}`);
    console.log(`      waarom dit telt: ${f.waarom === undefined ? '' : f.waarom === null ? '' : ''}${f.poort ? `poort ${f.poort} · ` : ''}${sluitAf(f)}`);
  }
  process.exit(1);
}

function sluitAf(f) {
  const sc = SCENARIOS.find((s) => s.naam === f.naam);
  return sc ? sc.waarom : '';
}
