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
import { PLAN, wekelijksVenster } from "../kern/taken.ts";
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

/* Het PLAN staat sinds 3.0.4 in kern/taken.ts, naast het register van
   taaksoorten, zodat een toets kan bewijzen dat elke geplande soort ook
   een handler heeft. Zie de toelichting in dat bestand. */

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
      /* Een dagelijkse taak krijgt de DATUM als venster; de uurlijkse de
         datum met het uur erbij. De sleutel bepaalt dus de frequentie. */
      /* En een WEKELIJKSE taak krijgt alleen een venster op zijn eigen
         weekdag, ná zijn eigen uur. Buiten dat moment geeft
         wekelijksVenster() null terug en wordt er niets gepland — wat
         iets anders is dan 'bestaat al', dus het staat er ook anders. */
      const venster = p.wekelijks
        ? wekelijksVenster(NU, p.wekelijks)
        : p.dagelijks
          ? VENSTER.slice(0, 10)
          : VENSTER;
      if (venster === null) {
        overgeslagen += 1;
        console.log(
          `  NIET NU      ${p.soort.padEnd(17)} wekelijks: weekdag ${p.wekelijks?.weekdagUtc} vanaf ${p.wekelijks?.vanafUurUtc}:00 UTC`,
        );
        continue;
      }
      const sleutel = `${p.soort}:${venster}`;
      if (DROOG) {
        console.log(`  ZOU PLANNEN  ${p.soort.padEnd(17)} sleutel ${sleutel}`);
        aangemaakt += 1;
        continue;
      }
      const uit = await metOrganisatie(pool, { organisatieId }, (c) =>
        zetInWachtrij(c, organisatieId, {
          soort: p.soort,
          idempotentieSleutel: sleutel,
          prioriteit: p.prioriteit,
          payload: { venster, toelichting: p.toelichting },
        }),
      );
      if (uit.nieuw) {
        aangemaakt += 1;
        console.log(`  GEPLAND      ${p.soort.padEnd(17)} taak ${uit.id}  (${sleutel})`);
      } else {
        overgeslagen += 1;
        console.log(`  BESTAAT AL   ${p.soort.padEnd(17)} ${uit.reden}`);
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
