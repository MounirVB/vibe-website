/* ============================================================
   SITE — schrijvende adapter op het routeregister van Release 1
   ------------------------------------------------------------
   src/site/routeregister.ts LEEST het register van Release 1. Dit
   bestand SCHRIJFT erin, en wel precies op één plek:

       data/inhoud/nieuws/<slug>.json

   WAAROM GEEN .HTML MEER
   Release 2 schreef eerst rechtstreeks een .html plus een regel in
   sitemap.xml. Na samenvoeging met Release 1 is dat actief schadelijk:
   die generator bouwt sitemap.xml uit het routeregister, dus de
   volgende run gooit onze regel weg, en onze losse .html staat in geen
   enkel register. Eén schrijver per bestand, en de generator van
   Release 1 bezit de HTML en de sitemap.

   WAAROM ALLEEN data/inhoud/nieuws/
   SCHEMA.md van Release 1: "Eén bestand = één schrijver, zodat er nooit
   twee mensen of processen in dezelfde pagina zitten." De map
   data/inhoud/nieuws/ is van dit platform. Alle andere mappen —
   kennis, oplossing, sector, toepassing, hub — zijn van de redactie
   van Release 1. Een voorstel om zo'n bestaande pagina te verbeteren
   (UPDATE_EXISTING, REGIONAL_PATCH) wordt daarom NIET naar schijf
   geschreven. Dat voorstel blijft in de database staan en is zichtbaar
   in het dashboard; een mens brengt het over. Zou dit platform dat
   bestand zelf aanpassen, dan overschreef het het werk van een andere
   schrijver zonder dat die het merkt.

   WAT DE REDACTIONELE STAAT BETEKENT
   Het contract (data/seo/nieuws-architectuur.json) kent vijf standen en
   laat alleen GOEDGEKEURD door naar INDEX. Die stand wordt hier niet
   verzonnen maar OVERGENOMEN uit de database:

     inhoud_versies.status     ->  redactionele_staat
     ------------------------      -------------------
     concept                       CONCEPT
     ter_review                    TER_REDACTIE
     goedgekeurd                   GOEDGEKEURD
     ingetrokken                   INGETROKKEN

   `goedgekeurd_door` komt uit dezelfde rij. De database staat geen
   goedkeuring toe waarbij de goedkeurder gelijk is aan de aanmaker of
   de bewerker (constraint inhoud_versies_vier_ogen), en bindt de
   goedkeuring aan een afdruk van de inhoud
   (inhoud_versies_goedkeuring_bindt). De naam in het registerrecord is
   dus een echte tweede persoon, geen vlag die dit platform zelf zet.

   EN DIT PUBLICEERT NOG NIETS
   Een record op schijf is geen pagina. Er moet daarna nog een
   generatorrun komen, een commit, en een push naar main. Elk van die
   drie is een menselijke handeling. Bovendien faalt poort 16 zolang
   vibe/chrome.js de zichtbare navigatielink mist.
   ============================================================ */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("nieuwsregister");

/** Het padsegment dat dit platform exclusief bezit. */
export const NIEUWS_MAP = join("data", "inhoud", "nieuws");

/**
 * Uitgeverssoort uit het bronregister naar de bronsoort uit het contract.
 *
 * BEWUST CONSERVATIEF. Het contract laat alleen WETGEVING,
 * TOEZICHTHOUDER, NETBEHEERDER en STATISTIEK een bericht zelfstandig
 * dragen. Alles waarvan niet ondubbelzinnig vaststaat dat het een
 * wetgever, toezichthouder, netbeheerder of statistiekbureau is, wordt
 * hier MARKTPARTIJ — en kan een artikel dus niet alleen dragen.
 *
 * `aanbestedingen` staat daarom op MARKTPARTIJ en niet op WETGEVING:
 * TenderNed is een overheidsplatform, maar een aanbestedingsaankondiging
 * is een inkoophandeling, geen vaststelling over de markt.
 */
export const BRONSOORT_UIT_UITGEVER: Readonly<Record<string, string>> = {
  rijksoverheid: "WETGEVING",
  toezichthouder: "TOEZICHTHOUDER",
  netbeheerder: "NETBEHEERDER",
  statistiek: "STATISTIEK",
  geodata: "STATISTIEK",
  branchevereniging: "MARKTPARTIJ",
  aanbestedingen: "MARKTPARTIJ",
  vakmedium: "MARKTPARTIJ",
  marktplatform: "MARKTPARTIJ",
};

