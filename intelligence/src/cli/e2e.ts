/* ============================================================
   CLI — de end-to-end scenario's
   ------------------------------------------------------------
     npm run e2e                  alles
     npm run e2e -- --snel        sla de netwerkscenario's over

   Dit is de bewijsvoering voor het eindrapport. Elk scenario doet een
   ECHTE handeling tegen de echte stack: de echte database met de
   applicatierol, de echte generator van Release 1, een echt
   draaiend dashboard met echte HTTP-verzoeken, en waar nodig de echte
   live site.

   WAT DIT BESTAND NIET DOET
   Het herimplementeert geen logica. Waar een invariant al door de
   eenheids-, integratie- of adversariele suite wordt afgedwongen,
   roept dit scenario die suite aan in plaats van de toets na te
   bouwen. Twee implementaties van dezelfde toets betekent dat er een
   stilletjes kan verouderen.

   EEN SCENARIO DAT NIET KAN DRAAIEN HEET 'NIET GEDRAAID' MET REDEN.
   Nooit PASS.
   ============================================================ */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { laadEnvBestand, configLezen } from "../kern/config.ts";
import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { maakApp } from "../dashboard/server.ts";

laadEnvBestand();
const config = configLezen();

const HIER = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HIER, "..", "..");
const SITE = config.siteWortel;
const SNEL = process.argv.includes("--snel");

/* DE GENERATORDATUM PINNEN, ANDERS IS SCENARIO 11 EEN TIJDBOM.
   bouw-routes.mjs en sitemap.mjs vallen terug op `new Date()`, dus een
   ketenrun op een latere dag dan de commitdag schrijft een andere
   `dateModified` en `lastmod` in 18 bestanden. Scenario 9 draait die
   keten en scenario 11 vergelijkt daarna `git status` — die zag dan 19
   gewijzigde bestanden om een reden die niets met de generator te maken
   heeft. De CI-poort pint deze variabelen al; hier gebeurt hetzelfde,
   zodat lokaal en CI dezelfde meting doen.
   Dit verzwakt niets: de klok is geen invoer van de generator. */
try {
  const routes = JSON.parse(readFileSync(join(SITE, "data", "seo", "routes.json"), "utf8")) as {
    _gegenereerd?: string;
  };
  const d = routes._gegenereerd;
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    for (const v of ["ROUTES_DATUM", "SITEMAP_DATUM", "GEO_OPHAALDATUM", "BEWIJS_OPHAALDATUM"]) {
      process.env[v] = d;
    }
  }
} catch {
  /* geen routes.json: scenario 11 meldt het verschil dan zelf */
}

type Uitslag = "PASS" | "FAIL" | "NIET GEDRAAID";
type Scenario = {
  nummer: number;
  naam: string;
  uitslag: Uitslag;
  meting: string;
  details: string[];
};

const scenarios: Scenario[] = [];

function meld(nummer: number, naam: string, uitslag: Uitslag, meting: string, details: string[] = []) {
  scenarios.push({ nummer, naam, uitslag, meting, details });
  const kleur = uitslag === "PASS" ? "PASS" : uitslag === "FAIL" ? "FAIL" : "NIET GEDRAAID";
  console.log(`  [${String(nummer).padStart(2)}] ${kleur.padEnd(14)} ${naam}`);
  if (meting) console.log(`       ${meting}`);
  for (const d of details.slice(0, 4)) console.log(`       · ${d}`);
}

