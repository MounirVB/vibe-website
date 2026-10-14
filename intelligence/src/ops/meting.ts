/* ============================================================
   OPS — de productiestand MÉTEN in plaats van afleiden
   ------------------------------------------------------------
   WAAROM DIT BESTAAT.

   De productiedatabase is privé-only (postgres.railway.internal) en
   `railway connect` eist een SSH-sleutel. Daardoor waren er na Release
   3.0.3 drie vragen die niemand kon beantwoorden zonder te gokken:

     · hoeveel VOLLEDIGE feitelijke paginarevisies staan er echt klaar?
     · hoeveel historische rijen schenden de tijdgrens van 0027?
     · staat er ergens een credential in intel.taken.laatste_fout?

   Een NOTICE uit een DO-blok haalt het log niet, want node-postgres
   slikt notices zonder listener. Daarom meet de APPLICATIE, en gaat het
   antwoord via de structuurlogger naar stdout — waar het Railway-log
   het oppikt.

   STRIKT ALLEEN-LEZEN. Elke query hier is een SELECT. Dit bestand mag
   nooit iets schrijven: het is bedoeld om in productie te draaien.

   LET OP RLS: intel.inhoud_voorstellen en intel.uitspraken staan onder
   row-level security op organisatie_id. Zonder organisatiecontext telt
   een query fail-closed naar nul. Alle tellingen hieronder zijn dus
   expliciet binnen één organisatie.
   ============================================================ */

import type pg from "pg";

import { rijen, type Leesclient } from "../kern/db.ts";
import { meetBrondekking, type Brondekking } from "./brondekking.ts";

/** De vier wijzigingssoorten uit 0023, gegroepeerd naar wat ze betekenen. */
export const FEITELIJKE_SOORTEN = ["alinea_toevoegen", "sectie_toevoegen"] as const;
export const LINKSOORT = "interne_link";

export type Telling = { readonly sleutel: string; readonly aantal: number };

export type ProductieMeting = {
  readonly organisatieId: number;
  readonly kandidaten: number;
  readonly voorstellen: number;
  readonly perPublicatieStatus: readonly Telling[];
  readonly perEindoordeel: readonly Telling[];
  readonly perWijzigingSoort: readonly Telling[];
  /** Alle dragende velden gevuld EN een feitelijke wijzigingssoort. */
  readonly volledigeFeitelijkeRevisies: number;
  readonly gereedFeitelijk: number;
  readonly gereedAlleenLink: number;
  readonly gereedOnvolledig: number;
  /** READY_FOR_REVIEW terwijl een opgeslagen controle op FAIL staat. */
  readonly poortMismatch: number;
  readonly goedgekeurd: number;
  readonly gepubliceerd: number;
  readonly afgewezen: number;
  readonly inPublicatieketen: number;
  readonly mislukteprechecks: number;
  readonly geblokkeerdDoorPoort: number;
  readonly uitspraken: {
    readonly totaal: number;
    readonly horizonNull: number;
    readonly tijdgrensSchendingen: number;
    readonly constraintGevalideerd: boolean | null;
    /**
     * De schendende rijen, identificeerbaar zonder databasetoegang.
     *
     * De productiedatabase is privé-only, dus een telling alleen is niet
     * genoeg: par. 27 vraagt om DE RIJ te onderzoeken. Daarom noemt de
     * meting id, fenomeen en de eerste 120 tekens van de brontekst, zodat
     * een mens in het Railway-log kan zien WELKE uitspraak het is en kan
     * besluiten of er gezaghebbend bewijs is voor een correctie.
     *
     * Er wordt geen horizon verzonnen en geen rij aangeraakt: dit is een
     * meting, en de correctie loopt via de append-only weg van 0025.
     */
    readonly schendingen: readonly {
      readonly id: string;
      readonly fenomeen: string | null;
      readonly tekst: string;
    }[];
  };
  readonly credentiallek: {
    readonly takenMetCredential: number;
    readonly soorten: readonly string[];
  };
  readonly migraties: { readonly toegepast: number; readonly hoogste: string | null };
  /** De bronklassen uit par. 18; zie ops/brondekking.ts. */
  readonly brondekking: Brondekking;
  /** Per voorstel precies één primaire blokkeerreden; zie hieronder. */
  readonly blokkeerredenen: readonly Telling[];
  /**
   * De VERWOORDBAARHEIDSTRAP — de werkelijke flessenhals.
   *
   * Gemeten op 13 oktober 2026: van 57 uitspraken in productie was er
   * TWEE verwoordbaar. 26 stonden op CONTEXT_ONVOLLEDIG, 19 hadden geen
   * oordeel (geen numerieke uitdrukking, dus de semantische laag slaat
   * ze over), 8 op VERIFICATIE_NODIG en 2 op VEROUDERD.
   *
   * Daarmee is het plafond op volledige feitelijke revisies 2, en één
   * daarvan viel af op bedrijfsrelevantie. Dat verklaart waarom er
   * precies één revisie klaarstaat — en het is GEEN matchingprobleem.
   * Zonder deze uitsplitsing zou een lezer de oorzaak bij de
   * paginamatching zoeken, en daar is hij niet.
   */
  readonly verwoordbaarheid: readonly Telling[];
  /**
   * Hoeveel uitspraken per TOEPASSINGSGEBIED (3.0.7).
   *
   * Dit is de directe maat voor de jurisdictiecontrole: zonder deze
   * telling is van productie niet te zien of de controle iets doet, en
   * hoeveel feiten erdoor buiten de stroom vallen.
   */
  readonly toepassingsgebied: readonly Telling[];
  /** Voorstellen met minstens één verwoordbare uitspraak. */
  readonly voorstellenMetVerwoordbaarFeit: number;
  /** Paginavoorstellen, geteld als DISTINCTE slug; zie par. 19. */
  readonly nieuwePaginaKandidaten: number;
};

