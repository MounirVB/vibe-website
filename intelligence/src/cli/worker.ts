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
import { huidigeOrganisatie } from "../db/zaai.ts";
import { maakLogger } from "../kern/log.ts";
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
const soortFilter = waarde("soort");

/* ------------------------------------------------------------
   De taakregistratie.
   ------------------------------------------------------------
   Elke soort wijst naar een bestaande, al geteste stap. De worker is
   een uitvoerder en geen tweede implementatie: zou hij de logica
   dupliceren, dan bestaan er twee waarheden over wat "ophalen" doet.
   Een onbekende soort is een NIET-herhaalbare fout — opnieuw proberen
   levert dezelfde onbekende soort op.
   ------------------------------------------------------------ */
type Handler = (
  organisatieId: number,
  payload: Record<string, unknown>,
) => Promise<string>;

const tekstOf = (p: Record<string, unknown>, k: string): string | undefined =>
  typeof p[k] === "string" ? (p[k] as string) : undefined;

export const TAAKSOORTEN = [
  "ophalen",
  "clusteren",
  "beoordelen",
  "regio",
  "signaleren",
] as const;

const REGISTER: Record<string, Handler> = {
  async ophalen(organisatieId, payload) {
    const { verzamel } = await import("../pijplijn/verzamelen.ts");
    const r = await verzamel(pool, organisatieId, {
      alleenBron: tekstOf(payload, "bron"),
      forceer: payload["forceer"] === true,
    });
    return `bronnen ${r.perBron.length}, nieuwe documenten ${r.nieuweDocumenten}, nieuwe versies ${r.nieuweVersies}`;
  },

  async clusteren(organisatieId) {
    const { clusterNieuweVersies } = await import("../pijplijn/clusteren.ts");
    const r = await clusterNieuweVersies(pool, organisatieId, {});
    return `versies ${r.versiesBekeken}, gebeurtenissen ${r.gebeurtenissenNieuw}, uitspraken ${r.uitsprakenAangemaakt}`;
  },

  async beoordelen(organisatieId) {
    const { neemBesluiten } = await import("../besluit/motor.ts");
    const r = await neemBesluiten(pool, organisatieId, {});
    return `beoordeeld ${r.beoordeeld}, kandidaten ${r.kandidatenGeschreven}`;
  },

  async regio(organisatieId) {
    const { bouwRegioImpacts } = await import("../regio/impacts.ts");
    const r = await bouwRegioImpacts(pool, organisatieId, {});
    return `gebonden ${r.gebiedenGebonden}, voorstellen ${r.impactsNieuw}`;
  },

  async signaleren(organisatieId) {
    const { maakSignalen } = await import("../commercieel/signalen.ts");
    const r = await maakSignalen(pool, organisatieId, {});
    return `signalen nieuw ${r.signalenNieuw}, bijgewerkt ${r.signalenBijgewerkt}`;
  },
};

async function voerUit(organisatieId: number, taak: Taak): Promise<string> {
  const handler = REGISTER[taak.soort];
  if (!handler) {
    const { IntelFout } = await import("../kern/fouten.ts");
    throw new IntelFout("configuratie", `onbekende taaksoort '${taak.soort}'`, {});
  }
  return handler(organisatieId, taak.payload);
}

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
      console.log(`       ${t.laatsteFoutSoort ?? "onbekend"}: ${(t.laatsteFout ?? "").slice(0, 120)}`);
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
      const melding = await voerUit(organisatieId, uitkomst);
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
        `[${uitkomst.id}] ${uitkomst.soort} ${uit.toUpperCase()} — ${e instanceof Error ? e.message : String(e)}`,
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
