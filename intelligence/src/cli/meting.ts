/* ============================================================
   CLI — meting: de productiestand, gemeten en gelogd
   ------------------------------------------------------------
   Draaien:  npm run meting            (leesbare tabel)
             npm run meting -- --json  (één JSON-regel)

   WAAROM DIT BESTAAT. De productiedatabase is privé-only en
   `railway connect` eist een SSH-sleutel. Dit commando draait IN
   Railway en zet het antwoord via de structuurlogger op stdout, waar
   het Railway-log het oppikt. Zo zijn de tellingen uit par. 27 en de
   0027-stand uit par. 19 meetbaar zonder de database bloot te leggen.

   STRIKT ALLEEN-LEZEN; zie ops/meting.ts. Veilig om in productie te
   draaien, ook naast een draaiende worker.
   ============================================================ */

import { laadEnvBestand } from "../kern/config.ts";
import { maakPool, metOrganisatie, sluitAllePools } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { meetProductie, type ProductieMeting } from "../ops/meting.ts";

laadEnvBestand();

const log = maakLogger("cli:meting");
const heeft = (n: string) => process.argv.includes(`--${n}`);

function tabel(m: ProductieMeting): void {
  const regel = (label: string, waarde: unknown) =>
    console.log(`  ${label.padEnd(38)}${String(waarde)}`);

  console.log("");
  console.log("VIBE ENERGY — PRODUCTIEMETING");
  console.log("=".repeat(72));
  console.log("");
  console.log("REDACTIONEEL");
  regel("kandidaten", m.kandidaten);
  regel("voorstellen", m.voorstellen);
  regel("volledige feitelijke revisies", m.volledigeFeitelijkeRevisies);
  regel("  waarvan READY_FOR_REVIEW", m.gereedFeitelijk);
  regel("READY_FOR_REVIEW alleen-link", m.gereedAlleenLink);
  regel("READY_FOR_REVIEW onvolledig", m.gereedOnvolledig);
  regel("APPROVED", m.goedgekeurd);
  regel("in publicatieketen", m.inPublicatieketen);
  regel("LIVE_VERIFIED", m.gepubliceerd);
  regel("REJECTED", m.afgewezen);
  regel("mislukte prechecks", m.mislukteprechecks);
  regel("geblokkeerd door een poort (FAIL)", m.geblokkeerdDoorPoort);
  console.log("");
  console.log("  per publicatie_status");
  for (const t of m.perPublicatieStatus) console.log(`    ${t.sleutel.padEnd(24)}${t.aantal}`);
  console.log("  per wijziging_soort");
  for (const t of m.perWijzigingSoort) console.log(`    ${t.sleutel.padEnd(24)}${t.aantal}`);
  console.log("  per eindoordeel");
  for (const t of m.perEindoordeel) console.log(`    ${t.sleutel.padEnd(24)}${t.aantal}`);

  console.log("");
  console.log("MIGRATIE 0027 — TIJDGRENS");
  regel("uitspraken totaal", m.uitspraken.totaal);
  regel("horizon is null", m.uitspraken.horizonNull);
  regel("schendt de tijdgrens", m.uitspraken.tijdgrensSchendingen);
  regel(
    "constraint gevalideerd",
    m.uitspraken.constraintGevalideerd === null
      ? "NIET GEVONDEN"
      : m.uitspraken.constraintGevalideerd
        ? "JA (validated)"
        : "NEE (not valid)",
  );
  if (m.uitspraken.tijdgrensSchendingen === 0 && m.uitspraken.constraintGevalideerd === false) {
    console.log("    → 0 schendingen: VALIDATE CONSTRAINT kan worden gedraaid.");
  }
  if (m.uitspraken.tijdgrensSchendingen > 0) {
    console.log("    → valideren mag NIET; eerst de schendende rijen herstellen.");
  }

  console.log("");
  console.log("CREDENTIALSPOREN IN intel.taken");
  regel("taken met een credential-URL", m.credentiallek.takenMetCredential);
  regel("soorten", m.credentiallek.soorten.join(", ") || "(geen)");
  if (m.credentiallek.takenMetCredential > 0) {
    console.log("    → BLOOTSTELLING: roteer de credential via de geautoriseerde procedure.");
  }

  console.log("");
  console.log("MIGRATIES");
  regel("toegepast", m.migraties.toegepast);
  regel("hoogste", m.migraties.hoogste ?? "(geen)");
  console.log("");
}

/* De eigenaarspool: deze meting leest intel.migraties en pg_constraint,
   en de applicatierol mag die eerste niet. Zie cli/gezondheid.ts, die
   om dezelfde reden `rol: null` gebruikt. */
const pool = maakPool({ rol: null });
try {
  const organisatieId = await huidigeOrganisatie(pool);
  const meting = await metOrganisatie(pool, { organisatieId }, (c) =>
    meetProductie(c, organisatieId),
  );

  if (heeft("json")) {
    console.log(JSON.stringify(meting, null, 2));
  } else {
    tabel(meting);
  }

  /* De structuurlogregel is het punt van dit commando: hij landt in het
     Railway-log en is daarmee het bewijsstuk. Platte getallen, zodat
     een log-zoekopdracht ze vindt. */
  log.info("productiemeting", {
    organisatie_id: meting.organisatieId,
    kandidaten: meting.kandidaten,
    voorstellen: meting.voorstellen,
    volledige_feitelijke_revisies: meting.volledigeFeitelijkeRevisies,
    gereed_feitelijk: meting.gereedFeitelijk,
    gereed_alleen_link: meting.gereedAlleenLink,
    gereed_onvolledig: meting.gereedOnvolledig,
    goedgekeurd: meting.goedgekeurd,
    in_publicatieketen: meting.inPublicatieketen,
    live_geverifieerd: meting.gepubliceerd,
    afgewezen: meting.afgewezen,
    mislukte_prechecks: meting.mislukteprechecks,
    geblokkeerd_door_poort: meting.geblokkeerdDoorPoort,
    uitspraken_totaal: meting.uitspraken.totaal,
    uitspraken_horizon_null: meting.uitspraken.horizonNull,
    tijdgrens_schendingen: meting.uitspraken.tijdgrensSchendingen,
    tijdgrens_constraint_gevalideerd: meting.uitspraken.constraintGevalideerd,
    taken_met_credential: meting.credentiallek.takenMetCredential,
    taken_met_credential_soorten: meting.credentiallek.soorten.join(",") || null,
    migraties_toegepast: meting.migraties.toegepast,
    migratie_hoogste: meting.migraties.hoogste,
  });

  /* Een blootstelling is geen 'geslaagde meting'. Exitcode 2 zodat een
     cron of een release hem niet over het hoofd ziet. */
  if (meting.credentiallek.takenMetCredential > 0) process.exitCode = 2;
} finally {
  await sluitAllePools();
}
