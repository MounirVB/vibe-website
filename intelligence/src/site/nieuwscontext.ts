/* ============================================================
   SITE — de context die de nieuwsselectie nodig heeft
   ------------------------------------------------------------
   `pijplijn/nieuwsselectie.ts` is met opzet een pure laag: hij kent de
   database en rekent, maar hij leest geen bestanden. Deze module haalt
   de drie dingen op die hij van BUITEN de database nodig heeft, en doet
   dat op één plek zodat de CLI en de wachtrijtaak dezelfde waarheid
   gebruiken.

   WAAROM DIT GEEN DRIE LOSSE AANROEPEN IN DE CLI ZIJN
   De drie kaarten hangen samen. Een eigenaarroute die in
   CLUSTER_NAAR_ROUTE staat maar niet in het routeregister, is geen
   eigenaar; een route die in het register staat maar in
   data/seo/routes.json op PENDING, is er ook geen. Die samenhang hoort
   één keer te worden uitgerekend. Stond ze in twee aanroepers, dan zou
   de CLI iets kunnen goedkeuren wat de wachtrijtaak afwijst — en dat is
   precies de klasse fouten die voorstel.ts al vastlegt: twee oordelen
   over dezelfde vraag lopen altijd uiteen.

   ------------------------------------------------------------
   R2.1 — WAAROM DIT BESTAND IS HERSCHREVEN. Gemeten, niet vermoed.

   Op 29 oktober 2026, 12:34 UTC, draaide `npm run nieuws -- --droog` in
   de productiecontainer op `vibe-intel-api`. De uitkomst:

     register   "data/inhoud bestaat niet in /"
     staten     "/data/seo/routes.json bestaat niet"
     clusters met eigenaar  0        clusters zonder eigenaar  13

   De oorzaak is de bouwcontext, en die is gemeten: `rootDirectory` van
   de intel-diensten is `intelligence`, dus `/app` IS die map. Het
   routeregister (`data/inhoud/`) en de routestaten
   (`data/seo/routes.json`) staan in de repo-WORTEL, één niveau hoger, en
   zitten niet in de container. `INTEL_SITE_WORTEL` is daar leeg, dus
   `config.siteWortel` valt terug op `REPO_WORTEL` = `/`, en daar staat
   niets.

   WAT DAT KOSTTE. De eigenaarseis is bindend: `weigerNieuws()` eist een
   `onderwerp_eigenaar` die op INDEX staat. Met nul eigenaren kan de
   nieuwsselectie in productie per constructie geen enkele kandidaat
   opleveren, ongeacht de kwaliteit van de invoer. En erger dan de nul
   was de STILTE: de oude versie gaf dat terug als een normale context,
   waarop de CLI "0 geschikt" meldde en met exitcode 0 afsloot. "Er is
   geen eigenaar" en "ik kan de site niet zien" zagen er identiek uit.

   DE OPLOSSING BESTOND AL, en dit bestand gebruikt hem nu. `db/zaai.ts`
   liep tegen hetzelfde op en loste het op met het gecommitte artefact
   `intelligence/data/sitekennis.json` — zie de kop van `site/sitekennis.ts`.
   Dat artefact zit WEL in de bouwcontext, want het staat onder
   `intelligence/`, en het reist mee in precies dezelfde commit als de
   code. Er komt dus geen tweede routeregister bij; er komt een tweede
   LEESWEG naar hetzelfde Release 1-besluit.

   WAAROM HET ARTEFACT VOOR EIGENAARSCHAP VOLDOENDE IS — gemeten op
   1009ab5. `valideer()` in site/sitekennis.ts weigert elke pagina met een
   andere `staat` dan `'gepubliceerd'`, en de generator laat PENDING-routes,
   noindex-pagina's en redirect-stubs er bewust uit. Aanwezigheid in het
   artefact betekent daarmee precies de twee dingen die `bouwEigenaren()`
   nodig heeft: de route bestaat, EN hij staat op INDEX. Nagerekend over
   de volle verzamelingen:

     INDEX-routes in data/seo/routes.json   431
     pagina's in sitekennis.json            431
     alleen in INDEX                          0
     alleen in artefact                       0

   En de uitkomst die telt: eigenaren uit de repo-bronnen 13 van 13,
   eigenaren uit het artefact alleen óók 13 van 13. Geen verschil.

   WAT HET ARTEFACT NIET KAN, en dat staat hier omdat het weggemoffeld
   zou kunnen worden:

     1. Het onderscheid "eigenaar bestaat maar staat op PENDING" valt
        weg. Zo'n route is simpelweg AFWEZIG in het artefact en wordt dus
        gerapporteerd als "geen eigenaar". De oude code hield die twee
        diagnoses apart omdat ze om een andere handeling vragen (een
        regel in CLUSTER_NAAR_ROUTE versus een publicatiebesluit). Op de
        artefactweg is die splitsing niet te maken, en `herkomst.
        beperkingen` zegt dat dan ook met zoveel woorden in plaats van
        een lege lijst te tonen.
     2. Het artefact kent GEPUBLICEERDE pagina's, geen concepten. Een
        nieuwsconcept dat in `data/inhoud/nieuws/` staat maar nog niet
        gepubliceerd is, zit er niet in. De slugverzameling is op die weg
        dus een ondergrens. Gevolg is beperkt en benoemd: de slug voedt
        één scoreas (`onderscheidbaarheid`, 7 van 100 punten) en geen
        harde poort.

   DE REPO-BRONNEN BLIJVEN VOORGAAN. Zijn `data/inhoud` EN
   `data/seo/routes.json` beide aanwezig — lokaal, in CI, in een volle
   worktree — dan wordt dáárop gewerkt, met volle getrouwheid en beide
   diagnoses. Het artefact is dan de tweede weg, niet de eerste. Dat
   houdt ook de netwerklaag erbuiten: er wordt hier niets opgehaald.
   Een live sitemap zou een beschikbaarheidsrisico in een worker leggen
   voor informatie die al op schijf staat.

   DIT LEEST ALLEEN. Geen enkele functie hier schrijft.
   ============================================================ */

