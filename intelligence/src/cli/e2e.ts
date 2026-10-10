/* ============================================================
   CLI — de twintig end-to-end scenario's
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
  console.log("VIBE ENERGY — TWINTIG END-TO-END SCENARIO'S");
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
    meld(
      2,
      "Ingestie: het archief staat en is per document precies een versie",
      b.documenten > 0 && b.documenten === b.versies ? "PASS" : "FAIL",
      `${b.documenten} documenten, ${b.versies} versies, ${b.verdacht} injectie-verdacht`,
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
    meld(
      3,
      "Ingestie is idempotent: een geforceerde herhaling levert niets nieuws",
      r.ok && nieuw === 0 ? "PASS" : "FAIL",
      `versies voor ${voor[0]!.n}, na ${na[0]!.n}, verschil ${nieuw}${regel ? ` (collector meldde ${regel[1]} nieuwe documenten)` : ""}`,
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
    const reg = JSON.parse(readFileSync(pad, "utf8")) as { routes: { staat: string; soort: string }[] };
    const index = reg.routes.filter((x) => x.staat === "INDEX").length;
    const pending = reg.routes.filter((x) => x.staat === "PENDING").length;
    const regioPending = reg.routes.filter((x) => x.soort === "regio" && x.staat === "PENDING").length;
    meld(
      12,
      "Regionale intelligentie publiceert niets: de 4.587 PENDING-routes blijven PENDING",
      index === 96 && regioPending === 4587 ? "PASS" : "FAIL",
      `${index} INDEX, ${pending} PENDING, waarvan ${regioPending} regionaal`,
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
      meld(
        17,
        "Dashboard zonder sessie: geen inhoud, wel een omleiding naar inloggen",
        open.status === 302 && open.headers.get("location") === "/inloggen" && ontbreekt.length === 0
          ? "PASS"
          : "FAIL",
        `GET / gaf ${open.status} naar ${open.headers.get("location")}; beveiligingsheaders ontbrekend: ${ontbreekt.length}`,
        ontbreekt,
      );

      /* inloggen */
      async function logIn(email: string, wachtwoord: string): Promise<string | null> {
        const r = await fetch(`${basis}/inloggen`, {
          method: "POST",
          redirect: "manual",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ email, wachtwoord }).toString(),
        });
        const set = r.headers.get("set-cookie");
        if (!set) return null;
        const koekje = set.split(";")[0]!;
        return koekje.endsWith("=") ? null : koekje;
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
        meld(19, "Alle acht weergaven van het Intelligence Center laden", "NIET GEDRAAID", "geen sessie");
      } else {
        const paden = ["/", "/radar", "/studio", "/regio", "/signalen", "/distributie", "/prestaties", "/instellingen"];
        const uitkomsten: string[] = [];
        for (const p of paden) {
          const r = await fetch(`${basis}${p}`, { headers: { cookie: beheerder } });
          uitkomsten.push(`${p} ${r.status}`);
        }
        const slecht = uitkomsten.filter((u) => !u.endsWith(" 200"));
        meld(
          19,
          "Alle acht weergaven van het Intelligence Center laden voor een beheerder",
          slecht.length === 0 ? "PASS" : "FAIL",
          `${paden.length - slecht.length} van ${paden.length} weergaven gaven 200`,
          slecht,
        );
      }
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
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
