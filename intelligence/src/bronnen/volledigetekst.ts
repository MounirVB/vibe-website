/* ============================================================
   BRONNEN — de volledige tekst achter een feeditem
   ------------------------------------------------------------
   WAAROM DIT BESTAAT, en waarom het een OPT-IN is en geen schakelaar.

   `verzamelen.ts` droeg tot nu toe deze regel:

     // Alleen titel en de door de uitgever meegegeven samenvatting.
     // Nooit het volledige artikel ophalen of bewaren.

   Dat was een verdedigbaar beleid. Het had ook een gemeten prijs. Op
   30 oktober 2026, over 3.679 productieversies:

     rijksoverheid-nieuws   80 versies  gemiddeld     0 tekens  0 claims
     acm-besluiten          27 versies  gemiddeld   323 tekens  0 claims
     netbeheer-nederland    170 versies gemiddeld 5.532 tekens  45 claims

   De twee bronnen MET bevoegd gezag leveren titels en samenvattingen;
   de branchevereniging levert volledige artikelen. Daardoor kwamen 45
   van de 59 claims uit de partij met het mínste gezag, en bestonden er
   nul OFFICIEEL_BESLUIT-documenten — waardoor de primaire-bronverificatie
   van R3 niets kon terugvinden. De bewijsbasis stond op zijn kop.

   Dit is dus geen verruiming "omdat meer tekst fijner is". Het is een
   gerichte reparatie van een omgekeerde bewijsbasis, en daarom:

   1. PER BRON AAN, NOOIT GLOBAAL. `volledigeTekst` staat in het
      register per bron, met de GEMETEN grondslag erbij. Een bron
      zonder die verklaring haalt niets op, ook niet "even".
   2. DE GRONDSLAG IS TEKST, GEEN BOOLEAN. Wie later leest waarom dit
      mag, vindt de woorden van de uitgever en de datum van de meting.
   3. GEEN EIGEN NETWERKCODE. Alles loopt via `haalOp()`, dus de
      SSRF-poortwachter, de begrensde redirects met robotscontrole per
      hop, de bytelimiet, de time-out, de hostallowlist en de hostklok
      gelden ongewijzigd. Er staat in dit bestand geen `fetch`.
   4. NOOIT SLECHTER DAN WAT WE HADDEN. Levert de extractie minder op
      dan de samenvatting die de uitgever zelf meegaf, dan houden we de
      samenvatting. Een lege of afgeschermde pagina mag geen informatie
      WEGNEMEN.

   ------------------------------------------------------------
   WAT DE METING OP 30 OKTOBER 2026 OPLEVERDE

   Met de eigen robotslaag (`robotsVoorOrigin`, `urlToegestaan`):

     www.acm.nl           robots.txt 200, 53 regels voor ons of *,
                          crawl-delay 10, volledig uitgesloten:
                          fasterfox, 008, mj12bot, proximic, youdaobot,
                          baiduspider, cazoodlebot, jyxobot —
                          GEEN AI- of TDM-crawler.
                          /nl/publicaties/... TOEGESTAAN.
     www.rijksoverheid.nl robots.txt 200, 0 regels voor ons of *,
                          geen crawl-delay, niemand uitgesloten.
                          /actueel/nieuws/... TOEGESTAAN.

   Grondslag volgens `bepaalToestemming()`: rijksoverheid
   `hergebruik_verklaard` ("U mag openbare informatie van de
   Rijksoverheid hergebruiken"), ACM `syndicatieformaat`.

   DE ACM-GRONDSLAG IS DE ZWAKKERE, EN DAT STAAT HIER OMDAT HET ZO IS.
   "Een feed bestaat om gelezen te worden" rechtvaardigt het lezen van
   de feed. Dat is niet hetzelfde als het oogsten van de volledige
   besluittekst. Wat die stap hier draagt is iets anders en concreter:
   robots.txt van acm.nl staat het artikelpad EXPLICIET toe en sluit
   geen enkele TDM-crawler uit. Daarbij is de ACM een Nederlands
   bestuursorgaan en zijn haar besluiten openbare documenten.
   Wie die afweging anders maakt, zet `volledigeTekst` op ACM uit; de
   grondslag staat in het register en is dus bespreekbaar in plaats van
   verstopt.

   WAT DIT NIET VERANDERT. De tekst wordt BEWIJS, geen publicatie. De
   poort `geen_bronherpublicatie` en de citaatlimieten blijven
   onverkort gelden: een artikel mag de brontekst niet overnemen.
   ============================================================ */

