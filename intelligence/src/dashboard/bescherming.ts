/* ============================================================
   DASHBOARD — productiebescherming
   ------------------------------------------------------------
   Vier dingen die een intern dashboard in productie nodig heeft en
   die er nog niet waren: een correlatie-ID per verzoek, een
   snelheidsbegrenzer op het inloggen, een slotje per account na te
   veel mislukte pogingen, en CSRF-bescherming op alles wat de staat
   verandert.

   WAAROM DE BEGRENZER IN HET GEHEUGEN ZIT, EN WAT DAT KOST
   Er is geen Redis in deze opstelling en er komt er geen bij voor
   alleen dit. De tellers staan dus in het procesgeheugen. Dat heeft
   twee gevolgen die eerlijk benoemd moeten worden:

     1 Met MEER DAN EEN instantie heeft elke instantie zijn eigen
       teller. Vijf pogingen per instantie betekent bij drie
       instanties vijftien pogingen. De beoogde opstelling is ÉÉN
       instantie (zie docs/PRODUCTIE.md); bij opschalen hoort dit naar
       een gedeelde teller.
     2 Een herstart wist de tellers. Een aanvaller die herstarts kan
       uitlokken kan het slot dus omzeilen. In deze opstelling kan dat
       niet van buiten.

   Daarom wordt elke blokkade OOK naar het auditspoor geschreven. De
   teller is vluchtig, het spoor niet: wie het dashboard aanvalt is
   achteraf te zien, ook na een herstart.

   CSRF MET EEN DUBBELE SUBMIT
   Het sessiekoekje staat al op SameSite=Strict, wat een cross-site
   formulierpost in elke moderne browser blokkeert. Dat is echter een
   browsereigenschap en geen controle van de server. Daarom hier ook
   een getekend token: één in een koekje, één in het formulier, en de
   server eist dat ze gelijk zijn. Het token is HMAC-getekend met het
   sessiegeheim, dus hij is niet te verzinnen.

   Ook het INLOGFORMULIER krijgt die bescherming. Inlog-CSRF is minder
   ernstig dan een state-wijziging, maar het bestaat: een aanvaller kan
   een slachtoffer in ZIJN account laten inloggen en dan meekijken wat
   het slachtoffer daar doet.
   ============================================================ */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("bescherming");

/* ------------------------------------------------------------------
   Correlatie-ID
   ------------------------------------------------------------------ */

export const CORRELATIE_KOP = "x-verzoek-id";

export type MetCorrelatie = Request & { correlatieId?: string };

/**
 * Geeft elk verzoek een ID, en echoot het terug.
 *
 * Een meegestuurd ID wordt overgenomen zodat een reverse proxy of een
 * aanroepende dienst zijn eigen spoor kan doorgeven — maar alleen als
 * het er onschuldig uitziet. Een ID komt in logregels terecht, en een
 * ongefilterde waarde uit een header is dan een injectiepad naar het
 * logbestand.
 */
export function correlatie(req: MetCorrelatie, res: Response, next: NextFunction): void {
  const meegestuurd = req.headers[CORRELATIE_KOP];
  const kandidaat = Array.isArray(meegestuurd) ? meegestuurd[0] : meegestuurd;
  const schoon =
    typeof kandidaat === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(kandidaat)
      ? kandidaat
      : randomBytes(12).toString("base64url");
  req.correlatieId = schoon;
  res.setHeader(CORRELATIE_KOP, schoon);
  next();
}

/* ------------------------------------------------------------------
   Snelheidsbegrenzer
   ------------------------------------------------------------------ */

type Emmer = { tellers: number[]; };

export type BegrenzerOpties = {
  /** Hoeveel verzoeken mogen er in het venster. */
  readonly maximum: number;
  /** Venster in milliseconden. */
  readonly vensterMs: number;
  /** Naam voor de logregel. */
  readonly naam: string;
};

export type Begrenzer = {
  /** Mag dit verzoek door? Registreert de poging als hij doorgaat. */
  readonly sta: (sleutel: string) => { toegestaan: boolean; overMs: number; gebruikt: number };
  readonly vergeet: (sleutel: string) => void;
  readonly omvang: () => number;
};

/**
 * Glijdend venster. Houdt per sleutel de tijdstippen van de pogingen
 * bij en gooit alles buiten het venster weg.
 *
 * Een glijdend venster in plaats van een vaste emmer, omdat een vaste
 * emmer op de vensterovergang het dubbele toestaat: vijf pogingen aan
 * het eind van minuut één en vijf aan het begin van minuut twee.
 */
export function maakBegrenzer(opties: BegrenzerOpties): Begrenzer {
  const emmers = new Map<string, Emmer>();

  const opruimen = (nu: number) => {
    for (const [sleutel, e] of emmers) {
      e.tellers = e.tellers.filter((t) => nu - t < opties.vensterMs);
      if (e.tellers.length === 0) emmers.delete(sleutel);
    }
  };

  return {
    sta(sleutel) {
      const nu = Date.now();
      if (emmers.size > 10_000) opruimen(nu);

      const e = emmers.get(sleutel) ?? { tellers: [] };
      e.tellers = e.tellers.filter((t) => nu - t < opties.vensterMs);

      if (e.tellers.length >= opties.maximum) {
        const oudste = e.tellers[0]!;
        emmers.set(sleutel, e);
        return {
          toegestaan: false,
          overMs: opties.vensterMs - (nu - oudste),
          gebruikt: e.tellers.length,
        };
      }
      e.tellers.push(nu);
      emmers.set(sleutel, e);
      return { toegestaan: true, overMs: 0, gebruikt: e.tellers.length };
    },
    vergeet(sleutel) {
      emmers.delete(sleutel);
    },
    omvang() {
      return emmers.size;
    },
  };
}

