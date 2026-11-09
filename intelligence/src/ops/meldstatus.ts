/* ============================================================
   OPS — van 'de provider heeft het aangenomen' naar 'het is aangekomen'
   ------------------------------------------------------------
   WAAROM DEZE LAAG BESTAAT.

   `intel.meld_berichten` draagt vier tijdstempels die vier
   VERSCHILLENDE dingen betekenen, en migratie 0039 zegt dat zelf in het
   kolomcommentaar:

     aangeboden_op    wij hebben het aan de provider gegeven
     geaccepteerd_op  de provider heeft het AANGENOMEN (HTTP 2xx + id)
     afgeleverd_op    de ontvangende mailserver heeft het GEKREGEN
     gelezen_op       de ontvanger heeft het geopend

   Gemeten op 9 november 2026 in productie: 54 berichten, 54
   geaccepteerd, 0 opgegeven — en `afgeleverd_op` leeg bij alle 54. Dat
   was eerlijk maar onbevredigend: een bounce is daarmee ONZICHTBAAR.
   Een melding naar een postbus die vol zit of niet bestaat, leest in het
   dashboard als "geaccepteerd" en dus als geslaagd.

   WAT HIER WEL EN NIET GEBEURT

   Deze module VRAAGT de stand op bij de provider en schrijft hem weg.
   Hij verzint nooit een stand: een antwoord dat hij niet begrijpt laat
   de rij ONGEMOEID, en een provider die geen leesrecht geeft is NIET
   GEMETEN en niet 'niet afgeleverd'. Dat onderscheid is het hele punt.

   Gemeten op dezelfde dag, en de reden dat deze module nog niets kan
   doen in productie: `GET https://api.resend.com/emails/<id>` geeft
   HTTP 401 met `This API key is restricted to only send emails`. De
   sleutel is send-only. De code hieronder is daarom gebouwd en getoetst
   met een geïnjecteerd afleverpad; hij draait pas als de eigenaar een
   sleutel MET leesrecht beschikbaar stelt. Er is hier niets
   geconfigureerd en geen credential aangemaakt.

   WAAROM GEEN WEBHOOK (nog niet). Een ondertekende providerwebhook is
   het nettere kanaal — push in plaats van poll — maar hij vraagt een
   publieke route, een signatuurverificatie en een geheim om die
   signatuur tegen te houden. Dat is meer bouwwerk én een nieuw
   credential. De statusvraag hergebruikt de sleutel die er al is zodra
   die mag lezen, en is daarmee de kleinste veilige stap. Komt de webhook
   er later, dan schrijft hij in DEZELFDE kolommen via dezelfde
   functie — `pasStandToe()` is daarvoor apart gehouden.

   HET BESTAANDE CONTRACT BLIJFT GELDEN. Migratie 0039 draagt
   `(afgeleverd_op is null or geaccepteerd_op is not null)` en
   `(gelezen_op is null or afgeleverd_op is not null)`: de orde is
   onomkeerbaar. Deze module respecteert dat en zet nooit een later
   stempel zonder het eerdere.
   ============================================================ */

