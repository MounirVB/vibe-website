/* ============================================================
   ANALYTICS — koppelingen, dekking en wat wél meetbaar is
   ------------------------------------------------------------
   Er zijn geen credentials voor Search Console, Bing, GA4 of het CRM.
   Dit onderdeel doet daarom precies twee dingen:

   1. HET MELDT DAT EERLIJK. Elke koppeling krijgt een status en de
      NAMEN van de ontbrekende omgevingsvariabelen. Het dashboard toont
      NIET AANGESLOTEN, geen nullen. Een nul en een ontbrekende meting
      zijn verschillende dingen, en dat verschil is precies waar
      analytics meestal misgaat.

   2. HET MEET WAT WEL KAN. Zonder enige sleutel is te meten:
        - staat de pagina in sitemap.xml;
        - geeft de live URL 200, 301, 404;
        - klopt de canonical op de live pagina met de URL zelf.
      Dat is geen indexatiemeting — of Google een pagina heeft
      opgenomen is zonder Search Console niet te weten, en dat wordt
      dan ook als 'onbekend' vastgelegd in plaats van geschat.

   Er wordt nooit een AI-citatiecijfer of een zoekvolume verzonnen.
   ============================================================ */

import { configLezen, KOPPELING_ENV, ontbrekendeEnv } from "../kern/config.ts";
import { metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("analytics");

export type KoppelingStatus = {
  readonly sleutel: string;
  readonly status: "niet_geconfigureerd" | "geconfigureerd" | "geverifieerd" | "fout";
  readonly vertrouwd: boolean;
  readonly ontbrekendeEnv: readonly string[];
  readonly toelichting: string;
};

/**
 * Leest de status van elke koppeling uit de omgeving. Geen waarden,
 * alleen namen — en een koppeling is pas 'vertrouwd' na een validatie
 * tegen de echte API, wat zonder sleutel nooit gebeurt.
 */
export function koppelingStatussen(): KoppelingStatus[] {
  return Object.entries(KOPPELING_ENV).map(([sleutel, env]) => {
    const ontbrekend = ontbrekendeEnv(env);
    if (ontbrekend.length === env.length) {
      return {
        sleutel,
        status: "niet_geconfigureerd" as const,
        vertrouwd: false,
        ontbrekendeEnv: ontbrekend,
        toelichting:
          `NIET AANGESLOTEN. Alle ${env.length} variabelen ontbreken: ${ontbrekend.join(", ")}. ` +
          "Zolang dat zo is zijn er geen cijfers, en geen cijfers is niet nul.",
      };
    }
    if (ontbrekend.length > 0) {
      return {
        sleutel,
        status: "fout" as const,
        vertrouwd: false,
        ontbrekendeEnv: ontbrekend,
        toelichting: `HALF GECONFIGUREERD. Ontbreekt nog: ${ontbrekend.join(", ")}.`,
      };
    }
    return {
      sleutel,
      status: "geconfigureerd" as const,
      vertrouwd: false,
      ontbrekendeEnv: [],
      toelichting:
        "Alle variabelen aanwezig, maar nog niet tegen de echte API gevalideerd. " +
        "De data mag bestaan; hij is nog niet te vertrouwen.",
    };
  });
}

export type LiveMeting = {
  readonly pad: string;
  readonly url: string;
  readonly httpStatus: number | null;
  readonly redirectNaar: string | null;
  readonly canoniekOpPagina: string | null;
  readonly canoniekKlopt: boolean | null;
  readonly inSitemap: boolean;
  readonly fout: string | null;
};

/**
 * Meet wat zonder credentials meetbaar is. Expliciet GEEN
 * indexatiemeting: dat kan alleen Search Console vertellen.
 */
export async function meetLive(
  pool: Pool,
  organisatieId: number,
  opties: { max?: number } = {},
): Promise<{ metingen: LiveMeting[]; geschreven: number }> {
  const config = configLezen();
  const max = opties.max ?? 20;

  const paden = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<{ id: number; pad: string; canonieke_url: string; in_sitemap: boolean }>(
      c,
      `select id, pad, canonieke_url, in_sitemap
         from intel.pagina_register
        where organisatie_id = $1 and bestaat_in_repo
        order by in_sitemap desc, pad
        limit $2`,
      [organisatieId, max],
    ),
  );

  const metingen: LiveMeting[] = [];
  for (const p of paden) {
    const url = `${config.siteBasisUrl}${p.pad === "/" ? "/" : p.pad}`;
    if (!config.netwerkToegestaan) {
      metingen.push({
        pad: p.pad,
        url,
        httpStatus: null,
        redirectNaar: null,
        canoniekOpPagina: null,
        canoniekKlopt: null,
        inSitemap: p.in_sitemap,
        fout: "netwerk uitgeschakeld",
      });
      continue;
    }
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), config.netwerkTimeoutMs);
      try {
        const r = await fetch(url, {
          headers: { "user-agent": config.userAgent, accept: "text/html" },
          redirect: "manual",
          signal: ac.signal,
        });
        const locatie = r.headers.get("location");
        let canoniek: string | null = null;
        if (r.status === 200) {
          const html = (await r.text()).slice(0, 60_000);
          canoniek =
            /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i.exec(html)?.[1] ?? null;
        }
        metingen.push({
          pad: p.pad,
          url,
          httpStatus: r.status,
          redirectNaar: locatie,
          canoniekOpPagina: canoniek,
          canoniekKlopt: canoniek === null ? null : canoniek === url,
          inSitemap: p.in_sitemap,
          fout: null,
        });
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      metingen.push({
        pad: p.pad,
        url,
        httpStatus: null,
        redirectNaar: null,
        canoniekOpPagina: null,
        canoniekKlopt: null,
        inSitemap: p.in_sitemap,
        fout: (e as Error).message,
      });
    }
  }

  // Wegschrijven met bron 'eigen_meting' en indexatie expliciet
  // 'onbekend' — want dat is het.
  const geschreven = await metOrganisatie(pool, { organisatieId }, async (c) => {
    let n = 0;
    for (const m of metingen) {
      const pagina = paden.find((p) => p.pad === m.pad);
      await c.query(
        `insert into intel.indexatie_status
           (organisatie_id, pagina_id, url, in_sitemap, geindexeerd, bron,
            http_status, laatst_gecontroleerd_op, bewijs)
         values ($1,$2,$3,$4,'onbekend','eigen_meting',$5,now(),$6)
         on conflict (organisatie_id, url, bron) do update set
           in_sitemap              = excluded.in_sitemap,
           http_status             = excluded.http_status,
           laatst_gecontroleerd_op = now(),
           bewijs                  = excluded.bewijs`,
        [
          organisatieId,
          pagina?.id ?? null,
          m.url,
          m.inSitemap,
          m.httpStatus,
          m.fout
            ? `meting mislukt: ${m.fout}`
            : `HTTP ${m.httpStatus}` +
              (m.redirectNaar ? ` -> ${m.redirectNaar}` : "") +
              (m.canoniekOpPagina
                ? `; canonical op de pagina: ${m.canoniekOpPagina}${m.canoniekKlopt ? " (klopt)" : " (WIJKT AF)"}`
                : "") +
              ". Of een zoekmachine deze pagina heeft opgenomen is zonder Search Console niet te meten.",
        ],
      );
      n += 1;
    }
    return n;
  });

  log.info("live meting gereed", { paden: metingen.length, geschreven });
  return { metingen, geschreven };
}

