/* ============================================================
   BRONNEN — storingstaxonomie
   ------------------------------------------------------------
   Waarom een bron niet levert, in elf soorten. Het punt van deze
   module is dat elke soort een ANDER antwoord vraagt:

     opnieuw proberen        TIJDELIJKE_STORING, NETWERKFOUT
     langzamer proberen      SNELHEIDSBEGRENSD
     niet meer proberen      TOEGANG_BEPERKT, NIET_GEAUTORISEERD, AFGESCHAFT
     firewall laten openen   CDN_BLOKKADE
     eerst oorzaak zoeken    TOEGANG_ONBEKEND
     code repareren          ONTLEDING_MISLUKT
     adres repareren         ONGELDIG_ENDPOINT
     niets doen              LEEG_MAAR_GEZOND

   Zonder dat onderscheid werd elke niet-levering 'DEGRADED' met een
   vrije tekst, en dan is er geen handeling uit af te leiden. Gemeten op
   12 oktober 2026 stonden drie bronnen op DEGRADED met drie
   verschillende oorzaken, en ALLE DRIE bleken bij een live probe weer
   te werken:

     rvo-subsidie-sitemap  opgeslagen HTTP 500, live HTTP 200 (1,86 MB)
     rendo-nieuws          gerapporteerd 403, live HTTP 200 (44 KB)
     tenderned (2 bronnen) robots.txt 302 naar /cms/robots.txt; bij vijf
                           pogingen vier keer 200 en een keer 503

   Dat laatste is de les van deze module: TenderNed hapert, hij sluit ons
   niet buiten. Een taxonomie die 'robots.txt onleesbaar' op een hoop
   gooit met 'robots.txt verbiedt dit pad' zou die bron een week
   opschorten terwijl hij vier van de vijf keer gewoon antwoordt.

   WAT DEZE MODULE NIET DOET
   Hij omzeilt niets. Een bron die ons buitensluit wordt opgeschort, niet
   met een andere User-Agent opnieuw benaderd en niet via een proxy
   gehaald. Dat is een expliciete opdrachteis en het is ook gewoon de
   afspraak met een uitgever.

   Dat geldt ONVERKORT voor CDN_BLOKKADE, en daar is het verleidelijker:
   bij rendo-nieuws geeft een andere netwerkherkomst gewoon HTTP 200.
   Precies daarom staat het hier. Een firewall die ons weigert, is een
   toegangscontrole; er omheen routeren is een omzeiling, ook als de
   robots.txt van die uitgever het crawlen toestaat. De remedie is de
   uitzondering VRAGEN. Een eenheidstoets bewaakt dat geen enkele
   handelingstekst een technische uitweg voorstelt.
   ============================================================ */

/** De elf soorten. Zie migratie 0028 en 0037 voor de check constraint. */
export type Storingssoort =
  | "TIJDELIJKE_STORING"
  | "TOEGANG_BEPERKT"
  | "SNELHEIDSBEGRENSD"
  | "ONGELDIG_ENDPOINT"
  | "ONTLEDING_MISLUKT"
  | "LEEG_MAAR_GEZOND"
  | "AFGESCHAFT"
  | "NIET_GEAUTORISEERD"
  | "NETWERKFOUT"
  /**
   * Een CDN of WAF weigert ONS NETWERK; de uitgever heeft niets
   * verboden. Aantoonbaar aan CDN-bewijs in het antwoord.
   *
   * Dit is een EIGEN soort en geen variant van TOEGANG_BEPERKT, omdat de
   * remedie verschilt: bij TOEGANG_BEPERKT vraag je de uitgever om
   * toestemming, bij een CDN-blokkade vraag je om een uitzondering op
   * een firewallregel — en vaak staat de uitgever het crawlen al toe.
   * Gemeten geval dat dit nodig maakte: rendo-nieuws geeft 403 vanaf
   * Railway en 200 vanaf een Nederlandse egress, met DEZELFDE
   * user-agent, en de robots.txt van de uitgever draagt een LEGE
   * `Disallow:` — expliciete toestemming voor alles.
   */
  | "CDN_BLOKKADE"
  /**
   * Een 403 waarvan de oorzaak NIET is vast te stellen. Bewust een eigen
   * soort: hem bij TOEGANG_BEPERKT stoppen zou beweren dat de uitgever
   * ons weigert, en dat is dan niet gemeten.
   */
  | "TOEGANG_ONBEKEND";

