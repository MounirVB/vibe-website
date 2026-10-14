#!/usr/bin/env node
/* ============================================================
   CLI — meldmail: de alerteerder inspecteren en eenmalig testen
   ------------------------------------------------------------
     npm run meldmail                 de stand: configuratie en logboek
     npm run meldmail -- --plan       WAT er verstuurd zou worden (droog)
     npm run meldmail -- --test       EEN testmail, nu, naar de ontvanger
     npm run meldmail -- --ronde      een echte ronde draaien
     npm run meldmail -- --json       machineleesbaar

   WAAROM --test BUITEN DE AAN-SCHAKELAAR VALT
   `INTEL_MAIL_ACTIEF` bepaalt of de GEPLANDE taak mag alarmeren. Deze
   testmail is geen geplande taak maar een handeling van een mens, en hij
   is precies de end-to-end-proef die aan het akkoord voorafgaat. Hij
   verstuurt één bericht met soort TEST, legt de uitkomst vast in
   intel.meld_berichten, en raakt geen enkele openstaande melding aan.

   --plan SCHRIJFT NIETS. Het bouwt het plan op de echte stand en print
   de onderwerpen en de vingerafdrukken. Dat is de manier om te zien of
   de bundeling en de deduplicatie doen wat je verwacht, zonder dat er
   iemand een mail krijgt.
   ============================================================ */

import { laadEnvBestand } from "../kern/config.ts";
import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { mailBestemming, nederlandseTijd, verstuurMail } from "../ops/mail.ts";
import { bouwMailBericht } from "../ops/mailopmaak.ts";
import {
  bouwMeldplan,
  meldmailRonde,
  testVingerafdruk,
  verrijkMeldingen,
  type Meldingrij,
} from "../ops/meldmail.ts";

laadEnvBestand();

const heeft = (n: string) => process.argv.includes(`--${n}`);
const uit = (s: string) => process.stdout.write(s);

const VELDEN = `id, sleutel, groep, niveau, laatste_meting, laatste_advies,
                geopend_op::text as geopend_op, laatst_gezien_op::text as laatst_gezien_op,
                gesloten_op::text as gesloten_op, keren_gezien, bundel, ernst`;

