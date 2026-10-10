/* ============================================================
   BRONNEN — het toestemmingsbeleid, expliciet en testbaar
   ------------------------------------------------------------
   "Mag dit?" is geen gevoelskwestie en hoort niet verstopt te zitten
   in de beoordeling van wie de bron toevoegde. Daarom staat de ladder
   hier als één functie, met de grondslag die ze teruggeeft.

   De ladder, van sterk naar zwak:

   1. EXPLICIET VERBOD. De uitgever verbiedt tekst- en datamining in
      woorden. Hard nee. (Energeia doet dit letterlijk.)
   2. AI-CRAWLER UITGESLOTEN. robots.txt sluit GPTBot, ClaudeBot,
      CCBot, Google-Extended, PerplexityBot of een soortgenoot
      volledig uit. Dat is een voorbehoud op geautomatiseerd
      hergebruik, ook als onze eigen useragent nergens genoemd wordt.
      Nee — tenzij de eigenaar daar met bewijs van afwijkt.
   3. OPEN LICENTIE. De uitgever verklaart CC0, CC BY, Public Domain
      of woorden van gelijke strekking. Dat is actieve toestemming en
      weegt zwaarder dan stilte in robots.txt.
   4. SYNDICATIEFORMAAT. Een uitgever die zelf een RSS- of
      Atom-feed aanbiedt, biedt die aan om gelezen te worden. Geldt
      alleen als stap 1 en 2 niet afgingen.
   5. ANDERS: onbekend. En onbekend betekent niet ophalen.

   Stap 2 is bewust streng. Wij verwerken brontekst met een
   taalmodel; een uitgever die precies dat type crawler buitensluit
   heeft een punt, ook al heet onze crawler anders.
   ============================================================ */

import type { TdmStatus } from "./soorten.ts";
import { TDM_USERAGENTS, type RobotsBestand } from "./robots.ts";

export type Grondslag =
  | "expliciet_verbod"
  | "ai_crawler_uitgesloten"
  | "open_licentie"
  | "hergebruik_verklaard"
  | "syndicatieformaat"
  | "in_robots_aangekondigd"
  | "geen_grondslag";

export type Toestemming = {
  readonly tdmStatus: TdmStatus;
  readonly grondslag: Grondslag;
  readonly mogenVerwerken: boolean;
  readonly bewijs: string;
};

export type ToestemmingInvoer = {
  /** Letterlijke TDM-verbodstekst die op de site staat, als die er is. */
  readonly explicietVerbod?: string | null;
  /** Gemeten robots.txt, of null als die niet leesbaar was. */
  readonly robots?: RobotsBestand | null;
  /** Naam van de licentie zoals de uitgever die zelf stelt. */
  readonly licentie?: string | null;
  readonly licentieBewijs?: string | null;
  /**
   * Eigen woorden van de uitgever waarin hergebruik wordt toegestaan,
   * zonder dat er een licentienaam aan hangt. RVO doet dit: "De
   * informatie van RVO is namelijk openbaar. U mag deze hergebruiken."
   */
  readonly hergebruikVerklaring?: string | null;
  /** Biedt de uitgever dit zelf aan als feed? */
  readonly isSyndicatie?: boolean;
  /**
   * Staat dit endpoint als `Sitemap:` in robots.txt? Die directive
   * bestaat alleen om crawlers te vertellen wat ze mogen ophalen, dus
   * dat is een uitnodiging.
   */
  readonly inRobotsAangekondigd?: boolean;
};

/** Komt deze URL voor in de Sitemap-directives van robots.txt? */
export function aangekondigdInRobots(
  robots: RobotsBestand | null | undefined,
  endpointUrl: string,
): boolean {
  if (!robots) return false;
  return robots.sitemaps.some((s) => {
    const genormaliseerd = s.trim().replace(/\/+$/, "");
    return genormaliseerd === endpointUrl.replace(/\/+$/, "");
  });
}

const OPEN_LICENTIE =
  /\b(cc0|cc[\s-]?by|creative\s*commons|public\s*domain|publiek\s*domein|pdm\s*1\.0|open\s*data\s*licen[ct]ie)\b/i;

export function bepaalToestemming(invoer: ToestemmingInvoer): Toestemming {
  // 1. Expliciet verbod in woorden.
  if (invoer.explicietVerbod && invoer.explicietVerbod.trim().length > 0) {
    return {
      tdmStatus: "voorbehoud",
      grondslag: "expliciet_verbod",
      mogenVerwerken: false,
      bewijs: `uitgever verbiedt tekst- en datamining: "${invoer.explicietVerbod.trim().slice(0, 300)}"`,
    };
  }

  // 2. AI-crawler volledig uitgesloten in robots.txt.
  const uitgesloten = (invoer.robots?.volledigUitgesloten ?? []).filter((a) =>
    TDM_USERAGENTS.some((t) => a.includes(t)),
  );
  if (uitgesloten.length > 0) {
    return {
      tdmStatus: "voorbehoud",
      grondslag: "ai_crawler_uitgesloten",
      mogenVerwerken: false,
      bewijs: `robots.txt sluit ${uitgesloten.join(", ")} volledig uit; dat lezen wij als voorbehoud op geautomatiseerd hergebruik`,
    };
  }

  // 3. Open licentie.
  if (invoer.licentie && OPEN_LICENTIE.test(invoer.licentie)) {
    return {
      tdmStatus: "geen_voorbehoud",
      grondslag: "open_licentie",
      mogenVerwerken: true,
      bewijs:
        `uitgever verklaart ${invoer.licentie}` +
        (invoer.licentieBewijs ? ` — ${invoer.licentieBewijs.slice(0, 300)}` : ""),
    };
  }

  // 4. De uitgever verklaart hergebruik in eigen woorden.
  if (invoer.hergebruikVerklaring && invoer.hergebruikVerklaring.trim().length > 0) {
    return {
      tdmStatus: "geen_voorbehoud",
      grondslag: "hergebruik_verklaard",
      mogenVerwerken: true,
      bewijs: `uitgever staat hergebruik toe: "${invoer.hergebruikVerklaring.trim().slice(0, 300)}"`,
    };
  }

  // 5. De uitgever biedt zelf een syndicatiefeed aan.
  if (invoer.isSyndicatie) {
    return {
      tdmStatus: "geen_voorbehoud",
      grondslag: "syndicatieformaat",
      mogenVerwerken: true,
      bewijs:
        "uitgever publiceert zelf een RSS/Atom-feed en sluit geen AI- of TDM-crawler uit; " +
        "een feed bestaat om gelezen te worden",
    };
  }

  // 6. Het endpoint staat als Sitemap in robots.txt.
  if (invoer.inRobotsAangekondigd) {
    return {
      tdmStatus: "geen_voorbehoud",
      grondslag: "in_robots_aangekondigd",
      mogenVerwerken: true,
      bewijs:
        "dit endpoint staat als Sitemap-directive in robots.txt; die directive bestaat uitsluitend " +
        "om crawlers te vertellen wat ze mogen ophalen",
    };
  }

  return {
    tdmStatus: "onbekend",
    grondslag: "geen_grondslag",
    mogenVerwerken: false,
    bewijs:
      "geen open licentie, geen syndicatiefeed en geen leesbare robots.txt-grondslag; " +
      "onbekend betekent niet ophalen",
  };
}
