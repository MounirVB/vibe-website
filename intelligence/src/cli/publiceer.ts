#!/usr/bin/env node
/* ============================================================
   CLI — publiceren en terugdraaien
   ------------------------------------------------------------
     npm run publiceer -- --versie 4 --droog
     npm run publiceer -- --versie 4 --goedkeuren <gebruikerId>
     npm run publiceer -- --versie 4
     npm run publiceer -- --terugdraaien <publicatieId>
     npm run publiceer -- --lijst

   Publiceren vraagt een goedgekeurde versie. Goedkeuren vraagt een
   gebruiker die niet de auteur is; de database dwingt dat af.
   ============================================================ */

import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { draaiTerug, keurGoed, publiceer } from "../inhoud/publiceer.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);
function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);

  if (heeft("lijst")) {
    const versies = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{
        id: number;
        pad: string;
        status: string;
        poorten_geslaagd: boolean;
        risico_klasse: string;
        model: string;
        blokkades: string[];
      }>(
        c,
        `select id, pad, status, poorten_geslaagd, risico_klasse, model, blokkades
           from intel.inhoud_versies
          where organisatie_id = $1
          order by id desc limit 25`,
        [organisatieId],
      ),
    );
    process.stdout.write(
      `${"ID".padEnd(6)} ${"STATUS".padEnd(14)} ${"POORTEN".padEnd(8)} ${"RISICO".padEnd(8)} PAD\n`,
    );
    for (const v of versies) {
      process.stdout.write(
        `${String(v.id).padEnd(6)} ${v.status.padEnd(14)} ${(v.poorten_geslaagd ? "ok" : "nee").padEnd(8)} ` +
          `${v.risico_klasse.padEnd(8)} ${v.pad}\n`,
      );
      for (const b of v.blokkades) process.stdout.write(`       !! ${b.slice(0, 160)}\n`);
    }
    return 0;
  }

  const terug = argument("terugdraaien");
  if (terug) {
    const r = await draaiTerug(pool, organisatieId, Number.parseInt(terug, 10));
    process.stdout.write(`TERUGDRAAIEN ${r.publicatieId}: ${r.reden} (${r.bestandspad})\n`);
    return 0;
  }

  const versieRuw = argument("versie");
  if (!versieRuw) {
    process.stderr.write("geef --versie <id>, --terugdraaien <id> of --lijst\n");
    return 2;
  }
  const versieId = Number.parseInt(versieRuw, 10);

  const keurdoor = argument("goedkeuren");
  if (keurdoor) {
    await metOrganisatie(pool, { organisatieId, gebruikerId: Number.parseInt(keurdoor, 10) }, (c) =>
      keurGoed(
        c,
        versieId,
        Number.parseInt(keurdoor, 10),
        `goedgekeurd via CLI door gebruiker ${keurdoor}`,
      ),
    );
    process.stdout.write(`versie ${versieId} goedgekeurd door gebruiker ${keurdoor}\n`);
  }

  const r = await publiceer(pool, organisatieId, versieId, { droog: heeft("droog") });
  process.stdout.write(
    `PUBLICATIE versie ${r.inhoudVersieId}\n` +
      `  geschreven       ${r.geschreven ? "ja" : "nee"}\n` +
      `  bestand          ${r.bestandspad || "-"}\n` +
      `  sitemap          ${r.sitemapBijgewerkt ? "bijgewerkt" : "ongemoeid"}\n` +
      `  publicatie_id    ${r.publicatieId ?? "-"}\n` +
      `  reden            ${r.reden}\n`,
  );
  return r.reden.startsWith("GEWEIGERD") ? 1 : 0;
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
