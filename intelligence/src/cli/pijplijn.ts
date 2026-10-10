#!/usr/bin/env node
/* ============================================================
   CLI — pijplijn
   ------------------------------------------------------------
     npm run pijplijn                alle stappen na het verzamelen
     npm run pijplijn -- --cluster   alleen clusteren
     npm run pijplijn -- --max 200   begrens het aantal versies
   ============================================================ */

import { maakPool, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { clusterNieuweVersies } from "../pijplijn/clusteren.ts";

function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);
  const maxRuw = argument("max");
  const max = maxRuw ? Number.parseInt(maxRuw, 10) : 2000;

  const rapport = await clusterNieuweVersies(pool, organisatieId, { max });

  process.stdout.write("PIJPLIJN — CLUSTEREN\n\n");
  const r = (label: string, waarde: unknown) =>
    process.stdout.write(`${label.padEnd(32)} ${String(waarde)}\n`);
  r("versies bekeken", rapport.versiesBekeken);
  r("zonder bekend onderwerp", rapport.zonderOnderwerp);
  r("gebeurtenissen nieuw", rapport.gebeurtenissenNieuw);
  r("gebeurtenissen verrijkt", rapport.gebeurtenissenVerrijkt);
  r("uitspraken aangemaakt", rapport.uitsprakenAangemaakt);
  r("uitspraken bevestigd", rapport.uitsprakenBevestigd);
  r("gebeurtenissen met tegenspraak", rapport.tegenspraken);

  process.stdout.write("\nPER ONDERWERP\n");
  const gesorteerd = Object.entries(rapport.perOnderwerp).sort((a, b) => b[1] - a[1]);
  for (const [onderwerp, n] of gesorteerd) {
    process.stdout.write(`  ${onderwerp.padEnd(24)} ${n}\n`);
  }
  if (gesorteerd.length === 0) process.stdout.write("  (geen)\n");

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
