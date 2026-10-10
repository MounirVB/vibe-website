/* ============================================================
   BESLUIT — de inhoudsbesluitmotor
   ------------------------------------------------------------
   Volledig deterministisch. Dezelfde gebeurtenis met dezelfde bronnen
   levert over een jaar hetzelfde besluit, en de onderbouwing per as
   wordt opgeslagen zodat het na te rekenen is.

   Twee regels uit de opdracht die hier het zwaarst wegen:

   1. "Do not automatically create a new URL whenever a source
      publishes a new article." Een nieuwe pagina is de uitzondering,
      niet de regel. Bestaat er al een indexeerbare pagina die de
      zoekintentie van dit cluster bezit, dan is het antwoord
      UPDATE_EXISTING — hoe materieel de gebeurtenis ook is.
   2. "Zero articles on a low-value day is acceptable." MONITOR en
      REJECT zijn volwaardige uitkomsten, geen falen.

   De motorversie staat in elk besluit. Verandert de weging, dan is aan
   de versie te zien dat een oud besluit onder andere regels is genomen.
   ============================================================ */

import type pg from "pg";
import { eenRij, metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("besluit");

export const MOTOR_VERSIE = "besluitmotor-v1";

export type Besluit =
  | "NEW_ARTICLE"
  | "UPDATE_EXISTING"
  | "REGIONAL_PATCH"
  | "KNOWLEDGE_UPDATE"
  | "SALES_SIGNAL"
  | "DISTRIBUTION_ONLY"
  | "MONITOR"
  | "REJECT";

/** Drempels op één plek, zodat ze te verantwoorden en te wijzigen zijn. */
export const DREMPELS = {
  /** Onder deze materialiteit is het geen gebeurtenis om iets mee te doen. */
  materialiteitAfwijzen: 25,
  /** Onder deze materialiteit alleen volgen, niet schrijven. */
  materialiteitMonitor: 45,
  /** Vanaf hier mag een nieuwe pagina overwogen worden. */
  materialiteitNieuwArtikel: 55,
  /** Minimaal aantal onafhankelijke bronnen voor een nieuwe pagina. */
  bronnenNieuwArtikel: 1,
  /** Minimale bewijskwaliteit voor een nieuwe pagina. */
  bewijsNieuwArtikel: 4,
} as const;

/** Onderwerpen die een technische kennislaag voeden in plaats van nieuws. */
const KENNISONDERWERPEN = new Set([
  "bess",
  "ems",
  "laadinfrastructuur",
  "zonne-energie",
  "batterijveiligheid",
  "flexibiliteit",
]);

/** Gebeurtenissoorten die commercieel signaal zijn, geen inhoud. */
const SIGNAALSOORTEN = new Set(["aanbesteding", "vergunning", "vastgoedontwikkeling"]);

/** Soorten die zelden een pagina verdienen maar wel een kanaalbericht. */
const DISTRIBUTIESOORTEN = new Set(["marktprijs", "statistiek"]);

export type GebeurtenisInvoer = {
  readonly gebeurtenisId: number;
  readonly titel: string;
  readonly gebeurtenisSoort: string;
  readonly materialiteit: number;
  readonly risicoKlasse: "laag" | "midden" | "hoog";
  readonly aantalBronnen: number;
  readonly heeftTegenspraak: boolean;
  readonly clusterSleutel: string | null;
  readonly clusterId: number | null;
  readonly canoniekePagina: string | null;
  /** Bestaat die pagina en is hij indexeerbaar? */
  readonly canoniekePaginaId: number | null;
  readonly canoniekPaginaBeheer: "handmatig" | "intelligence" | null;
  readonly uitsprakenBevestigd: number;
  readonly uitsprakenTotaal: number;
  readonly besteBewijskwaliteit: number;
  readonly injectieInBron: boolean;
  readonly geoMetBronbewijs: number;
  readonly geoAfgeleid: number;
};

export type AsBeoordeling = {
  readonly as: string;
  readonly score: number;
  readonly max: number;
  readonly grondslag: string;
};

export type BesluitUitkomst = {
  readonly besluit: Besluit;
  readonly totaalscore: number;
  readonly redenen: readonly string[];
  readonly assen: readonly AsBeoordeling[];
  readonly risicoKlasse: "laag" | "midden" | "hoog";
  readonly doelPaginaId: number | null;
};

function as(as: string, score: number, max: number, grondslag: string): AsBeoordeling {
  return { as, score, max, grondslag };
}

/**
 * Beoordeelt één gebeurtenis. De assen leveren een score; de poorten
 * daarna bepalen de uitkomst. Scores sturen de prioritering, poorten
 * sturen het besluit — die twee worden bewust niet door elkaar gehaald.
 */
export function beoordeel(g: GebeurtenisInvoer): BesluitUitkomst {
  const assen: AsBeoordeling[] = [];
  const redenen: string[] = [];

  assen.push(
    as(
      "echte_brongebeurtenis",
      g.aantalBronnen > 0 ? 10 : 0,
      10,
      `${g.aantalBronnen} onafhankelijke bron(nen)`,
    ),
  );
  assen.push(
    as("materialiteit", Math.round(g.materialiteit / 4), 25, `materialiteit ${g.materialiteit}/100`),
  );
  assen.push(
    as(
      "bewijskwaliteit",
      g.uitsprakenBevestigd > 0 ? Math.min(20, g.besteBewijskwaliteit * 4) : 0,
      20,
      `${g.uitsprakenBevestigd} van ${g.uitsprakenTotaal} uitspraken bevestigd, beste bewijskwaliteit ${g.besteBewijskwaliteit}`,
    ),
  );
  assen.push(
    as(
      "commerciele_relevantie",
      g.clusterSleutel ? 15 : 0,
      15,
      g.clusterSleutel
        ? `valt in cluster '${g.clusterSleutel}', dat aan een Vibe-oplossing hangt`
        : "geen onderwerpcluster, dus geen aantoonbare link met een Vibe-oplossing",
    ),
  );
  assen.push(
    as(
      "canoniek_eigendom",
      g.canoniekePaginaId ? 10 : 0,
      10,
      g.canoniekePaginaId
        ? `cluster heeft een bestaande indexeerbare pagina: ${g.canoniekePagina}`
        : "geen bestaande pagina bezit deze zoekintentie",
    ),
  );
  assen.push(
    as(
      "geografische_binding",
      Math.min(10, g.geoMetBronbewijs * 5),
      10,
      `${g.geoMetBronbewijs} gebied(en) met bronbewijs, ${g.geoAfgeleid} afgeleid`,
    ),
  );
  assen.push(
    as(
      "risico",
      g.risicoKlasse === "laag" ? 10 : g.risicoKlasse === "midden" ? 5 : 0,
      10,
      `risicoklasse ${g.risicoKlasse}`,
    ),
  );

  const totaalscore = Math.max(
    0,
    Math.min(100, assen.reduce((a, b) => a + b.score, 0)),
  );

  // ---------- poorten, in volgorde ----------

  if (g.aantalBronnen === 0) {
    redenen.push("geen enkele bronwaarneming; dit is geen gebeurtenis");
    return klaar("REJECT", totaalscore, redenen, assen, g, null);
  }

  if (g.materialiteit < DREMPELS.materialiteitAfwijzen) {
    redenen.push(
      `materialiteit ${g.materialiteit} ligt onder de afwijsdrempel ${DREMPELS.materialiteitAfwijzen}`,
    );
    return klaar("REJECT", totaalscore, redenen, assen, g, null);
  }

  if (!g.clusterSleutel) {
    redenen.push("geen onderwerpcluster, dus geen aantoonbare relevantie voor Vibe");
    return klaar("MONITOR", totaalscore, redenen, assen, g, null);
  }

  // Tegenspraak tussen bronnen is nooit een publicatiegrond.
  if (g.heeftTegenspraak) {
    redenen.push(
      "bronnen spreken elkaar numeriek tegen; dat moet eerst opgelost worden, niet gepubliceerd",
    );
    return klaar("MONITOR", totaalscore, redenen, assen, g, null);
  }

  // Een bron met injectieverdenking kan wel tot inhoud leiden, maar
  // nooit zonder mens. Dat is verderop een poort; hier wordt het
  // alleen vastgelegd als reden.
  if (g.injectieInBron) {
    redenen.push(
      "een onderliggende bronversie is als injectieverdacht gemarkeerd; menselijke review is verplicht",
    );
  }

  // Commercieel signaal gaat niet naar de contentketen.
  if (SIGNAALSOORTEN.has(g.gebeurtenisSoort)) {
    redenen.push(
      `gebeurtenissoort '${g.gebeurtenisSoort}' is een commercieel signaal, geen inhoudelijke publicatie`,
    );
    return klaar("SALES_SIGNAL", totaalscore, redenen, assen, g, null);
  }

  if (g.materialiteit < DREMPELS.materialiteitMonitor) {
    redenen.push(
      `materialiteit ${g.materialiteit} ligt onder de schrijfdrempel ${DREMPELS.materialiteitMonitor}; volgen volstaat`,
    );
    return klaar("MONITOR", totaalscore, redenen, assen, g, null);
  }

  if (g.uitsprakenBevestigd === 0) {
    redenen.push(
      `geen bevestigde uitspraak (${g.uitsprakenTotaal} ongeverifieerd); zonder bewijs geen inhoud`,
    );
    return klaar("MONITOR", totaalscore, redenen, assen, g, null);
  }

  // Marktprijs- en statistiekdagbeelden horen in een kanaalbericht, niet
  // op een pagina: ze verouderen per dag en zouden een pagina vervuilen.
  if (DISTRIBUTIESOORTEN.has(g.gebeurtenisSoort)) {
    redenen.push(
      `'${g.gebeurtenisSoort}' verandert per dag; een pagina zou direct verouderen, een kanaalbericht niet`,
    );
    return klaar("DISTRIBUTION_ONLY", totaalscore, redenen, assen, g, null);
  }

  // Bestaat er al een pagina die deze zoekintentie bezit? Dan verbeteren
  // we die. Dit is de belangrijkste regel van de hele motor.
  if (g.canoniekePaginaId) {
    redenen.push(
      `pagina ${g.canoniekePagina} bezit deze zoekintentie al; verbeteren gaat voor een nieuwe URL`,
    );
    if (g.canoniekPaginaBeheer === "handmatig") {
      redenen.push(
        "die pagina staat op handmatig beheer (Release 1-eigendom), dus dit wordt een patchvoorstel",
      );
    }
    const besluit: Besluit = KENNISONDERWERPEN.has(g.clusterSleutel)
      ? "KNOWLEDGE_UPDATE"
      : "UPDATE_EXISTING";
    return klaar(besluit, totaalscore, redenen, assen, g, g.canoniekePaginaId);
  }

  // Geen eigenaar. Dan mag een nieuwe pagina, maar alleen met voldoende
  // materialiteit, bewijs en bronnen.
  const magNieuw =
    g.materialiteit >= DREMPELS.materialiteitNieuwArtikel &&
    g.aantalBronnen >= DREMPELS.bronnenNieuwArtikel &&
    g.besteBewijskwaliteit >= DREMPELS.bewijsNieuwArtikel;

  if (!magNieuw) {
    redenen.push(
      `geen pagina bezit deze intentie, maar de drempels voor een nieuwe pagina zijn niet gehaald ` +
        `(materialiteit ${g.materialiteit}/${DREMPELS.materialiteitNieuwArtikel}, ` +
        `bronnen ${g.aantalBronnen}/${DREMPELS.bronnenNieuwArtikel}, ` +
        `bewijs ${g.besteBewijskwaliteit}/${DREMPELS.bewijsNieuwArtikel})`,
    );
    return klaar("MONITOR", totaalscore, redenen, assen, g, null);
  }

  // Regionale patch gaat voor een landelijke pagina als het bewijs
  // gebiedsgebonden is.
  if (g.geoMetBronbewijs > 0) {
    redenen.push(
      `${g.geoMetBronbewijs} gebied(en) worden in de bron zelf genoemd; dat is een regionale patch, geen landelijk artikel`,
    );
    return klaar("REGIONAL_PATCH", totaalscore, redenen, assen, g, null);
  }

  redenen.push(
    `geen bestaande pagina bezit cluster '${g.clusterSleutel}' en alle drempels zijn gehaald; ` +
      "een nieuwe pagina claimt deze zoekintentie",
  );
  if (KENNISONDERWERPEN.has(g.clusterSleutel)) {
    redenen.push("technisch onderwerp, dus de kennislaag in plaats van nieuws");
    return klaar("KNOWLEDGE_UPDATE", totaalscore, redenen, assen, g, null);
  }
  return klaar("NEW_ARTICLE", totaalscore, redenen, assen, g, null);
}

function klaar(
  besluit: Besluit,
  totaalscore: number,
  redenen: string[],
  assen: AsBeoordeling[],
  g: GebeurtenisInvoer,
  doelPaginaId: number | null,
): BesluitUitkomst {
  return { besluit, totaalscore, redenen, assen, risicoKlasse: g.risicoKlasse, doelPaginaId };
}

// ------------------------------------------------------------
// Uitvoering tegen de database
// ------------------------------------------------------------

export type BesluitRapport = {
  readonly beoordeeld: number;
  readonly perBesluit: Readonly<Record<string, number>>;
  readonly kandidatenGeschreven: number;
};

type GebeurtenisRij = {
  id: number;
  titel: string;
  gebeurtenis_soort: string;
  materialiteit: number;
  risico_klasse: "laag" | "midden" | "hoog";
  aantal_bronnen: number;
  heeft_tegenspraak: boolean;
  cluster_id: number | null;
  cluster_sleutel: string | null;
  canonieke_pagina: string | null;
  pagina_id: number | null;
  pagina_beheer: "handmatig" | "intelligence" | null;
  uitspraken_bevestigd: number;
  uitspraken_totaal: number;
  beste_bewijskwaliteit: number;
  injectie_in_bron: boolean;
  geo_bronbewijs: number;
  geo_afgeleid: number;
};

export async function neemBesluiten(
  pool: Pool,
  organisatieId: number,
  opties: { max?: number; opnieuw?: boolean } = {},
): Promise<BesluitRapport> {
  const max = opties.max ?? 1000;

  const gebeurtenissen = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<GebeurtenisRij>(
      c,
      `select g.id,
              g.titel,
              g.gebeurtenis_soort,
              g.materialiteit,
              g.risico_klasse,
              g.aantal_bronnen,
              g.heeft_tegenspraak,
              g.onderwerp_cluster_id                      as cluster_id,
              oc.sleutel                                  as cluster_sleutel,
              oc.canonieke_pagina,
              pr.id                                       as pagina_id,
              pr.beheer                                   as pagina_beheer,
              (select count(*)::int from intel.uitspraken u
                where u.gebeurtenis_id = g.id and u.verificatie_status = 'bevestigd')
                                                          as uitspraken_bevestigd,
              (select count(*)::int from intel.uitspraken u
                where u.gebeurtenis_id = g.id)            as uitspraken_totaal,
              coalesce((select max(u.bewijs_kwaliteit) from intel.uitspraken u
                         where u.gebeurtenis_id = g.id), 0) as beste_bewijskwaliteit,
              exists (select 1
                        from intel.gebeurtenis_documenten gd
                        join intel.brondocument_versies v on v.id = gd.versie_id
                       where gd.gebeurtenis_id = g.id and v.injectie_verdacht)
                                                          as injectie_in_bron,
              (select count(*)::int from intel.gebeurtenis_geo gg
                where gg.gebeurtenis_id = g.id
                  and gg.grondslag in ('bron_expliciet', 'code_match'))
                                                          as geo_bronbewijs,
              (select count(*)::int from intel.gebeurtenis_geo gg
                where gg.gebeurtenis_id = g.id and gg.grondslag = 'afgeleid')
                                                          as geo_afgeleid
         from intel.markt_gebeurtenissen g
         left join intel.onderwerp_clusters oc on oc.id = g.onderwerp_cluster_id
         left join intel.pagina_register pr
                on pr.organisatie_id = g.organisatie_id
               and pr.pad = oc.canonieke_pagina
               and pr.bestaat_in_repo
        where g.organisatie_id = $1
          and g.status <> 'afgewezen'
          and ($2::boolean or not exists (
            select 1 from intel.inhoud_kandidaten k
             where k.gebeurtenis_id = g.id and k.motor_versie = $3
          ))
        order by g.materialiteit desc, g.id
        limit $4`,
      [organisatieId, opties.opnieuw ?? false, MOTOR_VERSIE, max],
    ),
  );

  const perBesluit: Record<string, number> = {};
  let geschreven = 0;

  for (const g of gebeurtenissen) {
    const uitkomst = beoordeel({
      gebeurtenisId: g.id,
      titel: g.titel,
      gebeurtenisSoort: g.gebeurtenis_soort,
      materialiteit: g.materialiteit,
      risicoKlasse: g.risico_klasse,
      aantalBronnen: g.aantal_bronnen,
      heeftTegenspraak: g.heeft_tegenspraak,
      clusterSleutel: g.cluster_sleutel,
      clusterId: g.cluster_id,
      canoniekePagina: g.canonieke_pagina,
      canoniekePaginaId: g.pagina_id,
      canoniekPaginaBeheer: g.pagina_beheer,
      uitsprakenBevestigd: g.uitspraken_bevestigd,
      uitsprakenTotaal: g.uitspraken_totaal,
      besteBewijskwaliteit: g.beste_bewijskwaliteit,
      injectieInBron: g.injectie_in_bron,
      geoMetBronbewijs: g.geo_bronbewijs,
      geoAfgeleid: g.geo_afgeleid,
    });

    perBesluit[uitkomst.besluit] = (perBesluit[uitkomst.besluit] ?? 0) + 1;

    await metOrganisatie(pool, { organisatieId }, async (c) => {
      await schrijfKandidaat(c, organisatieId, g, uitkomst);
    });
    geschreven += 1;
  }

  log.info("besluiten genomen", { beoordeeld: gebeurtenissen.length, perBesluit });
  return { beoordeeld: gebeurtenissen.length, perBesluit, kandidatenGeschreven: geschreven };
}

