/* ============================================================
   OPS — de wekelijkse operationele rapportage
   ------------------------------------------------------------
   WAT §13 VAN DE OPDRACHT VRAAGT, en wat er al was.

   Tien cijfers moeten inzichtelijk zijn. Gemeten op b2de0c4 was de
   redactionele helft er al — ops/meting.ts meet kandidaten,
   voorstellen, goedgekeurd, gepubliceerd, afgewezen, mislukte
   prechecks — maar de INGESTIEhelft niet: hoeveel bronnen staan actief,
   wanneer was de laatste geslaagde controle, hoeveel nieuwe bronitems
   kwamen erbij, en hoeveel UNIEKE onderwerpen zijn er gedetecteerd.
   Die cijfers stonden in de database en in geen enkel rapport.

   En er was geen WEKELIJKSE cadans. `meting` is dagelijks en logt de
   stand van dat moment; een stand is geen rapportage. Een week is de
   periode waarin de redactie beslist.

   DRIE REGELS DIE DIT RAPPORT STRIKT VOLGT

   1 NIET GEMETEN IS NOOIT NUL. Elk cijfer draagt zijn eigen `bron` en
     `label`. Een cijfer dat niet te meten is krijgt `aantal: null` en
     een reden — nooit een 0 die als 'er is niets gebeurd' leest. Dat is
     de les uit migratie 0009 ("een ontbrekende rij is geen nul"), en
     hier is hij extra belangrijk: nul nieuwe artikelen en nul
     MEETBARE artikelen zien er in een tabel identiek uit.

   2 GEEN NIEUWE EXTERNE DIENST. De opdracht verbiedt dat expliciet.
     Dit rapport leest uitsluitend de eigen database en schrijft naar
     de structuurlogger op stdout — precies wat de `meting`-taak doet,
     en op Railway is dat logboek de bestaande infrastructuur. De
     bestaande meldmaillaag KAN hem versturen; dat staat standaard UIT
     en vraagt INTEL_WEEKRAPPORT_MAIL, zodat niemand per ongeluk een
     wekelijkse mail aanzet door deze taak te plannen.

   3 STRIKT ALLEEN-LEZEN. Elke query hieronder is een SELECT.
   ============================================================ */

import type pg from "pg";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("weekrapport");

/** Een client die alleen gelezen hoeft te worden. */
type Leesclient = Pick<pg.PoolClient, "query">;

export type RapportCijfer = {
  readonly sleutel: string;
  readonly naam: string;
  /** null = NIET GEMETEN. Nooit een 0 als plaatsvervanger. */
  readonly aantal: number | null;
  /** Voor een datum of een tekstwaarde; null als er niets is. */
  readonly waarde: string | null;
  readonly bron: string;
  readonly label: "GEMETEN" | "NIET_MEETBAAR" | "NIET_GEMETEN";
  readonly toelichting: string;
};

export type Weekrapport = {
  readonly organisatieId: number;
  readonly vanDatum: string;
  readonly totDatum: string;
  readonly cijfers: readonly RapportCijfer[];
  /** Cijfers die aandacht vragen; leeg is goed nieuws. */
  readonly aandacht: readonly string[];
};

/* De tien cijfers uit §13, in de orde van de keten. Ze staan hier als
   LIJST en niet verspreid door de functie, zodat een toets kan bewijzen
   dat het er tien zijn en welke. Hetzelfde patroon als
   INDEXATIE_METRIEKEN in analytics/koppelingen.ts, en om dezelfde
   reden: een weggelaten regel leest als 'niet van toepassing' terwijl
   hij 'niet gemeten' betekent. */
export const WEEKRAPPORT_CIJFERS = [
  "actieve_bronnen",
  "laatste_geslaagde_controle",
  "nieuwe_bronitems",
  "unieke_onderwerpen",
  "conceptartikelen",
  "wachtende_goedkeuringen",
  "gepubliceerde_artikelen",
  "publicatiefouten",
  "seo_prestaties",
  "doorkliks_commercieel",
] as const;

export type WeekrapportCijfer = (typeof WEEKRAPPORT_CIJFERS)[number];

async function eenGetal(
  c: Leesclient,
  sql: string,
  params: readonly unknown[],
): Promise<number> {
  const r = await c.query<{ n: string }>(sql, [...params]);
  return Number(r.rows[0]?.n ?? 0);
}