async function telling(
  c: Leesclient,
  sql: string,
  params: readonly unknown[],
): Promise<readonly Telling[]> {
  const r = await rijen<{ sleutel: string | null; aantal: string }>(c, sql, [...params]);
  return r.map((x) => ({ sleutel: x.sleutel ?? "(leeg)", aantal: Number(x.aantal) }));
}

async function getal(c: Leesclient, sql: string, params: readonly unknown[]): Promise<number> {
  const r = await rijen<{ n: string }>(c, sql, [...params]);
  return Number(r[0]?.n ?? 0);
}

/**
 * Meet de redactionele en databasestand binnen één organisatie.
 *
 * Moet binnen `metOrganisatie(...)` worden aangeroepen, anders geeft RLS
 * overal nul terug en lijkt de meting geslaagd terwijl ze niets zag.
 */
export async function meetProductie(
  c: Leesclient,
  organisatieId: number,
): Promise<ProductieMeting> {
  /* De definitie van 'volledig' staat hier één keer en wordt hieronder
     hergebruikt, zodat de tellingen onderling niet uit elkaar lopen. */
  const VOLLEDIG = `
    doel_pad is not null and doel_pad <> ''
    and doel_sectie is not null and doel_sectie <> ''
    and huidige_tekst is not null and huidige_tekst <> ''
    and nieuwe_tekst is not null and nieuwe_tekst <> ''
    and inhouds_hash is not null and inhouds_hash <> ''`;
  const FEITELIJK = `wijziging_soort = any($2::text[])`;

  const feitelijk = [...FEITELIJKE_SOORTEN];

  const kandidaten = await getal(
    c,
    "select count(*)::text as n from intel.inhoud_kandidaten where organisatie_id = $1",
    [organisatieId],
  );
  const voorstellen = await getal(
    c,
    "select count(*)::text as n from intel.inhoud_voorstellen where organisatie_id = $1",
    [organisatieId],
  );

  const perPublicatieStatus = await telling(
    c,
    `select publicatie_status as sleutel, count(*)::text as aantal
       from intel.inhoud_voorstellen where organisatie_id = $1
      group by 1 order by 2 desc, 1`,
    [organisatieId],
  );
  const perEindoordeel = await telling(
    c,
    `select eindoordeel as sleutel, count(*)::text as aantal
       from intel.inhoud_voorstellen where organisatie_id = $1
      group by 1 order by 2 desc, 1`,
    [organisatieId],
  );
  const perWijzigingSoort = await telling(
    c,
    `select wijziging_soort as sleutel, count(*)::text as aantal
       from intel.inhoud_voorstellen where organisatie_id = $1
      group by 1 order by 2 desc, 1`,
    [organisatieId],
  );

  const volledigeFeitelijkeRevisies = await getal(
    c,
    `select count(*)::text as n from intel.inhoud_voorstellen
      where organisatie_id = $1 and ${FEITELIJK} and ${VOLLEDIG}`,
    [organisatieId, feitelijk],
  );

  /* READY_FOR_REVIEW uiteengerafeld. Dit is de kern van par. 12: een
     linkvoorstel en een onvolledige revisie zijn GEEN volledige
     feitelijke paginarevisie, ook al staan ze in dezelfde staat. */
  const gereedFeitelijk = await getal(
    c,
    `select count(*)::text as n from intel.inhoud_voorstellen
      where organisatie_id = $1 and publicatie_status = 'READY_FOR_REVIEW'
        and ${FEITELIJK} and ${VOLLEDIG}`,
    [organisatieId, feitelijk],
  );
  /* Sinds migratie 0032 wacht een linkvoorstel in zijn EIGEN staat. We
     tellen beide vormen, zodat een halfgemigreerde database opvalt in
     plaats van stil nul te melden. */
  const gereedAlleenLink = await getal(
    c,
    `select count(*)::text as n from intel.inhoud_voorstellen
      where organisatie_id = $1
        and (publicatie_status = 'READY_FOR_LINK_REVIEW'
             or (publicatie_status = 'READY_FOR_REVIEW' and wijziging_soort = $2))`,
    [organisatieId, LINKSOORT],
  );
  const gereedOnvolledig = await getal(
    c,
    `select count(*)::text as n from intel.inhoud_voorstellen
      where organisatie_id = $1 and publicatie_status = 'READY_FOR_REVIEW'
        and ${FEITELIJK} and not (${VOLLEDIG})`,
    [organisatieId, feitelijk],
  );

  /* DE DETECTOR. Als dit ooit boven nul komt, is er iets langs de poort
     geglipt: READY_FOR_REVIEW belooft vijf PASS, dus een opgeslagen
     controle op FAIL in diezelfde rij is een tegenspraak. Dit is de
     meting die het defect van 3.0.3 zou hebben gevonden. */
  const poortMismatch = await getal(
    c,
    `select count(distinct v.id)::text as n
       from intel.inhoud_voorstellen v
       join intel.inhoud_voorstel_controles ct
         on ct.voorstel_id = v.id and ct.organisatie_id = v.organisatie_id
      where v.organisatie_id = $1
        and v.publicatie_status = 'READY_FOR_REVIEW'
        and ct.oordeel = 'FAIL'`,
    [organisatieId],
  );

  const inStatus = (statussen: readonly string[]) =>
    getal(
      c,
      `select count(*)::text as n from intel.inhoud_voorstellen
        where organisatie_id = $1 and publicatie_status = any($2::text[])`,
      [organisatieId, [...statussen]],
    );

  const goedgekeurd = await inStatus(["APPROVED"]);
  const gepubliceerd = await inStatus(["LIVE_VERIFIED"]);
  const afgewezen = await inStatus(["REJECTED"]);
  const inPublicatieketen = await inStatus(["PUBLICATION_PRECHECK", "DEPLOYMENT"]);

  const mislukteprechecks = await getal(
    c,
    `select count(*)::text as n from intel.inhoud_voorstellen
      where organisatie_id = $1 and precheck_uitslag is not null and precheck_uitslag <> 'PASS'`,
    [organisatieId],
  );

  /* Geblokkeerd door een poort: minstens één opgeslagen controle op FAIL.
     Dit is de MEETBARE waarheid, los van wat het eindoordeel beweert. */
  const geblokkeerdDoorPoort = await getal(
    c,
    `select count(distinct v.id)::text as n
       from intel.inhoud_voorstellen v
       join intel.inhoud_voorstel_controles ct
         on ct.voorstel_id = v.id and ct.organisatie_id = v.organisatie_id
      where v.organisatie_id = $1 and ct.oordeel = 'FAIL'`,
    [organisatieId],
  );

  /* ---------------------------------------------------- migratie 0027 */
  const uitspraakTotaal = await getal(
    c,
    "select count(*)::text as n from intel.uitspraken where organisatie_id = $1",
    [organisatieId],
  );
  const horizonNull = await getal(
    c,
    "select count(*)::text as n from intel.uitspraken where organisatie_id = $1 and horizon is null",
    [organisatieId],
  );
  /* Exact de negatie van de constraint uit 0027_tijdgrens.sql. */
  const tijdgrensSchendingen = await getal(
    c,
    `select count(*)::text as n from intel.uitspraken
      where organisatie_id = $1
        and verwoordbaar = 'VERWOORDBAAR'
        and fenomeen in ('netinvestering','subsidiebudget','subsidiebedrag','opdrachtwaarde')
        and periode is null
        and horizon is null`,
    [organisatieId],
  );
  /* WELKE rijen, niet alleen hoeveel. Zie de toelichting bij het veld. */
  const schendingen = await rijen<{ id: string; fenomeen: string | null; tekst: string }>(
    c,
    `select id::text, fenomeen, left(tekst, 120) as tekst
       from intel.uitspraken
      where organisatie_id = $1
        and verwoordbaar = 'VERWOORDBAAR'
        and fenomeen in ('netinvestering','subsidiebudget','subsidiebedrag','opdrachtwaarde')
        and periode is null
        and horizon is null
      order by id
      limit 25`,
    [organisatieId],
  );

  const constraintRij = await rijen<{ convalidated: boolean }>(
    c,
    `select convalidated from pg_constraint
      where conname = 'uitspraken_tijdgebonden_vraagt_tijd'
        and conrelid = 'intel.uitspraken'::regclass`,
    [],
  );
  const constraintGevalideerd = constraintRij[0]?.convalidated ?? null;

  /* ------------------------------------------------- credentialsporen
     We tellen, we lezen de tekst NIET terug. Een meting die het geheim
     zelf naar buiten brengt is de fout die ze moet aantonen. */
  const takenMetCredential = await getal(
    c,
    `select count(*)::text as n from intel.taken
      where organisatie_id = $1
        and laatste_fout is not null
        and laatste_fout ~ '://[^/@[:space:]]+:[^@[:space:]]+@'`,
    [organisatieId],
  );
  const soortRijen = await rijen<{ soort: string }>(
    c,
    `select distinct soort from intel.taken
      where organisatie_id = $1
        and laatste_fout is not null
        and laatste_fout ~ '://[^/@[:space:]]+:[^@[:space:]]+@'
      order by 1`,
    [organisatieId],
  );

  const migratieTotaal = await getal(c, "select count(*)::text as n from intel.migraties", []);
  const hoogsteRij = await rijen<{ naam: string }>(
    c,
    "select naam from intel.migraties order by naam desc limit 1",
    [],
  );

  /* ------------------------------------------------- blokkeerredenen
     PRECIES ÉÉN PRIMAIRE REDEN PER VOORSTEL, in de orde van weegAf.

     Dat de orde meedoet is geen detail: gemeten op de ontwikkeldatabase
     had 1 voorstel één gefaalde controle, 12 voorstellen twee, en 4
     voorstellen drie. Wie simpelweg per gefaalde controle telt, telt
     dezelfde kandidaat drie keer en krijgt een beeld dat niets zegt over
     wat hem tegenhoudt. De besluitmotor hanteert een vaste prioriteit
     (voorstel.ts, weegAf) en die wordt hier letterlijk gespiegeld.

     Een voorstel dat KLAAR staat — feitelijk of als linkvoorstel — is
     NIET geblokkeerd, ook al heeft het een gefaalde verwoordbaarheid.
     Dat is precies het onderscheid dat 0032 heeft ingevoerd. */
  const blokkeerredenen = await telling(
    c,
    `select reden as sleutel, count(*)::text as aantal from (
       select case
                when v.eindoordeel in ('KLAAR_VOOR_REVIEW', 'KLAAR_VOOR_LINKREVIEW')
                  then 'NIET_GEBLOKKEERD'
                when f.bronverwijzing then 'BRONBEWIJS_ONTBREEKT'
                when f.actualiteit    then 'VEROUDERD'
                when f.seo            then 'DOELPAGINA_DEKT_ONDERWERP_NIET'
                when f.duplicatie     then 'DUPLICAAT'
                when f.verwoordbaarheid then 'FEIT_NIET_VERWOORDBAAR'
                when f.voorbehouden >= 2 then 'TE_VEEL_VOORBEHOUD'
                else 'RELEVANTIE_TE_LAAG'
              end as reden
         from intel.inhoud_voorstellen v
         cross join lateral (
           select
             coalesce(bool_or(ct.naam = 'bronverwijzing'   and ct.oordeel = 'FAIL'), false) as bronverwijzing,
             coalesce(bool_or(ct.naam = 'actualiteit'      and ct.oordeel = 'FAIL'), false) as actualiteit,
             coalesce(bool_or(ct.naam = 'seo'              and ct.oordeel = 'FAIL'), false) as seo,
             coalesce(bool_or(ct.naam = 'duplicatie'       and ct.oordeel = 'FAIL'), false) as duplicatie,
             coalesce(bool_or(ct.naam = 'verwoordbaarheid' and ct.oordeel = 'FAIL'), false) as verwoordbaarheid,
             count(*) filter (where ct.oordeel = 'VOORBEHOUD') as voorbehouden
           from intel.inhoud_voorstel_controles ct
           where ct.voorstel_id = v.id and ct.organisatie_id = v.organisatie_id
         ) f
        where v.organisatie_id = $1
     ) x group by 1 order by 2 desc, 1`,
    [organisatieId],
  );

  /* ------------------------------------------- verwoordbaarheidstrap
     De meting die de echte flessenhals blootlegt; zie het veld. */
  const verwoordbaarheid = await telling(
    c,
    `select coalesce(verwoordbaar, '(geen oordeel)') as sleutel, count(*)::text as aantal
       from intel.uitspraken where organisatie_id = $1
      group by 1 order by 2 desc, 1`,
    [organisatieId],
  );
  const toepassingsgebied = await telling(
    c,
    `select coalesce(toepassingsgebied, '(niet vastgesteld)') as sleutel, count(*)::text as aantal
       from intel.uitspraken where organisatie_id = $1
      group by 1 order by 2 desc, 1`,
    [organisatieId],
  );
  const voorstellenMetVerwoordbaarFeit = await getal(
    c,
    `select count(*)::text as n from intel.inhoud_voorstellen v
      where v.organisatie_id = $1
        and exists (select 1 from intel.uitspraken u
                     where u.gebeurtenis_id = v.gebeurtenis_id
                       and u.verwoordbaar = 'VERWOORDBAAR')`,
    [organisatieId],
  );
  /* DISTINCTE slug, niet rijen: negen ontdekkingen over nettarieven zijn
     EEN redactioneel besluit. Par. 19 verbiedt het opblazen van dit
     getal door bijna-identieke voorstellen te tellen. */
  const nieuwePaginaKandidaten = await getal(
    c,
    `select count(distinct nieuwe_pagina->>'slug')::text as n
       from intel.inhoud_voorstellen
      where organisatie_id = $1 and nieuwe_pagina is not null`,
    [organisatieId],
  );

  /* De bronclassificatie hoort in de dagelijkse logregel, want 'overgeslagen
     19' is op zichzelf onleesbaar. Zie ops/brondekking.ts. */
  const brondekking = await meetBrondekking(c, organisatieId);

  return {
    organisatieId,
    kandidaten,
    voorstellen,
    perPublicatieStatus,
    perEindoordeel,
    perWijzigingSoort,
    volledigeFeitelijkeRevisies,
    gereedFeitelijk,
    gereedAlleenLink,
    gereedOnvolledig,
    poortMismatch,
    goedgekeurd,
    gepubliceerd,
    afgewezen,
    inPublicatieketen,
    mislukteprechecks,
    geblokkeerdDoorPoort,
    uitspraken: {
      totaal: uitspraakTotaal,
      horizonNull,
      tijdgrensSchendingen,
      constraintGevalideerd,
      schendingen,
    },
    credentiallek: {
      takenMetCredential,
      soorten: soortRijen.map((x) => x.soort),
    },
    migraties: { toegepast: migratieTotaal, hoogste: hoogsteRij[0]?.naam ?? null },
    brondekking,
    blokkeerredenen,
    verwoordbaarheid,
    toepassingsgebied,
    voorstellenMetVerwoordbaarFeit,
    nieuwePaginaKandidaten,
  };
}
