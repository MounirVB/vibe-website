/* ============================================================
   UITDRUKKING — een getal uit een zin halen zonder betekenis te verliezen
   ------------------------------------------------------------
   WAT DE VORIGE PARSER LIET VALLEN, GEMETEN OP DE LIJST UIT §6

     "200 miljoen kWh"      -> NIETS. De eenhedenroute kende geen
                               schaalwoorden, dus de hele uitspraak
                               verdween stil.
     "tussen 50 en 80 euro" -> 80 EUR. De ondergrens weg, een bereik
                               werd een punt.
     "meer dan 1.250 euro"  -> 1250 EUR. Het 'meer dan' weg, een
                               ondergrens werd een exacte waarde.
     "circa 60%"            -> 60 %. Het 'circa' weg, een benadering
                               werd exact.
     "ongeveer 2,5 MW"      -> 2.5 MW. Idem.
     "8%"                   -> 8 %. Geen grondtal: 8% van wat?
     "per jaar", "per maand"-> weg. De periode verdween.

   De schaalreparatie voor euro's was dus de helft van het werk: de
   eenhedenroute had hem ook nodig, en bij een gemiste match verdwijnt
   de uitspraak compleet in plaats van verkeerd te worden. Dat is
   stiller en daarmee erger.

   WAT DEZE MODULE DOET

   Ze leest een getaluitdrukking en geeft alles terug wat er in staat:
   de genormaliseerde waarde, de oorspronkelijke uitdrukking, de schaal,
   de eenheid, de exactheid, de grenzen van een bereik en de periode.
   Niets wordt weggegooid; wat niet gevonden is, is null en dat is een
   zichtbaar antwoord.

   WAT ZE NIET DOET

   Ze verzint geen subject en geen grondtal. Dat is semantiek.ts, en die
   leunt op een eigen vocabulaire omdat de bronnen citeren verbieden.
   ============================================================ */

/** Hoe zeker is de waarde? */
export type Exactheid = "exact" | "benaderd" | "ondergrens" | "bovengrens" | "bereik" | "geschat";

export type Uitdrukking = {
  /** De genormaliseerde waarde, met de schaal er al in verwerkt. */
  readonly waarde: number;
  /** De oorspronkelijke uitdrukking: alleen het getaldeel. */
  readonly uitdrukking: string;
  readonly eenheid: string | null;
  /** Het schaalwoord zoals het in de bron stond, apart bewaard. */
  readonly schaalwoord: string | null;
  readonly exactheid: Exactheid;
  readonly bereikMin: number | null;
  readonly bereikMax: number | null;
  /** 'per jaar', 'per maand', 'per kWh' — wat de noemer van het getal is. */
  readonly periode: string | null;
  /**
   * De tijdgrens van de uitspraak: 'tot 2040', 'vanaf 2026', '2027-2030'.
   *
   * APART VAN `periode`, want het zijn twee verschillende feiten. "EUR 125
   * miljoen per jaar vanaf 2026" heeft een herhaling EN een horizon, en wie
   * er één veld van maakt verliest de andere. Par. 8 noemt het weglaten van
   * de tijdgrens expliciet onacceptabel: "De netbeheerders investeren EUR
   * 200 miljard" is een andere bewering dan "tot 2040 ... meer dan EUR 200
   * miljard".
   */
  readonly horizon: string | null;
  /** Tekenpositie in de zin, voor de vindplaats. */
  readonly positie: number;
};

const SCHAAL: Readonly<Record<string, number>> = {
  duizend: 1_000,
  mille: 1_000,
  miljoen: 1_000_000,
  mln: 1_000_000,
  miljard: 1_000_000_000,
  mld: 1_000_000_000,
  biljoen: 1_000_000_000_000,
};

/**
 * Eenheden, langste patroon eerst.
 *
 * De volgorde is niet vrij: 'MWh' moet vóór 'MW' staan en 'ct/kWh' vóór
 * 'kWh', anders leest '5 MWh' als '5 MW' en dat is een factor tijd.
 */
