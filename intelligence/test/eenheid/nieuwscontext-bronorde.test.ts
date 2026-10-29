/* ============================================================
   EENHEID — de bronorde van de nieuwscontext (R2.1)
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET, en waarom het een eigen bestand is.

   Op 29 oktober 2026 leverde de nieuwsselectie in productie nul
   kandidaten omdat `leesNieuwsContext()` het routeregister niet kon
   lezen: de container draait met `rootDirectory: intelligence`, dus
   `/app` IS die map en de repo-wortel zit er niet in. De oude code gaf
   dat terug als een gewone context met nul eigenaren — niet als een
   storing. Deze tests zetten vast dat (a) het gecommitte
   sitekennisartefact die vraag wél kan beantwoorden, (b) een onbruikbaar
   artefact een BENOEMDE storing wordt en geen stille nul, en (c) de twee
   leeswegen hetzelfde antwoord geven.

   DE VORMVALKUIL STAAT ER OOK IN. CLUSTER_NAAR_ROUTE draagt
   `kennis/x` zonder leidende slash, het artefact `/kennis/x` mét, en
   routes.json de home als `""`. `weigerNieuws()` vergelijkt met de
   routes.json-vorm. Een eigenaarroute die hier genormaliseerd terugkomt
   zet het bericht op PENDING op een vormverschil; daarom is er een test
   die exact de teruggegeven vorm controleert.
   ============================================================ */

import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, test } from "node:test";

import { leesNieuwsContext } from "../../src/site/nieuwscontext.ts";
import { CLUSTER_NAAR_ROUTE } from "../../src/site/routeregister.ts";
import {
  SITEKENNIS_SCHEMA,
  hashVan,
  type KennisPagina,
  type Sitekennis,
} from "../../src/site/sitekennis.ts";

/** De echte intelligence-map van deze checkout. */
const INTELLIGENCE_WORTEL = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "..",
);
/** De echte repo-wortel: één niveau boven intelligence/. */
const REPO_WORTEL = resolve(INTELLIGENCE_WORTEL, "..");

const ALLE_CLUSTERS = Object.keys(CLUSTER_NAAR_ROUTE);
/** De eerste kandidaatroute per cluster; genoeg om eigenaar te worden. */
const EERSTE_ROUTE_PER_CLUSTER = Object.fromEntries(
  Object.entries(CLUSTER_NAAR_ROUTE).map(([c, r]) => [c, r[0]!]),
);

const opruimen: string[] = [];
after(async () => {
  for (const pad of opruimen) await rm(pad, { recursive: true, force: true });
});

async function tijdelijkeMap(label: string): Promise<string> {
  const pad = await mkdtemp(join(tmpdir(), `nieuwscontext-${label}-`));
  opruimen.push(pad);
  return pad;
}

function paginaVoor(route: string): KennisPagina {
  const metSlash = `/${route.replace(/^\/+/, "")}`;
  return {
    route: metSlash,
    canoniekeUrl: `https://www.vibeenergy.nl${metSlash}`,
    staat: "gepubliceerd",
    soort: "kennis",
    titel: `titel ${metSlash}`,
    h1: `h1 ${metSlash}`,
    tekst: "genoeg tekst om een pagina te zijn",
    woorden: 6,
    vingerafdruk: "0".repeat(64),
    voorbehoud: null,
    secties: [],
    sectiekoppen: [],
    interneLinks: [],
    termfrequenties: {},
    onderwerpen: [],
    oplossingen: [],
  };
}

/** Een artefact dat `valideer()` doorkomt, met precies deze routes erin. */
function geldigArtefact(routes: readonly string[], schema = SITEKENNIS_SCHEMA): unknown {
  const paginas = routes.map(paginaVoor);
  const kennis: Sitekennis = {
    schema,
    websiteVersie: "a".repeat(64),
    routesGegenereerd: "2026-10-29",
    aantalPaginas: paginas.length,
    paginas,
  };
  return { ...kennis, inhoudsHash: hashVan(kennis) };
}

/** Schrijft een artefact weg op de plek waar leesSitekennis() hem zoekt. */
async function legArtefact(intelligenceWortel: string, inhoud: string): Promise<void> {
  await mkdir(join(intelligenceWortel, "data"), { recursive: true });
  await writeFile(join(intelligenceWortel, "data", "sitekennis.json"), inhoud, "utf8");
}

