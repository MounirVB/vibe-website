/* ============================================================
   CLI — één PDF-besluit opnemen
   ------------------------------------------------------------
   GEEN CRAWLER, EN DE CLI MAAKT DAT ZICHTBAAR: hij neemt precies één
   --url en heeft geen enkele vorm van een lijst, een wachtrij of een
   diepte. Zie de kop van bronnen/pdfdocument.ts.

   GEBRUIK
     npm run pdf -- --url <document-url> --bron <bronsleutel>
     npm run pdf -- --url <document-url> --bron <bronsleutel> --droog

   --droog haalt op en leest, maar schrijft niets weg. Bedoeld om een
   document te BEKIJKEN voordat het in de keten komt.
   ============================================================ */

import { maakPool, sluitAllePools, organisatieIdVan, metOrganisatie } from "../kern/db.ts";
import { leesPdfTekst } from "../bronnen/pdf.ts";
import { neemPdfOp, padIsToegestaan, TOEGESTANE_PDF_PADDEN } from "../bronnen/pdfdocument.ts";
import { urlToegestaan, onzeUserAgentToken } from "../bronnen/robots.ts";

function arg(naam: string): string | null {
  const i = process.argv.indexOf(`--${naam}`);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

const url = arg("url");
const bron = arg("bron");
const droog = process.argv.includes("--droog");
const organisatie = arg("organisatie") ?? "vibe-energy";

if (!url || !bron) {
  console.log("PDF-OPNAME\n");
  console.log("  npm run pdf -- --url <document-url> --bron <bronsleutel> [--droog]\n");
  console.log("TOEGESTANE PADDEN PER BRON");
  for (const [sleutel, padden] of Object.entries(TOEGESTANE_PDF_PADDEN)) {
    console.log(`  ${sleutel.padEnd(28)} ${padden.join(", ")}`);
  }
  console.log(
    "\nEen bron die hier niet staat, levert geen PDF op. Dat is de veilige kant:\n" +
      "er is geen bron die per ongeluk een hele site openzet.",
  );
  process.exit(url || bron ? 1 : 0);
}

console.log("PDF-OPNAME\n");
console.log(`  url    ${url}`);
console.log(`  bron   ${bron}`);
console.log(`  modus  ${droog ? "DROOG — er wordt niets weggeschreven" : "opnemen"}\n`);

if (!padIsToegestaan(bron, url)) {
  console.log(
    `GEWEIGERD — het pad staat niet in het register voor '${bron}'.\n` +
      `Toegestaan: ${(TOEGESTANE_PDF_PADDEN[bron] ?? []).join(", ") || "geen enkel pad"}`,
  );
  process.exit(1);
}

if (droog) {
  /* DE DROGE WEG RAAKT DE DATABASE NIET, en hij slaat ook de bronrij
     over: zonder opslag is er geen bewijsketen nodig. Hij toetst wel
     robots, want dat is geen opslagvraag maar een ophaalvraag. */
  const robots = await urlToegestaan(url);
  console.log(`robots: ${robots.toegestaan ? "toegestaan" : "VERBODEN"} — ${robots.reden}`);
  if (!robots.toegestaan) process.exit(1);

  const r = await fetch(url, { headers: { "user-agent": onzeUserAgentToken() } });
  console.log(`http ${r.status}, content-type ${r.headers.get("content-type")}`);
  if (!r.ok) process.exit(1);
  const bytes = Buffer.from(await r.arrayBuffer());
  const u = leesPdfTekst(bytes, {
    url,
    contentType: r.headers.get("content-type"),
    bronSleutel: bron,
  });
  if (!u.ok) {
    console.log(`\nGEWEIGERD — ${u.weigering}\n  ${u.reden}`);
    process.exit(1);
  }
  console.log(
    `\nGELEZEN\n  pagina's   ${u.aantalPaginas}\n  tekens     ${u.tekst.length}` +
      `\n  afgekapt   ${u.afgekapt}\n  ontwapend  ${u.ontwapend} teken(s)\n`,
  );
  console.log("DE EERSTE 1200 TEKENS\n");
  console.log(u.tekst.slice(0, 1200));
  process.exit(0);
}

const pool = maakPool();
try {
  const org = await organisatieIdVan(pool, organisatie);
  const r = await metOrganisatie(pool, { organisatieId: org }, (c) =>
    neemPdfOp(c, org, { url, bronSleutel: bron }),
  );
  if (!r.ok) {
    console.log(`GEWEIGERD — ${r.weigering}\n  ${r.reden}`);
    process.exitCode = 1;
  } else {
    console.log("OPGENOMEN\n");
    console.log(`  brondocument   ${r.brondocumentId}`);
    console.log(`  bronversie     ${r.versieId}`);
    console.log(`  nieuwe versie  ${r.nieuweVersie ? "ja" : "nee — dezelfde inhoud stond er al"}`);
    console.log(`  pagina's       ${r.aantalPaginas}`);
    console.log(`  tekens         ${r.tekstLengte}`);
    console.log(`  injectie       ${r.injectieVerdacht ? "VERDACHT" : "geen patroon"}`);
    console.log(
      "\nDe versie staat in de keten. `npm run pijplijn` clustert hem naar een\n" +
        "gebeurtenis en schrijft de claims; publiceren doet hij niet.",
    );
  }
} finally {
  await sluitAllePools();
}
