#!/usr/bin/env node
/* ============================================================
   CLI — afgeleide lagen herbouwen
   ------------------------------------------------------------
     npm run herbouw -- --ja       wis de afgeleide lagen
     npm run herbouw -- --droog    toon alleen wat er zou verdwijnen

   WAAROM DIT BESTAAT
   De bronlaag (bronnen, brondocumenten, versies) is het systeem van
   vastlegging. Alles daarna — gebeurtenissen, uitspraken, kandidaten —
   is afgeleid en kan uit die bronlaag opnieuw berekend worden. Zodra
   de onderwerpenlijst of de besluitmotor verandert, moet dat ook: oude
   gebeurtenissen dragen dan nog de classificatie van een oudere versie.

   WAT HET NIET DOET
   De bronlaag blijft staan; er wordt niets opnieuw opgehaald. En als er
   ook maar één publicatie geschreven is, weigert dit commando, want dan
   zou het publicatiespoor verdwijnen terwijl het bestand op de site
   blijft staan. Dat is precies het soort stil uiteenlopen dat niet mag.

   Draait als eigenaar, want de applicatierol heeft bewust geen
   DELETE op gebeurtenissen en uitspraken.
   ============================================================ */

import { maakPool, sluitAllePools, zonderOrganisatie } from "../kern/db.ts";
import { configLezen } from "../kern/config.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);

/**
 * Append-only tabellen. Die worden NOOIT gewist: de trigger
 * intel_priv.audit_is_append_only weigert elke DELETE, ook een die
 * nul rijen zou raken, en dat is precies de bedoeling. Staan er rijen
 * in, dan weigert dit commando in plaats van het auditspoor te breken.
 */
const APPEND_ONLY = ["publicatiebesluiten", "audit_gebeurtenissen"] as const;

/** Afgeleide tabellen, in een volgorde die de verwijzingen respecteert. */
const AFGELEID = [
  "inhoud_uitspraken",
  "publicaties",
  "inhoud_versies",
  "inhoud_kandidaten",
  "distributie_concepten",
  "signaal_bronnen",
  "commerciele_signalen",
  "regio_impacts",
  "uitspraak_geo",
  "uitspraak_bronnen",
  "uitspraken",
  "gebeurtenis_geo",
  "gebeurtenis_documenten",
  "markt_gebeurtenissen",
] as const;

async function main(): Promise<number> {
  const config = configLezen();
  if (config.omgeving === "productie" && !heeft("ja-ook-in-productie")) {
    process.stderr.write(
      "Weigering: in productie vereist dit --ja-ook-in-productie, en een goede reden.\n",
    );
    return 2;
  }

  // Eigenaarsrol: de applicatierol mag niet verwijderen.
  const pool = maakPool({ rol: null });

  return zonderOrganisatie(pool, async (c) => {
    const publicaties = await c.query<{ n: number }>(
      "select count(*)::int as n from intel.publicaties where status = 'geschreven'",
    );
    const aantalPublicaties = publicaties.rows[0]?.n ?? 0;
    if (aantalPublicaties > 0 && !heeft("ook-publicaties")) {
      process.stderr.write(
        `Weigering: er staan ${aantalPublicaties} geschreven publicaties. Die wissen zou het\n` +
          "publicatiespoor weghalen terwijl de bestanden op de site blijven staan.\n" +
          "Gebruik --ook-publicaties als dat echt de bedoeling is.\n",
      );
      return 2;
    }

    // Een auditspoor met rijen erin maakt een herbouw onmogelijk: de
    // besluiten verwijzen naar inhoudsversies die zouden verdwijnen.
    for (const tabel of APPEND_ONLY) {
      const r = await c.query<{ n: number }>(`select count(*)::int as n from intel.${tabel}`);
      const n = r.rows[0]?.n ?? 0;
      if (n > 0) {
        process.stderr.write(
          `Weigering: intel.${tabel} bevat ${n} rijen en is append-only. Een herbouw zou\n` +
            "verwijzingen naar verdwenen inhoudsversies achterlaten. Maak in dat geval een\n" +
            "nieuwe database aan in plaats van deze te herbouwen.\n",
        );
        return 2;
      }
    }

    process.stdout.write("AFGELEIDE LAGEN\n\n");
    let totaal = 0;
    for (const tabel of AFGELEID) {
      const r = await c.query<{ n: number }>(`select count(*)::int as n from intel.${tabel}`);
      const n = r.rows[0]?.n ?? 0;
      totaal += n;
      process.stdout.write(`  ${tabel.padEnd(26)} ${String(n).padStart(7)}\n`);
    }

    const bron = await c.query<{ documenten: number; versies: number }>(
      `select (select count(*)::int from intel.brondocumenten) as documenten,
              (select count(*)::int from intel.brondocument_versies) as versies`,
    );
    process.stdout.write(
      `\nBRONLAAG BLIJFT STAAN: ${bron.rows[0]?.documenten ?? 0} documenten, ` +
        `${bron.rows[0]?.versies ?? 0} versies\n`,
    );

    if (!heeft("ja")) {
      process.stdout.write(
        `\nDROOG: ${totaal} rijen zouden verdwijnen. Voeg --ja toe om het echt te doen.\n`,
      );
      return 0;
    }

    await c.query("begin");
    try {
      for (const tabel of AFGELEID) {
        await c.query(`delete from intel.${tabel}`);
      }
      await c.query("commit");
    } catch (e) {
      await c.query("rollback");
      throw e;
    }

    process.stdout.write(`\n${totaal} rijen gewist. Draai nu: npm run pijplijn && npm run besluit\n`);
    return 0;
  });
}

main().then(
  async (code) => {
    await sluitAllePools();
    process.exit(code);
  },
  async (e) => {
    process.stderr.write(`${(e as Error).stack ?? String(e)}\n`);
    await sluitAllePools();
    process.exit(1);
  },
);
