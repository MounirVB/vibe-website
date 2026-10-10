/* ============================================================
   CLI — back-up maken en controleren
   ------------------------------------------------------------
     npm run backup                      maak een back-up
     npm run backup -- --map <pad>       andere doelmap
     npm run backup -- --retentie 14     retentie in dagen (standaard 30)
     npm run backup -- --controleer      controleer de nieuwste back-up
     npm run backup -- --lijst           toon de aanwezige back-ups

   De doelmap is standaard `intelligence/backups/` en staat in
   .gitignore: een dump bevat goedkeuringen, gebruikers en het
   auditspoor en hoort niet in een publieke repository. Deze
   repository IS publiek — gemeten op 10 oktober 2026.
   ============================================================ */

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { laadEnvBestand, configLezen, APP_WORTEL } from "../kern/config.ts";
import { eenRij, maakPool, rijen, sluitAllePools, zonderOrganisatie } from "../kern/db.ts";
import {
  controleerIntegriteit,
  KRITIEKE_TABELLEN,
  maakBackup,
  type BackupManifest,
} from "../ops/backup.ts";

laadEnvBestand();
const config = configLezen();

const heeft = (n: string) => process.argv.includes(`--${n}`);
const waarde = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const DOELMAP = resolve(waarde("map") ?? join(APP_WORTEL, "backups"));
const RETENTIE = Number(waarde("retentie") ?? 30);

async function nieuwsteDump(): Promise<string | null> {
  if (!existsSync(DOELMAP)) return null;
  const d = (await readdir(DOELMAP)).filter((b) => b.endsWith(".dump")).sort();
  return d.length ? join(DOELMAP, d[d.length - 1]!) : null;
}

/* Back-up is een OPERATIONELE taak, geen applicatietaak. De
   applicatierol vibe_intel_app mag intel.migraties niet lezen en bezit
   niets — dat is juist de bedoeling van die rol. Gemeten: een poging
   als applicatierol geeft 42501 permission denied. Daarom hier geen
   SET ROLE, zodat de eigenaar van de URL de tellingen kan lezen; dat
   is dezelfde identiteit waarmee pg_dump straks verbindt. */
const pool = maakPool({ rol: null });
try {
  const info = await zonderOrganisatie(pool, (c) =>
    eenRij<{ versie: string; naam: string; migraties: number }>(
      c,
      `select current_setting('server_version') as versie,
              current_database()                as naam,
              (select count(*)::int from intel.migraties) as migraties`,
    ),
  );
  if (!info) throw new Error("kon de databasegegevens niet lezen");
  const serverMajor = Number(/^(\d+)/.exec(info.versie)?.[1] ?? "0");

  if (heeft("lijst")) {
    if (!existsSync(DOELMAP)) {
      console.log(`\n(geen back-upmap: ${DOELMAP})`);
    } else {
      const manifesten = (await readdir(DOELMAP)).filter((b) => b.endsWith(".manifest.json")).sort();
      console.log(`\nBACK-UPS in ${DOELMAP}`);
      console.log("");
      if (!manifesten.length) console.log("  (geen)");
      for (const m of manifesten) {
        const j = JSON.parse(await readFile(join(DOELMAP, m), "utf8")) as BackupManifest;
        const totaal = Object.values(j.tellingen).reduce((a, b) => a + b, 0);
        console.log(
          `  ${j.gemaaktOp}  ${String(Math.round(j.bytes / 1024)).padStart(7)} kB  ` +
            `sha ${j.sha256.slice(0, 12)}  pg${j.pgDumpVersie}  ${j.migraties} migraties  ${totaal} kritieke rijen`,
        );
      }
    }
  } else if (heeft("controleer")) {
    const dump = await nieuwsteDump();
    if (!dump) {
      console.error("\ngeen back-up gevonden om te controleren");
      process.exitCode = 1;
    } else {
      const uit = await controleerIntegriteit(dump, serverMajor);
      console.log(`\nINTEGRITEITSCONTROLE  ${dump}`);
      console.log("");
      if (uit.manifest) {
        console.log(`  bestand            ${uit.manifest.bestand}`);
        console.log(`  bytes              ${uit.manifest.bytes}`);
        console.log(`  sha256             ${uit.manifest.sha256}`);
        console.log(`  inhoudsopgave      ${uit.manifest.inhoudsopgaveRegels} regels`);
        console.log(`  migraties in dump  ${uit.manifest.migraties}`);
      }
      console.log("");
      console.log(`  UITSLAG            ${uit.ok ? "PASS" : "FAIL"}`);
      for (const b of uit.bevindingen) console.log(`    · ${b}`);
      console.log("");
      console.log("  LET OP: dit is GEEN restoretest. Het bewijst alleen dat het archief");
      console.log("  onveranderd en leesbaar is. Gebruik `npm run restoretest` voor het echte bewijs.");
      if (!uit.ok) process.exitCode = 1;
    }
  } else {
    /* Tellingen uit de LIVE bron, zodat een restore te verifieren is. */
    const tellingen: Record<string, number> = {};
    for (const tabel of KRITIEKE_TABELLEN) {
      const r = await zonderOrganisatie(pool, (c) =>
        rijen<{ n: number }>(c, `select count(*)::int as n from ${tabel}`),
      );
      tellingen[tabel] = r[0]?.n ?? 0;
    }

    const stempel = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const uit = await maakBackup({
      databaseUrl: config.databaseUrl,
      doelmap: DOELMAP,
      stempel,
      retentieDagen: RETENTIE,
      tellingen,
      serverVersie: info.versie,
      migraties: info.migraties,
      databaseNaam: info.naam,
    });

    console.log("");
    console.log("BACK-UP");
    console.log("");
    console.log(`  database           ${uit.manifest.databaseNaam} (server ${uit.manifest.serverVersie})`);
    console.log(`  pg_dump            major ${uit.manifest.pgDumpVersie}`);
    console.log(`  bestand            ${uit.dumpPad}`);
    console.log(`  bytes              ${uit.manifest.bytes}`);
    console.log(`  sha256             ${uit.manifest.sha256}`);
    console.log(`  inhoudsopgave      ${uit.manifest.inhoudsopgaveRegels} regels`);
    console.log(`  migraties          ${uit.manifest.migraties}`);
    console.log("");
    console.log("  KRITIEKE TABELLEN (vastgelegd om een restore te kunnen verifieren)");
    for (const [t, n] of Object.entries(uit.manifest.tellingen)) {
      console.log(`    ${t.padEnd(32)} ${n}`);
    }
    if (uit.opgeruimd.length) {
      console.log("");
      console.log(`  retentie ${RETENTIE} dagen: ${uit.opgeruimd.length} oude back-up(s) verwijderd`);
      for (const o of uit.opgeruimd) console.log(`    · ${o}`);
    }
    console.log("");
    console.log("  Een back-up is pas bewezen na `npm run restoretest`.");
  }
} finally {
  await sluitAllePools();
}
