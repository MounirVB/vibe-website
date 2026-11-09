#!/usr/bin/env node
/* ============================================================
   CLI — wat zou de autonome uitgifte nu doen?
   ------------------------------------------------------------
     npm run uitgifte                 de stand: beleid en stopcondities
     npm run uitgifte -- --wachtrij   plus de opdrachten die klaarstaan
     npm run uitgifte -- --droog      alsof beide schakelaars AAN staan
     npm run uitgifte -- --json       machineleesbaar

   DIT COMMANDO SCHRIJFT NIETS, EN DAT IS DE HELE BEDOELING.

   De autonome uitgifte is de enige weg in dit platform die zonder mens
   naar productie kan. Voordat iemand hem aanzet, hoort hij te kunnen
   zien WAT er dan zou gebeuren: welk beleid geldt, welke artikelen in de
   rij staan, welke stopconditie actief is, en welk registerrecord er
   precies zou worden geschreven. Dat is wat hier staat.

   `--droog` negeert ALLEEN de twee beleidsschakelaars. De
   stroomonderbreker, het dagplafond en een onbruikbaar artefact blijven
   gelden, want die zeggen dat de meting zelf niet te vertrouwen is — en
   een droge ronde die daar langs gaat, meet iets anders dan de echte.

   WAAR DIT DRAAIT. Tegen de productiedatabase vraagt dit commando de
   tunnel uit docs/RUNBOOK-PUBLICEREN.md. Het leest het
   sitekennis-artefact van de LOKALE checkout (APP_WORTEL), net als de
   server dat in de container doet.
   ============================================================ */

import { laadEnvBestand } from "../kern/config.ts";
import { maakPool, sluitAllePools } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import {
  MAX_AUTONOME_PUBLICATIES_PER_DAG,
  MAX_OPEENVOLGENDE_FOUTEN,
  maakUitgifteWachtrij,
  stopredenen,
} from "../uitgifte/opdracht.ts";

laadEnvBestand();

const log = maakLogger("cli:uitgifte");
const heeft = (naam: string) => process.argv.includes(`--${naam}`);

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);
  const droog = heeft("droog");
  const jsonUit = heeft("json");

  const stand = await stopredenen(pool, organisatieId);
  const rij =
    heeft("wachtrij") || droog
      ? await maakUitgifteWachtrij(pool, organisatieId, { ookAlsBeleidUit: droog })
      : null;

  if (jsonUit) {
    process.stdout.write(
      `${JSON.stringify(
        {
          beleid: stand.beleid,
          stop: stand.stop,
          vandaagGepubliceerd: stand.vandaag,
          plafond: MAX_AUTONOME_PUBLICATIES_PER_DAG,
          maxOpeenvolgendeFouten: MAX_OPEENVOLGENDE_FOUTEN,
          opdrachten: rij?.opdrachten ?? null,
          geweigerd: rij?.geweigerd ?? null,
          droog,
        },
        null,
        2,
      )}\n`,
    );
    return 0;
  }

  const uit = process.stdout;
  uit.write("\nAUTONOME UITGIFTE — STAND\n");
  uit.write(`${"=".repeat(78)}\n\n`);

  if (stand.beleid === null) {
    uit.write("  beleid            GEEN ACTIEVE RIJ\n");
  } else {
    uit.write(`  beleid            ${stand.beleid.versie}\n`);
    uit.write(
      `  goedkeuren        ${stand.beleid.autoAan ? "AAN" : "uit"}   (auto_publiceren_aan)\n`,
    );
    uit.write(
      `  uitgeven          ${stand.beleid.uitgifteAan ? "AAN" : "uit"}   (auto_uitgifte_aan)\n`,
    );
    uit.write(`  max risico        ${stand.beleid.maxRisico}\n`);
  }
  uit.write(
    `  vandaag           ${stand.vandaag} van ${MAX_AUTONOME_PUBLICATIES_PER_DAG} autonome publicatie(s)\n\n`,
  );

  uit.write("STOPCONDITIES\n");
  if (stand.stop.length === 0) {
    uit.write("  geen enkele actief; de uitgifte zou nu mogen draaien\n\n");
  } else {
    for (const s of stand.stop) uit.write(`  STOP  ${s.sleutel.padEnd(24)} ${s.reden}\n`);
    uit.write("\n");
  }

  if (rij !== null) {
    uit.write(`WACHTRIJ${droog ? " (DROOG: alsof beide schakelaars aan staan)" : ""}\n`);
    if (rij.opdrachten.length === 0) {
      uit.write("  geen opdrachten\n");
    }
    for (const o of rij.opdrachten) {
      uit.write(
        `\n  versie ${o.inhoudVersieId}  ${o.pad}\n` +
          `    risico          ${o.risicoKlasse}\n` +
          `    beleid          ${o.beleidVersie}\n` +
          `    fase nu         ${o.fase ?? "GEEN FASE"}\n` +
          `    branch          ${o.branch}\n` +
          `    bestand         ${o.bestandspad}\n` +
          `    recordhash      ${o.recordHash}\n` +
          `    record          ${o.recordInhoud.length} bytes\n` +
          `    websiteversie   ${o.websiteVersie?.slice(0, 12) ?? "onbekend"}\n`,
      );
    }
    for (const g of rij.geweigerd) {
      uit.write(`\n  GEWEIGERD versie ${g.inhoudVersieId} ${g.pad}\n    ${g.reden}\n`);
    }
    uit.write("\n");
  } else {
    uit.write("Gebruik --wachtrij om de opdrachten te zien, of --droog om te zien wat er\n");
    uit.write("zou gebeuren als beide schakelaars aan stonden.\n\n");
  }

  uit.write("Dit commando heeft NIETS geschreven.\n");
  return 0;
}

try {
  process.exitCode = await main();
} catch (e) {
  log.fout("uitgiftestand mislukt", { fout: (e as Error).message });
  process.stderr.write(`${(e as Error).message}\n`);
  process.exitCode = 1;
} finally {
  await sluitAllePools();
}
