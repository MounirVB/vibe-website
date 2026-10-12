/* ============================================================
   KANSEN OPSLAAN — idempotent, en nooit over een mensbesluit heen
   ------------------------------------------------------------
   WAT DEZE LAAG MOET GARANDEREN

   1. DEZELFDE AANBESTEDING WORDT NOOIT TWEE RIJEN.
      De sleutel is `identiteit` ('kenmerk:599611'), met het partiële
      unieke index uit migratie 0020 eronder. Gemeten op de bron: 100
      publicaties leveren 72 unieke kenmerken, dus zonder die sleutel
      telt het platform ruim een derde te hoog.

   2. EEN TWEEDE RONDE OVERSCHRIJFT GEEN MENSBESLUIT.
      Zodra een mens een kans heeft beoordeeld — REVIEW, goedgekeurd, in
      behandeling, gewonnen, verloren, afgewezen — raakt de pijplijn de
      STATUS niet meer aan. Feiten worden wel bijgewerkt: een
      rectificatie die de sluitingsdatum verzet moet doorkomen, ook bij
      een kans die al in behandeling is. Dat is precies het geval dat
      kenmerk 599611 oplevert.

   3. DE PIJPLIJN ZET NOOIT `interesse_bewezen`.
      Net als in signalen.ts: een openbare aankondiging is geen bewijs
      dat een organisatie iets van Vibe Energy wil. De
      databaseconstraint `kansen_interesse_vraagt_kwalificatie` maakt dat
      onmogelijk in plaats van afgesproken; deze code noemt de kolom niet
      eens.

   WAAROM `on conflict` OP EEN PARTIEEL INDEX NIET WERKT

   `kansen_identiteit_uniek` is partieel (`where identiteit is not null`).
   PostgreSQL kan daar geen `on conflict (organisatie_id, identiteit)`
   inferentie op doen zonder dezelfde predicaat mee te geven, en die
   vorm is kwetsbaar voor een wijziging in het index. Daarom expliciet
   eerst lezen, dan inserten of updaten — binnen één transactie met de
   organisatiecontext, zodat RLS actief is.
   ============================================================ */

