#!/usr/bin/env node
/* ============================================================
   CLI — Google Search Console
   ------------------------------------------------------------
     npm run gsc                  de stand uit de database
     npm run gsc -- --properties  vraag Google WELKE properties bestaan
     npm run gsc -- --sync        synchroniseer (schrijft)
     npm run gsc -- --sync --droog  reken alles door, schrijf niets
     npm run gsc -- --sync --dagen 7

   DE EERSTE OPDRACHT DIE JE WILT DRAAIEN IS --properties. Die beslist de
   propertyvraag die in deze repository niet te beslissen was, en hij
   schrijft niets.
   ============================================================ */

import { maakPool, metOrganisatie, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import {
  gscStand,
  gscToegang,
  gscToken,
  kiesProperty,
  ontdekProperties,
  synchroniseerGsc,
  websiteHost,
} from "../analytics/gsc.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);
function getal(naam: string, standaard: number): number {
  const i = process.argv.indexOf(`--${naam}`);
  if (i === -1) return standaard;
  const n = Number.parseInt(process.argv[i + 1] ?? "", 10);
  return Number.isFinite(n) ? n : standaard;
}

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);

  if (heeft("properties")) {
    const toegang = gscToegang();
    if (toegang.soort === "geen") {
      process.stdout.write(`\nGSC-PROPERTIES — GEEN CREDENTIAL\n\n  ${toegang.reden}\n`);
      return 1;
    }
    process.stdout.write(
      `\nGSC-PROPERTIES\n\n  identiteit: ${toegang.clientEmail}\n` +
        `  herkomst:   ${toegang.herkomst}\n` +
        `  voorkeur:   ${toegang.voorkeur ?? "(INTEL_GSC_SITE_URL niet gezet)"}\n\n`,
    );
    const token = await gscToken(toegang);
    process.stdout.write("  token: VERKREGEN (de sleutel werkt)\n\n");
    const uit = await ontdekProperties(token);
    if (uit.soort === "api_uit") {
      process.stdout.write(
        `  API UIT — ${uit.bericht}\n` +
          (uit.inschakelUrl ? `\n  Inschakelen: ${uit.inschakelUrl}\n` : ""),
      );
      return 1;
    }
    if (uit.soort === "geen_propertytoegang") {
      process.stdout.write(
        `  GEEN PROPERTYTOEGANG — de API werkt, maar deze identiteit ziet nul properties.\n` +
          `  Voeg ${toegang.clientEmail} in Search Console toe aan de property,\n` +
          `  met minstens de machtiging 'Beperkt'. Een GCP-rol geeft die toegang niet.\n`,
      );
      return 1;
    }
    if (uit.soort === "fout") {
      process.stdout.write(`  FOUT (HTTP ${uit.status}) — ${uit.bericht}\n`);
      return 1;
    }
    for (const p of uit.properties) {
      process.stdout.write(`  ${p.soort.padEnd(10)} ${p.machtiging.padEnd(16)} ${p.siteUrl}\n`);
    }
    const keuze = kiesProperty(uit.properties, toegang.voorkeur);
    process.stdout.write(
      keuze.soort === "gekozen"
        ? `\n  GEKOZEN: ${keuze.property.siteUrl}\n  grond:   ${keuze.grond}\n`
        : `\n  ONBESLIST — ${keuze.reden}\n`,
    );
    return keuze.soort === "gekozen" ? 0 : 1;
  }

  if (heeft("sync")) {
    const uit = await synchroniseerGsc(pool, organisatieId, {
      dagen: getal("dagen", 28),
      droog: heeft("droog"),
    });
    if (uit.soort === "geblokkeerd") {
      /* EEN BLOKKADE IS GEEN NUL. Exitcode 1 en de fase erbij, zodat een
         planner hem als fout ziet en een mens weet waar het stokt. */
      process.stdout.write(
        `\nGSC-SYNCHRONISATIE GEBLOKKEERD\n\n  fase:   ${uit.fase}\n  reden:  ${uit.reden}\n\n` +
          "  Er is NIETS weggeschreven, ook geen dekkingsrij. Een dekkingsrij met nul rijen\n" +
          "  zou beweren dat deze periode is opgehaald en leeg was.\n",
      );
      return 1;
    }
    const t = uit.propertyTotaal;
    const eigen = websiteHost();
    process.stdout.write(
      `\nGSC-SYNCHRONISATIE${heeft("droog") ? " (DROOG)" : ""}\n\n` +
        `  property:    ${uit.property} (${uit.propertySoort})\n` +
        `  identiteit:  ${uit.identiteit}\n` +
        `  venster:     ${uit.vanaf} t/m ${uit.tot}\n` +
        `  rijen:       ${uit.rijen}${uit.afgekapt ? " (AFGEKAPT — dit is een ONDERGRENS)" : ""}\n` +
        `  weggeschreven: ${uit.geschreven}\n` +
        (uit.opgeruimd > 0
          ? `  opgeruimd:   ${uit.opgeruimd} legacyrij(en) zonder host (van vóór migratie 0050)\n`
          : "") +
        `  conventie:   ${uit.conventie}\n` +
        `  epoch:       ${uit.epoch}\n\n` +
        /* DE TWEE TOTALEN NAAST ELKAAR, nooit los. Het detailtotaal
           alleen is een verkeerd getal: Google laat zeldzame
           zoekvragen uit elke gedimensioneerde respons weg. */
        `  PROPERTYTOTAAL (Google zelf, zonder dimensies)\n` +
        (t === null
          ? `    NIET GEMETEN — de dekkingsgraad van de detaillaag is dus onbekend,\n` +
            `    en dit detailtotaal mag niet als sitetotaal gelden.\n`
          : `    kliks ${t.kliks}   impressies ${t.impressies}   ` +
            `ctr ${(t.ctr * 100).toFixed(2)} %   positie ${t.positie.toFixed(2)}\n`) +
        `  DETAILTOTAAL (wat per zoekvraag is opgeslagen)\n` +
        `    kliks ${uit.detailKliks}   impressies ${uit.detailImpressies}\n` +
        (t === null || t.kliks === 0 || t.impressies === 0
          ? ""
          : `  DEKKING: ${((uit.detailKliks / t.kliks) * 100).toFixed(0)} % van de kliks, ` +
            `${((uit.detailImpressies / t.impressies) * 100).toFixed(0)} % van de impressies.\n` +
            `    Het verschil is Google's anonimisering van zeldzame zoekvragen.\n`) +
        `\n  PER HOST — een domeinproperty dekt meer dan de website\n` +
        Object.entries(uit.perHost)
          .sort((a, b) => b[1] - a[1])
          .map(
            ([h, i]) =>
              `    ${h.padEnd(28)} ${String(i).padStart(7)} impressies` +
              (h === eigen ? "   <- de website" : ""),
          )
          .join("\n") +
        "\n\n  LET OP: dit zijn zoekprestaties, geen indexatiestatus. Of Google een pagina heeft\n" +
        "  opgenomen is een aparte waarneming; HTTP 200 is dat zeker niet.\n",
    );
    return 0;
  }

  const stand = await metOrganisatie(pool, { organisatieId }, (c) =>
    gscStand(c, organisatieId),
  );
  const toegang = gscToegang();
  process.stdout.write(
    `\nGSC — STAND IN DE DATABASE\n\n` +
      `  credential:        ${toegang.soort === "geen" ? `GEEN (${toegang.reden})` : `${toegang.clientEmail} via ${toegang.herkomst}`}\n` +
      `  dekkingsvensters:  ${stand.dekkingsrijen}${stand.afgekapteVensters > 0 ? ` (${stand.afgekapteVensters} AFGEKAPT)` : ""}\n` +
      `  zoekvraagrijen:    ${stand.zoekvraagrijen}\n` +
      `  nieuwste datum:    ${stand.nieuwsteDatum ?? "GEEN DATA"}\n` +
      `  laatste ophaling:  ${stand.laatsteOphaling ?? "NOOIT"}\n` +
      (stand.rijenZonderHost > 0
        ? `  zonder host:       ${stand.rijenZonderHost} rij(en) van vóór migratie 0050\n`
        : "") +
      "\n" +
      (stand.perHost.length === 0
        ? ""
        : `  PER HOST\n` +
          stand.perHost
            .map(
              (h) =>
                `    ${(h.host ?? "(onbekend)").padEnd(28)} ` +
                `${String(h.impressies).padStart(7)} impressies  ` +
                `${String(h.kliks).padStart(4)} kliks  ` +
                `positie ${h.positie === null ? "n.v.t." : h.positie.toFixed(1)}` +
                (h.host === websiteHost() ? "   <- de website" : ""),
            )
            .join("\n") +
          "\n\n") +
      (stand.dekking === null
        ? "  PROPERTYTOTAAL: NIET GEMETEN. De dekkingsgraad van de detaillaag is dus onbekend,\n" +
          "  en het detailtotaal mag niet als sitetotaal worden gelezen.\n"
        : `  PROPERTYTOTAAL ${stand.dekking.vanaf} t/m ${stand.dekking.tot}\n` +
          `    Google zelf:  ${stand.dekking.propertyKliks} kliks   ` +
          `${stand.dekking.propertyImpressies} impressies   positie ` +
          `${stand.dekking.propertyPositie === null ? "n.v.t." : stand.dekking.propertyPositie.toFixed(2)}\n` +
          `    detaillaag:   ${stand.dekking.detailKliks} kliks   ` +
          `${stand.dekking.detailImpressies} impressies   ${stand.dekking.detailRijen} rijen\n` +
          `    dekking:      ${
            stand.dekking.kliksDekking === null
              ? "NIET GEMETEN"
              : `${(stand.dekking.kliksDekking * 100).toFixed(0)} % van de kliks`
          }, ${
            stand.dekking.impressiesDekking === null
              ? "NIET GEMETEN"
              : `${(stand.dekking.impressiesDekking * 100).toFixed(0)} % van de impressies`
          }\n`) +
      "\n" +
      (stand.dekkingsrijen === 0
        ? "  NUL DEKKINGSVENSTERS betekent NIET 'nul vertoningen'. Het betekent dat er nooit\n" +
          "  iets is opgehaald. Draai 'npm run gsc -- --properties' om te zien waar het stokt.\n"
        : ""),
  );
  return 0;
}

main().then(
  async (code) => {
    await sluitAllePools();
    process.exit(code);
  },
  async (e) => {
    process.stderr.write(`${(e as Error).stack ?? String(e)}\n`);
    await sluitAllePools();
    process.exit(1);
  },
);
