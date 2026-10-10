/* ============================================================
   COMMERCIEEL — signalen uit publiek verifieerbare gebeurtenissen
   ------------------------------------------------------------
   Een signaal is GEEN lead. Dat onderscheid is hier geen woordkeus
   maar de hele opzet:

   * `geverifieerde_gebeurtenis` is wat de bron zelf meldt;
   * `energie_uitdaging` is onze gevolgtrekking en staat standaard op
     is_hypothese = true;
   * `interesse_bewezen` wordt door deze code NOOIT op true gezet. Dat
     kan alleen als er bewijs van daadwerkelijke interesse is, zoals
     een eigen aanvraag, en dat komt niet uit een aanbestedingsfeed.

   AVG: hier staan organisatie- en projectgegevens uit openbare
   publicaties. Persoonsgegevens horen er niet in, en de constraint
   signalen_geen_persoonsgegevens maakt dat onmogelijk in plaats van
   afgesproken. Er bestaat in dit platform geen verzendpad, dus
   autonome outreach is niet uitgeschakeld maar onbestaand.
   ============================================================ */

import type pg from "pg";
import { eenRij, metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { kort } from "../kern/tekst.ts";

const log = maakLogger("signalen");

/** Welke Vibe-oplossingen een signaalsoort raakt. Dit is interpretatie. */
const OPLOSSINGEN_PER_SOORT: Readonly<Record<string, readonly string[]>> = {
  aanbesteding: ["batterijopslag", "energiemanagement", "laadinfrastructuur", "zonnestroom"],
  vergunning: ["batterijopslag", "netaansluiting", "zonnestroom"],
  vastgoedontwikkeling: ["energielabel", "zonnestroom", "laadinfrastructuur"],
  infrastructuur: ["netaansluiting", "batterijopslag"],
};

/**
 * Herkent de organisatie in een aanbestedings- of vergunningstitel.
 * Bewust conservatief: vindt hij geen duidelijke naam, dan wordt het
 * subject de titel zelf en blijft verificatie_status onbevestigd.
 */
export function herkenSubject(
  titel: string,
  extraOpdrachtgever: string | null,
): { naam: string; soort: "organisatie" | "project" | "aanbesteding"; zeker: boolean } {
  if (extraOpdrachtgever && extraOpdrachtgever.trim().length > 2) {
    return { naam: extraOpdrachtgever.trim(), soort: "organisatie", zeker: true };
  }
  // 'Gemeente X', 'Provincie Y', 'Waterschap Z' staan vaak in de titel.
  const bestuur = /\b(Gemeente|Provincie|Waterschap|Veiligheidsregio|Ministerie)\s+([A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){0,3})/u.exec(
    titel,
  );
  if (bestuur?.[1] && bestuur[2]) {
    return { naam: `${bestuur[1]} ${bestuur[2]}`, soort: "organisatie", zeker: true };
  }
  return { naam: kort(titel, 200), soort: "aanbesteding", zeker: false };
}

/**
 * Prioriteit op vier assen. Geen van de assen is "hoe graag willen we
 * dit"; alle vier zijn eigenschappen van het bewijs.
 */
export function berekenPrioriteit(invoer: {
  materialiteit: number;
  isPrimaireBron: boolean;
  aantalBronnen: number;
  heeftGeoBewijs: boolean;
  versheidDagen: number | null;
}): { score: number; grondslag: Record<string, number> } {
  const versheid =
    invoer.versheidDagen === null
      ? 0
      : invoer.versheidDagen <= 7
        ? 30
        : invoer.versheidDagen <= 30
          ? 20
          : invoer.versheidDagen <= 90
            ? 8
            : 0;
  const grondslag = {
    materialiteit: Math.round(invoer.materialiteit / 4),
    primaire_bron: invoer.isPrimaireBron ? 20 : 0,
    corroboratie: Math.min(15, Math.max(0, invoer.aantalBronnen - 1) * 8),
    geografisch_bewijs: invoer.heeftGeoBewijs ? 10 : 0,
    versheid,
  };
  return {
    score: Math.max(0, Math.min(100, Object.values(grondslag).reduce((a, b) => a + b, 0))),
    grondslag,
  };
}

export type SignaalRapport = {
  readonly kandidatenBekeken: number;
  readonly signalenNieuw: number;
  readonly signalenBijgewerkt: number;
  readonly overgeslagen: number;
};

type KandidaatRij = {
  kandidaat_id: number;
  gebeurtenis_id: number;
  titel: string;
  gebeurtenis_soort: string;
  materialiteit: number;
  aantal_bronnen: number;
  gebeurd_op: Date | null;
  cluster_sleutel: string | null;
  is_primaire_bron: boolean;
  opdrachtgever: string | null;
  geo_bereik_id: number | null;
  geo_bewijs: number;
};

export async function maakSignalen(
  pool: Pool,
  organisatieId: number,
  opties: { max?: number } = {},
): Promise<SignaalRapport> {
  const max = opties.max ?? 200;

  const kandidaten = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<KandidaatRij>(
      c,
      `select k.id                  as kandidaat_id,
              k.gebeurtenis_id,
              g.titel,
              g.gebeurtenis_soort,
              g.materialiteit,
              g.aantal_bronnen,
              g.gebeurd_op,
              oc.sleutel            as cluster_sleutel,
              coalesce(bool_or(b.is_primaire_bron), false) as is_primaire_bron,
              -- De opdrachtgever zoals de bron hem zelf geeft; TenderNed
              -- levert dit veld, de SRU-bron 'creator'. Geen gok.
              max(coalesce(d.extra->>'opdrachtgeverNaam',
                           d.extra->>'organisatie',
                           d.extra->>'creator'))        as opdrachtgever,
              min(gg.geo_bereik_id) as geo_bereik_id,
              count(gg.*) filter (where gg.grondslag in ('bron_expliciet','code_match'))::int
                                    as geo_bewijs
         from intel.inhoud_kandidaten k
         join intel.markt_gebeurtenissen g on g.id = k.gebeurtenis_id
         left join intel.onderwerp_clusters oc on oc.id = k.onderwerp_cluster_id
         left join intel.gebeurtenis_documenten gd on gd.gebeurtenis_id = g.id
         left join intel.brondocumenten d on d.id = gd.brondocument_id
         left join intel.bronnen b on b.id = d.bron_id
         left join intel.gebeurtenis_geo gg on gg.gebeurtenis_id = g.id
        where k.organisatie_id = $1
          and k.besluit = 'SALES_SIGNAL'
          and k.status <> 'afgehandeld'
        group by k.id, k.gebeurtenis_id, g.titel, g.gebeurtenis_soort, g.materialiteit,
                 g.aantal_bronnen, g.gebeurd_op, oc.sleutel
        order by g.materialiteit desc
        limit $2`,
      [organisatieId, max],
    ),
  );

  let nieuw = 0;
  let bijgewerkt = 0;
  let overgeslagen = 0;

  for (const k of kandidaten) {
    try {
      const r = await metOrganisatie(pool, { organisatieId }, (c) =>
        schrijfSignaal(c, organisatieId, k),
      );
      if (r === "nieuw") nieuw += 1;
      else if (r === "bijgewerkt") bijgewerkt += 1;
      else overgeslagen += 1;
    } catch (e) {
      log.fout("signaal mislukt", { kandidaat: k.kandidaat_id, fout: e });
      overgeslagen += 1;
    }
  }

  return {
    kandidatenBekeken: kandidaten.length,
    signalenNieuw: nieuw,
    signalenBijgewerkt: bijgewerkt,
    overgeslagen,
  };
}

