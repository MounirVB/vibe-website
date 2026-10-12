/* ============================================================
   SEMANTIEK — van een getal naar een bewering, in onze eigen woorden
   ------------------------------------------------------------
   HET PROBLEEM

   "8%" en "200000000000 euro" zijn numeriek correct en als bewering
   leeg. 8% van wat? 200 miljard waarvoor? De bronzin weet het; de
   bewaarde uitspraak droeg alleen `soort` ('cijfer', 'prijs') en
   `onderwerp` (een clustersleutel).

   DE VERLEIDING, EN WAAROM DIE NIET MAG

   Het ligt voor de hand om de subjectzin uit de bron te bewaren en te
   hergebruiken: "Ook voor bedrijven aangesloten bij TenneT geldt een
   stijging van 20%". Dat is een citaat. De bronnen waar deze uitspraken
   uit komen hebben mag_citeren = false en citaat_limiet_tekens = 0, en
   een korte woordgroep is net zo goed overgenomen formulering als een
   hele alinea.

   DE OPLOSSING

   Een GECONTROLEERD VOCABULAIRE (intel.fenomenen en intel.subjecten).
   Uit de brontekst worden trefwoorden herkend; wat eruit komt is een
   SLEUTEL, en de zin wordt opgebouwd uit ONZE zinsvormen. 'nettarief'
   en 'kleinverbruikers' zijn onze woorden. Daarmee is het citaatprobleem
   en het betekenisprobleem in één keer opgelost, en is de uitkomst
   navraagbaar: elke sleutel staat in een tabel met een toelichting.

   WAT DIT NOOIT DOET

   Een veld vullen dat niet in de bron staat. Herkent het vocabulaire
   geen fenomeen, dan blijft het veld leeg en zegt de poort
   CONTEXT_ONVOLLEDIG. Dat is het eerlijke antwoord en het is bruikbaar:
   de reviewer weet welke vraag hij moet stellen.
   ============================================================ */

import {
  eenheidSoort,
  rijmtMetUitdrukking,
  type Uitdrukking,
} from "./uitdrukking.ts";

export type SemantiekSoort =
  | "bedrag"
  | "percentage"
  | "energie"
  | "vermogen"
  | "netcapaciteit"
  | "datum"
  | "termijn"
  | "subsidievoorwaarde"
  | "regelwijziging"
  | "aanbestedingsstatus"
  | "marktstatistiek"
  | "vergelijking"
  | "kwalitatief";

export type Richting = "stijging" | "daling" | "niveau" | "ongewijzigd";

export type Herkomst = "bron_expliciet" | "bron_patroon" | "afgeleid" | "handmatig";

export type Semantiek = {
  readonly soort: SemantiekSoort;
  readonly fenomeen: string | null;
  readonly subject: string | null;
  readonly richting: Richting | null;
  readonly grondtal: string | null;
  readonly periode: string | null;
  readonly geoBereik: string | null;
  readonly voorwaarden: readonly string[];
  readonly vergelijkingsbasis: string | null;
  readonly herkomst: Herkomst;
  /**
   * Gezet als de bronzin een organisatie noemt die niet in het
   * subjectvocabulaire staat. Dan mag de uitspraak niet algemeen worden
   * geformuleerd.
   */
  readonly scopeWaarschuwing: string | null;
  /** Welke trefwoorden tot welke sleutel leidden. Navraagbaar. */
  readonly grondslag: readonly string[];
};

/* ------------------------------------------------------------------
   Het vocabulaire als patronen. De sleutels komen overeen met
   intel.fenomenen en intel.subjecten (migratie 0024).
   ------------------------------------------------------------------ */

/* NEDERLANDSE SAMENSTELLINGEN EN VERVOEGINGEN BREKEN \b.
   ------------------------------------------------------------------
   Vier patronen hier faalden op precies dat, en alle vier stil:

     \bbudget\b        miste 'subsidiebudget'   (samenstelling)
     \bstijg\b         miste 'stijgen'          (vervoeging)
     'opgesteld vermogen' miste 'opgestelde vermogen' (buigings-e)
     een venster van 40 tekens miste 'investeren ... elektriciteitsnet'

   Een gemist patroon levert geen foute uitspraak op maar een lege, en
   die wordt CONTEXT_ONVOLLEDIG — stiller en daarmee lastiger te vinden.
   Daarom: geen linkergrens waar het woord een achtervoegsel kan zijn,
   \w* voor vervoegingen, en ruimere vensters. */
