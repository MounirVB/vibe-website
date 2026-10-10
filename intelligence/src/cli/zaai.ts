#!/usr/bin/env node
/* ============================================================
   CLI — zaaien
   ------------------------------------------------------------
     npm run zaai                  organisatie, pagina's, clusters,
                                   bronnen, beleid, koppelingen
     npm run zaai -- --site <pad>  tegen een andere sitewortel

   Idempotent. Rapporteert ook wat er NIET klopt aan de site: paden
   in de sitemap zonder bestand, en indexeerbare pagina's die niet in
   de sitemap staan. Dat zijn observaties over Release 1-gebied; ze
   worden gerapporteerd, niet gerepareerd.
   ============================================================ */

import { maakPool, sluitAllePools } from "../kern/db.ts";
import { zaai } from "../db/zaai.ts";

function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<number> {
  const pool = maakPool();
  const site = argument("site");
  const rapport = await zaai(pool, site ? { siteWortel: site } : {});

  const r = (label: string, waarde: unknown) =>
    process.stdout.write(`${label.padEnd(34)} ${String(waarde)}\n`);

  process.stdout.write("ZAAIEN GEREED\n\n");
  r("organisatie_id", rapport.organisatieId);
  r("pagina's gescand", rapport.paginasGescand);
  r("pagina's in register", rapport.paginasGeschreven);
  r("clusters", rapport.clustersGeschreven);
  r("bronnen in register", `${rapport.bronnenGeschreven} (${rapport.bronnenActief} actief)`);
  r("publicatiebeleid", rapport.beleidVersie);

  process.stdout.write("\nKOPPELINGEN\n");
  for (const k of rapport.koppelingen) {
    process.stdout.write(
      `  ${k.sleutel.padEnd(16)} ${k.status.padEnd(20)}` +
        (k.ontbrekend.length > 0 ? ` ontbreekt: ${k.ontbrekend.join(", ")}` : "") +
        "\n",
    );
  }

  process.stdout.write("\nCLUSTERS ZONDER CANONIEKE PAGINA\n");
  process.stdout.write(
    rapport.clustersZonderPagina.length === 0
      ? "  (geen)\n"
      : `  ${rapport.clustersZonderPagina.join(", ")}\n` +
          "  Deze onderwerpen hebben nog geen pagina die de zoekintentie bezit.\n",
  );

  process.stdout.write("\nOBSERVATIES OVER DE SITE (Release 1-gebied, niet gerepareerd)\n");
  process.stdout.write(
    `  sitemap-paden zonder bestand: ${
      rapport.sitemapZonderBestand.length === 0
        ? "geen"
        : rapport.sitemapZonderBestand.join(", ")
    }\n`,
  );
  process.stdout.write(
    `  indexeerbaar maar niet in sitemap (${rapport.indexeerbaarZonderSitemap.length}): ${
      rapport.indexeerbaarZonderSitemap.length === 0
        ? "geen"
        : rapport.indexeerbaarZonderSitemap.join(", ")
    }\n`,
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
