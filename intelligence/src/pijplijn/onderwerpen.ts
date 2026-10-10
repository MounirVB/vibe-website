/* ============================================================
   PIJPLIJN — onderwerpherkenning, deterministisch
   ------------------------------------------------------------
   Classificeren gebeurt met een woordenlijst, niet met een model.
   Twee redenen: het kost niets, en het is reproduceerbaar — dezelfde
   titel levert over een jaar dezelfde classificatie, wat nodig is om
   een besluit later te kunnen navertellen.

   Pas als een item door deze zeef komt én materieel genoeg is, mag er
   een modelaanroep aan te pas komen. Dat is de goedkope laag vóór de
   dure laag.
   ============================================================ */

import type { Onderwerp } from "../bronnen/soorten.ts";

type Vocabulaire = {
  readonly onderwerp: Onderwerp;
  /** Sterke termen: één treffer is genoeg. */
  readonly sterk: readonly string[];
  /** Zwakke termen: minstens twee nodig, of één samen met een sterke. */
  readonly zwak: readonly string[];
  /** Termen die dit onderwerp juist uitsluiten. */
  readonly tegen: readonly string[];
};

const VOCABULAIRE: readonly Vocabulaire[] = [
  {
    onderwerp: "netcongestie",
    sterk: [
      "netcongestie",
      "congestiemanagement",
      "congestieonderzoek",
      "transportbeperking",
      "transportschaarste",
      "congestiegebied",
      "wachtrij voor netaansluiting",
      "wachtlijst netaansluiting",
      "filegebied",
    ],
    zwak: ["transportcapaciteit", "netcapaciteit", "aansluitcapaciteit", "wachtrij", "wachtlijst", "schaarste"],
    tegen: [],
  },
  {
    onderwerp: "netbeheer",
    sterk: ["netbeheerder", "investeringsplan", "nettarief", "nettarieven", "tariefstructuur", "netverzwaring"],
    zwak: ["elektriciteitsnet", "hoogspanning", "middenspanning", "onderstation", "schakelstation", "stroomnet", "netbeheer"],
    tegen: [],
  },
  {
    onderwerp: "subsidie",
    sterk: [
      "sde++",
      "sde+",
      "isde",
      "sce",
      "eia",
      "mia",
      "vamil",
      "subsidieregeling",
      "subsidieronde",
      "openstelling subsidie",
      "subsidieplafond",
    ],
    zwak: ["subsidie", "regeling", "budget", "aanvraagperiode", "beschikking"],
    tegen: [],
  },
  {
    onderwerp: "regelgeving",
    sterk: [
      "energiewet",
      "netcode",
      "tarievencode",
      "codebesluit",
      "wetsvoorstel",
      "kamerbrief",
      "algemene maatregel van bestuur",
      "ministeriele regeling",
      "besluit van de autoriteit consument",
    ],
    zwak: ["besluit", "regelgeving", "wetgeving", "toezichthouder", "acm", "consultatie", "geschilbesluit"],
    tegen: [],
  },
  {
    onderwerp: "marktprijs",
    sterk: ["day-ahead", "onbalansprijs", "epex", "spotprijs", "negatieve prijzen", "onbalansmarkt"],
    zwak: ["elektriciteitsprijs", "stroomprijs", "prijspiek", "prijsspreiding", "eur/mwh"],
    tegen: [],
  },
  {
    onderwerp: "flexibiliteit",
    sterk: ["flexibiliteit", "flexvermogen", "congestiedienst", "gopacs", "afroepbaar vermogen", "demand response"],
    zwak: ["flexvermogen", "regelvermogen", "aggregator", "flexibele capaciteit"],
    tegen: [],
  },
  {
    onderwerp: "bess",
    sterk: [
      "batterijopslag",
      "batterijsysteem",
      "bess",
      "energieopslag",
      "thuisbatterij",
      "grootschalige batterij",
      "batterijpark",
      "peak shaving",
    ],
    zwak: ["batterij", "batterijen", "energieopslag", "laadcyclus", "opslagcapaciteit"],
    tegen: [],
  },
  {
    onderwerp: "ems",
    sterk: ["energiemanagementsysteem", "ems", "energiemanagement", "load balancing", "lastverdeling"],
    zwak: ["slim laden", "smart grid", "energiesturing", "slim stroomgebruik"],
    tegen: [],
  },
  {
    onderwerp: "laadinfrastructuur",
    sterk: [
      "laadplein",
      "laadinfrastructuur",
      "laadpaal",
      "laadpalen",
      "snellader",
      "laadpunt",
      "laadpunten",
      "v2g",
      "bidirectioneel laden",
    ],
    zwak: ["elektrisch vervoer", "elektrische auto", "truckladen", "laadbehoefte", "laadvermogen"],
    tegen: [],
  },
  {
    onderwerp: "zonne-energie",
    sterk: ["zonnepanelen", "zonnestroom", "zonnepark", "pv-installatie", "salderingsregeling", "curtailment"],
    zwak: ["zonne-energie", "teruglevering", "dakopwek", "zonnedak", "opwekcapaciteit"],
    tegen: [],
  },
  {
    onderwerp: "vastgoedverduurzaming",
    sterk: [
      "energielabel",
      "paris proof",
      "label c-plicht",
      "verduurzaming vastgoed",
      "energieprestatie",
      "bedrijfspand verduurzamen",
    ],
    zwak: ["bedrijfspand", "bedrijfsvastgoed", "kantoorpand", "energieprestatie", "warmtepomp"],
    tegen: [],
  },
  {
    onderwerp: "aanbesteding",
    sterk: ["aanbesteding", "aankondiging van een opdracht", "gegunde opdracht", "marktconsultatie", "tender"],
    zwak: ["gunning", "inschrijving", "raamovereenkomst", "opdrachtgever"],
    tegen: [],
  },
  {
    onderwerp: "vergunning",
    sterk: ["omgevingsvergunning", "bestemmingsplan", "omgevingsplan", "ruimtelijk plan", "ontwerpbesluit"],
    zwak: ["vergunning", "zienswijze", "terinzagelegging", "bekendmaking", "ontwerpbesluit"],
    tegen: [],
  },
  {
    onderwerp: "statistiek",
    sterk: ["energiebalans", "statline", "cbs-cijfers", "aardgasbalans", "elektriciteitsbalans"],
    zwak: ["energiestatistiek", "statline-tabel", "dataset", "energiecijfers"],
    tegen: [],
  },
  {
    onderwerp: "geografie",
    sterk: ["gemeentegebied", "provinciegebied", "bestuurlijke gebieden", "netbeheergebied"],
    zwak: ["gemeentegrens", "provinciegrens", "bestuurlijk gebied"],
    tegen: [],
  },
];

