/* ============================================================
   OPS — postgres-gereedschap draaien zonder credential in argv
   ------------------------------------------------------------
   HET DEFECT DAT DIT OPLOST.

   `ops/backup.ts` gaf de verbindings-URL als laatste argument aan
   pg_dump, en `cli/restoretest.ts` doet hetzelfde bij psql. Twee
   gevolgen, beide gemeten:

   1 Node's execFile zet bij een fout de HELE commandoregel in
     `Error.message`. Die melding ging via kern/wachtrij.ts ongefilterd
     naar intel.taken.laatste_fout. Het productiewachtwoord stond
     daarmee in de database.
   2 Een commandoregel is op een machine met meer processen leesbaar
     (`ps`), en komt in shell- en containerlogs terecht.

   Postgres-gereedschap leest zijn verbinding net zo goed uit de
   OMGEVING (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE, PGSSLMODE).
   Die omgeving is per proces en staat niet in argv. Daarom bouwt dit
   bestand de omgeving en laat het de URL uit de argumenten weg.

   De tweede grendel staat in kern/geheimen.ts: mocht een gereedschap
   het wachtwoord alsnog in zijn uitvoer zetten, dan wordt het bij het
   doorgeven van de fout geredigeerd.
   ============================================================ */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { redigeer, wachtwoordUit } from "../kern/geheimen.ts";

const uitvoeren = promisify(execFile);

export type PgOmgeving = Record<string, string>;

/**
 * Zet een verbindings-URL om in PG*-omgevingsvariabelen.
 *
 * Werpt bij een onparseerbare URL, want stil doorgaan zou het
 * gereedschap op een DEFAULTVERBINDING laten uitkomen — en dat is in het
 * geval van restoretest de verkeerde database.
 */
export function pgOmgevingVan(url: string): PgOmgeving {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("de verbindings-URL is niet te parseren (de URL zelf staat bewust niet in deze melding)");
  }

  const omgeving: PgOmgeving = {};
  if (u.hostname) omgeving.PGHOST = u.hostname;
  if (u.port) omgeving.PGPORT = u.port;
  if (u.username) omgeving.PGUSER = decodeURIComponent(u.username);
  if (u.password) omgeving.PGPASSWORD = decodeURIComponent(u.password);

  const db = u.pathname.replace(/^\//, "");
  if (db) omgeving.PGDATABASE = decodeURIComponent(db);

  /* sslmode hoort bij de verbinding, niet bij het geheim. Railway's
     interne netwerk gebruikt hem niet, een externe proxy wel. */
  const ssl = u.searchParams.get("sslmode");
  if (ssl) omgeving.PGSSLMODE = ssl;

  return omgeving;
}

export type DraaiOpties = {
  /** Extra omgeving boven op de verbinding. */
  readonly omgeving?: Readonly<Record<string, string>>;
  readonly maxBuffer?: number;
  /** Extra letterlijke geheimen die uit een foutmelding moeten. */
  readonly geheimen?: readonly (string | null | undefined)[];
};

/**
 * Draait postgres-gereedschap met de verbinding in de omgeving.
 *
 * `args` mag GEEN verbindings-URL bevatten. Dat wordt hier afgedwongen:
 * een argument dat op een URL met credential lijkt is een programmeer-
 * fout en geen reden om stil door te gaan.
 */
export async function draaiPgGereedschap(
  binary: string,
  args: readonly string[],
  databaseUrl: string,
  opties: DraaiOpties = {},
): Promise<{ stdout: string; stderr: string }> {
  for (const a of args) {
    if (/:\/\/[^/@\s:]+:[^@\s]+@/.test(a)) {
      throw new Error(
        `argument ${args.indexOf(a)} van ${binary} bevat een credential; ` +
          "geef de verbinding via draaiPgGereedschap mee, niet via argv",
      );
    }
  }

  const omgeving = {
    ...process.env,
    ...pgOmgevingVan(databaseUrl),
    ...(opties.omgeving ?? {}),
  };
  const geheimen = [wachtwoordUit(databaseUrl), ...(opties.geheimen ?? [])];

  try {
    return await uitvoeren(binary, [...args], {
      env: omgeving,
      maxBuffer: opties.maxBuffer ?? 1024 * 1024 * 16,
    });
  } catch (e) {
    /* De fout van execFile draagt cmd, stdout en stderr. Alles wat we
       doorgeven gaat door de redactie, inclusief de letterlijke
       waarde van het wachtwoord. De oorzaak hangen we NIET aan: die
       zou via `cause` alsnog de ongefilterde message meenemen. */
    const ruw = e as { message?: string; stderr?: string; stdout?: string; code?: number };
    const deel = (s: string | undefined) => (s ? redigeer(s, geheimen) : "");
    const melding = [
      `${binary} mislukte`,
      ruw.code !== undefined ? `(code ${ruw.code})` : "",
      deel(ruw.stderr).trim() || deel(ruw.message).trim(),
    ]
      .filter(Boolean)
      .join(" ");
    throw new Error(melding.slice(0, 2000));
  }
}

/**
 * Zet een dump terug in de database waar `doelUrl` naar wijst.
 *
 * WAAROM DIT EEN GEDEELDE FUNCTIE IS EN GEEN ARGUMENTENLIJST OP TWEE
 * PLEKKEN.
 *
 * In 3.0.4 is bij het weghalen van de credential uit argv per ongeluk de
 * hele `--dbname <url>` verdwenen. pg_restore eist expliciet een van
 * -d/--dbname of -f/--file en stopte met:
 *
 *   pg_restore: error: one of -d/--dbname and -f/--file must be specified
 *
 * `npm run restoretest` was daarmee in productie stuk. De CI-toets bleef
 * groen omdat die zijn eigen execFile-aanroep had met zijn eigen
 * argumenten. Twee plekken die hetzelfde moeten doen lopen uiteen, en
 * dan bewijst de groene toets niets over het productiepad.
 *
 * Sinds 3.0.5 bouwt deze ene functie de argumenten, en gebruiken de CLI
 * én de integratietoets hem. De databasenaam komt uit de URL en is geen
 * geheim; host, gebruiker en wachtwoord blijven in de omgeving.
 */
export async function pgRestoreNaarDatabase(
  binary: string,
  dumpPad: string,
  doelUrl: string,
  opties: DraaiOpties = {},
): Promise<{ stdout: string; stderr: string }> {
  let databaseNaam: string;
  try {
    databaseNaam = new URL(doelUrl).pathname.replace(/^\//, "");
  } catch {
    throw new Error("de doel-URL is niet te parseren (de URL zelf staat bewust niet in deze melding)");
  }
  if (!databaseNaam) {
    throw new Error("de doel-URL noemt geen database; pg_restore zou dan naar een bestand schrijven");
  }
  return draaiPgGereedschap(
    binary,
    ["--dbname", databaseNaam, "--no-owner", "--no-privileges", "--exit-on-error", dumpPad],
    doelUrl,
    { maxBuffer: 256 * 1024 * 1024, ...opties },
  );
}
