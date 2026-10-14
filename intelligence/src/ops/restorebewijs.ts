/* ============================================================
   OPS — restorebewijs: één gezaghebbende herstelstatus voor elke service
   ------------------------------------------------------------
   WAAROM DIT BESTAND BESTAAT — een gemeten verschil tussen twee
   services die dezelfde code draaien.

   Op 14 oktober 2026, dezelfde minuut, dezelfde commit:

     vibe-intel-worker   OK            restoretest: laatste PASS 0,5 dagen
                                       geleden, 10 toetsen, restore 639 ms
     vibe-intel-api      NIET GEMETEN  restoretest: geen bewijs gevonden
                                       (geen bucket)  -> ernst CRITICAL

   De back-up was aantoonbaar herstelbaar. Alleen stond het BEWIJS op een
   plek die één van de twee services niet kan lezen: alleen de worker
   draagt INTEL_GCS_*. Een herstelstatus die van de meetPLAATS afhangt, is
   geen herstelstatus.

   Voor de back-upAANWEZIGHEID was dat al opgelost met een derde bron die
   op elke service hetzelfde zegt: intel.taken. Voor de RESTORETEST
   bestond die bron niet — gemeten in productie, 14 oktober 2026:

     soort        status   n   laatste
     backup       gereed   3   2026-10-14T00:00:29Z
     beoordelen   gereed  87   ...
     (geen enkele rij met soort 'restoretest')

   Dit bestand maakt die rij. De restoretest schrijft hem zelf, als
   onderdeel van de run die het bewijs oplevert.

   DRIE REGELS DIE HIER NIET TE OMZEILEN ZIJN

   1. ALLEEN EEN ECHT UITGEVOERDE RESTORE REGISTREERT ALS GESLAAGD.
      `registreerRestoretest()` schrijft status 'gereed' uitsluitend als
      de uitslag PASS is EN het aantal geslaagde controles gelijk is aan
      het VEREISTE aantal EN er geen enkele controle faalde. Een run die
      halverwege afbreekt heeft minder geslaagde controles en wordt dus
      'mislukt' — met het tekort in de reden. Dat gat was echt: tot nu
      toe keek niets naar het AANTAL, alleen naar de afwezigheid van
      fouten, en een overgeslagen controle is geen geslaagde controle.

   2. ER WORDT NOOIT IETS OVERSCHREVEN OF VERWIJDERD.
      De registratie is append-only: `on conflict do nothing`. De
      idempotentiesleutel draagt de uitslag EN het uur, zodat een retry
      binnen hetzelfde uur geen tweede rij maakt, maar een latere poging
      — of een poging met een andere uitslag — wél zijn eigen regel
      krijgt. Een mislukte poging blijft dus staan nadat een volgende
      poging slaagt. Dat is het hele punt van een logboek.

   3. EEN RECENTE BACK-UP IS GEEN BEWEZEN HERSTELBARE BACK-UP.
      De back-up-RPO (26 uur, DREMPELS.backupLeeftijdUren) en de
      restoreleeftijd (30 dagen, DREMPELS.restoretestLeeftijdDagen) zijn
      twee onafhankelijke eisen. `restoreAanvaardbaar()` kijkt met opzet
      NIET naar back-uptaken: een dump van een uur oud zegt niets over
      herstelbaarheid. De twee functies in dit platform die deze
      beslissingen nemen — backupAanvaardbaar() en
      restoreAanvaardbaar() — delen geen enkele invoer.
   ============================================================ */

import type pg from "pg";

import { eenRij, rijen } from "../kern/db.ts";
/* Type-only, dus na compilatie verdwijnt deze regel. gezondheid.ts
   importeert dit bestand WEL op runtime; zou de import hier ook echt
   zijn, dan was het een kringverwijzing. */
import type { Niveau } from "./gezondheid.ts";

/** De soort waaronder restorebewijs in intel.taken staat. */
export const RESTORETEST_TAAK_SOORT = "restoretest";

/**
 * Het aantal controles dat een VOLLEDIGE restoretest moet uitvoeren.
 *
 * Deze constante is de enige reden dat 'onvolledig' detecteerbaar is.
 * `cli/restoretest.ts` telt zijn geslaagde controles; wijkt dat aantal
 * af van dit getal, dan is de proef niet af en registreert hij 'mislukt'.
 *
 * Verandert het aantal controles in de CLI, dan MOET dit getal mee.
 * test/eenheid/restorebewijs.test.ts grendelt dat: hij telt de
 * `toets(`-aanroepen in de CLI en vergelijkt ze met dit getal. Zonder
 * die grendel zou een elfde controle de proef stil 'onvolledig' maken,
 * of — erger — een weggehaalde controle onopgemerkt blijven.
 */
