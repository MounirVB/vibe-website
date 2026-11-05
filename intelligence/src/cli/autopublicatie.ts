#!/usr/bin/env node
/* ============================================================
   CLI — automatische publicatie
   ------------------------------------------------------------
     npm run autopublicatie              droog: wat ZOU er gebeuren
     npm run autopublicatie -- --echt    publiceren

   DROOG IS DE STANDAARD, en bij deze taak meer dan gewoonlijk: het
   alternatief schrijft een pagina naar de live site. Draai hem eerst
   droog, lees welke kandidaten op welke voorwaarde afvallen, en pas
   daarna --echt.

   Staat het beleid uit — en dat is de standaard — dan doet ook --echt
   niets. Dat is geen vangnet maar de eerste van de negen voorwaarden.
   ============================================================ */

import { maakPool, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { automatischPubliceren, MAX_GEBEURTENIS_LEEFTIJD_DAGEN } from "../inhoud/autopublicatie.ts";

const pool = maakPool();
try {
  const organisatieId = await huidigeOrganisatie(pool);
  const droog = !process.argv.includes("--echt");
  const r = await automatischPubliceren(pool, organisatieId, { droog });

  const uit: string[] = [];
  uit.push("");
  uit.push("AUTOMATISCHE PUBLICATIE");
  uit.push("=".repeat(78));
  uit.push(`  modus        ${droog ? "DROOG (publiceert niets)" : "ECHT"}`);

  if (r.beleid === null) {
    uit.push("  beleid       GEEN ACTIEVE REGEL");
  } else {
    uit.push(`  beleid       '${r.beleid.versie}'`);
    uit.push(`    auto aan             ${r.beleid.autoAan ? "JA" : "nee (standaard)"}`);
    uit.push(`    max risico           ${r.beleid.maxRisico ?? "(geen)"}`);
    uit.push(
      `    toegestane soorten   ${
        r.beleid.toegestaneSoorten.length === 0
          ? "(LEEG — geen enkele soort toegestaan)"
          : r.beleid.toegestaneSoorten.join(", ")
      }`,
    );
    uit.push(`    min bronnen          ${r.beleid.minBronnen}`);
    uit.push(`    min bewijskwaliteit  ${r.beleid.minBewijskwaliteit}`);
  }
  uit.push(`  actualiteitsgrens  ${MAX_GEBEURTENIS_LEEFTIJD_DAGEN} dagen`);
  uit.push("");

  if (r.beleidReden !== null) {
    uit.push("  ER IS NIETS GEDAAN");
    uit.push(`  ${r.beleidReden}`);
    uit.push("");
    uit.push("  Hoog risico vereist altijd een mens, ongeacht deze instellingen.");
    uit.push("  Dat staat op drie niveaus dicht: het beleid, de versierij en deze module.");
  } else {
    uit.push(`  bekeken      ${r.bekeken} kandidaat(en) met geslaagde poorten op review`);
    uit.push(
      `  ${droog ? "zou publiceren" : "gepubliceerd"}  ${r.gepubliceerd.length}` +
        (r.gepubliceerd.length === 0
          ? ""
          : "\n" +
            r.gepubliceerd
              .map(
                (g) =>
                  `    ${g.pad}` +
                  (g.publicatieId === null ? "" : `  publicatie ${g.publicatieId}`) +
                  (g.sitemapBijgewerkt ? "  sitemap bijgewerkt" : ""),
              )
              .join("\n")),
    );
    uit.push(`  geweigerd    ${r.geweigerd.length}`);
    for (const w of r.geweigerd) {
      uit.push(`    versie ${w.inhoudVersieId} ${w.pad}`);
      uit.push(`      voorwaarde ${w.voorwaarde}: ${w.reden}`);
    }
  }
  uit.push("");
  process.stdout.write(uit.join("\n") + "\n");
  process.exitCode = 0;
} finally {
  await sluitAllePools();
}
