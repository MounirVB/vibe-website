#!/usr/bin/env node
/* ============================================================
   CLI — collector
   ------------------------------------------------------------
     npm run collector                 alle bronnen die toe zijn
     npm run collector -- --forceer    negeer het ophaalinterval
     npm run collector -- --bron <s>   één bron
   ============================================================ */

import { maakPool, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { verzamel } from "../pijplijn/verzamelen.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);
function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);
  const bron = argument("bron");

  const rapport = await verzamel(pool, organisatieId, {
    forceer: heeft("forceer"),
    ...(bron ? { alleenBron: bron } : {}),
  });

  process.stdout.write("COLLECTOR\n\n");
  process.stdout.write(
    `${"BRON".padEnd(32)} ${"RESULTAAT".padEnd(14)} ${"HTTP".padEnd(5)} ${"ITEMS".padEnd(6)} ` +
      `${"NIEUW".padEnd(6)} ${"VERSIES".padEnd(8)} ${"MATERIEEL".padEnd(10)} GEZONDHEID\n`,
  );
  for (const b of rapport.perBron) {
    process.stdout.write(
      `${b.sleutel.padEnd(32)} ${b.resultaat.padEnd(14)} ${String(b.httpStatus ?? "-").padEnd(5)} ` +
        `${String(b.items).padEnd(6)} ${String(b.nieuw).padEnd(6)} ${String(b.gewijzigd).padEnd(8)} ` +
        `${String(b.materieel).padEnd(10)} ${b.gezondheid}\n`,
    );
    if (b.resultaat === "fout" || b.injectieVerdacht > 0) {
      process.stdout.write(`${" ".repeat(33)}${b.opmerking.slice(0, 160)}\n`);
    }
  }

  process.stdout.write(
    `\nbronnen geprobeerd ${rapport.bronnenGeprobeerd}, ok ${rapport.bronnenOk}, ` +
      `fout ${rapport.bronnenFout}, nog niet toe ${rapport.bronnenOvergeslagen}\n`,
  );
  process.stdout.write(
    `nieuwe documenten ${rapport.nieuweDocumenten}, nieuwe versies ${rapport.nieuweVersies}, ` +
      `materiele wijzigingen ${rapport.materieleWijzigingen}, injectie verdacht ${rapport.injectieVerdacht}\n`,
  );
  return rapport.bronnenFout > 0 ? 1 : 0;
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
