/* ============================================================
   OPS — meldmail: welk bericht gaat eruit, en wanneer niet
   ------------------------------------------------------------
   De keten is: detectie (gezondheid.ts) -> staat (melden.ts) ->
   classificatie (meldernst.ts) -> BERICHT (hier) -> verzending (mail.ts)
   -> registratie (intel.meld_berichten).

   VIER SOORTEN, VIER REGELS

     CRITICAL   per bundel, zo snel mogelijk. Back-up, database,
                beveiliging, publicatie.
     FOUT       per bundel, bij een NIEUWE of WEZENLIJK VERANDERDE
                toestand. Niet elke ronde opnieuw.
     WARNING    EEN overzicht per dag. Geen losse mail per klein ding.
     HERSTEL    als een eerder gemelde bundel aantoonbaar dicht is.

   DE DEDUPLICATIE ZIT IN DE DATABASE, NIET HIER
   `meldberichten_eenmalig` is een unieke index op
   (organisatie, soort, bundel, vingerafdruk). Deze code doet een
   `insert ... on conflict do nothing`; bestaat het bericht al, dan is er
   niets nieuws te zeggen. Dat is bewust geen controle in code: de worker
   mag vanaf twee plekken tegelijk draaien, en dan is 'kijk of het
   bestaat, zo niet voeg toe' een race die twee mails oplevert.

   DE EERSTE KEER IS EEN SAMENVATTING, GEEN TIEN ALARMEN
   Op productie stonden tien meldingen open toen dit werd gebouwd. Die
   als tien losse mails versturen zou de eerste ervaring met deze
   alerteerder ruis maken. Is er nog NOOIT een bericht verstuurd en staat
   er meer dan een bundel open, dan gaat er EEN
   BEGINSAMENVATTING uit die de hele stand beschrijft. Daarna geldt het
   normale regime.

   HERSTEL WORDT NOOIT GEMELD ZONDER GEMETEN VERBETERING
   Een bundel is pas hersteld als ELKE melding erin een `gesloten_op`
   heeft. En sluiten gebeurt in melden.ts alleen als het signaal
   daadwerkelijk OK is gemeten — een signaal dat verdwijnt sluit niets,
   want dan weten we het niet. Die regel staat daar al en wordt hier niet
   verzwakt.
   ============================================================ */

import type pg from "pg";
import { rijen } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { redigeer } from "../kern/geheimen.ts";
import { sha256hex } from "../kern/tekst.ts";
import type { Signaal } from "./gezondheid.ts";
import {
  bundelVan,
  ernstVan,
  normaliseerMeting,
  vingerafdrukVan,
  type Meldernst,
} from "./meldernst.ts";
import { mailBestemming, nederlandseTijd, verstuurMail, type MailUitkomst } from "./mail.ts";
import { bouwMailBericht, type Berichtgegevens } from "./mailopmaak.ts";

const log = maakLogger("meldmail");

export type Berichtsoort = "CRITICAL" | "FOUT" | "WARNING" | "HERSTEL" | "BEGINSAMENVATTING" | "TEST";

/** Een rij uit intel.meldingen, zoals deze laag hem nodig heeft. */
export type Meldingrij = {
  readonly id: number;
  readonly sleutel: string;
  readonly groep: string;
  readonly niveau: string;
  readonly laatste_meting: string;
  readonly laatste_advies: string | null;
  readonly geopend_op: string;
  readonly laatst_gezien_op: string;
  readonly gesloten_op: string | null;
  readonly keren_gezien: number;
  readonly bundel: string | null;
  readonly ernst: string | null;
};

export type GeplandBericht = {
  readonly soort: Berichtsoort;
  readonly bundel: string;
  readonly vingerafdruk: string;
  readonly ernst: Meldernst | null;
  readonly onderwerp: string;
  readonly meldingIds: readonly number[];
  readonly html: string;
  readonly tekst: string;
};