/** Een repo-wortel met data/inhoud en data/seo/routes.json. */
async function legRepoBronnen(
  siteWortel: string,
  routes: readonly { route: string; staat: "INDEX" | "PENDING" | "NOINDEX" }[],
): Promise<void> {
  await mkdir(join(siteWortel, "data", "inhoud", "kennis"), { recursive: true });
  await mkdir(join(siteWortel, "data", "inhoud", "hub"), { recursive: true });
  for (const [i, r] of routes.entries()) {
    const soort = r.route.startsWith("kennis/") ? "kennis" : "hub";
    await writeFile(
      join(siteWortel, "data", "inhoud", soort, `r${i}.json`),
      JSON.stringify({ route: r.route, titel: `t${i}` }),
      "utf8",
    );
  }
  await mkdir(join(siteWortel, "data", "seo"), { recursive: true });
  await writeFile(
    join(siteWortel, "data", "seo", "routes.json"),
    JSON.stringify({ routes: routes.map((r) => ({ route: r.route, staat: r.staat })) }),
    "utf8",
  );
}

describe("de bronorde van de nieuwscontext", () => {
  /* ---------- 1 · repository met volledig routeregister ---------- */
  test("1 · volledige repo-bronnen worden gebruikt en melden bron 'repo'", async () => {
    const site = await tijdelijkeMap("repo-vol");
    const intel = await tijdelijkeMap("repo-vol-intel");
    await legRepoBronnen(
      site,
      ALLE_CLUSTERS.map((c) => ({
        route: EERSTE_ROUTE_PER_CLUSTER[c]!,
        staat: "INDEX" as const,
      })),
    );
    /* Geen artefact: het mag niet nodig zijn als de repo er staat. */
    const ctx = await leesNieuwsContext(site, intel);

    assert.equal(ctx.herkomst.bron, "repo");
    assert.equal(ctx.toestand, "GELDIGE_CONTEXT_MET_EIGENAARS");
    assert.equal(ctx.herkomst.clustersMetEigenaar, ALLE_CLUSTERS.length);
    assert.deepEqual([...ctx.herkomst.clustersZonderEigenaar], []);
    assert.deepEqual(
      [...ctx.herkomst.beperkingen],
      [],
      "de repo-weg heeft volle getrouwheid en dus geen beperkingen",
    );
  });

  /* ---------- 2 + 3 + 9 · container met uitsluitend intelligence/ ---------- */
  test("2,3,9 · zonder repo-bronnen maar met geldig artefact komt de context uit het artefact", async () => {
    const site = await tijdelijkeMap("container-site");
    const intel = await tijdelijkeMap("container-intel");
    await legArtefact(
      intel,
      JSON.stringify(geldigArtefact(ALLE_CLUSTERS.map((c) => EERSTE_ROUTE_PER_CLUSTER[c]!))),
    );

    const ctx = await leesNieuwsContext(site, intel);

    assert.equal(ctx.herkomst.bron, "artefact");
    assert.equal(ctx.toestand, "GELDIGE_CONTEXT_MET_EIGENAARS");
    assert.equal(ctx.herkomst.clustersMetEigenaar, ALLE_CLUSTERS.length);
    assert.equal(ctx.herkomst.registerAanwezig, false, "de repo-bron is echt afwezig");
    assert.equal(ctx.herkomst.statenAanwezig, false);
    assert.ok(
      ctx.herkomst.beperkingen.some((b) => b.includes("PENDING")),
      "de artefactweg moet zijn eigen beperking benoemen",
    );
  });

  /* ---------- 4 + 10 · ontbrekend artefact en ontbrekende fallback ---------- */
  test("4,10 · geen repo-bronnen en geen artefact geeft CONTEXT_NIET_BESCHIKBAAR met soort 'ontbreekt'", async () => {
    const site = await tijdelijkeMap("leeg-site");
    const intel = await tijdelijkeMap("leeg-intel");

    const ctx = await leesNieuwsContext(site, intel);

    assert.equal(ctx.toestand, "CONTEXT_NIET_BESCHIKBAAR");
    assert.equal(ctx.herkomst.bron, "geen");
    assert.equal(ctx.herkomst.onbruikbaarSoort, "ontbreekt");
    assert.ok(ctx.herkomst.onbruikbaarReden!.length > 0);
    assert.equal(ctx.eigenaren.size, 0);
    assert.deepEqual(
      [...ctx.herkomst.clustersZonderEigenaar].sort(),
      [...ALLE_CLUSTERS].sort(),
      "alle clusters staan als zonder-eigenaar, maar de toestand zegt dat dat onbekend is",
    );
    assert.ok(
      ctx.herkomst.beperkingen.some((b) => b.includes("onbekend, niet afwezig")),
      "de nul mag niet als uitkomst leesbaar zijn",
    );
  });

  /* ---------- 5 · ongeldige JSON ---------- */
  test("5 · een artefact dat geen geldige JSON is geeft soort 'onleesbaar'", async () => {
    const site = await tijdelijkeMap("stuk-site");
    const intel = await tijdelijkeMap("stuk-intel");
    await legArtefact(intel, '{"schema": 3, "paginas": [');

    const ctx = await leesNieuwsContext(site, intel);

    assert.equal(ctx.toestand, "CONTEXT_NIET_BESCHIKBAAR");
    assert.equal(ctx.herkomst.onbruikbaarSoort, "onleesbaar");
    assert.equal(ctx.eigenaren.size, 0);
  });

  /* ---------- 6 · onvolledige route-eigenaars ---------- */
  test("6 · een artefact met maar een deel van de eigenaarroutes levert precies dat deel", async () => {
    const site = await tijdelijkeMap("deel-site");
    const intel = await tijdelijkeMap("deel-intel");
    const helft = ALLE_CLUSTERS.slice(0, 4);
    await legArtefact(
      intel,
      JSON.stringify(geldigArtefact(helft.map((c) => EERSTE_ROUTE_PER_CLUSTER[c]!))),
    );

    const ctx = await leesNieuwsContext(site, intel);

    assert.equal(ctx.toestand, "GELDIGE_CONTEXT_MET_EIGENAARS");
    assert.equal(ctx.herkomst.clustersMetEigenaar, 4);
    assert.equal(
      ctx.herkomst.clustersZonderEigenaar.length,
      ALLE_CLUSTERS.length - 4,
      "de rest hoort zichtbaar zonder eigenaar te zijn, niet stil te verdwijnen",
    );
    for (const c of helft) assert.ok(ctx.eigenaren.has(c), `${c} hoort een eigenaar te hebben`);
  });

  /* ---------- 7 · verouderd en na generatie gewijzigd ---------- */
  test("7a · een artefact met een ander schema wordt geweigerd met soort 'schema'", async () => {
    const site = await tijdelijkeMap("schema-site");
    const intel = await tijdelijkeMap("schema-intel");
    await legArtefact(
      intel,
      JSON.stringify(
        geldigArtefact([EERSTE_ROUTE_PER_CLUSTER["netcongestie"]!], SITEKENNIS_SCHEMA - 1),
      ),
    );

    const ctx = await leesNieuwsContext(site, intel);

    assert.equal(ctx.toestand, "CONTEXT_NIET_BESCHIKBAAR");
    assert.equal(ctx.herkomst.onbruikbaarSoort, "schema");
  });

  test("7b · een artefact dat na generatie is bijgewerkt wordt geweigerd met soort 'hash'", async () => {
    const site = await tijdelijkeMap("hash-site");
    const intel = await tijdelijkeMap("hash-intel");
    const artefact = geldigArtefact(
      ALLE_CLUSTERS.map((c) => EERSTE_ROUTE_PER_CLUSTER[c]!),
    ) as Record<string, unknown>;
    /* Een route met de hand toevoegen is precies het scenario dat de
       inhoudshash moet vangen: iemand "repareert" het artefact en de
       context zou een eigenaar krijgen die de generator nooit zag. */
    const paginas = artefact["paginas"] as KennisPagina[];
    paginas.push(paginaVoor("kennis/met-de-hand-toegevoegd"));
    artefact["aantalPaginas"] = paginas.length;
    await legArtefact(intel, JSON.stringify(artefact));

    const ctx = await leesNieuwsContext(site, intel);

    assert.equal(ctx.toestand, "CONTEXT_NIET_BESCHIKBAAR");
    assert.equal(ctx.herkomst.onbruikbaarSoort, "hash");
    assert.equal(ctx.eigenaren.size, 0, "een gewijzigd artefact levert GEEN eigenaren");
  });

  /* ---------- 8 · niet-bestaande INDEX-route ---------- */
  test("8 · een cluster waarvan geen enkele kandidaatroute bestaat krijgt geen verzonnen eigenaar", async () => {
    const site = await tijdelijkeMap("onbekend-site");
    const intel = await tijdelijkeMap("onbekend-intel");
    await legArtefact(intel, JSON.stringify(geldigArtefact(["kennis/bestaat-niet-in-de-kaart"])));

    const ctx = await leesNieuwsContext(site, intel);

    assert.equal(ctx.toestand, "GELDIGE_CONTEXT_ZONDER_EIGENAARS");
    assert.equal(ctx.eigenaren.size, 0);
    assert.deepEqual(
      [...ctx.herkomst.clustersZonderEigenaar].sort(),
      [...ALLE_CLUSTERS].sort(),
      "geldige context, werkelijk geen eigenaars — en dat is iets anders dan niet beschikbaar",
    );
  });

  /* ---------- de vormvalkuil ---------- */
  test("de eigenaarroute komt terug in de vorm van CLUSTER_NAAR_ROUTE, zonder leidende slash", async () => {
    const site = await tijdelijkeMap("vorm-site");
    const intel = await tijdelijkeMap("vorm-intel");
    await legArtefact(
      intel,
      JSON.stringify(geldigArtefact([EERSTE_ROUTE_PER_CLUSTER["netcongestie"]!])),
    );

    const ctx = await leesNieuwsContext(site, intel);
    const eigenaar = ctx.eigenaren.get("netcongestie");

    assert.ok(eigenaar, "netcongestie hoort een eigenaar te hebben");
    assert.equal(
      eigenaar.route,
      EERSTE_ROUTE_PER_CLUSTER["netcongestie"],
      "weigerNieuws() vergelijkt met de routes.json-vorm; normaliseren hier zet het bericht op PENDING",
    );
    assert.ok(!eigenaar.route.startsWith("/"), "geen leidende slash");
    assert.equal(eigenaar.opIndex, true, "het artefact draagt alleen INDEX-routes");
  });

  /* ---------- halve repo-bronnen ---------- */
  test("data/inhoud zonder routes.json valt terug op het artefact in plaats van eis 3 te laten vervallen", async () => {
    const site = await tijdelijkeMap("half-site");
    const intel = await tijdelijkeMap("half-intel");
    /* Alleen het register, GEEN routes.json. */
    await mkdir(join(site, "data", "inhoud", "kennis"), { recursive: true });
    await writeFile(
      join(site, "data", "inhoud", "kennis", "a.json"),
      JSON.stringify({ route: EERSTE_ROUTE_PER_CLUSTER["netcongestie"] }),
      "utf8",
    );
    await legArtefact(
      intel,
      JSON.stringify(geldigArtefact([EERSTE_ROUTE_PER_CLUSTER["netcongestie"]!])),
    );

    const ctx = await leesNieuwsContext(site, intel);

    assert.equal(ctx.herkomst.bron, "artefact");
    assert.equal(ctx.herkomst.registerAanwezig, true, "het register was er wel");
    assert.equal(ctx.herkomst.statenAanwezig, false, "de staten niet, en dat beslist");
    assert.equal(ctx.eigenaren.size, 1);
  });

  /* ---------- eigenaar op PENDING, repo-weg ---------- */
  test("de repo-weg blijft 'eigenaar niet op INDEX' apart melden van 'geen eigenaar'", async () => {
    const site = await tijdelijkeMap("pending-site");
    const intel = await tijdelijkeMap("pending-intel");
    await legRepoBronnen(site, [
      { route: EERSTE_ROUTE_PER_CLUSTER["netcongestie"]!, staat: "PENDING" },
    ]);

    const ctx = await leesNieuwsContext(site, intel);

    assert.equal(ctx.herkomst.bron, "repo");
    assert.equal(ctx.eigenaren.get("netcongestie")?.opIndex, false);
    assert.equal(ctx.herkomst.eigenarenNietOpIndex.length, 1);
    assert.ok(
      !ctx.herkomst.clustersZonderEigenaar.includes("netcongestie"),
      "een eigenaar op PENDING is een ander probleem dan geen eigenaar",
    );
  });

  /* ---------- nieuwsslugs uit het artefact ---------- */
  test("bestaande nieuwsslugs komen uit het artefact als data/inhoud/nieuws ontbreekt", async () => {
    const site = await tijdelijkeMap("slug-site");
    const intel = await tijdelijkeMap("slug-intel");
    await legArtefact(
      intel,
      JSON.stringify(
        geldigArtefact([
          EERSTE_ROUTE_PER_CLUSTER["netcongestie"]!,
          "nieuws",
          "nieuws/acm-stelt-tarief-vast",
        ]),
      ),
    );

    const ctx = await leesNieuwsContext(site, intel);

    assert.deepEqual(
      [...ctx.bestaandeNieuwsSlugs],
      ["acm-stelt-tarief-vast"],
      "de hub /nieuws is geen artikel en hoort geen slug te worden",
    );
    assert.equal(ctx.herkomst.nieuwsmapAanwezig, false);
    assert.ok(
      ctx.herkomst.beperkingen.some((b) => b.includes("ondergrens")),
      "dat dit een ondergrens is moet in de uitvoer staan",
    );
  });

  /* ---------- iedere aanroeper moet de grendel hebben ----------
     EEN BRONTOETS, en dat is hier bewust. De grendel zelf wordt op
     gedrag getoetst (de taak in test/integratie/nieuwscontext-container
     .test.ts, de context hierboven). Wat die toetsen NIET kunnen zien is
     een VIERDE aanroeper die er morgen bijkomt zonder grendel — en dat
     is precies de fout die R2.1 heeft gekost: de CLI riep de context aan
     en deed er niets mee. Deze toets leest daarom de aanroepers. */
  test("elke aanroeper van leesNieuwsContext grendelt op CONTEXT_NIET_BESCHIKBAAR", async () => {
    const { readFile, readdir } = await import("node:fs/promises");
    const src = join(INTELLIGENCE_WORTEL, "src");

    async function alleBestanden(map: string): Promise<string[]> {
      const uit: string[] = [];
      for (const item of await readdir(map, { withFileTypes: true })) {
        const pad = join(map, item.name);
        if (item.isDirectory()) uit.push(...(await alleBestanden(pad)));
        else if (item.name.endsWith(".ts")) uit.push(pad);
      }
      return uit;
    }

    const aanroepers: string[] = [];
    for (const pad of await alleBestanden(src)) {
      if (pad.endsWith(join("site", "nieuwscontext.ts"))) continue;
      const inhoud = await readFile(pad, "utf8");
      if (!inhoud.includes("leesNieuwsContext(")) continue;
      aanroepers.push(pad);
      assert.ok(
        inhoud.includes("CONTEXT_NIET_BESCHIKBAAR"),
        `${pad} roept leesNieuwsContext aan maar grendelt niet op CONTEXT_NIET_BESCHIKBAAR; ` +
          "een context die niet gelezen kon worden mag geen nulresultaat worden",
      );
    }

    assert.equal(
      aanroepers.length,
      2,
      `verwachtte precies twee aanroepers (de taak en de CLI), vond ${aanroepers.length}: ` +
        `${aanroepers.join(", ")}. Komt er een derde bij, voeg hem hier toe NA te hebben ` +
        "vastgesteld dat hij de grendel heeft.",
    );
  });

  /* ---------- de pariteitstoets op de ECHTE bronnen ---------- */
  test("PARITEIT · de echte repo-bronnen en het echte artefact geven dezelfde eigenaren", async () => {
    const viaRepo = await leesNieuwsContext(REPO_WORTEL, INTELLIGENCE_WORTEL);
    /* Een lege sitewortel dwingt de artefactweg af, precies zoals in de
       productiecontainer waar config.siteWortel op '/' uitkomt. */
    const leeg = await tijdelijkeMap("pariteit-leeg");
    const viaArtefact = await leesNieuwsContext(leeg, INTELLIGENCE_WORTEL);

    assert.equal(viaRepo.herkomst.bron, "repo");
    assert.equal(viaArtefact.herkomst.bron, "artefact");
    assert.equal(
      viaArtefact.herkomst.clustersMetEigenaar,
      viaRepo.herkomst.clustersMetEigenaar,
      "de artefactweg moet evenveel eigenaren vinden als de repo-weg",
    );
    assert.deepEqual(
      [...viaArtefact.eigenaren.keys()].sort(),
      [...viaRepo.eigenaren.keys()].sort(),
      "en het moeten dezelfde clusters zijn",
    );
    for (const [cluster, eigenaar] of viaRepo.eigenaren) {
      assert.equal(
        viaArtefact.eigenaren.get(cluster)?.route,
        eigenaar.route,
        `cluster ${cluster} hoort dezelfde eigenaarroute te krijgen`,
      );
    }
    assert.ok(
      viaRepo.herkomst.clustersMetEigenaar > 0,
      "deze toets is zinloos als de repo-weg zelf nul eigenaren vindt",
    );
  });
});
