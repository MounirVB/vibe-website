/* ============================================================
   INHOUD — het nieuwe-paginavoorstel
   ------------------------------------------------------------
   WAAROM DIT BESTAAT — gemeten, niet bedacht.

   De besluitmotor kende maar één antwoord op "geen bestaande pagina
   dekt dit onderwerp": HERROUTEREN. Dat betekent "hoort op een andere
   pagina", en als er geen andere pagina IS, is dat een doodlopend
   antwoord: de reviewer krijgt te horen dat het ergens anders hoort,
   zonder te horen waar.

   Gemeten op 13 oktober 2026 met npm run dekkingsmeting: van de 19
   kandidaten met een doelpagina bleven er 12 over waarvoor ook de
   volledige dekkingstermenset nul vermeldingen gaf. Negen daarvan gaan
   over NETTARIEVEN — geclusterd onder het grove `netbeheer`, geduwd naar
   /kennis/transportvermogen-versus-aansluitwaarde, een pagina die geen
   enkel tariefstelsel behandelt. Drie gaan over ENERGIEWETGEVING,
   geduwd naar /kennis/normen-en-keuringen, dat over keuringen gaat.

   Dat zijn geen matchfouten die je met een ruimere teller oplost. Het
   zijn ONDERWERPEN WAARVOOR DE SITE GEEN PAGINA HEEFT. Het juiste
   antwoord is een voorstel voor een nieuwe pagina — en dat is een
   VOORSTEL, geen pagina.

   NEGEN ONTDEKKINGEN WORDEN ÉÉN VOORSTEL.
   Par. 12 en 19 verbieden bijna-identieke paginavoorstellen. De
   groepering gebeurt op de voorgestelde slug: die is deterministisch
   afgeleid uit het onderwerp, dus negen tariefontdekkingen komen op
   dezelfde slug uit. De RIJEN blijven per kandidaat bestaan — dat
   bewaart de herkomst per bron, wat par. 19 eist — en de studio en de
   meting groeperen op slug. Eén redactioneel besluit, negen bewijzen.

   WAT DIT NIET DOET
   Geen pagina aanmaken. Geen titel verzinnen die als definitief leest.
   Geen bestand schrijven. Geen route in het register zetten. Elk veld
   hieronder is een VOORSTEL dat een mens beoordeelt, en de velden zijn
   deterministisch afgeleid uit gemeten gegevens: het onderwerp, het
   fenomeen, de bewijzen en de bestaande pagina's die het dichtst in de
   buurt kwamen.
   ============================================================ */

/** Het soort pagina dat wordt voorgesteld. */
export type NieuwePaginaSoort = "kennis" | "oplossing" | "faq";

export type NieuwePaginaVoorstel = {
  /** Deterministisch uit het onderwerp; tevens de groeperingssleutel. */
  readonly slug: string;
  readonly soort: NieuwePaginaSoort;
  /**
   * Een WERKtitel, geen definitieve.
   *
   * Hij is afgeleid uit het onderwerp en bedoeld om een mens te laten
   * zien waar het over gaat. De redacteur schrijft de echte titel; dit
   * platform verzint geen koppen die als definitief kunnen worden
   * gelezen.
   */
  readonly werktitel: string;
  readonly hoofdonderwerp: string;
  /** Het fenomeen waar de feiten over gaan, als dat bekend is. */
  readonly fenomeen: string | null;
  readonly zoekintentie: string;
  readonly doelgroep: string;
  /** Koppen die volgen uit de beschikbare bewijzen, niet uit een template. */
  readonly voorgesteldeStructuur: readonly string[];
  /** De bestaande pagina's die het dichtst in de buurt kwamen, met hun telling. */
  readonly naastgelegenPaginas: readonly { readonly route: string; readonly vermeldingen: number }[];
  /** Waarom geen van die pagina's volstaat. */
  readonly waaromGeenBestaandePagina: string;
  /** Bestaat er al een pagina met deze slug of een sterk vergelijkbare? */
  readonly duplicaatrisico: string;
};

/* Van onderwerpcluster naar het onderwerp zoals een lezer het noemt.
   Alleen clusters waarvoor dit is vastgesteld staan hier; een onbekend
   cluster valt terug op de clustersleutel zelf. Geen van deze teksten
   is een paginatitel — ze benoemen het onderwerp. */
