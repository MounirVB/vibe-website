/* ============================================================
   WACHTWOORD INSTELLEN — eenmalige instelsleutels
   ------------------------------------------------------------
   De operator geeft een sleutel uit; de HOUDER van die sleutel kiest
   daarna zelf een wachtwoord. De operator ziet dat wachtwoord nooit.
   Dat is het hele doel: tot Release 2.3 kreeg een account zijn
   wachtwoord van een ontwikkelaar in een terminal, en moest dat geheim
   daarna ook nog ergens naartoe.

   WAT HIER BEWUST NIET GEBEURT

   De sleutel wordt nergens bewaard. `maakInstelsleutel` geeft hem ÉÉN
   keer terug aan de aanroeper en slaat alleen de sha256 op. Komt hij
   daarna kwijt, dan is er geen manier om hem terug te halen — alleen om
   een nieuwe te maken. Dat is dezelfde afweging als bij een
   wachtwoordhash, en om dezelfde reden.

   WAAROM SHA256 EN NIET SCRYPT VOOR DE SLEUTEL

   Een wachtwoord is kort, door een mens gekozen en dus te raden; daar
   hoort een langzame hash met zout bij. Deze sleutel is 32 willekeurige
   bytes uit randomBytes. Die valt niet te raden, dus kost een langzame
   hash alleen tijd bij het opzoeken zonder iets toe te voegen. Wat wel
   nodig is, is dat de tabel geen bruikbare sleutel bevat — en dat doet
   sha256 net zo goed.
   ============================================================ */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type pg from "pg";
import { eenRij } from "../kern/db.ts";
import { IntelFout } from "../kern/fouten.ts";
import { maakWachtwoordHash } from "./auth.ts";

/** Hoe lang een instelsleutel geldig is. */
export const SLEUTEL_GELDIG_MS = 48 * 60 * 60 * 1000;

const hashVan = (sleutel: string) => createHash("sha256").update(sleutel, "utf8").digest("hex");

/**
 * Geeft een nieuwe instelsleutel uit en ONGELDIG het huidige wachtwoord.
 *
 * Die tweede helft is het punt van een rotatie. Zonder die stap zou het
 * oude, door een ontwikkelaar gekozen wachtwoord blijven werken zolang
 * de sleutel niet is ingewisseld, en dan is er niets geroteerd. De
 * sessie-epoch schuift mee op, dus lopende sessies vallen om.
 *
 * Draait als EIGENAAR: `wachtwoord_hash` en `sessie_epoch` zijn sinds
 * migratie 0015 buiten bereik van de applicatierol, en het uitgeven van
 * een sleutel is een operatorhandeling.
 */
export async function maakInstelsleutel(
  c: pg.PoolClient,
  organisatieId: number,
  email: string,
  opties: {
    geldigMs?: number;
    uitgegevenDoor?: string;
    ongeldigMaakWachtwoord?: boolean;
    /**
     * Een sleutel die de AANROEPER al heeft gekozen.
     *
     * Bestaat om dezelfde reden als `INTEL_WACHTWOORD` bij de
     * wachtwoord-CLI: npm echoot zijn commandoregel en een platform als
     * Railway bewaart die uitvoer als deployment-log. Laat je deze
     * functie de sleutel genereren en print de CLI hem, dan staat een
     * geldige sleutel in een logarchief dat hem overleeft.
     * Door hem buiten de container te kiezen en alleen de hash te laten
     * opslaan, komt hij nergens in een log terecht.
     */
    sleutel?: string;
  } = {},
): Promise<{ sleutel: string; gebruikerId: number; verlooptOp: string }> {
  const g = await eenRij<{ id: number }>(
    c,
    "select id from intel.gebruikers where lower(email) = lower($1) and organisatie_id = $2 and actief",
    [email, organisatieId],
  );
  if (!g) throw new IntelFout("configuratie", `geen actieve gebruiker met e-mail ${email}`);

  /* Een door de aanroeper gekozen sleutel moet wel genoeg entropie
     hebben; anders is hij te raden en is de hele stroom waardeloos. */
  if (opties.sleutel !== undefined && opties.sleutel.length < 32) {
    throw new IntelFout("configuratie", "een meegegeven instelsleutel moet minstens 32 tekens zijn");
  }
  const sleutel = opties.sleutel ?? randomBytes(32).toString("base64url");
  const geldigMs = opties.geldigMs ?? SLEUTEL_GELDIG_MS;

  /* Een eventuele vorige ONGEBRUIKTE sleutel vervalt. De partiële
     unieke index staat er maar één toe, en twee geldige sleutels voor
     hetzelfde account zijn er één te veel. */
  await c.query(
    "update intel.wachtwoord_tokens set gebruikt_op = now() where gebruiker_id = $1 and gebruikt_op is null",
    [g.id],
  );

  const rij = await eenRij<{ verloopt_op: string }>(
    c,
    `insert into intel.wachtwoord_tokens
       (organisatie_id, gebruiker_id, token_hash, verloopt_op, uitgegeven_door)
     values ($1, $2, $3, now() + ($4::bigint * interval '1 millisecond'), $5)
     returning verloopt_op::text`,
    [organisatieId, g.id, hashVan(sleutel), geldigMs, opties.uitgegevenDoor ?? "operator"],
  );

  if (opties.ongeldigMaakWachtwoord !== false) {
    await c.query(
      `update intel.gebruikers
          set wachtwoord_hash = null,
              sessie_epoch = sessie_epoch + 1
        where id = $1`,
      [g.id],
    );
  }

  return { sleutel, gebruikerId: g.id, verlooptOp: rij!.verloopt_op };
}

