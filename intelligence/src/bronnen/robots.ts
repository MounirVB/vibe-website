/* ============================================================
   BRONNEN — robots.txt en het TDM-voorbehoud
   ------------------------------------------------------------
   Twee verschillende vragen, die vaak verward worden:

   1. Mag onze crawler dit pad ophalen?  -> robots.txt
   2. Mag de inhoud gebruikt worden voor tekst- en datamining?
      -> een apart voorbehoud. In de EU kan een rechthebbende dat
      machinaleesbaar voorbehouden (DSM-richtlijn art. 4 lid 3).

   Een uitgever die GPTBot, ClaudeBot, CCBot, Google-Extended of
   PerplexityBot in robots.txt uitsluit, maakt daarmee duidelijk dat
   hij geautomatiseerd hergebruik niet wil — ook als zijn robots.txt
   onze eigen useragent nergens noemt. Dat behandelen we als een
   voorbehoud en dan halen we niet op.
   ============================================================ */

import { configLezen } from "../kern/config.ts";
import { maakLogger } from "../kern/log.ts";
import type { RobotsStatus } from "./soorten.ts";

const log = maakLogger("robots");

export type RobotsRegel = { pad: string; toestaan: boolean };

export type RobotsBestand = {
  readonly aanwezig: boolean;
  readonly httpStatus: number | null;
  readonly regelsVoorOns: RobotsRegel[];
  readonly crawlDelay: number | null;
  readonly sitemaps: string[];
  /** Useragents waarvoor een volledige uitsluiting geldt. */
  readonly volledigUitgesloten: string[];
  readonly ruweTekst: string;
};

/**
 * AI- en TDM-crawlers. Wordt een van deze volledig uitgesloten, dan
 * leest dit platform dat als een voorbehoud op geautomatiseerd
 * hergebruik.
 */
export const TDM_USERAGENTS: readonly string[] = [
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "claudebot",
  "claude-web",
  "anthropic-ai",
  "ccbot",
  "google-extended",
  "perplexitybot",
  "applebot-extended",
  "bytespider",
  "meta-externalagent",
  "facebookbot",
  "diffbot",
  "omgili",
  "timpibot",
  "youbot",
];

/** Token waarmee onze eigen useragent in robots.txt gematcht wordt. */
export function onzeUserAgentToken(): string {
  const ua = configLezen().userAgent;
  const eerste = ua.split("/")[0] ?? ua;
  return eerste.trim().toLowerCase();
}

/**
 * Parseert robots.txt. Groepen worden per useragent verzameld; onze
 * eigen token wint van `*` als hij voorkomt.
 */