import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { BRONNEN } from "../bronnen/register.ts";
import { APP_WORTEL } from "../kern/config.ts";
import { maakLogger } from "../kern/log.ts";
import { BRONSOORT_UIT_UITGEVER, NIEUWS_MAP } from "./nieuwsregister.ts";
import {
  CLUSTER_NAAR_ROUTE,
  leesRouteregister,
  leesRouteStaten,
  type RegisterUitkomst,
  type RouteStatenUitkomst,
} from "./routeregister.ts";
import { gepubliceerdeRoutes, leesSitekennis } from "./sitekennis.ts";

const log = maakLogger("nieuwscontext");

/**
 * De drie toestanden die een aanroeper moet kunnen onderscheiden.
 *
 * Het verschil tussen de tweede en de derde is de hele reden dat dit
 * type bestaat. Beide leveren nul kandidaten op, maar de ene is een
 * UITKOMST ("deze clusters hebben werkelijk geen eigenaar") en de andere
 * een STORING ("ik kan de site niet zien"). Eén ervan mag doorgaan; de
 * andere moet een zichtbare fout worden.
 */
export type ContextToestand =
  | "GELDIGE_CONTEXT_MET_EIGENAARS"
  | "GELDIGE_CONTEXT_ZONDER_EIGENAARS"
  | "CONTEXT_NIET_BESCHIKBAAR";

/** Waar de sitecontext vandaan kwam. */
export type ContextBron = "repo" | "artefact" | "geen";