export const STORINGSSOORT_LABEL: Readonly<Record<Storingssoort, string>> = {
  TIJDELIJKE_STORING: "Tijdelijke storing",
  TOEGANG_BEPERKT: "Toegang beperkt",
  SNELHEIDSBEGRENSD: "Snelheidsbegrensd",
  ONGELDIG_ENDPOINT: "Ongeldig endpoint",
  ONTLEDING_MISLUKT: "Ontleding mislukt",
  LEEG_MAAR_GEZOND: "Leeg maar gezond",
  AFGESCHAFT: "Afgeschaft",
  NIET_GEAUTORISEERD: "Niet geautoriseerd",
  NETWERKFOUT: "Netwerkfout",
  CDN_BLOKKADE: "CDN-blokkade",
  TOEGANG_ONBEKEND: "Toegang geweigerd, oorzaak onbekend",
};

/** Welke handeling deze soort vraagt. Voor het auditrapport. */
export const STORINGSSOORT_HANDELING: Readonly<Record<Storingssoort, string>> = {
  TIJDELIJKE_STORING: "opnieuw proberen op het normale interval",
  TOEGANG_BEPERKT: "ophalen opschorten en officiele toegang vragen bij de uitgever",
  SNELHEIDSBEGRENSD: "interval verlagen; dezelfde route blijft bruikbaar",
  ONGELDIG_ENDPOINT: "een geldig adres zoeken; dit adres bestaat niet (meer)",
  ONTLEDING_MISLUKT: "de parser repareren; de route zelf werkt",
  LEEG_MAAR_GEZOND: "niets; dit is geen storing",
  AFGESCHAFT: "de bron vervangen of uitzetten",
  NIET_GEAUTORISEERD: "een officiele sleutel aanvragen; niet omheen werken",
  NETWERKFOUT: "opnieuw proberen; bij herhaling de host en TLS natrekken",
  /* NIET 'toestemming vragen': de uitgever heeft meestal niets verboden.
     Wat hier nodig is, is een uitzondering op een firewallregel voor ons
     netwerk of onze user-agent. Dat is een ANDER gesprek met een andere
     partij — vaak de hostingpartij en niet de redactie. */
  CDN_BLOKKADE:
    "een uitzondering vragen op de firewallregel van de uitgever; " +
    "die staat het crawlen in zijn robots.txt vaak al toe",
  TOEGANG_ONBEKEND:
    "de oorzaak vaststellen voordat er een remedie wordt gekozen; " +
    "het antwoord draagt geen bewijs van beleid, CDN of authenticatie",
};

/**
 * Soorten waarbij blijven proberen geen zin heeft EN onbehoorlijk is.
 *
 * Deze bronnen worden opgeschort met een hercontrole. Opschorten is
 * geen afsluiten: de geschiedenis blijft staan en één keer per
 * hercontrole-interval wordt er netjes opnieuw gekeken, want een
 * uitgever kan zijn beleid wijzigen — en bij Rendo en RVO bleek
 * precies dat het geval.
 */
const OPSCHORTEN: Readonly<Record<Storingssoort, number | null>> = {
  /* 7 dagen: lang genoeg om niet te hameren, kort genoeg om een
     opgeheven blokkade binnen een week te zien. */
  TOEGANG_BEPERKT: 7 * 24 * 60,
  NIET_GEAUTORISEERD: 7 * 24 * 60,
  /* 30 dagen: een afgeschafte route komt zelden terug, maar nooit
     kijken betekent nooit merken dat er een opvolger is. */
  AFGESCHAFT: 30 * 24 * 60,
  /* 6 uur: een snelheidsbegrenzing is tijdelijk van aard. */
  SNELHEIDSBEGRENSD: 6 * 60,
  TIJDELIJKE_STORING: null,
  ONGELDIG_ENDPOINT: null,
  ONTLEDING_MISLUKT: null,
  LEEG_MAAR_GEZOND: null,
  NETWERKFOUT: null,
  /* 7 dagen, gelijk aan TOEGANG_BEPERKT: een firewallregel wordt niet
     binnen een uur opgeheven, en blijven kloppen op een WAF is precies
     wat hem strenger maakt. */
  CDN_BLOKKADE: 7 * 24 * 60,
  /* 24 uur en niet 7 dagen: bij een ONBEKENDE oorzaak mag de aanname
     niet zijn dat het lang duurt. Vaker kijken levert bovendien eerder
     het bewijs op waarmee hij alsnog te classificeren is. */
  TOEGANG_ONBEKEND: 24 * 60,
};

