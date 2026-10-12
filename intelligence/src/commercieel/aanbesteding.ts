/* ============================================================
   AANBESTEDINGSFASE — welke publicatie telt, en waarvoor
   ------------------------------------------------------------
   WAAROM DEZE LAAG BESTAAT

   `intel.commerciele_signalen` draagt één rij per PUBLICATIE, en
   TenderNed publiceert over één aanbesteding meerdere keren. Gemeten op
   12 oktober 2026 op pagina 0 van de geregistreerde CPV-lijst:

     100 publicaties -> 72 unieke kenmerken

   Veertien kenmerken hebben meer dan één publicatie; kenmerk 581533
   heeft er zes (AAO, vier keer REC, AGO). Wie publicaties telt, telt
   aanbestedingen met ruim een derde te hoog.

   DRIE GEMETEN FEITEN DIE ELK EEN FOUT AFVANGEN

   1. `kenmerk` staat op 100 van de 100 publicaties en is stabiel over
      fases heen. 443632 en 434533 hebben BEIDE kenmerk 599611. Dat is
      identiteit, geen heuristiek — geen titelvergelijking nodig.

   2. `typePublicatie.code` zegt in welke fase een aanbesteding staat.
      Gemeten vocabulaire met aantallen:
        AAO 37  Aankondiging opdracht
        REC 21  Rectificatie
        AGO 19  Aankondiging gegunde opdracht
        VAK 11  Vooraankondiging
        MAC  8  Marktconsultatie
        VBE  4  Vroegtijdige beëindiging
      Publicatie 441673 ('Realisatie zonnepanelen Limburgs Museum') is
      AGO: de opdracht is GEGUND. Die stond in productie als openstaande
      commerciële kans. De titel verraadt het niet; de code wel.

   3. DE SLUITINGSDATUM VAN DE NIEUWSTE PUBLICATIE GELDT, niet van de
      eerste. Gemeten op kenmerk 599611:
        434533  AAO  24-07-2026  sluit 2026-10-08  (verstreken, -4 dagen)
        443632  REC  08-10-2026  sluit 2026-12-02  (51 dagen)
      De rectificatie heeft de termijn verzet. Wie de eerste publicatie
      aanhoudt, schrijft een lopende aanbesteding van EUR 457.488 af als
      verlopen. Wie de laatste aanhoudt, heeft hem goed.

   WAT DEZE MODULE NIET DOET

   Ze raadt niet. Een code die niet in het gemeten vocabulaire staat
   wordt 'onbekend' met de code erbij, niet stilletjes 'open'. Een
   onbekende fase blokkeert een kans niet — hij maakt er een
   onderzoeksvraag van, want een lege plek in ons vocabulaire is geen
   uitspraak over de aanbesteding.
   ============================================================ */

/** De fase waarin een aanbesteding staat, afgeleid uit de nieuwste publicatie. */
export type Fase =
  | "vooraankondiging"
  | "marktconsultatie"
  | "open"
  | "gegund"
  | "beeindigd"
  | "onbekend";

export const FASE_LABEL: Record<Fase, string> = {
  vooraankondiging: "Vooraangekondigd",
  marktconsultatie: "Marktconsultatie",
  open: "Open voor inschrijving",
  gegund: "Gegund",
  beeindigd: "Vroegtijdig beëindigd",
  onbekend: "Fase onbekend",
};

/**
 * Het gemeten publicatievocabulaire van TenderNed.
 *
 * `kanNogIngeschrevenWorden` is de enige vlag die bepaalt of hier een
 * openstaande kans achter zit. `isEindstand` zegt of de aanbesteding
 * voorbij is — dan is er niets meer te halen, hoe relevant het onderwerp
 * ook is.
 */
export const PUBLICATIESOORT: Record<
  string,
  {
    readonly fase: Fase;
    readonly omschrijving: string;
    readonly kanNogIngeschrevenWorden: boolean;
    readonly isEindstand: boolean;
  }
> = {
  AAO: {
    fase: "open",
    omschrijving: "Aankondiging opdracht",
    kanNogIngeschrevenWorden: true,
    isEindstand: false,
  },
  REC: {
    fase: "open",
    omschrijving: "Rectificatie",
    kanNogIngeschrevenWorden: true,
    isEindstand: false,
  },
  AGO: {
    fase: "gegund",
    omschrijving: "Aankondiging gegunde opdracht",
    kanNogIngeschrevenWorden: false,
    isEindstand: true,
  },
  VBE: {
    fase: "beeindigd",
    omschrijving: "Vroegtijdige beëindiging",
    kanNogIngeschrevenWorden: false,
    isEindstand: true,
  },
  VAK: {
    fase: "vooraankondiging",
    omschrijving: "Vooraankondiging",
    kanNogIngeschrevenWorden: false,
    isEindstand: false,
  },
  MAC: {
    fase: "marktconsultatie",
    omschrijving: "Marktconsultatie",
    kanNogIngeschrevenWorden: false,
    isEindstand: false,
  },
};