export const VEREISTE_RESTORETOETSEN = 10;

/**
 * Het bewijs van één restoretest. Exact wat er naar GCS gaat én wat er
 * in de payload van de taakrij komt.
 *
 * ÉÉN TEKST, DRIE BESTEMMINGEN (lokaal merkbestand, bucket, takenlogboek).
 * Zou elke bestemming zijn eigen samenstelling krijgen, dan kunnen ze
 * uiteenlopen en weet niemand welke de echte is — precies de drift die
 * dit bestand bestrijdt.
 */
export type RestoretestBewijs = {
  /** ISO-tijdstip waarop de proef afrondde. */
  readonly op: string;
  readonly uitslag: "PASS" | "FAIL";
  readonly toetsen_geslaagd: number;
  /** VEREISTE_RESTORETOETSEN ten tijde van de run; meegeschreven zodat oud bewijs leesbaar blijft. */
  readonly toetsen_vereist: number;
  /** De namen van de controles die faalden. Leeg bij PASS. */
  readonly toetsen_mislukt: readonly string[];
  readonly restore_ms: number | null;
  /** De naam van het dumpobject in de bucket, zonder het 'uit-gcs-'-voorvoegsel. */
  readonly dump_object: string;
  /** De sha256 uit het manifest van die dump: de integriteitsverwijzing. */
  readonly dump_sha256: string;
  readonly bronserver: string;
  /** Waar het originele bewijs staat, bv 'gs://bucket/restoretest/laatste.json'. Null als de upload niet lukte. */
  readonly bewijs_uri: string | null;
  /** Welke isolatievorm gebruikt is; bepaalt hoe zwaar het bewijs weegt voor een lezer. */
  readonly doelvorm: "docker" | "wegwerpdatabase";
  /** Of de dump UIT DE BUCKET kwam. Alleen dan toetst de proef ook upload en terughalen. */
  readonly uit_bucket: boolean;
};

/** Is dit bewijs een VOLLEDIG geslaagde proef? Geen van beide helften mag ontbreken. */
export function bewijsIsVolledigGeslaagd(b: {
  readonly uitslag: string;
  readonly toetsen_geslaagd: number;
  readonly toetsen_vereist: number;
  readonly toetsen_mislukt: readonly string[];
}): boolean {
  return (
    b.uitslag === "PASS" &&
    b.toetsen_mislukt.length === 0 &&
    b.toetsen_vereist > 0 &&
    b.toetsen_geslaagd === b.toetsen_vereist
  );
}

/**
 * De idempotentiesleutel van een registratie.
 *
 * Vorm: `restoretest:<dumpobject>:<uitslag>:<YYYY-MM-DDTHH>`
 *
 * Waarom die vier delen, en niet minder:
 *
 *   dumpobject  twee proeven op VERSCHILLENDE dumps zijn twee feiten
 *   uitslag     een PASS mag een FAIL in hetzelfde uur niet verdringen,
 *               en omgekeerd ook niet — anders verdwijnt geschiedenis
 *   uur         een retry binnen hetzelfde uur is dezelfde poging en
 *               hoort GEEN tweede rij te maken
 *
 * Zonder het uur zou een geplande dagelijkse proef op dezelfde dump
 * nooit meer registreren; zonder de uitslag zou `do nothing` een latere
 * PASS weggooien omdat de FAIL er al stond.
 */
export function restoreSleutel(b: Pick<RestoretestBewijs, "op" | "uitslag" | "dump_object">): string {
  const uur = b.op.slice(0, 13); /* 2026-10-14T06 */
  return `${RESTORETEST_TAAK_SOORT}:${b.dump_object}:${b.uitslag}:${uur}`;
}

/**
 * Legt het bewijs vast in intel.taken. Append-only.
 *
 * Geeft terug of er een NIEUWE rij is gemaakt. `false` betekent: deze
 * poging stond er al (zelfde dump, zelfde uitslag, zelfde uur). Dat is
 * geen fout maar het bedoelde gedrag bij een retry.
 *
 * WAT HIJ NIET DOET: beoordelen of de proef goed genoeg was om de ernst
 * te verlagen. Hij legt het feit vast zoals het is, inclusief een
 * mislukking. Het oordeel staat in restoreAanvaardbaar(), en dat is
 * opzet: wie de meting schrijft, mag niet ook de norm bepalen.
 */