const FENOMEEN_PATRONEN: readonly { sleutel: string; patroon: RegExp; eenheden?: readonly string[] }[] = [
  { sleutel: "nettarief", patroon: /(net|transport)tarie(f|ven)|tarievenblad|netkosten|\btarie(f|ven)\b/i },
  {
    sleutel: "netinvestering",
    /* Venster ruim genoeg voor 'investeren de netbeheerders meer dan
       EUR 200 miljard in het elektriciteitsnet' — dat is 55 tekens. */
    patroon: /investeer\w*|investering\w*|investeren[^.]{0,90}?(elektriciteitsnet|net\b|infrastructuur)|(elektriciteitsnet|infrastructuur)[^.]{0,60}?investe/i,
  },
  { sleutel: "subsidiebudget", patroon: /budget\w*|subsidieplafond|subsidiepot|regelingsbudget/i },
  { sleutel: "subsidiebedrag", patroon: /subsidiebedrag|subsidiebijdrage|tegemoetkoming/i },
  {
    sleutel: "batterijcapaciteit",
    patroon: /batterij\w*|accu\w*|energieopslag|opslagcapaciteit/i,
    eenheden: ["kWh", "MWh", "GWh"],
  },
  {
    sleutel: "opgesteldvermogen",
    patroon: /opgesteld\w*\s+vermogen|zonnepane\w*|pv-?vermogen|piekvermogen|zonnepark\w*/i,
    eenheden: ["kW", "MW", "GW", "kWp", "MWp", "Wp"],
  },
  {
    sleutel: "aansluitvermogen",
    patroon: /aansluit\w*|aansluiting\w*/i,
    eenheden: ["kW", "MW", "kVA", "MVA"],
  },
  { sleutel: "transportvermogen", patroon: /transportvermogen|gecontracteerd\w*\s+vermogen/i },
  { sleutel: "netcapaciteit", patroon: /netcapaciteit|transportcapaciteit|netruimte|congestie\w*/i },
  {
    sleutel: "energieverbruik",
    patroon: /verbruik\w*|afname\b|consumptie/i,
    eenheden: ["kWh", "MWh", "GWh"],
  },
  {
    sleutel: "energieproductie",
    patroon: /productie\w*|opbrengst\w*|invoeding|teruglever\w*/i,
    eenheden: ["kWh", "MWh", "GWh"],
  },
  { sleutel: "elektriciteitsprijs", patroon: /elektriciteitsprijs|stroomprijs|energieprijs|marktprijs/i },
  { sleutel: "doorlooptijd", patroon: /doorlooptijd|looptijd|realisatietijd|duurt\b/i },
  { sleutel: "wachttijd", patroon: /wachttijd|wachtlijst|wachtrij/i },
  /* TELFENOMENEN MOGEN GEEN VERMOGEN ZIJN.
     Gemeten: 'aanvragen' matchte een MW-waarde en leverde de zin
     "bedraagt het aantal aanvragen 6.739 MW" op. Een aantal is een
     stuks of een percentage, nooit een vermogen. */
  { sleutel: "aantal_aanvragen", patroon: /aanvra(ag|gen)\w*/i, eenheden: ["%", "stuks"] },
  { sleutel: "aantal_projecten", patroon: /project(en)?\b/i, eenheden: ["%", "stuks"] },
  { sleutel: "opdrachtwaarde", patroon: /opdrachtwaarde|geschatte waarde|(opdracht|aanbesteding)[^.]{0,40}?(waarde|omvang)/i },
];

const SUBJECT_PATRONEN: readonly { sleutel: string; patroon: RegExp }[] = [
  { sleutel: "kleinverbruiker", patroon: /kleinverbruik\w*/i },
  { sleutel: "grootverbruiker", patroon: /grootverbruik\w*/i },
  { sleutel: "huishouden", patroon: /huishouden\w*/i },
  { sleutel: "bedrijf", patroon: /\bbedrij(f|ven)\b|ondernem(er|ers|ing|ingen)\b/i },
  {
    sleutel: "netbeheerder",
    patroon: /netbeheerder\w*|\bTenneT\b|\bLiander\b|\bStedin\b|\bEnexis\b|Westland Infra|\bCoteq\b/i,
  },
  { sleutel: "landelijk_net", patroon: /landelijke?\s+(elektriciteits)?net|hoogspanningsnet|transportnet/i },
  { sleutel: "regionaal_net", patroon: /regionale?\s+net|distributienet/i },
  { sleutel: "overheid", patroon: /\b(overheid|kabinet|ministerie)\b/i },
  { sleutel: "aanvrager", patroon: /aanvrager\w*|inschrijver\w*/i },
  { sleutel: "opdrachtgever", patroon: /opdrachtgever\w*/i },
];

