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

/**
 * De gronden waarop dit platform zonder mens mag handelen, als REGISTER.
 *
 * WAAROM EEN REGISTER EN GEEN VRIJE TEKST. Tot 9 november 2026 nam
 * `systeemActor()` elke string van drie tekens aan. De grond belandde
 * tussen blokhaken in de motivatie en in `actor_naam`, en dat was de
 * hele herkomst: wie wilde weten WELKE automatische handeling een regel
 * had geschreven, moest vrije tekst parsen. Met de autonome uitgifte
 * erbij zijn dat zes verschillende handelingen die alle zes 'systeem'
 * heten — en dan is "een concrete uitvoeringsgrond" alleen nog waar als
 * hij uit een gesloten lijst komt.
 *
 * De sleutel gaat daarom óók machineleesbaar het logboek in
 * (`poortresultaten.grond`), zodat het operationele overzicht kan
 * tellen zonder blokhaken te lezen.
 */
export const SYSTEEMGRONDEN = {
  "autopublicatie:goedkeuring":
    "een laagrisico-artikel haalde alle negen beleidsvoorwaarden en is onder het publicatiebeleid goedgekeurd",
  "autopublicatie:blokkade":
    "een artikel haalde de beleidsvoorwaarden niet en is door het platform geblokkeerd",
  /* DE OUDE WEG HEEFT ZIJN EIGEN GROND, en dat is geen smaakkwestie.
     Met auto_uitgifte_aan UIT schrijft de autopublicatieronde zelf het
     registerrecord en opent een MENS daarna de pull request. Met die
     schakelaar AAN doet de uitgiftelaag dat, en mag een machine
     doorgaan. Het logboek is de enige plek waar dat verschil staat:
     de uitgiftewachtrij hervat alleen een keten met een grond die met
     'uitgifte:' begint. Deelden de twee wegen één grond, dan zou de
     wachtrij een publicatie overnemen die op een mens wacht. */
  "autopublicatie:record":
    "de autopublicatieronde schreef zelf het registerrecord; de pull request wacht op een mens",
  "uitgifte:opdracht": "een uitgifteopdracht is afgegeven aan de uitvoerder",
  "uitgifte:record": "het registerrecord van een autonoom goedgekeurd artikel is vastgelegd",
  "uitgifte:pr": "de uitgifte opende een pull request voor een autonoom goedgekeurd artikel",
  "uitgifte:merge": "de uitgifte mergede een groene pull request naar main",
  "uitgifte:live": "de uitgifte stelde vast dat het artikel publiek staat",
  "uitgifte:herstel": "de uitgifte draaide een mislukte stap terug",
  "uitgifte:stop": "de uitgifte is stilgezet door een stopconditie",
  "taak:gepland": "een geplande taak zonder mens in de lus",
} as const;

export type SysteemGrond = keyof typeof SYSTEEMGRONDEN;