export type FunnelBeeld = {
  readonly stap: string;
  readonly aantal: number | null;
  readonly bron: string;
  readonly toelichting: string;
};

/**
 * De funnel zoals de opdracht hem vraagt, met per stap of hij meetbaar
 * is. Niet-meetbare stappen krijgen null, nooit nul.
 */
export async function funnelBeeld(pool: Pool, organisatieId: number): Promise<FunnelBeeld[]> {
  const koppelingen = new Map(koppelingStatussen().map((k) => [k.sleutel, k]));
  const gsc = koppelingen.get("gsc");
  const ga4 = koppelingen.get("ga4");
  const crm = koppelingen.get("crm");

  const gemeten = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<{ stap: string; aantal: number }>(
      c,
      `select stap, sum(aantal)::int as aantal
         from intel.funnel_metingen
        where organisatie_id = $1
        group by stap`,
      [organisatieId],
    ),
  );
  const perStap = new Map(gemeten.map((g) => [g.stap, g.aantal]));

  const stappen: { stap: string; nodig: KoppelingStatus | undefined }[] = [
    { stap: "zoekimpressie", nodig: gsc },
    { stap: "klik", nodig: gsc },
    { stap: "landing", nodig: ga4 },
    { stap: "gekwalificeerd_bezoek", nodig: ga4 },
    { stap: "aanvraag", nodig: crm },
    { stap: "afspraak", nodig: crm },
    { stap: "voorstel", nodig: crm },
    { stap: "gewonnen", nodig: crm },
  ];

  return stappen.map(({ stap, nodig }) => {
    const aantal = perStap.get(stap);
    if (aantal !== undefined) {
      return { stap, aantal, bron: "gemeten", toelichting: "uit intel.funnel_metingen" };
    }
    return {
      stap,
      aantal: null,
      bron: nodig?.sleutel ?? "onbekend",
      toelichting: nodig
        ? `ONBEKEND — ${nodig.sleutel} is ${nodig.status}. ${nodig.toelichting}`
        : "ONBEKEND — geen bron voor deze stap geconfigureerd",
    };
  });
}
