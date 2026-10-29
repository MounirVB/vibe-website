#!/usr/bin/env node
/* ============================================================
   CLI — weekrapport
   ------------------------------------------------------------
     npm run weekrapport                 de afgelopen zeven dagen
     npm run weekrapport -- --tot <iso>  de week die op deze dag eindigt
     npm run weekrapport -- --json       één JSON-regel

   STRIKT ALLEEN-LEZEN. Elke query is een SELECT; dit commando verstuurt
   niets, publiceert niets en keurt niets goed.

   DE TIEN CIJFERS KOMEN ALTIJD ALLE TIEN. Een weggelaten regel leest
   als "niet van toepassing" terwijl hij "niet gemeten" betekent, en bij
   een nieuwskanaal met nul artikelen is juist dat verschil het hele
   punt: nul gepubliceerde artikelen en nul MEETBARE artikelen zien er
   in een tabel identiek uit.
   ============================================================ */

import { laadEnvBestand } from "../kern/config.ts";
import { maakPool, metOrganisatie, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { logWeekrapport, meetWeek, rapportAlsTekst } from "../ops/weekrapport.ts";

laadEnvBestand();

const heeft = (naam: string) => process.argv.includes(`--${naam}`);
function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);
  const tot = argument("tot");

  const rapport = await metOrganisatie(pool, { organisatieId }, (c) =>
    meetWeek(c, organisatieId, { ...(tot ? { totDatum: tot } : {}) }),
  );

  if (heeft("json")) {
    logWeekrapport(rapport);
    process.stdout.write(`${JSON.stringify(rapport, null, 2)}\n`);
    return 0;
  }

  process.stdout.write(`\n${rapportAlsTekst(rapport)}\n`);
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
