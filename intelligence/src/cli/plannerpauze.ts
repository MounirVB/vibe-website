/* ============================================================
   CLI — plannerpauze
   ------------------------------------------------------------
     npm run plannerpauze                      de stand tonen
     npm run plannerpauze -- --status          idem, expliciet

     npm run plannerpauze -- --pauzeer \
       --door "<naam>" --reden "<waarom>"

     npm run plannerpauze -- --hervat \
       --door "<naam>" --reden "<waarom>" --autorisatie "<grond>"

   PAUZEREN MAG ALTIJD. Stilstaan is de veilige kant, dus daar staat
   geen drempel op. HERVATTEN vraagt een autorisatie, en die eis staat
   als CHECK in de database (0046) en niet alleen hier.

   DE STAND IS EEN EXITCODE, ZODAT EEN SCRIPT HEM KAN LEZEN:
     0  de planner loopt
     2  de planner is gepauzeerd
     1  er ging iets mis
   Dat onderscheid bestaat omdat een releaseprocedure moet kunnen
   TOETSEN dat de pauze echt staat voordat hij gaat deployen. "Ik heb
   het commando gedraaid" is geen bewijs; een exitcode uitlezen is dat.
   ============================================================ */

import { laadEnvBestand } from "../kern/config.ts";
import { maakPool, metOrganisatie, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { hervat, pauzeer, pauzeStand, standAlsRegel } from "../ops/plannerpauze.ts";
import { motorpariteit } from "../ops/motorpariteit.ts";
import { DOCUMENTSOORT_VERSIE } from "../pijplijn/documentsoort.ts";
import { MODALITEIT_VERSIE } from "../pijplijn/claimmodaliteit.ts";

laadEnvBestand();

const heeft = (naam: string) => process.argv.includes(`--${naam}`);
const waarde = (naam: string): string | undefined => {
  const i = process.argv.indexOf(`--${naam}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
};

const PAUZEREN = heeft("pauzeer");
const HERVATTEN = heeft("hervat");

if (PAUZEREN && HERVATTEN) {
  console.error("--pauzeer en --hervat tegelijk is geen besluit. Kies een van de twee.");
  process.exit(1);
}

const MOTORVERSIES = `${DOCUMENTSOORT_VERSIE} + ${MODALITEIT_VERSIE}`;

const pool = maakPool();
let exitcode = 0;
try {
  const organisatieId = await huidigeOrganisatie(pool);

  if (PAUZEREN || HERVATTEN) {
    const door = waarde("door");
    const reden = waarde("reden");
    if (!door || !reden) {
      console.error('--door "<naam>" en --reden "<waarom>" zijn beide verplicht.');
      console.error("De reden moet minstens 10 tekens zijn; de database weigert een lege reden.");
      process.exit(1);
    }
    if (HERVATTEN) {
      const autorisatie = waarde("autorisatie");
      if (!autorisatie) {
        console.error('--autorisatie "<grond>" is verplicht bij --hervat.');
        console.error("Hervatten zet de keten weer in beweging en hoort een naam te dragen.");
        process.exit(1);
      }
      /* VOORDAT WE HERVATTEN: sluit de motor nog aan op de database?
         Hervatten na een halve uitrol zet juist de keten aan die op de
         CHECK gaat vastlopen. Beter hier weigeren dan een uur later per
         document. */
      const pariteit = await metOrganisatie(pool, { organisatieId }, (c) => motorpariteit(c));
      if (!pariteit.sluit) {
        console.error("HERVATTEN GEWEIGERD — de motor sluit niet aan op de database:");
        console.error(`  ${pariteit.bewijs}`);
        process.exit(1);
      }
      await metOrganisatie(pool, { organisatieId }, (c) =>
        hervat(c, organisatieId, { reden, door, autorisatie, motorversies: MOTORVERSIES }),
      );
      console.log("HERVAT vastgelegd.");
    } else {
      await metOrganisatie(pool, { organisatieId }, (c) =>
        pauzeer(c, organisatieId, { reden, door, motorversies: MOTORVERSIES }),
      );
      console.log("PAUZE vastgelegd.");
    }
    console.log("");
  }

  const stand = await metOrganisatie(pool, { organisatieId }, (c) =>
    pauzeStand(c, organisatieId),
  );
  const pariteit = await metOrganisatie(pool, { organisatieId }, (c) => motorpariteit(c));

  console.log("PLANNERPAUZE — stand");
  console.log("");
  console.log(`  ${standAlsRegel(stand)}`);
  console.log(`  motorpariteit: ${pariteit.sluit ? "SLUIT AAN" : "GEWEIGERD"} — ${pariteit.bewijs}`);
  console.log(`  code ${pariteit.codeVersie} · database ${pariteit.databaseVersie}`);
  console.log("");
  console.log(
    stand.gepauzeerd
      ? "De planner plant NIETS en de worker pakt GEEN nieuw werk. Een al geclaimde taak loopt af."
      : "De planner plant en de worker pakt werk.",
  );

  exitcode = stand.gepauzeerd ? 2 : 0;
} finally {
  await sluitAllePools();
}
process.exit(exitcode);
