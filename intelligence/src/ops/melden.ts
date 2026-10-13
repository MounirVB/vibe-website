/* ============================================================
   OPS — meldingen: van signaal naar incident naar bezorging
   ------------------------------------------------------------
   `meetGezondheid()` levert een momentopname. Deze laag maakt er STAAT
   van: welke storing loopt nog, welke is net begonnen, en welke is
   voorbij. Dat onderscheid is de reden dat dit bestaat — zonder staat
   zou een monitor die elk kwartier draait 96 keer per dag dezelfde
   kapotte bron melden en nooit melden dat hij weer werkt.

   DRIE DINGEN STAAN HIER BEWUST APART

   1 DETECTIE. Een signaal op FOUT of NIET GEMETEN opent een melding;
     datzelfde signaal op OK sluit hem. De deduplicatie zit in een
     unieke index in de database (zie migratie 0016) en niet in deze
     code, want de monitor mag vanaf twee plekken tegelijk draaien.

   2 BEZORGING. Of een melding ook ergens AANKOMT is een andere vraag.
     Een melding die niet bezorgd kon worden blijft bestaan, met zijn
     pogingen en de laatste fout erbij.

   3 DE BESTEMMING. Die is er op dit moment NIET.

   WAAROM BEZORGING UIT STAAT

   Er is in deze omgeving geen door een mens goedgekeurde bestemming
   voor operationele meldingen. Dat is op 12 oktober 2026 op vier
   plaatsen gemeten: Railway heeft nul notificatieregels, GitHub nul
   repository-webhooks, er bestaat geen Slack-webhookwaarde op deze
   machine en geen Telegram-token. Er zijn wel twee technisch werkende
   verzendpaden — een Resend-sleutel op de brochure-API en een
   SMTP-pad van een ander product — maar beide hebben een ontvanger die
   voor iets anders is goedgekeurd: respectievelijk een verkoopadres en
   de persoonlijke postbus van de eigenaar.

   Een adres verzinnen zou betekenen dat meldingen in het niets
   verdwijnen terwijl het systeem zegt dat ze verstuurd zijn. Dat is
   erger dan geen alerteerder. Daarom: de adapter is er, hij is getest,
   en hij is UIT tot iemand één bestemming aanwijst.

   WAT ER NODIG IS OM HEM AAN TE ZETTEN
     INTEL_MELD_WEBHOOK   een https-URL die POST met JSON accepteert
     INTEL_MELD_TOKEN     optioneel; gaat mee als Authorization: Bearer
   ============================================================ */

import type pg from "pg";
import { rijen, eenRij } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { redacteerFout } from "../kern/geheimen.ts";
import type { Signaal } from "./gezondheid.ts";

const log = maakLogger("melden");

/** Niveaus die een melding verdienen. OK en LET OP doen dat niet. */
const MELDWAARDIG = new Set(["FOUT", "NIET GEMETEN"]);

export type MeldBestemming =
  | { readonly soort: "geen"; readonly reden: string }
  | { readonly soort: "webhook"; readonly url: string; readonly token: string | null };

/**
 * Welke bestemming is er?
 *
 * Geeft bewust een BESCHRIJVING terug als er geen is, zodat elke
 * aanroeper dezelfde reden kan tonen in plaats van zelf iets te
 * bedenken.
 */
export function meldBestemming(): MeldBestemming {
  const url = (process.env["INTEL_MELD_WEBHOOK"] ?? "").trim();
  if (!url) {
    return {
      soort: "geen",
      reden:
        "INTEL_MELD_WEBHOOK is niet gezet. Er is geen door een mens goedgekeurde " +
        "bestemming voor operationele meldingen; zie de kop van src/ops/melden.ts.",
    };
  }
  if (!url.startsWith("https://")) {
    return {
      soort: "geen",
      reden: `INTEL_MELD_WEBHOOK moet https zijn (kreeg ${url.slice(0, 12)}…). Een melding gaat niet over http.`,
    };
  }
  const token = (process.env["INTEL_MELD_TOKEN"] ?? "").trim();
  return { soort: "webhook", url, token: token || null };
}

export type MeldStand = {
  readonly geopend: number;
  readonly bijgewerkt: number;
  readonly gesloten: number;
  readonly open: number;
  readonly bezorgd: number;
  readonly bezorgfouten: number;
  readonly bestemming: string;
};

const sleutelVan = (s: Signaal) => `${s.groep}/${s.naam}`;

/**
 * Brengt de meldingentabel in overeenstemming met de signalen.
 *
 * Idempotent: twee keer draaien met dezelfde signalen verandert alleen
 * `laatst_gezien_op` en `keren_gezien`. Dat is bedoeld — het is de
 * meting "deze storing loopt nog".
 */
