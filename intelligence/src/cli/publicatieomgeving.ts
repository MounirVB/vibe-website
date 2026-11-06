#!/usr/bin/env node
/* ============================================================
   CLI — is deze omgeving geschikt om te publiceren?
   ------------------------------------------------------------
     npm run publicatieomgeving
     npm run publicatieomgeving -- --open-pr

   WAAROM DIT COMMANDO BESTAAT
   De publicatieketen heeft DRIE dingen tegelijk nodig: de intel-database,
   een git-werkboom van vibe-website, en (voor de laatste stap) een
   geautoriseerde `gh`. Op de plek waar de database vanzelf bereikbaar is
   — de Railway-container van vibe-intel-api — is /app alleen de map
   intelligence/: geen data/inhoud, geen .git, geen remote. Gemeten op
   6 november 2026 in de productiecontainer:

     INTEL_SITE_WORTEL leeg  ->  siteWortel valt terug op REPO_WORTEL = /
     /data/inhoud bestaat niet  ->  heeftRouteregister() is onwaar
     /app/.git bestaat niet     ->  geen branch, geen commit, geen PR

   publiceer() zou daar dus de oude HTML-weg nemen en een bestand in de
   wortel van een wegwerpcontainer schrijven. Dat is geen publicatie.

   Dit commando zegt daarom VOORAF of de omgeving waarin je staat de hele
   keten kan draaien, met per voorwaarde een meting in plaats van een
   aanname. Het raakt niets aan: alleen lezende git-commando's en lezende
   queries.
   ============================================================ */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { configLezen } from "../kern/config.ts";