export type OnderwerpTreffer = {
  readonly onderwerp: Onderwerp;
  readonly score: number;
  readonly termen: readonly string[];
};

function telTermen(tekst: string, termen: readonly string[]): string[] {
  const gevonden: string[] = [];
  for (const term of termen) {
    // Woordgrenzen, maar termen met een streepje of plus moeten ook
    // matchen: 'sde++' en 'day-ahead' zijn echte termen.
    const ontsnapt = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patroon = new RegExp(`(^|[^\\p{L}\\p{N}])${ontsnapt}($|[^\\p{L}\\p{N}])`, "iu");
    if (patroon.test(tekst)) gevonden.push(term);
  }
  return gevonden;
}

/**
 * Onderwerpen van een tekst, gesorteerd op score.
 *
 * De titel en de body worden APART gewogen, en dat is de kern van deze
 * functie. Gemeten probleem: Netbeheer Nederland zet een lange
 * Drupal-alinea in <description>, en een artikel met de titel "Zo werkt
 * KOVA bij woningbouwprojecten" noemde ergens in die alinea het woord
 * "zonnepanelen". Met één gezamenlijke tekst was die ene sterke
 * bodytreffer genoeg om het stuk op zonne-energie te zetten, en koppelde
 * de besluitmotor het aan /systeem-zonnepanelen.
 *
 * De titel zegt waar een stuk over gaat; de body kan alles aanstippen.
 * Een sterke term in de titel is dus beslissend, een sterke term die
 * alleen in de body staat is zwak bewijs.
 *
 * Leeg betekent: dit item gaat niet over een onderwerp dat wij volgen,
 * en dan stopt de verwerking hier.
 */
