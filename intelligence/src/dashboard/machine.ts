/* ============================================================
   DASHBOARD — de machinepoort van de uitgifte
   ------------------------------------------------------------
   WAAROM DEZE POORT BESTAAT, EN WAAROM HIJ ZO SMAL IS.

   De autonome uitgifte heeft twee uitvoeringsplekken (zie
   uitgifte/opdracht.ts): de server beslist, een GitHub-werkstroom
   voert uit. Die twee moeten met elkaar praten, en er zijn precies
   twee manieren om dat te doen:

     (a) de uitvoerder krijgt toegang tot de database;
     (b) de uitvoerder krijgt toegang tot een paar endpoints die de
         server zelf afhandelt.

   (a) is afgewezen en blijft afgewezen. De database hangt in een
   privénetwerk zonder publieke poort, en dat is de belangrijkste
   bescherming die dit platform heeft. Een tunnel zou een Railway-token
   in GitHub-secrets betekenen — een credential waarmee je ook kunt
   herdeployen en alle omgevingsvariabelen kunt lezen.

   (b) is wat hier staat, met ÉÉN leesroute en ÉÉN schrijfroute. De
   uitvoerder krijgt nooit SQL in handen; hij krijgt een opdracht en
   meldt een fase terug. Elke beslissing, elke controle en elke
   auditregel blijft aan de serverkant.

   ------------------------------------------------------------
   WAT DEZE POORT NIET AANNEEMT VAN DE AANROEPER

   · GEEN INHOUD. Er is geen enkel veld waarin de uitvoerder tekst van
     een artikel kan meegeven. Hij meldt een HASH, en publiceer() bouwt
     het record zelf opnieuw en vergelijkt. Zou hij inhoud mogen
     sturen, dan was deze poort een tweede redactie.
   · GEEN FASE DIE NIET KAN. De toestandsmachine in
     uitgifte/opdracht.ts weigert elke overgang die niet volgt op de
     fase die in het logboek staat.
   · GEEN ORGANISATIE. De organisatie komt uit de configuratie van de
     server (INTEL_ORGANISATIE), niet uit het verzoek. Anders zou een
     sleutel voor één organisatie er een andere mee kunnen besturen.
   · GEEN IDENTITEIT VAN EEN MENS. Alles wat hier binnenkomt wordt
     vastgelegd als actor_soort 'systeem' met een grond uit het
     register. Een machinesleutel is geen persoon, en #79 bestaat juist
     om die twee niet te laten verwisselen.

   ------------------------------------------------------------
   DE SLEUTEL

   INTEL_MACHINE_SLEUTEL, minimaal 32 tekens. Niet gezet of te kort?
   Dan antwoordt elke route 503 en is er geen uitgifte. Dat is fail-
   closed: een platform dat zonder sleutel zou doorwerken, zou een
   publieke schrijfpoort zijn.

   De vergelijking is in CONSTANTE TIJD (timingSafeEqual). Een
   string-vergelijking lekt via de responstijd hoeveel tekens er
   kloppen, en dat is op een publiek endpoint een echte aanval en geen
   theorie.

   DE SLEUTEL STAAT NIET IN DE DATABASE. Hij hoort bij de omgeving, en
   een geheim dat in de database staat komt in elke back-up terecht —
   ook in de externe kopie in GCS.
   ============================================================ */