import type pg from "pg";
import { rijen, metOrganisatie, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { redacteerFout } from "../kern/geheimen.ts";
import { netwerkToegestaanRuw } from "../kern/config.ts";

const log = maakLogger("meldstatus");

/** De vijf standen die dit platform onderscheidt. */
export type Bezorgstand =
  /** De provider heeft hem aangenomen; verder weten we niets. */
  | "GEACCEPTEERD"
  /** De ontvangende mailserver heeft hem gekregen. */
  | "AFGELEVERD"
  /** Hard geweigerd: het adres bestaat niet of weigert structureel. */
  | "GEWEIGERD"
  /** De ontvanger heeft hem geopend. */
  | "GELEZEN"
  /** De provider zegt niets bruikbaars, of wij mogen het niet vragen. */
  | "NIET GEMETEN";

/**
 * Het antwoord van de provider naar een stand, zonder te raden.
 *
 * DE AFBEELDING IS EXPLICIET EN NIET SLIM. Een onbekend `last_event`
 * levert NIET GEMETEN op en geen gok. Dat is bewust: de provider mag
 * zijn gebeurtenisnamen uitbreiden, en een nieuwe naam die hier per
 * ongeluk als 'afgeleverd' leest zou een bounce verbergen.
 *
 * `complained` (een spamklacht) is géén bezorgfout: het bericht IS
 * aangekomen en de ontvanger vond het ongewenst. Dat is een
 * redactioneel signaal en geen technisch, dus hij leest als AFGELEVERD.
 */
export function standUitProvider(antwoord: unknown): { stand: Bezorgstand; grond: string } {
  if (antwoord === null || typeof antwoord !== "object") {
    return { stand: "NIET GEMETEN", grond: "het antwoord van de provider is geen object" };
  }
  const gebeurtenis = (antwoord as { last_event?: unknown }).last_event;
  if (typeof gebeurtenis !== "string" || gebeurtenis === "") {
    return { stand: "NIET GEMETEN", grond: "het antwoord noemt geen last_event" };
  }
  switch (gebeurtenis) {
    case "delivered":
      return { stand: "AFGELEVERD", grond: "last_event=delivered" };
    case "opened":
    case "clicked":
      return { stand: "GELEZEN", grond: `last_event=${gebeurtenis}` };
    case "bounced":
      return { stand: "GEWEIGERD", grond: "last_event=bounced" };
    case "complained":
      return { stand: "AFGELEVERD", grond: "last_event=complained; aangekomen maar ongewenst" };
    case "sent":
    case "queued":
    case "scheduled":
    case "delivery_delayed":
      return { stand: "GEACCEPTEERD", grond: `last_event=${gebeurtenis}; nog onderweg` };
    default:
      return {
        stand: "NIET GEMETEN",
        grond: `last_event='${gebeurtenis}' is onbekend; er wordt niets geraden`,
      };
  }
}

/** Haalt de stand van één bericht op. Werpt nooit. */
export type Statuspad = (providerId: string) => Promise<{ status: number; lichaam: unknown }>;

/**
 * Het standaardpad: de statusvraag aan Resend.
 *
 * Hij bestaat, maar hij werkt pas met een sleutel die MAG LEZEN. Zonder
 * sleutel wordt er niets gevraagd — geen aanroep, geen fout, NIET
 * GEMETEN.
 */
export function resendStatuspad(): Statuspad | null {
  const sleutel = (process.env["RESEND_API_KEY"] ?? "").trim();
  if (sleutel === "") return null;
  if (!netwerkToegestaanRuw()) return null;
  return async (providerId: string) => {
    const r = await fetch(`https://api.resend.com/emails/${encodeURIComponent(providerId)}`, {
      headers: { Authorization: `Bearer ${sleutel}` },
      signal: AbortSignal.timeout(15_000),
    });
    let lichaam: unknown = null;
    try {
      lichaam = await r.json();
    } catch {
      lichaam = null;
    }
    return { status: r.status, lichaam };
  };
}

export type StandToepassing = {
  readonly bericht: number;
  readonly stand: Bezorgstand;
  readonly grond: string;
  readonly gewijzigd: boolean;
};

/**
 * Zet één gemeten stand weg, idempotent en in de juiste orde.
 *
 * APART GEHOUDEN van het ophalen, zodat een latere providerwebhook in
 * dezelfde kolommen schrijft via dezelfde regels in plaats van een
 * tweede waarheid te maken.
 *
 * IDEMPOTENT betekent hier letterlijk: een tweede aanroep met dezelfde
 * stand verandert geen enkel veld, ook het tijdstempel niet. Daarom
 * staat er `where afgeleverd_op is null` in plaats van een blinde
 * update — een herhaalde ronde mag het MOMENT van aflevering niet
 * opschuiven.
 */
export async function pasStandToe(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  berichtId: number,
  uit: { stand: Bezorgstand; grond: string },
): Promise<boolean> {
  if (uit.stand === "NIET GEMETEN" || uit.stand === "GEACCEPTEERD") return false;

  if (uit.stand === "AFGELEVERD") {
    const r = await c.query(
      `update intel.meld_berichten set afgeleverd_op = now()
        where organisatie_id = $1 and id = $2
          and geaccepteerd_op is not null and afgeleverd_op is null`,
      [organisatieId, berichtId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  if (uit.stand === "GELEZEN") {
    /* DE ORDE IS ONOMKEERBAAR (0039): gelezen vraagt afgeleverd. Een
       'opened' zonder eerdere 'delivered' betekent dat we de aflevering
       hebben gemist, niet dat hij niet is gebeurd — dus beide stempels,
       in één update. */
    const r = await c.query(
      `update intel.meld_berichten
          set afgeleverd_op = coalesce(afgeleverd_op, now()),
              gelezen_op    = now()
        where organisatie_id = $1 and id = $2
          and geaccepteerd_op is not null and gelezen_op is null`,
      [organisatieId, berichtId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  /* GEWEIGERD — een eigen kolom, en dat is geen luxe.
     `opgegeven_op` LEEK de plek, maar de constraint uit 0040 zegt
     `not (opgegeven_op is not null and geaccepteerd_op is not null)`:
     opgeven betekent daar "wij zijn gestopt met VERZENDEN", en een
     bericht dat de provider heeft aangenomen is verzonden. Een bounce is
     iets anders — goed verzonden, aangenomen, en door de ONTVANGENDE
     kant geweigerd. Vandaar `geweigerd_op` (migratie 0060), met een
     check die hem met `afgeleverd_op` laat uitsluiten.

     `afgeleverd_op` blijft met opzet leeg: het bericht is niet
     aangekomen. De grond komt in `laatste_fout` met een prefix, zodat
     hij te onderscheiden is van een API-fout bij het verzenden. */
  const r = await c.query(
    `update intel.meld_berichten
        set geweigerd_op = coalesce(geweigerd_op, now()),
            laatste_fout = $3
      where organisatie_id = $1 and id = $2
        and geaccepteerd_op is not null
        and afgeleverd_op is null
        and geweigerd_op is null`,
    [organisatieId, berichtId, `GEWEIGERD DOOR DE ONTVANGER: ${uit.grond}`.slice(0, 500)],
  );
  return (r.rowCount ?? 0) > 0;
}

export type StatusRonde = {
  readonly bekeken: number;
  readonly gewijzigd: number;
  readonly nietGemeten: number;
  readonly toepassingen: readonly StandToepassing[];
  /** Null als er niets te vragen was omdat er geen leespad is. */
  readonly reden: string | null;
};

/**
 * Vraagt de stand op van berichten die de provider heeft aangenomen en
 * waarvan we de aflevering nog niet weten.
 *
 * WERPT NOOIT. Elke fout — een 401 omdat de sleutel send-only is, een
 * netwerkfout, een onbegrijpelijk antwoord — komt terug als NIET
 * GEMETEN bij dat ene bericht. Een meldlaag die zelf omvalt bij het
 * meten van zijn eigen betrouwbaarheid is nutteloos.
 */
export async function werkBezorgstandenBij(
  pool: Pool,
  organisatieId: number,
  opties: { readonly pad?: Statuspad; readonly max?: number } = {},
): Promise<StatusRonde> {
  const max = opties.max ?? 50;
  const pad = opties.pad ?? resendStatuspad();
  if (pad === null) {
    return {
      bekeken: 0,
      gewijzigd: 0,
      nietGemeten: 0,
      toepassingen: [],
      reden:
        "geen leespad naar de provider: RESEND_API_KEY ontbreekt, of het netwerk staat uit. " +
        "De aflevering blijft NIET GEMETEN; dat is iets anders dan niet afgeleverd",
    };
  }

  const kandidaten = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<{ id: number; provider_id: string }>(
      c,
      /* ALLEEN WAT ZIN HEEFT OM TE VRAGEN: aangenomen door de provider,
         aflevering nog onbekend, niet al opgegeven. Nieuwste eerst, want
         daar is een bounce het meest actueel. */
      `select id, provider_id from intel.meld_berichten
        where organisatie_id = $1
          and provider_id is not null
          and geaccepteerd_op is not null
          and afgeleverd_op is null
          and geweigerd_op is null
        order by id desc
        limit $2`,
      [organisatieId, max],
    ),
  );

  const toepassingen: StandToepassing[] = [];
  let gewijzigd = 0;
  let nietGemeten = 0;

  for (const k of kandidaten) {
    let uit: { stand: Bezorgstand; grond: string };
    try {
      const antwoord = await pad(k.provider_id);
      if (antwoord.status === 401 || antwoord.status === 403) {
        uit = {
          stand: "NIET GEMETEN",
          grond:
            `de provider geeft HTTP ${antwoord.status} op de statusvraag; de sleutel mag ` +
            `waarschijnlijk alleen verzenden`,
        };
      } else if (antwoord.status === 404) {
        uit = { stand: "NIET GEMETEN", grond: "de provider kent dit bericht-id niet (HTTP 404)" };
      } else if (antwoord.status < 200 || antwoord.status >= 300) {
        uit = { stand: "NIET GEMETEN", grond: `de provider gaf HTTP ${antwoord.status}` };
      } else {
        uit = standUitProvider(antwoord.lichaam);
      }
    } catch (e) {
      uit = { stand: "NIET GEMETEN", grond: `de statusvraag mislukte: ${redacteerFout(e)}` };
    }

    const veranderd =
      uit.stand === "NIET GEMETEN" || uit.stand === "GEACCEPTEERD"
        ? false
        : await metOrganisatie(pool, { organisatieId }, (c) =>
            pasStandToe(c, organisatieId, k.id, uit),
          );

    if (veranderd) gewijzigd += 1;
    if (uit.stand === "NIET GEMETEN") nietGemeten += 1;
    toepassingen.push({ bericht: k.id, stand: uit.stand, grond: uit.grond, gewijzigd: veranderd });
  }

  log.info("bezorgstanden bijgewerkt", {
    bekeken: kandidaten.length,
    gewijzigd,
    nietGemeten,
  });

  return {
    bekeken: kandidaten.length,
    gewijzigd,
    nietGemeten,
    toepassingen,
    reden: null,
  };
}
