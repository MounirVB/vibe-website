#!/usr/bin/env node
/* ============================================================
   CLI — publiceren en terugdraaien
   ------------------------------------------------------------
     npm run publiceer -- --versie 4 --droog
     npm run publiceer -- --versie 4 --goedkeuren <gebruikerId>
     npm run publiceer -- --versie 4
     npm run publiceer -- --versie 4 --pr --droog
     npm run publiceer -- --versie 4 --pr
     npm run publiceer -- --versie 4 --pr --open-pr
     npm run publiceer -- --terugdraaien <publicatieId>
     npm run publiceer -- --lijst

   --pr draait de hele keten uit src/publicatie/pr.ts: een eigen branch,
   publiceer() voor het registerrecord, de generator van Release 1, de
   zeven grendels en een commit. Zonder --open-pr blijft het bij die
   lokale commit; mét --open-pr wordt er gepusht en een pull request
   geopend. De PR mergen blijft een menselijke handeling, en die merge
   IS de productiedeploy van www.vibeenergy.nl.

   Publiceren vraagt een goedgekeurde versie. Goedkeuren vraagt een
   gebruiker die niet de auteur is; de database dwingt dat af.
   ============================================================ */

import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { draaiTerug, keurGoed, publiceer } from "../inhoud/publiceer.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);
function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);

  if (heeft("lijst")) {
    const versies = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{
        id: number;
        pad: string;
        status: string;
        poorten_geslaagd: boolean;
        risico_klasse: string;
        model: string;
        blokkades: string[];
      }>(
        c,
        `select id, pad, status, poorten_geslaagd, risico_klasse, model, blokkades
           from intel.inhoud_versies
          where organisatie_id = $1
          order by id desc limit 25`,
        [organisatieId],
      ),
    );
    process.stdout.write(
      `${"ID".padEnd(6)} ${"STATUS".padEnd(14)} ${"POORTEN".padEnd(8)} ${"RISICO".padEnd(8)} PAD\n`,
    );
    for (const v of versies) {
      process.stdout.write(
        `${String(v.id).padEnd(6)} ${v.status.padEnd(14)} ${(v.poorten_geslaagd ? "ok" : "nee").padEnd(8)} ` +
          `${v.risico_klasse.padEnd(8)} ${v.pad}\n`,
      );
      for (const b of v.blokkades) process.stdout.write(`       !! ${b.slice(0, 160)}\n`);
    }
    return 0;
  }

  const terug = argument("terugdraaien");
  if (terug) {
    const r = await draaiTerug(pool, organisatieId, Number.parseInt(terug, 10));
    process.stdout.write(`TERUGDRAAIEN ${r.publicatieId}: ${r.reden} (${r.bestandspad})\n`);
    return 0;
  }

  const versieRuw = argument("versie");
  if (!versieRuw) {
    process.stderr.write("geef --versie <id>, --terugdraaien <id> of --lijst\n");
    return 2;
  }
  const versieId = Number.parseInt(versieRuw, 10);

  const keurdoor = argument("goedkeuren");
  if (keurdoor) {
    /* DE UITSLAG WORDT GELEZEN, en dat is geen formaliteit. keurGoed()
       geeft sinds de acceptatiecorrectie een uitslag terug in plaats
       van void: bewijs dat niet meer draagt is een normale uitkomst en
       geen exceptie, want de blokkade moet de commit halen om
       auditeerbaar te zijn. Een CLI die de uitslag negeerde, zou
       'goedgekeurd' melden en daarna doorlopen naar publiceer(). */
    const uitslag = await metOrganisatie(
      pool,
      { organisatieId, gebruikerId: Number.parseInt(keurdoor, 10) },
      (c) =>
        keurGoed(
          c,
          versieId,
          Number.parseInt(keurdoor, 10),
          `goedgekeurd via CLI door gebruiker ${keurdoor}`,
        ),
    );
    if (!uitslag.goedgekeurd) {
      process.stderr.write(
        `GOEDKEURING GEBLOKKEERD voor versie ${versieId}\n  ${uitslag.reden}\n` +
          uitslag.blokkades.map((b) => `    - ${b}\n`).join("") +
          "  De blokkade staat in intel.publicatiebesluiten.\n",
      );
      return 1;
    }
    process.stdout.write(`versie ${versieId} goedgekeurd door gebruiker ${keurdoor}\n`);
    /* DE POORTSTAND NA DE GOEDKEURING HOORT OP HET SCHERM. keurGoed()
       hertoetst sinds deze ronde zelf, zodat poort 9 opengaat; blijft er
       daarna nog iets dicht, dan weigert publiceer() hieronder en hoort
       de operator te weten waarom. */
    const na = uitslag.naHertoets;
    if (na !== null) {
      process.stdout.write(
        `  poorten na de goedkeuring  ${na.poortenGeslaagd ? "GESLAAGD" : "GEBLOKKEERD"}\n` +
          na.blokkades.map((b) => `    !! ${b}\n`).join(""),
      );
    }
  }

  /* ---- de PR-keten, en niet een tweede publicatieweg ----
     DIT IS DE AANSLUITING DIE ONTBRAK. src/publicatie/pr.ts bestond
     volledig — branch, generatorrun, zeven grendels, commit, optioneel
     een echte PR — maar had in heel src/ geen enkele aanroeper: geen
     CLI, geen route, geen taak, alleen een integratietoets. Het bestand
     schrijft zelf niets: het roept publiceer() aan voor het record en
     voegt daar de git-stap omheen. Daarom hoort de vlag hier en niet in
     een eigen commando met een tweede waarheid over publiceren. */
  if (heeft("pr")) {
    const { maakPublicatiePr } = await import("../publicatie/pr.ts");
    const { configLezen } = await import("../kern/config.ts");
    const siteWortel = configLezen().siteWortel;
    const uit = await metOrganisatie(pool, { organisatieId }, (c) =>
      maakPublicatiePr(c, organisatieId, versieId, {
        siteWortel,
        droog: heeft("droog"),
        openPr: heeft("open-pr"),
        pool,
      }),
    );
    process.stdout.write(
      `PUBLICATIE-PR versie ${versieId}\n` +
        `  sitewortel       ${siteWortel}\n` +
        `  uitkomst         ${uit.geslaagd ? "GESLAAGD" : "GEWEIGERD"}\n` +
        `  branch           ${uit.branch ?? "-"}\n` +
        `  commit           ${uit.commit ?? "-"}\n` +
        `  pull request     ${uit.prUrl ?? (heeft("open-pr") ? "GEEN" : "niet geopend (--open-pr ontbreekt)")}\n` +
        `  reden            ${uit.reden}\n` +
        "  grendels:\n" +
        uit.grendels.map((g) => `    ${g.ok ? "PASS" : "FAIL"} ${g.naam} — ${g.meting}\n`).join(""),
    );
    return uit.geslaagd ? 0 : 1;
  }

  const r = await publiceer(pool, organisatieId, versieId, { droog: heeft("droog") });
  process.stdout.write(
    `PUBLICATIE versie ${r.inhoudVersieId}\n` +
      `  geschreven       ${r.geschreven ? "ja" : "nee"}\n` +
      `  bestand          ${r.bestandspad || "-"}\n` +
      `  sitemap          ${r.sitemapBijgewerkt ? "bijgewerkt" : "ongemoeid"}\n` +
      `  publicatie_id    ${r.publicatieId ?? "-"}\n` +
      `  reden            ${r.reden}\n`,
  );
  return r.reden.startsWith("GEWEIGERD") ? 1 : 0;
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
