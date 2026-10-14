/* ============================================================
   CLI — restoretest in een geisoleerde database
   ------------------------------------------------------------
     npm run restoretest                 nieuwste back-up terugzetten
     npm run restoretest -- --dump <pad> een specifieke back-up
     npm run restoretest -- --houd       doel laten staan om in te kijken
     npm run restoretest -- --doel-url <beheer-url>
                                         restore naar een WEGWERPDATABASE
                                         op een bestaande server
     npm run restoretest -- --uit-gcs    haal de nieuwste dump UIT DE
                                         bucket en zet DIE terug

   DIT IS HET ENIGE BEWIJS DAT EEN BACK-UP WERKT.
   Een geslaagde `pg_dump` bewijst dat er een bestand is. Een geslaagde
   `pg_restore` bewijst dat het terug te zetten is. Alleen deze test
   bewijst dat de inhoud er daarna ook nog HELEMAAL in zit.

   DE ISOLATIE IS ECHT — IN BEIDE VORMEN
   Standaard gaat de restore naar een verse Postgres in een
   Docker-container op een eigen poort, met een eigen wachtwoord, die
   daarna wordt weggegooid.

   Met `--doel-url` gaat hij naar een NIEUW AANGEMAAKTE database op een
   bestaande server, die daarna wordt gedropt. Die vorm bestaat omdat
   een productiedatabase in een privénetwerk hangt waar geen Docker
   naast staat: een back-up van productie moet ook DAAR terug te zetten
   zijn, niet alleen op een laptop. De isolatie zit dan in de
   wegwerpdatabase, en `grendel()` weigert elke doelnaam die niet vers
   is aangemaakt.

   In beide vormen wordt de brondatabase NIET aangeraakt: er wordt
   niets verwijderd om een restore te kunnen tonen. Dat is een
   expliciete eis en ook gewoon verstandig.

   WAT ER GEVERIFIEERD WORDT, EN WAAROM JUIST DAT
   Niet "de restore gaf geen fout". Wel:

     · het aantal toegepaste migraties komt overeen
     · elke kritieke tabel heeft exact de rijtelling uit het manifest
     · de goedkeuringen zijn er nog MET hun goedkeurder en afdruk
     · het auditspoor is er nog, en de append-only trigger werkt nog
     · RLS staat nog aan op de teruggezette tabellen

   Die laatste twee zijn het punt waar een naieve restore stuk gaat:
   `pg_restore --no-owner` zet data terug maar je wilt weten of de
   BEVEILIGING mee terugkomt, niet alleen de rijen.
   ============================================================ */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import pg from "pg";
import { laadEnvBestand, APP_WORTEL } from "../kern/config.ts";
import { KRITIEKE_TABELLEN, vindPgGereedschap, type BackupManifest } from "../ops/backup.ts";
import { redacteerFout, redigeer, wachtwoordUit } from "../kern/geheimen.ts";
import { draaiPgGereedschap, pgRestoreNaarDatabase } from "../ops/pgomgeving.ts";
import { downloadUitGcs, gcsConfigUitOmgeving, lijstGcs, uploadNaarGcs } from "../ops/gcsopslag.ts";
import { maakPool, metOrganisatie, sluitAllePools, type Pool, type Client as PoolClient } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import {
  bewijsObjectnaam,
  geefRestoretestSlotTerug,
  neemRestoretestSlot,
  registreerRestoretest,
  RESTORETEST_SLOT_SLEUTEL,
  ruimWegwerpdatabasesOp,
  VEREISTE_RESTORETOETSEN,
  type RestoretestBewijs,
} from "../ops/restorebewijs.ts";

const uitvoeren = promisify(execFile);
laadEnvBestand();

const heeft = (n: string) => process.argv.includes(`--${n}`);
const waarde = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const DOELMAP = resolve(waarde("map") ?? join(APP_WORTEL, "backups"));
const CONTAINER = `vibe-intel-restoretest-${process.pid}`;
const POORT = 55433 + (process.pid % 200);
const WACHTWOORD = `rt-${process.pid}-${Math.abs(Date.now() % 100000)}`;
const DB = "restoretest";

/* De beheer-URL voor de `--doel-url`-vorm. Mag ook uit de omgeving
   komen, zodat het wachtwoord niet in een commandoregel (en daarmee in
   een deployment-log) belandt. */
const DOEL_BEHEER_URL = waarde("doel-url") ?? process.env["INTEL_RESTORETEST_DOEL_URL"];
const NAAR_BESTAANDE_SERVER = Boolean(DOEL_BEHEER_URL);
/* Een naam die niet kan botsen met een echte database. */
const WEGWERP_DB = `restoretest_${process.pid}_${process.hrtime.bigint() % 100000n}`;

/**
 * Weigert een doel dat niet aantoonbaar een wegwerpdatabase is.
 *
 * Dit is de enige grendel tussen "een restore testen" en "productie
 * overschrijven". Hij staat er omdat de fout die hij voorkomt niet te
 * herstellen is: pg_restore in de verkeerde database schrijft over de
 * rijen die je juist aan het beschermen was.
 */
