/* ============================================================
   PIJPLIJN — claimmodaliteit: staat dit vast, of wordt het gevraagd?
   ------------------------------------------------------------
   HET DEFECT DAT DEZE MODULE OPLOST, met de rij uit productie erbij.

   `intel.uitspraken` kent `soort` (feit, cijfer, datum, regel, prijs,
   specificatie, status) en `verificatie_status` (ongeverifieerd,
   bevestigd, tegengesproken, verlopen, ingetrokken). Wat er NIET in
   staat is de modaliteit: is dit vastgesteld, of is het een voorstel,
   of een verwachting.

   Gemeten op 30 oktober 2026 stond deze rij in productie, bevestigd en
   met bewijs_kwaliteit 5:

     waarde_numeriek 125000000, eenheid EUR
     tekst: 'Schaal daarom de bestaande Flex-E-regeling op naar een
             Flex-E regeling XL van structureel EUR 125 miljoen per
             jaar (2027-2030).'
     document: 'Inbreng voor het eerste debat Netcongestie van de
                nieuwe Kamer' (Netbeheer Nederland)

   Dat is geen bedrag dat geldt. Het is een bedrag dat GEVRAAGD wordt.
   De documentsoortlaag haalt de bewijskracht van zo'n document al
   omlaag, maar dat is niet genoeg: ook in een gezaghebbend document
   staan voorstellen naast vaststellingen. Een besluit van de minister
   kan in dezelfde alinea zeggen wat er NU geldt en wat er WORDT
   voorgesteld. De modaliteit hoort dus per CLAIM te worden bepaald, uit
   de zin zelf, en niet uit het document.

   ------------------------------------------------------------
   DRIE WAARDEN, EN WAAROM NIET MEER

   VASTGESTELD   het geldt, of het is besloten
   VOORSTEL      het is gevraagd, voorgesteld of geadviseerd
   VERWACHTING   het is een prognose, schatting of streven

   Een vierde waarde 'onbekend' is er met opzet NIET als aparte
   uitkomst: de functie geeft altijd een modaliteit én een onzekerheid.
   Een lage zekerheid bij VASTGESTELD is iets anders dan de bewering dat
   de modaliteit onbekend is, en de redactie heeft het eerste nodig.

   DE VEILIGE KANT IS HIER NIET 'VASTGESTELD'. Een zin zonder signaal
   krijgt VASTGESTELD met zekerheid 0,35, en de poortlaag eist voor een
   dragende claim een zekerheid boven NOODZAKELIJKE_ZEKERHEID. Zo wordt
   een onduidelijke zin niet stil tot feit gepromoveerd.

   PUUR EN ZONDER MODEL, om dezelfde reden als documentsoort.ts: een
   oordeel dat in een audit moet standhouden mag niet van een
   taalmodelaanroep afhangen, en `OPENAI_API_KEY` staat niet in de
   productiecontainer.
   ============================================================ */

export type Modaliteit = "VASTGESTELD" | "VOORSTEL" | "VERWACHTING";

/** Verhoog dit bij elke wijziging die een uitslag kan veranderen. */
/* v2, 6 november 2026 — twee onderscheidingen uit de opdracht die deze
   motor nog niet maakte:

     "Kan ≠ zal."
     "Voornemen ≠ vastgesteld besluit."

   'kan' stond in geen enkel patroon. Gemeten op een corpus van 3.610
   zinnen uit 135 bronversies komt 'kan' of 'kunnen' in 505 zinnen voor
   tegen 32 met 'zal' of 'zullen' — het is dus niet een randgeval maar
   de dominante modale vorm in deze bronnen. Een zin als "het uitvoeren
   van alle IBO-maatregelen kan tot 30 miljard euro besparen" kwam
   daardoor op VASTGESTELD of VOORSTEL uit, nooit op wat het is: een
   mogelijkheid.

   'voornemens' en 'van plan' stonden er ook niet; alleen het afgeleide
   'voorgenomen'. "Het kabinet is voornemens de regeling te verruimen"
   viel daardoor buiten elk voorstelsignaal.

   DEZE WIJZIGING IS STRIKT BEPERKENDER. Beide nieuwe signalen halen een
   claim WEG van VASTGESTELD; geen enkele claim die eerder niet droeg,
   draagt nu wel. */
