/* ============================================================
   KERN — databaseverbinding en organisatiecontext
   ------------------------------------------------------------
   Twee dingen die hier niet omzeild mogen worden:

   1. De applicatie neemt bij elke verbinding de rol `vibe_intel_app`
      aan (GUC `role` in de startupopties). Die rol is geen eigenaar,
      geen superuser en heeft geen BYPASSRLS, dus RLS is van kracht —
      ook lokaal, waar de ontwikkelaar superuser is. Zonder deze
      regel zou elke test groen zijn zonder iets te bewijzen.

   2. Alle queries lopen via `metOrganisatie`, die
      `app.organisatie_id` transactielokaal zet. Ontbreekt die
      instelling, dan geeft RLS nul rijen. Faalt dus dicht.
   ============================================================ */

import pg from "pg";
import { configLezen } from "./config.ts";
import { IntelFout, alsIntelFout } from "./fouten.ts";
import { maakLogger } from "./log.ts";

const log = maakLogger("db");

// numeric en int8 komen als string terug; dat is bij geldbedragen
// gewenst, maar bij onze id's en tellingen niet. int8 -> number is
// veilig: onze id's blijven ruim onder 2^53.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number.parseInt(v, 10));

export type Pool = pg.Pool;
export type Client = pg.PoolClient;

export type PoolOpties = {
  /** Rol die bij verbinden aangenomen wordt. null = geen SET ROLE (migraties). */
  rol?: string | null;
  max?: number;
  databaseUrl?: string;
};

const poolRegister = new Map<string, pg.Pool>();

function startupOpties(rol: string | null): string {
  const delen = ["-c search_path=intel,public"];
  if (rol) delen.push(`-c role=${rol}`);
  return delen.join(" ");
}

export function maakPool(opties: PoolOpties = {}): pg.Pool {
  const config = configLezen();
  const rol = opties.rol === undefined ? config.appRol : opties.rol;
  const url = opties.databaseUrl ?? config.databaseUrl;
  const sleutel = `${url}::${rol ?? "-"}::${opties.max ?? config.poolMax}`;

  const bestaand = poolRegister.get(sleutel);
  if (bestaand) return bestaand;

  const pool = new pg.Pool({
    connectionString: url,
    max: opties.max ?? config.poolMax,
    options: startupOpties(rol ?? null),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Een lange query mag een worker niet eeuwig vasthouden.
    statement_timeout: 60_000,
    query_timeout: 65_000,
  });

  pool.on("error", (e) => log.fout("onverwachte poolfout", { fout: e }));
  poolRegister.set(sleutel, pool);
  return pool;
}

export async function sluitAllePools(): Promise<void> {
  const pools = [...poolRegister.values()];
  poolRegister.clear();
  await Promise.all(pools.map((p) => p.end().catch(() => undefined)));
}

export type OrganisatieContext = {
  readonly organisatieId: number;
  readonly gebruikerId?: number | null;
};

/**
 * Voert `werk` uit in één transactie met organisatiecontext. Alles wat
 * tenantdata aanraakt hoort hier doorheen te gaan.
 */
export async function metOrganisatie<T>(
  pool: pg.Pool,
  context: OrganisatieContext,
  werk: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  if (!Number.isInteger(context.organisatieId) || context.organisatieId <= 0) {
    throw new IntelFout("autorisatie", "metOrganisatie zonder geldig organisatie_id");
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.organisatie_id', $1, true)", [
      String(context.organisatieId),
    ]);
    await client.query("select set_config('app.gebruiker_id', $1, true)", [
      context.gebruikerId == null ? "" : String(context.gebruikerId),
    ]);
    const resultaat = await werk(client);
    await client.query("commit");
    return resultaat;
  } catch (e) {
    try {
      await client.query("rollback");
    } catch {
      // De verbinding kan al weg zijn; de oorspronkelijke fout is leidend.
    }
    throw alsIntelFout(e, "database");
  } finally {
    client.release();
  }
}

