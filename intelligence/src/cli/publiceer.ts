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
     npm run publiceer -- --versie 4 --verifieer
     npm run publiceer -- --lijst

   --pr draait de hele keten uit src/publicatie/pr.ts: een eigen branch,
   publiceer() voor het registerrecord, de generator van Release 1, de
   zeven grendels en een commit. Zonder --open-pr blijft het bij die
   lokale commit; mét --open-pr wordt er gepusht en een pull request
   geopend. De PR mergen blijft een menselijke handeling, en die merge
   IS de productiedeploy van www.vibeenergy.nl.

   --verifieer meet daarna of het er werkelijk staat: zit de commit in
   main, geeft de publieke URL 200, sluit de canonical, en staat de URL
   in de sitemap. Alleen dan komt er een regel met fase LIVE_GEVERIFIEERD
   in het logboek. Een geopende PR is geen publicatie.

   Publiceren vraagt een goedgekeurde versie. Goedkeuren vraagt een
   gebruiker die niet de auteur is; de database dwingt dat af.

   WIE DIT DRAAIT, IDENTIFICEERT ZICH
   ----------------------------------
   Elke handeling die iets schrijft vraagt twee dingen:

     --door <e-mailadres>   WIE het doet
     INTEL_SESSIE=<koekje>  het BEWIJS dat die persoon het is

   Het koekje is hetzelfde `intel_sessie` dat het dashboard uitgeeft bij
   inloggen; kopieer het uit de browser. De CLI leest het met
   leesSessieCookie(), houdt de sessie-epoch tegen de database (een
   ingetrokken sessie werkt dus niet), eist dat het adres bij DIE
   gebruiker hoort, en toetst server-side het recht `inhoud.publiceren`.

   Een kaal gebruikers-id is met opzet GEEN identiteitsbewijs: het
   logboek moet kunnen zeggen wie iets deed, niet wie iemand beweerde te
   zijn. `--lijst` vraagt niets, want dat leest alleen.
   ============================================================ */

import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { draaiTerug, keurGoed, publiceer } from "../inhoud/publiceer.ts";
import { RECHT_PUBLICEREN, verifieerMens, type Actor } from "../inhoud/actor.ts";
import { leesSessieCookie } from "../dashboard/auth.ts";
import { IntelFout } from "../kern/fouten.ts";
import type { Pool } from "../kern/db.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);
function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const UITLEG_IDENTITEIT =
  "Een publicatiehandeling vraagt een vastgestelde identiteit:\n" +
  "  --door <e-mailadres>   wie het doet\n" +
  "  INTEL_SESSIE=<koekje>  het bewijs (het intel_sessie-koekje uit het dashboard)\n" +
  "Zonder beide schrijft dit commando niets. Alleen --lijst werkt zonder.";

/**
 * Stelt vast WIE dit draait, en weigert bij het minste gebrek.
 *
 * Drie onafhankelijke eisen, en alle drie moeten kloppen: het koekje is
 * geldig en niet ingetrokken, het adres hoort bij dezelfde gebruiker, en
 * die gebruiker heeft het publicatierecht. De autorisatie zelf staat in
 * verifieerMens() — dus server-side en niet hier.
 */