export function herkenOnderwerpen(titel: string, tekst: string): OnderwerpTreffer[] {
  const titelTekst = titel.toLowerCase();
  const bodyTekst = tekst.toLowerCase();
  const treffers: OnderwerpTreffer[] = [];

  for (const v of VOCABULAIRE) {
    if (
      telTermen(titelTekst, v.tegen).length > 0 ||
      telTermen(bodyTekst, v.tegen).length > 0
    ) {
      continue;
    }

    const sterkTitel = telTermen(titelTekst, v.sterk);
    const zwakTitel = telTermen(titelTekst, v.zwak);
    const sterkBody = telTermen(bodyTekst, v.sterk).filter((t) => !sterkTitel.includes(t));
    const zwakBody = telTermen(bodyTekst, v.zwak).filter((t) => !zwakTitel.includes(t));

    const score =
      sterkTitel.length * 6 + zwakTitel.length * 2 + sterkBody.length * 2 + zwakBody.length * 0.5;

    // Een onderwerp raakt alleen als de TITEL het aanwijst, of als de
    // body het meermaals sterk aanwijst.
    const raakt = sterkTitel.length >= 1 || zwakTitel.length >= 2 || sterkBody.length >= 2;
    if (raakt) {
      treffers.push({
        onderwerp: v.onderwerp,
        score: Math.round(score * 10) / 10,
        termen: [
          ...sterkTitel.map((t) => `titel:${t}`),
          ...zwakTitel.map((t) => `titel:${t}`),
          ...sterkBody.map((t) => `body:${t}`),
          ...zwakBody.map((t) => `body:${t}`),
        ],
      });
    }
  }

  const gesorteerd = treffers.sort((a, b) => b.score - a.score);

  // Dubbelzinnigheidsgrendel: twee onderwerpen die vlak bij elkaar
  // liggen en beide zwak scoren betekent "we weten het niet".
  const beste = gesorteerd[0];
  const tweede = gesorteerd[1];
  if (beste && beste.score < 6 && tweede && beste.score - tweede.score < 2) {
    return [];
  }
  return gesorteerd;
}

/**
 * Gebeurtenissoort uit het sterkste onderwerp. De soortenlijst van
 * markt_gebeurtenissen is smaller dan de onderwerpenlijst, dus dit is
 * een vaste afbeelding.
 */
export function gebeurtenisSoortVan(onderwerp: Onderwerp): string {
  switch (onderwerp) {
    case "regelgeving":
      return "regelgeving";
    case "subsidie":
      return "subsidie";
    case "netcongestie":
      return "netcongestie";
    case "marktprijs":
      return "marktprijs";
    case "netbeheer":
    case "laadinfrastructuur":
      return "infrastructuur";
    case "bess":
    case "ems":
    case "zonne-energie":
    case "flexibiliteit":
      return "techniek";
    case "vastgoedverduurzaming":
      return "vastgoedontwikkeling";
    case "aanbesteding":
      return "aanbesteding";
    case "vergunning":
      return "vergunning";
    case "statistiek":
    case "geografie":
      return "statistiek";
  }
}

/** Alle onderwerpen waarvoor een vocabulaire bestaat. */
export function bekendeOnderwerpen(): readonly Onderwerp[] {
  return VOCABULAIRE.map((v) => v.onderwerp);
}
