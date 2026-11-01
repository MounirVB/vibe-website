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
import { redacteerFout } from "../kern/geheimen.ts";
import { controleerBron } from "../bronnen/soorten.ts";
import { MOTORVERSIES } from "../pijplijn/motorversies.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);

type Stap = {
  naam: string;
  uitkomst: "PASS" | "FAIL" | "NIET GEDRAAID";
  detail: string;
};

function draai(
  commando: string,
  argumenten: string[],
  extraEnv: Readonly<Record<string, string>> = {},
): { code: number; uit: string } {
  const r = spawnSync(commando, argumenten, {
    cwd: APP_WORTEL,
    encoding: "utf8",
    /* `extraEnv` OVERSCHRIJFT de omgeving van de operator, met opzet.
       Zie de toelichting bij de testlus: de SITEKENNIS-stap heeft
       netwerk nodig en de toetsen mogen het juist niet hebben. */
    env: { ...process.env, ...extraEnv },
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
      /* DE CLAIMINVARIANTEN, sinds 0048 en als DERDE aanroep.
         Een aparte functie, bewust: controleer_invarianten() is 79
         regels security-kritieke SQL, en die overtypen om er een tak
         aan te hangen is een transcriptierisico zonder opbrengst. Hij
         krijgt MOTORVERSIES mee omdat een SQL-functie de
         TypeScript-constanten niet kan kennen. */
      const d = await c.query<{ r: string }>(
        "select soort || ': ' || bevinding as r from intel_priv.controleer_claiminvarianten($1)",
        [MOTORVERSIES],
      );
      return [...a.rows, ...b.rows, ...d.rows].map((x) => x.r);
    });
    stappen.push({
      naam: "INVARIANTEN",
      uitkomst: bevindingen.length === 0 ? "PASS" : "FAIL",
      detail:
        bevindingen.length === 0
          ? "RLS, functierechten, auditspoor, bewijsplicht en claims: 0 bevindingen"
          : bevindingen.slice(0, 4).join(" | "),
    });
  } catch (e) {
    stappen.push({
      naam: "DATABASE",
      uitkomst: "NIET GEDRAAID",
      detail: `database niet bereikbaar: ${redacteerFout(e)}`,
    });
  } finally {
    if (pool) await sluitAllePools();
  }

  // 3b. Sitekennis: beschrijft het artefact de WERKELIJKE website?
  //
  // Dit is de poort die voorkomt dat het artefact stil verouderd raakt.
  // Hij regenereert het uit de echte site en vergelijkt byte voor byte
  // met wat er gecommit staat. Wie de website wijzigt zonder te
  // regenereren, wordt hier rood — en dat is de enige reden dat de
  // productiecontainer op een gecommit artefact mag vertrouwen.
  {
    const r = draai("node", ["src/cli/sitekennis.ts", "--controleer"]);
    const paginas = /pagina's\s+(\d+)/.exec(r.uit)?.[1] ?? "?";
    stappen.push({
      naam: "SITEKENNIS",
      uitkomst: r.code === 0 ? "PASS" : "FAIL",
      detail:
        r.code === 0
          ? `het gecommitte artefact is gelijk aan de website (${paginas} gepubliceerde pagina's)`
          : (r.uit).split("\n").filter(Boolean).slice(-3).join(" | ").slice(0, 240),
    });
  }

  // 4. Testsuite
  if (heeft("snel")) {
    stappen.push({
      naam: "TESTS",
      uitkomst: "NIET GEDRAAID",
      detail: "--snel meegegeven",
    });
  } else {
    /* DE POORT DRAAIDE DE TOETSEN ANDERS DAN `npm test`, EN DAT WAS EEN
       ECHT GAT.
       ------------------------------------------------------------------
       De npm-scripts geven `--import ./test/netwerk-uit.ts` mee: een
       preambule die INTEL_NETWERK_TOEGESTAAN op 0 zet als hij nog niet
       gezet is. Deze lus liet die vlag weg en gaf via `env: process.env`
       wél de omgeving van de operator door — en de SITEKENNIS-stap
       hierboven heeft juist netwerk NODIG.

       GEMETEN GEVOLG, 1 november 2026: met INTEL_NETWERK_TOEGESTAAN=1
       voor de sitekennisstap viel test/eenheid/volledigetekst.test.ts
       om met 'de toets hoort NIET het internet op te gaan; een andere
       foutsoort betekent dat er echt verkeer is geweest'. De toets had
       gelijk: hij ging werkelijk het internet op. `npm run
       test:eenheid` was op dat moment groen, dus de poort was STRENGER
       dan de suite om een reden die niets met de code te maken had —
       en bij een andere operatorvlag had hij net zo goed milder kunnen
       zijn.

       NU DEZELFDE OPSTELLING ALS DE SUITE: de preambule erbij, en de
       vlag expliciet op 0 in de omgeving van het kindproces. Twee
       grendels, want de preambule respecteert een al gezette waarde. */
    for (const [naam, patroon] of [
      ["TESTS EENHEID", "test/eenheid/*.test.ts"],
      ["TESTS INTEGRATIE", "test/integratie/*.test.ts"],
      ["TESTS ADVERSARIEEL", "test/adversarieel/*.test.ts"],
    ] as const) {
      const r = draai(
        "node",
        ["--test", "--import", "./test/netwerk-uit.ts", "--test-concurrency=1", patroon],
        { INTEL_NETWERK_TOEGESTAAN: "0" },
      );
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
