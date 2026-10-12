/* ============================================================
   KANSEN — van publicatie naar besluit
   ------------------------------------------------------------
   WAAROM DEZE LAAG BESTAAT

   `intel.commerciele_signalen` draagt één rij per PUBLICATIE. Gemeten
   in productie op 12 oktober 2026 leverde dat vier rijen op met vier
   identieke hypotheses:

     "Mogelijk relevant voor batterijopslag, energiemanagement,
      laadinfrastructuur, zonnestroom. Dit is een hypothese op basis van
      de soort publicatie (aanbesteding), niet een vastgestelde behoefte."

   Vier keer dezelfde zin, omdat er niets anders was om op te gaan: alle
   vier de brondocumenten hebben tekst_lengte 0. TenderNed levert in de
   aankondigingenLIJST alleen een titel en een URL.

   DAT IS GEEN BUG DIE JE WEGSCOORT

   Een kwalificatiemotor die van vier titels vier 'gekwalificeerde leads'
   maakt, verzint. Deze module doet het omgekeerde: ze maakt expliciet
   WAT er bekend is, WAT niet, en welke ene handeling het verschil zou
   maken. Een kans zonder sluitingsdatum is geen kans met sluitingsdatum
   nul — het is een kans met een onderzoeksvraag.

   DE ROTTERDAM-VRAAG (§30)

   Twee aankondigingen, zelfde opdrachtgever, zelfde titel:
     TenderNed 443632  2026-10-08
     TenderNed 434533  2026-07-24
   Twee en een halve maand ertussen, verschillende nummers.

   Samenvoegen verbergt er één. Los laten telt dubbel. Beide zijn fout.
   `groepeer()` maakt er daarom ÉÉN kans van met TWEE publicaties en zet
   de relatie op 'onbekend' met de reden erbij. Dat is de enige uitkomst
   die het bewijs toestaat, en hij is bruikbaar: de reviewer ziet één
   dossier met twee links en één concrete vraag.

   VIER SCORES, GEEN EEN (§6)

   relevantie   past dit bij wat we doen?
   vertrouwen   hoe hard is het bewijs?
   urgentie     loopt er een termijn?
   handelbaar   valt er iets te doen, nu?

   Eén getal zou die vier verschillen wegpoetsen, en juist het verschil
   tussen 'relevant maar onbekend' en 'irrelevant' is wat een reviewer
   nodig heeft.
   ============================================================ */

import type { Categorie, Relevantie } from "../pijplijn/relevantie.ts";
import {
  aanbestedingSleutel,
  faseVan,
  type Fase,
  type FaseUitslag,
  type FasePublicatie,
} from "./aanbesteding.ts";

/** Wat we van een publicatie weten voordat er iets verrijkt is. */
export type Publicatie = {
  readonly gebeurtenisId: number | null;
  readonly brondocumentId: number | null;
  readonly url: string;
  readonly titel: string;
  readonly gepubliceerdOp: string | null;
  readonly uitgever: string | null;
  /** Lengte van de brontekst. 0 betekent: alleen een titel. */
  readonly tekstLengte: number;
  /** De brontekst, als die er is. */
  readonly tekst?: string;
  /**
   * `extra` uit het brondocument, met de velden van de geregistreerde
   * lijst-API. Gemeten 2026-10-12: kenmerk op 100 van 100 publicaties,
   * typePublicatie.code op 100 van 100, sluitingsDatum op 71 van 100.
   */
  readonly extra?: Record<string, unknown> | null;
};

/** `extra["typePublicatie.code"]` — de fase van deze publicatie. */
function publicatieSoortVan(p: Publicatie): string | null {
  const v = p.extra?.["typePublicatie.code"];
  return v === null || v === undefined ? null : String(v).trim() || null;
}

/** `extra["sluitingsDatum"]` — de termijn zoals DEZE publicatie hem noemt. */
function sluitingsDatumVan(p: Publicatie): string | null {
  const v = p.extra?.["sluitingsDatum"];
  return v === null || v === undefined ? null : String(v).trim() || null;
}

function alsFasePublicatie(p: Publicatie): FasePublicatie {
  return {
    externId: String(p.brondocumentId ?? p.gebeurtenisId ?? p.url),
    gepubliceerdOp: p.gepubliceerdOp,
    publicatieSoort: publicatieSoortVan(p),
    sluitingsDatum: sluitingsDatumVan(p),
  };
}