export const MODALITEIT_VERSIE = "claimmodaliteit-v2";

/**
 * De zekerheid die een claim minstens moet hebben om een bericht te
 * mogen dragen. Onder deze grens is de modaliteit niet vastgesteld maar
 * geraden, en dan hoort de claim niet als feit in een artikel.
 */
export const NOODZAKELIJKE_ZEKERHEID = 0.5;

type Signaal = {
  readonly naam: string;
  readonly patroon: RegExp;
  readonly reden: string;
};

/**
 * Een verzoek of voorstel.
 *
 * De gebiedende wijs staat erin ('schaal op naar', 'verhoog', 'verruim')
 * omdat dat de vorm is waarin de gemeten lobbyclaim stond. Een
 * bekendmaking gebruikt die vorm niet: die zegt wat er gaat gelden.
 */
const VOORSTEL: readonly Signaal[] = [
  {
    naam: "gebiedende-wijs",
    patroon:
      /\b(schaal\b[^.]{0,60}\bop\s+naar|verhoog\b[^.]{0,40}\bnaar|verruim\b|verleng\b[^.]{0,30}\bnaar|maak\s+het\s+mogelijk)\b/iu,
    reden: "de zin vraagt in de gebiedende wijs om een wijziging",
  },
  {
    naam: "pleidooi",
    patroon: /\b(pleit(en|ten)?\s+(?:er\s+)?voor|wij\s+(vragen|bepleiten)|roep(en|t)\s+\w+\s+op)\b/iu,
    reden: "de zin bepleit iets",
  },
  {
    naam: "voorstelwoord",
    /* 'voornemens', 'voornemen' en 'van plan' erbij — "voornemen is
       geen vastgesteld besluit" uit de opdracht. Alleen 'voorgenomen'
       stond er, en dat is de bijvoeglijke vorm; de werkwoordsvorm die
       bronnen vaker gebruiken viel erbuiten. */
    patroon:
      /\b(voorstel|voorgesteld|voorgenomen|voornemen(?:s)?|is\s+van\s+plan|zijn\s+van\s+plan|advies\s+(?:is|luidt)|aanbeveling|concept(regeling|wet|besluit)|ter\s+consultatie)\b/iu,
    reden: "de zin noemt het expliciet een voorstel, advies of voornemen",
  },
  {
    naam: "zou-moeten",
    patroon: /\b(zou(den)?\s+(?:moeten|kunnen)\s+\w+|is\s+wenselijk|verdient\s+aanbeveling|bepleit)\b/iu,
    reden: "de zin spreekt in de wenselijke wijs",
  },
];

/** Een prognose of streven. */
const VERWACHTING: readonly Signaal[] = [
  {
    naam: "prognose",
    patroon:
      /\b(verwacht(ing|en)?|prognose|naar\s+schatting|vermoedelijk|waarschijnlijk|raming|geschat\s+op|zal\s+(?:vermoedelijk|mogelijk))\b/iu,
    reden: "de zin geeft een verwachting of schatting",
  },
  {
    naam: "doelstelling",
    patroon: /\b(streeft?\s+naar|ambitie|doelstelling|moet\s+in\s+20\d\d\s+\w+\s+zijn|beoogt)\b/iu,
    reden: "de zin noemt een doel of ambitie, geen stand",
  },
  /**
   * EEN MOGELIJKHEID IS GEEN VASTSTELLING — "kan ≠ zal".
   *
   * HET PATROON IS MET OPZET SMAL. 'kan' komt in 505 van 3.610 gemeten
   * zinnen voor; een patroon op dat woord alleen zou de modaliteit van
   * een zevende van het corpus omzetten, ook waar 'kan' niets over de
   * claim zegt ("u kan hier meer lezen"). De eis is daarom dat het
   * modale werkwoord de KERN van de bewering regeert: kan + worden /
   * leiden / helpen / besparen / oplopen / stijgen, of 'is mogelijk'.
   *
   * GEMETEN VOORBEELD uit netbeheer-nederland-nieuws, claim 103 in
   * productie: "Het uitvoeren van alle IBO-maatregelen kan tot 30
   * miljard euro besparen." Een bedrag dat MOGELIJK wordt bespaard, nu
   * met een modaliteit die dat zegt.
   *
   * WAAROM VERWACHTING EN GEEN VIERDE WAARDE. uitspraken_modaliteit
   * staat drie waarden toe. Een vierde zou een migratie en een
   * wijziging in elke lezende laag vragen, en zou niets toevoegen aan
   * waar het om gaat: VERWACHTING is al "niet vastgesteld" en draagt al
   * geen feit. Het onderscheid dat de opdracht eist — 'kan' is niet
   * 'zal' — is daarmee gemaakt, en de grondslagregel zegt letterlijk
   * welk woord het was.
   */
  {
    naam: "mogelijkheid",
    patroon:
      /* VIJF WOORDEN ERTUSSEN, EN NIET DRIE. Gemeten op de echte
         productieclaim 103: "kan tot 30 miljard euro besparen" heeft
         vier woorden tussen het modale werkwoord en de kern. Met een
         grens van drie vuurde het signaal niet, en kwam de zin uit op
         VASTGESTELD 0,35 — niet draagbaar, maar met een grondslag die
         zweeg over het woord 'kan'. De werkwoordenlijst blijft
         gesloten; dat is wat het patroon smal houdt, niet de afstand. */
      /\b(kan|kunnen)\s+(?:\w+\s+){0,5}?(?:worden|zijn|gaan|leiden|helpen|bijdragen|oplopen|toenemen|afnemen|stijgen|dalen|besparen|opleveren|zorgen|betekenen|schelen)\b|\b(?:is|zijn)\s+mogelijk\b|\bmogelijk\s+(?:maken|maakt)\b/iu,
    reden: "de zin noemt een mogelijkheid en geen stand: 'kan' is niet 'zal'",
  },
];