/** Eén publicatie zoals de geregistreerde lijst-API hem levert. */
export type FasePublicatie = {
  readonly externId: string;
  readonly gepubliceerdOp: string | null;
  /** `extra["typePublicatie.code"]` uit het brondocument. */
  readonly publicatieSoort: string | null;
  /** `extra["sluitingsDatum"]`, ISO-tijdstempel of null. */
  readonly sluitingsDatum: string | null;
};

export type FaseUitslag = {
  readonly fase: Fase;
  readonly label: string;
  readonly kanNogIngeschrevenWorden: boolean;
  readonly isEindstand: boolean;
  /** De publicatie die de fase bepaalt: de nieuwste. */
  readonly bepalendeBron: string | null;
  /** De geldende sluitingsdatum (ISO-dag) en waar hij vandaan komt. */
  readonly sluitOp: string | null;
  readonly sluitOpBron: string | null;
  /** Eerdere, door een latere publicatie vervangen sluitingsdatums. */
  readonly vervangenSluitdatums: readonly string[];
  readonly grondslag: readonly string[];
};

/** ISO-tijdstempel naar ISO-dag. Geeft null terug bij onleesbare invoer. */
function alsDag(waarde: string | null): string | null {
  if (!waarde) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(waarde.trim());
  return m ? m[1]! : null;
}

/**
 * Bepaalt de fase van één aanbesteding uit al zijn publicaties.
 *
 * DE NIEUWSTE PUBLICATIE BESLIST. Dat is geen voorkeur maar een gemeten
 * eigenschap van de bron: een rectificatie vervangt de aankondiging die
 * eraan voorafging, inclusief de termijn.
 */
export function faseVan(publicaties: readonly FasePublicatie[]): FaseUitslag {
  const grondslag: string[] = [];

  if (publicaties.length === 0) {
    return {
      fase: "onbekend",
      label: FASE_LABEL.onbekend,
      kanNogIngeschrevenWorden: false,
      isEindstand: false,
      bepalendeBron: null,
      sluitOp: null,
      sluitOpBron: null,
      vervangenSluitdatums: [],
      grondslag: ["er zijn geen publicaties om een fase uit af te leiden"],
    };
  }

  /* Nieuwste eerst. Bij gelijke datum beslist het publicatie-id, dat bij
     TenderNed oplopend is uitgegeven — zo is de uitkomst stabiel in
     plaats van afhankelijk van de sorteervolgorde van de database. */
  const oudnaarNieuw = [...publicaties].sort((a, b) => {
    const d = (a.gepubliceerdOp ?? "").localeCompare(b.gepubliceerdOp ?? "");
    return d !== 0 ? d : a.externId.localeCompare(b.externId, undefined, { numeric: true });
  });
  const nieuwste = oudnaarNieuw[oudnaarNieuw.length - 1]!;

  const soortCode = (nieuwste.publicatieSoort ?? "").trim().toUpperCase();
  const soort = PUBLICATIESOORT[soortCode];

  let fase: Fase;
  let kanNog: boolean;
  let eind: boolean;

  if (!soort) {
    fase = "onbekend";
    kanNog = false;
    eind = false;
    grondslag.push(
      soortCode
        ? `de nieuwste publicatie (${nieuwste.externId}) heeft publicatiesoort '${soortCode}', ` +
          `en die staat niet in het gemeten TenderNed-vocabulaire (AAO, REC, AGO, VAK, MAC, VBE). ` +
          `De fase is daarom niet vast te stellen — dit is een gat in ons vocabulaire, ` +
          `geen uitspraak over de aanbesteding.`
        : `de nieuwste publicatie (${nieuwste.externId}) heeft geen publicatiesoort in het ` +
          `brondocument; zonder die code is de fase niet vast te stellen`,
    );
  } else {
    fase = soort.fase;
    kanNog = soort.kanNogIngeschrevenWorden;
    eind = soort.isEindstand;
    grondslag.push(
      `de nieuwste van ${publicaties.length} publicatie(s) is ${nieuwste.externId} ` +
        `(${soortCode} — ${soort.omschrijving}${
          nieuwste.gepubliceerdOp ? `, ${alsDag(nieuwste.gepubliceerdOp)}` : ""
        }); die bepaalt de fase`,
    );
    if (eind) {
      grondslag.push(
        fase === "gegund"
          ? `de opdracht is gegund; er valt niet meer op in te schrijven, hoe goed het onderwerp ook past`
          : `de aanbesteding is vroegtijdig beëindigd; er valt niet meer op in te schrijven`,
      );
    }
    if (fase === "vooraankondiging" || fase === "marktconsultatie") {
      grondslag.push(
        `dit is een vroege fase: er is nog geen opdracht om op in te schrijven, ` +
          `maar wel een vastgestelde voorgenomen inkoop`,
      );
    }
  }

  /* Een eindstand die NIET de nieuwste publicatie is, is het vermelden
     waard: dan is er na de gunning nog iets gepubliceerd. */
  const eindstandenEerder = oudnaarNieuw
    .slice(0, -1)
    .filter((p) => PUBLICATIESOORT[(p.publicatieSoort ?? "").toUpperCase()]?.isEindstand);
  if (eindstandenEerder.length > 0 && !eind) {
    grondslag.push(
      `let op: publicatie ${eindstandenEerder.map((p) => p.externId).join(", ")} is een eindstand ` +
        `terwijl er daarna nog is gepubliceerd; mogelijk gaat het om meerdere percelen`,
    );
  }

  /* DE SLUITINGSDATUM: van de nieuwste publicatie die er een heeft.
     Oudere datums zijn vervangen en mogen de uitkomst niet bepalen. */
  let sluitOp: string | null = null;
  let sluitOpBron: string | null = null;
  const vervangen: string[] = [];
  for (const p of [...oudnaarNieuw].reverse()) {
    const dag = alsDag(p.sluitingsDatum);
    if (!dag) continue;
    if (sluitOp === null) {
      sluitOp = dag;
      sluitOpBron = p.externId;
    } else if (dag !== sluitOp) {
      vervangen.push(`${dag} (uit ${p.externId})`);
    }
  }

  if (sluitOp && vervangen.length > 0) {
    grondslag.push(
      `de geldende sluitingsdatum is ${sluitOp} uit publicatie ${sluitOpBron}; ` +
        `die vervangt ${vervangen.join(", ")}. De oudste publicatie aanhouden zou deze ` +
        `aanbesteding onterecht als verlopen afschrijven.`,
    );
  } else if (sluitOp) {
    grondslag.push(`sluitingsdatum ${sluitOp} uit publicatie ${sluitOpBron}`);
  } else {
    grondslag.push(
      `geen van de ${publicaties.length} publicatie(s) draagt een sluitingsdatum` +
        (fase === "marktconsultatie" || fase === "vooraankondiging"
          ? `, wat bij deze fase normaal is`
          : ``),
    );
  }

  return {
    fase,
    label: FASE_LABEL[fase],
    kanNogIngeschrevenWorden: kanNog,
    isEindstand: eind,
    bepalendeBron: nieuwste.externId,
    sluitOp,
    sluitOpBron,
    vervangenSluitdatums: vervangen,
    grondslag,
  };
}

