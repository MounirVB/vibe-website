/* ============================================================
   DB — zaaien
   ------------------------------------------------------------
   Vult de referentielagen die het platform nodig heeft voordat er
   iets opgehaald kan worden: de organisatie, het pagina-register uit
   een scan van de echte site, de onderwerpclusters met hun
   risicoklasse, het publicatiebeleid (propose-only), de
   kostenplafonds, de koppelingenstatus en de gemeten toestand van
   elke bron uit het coderegister.

   Idempotent: elke stap is een upsert. Twee keer zaaien verandert
   niets en overschrijft geen handmatige keuzes die later in het
   dashboard gemaakt zijn — behalve de gemeten bronvelden, want die
   horen het coderegister te volgen.
   ============================================================ */

import type pg from "pg";
import { configLezen, KOPPELING_ENV, ontbrekendeEnv } from "../kern/config.ts";
import {
  eenRij,
  maakPool,
  metOrganisatie,
  rijen,
  zonderOrganisatie,
  type Pool,
} from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { BRONNEN } from "../bronnen/register.ts";
import { scanSite, type ScanUitkomst } from "../site/paginascan.ts";

const log = maakLogger("zaai");

/**
 * Onderwerpclusters. De risicoklasse is geen smaak: ze bepaalt of
 * inhoud over dit onderwerp ooit automatisch gepubliceerd kan worden.
 * Subsidie, netcapaciteit, rendement, batterijveiligheid en
 * regelgeving staan daarom op hoog — die vragen altijd een mens.
 */
export const CLUSTERS: readonly {
  sleutel: string;
  naam: string;
  omschrijving: string;
  risico: "laag" | "midden" | "hoog";
  /** Voorkeurspagina; wordt alleen gezet als die echt bestaat. */
  paginaKandidaten: readonly string[];
}[] = [
  {
    sleutel: "netcongestie",
    naam: "Netcongestie en transportcapaciteit",
    omschrijving:
      "Beschikbare transportcapaciteit, congestiegebieden, wachtrijen en congestiemanagement.",
    risico: "hoog",
    paginaKandidaten: ["/oplossing-netcongestie", "/netcongestie-check", "/microgrids"],
  },
  {
    sleutel: "bess",
    naam: "Batterijopslag voor bedrijven",
    omschrijving: "Vermogen- en energiedimensionering, peak shaving, handel en levensduur.",
    risico: "midden",
    paginaKandidaten: ["/systeem-energieopslag"],
  },
  {
    sleutel: "batterijveiligheid",
    naam: "Batterijveiligheid en normen",
    omschrijving: "Brandveiligheid, opstelling, normen en vergunningseisen rond opslag.",
    risico: "hoog",
    paginaKandidaten: ["/systeem-energieopslag"],
  },
  {
    sleutel: "ems",
    naam: "Energiemanagement",
    omschrijving: "Sturing, meting, load balancing en optimalisatie achter de meter.",
    risico: "midden",
    paginaKandidaten: ["/vibe-control", "/systeem-ems"],
  },
  {
    sleutel: "laadinfrastructuur",
    naam: "Laadinfrastructuur",
    omschrijving: "Laadpleinen, laadvermogen, exploitatie en netimpact van laden.",
    risico: "midden",
    paginaKandidaten: ["/oplossing-laadplein", "/systeem-laadpalen"],
  },
  {
    sleutel: "zonne-energie",
    naam: "Zonnestroom voor bedrijven",
    omschrijving: "Opbrengst, curtailment, terugleverbeperking en dakgebonden opwek.",
    risico: "laag",
    paginaKandidaten: ["/systeem-zonnepanelen"],
  },
  {
    sleutel: "subsidie",
    naam: "Subsidies en fiscale regelingen",
    omschrijving: "SDE++, EIA, MIA/Vamil, SCE, ISDE: voorwaarden, bedragen en termijnen.",
    risico: "hoog",
    paginaKandidaten: ["/oplossing-subsidies"],
  },
  {
    sleutel: "regelgeving",
    naam: "Regelgeving en toezicht",
    omschrijving: "Energiewet, netcodes, tariefbesluiten en toezichthouderbesluiten.",
    risico: "hoog",
    paginaKandidaten: [],
  },
  {
    sleutel: "rendement",
    naam: "Businesscase en rendement",
    omschrijving: "Terugverdientijd, kasstromen en aannames achter een businesscase.",
    risico: "hoog",
    paginaKandidaten: ["/oplossing-exploitatie", "/exploitatie-zonder-investering"],
  },
  {
    sleutel: "marktprijs",
    naam: "Marktprijzen en flexwaarde",
    omschrijving: "Day-ahead prijzen, onbalans, spreiding en de waarde van flexibiliteit.",
    risico: "midden",
    paginaKandidaten: ["/energiehandel-flexmarkten"],
  },
  {
    sleutel: "vastgoedverduurzaming",
    naam: "Verduurzaming van bedrijfsvastgoed",
    omschrijving: "Energielabel, Paris Proof, en energie als vastgoedopbrengst.",
    risico: "midden",
    paginaKandidaten: ["/oplossing-energielabel", "/oplossing-paris-proof"],
  },
  {
    sleutel: "aanbesteding",
    naam: "Aanbestedingen",
    omschrijving: "Publieke uitvragen voor opslag, opwek en laadinfrastructuur.",
    risico: "laag",
    paginaKandidaten: [],
  },
  {
    sleutel: "vergunning",
    naam: "Vergunningen en ruimtelijke besluiten",
    omschrijving: "Omgevingsvergunningen en ruimtelijke plannen rond energieprojecten.",
    risico: "laag",
    paginaKandidaten: [],
  },
  {
    sleutel: "netbeheer",
    naam: "Netbeheer",
    omschrijving: "Investeringsplannen, nettarieven en werkzaamheden van netbeheerders.",
    risico: "midden",
    paginaKandidaten: ["/oplossing-netcongestie"],
  },
  {
    sleutel: "statistiek",
    naam: "Energiestatistiek",
    omschrijving: "Landelijke en regionale cijfers over opwek, verbruik en prijzen.",
    risico: "laag",
    paginaKandidaten: [],
  },
];

