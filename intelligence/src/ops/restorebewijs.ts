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

import { createHash } from "node:crypto";

import type pg from "pg";

import { eenRij, rijen } from "../kern/db.ts";
import { downloadUitGcs, lijstGcs, type GcsConfig } from "./gcsopslag.ts";
/* Type-only, dus na compilatie verdwijnt deze regel. gezondheid.ts
   importeert dit bestand WEL op runtime; zou de import hier ook echt
   zijn, dan was het een kringverwijzing. */
import type { Niveau } from "./gezondheid.ts";

/** De soort waaronder restorebewijs in intel.taken staat. */
export const RESTORETEST_TAAK_SOORT = "restoretest";

/**
 * De soort van de GEPLANDE wekelijkse ronde. Een ANDERE soort dan het
 * bewijs, en dat is geen smaakkwestie.
 *
 * `leesRestorebewijsUitTaken()` beeldt `status === 'gereed'` af op PASS
 * en al het andere op FAIL. Zou de geplande wachtrijtaak dezelfde soort
 * `restoretest` krijgen, dan zou de rij die de planner op zondag 03:00
 * aanmaakt — status 'wachtend', nog geen payload met een uitslag — als
 * de NIEUWSTE poging gelezen worden en dus als FAIL. Het signaal zou
 * dan elke zondagochtend omvallen tussen plannen en uitvoeren, zonder
 * dat er iets mis is.
 *
 * Twee soorten, twee rollen:
 *
 *   restoretestronde  de WACHTRIJtaak: wachtend -> bezig -> gereed of
 *                     mislukt, met leases, pogingen en een handler
 *   restoretest       het LOGBOEK: append-only, altijd gereed of
 *                     mislukt, nooit wachtend, met het bewijs in de
 *                     payload
 */
export const RESTORETESTRONDE_TAAK_SOORT = "restoretestronde";

/**
 * De sleutel van het advisory lock dat overlappende restoretests
 * verhindert.
 *
 * WAAROM EEN SLOT EN NIET ALLEEN DE WACHTRIJ. De wachtrij voorkomt dat
 * twee workers DEZELFDE rij pakken (`for update skip locked`), en de
 * idempotentiesleutel voorkomt dat er twee rijen voor dezelfde week
 * komen. Wat géén van beide voorkomt: een lease die verloopt terwijl de
 * restore nog loopt. De opruimer geeft de taak dan terug aan de
 * wachtrij, een worker pakt hem opnieuw, en dan draaien er TWEE
 * restores naast elkaar — beide met hun eigen wegwerpdatabase op de
 * productieserver.
 *
 * Een advisory lock is sessiegebonden en kost niets. Dit is het eerste
 * in deze codebase; vandaar de uitleg.
 *
 * Het getal is willekeurig maar moet STABIEL zijn: twee processen die
 * hetzelfde slot bedoelen, moeten hetzelfde getal gebruiken. Het is
 * daarom een constante en geen hash van een string die iemand later
 * anders spelt.
 */
export const RESTORETEST_SLOT_SLEUTEL = 20261014;

/**
 * Draait `werk` met het restoretestslot in de hand, of slaat het over.
 *
 * Geeft `{ gedraaid: false }` als het slot al door iemand anders
 * gehouden wordt. Dat is GEEN fout: het betekent dat er al een
 * restoretest loopt, en dan is overslaan precies goed.
 *
 * HET SLOT MOET IN DE FINALLY LOS. Een advisory lock hangt aan de
 * SESSIE, en een sessie uit een pool wordt hergebruikt in plaats van
 * gesloten. Zou het slot niet expliciet vrijgegeven worden, dan bleef
 * het hangen aan een verbinding die later ander werk doet — en dan
 * draait er nooit meer een restoretest tot de service herstart.
 */
/**
 * Neemt het slot. `false` betekent: iemand anders heeft het.
 *
 * Primitieve, zodat `cli/restoretest.ts` hem kan gebruiken zonder zijn
 * hele try/catch/finally in een callback te hoeven duwen. Die CLI had
 * eerst zijn eigen inline `pg_try_advisory_lock`, en dan bestaan er twee
 * implementaties van één regel — met één sleutel die op twee plekken
 * goed moet staan.
 */
