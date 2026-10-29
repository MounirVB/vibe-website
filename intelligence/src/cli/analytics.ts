#!/usr/bin/env node
/* ============================================================
   CLI — analytics
   ------------------------------------------------------------
     npm run analytics                     koppelingen, het
                                           indexatierapport en de funnel
     npm run analytics -- --meet           live meting van de eigen pagina's
     npm run analytics -- --meet --alles   alle pagina's uit het register
     npm run analytics -- --meet --max 50 --offset 100
     npm run analytics -- --meet --gelijktijdig 4
     npm run analytics -- --bewaar         het rapport als dagstand van
                                           vandaag vastleggen (dit is wat
                                           de dagelijkse job hoort te doen)
     npm run analytics -- --json           één JSON-regel met de tien regels

   HET INDEXATIERAPPORT PRINT ALTIJD ALLE TIEN DE REGELS. Een weggelaten
   regel leest als "niet van toepassing" terwijl hij "niet gemeten"
   betekent, en dat verschil is hier het hele punt.
   ============================================================ */
import { laadEnvBestand } from "../kern/config.ts";
import { maakPool, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import {
  bewaarDagstand,
  bouwIndexatieRapport,
  funnelBeeld,
  indexatieRapport,
  koppelingStatussen,
  meetLive,
  segmentStanden,
  vergelijkVensters,
  type RapportRegel,
} from "../analytics/koppelingen.ts";
import { meetIndexeerbaar } from "../site/indexeerbaar.ts";

laadEnvBestand();

const heeft = (naam: string) => process.argv.includes(`--${naam}`);

/** `--max 50` en `--max=50` werken beide; ontbreekt hij, dan `standaard`. */
function getal(naam: string, standaard: number): number {
  const argv = process.argv;
  const gelijk = argv.find((a) => a.startsWith(`--${naam}=`));
  const ruw = gelijk ? gelijk.slice(naam.length + 3) : argv[argv.indexOf(`--${naam}`) + 1];
  if (ruw === undefined) return standaard;
  const n = Number.parseInt(ruw, 10);
  return Number.isFinite(n) && n >= 0 ? n : standaard;
}

/* HET GETAL VOOR TECHNICALLY_INDEXABLE STAAT NU IN
   src/site/indexeerbaar.ts.

   Het was hier een privéfunctie en daardoor alleen bereikbaar als een
   mens deze CLI aanriep. De dagelijkse wachtrijtaak `indexatie`
   (kern/taken.ts) heeft precies dezelfde meting nodig om de dagstand te
   kunnen vastleggen, en zonder die dagstand is een vergelijking over
   7, 28 of 90 dagen per constructie onmogelijk. Een tweede
   implementatie zou uiteenlopen, en dan verschilt de bewaarde dagstand
   van wat deze CLI toont.

   De volgorde van de twee bronnen (repo-scan, dan het
   sitekennisartefact) en de reden daarvoor staan in die module. */
const technischIndexeerbaar = meetIndexeerbaar;

function printRapport(regels: readonly RapportRegel[]): void {
  process.stdout.write("\nINDEXATIERAPPORT — tien metrieken, altijd tien regels\n");
  process.stdout.write(
    "metriek | aantal-of-ONBEKEND | bron | label | bewijs\n" + "-".repeat(100) + "\n",
  );
  for (const r of regels) {
    const waarde =
      r.aantal === null
        ? "ONBEKEND"
        : r.noemer === null
          ? String(r.aantal)
          : `${r.aantal} van ${r.noemer}`;
    process.stdout.write(
      `${r.metriek.padEnd(28)} | ${waarde.padStart(14)} | ${r.bron.padEnd(14)} | ${r.label.padEnd(13)} |\n`,
    );
    process.stdout.write(`${" ".repeat(30)}${r.bewijs}\n`);
  }
  const per = (l: string) => regels.filter((r) => r.label === l).length;
  process.stdout.write(
    `\n  ${per("MEASURED")} MEASURED, ${per("INFERRED")} INFERRED, ` +
      `${per("UNVERIFIED")} UNVERIFIED, ${per("NOT_AVAILABLE")} NOT_AVAILABLE — ` +
      `samen ${regels.length} van 10.\n`,
  );
  process.stdout.write(
    "  TECHNICALLY_INDEXABLE en GOOGLE_INDEXED zijn twee metrieken en blijven dat:\n" +
      "  wat wij toestaan is niet wat een zoekmachine heeft opgenomen.\n",
  );
}

async function main(): Promise<number> {
  const ti = await technischIndexeerbaar();

  /* ZONDER DATABASE NOG STEEDS TIEN REGELS.
     Dit commando viel eerder om met een stacktrace zodra INTEL_DB_URL
     ontbrak of de database niet antwoordde — en dan kwamen er NUL regels
     uit. Nul regels is de slechtste uitkomst die dit rapport kan geven:
     het leest als "er is niets aan de hand". Daarom: de databasefout
     wordt een REDEN in elke regel, niet het einde van het commando. */
  let pool: ReturnType<typeof maakPool> | null = null;
  let organisatieId = 0;
  let databaseFout: string | null = null;
  try {
    pool = maakPool();
    organisatieId = await huidigeOrganisatie(pool);
  } catch (e) {
    databaseFout = (e as Error).message;
    pool = null;
  }

  if (pool === null) {
    const regels = bouwIndexatieRapport({
      databaseFout: databaseFout ?? "onbekende fout",
      dagstandTabelBestaat: false,
      registerTotaal: null,
      registerInSitemap: null,
      technischIndexeerbaar: ti.getal,
      eigenMetingen: null,
      gscIndexatie: null,
      dagstandDagen: new Map(),
      dagstandLaatste: new Map(),
      zoekprestatie: null,
      conversie: null,
      koppelingen: koppelingStatussen(),
    });
    if (heeft("json")) {
      process.stdout.write(`${JSON.stringify({ regels, databaseFout }, null, 2)}\n`);
    } else {
      process.stderr.write(`DATABASE NIET BEREIKBAAR — ${databaseFout}\n`);
      printRapport(regels);
    }
    /* Exitcode 5: het rapport is compleet, de metingen zijn het niet. */
    return 5;
  }

  const { regels } = await indexatieRapport(pool, organisatieId, {
    technischIndexeerbaar: ti.getal ?? undefined,
  });

  if (heeft("json")) {
    process.stdout.write(`${JSON.stringify({ regels }, null, 2)}\n`);
  } else {
    process.stdout.write("KOPPELINGEN\n\n");
    for (const k of koppelingStatussen()) {
      process.stdout.write(
        `  ${k.sleutel.padEnd(16)} ${k.status.padEnd(20)} vertrouwd=${k.vertrouwd}\n`,
      );
      process.stdout.write(`      ${k.toelichting}\n`);
    }

    printRapport(regels);

    /* De OMGEKEERDE pariteit: staat er iets in de sitemap dat er niet in
       hoort? De andere richting (indexeerbaar maar niet in de sitemap)
       zat al in scanSite(); deze ontbrak, en dit is de gevaarlijkere
       kant — een sitemap die naar een noindex-pagina of een
       meta-refresh-stub wijst, geeft elke crawlronde een tegenstrijdige
       instructie af. */
    process.stdout.write("\nOMGEKEERDE SITEMAPPARITEIT\n\n");
    if (ti.pariteitBron === null) {
      process.stdout.write(
        "  NIET GEMETEN — de website is van hier niet te lezen; het sitekennisartefact bevat\n" +
          "  alleen gepubliceerde pagina's en kan deze richting niet toetsen.\n",
      );
    } else if (ti.pariteit.length === 0) {
      process.stdout.write(
        `  0 pagina's staan in de sitemap terwijl ze noindex of een redirectstub zijn (${ti.pariteitBron}).\n`,
      );
    } else {
      process.stdout.write(
        `  ${ti.pariteit.length} TEGENSTRIJDIGE pagina('s): ${ti.pariteit.join(", ")}\n`,
      );
    }

    /* DE SEGMENTATIE. §11 van de opdracht vraagt nieuws / kennis /
       commercieel apart. De restpost wordt benoemd en niet weggelaten;
       zie SEGMENT_VAN_SOORT voor waarom juridisch en overig erbuiten
       vallen. */
    process.stdout.write("\nSEGMENTATIE — pagina's per segment\n\n");
    process.stdout.write(
      `  ${"segment".padEnd(20)} ${"pagina's".padStart(9)} ${"in sitemap".padStart(11)} ${"in repo".padStart(8)}  soorten\n`,
    );
    for (const s of await segmentStanden(pool, organisatieId)) {
      process.stdout.write(
        `  ${s.segment.padEnd(20)} ${String(s.paginas).padStart(9)} ${String(s.inSitemap).padStart(11)} ` +
          `${String(s.bestaatInRepo).padStart(8)}  ${s.soorten.join(", ") || "-"}\n`,
      );
    }
    process.stdout.write(
      "  Dit is TECHNISCH BEREIKBAAR en IN DE SITEMAP, niet GEINDEXEERD.\n" +
        "  Of een zoekmachine ze heeft opgenomen is zonder Search Console niet te meten.\n",
    );

    /* DE VERGELIJKING OVER 7, 28 EN 90 DAGEN. Met één dagstand luidt
       het antwoord NIET GEMETEN, en dat is het eerlijke antwoord. */
    const trend = await vergelijkVensters(pool, organisatieId);
    process.stdout.write(
      `\nVERGELIJKING OVER 7 / 28 / 90 DAGEN — ${trend.dagstandenTotaal} dagstand(en)` +
        `${trend.oudsteDatum ? `, oudste ${trend.oudsteDatum}` : ""}\n\n`,
    );
    for (const t of trend.trends) {
      const cellen = t.vensters
        .map((v) =>
          v.verschil === null
            ? `${v.dagen}d:ONBEKEND`
            : `${v.dagen}d:${v.verschil > 0 ? "+" : ""}${v.verschil}`,
        )
        .join("  ");
      process.stdout.write(`  ${t.metriek.padEnd(28)} ${t.label.padEnd(13)} ${cellen}\n`);
    }
    const eersteReden = trend.trends[0]?.vensters[0]?.toelichting ?? "";
    if (eersteReden.startsWith("NIET GEMETEN")) {
      process.stdout.write(`\n  ${eersteReden}\n`);
    }

    process.stdout.write("\nFUNNEL\n\n");
    for (const f of await funnelBeeld(pool, organisatieId)) {
      process.stdout.write(
        `  ${f.stap.padEnd(24)} ${f.aantal === null ? "ONBEKEND" : String(f.aantal).padStart(8)}  ${f.toelichting.slice(0, 110)}\n`,
      );
    }
  }

  if (heeft("meet")) {
    /* `--alles` zet het venster op het hele register. Zonder dat argument
       blijft het bij een venster, want de standaard moet goedkoop zijn. */
    const r = await meetLive(pool, organisatieId, {
      max: heeft("alles") ? 100_000 : getal("max", 12),
      offset: getal("offset", 0),
      gelijktijdig: getal("gelijktijdig", 0) || undefined,
    });
    process.stdout.write(
      `\nEIGEN METING — ${r.gekozen} van ${r.totaalInRegister} pagina's ` +
        `(offset ${r.offset}, ${r.gelijktijdig} gelijktijdig, ${r.nogTeGaan} nog te gaan), ` +
        `${r.geschreven} vastgelegd\n\n`,
    );
    for (const m of r.metingen) {
      process.stdout.write(
        `  ${String(m.httpStatus ?? "-").padEnd(4)} sitemap=${m.inSitemap ? "ja " : "nee"} ` +
          `canoniek=${m.canoniekKlopt === null ? "?" : m.canoniekKlopt ? "klopt" : "WIJKT AF"}  ${m.pad}\n`,
      );
      if (m.redirectNaar) process.stdout.write(`       -> ${m.redirectNaar}\n`);
      if (m.canoniekKlopt === false)
        process.stdout.write(`       canonical op pagina: ${m.canoniekOpPagina}\n`);
    }
    if (r.nogTeGaan > 0) {
      process.stdout.write(
        `\n  ${r.nogTeGaan} pagina's nog niet gemeten. Volgende venster:\n` +
          `    npm run analytics -- --meet --offset ${r.offset + r.gekozen} --max ${r.gekozen}\n` +
          "  of in één keer: npm run analytics -- --meet --alles\n",
      );
    }
    process.stdout.write(
      "\nOf een zoekmachine deze pagina's heeft opgenomen is zonder Search Console niet te meten;\n" +
        "dat staat als 'onbekend' vastgelegd, niet geschat.\n",
    );
  }

  if (heeft("bewaar")) {
    /* Opnieuw bouwen NA --meet, zodat de eigen meting van deze run in de
       dagstand van vandaag meegaat. */
    const opnieuw = await indexatieRapport(pool, organisatieId, {
      technischIndexeerbaar: ti.getal ?? undefined,
    });
    const uit = await bewaarDagstand(pool, organisatieId, opnieuw.regels);
    if (uit.ok) {
      process.stdout.write(
        `\nDAGSTAND — ${uit.geschreven} regels vastgelegd voor ${uit.datum}.\n` +
          "  De unieke sleutel bevat de datum, dus de stand van gisteren blijft staan.\n" +
          "  Twee dagstanden zijn een trend; één rij die zichzelf overschrijft is dat nooit.\n",
      );
    } else {
      process.stderr.write(`\nDAGSTAND NIET BEWAARD — ${uit.reden}\n`);
      return 4;
    }
  }

  return 0;
}

main().then(
  async (code) => {
    await sluitAllePools();
    process.exit(code);
  },
  async (e) => {
    process.stderr.write(`${(e as Error).stack}\n`);
    await sluitAllePools();
    process.exit(1);
  },
);