export type ZaaiRapport = {
  readonly organisatieId: number;
  readonly paginasGescand: number;
  readonly paginasGeschreven: number;
  readonly sitemapZonderBestand: readonly string[];
  readonly indexeerbaarZonderSitemap: readonly string[];
  readonly clustersGeschreven: number;
  readonly clustersZonderPagina: readonly string[];
  readonly bronnenGeschreven: number;
  readonly bronnenActief: number;
  readonly koppelingen: readonly { sleutel: string; status: string; ontbrekend: string[] }[];
  readonly beleidVersie: string;
};

export async function zaai(pool: Pool, opties: { siteWortel?: string } = {}): Promise<ZaaiRapport> {
  const config = configLezen();
  const siteWortel = opties.siteWortel ?? config.siteWortel;

  // 1. Organisatie aanmaken is beheerwerk, geen applicatiewerk. De
  //    applicatierol heeft bewust alleen SELECT op intel.organisaties —
  //    anders zou een tenant tenants kunnen aanmaken. Deze ene stap
  //    loopt daarom zonder SET ROLE, als eigenaar; al het overige werk
  //    hieronder gaat wel door de applicatierol en dus door RLS.
  const beheerPool = maakPool({ rol: null });
  const organisatieId = await zonderOrganisatie(beheerPool, async (c) => {
    const bestaand = await eenRij<{ id: number }>(
      c,
      "select id from intel.organisaties where sleutel = $1",
      [config.organisatieSleutel],
    );
    if (bestaand) return bestaand.id;
    const nieuw = await eenRij<{ id: number }>(
      c,
      `insert into intel.organisaties (sleutel, naam, website_host)
       values ($1, $2, $3)
       on conflict (sleutel) do update set naam = excluded.naam
       returning id`,
      [config.organisatieSleutel, "Vibe Energy", new URL(config.siteBasisUrl).host],
    );
    if (!nieuw) throw new Error("organisatie kon niet aangemaakt worden");
    return nieuw.id;
  });

  const scan = await scanSite(siteWortel);

  return metOrganisatie(pool, { organisatieId }, async (c) => {
    const paginasGeschreven = await zaaiPaginas(c, organisatieId, scan, config.siteBasisUrl);
    const { geschreven: clustersGeschreven, zonderPagina } = await zaaiClusters(
      c,
      organisatieId,
      scan,
    );
    const { geschreven: bronnenGeschreven, actief } = await zaaiBronnen(c, organisatieId);
    const beleidVersie = await zaaiBeleid(c, organisatieId);
    await zaaiKostenplafond(c, organisatieId);
    const koppelingen = await zaaiKoppelingen(c, organisatieId);

    log.info("zaaien gereed", {
      organisatieId,
      paginas: paginasGeschreven,
      clusters: clustersGeschreven,
      bronnen: bronnenGeschreven,
    });

    return {
      organisatieId,
      paginasGescand: scan.paginas.length,
      paginasGeschreven,
      sitemapZonderBestand: scan.sitemapZonderBestand,
      indexeerbaarZonderSitemap: scan.indexeerbaarZonderSitemap,
      clustersGeschreven,
      clustersZonderPagina: zonderPagina,
      bronnenGeschreven,
      bronnenActief: actief,
      koppelingen,
      beleidVersie,
    };
  });
}