import { maakLogger } from "../kern/log.ts";
import { htmlNaarTekst, normaliseerTekst } from "../kern/tekst.ts";
import { haalOp } from "./http.ts";
import type { Bron, RuwItem } from "./soorten.ts";

const log = maakLogger("volledigetekst");

/** Verhoog dit als de extractie een andere tekst kan opleveren. */
export const VOLLEDIGE_TEKST_VERSIE = "volledigetekst-v1";

export type VolledigeTekstBeleid = {
  /**
   * De gemeten grondslag, in woorden. Geen boolean: wie dit later
   * leest hoort te zien WAAROM het mocht en wanneer dat is gemeten.
   */
  readonly grondslag: string;
  /**
   * Containers waarin de hoofdtekst staat, op volgorde van
   * voorkeur. De eerste die iets oplevert wint. Leeg = val terug op
   * de generieke keten (`main`, `article`, `[role=main]`).
   */
  readonly containers?: readonly string[];
  /**
   * Onder deze lengte is de extractie niet geslaagd en houden we wat
   * we al hadden. 400 is geen willekeur: de ACM-samenvattingen zijn
   * gemiddeld 323 tekens, dus daaronder voegt een paginascrape niets
   * toe aan wat de feed al gaf.
   */
  readonly minimumTekens?: number;
  /** Harde bovengrens op de bewaarde tekst. */
  readonly maximumTekens?: number;
};

const STANDAARD_CONTAINERS = ["main", "article", '[role="main"]'] as const;
const STANDAARD_MINIMUM = 400;
const STANDAARD_MAXIMUM = 60_000;

/* ------------------------------------------------------------------
   DE CHROME ERUIT
   ------------------------------------------------------------------
   Een artikelpagina draagt navigatie, een cookiebanner, een footer en
   een deelbalk. Die horen niet in de brontekst, en niet alleen omdat
   het ruis is: een cookiebanner met "wij gebruiken 3 soorten cookies"
   zet een GETAL in de tekst waar de claimextractie daarna een feit in
   kan zien. Ruis in deze laag is dus geen cosmetisch probleem maar een
   bron van valse claims.
   ------------------------------------------------------------------ */

const CHROME_TAGS = [
  "nav", "header", "footer", "aside", "form", "noscript", "svg",
  "button", "dialog", "template", "iframe", "figure",
] as const;

/** Class- en id-namen die vrijwel altijd chrome aanduiden. */
const CHROME_PATROON =
  /(cookie|consent|navigatie|navigation|menu|breadcrumb|kruimelpad|share|deel-?balk|social|related|gerelateerd|sidebar|zijbalk|skiplink|offcanvas|banner|newsletter|nieuwsbrief|footer|header)/i;

function verwijderTag(html: string, tag: string): string {
  /* Niet-greedy per paar, en in een lus omdat geneste gelijke tags
     anders half blijven staan. Een regex kan HTML niet parseren; dat
     hoeft hier ook niet, want we verwijderen en behouden niets. */
  const patroon = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
  let vorige = html;
  for (let i = 0; i < 5; i += 1) {
    const nieuw = vorige.replace(patroon, " ");
    if (nieuw === vorige) break;
    vorige = nieuw;
  }
  /* Zelfsluitend of zonder sluittag (svg, iframe): het openingselement
     weg, zodat de attributen niet als tekst overblijven. */
  return vorige.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), " ");
}

/** Blokken waarvan class of id op chrome wijst, inclusief inhoud. */
function verwijderChromeBlokken(html: string): string {
  const patroon =
    /<(div|section|ul|ol|p|span)\b[^>]*(?:class|id)\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/\1>/gi;
  let vorige = html;
  for (let ronde = 0; ronde < 3; ronde += 1) {
    const nieuw = vorige.replace(patroon, (volledig, _tag, namen: string) =>
      CHROME_PATROON.test(namen) ? " " : volledig,
    );
    if (nieuw === vorige) break;
    vorige = nieuw;
  }
  return vorige;
}

