/* ============================================================
   KERN — duurzame wachtrij
   ------------------------------------------------------------
   Migratie 0007 legde intel.taken aan met alles wat een nette
   wachtrij nodig heeft: een lease, een idempotentiesleutel, een
   pogingenteller en een dlq. Er was alleen nog geen code die hem
   gebruikte. Dit is die code.

   VIER EIGENSCHAPPEN, EN WAAROM ELK ERIN ZIT

   1 `for update skip locked`. Twee workers die tegelijk pakken mogen
     nooit dezelfde taak krijgen. Zonder skip locked staat de tweede
     worker te wachten op de eerste in plaats van de volgende taak te
     pakken; dan is een tweede worker nutteloos.

   2 EEN LEASE, GEEN SLOT. `zichtbaarheid_tot` is een tijdstip, geen
     booleaanse vlag. Valt een worker om — SIGKILL, OOM, netwerk weg —
     dan loopt zijn lease af en geeft `geefVerlopenTerug()` de taak
     terug aan de wachtrij. Een booleaanse 'bezig'-vlag zou daar voor
     altijd op blijven staan en de taak stil laten verdwijnen.

   3 DE IDEMPOTENTIESLEUTEL BEVAT HET VENSTER. 'ophalen:bron:12:2026-10-10T12'
     kan per constructie precies één keer bestaan. Draait de planner
     drie keer in dat uur, dan zijn de tweede en derde poging een
     unieke-indexschending — en die wordt hier als SUCCES behandeld,
     niet als fout. Dat is het hele punt: de cron mag dubbel draaien.

   4 EXPONENTIËLE BACKOFF MET EEN PLAFOND, DAARNA DLQ. Een taak die
     blijft falen hoort niet eeuwig te blijven herhalen; na
     `max_pogingen` gaat hij naar de dlq en blokkeert de rest niet.
     Een herhaalbare fout (netwerk) en een niet-herhaalbare fout
     (configuratie) krijgen bewust NIET dezelfde behandeling: een
     configuratiefout gaat direct naar de dlq, want een vierde poging
     met dezelfde ontbrekende variabele levert hetzelfde resultaat.
   ============================================================ */

import type pg from "pg";
import { eenRij, metOrganisatie, rijen, type Pool } from "./db.ts";
import { IntelFout } from "./fouten.ts";
import { maakLogger } from "./log.ts";

const log = maakLogger("wachtrij");

/** Hoe lang een worker een taak mag vasthouden voordat hij hem kwijt is. */
export const LEASE_SECONDEN = 300;

export type Taak = {
  readonly id: number;
  readonly soort: string;
  readonly payload: Record<string, unknown>;
  readonly pogingen: number;
  readonly maxPogingen: number;
};

export type ZetUitkomst = {
  readonly id: number | null;
  readonly nieuw: boolean;
  readonly reden: string;
};

/**
 * Zet een taak in de wachtrij. Idempotent als er een sleutel is.
 *
 * Een unieke-indexschending (23505) op de idempotentiesleutel is hier
 * GEEN fout maar het bedoelde gedrag: de taak bestaat al voor dit
 * venster. Vandaar `on conflict do nothing` plus een lege uitkomst.
 */
export async function zetInWachtrij(
  c: pg.PoolClient,
  organisatieId: number,
  taak: {
    soort: string;
    payload?: Record<string, unknown>;
    idempotentieSleutel?: string | null;
    prioriteit?: number;
    beschikbaarOp?: Date | null;
    maxPogingen?: number;
  },
): Promise<ZetUitkomst> {
  const r = await eenRij<{ id: number }>(
    c,
    `insert into intel.taken
       (organisatie_id, soort, idempotentie_sleutel, payload, prioriteit,
        beschikbaar_op, max_pogingen)
     values ($1,$2,$3,$4,coalesce($5,100),coalesce($6, now()),coalesce($7,5))
     on conflict (organisatie_id, soort, idempotentie_sleutel)
       where idempotentie_sleutel is not null
       do nothing
     returning id`,
    [
      organisatieId,
      taak.soort,
      taak.idempotentieSleutel ?? null,
      JSON.stringify(taak.payload ?? {}),
      taak.prioriteit ?? null,
      taak.beschikbaarOp ?? null,
      taak.maxPogingen ?? null,
    ],
  );
  if (r) return { id: r.id, nieuw: true, reden: "in de wachtrij gezet" };
  return {
    id: null,
    nieuw: false,
    reden: `bestaat al voor sleutel '${taak.idempotentieSleutel}'; overgeslagen`,
  };
}