/* OOK HIER BRAK \b OP DE VERVOEGING: \bstijg\b matcht 'stijgen' niet,
   want na 'stijg' staat geen woordgrens. Daarmee verdween de richting
   uit 'De nettarieven stijgen met 8%' en werd de zin "betreft 8% van
   het nettarief" in plaats van "stijgt het nettarief met 8%". */
const STIJGING = /stijg\w*|stijging\w*|toename|toeneem\w*|verhoog\w*|verhoging\w*|omhoog|duurder|groei\w*/i;
/* 'dalen' heeft stam 'dal-', niet 'daal-': de klinker verandert bij de
   vervoeging. \bdaal\w* matcht 'daalt' wel en 'dalen' niet, en daarmee
   verdween de richting uit 'De tarieven dalen met 4,5%'. */
const DALING = /\bdaal\w*|\bdal(en|end|ende)\b|daling\w*|afname|afneem\w*|verlaag\w*|verlaging\w*|omlaag|goedkoper|krimp\w*/i;
const ONGEWIJZIGD = /blijft gelijk|ongewijzigd|gelijk gebleven/i;

/* ORGANISATIENAMEN. Een hoofdletterwoordgroep met een bedrijfsachtervoegsel
   of een bekende netbeheerdernaam. Staat er een organisatie in de zin die
   NIET in ons subjectvocabulaire voorkomt, dan is de uitspraak niet veilig
   te attribueren: hij gaat over die organisatie en niet over de markt.

   Gemeten geval: "Gasunie Transport Services heeft een stijging van 4,5%
   gecommuniceerd voor haar tarieven in 2027" werd "stijgt het nettarief
   met 4,5%". Een uitspraak over de gastarieven van één partij werd een
   algemene uitspraak over het nettarief. */
const ORGANISATIE =
  /\b([A-Z][\p{L}&.-]+(?:\s+(?:[A-Z][\p{L}&.-]+|van|der|de|en))*\s+(?:B\.?V\.?|N\.?V\.?|Services|Transport|Nederland|Infra|Group|Holding))\b/u;

/** '8% van de aanvragen' — het grondtal staat achter 'van de/het'. */
const GRONDTAL_PATROON = /\bvan\s+(?:de|het|alle)\s+([a-zà-ſ-]+(?:\s+[a-zà-ſ-]+)?)/i;

/* ------------------------------------------------------------------
   Afleiden
   ------------------------------------------------------------------ */

function herkenFenomeen(zin: string, eenheid: string | null): { sleutel: string; via: string } | null {
  const soort = eenheidSoort(eenheid);
  const kandidaten = FENOMEEN_PATRONEN.filter((f) => {
    const m = f.patroon.exec(zin);
    if (!m) return false;
    /* EEN FENOMEEN MOET BIJ DE EENHEID PASSEN.
       'batterij' met eenheid kW is geen batterijcapaciteit maar een
       vermogen. Zonder deze toets zou een kW-waarde als energie-inhoud
       worden gelezen, en dat is precies de kW/kWh-verwisseling die een
       businesscase omgooit. */
    if (f.eenheden && eenheid && !f.eenheden.includes(eenheid)) return false;
    return true;
  });
  if (kandidaten.length === 0) return null;
  /* Bij meerdere treffers: die met een eenheidseis gaat voor, want die
     is specifieker. */
  const beste = kandidaten.find((f) => f.eenheden && f.eenheden.length > 0) ?? kandidaten[0]!;
  const m = beste.patroon.exec(zin);
  void soort;
  return { sleutel: beste.sleutel, via: m?.[0]?.slice(0, 40) ?? beste.sleutel };
}

function herkenSubject(zin: string): { sleutel: string; via: string } | null {
  for (const s of SUBJECT_PATRONEN) {
    const m = s.patroon.exec(zin);
    if (m) return { sleutel: s.sleutel, via: m[0].slice(0, 40) };
  }
  return null;
}

function herkenRichting(zin: string): Richting | null {
  if (ONGEWIJZIGD.test(zin)) return "ongewijzigd";
  /* Daling eerst: 'minder stijging' bestaat, en 'minder' is explicieter
     dan de losse 'meer' in STIJGING. */
  if (DALING.test(zin)) return "daling";
  if (STIJGING.test(zin)) return "stijging";
  return null;
}

/* VERGELIJKINGSWOORDEN. 'ligt 50% hoger dan' is geen aandeel en geen
   losse stijging: het is een VERGELIJKING, en die heeft een basis nodig
   ('dan wat?'). Zonder die basis is het percentage niet te verwoorden. */
