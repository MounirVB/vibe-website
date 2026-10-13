#!/usr/bin/env node
/* ============================================================
   CLI — dekkingsmeting: A/B van de oude en nieuwe termenset
   ------------------------------------------------------------
     npm run dekkingsmeting
     npm run dekkingsmeting -- --json

   WAAROM DIT BESTAAT.

   De claim "de paginamatching is verbeterd" is alleen iets waard als
   hij op DEZELFDE data is gemeten. De kandidatenset beweegt mee met de
   ingestie — tussen twee metingen op 13 oktober 2026 kwamen er al twee
   documenten bij — dus een vergelijking van twee runs op twee momenten
   bewijst niets.

   Dit commando meet beide termensets over één en dezelfde kandidaten:

     OUD   alleen de termen uit de gebeurtenisTITEL
     NIEUW die termen plus de onderwerpclusters (dekkingstermen())

   En het meet de enige vraag die telt bij een ruimere set: levert hij
   VALSE POSITIEVEN op? Een pagina die het onderwerp werkelijk niet
   behandelt, mag niet alsnog als 'gedekt' gaan tellen. Daarom staat er
   een onafhankelijke controle naast de teller: draagt de doelpagina het
   onderwerpcluster in haar EIGEN onderwerpenlijst in het artefact?

   Die lijst wordt door site/sitekennis.ts uit de paginatekst afgeleid en
   is niet dezelfde grootheid als de termfrequentie-index, dus hij is
   bruikbaar als tweede mening.

   STRIKT ALLEEN-LEZEN. Geen enkele query schrijft.
   ============================================================ */

import { laadEnvBestand, APP_WORTEL } from "../kern/config.ts";
import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { dekkingstermen } from "../inhoud/voorstel.ts";
import { herkenOnderwerpen } from "../pijplijn/onderwerpen.ts";
import { leesSitekennis, paginaVan, type KennisPagina } from "../site/sitekennis.ts";

laadEnvBestand();

const heeft = (n: string) => process.argv.includes(`--${n}`);

/** Dezelfde teller als voorstel.ts, maar los zodat deze meting niets schrijft. */
function telVermeldingen(p: KennisPagina | null, termen: readonly string[]): number {
  if (!p || termen.length === 0) return 0;
  const alles = `${p.titel ?? ""} ${p.h1 ?? ""} ${(p.sectiekoppen ?? []).join(" ")} ${p.tekst ?? ""}`.toLowerCase();
  const index = (p as unknown as { termfrequenties?: Record<string, number> }).termfrequenties ?? {};
  let n = 0;
  for (const t of termen) {
    const schoon = t.toLowerCase().trim();
    if (schoon.length < 4) continue;
    const uit = index[schoon];
    n += uit !== undefined ? uit : alles.split(schoon).length - 1;
  }
  return n;
}

type Rij = {
  kandidaat_id: number;
  titel: string;
  doel_pad: string | null;
  cluster_sleutel: string | null;
};

