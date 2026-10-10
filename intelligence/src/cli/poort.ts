#!/usr/bin/env node
/* ============================================================
   CLI — de poort
   ------------------------------------------------------------
     npm run poort            alle controles
     npm run poort -- --snel  zonder de testsuite

   Rapporteert een tabel met PASS of FAIL per stap, niet één exitcode.
   Een stap die niet gedraaid is heet NIET GEDRAAID met een reden, en
   nooit PASS: dat onderscheid is het halve nut van een poort.
   ============================================================ */

import { spawnSync } from "node:child_process";
import { APP_WORTEL, configLezen } from "../kern/config.ts";
import { controleerRol, maakPool, sluitAllePools, zonderOrganisatie } from "../kern/db.ts";
import { status as migratieStatus } from "../db/migraties.ts";
import { BRONNEN } from "../bronnen/register.ts";
import { controleerBron } from "../bronnen/soorten.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);

type Stap = {
  naam: string;
  uitkomst: "PASS" | "FAIL" | "NIET GEDRAAID";
  detail: string;
};

function draai(commando: string, argumenten: string[]): { code: number; uit: string } {
  const r = spawnSync(commando, argumenten, {
    cwd: APP_WORTEL,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
  });
  return { code: r.status ?? 1, uit: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

async function main(): Promise<number> {
  const stappen: Stap[] = [];

  // 1. Typecheck
  {
    const r = draai("npx", ["tsc", "--noEmit"]);
    stappen.push({
      naam: "TYPECHECK",
      uitkomst: r.code === 0 ? "PASS" : "FAIL",
      detail: r.code === 0 ? "tsc --noEmit, 0 fouten" : r.uit.split("\n").slice(0, 4).join(" | "),
    });
  }

  // 2. Bronregister
  {
    const fouten = BRONNEN.flatMap((b) => controleerBron(b));
    const actief = BRONNEN.filter((b) => b.actief).length;
    const zonderToestemming = BRONNEN.filter(
      (b) => b.actief && (b.robotsStatus !== "toegestaan" || b.tdmStatus !== "geen_voorbehoud"),
    );
    stappen.push({
      naam: "BRONREGISTER",
      uitkomst: fouten.length === 0 && zonderToestemming.length === 0 ? "PASS" : "FAIL",
      detail:
        fouten.length === 0 && zonderToestemming.length === 0
          ? `${BRONNEN.length} bronnen, ${actief} actief, alle actieve met gemeten toestemming`
          : [...fouten, ...zonderToestemming.map((b) => `${b.sleutel}: actief zonder toestemming`)]
              .slice(0, 4)
              .join(" | "),
    });
  }

  // 3. Database: migraties, rol, invarianten
  let pool = null;
  try {
    configLezen();
    pool = maakPool({ rol: null });

    const migraties = await zonderOrganisatie(pool, (c) => migratieStatus(c));
    const open = migraties.filter((m) => !m.toegepast);
    const drift = migraties.filter((m) => m.drift);
    stappen.push({
      naam: "MIGRATIES",
      uitkomst: open.length === 0 && drift.length === 0 ? "PASS" : "FAIL",
      detail:
        open.length === 0 && drift.length === 0
          ? `${migraties.length}/${migraties.length} toegepast, drift 0`
          : `openstaand ${open.length} (${open.map((m) => m.naam).join(", ")}), drift ${drift.length}`,
    });

    const appPool = maakPool();
    const rol = await controleerRol(appPool);
    stappen.push({
      naam: "APPLICATIEROL",
      uitkomst: rol.veilig ? "PASS" : "FAIL",
      detail: rol.veilig
        ? `${rol.huidigeRol}: geen superuser, geen BYPASSRLS, geen eigenaar`
        : rol.bevindingen.join(" | "),
    });

    const bevindingen = await zonderOrganisatie(appPool, async (c) => {
      const a = await c.query<{ r: string }>(
        "select soort || ': ' || bevinding as r from intel_priv.controleer_invarianten()",
      );
      const b = await c.query<{ r: string }>(
        "select soort || ': ' || bevinding as r from intel_priv.controleer_inhoudsinvarianten()",
      );
      return [...a.rows, ...b.rows].map((x) => x.r);
    });
    stappen.push({
      naam: "INVARIANTEN",
      uitkomst: bevindingen.length === 0 ? "PASS" : "FAIL",
      detail:
        bevindingen.length === 0
          ? "RLS, functierechten, auditspoor en bewijsplicht: 0 bevindingen"
          : bevindingen.slice(0, 4).join(" | "),
    });
  } catch (e) {
    stappen.push({
      naam: "DATABASE",
      uitkomst: "NIET GEDRAAID",
      detail: `database niet bereikbaar: ${(e as Error).message}`,
    });
  } finally {
    if (pool) await sluitAllePools();
  }

  // 4. Testsuite
  if (heeft("snel")) {
    stappen.push({
      naam: "TESTS",
      uitkomst: "NIET GEDRAAID",
      detail: "--snel meegegeven",
    });
  } else {
    for (const [naam, patroon] of [
      ["TESTS EENHEID", "test/eenheid/*.test.ts"],
      ["TESTS INTEGRATIE", "test/integratie/*.test.ts"],
      ["TESTS ADVERSARIEEL", "test/adversarieel/*.test.ts"],
    ] as const) {
      const r = draai("node", ["--test", "--test-concurrency=1", patroon]);
      const pass = /^# pass (\d+)/m.exec(r.uit)?.[1] ?? /ℹ pass (\d+)/.exec(r.uit)?.[1] ?? "?";
      const fail = /^# fail (\d+)/m.exec(r.uit)?.[1] ?? /ℹ fail (\d+)/.exec(r.uit)?.[1] ?? "?";
      stappen.push({
        naam,
        uitkomst: r.code === 0 ? "PASS" : "FAIL",
        detail: `${pass} geslaagd, ${fail} gefaald`,
      });
    }
  }

  // Rapport
  const breedte = Math.max(...stappen.map((s) => s.naam.length));
  process.stdout.write("\nPOORT\n\n");
  for (const s of stappen) {
    process.stdout.write(
      `${s.naam.padEnd(breedte)}  ${s.uitkomst.padEnd(13)}  ${s.detail}\n`,
    );
  }

  const gefaald = stappen.filter((s) => s.uitkomst === "FAIL");
  const nietGedraaid = stappen.filter((s) => s.uitkomst === "NIET GEDRAAID");
  process.stdout.write(
    `\nEINDOORDEEL = ${gefaald.length === 0 ? "PASS" : "FAIL"}` +
      (nietGedraaid.length > 0
        ? `  (${nietGedraaid.length} stap(pen) NIET GEDRAAID: ${nietGedraaid.map((s) => s.naam).join(", ")})`
        : "") +
      "\n",
  );
  return gefaald.length === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    process.stderr.write(`${(e as Error).stack ?? String(e)}\n`);
    process.exit(1);
  },
);