import { eenRij, maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";

const uitvoeren = promisify(execFile);
const heeft = (naam: string) => process.argv.includes(`--${naam}`);

type Uitslag = {
  naam: string;
  ok: boolean;
  /** Een waarschuwing blokkeert de keten niet, maar hoort wel gezien te worden. */
  verplicht: boolean;
  meting: string;
};

async function git(wortel: string, args: string[]): Promise<string> {
  const { stdout } = await uitvoeren("git", args, { cwd: wortel, encoding: "utf8" });
  return stdout.trim();
}

async function main(): Promise<number> {
  const config = configLezen();
  const wortel = config.siteWortel;
  const uit: Uitslag[] = [];
  const voeg = (naam: string, ok: boolean, meting: string, verplicht = true) =>
    uit.push({ naam, ok, verplicht, meting });

  /* ---------------- 1. de werkboom ---------------- */
  voeg(
    "INTEL_SITE_WORTEL wijst naar een bestaande map",
    existsSync(wortel),
    `${wortel}${process.env["INTEL_SITE_WORTEL"] ? "" : " (niet gezet; dit is de standaard REPO_WORTEL)"}`,
  );

  let isWerkboom = false;
  if (existsSync(wortel)) {
    try {
      const top = resolve(await git(wortel, ["rev-parse", "--show-toplevel"]));
      isWerkboom = top === resolve(wortel);
      voeg(
        "de sitewortel is de top van een git-werkboom",
        isWerkboom,
        isWerkboom ? top : `git-top is ${top}, niet ${resolve(wortel)}`,
      );
    } catch (e) {
      voeg("de sitewortel is de top van een git-werkboom", false, `git weigert: ${kort(e)}`);
    }
  } else {
    voeg("de sitewortel is de top van een git-werkboom", false, "de map bestaat niet");
  }

  if (isWerkboom) {
    try {
      const vuil = await git(wortel, ["status", "--porcelain"]);
      voeg(
        "de werkboom is schoon",
        vuil === "",
        vuil === "" ? "schoon" : `${vuil.split("\n").length} gewijzigd(e) bestand(en)`,
      );
    } catch (e) {
      voeg("de werkboom is schoon", false, kort(e));
    }
    try {
      const basis = await git(wortel, ["rev-parse", "--short", "origin/main"]);
      voeg("origin/main is bekend in deze werkboom", true, basis);
    } catch (e) {
      voeg("origin/main is bekend in deze werkboom", false, kort(e));
    }
  }

  /* ---------------- 2. wat de keten op schijf nodig heeft ---------------- */
  const generator = join(wortel, "scripts", "seo", "bouw.mjs");
  voeg("de generator van Release 1 staat er", existsSync(generator), generator);

  const registerPad = join(wortel, "data", "seo", "routes.json");
  if (existsSync(registerPad)) {
    try {
      const r = JSON.parse(await readFile(registerPad, "utf8")) as {
        routes?: { route: string; soort: string; staat: string }[];
      };
      const n = r.routes?.length ?? 0;
      const regioPending = (r.routes ?? []).filter(
        (x) => x.soort === "regio" && x.staat === "PENDING",
      ).length;
      voeg(
        "data/seo/routes.json is leesbaar",
        n > 0,
        `${n} routes, waarvan ${regioPending} regionale PENDING (grendel 7 vergelijkt dat getal)`,
      );
    } catch (e) {
      voeg("data/seo/routes.json is leesbaar", false, kort(e));
    }
  } else {
    voeg("data/seo/routes.json is leesbaar", false, `${registerPad} bestaat niet`);
  }

  /* heeftRouteregister() kiest de registerweg; zonder data/inhoud valt
     publiceer() terug op rechtstreeks HTML schrijven, en dat is precies
     wat deze keten niet wil. */
  const inhoudMap = join(wortel, "data", "inhoud");
  voeg(
    "data/inhoud bestaat (anders kiest publiceer() de oude HTML-weg)",
    existsSync(inhoudMap),
    inhoudMap,
  );
  const nieuwsMap = join(inhoudMap, "nieuws");
  voeg(
    "data/inhoud/nieuws bestaat",
    existsSync(nieuwsMap),
    existsSync(nieuwsMap)
      ? nieuwsMap
      : "de map wordt bij de eerste publicatie aangemaakt; dat is geen fout",
    false,
  );

  /* ---------------- 3. gereedschap ---------------- */
  for (const [naam, args, verplicht] of [
    ["git", ["--version"], true],
    ["node", ["--version"], true],
    ["gh", ["--version"], heeft("open-pr")],
  ] as [string, string[], boolean][]) {
    try {
      const { stdout } = await uitvoeren(naam, args, { encoding: "utf8" });
      voeg(`${naam} is beschikbaar`, true, stdout.trim().split("\n")[0] ?? "", verplicht);
    } catch (e) {
      voeg(`${naam} is beschikbaar`, false, kort(e), verplicht);
    }
  }
  if (heeft("open-pr")) {
    try {
      const { stdout, stderr } = await uitvoeren("gh", ["auth", "status"], { encoding: "utf8" });
      voeg("gh is geautoriseerd", true, (stdout + stderr).trim().split("\n")[0] ?? "");
    } catch (e) {
      voeg("gh is geautoriseerd", false, kort(e));
    }
  }

  /* ---------------- 4. de database ---------------- */
  const pool = maakPool();
  let organisatieId: number | null = null;
  try {
    organisatieId = await huidigeOrganisatie(pool);
    voeg("de intel-database is bereikbaar", true, `organisatie ${organisatieId}`);
  } catch (e) {
    voeg("de intel-database is bereikbaar", false, kort(e));
  }

  if (organisatieId !== null) {
    /* DE MIGRATIESTAND IS EEN EXTRA, GEEN VOORWAARDE.
       intel.migraties is van de eigenaar: de applicatierol krijgt daar
       geen select op (gemeten: 'permission denied for table migraties').
       Dat is juist — de rol hoort niet in de migratieboekhouding te
       kunnen kijken — dus een weigering hier is informatie en geen
       falende voorwaarde. */
    try {
      const m = await metOrganisatie(pool, { organisatieId }, (c) =>
        eenRij<{ nummer: number; naam: string }>(
          c,
          "select nummer, naam from intel.migraties order by nummer desc limit 1",
        ),
      );
      voeg("migratiestand", true, `${m?.nummer ?? "?"} (${m?.naam ?? "?"})`, false);
    } catch (e) {
      voeg("migratiestand", true, `niet leesbaar voor de applicatierol: ${kort(e)}`, false);
    }
  }

  if (organisatieId !== null) {
    try {
      const beleid = await metOrganisatie(pool, { organisatieId }, (c) =>
        eenRij<{ auto: boolean; versie: string }>(
          c,
          "select auto_publiceren_aan as auto, versie from intel.publicatiebeleid where actief",
        ),
      );
      /* AUTOMATISCH PUBLICEREN HOORT UIT TE STAAN. Dit is een
         veiligheidsmeting en geen voorwaarde om te kunnen publiceren:
         daarom is 'aan' hier een FAIL en niet een waarschuwing. */
      voeg(
        "auto_publiceren_aan staat uit",
        beleid?.auto === false,
        `beleid ${beleid?.versie ?? "ONBEKEND"}: auto_publiceren_aan = ${String(beleid?.auto)}`,
      );

      const klaar = await metOrganisatie(pool, { organisatieId }, (c) =>
        rijen<{ id: number; pad: string; poorten: boolean; blokkades: string[] }>(
          c,
          `select id, pad, poorten_geslaagd as poorten, blokkades
             from intel.inhoud_versies
            where organisatie_id = $1 and status = 'goedgekeurd'
            order by id`,
          [organisatieId],
        ),
      );
      voeg(
        "goedgekeurde versies die klaarstaan",
        true,
        klaar.length === 0
          ? "geen (publiceren vraagt eerst een goedkeuring in de Content Studio)"
          : klaar
              .map(
                (k) =>
                  `${k.id} ${k.pad} poorten=${k.poorten ? "ok" : `GEBLOKKEERD(${k.blokkades.length})`}`,
              )
              .join("; "),
        false,
      );
    } catch (e) {
      voeg("het publicatiebeleid is leesbaar", false, kort(e));
    }
  }

  /* ---------------- het rapport ---------------- */
  const breedte = Math.max(...uit.map((u) => u.naam.length));
  process.stdout.write("PUBLICATIEOMGEVING\n");
  for (const u of uit) {
    const label = u.ok ? "PASS" : u.verplicht ? "FAIL" : "LET OP";
    process.stdout.write(`  ${label.padEnd(6)} ${u.naam.padEnd(breedte)}  ${u.meting}\n`);
  }
  const gefaald = uit.filter((u) => !u.ok && u.verplicht);
  process.stdout.write(
    gefaald.length === 0
      ? "\nDeze omgeving kan de publicatieketen draaien.\n" +
          "  npm run publiceer -- --versie <id> --pr --droog   (alleen de grendels)\n" +
          "  npm run publiceer -- --versie <id> --pr           (branch + commit, geen PR)\n" +
          "  npm run publiceer -- --versie <id> --pr --open-pr (push + pull request)\n"
      : `\nNIET GESCHIKT: ${gefaald.length} verplichte voorwaarde(n) open.\n`,
  );
  return gefaald.length === 0 ? 0 : 1;
}

function kort(e: unknown): string {
  return ((e as Error).message ?? String(e)).split("\n")[0] ?? "onbekende fout";
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