function grendel(beheerUrl: string): URL {
  const u = new URL(beheerUrl);
  const bron = u.pathname.replace(/^\//, "");
  if (!bron) throw new Error("de beheer-URL noemt geen database");
  if (bron === WEGWERP_DB) {
    throw new Error("de wegwerpnaam botst met de brondatabase; dit mag nooit");
  }
  if (!/^restoretest_\d+_\d+$/.test(WEGWERP_DB)) {
    throw new Error(`onverwachte wegwerpnaam ${WEGWERP_DB}`);
  }
  return u;
}

let geslaagd = 0;
const mislukt: string[] = [];
function toets(naam: string, ok: boolean, toelichting = "") {
  if (ok) {
    geslaagd += 1;
    console.log(`  PASS  ${naam}${toelichting ? ` — ${toelichting}` : ""}`);
  } else {
    mislukt.push(`${naam}${toelichting ? ` — ${toelichting}` : ""}`);
    console.log(`  FAIL  ${naam}${toelichting ? ` — ${toelichting}` : ""}`);
  }
}

async function wacht(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function containerLeeft(): Promise<boolean> {
  try {
    const { stdout } = await uitvoeren("docker", ["inspect", "-f", "{{.State.Running}}", CONTAINER]);
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

let containerGestart = false;
let wegwerpDbGemaakt = false;
/* Pad van een uit de bucket gehaalde dump; wordt na de test opgeruimd. */
let uitGcsGehaald: string | null = null;

/* ------------------------------------------------------------------
   WAT ER OVER DE PROEF BEKEND IS, BUITEN HET TRY-BLOK.
   Deze vier staan hier omdat het bewijs ook moet worden vastgelegd als
   de proef AFBREEKT. Tot nu toe verdween een mislukte restoretest in een
   console.error en een exitcode: niemand kon later nagaan dat hij was
   gedraaid, laat staan waarom hij faalde. Een monitor die alleen
   geslaagde proeven ziet, meet niet de herstelbaarheid maar het geluk.
   ------------------------------------------------------------------ */
let dumpObject: string | null = null;
let dumpSha256: string | null = null;
let bronserverVersie: string | null = null;
let restoreDuurMs: number | null = null;

/**
 * Het slot was bezet: er loopt al een restoretest.
 *
 * Een eigen type en geen gewone Error, zodat de `catch` onderaan dit
 * geval kan ONDERSCHEIDEN van een echte mislukking. Zonder dat
 * onderscheid zou een overgeslagen run als FAIL in het logboek komen —
 * en dan zou het signaal rood staan omdat er TE VEEL proeven waren.
 */
class SlotBezet extends Error {
  constructor() {
    super("het restoretestslot is in gebruik");
    this.name = "SlotBezet";
  }
}

/* De verbinding die het slot houdt. Blijft open tot de finally. */
let slotPool: Pool | null = null;
let slotClient: PoolClient | null = null;

/**
 * Neemt het restoretestslot en ruimt achtergebleven wegwerpdatabases op.
 *
 * WAAROM HET SLOT IN DE CLI ZIT EN NIET IN DE WORKER-HANDLER.
 * `LEASE_SECONDEN` is 300. Duurt een restore langer dan vijf minuten —
 * en dat is bij een groeiende database een kwestie van tijd — dan loopt
 * de lease af, geeft `geefVerlopenTerug()` de taak terug aan de
 * wachtrij en pakt een worker hem opnieuw. Dan draaien er TWEE restores
 * naast elkaar, elk met een eigen wegwerpdatabase op de
 * productieserver. Zat het slot alleen in de handler, dan zou een
 * HANDMATIGE run daar bovendien buiten vallen. Hier dekt het beide.
 *
 * DE OPRUIMING STAAT HIER OM TWEE REDENEN. Ten eerste: wordt dit proces
 * GEDOOD (timeout, OOM, deploy), dan draait de finally niet en blijft de
 * wegwerpdatabase staan. De volgende run ruimt hem dan op. Ten tweede:
 * dit is het enige moment waarop we ZEKER weten dat er geen andere
 * restoretest loopt, want we houden het slot.
 *
 * DE NAAMVORM IS DE VEILIGHEID. Er wordt uitsluitend gedropt wat matcht
 * op `^restoretest_\\d+_\\d+$`. Die vorm kan de productiedatabase niet
 * treffen — die heet `railway` — en kan ook geen enkele andere database
 * in dit cluster treffen, want alleen dit bestand maakt namen van die
 * vorm. De eigen wegwerpdatabase van DEZE run wordt overgeslagen.
 */
async function neemSlotEnRuimOp(): Promise<{ gepakt: boolean; opgeruimd: readonly string[] }> {
  if (!process.env["INTEL_DB_URL"]) {
    console.log("  slot          overgeslagen: geen INTEL_DB_URL, dus geen gedeeld slot mogelijk");
    return { gepakt: true, opgeruimd: [] };
  }
  slotPool = maakPool({ max: 1 });
  slotClient = await slotPool.connect();
  /* Eén implementatie van het slot, in ops/restorebewijs.ts. Hier stond
     een eigen `pg_try_advisory_lock` met de sleutel erbij, en dan moet
     hetzelfde getal op twee plekken goed staan. */
  if (!(await neemRestoretestSlot(slotClient))) return { gepakt: false, opgeruimd: [] };
  console.log(`  slot          genomen (${RESTORETEST_SLOT_SLEUTEL}); geen tweede proef kan nu starten`);

  /* Alleen zinvol bij de --doel-url-vorm: in de Docker-vorm staat de
     wegwerpdatabase in een container die met --rm verdwijnt. */
  if (!NAAR_BESTAANDE_SERVER) return { gepakt: true, opgeruimd: [] };

  /* DE OPRUIMING GAAT OVER DE BEHEERVERBINDING, NIET OVER DE SLOTPOOL.
     Gemeten: op de slotpool faalde hij met

       LET OP: restoretest_777_777: must be owner of database ...

     en dat is logisch. `maakPool()` neemt de applicatierol aan (GUC
     `role` in de startupopties, kern/db.ts), en die rol bezit niets —
     dat is het hele punt van die rol. `drop database` vraagt de
     eigenaar. In productie zou dit óók gefaald zijn, ook al is
     INTEL_DB_URL daar de superuser: de SET ROLE geeft dat recht weg.

     De beheer-URL is per definitie de juiste verbinding: daarmee is een
     paar regels verderop ook de wegwerpdatabase AANGEMAAKT. Een eigen,
     kortlevende client, want hij hoeft de run niet te overleven — het
     SLOT wel, en dat blijft op de slotpool.

     De melding was wel luid, en dat is precies waarom dit gevonden is
     in plaats van jaren stil mislukt. */
  const beheerClient = new pg.Client({ connectionString: DOEL_BEHEER_URL });
  await beheerClient.connect();
  try {
    /* De opruiming zelf staat in ops/restorebewijs.ts, zodat een toets de
       ECHTE code gebruikt in plaats van een nagebouwde query — en zodat de
       naamvorm die de veiligheid draagt op één plek staat. */
    const { opgeruimd, mislukt: nietGelukt } = await ruimWegwerpdatabasesOp(beheerClient, WEGWERP_DB);
    if (opgeruimd.length) {
      console.log(
        `  opgeruimd     ${opgeruimd.length} achtergebleven wegwerpdatabase(s): ${opgeruimd.join(", ")}`,
      );
    } else {
      console.log("  opgeruimd     geen achtergebleven wegwerpdatabases");
    }
    for (const m of nietGelukt) console.error(`  LET OP: ${m}`);
    return { gepakt: true, opgeruimd };
  } finally {
    await beheerClient.end().catch(() => undefined);
  }
}

/**
 * Legt het bewijs van DEZE proef vast op alle drie de bestemmingen:
 * de bucket (duurzaam), het lokale merkbestand (terugval) en
 * intel.taken (gedeeld, en daarmee de enige die op ELKE service
 * hetzelfde zegt).
 *
 * Wordt aangeroepen bij PASS, bij FAIL én bij een afgebroken proef —
 * zolang bekend is WELKE back-up het betrof. Zonder dat laatste is er
 * niets te registreren dat later nog iets betekent.
 *
 * OVER `bewijs_uri`, WANT DAAR ZIT EEN SUBTILITEIT.
 * De bucketkopie draagt de URI waar hij zelf staat; dat is waar, want
 * hij staat daar. Mislukt de upload, dan dragen de lokale kopie en de
 * taakrij `null`, en dat is óók waar: er is dan geen duurzaam bewijs om
 * naar te verwijzen. Elke kopie vertelt dus de waarheid over zijn eigen
 * situatie. Dat is geen drift maar het tegendeel: één samenstelling,
 * één keer, met precies één veld dat per bestemming verschilt en
 * waarvan hier staat waarom.
 */
async function legBewijsVast(uitslag: "PASS" | "FAIL", misluktLijst: readonly string[]): Promise<void> {
  if (dumpObject === null || dumpSha256 === null) {
    console.error("");
    console.error(
      "LET OP: geen bewijs vastgelegd — de proef brak af vóór de back-up bekend was. " +
        "Er is dus ook niets te registreren dat naar een dump verwijst.",
    );
    return;
  }

  const gcsMerk = gcsConfigUitOmgeving();

  const kern = {
    op: new Date().toISOString(),
    uitslag,
    toetsen_geslaagd: geslaagd,
    toetsen_vereist: VEREISTE_RESTORETOETSEN,
    toetsen_mislukt: [...misluktLijst],
    restore_ms: restoreDuurMs,
    dump_object: dumpObject,
    dump_sha256: dumpSha256,
    bronserver: bronserverVersie ?? "onbekend",
    doelvorm: NAAR_BESTAANDE_SERVER ? ("wegwerpdatabase" as const) : ("docker" as const),
    uit_bucket: uitGcsGehaald !== null,
  };

  /* ---------- 1. de bucket: een EIGEN, onveranderbaar object ---------- */
  /* HIER STOND ÉÉN VAST PAD, EN DAT WERKTE PRECIES ÉÉN KEER.
     `restoretest/laatste.json` werd overschreven, en overschrijven is in
     GCS intern delete + create. De dienstaccount heeft bewust geen
     delete-recht, dus de tweede en elke volgende upload kreeg HTTP 403 —
     gemeten op 14 oktober 2026, 03:26 UTC, tijdens de eerste
     productieproef met registratie. Het object is sinds 13 oktober
     13:28 UTC bevroren. De code printte een waarschuwing en ging door,
     dus het leek te werken.

     Nu krijgt elke run zijn eigen naam, met `ifGenerationMatch=0` zodat
     de onveranderbaarheid uit de AANROEP volgt en niet uit een
     IAM-besluit. Een herhaalde poging van dezelfde run levert dezelfde
     naam en dus HTTP 412 — en dat betekent "al vastgelegd", niet
     "mislukt". Zie ops/restorebewijs.ts.

     OOK EEN FAIL GAAT HIERHEEN. Tot 3.0.8 werd alleen een PASS
     geüpload, waardoor het bewijs na een mislukking nog de VORIGE PASS
     droeg: precies de tegenstrijdige statusinformatie die een monitor
     niet mag krijgen. */
  let uriBevestigd: string | null = null;
  if (!gcsMerk) {
    console.log("geen bucket geconfigureerd; het bewijs staat alleen lokaal en in het takenlogboek");
  } else {
    const objectnaam = bewijsObjectnaam(kern);
    const beoogdeUri = `gs://${gcsMerk.bucket}/${objectnaam}`;
    try {
      const uit = await uploadNaarGcs(
        gcsMerk,
        objectnaam,
        Buffer.from(JSON.stringify({ ...kern, bewijs_uri: beoogdeUri }, null, 2) + "\n", "utf8"),
        "application/json",
        { alleenAlsNieuw: true },
      );
      uriBevestigd = beoogdeUri;
      console.log(`bewijs in ${beoogdeUri}${uit.bestondAl ? " (bestond al, identiek)" : ""}`);
    } catch (e) {
      console.error(
        `LET OP: het bewijs kon niet naar de bucket: ${redacteerFout(e)}. ` +
          `De proef zelf is wel gedraaid; het duurzame bewijs ontbreekt. ` +
          `Het takenlogboek draagt het wel — zie hieronder.`,
      );
    }
  }

  const bewijs: RestoretestBewijs = { ...kern, bewijs_uri: uriBevestigd };

  /* ---------- 2. het lokale merkbestand: terugval ---------- */
  await mkdir(DOELMAP, { recursive: true }).catch(() => undefined);
  await writeFile(
    join(DOELMAP, ".laatste-restoretest.json"),
    JSON.stringify(bewijs, null, 2) + "\n",
    "utf8",
  ).catch((e: unknown) => {
    console.error(`LET OP: het lokale merkbestand kon niet geschreven worden: ${redacteerFout(e)}`);
  });

  /* ---------- 3. intel.taken: gedeeld, dus gezaghebbend ---------- */
  /* DIT IS DE REPARATIE. De bucket is alleen leesbaar waar INTEL_GCS_*
     staat — in productie uitsluitend op vibe-intel-worker. Het
     takenlogboek staat in de database die ELKE service al open heeft, en
     zegt daar dus hetzelfde. Zonder deze rij meldde vibe-intel-api
     'geen bewijs van een restoretest gevonden' terwijl er twaalf uur
     eerder een geslaagde proef was.

     Mislukt de registratie, dan is dat een WAARSCHUWING en geen falende
     proef: de restore is wel gedaan. Maar het moet hard opvallen, want
     zonder deze rij is de monitor terug bij af. */
  if (!process.env["INTEL_DB_URL"]) {
    console.error("");
    console.error(
      "LET OP: INTEL_DB_URL ontbreekt, dus het bewijs staat NIET in intel.taken. " +
        "De gedeelde herstelstatus blijft daardoor leeg en elke service zonder bucket " +
        "meldt 'geen bewijs'.",
    );
    return;
  }
  const pool = maakPool();
  try {
    const organisatieId = await huidigeOrganisatie(pool);
    const uitkomst = await metOrganisatie(pool, { organisatieId }, (c) =>
      registreerRestoretest(c, organisatieId, bewijs),
    );
    console.log(
      `takenlogboek: ${uitkomst.nieuw ? "geregistreerd" : "bestond al"} als '${uitkomst.status}' ` +
        `onder sleutel ${uitkomst.sleutel}`,
    );
  } catch (e) {
    console.error("");
    console.error(
      `LET OP: het bewijs kon NIET in intel.taken: ${redacteerFout(e)}. ` +
        `De proef is gedraaid, maar de gedeelde herstelstatus weet daar niets van.`,
    );
  }
  /* GEEN sluitAllePools() hier. Die sluit ook de pool die het slot
     vasthoudt; hij staat in de buitenste finally, ná het vrijgeven. */
}

try {
  /* ---------------- het slot, vóór al het andere ---------------- */
  console.log("");
  console.log("SLOT EN OPRUIMING");
  const slot = await neemSlotEnRuimOp();
  if (!slot.gepakt) {
    /* GEEN FOUT. Er loopt al een restoretest, en dan is overslaan
       precies goed — twee restores naast elkaar betekent twee
       wegwerpdatabases op de productieserver.

       Exitcode 0, want dit is geen mislukking van de back-up en er mag
       geen FAIL in het logboek komen voor een proef die niet gedraaid
       heeft. Er wordt dus ook NIETS geregistreerd: een run die niet
       gebeurde, is geen bewijs in welke richting ook. */
    console.log("");
    console.log("RESTORETEST OVERGESLAGEN — er loopt al een proef (het slot is in gebruik).");
    console.log("Er is niets geregistreerd; de vorige stand blijft staan.");
    process.exitCode = 0;
    /* Via een eigen fouttype uit het try-blok, zodat de `finally`
       hieronder zijn opruimwerk doet. De `catch` kent dit type en legt
       er met opzet GEEN mislukking voor vast; zie daar. Een `if` om de
       resterende 450 regels zou hetzelfde doen maar het hele bestand
       een niveau diep indenteren. */
    throw new SlotBezet();
  }

  /* ---------------- de back-up kiezen ---------------- */
  let dumpPad = waarde("dump") ? resolve(waarde("dump")!) : null;

  /* `--uit-gcs` haalt de nieuwste dump UIT DE BUCKET en zet die terug.
     Dat is een wezenlijk ander bewijs dan de lokale vorm: het toetst de
     hele keten waar het op aankomt — dump, upload, retentie, OPHALEN en
     restore — in plaats van alleen het deel dat op deze schijf staat.
     Een archief dat je niet kunt terughalen is geen back-up. */
  if (heeft("uit-gcs")) {
    if (dumpPad) throw new Error("--dump en --uit-gcs sluiten elkaar uit");
    const gcs = gcsConfigUitOmgeving();
    if (!gcs) {
      throw new Error(
        "--uit-gcs vraagt INTEL_GCS_BUCKET en INTEL_GCS_SLEUTEL; zonder credential is er geen externe kopie om te toetsen",
      );
    }
    const inBucket = (await lijstGcs(gcs, "vibe-intel-")).filter((o) => o.naam.endsWith(".dump"));
    const nieuwste = inBucket[inBucket.length - 1];
    if (!nieuwste) throw new Error(`geen .dump in gs://${gcs.bucket}. Draai eerst 'npm run backup'.`);

    await mkdir(DOELMAP, { recursive: true });
    const lokaal = join(DOELMAP, `uit-gcs-${nieuwste.naam}`);
    const dumpBytes = await downloadUitGcs(gcs, nieuwste.naam);
    const manifestBytes = await downloadUitGcs(gcs, `${nieuwste.naam}.manifest.json`);
    await writeFile(lokaal, dumpBytes);
    await writeFile(`${lokaal}.manifest.json`, manifestBytes);

    /* De som uit het MEEGEHAALDE manifest tegen de MEEGEHAALDE bytes.
       Dit is de controle die bewijst dat de bucket geen stille bitrot of
       halve upload bevat. */
    const mani = JSON.parse(manifestBytes.toString("utf8")) as BackupManifest;
    const som = createHash("sha256").update(dumpBytes).digest("hex");
    if (som !== mani.sha256) {
      throw new Error(
        `de dump uit gs://${gcs.bucket} klopt niet met zijn manifest: ${som} tegen ${mani.sha256}`,
      );
    }
    console.log("");
    console.log(`uit gs://${gcs.bucket} gehaald: ${nieuwste.naam}`);
    console.log(`  bytes ${dumpBytes.byteLength}, sha256 ${som} — klopt met het manifest`);
    uitGcsGehaald = lokaal;
    dumpPad = lokaal;
  }

  if (!dumpPad) {
    if (!existsSync(DOELMAP)) throw new Error(`geen back-upmap: ${DOELMAP}. Draai eerst 'npm run backup'.`);
    const d = (await readdir(DOELMAP)).filter((b) => b.endsWith(".dump")).sort();
    if (!d.length) throw new Error(`geen back-up in ${DOELMAP}. Draai eerst 'npm run backup'.`);
    dumpPad = join(DOELMAP, d[d.length - 1]!);
  }
  const manifestPad = `${dumpPad}.manifest.json`;
  if (!existsSync(manifestPad)) throw new Error(`manifest ontbreekt naast ${dumpPad}`);
  const manifest = JSON.parse(await readFile(manifestPad, "utf8")) as BackupManifest;
  const serverMajor = Number(/^(\d+)/.exec(manifest.serverVersie)?.[1] ?? "0");

  /* Vanaf hier is bekend WELKE back-up getoetst wordt. Breekt de proef
     hierna af, dan is er genoeg om een mislukking te registreren die
     later nog betekenis heeft. Het voorvoegsel `uit-gcs-` gaat eraf: de
     naam moet het object in de bucket aanwijzen, niet de tijdelijke
     kopie op deze schijf. */
  dumpObject = basename(dumpPad).replace(/^uit-gcs-/, "");
  dumpSha256 = manifest.sha256;
  bronserverVersie = manifest.serverVersie;

  console.log("");
  console.log("RESTORETEST — GEISOLEERDE DATABASE");
  console.log("=".repeat(80));
  console.log("");
  console.log(`  back-up        ${dumpPad}`);
  console.log(`  gemaakt op     ${manifest.gemaaktOp}`);
  console.log(`  bronserver     ${manifest.serverVersie}`);
  console.log(
    `  doel           ${
      NAAR_BESTAANDE_SERVER
        ? `wegwerpdatabase ${WEGWERP_DB} op de opgegeven server`
        : `Docker-container ${CONTAINER} op poort ${POORT}`
    }`,
  );
  console.log("");
  console.log("  De brondatabase wordt NIET aangeraakt.");
  console.log("");

  /* ---------------- het geisoleerde doel ---------------- */
  console.log("OPZET");
  let doelUrl: string;
  const gereedschap = await vindPgGereedschap(serverMajor);

  if (NAAR_BESTAANDE_SERVER) {
    const beheer = grendel(DOEL_BEHEER_URL!);
    console.log(`  grendel        wegwerpnaam ${WEGWERP_DB} wijkt af van de brondatabase`);

    /* `create database` kan niet in een transactie en niet via een
       parameter; de naam is daarom hierboven op vorm gecontroleerd. */
    /* De verbinding gaat via de procesomgeving, niet via argv: een
       mislukte psql zette tot 3.0.4 de hele commandoregel — inclusief
       het wachtwoord van de BEHEERDER — in Error.message. */
    await draaiPgGereedschap(
      gereedschap.psql,
      ["-v", "ON_ERROR_STOP=1", "-c", `create database ${WEGWERP_DB}`],
      beheer.toString(),
    );
    wegwerpDbGemaakt = true;
    console.log(`  database       ${WEGWERP_DB} aangemaakt`);

    const d = new URL(beheer.toString());
    d.pathname = `/${WEGWERP_DB}`;
    doelUrl = d.toString();
  } else {
    await uitvoeren("docker", ["info"]).catch(() => {
      throw new Error("Docker draait niet; een geisoleerde restoretest kan niet.");
    });

    await uitvoeren("docker", [
      "run",
      "--detach",
      "--rm",
      "--name",
      CONTAINER,
      /* Naamvorm: docker leest de WAARDE uit onze procesomgeving, zodat
         het wachtwoord niet op de commandoregel staat (en dus niet in
         `ps` of in een foutmelding van execFile). */
      "--env",
      "POSTGRES_PASSWORD",
      "--env",
      `POSTGRES_DB=${DB}`,
      "--publish",
      `127.0.0.1:${POORT}:5432`,
      `postgres:${serverMajor}-alpine`,
    ], {
      /* De waarde hoort hier, niet in argv. docker kopieert hem naar de
         container; onze eigen commandoregel blijft schoon. */
      env: { ...process.env, POSTGRES_PASSWORD: WACHTWOORD },
    });
    containerGestart = true;
    console.log(`  container gestart: postgres:${serverMajor}-alpine`);
    doelUrl = `postgresql://postgres:${WACHTWOORD}@127.0.0.1:${POORT}/${DB}`;
  }

  /* Wachten tot de server echt klaar is. */
  let klaar = false;
  for (let i = 0; i < 60; i++) {
    try {
      await draaiPgGereedschap(gereedschap.psql, ["-At", "-c", "select 1"], doelUrl);
      klaar = true;
      break;
    } catch {
      if (!NAAR_BESTAANDE_SERVER && !(await containerLeeft())) {
        throw new Error("de container is gestopt tijdens het opstarten");
      }
      await wacht(500);
    }
  }
  if (!klaar) throw new Error("de geisoleerde database kwam niet online");
  console.log("  database bereikbaar");
  console.log("");

  /* ---------------- de restore ---------------- */
  console.log("RESTORE");
  const begin = Date.now();
  /* De rollen bestaan in een verse container niet. De dump is met
     --no-owner gemaakt, maar RLS-policies en grants verwijzen bij naam
     naar rollen; die moeten dus eerst bestaan. Dit is precies de stap
     die een restoreprocedure zonder test mist. */
  /* EEN ROL IS CLUSTERBREED, GEEN DATABASEOBJECT.
     In de Docker-vorm is dat onschuldig: de hele server wordt daarna
     weggegooid. Bij `--doel-url` staat de server er NA de test nog, en
     dat is de productieserver. Rollen die wij daar aanmaken blijven dan
     achter — buiten de wegwerpdatabase, dus buiten de isolatie die dit
     bestand belooft.
     Daarom: bij een bestaande server maken we NIETS aan. De rollen horen
     daar al te bestaan, want de migraties hebben ze gezet. Ontbreken ze,
     dan is dat een echte bevinding over die server en geen reden om er
     stilletjes iets bij te zetten. */
  if (NAAR_BESTAANDE_SERVER) {
    const { stdout } = await draaiPgGereedschap(
      gereedschap.psql,
      ["-At", "-c", `select rolname from pg_roles where rolname in ('vibe_intel_app','vibe_intel_lezer','vibe_intel_onderhoud') order by 1`],
      doelUrl,
    );
    const aanwezig = stdout.split("\n").map((r) => r.trim()).filter(Boolean);
    const ontbreekt = ["vibe_intel_app", "vibe_intel_lezer", "vibe_intel_onderhoud"]
      .filter((r) => !aanwezig.includes(r));
    if (ontbreekt.length) {
      throw new Error(
        `de doelserver mist applicatierol(len) ${ontbreekt.join(", ")}. ` +
          `Deze test maakt op een BESTAANDE server geen rollen aan, want een rol is ` +
          `clusterbreed en zou na de test achterblijven. Draai eerst de migraties.`,
      );
    }
    console.log(`  applicatierollen bestaan al op de doelserver (${aanwezig.length}); niets aangemaakt`);
  } else {
    for (const rol of ["vibe_intel_app", "vibe_intel_lezer", "vibe_intel_onderhoud"]) {
      await draaiPgGereedschap(
        gereedschap.psql,
        ["-v", "ON_ERROR_STOP=1", "-c",
         `do $$ begin if not exists (select 1 from pg_roles where rolname = '${rol}') then create role ${rol} nologin; end if; end $$;`],
        doelUrl,
      );
    }
    console.log("  applicatierollen aangemaakt in de wegwerpcontainer (de dump draagt geen rollen)");
  }

  /* De argumenten staan in ops/pgomgeving.ts, zodat de integratietoets
     DEZELFDE aanroep gebruikt. Zie de toelichting daar: in 3.0.4 brak dit
     pad terwijl de toets groen bleef, omdat die zijn eigen argumenten
     bouwde. */
  /* DE LAATSTE GRENDEL, EN DE ENIGE DIE OP HET WERKELIJKE DOEL KIJKT.
     `grendel()` controleert de VORM van de wegwerpnaam voordat de
     database bestaat. Dat is nuttig maar het zegt niets over de URL waar
     pg_restore straks echt naartoe schrijft. Hier staat dus de eis die
     telt: bij de --doel-url-vorm MOET het pad van `doelUrl` exact de
     wegwerpdatabase zijn die wij een paar regels hoger hebben
     aangemaakt.

     Dit is de maatregel tegen het enige onherstelbare scenario van dit
     bestand: pg_restore in de PRODUCTIEdatabase. Die heet `railway`;
     deze toets laat alleen `restoretest_<pid>_<n>` door. Hij is
     bovendien de plek waar een toekomstige wijziging — een andere manier
     om doelUrl te bouwen, een redirect, een copy-paste — zou afgaan. */
  if (NAAR_BESTAANDE_SERVER) {
    const doelPad = new URL(doelUrl).pathname;
    if (doelPad !== `/${WEGWERP_DB}`) {
      throw new Error(
        `WEIGERD: pg_restore zou naar '${doelPad}' schrijven in plaats van naar de ` +
          `wegwerpdatabase '/${WEGWERP_DB}'. Er wordt niets teruggezet.`,
      );
    }
    console.log(`  grendel        doel is ${doelPad}, de verse wegwerpdatabase`);
  }

  const { stderr: restoreFout } = await pgRestoreNaarDatabase(
    gereedschap.pgRestore,
    dumpPad,
    doelUrl,
  ).catch((e: unknown) => {
    throw new Error(`pg_restore mislukte: ${redacteerFout(e).slice(0, 600)}`);
  });
  const restoreMs = Date.now() - begin;
  restoreDuurMs = restoreMs;
  console.log(`  pg_restore gereed in ${restoreMs} ms${restoreFout?.trim() ? " (met meldingen)" : ""}`);
  console.log("");

  /* ---------------- de verificatie ---------------- */
  console.log("VERIFICATIE");
  const client = new pg.Client({ connectionString: doelUrl });
  await client.connect();
  try {
    const een = async <T extends pg.QueryResultRow>(sql: string, p: unknown[] = []) =>
      (await client.query<T>(sql, p)).rows[0];

    const mig = await een<{ n: number }>("select count(*)::int as n from intel.migraties");
    toets(
      "het aantal toegepaste migraties komt overeen met het manifest",
      mig?.n === manifest.migraties,
      `${mig?.n} teruggezet tegen ${manifest.migraties} in het manifest`,
    );

    /* De tabelnaam komt uit een manifestBESTAND op schijf en gaat in een
       identifierpositie, waar een parameter niet kan. Zonder de toets
       hieronder is dat SQL-injectie: `--dump <pad>` bepaalt welk manifest
       gelezen wordt, en node-pg stuurt een query ZONDER parameters via het
       simple protocol, dat meerdere statements achter een puntkomma
       uitvoert. Een manifest met de sleutel
       `intel.x; drop table intel.taken; --` zou dus draaien.

       Daarom niet alleen een vormtoets maar een WITTE LIJST: de naam moet
       in KRITIEKE_TABELLEN staan, de constante die maakBackup() ook
       gebruikt om het manifest te vullen. Een manifest dat iets anders
       noemt, is per definitie niet door onze back-up geschreven. */
    const toegestaneTabellen = new Set<string>(KRITIEKE_TABELLEN);
    let tellingenOk = true;
    const geweigerd: string[] = [];
    for (const [tabel, verwacht] of Object.entries(manifest.tellingen)) {
      if (!toegestaneTabellen.has(tabel) || !/^intel\.[a-z_]+$/.test(tabel)) {
        geweigerd.push(tabel);
        tellingenOk = false;
        console.log(`    GEWEIGERD ${tabel} — staat niet in KRITIEKE_TABELLEN`);
        continue;
      }
      const r = await een<{ n: number }>(`select count(*)::int as n from ${tabel} where true`);
      const ok = r?.n === verwacht;
      if (!ok) tellingenOk = false;
      console.log(`    ${ok ? "ok  " : "MIS "} ${tabel.padEnd(32)} ${r?.n} / ${verwacht}`);
    }
    toets(
      "elke kritieke tabel heeft exact de rijtelling uit het manifest",
      tellingenOk,
      geweigerd.length ? `${geweigerd.length} tabelnaam/namen geweigerd: ${geweigerd.join(", ")}` : "",
    );

    /* Goedkeuringen MET hun context, niet alleen de rij. */
    const g = await een<{ totaal: number; met_naam: number; met_afdruk: number }>(
      `select count(*)::int                                                  as totaal,
              count(*) filter (where goedgekeurd_door is not null)::int       as met_naam,
              count(*) filter (where goedgekeurde_afdruk is not null)::int    as met_afdruk
         from intel.inhoud_versies`,
    );
    toets(
      "goedkeuringen zijn teruggezet met goedkeurder en inhoudsafdruk",
      g !== undefined && g.met_naam === g.met_afdruk,
      `${g?.totaal} versies, ${g?.met_naam} met goedkeurder, ${g?.met_afdruk} met afdruk`,
    );

    const audit = await een<{ n: number; oudste: string | null }>(
      "select count(*)::int as n, min(op)::text as oudste from intel.audit_gebeurtenissen",
    );
    toets(
      "het auditspoor is volledig teruggezet",
      audit?.n === manifest.tellingen["intel.audit_gebeurtenissen"],
      `${audit?.n} gebeurtenissen, oudste ${audit?.oudste ?? "geen"}`,
    );

    /* De append-only trigger moet MEE zijn gekomen. */
    let appendOnlyWerkt = false;
    try {
      await client.query("update intel.audit_gebeurtenissen set handeling = 'gemanipuleerd'");
    } catch (e) {
      appendOnlyWerkt = /append|only|niet toegestaan|wijzig/i.test(
        redacteerFout(e),
      );
    }
    toets(
      "de append-only bescherming op het auditspoor werkt na de restore",
      appendOnlyWerkt,
      appendOnlyWerkt ? "een update werd geweigerd" : "een update werd TOEGESTAAN — de trigger mist",
    );

    /* De eerste versie van deze toets eiste RLS op ELKE tabel in het
       intel-schema en faalde op 6 van 44. Dat was een fout in de toets:
       die zes hebben geen organisatie_id en zijn gedeelde
       referentietabellen (geo_bereiken, rollen, rol_rechten, ai_prijzen,
       migraties en de uitzonderingslijst zelf). Het schema documenteert
       ze in intel.rls_uitzonderingen.

       Hieronder staan daarom de twee toetsen die wél iets zeggen. De
       tweede is strenger dan de oorspronkelijke: hij valt niet alleen om
       als RLS bij een restore verdwijnt, maar ook als iemand later een
       tenanttabel toevoegt zonder RLS én zonder hem te verantwoorden. */
    const tenantZonderRls = await een<{ n: number; namen: string | null }>(
      `select count(*)::int as n, string_agg(c.relname, ', ') as namen
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'intel' and c.relkind = 'r'
          and not c.relrowsecurity
          and exists (select 1 from information_schema.columns col
                       where col.table_schema = 'intel'
                         and col.table_name = c.relname
                         and col.column_name = 'organisatie_id')`,
    );
    toets(
      "elke tabel met een organisatie_id heeft na de restore nog RLS",
      tenantZonderRls?.n === 0,
      tenantZonderRls?.n === 0 ? "geen enkele" : `zonder RLS: ${tenantZonderRls?.namen}`,
    );

    const afwijking = await een<{ n: number; namen: string | null }>(
      `with zonder as (
         select c.relname
           from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'intel' and c.relkind = 'r' and not c.relrowsecurity
       ),
       verantwoord as (select tabelnaam from intel.rls_uitzonderingen)
       select count(*)::int as n, string_agg(x.relname, ', ') as namen
         from (select relname from zonder
               except
               select tabelnaam from verantwoord) x`,
    );
    toets(
      "de tabellen zonder RLS zijn exact de verantwoorde uitzonderingen",
      afwijking?.n === 0,
      afwijking?.n === 0
        ? "de uitzonderingslijst dekt ze allemaal"
        : `niet verantwoord: ${afwijking?.namen}`,
    );

    const rls = await een<{ met: number; totaal: number }>(
      `select count(*) filter (where relrowsecurity)::int as met,
              count(*)::int                               as totaal
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'intel' and c.relkind = 'r'`,
    );
    console.log(`        (${rls?.met} van ${rls?.totaal} tabellen met RLS; de rest is verantwoord)`);

    const beleid = await een<{ n: number }>("select count(*)::int as n from pg_policies where schemaname = 'intel'");
    toets("de RLS-policies zijn teruggezet", (beleid?.n ?? 0) > 0, `${beleid?.n} policies`);

    const triggers = await een<{ n: number }>(
      `select count(*)::int as n from pg_trigger t
         join pg_class c on c.oid = t.tgrelid
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'intel' and not t.tgisinternal`,
    );
    toets("de triggers zijn teruggezet", (triggers?.n ?? 0) > 0, `${triggers?.n} triggers`);

    const constraints = await een<{ n: number }>(
      `select count(*)::int as n from pg_constraint c
         join pg_namespace n on n.oid = c.connamespace
        where n.nspname = 'intel' and c.contype = 'c'`,
    );
    toets(
      "de check-constraints zijn teruggezet",
      (constraints?.n ?? 0) > 20,
      `${constraints?.n} check-constraints`,
    );
  } finally {
    await client.end();
  }

  console.log("");
  console.log("-".repeat(80));
  /* DEZE REGEL IS LETTERLIJK AFHANKELIJK. `src/cli/e2e.ts:1039` leest
     hem met /geslaagd (\d+)\s+mislukt (\d+)/ en bepaalt daarmee of
     scenario 27 geslaagd is. Mijn eerste versie zette hier
     "geslaagd 10 van 10 vereist   mislukt 0" tussen — en dan staat er
     ` van` waar de regex `\s+mislukt` verwacht, dus matchte hij niet
     meer en zou scenario 27 stil op FAIL staan. Het vereiste aantal
     staat daarom op een EIGEN regel. */
  console.log(`geslaagd ${geslaagd}   mislukt ${mislukt.length}   restoreduur ${restoreMs} ms`);
  console.log(`vereist  ${VEREISTE_RESTORETOETSEN} controles voor een volledige proef`);

  /* HET AANTAL MOET KLOPPEN, NIET ALLEEN DE AFWEZIGHEID VAN FOUTEN.
     Hier stond `if (mislukt.length)`, en dat is te zwak: een controle
     die niet is UITGEVOERD staat niet in `mislukt`. Zou er hierboven
     eentje worden overgeslagen — door een vroege return, een
     weggecommentarieerde regel of een query die stil niets teruggaf —
     dan meldde deze proef PASS met negen controles en noemde zich
     daarmee bewijs. Een onvolledige proef is geen bewijs. */
  if (geslaagd !== VEREISTE_RESTORETOETSEN && mislukt.length === 0) {
    mislukt.push(
      `ONVOLLEDIG — ${geslaagd} van ${VEREISTE_RESTORETOETSEN} vereiste controles uitgevoerd; ` +
        `zijn er controles bijgekomen of weggevallen, dan hoort VEREISTE_RESTORETOETSEN in ` +
        `ops/restorebewijs.ts mee te veranderen`,
    );
  }

  if (mislukt.length) {
    for (const m of mislukt) console.log(`  FAIL ${m}`);
    console.log("");
    console.log("EINDOORDEEL RESTORETEST = FAIL");
    process.exitCode = 1;
    console.log("");
    await legBewijsVast("FAIL", mislukt);
  } else {
    console.log("");
    console.log("EINDOORDEEL RESTORETEST = PASS");
    console.log("De back-up is aantoonbaar terug te zetten, inclusief goedkeuringen,");
    console.log("auditspoor, RLS, policies, triggers en constraints.");
    console.log("");

    /* Het bewijs gaat naar DRIE bestemmingen, en dat is sinds 3.0.8 de
       hele reden dat dit werkt op een service zonder bucket. De
       samenstelling en de verdeling staan in legBewijsVast(); zie daar
       waarom de bucketkopie en de taakrij in precies één veld kunnen
       verschillen. */
    await legBewijsVast("PASS", []);
  }
} catch (e) {
  /* EEN OVERGESLAGEN RUN IS GEEN MISLUKTE RUN. Het slot was bezet, dus
     er is niets gedraaid en er valt niets vast te leggen. Zou hier een
     FAIL geregistreerd worden, dan zou het restoresignaal rood gaan
     staan juist doordat er al een proef liep. */
  if (e instanceof SlotBezet) {
    // niets: de melding staat al in het try-blok, de exitcode op 0
  } else {
  console.error("");
  console.error(`RESTORETEST AFGEBROKEN: ${redacteerFout(e)}`);
  process.exitCode = 1;

  /* OOK EEN AFGEBROKEN PROEF IS EEN FEIT OVER DE HERSTELBAARHEID.
     Brak hij af nadat bekend was welke back-up het betrof — pg_restore
     die omvalt, een doelserver die de rollen mist, een dump die niet bij
     zijn manifest past — dan hoort dat in het logboek. Tot nu toe
     verdween het in deze console.error, en zag de monitor alleen dat er
     'geen nieuw bewijs' was, wat heel iets anders is dan 'de laatste
     proef faalde'.

     Mislukt het vastleggen zelf ook, dan mag dat de exitcode niet nóg
     onduidelijker maken: die staat hierboven al op 1. */
  /* EXTRA REDACTIE OP DIT ENE PAD, want deze tekst gaat nu de DATABASE
     in — via `toetsen_mislukt` naar de kolom `laatste_fout`. Daar staat
     een tripwire: ops/meting.ts telt rijen waarvan `laatste_fout` op een
     credential-URL lijkt, en kern/taken.ts maakt daar een
     niet-herhaalbare configuratiefout van. Eén lekkend wachtwoord in
     deze tekst zou dus de dagelijkse metingtaak naar de dlq sturen —
     bovenop het lek zelf. Migratie 0031 bestaat omdat dit een keer echt
     is gebeurd.

     `redacteerFout` kent alleen het wachtwoord uit INTEL_DB_URL als
     letterlijk geheim; het SUPERUSER-wachtwoord uit
     INTEL_RESTORETEST_DOEL_URL leunt op het generieke schemapatroon.
     Dat patroon is goed, maar niet iets om een superuserwachtwoord
     alleen aan toe te vertrouwen. Daarom hier expliciet mee. */
  const veiligeFout = redigeer(redacteerFout(e), [wachtwoordUit(DOEL_BEHEER_URL ?? null)]);
  await legBewijsVast("FAIL", [`afgebroken: ${veiligeFout.slice(0, 300)}`]).catch((f: unknown) => {
    console.error(`LET OP: ook het vastleggen van de mislukking faalde: ${redacteerFout(f)}`);
  });
  }
} finally {
  if (containerGestart && !heeft("houd")) {
    await uitvoeren("docker", ["stop", CONTAINER]).catch(() => undefined);
    console.log("");
    console.log(`container ${CONTAINER} gestopt en verwijderd`);
  } else if (containerGestart) {
    console.log("");
    console.log(`container ${CONTAINER} blijft staan op poort ${POORT} (--houd)`);
  }

  if (wegwerpDbGemaakt && !heeft("houd")) {
    /* De wegwerpdatabase MOET weg, ook als de test faalde: hij staat op
       dezelfde server als productie en kost daar schijfruimte. De drop
       kan pas als onze eigen verbinding dicht is, vandaar FORCE. */
    const beheer = DOEL_BEHEER_URL!;
    /* Major 0: een `drop database` stelt geen eisen aan de clientversie,
       anders dan een dump. Elke psql in PATH is hier goed genoeg. */
    const g = await vindPgGereedschap(0).catch(() => null);
    if (!g) {
      /* Zonder else-tak bleef de wegwerpdatabase hier STIL achter op de
         productieserver: geen melding, geen exitcode. Een opruiming die
         kan overslaan zonder dat iemand het ziet, is geen opruiming. */
      console.error("");
      console.error(`LET OP: geen psql gevonden, dus ${WEGWERP_DB} is NIET gedropt.`);
      console.error(`Hij staat op de doelserver uit INTEL_RESTORETEST_DOEL_URL.`);
      console.error(`Verwijder hem met de hand: drop database ${WEGWERP_DB};`);
      process.exitCode = 1;
    } else {
      await draaiPgGereedschap(g.psql, ["-c", `drop database if exists ${WEGWERP_DB} with (force)`], beheer)
        .then(() => {
          console.log("");
          console.log(`wegwerpdatabase ${WEGWERP_DB} gedropt`);
        })
        .catch((e: Error) => {
          console.error("");
          console.error(`LET OP: ${WEGWERP_DB} kon niet gedropt worden: ${redigeer(e.message).slice(0, 200)}`);
          console.error("Verwijder hem met de hand; hij staat op de productieserver.");
          process.exitCode = 1;
        });
    }
  } else if (wegwerpDbGemaakt) {
    console.log("");
    console.log(`wegwerpdatabase ${WEGWERP_DB} blijft staan (--houd)`);
  }

  if (uitGcsGehaald && !heeft("houd")) {
    /* De meegehaalde kopie hoort niet te blijven liggen: hij bevat
       goedkeuringen, gebruikers en het auditspoor, en de map staat
       bewust in .gitignore maar is geen archief. */
    await rm(uitGcsGehaald, { force: true });
    await rm(`${uitGcsGehaald}.manifest.json`, { force: true });
    console.log(`de uit de bucket gehaalde kopie is weer verwijderd`);
  }

  /* HET SLOT ALS LAATSTE LOS, en expliciet. Een advisory lock hangt aan
     de SESSIE, en een sessie uit een pool wordt hergebruikt in plaats
     van gesloten. Zou het slot niet vrijgegeven worden, dan bleef het
     hangen aan een verbinding die later ander werk doet — en dan draait
     er nooit meer een restoretest tot de service herstart. */
  if (slotClient) {
    await geefRestoretestSlotTerug(slotClient);
    slotClient.release();
    slotClient = null;
  }
  if (slotPool) {
    await slotPool.end().catch(() => undefined);
    slotPool = null;
  }

  /* SLUITEN ALS ALLERLAATSTE, en hier en niet in legBewijsVast().
     Daar stond het, en `sluitAllePools()` beëindigt ALLE gememoïseerde
     pools — inclusief de pool die het slot vasthoudt. Het gevolg was dat
     de `pg_advisory_unlock` hierboven op een gesloten pool landde en
     stil in een catch verdween. Functioneel ging het goed (een dode
     sessie laat een advisory lock los), maar een opruiming die stil
     mislukt is geen opruiming. */
  await sluitAllePools().catch(() => undefined);
}