export async function neemRestoretestSlot(c: Pick<pg.PoolClient, "query">): Promise<boolean> {
  const r = await c.query<{ gepakt: boolean }>("select pg_try_advisory_lock($1) as gepakt", [
    RESTORETEST_SLOT_SLEUTEL,
  ]);
  return r.rows[0]?.gepakt === true;
}

/** Geeft het slot terug. Faalt nooit hard: de sessie kan al weg zijn. */
export async function geefRestoretestSlotTerug(c: Pick<pg.PoolClient, "query">): Promise<void> {
  await c.query("select pg_advisory_unlock($1)", [RESTORETEST_SLOT_SLEUTEL]).catch(() => undefined);
}

export async function metRestoretestSlot<T>(
  c: Pick<pg.PoolClient, "query">,
  werk: () => Promise<T>,
): Promise<{ readonly gedraaid: true; readonly uitkomst: T } | { readonly gedraaid: false }> {
  if (!(await neemRestoretestSlot(c))) return { gedraaid: false };
  try {
    return { gedraaid: true, uitkomst: await werk() };
  } finally {
    await geefRestoretestSlotTerug(c);
  }
}

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

/* ------------------------------------------------------------------
   ONVERANDERBARE BEWIJSOBJECTEN IN DE BUCKET
   ------------------------------------------------------------------
   WAAROM DIT ER IS — gemeten op 14 oktober 2026, 03:26 UTC, tijdens de
   eerste productie-restoretest met registratie.

   De upload van het bewijs werd GEWEIGERD:

     HTTP 403 — intel-backup-schrijver@... does not have
     storage.objects.delete access to the Google Cloud Storage object

   Overschrijven is in GCS intern delete + create, en de dienstaccount
   heeft bewust alleen objectCreator + objectViewer. Google bevestigde
   dat zelf via testIamPermissions: toegekend zijn `storage.objects.
   create`, `storage.objects.get` en `storage.objects.list` — en
   `storage.objects.delete` NIET.

   Gevolg: `restoretest/laatste.json` is sinds zijn eerste schrijfactie
   (13 oktober 13:28 UTC, 483 bytes) BEVROREN. Het pad werkte precies
   één keer en leek daarna te werken, want de code print een
   waarschuwing en gaat door. Een vast objectpad in een bucket zonder
   delete-recht is dus een stille staleness-bug.

   Het ontbrekende delete-recht is GEEN misconfiguratie maar een
   gewenste eigenschap, en het wordt hier niet aangevraagd. In plaats
   daarvan schrijft elke run naar een EIGEN naam, en wel met
   `ifGenerationMatch=0` zodat onveranderbaarheid uit de aanroep volgt
   en niet uit een IAM-besluit dat morgen anders kan zijn.
   ------------------------------------------------------------------ */

/** Het voorvoegsel waaronder al het restorebewijs in de bucket staat. */
export const RESTOREBEWIJS_VOORVOEGSEL = "restoretest/";

/**
 * De naam van het bewijsobject van één run.
 *
 * Vorm: `restoretest/2026-10-14T03-26-00Z-a1b2c3d4.json`
 *
 * De TIJD staat vooraan en in een vorm die lexicografisch én
 * chronologisch sorteert; de RUN-IDENTIFIER erachter is de eerste acht
 * hex van sha256(op + dump + uitslag). Die keuze doet twee dingen:
 *
 *   · twee runs in dezelfde seconde botsen niet, want hun dump of
 *     uitslag verschilt — en verschilt die niet, dan zijn het dezelfde
 *     feiten en is één object genoeg;
 *   · een HERHAALDE poging van dezelfde run levert dezelfde naam op.
 *     Samen met `ifGenerationMatch=0` geeft dat 412 in plaats van een
 *     tweede object, en 412 betekent precies "al vastgelegd".
 *
 * De dubbelepunten uit het ISO-tijdstip gaan eruit. Ze zijn in een
 * objectnaam toegestaan maar moeten in elke URL ge-escaped worden, en
 * een naam die je niet kunt plakken is een naam die iemand verkeerd
 * plakt.
 */
export function bewijsObjectnaam(
  b: Pick<RestoretestBewijs, "op" | "uitslag" | "dump_object">,
): string {
  const stempel = b.op.replace(/\.\d+Z$/, "Z").replace(/:/g, "-");
  const runId = createHash("sha256")
    .update(`${b.op}|${b.dump_object}|${b.uitslag}`)
    .digest("hex")
    .slice(0, 8);
  return `${RESTOREBEWIJS_VOORVOEGSEL}${stempel}-${runId}.json`;
}