export const EENHEDEN: readonly { patroon: string; eenheid: string }[] = [
  { patroon: "eur/mwh", eenheid: "EUR/MWh" },
  { patroon: "euro/mwh", eenheid: "EUR/MWh" },
  { patroon: "ct/kwh", eenheid: "ct/kWh" },
  { patroon: "gwh", eenheid: "GWh" },
  { patroon: "mwh", eenheid: "MWh" },
  { patroon: "kwh", eenheid: "kWh" },
  { patroon: "mwp", eenheid: "MWp" },
  { patroon: "kwp", eenheid: "kWp" },
  { patroon: "mva", eenheid: "MVA" },
  { patroon: "kva", eenheid: "kVA" },
  { patroon: "gw", eenheid: "GW" },
  { patroon: "mw", eenheid: "MW" },
  { patroon: "kw", eenheid: "kW" },
  { patroon: "kv", eenheid: "kV" },
  { patroon: "wp", eenheid: "Wp" },
  { patroon: "%", eenheid: "%" },
  /* TIJDSEENHEDEN. Zonder deze viel 'tot 5 jaar' buiten de parser en
     bleef een doorlooptijd of wachttijd volledig onzichtbaar — terwijl
     intel.fenomenen die eenheden wel verwacht bij doorlooptijd en
     wachttijd. */
  { patroon: "jaar", eenheid: "jaar" },
  { patroon: "jaren", eenheid: "jaar" },
  { patroon: "maanden", eenheid: "maand" },
  { patroon: "maand", eenheid: "maand" },
  { patroon: "weken", eenheid: "week" },
  { patroon: "week", eenheid: "week" },
  { patroon: "dagen", eenheid: "dag" },
  { patroon: "dag", eenheid: "dag" },
];

