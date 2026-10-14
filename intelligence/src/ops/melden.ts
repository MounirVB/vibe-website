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

   3 DE BESTEMMING. Die is sinds 3.0.9 AANGEWEZEN, maar nog niet
     aangezet — zie onderaan.

   DE BESTEMMING, EN WAAROM HET ZO LANG GEEN WAS

   Tot 3.0.8 stond hier dat er geen door een mens goedgekeurde
   bestemming bestond. Dat was waar en op vier plaatsen gemeten: Railway
   nul notificatieregels, GitHub nul repository-webhooks, geen
   Slack-webhook, geen Telegram-token. Er waren wel twee werkende
   verzendpaden, maar beide met een ontvanger die voor iets anders was
   goedgekeurd.

   De eigenaar heeft er nu een aangewezen: marketing@vibeenergy.nl. De
   weg erheen is het bestaande Resend-pad op `api/server.js`, dat sinds
   augustus 2026 mail verstuurt vanaf het geverifieerde
   no-reply@vibeenergy.nl. Dat endpoint heet POST /api/meld, vraagt een
   bearer-token, en zet de JSON die `bezorgMeldingen()` hieronder al
   verstuurde om in een Nederlandse zakelijke mail. Geen tweede
   provider, geen tweede domeinverificatie, geen tweede faalwijze voor
   dezelfde handeling.

   WAT ER NODIG IS OM HEM AAN TE ZETTEN
     INTEL_MELD_WEBHOOK   https://<api-host>/api/meld
     INTEL_MELD_TOKEN     moet gelijk zijn aan MELD_TOKEN op de api

   ZOLANG INTEL_MELD_WEBHOOK NIET GEZET IS, GEBEURT ER NIETS. Dat is
   geen tekort maar de afspraak: automatische productiealarmering gaat
   pas aan na een geslaagde end-to-end-test en expliciet akkoord.

   VIER NIVEAUS, DRIE RITMES (3.0.9)

     KRITIEK        FOUT of NIET GEMETEN in een kritiek domein
                    (database, authenticatie, backup) -> direct
     FOUT           een storing buiten die domeinen        -> direct
     WAARSCHUWING   NIET GEMETEN: iets is niet gemeten, en dat is geen
                    storing -> EEN DAGELIJKSE SAMENVATTING
     HERSTEL        een melding die sluit                  -> direct

   Waarom NIET GEMETEN niet direct gaat: er staan er structureel zes
   open (vijf ontbrekende connectoren en een niet-ingestelde
   meldbestemming). Die elk uur als alarm versturen maakt van een
   alerteerder een ruisbron, en dan leest niemand de kritieke meldingen
   meer. Een dagelijkse samenvatting zegt hetzelfde zonder dat effect.
   ============================================================ */

import { createHash } from "node:crypto";

import type pg from "pg";
import { rijen, eenRij } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { redacteerFout } from "../kern/geheimen.ts";
import type { Signaal } from "./gezondheid.ts";
import { isKritiekeGroep } from "./ernst.ts";

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

/* ==================================================================
   DE ZUIVERE BESLISREGELS VAN DE ALARMERING
   ------------------------------------------------------------------
   Alles hieronder is een pure functie. Dat is opzet: welke mail er
   uitgaat, hoeveel het er zijn en wanneer, is de kern van deze release
   en hoort toetsbaar te zijn zonder database, zonder netwerk en zonder
   mailprovider.
   ================================================================== */

/** De vier ritmes van de bezorging. Los van de signaalniveaus. */
export type Alarmniveau = "KRITIEK" | "FOUT" | "WAARSCHUWING" | "HERSTEL";

/**
 * Welk alarmniveau hoort bij een open melding?
 *
 * `isKritiekeGroep` komt uit ops/ernst.ts en niet uit een eigen lijst:
 * twee lijsten van "wat is kritiek" lopen uiteen, en dan alarmeert de
 * mail iets anders dan het rapport zegt.
 */
export function alarmniveauVan(m: { readonly groep: string; readonly niveau: string }): Alarmniveau {
  if (!MELDWAARDIG.has(m.niveau)) {
    /* Zou niet voorkomen — deze functie krijgt alleen meldwaardige
       rijen — maar een stille verkeerde indeling is erger dan een
       expliciete. WAARSCHUWING is de minst alarmerende keuze. */
    return "WAARSCHUWING";
  }
  if (isKritiekeGroep(m.groep)) return "KRITIEK";
  if (m.niveau === "FOUT") return "FOUT";
  return "WAARSCHUWING";
}

