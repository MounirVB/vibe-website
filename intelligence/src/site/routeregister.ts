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

/* ------------------------------------------------------------
   De publicatietoestand van Release 1, alleen-lezen.
   ------------------------------------------------------------
   data/seo/routes.json is de uitkomst van de toestandsmachine van
   Release 1 (scripts/seo/bouw-routes.mjs). Dit platform LEEST die
   toestand en verandert hem nooit: of een regioroute publicatiegereed
   is, is een besluit van Release 1 op basis van lokaal bewijs.

   De regionale regels in dat bestand dragen `gemeentecode` en
   `provinciecode`, dus een CBS-code is zonder tussenstap aan een route
   te koppelen.
   ------------------------------------------------------------ */

export type RouteStaat = {
  readonly route: string;
  readonly staat: "INDEX" | "PENDING" | "NOINDEX";
  readonly soort: string;
  readonly subsoort: string;
  readonly reden: string;
  readonly gemeentecode: string | null;
  readonly provinciecode: string | null;
};

export type RouteStatenUitkomst = {
  readonly aanwezig: boolean;
  readonly reden: string;
  readonly routes: readonly RouteStaat[];
};

/** Leest data/seo/routes.json. Ontbreekt het, dan is dat een toestand. */
export async function leesRouteStaten(siteWortel: string): Promise<RouteStatenUitkomst> {
  const pad = join(siteWortel, "data", "seo", "routes.json");
  if (!existsSync(pad)) {
    return {
      aanwezig: false,
      reden: `${pad} bestaat niet; de toestandsmachine van Release 1 heeft hier niet gedraaid.`,
      routes: [],
    };
  }
  try {
    const ruw = JSON.parse(await readFile(pad, "utf8")) as { routes?: unknown[] };
    const routes: RouteStaat[] = [];
    for (const r of ruw.routes ?? []) {
      const o = r as Record<string, unknown>;
      const route = alsTekst(o["route"]);
      const staat = alsTekst(o["staat"]);
      if (!route || (staat !== "INDEX" && staat !== "PENDING" && staat !== "NOINDEX")) continue;
      routes.push({
        route,
        staat,
        soort: alsTekst(o["soort"]) ?? "",
        subsoort: alsTekst(o["subsoort"]) ?? "",
        reden: alsTekst(o["reden"]) ?? "",
        gemeentecode: alsTekst(o["gemeentecode"]),
        provinciecode: alsTekst(o["provinciecode"]),
      });
    }
    return { aanwezig: true, reden: `${routes.length} routes gelezen`, routes };
  } catch (e) {
    log.waarschuwing("routes.json onleesbaar", { pad, fout: e });
    return { aanwezig: false, reden: `${pad} is onleesbaar: ${String(e)}`, routes: [] };
  }
}

/**
 * Is er voor dit gebied een gepubliceerde regioroute, en welke?
 *
 * Geeft de meest specifieke INDEX-route terug: een gemeentehub gaat
 * voor een provinciehub. Niets gevonden betekent dat Release 1 dit
 * gebied (nog) niet publiceert — en dat is geen fout maar een feit dat
 * de regio-impact meeneemt.
 */