export function parseerRobots(tekst: string, onsToken: string): RobotsBestand {
  const regels = tekst.split(/\r?\n/);
  const groepen = new Map<string, { regels: RobotsRegel[]; crawlDelay: number | null }>();
  const sitemaps: string[] = [];
  let huidigeAgents: string[] = [];
  let vorigeRegelWasAgent = false;

  for (const ruw of regels) {
    const zonderCommentaar = ruw.split("#")[0] ?? "";
    const regel = zonderCommentaar.trim();
    if (!regel) {
      vorigeRegelWasAgent = false;
      continue;
    }
    const dubbelepunt = regel.indexOf(":");
    if (dubbelepunt === -1) continue;
    const veld = regel.slice(0, dubbelepunt).trim().toLowerCase();
    const waarde = regel.slice(dubbelepunt + 1).trim();

    if (veld === "user-agent") {
      // Opeenvolgende user-agent-regels vormen één groep.
      if (!vorigeRegelWasAgent) huidigeAgents = [];
      huidigeAgents.push(waarde.toLowerCase());
      for (const a of huidigeAgents) {
        if (!groepen.has(a)) groepen.set(a, { regels: [], crawlDelay: null });
      }
      vorigeRegelWasAgent = true;
      continue;
    }
    vorigeRegelWasAgent = false;

    if (veld === "sitemap") {
      sitemaps.push(waarde);
      continue;
    }
    if (huidigeAgents.length === 0) continue;

    for (const a of huidigeAgents) {
      const groep = groepen.get(a);
      if (!groep) continue;
      if (veld === "disallow") {
        // "Disallow:" zonder waarde betekent: alles toegestaan.
        if (waarde === "") groep.regels.push({ pad: "/", toestaan: true });
        else groep.regels.push({ pad: waarde, toestaan: false });
      } else if (veld === "allow") {
        if (waarde !== "") groep.regels.push({ pad: waarde, toestaan: true });
      } else if (veld === "crawl-delay") {
        const n = Number.parseFloat(waarde);
        if (Number.isFinite(n)) groep.crawlDelay = n;
      }
    }
  }

  const volledigUitgesloten: string[] = [];
  for (const [agent, groep] of groepen) {
    const blokkeertAlles = groep.regels.some((r) => !r.toestaan && r.pad === "/");
    const heeftUitzondering = groep.regels.some((r) => r.toestaan);
    if (blokkeertAlles && !heeftUitzondering) volledigUitgesloten.push(agent);
  }

  const voorOns = groepen.get(onsToken) ?? groepen.get("*");
  return {
    aanwezig: true,
    httpStatus: 200,
    regelsVoorOns: voorOns?.regels ?? [],
    crawlDelay: voorOns?.crawlDelay ?? null,
    sitemaps,
    volledigUitgesloten,
    ruweTekst: tekst.slice(0, 20_000),
  };
}

/** Longest-match met Allow-voorrang bij gelijke lengte, zoals Google het doet. */
export function padToegestaan(robots: RobotsBestand, pad: string): boolean {
  let besteLengte = -1;
  let besteToestaan = true;
  for (const r of robots.regelsVoorOns) {
    if (!padMatcht(r.pad, pad)) continue;
    const lengte = r.pad.length;
    if (lengte > besteLengte || (lengte === besteLengte && r.toestaan)) {
      besteLengte = lengte;
      besteToestaan = r.toestaan;
    }
  }
  return besteLengte === -1 ? true : besteToestaan;
}

function padMatcht(patroon: string, pad: string): boolean {
  // robots.txt kent * als jokerteken en $ als einde-anker.
  if (!patroon.includes("*") && !patroon.endsWith("$")) return pad.startsWith(patroon);
  const anker = patroon.endsWith("$");
  const kern = anker ? patroon.slice(0, -1) : patroon;
  const delen = kern.split("*").map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`^${delen.join(".*")}${anker ? "$" : ""}`);
  return regex.test(pad);
}

/** Ziet deze tekst eruit als robots.txt en niet als een foutpagina? */
function tekstBevatDirectives(tekst: string): boolean {
  if (/^\s*(<!doctype|<html|<\?xml)/i.test(tekst)) return false;
  return /^\s*(user-agent|sitemap|disallow|allow)\s*:/im.test(tekst);
}

/**
 * Robots per origin, gecachet voor de duur van het proces. Nodig omdat
 * elke redirecthop opnieuw tegen robots gehouden moet worden: een feed
 * die naar een verboden pad doorverwijst mag daar niet alsnog gelezen
 * worden. TenderNed doet dit — /tenderned-rss-web/... verwijst via
 * /cms/..., en /cms staat in hun eigen Disallow.
 */
const robotsPerOrigin = new Map<string, Promise<RobotsUitkomst>>();

export function vergeetRobotsCache(): void {
  robotsPerOrigin.clear();
}

export async function robotsVoorOrigin(origin: string): Promise<RobotsUitkomst> {
  const bestaand = robotsPerOrigin.get(origin);
  if (bestaand) return bestaand;
  const belofte = haalRobots(`${origin}/`);
  robotsPerOrigin.set(origin, belofte);
  return belofte;
}