const pool = maakPool();
try {
  const organisatieId = await huidigeOrganisatie(pool);
  const uitslag = await leesSitekennis(APP_WORTEL);
  if (!uitslag.ok) {
    console.error(`AFGEBROKEN — sitekennis onbruikbaar (${uitslag.fout.soort}): ${uitslag.fout.bericht}`);
    process.exitCode = 2;
  } else {
    const kennis = uitslag.kennis;
    const kandidaten = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<Rij>(
        c,
        `select k.id as kandidaat_id, g.titel, p.pad as doel_pad, oc.sleutel as cluster_sleutel
           from intel.inhoud_kandidaten k
           join intel.markt_gebeurtenissen g on g.id = k.gebeurtenis_id
           left join intel.onderwerp_clusters oc on oc.id = g.onderwerp_cluster_id
           left join intel.pagina_register p on p.id = k.doel_pagina_id
          where k.besluit = 'UPDATE_EXISTING'
            and k.doel_pagina_id is not null
            and k.status <> 'afgehandeld'
          order by k.id`,
      ),
    );

    type Geval = {
      kandidaat: number;
      titel: string;
      doelPad: string;
      cluster: string | null;
      oud: number;
      nieuw: number;
      /** Draagt de doelpagina dit cluster in haar eigen onderwerpenlijst? */
      echtGedekt: boolean;
      klasse: "ongewijzigd_gedekt" | "hersteld" | "vals_positief" | "ongewijzigd_niet_gedekt";
    };

    const gevallen: Geval[] = [];
    for (const k of kandidaten) {
      if (!k.doel_pad) continue;
      const pagina = paginaVan(kennis, k.doel_pad);
      const o = herkenOnderwerpen(k.titel, "");
      const titeltermen = [
        ...new Set(o.flatMap((t) => t.termen.map((x) => x.replace(/^(titel|body):/, "")))),
      ].slice(0, 8);
      const clusters = k.cluster_sleutel ? [k.cluster_sleutel] : o.map((t) => t.onderwerp);

      const oud = telVermeldingen(pagina, titeltermen.filter((t) => t.length >= 4));
      const nieuw = telVermeldingen(
        pagina,
        dekkingstermen({
          titeltermen,
          onderwerpSleutels: clusters,
          paginaOnderwerpen: pagina?.onderwerpen,
        }),
      );

      /* De tweede mening: de onderwerpenlijst van de pagina zelf. */
      const eigen = new Set(pagina?.onderwerpen ?? []);
      const echtGedekt = clusters.some((c) => eigen.has(c));

      const klasse: Geval["klasse"] =
        oud > 0 ? "ongewijzigd_gedekt" : nieuw > 0 ? (echtGedekt ? "hersteld" : "vals_positief") : "ongewijzigd_niet_gedekt";

      gevallen.push({
        kandidaat: k.kandidaat_id,
        titel: k.titel.slice(0, 64),
        doelPad: k.doel_pad,
        cluster: k.cluster_sleutel,
        oud,
        nieuw,
        echtGedekt,
        klasse,
      });
    }

    const tel = (kl: Geval["klasse"]) => gevallen.filter((g) => g.klasse === kl).length;
    const samenvatting = {
      kandidaten_met_doelpagina: gevallen.length,
      oud_gedekt: gevallen.filter((g) => g.oud > 0).length,
      nieuw_gedekt: gevallen.filter((g) => g.nieuw > 0).length,
      hersteld: tel("hersteld"),
      vals_positief: tel("vals_positief"),
      ongewijzigd_gedekt: tel("ongewijzigd_gedekt"),
      ongewijzigd_niet_gedekt: tel("ongewijzigd_niet_gedekt"),
    };

    if (heeft("json")) {
      console.log(JSON.stringify({ samenvatting, gevallen }, null, 2));
    } else {
      console.log("");
      console.log("DEKKINGSMETING — oude tegen nieuwe termenset, op DEZELFDE kandidaten");
      console.log("=".repeat(78));
      console.log("");
      for (const [k, v] of Object.entries(samenvatting)) {
        console.log(`  ${k.padEnd(32)}${v}`);
      }
      console.log("");
      console.log("  HERSTELD — de pagina dekt het onderwerp wel, de oude set mat nul");
      for (const g of gevallen.filter((x) => x.klasse === "hersteld")) {
        console.log(`    ${String(g.kandidaat).padStart(4)} ${g.doelPad.padEnd(48)} ${g.cluster ?? "-"} ${g.oud}->${g.nieuw}`);
      }
      const vals = gevallen.filter((x) => x.klasse === "vals_positief");
      console.log("");
      console.log(`  VALS POSITIEF — ${vals.length}; de nieuwe set telt iets waar de pagina het cluster NIET draagt`);
      for (const g of vals) {
        console.log(`    ${String(g.kandidaat).padStart(4)} ${g.doelPad.padEnd(48)} ${g.cluster ?? "-"} ${g.oud}->${g.nieuw}`);
      }
      console.log("");
      console.log("  NIET GEDEKT — ook met de volledige set nul; dit zijn de echte gaten");
      for (const g of gevallen.filter((x) => x.klasse === "ongewijzigd_niet_gedekt")) {
        console.log(`    ${String(g.kandidaat).padStart(4)} ${g.doelPad.padEnd(48)} ${g.cluster ?? "-"} ${g.titel}`);
      }
      console.log("");
    }
  }
} finally {
  await sluitAllePools();
}