export type NieuwsContext = {
  /** Mag er geselecteerd worden, en zo niet: waarom niet. */
  readonly toestand: ContextToestand;
  /** Clustersleutel -> de route die hem bezit, en of die op INDEX staat. */
  readonly eigenaren: ReadonlyMap<string, { route: string; opIndex: boolean }>;
  /** Bronsleutel -> bronsoort uit het contract (WETGEVING, ...). */
  readonly bronsoortPerSleutel: ReadonlyMap<string, string>;
  /** Slugs die al een gepubliceerd of concept-nieuwsbericht hebben. */
  readonly bestaandeNieuwsSlugs: ReadonlySet<string>;
  /** Wat er gemeten is, zodat een rapport het kan navertellen. */
  readonly herkomst: {
    readonly bron: ContextBron;
    /** Eén regel die zegt waar de context vandaan komt. */
    readonly bronReden: string;
    /** Gezet zodra toestand CONTEXT_NIET_BESCHIKBAAR is; anders null. */
    readonly onbruikbaarSoort: string | null;
    readonly onbruikbaarReden: string | null;
    readonly registerAanwezig: boolean;
    readonly registerReden: string;
    readonly statenAanwezig: boolean;
    readonly statenReden: string;
    readonly clustersMetEigenaar: number;
    readonly clustersZonderEigenaar: readonly string[];
    readonly eigenarenNietOpIndex: readonly string[];
    readonly dragendeBronnen: number;
    readonly nieuwsmapAanwezig: boolean;
    /** Wat deze leesweg aantoonbaar NIET kan zien. Nooit stil weglaten. */
    readonly beperkingen: readonly string[];
  };
};

/** `''` en `'/kennis/x'` en `'kennis/x'` naar één vorm: `'/'` en `'/kennis/x'`. */
function normaliseerRoute(route: string): string {
  return `/${String(route).replace(/^\/+/, "")}`;
}

/**
 * De eigenaarkaart uit de REPO-BRONNEN.
 *
 * DRIE EISEN, en elke eis sluit een andere stille fout uit:
 *
 *  1. het cluster staat in CLUSTER_NAAR_ROUTE — anders is er geen
 *     afbeelding en zou een woordovereenkomst moeten raden;
 *  2. die route staat in het routeregister van Release 1 — anders
 *     bestaat het inhoudsbestand niet en kan de generator er geen
 *     pagina van maken;
 *  3. die route staat op INDEX in data/seo/routes.json — want
 *     weigerNieuws() toetst exact dat, en een eigenaar op PENDING zet
 *     het bericht op PENDING.
 *
 * Eis 3 wordt APART bijgehouden in plaats van de route weg te laten.
 * "Er is geen eigenaar" en "de eigenaar staat niet op INDEX" zijn twee
 * verschillende diagnoses: de eerste vraagt een regel in
 * CLUSTER_NAAR_ROUTE, de tweede een publicatiebesluit. Ze samenvoegen
 * zou de redacteur de verkeerde handeling laten doen.
 */
function bouwEigenaren(
  register: RegisterUitkomst,
  staten: RouteStatenUitkomst,
): {
  eigenaren: Map<string, { route: string; opIndex: boolean }>;
  zonder: string[];
  nietOpIndex: string[];
} {
  const staatVan = new Map(staten.routes.map((r) => [r.route, r.staat]));
  const eigenaren = new Map<string, { route: string; opIndex: boolean }>();
  const zonder: string[] = [];
  const nietOpIndex: string[] = [];

  for (const [cluster, kandidaten] of Object.entries(CLUSTER_NAAR_ROUTE)) {
    let gekozen: { route: string; opIndex: boolean } | null = null;
    for (const route of kandidaten) {
      const inRegister = register.routes.some((r) => r.route === route);
      if (!inRegister) continue;
      const opIndex = staatVan.get(route) === "INDEX";
      /* DE EERSTE DIE OP INDEX STAAT WINT, en pas als er geen enkele op
         INDEX staat valt hij terug op de eerste die bestaat. De
         volgorde in CLUSTER_NAAR_ROUTE draagt een redactioneel besluit
         (zie de toelichting bij `subsidie` daar), dus hij wordt
         gerespecteerd — maar een eigenaar die kan publiceren gaat voor
         een eigenaar die dat niet kan. */
      if (opIndex) {
        gekozen = { route, opIndex: true };
        break;
      }
      gekozen ??= { route, opIndex: false };
    }
    if (gekozen === null) {
      zonder.push(cluster);
      continue;
    }
    if (!gekozen.opIndex) nietOpIndex.push(`${cluster} -> ${gekozen.route}`);
    eigenaren.set(cluster, gekozen);
  }

  return { eigenaren, zonder, nietOpIndex };
}