/**
 * Meet de week die eindigt op `totDatum` (standaard vandaag).
 *
 * `vanDatum` is zeven dagen eerder. De grens is inclusief aan de
 * onderkant en exclusief aan de bovenkant, zodat twee opeenvolgende
 * weken dezelfde dag niet dubbel tellen.
 */
export async function meetWeek(
  c: Leesclient,
  organisatieId: number,
  opties: { totDatum?: string } = {},
): Promise<Weekrapport> {
  const tot = opties.totDatum ?? new Date().toISOString().slice(0, 10);
  const van = new Date(Date.parse(`${tot}T00:00:00Z`) - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const cijfers: RapportCijfer[] = [];
  const aandacht: string[] = [];

  /* ---------------- 1. actieve bronnen ---------------- */
  const actief = await eenGetal(
    c,
    "select count(*)::text as n from intel.bronnen where organisatie_id = $1 and actief",
    [organisatieId],
  );
  const totaalBronnen = await eenGetal(
    c,
    "select count(*)::text as n from intel.bronnen where organisatie_id = $1",
    [organisatieId],
  );
  cijfers.push({
    sleutel: "actieve_bronnen",
    naam: "Actieve bronnen",
    aantal: actief,
    waarde: `${actief} van ${totaalBronnen}`,
    bron: "intel.bronnen",
    label: "GEMETEN",
    toelichting:
      `${totaalBronnen - actief} bron(nen) staan uit. Een inactieve bron is een BESLUIT ` +
      "(TDM-voorbehoud of ongemeten toestemming) en geen storing; de constraint " +
      "bronnen_actief_vereist_toestemming verhindert activeren zonder gemeten toestemming.",
  });
  if (actief === 0) aandacht.push("er staat geen enkele bron actief");

  /* ---------------- 2. laatste geslaagde controle ---------------- */
  const laatste = await c.query<{ op: string | null; sleutel: string | null }>(
    `select max(laatst_opgehaald_op)::text as op,
            (select b2.sleutel from intel.bronnen b2
              where b2.organisatie_id = $1 and b2.actief
              order by b2.laatst_opgehaald_op desc nulls last limit 1) as sleutel
       from intel.bronnen
      where organisatie_id = $1 and actief and laatste_resultaat in ('ok', 'niet_gewijzigd')`,
    [organisatieId],
  );
  const laatsteOp = laatste.rows[0]?.op ?? null;
  cijfers.push({
    sleutel: "laatste_geslaagde_controle",
    naam: "Laatste geslaagde broncontrole",
    aantal: null,
    waarde: laatsteOp,
    bron: "intel.bronnen.laatst_opgehaald_op",
    label: laatsteOp === null ? "NIET_GEMETEN" : "GEMETEN",
    toelichting:
      laatsteOp === null
        ? "geen enkele actieve bron heeft ooit een geslaagde ophaling; de collector heeft hier nooit gedraaid"
        : `meest recent: ${laatste.rows[0]?.sleutel ?? "onbekend"}`,
  });
  if (laatsteOp === null) aandacht.push("geen enkele geslaagde broncontrole");

  /* ---------------- 3. nieuwe bronitems ----------------
     Nieuwe brondocumenten in deze week. NIET nieuwe VERSIES: een bron
     die zijn eigen pagina herschrijft levert een nieuwe versie zonder
     een nieuw item, en dat zou het cijfer laten stijgen zonder dat er
     nieuws bij is gekomen. */
  const nieuweItems = await eenGetal(
    c,
    `select count(*)::text as n from intel.brondocumenten
      where organisatie_id = $1 and aangemaakt_op >= $2::date and aangemaakt_op < ($3::date + 1)`,
    [organisatieId, van, tot],
  );
  const foutRondes = await eenGetal(
    c,
    /* `gestart_op` en niet `aangemaakt_op`: deze tabel heeft die kolom
       niet. Gemeten met information_schema vóór deze regel werd
       geschreven, nadat de eerste versie omviel met
       'column "aangemaakt_op" does not exist'. */
    `select count(*)::text as n from intel.bron_ophalingen
      where organisatie_id = $1 and resultaat = 'fout'
        and gestart_op >= $2::date and gestart_op < ($3::date + 1)`,
    [organisatieId, van, tot],
  );
  cijfers.push({
    sleutel: "nieuwe_bronitems",
    naam: "Nieuwe bronitems deze week",
    aantal: nieuweItems,
    waarde: null,
    bron: "intel.brondocumenten",
    label: "GEMETEN",
    toelichting: `${foutRondes} gefaalde ophaling(en) in dezelfde periode`,
  });

  /* ---------------- 4. unieke onderwerpen ---------------- */
  const onderwerpen = await eenGetal(
    c,
    `select count(distinct onderwerp_cluster_id)::text as n
       from intel.markt_gebeurtenissen
      where organisatie_id = $1 and onderwerp_cluster_id is not null
        and aangemaakt_op >= $2::date and aangemaakt_op < ($3::date + 1)`,
    [organisatieId, van, tot],
  );
  const gebeurtenissen = await eenGetal(
    c,
    `select count(*)::text as n from intel.markt_gebeurtenissen
      where organisatie_id = $1 and aangemaakt_op >= $2::date and aangemaakt_op < ($3::date + 1)`,
    [organisatieId, van, tot],
  );
  const zonderCluster = await eenGetal(
    c,
    `select count(*)::text as n from intel.markt_gebeurtenissen
      where organisatie_id = $1 and onderwerp_cluster_id is null
        and aangemaakt_op >= $2::date and aangemaakt_op < ($3::date + 1)`,
    [organisatieId, van, tot],
  );
  cijfers.push({
    sleutel: "unieke_onderwerpen",
    naam: "Unieke onderwerpen deze week",
    aantal: onderwerpen,
    waarde: `${onderwerpen} cluster(s) over ${gebeurtenissen} gebeurtenis(sen)`,
    bron: "intel.markt_gebeurtenissen",
    label: "GEMETEN",
    toelichting:
      `${zonderCluster} gebeurtenis(sen) kregen geen cluster en belanden daarmee op MONITOR; ` +
      "dat is geen fout maar wel de grootste bron van stille uitval.",
  });

  /* ---------------- 5. conceptartikelen ---------------- */
  const concepten = await eenGetal(
    c,
    `select count(*)::text as n from intel.inhoud_versies
      where organisatie_id = $1 and status in ('concept', 'ter_review')`,
    [organisatieId],
  );
  const conceptenNieuw = await eenGetal(
    c,
    `select count(*)::text as n from intel.inhoud_versies
      where organisatie_id = $1 and aangemaakt_op >= $2::date and aangemaakt_op < ($3::date + 1)`,
    [organisatieId, van, tot],
  );
  cijfers.push({
    sleutel: "conceptartikelen",
    naam: "Conceptartikelen in behandeling",
    aantal: concepten,
    waarde: `${concepten} open, ${conceptenNieuw} nieuw deze week`,
    bron: "intel.inhoud_versies",
    label: "GEMETEN",
    toelichting: "status concept of ter_review; een goedgekeurde versie telt hier niet meer mee",
  });

  /* ---------------- 6. wachtende goedkeuringen ----------------
     De versies die de poorten HALEN en dus echt op een mens wachten.
     Een versie met blokkades wacht niet op een goedkeuring maar op een
     reparatie; die twee bij elkaar tellen maakt de wachtrij langer dan
     hij is. */
  const wachtend = await eenGetal(
    c,
    `select count(*)::text as n from intel.inhoud_versies
      where organisatie_id = $1 and status = 'ter_review' and poorten_geslaagd`,
    [organisatieId],
  );
  const geblokkeerd = await eenGetal(
    c,
    `select count(*)::text as n from intel.inhoud_versies
      where organisatie_id = $1 and status = 'ter_review' and not poorten_geslaagd`,
    [organisatieId],
  );
  cijfers.push({
    sleutel: "wachtende_goedkeuringen",
    naam: "Wachtend op menselijke goedkeuring",
    aantal: wachtend,
    waarde: `${wachtend} gereed, ${geblokkeerd} geblokkeerd door een poort`,
    bron: "intel.inhoud_versies",
    label: "GEMETEN",
    toelichting:
      "alleen versies die ALLE poorten halen wachten echt op een mens; een geblokkeerde " +
      "versie wacht op een reparatie en hoort niet in dezelfde wachtrij",
  });
  if (wachtend > 0) aandacht.push(`${wachtend} concept(en) wachten op een goedkeuring`);

  /* ---------------- 7. gepubliceerde artikelen ---------------- */
  const gepubliceerd = await eenGetal(
    c,
    `select count(*)::text as n from intel.publicaties where organisatie_id = $1`,
    [organisatieId],
  );
  const gepubliceerdWeek = await eenGetal(
    c,
    /* De tijdkolom van deze tabel heet `op`, niet `aangemaakt_op`. */
    `select count(*)::text as n from intel.publicaties
      where organisatie_id = $1 and op >= $2::date and op < ($3::date + 1)`,
    [organisatieId, van, tot],
  );
  cijfers.push({
    sleutel: "gepubliceerde_artikelen",
    naam: "Gepubliceerde artikelen",
    aantal: gepubliceerd,
    waarde: `${gepubliceerd} totaal, ${gepubliceerdWeek} deze week`,
    bron: "intel.publicaties",
    label: "GEMETEN",
    toelichting:
      "een rij hier betekent een registerrecord op schijf. De PAGINA bestaat pas na een " +
      "generatorrun, een commit en een push naar main — drie menselijke handelingen.",
  });

  /* ---------------- 8. publicatiefouten ---------------- */
  /* 'automatisch_geblokkeerd' en 'teruggedraaid', NIET 'geweigerd'.
     Eerste versie van deze query telde besluit = 'geweigerd', en die
     waarde BESTAAT NIET: de check-constraint op intel.publicatiebesluiten
     laat alleen ingediend, goedgekeurd, afgewezen, gepubliceerd,
     teruggedraaid en automatisch_geblokkeerd toe. De query had dus
     eeuwig stil 0 teruggegeven — een cijfer dat 'geen publicatiefouten'
     meldt omdat het de verkeerde waarde zoekt, is erger dan geen cijfer.
     Gemeten met pg_get_constraintdef vóór deze regel werd geschreven. */
  const geweigerd = await eenGetal(
    c,
    `select count(*)::text as n from intel.publicatiebesluiten
      where organisatie_id = $1
        and besluit in ('automatisch_geblokkeerd', 'teruggedraaid')
        and op >= $2::date and op < ($3::date + 1)`,
    [organisatieId, van, tot],
  );
  const dlq = await eenGetal(
    c,
    `select count(*)::text as n from intel.taken
      where organisatie_id = $1 and status = 'dlq'`,
    [organisatieId],
  );
  cijfers.push({
    sleutel: "publicatiefouten",
    naam: "Publicatiefouten",
    aantal: geweigerd,
    waarde: `${geweigerd} geweigerde publicatie(s) deze week, ${dlq} taak/taken in de dlq`,
    bron: "intel.publicatiebesluiten + intel.taken",
    label: "GEMETEN",
    toelichting:
      "automatisch_geblokkeerd of teruggedraaid. Een geblokkeerde publicatie is meestal GOED " +
      "nieuws: een poort deed zijn werk. Een taak in de dlq is dat niet en vraagt een mens.",
  });
  if (dlq > 0) aandacht.push(`${dlq} taak/taken staan in de dead-letter queue`);

  /* ---------------- 9. SEO-prestaties ----------------
     INDIEN BESCHIKBAAR, en dat is hier de hele vraag. Zonder Search
     Console bestaan kliks, vertoningen, CTR en positie niet — en dan
     hoort hier NIET MEETBAAR te staan met de ontbrekende koppeling
     erbij, niet een nul. */
  const dagstanden = await eenGetal(
    c,
    `select count(distinct datum)::text as n from intel.indexatie_dagstand
      where organisatie_id = $1`,
    [organisatieId],
  );
  const zoekRijen = await eenGetal(
    c,
    `select count(*)::text as n from intel.zoekvraag_metingen where organisatie_id = $1`,
    [organisatieId],
  );
  cijfers.push({
    sleutel: "seo_prestaties",
    naam: "SEO-prestaties",
    aantal: zoekRijen > 0 ? zoekRijen : null,
    waarde: `${dagstanden} indexatiedagstand(en) bewaard`,
    bron: "intel.zoekvraag_metingen",
    label: zoekRijen > 0 ? "GEMETEN" : "NIET_MEETBAAR",
    toelichting:
      zoekRijen > 0
        ? `${zoekRijen} zoekvraagmeting(en) beschikbaar`
        : "geen Search Console-koppeling, dus geen kliks, vertoningen, CTR of positie. " +
          "Wat WEL meetbaar is zonder credential — technisch indexeerbaar, in de sitemap, " +
          "canoniek — staat in intel.indexatie_dagstand; met minstens twee dagstanden geeft " +
          "npm run analytics een vergelijking over 7, 28 en 90 dagen.",
  });

  /* ---------------- 10. doorkliks naar commerciële pagina's ----------------
     INDIEN MEETBAAR. Een doorklik is een gebeurtenis in de browser van
     een bezoeker; dit platform ziet die niet. Zonder GA4-koppeling is
     dit per constructie onmeetbaar, en dan hoort dat er te staan. */
  const funnelRijen = await eenGetal(
    c,
    `select count(*)::text as n from intel.funnel_metingen where organisatie_id = $1`,
    [organisatieId],
  );
  cijfers.push({
    sleutel: "doorkliks_commercieel",
    naam: "Doorkliks naar commerciële pagina's",
    aantal: funnelRijen > 0 ? funnelRijen : null,
    waarde: null,
    bron: "intel.funnel_metingen",
    label: funnelRijen > 0 ? "GEMETEN" : "NIET_MEETBAAR",
    toelichting:
      funnelRijen > 0
        ? `${funnelRijen} funnelmeting(en) beschikbaar`
        : "een doorklik gebeurt in de browser van een bezoeker en is hier niet te zien. " +
          "Zonder GA4-koppeling is dit onmeetbaar; de interne links die een artikel AANBIEDT " +
          "zijn wel vastgelegd (inhoud_versies.interne_links) en zijn een aanbod, geen gedrag.",
  });

  /* De lijst moet compleet zijn. Zou er een cijfer wegvallen, dan leest
     een korte tabel als 'de rest is in orde'. */
  if (cijfers.length !== WEEKRAPPORT_CIJFERS.length) {
    throw new Error(
      `het weekrapport hoort ${WEEKRAPPORT_CIJFERS.length} cijfers te hebben, niet ${cijfers.length}`,
    );
  }
  for (const sleutel of WEEKRAPPORT_CIJFERS) {
    if (!cijfers.some((x) => x.sleutel === sleutel)) {
      throw new Error(`het weekrapport mist het cijfer '${sleutel}'`);
    }
  }

  return { organisatieId, vanDatum: van, totDatum: tot, cijfers, aandacht };
}

/** Het rapport als platte tekst, voor het log en voor een mail. */
export function rapportAlsTekst(r: Weekrapport): string {
  const regels: string[] = [];
  regels.push(`WEEKRAPPORT ${r.vanDatum} t/m ${r.totDatum}`);
  regels.push("");
  for (const c of r.cijfers) {
    const waarde =
      c.aantal !== null ? String(c.aantal) : c.waarde !== null ? c.waarde : "NIET GEMETEN";
    regels.push(`${c.naam.padEnd(38)} ${waarde.padStart(10)}   [${c.label}]`);
    regels.push(`${" ".repeat(40)}${c.toelichting}`);
  }
  regels.push("");
  if (r.aandacht.length === 0) {
    regels.push("AANDACHT: geen.");
  } else {
    regels.push("AANDACHT:");
    for (const a of r.aandacht) regels.push(`  - ${a}`);
  }
  regels.push("");
  regels.push(
    "Dit rapport publiceert niets en keurt niets goed. Een artikel wordt pas een pagina " +
      "door een menselijke goedkeuring, een generatorrun, een commit en een push.",
  );
  return regels.join("\n");
}

/** Zet elk cijfer als platte sleutel in het log, zodat een zoekopdracht ze vindt. */
export function logWeekrapport(r: Weekrapport): void {
  const plat: Record<string, unknown> = { van: r.vanDatum, tot: r.totDatum };
  for (const c of r.cijfers) {
    plat[c.sleutel] = c.aantal ?? c.waarde ?? null;
    plat[`${c.sleutel}_label`] = c.label;
  }
  plat["aandacht"] = r.aandacht.length === 0 ? "geen" : r.aandacht.join(" ;; ");
  log.info("weekrapport", plat);
}