export type Actor =
  | {
      readonly soort: "mens";
      readonly gebruikerId: number;
      readonly email: string;
      readonly rol: string | null;
    }
  | {
      readonly soort: "systeem";
      /** De sleutel uit SYSTEEMGRONDEN; machineleesbaar. */
      readonly grond: SysteemGrond;
      /** De tekst uit het register, plus eventueel detail van de aanroeper. */
      readonly toelichting: string;
      /**
       * Onder WELK beleid het systeem dit deed.
       *
       * 0052 zegt bij de kolom `beleid_versie`: "VERPLICHT te vullen bij
       * een automatisch besluit, zodat achteraf vaststaat onder welke
       * regels er is gepubliceerd." Gemeten op 9 november 2026 gaf geen
       * enkele productie-aanroeper hem mee. Hij hoort bij de ACTOR en
       * niet bij de aanroepplek, want het is het mandaat van die actor.
       */
      readonly beleidVersie: string | null;
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
export function systeemActor(
  grond: SysteemGrond,
  opties: { readonly detail?: string; readonly beleidVersie?: string | null } = {},
): Actor {
  /* DE RUNTIME-CONTROLE BLIJFT, en is nu strenger dan de typechecker.
     TypeScript houdt een onbekende sleutel tegen bij het compileren;
     een aanroeper uit JavaScript, een gecaste waarde of een string uit
     de database komt daar langs. Een grond die niet in het register
     staat is geen grond. */
  const tekst = SYSTEEMGRONDEN[grond];
  if (typeof tekst !== "string") {
    throw new IntelFout(
      "validatie",
      `'${String(grond)}' staat niet in SYSTEEMGRONDEN; een systeemactor zonder grond uit het ` +
        `register is geen herkomst (bekend: ${Object.keys(SYSTEEMGRONDEN).join(", ")})`,
    );
  }
  const detail = opties.detail?.trim();
  return {
    soort: "systeem",
    grond,
    toelichting: detail ? `${tekst} — ${detail}` : tekst,
    beleidVersie: opties.beleidVersie ?? null,
  };
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
  return a.soort === "mens"
    ? `${a.email} (gebruiker ${a.gebruikerId})`
    : `systeem: ${a.grond}${a.beleidVersie ? ` onder beleid ${a.beleidVersie}` : ""}`;
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
  | "PR_GEMERGED"
  | "LIVE_GEVERIFIEERD"
  | "TERUGGEDRAAID"
  | "GEBLOKKEERD";

/**
 * De fasen waarin een handeling de publieke site RAAKT.
 *
 * Een systeemactor moet in deze fasen zijn mandaat noemen: zonder
 * `beleidVersie` is niet na te gaan onder welke regels het platform
 * publiek iets heeft gedaan. GOEDGEKEURD staat er ook in, want dat is
 * het besluit dat de rest mogelijk maakt. GEBLOKKEERD en TERUGGEDRAAID
 * staan er NIET in: dat zijn handelingen die iets tegenhouden of
 * ongedaan maken, en die mogen nooit afhangen van een beleidsrij die
 * misschien net is ingetrokken.
 */
const MANDAAT_VEREIST: readonly Fase[] = [
  "GOEDGEKEURD",
  "RECORD_GESCHREVEN",
  "PR_AANGEMAAKT",
  "PR_GEMERGED",
  "LIVE_GEVERIFIEERD",
];

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
  const systeem = inv.actor.soort === "systeem" ? inv.actor : null;

  /* HET MANDAAT VAN EEN AUTOMATISCHE HANDELING.
     De aanroeper mag `beleidVersie` nog meegeven (de goedkeuringskant
     deed dat al), maar de ACTOR is de eerste bron: het beleid is zijn
     mandaat, niet een eigenschap van de aanroepplek. */
  const beleidVersie = inv.beleidVersie ?? systeem?.beleidVersie ?? null;
  if (systeem !== null && beleidVersie === null && MANDAAT_VEREIST.includes(inv.fase)) {
    throw new IntelFout(
      "validatie",
      `een automatisch besluit in fase ${inv.fase} zonder beleidsversie is niet herleidbaar; ` +
        `0052 eist die versie juist bij een besluit zonder mens (grond ${systeem.grond})`,
    );
  }

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
      systeem !== null ? `${inv.motivatie} [${systeem.grond}]` : inv.motivatie,
      /* DE GROND OOK MACHINELEESBAAR. De blokhaken in de motivatie zijn
         voor een mens die het logboek leest; `grond` is voor het
         operationele overzicht, dat moet kunnen tellen hoe vaak welke
         automatische handeling liep zonder vrije tekst te parsen. */
      JSON.stringify({
        fase: inv.fase,
        ...(systeem !== null ? { grond: systeem.grond } : {}),
        ...(inv.meting ?? {}),
      }),
      beleidVersie,
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
      JSON.stringify(
        inv.actor.soort === "systeem"
          ? {
              ...inv.naWaarde,
              grond: inv.actor.grond,
              beleid_versie: inv.actor.beleidVersie,
            }
          : inv.naWaarde,
      ),
      inv.herkomst ?? (mens ? "cli" : "taak"),
      inv.motivatie,
    ],
  );
}
