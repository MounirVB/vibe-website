/* ============================================================
   DISTRIBUTIE — kanaalconcepten
   ------------------------------------------------------------
   Afgeleiden van goedgekeurde inhoud, per kanaal. Drie regels:

   1. BETEKENIS BLIJFT GELIJK. Elk concept erft dezelfde
      uitspraak-id's als de inhoudsversie waar het uit komt. Daarmee is
      een LinkedIn-tekst terug te voeren op precies hetzelfde bewijs als
      de pagina, en kan een getal niet onderweg veranderen.
   2. BRONVERMELDING GAAT MEE. Ook in een kanaalbericht.
   3. ER IS GEEN VERZENDPAD. Dit platform plaatst niets en verstuurt
      niets. 'Vrijgegeven' betekent: een mens mag dit kopieren en zelf
      plaatsen. Voor LinkedIn en nieuwsbrief eist de database
      bovendien machtiging_bewijs voordat die status gezet kan worden.
   ============================================================ */

import type pg from "pg";
import { eenRij, metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { kort } from "../kern/tekst.ts";

const log = maakLogger("distributie");

export type Kanaal =
  | "website_nieuws"
  | "linkedin"
  | "nieuwsbrief"
  | "sales_briefing"
  | "team_update"
  | "campagne_concept";

/** Externe kanalen vereisen een vastgelegde machtiging om vrij te geven. */
export const EXTERNE_KANALEN: ReadonlySet<Kanaal> = new Set(["linkedin", "nieuwsbrief"]);

type VersieRij = {
  id: number;
  titel: string;
  direct_antwoord: string | null;
  canonieke_url: string;
  pad: string;
  cta_sleutel: string | null;
  bronnen_sectie: { uitgever: string; url: string; datum: string | null }[];
  gebeurtenis_id: number | null;
};

type KernWaarde = { waarde: string; eenheid: string | null; uitgever: string };

function bulletsVanWaarden(waarden: readonly KernWaarde[], maxAantal: number): string[] {
  return waarden
    .slice(0, maxAantal)
    .map(
      (w) =>
        `• ${Number(w.waarde).toLocaleString("nl-NL", { maximumFractionDigits: 3 })} ` +
        `${w.eenheid ?? ""}`.trimEnd() +
        ` (${w.uitgever})`,
    );
}

/**
 * Bouwt de tekst per kanaal. Geen enkel kanaal krijgt een getal dat niet
 * uit de meegegeven kernwaarden komt.
 */
export function bouwKanaaltekst(
  kanaal: Kanaal,
  v: VersieRij,
  waarden: readonly KernWaarde[],
): { titel: string; body: string } {
  const bron = v.bronnen_sectie[0];
  const bronregel = bron ? `Bron: ${bron.uitgever}${bron.datum ? ` (${bron.datum})` : ""} — ${bron.url}` : "";
  const kern = v.direct_antwoord ?? v.titel;

  switch (kanaal) {
    case "linkedin":
      return {
        titel: kort(v.titel.replace(" | Vibe Energy", ""), 120),
        body: [
          kort(kern, 420),
          "",
          ...bulletsVanWaarden(waarden, 3),
          "",
          "Wat dit voor uw situatie betekent, hangt af van uw aansluiting en uw profiel.",
          "",
          bronregel,
          `Meer: ${v.canonieke_url}`,
        ]
          .filter((r) => r !== undefined)
          .join("\n"),
      };

    case "nieuwsbrief":
      return {
        titel: kort(v.titel.replace(" | Vibe Energy", ""), 120),
        body: [
          kort(kern, 600),
          "",
          waarden.length > 0 ? "Vastgelegde waarden:" : "",
          ...bulletsVanWaarden(waarden, 5),
          "",
          bronregel,
          `Lees het hele stuk: ${v.canonieke_url}`,
        ]
          .filter(Boolean)
          .join("\n"),
      };

    case "sales_briefing":
      return {
        titel: `Briefing: ${kort(v.titel.replace(" | Vibe Energy", ""), 100)}`,
        body: [
          "WAT ER IS VASTGELEGD",
          ...bulletsVanWaarden(waarden, 8),
          waarden.length === 0 ? "• geen harde waarden; dit is voorlopig een signaal" : "",
          "",
          "WAT JE ER IN EEN GESPREK MEE KUNT",
          kort(kern, 500),
          "",
          "WAT JE NIET MOET ZEGGEN",
          "• Geen garanties over capaciteit, subsidie of rendement.",
          "• Geen cijfers die hierboven niet staan.",
          "",
          bronregel,
        ]
          .filter(Boolean)
          .join("\n"),
      };

    case "team_update":
      return {
        titel: `Intern: ${kort(v.titel.replace(" | Vibe Energy", ""), 100)}`,
        body: [kort(kern, 400), "", ...bulletsVanWaarden(waarden, 5), "", bronregel].join("\n"),
      };

    case "campagne_concept":
      return {
        titel: `Campagneconcept: ${kort(v.titel.replace(" | Vibe Energy", ""), 90)}`,
        body: [
          "AANLEIDING",
          kort(kern, 400),
          "",
          "ONDERBOUWING",
          ...bulletsVanWaarden(waarden, 5),
          "",
          "VOORGESTELDE VERVOLGSTAP",
          v.cta_sleutel ?? "Plan een gesprek",
          "",
          bronregel,
        ]
          .filter(Boolean)
          .join("\n"),
      };

    case "website_nieuws":
      return { titel: v.titel, body: kort(kern, 600) };
  }
}

export type DistributieRapport = {
  readonly versiesBekeken: number;
  readonly conceptenNieuw: number;
  readonly conceptenBestaand: number;
  readonly perKanaal: Readonly<Record<string, number>>;
};

const STANDAARD_KANALEN: readonly Kanaal[] = [
  "linkedin",
  "nieuwsbrief",
  "sales_briefing",
  "team_update",
];

export async function maakDistributieConcepten(
  pool: Pool,
  organisatieId: number,
  opties: { kanalen?: readonly Kanaal[]; max?: number } = {},
): Promise<DistributieRapport> {
  const kanalen = opties.kanalen ?? STANDAARD_KANALEN;
  const max = opties.max ?? 20;

  const versies = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<VersieRij>(
      c,
      `select v.id, v.titel, v.direct_antwoord, v.canonieke_url, v.pad, v.cta_sleutel,
              v.bronnen_sectie, k.gebeurtenis_id
         from intel.inhoud_versies v
         left join intel.inhoud_kandidaten k on k.id = v.kandidaat_id
        where v.organisatie_id = $1
          and v.poorten_geslaagd
          and v.status in ('ter_review', 'goedgekeurd', 'gepubliceerd')
        order by v.id desc
        limit $2`,
      [organisatieId, max],
    ),
  );

  let nieuw = 0;
  let bestaand = 0;
  const perKanaal: Record<string, number> = {};

  for (const v of versies) {
    const resultaat = await metOrganisatie(pool, { organisatieId }, async (c) => {
      const waarden = await rijen<KernWaarde>(
        c,
        `select u.waarde_numeriek::text as waarde, u.eenheid,
                coalesce(min(b.uitgever), 'onbekende bron') as uitgever
           from intel.inhoud_uitspraken iu
           join intel.uitspraken u on u.id = iu.uitspraak_id
           left join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
           left join intel.brondocument_versies bv on bv.id = ub.versie_id
           left join intel.brondocumenten d on d.id = bv.brondocument_id
           left join intel.bronnen b on b.id = d.bron_id
          where iu.inhoud_versie_id = $1
            and iu.rol = 'kern'
            and u.waarde_numeriek is not null
            and u.verificatie_status = 'bevestigd'
          group by u.id, u.waarde_numeriek, u.eenheid
          order by u.id`,
        [v.id],
      );

      const uitspraakIds = await rijen<{ id: number }>(
        c,
        "select uitspraak_id as id from intel.inhoud_uitspraken where inhoud_versie_id = $1",
        [v.id],
      );

      let lokaalNieuw = 0;
      let lokaalBestaand = 0;
      for (const kanaal of kanalen) {
        const al = await eenRij<{ id: number }>(
          c,
          `select id from intel.distributie_concepten
            where organisatie_id = $1 and inhoud_versie_id = $2 and kanaal = $3`,
          [organisatieId, v.id, kanaal],
        );
        if (al) {
          lokaalBestaand += 1;
          continue;
        }
        const tekst = bouwKanaaltekst(kanaal, v, waarden);
        await c.query(
          `insert into intel.distributie_concepten
             (organisatie_id, inhoud_versie_id, gebeurtenis_id, kanaal, titel, body,
              bronvermelding, uitspraak_ids, status, machtiging_bewijs)
           values ($1,$2,$3,$4,$5,$6,$7,$8,'concept',null)`,
          [
            organisatieId,
            v.id,
            v.gebeurtenis_id,
            kanaal,
            tekst.titel,
            tekst.body,
            JSON.stringify(v.bronnen_sectie),
            uitspraakIds.map((u) => u.id),
          ],
        );
        lokaalNieuw += 1;
        perKanaal[kanaal] = (perKanaal[kanaal] ?? 0) + 1;
      }
      return { lokaalNieuw, lokaalBestaand };
    });
    nieuw += resultaat.lokaalNieuw;
    bestaand += resultaat.lokaalBestaand;
  }

  log.info("distributieconcepten gereed", { versies: versies.length, nieuw, bestaand });
  return { versiesBekeken: versies.length, conceptenNieuw: nieuw, conceptenBestaand: bestaand, perKanaal };
}

