/* ============================================================
   KERN — gestructureerd loggen met geheimafscherming
   ------------------------------------------------------------
   Eén regel JSON per gebeurtenis. Elke sleutel die naar een geheim
   ruikt wordt vervangen, en elke waarde wordt gescand op patronen
   die op een token lijken. Een bronfeed kan immers alles bevatten.
   ============================================================ */

import { configLezen } from "./config.ts";

export type Niveau = "debug" | "info" | "waarschuwing" | "fout";

const RANG: Record<Niveau, number> = { debug: 10, info: 20, waarschuwing: 30, fout: 40 };

const VERDACHTE_SLEUTEL =
  /(sleutel|key|token|secret|geheim|wachtwoord|password|authorization|cookie|bearer|private)/i;

/** Patronen van echte geheimen zoals ze in waarden kunnen opduiken. */
const VERDACHTE_WAARDE: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bre_[A-Za-z0-9_-]{16,}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/g,
];

const VERBORGEN = "[verborgen]";
const MAX_TEKST = 2000;

function schoonWaarde(waarde: unknown, diepte: number): unknown {
  if (diepte > 6) return "[te diep]";
  if (waarde === null || waarde === undefined) return waarde;

  if (typeof waarde === "string") {
    let s = waarde;
    for (const p of VERDACHTE_WAARDE) s = s.replace(p, VERBORGEN);
    if (s.length > MAX_TEKST) s = `${s.slice(0, MAX_TEKST)}…[${s.length} tekens]`;
    return s;
  }
  if (typeof waarde === "number" || typeof waarde === "boolean") return waarde;
  if (typeof waarde === "bigint") return waarde.toString();
  if (waarde instanceof Date) return waarde.toISOString();
  if (waarde instanceof Error) {
    return {
      naam: waarde.name,
      bericht: schoonWaarde(waarde.message, diepte + 1),
      stack: schoonWaarde(waarde.stack?.split("\n").slice(0, 6).join("\n"), diepte + 1),
    };
  }
  if (Array.isArray(waarde)) {
    return waarde.slice(0, 50).map((v) => schoonWaarde(v, diepte + 1));
  }
  if (typeof waarde === "object") {
    const uit: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(waarde as Record<string, unknown>)) {
      uit[k] = VERDACHTE_SLEUTEL.test(k) ? VERBORGEN : schoonWaarde(v, diepte + 1);
    }
    return uit;
  }
  return String(waarde);
}

/** Exporteerbaar zodat de testsuite de afscherming zelf kan controleren. */
export function schoon(context: Record<string, unknown>): Record<string, unknown> {
  return schoonWaarde(context, 0) as Record<string, unknown>;
}

export type Logger = {
  debug(bericht: string, context?: Record<string, unknown>): void;
  info(bericht: string, context?: Record<string, unknown>): void;
  waarschuwing(bericht: string, context?: Record<string, unknown>): void;
  fout(bericht: string, context?: Record<string, unknown>): void;
  kind(extra: Record<string, unknown>): Logger;
};

function schrijf(niveau: Niveau, onderdeel: string, vast: Record<string, unknown>) {
  return (bericht: string, context: Record<string, unknown> = {}) => {
    let drempel: Niveau = "info";
    try {
      drempel = configLezen().logNiveau;
    } catch {
      // Configuratie kan ontbreken tijdens het opstarten; dan info.
    }
    if (RANG[niveau] < RANG[drempel]) return;

    const regel = {
      t: new Date().toISOString(),
      niveau,
      onderdeel,
      bericht,
      ...schoon({ ...vast, ...context }),
    };
    const uit = niveau === "fout" || niveau === "waarschuwing" ? process.stderr : process.stdout;
    uit.write(`${JSON.stringify(regel)}\n`);
  };
}

export function maakLogger(onderdeel: string, vast: Record<string, unknown> = {}): Logger {
  return {
    debug: schrijf("debug", onderdeel, vast),
    info: schrijf("info", onderdeel, vast),
    waarschuwing: schrijf("waarschuwing", onderdeel, vast),
    fout: schrijf("fout", onderdeel, vast),
    kind(extra) {
      return maakLogger(onderdeel, { ...vast, ...extra });
    },
  };
}
