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

   ------------------------------------------------------------
   HET INDEXATIERAPPORT (onderaan dit bestand)

   Daar bovenop staat hier het indexatiemonitoringrapport: tien
   metrieken, en ALTIJD alle tien de regels. Een weggelaten regel leest
   als "niet van toepassing" terwijl hij "niet gemeten" betekent.

   De twee harde regels van dat rapport:

   · TECHNICALLY_INDEXABLE en GOOGLE_INDEXED zijn en blijven GESCHEIDEN
     metrieken. Een technisch indexeerbare pagina is geen geindexeerde
     pagina. `bewaakScheiding()` werpt als het getal van de ene ooit via
     de bron van de andere binnenkomt — die controle staat er omdat dit
     de aantrekkelijkste fout is: 430 technisch indexeerbaar ziet uit
     als een antwoord op "hoeveel staan er in Google", en dat is het
     niet.

   · EEN ONTBREKENDE METING IS NOOIT NUL. Daarom is `aantal` overal
     `number | null` en nooit `number` met 0 als noodgreep.
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

/* ============================================================
   OMGEKEERDE PARITEIT — de richting die niemand toetste
   ------------------------------------------------------------
   `scanSite()` levert `indexeerbaarZonderSitemap`: indexeerbaar maar
   niet in de sitemap. Dat is ÉÉN richting. De tegenhanger — staat IN de
   sitemap maar is noindex of een redirectstub — werd nergens getoetst,
   en dat is de gevaarlijkere kant: een sitemap die een zoekmachine naar
   een noindex-pagina of een meta-refresh-stub stuurt, geeft elke
   crawlronde een tegenstrijdige instructie af.

   Gemeten op 13 oktober 2026 (`scanSite()`, alleen-lezen): 430
   technisch indexeerbaar, 430 in de sitemap, BEIDE afwijkingslijsten
   leeg. De 17 NOINDEX-routes (16 legacy-brugstubs + 404) staan met
   opzet niet in de sitemap. Deze functie legt die nulstand vast zodat
   een latere generatorronde hem niet stil kan breken.
   ============================================================ */

export type PariteitPagina = {
  readonly pad: string;
  readonly inSitemap: boolean;
  readonly indexeerbaar: boolean;
  readonly isRedirectStub: boolean;
};

export type OmgekeerdePariteit = {
  /** In de sitemap én noindex. Een zoekmachine krijgt twee antwoorden. */
  readonly sitemapMaarNoindex: readonly string[];
  /** In de sitemap én een meta-refresh-stub. De sitemap wijst naar een doorverwijzing. */
  readonly sitemapMaarRedirectStub: readonly string[];
  /** De twee lijsten samen; dit is wat een poort op nul hoort te houden. */
  readonly alle: readonly string[];
};

/**
 * De ontbrekende pariteitsrichting: wat staat er in de sitemap dat er
 * niet in hoort te staan?
 *
 * Pure functie, zodat de poort hem zonder database en zonder netwerk
 * kan draaien.
 */
