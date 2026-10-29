#!/usr/bin/env node
/* ============================================================
   CLI — nieuwsselectie
   ------------------------------------------------------------
     npm run nieuws                  beoordeel en schrijf NEWS_ITEM-kandidaten
     npm run nieuws -- --droog       alleen rekenen, niets wegschrijven
     npm run nieuws -- --toon 10     de tien hoogst scorende tonen
     npm run nieuws -- --waarom      ook de volledige assen per kandidaat
     npm run nieuws -- --nu 2026-10-29   reken alsof het deze dag is

   DEZE CLI PUBLICEERT NIETS EN KEURT NIETS GOED.
   Hij levert een werkvoorraad: welke gebeurtenissen kunnen een
   nieuwsbericht worden, in welke orde, en WAAROM de rest niet. Het
   concept maken is een volgende stap (npm run concept), goedkeuren is
   een menselijke handeling in het dashboard, en publiceren vraagt
   daarna nog een generatorrun, een commit en een push.

   DE AFWIJSGRONDEN ZIJN HET HALVE PRODUCT.
   Bij een kleine oogst is "2 van 144" geen bruikbaar antwoord. Welke
   grond hoeveel kandidaten tegenhoudt, zegt wat eraan te doen is: een
   betere bron afwachten, een regel in CLUSTER_NAAR_ROUTE toevoegen, of
   accepteren dat het onderwerp buiten de propositie valt.
   ============================================================ */

import { laadEnvBestand, configLezen } from "../kern/config.ts";
import { maakPool, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { leesNieuwsContext } from "../site/nieuwscontext.ts";
import { NIEUWSMOTOR_VERSIE, nieuwsselectieronde } from "../pijplijn/nieuwsselectie.ts";

laadEnvBestand();

const heeft = (naam: string) => process.argv.includes(`--${naam}`);
function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<number> {
  const config = configLezen();
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);

  const droog = heeft("droog");
  const vandaag = argument("nu") ?? new Date().toISOString().slice(0, 10);
  const toon = Number.parseInt(argument("toon") ?? "10", 10);

  const ctx = await leesNieuwsContext(config.siteWortel);

  process.stdout.write(`NIEUWSSELECTIE ${NIEUWSMOTOR_VERSIE}${droog ? " (DROOG)" : ""}\n\n`);
  process.stdout.write("CONTEXT\n");
  process.stdout.write(`  toestand           ${ctx.toestand}\n`);
  process.stdout.write(`  bron               ${ctx.herkomst.bron} — ${ctx.herkomst.bronReden}\n`);
  process.stdout.write(`  routeregister      ${ctx.herkomst.registerReden}\n`);
  process.stdout.write(`  routestaten        ${ctx.herkomst.statenReden}\n`);
  process.stdout.write(
    `  clusters met eigenaar ${ctx.herkomst.clustersMetEigenaar}` +
      (ctx.herkomst.clustersZonderEigenaar.length
        ? `, zonder: ${ctx.herkomst.clustersZonderEigenaar.join(", ")}`
        : "") +
      "\n",
  );
  if (ctx.herkomst.eigenarenNietOpIndex.length) {
    process.stdout.write(
      `  eigenaar NIET op INDEX ${ctx.herkomst.eigenarenNietOpIndex.join("; ")}\n`,
    );
  }
  process.stdout.write(
    `  bronnen met dragende soort ${ctx.herkomst.dragendeBronnen} van ${ctx.bronsoortPerSleutel.size}\n`,
  );
  process.stdout.write(
    `  bestaande nieuwsslugs ${ctx.bestaandeNieuwsSlugs.size}` +
      (ctx.herkomst.nieuwsmapAanwezig ? "" : " (map data/inhoud/nieuws/ bestaat nog niet)") +
      "\n",
  );
  for (const b of ctx.herkomst.beperkingen) {
    process.stdout.write(`  BEPERKING          ${b}\n`);
  }
  process.stdout.write("\n");

  /* GEEN RONDE ZONDER CONTEXT.
     Hiervoor draaide de ronde tóch, meldde "0 geschikt" en sloot af met
     exitcode 0. Dat is de stille variant van een storing: niets in de
     uitvoer onderscheidde "geen eigenaar" van "ik kan de site niet
     zien", en een nul met exitcode 0 leest als een geslaagde meting.
     Een exitcode 1 en een lege uitslag zijn hier het eerlijke antwoord. */
  if (ctx.toestand === "CONTEXT_NIET_BESCHIKBAAR") {
    process.stderr.write(
      `CONTEXT NIET BESCHIKBAAR (${ctx.herkomst.onbruikbaarSoort})\n` +
        `  ${ctx.herkomst.onbruikbaarReden}\n\n` +
        "Er is NIETS beoordeeld, niets geschreven, niets goedgekeurd en niets gepubliceerd.\n" +
        "Dit is geen uitkomst maar een storing: eigenaarschap is onbekend, niet afwezig.\n" +
        "Herstel: draai 'npm run sitekennis' in een checkout met de website erin, of zet\n" +
        "INTEL_SITE_WORTEL naar een worktree die data/inhoud en data/seo/routes.json bevat.\n",
    );
    return 1;
  }

  const rapport = await nieuwsselectieronde(pool, organisatieId, {
    vandaag,
    eigenaren: ctx.eigenaren,
    bronsoortPerSleutel: ctx.bronsoortPerSleutel,
    bestaandeNieuwsSlugs: ctx.bestaandeNieuwsSlugs,
    ...(droog ? { droog: true } : {}),
  });

  process.stdout.write("UITSLAG\n");
  process.stdout.write(`  beoordeeld           ${rapport.beoordeeld}\n`);
  process.stdout.write(`  geschikt             ${rapport.geschikt}\n`);
  process.stdout.write(`  ongeschikt           ${rapport.ongeschikt}\n`);
  process.stdout.write(`  kandidaten geschreven ${rapport.kandidatenGeschreven}\n\n`);

  const gronden = Object.entries(rapport.perAfwijsgrond).sort((a, b) => b[1] - a[1]);
  process.stdout.write("BINDENDE AFWIJSGROND, MEEST VOORKOMEND EERST\n");
  if (gronden.length === 0) process.stdout.write("  (geen)\n");
  for (const [grond, n] of gronden) {
    process.stdout.write(`  ${String(n).padStart(4)}x  ${grond}\n`);
  }

  const top = rapport.top.slice(0, Number.isFinite(toon) ? toon : 10);
  process.stdout.write(`\nWERKVOORRAAD — ${top.length} kandidaat/kandidaten\n`);
  if (top.length === 0) {
    process.stdout.write(
      "  (geen) — zie de afwijsgronden hierboven; er wordt niets verzonnen om deze lijst te vullen\n",
    );
  }
  for (const k of top) {
    process.stdout.write(
      `\n  [${String(k.score).padStart(3)}] g${k.gebeurtenisId}  ${k.titel.slice(0, 88)}\n`,
    );
    process.stdout.write(`        ${k.oordeel}\n`);
  }

  process.stdout.write("\nEr is niets gepubliceerd en niets goedgekeurd.\n");
  return 0;
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