export async function registreerRestoretest(
  c: pg.PoolClient,
  organisatieId: number,
  bewijs: RestoretestBewijs,
): Promise<{ readonly nieuw: boolean; readonly status: "gereed" | "mislukt"; readonly sleutel: string }> {
  const volledig = bewijsIsVolledigGeslaagd(bewijs);
  const status: "gereed" | "mislukt" = volledig ? "gereed" : "mislukt";
  const sleutel = restoreSleutel(bewijs);

  /* De reden die bij een niet-geslaagde registratie hoort. Hij moet de
     LEZER vertellen welk van de drie gebreken het was, want 'mislukt'
     alleen stuurt niemand de goede kant op. */
  const reden = volledig
    ? null
    : bewijs.uitslag !== "PASS"
      ? `de restoretest gaf FAIL: ${bewijs.toetsen_mislukt.join(" | ").slice(0, 400) || "geen reden vastgelegd"}`
      : bewijs.toetsen_mislukt.length > 0
        ? `controles faalden: ${bewijs.toetsen_mislukt.join(" | ").slice(0, 400)}`
        : `ONVOLLEDIG: ${bewijs.toetsen_geslaagd} van ${bewijs.toetsen_vereist} vereiste controles geslaagd`;

  /* `gereed_op` EN `duur_ms` BLIJVEN MET OPZET LEEG, en dat is geen
     slordigheid maar het vermijden van precies de fout die dit bestand
     repareert.

     `ops/gezondheid.ts` meet `worker/hartslag` als `max(gereed_op)` over
     intel.taken ZONDER soortfilter. Zou een restoretestrij daar een
     `gereed_op` in zetten, dan meldt de hartslag OK omdat er een
     restoretest is gedraaid — terwijl de worker stilstaat. Eén
     proefrun vanaf een laptop zou dan een stilgevallen worker
     verbergen: een signaal dat iets anders meet dan het beweert, en dat
     is woordelijk het defect waarvoor deze module bestaat.

     De tijd van de proef staat in de payload (`op`), en de leesquery
     hieronder sorteert daarop. `duur_ms` blijft leeg om dezelfde reden:
     het is de duur van een WACHTRIJtaak, en dit is er geen. De
     restoreduur staat als `restore_ms` in het bewijs.

     Bijkomend klopt het ook beter met de rest van de tabel:
     `rondAf()` in kern/wachtrij.ts zet `gereed_op` uitsluitend bij een
     geslaagde taak, dus een 'mislukt'-rij met een gevulde `gereed_op`
     zou die afspraak tegenspreken. */
  const r = await eenRij<{ id: string }>(
    c,
    `insert into intel.taken
       (organisatie_id, soort, idempotentie_sleutel, payload, prioriteit,
        status, pogingen, laatste_fout, laatste_fout_soort)
     values ($1, $2, $3, $4, 100, $5, 1, $6, $7)
     on conflict (organisatie_id, soort, idempotentie_sleutel)
       where idempotentie_sleutel is not null
       do nothing
     returning id`,
    [
      organisatieId,
      RESTORETEST_TAAK_SOORT,
      sleutel,
      JSON.stringify(bewijs),
      status,
      reden,
      reden === null ? null : "restoretest",
    ],
  );

  /* `eenRij` geeft NULL terug als er geen rij is, niet undefined. Hier
     stond `r !== undefined`, en dat is altijd waar — ook bij een
     conflict, want `null !== undefined`. Daarmee zou elke dubbele
     registratie zich als 'nieuw geregistreerd' melden en zou de
     idempotentie niet te controleren zijn. Typecheck ziet dit niet: de
     vergelijking is geldig TypeScript. De integratietoets ziet het wel. */
  return { nieuw: r !== null, status, sleutel };
}

/** Eén gelezen registratie uit het takenlogboek. */
export type GelezenRestorebewijs = {
  readonly status: string;
  readonly op: string | null;
  readonly reden: string | null;
  readonly bewijs: Partial<RestoretestBewijs>;
};

/**
 * Leest de LAATSTE restoretestpoging uit het takenlogboek.
 *
 * DE LAATSTE POGING, NIET DE LAATSTE GESLAAGDE. Dat is een bewuste
 * keuze en meteen het antwoord op "tegenstrijdige statusinformatie": is
 * er gisteren een PASS geweest en vanmorgen een FAIL, dan is de back-up
 * niet aantoonbaar herstelbaar. Zou deze query op status filteren, dan
 * zou de verse mislukking onvindbaar zijn achter de oude PASS — en dat
 * is precies de blinde vlek die een monitor niet mag hebben.
 *
 * Sorteren op het tijdstip UIT HET BEWIJS (`payload->>'op'`) en niet op
 * `id` of `aangemaakt_op`: het bewijs draagt zijn eigen moment, en dat
 * is wat de leeftijd bepaalt. `gereed_op` kan hier niet dienen, want de
 * registratie laat die kolom met opzet leeg — zie de insert hierboven.
 *
 * `aangemaakt_op` als terugval voor een rij zonder bruikbaar tijdstip in
 * de payload: dan is de leeftijd nog ruwweg te bepalen in plaats van
 * helemaal niet.
 */
