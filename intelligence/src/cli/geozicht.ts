#!/usr/bin/env node
/* ============================================================
   CLI — GEO: zichtbaarheid in AI-antwoorden
   ------------------------------------------------------------
     npm run geozicht                de stand uit de database
     npm run geozicht -- --prompts   de promptset
     npm run geozicht -- --meet --droog   wat een ronde ZOU doen
     npm run geozicht -- --meet      een ronde (kan modelkosten maken)

   WAAROM DIT `geozicht` HEET EN NIET `geo`. Die naam is al bezet door
   src/cli/geo.ts, en dat is de GEOGRAFIE-synchronisatie: gebiedsgrenzen
   en netbeheergebieden. Twee verschillende dingen met dezelfde naam is
   precies hoe je de verkeerde opdracht in productie draait.
   ============================================================ */

import { maakPool, metOrganisatie, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { GEO_METHODE_VERSIE, GEO_PROMPTS, geoRonde, geoStand } from "../analytics/geo.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);

function percentage(a: number | null): string {
  /* NULL IS 'NIET GEMETEN' EN NOOIT 0%. Dat onderscheid is de hele
     reden dat dit veld nullable is; zie analytics/geo.ts. */
  return a === null ? "NIET GEMETEN" : `${(a * 100).toFixed(0)}%`;
}

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);

  if (heeft("prompts")) {
    process.stdout.write(
      `\nGEO-PROMPTSET — ${GEO_PROMPTS.length} prompts, methode ${GEO_METHODE_VERSIE}\n\n`,
    );
    for (const p of GEO_PROMPTS) {
      process.stdout.write(`  [${p.onderwerp}] ${p.sleutel}\n      ${p.prompt}\n\n`);
    }
    process.stdout.write(
      "  GEEN MERKNAAM IN DE PROMPTS, met opzet: wie 'Vibe Energy' in de vraag zet, meet of\n" +
        "  het model kan herhalen en niet of het ons kent.\n",
    );
    return 0;
  }

  if (heeft("meet")) {
    const uit = await geoRonde(pool, organisatieId, { droog: heeft("droog") });
    process.stdout.write(
      `\nGEO-RONDE${uit.droog ? " (DROOG — geen modelaanroep)" : ""}\n\n` +
        `  provider:        ${uit.provider} / ${uit.model}\n` +
        `  methodeversie:   ${uit.methodeVersie}\n` +
        `  prompts:         ${uit.prompts}\n` +
        `  GEMETEN:         ${uit.gemeten}\n` +
        `  niet gemeten:    ${uit.nietGemeten}\n` +
        `  met merk:        ${uit.metMerk}\n` +
        `  met eigen citaat:${uit.metEigenCitaat}\n` +
        `  aandeel met merk:${percentage(uit.aandeelMetMerk)}\n`,
    );
    if (uit.redenNietGemeten.length > 0) {
      process.stdout.write("\n  REDENEN DAT ER NIET IS GEMETEN:\n");
      for (const r of uit.redenNietGemeten) process.stdout.write(`    - ${r}\n`);
    }
    process.stdout.write(
      "\n  DIT IS EEN GECONTROLEERDE MODELMETING, geen zichtbaarheid bij echte AI-gebruikers.\n" +
        "  Een echte gebruiker heeft een gespreksgeschiedenis, een locatie en een eigen\n" +
        "  formulering; aanbieders personaliseren en A/B-testen; en een modelversie verandert\n" +
        "  zonder aankondiging.\n",
    );
    /* NUL GEMETEN IS EEN FOUT-EXITCODE, geen succes. Een planner die
       hierop groen geeft zou 'geen zichtbaarheid' rapporteren terwijl er
       niet is gekeken. */
    return uit.gemeten === 0 && !uit.droog ? 1 : 0;
  }

  const stand = await metOrganisatie(pool, { organisatieId }, (c) =>
    geoStand(c, organisatieId),
  );
  process.stdout.write(
    `\nGEO — STAND IN DE DATABASE\n\n` +
      `  actieve prompts:   ${stand.prompts}\n` +
      `  pogingen totaal:   ${stand.metingen}\n` +
      `  waarvan GEMETEN:   ${stand.gemeten}\n` +
      `  niet gemeten:      ${stand.nietGemeten}\n` +
      `  laatste poging:    ${stand.laatsteMeting ?? "NOOIT"}\n` +
      `  aandeel met merk:  ${percentage(stand.aandeelMetMerk)}\n` +
      `  methodeversies:    ${stand.methodeVersies.join(", ") || "(geen)"}\n\n` +
      (stand.gemeten === 0
        ? "  NUL GEMETEN POGINGEN betekent NIET 'wij worden niet genoemd'. Het betekent dat er\n" +
          "  niet is gekeken. Het aandeel staat daarom op NIET GEMETEN en niet op 0%.\n"
        : ""),
  );
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
