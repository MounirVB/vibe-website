#!/usr/bin/env node
/* ============================================================
   CLI — wachtwoord zetten
   ------------------------------------------------------------
     npm run wachtwoord -- --email <adres> --wachtwoord <geheim>
     INTEL_WACHTWOORD=<geheim> npm run wachtwoord -- --email <adres>

   Gebruikers worden zonder hash gezaaid; zonder deze stap kan er niet
   ingelogd worden. Minimaal twaalf tekens.

   DE TWEEDE VORM BESTAAT OM EEN LEK TE VOORKOMEN. npm echoot de
   volledige commandoregel naar stdout, en een platform als Railway
   bewaart die uitvoer als deployment-log. `--wachtwoord` op de
   commandoregel zet het productiewachtwoord dus in een logarchief.
   Via de omgeving gebeurt dat niet.
   ============================================================ */
import { maakPool, metOrganisatie, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { maakWachtwoordHash } from "../dashboard/auth.ts";

function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<number> {
  const email = argument("email");
  const wachtwoord = argument("wachtwoord") ?? process.env["INTEL_WACHTWOORD"];
  if (!email || !wachtwoord) {
    process.stderr.write("gebruik: npm run wachtwoord -- --email <adres> --wachtwoord <geheim>\n");
    process.stderr.write("   of:  INTEL_WACHTWOORD=<geheim> npm run wachtwoord -- --email <adres>\n");
    return 2;
  }
  // De minimumlengte wordt NIET hier bewaakt maar in maakWachtwoordHash();
  // één plek voor één regel. Die gooit een IntelFout met uitleg.
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);
  const hash = await maakWachtwoordHash(wachtwoord);

  const geraakt = await metOrganisatie(pool, { organisatieId }, async (c) => {
    const r = await c.query(
      "update intel.gebruikers set wachtwoord_hash = $2 where lower(email) = lower($1) returning id",
      [email, hash],
    );
    return r.rowCount ?? 0;
  });

  if (geraakt === 0) {
    process.stderr.write(`geen gebruiker met e-mail ${email}\n`);
    return 1;
  }
  process.stdout.write(`wachtwoord gezet voor ${email}\n`);
  return 0;
}

main().then(
  async (code) => {
    await sluitAllePools();
    process.exit(code);
  },
  async (e) => {
    process.stderr.write(`${(e as Error).message}\n`);
    await sluitAllePools();
    process.exit(1);
  },
);