/* 'meer dan EUR 200 miljard' is GEEN vergelijking maar een ONDERGRENS,
   en die staat al in `exactheid`. Door 'meer dan' blind te matchen werd
   een begrensd bedrag als vergelijking geweigerd. Daarom moet er achter
   het vergelijkingswoord iets anders dan een getal staan. */
const VERGELIJKING =
  /\b(hoger|lager|sneller|langzamer)\s+dan\b|\b(meer|minder)\s+dan\s+(?![\d€]|EUR\b)|\bten opzichte van\b|\bvergeleken met\b|\bt\.o\.v\.?\b/i;

/**
 * Het grondtal van een percentage.
 *
 * ALLEEN UIT EEN EXPLICIETE CONSTRUCTIE. Hier zat de ernstigste fout van
 * deze module: als er geen 'van de ...' stond, werd het FENOMEEN als
 * grondtal gebruikt. Dat leek redelijk — 'het nettarief stijgt met 8%'
 * is inderdaad een volledige bewering — maar het maakte ook dit:
 *
 *   bron: "Het aantal aanvragen ligt inmiddels ruim 50% hoger dan in
 *          dezelfde periode vorig jaar"
 *   zin:  "gaat het om 50% van het aantal aanvragen"
 *
 * Dat is een andere bewering. De bron vergelijkt met een periode; onze
 * zin maakte er een aandeel van. En:
 *
 *   bron: "60% van de Nederlandse bouwprojecten loopt vertraging op"
 *   zin:  "gaat het om 60% van het aantal projecten"
 *
 * waar het predicaat (vertraging) wegviel. Een percentage krijgt dus
 * alleen een grondtal als de zin het EXPLICIET noemt, en een
 * vergelijking zonder basis wordt geweigerd.
 */
function herkenGrondtal(zin: string): { waarde: string; via: string } | null {
  const m = GRONDTAL_PATROON.exec(zin);
  if (!m?.[1]) return null;
  const viaVocab = herkenFenomeen(m[1], null);
  if (!viaVocab) return null;
  return { waarde: viaVocab.sleutel, via: `expliciete constructie 'van de ${m[1]}' -> ${viaVocab.sleutel}` };
}

/** De semantische soort, uit de eenheid en het fenomeen. */
export function soortVan(eenheid: string | null, fenomeen: string | null): SemantiekSoort {
  const es = eenheidSoort(eenheid);
  if (es === "geld") return "bedrag";
  if (es === "deel") return "percentage";
  if (es === "energie") return "energie";
  if (es === "vermogen") return fenomeen === "netcapaciteit" ? "netcapaciteit" : "vermogen";
  if (es === "tijd") return "termijn";
  return "kwalitatief";
}

/**
 * Leidt de semantiek af uit de bronzin.
 *
 * `herkomst` is 'bron_patroon' zodra er een trefwoord in de zin is
 * gevonden, en 'afgeleid' als er alleen op de eenheid is geleund. Die
 * twee mogen nooit door elkaar: een afgeleide semantiek maakt een
 * uitspraak niet geverifieerd.
 */