/** Eén gevonden bewijsobject, al herleid tot het wezenlijke. */
export type BucketBewijs = {
  readonly objectnaam: string;
  /** Het tijdstip UIT HET BEWIJS, of bij gebrek daaraan de objectdatum van GCS. */
  readonly op: string;
  /** Of `op` uit het bewijs zelf komt. Bij `false` is de objectdatum gebruikt. */
  readonly opUitBewijs: boolean;
  readonly bewijs: Partial<RestoretestBewijs>;
};

export type BucketInventaris = {
  /** Het NIEUWSTE bewijs, wat de uitslag ook is. Null als er niets leesbaar is. */
  readonly nieuwste: BucketBewijs | null;
  /** Hoeveel objecten er onder het voorvoegsel staan. */
  readonly gevonden: number;

  /* ---- DRIE SOORTEN 'NIET GELUKT', MET DRIE VERSCHILLENDE ERNSTEN ----

     Hier stond één lijst `onleesbaar`, en de lezer in gezondheid.ts
     maakte van elke niet-lege lijst een FOUT. Dat is twee keer mis, en
     beide keren op een manier die het defect herhaalt waar deze release
     over gaat:

       · een ONBEREIKBARE bucket kwam in die lijst, dus een GCS-hik van
         dertig seconden zette het back-updomein op CRITICAL — een
         bevinding over de meetPLAATS, niet over de back-up. En dat
         terwijl restoreAanvaardbaar() regel 2 juist zegt dat een stille
         bron niet tegenstemt; die regel bleef groen terwijl het
         eindoordeel langs een ánder signaal alsnog CRITICAL werd;

       · de melding "N oudere objecten niet opgehaald" kwam er ook in.
         Dat is geen fout maar een BEGRENZING, en er komt elke week een
         object bij. Bij het vierde object zou het signaal omslaan en
         nooit meer terugkomen, want er wordt niets verwijderd.

     Vandaar drie velden. Wie ze samenvoegt, voert beide bugs terug. */

  /** De bucket kon niet worden opgesomd. GEEN fout: de bron zegt niets. */
  readonly nietOpgesomd: string | null;
  /** Objecten die bestaan maar bedorven of onophaalbaar zijn. WEL een fout. */
  readonly bedorven: readonly string[];
  /** Hoeveel oudere objecten niet zijn opgehaald. Alleen een vermelding. */
  readonly afgekapt: number;
};

/**
 * Inventariseert het restorebewijs in de bucket en bepaalt de NIEUWSTE
 * uitkomst.
 *
 * NIEUWSTE, NIET BESTE. Dat is de hele reden dat deze functie bestaat
 * en niet simpelweg één vast object leest: een oudere PASS mag nooit
 * een nieuwere FAIL maskeren. Er wordt dus gesorteerd op TIJD en nooit
 * op uitslag, en de gekozen regel is de laatste in de tijd — ook als
 * dat slecht nieuws is.
 *
 * WELKE TIJD. Eerst het `op` uit het bewijs zelf: dat is het moment
 * waarop de proef afrondde en het is wat de leeftijd bepaalt. Ontbreekt
 * het of is het onleesbaar, dan de `gemaaktOp` die GCS zelf bijhoudt —
 * die kan niet door een client gezet worden en is daarmee de
 * betrouwbaarste terugval. Dat `opUitBewijs` erbij staat is geen detail:
 * een lezer moet kunnen zien welke van de twee gebruikt is.
 *
 * `laatste.json` uit de oude opzet komt hier als gewone kandidaat
 * voorbij. Hij wordt NIET verwijderd — daar is geen recht voor en ook
 * geen toestemming — en hij mag niet winnen op zijn naam. Vandaar de
 * sortering op tijd: lexicografisch zou 'laatste.json' ná elke
 * '2026-...' komen en dus altijd winnen.
 *
 * `maxKandidaten` begrenst het aantal downloads. De lijst is gesorteerd
 * op objectdatum, dus de nieuwste staan vooraan; meer dan een handvol
 * ophalen zou elke gezondheidsmeting duurder maken zonder iets toe te
 * voegen. Wordt er afgekapt, dan staat dat in `onleesbaar` — een
 * begrenzing die je niet meldt, leest als volledigheid.
 */