export type KansInvoer = {
  readonly opdrachtgever: string;
  readonly publicaties: readonly Publicatie[];
  readonly relevantie: Relevantie;
  readonly relevanteOplossingen: readonly string[];
  /** Vandaag, als ISO-datum. Expliciet meegegeven zodat toetsen niet aan de klok hangen. */
  readonly vandaag: string;
  /** Waarop gegroepeerd is; komt uit `groepeer()`. */
  readonly identiteit?: string;
  readonly identiteitGrondslag?: string;
};

export type Scores = {
  readonly relevantie: number;
  readonly vertrouwen: number;
  readonly urgentie: number;
  readonly handelbaar: number;
  readonly grondslag: Record<string, { readonly score: number; readonly reden: string }>;
};

export type Status =
  | "NIEUW"
  | "ONDERZOEK_NODIG"
  | "GEKWALIFICEERD"
  | "REVIEW"
  | "GOEDGEKEURD_VOOR_OPVOLGING"
  | "IN_BEHANDELING"
  | "GEWONNEN"
  | "VERLOREN"
  | "GEARCHIVEERD"
  | "AFGEWEZEN";

export const STATUS_LABEL: Record<Status, string> = {
  NIEUW: "Nieuw",
  ONDERZOEK_NODIG: "Uitzoeken",
  GEKWALIFICEERD: "Gekwalificeerd",
  REVIEW: "Ter beoordeling",
  GOEDGEKEURD_VOOR_OPVOLGING: "Goedgekeurd voor opvolging",
  IN_BEHANDELING: "In behandeling",
  GEWONNEN: "Gewonnen",
  VERLOREN: "Verloren",
  GEARCHIVEERD: "Gearchiveerd",
  AFGEWEZEN: "Afgewezen",
};

/**
 * De velden die een dossier compleet maken, met hun Nederlandse naam.
 *
 * Deze lijst is het contract voor `ontbrekend`: wat hier niet uit de
 * publicatie te halen valt, wordt een expliciete onderzoeksvraag in
 * plaats van een leeg vakje.
 */
export const DOSSIERVELDEN = [
  ["referentie", "kenmerk of referentienummer"],
  ["procedure_soort", "soort procedure"],
  ["procedure_status", "fase van de procedure"],
  ["sluit_op", "sluitingsdatum voor inschrijving"],
  ["opdracht_omvang", "omvang of looptijd van de opdracht"],
  ["locatie", "locatie van het project"],
  ["eisen", "gestelde eisen aan de inschrijver"],
] as const;

export type Kans = {
  readonly opdrachtgever: string;
  readonly project: string;
  readonly locatie: string | null;
  readonly referentie: string | null;
  readonly procedureSoort: string | null;
  readonly procedureStatus: string | null;
  readonly sluitOp: string | null;
  readonly opdrachtOmvang: string | null;
  readonly eisen: readonly string[];
  readonly relevanteOplossingen: readonly string[];
  readonly scores: Scores;
  readonly ontbrekend: readonly string[];
  /** De fase van de aanbesteding, uit de nieuwste publicatie. */
  readonly fase: Fase;
  readonly faseLabel: string;
  readonly faseGrondslag: readonly string[];
  /** De identiteit waarop gegroepeerd is, en waarom. */
  readonly identiteit: string;
  readonly identiteitGrondslag: string;
  readonly status: Status;
  readonly aanbevolenActie: string;
  readonly publicaties: readonly (Publicatie & {
    readonly relatie: "eerste" | "zelfde_inkoop" | "nieuwe_fase" | "herhaling" | "onbekend";
    readonly relatieGrondslag: string;
  })[];
};

/* ------------------------------------------------------------------
   Verrijking: wat valt er uit de tekst te halen als die er IS?
   ------------------------------------------------------------------ */

/**
 * Leest feiten uit een aankondigingstekst.
 *
 * Werkt alleen als er tekst is. Bij tekstLengte 0 geeft elke extractie
 * null terug, en dat is precies de situatie van de vier echte signalen.
 * De patronen staan er zodat verrijking — als de bron ooit wel inhoud
 * levert — meteen werkt, zonder dat deze module dan nog moet veranderen.
 */
