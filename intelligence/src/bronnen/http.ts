/* ============================================================
   BRONNEN — de bewaakte ophaler
   ------------------------------------------------------------
   Vier bewakingen, elk om een concreet probleem:

   1. Conditional GET (etag / if-modified-since). Een bron die niet
      veranderd is kost dan 304 in plaats van een hele parse en een
      modelaanroep. Dit is de belangrijkste kostenrem.
   2. Redirects worden HANDMATIG gevolgd en elke hop wordt tegen de
      allowlist gehouden. Met `redirect: "follow"` bepaalt de uitgever
      welke host wij uiteindelijk aanspreken.
   3. Een harde bytegrens tijdens het lezen, niet erna. Een bron die
      plots een dump levert mag het geheugen niet opblazen.
   4. Een minimuminterval per host, zodat parallelle taken een
      uitgever niet alsnog hameren.
   ============================================================ */

import { configLezen } from "../kern/config.ts";
import { urlToegestaan } from "./robots.ts";
import { httpHerhaalbaar } from "../kern/fouten.ts";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("http");

const MAX_REDIRECTS = 5;

/** Laatste aanroepmoment per host, voor het minimuminterval. */
const laatsteAanroep = new Map<string, number>();

async function wachtVoorHost(host: string, minIntervalSeconden: number): Promise<void> {
  if (minIntervalSeconden <= 0) return;
  const nodig = minIntervalSeconden * 1000;
  const vorige = laatsteAanroep.get(host);
  const nu = Date.now();
  if (vorige !== undefined) {
    const verstreken = nu - vorige;
    if (verstreken < nodig) {
      await new Promise((r) => setTimeout(r, nodig - verstreken));
    }
  }
  laatsteAanroep.set(host, Date.now());
}

/** Alleen voor tests: de hostklok leegmaken. */
export function vergeetHostklok(): void {
  laatsteAanroep.clear();
}

export type HaalOpties = {
  readonly url: string;
  readonly toegestaneHosts: readonly string[];
  readonly maxBytes: number;
  readonly minIntervalSeconden?: number;
  readonly etag?: string | null;
  readonly lastModified?: string | null;
  readonly accept?: string;
  /** Robots per redirecthop controleren. Default aan. */
  readonly robotsPerHop?: boolean;
};

export type HaalUitkomst =
  | {
      soort: "ok";
      httpStatus: number;
      body: string;
      etag: string | null;
      lastModified: string | null;
      contentType: string | null;
      bytes: number;
      eindUrl: string;
      duurMs: number;
    }
  | { soort: "niet_gewijzigd"; httpStatus: number; duurMs: number }
  | {
      soort: "fout";
      httpStatus: number | null;
      foutSoort: string;
      bericht: string;
      herhaalbaar: boolean;
      duurMs: number;
    };

function hostToegestaan(url: string, toegestaneHosts: readonly string[]): boolean {
  try {
    const host = new URL(url).host.toLowerCase();
    return toegestaneHosts.some((h) => {
      const toegestaan = h.toLowerCase();
      // Een subdomeinregel mag met een punt beginnen: '.cbs.nl'.
      if (toegestaan.startsWith(".")) return host === toegestaan.slice(1) || host.endsWith(toegestaan);
      return host === toegestaan;
    });
  } catch {
    return false;
  }
}

/** Alleen https, en geen lokale of interne adressen. */
function schemaEnDoelToegestaan(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "geen geldige URL";
  }
  if (u.protocol !== "https:") return `protocol ${u.protocol} is niet toegestaan, alleen https`;
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    return `host ${host} is intern of lokaal`;
  }
  return null;
}

async function leesBegrensd(
  respons: Response,
  maxBytes: number,
): Promise<{ body: string; bytes: number } | { teGroot: true; bytes: number }> {
  const stroom = respons.body;
  if (!stroom) return { body: "", bytes: 0 };

  const lezer = stroom.getReader();
  const stukken: Uint8Array[] = [];
  let totaal = 0;
  try {
    for (;;) {
      const { done, value } = await lezer.read();
      if (done) break;
      if (!value) continue;
      totaal += value.byteLength;
      if (totaal > maxBytes) {
        await lezer.cancel().catch(() => undefined);
        return { teGroot: true, bytes: totaal };
      }
      stukken.push(value);
    }
  } finally {
    lezer.releaseLock();
  }

  const samen = new Uint8Array(totaal);
  let offset = 0;
  for (const s of stukken) {
    samen.set(s, offset);
    offset += s.byteLength;
  }
  return { body: new TextDecoder("utf-8").decode(samen), bytes: totaal };
}

