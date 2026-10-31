/* ============================================================
   PIJPLIJN — documentvorm: welke VORM heeft dit document?
   ------------------------------------------------------------
   HET DEFECT DAT DEZE LAAG OPLOST. Gemeten op 31 oktober 2026 op de
   echte pagina, niet vermoed.

   Zodra `rijksoverheid-nieuws` volledige tekst ging leveren, kwam dit
   eruit:

     https://www.rijksoverheid.nl/actueel/nieuws/2026/10/29/
       nieuwe-regels-voor-toeristische-verhuur-vanaf-1-november-2026

     eerste regel van de pagina: "Nieuwsbericht 29-10-2026 | 10:14"
     body: "Vanaf 1 november 2026 treedt de wijziging van de Wet
            toeristische verhuur in werking."

     -> OFFICIELE_REGELGEVING / BEVOEGD_GEZAG
     -> bewijskrachtplafond 5 (het hoogste dat bestaat)
     -> magZelfBevestigen = true

   Een nieuwsbericht OVER een regel werd de regel ZELF. Dat is precies de
   faalwijze waar R3 om begonnen is: bewijskracht die van de uitgever
   komt in plaats van van een vaststellend document.

   ------------------------------------------------------------
   WAAROM DE OUDE MOTOR DIT NIET KON ZIEN

   `documentsoort.ts` las twee dingen: het GEZAG van de uitgever en de
   FORMULERINGEN in de tekst. Voor deze vraag zijn die twee niet genoeg,
   want de authentieke regeling en het nieuwsbericht erover gebruiken
   dezelfde woorden. "Treedt in werking" staat in beide. Het ministerie
   is in beide gevallen bevoegd gezag.

   Wat ze onderscheidt is de VORM: hoe het document zichzelf presenteert.
   Dat is een derde as, en die ontbrak.

   ------------------------------------------------------------
   STRUCTUURMARKERING, NIET INHOUD

   De markeringen hieronder zijn met opzet géén inhoudelijke
   formuleringen. Ze zeggen niets over wat er besloten is, maar over wat
   voor stuk je in handen hebt:

     "Nieuwsbericht 29-10-2026 | 10:14"     -> dit stuk is een bericht
     "Gelet op artikel 5 van de Wet ..."    -> dit stuk is een besluit
     "bezwaar maken binnen zes weken"       -> dit stuk is een besluit
     "Ontwerpbesluit", "ter consultatie"    -> dit stuk is nog niet af
     "Staatscourant 2026, 12345"            -> dit stuk IS de bekendmaking

   De rechtsmiddelenclausule is de betrouwbaarste van allemaal. Een
   Nederlands besluit van een bestuursorgaan moet op grond van de Awb
   vermelden hoe en binnen welke termijn bezwaar openstaat. Een
   nieuwsbericht over dat besluit doet dat niet.

   ------------------------------------------------------------
   DE VORM KAN ALLEEN BEPERKEN

   Dit is de veiligheidsregel van deze module, en hij is de reden dat de
   as veilig toe te voegen is aan een motor waar een aanvaller de
   brontekst van beheerst:

     VORM IS EEN EXTRA EIS BOVENOP HET GEZAG, NOOIT EEN VERVANGING.

   `documentsoort.ts` eist voor OFFICIEEL_BESLUIT en
   OFFICIELE_REGELGEVING straks twee dingen tegelijk: het gezag moet het
   kunnen uitvaardigen EN de vorm moet authentiek zijn. Wie de tekst
   beheerst kan dus een BEKENDMAKING-markering neerzetten en bereikt
   daarmee niets — zijn gezag blokkeert nog steeds. Omgekeerd haalt een
   NIEUWSBERICHT-markering een document wél naar beneden, ook bij een
   ministerie. Dezelfde asymmetrie als in `documentsoort.ts`: tekst
   verlaagt, gezag verhoogt.

   PUUR, net als documentsoort.ts: geen database, geen netwerk, geen
   model. Een classificatie die in een audit moet standhouden, moet
   nagerekend kunnen worden zonder de motor te draaien.
   ============================================================ */