export async function inventariseerBucketBewijs(
  gcs: GcsConfig,
  opties: {
    readonly maxKandidaten?: number;
    /**
     * De twee GCS-aanroepen, injecteerbaar.
     *
     * NIET om het echte pad te omzeilen maar om het te kunnen TOETSEN.
     * De gevallen die hier het meest misgaan — een HTTP 403 op één
     * object, een netwerkstoring op de lijst, bedorven JSON, een oudere
     * PASS naast een nieuwere FAIL — zijn per definitie niet met een
     * echte bucket op te roepen zonder die bucket te beschadigen. En de
     * productieaanroep blijft onveranderd: zonder deze velden draait
     * exact dezelfde code als voorheen.
     */
    readonly lijst?: typeof lijstGcs;
    readonly haal?: typeof downloadUitGcs;
  } = {},
): Promise<BucketInventaris> {
  /* DRIE, NIET VIJF. Elke download mint een eigen GCS-token
     (ops/gcsopslag.ts heeft geen tokencache), en dit loopt in de
     UURLIJKSE gezondheidsmeting. Drie is genoeg dat één bedorven object
     de monitor niet blind maakt, en houdt de meting op vier
     tokenaanvragen in plaats van zes. */
  const max = opties.maxKandidaten ?? 3;
  const lijst = opties.lijst ?? lijstGcs;
  const haal = opties.haal ?? downloadUitGcs;
  const bedorven: string[] = [];

  let objecten;
  try {
    objecten = await lijst(gcs, RESTOREBEWIJS_VOORVOEGSEL);
  } catch (e) {
    /* Een onbereikbare bucket is GEEN bewijs van een mislukte restore.
       De bron zegt dan niets, en restoreAanvaardbaar() rekent een
       stille bron niet tegen — zie daar regel 2. */
    return {
      nieuwste: null,
      gevonden: 0,
      nietOpgesomd: `de bucket kon niet worden opgesomd: ${(e as Error).message.slice(0, 200)}`,
      bedorven: [],
      afgekapt: 0,
    };
  }

  /* Alleen .json; de map kan in de toekomst ook ander bewijs dragen. */
  const kandidaten = objecten
    .filter((o) => o.naam.endsWith(".json"))
    .sort((a, b) => (a.gemaaktOp < b.gemaaktOp ? 1 : a.gemaaktOp > b.gemaaktOp ? -1 : 0));

  const afgekapt = Math.max(0, kandidaten.length - max);

  let nieuwste: BucketBewijs | null = null;
  for (const o of kandidaten.slice(0, max)) {
    let ruw: string;
    try {
      ruw = (await haal(gcs, o.naam)).toString("utf8");
    } catch (e) {
      bedorven.push(`${o.naam}: niet op te halen (${(e as Error).message.slice(0, 120)})`);
      continue;
    }
    let bewijs: Partial<RestoretestBewijs>;
    try {
      bewijs = JSON.parse(ruw) as Partial<RestoretestBewijs>;
    } catch {
      /* Bedorven bewijs is geen bewijs, en ook geen stille afwezigheid:
         er is iets mis met de opslag en dat hoort iemand te zien. */
      bedorven.push(`${o.naam}: geen geldige JSON`);
      continue;
    }

    const uitBewijs =
      typeof bewijs.op === "string" && !Number.isNaN(new Date(bewijs.op).getTime());
    const kandidaat: BucketBewijs = {
      objectnaam: o.naam,
      op: uitBewijs ? (bewijs.op as string) : o.gemaaktOp,
      opUitBewijs: uitBewijs,
      bewijs,
    };
    if (nieuwste === null || new Date(kandidaat.op).getTime() > new Date(nieuwste.op).getTime()) {
      nieuwste = kandidaat;
    }
  }

  return { nieuwste, gevonden: kandidaten.length, nietOpgesomd: null, bedorven, afgekapt };
}

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
   IDEMPOTENTIE VAN DE DAGELIJKSE BACK-UP
   ------------------------------------------------------------------
   HET MECHANISME, UIT DE CODE AFGELEID.

   `pakTaak()` zet een taak op 'bezig' met een lease van 300 seconden.
   Verloopt die terwijl de taak nog loopt, dan zet `geefVerlopenTerug()`
   hem terug op 'wachtend' — maar die functie draait op precies één
   plek: bij het OPSTARTEN van een worker (cli/worker.ts, "Eerst
   opruimen"). Een herstart tijdens een lopende back-up legt de taak dus
   terug, een worker pakt hem opnieuw, en de handler maakt een TWEEDE
   dump. De naam hangt aan de tijd (`vibe-intel-<stempel>.dump`), dus
   dat is een tweede object in de bucket en niet een overschrijving.

   WAT ER GEMETEN IS. Op 14 oktober 2026 stonden er exact drie
   back-uptaken, één per dag, alle met `pogingen = 1`. De wachtrij heeft
   dit dus NOOIT gedaan. Er staat wel een dump van 03:48 in de bucket
   die bij geen enkele taak hoort; die is met de beschikbare gegevens
   niet toe te schrijven. Het mechanisme is echt, de gebeurtenis is niet
   aangetoond.

   WAT DEZE FUNCTIE DOET, EN WAT ZE MET OPZET NIET DOET.

   Ze beantwoordt één vraag: ligt er voor deze periode al een dump MET
   zijn manifest ernaast? Dat onderscheid is de hele reden dat dit niet
   "bestaat er een bestand van vandaag" is:

     dump + manifest    de back-up van vandaag is af      -> overslaan
     dump zonder manifest  een eerdere poging is halverwege
                           afgebroken; wat er ligt is geen
                           back-up                        -> OPNIEUW DOEN
     geen dump          nog niets gedaan                  -> doen

   Daarmee blokkeert de idempotentie geen noodzakelijke herstelpoging,
   en dat was de expliciete eis. Alle zes de faalwijzen die de
   back-uphandler kan opleveren laten of géén object achter (mislukte
   pg_dump, nul bytes, lege inhoudsopgave, geen bestemming) of een dump
   zónder manifest (mislukte manifestupload, afwijkende sha). Geen enkele
   daarvan ziet eruit als een geldig paar.

   WAT ER NIET WORDT GECONTROLEERD, EN DAT HOORT ER BIJ TE STAAN. Deze
   functie kijkt naar AANWEZIGHEID, niet naar inhoud: ze rekent de
   sha256 van de dump niet na tegen het manifest. Dat zou een download
   van ongeveer een megabyte per dag kosten voor een vraag die de
   restoretest elke week al stelt, en `uploadNaarGcs()` verifieert elk
   object bovendien bij het schrijven door het terug te halen. Het
   resterende gat is dus smal maar echt: een manifest dat hoort bij
   ANDERE bytes dan de dump ernaast zou hier als geldig paar lezen. De
   wekelijkse restoretest vangt dat, want die vergelijkt de som wél.

   KALENDERDAG, EN NIET "DE LAATSTE 24 UUR". Met een 24-uursvenster zou
   een run om 00:05 worden overgeslagen omdat de dump van gisteren 23,9
   uur oud is, en dan is de volgende kans pas de dag erna — een gat van
   bijna 48 uur, waarmee de RPO-drempel van 26 uur wordt overschreden.
   ------------------------------------------------------------------ */

export type Backupstand = {
  readonly alAf: boolean;
  readonly grond: string;
  /** De namen van dumps van deze periode zonder manifest; die zijn onbruikbaar. */
  readonly halfAfgebroken: readonly string[];
};

/**
 * Ligt er voor `periode` (een datum als `2026-10-14`) al een bruikbare
 * back-up in de bucket?
 *
 * `objecten` is de lijst uit `lijstGcs(gcs, "vibe-intel-")`. Pure
 * functie met opzet: de regel die beslist of een back-up wordt
 * OVERGESLAGEN is te belangrijk om alleen via een bucket te kunnen
 * toetsen.
 */
export function backupStandVoorPeriode(
  objecten: readonly { readonly naam: string }[],
  periode: string,
): Backupstand {
  const voorvoegsel = `vibe-intel-${periode}`;
  const namen = new Set(objecten.map((o) => o.naam));
  const dumps = objecten
    .map((o) => o.naam)
    .filter((n) => n.startsWith(voorvoegsel) && n.endsWith(".dump"));

  if (dumps.length === 0) {
    return { alAf: false, grond: `geen dump voor ${periode} in de bucket`, halfAfgebroken: [] };
  }

  const metManifest = dumps.filter((n) => namen.has(`${n}.manifest.json`));
  const zonder = dumps.filter((n) => !namen.has(`${n}.manifest.json`));

  if (metManifest.length === 0) {
    return {
      alAf: false,
      grond:
        `er ligt ${zonder.length} dump voor ${periode} ZONDER manifest; dat is geen bruikbare ` +
        `back-up, dus deze poging is een noodzakelijke herstelpoging`,
      halfAfgebroken: zonder,
    };
  }

  return {
    alAf: true,
    grond:
      `${metManifest[0]} ligt met zijn manifest in de bucket; de back-up van ${periode} is af` +
      (zonder.length ? ` (en ${zonder.length} half afgebroken dump(s) ernaast)` : ""),
    halfAfgebroken: zonder,
  };
}

/* ------------------------------------------------------------------
   DE PLANNING ZELF BEWAKEN
   ------------------------------------------------------------------
   WAAROM DIT APART VAN HET RESTOREBEWIJS STAAT.

   Het signaal `backup/restoretest` kijkt naar BEWIJS en reageert op een
   drempel van 30 dagen. Dat is de juiste drempel voor bewijs — vier
   weken geeft vier kansen — maar het is de verkeerde drempel voor de
   PLANNING. Valt de wekelijkse ronde stil, dan is dat vier weken
   onzichtbaar, en dat is precies de blinde vlek die een monitor niet
   mag hebben.

   Dit signaal kijkt daarom naar de UITVOERING: is de ronde van deze
   week verschuldigd, loopt hij, is hij gemist, of is hij mislukt. Een
   gemiste zondag is daarmee zichtbaar vanaf diezelfde zondagochtend.
   ------------------------------------------------------------------ */

/**
 * De eerste zondag waarop de wekelijkse ronde verschuldigd is.
 *
 * Zonder deze grens zou elke zondag in de geschiedenis als GEMIST
 * lezen: de planregel bestaat pas sinds release 3.0.8 (14 oktober
 * 2026), en de eerste zondag daarna is 18 oktober. Een monitor die
 * klaagt over een afspraak die nog niet bestond, is een monitor die
 * niemand vertrouwt.
 */
export const RESTORETESTRONDE_VANAF = "2026-10-18";

/**
 * Hoeveel uur na het verschuldigde moment een ronde nog mag ontbreken.
 *
 * De planner draait op cron `0 * * * *`, dus hij is er binnen het uur;
 * de worker pakt de taak binnen zijn ronde. Zes uur is ruim genoeg voor
 * een trage deploy of een herstart, en nog steeds dezelfde dag — een
 * gemiste zondag valt dus op zondagochtend op en niet op maandag.
 */
export const RESTORETESTRONDE_MARGE_UREN = 6;

export type Planningstoestand =
  /** De ronde van deze week is nog niet aan de orde, of valt nog binnen de marge. */
  | "NOG_NIET_VERSCHULDIGD"
  /** Er staat een ronde in de wachtrij of hij is bezig. */
  | "LOOPT"
  /** Het verschuldigde moment is voorbij en er is geen ronde. */
  | "GEMIST"
  /** De laatste ronde is mislukt of in de dlq beland. */
  | "MISLUKT"
  /** De ronde van deze week is geslaagd afgerond. */
  | "GEREED";

/**
 * Het laatste moment waarop de wekelijkse ronde verschuldigd werd, of
 * null als dat vóór `vanaf` ligt.
 *
 * Pure functie met een expliciete `nu`: of 'de zondag van deze week is
 * al geweest' klopt, hoort toetsbaar te zijn zonder de klok te zetten.
 */
export function laatsteVerschuldigdMoment(
  nu: Date,
  regel: { readonly weekdagUtc: number; readonly vanafUurUtc: number },
  vanaf: string = RESTORETESTRONDE_VANAF,
): Date | null {
  /* Terugrekenen naar de meest recente weekdag op of vóór nu. */
  const d = new Date(
    Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), nu.getUTCDate(), regel.vanafUurUtc, 0, 0, 0),
  );
  const dagenTerug = (d.getUTCDay() - regel.weekdagUtc + 7) % 7;
  d.setUTCDate(d.getUTCDate() - dagenTerug);
  /* Is dat moment vandaag maar nog niet geweest, dan is de vorige week
     het laatste verschuldigde moment. */
  if (d.getTime() > nu.getTime()) d.setUTCDate(d.getUTCDate() - 7);

  const grens = new Date(`${vanaf}T00:00:00Z`);
  return d.getTime() < grens.getTime() ? null : d;
}