export function leesFeiten(tekst: string): {
  referentie: string | null;
  procedureSoort: string | null;
  sluitOp: string | null;
  omvang: string | null;
} {
  const t = tekst ?? "";
  const pak = (re: RegExp): string | null => {
    const m = re.exec(t);
    return m?.[1]?.trim() || null;
  };
  return {
    referentie: pak(/\b(?:kenmerk|referentie(?:nummer)?|tendernedkenmerk)\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9./-]{3,40})/i),
    procedureSoort: pak(
      /\b(openbare procedure|niet-openbare procedure|europese openbare procedure|meervoudig onderhandse|enkelvoudig onderhandse|marktconsultatie|concurrentiegerichte dialoog)\b/i,
    ),
    sluitOp: normaliseerDatum(
      pak(/\b(?:sluitingsdatum|sluit(?:ingsdatum)?|uiterlijk|inschrijven tot|deadline)\D{0,20}(\d{1,2}[-/ ][a-z]{3,10}[-/ ]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}-\d{1,2}-\d{4})/i),
    ),
    omvang: pak(/\b(looptijd van \w+ jaar|\d+ jaar met \d+ optiejaren|raamovereenkomst van \d+ jaar)\b/i),
  };
}

const MAANDEN: Record<string, string> = {
  januari: "01", februari: "02", maart: "03", april: "04", mei: "05", juni: "06",
  juli: "07", augustus: "08", september: "09", oktober: "10", november: "11", december: "12",
};

function normaliseerDatum(ruw: string | null): string | null {
  if (!ruw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(ruw)) return ruw;
  let m = /^(\d{1,2})[-/ ](\d{1,2})[-/ ](\d{4})$/.exec(ruw);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  m = /^(\d{1,2})[-/ ]([a-z]{3,10})[-/ ](\d{4})$/i.exec(ruw);
  if (m) {
    const maand = Object.entries(MAANDEN).find(([n]) => n.startsWith(m![2]!.toLowerCase()))?.[1];
    if (maand) return `${m[3]}-${maand}-${m[1]!.padStart(2, "0")}`;
  }
  return null;
}

/* ------------------------------------------------------------------
   Groeperen: welke publicaties horen bij dezelfde kans?
   ------------------------------------------------------------------ */

/** Titel tot zijn kern, zodat kleine verschillen niet twee kansen maken. */
export function titelSleutel(titel: string): string {
  return (titel ?? "")
    .toLowerCase()
    .replace(/\b(ai|eu|nl)\s*\d{4}[-/]\d{2,4}\b/g, " ")  // aankondigingskenmerken
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .sort()
    .join(" ");
}

export type Groep = {
  readonly opdrachtgever: string;
  readonly publicaties: readonly Publicatie[];
  /** Waarop deze groep is samengenomen. */
  readonly identiteit: string;
  readonly identiteitGrondslag: string;
};

/**
 * Groepeert publicaties per AANBESTEDING, niet per publicatie.
 *
 * EERSTE KEUS IS `kenmerk`. Gemeten op 12 oktober 2026, pagina 0 van de
 * geregistreerde CPV-lijst: kenmerk staat op 100 van de 100 publicaties
 * en levert 72 unieke waarden. Veertien kenmerken dragen meer dan een
 * publicatie; een ervan draagt er zes. Groeperen op kenmerk is dus geen
 * verfijning maar het verschil tussen 72 en 100 kansen.
 *
 * TWEEDE KEUS is opdrachtgever + titelkern. Die blijft bestaan voor
 * bronnen die geen kenmerk leveren, en is bewust tweede: een titel kan
 * tussen fases veranderen, een kenmerk niet.
 */