export type SleutelStand =
  | { readonly ok: true; readonly tokenId: number; readonly gebruikerId: number; readonly email: string }
  | { readonly ok: false; readonly reden: "onbekend" | "verlopen" | "gebruikt" };

/**
 * Zoekt een sleutel op en zegt of hij bruikbaar is.
 *
 * Alle drie de afwijzingen geven dezelfde soort antwoord naar buiten;
 * het verschil staat hier alleen om in een log te kunnen zien WAT er
 * mis was. Een bezoeker hoort niet te leren of een sleutel bestond.
 */
export async function leesInstelsleutel(
  c: pg.PoolClient,
  sleutel: string,
): Promise<SleutelStand> {
  if (typeof sleutel !== "string" || sleutel.length < 20 || sleutel.length > 200) {
    return { ok: false, reden: "onbekend" };
  }
  const r = await eenRij<{
    id: number;
    gebruiker_id: number;
    email: string;
    verlopen: boolean;
    gebruikt: boolean;
    token_hash: string;
  }>(
    c,
    `select t.id, t.gebruiker_id, g.email,
            (t.verloopt_op <= now())        as verlopen,
            (t.gebruikt_op is not null)     as gebruikt,
            t.token_hash
       from intel.wachtwoord_tokens t
       join intel.gebruikers g on g.id = t.gebruiker_id
      where t.token_hash = $1`,
    [hashVan(sleutel)],
  );
  if (!r) return { ok: false, reden: "onbekend" };

  /* De vergelijking is al door de database gedaan op een hash, maar een
     constant-time vergelijking kost niets en houdt het patroon van dit
     bestand gelijk aan auth.ts. */
  const a = Buffer.from(r.token_hash);
  const b = Buffer.from(hashVan(sleutel));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reden: "onbekend" };

  if (r.gebruikt) return { ok: false, reden: "gebruikt" };
  if (r.verlopen) return { ok: false, reden: "verlopen" };
  return { ok: true, tokenId: r.id, gebruikerId: r.gebruiker_id, email: r.email };
}

/**
 * Wisselt een sleutel in voor een nieuw wachtwoord.
 *
 * EENMALIGHEID WORDT DOOR DE DATABASE AFGEDWONGEN en niet door de
 * controle hierboven: het afstempelen gebeurt met
 * `where gebruikt_op is null`, en als dat nul rijen raakt heeft iemand
 * anders hem net gebruikt. Twee verzoeken met dezelfde sleutel kunnen
 * elkaar dus niet inhalen.
 *
 * Draait als EIGENAAR: zie maakInstelsleutel.
 */
export async function wisselInstelsleutelIn(
  c: pg.PoolClient,
  sleutel: string,
  nieuwWachtwoord: string,
): Promise<{ ok: boolean; reden?: string; gebruikerId?: number }> {
  const stand = await leesInstelsleutel(c, sleutel);
  if (!stand.ok) return { ok: false, reden: stand.reden };

  /* maakWachtwoordHash bewaakt de minimumlengte; één plek voor die regel. */
  const hash = await maakWachtwoordHash(nieuwWachtwoord);

  const afgestempeld = await c.query(
    "update intel.wachtwoord_tokens set gebruikt_op = now() where id = $1 and gebruikt_op is null",
    [stand.tokenId],
  );
  if ((afgestempeld.rowCount ?? 0) === 0) return { ok: false, reden: "gebruikt" };

  await c.query(
    `update intel.gebruikers
        set wachtwoord_hash = $2,
            sessie_epoch = sessie_epoch + 1
      where id = $1`,
    [stand.gebruikerId, hash],
  );

  return { ok: true, gebruikerId: stand.gebruikerId };
}
