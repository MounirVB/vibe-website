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
     · een PR die een deel van de LIVE site onzichtbaar maakt

   De laatste drie zijn de reden dat deze poort bestaat náást
   audit.mjs: audit.mjs toetst de GEGENEREERDE uitkomst, en deze poort
   toetst of de uitkomst nog uit het register volgt — en of het register
   niet stilletjes kleiner is geworden dan de stand waar de PR op
   begon.
   ============================================================ */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const WORTEL = resolve(HIER, "..", "..");

const lees = (...p) => JSON.parse(readFileSync(resolve(WORTEL, ...p), "utf8"));

let geslaagd = 0;
const bevindingen = [];
const overgeslagen = [];
function toets(naam, ok, meting = "") {
  if (ok) {
    geslaagd += 1;
    console.log(`  PASS  ${naam}${meting ? ` — ${meting}` : ""}`);
  } else {
    bevindingen.push(`${naam}${meting ? ` — ${meting}` : ""}`);
    console.log(`  FAIL  ${naam}${meting ? ` — ${meting}` : ""}`);
  }
}

/* EEN DERDE UITKOMST, OMDAT TWEE ER EEN TE WEINIG ZIJN.

   Stap 7 heeft een basisreferentie nodig die er niet altijd is: een
   shallow clone, een losse checkout of een vijandige kopie zonder `.git`
   leveren hem niet. Die stap als PASS afdoen zou de enige poort die een
   massaverwijdering kan zien stil groen maken — precies de fout die deze
   poort elders tegenhoudt. Een niet-gemeten stap heet daarom
   OVERGESLAGEN, krijgt zijn eigen regel met de reden, en staat ook in het
   EINDOORDEEL, zodat niemand een halve meting voor een hele aanziet. */
function overslaan(naam, reden) {
  overgeslagen.push(`${naam} — ${reden}`);
  console.log(`  OVERGESLAGEN  ${naam} — ${reden}`);
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
     tegenhouden.

     HET VASTE GETAL IS VERVANGEN — EN DAT IS EEN VERSCHERPING.

     De basislijn stond op 4587 en viel om op de promotie van Release 3.1.
     Dat was zijn werk. Maar een VAST getal heeft twee gebreken:

     1. Het bijstellen is het enige wat nodig is om hem te passeren. Wie het
        cijfer bijwerkt zet de draad door en merkt de volgende keer niets.
     2. Het verbiedt een gefaseerde uitrol. Elke fase verandert het aantal,
        dus elke fase zou het getal moeten bijwerken — en dan toetst het
        niets meer.

     De vervanging leunt niet op een getal maar op het BESLUITBESTAND: het
     aantal regionale INDEX-routes moet exact gelijk zijn aan wat er is
     verantwoord. Dat is zelfonderhoudend, het laat elke fase door, en het
     blijft precies die ene fout tegenhouden waarvoor de draad er hing: een
     route die op INDEX komt zonder door publicatiebesluit.json te gaan.

     Het aantal staat nog steeds in de meting, zodat een reviewer in de
     CI-uitvoer ziet hoeveel pagina's een PR publiceert. */
  const regioPending = routes.filter((r) => r.soort === "regio" && r.staat === "PENDING").length;
  const regioIndex = routes.filter((r) => r.soort === "regio" && r.staat === "INDEX").length;

  /* De toets die niet op een getal leunt. */
  const besluitPad = resolve(WORTEL, "data", "seo", "publicatiebesluit.json");
  const besluit = existsSync(besluitPad) ? JSON.parse(readFileSync(besluitPad, "utf8")) : { vrijgegeven: {} };
  const projGeoPad = resolve(WORTEL, "data", "bewijs", "projecten-geo.json");
  const projGeo = existsSync(projGeoPad) ? JSON.parse(readFileSync(projGeoPad, "utf8")).per_gemeente : {};
  const gemeentenPad = resolve(WORTEL, "data", "geo", "gemeenten.json");
  const gemeenten = existsSync(gemeentenPad) ? JSON.parse(readFileSync(gemeentenPad, "utf8")).gemeenten : [];
  const provHeeftWerk = new Set(
    gemeenten.filter((g) => (projGeo[g.gemeentecode] || []).length).map((g) => g.provinciecode),
  );

  const onverantwoord = [];
  for (const r of routes.filter((x) => x.soort === "regio" && x.staat === "INDEX")) {
    if (r.subsoort === "wortel") continue;
    if (r.subsoort === "gemeente") {
      const heeftProject = (projGeo[r.gemeentecode] || []).length > 0;
      if (!heeftProject && !besluit.vrijgegeven?.[r.route]) onverantwoord.push(r.route);
    } else if (r.subsoort === "provincie") {
      /* Een provinciehub mag op eigen werk of als ouder van een
         vrijgegeven gemeente; beide zijn verantwoord. */
      const kinderen = routes.some(
        (x) => x.subsoort === "gemeente" && x.provinciecode === r.provinciecode && x.staat === "INDEX",
      );
      if (!provHeeftWerk.has(r.provinciecode) && !kinderen) onverantwoord.push(r.route);
    } else if (!besluit.vrijgegeven?.[r.route]) {
      onverantwoord.push(r.route);
    }
  }
  const vrijgegevenAantal = Object.keys(besluit.vrijgegeven || {}).length;
  toets(
    "geen regionale route op INDEX zonder verantwoording (eigen project of een regel in publicatiebesluit.json)",
    onverantwoord.length === 0,
    onverantwoord.length
      ? `${onverantwoord.length} zonder verantwoording: ${onverantwoord.slice(0, 5).join(", ")}`
      : `${regioIndex} op INDEX · ${regioPending} PENDING · ${vrijgegevenAantal} regel(s) in publicatiebesluit.json`,
  );

  /* Andersom óók: een regel in het besluit die niet tot een INDEX-route
     heeft geleid, betekent dat de vrijgave stil is mislukt — bijvoorbeeld
     omdat de route niet meer bestaat na een gemeentelijke herindeling.
     Dan staat er een belofte in het besluit die de site niet nakomt. */
  const register = new Map(routes.map((r) => [r.route, r]));
  const nietGeland = Object.keys(besluit.vrijgegeven || {}).filter((r) => register.get(r)?.staat !== "INDEX");
  toets(
    "elke regel in publicatiebesluit.json heeft ook echt een pagina opgeleverd",
    nietGeland.length === 0,
    nietGeland.length
      ? `${nietGeland.length} vrijgegeven zonder INDEX-route: ${nietGeland.slice(0, 5).join(", ")}`
      : `${vrijgegevenAantal} vrijgegeven route(s), allemaal op INDEX`,
  );
}

