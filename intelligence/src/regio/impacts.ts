/* ============================================================
   REGIO — gebeurtenissen aan gebieden binden, en voorstellen maken
   ------------------------------------------------------------
   Twee stappen, en de tweede is met opzet tandeloos.

   STAP 1 — BINDEN. Elke gebeurtenis krijgt de gebieden waarover hij
   gaat, met een grondslag en bewijs per binding
   (intel.gebeurtenis_geo). Zie src/regio/gebieden.ts voor waarom dat
   geen opzoekactie is.

   STAP 2 — VOORSTELLEN. Per (gebeurtenis, gebied, impactsoort) komt er
   een rij in intel.regio_impacts met status 'voorstel'. Dat is een
   ADVIES over waar aandacht naartoe kan, en nadrukkelijk geen
   publicatie:

   · `release1_gereed` wordt GELEZEN uit data/seo/routes.json en nooit
     geschreven. Of een regioroute publicatiegereed is, beslist de
     toestandsmachine van Release 1 op lokaal bewijs — 16 regionale
     routes staan op INDEX, 4.587 op PENDING. Een marktgebeurtenis is
     geen lokaal bewijs en mag die poort niet openzetten.
   · `voorgestelde_patch` is jsonb in de database. Er wordt NIETS naar
     data/inhoud/ geschreven: die regiobestanden zijn van de redactie
     van Release 1, en SCHEMA.md eist één schrijver per bestand.
   · `status` blijft 'voorstel'. Er is geen code die hem op
     'toegepast' zet; dat is een menselijke handeling in het dashboard.

   DE HARDE GRENS DIE DE DATABASE ZELF TREKT
   `regio_impacts_netclaim_vereist_bronbewijs` verbiedt een impact van
   soort 'netcapaciteit' met grondslag 'afgeleid'. Een uitspraak over
   netcapaciteit in een gebied moet dus uit de bron komen of uit een
   expliciete code — niet uit "het ligt in het gebied van deze
   netbeheerder, dus geldt het ook hier".
   ============================================================ */