/**
 * Pakt één taak en zet er een lease op.
 *
 * De `for update skip locked` staat op de subquery: daardoor slaat een
 * tweede worker een vergrendelde rij over in plaats van erop te
 * wachten.
 */
export async function pakTaak(
  c: pg.PoolClient,
  organisatieId: number,
  workerNaam: string,
  soorten?: readonly string[],
): Promise<Taak | null> {
  const r = await eenRij<{
    id: number;
    soort: string;
    payload: Record<string, unknown>;
    pogingen: number;
    max_pogingen: number;
  }>(
    c,
    `update intel.taken t
        set status            = 'bezig',
            pogingen          = t.pogingen + 1,
            vergrendeld_door  = $2,
            vergrendeld_op    = now(),
            zichtbaarheid_tot = now() + make_interval(secs => $3),
            bijgewerkt_op     = now()
      where t.id = (
        select k.id
          from intel.taken k
         where k.organisatie_id = $1
           and k.status = 'wachtend'
           and k.beschikbaar_op <= now()
           ${soorten && soorten.length ? "and k.soort = any($4)" : ""}
         order by k.prioriteit, k.beschikbaar_op, k.id
         limit 1
         for update skip locked
      )
      returning t.id, t.soort, t.payload, t.pogingen, t.max_pogingen`,
    soorten && soorten.length
      ? [organisatieId, workerNaam, LEASE_SECONDEN, soorten]
      : [organisatieId, workerNaam, LEASE_SECONDEN],
  );
  if (!r) return null;
  return {
    id: r.id,
    soort: r.soort,
    payload: r.payload ?? {},
    pogingen: r.pogingen,
    maxPogingen: r.max_pogingen,
  };
}

/** Markeert een taak als gereed en legt de duur vast. */
export async function rondAf(
  c: pg.PoolClient,
  taakId: number,
  duurMs: number,
): Promise<void> {
  await c.query(
    `update intel.taken
        set status = 'gereed', gereed_op = now(), duur_ms = $2,
            zichtbaarheid_tot = null, bijgewerkt_op = now()
      where id = $1`,
    [taakId, Math.max(0, Math.round(duurMs))],
  );
}

/**
 * Laat een taak mislukken: opnieuw met backoff, of naar de dlq.
 *
 * `herhaalbaar=false` gaat direct naar de dlq. Een ontbrekende
 * omgevingsvariabele wordt bij een vierde poging niet alsnog gevonden.
 */
export async function laatMislukken(
  c: pg.PoolClient,
  taak: Taak,
  fout: unknown,
): Promise<"opnieuw" | "dlq"> {
  const herhaalbaar = fout instanceof IntelFout ? fout.herhaalbaar : true;
  const soort = fout instanceof IntelFout ? fout.soort : "onbekend";
  const bericht = fout instanceof Error ? fout.message : String(fout);

  const opgebruikt = taak.pogingen >= taak.maxPogingen;
  const naarDlq = opgebruikt || !herhaalbaar;

  if (naarDlq) {
    await c.query(
      `update intel.taken
          set status = 'dlq', laatste_fout = $2, laatste_fout_soort = $3,
              zichtbaarheid_tot = null, bijgewerkt_op = now()
        where id = $1`,
      [taak.id, bericht.slice(0, 2000), soort],
    );
    log.fout("taak naar dlq", {
      taak: taak.id,
      soort: taak.soort,
      pogingen: taak.pogingen,
      reden: herhaalbaar ? "max pogingen bereikt" : `niet-herhaalbare fout (${soort})`,
    });
    return "dlq";
  }

  // 2, 4, 8, 16 minuten, met een plafond van een uur.
  const wachtSeconden = Math.min(3600, 60 * 2 ** taak.pogingen);
  await c.query(
    `update intel.taken
        set status = 'wachtend',
            beschikbaar_op = now() + make_interval(secs => $4),
            laatste_fout = $2, laatste_fout_soort = $3,
            vergrendeld_door = null, vergrendeld_op = null,
            zichtbaarheid_tot = null, bijgewerkt_op = now()
      where id = $1`,
    [taak.id, bericht.slice(0, 2000), soort, wachtSeconden],
  );
  log.waarschuwing("taak opnieuw in de wachtrij", {
    taak: taak.id,
    soort: taak.soort,
    poging: taak.pogingen,
    over_seconden: wachtSeconden,
  });
  return "opnieuw";
}

/**
 * Geeft taken terug waarvan de lease is verlopen.
 *
 * Dit is de reden dat een lease een tijdstip is en geen vlag: een
 * omgevallen worker laat zijn taken hier weer vrij in plaats van ze
 * voor altijd op 'bezig' te laten staan.
 */
