/* ============================================================
   CLI — operationele gezondheid
   ------------------------------------------------------------
     npm run gezondheid              volledig rapport
     npm run gezondheid -- --json    machineleesbaar, voor alertering
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

  if (heeft("json")) {
    console.log(
      JSON.stringify(
        {
          gemeten_op: new Date().toISOString(),
          eindoordeel: totaal,
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

  process.exitCode =
    totaal === "FOUT" ? 1 : totaal === "NIET GEMETEN" ? 2 : totaal === "LET OP" ? 3 : 0;
} finally {
  await sluitAllePools();
}
