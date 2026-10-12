/* ============================================================
   DASHBOARD — authenticatie en autorisatie
   ------------------------------------------------------------
   Wachtwoorden met scrypt uit node:crypto, sessies als een
   HMAC-ondertekend cookie. Geen afhankelijkheid, en geen van beide
   zelfbedacht: scrypt is de aanbevolen keuze voor wachtwoorden en een
   ondertekend cookie is een gewone sessie zonder serverstate.

   Drie dingen die hier bewust zo zijn:

   1. GEEN WACHTWOORD = GEEN TOEGANG. Gebruikers worden gezaaid zonder
      hash. Inloggen is dan onmogelijk tot iemand `npm run wachtwoord`
      draait. Een standaardwachtwoord is erger dan geen wachtwoord.
   2. RECHTEN KOMEN UIT DE DATABASE. Niet uit de sessie. Een rol die
      na het inloggen wordt ingetrokken werkt bij het volgende verzoek
      niet meer, want de rechten worden per verzoek opnieuw gelezen.
   3. DE ORGANISATIE ZIT IN DE SESSIE EN IN RLS. Het cookie zegt welke
      organisatie, en `metOrganisatie` zet die als RLS-context. Een
      gemanipuleerd cookie faalt op de HMAC; een geldig cookie van een
      andere organisatie ziet door RLS niets van deze.
   ============================================================ */

import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type pg from "pg";
import { eenRij, rijen } from "../kern/db.ts";
import { IntelFout } from "../kern/fouten.ts";

/**
 * promisify() verliest de overload van scrypt die opties accepteert,
 * dus hier een eigen wrapper. De kostenparameters moeten expliciet
 * meegegeven kunnen worden: ze staan in de hash zodat een oude hash
 * ook na een verhoging nog te verifieren is.
 */
function scryptAsync(
  wachtwoord: string,
  zout: Buffer,
  lengte: number,
  opties: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((klaar, mislukt) => {
    scrypt(wachtwoord, zout, lengte, opties, (fout, sleutel) => {
      if (fout) mislukt(fout);
      else klaar(sleutel);
    });
  });
}

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SLEUTELLENGTE = 64;

/** Hash in de vorm scrypt$N$r$p$zout$sleutel, alles hex. */
export async function maakWachtwoordHash(wachtwoord: string): Promise<string> {
  if (wachtwoord.length < 12) {
    throw new IntelFout("configuratie", "wachtwoord moet minimaal 12 tekens zijn");
  }
  const zout = randomBytes(16);
  const sleutel = await scryptAsync(wachtwoord, zout, SLEUTELLENGTE, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    zout.toString("hex"),
    sleutel.toString("hex"),
  ].join("$");
}

/**
 * Een zout dat nergens een account bij hoort.
 *
 * Dit is GEEN geheim en hoeft het niet te zijn. Het dient alleen om
 * scrypt evenveel werk te laten doen wanneer er niets te vergelijken
 * valt — zie `verbrandWachtwoordTijd`.
 */
const SCHIJNZOUT = Buffer.alloc(16, 0x5a);

/**
 * Doet het scrypt-werk zonder uitkomst, zodat een mislukte inlogpoging
 * even lang duurt als een geslaagde.
 *
 * ZONDER DIT IS ER EEN ENUMERATIEKANAAL. Bestaat een e-mailadres niet
 * (of heeft het nog geen wachtwoord), dan werd scrypt overgeslagen en
 * antwoordde de server in 0,003 ms; bestaat het mét wachtwoord, dan
 * kostte het 23 ms. Het HTTP-antwoord is in beide gevallen identiek,
 * maar de KLOK verraadt welke adressen bestaan. Gemeten verschil op deze
 * machine: mediaan 20,6 ms over 7 metingen.
 */
