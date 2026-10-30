/* ============================================================
   PIJPLIJN — clusteren tot marktgebeurtenissen
   ------------------------------------------------------------
   Een bronversie is een waarneming. Een gebeurtenis is wat er in de
   markt gebeurde. Twee uitgevers die hetzelfde besluit melden leveren
   twee waarnemingen en één gebeurtenis — en juist die twee
   waarnemingen zijn het bewijs.

   De dedupsleutel is afgeleid van onderwerp, de betekenisvolle woorden
   uit de titel (gesorteerd, dus woordorde doet niet mee) en de dag.
   Dat is grof maar reproduceerbaar; een model zou hier beter clusteren
   en slechter navertelbaar zijn.

   De samenvatting wordt opgebouwd uit de geëxtraheerde uitspraken, niet
   uit de brontekst. Dat is geen stijlkeuze: brontekst overnemen is een
   poortfout, en een samenvatting die uit onze eigen uitspraken is
   opgebouwd kan per definitie naar bewijs herleid worden.
   ============================================================ */

import type pg from "pg";
import { eenRij, metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { gebeurtenisSleutel, kort } from "../kern/tekst.ts";
import { bronOpSleutel } from "../bronnen/register.ts";
import type { Onderwerp } from "../bronnen/soorten.ts";
import { gebeurtenisSoortVan, herkenOnderwerpen, isProcedureel } from "./onderwerpen.ts";
import { schrijfUitspraken, vindTegenspraak } from "./uitspraken.ts";
import { classificeer, type Categorie } from "./relevantie.ts";
import { classificeerVersie, slaDocumentsoortOp } from "./documentclassificatie.ts";

const log = maakLogger("clusteren");
/**
 * Zet het pad van een URL om in losse woorden. Alleen het pad, niet de
 * host: een hostnaam als 'energystoragenl.nl' zou anders elk item van
 * die uitgever op 'energieopslag' laten matchen.
 */
export function urlAlsWoorden(url: string): string {
  try {
    const pad = decodeURIComponent(new URL(url).pathname);
    return pad
      .split(/[/\-_.]+/)
      .filter((d) => d.length > 1 && !/^\d+$/.test(d))
      .join(" ");
  } catch {
    return "";
  }
}


type VersieRij = {
  versie_id: number;
  brondocument_id: number;
  titel: string;
  ruwe_tekst: string;
  gepubliceerd_op: Date | null;
  canonieke_url: string;
  bron_id: number;
  bron_sleutel: string;
  uitgever: string;
  betrouwbaarheid: number;
  is_primaire_bron: boolean;
  injectie_verdacht: boolean;
};

export type ClusterRapport = {
  readonly versiesBekeken: number;
  readonly zonderOnderwerp: number;
  readonly gebeurtenissenNieuw: number;
  readonly gebeurtenissenVerrijkt: number;
  readonly uitsprakenAangemaakt: number;
  readonly uitsprakenBevestigd: number;
  readonly tegenspraken: number;
  readonly perOnderwerp: Readonly<Record<string, number>>;
};

/**
 * Materialiteit op zes assen, elk met een eigen plafond. Volledig
 * deterministisch, zodat een besluit later na te rekenen is.
 */
export function berekenMaterialiteit(invoer: {
  betrouwbaarheid: number;
  isPrimaireBron: boolean;
  aantalBronnen: number;
  aantalUitspraken: number;
  gebeurdOp: Date | null;
  onderwerpScore: number;
}): { score: number; grondslag: Record<string, number> } {
  const dagenOud =
    invoer.gebeurdOp === null
      ? null
      : Math.max(0, (Date.now() - invoer.gebeurdOp.getTime()) / 86_400_000);

  const versheid =
    dagenOud === null ? 2 : dagenOud <= 7 ? 15 : dagenOud <= 30 ? 10 : dagenOud <= 90 ? 5 : 0;

  const grondslag = {
    bronbetrouwbaarheid: Math.min(25, invoer.betrouwbaarheid * 5),
    primaire_bron: invoer.isPrimaireBron ? 15 : 0,
    // Corroboratie weegt zwaar: twee onafhankelijke bronnen is het
    // sterkste signaal dat iets echt gebeurd is.
    corroboratie: Math.min(20, Math.max(0, invoer.aantalBronnen - 1) * 10),
    harde_waarden: Math.min(15, invoer.aantalUitspraken * 5),
    versheid,
    onderwerpsterkte: Math.min(10, invoer.onderwerpScore),
  };

  const score = Object.values(grondslag).reduce((a, b) => a + b, 0);
  return { score: Math.max(0, Math.min(100, Math.round(score))), grondslag };
}

/** Samenvatting in eigen woorden, opgebouwd uit onze eigen uitspraken. */
async function bouwSamenvatting(
  c: pg.PoolClient,
  gebeurtenisId: number,
  onderwerp: string,
): Promise<string> {
  const uitspraken = await rijen<{
    soort: string;
    waarde_numeriek: string | null;
    eenheid: string | null;
    geldig_vanaf: string | null;
    geldig_tot: string | null;
    verificatie_status: string;
  }>(
    c,
    `select soort, waarde_numeriek, eenheid, geldig_vanaf, geldig_tot, verificatie_status
       from intel.uitspraken
      where gebeurtenis_id = $1
      order by (verificatie_status = 'bevestigd') desc, id
      limit 12`,
    [gebeurtenisId],
  );

  const bronnen = await eenRij<{ n: number }>(
    c,
    "select count(distinct versie_id)::int as n from intel.gebeurtenis_documenten where gebeurtenis_id = $1",
    [gebeurtenisId],
  );

  const waarden = uitspraken
    .filter((u) => u.waarde_numeriek !== null)
    .map((u) => `${Number(u.waarde_numeriek)} ${u.eenheid ?? ""}`.trim());
  const datums = uitspraken
    .flatMap((u) => [
      u.geldig_vanaf ? `geldig vanaf ${u.geldig_vanaf}` : null,
      u.geldig_tot ? `geldig tot ${u.geldig_tot}` : null,
    ])
    .filter((d): d is string => d !== null);
  const bevestigd = uitspraken.filter((u) => u.verificatie_status === "bevestigd").length;

  const delen = [
    `Onderwerp ${onderwerp}.`,
    `${bronnen?.n ?? 0} bronwaarneming(en), ${uitspraken.length} uitspraak(en) waarvan ${bevestigd} bevestigd.`,
  ];
  if (waarden.length > 0) delen.push(`Vastgelegde waarden: ${[...new Set(waarden)].slice(0, 8).join("; ")}.`);
  if (datums.length > 0) delen.push(`Termijnen: ${[...new Set(datums)].slice(0, 4).join("; ")}.`);
  if (uitspraken.length === 0) {
    delen.push("Geen harde waarden gevonden; dit is voorlopig alleen een signaal.");
  }

  return kort(delen.join(" "), 1200);
}

async function verwerkVersie(
  c: pg.PoolClient,
  organisatieId: number,
  v: VersieRij,
): Promise<{
  onderwerp: Onderwerp | null;
  relevantieCategorie: Categorie;
  bedrijfsrelevantie: number;
  nieuw: boolean;
  uitsprakenAangemaakt: number;
  uitsprakenBevestigd: number;
  tegenspraak: boolean;
}> {
  /* R3 — EERST CLASSIFICEREN, DAN KIJKEN OF ER EEN ONDERWERP IS.
     ------------------------------------------------------------------
     De classificatie stond hier eerst verderop, na het aanmaken van de
     gebeurtenis. Een integratietoets ving dat: een versie zonder
     herkend onderwerp keert hieronder vroeg terug, dus die versies
     kregen NOOIT een documentsoort. Gemeten op de fixture
     'Bouw versnelt opnieuw' — geclassificeerd: niets.

     Dat is een gat met twee gevolgen. Het redactionele dashboard mist
     de helft van zijn documenten, en een herclassificatie na een
     versiebump zou diezelfde documenten blijven overslaan.

     De soort van een document hangt niet van zijn onderwerp af, dus hij
     hoort hier: boven elke vroege terugkeer. */
  const soortUitslag = classificeerVersie({
    versieId: v.versie_id,
    titel: v.titel,
    tekst: v.ruwe_tekst,
    canoniekeUrl: v.canonieke_url,
    bronSleutel: v.bron_sleutel,
    injectieVerdacht: v.injectie_verdacht,
  });
  await slaDocumentsoortOp(c, organisatieId, v.versie_id, soortUitslag);

  // Bij sitemapbronnen is de titel het laatste padsegment en is er geen
  // samenvatting: we halen immers geen artikelteksten op. Het pad zelf
  // draagt dan het signaal ('/over-ons/nieuws/2026/update-netcapaciteit').
  // Dat meenemen is gratis en deterministisch.
  const padWoorden = urlAlsWoorden(v.canonieke_url);
  const treffers = herkenOnderwerpen(v.titel, `${padWoorden} ${v.ruwe_tekst}`);
  const beste = treffers[0];
  if (!beste) {
    /* Geen enkel onderwerp herkend: er komt geen gebeurtenis, dus ook
       geen rij om relevantie op te schrijven. De uitslag wordt toch door
       de classificeerder bepaald in plaats van hier vastgelegd, zodat er
       een code pad is dat beslist wat 'niets herkend' betekent — en zodat
       die beslissing zijn reden meedraagt. */
    const geen = classificeer({
      titel: v.titel,
      tekst: v.ruwe_tekst,
      onderwerpen: [],
    });
    return {
      onderwerp: null,
      relevantieCategorie: geen.categorie,
      bedrijfsrelevantie: geen.bedrijfsrelevantie,
      nieuw: false,
      uitsprakenAangemaakt: 0,
      uitsprakenBevestigd: 0,
      tegenspraak: false,
    };
  }

  const cluster = await eenRij<{ id: number; risico_klasse: "laag" | "midden" | "hoog" }>(
    c,
    "select id, risico_klasse from intel.onderwerp_clusters where organisatie_id = $1 and sleutel = $2",
    [organisatieId, beste.onderwerp],
  );

  const sleutel = gebeurtenisSleutel(beste.onderwerp, v.titel, v.gepubliceerd_op);

  // Twee verschillende vragen, twee verschillende antwoorden:
  //
  //   WAT IS DIT?      -> de publicatievorm. Een aanbesteding over
  //                       zonnepanelen is een aanbesteding.
  //   WAAR GAAT HET OVER? -> het inhoudelijke onderwerp, en dus het
  //                       cluster en de bijbehorende Vibe-oplossing.
  //
  // Zonder dat onderscheid verdween 'Aanbesteding Zonnepanelen en
  // Energieopslag' uit de commerciele signalen, omdat zijn soort
  // 'techniek' werd in plaats van 'aanbesteding'.
  // De vorm komt uit de BRON, niet uit trefwoorden. Gemeten noodzaak:
  // de CPV-gefilterde TenderNed-titels heten 'Zonnepanelen en
  // Energieopslag' en bevatten het woord 'aanbesteding' nergens. Toch
  // IS het een aanbesteding — dat weet de bron, niet de tekst.
  const bron = bronOpSleutel(v.bron_sleutel);
  const vormUitBron =
    bron?.uitgeverSoort === "aanbestedingen"
      ? ("aanbesteding" as const)
      : treffers.find((t) => isProcedureel(t.onderwerp))?.onderwerp ?? null;
  const soort = vormUitBron
    ? gebeurtenisSoortVan(vormUitBron)
    : gebeurtenisSoortVan(beste.onderwerp);

  const gebeurtenis = await eenRij<{ id: number; is_nieuw: boolean }>(
    c,
    `insert into intel.markt_gebeurtenissen
       (organisatie_id, sleutel, titel, gebeurtenis_soort, gebeurd_op,
        onderwerp_cluster_id, risico_klasse, status)
     values ($1, $2, $3, $4, $5, $6, $7, 'nieuw')
     on conflict (organisatie_id, sleutel) do update set
       laatst_bijgewerkt_op = now(),
       status = case when intel.markt_gebeurtenissen.status = 'afgehandeld'
                     then 'verrijkt' else intel.markt_gebeurtenissen.status end
     returning id, (xmax = 0) as is_nieuw`,
    [
      organisatieId,
      sleutel,
      kort(v.titel, 500),
      soort,
      v.gepubliceerd_op,
      cluster?.id ?? null,
      cluster?.risico_klasse ?? "laag",
    ],
  );
  if (!gebeurtenis) throw new Error(`gebeurtenis niet geschreven voor versie ${v.versie_id}`);

  // Eerste waarneming is primair, latere bronnen zijn bevestigend.
  const alAanwezig = await eenRij<{ n: number }>(
    c,
    "select count(*)::int as n from intel.gebeurtenis_documenten where gebeurtenis_id = $1",
    [gebeurtenis.id],
  );
  const rol = (alAanwezig?.n ?? 0) === 0 ? "primair" : "bevestigend";

  await c.query(
    `insert into intel.gebeurtenis_documenten
       (organisatie_id, gebeurtenis_id, brondocument_id, versie_id, rol)
     values ($1, $2, $3, $4, $5)
     on conflict (gebeurtenis_id, versie_id) do nothing`,
    [organisatieId, gebeurtenis.id, v.brondocument_id, v.versie_id, rol],
  );

  /* De soort is bovenaan deze functie al vastgesteld en weggeschreven;
     hier wordt hij alleen doorgegeven. De classificatie hangt aan de
     VERSIE en niet aan het document: de tekst kan tussen versies
     veranderen en dan verandert de soort mee. intel.uitspraak_bronnen
     verwijst al naar versie_id, dus het oordeel hangt aan precies het
     stuk tekst waarop een claim rust. */
  const uitspraken = await schrijfUitspraken(c, organisatieId, {
    versieId: v.versie_id,
    gebeurtenisId: gebeurtenis.id,
    titel: v.titel,
    tekst: v.ruwe_tekst,
    onderwerp: beste.onderwerp,
    risicoKlasse: cluster?.risico_klasse ?? "laag",
    isPrimaireBron: v.is_primaire_bron,
    betrouwbaarheid: v.betrouwbaarheid,
    documentsoort: soortUitslag.soort,
    gezag: soortUitslag.gezag,
  });

  // Bronnen tellen, tegenspraak zoeken en materialiteit herberekenen.
  const telling = await eenRij<{ bronnen: number; uitspraken: number }>(
    c,
    `select (select count(distinct d.bron_id)::int
               from intel.gebeurtenis_documenten gd
               join intel.brondocumenten d on d.id = gd.brondocument_id
              where gd.gebeurtenis_id = $1) as bronnen,
            (select count(*)::int from intel.uitspraken where gebeurtenis_id = $1) as uitspraken`,
    [gebeurtenis.id],
  );

  const tegenspraak = await vindTegenspraak(c, gebeurtenis.id);
  const materialiteit = berekenMaterialiteit({
    betrouwbaarheid: v.betrouwbaarheid,
    isPrimaireBron: v.is_primaire_bron,
    aantalBronnen: telling?.bronnen ?? 1,
    aantalUitspraken: telling?.uitspraken ?? 0,
    gebeurdOp: v.gepubliceerd_op,
    onderwerpScore: beste.score,
  });

  const samenvatting = await bouwSamenvatting(c, gebeurtenis.id, beste.onderwerp);

  /* BEDRIJFSRELEVANTIE, naast materialiteit en niet erin.
     Materialiteit meet hoe zwaar een publicatie is; vijf van zijn zes
     assen beschrijven de bron en het bewijs. Relevantie meet of het ons
     aangaat. Ze in een getal persen gaf in productie een wetsvoorstel
     over maritieme handhaving (61) boven een echte aanbesteding (56).
     Zie src/pijplijn/relevantie.ts voor de meting. */
  const relevantie = classificeer({
    titel: v.titel,
    tekst: v.ruwe_tekst,
    onderwerpen: treffers,
    gebeurtenisSoort: soort,
    geverifieerdeUitspraken: telling?.uitspraken ?? 0,
  });

  await c.query(
    `update intel.markt_gebeurtenissen
        set aantal_bronnen          = $2,
            heeft_tegenspraak       = $3,
            materialiteit           = $4,
            materialiteit_grondslag = $5,
            samenvatting            = $6,
            relevantie_categorie    = $7,
            bedrijfsrelevantie      = $8,
            relevantie_vertrouwen   = $9,
            relevantie_grondslag    = $10,
            relevantie_op           = now(),
            status                  = case when status = 'nieuw' then 'verrijkt' else status end
      where id = $1`,
    [
      gebeurtenis.id,
      telling?.bronnen ?? 1,
      tegenspraak.tegenspraak,
      materialiteit.score,
      JSON.stringify({
        ...materialiteit.grondslag,
        onderwerp: beste.onderwerp,
        publicatievorm: vormUitBron,
        vorm_herkomst: bron?.uitgeverSoort === "aanbestedingen" ? "bron" : "trefwoord",
        alle_onderwerpen: treffers.map((t) => t.onderwerp),
        termen: beste.termen.slice(0, 10),
        tegenspraak: tegenspraak.details,
      }),
      samenvatting,
      relevantie.categorie,
      relevantie.bedrijfsrelevantie,
      relevantie.vertrouwen,
      /* De grondslag is niet optioneel: de constraint
         gebeurtenissen_relevantie_heeft_grondslag weigert een categorie
         zonder uitleg. Een score zonder reden is hier geen score. */
      JSON.stringify({ uitleg: relevantie.uitleg, ...relevantie.grondslag }),
    ],
  );

  return {
    onderwerp: beste.onderwerp,
    relevantieCategorie: relevantie.categorie,
    bedrijfsrelevantie: relevantie.bedrijfsrelevantie,
    nieuw: gebeurtenis.is_nieuw,
    uitsprakenAangemaakt: uitspraken.aangemaakt,
    uitsprakenBevestigd: uitspraken.bevestigd,
    tegenspraak: tegenspraak.tegenspraak,
  };
}

export async function clusterNieuweVersies(
  pool: Pool,
  organisatieId: number,
  opties: { max?: number } = {},
): Promise<ClusterRapport> {
  const max = opties.max ?? 500;

  const versies = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<VersieRij>(
      c,
      `select v.id            as versie_id,
              v.brondocument_id,
              v.titel,
              v.ruwe_tekst,
              d.gepubliceerd_op,
              d.canonieke_url,
              d.bron_id,
              b.sleutel       as bron_sleutel,
              b.uitgever,
              b.betrouwbaarheid,
              b.is_primaire_bron,
              v.injectie_verdacht
         from intel.brondocument_versies v
         join intel.brondocumenten d on d.id = v.brondocument_id
         join intel.bronnen b on b.id = d.bron_id
        where v.organisatie_id = $1
          and b.levert_gebeurtenissen
          and not exists (
            select 1 from intel.gebeurtenis_documenten gd where gd.versie_id = v.id
          )
        order by d.gepubliceerd_op desc nulls last, v.id desc
        limit $2`,
      [organisatieId, max],
    ),
  );

  let zonderOnderwerp = 0;
  let nieuw = 0;
  let verrijkt = 0;
  let uitsprakenAangemaakt = 0;
  let uitsprakenBevestigd = 0;
  let tegenspraken = 0;
  const perOnderwerp: Record<string, number> = {};

  for (const v of versies) {
    try {
      const r = await metOrganisatie(pool, { organisatieId }, (c) =>
        verwerkVersie(c, organisatieId, v),
      );
      if (!r.onderwerp) {
        zonderOnderwerp += 1;
        continue;
      }
      if (r.nieuw) nieuw += 1;
      else verrijkt += 1;
      uitsprakenAangemaakt += r.uitsprakenAangemaakt;
      uitsprakenBevestigd += r.uitsprakenBevestigd;
      if (r.tegenspraak) tegenspraken += 1;
      perOnderwerp[r.onderwerp] = (perOnderwerp[r.onderwerp] ?? 0) + 1;
    } catch (e) {
      log.fout("clusteren van een versie mislukt", {
        versie_id: v.versie_id,
        bron: v.bron_sleutel,
        fout: e,
      });
    }
  }

  return {
    versiesBekeken: versies.length,
    zonderOnderwerp,
    gebeurtenissenNieuw: nieuw,
    gebeurtenissenVerrijkt: verrijkt,
    uitsprakenAangemaakt,
    uitsprakenBevestigd,
    tegenspraken,
    perOnderwerp,
  };
}