export async function leesRestorebewijsUitTaken(
  c: pg.PoolClient,
  organisatieId: number,
): Promise<GelezenRestorebewijs | null> {
  const r = await rijen<{
    status: string;
    op: string | null;
    reden: string | null;
    payload: Partial<RestoretestBewijs> | null;
  }>(
    c,
    /* HET TIJDSTIP KOMT ER IN UTC UIT, EXPLICIET, en niet via `::text`.
       `timestamptz::text` rendert in de TIJDZONE VAN DE SESSIE: op een
       machine met TZ=+04 gaf dezelfde rij `2026-10-14 13:30:00+04` in
       plaats van `2026-10-14T09:30:00Z`. Dat is geen ISO-8601, en
       `new Date()` erop is implementatieafhankelijk — terwijl deze
       waarde via urenSinds() de LEEFTIJD van het bewijs bepaalt en via
       `gemetenOp` in het rapport belandt.

       Dat zou een herstelstatus geven die afhangt van de omgeving waarin
       je hem opvraagt. Dat is woordelijk het defect waarvoor deze module
       bestaat, dus niet hier opnieuw invoeren. */
    `select status,
            to_char(coalesce((payload->>'op')::timestamptz, aangemaakt_op) at time zone 'utc',
                    'YYYY-MM-DD"T"HH24:MI:SS"Z"')                        as op,
            laatste_fout                                                 as reden,
            payload
       from intel.taken
      where organisatie_id = $1 and soort = $2
      order by coalesce((payload->>'op')::timestamptz, aangemaakt_op) desc, id desc
      limit 1`,
    [organisatieId, RESTORETEST_TAAK_SOORT],
  );
  const rij = r[0];
  if (!rij) return null;
  return { status: rij.status, op: rij.op, reden: rij.reden, bewijs: rij.payload ?? {} };
}

/* ------------------------------------------------------------------
   HET OORDEEL
   ------------------------------------------------------------------ */

/** Eén bron van restorebewijs, al herleid tot het wezenlijke. */
export type Bewijsbron = {
  /** PASS, FAIL, of null als deze bron niets te zeggen heeft. */
  readonly uitslag: "PASS" | "FAIL" | null;
  /** Is de proef volledig uitgevoerd? Alleen zinvol bij PASS. */
  readonly volledig: boolean;
  /** Dagen sinds de proef, of null als dat niet vast te stellen is. */
  readonly dagen: number | null;
  /** Waar dit bewijs vandaan komt, zoals het in de meting komt te staan. */
  readonly bron: string;
};

export type RestoreOordeel = {
  readonly niveau: Niveau;
  readonly grond: string;
  /** De bron(nen) die het oordeel dragen, voor de meettekst. */
  readonly bronnen: readonly string[];
  readonly tegenstrijdig: boolean;
};

/** Volgorde van zwaarte; de ZWAARSTE wint als twee bronnen iets zeggen. */
const ZWAARTE: Record<Niveau, number> = { OK: 0, "LET OP": 1, "NIET GEMETEN": 2, FOUT: 3 };

function beoordeelBron(b: Bewijsbron, drempelDagen: number): { niveau: Niveau; grond: string } {
  if (b.uitslag === null) {
    return { niveau: "NIET GEMETEN", grond: `${b.bron}: geen bewijs` };
  }
  if (b.uitslag !== "PASS") {
    return { niveau: "FOUT", grond: `${b.bron}: de laatste proef gaf FAIL` };
  }
  if (!b.volledig) {
    return { niveau: "FOUT", grond: `${b.bron}: de laatste proef is ONVOLLEDIG uitgevoerd` };
  }
  if (b.dagen === null) {
    /* Een PASS zonder tijdstip is geen bewijs van VERSHEID. Niet OK, en
       ook geen FOUT: de proef is wel geslaagd. */
    return { niveau: "NIET GEMETEN", grond: `${b.bron}: een PASS zonder tijdstip; de leeftijd is onbekend` };
  }
  if (b.dagen > drempelDagen) {
    return {
      niveau: "LET OP",
      grond: `${b.bron}: de laatste PASS is ${b.dagen.toFixed(1)} dagen oud, ouder dan ${drempelDagen} dagen`,
    };
  }
  return { niveau: "OK", grond: `${b.bron}: PASS van ${b.dagen.toFixed(1)} dagen oud` };
}