/* De dagsleutel in Europe/Amsterdam, zodat 'een overzicht per dag' ook
   rond middernacht en over een zomertijdovergang klopt. */
const DAGFORMAAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Amsterdam",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dagsleutel(nu: Date): string {
  return DAGFORMAAT.format(nu);
}

/** De zwaarste ernst van een groep meldingen. */
function zwaarste(ernsten: readonly (Meldernst | null)[]): Meldernst | null {
  const rang: Record<string, number> = { WARNING: 1, FOUT: 2, CRITICAL: 3 };
  let uit: Meldernst | null = null;
  for (const e of ernsten) {
    if (!e) continue;
    if (!uit || rang[e]! > rang[uit]!) uit = e;
  }
  return uit;
}

/** Een korte, menselijke omschrijving van een bundel. */
export function bundelOmschrijving(bundel: string, rijenIn: readonly Meldingrij[]): string {
  if (bundel.startsWith("bron:")) {
    const sleutel = bundel.slice("bron:".length);
    return `bron ${sleutel} levert niet`;
  }
  const eerste = rijenIn[0];
  return eerste ? eerste.sleutel : bundel;
}

/* ------------------------------------------------------------------
   HET PLAN

   Zuiver: rijen in, berichten uit. Geen database, geen netwerk, geen
   klok behalve de meegegeven `nu`. Dat maakt elk van de vier regels
   afzonderlijk vast te zetten in een toets.
   ------------------------------------------------------------------ */