export type Planningsoordeel = {
  readonly toestand: Planningstoestand;
  readonly grond: string;
  /** Het venster van de ronde die hierbij hoort, als die bestaat. */
  readonly venster: string | null;
};

/**
 * Beoordeelt de staat van de wekelijkse restoretestplanning.
 *
 * `laatsteRonde` is de nieuwste rij met soort `restoretestronde`, welke
 * status die ook heeft — niet de nieuwste GESLAAGDE. Dat onderscheid is
 * het hele punt: zou deze functie op status filteren, dan zou een
 * mislukte ronde van vannacht onvindbaar zijn achter een geslaagde van
 * vorige week, en dan meldt de monitor GEREED terwijl de proef faalde.
 */
export function beoordeelPlanning(inv: {
  readonly nu: Date;
  readonly regel: { readonly weekdagUtc: number; readonly vanafUurUtc: number };
  readonly laatsteRonde: {
    readonly status: string;
    readonly venster: string | null;
    readonly aangemaaktOp: string | null;
  } | null;
  readonly margeUren?: number;
  readonly vanaf?: string;
}): Planningsoordeel {
  const marge = inv.margeUren ?? RESTORETESTRONDE_MARGE_UREN;
  const verschuldigd = laatsteVerschuldigdMoment(inv.nu, inv.regel, inv.vanaf);
  const r = inv.laatsteRonde;

  /* Een ronde die LOOPT gaat voor alles: dan is er niets gemist en
     niets mislukt, er is iets aan de gang. */
  if (r && (r.status === "wachtend" || r.status === "bezig")) {
    return {
      toestand: "LOOPT",
      grond: `er staat een ronde ${r.status === "bezig" ? "in uitvoering" : "in de wachtrij"}${r.venster ? ` (venster ${r.venster})` : ""}`,
      venster: r.venster,
    };
  }

  if (verschuldigd === null) {
    return {
      toestand: "NOG_NIET_VERSCHULDIGD",
      grond: `de eerste wekelijkse ronde is verschuldigd op ${inv.vanaf ?? RESTORETESTRONDE_VANAF} 0${inv.regel.vanafUurUtc}:00 UTC`,
      venster: null,
    };
  }

  const verschuldigdDatum = verschuldigd.toISOString().slice(0, 10);
  const urenSindsVerschuldigd = (inv.nu.getTime() - verschuldigd.getTime()) / 3_600_000;

  /* Een mislukte of in de dlq gelande ronde van DIT venster is het
     ergste wat deze functie kan vaststellen, en gaat dus voor de
     gemist-vraag. */
  if (r && (r.status === "mislukt" || r.status === "dlq") && (r.venster ?? "") >= verschuldigdDatum) {
    return {
      toestand: "MISLUKT",
      grond: `de ronde van ${r.venster} is ${r.status === "dlq" ? "definitief mislukt (dlq)" : "mislukt"}`,
      venster: r.venster,
    };
  }

  if (r && r.status === "gereed" && (r.venster ?? "") >= verschuldigdDatum) {
    return {
      toestand: "GEREED",
      grond: `de ronde van ${r.venster} is geslaagd afgerond`,
      venster: r.venster,
    };
  }

  /* Binnen de marge is er nog niets mis: de planner draait op het uur
     en de worker pakt de taak in zijn ronde. */
  if (urenSindsVerschuldigd <= marge) {
    return {
      toestand: "NOG_NIET_VERSCHULDIGD",
      grond:
        `de ronde van ${verschuldigdDatum} is ${urenSindsVerschuldigd.toFixed(1)} uur geleden verschuldigd ` +
        `en valt nog binnen de marge van ${marge} uur`,
      venster: null,
    };
  }

  return {
    toestand: "GEMIST",
    grond:
      `er is geen ronde voor ${verschuldigdDatum}; het verschuldigde moment is ` +
      `${urenSindsVerschuldigd.toFixed(1)} uur geleden` +
      (r ? `. De laatste ronde is '${r.status}'${r.venster ? ` van ${r.venster}` : ""}` : " en er heeft nooit een ronde gedraaid"),
    venster: null,
  };
}