/**
 * De eigenaarkaart uit het SITEKENNIS-ARTEFACT.
 *
 * Eén verzameling in plaats van twee, en dat mag omdat het artefact per
 * contract alleen gepubliceerde INDEX-pagina's draagt (zie de kop). Eis
 * 2 en eis 3 van bouwEigenaren() vallen daarmee samen: staat de route
 * erin, dan bestaat hij en staat hij op INDEX.
 *
 * De gekozen route wordt in de vorm van CLUSTER_NAAR_ROUTE teruggegeven
 * en niet genormaliseerd. Dat is geen slordigheid: `weigerNieuws()`
 * vergelijkt `onderwerp_eigenaar` met de routes uit routes.json, en die
 * dragen geen leidende slash. Hier normaliseren zou het bericht op
 * PENDING zetten op een vormverschil.
 */
function bouwEigenarenUitArtefact(routesOpIndex: ReadonlySet<string>): {
  eigenaren: Map<string, { route: string; opIndex: boolean }>;
  zonder: string[];
} {
  const eigenaren = new Map<string, { route: string; opIndex: boolean }>();
  const zonder: string[] = [];

  for (const [cluster, kandidaten] of Object.entries(CLUSTER_NAAR_ROUTE)) {
    const treffer = kandidaten.find((r) => routesOpIndex.has(normaliseerRoute(r)));
    if (treffer === undefined) {
      zonder.push(cluster);
      continue;
    }
    eigenaren.set(cluster, { route: treffer, opIndex: true });
  }

  return { eigenaren, zonder };
}

/**
 * De bronsoortkaart.
 *
 * De uitgeverssoort staat in CODE (bronnen/register.ts) en niet in de
 * database; intel.bronnen draagt alleen de uitgevernaam. Dezelfde
 * afbeelding die publiceerViaRegister() gebruikt wordt hier hergebruikt
 * — BRONSOORT_UIT_UITGEVER uit nieuwsregister.ts — zodat de selectie
 * nooit een andere bronsoort aanneemt dan er straks in het
 * registerrecord belandt.
 *
 * Een onbekende uitgeverssoort valt terug op MARKTPARTIJ: de veilige
 * kant, want een marktpartij kan een bericht niet alleen dragen.
 *
 * DEZE KAART HANGT NIET AAN DE SITE. Hij komt uit code en is dus in de
 * container even compleet als lokaal; de productiestoring raakte hem
 * niet. Gemeten in de container op 29 oktober: 17 dragende bronnen van
 * 29, zowel vóór als na deze reparatie.
 */
function bouwBronsoorten(): { kaart: Map<string, string>; dragend: number } {
  const kaart = new Map<string, string>();
  let dragend = 0;
  for (const b of BRONNEN) {
    const soort = BRONSOORT_UIT_UITGEVER[b.uitgeverSoort] ?? "MARKTPARTIJ";
    kaart.set(b.sleutel, soort);
    if (soort !== "MARKTPARTIJ") dragend += 1;
  }
  return { kaart, dragend };
}

/** De slugs die al een bestandsrecord hebben. Een ontbrekende map betekent nul. */
async function leesNieuwsSlugs(
  siteWortel: string,
): Promise<{ slugs: Set<string>; aanwezig: boolean }> {
  const map = join(siteWortel, NIEUWS_MAP);
  if (!existsSync(map)) return { slugs: new Set(), aanwezig: false };
  const bestanden = await readdir(map);
  const slugs = new Set<string>();
  for (const b of bestanden) {
    if (!b.endsWith(".json")) continue;
    slugs.add(b.slice(0, -".json".length));
  }
  return { slugs, aanwezig: true };
}

/**
 * De slugs die het artefact kan aanwijzen: elke gepubliceerde route
 * onder `/nieuws/`. Dat is een ONDERGRENS van de bestandenlijst, want
 * een concept is nog niet gepubliceerd en staat dus niet in het
 * artefact. Zie beperking 2 in de kop.
 */
function nieuwsSlugsUitArtefact(routes: Iterable<string>): Set<string> {
  const slugs = new Set<string>();
  for (const route of routes) {
    const genormaliseerd = normaliseerRoute(route);
    if (!genormaliseerd.startsWith("/nieuws/")) continue;
    const slug = genormaliseerd.slice("/nieuws/".length).replace(/\/+$/, "");
    if (slug.length > 0) slugs.add(slug);
  }
  return slugs;
}