/** De vorm van een document. Zegt niets over de inhoud. */
export type Documentvorm =
  /** Het authentieke stuk zelf: een besluit, een regeling, een bekendmaking. */
  | "BEKENDMAKING"
  /** Nog niet vastgesteld: ontwerp, voorstel, consultatieversie. */
  | "ONTWERP"
  /** Een bericht OVER iets. De uitgever meldt, hij stelt niet vast. */
  | "NIEUWSBERICHT"
  /** Eigen communicatie, naar buiten gebracht als persbericht. */
  | "PERSBERICHT"
  /** Geen vormmarkering gevonden. Het conservatieve antwoord. */
  | "ARTIKEL";

/** Verhoog dit bij elke wijziging die een vorm kan veranderen. */
export const DOCUMENTVORM_VERSIE = "documentvorm-v1";

type Markering = {
  readonly naam: string;
  readonly patroon: RegExp;
  readonly reden: string;
};

/* ------------------------------------------------------------------
   ONTWERP — het stuk is er nog niet

   Deze gaat VOOR alle andere. Een ontwerpbesluit in bekendmakingsvorm
   is nog steeds een ontwerp, en dat is het veiligheidsrelevante feit:
   er is niets vastgesteld. Een consultatiedocument dat de uiteindelijke
   regeling woordelijk citeert zou anders als die regeling gelden.
   ------------------------------------------------------------------ */
const ONTWERP: readonly Markering[] = [
  {
    naam: "ontwerpstuk",
    patroon:
      /\b(ontwerp-?\s?(besluit|regeling|beschikking|wet|wetsvoorstel|verordening|code)|conceptbesluit|conceptregeling|consultatieversie)\b/iu,
    reden: "het stuk noemt zich een ontwerp of concept",
  },
  {
    naam: "voorgenomen",
    patroon: /\b(voorgenomen\s+(besluit|wijziging|regeling)|voornemen\s+tot\s+(een\s+)?besluit)\b/iu,
    reden: "het stuk beschrijft een voornemen, geen vaststelling",
  },
  {
    naam: "zienswijze",
    patroon:
      /\b(zienswijze(n)?\s+(indienen|naar\s+voren\s+brengen|kenbaar\s+maken)|kunt\s+u\s+reageren\s+op\s+(dit|het)\s+(ontwerp|voorstel))\b/iu,
    reden: "het stuk nodigt uit tot zienswijzen; het staat dus nog open",
  },
  {
    naam: "wetgevingsstuk",
    patroon: /\b(memorie\s+van\s+toelichting|nota\s+van\s+wijziging|nader\s+rapport)\b/iu,
    reden: "het stuk is een wetgevingsstuk bij een voorstel, niet de vastgestelde wet",
  },
];

/* WAT HIER MET OPZET NIET STAAT, en waarom dat een correctie op mijn
   eigen eerste versie is.

   Ik had `wetsvoorstel`, `ter consultatie`, `internetconsultatie` en
   `openbare consultatie` als ontwerpmarkering. Bij het labelen van 23
   echte documenten bleek dat fout, en wel op een manier die veel verder
   reikt dan deze twee bronnen:

     "Een uitzendkracht mag straks nog maximaal 3 jaar (36 maanden) bij
      dezelfde inlener werken. Dit staat in het wetsvoorstel dat vandaag
      in internetconsultatie gaat."
     https://www.rijksoverheid.nl/actueel/nieuws/2026/10/29/
       inzet-uitzendkrachten-wordt-begrensd-in-tijd

   Dat is geen ontwerpbesluit. Het is een NIEUWSBERICHT over een
   ontwerpbesluit. Die woorden staan in talloze nieuwsartikelen, en wie
   ze als vormmarkering gebruikt degradeert elk artikel dat een
   wetsvoorstel noemt tot ONTWERPBESLUIT — plafond 2 en niet-dragend.

   De vorm moet zeggen "DIT STUK is het ontwerp", niet "dit stuk gaat
   over een ontwerp". Daarom alleen zelfverwijzende markeringen: de
   naam van het stuk (`ontwerpbesluit`), de uitnodiging aan de lezer
   (`zienswijze indienen`), en de stukken die bij een voorstel hóren
   (`memorie van toelichting`).

   HET VOORBEHOUD IN DIE ZIN hoort ook niet in deze laag. "mag straks"
   is een modaliteitsvraag, en daar is `claimmodaliteit.ts` voor: de
   claim krijgt VOORSTEL in plaats van VASTGESTELD en draagt daarmee
   niets. Twee lagen, twee vragen; die hier samenvoegen zou de
   documentsoort laten werk doen waar hij het verkeerde gereedschap
   voor is. */

