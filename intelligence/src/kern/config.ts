/* ============================================================
   KERN — configuratie
   ------------------------------------------------------------
   Alle instellingen komen uit de omgeving. Er staat nooit een
   geheim in deze repository; de statische site wordt vanaf de
   repositorywortel publiek geserveerd (gemeten: /package.json en
   /api/server.js geven HTTP 200), dus broncode hier is in beginsel
   openbaar. Het platform leunt daarom nergens op geheimhouding
   van code — alleen op geheimen in de omgeving.
   ============================================================ */

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export type Omgeving = "ontwikkel" | "test" | "productie";

export type Config = {
  readonly omgeving: Omgeving;
  readonly databaseUrl: string;
  /** Rol die de applicatie aanneemt. Nooit de eigenaar van de objecten. */
  readonly appRol: string | null;
  readonly onderhoudRol: string | null;
  readonly poolMax: number;

  readonly organisatieSleutel: string;

  /** Wortel van de statische site (de git-worktree), voor publicatie. */
  readonly siteWortel: string;
  readonly siteBasisUrl: string;

  readonly aiProvider: "openai" | "geen";
  readonly aiModel: string;
  readonly aiSleutelAanwezig: boolean;
  readonly aiMaxTokensUit: number;

  readonly dashboardPoort: number;
  readonly dashboardSessieGeheimAanwezig: boolean;

  readonly logNiveau: "debug" | "info" | "waarschuwing" | "fout";
  readonly userAgent: string;
  readonly netwerkTimeoutMs: number;
  readonly netwerkToegestaan: boolean;
};

const HIER = dirname(fileURLToPath(import.meta.url));
/** intelligence/ */
export const APP_WORTEL = resolve(HIER, "..", "..");
/** de git-worktree waarin de statische site staat */
export const REPO_WORTEL = resolve(APP_WORTEL, "..");

let gelezenEnvBestand = false;

/**
 * Leest .env uit intelligence/ als die bestaat. Node kan dit zelf sinds
 * v21; er is dus geen dotenv-afhankelijkheid nodig. Bestaande
 * omgevingsvariabelen worden niet overschreven.
 */
export function laadEnvBestand(pad = resolve(APP_WORTEL, ".env")): void {
  if (gelezenEnvBestand) return;
  gelezenEnvBestand = true;
  if (!existsSync(pad)) return;
  process.loadEnvFile(pad);
}

function tekst(naam: string, standaard: string): string {
  const v = process.env[naam];
  return v === undefined || v === "" ? standaard : v;
}

function geheel(naam: string, standaard: number): number {
  const v = process.env[naam];
  if (v === undefined || v === "") return standaard;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) {
    throw new Error(`omgevingsvariabele ${naam} is geen geheel getal`);
  }
  return n;
}

function vlag(naam: string, standaard: boolean): boolean {
  const v = process.env[naam];
  if (v === undefined || v === "") return standaard;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "ja";
}

function omgevingVan(waarde: string): Omgeving {
  if (waarde === "ontwikkel" || waarde === "test" || waarde === "productie") return waarde;
  throw new Error(
    `INTEL_OMGEVING moet ontwikkel, test of productie zijn (kreeg: ${waarde})`,
  );
}

let huidige: Config | null = null;

export function configLezen(): Config {
  if (huidige) return huidige;
  laadEnvBestand();

  const omgeving = omgevingVan(tekst("INTEL_OMGEVING", "ontwikkel"));
  const databaseUrl = tekst("INTEL_DB_URL", "");
  if (!databaseUrl) {
    throw new Error(
      "INTEL_DB_URL ontbreekt. Zet die in intelligence/.env of in de omgeving; " +
        "zie intelligence/.env.voorbeeld.",
    );
  }

  // In productie mag de applicatie niet als eigenaar verbinden. De rol
  // is dan verplicht, zodat RLS gegarandeerd van toepassing is.
  const appRol = tekst("INTEL_DB_APP_ROL", "vibe_intel_app") || null;
  if (omgeving === "productie" && !appRol) {
    throw new Error("INTEL_DB_APP_ROL is verplicht in productie: zonder rol kan RLS omzeild worden");
  }

  const aiSleutel = tekst("OPENAI_API_KEY", "");
  const aiProviderRuw = tekst("INTEL_AI_PROVIDER", aiSleutel ? "openai" : "geen");
  if (aiProviderRuw !== "openai" && aiProviderRuw !== "geen") {
    throw new Error(`INTEL_AI_PROVIDER moet openai of geen zijn (kreeg: ${aiProviderRuw})`);
  }

  huidige = {
    omgeving,
    databaseUrl,
    appRol,
    onderhoudRol: tekst("INTEL_DB_ONDERHOUD_ROL", "vibe_intel_onderhoud") || null,
    poolMax: geheel("INTEL_DB_POOL_MAX", 8),

    organisatieSleutel: tekst("INTEL_ORGANISATIE", "vibe-energy"),

    siteWortel: resolve(tekst("INTEL_SITE_WORTEL", REPO_WORTEL)),
    siteBasisUrl: tekst("INTEL_SITE_BASIS_URL", "https://www.vibeenergy.nl").replace(/\/+$/, ""),

    aiProvider: aiProviderRuw,
    aiModel: tekst("INTEL_AI_MODEL", "gpt-5"),
    aiSleutelAanwezig: aiSleutel.length > 0,
    aiMaxTokensUit: geheel("INTEL_AI_MAX_TOKENS_UIT", 2000),

    dashboardPoort: geheel("INTEL_DASHBOARD_POORT", 4320),
    dashboardSessieGeheimAanwezig: tekst("INTEL_SESSIE_GEHEIM", "").length >= 32,

    logNiveau: (() => {
      const n = tekst("INTEL_LOG_NIVEAU", "info");
      if (n === "debug" || n === "info" || n === "waarschuwing" || n === "fout") return n;
      throw new Error(`INTEL_LOG_NIVEAU onbekend: ${n}`);
    })(),
    userAgent: tekst(
      "INTEL_USER_AGENT",
      "VibeEnergyIntelligence/0.1 (+https://www.vibeenergy.nl; contact: sales@vibeenergy.nl)",
    ),
    netwerkTimeoutMs: geheel("INTEL_NETWERK_TIMEOUT_MS", 20000),
    netwerkToegestaan: vlag("INTEL_NETWERK_TOEGESTAAN", true),
  };

  return huidige;
}

/** Alleen voor tests: de gecachte configuratie weggooien. */
export function configVergeten(): void {
  huidige = null;
  gelezenEnvBestand = false;
}

/**
 * Namen van omgevingsvariabelen die een koppeling nodig heeft. Alleen
 * namen; waarden worden nergens gerapporteerd.
 */
export const KOPPELING_ENV: Readonly<Record<string, readonly string[]>> = {
  gsc: ["INTEL_GSC_CLIENT_EMAIL", "INTEL_GSC_PRIVATE_KEY", "INTEL_GSC_SITE_URL"],
  bing_webmaster: ["INTEL_BING_API_KEY", "INTEL_BING_SITE_URL"],
  ga4: ["INTEL_GA4_PROPERTY_ID", "INTEL_GA4_CLIENT_EMAIL", "INTEL_GA4_PRIVATE_KEY"],
  crm: ["INTEL_CRM_SOORT", "INTEL_CRM_TOKEN"],
  ai_model: ["OPENAI_API_KEY"],
};

export function ontbrekendeEnv(sleutels: readonly string[]): string[] {
  return sleutels.filter((s) => {
    const v = process.env[s];
    return v === undefined || v === "";
  });
}
