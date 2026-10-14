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
import { downloadUitGcs, gcsConfigUitOmgeving, lijstGcs } from "./gcsopslag.ts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { leesSitekennis } from "../site/sitekennis.ts";
import { meldBestemming } from "./melden.ts";
import { meetBrondekking, vatBrondekkingSamen } from "./brondekking.ts";
import {
  bewijsIsVolledigGeslaagd,
  leesRestorebewijsUitTaken,
  restoreAanvaardbaar,
  RESTORETEST_TAAK_SOORT,
  type Bewijsbron,
} from "./restorebewijs.ts";

export type Niveau = "OK" | "LET OP" | "FOUT" | "NIET GEMETEN";

/**
 * Waar het restorebewijs in de bucket staat.
 *
 * Eén naam, gedeeld door cli/restoretest.ts (die hem schrijft) en dit
 * bestand (dat hem leest). Twee losse letterlijke strings zouden bij de
 * eerste wijziging uiteenlopen, en dan staat het signaal weer op NIET
 * GEMETEN zonder dat iemand weet waarom.
 */
export const RESTORETEST_MERK_OBJECT = "restoretest/laatste.json";

export type Signaal = {
  readonly groep: string;
  readonly naam: string;
  readonly niveau: Niveau;
  readonly meting: string;
  /**
   * Wanneer het GEMETEN FEIT dateert, in ISO-vorm.
   *
   * Par. 9: een status zonder tijdstempel mag niet als verse meting
   * gelden. Dit is met opzet NIET het moment van meten — dat is altijd
   * "nu" en zegt niets — maar de ouderdom van het onderliggende feit:
   * het moment van de nieuwste dump, van het laatste restorebewijs, van
   * de laatste plannerrun. Ontbreekt hij, dan is de meting momentaan en
   * is er niets te verouderen.
   */
  readonly gemetenOp?: string;
  readonly advies?: string;
  /**
   * Een BEKENDE en aanvaarde beperking, geen nieuw probleem.
   *
   * Par. 18: een bron die ons bewust buitensluit mag het hele platform
   * niet ongezond maken zolang de rest werkt. Zo'n signaal blijft
   * zichtbaar — er wordt niets weggemoffeld — maar hij tilt de
   * totaalernst niet verder dan DEGRADED. Zonder dit onderscheid staat
   * het dashboard permanent op rood voor vijf bronnen die we zelf
   * geparkeerd hebben, en dan kijkt niemand er meer naar.
   */
  readonly aanvaard?: boolean;
};

/* De drempels, met hun onderbouwing. */
export const DREMPELS = {
  /** Het langste bronninterval is een week; 26 uur dekt de dagelijkse. */
  ingestieVersheidUren: 26,
  /** Een bron met drie fouten achtereen is een storing, niet een hik. */
  bronFoutenAchtereen: 3,
  /** Meer wachtende taken dan dit betekent dat de worker niet draait. */
  wachtrijAchterstand: 25,
  /**
   * Minder pagina's dan dit in de sitekennis is een storing.
   *
   * De live site heeft 430 gepubliceerde canonieke URL's. Honderd is
   * ruim onder elke legitieme stand en ruim boven de 60 die een
   * niet-recursieve scan opleverde, dus deze drempel vangt zowel een
   * leeg artefact als een half gevulde scan.
   */
  sitekennisMinimumPaginas: 100,
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
  /**
   * De planner hoort elk uur te draaien (cron `0 * * * *` op
   * vibe-intel-planner, zie deploy/railway.md). Twee uur is dus één
   * gemist venster plus marge.
   *
   * Deze stond als losse `2` midden in de code terwijl elke andere
   * drempel hier staat, mét onderbouwing. Een drempel die je niet op
   * één plek kunt vinden, wordt bij de volgende wijziging vergeten.
   */
  plannerHartslagUren: 2,
  /**
   * De voorstelronde draait met de redactionele cyclus mee, niet per
   * uur. Drie dagen is ruim: daarbinnen hoort elke werkweek minstens
   * een ronde te vallen.
   */
  redactieVersheidUren: 72,
} as const;

function urenSinds(d: Date | string | null): number | null {
  if (!d) return null;
  const t = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(t.getTime())) return null;
  return (Date.now() - t.getTime()) / 3600_000;
}

/**
 * De stand van het EXTERNE archief, als één signaal.
 *
 * Stond als inline tak onderaan meetGezondheid. Sinds 3.0.5 apart, omdat
 * de uitkomst nodig is VOORDAT de lokale back-upsignalen worden gezet:
 * een leeg lokaal archief is een aanvaarde grens zolang de bucket een
 * verse dump heeft, en een echt probleem zodra dat niet zo is.
 */
/**
 * Mag een LEEG lokaal back-uparchief als aanvaarde grens gelden?
 *
 * Pure functie, met opzet los van `meetGezondheid()`: deze beslissing
 * bepaalt of het back-updomein DEGRADED of CRITICAL wordt, en die regel
 * hoort toetsbaar te zijn zonder database en zonder bucket.
 *
 * DE ARCHITECTUUR DIE HIJ VOLGT, GEMETEN OP 14 OKTOBER 2026.
 * Op Railway is `APP_WORTEL/backups` ephemere containerschijf: na elke
 * deploy leeg. De bucket is de waarheid. En alléén vibe-intel-worker
 * draagt INTEL_GCS_* en voert de dagelijkse back-uptaak uit; de api en de
 * planner hebben geen back-uprol.
 *
 * Daardoor meldde `npm run gezondheid` op vibe-intel-api
 * `CRITICAL — map /app/backups bestaat niet`, terwijl dezelfde code op de
 * worker `externe kopie OK — 11 dumps, nieuwste 1,1 uur oud` en
 * `restoretest OK` gaf. Een signaal dat van de meetPLAATS afhangt, is
 * geen signaal over het platform.
 *
 * TWEE WEGEN NAAR 'AANVAARD', EN BEIDE VRAGEN BEWIJS:
 *
 *   1. de bucket zelf is gezond (een verse dump is aantoonbaar aanwezig);
 *   2. of het TAKENLOGBOEK toont een GESLAAGDE back-uptaak binnen
 *      dezelfde RPO-grens. `intel.taken` is gedeeld, dus dat antwoord is
 *      op elke service hetzelfde.
 *
 * WAT HIJ NOOIT DOET: de ernst verlagen zonder bewijs. Geen geslaagde
 * taak, een te oude taak, of een bucket die wél meetbaar is maar niet
 * gezond — in alle drie die gevallen weegt het lokale gat onverminderd.
 */
