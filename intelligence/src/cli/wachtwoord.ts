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
  /* Als EIGENAAR en niet als applicatierol. Migratie 0015 heeft
     vibe_intel_app het tabelbrede update-recht op intel.gebruikers
     afgenomen en teruggebracht tot alleen `laatste_login`; een
     wachtwoordrotatie is een operatorhandeling, net als `npm run backup`
     en het vastleggen van AI-tarieven. */
  const pool = maakPool({ rol: null });
  const organisatieId = await huidigeOrganisatie(pool);
  const hash = await maakWachtwoordHash(wachtwoord);

  const geraakt = await metOrganisatie(pool, { organisatieId }, async (c) => {
    /* `sessie_epoch + 1` is het hele punt van een rotatie.
       Zonder die kolombijwerking blijft elk eerder uitgegeven
       sessiekoekje acht uur geldig — ook dat van degene om wie je het
       wachtwoord verandert. Een rotatie die de lopende sessie niet
       verbreekt, beschermt tegen niemand. Zie migratie 0015. */
    /* `organisatie_id = $3` staat er EXPLICIET bij en niet omdat RLS het
       toch wel doet. Deze query draait nu als eigenaar, en een
       tabeleigenaar omzeilt RLS; zonder deze voorwaarde zou de rotatie
       elke organisatie met dit e-mailadres raken in plaats van alleen de
       huidige. Een grendel die van RLS afhangt, hoort niet in een pad
       dat RLS omzeilt. */
    const r = await c.query(
      `update intel.gebruikers
          set wachtwoord_hash = $2,
              sessie_epoch = sessie_epoch + 1
        where lower(email) = lower($1)
          and organisatie_id = $3
      returning id, sessie_epoch`,
      [email, hash, organisatieId],
    );
    return r.rowCount ?? 0;
  });

  if (geraakt === 0) {
    process.stderr.write(`geen gebruiker met e-mail ${email}\n`);
    return 1;
  }
  process.stdout.write(`wachtwoord gezet voor ${email}\n`);
  process.stdout.write("alle lopende sessies van deze gebruiker zijn ingetrokken\n");
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
