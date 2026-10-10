#!/usr/bin/env node
/* ============================================================
   CLI — commerciele signalen
   ------------------------------------------------------------
     npm run signalen            SALES_SIGNAL-kandidaten omzetten
     npm run signalen -- --toon  de hoogst geprioriteerde tonen

   Een signaal is geen lead. Er is geen verzendpad in dit platform.
   ============================================================ */

import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { maakSignalen } from "../commercieel/signalen.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);
  const rapport = await maakSignalen(pool, organisatieId);

  process.stdout.write("COMMERCIELE SIGNALEN\n\n");
  process.stdout.write(`kandidaten bekeken   ${rapport.kandidatenBekeken}\n`);
  process.stdout.write(`signalen nieuw       ${rapport.signalenNieuw}\n`);
  process.stdout.write(`signalen bijgewerkt  ${rapport.signalenBijgewerkt}\n`);
  process.stdout.write(`overgeslagen         ${rapport.overgeslagen}\n`);

  if (heeft("toon")) {
    const top = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{
        prio: number;
        subject_naam: string;
        verificatie_status: string;
        is_hypothese: boolean;
        interesse_bewezen: boolean;
        geverifieerde_gebeurtenis: string;
        oplossingen: string[];
      }>(
        c,
        `select commerciele_prioriteit as prio, subject_naam, verificatie_status,
                is_hypothese, interesse_bewezen, geverifieerde_gebeurtenis,
                relevante_oplossingen as oplossingen
           from intel.commerciele_signalen
          where organisatie_id = $1
          order by commerciele_prioriteit desc, id
          limit 8`,
        [organisatieId],
      ),
    );
    process.stdout.write("\nHOOGSTE PRIORITEIT\n");
    for (const s of top) {
      process.stdout.write(
        `\n  [${String(s.prio).padStart(3)}] ${s.subject_naam.slice(0, 70)}\n` +
          `        verificatie=${s.verificatie_status} hypothese=${s.is_hypothese} interesse_bewezen=${s.interesse_bewezen}\n` +
          `        feit: ${s.geverifieerde_gebeurtenis.slice(0, 110)}\n` +
          `        mogelijk relevant: ${s.oplossingen.join(", ") || "-"}\n`,
      );
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