export function bouwMeldplan(invoer: {
  /** Open meldingen met een ernst (aanvaarde grenzen zijn er al uit). */
  readonly open: readonly Meldingrij[];
  /** Meldingen die sinds de vorige ronde zijn gesloten. */
  readonly gesloten: readonly Meldingrij[];
  /** Bundels waarover al ooit een CRITICAL of FOUT is verstuurd. */
  readonly gemeldeBundels: ReadonlySet<string>;
  /** Is er in deze organisatie ooit een bericht verstuurd? */
  readonly ooitGemeld: boolean;
  readonly nu: Date;
  readonly monitorUrl?: string | null;
}): GeplandBericht[] {
  const uit: GeplandBericht[] = [];

  /* Groeperen per bundel. */
  const perBundel = new Map<string, Meldingrij[]>();
  for (const m of invoer.open) {
    const b = m.bundel ?? `signaal:${m.sleutel}`;
    const lijst = perBundel.get(b) ?? [];
    lijst.push(m);
    perBundel.set(b, lijst);
  }

  const bericht = (
    soort: Berichtsoort,
    bundel: string,
    ernst: Meldernst | null,
    rijenIn: readonly Meldingrij[],
    titel: string,
    extraVingerafdruk: string[] = [],
  ): GeplandBericht => {
    const vinger = vingerafdrukVan(
      ernst,
      [
        ...rijenIn.map((m) => ({ sleutel: m.sleutel, meting: m.laatste_meting })),
        ...extraVingerafdruk.map((x) => ({ sleutel: x, meting: x })),
      ],
    );
    const gegevens: Berichtgegevens = {
      soort,
      ernst,
      titel,
      bundel,
      meldingen: rijenIn.map((m) => ({
        id: m.id,
        sleutel: m.sleutel,
        groep: m.groep,
        niveau: m.niveau,
        meting: redigeer(m.laatste_meting),
        advies: m.laatste_advies ? redigeer(m.laatste_advies) : null,
        eersteDetectie: nederlandseTijd(m.geopend_op),
        laatsteMeting: nederlandseTijd(m.laatst_gezien_op),
        kerenGezien: m.keren_gezien,
        gesloten: m.gesloten_op ? nederlandseTijd(m.gesloten_op) : null,
      })),
      meldingId: `${soort}-${vinger.slice(0, 12)}`,
      monitorUrl: invoer.monitorUrl ?? null,
      nu: nederlandseTijd(invoer.nu),
    };
    const opmaak = bouwMailBericht(gegevens);
    return {
      soort,
      bundel,
      vingerafdruk: vinger,
      ernst,
      onderwerp: opmaak.onderwerp,
      meldingIds: rijenIn.map((m) => m.id),
      html: opmaak.html,
      tekst: opmaak.tekst,
    };
  };

  /* ---- 1. DE EERSTE KEER: EEN SAMENVATTING ---- */
  const teMelden = [...perBundel.entries()].filter(([, r]) =>
    r.some((m) => m.ernst === "CRITICAL" || m.ernst === "FOUT"),
  );
  if (!invoer.ooitGemeld && teMelden.length > 0) {
    const alles = teMelden.flatMap(([, r]) => r);
    const ernst = zwaarste(alles.map((m) => m.ernst as Meldernst | null));
    uit.push(
      bericht(
        "BEGINSAMENVATTING",
        "stand",
        ernst,
        alles,
        `${teMelden.length} openstaande storing(en) bij het aanzetten van de alerteerder`,
      ),
    );
    /* En niets anders deze ronde: de samenvatting dekt de hele stand.
       De volgende ronde pakt het normale regime op, en dan bestaat er
       per bundel nog geen CRITICAL/FOUT-bericht, dus die komen dan. */
    return uit;
  }

  /* ---- 2. CRITICAL en FOUT, per bundel ---- */
  for (const [bundel, rijenIn] of perBundel) {
    const ernst = zwaarste(rijenIn.map((m) => m.ernst as Meldernst | null));
    if (ernst !== "CRITICAL" && ernst !== "FOUT") continue;
    uit.push(
      bericht(
        ernst,
        bundel,
        ernst,
        rijenIn,
        ernst === "CRITICAL"
          ? `kritieke storing: ${bundelOmschrijving(bundel, rijenIn)}`
          : `storing: ${bundelOmschrijving(bundel, rijenIn)}`,
      ),
    );
  }

  /* ---- 3. WARNING: EEN overzicht per dag ---- */
  const waarschuwingen = invoer.open.filter((m) => m.ernst === "WARNING");
  if (waarschuwingen.length > 0) {
    /* De dagsleutel zit in de vingerafdruk, dus er kan er maar EEN per
       dag bestaan — ook als de inhoud in de loop van de dag verandert. */
    uit.push(
      bericht(
        "WARNING",
        "dagoverzicht",
        "WARNING",
        waarschuwingen,
        `dagoverzicht: ${waarschuwingen.length} waarschuwing(en)`,
        [`dag=${dagsleutel(invoer.nu)}`],
      ),
    );
  }

  /* ---- 4. HERSTEL: alleen voor wat eerder GEMELD was ---- */
  const perGeslotenBundel = new Map<string, Meldingrij[]>();
  for (const m of invoer.gesloten) {
    const b = m.bundel ?? `signaal:${m.sleutel}`;
    const lijst = perGeslotenBundel.get(b) ?? [];
    lijst.push(m);
    perGeslotenBundel.set(b, lijst);
  }
  for (const [bundel, rijenIn] of perGeslotenBundel) {
    /* Nooit een herstelmelding voor iets dat nooit is gemeld. */
    if (!invoer.gemeldeBundels.has(bundel)) continue;
    /* En niet als er in dezelfde bundel nog iets OPEN staat: dan is de
       storing niet voorbij, alleen een deel ervan. */
    if (perBundel.has(bundel)) continue;
    uit.push(
      bericht(
        "HERSTEL",
        bundel,
        null,
        rijenIn,
        `opgelost: ${bundelOmschrijving(bundel, rijenIn)}`,
      ),
    );
  }

  return uit;
}

/* ------------------------------------------------------------------
   BACK-OFF

   Niet elke ronde opnieuw bestoken. De reeks is oplopend en eindig; na
   de laatste poging blijft het bericht staan met zijn laatste fout, en
   dan is het aan een mens. Een bericht verdwijnt nooit stil — dat is
   dezelfde regel die melden.ts al voor bezorging aanhoudt.
   ------------------------------------------------------------------ */

