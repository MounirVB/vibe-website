/* ============================================================
   KERN — foutsoorten
   ------------------------------------------------------------
   Expliciete soorten, zodat de wachtrij kan beslissen of een fout
   het opnieuw proberen waard is. Een 404 bij een bron is geen
   reden voor vijf pogingen; een 503 wel.
   ============================================================ */

export type FoutSoort =
  | "configuratie"
  | "netwerk"
  | "bron_http"
  | "bron_parse"
  | "bron_voorwaarden"
  | "database"
  | "autorisatie"
  | "poort"
  | "budget"
  | "model"
  /**
   * De aanroeper vraagt iets dat niet kan met de gegeven waarden: een
   * beoordeling zonder beoordelaar, een goedkeuring op een voorstel dat
   * de controles niet haalt. Dat is geen poort die dichtgaat maar een
   * opdracht die niet klopt, en opnieuw proberen met dezelfde waarden
   * levert hetzelfde op.
   */
  | "validatie"
  /**
   * De toestand is veranderd sinds de aanroeper hem las. Hier is
   * opnieuw proberen WEL zinvol, maar alleen na opnieuw lezen — en dat
   * is een beslissing van de aanroeper, niet van een retry-lus.
   */
  | "conflict"
  | "onbekend";

export class IntelFout extends Error {
  readonly soort: FoutSoort;
  readonly herhaalbaar: boolean;
  readonly context: Record<string, unknown>;

  constructor(
    soort: FoutSoort,
    bericht: string,
    opties: { herhaalbaar?: boolean; context?: Record<string, unknown>; oorzaak?: unknown } = {},
  ) {
    super(bericht, opties.oorzaak === undefined ? undefined : { cause: opties.oorzaak });
    this.name = "IntelFout";
    this.soort = soort;
    this.herhaalbaar = opties.herhaalbaar ?? standaardHerhaalbaar(soort);
    this.context = opties.context ?? {};
  }
}

function standaardHerhaalbaar(soort: FoutSoort): boolean {
  switch (soort) {
    case "netwerk":
    case "database":
    case "model":
      return true;
    case "bron_http":
      return true;
    case "configuratie":
    case "bron_parse":
    case "bron_voorwaarden":
    case "autorisatie":
    case "poort":
    case "budget":
    case "validatie":
      return false;
    case "conflict":
      /* Niet automatisch herhalen: de aanroeper moet eerst opnieuw
         lezen. Een retry met dezelfde verouderde waarden zou precies de
         fout maken die dit type moet voorkomen. */
      return false;
    case "onbekend":
      return false;
  }
}

/** HTTP-statussen waarbij opnieuw proberen zinvol is. */
export function httpHerhaalbaar(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599);
}
import { redigeer, wachtwoordUit } from "./geheimen.ts";

export function alsIntelFout(e: unknown, soort: FoutSoort = "onbekend"): IntelFout {
  if (e instanceof IntelFout) return e;
  /* REDIGEREN OP HET KNOOPPUNT. Dit is de plek waar vrijwel elke
     onbekende fout de codebase binnenkomt, en de boodschap gaat daarna
     naar logs en naar databasekolommen. Node zet bij een mislukte
     execFile de hele commandoregel in `message`; zonder deze regel
     reist die mee tot in intel.taken.laatste_fout. */
  const bericht = redigeer(
    e instanceof Error ? e.message : String(e),
    [wachtwoordUit(process.env.INTEL_DB_URL)],
  );
  return new IntelFout(soort, bericht, { oorzaak: e });
}