/** Gaat dit niveau DIRECT de deur uit, of wacht het op de dagsamenvatting? */
export const DIRECT: ReadonlySet<Alarmniveau> = new Set<Alarmniveau>(["KRITIEK", "FOUT", "HERSTEL"]);

/**
 * De wachttijd vóór de volgende bezorgpoging, in seconden.
 *
 * 1, 4, 16, 64 minuten. Exponentieel met factor vier, want de
 * gezondheidstaak draait elk uur: met factor twee zou de vijfde poging
 * nog binnen hetzelfde etmaal vallen en dan is de back-off een
 * formaliteit.
 *
 * WAAROM BACK-OFF EN GEEN VASTE PAUZE. Een bestemming die even weg is
 * (een deploy van de api, een Resend-hik) hoort binnen een minuut
 * opnieuw geprobeerd te worden. Een bestemming die structureel weigert
 * — een verkeerd token, een verkeerde URL — moet juist niet elk uur
 * bestookt worden; na vijf pogingen blijft de melding open staan met
 * zijn laatste fout, en dan is het aan een mens.
 */
export function backoffSeconden(pogingen: number): number {
  if (pogingen <= 0) return 0;
  return 60 * Math.pow(4, Math.min(pogingen, 4) - 1);
}

/**
 * De bundel waartoe een melding hoort, of null.
 *
 * WAAROM DIT EEN VASTGELEGD FEIT LEEST EN GEEN TEKST ZOEKT.
 *
 * Op 14 oktober 2026 stonden er drie FOUT-signalen open die alle drie
 * over DEZELFDE bron gingen:
 *
 *   ingestie/brondekking                       "FAILED: rendo-nieuws"
 *   ingestie/bronnen met opeenvolgende fouten  "1 van 20 ... rendo-nieuws"
 *   ingestie/storingssoort TOEGANG_BEPERKT     "1 bron ... rendo-nieuws"
 *
 * Drie mails voor één blokkade is drie keer dezelfde boodschap, en de
 * eigenaar vroeg expliciet dat ze herkenbaar zijn als één onderliggend
 * probleem.
 *
 * DE EERSTE VERSIE ZOCHT DE BRONSLEUTELS IN DE MEETTEKST, en dat was
 * fout. Alle drie die teksten worden afgekapt op 160 tekens
 * (ops/brondekking.ts, en twee plekken in gezondheid.ts). Een signaal
 * dat werkelijk over VIJF bronnen gaat kan er daardoor één tonen, en
 * dan zou de bundeling beweren dat twee signalen dezelfde oorzaak
 * hebben terwijl dat niet vaststaat. Dat is de verkeerde kant op falen.
 *
 * Nu zet de gezondheidsmeting `bron` alleen als er aantoonbaar PRECIES
 * EEN bron in het spel is — uit de telling, niet uit de tekst — en legt
 * `synchroniseerMeldingen()` dat vast in `bron_sleutel` (migratie
 * 0040). Deze functie leest dat feit.
 */
export function bundelVan(m: { readonly bron_sleutel?: string | null }): string | null {
  const b = (m.bron_sleutel ?? "").trim();
  return b ? `bron ${b}` : null;
}

/** Eén melding zoals de bezorging hem nodig heeft. */
export type TeBezorgen = {
  readonly id: number;
  readonly sleutel: string;
  readonly groep: string;
  readonly niveau: string;
  readonly laatste_meting: string;
  readonly laatste_advies: string | null;
  readonly geopend_op: string;
  readonly keren_gezien: number;
  /** De bron waar deze melding over gaat, als dat er precies EEN is. */
  readonly bron_sleutel?: string | null;
};

/** Eén bericht, precies zoals POST /api/meld het verwacht. */
export type MeldBericht = {
  readonly dienst: "vibe-energy-intelligence";
  readonly niveau: Alarmniveau;
  readonly titel: string;
  readonly bundel: string | null;
  readonly afdruk: string;
  readonly items: readonly {
    readonly signaal: string;
    readonly niveau: string;
    readonly meting: string;
    readonly advies: string | null;
    readonly sinds: string;
    readonly keren_gezien: number;
  }[];
  /** De meldingen die dit bericht dekt; na bezorging worden die bijgewerkt. */
  readonly ids: readonly number[];
};

