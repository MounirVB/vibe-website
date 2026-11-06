/* ============================================================
   INHOUD — wie deed dit, en mocht die dat?
   ------------------------------------------------------------
   HET GAT DAT DIT DICHT.

   `intel.publicatiebesluiten` draagt drie kolommen over herkomst:
   `actor_soort`, `door_gebruiker_id` en `door_rol`. De goedkeuring vulde
   alle drie, maar de PUBLICATIEZIJDE vulde alleen `actor_soort` — en
   altijd met 'systeem', ook wanneer een mens de keten met de hand
   draaide. Gemeten op 6 november 2026: elke rij uit publiceer(),
   draaiTerug() en maakPublicatiePr() stond op 'systeem' zonder
   gebruikers-id, dus een handmatige publicatie was in het logboek niet
   te onderscheiden van een automatische ronde.

   DRIE DINGEN MAKEN DAT HIER ONMOGELIJK.

   1 EEN ACTOR IS EEN TYPE, GEEN TEKST. `Actor` is een vereniging van
     twee vormen: een MENS met een gebruikers-id, of het SYSTEEM met een
     grond. Een aanroeper kan geen 'systeem' schrijven terwijl hij een
     mens bedoelt, want hij geeft geen string mee maar een object dat
     alleen deze module maakt.

   2 EEN MENS WORDT GEVERIFIEERD, NIET GELOOFD. `verifieerMens()` leest
     de gebruiker uit de database, eist dat hij bestaat, actief is, in
     deze organisatie zit en het gevraagde recht HEEFT. Een kaal
     gebruikers-id is dus geen identiteitsbewijs: wie het verkeerd
     invult, krijgt een autorisatiefout in plaats van een auditregel.
     De controle staat HIER en niet in de CLI, zodat ook een
     niet-CLI-aanroeper hem niet kan overslaan.

   3 ÉÉN SCHRIJFPAD. Alle publicatiezijdige regels gaan door
     `legPublicatiebesluitVast()` en `legPublicatieAuditVast()`, en die
     leiden `actor_soort`, `door_gebruiker_id` en `door_rol` AF uit de
     actor. Er is geen plek meer waar die drie velden met de hand
     worden gezet.

   HET RECHT IS `inhoud.publiceren`, EN DAT BESTOND AL.
   Migratie 0001 geeft het aan `beheerder` en `redacteur`, maar het kwam
   in geen enkele `vereistRecht()` of codepad voor — een dood recht.
   Publiceren hing daarmee feitelijk aan databasetoegang plus een shell.
   Nu hangt het aan het recht dat er al voor bedoeld was.
   ============================================================ */

import type pg from "pg";
import { IntelFout } from "../kern/fouten.ts";
/* leesGebruiker() is de ENIGE waarheid over identiteit, rollen, rechten
   en de sessie-epoch; hij leest per aanroep uit de database zodat een
   ingetrokken rol direct werkt. Hij staat in de dashboardlaag omdat die
   hem het eerst nodig had, en hij importeert zelf alleen kern/ — dus
   hier gebruiken geeft geen kringverwijzing. Een tweede query naast deze
   zou een tweede waarheid zijn. */
import { leesGebruiker } from "../dashboard/auth.ts";

/** Het recht dat een publicatiehandeling vraagt. Bestond al in 0001. */
export const RECHT_PUBLICEREN = "inhoud.publiceren";

export type Actor =
  | {
      readonly soort: "mens";
      readonly gebruikerId: number;
      readonly email: string;
      readonly rol: string | null;
    }
  | {
      readonly soort: "systeem";
      /** Waarom het systeem dit zonder mens deed; komt in de motivatie. */
      readonly grond: string;
    };

/**
 * De actor voor een geautomatiseerde ronde.
 *
 * GEEN GEBRUIKERSRIJ VOOR 'HET SYSTEEM'. Migratie 0052 legt dat
 * uitdrukkelijk vast bij de beleidsgoedkeuring: zou er een nepgebruiker
 * zijn, dan wordt elke latere lezing van `door_gebruiker_id is not null`
 * onbetrouwbaar. Het systeem heeft dus geen id, en dat is het verschil
 * dat het logboek moet kunnen tonen.
 */