export function routeVoorGebied(
  staten: RouteStatenUitkomst,
  soort: "gemeente" | "provincie" | "netbeheerdergebied" | "land",
  code: string,
): { route: string; staat: string } | null {
  if (soort === "gemeente") {
    const hub = staten.routes.find(
      (r) => r.subsoort === "gemeente" && r.gemeentecode === code,
    );
    if (hub) return { route: hub.route, staat: hub.staat };
    return null;
  }
  if (soort === "provincie") {
    const kort = code.replace(/^PV/, "");
    const hub = staten.routes.find(
      (r) =>
        r.subsoort === "provincie" &&
        (r.provinciecode === code || r.provinciecode === kort || r.provinciecode === `PV${kort}`),
    );
    if (hub) return { route: hub.route, staat: hub.staat };
    return null;
  }
  // Een netbeheerdergebied en 'land' hebben per ontwerp geen eigen route.
  return null;
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
  /* DE VOLGORDE HIER BESLIST, en hij stond verkeerd.
     routeVoorCluster() geeft de EERSTE kandidaat terug die in het
     routeregister staat, en beide staan er. Het subsidiecluster landde
     daardoor altijd op kennis/subsidiemechanismen.

     Die pagina draagt in zijn eigen bron
     (data/inhoud/kennis/subsidiemechanismen.json, direct_antwoord.
     voorbehoud) de tekst: "Dit antwoord beschrijft hoe mechanismen
     werken, NIET de stand van een regeling. Welke regelingen bestaan,
     welke voorwaarden, termijnen en bedragen gelden en of er budget is,
     staat hier niet en verandert tussentijds." Sectie 9 sluit af met
     "De stand van de regelingen staat elders."

     Een voorstel dat regelingsnieuws op die pagina zet, vecht dus met
     de gepubliceerde scope van de pagina zelf. /subsidies bezit die
     feiten wel: gemeten 2026-10-12 noemt subsidies.html SDE 16 keer en
     EIA 18 keer, is indexeerbaar en is geen redirect-stub.

     kennis/subsidiemechanismen blijft als tweede staan: voor een
     gebeurtenis die echt over de WERKING van een mechanisme gaat is hij
     de juiste eigenaar. */
  subsidie: ["subsidies", "kennis/subsidiemechanismen"],
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

/* ============================================================
   DE SITE ZONDER SITEWORTEL — het artefact als derde bron
   ------------------------------------------------------------
   WAAROM DIT ERBIJ KOMT, GEMETEN 9 november 2026.

   De twee lezers hierboven lezen bestanden uit de werkboom van de
   site. In de productiecontainer van vibe-intel-api bestaan die niet:
   `rootDirectory: intelligence` maakt /app gelijk aan de
   intelligence-map, INTEL_SITE_WORTEL is leeg, en siteWortel valt dus
   terug op "/". Gemeten in die container: /data bestaat niet,
   /app/.git bestaat niet, /app/data bevat alleen sitekennis.json.

   Gevolg voor de publicatieketen: `leesRouteregister()` is daar niet
   aanwezig en `routeVoorCluster()` vindt geen onderwerp-eigenaar, dus
   publiceerViaRegister() weigert — terecht. Maar voor de AUTONOME
   uitgifte moet de server wél een registerrecord kunnen samenstellen,
   want hij is de enige die de database heeft. De uitvoerder (een
   GitHub-werkstroom met de hele repo) mag de inhoud niet zelf
   bedenken; die schrijft alleen de bytes die de server hem geeft.

   HET ARTEFACT IS DAARVOOR DE JUISTE BRON, en niet een noodgreep:
   data/sitekennis.json is door de generator van Release 1 gemaakt,
   staat gecommit in de repo, gaat met elke deploy mee en draagt per
   pagina de route, de canonieke URL, de soort en de titel. Gemeten op
   deze checkout: 431 pagina's, en alle dertien clusters uit
   CLUSTER_NAAR_ROUTE hebben er hun eigenaarsroute in staan.

   WAT HET NIET IS. Het artefact kent alleen GEPUBLICEERDE pagina's
   (staat 'gepubliceerd', 431 van 431 gemeten). Een route die op
   PENDING of NOINDEX staat komt er niet in voor. Voor de twee vragen
   die de publicatieketen stelt — "welke pagina bezit dit cluster" en
   "staat deze interne link op INDEX" — is dat precies goed: wat er
   niet in staat, is ook geen link die je mag zetten. Het artefact is
   dus geen vervanging van routes.json in het algemeen; het antwoordt
   alleen op de vraag "wat staat er publiek".
   ============================================================ */

/** Het routeregister en de routestaten, afgeleid uit het sitekennis-artefact. */
export type ArtefactSiteKennis = {
  readonly register: RegisterUitkomst;
  readonly staten: RouteStatenUitkomst;
  /** De versie van de website waaruit het artefact is gebouwd. */
  readonly websiteVersie: string | null;
};

/**
 * Leest het sitekennis-artefact en vormt het om naar de twee shapes die
 * de publicatieketen leest.
 *
 * `intelligenceWortel` is de map waarin data/sitekennis.json staat; in
 * productie is dat APP_WORTEL (= /app), in een toets een tijdelijke map.
 */
export async function siteKennisUitArtefact(
  intelligenceWortel: string,
): Promise<ArtefactSiteKennis> {
  const { leesSitekennis } = await import("./sitekennis.ts");
  const uit = await leesSitekennis(intelligenceWortel);
  if (!uit.ok) {
    const reden = `het sitekennis-artefact is niet bruikbaar: ${uit.fout.bericht}`;
    log.waarschuwing("artefact onbruikbaar als routebron", { soort: uit.fout.soort });
    return {
      register: { aanwezig: false, reden, routes: [] },
      staten: { aanwezig: false, reden, routes: [] },
      websiteVersie: null,
    };
  }

  const routes: RouteRecord[] = [];
  const staten: RouteStaat[] = [];
  for (const p of uit.kennis.paginas) {
    /* DE LEIDENDE SLASH IS HET VERSCHIL. Het artefact schrijft
       '/contact' (gemeten: 431 van 431 met slash), terwijl RouteRecord
       en RouteStaat de route ZONDER slash dragen en `pad` ermee. Wie
       dat door elkaar haalt krijgt een register waarin
       routeVoorCluster() niets vindt, en dat zou leeg aflopen in
       "geen onderwerp-eigenaar" in plaats van in een fout. */
    const zonderSlash = p.route === "/" ? "" : p.route.replace(/^\//, "");
    routes.push({
      pad: p.route === "/" ? "/" : `/${zonderSlash}`,
      route: zonderSlash,
      type: p.soort,
      titel: p.titel,
      beschrijving: null,
      h1: p.h1,
      dataPagina: p.soort,
      gepubliceerd: null,
      gewijzigd: null,
      heeftDirectAntwoord: false,
      /* GEEN BESTANDSPAD, EN DAT IS EERLIJK. Het artefact zegt wat er
         publiek staat, niet welk JSON-bestand in de repo het heeft
         opgeleverd. Een pad verzinnen zou een lezer laten denken dat
         hij het kan openen. */
      bestandspad: "",
    });
    staten.push({
      route: zonderSlash,
      /* ALLES IN HET ARTEFACT STAAT PUBLIEK. Zie de sectiekop: het
         artefact bevat per definitie alleen gepubliceerde pagina's. */
      staat: "INDEX",
      soort: p.soort === "regio" ? "regio" : "nationaal",
      subsoort: p.soort,
      reden: "sitekennis-artefact",
      gemeentecode: null,
      provinciecode: null,
    });
  }

  const reden =
    `afgeleid uit ${SITEKENNIS_PAD_TEKST} (${routes.length} gepubliceerde route(s), ` +
    `websiteversie ${uit.kennis.websiteVersie.slice(0, 12)})`;
  return {
    register: { aanwezig: routes.length > 0, reden, routes },
    staten: { aanwezig: routes.length > 0, reden, routes: staten },
    websiteVersie: uit.kennis.websiteVersie,
  };
}

/* Alleen voor de redenregel hierboven; het echte pad staat in
   site/sitekennis.ts en wordt daar ook gelezen. */
const SITEKENNIS_PAD_TEKST = "data/sitekennis.json";