import { eenRij, metOrganisatie, rijen, type Client, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { FASE_LABEL, type Fase } from "./aanbesteding.ts";
import { STATUS_LABEL, type Kans, type Status } from "./kansen.ts";

const log = maakLogger("kansenopslag");

/**
 * Statussen die een mens heeft gezet. De pijplijn laat ze staan.
 *
 * NIEUW, ONDERZOEK_NODIG en GEARCHIVEERD mag de pijplijn wel bijstellen:
 * dat zijn standen die uit het bewijs volgen, niet uit een besluit. De
 * belangrijkste beweging die dat mogelijk maakt is GEARCHIVEERD terug
 * naar ONDERZOEK_NODIG — een aanbesteding die eerst gegund leek maar
 * later een nieuwe fase krijgt, moet weer in beeld komen.
 */
const MENSBESLUIT = new Set([
  "REVIEW",
  "GOEDGEKEURD_VOOR_OPVOLGING",
  "IN_BEHANDELING",
  "GEWONNEN",
  "VERLOREN",
  "AFGEWEZEN",
]);

export type OpslagUitslag = {
  readonly nieuw: number;
  readonly bijgewerkt: number;
  readonly statusBehouden: number;
  readonly publicatiesToegevoegd: number;
  readonly mislukt: number;
};

type KansRij = { id: string; status: string };

/**
 * Schrijft één kans weg en geeft terug wat er gebeurde.
 *
 * Draait binnen een bestaande client, zodat de aanroeper de transactie
 * en de organisatiecontext bezit.
 */
export async function schrijfKans(
  c: Client,
  organisatieId: number,
  kans: Kans,
): Promise<{ wat: "nieuw" | "bijgewerkt"; statusBehouden: boolean; publicaties: number }> {
  /* TWEE MANIEREN OM DEZELFDE KANS TERUG TE VINDEN, in deze volgorde.

     1. op `identiteit` — de normale weg.

     2. op een GEDEELDE PUBLICATIE-URL — de weg die een wijziging in het
        identiteitsschema overleeft.

     Waarom die tweede nodig is, is gemeten: zolang de TenderNed-config
     geen kenmerk bewaarde, was de identiteit 'titel:<opdrachtgever>::
     <titelkern>'. Na het toevoegen van `kenmerk` aan extraVelden werd
     het 'kenmerk:599611'. Dezelfde aanbesteding, een andere sleutel —
     en dus een TWEEDE rij, met de oude als wees. Lokaal gaf dat 11 rijen
     waar 6 aanbestedingen staan.

     Een publicatie-URL is onveranderlijk (migratie 0011 legt vast dat de
     URL de identiteit van een document is). Hoort een URL al bij een
     kans, dan is dat dezelfde kans, welke sleutel er ook boven staat. */
  let bestaand = kans.identiteit
    ? await eenRij<KansRij>(
        c,
        `select id::text, status
           from intel.kansen
          where organisatie_id = $1 and identiteit = $2`,
        [organisatieId, kans.identiteit],
      )
    : null;

  if (!bestaand && kans.publicaties.length > 0) {
    bestaand = await eenRij<KansRij>(
      c,
      `select k.id::text, k.status
         from intel.kansen k
         join intel.kans_publicaties p on p.kans_id = k.id
        where k.organisatie_id = $1
          and p.url = any($2::text[])
        -- Bij meerdere treffers de kans met de meeste publicaties: die
        -- is het verst gevuld en dus de beste om naar samen te voegen.
        order by (select count(*) from intel.kans_publicaties q where q.kans_id = k.id) desc,
                 k.id asc
        limit 1`,
      [organisatieId, kans.publicaties.map((p) => p.url)],
    );
    if (bestaand) {
      log.info("kans teruggevonden op publicatie-URL in plaats van identiteit", {
        kansId: bestaand.id,
        nieuweIdentiteit: kans.identiteit,
      });
    }
  }

  /* De status van een beoordeelde kans blijft staan. Een eindstand uit
     de bron mag die wel overrulen: als de aanbesteding gegund is, is
     'in behandeling' geen houdbare stand meer. Maar GEWONNEN en VERLOREN
     zijn onze eigen uitkomst op die gunning en blijven. */
  const magStatusZetten =
    !bestaand ||
    !MENSBESLUIT.has(bestaand.status) ||
    (kans.fase === "gegund" && !["GEWONNEN", "VERLOREN"].includes(bestaand.status));
  const statusBehouden = Boolean(bestaand) && !magStatusZetten;

  const velden = {
    opdrachtgever: kans.opdrachtgever,
    project: kans.project,
    locatie: kans.locatie,
    referentie: kans.referentie,
    procedure_soort: kans.procedureSoort,
    procedure_status: kans.procedureStatus,
    sluit_op: kans.sluitOp,
    opdracht_omvang: kans.opdrachtOmvang,
    eisen: kans.eisen,
    relevante_oplossingen: kans.relevanteOplossingen,
    score_relevantie: kans.scores.relevantie,
    score_vertrouwen: kans.scores.vertrouwen,
    score_urgentie: kans.scores.urgentie,
    score_handelbaar: kans.scores.handelbaar,
    score_grondslag: JSON.stringify(kans.scores.grondslag),
    ontbrekend: kans.ontbrekend,
    aanbevolen_actie: kans.aanbevolenActie,
    fase: kans.fase,
    fase_grondslag: kans.faseGrondslag,
    identiteit: kans.identiteit || null,
    identiteit_grondslag: kans.identiteitGrondslag || null,
  };

  let kansId: string;
  let wat: "nieuw" | "bijgewerkt";

  if (bestaand) {
    const kolommen = Object.keys(velden);
    const zet = kolommen.map((k, i) => `${k} = $${i + 3}`).join(", ");
    await c.query(
      `update intel.kansen
          set ${zet}${magStatusZetten ? `, status = $${kolommen.length + 3}` : ""}
        where organisatie_id = $1 and id = $2`,
      [
        organisatieId,
        bestaand.id,
        ...Object.values(velden),
        ...(magStatusZetten ? [kans.status] : []),
      ],
    );
    kansId = bestaand.id;
    wat = "bijgewerkt";
  } else {
    const kolommen = Object.keys(velden);
    const r = await eenRij<{ id: string }>(
      c,
      `insert into intel.kansen (organisatie_id, status, ${kolommen.join(", ")})
       values ($1, $2, ${kolommen.map((_, i) => `$${i + 3}`).join(", ")})
       returning id::text`,
      [organisatieId, kans.status, ...Object.values(velden)],
    );
    if (!r) throw new Error("insert van kans gaf geen id terug");
    kansId = r.id;
    wat = "nieuw";
  }

  /* De publicaties. Primaire sleutel is (kans_id, url), dus een tweede
     ronde over dezelfde aankondiging werkt bij in plaats van te
     verdubbelen. De relatie en zijn grondslag kunnen veranderen zodra
     een latere publicatie binnenkomt — daarom ook die bijwerken. */
  let publicaties = 0;
  for (const p of kans.publicaties) {
    await c.query(
      `insert into intel.kans_publicaties
         (kans_id, organisatie_id, gebeurtenis_id, brondocument_id, url, titel,
          gepubliceerd_op, uitgever, relatie, relatie_grondslag,
          publicatie_soort, sluitingsdatum_bron)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (kans_id, url) do update
          set gebeurtenis_id      = excluded.gebeurtenis_id,
              brondocument_id     = excluded.brondocument_id,
              titel               = excluded.titel,
              gepubliceerd_op     = excluded.gepubliceerd_op,
              relatie             = excluded.relatie,
              relatie_grondslag   = excluded.relatie_grondslag,
              publicatie_soort    = excluded.publicatie_soort,
              sluitingsdatum_bron = excluded.sluitingsdatum_bron`,
      [
        kansId,
        organisatieId,
        p.gebeurtenisId,
        p.brondocumentId,
        p.url,
        p.titel,
        p.gepubliceerdOp ? p.gepubliceerdOp.slice(0, 10) : null,
        p.uitgever,
        p.relatie,
        p.relatieGrondslag,
        soortVan(p.extra),
        datumVan(p.extra),
      ],
    );
    publicaties += 1;
  }

  return { wat, statusBehouden, publicaties };
}

function soortVan(extra: Record<string, unknown> | null | undefined): string | null {
  const v = extra?.["typePublicatie.code"];
  return v === null || v === undefined ? null : String(v).trim() || null;
}

function datumVan(extra: Record<string, unknown> | null | undefined): string | null {
  const v = extra?.["sluitingsDatum"];
  if (v === null || v === undefined) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v).trim());
  return m ? m[1]! : null;
}

