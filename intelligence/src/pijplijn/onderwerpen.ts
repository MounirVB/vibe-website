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
    zwak: ["elektriciteitsnet", "hoogspanning", "middenspanning", "onderstation", "schakelstation", "stroomnet"],
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
    zwak: ["elektriciteitsprijs", "stroomprijs", "prijspiek", "prijsspreiding", "tarief", "eur/mwh"],
    tegen: [],
  },
  {
    onderwerp: "flexibiliteit",
    sterk: ["flexibiliteit", "flexvermogen", "congestiedienst", "gopacs", "afroepbaar vermogen", "demand response"],
    zwak: ["flex", "sturing", "regelvermogen", "aggregator"],
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
    zwak: ["batterij", "opslag", "accu", "mwh", "laadcyclus"],
    tegen: [],
  },
  {
    onderwerp: "ems",
    sterk: ["energiemanagementsysteem", "ems", "energiemanagement", "load balancing", "lastverdeling"],
    zwak: ["sturing", "monitoring", "optimalisatie", "slim laden", "smart grid"],
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
    zwak: ["elektrisch vervoer", "ev", "laden", "truckladen", "laadbehoefte"],
    tegen: [],
  },
  {
    onderwerp: "zonne-energie",
    sterk: ["zonnepanelen", "zonnestroom", "zonnepark", "pv-installatie", "salderingsregeling", "curtailment"],
    zwak: ["zon", "pv", "opwek", "teruglevering", "wp", "dakopwek"],
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
    zwak: ["vastgoed", "pand", "gebouw", "kantoor", "isolatie", "warmtepomp"],
    tegen: [],
  },
  {
    onderwerp: "aanbesteding",
    sterk: ["aanbesteding", "aankondiging van een opdracht", "gegunde opdracht", "marktconsultatie", "tender"],
    zwak: ["opdracht", "gunning", "inschrijving", "raamovereenkomst"],
    tegen: [],
  },
  {
    onderwerp: "vergunning",
    sterk: ["omgevingsvergunning", "bestemmingsplan", "omgevingsplan", "ruimtelijk plan", "ontwerpbesluit"],
    zwak: ["vergunning", "zienswijze", "terinzagelegging", "bekendmaking"],
    tegen: [],
  },
  {
    onderwerp: "statistiek",
    sterk: ["energiebalans", "statline", "cbs-cijfers", "aardgasbalans", "elektriciteitsbalans"],
    zwak: ["cijfers", "statistiek", "dataset", "tabel", "indicator"],
    tegen: [],
  },
  {
    onderwerp: "geografie",
    sterk: ["gemeentegebied", "provinciegebied", "bestuurlijke gebieden", "netbeheergebied"],
    zwak: ["gemeente", "provincie", "regio", "gebied"],
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
 * Onderwerpen van een tekst, gesorteerd op score. Leeg betekent: dit
 * item gaat niet over een onderwerp dat wij volgen, en dan stopt de
 * verwerking hier.
 */
export function herkenOnderwerpen(titel: string, tekst: string): OnderwerpTreffer[] {
  // De titel weegt dubbel: daar staat waar het stuk over gaat.
  const invoer = `${titel} ${titel} ${tekst}`.toLowerCase();
  const treffers: OnderwerpTreffer[] = [];

  for (const v of VOCABULAIRE) {
    if (telTermen(invoer, v.tegen).length > 0) continue;
    const sterk = telTermen(invoer, v.sterk);
    const zwak = telTermen(invoer, v.zwak);
    const score = sterk.length * 3 + zwak.length;
    const raakt = sterk.length >= 1 || zwak.length >= 2;
    if (raakt) {
      treffers.push({ onderwerp: v.onderwerp, score, termen: [...sterk, ...zwak] });
    }
  }

  return treffers.sort((a, b) => b.score - a.score);
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