/* ---------------- 5. sitemappariteit ---------------- */
{
  /* Sinds Release 3.1 is sitemap.xml een sitemapINDEX: de URL's staan in
     deelbestanden en in de index staan alleen verwijzingen. Deze poort las
     alleen de index en zag dus 2 regels tegenover 430 routes — terecht
     rood. Hij loopt de index nu af. */
  const sitemapPad = resolve(WORTEL, "sitemap.xml");
  const xml = existsSync(sitemapPad) ? readFileSync(sitemapPad, "utf8") : "";
  const haalLocs = (s) => [...s.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  let locs = [];
  if (/<sitemapindex\b/.test(xml)) {
    for (const d of haalLocs(xml)) {
      const naam = d.replace(/^https?:\/\/[^/]+\//, "");
      const p = resolve(WORTEL, naam);
      if (!existsSync(p)) continue;
      locs.push(...haalLocs(readFileSync(p, "utf8")));
    }
  } else {
    locs = haalLocs(xml);
  }
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

  /* Release 3.3: de hub mag ook LEEG op INDEX staan, maar dan uitsluitend met
     een expliciete sleutel 'nieuws' in publicatiebesluit.json. De toets blijft
     dus in beide richtingen strikt — hij erkent alleen een tweede, even
     expliciete grond. Zie data/seo/nieuws-architectuur.json,
     _correctie_op_dit_contract_3.

     Let op de haakjes: `hubIndex === artikelenOpIndex > 0` leest door
     operatorprioriteit als `hubIndex === (artikelenOpIndex > 0)`. Dat was al zo
     en is hier expliciet gemaakt, zodat de toevoeging niet stil van betekenis
     verandert. */
  const besluitPad6 = resolve(WORTEL, "data", "seo", "publicatiebesluit.json");
  const besluit6 = existsSync(besluitPad6) ? JSON.parse(readFileSync(besluitPad6, "utf8")) : { vrijgegeven: {} };
  const legeHubVrijgegeven = Boolean(besluit6.vrijgegeven?.nieuws);
  const hubMag = artikelenOpIndex > 0 || legeHubVrijgegeven;
  toets(
    "de nieuwshub staat alleen op INDEX met een gepubliceerd artikel of een vrijgave in publicatiebesluit.json",
    hubIndex === hubMag,
    `hub ${hub?.staat ?? "niet in register"}, ${artikelenOpIndex} artikel(en) op INDEX, lege-hubvrijgave ${legeHubVrijgegeven ? "ja" : "nee"}`,
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

/* ---------------- 7. de depublicatiegrendel ---------------- */
{
  /* EEN GROENE KETEN DIE 314 LIVE PAGINA'S WEGGOOIT.

     Dit is de enige stap die naar de VORIGE stand kijkt in plaats van naar
     de huidige, en hij bestaat omdat alle andere poorten per definitie
     blind zijn voor krimp: ze toetsen of wat er staat klopt, niet of er nog
     staat wat er stond. Gemeten op een wegwerpkopie van edc10d2:

       · basislijn            430 INDEX-routes, 430 sitemapregels,
                              326 sleutels in publicatiebesluit.json
       · `vrijgeven-r31.mjs --fase 1`  → vrijgegeven 326 → 18
         (dat commando staat LETTERLIJK AANBEVOLEN in scripts/seo/bouw.mjs)
       · `bouw.mjs --offline` → exit 0; INDEX 430 → 116, sitemap 430 → 116,
                              314 HTML-bestanden VERWIJDERD
       · audit.mjs            exit 0, alle 16 poorten groen
       · publicatiecontract   exit 0, PASS
       · publiek-artefact     exit 1 — maar alleen tot de commit; na
                              `git add -A && git commit` is ook die groen
       · reproduceerbaarheid  groen: `git status` is leeg na een ketenrun,
                              want de generator maakt exact deze krimp

     Netto stond er NUL rem op het depubliceren van de halve site.

     Dat dit géén bedacht scenario is, staat in scripts/seo/bouw.mjs:49: de
     keten schreef het publicatiebesluit eerst zelf, en `--fase 1` zette toen
     18 gemeenten in het besluit waarna de eerstvolgende ketenrun er weer 326
     in zette. Dat is dezelfde knop, de andere kant op. Hoe vaak de krimpkant
     echt is voorgekomen staat nergens vastgelegd en is dus ONGEMETEN.

     WAAROM DE BASIS NIET `HEAD` IS — GEMETEN, WANT HET VOELT ALS DE
     LOGISCHE KEUZE.

     Vergelijken met `git show HEAD:data/seo/routes.json` is een NO-OP. De
     gegenereerde uitvoer staat gecommit en poort.yml ("De generator moet
     REPRODUCEERBAAR zijn") eist dat `git status` na een volledige ketenrun
     leeg is. HEAD en de werkboom zijn dus altijd byte-identiek: op edc10d2
     geven `git show HEAD:data/seo/routes.json` en het bestand zelf beide
     sha256 91fce18113388e1656be8c6cdf3022d17fd5f4827f679d809fb4cc9aa29dee44.
     Een grendel op HEAD meldt dus eeuwig "verdwenen: 0", ook in exact de
     PR die 314 pagina's weggooit. Gemeten op een simulatie met 14
     gedepubliceerde gemeenten die net als een echte PR gecommit was:
     met de basis op origin/main meldt deze stap FAIL met "verdwenen 14",
     met de basis op HEAD meldt hij PASS met "verdwenen 0".

     De basis is daarom de BASIS VAN DE WIJZIGING: waar deze tak van main
     afsplitste. Volgorde van bronnen:

       1. git, want dat is de enige basis die de PR zelf niet kan kiezen:
          SEO_BASIS_SHA (poort.yml kan daar
          `github.event.pull_request.base.sha` in zetten), anders diezelfde
          sha uit GITHUB_EVENT_PATH, anders origin/$GITHUB_BASE_REF, anders
          origin/main — en daarna `git merge-base` voor de echte afsplitsing,
          zodat een tak die achterloopt niet alles wat main erbij kreeg als
          "verdwenen" ziet.
       2. SEO_BASIS_INDEX, een pad naar een JSON met de basisroutes. Die
          val-terug bestaat voor omgevingen ZONDER git: een vijandig
          scenario kopieert `.git` niet (git geeft daar exit 128) en kan de
          krimp anders niet simuleren. Git gaat voor, zodat deze variabele
          een poort nooit kan verzachten waar git wél werkt.

     Is er geen basis, dan is de uitkomst OVERGESLAGEN met de reden erbij —
     nooit stil PASS.

     GEEN DREMPEL, GEEN MARGE. Niet "meer dan X procent krimp": één
     weggegooide indexeerbare URL zonder verantwoording is al het defect.
     Een percentage is precies het soort knop dat later wordt bijgedraaid om
     een rode poort groen te krijgen.

     DE ONTSNAPPINGSKLEP. Een pagina intrekken moet kunnen. Dat gaat net als
     vrijgeven: een sleutel per route in publicatiebesluit.json, maar in de
     sectie `ingetrokken`, met als waarde de REDEN. Een verdwenen route met
     een niet-lege reden is verantwoord; elke andere maakt deze poort rood.
     De sectie mag ontbreken en wordt dan als leeg gelezen, zodat het
     besluitbestand niet hoeft te veranderen om de grendel te plaatsen.

     Een URL die van naam verandert valt hier ook onder, en dat is juist:
     de oude URL staat geïndexeerd en verdwijnt. De verantwoording is dan
     een regel in `ingetrokken` die naar de brugstub verwijst, zoals de 16
     bestaande NOINDEX-doorverwijsstubs dat doen. */
  const NAAM = "geen gepubliceerde URL verdwijnt zonder een regel in publicatiebesluit.json `ingetrokken`";

  const besluitPad = resolve(WORTEL, "data", "seo", "publicatiebesluit.json");
  const besluit = existsSync(besluitPad) ? JSON.parse(readFileSync(besluitPad, "utf8")) : {};
  const ingetrokken = besluit.ingetrokken ?? {};

  /* maxBuffer MOET omhoog. data/seo/routes.json is 2.356.065 bytes (2,25
     MiB) en de standaard maxBuffer van execFileSync is 1 MiB, dus
     `git show <sha>:data/seo/routes.json` sneuvelt daar met ENOBUFS — niet
     als faalmelding maar als crash, en dan zegt deze stap niets meer. */
  const git = (...args) =>
    execFileSync("git", ["-C", WORTEL, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });

  /* Twee vormen zijn aanleverbaar: een heel routes.json (dan filtert hij
     zelf op INDEX) of een platte lijst routes. De eerste komt uit git, de
     tweede is handig voor een toets die alleen de set wil zetten. */
  function indexUit(ruw) {
    if (Array.isArray(ruw)) {
      if (ruw.every((x) => typeof x === "string")) return new Set(ruw);
      return new Set(ruw.filter((x) => (x?.staat ?? "INDEX") === "INDEX").map((x) => String(x?.route ?? "")));
    }
    if (ruw && Array.isArray(ruw.routes)) {
      return new Set(ruw.routes.filter((r) => r.staat === "INDEX").map((r) => r.route));
    }
    return null;
  }

  function basisIndexSet() {
    const geprobeerd = [];

    let topNiveau = null;
    try {
      topNiveau = git("rev-parse", "--show-toplevel").trim();
    } catch {
      topNiveau = null;
    }
    /* Een kopie die TOEVALLIG in een andere repository ligt mag niet de
       basis van die repository lenen; dan zou de grendel een vreemde stand
       vergelijken en onzin melden. */
    if (topNiveau !== WORTEL) {
      geprobeerd.push(topNiveau ? `git wijst naar ${topNiveau}, niet naar deze boom` : "geen git-repository");
    } else {
      const kandidaten = [];
      if (process.env.SEO_BASIS_SHA) kandidaten.push([process.env.SEO_BASIS_SHA, "SEO_BASIS_SHA"]);
      const evPad = process.env.GITHUB_EVENT_PATH;
      if (evPad && existsSync(evPad)) {
        try {
          const sha = JSON.parse(readFileSync(evPad, "utf8"))?.pull_request?.base?.sha;
          if (sha) kandidaten.push([sha, "pull_request.base.sha"]);
        } catch {
          geprobeerd.push("GITHUB_EVENT_PATH is onleesbaar");
        }
      }
      if (process.env.GITHUB_BASE_REF) {
        kandidaten.push([`origin/${process.env.GITHUB_BASE_REF}`, `origin/${process.env.GITHUB_BASE_REF}`]);
      }
      kandidaten.push(["origin/main", "origin/main"]);

      for (const [ref, label] of kandidaten) {
        let commit;
        try {
          commit = git("rev-parse", "--verify", `${ref}^{commit}`).trim();
        } catch {
          geprobeerd.push(`${label} bestaat niet in deze checkout`);
          continue;
        }
        let punt = commit;
        try {
          punt = git("merge-base", commit, "HEAD").trim() || commit;
        } catch {
          geprobeerd.push(`${label} heeft geen gemeenschappelijke voorouder met HEAD`);
        }
        let set = null;
        try {
          set = indexUit(JSON.parse(git("show", `${punt}:data/seo/routes.json`)));
        } catch {
          geprobeerd.push(`${label} @ ${punt.slice(0, 7)} levert geen leesbare data/seo/routes.json`);
          continue;
        }
        if (!set) {
          geprobeerd.push(`${label} @ ${punt.slice(0, 7)}: routes.json in een onbekende vorm`);
          continue;
        }
        return { set, herkomst: `${label} @ ${punt.slice(0, 7)}` };
      }
    }

    const pad = process.env.SEO_BASIS_INDEX;
    if (pad) {
      if (!existsSync(pad)) return { reden: `SEO_BASIS_INDEX=${pad} bestaat niet; ${geprobeerd.join("; ")}` };
      let set = null;
      try {
        set = indexUit(JSON.parse(readFileSync(pad, "utf8")));
      } catch (e) {
        return { reden: `SEO_BASIS_INDEX=${pad} is geen leesbare JSON (${e.message})` };
      }
      if (!set) {
        return { reden: `SEO_BASIS_INDEX=${pad} heeft een onbekende vorm; verwacht routes.json of een lijst routes` };
      }
      return { set, herkomst: `SEO_BASIS_INDEX ${pad}` };
    }

    return {
      reden:
        `geen basisreferentie beschikbaar (${geprobeerd.join("; ")}); ` +
        "zet SEO_BASIS_SHA of SEO_BASIS_INDEX, of haal origin/main op — de krimp is NIET getoetst",
    };
  }

  const basis = basisIndexSet();
  const nu = new Set(index.map((r) => r.route));

  if (!basis.set) {
    overslaan(NAAM, basis.reden);
  } else {
    /* Een route die van INDEX naar NOINDEX of PENDING gaat is voor Google
       net zo verdwenen als een route die uit het register valt: de URL
       stond geïndexeerd en staat straks niet meer in de sitemap. Daarom
       wordt alleen de INDEX-set vergeleken en niet het bestaan van de
       regel. */
    const verdwenen = [...basis.set].filter((r) => !nu.has(r)).sort();
    const bijgekomen = [...nu].filter((r) => !basis.set.has(r)).sort();
    const onverantwoord = verdwenen.filter((r) => !String(ingetrokken[r] ?? "").trim());
    const toon = (lijst) =>
      lijst.slice(0, 15).join(", ") + (lijst.length > 15 ? ` …(+${lijst.length - 15} meer)` : "");
    const kop =
      `basis ${basis.set.size} INDEX (${basis.herkomst}) · nu ${nu.size} · ` +
      `verdwenen ${verdwenen.length} · bijgekomen ${bijgekomen.length}`;

    toets(
      NAAM,
      onverantwoord.length === 0,
      onverantwoord.length
        ? `${kop}; ${onverantwoord.length} zonder reden in \`ingetrokken\`: ${toon(onverantwoord)}`
        : verdwenen.length
          ? `${kop}; alle ${verdwenen.length} verdwenen route(s) staan met reden in \`ingetrokken\`: ${toon(verdwenen)}`
          : kop,
    );
  }
}

/* ---------------- rapport ---------------- */
console.log("");
console.log("-".repeat(72));
console.log(`geslaagd ${geslaagd}   gefaald ${bevindingen.length}   overgeslagen ${overgeslagen.length}`);
if (overgeslagen.length) {
  console.log("");
  for (const o of overgeslagen) console.log(`  OVERGESLAGEN ${o}`);
}
if (bevindingen.length) {
  console.log("");
  for (const b of bevindingen) console.log(`  FAIL ${b}`);
  console.log("");
  console.log("EINDOORDEEL PUBLICATIECONTRACT = FAIL");
  process.exit(1);
}
console.log("");
console.log(
  `EINDOORDEEL PUBLICATIECONTRACT = PASS${
    overgeslagen.length ? ` — ${overgeslagen.length} stap NIET GETOETST (zie OVERGESLAGEN)` : ""
  }`,
);