/**
 * Hoeveel losse alarmen mogen er in één ronde uitgaan voordat er één
 * achterstandsbericht van wordt gemaakt?
 *
 * DIT GETAL BESTAAT VOOR EEN GEMETEN SITUATIE. Op het moment dat de
 * bestemming wordt aangezet staan er tien meldingen open die nog nooit
 * bezorgd zijn — sommige sinds 12 oktober. Zonder grendel zou de eerste
 * ronde daar tien mails van maken, en dat is precies wat de eigenaar
 * verbood. Drie is de grens: tot drie losse berichten is nog te lezen,
 * daarboven is één overzicht beter dan een stortvloed.
 */
export const ACHTERSTANDSGRENS = 3;

const afdrukVan = (delen: readonly string[]) =>
  createHash("sha256").update(delen.join("|")).digest("hex").slice(0, 32);

/**
 * Zet open meldingen om in de berichten die werkelijk verstuurd worden.
 *
 * Deze functie doet drie dingen die niet los van elkaar kunnen:
 * routeren op niveau, bundelen per bron, en afkappen bij achterstand.
 * Ze staat daarom als EEN pure functie hier, en niet verspreid over de
 * bezorglus.
 *
 * `alleenDirect` scheidt de twee ritmes: de bezorgronde vraagt om de
 * directe niveaus, de dagelijkse samenvatting om de rest.
 *
 * DE AFDRUK IS DE DEDUPLICATIE AAN DE ANDERE KANT. Hij hangt aan de
 * signaalsleutels en het niveau, NIET aan de meettekst of het aantal
 * keren gezien — anders zou een bron die van 14 naar 15 waarnemingen
 * gaat een nieuwe mail opleveren. Hij gaat mee als Resend
 * Idempotency-Key, dus zelfs een dubbele POST levert één mail.
 */
export function bouwBerichten(
  meldingen: readonly TeBezorgen[],
  opties: { readonly alleenDirect: boolean; readonly grens?: number } = { alleenDirect: true },
): readonly MeldBericht[] {
  const grens = opties.grens ?? ACHTERSTANDSGRENS;
  const relevant = meldingen.filter((m) =>
    opties.alleenDirect ? DIRECT.has(alarmniveauVan(m)) : !DIRECT.has(alarmniveauVan(m)),
  );
  if (relevant.length === 0) return [];

  const itemVan = (m: TeBezorgen) => ({
    signaal: m.sleutel,
    niveau: m.niveau,
    meting: m.laatste_meting,
    advies: m.laatste_advies,
    sinds: m.geopend_op,
    keren_gezien: m.keren_gezien,
  });

  /* ---- de dagelijkse samenvatting: altijd precies EEN bericht ---- */
  if (!opties.alleenDirect) {
    return [
      {
        dienst: "vibe-energy-intelligence",
        niveau: "WAARSCHUWING",
        titel: `${relevant.length} waarschuwing(en) open`,
        bundel: null,
        afdruk: afdrukVan(["samenvatting", ...relevant.map((m) => m.sleutel).sort()]),
        items: relevant.map(itemVan),
        ids: relevant.map((m) => m.id),
      },
    ];
  }

  /* ---- bundelen per bron ---- */
  const bundels = new Map<string, TeBezorgen[]>();
  const los: TeBezorgen[] = [];
  for (const m of relevant) {
    const b = bundelVan(m);
    if (b === null) {
      los.push(m);
      continue;
    }
    const lijst = bundels.get(b);
    if (lijst) lijst.push(m);
    else bundels.set(b, [m]);
  }

  const berichten: MeldBericht[] = [];

  for (const [bundel, groep] of bundels) {
    /* EEN BUNDEL VAN EEN IS GEEN BUNDEL. Staat er maar één signaal over
       deze bron open, dan is het een gewone melding en zou de tekst
       "deze 1 signalen horen bij één probleem" alleen verwarren. */
    if (groep.length === 1) {
      los.push(groep[0]!);
      continue;
    }
    const zwaarste = groep.some((m) => alarmniveauVan(m) === "KRITIEK") ? "KRITIEK" : "FOUT";
    berichten.push({
      dienst: "vibe-energy-intelligence",
      niveau: zwaarste,
      titel: `${bundel}: ${groep.length} signalen, één onderliggend probleem`,
      bundel,
      afdruk: afdrukVan([zwaarste, bundel, ...groep.map((m) => m.sleutel).sort()]),
      items: groep.map(itemVan),
      ids: groep.map((m) => m.id),
    });
  }

  for (const m of los) {
    const niveau = alarmniveauVan(m);
    berichten.push({
      dienst: "vibe-energy-intelligence",
      niveau,
      titel: m.sleutel,
      bundel: null,
      afdruk: afdrukVan([niveau, m.sleutel]),
      items: [itemVan(m)],
      ids: [m.id],
    });
  }

  /* ---- de achterstandsgrendel ---- */
  if (berichten.length > grens) {
    const alle = berichten.flatMap((b) => b.items);
    const ids = berichten.flatMap((b) => b.ids);
    const kritiek = berichten.some((b) => b.niveau === "KRITIEK");
    return [
      {
        dienst: "vibe-energy-intelligence",
        niveau: kritiek ? "KRITIEK" : "FOUT",
        titel: `${berichten.length} openstaande storingen — achterstand in één overzicht`,
        bundel: null,
        afdruk: afdrukVan(["achterstand", ...ids.map(String).sort()]),
        items: alle,
        ids,
      },
    ];
  }

  return berichten;
}