async function bepaalActor(pool: Pool, organisatieId: number): Promise<Actor> {
  const email = argument("door");
  const koekje = process.env["INTEL_SESSIE"];

  if (!email || !koekje) {
    throw new IntelFout("autorisatie", `${!email ? "--door ontbreekt" : "INTEL_SESSIE ontbreekt"}.\n${UITLEG_IDENTITEIT}`);
  }

  const sessie = leesSessieCookie(koekje);
  if (sessie === null) {
    throw new IntelFout(
      "autorisatie",
      "INTEL_SESSIE is ongeldig of verlopen; log opnieuw in op het dashboard en kopieer het " +
        "nieuwe intel_sessie-koekje",
    );
  }
  if (sessie.organisatieId !== organisatieId) {
    throw new IntelFout(
      "autorisatie",
      `het koekje hoort bij organisatie ${sessie.organisatieId} en niet bij ${organisatieId}`,
    );
  }

  return metOrganisatie(pool, { organisatieId, gebruikerId: sessie.gebruikerId }, async (c) => {
    const { zoekGebruikerOpEmail } = await import("../dashboard/auth.ts");
    const genoemd = await zoekGebruikerOpEmail(c, email);
    if (genoemd === null) {
      throw new IntelFout("autorisatie", `er is geen actieve gebruiker met het adres ${email}`);
    }
    /* HET ADRES MOET BIJ HET KOEKJE HOREN. Zonder deze toets kon iemand
       met zijn eigen geldige sessie de naam van een ander in het logboek
       zetten — precies wat een auditspoor waardeloos maakt. */
    if (genoemd.id !== sessie.gebruikerId) {
      throw new IntelFout(
        "autorisatie",
        `het koekje is van gebruiker ${sessie.gebruikerId} maar --door noemt ${email} ` +
          `(gebruiker ${genoemd.id}); een handeling wordt niet op andermans naam vastgelegd`,
      );
    }
    return verifieerMens(c, organisatieId, {
      gebruikerId: sessie.gebruikerId,
      sessieEpoch: sessie.sessieEpoch,
      vereistRecht: RECHT_PUBLICEREN,
    });
  });
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

  /* ALLES HIERONDER SCHRIJFT, dus alles hieronder vraagt een naam. De
     actor wordt ÉÉN keer vastgesteld en daarna doorgegeven; zo kan geen
     enkel pad eronderuit. */
  const actor = await bepaalActor(pool, organisatieId);
  process.stdout.write(
    `IDENTITEIT  ${actor.soort === "mens" ? `${actor.email} (gebruiker ${actor.gebruikerId}, rol ${actor.rol ?? "-"})` : "systeem"}\n`,
  );

  const terug = argument("terugdraaien");
  if (terug) {
    const r = await draaiTerug(pool, organisatieId, Number.parseInt(terug, 10), { actor });
    process.stdout.write(`TERUGDRAAIEN ${r.publicatieId}: ${r.reden} (${r.bestandspad})\n`);
    return 0;
  }

  const versieRuw = argument("versie");
  if (!versieRuw) {
    process.stderr.write("geef --versie <id>, --terugdraaien <id> of --lijst\n");
    return 2;
  }
  const versieId = Number.parseInt(versieRuw, 10);

  /* ---- de laatste schakel: staat het er werkelijk? ---- */
  if (heeft("verifieer")) {
    const { verifieerLivePublicatie } = await import("../publicatie/verificatie.ts");
    const { configLezen } = await import("../kern/config.ts");
    const uit = await metOrganisatie(pool, { organisatieId }, (c) =>
      verifieerLivePublicatie(c, organisatieId, versieId, {
        actor,
        siteWortel: configLezen().siteWortel,
      }),
    );
    process.stdout.write(
      `LIVE-VERIFICATIE versie ${versieId}\n` +
        `  uitkomst         ${uit.geslaagd ? "LIVE" : "NIET LIVE"}\n` +
        `  url              ${uit.url ?? "-"}\n` +
        `  http             ${uit.httpStatus ?? "-"}\n` +
        `  commit           ${uit.commit ?? "-"}\n` +
        `  in main          ${uit.gemergedInMain ? "ja" : "nee"}\n` +
        `  reden            ${uit.reden}\n` +
        "  grendels:\n" +
        uit.grendels.map((g) => `    ${g.ok ? "PASS" : "FAIL"} ${g.naam} — ${g.meting}\n`).join(""),
    );
    return uit.geslaagd ? 0 : 1;
  }

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
        actor,
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

  const r = await publiceer(pool, organisatieId, versieId, { actor, droog: heeft("droog") });
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
