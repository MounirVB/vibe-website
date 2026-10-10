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
      return false;
    case "onbekend":
      return false;
  }
}

/** HTTP-statussen waarbij opnieuw proberen zinvol is. */
export function httpHerhaalbaar(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599);
}

export function alsIntelFout(e: unknown, soort: FoutSoort = "onbekend"): IntelFout {
  if (e instanceof IntelFout) return e;
  const bericht = e instanceof Error ? e.message : String(e);
  return new IntelFout(soort, bericht, { oorzaak: e });
}
