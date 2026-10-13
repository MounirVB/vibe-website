/* ============================================================
   CLI — schaalcorrectie
   ------------------------------------------------------------
   Meet of er uitspraken zijn waarvan de bewaarde waarde zijn
   schaalwoord mist, en corrigeert die via de append-only keten.

   Droog is de standaard. Schrijven vraagt --toepassen, want dit raakt
   de uitspraaklaag.
   ============================================================ */

import { maakPool, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { herstelSchaal } from "../pijplijn/schaalcorrectie.ts";

const toepassen = process.argv.includes("--toepassen");

const pool = maakPool();
try {
  const organisatieId = await huidigeOrganisatie(pool);
  const r = await herstelSchaal(pool, organisatieId, { toepassen });

  console.log("SCHAALCORRECTIE");
  console.log("==============================================================================");
  console.log(`  modus        ${toepassen ? "TOEPASSEN (schrijft)" : "DROOG (meet alleen)"}`);
  console.log(`  bekeken      ${r.bekeken} uitspraak(en) met een waarde`);
  console.log(`  gevonden     ${r.gevonden} met schaalverlies`);
  console.log(`  aangebracht  ${r.aangebracht}`);
  console.log(`  overgeslagen ${r.overgeslagen}`);

  for (const x of r.regels) {
    console.log("");
    console.log(`  uitspraak ${x.uitspraakId} (gebeurtenis ${x.gebeurtenisId ?? "-"})`);
    console.log(
      `    ${x.oudeWaarde}${x.eenheid ? ` ${x.eenheid}` : ""}` +
        ` -> ${x.nieuweWaarde}${x.eenheid ? ` ${x.eenheid}` : ""}` +
        `   (schaalwoord '${x.schaalwoord}' uit de bron)`,
    );
    console.log(`    bron: "${x.vindplaats}"`);
    if (x.vervangerId !== null) console.log(`    vervanger: uitspraak ${x.vervangerId}`);
  }

  if (!toepassen && r.gevonden > 0) {
    console.log("");
    console.log("Niets geschreven. Draai met --toepassen om de correcties aan te brengen.");
  }
  if (toepassen && r.aangebracht > 0) {
    console.log("");
    console.log("De oude uitspraken staan er nog; intel.uitspraak_correcties legt de keten vast.");
    console.log("Draai hierna de semantiekbackfill, zodat de nieuwe waarden hun verwoording krijgen.");
  }
} finally {
  await sluitAllePools();
}
