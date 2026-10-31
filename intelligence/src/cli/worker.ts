/* ============================================================
   CLI — wachtrijworker
   ------------------------------------------------------------
     npm run worker                      blijf draaien
     npm run worker -- --een             precies een taak, dan stoppen
     npm run worker -- --leeg            draai tot de wachtrij leeg is
     npm run worker -- --soort ophalen   alleen deze soort

   Meerdere workers naast elkaar mogen: `for update skip locked` zorgt
   dat ze nooit dezelfde taak pakken. Zie src/kern/wachtrij.ts.

   WAT EEN WORKER NIET DOET
   Hij publiceert niet. De taaksoorten hieronder dekken ophalen,
   verwerken, beoordelen en signaleren — allemaal stappen die
   voorstellen opleveren. Publiceren blijft een expliciete menselijke
   handeling via `npm run publiceer`, want de redactionele staat komt
   van een mens en niet van een wachtrij.
   ============================================================ */

import { laadEnvBestand, configLezen } from "../kern/config.ts";
import { maakPool, metOrganisatie, sluitAllePools } from "../kern/db.ts";
import { motorpariteit } from "../ops/motorpariteit.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { maakLogger } from "../kern/log.ts";
import { GEPLANDE_SOORTEN, TAAKSOORTEN, voerUit } from "../kern/taken.ts";
import { redacteerFout, redigeer } from "../kern/geheimen.ts";
import {
  dlqInhoud,
  geefVerlopenTerug,
  hervatUitDlq,
  pakTaak,
  laatMislukken,
  rondAf,
  wachtrijBeeld,
  type Taak,
} from "../kern/wachtrij.ts";
import { hostname } from "node:os";

laadEnvBestand();
const config = configLezen();
const log = maakLogger("worker");

const heeft = (naam: string) => process.argv.includes(`--${naam}`);
const waarde = (naam: string) => {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const WORKER = `${hostname()}/${process.pid}`;

/* GRENDEL BIJ HET OPSTARTEN — niet bij het falen van een taak.

   Het defect dat 3.0.4 repareert was dat de planner soorten plande die
   geen handler hadden (en omgekeerd: handlers die nooit werden gepland).
   Dat bleef onzichtbaar tot een taak in de dlq belandde met 'onbekende
   taaksoort', of — erger — tot iemand merkte dat een stap dagen niets
   had gedaan. De vergelijking hoort hier, bij het opstarten, zodat een
   deploy met een scheve registratie meteen opvalt. De toets die hem
   vóór de deploy vangt staat in test/eenheid/taken.test.ts. */
const zonderHandler = GEPLANDE_SOORTEN.filter((s) => !TAAKSOORTEN.includes(s));
if (zonderHandler.length > 0) {
  log.fout("geplande taaksoort zonder handler", { soorten: zonderHandler });
  console.error(
    `De planner plant ${zonderHandler.join(", ")} maar deze worker kan die soort(en) ` +
      `niet uitvoeren. Dat is een registratiefout in kern/taken.ts, geen taakfout.`,
  );
  process.exit(1);
}
const soortFilter = waarde("soort");

/* De taakregistratie staat sinds 3.0.4 in kern/taken.ts.

   WAAROM VERHUISD. PLAN stond in cli/planner.ts en REGISTER hier, en
   beide zijn CLI's met top-level await — geen toets kon ze importeren.
   Daardoor kon de lijst geplande soorten uit de pas lopen met de lijst
   uitvoerbare soorten zonder dat iets het merkte, en dat is precies wat
   er gebeurde: `semantiek` en `voorstel` stonden in geen van beide, en
   `gezondheid` werd door niets gestart. De vergelijking staat nu als
   toets in test/eenheid/taken.test.ts. */
const pool = maakPool();
let gestopt = false;
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    log.info("stopsignaal ontvangen, ronde afmaken en stoppen", { signaal: sig });
    gestopt = true;
  });
}

