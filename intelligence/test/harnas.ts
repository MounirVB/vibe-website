/* ============================================================
   TEST — harnas
   ------------------------------------------------------------
   Elke integratietest krijgt een EIGEN database met een unieke naam.
   Dat is geen netheid maar noodzaak: op deze machine draaien
   regelmatig meerdere sessies tegelijk, en een harnas met een vaste
   databasenaam laat die sessies elkaars fixtures wissen. De fout die
   dat oplevert ziet uit als een echte regressie en is er geen.

   De naam bevat het proces-id en een teller, dus twee gelijktijdige
   runs raken elkaar niet. Na de test wordt de database weer
   weggegooid, ook als de test faalt.

   Het netwerk staat in tests UIT (INTEL_NETWERK_TOEGESTAAN=0). Een
   test die een bron wil nabootsen geeft zijn eigen payload mee; een
   test die stil het internet op gaat is geen test maar een meting.
   ============================================================ */

import pg from "pg";
import { configVergeten, laadEnvBestand } from "../src/kern/config.ts";
import { maakPool, sluitAllePools, zonderOrganisatie, type Pool } from "../src/kern/db.ts";
import { migreer } from "../src/db/migraties.ts";

let teller = 0;

/** DSN naar de beheerdatabase, afgeleid van INTEL_DB_URL. */
function beheerUrl(): { basis: string; beheer: string } {
  // De testrunner leest .env niet zelf; de harnas doet dat wel, zodat
  // `node --test` zonder omgevingsgeknutsel werkt.
  laadEnvBestand();
  const basis = process.env["INTEL_DB_URL"];
  if (!basis) throw new Error("INTEL_DB_URL ontbreekt; tests hebben een database nodig");
  const u = new URL(basis);
  const beheer = new URL(basis);
  beheer.pathname = "/postgres";
  return { basis: u.toString(), beheer: beheer.toString() };
}

export type Wegwerpdatabase = {
  readonly naam: string;
  readonly url: string;
  readonly pool: Pool;
  opruimen(): Promise<void>;
};

export async function maakWegwerpdatabase(label: string): Promise<Wegwerpdatabase> {
  teller += 1;
  const schoon = label.replace(/[^a-z0-9]/gi, "").slice(0, 16).toLowerCase();
  const naam = `vibe_intel_t_${schoon}_${process.pid}_${teller}`;
  const { beheer } = beheerUrl();

  const beheerClient = new pg.Client({ connectionString: beheer });
  await beheerClient.connect();
  try {
    await beheerClient.query(`drop database if exists ${naam}`);
    await beheerClient.query(`create database ${naam}`);
  } finally {
    await beheerClient.end();
  }

  const url = (() => {
    const u = new URL(beheer);
    u.pathname = `/${naam}`;
    return u.toString();
  })();

  // Migreren als eigenaar, zonder SET ROLE.
  const eigenaar = new pg.Client({
    connectionString: url,
    options: "-c search_path=intel,public",
  });
  await eigenaar.connect();
  try {
    await migreer(eigenaar);
  } finally {
    await eigenaar.end();
  }

  // De applicatiepool neemt wel de rol aan, dus RLS geldt in tests.
  configVergeten();
  process.env["INTEL_NETWERK_TOEGESTAAN"] = "0";
  const pool = maakPool({ databaseUrl: url, rol: "vibe_intel_app", max: 4 });

  return {
    naam,
    url,
    pool,
    async opruimen() {
      await sluitAllePools();
      const opruimClient = new pg.Client({ connectionString: beheer });
      await opruimClient.connect();
      try {
        await opruimClient.query(
          `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1`,
          [naam],
        );
        await opruimClient.query(`drop database if exists ${naam}`);
      } finally {
        await opruimClient.end();
      }
    },
  };
}

/** Maakt een organisatie aan als eigenaar en geeft het id terug. */
export async function maakOrganisatie(db: Wegwerpdatabase, sleutel: string): Promise<number> {
  const eigenaar = new pg.Client({
    connectionString: db.url,
    options: "-c search_path=intel,public",
  });
  await eigenaar.connect();
  try {
    const r = await eigenaar.query<{ id: number }>(
      `insert into intel.organisaties (sleutel, naam) values ($1, $2) returning id`,
      [sleutel, `Test ${sleutel}`],
    );
    const id = r.rows[0]?.id;
    if (id === undefined) throw new Error("organisatie niet aangemaakt");
    return id;
  } finally {
    await eigenaar.end();
  }
}

/** Maakt een gebruiker met rol en geeft het id terug. */
export async function maakGebruiker(
  db: Wegwerpdatabase,
  organisatieId: number,
  email: string,
  rol: string,
): Promise<number> {
  const eigenaar = new pg.Client({
    connectionString: db.url,
    options: "-c search_path=intel,public",
  });
  await eigenaar.connect();
  try {
    const r = await eigenaar.query<{ id: number }>(
      `insert into intel.gebruikers (organisatie_id, email, naam) values ($1, $2, $3) returning id`,
      [organisatieId, email, email],
    );
    const id = r.rows[0]?.id;
    if (id === undefined) throw new Error("gebruiker niet aangemaakt");
    await eigenaar.query(
      `insert into intel.gebruiker_rollen (gebruiker_id, rol) values ($1, $2)`,
      [id, rol],
    );
    return id;
  } finally {
    await eigenaar.end();
  }
}

/** Query als eigenaar; voor opzet die de applicatierol niet mag. */
export async function alsEigenaar<T>(
  db: Wegwerpdatabase,
  werk: (c: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({
    connectionString: db.url,
    options: "-c search_path=intel,public",
  });
  await client.connect();
  try {
    return await werk(client);
  } finally {
    await client.end();
  }
}

/** Alle invariantbevindingen; leeg betekent dat de aannames kloppen. */
export async function invarianten(db: Wegwerpdatabase): Promise<string[]> {
  return zonderOrganisatie(db.pool, async (c) => {
    const a = await c.query<{ r: string }>(
      "select soort || ': ' || bevinding as r from intel_priv.controleer_invarianten()",
    );
    const b = await c.query<{ r: string }>(
      "select soort || ': ' || bevinding as r from intel_priv.controleer_inhoudsinvarianten()",
    );
    return [...a.rows, ...b.rows].map((x) => x.r);
  });
}