export const STAAT_UIT_STATUS: Readonly<Record<string, string>> = {
  concept: "CONCEPT",
  ter_review: "TER_REDACTIE",
  goedgekeurd: "GOEDGEKEURD",
  ingetrokken: "INGETROKKEN",
  gepubliceerd: "GOEDGEKEURD",
};

export type RegisterBron = {
  readonly naam: string;
  readonly url: string;
  readonly datum: string;
  readonly soort: string;
};

export type RegisterClaim = {
  readonly tekst: string;
  readonly bron: string;
  readonly bron_url: string;
  readonly bron_datum: string;
};

export type NieuwsInvoer = {
  readonly pad: string;
  readonly titel: string;
  readonly metaOmschrijving: string;
  readonly h1: string;
  readonly lead: string;
  readonly bodyMarkdown: string;
  readonly gepubliceerd: string;
  readonly gewijzigd: string;
  readonly status: string;
  readonly goedgekeurdDoor: string | null;
  readonly goedgekeurdOp: string | null;
  readonly onderwerpEigenaar: string | null;
  readonly oplossingLinks: readonly string[];
  readonly kennisLinks: readonly string[];
  readonly regioLinks: readonly string[];
  readonly bronnen: readonly RegisterBron[];
  readonly claims: readonly RegisterClaim[];
  readonly directAntwoord: { vraag: string; antwoord: string; voorbehoud?: string } | null;
  /** Herkomst, zodat een record terug te voeren is op de database. */
  readonly herkomst: {
    readonly inhoudVersieId: number;
    readonly inhoudAfdruk: string | null;
    readonly besluitSoort: string;
  };
};

/** De slug uit een pad als '/nieuws/iets' of 'nieuws/iets'. */
export function slugVanPad(pad: string): string | null {
  const schoon = pad.replace(/^\/+/, "").replace(/\.html$/, "");
  const m = /^nieuws\/([a-z0-9][a-z0-9-]*)$/.exec(schoon);
  return m ? m[1]! : null;
}

/** Hoort dit pad bij het nieuwskanaal, en mag dit platform er dus schrijven? */
export function isNieuwsPad(pad: string): boolean {
  return slugVanPad(pad) !== null;
}

/**
 * Markdown naar de sectievorm van het contract.
 *
 * Een `## kop` begint een nieuwe sectie; alles eronder wordt een alinea
 * of een lijst. Een `### kop` blijft binnen de sectie staan en wordt een
 * h3-alinea — dat mag, want genereer-nationaal.mjs geeft een alinea die
 * met `<h3` begint ongewijzigd door.
 *
 * Een `# kop` wordt WEGGELATEN: de H1 staat al in het `h1`-veld en twee
 * H1's op een pagina is een fout die poort 4 meldt.
 *
 * DE EERSTE ALINEA WORDT OVERGESLAGEN, en dat is geen smaakkwestie:
 * `leadUit()` neemt precies die alinea als lead, en de lead staat al
 * bovenaan de pagina. Zou hij hier ook een sectie worden, dan stond
 * dezelfde alinea twee keer op de pagina — en twee pagina's met
 * grotendeels dezelfde tekst is precies wat poort 11 zoekt. De twee
 * functies zijn dus symmetrisch: wat de lead wordt, wordt geen sectie.
 */
export function markdownNaarSecties(
  markdown: string,
): { kop: string; alineas: string[] }[] {
  const secties: { kop: string; alineas: string[] }[] = [];
  let huidig: { kop: string; alineas: string[] } | null = null;
  let lijst: string[] = [];
  let leadGehad = false;

  const inline = veiligeInline;

  const sluitLijst = () => {
    if (!lijst.length) return;
    const ul = `<ul class="ve-lijst">${lijst.map((i) => `<li>${i}</li>`).join("")}</ul>`;
    (huidig ??= { kop: "Toelichting", alineas: [] }).alineas.push(ul);
    lijst = [];
  };

  const sluitSectie = () => {
    sluitLijst();
    if (huidig && huidig.alineas.length) secties.push(huidig);
    huidig = null;
  };

  for (const regel of markdown.split("\n")) {
    const t = regel.trim();
    if (t === "") {
      sluitLijst();
      continue;
    }
    if (t.startsWith("# ")) {
      sluitSectie();
      continue;
    }
    if (t.startsWith("## ")) {
      sluitSectie();
      huidig = { kop: inline(t.slice(3)), alineas: [] };
      continue;
    }
    if (t.startsWith("### ")) {
      sluitLijst();
      (huidig ??= { kop: "Toelichting", alineas: [] }).alineas.push(`<h3>${inline(t.slice(4))}</h3>`);
      continue;
    }
    if (t.startsWith("- ")) {
      lijst.push(inline(t.slice(2)));
      continue;
    }
    sluitLijst();
    if (!leadGehad) {
      // Dit is de alinea die leadUit() als lead neemt. Niet nog eens
      // als sectie; zie de toelichting boven deze functie.
      leadGehad = true;
      continue;
    }
    (huidig ??= { kop: "Toelichting", alineas: [] }).alineas.push(inline(t));
  }
  sluitSectie();
  return secties;
}

