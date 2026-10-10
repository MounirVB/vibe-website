/* ============================================================
   INHOUD — publicatiepoorten
   ------------------------------------------------------------
   Vijftien deterministische poorten. Geen enkele poort vraagt een
   model om een oordeel; alle vijftien zijn na te rekenen.

   De zwaarste is `geen_verzonnen_getallen`. Die haalt elk getal uit de
   concepttekst en eist dat het terug te vinden is in een gebonden
   uitspraak. Dat is de goedkoopste en strengste rem op verzinsels die
   er bestaat: een model kan prachtig formuleren, maar het kan geen
   getal de tekst in smokkelen dat niet uit een bron komt.

   Een poort levert nooit "waarschijnlijk goed". Ze slaagt of ze faalt,
   met de bevinding erbij.
   ============================================================ */

import { normaliseerTekst, verschilRatio } from "../kern/tekst.ts";

export type PoortUitkomst = {
  readonly poort: string;
  readonly geslaagd: boolean;
  readonly bevindingen: readonly string[];
  /** Blokkerend = publiceren mag niet. Advies = melden en doorgaan. */
  readonly ernst: "blokkerend" | "advies";
};

export type GebondenUitspraak = {
  readonly id: number;
  readonly tekst: string;
  readonly soort: string;
  readonly waardeNumeriek: number | null;
  readonly eenheid: string | null;
  readonly geldigVanaf: string | Date | null;
  readonly geldigTot: string | Date | null;
  readonly verificatieStatus: string;
  readonly rol: "kern" | "ondersteunend" | "context";
};

export type ConceptTeToetsen = {
  readonly pad: string;
  readonly titel: string;
  readonly metaOmschrijving: string | null;
  readonly canoniekeUrl: string;
  readonly directAntwoord: string | null;
  readonly bodyMarkdown: string;
  readonly structuredData: unknown;
  readonly interneLinks: readonly string[];
  readonly bronnenSectie: readonly { uitgever: string; url: string }[];
  readonly risicoKlasse: "laag" | "midden" | "hoog";
  readonly goedgekeurdDoor: number | null;
  readonly uitspraken: readonly GebondenUitspraak[];
  /** Genormaliseerde brontekst van elke invoerversie. */
  readonly bronteksten: readonly string[];
  readonly injectieInBron: boolean;
  /** Paden die in het pagina-register bestaan. */
  readonly bestaandePaden: ReadonlySet<string>;
  readonly siteBasisUrl: string;
  readonly doelPaginaBeheer: "handmatig" | "intelligence" | null;
};

const geslaagd = (poort: string): PoortUitkomst => ({
  poort,
  geslaagd: true,
  bevindingen: [],
  ernst: "blokkerend",
});

const gefaald = (
  poort: string,
  bevindingen: string[],
  ernst: "blokkerend" | "advies" = "blokkerend",
): PoortUitkomst => ({ poort, geslaagd: false, bevindingen, ernst });

/** Formuleringen die een belofte doen die wij niet kunnen nakomen. */
const VERBODEN_BELOFTEN: readonly { patroon: RegExp; waarom: string }[] = [
  {
    patroon: /\b(garanderen|garandeert|gegarandeerd|garantie op)\b/i,
    waarom: "een garantie over opbrengst, rendement of netcapaciteit kan niet waargemaakt worden",
  },
  {
    patroon: /\b(altijd|nooit|in alle gevallen|zonder uitzondering)\b/i,
    waarom: "absolute bewoording; in deze markt geldt vrijwel niets zonder voorwaarden",
  },
  {
    patroon: /\b(hoogste positie|nummer 1 in google|top\s*1|ranking garanderen)\b/i,
    waarom: "uitspraken over zoekposities zijn niet te onderbouwen",
  },
  {
    patroon: /\b(verzekerd van|zeker van) (een )?(aansluiting|capaciteit|subsidie)\b/i,
    waarom: "aansluiting, capaciteit en subsidie zijn nooit zeker",
  },
];

/**
 * Getallen die altijd mogen: jaartallen, opsommingsnummers en kleine
 * hoeveelheden die in gewone taal voorkomen ('drie', '1.').
 */
