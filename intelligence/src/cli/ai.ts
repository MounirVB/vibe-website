/* ============================================================
   CLI — AI-provider: status, validatie, allowlist, tarieven
   ------------------------------------------------------------
     npm run ai                          toon de volledige stand
     npm run ai -- --valideer            valideer de sleutel (gratis)
     npm run ai -- --sta-model-toe --model <m> --reden "<r>"
     npm run ai -- --tarief --model <m> --in <p> --uit <p> \
                   --valuta USD --bron <https://...> --gemeten 2026-10-10
     npm run ai -- --reset-onderbreker

   `--valideer` doet een GET op /v1/models. Dat is geen generatie: er
   komt geen token aan te pas en er staat niets op de rekening. Er
   wordt dus NIETS declarabel geactiveerd door dit commando.

   De sleutel wordt nergens getoond. Wat je ziet is de vorm: prefix,
   laatste vier tekens en lengte.
   ============================================================ */

import { laadEnvBestand, configLezen } from "../kern/config.ts";
import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { isGepindModel } from "../inhoud/model.ts";
import {
  budgetStand,
  isModelToegestaan,
  legTariefVast,
  legValidatieVast,
  onderbrekerStand,
  sleutelVorm,
  valideerOpenAi,
} from "../ops/aibeheer.ts";

laadEnvBestand();
const config = configLezen();

const heeft = (n: string) => process.argv.includes(`--${n}`);
const waarde = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

/* Twee pools, en dat is geen omslachtigheid.
   -----------------------------------------
   De applicatierol vibe_intel_app heeft alleen SELECT op
   intel.ai_toegestane_modellen en intel.ai_prijzen. Dat is precies
   goed: de applicatie mag haar EIGEN model niet toestaan en haar
   EIGEN prijzen niet zetten. Dat zijn besluiten van een operator.

   Gevonden door de toetsen: een insert als applicatierol geeft
   'permission denied for table ai_toegestane_modellen'. De eerste
   versie van deze CLI deed dat en zou dus altijd gefaald hebben.
   Lezen gaat daarom via de applicatiepool, schrijven via de eigenaar. */
