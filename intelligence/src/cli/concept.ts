#!/usr/bin/env node
/* ============================================================
   CLI — concepten maken
   ------------------------------------------------------------
     npm run concept                    concepten voor open kandidaten
     npm run concept -- --kandidaat 12  één kandidaat
     npm run concept -- --max 5         begrens het aantal
     npm run concept -- --met-model     laat een model herschrijven
     npm run concept -- --toon          de volledige tekst tonen

     npm run concept -- --tekst 7 --bestand artikel.md --model <naam>
                                        de tekst van concept 7 vervangen

   Zonder --met-model wordt er geen enkele modelaanroep gedaan. Dat is
   de standaard, want het deterministische concept haalt alle poorten
   en kost niets.

   ------------------------------------------------------------
   WAAROM --tekst BESTAAT

   Het deterministische concept schrijft alleen wat de semantische laag
   VERWOORDBAAR heeft gemaakt. Voor alles daarbuiten zet het letterlijk
   "TE VERWOORDEN DOOR DE REDACTIE" in de tekst en blokkeert het de
   publicatie. De Content Studio heeft daar een knop voor
   (POST /studio/:id/tekst), maar die vraagt een browsersessie — en een
   redactie die vanaf de commandoregel werkt had geen enkele weg.

   Deze optie is DIEZELFDE weg, met dezelfde drie regels als de route:
   minstens tachtig tekens, niet op een goedgekeurde of gepubliceerde
   versie, en daarna hertoetsInhoudVersie() zodat alle poorten opnieuw
   over de nieuwe tekst gaan.

   WAT HIJ NIET DOET: publiceren, goedkeuren, een poort overslaan of
   een status verzetten. De versie blijft staan waar hij stond, met
   verse poortuitslagen. --model is VERPLICHT: wie de tekst schreef
   hoort in het auditspoor te staan, en 'deterministisch' laten staan
   terwijl een ander de pen vasthield is precies de onwaarheid die
   auteur_soort hierboven al eens heeft gekost.
   ============================================================ */

import { readFile } from "node:fs/promises";

import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import {
  CONCEPTEERBARE_BESLUITEN,
  hertoetsInhoudVersie,
  maakConcept,
} from "../inhoud/concept.ts";

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

  /* ---------------------------------------------------------------
     DE REDACTIEWEG: een tekst vervangen en opnieuw door de poorten. */
  const tekstVersie = argument("tekst");
  if (tekstVersie !== undefined) {
    const pad = argument("bestand");
    const model = argument("model");
    if (!/^\d+$/.test(tekstVersie) || !pad || !model) {
      process.stderr.write(
        "gebruik: npm run concept -- --tekst <versieId> --bestand <pad.md> --model <naam>\n",
      );
      return 2;
    }
    const tekst = await readFile(pad, "utf8");
    if (tekst.trim().length < 80) {
      process.stderr.write("Een conceptteksttekst van minder dan tachtig tekens is geen artikel.\n");
      return 2;
    }

    const uit = await metOrganisatie(pool, { organisatieId }, async (c) => {
      const nu = await rijen<{ status: string; pad: string }>(
        c,
        "select status, pad from intel.inhoud_versies where organisatie_id = $1 and id = $2",
        [organisatieId, Number(tekstVersie)],
      );
      const v = nu[0];
      if (!v) return { fout: `versie ${tekstVersie} bestaat niet` };
      if (v.status === "goedgekeurd" || v.status === "gepubliceerd") {
        return {
          fout: `deze versie staat op '${v.status}'; een goedgekeurde tekst wijzig je niet, daar hoort een nieuwe versie bij`,
        };
      }
      await c.query(
        "update intel.inhoud_versies set body_markdown = $2, model = $3 where id = $1",
        [Number(tekstVersie), tekst, model],
      );
      const h = await hertoetsInhoudVersie(c, organisatieId, Number(tekstVersie));
      return { pad: v.pad, status: v.status, hertoets: h };
    });

    if ("fout" in uit && uit.fout) {
      process.stderr.write(`${uit.fout}\n`);
      return 1;
    }
    const h = "hertoets" in uit ? uit.hertoets : null;
    process.stdout.write(
      `TEKST VERVANGEN  versie ${tekstVersie}  ${"pad" in uit ? uit.pad : ""}\n` +
        `  status blijft   ${"status" in uit ? uit.status : "?"}\n` +
        `  model           ${model}\n` +
        `  poorten         ${h?.poortenGeslaagd ? "GESLAAGD" : "GEBLOKKEERD"}\n`,
    );
    for (const b of h?.blokkades ?? []) process.stdout.write(`  !! ${b.slice(0, 220)}\n`);
    return 0;
  }

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