export function groepeer(
  rijen: readonly { opdrachtgever: string; publicatie: Publicatie }[],
): Groep[] {
  const kaart = new Map<
    string,
    { opdrachtgever: string; publicaties: Publicatie[]; identiteit: string; grondslag: string }
  >();

  for (const r of rijen) {
    const kenmerk = aanbestedingSleutel(r.publicatie.extra ?? null);
    const sleutel = kenmerk
      ? `kenmerk:${kenmerk}`
      : `titel:${r.opdrachtgever.toLowerCase().trim()}::${titelSleutel(r.publicatie.titel)}`;
    const grondslag = kenmerk
      ? `samengenomen op kenmerk ${kenmerk} uit de aankondiging; dat is de identiteit van de ` +
        `aanbesteding en blijft gelijk over publicatiefases heen`
      : `de bron levert geen kenmerk, dus samengenomen op opdrachtgever plus titelkern; ` +
        `dat is zwakker bewijs dan een kenmerk en kan twee losse opdrachten met dezelfde ` +
        `titel samenvoegen`;

    const bestaand = kaart.get(sleutel);
    if (bestaand) bestaand.publicaties.push(r.publicatie);
    else
      kaart.set(sleutel, {
        opdrachtgever: r.opdrachtgever,
        publicaties: [r.publicatie],
        identiteit: sleutel,
        grondslag,
      });
  }

  return [...kaart.values()].map((g) => ({
    opdrachtgever: g.opdrachtgever,
    publicaties: [...g.publicaties].sort((a, b) =>
      (a.gepubliceerdOp ?? "").localeCompare(b.gepubliceerdOp ?? ""),
    ),
    identiteit: g.identiteit,
    identiteitGrondslag: g.grondslag,
  }));
}

/**
 * Hoe verhoudt een publicatie zich tot de eerste in zijn groep?
 *
 * DIT IS HET ANTWOORD OP §30, EN HET IS DOOR METING VERANDERD.
 *
 * Bij het bouwen van deze module was het antwoord voor Rotterdam
 * 'onbekend': zonder brontekst was er geen kenmerk om op te vergelijken.
 * Dat was juist gegeven de data die het platform HAD, en het was de
 * reden om te meten wat de bron nog meer levert.
 *
 * Uitkomst van die meting (12 oktober 2026): `kenmerk` ligt gewoon op
 * het al geregistreerde endpoint, en is op beide Rotterdam-publicaties
 * 599611. De relatie is dus niet onbekend maar `zelfde_inkoop`, hard
 * bewezen — en de fase erbij: 434533 is de aankondiging, 443632 de
 * rectificatie die de sluitingstermijn heeft verzet.
 *
 * 'onbekend' blijft bestaan voor bronnen zonder kenmerk. Het is een
 * eerlijke uitkomst, geen plaatsvervanger voor niet gemeten hebben.
 */
export function relatieVan(
  eerste: Publicatie,
  deze: Publicatie,
): { relatie: Kans["publicaties"][number]["relatie"]; grondslag: string } {
  if (eerste.url === deze.url) {
    return { relatie: "eerste", grondslag: "de eerst gepubliceerde aankondiging in deze groep" };
  }

  /* HARD BEWIJS EERST: het kenmerk uit de aankondiging zelf. */
  const kEerste = aanbestedingSleutel(eerste.extra ?? null);
  const kDeze = aanbestedingSleutel(deze.extra ?? null);
  const soortDeze = publicatieSoortVan(deze);

  if (kEerste && kDeze && kEerste === kDeze) {
    const fase =
      soortDeze === "REC"
        ? "een rectificatie van die aankondiging"
        : soortDeze === "AGO"
          ? "de gunning van die aanbesteding"
          : soortDeze === "VBE"
            ? "de vroegtijdige beëindiging van die aanbesteding"
            : "een latere publicatie over dezelfde aanbesteding";
    return {
      relatie: "zelfde_inkoop",
      grondslag:
        `zelfde kenmerk ${kDeze} als de eerste publicatie; dit is ${fase}. ` +
        `Het kenmerk komt uit de aankondiging zelf en is daarmee identiteit, geen gelijkenis.`,
    };
  }

  if (kEerste && kDeze && kEerste !== kDeze) {
    return {
      relatie: "nieuwe_fase",
      grondslag:
        `ander kenmerk (${kEerste} tegen ${kDeze}) bij dezelfde opdrachtgever en titel; ` +
        `dit zijn twee aanbestedingen, geen twee publicaties van een`,
    };
  }

  /* Geen kenmerk: terug naar wat de brontekst eventueel noemt. */
  const refEerste = leesFeiten(eerste.tekst ?? "").referentie;
  const refDeze = leesFeiten(deze.tekst ?? "").referentie;
  if (refEerste && refDeze) {
    return refEerste === refDeze
      ? { relatie: "zelfde_inkoop", grondslag: `zelfde kenmerk ${refDeze} uit de brontekst` }
      : { relatie: "nieuwe_fase", grondslag: `ander kenmerk (${refEerste} tegen ${refDeze})` };
  }

  const dagen = dagenTussen(eerste.gepubliceerdOp, deze.gepubliceerdOp);
  const onbekendOmdat =
    eerste.tekstLengte === 0 || deze.tekstLengte === 0
      ? "deze bron levert geen kenmerk en geen brontekst, dus er is niets om de identiteit op vast te stellen"
      : "noch het bronveld noch de brontekst noemt een kenmerk";

  return {
    relatie: "onbekend",
    grondslag:
      `${onbekendOmdat}. Zelfde opdrachtgever en zelfde titel, ` +
      `${dagen === null ? "datums onbekend" : `${dagen} dagen ertussen`}; ` +
      `dat kan een nieuwe fase van dezelfde inkoop zijn of een losse opdracht. ` +
      `Te bepalen door beide aankondigingen te openen en de kenmerken te vergelijken.`,
  };
}