export type StoringInvoer = {
  readonly resultaat: "ok" | "niet_gewijzigd" | "fout" | "overgeslagen";
  readonly httpStatus: number | null;
  readonly foutSoort: string | null;
  /** Of de onderliggende laag de fout als herhaalbaar aanmerkte. */
  readonly herhaalbaar: boolean | null;
  /** Hoeveel items er na filteren overbleven. */
  readonly aantalItems: number;
  readonly robotsStatus: string | null;
  readonly tdmStatus: string | null;
  /** De reden die de ophaallaag meegaf bij 'overgeslagen'. */
  readonly overgeslagenReden: string | null;
  /**
   * AANTOONBARE aanwijzingen uit het antwoord, als de HTTP-laag ze
   * meegaf. Zonder deze velden kan een 403 niet worden onderscheiden en
   * valt hij naar TOEGANG_ONBEKEND — dat is met opzet: een ontbrekende
   * meting mag geen conclusie worden.
   */
  readonly aanwijzingen?: {
    readonly server: string | null;
    readonly cdnHeaders: readonly string[];
    readonly wwwAuthenticate: string | null;
    readonly titel: string | null;
  } | null;
};

/**
 * Namen die in een `server`-header een CDN of WAF aanwijzen. Alleen
 * leveranciers die als reverse proxy vóór de oorspronkelijke server
 * staan; geen gewone webservers (nginx, apache) want die zeggen niets
 * over een blokkade.
 */
const CDN_SERVERS = ["cloudflare", "sucuri", "akamai", "incapsula", "imperva", "cloudfront", "fastly"];

/** Titels van bekende blokkadepagina's. Bewijs, geen vermoeden. */
const CDN_TITELS = [
  "attention required",
  "just a moment",
  "access denied",
  "sucuri website firewall",
  "request blocked",
  "you have been blocked",
];

/**
 * Onderscheidt de vier oorzaken van een 403 op UITSLUITEND aantoonbare
 * signalen. Twijfel levert TOEGANG_ONBEKEND; er wordt nooit een oorzaak
 * aangenomen.
 *
 * De orde is niet willekeurig. Authenticatie staat vooraan omdat
 * `www-authenticate` een expliciete, door de server GESTELDE eis is.
 * Daarna het beleid van de uitgever, want dat is zijn eigen verklaring.
 * Pas daarna de CDN-aanwijzingen, zodat een uitgever die ons werkelijk
 * verbiedt niet als 'slechts een firewall' wordt weggezet.
 */
function classificeer403(inv: StoringInvoer): Storingssoort {
  const a = inv.aanwijzingen ?? null;

  /* 1. AUTHENTICATIE — de server stelt zelf een eis. */
  if (a?.wwwAuthenticate) return "NIET_GEAUTORISEERD";

  /* 2. BELEID VAN DE UITGEVER — hij heeft het zelf verklaard.
        `robots=verboden` betekent dat we zijn robots.txt hebben GELEZEN
        en dat die dit pad verbiedt. Een TDM-voorbehoud is net zo
        expliciet. Dat is beleid, en dan is 'toegang beperkt' waar. */
  if (inv.robotsStatus === "verboden") return "TOEGANG_BEPERKT";
  if (inv.tdmStatus === "voorbehoud") return "TOEGANG_BEPERKT";

  /* 3. CDN OF WAF — een tussenlaag weigert ons, de uitgever zweeg.
        Twee onafhankelijke soorten bewijs: een CDN-eigen header, of de
        `server`-header plus een bekende blokkadetitel. Eén CDN-header is
        al genoeg: die zet niemand anders. */
  if (a) {
    const serverIsCdn = CDN_SERVERS.some((n) => (a.server ?? "").includes(n));
    const titelIsBlokkade = CDN_TITELS.some((t) => (a.titel ?? "").toLowerCase().includes(t));
    if (a.cdnHeaders.length > 0 || (serverIsCdn && titelIsBlokkade)) return "CDN_BLOKKADE";
  }

  /* 4. ONBEKEND. Geen authenticatie-eis, geen verklaard beleid, geen
        CDN-bewijs — of helemaal geen aanwijzingen omdat een oudere
        ophaallaag ze niet meegaf. Dan is de eerlijke uitkomst dat we het
        niet weten, en NIET dat de uitgever ons weigert. */
  return "TOEGANG_ONBEKEND";
}

