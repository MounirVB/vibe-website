/* ============================================================
   OPS — back-up, integriteit en retentie
   ------------------------------------------------------------
   De bronlaag van dit platform is herbouwbaar: migreren, zaaien,
   geo synchroniseren en de collector opnieuw laten lopen leverde in
   twee aparte sessies exact dezelfde 2.103 documenten op.

   WAT NIET HERBOUWBAAR IS, en dus de hele reden dat dit bestand
   bestaat: goedkeuringen, publicatiebesluiten, afwijzingen met
   motivatie, het auditspoor en de gebruikers. Die bestaan alleen in
   de database. Een verloren bronlaag kost rekentijd; een verloren
   goedkeuringsgeschiedenis is onherstelbaar.

   DE VALKUIL DIE HIER IS GEMETEN (10 oktober 2026)
   Deze machine heeft twee pg_dump-binaries:

     /opt/homebrew/opt/postgresql@16/bin/pg_dump   16.14
     /opt/homebrew/opt/postgresql@17/bin/pg_dump   17.11

   De eerste in PATH is 16.14, en de server is 17.11. Gemeten uitkomst:

     pg_dump: error: aborting because of server version mismatch
     pg_dump: detail: server version: 17.11; pg_dump version: 16.14

   Een back-upscript dat simpelweg `pg_dump` aanroept faalt hier dus,
   en een cron die zijn uitvoer niet leest zou dat maanden niet merken.
   Daarom zoekt `vindPgDump()` actief de binary die bij de SERVER past
   en weigert hij te werken als die er niet is. Dat is geen
   overdrijving: een stille back-upfout is erger dan geen back-up,
   omdat je denkt dat je er een hebt.

   INTEGRITEIT IS NIET "HET BESTAND BESTAAT"
   Een dump van nul bytes bestaat ook. De controle hier is drieledig:
   de sha256 wordt vastgelegd, `pg_restore --list` moet de
   inhoudsopgave kunnen lezen (dat bewijst dat het archief
   structureel heel is), en het manifest bevat de rijtellingen van de
   niet-herbouwbare tabellen zodat een restore te VERIFIEREN is in
   plaats van alleen te slagen.
   ============================================================ */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { maakLogger } from "../kern/log.ts";

const uitvoeren = promisify(execFile);
const log = maakLogger("backup");

/** Tabellen die een restore MOET terugbrengen; niet herbouwbaar uit bronnen. */
export const KRITIEKE_TABELLEN = [
  "intel.organisaties",
  "intel.gebruikers",
  "intel.gebruiker_rollen",
  "intel.audit_gebeurtenissen",
  "intel.publicatiebesluiten",
  "intel.publicaties",
  "intel.inhoud_versies",
  "intel.regio_impacts",
  "intel.commerciele_signalen",
] as const;

/** Mogelijke installatieplaatsen van een pg_dump, in volgorde van voorkeur. */
const ZOEKPADEN = [
  "/opt/homebrew/opt/postgresql@{major}/bin",
  "/usr/lib/postgresql/{major}/bin",
  "/usr/local/opt/postgresql@{major}/bin",
  "/Applications/Postgres.app/Contents/Versions/{major}/bin",
];

export type PgGereedschap = {
  readonly pgDump: string;
  readonly pgRestore: string;
  readonly psql: string;
  readonly major: number;
  readonly hoe: string;
};