try {
  const organisatieId = await huidigeOrganisatie(pool);

  /* --dlq toont de dead-letter queue; --dlq-hervat zet hem terug.
     Hervatten is met opzet een MENSELIJKE handeling en geen automatisme
     van de worker: een worker die zijn eigen dlq leegtrekt is geen dlq.
     Zie hervatUitDlq(). */
  if (heeft("dlq") || heeft("dlq-hervat")) {
    const inhoud = await metOrganisatie(pool, { organisatieId }, (c) =>
      dlqInhoud(c, organisatieId),
    );
    console.log("");
    console.log(`DEAD-LETTER QUEUE — ${inhoud.length} taak/taken`);
    console.log("");
    for (const t of inhoud) {
      console.log(`  [${t.id}] ${t.soort.padEnd(14)} ${t.pogingen} pogingen  ${t.bijgewerktOp}`);
      console.log(`       ${t.laatsteFoutSoort ?? "onbekend"}: ${redigeer(t.laatsteFout ?? "").slice(0, 120)}`);
    }
    if (heeft("dlq-hervat")) {
      const soort = waarde("soort");
      const hervat = await metOrganisatie(pool, { organisatieId }, (c) =>
        hervatUitDlq(c, organisatieId, soort ? { soort } : {}),
      );
      console.log("");
      console.log(`${hervat.length} taak/taken teruggezet in de wachtrij (pogingen op nul)`);
      console.log("Draai de worker om ze te verwerken.");
    } else if (inhoud.length) {
      console.log("");
      console.log("Hervatten: npm run worker -- --dlq-hervat [--soort <soort>]");
    }
    process.exit(0);
  }

  /* DE MOTORPARITEIT, VOOR DE EERSTE TAAK — en dit is de plek waar het
     écht moet, niet alleen in de planner.

     Gemeten op 31 oktober 2026 via de Railway-API: ALLEEN
     vibe-intel-api draagt een preDeployCommand
     (`npm run migreer && npm run zaai && npm run geo`); de andere
     services hebben er geen. De vier services deployen PARALLEL en
     watchPatterns is overal leeg, dus de worker kan met v2-code
     opstarten terwijl de migratie van vibe-intel-api nog loopt. In dat
     venster praat v2-code tegen schema 44 en loopt elke classificatie
     vast op de CHECK versies_documentsoort — per document, zonder dat
     iemand ziet dat de oorzaak een nog niet toegepaste migratie is.

     Exitcode 1, zodat Railway de service als gefaald toont en
     herstart. Bij een herstart na de migratie sluit de pariteit wel en
     loopt hij door; dat is precies het gedrag dat je wilt. */
  const pariteit = await metOrganisatie(pool, { organisatieId }, (c) => motorpariteit(c));
  if (!pariteit.sluit) {
    log.fout("motorpariteit sluit niet; de worker weigert werk te pakken", {
      codeVersie: pariteit.codeVersie,
      databaseVersie: pariteit.databaseVersie,
      bewijs: pariteit.bewijs,
    });
    console.error("MOTORPARITEIT — GEWEIGERD");
    console.error(`  ${pariteit.bewijs}`);
    console.error("");
    console.error("Er is GEEN taak gepakt. Dit is een halve uitrol, geen storing.");
    await sluitAllePools();
    process.exit(1);
  }

  // Eerst opruimen: taken van een omgevallen worker terugleggen.
  const teruggegeven = await metOrganisatie(pool, { organisatieId }, (c) =>
    geefVerlopenTerug(c, organisatieId),
  );
  if (teruggegeven) console.log(`verlopen leases teruggegeven: ${teruggegeven}`);

  let gedaan = 0;
  let mislukt = 0;
  let dlq = 0;

  for (;;) {
    if (gestopt) break;

    const uitkomst = await metOrganisatie(pool, { organisatieId }, async (c) => {
      const taak = await pakTaak(c, organisatieId, WORKER, soortFilter ? [soortFilter] : undefined);
      return taak;
    });

    if (!uitkomst) {
      if (heeft("een") || heeft("leeg")) break;
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    const begin = performance.now();
    try {
      const melding = await voerUit(pool, organisatieId, uitkomst);
      const duur = performance.now() - begin;
      await metOrganisatie(pool, { organisatieId }, (c) => rondAf(c, uitkomst.id, duur));
      gedaan += 1;
      console.log(`[${uitkomst.id}] ${uitkomst.soort} GEREED in ${Math.round(duur)}ms — ${melding}`);
    } catch (e) {
      const uit = await metOrganisatie(pool, { organisatieId }, (c) =>
        laatMislukken(c, uitkomst, e),
      );
      if (uit === "dlq") dlq += 1;
      else mislukt += 1;
      console.log(
        `[${uitkomst.id}] ${uitkomst.soort} ${uit.toUpperCase()} — ${redacteerFout(e)}`,
      );
    }

    if (heeft("een")) break;
  }

  console.log("");
  console.log(`WORKER ${WORKER}`);
  console.log(`  gereed            ${gedaan}`);
  console.log(`  opnieuw gepland   ${mislukt}`);
  console.log(`  naar dlq          ${dlq}`);
  console.log("");
  const beeld = await wachtrijBeeld(pool, organisatieId);
  if (beeld.length) {
    console.log("WACHTRIJ");
    for (const b of beeld) console.log(`  ${b.status.padEnd(12)} ${b.soort.padEnd(24)} ${b.aantal}`);
  } else {
    console.log("WACHTRIJ leeg");
  }
} finally {
  await sluitAllePools();
}
