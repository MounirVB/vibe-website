/* ============================================================
   BRONNEN — minimale XML-lezer
   ------------------------------------------------------------
   RSS, Atom, sitemaps, SRU en WFS zijn allemaal XML. Een
   XML-afhankelijkheid toevoegen past niet bij een repository met
   precies één runtime-afhankelijkheid, en regex op XML breekt zodra
   een uitgever CDATA, een namespace-prefix of een self-closing tag
   gebruikt. Daarom deze kleine scanner: hij bouwt een vlakke boom en
   kent CDATA, commentaar, entiteiten en namespaces.

   Hij valideert niet. Hij leest wat er staat en negeert wat hij niet
   begrijpt; een onleesbare feed levert dan nul items in plaats van
   een exception halverwege.
   ============================================================ */

export type XmlKnoop = {
  naam: string;
  /** Naam met namespaceprefix, bijvoorbeeld 'news:publication_date'. */
  volledigeNaam: string;
  attributen: Record<string, string>;
  kinderen: XmlKnoop[];
  tekst: string;
};

const ENTITEITEN: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function xmlEntiteiten(tekst: string): string {
  return tekst
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number.parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) =>
      String.fromCodePoint(Number.parseInt(h, 16)),
    )
    .replace(/&([a-zA-Z]+);/g, (m, naam: string) => ENTITEITEN[naam.toLowerCase()] ?? m);
}

function zonderPrefix(naam: string): string {
  const i = naam.indexOf(":");
  return i === -1 ? naam : naam.slice(i + 1);
}

function leesAttributen(ruw: string): Record<string, string> {
  const uit: Record<string, string> = {};
  const patroon = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = patroon.exec(ruw)) !== null) {
    const naam = m[1];
    const waarde = m[3] ?? m[4] ?? "";
    if (naam) uit[zonderPrefix(naam).toLowerCase()] = xmlEntiteiten(waarde);
  }
  return uit;
}

/**
 * Parseert XML naar één wortelknoop. Bij onbalans wordt wat gelezen is
 * teruggegeven in plaats van een fout: feeds in het wild zijn niet
 * altijd geldig.
 */
export function parseerXml(tekst: string): XmlKnoop {
  const wortel: XmlKnoop = {
    naam: "#wortel",
    volledigeNaam: "#wortel",
    attributen: {},
    kinderen: [],
    tekst: "",
  };
  const stapel: XmlKnoop[] = [wortel];
  let i = 0;
  const n = tekst.length;

  const top = (): XmlKnoop => stapel[stapel.length - 1] ?? wortel;

  while (i < n) {
    const haakje = tekst.indexOf("<", i);
    if (haakje === -1) {
      top().tekst += xmlEntiteiten(tekst.slice(i));
      break;
    }
    if (haakje > i) {
      top().tekst += xmlEntiteiten(tekst.slice(i, haakje));
    }

    // CDATA
    if (tekst.startsWith("<![CDATA[", haakje)) {
      const eind = tekst.indexOf("]]>", haakje + 9);
      const slot = eind === -1 ? n : eind;
      top().tekst += tekst.slice(haakje + 9, slot);
      i = eind === -1 ? n : eind + 3;
      continue;
    }
    // commentaar
    if (tekst.startsWith("<!--", haakje)) {
      const eind = tekst.indexOf("-->", haakje + 4);
      i = eind === -1 ? n : eind + 3;
      continue;
    }
    // doctype, processing instruction
    if (tekst.startsWith("<!", haakje) || tekst.startsWith("<?", haakje)) {
      const eind = tekst.indexOf(">", haakje + 2);
      i = eind === -1 ? n : eind + 1;
      continue;
    }

    const eindHaakje = tekst.indexOf(">", haakje);
    if (eindHaakje === -1) {
      top().tekst += xmlEntiteiten(tekst.slice(haakje));
      break;
    }
    const binnen = tekst.slice(haakje + 1, eindHaakje);

    // sluittag
    if (binnen.startsWith("/")) {
      const naam = zonderPrefix(binnen.slice(1).trim()).toLowerCase();
      // Sluit tot en met de dichtstbijzijnde passende open tag; een
      // niet-passende sluittag wordt genegeerd.
      for (let d = stapel.length - 1; d >= 1; d -= 1) {
        if (stapel[d]?.naam === naam) {
          stapel.length = d;
          break;
        }
      }
      i = eindHaakje + 1;
      continue;
    }

    const zelfsluitend = binnen.endsWith("/");
    const kern = zelfsluitend ? binnen.slice(0, -1) : binnen;
    const ruimte = kern.search(/\s/);
    const volledigeNaam = (ruimte === -1 ? kern : kern.slice(0, ruimte)).trim();
    const attributen = ruimte === -1 ? {} : leesAttributen(kern.slice(ruimte));

    const knoop: XmlKnoop = {
      naam: zonderPrefix(volledigeNaam).toLowerCase(),
      volledigeNaam: volledigeNaam.toLowerCase(),
      attributen,
      kinderen: [],
      tekst: "",
    };
    top().kinderen.push(knoop);
    if (!zelfsluitend) stapel.push(knoop);
    i = eindHaakje + 1;
  }

  return wortel;
}

/** Alle afstammelingen met deze (prefixloze) naam, in documentorde. */
export function vindAlle(knoop: XmlKnoop, naam: string): XmlKnoop[] {
  const doel = naam.toLowerCase();
  const uit: XmlKnoop[] = [];
  const wachtrij: XmlKnoop[] = [knoop];
  while (wachtrij.length > 0) {
    const k = wachtrij.shift();
    if (!k) break;
    if (k.naam === doel && k !== knoop) uit.push(k);
    for (const kind of k.kinderen) wachtrij.push(kind);
  }
  return uit;
}

/** Eerste direct kind met deze naam. */
export function kind(knoop: XmlKnoop, naam: string): XmlKnoop | null {
  const doel = naam.toLowerCase();
  return knoop.kinderen.find((k) => k.naam === doel) ?? null;
}

/** Tekst van het eerste directe kind, getrimd. Leeg als het ontbreekt. */
export function kindTekst(knoop: XmlKnoop, ...namen: string[]): string {
  for (const naam of namen) {
    const k = kind(knoop, naam);
    if (k) {
      const t = k.tekst.trim();
      if (t) return t;
    }
  }
  return "";
}

/** Volledige tekst van een knoop en al zijn kinderen. */
export function diepeTekst(knoop: XmlKnoop): string {
  let uit = knoop.tekst;
  for (const k of knoop.kinderen) uit += ` ${diepeTekst(k)}`;
  return uit.replace(/\s+/g, " ").trim();
}