/**
 * Het oordeel over de herstelbaarheid, uit het takenlogboek en — waar
 * leesbaar — de bucket.
 *
 * DE REGELS, EN WAAROM ELK VAN DE VIER NOODZAKELIJK IS.
 *
 * 1. GEEN BEWIJS IS NOOIT OK. Geen taakrij en geen leesbaar
 *    bucketbewijs levert NIET GEMETEN. Dat is met opzet geen 'OK' en
 *    met opzet geen 'FOUT': er is niets vastgesteld, en dat moet precies
 *    zo in het rapport staan.
 *
 * 2. EEN BRON DIE NIETS KAN ZEGGEN, ZEGT NIETS. Kan deze service de
 *    bucket niet lezen, dan draagt de bucket niet bij — hij stemt niet
 *    tegen. Dat is de hele reparatie: een afwezige MEETMOGELIJKHEID is
 *    geen bevinding over het platform. Het takenlogboek is gedeeld en
 *    zegt op elke service hetzelfde; dat is de gezaghebbende bron.
 *
 * 3. ZEGGEN BEIDE BRONNEN IETS, DAN WINT DE ZWAARSTE. Een verse FAIL
 *    naast een oude PASS levert FOUT, welke bron de PASS ook draagt.
 *
 * 4. SPREKEN ZE ELKAAR TEGEN, DAN IS DAT ZELF DE BEVINDING. Zegt het
 *    logboek PASS en de bucket FAIL (of andersom), dan is er iets stuk
 *    in de registratie of in de opslag, en dan is de herstelbaarheid
 *    niet vastgesteld. Zo'n geval wordt FOUT en noemt BEIDE bronnen —
 *    nooit stil de gunstigste kiezen.
 */
export function restoreAanvaardbaar(inv: {
  readonly takenlogboek: Bewijsbron;
  readonly bucket: Bewijsbron;
  readonly drempelDagen: number;
}): RestoreOordeel {
  const t = beoordeelBron(inv.takenlogboek, inv.drempelDagen);
  const b = beoordeelBron(inv.bucket, inv.drempelDagen);

  const beideSpreken = inv.takenlogboek.uitslag !== null && inv.bucket.uitslag !== null;
  const tegenstrijdig = beideSpreken && inv.takenlogboek.uitslag !== inv.bucket.uitslag;

  if (tegenstrijdig) {
    return {
      niveau: "FOUT",
      grond:
        `de twee bewijsbronnen spreken elkaar tegen — ${inv.takenlogboek.bron}: ` +
        `${inv.takenlogboek.uitslag}, ${inv.bucket.bron}: ${inv.bucket.uitslag}. ` +
        `Zolang dat zo is, is herstelbaarheid niet vastgesteld.`,
      bronnen: [inv.takenlogboek.bron, inv.bucket.bron],
      tegenstrijdig: true,
    };
  }

  /* Niets gehoord van beide: één keer NIET GEMETEN, met beide namen
     erbij zodat te zien is WAAR niet gekeken kon worden. */
  if (!beideSpreken && inv.takenlogboek.uitslag === null && inv.bucket.uitslag === null) {
    return {
      niveau: "NIET GEMETEN",
      grond: "geen restorebewijs in het takenlogboek en geen leesbaar bewijs in de bucket",
      bronnen: [inv.takenlogboek.bron, inv.bucket.bron],
      tegenstrijdig: false,
    };
  }

  /* Eén bron spreekt: die bepaalt het oordeel. Spreken ze beide
     hetzelfde, dan wint de zwaarste — dat kan verschillen door
     LEEFTIJD, ook als de uitslag gelijk is. */
  if (inv.takenlogboek.uitslag === null) {
    return { niveau: b.niveau, grond: b.grond, bronnen: [inv.bucket.bron], tegenstrijdig: false };
  }
  if (inv.bucket.uitslag === null) {
    return { niveau: t.niveau, grond: t.grond, bronnen: [inv.takenlogboek.bron], tegenstrijdig: false };
  }
  const zwaarste = ZWAARTE[t.niveau] >= ZWAARTE[b.niveau] ? t : b;
  return {
    niveau: zwaarste.niveau,
    grond: zwaarste.grond,
    bronnen: [inv.takenlogboek.bron, inv.bucket.bron],
    tegenstrijdig: false,
  };
}