/**
 * Markdown-inline naar veilige HTML.
 *
 * DIT IS EEN VEILIGHEIDSGRENS, geen opmaakgemak.
 *
 * De generator van Release 1 interpoleert `lead`, `alineas` en de velden
 * van `direct_antwoord` RAUW in de pagina — een alinea mag immers HTML
 * bevatten, dat staat zo in SCHEMA.md. Dat was veilig zolang een mens
 * die bestanden schreef. Vanaf nu schrijft een machine ze, en die
 * machine verwerkt tekst die uit externe bronnen komt. Een `<script>`
 * in een brondocument zou anders via body_markdown in de lead belanden
 * en als echt scripttag op de pagina staan.
 *
 * Daarom gaat alles wat dit platform naar het register schrijft hier
 * langs: `&`, `<` en `>` worden geëscapeerd, en alleen de opmaak die de
 * conceptgenerator zelf produceert (vet, cursief, links) wordt daarna
 * weer als HTML teruggezet. Een link-URL die niet met `/` of `https://`
 * begint wordt `#`, dus `javascript:` en `data:` komen er niet door.
 */
export function veiligeInline(tekst: string): string {
  return tekst
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, u: string) => {
      const veilig = /^(\/|https:\/\/)/.test(u) ? u : "#";
      return `<a href="${veilig}">${label}</a>`;
    });
}

/**
 * De H1 uit de `<title>`. De titel draagt een merkstaart, de H1 niet —
 * SCHEMA.md van Release 1: "h1 ... geen merknaam".
 */
export function h1Uit(titel: string): string {
  return titel.replace(/\s*[|–—]\s*Vibe(\s+Energy)?\s*$/i, "").trim() || titel.trim();
}

/**
 * De lead: de eerste alinea van de body, vóór de eerste `##`.
 *
 * Niet verzonnen en niet samengevat — letterlijk de openingsalinea die de
 * conceptgenerator al schreef. Is er geen alinea vóór de eerste kop, dan
 * valt het terug op de metabeschrijving, want een lead is verplicht.
 */
export function leadUit(markdown: string, terugval: string): string {
  for (const blok of markdown.split(/\n\s*\n/)) {
    const t = blok.trim();
    if (t === "" || t.startsWith("#") || t.startsWith("- ")) continue;
    // Door veiligeInline(), want de generator van Release 1 zet de lead
    // rauw in de pagina. Zie de toelichting bij veiligeInline().
    return veiligeInline(t.replace(/\s*\n\s*/g, " "));
  }
  return veiligeInline(terugval);
}

