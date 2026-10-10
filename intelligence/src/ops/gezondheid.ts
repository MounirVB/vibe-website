/* ============================================================
   OPS — operationele gezondheid
   ------------------------------------------------------------
   Eén functie die elk signaal uit §15 meet en er een uitslag aan
   hangt. Bedoeld om per cron te draaien en de uitvoer naar een
   alerteringskanaal te sturen.

   DRIE NIVEAUS, EN HET VERSCHIL IS NIET COSMETISCH
     OK     binnen de norm
     LET OP iets loopt op, maar niets is kapot. Geen piket.
     FOUT   er is iets kapot of staat stil. Hier hoort een melding bij.

   Een signaal dat NIET GEMETEN kan worden krijgt nooit OK. Dat is de
   belangrijkste regel van dit bestand: een monitor die bij een
   ontbrekende meting groen zegt, is erger dan geen monitor — dan denk
   je dat je het weet.

   WAAROM DREMPELS UIT DE GEMETEN WERKELIJKHEID KOMEN
   De ingestieversheid staat op 26 uur en niet op 1 uur, omdat zes van
   de 21 bronnen een interval van 24 uur hebben en twee zelfs van een
   week. Een drempel van een uur zou dus permanent rood staan en
   daarmee waardeloos zijn. De drempels hieronder zijn afgeleid van de
   werkelijke intervallen in intel.bronnen.
   ============================================================ */

import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type pg from "pg";
import { rijen } from "../kern/db.ts";

export type Niveau = "OK" | "LET OP" | "FOUT" | "NIET GEMETEN";

export type Signaal = {
  readonly groep: string;
  readonly naam: string;
  readonly niveau: Niveau;
  readonly meting: string;
  readonly advies?: string;
};

/* De drempels, met hun onderbouwing. */
export const DREMPELS = {
  /** Het langste bronninterval is een week; 26 uur dekt de dagelijkse. */
  ingestieVersheidUren: 26,
  /** Een bron met drie fouten achtereen is een storing, niet een hik. */
  bronFoutenAchtereen: 3,
  /** Meer wachtende taken dan dit betekent dat de worker niet draait. */
  wachtrijAchterstand: 25,
  /** Elke dlq-taak is een beslissing die wacht. */
  dlqMeldDrempel: 1,
  /** Een back-up ouder dan dit haalt de RPO van 24 uur niet. */
  backupLeeftijdUren: 26,
  /** Een restoretest ouder dan dit is geen bewijs meer. */
  restoretestLeeftijdDagen: 30,
  /** Zoveel procent van het maandbudget is een waarschuwing. */
  budgetWaarschuwingPct: 80,
  /** Accountblokkades in dit venster. */
  authVensterUren: 24,
} as const;

function urenSinds(d: Date | string | null): number | null {
  if (!d) return null;
  const t = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(t.getTime())) return null;
  return (Date.now() - t.getTime()) / 3600_000;
}

/**
 * Meet alles. `backupMap` mag ontbreken; dan is de back-upstatus
 * NIET GEMETEN en nooit OK.
 */
