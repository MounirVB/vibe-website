/* ============================================================================
   VIBE ENERGY — BRONCONTROLE
   ----------------------------------------------------------------------------
   Elke claim in data/inhoud/ draagt een bron-URL en een brondatum. Dit script
   haalt elke unieke URL op en meldt wat niet meer bestaat.

   Waarom apart van audit.mjs: dit script heeft netwerk nodig en is traag. De
   poort moet offline kunnen draaien. Draai dit vóór een release en daarna
   periodiek — een subsidiepagina veroudert, en een 404 onder een cijfer is
   erger dan geen bron.

   Draaien: node scripts/seo/qa-bronnen.mjs
   ============================================================================ */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');

const perUrl = new Map();
(function loop(map) {
  for (const d of readdirSync(map, { withFileTypes: true })) {
    const p = join(map, d.name);
    if (d.isDirectory()) { loop(p); continue; }
    if (!d.name.endsWith('.json')) continue;
    const j = JSON.parse(readFileSync(p, 'utf8'));
    for (const c of j.claims || []) {
      if (!c.bron_url) continue;
      if (!perUrl.has(c.bron_url)) perUrl.set(c.bron_url, []);
      perUrl.get(c.bron_url).push({ route: j.route, datum: c.bron_datum });
    }
  }
})(resolve(wortel, 'data', 'inhoud'));

const zonderDatum = [];
for (const [u, gebruik] of perUrl) for (const g of gebruik) if (!g.datum) zonderDatum.push(`${g.route}: claim met ${u} zonder brondatum`);

const stuk = [];
let ok = 0;
for (const [u, gebruik] of perUrl) {
  let status = 0;
  try {
    const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(25000) });
    status = r.status;
  } catch (e) {
    status = `FOUT ${String(e.message).slice(0, 40)}`;
  }
  if (status === 200) ok += 1;
  else stuk.push({ url: u, status, routes: [...new Set(gebruik.map((g) => g.route))] });
}

console.log(`claims met bron-URL : ${[...perUrl.values()].reduce((a, b) => a + b.length, 0)}`);
console.log(`unieke bron-URLs    : ${perUrl.size}`);
console.log(`bereikbaar (200)    : ${ok}`);
console.log(`niet bereikbaar     : ${stuk.length}`);
for (const s of stuk) console.log(`  ${s.status}  ${s.url}\n        gebruikt op: ${s.routes.join(', ')}`);
if (zonderDatum.length) {
  console.log(`claims zonder brondatum: ${zonderDatum.length}`);
  for (const z of zonderDatum.slice(0, 20)) console.log(`  · ${z}`);
}
const faal = stuk.length + zonderDatum.length;
console.log(`BRONCONTROLE = ${faal === 0 ? 'PASS' : 'FAIL'}`);
process.exit(faal === 0 ? 0 : 1);