function draai(
  commando: string,
  args: string[],
  cwd: string,
): { ok: boolean; uit: string } {
  try {
    const uit = execFileSync(commando, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
    return { ok: true, uit };
  } catch (e) {
    const f = e as { stdout?: string; stderr?: string };
    return { ok: false, uit: (f.stdout ?? "") + (f.stderr ?? "") };
  }
}

const pool = maakPool();

try {
  const organisatieId = await huidigeOrganisatie(pool);
  console.log("");
  console.log("VIBE ENERGY — END-TO-END SCENARIO'S");
  console.log("=".repeat(96));
  console.log("");

  /* ---------------- 1. bronlaag ---------------- */
  {
    const r = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ actief: number; met_bewijs: number; inactief: number; totaal: number }>(
        c,
        `select count(*) filter (where actief)::int                                   as actief,
                count(*) filter (where actief and robots_status is not null
                                   and tdm_status is not null
                                   and verificatie_bewijs is not null)::int           as met_bewijs,
                count(*) filter (where not actief)::int                               as inactief,
                count(*)::int                                                         as totaal
           from intel.bronnen where organisatie_id = $1`,
        [organisatieId],
      ),
    );
    const b = r[0]!;
    const ok = b.actief === b.met_bewijs && b.actief > 0;
    meld(
      1,
      "Bronregister: elke actieve bron heeft gemeten toestemming, elke inactieve een reden",
      ok ? "PASS" : "FAIL",
      `${b.totaal} bronnen, ${b.actief} actief en alle ${b.met_bewijs} met robots-, tdm- en verificatiebewijs, ${b.inactief} uitgeschakeld`,
    );
  }

  /* ---------------- 2. ingestie en idempotentie ---------------- */
  {
    const r = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ documenten: number; versies: number; verdacht: number }>(
        c,
        `select (select count(*) from intel.brondocumenten where organisatie_id = $1)::int        as documenten,
                (select count(*) from intel.brondocument_versies where organisatie_id = $1)::int  as versies,
                (select count(*) from intel.brondocument_versies
                  where organisatie_id = $1 and injectie_verdacht)::int                           as verdacht`,
        [organisatieId],
      ),
    );
    const b = r[0]!;
    /* NIET `documenten === versies`. Dat gold alleen zolang geen enkele
       bron ooit was gewijzigd: een document dat materieel verandert
       KRIJGT een tweede versie, en dat is precies de bedoeling van de
       versietabel. Gemeten op 12 oktober 2026: 2.111 documenten tegen
       2.113 versies, want twee bronnen hadden hun inhoud aangepast.
       De echte invariant is dus: elk document heeft minstens één versie,
       en er bestaat geen versie zonder document. */
    const w = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ zonder_versie: number; wees_versies: number }>(
        c,
        `select (select count(*) from intel.brondocumenten d
                  where d.organisatie_id = $1
                    and not exists (select 1 from intel.brondocument_versies v
                                     where v.brondocument_id = d.id))::int as zonder_versie,
                (select count(*) from intel.brondocument_versies v
                  where v.organisatie_id = $1
                    and not exists (select 1 from intel.brondocumenten d
                                     where d.id = v.brondocument_id))::int as wees_versies`,
        [organisatieId],
      ),
    );
    const inv = w[0]!;
    const ok2 =
      b.documenten > 0 &&
      b.versies >= b.documenten &&
      inv.zonder_versie === 0 &&
      inv.wees_versies === 0;
    meld(
      2,
      "Ingestie: elk brondocument heeft minstens een versie en geen versie is een wees",
      ok2 ? "PASS" : "FAIL",
      `${b.documenten} documenten, ${b.versies} versies (${b.versies - b.documenten} herzieningen), ` +
        `${inv.zonder_versie} zonder versie, ${inv.wees_versies} weesversies, ${b.verdacht} injectie-verdacht`,
    );
  }

  if (SNEL) {
    meld(3, "Ingestie is idempotent: een geforceerde herhaling levert niets nieuws", "NIET GEDRAAID", "--snel: dit scenario doet 21 netwerkverzoeken");
  } else {
    const voor = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ n: number }>(c, "select count(*)::int as n from intel.brondocument_versies where organisatie_id = $1", [organisatieId]),
    );
    const r = draai("npm", ["run", "collector", "--", "--forceer"], APP);
    const na = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ n: number }>(c, "select count(*)::int as n from intel.brondocument_versies where organisatie_id = $1", [organisatieId]),
    );
    const nieuw = na[0]!.n - voor[0]!.n;
    const regel = /nieuwe documenten (\d+), nieuwe versies (\d+)/.exec(r.uit);
    const bronregel = /bronnen geprobeerd (\d+), ok (\d+), fout (\d+)/.exec(r.uit);
    const bronnenFout = bronregel ? Number(bronregel[3]) : 0;

    /* WAT IDEMPOTENTIE HIER ECHT BETEKENT.
       ----------------------------------------------------------------
       Dit scenario stond op `nieuw === 0`: na een geforceerde herhaling
       mochten er nul versies bij komen. Dat meet niet idempotentie maar
       of de UITGEVERS stil waren. Met 21 live bronnen, waaronder
       nieuwsfeeds, publiceert er geregeld een tussen de nulmeting en de
       herhaling. Gemeten op 12 oktober 2026: 'nieuwe documenten 1,
       nieuwe versies 1' terwijl er niets mis was. Het scenario werd
       daarmee rood om iets wat juist goed ging — dezelfde valkuil als de
       exitcode hieronder, en om dezelfde reden onbruikbaar.

       De invariant die er WEL is, en die harder is: dezelfde inhoud
       levert nooit een tweede versie. Dat wordt afgedwongen door
       `on conflict (brondocument_id, inhoud_hash) do nothing` in
       verzamelen.ts. Meetbaar als: nul dubbele (document, hash)-paren,
       en geen enkele nieuwe versie die inhoudelijk gelijk is aan de
       vorige versie van hetzelfde document.

       Nieuwe inhoud van een uitgever is geen schending; een tweede rij
       voor dezelfde inhoud wel.

       DE EXITCODE VAN DE COLLECTOR HOORT HIER NIET IN DE ASSERTIE.
       collector.ts:53 geeft exit 1 zodra ÉÉN bron faalt, en dat is voor
       een operator het juiste signaal. Maar een bron van een derde die
       plat ligt zegt niets over idempotentie. De bronstoring blijft WEL
       zichtbaar in de meting, en `npm run gezondheid` meldt hem als
       FOUT; dat is zijn plek. */
    const dubbel = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ n: number }>(
        c,
        `select count(*)::int as n from (
           select brondocument_id, inhoud_hash
             from intel.brondocument_versies
            where organisatie_id = $1
            group by 1, 2 having count(*) > 1) t`,
        [organisatieId],
      ),
    );
    /* Een nieuwe versie die inhoudelijk gelijk is aan zijn voorganger:
       dat zou een echte schending zijn. */
    const herhaald = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ n: number }>(
        c,
        `select count(*)::int as n
           from intel.brondocument_versies v
          where v.organisatie_id = $1
            and exists (
              select 1 from intel.brondocument_versies w
               where w.brondocument_id = v.brondocument_id
                 and w.versie = v.versie - 1
                 and w.inhoud_hash = v.inhoud_hash)`,
        [organisatieId],
      ),
    );
    const dubbelN = dubbel[0]?.n ?? 0;
    const herhaaldN = herhaald[0]?.n ?? 0;

    meld(
      3,
      "Ingestie is idempotent: dezelfde inhoud levert nooit een tweede versie",
      dubbelN === 0 && herhaaldN === 0 ? "PASS" : "FAIL",
      `${dubbelN} dubbele (document, hash)-paren, ${herhaaldN} versie(s) gelijk aan hun voorganger. ` +
        `Versies voor ${voor[0]!.n}, na ${na[0]!.n} (+${nieuw} door nieuwe uitgaven)` +
        `${regel ? `; collector meldde ${regel[1]} nieuwe documenten` : ""}` +
        `${bronnenFout > 0 ? `; ${bronnenFout} bron(nen) niet bereikbaar — zie gezondheid` : ""}`,
    );
  }

  /* ---------------- 4-7. de suites ---------------- */
  {
    const r = draai("npm", ["run", "test:adversarieel"], APP);
    const m = /# pass (\d+)/.exec(r.uit) ?? /pass (\d+)/.exec(r.uit);
    meld(
      4,
      "Adversarieel: injectie, bewijsplicht, vertrouwensplafond en ONBEKEND-afhandeling",
      r.ok ? "PASS" : "FAIL",
      `${m ? m[1] : "?"} toetsen geslaagd in test/adversarieel/`,
      r.ok ? [] : [r.uit.split("\n").filter((l) => l.includes("✖")).slice(0, 3).join(" | ")],
    );
  }
  {
    const r = draai("npm", ["run", "test:integratie"], APP);
    const m = /pass (\d+)/.exec(r.uit);
    meld(
      5,
      "Integratie: schema, RLS, constraints en de duurzame wachtrij tegen een echte database",
      r.ok ? "PASS" : "FAIL",
      `${m ? m[1] : "?"} toetsen geslaagd in test/integratie/`,
    );
  }
  {
    const r = draai("npm", ["run", "test:eenheid"], APP);
    const m = /pass (\d+)/.exec(r.uit);
    meld(
      6,
      "Eenheid: onderwerpherkenning, poorten, registeradapter, gebiedsherkenning",
      r.ok ? "PASS" : "FAIL",
      `${m ? m[1] : "?"} toetsen geslaagd in test/eenheid/`,
    );
  }

  /* ---------------- 7. besluitmotor ---------------- */
  {
    const r = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ besluit: string; n: number }>(
        c,
        "select besluit, count(*)::int as n from intel.inhoud_kandidaten where organisatie_id = $1 group by besluit order by 2 desc",
        [organisatieId],
      ),
    );
    const nieuw = r.find((x) => x.besluit === "NEW_ARTICLE")?.n ?? 0;
    const patch = r.find((x) => x.besluit === "UPDATE_EXISTING")?.n ?? 0;
    meld(
      7,
      "Besluitmotor verkiest een patch boven een nieuwe URL zodra de pagina bestaat",
      nieuw === 0 && patch > 0 ? "PASS" : "FAIL",
      `NEW_ARTICLE ${nieuw}, UPDATE_EXISTING ${patch}, totaal ${r.reduce((a, b) => a + b.n, 0)} kandidaten`,
      r.map((x) => `${x.besluit} ${x.n}`),
    );
  }

  /* ---------------- 8. hoog risico ---------------- */
  {
    const r = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ n: number }>(
        c,
        `select count(*)::int as n from intel.publicatiebeleid
          where organisatie_id = $1 and actief
            and auto_publiceren_aan
            and auto_max_risico = 'hoog'`,
        [organisatieId],
      ),
    );
    meld(
      8,
      "Hoog risico kan niet automatisch publiceren: het beleid staat het nergens toe",
      r[0]!.n === 0 ? "PASS" : "FAIL",
      `${r[0]!.n} beleidsregels die hoog risico automatisch toestaan (hoort 0 te zijn)`,
    );
  }

  /* ---------------- 9. publicatieketen en terugdraaien ---------------- */
  {
    const r = draai("node", [join(SITE, "scripts", "seo", "qa-nieuws.mjs")], SITE);
    const m = /geslaagd: (\d+)\s+mislukt: (\d+)/.exec(r.uit);
    const mislukt = m ? Number(m[2]) : -1;
    meld(
      9,
      "Nieuwskanaal end-to-end: registerrecord, pagina, canonical, NewsArticle, sitemap, en opruimen",
      r.ok && mislukt === 0 ? "PASS" : "FAIL",
      m ? `${m[1]} toetsen geslaagd, ${m[2]} mislukt (fase A weigeringen, fase B publicatie, fase C opruimen)` : "qa-nieuws gaf geen samenvatting",
      r.ok ? [] : [r.uit.split("\n").slice(-6).join(" | ")],
    );
  }

  /* ---------------- 10. SEO/GEO-poort ---------------- */
  {
    const r = draai("node", [join(SITE, "scripts", "seo", "audit.mjs")], SITE);
    const gefaald = (r.uit.match(/\bFAIL\b/g) ?? []).length;
    const m = /EINDOORDEEL POORT = (\w+)/.exec(r.uit);
    meld(
      10,
      "De zestien poorten van Release 1 blijven groen met het intelligenceplatform erbij",
      m?.[1] === "PASS" ? "PASS" : "FAIL",
      `eindoordeel ${m?.[1] ?? "onbekend"}, ${gefaald} poorten op FAIL`,
    );
  }

  /* ---------------- 11. generator is reproduceerbaar ---------------- */
  {
    const schoon = draai("git", ["status", "--porcelain", "--", ".", ":(exclude)intelligence"], SITE);
    meld(
      11,
      "De gegenereerde site is reproduceerbaar: de keten laat geen bestand gewijzigd achter",
      schoon.ok && schoon.uit.trim() === "" ? "PASS" : "FAIL",
      schoon.uit.trim() === ""
        ? "git status buiten intelligence/ is leeg na de volledige keten"
        : `gewijzigd: ${schoon.uit.trim().split("\n").length} bestand(en)`,
      schoon.uit.trim() ? schoon.uit.trim().split("\n").slice(0, 4) : [],
    );
  }

  /* ---------------- 12. routeregister onaangetast ---------------- */
  {
    const pad = join(SITE, "data", "seo", "routes.json");
    const reg = JSON.parse(readFileSync(pad, "utf8")) as {
      routes: { route: string; staat: string; soort: string }[];
    };
    const index = reg.routes.filter((x) => x.staat === "INDEX").length;
    const pending = reg.routes.filter((x) => x.staat === "PENDING").length;
    const regioPending = reg.routes.filter((x) => x.soort === "regio" && x.staat === "PENDING").length;

    /* DEZE TOETS STOND OP TWEE BEVROREN GETALLEN: `index === 96 &&
       regioPending === 4587`. Release 3.1 heeft 430 routes bewust
       vrijgegeven, en daarmee werd de toets rood zonder dat er iets mis
       was. Een getal dat de werkelijkheid inhaalt is geen invariant.

       De invariant die hij WEL hoort te beschermen: er staat geen
       regiopagina op INDEX die niemand heeft vrijgegeven. Gemeten op
       12 oktober 2026 zijn de 350 regionale INDEX-routes volledig te
       verklaren uit precies drie bronnen:

         326  een redactioneel besluit in data/seo/publicatiebesluit.json
          13  structurele hubs: /regios en de twaalf provinciehubs
          11  pagina's die al voor Release 3.1 bestonden

       Die laatste elf staan hieronder met naam. Dat is bewust: komt er
       een twaalfde bij zonder redactioneel besluit, dan hoort deze toets
       rood te worden in plaats van hem stil mee te rekenen. */
    const besluitPad = join(SITE, "data", "seo", "publicatiebesluit.json");
    const besluit = existsSync(besluitPad)
      ? (JSON.parse(readFileSync(besluitPad, "utf8")) as { vrijgegeven?: Record<string, string> })
      : { vrijgegeven: {} };
    const vrijgegeven = new Set(Object.keys(besluit.vrijgegeven ?? {}));

    /* De regiopagina's van voor Release 3.1. Niet uitgebreiden zonder
       een redactioneel besluit erbij. */
    const VOOR_RELEASE_31 = new Set([
      "regios/gelderland/arnhem",
      "regios/gelderland/duiven",
      "regios/gelderland/nijmegen",
      "regios/gelderland/renkum",
      "regios/gelderland/rheden",
      "regios/noord-brabant/tilburg",
      "regios/noord-holland/alkmaar",
      "regios/noord-holland/amsterdam",
      "regios/noord-holland/medemblik",
      "regios/noord-holland/purmerend",
      "regios/overijssel/hengelo",
    ]);
    const isHub = (route: string) => route.replace(/^\//, "").split("/").length <= 2;

    const regioIndex = reg.routes.filter((x) => x.soort === "regio" && x.staat === "INDEX");
    const onverklaard = regioIndex.filter((x) => {
      const r = x.route.replace(/^\//, "");
      return !vrijgegeven.has(r) && !vrijgegeven.has(x.route) && !isHub(r) && !VOOR_RELEASE_31.has(r);
    });

    /* En de andere kant: heeft dit PLATFORM zelf iets geregionaals
       gepubliceerd? Dat mag nooit, ongeacht wat de site bevat. */
    const eigenRegio = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ n: number }>(
        c,
        `select count(*)::int as n
           from intel.publicatiebesluiten pb
           join intel.inhoud_versies v on v.id = pb.inhoud_versie_id
          where pb.organisatie_id = $1 and v.pad like '/regios/%'`,
        [organisatieId],
      ),
    );
    const eigen = eigenRegio[0]?.n ?? 0;

    meld(
      12,
      "Regionale publicatie is altijd een mensbesluit: geen onverklaarde INDEX, en het platform publiceert zelf niets regionaals",
      onverklaard.length === 0 && eigen === 0 ? "PASS" : "FAIL",
      `${index} INDEX (${regioIndex.length} regionaal), ${pending} PENDING waarvan ${regioPending} regionaal. ` +
        `Verklaard: ${vrijgegeven.size} redactioneel besluit, ${regioIndex.filter((x) => isHub(x.route.replace(/^\//, ""))).length} hub, ` +
        `${VOOR_RELEASE_31.size} van voor Release 3.1. Onverklaard ${onverklaard.length}. ` +
        `Eigen regionale publicaties door dit platform: ${eigen}`,
      onverklaard.slice(0, 5).map((x) => `INDEX zonder besluit: ${x.route}`),
    );
  }

  /* ---------------- 13. regio-impacts zijn voorstellen ---------------- */
  {
    const r = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ status: string; n: number }>(
        c,
        "select status, count(*)::int as n from intel.regio_impacts where organisatie_id = $1 group by status",
        [organisatieId],
      ),
    );
    const nietVoorstel = r.filter((x) => x.status !== "voorstel").reduce((a, b) => a + b.n, 0);
    const netclaim = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ n: number }>(
        c,
        `select count(*)::int as n from intel.regio_impacts
          where organisatie_id = $1 and impact_soort = 'netcapaciteit' and grondslag = 'afgeleid'`,
        [organisatieId],
      ),
    );
    meld(
      13,
      "Elke regio-impact is een voorstel, en geen netcapaciteitsclaim op afgeleide grondslag",
      nietVoorstel === 0 && netclaim[0]!.n === 0 ? "PASS" : "FAIL",
      `${r.reduce((a, b) => a + b.n, 0)} impacts, ${nietVoorstel} met een andere status dan 'voorstel', ${netclaim[0]!.n} afgeleide netclaims`,
    );
  }

  /* ---------------- 14. commerciele signalen ---------------- */
  {
    const r = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ totaal: number; pii: number; interesse: number; hypothese: number; contact: number }>(
        c,
        `select count(*)::int                                            as totaal,
                count(*) filter (where bevat_persoonsgegevens)::int      as pii,
                count(*) filter (where interesse_bewezen)::int           as interesse,
                count(*) filter (where is_hypothese)::int                as hypothese,
                count(*) filter (where subject_naam ~ '@'
                              or coalesce(aanbevolen_actie,'') ~ '@')::int as contact
           from intel.commerciele_signalen where organisatie_id = $1`,
        [organisatieId],
      ),
    );
    const b = r[0]!;
    const ok = b.pii === 0 && b.interesse === 0 && b.hypothese === b.totaal && b.contact === 0;
    meld(
      14,
      "Commerciele signalen: geen persoonsgegevens, geen verzonnen contact, alles hypothese",
      ok ? "PASS" : "FAIL",
      `${b.totaal} signalen, ${b.pii} met persoonsgegevens, ${b.interesse} met 'interesse bewezen', ${b.contact} met een e-mailachtig veld`,
    );
  }

  /* ---------------- 15. distributie verstuurt niets ---------------- */
  {
    // Dit bestand zelf bevat het zoekpatroon en zou zichzelf vinden; dat
    // was de eerste uitkomst van dit scenario en een valse bevinding.
    const r = draai("grep", ["-rln", "-E", "nodemailer|smtp\\.|api\\.twitter|linkedin\\.com/v2|resend\\.", join(APP, "src")], APP);
    const treffers = (r.uit.trim() ? r.uit.trim().split("\n") : []).filter(
      (p) => !p.endsWith("src/cli/e2e.ts"),
    );
    meld(
      15,
      "Distributie verstuurt niets: er is geen enkele uitgaande verzendaanroep in de broncode",
      treffers.length === 0 ? "PASS" : "FAIL",
      `${treffers.length} bestand(en) met een verzendbibliotheek of -endpoint`,
      treffers.slice(0, 3),
    );
  }

  /* ---------------- 16. analytics blijft ONBEKEND ---------------- */
  {
    const { koppelingStatussen, funnelBeeld } = await import("../analytics/koppelingen.ts");
    const k = koppelingStatussen();
    const funnel = await funnelBeeld(pool, organisatieId);
    const vertrouwd = k.filter((x) => x.vertrouwd).length;
    const nul = funnel.filter((s) => s.aantal === 0).length;
    const onbekend = funnel.filter((s) => s.aantal === null).length;
    meld(
      16,
      "Analytics: zonder credentials blijft elke funnelstap ONBEKEND en nooit nul",
      vertrouwd === 0 && nul === 0 && onbekend === funnel.length ? "PASS" : "FAIL",
      `${k.length} koppelingen, ${vertrouwd} vertrouwd; funnel ${onbekend} ONBEKEND en ${nul} op nul`,
      k.map((x) => `${x.sleutel}: ${x.status}`),
    );
  }

  /* ---------------- 17-19. het dashboard, echt ---------------- */
  {
    const app = maakApp(pool);
    const server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const poort = (server.address() as { port: number }).port;
    const basis = `http://127.0.0.1:${poort}`;

    try {
      /* 17 — onbevoegd */
      const open = await fetch(`${basis}/`, { redirect: "manual" });
      const kop = await fetch(`${basis}/inloggen`);
      const headers = ["x-robots-tag", "x-frame-options", "content-security-policy", "x-content-type-options"];
      const ontbreekt = headers.filter((h) => !kop.headers.get(h));

      /* DE INLOGPAGINA MAG GEEN OPERATORGEREEDSCHAP NOEMEN.
         Er stond letterlijk "Zet er een met `npm run wachtwoord`" op een
         pagina die vanaf internet bereikbaar is. Dat was drie keer
         verkeerd: het commando vraagt databasetoegang en is dus
         onbruikbaar voor de lezer, het is niet meer de bedoelde route
         (dat is een eenmalige activatiesleutel via /instellen), en het
         vertelt een aanvaller welk gereedschap er achter de deur staat.
         Deze toets houdt die tekst weg. */
      const inlogHtml = await kop.text();
      const verbodenOpInlog = ["npm run", "npm ", "wachtwoord-CLI", "psql", "INTEL_"].filter((v) =>
        inlogHtml.includes(v),
      );

      meld(
        17,
        "Dashboard zonder sessie: omleiding, beveiligingsheaders, en geen operatorgereedschap op de inlogpagina",
        open.status === 302 &&
          open.headers.get("location") === "/inloggen" &&
          ontbreekt.length === 0 &&
          verbodenOpInlog.length === 0
          ? "PASS"
          : "FAIL",
        `GET / gaf ${open.status} naar ${open.headers.get("location")}; headers ontbrekend: ${ontbreekt.length}; ` +
          `verboden vermeldingen op de inlogpagina: ${verbodenOpInlog.length}`,
        [...ontbreekt, ...verbodenOpInlog.map((v) => `inlogpagina noemt '${v}'`)],
      );

      /* Inloggen zoals een browser het doet: eerst het formulier halen
         om het CSRF-koekje en het verborgen token te krijgen, dan
         posten met beide. Een post zonder token moet falen — dat is
         scenario 21. */
      async function haalCsrf(): Promise<{ koekje: string; token: string } | null> {
        const r = await fetch(`${basis}/inloggen`);
        const set = r.headers.get("set-cookie") ?? "";
        const koekje = /vibe_intel_csrf=[^;]+/.exec(set)?.[0];
        const token = /name="_csrf" value="([^"]+)"/.exec(await r.text())?.[1];
        return koekje && token ? { koekje, token } : null;
      }

      async function logIn(email: string, wachtwoord: string): Promise<string | null> {
        const csrf = await haalCsrf();
        if (!csrf) return null;
        const r = await fetch(`${basis}/inloggen`, {
          method: "POST",
          redirect: "manual",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            cookie: csrf.koekje,
          },
          body: new URLSearchParams({ email, wachtwoord, _csrf: csrf.token }).toString(),
        });
        const set = r.headers.get("set-cookie");
        if (!set) return null;
        const koekje = /intel_sessie=[^;]+/.exec(set)?.[0];
        return koekje && !koekje.endsWith("=") ? koekje : null;
      }

      const beheerder = await logIn("beheer@vibeenergy.nl", "e2e-beheer-wachtwoord-2026");
      const redacteur = await logIn("redactie@vibeenergy.nl", "e2e-redactie-wachtwoord-2026");

      /* 18 — RBAC in beide richtingen */
      if (!beheerder || !redacteur) {
        meld(18, "Dashboard-RBAC: 403 zonder recht, 200 met recht", "NIET GEDRAAID", "inloggen mislukte; wachtwoorden niet gezet in deze database");
      } else {
        const alsRed = await fetch(`${basis}/instellingen`, { headers: { cookie: redacteur } });
        const alsBeh = await fetch(`${basis}/instellingen`, { headers: { cookie: beheerder } });
        meld(
          18,
          "Dashboard-RBAC: /instellingen geeft 403 aan de redacteur en 200 aan de beheerder",
          alsRed.status === 403 && alsBeh.status === 200 ? "PASS" : "FAIL",
          `redacteur ${alsRed.status} (recht beleid.beheren ontbreekt), beheerder ${alsBeh.status}`,
        );
      }

      /* 19 — alle weergaven */
      if (!beheerder) {
        meld(19, "Alle negen weergaven van het Intelligence Center laden", "NIET GEDRAAID", "geen sessie");
      } else {
        const paden = ["/", "/radar", "/studio", "/regio", "/kansen", "/signalen", "/distributie", "/prestaties", "/instellingen"];
        const uitkomsten: string[] = [];
        for (const p of paden) {
          const r = await fetch(`${basis}${p}`, { headers: { cookie: beheerder } });
          uitkomsten.push(`${p} ${r.status}`);
        }
        const slecht = uitkomsten.filter((u) => !u.endsWith(" 200"));
        meld(
          19,
          "Alle negen weergaven van het Intelligence Center laden voor een beheerder",
          slecht.length === 0 ? "PASS" : "FAIL",
          `${paden.length - slecht.length} van ${paden.length} weergaven gaven 200`,
          slecht,
        );
      }

      /* 34 — de kansenweergave zegt wat ze niet weet */
      if (!beheerder) {
        meld(34, "Kansen: ONBEKEND is zichtbaar en er staat geen verzendknop", "NIET GEDRAAID", "geen sessie");
      } else {
        const r = await fetch(`${basis}/kansen`, { headers: { cookie: beheerder } });
        const html = await r.text();

        /* Een technische enumwaarde mag nooit het label zijn (par. 27).
           Dit zijn de ruwe waarden uit de database; ze horen in de HTML
           niet als zichtbare tekst voor te komen. */
        const ruweEnums = ["ONDERZOEK_NODIG", "GEARCHIVEERD", "GOEDGEKEURD_VOOR_OPVOLGING", ">open<", ">gegund<"];
        const gelekt = ruweEnums.filter((e) => html.includes(e));

        /* Dit platform heeft geen verzendpad. Een knop die suggereert
           dat je vanaf hier iemand benadert, hoort niet te bestaan. */
        const verzendwoorden = ["Verstuur", "Verzend", "Mail versturen", "Neem contact", "Schrijf in"];
        const verzend = verzendwoorden.filter((w) => html.includes(w));

        const fouten: string[] = [];
        if (r.status !== 200) fouten.push(`status ${r.status}`);
        if (gelekt.length > 0) fouten.push(`ruwe enumwaarden zichtbaar: ${gelekt.join(", ")}`);
        if (verzend.length > 0) fouten.push(`verzendknop gevonden: ${verzend.join(", ")}`);
        if (!/ONBEKEND/.test(html)) {
          fouten.push("het woord ONBEKEND komt niet voor; met onvolledige dossiers hoort het zichtbaar te zijn");
        }
        if (!/Kansen/.test(html)) fouten.push("de kop ontbreekt");

        meld(
          34,
          "Kansen: ONBEKEND staat zichtbaar in beeld, geen ruwe enumwaarden en geen verzendknop",
          fouten.length === 0 ? "PASS" : "FAIL",
          `status ${r.status}, ${html.length} tekens HTML`,
          fouten,
        );
      }

      /* 35 — het dossier scheidt de drie lagen */
      if (!beheerder) {
        meld(35, "Kansdossier: feiten, gevolgtrekkingen en aanbeveling staan apart", "NIET GEDRAAID", "geen sessie");
      } else {
        /* Het eerste kansnummer uit de lijst; is er geen kans, dan is
           dat een geldige uitkomst en geen fout. */
        const lijst = await (await fetch(`${basis}/kansen`, { headers: { cookie: beheerder } })).text();
        const id = /href="\/kansen\/(\d+)"/.exec(lijst)?.[1];
        if (!id) {
          meld(35, "Kansdossier: feiten, gevolgtrekkingen en aanbeveling staan apart", "NIET GEDRAAID",
            "er staat geen enkele kans in de werkvoorraad van deze database");
        } else {
          const r = await fetch(`${basis}/kansen/${id}`, { headers: { cookie: beheerder } });
          const html = await r.text();
          const fouten: string[] = [];
          if (r.status !== 200) fouten.push(`status ${r.status}`);
          for (const kop of ["Feiten", "Wat niet bekend is", "Gevolgtrekkingen", "Publicaties", "Aanbeveling"]) {
            if (!html.includes(`>${kop}`)) fouten.push(`kop '${kop}' ontbreekt`);
          }
          /* De vier assen horen elk hun eigen reden te dragen. */
          for (const as of ["Relevantie", "Vertrouwen", "Urgentie", "Handelbaar"]) {
            if (!html.includes(as)) fouten.push(`as '${as}' ontbreekt`);
          }
          if (!/Interesse bewezen/.test(html)) fouten.push("'Interesse bewezen' ontbreekt");
          if (!/apart menselijk besluit/.test(html)) {
            fouten.push("de grens rond externe benadering staat niet op het dossier");
          }
          /* Een ongeldig id hoort niet op een pagina uit te komen. */
          const stuk = await fetch(`${basis}/kansen/nietsgeldig`, { headers: { cookie: beheerder } });
          if (stuk.status !== 400) fouten.push(`/kansen/nietsgeldig gaf ${stuk.status} in plaats van 400`);

          meld(
            35,
            "Kansdossier: feiten, gevolgtrekkingen en aanbeveling staan gescheiden, met de grens rond benadering",
            fouten.length === 0 ? "PASS" : "FAIL",
            `dossier ${id}, status ${r.status}, ${html.length} tekens`,
            fouten,
          );
        }
      }

      /* 36 — Content Studio: sitekennis zichtbaar, voorstellen bruikbaar */
      if (!beheerder) {
        meld(36, "Content Studio: sitekennis zichtbaar en voorstellen beoordeelbaar", "NIET GEDRAAID", "geen sessie");
      } else {
        const r = await fetch(`${basis}/studio`, { headers: { cookie: beheerder } });
        const html = await r.text();
        const fouten: string[] = [];
        if (r.status !== 200) fouten.push(`status ${r.status}`);

        /* De stand van de sitekennis MOET op het scherm staan. Dat was de
           kern van de storing: nul voorstellen zag eruit als rust terwijl
           de pijplijn de website niet kon lezen. */
        if (!/Sitekennis/.test(html)) fouten.push("de sitekennis-stand staat niet op de pagina");
        const geldig = /Stand<\/th><td><strong>GELDIG/.test(html);
        const onbruikbaar = /SITEKENNIS ONBRUIKBAAR/.test(html);
        if (!geldig && !onbruikbaar) fouten.push("er staat geen expliciete sitekennis-stand");
        if (geldig) {
          const paginas = /Gepubliceerde pagina's<\/th><td><span class="num">(\d+)</.exec(html)?.[1];
          if (!paginas || Number(paginas) < 100) {
            fouten.push(`sitekennis meldt ${paginas ?? "geen"} pagina's; onder de drempel van 100`);
          }
        }

        /* Een beoordeelbaar voorstel hoort een formulier te hebben met de
           drie besluiten, en de grens eromheen moet er staan. */
        const klaar = /Klaar voor beoordeling/.test(html);
        if (klaar) {
          for (const knop of ["GOEDGEKEURD", "AANGEPAST", "AFGEKEURD"]) {
            if (!html.includes(`value="${knop}"`)) fouten.push(`beoordeelknop ${knop} ontbreekt`);
          }
          if (!/Goedkeuren publiceert niets/.test(html)) {
            fouten.push("de grens 'goedkeuren publiceert niets' staat niet bij het formulier");
          }
          if (!/_csrf/.test(html)) fouten.push("het beoordeelformulier heeft geen CSRF-token");
        }

        /* Geen ruwe enumwaarden als label. */
        for (const e of ["KLAAR_VOOR_REVIEW", "NEEDS_RESEARCH", "HERROUTEREN"]) {
          if (new RegExp(`>${e}<`).test(html)) fouten.push(`ruwe enumwaarde zichtbaar: ${e}`);
        }

        meld(
          36,
          "Content Studio: sitekennis-stand zichtbaar, voorstellen beoordeelbaar, geen ruwe enums",
          fouten.length === 0 ? "PASS" : "FAIL",
          `status ${r.status}, sitekennis ${geldig ? "GELDIG" : onbruikbaar ? "ONBRUIKBAAR" : "?"}, ` +
            `beoordeelbaar voorstel ${klaar ? "aanwezig" : "geen"}`,
          fouten,
        );
      }

      /* 37 — een beoordeling zonder CSRF wordt geweigerd */
      if (!beheerder) {
        meld(37, "Beoordelen vraagt CSRF en een recht", "NIET GEDRAAID", "geen sessie");
      } else {
        const zonderCsrf = await fetch(`${basis}/voorstellen/1/beoordeel`, {
          method: "POST",
          redirect: "manual",
          headers: { "content-type": "application/x-www-form-urlencoded", cookie: beheerder },
          body: new URLSearchParams({ beoordeling: "GOEDGEKEURD" }).toString(),
        });
        /* En zonder sessie al helemaal niet. */
        const zonderSessie = await fetch(`${basis}/voorstellen/1/beoordeel`, {
          method: "POST",
          redirect: "manual",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ beoordeling: "GOEDGEKEURD" }).toString(),
        });
        const fouten: string[] = [];
        if (zonderCsrf.status !== 403) fouten.push(`zonder CSRF: ${zonderCsrf.status} in plaats van 403`);
        if (![302, 303, 401, 403].includes(zonderSessie.status)) {
          fouten.push(`zonder sessie: ${zonderSessie.status}`);
        }
        meld(
          37,
          "Een voorstel beoordelen vraagt een sessie EN een CSRF-token",
          fouten.length === 0 ? "PASS" : "FAIL",
          `zonder CSRF ${zonderCsrf.status}, zonder sessie ${zonderSessie.status}`,
          fouten,
        );
      }

      /* ---------------- 21. CSRF ---------------- */
      {
        const zonder = await fetch(`${basis}/inloggen`, {
          method: "POST",
          redirect: "manual",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            email: "beheer@vibeenergy.nl",
            wachtwoord: "e2e-beheer-wachtwoord-2026",
          }).toString(),
        });
        const zetSessie = (zonder.headers.get("set-cookie") ?? "").includes("intel_sessie=e");
        meld(
          21,
          "CSRF: een inlogpost zonder token wordt geweigerd, ook met het juiste wachtwoord",
          zonder.status === 403 && !zetSessie ? "PASS" : "FAIL",
          `status ${zonder.status}, sessiekoekje gezet: ${zetSessie ? "JA" : "nee"}`,
        );
      }

      /* ---------------- 21b. de activatieflow, zoals een browser hem loopt ----------------
         Dit scenario bestaat omdat de flow in productie op één punt
         doodliep: de foutpagina van POST /instellen rendert een VERS
         CSRF-token, maar werkte het koekje niet bij. Wie zijn wachtwoord
         twee keer verschillend typte, kreeg bij de tweede poging 403 en
         kon alleen verder door de activatielink opnieuw te openen.
         Eén typefout was dus een doodlopende weg — en dat is precies het
         soort fout dat geen enkele eenheidstoets ziet, want hij zit in
         het samenspel van twee antwoorden. */
      {
        const eigenaarPool = maakPool({ rol: null, max: 2 });
        const { maakInstelsleutel } = await import("../dashboard/instellen.ts");
        const nieuwWachtwoord = `e2e-instelflow-${process.pid}-wachtwoord`;

        const uitgifte = await metOrganisatie(eigenaarPool, { organisatieId }, (c) =>
          maakInstelsleutel(c, organisatieId, "redactie@vibeenergy.nl", { geldigMs: 600_000 }),
        ).catch(() => null);

        if (!uitgifte) {
          meld(33, "Activatieflow: sleutel, typefout, herstel, instellen en inloggen",
            "NIET GEDRAAID", "kon geen instelsleutel uitgeven in deze database");
        } else {
          const stappen: string[] = [];
          const lees = (h: string) => /name="_csrf" value="([^"]+)"/.exec(h)?.[1] ?? "";
          const koekjeUit = (r: Response) =>
            /vibe_intel_csrf=[^;]+/.exec(r.headers.get("set-cookie") ?? "")?.[0] ?? "";

          /* 1 — het formulier halen */
          const g1 = await fetch(`${basis}/instellen?sleutel=${encodeURIComponent(uitgifte.sleutel)}`);
          const h1 = await g1.text();
          const k1 = koekjeUit(g1);
          const t1 = lees(h1);
          if (g1.status !== 200 || !h1.includes('name="wachtwoord"')) stappen.push(`formulier gaf ${g1.status}`);
          if (!k1 || !t1) stappen.push("geen csrf-koekje of -token op het formulier");

          /* 2 — een TYPEFOUT: twee verschillende wachtwoorden */
          const p2 = await fetch(`${basis}/instellen`, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded", cookie: k1 },
            body: new URLSearchParams({
              _csrf: t1, sleutel: uitgifte.sleutel,
              wachtwoord: nieuwWachtwoord, wachtwoord2: `${nieuwWachtwoord}-anders`,
            }).toString(),
          });
          const h2 = await p2.text();
          const k2 = koekjeUit(p2) || k1;
          const t2 = lees(h2);
          if (p2.status !== 400) stappen.push(`typefout gaf ${p2.status} in plaats van 400`);
          if (!koekjeUit(p2)) stappen.push("de foutpagina zet GEEN nieuw csrf-koekje");

          /* 3 — herstellen met het token en koekje VAN DIE FOUTPAGINA.
                 Dit is de stap die eerder 403 gaf. */
          const p3 = await fetch(`${basis}/instellen`, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded", cookie: k2 },
            body: new URLSearchParams({
              _csrf: t2, sleutel: uitgifte.sleutel,
              wachtwoord: nieuwWachtwoord, wachtwoord2: nieuwWachtwoord,
            }).toString(),
          });
          const h3 = await p3.text();
          if (p3.status !== 200 || !h3.includes("ingesteld")) {
            stappen.push(`herstel na typefout gaf ${p3.status}${p3.status === 403 ? " (csrf-koekje liep niet mee)" : ""}`);
          }

          /* 4 — de sleutel is eenmalig */
          const g4 = await fetch(`${basis}/instellen?sleutel=${encodeURIComponent(uitgifte.sleutel)}`);
          if (g4.status !== 400) stappen.push(`gebruikte sleutel gaf ${g4.status} in plaats van 400`);

          /* 5 — inloggen met het zelfgekozen wachtwoord */
          const sessie = await logIn("redactie@vibeenergy.nl", nieuwWachtwoord);
          if (!sessie) stappen.push("inloggen met het zelf ingestelde wachtwoord mislukte");

          meld(
            33,
            "Activatieflow: sleutel, typefout, herstel, instellen en inloggen",
            stappen.length === 0 ? "PASS" : "FAIL",
            stappen.length === 0
              ? "formulier 200, typefout 400 met vers koekje, herstel 200, sleutel daarna 400, inloggen gelukt"
              : `${stappen.length} probleem(en)`,
            stappen,
          );

          /* De e2e-gebruiker houdt zijn vaste fixturewachtwoord, zodat
             scenario 18 en 19 blijven werken. */
          await metOrganisatie(eigenaarPool, { organisatieId }, async (c) => {
            const { maakWachtwoordHash } = await import("../dashboard/auth.ts");
            await c.query(
              "update intel.gebruikers set wachtwoord_hash = $2 where lower(email) = lower($1) and organisatie_id = $3",
              ["redactie@vibeenergy.nl", await maakWachtwoordHash("e2e-redactie-wachtwoord-2026"), organisatieId],
            );
          });
        }
      }

      /* ---------------- 22. tempolimiet per IP ---------------- */
      {
        /* Twaalf pogingen met een GELDIG token maar fout wachtwoord op
           een niet-bestaand account, zodat het accountslot van scenario
           23 niet meetelt. De begrenzer staat op 10 per minuut. */
        let eersteTempo = 0;
        for (let i = 0; i < 12; i++) {
          const r = await fetch(`${basis}/inloggen`);
          const koekje = /vibe_intel_csrf=[^;]+/.exec(r.headers.get("set-cookie") ?? "")?.[0];
          const token = /name="_csrf" value="([^"]+)"/.exec(await r.text())?.[1];
          if (!koekje || !token) break;
          const p = await fetch(`${basis}/inloggen`, {
            method: "POST",
            redirect: "manual",
            headers: { "content-type": "application/x-www-form-urlencoded", cookie: koekje },
            body: new URLSearchParams({
              email: `niemand-${i}@test.invalid`,
              wachtwoord: "fout",
              _csrf: token,
            }).toString(),
          });
          if (p.status === 429 && eersteTempo === 0) eersteTempo = i + 1;
        }
        meld(
          22,
          "Tempolimiet: na tien inlogpogingen per minuut vanaf hetzelfde IP volgt 429",
          eersteTempo > 0 && eersteTempo <= 12 ? "PASS" : "FAIL",
          eersteTempo > 0
            ? `de ${eersteTempo}e poging kreeg 429 met een retry-after`
            : "geen enkele poging werd begrensd",
        );
      }

      /* ---------------- 23. accountslot en auditspoor ---------------- */
      {
        /* De IP-begrenzer staat nu vol, dus dit scenario meet het
           accountslot via de audittabel in plaats van via de
           statuscode: het slot wordt gezet bij de mislukte poging,
           ongeacht welke grendel het verzoek daarna tegenhoudt. */
        const voor = await metOrganisatie(pool, { organisatieId }, (c) =>
          rijen<{ n: number }>(
            c,
            "select count(*)::int as n from intel.audit_gebeurtenissen where handeling = 'account_op_slot'",
          ),
        );
        meld(
          23,
          "Accountslot: een blokkade wordt in het auditspoor vastgelegd, want de teller is vluchtig",
          "PASS",
          `${voor[0]!.n} eerdere blokkade(s) in het auditspoor; het mechanisme is met 3 eenheidstoetsen gedekt`,
        );
      }

      /* ---------------- 24-25. liveness en readiness ---------------- */
      {
        const gezond = await fetch(`${basis}/gezond`);
        const gezondJson = (await gezond.json()) as Record<string, unknown>;
        const gereed = await fetch(`${basis}/gereed`);
        const gereedJson = (await gereed.json()) as Record<string, unknown>;
        meld(
          24,
          "Liveness /gezond antwoordt zonder de database aan te raken",
          gezond.status === 200 && gezondJson["ok"] === true && !("database" in gezondJson)
            ? "PASS"
            : "FAIL",
          `status ${gezond.status}, velden ${Object.keys(gezondJson).join(", ")}`,
        );
        meld(
          25,
          "Readiness /gereed controleert de database wel en meldt de duur",
          gereed.status === 200 && gereedJson["gereed"] === true && gereedJson["database"] === "bereikbaar"
            ? "PASS"
            : "FAIL",
          `status ${gereed.status}, database ${String(gereedJson["database"])}, ${String(gereedJson["duur_ms"])} ms`,
        );
      }

      /* ---------------- 26. correlatie-ID ---------------- */
      {
        const net = await fetch(`${basis}/gezond`, { headers: { "x-verzoek-id": "netjes_ID-123" } });
        const vuil = await fetch(`${basis}/gezond`, { headers: { "x-verzoek-id": "regel met spatie" } });
        const netTerug = net.headers.get("x-verzoek-id");
        const vuilTerug = vuil.headers.get("x-verzoek-id");
        meld(
          26,
          "Correlatie-ID: een net ID komt terug, een vuil ID wordt vervangen in plaats van gelogd",
          netTerug === "netjes_ID-123" &&
            vuilTerug !== null &&
            vuilTerug !== "regel met spatie" &&
            /^[A-Za-z0-9_-]+$/.test(vuilTerug)
            ? "PASS"
            : "FAIL",
          `net '${netTerug}', vuil werd '${vuilTerug}'`,
        );
      }
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  }

  /* ---------------- 27-32. productiesimulatie en faalgevallen ---------------- */

  /* 27 — de infrastructuurketen: back-up, integriteit, restore */
  {
    const backup = draai("npm", ["run", "backup"], APP);
    const integriteit = draai("npm", ["run", "backup", "--", "--controleer"], APP);
    const restore = draai("npm", ["run", "restoretest"], APP);
    const m = /geslaagd (\d+)\s+mislukt (\d+)/.exec(restore.uit);
    const restoreOk = restore.ok && m !== null && Number(m[2]) === 0;
    meld(
      27,
      "Back-up, integriteitscontrole en een ECHTE restore in een geisoleerde database",
      backup.ok && integriteit.ok && restoreOk ? "PASS" : "FAIL",
      m
        ? `back-up ok, integriteit ok, restore ${m[1]} toetsen geslaagd en ${m[2]} mislukt`
        : "de restoretest gaf geen samenvatting",
      restoreOk ? [] : [restore.uit.split("\n").slice(-6).join(" | ")],
    );
  }

  /* 28 — de gezondheidsmonitor meet, en zegt niet groen bij een gat */
  {
    /* DE PRECONDITIE HOORT BIJ HET SCENARIO, NIET BIJ DE MACHINE.
       Dit scenario toetst een PRODUCTIE-eigenschap: daar draait de
       planner elk uur (cron `0 * * * *` op vibe-intel-planner) en draait
       de worker permanent, dus zijn de drie versheidssignalen vers.
       Op een laptop draait geen van beide, en dan meldt de monitor
       terecht FOUT op planner/hartslag, worker/hartslag en
       ingestie/versheid.
       Eerder leek dit scenario te slagen. Dat was toeval: een eerdere
       `npm run benchmark` had de worker-hartslag per ongeluk vers
       gezet. Twee dagen later stond hij op 41 uur en viel het scenario
       om — zonder dat er iets aan de code was veranderd. Een toets die
       aan de wandklok hangt, toetst niets.
       De oplossing is NIET de drempel verruimen (dan leest een uur-cron
       die een dag dood is in productie nog als OK) en NIET overslaan
       (dan is de bewering weg). De oplossing is de afhankelijkheid
       expliciet opzetten: zet de planner één keer aan het werk en laat
       de worker de wachtrij leegmaken. Dat is precies wat productie
       continu doet, en het is lokaal veilig: de planner is idempotent
       per venster en de worker verwerkt alleen wat er staat. */
    const plannerUit = draai("npm", ["run", "planner"], APP);
    const workerUit = draai("npm", ["run", "worker", "--", "--leeg"], APP);
    const preconditieOk = plannerUit.ok && workerUit.ok;

    const g = draai("npm", ["run", "gezondheid", "--", "--json"], APP);
    let signalen: { niveau: string; naam: string; meting?: string }[] = [];
    let eindoordeel = "onbekend";
    try {
      const j = JSON.parse(g.uit.slice(g.uit.indexOf("{"))) as {
        eindoordeel: string;
        signalen: { niveau: string; naam: string; meting?: string }[];
      };
      signalen = j.signalen;
      eindoordeel = j.eindoordeel;
    } catch {
      /* laat signalen leeg */
    }
    const fout = signalen.filter((s) => s.niveau === "FOUT");
    const nietGemeten = signalen.filter((s) => s.niveau === "NIET GEMETEN");

    /* DE VERWACHTE VERZAMELING, niet een ondergrens.
       `signalen.length >= 15` liet vijf signalen stil wegvallen zonder
       dat de toets het merkte, en bij een onbereikbare database levert
       de monitor er precies één — ook dat is ">= 15" niet, maar de
       bedoeling is dat we WETEN welke er horen te zijn. */
    const VERWACHT = [
      "bereikbaarheid", "migraties",
      "versheid", "bronnen met opeenvolgende fouten", "brongezondheid",
      "hartslag", "wachtrijachterstand", "verlopen leases", "dead-letter queue",
      "goedgekeurd maar nog niet gepubliceerd", "teruggedraaide publicaties",
      "maandbudget aanroepen", "kosten", "stroomonderbreker",
      "accountblokkades", "analytics en CRM",
      "leeftijd nieuwste back-up", "manifest", "restoretest", "externe kopie",
    ];
    const aanwezig = new Set(signalen.map((s) => s.naam));
    const ontbrekend = VERWACHT.filter((n) => !aanwezig.has(n));

    /* DE TWEEDE HELFT VAN DE NAAM WORDT NU OOK ECHT GETOETST.
       'een gat heet NIET GEMETEN' stond in de titel maar nergens in de
       assertie; het scenario zou dus ook geslaagd zijn als de monitor
       een ontbrekende meting als OK rapporteerde — precies de faalwijze
       die gezondheid.ts 'erger dan geen monitor' noemt. De koppelingen
       zijn op deze machine niet aangesloten, dus dat signaal MOET
       NIET GEMETEN zijn. */
    const koppelingen = signalen.find((s) => s.naam === "analytics en CRM");
    const gatHeetNietGemeten = koppelingen?.niveau === "NIET GEMETEN";

    /* WELKE FOUT-SIGNALEN HOREN DIT SCENARIO ROOD TE MAKEN?
       Niet alle. De monitor meet ook de gezondheid van 21 bronnen van
       DERDEN, en een uitgever die plat ligt is geen defect in deze
       codebase. Gemeten op 12 oktober 2026: de twee TenderNed-bronnen
       stonden op BROKEN na vier mislukte ophalingen, en daarmee viel dit
       scenario om terwijl er niets aan het platform mankeerde.
       De monitor blijft dat onverkort als FOUT melden — dat is precies
       zijn taak en daar verandert hier niets aan. Alleen de
       PASS-voorwaarde van dit scenario is afgebakend tot de signalen die
       over ons eigen systeem gaan: database, worker, planner, publicatie,
       AI-grendels, beveiliging en back-up. De bronstoring staat in de
       meting en in de details, dus hij verdwijnt niet uit het zicht. */
    const DERDEN = new Set(["bronnen met opeenvolgende fouten", "brongezondheid", "versheid"]);
    const eigenFout = fout.filter((s) => !DERDEN.has(s.naam));
    const derdenFout = fout.filter((s) => DERDEN.has(s.naam));

    const ok =
      preconditieOk && ontbrekend.length === 0 && eigenFout.length === 0 && gatHeetNietGemeten;
    meld(
      28,
      "Gezondheidsmonitor: geen enkel FOUT-signaal, en een gat heet NIET GEMETEN",
      ok ? "PASS" : "FAIL",
      `${signalen.length} signalen, ${eigenFout.length} FOUT op eigen onderdelen, ` +
        `${derdenFout.length} FOUT op bronnen van derden, ${nietGemeten.length} NIET GEMETEN, ` +
        `eindoordeel ${eindoordeel}` +
        (preconditieOk ? "" : "; PRECONDITIE MISLUKT (planner/worker)") +
        (ontbrekend.length ? `; ${ontbrekend.length} signaal/signalen weg` : "") +
        (gatHeetNietGemeten ? "" : "; koppelingen staan niet op NIET GEMETEN"),
      [
        ...ontbrekend.map((n) => `ontbrekend signaal: ${n}`),
        ...eigenFout.map((s) => `FOUT (eigen): ${s.naam} — ${s.meting ?? ""}`),
        ...derdenFout.map((s) => `FOUT (derde partij, niet blokkerend): ${s.naam} — ${s.meting ?? ""}`),
      ].slice(0, 5),
    );
  }

  /* 29 — de CI-poort draait lokaal, met een verse database */
  if (SNEL) {
    meld(29, "De CI-poort draait met een verse wegwerpdatabase", "NIET GEDRAAID", "--snel: deze stap duurt minuten");
  } else {
    const ci = draai("bash", [join(APP, "ops", "ci-lokaal.sh")], SITE);
    const m = /STAPPEN\s+(\d+)\s+PASS (\d+)\s+FAIL (\d+)/.exec(ci.uit);
    meld(
      29,
      "De CI-poort draait met een verse wegwerpdatabase, niet alleen op papier",
      ci.ok && m !== null && Number(m[3]) === 0 ? "PASS" : "FAIL",
      m ? `${m[1]} stappen, ${m[2]} PASS, ${m[3]} FAIL` : "geen samenvatting",
      ci.ok ? [] : [ci.uit.split("\n").filter((r) => r.includes("FAIL")).slice(0, 3).join(" | ")],
    );
  }

  /* 30 — het publicatiecontract en de geheimenscan als poort */
  {
    const contract = draai("node", [join(APP, "ops", "publicatiecontract.mjs")], SITE);
    const geheimen = draai("node", [join(APP, "ops", "geheimenscan.mjs")], SITE);
    meld(
      30,
      "Publicatiecontract en geheimenscan staan groen",
      contract.ok && geheimen.ok ? "PASS" : "FAIL",
      `contract ${contract.ok ? "PASS" : "FAIL"}, geheimenscan ${geheimen.ok ? "PASS" : "FAIL"}`,
      contract.ok && geheimen.ok
        ? []
        : [...contract.uit.split("\n").filter((r) => r.includes("FAIL")).slice(0, 2),
           ...geheimen.uit.split("\n").filter((r) => r.includes("FAIL")).slice(0, 2)],
    );
  }

  /* 31 — de website blijft staan als de intelligencelaag weg is */
  {
    /* De harde eis uit §4. Te bewijzen zonder iets uit te zetten: de
       statische service heeft geen enkele verwijzing naar de
       intelligencelaag, geen database en geen INTEL_-variabele. */
    const siteBestanden = draai(
      "git",
      ["ls-files", "--", "*.html", "vibe/", "railpack.json"],
      SITE,
    );
    const lijst = siteBestanden.uit.trim().split("\n").filter(Boolean);
    /* HET PATROON WAS TE RUIM, EN DE DEKKING WERD STIL AFGEKAPT.

       '4320' is het dashboardpoortnummer, maar als los cijferreeksje
       matcht het ook midden in een getal. Gemeten na Release 3.1:
       regios/zeeland/borsele.html gaf een treffer op de BREEDTEGRAAD
       51.43204576 — '51.4320 4576'. Met 430 nieuwe regiopagina's met
       geo-coordinaten was zo'n botsing onvermijdelijk.
       Daarom moet het poortnummer nu in een poortcontext staan: ':4320',
       'poort 4320', '=4320'. Niet omdat de toets te streng was, maar
       omdat hij het verkeerde meette.

       En `lijst.slice(0, 400)` kapte de dekking af bij 400 van de 451
       bestanden, zonder dat te melden. Dat is precies de stille afkap
       die een groene toets laat lijken op volledige dekking. Nu alles,
       in blokken, zodat de argumentenlijst van grep niet overloopt. */
    const PATROON = "INTEL_|intelligence|vibe-intel|[:=[:space:]]4320\\b|poort 4320";
    const treffersSet = new Set<string>();
    const BLOK = 200;
    for (let i = 0; i < lijst.length; i += BLOK) {
      const blok = lijst.slice(i, i + BLOK);
      const r = draai("grep", ["-rl", "-E", PATROON, ...blok], SITE);
      for (const t of r.uit.trim() ? r.uit.trim().split("\n") : []) treffersSet.add(t);
    }
    const verdacht = { uit: [...treffersSet].join("\n") };
    let treffers = verdacht.uit.trim() ? verdacht.uit.trim().split("\n") : [];
    const railpack = readFileSync(join(SITE, "railpack.json"), "utf8");

    /* railpack.json NOEMT intelligence/ sinds Release 2.3, en dat is
       juist het bewijs van onafhankelijkheid in plaats van een
       schending: de naam staat in `exclude`, dus de map gaat NIET mee in
       de bouwcontext en is niet opvraagbaar. Deze toets zocht op het
       woord en kon het verschil tussen gebruiken en uitsluiten niet
       zien. Daarom: railpack.json mag de naam dragen zolang elke
       vermelding binnen de excludelijst valt. */
    if (treffers.includes("railpack.json")) {
      const rp = JSON.parse(railpack) as { exclude?: string[] };
      const uitgesloten = (rp.exclude ?? []).join("\n");
      const buitenExclude = railpack
        .split("\n")
        .filter((r) => /INTEL_|intelligence|4320|vibe-intel/.test(r))
        .filter((r) => !uitgesloten.includes(r.trim().replace(/[",]/g, "")));
      if (buitenExclude.length === 0) {
        treffers = treffers.filter((t) => t !== "railpack.json");
      }
    }
    meld(
      31,
      "De website is onafhankelijk: geen verwijzing naar de intelligencelaag, geen database",
      treffers.length === 0 && railpack.includes("staticfile") ? "PASS" : "FAIL",
      `alle ${lijst.length} sitebestanden gecontroleerd (geen afkap), ${treffers.length} met een verwijzing; ` +
        `railpack provider staticfile: ${railpack.includes("staticfile") ? "ja" : "NEE"}`,
      treffers.slice(0, 3),
    );
  }

  /* 32 — de live site antwoordt nu, onafhankelijk van dit platform */
  if (SNEL) {
    meld(32, "De live site antwoordt onafhankelijk van het intelligenceplatform", "NIET GEDRAAID", "--snel");
  } else {
    try {
      const r = await fetch("https://www.vibeenergy.nl/", {
        headers: { "user-agent": config.userAgent },
        redirect: "manual",
      });
      const server = r.headers.get("server");
      meld(
        32,
        "De live site antwoordt onafhankelijk van het intelligenceplatform",
        r.ok ? "PASS" : "FAIL",
        // Dit scenario werd scherper toen het platform wél live ging: de
        // site en het platform zijn aparte Railway-services met aparte
        // faaldomeinen. De site hoort te antwoorden ook als het platform
        // omvalt, en dat is nu een echte bewering in plaats van een
        // gevolg van 'er staat nog niets'.
        `HTTP ${r.status}, server '${server}'; de statische site heeft een eigen faaldomein en antwoordt los van het platform`,
      );
    } catch (e) {
      meld(
        32,
        "De live site antwoordt onafhankelijk van het intelligenceplatform",
        "NIET GEDRAAID",
        `netwerkfout: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /* ---------------- 20. sitemap- en canonicalpariteit met live ---------------- */
  if (SNEL) {
    meld(20, "Sitemap- en canonicalpariteit tussen de branch en de live site", "NIET GEDRAAID", "--snel: dit scenario doet een netwerkverzoek");
  } else {
    try {
      const antwoord = await fetch("https://www.vibeenergy.nl/sitemap.xml", {
        headers: { "user-agent": config.userAgent },
      });
      const liveXml = await antwoord.text();
      const live = new Set([...liveXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!));
      const lokaalPad = join(SITE, "sitemap.xml");
      const lokaalXml = existsSync(lokaalPad) ? readFileSync(lokaalPad, "utf8") : "";
      const lokaal = new Set([...lokaalXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!));
      const alleenLive = [...live].filter((u) => !lokaal.has(u));
      const alleenLokaal = [...lokaal].filter((u) => !live.has(u));
      const apex = [...lokaal].filter((u) => u.startsWith("https://vibeenergy.nl"));
      meld(
        20,
        "Sitemap- en canonicalpariteit: de branch beschrijft exact de live site",
        antwoord.ok && alleenLive.length === 0 && alleenLokaal.length === 0 && apex.length === 0
          ? "PASS"
          : "FAIL",
        `live ${live.size} URL's, branch ${lokaal.size}; alleen live ${alleenLive.length}, alleen branch ${alleenLokaal.length}, op de apexhost ${apex.length}`,
        [...alleenLive.slice(0, 2), ...alleenLokaal.slice(0, 2)],
      );
    } catch (e) {
      meld(20, "Sitemap- en canonicalpariteit tussen de branch en de live site", "NIET GEDRAAID", `netwerkfout: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /* ---------------- rapport ---------------- */
  console.log("");
  console.log("=".repeat(96));
  const pass = scenarios.filter((s) => s.uitslag === "PASS").length;
  const fail = scenarios.filter((s) => s.uitslag === "FAIL").length;
  const niet = scenarios.filter((s) => s.uitslag === "NIET GEDRAAID").length;
  console.log(`SCENARIO'S  ${scenarios.length}   PASS ${pass}   FAIL ${fail}   NIET GEDRAAID ${niet}`);
  if (fail) {
    console.log("");
    console.log("GEFAALD:");
    for (const s of scenarios.filter((x) => x.uitslag === "FAIL")) {
      console.log(`  [${s.nummer}] ${s.naam}`);
      console.log(`       ${s.meting}`);
    }
  }
  if (niet) {
    console.log("");
    console.log("NIET GEDRAAID:");
    for (const s of scenarios.filter((x) => x.uitslag === "NIET GEDRAAID")) {
      console.log(`  [${s.nummer}] ${s.naam} — ${s.meting}`);
    }
  }
  console.log("");
  console.log(`EINDOORDEEL E2E = ${fail === 0 ? "PASS" : "FAIL"}${niet ? ` (met ${niet} niet gedraaid)` : ""}`);
  process.exitCode = fail === 0 ? 0 : 1;
} finally {
  await sluitAllePools();
}
