#!/usr/bin/env node
/* ============================================================
   CLI — distributieconcepten
   ------------------------------------------------------------
     npm run distributie
   ============================================================ */
import { maakPool, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { maakDistributieConcepten } from "../distributie/concepten.ts";

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);
  const r = await maakDistributieConcepten(pool, organisatieId);
  process.stdout.write("DISTRIBUTIECONCEPTEN\n\n");
  process.stdout.write(`versies bekeken     ${r.versiesBekeken}\n`);
  process.stdout.write(`concepten nieuw     ${r.conceptenNieuw}\n`);
  process.stdout.write(`al aanwezig         ${r.conceptenBestaand}\n`);
  for (const [kanaal, n] of Object.entries(r.perKanaal)) {
    process.stdout.write(`  ${kanaal.padEnd(18)} ${n}\n`);
  }
  process.stdout.write("\nVrijgeven is niet publiceren: dit platform verstuurt niets.\n");
  return 0;
}

main().then(
  async (code) => { await sluitAllePools(); process.exit(code); },
  async (e) => { process.stderr.write(`${(e as Error).stack}\n`); await sluitAllePools(); process.exit(1); },
);