function dagenTussen(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round(Math.abs(db - da) / 86_400_000);
}

/* ------------------------------------------------------------------
   Scoren
   ------------------------------------------------------------------ */

export function scoor(
  inv: KansInvoer,
  feiten: ReturnType<typeof leesFeiten>,
  fase: FaseUitslag,
): Scores {
  const grondslag: Record<string, { score: number; reden: string }> = {};
  const zet = (as: string, score: number, reden: string) => {
    grondslag[as] = { score, reden };
    return score;
  };

  /* RELEVANTIE leunt op de classificatie; die is al onderbouwd. */
  const relevantie = zet("relevantie", inv.relevantie.bedrijfsrelevantie, inv.relevantie.uitleg);

  /* VERTROUWEN: hoe hard is het bewijs? Een titel is geen dossier. */
  const metTekst = inv.publicaties.filter((p) => p.tekstLengte > 0).length;
  const vertrouwen = zet(
    "vertrouwen",
    metTekst === 0
      ? Math.min(30, inv.relevantie.vertrouwen)
      : Math.min(100, 45 + metTekst * 20),
    metTekst === 0
      ? `geen van de ${inv.publicaties.length} publicatie(s) levert brontekst; alleen de titel is bekend`
      : `${metTekst} van ${inv.publicaties.length} publicatie(s) met brontekst`,
  );

  /* URGENTIE.
     EEN EINDSTAND IS GEEN URGENTIE MAAR HET EINDE. Een gegunde opdracht
     met een nog niet verstreken datum eruit laten komen als 'urgent' was
     precies de fout die publicatie 441673 in productie maakte. */
  const sluit = fase.sluitOp ?? feiten.sluitOp;
  let urgentie: number;
  if (fase.isEindstand) {
    urgentie = zet(
      "urgentie",
      0,
      `de aanbesteding staat in de eindstand '${fase.label}'; er is geen termijn meer die loopt`,
    );
  } else if (sluit) {
    const d = dagenTussen(inv.vandaag, sluit);
    const verstreken = sluit < inv.vandaag;
    urgentie = verstreken
      ? zet("urgentie", 0, `de sluitingsdatum ${sluit} is verstreken`)
      : zet(
          "urgentie",
          d === null ? 40 : d <= 7 ? 95 : d <= 21 ? 75 : d <= 60 ? 45 : 20,
          `sluit op ${sluit}, over ${d} dagen` +
            (fase.vervangenSluitdatums.length > 0
              ? ` (uit publicatie ${fase.sluitOpBron}; die vervangt ${fase.vervangenSluitdatums.join(", ")})`
              : ``),
        );
  } else {
    urgentie = zet(
      "urgentie",
      0,
      fase.fase === "marktconsultatie" || fase.fase === "vooraankondiging"
        ? `nog geen sluitingsdatum: deze aanbesteding is pas ${fase.label.toLowerCase()}`
        : "geen sluitingsdatum bekend; urgentie is niet vast te stellen in plaats van laag",
    );
  }

  /* HANDELBAAR: valt er NU iets te doen? */
  let handelbaar: number;
  if (fase.isEindstand) {
    handelbaar = zet(
      "handelbaar",
      0,
      fase.fase === "gegund"
        ? "de opdracht is gegund aan een ander; er is niets meer te doen behalve leren van de uitkomst"
        : "de aanbesteding is vroegtijdig beëindigd; er is niets om op in te schrijven",
    );
  } else {
    const bekend = [
      feiten.referentie ?? aanbestedingSleutel(inv.publicaties[0]?.extra ?? null),
      feiten.procedureSoort ?? inv.publicaties[0]?.extra?.["procedure.omschrijving"],
      sluit,
      feiten.omvang,
    ].filter(Boolean).length;
    handelbaar = zet(
      "handelbaar",
      bekend === 0 ? 20 : Math.min(100, 30 + bekend * 18),
      bekend === 0
        ? "er is een openbare bron met een URL, maar geen enkel procedureel feit; eerst uitzoeken"
        : `${bekend} van 4 procedurele feiten bekend`,
    );
  }

  return { relevantie, vertrouwen, urgentie, handelbaar, grondslag };
}