/* ------------------------------------------------------------------
   ZELFBENOEMING — het stuk zegt zelf wat het is

   Gaat vóór BEKENDMAKING. Een nieuwsbericht dat de Staatscourant
   aanhaalt is nog steeds een nieuwsbericht; de verwijzing naar de
   bekendmaking is juist het bewijs dat het stuk de bekendmaking NIET
   is. Dit is de markering die het gemeten defect dempt.
   ------------------------------------------------------------------ */
const NIEUWSBERICHT: readonly Markering[] = [
  {
    naam: "zelfbenoemd-nieuwsbericht",
    patroon: /\b(nieuwsbericht|nieuwsitem|nieuwsartikel)\b/iu,
    reden: "het stuk merkt zichzelf aan als nieuwsbericht",
  },
  {
    naam: "redactievorm",
    patroon: /\b(lees\s+ook|zie\s+ook\s+het\s+nieuwsbericht|dit\s+artikel\s+is\s+bijgewerkt)\b/iu,
    reden: "het stuk draagt redactionele opmaak van een nieuwsbericht",
  },
];

const PERSBERICHT: readonly Markering[] = [
  {
    naam: "zelfbenoemd-persbericht",
    patroon: /\b(persbericht|press\s*release|voor\s+directe\s+publicatie)\b/iu,
    reden: "het stuk merkt zichzelf aan als persbericht",
  },
];

/* ------------------------------------------------------------------
   BEKENDMAKING — dit IS het stuk

   Elke markering hier komt uit de VORM van een Nederlands besluit, niet
   uit zijn strekking. De rechtsmiddelenclausule en de aanhef 'gelet op'
   zijn de twee die een nieuwsbericht nooit draagt.
   ------------------------------------------------------------------ */
const BEKENDMAKING: readonly Markering[] = [
  {
    naam: "rechtsmiddelen",
    patroon:
      /\b(bezwaar(schrift)?\s+(maken|indienen)|beroep\s+instellen|bezwaar\s+en\s+beroep)\b[^.]{0,80}\b(weken|dagen|termijn)\b|\bbinnen\s+(zes|6)\s+weken\b[^.]{0,60}\b(bezwaar|beroep)\b/iu,
    reden: "het stuk vermeldt hoe en binnen welke termijn bezwaar openstaat (Awb-vereiste)",
  },
  {
    naam: "aanhef",
    patroon:
      /\b(gelet\s+op\s+(artikel|de\s+artikelen|het\s+bepaalde)|besluit\s+de\s+(minister|staatssecretaris|autoriteit)|de\s+(minister|staatssecretaris)\s+van\s+\w+[^.]{0,60}\bbesluit\s*:)/iu,
    reden: "het stuk draagt de aanhef van een besluit",
  },
  {
    naam: "officieel-blad",
    patroon:
      /\b(staatscourant|staatsblad|gemeenteblad|provinciaal\s+blad|tractatenblad|officielebekendmakingen)\b/iu,
    reden: "het stuk verwijst naar het officiële publicatieblad",
  },
  {
    naam: "zaakkenmerk",
    patroon: /\b(zaaknummer|zaaknr\.?|kenmerk\s+[A-Z]{2,}[\/-]|ons\s+kenmerk|besluitnummer)\b/u,
    reden: "het stuk draagt een zaak- of besluitkenmerk",
  },
  {
    naam: "inzage",
    patroon: /\bter\s+inzage\s+(gelegd|gelegen)\b/iu,
    reden: "het stuk is ter inzage gelegd, wat alleen van een vastgesteld stuk kan",
  },
  /* DE VORMMARKERING IN DE TITEL. Nederlandse besluiten dragen hun soort
     in de naam: geschilbesluit, concentratiebesluit, tariefbesluit. Dat
     is iets anders dan het losse woord 'besluit', dat ook in elk
     nieuwsbericht staat ('het kabinet neemt een besluit over'). Daarom
     een SAMENSTELLING: minstens drie letters vóór '-besluit'. */
  {
    naam: "besluitsoort-in-naam",
    patroon:
      /\b(geschil|concentratie|tarief|boete|ontheffings?|sanctie|aanwijzings?|methode|code|woo|handhavings?|invorderings?|last|vaststellings?|verlenings?|intrekkings?|gedoog|markt|erkennings?)-?besluit\b/iu,
    reden: "de naam van het stuk noemt zijn besluitsoort",
  },
  /* De kop van een Nederlands besluitstuk: "Besluit <onderwerp>".
     Anker op een regelbegin, want de titel is de eerste regel. Het
     losse woord 'besluit' midden in een zin telt niet — dat staat in
     elk nieuwsbericht ("het kabinet neemt een besluit over"). */
  {
    naam: "besluitkop",
    patroon: /^besluit\s+\p{L}/imu,
    reden: "het stuk draagt 'Besluit <onderwerp>' als kop",
  },
  /* HET STERKSTE MARKEERPUNT VAN EEN BESLUITBEKENDMAKING, en het kwam
     uit het labelwerk: een besluitnotitie noemt WIE besloot, op WELKE
     DATUM, en WAT. Alle vijf concentratie- en vergunningbesluiten van
     de ACM in de labelset dragen deze vorm:

       "Dat heeft de ACM op 26 oktober 2026 besloten."
       "De ACM heeft op 23 oktober 2026 hiervoor een vergunning verleend."

     Een nieuwsbericht doet dit niet. Nagemeten op de labelset: geen van
     de dertien rijksoverheid-nieuwsberichten raakt dit patroon —
     "De ministerraad heeft op voorstel van de minister-president
     ingestemd" mist de datum, en "Het kabinet heeft in maart
     toegezegd" mist dag en jaar. */
  {
    naam: "besluitdatum",
    patroon:
      /\bhe(eft|bben)\b[^.]{0,70}\bop\s+\d{1,2}\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4}\b[^.]{0,70}\b(besloten|verleend|geweigerd|ingetrokken|vastgesteld|goedgekeurd|afgewezen)\b/iu,
    reden: "het stuk noemt het orgaan, de besluitdatum en de beslissing",
  },
];

