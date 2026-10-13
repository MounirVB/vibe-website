#!/usr/bin/env node
/* ============================================================
   CLI — publicatieprecheck op een goedgekeurd voorstel
   ------------------------------------------------------------
     npm run precheck -- --lijst
     npm run precheck -- --voorstel 11
     npm run precheck -- --voorstel 11 --json

   WAAROM DIT BESTAAT.

   publicatiePrecheck() was volledig geïmplementeerd en volledig
   ONBEREIKBAAR: gemeten op 078785a had de functie geen enkele aanroeper
   buiten de integratietest, en geen regel in src/ zette ooit
   PUBLICATION_PRECHECK, DEPLOYMENT of LIVE_VERIFIED. De keten stopte
   feitelijk bij APPROVED. Een controle die niemand aanroept is geen
   controle.

   DIT COMMANDO PUBLICEERT NIETS.

   Het meet of een goedgekeurd voorstel nog uitgerold MAG worden, en
   legt die uitkomst vast. Het raakt geen websitebestand aan, maakt geen
   branch, en opent geen pull request. Het doorvoeren van de wijziging
   blijft een menselijke handeling via de bestaande, beschermde
   git-werkstroom — een redactionele goedkeuring is geen toestemming om
   repositorybeveiliging te omzeilen.

   WAT HET WEL VERANDERT. Bij PASS zet publicatiePrecheck de status op
   PUBLICATION_PRECHECK en bewaart hij de uitslag met een tijdstempel.
   Bij FAIL blijft de status staan en wordt de reden vastgelegd. Dat is
   een operatorhandeling en vraagt dus databasetoegang.

   DE WEBSITEVERSIE WORDT HIER GEMETEN. De versie waarop is goedgekeurd
   komt uit de rij (kolom goedgekeurde_website_versie, migratie 0033);
   de versie die NU geldt leest dit commando uit het artefact. Dat zijn
   twee onafhankelijke metingen, en precies daarom betekent de controle
   "website onveranderd sinds goedkeuring" nu iets.
   ============================================================ */

import { laadEnvBestand, APP_WORTEL } from "../kern/config.ts";
import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { publicatiePrecheck, STATUS_LABEL } from "../inhoud/beoordeling.ts";
import { gepubliceerdeRoutes, leesSitekennis } from "../site/sitekennis.ts";

laadEnvBestand();

const log = maakLogger("cli:precheck");
const heeft = (n: string) => process.argv.includes(`--${n}`);
function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);

  if (heeft("lijst")) {
    const open = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{
        id: string;
        doel_pad: string | null;
        publicatie_status: string;
        precheck_uitslag: string | null;
        beoordeeld_door_email: string | null;
      }>(
        c,
        `select v.id::text,
                v.doel_pad,
                v.publicatie_status,
                v.precheck_uitslag,
                (select g.email from intel.gebruikers g where g.id = v.beoordeeld_door)
                  as beoordeeld_door_email
           from intel.inhoud_voorstellen v
          where v.organisatie_id = $1
            and v.publicatie_status in ('APPROVED', 'PUBLICATION_PRECHECK')
          order by v.id`,
        [organisatieId],
      ),
    );
    console.log("");
    console.log("VOORSTELLEN DIE OP EEN PRECHECK WACHTEN");
    console.log("");
    if (open.length === 0) {
      console.log("  (geen goedgekeurde voorstellen)");
      console.log("");
      console.log("  Dat is geen fout. Goedkeuren doet een mens in de studio;");
      console.log("  dit commando publiceert niets en keurt niets goed.");
    }
    for (const v of open) {
      console.log(
        `  ${v.id.padStart(5)}  ${(v.doel_pad ?? "(geen doelpad)").padEnd(44)}` +
          `${(STATUS_LABEL[v.publicatie_status as keyof typeof STATUS_LABEL] ?? v.publicatie_status).padEnd(26)}` +
          `precheck ${v.precheck_uitslag ?? "nog niet gedraaid"}` +
          (v.beoordeeld_door_email ? `  (door ${v.beoordeeld_door_email})` : ""),
      );
    }
    console.log("");
    return 0;
  }

  const voorstelId = argument("voorstel");
  if (!voorstelId || !/^\d+$/.test(voorstelId)) {
    console.error("Gebruik: npm run precheck -- --voorstel <id>   of   --lijst");
    return 1;
  }

  /* HET ARTEFACT IS EEN VOORWAARDE. Zonder sitekennis is niet te zeggen
     of de doelpagina nog bestaat of of de website is verschoven, en dan
     hoort dit commando te weigeren in plaats van een PASS te geven op
     een halve meting. */
  const uitslag = await leesSitekennis(APP_WORTEL);
  if (!uitslag.ok) {
    console.error("");
    console.error(`AFGEBROKEN — sitekennis onbruikbaar (${uitslag.fout.soort}).`);
    console.error(uitslag.fout.bericht);
    console.error("Er is GEEN precheck gedraaid en geen status gewijzigd.");
    return 2;
  }
  const kennis = uitslag.kennis;

  const r = await metOrganisatie(pool, { organisatieId }, (c) =>
    publicatiePrecheck(c, organisatieId, voorstelId, {
      gepubliceerdeRoutes: [...gepubliceerdeRoutes(kennis)],
      huidigeWebsiteVersie: kennis.websiteVersie,
    }),
  );

  if (heeft("json")) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log("");
    console.log(`PUBLICATIEPRECHECK — voorstel ${voorstelId}`);
    console.log("=".repeat(72));
    console.log("");
    console.log(
      `  artefact: ${kennis.aantalPaginas} gepubliceerde pagina's, ` +
        `websiteVersie ${kennis.websiteVersie.slice(0, 12)}…`,
    );
    console.log("");
    for (const ct of r.controles) {
      console.log(`  ${ct.oordeel.padEnd(5)} ${ct.naam.padEnd(38)}${ct.reden}`);
    }
    console.log("");
    console.log(`  UITSLAG  ${r.uitslag}`);
    console.log("");
    if (r.uitslag === "PASS") {
      console.log("  De status staat nu op PUBLICATION_PRECHECK.");
      console.log("  Er is NIETS gepubliceerd: het doorvoeren van de wijziging blijft een");
      console.log("  menselijke handeling via de beschermde git-werkstroom.");
    } else {
      console.log("  Publicatie is GEBLOKKEERD. De status is niet opgeschoven.");
      console.log("  Laat het voorstel opnieuw beoordelen of herbouwen.");
    }
    console.log("");
  }

  log.info("publicatieprecheck", {
    voorstel_id: voorstelId,
    uitslag: r.uitslag,
    controles: r.controles.length,
    gefaald: r.controles.filter((x) => x.oordeel === "FAIL").map((x) => x.naam).join(",") || null,
    website_versie: kennis.websiteVersie,
  });

  return r.uitslag === "PASS" ? 0 : 1;
}

try {
  process.exitCode = await main();
} finally {
  await sluitAllePools();
}