export const BACKOFF_MINUTEN: readonly number[] = [1, 5, 15, 60, 240];

export function volgendePoging(pogingen: number, nu: Date): Date | null {
  const m = BACKOFF_MINUTEN[pogingen];
  if (m === undefined) return null;
  return new Date(nu.getTime() + m * 60_000);
}

/* ------------------------------------------------------------------
   DE RONDE
   ------------------------------------------------------------------ */

export type MeldmailStand = {
  readonly bestemming: string;
  readonly gepland: number;
  readonly nieuw: number;
  readonly aangeboden: number;
  readonly geaccepteerd: number;
  readonly mislukt: number;
  readonly uitgesteld: number;
  readonly opgegeven: number;
};

/**
 * Werkt bundel en ernst bij op de open meldingen.
 *
 * Dit is de brug tussen het signaal (dat de bundel kent) en de
 * meldingenrij (die hem moet bewaren). Zonder deze stap zou een
 * bestaande melding geen bundel hebben en dus niet te groeperen zijn.
 */
export async function verrijkMeldingen(
  c: pg.PoolClient,
  organisatieId: number,
  signalen: readonly Signaal[],
): Promise<number> {
  let bijgewerkt = 0;
  for (const s of signalen) {
    const sleutel = `${s.groep}/${s.naam}`;
    const ernst = ernstVan(s);
    const r = await c.query(
      `update intel.meldingen
          set bundel = $3, ernst = $4
        where organisatie_id = $1 and sleutel = $2 and gesloten_op is null
          and (bundel is distinct from $3 or ernst is distinct from $4)`,
      [organisatieId, sleutel, bundelVan(s), ernst],
    );
    bijgewerkt += r.rowCount ?? 0;
  }
  return bijgewerkt;
}

const VELDEN = `id, sleutel, groep, niveau, laatste_meting, laatste_advies,
                geopend_op::text as geopend_op, laatst_gezien_op::text as laatst_gezien_op,
                gesloten_op::text as gesloten_op, keren_gezien, bundel, ernst`;

/**
 * Plant de berichten en verstuurt wat verstuurd mag worden.
 *
 * `verstuur` is injecteerbaar zodat een toets de provider kan nabootsen
 * zonder netwerk.
 */
