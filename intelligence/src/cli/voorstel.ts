#!/usr/bin/env node
/* ============================================================
   CLI — wijzigingsvoorstellen voor bestaande pagina's
   ------------------------------------------------------------
     npm run voorstel                 alle kandidaten met een doelpagina
     npm run voorstel -- --kandidaat 1   één kandidaat, volledig
     npm run voorstel -- --kort       alleen de oordelen
     npm run voorstel -- --vandaag 2026-10-12

   Dit publiceert niets en schrijft geen enkel paginabestand. De uitkomst
   is per kandidaat een besluit met grondslag, en voor de geschikte
   kandidaten een concrete wijziging die een mens doorvoert.
   ============================================================ */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { bewaarVoorstel, bouwVoorstel, EINDOORDEEL_LABEL, type Voorstel } from "../inhoud/voorstel.ts";

const HIER = dirname(fileURLToPath(import.meta.url));
const REPO_WORTEL = resolve(HIER, "..", "..", "..");

function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const uit = (s: string) => process.stdout.write(s);

function toonVolledig(v: Voorstel): void {
  uit(`\n${"=".repeat(78)}\n`);
  uit(`KANDIDAAT ${v.kandidaatId} — ${EINDOORDEEL_LABEL[v.eindoordeel]} (${v.eindoordeel})\n`);
  uit(`${"=".repeat(78)}\n`);
  uit(`${v.titel}\n`);
  uit(`bron ${v.brondatum?.slice(0, 10) ?? "onbekend"} · bedrijfsrelevantie ${v.bedrijfsrelevantie ?? "?"}\n\n`);

  uit(`1. DE BESTAANDE PAGINA\n`);
  uit(`   pad            ${v.bestaandePagina.pad ?? "ONBEKEND"}\n`);
  uit(`   h1             ${v.bestaandePagina.h1 ?? "ONBEKEND"}\n`);
  uit(`   JSON-bron      ${v.bestaandePagina.bestaatAlsBron ? "gevonden" : "NIET gevonden"}\n`);
  uit(`   secties        ${v.bestaandePagina.secties.length}\n`);
  for (const s of v.bestaandePagina.secties) uit(`                  - ${s.slice(0, 66)}\n`);
  uit(`   noemt onderwerp ${v.bestaandePagina.noemtOnderwerp} keer\n`);
  if (v.bestaandePagina.gepubliceerdVoorbehoud) {
    uit(`   GEPUBLICEERD VOORBEHOUD VAN DE PAGINA:\n`);
    uit(`     "${v.bestaandePagina.gepubliceerdVoorbehoud.slice(0, 300)}"\n`);
  }

  uit(`\n2. VOORGESTELDE WIJZIGING\n`);
  uit(`   soort          ${v.wijziging.soort}\n`);
  uit(`   doelsectie     ${v.wijziging.doelSectie ?? "(geen)"}\n`);
  for (const d of v.wijziging.diff) uit(`   ${d}\n`);

  uit(`\n3. ONDERBOUWING\n`);
  if (v.onderbouwing.uitspraken.length === 0) uit(`   (geen vastgelegde uitspraken)\n`);
  for (const u of v.onderbouwing.uitspraken) {
    uit(
      `   ${u.waarde === null ? "ZONDER WAARDE" : `${Number(u.waarde)}${u.eenheid ?? ""}`}` +
        ` — ${u.soort}, ${u.status}\n`,
    );
  }
  for (const b of v.onderbouwing.bronnen) {
    uit(`   bron: ${b.uitgever} ${b.op?.slice(0, 10) ?? ""}\n         ${b.url}\n`);
  }

  uit(`\n4. COMMERCIELE CTA\n`);
  uit(`   "${v.cta.tekst}" -> ${v.cta.doel}\n`);
  uit(`   ${v.cta.grondslag}\n`);

  uit(`\n5. CONTROLES\n`);
  for (const ct of v.controles) {
    uit(`   ${ct.oordeel.padEnd(11)} ${ct.naam}\n            ${ct.reden}\n`);
    for (const b of ct.bewijs) uit(`            · ${b}\n`);
  }

  uit(`\n6. EINDOORDEEL — ${EINDOORDEEL_LABEL[v.eindoordeel]}\n`);
  uit(`   ${v.oordeelReden}\n`);
  uit(`   Dit voorstel is NIET gepubliceerd en wijzigt geen bestand.\n`);
}

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);
  const een = argument("kandidaat");
  const vandaag = argument("vandaag") ?? new Date().toISOString().slice(0, 10);

  const ids = een
    ? [Number.parseInt(een, 10)]
    : (
        await metOrganisatie(pool, { organisatieId }, (c) =>
          rijen<{ id: number }>(
            c,
            `select k.id
               from intel.inhoud_kandidaten k
              where k.besluit = 'UPDATE_EXISTING'
                and k.doel_pagina_id is not null
                and k.status <> 'afgehandeld'
              order by k.id`,
          ),
        )
      ).map((r) => r.id);

  if (ids.length === 0) {
    uit("Geen kandidaten met een doelpagina.\n");
    return 0;
  }

  const voorstellen: Voorstel[] = [];
  let nieuw = 0;
  let bijgewerkt = 0;
  for (const id of ids) {
    const v = await metOrganisatie(pool, { organisatieId }, (c) =>
      bouwVoorstel(c, REPO_WORTEL, id, vandaag),
    );
    if (!v) continue;
    voorstellen.push(v);
    /* Vastleggen zodat het in het dashboard op een mens kan wachten.
       Opslaan is geen publiceren: er bestaat geen status 'gepubliceerd'. */
    const r = await metOrganisatie(pool, { organisatieId }, (c) =>
      bewaarVoorstel(c, organisatieId, v),
    );
    if (r.wat === "nieuw") nieuw += 1;
    else bijgewerkt += 1;
  }

  const kort = process.argv.includes("--kort");
  uit(`WIJZIGINGSVOORSTELLEN — ${voorstellen.length} kandidaat(en)\n`);
  uit(`Er wordt niets gepubliceerd en geen bestand gewijzigd.\n`);

  if (!kort) for (const v of voorstellen) toonVolledig(v);

  uit(`\n${"=".repeat(78)}\nSAMENVATTING\n${"=".repeat(78)}\n`);
  const per: Record<string, Voorstel[]> = {};
  for (const v of voorstellen) (per[v.eindoordeel] ??= []).push(v);
  for (const [oordeel, lijst] of Object.entries(per).sort((a, b) => b[1].length - a[1].length)) {
    uit(`\n${EINDOORDEEL_LABEL[oordeel as Voorstel["eindoordeel"]]} (${oordeel}) — ${lijst.length}\n`);
    for (const v of lijst) {
      uit(`  [${String(v.kandidaatId).padStart(2)}] ${v.titel.slice(0, 62)}\n`);
      uit(`       ${v.oordeelReden.slice(0, 150)}\n`);
    }
  }

  const klaar = per["KLAAR_VOOR_REVIEW"]?.length ?? 0;
  uit(`\nvastgelegd: ${nieuw} nieuw, ${bijgewerkt} bijgewerkt\n`);
  uit(`KLAAR VOOR MENSELIJKE BEOORDELING: ${klaar}\n`);
  uit(`GEPUBLICEERD: 0 — dit platform publiceert geen redactionele inhoud zonder mens.\n`);
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