export type StoringUitslag = {
  /** null betekent: geen storing. */
  readonly soort: Storingssoort | null;
  readonly detail: string;
  /** Minuten tot de volgende poging, of null voor het normale interval. */
  readonly opschortenMinuten: number | null;
};

/**
 * Classificeert één ophaaluitkomst.
 *
 * Leest uitsluitend wat gemeten is: het resultaat, de HTTP-status, de
 * foutsoort van de HTTP-laag en de toestemmingsvelden. Er wordt niets
 * geraden; is de combinatie onbekend, dan komt er TIJDELIJKE_STORING uit
 * met de ruwe gegevens in het detail, zodat een mens het ziet in plaats
 * van dat het in een vage categorie verdwijnt.
 */
export function classificeerStoring(inv: StoringInvoer): StoringUitslag {
  const detail = [
    `resultaat=${inv.resultaat}`,
    inv.httpStatus === null ? null : `http=${inv.httpStatus}`,
    inv.foutSoort ? `foutsoort=${inv.foutSoort}` : null,
    inv.herhaalbaar === null ? null : `herhaalbaar=${inv.herhaalbaar}`,
    `items=${inv.aantalItems}`,
    inv.robotsStatus ? `robots=${inv.robotsStatus}` : null,
    inv.tdmStatus ? `tdm=${inv.tdmStatus}` : null,
    inv.overgeslagenReden ? `overgeslagen: ${inv.overgeslagenReden}` : null,
    /* Het BEWIJS achter de classificatie hoort in het detail, anders is
       'CDN_BLOKKADE' voor een lezer niet na te rekenen. */
    inv.aanwijzingen?.server ? `server=${inv.aanwijzingen.server}` : null,
    inv.aanwijzingen?.cdnHeaders?.length ? `cdn=${inv.aanwijzingen.cdnHeaders.join("+")}` : null,
    inv.aanwijzingen?.wwwAuthenticate ? "www-authenticate aanwezig" : null,
    inv.aanwijzingen?.titel ? `titel="${inv.aanwijzingen.titel}"` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const uit = (soort: Storingssoort | null): StoringUitslag => ({
    soort,
    detail,
    opschortenMinuten: soort === null ? null : OPSCHORTEN[soort],
  });

  /* ---------- geen storing ---------- */
  if (inv.resultaat === "niet_gewijzigd") return uit(null);
  if (inv.resultaat === "ok") {
    /* NUL ITEMS IS GEEN STORING.
       Een bron die door een uitsluitpatroon leegloopt werkt precies
       zoals bedoeld. Dit als fout tellen zou het dashboard rood maken
       voor iets dat klopt — en dat is wat par. 18 verbiedt. */
    return uit(inv.aantalItems > 0 ? null : "LEEG_MAAR_GEZOND");
  }

  /* ---------- overgeslagen: de toestemmingslaag hield hem tegen ---------- */
  if (inv.resultaat === "overgeslagen") {
    /* EEN VASTGESTELD VERBOD IS EEN TOEGANGSBEPERKING.
       'verboden' en 'voorbehoud' zijn uitspraken van de uitgever: hij
       zegt nee. Dat is geen storing van de bron maar een grens die wij
       respecteren, en hij hoort zichtbaar te zijn — anders lijkt die
       bron gewoon stil. */
    if (inv.robotsStatus === "verboden") return uit("TOEGANG_BEPERKT");
    if (inv.tdmStatus === "voorbehoud") return uit("TOEGANG_BEPERKT");

    /* 'ONBEKEND' IS GEEN VERBOD.
       Deze twee statussen blokkeren het ophalen wel — en dat hoort ook,
       want zonder vastgestelde toestemming halen we niets op — maar
       niemand heeft nee gezegd. We hebben het simpelweg nog niet
       nagetrokken. De handeling is dus 'toestemming vaststellen', niet
       'de uitgever om toegang vragen', en al helemaal niet zeven dagen
       opschorten.

       Dit levert hier geen storingssoort op, omdat geen van de negen
       soorten dit dekt. Het auditrapport en het gezondheidsmodel tellen
       deze bronnen apart; ze mogen NIET als gezond doorgaan. */
    return uit(null);
  }

  /* ---------- fout ---------- */
  switch (inv.foutSoort) {
    case "robots_onleesbaar":
    case "robots_onleesbaar_na_redirect":
      /* ROBOTS.TXT WAS NIET TE LEZEN — dat is een storing, geen verbod.
         Gemeten bij TenderNed: /robots.txt geeft 302 naar
         /cms/robots.txt, en die gaf bij vijf pogingen vier keer 200 en
         een keer 503. We halen op dat moment terecht niets op (RFC 9309
         schrijft bij een onleesbaar beleid een volledig verbod voor),
         maar een week opschorten zou een bron stilleggen die het
         gewoon doet. Opnieuw proberen dus. */
      return uit("TIJDELIJKE_STORING");
    case "robots_verbod":
    case "robots_verbod_na_redirect":
      /* EEN ECHT VERBOD: er staat een Disallow-regel die op dit pad
         matcht. Dat is geen storing die overwaait maar een grens die de
         uitgever stelt. Opschorten en hem vragen; niet 'oplossen' door
         het verbod te negeren, niet met een andere User-Agent, niet via
         een proxy. */
      return uit("TOEGANG_BEPERKT");
    case "host_buiten_allowlist":
    case "doel_geweigerd":
      return uit("TOEGANG_BEPERKT");
    case "bron_parse":
      return uit("ONTLEDING_MISLUKT");
    case "netwerk":
    case "netwerk_uit":
      return uit("NETWERKFOUT");
    case "te_groot":
    case "te_veel_redirects":
    case "redirect_zonder_locatie":
      /* De route levert iets dat we niet kunnen of willen verwerken.
         Dat is een adresprobleem, niet een storing die overwaait. */
      return uit("ONGELDIG_ENDPOINT");
    default:
      break;
  }

  const s = inv.httpStatus;
  if (s === 401) return uit("NIET_GEAUTORISEERD");
  /* 403 IS DRIE VERSCHILLENDE DINGEN MET DRIE REMEDIES.
     Dit was een vlakke afbeelding naar TOEGANG_BEPERKT, en die beweerde
     dus bij elke 403 dat de UITGEVER ons weigert. Gemeten tegenvoorbeeld:
     rendo-nieuws geeft 403 vanaf Railway en 200 vanaf een Nederlandse
     egress met dezelfde user-agent, en de robots.txt van die uitgever
     draagt een LEGE `Disallow:` — hij staat crawlen expliciet toe. De
     oorzaak was Cloudflare dat een hostingnetwerk weigert. Dat vraagt
     een firewalluitzondering, niet een toestemmingsverzoek. */
  if (s === 403) return uit(classificeer403(inv));
  if (s === 429) return uit("SNELHEIDSBEGRENSD");
  if (s === 404 || s === 410) return uit(s === 410 ? "AFGESCHAFT" : "ONGELDIG_ENDPOINT");
  if (s !== null && s >= 500) return uit("TIJDELIJKE_STORING");
  if (s !== null && s >= 400) return uit("ONGELDIG_ENDPOINT");

  /* Onbekende combinatie: niet verzinnen. TIJDELIJKE_STORING is de
     mildste aanname en het detail draagt de ruwe gegevens, zodat dit
     opvalt in het auditrapport in plaats van weg te zakken. */
  return uit("TIJDELIJKE_STORING");
}
