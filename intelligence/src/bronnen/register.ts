/* ============================================================
   BRONNEN — het register
   ------------------------------------------------------------
   Elke bron hieronder is op 10 oktober 2026 daadwerkelijk opgehaald
   en geparseerd. `verificatie.bewijs` noemt wat er werkelijk in de
   respons stond — veldnamen die gezien zijn, geen veldnamen die
   verwacht werden. `npm run bronnen -- --verifieer` meet het opnieuw
   en meldt afwijkingen.

   Een bron met actief:false draait niet. De reden staat erbij, en
   die is in alle gevallen gemeten, niet aangenomen.

   LET OP — twee uitkomsten die de opdracht raken:

   * De SRU van officielebekendmakingen (Staatscourant, ACM-besluiten,
     Gemeenteblad-vergunningen, Kamerstukken) levert echte data op
     repository.overheid.nl, maar die host serveert letterlijk
     'User-agent: * / Disallow: /'. Er is geen permissieve alternatieve
     host: /sru bestaat niet op www.officielebekendmakingen.nl of
     zoek.officielebekendmakingen.nl (beide 404). Deze vier bronnen
     staan dus uit. Dat is een beleidsbeslissing voor de eigenaar.
   * www.tennet.eu sluit anthropic-ai, Claude-Web en ClaudeBot
     volledig uit. De machinaleesbare laag van TenneT staat op
     developer.tennet.eu (robots zonder enkele Disallow), maar de
     data-API zelf vereist een apikey.
   ============================================================ */

import type { Bron } from "./soorten.ts";

/** Datum waarop de robots-, licentie- en endpointmetingen zijn gedaan. */
export const GEMETEN_OP = "2026-10-10";

const STANDAARD = {
  taal: "nl",
  geoBereik: "nl",
  minIntervalSeconden: 5,
  maxItemsPerOphaling: 100,
  maxBytes: 2_097_152,
  magCiteren: false,
  citaatLimietTekens: 0,
  urlPatroon: null,
  uitsluitPatroon: null,
  hergebruikVerklaring: null,
  levertGebeurtenissen: true,
} as const;