/** Leest de NIEUWSTE ronde uit het takenlogboek, welke status die ook heeft. */
export async function leesLaatsteRonde(
  c: pg.PoolClient,
  organisatieId: number,
): Promise<{ status: string; venster: string | null; aangemaaktOp: string | null } | null> {
  const r = await rijen<{ status: string; venster: string | null; aangemaakt: string | null }>(
    c,
    `select status,
            payload->>'venster'                                            as venster,
            to_char(aangemaakt_op at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as aangemaakt
       from intel.taken
      where organisatie_id = $1 and soort = $2
      order by aangemaakt_op desc, id desc
      limit 1`,
    [organisatieId, RESTORETESTRONDE_TAAK_SOORT],
  );
  const rij = r[0];
  if (!rij) return null;
  return { status: rij.status, venster: rij.venster, aangemaaktOp: rij.aangemaakt };
}

/* ------------------------------------------------------------------
   OPRUIMING VAN ACHTERGEBLEVEN WEGWERPDATABASES
   ------------------------------------------------------------------ */

/**
 * De enige naamvorm die deze code ooit mag droppen.
 *
 * DIT IS DE VEILIGHEID, EN DAAROM STAAT HIJ APART EN GEËXPORTEERD.
 * `cli/restoretest.ts` maakt wegwerpdatabases met de naam
 * `restoretest_<pid>_<hrtime>`. Niets anders in dit platform maakt zo'n
 * naam, en de productiedatabase heet `railway`. Een opruiming die op
 * deze vorm filtert kan dus per constructie geen echte database raken —
 * en een toets rekent dat na op de namen die hier werkelijk voorkomen.
 */