/** Het registerrecord zoals het op schijf komt. */
export function bouwNieuwsRecord(inv: NieuwsInvoer): Record<string, unknown> {
  const slug = slugVanPad(inv.pad);
  if (slug === null) {
    throw new Error(
      `pad '${inv.pad}' is geen nieuwsroute; dit platform schrijft alleen onder ${NIEUWS_MAP}`,
    );
  }

  const staat = STAAT_UIT_STATUS[inv.status] ?? "CONCEPT";
  const secties = markdownNaarSecties(inv.bodyMarkdown);

  return {
    _herkomst: {
      _toelichting:
        "Geschreven door het intelligenceplatform (intelligence/src/site/nieuwsregister.ts). " +
        "Niet met de hand bijwerken: een volgende publicatierun overschrijft dit bestand. " +
        "Wijzig de inhoudsversie in de database en publiceer opnieuw.",
      inhoud_versie_id: inv.herkomst.inhoudVersieId,
      inhoud_afdruk: inv.herkomst.inhoudAfdruk,
      besluit: inv.herkomst.besluitSoort,
      geschreven_op: inv.gewijzigd,
    },
    route: `nieuws/${slug}`,
    type: "nieuws",
    titel: inv.titel,
    beschrijving: inv.metaOmschrijving,
    og_titel: inv.h1,
    h1: inv.h1,
    kruimel_label: inv.h1,
    lead: inv.lead,
    gepubliceerd: inv.gepubliceerd,
    gewijzigd: inv.gewijzigd,
    redactionele_staat: staat,
    goedgekeurd_door: inv.goedgekeurdDoor ?? "",
    goedgekeurd_op: inv.goedgekeurdOp ?? "",
    onderwerp_eigenaar: inv.onderwerpEigenaar ?? "",
    oplossing_links: [...inv.oplossingLinks],
    kennis_links: [...inv.kennisLinks],
    regio_links: [...inv.regioLinks],
    // De bronnaam komt uit een brondocumenttitel en gaat door esc() van de
    // generator heen, maar de URL wordt als href gebruikt. Alleen https en
    // interne paden; nooit javascript: of data:.
    bronnen: inv.bronnen.map((b) => ({
      naam: b.naam,
      url: /^(\/|https:\/\/)/.test(b.url) ? b.url : "",
      datum: b.datum,
      soort: b.soort,
    })),
    claims: inv.claims.map((c) => ({
      tekst: c.tekst,
      bron: c.bron,
      bron_url: c.bron_url,
      bron_datum: c.bron_datum,
    })),
    // Ook het directe antwoord gaat rauw in de pagina; door veiligeInline().
    direct_antwoord: inv.directAntwoord
      ? {
          vraag: veiligeInline(inv.directAntwoord.vraag),
          antwoord: veiligeInline(inv.directAntwoord.antwoord),
          ...(inv.directAntwoord.voorbehoud
            ? { voorbehoud: veiligeInline(inv.directAntwoord.voorbehoud) }
            : {}),
        }
      : null,
    secties,
  };
}

export type SchrijfUitkomst = {
  readonly bestandspad: string;
  readonly geschreven: boolean;
  readonly bestondAl: boolean;
  readonly vorigeInhoud: string | null;
  readonly inhoud: string;
};

/**
 * Schrijft het registerrecord. Geen HTML, geen sitemap: die bezit de
 * generator van Release 1.
 */
export async function schrijfNieuwsRecord(
  siteWortel: string,
  record: Record<string, unknown>,
  opties: { droog?: boolean } = {},
): Promise<SchrijfUitkomst> {
  const route = String(record["route"]);
  const slug = slugVanPad(route);
  if (slug === null) throw new Error(`record heeft geen geldige nieuwsroute: '${route}'`);

  const relpad = join(NIEUWS_MAP, `${slug}.json`);
  const volledig = join(siteWortel, relpad);
  const inhoud = JSON.stringify(record, null, 2) + "\n";

  const bestondAl = existsSync(volledig);
  const vorigeInhoud = bestondAl ? await readFile(volledig, "utf8") : null;

  if (opties.droog) {
    return { bestandspad: relpad, geschreven: false, bestondAl, vorigeInhoud, inhoud };
  }

  await mkdir(join(siteWortel, NIEUWS_MAP), { recursive: true });
  await writeFile(volledig, inhoud, "utf8");
  log.info("registerrecord geschreven", { bestand: relpad, bytes: inhoud.length, nieuw: !bestondAl });

  return { bestandspad: relpad, geschreven: true, bestondAl, vorigeInhoud, inhoud };
}

/**
 * Draait een registerrecord terug.
 *
 * Bestond er een vorige versie, dan wordt die teruggezet. Bestond die
 * niet, dan wordt het bestand verwijderd. In beide gevallen verdwijnt de
 * pagina pas bij de volgende generatorrun: die ruimt met
 * data/seo/gegenereerd.json op wat niet langer INDEX is.
 */
export async function draaiNieuwsRecordTerug(
  siteWortel: string,
  relpad: string,
  vorigeInhoud: string | null,
): Promise<{ hersteld: boolean; verwijderd: boolean }> {
  const volledig = join(siteWortel, relpad);
  if (vorigeInhoud !== null) {
    await writeFile(volledig, vorigeInhoud, "utf8");
    log.info("registerrecord hersteld naar de vorige versie", { bestand: relpad });
    return { hersteld: true, verwijderd: false };
  }
  if (existsSync(volledig)) {
    await unlink(volledig);
    log.info("registerrecord verwijderd", { bestand: relpad });
    return { hersteld: false, verwijderd: true };
  }
  return { hersteld: false, verwijderd: false };
}
