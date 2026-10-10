#!/usr/bin/env node
/* ============================================================
   CLI — concepten maken
   ------------------------------------------------------------
     npm run concept                    concepten voor open kandidaten
     npm run concept -- --kandidaat 12  één kandidaat
     npm run concept -- --max 5         begrens het aantal
     npm run concept -- --met-model     laat een model herschrijven
     npm run concept -- --toon          de volledige tekst tonen

   Zonder --met-model wordt er geen enkele modelaanroep gedaan. Dat is
   de standaard, want het deterministische concept haalt alle poorten
   en kost niets.
   ============================================================ */

import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { maakConcept } from "../inhoud/concept.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);
function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);
  const een = argument("kandidaat");
  const max = Number.parseInt(argument("max") ?? "5", 10);

  const kandidaten = een
    ? [{ id: Number.parseInt(een, 10) }]
    : await metOrganisatie(pool, { organisatieId }, (c) =>
        rijen<{ id: number }>(
          c,
          `select id from intel.inhoud_kandidaten
            where organisatie_id = $1
              and status = 'open'
              and besluit in ('NEW_ARTICLE', 'UPDATE_EXISTING', 'KNOWLEDGE_UPDATE', 'REGIONAL_PATCH')
            order by totaalscore desc, id
            limit $2`,
          [organisatieId, Number.isFinite(max) ? max : 5],
        ),
      );

  process.stdout.write(`CONCEPTEN — ${kandidaten.length} kandidaat(en)\n\n`);
  let geslaagd = 0;
  let geblokkeerd = 0;

  for (const k of kandidaten) {
    const r = await maakConcept(pool, organisatieId, k.id, { metModel: heeft("met-model") });
    if (r.poortenGeslaagd) geslaagd += 1;
    else geblokkeerd += 1;

    process.stdout.write(
      `${r.poortenGeslaagd ? "POORTEN OK " : "GEBLOKKEERD"}  kandidaat ${String(k.id).padEnd(5)} ` +
        `versie ${String(r.inhoudVersieId).padEnd(5)} ${r.pad}\n` +
        `             model: ${r.modelGebruikt}\n`,
    );
    for (const b of r.blokkades) process.stdout.write(`             !! ${b.slice(0, 200)}\n`);
    for (const a of r.adviezen) process.stdout.write(`             ~  ${a.slice(0, 200)}\n`);

    if (heeft("toon") && r.inhoudVersieId) {
      const tekst = await metOrganisatie(pool, { organisatieId }, (c) =>
        rijen<{ body_markdown: string; titel: string; meta_omschrijving: string }>(
          c,
          "select titel, meta_omschrijving, body_markdown from intel.inhoud_versies where id = $1",
          [r.inhoudVersieId],
        ),
      );
      const t = tekst[0];
      if (t) {
        process.stdout.write(
          `\n--- TITEL ---\n${t.titel}\n--- META ---\n${t.meta_omschrijving}\n--- BODY ---\n${t.body_markdown}\n--- EINDE ---\n\n`,
        );
      }
    }
  }

  process.stdout.write(`\npoorten geslaagd ${geslaagd}, geblokkeerd ${geblokkeerd}\n`);
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