function isOnschuldigGetal(ruw: string): boolean {
  const n = Number.parseFloat(ruw.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return true;
  // Jaartallen.
  if (Number.isInteger(n) && n >= 1990 && n <= 2100) return true;
  // Opsommingen en kleine ordinalen.
  if (Number.isInteger(n) && n >= 1 && n <= 12) return true;
  return false;
}

function toegestaneGetallen(uitspraken: readonly GebondenUitspraak[]): Set<string> {
  const set = new Set<string>();
  for (const u of uitspraken) {
    if (u.waardeNumeriek !== null) {
      const n = u.waardeNumeriek;
      set.add(String(n));
      // Nederlandse notatie: komma als decimaalteken, punt als
      // duizendscheiding. Beide vormen toestaan.
      set.add(String(n).replace(".", ","));
      set.add(n.toLocaleString("nl-NL"));
      set.add(n.toLocaleString("nl-NL", { maximumFractionDigits: 2 }));
      if (Number.isInteger(n)) set.add(n.toLocaleString("nl-NL", { useGrouping: true }));
    }
    for (const ruweDatum of [u.geldigVanaf, u.geldigTot]) {
      if (!ruweDatum) continue;
      // Defensief: een driver kan hier een Date opleveren in plaats van
      // een string. De parser in kern/db.ts voorkomt dat, maar deze
      // functie wordt ook rechtstreeks door tests aangeroepen.
      const datum =
        typeof ruweDatum === "string" ? ruweDatum : new Date(ruweDatum).toISOString().slice(0, 10);
      const [jaar, maand, dag] = datum.split("-");
      if (jaar) set.add(jaar);
      if (dag) set.add(String(Number.parseInt(dag, 10)));
      if (maand) set.add(String(Number.parseInt(maand, 10)));
    }
  }
  return set;
}

/**
 * Haalt alle getalnotaties uit een tekst, nadat eerst de dingen zijn
 * weggehaald die cijfers bevatten zonder een bewering te doen.
 *
 * Gemeten noodzaak: de bronnensectie bevat de publicatiedatum van de
 * bron (2026-09-14). De poort vlagde '14' als verzonnen getal, terwijl
 * het de datum van het citaat was. Een ISO-datum en een URL zijn
 * metadata, geen geclaimde hoeveelheid.
 */
export function getallenIn(tekst: string): string[] {
  const schoon = tekst
    // URL's, inclusief die tussen < > in markdown.
    .replace(/<?https?:\/\/[^\s>)]+>?/g, " ")
    // Markdown-linkdoelen.
    .replace(/\]\([^)]*\)/g, "] ")
    // ISO-datums.
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ");
  const treffers = schoon.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g);
  return treffers ?? [];
}

