/* ============================================================
   CLI — planner
   ------------------------------------------------------------
     npm run planner                 plan het huidige venster
     npm run planner -- --droog      alleen tonen wat hij zou plannen
     npm run planner -- --nu <iso>   plan alsof het dit tijdstip is

   DE PLANNER MAG DUBBEL DRAAIEN. Dat is geen bijkomstigheid maar het
   ontwerp: een cron die door een herstart of een overlappende run twee
   keer per uur afgaat mag niet twee keer werk aanmaken.

   Dat is op twee niveaus geregeld:

   1 PER TAAK. De idempotentiesleutel bevat het venster, bijvoorbeeld
     'ophalen:2026-10-10T12'. De unieke index
     taken_idempotent_uniek laat die precies één keer bestaan; een
     tweede poging is een 23505 en wordt door zetInWachtrij() als
     'bestaat al' geteld, niet als fout.

   2 PER PLANNERRUN. intel.planner_runs heeft een unieke constraint op
     (organisatie_id, soort, venster_sleutel) met `nulls not distinct`.
     Een tweede run in hetzelfde venster wordt vastgelegd als
     'overgeslagen' in plaats van opnieuw uitgevoerd.

   HET VENSTER IS EEN UUR, EN DAT IS EEN KEUZE
   De bronnen hebben een eigen ophaalinterval dat de collector zelf
   respecteert (hij meldt 'nog niet toe' of 'niet_gewijzigd'). De
   planner hoeft dus niet fijnmaziger te zijn dan het grofste interval
   dat hij bedient. Een uur is ruim onder elk bronninterval en houdt de
   sleutel leesbaar.

   WAT DE PLANNER NIET PLANT
   Publiceren. Er is geen taaksoort die een pagina live zet. De
   redactionele staat komt van een mens; een tijdslot is geen
   goedkeuring.
   ============================================================ */

import { laadEnvBestand } from "../kern/config.ts";
import { eenRij, maakPool, metOrganisatie, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { zetInWachtrij } from "../kern/wachtrij.ts";

laadEnvBestand();

const heeft = (naam: string) => process.argv.includes(`--${naam}`);
const waarde = (naam: string) => {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const DROOG = heeft("droog");
const nuRuw = waarde("nu");
const NU = nuRuw ? new Date(nuRuw) : new Date();
if (Number.isNaN(NU.getTime())) {
  console.error(`--nu '${nuRuw}' is geen geldig tijdstip`);
  process.exit(1);
}

/** Het uurvenster, bijvoorbeeld '2026-10-10T12'. */
const VENSTER = NU.toISOString().slice(0, 13);

/* De keten in de juiste orde. De prioriteit bepaalt welke taak een
   worker eerst pakt: ophalen voedt clusteren, clusteren voedt
   beoordelen, en zo verder. Een lager getal gaat voor. */
const PLAN: { soort: string; prioriteit: number; toelichting: string }[] = [
  { soort: "ophalen", prioriteit: 10, toelichting: "alle actieve bronnen; de collector respecteert zelf elk bronninterval" },
  { soort: "clusteren", prioriteit: 20, toelichting: "nieuwe bronversies naar gebeurtenissen en uitspraken" },
  { soort: "beoordelen", prioriteit: 30, toelichting: "de besluitmotor over nieuwe gebeurtenissen" },
  { soort: "regio", prioriteit: 40, toelichting: "gebieden binden en regiovoorstellen maken" },
  { soort: "signaleren", prioriteit: 50, toelichting: "commerciele signalen uit SALES_SIGNAL-kandidaten" },
];

const pool = maakPool();
try {
  const organisatieId = await huidigeOrganisatie(pool);

  console.log("");
  console.log(`PLANNER — venster ${VENSTER}${DROOG ? " (DROOG)" : ""}`);
  console.log("");

  let aangemaakt = 0;
  let overgeslagen = 0;

  const begin = performance.now();

  // De plannerrun zelf vastleggen. Bestaat hij al voor dit venster,
  // dan is dit een dubbele run en wordt er niets gepland.
  const run = DROOG
    ? { id: -1 }
    : await metOrganisatie(pool, { organisatieId }, (c) =>
        eenRij<{ id: number }>(
          c,
          `insert into intel.planner_runs (organisatie_id, soort, venster_sleutel)
           values ($1, 'keten', $2)
           on conflict (organisatie_id, soort, venster_sleutel) do nothing
           returning id`,
          [organisatieId, VENSTER],
        ),
      );

  if (!DROOG && !run) {
    console.log(`Er is in dit venster al een plannerrun geweest. Niets gepland.`);
    console.log(`Dat is bedoeld gedrag: de planner mag dubbel draaien.`);
  } else {
    for (const p of PLAN) {
      const sleutel = `${p.soort}:${VENSTER}`;
      if (DROOG) {
        console.log(`  ZOU PLANNEN  ${p.soort.padEnd(12)} sleutel ${sleutel}`);
        aangemaakt += 1;
        continue;
      }
      const uit = await metOrganisatie(pool, { organisatieId }, (c) =>
        zetInWachtrij(c, organisatieId, {
          soort: p.soort,
          idempotentieSleutel: sleutel,
          prioriteit: p.prioriteit,
          payload: { venster: VENSTER, toelichting: p.toelichting },
        }),
      );
      if (uit.nieuw) {
        aangemaakt += 1;
        console.log(`  GEPLAND      ${p.soort.padEnd(12)} taak ${uit.id}  (${sleutel})`);
      } else {
        overgeslagen += 1;
        console.log(`  BESTAAT AL   ${p.soort.padEnd(12)} ${uit.reden}`);
      }
    }

    if (!DROOG && run && run.id > 0) {
      await metOrganisatie(pool, { organisatieId }, (c) =>
        c.query(
          `update intel.planner_runs
              set afgerond_op = now(), duur_ms = $2, resultaat = 'ok',
                  taken_aangemaakt = $3, taken_overgeslagen = $4
            where id = $1`,
          [run.id, Math.round(performance.now() - begin), aangemaakt, overgeslagen],
        ),
      );
    }
  }

  console.log("");
  console.log(`taken aangemaakt   ${aangemaakt}`);
  console.log(`taken overgeslagen ${overgeslagen}`);
  console.log("");
  console.log("Publiceren staat NIET in dit plan. Een tijdslot is geen goedkeuring.");
} finally {
  await sluitAllePools();
}