/**
 * Transactie zonder organisatiecontext. Uitsluitend voor de planner,
 * die de organisatielijst nog moet ophalen. RLS geeft hier dus niets
 * tenantgebonden terug — dat is de bedoeling.
 */
export async function zonderOrganisatie<T>(
  pool: pg.Pool,
  werk: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const resultaat = await werk(client);
    await client.query("commit");
    return resultaat;
  } catch (e) {
    try {
      await client.query("rollback");
    } catch {
      /* zie boven */
    }
    throw alsIntelFout(e, "database");
  } finally {
    client.release();
  }
}

export async function eenRij<T extends pg.QueryResultRow>(
  client: pg.PoolClient,
  sql: string,
  waarden: readonly unknown[] = [],
): Promise<T | null> {
  const r = await client.query<T>(sql, waarden as unknown[]);
  return r.rows[0] ?? null;
}

export async function rijen<T extends pg.QueryResultRow>(
  client: pg.PoolClient,
  sql: string,
  waarden: readonly unknown[] = [],
): Promise<T[]> {
  const r = await client.query<T>(sql, waarden as unknown[]);
  return r.rows;
}

/** Zoekt de organisatie-id bij een sleutel. Werkt zonder RLS-context. */
export async function organisatieIdVan(pool: pg.Pool, sleutel: string): Promise<number> {
  const rij = await zonderOrganisatie(pool, (c) =>
    eenRij<{ id: number }>(
      c,
      "select id from intel_priv.actieve_organisaties() where sleutel = $1",
      [sleutel],
    ),
  );
  if (!rij) {
    throw new IntelFout("configuratie", `organisatie '${sleutel}' bestaat niet of is niet actief`);
  }
  return rij.id;
}

/**
 * Controleert de aannames waarop de hele beveiliging rust. Draait in de
 * poort en in de tests: als de applicatierol eigenaar, superuser of
 * BYPASSRLS zou zijn, bewijst geen enkele isolatietest nog iets.
 */
export type RolControle = {
  readonly huidigeRol: string;
  readonly isSuperuser: boolean;
  readonly heeftBypassRls: boolean;
  readonly isEigenaarVanTabellen: boolean;
  readonly veilig: boolean;
  readonly bevindingen: string[];
};

export async function controleerRol(pool: pg.Pool): Promise<RolControle> {
  return zonderOrganisatie(pool, async (c) => {
    const rij = await eenRij<{
      rol: string;
      super: boolean;
      bypass: boolean;
      eigenaar_tabellen: number;
    }>(
      c,
      `select current_user                                  as rol,
              coalesce(r.rolsuper, false)                   as super,
              coalesce(r.rolbypassrls, false)               as bypass,
              (select count(*)::int from pg_tables t
                 where t.schemaname = 'intel'
                   and t.tableowner = current_user)         as eigenaar_tabellen
         from pg_roles r
        where r.rolname = current_user`,
    );
    if (!rij) throw new IntelFout("database", "kon current_user niet bepalen");

    const bevindingen: string[] = [];
    if (rij.super) bevindingen.push(`rol ${rij.rol} is superuser; RLS wordt dan overgeslagen`);
    if (rij.bypass) bevindingen.push(`rol ${rij.rol} heeft BYPASSRLS`);
    if (rij.eigenaar_tabellen > 0) {
      bevindingen.push(
        `rol ${rij.rol} is eigenaar van ${rij.eigenaar_tabellen} tabellen in intel; een eigenaar omzeilt policies zonder FORCE ROW LEVEL SECURITY`,
      );
    }

    return {
      huidigeRol: rij.rol,
      isSuperuser: rij.super,
      heeftBypassRls: rij.bypass,
      isEigenaarVanTabellen: rij.eigenaar_tabellen > 0,
      veilig: bevindingen.length === 0,
      bevindingen,
    };
  });
}
