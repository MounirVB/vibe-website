/* ============================================================================
   VIBE ENERGY — DE HELE SEO-KETEN IN DE JUISTE ORDE
   ----------------------------------------------------------------------------
   De stappen zijn afhankelijk van elkaar en de orde is niet vrij:

     1 haal-geo          netwerk; schrijft data/geo/
     2 haal-bewijs       netwerk; heeft data/geo nodig
     3 haal-netbeheerder netwerk; heeft data/geo nodig
     4 bouw-routes       heeft data/geo + data/bewijs + data/inhoud nodig
     5 genereer          heeft data/seo/routes.json nodig; schrijft de HTML
     6 herstel-bestaand  werkt op de bestaande HTML; moet NA genereer, omdat
                         hij het manifest gebruikt om gegenereerde bestanden
                         over te slaan
     7 sitemap           heeft het register EN de bestanden nodig
     8 audit             toetst de uitkomst

   De drie ophaalstappen zijn traag en vragen netwerk. Sla ze over met
   --offline als data/geo en data/bewijs al staan.

   Draaien:  node scripts/seo/bouw.mjs [--offline]
   ============================================================================ */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const OFFLINE = process.argv.includes('--offline');

const stappen = [
  { naam: 'haal-geo', netwerk: true },
  { naam: 'haal-bewijs', netwerk: true },
  { naam: 'haal-netbeheerder', netwerk: true },
  { naam: 'bouw-routes', netwerk: false },
  { naam: 'genereer', netwerk: false },
  { naam: 'herstel-bestaand', netwerk: false },
  { naam: 'sitemap', netwerk: false },
  { naam: 'audit', netwerk: false },
];

let gefaald = null;
for (const st of stappen) {
  if (OFFLINE && st.netwerk) {
    console.log(`\n>>> ${st.naam} — OVERGESLAGEN (--offline)`);
    continue;
  }
  console.log(`\n>>> ${st.naam}`);
  try {
    const uit = execFileSync('node', [resolve(hier, `${st.naam}.mjs`)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    process.stdout.write(uit);
  } catch (e) {
    process.stdout.write(e.stdout || '');
    process.stderr.write(e.stderr || '');
    gefaald = st.naam;
    break;
  }
}

console.log('');
if (gefaald) {
  console.log(`KETEN GESTOPT bij ${gefaald}. De volgende stappen zijn NIET GEDRAAID.`);
  process.exit(1);
}
console.log('KETEN VOLLEDIG GEDRAAID.');