/* ------------------------------------------------------------------
   Kwalificeren
   ------------------------------------------------------------------ */

export function kwalificeer(inv: KansInvoer): Kans {
  const eerste = inv.publicaties[0]!;
  const alleTekst = inv.publicaties.map((p) => p.tekst ?? "").join("\n");
  const feiten = leesFeiten(alleTekst);
  const fase = faseVan(inv.publicaties.map(alsFasePublicatie));
  const scores = scoor(inv, feiten, fase);

  /* De gestructureerde bronvelden gaan VOOR op wat uit de tekst te
     halen valt: een veld dat de bron zelf levert is harder bewijs dan
     een regex op een alinea. */
  const nieuwste = [...inv.publicaties].sort((a, b) =>
    (a.gepubliceerdOp ?? "").localeCompare(b.gepubliceerdOp ?? ""),
  )[inv.publicaties.length - 1]!;
  const uitBron = (veld: string): string | null => {
    for (const p of [nieuwste, ...inv.publicaties]) {
      const v = p.extra?.[veld];
      if (v !== null && v !== undefined && String(v).trim()) return String(v).trim();
    }
    return null;
  };

  const referentie = aanbestedingSleutel(nieuwste.extra ?? null) ?? feiten.referentie;
  const procedureSoort = uitBron("procedure.omschrijving") ?? feiten.procedureSoort;
  const sluitOp = fase.sluitOp ?? feiten.sluitOp;

  const gevonden: Record<string, string | null> = {
    referentie,
    procedure_soort: procedureSoort,
    procedure_status: fase.fase === "onbekend" ? null : fase.label,
    sluit_op: sluitOp,
    opdracht_omvang: feiten.omvang ?? uitBron("typeOpdracht.omschrijving"),
    locatie: null,
    eisen: null,
  };
  const ontbrekend = DOSSIERVELDEN.filter(([sleutel]) => !gevonden[sleutel]).map(([, naam]) => naam);

  /* STATUS: de levenscyclus begint bij wat we weten, niet bij een wens.
     EEN EINDSTAND IS GEEN KANS. Een gegunde opdracht hoort niet in de
     werkvoorraad, hoe goed het onderwerp ook past — dat was de fout bij
     publicatie 441673, die als openstaande kans in productie stond. */
  const status: Status = fase.isEindstand
    ? "GEARCHIVEERD"
    : scores.relevantie < 25
      ? "GEARCHIVEERD"
      : ontbrekend.length >= 5
        ? "ONDERZOEK_NODIG"
        : ontbrekend.length === 0 && scores.vertrouwen >= 60
          ? "GEKWALIFICEERD"
          : "ONDERZOEK_NODIG";

  const publicaties = inv.publicaties.map((p) => {
    const { relatie, grondslag } = relatieVan(eerste, p);
    return { ...p, relatie, relatieGrondslag: grondslag };
  });

  return {
    opdrachtgever: inv.opdrachtgever,
    project: nieuwste.titel,
    locatie: null,
    referentie,
    procedureSoort,
    procedureStatus: gevonden.procedure_status ?? null,
    sluitOp,
    opdrachtOmvang: gevonden.opdracht_omvang ?? null,
    eisen: [],
    relevanteOplossingen: inv.relevanteOplossingen,
    scores,
    ontbrekend,
    fase: fase.fase,
    faseLabel: fase.label,
    faseGrondslag: fase.grondslag,
    identiteit: inv.identiteit ?? (referentie ? `kenmerk:${referentie}` : "titel"),
    identiteitGrondslag: inv.identiteitGrondslag ?? "",
    status,
    aanbevolenActie: aanbeveling(publicaties, ontbrekend, status, fase),
    publicaties,
  };
}