/**
 * De identiteit van een aanbesteding, voor dedup.
 *
 * `kenmerk` is gemeten op 100 van de 100 publicaties en blijft gelijk
 * over fases heen. Is hij er niet, dan valt de aanroeper terug op
 * opdrachtgever + titelkern; dat staat in `kansen.ts` en is bewust een
 * tweede keus, want een titel kan veranderen en een kenmerk niet.
 *
 * GEMETEN GRENS AAN DIE STABILITEIT (12 oktober 2026)
 *
 * Binnen TenderNed zelf is het kenmerk stabiel over fases: kenmerk
 * 581533 draagt zes publicaties (AAO, vier keer REC, AGO) en 589271
 * draagt AAO, REC en AGO onder hetzelfde nummer.
 *
 * Maar bij een GEIMPORTEERDE publicatie niet. 'Realisatie zonnepanelen
 * Limburgs Museum' staat met twee kenmerken in de lijst: 589425 als
 * aankondiging (sluit 2026-07-14) en 614680 als gunning. Die laatste is
 * via Mercell ingevoerd en kreeg daarmee een eigen TenderNed-nummer.
 *
 * Gevolg: dat zijn voor ons twee kansen, waarvan de ene openstaat met
 * een verstreken termijn en de andere gegund is. Samenvoegen zou een
 * gok zijn — het kenmerk zegt dat ze los staan, en de enige bron die
 * zegt dat het een procedure is (de Europese procedure-identifier) is
 * hier niet geregistreerd. Dit is dus bewust niet opgelost maar
 * vastgelegd: de verstreken termijn houdt de ene uit de werkvoorraad en
 * de gunning houdt de andere eruit, dus geen van beide vraagt onterecht
 * aandacht.
 */
export function aanbestedingSleutel(extra: Record<string, unknown> | null): string | null {
  const ruw = extra?.["kenmerk"];
  if (ruw === null || ruw === undefined) return null;
  const s = String(ruw).trim();
  return s.length > 0 ? s : null;
}
