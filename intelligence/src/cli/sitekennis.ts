#!/usr/bin/env node
/* ============================================================
   CLI — sitekennis
   ------------------------------------------------------------
     npm run sitekennis                 bouw het artefact en schrijf het
     npm run sitekennis -- --controleer regenereer en vergelijk; schrijf niets
     npm run sitekennis -- --toon       lees het bestaande artefact en valideer

   --controleer is de CI-poort. Die regenereert het artefact uit de
   werkelijke website en vergelijkt het met wat er gecommit staat. Wie de
   site wijzigt zonder te regenereren, wordt daar rood — en dat is de
   enige reden dat het artefact in productie niet stil kan verouderen.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bouwSitekennis,
  leesSitekennis,
  SITEKENNIS_PAD,
  type SitekennisBestand,
} from "../site/sitekennis.ts";

const HIER = dirname(fileURLToPath(import.meta.url));
const INTEL_WORTEL = resolve(HIER, "..", "..");
const REPO_WORTEL = resolve(INTEL_WORTEL, "..");

const uit = (s: string) => process.stdout.write(s);

function samenvatting(k: SitekennisBestand): void {
  uit(`  schema            ${k.schema}\n`);
  uit(`  pagina's          ${k.aantalPaginas}\n`);
  uit(`  websiteVersie     ${k.websiteVersie}\n`);
  uit(`  inhoudsHash       ${k.inhoudsHash}\n`);
  uit(`  routesGegenereerd ${k.routesGegenereerd ?? "ONBEKEND"}\n`);
  const per: Record<string, number> = {};
  for (const p of k.paginas) per[p.soort] = (per[p.soort] ?? 0) + 1;
  uit(`  per soort         ${Object.entries(per).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} ${n}`).join(", ")}\n`);
  uit(`  met voorbehoud    ${k.paginas.filter((p) => p.voorbehoud).length}\n`);
  uit(`  met onderwerp     ${k.paginas.filter((p) => p.onderwerpen.length > 0).length}\n`);
  const linkTotaal = k.paginas.reduce((a, p) => a + p.interneLinks.length, 0);
  uit(`  interne links     ${linkTotaal}\n`);
}

async function main(): Promise<number> {
  const doelPad = join(INTEL_WORTEL, SITEKENNIS_PAD);

  if (process.argv.includes("--toon")) {
    uit("SITEKENNIS — bestaand artefact lezen en valideren\n\n");
    const r = await leesSitekennis(INTEL_WORTEL);
    if (!r.ok) {
      uit(`  GEWEIGERD (${r.fout.soort})\n  ${r.fout.bericht}\n`);
      return 1;
    }
    samenvatting(r.kennis);
    uit("\nEINDOORDEEL SITEKENNIS = GELDIG\n");
    return 0;
  }

  uit(`SITEKENNIS — bouwen uit ${REPO_WORTEL}\n\n`);
  const gebouwd = await bouwSitekennis(REPO_WORTEL);
  samenvatting(gebouwd);

  if (gebouwd.aantalPaginas === 0) {
    process.stderr.write(
      "\nAFGEBROKEN: nul gepubliceerde pagina's gevonden. Draait dit in een checkout " +
        "zonder website? Een leeg artefact wegschrijven zou precies de fout herhalen " +
        "die deze laag moet oplossen.\n",
    );
    return 1;
  }

  const nieuw = `${JSON.stringify(gebouwd, null, 2)}\n`;

  if (process.argv.includes("--controleer")) {
    let bestaand: string | null = null;
    try {
      bestaand = await readFile(doelPad, "utf8");
    } catch {
      bestaand = null;
    }
    if (bestaand === null) {
      process.stderr.write(`\nAFGEBROKEN: ${SITEKENNIS_PAD} staat niet in de repo.\n`);
      return 1;
    }
    if (bestaand !== nieuw) {
      const oud = JSON.parse(bestaand) as SitekennisBestand;
      process.stderr.write(
        `\nAFGEBROKEN: het gecommitte artefact wijkt af van de huidige website.\n` +
          `  gecommit : ${oud.aantalPaginas} pagina's, websiteVersie ${String(oud.websiteVersie).slice(0, 12)}…\n` +
          `  werkelijk: ${gebouwd.aantalPaginas} pagina's, websiteVersie ${gebouwd.websiteVersie.slice(0, 12)}…\n` +
          `  Draai 'npm run sitekennis' en commit het resultaat.\n`,
      );
      return 1;
    }
    uit("\nEINDOORDEEL SITEKENNIS = GELIJK AAN DE WEBSITE\n");
    return 0;
  }

  await writeFile(doelPad, nieuw, "utf8");
  uit(`\ngeschreven: ${SITEKENNIS_PAD} (${nieuw.length} bytes)\n`);
  uit("Dit artefact staat onder intelligence/ en is dus niet publiek opvraagbaar.\n");
  return 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    process.stderr.write(`${(e as Error).stack ?? String(e)}\n`);
    process.exit(1);
  },
);
