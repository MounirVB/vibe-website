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
  /**
   * Adres waarop het dashboard bindt. Standaard de loopback.
   *
   * Dit is instelbaar gemaakt omdat de opdracht expliciet eist dat
   * localhost-binding NIET het productiebeveiligingsmodel is. Dat
   * betekent niet dat de binding publiek moet; het betekent dat de
   * beveiliging niet van de binding mág afhangen. Daarom:
   * authenticatie en autorisatie per verzoek uit de database, een
   * Secure-cookie en HSTS in productie, en een weigering om publiek te
   * binden zonder dat er een TLS-proxy voor staat.
   */
  readonly dashboardBind: string;
  /**
   * Staat er een TLS-terminerende reverse proxy voor het dashboard?
   * Alleen dán mag het in productie op een ander adres dan de loopback
   * binden. Een vlag die de operator bewust zet, geen gok.
   */
  readonly dashboardAchterTlsProxy: boolean;

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

/**
 * DE NETWERKNOODSTOP, LOS VAN DE REST VAN DE CONFIGURATIE.
 *
 * `haalOp()` las eerst de VOLLEDIGE config en toetste deze vlag pas
 * daarna. Die orde maakte de noodstop afhankelijk van INTEL_DB_URL:
 * zonder database gooide `configLezen()` al voordat iemand kon zien dat
 * het netwerk uit hoorde te staan.
 *
 * Gemeten op 31 oktober 2026 in test/eenheid/volledigetekst.test.ts:
 * twee toetsen gingen MET een .env het publieke internet op naar
 * www.acm.nl (HTTP 404 in 895 ms) terwijl hun eigen commentaar zei dat
 * het netwerk uit stond, en vielen ZONDER .env om met "INTEL_DB_URL
 * ontbreekt". Eén oorzaak, twee gezichten.
 *
 * Een fail-closed grens mag niets anders nodig hebben dan zijn eigen
 * vlag. Daarom staat hij hier apart en leest hij alleen .env plus de
 * omgeving.
 */
export function netwerkToegestaanRuw(): boolean {
  laadEnvBestand();
  return vlag("INTEL_NETWERK_TOEGESTAAN", true);
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
    dashboardBind: tekst("INTEL_DASHBOARD_BIND", "127.0.0.1"),
    dashboardAchterTlsProxy: vlag("INTEL_DASHBOARD_ACHTER_TLS_PROXY", false),
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
export type KoppelingRoute = {
  /** Hoe deze route heet in een rapport. */
  readonly naam: string;
  readonly env: readonly string[];
};

export type KoppelingEis = {
  /** Namen die altijd aanwezig moeten zijn, welke route je ook neemt. */
  readonly altijd: readonly string[];
  /**
   * Alternatieve credentialroutes; ÉÉN volledige groep volstaat.
   *
   * DIT VELD BESTAAT OMDAT EEN PLATTE LIJST LOOG. Tot 5 november 2026
   * stond hier voor gsc één lijst — CLIENT_EMAIL, PRIVATE_KEY,
   * SITE_URL — terwijl gscToegang() al een tweede route aanvaardde: de
   * dienstaccount-JSON in INTEL_GCS_SLEUTEL. Gevolg: het
   * koppelingenregister meldde 'niet geconfigureerd' op het moment dat
   * GSC 4.361 rijen had weggeschreven. Een eis die niet overeenkomt met
   * de code die hem moet waarmaken, is een valse meting.
   *
   * Een lege lijst betekent: er is geen keuze, `altijd` is alles.
   */
  readonly routes: readonly KoppelingRoute[];
};

export const KOPPELING_EIS: Readonly<Record<string, KoppelingEis>> = {
  gsc: {
    altijd: ["INTEL_GSC_SITE_URL"],
    routes: [
      { naam: "eigen GSC-credential", env: ["INTEL_GSC_CLIENT_EMAIL", "INTEL_GSC_PRIVATE_KEY"] },
      { naam: "dienstaccount-JSON", env: ["INTEL_GCS_SLEUTEL"] },
    ],
  },
  bing_webmaster: { altijd: ["INTEL_BING_API_KEY", "INTEL_BING_SITE_URL"], routes: [] },
  ga4: {
    altijd: ["INTEL_GA4_PROPERTY_ID", "INTEL_GA4_CLIENT_EMAIL", "INTEL_GA4_PRIVATE_KEY"],
    routes: [],
  },
  crm: { altijd: ["INTEL_CRM_SOORT", "INTEL_CRM_TOKEN"], routes: [] },
  ai_model: { altijd: ["OPENAI_API_KEY"], routes: [] },
};

/** Alle namen die een koppeling kán gebruiken, voor weergave. Nooit waarden. */
export const KOPPELING_ENV: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  Object.entries(KOPPELING_EIS).map(([sleutel, eis]) => [
    sleutel,
    [...eis.altijd, ...eis.routes.flatMap((r) => r.env)],
  ]),
);

export function ontbrekendeEnv(sleutels: readonly string[]): string[] {
  return sleutels.filter((s) => {
    const v = process.env[s];
    return v === undefined || v === "";
  });
}

export type KoppelingEnvStand = {
  readonly voldoet: boolean;
  /**
   * Wat er mist om deze koppeling te laten werken, HIER GEMETEN.
   *
   * Bij meerdere routes de goedkoopste: de route waarvoor het minst
   * hoeft te worden toegevoegd. Anders zou een rapport drie variabelen
   * eisen terwijl er één volstaat.
   */
  readonly ontbrekend: readonly string[];
  /** Welke route voldoet, of null als geen enkele voldoet. */
  readonly route: string | null;
};

/**
 * Of de omgeving van DIT PROCES de koppeling kan bedienen.
 *
 * Let op het "dit proces": deze functie leest `process.env`, en dat is
 * per dienst verschillend. `INTEL_GCS_SLEUTEL` staat alleen op
 * vibe-intel-worker. Een uitkomst hiervan is dus nooit een uitspraak
 * over het platform — alleen over waar hij is gemeten. Zie
 * intel.koppelingen.laatste_sync_op voor het bewijs dat het ergens
 * werkelijk werkt.
 */
export function koppelingEnvStand(sleutel: string): KoppelingEnvStand {
  const eis = KOPPELING_EIS[sleutel];
  if (eis === undefined) return { voldoet: false, ontbrekend: [], route: null };

  const altijdMist = ontbrekendeEnv(eis.altijd);
  if (eis.routes.length === 0) {
    return {
      voldoet: altijdMist.length === 0,
      ontbrekend: altijdMist,
      route: altijdMist.length === 0 ? "enige route" : null,
    };
  }

  const perRoute = eis.routes.map((r) => ({ route: r, mist: ontbrekendeEnv(r.env) }));
  const geslaagd = perRoute.find((p) => p.mist.length === 0);
  if (altijdMist.length === 0 && geslaagd !== undefined) {
    return { voldoet: true, ontbrekend: [], route: geslaagd.route.naam };
  }
  const goedkoopste = perRoute.reduce((a, b) => (b.mist.length < a.mist.length ? b : a));
  return {
    voldoet: false,
    ontbrekend: [...altijdMist, ...(geslaagd === undefined ? goedkoopste.mist : [])],
    route: null,
  };
}
