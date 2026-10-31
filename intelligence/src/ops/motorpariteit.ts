/* ============================================================
   OPS — motorpariteit: draait deze code op een database die hem kent?
   ------------------------------------------------------------
   HET PROBLEEM, GEMETEN OP 31 OKTOBER 2026.

   DOCUMENTSOORT_VERSIE is een CODECONSTANTE
   (src/pijplijn/documentsoort.ts), geen omgevingsvlag. Op origin/main
   staat hij op 'documentsoort-v1', op de releasebranch op
   'documentsoort-v2'. De database moet daarbij passen: migratie 0045
   voegt de kolom `documentvorm` toe en verruimt de CHECK op
   `documentsoort` met NIEUWSBERICHT_REGELGEVING en ONTWERPBESLUIT.

   Een GEDEELTELIJKE deployment zet die twee uit elkaar, en dat kan twee
   kanten op misgaan:

   1 CODE v2, DATABASE OUD. De classificatie schrijft
     NIEUWSBERICHT_REGELGEVING en de CHECK versies_documentsoort weigert
     de rij. Elke ophaalronde loopt dan vast op een constraintfout, per
     document, zonder dat iemand kan zien dat de oorzaak een ontbrekende
     migratie is.

   2 CODE v1, DATABASE NIEUW. Minder erg — de verruimde CHECK keurt per
     definitie niets af wat v1 schrijft — maar wel verwarrend: de kolom
     `documentvorm` blijft dan overal NULL terwijl het schema suggereert
     dat hij gevuld wordt.

   WAT DEZE MODULE DOET. Hij stelt vóór het werk vast of de database de
   motorversie van DEZE code ondersteunt, en geeft een BENOEMDE
   uitkomst. De planner en de worker weigeren erop; ze draaien niet half.

   WAAROM EEN SCHEMAPROBE EN GEEN MIGRATIETELLING. Een telling in
   intel.migraties zegt alleen dat een BESTANDSNAAM is toegepast. Deze
   probe kijkt naar wat er werkelijk in het schema staat, en is daarmee
   immuun voor een migratie die wel geregistreerd is maar niet is
   doorgekomen — precies de drift waar de CI-stap 'Migraties toepassen en
   op drift controleren' ook op let.
   ============================================================ */

import { eenRij, type Leesclient } from "../kern/db.ts";
import { DOCUMENTSOORT_VERSIE } from "../pijplijn/documentsoort.ts";

/** De soorten die 0045 aan de CHECK toevoegt. Zonder deze is de database v1. */
const V2_SOORTEN = ["NIEUWSBERICHT_REGELGEVING", "ONTWERPBESLUIT"] as const;

export type Pariteit = {
  /** Mag deze code met deze database werken? */
  readonly sluit: boolean;
  /** De motorversie die de CODE draagt. */
  readonly codeVersie: string;
  /** Wat de DATABASE ondersteunt: 'v1' of 'v2'. */
  readonly databaseVersie: "v1" | "v2";
  /** Een regel die zegt WAT er mist, niet dat er 'iets' mis is. */
  readonly bewijs: string;
};

type ProbeRij = {
  heeft_documentvorm: boolean;
  check_definitie: string | null;
  heeft_plannerpauze: boolean;
  heeft_pauzefunctie: boolean;
};

/**
 * Meet de database en vergelijk met de codeconstante.
 *
 * Fail-closed: kan de probe niet worden uitgevoerd, dan is het antwoord
 * NIET 'het zit wel goed'. Een onbekende stand is een weigering, want de
 * schade van doorgaan is een vastgelopen ophaalronde per document.
 */