export async function geefVerlopenTerug(
  c: pg.PoolClient,
  organisatieId: number,
): Promise<number> {
  const r = await rijen<{ id: number }>(
    c,
    `update intel.taken
        set status = 'wachtend',
            vergrendeld_door = null, vergrendeld_op = null,
            zichtbaarheid_tot = null,
            laatste_fout = coalesce(laatste_fout, 'lease verlopen; worker is niet teruggekomen'),
            laatste_fout_soort = coalesce(laatste_fout_soort, 'lease_verlopen'),
            bijgewerkt_op = now()
      where organisatie_id = $1
        and status = 'bezig'
        and zichtbaarheid_tot is not null
        and zichtbaarheid_tot < now()
      returning id`,
    [organisatieId],
  );
  if (r.length) log.waarschuwing("verlopen leases teruggegeven", { aantal: r.length });
  return r.length;
}

export type DlqTaak = {
  readonly id: number;
  readonly soort: string;
  readonly pogingen: number;
  readonly laatsteFout: string | null;
  readonly laatsteFoutSoort: string | null;
  readonly bijgewerktOp: string;
};

/** Wat staat er in de dead-letter queue, en waarom? */
export async function dlqInhoud(
  c: pg.PoolClient,
  organisatieId: number,
  limiet = 50,
): Promise<readonly DlqTaak[]> {
  const r = await rijen<{
    id: number;
    soort: string;
    pogingen: number;
    laatste_fout: string | null;
    laatste_fout_soort: string | null;
    bijgewerkt_op: string;
  }>(
    c,
    `select id, soort, pogingen, laatste_fout, laatste_fout_soort,
            bijgewerkt_op::text as bijgewerkt_op
       from intel.taken
      where organisatie_id = $1 and status = 'dlq'
      order by bijgewerkt_op desc
      limit $2`,
    [organisatieId, limiet],
  );
  return r.map((x) => ({
    id: x.id,
    soort: x.soort,
    pogingen: x.pogingen,
    laatsteFout: x.laatste_fout,
    laatsteFoutSoort: x.laatste_fout_soort,
    bijgewerktOp: x.bijgewerkt_op,
  }));
}

/**
 * Zet dlq-taken terug in de wachtrij.
 *
 * DIT IS EEN MENSELIJKE HANDELING, en daarom een aparte functie en een
 * aparte vlag op de CLI. Een worker die zijn eigen dlq leegtrekt is
 * geen dlq: dan draait een kapotte taak eeuwig rond en is het enige
 * effect dat de fout vaker in het log staat. Een taak komt in de dlq
 * omdat er iets te BESLISSEN valt — een bron die van vorm veranderde,
 * een ontbrekende variabele, een uitgever die blokkeert.
 *
 * De pogingenteller gaat op nul, want anders is de taak na één
 * hervatting meteen weer op.
 */
export async function hervatUitDlq(
  c: pg.PoolClient,
  organisatieId: number,
  opties: { soort?: string; taakIds?: readonly number[] } = {},
): Promise<readonly number[]> {
  const voorwaarden: string[] = ["organisatie_id = $1", "status = 'dlq'"];
  const params: unknown[] = [organisatieId];
  if (opties.soort) {
    params.push(opties.soort);
    voorwaarden.push(`soort = $${params.length}`);
  }
  if (opties.taakIds && opties.taakIds.length) {
    params.push(opties.taakIds);
    voorwaarden.push(`id = any($${params.length})`);
  }

  const r = await rijen<{ id: number }>(
    c,
    `update intel.taken
        set status = 'wachtend',
            pogingen = 0,
            beschikbaar_op = now(),
            vergrendeld_door = null,
            vergrendeld_op = null,
            zichtbaarheid_tot = null,
            bijgewerkt_op = now()
      where ${voorwaarden.join(" and ")}
      returning id`,
    params,
  );
  if (r.length) {
    log.info("taken hervat uit de dlq", { aantal: r.length, soort: opties.soort ?? "alle" });
  }
  return r.map((x) => x.id);
}

export type WachtrijBeeld = {
  readonly status: string;
  readonly soort: string;
  readonly aantal: number;
};

export async function wachtrijBeeld(
  pool: Pool,
  organisatieId: number,
): Promise<readonly WachtrijBeeld[]> {
  return metOrganisatie(pool, { organisatieId }, async (c) => {
    const r = await rijen<{ status: string; soort: string; aantal: number }>(
      c,
      `select status, soort, count(*)::int as aantal
         from intel.taken
        where organisatie_id = $1
        group by status, soort
        order by status, soort`,
      [organisatieId],
    );
    return r;
  });
}