async function verbrandWachtwoordTijd(wachtwoord: string): Promise<void> {
  await scryptAsync(wachtwoord, SCHIJNZOUT, SLEUTELLENGTE, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
}

export async function controleerWachtwoord(
  wachtwoord: string,
  hash: string | null,
): Promise<boolean> {
  /* Geen hash betekent: dit account bestaat niet, of er is nog nooit een
     wachtwoord gezet. Beide gevallen moeten even lang duren als een echte
     verificatie, anders is de responstijd het antwoord. */
  if (!hash) {
    await verbrandWachtwoordTijd(wachtwoord);
    return false;
  }
  const delen = hash.split("$");
  if (delen.length !== 6 || delen[0] !== "scrypt") {
    await verbrandWachtwoordTijd(wachtwoord);
    return false;
  }
  const n = Number.parseInt(delen[1] ?? "", 10);
  const r = Number.parseInt(delen[2] ?? "", 10);
  const p = Number.parseInt(delen[3] ?? "", 10);
  const zout = Buffer.from(delen[4] ?? "", "hex");
  const verwacht = Buffer.from(delen[5] ?? "", "hex");
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) {
    await verbrandWachtwoordTijd(wachtwoord);
    return false;
  }

  /* DEZE VIER REGELS VOORKOMEN EEN FAAL-OPEN.
     Een hash met een LEEG sleuteldeel — `scrypt$16384$8$1$<zout>$` —
     haalt de vormtoets hierboven (zes delen, begint met 'scrypt'), en
     dan is `verwacht` nul bytes lang. scrypt met keylen 0 geeft een
     lege buffer terug, de lengtes zijn gelijk, en
     timingSafeEqual(leeg, leeg) is TRUE. Gemeten: twee verschillende
     wachtwoorden tegen diezelfde hash gaven beide true, dus ELK
     wachtwoord slaagde.
     Een onleesbare of afgekapte hash moet de deur dicht doen, niet open.
     Daarom eisen we de volle sleutellengte en een echt zout, en begrenzen
     we de kostenparameters op een plausibel bereik zodat een geknutselde
     hash de verificatie ook niet gratis kan maken. */
  if (
    verwacht.length !== SLEUTELLENGTE ||
    zout.length < 16 ||
    n < 1024 || n > 1 << 22 || r < 1 || r > 64 || p < 1 || p > 16
  ) {
    await verbrandWachtwoordTijd(wachtwoord);
    return false;
  }

  const sleutel = await scryptAsync(wachtwoord, zout, verwacht.length, { N: n, r, p });
  // Lengtes kunnen verschillen bij een corrupte hash; timingSafeEqual
  // gooit dan, dus eerst vergelijken.
  if (sleutel.length !== verwacht.length) return false;
  return timingSafeEqual(sleutel, verwacht);
}

// ------------------------------------------------------------
// Sessies
// ------------------------------------------------------------

export type Sessie = {
  readonly gebruikerId: number;
  readonly organisatieId: number;
  readonly verlooptOp: number;
  /**
   * Het intrekkingsanker uit intel.gebruikers.sessie_epoch op het moment
   * van uitgifte. leesGebruiker() houdt dit tegen de database; schuift de
   * epoch op, dan is dit koekje ongeldig. Zie migratie 0015.
   */
  readonly sessieEpoch: number;
};

const SESSIE_DUUR_MS = 8 * 60 * 60 * 1000;

function geheim(): Buffer {
  const waarde = process.env["INTEL_SESSIE_GEHEIM"] ?? "";
  if (waarde.length < 32) {
    throw new IntelFout(
      "configuratie",
      "INTEL_SESSIE_GEHEIM ontbreekt of is korter dan 32 tekens; zonder sessiegeheim geen dashboard",
    );
  }
  return Buffer.from(waarde, "utf8");
}

export function maakSessieCookie(
  gebruikerId: number,
  organisatieId: number,
  sessieEpoch: number,
): string {
  const lading = JSON.stringify({
    g: gebruikerId,
    o: organisatieId,
    v: Date.now() + SESSIE_DUUR_MS,
    e: sessieEpoch,
  });
  const basis = Buffer.from(lading, "utf8").toString("base64url");
  const sig = createHmac("sha256", geheim()).update(basis).digest("base64url");
  return `${basis}.${sig}`;
}