function toestandVan(aantalEigenaren: number): ContextToestand {
  return aantalEigenaren > 0
    ? "GELDIGE_CONTEXT_MET_EIGENAARS"
    : "GELDIGE_CONTEXT_ZONDER_EIGENAARS";
}

/**
 * Leest de sitecontext uit de eerste bron die hem betrouwbaar kan
 * leveren, en zegt expliciet wanneer dat er geen is.
 *
 * DE ORDE, en waarom hij zo staat:
 *
 *   1. de repo-bronnen (`data/inhoud` + `data/seo/routes.json`) — volle
 *      getrouwheid, inclusief de diagnose "eigenaar staat op PENDING";
 *   2. het artefact `intelligence/data/sitekennis.json` — in de
 *      container de enige bron die er is, en voor eigenaarschap
 *      aantoonbaar gelijkwaardig (zie de kop);
 *   3. niets — dan CONTEXT_NIET_BESCHIKBAAR, en de aanroeper hoort te
 *      stoppen in plaats van nul kandidaten als uitkomst te melden.
 *
 * BEIDE REPO-BRONNEN OF GEEN. Staat `data/inhoud` er wel en
 * `routes.json` niet, dan is de INDEX-toestand onbekend en zou eis 3
 * stilzwijgend wegvallen. Dan is het artefact de betere bron, want dat
 * is in zichzelf consistent.
 *
 * @param siteWortel      wortel van de statische site (config.siteWortel)
 * @param intelligenceWortel  waar `data/sitekennis.json` onder staat;
 *        standaard APP_WORTEL, wat in de container `/app` is
 */