export async function motorpariteit(client: Leesclient): Promise<Pariteit> {
  const rij = await eenRij<ProbeRij>(
    client,
    `select
       exists (
         select 1 from information_schema.columns
          where table_schema = 'intel'
            and table_name   = 'brondocument_versies'
            and column_name  = 'documentvorm'
       ) as heeft_documentvorm,
       (
         select pg_get_constraintdef(c.oid)
           from pg_constraint c
          where c.conrelid = 'intel.brondocument_versies'::regclass
            and c.conname  = 'versies_documentsoort'
       ) as check_definitie,
       /* DE PAUZEOBJECTEN UIT 0046. Deze code ROEPT ze aan — pakTaak
          doet intel.planner_gepauzeerd() in zijn claim-query en de
          planner leest intel.plannerpauze — dus ze horen bij het
          schemacontract van deze motor, net zo hard als de v2-as. */
       exists (
         select 1 from information_schema.tables
          where table_schema = 'intel' and table_name = 'plannerpauze'
       ) as heeft_plannerpauze,
       exists (
         select 1 from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'intel' and p.proname = 'planner_gepauzeerd'
       ) as heeft_pauzefunctie`,
  );

  const codeVersie = DOCUMENTSOORT_VERSIE;

  if (!rij) {
    return {
      sluit: false,
      codeVersie,
      databaseVersie: "v1",
      bewijs:
        "de schemaprobe leverde geen rij op; de stand van de database is ONBEKEND en " +
        "daarmee weigert de motor. Controleer of intel.brondocument_versies bestaat.",
    };
  }

  /* EERST DE PAUZEOBJECTEN, want dit is de goedkoopste en hardste eis.
     GEMETEN OP 1 NOVEMBER 2026, en dit is de reden dat deze toets
     bestaat: met de fase-1-code tegen een database op stand 44 valt de
     planner om met `relation "intel.plannerpauze" does not exist` en de
     worker met `function intel.planner_gepauzeerd(integer) does not
     exist` (42883) — per claimpoging.

     Alleen vibe-intel-api draagt een preDeployCommand, dus tijdens een
     deploy loopt de nieuwe planner- en workercode kortstondig tegen het
     OUDE schema. Zonder deze toets is dat een kryptische databasefout;
     met deze toets is het een benoemde weigering die naar 0046 wijst.
     Zelfherstellend blijft het: zodra de migratie landt, sluit de
     pariteit en loopt de service door. */
  if (!rij.heeft_plannerpauze || !rij.heeft_pauzefunctie) {
    const mist: string[] = [];
    if (!rij.heeft_plannerpauze) mist.push("de tabel intel.plannerpauze");
    if (!rij.heeft_pauzefunctie) mist.push("de functie intel.planner_gepauzeerd()");
    return {
      sluit: false,
      codeVersie,
      databaseVersie: "v1",
      bewijs:
        `deze code gebruikt de plannerpauze maar ${mist.join(" en ")} ontbreekt. ` +
        "Pas migratie 0046_plannerpauze.sql toe vóór deze code. Doorgaan zou " +
        "elke claim op 42883 laten vastlopen.",
    };
  }

  const definitie = rij.check_definitie ?? "";
  const kentV2Soorten = V2_SOORTEN.every((s) => definitie.includes(s));
  const databaseVersie: "v1" | "v2" =
    rij.heeft_documentvorm && kentV2Soorten ? "v2" : "v1";

  const codeIsV2 = codeVersie.endsWith("-v2");

  if (codeIsV2 && databaseVersie === "v1") {
    const mist: string[] = [];
    if (!rij.heeft_documentvorm) mist.push("de kolom intel.brondocument_versies.documentvorm");
    const ontbrekend = V2_SOORTEN.filter((s) => !definitie.includes(s));
    if (ontbrekend.length > 0) {
      mist.push(`de soorten ${ontbrekend.join(" en ")} in de CHECK versies_documentsoort`);
    }
    return {
      sluit: false,
      codeVersie,
      databaseVersie,
      bewijs:
        `de code draagt ${codeVersie} maar de database is v1: ${mist.join(", ")} ` +
        "ontbreekt. Pas migratie 0045_documentvorm_en_soorten_v2.sql toe vóór deze code. " +
        "Doorgaan zou elke classificatie op de CHECK laten vastlopen.",
    };
  }

  if (!codeIsV2 && databaseVersie === "v2") {
    /* Niet gevaarlijk, wel benoemd. De verruimde CHECK keurt niets van
       v1 af, dus de keten blijft werken; de kolom documentvorm blijft
       alleen leeg. Dit is de stand TUSSEN migratie en codedeploy, en die
       mag bestaan — anders kun je 0045 niet vooruit toepassen. */
    return {
      sluit: true,
      codeVersie,
      databaseVersie,
      bewijs:
        `de database kent v2 maar de code draagt ${codeVersie}; dat mag en is de normale ` +
        "stand tussen een vooruit toegepaste 0045 en de codedeploy. De kolom documentvorm " +
        "blijft leeg tot de v2-code draait.",
    };
  }

  return {
    sluit: true,
    codeVersie,
    databaseVersie,
    bewijs: `code ${codeVersie} en database ${databaseVersie} sluiten aan`,
  };
}