export function leidSemantiekAf(zin: string, u: Uitdrukking): Semantiek {
  const grondslag: string[] = [];
  const f = herkenFenomeen(zin, u.eenheid);
  if (f) grondslag.push(`fenomeen '${f.sleutel}' via "${f.via}"`);
  const s = herkenSubject(zin);
  if (s) grondslag.push(`subject '${s.sleutel}' via "${s.via}"`);
  const richting = herkenRichting(zin);
  if (richting) grondslag.push(`richting '${richting}'`);

  const soort = soortVan(u.eenheid, f?.sleutel ?? null);
  let g = soort === "percentage" ? herkenGrondtal(zin) : null;
  /* BIJ EEN STIJGING OF DALING IS HET FENOMEEN HET GRONDTAL.
     'het nettarief stijgt met 8%' — dan is het nettarief waarvan 8% is.
     Dit is NIET de fallback die eerder is verwijderd: die gold voor elk
     percentage en maakte van '60% van de projecten loopt vertraging op'
     een aandeelbewering. Deze geldt alleen als de richting het
     predicaat IS, en dan is de bewering compleet.
     Het veld wordt expliciet gevuld zodat de databaseconstraint
     uitspraken_percentage_vraagt_grondtal hem ook ziet; code en
     constraint horen hetzelfde te vinden. */
  if (
    soort === "percentage" &&
    !g &&
    f &&
    (richting === "stijging" || richting === "daling")
  ) {
    g = { waarde: f.sleutel, via: `richting '${richting}' maakt fenomeen '${f.sleutel}' het grondtal` };
  }
  const isVergelijking = VERGELIJKING.test(zin);
  if (isVergelijking) grondslag.push("de zin vergelijkt ('hoger dan', 'ten opzichte van')");
  if (g) grondslag.push(`grondtal via ${g.via}`);

  if (u.periode) grondslag.push(`periode '${u.periode}' uit de uitdrukking`);
  if (u.schaalwoord) grondslag.push(`schaalwoord '${u.schaalwoord}' bewaard`);
  if (u.exactheid !== "exact") grondslag.push(`exactheid '${u.exactheid}'`);

  /* Een genoemde organisatie die niet in het vocabulaire staat. */
  const org = ORGANISATIE.exec(zin);
  const orgOnbekend =
    org && !herkenSubject(org[0]) ? org[0].slice(0, 60) : null;
  if (orgOnbekend) grondslag.push(`organisatie '${orgOnbekend}' staat niet in het subjectvocabulaire`);

  return {
    soort,
    scopeWaarschuwing: orgOnbekend,
    fenomeen: f?.sleutel ?? null,
    subject: s?.sleutel ?? null,
    richting,
    grondtal: g?.waarde ?? null,
    periode: u.periode,
    geoBereik: null,
    voorwaarden: [],
    /* De basis van de vergelijking is niet uit het vocabulaire te halen
       (het is meestal een periode: 'dezelfde periode vorig jaar'), dus
       hij blijft leeg. Dat de zin VERGELIJKT is wel vastgelegd, en de
       poort weigert daarop. */
    vergelijkingsbasis: isVergelijking ? "ONBEKEND" : null,
    herkomst: f || s ? "bron_patroon" : "afgeleid",
    grondslag,
  };
}

/* ------------------------------------------------------------------
   DE VERWOORDBAARHEIDSPOORT — tien controles, zes uitkomsten
   ------------------------------------------------------------------ */

export type Verwoordbaarheid =
  | "VERWOORDBAAR"
  | "CONTEXT_ONVOLLEDIG"
  | "TEGENSTRIJDIG"
  | "VEROUDERD"
  | "BRONGEBRUIK_BEPERKT"
  | "VERIFICATIE_NODIG";

export const VERWOORDBAAR_LABEL: Record<Verwoordbaarheid, string> = {
  VERWOORDBAAR: "Te verwoorden",
  CONTEXT_ONVOLLEDIG: "Context onvolledig",
  TEGENSTRIJDIG: "Spreekt nieuwere informatie tegen",
  VEROUDERD: "Achterhaald",
  BRONGEBRUIK_BEPERKT: "Brongebruik beperkt",
  VERIFICATIE_NODIG: "Verificatie nodig",
};

export type PoortInvoer = {
  readonly semantiek: Semantiek;
  readonly uitdrukking: Uitdrukking;
  readonly verificatieStatus: string;
  readonly bewijsKwaliteit: number;
  /** Heeft de uitspraak een primaire bronversie met een URL? */
  readonly heeftBewijs: boolean;
  /** Is er een nieuwere uitspraak die deze vervangt? */
  readonly vervangenDoor: { readonly id: number; readonly soort: string } | null;
  /** Hoe oud is de bron, in dagen. */
  readonly dagenOud: number | null;
  /** Hoeveel dagen blijft dit soort uitspraak geldig. */
  readonly houdbaarheidDagen: number | null;
  /** Mag deze bron geciteerd worden? */
  readonly magCiteren: boolean;
  /**
   * Kan de verwoorder hier echt een zin van maken?
   *
   * Als callback meegegeven in plaats van als import, om een cyclus
   * tussen semantiek.ts en verwoord.ts te vermijden.
   *
   * DEZE CONTROLE BESTAAT OMDAT POORT EN VERWOORDER HET ONEENS WAREN.
   * Gemeten: voor "De wachttijd loopt op tot 5 jaar" zei de poort
   * VERWOORDBAAR terwijl verwoord() null gaf — er was geen tak voor
   * soort 'termijn'. Een poort die groen zegt over iets dat niet te
   * verwoorden is, is erger dan geen poort: de aanroeper vertrouwt hem.
   */
  readonly kanVerwoorden?: () => boolean;
};

export type PoortUitslag = {
  readonly uitslag: Verwoordbaarheid;
  readonly reden: string;
  readonly controles: readonly { readonly naam: string; readonly ok: boolean; readonly reden: string }[];
};