/**
 * Een benadering is GEEN modaliteit maar een demper.
 *
 * Eerste versie zette 'ongeveer' bij de verwachtingssignalen. Gemeten op
 * de 59 productieclaims gaf dat deze uitslag:
 *
 *   'Netbeheerders hebben vorig jaar ongeveer 8% van de aanvragen van de
 *    wachtlijst kunnen honoreren.'  ->  VERWACHTING
 *
 * Dat is een gemeten stand over een afgelopen jaar, afgerond opgeschreven.
 * Een prognose is het niet. Het praktische gevolg was toevallig goed — de
 * claim werd niet draagbaar als exact feit — maar het LABEL loog, en een
 * redacteur die 'verwachting' leest bij een jaarcijfer gaat de verkeerde
 * kant op zoeken. Een afronding verlaagt dus de zekerheid en laat de
 * modaliteit staan.
 */
const BENADERING: RegExp =
  /\b(ongeveer|circa|ca\.|rond\s+de|zo'n|grofweg|in\s+de\s+orde\s+van|bijna|ruim|meer\s+dan)\b/iu;

/** Een vaststelling. */
const VASTGESTELD: readonly Signaal[] = [
  {
    naam: "besluitwoord",
    patroon:
      /\b(heeft\s+besloten|besloten\s+is|stelt\s+vast|vastgesteld|is\s+goedgekeurd|treedt\s+in\s+werking|gepubliceerd\s+in\s+de\s+staatscourant)\b/iu,
    reden: "de zin meldt een genomen besluit",
  },
  {
    naam: "geldt-nu",
    patroon:
      /\b(geldt|gelden|bedraagt|is\s+vastgesteld\s+op|wordt\s+verhoogd\s+naar|per\s+\d{1,2}\s+\w+\s+20\d\d\s+(geldt|gaat)|vanaf\s+\d{1,2}\s+\w+\s+20\d\d\s+(geldt|gaat))\b/iu,
    reden: "de zin zegt wat er feitelijk geldt",
  },
  {
    naam: "feitelijke-telling",
    patroon:
      /\b(waren\s+er|stonden\s+(?:er\s+)?\d|bedroeg(en)?|is\s+toegenomen|is\s+gedaald|zijn\s+\d+\s+\w+\s+(toegekend|afgewezen|ontvangen)|kunnen\s+van\s+\d{1,2}\s+\w+)\b/iu,
    reden: "de zin rapporteert een gemeten of geregistreerde stand",
  },
  /**
   * Verslag in de verleden tijd over een AFGESLOTEN periode.
   *
   * GEMETEN GAT, gevonden bij de acceptatie van R3 op de 59
   * productieclaims. Deze vier rijen van RVO — bevoegd gezag,
   * FEITELIJKE_MEDEDELING, bevestigd en met bewijskracht 4 — kwamen uit
   * op modaliteit VASTGESTELD met zekerheid 0,20 en droegen dus niet:
   *
   *   'Bedrijven maakten in 2025 voor ruim EUR 3 miljard aan
   *    milieu-investeringen gebruik van het belastingvoordeel van de
   *    Milieu-investeringsaftrek (MIA) en de Vamil.'
   *
   * Dat is een gemeten uitkomst over een afgesloten jaar, gepubliceerd
   * door de instantie die de regeling uitvoert. Er stond geen enkel
   * vaststellingssignaal in: 'maakten gebruik van' zat in geen patroon,
   * en 'ruim' trok er als afronding nog 0,15 af. Een eerlijk feit bleef
   * daardoor onder de drempel liggen, en dat kost een redacteur een
   * bruikbare kandidaat.
   *
   * DE REGEL IS EEN AFGESLOTEN PERIODE, NIET EEN WERKWOORDENLIJST. Een
   * zin die een jaartal noemt dat al voorbij is, samen met een
   * getalsvorm, rapporteert een stand. 'Tot 2040 investeren de
   * netbeheerders meer dan EUR 200 miljard' noemt juist een TOEKOMSTIG
   * jaartal en valt hier dus niet onder — dat is precies het verschil
   * dat deze toets moet maken.
   *
   * De verledentijdvormen staan erbij voor zinnen zonder jaartal
   * ('vorig jaar', 'afgelopen kwartaal'). Ze zijn bewust kort: een lange
   * werkwoordenlijst wordt een onderhoudslast en nooit volledig.
   */
  {
    naam: "verslag-verleden-tijd",
    patroon:
      /\b(vorig\s+jaar|afgelopen\s+(jaar|kwartaal|maand)|eind\s+20\d\d)\b[^.]{0,80}\d|\b(maakt?en|kwamen|lagen?|steeg|stegen|daalde[n]?|groeide[n]?|nam(en)?\s+(toe|af)|werden\s+\w+(d|t|en))\b[^.]{0,60}\d/iu,
    reden: "de zin brengt verslag uit over een afgesloten periode",
  },
];

/**
 * Een jaartal dat al voorbij is, samen met een getal.
 *
 * Apart van de patronen hierboven omdat hij de HUIDIGE DATUM nodig
 * heeft: 'in 2025' is een verslag, 'in 2027' een vooruitzicht, en het
 * verschil hangt af van wanneer je kijkt. Zie de toelichting bij
 * `verslag-verleden-tijd`.
 */
function noemtAfgeslotenJaar(tekst: string, peildatum: string | undefined): boolean {
  if (peildatum === undefined) return false;
  const huidigJaar = Number(peildatum.slice(0, 4));
  if (!Number.isFinite(huidigJaar) || huidigJaar < 2000) return false;
  for (const m of tekst.matchAll(/\b(20\d\d)\b/gu)) {
    const jaar = Number(m[1]);
    /* STRIKT KLEINER. Het lopende jaar is niet afgesloten: 'in 2026
       stijgen de tarieven' kan nog een vooruitzicht zijn. */
    if (jaar < huidigJaar && /\d/u.test(tekst)) return true;
  }
  return false;
}

export type ModaliteitInvoer = {
  /** De claimtekst; in dit platform is dat de zin waaruit hij komt. */
  readonly tekst: string;
  /** De documentsoort, als aanvullend signaal. Nooit beslissend. */
  readonly documentsoort?: string;
  /**
   * ISO-datum waartegen een jaartal 'afgesloten' of 'toekomstig' is:
   * de PUBLICATIEDATUM VAN HET BRONDOCUMENT, niet vandaag.
   *
   * WAAROM NIET DE KLOK. Een modaliteit die van `new Date()` afhangt
   * geeft dezelfde claim morgen een ander oordeel — precies de
   * onreproduceerbaarheid die Release 1 uit de SEO-laag heeft gehaald
   * (zie scripts/seo/lib/vingerafdruk.mjs). En het is ook inhoudelijk
   * verkeerd: of een zin over 2026 vooruitkijkt of terugkijkt, hangt af
   * van wanneer de SCHRIJVER hem opschreef, niet van wanneer wij hem
   * lezen. Een RVO-bericht van oktober 2026 dat 'in 2025' zegt,
   * rapporteert een afgesloten jaar — en dat blijft over tien jaar waar.
   *
   * De brondatum is een onveranderlijk feit over het document
   * (`brondocumenten.gepubliceerd_op`, met `opgehaald_op` als terugval),
   * dus het oordeel is volledig reproduceerbaar.
   *
   * Ontbreekt hij, dan vuurt het jaartalsignaal niet. Dat is de veilige
   * kant: zonder peildatum is 'in 2025' niet te wegen, en een claim die
   * niet te wegen is hoort geen feit te worden.
   */
  readonly peildatum?: string;
};

export type ModaliteitUitslag = {
  readonly modaliteit: Modaliteit;
  /** 0,00–1,00. Onder NOODZAKELIJKE_ZEKERHEID is dit een gok, geen oordeel. */
  readonly zekerheid: number;
  readonly versie: string;
  readonly grondslag: {
    readonly signalen: readonly string[];
    readonly uitleg: string;
  };
  /** Mag deze claim als vaststaand feit in een artikel? */
  readonly draagbaarAlsFeit: boolean;
};

function treffers(
  sig: readonly Signaal[],
  tekst: string,
): { naam: string; reden: string; fragment: string }[] {
  const uit: { naam: string; reden: string; fragment: string }[] = [];
  for (const s of sig) {
    const m = s.patroon.exec(tekst);
    if (m !== null) uit.push({ naam: s.naam, reden: s.reden, fragment: m[0].slice(0, 70) });
  }
  return uit;
}

/**
 * Bepaalt de modaliteit van één claim.
 *
 * DE ORDE: voorstel vóór verwachting vóór vaststelling. Dat is niet
 * willekeurig. 'Schaal de regeling op naar structureel EUR 125 miljoen
 * per jaar (2027-2030)' bevat ook een jaartal en een bedrag, dus een
 * vaststellingssignaal zou kunnen vuren; de gemeten fout is juist dat
 * zo'n zin als feit werd opgeslagen. Een verzoek blijft een verzoek,
 * ook als er een getal in staat.
 *
 * DE DOCUMENTSOORT WEEGT MEE, MAAR BESLIST NIET. In een lobbydocument
 * verschuift een zin zonder eigen signaal naar VOORSTEL in plaats van
 * naar VASTGESTELD — want dat is wat zo'n document doet. Een
 * vaststellingssignaal in de zin zelf wint daar wel van: een
 * lobbydocument mag citeren wat er nú geldt.
 */
export function bepaalModaliteit(inv: ModaliteitInvoer): ModaliteitUitslag {
  const t = inv.tekst;
  const voorstel = treffers(VOORSTEL, t);
  const verwachting = treffers(VERWACHTING, t);
  const vastgesteld = treffers(VASTGESTELD, t);
  const afgeslotenJaar = noemtAfgeslotenJaar(t, inv.peildatum);
  if (afgeslotenJaar) {
    vastgesteld.push({
      naam: "afgesloten-jaar",
      reden: "de zin noemt een jaartal dat al voorbij is, samen met een getal",
      fragment: (/\b20\d\d\b/u.exec(t) ?? [""])[0],
    });
  }
  const benaderingTreffer = BENADERING.exec(t);
  const benaderd = benaderingTreffer !== null;
  const signalen: string[] = [];
  for (const x of [...voorstel, ...verwachting, ...vastgesteld]) {
    signalen.push(`${x.naam}: ${x.reden} — "${x.fragment}"`);
  }
  if (benaderd) {
    signalen.push(
      `benadering: het getal is afgerond opgeschreven — "${benaderingTreffer[0]}" ` +
        "(verlaagt de zekerheid, verandert de modaliteit niet)",
    );
  }

  const pleitendDocument =
    inv.documentsoort === "LOBBYDOCUMENT" || inv.documentsoort === "OPINIE";

  const klaar = (
    modaliteit: Modaliteit,
    zekerheid: number,
    uitleg: string,
  ): ModaliteitUitslag => ({
    modaliteit,
    zekerheid,
    versie: MODALITEIT_VERSIE,
    grondslag: { signalen, uitleg },
    /* ALLEEN EEN VASTSTELLING MET VOLDOENDE ZEKERHEID DRAAGT.
       Een voorstel of verwachting mag in een artikel staan, maar dan
       benoemd als voorstel of verwachting — niet als feit. Die
       benoeming is het werk van de conceptlaag; hier wordt alleen
       vastgelegd dat het niet als feit mag. */
    draagbaarAlsFeit: modaliteit === "VASTGESTELD" && zekerheid >= NOODZAKELIJKE_ZEKERHEID,
  });

  /* Een benadering trekt er 0,15 af, waar de modaliteit ook op uitkomt.
     'ongeveer 10%' is minder hard dan '10%', en dat hoort in de
     zekerheid te staan en niet in de soort. */
  const demping = benaderd ? 0.15 : 0;

  if (voorstel.length > 0) {
    return klaar(
      "VOORSTEL",
      Math.min(0.95, 0.6 + 0.15 * voorstel.length) - demping,
      `${voorstel.length} voorstelsignaal(en); de zin vraagt om iets in plaats van iets te melden`,
    );
  }
  if (verwachting.length > 0 && vastgesteld.length === 0) {
    return klaar(
      "VERWACHTING",
      Math.min(0.9, 0.55 + 0.15 * verwachting.length) - demping,
      `${verwachting.length} verwachtingssignaal(en) en geen vaststellingssignaal`,
    );
  }
  if (vastgesteld.length > 0) {
    /* EEN MOGELIJKHEID NAAST EEN VASTSTELLING: DE MOGELIJKHEID WINT OP
       DE ZEKERHEID, NIET OP DE MODALITEIT.
       ----------------------------------------------------------------
       "Liander concludeert dat congestiemanagement niet kan worden
       toegepast" bevat een vaststellingssignaal ('concludeert' valt
       onder verslag-verleden-tijd) EN een mogelijkheidssignaal. De orde
       hierboven omgooien zou elke zin met 'kan' uit de vaststellingstak
       halen, en dat is te grof: in die zin IS er iets vastgesteld.

       Maar de claim mag dan geen feit dragen. Daarom een PLAFOND op de
       zekerheid in plaats van een andere modaliteit: 0,45 ligt onder
       NOODZAKELIJKE_ZEKERHEID (0,50), dus draagbaarAlsFeit wordt false
       en de poortlaag laat hem niet door als vaststaand feit. Het label
       blijft eerlijk — er is iets vastgesteld — en de zekerheid zegt
       dat het om een mogelijkheid gaat.

       STRIKT BEPERKENDER: dit kan een zekerheid alleen verlagen. */
    const mogelijk = verwachting.some((v) => v.naam === "mogelijkheid");
    const basis = Math.min(0.95, 0.7 + 0.1 * vastgesteld.length) - demping;
    if (mogelijk) {
      return klaar(
        "VASTGESTELD",
        Math.min(basis, 0.45),
        `${vastgesteld.length} vaststellingssignaal(en), maar de zin stelt een MOGELIJKHEID ` +
          `vast en geen stand ('kan' is niet 'zal'). De zekerheid is daarom geplafonneerd op ` +
          `0,45, onder de grens van ${NOODZAKELIJKE_ZEKERHEID}, zodat deze claim geen feit draagt.`,
      );
    }
    return klaar(
      "VASTGESTELD",
      basis,
      benaderd
        ? `${vastgesteld.length} vaststellingssignaal(en), maar het getal is afgerond`
        : `${vastgesteld.length} vaststellingssignaal(en)`,
    );
  }

  if (pleitendDocument) {
    signalen.push(
      `documentsoort ${inv.documentsoort}: een pleitend document stelt niets vast`,
    );
    return klaar(
      "VOORSTEL",
      0.45 - demping,
      `geen signaal in de zin, maar het document is een ${inv.documentsoort}; ` +
        "de zin krijgt daarom geen vaststelling",
    );
  }

  return klaar(
    "VASTGESTELD",
    0.35 - demping,
    "geen modaliteitssignaal gevonden; de zin wordt niet als vaststaand feit gedragen " +
      `omdat de zekerheid onder ${NOODZAKELIJKE_ZEKERHEID} blijft`,
  );
}