/* ------------------------------------------------------------------
   URL-PADEN

   Een pad is een structuurmarkering van de uitgever zelf en daarmee
   betrouwbaarder dan welk woord in de body ook — de redactie bepaalt
   het pad, de tekst kan geciteerd zijn.
   ------------------------------------------------------------------ */
const PAD_NIEUWS = /\/(actueel|nieuws|news|actualiteit)\//iu;
const PAD_PERS = /\/pers(bericht|berichten|releases?)?\//iu;
const PAD_BEKENDMAKING =
  /\/(besluiten|bekendmakingen|officiele-bekendmakingen|stcrt|stb|regelingen)\//iu;

export type DocumentvormUitslag = {
  readonly vorm: Documentvorm;
  /** Welke markeringen vuurden, met het stukje tekst dat ze veroorzaakte. */
  readonly markeringen: readonly string[];
  /** Eén regel die een mens kan navertellen. */
  readonly uitleg: string;
  readonly versie: string;
};

export type DocumentvormInvoer = {
  readonly titel: string;
  readonly tekst: string;
  readonly url?: string;
};

function raakt(
  markeringen: readonly Markering[],
  tekst: string,
): { naam: string; reden: string; fragment: string }[] {
  const uit: { naam: string; reden: string; fragment: string }[] = [];
  for (const m of markeringen) {
    const t = m.patroon.exec(tekst);
    if (t === null) continue;
    uit.push({ naam: m.naam, reden: m.reden, fragment: t[0].slice(0, 90) });
  }
  return uit;
}

