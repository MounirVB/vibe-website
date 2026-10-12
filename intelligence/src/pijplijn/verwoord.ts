/* ============================================================
   VERWOORDEN — Nederlandse prosa uit gestructureerde velden
   ------------------------------------------------------------
   WAT HIER NIET IN ZIT

   Geen woord uit de brontekst. Elke zin wordt opgebouwd uit
   intel.fenomenen.zinsvorm, intel.subjecten.zinsvorm, de genormaliseerde
   waarde en onze eigen verbindingswoorden. Dat is de reden dat dit mag
   bij een bron met mag_citeren = false.

   WAT DE VORIGE GENERATIE OPLEVERDE

     "Per 2026-04-03 meldt Netbeheer Nederland: 8%, 60%."
     "Per 2025-11-24 is vastgelegd: 200000000000 euro, 125000000 euro."

   Numeriek juist, als zin waardeloos. Het verschil zit niet in de
   formulering maar in de velden: zonder fenomeen en grondtal valt er
   geen zin te maken, en dan hoort er ook geen te komen.

   WAT HET NU OPLEVERT, uit dezelfde bron:

     "Volgens Netbeheer Nederland stijgt het nettarief voor
      kleinverbruikers in 2027 met 8%."

     "Volgens Netbeheer Nederland investeren de netbeheerders tot 2040
      meer dan EUR 200 miljard in het landelijke elektriciteitsnet."

   DE ONZEKERHEID STAAT IN DE ZIN, niet in een voetnoot. 'circa',
   'minstens', 'tussen x en y' en 'naar schatting' komen uit het veld
   `exactheid` en horen in de bewering zelf, want een benadering die als
   exact wordt opgeschreven is een onwaarheid.
   ============================================================ */

import type { Exactheid, Uitdrukking } from "./uitdrukking.ts";
import type { Semantiek } from "./semantiek.ts";

/** De zinsvormen uit intel.fenomenen. Hier als constante, daar als tabel. */
export const FENOMEEN_ZINSVORM: Readonly<Record<string, string>> = {
  nettarief: "het nettarief",
  netinvestering: "de investering in het net",
  subsidiebudget: "het subsidiebudget",
  subsidiebedrag: "het subsidiebedrag",
  batterijcapaciteit: "de batterijcapaciteit",
  opgesteldvermogen: "het opgestelde vermogen",
  aansluitvermogen: "het aansluitvermogen",
  transportvermogen: "het gecontracteerde transportvermogen",
  netcapaciteit: "de beschikbare netcapaciteit",
  energieverbruik: "het energieverbruik",
  energieproductie: "de energieproductie",
  elektriciteitsprijs: "de elektriciteitsprijs",
  doorlooptijd: "de doorlooptijd",
  wachttijd: "de wachttijd",
  aantal_aanvragen: "het aantal aanvragen",
  aantal_projecten: "het aantal projecten",
  opdrachtwaarde: "de waarde van de opdracht",
};

/**
 * De zinsvorm van een subject PLUS of het meervoud is.
 *
 * Zonder dat getal kwam er "investeert de netbeheerders" uit: het
 * werkwoord stond vast in het enkelvoud terwijl het subject meervoud is.
 * Een zin met een congruentiefout leest als machinetaal en ondermijnt
 * het voorstel, ook als het feit klopt.
 */
export const SUBJECT_ZINSVORM: Readonly<Record<string, { vorm: string; meervoud: boolean }>> = {
  kleinverbruiker: { vorm: "kleinverbruikers", meervoud: true },
  grootverbruiker: { vorm: "grootverbruikers", meervoud: true },
  huishouden: { vorm: "huishoudens", meervoud: true },
  bedrijf: { vorm: "bedrijven", meervoud: true },
  netbeheerder: { vorm: "de netbeheerders", meervoud: true },
  landelijk_net: { vorm: "het landelijke elektriciteitsnet", meervoud: false },
  regionaal_net: { vorm: "het regionale net", meervoud: false },
  overheid: { vorm: "de overheid", meervoud: false },
  aanvrager: { vorm: "aanvragers", meervoud: true },
  opdrachtgever: { vorm: "de opdrachtgever", meervoud: false },
};

