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

   (b) is wat hier staat, met één leesroute, één schrijfroute en één
   standroute. De uitvoerder krijgt nooit SQL in handen; hij krijgt een
   opdracht en meldt een fase terug. Elke beslissing, elke controle en
   elke auditregel blijft aan de serverkant.

   ------------------------------------------------------------
   WAT ER IN V1.1 IS VERVANGEN, EN WAAROM

   V1 hing aan één statisch geheim: INTEL_MACHINE_SLEUTEL, een
   bearer-token in een GitHub-secret. Dat bewees "iemand kent het
   geheim" en verder niets — niet welke repository, niet welke
   werkstroom, niet welke run — en het bleef geldig tot iemand hem
   rouleerde. Lekte het, dan gaf het de volledige uitgiftewachtrij met
   de nog niet publieke tekst van goedgekeurde artikelen erin.

   Nu bewijst GitHub het zelf. Elk verzoek draagt een OIDC-token dat
   GITHUB ondertekent, met de repository, het werkstroompad, de run-id,
   de poging, de commit, de ref en het event erin. dashboard/oidc.ts
   doet de acht cryptografische en inhoudelijke controles; deze module
   doet de drie die een database vragen:

     EENMALIGHEID   de `jti` gaat in intel.machine_tokens, waarvan hij
                    de primaire sleutel is. Een tweede aanbieding van
                    hetzelfde token botst dus op de database (0059).
     RUNBINDING     een fase mag alleen worden gemeld door de run die
                    de vorige fase deed — tenzij de keten officieel is
                    gestrand. Die regel staat in uitgifte/opdracht.ts,
                    want hij leest het publicatielogboek.
     ORGANISATIE    uit de SERVERconfiguratie, nooit uit het verzoek.

   ER IS GEEN SERVERGEHEIM MEER. Alleen configuratie: welke repository
   en welke werkstroom mogen. Een geheim dat niet bestaat, kan niet
   lekken. Ontbreekt die configuratie, dan antwoordt elke route 503 —
   dezelfde fail-closed regel als V1 had.

   ------------------------------------------------------------
   WAT DEZE POORT NIET AANNEEMT VAN DE AANROEPER

   · GEEN INHOUD. Er is geen enkel veld waarin de uitvoerder tekst van
     een artikel kan meegeven. Hij meldt een HASH, en publiceer() bouwt
     het record zelf opnieuw en vergelijkt. Zou hij inhoud mogen
     sturen, dan was deze poort een tweede redactie.
   · GEEN RUNIDENTITEIT UIT HET LICHAAM. De repository, de werkstroom
     en de run-id komen UITSLUITEND uit het ondertekende token. Een veld
     'run_id' in de JSON doet niets; dat is precies het verschil tussen
     een bewijs en een bewering.
   · GEEN FASE DIE NIET KAN. De toestandsmachine weigert elke overgang
     die niet volgt op de fase die in het logboek staat.
   · GEEN IDENTITEIT VAN EEN MENS. Alles wat hier binnenkomt wordt
     vastgelegd als actor_soort 'systeem' met een grond uit het
     register. Een werkstroom is geen persoon, en #79 bestaat juist om
     die twee niet te laten verwisselen.
   ============================================================ */

import express, { type Request, type Response, type Router } from "express";
import type { Pool } from "pg";
import { configLezen } from "../kern/config.ts";
import { metOrganisatie } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { maakBegrenzer } from "./bescherming.ts";
import {
  allowlistUitOmgeving,
  verifieerGithubToken,
  type Haler,
  type RunIdentiteit,
} from "./oidc.ts";
import {
  aanvaardMerge,
  aanvaardPr,
  aanvaardRecord,
  maakUitgifteWachtrij,
  meldUitgifteFout,
  verifieerUitgifteLive,
} from "../uitgifte/opdracht.ts";

const log = maakLogger("machinepoort");

/** Wat een geverifieerd verzoek met zich meedraagt. */
type MetRun = Request & { run?: RunIdentiteit; organisatieId?: number };

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
  return w
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
}

/**
 * Legt vast dat dit token is gebruikt, en weigert een tweede keer.
 *
 * DE DATABASE IS DE CONTROLE EN NIET EEN IF. De `jti` is de primaire
 * sleutel van intel.machine_tokens (0059), dus een herhaling botst op
 * een unieke index. Dat werkt ook met twee instanties van deze dienst,
 * waar een Map in het proces niets zou betekenen.
 *
 * DE OPRUIMING STAAT ERBIJ. Een verlopen token kan niet meer worden
 * hergebruikt — oidc.ts weigert hem op `exp` en op de leeftijdsgrens —
 * dus de rij mag weg zodra zijn geldigheid voorbij is. Zonder dit zou de
 * tabel met elke aanroep groeien.
 */
