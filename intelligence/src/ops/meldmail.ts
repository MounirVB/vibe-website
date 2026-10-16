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
}): { berichten: GeplandBericht[]; gedekt: GeplandBericht[] } {
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
    bundelnamen: readonly string[] = [],
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
      bundels: bundelnamen.length || 1,
      bundelnamen: bundelnamen.length > 1 ? bundelnamen : undefined,
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

  /* De berichten van het NORMALE regime, als functie, zodat de
     beginsamenvatting precies kan zeggen WELKE berichten hij dekt. */
  const normaalRegime = (): GeplandBericht[] => {
    const lijst: GeplandBericht[] = [];
    for (const [bundel, rijenIn] of perBundel) {
      const ernst = zwaarste(rijenIn.map((m) => m.ernst as Meldernst | null));
      if (ernst !== "CRITICAL" && ernst !== "FOUT") continue;
      lijst.push(
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
    const waarschuwingen = invoer.open.filter((m) => m.ernst === "WARNING");
    if (waarschuwingen.length > 0) {
      /* GEEN DAGSLEUTEL MEER IN DE VINGERAFDRUK.
         Met de dag erin ging er elke dag opnieuw een overzicht uit, ook
         als er niets was veranderd. De opdracht is: de dagelijkse
         rapportage mag blijven, maar mag dezelfde ONGEWIJZIGDE
         waarschuwingen niet onnodig herhalen. Zonder de dag is de
         vingerafdruk puur de TOESTAND: verandert de set waarschuwingen,
         dan gaat er een nieuw overzicht uit; verandert hij niet, dan
         houdt de unieke index het tegen. */
      lijst.push(
        bericht(
          "WARNING",
          "dagoverzicht",
          "WARNING",
          waarschuwingen,
          `overzicht: ${waarschuwingen.length} waarschuwing(en)`,
        ),
      );
    }
    return lijst;
  };

  /* ---- 1. DE EERSTE KEER: EEN SAMENVATTING ----
     Hij dekt storingen EN waarschuwingen, want anders zou het
     dagoverzicht er direct na de samenvatting alsnog achteraan komen. */
  const metErnst = invoer.open.filter((m) => m.ernst);
  if (!invoer.ooitGemeld && metErnst.length > 0) {
    const namen = [...new Set(metErnst.map((m) => m.bundel ?? `signaal:${m.sleutel}`))];
    const ernst = zwaarste(metErnst.map((m) => m.ernst as Meldernst | null));
    const leesbaar = namen.map((b) =>
      b.startsWith("bron:") ? `bron ${b.slice("bron:".length)}` : b.replace(/^signaal:/, ""),
    );
    uit.push(
      bericht(
        "BEGINSAMENVATTING",
        "stand",
        ernst,
        metErnst,
        `${namen.length} openstaande storing(en) bij het aanzetten van de alerteerder`,
        [],
        leesbaar,
      ),
    );
    /* EN WAT HIJ DEKT. Die berichten worden NIET nu verstuurd; ze worden
       pas als 'gemeld' vastgelegd zodra de provider de samenvatting
       heeft GEACCEPTEERD. Mislukt de samenvatting, dan is er niets
       gemeld en komt het normale regime de volgende ronde gewoon op. */
    return { berichten: uit, gedekt: normaalRegime() };
  }

  uit.push(...normaalRegime());

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

  return { berichten: uit, gedekt: [] };
}

/* ------------------------------------------------------------------
   BACK-OFF

   Niet elke ronde opnieuw bestoken. De reeks is oplopend en eindig; na
   de laatste poging blijft het bericht staan met zijn laatste fout, en
   dan is het aan een mens. Een bericht verdwijnt nooit stil — dat is
   dezelfde regel die melden.ts al voor bezorging aanhoudt.
   ------------------------------------------------------------------ */

export const BACKOFF_MINUTEN: readonly number[] = [1, 5, 15, 60, 240];

/**
 * Het omgevingsdeel van de idempotentiesleutel.
 *
 * PER AANROEP GELEZEN, niet bij het laden van de module. Zelfde reden
 * als bij `mailBestemming()`: een toets of een CLI die de omgeving zet
 * nadat de module is geimporteerd hoort dat te zien, en een vastgezette
 * waarde op moduleniveau zou bovendien de structurele grendel op
 * procesgeheugen omzeilen.
 *
 * Alles buiten [a-z0-9] valt weg, zodat de sleutel gegarandeerd aan de
 * vorm uit ops/mail.ts voldoet en nooit een headerinjectie kan worden.
 */
function omgevingsdeel(): string {
  const ruw = (process.env["INTEL_OMGEVING"] ?? "onbekend").toLowerCase();
  const schoon = ruw.replace(/[^a-z0-9]/g, "");
  return schoon.length > 0 ? schoon.slice(0, 16) : "onbekend";
}

/**
 * De idempotentiesleutel voor een aanbieding aan de provider.
 *
 * EEN PLEK, WANT TWEE PLEKKEN IS GEEN GRENDEL. De uurronde en de losse
 * testmail uit cli/meldmail.ts bieden beide aan; zouden ze een andere
 * sleutel opbouwen, dan houdt de provider een dubbele mail niet tegen
 * in precies het geval dat ze elkaar opvolgen — en dat geval is gemeten:
 * een afgebroken CLI-run laat een onverzonden rij achter die de
 * volgende uurronde oppakt.
 *
 * DRIE KEUZES, ELK UIT EEN GEMETEN FOUT (16 oktober 2026):
 *
 * 1 INHOUDGEBONDEN, NIET POSITIONEEL. Eerst stond `rij.id` in de
 *   sleutel. Die is een `bigserial` die in elke database bij 1 begint,
 *   en Resend houdt sleutels per API-credential bij — dat credential is
 *   gedeeld. Twee databases met dezelfde stand gaven dus letterlijk
 *   dezelfde sleutel, en na een restore hergebruikt de sequence oude
 *   id's. Gevolg: een NIEUW alarm met een oude sleutel wordt door de
 *   provider onderdrukt terwijl wij het als geaccepteerd registreren —
 *   een gemiste storingsmail, en dat is erger dan een dubbele.
 * 2 MET EEN OMGEVINGSDISCRIMINATOR. Twee installaties kunnen dezelfde
 *   stand hebben en dus dezelfde payload; INTEL_OMGEVING scheidt ze.
 * 3 ROTEREN OP EEN BEKEND ANTWOORD, NIET OP ELKE POGING. `antwoorden`
 *   is het aantal eerdere pogingen MET een bekend antwoord. Een
 *   onbekende uitkomst laat dat getal staan, dus komt dezelfde sleutel
 *   terug en houdt de provider de tweede mail tegen. Een bekende
 *   afwijzing schuift het op, dus krijgt de volgende poging een nieuwe
 *   sleutel en geeft de provider niet 24 uur lang zijn oude antwoord
 *   terug.
 */
export function idempotentieSleutelVan(
  organisatieId: number,
  inhoud: { readonly onderwerp: string; readonly html: string; readonly tekst: string },
  antwoorden: number,
): string {
  const payloadhash = sha256hex(
    `${inhoud.onderwerp}\x00${inhoud.html}\x00${inhoud.tekst}`,
  ).slice(0, 16);
  return `intel-${omgevingsdeel()}-${organisatieId}-${payloadhash}-a${antwoorden}`;
}

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
  /** Berichten die de beginsamenvatting dekt en die dus NIET apart uitgaan. */
  readonly gedekt: number;
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
    readonly verstuur?: (
      b: { onderwerp: string; html: string; tekst: string },
      /* De idempotentiesleutel. Een toets die hem negeert blijft geldig;
         een toets die de crashwindow nabootst heeft hem nodig. */
      idempotentieSleutel?: string,
    ) => Promise<MailUitkomst>;
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
      gepland: 0, nieuw: 0, aangeboden: 0, geaccepteerd: 0, mislukt: 0, uitgesteld: 0,
      opgegeven: 0, gedekt: 0,
    };
  }

  /* GEEN BESTEMMING, GEEN BERICHTEN. Niet plannen wat nooit verstuurd
     kan worden: dan zou de eerste keer dat er wel een bestemming is, een
     berg verouderde berichten de deur uit gaan. */
  if (bestemming.soort === "geen") {
    return {
      bestemming: `UIT — ${bestemming.reden}`,
      gepland: 0, nieuw: 0, aangeboden: 0, geaccepteerd: 0, mislukt: 0, uitgesteld: 0,
      opgegeven: 0, gedekt: 0,
    };
  }

  /* DEZE RONDE EIST EEN TRANSACTIE, EN DAT WAS EEN STILLE AANNAME.
     Beide grendels van de verzendlus hangen eraan: een rijvergrendeling
     uit `for update skip locked` valt in autocommit weg aan het eind
     van het statement, en dan selecteren twee rondes alsnog dezelfde
     rij. Gemeten op 16 oktober 2026 met een client zonder `begin`: twee
     aanbiedingen, twee verschillende sleutels, dus twee mails.

     Alle huidige aanroepers gaan via `metOrganisatie`, dat een
     transactie opent — maar niets verbood het andersom, en de
     `rijen`-helper documenteert juist dat hij geen transactie nodig
     heeft. `savepoint` is buiten een transactieblok een harde fout, dus
     dit is de kortste manier om de eis te laten gelden in plaats van te
     hopen. Hij staat vooraan: ook de planinserts horen in dezelfde
     transactie te vallen als de verzending. */
  await c.query("savepoint meldmail_ronde");
  await c.query("release savepoint meldmail_ronde");

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
      where organisatie_id = $1 and soort in ('CRITICAL','FOUT','BEGINSAMENVATTING')
        and geaccepteerd_op is not null`,
    [organisatieId],
  );
  /* EEN TESTMAIL IS GEEN ALARM, en mag 'de eerste keer' dus niet
     opgebruiken.

     Gemeten op productie, 14 oktober 2026 06:05Z. Na de gecontroleerde
     testmail stonden er twee TEST-rijen in het logboek. Deze telling nam
     ALLE rijen mee, dus de beginsamenvatting verviel en het plan sprong
     naar het normale regime: DRIE losse mails (rendo, tenderned en het
     dagoverzicht) waar er EEN samenvatting hoorde te gaan. Precies de
     burst die de beginsamenvatting bestaat om te voorkomen, veroorzaakt
     door de proef die eraan voorafging.

     'Is er al ooit gealarmeerd' gaat over ALARMEN. Een test informeert
     niemand over een storing en hoort die staat niet te veranderen. */
  const totaalEerder = await rijen<{ n: number }>(
    c,
    /* GEACCEPTEERD, niet 'er bestaat een rij'.
       Twee eisen vallen hier samen. Een TEST informeert niemand over een
       storing en verbruikt 'de eerste keer' niet (gemeten 14 oktober
       2026: twee TEST-rijen lieten de samenvatting vervallen en drie
       losse mails plannen). En een MISLUKTE samenvatting mag die staat
       ook niet omzetten: gevonden door toets 2c, want anders plant de
       volgende ronde het normale regime ERNAAST de hertry van de
       samenvatting, en gaan beide uit.

       'Is er al ooit gealarmeerd' betekent dus: heeft de provider ooit
       een alarm van ons AANGENOMEN. */
    `select count(*)::int as n from intel.meld_berichten
      where organisatie_id = $1 and soort <> 'TEST' and geaccepteerd_op is not null`,
    [organisatieId],
  );

  /* DEKT EEN AL GEACCEPTEERDE SAMENVATTING DE HUIDIGE STAND?
     De samenvatting kan zijn verstuurd door een versie die de dekking
     nog niet vastlegde — precies het geval op 14 oktober 2026, toen de
     ronde van 07:00Z hem verstuurde en deze code er nog niet was. Door
     het als VRAAG over de huidige stand te stellen in plaats van als
     moment in de verzendlus, is die dekking ook achteraf vast te
     stellen. */
  const samenvattingen = await rijen<{ melding_ids: number[] }>(
    c,
    `select melding_ids from intel.meld_berichten
      where organisatie_id = $1 and soort = 'BEGINSAMENVATTING'
        and geaccepteerd_op is not null
      order by geaccepteerd_op desc
      limit 1`,
    [organisatieId],
  );
  /* EENMALIG, en dat is de hele grendel.
     De samenvattingsrij bewaart WELKE meldingen erin zaten, maar niet de
     per-bundel vingerafdrukken van dat moment. De toestand van toen is
     dus niet te reconstrueren, en daarom mag deze inhaalslag alleen
     gelden zolang er nog GEEN ENKELE alarmrij bestaat: dan is de huidige
     stand per definitie nog de stand die de samenvatting beschreef.

     Zonder die tweede voorwaarde zou ook een ESCALATIE als gedekt worden
     weggezet, want die heeft dezelfde melding-IDs. Toets 2e vond dat. */
  const gedekteIds = new Set((samenvattingen[0]?.melding_ids ?? []).map(Number));
  const alarmrijen = await rijen<{ n: number }>(
    c,
    `select count(*)::int as n from intel.meld_berichten
      where organisatie_id = $1 and soort in ('CRITICAL','FOUT','WARNING')`,
    [organisatieId],
  );
  const alGedekt =
    open.length > 0 &&
    (alarmrijen[0]?.n ?? 0) === 0 &&
    open.every((m) => gedekteIds.has(Number(m.id)));

  const { berichten: plan, gedekt } = bouwMeldplan({
    open,
    gesloten,
    gemeldeBundels: new Set(eerder.map((x) => x.bundel)),
    ooitGemeld: (totaalEerder[0]?.n ?? 0) > 0,
    nu,
    monitorUrl: (process.env["INTEL_MONITOR_URL"] ?? "").trim() || null,
  });

  /* DE DEKKING VASTLEGGEN wanneer de samenvatting al EERDER is
     geaccepteerd. Zit de samenvatting nog IN dit plan, dan gebeurt het
     pas na acceptatie, verder naar beneden. */
  let gedektVastgelegd = 0;
  /* DE DEKKING IS EEN VASTLEGGING, GEEN ONDERDRUKKING.
     Dat onderscheid is de hele oplossing. Zodra de dekkingsrijen
     BESTAAN met de vingerafdruk die het normale regime zou gebruiken,
     doet de unieke index `meldberichten_eenmalig` al het werk: dezelfde
     toestand levert dezelfde vingerafdruk en wordt niet verstuurd, en
     een GEWIJZIGDE toestand levert een andere vingerafdruk en gaat dus
     gewoon uit. Toets 2e vond dat: een eerdere versie onderdrukte ook de
     escalatie, omdat ze op melding-IDs keek in plaats van op toestand.

     De rijen worden gemarkeerd als geaccepteerd, want dat zijn ze: de
     ontvanger heeft deze storingen in de samenvatting gelezen en de
     provider heeft die aangenomen. */
  const teDekken = alGedekt ? plan.filter((x) => x.soort !== "HERSTEL") : [];
  if (teDekken.length > 0) {
    for (const d of teDekken) {
      const r = await c.query(
        `insert into intel.meld_berichten
           (organisatie_id, soort, bundel, vingerafdruk, ernst, onderwerp, melding_ids,
            html, tekst, aangeboden_op, geaccepteerd_op, pogingen, provider)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,0,'resend')
         on conflict (organisatie_id, soort, bundel, vingerafdruk) do nothing`,
        [organisatieId, d.soort, d.bundel, d.vingerafdruk, d.ernst, d.onderwerp,
         d.meldingIds, d.html, d.tekst, nu],
      );
      gedektVastgelegd += r.rowCount ?? 0;
    }
    if (gedektVastgelegd > 0) {
      log.info("de eerder geaccepteerde beginsamenvatting dekt deze berichten", {
        gedekt: gedektVastgelegd, bundels: teDekken.map((d) => `${d.soort}:${d.bundel}`),
      });
    }
  }

  /* Vastleggen. `on conflict do nothing` IS de deduplicatie. */
  let nieuw = 0;
  for (const b of plan) {
    const r = await c.query(
      /* `volgende_poging_op` KRIJGT DE MEEGEGEVEN KLOK, NIET now().
         Hier stond `now()`, en dat is een tweede klok in een module die
         bovenaan zelf zegt: "geen klok behalve de meegegeven `nu`".

         De selectie een paar regels verderop filtert op
         `volgende_poging_op <= $3` met diezelfde `nu`. Zolang beide
         dezelfde klok lezen valt dat samen; leest de insert de
         DATABASEklok en de selectie een MEEGEGEVEN klok, dan verschuift
         het ene ten opzichte van het andere.

         Gemeten gevolg, 14 oktober 2026: de negen ketentoetsen pinnen
         `nu` op 06:00:00Z. Zodra de echte klok daar voorbij was, kreeg
         elk nieuw gepland bericht `volgende_poging_op` op de ECHTE tijd
         (~10:00Z), en dat is niet `<= 06:00Z`. Het bericht werd dus
         gepland en nooit geselecteerd: `stand.nieuw = 1`, verzonden 0.
         Van 06:00Z af faalde de hele suite — 251 van 260 — en daarmee
         `npm run poort` en elke CI-ronde.

         In productie viel het niet op omdat `nu` daar `new Date()` is:
         twee klokken die milliseconden uit elkaar liggen. De toets maakte
         het verschil zichtbaar, en dat is precies waar die seam voor is.

         NIET MIJN CODE EN NIET MIJN RELEASE. Gerepareerd omdat het elke
         merge blokkeerde, in een eigen commit zodat het los terug te
         draaien is. */
      `insert into intel.meld_berichten
         (organisatie_id, soort, bundel, vingerafdruk, ernst, onderwerp, melding_ids,
          html, tekst, volgende_poging_op)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9, $10::timestamptz)
       on conflict (organisatie_id, soort, bundel, vingerafdruk) do nothing`,
      [organisatieId, b.soort, b.bundel, b.vingerafdruk, b.ernst, b.onderwerp, b.meldingIds,
       b.html, b.tekst, nu.toISOString()],
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
    /* FOR UPDATE SKIP LOCKED — DE EERSTE VAN TWEE GRENDELS.
       Zonder deze regel selecteren twee gelijktijdige rondes dezelfde
       rij, bieden hem beide aan de provider aan en gaat er TWEE keer
       dezelfde mail uit. Gemeten op 15 oktober 2026: `verzonden 2` voor
       een rij, beide rondes `aangeboden 1`, en het tweede provider-id
       overschreef het eerste. De unieke index kan daar niets tegen doen:
       die bewaakt het BESTAAN van een rij, niet het AANTAL VERZENDINGEN.

       WAAROM SKIP LOCKED EN NIET GEWOON FOR UPDATE. Met `for update`
       zou de tweede ronde BLOKKEREN tot de eerste commit — en de eerste
       transactie loopt door tot na de netwerkaanroep bij de provider.
       Een trage provider zou de tweede ronde dan minuten laten wachten
       om vervolgens alsnog niets te doen. Met `skip locked` slaat de
       tweede ronde de rij over en gaat verder met de volgende; dat is
       hier precies goed, want een overgeslagen rij is geen verloren rij
       maar een rij die iemand anders al in behandeling heeft.

       WAT DIT NIET IS. Dit is geen vergrendeling over de hele ronde: het
       slot geldt per rij en valt weg bij commit of rollback. Een crash
       laat dus geen vastgelopen bericht achter — zie de claim hieronder
       en de kop van ops/mail.ts over de crashwindow. */
    `select id, soort, bundel, vingerafdruk, pogingen, onderwerp, html, tekst
       from intel.meld_berichten
      where organisatie_id = $1
        and geaccepteerd_op is null
        and pogingen < $2
        and (volgende_poging_op is null or volgende_poging_op <= $3)
      order by aangemaakt_op
      limit $4
      for update skip locked`,
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

    /* DE CLAIM — DE TWEEDE GRENDEL, EN DE ATOMAIRE.

       `skip locked` hierboven dekt twee rondes die langs DEZE selectie
       komen. Deze claim dekt elke andere aanroeper: hij herhaalt de
       voorwaarden als UPDATE-predicaat, en een UPDATE die op een
       rijvergrendeling wacht herbeoordeelt onder READ COMMITTED zijn
       WHERE op de NIEUWE rijversie. Wie als tweede komt ziet dus
       `geaccepteerd_op` gevuld of `pogingen` verhoogd, krijgt
       `rowCount = 0`, en biedt niets aan. Zonder vergelijking in code,
       zonder leesronde vooraf: de database beslist.

       HET IS EEN COMPARE-AND-SET, EN DAT IS NIET DECORATIEF. Het
       predicaat bindt `pogingen` aan de waarde die de SELECTIE zag.
       Zonder die binding liet de claim een tweede aanbieding door zodra
       de eerste ronde op een NIET-herhaalbare fout eindigde: dan is
       `geaccepteerd_op` nog leeg en `volgende_poging_op` null, dus het
       oude predicaat klopte opnieuw. Gemeten op 16 oktober 2026:
       rowCount 1 voor de tweede claimer. `organisatie_id` staat erbij
       omdat de tenantgrens niet aan RLS alleen mag hangen: het
       productiepad (kern/taken.ts) draait op een verbinding zonder
       rolwissel, en de eigenaar van de tabel omzeilt RLS.

       DE POGING WORDT HIER GETELD, EN NERGENS ANDERS. Eerst stond
       `pogingen + 1` in beide uitkomsttakken. Dat kan niet meer samen
       met deze claim — dan zou een geslaagde verzending twee pogingen
       kosten en het retrybudget halveren. De takken hieronder schrijven
       daarom alleen nog de UITKOMST.

       EEN CRASH LAAT GEEN VASTGELOPEN BERICHT ACHTER. De claim zit in
       dezelfde transactie als de ronde; valt het proces weg, dan rolt
       hij terug en staat de rij er precies zo als hij stond —
       onverzonden, met dezelfde `pogingen`. De volgende ronde pakt hem
       gewoon op. Er is dus geen lease nodig en geen opruimtaak voor
       halfverwerkte rijen. */
    const geclaimd = await c.query(
      `update intel.meld_berichten
          set aangeboden_op = coalesce(aangeboden_op, now()),
              pogingen = pogingen + 1
        where id = $1
          and organisatie_id = $2
          and geaccepteerd_op is null
          and pogingen = $3
          and (volgende_poging_op is null or volgende_poging_op <= $4)`,
      [rij.id, organisatieId, rij.pogingen, nu.toISOString()],
    );
    if ((geclaimd.rowCount ?? 0) === 0) {
      log.waarschuwing("meldbericht was al door een andere ronde geclaimd; niet aangeboden", {
        bericht: rij.id, soort: rij.soort, bundel: rij.bundel,
      });
      continue;
    }

    /* DE IDEMPOTENTIESLEUTEL — TEGEN DE CRASHWINDOW, NIET TEGEN DE RACE.
       De race is hierboven al dicht. Wat overblijft is het venster
       tussen de 200 van de provider en onze commit: accepteert Resend
       het bericht en valt onze transactie daarna weg, dan weet de
       database van niets en biedt een volgende ronde hetzelfde bericht
       opnieuw aan. Alleen de provider kan die tweede mail nog
       tegenhouden.

       DE KORREL EN DE OPBOUW STAAN BIJ `idempotentieSleutelVan`. Kort:
       inhoudgebonden (een payloadhash, niet de rij-id), met een
       omgevingsdiscriminator, en roterend op het aantal BEKENDE
       antwoorden in plaats van op elke poging. `rij.pogingen` is hier
       precies dat aantal, want een onbekende uitkomst draait de
       verhoging hieronder terug.

       DE PAYLOADHASH LOST OOK HET VANGNET OP. Een rij zonder bewaarde
       inhoud krijgt zijn tekst uit het PLAN, en dat plan rendert de klok
       van de ronde. Die tekst verschilt dus per ronde. Met een
       positionele sleutel zou dat een 409 `invalid_idempotent_request`
       geven en het bericht permanent blokkeren; met een payloadhash
       verandert de sleutel mee en gaat het bericht gewoon uit. Dat kost
       voor die (oude) rijen de bescherming tegen een dubbele mail, en
       dat is de juiste ruil: liever een dubbel alarm dan geen. */
    const idempotentieSleutel = idempotentieSleutelVan(organisatieId, inhoud, rij.pogingen);

    aangeboden += 1;
    const uitkomst = opties.verstuur
      ? await opties.verstuur(inhoud, idempotentieSleutel)
      : await verstuurMail(inhoud, { idempotentieSleutel });

    if (uitkomst.geaccepteerd) {
      await c.query(
        `update intel.meld_berichten
            set geaccepteerd_op = now(),
                provider = $2, provider_id = $3,
                laatste_fout = null, volgende_poging_op = null
          where id = $1`,
        [rij.id, uitkomst.provider, uitkomst.providerId],
      );
      geaccepteerd += 1;
      log.info("meldbericht geaccepteerd door de provider", {
        bericht: rij.id, soort: rij.soort, bundel: rij.bundel, provider_id: uitkomst.providerId,
      });

      /* DE DEKKING, EN PAS NU.
         Een beginsamenvatting beschrijft de hele stand, met elk signaal
         en zijn meting erin. Zonder deze stap plant de VOLGENDE ronde
         alsnog per bundel een FOUT-mail plus het dagoverzicht — drie
         berichten over storingen die de ontvanger al heeft gelezen.

         De dekking wordt vastgelegd als GEWONE berichtrijen met de
         vingerafdruk die het normale regime zou hebben gebruikt, en
         gemarkeerd als geaccepteerd met het provider-id van de
         samenvatting. Daarmee doet de bestaande unieke index al het
         werk: dezelfde toestand levert dezelfde vingerafdruk en wordt
         niet opnieuw verstuurd, terwijl een ANDERE toestand (een nieuwe
         storing, een escalatie, een gewijzigde meting) een andere
         vingerafdruk geeft en dus wel gewoon uitgaat.

         STRIKT NA ACCEPTATIE. Mislukt de samenvatting, dan staat deze
         code niet in het pad en is er dus niets als gemeld
         geregistreerd — dan komt het normale regime de volgende ronde
         gewoon op. */
      if (rij.soort === "BEGINSAMENVATTING" && gedekt.length > 0) {
        for (const d of gedekt) {
          const r = await c.query(
            `insert into intel.meld_berichten
               (organisatie_id, soort, bundel, vingerafdruk, ernst, onderwerp, melding_ids,
                html, tekst, aangeboden_op, geaccepteerd_op, pogingen, provider, provider_id)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,0,$11,$12)
             on conflict (organisatie_id, soort, bundel, vingerafdruk) do nothing`,
            [organisatieId, d.soort, d.bundel, d.vingerafdruk, d.ernst, d.onderwerp,
             d.meldingIds, d.html, d.tekst, nu, uitkomst.provider, uitkomst.providerId],
          );
          gedektVastgelegd += r.rowCount ?? 0;
        }
        log.info("de beginsamenvatting dekt deze berichten; ze gaan niet apart uit", {
          bericht: rij.id, gedekt: gedektVastgelegd,
          bundels: gedekt.map((d) => `${d.soort}:${d.bundel}`),
        });
      }
      continue;
    }

    /* EEN ONBEKENDE UITKOMST IS GEEN POGING.
       Geen antwoord van de provider betekent: misschien is de mail wel
       verstuurd. Dan moet de volgende ronde het met DEZELFDE sleutel
       overdoen, zodat de provider de tweede mail tegenhoudt — en dat kan
       alleen als `pogingen` niet opschuift, want dat getal zit in de
       sleutel. Daarom wordt de verhoging van de claim hier
       teruggedraaid en krijgt de rij alleen een korte wachttijd.

       DIT VERBRUIKT DUS GEEN RETRYBUDGET, EN DAT IS EEN KEUZE. Een
       aanhoudende netwerkstoring laat deze rij elke ronde opnieuw
       proberen in plaats van hem na vijf keer op te geven. Voor een
       ALERTEERDER is dat de goede kant om op te falen: blijven proberen
       een storingsmail af te leveren kost een HTTP-verzoek per uur,
       terwijl opgeven betekent dat niemand van de storing hoort. De
       sleutel blijft gelijk, dus binnen het venster van de provider
       levert dat geen tweede mail op.

       De wachttijd is de eerste trede van de ladder (1 minuut). Die
       trede was tot nu toe onbereikbaar, want `volgendePoging` wordt
       alleen met `pogingen >= 1` aangeroepen; hier krijgt hij zijn eigen
       betekenis: 'probeer het de volgende ronde gewoon weer'. */
    if (uitkomst.uitkomstBekend === false) {
      const wacht = new Date(nu.getTime() + (BACKOFF_MINUTEN[0] ?? 1) * 60_000);
      await c.query(
        `update intel.meld_berichten
            set pogingen = $2,
                laatste_fout = $3,
                volgende_poging_op = $4
          where id = $1`,
        [
          rij.id,
          rij.pogingen,
          redigeer(`uitkomst onbekend: ${uitkomst.fout ?? "geen antwoord"}`).slice(0, 300),
          wacht,
        ],
      );
      mislukt += 1;
      log.waarschuwing(
        "meldbericht aangeboden, uitkomst ONBEKEND; zelfde sleutel bij de volgende poging",
        {
          bericht: rij.id, soort: rij.soort, bundel: rij.bundel,
          pogingen: rij.pogingen,
          fout: (uitkomst.fout ?? "").slice(0, 160),
        },
      );
      continue;
    }

    /* De claim heeft `pogingen` al verhoogd en `aangeboden_op` gezet;
       dit is dezelfde waarde als wat er nu in de rij staat. */
    const pogingen = rij.pogingen + 1;
    /* Een niet-herhaalbare fout (verkeerd adres, ongeldige sleutel) lost
       zich niet op door te wachten: die krijgt geen volgende poging. */
    const volgende = uitkomst.herhaalbaar ? volgendePoging(pogingen, nu) : null;
    await c.query(
      `update intel.meld_berichten
          set laatste_fout = $2,
              volgende_poging_op = $3
        where id = $1`,
      [rij.id, redigeer(uitkomst.fout ?? "onbekende fout").slice(0, 300), volgende],
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
    gedekt: gedektVastgelegd,
  };
}

/**
 * De vingerafdruk van een losse testmail.
 *
 * STABIEL PER MINUUT, EN DAT IS GEEN DETAIL. De eerste versie nam de
 * volledige ISO-tijd, en dus was elke poging een ander bericht — de
 * unieke index kon er niets tegen doen.
 *
 * Gemeten op 14 oktober 2026 om 05:10Z: de ops-runner startte het
 * commando TWEE KEER (een containerstart viel samen met de redeploy van
 * een variabelewijziging) en er gingen TWEE testmails naar
 * marketing@vibeenergy.nl, met berichten 1 en 2 en twee verschillende
 * provider-ids. Precies de duplicatie die par. 4.5 verbiedt, en de
 * TEST-weg was de enige die de grendel omzeilde.
 *
 * Met de minuut als korrel vangt `meldberichten_eenmalig` de tweede
 * poging af: twee containerstarts binnen dezelfde minuut leveren
 * dezelfde vingerafdruk, en de insert doet dan niets. Een test die je
 * een minuut later echt opnieuw wilt, kan nog gewoon.
 */
export function testVingerafdruk(nu: Date): string {
  const minuut = nu.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  return sha256hex(`test|${minuut}`).slice(0, 32);
}

export { normaliseerMeting };
