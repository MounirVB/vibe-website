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
import { CONCEPTEERBARE_BESLUITEN, maakConcept } from "../inhoud/concept.ts";

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
          /* NEWS_ITEM ONTBRAK HIER, EN DAT WAS DE HARDE STOP.
             ------------------------------------------------------------
             De nieuwsselectie schrijft een kandidaat met besluit
             NEWS_ITEM. Die soort stond in deze lijst niet, en in de
             geplande taak `voorstel` valt hij ook buiten de selectie
             (voorstel.ts eist besluit UPDATE_EXISTING MET een
             doel_pagina_id, en een NEWS_ITEM heeft er geen). Het
             dashboard importeert maakConcept niet. Gevolg: de enige
             geschikte kandidaat die de motor ooit heeft opgeleverd kon
             langs GEEN ENKELE route een concept worden.

             Gemeten in productie op 1 november 2026: kandidaat 199,
             besluit NEWS_ITEM, totaalscore 70, status open sinds 29
             oktober — tegenover 0 rijen in intel.inhoud_versies. En
             concept.ts ONDERSTEUNT NEWS_ITEM wel: het beeldt hem af op
             soort 'nieuw_artikel' en heeft voor het subsidiecluster al
             een CTA klaarstaan.

             DIT PUBLICEERT NIETS. maakConcept schrijft op status
             'ter_review', en kandidaat 199 staat op risico_klasse 'hoog',
             dus de poort hoog_risico_vereist_mens blokkeert hem tot een
             mens hem goedkeurt. Bovendien blijven de zes
             CHECK-constraints staan die publiceren zonder mens
             onmogelijk maken.

             WAT ER NIET IS GEWIJZIGD: voorstel.ts. Een NEWS_ITEM hoort
             geen inhoud_voorstel te worden maar een inhoud_versie; die
             query met rust laten is de kleinste reparatie die de keten
             doorlaat. */
          /* DE LIJST KOMT UIT concept.ts en staat hier niet meer met de
             hand. Zie CONCEPTEERBARE_BESLUITEN daar. */
          `select id from intel.inhoud_kandidaten
            where organisatie_id = $1
              and status = 'open'
              and besluit = any($3::text[])
            order by totaalscore desc, id
            limit $2`,
          [organisatieId, Number.isFinite(max) ? max : 5, [...CONCEPTEERBARE_BESLUITEN]],
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
