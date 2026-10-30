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

import express, {
  type Request,
  type RequestHandler,
  type Response,
  type NextFunction,
} from "express";
import { configLezen } from "../kern/config.ts";
import {
  maakPool,
  metOrganisatie,
  rijen,
  eenRij,
  sluitAllePools,
  zonderOrganisatie,
  type Pool,
} from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import {
  correlatie,
  csrfPaarGeldig,
  foutvanger,
  leesKoekje,
  maakBegrenzer,
  maakCsrfToken,
  maakSlot,
  CSRF_KOEKJE,
  CSRF_VELD,
  type MetCorrelatie,
} from "./bescherming.ts";
import {
  controleerWachtwoord,
  leesGebruiker,
  leesSessieCookie,
  maakSessieCookie,
  zoekGebruikerOpEmail,
  type Gebruiker,
} from "./auth.ts";
import { leesInstelsleutel, wisselInstelsleutelIn } from "./instellen.ts";
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
import { FASE_LABEL, type Fase } from "../commercieel/aanbesteding.ts";
import { leesSitekennis } from "../site/sitekennis.ts";
import { beoordeel, type Besluit } from "../inhoud/beoordeling.ts";
import { hertoetsInhoudVersie } from "../inhoud/concept.ts";
import { keurGoed } from "../inhoud/publiceer.ts";
import { claimDraagt, herbeoordeelStand } from "../pijplijn/claimpoort.ts";
import { IntelFout } from "../kern/fouten.ts";
import { redacteerFout } from "../kern/geheimen.ts";

/**
 * Wat elke publicatiestatus betekent voor de lezer van het dashboard.
 *
 * Een statuscode zonder uitleg dwingt de beoordelaar om de code te
 * kennen. Dit is de plek waar de keten van par. 16 in woorden staat.
 */
const PUBLICATIE_UITLEG: Readonly<Record<string, string>> = {
  DRAFT: "haalt de controles niet; er is niets te beoordelen",
  /* Sinds 0032 is dit waar: een gefaalde verwoordbaarheid belandt in
     READY_FOR_LINK_REVIEW en niet meer hier. */
  READY_FOR_REVIEW: "alle vijf de controles gehaald, wacht op een mens",
  READY_FOR_LINK_REVIEW:
    "linkvoorstel: het feit is niet te verwoorden, de linkaanbeveling wel onderbouwd; wacht op een mens",
  APPROVED: "goedgekeurd en gebonden aan een inhoudshash; nog niet uitgerold",
  PUBLICATION_PRECHECK: "publicatiecontrole gehaald; klaar om door een mens te worden doorgevoerd",
  DEPLOYMENT: "de wijziging is doorgevoerd, nog niet live teruggezien",
  LIVE_VERIFIED: "live teruggezien op de website",
  REJECTED: "afgewezen; dit voorstel gaat niet door",
};
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** De wortel van de intelligence-map; daar staat data/sitekennis.json. */
const INTEL_WORTEL = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const log = maakLogger("dashboard");

const COOKIE = "intel_sessie";

type MetGebruiker = Request & { gebruiker?: Gebruiker };

/**
 * `; Secure` op de sessiecookie, maar alleen in productie.
 *
 * Een Secure-cookie wordt door de browser niet over http verstuurd. In
 * ontwikkeling loopt het dashboard op http://127.0.0.1, dus daar zou de
 * vlag inloggen onmogelijk maken. In productie is hij verplicht: zonder
 * Secure reist het sessiekoekje mee over een eventuele http-verbinding.
 */
function cookieSecure(): string {
  return configLezen().omgeving === "productie" ? "; Secure" : "";
}

/**
 * Het sessiegeheim, ook gebruikt om CSRF-tokens te tekenen.
 *
 * Eén geheim voor twee doelen is hier verdedigbaar: beide zijn
 * HMAC-ondertekeningen met een eigen, niet-overlappende vorm
 * (sessiekoekje tegen csrf-token), en een tweede geheim zou een extra
 * variabele zijn die vergeten kan worden. Het dashboard start niet
 * zonder dit geheim.
 */
function sessieGeheim(): string {
  const g = process.env["INTEL_SESSIE_GEHEIM"];
  if (!g || g.length < 32) {
    throw new Error("INTEL_SESSIE_GEHEIM ontbreekt of is korter dan 32 tekens");
  }
  return g;
}

/* Begrenzers op modulenivo: één set per proces. Zie bescherming.ts
   voor waarom ze in het geheugen staan en wat dat kost. */
const inlogBegrenzer = maakBegrenzer({ maximum: 10, vensterMs: 60_000, naam: "inloggen-ip" });
const inlogSlot = maakSlot({ maxPogingen: 5, slotMs: 15 * 60_000 });

/**
 * Een weigering met een EIGEN statuscode en een link terug.
 *
 * Bewust geen res.redirect(): die zet de status altijd op 302 en dan
 * ziet een client geen weigering. Zie de toelichting bij de
 * CSRF-grendel in POST /inloggen.
 */
function weiger(res: Response, status: number, melding: string): void {
  res
    .status(status)
    .type("text/html; charset=utf-8")
    .send(
      `<!doctype html><html lang="nl"><head><meta charset="utf-8">` +
        `<meta name="robots" content="noindex, nofollow"><title>Geweigerd</title></head>` +
        `<body><h1>Geweigerd</h1><p>${esc(melding)}</p>` +
        `<p><a href="/inloggen">Terug naar inloggen</a></p></body></html>\n`,
    );
}

