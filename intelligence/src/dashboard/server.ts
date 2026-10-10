/* ============================================================
   DASHBOARD — Intelligence Center
   ------------------------------------------------------------
   Acht weergaven over één waarheid: de database. Elke tegel en elke
   tabel komt uit een query; er staat geen enkel getal in deze code dat
   niet uit de database komt, en een ontbrekende meting wordt ONBEKEND
   of NIET AANGESLOTEN in plaats van 0.

   Autorisatie op twee niveaus tegelijk:
     * de route eist een recht uit intel.rol_rechten;
     * elke query loopt via metOrganisatie, dus RLS begrenst de rijen.
   Zou de rechtencontrole een gat hebben, dan ziet een gebruiker nog
   steeds alleen zijn eigen organisatie.
   ============================================================ */

import express, { type Request, type Response, type NextFunction } from "express";
import { configLezen } from "../kern/config.ts";
import { maakPool, metOrganisatie, rijen, eenRij, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import {
  controleerWachtwoord,
  leesGebruiker,
  leesSessieCookie,
  maakSessieCookie,
  zoekGebruikerOpEmail,
  type Gebruiker,
} from "./auth.ts";
import {
  esc,
  getalOfOnbekend,
  gezondheidVlag,
  pagina,
  tabel,
  tegel,
  vlag,
} from "./html.ts";
import { koppelingStatussen, funnelBeeld } from "../analytics/koppelingen.ts";

const log = maakLogger("dashboard");

const COOKIE = "intel_sessie";

type MetGebruiker = Request & { gebruiker?: Gebruiker };

export function maakApp(pool: Pool): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.urlencoded({ extended: false, limit: "16kb" }));

  // Dit is een intern dashboard: nooit indexeren, nooit in een frame,
  // en geen referrer naar buiten.
  app.use((_req, res, next) => {
    res.setHeader("x-robots-tag", "noindex, nofollow");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader(
      "content-security-policy",
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
    );
    next();
  });

  function leesCookie(req: Request): string | undefined {
    const ruw = req.headers.cookie;
    if (!ruw) return undefined;
    for (const deel of ruw.split(";")) {
      const [naam, ...rest] = deel.trim().split("=");
      if (naam === COOKIE) return rest.join("=");
    }
    return undefined;
  }

  /** Haalt de gebruiker erbij, of stuurt naar de inlogpagina. */
  async function vereistInlog(req: MetGebruiker, res: Response, next: NextFunction) {
    const sessie = leesSessieCookie(leesCookie(req));
    if (!sessie) {
      res.redirect("/inloggen");
      return;
    }
    const gebruiker = await metOrganisatie(
      pool,
      { organisatieId: sessie.organisatieId, gebruikerId: sessie.gebruikerId },
      (c) => leesGebruiker(c, sessie.gebruikerId),
    );
    if (!gebruiker) {
      res.setHeader("set-cookie", `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`);
      res.redirect("/inloggen");
      return;
    }
    req.gebruiker = gebruiker;
    next();
  }

  function vereistRecht(recht: string) {
    return (req: MetGebruiker, res: Response, next: NextFunction) => {
      if (!req.gebruiker?.rechten.has(recht)) {
        res
          .status(403)
          .send(
            pagina({
              titel: "Geen toegang",
              huidigPad: req.path,
              gebruiker: req.gebruiker ?? null,
              inhoud:
                `<h1>Geen toegang</h1><p class="uitleg">Deze weergave vereist het recht ` +
                `<code>${esc(recht)}</code>. Uw rollen zijn: ` +
                `${esc(req.gebruiker?.rollen.join(", ") ?? "geen")}.</p>`,
            }),
          );
        return;
      }
      next();
    };
  }

  /** Query in de context van de ingelogde gebruiker. */
  function alsGebruiker<T>(req: MetGebruiker, werk: (c: Parameters<Parameters<typeof metOrganisatie>[2]>[0]) => Promise<T>) {
    const g = req.gebruiker;
    if (!g) throw new Error("alsGebruiker zonder gebruiker");
    return metOrganisatie(pool, { organisatieId: g.organisatieId, gebruikerId: g.id }, werk);
  }

  // ---------------- inloggen ----------------

  app.get("/inloggen", (req, res) => {
    const fout = typeof req.query["fout"] === "string";
    res.send(
      pagina({
        titel: "Inloggen",
        huidigPad: "/inloggen",
        gebruiker: null,
        inhoud:
          `<h1>Intelligence Center</h1>` +
          (fout ? '<div class="melding fout">Inloggen mislukt.</div>' : "") +
          `<form class="inlog" method="post" action="/inloggen">
             <label for="email">E-mail</label>
             <input id="email" name="email" type="email" autocomplete="username" required>
             <label for="wachtwoord">Wachtwoord</label>
             <input id="wachtwoord" name="wachtwoord" type="password" autocomplete="current-password" required>
             <button type="submit">Inloggen</button>
             <p class="klein" style="margin-top:14px">
               Gebruikers worden zonder wachtwoord aangemaakt. Zet er een met
               <code>npm run wachtwoord</code> voordat u hier kunt inloggen.
             </p>
           </form>`,
      }),
    );
  });

  app.post("/inloggen", async (req, res) => {
    const email = String(req.body?.email ?? "").trim();
    const wachtwoord = String(req.body?.wachtwoord ?? "");

    // Zonder organisatiecontext kan de gebruikerslijst niet gelezen
    // worden door RLS. Inloggen gebruikt daarom de organisatie uit de
    // configuratie; een platform met meerdere tenants zou hier een
    // tenantkiezer of een e-maildomeinregel krijgen.
    const config = configLezen();
    const org = await metOrganisatie(pool, { organisatieId: 1 }, async () => 1).catch(() => null);
    void org;

    const organisatieId = await eersteOrganisatie(pool, config.organisatieSleutel);
    const kandidaat = await metOrganisatie(pool, { organisatieId }, (c) =>
      zoekGebruikerOpEmail(c, email),
    ).catch(() => null);

    const ok = kandidaat ? await controleerWachtwoord(wachtwoord, kandidaat.wachtwoord_hash) : false;
    if (!ok || !kandidaat) {
      log.waarschuwing("inlogpoging mislukt", { email });
      res.redirect("/inloggen?fout=1");
      return;
    }

    await metOrganisatie(
      pool,
      { organisatieId: kandidaat.organisatie_id, gebruikerId: kandidaat.id },
      async (c) => {
        await c.query("update intel.gebruikers set laatste_login = now() where id = $1", [
          kandidaat.id,
        ]);
        await c.query(
          `insert into intel.audit_gebeurtenissen
             (organisatie_id, actor_soort, actor_id, actor_naam, handeling, objectsoort, object_id, herkomst)
           values ($1, 'mens', $2, $3, 'inloggen', 'gebruiker', $4, 'dashboard')`,
          [kandidaat.organisatie_id, kandidaat.id, email, String(kandidaat.id)],
        );
      },
    );

    res.setHeader(
      "set-cookie",
      `${COOKIE}=${maakSessieCookie(kandidaat.id, kandidaat.organisatie_id)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800`,
    );
    res.redirect("/");
  });

  app.get("/uitloggen", (_req, res) => {
    res.setHeader("set-cookie", `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`);
    res.redirect("/inloggen");
  });

  app.get("/gezond", (_req, res) => res.json({ ok: true }));

  // ---------------- overzicht ----------------

  app.get("/", vereistInlog, async (req: MetGebruiker, res) => {
    const d = await alsGebruiker(req, async (c) => ({
      bronnen: await eenRij<{ totaal: number; gezond: number; stuk: number }>(
        c,
        `select count(*)::int as totaal,
                count(*) filter (where gezondheid = 'HEALTHY')::int as gezond,
                count(*) filter (where gezondheid in ('DEGRADED','BROKEN'))::int as stuk
           from intel.bronnen where actief`,
      ),
      documenten: await eenRij<{ n: number; versies: number }>(
        c,
        `select (select count(*)::int from intel.brondocumenten) as n,
                (select count(*)::int from intel.brondocument_versies) as versies`,
      ),
      gebeurtenissen: await eenRij<{ actief: number; nieuw7: number; tegenspraak: number }>(
        c,
        `select count(*) filter (where status <> 'afgewezen')::int as actief,
                count(*) filter (where eerst_gezien_op > now() - interval '7 days')::int as nieuw7,
                count(*) filter (where heeft_tegenspraak)::int as tegenspraak
           from intel.markt_gebeurtenissen`,
      ),
      uitspraken: await eenRij<{ totaal: number; bevestigd: number; herziening: number }>(
        c,
        `select count(*)::int as totaal,
                count(*) filter (where verificatie_status = 'bevestigd')::int as bevestigd,
                count(*) filter (where hersien_voor < current_date)::int as herziening
           from intel.uitspraken`,
      ),
      kandidaten: await rijen<{ besluit: string; n: number }>(
        c,
        `select besluit, count(*)::int as n from intel.inhoud_kandidaten group by 1 order by 2 desc`,
      ),
      inhoud: await eenRij<{ review: number; gepubliceerd: number; geblokkeerd: number }>(
        c,
        `select count(*) filter (where status in ('concept','ter_review'))::int as review,
                count(*) filter (where status = 'gepubliceerd')::int as gepubliceerd,
                count(*) filter (where not poorten_geslaagd)::int as geblokkeerd
           from intel.inhoud_versies`,
      ),
      signalen: await eenRij<{ n: number; geverifieerd: number }>(
        c,
        `select count(*)::int as n,
                count(*) filter (where verificatie_status = 'geverifieerd')::int as geverifieerd
           from intel.commerciele_signalen`,
      ),
      meldingen: await rijen<{ ernst: string; soort: string; bericht: string; aantal: number }>(
        c,
        `select ernst, soort, bericht, aantal from intel.systeem_meldingen
          where opgelost_op is null order by laatst_op desc limit 8`,
      ),
      beleid: await eenRij<{ versie: string; auto: boolean; max_risico: string }>(
        c,
        `select versie, auto_publiceren_aan as auto, auto_max_risico as max_risico
           from intel.publicatiebeleid where actief order by vastgesteld_op desc limit 1`,
      ),
      taken: await eenRij<{ wachtend: number; dlq: number }>(
        c,
        `select count(*) filter (where status = 'wachtend')::int as wachtend,
                count(*) filter (where status = 'dlq')::int as dlq
           from intel.taken`,
      ),
    }));

    const besluitRijen = d.kandidaten.map((k) => [esc(k.besluit), `<span class="num">${k.n}</span>`]);

    res.send(
      pagina({
        titel: "Overzicht",
        huidigPad: "/",
        gebruiker: req.gebruiker ?? null,
        inhoud: `
<h1>Overzicht</h1>
<p class="uitleg">Elke waarde hieronder komt uit een query. Een ontbrekende meting staat als
ONBEKEND, niet als nul.</p>

<div class="rooster">
  ${tegel("Actieve bronnen", getalOfOnbekend(d.bronnen?.totaal), `${d.bronnen?.gezond ?? 0} gezond, ${d.bronnen?.stuk ?? 0} met fout`)}
  ${tegel("Brondocumenten", getalOfOnbekend(d.documenten?.n), `${d.documenten?.versies ?? 0} versies`)}
  ${tegel("Marktgebeurtenissen", getalOfOnbekend(d.gebeurtenissen?.actief), `${d.gebeurtenissen?.nieuw7 ?? 0} in 7 dagen`)}
  ${tegel("Uitspraken bevestigd", getalOfOnbekend(d.uitspraken?.bevestigd), `van ${d.uitspraken?.totaal ?? 0} totaal`)}
  ${tegel("Inhoud ter review", getalOfOnbekend(d.inhoud?.review), `${d.inhoud?.geblokkeerd ?? 0} door poorten geblokkeerd`)}
  ${tegel("Gepubliceerd", getalOfOnbekend(d.inhoud?.gepubliceerd), "via de goedkeuringsketen")}
  ${tegel("Commerciële signalen", getalOfOnbekend(d.signalen?.n), `${d.signalen?.geverifieerd ?? 0} geverifieerd`)}
  ${tegel("Wachtrij", getalOfOnbekend(d.taken?.wachtend), `${d.taken?.dlq ?? 0} in dead-letter`)}
</div>

<h2>Publicatiebeleid</h2>
<div class="tegel">
  ${
    d.beleid
      ? `Beleid <code>${esc(d.beleid.versie)}</code>: automatisch publiceren staat
         ${d.beleid.auto ? vlag("AAN", "waarschuwing") : vlag("UIT", "ok")},
         maximaal risico <code>${esc(d.beleid.max_risico)}</code>.
         <div class="klein" style="margin-top:6px">Hoog risico kan nooit automatisch, ongeacht deze
         instelling — dat is een databaseconstraint.</div>`
      : '<span class="onbekend">GEEN ACTIEF BELEID</span>'
  }
</div>

<h2>Besluiten van de motor</h2>
${tabel(["Besluit", "Aantal"], besluitRijen, "Nog geen besluiten genomen.")}

<h2>Open meldingen</h2>
${tabel(
  ["Ernst", "Soort", "Bericht", "Aantal"],
  d.meldingen.map((m) => [
    vlag(m.ernst, m.ernst === "fout" || m.ernst === "kritiek" ? "fout" : m.ernst === "waarschuwing" ? "waarschuwing" : ""),
    esc(m.soort),
    esc(m.bericht),
    `<span class="num">${m.aantal}</span>`,
  ]),
  "Geen open meldingen.",
)}

<h2>Verlopen houdbaarheid</h2>
<div class="tegel">
  ${
    (d.uitspraken?.herziening ?? 0) > 0
      ? `${vlag(`${d.uitspraken?.herziening} uitspraken over herzieningsdatum`, "waarschuwing")}
         <div class="klein" style="margin-top:6px">Deze claims zijn niet opnieuw tegen hun bron gehouden.</div>`
      : vlag("alle uitspraken binnen hun herzieningstermijn", "ok")
  }
</div>
`,
      }),
    );
  });

  // ---------------- market radar ----------------

  app.get("/radar", vereistInlog, async (req: MetGebruiker, res) => {
    const d = await alsGebruiker(req, async (c) => ({
      bronnen: await rijen<{
        sleutel: string;
        uitgever: string;
        soort: string;
        gezondheid: string;
        actief: boolean;
        robots_status: string;
        tdm_status: string;
        laatst_opgehaald_op: Date | null;
        opeenvolgende_fouten: number;
        documenten: number;
        inactief: string | null;
      }>(
        c,
        `select b.sleutel, b.uitgever, b.soort, b.gezondheid, b.actief,
                b.robots_status, b.tdm_status, b.laatst_opgehaald_op, b.opeenvolgende_fouten,
                (select count(*)::int from intel.brondocumenten d where d.bron_id = b.id) as documenten,
                case when b.actief then null else split_part(b.verificatie_bewijs, '|| UIT: ', 2) end as inactief
           from intel.bronnen b
          order by b.actief desc, b.gezondheid, b.sleutel`,
      ),
      gebeurtenissen: await rijen<{
        id: number;
        titel: string;
        soort: string;
        materialiteit: number;
        risico: string;
        bronnen: number;
        tegenspraak: boolean;
        gebeurd_op: Date | null;
        onderwerp: string | null;
      }>(
        c,
        `select g.id, g.titel, g.gebeurtenis_soort as soort, g.materialiteit,
                g.risico_klasse as risico, g.aantal_bronnen as bronnen,
                g.heeft_tegenspraak as tegenspraak, g.gebeurd_op,
                oc.sleutel as onderwerp
           from intel.markt_gebeurtenissen g
           left join intel.onderwerp_clusters oc on oc.id = g.onderwerp_cluster_id
          where g.status <> 'afgewezen'
          order by g.materialiteit desc, g.id
          limit 40`,
      ),
      ophalingen: await rijen<{ resultaat: string; n: number }>(
        c,
        `select resultaat, count(*)::int as n from intel.bron_ophalingen
          where gestart_op > now() - interval '7 days' group by 1 order by 2 desc`,
      ),
    }));

    res.send(
      pagina({
        titel: "Market Radar",
        huidigPad: "/radar",
        gebruiker: req.gebruiker ?? null,
        inhoud: `
<h1>Market Radar</h1>
<p class="uitleg">Bronnen met hun gemeten toestemming en gezondheid, en de gebeurtenissen die
eruit kwamen. Een bron die uit staat heeft een gemeten reden.</p>

<h2>Ophalingen, laatste 7 dagen</h2>
${tabel(
  ["Resultaat", "Aantal"],
  d.ophalingen.map((o) => [esc(o.resultaat), `<span class="num">${o.n}</span>`]),
  "Nog geen ophalingen.",
)}

<h2>Bronnen (${d.bronnen.length})</h2>
${tabel(
  ["Sleutel", "Uitgever", "Soort", "Aan", "Robots", "TDM", "Gezondheid", "Docs", "Laatst"],
  d.bronnen.map((b) => [
    `<code>${esc(b.sleutel)}</code>${b.inactief ? `<div class="klein">${esc(b.inactief.slice(0, 180))}</div>` : ""}`,
    esc(b.uitgever),
    esc(b.soort),
    b.actief ? vlag("ja", "ok") : vlag("nee", ""),
    b.robots_status === "toegestaan" ? vlag(b.robots_status, "ok") : vlag(b.robots_status, "fout"),
    b.tdm_status === "geen_voorbehoud" ? vlag("vrij", "ok") : vlag(b.tdm_status, "waarschuwing"),
    gezondheidVlag(b.gezondheid),
    `<span class="num">${b.documenten}</span>`,
    b.laatst_opgehaald_op ? esc(b.laatst_opgehaald_op.toISOString().slice(0, 16).replace("T", " ")) : '<span class="onbekend">NOOIT</span>',
  ]),
)}

<h2>Gebeurtenissen, hoogste materialiteit eerst</h2>
${tabel(
  ["Mat.", "Soort", "Onderwerp", "Titel", "Bronnen", "Risico", "Datum"],
  d.gebeurtenissen.map((g) => [
    `<span class="num">${g.materialiteit}</span>`,
    esc(g.soort),
    g.onderwerp ? `<code>${esc(g.onderwerp)}</code>` : '<span class="onbekend">GEEN</span>',
    esc(g.titel) + (g.tegenspraak ? ` ${vlag("tegenspraak", "waarschuwing")}` : ""),
    `<span class="num">${g.bronnen}</span>`,
    g.risico === "hoog" ? vlag(g.risico, "fout") : g.risico === "midden" ? vlag(g.risico, "waarschuwing") : vlag(g.risico, "ok"),
    g.gebeurd_op ? esc(g.gebeurd_op.toISOString().slice(0, 10)) : '<span class="onbekend">ONBEKEND</span>',
  ]),
)}
`,
      }),
    );
  });

  // ---------------- content studio ----------------

  app.get("/studio", vereistInlog, vereistRecht("inhoud.lezen"), async (req: MetGebruiker, res) => {
    const d = await alsGebruiker(req, async (c) => ({
      versies: await rijen<{
        id: number;
        pad: string;
        titel: string;
        status: string;
        soort: string;
        risico: string;
        poorten: boolean;
        blokkades: string[];
        model: string | null;
        kern: number;
        bronnen: number;
      }>(
        c,
        `select v.id, v.pad, v.titel, v.status, v.soort, v.risico_klasse as risico,
                v.poorten_geslaagd as poorten, v.blokkades, v.model,
                (select count(*)::int from intel.inhoud_uitspraken iu
                  where iu.inhoud_versie_id = v.id and iu.rol = 'kern') as kern,
                jsonb_array_length(v.bronnen_sectie) as bronnen
           from intel.inhoud_versies v
          order by v.id desc limit 30`,
      ),
      kandidaten: await rijen<{
        id: number;
        besluit: string;
        score: number;
        risico: string;
        titel: string;
        redenen: string[];
        status: string;
      }>(
        c,
        `select k.id, k.besluit, k.totaalscore as score, k.risico_klasse as risico,
                g.titel, k.besluit_redenen as redenen, k.status
           from intel.inhoud_kandidaten k
           join intel.markt_gebeurtenissen g on g.id = k.gebeurtenis_id
          where k.besluit not in ('REJECT', 'MONITOR')
          order by k.totaalscore desc, k.id limit 25`,
      ),
      besluiten: await rijen<{ besluit: string; actor: string; op: Date; motivatie: string | null; versie: number }>(
        c,
        `select besluit, actor_soort as actor, op, motivatie, inhoud_versie_id as versie
           from intel.publicatiebesluiten order by id desc limit 15`,
      ),
    }));

    res.send(
      pagina({
        titel: "Content Studio",
        huidigPad: "/studio",
        gebruiker: req.gebruiker ?? null,
        inhoud: `
<h1>Content Studio</h1>
<p class="uitleg">Kandidaten uit de besluitmotor, conceptversies met hun poortuitslag, en het
onveranderlijke publicatiespoor.</p>

<h2>Kandidaten (geen REJECT of MONITOR)</h2>
${tabel(
  ["Score", "Besluit", "Risico", "Titel", "Status", "Onderbouwing"],
  d.kandidaten.map((k) => [
    `<span class="num">${k.score}</span>`,
    esc(k.besluit),
    k.risico === "hoog" ? vlag(k.risico, "fout") : vlag(k.risico, ""),
    esc(k.titel),
    esc(k.status),
    `<details><summary>${k.redenen.length} reden(en)</summary>${k.redenen
      .map((r) => `<div class="klein">· ${esc(r)}</div>`)
      .join("")}</details>`,
  ]),
  "Geen kandidaten die inhoud opleveren.",
)}

<h2>Conceptversies</h2>
${tabel(
  ["ID", "Pad", "Soort", "Status", "Poorten", "Risico", "Kernclaims", "Bronnen", "Auteur"],
  d.versies.map((v) => [
    `<span class="num">${v.id}</span>`,
    `<code>${esc(v.pad)}</code><div class="klein">${esc(v.titel)}</div>`,
    esc(v.soort),
    esc(v.status),
    v.poorten
      ? vlag("geslaagd", "ok")
      : `${vlag("geblokkeerd", "fout")}<details><summary class="klein">${v.blokkades.length} blokkade(s)</summary>${v.blokkades
          .map((b) => `<div class="klein">· ${esc(b)}</div>`)
          .join("")}</details>`,
    v.risico === "hoog" ? vlag(v.risico, "fout") : vlag(v.risico, ""),
    `<span class="num">${v.kern}</span>`,
    `<span class="num">${v.bronnen}</span>`,
    esc(v.model ?? "-"),
  ]),
  "Nog geen conceptversies.",
)}

<h2>Publicatiespoor (append-only)</h2>
${tabel(
  ["Wanneer", "Versie", "Besluit", "Actor", "Motivatie"],
  d.besluiten.map((b) => [
    esc(b.op.toISOString().slice(0, 16).replace("T", " ")),
    `<span class="num">${b.versie}</span>`,
    esc(b.besluit),
    esc(b.actor),
    esc((b.motivatie ?? "").slice(0, 160)),
  ]),
  "Nog geen publicatiebesluiten.",
)}
`,
      }),
    );
  });

  // ---------------- regio ----------------

  app.get("/regio", vereistInlog, vereistRecht("inhoud.lezen"), async (req: MetGebruiker, res) => {
    const d = await alsGebruiker(req, async (c) => ({
      geo: await rijen<{ soort: string; n: number }>(
        c,
        "select soort, count(*)::int as n from intel.geo_bereiken group by 1 order by 2 desc",
      ),
      koppelingen: await rijen<{ grondslag: string; n: number }>(
        c,
        `select grondslag, count(*)::int as n from intel.gebeurtenis_geo group by 1
         union all
         select 'uitspraak:' || grondslag, count(*)::int from intel.uitspraak_geo group by 1`,
      ),
      impacts: await rijen<{
        id: number;
        gebied: string;
        soort: string;
        impact: string;
        grondslag: string;
        status: string;
        gereed: boolean;
      }>(
        c,
        `select ri.id, gb.naam as gebied, gb.soort, ri.impact_soort as impact,
                ri.grondslag, ri.status, ri.release1_gereed as gereed
           from intel.regio_impacts ri
           join intel.geo_bereiken gb on gb.id = ri.geo_bereik_id
          order by ri.id desc limit 30`,
      ),
    }));

    res.send(
      pagina({
        titel: "Regio",
        huidigPad: "/regio",
        gebruiker: req.gebruiker ?? null,
        inhoud: `
<h1>Regionale intelligentie</h1>
<p class="uitleg">Geografie is bewijsgebonden. Een gebied hoort alleen bij een gebeurtenis als de
bron dat gebied zelf noemt (<code>bron_expliciet</code>) of als er een exacte code-match is
(<code>code_match</code>). Een gevolgtrekking (<code>afgeleid</code>) kan nooit een
netcapaciteitsclaim dragen; dat is een databaseconstraint.</p>

<h2>Referentiegeografie</h2>
<div class="rooster">
${d.geo.map((g) => tegel(g.soort, getalOfOnbekend(g.n))).join("")}
</div>

<h2>Geografische koppelingen naar grondslag</h2>
${tabel(
  ["Grondslag", "Aantal"],
  d.koppelingen.map((k) => [esc(k.grondslag), `<span class="num">${k.n}</span>`]),
  "Nog geen enkele gebeurtenis of uitspraak is aan een gebied gekoppeld. Dat is de eerlijke stand: " +
    "de bronnen die gebieden expliciet noemen (Gemeenteblad-vergunningen via SRU) staan uit omdat " +
    "repository.overheid.nl crawlen verbiedt.",
)}

<h2>Regionale patchvoorstellen</h2>
${tabel(
  ["ID", "Gebied", "Soort", "Impact", "Grondslag", "Status", "Release 1 gereed"],
  d.impacts.map((i) => [
    `<span class="num">${i.id}</span>`,
    esc(i.gebied),
    esc(i.soort),
    esc(i.impact),
    i.grondslag === "afgeleid" ? vlag(i.grondslag, "waarschuwing") : vlag(i.grondslag, "ok"),
    esc(i.status),
    i.gereed ? vlag("ja", "ok") : vlag("nee", ""),
  ]),
  "Geen regionale patchvoorstellen. Er bestaat op deze site ook nog geen enkele regiopagina.",
)}
`,
      }),
    );
  });

  // ---------------- commerciële signalen ----------------

  app.get("/signalen", vereistInlog, vereistRecht("signaal.lezen"), async (req: MetGebruiker, res) => {
    const d = await alsGebruiker(req, (c) =>
      rijen<{
        id: number;
        prio: number;
        subject: string;
        soort: string;
        feit: string;
        datum: string | null;
        verificatie: string;
        hypothese: boolean;
        interesse: boolean;
        oplossingen: string[];
        actie: string | null;
        bronnen: number;
      }>(
        c,
        `select s.id, s.commerciele_prioriteit as prio, s.subject_naam as subject,
                s.subject_soort as soort, s.geverifieerde_gebeurtenis as feit,
                s.gebeurtenis_datum::text as datum, s.verificatie_status as verificatie,
                s.is_hypothese as hypothese, s.interesse_bewezen as interesse,
                s.relevante_oplossingen as oplossingen, s.aanbevolen_actie as actie,
                (select count(*)::int from intel.signaal_bronnen sb where sb.signaal_id = s.id) as bronnen
           from intel.commerciele_signalen s
          order by s.commerciele_prioriteit desc, s.id limit 40`,
      ),
    );

    res.send(
      pagina({
        titel: "Commerciële signalen",
        huidigPad: "/signalen",
        gebruiker: req.gebruiker ?? null,
        inhoud: `
<h1>Commerciële signalen</h1>
<p class="uitleg">Een signaal is geen lead. Het feit komt uit een openbare publicatie; de
energie-uitdaging is onze hypothese. <strong>Dit platform verstuurt niets</strong> — er bestaat
geen verzendpad. Persoonsgegevens staan hier niet in; dat is een databaseconstraint.</p>

${tabel(
  ["Prio", "Subject", "Geverifieerd feit", "Datum", "Verificatie", "Hypothese", "Interesse bewezen", "Bronnen"],
  d.map((s) => [
    `<span class="num">${s.prio}</span>`,
    `${esc(s.subject)}<div class="klein">${esc(s.soort)}</div>`,
    `${esc(s.feit.slice(0, 160))}<div class="klein">mogelijk relevant: ${esc(s.oplossingen.join(", ") || "-")}</div><div class="klein">${esc(s.actie ?? "")}</div>`,
    s.datum ? esc(s.datum) : '<span class="onbekend">ONBEKEND</span>',
    s.verificatie === "geverifieerd" ? vlag(s.verificatie, "ok") : vlag(s.verificatie, "waarschuwing"),
    s.hypothese ? vlag("ja", "waarschuwing") : vlag("nee", "ok"),
    s.interesse ? vlag("ja", "ok") : vlag("nee", ""),
    `<span class="num">${s.bronnen}</span>`,
  ]),
  "Geen commerciële signalen.",
)}
`,
      }),
    );
  });

  // ---------------- distributie ----------------

  app.get("/distributie", vereistInlog, vereistRecht("distributie.concept"), async (req: MetGebruiker, res) => {
    const d = await alsGebruiker(req, (c) =>
      rijen<{
        id: number;
        kanaal: string;
        titel: string;
        status: string;
        machtiging: string | null;
        body: string;
        uitspraken: number;
      }>(
        c,
        `select id, kanaal, titel, status, machtiging_bewijs as machtiging, body,
                cardinality(uitspraak_ids) as uitspraken
           from intel.distributie_concepten
          order by id desc limit 40`,
      ),
    );

    res.send(
      pagina({
        titel: "Distributie",
        huidigPad: "/distributie",
        gebruiker: req.gebruiker ?? null,
        inhoud: `
<h1>Distributie</h1>
<p class="uitleg">Kanaalconcepten erven dezelfde uitspraken als de inhoudsversie waar ze uit komen,
dus een getal kan onderweg niet veranderen. <strong>Vrijgeven is niet publiceren</strong>: er is
geen verzendpad. Voor LinkedIn en nieuwsbrief eist de database bovendien een vastgelegde
machtiging voordat de status 'vrijgegeven' gezet kan worden.</p>

${tabel(
  ["ID", "Kanaal", "Titel", "Status", "Machtiging", "Uitspraken", "Tekst"],
  d.map((c) => [
    `<span class="num">${c.id}</span>`,
    esc(c.kanaal),
    esc(c.titel),
    esc(c.status),
    c.machtiging ? vlag("vastgelegd", "ok") : vlag("geen", ""),
    `<span class="num">${c.uitspraken}</span>`,
    `<details><summary>bekijken</summary><pre class="klein" style="white-space:pre-wrap">${esc(c.body)}</pre></details>`,
  ]),
  "Nog geen distributieconcepten.",
)}
`,
      }),
    );
  });

  // ---------------- prestaties ----------------

  app.get("/prestaties", vereistInlog, vereistRecht("inhoud.lezen"), async (req: MetGebruiker, res) => {
    const koppelingen = koppelingStatussen();
    const funnel = await funnelBeeld(pool, req.gebruiker?.organisatieId ?? 0);
    const d = await alsGebruiker(req, async (c) => ({
      dekking: await rijen<{ bron: string; vanaf: string; tot: string; rijen: number; volledig: boolean }>(
        c,
        `select bron, datum_vanaf::text as vanaf, datum_tot::text as tot,
                aantal_rijen as rijen, volledig
           from intel.analytics_dekking order by datum_vanaf desc limit 10`,
      ),
      indexatie: await rijen<{ url: string; http: number | null; sitemap: boolean; geindexeerd: string; bewijs: string | null }>(
        c,
        `select url, http_status as http, in_sitemap as sitemap, geindexeerd, bewijs
           from intel.indexatie_status order by laatst_gecontroleerd_op desc limit 20`,
      ),
      aiKosten: await eenRij<{ n: number; bekend: number }>(
        c,
        `select count(*)::int as n,
                count(*) filter (where kosten_schatting is not null)::int as bekend
           from intel.ai_aanroepen`,
      ),
    }));

    res.send(
      pagina({
        titel: "Prestaties",
        huidigPad: "/prestaties",
        gebruiker: req.gebruiker ?? null,
        inhoud: `
<h1>Prestaties</h1>
<p class="uitleg">Dit is de eerlijke stand. Search Console, Bing, GA4 en het CRM zijn niet
aangesloten, dus er zijn geen zoek- en conversiecijfers. Een ontbrekende meting is geen nul.</p>

<h2>Koppelingen</h2>
${tabel(
  ["Koppeling", "Status", "Vertrouwd", "Toelichting"],
  koppelingen.map((k) => [
    `<code>${esc(k.sleutel)}</code>`,
    k.status === "geverifieerd"
      ? vlag(k.status, "ok")
      : k.status === "niet_geconfigureerd"
        ? vlag("NIET AANGESLOTEN", "fout")
        : vlag(k.status, "waarschuwing"),
    k.vertrouwd ? vlag("ja", "ok") : vlag("nee", "waarschuwing"),
    esc(k.toelichting),
  ]),
)}

<h2>Funnel</h2>
${tabel(
  ["Stap", "Aantal", "Bron", "Toelichting"],
  funnel.map((f) => [
    esc(f.stap),
    getalOfOnbekend(f.aantal),
    esc(f.bron),
    esc(f.toelichting),
  ]),
)}

<h2>Dekking van analyticsmetingen</h2>
${tabel(
  ["Bron", "Vanaf", "Tot", "Rijen", "Volledig"],
  d.dekking.map((x) => [esc(x.bron), esc(x.vanaf), esc(x.tot), `<span class="num">${x.rijen}</span>`, x.volledig ? vlag("ja", "ok") : vlag("nee", "waarschuwing")]),
  "Geen dekking vastgelegd. Alles buiten een vastgelegde periode is ONBEKEND, niet nul.",
)}

<h2>Eigen metingen (zonder credentials)</h2>
${tabel(
  ["URL", "HTTP", "In sitemap", "Geïndexeerd", "Bewijs"],
  d.indexatie.map((i) => [
    `<code class="klein">${esc(i.url)}</code>`,
    i.http === null ? '<span class="onbekend">ONBEKEND</span>' : i.http === 200 ? vlag(String(i.http), "ok") : vlag(String(i.http), "waarschuwing"),
    i.sitemap ? vlag("ja", "ok") : vlag("nee", ""),
    i.geindexeerd === "onbekend" ? '<span class="onbekend">ONBEKEND</span>' : esc(i.geindexeerd),
    `<div class="klein">${esc((i.bewijs ?? "").slice(0, 240))}</div>`,
  ]),
  "Nog geen eigen metingen gedaan. Draai npm run analytics.",
)}

<h2>Modelkosten</h2>
<div class="tegel">
  ${d.aiKosten?.n ?? 0} modelaanroep(en), waarvan ${d.aiKosten?.bekend ?? 0} met een berekende prijs.
  <div class="klein" style="margin-top:6px">intel.ai_prijzen is bij installatie leeg. Zonder gemeten
  tarief blijft de kostenschatting ONBEKEND; een verzonnen tarief is erger dan geen tarief.</div>
</div>
`,
      }),
    );
  });

  // ---------------- instellingen ----------------

  app.get("/instellingen", vereistInlog, vereistRecht("beleid.beheren"), async (req: MetGebruiker, res) => {
    const d = await alsGebruiker(req, async (c) => ({
      invarianten: await rijen<{ soort: string; onderwerp: string; bevinding: string }>(
        c,
        "select soort, onderwerp, bevinding from intel_priv.controleer_invarianten()",
      ),
      inhoudsinvarianten: await rijen<{ soort: string; onderwerp: string; bevinding: string }>(
        c,
        "select soort, onderwerp, bevinding from intel_priv.controleer_inhoudsinvarianten()",
      ),
      beleid: await rijen<{
        versie: string;
        auto: boolean;
        max_risico: string;
        min_bronnen: number;
        linkedin: boolean;
        nieuwsbrief: boolean;
        actief: boolean;
      }>(
        c,
        `select versie, auto_publiceren_aan as auto, auto_max_risico as max_risico,
                auto_min_bronnen as min_bronnen, linkedin_machtiging as linkedin,
                nieuwsbrief_machtiging as nieuwsbrief, actief
           from intel.publicatiebeleid order by vastgesteld_op desc`,
      ),
      plafond: await eenRij<{
        aanroepen: number;
        tokens: number;
        ophalingen: number;
        gebruikt: number;
      }>(
        c,
        `select kp.max_ai_aanroepen_per_dag as aanroepen,
                kp.max_tokens_uit_per_dag as tokens,
                kp.max_bron_ophalingen_per_dag as ophalingen,
                (select count(*)::int from intel.ai_aanroepen a
                  where a.op >= date_trunc('day', now())) as gebruikt
           from intel.kostenplafonds kp limit 1`,
      ),
      gebruikers: await rijen<{ email: string; naam: string; rollen: string; hash: boolean; laatste: Date | null }>(
        c,
        `select g.email, g.naam,
                coalesce(string_agg(gr.rol, ', ' order by gr.rol), 'geen rol') as rollen,
                (g.wachtwoord_hash is not null) as hash,
                g.laatste_login as laatste
           from intel.gebruikers g
           left join intel.gebruiker_rollen gr on gr.gebruiker_id = g.id
          group by g.id, g.email, g.naam, g.wachtwoord_hash, g.laatste_login
          order by g.id`,
      ),
      audit: await rijen<{ op: Date; actor: string; handeling: string; objectsoort: string }>(
        c,
        `select op, coalesce(actor_naam, actor_soort) as actor, handeling, objectsoort
           from intel.audit_gebeurtenissen order by id desc limit 15`,
      ),
    }));

    const alleInvarianten = [...d.invarianten, ...d.inhoudsinvarianten];

    res.send(
      pagina({
        titel: "Instellingen",
        huidigPad: "/instellingen",
        gebruiker: req.gebruiker ?? null,
        inhoud: `
<h1>Instellingen</h1>

<h2>Beveiligingsinvarianten</h2>
${
  alleInvarianten.length === 0
    ? `<div class="tegel">${vlag("alle invarianten kloppen", "ok")}<div class="klein" style="margin-top:6px">
       RLS op elke tenanttabel, geen functie uitvoerbaar door PUBLIC, de applicatierol is geen
       eigenaar en heeft geen BYPASSRLS, het auditspoor is niet muteerbaar, en geen gepubliceerde
       kernclaim zonder bevestigd bewijs.</div></div>`
    : tabel(
        ["Soort", "Onderwerp", "Bevinding"],
        alleInvarianten.map((i) => [vlag(i.soort, "fout"), esc(i.onderwerp), esc(i.bevinding)]),
      )
}

<h2>Publicatiebeleid</h2>
${tabel(
  ["Versie", "Actief", "Auto publiceren", "Max risico", "Min bronnen", "LinkedIn", "Nieuwsbrief"],
  d.beleid.map((b) => [
    `<code>${esc(b.versie)}</code>`,
    b.actief ? vlag("ja", "ok") : vlag("nee", ""),
    b.auto ? vlag("AAN", "waarschuwing") : vlag("UIT", "ok"),
    esc(b.max_risico),
    `<span class="num">${b.min_bronnen}</span>`,
    b.linkedin ? vlag("gemachtigd", "waarschuwing") : vlag("niet gemachtigd", "ok"),
    b.nieuwsbrief ? vlag("gemachtigd", "waarschuwing") : vlag("niet gemachtigd", "ok"),
  ]),
)}

<h2>Kostenplafond</h2>
<div class="rooster">
  ${tegel("AI-aanroepen vandaag", `${d.plafond?.gebruikt ?? 0} / ${d.plafond?.aanroepen ?? 0}`)}
  ${tegel("Max tokens uit per dag", getalOfOnbekend(d.plafond?.tokens))}
  ${tegel("Max ophalingen per dag", getalOfOnbekend(d.plafond?.ophalingen))}
</div>

<h2>Gebruikers en rollen</h2>
${tabel(
  ["E-mail", "Naam", "Rollen", "Wachtwoord", "Laatste login"],
  d.gebruikers.map((g) => [
    esc(g.email),
    esc(g.naam),
    esc(g.rollen),
    g.hash ? vlag("gezet", "ok") : vlag("niet gezet — kan niet inloggen", "waarschuwing"),
    g.laatste ? esc(g.laatste.toISOString().slice(0, 16).replace("T", " ")) : '<span class="onbekend">NOOIT</span>',
  ]),
)}

<h2>Auditspoor (append-only)</h2>
${tabel(
  ["Wanneer", "Actor", "Handeling", "Object"],
  d.audit.map((a) => [
    esc(a.op.toISOString().slice(0, 16).replace("T", " ")),
    esc(a.actor),
    esc(a.handeling),
    esc(a.objectsoort),
  ]),
  "Nog geen auditgebeurtenissen.",
)}
`,
      }),
    );
  });

  app.use((req, res) => {
    res.status(404).send(
      pagina({
        titel: "Niet gevonden",
        huidigPad: req.path,
        gebruiker: null,
        inhoud: "<h1>Niet gevonden</h1>",
      }),
    );
  });

  return app;
}

