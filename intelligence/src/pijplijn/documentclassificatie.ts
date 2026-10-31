/* ============================================================
   PIJPLIJN — de documentclassificatie opslaan en inhalen
   ------------------------------------------------------------
   `documentsoort.ts` is puur: hij rekent en kent de database niet. Deze
   module is de enige plek die het oordeel WEGSCHRIJFT, en dat is bewust
   één plek: de pijplijn classificeert nieuwe versies tijdens het
   clusteren, en een inhaalronde classificeert de versies die er al
   stonden. Zou elk van die twee zijn eigen insert hebben, dan lopen ze
   uiteen zodra de kolomverzameling verandert — precies de klasse fouten
   die voorstel.ts al vastlegt.

   DE UITGEVERSSOORT STAAT IN CODE EN NIET IN DE DATABASE.
   `intel.bronnen` draagt `uitgever` (de naam) maar geen uitgeverssoort;
   die staat in `bronnen/register.ts`. Dat is dezelfde constructie die
   site/nieuwscontext.ts gebruikt voor BRONSOORT_UIT_UITGEVER, en om
   dezelfde reden: de soort is een redactioneel besluit dat in een
   review hoort te staan, niet een waarde die iemand in productie kan
   bijwerken.

   EEN ONBEKENDE BRONSLEUTEL IS GEEN FOUT MAAR DE LAAGSTE BEVOEGDHEID.
   Een bron die in de database staat maar niet in het register valt naar
   gezag MARKT. Dat is de veilige kant; zie gezagVan().
   ============================================================ */

import type pg from "pg";
import { BRONNEN } from "../bronnen/register.ts";
import { maakLogger } from "../kern/log.ts";
import {
  bepaalDocumentsoort,
  gezagVan,
  type Documentsoort,
  type DocumentsoortUitslag,
  type Gezag,
} from "./documentsoort.ts";

const log = maakLogger("documentclassificatie");

/** Bronsleutel -> uitgeverssoort, één keer opgebouwd uit het register. */
const UITGEVERSOORT: ReadonlyMap<string, string> = new Map(
  BRONNEN.map((b) => [b.sleutel, b.uitgeverSoort]),
);

export function uitgeverSoortVan(bronSleutel: string): string {
  return UITGEVERSOORT.get(bronSleutel) ?? "onbekend";
}

/** Het gezag van een bron, uit zijn sleutel. */
export function gezagVanBron(bronSleutel: string): Gezag {
  return gezagVan(uitgeverSoortVan(bronSleutel));
}

export type TeClassificerenVersie = {
  readonly versieId: number;
  readonly titel: string;
  readonly tekst: string;
  readonly canoniekeUrl: string | null;
  readonly bronSleutel: string;
  readonly injectieVerdacht: boolean;
};

/** Classificeert zonder weg te schrijven; de pure stap, voor hergebruik. */
export function classificeerVersie(v: TeClassificerenVersie): DocumentsoortUitslag {
  return bepaalDocumentsoort({
    titel: v.titel,
    tekst: v.tekst,
    ...(v.canoniekeUrl === null ? {} : { url: v.canoniekeUrl }),
    uitgeverSoort: uitgeverSoortVan(v.bronSleutel),
    bronSleutel: v.bronSleutel,
    injectieVerdacht: v.injectieVerdacht,
  });
}

/**
 * Schrijft het oordeel op de versie.
 *
 * IDEMPOTENT. Dezelfde versie opnieuw classificeren overschrijft het
 * oordeel met hetzelfde resultaat, want `bepaalDocumentsoort()` is puur
 * en de versietekst is onveranderlijk (`versies_hash_uniek`). Een
 * inhaalronde kan dus zonder gevolgen twee keer draaien.
 */
export async function slaDocumentsoortOp(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  versieId: number,
  u: DocumentsoortUitslag,
): Promise<void> {
  await c.query(
    `update intel.brondocument_versies
        set documentsoort             = $3,
            documentsoort_gezag       = $4,
            documentsoort_grondslag   = $5,
            documentsoort_versie      = $6,
            documentsoort_onzekerheid = $7,
            beschrijft_besluit_van    = $8,
            documentvorm              = $9
      where id = $1 and organisatie_id = $2`,
    [
      versieId,
      organisatieId,
      u.soort,
      u.gezag,
      JSON.stringify(u.grondslag),
      u.versie,
      u.onzekerheid.toFixed(2),
      u.beschrijftBesluitVan,
      /* DE VORM GAAT MEE, ook als hij de soort niet veranderde. Een
         audit moet kunnen zien WAAROM een stuk met besluittaal geen
         besluit werd, en zonder dit veld is dat alleen uit de
         grondslag-json te vissen. */
      u.vorm,
    ],
  );
}

export type InhaalRapport = {
  readonly bekeken: number;
  readonly geclassificeerd: number;
  readonly perSoort: Readonly<Record<string, number>>;
};

/**
 * Classificeert versies die nog geen oordeel hebben, of waarvan het
 * oordeel van een oudere motorversie komt.
 *
 * WAAROM OOK DE OUDE VERSIES. `documentsoort_versie` draagt de
 * motorversie. Verandert die, dan hoort een herclassificatie te volgen,
 * anders staan er twee generaties oordelen door elkaar en is een
 * vergelijking tussen documenten niet meer eerlijk. De taak haalt
 * daarom alles op wat NULL is of een andere versie draagt.
 */
export async function haalClassificatieIn(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  opties: { readonly max?: number; readonly huidigeVersie: string },
): Promise<InhaalRapport> {
  const max = opties.max ?? 2000;

  const { rows } = await c.query<{
    id: number;
    titel: string;
    ruwe_tekst: string;
    canonieke_url: string | null;
    bron_sleutel: string;
    injectie_verdacht: boolean;
  }>(
    `select v.id, v.titel, v.ruwe_tekst, d.canonieke_url,
            b.sleutel as bron_sleutel, v.injectie_verdacht
       from intel.brondocument_versies v
       join intel.brondocumenten d on d.id = v.brondocument_id
       join intel.bronnen b on b.id = d.bron_id
      where v.organisatie_id = $1
        and (v.documentsoort is null or v.documentsoort_versie is distinct from $2)
      order by v.id
      limit $3`,
    [organisatieId, opties.huidigeVersie, max],
  );

  const perSoort: Record<string, number> = {};
  let geclassificeerd = 0;

  for (const r of rows) {
    const u = classificeerVersie({
      versieId: r.id,
      titel: r.titel,
      tekst: r.ruwe_tekst,
      canoniekeUrl: r.canonieke_url,
      bronSleutel: r.bron_sleutel,
      injectieVerdacht: r.injectie_verdacht,
    });
    await slaDocumentsoortOp(c, organisatieId, r.id, u);
    perSoort[u.soort] = (perSoort[u.soort] ?? 0) + 1;
    geclassificeerd += 1;
  }

  log.info("documentclassificatie ingehaald", {
    bekeken: rows.length,
    geclassificeerd,
    per_soort: perSoort,
  });

  return { bekeken: rows.length, geclassificeerd, perSoort };
}

/** De soorten die een claim niet als eigen bewijs mogen dragen. */
export const NIET_DRAGENDE_SOORTEN: readonly Documentsoort[] = [
  "OPINIE",
  "LOBBYDOCUMENT",
  "SECUNDAIRE_BERICHTGEVING",
  "ONVOLDOENDE_VERIFIEERBAAR",
];
