/* ============================================================
   CLI — operationele gezondheid
   ------------------------------------------------------------
     npm run gezondheid              volledig rapport
     npm run gezondheid -- --json    machineleesbaar, voor alertering
     npm run gezondheid -- --meld    meldingen bijwerken en bezorgen
     npm run gezondheid -- --kort    alleen wat niet OK is

   Exitcode, zodat cron en een alerteerder hier iets mee kunnen:
     0  alles OK
     1  minstens een FOUT
     2  minstens een NIET GEMETEN, geen FOUT
     3  minstens een LET OP, geen FOUT en geen NIET GEMETEN

   NIET GEMETEN is bewust ERNSTIGER dan LET OP. Een monitor die bij
   een ontbrekende meting groen zegt is erger dan geen monitor.
   ============================================================ */

import { join } from "node:path";
import { laadEnvBestand, APP_WORTEL } from "../kern/config.ts";
import { maakPool, metOrganisatie, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { meetGezondheid, zwaarste, type Niveau } from "../ops/gezondheid.ts";
import { meldRonde } from "../ops/melden.ts";
import { bouwErnstRapport, DOMEIN_LABEL, ERNST_ORDE } from "../ops/ernst.ts";

laadEnvBestand();

const heeft = (n: string) => process.argv.includes(`--${n}`);

/* De eigenaarspool: de monitor leest intel.migraties en
   intel.kostenplafonds, en de applicatierol mag die eerste niet. */
const pool = maakPool({ rol: null });
try {
  const organisatieId = await huidigeOrganisatie(pool);
  const signalen = await metOrganisatie(pool, { organisatieId }, (c) =>
    meetGezondheid(c, organisatieId, { backupMap: join(APP_WORTEL, "backups") }),
  );
  const totaal = zwaarste(signalen);
  /* Par. 18: dezelfde metingen, maar gegroepeerd per domein en vertaald
     naar ernst. `totaal` blijft het signaalniveau (voor de exitcode die
     cron al gebruikt); `ernst` is wat een mens leest. */
  const ernst = bouwErnstRapport(signalen);

  if (heeft("json")) {
    console.log(
      JSON.stringify(
        {
          gemeten_op: new Date().toISOString(),
          eindoordeel: totaal,
          ernst: ernst.totaal,
          samenvatting: ernst.samenvatting,
          aanvaarde_beperkingen: ernst.aanvaardTotaal,
          domeinen: ernst.domeinen.map((d) => ({
            domein: d.domein,
            ernst: d.ernst,
            reden: d.reden,
            metingen: d.signalen.length,
            aanvaard: d.aanvaard,
          })),
          signalen,
        },
        null,
        2,
      ),
    );
  } else {
    const teTonen = heeft("kort") ? signalen.filter((s) => s.niveau !== "OK") : signalen;
    console.log("");
    console.log("OPERATIONELE GEZONDHEID");
    console.log("=".repeat(92));
    let groep = "";
    for (const s of teTonen) {
      if (s.groep !== groep) {
        groep = s.groep;
        console.log("");
        console.log(groep.toUpperCase());
      }
      console.log(`  ${s.niveau.padEnd(12)} ${s.naam.padEnd(38)} ${s.meting}`);
      if (s.advies) console.log(`  ${" ".repeat(12)} -> ${s.advies}`);
    }
    if (heeft("kort") && teTonen.length === 0) console.log("\n  alles OK");

    /* ---- par. 18: ernst per domein ----
       Dit staat BOVEN de signaaltelling omdat het de vraag beantwoordt
       die een mens stelt: moet ik nu iets doen, en waaraan. De losse
       signalen blijven eronder staan als onderbouwing. */
    console.log("");
    console.log("=".repeat(92));
    console.log("ERNST PER DOMEIN");
    for (const d of ernst.domeinen) {
      console.log(
        `  ${d.ernst.padEnd(16)} ${DOMEIN_LABEL[d.domein].padEnd(16)} ${d.reden.slice(0, 54)}`,
      );
      if (d.aanvaard > 0) {
        console.log(`  ${" ".repeat(16)} ${" ".repeat(16)} (${d.aanvaard} aanvaarde beperking(en))`);
      }
    }
    console.log("");
    console.log(`ERNST TOTAAL = ${ernst.totaal}`);
    console.log(`  ${ernst.samenvatting}`);
    if (ernst.aanvaardTotaal > 0) {
      console.log("");
      console.log(`AANVAARDE BEPERKINGEN (${ernst.aanvaardTotaal}) — zichtbaar, maar ze verhogen de`);
      console.log("totaalernst niet. Een bron die ons bewust buitensluit maakt het platform");
      console.log("niet ongezond zolang de rest werkt.");
      for (const s of signalen.filter((x) => x.aanvaard === true)) {
        console.log(`  ${s.groep}/${s.naam}: ${s.meting.slice(0, 70)}`);
      }
    }
    if (ernst.nietGemeten.length > 0) {
      console.log("");
      console.log(`NIET GEMETEN (${ernst.nietGemeten.length}) — dit is geen 'in orde'.`);
      for (const s of ernst.nietGemeten) {
        console.log(`  ${s.groep}/${s.naam}: ${s.meting.slice(0, 70)}`);
      }
    }

    const tel = (n: Niveau) => signalen.filter((s) => s.niveau === n).length;
    console.log("");
    console.log("=".repeat(92));
    console.log(
      `SIGNALEN ${signalen.length}   OK ${tel("OK")}   LET OP ${tel("LET OP")}   ` +
        `NIET GEMETEN ${tel("NIET GEMETEN")}   FOUT ${tel("FOUT")}`,
    );
    console.log("");
    console.log(`EINDOORDEEL = ${totaal}`);
    if (totaal === "NIET GEMETEN") {
      console.log("");
      console.log("NIET GEMETEN is ernstiger dan LET OP: er is iets dat deze monitor");
      console.log("niet kan vaststellen, en dan weet je het dus niet.");
    }
  }

  /* --meld maakt van de momentopname STAAT: open storingen worden
     geopend of bijgewerkt, opgeloste worden gesloten, en als er een
     bestemming is wordt er bezorgd. Bewust achter een vlag: een
     eenvoudige meting hoort niets te schrijven. */
  if (heeft("meld")) {
    const stand = await metOrganisatie(pool, { organisatieId }, (c) =>
      meldRonde(c, organisatieId, signalen),
    );
    if (!heeft("json")) {
      console.log("");
      console.log("MELDINGEN");
      console.log(`  geopend ${stand.geopend}   bijgewerkt ${stand.bijgewerkt}   gesloten ${stand.gesloten}   open ${stand.open}`);
      console.log(`  bezorgd ${stand.bezorgd}   bezorgfouten ${stand.bezorgfouten}`);
      console.log(`  bestemming ${stand.bestemming}`);
    } else {
      console.log(JSON.stringify({ meldingen: stand }, null, 2));
    }
  }

  process.exitCode =
    totaal === "FOUT" ? 1 : totaal === "NIET GEMETEN" ? 2 : totaal === "LET OP" ? 3 : 0;
} finally {
  await sluitAllePools();
}