export function omgekeerdePariteit(paginas: readonly PariteitPagina[]): OmgekeerdePariteit {
  const noindex = paginas
    .filter((p) => p.inSitemap && !p.indexeerbaar)
    .map((p) => p.pad)
    .sort();
  const stubs = paginas
    .filter((p) => p.inSitemap && p.isRedirectStub)
    .map((p) => p.pad)
    .sort();
  return {
    sitemapMaarNoindex: noindex,
    sitemapMaarRedirectStub: stubs,
    alle: [...new Set([...noindex, ...stubs])].sort(),
  };
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

export type LiveMetingUitkomst = {
  readonly metingen: LiveMeting[];
  readonly geschreven: number;
  /** Hoeveel pagina's deze run heeft aangeraakt. */
  readonly gekozen: number;
  /** De NOEMER. "12" is geen informatie, "12 van 430" wel. */
  readonly totaalInRegister: number;
  readonly offset: number;
  readonly gelijktijdig: number;
  /** Hoeveel pagina's er na deze run nog ongemeten in het register staan. */
  readonly nogTeGaan: number;
};

/**
 * Hoeveel verzoeken tegelijk. Waarom dit een VOORWAARDE is en geen
 * optie: `netwerkTimeoutMs` staat op 20.000 ms (kern/config.ts) en de
 * lus was sequentieel. Een volledige run over de 430 canonieke pagina's
 * zou in het slechtste geval 430 x 20 s = ~2,4 uur aan timeoutstaart
 * geven — langer dan elk cronvenster, dus de run zou nooit afmaken en
 * de dagstand nooit geschreven worden. Bij zes parallel is die
 * bovengrens ~24 minuten. Zes is bewust laag: de site staat op een
 * statische Caddy achter Railway en wij zijn hier te gast op ons eigen
 * domein, geen stresstest.
 */
export const GELIJKTIJDIG_STANDAARD = 6;

/**
 * Voert `werk` over `items` uit met maximaal `gelijktijdig` openstaande
 * taken, en houdt de uitvoer in de ORDE VAN INVOER. Die orde telt: de
 * uitvoer van het rapport moet tussen twee runs vergelijkbaar zijn.
 */
async function metBegrensdeGelijktijdigheid<T, R>(
  items: readonly T[],
  gelijktijdig: number,
  werk: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const uit = new Array<R>(items.length);
  let volgende = 0;
  const banen = Math.max(1, Math.min(gelijktijdig, items.length));
  await Promise.all(
    Array.from({ length: banen }, async () => {
      for (;;) {
        const i = volgende;
        volgende += 1;
        if (i >= items.length) return;
        const item = items[i];
        if (item === undefined) return;
        uit[i] = await werk(item, i);
      }
    }),
  );
  return uit;
}

/**
 * Meet wat zonder credentials meetbaar is. Expliciet GEEN
 * indexatiemeting: dat kan alleen Search Console vertellen.
 *
 * DRIE GEMETEN DEFECTEN DIE HIER ZIJN GEREPAREERD (13 oktober 2026):
 *
 * 1. DE SELECTIE DEKTE 12 VAN 430 EN KOOS EEN ALFABETISCH PREFIX.
 *    De sortering was `order by in_sitemap desc, pad` met `limit 20`
 *    (via de CLI: 12). Dat gaf elke run dezelfde twaalf paden
 *    (/, /algemene-voorwaarden, /contact, /cookiebeleid,
 *    /energieadvies, /energy-hubs, /industrie-logistiek,
 *    /industrie-recreatie, /industrie-residentieel,
 *    /industrie-vastgoed, /industrie-vve, /kennis). Geen van de 350
 *    /regios-routes werd ooit gemeten, en door `in_sitemap desc` kwamen
 *    de 17 NOINDEX-stubs STRUCTUREEL nooit aan bod — juist de pagina's
 *    waar een foute status het meest kost. Nu: `order by pad` (stabiel,
 *    volledig) plus een `offset`, zodat de hele site in vensters te
 *    doorlopen is.
 *
 * 2. ER WAS GEEN OFFSET, dus pagineren kon niet zonder codewijziging.
 *    Die staat er nu.
 *
 * 3. ALLE RIJEN KREGEN DEZELFDE TIJDSTEMPEL. De upsert zette
 *    `laatst_gecontroleerd_op = now()`, en `now()` is in Postgres de
 *    TRANSACTIEtijd. Na een run van 430 pagina's droegen alle 430 rijen
 *    exact dezelfde waarde, waarmee de dashboardquery
 *    (`order by laatst_gecontroleerd_op desc limit 20`, server.ts)
 *    ordeninstabiel wordt: welke twintig je ziet is dan willekeurig.
 *    Nu `clock_timestamp()`: dat is bovendien wat de kolomnaam belooft —
 *    het moment van de controle, niet het begin van de transactie.
 *
 * Deze functie SCHRIJFT GEEN dagstand. Dat doet `bewaarDagstand()`,
 * omdat de dagstand over het hele rapport gaat en niet over één run.
 */
export async function meetLive(
  pool: Pool,
  organisatieId: number,
  opties: { max?: number; offset?: number; gelijktijdig?: number } = {},
): Promise<LiveMetingUitkomst> {
  const config = configLezen();
  const max = opties.max ?? 20;
  const offset = Math.max(0, opties.offset ?? 0);
  const gelijktijdig = Math.max(1, opties.gelijktijdig ?? GELIJKTIJDIG_STANDAARD);

  const { paden, totaal } = await metOrganisatie(pool, { organisatieId }, async (c) => {
    const totaalRij = await rijen<{ n: string }>(
      c,
      `select count(*)::text as n from intel.pagina_register
        where organisatie_id = $1 and bestaat_in_repo`,
      [organisatieId],
    );
    /* `order by pad` en NIET `in_sitemap desc, pad`: de sortering mag de
       selectie niet sturen, anders blijft een hele klasse pagina's
       onzichtbaar. */
    const p = await rijen<{ id: number; pad: string; canonieke_url: string; in_sitemap: boolean }>(
      c,
      `select id, pad, canonieke_url, in_sitemap
         from intel.pagina_register
        where organisatie_id = $1 and bestaat_in_repo
        order by pad
        limit $2 offset $3`,
      [organisatieId, max, offset],
    );
    return { paden: p, totaal: Number(totaalRij[0]?.n ?? 0) };
  });

  const meetEen = async (p: {
    pad: string;
    in_sitemap: boolean;
  }): Promise<LiveMeting> => {
    const url = `${config.siteBasisUrl}${p.pad === "/" ? "/" : p.pad}`;
    const leeg = {
      pad: p.pad,
      url,
      httpStatus: null,
      redirectNaar: null,
      canoniekOpPagina: null,
      canoniekKlopt: null,
      inSitemap: p.in_sitemap,
    };
    if (!config.netwerkToegestaan) return { ...leeg, fout: "netwerk uitgeschakeld" };
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
        return {
          pad: p.pad,
          url,
          httpStatus: r.status,
          redirectNaar: locatie,
          canoniekOpPagina: canoniek,
          canoniekKlopt: canoniek === null ? null : canoniek === url,
          inSitemap: p.in_sitemap,
          fout: null,
        };
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      return { ...leeg, fout: (e as Error).message };
    }
  };

  const metingen = await metBegrensdeGelijktijdigheid(paden, gelijktijdig, (p) => meetEen(p));

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
         values ($1,$2,$3,$4,'onbekend','eigen_meting',$5,clock_timestamp(),$6)
         on conflict (organisatie_id, url, bron) do update set
           in_sitemap              = excluded.in_sitemap,
           http_status             = excluded.http_status,
           laatst_gecontroleerd_op = clock_timestamp(),
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

  const uitkomst: LiveMetingUitkomst = {
    metingen,
    geschreven,
    gekozen: metingen.length,
    totaalInRegister: totaal,
    offset,
    gelijktijdig,
    nogTeGaan: Math.max(0, totaal - (offset + metingen.length)),
  };
  log.info("live meting gereed", {
    gekozen: uitkomst.gekozen,
    totaal_in_register: uitkomst.totaalInRegister,
    offset,
    gelijktijdig,
    nog_te_gaan: uitkomst.nogTeGaan,
    geschreven,
  });
  return uitkomst;
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

/* ============================================================
   HET INDEXATIEMONITORINGRAPPORT — tien metrieken, altijd tien regels
   ============================================================ */

/**
 * De tien metrieken, in de volgorde waarin ze gerapporteerd worden.
 * Dezelfde sleutels als de CHECK op intel.indexatie_dagstand.metriek
 * (migratie 0034); gaan die twee uiteen, dan faalt het wegschrijven en
 * niet stilletjes de betekenis.
 */
export const INDEXATIE_METRIEKEN = [
  "CURRENT_CANONICAL_INVENTORY",
  "TECHNICALLY_INDEXABLE",
  "GOOGLE_INDEXED",
  "HISTORICAL_404",
  "CURRENT_PAGE_INDEXATION",
  "SITEMAP_PROCESSING",
  "ORGANIC_IMPRESSIONS",
  "ORGANIC_CLICKS",
  "SEARCH_QUERIES",
  "CONVERSION_PERFORMANCE",
] as const;

export type IndexatieMetriek = (typeof INDEXATIE_METRIEKEN)[number];

/**
 * Het label zegt WAT VOOR SOORT getal dit is. Vier waarden, met een
 * scherpe grens:
 *
 *   MEASURED      het getal komt uit een BEWAARDE meting: een rij in de
 *                 database met tijdstempel en bewijs.
 *   INFERRED      in deze run berekend uit gemeten feiten, maar nergens
 *                 bewaard. Vandaag juist, morgen niet te reconstrueren.
 *   UNVERIFIED    er is data, maar die bewijst de metriek niet — de
 *                 bron is niet tegen de echte API gevalideerd, of er
 *                 zijn te weinig dagstanden voor een trend.
 *   NOT_AVAILABLE er is geen bron. Dan staat in `bewijs` WAT ontbreekt,
 *                 en `aantal` is null. Nooit 0.
 */
export type MetriekLabel = "MEASURED" | "INFERRED" | "UNVERIFIED" | "NOT_AVAILABLE";

/* ============================================================
   VERGELIJKING OVER 7, 28 EN 90 DAGEN
   ------------------------------------------------------------
   WAAROM DIT ER NIET WAS, en waarom dat geen vergeten query was.

   Gemeten op b2de0c4: er is in dit hele subsysteem geen enkele
   periodevergelijking. Niet omdat niemand eraan dacht, maar omdat er
   NIETS OM TE VERGELIJKEN was. `intel.indexatie_status` heeft
   `unique (organisatie_id, url, bron)` en zet bij een upsert
   `laatst_gecontroleerd_op = now()`: het vorige meetpunt wordt gewist.
   `intel.indexatie_dagstand` (migratie 0034) kan het wél bewaren, maar
   `--bewaar` stond in geen enkele planregel en de tabel had 0 rijen.

   Een vergelijking bouwen bovenop een tabel die nooit gevuld wordt, zou
   een functie zijn die altijd leeg teruggeeft. De echte reparatie is
   daarom tweeledig: de dagelijkse taak `indexatie` in kern/taken.ts
   vult de tabel, en deze functie leest hem.

   DRIE VENSTERS, EN HET ANTWOORD MAG 'NIET GEMETEN' ZIJN.
   Met één dagstand is er geen trend. Dat wordt gezegd, met het aantal
   beschikbare dagstanden erbij, zodat zichtbaar is wanneer het antwoord
   wél komt. Een delta van 0 bij één meetpunt zou beweren dat er niets
   is veranderd, en dat is niet gemeten.

   EEN NOT_AVAILABLE-METRIEK KRIJGT GEEN DELTA. Zijn `aantal` is null.
   Twee nullen aftrekken geeft geen 0 maar opnieuw ONBEKEND; dat is de
   les uit 0009 ("een ontbrekende rij is geen nul") toegepast op een
   verschil.
   ============================================================ */

/* ------------------------------------------------------------
   SEGMENTATIE — nieuws, kennis en commercieel apart
   ------------------------------------------------------------
   De opdracht vraagt deze drie segmenten. De kolom bestond al:
   `intel.pagina_register.soort` (migratie 0004), met een index
   (0004 regel 56-57). Gemeten op b2de0c4 gebruikte geen van de
   queries in dit subsysteem hem — alle tien rapportmetrieken waren
   sitebreed.

   DE AFBEELDING STAAT HIER EXPLICIET, en dat is geen opsmuk. Gemeten
   soorten in het register: regio 349, oplossing 23, project 17,
   kennis 17, sector 16, overig 16, systeem 7, juridisch 3, home 1 —
   samen 449. 'nieuws' komt er nog niet in voor, en dat is juist: er is
   nog geen nieuwspagina.

   WAAROM juridisch EN overig IN GEEN SEGMENT VALLEN. `juridisch` zijn
   privacy, cookiebeleid en algemene voorwaarden: geen zoekintentie om
   te volgen. `overig` zijn de doorverwijsstubs en de foutpagina. Ze
   onder 'commercieel' schuiven zou het commerciële segment laten
   groeien met pagina's die niets verkopen, en dan meet een stijging
   iets anders dan hij lijkt. Ze worden daarom GETELD en benoemd als
   buiten de segmentatie, niet weggelaten — een restpost die je niet
   ziet, is een restpost die je verkeerd uitlegt.
   ------------------------------------------------------------ */

export const SEGMENT_VAN_SOORT: Readonly<Record<string, "nieuws" | "kennis" | "commercieel">> = {
  nieuws: "nieuws",
  kennis: "kennis",
  /* Alles wat een commerciële zoekintentie bezit of ondersteunt. */
  oplossing: "commercieel",
  systeem: "commercieel",
  sector: "commercieel",
  project: "commercieel",
  regio: "commercieel",
  home: "commercieel",
};

export type SegmentStand = {
  readonly segment: "nieuws" | "kennis" | "commercieel" | "buiten_segmentatie";
  readonly paginas: number;
  readonly inSitemap: number;
  readonly bestaatInRepo: number;
  /** Welke `soort`-waarden hierin vallen, zodat de telling na te rekenen is. */
  readonly soorten: readonly string[];
};

/**
 * De stand per segment.
 *
 * TECHNISCH BEREIKBAAR EN IN DE SITEMAP, NIET GEÏNDEXEERD. Deze functie
 * meet uitsluitend wat in het register staat; of een zoekmachine de
 * pagina heeft opgenomen is zonder Search Console niet te meten en
 * staat hier dus niet. Dat onderscheid is precies wat bewaakScheiding()
 * elders afdwingt.
 */
export async function segmentStanden(
  pool: Pool,
  organisatieId: number,
): Promise<readonly SegmentStand[]> {
  const uit = await metOrganisatie(pool, { organisatieId }, async (c) =>
    rijen<{ soort: string; paginas: string; in_sitemap: string; in_repo: string }>(
      c,
      `select coalesce(soort, 'onbekend') as soort,
              count(*)::text                                as paginas,
              count(*) filter (where in_sitemap)::text       as in_sitemap,
              count(*) filter (where bestaat_in_repo)::text  as in_repo
         from intel.pagina_register
        where organisatie_id = $1
        group by 1`,
      [organisatieId],
    ),
  );

  const leeg = (): { paginas: number; inSitemap: number; inRepo: number; soorten: string[] } => ({
    paginas: 0,
    inSitemap: 0,
    inRepo: 0,
    soorten: [],
  });
  const bakken = new Map<SegmentStand["segment"], ReturnType<typeof leeg>>([
    ["nieuws", leeg()],
    ["kennis", leeg()],
    ["commercieel", leeg()],
    ["buiten_segmentatie", leeg()],
  ]);

  for (const r of uit) {
    const segment = SEGMENT_VAN_SOORT[r.soort] ?? "buiten_segmentatie";
    const bak = bakken.get(segment)!;
    bak.paginas += Number(r.paginas);
    bak.inSitemap += Number(r.in_sitemap);
    bak.inRepo += Number(r.in_repo);
    bak.soorten.push(r.soort);
  }

  return [...bakken].map(([segment, b]) => ({
    segment,
    paginas: b.paginas,
    inSitemap: b.inSitemap,
    bestaatInRepo: b.inRepo,
    soorten: b.soorten.sort(),
  }));
}

export const VERGELIJKVENSTERS = [7, 28, 90] as const;
export type Venster = (typeof VERGELIJKVENSTERS)[number];

export type VensterVergelijking = {
  readonly dagen: Venster;
  /** De oudste dagstand binnen dit venster, of null. */
  readonly vanDatum: string | null;
  readonly vanAantal: number | null;
  readonly totDatum: string | null;
  readonly totAantal: number | null;
  /** null = niet te berekenen. Nooit 0 als stand-in. */
  readonly verschil: number | null;
  /** Hoeveel dagstanden er in dit venster bestaan. */
  readonly meetpunten: number;
  readonly toelichting: string;
};

export type MetriekTrend = {
  readonly metriek: IndexatieMetriek;
  readonly label: MetriekLabel;
  readonly vensters: readonly VensterVergelijking[];
};

/**
 * Vergelijkt elke metriek over 7, 28 en 90 dagen.
 *
 * Leest UITSLUITEND intel.indexatie_dagstand. Raakt geen enkele externe
 * dienst en heeft dus geen credential nodig; de GSC-metrieken komen er
 * als NOT_AVAILABLE uit omdat ze zo bewaard zijn, niet omdat deze
 * functie ze niet kon ophalen.
 */
export async function vergelijkVensters(
  pool: Pool,
  organisatieId: number,
  opties: { vandaag?: string } = {},
): Promise<{ trends: MetriekTrend[]; dagstandenTotaal: number; oudsteDatum: string | null }> {
  const rijenUit = await metOrganisatie(pool, { organisatieId }, async (c) =>
    rijen<{ datum: string; metriek: string; aantal: number | null; label: string }>(
      c,
      `select datum::text, metriek, aantal, label
         from intel.indexatie_dagstand
        where organisatie_id = $1
        order by metriek, datum`,
      [organisatieId],
    ),
  );

  const alleDatums = [...new Set(rijenUit.map((r) => r.datum))].sort();
  const vandaag = opties.vandaag ?? alleDatums.at(-1) ?? new Date().toISOString().slice(0, 10);

  const perMetriek = new Map<string, { datum: string; aantal: number | null; label: string }[]>();
  for (const r of rijenUit) {
    const lijst = perMetriek.get(r.metriek) ?? [];
    lijst.push({ datum: r.datum, aantal: r.aantal, label: r.label });
    perMetriek.set(r.metriek, lijst);
  }

  const dagenVoor = (d: number): string => {
    const t = Date.parse(`${vandaag}T00:00:00Z`);
    return new Date(t - d * 86_400_000).toISOString().slice(0, 10);
  };

  /* ALTIJD TIEN METRIEKEN, net als het rapport zelf. Een metriek die
     nog nooit is bewaard hoort te verschijnen met 'nul dagstanden' en
     niet weg te vallen; anders leest een korte lijst als 'de rest is in
     orde'. */
  const trends: MetriekTrend[] = INDEXATIE_METRIEKEN.map((metriek) => {
    const standen = perMetriek.get(metriek) ?? [];
    const laatste = standen.at(-1) ?? null;

    const vensters = VERGELIJKVENSTERS.map((dagen): VensterVergelijking => {
      const grens = dagenVoor(dagen);
      const binnen = standen.filter((s) => s.datum >= grens);
      const oudste = binnen[0] ?? null;

      if (standen.length === 0) {
        return {
          dagen,
          vanDatum: null,
          vanAantal: null,
          totDatum: null,
          totAantal: null,
          verschil: null,
          meetpunten: 0,
          toelichting:
            "NIET GEMETEN — deze metriek is nog nooit als dagstand bewaard. " +
            "Draai de dagelijkse taak 'indexatie' (of npm run analytics -- --bewaar).",
        };
      }
      if (binnen.length < 2) {
        return {
          dagen,
          vanDatum: oudste?.datum ?? null,
          vanAantal: oudste?.aantal ?? null,
          totDatum: laatste?.datum ?? null,
          totAantal: laatste?.aantal ?? null,
          verschil: null,
          meetpunten: binnen.length,
          toelichting:
            `NIET GEMETEN — ${binnen.length} dagstand(en) binnen ${dagen} dagen. ` +
            "Twee meetpunten zijn een trend; één is dat nooit.",
        };
      }
      if (oudste === null || oudste.aantal === null || laatste === null || laatste.aantal === null) {
        return {
          dagen,
          vanDatum: oudste?.datum ?? null,
          vanAantal: oudste?.aantal ?? null,
          totDatum: laatste?.datum ?? null,
          totAantal: laatste?.aantal ?? null,
          verschil: null,
          meetpunten: binnen.length,
          toelichting:
            `ONBEKEND — minstens één van de twee meetpunten heeft geen getal ` +
            `(label ${laatste?.label ?? "?"}). Een verschil tussen twee onbekenden is geen nul.`,
        };
      }
      return {
        dagen,
        vanDatum: oudste.datum,
        vanAantal: oudste.aantal,
        totDatum: laatste.datum,
        totAantal: laatste.aantal,
        verschil: laatste.aantal - oudste.aantal,
        meetpunten: binnen.length,
        toelichting:
          `${oudste.aantal} op ${oudste.datum} naar ${laatste.aantal} op ${laatste.datum} ` +
          `over ${binnen.length} meetpunten`,
      };
    });

    return {
      metriek,
      label: (laatste?.label ?? "NOT_AVAILABLE") as MetriekLabel,
      vensters,
    };
  });

  return {
    trends,
    dagstandenTotaal: alleDatums.length,
    oudsteDatum: alleDatums[0] ?? null,
  };
}

export type RapportRegel = {
  readonly metriek: IndexatieMetriek;
  /** null = NIET GEMETEN. Dat is iets anders dan 0. */
  readonly aantal: number | null;
  /** De noemer, als die bestaat. "12" is geen informatie, "12 van 430" wel. */
  readonly noemer: number | null;
  readonly bron: string;
  readonly label: MetriekLabel;
  readonly bewijs: string;
};

/**
 * Bronnen die NOOIT een GOOGLE_INDEXED-getal mogen leveren. Dit is de
 * kern van de scheiding: wat wij zelf meten of uit de repo berekenen,
 * zegt niets over wat Google heeft opgenomen.
 */
const EIGEN_BRONNEN: readonly string[] = ["eigen_meting", "repo", "pagina_register", "sitekennis"];

/** Bronnen die wél over opname door een zoekmachine kunnen gaan. */
const ZOEKMACHINE_BRONNEN: readonly string[] = ["gsc", "bing_webmaster"];

/**
 * Werpt als TECHNICALLY_INDEXABLE en GOOGLE_INDEXED in elkaar zijn
 * gaan zitten.
 *
 * Twee verboden vormen:
 *  · GOOGLE_INDEXED met een getal uit een eigen bron — dan is de
 *    technische meting het substituut geworden;
 *  · een van de twee regels die helemaal ontbreekt — dan is de
 *    scheiding opgeheven door weglating.
 *
 * Dit is geen stijlcontrole. "430 technisch indexeerbaar" ziet eruit
 * als een antwoord op "hoeveel pagina's staan er in Google", en is dat
 * niet; de eigenaar zag in Search Console 35 geindexeerd tegenover
 * ~15.300 niet. Een substitutie zou een factor 12 verschil wegpoetsen.
 */
export function bewaakScheiding(regels: readonly RapportRegel[]): void {
  const technisch = regels.find((r) => r.metriek === "TECHNICALLY_INDEXABLE");
  const google = regels.find((r) => r.metriek === "GOOGLE_INDEXED");
  if (!technisch || !google) {
    throw new Error(
      "indexatierapport: TECHNICALLY_INDEXABLE en GOOGLE_INDEXED moeten BEIDE als regel bestaan; " +
        "een weggelaten regel heft de scheiding op",
    );
  }
  if (google.aantal !== null && EIGEN_BRONNEN.includes(google.bron)) {
    throw new Error(
      `indexatierapport: GOOGLE_INDEXED kreeg een getal (${google.aantal}) uit eigen bron ` +
        `'${google.bron}'. Technisch indexeerbaar is geen substituut voor geindexeerd.`,
    );
  }
  if (google.aantal !== null && !ZOEKMACHINE_BRONNEN.includes(google.bron)) {
    throw new Error(
      `indexatierapport: GOOGLE_INDEXED kreeg een getal uit bron '${google.bron}', ` +
        `maar alleen ${ZOEKMACHINE_BRONNEN.join(" of ")} kan over opname gaan`,
    );
  }
}

/**
 * Alles wat het rapport nodig heeft, als gemeten invoer. Elk veld dat
 * null is, is NIET GEMETEN — er staat nergens een 0 als vervanging.
 *
 * Deze scheiding tussen meten en rapporteren bestaat zodat de
 * rapportlogica zonder database en zonder netwerk te toetsen is.
 */
export type RapportInvoer = {
  /**
   * Is de database onbereikbaar? Dan staat hier de reden.
   *
   * Dit veld bestaat omdat de eis "altijd tien regels" juist dán breekt:
   * zonder database viel het commando om met een stacktrace en kwam er
   * NUL regels uit. Nul regels is de slechtst mogelijke uitkomst — dat
   * leest als "er is niets aan de hand". Met deze reden erin blijft het
   * rapport tien regels geven, en staat bij elke ontbrekende meting WAT
   * er ontbrak.
   */
  readonly databaseFout?: string | null;
  /** Bestaat intel.indexatie_dagstand? False = migratie 0034 niet toegepast. */
  readonly dagstandTabelBestaat: boolean;
  /** Rijen in intel.pagina_register met bestaat_in_repo. */
  readonly registerTotaal: number | null;
  /** Daarvan: in de sitemap. Dit is de canonieke inventaris. */
  readonly registerInSitemap: number | null;
  /** Technisch indexeerbaar volgens de repo/scan, plus waar dat vandaan komt. */
  readonly technischIndexeerbaar: { readonly aantal: number; readonly bron: string } | null;
  /** Eigen live-metingen in intel.indexatie_status met bron 'eigen_meting'. */
  readonly eigenMetingen: {
    readonly rijen: number;
    readonly http200: number;
    readonly canoniekKlopt: number;
  } | null;
  /** Rijen in intel.indexatie_status met bron 'gsc'. ALLEEN hieruit komt GOOGLE_INDEXED. */
  readonly gscIndexatie: {
    readonly rijen: number;
    readonly geindexeerdJa: number;
    readonly bron: string;
  } | null;
  /** Per metriek: hoeveel verschillende dagen staan er in de dagstand. */
  readonly dagstandDagen: ReadonlyMap<IndexatieMetriek, number>;
  /** De laatste bewaarde dagstandwaarde per metriek, als die er is. */
  readonly dagstandLaatste: ReadonlyMap<
    IndexatieMetriek,
    { readonly aantal: number | null; readonly noemer: number | null; readonly datum: string; readonly bron: string }
  >;
  /** Sommen uit intel.zoekvraag_metingen. null = geen enkele rij. */
  readonly zoekprestatie: {
    readonly rijen: number;
    readonly impressies: number | null;
    readonly kliks: number | null;
    readonly zoekvragen: number;
    readonly bron: string;
  } | null;
  /** De commerciele staart uit intel.funnel_metingen / intel.attributies. */
  readonly conversie: {
    readonly funnelRijen: number;
    readonly aanvragen: number | null;
    readonly attributies: number;
  } | null;
  readonly koppelingen: readonly KoppelingStatus[];
};

function ontbrekendeEnvTekst(koppelingen: readonly KoppelingStatus[], sleutel: string): string {
  const k = koppelingen.find((x) => x.sleutel === sleutel);
  if (!k) return `koppeling '${sleutel}' is niet eens gedefinieerd`;
  if (k.ontbrekendeEnv.length === 0) {
    return `${sleutel} is ${k.status} maar nog niet tegen de echte API gevalideerd`;
  }
  return `${sleutel} NIET AANGESLOTEN; ontbrekende variabelen: ${k.ontbrekendeEnv.join(", ")}`;
}

/**
 * Bouwt de tien regels. ALTIJD tien, in de vaste volgorde van
 * INDEXATIE_METRIEKEN — ook als er van negen niets te zeggen is.
 *
 * Pure functie: geen database, geen netwerk, geen klok.
 */
export function bouwIndexatieRapport(invoer: RapportInvoer): RapportRegel[] {
  const kop = invoer.koppelingen;
  const dagen = (m: IndexatieMetriek) => invoer.dagstandDagen.get(m) ?? 0;

  /* De reden die bij ELKE trendmetriek hoort zolang de bewaring niet
     staat. Dit is het gemeten blokkerende defect, niet een vermoeden. */
  const geenBewaring = invoer.dagstandTabelBestaat
    ? null
    : "intel.indexatie_dagstand bestaat niet (migratie 0034 niet toegepast). " +
      "intel.indexatie_status heeft unique (organisatie_id, url, bron) en zet bij een upsert " +
      "laatst_gecontroleerd_op = now(), waarmee het VORIGE meetpunt wordt gewist. Zonder " +
      "dagstandtabel is een trend per constructie onmogelijk.";

  const regels: RapportRegel[] = [];

  /* ---- 1. huidige canonieke inventaris ---------------------------- */
  regels.push(
    invoer.registerInSitemap === null || invoer.registerTotaal === null
      ? {
          metriek: "CURRENT_CANONICAL_INVENTORY",
          aantal: null,
          noemer: null,
          bron: "pagina_register",
          label: "NOT_AVAILABLE",
          bewijs:
            "intel.pagina_register is leeg of niet leesbaar; er is nog niet gezaaid (npm run zaai). " +
            "Nul pagina's zou hier 'de site bestaat niet' betekenen, en dat is niet gemeten.",
        }
      : {
          metriek: "CURRENT_CANONICAL_INVENTORY",
          aantal: invoer.registerInSitemap,
          noemer: invoer.registerTotaal,
          bron: "pagina_register",
          label: "MEASURED",
          bewijs:
            `${invoer.registerInSitemap} van ${invoer.registerTotaal} bestanden in het register ` +
            "staan in de sitemap. Bewaarde meting: een rij per URL in intel.pagina_register, " +
            "gevuld uit een repo-scan plus de sitemap, niet uit een aanname.",
        },
  );

  /* ---- 2. technisch indexeerbaar ---------------------------------- */
  const ti = invoer.technischIndexeerbaar;
  const tiBewaard = dagen("TECHNICALLY_INDEXABLE") > 0;
  regels.push(
    ti === null
      ? {
          metriek: "TECHNICALLY_INDEXABLE",
          aantal: null,
          noemer: invoer.registerTotaal,
          bron: "repo",
          label: "NOT_AVAILABLE",
          bewijs:
            "de website is van hier niet te lezen (in de productiecontainer is rootDirectory " +
            "`intelligence`, dus de HTML ontbreekt) en er is geen sitekennisartefact. Dit getal " +
            "is NIET GEMETEN, niet nul.",
        }
      : {
          metriek: "TECHNICALLY_INDEXABLE",
          aantal: ti.aantal,
          noemer: invoer.registerTotaal,
          bron: ti.bron,
          label: tiBewaard ? "MEASURED" : "INFERRED",
          bewijs:
            `${ti.aantal} pagina's zonder noindex volgens ${ti.bron}` +
            (invoer.registerTotaal === null ? "" : ` (register: ${invoer.registerTotaal})`) +
            ". DIT IS GEEN INDEXATIECIJFER: technisch indexeerbaar zegt wat wij toestaan, niet " +
            "wat Google heeft opgenomen — zie GOOGLE_INDEXED." +
            (tiBewaard
              ? ` Bewaard in intel.indexatie_dagstand over ${dagen("TECHNICALLY_INDEXABLE")} dag(en).`
              : " BEREKENBAAR MAAR NIET BEWAARD: pagina_register heeft geen robots-kolom en er " +
                "staat nog geen dagstand, dus dit getal is morgen niet te reconstrueren."),
        },
  );

  /* ---- 3. door Google geindexeerd --------------------------------
     Komt UITSLUITEND uit intel.indexatie_status met bron 'gsc'. Valt
     nooit terug op metriek 2; bewaakScheiding() hieronder dwingt dat af. */
  const gsc = invoer.gscIndexatie;
  regels.push(
    gsc === null || gsc.rijen === 0
      ? {
          metriek: "GOOGLE_INDEXED",
          aantal: null,
          noemer: invoer.registerInSitemap,
          bron: "gsc",
          label: "NOT_AVAILABLE",
          bewijs:
            `${ontbrekendeEnvTekst(kop, "gsc")}. Er staat geen enkele rij met bron='gsc' in ` +
            "intel.indexatie_status. Dit getal is alleen te krijgen uit Search Console — " +
            "via de API (PENDING_USER_ACTION: property delen met het service-account) of uit " +
            "een CSV-export via scripts/seo/gsc-import.mjs. " +
            "NIET vervangen door TECHNICALLY_INDEXABLE.",
        }
      : {
          metriek: "GOOGLE_INDEXED",
          aantal: gsc.geindexeerdJa,
          noemer: invoer.registerInSitemap,
          bron: gsc.bron,
          label: "MEASURED",
          bewijs:
            `${gsc.geindexeerdJa} van ${gsc.rijen} URL's in de import staan als geindexeerd. ` +
            `Bron: ${gsc.bron}. Dit is een BESLUIT van de zoekmachine, geen eigenschap van onze pagina's.`,
        },
  );

  /* ---- 4. historische 404-trend ----------------------------------- */
  const h404 = invoer.dagstandLaatste.get("HISTORICAL_404");
  regels.push(
    h404 && h404.aantal !== null
      ? {
          metriek: "HISTORICAL_404",
          aantal: h404.aantal,
          noemer: h404.noemer,
          bron: h404.bron,
          label: dagen("HISTORICAL_404") >= 2 ? "MEASURED" : "UNVERIFIED",
          bewijs:
            `laatste dagstand ${h404.datum}: ${h404.aantal}. ` +
            `${dagen("HISTORICAL_404")} dagstand(en) bewaard` +
            (dagen("HISTORICAL_404") >= 2
              ? ", dus er is een trend."
              : "; een trend vraagt minstens twee dagstanden."),
        }
      : {
          metriek: "HISTORICAL_404",
          aantal: null,
          noemer: null,
          bron: "gsc",
          label: "NOT_AVAILABLE",
          bewijs:
            "nergens bewaard. De historische 404's van het vorige (Shopify-)platform zijn " +
            "UITSLUITEND uit een Search Console CSV-export te halen: het Wayback-archief kent " +
            "voor het hele domein maar 169 unieke URL's, dus daar zijn ze niet te reconstrueren. " +
            (geenBewaring ?? "Importeer de export via scripts/seo/gsc-import.mjs."),
        },
  );

  /* ---- 5. indexatietrend van de huidige pagina's ------------------
     DE HALVE METRIEK. De credentialvrije helft (http_status, in_sitemap,
     canonical) is vandaag al meetbaar; de trend bestaat niet. */
  const eigen = invoer.eigenMetingen;
  const trendDagen = dagen("CURRENT_PAGE_INDEXATION");
  regels.push(
    eigen === null || eigen.rijen === 0
      ? {
          metriek: "CURRENT_PAGE_INDEXATION",
          aantal: null,
          noemer: invoer.registerTotaal,
          bron: "eigen_meting",
          label: "NOT_AVAILABLE",
          bewijs:
            "er is nog geen enkele eigen live-meting vastgelegd (npm run analytics -- --meet). " +
            (geenBewaring ?? ""),
        }
      : {
          metriek: "CURRENT_PAGE_INDEXATION",
          aantal: eigen.http200,
          noemer: invoer.registerTotaal,
          bron: "eigen_meting",
          label: trendDagen >= 2 ? "MEASURED" : "UNVERIFIED",
          bewijs:
            `${eigen.http200} van ${eigen.rijen} gemeten URL's geven HTTP 200, ` +
            `${eigen.canoniekKlopt} met een kloppende canonical` +
            (invoer.registerTotaal === null ? "" : `; register ${invoer.registerTotaal}`) +
            `. ${trendDagen} dagstand(en) bewaard` +
            (trendDagen >= 2
              ? ", dus er is een trend."
              : "; een trend vraagt minstens twee dagstanden. " + (geenBewaring ?? "")) +
            " LET OP: dit is bereikbaarheid, niet indexatie — of deze pagina's in Google staan " +
            "zegt alleen GOOGLE_INDEXED.",
        },
  );

  /* ---- 6. sitemapverwerking --------------------------------------- */
  const sm = invoer.dagstandLaatste.get("SITEMAP_PROCESSING");
  regels.push(
    sm && sm.aantal !== null
      ? {
          metriek: "SITEMAP_PROCESSING",
          aantal: sm.aantal,
          noemer: sm.noemer,
          bron: sm.bron,
          label: dagen("SITEMAP_PROCESSING") >= 2 ? "MEASURED" : "UNVERIFIED",
          bewijs:
            `laatste dagstand ${sm.datum}: ${sm.aantal}` +
            (sm.noemer === null ? "" : ` van ${sm.noemer}`) +
            ` ingezonden sitemap(s) met status Success volgens ${sm.bron}.`,
        }
      : {
          metriek: "SITEMAP_PROCESSING",
          aantal: null,
          noemer: null,
          bron: "gsc",
          label: "NOT_AVAILABLE",
          bewijs:
            "of een sitemap is gelezen en wanneer, staat alleen in Search Console > Sitemaps. " +
            "De repo kan het niet meten en mag het niet afdwingen: er staat met opzet GEEN " +
            "sitemap-inzending en GEEN Indexing-API-aanroep in deze codebase. " +
            "PENDING_USER_ACTION: eerst de VOLLEDIGE inzendlijst vastleggen — dat is de enige " +
            "nulmeting die deze metriek heeft.",
        },
  );

  /* ---- 7, 8, 9. vertoningen, klikken, zoekopdrachten -------------- */
  const zp = invoer.zoekprestatie;
  const zoekRegel = (
    metriek: IndexatieMetriek,
    waarde: number | null,
    wat: string,
  ): RapportRegel =>
    zp === null || zp.rijen === 0 || waarde === null
      ? {
          metriek,
          aantal: null,
          noemer: null,
          bron: "gsc",
          label: "NOT_AVAILABLE",
          bewijs:
            `${ontbrekendeEnvTekst(kop, "gsc")}. intel.zoekvraag_metingen bevat ` +
            `${zp?.rijen ?? 0} rij(en)` +
            (zp !== null && zp.rijen > 0 ? ` maar geen ${wat}` : "") +
            `. Zonder Search Console bestaat ${wat} niet als getal — en niet bestaan is geen nul.`,
        }
      : {
          metriek,
          aantal: waarde,
          noemer: null,
          bron: zp.bron,
          label: "MEASURED",
          bewijs:
            `${waarde} ${wat} over ${zp.rijen} rij(en) in intel.zoekvraag_metingen, bron ${zp.bron}. ` +
            "Lees dit samen met intel.analytics_dekking: buiten de opgehaalde periode is het ONBEKEND, " +
            "niet nul.",
        };

  regels.push(zoekRegel("ORGANIC_IMPRESSIONS", zp?.impressies ?? null, "vertoningen"));
  regels.push(zoekRegel("ORGANIC_CLICKS", zp?.kliks ?? null, "klikken"));
  regels.push(
    zp === null || zp.rijen === 0
      ? zoekRegel("SEARCH_QUERIES", null, "zoekopdrachten")
      : {
          metriek: "SEARCH_QUERIES",
          aantal: zp.zoekvragen,
          noemer: null,
          bron: zp.bron,
          label: "MEASURED",
          bewijs:
            `${zp.zoekvragen} verschillende zoekopdracht(en) in intel.zoekvraag_metingen, bron ${zp.bron}. ` +
            "Dit zijn GEMETEN zoekopdrachten; een zoekVOLUME is nooit gemeten en staat nergens.",
        },
  );

  /* ---- 10. conversieprestatie ------------------------------------- */
  const co = invoer.conversie;
  regels.push(
    co === null || (co.funnelRijen === 0 && co.attributies === 0)
      ? {
          metriek: "CONVERSION_PERFORMANCE",
          aantal: null,
          noemer: null,
          bron: "ga4+crm",
          label: "NOT_AVAILABLE",
          bewijs:
            `${ontbrekendeEnvTekst(kop, "ga4")}; ${ontbrekendeEnvTekst(kop, "crm")}. ` +
            "intel.funnel_metingen en intel.attributies zijn leeg. Bovendien is NIET " +
            "vastgesteld of het leadendpoint de landingspagina meestuurt, dus zelfs met GA4 is " +
            "toewijzing aan een pagina voorlopig onbewezen.",
        }
      : {
          metriek: "CONVERSION_PERFORMANCE",
          aantal: co.aanvragen,
          noemer: null,
          bron: "ga4+crm",
          label: co.aanvragen === null ? "UNVERIFIED" : "MEASURED",
          bewijs:
            `${co.funnelRijen} funnelrij(en) en ${co.attributies} attributie(s) vastgelegd. ` +
            "Elke attributie draagt haar eigen zekerheid en onzekerheid_reden; een 'bewezen' " +
            "toewijzing bestaat alleen met een methode die geen 'geen' is.",
        },
  );

  /* De ordening is contract: de dagstand en het dashboard lezen hem. */
  const op = new Map(INDEXATIE_METRIEKEN.map((m, i) => [m, i]));
  regels.sort((a, b) => (op.get(a.metriek) ?? 0) - (op.get(b.metriek) ?? 0));

  /* Onbereikbare database: de regels blijven staan, maar de reden wordt
     erbij geschreven. Anders leest "ONBEKEND" als "er is niets", terwijl
     het betekent "ik kon niet kijken". */
  if (invoer.databaseFout) {
    const uit = regels.map((r) => ({
      ...r,
      bewijs:
        r.label === "NOT_AVAILABLE"
          ? `DATABASE NIET BEREIKBAAR (${invoer.databaseFout}) — daarom is deze meting niet gedaan. ${r.bewijs}`
          : `${r.bewijs} (de noemer uit intel.pagina_register ontbreekt: database niet bereikbaar)`,
    }));
    regels.length = 0;
    regels.push(...uit);
  }

  if (regels.length !== INDEXATIE_METRIEKEN.length) {
    throw new Error(
      `indexatierapport: ${regels.length} regels in plaats van ${INDEXATIE_METRIEKEN.length}. ` +
        "Een weggelaten regel leest als 'niet van toepassing' terwijl hij 'niet gemeten' betekent.",
    );
  }
  bewaakScheiding(regels);
  return regels;
}

/**
 * Haalt de invoer voor het rapport uit de database en bouwt het.
 *
 * `technischIndexeerbaar` komt van BUITEN deze functie mee: dat getal
 * hoort uit een repo-scan of uit het sitekennisartefact, en dit bestand
 * mag de website niet zelf gaan lezen — dan zou de analytics-laag een
 * tweede sitescanner worden naast src/site/paginascan.ts.
 */
export async function indexatieRapport(
  pool: Pool,
  organisatieId: number,
  opties: { technischIndexeerbaar?: { aantal: number; bron: string } } = {},
): Promise<{ regels: RapportRegel[]; invoer: RapportInvoer }> {
  const invoer = await metOrganisatie(pool, { organisatieId }, async (c) => {
    /* De dagstandtabel kan ontbreken: migratie 0034 mag niet zijn
       toegepast en dan moet het rapport dat MELDEN, niet omvallen. */
    const bestaat = await rijen<{ bestaat: boolean }>(
      c,
      "select to_regclass('intel.indexatie_dagstand') is not null as bestaat",
    );
    const dagstandTabelBestaat = bestaat[0]?.bestaat === true;

    const reg = await rijen<{ totaal: string; in_sitemap: string }>(
      c,
      `select count(*) filter (where bestaat_in_repo)::text as totaal,
              count(*) filter (where bestaat_in_repo and in_sitemap)::text as in_sitemap
         from intel.pagina_register where organisatie_id = $1`,
      [organisatieId],
    );
    const registerTotaal = Number(reg[0]?.totaal ?? 0);
    const registerInSitemap = Number(reg[0]?.in_sitemap ?? 0);

    const eigen = await rijen<{ rijen: string; http200: string; canoniek: string }>(
      c,
      `select count(*)::text as rijen,
              count(*) filter (where http_status = 200)::text as http200,
              count(*) filter (where bewijs like '%(klopt)%')::text as canoniek
         from intel.indexatie_status
        where organisatie_id = $1 and bron = 'eigen_meting'`,
      [organisatieId],
    );

    /* ALLEEN bron='gsc'. Geen or, geen coalesce naar een eigen meting. */
    const gsc = await rijen<{ rijen: string; ja: string }>(
      c,
      `select count(*)::text as rijen,
              count(*) filter (where geindexeerd = 'ja')::text as ja
         from intel.indexatie_status
        where organisatie_id = $1 and bron = 'gsc'`,
      [organisatieId],
    );

    const dagstandDagen = new Map<IndexatieMetriek, number>();
    const dagstandLaatste = new Map<
      IndexatieMetriek,
      { aantal: number | null; noemer: number | null; datum: string; bron: string }
    >();
    if (dagstandTabelBestaat) {
      const perMetriek = await rijen<{ metriek: string; dagen: string }>(
        c,
        `select metriek, count(distinct datum)::text as dagen
           from intel.indexatie_dagstand
          where organisatie_id = $1 and aantal is not null
          group by metriek`,
        [organisatieId],
      );
      for (const r of perMetriek) {
        if ((INDEXATIE_METRIEKEN as readonly string[]).includes(r.metriek)) {
          dagstandDagen.set(r.metriek as IndexatieMetriek, Number(r.dagen));
        }
      }
      const laatste = await rijen<{
        metriek: string;
        aantal: number | null;
        noemer: number | null;
        datum: string;
        bron: string;
      }>(
        c,
        `select distinct on (metriek)
                metriek, aantal, noemer, datum::text as datum, bron
           from intel.indexatie_dagstand
          where organisatie_id = $1
          order by metriek, datum desc, gemeten_op desc`,
        [organisatieId],
      );
      for (const r of laatste) {
        if ((INDEXATIE_METRIEKEN as readonly string[]).includes(r.metriek)) {
          dagstandLaatste.set(r.metriek as IndexatieMetriek, {
            aantal: r.aantal,
            noemer: r.noemer,
            datum: r.datum,
            bron: r.bron,
          });
        }
      }
    }

    const zoek = await rijen<{
      rijen: string;
      impressies: string | null;
      kliks: string | null;
      vragen: string;
      bronnen: string | null;
    }>(
      c,
      `select count(*)::text as rijen,
              sum(impressies)::text as impressies,
              sum(kliks)::text as kliks,
              count(distinct zoekvraag)::text as vragen,
              string_agg(distinct bron, '+') as bronnen
         from intel.zoekvraag_metingen where organisatie_id = $1`,
      [organisatieId],
    );

    const conv = await rijen<{ funnel: string; aanvragen: string | null; attributies: string }>(
      c,
      `select (select count(*) from intel.funnel_metingen where organisatie_id = $1)::text as funnel,
              (select sum(aantal)::text from intel.funnel_metingen
                where organisatie_id = $1 and stap = 'aanvraag')                        as aanvragen,
              (select count(*) from intel.attributies where organisatie_id = $1)::text  as attributies`,
      [organisatieId],
    );

    const zoekRijen = Number(zoek[0]?.rijen ?? 0);
    const funnelRijen = Number(conv[0]?.funnel ?? 0);
    const attributies = Number(conv[0]?.attributies ?? 0);

    const uit: RapportInvoer = {
      dagstandTabelBestaat,
      registerTotaal: registerTotaal > 0 ? registerTotaal : null,
      registerInSitemap: registerTotaal > 0 ? registerInSitemap : null,
      technischIndexeerbaar: opties.technischIndexeerbaar ?? null,
      eigenMetingen:
        Number(eigen[0]?.rijen ?? 0) > 0
          ? {
              rijen: Number(eigen[0]?.rijen ?? 0),
              http200: Number(eigen[0]?.http200 ?? 0),
              canoniekKlopt: Number(eigen[0]?.canoniek ?? 0),
            }
          : null,
      gscIndexatie:
        Number(gsc[0]?.rijen ?? 0) > 0
          ? {
              rijen: Number(gsc[0]?.rijen ?? 0),
              geindexeerdJa: Number(gsc[0]?.ja ?? 0),
              bron: "gsc",
            }
          : null,
      dagstandDagen,
      dagstandLaatste,
      zoekprestatie:
        zoekRijen > 0
          ? {
              rijen: zoekRijen,
              impressies: zoek[0]?.impressies === null ? null : Number(zoek[0]?.impressies),
              kliks: zoek[0]?.kliks === null ? null : Number(zoek[0]?.kliks),
              zoekvragen: Number(zoek[0]?.vragen ?? 0),
              bron: zoek[0]?.bronnen ?? "gsc",
            }
          : null,
      conversie:
        funnelRijen > 0 || attributies > 0
          ? {
              funnelRijen,
              aanvragen: conv[0]?.aanvragen === null ? null : Number(conv[0]?.aanvragen),
              attributies,
            }
          : null,
      koppelingen: koppelingStatussen(),
    };
    return uit;
  });

  return { regels: bouwIndexatieRapport(invoer), invoer };
}

export type BewaarUitkomst =
  | { readonly ok: true; readonly geschreven: number; readonly datum: string }
  | { readonly ok: false; readonly reden: string };

/**
 * De `bron` van een rapportregel is leesbare tekst ("pagina_register",
 * "ga4+crm", "gsc+bing_webmaster"); de kolom
 * intel.indexatie_dagstand.bron heeft een CHECK met vijf waarden.
 *
 * Deze afbeelding staat er expliciet in plaats van een losse ternair in
 * de insert, omdat een niet-afgebeelde bron de hele dagstand laat
 * omvallen op een constraint — en dan is er die dag niets bewaard. De
 * regel: een zoekmachinebron blijft een zoekmachinebron (anders zou een
 * GSC-getal als eigen meting in de historie landen), al het overige is
 * onze eigen meting.
 */
export function dagstandBron(bron: string): "eigen_meting" | "gsc" | "bing_webmaster" | "ga4" | "crm" {
  const b = bron.toLowerCase();
  if (b.includes("gsc")) return "gsc";
  if (b.includes("bing")) return "bing_webmaster";
  if (b.includes("crm")) return "crm";
  if (b.includes("ga4")) return "ga4";
  return "eigen_meting";
}

/**
 * Bewaart de tien regels als dagstand van vandaag.
 *
 * DIT IS DE REPARATIE van het blokkerende defect. De unieke sleutel van
 * intel.indexatie_dagstand bevat `datum`, dus de run van vandaag
 * overschrijft ALLEEN de rij van vandaag (een herstelrun om 11:00 hoort
 * bij dezelfde dag als de cronrun van 04:30) en laat die van gisteren
 * staan. Twee dagen = een trend.
 *
 * ALLE TIEN de regels worden weggeschreven, ook de NOT_AVAILABLE. Een
 * ontbrekende rij zou later niet te onderscheiden zijn van "die dag niet
 * gedraaid"; met `aantal is null` plus de reden in `bewijs` is dat wel
 * te onderscheiden. De CHECK-constraints van 0034 houden de twee
 * verboden combinaties tegen: NOT_AVAILABLE mét getal, en MEASURED
 * zonder getal.
 */
export async function bewaarDagstand(
  pool: Pool,
  organisatieId: number,
  regels: readonly RapportRegel[],
): Promise<BewaarUitkomst> {
  bewaakScheiding(regels);
  for (const r of regels) {
    if (r.label === "NOT_AVAILABLE" && r.aantal !== null) {
      return {
        ok: false,
        reden: `regel ${r.metriek} is NOT_AVAILABLE met getal ${r.aantal}; een ontbrekende meting is nooit een getal`,
      };
    }
    if (r.label === "MEASURED" && r.aantal === null) {
      return { ok: false, reden: `regel ${r.metriek} is MEASURED zonder getal` };
    }
  }

  return await metOrganisatie(pool, { organisatieId }, async (c) => {
    const bestaat = await rijen<{ bestaat: boolean }>(
      c,
      "select to_regclass('intel.indexatie_dagstand') is not null as bestaat",
    );
    if (bestaat[0]?.bestaat !== true) {
      return {
        ok: false,
        reden:
          "intel.indexatie_dagstand bestaat niet; pas migratie 0034_indexatie_dagstand.sql toe " +
          "(npm run migreer). Zonder die tabel is er geen bewaring en dus geen trend.",
      } as const;
    }
    const datumRij = await rijen<{ d: string }>(c, "select current_date::text as d");
    const datum = datumRij[0]?.d ?? "";
    let n = 0;
    for (const r of regels) {
      await c.query(
        `insert into intel.indexatie_dagstand
           (organisatie_id, datum, metriek, bron, aantal, noemer, label, bewijs, gemeten_op)
         values ($1, current_date, $2, $3, $4, $5, $6, $7, clock_timestamp())
         on conflict (organisatie_id, datum, metriek, bron) do update set
           aantal     = excluded.aantal,
           noemer     = excluded.noemer,
           label      = excluded.label,
           bewijs     = excluded.bewijs,
           gemeten_op = excluded.gemeten_op`,
        [
          organisatieId,
          r.metriek,
          dagstandBron(r.bron),
          r.aantal,
          r.noemer,
          r.label,
          r.bewijs.slice(0, 4000),
        ],
      );
      n += 1;
    }
    log.info("dagstand bewaard", { datum, regels: n });
    return { ok: true, geschreven: n, datum } as const;
  });
}

/* ============================================================
   DE AANHAKING VAN DE GSC-CSV-IMPORT
   ------------------------------------------------------------
   De importer zelf hoort NIET hier. Die staat als
   scripts/seo/gsc-import.mjs en schrijft NIET naar de database: hij
   normaliseert de CSV's en zet de uitkomst onder de sleutel
   `gsc_inventaris` in data/seo/historische-urls.json. Dit blok is de
   aanhaking daartussen — wat er met dat artefact moet gebeuren zodat het
   rapport hierboven zijn getallen vindt, zonder dat de scheiding tussen
   'technisch indexeerbaar' en 'geindexeerd' sneuvelt.

   PER URL (gsc_inventaris.urls[]) -> intel.indexatie_status
     bron        = 'gsc'          (NOOIT 'eigen_meting')
     url         = de genormaliseerde URL uit het artefact
     geindexeerd = 'ja' | 'nee' | 'onbekend', afgeleid uit `reden`/`staat`
     http_status = laat NULL; een CSV-export is geen HTTP-meting
     bewijs      = `bronbestand` + `reden` + `laatst_gecrawld`
                   ("Crawled - currently not indexed", "Not found (404)", ...)
     pagina_id   = alleen vullen als de URL in intel.pagina_register
                   staat; een historische 404 heeft per definitie geen
                   pagina

   PER DAG, GEAGGREGEERD -> intel.indexatie_dagstand
     GOOGLE_INDEXED      bron 'gsc', aantal = aantal geindexeerde URL's
     HISTORICAL_404      bron 'gsc', aantal = aantal URL's met de reden
                         'Not found (404)', noemer = `gezaghebbend_totaal`
     SITEMAP_PROCESSING  bron 'gsc', aantal = sitemaps met status Success,
                         noemer = het totaal INGEZONDEN sitemaps
     ORGANIC_IMPRESSIONS / ORGANIC_CLICKS / SEARCH_QUERIES
                         bron 'gsc'; de rijen zelf horen daarnaast in
                         intel.zoekvraag_metingen met de periode in
                         intel.analytics_dekking

   TWEE DINGEN DIE HIER MISGAAN ALS NIEMAND ZE OPSCHRIJFT

   1. AFGEKAPT IS GEEN TOTAAL. Het artefact zet `afgekapt: true` en
      `telling_label: 'ONDERGRENS'` tenzij het ingelezen aantal gelijk is
      aan een meegegeven gezaghebbend totaal. Search Console exporteert
      maximaal 1.000 voorbeeld-URL's per reden, en het rapportcijfer is
      ~7.700. Een ondergrens mag daarom NOOIT als MEASURED in de dagstand
      landen: label UNVERIFIED, met 'ONDERGRENS' in het bewijs. Alleen
      `telling_label === 'VOLLEDIG'` is MEASURED. Dezelfde regel staat al
      op intel.analytics_dekking.afgekapt — die twee moeten gelijk
      blijven lopen.

   2. DE DATUM IS DE EXPORTDATUM, NIET DE IMPORTDATUM. Het artefact
      draagt `_ingelezen_op`, dus het MOMENT VAN INLEZEN. Zou dat in
      `datum` belanden, dan schuift de hele trend mee met het moment
      waarop iemand de CSV downloadde: twee imports van dezelfde export
      geven dan twee "dagen" en dus een verzonnen trend. De exportdatum
      moet de operator meegeven; het artefact kent hem niet.
   ============================================================ */
export const GSC_IMPORT_CONTRACT = {
  /** Wat de importer oplevert; hij raakt de database niet. */
  artefact: "data/seo/historische-urls.json",
  artefactSleutel: "gsc_inventaris",
  perUrlTabel: "intel.indexatie_status",
  perUrlBron: "gsc",
  dagstandTabel: "intel.indexatie_dagstand",
  dagstandMetrieken: [
    "GOOGLE_INDEXED",
    "HISTORICAL_404",
    "SITEMAP_PROCESSING",
    "ORGANIC_IMPRESSIONS",
    "ORGANIC_CLICKS",
    "SEARCH_QUERIES",
  ],
  /** De datum in de dagstand is de EXPORTdatum uit Search Console. */
  datumIs: "exportdatum",
  /** Alleen een VOLLEDIGE inventaris mag MEASURED worden. */
  volledigLabel: "MEASURED",
  afgekaptLabel: "UNVERIFIED",
} as const;
