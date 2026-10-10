/* ============================================================
   BRONNEN — verificatie en driftdetectie
   ------------------------------------------------------------
   robots.txt verandert. Een bron die vandaag mag, mag over een
   maand misschien niet meer — en omgekeerd. Deze stap meet opnieuw
   wat het register beweert en meldt elk verschil.

   Het register is dus niet "de waarheid"; het is een vastgelegde
   meting met een datum, en dit is het instrument dat hem nakijkt.
   ============================================================ */

import { maakLogger } from "../kern/log.ts";
import { haalBron } from "./haal.ts";
import { haalRobots } from "./robots.ts";
import { aangekondigdInRobots, bepaalToestemming } from "./toestemmingsbeleid.ts";
import { controleerBron, type Bron } from "./soorten.ts";

const log = maakLogger("verifieer");

export type Afwijking = {
  readonly veld: string;
  readonly inRegister: string;
  readonly gemeten: string;
  readonly ernst: "blokkerend" | "let_op";
};

export type BronVerificatie = {
  readonly sleutel: string;
  readonly uitgever: string;
  readonly registerActief: boolean;
  readonly robotsGemeten: string;
  readonly tdmGemeten: string;
  readonly toestemmingsGrondslag: string;
  readonly mogenVerwerken: boolean;
  readonly ophaalResultaat: string;
  readonly httpStatus: number | null;
  readonly aantalItems: number | null;
  readonly opmerking: string;
  readonly afwijkingen: readonly Afwijking[];
  readonly structuurFouten: readonly string[];
};

/** Alleen de toestemmingsvraag meten; raakt het endpoint niet aan. */
export async function verifieerToestemming(bron: Bron): Promise<{
  robotsStatus: string;
  tdmStatus: string;
  grondslag: string;
  mogenVerwerken: boolean;
  bewijs: string;
}> {
  const robots = await haalRobots(bron.endpointUrl);
  const toestemming = bepaalToestemming({
    robots: robots.robots,
    licentie: bron.licentie,
    licentieBewijs: bron.licentieUrl,
    hergebruikVerklaring: bron.hergebruikVerklaring,
    isSyndicatie: bron.soort === "rss" || bron.soort === "atom",
    inRobotsAangekondigd: aangekondigdInRobots(robots.robots, bron.endpointUrl),
  });
  return {
    robotsStatus: robots.robotsStatus,
    tdmStatus: toestemming.tdmStatus,
    grondslag: toestemming.grondslag,
    mogenVerwerken: robots.padToegestaan && toestemming.mogenVerwerken,
    bewijs: `${robots.bewijs} || ${toestemming.bewijs}`,
  };
}

export async function verifieerBron(
  bron: Bron,
  opties: { haalOok?: boolean } = {},
): Promise<BronVerificatie> {
  const structuurFouten = controleerBron(bron);
  const toestemming = await verifieerToestemming(bron);
  const afwijkingen: Afwijking[] = [];

  if (toestemming.robotsStatus !== bron.robotsStatus) {
    afwijkingen.push({
      veld: "robotsStatus",
      inRegister: bron.robotsStatus,
      gemeten: toestemming.robotsStatus,
      ernst: toestemming.robotsStatus === "toegestaan" ? "let_op" : "blokkerend",
    });
  }
  if (toestemming.tdmStatus !== bron.tdmStatus) {
    afwijkingen.push({
      veld: "tdmStatus",
      inRegister: bron.tdmStatus,
      gemeten: toestemming.tdmStatus,
      ernst: toestemming.tdmStatus === "geen_voorbehoud" ? "let_op" : "blokkerend",
    });
  }
  // Een bron die aan staat terwijl de meting zegt dat het niet mag is
  // het ergste geval: dan haalt de collector op wat niet mag.
  if (bron.actief && !toestemming.mogenVerwerken) {
    afwijkingen.push({
      veld: "actief",
      inRegister: "true",
      gemeten: `toestemming ontbreekt (${toestemming.grondslag})`,
      ernst: "blokkerend",
    });
  }

  let ophaalResultaat = "niet geprobeerd";
  let httpStatus: number | null = null;
  let aantalItems: number | null = null;
  let opmerking = "";

  if (opties.haalOok && toestemming.mogenVerwerken) {
    const uitkomst = await haalBron(bron, { ookAlsInactief: true });
    ophaalResultaat = uitkomst.resultaat;
    opmerking = uitkomst.opmerking ?? "";
    if (uitkomst.resultaat === "ok") {
      httpStatus = uitkomst.httpStatus;
      aantalItems = uitkomst.items.length;
      if (aantalItems === 0) {
        afwijkingen.push({
          veld: "items",
          inRegister: "geverifieerd met items",
          gemeten: "0 items na parsen en filteren",
          ernst: "let_op",
        });
      }
    } else if (uitkomst.resultaat === "fout") {
      httpStatus = uitkomst.httpStatus;
      opmerking = `${uitkomst.foutSoort}: ${uitkomst.foutBericht}`;
      afwijkingen.push({
        veld: "endpoint",
        inRegister: bron.verificatie.status,
        gemeten: `fout ${uitkomst.foutSoort}`,
        ernst: bron.actief ? "blokkerend" : "let_op",
      });
    } else if (uitkomst.resultaat === "overgeslagen") {
      opmerking = uitkomst.reden;
    }
  } else if (opties.haalOok) {
    ophaalResultaat = "overgeslagen";
    opmerking = `niet opgehaald: ${toestemming.bewijs}`;
  }

  log.debug("bron geverifieerd", {
    bron: bron.sleutel,
    afwijkingen: afwijkingen.length,
    resultaat: ophaalResultaat,
  });

  return {
    sleutel: bron.sleutel,
    uitgever: bron.uitgever,
    registerActief: bron.actief,
    robotsGemeten: toestemming.robotsStatus,
    tdmGemeten: toestemming.tdmStatus,
    toestemmingsGrondslag: toestemming.grondslag,
    mogenVerwerken: toestemming.mogenVerwerken,
    ophaalResultaat,
    httpStatus,
    aantalItems,
    opmerking: opmerking || toestemming.bewijs,
    afwijkingen,
    structuurFouten,
  };
}