/* ------------------------------------------------------------------
   Slot per account
   ------------------------------------------------------------------ */

export type SlotOpties = {
  readonly maxPogingen: number;
  readonly slotMs: number;
};

export type Slot = {
  readonly isOpSlot: (sleutel: string) => { opSlot: boolean; overMs: number };
  readonly misluktePoging: (sleutel: string) => { opSlot: boolean; pogingen: number };
  readonly gelukt: (sleutel: string) => void;
};

/**
 * Oplopend slot per account.
 *
 * Bewust niet "na N pogingen voor altijd op slot": dat maakt een
 * denial-of-service op een bekende gebruiker triviaal. Na N mislukte
 * pogingen gaat het account voor `slotMs` op slot, en een geslaagde
 * inlog wist de teller.
 */
export function maakSlot(opties: SlotOpties): Slot {
  const staat = new Map<string, { pogingen: number; totMs: number }>();

  return {
    isOpSlot(sleutel) {
      const s = staat.get(sleutel);
      if (!s) return { opSlot: false, overMs: 0 };
      const nu = Date.now();
      if (s.totMs > nu) return { opSlot: true, overMs: s.totMs - nu };
      if (s.totMs !== 0 && s.totMs <= nu) {
        // Slot is verlopen; begin opnieuw.
        staat.delete(sleutel);
      }
      return { opSlot: false, overMs: 0 };
    },
    misluktePoging(sleutel) {
      const s = staat.get(sleutel) ?? { pogingen: 0, totMs: 0 };
      s.pogingen += 1;
      if (s.pogingen >= opties.maxPogingen) {
        s.totMs = Date.now() + opties.slotMs;
        s.pogingen = 0;
        staat.set(sleutel, s);
        return { opSlot: true, pogingen: opties.maxPogingen };
      }
      staat.set(sleutel, s);
      return { opSlot: false, pogingen: s.pogingen };
    },
    gelukt(sleutel) {
      staat.delete(sleutel);
    },
  };
}

/* ------------------------------------------------------------------
   CSRF
   ------------------------------------------------------------------ */

export const CSRF_KOEKJE = "vibe_intel_csrf";
export const CSRF_VELD = "_csrf";

function teken(waarde: string, geheim: string): string {
  return createHmac("sha256", geheim).update(waarde).digest("base64url");
}

/** Maakt een nieuw, getekend CSRF-token. */
export function maakCsrfToken(geheim: string): string {
  const ruw = randomBytes(18).toString("base64url");
  return `${ruw}.${teken(ruw, geheim)}`;
}

/** Is dit token door ons getekend? */
export function csrfTokenGeldig(token: string | undefined, geheim: string): boolean {
  if (!token) return false;
  const punt = token.lastIndexOf(".");
  if (punt <= 0) return false;
  const ruw = token.slice(0, punt);
  const ondertekening = token.slice(punt + 1);
  const verwacht = teken(ruw, geheim);
  const a = Buffer.from(ondertekening);
  const b = Buffer.from(verwacht);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Vergelijkt het token uit het koekje met dat uit het formulier.
 *
 * Beide moeten door ons getekend zijn EN aan elkaar gelijk. Alleen
 * "getekend" is niet genoeg: dan zou een token uit een andere sessie
 * ook werken.
 */
export function csrfPaarGeldig(
  uitKoekje: string | undefined,
  uitFormulier: unknown,
  geheim: string,
): boolean {
  if (typeof uitFormulier !== "string") return false;
  if (!csrfTokenGeldig(uitKoekje, geheim)) return false;
  if (!csrfTokenGeldig(uitFormulier, geheim)) return false;
  const a = Buffer.from(uitKoekje!);
  const b = Buffer.from(uitFormulier);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Leest een koekje uit de verzoekheader. */
export function leesKoekje(req: Request, naam: string): string | undefined {
  const ruw = req.headers.cookie;
  if (!ruw) return undefined;
  for (const deel of ruw.split(";")) {
    const [n, ...rest] = deel.trim().split("=");
    if (n === naam) return rest.join("=");
  }
  return undefined;
}

/* ------------------------------------------------------------------
   Veilige foutafhandeling
   ------------------------------------------------------------------ */

/**
 * Laatste vangnet. Logt met correlatie-ID en geeft de bezoeker een
 * neutrale melding.
 *
 * De stacktrace gaat naar het log en NOOIT naar de browser: een
 * stacktrace verraadt paden, modulenamen en soms queryfragmenten.
 */
export function foutvanger(
  fout: unknown,
  req: MetCorrelatie,
  res: Response,
  _next: NextFunction,
): void {
  log.fout("onverwachte fout in een verzoek", {
    verzoek_id: req.correlatieId,
    pad: req.path,
    methode: req.method,
    fout: fout instanceof Error ? fout.message : String(fout),
  });
  if (res.headersSent) return;
  res
    .status(500)
    .type("text/plain; charset=utf-8")
    .send(`Er ging iets mis. Verzoek-ID ${req.correlatieId ?? "onbekend"}.\n`);
}