/**
 * Bepaalt de vorm van een document.
 *
 * DE ORDE IS HET ONTWERP, en hij loopt van "is dit stuk al klaar" via
 * "wat zegt het stuk zelf dat het is" naar "draagt het de vorm van een
 * besluit":
 *
 *   1 ontwerp of consultatie?   -> ONTWERP   (er is niets vastgesteld)
 *   2 zelfbenoemd bericht?      -> NIEUWSBERICHT / PERSBERICHT
 *   3 besluitvorm?              -> BEKENDMAKING
 *   4 anders                    -> ARTIKEL   (conservatief)
 *
 * Stap 1 vóór stap 3 houdt een ontwerpbesluit buiten de vaststellende
 * soorten. Stap 2 vóór stap 3 houdt een nieuwsbericht dat de
 * Staatscourant aanhaalt een nieuwsbericht — die verwijzing is juist
 * het bewijs dat het stuk de bekendmaking niet IS.
 *
 * ARTIKEL is met opzet de bodem en niet BEKENDMAKING: geen aangetoonde
 * vorm betekent geen authentiek stuk. `documentsoort.ts` laat daarmee
 * een document zonder vormbewijs niet vaststellen, en dat is de eis
 * "mits documentvorm, uitgever en besluitinhoud dat AANTOONBAAR
 * rechtvaardigen".
 */
export function bepaalDocumentvorm(inv: DocumentvormInvoer): DocumentvormUitslag {
  const volledig = `${inv.titel}\n${inv.tekst}`;
  const url = inv.url ?? "";
  const markeringen: string[] = [];

  const noteer = (t: { naam: string; reden: string; fragment: string }): void => {
    markeringen.push(`${t.naam}: ${t.reden} — "${t.fragment}"`);
  };

  const uitslag = (vorm: Documentvorm, uitleg: string): DocumentvormUitslag => ({
    vorm,
    markeringen,
    uitleg,
    versie: DOCUMENTVORM_VERSIE,
  });

  /* ---------- 1 · is het stuk al vastgesteld ---------- */
  const ontwerp = raakt(ONTWERP, volledig);
  if (ontwerp.length > 0) {
    for (const t of ontwerp) noteer(t);
    return uitslag(
      "ONTWERP",
      `${ontwerp.length} ontwerpmarkering(en); het stuk is nog niet vastgesteld`,
    );
  }

  /* ---------- 2 · wat zegt het stuk zelf dat het is ---------- */
  const pers = raakt(PERSBERICHT, volledig);
  const persPad = PAD_PERS.test(url);
  if (pers.length > 0 || persPad) {
    for (const t of pers) noteer(t);
    if (persPad) markeringen.push("url-pad: de uitgever plaatst dit onder persberichten");
    return uitslag("PERSBERICHT", "het stuk is eigen communicatie in persberichtvorm");
  }

  const nieuws = raakt(NIEUWSBERICHT, volledig);
  const nieuwsPad = PAD_NIEUWS.test(url);
  if (nieuws.length > 0 || nieuwsPad) {
    for (const t of nieuws) noteer(t);
    if (nieuwsPad) markeringen.push("url-pad: de uitgever plaatst dit onder nieuws");
    return uitslag(
      "NIEUWSBERICHT",
      "het stuk is een bericht OVER iets; het meldt en stelt niet vast",
    );
  }

  /* ---------- 3 · draagt het de vorm van een besluit ---------- */
  const bekend = raakt(BEKENDMAKING, volledig);
  const bekendPad = PAD_BEKENDMAKING.test(url);
  if (bekend.length > 0 || bekendPad) {
    for (const t of bekend) noteer(t);
    if (bekendPad) markeringen.push("url-pad: de uitgever plaatst dit onder bekendmakingen");
    return uitslag(
      "BEKENDMAKING",
      `${bekend.length + (bekendPad ? 1 : 0)} vormmarkering(en) van een authentiek besluit`,
    );
  }

  /* ---------- 4 · geen vormbewijs ---------- */
  markeringen.push("geen vormmarkering gevonden");
  return uitslag(
    "ARTIKEL",
    "de vorm is niet vast te stellen; zonder vormbewijs geldt het stuk niet als authentiek",
  );
}

/**
 * De vormen waarin een document iets kan VASTSTELLEN.
 *
 * Eén constante, zodat `documentsoort.ts` en de toetsen dezelfde lijst
 * lezen. BEKENDMAKING is de enige: een bericht meldt, een ontwerp stelt
 * voor, en een stuk zonder vormbewijs weten we niet.
 */
export const VASTSTELLENDE_VORMEN: readonly Documentvorm[] = ["BEKENDMAKING"];

export function vormKanVaststellen(vorm: Documentvorm): boolean {
  return VASTSTELLENDE_VORMEN.includes(vorm);
}