async function verbruikToken(
  pool: Pool,
  organisatieId: number,
  run: RunIdentiteit,
  handeling: string,
): Promise<void> {
  await metOrganisatie(pool, { organisatieId }, async (c) => {
    await c.query("delete from intel.machine_tokens where verloopt_op < now()");
    try {
      await c.query(
        `insert into intel.machine_tokens
           (jti, organisatie_id, repository, workflow_ref, run_id, run_attempt, handeling,
            verloopt_op)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          run.jti,
          organisatieId,
          run.repository,
          run.workflowRef,
          run.runId,
          run.runAttempt,
          handeling,
          run.verlooptOp.toISOString(),
        ],
      );
    } catch (e) {
      const bericht = (e as Error).message;
      if (/machine_tokens_pkey|duplicate key/.test(bericht)) {
        throw new Error(
          `dit autorisatiebewijs is al gebruikt (jti ${run.jti.slice(0, 12)}…). Een token werkt ` +
            `precies één keer; vraag per aanroep een nieuw token op`,
        );
      }
      throw e;
    }
  });
}

/**
 * De router met de drie routes.
 *
 * Wordt gemonteerd onder /machine door maakApp(). `haal` is alleen voor
 * toetsen: die serveren hun eigen JWKS op 127.0.0.1.
 */
export function maakMachineRouter(pool: Pool, opties: { readonly haal?: Haler } = {}): Router {
  const router = express.Router();

  /* EEN EIGEN JSON-PARSER, EN ALLEEN HIER. De rest van het dashboard is
     een formulierentoepassing met express.urlencoded; JSON globaal
     aanzetten zou elke bestaande route een tweede invoerweg geven die
     niemand heeft getoetst. 8 kB is ruim: het zwaarste bewijs is een
     lijst checknamen. */
  router.use(express.json({ limit: "8kb" }));

  /* DE TEMPOLIMIET. Een OIDC-token is niet te raden, dus dit is geen
     bescherming tegen brute kracht. Hij staat er omdat een publiek
     endpoint zonder limiet een gratis manier is om deze server bezig te
     houden: elke GET /machine/uitgifte bouwt registerrecords met
     poortcontroles en claimqueries erachter, en elke verificatie doet
     een RSA-verificatie.

     HONDERDTWINTIG PER MINUUT, en dat is met opzet ruim. De werkstroom
     draait twee keer per dag en doet dan een handvol verzoeken; een
     toetssuite doet er tientallen in een paar seconden. Een limiet die
     een eigen toets omver duwt, wordt bij de eerste rode run verhoogd of
     uitgezet, en dan beschermt hij niets meer. */
  const begrenzer = maakBegrenzer({ maximum: 120, vensterMs: 60_000, naam: "machinepoort-ip" });

  /* De poortwacht. Staat vóór elke route, dus er is geen pad dat hem
     overslaat. */
  router.use((req: MetRun, res: Response, next) => {
    void (async () => {
      const perIp = begrenzer.sta(req.ip ?? "onbekend");
      if (!perIp.toegestaan) {
        log.waarschuwing("machinepoort begrensd", { ip: req.ip ?? "onbekend", pad: req.path });
        res.setHeader("retry-after", String(Math.ceil(perIp.overMs / 1000)));
        res.status(429).json({
          fout: `te veel verzoeken; probeer het over ${Math.ceil(perIp.overMs / 1000)} seconden opnieuw`,
        });
        return;
      }

      const allowlist = allowlistUitOmgeving();
      if (allowlist === null) {
        log.waarschuwing("machinepoort geweigerd: geen allowlist geconfigureerd");
        res.status(503).json({
          fout:
            "INTEL_OIDC_AUDIENCE, INTEL_UITGIFTE_REPOSITORY en INTEL_UITGIFTE_WORKFLOW moeten alle " +
            "drie gezet zijn. Zonder die allowlist is er geen uitgifte; dit platform werkt niet " +
            "zonder. Er is GEEN servergeheim meer nodig — GitHub ondertekent zelf.",
        });
        return;
      }

      const kop = req.headers.authorization ?? "";
      const aangeboden = kop.startsWith("Bearer ") ? kop.slice(7).trim() : "";
      if (aangeboden.length === 0) {
        res.status(401).json({
          fout:
            "geen Bearer-token. Deze poort verwacht een GitHub-OIDC-token; een statisch geheim " +
            "wordt niet meer aanvaard",
        });
        return;
      }

      let run: RunIdentiteit;
      try {
        run = await verifieerGithubToken(aangeboden, allowlist, {
          ...(opties.haal === undefined ? {} : { haal: opties.haal }),
        });
      } catch (e) {
        log.waarschuwing("machinepoort geweigerd: token niet geldig", {
          pad: req.path,
          ip: req.ip ?? "onbekend",
          fout: (e as Error).message.slice(0, 200),
        });
        res.status(401).json({ fout: (e as Error).message });
        return;
      }

      /* DE ORGANISATIE KOMT UIT DE SERVER. Niet uit het token en niet
         uit het lichaam: een werkstroom hoort niet te kiezen voor welke
         organisatie hij meldt. */
      let organisatieId: number;
      try {
        organisatieId = await huidigeOrganisatie(pool);
      } catch (e) {
        res.status(500).json({ fout: (e as Error).message });
        return;
      }

      /* EENMALIGHEID, VOOR HET WERK. Een token wordt verbruikt zodra hij
         is gezien, en niet pas als de handeling lukt: anders blijft een
         token na een mislukte poging herbruikbaar. De uitvoerder vraagt
         per aanroep een nieuw token op, dus dit kost hem niets. */
      try {
        await verbruikToken(pool, organisatieId, run, `${req.method} ${req.path}`);
      } catch (e) {
        log.waarschuwing("machinepoort geweigerd: token hergebruikt", {
          jti: run.jti.slice(0, 12),
          runId: run.runId,
        });
        res.status(401).json({ fout: (e as Error).message });
        return;
      }

      req.run = run;
      req.organisatieId = organisatieId;
      next();
    })().catch(next);
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
  router.get("/stand", (req: MetRun, res: Response) => {
    const config = configLezen();
    res.json({
      sha: process.env["RAILWAY_GIT_COMMIT_SHA"] ?? null,
      omgeving: config.omgeving,
      dienst: process.env["RAILWAY_SERVICE_NAME"] ?? null,
      op: new Date().toISOString(),
      /* De run terug, zodat een werkstroom in zijn eigen log ziet onder
         welke identiteit hij is binnengelaten. */
      run: { repository: req.run?.repository ?? null, runId: req.run?.runId ?? null },
    });
  });

  /** De uitgiftewachtrij: wat mag er nu uit, en met welke opdracht? */
  router.get("/uitgifte", async (req: MetRun, res: Response) => {
    try {
      const uit = await maakUitgifteWachtrij(pool, req.organisatieId!);
      log.info("wachtrij uitgegeven", {
        opdrachten: uit.opdrachten.length,
        stop: uit.stop.map((s) => s.sleutel),
        runId: req.run?.runId,
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
  router.post("/uitgifte/:id", async (req: MetRun, res: Response) => {
    const id = Number.parseInt(req.params["id"] ?? "", 10);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ fout: "geen geldige inhoudsversie-id" });
      return;
    }
    const body = (req.body ?? {}) as Bewijs;
    const fase = typeof body["fase"] === "string" ? body["fase"] : "";
    const bewijs = (body["bewijs"] ?? {}) as Bewijs;
    const organisatieId = req.organisatieId!;
    /* DE RUN KOMT UIT HET TOKEN. Niet uit het lichaam — zie de
       sectiekop. uitgifte/opdracht.ts bindt de fase eraan. */
    const run = {
      runId: req.run!.runId,
      runAttempt: req.run!.runAttempt,
      repository: req.run!.repository,
      workflowRef: req.run!.workflowRef,
      sha: req.run!.sha,
    };

    try {
      const beleidVersie = tekst(bewijs, "beleidVersie");

      switch (fase) {
        case "RECORD_GESCHREVEN": {
          const uit = await aanvaardRecord(pool, organisatieId, id, {
            recordHash: tekst(bewijs, "recordHash"),
            waar: tekst(bewijs, "waar"),
            beleidVersie,
            run,
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
            run,
          });
          res.status(uit.ok ? 200 : 409).json(uit);
          return;
        }
        case "PR_GEMERGED": {
          const uit = await aanvaardMerge(pool, organisatieId, id, {
            mergeCommit: tekst(bewijs, "mergeCommit"),
            checksGroen: lijst(bewijs, "checksGroen"),
            beleidVersie,
            run,
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
            run,
          });
          res.status(uit.ok ? 200 : 409).json(uit);
          return;
        }
        case "GEBLOKKEERD": {
          await meldUitgifteFout(pool, organisatieId, id, {
            stap: tekst(bewijs, "stap"),
            fout: tekst(bewijs, "fout"),
            beleidVersie,
            run,
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
