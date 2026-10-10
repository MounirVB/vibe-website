#!/usr/bin/env node
/* ============================================================
   CLI — analytics
   ------------------------------------------------------------
     npm run analytics              koppelingsstatus en funnel
     npm run analytics -- --meet    live meting van de eigen pagina's
   ============================================================ */
import { maakPool, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { funnelBeeld, koppelingStatussen, meetLive } from "../analytics/koppelingen.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);

  process.stdout.write("KOPPELINGEN\n\n");
  for (const k of koppelingStatussen()) {
    process.stdout.write(`  ${k.sleutel.padEnd(16)} ${k.status.padEnd(20)} vertrouwd=${k.vertrouwd}\n`);
    process.stdout.write(`      ${k.toelichting}\n`);
  }

  process.stdout.write("\nFUNNEL\n\n");
  for (const f of await funnelBeeld(pool, organisatieId)) {
    process.stdout.write(
      `  ${f.stap.padEnd(24)} ${f.aantal === null ? "ONBEKEND" : String(f.aantal).padStart(8)}  ${f.toelichting.slice(0, 110)}\n`,
    );
  }

  if (heeft("meet")) {
    const r = await meetLive(pool, organisatieId, { max: 12 });
    process.stdout.write(`\nEIGEN METING — ${r.metingen.length} pagina's, ${r.geschreven} vastgelegd\n\n`);
    for (const m of r.metingen) {
      process.stdout.write(
        `  ${String(m.httpStatus ?? "-").padEnd(4)} sitemap=${m.inSitemap ? "ja " : "nee"} ` +
          `canoniek=${m.canoniekKlopt === null ? "?" : m.canoniekKlopt ? "klopt" : "WIJKT AF"}  ${m.pad}\n`,
      );
      if (m.redirectNaar) process.stdout.write(`       -> ${m.redirectNaar}\n`);
      if (m.canoniekKlopt === false) process.stdout.write(`       canonical op pagina: ${m.canoniekOpPagina}\n`);
    }
    process.stdout.write(
      "\nOf een zoekmachine deze pagina's heeft opgenomen is zonder Search Console niet te meten;\n" +
        "dat staat als 'onbekend' vastgelegd, niet geschat.\n",
    );
  }
  return 0;
}

main().then(
  async (code) => { await sluitAllePools(); process.exit(code); },
  async (e) => { process.stderr.write(`${(e as Error).stack}\n`); await sluitAllePools(); process.exit(1); },
);