export function systeemActor(grond: string): Actor {
  if (grond.trim().length < 3) {
    throw new IntelFout("validatie", "een systeemactor zonder grond is geen herkomst");
  }
  return { soort: "systeem", grond: grond.trim() };
}

/**
 * Verifieert een menselijke actor tegen de database en geeft hem terug.
 *
 * Werpt een autorisatiefout bij: onbekende of inactieve gebruiker, een
 * ingetrokken sessie, een andere organisatie, of een ontbrekend recht.
 * Geeft dus nooit een actor terug die niet mag.
 */
export async function verifieerMens(
  c: pg.PoolClient,
  organisatieId: number,
  inv: {
    readonly gebruikerId: number;
    /**
     * De epoch uit het sessiekoekje van de aanroeper. Meegeven maakt de
     * controle STRENGER: leesGebruiker() houdt hem tegen
     * `gebruikers.sessie_epoch` en geeft null bij een ingetrokken
     * sessie. Een aanroeper die geen sessie vertegenwoordigt (een
     * geplande taak) laat hem weg.
     */
    readonly sessieEpoch?: number;
    /** Standaard het publicatierecht; goedkeuren vraagt een ander recht. */
    readonly vereistRecht?: string;
  },
): Promise<Actor> {
  const recht = inv.vereistRecht ?? RECHT_PUBLICEREN;

  if (!Number.isInteger(inv.gebruikerId) || inv.gebruikerId <= 0) {
    throw new IntelFout(
      "autorisatie",
      `'${String(inv.gebruikerId)}' is geen gebruikers-id; een publicatiehandeling vraagt een ` +
        "herleidbare identiteit",
    );
  }

  const g = await leesGebruiker(c, inv.gebruikerId, inv.sessieEpoch);
  if (g === null) {
    throw new IntelFout(
      "autorisatie",
      `gebruiker ${inv.gebruikerId} bestaat niet, is niet actief, of zijn sessie is ingetrokken; ` +
        "er is dus geen identiteit om deze handeling aan te hangen",
    );
  }
  if (g.organisatieId !== organisatieId) {
    throw new IntelFout(
      "autorisatie",
      `gebruiker ${g.email} hoort bij organisatie ${g.organisatieId} en niet bij ${organisatieId}`,
    );
  }
  if (!g.rechten.has(recht)) {
    throw new IntelFout(
      "autorisatie",
      `${g.email} mag deze publicatiehandeling niet uitvoeren: het recht ${recht} ontbreekt`,
    );
  }

  return {
    soort: "mens",
    gebruikerId: g.id,
    email: g.email,
    /* De ROL erbij, want `publicatiebesluiten.door_rol` bestaat en stond
       altijd leeg. Bij meerdere rollen de eerste; de volledige lijst
       staat in intel.gebruiker_rollen. */
    rol: g.rollen[0] ?? null,
  };
}

/** Hoe deze actor in een logregel heet. Nooit met de hand samengesteld. */
export function actorBeschrijving(a: Actor): string {
  return a.soort === "mens" ? `${a.email} (gebruiker ${a.gebruikerId})` : `systeem: ${a.grond}`;
}

export type Besluit =
  | "ingediend"
  | "goedgekeurd"
  | "afgewezen"
  | "gepubliceerd"
  | "teruggedraaid"
  | "automatisch_geblokkeerd";

/**
 * De vijf fasen die het logboek moet kunnen onderscheiden.
 *
 * EEN GESLAAGDE PR IS GEEN PUBLICATIE, en dat was in het logboek niet te
 * zien: zowel de PR-stap als een echte publicatie schreef een rij met
 * besluit 'ingediend' of 'gepubliceerd' zonder te zeggen WAAR in de
 * keten hij stond. De fase gaat daarom in `poortresultaten`, een jsonb
 * die al bedoeld is voor "wat is er bij dit besluit gemeten".
 */
export type Fase =
  | "GOEDGEKEURD"
  | "RECORD_GESCHREVEN"
  | "PR_AANGEMAAKT"
  | "LIVE_GEVERIFIEERD"
  | "TERUGGEDRAAID"
  | "GEBLOKKEERD";