/** Schrijft een reeks kansen weg, elk in zijn eigen transactie. */
export async function schrijfKansen(
  pool: Pool,
  organisatieId: number,
  kansen: readonly Kans[],
): Promise<OpslagUitslag> {
  let nieuw = 0;
  let bijgewerkt = 0;
  let statusBehouden = 0;
  let publicatiesToegevoegd = 0;
  let mislukt = 0;

  for (const kans of kansen) {
    try {
      const r = await metOrganisatie(pool, { organisatieId }, (c) =>
        schrijfKans(c, organisatieId, kans),
      );
      if (r.wat === "nieuw") nieuw += 1;
      else bijgewerkt += 1;
      if (r.statusBehouden) statusBehouden += 1;
      publicatiesToegevoegd += r.publicaties;
    } catch (e) {
      /* Eén kans die faalt mag de rest niet meesleuren; de fout wordt
         geteld en gelogd zodat hij niet stil verdwijnt. */
      log.fout("kans wegschrijven mislukt", {
        identiteit: kans.identiteit,
        opdrachtgever: kans.opdrachtgever,
        fout: e,
      });
      mislukt += 1;
    }
  }

  return { nieuw, bijgewerkt, statusBehouden, publicatiesToegevoegd, mislukt };
}

export type KansOverzicht = {
  id: string;
  opdrachtgever: string;
  project: string;
  fase: string | null;
  /** De Nederlandse weergavenaam; nooit de enum zelf op het scherm. */
  fase_label: string;
  status_label: string;
  status: string;
  sluit_op: string | null;
  score_relevantie: number;
  score_vertrouwen: number;
  score_urgentie: number;
  score_handelbaar: number;
  ontbrekend: string[];
  aanbevolen_actie: string | null;
  aantal_publicaties: number;
};

/**
 * De werkvoorraad: wat staat er open, en wat is het dringendst?
 *
 * EINDSTANDEN STAAN ER NIET IN. Een gegunde opdracht is geen werk, en
 * hem toch tonen is precies de fout die publicatie 441673 in productie
 * maakte. Ze zijn wel op te vragen via `leesKansen` met een andere
 * statusfilter — weggooien doen we niet.
 */
export async function leesWerkvoorraad(
  pool: Pool,
  organisatieId: number,
  max = 50,
  /** Peildatum voor 'verstreken'. Expliciet zodat toetsen niet aan de klok hangen. */
  vandaag: string = new Date().toISOString().slice(0, 10),
): Promise<KansOverzicht[]> {
  return metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<KansOverzicht>(
      c,
      `select k.id::text,
              k.opdrachtgever,
              k.project,
              k.fase,
              k.status,
              k.sluit_op::text,
              k.score_relevantie,
              k.score_vertrouwen,
              k.score_urgentie,
              k.score_handelbaar,
              k.ontbrekend,
              k.aanbevolen_actie,
              count(p.url)::int as aantal_publicaties
         from intel.kansen k
         left join intel.kans_publicaties p on p.kans_id = k.id
        where k.organisatie_id = $1
          and k.status not in ('GEWONNEN','VERLOREN','GEARCHIVEERD','AFGEWEZEN')
          -- EEN VERSTREKEN TERMIJN IS GEEN WERK. Gemeten geval: kenmerk
          -- 589425 stond op fase 'open' met sluitingsdatum 2026-07-14,
          -- drie maanden terug. Geen eindstand, dus de statusfilter
          -- hierboven laat hem door; toch valt er niets meer te doen.
          -- Een kans ZONDER datum blijft wel staan: daar is de termijn
          -- een onderzoeksvraag en geen gepasseerd station.
          and (k.sluit_op is null or k.sluit_op >= $3::date)
        group by k.id
        -- Urgentie eerst, dan relevantie: een termijn die verloopt is
        -- dringender dan een beter passende kans zonder termijn.
        order by k.score_urgentie desc, k.score_relevantie desc, k.id desc
        limit $2`,
      [organisatieId, max, vandaag],
    ),
  ).then((rs) =>
    rs.map((r) => ({
      ...r,
      /* De enum gaat NIET als label naar het scherm. 'gegund' is een
         sleutel, 'Gegund' is wat een mens leest; §27 eist dat
         onderscheid. Een onbekende waarde valt terug op een leesbare
         tekst in plaats van op de ruwe sleutel. */
      fase_label: r.fase ? (FASE_LABEL[r.fase as Fase] ?? "Fase onbekend") : "Fase onbekend",
      status_label: STATUS_LABEL[r.status as Status] ?? r.status,
    })),
  );
}