/**
 * Geeft een concept vrij. Voor een extern kanaal is machtiging_bewijs
 * verplicht; de databaseconstraint weigert het anders alsnog. Vrijgeven
 * is geen publiceren — er wordt niets verstuurd.
 */
export async function geefVrij(
  c: pg.PoolClient,
  conceptId: number,
  gebruikerId: number,
  machtigingBewijs: string | null,
): Promise<{ vrijgegeven: boolean; reden: string }> {
  const concept = await eenRij<{ kanaal: Kanaal; status: string }>(
    c,
    "select kanaal, status from intel.distributie_concepten where id = $1",
    [conceptId],
  );
  if (!concept) return { vrijgegeven: false, reden: "concept bestaat niet" };

  if (EXTERNE_KANALEN.has(concept.kanaal) && !machtigingBewijs) {
    return {
      vrijgegeven: false,
      reden:
        `kanaal ${concept.kanaal} is extern; zonder vastgelegde machtiging kan dit niet ` +
        "vrijgegeven worden",
    };
  }

  await c.query(
    `update intel.distributie_concepten
        set status = 'vrijgegeven', vrijgegeven_door = $2, machtiging_bewijs = $3
      where id = $1`,
    [conceptId, gebruikerId, machtigingBewijs],
  );
  return {
    vrijgegeven: true,
    reden:
      "vrijgegeven voor handmatig gebruik; dit platform plaatst en verstuurt niets",
  };
}
