/* ============================================================
   OPS — het publicatiecontract als poort
   ------------------------------------------------------------
     node intelligence/ops/publicatiecontract.mjs

   Deze poort leest ALLEEN bestanden. Hij heeft geen database nodig en
   doet geen netwerkverzoek, want hij toetst precies dat wat er in de
   repository komt te staan — en dat is wat een reviewer van een
   publicatie-PR moet kunnen vertrouwen zonder de hele keten te
   draaien.

   WAT HIJ TEGENHOUDT, EN WAAROM JUIST DAT
   De gevaarlijke publicatie-PR is niet een lelijke pagina; die ziet
   een reviewer. De gevaarlijke PR is er een die er NORMAAL uitziet en
   een regel sloopt die niemand per commit nakijkt:

     · een nieuwsartikel op INDEX zonder menselijke goedkeuring
     · een artikel dat zijn eigen commerciële intentie claimt in
       plaats van die te lenen
     · een tweede route met dezelfde slug
     · een regionale PENDING-route die stil op INDEX is gezet
     · een sitemap die niet meer met het routeregister klopt
     · een met de hand bijgewerkte sitemap of HTML

   De laatste twee zijn de reden dat deze poort bestaat náást
   audit.mjs: audit.mjs toetst de GEGENEREERDE uitkomst, en deze poort
   toetst of de uitkomst nog uit het register volgt.
   ============================================================ */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const WORTEL = resolve(HIER, "..", "..");

const lees = (...p) => JSON.parse(readFileSync(resolve(WORTEL, ...p), "utf8"));

let geslaagd = 0;
const bevindingen = [];
function toets(naam, ok, meting = "") {
  if (ok) {
    geslaagd += 1;
    console.log(`  PASS  ${naam}${meting ? ` — ${meting}` : ""}`);
  } else {
    bevindingen.push(`${naam}${meting ? ` — ${meting}` : ""}`);
    console.log(`  FAIL  ${naam}${meting ? ` — ${meting}` : ""}`);
  }
}

console.log("");
console.log("PUBLICATIECONTRACT");
console.log("");

/* ---------------- het routeregister ---------------- */
const registerPad = resolve(WORTEL, "data", "seo", "routes.json");
if (!existsSync(registerPad)) {
  console.error("  FATAAL  data/seo/routes.json ontbreekt; draai eerst scripts/seo/bouw-routes.mjs");
  process.exit(1);
}
const register = lees("data", "seo", "routes.json");
const routes = register.routes ?? [];
const index = routes.filter((r) => r.staat === "INDEX");
const nieuwsRoutes = routes.filter((r) => r.subsoort === "nieuws");
const hub = routes.find((r) => r.route === "nieuws");

/* ---------------- 1. goedkeuring ---------------- */
{
  const zonderGoedkeuring = nieuwsRoutes.filter(
    (r) => r.staat === "INDEX" && r.redactionele_staat !== "GOEDGEKEURD",
  );
  toets(
    "geen nieuwsartikel op INDEX zonder redactionele staat GOEDGEKEURD",
    zonderGoedkeuring.length === 0,
    zonderGoedkeuring.length
      ? zonderGoedkeuring.map((r) => `${r.route}=${r.redactionele_staat ?? "onbekend"}`).join(", ")
      : `${nieuwsRoutes.length} nieuwsroute(s), ${nieuwsRoutes.filter((r) => r.staat === "INDEX").length} op INDEX`,
  );
}

/* ---------------- 2. de inhoudsbestanden zelf ---------------- */
{
  const map = resolve(WORTEL, "data", "inhoud", "nieuws");
  const bestanden = existsSync(map) ? readdirSync(map).filter((b) => b.endsWith(".json")) : [];
  const fouten = [];
  const slugs = new Map();

  const DRAGEND = new Set(["WETGEVING", "TOEZICHTHOUDER", "NETBEHEERDER", "STATISTIEK"]);

  for (const b of bestanden) {
    const j = JSON.parse(readFileSync(join(map, b), "utf8"));
    const route = String(j.route ?? "");
    const staat = String(j.redactionele_staat ?? "");

    if (slugs.has(route)) fouten.push(`${b}: route '${route}' bestaat ook in ${slugs.get(route)}`);
    slugs.set(route, b);

    if (staat !== "GOEDGEKEURD") continue; // alleen goedgekeurde moeten de rest halen

    if (!j.goedgekeurd_door || !String(j.goedgekeurd_door).trim()) {
      fouten.push(`${b}: GOEDGEKEURD zonder goedgekeurd_door`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(j.goedgekeurd_op ?? ""))) {
      fouten.push(`${b}: GOEDGEKEURD zonder geldige goedgekeurd_op`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(j.gepubliceerd ?? ""))) {
      fouten.push(`${b}: geen geldige publicatiedatum`);
    }
    if (!j.onderwerp_eigenaar || !String(j.onderwerp_eigenaar).trim()) {
      fouten.push(`${b}: geen onderwerp_eigenaar; het artikel zou zijn eigen intentie claimen`);
    }
    const bronnen = Array.isArray(j.bronnen) ? j.bronnen : [];
    if (!bronnen.some((x) => DRAGEND.has(String(x?.soort ?? "").toUpperCase()))) {
      fouten.push(`${b}: geen dragende bron (${[...DRAGEND].join("/")})`);
    }
    for (const c of Array.isArray(j.claims) ? j.claims : []) {
      if (!c?.bron_url || !c?.bron_datum) fouten.push(`${b}: een claim zonder bron_url of bron_datum`);
    }
  }

  toets(
    "elk goedgekeurd nieuwsbestand draagt goedkeurder, datum, eigenaar en een dragende bron",
    fouten.length === 0,
    fouten.length ? fouten.slice(0, 3).join(" | ") : `${bestanden.length} bestand(en) in data/inhoud/nieuws/`,
  );
}