export type MeldStand = {
  readonly geopend: number;
  readonly bijgewerkt: number;
  readonly gesloten: number;
  readonly open: number;
  /** Hoeveel MELDINGEN bezorgd zijn (een bundel dekt er meer dan een). */
  readonly bezorgd: number;
  readonly bezorgfouten: number;
  /** Hoeveel BERICHTEN er werkelijk verstuurd zijn. Dat is het aantal mails. */
  readonly berichten: number;
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
         (organisatie_id, sleutel, groep, niveau, laatste_meting, laatste_advies, bron_sleutel)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (organisatie_id, sleutel) where gesloten_op is null
       do update set laatst_gezien_op = now(),
                     keren_gezien     = intel.meldingen.keren_gezien + 1,
                     niveau           = excluded.niveau,
                     laatste_meting   = excluded.laatste_meting,
                     laatste_advies   = excluded.laatste_advies,
                     bron_sleutel     = excluded.bron_sleutel
       returning (xmax = 0) as nieuw`,
      [organisatieId, sleutelVan(s), s.groep, s.niveau, s.meting, s.advies ?? null, s.bron ?? null],
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
/** Verstuurt één bericht naar de bestemming. Gooit bij een niet-ok antwoord. */
async function verstuur(
  bestemming: { readonly url: string; readonly token: string | null },
  bericht: MeldBericht,
  nu?: () => Promise<Response>,
): Promise<void> {
  const antwoord = nu
    ? await nu()
    : await fetch(bestemming.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(bestemming.token ? { authorization: `Bearer ${bestemming.token}` } : {}),
        },
        body: JSON.stringify(bericht),
        signal: AbortSignal.timeout(15_000),
      });
  if (!antwoord.ok) throw new Error(`HTTP ${antwoord.status}`);
}

/**
 * Probeert open meldingen af te leveren, gegroepeerd en met back-off.
 *
 * DE RETRY IS BEGRENSD OP POGINGEN EN OP TIJD. Tot 3.0.8 alleen op
 * pogingen, en omdat de gezondheidstaak elk uur draait was de teller na
 * vijf uur leeg en gebeurde er daarna nooit meer iets. Nu bepaalt
 * `backoffSeconden()` wanneer een volgende poging mag; na vijf pogingen
 * blijft de melding open staan met zijn laatste fout, en dan is het aan
 * een mens. Een melding die niet bezorgd kon worden, verdwijnt nooit
 * stil.
 *
 * WAT HIER NIET MEER GEBEURT: één POST per melding. Zie
 * `bouwBerichten()` — routeren, bundelen en afkappen bij achterstand.
 */
export async function bezorgMeldingen(
  c: pg.PoolClient,
  organisatieId: number,
  opties: {
    maxPogingen?: number;
    nu?: () => Promise<Response>;
    /** Alleen de directe niveaus (standaard), of juist de dagsamenvatting. */
    alleenDirect?: boolean;
  } = {},
): Promise<{ bezorgd: number; fouten: number; berichten: number }> {
  const bestemming = meldBestemming();
  if (bestemming.soort === "geen") return { bezorgd: 0, fouten: 0, berichten: 0 };

  const maxPogingen = opties.maxPogingen ?? 5;
  const alleenDirect = opties.alleenDirect ?? true;

  /* DE BACK-OFF ZIT IN DE QUERY, niet in de lus. Een melding komt pas
     terug zodra zijn wachttijd om is; daarmee is de pauze een
     eigenschap van de data en niet van een proces dat kan herstarten.

     MAAR DE GETALLEN KOMEN UIT backoffSeconden(), EN DAT IS HET PUNT.
     Hier stond de formule een tweede keer, in SQL: `$3 * power(4,
     least(bezorgpogingen,4) - 1)`. Dat is dezelfde regel op twee
     plekken, en de eenheidstoets dekt alleen de TypeScript-kant — dus
     een wijziging daar zou de query ongemoeid laten en niemand zou het
     merken. Nu gaat de tabel als array mee en indexeert SQL erin. Eén
     waarheid over wat 'wachten' betekent. */
  const wachttijden = [1, 2, 3, 4].map((p) => backoffSeconden(p));
  const open = await rijen<TeBezorgen>(
    c,
    `select id, sleutel, groep, niveau, laatste_meting, laatste_advies, bron_sleutel,
            geopend_op::text as geopend_op, keren_gezien
       from intel.meldingen
      where organisatie_id = $1
        and gesloten_op is null
        and bezorgd_op is null
        and bezorgpogingen < $2
        and (
          laatste_poging_op is null
          or laatste_poging_op < now() - make_interval(secs => ($3::int[])[least(bezorgpogingen, 4)])
        )
      order by geopend_op
      limit 50`,
    [organisatieId, maxPogingen, wachttijden],
  );
  if (open.length === 0) return { bezorgd: 0, fouten: 0, berichten: 0 };

  const berichten = bouwBerichten(open, { alleenDirect });

  let bezorgd = 0;
  let fouten = 0;
  for (const bericht of berichten) {
    try {
      await verstuur(bestemming, bericht, opties.nu);
      await c.query(
        `update intel.meldingen
            set bezorgd_op = now(),
                laatste_poging_op = now(),
                bezorgpogingen = bezorgpogingen + 1,
                bestemming = $2,
                laatste_bezorgfout = null
          where id = any($1::bigint[])`,
        [bericht.ids, new URL(bestemming.url).host],
      );
      bezorgd += bericht.ids.length;
    } catch (e) {
      /* Redigeren VOOR het afkappen: deze tekst gaat naar
         intel.meldingen.laatste_bezorgfout en naar het log. */
      const fout = redacteerFout(e);
      await c.query(
        `update intel.meldingen
            set bezorgpogingen = bezorgpogingen + 1,
                laatste_poging_op = now(),
                laatste_bezorgfout = $2
          where id = any($1::bigint[])`,
        [bericht.ids, fout.slice(0, 300)],
      );
      fouten += bericht.ids.length;
      log.waarschuwing("melding niet bezorgd", {
        meldingen: bericht.ids.length,
        niveau: bericht.niveau,
        titel: bericht.titel.slice(0, 80),
        fout: fout.slice(0, 120),
      });
    }
  }

  return { bezorgd, fouten, berichten: berichten.length };
}

/**
 * Meldt dat een storing voorbij is — precies één keer per melding.
 *
 * WAAROM DIT APART STAAT. Een gesloten melding is geen storing meer,
 * dus hij komt niet door de bezorgquery hierboven. Zonder deze functie
 * zou het alarm wel afgaan en nooit afgemeld worden, en dan weet een
 * lezer na een week nog niet of het probleem er nog is. `herstel_
 * bezorgd_op` (migratie 0039) zorgt dat het bij één bericht blijft.
 *
 * ALLEEN VOOR MELDINGEN DIE OOK ECHT GEALARMEERD ZIJN. Een melding die
 * nooit bezorgd is — omdat hij in de dagsamenvatting zat of omdat de
 * bestemming uitstond — hoeft geen herstelbericht: dan zou de eerste
 * mail over dat signaal meteen "het is weer goed" zijn, en dat is geen
 * informatie maar ruis.
 */
export async function bezorgHerstel(
  c: pg.PoolClient,
  organisatieId: number,
  opties: { nu?: () => Promise<Response> } = {},
): Promise<{ bezorgd: number; fouten: number }> {
  const bestemming = meldBestemming();
  if (bestemming.soort === "geen") return { bezorgd: 0, fouten: 0 };

  const dicht = await rijen<TeBezorgen & { gesloten_op: string }>(
    c,
    `select id, sleutel, groep, niveau, laatste_meting, laatste_advies,
            geopend_op::text as geopend_op, gesloten_op::text as gesloten_op, keren_gezien
       from intel.meldingen
      where organisatie_id = $1
        and gesloten_op is not null
        and herstel_bezorgd_op is null
        and bezorgd_op is not null
      order by gesloten_op
      limit 25`,
    [organisatieId],
  );
  if (dicht.length === 0) return { bezorgd: 0, fouten: 0 };

  let bezorgd = 0;
  let fouten = 0;
  for (const m of dicht) {
    const bericht: MeldBericht = {
      dienst: "vibe-energy-intelligence",
      niveau: "HERSTEL",
      titel: `${m.sleutel} is weer in orde`,
      bundel: null,
      afdruk: afdrukVan(["herstel", String(m.id), m.gesloten_op]),
      items: [
        {
          signaal: m.sleutel,
          niveau: "OK",
          meting: `de storing is voorbij; laatste meting vóór sluiten: ${m.laatste_meting}`,
          advies: null,
          sinds: m.geopend_op,
          keren_gezien: m.keren_gezien,
        },
      ],
      ids: [m.id],
    };
    try {
      await verstuur(bestemming, bericht, opties.nu);
      await c.query("update intel.meldingen set herstel_bezorgd_op = now() where id = $1", [m.id]);
      bezorgd += 1;
    } catch (e) {
      const fout = redacteerFout(e);
      await c.query(
        "update intel.meldingen set laatste_bezorgfout = $2, laatste_poging_op = now() where id = $1",
        [m.id, fout.slice(0, 300)],
      );
      fouten += 1;
      log.waarschuwing("herstelmelding niet bezorgd", { melding: m.id, fout: fout.slice(0, 120) });
    }
  }
  return { bezorgd, fouten };
}

/**
 * De dagelijkse samenvatting van alles wat NIET direct gealarmeerd wordt.
 *
 * Wordt aangeroepen door de taaksoort `meldsamenvatting`, die de planner
 * één keer per dag plant. De idempotentie zit dus in de taaksleutel —
 * hetzelfde mechanisme als de dagelijkse back-up — en niet in deze code.
 */
export async function bezorgDagsamenvatting(
  c: pg.PoolClient,
  organisatieId: number,
  opties: { nu?: () => Promise<Response> } = {},
): Promise<{ bezorgd: number; fouten: number; berichten: number }> {
  return bezorgMeldingen(c, organisatieId, { ...opties, alleenDirect: false, maxPogingen: 99 });
}

/** Eén ronde: synchroniseren en, als er een bestemming is, bezorgen. */
export async function meldRonde(
  c: pg.PoolClient,
  organisatieId: number,
  signalen: readonly Signaal[],
): Promise<MeldStand> {
  const sync = await synchroniseerMeldingen(c, organisatieId, signalen);
  /* SLUITEN KOMT VOOR BEZORGEN, en herstel komt daar weer na.
     synchroniseerMeldingen() heeft net gesloten wat weer OK is; die
     meldingen horen in deze ronde hun herstelbericht te krijgen en niet
     pas een uur later. */
  const bez = await bezorgMeldingen(c, organisatieId);
  const herstel = await bezorgHerstel(c, organisatieId);
  const open = await rijen<{ n: number }>(
    c,
    "select count(*)::int as n from intel.meldingen where organisatie_id = $1 and gesloten_op is null",
    [organisatieId],
  );
  const bestemming = meldBestemming();
  return {
    ...sync,
    open: open[0]?.n ?? 0,
    bezorgd: bez.bezorgd + herstel.bezorgd,
    bezorgfouten: bez.fouten + herstel.fouten,
    berichten: bez.berichten + herstel.bezorgd,
    bestemming: bestemming.soort === "geen" ? `UIT — ${bestemming.reden}` : new URL(bestemming.url).host,
  };
}