async function versieVan(binary: string): Promise<number | null> {
  try {
    const { stdout } = await uitvoeren(binary, ["--version"]);
    const m = /(\d+)\.\d+/.exec(stdout);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Zoekt het pg-gereedschap dat bij de SERVER-major past.
 *
 * Weigert expliciet een lagere clientversie: pg_dump kan geen nieuwere
 * server dumpen. Een hogere client mag wel, maar wordt hier niet
 * gekozen als de exacte major beschikbaar is.
 */
export async function vindPgGereedschap(serverMajor: number): Promise<PgGereedschap> {
  const kandidaten: { map: string; hoe: string }[] = [
    ...ZOEKPADEN.map((p) => ({
      map: p.replace("{major}", String(serverMajor)),
      hoe: `versiespecifiek pad voor major ${serverMajor}`,
    })),
    { map: "", hoe: "PATH" },
  ];

  for (const k of kandidaten) {
    const pgDump = k.map ? join(k.map, "pg_dump") : "pg_dump";
    const major = await versieVan(pgDump);
    if (major === null) continue;
    if (major < serverMajor) {
      log.waarschuwing("pg_dump overgeslagen: te oud voor deze server", {
        binary: pgDump,
        client_major: major,
        server_major: serverMajor,
      });
      continue;
    }
    return {
      pgDump,
      pgRestore: k.map ? join(k.map, "pg_restore") : "pg_restore",
      psql: k.map ? join(k.map, "psql") : "psql",
      major,
      hoe: k.hoe,
    };
  }

  throw new Error(
    `geen pg_dump gevonden die major ${serverMajor} kan dumpen. ` +
      `Een oudere client weigert met 'server version mismatch'. ` +
      `Installeer de bijpassende client (bijvoorbeeld 'brew install postgresql@${serverMajor}') ` +
      `of zet de juiste bin-map vooraan in PATH.`,
  );
}

async function sha256Van(pad: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const brok of createReadStream(pad)) hash.update(brok as Buffer);
  return hash.digest("hex");
}

export type BackupManifest = {
  readonly bestand: string;
  readonly gemaaktOp: string;
  readonly databaseNaam: string;
  readonly serverVersie: string;
  readonly pgDumpVersie: number;
  readonly bytes: number;
  readonly sha256: string;
  readonly inhoudsopgaveRegels: number;
  readonly tellingen: Readonly<Record<string, number>>;
  readonly migraties: number;
};

export type BackupUitkomst = {
  readonly manifest: BackupManifest;
  readonly manifestPad: string;
  readonly dumpPad: string;
  readonly opgeruimd: readonly string[];
};

/**
 * Maakt een back-up met manifest.
 *
 * `tellingen` komt uit een LIVE query op de bron, niet uit de dump.
 * Dat is precies de bedoeling: bij een restore vergelijk je de
 * tellingen in het doel met dit manifest, en dan weet je of de
 * restore volledig was in plaats van alleen foutloos.
 */
export async function maakBackup(opties: {
  databaseUrl: string;
  doelmap: string;
  stempel: string;
  retentieDagen?: number;
  tellingen: Readonly<Record<string, number>>;
  serverVersie: string;
  migraties: number;
  databaseNaam: string;
}): Promise<BackupUitkomst> {
  const serverMajor = Number(/^(\d+)/.exec(opties.serverVersie)?.[1] ?? "0");
  const gereedschap = await vindPgGereedschap(serverMajor);

  await mkdir(opties.doelmap, { recursive: true });
  const naam = `vibe-intel-${opties.stempel}.dump`;
  const dumpPad = join(opties.doelmap, naam);

  log.info("back-up gestart", {
    pg_dump: gereedschap.pgDump,
    client_major: gereedschap.major,
    server_major: serverMajor,
    gevonden_via: gereedschap.hoe,
  });

  /* Custom format: comprimeert, en pg_restore kan er selectief uit
     terugzetten. --no-owner en --no-privileges houden de dump
     herbruikbaar in een doel waar de rolnamen anders heten; de rollen
     worden door migratie 0001 opnieuw aangelegd. */
  await uitvoeren(gereedschap.pgDump, [
    "--format=custom",
    "--compress=9",
    "--no-owner",
    "--no-privileges",
    "--file",
    dumpPad,
    opties.databaseUrl,
  ]);

  const s = await stat(dumpPad);
  if (s.size === 0) throw new Error(`de dump ${dumpPad} is nul bytes`);

  /* Integriteit: het archief moet LEESBAAR zijn, niet alleen bestaan. */
  const { stdout: toc } = await uitvoeren(gereedschap.pgRestore, ["--list", dumpPad], {
    maxBuffer: 64 * 1024 * 1024,
  });
  const inhoudsopgaveRegels = toc.split("\n").filter((r) => r.trim() && !r.startsWith(";")).length;
  if (inhoudsopgaveRegels === 0) {
    throw new Error(`pg_restore --list gaf een lege inhoudsopgave voor ${dumpPad}`);
  }

  const manifest: BackupManifest = {
    bestand: naam,
    gemaaktOp: opties.stempel,
    databaseNaam: opties.databaseNaam,
    serverVersie: opties.serverVersie,
    pgDumpVersie: gereedschap.major,
    bytes: s.size,
    sha256: await sha256Van(dumpPad),
    inhoudsopgaveRegels,
    tellingen: opties.tellingen,
    migraties: opties.migraties,
  };

  const manifestPad = `${dumpPad}.manifest.json`;
  await writeFile(manifestPad, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const opgeruimd = await pasRetentieToe(opties.doelmap, opties.retentieDagen ?? 30);

  log.info("back-up gereed", {
    bestand: naam,
    bytes: s.size,
    sha256: manifest.sha256.slice(0, 16),
    opgeruimd: opgeruimd.length,
  });

  return { manifest, manifestPad, dumpPad, opgeruimd };
}

/**
 * Retentie: verwijder dumps ouder dan N dagen, maar NOOIT de laatste.
 *
 * Die uitzondering is er met opzet. Een machine die een maand uit
 * staat zou anders bij de eerste run zijn enige back-up opruimen
 * voordat er een nieuwe is.
 */
export async function pasRetentieToe(map: string, dagen: number): Promise<string[]> {
  if (!existsSync(map)) return [];
  const bestanden = (await readdir(map)).filter((b) => b.endsWith(".dump"));
  if (bestanden.length <= 1) return [];

  const met: { naam: string; tijd: number }[] = [];
  for (const b of bestanden) {
    const s = await stat(join(map, b));
    met.push({ naam: b, tijd: s.mtimeMs });
  }
  met.sort((a, b) => b.tijd - a.tijd);

  const grens = Date.now() - dagen * 24 * 3600 * 1000;
  const weg: string[] = [];
  for (const m of met.slice(1)) {
    if (m.tijd < grens) {
      await rm(join(map, m.naam), { force: true });
      await rm(join(map, `${m.naam}.manifest.json`), { force: true });
      weg.push(m.naam);
    }
  }
  return weg;
}

export type IntegriteitUitkomst = {
  readonly ok: boolean;
  readonly bevindingen: readonly string[];
  readonly manifest: BackupManifest | null;
};

/**
 * Controleert een back-up zonder hem terug te zetten.
 *
 * Dit is NIET hetzelfde als een restoretest en vervangt die niet. Het
 * zegt alleen: het bestand is onveranderd sinds het manifest en het
 * archief is leesbaar.
 */
export async function controleerIntegriteit(
  dumpPad: string,
  serverMajor: number,
): Promise<IntegriteitUitkomst> {
  const bevindingen: string[] = [];
  const manifestPad = `${dumpPad}.manifest.json`;

  if (!existsSync(dumpPad)) {
    return { ok: false, bevindingen: [`dump ontbreekt: ${dumpPad}`], manifest: null };
  }
  if (!existsSync(manifestPad)) {
    return { ok: false, bevindingen: [`manifest ontbreekt: ${manifestPad}`], manifest: null };
  }

  const manifest = JSON.parse(await readFile(manifestPad, "utf8")) as BackupManifest;
  const s = await stat(dumpPad);
  if (s.size !== manifest.bytes) {
    bevindingen.push(`omvang wijkt af: ${s.size} bytes op schijf tegen ${manifest.bytes} in het manifest`);
  }
  const sha = await sha256Van(dumpPad);
  if (sha !== manifest.sha256) {
    bevindingen.push(`sha256 wijkt af: ${sha.slice(0, 16)} tegen ${manifest.sha256.slice(0, 16)}`);
  }

  try {
    const gereedschap = await vindPgGereedschap(serverMajor);
    const { stdout } = await uitvoeren(gereedschap.pgRestore, ["--list", dumpPad], {
      maxBuffer: 64 * 1024 * 1024,
    });
    const regels = stdout.split("\n").filter((r) => r.trim() && !r.startsWith(";")).length;
    if (regels !== manifest.inhoudsopgaveRegels) {
      bevindingen.push(
        `inhoudsopgave wijkt af: ${regels} regels tegen ${manifest.inhoudsopgaveRegels} in het manifest`,
      );
    }
  } catch (e) {
    bevindingen.push(`pg_restore --list mislukte: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { ok: bevindingen.length === 0, bevindingen, manifest };
}