export async function meldmailRonde(
  c: pg.PoolClient,
  organisatieId: number,
  opties: {
    readonly nu?: Date;
    readonly verstuur?: (b: { onderwerp: string; html: string; tekst: string }) => Promise<MailUitkomst>;
    readonly maxPerRonde?: number;
    readonly maxPogingen?: number;
  } = {},
): Promise<MeldmailStand> {
  const nu = opties.nu ?? new Date();
  const maxPerRonde = opties.maxPerRonde ?? 5;
  const maxPogingen = opties.maxPogingen ?? BACKOFF_MINUTEN.length;
  const bestemming = mailBestemming();

  /* DE AAN-SCHAKELAAR STAAT APART VAN DE CONFIGURATIE.
     Een geconfigureerde bestemming betekent niet dat er automatisch
     gealarmeerd mag worden. De opdracht is daar expliciet in:
     automatische productiealarmering gaat pas aan na een geslaagde
     end-to-end-test EN een expliciet akkoord van de eigenaar. Daarom
     twee waarden: de configuratie maakt verzenden MOGELIJK,
     INTEL_MAIL_ACTIEF maakt het GEPLAND.

     De testmail via de CLI loopt niet langs deze grendel — dat is een
     handeling van een mens, en precies de test die aan het akkoord
     voorafgaat. */
  const actief = /^(1|ja|aan|true)$/i.test((process.env["INTEL_MAIL_ACTIEF"] ?? "").trim());
  if (bestemming.soort !== "geen" && !actief) {
    return {
      bestemming:
        `GECONFIGUREERD MAAR NIET ACTIEF — resend -> ${bestemming.ontvanger}; ` +
        "INTEL_MAIL_ACTIEF staat niet aan, dus er wordt niets gepland of verstuurd",
      gepland: 0, nieuw: 0, aangeboden: 0, geaccepteerd: 0, mislukt: 0, uitgesteld: 0, opgegeven: 0,
    };
  }

  /* GEEN BESTEMMING, GEEN BERICHTEN. Niet plannen wat nooit verstuurd
     kan worden: dan zou de eerste keer dat er wel een bestemming is, een
     berg verouderde berichten de deur uit gaan. */
  if (bestemming.soort === "geen") {
    return {
      bestemming: `UIT — ${bestemming.reden}`,
      gepland: 0, nieuw: 0, aangeboden: 0, geaccepteerd: 0, mislukt: 0, uitgesteld: 0, opgegeven: 0,
    };
  }

  const open = await rijen<Meldingrij>(
    c,
    `select ${VELDEN} from intel.meldingen
      where organisatie_id = $1 and gesloten_op is null and ernst is not null
      order by geopend_op`,
    [organisatieId],
  );
  /* Recent gesloten: het venster is ruim genoeg om een ronde te missen
     zonder een herstelmelding kwijt te raken. */
  const gesloten = await rijen<Meldingrij>(
    c,
    `select ${VELDEN} from intel.meldingen
      where organisatie_id = $1 and gesloten_op is not null
        and gesloten_op > now() - interval '7 days'
      order by gesloten_op`,
    [organisatieId],
  );
  const eerder = await rijen<{ bundel: string }>(
    c,
    `select distinct bundel from intel.meld_berichten
      where organisatie_id = $1 and soort in ('CRITICAL','FOUT','BEGINSAMENVATTING')`,
    [organisatieId],
  );
  const totaalEerder = await rijen<{ n: number }>(
    c,
    "select count(*)::int as n from intel.meld_berichten where organisatie_id = $1",
    [organisatieId],
  );

  const plan = bouwMeldplan({
    open,
    gesloten,
    gemeldeBundels: new Set(eerder.map((x) => x.bundel)),
    ooitGemeld: (totaalEerder[0]?.n ?? 0) > 0,
    nu,
    monitorUrl: (process.env["INTEL_MONITOR_URL"] ?? "").trim() || null,
  });

  /* Vastleggen. `on conflict do nothing` IS de deduplicatie. */
  let nieuw = 0;
  for (const b of plan) {
    const r = await c.query(
      `insert into intel.meld_berichten
         (organisatie_id, soort, bundel, vingerafdruk, ernst, onderwerp, melding_ids,
          html, tekst, volgende_poging_op)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
       on conflict (organisatie_id, soort, bundel, vingerafdruk) do nothing`,
      [organisatieId, b.soort, b.bundel, b.vingerafdruk, b.ernst, b.onderwerp, b.meldingIds,
       b.html, b.tekst],
    );
    nieuw += r.rowCount ?? 0;
  }

  /* Verzenden UIT HET LOGBOEK, niet uit het plan.

     De eerste versie bouwde de tekst bij elke poging opnieuw uit het
     plan. Toets 6 liet zien waar dat op stukloopt: een MISLUKT bericht
     kon daarna nooit meer worden verstuurd, want het plan was intussen
     opgeschoven — de beginsamenvatting bestaat maar een keer. Een
     bericht dat is aangeboden, niet aankwam, en daarna onverstuurbaar
     wordt, is precies het verlies dat par. 4.8 verbiedt.

     Nu staat de tekst in de rij. Een rij zonder tekst (van voor deze
     wijziging) wordt overgeslagen en gemeld, in plaats van stil
     weggelaten. */
  const openstaand = await rijen<{
    id: number;
    soort: string;
    bundel: string;
    vingerafdruk: string;
    pogingen: number;
    onderwerp: string;
    html: string | null;
    tekst: string | null;
  }>(
    c,
    `select id, soort, bundel, vingerafdruk, pogingen, onderwerp, html, tekst
       from intel.meld_berichten
      where organisatie_id = $1
        and geaccepteerd_op is null
        and pogingen < $2
        and (volgende_poging_op is null or volgende_poging_op <= $3)
      order by aangemaakt_op
      limit $4`,
    [organisatieId, maxPogingen, nu.toISOString(), maxPerRonde],
  );

  let aangeboden = 0;
  let geaccepteerd = 0;
  let mislukt = 0;
  let opgegeven = 0;

  for (const rij of openstaand) {
    /* De bewaarde tekst gaat voor; het plan is alleen een vangnet voor
       rijen die nog geen inhoud dragen. */
    const uitPlan = plan.find(
      (p) => p.soort === rij.soort && p.bundel === rij.bundel && p.vingerafdruk === rij.vingerafdruk,
    );
    const inhoud =
      rij.html && rij.tekst
        ? { onderwerp: rij.onderwerp, html: rij.html, tekst: rij.tekst }
        : uitPlan
          ? { onderwerp: uitPlan.onderwerp, html: uitPlan.html, tekst: uitPlan.tekst }
          : null;
    if (!inhoud) {
      log.waarschuwing("meldbericht zonder bewaarde inhoud overgeslagen", {
        bericht: rij.id, soort: rij.soort, bundel: rij.bundel,
      });
      continue;
    }

    aangeboden += 1;
    const uitkomst = opties.verstuur ? await opties.verstuur(inhoud) : await verstuurMail(inhoud);

    if (uitkomst.geaccepteerd) {
      await c.query(
        `update intel.meld_berichten
            set aangeboden_op = coalesce(aangeboden_op, now()),
                geaccepteerd_op = now(),
                pogingen = pogingen + 1,
                provider = $2, provider_id = $3,
                laatste_fout = null, volgende_poging_op = null
          where id = $1`,
        [rij.id, uitkomst.provider, uitkomst.providerId],
      );
      geaccepteerd += 1;
      log.info("meldbericht geaccepteerd door de provider", {
        bericht: rij.id, soort: rij.soort, bundel: rij.bundel, provider_id: uitkomst.providerId,
      });
      continue;
    }

    const pogingen = rij.pogingen + 1;
    /* Een niet-herhaalbare fout (verkeerd adres, ongeldige sleutel) lost
       zich niet op door te wachten: die krijgt geen volgende poging. */
    const volgende = uitkomst.herhaalbaar ? volgendePoging(pogingen, nu) : null;
    await c.query(
      `update intel.meld_berichten
          set aangeboden_op = coalesce(aangeboden_op, now()),
              pogingen = $2,
              laatste_fout = $3,
              volgende_poging_op = $4
        where id = $1`,
      [rij.id, pogingen, redigeer(uitkomst.fout ?? "onbekende fout").slice(0, 300), volgende],
    );
    mislukt += 1;
    if (!volgende || pogingen >= maxPogingen) opgegeven += 1;
    log.waarschuwing("meldbericht niet geaccepteerd", {
      bericht: rij.id, soort: rij.soort, pogingen,
      herhaalbaar: uitkomst.herhaalbaar,
      fout: (uitkomst.fout ?? "").slice(0, 160),
    });
  }

  const uitgesteld = await rijen<{ n: number }>(
    c,
    `select count(*)::int as n from intel.meld_berichten
      where organisatie_id = $1 and geaccepteerd_op is null and pogingen < $2`,
    [organisatieId, maxPogingen],
  );

  return {
    bestemming: `resend -> ${bestemming.ontvanger}`,
    gepland: plan.length,
    nieuw,
    aangeboden,
    geaccepteerd,
    mislukt,
    uitgesteld: uitgesteld[0]?.n ?? 0,
    opgegeven,
  };
}

/** De vingerafdruk van een losse testmail; buiten de meldlogica. */
export function testVingerafdruk(nu: Date): string {
  return sha256hex(`test|${nu.toISOString()}`).slice(0, 32);
}

export { normaliseerMeting };
