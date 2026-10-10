/* ============================================================
   CLI — restoretest in een geisoleerde database
   ------------------------------------------------------------
     npm run restoretest                 nieuwste back-up terugzetten
     npm run restoretest -- --dump <pad> een specifieke back-up
     npm run restoretest -- --houd       doel laten staan om in te kijken
     npm run restoretest -- --doel-url <beheer-url>
                                         restore naar een WEGWERPDATABASE
                                         op een bestaande server

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
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import pg from "pg";
import { laadEnvBestand, APP_WORTEL } from "../kern/config.ts";
import { vindPgGereedschap, type BackupManifest } from "../ops/backup.ts";

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

try {
  /* ---------------- de back-up kiezen ---------------- */
  let dumpPad = waarde("dump") ? resolve(waarde("dump")!) : null;
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
    await uitvoeren(gereedschap.psql, [
      beheer.toString(),
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `create database ${WEGWERP_DB}`,
    ]);
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
      "--env",
      `POSTGRES_PASSWORD=${WACHTWOORD}`,
      "--env",
      `POSTGRES_DB=${DB}`,
      "--publish",
      `127.0.0.1:${POORT}:5432`,
      `postgres:${serverMajor}-alpine`,
    ]);
    containerGestart = true;
    console.log(`  container gestart: postgres:${serverMajor}-alpine`);
    doelUrl = `postgresql://postgres:${WACHTWOORD}@127.0.0.1:${POORT}/${DB}`;
  }

  /* Wachten tot de server echt klaar is. */
  let klaar = false;
  for (let i = 0; i < 60; i++) {
    try {
      await uitvoeren(gereedschap.psql, [doelUrl, "-At", "-c", "select 1"]);
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
  for (const rol of ["vibe_intel_app", "vibe_intel_lezer", "vibe_intel_onderhoud"]) {
    await uitvoeren(gereedschap.psql, [
      doelUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `do $$ begin if not exists (select 1 from pg_roles where rolname = '${rol}') then create role ${rol} nologin; end if; end $$;`,
    ]);
  }
  console.log("  applicatierollen aangemaakt (de dump draagt geen rollen)");

  const { stderr: restoreFout } = await uitvoeren(
    gereedschap.pgRestore,
    ["--dbname", doelUrl, "--no-owner", "--no-privileges", "--exit-on-error", dumpPad],
    { maxBuffer: 256 * 1024 * 1024 },
  ).catch((e: { stderr?: string; stdout?: string; message?: string }) => {
    throw new Error(`pg_restore mislukte: ${(e.stderr ?? e.message ?? "").slice(0, 600)}`);
  });
  const restoreMs = Date.now() - begin;
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

    let tellingenOk = true;
    for (const [tabel, verwacht] of Object.entries(manifest.tellingen)) {
      const r = await een<{ n: number }>(`select count(*)::int as n from ${tabel}`);
      const ok = r?.n === verwacht;
      if (!ok) tellingenOk = false;
      console.log(`    ${ok ? "ok  " : "MIS "} ${tabel.padEnd(32)} ${r?.n} / ${verwacht}`);
    }
    toets("elke kritieke tabel heeft exact de rijtelling uit het manifest", tellingenOk);

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
        e instanceof Error ? e.message : String(e),
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
  console.log(`geslaagd ${geslaagd}   mislukt ${mislukt.length}   restoreduur ${restoreMs} ms`);
  if (mislukt.length) {
    for (const m of mislukt) console.log(`  FAIL ${m}`);
    console.log("");
    console.log("EINDOORDEEL RESTORETEST = FAIL");
    process.exitCode = 1;
  } else {
    console.log("");
    console.log("EINDOORDEEL RESTORETEST = PASS");
    console.log("De back-up is aantoonbaar terug te zetten, inclusief goedkeuringen,");
    console.log("auditspoor, RLS, policies, triggers en constraints.");

    /* Een merkbestand, zodat de monitor de LEEFTIJD van het laatste
       bewijs kan meten. Zonder dit staat 'restoretest' in
       `npm run gezondheid` eeuwig op NIET GEMETEN, en dat is precies
       het soort blinde vlek dat deze exercitie moet wegnemen: een
       back-up die nooit is teruggezet is een aanname. */
    await writeFile(
      join(DOELMAP, ".laatste-restoretest.json"),
      JSON.stringify(
        {
          op: new Date().toISOString(),
          uitslag: "PASS",
          dump: dumpPad,
          toetsen_geslaagd: geslaagd,
          restore_ms: restoreMs,
          bronserver: manifest.serverVersie,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    console.log("");
    console.log(`bewijs vastgelegd in ${join(DOELMAP, ".laatste-restoretest.json")}`);
  }
} catch (e) {
  console.error("");
  console.error(`RESTORETEST AFGEBROKEN: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
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
    if (g) {
      await uitvoeren(g.psql, [beheer, "-c", `drop database if exists ${WEGWERP_DB} with (force)`])
        .then(() => {
          console.log("");
          console.log(`wegwerpdatabase ${WEGWERP_DB} gedropt`);
        })
        .catch((e: Error) => {
          console.error("");
          console.error(`LET OP: ${WEGWERP_DB} kon niet gedropt worden: ${e.message.slice(0, 200)}`);
          console.error("Verwijder hem met de hand; hij staat op de productieserver.");
          process.exitCode = 1;
        });
    }
  } else if (wegwerpDbGemaakt) {
    console.log("");
    console.log(`wegwerpdatabase ${WEGWERP_DB} blijft staan (--houd)`);
  }
}