export async function synchroniseerMeldingen(
  c: pg.PoolClient,
  organisatieId: number,
  signalen: readonly Signaal[],
): Promise<{ geopend: number; bijgewerkt: number; gesloten: number }> {
  const slecht = signalen.filter((s) => MELDWAARDIG.has(s.niveau));
  const goed = signalen.filter((s) => !MELDWAARDIG.has(s.niveau));

  let geopend = 0;
  let bijgewerkt = 0;

  for (const s of slecht) {
    /* `on conflict` op de partiële unieke index: bestaat de open
       melding al, dan is dit een herhaling en geen nieuwe storing. */
    const r = await eenRij<{ nieuw: boolean }>(
      c,
      `insert into intel.meldingen
         (organisatie_id, sleutel, groep, niveau, laatste_meting, laatste_advies)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (organisatie_id, sleutel) where gesloten_op is null
       do update set laatst_gezien_op = now(),
                     keren_gezien     = intel.meldingen.keren_gezien + 1,
                     niveau           = excluded.niveau,
                     laatste_meting   = excluded.laatste_meting,
                     laatste_advies   = excluded.laatste_advies
       returning (xmax = 0) as nieuw`,
      [organisatieId, sleutelVan(s), s.groep, s.niveau, s.meting, s.advies ?? null],
    );
    if (r?.nieuw) geopend += 1;
    else bijgewerkt += 1;
  }

  /* Sluiten wat weer OK is. Een melding sluit alleen als het signaal
     ook ECHT gemeten is — een signaal dat verdwijnt sluit niets, want
     dan weten we het niet. */
  let gesloten = 0;
  if (goed.length) {
    const sleutels = goed.map(sleutelVan);
    const r = await rijen<{ id: number }>(
      c,
      `update intel.meldingen
          set gesloten_op = now()
        where organisatie_id = $1
          and gesloten_op is null
          and sleutel = any($2::text[])
      returning id`,
      [organisatieId, sleutels],
    );
    gesloten = r.length;
  }

  return { geopend, bijgewerkt, gesloten };
}

/**
 * Probeert open, nog niet bezorgde meldingen af te leveren.
 *
 * DE RETRY IS BEGRENSD OP POGINGEN EN NIET OP TIJD. Een bestemming die
 * structureel weigert moet niet elke ronde opnieuw worden bestookt; na
 * `maxPogingen` blijft de melding open staan met zijn laatste fout, en
 * dan is het aan een mens. Een melding die niet bezorgd kon worden,
 * verdwijnt nooit stil.
 */
export async function bezorgMeldingen(
  c: pg.PoolClient,
  organisatieId: number,
  opties: { maxPogingen?: number; nu?: () => Promise<Response> } = {},
): Promise<{ bezorgd: number; fouten: number }> {
  const bestemming = meldBestemming();
  if (bestemming.soort === "geen") return { bezorgd: 0, fouten: 0 };

  const maxPogingen = opties.maxPogingen ?? 5;
  const open = await rijen<{
    id: number;
    sleutel: string;
    groep: string;
    niveau: string;
    laatste_meting: string;
    laatste_advies: string | null;
    geopend_op: string;
    keren_gezien: number;
  }>(
    c,
    `select id, sleutel, groep, niveau, laatste_meting, laatste_advies,
            geopend_op::text as geopend_op, keren_gezien
       from intel.meldingen
      where organisatie_id = $1
        and gesloten_op is null
        and bezorgd_op is null
        and bezorgpogingen < $2
      order by geopend_op
      limit 25`,
    [organisatieId, maxPogingen],
  );

  let bezorgd = 0;
  let fouten = 0;

  for (const m of open) {
    try {
      const antwoord = opties.nu
        ? await opties.nu()
        : await fetch(bestemming.url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(bestemming.token ? { authorization: `Bearer ${bestemming.token}` } : {}),
            },
            body: JSON.stringify({
              dienst: "vibe-energy-intelligence",
              niveau: m.niveau,
              signaal: m.sleutel,
              meting: m.laatste_meting,
              advies: m.laatste_advies,
              sinds: m.geopend_op,
              keren_gezien: m.keren_gezien,
            }),
            signal: AbortSignal.timeout(10_000),
          });

      if (!antwoord.ok) throw new Error(`HTTP ${antwoord.status}`);

      await c.query(
        `update intel.meldingen
            set bezorgd_op = now(),
                bezorgpogingen = bezorgpogingen + 1,
                bestemming = $2,
                laatste_bezorgfout = null
          where id = $1`,
        [m.id, new URL(bestemming.url).host],
      );
      bezorgd += 1;
    } catch (e) {
      /* Redigeren VOOR het afkappen: deze tekst gaat naar
         intel.meldingen.laatste_bezorgfout en naar het log. */
      const bericht = redacteerFout(e);
      await c.query(
        `update intel.meldingen
            set bezorgpogingen = bezorgpogingen + 1,
                laatste_bezorgfout = $2
          where id = $1`,
        [m.id, bericht.slice(0, 300)],
      );
      fouten += 1;
      log.waarschuwing("melding niet bezorgd", { melding: m.id, signaal: m.sleutel, fout: bericht.slice(0, 120) });
    }
  }

  return { bezorgd, fouten };
}

/** Eén ronde: synchroniseren en, als er een bestemming is, bezorgen. */
export async function meldRonde(
  c: pg.PoolClient,
  organisatieId: number,
  signalen: readonly Signaal[],
): Promise<MeldStand> {
  const sync = await synchroniseerMeldingen(c, organisatieId, signalen);
  const bez = await bezorgMeldingen(c, organisatieId);
  const open = await rijen<{ n: number }>(
    c,
    "select count(*)::int as n from intel.meldingen where organisatie_id = $1 and gesloten_op is null",
    [organisatieId],
  );
  const bestemming = meldBestemming();
  return {
    ...sync,
    open: open[0]?.n ?? 0,
    bezorgd: bez.bezorgd,
    bezorgfouten: bez.fouten,
    bestemming: bestemming.soort === "geen" ? `UIT — ${bestemming.reden}` : new URL(bestemming.url).host,
  };
}