export const WEGWERP_DB_PATROON = /^restoretest_\d+_\d+$/;

/**
 * Dropt achtergebleven wegwerpdatabases en geeft terug welke.
 *
 * WAAROM DIT NODIG IS. `cli/restoretest.ts` dropt zijn eigen
 * wegwerpdatabase in een `finally`, ook als de proef faalt. Maar wordt
 * het PROCES gedood — een timeout, een OOM, een deploy midden in de
 * ronde — dan draait die finally niet en blijft de database staan op de
 * productieserver. De opdracht is expliciet: "Ruim tijdelijke resources
 * ook bij fouten op."
 *
 * WANNEER HET VEILIG IS. Alleen met het restoretestslot in de hand:
 * dan loopt er aantoonbaar geen andere proef en kan deze functie geen
 * database wegtrekken onder een lopende restore. De aanroeper is
 * daarvoor verantwoordelijk; `neemSlotEnRuimOp()` in de CLI doet het zo.
 *
 * `behoud` is de database van de HUIDIGE run, die uiteraard blijft.
 *
 * De vormtoets staat er TWEE keer: in de query en op de waarde die
 * daadwerkelijk in de `drop`-tekst wordt geïnterpoleerd. Een
 * databasenaam kan geen parameter zijn, dus de tweede controle staat op
 * de plek waar het misgaat als de eerste ooit wordt verzwakt.
 */
