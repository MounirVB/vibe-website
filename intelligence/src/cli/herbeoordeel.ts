#!/usr/bin/env node
/* ============================================================
   CLI — historische claims herbeoordelen onder de R3-regels
   ------------------------------------------------------------
     npm run herbeoordeel -- --droog    rekenen en rapporteren, niets
                                        wegschrijven
     npm run herbeoordeel              toepassen
     npm run herbeoordeel -- --max 100 in porties

   WAAROM DIT EEN EIGEN CLI IS EN NIET EEN MIGRATIE.
   Railway draait bij elke deployment `npm run migreer` via de
   preDeployCommand. Een migratie die stil 46 historische beoordelingen
   herschrijft zou dus bij een willekeurige deploy gebeuren, zonder dat
   iemand het heeft gevraagd en zonder dat iemand de uitkomst heeft
   gezien. Daarom is de schemawijziging (0042, 0043) gescheiden van de
   herverwerking: het schema komt met de deployment, de herbeoordeling
   is een handeling.

   DROOG EERST. De droge stand leest alles, rekent alles door en
   schrijft niets. De uitslag is regel voor regel dezelfde als die van
   een echte ronde, want hij komt uit dezelfde functie.
   ============================================================ */

import { laadEnvBestand, configLezen } from "../kern/config.ts";
import { maakPool, metOrganisatie, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { herbeoordeelClaims } from "../pijplijn/herbeoordeling.ts";
import { herbeoordeelStand } from "../pijplijn/claimpoort.ts";
import { DOCUMENTSOORT_VERSIE } from "../pijplijn/documentsoort.ts";
import { MODALITEIT_VERSIE } from "../pijplijn/claimmodaliteit.ts";

laadEnvBestand();

const heeft = (n: string) => process.argv.includes(`--${n}`);
function argument(n: string): string | undefined {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<number> {
  configLezen();
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);
  const droog = heeft("droog");
  const max = Number.parseInt(argument("max") ?? "5000", 10);

  process.stdout.write(
    `HERBEOORDELING ${DOCUMENTSOORT_VERSIE} + ${MODALITEIT_VERSIE}${droog ? " (DROOG)" : ""}\n\n`,
  );

  const voor = await metOrganisatie(pool, { organisatieId }, (c) =>
    herbeoordeelStand(c, organisatieId),
  );
  process.stdout.write(`  wachtend op herbeoordeling, vóór deze ronde: ${voor.openstaand}\n\n`);

  const r = await metOrganisatie(pool, { organisatieId }, (c) =>
    herbeoordeelClaims(c, organisatieId, { max, ...(droog ? { droog: true } : {}) }),
  );

  process.stdout.write("UITSLAG\n");
  process.stdout.write(`  bekeken                        ${r.bekeken}\n`);
  process.stdout.write(`  herbeoordeeld                  ${r.herbeoordeeld}\n`);
  process.stdout.write(`  bevestiging behouden           ${r.bevestigingBehouden}\n`);
  process.stdout.write(`  bevestiging INGETROKKEN        ${r.bevestigingIngetrokken}\n`);
  process.stdout.write(`  bewijskracht verlaagd          ${r.bewijskrachtVerlaagd}\n`);
  process.stdout.write(`  menselijk oordeel overgeslagen ${r.menselijkOvergeslagen}\n`);
  process.stdout.write(`  claims zonder brongegevens     ${r.zonderBrongegevens}\n`);
  process.stdout.write(`  vraagt menselijke controle     ${r.vraagtMenselijkeControle}\n\n`);

  process.stdout.write("PER DOCUMENTSOORT\n");
  const soorten = Object.entries(r.perDocumentsoort).sort((a, b) => b[1] - a[1]);
  if (soorten.length === 0) process.stdout.write("  (geen)\n");
  for (const [s, n] of soorten) {
    process.stdout.write(`  ${s.padEnd(30)}${String(n).padStart(5)}\n`);
  }

  process.stdout.write(`\nGETROFFEN GEBEURTENISSEN (${r.getroffenGebeurtenissen.length})\n`);
  process.stdout.write(
    r.getroffenGebeurtenissen.length === 0
      ? "  (geen)\n"
      : `  ${r.getroffenGebeurtenissen.join(", ")}\n`,
  );

  const na = await metOrganisatie(pool, { organisatieId }, (c) =>
    herbeoordeelStand(c, organisatieId),
  );
  process.stdout.write(`\n  wachtend op herbeoordeling, ná deze ronde: ${na.openstaand}\n`);
  if (droog) {
    process.stdout.write("  (DROOG — er is niets weggeschreven, dus dit getal is onveranderd)\n");
  } else if (na.openstaand > 0) {
    process.stdout.write(
      `  NOG TE DOEN: draai opnieuw; de claimpoort houdt tot die tijd de\n` +
        `  besluitmotor, de nieuwsselectie, de voorstellenlaag en de\n` +
        `  conceptgeneratie DICHT.\n`,
    );
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
    process.stderr.write(`herbeoordeling mislukt: ${String(e)}\n`);
    await sluitAllePools();
    process.exit(1);
  },
);
