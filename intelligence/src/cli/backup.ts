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
import { basename, join, resolve } from "node:path";
import { laadEnvBestand, configLezen, APP_WORTEL } from "../kern/config.ts";
import { eenRij, maakPool, rijen, sluitAllePools, zonderOrganisatie } from "../kern/db.ts";
import {
  controleerIntegriteit,
  KRITIEKE_TABELLEN,
  maakBackup,
  type BackupManifest,
} from "../ops/backup.ts";
import { gcsConfigUitOmgeving, lijstGcs, uploadNaarGcs } from "../ops/gcsopslag.ts";

laadEnvBestand();
const config = configLezen();

const heeft = (n: string) => process.argv.includes(`--${n}`);
const waarde = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const DOELMAP = resolve(waarde("map") ?? join(APP_WORTEL, "backups"));
const RETENTIE = Number(waarde("retentie") ?? 30);

/* Blijft de back-up alleen lokaal staan? Dan is er geen retentie. */
let geenExterneKopie = false;

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

    /* ---------------- externe kopie ---------------- */
    console.log("");
    console.log("  EXTERNE OPSLAG");
    const gcs = gcsConfigUitOmgeving();
    if (!gcs) {
      /* GEEN FOUT, WEL EEN GAT. De lokale map is op Railway een
         containerschijf en die is weg bij de volgende deploy. Zonder
         credential blijft dit dus een back-up zonder bewaartermijn, en
         dat hoort zichtbaar te zijn in plaats van stil goed te lijken. */
      console.log("    NIET GECONFIGUREERD — INTEL_GCS_BUCKET en/of INTEL_GCS_SLEUTEL ontbreken.");
      console.log("    De back-up staat alleen lokaal. Op een ephemere schijf is dat GEEN retentie.");
      geenExterneKopie = true;
    } else {
      const dumpNaam = basename(uit.dumpPad);
      const manifestNaam = `${dumpNaam}.manifest.json`;
      const dumpBytes = await readFile(uit.dumpPad);
      const manifestBytes = await readFile(`${uit.dumpPad}.manifest.json`);

      const o1 = await uploadNaarGcs(gcs, dumpNaam, dumpBytes, "application/octet-stream");
      const o2 = await uploadNaarGcs(gcs, manifestNaam, manifestBytes, "application/json");

      console.log(`    bucket           gs://${gcs.bucket}`);
      console.log(`    object           ${dumpNaam} (generatie ${o1.generatie})`);
      console.log(`    bytes            ${o1.bytes}`);
      console.log(`    sha256 heen/terug ${o1.sha256}`);
      console.log(`    manifest         ${manifestNaam} (${o2.bytes} bytes)`);

      /* De som uit het manifest MOET gelijk zijn aan wat er in de bucket
         staat. Anders is er onderweg iets veranderd en is de kopie geen
         kopie. */
      if (o1.sha256 !== uit.manifest.sha256) {
        console.log("");
        console.log(`    FOUT: sha256 in de bucket (${o1.sha256}) wijkt af van het manifest`);
        console.log(`          (${uit.manifest.sha256}).`);
        process.exitCode = 1;
      } else {
        console.log("    integriteit      PASS — de som in de bucket is die van het manifest");
      }

      const inBucket = await lijstGcs(gcs, "vibe-intel-");
      const dumps = inBucket.filter((o) => o.naam.endsWith(".dump"));
      console.log(`    in de bucket     ${dumps.length} dump(s), oudste ${dumps[0]?.gemaaktOp.slice(0, 10) ?? "geen"}`);
      console.log("    retentie         levensduurbeleid van de bucket: 35 dagen, versies 7 dagen");
      console.log("    verwijderrecht   de dienstaccount heeft er GEEN; opruimen doet de bucket zelf");
    }

    console.log("");
    if (geenExterneKopie) {
      console.log("  Een back-up is pas bewezen na `npm run restoretest`, en pas BEWAARD");
      console.log("  als hij buiten deze machine staat. Dat laatste is nu niet het geval.");
    } else {
      console.log("  Een back-up is pas bewezen na `npm run restoretest`.");
      console.log("  Voor het bewijs uit de EXTERNE kopie: `npm run restoretest -- --uit-gcs`.");
    }
  }
} finally {
  await sluitAllePools();
}