async function zaaiPaginas(
  c: pg.PoolClient,
  organisatieId: number,
  scan: ScanUitkomst,
  basisUrl: string,
): Promise<number> {
  let geschreven = 0;
  for (const p of scan.paginas) {
    await c.query(
      `insert into intel.pagina_register
         (organisatie_id, pad, canonieke_url, bestandspad, titel, soort,
          in_sitemap, bestaat_in_repo, eigenaar_release, beheer)
       values ($1, $2, $3, $4, $5, $6, $7, true, 'release1', 'handmatig')
       on conflict (organisatie_id, pad) do update set
         canonieke_url   = excluded.canonieke_url,
         bestandspad     = excluded.bestandspad,
         titel           = excluded.titel,
         soort           = excluded.soort,
         in_sitemap      = excluded.in_sitemap,
         bestaat_in_repo = true`,
      [
        organisatieId,
        p.pad,
        p.canoniek ?? `${basisUrl}${p.pad === "/" ? "" : p.pad}`,
        p.bestandsnaam,
        p.titel,
        p.soort,
        p.inSitemap,
      ],
    );
    geschreven += 1;
  }

  // Pagina's die eerder gescand zijn maar nu van schijf verdwenen zijn
  // blijven staan met bestaat_in_repo=false; stil verwijderen zou een
  // publicatiegeschiedenis wegpoetsen.
  const padenNu = scan.paginas.map((p) => p.pad);
  await c.query(
    `update intel.pagina_register
        set bestaat_in_repo = false
      where organisatie_id = $1
        and bestaat_in_repo
        and not (pad = any($2::text[]))`,
    [organisatieId, padenNu],
  );

  return geschreven;
}

async function zaaiClusters(
  c: pg.PoolClient,
  organisatieId: number,
  scan: ScanUitkomst,
): Promise<{ geschreven: number; zonderPagina: string[] }> {
  const bestaandePaden = new Set(
    scan.paginas.filter((p) => !p.isRedirectStub && p.indexeerbaar).map((p) => p.pad),
  );
  let geschreven = 0;
  const zonderPagina: string[] = [];

  for (const cluster of CLUSTERS) {
    // Alleen een canonieke pagina zetten die er echt is en die
    // indexeerbaar is. Een redirect-stub is geen eigenaar.
    const pagina = cluster.paginaKandidaten.find((p) => bestaandePaden.has(p)) ?? null;
    if (!pagina) zonderPagina.push(cluster.sleutel);

    await c.query(
      `insert into intel.onderwerp_clusters
         (organisatie_id, sleutel, naam, omschrijving, canonieke_pagina, risico_klasse)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (organisatie_id, sleutel) do update set
         naam             = excluded.naam,
         omschrijving     = excluded.omschrijving,
         canonieke_pagina = excluded.canonieke_pagina,
         risico_klasse    = excluded.risico_klasse`,
      [organisatieId, cluster.sleutel, cluster.naam, cluster.omschrijving, pagina, cluster.risico],
    );
    geschreven += 1;
  }
  return { geschreven, zonderPagina };
}