/** Mag deze concrete URL opgehaald worden volgens robots van zijn host? */
export async function urlToegestaan(
  url: string,
): Promise<{ toegestaan: boolean; reden: string }> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { toegestaan: false, reden: "geen geldige URL" };
  }
  const uitkomst = await robotsVoorOrigin(u.origin);
  if (uitkomst.robotsStatus === "onbekend") {
    return { toegestaan: false, reden: uitkomst.bewijs };
  }
  if (!uitkomst.robots) {
    return { toegestaan: true, reden: uitkomst.bewijs };
  }
  const ok = padToegestaan(uitkomst.robots, u.pathname + u.search);
  return {
    toegestaan: ok,
    reden: ok
      ? `pad ${u.pathname} toegestaan volgens robots.txt van ${u.host}`
      : `pad ${u.pathname} is door robots.txt van ${u.host} verboden`,
  };
}

export type RobotsUitkomst = {
  readonly robotsStatus: RobotsStatus;
  readonly httpStatus: number | null;
  readonly padToegestaan: boolean;
  readonly robots: RobotsBestand | null;
  readonly bewijs: string;
};

/**
 * Haalt robots.txt op en beoordeelt alleen de crawlvraag. De TDM-vraag
 * hoort in toestemmingsbeleid.ts, want daar spelen ook licentie en
 * formaat mee.
 *
 * Faalt dicht: is robots.txt onleesbaar, dan is de status onbekend.
 */