export function backupAanvaardbaar(inv: {
  /** Het niveau van de bucketmeting, of null als deze service de bucket niet kan zien. */
  readonly externNiveau: Niveau | null;
  /** Uren sinds de laatste GESLAAGDE back-uptaak, of null als er geen is. */
  readonly taakUren: number | null;
  readonly drempelUren: number;
}): { readonly aanvaard: boolean; readonly viaTakenlogboek: boolean; readonly grond: string } {
  const taakVers = inv.taakUren !== null && inv.taakUren <= inv.drempelUren;

  if (inv.externNiveau === "OK") {
    return { aanvaard: true, viaTakenlogboek: false, grond: "de bucket draagt een verse dump" };
  }
  /* Een bucket die MEETBAAR is maar niet gezond, mag nooit vergoelijkt
     worden door het takenlogboek: dan is er iets echt mis en is een
     geslaagde taak van gisteren juist verwarrend. */
  if (inv.externNiveau !== null) {
    return {
      aanvaard: false,
      viaTakenlogboek: false,
      grond: `de bucket is meetbaar maar niet gezond (${inv.externNiveau})`,
    };
  }
  if (taakVers) {
    return {
      aanvaard: true,
      viaTakenlogboek: true,
      grond: `niet meetbaar vanaf deze service, maar het takenlogboek toont een geslaagde back-uptaak van ${inv.taakUren?.toFixed(1)} uur oud`,
    };
  }
  return {
    aanvaard: false,
    viaTakenlogboek: false,
    grond:
      inv.taakUren === null
        ? "geen enkele geslaagde back-uptaak in het logboek"
        : `de laatste geslaagde back-uptaak is ${inv.taakUren.toFixed(1)} uur oud, ouder dan de RPO van ${inv.drempelUren} uur`,
  };
}