/**
 * De poort. Tien controles, in deze orde.
 *
 * DE ORDE IS BEWUST. Een achterhaalde uitspraak hoeft niet op volledige
 * context te worden getoetst, en een uitspraak die de bron niet mag
 * weergeven hoeft niet op betekenis te worden getoetst. Zo zegt de
 * uitkomst zelf wat de volgende stap is.
 *
 * EN DE POORT WORDT NOOIT MILDER VAN EEN HOOG VERTROUWEN. Dat was
 * precies de fout die eerder in dit systeem zat: waarde 200 met
 * bewijs_kwaliteit 5 en vertrouwen 0,90 terwijl de bron 200 miljard zei.
 */
export function verwoordbaarheidspoort(inv: PoortInvoer): PoortUitslag {
  const controles: { naam: string; ok: boolean; reden: string }[] = [];
  const voeg = (naam: string, ok: boolean, reden: string) => {
    controles.push({ naam, ok, reden });
    return ok;
  };

  /* 1. BEWIJS. Een bewering zonder bron is geen bewering. */
  if (!voeg("bewijs", inv.heeftBewijs, inv.heeftBewijs ? "er is een primaire bronversie" : "er is geen primaire bronversie")) {
    return { uitslag: "VERIFICATIE_NODIG", reden: "er hangt geen primaire bronversie aan deze uitspraak", controles };
  }

  /* 2. VERIFICATIESTATUS. */
  const bevestigd = inv.verificatieStatus === "bevestigd";
  voeg("verificatie", bevestigd, `verificatie_status '${inv.verificatieStatus}'`);
  if (inv.verificatieStatus === "tegengesproken") {
    return { uitslag: "TEGENSTRIJDIG", reden: "de uitspraak staat als tegengesproken in de database", controles };
  }
  if (inv.verificatieStatus === "ingetrokken") {
    return { uitslag: "VEROUDERD", reden: "de uitspraak is ingetrokken", controles };
  }
  if (!bevestigd) {
    return {
      uitslag: "VERIFICATIE_NODIG",
      reden: `verificatie_status is '${inv.verificatieStatus}' en niet 'bevestigd'`,
      controles,
    };
  }

  /* 3. VERVANGEN DOOR IETS NIEUWERS. */
  if (inv.vervangenDoor) {
    voeg("actueel", false, `vervangen door uitspraak ${inv.vervangenDoor.id} (${inv.vervangenDoor.soort})`);
    return {
      uitslag: "VEROUDERD",
      reden:
        `er staat een nieuwere uitspraak die deze vervangt (${inv.vervangenDoor.soort}, ` +
        `uitspraak ${inv.vervangenDoor.id}). De nieuwere geldt.`,
      controles,
    };
  }
  voeg("actueel", true, "geen nieuwere uitspraak die deze vervangt");

  /* 4. HOUDBAARHEID. */
  if (inv.dagenOud !== null && inv.houdbaarheidDagen !== null && inv.dagenOud > inv.houdbaarheidDagen) {
    voeg("houdbaarheid", false, `${inv.dagenOud} dagen oud, houdbaarheid ${inv.houdbaarheidDagen}`);
    return {
      uitslag: "VEROUDERD",
      reden:
        `de bron is ${inv.dagenOud} dagen oud terwijl dit soort uitspraak ${inv.houdbaarheidDagen} ` +
        `dagen houdbaar is. Opnieuw verifieren voor gebruik.`,
      controles,
    };
  }
  voeg("houdbaarheid", true, inv.dagenOud === null ? "geen brondatum" : `${inv.dagenOud} dagen oud`);

  /* 5. SCHAALINTEGRITEIT. Onafhankelijk van de parser. */
  const rijmt = rijmtMetUitdrukking(inv.uitdrukking.waarde, inv.uitdrukking.uitdrukking);
  if (!voeg("schaal", rijmt.ok, rijmt.ok ? "de waarde rijmt met de uitdrukking" : rijmt.reden)) {
    return {
      uitslag: "VERIFICATIE_NODIG",
      reden: rijmt.ok ? "" : rijmt.reden,
      controles,
    };
  }

  /* 6. EENHEID PAST BIJ HET FENOMEEN. kW is geen kWh. */
  const es = eenheidSoort(inv.uitdrukking.eenheid);
  const soortPastBijEenheid =
    (inv.semantiek.soort === "vermogen" && es === "vermogen") ||
    (inv.semantiek.soort === "energie" && es === "energie") ||
    (inv.semantiek.soort === "bedrag" && es === "geld") ||
    (inv.semantiek.soort === "percentage" && es === "deel") ||
    (inv.semantiek.soort === "netcapaciteit" && (es === "vermogen" || es === "deel")) ||
    (inv.semantiek.soort === "termijn" && es === "tijd") ||
    inv.semantiek.soort === "kwalitatief";
  if (!voeg("eenheid", soortPastBijEenheid, `soort '${inv.semantiek.soort}' met eenheid '${inv.uitdrukking.eenheid ?? "geen"}'`)) {
    return {
      uitslag: "CONTEXT_ONVOLLEDIG",
      reden:
        `de semantische soort '${inv.semantiek.soort}' past niet bij eenheid ` +
        `'${inv.uitdrukking.eenheid ?? "geen"}'. Vermogen (kW) en energie (kWh) zijn niet ` +
        `uitwisselbaar; dat verschil bepaalt de businesscase.`,
      controles,
    };
  }

  /* 6b. SCOPE. Gaat dit over de markt of over één partij? */
  if (inv.semantiek.scopeWaarschuwing) {
    voeg("scope", false, `onbekende organisatie '${inv.semantiek.scopeWaarschuwing}'`);
    return {
      uitslag: "CONTEXT_ONVOLLEDIG",
      reden:
        `de bronzin gaat over '${inv.semantiek.scopeWaarschuwing}', een organisatie die niet in ` +
        `het subjectvocabulaire staat. Een algemene formulering zou de uitspraak breder maken ` +
        `dan de bron hem doet; par. 8 verbiedt het oprekken van de scope.`,
      controles,
    };
  }
  voeg("scope", true, "geen onbekende organisatie in de bronzin");

  /* 7. HET FENOMEEN. Wat is er gemeten? */
  const heeftFenomeen = inv.semantiek.fenomeen !== null;
  if (!voeg("fenomeen", heeftFenomeen, heeftFenomeen ? `fenomeen '${inv.semantiek.fenomeen}'` : "geen fenomeen herkend")) {
    return {
      uitslag: "CONTEXT_ONVOLLEDIG",
      reden:
        `er is niet vast te stellen WAT er gemeten is. De waarde ` +
        `${inv.uitdrukking.uitdrukking} staat er wel, maar zonder benoemde grootheid is ` +
        `het geen bewering. Het vocabulaire herkende geen fenomeen in de bronzin.`,
      controles,
    };
  }

  /* 8a. EEN VERGELIJKING ZONDER BASIS IS NIET TE VERWOORDEN.
     'ligt 50% hoger dan dezelfde periode vorig jaar' is een vergelijking.
     Zonder vastgelegde basis zou een zin moeten doen alsof het een
     aandeel of een losse stijging is, en dat is een andere bewering. */
  if (inv.semantiek.vergelijkingsbasis === "ONBEKEND") {
    voeg("vergelijking", false, "de bronzin vergelijkt, maar de basis is niet vastgelegd");
    return {
      uitslag: "CONTEXT_ONVOLLEDIG",
      reden:
        `de bronzin vergelijkt ('hoger dan', 'ten opzichte van') maar waarmee wordt ` +
        `vergeleken is niet vastgelegd. ${inv.uitdrukking.uitdrukking} hoger dan WAT? Een zin ` +
        `zonder die basis maakt van een vergelijking een aandeel, en dat is een andere bewering.`,
      controles,
    };
  }
  voeg("vergelijking", true, "de zin vergelijkt niet, of de basis is bekend");

  /* 8b. EEN PERCENTAGE HEEFT ZIJN PREDICAAT NODIG.
     ----------------------------------------------------------------
     Drie keer heb ik hier een regel geprobeerd die nét te ruim was, en
     drie keer leverde dat een zin op die de bron niet zei:

       bron "8% van de aanvragen kunnen honoreren"
       zin  "gaat het om circa 8% van het aantal aanvragen"   (honoreren weg)

       bron "60% van de bouwprojecten loopt vertraging op"
       zin  "gaat het om 60% van het aantal projecten"        (vertraging weg)

       bron "ligt ruim 50% hoger dan dezelfde periode"
       zin  "gaat het om 50% van het aantal aanvragen"        (vergelijking -> aandeel)

     Bij een percentage is het PREDICAAT het dragende deel: gehonoreerd,
     vertraagd, hoger dan. Dat predicaat is vrije natuurlijke taal — niet
     te vangen in een vocabulaire, en niet te citeren.

     Er is precies één geval waarin het predicaat WEL in een
     gestructureerd veld zit: een stijging of daling. Dan is de richting
     zelf het predicaat en is 'het nettarief stijgt met 8%' een complete,
     getrouwe bewering. Alleen dat geval mag door. */
  if (inv.semantiek.soort === "percentage") {
    const richtingIsPredicaat =
      inv.semantiek.richting === "stijging" || inv.semantiek.richting === "daling";
    if (!voeg("predicaat", richtingIsPredicaat, `richting '${inv.semantiek.richting ?? "geen"}'`)) {
      return {
        uitslag: "CONTEXT_ONVOLLEDIG",
        reden:
          `een percentage is alleen te verwoorden als de richting het predicaat is ` +
          `(stijging of daling). Hier is de richting '${inv.semantiek.richting ?? "niet vastgesteld"}', ` +
          `dus wat er met ${inv.uitdrukking.uitdrukking} gebeurt staat alleen in de bronzin — ` +
          `gehonoreerd, vertraagd, hoger dan? Dat is vrije tekst en niet te citeren.`,
        controles,
      };
    }
    const heeftGrondtal = inv.semantiek.grondtal !== null || inv.semantiek.fenomeen !== null;
    if (!voeg("grondtal", heeftGrondtal, `grondtal '${inv.semantiek.grondtal ?? inv.semantiek.fenomeen}'`)) {
      return {
        uitslag: "CONTEXT_ONVOLLEDIG",
        reden: `een percentage zonder grondtal is geen bewering: ${inv.uitdrukking.uitdrukking} van WAT?`,
        controles,
      };
    }
  }

  /* 9. BRONGEBRUIK. */
  /* Deze poort beslist of de uitspraak in EIGEN woorden te verwoorden
     is. Dat mag ook bij mag_citeren=false, juist omdat het vocabulaire
     onze woorden gebruikt. Wat niet mag is de bronzin overnemen, en dat
     doet verwoord() niet. Daarom is dit geen blokkade maar een
     registratie — tenzij er GEEN semantiek uit de bron komt, want dan
     zou verwoorden op de bronzin moeten leunen. */
  if (!inv.magCiteren && inv.semantiek.herkomst === "afgeleid") {
    voeg("brongebruik", false, "mag_citeren=false en de semantiek is alleen afgeleid");
    return {
      uitslag: "BRONGEBRUIK_BEPERKT",
      reden:
        `de bron staat citeren niet toe en er is geen semantiek uit de brontekst herkend. ` +
        `Verwoorden zou dan op de formulering van de bron moeten leunen, en dat mag niet.`,
      controles,
    };
  }
  voeg("brongebruik", true, `mag_citeren=${inv.magCiteren}, semantiek uit '${inv.semantiek.herkomst}'`);

  /* 10. GEEN AANNAMES NODIG. */
  const periodeNodig = inv.semantiek.soort === "bedrag" && inv.semantiek.fenomeen === "subsidiebudget";
  if (periodeNodig && !inv.semantiek.periode) {
    voeg("volledigheid", false, "een budget zonder periode is niet te plaatsen");
    return {
      uitslag: "CONTEXT_ONVOLLEDIG",
      reden: "een subsidiebudget zonder periode is niet te plaatsen: per jaar of in totaal?",
      controles,
    };
  }
  voeg("volledigheid", true, "geen aanvullende aanname nodig");

  /* 11. KOMT ER ECHT EEN ZIN UIT?
     De laatste controle is de uitkomst zelf. Wie dit overslaat, kan
     VERWOORDBAAR teruggeven voor een soort waarvoor de verwoorder geen
     tak heeft. */
  if (inv.kanVerwoorden && !inv.kanVerwoorden()) {
    voeg("verwoording", false, "de verwoorder kan geen zin maken van deze velden");
    return {
      uitslag: "CONTEXT_ONVOLLEDIG",
      reden:
        `alle inhoudelijke controles zijn gehaald, maar de verwoorder kan van deze ` +
        `combinatie geen Nederlandse zin maken (soort '${inv.semantiek.soort}', fenomeen ` +
        `'${inv.semantiek.fenomeen}'). Dat is een gat in de verwoorder, niet in het bewijs.`,
      controles,
    } as PoortUitslag;
  }
  voeg("verwoording", true, "de verwoorder maakt hier een zin van");

  return {
    uitslag: "VERWOORDBAAR",
    reden:
      `alle tien de controles gehaald. Fenomeen '${inv.semantiek.fenomeen}'` +
      `${inv.semantiek.subject ? `, subject '${inv.semantiek.subject}'` : ""}` +
      `${inv.semantiek.grondtal ? `, grondtal '${inv.semantiek.grondtal}'` : ""}. ` +
      `Semantiek uit '${inv.semantiek.herkomst}'.`,
    controles,
  };
}
