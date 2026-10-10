#!/usr/bin/env node
/* ============================================================
   CLI — geografie
   ------------------------------------------------------------
     npm run geo          provincies, gemeenten en netbeheergebieden
                          synchroniseren uit PDOK en Mijn Aansluiting

   Draait onder de onderhoudsrol. De applicatierol mag
   intel.geo_bereiken alleen lezen.
   ============================================================ */

import { sluitAllePools } from "../kern/db.ts";
import { syncGeo } from "../site/geo-sync.ts";

async function main(): Promise<number> {
  const rapport = await syncGeo();
  process.stdout.write("GEOGRAFIE GESYNCHRONISEERD\n\n");
  process.stdout.write(`provincies          ${rapport.provincies}\n`);
  process.stdout.write(`gemeenten           ${rapport.gemeenten}\n`);
  process.stdout.write(`netbeheergebieden   ${rapport.netbeheergebieden}\n`);
  if (rapport.gemeentenZonderProvincie.length > 0) {
    process.stdout.write(
      `\nLET OP — ${rapport.gemeentenZonderProvincie.length} gemeenten zonder provincie in de bron:\n`,
    );
    for (const g of rapport.gemeentenZonderProvincie.slice(0, 20)) {
      process.stdout.write(`  ${g}\n`);
    }
  }
  return 0;
}

main().then(
  async (code) => {
    await sluitAllePools();
    process.exit(code);
  },
  async (e) => {
    process.stderr.write(`${(e as Error).stack ?? String(e)}\n`);
    await sluitAllePools();
    process.exit(1);
  },
);