async function meetExterneBackup(
  gcs: ReturnType<typeof gcsConfigUitOmgeving>,
): Promise<Signaal> {
  if (!gcs) {
    return {
      groep: "backup",
      naam: "externe kopie",
      niveau: "NIET GEMETEN",
      meting: "INTEL_GCS_BUCKET en/of INTEL_GCS_SLEUTEL ontbreken",
      advies:
        "zonder externe bestemming is er geen retentie: de containerschijf is na een deploy leeg",
    };
  }
  try {
    const objecten = (await lijstGcs(gcs, "vibe-intel-")).filter((o) => o.naam.endsWith(".dump"));
    const nieuwste = objecten[objecten.length - 1];
    if (!nieuwste) {
      return {
        groep: "backup",
        naam: "externe kopie",
        niveau: "FOUT",
        meting: `gs://${gcs.bucket} bevat geen enkele dump`,
        advies: "npm run backup — de bucket bestaat maar is leeg",
      };
    }
    const uren = (Date.now() - new Date(nieuwste.gemaaktOp).getTime()) / 3_600_000;
    return {
      groep: "backup",
      naam: "externe kopie",
      niveau: uren <= DREMPELS.backupLeeftijdUren ? "OK" : "FOUT",
      meting:
        `${objecten.length} dump(s) in gs://${gcs.bucket}, nieuwste ${uren.toFixed(1)} uur oud ` +
        `(${Math.round(nieuwste.bytes / 1024)} kB, ${nieuwste.naam})`,
      gemetenOp: new Date(nieuwste.gemaaktOp).toISOString(),
      advies:
        uren > DREMPELS.backupLeeftijdUren
          ? `ouder dan ${DREMPELS.backupLeeftijdUren} uur; de RPO van 24 uur wordt niet gehaald`
          : undefined,
    };
  } catch (e) {
    /* Een onbereikbare bucket is GEEN stilzwijgende OK. */
    return {
      groep: "backup",
      naam: "externe kopie",
      niveau: "FOUT",
      meting: `gs://${gcs.bucket} niet te lezen: ${(e as Error).message.slice(0, 120)}`,
      advies: "controleer INTEL_GCS_SLEUTEL en de rechten op de bucket",
    };
  }
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
    sleutels_met_fouten: string;
  }>(
    c,
    /* `sleutels_met_fouten` is erbij gekomen omdat dit signaal de enige in
       zijn groep was die GEEN bronnen noemde. Het buursignaal op :293 doet
       het al met dezelfde string_agg, en zonder de sleutels kan het
       Railway-log de falende bron per constructie nooit aanwijzen — de
       gezondheidstaak logt alleen groep/naam=NIVEAU. Wie dan wil weten
       WELKE bron faalt, moet een tweede commando draaien dat hij niet kan
       kennen. */
    `select count(*) filter (where actief)::int                                    as actief,
            count(*) filter (where actief and opeenvolgende_fouten >= $2)::int      as met_fouten,
            count(*) filter (where actief and gezondheid <> 'HEALTHY')::int         as ongezond,
            max(laatst_opgehaald_op)::text                                          as laatste_ophaling,
            min(laatst_opgehaald_op) filter (where actief)::text                    as oudste_actieve,
            coalesce(string_agg(sleutel, ', ' order by sleutel)
                       filter (where actief and opeenvolgende_fouten >= $2), '')     as sleutels_met_fouten
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
    meting:
      `${b?.met_fouten ?? 0} van ${b?.actief ?? 0} actieve bronnen met >= ${DREMPELS.bronFoutenAchtereen} fouten achtereen` +
      (b?.sleutels_met_fouten ? `: ${b.sleutels_met_fouten.slice(0, 160)}` : ""),
    /* HET ADVIES NOEMDE HET VERKEERDE COMMANDO, en dat is duurder dan geen
       advies. `npm run bronnen` (src/cli/bronnen.ts) opent geen enkele
       databaseverbinding — gemeten: nul treffers op kern/db, Pool en
       INTEL_DB_URL in dat bestand. Het leest alleen het CODEregister en kan
       dus per constructie niet zeggen welke bron NU faalt; het noemt
       uitsluitend de redenen van bronnen die in de code al uit staan.
       Het commando dat storingssoort, storing_sinds, storing_detail,
       ophalen_opgeschort_tot en opeenvolgende_fouten uit intel.bronnen
       haalt, is `npm run bronaudit` — en het buursignaal op de
       brondekkingstak adviseert dat zelf al. Twee adviezen voor dezelfde
       vraag, waarvan er één naar een doodlopend spoor stuurde. */
    advies: (b?.met_fouten ?? 0) > 0 ? "npm run bronaudit voor de reden per bron" : undefined,
  });
  voeg({
    groep: "ingestie",
    naam: "brongezondheid",
    niveau: (b?.ongezond ?? 0) === 0 ? "OK" : "LET OP",
    meting: `${b?.ongezond ?? 0} actieve bron(nen) niet HEALTHY`,
  });

  /* ---------------- storingstaxonomie per bron ----------------
     Niet 'hoeveel bronnen zijn stuk' maar WAAROM. De soort bepaalt wie
     er iets moet doen, en of er iemand iets moet doen. Zie
     bronnen/storingssoort.ts. */
  const storingen = await rijen<{
    soort: string;
    aantal: number;
    actieve: number;
    sleutels: string;
    details: string | null;
  }>(
    c,
    /* `details` is erbij gekomen omdat de SLEUTEL alleen niet genoeg is om
       te besluiten. Gemeten op productie, 14 oktober 2026 01:05Z: dit
       signaal zei `TOEGANG_BEPERKT=FOUT [1 bron(nen), waarvan 1 actief:
       rendo-nieuws]`. Daarmee weet je WELKE bron, maar niet WELKE
       weigering — 403, 401 of een robotsverbod — en die drie vragen elk
       een andere handeling. Zonder dat onderscheid is de enige uitweg
       databasetoegang, en die bestaat met opzet niet.

       Aanleiding: robots.txt van rendogroep.nl heeft een LEGE Disallow en
       de feed gaf HTTP 200 met geldige RSS vanaf twee onafhankelijke
       uitgangen. De uitgever sluit ons dus niet uit, en toch stond de
       bron als TOEGANG_BEPERKT opgeschort. Of dat klopt, is zonder
       `storing_detail` niet vast te stellen.

       ALLEEN VOOR ACTIEVE BRONNEN. Bij een geparkeerde bron is de grens
       aanvaard en hoeft niemand iets; de details zouden de regel dan
       alleen langer maken. */
    `select storingssoort as soort, count(*)::int as aantal,
            count(*) filter (where actief)::int as actieve,
            string_agg(sleutel, ', ' order by sleutel) as sleutels,
            string_agg(
              sleutel || ' -> ' || coalesce(storing_detail, 'geen detail bewaard')
                || coalesce(' | sinds ' || to_char(storing_sinds, 'YYYY-MM-DD"T"HH24:MI"Z"'), '')
                || coalesce(' | opgeschort tot ' || to_char(ophalen_opgeschort_tot, 'YYYY-MM-DD"T"HH24:MI"Z"'), ''),
              ' ;; ' order by sleutel)
              filter (where actief)                                        as details
       from intel.bronnen
      where organisatie_id = $1 and storingssoort is not null
      group by storingssoort order by storingssoort`,
    [organisatieId],
  );
  for (const st of storingen) {
    /* EEN GEPARKEERDE BEPERKING IS AANVAARD, EEN ACTIEVE NIET.
       Staat een beperkte bron uit, dan is de beperking vastgesteld en
       hebben we hem geaccepteerd: dat is een bekende grens. Staat hij
       nog ACTIEF en loopt hij tegen een beperking aan, dan is dat nieuw
       en moet er iemand naar kijken. */
    /* WELKE SOORTEN AANVAARD MOGEN WORDEN ALS ZE GEPARKEERD STAAN.
       TOEGANG_BEPERKT en NIET_GEAUTORISEERD stonden hier al: een
       vastgestelde grens die we hebben geaccepteerd.

       CDN_BLOKKADE komt erbij (0037). Een geparkeerde CDN-blokkade is net
       zo'n bekende, verantwoorde grens — en de remedie ligt bovendien
       buiten ons bereik: een firewallregel van de uitgever.

       TOEGANG_ONBEKEND komt er met OPZET NIET bij. Een grens die je niet
       hebt vastgesteld, kun je niet aanvaarden; dan is 'aanvaard' een
       manier om onwetendheid groen te maken. Die soort blijft dus FOUT,
       ook als de bron uitstaat, tot iemand de oorzaak vaststelt.

       Let op wat hier NIET gebeurt: niets hiervan verlaagt de ernst van
       een ACTIEVE bron. `aanvaard` vereist `st.actieve === 0`. Voor
       rendo-nieuws — één ACTIEVE bron met een CDN-blokkade — blijft het
       signaal onverminderd FOUT. */
    const beperking =
      st.soort === "TOEGANG_BEPERKT" || st.soort === "NIET_GEAUTORISEERD" || st.soort === "CDN_BLOKKADE";
    const aanvaard = beperking && st.actieve === 0;
    voeg({
      groep: "ingestie",
      naam: `storingssoort ${st.soort}`,
      niveau: st.soort === "LEEG_MAAR_GEZOND" ? "OK" : aanvaard ? "LET OP" : "FOUT",
      meting:
        `${st.aantal} bron(nen), waarvan ${st.actieve} actief: ${st.sleutels.slice(0, 160)}` +
        /* De details alleen bij een FOUT, want daar moet iemand iets.
           `storing_detail` komt uit classificeerStoring en bestaat uit
           gemeten statussen (http=403 robots=toegestaan ...); er staat
           geen credential in. Toch afgekapt, zodat een onverwacht lange
           detailtekst de regel niet onleesbaar maakt. */
        (!aanvaard && st.soort !== "LEEG_MAAR_GEZOND" && st.details
          ? ` — detail: ${st.details.slice(0, 320)}`
          : ""),
      aanvaard,
    });
  }

  /* TOESTEMMING NIET VASTGESTELD is geen storingssoort maar mag ook
     nooit als gezond doorgaan: er is simpelweg niets nagetrokken. */
  const onbepaald = await rijen<{ aantal: number; actieve: number; sleutels: string }>(
    c,
    `select count(*)::int as aantal,
            count(*) filter (where actief)::int as actieve,
            coalesce(string_agg(sleutel, ', ' order by sleutel), '') as sleutels
       from intel.bronnen
      where organisatie_id = $1
        and storingssoort is null
        and (robots_status = 'onbekend' or tdm_status = 'onbekend')`,
    [organisatieId],
  );
  const ob = onbepaald[0];
  if ((ob?.aantal ?? 0) > 0) {
    voeg({
      groep: "ingestie",
      naam: "toestemming niet vastgesteld",
      niveau: "NIET GEMETEN",
      meting: `${ob!.aantal} bron(nen), waarvan ${ob!.actieve} actief: ${ob!.sleutels.slice(0, 160)}`,
      advies: "robots.txt en TDM-voorbehoud natrekken; dit is geen verbod en geen storing",
      /* Aanvaard zolang geen van die bronnen actief is: er wordt niets
         opgehaald en er gaat dus ook niets mis. */
      aanvaard: (ob?.actieve ?? 0) === 0,
    });
  }

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
    niveau:
      plannerUren === null
        ? "NIET GEMETEN"
        : plannerUren <= DREMPELS.plannerHartslagUren
          ? "OK"
          : "FOUT",
    meting:
      plannerUren === null
        ? "nog nooit gedraaid"
        : `laatste run ${plannerUren.toFixed(1)} uur geleden (${planner[0]?.n} runs totaal)`,
    advies:
      plannerUren !== null && plannerUren > DREMPELS.plannerHartslagUren
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

  /* ---------------- sitekennis ----------------
     ZONDER DIT SIGNAAL WAS DE STORING ONZICHTBAAR.
     In productie kon Content Studio de website niet zien (/app/kennis
     bestond niet) en leverde hij nul voorstellen. Nul voorstellen zag
     eruit als rust. Dit signaal maakt het verschil tussen "geen kansen"
     en "ik kan de site niet lezen". */
  const kennis = await leesSitekennis(
    resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."),
  );
  if (kennis.ok) {
    voeg({
      groep: "sitekennis",
      naam: "artefact",
      niveau: "OK",
      meting:
        `${kennis.kennis.aantalPaginas} gepubliceerde pagina's, schema ${kennis.kennis.schema}, ` +
        `websiteversie ${kennis.kennis.websiteVersie.slice(0, 12)}`,
    });
    /* Een artefact met verdacht weinig pagina's is technisch geldig maar
       inhoudelijk een storing: de echte site heeft er honderden. */
    voeg({
      groep: "sitekennis",
      naam: "dekking",
      niveau: kennis.kennis.aantalPaginas >= DREMPELS.sitekennisMinimumPaginas ? "OK" : "FOUT",
      meting:
        `${kennis.kennis.aantalPaginas} pagina's (drempel ${DREMPELS.sitekennisMinimumPaginas})`,
      advies:
        kennis.kennis.aantalPaginas >= DREMPELS.sitekennisMinimumPaginas
          ? undefined
          : "npm run sitekennis in een checkout met de website erin, en commit het resultaat",
    });
  } else {
    voeg({
      groep: "sitekennis",
      naam: "artefact",
      niveau: "FOUT",
      meting: `${kennis.fout.soort}: ${kennis.fout.bericht.slice(0, 200)}`,
      advies:
        "zonder sitekennis stelt de besluitmotor voor elk onderwerp een NIEUW artikel voor; " +
        "Content Studio levert dan geen bruikbare voorstellen",
    });
  }

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
  /* ---------------- redactie (par. 18) ----------------
     Dit domein had GEEN ENKELE meting. Het ernstmodel liet dat zien met
     'geen enkele meting voor dit domein', en dat was terecht: het
     platform kon dus niet zeggen of de redactionele keten werkte. En
     juist daar zit de kern van deze release — par. 10: uitspraken
     verwoorden maar er geen paginavoorstel van kunnen maken.

     De metingen hieronder zijn zo gekozen dat NUL nooit stilletjes
     groen is. Nul voorstellen klaar voor review is een signaal, niet
     een geslaagde ronde; nul verwoordbare uitspraken betekent dat de
     keten tussen bewijs en tekst stilstaat. */
  const redactie = await rijen<{
    voorstellen: number;
    klaar: number;
    met_paginawijziging: number;
    beoordeeld: number;
    laatste: Date | null;
  }>(
    c,
    `select count(*)::int as voorstellen,
            count(*) filter (where eindoordeel = 'KLAAR_VOOR_REVIEW')::int as klaar,
            count(*) filter (where wijziging_soort is not null
                               and wijziging_soort <> 'geen')::int as met_paginawijziging,
            count(*) filter (where beoordeeld_op is not null)::int as beoordeeld,
            max(bijgewerkt_op) as laatste
       from intel.inhoud_voorstellen where organisatie_id = $1`,
    [organisatieId],
  );
  const red = redactie[0];
  const redactieVersheid = urenSinds(red?.laatste ?? null);
  voeg({
    groep: "redactie",
    naam: "voorstelronde versheid",
    niveau:
      redactieVersheid === null
        ? "NIET GEMETEN"
        : redactieVersheid <= DREMPELS.redactieVersheidUren
          ? "OK"
          : "LET OP",
    meting:
      redactieVersheid === null
        ? "er is nog nooit een voorstelronde gedraaid"
        : `laatste voorstelronde ${redactieVersheid.toFixed(1)} uur geleden (drempel ${DREMPELS.redactieVersheidUren})`,
    advies: redactieVersheid === null ? "npm run voorstel" : undefined,
  });
  voeg({
    groep: "redactie",
    naam: "voorstellen klaar voor review",
    /* NUL IS GEEN GEZONDE UITKOMST.
       Par. 20 van 3.0.1: nul voorstellen mag nooit worden getoond alsof
       alles in orde is. Zijn er wel voorstellen maar geen enkele klaar,
       dan is dat LET OP: de keten loopt, maar er komt niets uit. */
    niveau: (red?.voorstellen ?? 0) === 0 ? "NIET GEMETEN" : (red?.klaar ?? 0) > 0 ? "OK" : "LET OP",
    meting:
      (red?.voorstellen ?? 0) === 0
        ? "geen enkel voorstel vastgelegd"
        : `${red!.klaar} van ${red!.voorstellen} voorstel(len) klaar voor review, ${red!.beoordeeld} beoordeeld`,
  });
  voeg({
    groep: "redactie",
    naam: "voorstellen met een echte paginawijziging",
    /* De kern van par. 10: een voorstel zonder wijzigingssoort is geen
       paginarevisie. Staat dit op nul terwijl er wel voorstellen zijn,
       dan kan het platform feiten wel beoordelen maar niet omzetten. */
    niveau:
      (red?.voorstellen ?? 0) === 0
        ? "NIET GEMETEN"
        : (red?.met_paginawijziging ?? 0) > 0
          ? "OK"
          : "FOUT",
    meting:
      (red?.voorstellen ?? 0) === 0
        ? "geen enkel voorstel vastgelegd"
        : `${red!.met_paginawijziging} van ${red!.voorstellen} voorstel(len) draagt een paginawijziging`,
    advies:
      (red?.voorstellen ?? 0) > 0 && (red?.met_paginawijziging ?? 0) === 0
        ? "de keten verwoordt wel maar componeert niet; zie par. 10"
        : undefined,
  });

  const verwoording = await rijen<{ totaal: number; verwoordbaar: number; met_zin: number }>(
    c,
    `select count(*)::int as totaal,
            count(*) filter (where verwoordbaar = 'VERWOORDBAAR')::int as verwoordbaar,
            count(*) filter (where verwoorde_zin is not null)::int as met_zin
       from intel.uitspraken where organisatie_id = $1`,
    [organisatieId],
  );
  const vw = verwoording[0];
  voeg({
    groep: "redactie",
    naam: "verwoordbare uitspraken",
    niveau: (vw?.totaal ?? 0) === 0 ? "NIET GEMETEN" : (vw?.met_zin ?? 0) > 0 ? "OK" : "FOUT",
    meting:
      (vw?.totaal ?? 0) === 0
        ? "geen uitspraken"
        : `${vw!.met_zin} uitspraak(en) met een opgeslagen zin, ${vw!.verwoordbaar} verwoordbaar van ${vw!.totaal}`,
    advies:
      (vw?.totaal ?? 0) > 0 && (vw?.met_zin ?? 0) === 0
        ? "npm run semantiek; blijft dit nul, dan mist de semantische laag context"
        : undefined,
  });

  /* ---------------- alerteringsbestemming (par. 19) ----------------
     Of er uberhaupt iemand bereikt kan worden als er iets stuk is. Dit
     hoort in de gezondheidsmeting zelf, want een monitor zonder
     bestemming is een monitor die in een lege kamer schreeuwt.

     Er wordt GEEN ontvanger verzonnen. Staat er geen bestemming
     geconfigureerd, dan is dat de meting: NIET GEMETEN met de reden.
     Een e-mailadres of webhook bedenken zou betekenen dat we
     bedrijfsgegevens naar een partij sturen die niemand heeft
     goedgekeurd. */
  /* GROEP `melden`, NIET `koppelingen` — sinds 3.0.5.
     Dit signaal stond in het domein Connectoren. Het dashboard meldde
     daardoor "Connectoren ACTION_REQUIRED" terwijl alle twintig actieve
     bronnen gezond waren; het werkelijke punt was een ontbrekende
     meldbestemming. Zie de toelichting bij het domein `monitoring` in
     ops/ernst.ts.

     EN HIJ IS AANVAARD ZOLANG HIJ BEWUST ONTBREEKT.
     Een bestemming verzinnen is verboden: dat zou bedrijfsgegevens naar
     een partij sturen die niemand heeft goedgekeurd. Het gevolg was wel
     dat dit signaal permanent op ACTION_REQUIRED stond, en een dashboard
     dat altijd rood is wordt niet meer gelezen. Daarom: zichtbaar
     blijven, met de exacte voorwaarde in het advies, maar niet boven
     DEGRADED — precies waar `aanvaard` voor bestaat.

     Dat mag alleen omdat de INTERNE monitoring wél werkt: elke melding
     wordt bewaard in intel.meldingen en intel.systeem_meldingen, en het
     dashboard toont de open meldingen op /. Zou dat wegvallen, dan is
     dit geen aanvaarde grens meer maar een blinde vlek. */
  const bestemming = meldBestemming();
  voeg({
    groep: "melden",
    naam: "alerteringsbestemming",
    niveau: bestemming.soort === "webhook" ? "OK" : "NIET GEMETEN",
    aanvaard: bestemming.soort === "webhook" ? undefined : true,
    meting:
      bestemming.soort === "webhook"
        ? `webhook geconfigureerd${bestemming.token ? " met token" : " zonder token"}`
        : `NIET_GECONFIGUREERD — ${bestemming.reden} Interne monitoring werkt wel: ` +
          `meldingen staan in intel.meldingen en zijn zichtbaar op het dashboard.`,
    advies:
      bestemming.soort === "geen"
        ? "om externe meldingen aan te zetten: INTEL_MELD_WEBHOOK op een door een mens " +
          "goedgekeurde https-bestemming, eventueel met INTEL_MELD_WEBHOOK_TOKEN"
        : undefined,
  });

  /* ---------------- brondekking (par. 16-18) ----------------
     'overgeslagen 19' is op zichzelf onleesbaar: het kan negentien
     kapotte bronnen betekenen of negentien die netjes nog niet toe
     waren. Dit signaal maakt dat verschil meetbaar. Alleen
     opeenvolgende FOUTEN maken een bron ongezond; een ontbrekende
     toestemming is ACCESS_RESTRICTED en blijft dat. Zie
     ops/brondekking.ts. */
  const dekking = await meetBrondekking(c, organisatieId);
  voeg({
    groep: "ingestie",
    naam: "brondekking",
    niveau:
      dekking.actief === 0
        ? "FOUT"
        : dekking.perKlasse.FAILED > 0
          ? "FOUT"
          : dekking.perKlasse.DEGRADED > 0
            ? "LET OP"
            : "OK",
    meting: vatBrondekkingSamen(dekking),
    gemetenOp: dekking.laatsteGeslaagdeOphaling ?? undefined,
    advies:
      dekking.perKlasse.FAILED > 0
        ? `${dekking.perKlasse.FAILED} bron(nen) faalden drie keer achtereen; npm run bronaudit`
        : dekking.actief === 0
          ? "er is geen enkele actieve bron; zonder ingestie komt er niets binnen"
          : undefined,
  });

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
  /* DE BUCKET IS DE WAARHEID, DE CONTAINERSCHIJF IS EEN BIJZAAK.
     Dat stond al in de toelichting bij 'externe kopie', maar de twee
     LOKALE signalen trokken de totaalernst nog steeds omhoog. Op Railway
     is APP_WORTEL/backups ephemere containerschijf: na elke deploy leeg.
     Gemeten op 13 oktober 2026 stond daardoor backup/aanwezigheid op
     NIET GEMETEN en het ernstrapport op CRITICAL, terwijl de bucket een
     dump van 13 uur oud bevatte waarvan de restore aantoonbaar werkte.

     Sinds 3.0.5 bepalen we de EXTERNE stand eerst. Is die gezond, dan
     blijven de lokale signalen zichtbaar — er wordt niets weggemoffeld —
     maar krijgen ze `aanvaard: true`: een bekende, verantwoorde grens die
     niet boven DEGRADED uitkomt. Zie de kop van ops/ernst.ts; dat veld
     bestaat precies hiervoor. Is de externe stand NIET gezond, dan wegen
     ze onverminderd zwaar. */
  const gcs = gcsConfigUitOmgeving();
  const externeStand = await meetExterneBackup(gcs);

  /* DE DERDE BRON VAN WAARHEID: HET TAKENLOGBOEK.
     ------------------------------------------------------------------
     Gemeten op 14 oktober 2026, en dit was een echt defect in de
     MONITORING en niet in de back-up: `npm run gezondheid` op
     vibe-intel-api meldde `CRITICAL — map /app/backups bestaat niet` en
     `externe kopie NIET GEMETEN`, terwijl de back-ups volledig in orde
     waren. Op vibe-intel-worker, met dezelfde code, meldde hij
     `restoretest OK` en `externe kopie OK — 11 dumps, nieuwste 1,1 uur
     oud`.

     De oorzaak is dat ALLEEN de worker INTEL_GCS_* draagt en de
     back-uptaak uitvoert. De api heeft geen back-uprol. Toch sprak zijn
     meting over de back-ups van het hele platform — en kwam uit op
     CRITICAL omdat hij ze niet kon zien.

     Een signaal dat van de meetPLAATS afhangt, is geen signaal over het
     platform. Daarom nu een derde bron die op ELKE service hetzelfde
     zegt: intel.taken is gedeeld. Daar staat of de dagelijkse
     back-uptaak is GESLAAGD, ongeacht welke container de vraag stelt.

     DIT VERLAAGT GEEN ERNST ZONDER BEWIJS. De taak moet AANTOONBAAR
     geslaagd zijn (status 'gereed') en binnen dezelfde RPO-grens vallen
     als de bucketmeting. Is er geen geslaagde taak, of is hij te oud,
     dan weegt het lokale gat onverminderd zwaar. */
  const backupTaak = await rijen<{ laatste: string | null }>(
    c,
    `select max(gereed_op)::text as laatste
       from intel.taken
      where organisatie_id = $1 and soort = 'backup' and status = 'gereed'`,
    [organisatieId],
  );
  const taakUren = urenSinds(backupTaak[0]?.laatste ?? null);
  const besluit = backupAanvaardbaar({
    externNiveau: gcs ? externeStand.niveau : null,
    taakUren,
    drempelUren: DREMPELS.backupLeeftijdUren,
  });
  const taakVers = besluit.viaTakenlogboek;

  /* Aanvaarden mag alleen als er AANTOONBAAR een verse back-up is — uit
     de bucket óf uit het takenlogboek. Een onbereikbare of lege bucket
     mag een leeg lokaal archief niet vergoelijken, maar een api-service
     die de bucket niet KAN zien mag ook geen valse CRITICAL opleveren
     terwijl het logboek een geslaagde taak van een uur oud toont. */
  /* Eén bron van waarheid voor deze beslissing: backupAanvaardbaar().
     Hier stond `externeStand.niveau === "OK" || taakVers`, en dat is
     dezelfde regel twee keer opgeschreven — precies het soort duplicaat
     dat stil uiteen loopt. */
  const externVers = besluit.aanvaard;

  if (!opties.backupMap || !existsSync(opties.backupMap)) {
    voeg({
      groep: "backup",
      naam: "aanwezigheid",
      niveau: "NIET GEMETEN",
      meting:
        (opties.backupMap ? `map ${opties.backupMap} bestaat niet` : "geen back-upmap opgegeven") +
        (externVers
          ? "; op Railway is dit ephemere containerschijf — zie 'externe kopie' voor het echte archief"
          : ""),
      aanvaard: externVers ? true : undefined,
      advies: externVers ? undefined : "npm run backup",
    });
  } else {
    const bestanden = (await readdir(opties.backupMap)).filter((x) => x.endsWith(".dump")).sort();
    if (!bestanden.length) {
      voeg({
        groep: "backup",
        naam: "aanwezigheid",
        niveau: externVers ? "NIET GEMETEN" : "FOUT",
        meting:
          "geen enkele back-up op de lokale schijf" +
          (externVers ? "; het archief staat extern — zie 'externe kopie'" : ""),
        aanvaard: externVers ? true : undefined,
        advies: externVers
          ? undefined
          : "npm run backup — zonder back-up is de goedkeuringsgeschiedenis onherstelbaar",
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
  /* HET BEWIJS MOET DUURZAAM STAAN, NIET OP DE CONTAINERSCHIJF.
     Tot 3.0.5 werd alleen het lokale merkbestand gelezen. Op Railway is
     dat na elke deploy weg, dus stond dit signaal permanent op NIET
     GEMETEN — ook nadat een restore aantoonbaar was geslaagd. Dat is
     precies het geval dat par. 7 verbiedt: een valse CRITICAL door een
     afwezig merkbestand terwijl het bewijs elders bestaat.

     Sinds 3.0.5 schrijft cli/restoretest.ts het bewijs ook naar de
     bucket (RESTORETEST_MERK_OBJECT), en leest dit signaal dáár eerst.
     De lokale kopie blijft de terugval voor een machine zonder bucket. */
  /* EN SINDS 3.0.8 IS ER EEN DERDE, GEDEELDE BRON — want de bucket is
     óók plaatsgebonden. Gemeten op 14 oktober 2026, dezelfde minuut,
     dezelfde commit:

       vibe-intel-worker  OK            laatste PASS 0,5 dagen geleden
       vibe-intel-api     NIET GEMETEN  geen bewijs gevonden -> CRITICAL

     Alleen de worker draagt INTEL_GCS_*. Het bewijs bestond, de api kon
     er niet bij, en het back-updomein werd daar CRITICAL op een signaal
     dat die service helemaal niet kan meten.

     `intel.taken` staat in de database die elke service al open heeft en
     zegt daar dus hetzelfde. Dat is de GEZAGHEBBENDE bron. De bucket
     blijft meelezen als BEVESTIGING: spreken de twee elkaar tegen, dan
     is dat zelf de bevinding en wordt het signaal FOUT. Zie
     ops/restorebewijs.ts voor de vier regels en waarom elk nodig is. */
  const merk = opties.backupMap ? join(opties.backupMap, ".laatste-restoretest.json") : null;
  let bewijsRuw: string | null = null;
  let bewijsBron = "";
  if (gcs) {
    try {
      bewijsRuw = (await downloadUitGcs(gcs, RESTORETEST_MERK_OBJECT)).toString("utf8");
      bewijsBron = `gs://${gcs.bucket}/${RESTORETEST_MERK_OBJECT}`;
    } catch {
      /* Geen merk in de bucket is geen fout van deze meting; we vallen
         terug op de lokale kopie, en het takenlogboek hieronder kan het
         antwoord alsnog dragen. */
      bewijsRuw = null;
    }
  }
  if (!bewijsRuw && merk && existsSync(merk)) {
    bewijsRuw = await readFile(merk, "utf8");
    bewijsBron = merk;
  }

  /* ---- bron 1: het originele bewijs, waar het leesbaar is ---- */
  type MerkBewijs = {
    op?: string;
    uitslag?: string;
    toetsen_geslaagd?: number;
    toetsen_vereist?: number;
    toetsen_mislukt?: readonly string[];
    restore_ms?: number;
  };
  let merkJson: MerkBewijs | null = null;
  if (bewijsRuw) {
    try {
      merkJson = JSON.parse(bewijsRuw) as MerkBewijs;
    } catch {
      /* Onleesbaar bewijs is GEEN bewijs, en ook geen stille 'geen
         bewijs': dan is er iets stuk in de opslag. */
      merkJson = null;
      voeg({
        groep: "backup",
        naam: "restorebewijs leesbaar",
        niveau: "FOUT",
        meting: `het restorebewijs in ${bewijsBron} is geen geldige JSON; het is daarmee geen bewijs`,
        advies: "npm run restoretest -- --uit-gcs — en kijk waarom het object bedorven is",
      });
    }
  }

  /* `toetsen_vereist` ontbreekt in bewijs van vóór 3.0.8. Dan is
     volledigheid niet VAST TE STELLEN, en dat mag geen stille aanname
     van volledigheid worden — maar ook geen FOUT, want het bewijs is
     gewoon ouder dan de eis. Daarom: oud bewijs geldt als volledig
     zolang er geen controle faalde; nieuw bewijs moet het aantal
     kloppend hebben. Dat staat zo in de meettekst. */
  const merkVolledig =
    merkJson === null
      ? false
      : merkJson.toetsen_vereist === undefined
        ? (merkJson.toetsen_mislukt?.length ?? 0) === 0
        : bewijsIsVolledigGeslaagd({
            uitslag: merkJson.uitslag ?? "",
            toetsen_geslaagd: merkJson.toetsen_geslaagd ?? -1,
            toetsen_vereist: merkJson.toetsen_vereist,
            toetsen_mislukt: merkJson.toetsen_mislukt ?? [],
          });

  const bucketBron: Bewijsbron = {
    uitslag: merkJson === null ? null : merkJson.uitslag === "PASS" ? "PASS" : "FAIL",
    volledig: merkVolledig,
    dagen: merkJson === null ? null : ((urenSinds(merkJson.op ?? null) ?? NaN) / 24 || null),
    bron: bewijsBron || (gcs ? `gs://${gcs.bucket}/${RESTORETEST_MERK_OBJECT}` : "het originele bewijs"),
  };

  /* ---- bron 2: het takenlogboek, gedeeld en dus gezaghebbend ---- */
  const taakBewijs = await leesRestorebewijsUitTaken(c, organisatieId);
  const taakBron: Bewijsbron = {
    uitslag: taakBewijs === null ? null : taakBewijs.status === "gereed" ? "PASS" : "FAIL",
    /* Een rij met status 'gereed' IS per definitie volledig: zo schrijft
       registreerRestoretest() hem. Een onvolledige proef komt daar als
       'mislukt' terecht, met het tekort in `laatste_fout`. */
    volledig: taakBewijs?.status === "gereed",
    dagen: taakBewijs === null ? null : ((urenSinds(taakBewijs.op) ?? NaN) / 24 || null),
    bron: `intel.taken (soort '${RESTORETEST_TAAK_SOORT}')`,
  };

  const oordeel = restoreAanvaardbaar({
    takenlogboek: taakBron,
    bucket: bucketBron,
    drempelDagen: DREMPELS.restoretestLeeftijdDagen,
  });

  /* De meettekst moet de LEZER vertellen waar dit op rust. Een
     herstelstatus zonder bewijsbron is een mening. */
  const details =
    taakBewijs !== null
      ? `${taakBewijs.bewijs.toetsen_geslaagd ?? "?"}/${taakBewijs.bewijs.toetsen_vereist ?? "?"} controles` +
        `, restore in ${taakBewijs.bewijs.restore_ms ?? "?"} ms` +
        `, dump ${taakBewijs.bewijs.dump_object ?? "onbekend"}` +
        (taakBewijs.bewijs.dump_sha256 ? ` (sha256 ${taakBewijs.bewijs.dump_sha256.slice(0, 12)}…)` : "") +
        (taakBewijs.bewijs.bewijs_uri ? `, origineel bewijs ${taakBewijs.bewijs.bewijs_uri}` : "") +
        (taakBewijs.reden ? ` — ${taakBewijs.reden.slice(0, 200)}` : "")
      : merkJson !== null
        ? `${merkJson.toetsen_geslaagd ?? "?"} controles, restore in ${merkJson.restore_ms ?? "?"} ms` +
          (merkJson.toetsen_vereist === undefined
            ? " (bewijs van vóór 3.0.8: het vereiste aantal staat er niet in)"
            : "")
        : "";

  voeg({
    groep: "backup",
    naam: "restoretest",
    niveau: oordeel.niveau,
    meting:
      oordeel.grond +
      (details ? ` [${details}]` : "") +
      ` — bron: ${oordeel.bronnen.join(" + ")}`,
    gemetenOp: taakBewijs?.op ?? merkJson?.op,
    advies:
      oordeel.niveau === "OK"
        ? undefined
        : oordeel.tegenstrijdig
          ? "zoek uit welke bron liegt vóór je op de back-up vertrouwt; registreer daarna opnieuw met npm run restoretest"
          : `npm run restoretest -- --uit-gcs — hoort minstens elke ${DREMPELS.restoretestLeeftijdDagen} dagen, en legt het bewijs in intel.taken vast`,
  });

  /* ---------------- externe kopie ---------------- */
  /* DIT IS HET SIGNAAL DAT HET VERSCHIL MEET tussen "er is een back-up
     gemaakt" en "er ligt een back-up". De lokale map is op Railway een
     containerschijf: na een deploy is hij leeg. Omgekeerd kan de lokale
     map vol staan terwijl er niets buiten de machine bewaard is. Alleen
     deze meting zegt iets over herstelbaarheid na verlies van de machine.

     De meting zelf staat sinds 3.0.5 in meetExterneBackup(), want de
     uitkomst is hierboven al nodig om te beslissen of een leeg LOKAAL
     archief een aanvaarde grens is of een echt probleem. */
  /* GEEN GCS-CONFIGURATIE OP DEZE SERVICE IS GEEN BACK-UPGAT.
     Draait deze meting op een service zonder back-uprol — alleen
     vibe-intel-worker draagt INTEL_GCS_* en voert de back-uptaak uit —
     dan kan hij de bucket niet zien. De oude tekst zei dan dat de
     variabelen "ontbreken", wat als een configuratiefout van het
     platform leest. Het takenlogboek weet beter, en is op elke service
     hetzelfde. */
  if (!gcs && taakVers) {
    voeg({
      ...externeStand,
      aanvaard: true,
      meting:
        `niet meetbaar vanaf deze service (geen INTEL_GCS_*; alleen de worker heeft de back-uprol). ` +
        `Het takenlogboek toont wel een GESLAAGDE back-uptaak van ${taakUren?.toFixed(1)} uur oud ` +
        `— binnen de RPO van ${DREMPELS.backupLeeftijdUren} uur. Draai 'npm run gezondheid' op ` +
        `vibe-intel-worker voor de bucketmeting zelf.`,
      advies: undefined,
    });
  } else {
    voeg(externeStand);
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