/** Het werkwoord in de juiste persoonsvorm. */
function vervoeg(stam: "investeren" | "bedragen" | "stijgen" | "dalen", meervoud: boolean): string {
  const tabel = {
    investeren: ["investeert", "investeren"],
    bedragen: ["bedraagt", "bedragen"],
    stijgen: ["stijgt", "stijgen"],
    dalen: ["daalt", "dalen"],
  } as const;
  return tabel[stam][meervoud ? 1 : 0];
}

/** Tijdseenheden krijgen een meervoud; '18 maand' is geen Nederlands. */
const MEERVOUD_EENHEID: Readonly<Record<string, string>> = {
  jaar: "jaar",
  maand: "maanden",
  week: "weken",
  dag: "dagen",
};

/** Een getal in Nederlandse schrijfwijze, met schaalwoord waar dat leest. */
export function getalInWoorden(waarde: number, eenheid: string | null): string {
  const e = (eenheid ?? "").trim();
  const isGeld = e === "EUR";
  const voorvoegsel = isGeld ? "EUR " : "";
  const eenheidVorm =
    MEERVOUD_EENHEID[e] && waarde !== 1 ? MEERVOUD_EENHEID[e]! : e;
  const achtervoegsel = isGeld ? "" : e ? (e === "%" ? "%" : ` ${eenheidVorm}`) : "";

  const nl = (n: number) =>
    Number.isInteger(n) ? n.toLocaleString("nl-NL") : n.toLocaleString("nl-NL", { maximumFractionDigits: 2 });

  if (Math.abs(waarde) >= 1_000_000_000 && waarde % 100_000_000 === 0) {
    return `${voorvoegsel}${nl(waarde / 1_000_000_000)} miljard${achtervoegsel}`;
  }
  if (Math.abs(waarde) >= 1_000_000 && waarde % 100_000 === 0) {
    return `${voorvoegsel}${nl(waarde / 1_000_000)} miljoen${achtervoegsel}`;
  }
  return `${voorvoegsel}${nl(waarde)}${achtervoegsel}`;
}

/** De kwalificatie die vóór het getal hoort. */
function kwalificatie(exactheid: Exactheid): string {
  switch (exactheid) {
    case "benaderd":
      return "circa ";
    case "geschat":
      return "naar schatting ";
    case "ondergrens":
      return "meer dan ";
    case "bovengrens":
      return "maximaal ";
    default:
      return "";
  }
}

function waardeInZin(u: Uitdrukking): string {
  if (u.exactheid === "bereik" && u.bereikMin !== null && u.bereikMax !== null) {
    /* Bij een bereik hoort de eenheid één keer, achter het tweede getal. */
    const min = getalInWoorden(u.bereikMin, null);
    return `tussen ${min} en ${getalInWoorden(u.bereikMax, u.eenheid)}`;
  }
  return `${kwalificatie(u.exactheid)}${getalInWoorden(u.waarde, u.eenheid)}`;
}

export type VerwoordInvoer = {
  readonly semantiek: Semantiek;
  readonly uitdrukking: Uitdrukking;
  /** De uitgever, voor de bronvermelding. */
  readonly uitgever: string | null;
  /** De publicatiedatum van de bron, als ISO-dag. */
  readonly brondatum: string | null;
};

const MAAND_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

/** '2026-04-03' -> '3 april 2026'. */
export function datumInWoorden(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const maand = MAAND_NL[Number(m[2]) - 1];
  if (!maand) return null;
  return `${Number(m[3])} ${maand} ${m[1]}`;
}

/**
 * Bouwt één Nederlandse zin.
 *
 * Geeft null terug als de velden geen zin toelaten. Dat is geen
 * tekortkoming van deze functie maar het antwoord: wie niet weet wat er
 * gemeten is, hoort geen zin te schrijven. De poort in semantiek.ts
 * beslist dat; deze functie dubbelcheckt het zodat een aanroeper die de
 * poort vergeet geen onzin produceert.
 */