export function maakApp(pool: Pool): express.Express {
  const app = express();
  app.disable("x-powered-by");
  /* Precies één proxy wordt vertrouwd voor X-Forwarded-For. Hoger
     zetten zou een aanvaller zijn eigen IP laten verzinnen door de
     header te stapelen, en dan is de begrenzer per IP waardeloos. */
  app.set("trust proxy", 1);
  app.use(express.urlencoded({ extended: false, limit: "16kb" }));
  app.use(correlatie);

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
    // HSTS alleen in productie: op http://127.0.0.1 zou deze header de
    // ontwikkelomgeving onbereikbaar maken zodra een browser hem onthoudt.
    if (configLezen().omgeving === "productie") {
      res.setHeader("strict-transport-security", "max-age=31536000; includeSubDomains");
    }
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

  /**
   * Stuurt een afgewezen belofte uit een async handler naar `foutvanger`.
   *
   * EXPRESS 4 DOET DIT NIET ZELF. Gemeten met de express uit deze
   * worktree (4.22.3): een async handler die gooit levert GEEN antwoord
   * — het verzoek blijft hangen tot de time-out — de foutafhandelaar
   * wordt NIET geraakt, en er komt een unhandledRejection. Het vangnet
   * onderaan dit bestand logt die wel, maar het verzoek is dan al stil
   * gesneuveld en bij een strikte procesinstelling valt het dashboard om.
   *
   * Express 5 routeert rejections wél, maar die stap is een migratie met
   * eigen gedragsverschillen; deze wrapper is drie regels en dekt het
   * volledig.
   */
  const async_ =
    <R extends Request>(fn: (req: R, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
    (req, res, next) => {
      Promise.resolve(fn(req as R, res, next)).catch(next);
    };

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
      (c) => leesGebruiker(c, sessie.gebruikerId, sessie.sessieEpoch),
    );
    if (!gebruiker) {
      res.setHeader("set-cookie", `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${cookieSecure()}`);
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
    /* Een verkeerd wachtwoord stuurt hierheen met ?fout=1. De andere
       weigeringen (CSRF, tempolimiet, accountslot) sturen GEEN redirect
       meer maar dragen hun eigen statuscode; zie weiger(). */
    const fout = typeof req.query["fout"] === "string";
    const melding = "Inloggen mislukt.";

    /* Het CSRF-token komt in een koekje EN in het formulier. De server
       eist straks dat ze gelijk zijn; zie bescherming.ts. */
    const token = maakCsrfToken(sessieGeheim());
    res.setHeader(
      "set-cookie",
      `${CSRF_KOEKJE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800${cookieSecure()}`,
    );

    res.send(
      pagina({
        titel: "Inloggen",
        huidigPad: "/inloggen",
        gebruiker: null,
        inhoud:
          `<h1>Intelligence Center</h1>` +
          (fout ? `<div class="melding fout">${esc(melding)}</div>` : "") +
          `<form class="inlog" method="post" action="/inloggen">
             <input type="hidden" name="${CSRF_VELD}" value="${esc(token)}">
             <label for="email">E-mail</label>
             <input id="email" name="email" type="email" autocomplete="username" required>
             <label for="wachtwoord">Wachtwoord</label>
             <input id="wachtwoord" name="wachtwoord" type="password" autocomplete="current-password" required>
             <button type="submit">Inloggen</button>
             <p class="klein" style="margin-top:14px">
               Nog geen wachtwoord? Accounts worden zonder wachtwoord aangemaakt.
               U krijgt een eenmalige activatielink waarmee u er zelf een kiest.
               Vraag die op bij de beheerder; dit formulier kan er geen maken.
             </p>
           </form>`,
      }),
    );
  });

  app.post("/inloggen", async_(async (req: MetCorrelatie, res) => {
    const email = String(req.body?.email ?? "").trim();
    const wachtwoord = String(req.body?.wachtwoord ?? "");
    const config = configLezen();

    /* CSRF eerst. Inlog-CSRF is minder ernstig dan een state-wijziging
       maar niet onschuldig: een aanvaller kan een slachtoffer in ZIJN
       account laten inloggen en dan meekijken. */
    /* LET OP: hier geen res.redirect(). Express' redirect() zet de
       status altijd zelf op 302, ook na res.status(403). De eerste
       versie van deze grendel wérkte — er kwam geen sessiekoekje — maar
       meldde 302, en een client die op de statuscode let zag dus geen
       weigering. Gevonden door E2E-scenario 21. Een weigering hoort
       zijn eigen status te dragen, met een link terug in de body. */
    if (!csrfPaarGeldig(leesKoekje(req, CSRF_KOEKJE), req.body?.[CSRF_VELD], sessieGeheim())) {
      log.waarschuwing("inlogpoging zonder geldig CSRF-token", {
        verzoek_id: req.correlatieId,
        ip: req.ip,
      });
      weiger(res, 403, "Het formulier was verlopen of niet van deze sessie. Open de inlogpagina opnieuw.");
      return;
    }

    /* Snelheidsbegrenzing per IP. Een aanvaller met één IP en duizend
       accountnamen wordt hier gestopt, ook als geen enkel account
       bestaat. */
    const perIp = inlogBegrenzer.sta(`ip:${req.ip ?? "onbekend"}`);
    if (!perIp.toegestaan) {
      log.waarschuwing("inloggen begrensd op IP", {
        verzoek_id: req.correlatieId,
        ip: req.ip,
        pogingen: perIp.gebruikt,
        over_ms: perIp.overMs,
      });
      res.setHeader("retry-after", String(Math.ceil(perIp.overMs / 1000)));
      weiger(
        res,
        429,
        `Te veel inlogpogingen vanaf dit adres. Probeer het over ${Math.ceil(perIp.overMs / 1000)} seconden opnieuw.`,
      );
      return;
    }

    /* Slot per account. Een aanvaller met duizend IP's en één account
       wordt hier gestopt. De twee maatregelen dekken elkaars gat. */
    const accountSleutel = `account:${email.toLowerCase()}`;
    const slotStand = inlogSlot.isOpSlot(accountSleutel);
    if (slotStand.opSlot) {
      log.waarschuwing("inloggen geweigerd: account tijdelijk op slot", {
        verzoek_id: req.correlatieId,
        email,
        over_ms: slotStand.overMs,
      });
      res.setHeader("retry-after", String(Math.ceil(slotStand.overMs / 1000)));
      weiger(
        res,
        429,
        `Dit account staat tijdelijk op slot. Probeer het over ${Math.ceil(slotStand.overMs / 60000)} minuten opnieuw.`,
      );
      return;
    }

    const organisatieId = await eersteOrganisatie(pool, config.organisatieSleutel);
    const kandidaat = await metOrganisatie(pool, { organisatieId }, (c) =>
      zoekGebruikerOpEmail(c, email),
    ).catch(() => null);

    /* ONVOORWAARDELIJK, ook als het account niet bestaat.
       `kandidaat ? await controleerWachtwoord(...) : false` sloeg scrypt
       over zodra het e-mailadres onbekend was. Het antwoord was identiek,
       maar de responstijd niet: 0,003 ms tegen 23 ms. Dat verschil is een
       antwoord op de vraag "bestaat dit adres". controleerWachtwoord()
       doet bij hash null nu hetzelfde werk en geeft false. */
    const ok = await controleerWachtwoord(wachtwoord, kandidaat?.wachtwoord_hash ?? null);
    if (!ok || !kandidaat) {
      const na = inlogSlot.misluktePoging(accountSleutel);
      log.waarschuwing("inlogpoging mislukt", {
        verzoek_id: req.correlatieId,
        email,
        ip: req.ip,
        pogingen: na.pogingen,
        op_slot: na.opSlot,
      });
      /* De blokkade ook in het auditspoor, want de teller hierboven is
         vluchtig en een herstart wist hem. Het spoor niet. */
      if (na.opSlot) {
        await metOrganisatie(pool, { organisatieId }, (c) =>
          c.query(
            `insert into intel.audit_gebeurtenissen
               (organisatie_id, actor_soort, actor_naam, handeling, objectsoort, object_id, herkomst, motivatie)
             values ($1,'systeem',$2,'account_op_slot','gebruiker',$2,'dashboard',$3)`,
            [
              organisatieId,
              email,
              `te veel mislukte inlogpogingen; ip ${req.ip ?? "onbekend"}, verzoek ${req.correlatieId ?? "onbekend"}`,
            ],
          ),
        ).catch((e) => log.fout("kon de blokkade niet in het auditspoor zetten", { fout: String(e) }));
      }
      res.redirect("/inloggen?fout=1");
      return;
    }

    inlogSlot.gelukt(accountSleutel);

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
      `${COOKIE}=${maakSessieCookie(kandidaat.id, kandidaat.organisatie_id, kandidaat.sessie_epoch)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${cookieSecure()}`,
    );
    res.redirect("/");
  }));

  app.get("/uitloggen", (_req, res) => {
    res.setHeader("set-cookie", `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${cookieSecure()}`);
    res.redirect("/inloggen");
  });

  /* ------------------------------------------------------------------
     /instellen — de houder van een eenmalige sleutel kiest zelf een
     wachtwoord. Zie src/dashboard/instellen.ts voor waarom dit bestaat.

     DEZE ROUTE IS ONGEAUTHENTICEERD, EN DAT MOET OOK: wie hier komt
     heeft per definitie nog geen wachtwoord. De sleutel is de
     autorisatie. Daarom staan er drie grendels op:
       · dezelfde tempolimiet per IP als op het inlogformulier;
       · dezelfde CSRF-dubbelesubmit op de POST;
       · en een afwijzing die NIET verklapt waarom de sleutel niet
         werkt, zodat niemand kan leren of een sleutel bestond.
     ------------------------------------------------------------------ */

  /**
   * Zet het CSRF-koekje dat bij een vers getekend formuliertoken hoort.
   *
   * MOET BIJ ELKE RENDER VAN /instellen MEE. De dubbele-submitcontrole
   * eist dat het veld in het formulier en het koekje aan elkaar gelijk
   * zijn. Rendert een foutpagina een NIEUW token zonder het koekje bij
   * te werken, dan botsen die twee bij de volgende poging en antwoordt
   * de server 403 — ook als de gebruiker daarna alles goed doet.
   *
   * Gemeten op de productieflow: wie zijn wachtwoord twee keer
   * verschillend typte, kreeg bij de tweede poging 403 en kon alleen
   * verder door de activatielink opnieuw te openen. Eén typefout was
   * dus een doodlopende weg.
   */
  const zetCsrfKoekje = (res: Response, csrf: string): void => {
    res.setHeader(
      "set-cookie",
      `${CSRF_KOEKJE}=${csrf}; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800${cookieSecure()}`,
    );
  };

  const instelPagina = (melding: string, sleutel: string, csrf: string, fout = false): string =>
    `<!doctype html><html lang="nl"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex, nofollow"><title>Wachtwoord instellen</title>` +
    `<style>body{font:15px/1.6 system-ui,sans-serif;max-width:30rem;margin:4rem auto;padding:0 1rem}` +
    `label{display:block;margin:1rem 0 .25rem}input{width:100%;padding:.6rem;font:inherit}` +
    `button{margin-top:1.25rem;padding:.6rem 1.2rem;font:inherit}` +
    `.fout{color:#b42318}.uitleg{color:#5b6b76}</style></head><body>` +
    `<h1>Wachtwoord instellen</h1>` +
    `<p class="${fout ? "fout" : "uitleg"}">${esc(melding)}</p>` +
    (sleutel
      ? `<form method="post" action="/instellen">` +
        `<input type="hidden" name="${CSRF_VELD}" value="${esc(csrf)}">` +
        `<input type="hidden" name="sleutel" value="${esc(sleutel)}">` +
        `<label for="w1">Nieuw wachtwoord (minimaal 12 tekens)</label>` +
        `<input id="w1" name="wachtwoord" type="password" autocomplete="new-password" required minlength="12">` +
        `<label for="w2">Nog een keer</label>` +
        `<input id="w2" name="wachtwoord2" type="password" autocomplete="new-password" required minlength="12">` +
        `<button type="submit">Instellen</button></form>`
      : `<p><a href="/inloggen">Naar inloggen</a></p>`) +
    `</body></html>\n`;

  app.get("/instellen", async_(async (req: MetCorrelatie, res) => {
    const begrenzing = inlogBegrenzer.sta(`ip:${req.ip ?? "onbekend"}`);
    if (!begrenzing.toegestaan) {
      weiger(res, 429, "Te veel verzoeken. Probeer het over een minuut opnieuw.");
      return;
    }
    const config = configLezen();
    const sleutel = typeof req.query["sleutel"] === "string" ? req.query["sleutel"] : "";
    const csrf = maakCsrfToken(sessieGeheim());
    zetCsrfKoekje(res, csrf);

    if (!sleutel) {
      res.type("text/html; charset=utf-8").send(
        instelPagina("Deze pagina werkt alleen met een instelsleutel in de link.", "", csrf, true),
      );
      return;
    }
    const stand = await metOrganisatie(pool, { organisatieId: await eersteOrganisatie(pool, config.organisatieSleutel) }, (c) =>
      leesInstelsleutel(c, sleutel),
    ).catch((): Awaited<ReturnType<typeof leesInstelsleutel>> => ({ ok: false, reden: "onbekend" }));

    if (!stand.ok) {
      log.waarschuwing("instelsleutel geweigerd", { verzoek_id: req.correlatieId, reden: stand.reden });
      /* EEN REDEN DIE NIETS VERKLAPT. Onbekend, verlopen en gebruikt
         geven hetzelfde antwoord: anders is deze pagina een orakel dat
         vertelt of een sleutel ooit heeft bestaan. */
      res.status(400).type("text/html; charset=utf-8").send(
        instelPagina("Deze instelsleutel werkt niet (meer). Vraag een nieuwe aan.", "", csrf, true),
      );
      return;
    }
    res.type("text/html; charset=utf-8").send(
      instelPagina(`Kies een wachtwoord voor ${stand.email}.`, sleutel, csrf),
    );
  }));

  app.post("/instellen", async_(async (req: MetCorrelatie, res) => {
    const begrenzing = inlogBegrenzer.sta(`ip:${req.ip ?? "onbekend"}`);
    if (!begrenzing.toegestaan) {
      weiger(res, 429, "Te veel verzoeken. Probeer het over een minuut opnieuw.");
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!csrfPaarGeldig(leesKoekje(req, CSRF_KOEKJE), body[CSRF_VELD], sessieGeheim())) {
      weiger(res, 403, "De beveiligingscontrole van het formulier is mislukt. Open de link opnieuw.");
      return;
    }
    const sleutel = typeof body["sleutel"] === "string" ? body["sleutel"] : "";
    const w1 = typeof body["wachtwoord"] === "string" ? body["wachtwoord"] : "";
    const w2 = typeof body["wachtwoord2"] === "string" ? body["wachtwoord2"] : "";
    const csrf = maakCsrfToken(sessieGeheim());

    if (w1 !== w2) {
      zetCsrfKoekje(res, csrf);
      res.status(400).type("text/html; charset=utf-8").send(
        instelPagina("De twee wachtwoorden zijn niet gelijk.", sleutel, csrf, true),
      );
      return;
    }

    const organisatieId = await eersteOrganisatie(pool, configLezen().organisatieSleutel);
    /* Als EIGENAAR: wachtwoord_hash en sessie_epoch staan sinds migratie
       0015 buiten bereik van de applicatierol, en dat blijft zo. Deze
       ene handeling heeft dat recht nodig en krijgt een eigen pool.
       Dat is geen pool PER VERZOEK: maakPool() memoiseert op
       (url, rol, max) in poolRegister, dus elk verzoek krijgt dezelfde
       twee verbindingen terug. */
    const eigenaar = maakPool({ rol: null, max: 2 });
    const uit = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      wisselInstelsleutelIn(c, sleutel, w1),
    ).catch((e: unknown): Awaited<ReturnType<typeof wisselInstelsleutelIn>> => ({
      ok: false,
      reden: e instanceof Error ? e.message : "onbekend",
    }));

    if (!uit.ok) {
      const kort =
        uit.reden && /minimaal 12/.test(uit.reden)
          ? "Het wachtwoord moet minimaal 12 tekens zijn."
          : "Deze instelsleutel werkt niet (meer). Vraag een nieuwe aan.";
      zetCsrfKoekje(res, csrf);
      res.status(400).type("text/html; charset=utf-8").send(instelPagina(kort, sleutel, csrf, true));
      return;
    }

    /* DEZE AUDITREGEL LANDDE NOOIT.
       De kolom heet `handeling`, niet `soort`; intel.audit_gebeurtenissen
       heeft geen kolom `soort`. De insert faalde dus altijd, en de
       `.catch(() => undefined)` eromheen slikte dat op. Gemeten gevolg:
       71 auditregels, alle met handeling 'inloggen', en NUL regels voor
       het instellen van een wachtwoord — terwijl die flow wel is
       gebruikt.

       Een wachtwoordwissel via een eenmalige sleutel is precies het soort
       handeling waarvoor een auditspoor bestaat. De catch blijft staan
       (een mislukt auditspoor mag een geslaagde wachtwoordwissel niet
       terugdraaien) maar logt nu wel, zodat een volgende fout zichtbaar
       is in plaats van stil. */
    await metOrganisatie(pool, { organisatieId }, (c) =>
      c.query(
        `insert into intel.audit_gebeurtenissen
           (organisatie_id, actor_soort, actor_id, actor_naam, handeling,
            objectsoort, object_id, herkomst, motivatie)
         values ($1, 'mens', $2, $3, 'wachtwoord_ingesteld', 'gebruiker', $4,
                 'dashboard', 'via eenmalige instelsleutel')`,
        [organisatieId, uit.gebruikerId, `gebruiker ${uit.gebruikerId}`, String(uit.gebruikerId)],
      ),
    ).catch((e: unknown) => {
      log.fout("auditregel voor wachtwoord_ingesteld kon niet worden geschreven", {
        gebruiker: uit.gebruikerId,
        fout: e,
      });
    });

    log.info("wachtwoord ingesteld via sleutel", { verzoek_id: req.correlatieId, gebruiker: uit.gebruikerId });
    zetCsrfKoekje(res, csrf);
    res.type("text/html; charset=utf-8").send(
      instelPagina("Het wachtwoord is ingesteld. U kunt nu inloggen.", "", csrf),
    );
  }));

  /* ----------------------------------------------------------------
     VOORSTEL BEOORDELEN — goedkeuren, afkeuren of herziening vragen
     ----------------------------------------------------------------
     DIT PUBLICEERT NIETS. Goedkeuren betekent: een mens vindt dit
     voorstel de moeite waard om door te voeren. Het doorvoeren zelf is
     een patch die een mens maakt; dit platform mag alleen
     data/inhoud/nieuws/<slug>.json auteuren (TOEGESTAAN_AUTEURSPAD).

     De databasegrendel `voorstel_alleen_review_goedkeuren` laat alleen
     een voorstel met eindoordeel KLAAR_VOOR_REVIEW goedkeuren. Zonder
     die grendel kon een afgewezen voorstel alsnog worden goedgekeurd, en
     dan is de hele controlelaag decoratie. */
  /* HET RECHT IS inhoud.goedkeuren, NIET distributie.concept.
     Gemeten defect: dit hing aan `distributie.concept`, en de
     rechtenmatrix in 0001 geeft dat recht óók aan de rol `analist` —
     die géén `inhoud.goedkeuren` heeft. Een analist kon dus
     redactionele paginarevisies goedkeuren.

     De echte grendel staat in beoordeel() zelf, tegen intel.rol_rechten,
     zodat ook een niet-HTTP-aanroeper hem niet kan omzeilen. Deze
     middleware blijft staan omdat ze een nette 403-pagina geeft in
     plaats van een exception. */
  app.post(
    "/voorstellen/:id/beoordeel",
    async_(vereistInlog),
    vereistRecht("inhoud.goedkeuren"),
    async_(async (req: MetGebruiker, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (!csrfPaarGeldig(leesKoekje(req, CSRF_KOEKJE), body[CSRF_VELD], sessieGeheim())) {
        weiger(res, 403, "Het formulier is verlopen. Open de pagina opnieuw.");
        return;
      }
      const id = String(req.params["id"] ?? "");
      if (!/^\d+$/.test(id)) {
        weiger(res, 400, "Ongeldig voorstelnummer.");
        return;
      }
      const besluit = String(body["beoordeling"] ?? "");
      if (!["GOEDGEKEURD", "AFGEKEURD", "AANGEPAST"].includes(besluit)) {
        weiger(res, 400, "Onbekende beoordeling.");
        return;
      }
      const notitie = String(body["notitie"] ?? "").slice(0, 2000);
      /* Afkeuren en herziening vragen zonder reden is geen besluit. */
      if (besluit !== "GOEDGEKEURD" && notitie.trim().length < 10) {
        weiger(res, 400, "Geef een reden van minstens tien tekens bij een afkeuring of herziening.");
        return;
      }

      /* DE HASH DIE DE BEOORDELAAR OP ZIJN SCHERM HAD.
         Par. 15: een goedkeuring geldt voor precies de inhoud die is
         gelezen. Het formulier draagt die hash mee; wijkt hij af van
         wat er nu in de rij staat, dan is het voorstel ondertussen
         herbouwd en wordt het besluit geweigerd in plaats van op de
         nieuwe tekst geplakt. */
      const gezienHash = String(body["inhouds_hash"] ?? "");
      if (!/^[0-9a-f]{64}$/.test(gezienHash)) {
        weiger(
          res,
          400,
          "Dit formulier draagt geen inhoudshash. Open de pagina opnieuw, zodat de " +
            "beoordeling aan de inhoud kan worden gebonden.",
        );
        return;
      }

      const gebruikerId = req.gebruiker?.id ?? null;
      if (gebruikerId === null) {
        weiger(res, 403, "Een beoordeling vraagt een ingelogd account.");
        return;
      }
      const naarBesluit: Readonly<Record<string, Besluit>> = {
        GOEDGEKEURD: "goedgekeurd",
        AFGEKEURD: "afgewezen",
        AANGEPAST: "herziening_gevraagd",
      };

      /* DE WEBSITEVERSIE WORDT HIER GEMETEN, NIET MEEGESTUURD.
         beoordeel() legt bij een goedkeuring vast op WELKE versie van de
         website is goedgekeurd (migratie 0033), zodat publicatiePrecheck
         later twee ONAFHANKELIJKE waarden kan vergelijken. Kwam die
         versie uit het formulier, dan kon een client hem gelijk maken
         aan de huidige en de controle zinloos maken.

         Zonder bruikbaar artefact weigeren we. Een goedkeuring zonder
         vastgelegde websiteversie is een goedkeuring waarvan later niet
         te zeggen is waarop ze gold. */
      const kennisVoorBesluit = await leesSitekennis(INTEL_WORTEL);
      if (!kennisVoorBesluit.ok) {
        weiger(
          res,
          409,
          `Het sitekennisartefact is onbruikbaar (${kennisVoorBesluit.fout.soort}): ` +
            `${kennisVoorBesluit.fout.bericht} Er is niets beoordeeld.`,
        );
        return;
      }
      const websiteVersie = kennisVoorBesluit.kennis.websiteVersie;

      try {
        await alsGebruiker(req, async (c) => {
          /* VIA beoordeel(), niet met een eigen update.
             Deze route schreef eerder zelf `beoordeling` weg. Dat legde
             vast DAT er was goedgekeurd maar niet WAAROP, en het zette
             de publicatiestatus niet. Daarmee kon een goedkeuring op een
             herbouwd voorstel blijven staan — precies het gat dat par.
             15 dicht. Eén pad voor alle beoordelingen, zodat de binding
             niet van de aanroeper afhangt. */
          const uitslag = await beoordeel(c, req.gebruiker!.organisatieId, {
            voorstelId: id,
            besluit: naarBesluit[besluit]!,
            gebruikerId,
            notitie: notitie || null,
            verwachteHash: gezienHash,
            websiteVersie,
          });
          const rij = { kandidaat_id: uitslag.voorstelId, eindoordeel: uitslag.statusNa };
          /* Het auditspoor draagt WIE, WAT en WAAROM. Niet in een catch:
             een beoordeling zonder spoor hoort niet te bestaan, dus als
             dit faalt, faalt de hele transactie. */
          await c.query(
            `insert into intel.audit_gebeurtenissen
               (organisatie_id, actor_soort, actor_id, actor_naam, handeling,
                objectsoort, object_id, na_waarde, herkomst, motivatie)
             values ($1, 'mens', $2, $3, $4, 'inhoud_voorstel', $5, $6, 'dashboard', $7)`,
            [
              req.gebruiker?.organisatieId ?? null,
              gebruikerId,
              req.gebruiker?.naam ?? "onbekend",
              `voorstel_${besluit.toLowerCase()}`,
              id,
              JSON.stringify({ beoordeling: besluit, kandidaat: rij.kandidaat_id, eindoordeel: rij.eindoordeel }),
              notitie || null,
            ],
          );
        });
      } catch (e) {
        const bericht = (e as Error).message;
        /* De databasegrendel die alleen KLAAR_VOOR_REVIEW laat
           goedkeuren, hoort als UITLEG terug te komen en niet als 500. */
        /* Een conflict is geen storing maar een bericht: de inhoud is
           veranderd terwijl de beoordelaar keek. Dat hoort hij te
           lezen, niet als 500 te krijgen. */
        if (/gewijzigd sinds u het opende/.test(bericht)) {
          weiger(res, 409, bericht);
          return;
        }
        if (/is niet goed te keuren|geen actief account|geen inhoudshash/.test(bericht)) {
          weiger(res, 409, bericht);
          return;
        }
        /* AUTORISATIE IS 403, GEEN 500.
           beoordeel() toetst sinds 3.0.4 het recht zelf tegen
           intel.rol_rechten en verzwaart naar inhoud.hoogrisico.
           goedkeuren bij een gebeurtenis met risicoklasse hoog. Die twee
           weigeringen vielen hier in de 500-tak: de gebruiker kreeg "De
           beoordeling kon niet worden vastgelegd" terwijl het antwoord
           was dat hij er het recht niet voor heeft. Dat is zowel
           verwarrend als een verkeerde statuscode. */
        if (/recht inhoud\.(hoogrisico\.)?goedkeuren ontbreekt|mag geen redactioneel besluit nemen|vraagt het recht/.test(bericht)) {
          weiger(res, 403, bericht);
          return;
        }
        /* Een onbekend voorstel-id is een 404 en geen storing. */
        if (/bestaat niet/.test(bericht)) {
          weiger(res, 404, bericht);
          return;
        }
        if (/voorstel_alleen_review_goedkeuren/.test(bericht)) {
          weiger(
            res,
            409,
            "Dit voorstel is niet klaar voor beoordeling en kan dus niet worden goedgekeurd. " +
              "Alleen een voorstel dat alle vijf de controles haalt, of een linkvoorstel, mag door.",
          );
          return;
        }
        log.fout("beoordeling mislukt", { voorstel: id, fout: e });
        weiger(res, 500, "De beoordeling kon niet worden vastgelegd.");
        return;
      }

      log.info("voorstel beoordeeld", { voorstel: id, beoordeling: besluit, door: gebruikerId });
      res.redirect(303, "/studio");
    }),
  );

  /* ---------------- gezondheid en gereedheid ----------------
     Twee endpoints met een ANDERE betekenis, en dat verschil is geen
     formaliteit:

     /gezond   (liveness) — leeft het proces? Raakt de database NIET
               aan. Zou dit een databasecheck doen, dan zou een korte
               databasestoring de orchestrator het proces laten
               herstarten, en een herstart lost een databasestoring
               niet op; het maakt hem erger door de verbindingen weg
               te gooien.

     /gereed   (readiness) — kan dit proces verkeer aan? Checkt de
               database wél, met een korte timeout. Faalt dit, dan
               hoort de load balancer even geen verkeer te sturen
               zonder het proces te doden. */
  app.get("/gezond", (_req, res) => {
    res.json({
      ok: true,
      dienst: "intelligence-dashboard",
      omgeving: configLezen().omgeving,
      op: new Date().toISOString(),
      uptime_s: Math.round(process.uptime()),
    });
  });

  app.get("/gereed", async_(async (req: MetCorrelatie, res) => {
    const begin = performance.now();
    try {
      await Promise.race([
        zonderOrganisatie(pool, (c) => c.query("select 1")),
        new Promise((_v, af) => setTimeout(() => af(new Error("databasecheck boven 2000 ms")), 2000)),
      ]);
      res.json({
        gereed: true,
        database: "bereikbaar",
        duur_ms: Math.round(performance.now() - begin),
      });
    } catch (e) {
      log.waarschuwing("gereedheidscheck mislukt", {
        verzoek_id: req.correlatieId,
        fout: e instanceof Error ? e.message : String(e),
      });
      res.status(503).json({
        gereed: false,
        database: "onbereikbaar",
        duur_ms: Math.round(performance.now() - begin),
      });
    }
  }));

  // ---------------- overzicht ----------------

  app.get("/", async_(vereistInlog), vereistRecht("inhoud.lezen"), async_(async (req: MetGebruiker, res) => {
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
  }));

  // ---------------- market radar ----------------

  app.get("/radar", async_(vereistInlog), vereistRecht("inhoud.lezen"), async_(async (req: MetGebruiker, res) => {
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
        relevantie: number | null;
        categorie: string | null;
        vertrouwen: number | null;
        risico: string;
        bronnen: number;
        tegenspraak: boolean;
        gebeurd_op: Date | null;
        onderwerp: string | null;
      }>(
        c,
        /* DE SORTERING IS HET HELE PUNT.
           Dit stond op `order by g.materialiteit desc`, en materialiteit
           meet hoe ZWAAR een publicatie is: vijf van zijn zes assen
           beschrijven de bron en het bewijs. Gevolg, gemeten in
           productie: een wetsvoorstel over maritieme handhaving
           (materialiteit 61) stond boven een echte aanbesteding (56).

           Bedrijfsrelevantie gaat nu voor. Materialiteit blijft ernaast
           staan, zichtbaar, want de twee meten verschillende dingen en
           juist dat verschil is wat een lezer nodig heeft.
           Gebeurtenissen zonder relevantie (nog niet geclassificeerd)
           zakken naar onderen in plaats van bovenaan te blijven staan. */
        `select g.id, g.titel, g.gebeurtenis_soort as soort, g.materialiteit,
                g.bedrijfsrelevantie as relevantie,
                g.relevantie_categorie as categorie,
                g.relevantie_vertrouwen as vertrouwen,
                g.risico_klasse as risico, g.aantal_bronnen as bronnen,
                g.heeft_tegenspraak as tegenspraak, g.gebeurd_op,
                oc.sleutel as onderwerp
           from intel.markt_gebeurtenissen g
           left join intel.onderwerp_clusters oc on oc.id = g.onderwerp_cluster_id
          where g.status <> 'afgewezen'
          order by g.bedrijfsrelevantie desc nulls last, g.materialiteit desc, g.id
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

<h2>Gebeurtenissen, hoogste bedrijfsrelevantie eerst</h2>
<p class="uitleg"><strong>Relevantie</strong> meet of iets ons aangaat; <strong>materialiteit</strong>
meet hoe zwaar de publicatie is. Twee aparte assen, want ze lopen uiteen: een wetsvoorstel kan zwaar
zijn en ons niet aangaan. <strong>Vertrouwen</strong> zegt hoe hard het bewijs is — een aanbesteding
zonder brontekst is relevant met een laag vertrouwen, en dat is iets anders dan niet relevant.</p>
${tabel(
  ["Rel.", "Categorie", "Vert.", "Mat.", "Soort", "Onderwerp", "Titel", "Bronnen", "Risico", "Datum"],
  d.gebeurtenissen.map((g) => [
    g.relevantie === null
      ? '<span class="onbekend">N.N.G.</span>'
      : `<span class="num${g.relevantie >= 50 ? " dringend" : ""}">${g.relevantie}</span>`,
    g.categorie
      ? esc(RELEVANTIE_LABEL[g.categorie] ?? g.categorie)
      : '<span class="onbekend">niet geclassificeerd</span>',
    g.vertrouwen === null ? '<span class="onbekend">?</span>' : `<span class="num">${g.vertrouwen}</span>`,
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
  }));

  // ---------------- content studio ----------------

  app.get("/studio", async_(vereistInlog), vereistRecht("inhoud.lezen"), async_(async (req: MetGebruiker, res) => {
    /* DE STAND VAN DE SITEKENNIS, BOVEN ALLES.
       Par. 12: nul voorstellen mag nooit als 'gezond' worden getoond
       terwijl de pijplijn de website niet kan zien. Dat was precies de
       situatie in productie: Content Studio was leeg en zag er rustig
       uit, terwijl de oorzaak was dat /app/kennis niet bestond. */
    const kennisStand = await leesSitekennis(INTEL_WORTEL);
    const csrf = maakCsrfToken(sessieGeheim());
    zetCsrfKoekje(res, csrf);

    /* WIE NIET MAG GOEDKEUREN, KRIJGT GEEN GOEDKEURKNOP.
       Gevonden door de browsertoets van 3.0.6: een gebruiker met alleen
       `inhoud.lezen` zag het volledige goedkeurformulier. De server
       weigerde het besluit wel — de HTTP-toets bewijst 403 — dus het was
       geen beveiligingslek, maar wel precies de misleidende actie die
       par. 14 verbiedt: een knop die bij elke klik faalt.

       De grendel blijft op de server staan; dit is de weergave die zich
       eraan houdt. */
    const magGoedkeuren = req.gebruiker?.rechten.has("inhoud.goedkeuren") ?? false;

    const d = await alsGebruiker(req, async (c) => ({
      /* WIJZIGINGSVOORSTELLEN op bestaande pagina's, met hun vier
         controles. Dit is wat op een mens wacht; het staat boven de
         conceptversies omdat het de enige lijst is waar iemand iets
         mee moet. */
      voorstellen: await rijen<{
        id: string;
        kandidaat_id: number;
        doel_pad: string | null;
        titel: string;
        eindoordeel: string;
        oordeel_reden: string;
        nieuwe_tekst: string | null;
        doel_sectie: string | null;
        doel_voorbehoud: string | null;
        noemt: number;
        cta_tekst: string | null;
        huidige_tekst: string | null;
        interne_links: string[];
        wijziging_soort: string;
        beoordeling: string | null;
        beoordeling_notitie: string | null;
        beoordeeld_op: string | null;
        beoordelaar: string | null;
        publicatie_status: string;
        /** Het paginavoorstel; alleen gevuld bij eindoordeel NIEUWE_PAGINA. */
        nieuwe_pagina: {
          slug?: string;
          soort?: string;
          werktitel?: string;
          hoofdonderwerp?: string;
          zoekintentie?: string;
          doelgroep?: string;
          voorgesteldeStructuur?: string[];
          naastgelegenPaginas?: { route: string; vermeldingen: number }[];
          waaromGeenBestaandePagina?: string;
          duplicaatrisico?: string;
        } | null;
        inhouds_hash: string | null;
        goedgekeurd_hash: string | null;
        precheck_uitslag: string | null;
        controles: { naam: string; oordeel: string; reden: string }[];
        besluiten: { besluit: string; door: string; op: string; hash: string; notitie: string | null }[];
      }>(
        c,
        `select v.id::text, v.kandidaat_id, v.doel_pad, g.titel, v.eindoordeel,
                v.oordeel_reden, v.nieuwe_tekst, v.doel_sectie, v.doel_voorbehoud,
                v.doel_noemt_onderwerp as noemt, v.cta_tekst, v.beoordeling,
                v.huidige_tekst, v.interne_links, v.wijziging_soort,
                v.beoordeling_notitie, v.beoordeeld_op::text as beoordeeld_op,
                gb.naam as beoordelaar,
                v.publicatie_status,
                v.nieuwe_pagina, v.inhouds_hash, v.goedgekeurd_hash, v.precheck_uitslag,
                /* HET AUDITSPOOR PER VOORSTEL (par. 14). Nieuwste eerst,
                   begrensd zodat een lange geschiedenis de pagina niet
                   onleesbaar maakt. */
                coalesce((select json_agg(json_build_object(
                            'besluit', b.besluit, 'door', b.door,
                            'op', b.op::text, 'hash', b.inhouds_hash,
                            'notitie', b.notitie) order by b.op desc)
                            from (select * from intel.voorstel_beoordelingen bb
                                   where bb.voorstel_id = v.id
                                   order by bb.op desc limit 8) b), '[]'::json) as besluiten,
                coalesce((select json_agg(json_build_object(
                            'naam', ct.naam, 'oordeel', ct.oordeel, 'reden', ct.reden)
                          order by ct.naam)
                            from intel.inhoud_voorstel_controles ct
                           where ct.voorstel_id = v.id), '[]'::json) as controles
           from intel.inhoud_voorstellen v
           join intel.markt_gebeurtenissen g on g.id = v.gebeurtenis_id
           left join intel.gebruikers gb on gb.id = v.beoordeeld_door
          order by case v.eindoordeel
                     when 'KLAAR_VOOR_REVIEW' then 0 when 'UITSTELLEN' then 1
                     when 'HERROUTEREN' then 2 else 3 end,
                   v.kandidaat_id
          limit 40`,
      ),
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

<h2>Sitekennis — kan de pijplijn de website zien?</h2>
${
  kennisStand.ok
    ? `<table class="paren">
         <tr><th>Stand</th><td><strong>GELDIG</strong></td></tr>
         <tr><th>Gepubliceerde pagina's</th><td><span class="num">${kennisStand.kennis.aantalPaginas}</span></td></tr>
         <tr><th>Websiteversie</th><td><code>${esc(kennisStand.kennis.websiteVersie.slice(0, 16))}</code></td></tr>
         <tr><th>Inhoudshash</th><td><code>${esc(kennisStand.kennis.inhoudsHash.slice(0, 16))}</code></td></tr>
         <tr><th>Schema</th><td>${kennisStand.kennis.schema}</td></tr>
       </table>`
    : `<p class="uitleg" style="border-left:3px solid #a11;padding-left:10px">
         <strong>SITEKENNIS ONBRUIKBAAR (${esc(kennisStand.fout.soort)})</strong><br>
         ${esc(kennisStand.fout.bericht)}<br>
         <strong>Zolang dit zo is, zijn de voorstellen hieronder niet betrouwbaar</strong>: zonder
         kennis van de bestaande pagina's kan de besluitmotor geen doelpagina vinden en stelt hij
         voor elk onderwerp een nieuw artikel voor. Nul voorstellen betekent hier dus niet
         "geen kansen" maar "ik kan de website niet zien".
       </p>`
}

<h2>Wijzigingsvoorstellen — wachten op beoordeling</h2>
<p class="uitleg">Voorstellen om een <strong>bestaande</strong> pagina te wijzigen. Elk voorstel is
op vier punten gecontroleerd: bronverwijzing, actualiteit, duplicatie en SEO. Een voorstel dat er
niet door komt krijgt geen tekst maar een reden.
<strong>Er wordt niets gepubliceerd</strong>: goedkeuren levert een patch op die een mens doorvoert.</p>

${(() => {
  /* DRIE BAKKEN, NIET TWEE.
     Tot 3.0.4 stond een linkvoorstel in dezelfde bak als een feitelijke
     paginarevisie, onder een kop die beloofde dat alle vijf de controles
     waren gehaald. Dat was precies niet zo: de verwoordbaarheid was
     gefaald. De scheiding is nu zichtbaar in de studio, zodat een
     beoordelaar weet waar hij naar kijkt. */
  const klaar = d.voorstellen.filter((v) => v.eindoordeel === "KLAAR_VOOR_REVIEW" && !v.beoordeling);
  const klaarLink = d.voorstellen.filter(
    (v) => v.eindoordeel === "KLAAR_VOOR_LINKREVIEW" && !v.beoordeling,
  );
  /* NIEUW IN 3.0.6. Een paginavoorstel is geen revisie van een
     bestaande pagina en hoort dus niet in dezelfde bak. Zie
     inhoud/nieuwepagina.ts: dit is een VOORSTEL, geen pagina. */
  const klaarNieuw = d.voorstellen.filter(
    (v) => v.eindoordeel === "NIEUWE_PAGINA" && !v.beoordeling,
  );
  const rest = d.voorstellen.filter(
    (v) =>
      !(v.eindoordeel === "KLAAR_VOOR_REVIEW" && !v.beoordeling) &&
      !(v.eindoordeel === "KLAAR_VOOR_LINKREVIEW" && !v.beoordeling) &&
      !(v.eindoordeel === "NIEUWE_PAGINA" && !v.beoordeling),
  );
  const kaart = (v: (typeof d.voorstellen)[number]) => `
<details${v.eindoordeel === "KLAAR_VOOR_REVIEW" ? " open" : ""}>
  <summary><strong>${esc(VOORSTEL_LABEL[v.eindoordeel] ?? v.eindoordeel)}</strong>
    — ${esc(v.titel.slice(0, 74))}
    ${v.beoordeling ? `<span class="klein">(beoordeeld: ${esc(v.beoordeling)})</span>` : ""}</summary>
  <p class="klein">kandidaat ${v.kandidaat_id} · doelpagina
    ${v.doel_pad ? `<code>${esc(v.doel_pad)}</code>` : '<span class="onbekend">ONBEKEND</span>'}
    · de pagina noemt het onderwerp ${v.noemt} keer</p>
  <p><strong>Oordeel:</strong> ${esc(v.oordeel_reden)}</p>
  ${
    /* HET VOORSTEL VOOR EEN NIEUWE PAGINA (par. 12).
       Een redacteur moet hier kunnen zien WAT wordt voorgesteld en
       waarom geen bestaande pagina volstaat, zonder de database in te
       hoeven. De werktitel kondigt zich als werktitel aan: dit platform
       schrijft geen koppen. */
    v.nieuwe_pagina
      ? `<div class="kader">
           <p><strong>Voorstel voor een NIEUWE pagina</strong> — dit is een voorstel, geen pagina.
              Er wordt niets aangemaakt zonder dat een mens erover besluit.</p>
           <table>
             <tr><th>voorgestelde route</th><td><code>/${esc(v.nieuwe_pagina.slug ?? "")}</code></td></tr>
             <tr><th>soort</th><td>${esc(v.nieuwe_pagina.soort ?? "")}</td></tr>
             <tr><th>werktitel</th><td>${esc(v.nieuwe_pagina.werktitel ?? "")}</td></tr>
             <tr><th>hoofdonderwerp</th><td>${esc(v.nieuwe_pagina.hoofdonderwerp ?? "")}</td></tr>
             <tr><th>zoekintentie</th><td>${esc(v.nieuwe_pagina.zoekintentie ?? "")}</td></tr>
             <tr><th>doelgroep</th><td>${esc(v.nieuwe_pagina.doelgroep ?? "")}</td></tr>
             <tr><th>voorgestelde structuur</th><td>${(v.nieuwe_pagina.voorgesteldeStructuur ?? [])
               .map((x) => esc(x))
               .join(" · ")}</td></tr>
             <tr><th>waarom geen bestaande pagina</th><td>${esc(
               v.nieuwe_pagina.waaromGeenBestaandePagina ?? "",
             )}</td></tr>
             <tr><th>naastgelegen pagina's</th><td>${(v.nieuwe_pagina.naastgelegenPaginas ?? [])
               .map((x) => `<code>${esc(x.route)}</code> (${x.vermeldingen})`)
               .join(", ")}</td></tr>
             <tr><th>duplicaatrisico</th><td>${esc(v.nieuwe_pagina.duplicaatrisico ?? "")}</td></tr>
           </table>
         </div>`
      : ""
  }
  ${v.nieuwe_tekst
    ? `<p class="klein">Soort wijziging: <strong>${esc(v.wijziging_soort)}</strong>${
        v.doel_sectie ? ` in sectie &ldquo;${esc(v.doel_sectie)}&rdquo;` : ""
      }</p>
       ${v.huidige_tekst
         ? `<p class="klein">Wat er nu staat:</p><pre class="diff" style="border-left-color:#999;background:#f6f6f6">${esc(v.huidige_tekst)}</pre>`
         : ""}
       <p class="klein">Voorgesteld:</p>
       <pre class="diff">+ ${esc(v.nieuwe_tekst)}</pre>
       ${v.interne_links.length > 0
         ? `<p class="klein">Aanbevolen interne links:</p><ul class="klein">${v.interne_links
             .map((l) => `<li><code>${esc(l)}</code></li>`)
             .join("")}</ul>`
         : ""}`
    : `<p class="klein">Geen tekst voorgesteld: dit voorstel haalde de controles niet.</p>`}
  ${v.doel_voorbehoud
    ? `<p class="klein">Voorbehoud dat de doelpagina zelf publiceert:<br><em>${esc(v.doel_voorbehoud.slice(0, 260))}</em></p>`
    : ""}
  ${v.cta_tekst ? `<p class="klein">CTA: &ldquo;${esc(v.cta_tekst)}&rdquo;</p>` : ""}
  <table class="paren">
    ${v.controles
      .map(
        (ct) =>
          `<tr><th>${esc(ct.naam)}</th><td><strong>${esc(ct.oordeel)}</strong>
             <div class="klein">${esc(ct.reden)}</div></td></tr>`,
      )
      .join("")}
  </table>
  <table class="paren">
    <tr><th>publicatiestatus</th><td><strong>${esc(v.publicatie_status)}</strong>
      <div class="klein">${esc(PUBLICATIE_UITLEG[v.publicatie_status] ?? "")}</div></td></tr>
    <tr><th>inhoudshash</th><td><code>${esc((v.inhouds_hash ?? "geen").slice(0, 16))}</code>
      <div class="klein">${
        v.goedgekeurd_hash === null
          ? "nog geen goedkeuring aan een hash gebonden"
          : v.goedgekeurd_hash === v.inhouds_hash
            ? `goedkeuring gebonden aan deze inhoud (${esc(v.goedgekeurd_hash.slice(0, 16))})`
            : `GOEDKEURING VERVALLEN: goedgekeurd op ${esc(v.goedgekeurd_hash.slice(0, 16))}, de inhoud is daarna gewijzigd. Er is een nieuwe beoordeling nodig.`
      }</div></td></tr>
    ${v.precheck_uitslag ? `<tr><th>publicatiecontrole</th><td><strong>${esc(v.precheck_uitslag)}</strong></td></tr>` : ""}
  </table>
  ${v.besluiten.length > 0
    ? `<p class="klein">Beoordelingsgeschiedenis:</p>
       <table class="paren">${v.besluiten
         .map(
           (b) =>
             `<tr><th>${esc(b.op.slice(0, 16))}</th><td><strong>${esc(b.besluit)}</strong>
                door ${esc(b.door)} op inhoud <code>${esc(b.hash.slice(0, 12))}</code>
                ${b.notitie ? `<div class="klein">${esc(b.notitie)}</div>` : ""}</td></tr>`,
         )
         .join("")}</table>`
    : ""}
  ${v.beoordeling && v.goedgekeurd_hash === v.inhouds_hash
    ? `<p class="klein">Beoordeeld als <strong>${esc(v.beoordeling)}</strong> op
         ${esc(v.beoordeeld_op?.slice(0, 16) ?? "")} door ${esc(v.beoordelaar ?? "onbekend")}.
         ${v.beoordeling_notitie ? `<br>Notitie: ${esc(v.beoordeling_notitie)}` : ""}</p>`
    : /* OOK EEN LINKVOORSTEL IS BEOORDEELBAAR.
         Deze test stond op `=== "KLAAR_VOOR_REVIEW"`, en daarmee was de
         weergave het oneens met de backend: beoordeel() laat sinds 3.0.4
         ook KLAAR_VOOR_LINKREVIEW goedkeuren en migratie 0032 verruimde
         de databasegrendel er expliciet voor. Het formulier ontbrak dus
         voor precies het soort voorstel dat 0032 heeft ingevoerd — een
         besluit dat volgens de regels mag, maar waarvoor geen knop
         bestond. Par. 14 eist dat database, poort, API en weergave het
         eens zijn; dit was de enige plek waar dat niet zo was. */
      (v.eindoordeel === "KLAAR_VOOR_REVIEW" ||
        v.eindoordeel === "KLAAR_VOOR_LINKREVIEW" ||
        /* Ook een paginavoorstel is een besluit dat een mens neemt;
           migratie 0035 verruimde de databasegrendel er expliciet voor.
           Zonder deze tak was NEW_PAGE_CANDIDATE een doodlopende weg —
           dezelfde val als bij het linkvoorstel in 0032. */
        v.eindoordeel === "NIEUWE_PAGINA") &&
        v.inhouds_hash &&
        magGoedkeuren
      ? `<form method="post" action="/voorstellen/${esc(v.id)}/beoordeel">
           <input type="hidden" name="${esc(CSRF_VELD)}" value="${esc(csrf)}">
           <!-- Par. 15: het besluit bindt aan de inhoud die hier staat.
                Wordt het voorstel herbouwd terwijl dit scherm open is,
                dan weigert de server het besluit in plaats van het op
                de nieuwe tekst te plakken. -->
           <input type="hidden" name="inhouds_hash" value="${esc(v.inhouds_hash)}">
           <p class="klein"><label>Notitie (verplicht bij afkeuren of herzien)<br>
             <textarea name="notitie" rows="2" style="width:100%;max-width:640px"></textarea></label></p>
           <button type="submit" name="beoordeling" value="GOEDGEKEURD">Goedkeuren</button>
           <button type="submit" name="beoordeling" value="AANGEPAST">Herziening vragen</button>
           <button type="submit" name="beoordeling" value="AFGEKEURD">Afkeuren</button>
           <p class="klein">Goedkeuren publiceert niets: het levert een patch op die een mens doorvoert.</p>
         </form>`
      : !magGoedkeuren &&
          (v.eindoordeel === "KLAAR_VOOR_REVIEW" ||
            v.eindoordeel === "KLAAR_VOOR_LINKREVIEW" ||
            v.eindoordeel === "NIEUWE_PAGINA")
        ? `<p class="klein">U kunt dit voorstel lezen maar niet beoordelen: dat vraagt het recht
             <code>inhoud.goedkeuren</code>.</p>`
        : v.eindoordeel === "KLAAR_VOOR_REVIEW"
        ? `<p class="klein">Niet beoordeelbaar: dit voorstel heeft geen inhoudshash, dus er is
             niets om een goedkeuring aan te binden. Draai de voorstelronde opnieuw.</p>`
        : `<p class="klein">Niet beoordeelbaar: alleen een feitelijke revisie die alle vijf de controles haalt, of een linkvoorstel,
             kan worden goedgekeurd.</p>`}
</details>`;
  return `
<p><strong>${klaar.length}</strong> feitelijke paginarevisie(s) klaar voor beoordeling,
<strong>${klaarLink.length}</strong> linkvoorstel(len),
<strong>${klaarNieuw.length}</strong> voorstel(len) voor een NIEUWE pagina, en
<strong>${rest.length}</strong> met een onderbouwde afwijzing of omleiding.</p>
${klaar.map(kaart).join("")}
${klaarLink.length > 0
  ? `<details open><summary>Linkvoorstellen (${klaarLink.length}) — GEEN feitelijke revisie: het feit was niet te verwoorden, de linkaanbeveling wel onderbouwd</summary>${klaarLink.map(kaart).join("")}</details>`
  : ""}
${klaarNieuw.length > 0
  ? `<details open><summary>Voorstellen voor een NIEUWE pagina (${klaarNieuw.length}) — geen bestaande pagina dekt dit onderwerp; dit zijn VOORSTELLEN, er wordt niets aangemaakt</summary>${klaarNieuw.map(kaart).join("")}</details>`
  : ""}
${rest.length > 0
  ? `<details><summary>Niet doorgezet (${rest.length}) — met reden</summary>${rest.map(kaart).join("")}</details>`
  : ""}`;
})()}

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
  }));

  /* ----------------------------------------------------------------
     CONCEPTDETAIL — het concept LEZEN, zijn bronnen OPENEN, zijn
     SEO-metadata BEKIJKEN, en het daarna aanpassen, afwijzen of
     goedkeuren.
     ----------------------------------------------------------------
     WAAROM DEZE PAGINA ER NIET WAS, EN WAAROM DAT ERGER IS DAN HET
     LIJKT.

     /studio toont een TABEL met id, pad, soort, status, poorten,
     risico, kernclaims, bronnen en auteur. Gemeten: `body_markdown` en
     `body_html` komen in heel dashboard/server.ts niet voor, en
     `meta_omschrijving`, `canonieke_url` en `structured_data` evenmin.
     Een beoordelaar kon de TEKST van een concept dus niet lezen en de
     SEO-metadata niet bekijken — hij zag alleen of de poorten groen
     waren.

     Dat maakt elke goedkeuring een blinde. §9 van de opdracht eist een
     EXPLICIETE goedkeuringshandeling door een bevoegde mens; een
     handeling op inhoud die je niet kunt zien is dat niet.

     DEZE PAGINA PUBLICEERT NIETS. Goedkeuren zet de status op
     'goedgekeurd' en bindt de afdruk; daarna is er nog een
     `npm run publiceer`, een generatorrun, een commit en een push
     nodig — alle vier menselijk. */
  app.get(
    "/studio/:id",
    async_(vereistInlog),
    vereistRecht("inhoud.lezen"),
    async_(async (req: MetGebruiker, res) => {
      const id = String(req.params["id"] ?? "");
      if (!/^\d+$/.test(id)) {
        weiger(res, 400, "Ongeldig conceptnummer.");
        return;
      }
      const csrf = maakCsrfToken(sessieGeheim());
      zetCsrfKoekje(res, csrf);

      const magGoedkeuren = req.gebruiker?.rechten.has("inhoud.goedkeuren") ?? false;
      const magBewerken = req.gebruiker?.rechten.has("inhoud.concept") ?? false;

      const d = await alsGebruiker(req, async (c) => {
        const versie = await eenRij<{
          id: number;
          pad: string;
          titel: string;
          meta_omschrijving: string | null;
          canonieke_url: string;
          direct_antwoord: string | null;
          body_markdown: string;
          structured_data: unknown;
          interne_links: string[] | null;
          bronnen_sectie: { uitgever: string; url: string; datum: string | null }[] | null;
          cta_sleutel: string | null;
          soort: string;
          status: string;
          risico: string;
          poorten: boolean;
          blokkades: string[];
          poortresultaten: unknown;
          model: string | null;
          auteur_soort: string;
          inhoud_afdruk: string | null;
          aangemaakt_door: number | null;
          bewerkt_door: number | null;
          goedgekeurd_door: number | null;
          goedkeurder: string | null;
          goedgekeurd_op: string | null;
          kandidaat_id: number | null;
          nieuwsscore: number | null;
          nieuws_oordeel: string | null;
          beoordeling: unknown;
        }>(
          c,
          `select v.id, v.pad, v.titel, v.meta_omschrijving, v.canonieke_url,
                  v.direct_antwoord, v.body_markdown, v.structured_data,
                  v.interne_links, v.bronnen_sectie, v.cta_sleutel,
                  v.soort, v.status, v.risico_klasse as risico,
                  v.poorten_geslaagd as poorten, v.blokkades, v.poortresultaten,
                  v.model, v.auteur_soort, v.inhoud_afdruk,
                  v.aangemaakt_door, v.bewerkt_door, v.goedgekeurd_door,
                  g.naam as goedkeurder,
                  v.goedgekeurd_op::text as goedgekeurd_op,
                  v.kandidaat_id,
                  k.nieuwsscore, k.nieuws_oordeel, k.beoordeling
             from intel.inhoud_versies v
             left join intel.gebruikers g on g.id = v.goedgekeurd_door
             left join intel.inhoud_kandidaten k on k.id = v.kandidaat_id
            where v.id = $1`,
          [Number(id)],
        );
        if (!versie) return { versie: null, uitspraken: [] as never[] };

        /* DE GEBONDEN UITSPRAKEN MÉT HUN BRON-URL.
           Dit is de 'bronnen controleren'-eis: een beoordelaar moet de
           bron kunnen OPENEN, niet alleen een PASS/FAIL over bronnen
           lezen. De URL komt van het brondocument, niet uit de tekst. */
        const uitspraken = await rijen<{
          id: number;
          rol: string;
          soort: string;
          tekst: string;
          waarde: string | null;
          eenheid: string | null;
          status: string;
          kwaliteit: number | null;
          uitgever: string | null;
          bron_url: string | null;
          bron_titel: string | null;
          bron_datum: string | null;
          injectie: boolean | null;
          documentsoort: string | null;
          gezag: string | null;
          besluit_van: string | null;
          soort_uitleg: string | null;
          modaliteit: string | null;
          zekerheid: string | null;
          mod_uitleg: string | null;
          plafond: number | null;
          origineel_gezien: boolean | null;
        }>(
          c,
          `select u.id, iu.rol, u.soort, u.tekst,
                  u.waarde_numeriek as waarde, u.eenheid,
                  u.verificatie_status as status, u.bewijs_kwaliteit as kwaliteit,
                  bd.uitgever, bd.canonieke_url as bron_url, bd.titel as bron_titel,
                  coalesce(bd.gepubliceerd_op, bv.opgehaald_op)::date::text as bron_datum,
                  bv.injectie_verdacht as injectie,
                  /* R3 — de hele keten in één rij: welke soort document, welk
                     gezag, welke modaliteit, en of het origineel is
                     teruggevonden. Zonder deze velden ziet een redacteur
                     'bevestigd, kwaliteit 5' en niet WAAROM. */
                  bv.documentsoort, bv.documentsoort_gezag as gezag,
                  bv.beschrijft_besluit_van as besluit_van,
                  bv.documentsoort_grondslag->>'uitleg' as soort_uitleg,
                  u.modaliteit, u.modaliteit_zekerheid::text as zekerheid,
                  u.modaliteit_grondslag->>'uitleg' as mod_uitleg,
                  u.bewijskracht_plafond as plafond,
                  u.primaire_bron_bevestigd as origineel_gezien
             from intel.inhoud_uitspraken iu
             join intel.uitspraken u on u.id = iu.uitspraak_id
             left join intel.uitspraak_bronnen ub
                    on ub.uitspraak_id = u.id and ub.rol = 'primair'
             left join intel.brondocument_versies bv on bv.id = ub.versie_id
             left join intel.brondocumenten bd on bd.id = bv.brondocument_id
            where iu.inhoud_versie_id = $1
            order by iu.rol, u.id`,
          [Number(id)],
        );
        return { versie, uitspraken };
      });

      if (!d.versie) {
        weiger(res, 404, "Dit concept bestaat niet.");
        return;
      }
      const v = d.versie;

      /* De poortuitslag per poort, niet alleen het totaal. Een
         beoordelaar hoort te zien WELKE poort blokkeert. */
      const poorten = Array.isArray(v.poortresultaten)
        ? (v.poortresultaten as {
            poort: string;
            geslaagd: boolean;
            ernst: string;
            bevindingen: string[];
          }[])
        : [];

      const nieuwsAssen = (() => {
        const b = v.beoordeling as { nieuws?: { assen?: unknown } } | null;
        const assen = b?.nieuws?.assen;
        return Array.isArray(assen)
          ? (assen as {
              as: string;
              score: number;
              max: number;
              componenten: { naam: string; score: number; max: number; bewijs: string }[];
            }[])
          : [];
      })();

      const statusVlag =
        v.status === "goedgekeurd"
          ? vlag(v.status, "ok")
          : v.status === "ingetrokken"
            ? vlag(v.status, "fout")
            : vlag(v.status, "waarschuwing");

      /* HET FORMULIER DRAAGT DE AFDRUK DIE DE BEOORDELAAR ZAG.
         Zelfde grendel als bij een voorstel: wijkt de afdruk bij het
         indienen af van wat er dan in de rij staat, dan is de tekst
         ondertussen gewijzigd en wordt het besluit geweigerd in plaats
         van op de nieuwe tekst geplakt. */
      const afdrukVeld = `<input type="hidden" name="inhoud_afdruk" value="${esc(v.inhoud_afdruk ?? "")}">`;
      const csrfVeld = `<input type="hidden" name="${CSRF_VELD}" value="${esc(csrf)}">`;

      res.type("text/html; charset=utf-8").send(
        pagina({
          titel: `Concept ${v.id}`,
          huidigPad: "/studio",
          gebruiker: req.gebruiker ?? null,
          inhoud: `
<p><a href="/studio">&larr; terug naar Content Studio</a></p>
<h1>${esc(v.titel)}</h1>
<p class="bij">
  ${statusVlag}
  ${v.poorten ? vlag("poorten geslaagd", "ok") : vlag(`${v.blokkades.length} blokkade(s)`, "fout")}
  ${vlag(`risico ${v.risico}`, v.risico === "hoog" ? "fout" : "")}
  ${vlag(`auteur ${v.auteur_soort}`, "")}
  ${v.nieuwsscore !== null ? vlag(`nieuwswaarde ${v.nieuwsscore}/100`, "") : ""}
</p>

<h2>Redactionele stand</h2>
${tabel(
  ["Veld", "Waarde"],
  [
    ["Pad", `<code>${esc(v.pad)}</code>`],
    ["Soort", esc(v.soort)],
    ["Status", statusVlag],
    ["Model", esc(v.model ?? "deterministisch")],
    [
      "Goedgekeurd door",
      v.goedgekeurd_door === null
        ? vlag("nog niet goedgekeurd", "waarschuwing")
        : `${esc(v.goedkeurder ?? String(v.goedgekeurd_door))} op ${esc(v.goedgekeurd_op ?? "?")}`,
    ],
    [
      "Vier ogen",
      /* Dit veld bestond, werd nooit gevuld, en de constraint sloeg
         daardoor nooit aan. Nu is zichtbaar of hij iets kan betekenen. */
      v.aangemaakt_door === null && v.bewerkt_door === null
        ? vlag("geen menselijke auteur of bewerker", "")
        : `auteur ${esc(String(v.aangemaakt_door ?? "-"))}, laatst bewerkt door ${esc(String(v.bewerkt_door ?? "-"))}`,
    ],
    ["Inhoudsafdruk", `<code>${esc((v.inhoud_afdruk ?? "").slice(0, 16))}…</code>`],
  ],
)}

<h2>De poorten, per poort</h2>
${tabel(
  ["Poort", "Uitslag", "Ernst", "Bevinding"],
  poorten.map((p) => [
    esc(p.poort),
    p.geslaagd ? vlag("geslaagd", "ok") : vlag("gefaald", p.ernst === "blokkerend" ? "fout" : "waarschuwing"),
    esc(p.ernst),
    esc((p.bevindingen ?? []).join(" | ").slice(0, 240)),
  ]),
  "Geen poortuitslag opgeslagen. Draai npm run concept opnieuw.",
)}

<h2>SEO en GEO</h2>
${tabel(
  ["Veld", "Waarde"],
  [
    [
      "SEO-titel",
      `${esc(v.titel)} <span class="bij">(${v.titel.length} tekens; het bereik is 25-70)</span>`,
    ],
    [
      "Meta description",
      v.meta_omschrijving === null
        ? vlag("ontbreekt", "fout")
        : `${esc(v.meta_omschrijving)} <span class="bij">(${v.meta_omschrijving.length} tekens; het bereik is 70-160)</span>`,
    ],
    ["URL-slug", `<code>${esc(v.pad.replace(/^.*\//, ""))}</code>`],
    ["Canonical", `<code>${esc(v.canonieke_url)}</code>`],
    [
      "Direct antwoord",
      v.direct_antwoord === null
        ? vlag("ontbreekt", "fout")
        : `${esc(v.direct_antwoord)} <span class="bij">(${v.direct_antwoord.length} tekens)</span>`,
    ],
    [
      "Interne links",
      (v.interne_links ?? []).length === 0
        ? vlag("geen", "waarschuwing")
        : (v.interne_links ?? [])
            .map((l) => `<code>${esc(l)}</code>`)
            .join(" "),
    ],
    ["CTA", esc(v.cta_sleutel ?? "-")],
    [
      "Structured data",
      v.structured_data === null
        ? vlag("ontbreekt", "waarschuwing")
        : `<details><summary>${esc(
            (v.structured_data as Record<string, unknown>)?.["@type"]
              ? String((v.structured_data as Record<string, unknown>)["@type"])
              : "JSON-LD",
          )}</summary><pre>${esc(JSON.stringify(v.structured_data, null, 2))}</pre></details>`,
    ],
  ],
)}

${
  nieuwsAssen.length > 0
    ? `<h2>Nieuwswaarde — hoe de score is opgebouwd</h2>
<p class="bij">${esc(v.nieuws_oordeel ?? "")}</p>
${nieuwsAssen
  .map(
    (a) => `<h3>${esc(a.as)} — ${a.score}/${a.max}</h3>
${tabel(
  ["Component", "Score", "Bewijs"],
  a.componenten.map((cp) => [esc(cp.naam), `${cp.score}/${cp.max}`, esc(cp.bewijs)]),
)}`,
  )
  .join("")}`
    : ""
}

<h2>De keten: bron &rarr; document &rarr; claim &rarr; verificatie</h2>
<p class="uitleg">Per claim staat hier waarom hij draagt of niet draagt. <strong>Soort</strong> is
wat het document IS; <strong>gezag</strong> is wat de uitgever mag vaststellen; <strong>modaliteit</strong>
is of de zin iets vaststelt, voorstelt of verwacht. Een claim draagt een bericht alleen als hij
bevestigd is &eacute;n vastgesteld met voldoende zekerheid. Klap een rij open voor de grondslag.</p>
${tabel(
  ["Rol", "Waarde", "Status", "Kw.", "Modaliteit", "Documentsoort", "Gezag", "Bron", "Datum"],
  d.uitspraken.map((u) => {
    const zeker = u.zekerheid === null ? null : Number(u.zekerheid);
    /* DEZELFDE FUNCTIE ALS DE POORT, en dat is een correctie. Hier
       stond de regel met de hand nagebouwd:

         u.status === "bevestigd" && u.modaliteit === "VASTGESTELD"
           && (zeker ?? 0) >= 0.5

       Twee verschillen met claimDraagt(), en beide tellen. De drempel
       0.5 stond als letterlijk getal in plaats van
       NOODZAKELIJKE_ZEKERHEID, dus een wijziging daar zou het dashboard
       niet meenemen. En de DOCUMENTSOORT werd niet getoetst: een claim
       uit een SECUNDAIRE_BERICHTGEVING of een LOBBYDOCUMENT kreeg in
       deze tabel het groene 'draagt' terwijl de poort hem afwijst.
       Precies het uiteenlopen dat de comment bij claimDraagt() belooft
       te voorkomen. */
    const draagt = claimDraagt({
      verificatieStatus: u.status,
      modaliteit: u.modaliteit,
      modaliteitZekerheid: zeker,
      documentsoort: u.documentsoort,
    });
    /* DE MODALITEITSKOLOM ZEGT OOK WAT HIJ BETEKENT. 'VOORSTEL' alleen
       is voor een redacteur niet genoeg; hij moet weten dat zo'n claim
       geen feit mag worden. */
    const modCel =
      u.modaliteit === null
        ? vlag("niet beoordeeld", "waarschuwing")
        : u.modaliteit === "VASTGESTELD"
          ? (zeker ?? 0) >= 0.5
            ? vlag(`vastgesteld ${zeker?.toFixed(2)}`, "ok")
            : vlag(`vastgesteld, onzeker ${zeker?.toFixed(2)}`, "waarschuwing")
          : vlag(`${u.modaliteit.toLowerCase()} — geen feit`, "waarschuwing");
    const soortCel =
      u.documentsoort === null
        ? vlag("niet geclassificeerd", "waarschuwing")
        : `${esc(u.documentsoort)}${
            u.besluit_van
              ? `<div class="klein">besluit van ${esc(u.besluit_van)} — ${
                  u.origineel_gezien
                    ? "origineel teruggevonden"
                    : "origineel NIET teruggevonden"
                }</div>`
              : ""
          }`;
    const grondslag = [
      u.soort_uitleg ? `<strong>documentsoort:</strong> ${esc(u.soort_uitleg)}` : "",
      u.mod_uitleg ? `<strong>modaliteit:</strong> ${esc(u.mod_uitleg)}` : "",
      u.plafond === null
        ? ""
        : `<strong>bewijskrachtplafond:</strong> ${u.plafond} (de documentsoort stond niet meer toe)`,
    ]
      .filter(Boolean)
      .join("<br>");
    return [
      esc(u.rol) + (draagt ? ` ${vlag("draagt", "ok")}` : ""),
      u.waarde === null ? "<span class=\"bij\">geen getal</span>" : esc(`${u.waarde} ${u.eenheid ?? ""}`),
      u.status === "bevestigd" ? vlag(u.status, "ok") : vlag(u.status, "waarschuwing"),
      esc(String(u.kwaliteit ?? "-")),
      modCel,
      soortCel,
      esc(u.gezag ?? "-"),
      u.bron_url
        ? `<a href="${esc(u.bron_url)}" rel="noreferrer noopener nofollow" target="_blank">${esc(
            (u.bron_titel ?? u.uitgever ?? u.bron_url).slice(0, 56),
          )}</a>${u.injectie ? ` ${vlag("injectieverdacht", "fout")}` : ""}${
            grondslag ? `<details><summary class="klein">grondslag</summary><div class="klein">${grondslag}</div></details>` : ""
          }`
        : vlag("geen primaire bron", "fout"),
      esc(u.bron_datum ?? "-"),
    ];
  }),
  "Geen uitspraken gebonden. Zonder bewijs kan dit concept niet gepubliceerd worden.",
)}
<p class="uitleg">Claims die dragen: <strong>${
  d.uitspraken.filter(
    (u) =>
      u.status === "bevestigd" &&
      u.modaliteit === "VASTGESTELD" &&
      (u.zekerheid === null ? 0 : Number(u.zekerheid)) >= 0.5,
  ).length
}</strong> van ${d.uitspraken.length}. Een bericht zonder dragende claim hoort niet gepubliceerd te worden.</p>

<h2>De tekst</h2>
<pre class="concepttekst">${esc(v.body_markdown)}</pre>

${
  magBewerken && v.status !== "goedgekeurd" && v.status !== "gepubliceerd"
    ? `<h2>Tekst aanpassen</h2>
<p class="bij">Na opslaan lopen ALLE poorten opnieuw. Uw gebruiker wordt vastgelegd als
laatste bewerker, en u kunt daarna dit concept zelf niet meer goedkeuren (vier ogen).</p>
<form method="post" action="/studio/${v.id}/tekst">
  ${csrfVeld}${afdrukVeld}
  <textarea name="body_markdown" rows="18" style="width:100%;font-family:monospace">${esc(v.body_markdown)}</textarea>
  <button type="submit">Opslaan en opnieuw toetsen</button>
</form>`
    : ""
}

${
  v.status === "ter_review" || v.status === "concept"
    ? magGoedkeuren
      ? `<h2>Redactioneel besluit</h2>
<p class="bij">Goedkeuren publiceert niets. Het zet de status op goedgekeurd en bindt die
goedkeuring aan de afdruk van deze tekst. Publiceren vraagt daarna nog
<code>npm run publiceer</code>, een generatorrun, een commit en een push — alle vier
menselijke handelingen.</p>
<form method="post" action="/studio/${v.id}/beoordeel">
  ${csrfVeld}${afdrukVeld}
  <label>Motivatie<br><textarea name="motivatie" rows="3" style="width:100%" placeholder="Waarom keurt u dit goed of af?"></textarea></label>
  <p>
    <button type="submit" name="besluit" value="GOEDGEKEURD">Goedkeuren</button>
    <button type="submit" name="besluit" value="AFGEWEZEN">Afwijzen</button>
  </p>
</form>`
      : `<p class="leeg">U hebt het recht <code>inhoud.goedkeuren</code> niet; daarom staat hier
geen besluitformulier. Dat is geen weergavekeuze maar dezelfde grendel die de server
afdwingt.</p>`
    : ""
}
`,
        }),
      );
    }),
  );

  /* ----------------------------------------------------------------
     CONCEPT BEOORDELEN — goedkeuren of afwijzen
     ----------------------------------------------------------------
     DE ECHTE GRENDEL STAAT IN keurGoed(), NIET HIER. Die functie
     toetst het recht tegen intel.rol_rechten, of de gebruiker bestaat
     en actief is, en de vier-ogenregel. Deze middleware geeft alleen
     een nette 403 in plaats van een exception — dezelfde verdeling als
     bij /voorstellen/:id/beoordeel. */
  app.post(
    "/studio/:id/beoordeel",
    async_(vereistInlog),
    vereistRecht("inhoud.goedkeuren"),
    async_(async (req: MetGebruiker, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (!csrfPaarGeldig(leesKoekje(req, CSRF_KOEKJE), body[CSRF_VELD], sessieGeheim())) {
        weiger(res, 403, "Het formulier is verlopen. Open de pagina opnieuw.");
        return;
      }
      const id = String(req.params["id"] ?? "");
      if (!/^\d+$/.test(id)) {
        weiger(res, 400, "Ongeldig conceptnummer.");
        return;
      }
      const besluit = String(body["besluit"] ?? "");
      if (!["GOEDGEKEURD", "AFGEWEZEN"].includes(besluit)) {
        weiger(res, 400, "Onbekend besluit.");
        return;
      }
      const motivatie = String(body["motivatie"] ?? "").slice(0, 2000);
      if (besluit === "AFGEWEZEN" && motivatie.trim().length < 10) {
        weiger(res, 400, "Geef een reden van minstens tien tekens bij een afwijzing.");
        return;
      }
      const gezienAfdruk = String(body["inhoud_afdruk"] ?? "");
      const gebruikerId = req.gebruiker?.id ?? null;
      if (gebruikerId === null) {
        weiger(res, 403, "Een besluit vraagt een ingelogd account.");
        return;
      }

      /* DE BLOKKADE MOET DE COMMIT HALEN, de melding mag erna.
         keurGoed() legt een bewijsblokkade vast in
         intel.publicatiebesluiten en geeft hem terug als uitslag. Zou
         deze route daarop gooien BINNEN alsGebruiker(), dan rolde de
         transactie die auditregel mee terug. Dus: de uitslag naar
         buiten dragen, de transactie laten committen, en pas daarna
         weigeren. */
      let geblokkeerd: { reden: string; blokkades: readonly string[] } | null = null;
      try {
        await alsGebruiker(req, async (c) => {
          /* DE AFDRUK DIE OP HET SCHERM STOND. Wijkt hij af, dan is de
             tekst ondertussen gewijzigd en geldt dit besluit niet voor
             wat er nu staat. */
          const nu = await eenRij<{ inhoud_afdruk: string | null; status: string }>(
            c,
            "select inhoud_afdruk, status from intel.inhoud_versies where id = $1",
            [Number(id)],
          );
          if (!nu) throw new IntelFout("validatie", "dit concept bestaat niet");
          if ((nu.inhoud_afdruk ?? "") !== gezienAfdruk) {
            throw new IntelFout(
              "validatie",
              "de tekst is gewijzigd nadat u hem opende; open de pagina opnieuw zodat uw " +
                "besluit aan de inhoud gebonden kan worden die u werkelijk hebt gelezen",
            );
          }
          if (nu.status !== "ter_review" && nu.status !== "concept") {
            throw new IntelFout(
              "validatie",
              `dit concept staat op '${nu.status}' en is niet meer te beoordelen`,
            );
          }

          if (besluit === "GOEDGEKEURD") {
            const uitslag = await keurGoed(
              c,
              Number(id),
              gebruikerId,
              motivatie || "goedgekeurd via het dashboard",
            );
            if (!uitslag.goedgekeurd) {
              geblokkeerd = { reden: uitslag.reden, blokkades: uitslag.blokkades };
            }
          } else {
            await c.query(
              "update intel.inhoud_versies set status = 'ingetrokken' where id = $1",
              [Number(id)],
            );
            await c.query(
              `insert into intel.publicatiebesluiten
                 (organisatie_id, inhoud_versie_id, besluit, door_gebruiker_id, actor_soort, motivatie)
               values ((select organisatie_id from intel.inhoud_versies where id = $1),
                       $1, 'afgewezen', $2, 'mens', $3)`,
              [Number(id), gebruikerId, motivatie],
            );
          }
        });
      } catch (e) {
        weiger(res, 400, redacteerFout(e));
        return;
      }
      if (geblokkeerd !== null) {
        const g = geblokkeerd as { reden: string; blokkades: readonly string[] };
        weiger(
          res,
          409,
          `${g.reden}. De blokkade is vastgelegd in het publicatielogboek.\n\n` +
            g.blokkades.map((b) => `- ${b}`).join("\n"),
        );
        return;
      }
      res.redirect(303, `/studio/${id}`);
    }),
  );

  /* ----------------------------------------------------------------
     CONCEPTTEKST AANPASSEN
     ----------------------------------------------------------------
     DIT IS DE ROUTE DIE DE VIER-OGENREGEL ECHT MAAKT. Zolang niemand
     een concept kon bewerken, was `bewerkt_door` altijd NULL en sloeg
     de constraint nooit aan. Vanaf nu legt een bewerking vast wie het
     deed, en keurGoed() weigert daarna een goedkeuring door diezelfde
     persoon.

     EN DE POORTEN LOPEN OPNIEUW. Een aangepaste tekst met de oude
     poortuitslag is het gevaarlijkste geval: publiceer() leest
     `poorten_geslaagd`, dus een redacteur die een getal toevoegt zou
     langs poort 7 komen. hertoetsInhoudVersie() draait alle poorten en
     berekent de afdruk opnieuw. */
  app.post(
    "/studio/:id/tekst",
    async_(vereistInlog),
    vereistRecht("inhoud.concept"),
    async_(async (req: MetGebruiker, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (!csrfPaarGeldig(leesKoekje(req, CSRF_KOEKJE), body[CSRF_VELD], sessieGeheim())) {
        weiger(res, 403, "Het formulier is verlopen. Open de pagina opnieuw.");
        return;
      }
      const id = String(req.params["id"] ?? "");
      if (!/^\d+$/.test(id)) {
        weiger(res, 400, "Ongeldig conceptnummer.");
        return;
      }
      const tekst = String(body["body_markdown"] ?? "");
      if (tekst.trim().length < 80) {
        weiger(res, 400, "Een conceptteksttekst van minder dan tachtig tekens is geen artikel.");
        return;
      }
      const gezienAfdruk = String(body["inhoud_afdruk"] ?? "");
      const gebruikerId = req.gebruiker?.id ?? null;
      if (gebruikerId === null) {
        weiger(res, 403, "Bewerken vraagt een ingelogd account.");
        return;
      }

      try {
        await alsGebruiker(req, async (c) => {
          const nu = await eenRij<{ inhoud_afdruk: string | null; status: string }>(
            c,
            "select inhoud_afdruk, status from intel.inhoud_versies where id = $1",
            [Number(id)],
          );
          if (!nu) throw new IntelFout("validatie", "dit concept bestaat niet");
          if ((nu.inhoud_afdruk ?? "") !== gezienAfdruk) {
            throw new IntelFout(
              "validatie",
              "iemand anders heeft deze tekst ondertussen gewijzigd; open de pagina opnieuw",
            );
          }
          if (nu.status === "goedgekeurd" || nu.status === "gepubliceerd") {
            throw new IntelFout(
              "validatie",
              `dit concept staat op '${nu.status}'; een goedgekeurde tekst wijzig je niet, ` +
                "daar hoort een nieuwe versie bij",
            );
          }

          await c.query(
            `update intel.inhoud_versies
                set body_markdown = $2, bewerkt_door = $3
              where id = $1`,
            [Number(id), tekst, gebruikerId],
          );
          const uit = await hertoetsInhoudVersie(c, req.gebruiker!.organisatieId, Number(id));
          if (!uit) throw new IntelFout("validatie", "hertoetsen mislukte");
        });
      } catch (e) {
        weiger(res, 400, redacteerFout(e));
        return;
      }
      res.redirect(303, `/studio/${id}`);
    }),
  );

  // ---------------- regio ----------------

  app.get("/regio", async_(vereistInlog), vereistRecht("inhoud.lezen"), async_(async (req: MetGebruiker, res) => {
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
  }));

  // ---------------- commerciële signalen ----------------

  /**
   * De Nederlandse naam van een fase.
   *
   * §27 verbiedt een technische enumwaarde als label voor een mens. Een
   * onbekende waarde valt terug op een leesbare tekst in plaats van op
   * de ruwe sleutel, zodat een nieuwe fase in de database nooit als
   * 'beeindigd' op het scherm verschijnt.
   */
  /**
   * Nederlandse labels voor de relevantiecategorie.
   *
   * De enumwaarde ('commerciele_kans') is een sleutel, niet een label
   * voor een mens; par. 27 eist dat onderscheid.
   */
  const RELEVANTIE_LABEL: Record<string, string> = {
    commerciele_kans: "Commerciële kans",
    redactionele_kans: "Redactionele kans",
    regelgeving: "Regelgeving",
    marktintelligentie: "Marktinformatie",
    achtergrond: "Achtergrond",
    niet_relevant: "Niet relevant",
  };

  /** Nederlandse labels voor het voorsteloordeel; nooit de enum zelf. */
  const VOORSTEL_LABEL: Record<string, string> = {
    KLAAR_VOOR_REVIEW: "Klaar voor beoordeling",
    NEEDS_RESEARCH: "Feit moet eerst worden uitgezocht",
    HERROUTEREN: "Hoort op een andere pagina",
    UITSTELLEN: "Uitstellen",
    AFWIJZEN: "Afwijzen",
  };

  const faseLabelVan = (fase: string | null): string =>
    fase ? (FASE_LABEL[fase as Fase] ?? "Fase onbekend") : "Fase onbekend";

  /* ----------------------------------------------------------------
     KANSEN — de werkvoorraad, en per kans een dossier
     ----------------------------------------------------------------
     DRIE LAGEN GESCHEIDEN (§6): wat de bron meldt (FEITEN), wat wij
     eruit opmaken (GEVOLGTREKKINGEN) en wat we voorstellen
     (AANBEVELING). Die scheiding staat in de opmaak, niet alleen in de
     tekst, zodat een lezer nooit hoeft te raden welke laag hij ziet.

     WAT HIER NIET STAAT: een knop die iets verstuurt. Er bestaat in dit
     platform geen verzendpad; externe benadering vraagt een apart
     menselijk besluit buiten dit scherm. */
  app.get("/kansen", async_(vereistInlog), vereistRecht("signaal.lezen"), async_(async (req: MetGebruiker, res) => {
    const vandaag = new Date().toISOString().slice(0, 10);
    const d = await alsGebruiker(req, (c) =>
      rijen<{
        id: string;
        opdrachtgever: string;
        project: string;
        fase: string | null;
        status: string;
        sluit_op: string | null;
        score_relevantie: number;
        score_vertrouwen: number;
        score_urgentie: number;
        score_handelbaar: number;
        ontbrekend: string[];
        aanbevolen_actie: string | null;
        pubs: number;
        dagen_tot: number | null;
      }>(
        c,
        `select k.id::text, k.opdrachtgever, k.project, k.fase, k.status,
                k.sluit_op::text, k.score_relevantie, k.score_vertrouwen,
                k.score_urgentie, k.score_handelbaar, k.ontbrekend, k.aanbevolen_actie,
                (select count(*)::int from intel.kans_publicaties p where p.kans_id = k.id) as pubs,
                case when k.sluit_op is null then null
                     else (k.sluit_op - $1::date) end as dagen_tot
           from intel.kansen k
          where k.status not in ('GEWONNEN','VERLOREN','GEARCHIVEERD','AFGEWEZEN')
            and (k.sluit_op is null or k.sluit_op >= $1::date)
          order by k.score_urgentie desc, k.score_relevantie desc, k.id desc
          limit 50`,
        [vandaag],
      ),
    );

    /* Eindstanden en verstreken termijnen worden GETELD, niet verzwegen.
       Een werkvoorraad die stil items weglaat, laat de lezer denken dat
       er niets anders is. */
    const buiten = await alsGebruiker(req, (c) =>
      rijen<{ reden: string; n: number }>(
        c,
        `select case
                  when fase = 'gegund'    then 'gegund'
                  when fase = 'beeindigd' then 'vroegtijdig beëindigd'
                  when status in ('GEWONNEN','VERLOREN','AFGEWEZEN','GEARCHIVEERD')
                                          then 'afgehandeld'
                  else 'termijn verstreken'
                end as reden,
                count(*)::int as n
           from intel.kansen
          where status in ('GEWONNEN','VERLOREN','GEARCHIVEERD','AFGEWEZEN')
             or (sluit_op is not null and sluit_op < $1::date)
          group by 1 order by 2 desc`,
        [vandaag],
      ),
    );

    const onbekend = (v: string | null) =>
      v ? esc(v) : '<span class="onbekend">ONBEKEND</span>';
    const termijn = (r: { sluit_op: string | null; dagen_tot: number | null }) => {
      if (!r.sluit_op) return '<span class="onbekend">ONBEKEND</span>';
      const d = r.dagen_tot;
      const klasse = d === null ? "" : d <= 7 ? "dringend" : d <= 21 ? "binnenkort" : "";
      return `<span class="${klasse}">${esc(r.sluit_op)}</span>` +
        (d === null ? "" : `<div class="klein">over ${d} dagen</div>`);
    };

    res.send(
      pagina({
        titel: "Kansen",
        huidigPad: "/kansen",
        gebruiker: req.gebruiker ?? null,
        inhoud: `
<h1>Kansen</h1>
<p class="uitleg">Eén rij per <strong>aanbesteding</strong>, niet per publicatie. Meerdere
aankondigingen over dezelfde inkoop staan in één dossier; dat scheelde bij de laatste meting
ruim een derde aan dubbeltellingen. <strong>ONBEKEND is een echte waarde</strong>: een kans
zonder sluitingsdatum is een onderzoeksvraag, geen kans met termijn nul.
Dit platform verstuurt niets en legt niets vast bij derden.</p>

${d.length === 0 ? "<p>Geen openstaande kansen.</p>" : tabel(
  ["Opdrachtgever", "Aanbesteding", "Fase", "Sluit op", "Relevantie", "Vertrouwen", "Urgentie", "Handelbaar", "Wat ontbreekt"],
  d.map((k) => [
    `<a href="/kansen/${esc(k.id)}">${esc(k.opdrachtgever)}</a>` +
      (k.pubs > 1 ? `<div class="klein">${k.pubs} publicaties</div>` : ""),
    `${esc(k.project.slice(0, 80))}<div class="klein">${esc(k.aanbevolen_actie ?? "")}</div>`,
    esc(faseLabelVan(k.fase)),
    termijn(k),
    `<span class="num">${k.score_relevantie}</span>`,
    `<span class="num">${k.score_vertrouwen}</span>`,
    `<span class="num">${k.score_urgentie}</span>`,
    `<span class="num">${k.score_handelbaar}</span>`,
    k.ontbrekend.length === 0
      ? '<span class="klein">niets</span>'
      : `<span class="onbekend">${k.ontbrekend.length}</span><div class="klein">${esc(k.ontbrekend.slice(0, 2).join(", "))}${k.ontbrekend.length > 2 ? "…" : ""}</div>`,
  ]),
)}

<details>
  <summary>Wat hier NIET in staat (${buiten.reduce((a, b) => a + b.n, 0)})</summary>
  <p class="klein">Deze kansen zijn bewaard maar vragen geen aandacht. Niets wordt weggegooid:
  een gunning is marktinformatie over wie won en tegen welke uitvraag.</p>
  <ul class="klein">
    ${buiten.map((b) => `<li>${esc(b.reden)}: ${b.n}</li>`).join("") || "<li>niets</li>"}
  </ul>
</details>`,
      }),
    );
  }));

  app.get("/kansen/:id", async_(vereistInlog), vereistRecht("signaal.lezen"), async_(async (req: MetGebruiker, res) => {
    const id = String(req.params["id"] ?? "");
    if (!/^\d+$/.test(id)) {
      weiger(res, 400, "Ongeldig kansnummer.");
      return;
    }

    const k = (await alsGebruiker(req, (c) =>
      rijen<{
        id: string;
        opdrachtgever: string;
        project: string;
        fase: string | null;
        status: string;
        sluit_op: string | null;
        referentie: string | null;
        procedure_soort: string | null;
        procedure_status: string | null;
        opdracht_omvang: string | null;
        locatie: string | null;
        eisen: string[];
        relevante_oplossingen: string[];
        ontbrekend: string[];
        aanbevolen_actie: string | null;
        fase_grondslag: string[];
        identiteit: string | null;
        identiteit_grondslag: string | null;
        interesse_bewezen: boolean;
        score_relevantie: number;
        score_vertrouwen: number;
        score_urgentie: number;
        score_handelbaar: number;
        score_grondslag: Record<string, { score: number; reden: string }>;
      }>(
        c,
        `select id::text, opdrachtgever, project, fase, status, sluit_op::text, referentie,
                procedure_soort, procedure_status, opdracht_omvang, locatie, eisen,
                relevante_oplossingen, ontbrekend, aanbevolen_actie, fase_grondslag,
                identiteit, identiteit_grondslag, interesse_bewezen,
                score_relevantie, score_vertrouwen, score_urgentie, score_handelbaar,
                score_grondslag
           from intel.kansen where id = $1`,
        [id],
      ),
    ))[0];

    if (!k) {
      weiger(res, 404, "Deze kans bestaat niet, of hij hoort bij een andere organisatie.");
      return;
    }

    const pubs = await alsGebruiker(req, (c) =>
      rijen<{
        url: string;
        titel: string;
        gepubliceerd_op: string | null;
        publicatie_soort: string | null;
        relatie: string;
        relatie_grondslag: string | null;
        sluitingsdatum_bron: string | null;
      }>(
        c,
        `select url, titel, gepubliceerd_op::text, publicatie_soort, relatie,
                relatie_grondslag, sluitingsdatum_bron::text
           from intel.kans_publicaties
          where kans_id = $1 order by gepubliceerd_op nulls first`,
        [id],
      ),
    );

    const feit = (label: string, waarde: string | null) =>
      `<tr><th>${esc(label)}</th><td>${
        waarde ? esc(waarde) : '<span class="onbekend">ONBEKEND</span>'
      }</td></tr>`;

    const as = (naam: string, label: string) => {
      const g = k.score_grondslag[naam];
      return `<tr><th>${esc(label)}</th><td><span class="num">${g?.score ?? "?"}</span>
        <div class="klein">${esc(g?.reden ?? "geen grondslag vastgelegd")}</div></td></tr>`;
    };

    res.send(
      pagina({
        titel: `Kans ${k.id}`,
        huidigPad: "/kansen",
        gebruiker: req.gebruiker ?? null,
        inhoud: `
<p class="klein"><a href="/kansen">&larr; alle kansen</a></p>
<h1>${esc(k.opdrachtgever)}</h1>
<p class="uitleg">${esc(k.project)}</p>

<h2>Feiten</h2>
<p class="klein">Wat de bron zelf meldt. Niets op deze regel is onze interpretatie.</p>
<table class="paren">
  ${feit("Opdrachtgever", k.opdrachtgever)}
  ${feit("Kenmerk", k.referentie)}
  ${feit("Procedure", k.procedure_soort)}
  ${feit("Fase", k.fase ? faseLabelVan(k.fase) : null)}
  ${feit("Sluit op", k.sluit_op)}
  ${feit("Omvang", k.opdracht_omvang)}
  ${feit("Locatie", k.locatie)}
  ${feit("Gestelde eisen", k.eisen.length > 0 ? k.eisen.join("; ") : null)}
</table>

<h2>Wat niet bekend is${k.ontbrekend.length > 0 ? ` — ${k.ontbrekend.length} veld(en)` : ""}</h2>
<p class="klein">Elk leeg veld is een onderzoeksvraag, niet een nul.</p>
${k.ontbrekend.length === 0
  ? "<p>Het dossier is volledig.</p>"
  : `<ul>${k.ontbrekend.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>`}

<h2>Gevolgtrekkingen</h2>
<p class="klein">Onze inschatting op vier losse assen. Ze staan apart omdat ze verschillende
dingen meten: een aanbesteding kan zeer relevant zijn met een laag vertrouwen.</p>
<table class="paren">
  ${as("relevantie", "Relevantie")}
  ${as("vertrouwen", "Vertrouwen")}
  ${as("urgentie", "Urgentie")}
  ${as("handelbaar", "Handelbaar")}
  <tr><th>Raakt onze oplossingen</th><td>${
    k.relevante_oplossingen.length > 0
      ? esc(k.relevante_oplossingen.join(", "))
      : '<span class="onbekend">ONBEKEND</span>'
  }<div class="klein">Dit is een gevolgtrekking uit het onderwerp, geen vastgestelde behoefte.</div></td></tr>
  <tr><th>Interesse bewezen</th><td>${k.interesse_bewezen ? "ja" : "nee"}
    <div class="klein">Een openbare aankondiging is geen bewijs dat deze organisatie iets van
    Vibe Energy wil. Dit kan de pijplijn niet zetten.</div></td></tr>
</table>

<h2>Publicaties — ${pubs.length}</h2>
<p class="klein">Samengenomen op: ${esc(k.identiteit_grondslag ?? k.identiteit ?? "ONBEKEND")}</p>
${tabel(
  ["Gepubliceerd", "Soort", "Relatie", "Gemelde termijn", "Bron"],
  pubs.map((p) => [
    esc(p.gepubliceerd_op ?? "onbekend"),
    esc(p.publicatie_soort ?? "?"),
    `${esc(p.relatie)}${p.relatie_grondslag ? `<div class="klein">${esc(p.relatie_grondslag)}</div>` : ""}`,
    p.sluitingsdatum_bron
      ? `${esc(p.sluitingsdatum_bron)}${
          k.sluit_op && p.sluitingsdatum_bron !== k.sluit_op
            ? '<div class="klein">vervangen door een latere publicatie</div>'
            : ""
        }`
      : '<span class="onbekend">geen</span>',
    `<a href="${esc(p.url)}" rel="noopener nofollow noreferrer" target="_blank">aankondiging</a>`,
  ]),
)}

<h2>Hoe de fase is vastgesteld</h2>
<ul class="klein">${k.fase_grondslag.map((g) => `<li>${esc(g)}</li>`).join("") || "<li>niet vastgelegd</li>"}</ul>

<h2>Aanbeveling</h2>
<p>${esc(k.aanbevolen_actie ?? "geen")}</p>
<p class="uitleg">Deze aanbeveling gaat altijd over het vaststellen van feiten, nooit over het
benaderen van een organisatie. Dit platform verstuurt geen berichten, schrijft niet in op
aanbestedingen en legt niets vast in een extern systeem. Dat vraagt een apart menselijk besluit.</p>`,
      }),
    );
  }));

  app.get("/signalen", async_(vereistInlog), vereistRecht("signaal.lezen"), async_(async (req: MetGebruiker, res) => {
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
  }));

  // ---------------- distributie ----------------

  app.get("/distributie", async_(vereistInlog), vereistRecht("distributie.concept"), async_(async (req: MetGebruiker, res) => {
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
  }));

  // ---------------- prestaties ----------------

  app.get("/prestaties", async_(vereistInlog), vereistRecht("inhoud.lezen"), async_(async (req: MetGebruiker, res) => {
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
  }));

  // ---------------- instellingen ----------------

  app.get("/instellingen", async_(vereistInlog), vereistRecht("beleid.beheren"), async_(async (req: MetGebruiker, res) => {
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
      /* DE STAND VAN DE CLAIMPOORT, ZICHTBAAR.
         Sectie 3 van de acceptatieopdracht eist dat de nieuwsengine
         niet ongemerkt operationeel stilvalt. De poort is fail-closed:
         zolang er claims op herbeoordeling wachten, weigeren de
         besluitmotor, de nieuwsselectie, de voorstellenlaag en de
         conceptgeneratie. Dat is veilig, maar in een logregel ziet
         niemand het. Hier staat het getal. */
      claimpoort: await herbeoordeelStand(c, req.gebruiker!.organisatieId),
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

<h2>Claimpoort</h2>
${
  d.claimpoort.openstaand === 0
    ? `<div class="tegel">${vlag("claimpoort open", "ok")}<div class="klein" style="margin-top:6px">
       Elke claim is gewogen onder ${esc(d.claimpoort.motorversies)}. De besluitmotor, de
       nieuwsselectie, de voorstellenlaag en de conceptgeneratie kunnen bewijs wegen.</div></div>`
    : `<div class="tegel">${vlag(`claimpoort DICHT — ${d.claimpoort.openstaand} claim(s) wachten`, "fout")}<div class="klein" style="margin-top:6px">
       Zolang dit getal niet nul is, weigeren de besluitmotor, de nieuwsselectie, de
       voorstellenlaag en de conceptgeneratie &mdash; met opzet, want hun oordeel zou op een
       gemengde populatie rusten. Dit is geen storing maar een grendel.
       Draai <code>npm run documentsoort</code> en daarna <code>npm run herbeoordeel</code>.
       Motorversies: ${esc(d.claimpoort.motorversies)}.</div></div>`
}

<h2>Beveiligingsinvarianten</h2>
${
  alleInvarianten.length === 0
    ? `<div class="tegel">${vlag("alle invarianten kloppen", "ok")}<div class="klein" style="margin-top:6px">
       RLS op elke tenanttabel, geen functie uitvoerbaar door PUBLIC, de applicatierol is geen
       eigenaar en heeft geen BYPASSRLS, het auditspoor is niet muteerbaar, en geen gepubliceerde
       kernclaim die onder de R3-regels niets draagt &mdash; dus niet alleen bevestigd, maar ook
       vastgesteld met voldoende zekerheid en uit een document dat zelf iets vaststelt
       (migratie 0044).</div></div>`
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
  }));

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

  /* Het laatste vangnet. Moet NA alle routes komen, anders ziet express
     hem niet als foutafhandelaar. Een stacktrace gaat naar het log en
     nooit naar de browser. */
  app.use(foutvanger);

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

/** Is dit adres de loopback? */
export function isLoopback(bind: string): boolean {
  return bind === "127.0.0.1" || bind === "::1" || bind === "localhost";
}

/**
 * Mag het dashboard met deze instellingen starten?
 *
 * Geeft een reden terug als het NIET mag, of null als het mag. Apart
 * en puur zodat de toets hem kan aanroepen zonder een server te
 * starten.
 *
 * De regel die de opdracht eist: localhost-binding is niet het
 * beveiligingsmodel. Dat is hier zo uitgewerkt dat een publieke
 * binding in productie ALLEEN mag als de operator expliciet verklaart
 * dat er een TLS-terminerende proxy voor staat. Zonder die verklaring
 * weigert het dashboard te starten in plaats van stil onversleuteld
 * sessiekoekjes over een publiek adres te sturen.
 */
export function startWeigering(
  config: {
    omgeving: string;
    dashboardBind: string;
    dashboardAchterTlsProxy: boolean;
    dashboardSessieGeheimAanwezig: boolean;
  },
  /**
   * Is INTEL_OMGEVING EXPLICIET gezet? Standaard uit de omgeving gelezen,
   * als parameter zodat een toets het kan nabootsen.
   */
  omgevingExpliciet: boolean = (process.env["INTEL_OMGEVING"] ?? "") !== "",
): string | null {
  if (!config.dashboardSessieGeheimAanwezig) {
    return "INTEL_SESSIE_GEHEIM ontbreekt of is korter dan 32 tekens; het dashboard start niet zonder sessiegeheim";
  }
  /* DRIE BESCHERMINGEN HANGEN AAN INTEL_OMGEVING, EN DIE VIEL STIL TERUG.
     configLezen() leest INTEL_OMGEVING met 'ontwikkel' als standaard.
     Ontbreekt de variabele in een productiedeploy, dan gebeurt er drie
     keer iets onzichtbaars: het sessiekoekje verliest `; Secure`, de
     HSTS-header blijft weg, en de weigering hieronder vuurt niet meer —
     want die eist `omgeving === "productie"`.
     Een ontbrekende variabele mag niet de ONVEILIGE kant kiezen. Bindt
     het dashboard op een niet-loopbackadres, dan is dat precies het
     geval waarin het uitmaakt, dus dan eisen we de verklaring. Op de
     loopback blijft de standaard bruikbaar en blijft ontwikkelen simpel. */
  if (!omgevingExpliciet && !isLoopback(config.dashboardBind)) {
    return (
      `weigering: het dashboard bindt op '${config.dashboardBind}' terwijl INTEL_OMGEVING niet is ` +
      "gezet. De standaard is 'ontwikkel', en die zet geen Secure op het sessiekoekje, geen HSTS " +
      "en schakelt de TLS-weigering hieronder uit. Zet INTEL_OMGEVING expliciet op ontwikkel, test " +
      "of productie, zodat een ontbrekende variabele niet de onveilige kant kiest."
    );
  }
  if (
    config.omgeving === "productie" &&
    !isLoopback(config.dashboardBind) &&
    !config.dashboardAchterTlsProxy
  ) {
    return (
      `weigering: in productie bindt het dashboard op '${config.dashboardBind}', dus niet op de ` +
      "loopback, en INTEL_DASHBOARD_ACHTER_TLS_PROXY staat niet aan. Zonder TLS ervoor zou het " +
      "sessiekoekje onversleuteld over een publiek adres gaan. Bind op 127.0.0.1 en zet er een " +
      "geauthenticeerde tunnel of reverse proxy voor, of verklaar expliciet dat die proxy er is."
    );
  }
  return null;
}

export function startDashboard(): { sluit: () => Promise<void> } {
  const config = configLezen();
  const weigering = startWeigering(config);
  if (weigering) throw new Error(weigering);

  const pool = maakPool();
  const app = maakApp(pool);
  const server = app.listen(config.dashboardPoort, config.dashboardBind, () => {
    log.info("dashboard draait", {
      url: `http://${config.dashboardBind}:${config.dashboardPoort}`,
      // Standaard alleen op de loopback. De beveiliging hangt daar
      // echter NIET van af: elke route eist een sessie en de rechten
      // worden per verzoek uit de database gelezen.
      gebonden_aan: config.dashboardBind,
      achter_tls_proxy: config.dashboardAchterTlsProxy,
      omgeving: config.omgeving,
    });
  });

  /* Keep-alive-verbindingen bijhouden. Zonder dit blijft server.close()
     hangen tot de laatste browser zijn verbinding verbreekt, en dan
     wordt een nette afsluiting alsnog een harde kill door de
     orchestrator. */
  const verbindingen = new Set<import("node:net").Socket>();
  server.on("connection", (socket) => {
    verbindingen.add(socket);
    socket.on("close", () => verbindingen.delete(socket));
  });

  let sluitend = false;

  /**
   * Nette afsluiting: geen nieuwe verzoeken, lopende verzoeken afmaken,
   * dan de pool sluiten. Met een harde grens, want een
   * oneindig wachtende afsluiting is in de praktijk een vastloper.
   */
  async function nettedSluiting(signaal: string): Promise<void> {
    if (sluitend) return;
    sluitend = true;
    log.info("afsluiten gestart", { signaal, open_verbindingen: verbindingen.size });

    /* Vanaf nu meldt /gereed zich niet meer gereed, zodat een load
       balancer stopt met sturen voordat de poort dichtgaat. */
    await new Promise<void>((klaar) => {
      const grens = setTimeout(() => {
        log.waarschuwing("afsluiten duurde te lang; verbindingen worden verbroken", {
          open_verbindingen: verbindingen.size,
        });
        for (const s of verbindingen) s.destroy();
        klaar();
      }, 10_000);
      server.close(() => {
        clearTimeout(grens);
        klaar();
      });
    });

    await sluitAllePools().catch((e) =>
      log.fout("pools sluiten mislukte", { fout: e instanceof Error ? e.message : String(e) }),
    );
    log.info("afsluiten gereed", { signaal });
  }

  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.on(sig, () => {
      void nettedSluiting(sig).then(() => process.exit(0));
    });
  }

  return { sluit: () => nettedSluiting("programmatisch") };
}
