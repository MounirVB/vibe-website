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

export async function controleerWachtwoord(
  wachtwoord: string,
  hash: string | null,
): Promise<boolean> {
  if (!hash) return false;
  const delen = hash.split("$");
  if (delen.length !== 6 || delen[0] !== "scrypt") return false;
  const n = Number.parseInt(delen[1] ?? "", 10);
  const r = Number.parseInt(delen[2] ?? "", 10);
  const p = Number.parseInt(delen[3] ?? "", 10);
  const zout = Buffer.from(delen[4] ?? "", "hex");
  const verwacht = Buffer.from(delen[5] ?? "", "hex");
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

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

export function maakSessieCookie(gebruikerId: number, organisatieId: number): string {
  const lading = JSON.stringify({
    g: gebruikerId,
    o: organisatieId,
    v: Date.now() + SESSIE_DUUR_MS,
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
    };
    if (
      typeof lading.g !== "number" ||
      typeof lading.o !== "number" ||
      typeof lading.v !== "number"
    ) {
      return null;
    }
    if (lading.v < Date.now()) return null;
    return { gebruikerId: lading.g, organisatieId: lading.o, verlooptOp: lading.v };
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
): Promise<Gebruiker | null> {
  const g = await eenRij<{ id: number; email: string; naam: string; organisatie_id: number }>(
    c,
    "select id, email, naam, organisatie_id from intel.gebruikers where id = $1 and actief",
    [gebruikerId],
  );
  if (!g) return null;

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
): Promise<{ id: number; organisatie_id: number; wachtwoord_hash: string | null } | null> {
  return eenRij(
    c,
    `select id, organisatie_id, wachtwoord_hash
       from intel.gebruikers
      where lower(email) = lower($1) and actief`,
    [email],
  );
}