export const BRONNEN: readonly Bron[] = [
  // ==========================================================
  // NETBEHEER — landelijk
  // ==========================================================
  {
    ...STANDAARD,
    sleutel: "netbeheer-nederland-nieuws",
    uitgever: "Netbeheer Nederland",
    uitgeverSoort: "branchevereniging",
    soort: "rss",
    basisUrl: "https://www.netbeheernederland.nl",
    endpointUrl: "https://www.netbeheernederland.nl/rss.xml",
    toegestaneHosts: ["www.netbeheernederland.nl", "netbeheernederland.nl"],
    onderwerpen: ["netcongestie", "netbeheer", "regelgeving", "flexibiliteit"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "RSS 2.0, HTTP 200, 157 <item>-elementen geparseerd. Per item: title, link, description, pubDate. " +
        "LET OP: <title> bevat ruwe HTML-anchors, dus de titel moet door htmlNaarTekst. " +
        "Vijf nieuwste items vallen tussen 2026-10-06 en 2026-10-09.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 360,
    maxItemsPerOphaling: 160,
    actief: true,
    inactiefReden: null,
    bewaren: "titel, url, publicatiedatum, eigen samenvatting. Geen volledige brontekst.",
    config: { titelBevatHtml: true },
    notities:
      "robots.txt is de Drupal-standaard: /core/, /profiles/, /admin/, /search/, /user/* geblokkeerd; " +
      "/rss.xml niet. Geen AI-crawler uitgesloten. Hoogste volume in dit domein.",
  },
  {
    ...STANDAARD,
    sleutel: "mijnaansluiting-netbeheergebieden",
    uitgever: "Mijn Aansluiting (gezamenlijke netbeheerders)",
    uitgeverSoort: "geodata",
    soort: "wfs",
    basisUrl: "https://public.geodata.mijnaansluiting.nl",
    endpointUrl:
      "https://public.geodata.mijnaansluiting.nl/geoserver/mijnaansluiting_open/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=mijnaansluiting_open:netbeheergebieden_elektriciteit&outputFormat=application/json",
    toegestaneHosts: ["public.geodata.mijnaansluiting.nl"],
    onderwerpen: ["netbeheer", "geografie"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: "Publiek domein",
    licentieUrl: "https://data.overheid.nl",
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "WFS 2.0.0 GeoJSON, HTTP 200, numberMatched=6 (zes elektriciteitsnetbeheergebieden landelijk). " +
        "Gemeten properties: netbeheergebiedId, netbeheerderCode, netbeheerderName, netbeheerderLabel, " +
        "disciplineCode, website, lastUpdated (2025-09-07). Dit is de gezaghebbende DSO-gebiedsgeometrie.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 10_080,
    maxItemsPerOphaling: 20,
    maxBytes: 20_971_520,
    actief: true,
    inactiefReden: null,
    levertGebeurtenissen: false,
    bewaren: "netbeheerdercode, naam en gebiedsidentificatie als referentiegeografie.",
    config: { geoSoort: "netbeheerdergebied" },
    notities:
      "robots.txt geeft 403 op deze host, dus geen gepubliceerd beleid; de licentie 'Publiek domein' uit " +
      "de landelijke catalogus is de grondslag. Levert de koppeling gemeente -> netbeheerder zonder " +
      "geometrische gevolgtrekking.",
  },

  // ==========================================================
  // NETBEHEER — regionaal
  // ==========================================================
  {
    ...STANDAARD,
    sleutel: "liander-sitemap",
    uitgever: "Liander",
    uitgeverSoort: "netbeheerder",
    soort: "sitemap",
    basisUrl: "https://www.liander.nl",
    endpointUrl: "https://www.liander.nl/sitemap.xml",
    toegestaneHosts: ["www.liander.nl", "liander.nl"],
    onderwerpen: ["netcongestie", "netbeheer"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "sitemaps.org urlset, HTTP 200, 269.250 bytes, 1992 <url>-entries en ELKE entry heeft <lastmod>. " +
        "Nieuwste lastmod was de ophaaldag zelf. Gemeten partities: 213 urls onder /over-ons/nieuws/<jaar>/, " +
        "824 urls met 'congest' in het pad. Er is geen RSS op deze host (/rss en /feed geven 404).",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 720,
    maxItemsPerOphaling: 300,
    maxBytes: 8_388_608,
    actief: true,
    inactiefReden: null,
    bewaren: "url, lastmod en pagerubriek. De paginatekst wordt pas opgehaald als het item relevant lijkt.",
    config: {},
    notities:
      "robots.txt blokkeert alleen */error-pages. Omdat er geen feed is, is de sitemap met lastmod de " +
      "wijzigingsdetector. Het urlPatroon beperkt tot nieuws en congestiepagina's.",
    urlPatroon: /\/(over-ons\/nieuws|.*congest|.*capacit)/i,
    uitsluitPatroon: /\/(error-pages|zoeken|login)/i,
  },
  {
    ...STANDAARD,
    sleutel: "enexis-sitemap",
    uitgever: "Enexis",
    uitgeverSoort: "netbeheerder",
    soort: "sitemap",
    basisUrl: "https://www.enexis.nl",
    endpointUrl: "https://www.enexis.nl/sitemap.xml",
    toegestaneHosts: ["www.enexis.nl", "enexis.nl"],
    onderwerpen: ["netcongestie", "netbeheer", "flexibiliteit"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "sitemaps.org urlset, HTTP 200, 662.010 bytes, 2902 <url>-entries met <lastmod> (volledige ISO-8601 " +
        "met offset), <changefreq> en <priority>. 152 urls onder /nieuws, gestructureerd als " +
        "/nieuws/<jaar>/<maand>/<slug>, met een terugkerende serie 'update netcapaciteit <maand>'.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 720,
    maxItemsPerOphaling: 300,
    maxBytes: 8_388_608,
    actief: true,
    inactiefReden: null,
    bewaren: "url, lastmod en pagerubriek.",
    config: {},
    notities: "robots.txt is 'User-agent: * / Allow: /' plus de sitemapverwijzing. Geen AI-crawler uitgesloten.",
    urlPatroon: /\/(nieuws|.*congest|.*netcapacit|.*energiehub)/i,
  },
  {
    ...STANDAARD,
    sleutel: "stedin-sitemap",
    uitgever: "Stedin",
    uitgeverSoort: "netbeheerder",
    soort: "sitemap",
    basisUrl: "https://www.stedin.net",
    endpointUrl: "https://www.stedin.net/sitemap.xml",
    toegestaneHosts: ["www.stedin.net", "stedin.net"],
    onderwerpen: ["netcongestie", "netbeheer"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "XML urlset, HTTP 200, 129.349 bytes, 700 <url>-entries met <lastmod>. Afwijkende namespace-declaratie " +
        "(alleen xmlns:xsd/xsi, geen sitemaps.org default-ns) — de eigen XML-lezer heeft daar geen last van. " +
        "46 urls met 'capacit', 28 met 'congest', waaronder /zakelijk/energietransitie/beschikbare-netcapaciteit/.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 720,
    maxItemsPerOphaling: 300,
    maxBytes: 8_388_608,
    actief: true,
    inactiefReden: null,
    bewaren: "url, lastmod en pagerubriek.",
    config: { robotsQuirk: "robots.txt wordt met HTTP 404 geserveerd terwijl er wel directives in de body staan" },
    notities:
      "De robots-body blokkeert /sitecore/, /demo/ en een energietransitieportaal-map, maar wordt met status " +
      "404 geserveerd. Beide lezingen (404 = geen beperking, of de body honoreren) laten /sitemap.xml vrij.",
    urlPatroon: /\/(.*congest|.*capacit|.*energiehub|.*open-data)/i,
  },
  {
    ...STANDAARD,
    sleutel: "coteq-nieuws",
    uitgever: "Coteq Netbeheer",
    uitgeverSoort: "netbeheerder",
    soort: "sitemap",
    basisUrl: "https://coteqnetbeheer.nl",
    // Bewust de in robots.txt aangekondigde index, niet de losse
    // sectiesitemap: de aankondiging is onze grondslag, en de index
    // wijst zelf naar de nieuwssectie.
    endpointUrl: "https://coteqnetbeheer.nl/sitemap.xml",
    toegestaneHosts: ["coteqnetbeheer.nl", "www.coteqnetbeheer.nl"],
    onderwerpen: ["netcongestie", "netbeheer"],
    isPrimaireBron: true,
    betrouwbaarheid: 4,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "Craft CMS sectiesitemap, HTTP 200, 22.270 bytes, 108 <loc>-entries met bijbehorende <lastmod>. " +
        "Dit is de nieuwssectie: alle urls zijn https://coteqnetbeheer.nl/nieuws/<slug>. Nieuwste lastmod " +
        "2026-09-30, item 'overgangsregeling-geeft-inzicht-in-transportcapaciteit-voor-2-143-woningen'.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 1440,
    actief: true,
    inactiefReden: null,
    bewaren: "url, lastmod, titel uit de slug.",
    config: {},
    notities:
      "robots.txt blokkeert alleen /cpresources/ en kondigt /sitemap.xml aan. Dat is een " +
      "sitemapindex; de collector volgt de subsitemaps en houdt alleen /nieuws/ over. " +
      "www.coteq.nl stuurt 301 hiernaartoe.",
    urlPatroon: /\/nieuws\//i,
  },
  {
    ...STANDAARD,
    sleutel: "westland-infra-nieuws",
    uitgever: "Westland Infra Netbeheer",
    uitgeverSoort: "netbeheerder",
    soort: "rss",
    basisUrl: "https://westlandinfra.nl",
    endpointUrl: "https://westlandinfra.nl/feed/",
    toegestaneHosts: ["westlandinfra.nl", "www.westlandinfra.nl"],
    onderwerpen: ["netbeheer", "netcongestie"],
    isPrimaireBron: true,
    betrouwbaarheid: 4,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "WordPress RSS 2.0, HTTP 200, application/rss+xml, 34.981 bytes, 10 <item>-elementen. Per item: " +
        "title (platte tekst), link, dc:creator, pubDate (RFC-822), category, guid, description, content:encoded.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 1440,
    maxItemsPerOphaling: 10,
    actief: true,
    inactiefReden: null,
    bewaren: "titel, url, datum, eigen samenvatting.",
    config: {},
    notities: "robots.txt blokkeert /wp-admin/ met een Allow op admin-ajax.php. Venster is vast 10 items.",
  },
  {
    ...STANDAARD,
    sleutel: "rendo-nieuws",
    uitgever: "RENDO Groep",
    uitgeverSoort: "netbeheerder",
    soort: "rss",
    basisUrl: "https://www.rendogroep.nl",
    endpointUrl: "https://www.rendogroep.nl/feed/",
    toegestaneHosts: ["www.rendogroep.nl", "rendogroep.nl"],
    onderwerpen: ["netbeheer", "netcongestie"],
    isPrimaireBron: true,
    betrouwbaarheid: 4,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "WordPress RSS 2.0, HTTP 200, 44.827 bytes, 10 <item>-elementen met hetzelfde WP-veldenset. " +
        "Nieuwste item 2026-09-24. www.rendo.nl stuurt 301 naar rendogroep.nl.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 1440,
    maxItemsPerOphaling: 10,
    actief: true,
    inactiefReden: null,
    bewaren: "titel, url, datum, eigen samenvatting.",
    config: {},
    notities: "robots.txt (Yoast) heeft een lege Disallow, dus niets geblokkeerd.",
  },

  // ==========================================================
  // TOEZICHT EN REGELGEVING
  // ==========================================================
  {
    ...STANDAARD,
    sleutel: "acm-besluiten",
    uitgever: "Autoriteit Consument & Markt",
    uitgeverSoort: "toezichthouder",
    soort: "rss",
    basisUrl: "https://www.acm.nl",
    endpointUrl: "https://www.acm.nl/nl/nieuws/rss/publicaties?publication_type%5B0%5D=2",
    toegestaneHosts: ["www.acm.nl", "acm.nl"],
    onderwerpen: ["regelgeving", "netbeheer", "marktprijs"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "RSS 2.0 met dc-namespace, HTTP 200, application/rss+xml, 10 <item>-elementen. Velden: title, link, " +
        "description, pubDate, dc:creator, guid (uuid, isPermaLink=false). Gemeten energie-items: " +
        "'Geschilbesluit ZonOffensief - Stedin', 'Eerste klankbordgroep kostengebaseerde tariefregulering warmte'. " +
        "publication_type[0]=2 versmalt meetbaar; een subject-filter doet dat NIET (byte-identieke payload).",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 360,
    maxItemsPerOphaling: 10,
    actief: true,
    inactiefReden: null,
    bewaren: "titel, url, datum, besluitsoort, eigen samenvatting.",
    config: { publicationType: 2 },
    notities:
      "Rollend venster van 10 items, dus minstens dagelijks ophalen of er vallen besluiten tussenuit. " +
      "Het energie-subjectfilter van ACM werkt niet; filteren gebeurt dus bij ons op onderwerpsignalen.",
  },
  {
    ...STANDAARD,
    sleutel: "rvo-opendata-artikelen",
    uitgever: "Rijksdienst voor Ondernemend Nederland",
    uitgeverSoort: "rijksoverheid",
    soort: "json_api",
    basisUrl: "https://www.rvo.nl",
    endpointUrl: "https://www.rvo.nl/api/v1/opendata/articles",
    toegestaneHosts: ["www.rvo.nl", "rvo.nl"],
    onderwerpen: ["subsidie", "regelgeving", "zonne-energie", "vastgoedverduurzaming"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: null,
    licentieUrl: "https://www.rvo.nl",
    hergebruikVerklaring:
      "De informatie van RVO is namelijk openbaar. U mag deze hergebruiken.",
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "Kale JSON-array van 50 objecten zonder envelope, HTTP 200. Gemeten velden per item: id (uuid), " +
        "title, created, changed (ISO8601 met offset), intro, countries[{name,isoalpha2}], sectors[] " +
        "(o.a. 'Energiesector'), subjects[], subsidies[], tags[], targets[], type, url. " +
        "RVO's open-dataverklaring: 'De informatie van RVO is namelijk openbaar. U mag deze hergebruiken.'",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 720,
    maxItemsPerOphaling: 50,
    actief: true,
    inactiefReden: null,
    bewaren: "titel, url, created/changed, sectoren, subsidieverwijzingen, intro als brontekst voor claimextractie.",
    config: {
      itemsPad: "",
      idVeld: "id",
      titelVelden: ["title"],
      datumVelden: ["changed", "created"],
      urlVeld: "url",
      tekstVelden: ["intro"],
      extraVelden: ["sectors", "subjects", "subsidies", "type"],
    },
    notities:
      "Subsidiepagina's veranderen op deadlines; `changed` is de wijzigingsdetector. " +
      "Een openapi.yaml is niet vindbaar (HTTP 400 'Invalid slug'), dus het paginatiecontract is onbekend.",
  },
  {
    ...STANDAARD,
    sleutel: "rvo-subsidie-sitemap",
    uitgever: "Rijksdienst voor Ondernemend Nederland",
    uitgeverSoort: "rijksoverheid",
    soort: "sitemap",
    basisUrl: "https://www.rvo.nl",
    endpointUrl: "https://www.rvo.nl/sitemap.xml",
    toegestaneHosts: ["www.rvo.nl", "rvo.nl"],
    onderwerpen: ["subsidie", "regelgeving"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: null,
    licentieUrl: "https://www.rvo.nl",
    hergebruikVerklaring:
      "De informatie van RVO is namelijk openbaar. U mag deze hergebruiken.",
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "Vlakke <urlset> (geen index), HTTP 200, 12.970 <url>-blokken en alle 12.970 hebben <lastmod>. " +
        "61 urls onder /nieuws. Energierelevante families aanwezig: /subsidies-financiering/sde/aanvragen/*, " +
        "en lastmod-waarden tot de dag voor de meting.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 1440,
    maxItemsPerOphaling: 400,
    maxBytes: 16_777_216,
    actief: true,
    inactiefReden: null,
    bewaren: "url en lastmod van subsidiepagina's, als verloopdetector voor subsidieclaims.",
    config: {},
    notities:
      "Dit is de enige betrouwbare manier om te zien dat een SDE- of ISDE-pagina is gewijzigd. " +
      "Juist daarvoor is de houdbaarheidslaag in intel.uitspraken gebouwd.",
    urlPatroon: /\/(subsidies-financiering|nieuws)/i,
    uitsluitPatroon: /\/subsidies-financiering\/tvl\//i,
  },
  {
    ...STANDAARD,
    sleutel: "rijksoverheid-nieuws",
    uitgever: "Rijksoverheid",
    uitgeverSoort: "rijksoverheid",
    soort: "sitemap",
    basisUrl: "https://www.rijksoverheid.nl",
    endpointUrl: "https://www.rijksoverheid.nl/news/sitemap.xml",
    toegestaneHosts: ["www.rijksoverheid.nl", "rijksoverheid.nl"],
    onderwerpen: ["regelgeving", "subsidie"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: null,
    licentieUrl: "https://www.rijksoverheid.nl/opendata",
    hergebruikVerklaring:
      "U mag openbare informatie van de Rijksoverheid hergebruiken.",
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "Google-News-formaat <urlset> met news-namespace, HTTP 200, 13 <url>-entries (kort rollend venster). " +
        "Gemeten entry: /actueel/nieuws/2026/10/09/eu-wijst-4-nederlandse-projecten-aan-als-strategisch-voor-" +
        "kritieke-grondstoffen, met news:publication_date en news:title. " +
        "De oude open-data-API (opendata.rijksoverheid.nl/v1/infotypes/*) geeft 404 en elke RSS-variant ook.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 180,
    maxItemsPerOphaling: 20,
    actief: true,
    inactiefReden: null,
    bewaren: "titel, url, publicatiedatum.",
    config: {},
    notities:
      "Venster van 13 items met dagverse tijdstempels: minder vaak dan elke paar uur ophalen betekent " +
      "gemiste items. Dit is de werkende vervanger van de verdwenen nieuws-API.",
  },

  // ==========================================================
  // STATISTIEK EN GEOGRAFIE
  // ==========================================================
  {
    ...STANDAARD,
    sleutel: "cbs-datasets-catalogus",
    uitgever: "Centraal Bureau voor de Statistiek",
    uitgeverSoort: "statistiek",
    soort: "odata",
    basisUrl: "https://datasets.cbs.nl",
    endpointUrl:
      "https://datasets.cbs.nl/odata/v1/CBS/Datasets?$filter=contains(Title,'nergie')%20or%20contains(Title,'lektriciteit')&$select=Identifier,Title,Status,Modified,ObservationCount,ObservationsModified",
    toegestaneHosts: ["datasets.cbs.nl"],
    onderwerpen: ["statistiek", "marktprijs", "zonne-energie"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: "CC BY 4.0",
    licentieUrl: "https://www.cbs.nl/nl-nl/over-ons/website/copyright",
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "OData v4 JSON {@odata.context, value:[...]}, HTTP 200. Gemeten velden per dataset: Identifier, " +
        "Title, Status, Modified, ObservationCount, ObservationsModified, ReleaseDate, Distributions. " +
        "Echte ids: 84575NED 'Elektriciteitsbalans; aanbod en verbruik', 85666NED 'Eindverbruikersprijzen " +
        "aardgas en elektriciteit', 85004NED 'Hernieuwbare energie; zonnestroom, windenergie, RES-regio'. " +
        "CBS stelt: 'Creative Commons Naamsvermelding (CC BY 4.0)' met verplichte naamsvermelding. " +
        "robots.txt op datasets.cbs.nl geeft 404; de legacy host opendata.cbs.nl blokkeert juist " +
        "/ODataAPI/OData/* en wordt daarom niet gebruikt.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 1440,
    maxItemsPerOphaling: 150,
    actief: true,
    inactiefReden: null,
    bewaren:
      "dataset-id, titel, Modified en ObservationsModified. Observaties worden pas per tabel opgehaald " +
      "als een claim ze nodig heeft; naamsvermelding CBS is verplicht bij hergebruik.",
    config: {
      itemsPad: "value",
      idVeld: "Identifier",
      titelVelden: ["Title"],
      datumVelden: ["ObservationsModified", "Modified", "ReleaseDate"],
      urlSjabloon: "https://opendata.cbs.nl/statline/#/CBS/nl/dataset/{Identifier}/table",
      extraVelden: ["Status", "ObservationCount"],
    },
    notities:
      "Dit is een catalogusbron: hij detecteert dat een energietabel is bijgewerkt. De cijfers zelf " +
      "komen uit /Observations van de betreffende tabel, met de naamsvermeldingsplicht erbij.",
  },
  {
    ...STANDAARD,
    sleutel: "pdok-bestuurlijke-gebieden",
    uitgever: "PDOK / Kadaster",
    uitgeverSoort: "geodata",
    soort: "json_api",
    basisUrl: "https://api.pdok.nl",
    endpointUrl:
      "https://api.pdok.nl/kadaster/brk-bestuurlijke-gebieden/ogc/v1/collections/gemeentegebied/items?f=json&limit=500",
    toegestaneHosts: ["api.pdok.nl", "service.pdok.nl"],
    onderwerpen: ["geografie"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: "CC BY 4.0",
    licentieUrl: "https://creativecommons.org/licenses/by/4.0/deed.nl",
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "OGC API Features GeoJSON, HTTP 200. Gemeten properties op provinciegebied: code ('24'), " +
        "identificatie ('PV24'), ligt_in_land_code, ligt_in_land_naam, naam ('Flevoland'). " +
        "/collections noemt exact drie collecties: gemeentegebied, provinciegebied, landgebied. " +
        "De licentie staat machinaleesbaar in de API zelf: links[] bevat " +
        "{'rel':'license','title':'CC BY 4.0','href':'https://creativecommons.org/licenses/by/4.0/deed.nl'}. " +
        "robots.txt op api.pdok.nl: 'Allow: /' met alleen /bzk/locatieserver/* verboden.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 10_080,
    maxItemsPerOphaling: 500,
    maxBytes: 52_428_800,
    actief: true,
    inactiefReden: null,
    levertGebeurtenissen: false,
    bewaren: "gemeente- en provinciecodes met naam, als referentiegeografie. Geen geometrie opslaan.",
    config: {
      geoSoort: "gemeente",
      // OGC API Features levert een FeatureCollection; de lijst zit in
      // `features` en de bruikbare waarden in `properties`.
      itemsPad: "features",
      idVeld: "properties.identificatie",
      titelVelden: ["properties.naam"],
      datumVelden: [],
      urlSjabloon:
        "https://api.pdok.nl/kadaster/brk-bestuurlijke-gebieden/ogc/v1/collections/gemeentegebied/items/{properties.identificatie}",
      extraVelden: [
        "properties.code",
        "properties.naam",
        "properties.identificatie",
        "properties.ligt_in_provincie_code",
        "properties.ligt_in_provincie_naam",
      ],
    },
    notities:
      "Vult intel.geo_bereiken. De legacy Locatieserver (/bzk/locatieserver/*) is expliciet verboden in " +
      "robots.txt; voor adreszoeken is de Location API de opvolger.",
  },

  // ==========================================================
  // MARKT EN PRIJS
  // ==========================================================
  {
    ...STANDAARD,
    sleutel: "energy-charts-dayahead-nl",
    uitgever: "Fraunhofer ISE (Energy-Charts)",
    uitgeverSoort: "marktplatform",
    soort: "tijdreeks",
    basisUrl: "https://api.energy-charts.info",
    // Zonder datumvenster geeft dit endpoint 404 (gemeten). Een vaste
    // datum in het register zou binnen een dag verlopen, dus staan er
    // plaatshouders in die bij het ophalen worden opgelost.
    endpointUrl: "https://api.energy-charts.info/price?bzn=NL&start={3_dagen_terug}&end={morgen}",
    toegestaneHosts: ["api.energy-charts.info"],
    onderwerpen: ["marktprijs", "flexibiliteit"],
    isPrimaireBron: false,
    betrouwbaarheid: 4,
    licentie: "CC BY 4.0",
    licentieUrl: "https://creativecommons.org/licenses/by/4.0",
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "JSON, HTTP 200, 3.509 bytes voor een dag. Gemeten keys: license_info, unix_seconds (192 entries, " +
        "kwartierresolutie), price (192 floats, EUR/MWh), unit ('EUR / MWh'), deprecated (false). " +
        "De licentie staat IN elke payload: 'CC BY 4.0 ... from Bundesnetzagentur | SMARD.de'. " +
        "robots.txt geeft 404; de API is expliciet bedoeld voor programmatisch gebruik.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 720,
    maxItemsPerOphaling: 200,
    actief: true,
    inactiefReden: null,
    bewaren: "tijdreeks van day-ahead prijzen voor biedzone NL, met bronvermelding Bundesnetzagentur/SMARD.",
    config: {
      tijdVeld: "unix_seconds",
      waardeVeld: "price",
      eenheidVeld: "unit",
      licentieVeld: "license_info",
      citatieUrl: "https://api.energy-charts.info/price?bzn=NL",
      reeksNaam: "day-ahead NL",
    },
    notities:
      "Keuze boven ENTSO-E (401 zonder securityToken) en boven EnergyZero (ongedocumenteerde commerciele " +
      "API zonder licentie). Dit is de enige prijsbron met een expliciete licentie in de respons.",
  },

  // ==========================================================
  // AANBESTEDINGEN
  // ==========================================================
  {
    ...STANDAARD,
    sleutel: "tenderned-publicaties",
    uitgever: "TenderNed",
    uitgeverSoort: "aanbestedingen",
    soort: "json_api",
    basisUrl: "https://www.tenderned.nl",
    endpointUrl:
      "https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties?page=0&size=100&cpvCodes=09300000-5",
    toegestaneHosts: ["www.tenderned.nl", "tenderned.nl"],
    onderwerpen: ["aanbesteding", "bess", "zonne-energie", "laadinfrastructuur"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: "CC0 1.0",
    licentieUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.nl",
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "Spring-paged JSON, HTTP 200. Gemeten keys: content, first, last, totalElements, totalPages, size, " +
        "numberOfElements, number. Per item: publicatieId, publicatieDatum, typePublicatie{code,omschrijving}, " +
        "aanbestedingNaam, opdrachtgeverNaam. Voor publicatieDatumVanaf=2026-10-01 was totalElements=802. " +
        "Belangrijk: een trefwoordfilter wordt STIL genegeerd (totalElements bleef op het ongefilterde " +
        "146.314); alleen cpvCodes werkt, en de CPV-controlecijfer is verplicht (09300000 geeft HTTP 400, " +
        "09300000-5 werkt). Licentie CC0 1.0 volgens TenderNeds eigen open-datarecord.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 360,
    maxItemsPerOphaling: 100,
    maxBytes: 8_388_608,
    actief: true,
    inactiefReden: null,
    bewaren: "publicatieId, datum, type, aanbestedingsnaam, opdrachtgever. Dit is een commercieel signaal.",
    config: {
      itemsPad: "content",
      idVeld: "publicatieId",
      titelVelden: ["aanbestedingNaam"],
      datumVelden: ["publicatieDatum"],
      urlSjabloon: "https://www.tenderned.nl/aankondigingen/overzicht/{publicatieId}",
      extraVelden: ["opdrachtgeverNaam", "typePublicatie.code", "typePublicatie.omschrijving"],
      cpvCodes: ["09300000-5"],
    },
    notities:
      "CPV 09300000-5 is elektriciteit/energie. Het trefwoordfilter mag NOOIT gebruikt worden: het wordt " +
      "stil genegeerd en levert dan de hele landelijke stroom aanbestedingen op.",
  },
  {
    ...STANDAARD,
    sleutel: "tenderned-laatste-publicatie",
    uitgever: "TenderNed",
    uitgeverSoort: "aanbestedingen",
    soort: "atom",
    basisUrl: "https://www.tenderned.nl",
    // Bewust direct het eindadres: de oude /tenderned-rss-web/-URL
    // verwijst via /cms/..., en /cms staat in TenderNeds eigen
    // Disallow. De keten was https -> /cms -> http -> https; het
    // eindpunt hieronder is toegestaan en vermijdt beide problemen.
    endpointUrl: "https://www.tenderned.nl/papi/tenderned-rs-tns/rss/laatste-publicatie.rss",
    toegestaneHosts: ["www.tenderned.nl", "tenderned.nl"],
    onderwerpen: ["aanbesteding"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: "CC0 1.0",
    licentieUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.nl",
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "Content-Type application/atom+xml ondanks de .rss-extensie, HTTP 200, 25 atom:entry-elementen. " +
        "Gemeten elementen: atom:title, atom:link@href, atom:updated, atom:id, atom:published, " +
        "atom:author/atom:name (bijv. 'Gemeente Dijk en Waard'), atom:content[type=html], atom:summary. " +
        "Nieuwste entry was dezelfde ochtend als de meting.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 60,
    maxItemsPerOphaling: 25,
    actief: true,
    inactiefReden: null,
    bewaren: "titel, url, datum, opdrachtgever.",
    config: {},
    notities:
      "Snelle wijzigingsdetector naast de gefilterde API: 25 items, continu verversend. Onderwerpfiltering " +
      "gebeurt bij ons, want de feed is niet op CPV te filteren.",
  },

  // ==========================================================
  // VAKMEDIA — alleen waar de uitgever geen AI-crawler uitsluit
  // ==========================================================
  {
    ...STANDAARD,
    sleutel: "energy-storage-nl",
    uitgever: "Energy Storage NL",
    uitgeverSoort: "branchevereniging",
    soort: "rss",
    basisUrl: "https://energystoragenl.nl",
    endpointUrl: "https://energystoragenl.nl/feed/",
    toegestaneHosts: ["energystoragenl.nl", "www.energystoragenl.nl"],
    onderwerpen: ["bess", "flexibiliteit", "netcongestie", "regelgeving"],
    isPrimaireBron: false,
    betrouwbaarheid: 4,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "RSS 2.0, HTTP 200, application/rss+xml, 10 <item>-elementen. Velden: title, link, dc:creator, " +
        "pubDate, guid, description, content:encoded (geen category). Gemeten items: 'ESNL-reactie op " +
        "Kamerbrief netcongestie', 'Nationale Actieagenda Batterijsystemen zet goede richting uit'. " +
        "robots.txt is een permissief Yoast-blok (lege Disallow).",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 720,
    maxItemsPerOphaling: 10,
    actief: true,
    inactiefReden: null,
    bewaren: "titel, url, datum, eigen samenvatting. Standpunten van de brancheorganisatie zijn geen feiten.",
    config: {},
    notities:
      "Brancheorganisatie voor energieopslag: het dichtst bij de kern van Vibe. Let op dat een " +
      "belangenstandpunt als interpretatie wordt vastgelegd, niet als feit.",
  },
  {
    ...STANDAARD,
    sleutel: "solar365",
    uitgever: "Solar365",
    uitgeverSoort: "vakmedium",
    soort: "rss",
    basisUrl: "https://www.solar365.nl",
    endpointUrl: "https://www.solar365.nl/rss/news/",
    toegestaneHosts: ["www.solar365.nl", "solar365.nl"],
    onderwerpen: ["zonne-energie", "bess", "netcongestie"],
    isPrimaireBron: false,
    betrouwbaarheid: 3,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "RSS 2.0, HTTP 200, text/xml, 20 <item>-elementen. Velden: title, description (echte samenvatting " +
        "van 213-256 tekens), enclosure, author, pubDate, category, link, guid. Gemeten item: " +
        "'Groei wachtlijsten voor netaansluiting vlakt af, maar vraag naar capaciteit blijft stijgen'.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 480,
    maxItemsPerOphaling: 20,
    actief: true,
    inactiefReden: null,
    bewaren: "titel, url, datum, eigen samenvatting. Vakmedia zijn secundair: altijd naar de primaire bron zoeken.",
    config: {},
    notities: "Secundaire bron. Dient vooral om een primaire publicatie te vinden die we gemist hebben.",
  },
  {
    ...STANDAARD,
    sleutel: "warmte365",
    uitgever: "Warmte365",
    uitgeverSoort: "vakmedium",
    soort: "rss",
    basisUrl: "https://www.warmte365.nl",
    endpointUrl: "https://www.warmte365.nl/rss/news/",
    toegestaneHosts: ["www.warmte365.nl", "warmte365.nl"],
    onderwerpen: ["vastgoedverduurzaming", "regelgeving", "marktprijs"],
    isPrimaireBron: false,
    betrouwbaarheid: 3,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "RSS 2.0, HTTP 200, text/xml, 20 <item>-elementen met hetzelfde veldenset als Solar365; " +
        "description 253-309 tekens. Gemeten items: 'ACM verkort dure winterpiek voor warmtepompen', " +
        "'Oosterberg neemt klimaatspecialist Cevetech over'.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 720,
    maxItemsPerOphaling: 20,
    actief: true,
    inactiefReden: null,
    bewaren: "titel, url, datum, eigen samenvatting.",
    config: {},
    notities: "Secundaire bron, nuttig voor tariefbesluiten en installatiemarkt.",
  },
  {
    ...STANDAARD,
    sleutel: "installatie-nl",
    uitgever: "Installatie.nl",
    uitgeverSoort: "vakmedium",
    soort: "rss",
    basisUrl: "https://www.installatie.nl",
    endpointUrl: "https://www.installatie.nl/feed/",
    toegestaneHosts: ["www.installatie.nl", "installatie.nl"],
    onderwerpen: ["vastgoedverduurzaming", "subsidie", "netcongestie"],
    isPrimaireBron: false,
    betrouwbaarheid: 3,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "RSS 2.0, HTTP 200, application/rss+xml, 1,15 MB, 1000 <item>-elementen in één aanroep. " +
        "Velden: title, link, dc:creator, pubDate, category (2-4 per item), guid, description (teaser van " +
        "~150 tekens), premium. content:encoded is AFWEZIG. 21% van de items heeft premium=1, dus het " +
        "volledige artikel zit achter een abonnement; die worden niet gevolgd.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 1440,
    maxItemsPerOphaling: 60,
    maxBytes: 4_194_304,
    actief: true,
    inactiefReden: null,
    bewaren: "titel, url, datum, teaser. Premium-items worden niet verder opgehaald.",
    config: { premiumVeld: "premium", slaPremiumOver: true },
    notities:
      "Diep archief in één aanroep; nuttig voor een eenmalige terugvulling. Let op de bytegrens: " +
      "dit is met 1,15 MB de grootste feed in het register.",
  },
  {
    ...STANDAARD,
    sleutel: "elaad-laadinfra",
    uitgever: "ElaadNL",
    uitgeverSoort: "branchevereniging",
    soort: "rss",
    basisUrl: "https://www.elaad.nl",
    endpointUrl: "https://www.elaad.nl/feed/",
    toegestaneHosts: ["www.elaad.nl", "elaad.nl"],
    onderwerpen: ["laadinfrastructuur", "flexibiliteit", "netcongestie"],
    isPrimaireBron: true,
    betrouwbaarheid: 4,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "RSS 2.0, HTTP 200, 12 <item>-elementen met title, link, dc:creator, pubDate, category, guid, " +
        "description, content:encoded. Gemeten item: 'Nationaal Laadonderzoek 2026: EV-rijders positief " +
        "over aanpassen laadgedrag' (2026-10-09). De feed werkt dus.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 1440,
    maxItemsPerOphaling: 12,
    actief: false,
    inactiefReden:
      "De verifieerstap heeft robots.txt van elaad.nl geparseerd: /feed/ is voor ons toegestaan, maar " +
      "CCBot wordt volledig uitgesloten ('Disallow: /'). De andere AI-agents (anthropic-ai, Claude-Web, " +
      "ClaudeBot, GPTBot) staan in een groep die alleen Crawl-delay zet en dus NIET uitsluit. Eén " +
      "volledige uitsluiting is onder het toestemmingsbeleid genoeg voor een voorbehoud, dus deze bron " +
      "blijft uit. Omkeerbaar met een expliciet eigenaarsbesluit.",
    bewaren: "n.v.t. zolang de bron uit staat.",
    config: {},
    notities:
      "Inhoudelijk een van de meest relevante bronnen voor laadplein-werk. Het staat of valt bij de " +
      "robots-uitkomst; dit is precies het geval waarvoor de verifieer-stap bestaat.",
  },
  {
    ...STANDAARD,
    sleutel: "logistiek-hotspots",
    uitgever: "Logistiek.nl (Vakmedianet)",
    uitgeverSoort: "vakmedium",
    soort: "rss",
    basisUrl: "https://www.logistiek.nl",
    endpointUrl: "https://cms.logistiek.nl/rss_feed/logistieke-hotspots/",
    toegestaneHosts: ["cms.logistiek.nl", "www.logistiek.nl", "logistiek.nl"],
    onderwerpen: ["vastgoedverduurzaming", "laadinfrastructuur"],
    isPrimaireBron: false,
    betrouwbaarheid: 3,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "onbekend",
    tdmStatus: "geen_voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "RSS 2.0, HTTP 200, 100 <item>-elementen. Velden: title, link, guid, description (teaser 187+ tekens), " +
        "content:encoded, category, maintag, tags, taglinks, enclosure, thumbnail, pubDate, modifiedDate, " +
        "vmntype. Gemeten caveats: <content> is op elk geinspecteerd item AFWEZIG en <taglinks> bevat " +
        "alleen witruimte.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 1440,
    maxItemsPerOphaling: 50,
    actief: false,
    inactiefReden:
      "cms.logistiek.nl/robots.txt geeft HTTP 429 en blijft dat na drie pogingen doen: unreachable " +
      "volgens RFC 9309, dus geen leesbaar beleid. De feed zelf zou onder 'syndicatieformaat' mogen, " +
      "maar zolang robots onbereikbaar is halen we niet op. Daarnaast is Logistiek.nl een deels betaalde " +
      "titel zonder licentieverklaring; volledige artikelen worden nooit gevolgd.",
    bewaren: "n.v.t. zolang de bron uit staat.",
    config: {},
    notities:
      "Zou de beste publiek verifieerbare bron voor distributiecentrum-ontwikkeling zijn — precies het " +
      "commerciele signaal uit module D. Vraagt een expliciete grondslag van de uitgever.",
  },

  // ==========================================================
  // UIT — met gemeten reden
  // ==========================================================
  {
    ...STANDAARD,
    sleutel: "koop-staatscourant-energie",
    uitgever: "KOOP / Officiële Bekendmakingen",
    uitgeverSoort: "rijksoverheid",
    soort: "sru",
    basisUrl: "https://repository.overheid.nl",
    endpointUrl:
      "https://repository.overheid.nl/sru?operation=searchRetrieve&version=2.0&query=c.product-area%3D%3Dofficielepublicaties%20and%20w.publicatienaam%3D%3D%22Staatscourant%22%20and%20dt.title%20any%20%22energie%22&maximumRecords=50&sortKeys=dt.available,,0",
    toegestaneHosts: ["repository.overheid.nl"],
    onderwerpen: ["regelgeving", "subsidie", "netbeheer"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "verboden",
    tdmStatus: "onbekend",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "SRU 2.0 searchRetrieveResponse, HTTP 200, numberOfRecords=637 voor deze query. Gemeten elementen " +
        "per record: dcterms:title, dcterms:identifier (stcrt-2023-35277), dcterms:type, dcterms:available, " +
        "dcterms:creator ('Ministerie van Economische Zaken en Klimaat', 'Autoriteit Consument en Markt'). " +
        "De data is dus echt en bruikbaar.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 1440,
    maxItemsPerOphaling: 50,
    maxBytes: 8_388_608,
    actief: false,
    inactiefReden:
      "repository.overheid.nl/robots.txt is exact 26 bytes: 'User-agent: *' / 'Disallow: /'. Zelf gemeten " +
      "op 2026-10-10. Er is geen permissieve alternatieve host: /sru?operation=explain geeft 404 op " +
      "www.officielebekendmakingen.nl en op zoek.officielebekendmakingen.nl, en 200 alleen hier. " +
      "zoekservice.overheid.nl heeft dezelfde blanket-disallow. Dit is een beleidsbesluit voor de " +
      "eigenaar, geen technisch probleem.",
    bewaren: "n.v.t. zolang de bron uit staat.",
    config: {},
    notities:
      "Dit is de meest waardevolle gemiste bron: Staatscourant, ACM-codebesluiten (5149 records), " +
      "Kamerstukken (3999) en Gemeenteblad-vergunningen (2104 voor 'zonnepark', 15 voor 'batterijopslag' " +
      "sinds september) komen allemaal hiervandaan. Zie docs/ARCHITECTUUR.md sectie 9.",
  },
  {
    ...STANDAARD,
    sleutel: "koop-gemeenteblad-vergunningen",
    uitgever: "KOOP / Officiële Bekendmakingen",
    uitgeverSoort: "rijksoverheid",
    soort: "sru",
    basisUrl: "https://repository.overheid.nl",
    endpointUrl:
      "https://repository.overheid.nl/sru?operation=searchRetrieve&version=2.0&query=c.product-area%3D%3Dofficielepublicaties%20AND%20w.organisatietype%3D%3Dgemeente%20AND%20cql.textAndIndexes%3D%22batterijopslag%22&maximumRecords=50&sortKeys=dt.available,,0",
    toegestaneHosts: ["repository.overheid.nl"],
    onderwerpen: ["vergunning", "bess", "zonne-energie"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "verboden",
    tdmStatus: "onbekend",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "SRU 2.0, HTTP 200, recordSchema gzd. numberOfRecords=15 voor 'batterijopslag' vanaf 2026-09-01. " +
        "Gemeten velden: identifier (gmb-2026-471966), title, type ('omgevingsvergunning', 'ruimtelijk plan " +
        "of omgevingsdocument'), creator (gemeentenaam), gzd:preferredUrl, plus WGS84-coordinaten per record.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 1440,
    maxItemsPerOphaling: 50,
    maxBytes: 8_388_608,
    actief: false,
    inactiefReden: "Zelfde blanket-disallow op repository.overheid.nl. Zie koop-staatscourant-energie.",
    bewaren: "n.v.t. zolang de bron uit staat.",
    config: {},
    notities:
      "Zou de sterkste bron voor bewijsgebonden regionale impact zijn: een vergunning noemt de gemeente " +
      "zelf, dus grondslag 'bron_expliciet' in plaats van 'afgeleid'.",
  },
  {
    ...STANDAARD,
    sleutel: "tennet-publicaties",
    uitgever: "TenneT",
    uitgeverSoort: "netbeheerder",
    soort: "json_api",
    basisUrl: "https://api.tennet.eu",
    endpointUrl: "https://api.tennet.eu/publications/v1/settlement-prices",
    toegestaneHosts: ["api.tennet.eu", "developer.tennet.eu"],
    onderwerpen: ["netbeheer", "marktprijs", "flexibiliteit"],
    isPrimaireBron: true,
    betrouwbaarheid: 5,
    licentie: null,
    licentieUrl: "https://developer.tennet.eu/fair-use-policy/",
    robotsStatus: "toegestaan",
    tdmStatus: "onbekend",
    verificatie: {
      status: "onbevestigd",
      bewijs:
        "HTTP 403 zonder apikey (Azure Application Gateway, HTML-foutpagina). Geen payload verkregen. " +
        "Het contract is wel exact bekend uit de OpenAPI 3-specificatie op developer.tennet.eu, die WEL " +
        "geverifieerd is: verplichte query-params date_from/date_to in DD-MM-YYYY, verplichte Accept-kop, " +
        "securityScheme 'apikey'.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 720,
    actief: false,
    inactiefReden:
      "Vereist een apikey die via developer.tennet.eu aangevraagd moet worden; die hebben we niet. " +
      "Daarnaast sluit www.tennet.eu/robots.txt anthropic-ai, Claude-Web en ClaudeBot volledig uit, dus " +
      "de hoofdsite is geen alternatief. developer.tennet.eu zelf heeft geen enkele Disallow.",
    bewaren: "n.v.t. zolang de bron uit staat.",
    config: { vereistEnv: "INTEL_TENNET_APIKEY" },
    notities:
      "Zet INTEL_TENNET_APIKEY en zet actief op true zodra de sleutel binnen is. Levert onbalans, " +
      "settlementprijzen en grenscapaciteit per ISP van 15 minuten.",
  },
  {
    ...STANDAARD,
    sleutel: "energieonderbrekingen-storingen",
    uitgever: "Energieonderbrekingen.nl (gezamenlijke netbeheerders)",
    uitgeverSoort: "netbeheerder",
    soort: "json_api",
    basisUrl: "https://energieonderbrekingen.nl",
    endpointUrl: "https://energieonderbrekingen.nl/api/disruptions",
    toegestaneHosts: ["energieonderbrekingen.nl"],
    onderwerpen: ["netbeheer"],
    isPrimaireBron: true,
    betrouwbaarheid: 4,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "onbekend",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "Open JSON-array, HTTP 200, 208.452 bytes, 25 live elektriciteitsstoringen (Liander 13, Enexis 9, " +
        "Stedin 3). Gemeten keys per record: _id, version ('1.4'), id, source{EAN13,organisation,timestamp}, " +
        "network{delivery,metering,type}, period{plannedBegin,plannedEnd,begin,end}. Alle versioneerde " +
        "varianten (/api/v1/*, /api/v2/*) geven 401.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 60,
    actief: false,
    inactiefReden:
      "robots.txt geeft HTTP 200 maar levert de React index.html van de SPA, dus er is geen gepubliceerd " +
      "robotsbeleid; en er is geen licentieverklaring. Daarbij zijn alle versioneerde endpoints 401 — dit " +
      "lijkt een interne API met één deur open, en dat is geen grondslag om op te bouwen.",
    bewaren: "n.v.t. zolang de bron uit staat.",
    config: {},
    notities:
      "Storingen zijn voor het B2B-verhaal van Vibe ook niet kernrelevant; de kosten/baten van een " +
      "fragiele interne API wegen hier niet op.",
  },
  {
    ...STANDAARD,
    sleutel: "energeia",
    uitgever: "Energeia (FD Mediagroep)",
    uitgeverSoort: "vakmedium",
    soort: "rss",
    basisUrl: "https://www.energeia.nl",
    endpointUrl: "https://www.energeia.nl/rss/",
    toegestaneHosts: ["www.energeia.nl", "energeia.nl"],
    onderwerpen: ["marktprijs", "regelgeving", "netcongestie"],
    isPrimaireBron: false,
    betrouwbaarheid: 4,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "voorbehoud",
    verificatie: {
      status: "afgewezen",
      bewijs:
        "Niet opgehaald, met opzet. De verifieerstap heeft robots.txt geparseerd: het pad /rss/ is voor " +
        "ons technisch toegestaan, maar er worden negen AI-agents volledig uitgesloten (gptbot, " +
        "chatgpt-user, oai-searchbot, anthropic-ai, claude-web, claudebot, google-extended en meer), en " +
        "het bestand bevat daarnaast een expliciet TDM-voorbehoud in woorden: 'Scraping, harvesting, or " +
        "any other form of data or text mining, machine learning, or artificial intelligence purposes " +
        "... is expressly prohibited'.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 1440,
    actief: false,
    inactiefReden:
      "Uitgever verbiedt tekst- en datamining in woorden. Dit is een hard nee en geen afweging.",
    bewaren: "niets.",
    config: {},
    notities: "Inhoudelijk de beste energievakpers van Nederland, en juist daarom expliciet gesloten.",
  },
  {
    ...STANDAARD,
    sleutel: "solar-magazine",
    uitgever: "Solar & Storage Magazine",
    uitgeverSoort: "vakmedium",
    soort: "rss",
    basisUrl: "https://solarmagazine.nl",
    endpointUrl: "https://solarmagazine.nl/rss",
    toegestaneHosts: ["solarmagazine.nl", "www.solarmagazine.nl"],
    onderwerpen: ["zonne-energie", "bess", "netcongestie", "subsidie"],
    isPrimaireBron: false,
    betrouwbaarheid: 4,
    licentie: null,
    licentieUrl: null,
    robotsStatus: "toegestaan",
    tdmStatus: "voorbehoud",
    verificatie: {
      status: "geverifieerd",
      bewijs:
        "RSS 2.0, HTTP 200, application/xml, 22 items. Velden zijn exact vier: title, description " +
        "(echte samenvatting van 150-250 tekens), link, pubDate. Geen category, geen guid. " +
        "robots.txt zelf gemeten op 2026-10-10: 'User-agent: *' met Disallow op /cgi-bin/, /admin/, " +
        "/rest/, /api, /zoek — /rss is dus toegestaan — maar daarna 'User-agent: GPTBot / Disallow: /'.",
      op: GEMETEN_OP,
    },
    ophaalintervalMinuten: 480,
    maxItemsPerOphaling: 22,
    actief: false,
    inactiefReden:
      "GPTBot wordt volledig uitgesloten. Wij verwerken brontekst met een OpenAI-model, dus dat " +
      "voorbehoud raakt precies ons gebruik. Het toestemmingsbeleid (stap 2) zegt dan nee. " +
      "NB: dit wijkt af van wat het zusterplatform op 2026-09-15 vastlegde, namelijk dat Solar Magazine " +
      "ook ClaudeBot en CCBot uitsloot; dat is op 2026-10-10 niet meer in het bestand te vinden. " +
      "robots.txt verandert, dus de verifieer-stap hoort periodiek te draaien.",
    bewaren: "niets.",
    config: {},
    notities:
      "Omkeerbaar met een expliciet eigenaarsbesluit: alleen deterministisch verwerken (geen model) zou " +
      "het voorbehoud niet raken. Dat is een keuze, geen technische beperking.",
  },
];

export function bronOpSleutel(sleutel: string): Bron | undefined {
  return BRONNEN.find((b) => b.sleutel === sleutel);
}

export function actieveBronnen(): readonly Bron[] {
  return BRONNEN.filter((b) => b.actief);
}