import express, { type Request, type Response, type Router } from "express";
import { timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";
import { configLezen } from "../kern/config.ts";
import { maakLogger } from "../kern/log.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { maakBegrenzer } from "./bescherming.ts";
import {
  aanvaardMerge,
  aanvaardPr,
  aanvaardRecord,
  maakUitgifteWachtrij,
  meldUitgifteFout,
  verifieerUitgifteLive,
} from "../uitgifte/opdracht.ts";

const log = maakLogger("machinepoort");

/** De minimale lengte van de machinesleutel. */
export const MIN_SLEUTELLENGTE = 32;

/** Is er een bruikbare sleutel geconfigureerd? */
export function machinesleutel(): string | null {
  const s = (process.env["INTEL_MACHINE_SLEUTEL"] ?? "").trim();
  return s.length >= MIN_SLEUTELLENGTE ? s : null;
}

function sleutelKlopt(aangeboden: string, echte: string): boolean {
  /* timingSafeEqual eist gelijke lengtes en werpt anders. De lengte
     zelf is geen geheim dat bescherming verdient — hij staat in de
     documentatie — maar de vergelijking moet er wel langs. */
  const a = Buffer.from(aangeboden, "utf8");
  const b = Buffer.from(echte, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type Bewijs = Record<string, unknown>;

function tekst(b: Bewijs, naam: string): string {
  const w = b[naam];
  if (typeof w !== "string" || w.trim().length === 0) {
    throw new Error(`veld '${naam}' ontbreekt of is leeg`);
  }
  return w.trim();
}

function tekstOfNull(b: Bewijs, naam: string): string | null {
  const w = b[naam];
  return typeof w === "string" && w.trim().length > 0 ? w.trim() : null;
}

function getalOfNull(b: Bewijs, naam: string): number | null {
  const w = b[naam];
  return typeof w === "number" && Number.isInteger(w) ? w : null;
}

function lijst(b: Bewijs, naam: string): string[] {
  const w = b[naam];
  if (!Array.isArray(w)) return [];
  return w.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
}

/**
 * De router met de twee routes.
 *
 * Wordt gemonteerd onder /machine door maakApp().
 */
export function maakMachineRouter(pool: Pool): Router {
  const router = express.Router();

  /* EEN EIGEN JSON-PARSER, EN ALLEEN HIER. De rest van het dashboard is
     een formulierentoepassing met express.urlencoded; JSON globaal
     aanzetten zou elke bestaande route een tweede invoerweg geven die
     niemand heeft getoetst. 8 kB is ruim: het zwaarste bewijs is een
     lijst checknamen. */
  router.use(express.json({ limit: "8kb" }));

  /* DE TEMPOLIMIET, DEZELFDE ALS OP HET INLOGFORMULIER.
     Een sleutel van 32 tekens is niet te raden, dus dit is geen
     bescherming tegen brute kracht. Hij staat er omdat een publiek
     endpoint zonder limiet een gratis manier is om deze server bezig te
     houden: elke GET /machine/uitgifte bouwt registerrecords met
     poortcontroles en claimqueries erachter.

     HONDERDTWINTIG PER MINUUT, en dat is met opzet ruim. De werkstroom
     draait twee keer per dag en doet dan een handvol verzoeken; een
     toetssuite doet er tientallen in een paar seconden. Een limiet die
     een eigen toets omver duwt, wordt bij de eerste rode run verhoogd
     of uitgezet, en dan beschermt hij niets meer. */
  const begrenzer = maakBegrenzer({ maximum: 120, vensterMs: 60_000, naam: "machinepoort-ip" });

  /* De poortwacht. Staat vóór elke route, dus er is geen pad dat hem
     overslaat. */
  router.use((req: Request, res: Response, next) => {
    const perIp = begrenzer.sta(req.ip ?? "onbekend");
    if (!perIp.toegestaan) {
      log.waarschuwing("machinepoort begrensd", { ip: req.ip ?? "onbekend", pad: req.path });
      res.setHeader("retry-after", String(Math.ceil(perIp.overMs / 1000)));
      res.status(429).json({
        fout: `te veel verzoeken; probeer het over ${Math.ceil(perIp.overMs / 1000)} seconden opnieuw`,
      });
      return;
    }

    const echte = machinesleutel();
    if (echte === null) {
      log.waarschuwing("machinepoort geweigerd: geen sleutel geconfigureerd");
      res.status(503).json({
        fout:
          `INTEL_MACHINE_SLEUTEL is niet gezet of korter dan ${MIN_SLEUTELLENGTE} tekens. ` +
          `Zonder sleutel is er geen uitgifte; dit platform werkt niet zonder.`,
      });
      return;
    }
    const kop = req.headers.authorization ?? "";
    const aangeboden = kop.startsWith("Bearer ") ? kop.slice(7).trim() : "";
    if (aangeboden.length === 0 || !sleutelKlopt(aangeboden, echte)) {
      log.waarschuwing("machinepoort geweigerd: sleutel klopt niet", {
        pad: req.path,
        ip: req.ip ?? "onbekend",
      });
      res.status(401).json({ fout: "geen geldige machinesleutel" });
      return;
    }
    next();
  });

  /**
   * De stand van deze server.
   *
   * WAAROM CI DIT NODIG HEEFT. Na een merge draait Railway een nieuwe
   * deploy. De uitvoerder moet weten WANNEER die er is voordat hij de
   * publieke URL laat verifiëren, en de enige betrouwbare meting is de
   * commit die deze server zelf draait. RAILWAY_GIT_COMMIT_SHA staat in
   * de container (gemeten 9 november 2026).
   *
   * De SHA is geen geheim: deze repository is publiek.
   */
  router.get("/stand", (_req: Request, res: Response) => {
    const config = configLezen();
    res.json({
      sha: process.env["RAILWAY_GIT_COMMIT_SHA"] ?? null,
      omgeving: config.omgeving,
      dienst: process.env["RAILWAY_SERVICE_NAME"] ?? null,
      op: new Date().toISOString(),
    });
  });

  /** De uitgiftewachtrij: wat mag er nu uit, en met welke opdracht? */
  router.get("/uitgifte", async (_req: Request, res: Response) => {
    try {
      const organisatieId = await huidigeOrganisatie(pool);
      const uit = await maakUitgifteWachtrij(pool, organisatieId);
      log.info("wachtrij uitgegeven", {
        opdrachten: uit.opdrachten.length,
        stop: uit.stop.map((s) => s.sleutel),
      });
      res.json(uit);
    } catch (e) {
      log.fout("wachtrij mislukt", { fout: (e as Error).message });
      res.status(500).json({ fout: (e as Error).message });
    }
  });

  /**
   * Een fase terugmelden.
   *
   * De dispatch is met opzet een expliciete lijst en geen tabel met
   * functieverwijzingen uit de body: een onbekende fase hoort een 400
   * te geven en niet een poging om iets aan te roepen.
   */
  router.post("/uitgifte/:id", async (req: Request, res: Response) => {
    const id = Number.parseInt(req.params["id"] ?? "", 10);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ fout: "geen geldige inhoudsversie-id" });
      return;
    }
    const body = (req.body ?? {}) as Bewijs;
    const fase = typeof body["fase"] === "string" ? body["fase"] : "";
    const bewijs = (body["bewijs"] ?? {}) as Bewijs;

    try {
      const organisatieId = await huidigeOrganisatie(pool);
      const beleidVersie = tekst(bewijs, "beleidVersie");

      switch (fase) {
        case "RECORD_GESCHREVEN": {
          const uit = await aanvaardRecord(pool, organisatieId, id, {
            recordHash: tekst(bewijs, "recordHash"),
            waar: tekst(bewijs, "waar"),
            beleidVersie,
          });
          res.status(uit.ok ? 200 : 409).json(uit);
          return;
        }
        case "PR_AANGEMAAKT": {
          const uit = await aanvaardPr(pool, organisatieId, id, {
            branch: tekst(bewijs, "branch"),
            commit: tekst(bewijs, "commit"),
            prNummer: getalOfNull(bewijs, "prNummer"),
            prUrl: tekstOfNull(bewijs, "prUrl"),
            beleidVersie,
          });
          res.status(uit.ok ? 200 : 409).json(uit);
          return;
        }
        case "PR_GEMERGED": {
          const uit = await aanvaardMerge(pool, organisatieId, id, {
            mergeCommit: tekst(bewijs, "mergeCommit"),
            checksGroen: lijst(bewijs, "checksGroen"),
            beleidVersie,
          });
          res.status(uit.ok ? 200 : 409).json(uit);
          return;
        }
        case "LIVE_GEVERIFIEERD": {
          /* DE SERVER MEET ZELF. De uitvoerder meldt alleen of de
             commit volgens hem in main zit; de vier HTTP-metingen doet
             deze server. Zie de sectiekop van uitgifte/opdracht.ts. */
          const uit = await verifieerUitgifteLive(pool, organisatieId, id, {
            gemergedVolgensUitvoerder: bewijs["gemergedInMain"] === true,
            beleidVersie,
          });
          res.status(uit.ok ? 200 : 409).json(uit);
          return;
        }
        case "GEBLOKKEERD": {
          await meldUitgifteFout(pool, organisatieId, id, {
            stap: tekst(bewijs, "stap"),
            fout: tekst(bewijs, "fout"),
            beleidVersie,
          });
          res.json({ ok: true, reden: "de mislukking is vastgelegd" });
          return;
        }
        default:
          res.status(400).json({
            fout:
              `'${fase}' is geen fase die deze poort aanneemt. Geldig: RECORD_GESCHREVEN, ` +
              `PR_AANGEMAAKT, PR_GEMERGED, LIVE_GEVERIFIEERD, GEBLOKKEERD`,
          });
          return;
      }
    } catch (e) {
      const bericht = (e as Error).message;
      log.waarschuwing("fasemelding geweigerd", { versie: id, fase, fout: bericht });
      /* EEN GEWEIGERDE MELDING IS GEEN SERVERFOUT. De uitvoerder heeft
         iets gemeld dat niet kan; dat is een 409 en geen 500, zodat hij
         het verschil ziet tussen "ik deed iets verkeerd" en "de server
         is stuk". */
      res.status(409).json({ fout: bericht });
    }
  });

  return router;
}