/**
 * Synchroniseert het coderegister naar intel.bronnen. De database
 * draagt alleen de GEMETEN toestand plus de beoordeling uit code; de
 * ophaalgeschiedenis (etag, laatst_opgehaald_op, fouten) blijft staan.
 */
async function zaaiBronnen(
  c: pg.PoolClient,
  organisatieId: number,
): Promise<{ geschreven: number; actief: number }> {
  let geschreven = 0;
  for (const b of BRONNEN) {
    await c.query(
      `insert into intel.bronnen
         (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
          betrouwbaarheid, is_primaire_bron, licentie, licentie_url, robots_status,
          robots_gecontroleerd_op, mag_citeren, citaat_limiet_tekens,
          verificatie_status, verificatie_bewijs, verificatie_op,
          ophaalinterval_minuten, min_interval_seconden, max_items_per_ophaling,
          geo_bereik, onderwerpen, config, tdm_status, toegestane_hosts, max_bytes,
          levert_gebeurtenissen)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
               $19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
       on conflict (organisatie_id, sleutel) do update set
         uitgever                = excluded.uitgever,
         soort                   = excluded.soort,
         endpoint_url            = excluded.endpoint_url,
         basis_url               = excluded.basis_url,
         actief                  = excluded.actief,
         betrouwbaarheid         = excluded.betrouwbaarheid,
         is_primaire_bron        = excluded.is_primaire_bron,
         licentie                = excluded.licentie,
         licentie_url            = excluded.licentie_url,
         robots_status           = excluded.robots_status,
         robots_gecontroleerd_op = excluded.robots_gecontroleerd_op,
         mag_citeren             = excluded.mag_citeren,
         citaat_limiet_tekens    = excluded.citaat_limiet_tekens,
         verificatie_status      = excluded.verificatie_status,
         verificatie_bewijs      = excluded.verificatie_bewijs,
         verificatie_op          = excluded.verificatie_op,
         ophaalinterval_minuten  = excluded.ophaalinterval_minuten,
         min_interval_seconden   = excluded.min_interval_seconden,
         max_items_per_ophaling  = excluded.max_items_per_ophaling,
         geo_bereik              = excluded.geo_bereik,
         onderwerpen             = excluded.onderwerpen,
         config                  = excluded.config,
         tdm_status              = excluded.tdm_status,
         toegestane_hosts        = excluded.toegestane_hosts,
         max_bytes               = excluded.max_bytes,
         levert_gebeurtenissen   = excluded.levert_gebeurtenissen`,
      [
        organisatieId,
        b.sleutel,
        b.uitgever,
        b.soort,
        b.endpointUrl,
        b.basisUrl,
        b.actief,
        b.betrouwbaarheid,
        b.isPrimaireBron,
        b.licentie ?? b.hergebruikVerklaring,
        b.licentieUrl,
        b.robotsStatus,
        b.verificatie.op,
        b.magCiteren,
        b.citaatLimietTekens,
        b.verificatie.status,
        `${b.verificatie.bewijs}${b.inactiefReden ? ` || UIT: ${b.inactiefReden}` : ""}`,
        b.verificatie.op,
        b.ophaalintervalMinuten,
        b.minIntervalSeconden,
        b.maxItemsPerOphaling,
        b.geoBereik,
        b.onderwerpen,
        JSON.stringify(b.config),
        b.tdmStatus,
        b.toegestaneHosts,
        b.maxBytes,
        b.levertGebeurtenissen,
      ],
    );
    geschreven += 1;
  }
  return { geschreven, actief: BRONNEN.filter((b) => b.actief).length };
}

