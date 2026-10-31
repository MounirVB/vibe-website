/* ============================================================
   OPS — de plannerpauze
   ------------------------------------------------------------
   WAT DIT IS. Eén plek die bepaalt of de taakplanning stilstaat, en
   één plek die dat besluit vastlegt. De tabel is intel.plannerpauze
   (migratie 0046), append-only, met de jongste rij als stand.

   WAAROM IN DE DATABASE EN NIET IN DE OMGEVING. In deze repo is een
   push naar `main` de productiedeploy, en vibe-intel-api draagt een
   preDeployCommand dat migreert. De cron `0 * * * *` loopt daar dwars
   doorheen. Een pauze die in de container of in de omgeving leeft,
   verdwijnt of verandert precies op het moment dat je hem nodig hebt.
   De database overleeft de deploy; daarom staat de stand daar.

   TWEE GRENZEN, NIET EEN. De pauze stopt het PLANNEN van nieuw werk
   (src/cli/planner.ts) EN het PAKKEN van nieuw werk (pakTaak in
   kern/wachtrij.ts). Dat onderscheid is de eis "bestaande actieve taken
   worden gecontroleerd afgehandeld": een taak die al geclaimd is, loopt
   gewoon af — zijn lease blijft geldig en rondAf() werkt — maar er komt
   niets nieuws bij. De wachtrij raakt dus leeg in plaats van afgekapt.

   WAT DE PAUZE NIET DOET. Hij raakt de cron niet aan. De Railway-cron
   blijft elk uur afgaan en de planner blijft starten; hij plant alleen
   niets en legt de ronde vast als 'gepauzeerd'. Dat is bewust: een cron
   uitzetten is een productieconfiguratiewijziging die je daarna kunt
   vergeten terug te zetten, en een stille cron is niet te onderscheiden
   van een kapotte cron. Een ronde die ZEGT dat hij gepauzeerd is, is
   wel te onderscheiden.
   ============================================================ */

import { eenRij, type Leesclient } from "../kern/db.ts";

export type PauzeBesluit = {
  readonly actie: "PAUZEER" | "HERVAT";
  readonly reden: string;
  readonly door: string;
  readonly autorisatie: string | null;
  readonly motorversies: string | null;
  readonly gezetOp: Date;
};

export type PauzeStand = {
  readonly gepauzeerd: boolean;
  /** Het jongste besluit, of null als er nooit een besluit is genomen. */
  readonly laatste: PauzeBesluit | null;
};

type StandRij = {
  actie: "PAUZEER" | "HERVAT";
  reden: string;
  door: string;
  autorisatie: string | null;
  motorversies: string | null;
  gezet_op: Date;
};

/**
 * De huidige stand. Leest de JONGSTE rij; geen rijen betekent 'loopt'.
 *
 * De sortering is (gezet_op desc, id desc) en niet alleen op tijd. Twee
 * besluiten in dezelfde microseconde zijn in deze tabel mogelijk — een
 * script dat pauzeert en direct hervat is één transactie — en dan mag
 * de uitkomst niet van de klokresolutie afhangen. Dezelfde regel staat
 * in de SQL-functie intel.planner_gepauzeerd().
 */
export async function pauzeStand(
  client: Leesclient,
  organisatieId: number,
): Promise<PauzeStand> {
  const rij = await eenRij<StandRij>(
    client,
    `select actie, reden, door, autorisatie, motorversies, gezet_op
       from intel.plannerpauze
      where organisatie_id = $1
      order by gezet_op desc, id desc
      limit 1`,
    [organisatieId],
  );
  if (!rij) return { gepauzeerd: false, laatste: null };
  return {
    gepauzeerd: rij.actie === "PAUZEER",
    laatste: {
      actie: rij.actie,
      reden: rij.reden,
      door: rij.door,
      autorisatie: rij.autorisatie,
      motorversies: rij.motorversies,
      gezetOp: rij.gezet_op,
    },
  };
}

export type PauzeerOpties = {
  readonly reden: string;
  readonly door: string;
  readonly motorversies?: string | null;
};

/**
 * Pauzeren mag altijd en van iedereen: stilstaan is de veilige kant.
 *
 * Dubbel pauzeren is geen fout maar een tweede rij. Dat is bedoeld: wie
 * tijdens een release twee keer op de rem trapt, hoort geen foutmelding
 * te krijgen die hij moet gaan uitzoeken.
 */
export async function pauzeer(
  client: Leesclient,
  organisatieId: number,
  opties: PauzeerOpties,
): Promise<void> {
  await client.query(
    `insert into intel.plannerpauze
       (organisatie_id, actie, reden, door, motorversies)
     values ($1, 'PAUZEER', $2, $3, $4)`,
    [organisatieId, opties.reden, opties.door, opties.motorversies ?? null],
  );
}

export type HervatOpties = {
  readonly reden: string;
  readonly door: string;
  /** VERPLICHT. De database weigert een HERVAT zonder autorisatie. */
  readonly autorisatie: string;
  readonly motorversies?: string | null;
};

/**
 * Hervatten zet de keten weer in beweging en vraagt daarom een
 * autorisatie. De eis staat als CHECK in de database
 * (plannerpauze_hervatten_vraagt_autorisatie) en niet alleen hier: een
 * controle in code kan worden omzeild door wie rechtstreeks in de
 * database zit, en dat is juist het pad dat tijdens een release wordt
 * gebruikt.
 */
export async function hervat(
  client: Leesclient,
  organisatieId: number,
  opties: HervatOpties,
): Promise<void> {
  await client.query(
    `insert into intel.plannerpauze
       (organisatie_id, actie, reden, door, autorisatie, motorversies)
     values ($1, 'HERVAT', $2, $3, $4, $5)`,
    [
      organisatieId,
      opties.reden,
      opties.door,
      opties.autorisatie,
      opties.motorversies ?? null,
    ],
  );
}

/** Een regel voor een logboek of een CLI, in de stijl van de andere ops-rapporten. */
export function standAlsRegel(stand: PauzeStand): string {
  if (!stand.laatste) return "planner LOOPT — er is nooit een pauzebesluit genomen";
  const l = stand.laatste;
  const kop = stand.gepauzeerd ? "planner GEPAUZEERD" : "planner LOOPT";
  const aut = l.autorisatie ? `, autorisatie '${l.autorisatie}'` : "";
  return (
    `${kop} — laatste besluit ${l.actie} op ${l.gezetOp.toISOString()} ` +
    `door '${l.door}'${aut}: ${l.reden}`
  );
}
