/* ============================================================
   DB — migratierunner met driftdetectie
   ------------------------------------------------------------
   Er is geen migratietool in deze repository, dus hier staat er een.
   Drie eigenschappen die het verschil maken:

   - Elke migratie wordt in één transactie toegepast; faalt er iets,
     dan is er niets half aangekomen.
   - Van elke toegepaste migratie wordt de sha256 bewaard. Verandert
     een al toegepast bestand later, dan weigert de runner te draaien
     in plaats van stil uiteen te lopen met productie.
   - De runner verbindt zonder SET ROLE: migreren vraagt
     eigenaarsrechten, de applicatie draait met minder.
   ============================================================ */

import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { APP_WORTEL } from "../kern/config.ts";
import { sha256hex } from "../kern/tekst.ts";
import { IntelFout } from "../kern/fouten.ts";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("migratie");

export const MIGRATIE_MAP = resolve(APP_WORTEL, "db", "migraties");

export type Migratie = {
  readonly naam: string;
  readonly nummer: number;
  readonly pad: string;
  readonly sql: string;
  readonly hash: string;
};

export type MigratieStatus = {
  readonly naam: string;
  readonly nummer: number;
  readonly toegepast: boolean;
  readonly toegepast_op: Date | null;
  readonly hash: string;
  readonly opgeslagen_hash: string | null;
  readonly drift: boolean;
};

const BOOTSTRAP = `
create schema if not exists intel;
create table if not exists intel.migraties (
  naam         text primary key,
  nummer       integer not null,
  hash         text not null,
  toegepast_op timestamptz not null default now(),
  duur_ms      integer
);
`;

export async function leesMigraties(map = MIGRATIE_MAP): Promise<Migratie[]> {
  const bestanden = (await readdir(map)).filter((b) => b.endsWith(".sql")).sort();
  const uit: Migratie[] = [];
  for (const naam of bestanden) {
    const m = /^(\d{4})_/.exec(naam);
    if (!m || m[1] === undefined) {
      throw new IntelFout(
        "configuratie",
        `migratie '${naam}' volgt niet het patroon NNNN_naam.sql`,
      );
    }
    const pad = resolve(map, naam);
    const sql = await readFile(pad, "utf8");
    uit.push({ naam, nummer: Number.parseInt(m[1], 10), pad, sql, hash: sha256hex(sql) });
  }
  const nummers = uit.map((m) => m.nummer);
  const dubbel = nummers.find((n, i) => nummers.indexOf(n) !== i);
  if (dubbel !== undefined) {
    throw new IntelFout("configuratie", `migratienummer ${dubbel} komt twee keer voor`);
  }
  return uit;
}

async function toegepaste(
  client: pg.PoolClient | pg.Client,
): Promise<Map<string, { hash: string; toegepast_op: Date }>> {
  const r = await client.query<{ naam: string; hash: string; toegepast_op: Date }>(
    "select naam, hash, toegepast_op from intel.migraties",
  );
  return new Map(r.rows.map((x) => [x.naam, { hash: x.hash, toegepast_op: x.toegepast_op }]));
}

export async function status(client: pg.PoolClient | pg.Client): Promise<MigratieStatus[]> {
  await client.query(BOOTSTRAP);
  const bestanden = await leesMigraties();
  const gedaan = await toegepaste(client);
  return bestanden.map((m) => {
    const rij = gedaan.get(m.naam);
    return {
      naam: m.naam,
      nummer: m.nummer,
      toegepast: rij !== undefined,
      toegepast_op: rij?.toegepast_op ?? null,
      hash: m.hash,
      opgeslagen_hash: rij?.hash ?? null,
      drift: rij !== undefined && rij.hash !== m.hash,
    };
  });
}

export type MigreerResultaat = {
  readonly toegepast: string[];
  readonly overgeslagen: string[];
  readonly drift: string[];
};

/**
 * Past alle nog niet toegepaste migraties toe. Weigert te draaien als
 * een al toegepaste migratie op schijf veranderd is, tenzij
 * `driftToestaan` expliciet aan staat (alleen zinvol op een
 * wegwerpbare database).
 */
export async function migreer(
  client: pg.PoolClient | pg.Client,
  opties: { droog?: boolean; driftToestaan?: boolean } = {},
): Promise<MigreerResultaat> {
  await client.query(BOOTSTRAP);
  const bestanden = await leesMigraties();
  const gedaan = await toegepaste(client);

  const drift = bestanden
    .filter((m) => {
      const r = gedaan.get(m.naam);
      return r !== undefined && r.hash !== m.hash;
    })
    .map((m) => m.naam);

  if (drift.length > 0 && !opties.driftToestaan) {
    throw new IntelFout(
      "configuratie",
      `al toegepaste migraties zijn op schijf gewijzigd: ${drift.join(", ")}. ` +
        "Maak een nieuwe migratie in plaats van een oude aan te passen.",
      { context: { drift } },
    );
  }

  const openstaand = bestanden.filter((m) => !gedaan.has(m.naam));
  const toegepastNu: string[] = [];

  for (const m of openstaand) {
    if (opties.droog) {
      log.info("zou toepassen", { migratie: m.naam });
      toegepastNu.push(m.naam);
      continue;
    }
    const start = Date.now();
    try {
      await client.query("begin");
      await client.query(m.sql);
      await client.query(
        "insert into intel.migraties (naam, nummer, hash, duur_ms) values ($1, $2, $3, $4)",
        [m.naam, m.nummer, m.hash, Date.now() - start],
      );
      await client.query("commit");
    } catch (e) {
      await client.query("rollback").catch(() => undefined);
      throw new IntelFout("database", `migratie ${m.naam} mislukt: ${(e as Error).message}`, {
        oorzaak: e,
        context: { migratie: m.naam },
      });
    }
    log.info("toegepast", { migratie: m.naam, duur_ms: Date.now() - start });
    toegepastNu.push(m.naam);
  }

  return {
    toegepast: toegepastNu,
    overgeslagen: bestanden.filter((m) => gedaan.has(m.naam)).map((m) => m.naam),
    drift,
  };
}
