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
  regel("POORTMISMATCH (gereed mét een FAIL)", m.poortMismatch);
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
    console.log("    → valideren mag NIET; eerst de schendende rijen beoordelen.");
    for (const r of m.uitspraken.schendingen) {
      console.log(`      uitspraak ${r.id} (${r.fenomeen ?? "geen fenomeen"}): ${r.tekst}`);
    }
    console.log("    → een horizon mag NIET worden verzonnen. Is er gezaghebbend bewijs,");
    console.log("      gebruik dan de append-only correctieweg; anders blijft dit een");
    console.log("      gedocumenteerde uitzondering en blijft de constraint NOT VALID.");
  }

  console.log("");
  console.log("CREDENTIALSPOREN IN intel.taken");
  regel("taken met een credential-URL", m.credentiallek.takenMetCredential);
  regel("soorten", m.credentiallek.soorten.join(", ") || "(geen)");
  if (m.credentiallek.takenMetCredential > 0) {
    console.log("    → BLOOTSTELLING: roteer de credential via de geautoriseerde procedure.");
  }

  console.log("");
  console.log("PRIMAIRE BLOKKEERREDEN PER VOORSTEL");
  for (const t of m.blokkeerredenen) console.log(`    ${t.sleutel.padEnd(34)}${t.aantal}`);

  console.log("");
  console.log("BRONDEKKING");
  regel("bronnen totaal", m.brondekking.totaal);
  regel("actief", m.brondekking.actief);
  regel("  waarvan nu toe", m.brondekking.toe);
  regel("  nog niet toe", m.brondekking.nietToe);
  for (const [k, v] of Object.entries(m.brondekking.perKlasse)) regel(`  ${k}`, v);
  regel("laatste geslaagde ophaling", m.brondekking.laatsteGeslaagdeOphaling ?? "nooit");
  if (m.brondekking.perKlasse.FAILED > 0 || m.brondekking.perKlasse.DEGRADED > 0) {
    console.log("");
    for (const b of m.brondekking.bronnen.filter((x) => x.klasse === "FAILED" || x.klasse === "DEGRADED")) {
      console.log(`    ${b.klasse.padEnd(18)}${b.sleutel.padEnd(34)}${b.reden}`);
    }
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
    poort_mismatch: meting.poortMismatch,
    goedgekeurd: meting.goedgekeurd,
    in_publicatieketen: meting.inPublicatieketen,
    live_geverifieerd: meting.gepubliceerd,
    afgewezen: meting.afgewezen,
    mislukte_prechecks: meting.mislukteprechecks,
    geblokkeerd_door_poort: meting.geblokkeerdDoorPoort,
    uitspraken_totaal: meting.uitspraken.totaal,
    uitspraken_horizon_null: meting.uitspraken.horizonNull,
    tijdgrens_schendingen: meting.uitspraken.tijdgrensSchendingen,
    tijdgrens_schendende_ids: meting.uitspraken.schendingen.map((r) => r.id).join(",") || null,
    tijdgrens_constraint_gevalideerd: meting.uitspraken.constraintGevalideerd,
    taken_met_credential: meting.credentiallek.takenMetCredential,
    taken_met_credential_soorten: meting.credentiallek.soorten.join(",") || null,
    migraties_toegepast: meting.migraties.toegepast,
    blokkeerredenen: meting.blokkeerredenen.map((t) => `${t.sleutel}=${t.aantal}`).join(",") || null,
    bronnen_totaal: meting.brondekking.totaal,
    bronnen_actief: meting.brondekking.actief,
    bronnen_toe: meting.brondekking.toe,
    bronnen_niet_toe: meting.brondekking.nietToe,
    bronnen_success: meting.brondekking.perKlasse.SUCCESS,
    bronnen_degraded: meting.brondekking.perKlasse.DEGRADED,
    bronnen_failed: meting.brondekking.perKlasse.FAILED,
    bronnen_access_restricted: meting.brondekking.perKlasse.ACCESS_RESTRICTED,
    bronnen_disabled: meting.brondekking.perKlasse.DISABLED,
    bronnen_onbekend: meting.brondekking.perKlasse.ONBEKEND,
    bronnen_laatste_ophaling: meting.brondekking.laatsteGeslaagdeOphaling,
    migratie_hoogste: meting.migraties.hoogste,
  });

  /* Een blootstelling is geen 'geslaagde meting'. Exitcode 2 zodat een
     cron of een release hem niet over het hoofd ziet. */
  if (meting.credentiallek.takenMetCredential > 0) process.exitCode = 2;
  /* Een rij die READY_FOR_REVIEW heet terwijl een controle faalt is een
     tegenspraak, niet een detail. Exitcode 3 zodat een release hem ziet. */
  if (meting.poortMismatch > 0) {
    console.error(
      `POORTMISMATCH: ${meting.poortMismatch} voorstel(len) staan op READY_FOR_REVIEW ` +
        `terwijl een opgeslagen controle op FAIL staat. Draai migratie 0032 of onderzoek de rij.`,
    );
    process.exitCode = 3;
  }
} finally {
  await sluitAllePools();
}
