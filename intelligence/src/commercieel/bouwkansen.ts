/* ============================================================
   KANSEN BOUWEN — van geclassificeerde gebeurtenissen naar dossiers
   ------------------------------------------------------------
   DE KETEN

     markt_gebeurtenissen (relevantie_categorie = 'commerciele_kans')
       -> publicaties per gebeurtenis, met hun `extra` uit de bron
       -> groepeer() op kenmerk            -> ÉÉN rij per aanbesteding
       -> kwalificeer()                    -> fase, scores, ontbrekend
       -> schrijfKansen()                  -> intel.kansen

   WAAROM DE FILTER OP `commerciele_kans` STAAT EN NIET OP SOORT

   Op gebeurtenis_soort filteren gaf in productie een gegunde opdracht
   als openstaande kans, en een wetsvoorstel over maritieme handhaving
   boven een echte aanbesteding. De categorie uit relevantie.ts is de as
   die 'gaat dit ons aan' meet; die hoort hier de poort te zijn.

   WAT ER NIET WEGGEGOOID WORDT

   Een gegunde aanbesteding (AGO) komt hier WEL door de poort en wordt
   WEL een kans — met fase 'gegund' en status GEARCHIVEERD. Dat is
   bewust: §11 verbiedt informatie weggooien omdat ze niet direct
   commercieel is. Een gunning is marktinformatie (wie won, tegen welke
   uitvraag) en hoort bewaard, alleen niet in de werkvoorraad.
   ============================================================ */

import { metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { herkenOnderwerpen } from "../pijplijn/onderwerpen.ts";
import { classificeer } from "../pijplijn/relevantie.ts";
import { groepeer, kwalificeer, type Kans, type Publicatie } from "./kansen.ts";
import { schrijfKansen, type OpslagUitslag } from "./kansenopslag.ts";

const log = maakLogger("bouwkansen");

/** Welke Vibe-oplossingen een onderwerp raakt. Dit is interpretatie. */
const OPLOSSINGEN: Readonly<Record<string, readonly string[]>> = {
  bess: ["batterijopslag", "energiemanagement"],
  ems: ["energiemanagement"],
  netcongestie: ["batterijopslag", "netaansluiting", "energiemanagement"],
  flexibiliteit: ["batterijopslag", "energiemanagement"],
  laadinfrastructuur: ["laadinfrastructuur"],
  "zonne-energie": ["zonnestroom"],
  netbeheer: ["netaansluiting"],
};

type PublicatieRij = {
  gebeurtenis_id: number;
  brondocument_id: number;
  url: string;
  titel: string;
  gepubliceerd_op: string | null;
  uitgever: string | null;
  tekst_lengte: number;
  tekst: string | null;
  extra: Record<string, unknown> | null;
  opdrachtgever: string | null;
  gebeurtenis_soort: string;
  bedrijfsrelevantie: number;
  mag_citeren: boolean;
};

export type BouwRapport = {
  readonly publicaties: number;
  readonly kansen: number;
  readonly opslag: OpslagUitslag;
  readonly perFase: Readonly<Record<string, number>>;
};

/**
 * Bouwt kansen uit de geclassificeerde gebeurtenissen.
 *
 * `vandaag` gaat expliciet mee zodat een toets niet aan de klok hangt.
 */
export async function bouwKansen(
  pool: Pool,
  organisatieId: number,
  opties: { vandaag: string; max?: number },
): Promise<BouwRapport> {
  const max = opties.max ?? 500;

  const publicaties = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<PublicatieRij>(
      c,
      `select g.id                   as gebeurtenis_id,
              d.id                   as brondocument_id,
              d.canonieke_url        as url,
              d.titel,
              d.gepubliceerd_op::text as gepubliceerd_op,
              d.uitgever,
              coalesce(length(v.ruwe_tekst), 0) as tekst_lengte,
              v.ruwe_tekst           as tekst,
              d.extra,
              d.extra->>'opdrachtgeverNaam' as opdrachtgever,
              g.gebeurtenis_soort,
              g.bedrijfsrelevantie,
              b.mag_citeren
         from intel.markt_gebeurtenissen g
         join intel.gebeurtenis_documenten gd on gd.gebeurtenis_id = g.id
         join intel.brondocumenten d on d.id = gd.brondocument_id
         join intel.bronnen b on b.id = d.bron_id
         -- De langste versie van dit document: een rectificatie kan
         -- korter zijn dan de oorspronkelijke aankondiging.
         left join intel.brondocument_versies v
                on v.id = (select v2.id from intel.brondocument_versies v2
                            where v2.brondocument_id = d.id
                            order by length(coalesce(v2.ruwe_tekst,'')) desc, v2.versie desc
                            limit 1)
        where g.organisatie_id = $1
          and g.relevantie_categorie = 'commerciele_kans'
        order by g.bedrijfsrelevantie desc, d.gepubliceerd_op desc nulls last
        limit $2`,
      [organisatieId, max],
    ),
  );

  /* Een gebeurtenis kan meer dan één brondocument hebben (twee uitgevers
     die hetzelfde melden). Per URL één publicatie: de URL is de
     identiteit van een publicatie, zoals 0011 vastlegt. */
  const perUrl = new Map<string, PublicatieRij>();
  for (const r of publicaties) {
    const bestaand = perUrl.get(r.url);
    if (!bestaand || r.tekst_lengte > bestaand.tekst_lengte) perUrl.set(r.url, r);
  }

  const rijenVoorGroepering = [...perUrl.values()].map((r) => ({
    opdrachtgever: (r.opdrachtgever ?? r.uitgever ?? "Onbekende opdrachtgever").trim(),
    publicatie: {
      gebeurtenisId: r.gebeurtenis_id,
      brondocumentId: r.brondocument_id,
      url: r.url,
      titel: r.titel,
      gepubliceerdOp: r.gepubliceerd_op,
      uitgever: r.uitgever,
      tekstLengte: r.tekst_lengte,
      /* De brontekst gaat mee om FEITEN uit te halen, niet om weer te
         geven. Of hij geciteerd mag worden bepaalt src/bronnen/citaat.ts
         op het moment van weergeven; hier is hij invoer voor extractie. */
      ...(r.tekst ? { tekst: r.tekst } : {}),
      extra: r.extra,
    } satisfies Publicatie,
  }));

  const groepen = groepeer(rijenVoorGroepering);
  const kansen: Kans[] = [];
  const perFase: Record<string, number> = {};

  for (const g of groepen) {
    /* De nieuwste publicatie geeft de titel: een rectificatie kan de
       naam van de aanbesteding hebben aangepast. */
    const nieuwste = g.publicaties[g.publicaties.length - 1]!;
    const tekst = g.publicaties.map((p) => p.tekst ?? "").join("\n");
    const onderwerpen = herkenOnderwerpen(nieuwste.titel, tekst);
    const relevantie = classificeer({
      titel: nieuwste.titel,
      tekst,
      onderwerpen,
      gebeurtenisSoort: "aanbesteding",
    });

    const oplossingen = [
      ...new Set(onderwerpen.flatMap((t) => OPLOSSINGEN[t.onderwerp] ?? [])),
    ];

    const kans = kwalificeer({
      opdrachtgever: g.opdrachtgever,
      publicaties: g.publicaties,
      relevantie,
      relevanteOplossingen: oplossingen,
      vandaag: opties.vandaag,
      identiteit: g.identiteit,
      identiteitGrondslag: g.identiteitGrondslag,
    });
    kansen.push(kans);
    perFase[kans.fase] = (perFase[kans.fase] ?? 0) + 1;
  }

  log.info("kansen gebouwd", {
    publicaties: perUrl.size,
    kansen: kansen.length,
    perFase,
  });

  const opslag = await schrijfKansen(pool, organisatieId, kansen);
  return { publicaties: perUrl.size, kansen: kansen.length, opslag, perFase };
}
