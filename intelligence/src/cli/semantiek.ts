#!/usr/bin/env node
/* ============================================================
   CLI — semantiek
   ------------------------------------------------------------
     npm run semantiek                 vul bij wat nog geen semantiek heeft
     npm run semantiek -- --alles       ook de rijen die er al een hebben
     npm run semantiek -- --droog       meet, schrijf niets
     npm run semantiek -- --correcties  zoek vervangen uitspraken
     npm run semantiek -- --toon        toon de verwoorde zinnen

   Hervatbaar: de backfill werkt per batch op id-orde en meldt het
   laatste id, zodat een afgebroken run verder kan waar hij stopte.
   ============================================================ */

import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { backfillSemantiek, vindCorrecties } from "../pijplijn/semantiekopslag.ts";
import { VERWOORDBAAR_LABEL, type Verwoordbaarheid } from "../pijplijn/semantiek.ts";

const heeft = (n: string) => process.argv.includes(`--${n}`);
const uit = (s: string) => process.stdout.write(s);

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);

  if (heeft("correcties")) {
    const r = await vindCorrecties(pool, organisatieId, { droog: heeft("droog") });
    uit(`CORRECTIES${heeft("droog") ? " (droog)" : ""}\n\n`);
    uit(`  paren bekeken  ${r.bekeken}\n`);
    uit(`  vastgelegd     ${r.vastgelegd}\n`);
    for (const [s, n] of Object.entries(r.perSoort)) uit(`    ${s}: ${n}\n`);
    uit(`\nDe vervangen uitspraken blijven staan; er komt alleen een verwijzing bij.\n`);
    return 0;
  }

  if (heeft("toon")) {
    const r = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{
        id: number;
        verwoordbaar: string;
        fenomeen: string | null;
        subject: string | null;
        uitdrukking: string | null;
        reden: string | null;
      }>(
        c,
        `select id, verwoordbaar, fenomeen, subject, uitdrukking,
                verwoordbaar_reden as reden
           from intel.uitspraken
          where verwoordbaar is not null
          order by (verwoordbaar = 'VERWOORDBAAR') desc, id
          limit 40`,
      ),
    );
    uit(`UITSPRAKEN MET EEN SEMANTIEK — ${r.length}\n\n`);
    for (const x of r) {
      uit(`  [${x.id}] ${VERWOORDBAAR_LABEL[x.verwoordbaar as Verwoordbaarheid] ?? x.verwoordbaar}\n`);
      uit(`        ${x.uitdrukking ?? "?"} · fenomeen ${x.fenomeen ?? "GEEN"}`);
      uit(`${x.subject ? ` · subject ${x.subject}` : ""}\n`);
      if (x.verwoordbaar !== "VERWOORDBAAR") uit(`        ${(x.reden ?? "").slice(0, 150)}\n`);
    }
    return 0;
  }

  /* De backfill, in batches tot hij niets meer vindt. */
  let vanafId = 0;
  let rondes = 0;
  const totaal: Record<string, number> = {};
  let bekeken = 0;
  let verrijkt = 0;
  let zonder = 0;
  let mislukt = 0;

  while (rondes < 100) {
    const r = await backfillSemantiek(pool, organisatieId, {
      vanafId,
      max: 200,
      alles: heeft("alles"),
      droog: heeft("droog"),
    });
    if (r.bekeken === 0) break;
    bekeken += r.bekeken;
    verrijkt += r.verrijkt;
    zonder += r.zonderUitdrukking;
    mislukt += r.onveranderd;
    for (const [k, v] of Object.entries(r.perUitslag)) totaal[k] = (totaal[k] ?? 0) + v;
    vanafId = r.laatsteId;
    rondes += 1;
    /* Zonder --alles verschuift het filter mee en zou dezelfde batch
       opnieuw komen; met id-voortgang kan dat niet. */
  }

  uit(`SEMANTIEK BIJVULLEN${heeft("droog") ? " (droog)" : ""}${heeft("alles") ? " (alles)" : ""}\n\n`);
  uit(`  rondes             ${rondes}\n`);
  uit(`  uitspraken bekeken ${bekeken}\n`);
  uit(`  verrijkt           ${verrijkt}\n`);
  uit(`  zonder uitdrukking ${zonder}\n`);
  uit(`  mislukt            ${mislukt}\n`);
  uit(`\nPER UITSLAG\n`);
  for (const [k, v] of Object.entries(totaal).sort((a, b) => b[1] - a[1])) {
    uit(`  ${(VERWOORDBAAR_LABEL[k as Verwoordbaarheid] ?? k).padEnd(30)} ${v}\n`);
  }
  uit(`\nGeen enkele waarde is herschreven en geen verificatiestatus verhoogd.\n`);
  return mislukt > 0 ? 1 : 0;
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