export async function ruimWegwerpdatabasesOp(
  /* Alleen `query` wordt gebruikt, dus dat is het type. Daarmee neemt
     hij ook een gewone pg.Client — wat een toets nodig heeft, want
     `drop database` vraagt de eigenaarsrol en niet de applicatierol. */
  c: Pick<pg.PoolClient, "query">,
  behoud: string,
): Promise<{ readonly opgeruimd: readonly string[]; readonly mislukt: readonly string[] }> {
  const kandidaten = await rijen<{ datname: string }>(
    c,
    `select datname from pg_database
      where datname ~ '^restoretest_[0-9]+_[0-9]+$' and datname <> $1
      order by datname`,
    [behoud],
  );
  const opgeruimd: string[] = [];
  const mislukt: string[] = [];
  for (const rij of kandidaten) {
    if (!WEGWERP_DB_PATROON.test(rij.datname)) {
      mislukt.push(`${rij.datname}: vorm geweigerd bij de tweede controle`);
      continue;
    }
    try {
      await c.query(`drop database if exists ${rij.datname} with (force)`);
      opgeruimd.push(rij.datname);
    } catch (e) {
      mislukt.push(`${rij.datname}: ${(e as Error).message.slice(0, 160)}`);
    }
  }
  return { opgeruimd, mislukt };
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