export function toetsConcept(c: ConceptTeToetsen): PoortUitkomst[] {
  const uit: PoortUitkomst[] = [];
  const body = normaliseerTekst(c.bodyMarkdown);

  // 1. Titel
  if (c.titel.length < 25 || c.titel.length > 70) {
    uit.push(
      gefaald("titel_lengte", [
        `titel is ${c.titel.length} tekens; buiten het bereik 25-70 wordt hij in de SERP afgekapt of te mager`,
      ]),
    );
  } else uit.push(geslaagd("titel_lengte"));

  // 2. Metabeschrijving
  const meta = c.metaOmschrijving ?? "";
  if (meta.length < 70 || meta.length > 160) {
    uit.push(
      gefaald("meta_lengte", [
        `metabeschrijving is ${meta.length} tekens; buiten het bereik 70-160`,
      ]),
    );
  } else uit.push(geslaagd("meta_lengte"));

  // 3. Direct antwoord (GEO: moet zelfstandig leesbaar zijn)
  const direct = (c.directAntwoord ?? "").trim();
  if (direct.length < 40 || direct.length > 400) {
    uit.push(
      gefaald("direct_antwoord", [
        direct.length === 0
          ? "geen direct antwoord; machinegestuurde retrieval heeft een zelfstandige passage nodig"
          : `direct antwoord is ${direct.length} tekens; buiten het bereik 40-400`,
      ]),
    );
  } else if (/\b(hierboven|zoals vermeld|bovenstaand|zie hierboven)\b/i.test(direct)) {
    uit.push(
      gefaald("direct_antwoord", [
        "direct antwoord verwijst naar context elders en is dus niet zelfstandig leesbaar",
      ]),
    );
  } else uit.push(geslaagd("direct_antwoord"));

  // 4. Canonieke URL
  const verwacht = `${c.siteBasisUrl}${c.pad === "/" ? "/" : c.pad}`;
  if (c.canoniekeUrl !== verwacht) {
    uit.push(
      gefaald("canoniek_correct", [
        `canonical is '${c.canoniekeUrl}' maar hoort '${verwacht}' te zijn (extensieloos, eigen host)`,
      ]),
    );
  } else if (/\.html(\?|$)/i.test(c.canoniekeUrl)) {
    uit.push(gefaald("canoniek_correct", ["canonical bevat .html; de publieke vorm is extensieloos"]));
  } else uit.push(geslaagd("canoniek_correct"));

  // 5. Geen herpublicatie van brontekst
  const teSimilair = c.bronteksten
    .map((b, i) => ({ i, ratio: verschilRatio(b, body) }))
    .filter((x) => x.ratio < 0.5);
  if (teSimilair.length > 0) {
    uit.push(
      gefaald(
        "geen_bronherpublicatie",
        teSimilair.map(
          (x) =>
            `concept lijkt te sterk op bronversie ${x.i + 1}: verschilratio ${x.ratio.toFixed(2)} ` +
            "(onder 0,50 is het parafraseren in plaats van eigen werk)",
        ),
      ),
    );
  } else uit.push(geslaagd("geen_bronherpublicatie"));

  // 6. Kernclaims hebben bewijs
  const kern = c.uitspraken.filter((u) => u.rol === "kern");
  if (kern.length === 0) {
    uit.push(
      gefaald("kernclaim_heeft_bewijs", [
        "geen enkele uitspraak is als kernclaim gebonden; dan is er niets te onderbouwen",
      ]),
    );
  } else {
    const onbevestigd = kern.filter((u) => u.verificatieStatus !== "bevestigd");
    if (onbevestigd.length > 0) {
      uit.push(
        gefaald(
          "kernclaim_heeft_bewijs",
          onbevestigd.map((u) => `kernclaim ${u.id} staat op '${u.verificatieStatus}', niet bevestigd`),
        ),
      );
    } else uit.push(geslaagd("kernclaim_heeft_bewijs"));
  }

  // 7. Geen verzonnen getallen — de strengste poort
  const toegestaan = toegestaneGetallen(c.uitspraken);
  const onbekend = getallenIn(body).filter(
    (g) => !toegestaan.has(g) && !isOnschuldigGetal(g),
  );
  if (onbekend.length > 0) {
    uit.push(
      gefaald("geen_verzonnen_getallen", [
        `${onbekend.length} getal(len) in de tekst staan niet in een gebonden uitspraak: ` +
          `${[...new Set(onbekend)].slice(0, 12).join(", ")}`,
        "elk cijfer op de site moet terug te voeren zijn op een eenduidige primaire opgave",
      ]),
    );
  } else uit.push(geslaagd("geen_verzonnen_getallen"));

  // 8. Geen verlopen claims
  const vandaag = new Date().toISOString().slice(0, 10);
  const verlopen = c.uitspraken.filter((u) => {
    if (u.geldigTot === null) return false;
    const tot =
      typeof u.geldigTot === "string" ? u.geldigTot : u.geldigTot.toISOString().slice(0, 10);
    return tot < vandaag;
  });
  if (verlopen.length > 0) {
    uit.push(
      gefaald(
        "geen_verlopen_claim",
        verlopen.map((u) => `uitspraak ${u.id} verliep op ${u.geldigTot}`),
      ),
    );
  } else uit.push(geslaagd("geen_verlopen_claim"));

  // 9. Hoog risico vereist een mens
  if (c.risicoKlasse === "hoog" && c.goedgekeurdDoor === null) {
    uit.push(
      gefaald("hoog_risico_vereist_mens", [
        "risicoklasse hoog (juridisch, subsidie, rendement, veiligheid of netcapaciteit) " +
          "vereist altijd een menselijke goedkeuring",
      ]),
    );
  } else uit.push(geslaagd("hoog_risico_vereist_mens"));

  // 10. Injectieverdachte bron vereist een mens
  if (c.injectieInBron && c.goedgekeurdDoor === null) {
    uit.push(
      gefaald("injectiebron_vereist_mens", [
        "een onderliggende bronversie is als injectieverdacht gemarkeerd; publiceren zonder " +
          "menselijke goedkeuring is dan uitgesloten",
      ]),
    );
  } else uit.push(geslaagd("injectiebron_vereist_mens"));

  // 11. Interne links bestaan
  const kapot = c.interneLinks.filter((l) => !c.bestaandePaden.has(l));
  if (kapot.length > 0) {
    uit.push(
      gefaald("interne_links_bestaan", [
        `${kapot.length} interne link(s) wijzen naar een pad dat niet in het pagina-register staat: ${kapot.join(", ")}`,
      ]),
    );
  } else uit.push(geslaagd("interne_links_bestaan"));

  // 12. Bronvermelding
  const bronnenOk = c.bronnenSectie.filter((b) => b.uitgever.length > 1 && /^https:\/\//.test(b.url));
  if (bronnenOk.length === 0) {
    uit.push(
      gefaald("bronvermelding", [
        "geen bronvermelding met uitgever en https-URL; zonder bron is een feit niet te controleren",
      ]),
    );
  } else uit.push(geslaagd("bronvermelding"));

  // 13. Geen onhoudbare beloften
  const beloften = VERBODEN_BELOFTEN.filter((v) => v.patroon.test(body) || v.patroon.test(c.titel));
  if (beloften.length > 0) {
    uit.push(gefaald("geen_onhoudbare_belofte", beloften.map((b) => b.waarom)));
  } else uit.push(geslaagd("geen_onhoudbare_belofte"));

  // 14. Structured data
  if (c.structuredData === null || typeof c.structuredData !== "object") {
    uit.push(
      gefaald(
        "structured_data",
        ["geen structured data meegegeven"],
        // Advies, niet blokkerend: de bestaande site heeft maar één
        // pagina met JSON-LD, dus dit is een verbetering en geen eis.
        "advies",
      ),
    );
  } else {
    const sd = c.structuredData as Record<string, unknown>;
    const mist = ["@context", "@type"].filter((k) => !(k in sd));
    if (mist.length > 0) {
      uit.push(gefaald("structured_data", [`structured data mist ${mist.join(", ")}`], "advies"));
    } else uit.push(geslaagd("structured_data"));
  }

  // 15. Eigendom van het doelbestand
  //
  // Bewust ADVIES en niet blokkerend. Deze poortenset beoordeelt of de
  // INHOUD klopt; of wij het bestand mogen schrijven is een andere
  // vraag, en die wordt onafhankelijk afgedwongen in publiceer(), dat
  // een pagina met beheer='handmatig' weigert.
  //
  // Dat onderscheid is nodig omdat een patchvoorstel voor een
  // Release 1-pagina een volwaardig product is: de tekst is
  // bewijsgebonden, de poorten zijn gehaald, en een mens kan hem
  // overnemen. Hem als 'mislukt' markeren zou de hele regel
  // UPDATE_EXISTING onbruikbaar maken — en dat is juist de regel die de
  // opdracht boven een nieuwe URL stelt.
  if (c.doelPaginaBeheer === "handmatig") {
    uit.push(
      gefaald(
        "eigendom_van_pagina",
        [
          `pagina ${c.pad} staat op handmatig beheer (Release 1-eigendom); dit platform levert ` +
            "een patchvoorstel en schrijft het bestand niet",
        ],
        "advies",
      ),
    );
  } else uit.push(geslaagd("eigendom_van_pagina"));

  return uit;
}

export type PoortSamenvatting = {
  readonly geslaagd: boolean;
  readonly blokkades: readonly string[];
  readonly adviezen: readonly string[];
  readonly resultaten: readonly PoortUitkomst[];
};

export function vatPoortenSamen(resultaten: readonly PoortUitkomst[]): PoortSamenvatting {
  const blokkades = resultaten
    .filter((r) => !r.geslaagd && r.ernst === "blokkerend")
    .map((r) => `${r.poort}: ${r.bevindingen.join(" | ")}`);
  const adviezen = resultaten
    .filter((r) => !r.geslaagd && r.ernst === "advies")
    .map((r) => `${r.poort}: ${r.bevindingen.join(" | ")}`);
  return { geslaagd: blokkades.length === 0, blokkades, adviezen, resultaten };
}
