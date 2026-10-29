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

   DIT LEEST ALLEEN. Geen enkele functie hier schrijft.
   ============================================================ */

import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { BRONNEN } from "../bronnen/register.ts";
import { maakLogger } from "../kern/log.ts";
import { BRONSOORT_UIT_UITGEVER, NIEUWS_MAP } from "./nieuwsregister.ts";
import {
  CLUSTER_NAAR_ROUTE,
  leesRouteregister,
  leesRouteStaten,
  type RegisterUitkomst,
  type RouteStatenUitkomst,
} from "./routeregister.ts";

const log = maakLogger("nieuwscontext");

export type NieuwsContext = {
  /** Clustersleutel -> de route die hem bezit, en of die op INDEX staat. */
  readonly eigenaren: ReadonlyMap<string, { route: string; opIndex: boolean }>;
  /** Bronsleutel -> bronsoort uit het contract (WETGEVING, ...). */
  readonly bronsoortPerSleutel: ReadonlyMap<string, string>;
  /** Slugs die al onder data/inhoud/nieuws/ liggen. */
  readonly bestaandeNieuwsSlugs: ReadonlySet<string>;
  /** Wat er gemeten is, zodat een rapport het kan navertellen. */
  readonly herkomst: {
    readonly registerAanwezig: boolean;
    readonly registerReden: string;
    readonly statenAanwezig: boolean;
    readonly statenReden: string;
    readonly clustersMetEigenaar: number;
    readonly clustersZonderEigenaar: readonly string[];
    readonly eigenarenNietOpIndex: readonly string[];
    readonly dragendeBronnen: number;
    readonly nieuwsmapAanwezig: boolean;
  };
};

/**
 * De eigenaarkaart.
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

/** De slugs die al bestaan. Een ontbrekende map betekent nul, niet een fout. */
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

export async function leesNieuwsContext(siteWortel: string): Promise<NieuwsContext> {
  const [register, staten, nieuws] = await Promise.all([
    leesRouteregister(siteWortel),
    leesRouteStaten(siteWortel),
    leesNieuwsSlugs(siteWortel),
  ]);

  const { eigenaren, zonder, nietOpIndex } = bouwEigenaren(register, staten);
  const { kaart, dragend } = bouwBronsoorten();

  log.info("nieuwscontext gelezen", {
    register: register.reden,
    staten: staten.reden,
    clusters_met_eigenaar: eigenaren.size,
    clusters_zonder_eigenaar: zonder,
    eigenaren_niet_op_index: nietOpIndex,
    dragende_bronnen: dragend,
    bestaande_nieuwsslugs: nieuws.slugs.size,
  });

  return {
    eigenaren,
    bronsoortPerSleutel: kaart,
    bestaandeNieuwsSlugs: nieuws.slugs,
    herkomst: {
      registerAanwezig: register.aanwezig,
      registerReden: register.reden,
      statenAanwezig: staten.aanwezig,
      statenReden: staten.reden,
      clustersMetEigenaar: eigenaren.size,
      clustersZonderEigenaar: zonder,
      eigenarenNietOpIndex: nietOpIndex,
      dragendeBronnen: dragend,
      nieuwsmapAanwezig: nieuws.aanwezig,
    },
  };
}
