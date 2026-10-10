#!/usr/bin/env node
/* ============================================================
   CLI — migreren
   ------------------------------------------------------------
     npm run migreer                 toepassen
     npm run migreer -- --status     overzicht zonder te wijzigen
     npm run migreer -- --droog      laat zien wat zou gebeuren
     npm run migreer -- --db <url>   tegen een andere database

   Verbindt bewust zonder SET ROLE: migreren vraagt eigenaarsrechten.
   ============================================================ */

import pg from "pg";
import { configLezen } from "../kern/config.ts";
import { migreer, status } from "../db/migraties.ts";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("cli:migreer");

function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}
const heeft = (naam: string) => process.argv.includes(`--${naam}`);

async function main(): Promise<number> {
  const config = configLezen();
  const url = argument("db") ?? config.databaseUrl;
  const client = new pg.Client({ connectionString: url, options: "-c search_path=intel,public" });
  await client.connect();

  try {
    if (heeft("status")) {
      const rijen = await status(client);
      const breedte = Math.max(...rijen.map((r) => r.naam.length), 10);
      process.stdout.write(
        `${"MIGRATIE".padEnd(breedte)}  TOEGEPAST            DRIFT\n`,
      );
      for (const r of rijen) {
        const wanneer = r.toegepast_op ? r.toegepast_op.toISOString().slice(0, 19) : "-";
        process.stdout.write(
          `${r.naam.padEnd(breedte)}  ${wanneer.padEnd(19)}  ${r.drift ? "JA" : "nee"}\n`,
        );
      }
      const open = rijen.filter((r) => !r.toegepast).length;
      const drift = rijen.filter((r) => r.drift).length;
      process.stdout.write(`\nopenstaand: ${open}   drift: ${drift}\n`);
      return drift > 0 ? 1 : 0;
    }

    const resultaat = await migreer(client, {
      droog: heeft("droog"),
      driftToestaan: heeft("drift-toestaan"),
    });
    log.info("migratie gereed", {
      toegepast: resultaat.toegepast.length,
      overgeslagen: resultaat.overgeslagen.length,
      namen: resultaat.toegepast,
      droog: heeft("droog"),
    });
    return 0;
  } finally {
    await client.end();
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    log.fout("migratie mislukt", { fout: e });
    process.exit(1);
  },
);