import type pg from "pg";
import { configLezen } from "../kern/config.ts";
import { eenRij, metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import {
  herkenGebieden,
  impactSoortVan,
  type GebiedIndex,
  type GeoTreffer,
} from "./gebieden.ts";
import { leesRouteStaten, routeVoorGebied, type RouteStatenUitkomst } from "../site/routeregister.ts";

const log = maakLogger("regio");

export type RegioRapport = {
  readonly gebeurtenissenBekeken: number;
  readonly gebiedenGebonden: number;
  readonly bindingenAfgewezen: number;
  readonly impactsNieuw: number;
  readonly impactsOvergeslagen: number;
  readonly perSoort: Readonly<Record<string, number>>;
  readonly gereedVolgensRelease1: number;
  readonly pendingVolgensRelease1: number;
  readonly zonderRoute: number;
  readonly routeregister: string;
};

async function laadIndex(c: pg.PoolClient): Promise<GebiedIndex> {
  const alle = await rijen<{ soort: string; code: string; naam: string }>(
    c,
    "select soort, code, naam from intel.geo_bereiken order by soort, code",
  );
  return {
    gemeenten: alle.filter((g) => g.soort === "gemeente").map((g) => ({ soort: "gemeente", code: g.code, naam: g.naam })),
    provincies: alle.filter((g) => g.soort === "provincie").map((g) => ({ soort: "provincie", code: g.code, naam: g.naam })),
    netbeheerders: alle
      .filter((g) => g.soort === "netbeheerdergebied")
      .map((g) => ({ soort: "netbeheerdergebied", code: g.code, naam: g.naam })),
  };
}

function patchVoorstel(
  gebeurtenis: { id: number; titel: string },
  treffer: GeoTreffer,
  impactSoort: string,
  route: { route: string; staat: string } | null,
): Record<string, unknown> {
  return {
    _toelichting:
      "VOORSTEL. Niet toegepast en niet naar schijf geschreven. De regiobestanden onder " +
      "data/ zijn van Release 1; een mens brengt dit over als hij het eens is.",
    gebeurtenis_id: gebeurtenis.id,
    aanleiding: gebeurtenis.titel,
    impact_soort: impactSoort,
    gebied: { soort: treffer.soort, code: treffer.code, naam: treffer.naam },
    doelroute: route?.route ?? null,
    doelroute_staat: route?.staat ?? "geen route in het register van Release 1",
    advies:
      route === null
        ? "Geen regioroute voor dit gebied. Dit is een signaal over prioriteit, geen voorstel voor een nieuwe URL."
        : route.staat === "INDEX"
          ? `De route ${route.route} is gepubliceerd. Overweeg de bestaande pagina bij te werken; geen nieuwe URL.`
          : `De route ${route.route} staat op ${route.staat}. Publiceren vraagt lokaal bewijs volgens Release 1, niet een marktgebeurtenis.`,
  };
}

/**
 * Bindt gebeurtenissen aan gebieden en maakt regio-impactvoorstellen.
 * Idempotent: bestaande bindingen en impacts worden niet gedupliceerd.
 */
export async function bouwRegioImpacts(
  pool: Pool,
  organisatieId: number,
  opties: { droog?: boolean; alles?: boolean } = {},
): Promise<RegioRapport> {
  const config = configLezen();
  const staten: RouteStatenUitkomst = await leesRouteStaten(config.siteWortel);

  return metOrganisatie(pool, { organisatieId }, async (c) => {
    const index = await laadIndex(c);

    /* Gebeurtenissen die nog geen geobinding hebben, tenzij --alles.
       De invoer voor gebiedsherkenning is de titel en de ruwe tekst van
       het BRONDOCUMENT, niet g.samenvatting: die laatste is door dit
       platform zelf gegenereerd en bevat per definitie geen plaatsnaam.
       De ruwe tekst wordt afgekapt omdat een gemeentenaam die pas in de
       voettekst van een nieuwsbrief voorkomt niets zegt over het
       onderwerp van het bericht. */
    const gebeurtenissen = await rijen<{
      id: number;
      titel: string;
      bron_titel: string | null;
      bron_tekst: string | null;
      onderwerp: string | null;
    }>(
      c,
      `select g.id,
              g.titel,
              bv.titel                     as bron_titel,
              left(bv.ruwe_tekst, 4000)    as bron_tekst,
              oc.sleutel                   as onderwerp
         from intel.markt_gebeurtenissen g
         left join intel.onderwerp_clusters oc on oc.id = g.onderwerp_cluster_id
         left join lateral (
                select bv2.titel, bv2.ruwe_tekst
                  from intel.gebeurtenis_documenten gd
                  join intel.brondocument_versies bv2 on bv2.id = gd.versie_id
                 where gd.gebeurtenis_id = g.id and gd.rol = 'primair'
                 order by gd.toegevoegd_op
                 limit 1
              ) bv on true
        where g.organisatie_id = $1
          and g.status <> 'afgewezen'
          ${opties.alles ? "" : "and not exists (select 1 from intel.gebeurtenis_geo gg where gg.gebeurtenis_id = g.id)"}
        order by g.id`,
      [organisatieId],
    );

    let gebonden = 0;
    let afgewezen = 0;
    let impactsNieuw = 0;
    let impactsOver = 0;
    let gereed = 0;
    let pending = 0;
    let zonderRoute = 0;
    const perSoort: Record<string, number> = {};

    for (const g of gebeurtenissen) {
      const uit = herkenGebieden(g.bron_titel ?? g.titel, g.bron_tekst ?? "", index);
      afgewezen += uit.afwijzingen.length;

      for (const t of uit.treffers) {
        // intel.geo_bereiken is een GEDEELDE referentietabel zonder
        // organisatie_id: de CBS-indeling van Nederland is niet van een
        // tenant. Hier dus geen organisatiefilter.
        const gebied = await eenRij<{ id: number }>(
          c,
          "select id from intel.geo_bereiken where soort = $1 and code = $2",
          [t.soort, t.code],
        );
        if (!gebied) continue;

        if (!opties.droog) {
          await c.query(
            `insert into intel.gebeurtenis_geo
               (organisatie_id, gebeurtenis_id, geo_bereik_id, grondslag, bewijs)
             values ($1,$2,$3,$4,$5)
             on conflict (gebeurtenis_id, geo_bereik_id) do nothing`,
            [organisatieId, g.id, gebied.id, t.grondslag, t.bewijs],
          );
        }
        gebonden += 1;

        const impactSoort = impactSoortVan(g.onderwerp);
        if (impactSoort === null) {
          impactsOver += 1;
          continue;
        }

        // De databaseconstraint weigert dit ook, maar een nette reden
        // hier is beter dan een 23514 uit de diepte.
        if (impactSoort === "netcapaciteit" && t.grondslag === "afgeleid") {
          impactsOver += 1;
          continue;
        }

        const route = routeVoorGebied(staten, t.soort, t.code);
        if (route === null) zonderRoute += 1;
        else if (route.staat === "INDEX") gereed += 1;
        else pending += 1;

        if (!opties.droog) {
          const ingevoegd = await eenRij<{ id: number }>(
            c,
            `insert into intel.regio_impacts
               (organisatie_id, gebeurtenis_id, geo_bereik_id, impact_soort,
                grondslag, bewijs, voorgestelde_patch, samenvatting,
                status, release1_gereed)
             values ($1,$2,$3,$4,$5,$6,$7,$8,'voorstel',$9)
             on conflict (gebeurtenis_id, geo_bereik_id, impact_soort) do nothing
             returning id`,
            [
              organisatieId,
              g.id,
              gebied.id,
              impactSoort,
              t.grondslag,
              t.bewijs,
              JSON.stringify(patchVoorstel(g, t, impactSoort, route)),
              `${g.titel} — ${t.naam}`,
              route?.staat === "INDEX",
            ],
          );
          if (ingevoegd) {
            impactsNieuw += 1;
            perSoort[impactSoort] = (perSoort[impactSoort] ?? 0) + 1;
          }
        } else {
          impactsNieuw += 1;
          perSoort[impactSoort] = (perSoort[impactSoort] ?? 0) + 1;
        }
      }
    }

    log.info("regio-impacts gebouwd", {
      gebeurtenissen: gebeurtenissen.length,
      gebonden,
      impactsNieuw,
      droog: opties.droog ?? false,
    });

    return {
      gebeurtenissenBekeken: gebeurtenissen.length,
      gebiedenGebonden: gebonden,
      bindingenAfgewezen: afgewezen,
      impactsNieuw,
      impactsOvergeslagen: impactsOver,
      perSoort,
      gereedVolgensRelease1: gereed,
      pendingVolgensRelease1: pending,
      zonderRoute,
      routeregister: staten.aanwezig ? staten.reden : `NIET GELEZEN — ${staten.reden}`,
    };
  });
}

export type RegioAdvies = {
  readonly route: string | null;
  readonly gebied: string;
  readonly soort: string;
  readonly staatVolgensRelease1: string;
  readonly impacts: number;
  readonly materialiteit: number;
  readonly voorbeeld: string;
};

/**
 * Prioriteitsadvies: welke gebieden hebben de meeste en zwaarste
 * marktbeweging? Puur een rangschikking om aandacht te richten. Deze
 * functie publiceert niets en kan dat ook niet — ze doet alleen een
 * select.
 */
export async function regioAdvies(
  pool: Pool,
  organisatieId: number,
  limiet = 20,
): Promise<readonly RegioAdvies[]> {
  const config = configLezen();
  const staten = await leesRouteStaten(config.siteWortel);

  return metOrganisatie(pool, { organisatieId }, async (c) => {
    const r = await rijen<{
      soort: string;
      code: string;
      naam: string;
      impacts: number;
      materialiteit: number;
      voorbeeld: string;
    }>(
      c,
      `select gb.soort, gb.code, gb.naam,
              count(ri.id)::int                       as impacts,
              coalesce(max(g.materialiteit), 0)::int  as materialiteit,
              (array_agg(g.titel order by g.materialiteit desc))[1] as voorbeeld
         from intel.regio_impacts ri
         join intel.geo_bereiken gb on gb.id = ri.geo_bereik_id
         join intel.markt_gebeurtenissen g on g.id = ri.gebeurtenis_id
        where ri.organisatie_id = $1
        group by gb.soort, gb.code, gb.naam
        order by count(ri.id) desc, max(g.materialiteit) desc, gb.naam
        limit $2`,
      [organisatieId, limiet],
    );

    return r.map((x) => {
      const route = routeVoorGebied(staten, x.soort as "gemeente" | "provincie", x.code);
      return {
        route: route?.route ?? null,
        gebied: x.naam,
        soort: x.soort,
        staatVolgensRelease1: route?.staat ?? "geen route",
        impacts: x.impacts,
        materialiteit: x.materialiteit,
        voorbeeld: x.voorbeeld,
      };
    });
  });
}
