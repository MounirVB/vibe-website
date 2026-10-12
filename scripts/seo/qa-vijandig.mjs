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

/** Faalt poort <n> in deze auditoutput? */
function poortFaalt(uit, n) {
  const re = new RegExp(`^\\s*${n}\\s+\\S.*\\sFAIL\\s`, 'm');
  return re.test(uit);
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
];

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
      uitslag = poortFaalt(a.uit, sc.poort)
        ? { ok: true, waarom: `poort ${sc.poort} faalt zoals het hoort` }
        : { ok: false, waarom: `poort ${sc.poort} bleef GROEN terwijl het defect erin zat` };
    } else if (sc.eigenToets) {
      const ctx = sc.breek(map) || {};
      ketenEnAudit(map);
      uitslag = sc.toets(map, ctx);
    } else {
      sc.breek(map);
      const a = ketenEnAudit(map);
      uitslag = poortFaalt(a.uit, sc.poort)
        ? { ok: true, waarom: `poort ${sc.poort} faalt zoals het hoort` }
        : { ok: false, waarom: `poort ${sc.poort} bleef GROEN terwijl het defect erin zat` };
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