export function leesSessieCookie(cookie: string | undefined): Sessie | null {
  if (!cookie) return null;
  const punt = cookie.lastIndexOf(".");
  if (punt === -1) return null;
  const basis = cookie.slice(0, punt);
  const sig = cookie.slice(punt + 1);

  const verwacht = createHmac("sha256", geheim()).update(basis).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(verwacht);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const lading = JSON.parse(Buffer.from(basis, "base64url").toString("utf8")) as {
      g?: number;
      o?: number;
      v?: number;
      e?: number;
    };
    if (
      typeof lading.g !== "number" ||
      typeof lading.o !== "number" ||
      typeof lading.v !== "number" ||
      /* Een koekje ZONDER epoch is van vóór migratie 0015 en wordt
         geweigerd. Dat is bewust: het alternatief — ontbreken behandelen
         als "epoch 1" — zou een oud koekje door de intrekking heen laten
         glippen, precies wat deze wijziging moet voorkomen. De prijs is
         dat iedereen één keer opnieuw moet inloggen. */
      typeof lading.e !== "number"
    ) {
      return null;
    }
    if (lading.v < Date.now()) return null;
    return {
      gebruikerId: lading.g,
      organisatieId: lading.o,
      verlooptOp: lading.v,
      sessieEpoch: lading.e,
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// Rechten
// ------------------------------------------------------------

export type Gebruiker = {
  readonly id: number;
  readonly email: string;
  readonly naam: string;
  readonly organisatieId: number;
  readonly rollen: readonly string[];
  readonly rechten: ReadonlySet<string>;
};

/**
 * Leest gebruiker, rollen en rechten uit de database. Per verzoek, niet
 * uit de sessie: een ingetrokken rol werkt dan direct niet meer.
 */
export async function leesGebruiker(
  c: pg.PoolClient,
  gebruikerId: number,
  /**
   * De epoch uit het koekje. Wordt tegen de database gehouden; wijkt hij
   * af, dan is de sessie ingetrokken en geeft deze functie null.
   *
   * Optioneel gelaten zodat aanroepers die GEEN sessie vertegenwoordigen
   * (de CLI's, tests) de gebruiker nog kunnen lezen. Elke aanroep uit het
   * verzoekpad geeft hem mee; `vereistInlog` doet dat.
   */
  sessieEpoch?: number,
): Promise<Gebruiker | null> {
  const g = await eenRij<{
    id: number;
    email: string;
    naam: string;
    organisatie_id: number;
    sessie_epoch: number;
  }>(
    c,
    "select id, email, naam, organisatie_id, sessie_epoch from intel.gebruikers where id = $1 and actief",
    [gebruikerId],
  );
  if (!g) return null;
  /* De intrekking. Zonder deze drie regels blijft een koekje acht uur
     geldig, ook na een wachtwoordrotatie. */
  if (sessieEpoch !== undefined && g.sessie_epoch !== sessieEpoch) return null;

  const rollen = await rijen<{ rol: string }>(
    c,
    "select rol from intel.gebruiker_rollen where gebruiker_id = $1",
    [gebruikerId],
  );
  const rechten = await rijen<{ recht: string }>(
    c,
    `select distinct rr.recht
       from intel.gebruiker_rollen gr
       join intel.rol_rechten rr on rr.rol = gr.rol
      where gr.gebruiker_id = $1`,
    [gebruikerId],
  );

  return {
    id: g.id,
    email: g.email,
    naam: g.naam,
    organisatieId: g.organisatie_id,
    rollen: rollen.map((r) => r.rol),
    rechten: new Set(rechten.map((r) => r.recht)),
  };
}

export async function zoekGebruikerOpEmail(
  c: pg.PoolClient,
  email: string,
): Promise<{
  id: number;
  organisatie_id: number;
  wachtwoord_hash: string | null;
  sessie_epoch: number;
} | null> {
  return eenRij(
    c,
    `select id, organisatie_id, wachtwoord_hash, sessie_epoch
       from intel.gebruikers
      where lower(email) = lower($1) and actief`,
    [email],
  );
}