/**
 * Schrijft één regel in het append-only publicatielogboek.
 *
 * `actor_soort`, `door_gebruiker_id` en `door_rol` worden AFGELEID uit de
 * actor. Dat is de hele reden dat deze functie bestaat: zolang elke
 * aanroeper die drie velden zelf zette, kon een handmatige handeling als
 * automatische worden geboekt.
 */
export async function legPublicatiebesluitVast(
  c: pg.PoolClient,
  inv: {
    readonly organisatieId: number;
    readonly inhoudVersieId: number;
    readonly besluit: Besluit;
    readonly fase: Fase;
    readonly actor: Actor;
    readonly motivatie: string;
    /** Wat er bij dit besluit is gemeten. Komt naast de fase te staan. */
    readonly meting?: Record<string, unknown>;
    readonly beleidVersie?: string | null;
  },
): Promise<void> {
  const mens = inv.actor.soort === "mens" ? inv.actor : null;
  await c.query(
    `insert into intel.publicatiebesluiten
       (organisatie_id, inhoud_versie_id, besluit, door_gebruiker_id, door_rol,
        actor_soort, motivatie, poortresultaten, beleid_versie)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
    [
      inv.organisatieId,
      inv.inhoudVersieId,
      inv.besluit,
      mens?.gebruikerId ?? null,
      mens?.rol ?? null,
      inv.actor.soort,
      /* DE GROND VAN EEN SYSTEEMACTOR HOORT IN DE MOTIVATIE, de naam van
         een mens NIET.
         Een systeemregel heeft per ontwerp geen `door_gebruiker_id` (zie
         systeemActor), dus zonder deze toevoeging staat er 'systeem'
         zonder dat iemand kan nagaan waarom. Bij een mens is de
         herkomst al volledig gedekt door `door_gebruiker_id` en
         `door_rol`; zijn adres er ook nog in de motivatie plakken zou
         dezelfde waarheid twee keer opschrijven en de motivatie van de
         aanroeper veranderen — en daar rekenen bestaande toetsen
         letterlijk op. */
      inv.actor.soort === "systeem"
        ? `${inv.motivatie} [${inv.actor.grond}]`
        : inv.motivatie,
      JSON.stringify({ fase: inv.fase, ...(inv.meting ?? {}) }),
      inv.beleidVersie ?? null,
    ],
  );
}

/**
 * Schrijft dezelfde handeling in het algemene auditspoor.
 *
 * TWEE TABELLEN, EEN REDEN. `publicatiebesluiten` is het logboek van de
 * publicatieketen en wordt per versie gelezen; `audit_gebeurtenissen` is
 * het spoor waarin je PER PERSOON kunt nagaan wat hij heeft gedaan. De
 * goedkeuringskant schreef al in beide (de vervallen goedkeuring doet dat
 * sinds #78); de publicatiekant schreef in geen van de twee een naam.
 */
export async function legPublicatieAuditVast(
  c: pg.PoolClient,
  inv: {
    readonly organisatieId: number;
    readonly actor: Actor;
    readonly handeling: string;
    readonly objectId: string | number;
    readonly naWaarde: Record<string, unknown>;
    readonly motivatie: string;
    readonly herkomst?: string;
  },
): Promise<void> {
  const mens = inv.actor.soort === "mens" ? inv.actor : null;
  await c.query(
    `insert into intel.audit_gebeurtenissen
       (organisatie_id, actor_soort, actor_id, actor_naam, handeling,
        objectsoort, object_id, na_waarde, herkomst, motivatie)
     values ($1, $2, $3, $4, $5, 'inhoud_versie', $6, $7::jsonb, $8, $9)`,
    [
      inv.organisatieId,
      inv.actor.soort,
      mens?.gebruikerId ?? null,
      mens?.email ?? `systeem (${inv.actor.soort === "systeem" ? inv.actor.grond : "?"})`,
      inv.handeling,
      String(inv.objectId),
      JSON.stringify(inv.naWaarde),
      inv.herkomst ?? (mens ? "cli" : "taak"),
      inv.motivatie,
    ],
  );
}
