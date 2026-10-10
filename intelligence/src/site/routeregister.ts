/* ============================================================
   SITE — adapter op het routeregister van Release 1
   ------------------------------------------------------------
   Release 1 bouwt het SEO/GEO-fundament met een routeregister in
   `data/` van de sitewortel: één JSON per route onder
   data/inhoud/{hub,kennis,oplossing,sector,toepassing}, plus
   data/geo/ en data/bewijs/. Gemeten op branch seo-geo-fundament
   (a2fbad7): 202 bestanden, en nul overlap met Release 2.

   Deze adapter leest dat register als het er is, en zegt het als het
   er niet is. Hij hardcodeert geen veldnamen die niet gezien zijn: de
   velden hieronder zijn afgelezen uit
   data/inhoud/kennis/netcongestie-uitgelegd.json.

   WAAROM DIT EEN ADAPTER IS EN GEEN KOPPELING
   Het register staat op een branch die nog niet samengevoegd is. Een
   harde import zou dit platform laten breken op een bestand dat er in
   deze worktree niet is. Daarom: lezen als het bestaat, anders een
   lege uitkomst met een reden.

   HET CONFLICT DAT HIERUIT VOLGT
   Release 1 GENEREERT sitemap.xml uit `data/`. De publicatieketen van
   Release 2 schrijft rechtstreeks een .html en voegt een <url> aan
   sitemap.xml toe. Na samenvoeging botsen die twee: de volgende
   generatorrun van Release 1 gooit onze sitemapregel weg, en onze
   .html staat niet in hun register.

   De integratieroute is dus niet "beide schrijven naar sitemap.xml"
   maar: Release 2 schrijft een registerrecord onder data/inhoud/, en
   de generator van Release 1 maakt daar de pagina en de sitemap van.
   Zolang `data/inhoud/` bestaat weigert publiceer() daarom de directe
   HTML-route — zie `heeftRouteregister`.
   ============================================================ */

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("routeregister");

/** Submappen onder data/inhoud die routes bevatten. */
const INHOUDSOORTEN = ["hub", "kennis", "oplossing", "sector", "toepassing"] as const;

export type RouteRecord = {
  /** Publiek pad met leidende slash: 'kennis/x' wordt '/kennis/x'. */
  readonly pad: string;
  readonly route: string;
  readonly type: string;
  readonly titel: string | null;
  readonly beschrijving: string | null;
  readonly h1: string | null;
  readonly dataPagina: string | null;
  readonly gepubliceerd: string | null;
  readonly gewijzigd: string | null;
  /** Heeft deze route al een direct antwoord? Dan is de GEO-laag er. */
  readonly heeftDirectAntwoord: boolean;
  readonly bestandspad: string;
};

export type RegisterUitkomst = {
  readonly aanwezig: boolean;
  readonly reden: string;
  readonly routes: readonly RouteRecord[];
};

/** Bestaat het routeregister van Release 1 in deze sitewortel? */
export function heeftRouteregister(siteWortel: string): boolean {
  return existsSync(join(siteWortel, "data", "inhoud"));
}

function alsTekst(waarde: unknown): string | null {
  return typeof waarde === "string" && waarde.trim().length > 0 ? waarde.trim() : null;
}

/**
 * Leest het routeregister. Ontbreekt het, dan is dat geen fout maar een
 * toestand: Release 1 is nog niet samengevoegd.
 */
export async function leesRouteregister(siteWortel: string): Promise<RegisterUitkomst> {
  const wortel = join(siteWortel, "data", "inhoud");
  if (!existsSync(wortel)) {
    return {
      aanwezig: false,
      reden:
        `data/inhoud bestaat niet in ${siteWortel}. Het routeregister van Release 1 is nog niet ` +
        "samengevoegd in deze worktree; het pagina-register valt terug op de repo-scan plus de live sitemap.",
      routes: [],
    };
  }

  const routes: RouteRecord[] = [];
  let onleesbaar = 0;

  for (const soort of INHOUDSOORTEN) {
    const map = join(wortel, soort);
    if (!existsSync(map)) continue;
    const bestanden = (await readdir(map)).filter((b) => b.endsWith(".json"));
    for (const bestandsnaam of bestanden) {
      const bestandspad = join(map, bestandsnaam);
      try {
        const ruw = JSON.parse(await readFile(bestandspad, "utf8")) as Record<string, unknown>;
        const route = alsTekst(ruw["route"]);
        if (!route) {
          onleesbaar += 1;
          continue;
        }
        routes.push({
          pad: `/${route.replace(/^\/+/, "")}`,
          route,
          type: alsTekst(ruw["type"]) ?? soort,
          titel: alsTekst(ruw["titel"]),
          beschrijving: alsTekst(ruw["beschrijving"]),
          h1: alsTekst(ruw["h1"]),
          dataPagina: alsTekst(ruw["data_pagina"]),
          gepubliceerd: alsTekst(ruw["gepubliceerd"]),
          gewijzigd: alsTekst(ruw["gewijzigd"]),
          heeftDirectAntwoord:
            typeof ruw["direct_antwoord"] === "object" && ruw["direct_antwoord"] !== null,
          bestandspad: `data/inhoud/${soort}/${bestandsnaam}`,
        });
      } catch (e) {
        onleesbaar += 1;
        log.waarschuwing("registerrecord onleesbaar", { bestandspad, fout: e });
      }
    }
  }

  return {
    aanwezig: true,
    reden:
      `${routes.length} routes gelezen uit data/inhoud` +
      (onleesbaar > 0 ? `, ${onleesbaar} bestand(en) onleesbaar` : ""),
    routes,
  };
}

/**
 * Kaart van clustersleutel naar de route die hem bezit, afgeleid uit het
 * register. Alleen exacte, controleerbare afbeeldingen; geen gokwerk op
 * woordovereenkomst.
 */
export const CLUSTER_NAAR_ROUTE: Readonly<Record<string, readonly string[]>> = {
  netcongestie: ["kennis/netcongestie-uitgelegd"],
  netbeheer: ["kennis/transportvermogen-versus-aansluitwaarde", "kennis/netaansluiting-aanvragen"],
  bess: ["kennis/batterij-dimensioneren", "kennis/batterijdegradatie"],
  batterijveiligheid: ["kennis/batterijveiligheid"],
  ems: ["kennis/ems-energiemanagementsysteem", "kennis/load-balancing"],
  laadinfrastructuur: ["kennis/laadinfrastructuur-dimensioneren"],
  "zonne-energie": ["kennis/terugleverbeperking"],
  subsidie: ["kennis/subsidiemechanismen", "subsidies"],
  regelgeving: ["kennis/normen-en-keuringen"],
  rendement: ["kennis/businesscase-batterij"],
  marktprijs: ["kennis/energiehandel-en-flexibiliteit"],
  vastgoedverduurzaming: ["kennis/energieprestatie-meten", "verduurzaming-bedrijfspanden"],
  flexibiliteit: ["kennis/energiehandel-en-flexibiliteit"],
};

/** Welke route bezit dit cluster volgens het register? */
export function routeVoorCluster(
  clusterSleutel: string,
  register: RegisterUitkomst,
): RouteRecord | null {
  const kandidaten = CLUSTER_NAAR_ROUTE[clusterSleutel] ?? [];
  for (const route of kandidaten) {
    const treffer = register.routes.find((r) => r.route === route);
    if (treffer) return treffer;
  }
  return null;
}