const pool = maakPool();
const beheerPool = maakPool({ rol: null });
try {
  const organisatieId = await huidigeOrganisatie(pool);

  /* ---------------- model toestaan ---------------- */
  if (heeft("sta-model-toe")) {
    const model = waarde("model") ?? config.aiModel;
    const reden = waarde("reden");
    if (!reden) {
      console.error("\n--reden is verplicht: een model toestaan is een besluit met een onderbouwing.");
      process.exit(2);
    }
    await metOrganisatie(beheerPool, { organisatieId }, (c) =>
      c.query(
        `insert into intel.ai_toegestane_modellen (provider, model, reden)
         values ('openai', $1, $2)
         on conflict (provider, model) do update set reden = excluded.reden`,
        [model, reden],
      ),
    );
    console.log(`\nmodel '${model}' op de allowlist gezet.`);
    console.log(`reden: ${reden}`);
    if (!isGepindModel(model)) {
      console.log("");
      console.log("LET OP: dit is geen vastgezette modelnaam. Een bewegende alias kan");
      console.log("morgen een ander model zijn, met andere uitkomsten en andere prijzen.");
    }
    process.exit(0);
  }

  /* ---------------- tarief vastleggen ---------------- */
  if (heeft("tarief")) {
    const invoer = {
      provider: "openai",
      model: waarde("model") ?? config.aiModel,
      prijsInPerMiljoen: Number(waarde("in")),
      prijsUitPerMiljoen: Number(waarde("uit")),
      valuta: (waarde("valuta") ?? "").toUpperCase(),
      bronUrl: waarde("bron") ?? "",
      gemetenOp: waarde("gemeten") ?? "",
    };
    try {
      await metOrganisatie(beheerPool, { organisatieId }, (c) => legTariefVast(c, invoer));
      console.log(`\ntarief vastgelegd voor ${invoer.model}.`);
      console.log(`bron: ${invoer.bronUrl} (gemeten ${invoer.gemetenOp})`);
      console.log("Vanaf nu krijgen nieuwe aanroepen kosten_bron = 'intel.ai_prijzen'");
      console.log("in plaats van 'onbekend'. Oude aanroepen blijven ONBEKEND: die zijn");
      console.log("gedaan zonder dat dit tarief bekend was.");
    } catch (e) {
      console.error(`\n${e instanceof Error ? e.message : String(e)}`);
      process.exit(2);
    }
    process.exit(0);
  }

  /* ---------------- onderbreker resetten ---------------- */
  if (heeft("reset-onderbreker")) {
    await metOrganisatie(pool, { organisatieId }, (c) =>
      c.query(
        `update intel.ai_stroomonderbreker
            set open_tot = null, reden = null, mislukt_achtereen = 0, bijgewerkt_op = now()
          where organisatie_id = $1`,
        [organisatieId],
      ),
    );
    console.log("\nstroomonderbreker gesloten. De teller staat op nul.");
    process.exit(0);
  }

  /* ---------------- status ---------------- */
  const vorm = sleutelVorm(process.env["OPENAI_API_KEY"]);

  console.log("");
  console.log("AI-PROVIDER");
  console.log("");
  console.log(`  provider            ${config.aiProvider}`);
  console.log(`  model (configuratie)${" ".repeat(0)} ${config.aiModel}`);
  console.log(`  vastgezette naam    ${isGepindModel(config.aiModel) ? "JA" : "NEE — dit is een bewegende alias"}`);
  console.log(`  sleutel             ${vorm.aanwezig ? vorm.vingerafdruk : "ONTBREEKT"}`);
  console.log(`  netwerk toegestaan  ${config.netwerkToegestaan ? "ja" : "nee (INTEL_NETWERK_TOEGESTAAN=0)"}`);
  console.log(`  max tokens uit      ${config.aiMaxTokensUit} per aanroep`);

  /* ---------------- validatie ---------------- */
  if (heeft("valideer")) {
    console.log("");
    console.log("VALIDATIE — GET /v1/models (niet declarabel)");
    const uit = await valideerOpenAi();
    await metOrganisatie(pool, { organisatieId }, (c) => legValidatieVast(c, organisatieId, uit));
    console.log("");
    console.log(`  geldig              ${uit.geldig ? "JA" : "NEE"}`);
    console.log(`  http                ${uit.httpStatus ?? "geen antwoord"}`);
    console.log(`  model beschikbaar   ${uit.modelBeschikbaar === null ? "niet vastgesteld" : uit.modelBeschikbaar ? "JA" : "NEE"}`);
    console.log(`  duur                ${uit.duurMs} ms`);
    console.log(`  bewijs              ${uit.bewijs}`);
  } else {
    const k = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ vertrouwd: boolean; gevalideerd_op: string | null; validatie_bewijs: string | null }>(
        c,
        "select vertrouwd, gevalideerd_op::text as gevalideerd_op, validatie_bewijs from intel.koppelingen where organisatie_id = $1 and sleutel = 'ai_model'",
        [organisatieId],
      ),
    );
    const r = k[0];
    console.log("");
    console.log("VERTROUWEN");
    console.log(`  vertrouwd           ${r?.vertrouwd ? "JA" : "NEE"}`);
    console.log(`  gevalideerd op      ${r?.gevalideerd_op ?? "nooit"}`);
    if (r?.validatie_bewijs) console.log(`  bewijs              ${r.validatie_bewijs}`);
    if (!r?.vertrouwd) {
      console.log("");
      console.log("  Een aanwezige sleutel is geen werkende sleutel. Draai");
      console.log("  `npm run ai -- --valideer` om hem te toetsen; dat kost niets.");
    }
  }

  /* ---------------- allowlist ---------------- */
  const allow = await metOrganisatie(pool, { organisatieId }, (c) =>
    isModelToegestaan(c, "openai", config.aiModel),
  );
  const modellen = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<{ model: string; toegestaan_op: string; reden: string }>(
      c,
      "select model, toegestaan_op::text as toegestaan_op, reden from intel.ai_toegestane_modellen where provider = 'openai' order by model",
    ),
  );
  console.log("");
  console.log("ALLOWLIST");
  console.log(`  ${config.aiModel} ${allow.toegestaan ? "TOEGESTAAN" : "NIET TOEGESTAAN"}`);
  console.log(`  ${allow.reden}`);
  for (const m of modellen) console.log(`    · ${m.model} (sinds ${m.toegestaan_op}) — ${m.reden}`);

  /* ---------------- tarieven ---------------- */
  const tarieven = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<{
      model: string;
      prijs_in_per_miljoen: string;
      prijs_uit_per_miljoen: string;
      valuta: string;
      bron_url: string;
      gemeten_op: string;
    }>(
      c,
      "select model, prijs_in_per_miljoen, prijs_uit_per_miljoen, valuta, bron_url, gemeten_op::text as gemeten_op from intel.ai_prijzen order by model",
    ),
  );
  console.log("");
  console.log("TARIEVEN");
  if (!tarieven.length) {
    console.log("  GEEN. Kosten blijven daarom ONBEKEND, en dat is geen nul.");
    console.log("  Een tarief vastleggen vraagt een bron-URL en een meetdatum:");
    console.log("    npm run ai -- --tarief --model <m> --in <p> --uit <p> \\");
    console.log("                  --valuta USD --bron <https://...> --gemeten <ISO-datum>");
  } else {
    for (const t of tarieven) {
      console.log(
        `  ${t.model}  in ${t.prijs_in_per_miljoen}/M, uit ${t.prijs_uit_per_miljoen}/M ${t.valuta}`,
      );
      console.log(`      bron ${t.bron_url} (gemeten ${t.gemeten_op})`);
    }
  }

  /* ---------------- budget ---------------- */
  const b = await metOrganisatie(pool, { organisatieId }, (c) => budgetStand(c, organisatieId));
  console.log("");
  console.log("BUDGET");
  console.log(`  mag aanroepen       ${b.mag ? "JA" : "NEE"} — ${b.reden}`);
  console.log(`  aanroepen vandaag   ${b.dagAanroepen.gebruikt} / ${b.dagAanroepen.plafond ?? "geen plafond"}`);
  console.log(`  aanroepen maand     ${b.maandAanroepen.gebruikt} / ${b.maandAanroepen.plafond ?? "geen plafond"}`);
  console.log(`  uitvoertokens maand ${b.maandTokensUit.gebruikt} / ${b.maandTokensUit.plafond ?? "geen plafond"}`);
  console.log(
    `  gemeten kosten maand ${b.maandKosten.gemeten.toFixed(4)} ${b.maandKosten.valuta ?? ""} / ` +
      `${b.maandKosten.plafond ?? "geen plafond"}`,
  );
  if (b.maandKosten.onbekendeAanroepen > 0) {
    console.log(
      `  LET OP: ${b.maandKosten.onbekendeAanroepen} aanroep(en) deze maand hebben ONBEKENDE kosten`,
    );
    console.log("  (geen tarief vastgelegd). Die tellen NIET mee in de kostengrens; een");
    console.log("  geschat bedrag zou het platform stilzetten op een ongemeten getal.");
  }

  /* ---------------- onderbreker ---------------- */
  const o = await metOrganisatie(pool, { organisatieId }, (c) => onderbrekerStand(c, organisatieId));
  console.log("");
  console.log("STROOMONDERBREKER");
  console.log(`  open                ${o.open ? `JA tot ${o.openTot}` : "nee"}`);
  if (o.reden) console.log(`  reden               ${o.reden}`);
  console.log(`  mislukt achtereen   ${o.misluktAchtereen}`);
} finally {
  await sluitAllePools();
}