/** Woorden die zeggen dat een getal niet exact is. */
const BENADERING = /\b(circa|ca\.?|ongeveer|rond|grofweg|naar schatting|zo'n|ruwweg)\b/i;
const GESCHAT = /\b(geschat|schatting|verwacht|prognose|indicatief)\b/i;
const ONDERGRENS = /\b(meer dan|minstens|minimaal|ten minste|vanaf|boven de|groter dan|>\s*)/i;
const BOVENGRENS = /\b(minder dan|maximaal|hoogstens|tot maximaal|onder de|kleiner dan|<\s*)/i;

/** 'per jaar', 'per maand', 'per aansluiting'. */
const PERIODE = /\bper\s+(jaar|maand|week|dag|kwartaal|aansluiting|kWh|MWh|woning|project)\b/i;

/* JAARAANDUIDINGEN. 'tot 2040', 'in 2027', 'vanaf 2026' zijn de periode
   van de uitspraak, en zonder die aanduiding is een investeringsbedrag
   of een tarief niet te plaatsen. Deze stond er niet, waardoor 'Tot 2040
   investeren de netbeheerders ...' zijn horizon verloor. */
const JAARPERIODE = /\b(tot(?:\s+en\s+met)?|in|vanaf|voor|sinds|per)\s+(20\d{2})\b/i;

/* 'in de periode 2027-2030', '2027 tot 2030', 'tussen 2026 en 2030'. */
const PERIODEBEREIK =
  /\b(?:in\s+de\s+periode\s+|tussen\s+)?(20\d{2})\s*(?:-|–|t\/m|tot(?:\s+en\s+met)?|en)\s*(20\d{2})\b/i;

/**
 * Nederlands getal naar number.
 *
 * Punt is duizendscheiding, komma is decimaalteken. '1.250,5' is
 * twaalfhonderdvijftig en een half, niet 1,2505.
 */
export function getalVan(ruw: string): number | null {
  const genormaliseerd = ruw.trim().replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number.parseFloat(genormaliseerd);
  return Number.isFinite(n) ? n : null;
}

/*
 * DE LINKERGRENS IS GEEN DETAIL — ZONDER HEM STAAT ER EEN ANDER GETAL.
 *
 * `GETAL` kent twee alternatieven: een getal MET duizendpunten
 * (1.250,5) en een getal zonder (250). Een punt die NIET door exact
 * drie cijfers wordt gevolgd, past op geen van beide. De regexmotor
 * geeft dan niet op: hij schuift op en matcht het staartje. Gemeten
 * met exact deze patronen:
 *
 *     "een rendement van 19.5%"        ->  5 %        (werkelijk 19,5)
 *     "de prijs is 164.09 euro"        ->  09 euro    (werkelijk 164,09)
 *     "groei van 7.5% naar 12.25%"     ->  5 % en 25 %
 *
 * Een factor vier tot twintig eraf, en niets dat dat zou opvallen —
 * want `uitspraken.ts` draagt hetzelfde patroon, dus de kruiscontrole
 * in verrijk() vergelijkt twee keer DEZELFDE verkeerde waarde en vindt
 * ze gelijk. Dat is precies de klasse fout die Release 3.0.2 en 3.0.3
 * moesten uitbannen: niet een ontbrekend getal, maar een onwaar getal
 * met een bron eronder.
 *
 * `(?<![\d.,])` weigert een match die direct op een cijfer, een punt of
 * een komma volgt. Een dubbelzinnig getal levert daarmee NIETS in
 * plaats van iets verkeerds — strikt beperkender, nooit ruimer. De drie
 * gevallen hierboven geven na deze wijziging een lege lijst, en
 * `1.250,5 kW`, `250 kW` en `2.500 EUR` blijven onveranderd matchen.
 *
 * Let op bij wijzigen: de grens hoort in het PATROON en niet in
 * getalVan(), want het defect zit in WELKE tekens de match omspant, niet
 * in hoe de gevonden string wordt omgerekend.
 */
const GETALGRENS = String.raw`(?<![\d.,])`;
const GETAL = String.raw`\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?`;

function eenheidAlternatieven(): string {
  return EENHEDEN.map((e) => e.patroon.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
}

function eenheidVan(ruw: string): string | null {
  return EENHEDEN.find((e) => e.patroon === ruw.toLowerCase())?.eenheid ?? null;
}

/** Het stukje zin vóór het getal, waar de kwalificatie in staat. */
function aanloop(zin: string, positie: number): string {
  return zin.slice(Math.max(0, positie - 40), positie);
}

/** Het stukje zin ná de uitdrukking, waar de periode in staat. */
function uitloop(zin: string, eind: number): string {
  return zin.slice(eind, Math.min(zin.length, eind + 30));
}

function exactheidVan(voor: string, isBereik: boolean): Exactheid {
  if (isBereik) return "bereik";
  if (GESCHAT.test(voor)) return "geschat";
  if (BENADERING.test(voor)) return "benaderd";
  /* Ondergrens vóór bovengrens: 'niet meer dan' bestaat, maar 'meer
     dan' is veel gebruikelijker en de bovengrensvariant heeft zijn eigen
     woorden. */
  if (ONDERGRENS.test(voor)) return "ondergrens";
  if (BOVENGRENS.test(voor)) return "bovengrens";
  return "exact";
}

/** De herhaling: 'per jaar', 'per maand'. */
function periodeVan(na: string): string | null {
  const m = PERIODE.exec(na);
  return m?.[1] ? `per ${m[1].toLowerCase()}` : null;
}

/**
 * De tijdgrens, uit de HELE zin.
 *
 * Eerst werd hier alleen een venster van 40 tekens vóór het getal
 * bekeken. 'Tot 2040 investeren de netbeheerders meer dan EUR 200
 * miljard' heeft 45 tekens tussen 'Tot 2040' en het bedrag, dus de
 * horizon viel er net buiten en verdween. Een tijdgrens hoort nergens
 * af te hangen van een vensterbreedte, dus: de hele zin.
 */
function horizonVan(zin: string): string | null {
  const bereik = PERIODEBEREIK.exec(zin);
  if (bereik?.[1] && bereik[2] && bereik[1] !== bereik[2]) {
    return `${bereik[1]}-${bereik[2]}`;
  }
  const j = JAARPERIODE.exec(zin);
  if (j?.[1] && j[2]) {
    const woord = j[1].toLowerCase();
    return `${woord === "per" ? "in" : woord} ${j[2]}`;
  }
  return null;
}

/**
 * Leest alle getaluitdrukkingen uit een zin.
 *
 * BEREIKEN EERST. '50 tot 80 euro' moet als één bereik worden gelezen en
 * niet als twee losse waarden; wie de losse route eerst laat lopen,
 * bewaart alleen de laatste en noemt die exact.
 */
export function leesUitdrukkingen(zin: string): Uitdrukking[] {
  const uit: Uitdrukking[] = [];
  const gedekt: { van: number; tot: number }[] = [];
  const overlapt = (van: number, tot: number) =>
    gedekt.some((g) => van < g.tot && tot > g.van);

  const eh = eenheidAlternatieven();

  /* ---------- 1. BEREIKEN ---------- */
  /* 'tussen 50 en 80 euro', '50 tot 80 kW', '50-80%'. De eenheid staat
     achter het tweede getal; soms ook achter het eerste. */
  const bereikPatroon = new RegExp(
    String.raw`(?:tussen\s+)?${GETALGRENS}(${GETAL})\s*(?:${eh})?\s*(?:tot(?:\s+en\s+met)?|en|-|–|t\/m)\s*(${GETAL})\s*(€|EUR|euro|${eh})?`,
    "giu",
  );
  let m: RegExpExecArray | null;
  while ((m = bereikPatroon.exec(zin)) !== null) {
    const a = getalVan(m[1] ?? "");
    const b = getalVan(m[2] ?? "");
    if (a === null || b === null || a > b) continue;
    /* Zonder eenheid is 'tussen 2 en 3' geen meetbare uitspraak maar
       waarschijnlijk een opsomming. Die slaan we over. */
    const ruweEenheid = (m[3] ?? "").toLowerCase();
    if (!ruweEenheid) continue;
    const eenheid =
      ruweEenheid === "€" || ruweEenheid === "euro" || ruweEenheid === "eur"
        ? "EUR"
        : eenheidVan(ruweEenheid);
    if (!eenheid) continue;

    const voor = aanloop(zin, m.index);
    const na = uitloop(zin, m.index + m[0].length);
    gedekt.push({ van: m.index, tot: m.index + m[0].length });
    uit.push({
      waarde: b,
      uitdrukking: m[0].trim(),
      eenheid,
      schaalwoord: null,
      exactheid: "bereik",
      bereikMin: a,
      bereikMax: b,
      periode: periodeVan(na),
      horizon: horizonVan(zin),
      positie: m.index,
    });
  }

  /* ---------- 2. BEDRAGEN ---------- */
  /* '€ 1.250', '1.250 euro', '€200 miljard', '200 miljoen euro'. */
  /* 'EUR' NAAST '€' EN 'euro'.
     Bronnen schrijven alle drie. Met alleen '€' en 'euro' viel
     'EUR 235 miljoen' buiten de parser en verdween het bedrag — stil,
     net als bij de schaalwoorden op de eenhedenroute. */
  const bedragPatroon = new RegExp(
    String.raw`(?:(?:€|EUR)\s*${GETALGRENS}(${GETAL})|${GETALGRENS}(${GETAL})\s*(?:euro|EUR)\b)\s*(duizend|miljoen|miljard|biljoen|mln\.?|mld\.?)?` +
      String.raw`|(?:(?:€|EUR)\s*)?${GETALGRENS}(${GETAL})\s*(duizend|miljoen|miljard|biljoen|mln\.?|mld\.?)\s*(?:euro|EUR)\b`,
    "giu",
  );
  while ((m = bedragPatroon.exec(zin)) !== null) {
    if (overlapt(m.index, m.index + m[0].length)) continue;
    const basis = getalVan(m[1] ?? m[2] ?? m[4] ?? "");
    if (basis === null) continue;
    const schaalRuw = (m[3] ?? m[5] ?? "").toLowerCase().replace(/\.$/, "");
    const factor = SCHAAL[schaalRuw] ?? 1;
    const voor = aanloop(zin, m.index);
    const na = uitloop(zin, m.index + m[0].length);
    gedekt.push({ van: m.index, tot: m.index + m[0].length });
    uit.push({
      waarde: basis * factor,
      uitdrukking: m[0].trim(),
      eenheid: "EUR",
      schaalwoord: schaalRuw || null,
      exactheid: exactheidVan(voor, false),
      bereikMin: null,
      bereikMax: null,
      periode: periodeVan(na),
      horizon: horizonVan(zin),
      positie: m.index,
    });
  }

  /* ---------- 3. EENHEDEN, MÉT SCHAALWOORD ---------- */
  /* Dit is de route die '200 miljoen kWh' liet vallen. Het schaalwoord
     staat nu tussen het getal en de eenheid, en is optioneel. */
  const eenheidPatroon = new RegExp(
    String.raw`${GETALGRENS}(${GETAL})\s*(duizend|miljoen|miljard|biljoen|mln\.?|mld\.?)?\s*(${eh})(?![\p{L}])`,
    "giu",
  );
  while ((m = eenheidPatroon.exec(zin)) !== null) {
    if (overlapt(m.index, m.index + m[0].length)) continue;
    const basis = getalVan(m[1] ?? "");
    if (basis === null) continue;
    const eenheid = eenheidVan(m[3] ?? "");
    if (!eenheid) continue;
    const schaalRuw = (m[2] ?? "").toLowerCase().replace(/\.$/, "");
    const factor = SCHAAL[schaalRuw] ?? 1;
    const voor = aanloop(zin, m.index);
    const na = uitloop(zin, m.index + m[0].length);
    gedekt.push({ van: m.index, tot: m.index + m[0].length });
    uit.push({
      waarde: basis * factor,
      uitdrukking: m[0].trim(),
      eenheid,
      schaalwoord: schaalRuw || null,
      exactheid: exactheidVan(voor, false),
      bereikMin: null,
      bereikMax: null,
      periode: periodeVan(na),
      horizon: horizonVan(zin),
      positie: m.index,
    });
  }

  return uit.sort((a, b) => a.positie - b.positie);
}

/**
 * Controleert of een genormaliseerde waarde te rijmen is met zijn
 * oorspronkelijke uitdrukking.
 *
 * Dit is de poort die schaalverlies betrapt, onafhankelijk van de
 * parser. Hij bestaat omdat de parser al eens een factor 10^9 liet
 * vallen met de hoogste bewijskwaliteit die dit systeem kent; één
 * implementatie vertrouwen is dan niet genoeg.
 */
export function rijmtMetUitdrukking(
  waarde: number,
  uitdrukking: string | null,
): { ok: true } | { ok: false; reden: string } {
  if (!uitdrukking) return { ok: true };
  const m = /\b(duizend|miljoen|miljard|biljoen|mln\.?|mld\.?)\b/i.exec(uitdrukking);
  if (!m) return { ok: true };
  const woord = m[1]!.toLowerCase().replace(/\.$/, "");
  const factor = SCHAAL[woord] ?? 1;
  if (Math.abs(waarde) < factor) {
    return {
      ok: false,
      reden:
        `de uitdrukking '${uitdrukking}' bevat het schaalwoord '${woord}' (factor ${factor}), ` +
        `maar de bewaarde waarde ${waarde} is kleiner dan die factor. Het schaalwoord is ` +
        `onderweg verdwenen.`,
    };
  }
  return { ok: true };
}

/** Is dit een vermogens- of een energie-eenheid? kW is geen kWh. */
export function eenheidSoort(
  eenheid: string | null,
): "vermogen" | "energie" | "geld" | "deel" | "tijd" | "anders" {
  const e = (eenheid ?? "").trim();
  if (["kW", "MW", "GW", "kWp", "MWp", "Wp", "kVA", "MVA"].includes(e)) return "vermogen";
  if (["kWh", "MWh", "GWh"].includes(e)) return "energie";
  if (["EUR", "EUR/MWh", "ct/kWh"].includes(e)) return "geld";
  if (e === "%") return "deel";
  if (["jaar", "maand", "week", "dag"].includes(e)) return "tijd";
  return "anders";
}
