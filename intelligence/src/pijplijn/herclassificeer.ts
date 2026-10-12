/* ============================================================
   HERCLASSIFICEREN — bestaande gebeurtenissen een relevantie geven
   ------------------------------------------------------------
   WAAROM DIT APART BESTAAT

   `clusterNieuweVersies` classificeert wat er binnenkomt. Maar de
   relevantiekolommen zijn nieuw (migratie 0019), en in de database
   staan al gebeurtenissen zonder. Lokaal 142, in productie 62. Die
   opnieuw laten verzamelen zou de bronnen onnodig belasten en zou bij
   een bron die oude items niet meer aanbiedt helemaal niets opleveren.

   DE INVOER KOMT UIT DE DATABASE, NIET VAN HET NET

   Titel, tekst en soort staan er al; de classificatie is zuiver
   deterministisch. Herclassificeren is dus een rekenslag over bestaande
   rijen, zonder enkele netwerkaanroep. Dat is ook de reden dat het
   veilig herhaalbaar is: dezelfde invoer geeft dezelfde uitslag.

   WAT HET NIET AANRAAKT

   `materialiteit` blijft ongemoeid. De twee assen staan los van elkaar
   (§6); dit vult de nieuwe as en herschrijft de oude niet.
   ============================================================ */

import { metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { herkenOnderwerpen } from "./onderwerpen.ts";
import { classificeer, type Categorie } from "./relevantie.ts";
import { urlAlsWoorden } from "./clusteren.ts";

const log = maakLogger("herclassificeer");

export type HerclassificatieRapport = {
  readonly bekeken: number;
  readonly geschreven: number;
  readonly perCategorie: Readonly<Record<string, number>>;
  /** Gebeurtenissen die van actiegericht naar achtergrond zakten, met reden. */
  readonly gedegradeerd: readonly { titel: string; materialiteit: number; relevantie: number }[];
};

type GebeurtenisRij = {
  id: number;
  titel: string;
  gebeurtenis_soort: string;
  materialiteit: number;
  tekst: string | null;
  canonieke_url: string | null;
  bevestigde_uitspraken: number;
};

/**
 * Herclassificeert gebeurtenissen die nog geen relevantie hebben.
 *
 * Met `alles: true` worden ze ALLE herclassificeerd. Dat is nodig na een
 * wijziging in de classificeerder zelf; zonder die vlag is de operatie
 * goedkoop en kan hij in de wachtrij staan zonder steeds alles te doen.
 */
export async function herclassificeer(
  pool: Pool,
  organisatieId: number,
  opties: { max?: number; alles?: boolean } = {},
): Promise<HerclassificatieRapport> {
  const max = opties.max ?? 5000;

  const gebeurtenissen = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<GebeurtenisRij>(
      c,
      `select g.id,
              g.titel,
              g.gebeurtenis_soort,
              g.materialiteit,
              -- De langste beschikbare brontekst: een rectificatie kan
              -- korter zijn dan de oorspronkelijke aankondiging.
              (select v.ruwe_tekst
                 from intel.gebeurtenis_documenten gd
                 join intel.brondocument_versies v on v.id = gd.versie_id
                where gd.gebeurtenis_id = g.id
                order by length(coalesce(v.ruwe_tekst, '')) desc
                limit 1) as tekst,
              (select d.canonieke_url
                 from intel.gebeurtenis_documenten gd
                 join intel.brondocumenten d on d.id = gd.brondocument_id
                where gd.gebeurtenis_id = g.id
                order by gd.rol = 'primair' desc
                limit 1) as canonieke_url,
              (select count(*)::int from intel.uitspraken u
                where u.gebeurtenis_id = g.id and u.verificatie_status = 'bevestigd')
                as bevestigde_uitspraken
         from intel.markt_gebeurtenissen g
        where g.organisatie_id = $1
          ${opties.alles ? "" : "and g.relevantie_categorie is null"}
        order by g.materialiteit desc, g.id
        limit $2`,
      [organisatieId, max],
    ),
  );

  const perCategorie: Record<string, number> = {};
  const gedegradeerd: { titel: string; materialiteit: number; relevantie: number }[] = [];
  let geschreven = 0;

  for (const g of gebeurtenissen) {
    const padWoorden = g.canonieke_url ? urlAlsWoorden(g.canonieke_url) : "";
    const tekst = g.tekst ?? "";
    const uitslag = classificeer({
      titel: g.titel,
      tekst,
      onderwerpen: herkenOnderwerpen(g.titel, `${padWoorden} ${tekst}`),
      gebeurtenisSoort: g.gebeurtenis_soort,
      geverifieerdeUitspraken: g.bevestigde_uitspraken,
    });

    perCategorie[uitslag.categorie] = (perCategorie[uitslag.categorie] ?? 0) + 1;

    /* HET BEWIJS VOOR §3, per rij. Een gebeurtenis die op materialiteit
       50 of hoger stond maar lage bedrijfsrelevantie krijgt, is precies
       de klacht: zwaar maar niet van ons. */
    if (g.materialiteit >= 50 && uitslag.bedrijfsrelevantie <= 30) {
      gedegradeerd.push({
        titel: g.titel,
        materialiteit: g.materialiteit,
        relevantie: uitslag.bedrijfsrelevantie,
      });
    }

    try {
      await metOrganisatie(pool, { organisatieId }, (c) =>
        c.query(
          `update intel.markt_gebeurtenissen
              set relevantie_categorie  = $2,
                  bedrijfsrelevantie    = $3,
                  relevantie_vertrouwen = $4,
                  relevantie_grondslag  = $5,
                  relevantie_op         = now()
            where organisatie_id = $1 and id = $6`,
          [
            organisatieId,
            uitslag.categorie,
            uitslag.bedrijfsrelevantie,
            uitslag.vertrouwen,
            JSON.stringify({ uitleg: uitslag.uitleg, ...uitslag.grondslag }),
            g.id,
          ],
        ),
      );
      geschreven += 1;
    } catch (e) {
      log.fout("herclassificatie mislukt", { gebeurtenis: g.id, fout: e });
    }
  }

  return {
    bekeken: gebeurtenissen.length,
    geschreven,
    perCategorie,
    gedegradeerd: gedegradeerd.sort((a, b) => b.materialiteit - a.materialiteit),
  };
}

/** De categorieën waaruit een commerciële kans mag ontstaan. */
export function isCommercieel(c: Categorie): boolean {
  return c === "commerciele_kans";
}