const ONDERWERPWOORD: Readonly<Record<string, string>> = {
  netbeheer: "nettarieven en tariefstelsels",
  netcongestie: "netcongestie",
  regelgeving: "energiewetgeving",
  subsidie: "subsidies en fiscale regelingen",
  bess: "batterijopslag",
  ems: "energiemanagement",
  laadinfrastructuur: "laadinfrastructuur",
  flexibiliteit: "flexibiliteit en energiehandel",
  vergunning: "vergunningen",
};

/* Het fenomeen is specifieker dan het cluster en bepaalt daarom de slug
   wanneer hij bekend is. `netinvestering` onder cluster `netbeheer`
   hoort niet op dezelfde pagina als een tariefstelsel. */
const FENOMEENWOORD: Readonly<Record<string, string>> = {
  nettarief: "nettarieven",
  netinvestering: "netinvesteringen",
  subsidiebudget: "subsidiebudgetten",
  subsidiebedrag: "subsidiebedragen",
  opdrachtwaarde: "opdrachtwaarden",
  wachttijd: "wachttijden-netaansluiting",
  transportvermogen: "transportvermogen",
};

const SLUGVERBODEN = /[^a-z0-9]+/g;

export function slugVan(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(SLUGVERBODEN, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Bouwt het voorstel voor een nieuwe pagina.
 *
 * Alles is afgeleid uit meetbare invoer. Er wordt niets verzonnen:
 * ontbreekt een fenomeen, dan staat er null; is er geen naastgelegen
 * pagina, dan is die lijst leeg.
 */
export function bouwNieuwePaginaVoorstel(invoer: {
  readonly onderwerpSleutel: string | null;
  readonly fenomeen: string | null;
  /** De zinnen van de verwoorde feiten; bepalen de voorgestelde koppen. */
  readonly feitZinnen: readonly string[];
  /** Bestaande pagina's met hun gemeten vermeldingen, hoogste eerst. */
  readonly naastgelegen: readonly { readonly route: string; readonly vermeldingen: number }[];
  /** Routes die al bestaan, om duplicaatrisico te kunnen melden. */
  readonly bestaandeRoutes: ReadonlySet<string>;
}): NieuwePaginaVoorstel {
  const cluster = invoer.onderwerpSleutel ?? "overig";
  /* Het fenomeen is specifieker en gaat daarom voor; zie FENOMEENWOORD. */
  const kern =
    (invoer.fenomeen ? FENOMEENWOORD[invoer.fenomeen] : undefined) ??
    ONDERWERPWOORD[cluster] ??
    cluster;

  const slug = `kennis/${slugVan(kern)}`;
  const route = `/${slug}`;

  /* De structuur volgt de BESCHIKBARE feiten. Een vast sjabloon zou
     koppen beloven waarvoor geen bewijs is. */
  const structuur = ["Wat het is", ...(invoer.feitZinnen.length > 0 ? ["Wat er nu verandert"] : []), "Wat dit betekent voor uw aansluiting", "Bronnen en peildatum"];

  const top = invoer.naastgelegen.slice(0, 3);
  const waarom =
    top.length === 0
      ? `geen enkele gepubliceerde pagina noemt ${kern}`
      : `de dichtstbijzijnde pagina's noemen ${kern} niet in hun eigen onderwerpenlijst: ` +
        top.map((x) => `${x.route} (${x.vermeldingen} losse termvermeldingen)`).join(", ");

  const duplicaat = invoer.bestaandeRoutes.has(route)
    ? `LET OP: ${route} bestaat al; dit hoort dan een wijziging te zijn en geen nieuwe pagina`
    : `geen bestaande route ${route}; ${invoer.bestaandeRoutes.size} routes gecontroleerd`;

  return {
    slug,
    soort: "kennis",
    werktitel: `${kern.charAt(0).toUpperCase()}${kern.slice(1)} — werktitel, te herschrijven door de redactie`,
    hoofdonderwerp: kern,
    fenomeen: invoer.fenomeen,
    zoekintentie: `informatief: wat betekent ${kern} voor een zakelijke afnemer`,
    doelgroep: "zakelijke afnemers met een grootverbruikaansluiting",
    voorgesteldeStructuur: structuur,
    naastgelegenPaginas: top,
    waaromGeenBestaandePagina: waarom,
    duplicaatrisico: duplicaat,
  };
}