export async function meetGezondheid(
  c: pg.PoolClient,
  organisatieId: number,
  opties: { backupMap?: string } = {},
): Promise<readonly Signaal[]> {
  const uit: Signaal[] = [];
  const voeg = (s: Signaal) => uit.push(s);

  /* ---------------- database ---------------- */
  try {
    const begin = Date.now();
    await c.query("select 1");
    const ms = Date.now() - begin;
    voeg({
      groep: "database",
      naam: "bereikbaarheid",
      niveau: ms < 500 ? "OK" : "LET OP",
      meting: `antwoord in ${ms} ms`,
    });
  } catch (e) {
    voeg({
      groep: "database",
      naam: "bereikbaarheid",
      niveau: "FOUT",
      meting: e instanceof Error ? e.message : String(e),
      advies: "zonder database doet geen enkel onderdeel iets; begin hier",
    });
    return uit; // de rest heeft geen zin
  }

  const mig = await rijen<{ n: number; laatste: string | null }>(
    c,
    "select count(*)::int as n, max(toegepast_op)::text as laatste from intel.migraties",
  );
  voeg({
    groep: "database",
    naam: "migraties",
    niveau: (mig[0]?.n ?? 0) > 0 ? "OK" : "FOUT",
    meting: `${mig[0]?.n ?? 0} toegepast, laatste ${mig[0]?.laatste ?? "onbekend"}`,
  });

  /* ---------------- ingestie ---------------- */
  const bronnen = await rijen<{
    actief: number;
    met_fouten: number;
    ongezond: number;
    laatste_ophaling: string | null;
    oudste_actieve: string | null;
  }>(
    c,
    `select count(*) filter (where actief)::int                                    as actief,
            count(*) filter (where actief and opeenvolgende_fouten >= $2)::int      as met_fouten,
            count(*) filter (where actief and gezondheid <> 'HEALTHY')::int         as ongezond,
            max(laatst_opgehaald_op)::text                                          as laatste_ophaling,
            min(laatst_opgehaald_op) filter (where actief)::text                    as oudste_actieve
       from intel.bronnen where organisatie_id = $1`,
    [organisatieId, DREMPELS.bronFoutenAchtereen],
  );
  const b = bronnen[0];
  const versheid = urenSinds(b?.laatste_ophaling ?? null);
  voeg({
    groep: "ingestie",
    naam: "versheid",
    niveau:
      versheid === null
        ? "NIET GEMETEN"
        : versheid <= DREMPELS.ingestieVersheidUren
          ? "OK"
          : "FOUT",
    meting:
      versheid === null
        ? "nog nooit opgehaald"
        : `laatste ophaling ${versheid.toFixed(1)} uur geleden (drempel ${DREMPELS.ingestieVersheidUren})`,
    advies: versheid !== null && versheid > DREMPELS.ingestieVersheidUren
      ? "draait de planner nog? npm run planner, daarna npm run worker"
      : undefined,
  });
  voeg({
    groep: "ingestie",
    naam: "bronnen met opeenvolgende fouten",
    niveau: (b?.met_fouten ?? 0) === 0 ? "OK" : "FOUT",
    meting: `${b?.met_fouten ?? 0} van ${b?.actief ?? 0} actieve bronnen met >= ${DREMPELS.bronFoutenAchtereen} fouten achtereen`,
    advies: (b?.met_fouten ?? 0) > 0 ? "npm run bronnen voor de reden per bron" : undefined,
  });
  voeg({
    groep: "ingestie",
    naam: "brongezondheid",
    niveau: (b?.ongezond ?? 0) === 0 ? "OK" : "LET OP",
    meting: `${b?.ongezond ?? 0} actieve bron(nen) niet HEALTHY`,
  });

  /* ---------------- wachtrij en worker ---------------- */
  const taken = await rijen<{
    wachtend: number;
    bezig: number;
    dlq: number;
    laatste_gereed: string | null;
    verlopen_lease: number;
  }>(
    c,
    `select count(*) filter (where status = 'wachtend')::int  as wachtend,
            count(*) filter (where status = 'bezig')::int      as bezig,
            count(*) filter (where status = 'dlq')::int        as dlq,
            max(gereed_op)::text                              as laatste_gereed,
            count(*) filter (
              where status = 'bezig' and zichtbaarheid_tot is not null and zichtbaarheid_tot < now()
            )::int                                            as verlopen_lease
       from intel.taken where organisatie_id = $1`,
    [organisatieId],
  );
  const t = taken[0];
  const workerUren = urenSinds(t?.laatste_gereed ?? null);
  voeg({
    groep: "worker",
    naam: "hartslag",
    niveau:
      workerUren === null ? "NIET GEMETEN" : workerUren <= DREMPELS.ingestieVersheidUren ? "OK" : "FOUT",
    meting:
      workerUren === null
        ? "nog geen enkele taak afgerond"
        : `laatste afgeronde taak ${workerUren.toFixed(1)} uur geleden`,
  });
  voeg({
    groep: "worker",
    naam: "wachtrijachterstand",
    niveau:
      (t?.wachtend ?? 0) <= DREMPELS.wachtrijAchterstand ? "OK" : "FOUT",
    meting: `${t?.wachtend ?? 0} wachtend, ${t?.bezig ?? 0} bezig (drempel ${DREMPELS.wachtrijAchterstand})`,
    advies: (t?.wachtend ?? 0) > DREMPELS.wachtrijAchterstand ? "draait de worker?" : undefined,
  });
  voeg({
    groep: "worker",
    naam: "verlopen leases",
    niveau: (t?.verlopen_lease ?? 0) === 0 ? "OK" : "LET OP",
    meting: `${t?.verlopen_lease ?? 0} taak/taken met een verlopen lease`,
    advies: (t?.verlopen_lease ?? 0) > 0 ? "een worker is omgevallen; de volgende ronde legt ze terug" : undefined,
  });
  voeg({
    groep: "worker",
    naam: "dead-letter queue",
    niveau: (t?.dlq ?? 0) < DREMPELS.dlqMeldDrempel ? "OK" : "LET OP",
    meting: `${t?.dlq ?? 0} taak/taken in de dlq`,
    advies: (t?.dlq ?? 0) > 0 ? "npm run worker -- --dlq om te zien waarom" : undefined,
  });

  /* ---------------- planner ---------------- */
  const planner = await rijen<{ laatste: string | null; n: number }>(
    c,
    `select max(gestart_op)::text as laatste, count(*)::int as n
       from intel.planner_runs where organisatie_id = $1`,
    [organisatieId],
  );
  const plannerUren = urenSinds(planner[0]?.laatste ?? null);
  voeg({
    groep: "planner",
    naam: "hartslag",
    niveau: plannerUren === null ? "NIET GEMETEN" : plannerUren <= 2 ? "OK" : "FOUT",
    meting:
      plannerUren === null
        ? "nog nooit gedraaid"
        : `laatste run ${plannerUren.toFixed(1)} uur geleden (${planner[0]?.n} runs totaal)`,
    advies:
      plannerUren !== null && plannerUren > 2
        ? "de planner hoort elk uur te draaien; staat de cron aan?"
        : undefined,
  });

  /* ---------------- publicatie ---------------- */
  const pub = await rijen<{
    geschreven: number;
    teruggedraaid: number;
    goedgekeurd_wachtend: number;
    laatste: string | null;
  }>(
    c,
    `select (select count(*) filter (where status = 'geschreven')
               from intel.publicaties where organisatie_id = $1)::int        as geschreven,
            (select count(*) filter (where status = 'teruggedraaid')
               from intel.publicaties where organisatie_id = $1)::int        as teruggedraaid,
            (select count(*) from intel.inhoud_versies
              where organisatie_id = $1 and status = 'goedgekeurd')::int     as goedgekeurd_wachtend,
            (select max(op)::text from intel.publicaties
              where organisatie_id = $1)                                     as laatste`,
    [organisatieId],
  );
  const p = pub[0];
  voeg({
    groep: "publicatie",
    naam: "goedgekeurd maar nog niet gepubliceerd",
    niveau: (p?.goedgekeurd_wachtend ?? 0) === 0 ? "OK" : "LET OP",
    meting: `${p?.goedgekeurd_wachtend ?? 0} versie(s) wachten op publicatie`,
  });
  voeg({
    groep: "publicatie",
    naam: "teruggedraaide publicaties",
    niveau: (p?.teruggedraaid ?? 0) === 0 ? "OK" : "LET OP",
    meting: `${p?.geschreven ?? 0} geschreven, ${p?.teruggedraaid ?? 0} teruggedraaid`,
  });

  /* ---------------- AI en kosten ---------------- */
  const ai = await rijen<{
    maand: number;
    onbekend: number;
    gemeten: string;
    plafond_maand: number | null;
    plafond_kosten: string | null;
    onderbreker_open: boolean;
  }>(
    c,
    `select (select count(*) from intel.ai_aanroepen
              where organisatie_id = $1 and op >= date_trunc('month', now()))::int   as maand,
            (select count(*) from intel.ai_aanroepen
              where organisatie_id = $1 and op >= date_trunc('month', now())
                and kosten_bron = 'onbekend')::int                                   as onbekend,
            (select coalesce(sum(kosten_schatting), 0)::text from intel.ai_aanroepen
              where organisatie_id = $1 and op >= date_trunc('month', now())
                and kosten_bron <> 'onbekend')                                       as gemeten,
            (select max_ai_aanroepen_per_maand from intel.kostenplafonds
              where organisatie_id = $1)                                             as plafond_maand,
            (select max_kosten_per_maand::text from intel.kostenplafonds
              where organisatie_id = $1)                                             as plafond_kosten,
            (select coalesce(bool_or(open_tot > now()), false) from intel.ai_stroomonderbreker
              where organisatie_id = $1)                                             as onderbreker_open`,
    [organisatieId],
  );
  const a = ai[0];
  const pctAanroepen =
    a?.plafond_maand && a.plafond_maand > 0 ? (a.maand / a.plafond_maand) * 100 : null;
  voeg({
    groep: "ai",
    naam: "maandbudget aanroepen",
    niveau:
      pctAanroepen === null
        ? "NIET GEMETEN"
        : pctAanroepen >= 100
          ? "FOUT"
          : pctAanroepen >= DREMPELS.budgetWaarschuwingPct
            ? "LET OP"
            : "OK",
    meting:
      pctAanroepen === null
        ? `${a?.maand ?? 0} aanroepen deze maand, geen maandplafond ingesteld`
        : `${a?.maand} van ${a?.plafond_maand} (${pctAanroepen.toFixed(0)}%)`,
  });
  voeg({
    groep: "ai",
    naam: "kosten",
    niveau: (a?.onbekend ?? 0) > 0 ? "NIET GEMETEN" : "OK",
    meting:
      (a?.onbekend ?? 0) > 0
        ? `${a?.onbekend} aanroep(en) deze maand met ONBEKENDE kosten (geen tarief vastgelegd)`
        : `gemeten ${Number(a?.gemeten ?? 0).toFixed(4)} deze maand`,
    advies:
      (a?.onbekend ?? 0) > 0
        ? "npm run ai -- --tarief ... om een tarief MET bron en datum vast te leggen"
        : undefined,
  });
  voeg({
    groep: "ai",
    naam: "stroomonderbreker",
    niveau: a?.onderbreker_open ? "FOUT" : "OK",
    meting: a?.onderbreker_open ? "OPEN: er worden geen modelaanroepen gedaan" : "dicht",
  });

  /* ---------------- authenticatie ---------------- */
  const auth = await rijen<{ blokkades: number; logins: number }>(
    c,
    `select count(*) filter (where handeling = 'account_op_slot')::int as blokkades,
            count(*) filter (where handeling = 'inloggen')::int        as logins
       from intel.audit_gebeurtenissen
      where organisatie_id = $1 and op >= now() - make_interval(hours => $2)`,
    [organisatieId, DREMPELS.authVensterUren],
  );
  voeg({
    groep: "beveiliging",
    naam: "accountblokkades",
    niveau: (auth[0]?.blokkades ?? 0) === 0 ? "OK" : "LET OP",
    meting: `${auth[0]?.blokkades ?? 0} blokkade(s) en ${auth[0]?.logins ?? 0} geslaagde logins in ${DREMPELS.authVensterUren} uur`,
    advies: (auth[0]?.blokkades ?? 0) > 0 ? "mogelijk een aanval; bekijk het auditspoor" : undefined,
  });

  /* ---------------- koppelingen ---------------- */
  const kop = await rijen<{ sleutel: string; status: string; vertrouwd: boolean }>(
    c,
    "select sleutel, status, vertrouwd from intel.koppelingen where organisatie_id = $1 order by sleutel",
    [organisatieId],
  );
  const nietAangesloten = kop.filter((k) => k.status !== "geconfigureerd");
  voeg({
    groep: "koppelingen",
    naam: "analytics en CRM",
    niveau: nietAangesloten.length === 0 ? "OK" : "NIET GEMETEN",
    meting:
      nietAangesloten.length === 0
        ? `alle ${kop.length} koppelingen geconfigureerd`
        : `${nietAangesloten.length} van ${kop.length} NIET AANGESLOTEN: ${nietAangesloten.map((k) => k.sleutel).join(", ")}`,
    advies:
      nietAangesloten.length > 0
        ? "zonder credentials blijft elke funnelstap ONBEKEND, en dat is geen nul"
        : undefined,
  });

  /* ---------------- back-up en restore ---------------- */
  if (!opties.backupMap || !existsSync(opties.backupMap)) {
    voeg({
      groep: "backup",
      naam: "aanwezigheid",
      niveau: "NIET GEMETEN",
      meting: opties.backupMap ? `map ${opties.backupMap} bestaat niet` : "geen back-upmap opgegeven",
      advies: "npm run backup",
    });
  } else {
    const bestanden = (await readdir(opties.backupMap)).filter((x) => x.endsWith(".dump")).sort();
    if (!bestanden.length) {
      voeg({
        groep: "backup",
        naam: "aanwezigheid",
        niveau: "FOUT",
        meting: "geen enkele back-up aanwezig",
        advies: "npm run backup — zonder back-up is de goedkeuringsgeschiedenis onherstelbaar",
      });
    } else {
      const nieuwste = bestanden[bestanden.length - 1]!;
      const s = await stat(join(opties.backupMap, nieuwste));
      const uren = (Date.now() - s.mtimeMs) / 3600_000;
      voeg({
        groep: "backup",
        naam: "leeftijd nieuwste back-up",
        niveau: uren <= DREMPELS.backupLeeftijdUren ? "OK" : "FOUT",
        meting: `${nieuwste}, ${uren.toFixed(1)} uur oud, ${Math.round(s.size / 1024)} kB`,
        advies: uren > DREMPELS.backupLeeftijdUren ? "de RPO van 24 uur wordt niet gehaald" : undefined,
      });

      /* Het manifest zegt of de back-up te verifiëren is. */
      const manifestPad = join(opties.backupMap, `${nieuwste}.manifest.json`);
      if (existsSync(manifestPad)) {
        const m = JSON.parse(await readFile(manifestPad, "utf8")) as {
          tellingen?: Record<string, number>;
          migraties?: number;
        };
        const kritiek = Object.values(m.tellingen ?? {}).reduce((x, y) => x + y, 0);
        voeg({
          groep: "backup",
          naam: "manifest",
          niveau: "OK",
          meting: `${m.migraties ?? "?"} migraties, ${kritiek} kritieke rijen vastgelegd`,
        });
      } else {
        voeg({
          groep: "backup",
          naam: "manifest",
          niveau: "FOUT",
          meting: "de nieuwste back-up heeft geen manifest; een restore is dan niet te verifieren",
        });
      }
    }
  }

  /* De restoretest laat een merkbestand achter zodat de LEEFTIJD van
     het laatste bewijs te meten is. Ontbreekt dat bestand, dan is er
     geen bewijs en is dat NIET GEMETEN — nooit OK. */
  const merk = opties.backupMap ? join(opties.backupMap, ".laatste-restoretest.json") : null;
  if (merk && existsSync(merk)) {
    const j = JSON.parse(await readFile(merk, "utf8")) as {
      op?: string;
      uitslag?: string;
      toetsen_geslaagd?: number;
      restore_ms?: number;
    };
    const dagen = (urenSinds(j.op ?? null) ?? Infinity) / 24;
    voeg({
      groep: "backup",
      naam: "restoretest",
      niveau:
        j.uitslag !== "PASS"
          ? "FOUT"
          : dagen <= DREMPELS.restoretestLeeftijdDagen
            ? "OK"
            : "LET OP",
      meting:
        `laatste ${j.uitslag ?? "?"} ${Number.isFinite(dagen) ? `${dagen.toFixed(1)} dagen geleden` : "op een onbekend moment"}` +
        `, ${j.toetsen_geslaagd ?? "?"} toetsen, restore in ${j.restore_ms ?? "?"} ms`,
      advies:
        dagen > DREMPELS.restoretestLeeftijdDagen
          ? `ouder dan ${DREMPELS.restoretestLeeftijdDagen} dagen; npm run restoretest`
          : undefined,
    });
  } else {
    voeg({
      groep: "backup",
      naam: "restoretest",
      niveau: "NIET GEMETEN",
      meting: "geen bewijs van een restoretest gevonden",
      advies: `npm run restoretest — hoort minstens elke ${DREMPELS.restoretestLeeftijdDagen} dagen`,
    });
  }

  return uit;
}

/** De zwaarste uitslag bepaalt de exitcode. */
export function zwaarste(signalen: readonly Signaal[]): Niveau {
  if (signalen.some((s) => s.niveau === "FOUT")) return "FOUT";
  if (signalen.some((s) => s.niveau === "NIET GEMETEN")) return "NIET GEMETEN";
  if (signalen.some((s) => s.niveau === "LET OP")) return "LET OP";
  return "OK";
}