export async function haalOp(opties: HaalOpties): Promise<HaalUitkomst> {
  const config = configLezen();
  const start = Date.now();

  if (!config.netwerkToegestaan) {
    return {
      soort: "fout",
      httpStatus: null,
      foutSoort: "netwerk_uit",
      bericht: "netwerk uitgeschakeld (INTEL_NETWERK_TOEGESTAAN=0)",
      herhaalbaar: false,
      duurMs: 0,
    };
  }

  let huidigeUrl = opties.url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const schemaFout = schemaEnDoelToegestaan(huidigeUrl);
    if (schemaFout) {
      return {
        soort: "fout",
        httpStatus: null,
        foutSoort: "doel_geweigerd",
        bericht: schemaFout,
        herhaalbaar: false,
        duurMs: Date.now() - start,
      };
    }
    // Robots geldt per opgevraagde URL, dus ook voor elke redirecthop.
    // Zonder deze controle leest een feed die naar een verboden pad
    // doorverwijst dat pad alsnog.
    if (opties.robotsPerHop !== false) {
      const robots = await urlToegestaan(huidigeUrl);
      if (!robots.toegestaan) {
        return {
          soort: "fout",
          httpStatus: null,
          foutSoort: hop === 0 ? "robots_verbod" : "robots_verbod_na_redirect",
          bericht:
            robots.reden + (hop > 0 ? ` — bereikt via redirect vanaf ${opties.url}` : ""),
          herhaalbaar: false,
          duurMs: Date.now() - start,
        };
      }
    }
    if (!hostToegestaan(huidigeUrl, opties.toegestaneHosts)) {
      return {
        soort: "fout",
        httpStatus: null,
        foutSoort: "host_buiten_allowlist",
        bericht:
          `${new URL(huidigeUrl).host} staat niet in toegestaneHosts ` +
          `(${opties.toegestaneHosts.join(", ")})` +
          (hop > 0 ? ` — bereikt via redirect vanaf ${opties.url}` : ""),
        herhaalbaar: false,
        duurMs: Date.now() - start,
      };
    }

    await wachtVoorHost(new URL(huidigeUrl).host, opties.minIntervalSeconden ?? 0);

    const koppen: Record<string, string> = {
      "user-agent": config.userAgent,
      accept: opties.accept ?? "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json;q=0.9, text/html;q=0.8, */*;q=0.5",
      "accept-encoding": "gzip, deflate, br",
    };
    // Conditional GET alleen op de eerste hop: na een redirect horen de
    // validators van het oorspronkelijke adres er niet meer bij.
    if (hop === 0) {
      if (opties.etag) koppen["if-none-match"] = opties.etag;
      if (opties.lastModified) koppen["if-modified-since"] = opties.lastModified;
    }

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), config.netwerkTimeoutMs);
    let respons: Response;
    try {
      respons = await fetch(huidigeUrl, {
        headers: koppen,
        signal: ac.signal,
        redirect: "manual",
      });
    } catch (e) {
      clearTimeout(timer);
      const afgebroken = (e as Error).name === "AbortError";
      return {
        soort: "fout",
        httpStatus: null,
        foutSoort: afgebroken ? "timeout" : "netwerk",
        bericht: afgebroken ? `timeout na ${config.netwerkTimeoutMs} ms` : (e as Error).message,
        herhaalbaar: true,
        duurMs: Date.now() - start,
      };
    }
    clearTimeout(timer);

    if (respons.status === 304) {
      return { soort: "niet_gewijzigd", httpStatus: 304, duurMs: Date.now() - start };
    }

    if (respons.status >= 300 && respons.status < 400) {
      const locatie = respons.headers.get("location");
      if (!locatie) {
        return {
          soort: "fout",
          httpStatus: respons.status,
          foutSoort: "redirect_zonder_locatie",
          bericht: `HTTP ${respons.status} zonder Location-kop`,
          herhaalbaar: false,
          duurMs: Date.now() - start,
        };
      }
      const doel = new URL(locatie, huidigeUrl);
      // Een server die naar http doorverwijst (TenderNed doet dit op
      // hop 3 van vier) is een misconfiguratie, geen instructie om
      // onversleuteld te gaan. Opwaarderen en vastleggen.
      let opgewaardeerd = false;
      if (doel.protocol === "http:") {
        doel.protocol = "https:";
        opgewaardeerd = true;
      }
      const volgende = doel.toString();
      log.debug("redirect", {
        van: huidigeUrl,
        naar: volgende,
        status: respons.status,
        opgewaardeerd,
      });
      huidigeUrl = volgende;
      continue;
    }

    if (!respons.ok) {
      return {
        soort: "fout",
        httpStatus: respons.status,
        foutSoort: "http",
        bericht: `HTTP ${respons.status} ${respons.statusText}`,
        herhaalbaar: httpHerhaalbaar(respons.status),
        duurMs: Date.now() - start,
      };
    }

    const gelezen = await leesBegrensd(respons, opties.maxBytes);
    if ("teGroot" in gelezen) {
      return {
        soort: "fout",
        httpStatus: respons.status,
        foutSoort: "te_groot",
        bericht: `respons groter dan ${opties.maxBytes} bytes (afgebroken op ${gelezen.bytes})`,
        herhaalbaar: false,
        duurMs: Date.now() - start,
      };
    }

    return {
      soort: "ok",
      httpStatus: respons.status,
      body: gelezen.body,
      etag: respons.headers.get("etag"),
      lastModified: respons.headers.get("last-modified"),
      contentType: respons.headers.get("content-type"),
      bytes: gelezen.bytes,
      eindUrl: huidigeUrl,
      duurMs: Date.now() - start,
    };
  }

  return {
    soort: "fout",
    httpStatus: null,
    foutSoort: "te_veel_redirects",
    bericht: `meer dan ${MAX_REDIRECTS} redirects vanaf ${opties.url}`,
    herhaalbaar: false,
    duurMs: Date.now() - start,
  };
}
