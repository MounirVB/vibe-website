/* ============================================================
   PIJPLIJN — de doorverwijzing naar een menselijke beoordeling
   ------------------------------------------------------------
   WAT DIT REPAREERT. De juridische claimpoort blokkeert een claim
   zonder authentieke grondslag en legde dat alleen in een LOGREGEL
   vast. Een logregel hoort bij de huidige Railway-deployment en is na
   de volgende deploy weg: er was niets om op te handelen.

   De toelichtingen beloofden dat zo'n claim "via bronverificatie het
   origineel bij het bevoegde gezag moet vinden". Gemeten: die route
   bestaat alleen voor NAVERTELLINGEN. verifieerBijGezag() stapt op
   bronverificatie.ts:261 uit met NIET_VAN_TOEPASSING zodra
   beschrijftBesluitVan null is, en bij precies de geblokkeerde claims
   is dat altijd zo. Zij vielen dus buiten elke route.

   DRIE EIGENSCHAPPEN, en elke eigenschap is een eis uit de opdracht.

   1 GEEN LUS. De unieke index claimbeoordeling_eenmalig staat op
     (organisatie, uitspraak, motorversies) en de insert gebruikt
     `on conflict do nothing`. Dezelfde claim onder dezelfde
     motorversies vraagt precies EEN keer om beoordeling, hoe vaak de
     pijplijn ook draait.

   2 GEEN AUTOMATISCHE OPWAARDERING. Deze module SCHRIJFT alleen een
     vraag. Er is geen functie die een rij hier leest en daarmee een
     uitspraak op 'bevestigd' zet, en die hoort er ook niet te komen:
     een mens die 'BEVESTIGBAAR' kiest geeft een OORDEEL, geen status.
     De uitspraak blijft ongeverifieerd tot hij langs de gewone weg
     bevestigd raakt. Daarmee kan dit register per constructie geen
     historische claim opwaarderen.

   3 FAIL-CLOSED EN NIET-BLOKKEREND. Lukt het wegschrijven niet, dan
     blijft de claim gewoon 'ongeverifieerd' — de veilige kant. Een
     mislukte doorverwijzing mag de hele ophaalronde niet laten vallen,
     want dan zou een reparatie aan de bewijsketen de ingestie breken.
   ============================================================ */

import type pg from "pg";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("claimbeoordeling");

export type BeoordelingVraag = {
  readonly uitspraakId: number;
  readonly versieId: number;
  /** De uitslag van steltStukDeClaimVast(). */
  readonly aanleiding: string;
  readonly reden: string;
  readonly motorversies: string;
};

/**
 * Vraagt om een menselijke beoordeling van een geblokkeerde claim.
 *
 * Geeft `true` als er een NIEUWE vraag is vastgelegd en `false` als hij
 * al bestond of niet kon worden vastgelegd. De aanroeper hoeft daar
 * niets mee: de claim blijft in beide gevallen ongeverifieerd.
 */
export async function vraagOmBeoordeling(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  vraag: BeoordelingVraag,
): Promise<boolean> {
  try {
    const r = await c.query(
      `insert into intel.claimbeoordeling
         (organisatie_id, uitspraak_id, versie_id, aanleiding, reden, motorversies)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (organisatie_id, uitspraak_id, motorversies) do nothing
       returning id`,
      [
        organisatieId,
        vraag.uitspraakId,
        vraag.versieId,
        vraag.aanleiding,
        vraag.reden,
        vraag.motorversies,
      ],
    );
    return (r.rowCount ?? 0) > 0;
  } catch (e) {
    /* NIET LATEN VALLEN. Zie eigenschap 3 in de kop: een reparatie aan
       de bewijsketen mag de ingestie niet breken. De claim is al
       geblokkeerd, dus de veilige uitkomst staat er al. */
    log.waarschuwing("doorverwijzing naar beoordeling mislukt", {
      uitspraakId: vraag.uitspraakId,
      aanleiding: vraag.aanleiding,
      fout: e instanceof Error ? e.message.slice(0, 200) : "onbekend",
    });
    return false;
  }
}

export type OpenBeoordeling = {
  readonly id: number;
  readonly uitspraakId: number;
  readonly aanleiding: string;
  readonly reden: string;
  readonly tekst: string;
  readonly aangevraagdOp: Date;
};

/** De openstaande vragen, nieuwste eerst. Voor de CLI en de monitor. */
export async function openBeoordelingen(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  max = 50,
): Promise<OpenBeoordeling[]> {
  const r = await c.query<{
    id: number;
    uitspraak_id: number;
    aanleiding: string;
    reden: string;
    tekst: string;
    aangevraagd_op: Date;
  }>(
    `select b.id, b.uitspraak_id, b.aanleiding, b.reden,
            coalesce(u.tekst, '(uitspraak verwijderd)') as tekst,
            b.aangevraagd_op
       from intel.claimbeoordeling b
       left join intel.uitspraken u on u.id = b.uitspraak_id
      where b.organisatie_id = $1
        and b.besloten_op is null
      order by b.aangevraagd_op desc, b.id desc
      limit $2`,
    [organisatieId, max],
  );
  return r.rows.map((x) => ({
    id: x.id,
    uitspraakId: x.uitspraak_id,
    aanleiding: x.aanleiding,
    reden: x.reden,
    tekst: x.tekst,
    aangevraagdOp: x.aangevraagd_op,
  }));
}

export type Beslissing = {
  readonly besluit: "BEVESTIGBAAR" | "AFGEWEZEN" | "ONBESLIST";
  readonly door: string;
  readonly toelichting?: string | undefined;
  /** VERPLICHT bij BEVESTIGBAAR; de database dwingt dat af. */
  readonly autorisatie?: string | undefined;
};

/**
 * Legt een menselijke beslissing vast.
 *
 * DIT VERANDERT DE CLAIM NIET. Het legt vast wat een mens vond. De
 * uitspraak blijft ongeverifieerd tot hij langs de gewone weg bevestigd
 * raakt; zie eigenschap 2 in de kop en de kolomtoelichting in 0047.
 */
export async function beslisBeoordeling(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  beoordelingId: number,
  b: Beslissing,
): Promise<boolean> {
  const r = await c.query(
    `update intel.claimbeoordeling
        set besloten_op = now(), besluit = $3, door = $4,
            autorisatie = $5, toelichting = $6
      where organisatie_id = $1 and id = $2 and besloten_op is null`,
    [
      organisatieId,
      beoordelingId,
      b.besluit,
      b.door,
      b.autorisatie ?? null,
      b.toelichting ?? null,
    ],
  );
  return (r.rowCount ?? 0) > 0;
}