/* ---------------- 3. slugbotsing over het hele register ---------------- */
{
  const gezien = new Map();
  const dubbel = [];
  for (const r of routes) {
    if (gezien.has(r.route)) dubbel.push(r.route);
    gezien.set(r.route, true);
  }
  toets(
    "geen dubbele route in het register",
    dubbel.length === 0,
    dubbel.length ? dubbel.slice(0, 5).join(", ") : `${routes.length} routes`,
  );
}

/* ---------------- 4. regionale PENDING blijft PENDING ---------------- */
{
  /* De getallen uit de vastgestelde basislijn. Een PR die hier
     verandering in brengt moet dat expliciet verantwoorden; stil
     promoveren van regioroutes is precies wat deze poort moet
     tegenhouden. */
  const BASISLIJN_REGIO_PENDING = 4587;
  const regioPending = routes.filter((r) => r.soort === "regio" && r.staat === "PENDING").length;
  const regioIndex = routes.filter((r) => r.soort === "regio" && r.staat === "INDEX").length;
  toets(
    "de regionale PENDING-routes zijn niet stil gepromoveerd",
    regioPending === BASISLIJN_REGIO_PENDING,
    `${regioPending} PENDING (basislijn ${BASISLIJN_REGIO_PENDING}), ${regioIndex} op INDEX`,
  );
}

/* ---------------- 5. sitemappariteit ---------------- */
{
  const sitemapPad = resolve(WORTEL, "sitemap.xml");
  const xml = existsSync(sitemapPad) ? readFileSync(sitemapPad, "utf8") : "";
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const uitRegister = new Set(
    index.map((r) => (r.route === "" ? "https://www.vibeenergy.nl/" : `https://www.vibeenergy.nl/${r.route}`)),
  );
  const inSitemap = new Set(locs);
  const alleenSitemap = [...inSitemap].filter((u) => !uitRegister.has(u));
  const alleenRegister = [...uitRegister].filter((u) => !inSitemap.has(u));

  toets(
    "de sitemap bevat exact de INDEX-routes uit het register",
    alleenSitemap.length === 0 && alleenRegister.length === 0,
    `${locs.length} sitemapregels tegenover ${index.length} INDEX-routes; ` +
      `alleen in sitemap ${alleenSitemap.length}, alleen in register ${alleenRegister.length}`,
  );

  const apex = locs.filter((u) => u.startsWith("https://vibeenergy.nl"));
  toets(
    "geen enkele sitemapregel staat op de apexhost (die geeft 301)",
    apex.length === 0,
    apex.length ? apex.slice(0, 3).join(", ") : "alle regels op www",
  );
}

/* ---------------- 6. de hub ---------------- */
{
  const artikelenOpIndex = nieuwsRoutes.filter((r) => r.staat === "INDEX").length;
  const hubIndex = hub?.staat === "INDEX";
  toets(
    "de nieuwshub staat alleen op INDEX als er een gepubliceerd artikel is",
    hubIndex === artikelenOpIndex > 0,
    `hub ${hub?.staat ?? "niet in register"}, ${artikelenOpIndex} artikel(en) op INDEX`,
  );

  /* De zichtbare navigatie zit in vibe/chrome.js en kan het register
     niet lezen. Staat de hub op INDEX zonder die link, dan is het
     kanaal alleen voor crawlers bereikbaar. */
  if (hubIndex) {
    const chrome = resolve(WORTEL, "vibe", "chrome.js");
    const heeftLink = existsSync(chrome) && /\/nieuws/.test(readFileSync(chrome, "utf8"));
    toets(
      "vibe/chrome.js draagt de /nieuws-link nu de hub op INDEX staat",
      heeftLink,
      heeftLink ? "link aanwezig" : "de zichtbare navigatie mist het kanaal",
    );
  }
}

/* ---------------- rapport ---------------- */
console.log("");
console.log("-".repeat(72));
console.log(`geslaagd ${geslaagd}   gefaald ${bevindingen.length}`);
if (bevindingen.length) {
  console.log("");
  for (const b of bevindingen) console.log(`  FAIL ${b}`);
  console.log("");
  console.log("EINDOORDEEL PUBLICATIECONTRACT = FAIL");
  process.exit(1);
}
console.log("");
console.log("EINDOORDEEL PUBLICATIECONTRACT = PASS");
