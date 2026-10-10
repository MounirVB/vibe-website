/* ============================================================
   CLI — regionale intelligentie
   ------------------------------------------------------------
     npm run regio                 bind gebieden en maak voorstellen
     npm run regio -- --droog      niets schrijven, alleen meten
     npm run regio -- --alles      ook gebeurtenissen die al gebonden zijn
     npm run regio -- --advies     alleen het prioriteitsadvies tonen

   Dit commando publiceert niets. Het kan dat ook niet: het schrijft
   alleen naar intel.gebeurtenis_geo en intel.regio_impacts, en die
   laatste houdt status 'voorstel'.
   ============================================================ */

import { laadEnvBestand, configLezen } from "../kern/config.ts";
import { maakPool, organisatieIdVan, sluitAllePools } from "../kern/db.ts";
import { bouwRegioImpacts, regioAdvies } from "../regio/impacts.ts";

laadEnvBestand();
const config = configLezen();

const heeft = (naam: string) => process.argv.includes(`--${naam}`);

const pool = maakPool();
try {
  const organisatieId = await organisatieIdVan(pool, config.organisatieSleutel);

  if (!heeft("advies")) {
    const r = await bouwRegioImpacts(pool, organisatieId, {
      droog: heeft("droog"),
      alles: heeft("alles"),
    });

    console.log("");
    console.log(`REGIO — BINDEN EN VOORSTELLEN${heeft("droog") ? " (DROOG)" : ""}`);
    console.log("");
    console.log(`routeregister Release 1          ${r.routeregister}`);
    console.log(`gebeurtenissen bekeken           ${r.gebeurtenissenBekeken}`);
    console.log(`gebieden gebonden                ${r.gebiedenGebonden}`);
    console.log(`bindingen afgewezen (ambigu)     ${r.bindingenAfgewezen}`);
    console.log(`impactvoorstellen nieuw          ${r.impactsNieuw}`);
    console.log(`overgeslagen (geen impactsoort)  ${r.impactsOvergeslagen}`);
    console.log("");
    console.log("VOLGENS HET REGISTER VAN RELEASE 1");
    console.log(`  gebied met gepubliceerde route ${r.gereedVolgensRelease1}`);
    console.log(`  gebied met PENDING-route       ${r.pendingVolgensRelease1}`);
    console.log(`  gebied zonder route            ${r.zonderRoute}`);
    if (Object.keys(r.perSoort).length) {
      console.log("");
      console.log("PER IMPACTSOORT");
      for (const [k, v] of Object.entries(r.perSoort).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${k.padEnd(24)} ${v}`);
      }
    }
  }

  const advies = await regioAdvies(pool, organisatieId, 20);
  if (advies.length) {
    console.log("");
    console.log("PRIORITEITSADVIES — waar beweegt de markt het meest");
    console.log("Dit is een rangschikking, geen publicatiebesluit.");
    console.log("");
    console.log(
      `${"gebied".padEnd(26)} ${"soort".padEnd(20)} ${"route".padEnd(34)} ${"R1".padEnd(10)} impacts`,
    );
    console.log("-".repeat(104));
    for (const a of advies) {
      console.log(
        `${a.gebied.slice(0, 25).padEnd(26)} ${a.soort.padEnd(20)} ` +
          `${(a.route ?? "—").slice(0, 33).padEnd(34)} ${a.staatVolgensRelease1.padEnd(10)} ${a.impacts}`,
      );
    }
    console.log("");
    console.log("Geen van deze routes is door dit commando van staat veranderd.");
  }
} finally {
  await sluitAllePools();
}
