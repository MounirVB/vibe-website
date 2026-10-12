#!/usr/bin/env node
/* ============================================================
   CLI — een eenmalige instelsleutel uitgeven
   ------------------------------------------------------------
     npm run wachtwoordtoken -- --email <adres>
     npm run wachtwoordtoken -- --email <adres> --uren 4
     INTEL_INSTELSLEUTEL=<geheim> npm run wachtwoordtoken -- --email <adres>

   WAAROM DIT BESTAAT NAAST `npm run wachtwoord`

   `npm run wachtwoord` zet een wachtwoord dat de OPERATOR kiest. Dat is
   bruikbaar voor een noodgeval, maar het betekent dat iemand anders dan
   de eigenaar van het account het geheim kent, en dat dat geheim daarna
   ergens naartoe moet. Elke weg daarheen laat een kopie achter.

   Deze CLI geeft in plaats daarvan een eenmalige sleutel uit. De houder
   kiest daarna zelf een wachtwoord op /instellen. De operator ziet dat
   wachtwoord nooit.

   WAT ER DIRECT GEBEURT

   Het huidige wachtwoord wordt ONGELDIG en de sessie-epoch schuift op.
   Dat is geen bijwerking maar het doel: zonder die twee stappen zou een
   oud wachtwoord blijven werken zolang de sleutel niet is ingewisseld,
   en dan is er niets geroteerd.

   DE SLEUTEL WORDT ÉÉN KEER GEPRINT en nergens bewaard; de database
   bevat alleen zijn sha256. Kwijt is kwijt — dan maak je een nieuwe.

   DRAAI JE DIT OP EEN PLATFORM DAT DE UITVOER BEWAART, geef de sleutel
   dan mee via INTEL_INSTELSLEUTEL. De CLI print hem dan NIET. Railway
   bewaart de uitvoer van een pre-deploy of een eenmalige taak als
   deployment-log, en een geldige sleutel in zo'n archief overleeft zijn
   nut — precies de reden dat `npm run wachtwoord` zijn geheim ook uit de
   commandoregel heeft gehaald.
   ============================================================ */

import { laadEnvBestand, configLezen } from "../kern/config.ts";
import { maakPool, metOrganisatie, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { maakInstelsleutel } from "../dashboard/instellen.ts";

laadEnvBestand();

function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<number> {
  const email = argument("email");
  if (!email) {
    process.stderr.write("gebruik: npm run wachtwoordtoken -- --email <adres> [--uren 48]\n");
    return 2;
  }
  const uren = Number(argument("uren") ?? 48);
  if (!Number.isFinite(uren) || uren <= 0 || uren > 24 * 14) {
    process.stderr.write("--uren moet tussen 1 en 336 liggen\n");
    return 2;
  }

  /* Als EIGENAAR: wachtwoord_hash en sessie_epoch zijn sinds migratie
     0015 buiten bereik van de applicatierol, en het uitgeven van een
     sleutel is een operatorhandeling. */
  const pool = maakPool({ rol: null });
  const organisatieId = await huidigeOrganisatie(pool);
  const config = configLezen();

  const meegegeven = (process.env["INTEL_INSTELSLEUTEL"] ?? "").trim() || undefined;
  const uit = await metOrganisatie(pool, { organisatieId }, (c) =>
    maakInstelsleutel(c, organisatieId, email, {
      geldigMs: uren * 3600_000,
      uitgegevenDoor: "operator-cli",
      ...(meegegeven ? { sleutel: meegegeven } : {}),
    }),
  );

  const basis = config.siteBasisUrl.replace(/\/$/, "");
  process.stdout.write("\n");
  process.stdout.write(`INSTELSLEUTEL VOOR ${email}\n`);
  process.stdout.write("\n");
  if (meegegeven) {
    /* NIET printen: de sleutel kwam van buiten en de aanroeper heeft
       hem al. Alleen de vorm, zodat je kunt zien dat de juiste is
       gebruikt. */
    process.stdout.write(
      `  sleutel      meegegeven via INTEL_INSTELSLEUTEL (${uit.sleutel.length} tekens, niet geprint)\n`,
    );
  } else {
    process.stdout.write(`  sleutel      ${uit.sleutel}\n`);
  }
  process.stdout.write(`  geldig tot   ${uit.verlooptOp} (${uren} uur)\n`);
  process.stdout.write("\n");
  process.stdout.write("  Wissel hem in op het dashboard:\n");
  process.stdout.write(
    meegegeven ? "    /instellen?sleutel=<de sleutel die u hebt meegegeven>\n"
               : `    /instellen?sleutel=${uit.sleutel}\n`,
  );
  process.stdout.write("\n");
  process.stdout.write("  Het oude wachtwoord is NU ongeldig en lopende sessies zijn ingetrokken.\n");
  process.stdout.write("  Deze sleutel is eenmalig en wordt nergens bewaard; alleen zijn hash.\n");
  process.stdout.write(`  Basis-URL uit de configuratie: ${basis}\n`);
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