async function schrijfSignaal(
  c: pg.PoolClient,
  organisatieId: number,
  k: KandidaatRij,
): Promise<"nieuw" | "bijgewerkt" | "overgeslagen"> {
  const subject = herkenSubject(k.titel, k.opdrachtgever);
  const versheidDagen =
    k.gebeurd_op === null
      ? null
      : Math.max(0, Math.round((Date.now() - k.gebeurd_op.getTime()) / 86_400_000));

  const prioriteit = berekenPrioriteit({
    materialiteit: k.materialiteit,
    isPrimaireBron: k.is_primaire_bron,
    aantalBronnen: k.aantal_bronnen,
    heeftGeoBewijs: k.geo_bewijs > 0,
    versheidDagen,
  });

  const oplossingen = OPLOSSINGEN_PER_SOORT[k.gebeurtenis_soort] ?? [];

  // Een signaal is alleen 'geverifieerd' als een primaire bron het
  // meldt. Een vakmedium dat over een aanbesteding schrijft is dat niet.
  const verificatie = k.is_primaire_bron ? "geverifieerd" : "onbevestigd";

  const bestaand = await eenRij<{ id: number }>(
    c,
    `select id from intel.commerciele_signalen
      where organisatie_id = $1 and gebeurtenis_id = $2`,
    [organisatieId, k.gebeurtenis_id],
  );

  const velden = [
    organisatieId,
    k.gebeurtenis_id,
    k.geo_bereik_id,
    subject.naam,
    subject.soort,
    // Het feit: precies wat de bron meldt, zonder gevolgtrekking.
    kort(`Publicatie met de titel: ${k.titel}`, 1000),
    k.gebeurd_op === null ? null : k.gebeurd_op.toISOString().slice(0, 10),
    verificatie,
    // De gevolgtrekking, expliciet als hypothese.
    oplossingen.length > 0
      ? `Mogelijk relevant voor ${oplossingen.join(", ")}. Dit is een hypothese op basis van de ` +
        `soort publicatie (${k.gebeurtenis_soort}), niet een vastgestelde behoefte.`
      : null,
    oplossingen,
    prioriteit.score,
    // Geen outreach-actie. De aanbevolen actie is altijd een interne stap.
    "Lees de publicatie en beoordeel of er een aanleiding is om contact te zoeken. " +
      "Dit platform verstuurt niets.",
  ];

  if (bestaand) {
    await c.query(
      `update intel.commerciele_signalen
          set geo_bereik_id          = coalesce($3, geo_bereik_id),
              subject_naam           = $4,
              subject_soort          = $5,
              geverifieerde_gebeurtenis = $6,
              gebeurtenis_datum      = $7,
              verificatie_status     = $8,
              energie_uitdaging      = $9,
              relevante_oplossingen  = $10,
              commerciele_prioriteit = $11,
              aanbevolen_actie       = $12
        where id = $1`,
      [bestaand.id, ...velden.slice(1)],
    );
    return "bijgewerkt";
  }

  const signaal = await eenRij<{ id: number }>(
    c,
    `insert into intel.commerciele_signalen
       (organisatie_id, gebeurtenis_id, geo_bereik_id, subject_naam, subject_soort,
        geverifieerde_gebeurtenis, gebeurtenis_datum, verificatie_status,
        energie_uitdaging, relevante_oplossingen, commerciele_prioriteit, aanbevolen_actie,
        is_hypothese, interesse_bewezen, bevat_persoonsgegevens, avg_grondslag, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
             true, false, false, 'openbare_bron', 'nieuw')
     returning id`,
    velden,
  );
  if (!signaal) return "overgeslagen";

  // Herkomst: elke bronversie achter deze gebeurtenis.
  await c.query(
    `insert into intel.signaal_bronnen (organisatie_id, signaal_id, versie_id, rol)
     select $1, $2, gd.versie_id, case when gd.rol = 'primair' then 'primair' else 'bevestigend' end
       from intel.gebeurtenis_documenten gd
      where gd.gebeurtenis_id = $3
     on conflict (signaal_id, versie_id) do nothing`,
    [organisatieId, signaal.id, k.gebeurtenis_id],
  );

  await c.query("update intel.inhoud_kandidaten set status = 'afgehandeld' where id = $1", [
    k.kandidaat_id,
  ]);

  return "nieuw";
}