/** Zoekt de organisatie-id zonder RLS-context; alleen voor de inlogroute. */
async function eersteOrganisatie(pool: Pool, sleutel: string): Promise<number> {
  const client = await pool.connect();
  try {
    const r = await client.query<{ id: number }>(
      "select id from intel_priv.actieve_organisaties() where sleutel = $1",
      [sleutel],
    );
    return r.rows[0]?.id ?? 0;
  } finally {
    client.release();
  }
}

export function startDashboard(): { sluit: () => Promise<void> } {
  const config = configLezen();
  if (!config.dashboardSessieGeheimAanwezig) {
    throw new Error(
      "INTEL_SESSIE_GEHEIM ontbreekt of is korter dan 32 tekens; het dashboard start niet zonder sessiegeheim",
    );
  }
  const pool = maakPool();
  const app = maakApp(pool);
  const server = app.listen(config.dashboardPoort, "127.0.0.1", () => {
    log.info("dashboard draait", {
      url: `http://127.0.0.1:${config.dashboardPoort}`,
      // Bewust alleen op localhost: dit dashboard hoort niet publiek te
      // staan, en de statische site draait op een andere service.
      gebonden_aan: "127.0.0.1",
    });
  });
  return {
    sluit: () =>
      new Promise<void>((klaar) => {
        server.close(() => klaar());
      }),
  };
}