export function verwoord(inv: VerwoordInvoer): string | null {
  const { semantiek: s, uitdrukking: u } = inv;
  if (!s.fenomeen) return null;
  const fenomeen = FENOMEEN_ZINSVORM[s.fenomeen];
  if (!fenomeen) return null;
  /* Bij een stijging of daling IS het fenomeen het grondtal: 'het
     nettarief stijgt met 8%'. Een expliciet grondtal gaat voor. */
  const grondtalSleutel = s.grondtal ?? (s.richting === "stijging" || s.richting === "daling" ? s.fenomeen : null);
  if (s.soort === "percentage" && !grondtalSleutel) return null;

  const subjectVorm = s.subject ? SUBJECT_ZINSVORM[s.subject] : null;
  const subject = subjectVorm?.vorm ?? null;
  const subjectMeervoud = subjectVorm?.meervoud ?? false;
  const bron = inv.uitgever ? `Volgens ${inv.uitgever}` : "Volgens de bron";
  const periode = s.periode ? ` ${s.periode}` : "";
  const waarde = waardeInZin(u);

  /* ---------- PERCENTAGE: een verandering van iets ---------- */
  if (s.soort === "percentage") {
    const grondtalVorm = FENOMEEN_ZINSVORM[grondtalSleutel!] ?? fenomeen;
    const voor = subject ? ` voor ${subject}` : "";
    if (s.richting === "stijging") {
      return `${bron} stijgt ${grondtalVorm}${voor}${periode} met ${waarde}.`;
    }
    if (s.richting === "daling") {
      return `${bron} daalt ${grondtalVorm}${voor}${periode} met ${waarde}.`;
    }
    if (s.richting === "ongewijzigd") {
      return `${bron} blijft ${grondtalVorm}${voor}${periode} ongewijzigd.`;
    }
    /* GEEN RICHTING, GEEN ZIN.
       De 'aandeel van'-tak stond hier en liet het predicaat vallen:
       "60% van de projecten" waar de bron "60% van de projecten loopt
       vertraging op" zei. Zonder richting is het predicaat vrije tekst,
       en dan hoort er geen zin te komen. De poort weigert dit al; dit is
       de tweede slot op dezelfde deur. */
    return null;
  }

  /* ---------- BEDRAG ---------- */
  if (s.soort === "bedrag") {
    const door = subject ? `${subject} ` : "";
    if (s.fenomeen === "netinvestering") {
      const werkwoord = vervoeg("investeren", subjectMeervoud);
      return `${bron} ${werkwoord} ${door}${periode ? `${periode.trim()} ` : ""}${waarde} in het net.`
        .replace(/\s+/g, " ");
    }
    if (s.richting === "stijging") {
      return `${bron} stijgt ${fenomeen}${subject ? ` voor ${subject}` : ""}${periode} met ${waarde}.`;
    }
    if (s.richting === "daling") {
      return `${bron} daalt ${fenomeen}${subject ? ` voor ${subject}` : ""}${periode} met ${waarde}.`;
    }
    return `${bron} ${vervoeg("bedragen", false)} ${fenomeen}${subject ? ` voor ${subject}` : ""}${periode} ${waarde}.`;
  }

  /* ---------- TERMIJN: een doorlooptijd of wachttijd ---------- */
  if (s.soort === "termijn") {
    const vanWie = subject ? ` voor ${subject}` : "";
    if (s.richting === "stijging") {
      return `${bron} loopt ${fenomeen}${vanWie} op tot ${waarde}.`;
    }
    if (s.richting === "daling") {
      return `${bron} daalt ${fenomeen}${vanWie} tot ${waarde}.`;
    }
    return `${bron} ${vervoeg("bedragen", false)} ${fenomeen}${vanWie} ${waarde}.`;
  }

  /* ---------- VERMOGEN, ENERGIE, NETCAPACITEIT ---------- */
  if (s.soort === "vermogen" || s.soort === "energie" || s.soort === "netcapaciteit") {
    const vanWie = subject ? ` van ${subject}` : "";
    if (s.richting === "stijging") {
      return `${bron} neemt ${fenomeen}${vanWie}${periode} toe met ${waarde}.`;
    }
    if (s.richting === "daling") {
      return `${bron} neemt ${fenomeen}${vanWie}${periode} af met ${waarde}.`;
    }
    return `${bron} bedraagt ${fenomeen}${vanWie}${periode} ${waarde}.`;
  }

  return null;
}

/**
 * De volledige bewering, met datum en bronvermelding.
 *
 * De datum staat erbij omdat een feit zonder datum niet te plaatsen is,
 * en de bron omdat een bewering zonder herkomst in dit systeem niet
 * bestaat.
 */
export function verwoordMetHerkomst(inv: VerwoordInvoer): string | null {
  const zin = verwoord(inv);
  if (!zin) return null;
  const datum = datumInWoorden(inv.brondatum);
  return datum ? `${zin.replace(/\.$/, "")} (gepubliceerd ${datum}).` : zin;
}