export async function haalRobots(endpointUrl: string): Promise<RobotsUitkomst> {
  const config = configLezen();
  if (!config.netwerkToegestaan) {
    return {
      robotsStatus: "onbekend",
      httpStatus: null,
      padToegestaan: false,
      robots: null,
      bewijs: "netwerk uitgeschakeld (INTEL_NETWERK_TOEGESTAAN=0)",
    };
  }

  const url = new URL(endpointUrl);
  const robotsUrl = `${url.origin}/robots.txt`;
  const onsToken = onzeUserAgentToken();

  let tekst = "";
  let status: number | null = null;
  let contentType = "";
  let laatsteFout: string | null = null;
  let pogingen = 0;

  // Een 429 of 5xx op robots.txt betekent "unreachable", en dat zou
  // alles blokkeren. Gemeten: www.tenderned.nl/robots.txt geeft
  // ongeveer een op de drie keer 503 terwijl het data-endpoint elke
  // keer 200 geeft. Een flakey host is geen verbod, dus hier een paar
  // pogingen met oplopende wachttijd voordat we dat concluderen.
  for (pogingen = 1; pogingen <= 3; pogingen += 1) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), config.netwerkTimeoutMs);
      try {
        const r = await fetch(robotsUrl, {
          headers: { "user-agent": config.userAgent, accept: "text/plain,*/*" },
          signal: ac.signal,
          redirect: "follow",
        });
        status = r.status;
        contentType = r.headers.get("content-type") ?? "";
        // Ook bij een 4xx de body lezen: sommige hosts (Stedin) serveren
        // een geldige robots-body onder status 404.
        tekst = r.status < 500 ? (await r.text()).slice(0, 200_000) : "";
        laatsteFout = null;
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      status = null;
      laatsteFout = (e as Error).message;
    }

    const opnieuwProberen = status === null || status === 429 || status >= 500;
    if (!opnieuwProberen || pogingen === 3) break;
    await new Promise((r) => setTimeout(r, 400 * pogingen));
  }

  if (status === null) {
    log.waarschuwing("robots.txt niet op te halen", { robotsUrl, pogingen });
    return {
      robotsStatus: "onbekend",
      httpStatus: null,
      padToegestaan: false,
      robots: null,
      bewijs: `robots.txt onbereikbaar na ${pogingen} pogingen: ${laatsteFout ?? "onbekende fout"}`,
    };
  }

  // Stedin serveert een robots-body MET directives onder status 404.
  // Formeel is 4xx "unavailable" en gelden er dan geen regels, maar een
  // Sitemap-directive die daar staat is nog steeds een aankondiging van
  // de uitgever. Die halen we er dus uit; de Disallow-regels blijven
  // niet-gezaghebbend.
  if (status >= 400 && status < 500 && status !== 429 && tekstBevatDirectives(tekst)) {
    const uitBody = parseerRobots(tekst, onsToken);
    return {
      robotsStatus: "toegestaan",
      httpStatus: status,
      padToegestaan: true,
      robots: {
        ...uitBody,
        // Alleen de aankondigingen overnemen; de regels zijn door de
        // 4xx-status niet gezaghebbend.
        regelsVoorOns: [],
      },
      bewijs:
        `robots.txt geeft ${status} (unavailable volgens RFC 9309) maar de body bevat wél directives; ` +
        `${uitBody.sitemaps.length} Sitemap-aankondiging(en) overgenomen, Disallow-regels niet gezaghebbend`,
    };
  }

  // RFC 9309 maakt onderscheid tussen "unavailable" en "unreachable",
  // en dat verschil is hier belangrijk:
  //   4xx (behalve 429) = unavailable  -> geen beperkingen gepubliceerd
  //   429 en 5xx        = unreachable  -> onbekend, dus niet crawlen
  // Zonder dat onderscheid zou een host die 403 op robots.txt geeft
  // (ArcGIS Online, GeoServer achter een gateway) ten onrechte dicht
  // blijven, terwijl een tijdelijke 503 juist door zou glippen.
  if (status >= 400 && status < 500 && status !== 429) {
    return {
      robotsStatus: "toegestaan",
      httpStatus: status,
      padToegestaan: true,
      robots: null,
      bewijs: `robots.txt geeft ${status} (unavailable volgens RFC 9309): geen beperkingen gepubliceerd`,
    };
  }
  if (status !== 200) {
    return {
      robotsStatus: "onbekend",
      httpStatus: status,
      padToegestaan: false,
      robots: null,
      bewijs:
        `robots.txt geeft HTTP ${status} na ${pogingen} poging(en) (unreachable volgens RFC 9309), ` +
        "dus er is geen leesbaar beleid en wordt er niet opgehaald",
    };
  }

  // Veel SPA's geven op /robots.txt hun index.html terug met status 200.
  // Formeel is dat "successful" en levert parsen geen regels op, dus geen
  // beperkingen — maar het blijft het vastleggen waard dat er in feite
  // geen beleid gepubliceerd is.
  const lijktHtml =
    /text\/html/i.test(contentType) || /^\s*(<!doctype|<html|<\?xml)/i.test(tekst);
  if (lijktHtml) {
    return {
      robotsStatus: "toegestaan",
      httpStatus: status,
      padToegestaan: true,
      robots: null,
      bewijs:
        `robots.txt geeft 200 maar met content-type '${contentType || "onbekend"}' en HTML-inhoud; ` +
        "dit is geen robots-bestand, dus er is feitelijk geen beleid gepubliceerd",
    };
  }

  const robots = parseerRobots(tekst, onsToken);
  const padOk = padToegestaan(robots, url.pathname + url.search);
  const tdmGeblokkeerd = robots.volledigUitgesloten.filter((a) =>
    TDM_USERAGENTS.some((t) => a.includes(t)),
  );

  return {
    robotsStatus: padOk ? "toegestaan" : "verboden",
    httpStatus: status,
    padToegestaan: padOk,
    robots,
    bewijs: [
      `robots.txt 200, ${robots.regelsVoorOns.length} regels voor '${onsToken}' of '*'`,
      `pad ${url.pathname} ${padOk ? "toegestaan" : "VERBODEN"}`,
      tdmGeblokkeerd.length > 0
        ? `AI/TDM volledig uitgesloten: ${tdmGeblokkeerd.join(", ")}`
        : "geen AI/TDM-crawler volledig uitgesloten",
    ].join("; "),
  };
}
