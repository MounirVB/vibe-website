#!/usr/bin/env node
/* ============================================================
   CLI — besluiten
   ------------------------------------------------------------
     npm run besluit                 nieuwe gebeurtenissen beoordelen
     npm run besluit -- --opnieuw    ook al beoordeelde opnieuw
     npm run besluit -- --toon 12    de hoogst scorende kandidaten tonen
   ============================================================ */

import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { MOTOR_VERSIE, neemBesluiten } from "../besluit/motor.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);
function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);

  const rapport = await neemBesluiten(pool, organisatieId, { opnieuw: heeft("opnieuw") });

  process.stdout.write(`BESLUITMOTOR ${MOTOR_VERSIE}\n\n`);
  process.stdout.write(`gebeurtenissen beoordeeld   ${rapport.beoordeeld}\n\n`);
  process.stdout.write("PER BESLUIT\n");
  const volgorde = [
    "NEW_ARTICLE",
    "UPDATE_EXISTING",
    "KNOWLEDGE_UPDATE",
    "REGIONAL_PATCH",
    "SALES_SIGNAL",
    "DISTRIBUTION_ONLY",
    "MONITOR",
    "REJECT",
  ];
  for (const b of volgorde) {
    const n = rapport.perBesluit[b] ?? 0;
    process.stdout.write(`  ${b.padEnd(20)} ${String(n).padStart(5)}\n`);
  }

  const toon = Number.parseInt(argument("toon") ?? "8", 10);
  const top = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<{
      besluit: string;
      totaalscore: number;
      risico_klasse: string;
      titel: string;
      redenen: string[];
    }>(
      c,
      `select k.besluit, k.totaalscore, k.risico_klasse, g.titel, k.besluit_redenen as redenen
         from intel.inhoud_kandidaten k
         join intel.markt_gebeurtenissen g on g.id = k.gebeurtenis_id
        where k.organisatie_id = $1
          and k.besluit not in ('REJECT', 'MONITOR')
        order by k.totaalscore desc, k.id
        limit $2`,
      [organisatieId, Number.isFinite(toon) ? toon : 8],
    ),
  );

  process.stdout.write("\nHOOGST SCORENDE KANDIDATEN (geen REJECT/MONITOR)\n");
  if (top.length === 0) process.stdout.write("  (geen)\n");
  for (const k of top) {
    process.stdout.write(
      `\n  [${String(k.totaalscore).padStart(3)}] ${k.besluit.padEnd(18)} risico=${k.risico_klasse}\n` +
        `        ${k.titel.slice(0, 96)}\n`,
    );
    for (const r of k.redenen) process.stdout.write(`        - ${r.slice(0, 150)}\n`);
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