export async function leesNieuwsContext(
  siteWortel: string,
  intelligenceWortel: string = APP_WORTEL,
): Promise<NieuwsContext> {
  const { kaart, dragend } = bouwBronsoorten();

  const [register, staten, nieuws] = await Promise.all([
    leesRouteregister(siteWortel),
    leesRouteStaten(siteWortel),
    leesNieuwsSlugs(siteWortel),
  ]);

  /* ---------- weg 1: de repo-bronnen ---------- */
  if (register.aanwezig && staten.aanwezig) {
    const { eigenaren, zonder, nietOpIndex } = bouwEigenaren(register, staten);

    log.info("nieuwscontext gelezen", {
      bron: "repo",
      register: register.reden,
      staten: staten.reden,
      clusters_met_eigenaar: eigenaren.size,
      clusters_zonder_eigenaar: zonder,
      eigenaren_niet_op_index: nietOpIndex,
      dragende_bronnen: dragend,
      bestaande_nieuwsslugs: nieuws.slugs.size,
    });

    return {
      toestand: toestandVan(eigenaren.size),
      eigenaren,
      bronsoortPerSleutel: kaart,
      bestaandeNieuwsSlugs: nieuws.slugs,
      herkomst: {
        bron: "repo",
        bronReden: `repo-bronnen in ${siteWortel}: ${register.reden}; ${staten.reden}`,
        onbruikbaarSoort: null,
        onbruikbaarReden: null,
        registerAanwezig: true,
        registerReden: register.reden,
        statenAanwezig: true,
        statenReden: staten.reden,
        clustersMetEigenaar: eigenaren.size,
        clustersZonderEigenaar: zonder,
        eigenarenNietOpIndex: nietOpIndex,
        dragendeBronnen: dragend,
        nieuwsmapAanwezig: nieuws.aanwezig,
        beperkingen: [],
      },
    };
  }

  /* ---------- weg 2: het sitekennisartefact ----------
     leesSitekennis() doet de integriteitscontrole die hier hoort en die
     niet opnieuw gebouwd moet worden: schema, sha256 over de inhoud, en
     de eis dat elke pagina `staat: 'gepubliceerd'` draagt. Elke fout
     komt eruit als een BENOEMDE soort (ontbreekt, onleesbaar, schema,
     hash, verouderd) in plaats van als een lege lijst. */
  const artefact = await leesSitekennis(intelligenceWortel);

  if (!artefact.ok) {
    log.fout("nieuwscontext NIET BESCHIKBAAR", {
      bron: "geen",
      register: register.reden,
      staten: staten.reden,
      artefact_soort: artefact.fout.soort,
      artefact_fout: artefact.fout.bericht,
    });

    return {
      toestand: "CONTEXT_NIET_BESCHIKBAAR",
      eigenaren: new Map(),
      bronsoortPerSleutel: kaart,
      bestaandeNieuwsSlugs: new Set(),
      herkomst: {
        bron: "geen",
        bronReden:
          `geen bruikbare sitecontext: de repo-bronnen ontbreken in ${siteWortel} en het ` +
          `artefact in ${intelligenceWortel} is onbruikbaar`,
        onbruikbaarSoort: artefact.fout.soort,
        onbruikbaarReden: artefact.fout.bericht,
        registerAanwezig: register.aanwezig,
        registerReden: register.reden,
        statenAanwezig: staten.aanwezig,
        statenReden: staten.reden,
        clustersMetEigenaar: 0,
        clustersZonderEigenaar: Object.keys(CLUSTER_NAAR_ROUTE),
        eigenarenNietOpIndex: [],
        dragendeBronnen: dragend,
        nieuwsmapAanwezig: nieuws.aanwezig,
        beperkingen: [
          "geen enkele sitebron gelezen; eigenaarschap is onbekend, niet afwezig",
        ],
      },
    };
  }

  /* gepubliceerdeRoutes() is de bestaande helper van het artefact; de
     normalisatie eroverheen is er voor de vormrobustheid, niet omdat het
     contract hem nodig heeft. */
  const artefactRoutes = new Set(
    [...gepubliceerdeRoutes(artefact.kennis)].map((r) => normaliseerRoute(r)),
  );
  const { eigenaren, zonder } = bouwEigenarenUitArtefact(artefactRoutes);

  /* De bestandenlijst gaat vóór als die er is: hij kent ook concepten.
     Is hij er niet, dan is de artefactondergrens beter dan niets. */
  const slugs = nieuws.aanwezig ? nieuws.slugs : nieuwsSlugsUitArtefact(artefactRoutes);

  const beperkingen = [
    "eigenaar-op-PENDING is op deze leesweg niet te onderscheiden van geen eigenaar; " +
      "het artefact draagt uitsluitend gepubliceerde INDEX-routes",
  ];
  if (!nieuws.aanwezig) {
    beperkingen.push(
      "bestaande nieuwsslugs komen uit het artefact en zijn dus een ondergrens: " +
        "een nog niet gepubliceerd concept zit er niet in",
    );
  }

  log.info("nieuwscontext gelezen", {
    bron: "artefact",
    register: register.reden,
    staten: staten.reden,
    artefact_schema: artefact.kennis.schema,
    artefact_paginas: artefact.kennis.aantalPaginas,
    artefact_websiteversie: artefact.kennis.websiteVersie.slice(0, 12),
    clusters_met_eigenaar: eigenaren.size,
    clusters_zonder_eigenaar: zonder,
    dragende_bronnen: dragend,
    bestaande_nieuwsslugs: slugs.size,
    beperkingen,
  });

  return {
    toestand: toestandVan(eigenaren.size),
    eigenaren,
    bronsoortPerSleutel: kaart,
    bestaandeNieuwsSlugs: slugs,
    herkomst: {
      bron: "artefact",
      bronReden:
        `sitekennisartefact ${join(intelligenceWortel, "data", "sitekennis.json")}: schema ` +
        `${artefact.kennis.schema}, ${artefact.kennis.aantalPaginas} gepubliceerde pagina's, ` +
        `websiteversie ${artefact.kennis.websiteVersie.slice(0, 12)}…`,
      onbruikbaarSoort: null,
      onbruikbaarReden: null,
      registerAanwezig: register.aanwezig,
      registerReden: register.reden,
      statenAanwezig: staten.aanwezig,
      statenReden: staten.reden,
      clustersMetEigenaar: eigenaren.size,
      clustersZonderEigenaar: zonder,
      eigenarenNietOpIndex: [],
      dragendeBronnen: dragend,
      nieuwsmapAanwezig: nieuws.aanwezig,
      beperkingen,
    },
  };
}