/**
 * Snijdt de inhoud van het eerste voorkomen van een container uit.
 *
 * Werkt met een diepteteller in plaats van een niet-greedy regex: een
 * `<main>` met een genest `<div>` erin zou bij een niet-greedy match
 * halverwege afgekapt worden, en dan verliezen we juist het midden van
 * het artikel.
 */
export function snijdContainer(html: string, selector: string): string | null {
  const tagMatch = /^([a-z]+)$/i.exec(selector);
  const attrMatch = /^\[([a-z-]+)="([^"]+)"\]$/i.exec(selector);

  let open: RegExp;
  let tag: string;
  if (tagMatch) {
    tag = tagMatch[1]!.toLowerCase();
    open = new RegExp(`<${tag}\\b[^>]*>`, "i");
  } else if (attrMatch) {
    const [, attr, waarde] = attrMatch;
    tag = "[a-z]+";
    open = new RegExp(`<([a-z]+)\\b[^>]*${attr}\\s*=\\s*"${waarde}"[^>]*>`, "i");
  } else {
    /* Een class- of id-selector: .artikel of #inhoud. */
    const klasse = /^\.([\w-]+)$/.exec(selector);
    const id = /^#([\w-]+)$/.exec(selector);
    if (klasse) {
      tag = "[a-z]+";
      open = new RegExp(`<([a-z]+)\\b[^>]*class\\s*=\\s*"[^"]*\\b${klasse[1]}\\b[^"]*"[^>]*>`, "i");
    } else if (id) {
      tag = "[a-z]+";
      open = new RegExp(`<([a-z]+)\\b[^>]*id\\s*=\\s*"${id[1]}"[^>]*>`, "i");
    } else {
      return null;
    }
  }

  const start = open.exec(html);
  if (!start) return null;
  /* Welke tag is het werkelijk geworden? Bij een attribuutselector
     staat dat in de eerste capture group. */
  const echteTag = (tagMatch ? tag : (start[1] ?? "")).toLowerCase();
  if (!echteTag) return null;

  const na = start.index + start[0].length;
  const paar = new RegExp(`<(\\/?)${echteTag}\\b[^>]*>`, "gi");
  paar.lastIndex = na;
  let diepte = 1;
  let m: RegExpExecArray | null;
  while ((m = paar.exec(html)) !== null) {
    diepte += m[1] === "/" ? -1 : 1;
    if (diepte === 0) return html.slice(na, m.index);
  }
  /* Geen sluittag gevonden: neem de rest. Een onafgesloten container is
     geen reden om de hele pagina weg te gooien. */
  return html.slice(na);
}

export type Extractie = {
  readonly tekst: string;
  readonly container: string;
  readonly tekensVoorOpschoning: number;
};

/**
 * Haalt de hoofdtekst uit een HTML-pagina. Puur en testbaar: geen
 * netwerk, geen database, geen klok.
 */
export function extraheerHoofdtekst(
  html: string,
  beleid: VolledigeTekstBeleid,
): Extractie | null {
  if (html.trim().length === 0) return null;

  const containers = [...(beleid.containers ?? []), ...STANDAARD_CONTAINERS];
  const maximum = beleid.maximumTekens ?? STANDAARD_MAXIMUM;

  for (const selector of containers) {
    const binnen = snijdContainer(html, selector);
    if (binnen === null) continue;
    let schoon = binnen;
    for (const t of CHROME_TAGS) schoon = verwijderTag(schoon, t);
    schoon = verwijderChromeBlokken(schoon);
    const tekst = normaliseerTekst(htmlNaarTekst(schoon));
    if (tekst.length === 0) continue;
    return {
      tekst: tekst.length > maximum ? tekst.slice(0, maximum) : tekst,
      container: selector,
      tekensVoorOpschoning: binnen.length,
    };
  }
  return null;
}

export type VolledigeTekstUitkomst =
  | { readonly soort: "ok"; readonly tekst: string; readonly container: string; readonly bytes: number }
  | { readonly soort: "geen_beleid" }
  | { readonly soort: "te_kort"; readonly tekens: number; readonly minimum: number }
  | { readonly soort: "geen_container" }
  | { readonly soort: "leeg" }
  | { readonly soort: "geweigerd"; readonly reden: string; readonly foutSoort: string };

/**
 * Haalt de volledige tekst achter één feeditem op.
 *
 * GEEN EIGEN NETWERKCODE: `haalOp()` doet het verkeer, met de
 * hostallowlist, de bytelimiet, de hostklok en de robotscontrole per
 * redirecthop van de bron zelf.
 */