const pool = maakPool();
try {
  const organisatieId = await huidigeOrganisatie(pool);
  const b = mailBestemming();
  const actief = /^(1|ja|aan|true)$/i.test((process.env["INTEL_MAIL_ACTIEF"] ?? "").trim());

  /* ---------------------------------------------------------- de stand */
  const logboek = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<{
      soort: string;
      bundel: string;
      ernst: string | null;
      onderwerp: string;
      pogingen: number;
      aangeboden: string | null;
      geaccepteerd: string | null;
      provider_id: string | null;
      laatste_fout: string | null;
    }>(
      c,
      `select soort, bundel, ernst, onderwerp, pogingen,
              aangeboden_op::text as aangeboden, geaccepteerd_op::text as geaccepteerd,
              provider_id, laatste_fout
         from intel.meld_berichten
        where organisatie_id = $1
        order by aangemaakt_op desc
        limit 20`,
      [organisatieId],
    ),
  );

  const openMeldingen = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<Meldingrij>(
      c,
      `select ${VELDEN} from intel.meldingen
        where organisatie_id = $1 and gesloten_op is null order by geopend_op`,
      [organisatieId],
    ),
  );

  if (heeft("json")) {
    console.log(
      JSON.stringify(
        {
          configuratie: b.soort === "geen" ? { soort: "geen", reden: b.reden } : { soort: b.soort, ontvanger: b.ontvanger, afzender: b.afzender },
          actief,
          open_meldingen: openMeldingen.length,
          met_ernst: openMeldingen.filter((m) => m.ernst).length,
          logboek,
        },
        null,
        2,
      ),
    );
  } else {
    uit("\nMELDMAIL\n");
    uit("=".repeat(78) + "\n\n");
    uit(`  configuratie       ${b.soort === "geen" ? `UIT — ${b.reden}` : `resend -> ${b.ontvanger}`}\n`);
    if (b.soort !== "geen") uit(`  afzender           ${b.afzender}\n`);
    uit(`  automatisch actief ${actief ? "JA" : "NEE (INTEL_MAIL_ACTIEF staat niet aan)"}\n`);
    uit(`  open meldingen     ${openMeldingen.length}, waarvan met ernst ${openMeldingen.filter((m) => m.ernst).length}\n`);
    uit("\n  OPEN MELDINGEN, met bundel en ernst\n");
    for (const m of openMeldingen) {
      uit(
        `    ${String(m.id).padStart(4)} ${(m.ernst ?? "geen alarm").padEnd(10)} ` +
          `${(m.bundel ?? "-").padEnd(26)} ${m.sleutel}\n`,
      );
    }
    uit(`\n  LOGBOEK (${logboek.length} recente berichten)\n`);
    if (logboek.length === 0) uit("    leeg — er is nog nooit een meldbericht aangeboden\n");
    for (const r of logboek) {
      const stand = r.geaccepteerd
        ? `GEACCEPTEERD ${nederlandseTijd(r.geaccepteerd)}`
        : r.aangeboden
          ? `AANGEBODEN, ${r.pogingen} poging(en)`
          : "nog niet aangeboden";
      uit(`    ${r.soort.padEnd(18)} ${r.bundel.padEnd(26)} ${stand}\n`);
      if (r.provider_id) uit(`      provider-id: ${r.provider_id}\n`);
      if (r.laatste_fout) uit(`      laatste fout: ${r.laatste_fout.slice(0, 160)}\n`);
    }
  }

  /* ----------------------------------------------------------- het plan */
  if (heeft("plan")) {
    const gesloten = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<Meldingrij>(
        c,
        `select ${VELDEN} from intel.meldingen
          where organisatie_id = $1 and gesloten_op is not null
            and gesloten_op > now() - interval '7 days' order by gesloten_op`,
        [organisatieId],
      ),
    );
    const eerder = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ bundel: string }>(
        c,
        `select distinct bundel from intel.meld_berichten
          where organisatie_id = $1 and soort in ('CRITICAL','FOUT','BEGINSAMENVATTING')`,
        [organisatieId],
      ),
    );
    const plan = bouwMeldplan({
      open: openMeldingen.filter((m) => m.ernst),
      gesloten,
      gemeldeBundels: new Set(eerder.map((x) => x.bundel)),
      /* Zelfde regel als in meldmailRonde: een TEST is geen alarm en
         gebruikt 'de eerste keer' niet op. Zou --plan hier anders
         rekenen dan de ronde, dan laat de droogloop iets anders zien dan
         er gebeurt, en dat is erger dan geen droogloop. */
      ooitGemeld: logboek.some((r) => r.soort !== "TEST"),
      nu: new Date(),
      monitorUrl: (process.env["INTEL_MONITOR_URL"] ?? "").trim() || null,
    });
    uit(`\n  PLAN — ${plan.length} bericht(en), NIETS GESCHREVEN EN NIETS VERSTUURD\n`);
    for (const p of plan) {
      uit(`\n    soort        ${p.soort}\n`);
      uit(`    bundel       ${p.bundel}\n`);
      uit(`    vingerafdruk ${p.vingerafdruk}\n`);
      uit(`    onderwerp    ${p.onderwerp}\n`);
      uit(`    meldingen    ${p.meldingIds.join(", ")}\n`);
      uit(`    tekstlengte  ${p.tekst.length}, htmllengte ${p.html.length}\n`);
    }
    uit("\n");
  }

  /* --------------------------------------------------------- de testmail */
  if (heeft("test")) {
    if (b.soort === "geen") {
      uit(`\n  TESTMAIL AFGEBROKEN — ${b.reden}\n\n`);
      process.exitCode = 2;
    } else {
      const nu = new Date();
      const vinger = testVingerafdruk(nu);
      const opmaak = bouwMailBericht({
        soort: "TEST",
        ernst: null,
        titel: "testbericht van de alerteerder",
        bundel: "test",
        meldingen: [
          {
            id: 0,
            sleutel: "melden/testbericht",
            groep: "melden",
            niveau: "NIET GEMETEN",
            meting:
              "Dit is een gecontroleerde testmail. Er is geen storing. Hij bewijst dat de keten " +
              "detectie -> classificatie -> wachtrij -> verzending -> registratie werkt, en dat " +
              "dit adres bereikbaar is.",
            advies:
              "Geen actie nodig. Bevestig de ontvangst, dan kan de automatische alarmering aan.",
            eersteDetectie: nederlandseTijd(nu),
            laatsteMeting: nederlandseTijd(nu),
            kerenGezien: 1,
            gesloten: null,
          },
        ],
        meldingId: `TEST-${vinger.slice(0, 12)}`,
        monitorUrl: (process.env["INTEL_MONITOR_URL"] ?? "").trim() || null,
        nu: nederlandseTijd(nu),
      });

      /* Eerst vastleggen, dan versturen. Een bericht dat verstuurd is maar
         niet geregistreerd staat is auditinformatie die we kwijt zijn; het
         omgekeerde is alleen een rij met een fout erbij. */
      /* DE GRENDEL GELDT OOK VOOR EEN TEST. `on conflict do nothing` plus
         de unieke index: is er in deze minuut al een testbericht, dan
         wordt er niets ingevoegd en gaat er niets de deur uit. Dat is de
         reparatie van 14 oktober 2026, toen een dubbele containerstart
         twee testmails verstuurde. */
      const id = await metOrganisatie(pool, { organisatieId }, async (c) => {
        const r = await c.query<{ id: number }>(
          `insert into intel.meld_berichten
             (organisatie_id, soort, bundel, vingerafdruk, ernst, onderwerp, html, tekst,
              aangeboden_op)
           values ($1,'TEST','test',$2,null,$3,$4,$5, now())
           on conflict (organisatie_id, soort, bundel, vingerafdruk) do nothing
           returning id`,
          [organisatieId, vinger, opmaak.onderwerp, opmaak.html, opmaak.tekst],
        );
        return r.rows[0]?.id ?? null;
      });
      if (id === null) {
        uit(`\n  TESTMAIL OVERGESLAGEN — er is in deze minuut al een testbericht aangeboden.\n`);
        uit("  Dat is de deduplicatiegrendel, niet een fout. Wacht een minuut voor een nieuwe test.\n\n");
        process.exitCode = 0;
      } else {

      uit(`\n  TESTMAIL naar ${b.ontvanger}\n`);
      uit(`    onderwerp  ${opmaak.onderwerp}\n`);
      uit(`    bericht-id ${id}\n`);
      const uitkomst = await verstuurMail(opmaak);
      await metOrganisatie(pool, { organisatieId }, (c) =>
        c.query(
          `update intel.meld_berichten
              set pogingen = pogingen + 1,
                  geaccepteerd_op = case when $2 then now() else null end,
                  provider = $3, provider_id = $4, laatste_fout = $5
            where id = $1`,
          [id, uitkomst.geaccepteerd, uitkomst.provider, uitkomst.providerId, uitkomst.fout],
        ),
      );
      if (uitkomst.geaccepteerd) {
        uit(`    UITKOMST   GEACCEPTEERD door ${uitkomst.provider}\n`);
        uit(`    provider-id ${uitkomst.providerId ?? "(geen id in het antwoord)"}\n`);
        uit("\n  Let op wat dit WEL en NIET bewijst: de provider heeft het bericht aangenomen.\n");
        uit("  Of het is AFGELEVERD en GELEZEN weten wij niet — daarvoor is een providerwebhook\n");
        uit("  nodig die niet is geconfigureerd. Die twee velden blijven dus leeg.\n\n");
      } else {
        uit(`    UITKOMST   NIET GEACCEPTEERD\n`);
        uit(`    fout       ${uitkomst.fout}\n`);
        uit(`    herhaalbaar ${uitkomst.herhaalbaar ? "ja" : "nee"}\n\n`);
        process.exitCode = 3;
      }
      }
    }
  }

  /* ------------------------------------------------------------ de ronde */
  if (heeft("ronde")) {
    const signalen = await (async () => {
      const { meetGezondheid } = await import("../ops/gezondheid.ts");
      const eigen = maakPool({ rol: null, max: 2 });
      return metOrganisatie(eigen, { organisatieId }, (c) => meetGezondheid(c, organisatieId));
    })();
    const stand = await metOrganisatie(pool, { organisatieId }, async (c) => {
      await verrijkMeldingen(c, organisatieId, signalen);
      return meldmailRonde(c, organisatieId);
    });
    uit(`\n  RONDE\n`);
    for (const [k, v] of Object.entries(stand)) uit(`    ${k.padEnd(16)}${v}\n`);
    uit("\n");
  }
} finally {
  await sluitAllePools();
}