/** Publicatiebeleid v1: propose-only. Dit is geen instelling maar een eis. */
async function zaaiBeleid(c: pg.PoolClient, organisatieId: number): Promise<string> {
  const versie = "v1-propose-only";
  await c.query(
    `insert into intel.publicatiebeleid
       (organisatie_id, versie, auto_publiceren_aan, auto_max_risico,
        auto_toegestane_soorten, auto_min_bronnen, auto_min_bewijskwaliteit,
        linkedin_machtiging, nieuwsbrief_machtiging, actief)
     values ($1, $2, false, 'laag', '{}', 2, 4, false, false, true)
     on conflict (organisatie_id, versie) do nothing`,
    [organisatieId, versie],
  );
  return versie;
}

async function zaaiKostenplafond(c: pg.PoolClient, organisatieId: number): Promise<void> {
  await c.query(
    `insert into intel.kostenplafonds (organisatie_id)
     values ($1)
     on conflict (organisatie_id) do nothing`,
    [organisatieId],
  );
}

/**
 * Koppelingen: de eerlijke status van elke externe integratie. Een
 * koppeling zonder credentials is 'niet_geconfigureerd', en het
 * dashboard toont dat als NIET AANGESLOTEN in plaats van nullen.
 */
async function zaaiKoppelingen(
  c: pg.PoolClient,
  organisatieId: number,
): Promise<{ sleutel: string; status: string; ontbrekend: string[] }[]> {
  const uit: { sleutel: string; status: string; ontbrekend: string[] }[] = [];

  for (const [sleutel, env] of Object.entries(KOPPELING_ENV)) {
    const ontbrekend = ontbrekendeEnv(env);
    const status = ontbrekend.length === 0 ? "geconfigureerd" : "niet_geconfigureerd";
    await c.query(
      `insert into intel.koppelingen
         (organisatie_id, sleutel, soort, status, benodigde_env, ontbrekende_env,
          laatste_check_op, bewijs)
       values ($1, $2, $3, $4, $5, $6, now(), $7)
       on conflict (organisatie_id, sleutel) do update set
         status           = excluded.status,
         benodigde_env    = excluded.benodigde_env,
         ontbrekende_env  = excluded.ontbrekende_env,
         laatste_check_op = now(),
         bewijs           = excluded.bewijs`,
      [
        organisatieId,
        sleutel,
        sleutel,
        status,
        env,
        ontbrekend,
        ontbrekend.length === 0
          ? `alle ${env.length} omgevingsvariabelen aanwezig; nog niet tegen de echte API gevalideerd`
          : `ontbreekt: ${ontbrekend.join(", ")}`,
      ],
    );
    uit.push({ sleutel, status, ontbrekend });
  }
  return uit;
}

/** Leest de organisatie-id; handig voor CLI's na het zaaien. */
export async function huidigeOrganisatie(pool: Pool): Promise<number> {
  const config = configLezen();
  const rij = await zonderOrganisatie(pool, (c) =>
    eenRij<{ id: number }>(c, "select id from intel_priv.actieve_organisaties() where sleutel = $1", [
      config.organisatieSleutel,
    ]),
  );
  if (!rij) {
    throw new Error(
      `organisatie '${config.organisatieSleutel}' bestaat niet. Draai eerst: npm run zaai`,
    );
  }
  return rij.id;
}

/** Telt rijen per tabel; gebruikt door de poort en het dashboard. */
export async function tellingen(
  pool: Pool,
  organisatieId: number,
  tabellen: readonly string[],
): Promise<Record<string, number>> {
  return metOrganisatie(pool, { organisatieId }, async (c) => {
    const uit: Record<string, number> = {};
    for (const t of tabellen) {
      if (!/^[a-z_]+$/.test(t)) throw new Error(`ongeldige tabelnaam: ${t}`);
      const r = await rijen<{ n: number }>(c, `select count(*)::int as n from intel.${t}`);
      uit[t] = r[0]?.n ?? 0;
    }
    return uit;
  });
}