/**
 * De aanbevolen volgende stap.
 *
 * CONCREET EN UITVOERBAAR, en nooit een uitnodiging tot contact: §8
 * verbiedt dit platform om ongevraagd te benaderen, in te schrijven of
 * een CRM te vullen. De aanbeveling gaat daarom altijd over het
 * vaststellen van feiten, niet over het benaderen van een organisatie.
 */
function aanbeveling(
  publicaties: readonly Kans["publicaties"][number][],
  ontbrekend: readonly string[],
  status: Status,
  fase: FaseUitslag,
): string {
  /* EEN EINDSTAND KRIJGT EEN ANDERE AANBEVELING DAN EEN ZWAKKE KANS.
     'Archiveren wegens lage relevantie' zou bij een gegunde opdracht
     een onwaarheid zijn: het onderwerp was juist relevant, de opdracht
     is alleen weg. Dat verschil hoort de reviewer te zien. */
  if (fase.fase === "gegund") {
    return (
      `Niet opvolgen: deze opdracht is gegund (publicatie ${fase.bepalendeBron}). ` +
      `Wel waard om de gunning te bekijken — wie het won en tegen welke uitvraag ` +
      `is bruikbare marktinformatie voor de volgende ronde bij deze opdrachtgever.`
    );
  }
  if (fase.fase === "beeindigd") {
    return (
      `Niet opvolgen: de aanbesteding is vroegtijdig beëindigd (publicatie ${fase.bepalendeBron}). ` +
      `Een beëindiging wordt soms gevolgd door een nieuwe uitvraag; deze opdrachtgever is ` +
      `het volgen waard.`
    );
  }
  if (fase.fase === "marktconsultatie") {
    return (
      `Dit is een marktconsultatie, geen opdracht. Vaststellen of deelname mogelijk is: ` +
      `een consultatie is het moment waarop de eisen nog niet vastliggen.`
    );
  }
  if (fase.fase === "vooraankondiging") {
    return (
      `Vooraangekondigd: er is nog geen opdracht om op in te schrijven. ` +
      `Vastleggen wanneer de aankondiging wordt verwacht en dan opnieuw beoordelen.`
    );
  }
  if (status === "GEARCHIVEERD") {
    return "Archiveren: de relevantie is te laag om tijd aan te besteden.";
  }
  const onbekendeRelatie = publicaties.filter((p) => p.relatie === "onbekend");
  if (publicaties.length > 1 && onbekendeRelatie.length > 0) {
    return (
      `Open de ${publicaties.length} aankondigingen naast elkaar en vergelijk kenmerk, perceel en ` +
      `procedurefase. Daarmee staat vast of dit één inkoop in meerdere fases is of meerdere ` +
      `opdrachten. Leg daarna ${ontbrekend.slice(0, 3).join(", ")} vast.`
    );
  }
  if (ontbrekend.length) {
    const termijn = fase.sluitOp
      ? `Sluit op ${fase.sluitOp}` +
        (fase.vervangenSluitdatums.length > 0
          ? ` — let op, dat is de verzette termijn uit publicatie ${fase.sluitOpBron}; ` +
            `de eerdere datum ${fase.vervangenSluitdatums.join(" en ")} is vervallen.`
          : `.`)
      : `Zonder sluitingsdatum is niet te zeggen of dit nog te halen is.`;
    return `Open de aankondiging en leg vast: ${ontbrekend.slice(0, 4).join(", ")}. ${termijn}`;
  }
  return "Beoordelen of de eisen haalbaar zijn en of inschrijven zinvol is.";
}

/** Categorieën waaruit een kans mag ontstaan. */
export function mageenKansWorden(c: Categorie): boolean {
  return c === "commerciele_kans";
}