async function schrijfKandidaat(
  c: pg.PoolClient,
  organisatieId: number,
  g: GebeurtenisRij,
  uitkomst: BesluitUitkomst,
): Promise<void> {
  const bestaand = await eenRij<{ id: number }>(
    c,
    `select id from intel.inhoud_kandidaten
      where organisatie_id = $1 and gebeurtenis_id = $2 and motor_versie = $3`,
    [organisatieId, g.id, MOTOR_VERSIE],
  );

  const beoordeling = {
    assen: uitkomst.assen,
    drempels: DREMPELS,
    gebeurtenis: {
      materialiteit: g.materialiteit,
      aantal_bronnen: g.aantal_bronnen,
      uitspraken_bevestigd: g.uitspraken_bevestigd,
      uitspraken_totaal: g.uitspraken_totaal,
      heeft_tegenspraak: g.heeft_tegenspraak,
      injectie_in_bron: g.injectie_in_bron,
    },
  };

  if (bestaand) {
    await c.query(
      `update intel.inhoud_kandidaten
          set besluit = $2, beoordeling = $3, totaalscore = $4, besluit_redenen = $5,
              risico_klasse = $6, doel_pagina_id = $7, onderwerp_cluster_id = $8
        where id = $1`,
      [
        bestaand.id,
        uitkomst.besluit,
        JSON.stringify(beoordeling),
        uitkomst.totaalscore,
        uitkomst.redenen,
        uitkomst.risicoKlasse,
        uitkomst.doelPaginaId,
        g.cluster_id,
      ],
    );
    return;
  }

  await c.query(
    `insert into intel.inhoud_kandidaten
       (organisatie_id, gebeurtenis_id, onderwerp_cluster_id, doel_pagina_id,
        besluit, beoordeling, totaalscore, besluit_redenen, motor_versie,
        risico_klasse, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
             case when $5 in ('REJECT') then 'vervallen' else 'open' end)`,
    [
      organisatieId,
      g.id,
      g.cluster_id,
      uitkomst.doelPaginaId,
      uitkomst.besluit,
      JSON.stringify(beoordeling),
      uitkomst.totaalscore,
      uitkomst.redenen,
      MOTOR_VERSIE,
      uitkomst.risicoKlasse,
    ],
  );
}