export async function haalVolledigeTekst(
  bron: Bron,
  item: RuwItem,
): Promise<VolledigeTekstUitkomst> {
  const beleid = bron.volledigeTekst;
  if (!beleid) return { soort: "geen_beleid" };

  const uitkomst = await haalOp({
    url: item.url,
    toegestaneHosts: bron.toegestaneHosts,
    maxBytes: bron.maxBytes,
    minIntervalSeconden: bron.minIntervalSeconden,
    accept: "text/html, application/xhtml+xml;q=0.9, */*;q=0.5",
  });

  if (uitkomst.soort === "niet_gewijzigd") {
    /* Zonder etag meegestuurd hoort dit niet te gebeuren; als het
       gebeurt is er geen body en dus geen tekst. */
    return { soort: "leeg" };
  }
  if (uitkomst.soort === "fout") {
    return { soort: "geweigerd", reden: uitkomst.bericht, foutSoort: uitkomst.foutSoort };
  }

  const uit = extraheerHoofdtekst(uitkomst.body, beleid);
  if (uit === null) {
    return uitkomst.body.trim().length === 0 ? { soort: "leeg" } : { soort: "geen_container" };
  }

  const minimum = beleid.minimumTekens ?? STANDAARD_MINIMUM;
  if (uit.tekst.length < minimum) {
    return { soort: "te_kort", tekens: uit.tekst.length, minimum };
  }

  return { soort: "ok", tekst: uit.tekst, container: uit.container, bytes: uitkomst.bytes };
}

export type VerrijkRapport = {
  readonly bekeken: number;
  readonly verrijkt: number;
  readonly behouden: number;
  readonly perUitkomst: Readonly<Record<string, number>>;
};

/**
 * Vult `tekst` op de items van één bron, voor zover dat mag en lukt.
 *
 * NOOIT SLECHTER DAN WAT WE HADDEN. De uitgeverssamenvatting blijft
 * staan; de volledige tekst komt ernaast in `tekst`. Mislukt de
 * ophaling, dan verandert het item niet — een afgeschermde of lege
 * pagina mag geen informatie wegnemen.
 */
export async function verrijkMetVolledigeTekst(
  bron: Bron,
  items: readonly RuwItem[],
): Promise<{ items: RuwItem[]; rapport: VerrijkRapport }> {
  if (!bron.volledigeTekst) {
    return {
      items: [...items],
      rapport: { bekeken: 0, verrijkt: 0, behouden: items.length, perUitkomst: {} },
    };
  }

  const perUitkomst: Record<string, number> = {};
  const uit: RuwItem[] = [];
  let verrijkt = 0;

  for (const item of items) {
    const u = await haalVolledigeTekst(bron, item);
    perUitkomst[u.soort] = (perUitkomst[u.soort] ?? 0) + 1;

    if (u.soort !== "ok") {
      if (u.soort === "geweigerd") {
        log.waarschuwing("volledige tekst geweigerd", {
          bron: bron.sleutel, url: item.url, foutSoort: u.foutSoort, reden: u.reden,
        });
      }
      uit.push(item);
      continue;
    }

    /* DE SAMENVATTING IS DE ONDERGRENS. Levert de pagina minder op dan
       de uitgever zelf al meegaf, dan is de scrape geen verbetering. */
    const bestaand = (item.tekst ?? item.samenvatting ?? "").length;
    if (u.tekst.length <= bestaand) {
      perUitkomst["niet_beter"] = (perUitkomst["niet_beter"] ?? 0) + 1;
      uit.push(item);
      continue;
    }

    verrijkt += 1;
    uit.push({
      ...item,
      tekst: u.tekst,
      extra: {
        ...item.extra,
        volledige_tekst: {
          versie: VOLLEDIGE_TEKST_VERSIE,
          container: u.container,
          tekens: u.tekst.length,
          bytes: u.bytes,
          grondslag: bron.volledigeTekst.grondslag,
        },
      },
    });
  }

  log.info("volledige tekst opgehaald", {
    bron: bron.sleutel, bekeken: items.length, verrijkt, per_uitkomst: perUitkomst,
  });

  return {
    items: uit,
    rapport: { bekeken: items.length, verrijkt, behouden: items.length - verrijkt, perUitkomst },
  };
}
