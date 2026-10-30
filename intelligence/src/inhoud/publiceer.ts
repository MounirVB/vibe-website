/* ============================================================
   INHOUD — publiceren naar de statische site
   ------------------------------------------------------------
   Schrijft een goedgekeurde inhoudsversie als .html in de sitewortel,
   volgens het gemeten contract van deze site:

     publieke URL extensieloos, bestand met .html
     head-orde: _consent.js -> GTM -> _clarity.js -> charset -> viewport
                -> title -> description -> canonical -> robots -> icon
                -> og:* -> twitter:* -> theme-color -> font preload
                -> vibe/tokens.css -> vibe/vibe.css -> vibe/chrome.js
     body met data-pagina, een noscript-fallback en data-chrome-footer

   Drie dingen die dit veilig maken:

   1. ELKE PUBLICATIE IS TERUG TE DRAAIEN. De volledige vorige
      bestandsinhoud gaat in intel.publicaties.vorige_inhoud voordat er
      geschreven wordt. Zonder dat is publiceren onomkeerbaar.
   2. ALLEEN WAT HET PLATFORM BEZIT. Een pad met beheer='handmatig'
      wordt geweigerd; daarvoor is er een patchvoorstel.
   3. DE SITEMAP GAAT MEE. Een pagina die niet in sitemap.xml staat
      wordt niet gevonden, en een sitemap met een pad dat niet bestaat
      is een fout. Beide kanten worden bijgewerkt in dezelfde stap.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type pg from "pg";
import { configLezen } from "../kern/config.ts";
import { eenRij, metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { IntelFout } from "../kern/fouten.ts";
import { maakLogger } from "../kern/log.ts";
import { sha256hex } from "../kern/tekst.ts";
import { bronOpSleutel } from "../bronnen/register.ts";
import { NIET_DRAGENDE_DOCUMENTSOORTEN } from "../pijplijn/documentsoort.ts";
import {
  bewijsDraagt,
  claimDraagt,
  legBewijsblokkadeVast,
  toetsGebondenBewijs,
  waaromNietDragend,
} from "../pijplijn/claimpoort.ts";
/* GEEN KRINGVERWIJZING. inhoud/concept.ts importeert dit bestand niet;
   de pijl loopt één kant op (publiceer -> concept). Nagegaan met grep
   op 'publiceer.ts' in concept.ts: nul treffers. */
import { inhoudAfdruk } from "./concept.ts";
import {
  heeftRouteregister,
  leesRouteregister,
  leesRouteStaten,
  routeVoorCluster,
} from "../site/routeregister.ts";
import {
  BRONSOORT_UIT_UITGEVER,
  bouwNieuwsRecord,
  draaiNieuwsRecordTerug,
  h1Uit,
  isNieuwsPad,
  leadUit,
  schrijfNieuwsRecord,
  type RegisterBron,
  type RegisterClaim,
} from "../site/nieuwsregister.ts";

const log = maakLogger("publiceer");

/**
 * De bronsoort zoals hij in het REGISTERRECORD belandt.
 *
 * DIT IS DE WAARDE DIE weigerNieuws() LEEST om te beslissen of er een
 * dragende bron onder een bericht zit (DRAGENDE_BRONSOORTEN in
 * scripts/seo/bouw-routes.mjs). Hij kwam uitsluitend uit de
 * uitgeverscategorie, en dat was het R3-defect herhaald op de plek waar
 * het het meest kost: een ACM-document is `toezichthouder` en dus
 * TOEZICHTHOUDER — dragend — ook als dat specifieke document een
 * opiniestuk is of een besluit van een ánder gezag navertelt.
 *
 * Een document dat zelf niets vaststelt verlaagt daarom naar
 * MARKTPARTIJ. Dat is geen tweede regel bovenop de eerste: het is
 * dezelfde regel die de claimlaag al gebruikt
 * (NIET_DRAGENDE_DOCUMENTSOORTEN), nu ook toegepast op het artefact dat
 * gepubliceerd wordt.
 *
 * NULL VERLAAGT OOK. Een ongeclassificeerd document is niet aantoonbaar
 * dragend, en op deze naad is dat genoeg om het niet te zijn.
 *
 * Als eigen, geexporteerde functie zodat hij te toetsen is zonder een
 * publicatieronde te draaien.
 */
export function bronsoortVoorRecord(
  uitgeverSoort: string,
  documentsoort: string | null,
): string {
  const uitUitgever = BRONSOORT_UIT_UITGEVER[uitgeverSoort] ?? "MARKTPARTIJ";
  const documentDraagt =
    documentsoort !== null && !NIET_DRAGENDE_DOCUMENTSOORTEN.includes(documentsoort);
  return documentDraagt ? uitUitgever : "MARKTPARTIJ";
}

function esc(waarde: string): string {
  return waarde.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

/**
 * Markdown naar HTML, beperkt tot wat de conceptgenerator produceert:
 * koppen, alinea's, lijsten, vet, cursief en links. Een volledige
 * markdownbibliotheek is hier niet nodig en zou een afhankelijkheid
 * toevoegen aan een repository met precies twee.
 */
export function markdownNaarHtml(markdown: string): string {
  const regels = markdown.split("\n");
  const uit: string[] = [];
  let inLijst = false;

  const inline = (tekst: string): string =>
    esc(tekst)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t: string, u: string) => {
        // Alleen interne paden en https; nooit javascript: of data:.
        const veilig = /^(\/|https:\/\/)/.test(u) ? u : "#";
        return `<a href="${esc(veilig)}">${t}</a>`;
      })
      .replace(/&lt;(https:\/\/[^\s&]+)&gt;/g, '<a href="$1" rel="nofollow noopener">$1</a>');

  const sluitLijst = () => {
    if (inLijst) {
      uit.push("      </ul>");
      inLijst = false;
    }
  };

  for (const regel of regels) {
    const t = regel.trim();
    if (t === "") {
      sluitLijst();
      continue;
    }
    if (t.startsWith("# ")) {
      sluitLijst();
      uit.push(`      <h1 class="ve-h1">${inline(t.slice(2))}</h1>`);
      continue;
    }
    if (t.startsWith("## ")) {
      sluitLijst();
      uit.push(`      <h2 class="ve-h2">${inline(t.slice(3))}</h2>`);
      continue;
    }
    if (t.startsWith("### ")) {
      sluitLijst();
      uit.push(`      <h3 class="ve-h3">${inline(t.slice(4))}</h3>`);
      continue;
    }
    if (t.startsWith("- ")) {
      if (!inLijst) {
        uit.push('      <ul class="ve-lijst">');
        inLijst = true;
      }
      uit.push(`        <li>${inline(t.slice(2))}</li>`);
      continue;
    }
    sluitLijst();
    uit.push(`      <p>${inline(t)}</p>`);
  }
  sluitLijst();
  return uit.join("\n");
}

export type TePubliceren = {
  readonly pad: string;
  readonly titel: string;
  readonly metaOmschrijving: string;
  readonly canoniekeUrl: string;
  readonly bodyMarkdown: string;
  readonly structuredData: unknown;
  readonly dataPagina: string;
};

/** Bouwt het volledige HTML-bestand volgens het contract van deze site. */
export function bouwPagina(c: TePubliceren): string {
  const sd = JSON.stringify(c.structuredData, null, 2);
  return `<!doctype html>
<html lang="nl">
<head>
<script src="_consent.js"></script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KM2V7VQ3');</script>
<script src="_clarity.js"></script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--SEO-FOUNDATION-->
<title>${esc(c.titel)}</title>
<meta name="description" content="${esc(c.metaOmschrijving)}">
<link rel="canonical" href="${esc(c.canoniekeUrl)}">
<meta name="robots" content="index, follow">
<link rel="icon" type="image/svg+xml" href="assets/vibe-mark.svg">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Vibe Energy">
<meta property="og:locale" content="nl_NL">
<meta property="og:title" content="${esc(c.titel)}">
<meta property="og:description" content="${esc(c.metaOmschrijving)}">
<meta property="og:url" content="${esc(c.canoniekeUrl)}">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">
${sd}
</script>
<!--/SEO-FOUNDATION-->
<meta name="theme-color" content="#0052FF">
<link rel="preload" href="assets/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="vibe/tokens.css">
<link rel="stylesheet" href="vibe/vibe.css">
<script src="vibe/chrome.js" defer></script>
</head>

<body data-pagina="${esc(c.dataPagina)}">

<noscript data-chrome-fallback>
  <nav aria-label="Hoofdnavigatie">
    <a href="/">Home</a> · <a href="projecten">Projecten</a> ·
    <a href="systeem-energieopslag">Energieopslag</a> · <a href="vibe-control">VIBE.CONTROL</a> ·
    <a href="over-ons">Over Vibe</a> · <a href="contact">Plan een gesprek</a>
  </nav>
</noscript>

<main id="hoofdinhoud">
  <section class="ve-sec">
    <div class="ve-wrap">
${markdownNaarHtml(c.bodyMarkdown)}
    </div>
  </section>
</main>

<div data-chrome-footer></div>
</body>
</html>
`;
}

/** Voegt een pad toe aan sitemap.xml, of laat hem ongemoeid als hij er al staat. */
export function sitemapMetPad(
  sitemapXml: string,
  volledigeUrl: string,
  prioriteit = "0.6",
): { xml: string; gewijzigd: boolean } {
  if (sitemapXml.includes(`<loc>${volledigeUrl}</loc>`)) {
    return { xml: sitemapXml, gewijzigd: false };
  }
  const invoeging =
    `  <url>\n    <loc>${volledigeUrl}</loc>\n    <priority>${prioriteit}</priority>\n  </url>\n`;
  const sluit = sitemapXml.lastIndexOf("</urlset>");
  if (sluit === -1) {
    throw new IntelFout("poort", "sitemap.xml mist </urlset>; niet veilig te wijzigen");
  }
  return {
    xml: sitemapXml.slice(0, sluit) + invoeging + sitemapXml.slice(sluit),
    gewijzigd: true,
  };
}

export function sitemapZonderPad(
  sitemapXml: string,
  volledigeUrl: string,
): { xml: string; gewijzigd: boolean } {
  const patroon = new RegExp(
    `\\s*<url>\\s*<loc>${volledigeUrl.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}</loc>[\\s\\S]*?</url>`,
    "g",
  );
  const nieuw = sitemapXml.replace(patroon, "");
  return { xml: nieuw, gewijzigd: nieuw !== sitemapXml };
}

/**
 * De uitslag van een goedkeuringspoging.
 *
 * Een discriminated union en geen boolean met een losse reden: zo kan
 * de typecontrole een aanroeper die `goedgekeurd` niet leest er niet
 * langs laten met een plausibel ogende regel.
 */
export type GoedkeurUitslag =
  | { readonly goedgekeurd: true }
  | {
      readonly goedgekeurd: false;
      readonly reden: string;
      readonly blokkades: readonly string[];
    };

export type PublicatieRapport = {
  readonly inhoudVersieId: number;
  readonly bestandspad: string;
  readonly geschreven: boolean;
  readonly sitemapBijgewerkt: boolean;
  readonly publicatieId: number | null;
  readonly reden: string;
};

export async function publiceer(
  pool: Pool,
  organisatieId: number,
  inhoudVersieId: number,
  opties: { droog?: boolean } = {},
): Promise<PublicatieRapport> {
  const config = configLezen();

  return metOrganisatie(pool, { organisatieId }, async (c) => {
    const v = await eenRij<{
      id: number;
      pad: string;
      titel: string;
      meta_omschrijving: string;
      canonieke_url: string;
      body_markdown: string;
      structured_data: unknown;
      status: string;
      poorten_geslaagd: boolean;
      blokkades: string[];
      soort: string;
      inhoud_afdruk: string | null;
      goedgekeurde_afdruk: string | null;
      pagina_beheer: string | null;
      direct_antwoord: string | null;
      kandidaat_id: number | null;
      goedgekeurd_door: number | null;
      goedgekeurd_op: string | null;
      goedkeurder_naam: string | null;
      interne_links: string[] | null;
    }>(
      c,
      `select v.id, v.pad, v.titel, v.meta_omschrijving, v.canonieke_url,
              v.body_markdown, v.structured_data, v.status, v.poorten_geslaagd,
              v.blokkades, v.soort, v.inhoud_afdruk, v.goedgekeurde_afdruk,
              v.direct_antwoord, v.kandidaat_id, v.goedgekeurd_door,
              -- DE INTERNE LINKS, die hier tot R2 niet werden gelezen.
              -- Zie de toelichting bij splitsInterneLinks() in dit bestand.
              -- GEEN BACKTICKS IN DIT COMMENTAAR: deze query staat in een
              -- template literal en een backtick sluit die af.
              v.interne_links,
              v.goedgekeurd_op::date::text as goedgekeurd_op,
              g.naam as goedkeurder_naam,
              pr.beheer as pagina_beheer
         from intel.inhoud_versies v
         left join intel.pagina_register pr
                on pr.organisatie_id = v.organisatie_id and pr.pad = v.pad
         left join intel.gebruikers g
                on g.id = v.goedgekeurd_door
        where v.organisatie_id = $1 and v.id = $2`,
      [organisatieId, inhoudVersieId],
    );
    if (!v) throw new IntelFout("configuratie", `inhoudsversie ${inhoudVersieId} bestaat niet`);

    // Poorten vóór alles. Dit is dezelfde controle als in de database,
    // maar met een leesbare reden erbij.
    if (!v.poorten_geslaagd) {
      return weiger(v.id, `poorten niet geslaagd: ${v.blokkades.join(" | ")}`);
    }
    if (v.status !== "goedgekeurd") {
      return weiger(
        v.id,
        `status is '${v.status}'; alleen 'goedgekeurd' mag gepubliceerd worden ` +
          "(propose-only is de standaard)",
      );
    }
    if (v.goedgekeurde_afdruk === null || v.goedgekeurde_afdruk !== v.inhoud_afdruk) {
      return weiger(
        v.id,
        "de goedgekeurde afdruk wijkt af van de huidige inhoud; de tekst is na goedkeuring gewijzigd",
      );
    }
    if (v.pagina_beheer === "handmatig") {
      return weiger(
        v.id,
        `pagina ${v.pad} staat op handmatig beheer; dit platform schrijft dat bestand niet`,
      );
    }

    /* DE CLAIMS, NU OPNIEUW GELEZEN — niet de boolean hierboven.
       `v.poorten_geslaagd` is bij de conceptbouw of bij een hertoets
       geschreven. Tussen dat moment en deze publicatie zit de
       goedkeuring, en dus menselijke tijd. Een herbeoordelingsronde die
       daarna een bevestiging intrekt, maakt de boolean onwaar zonder
       hem te veranderen.

       Dit is de LAATSTE poort voor een bestand op schijf of een record
       in het routeregister, en dus de plek waar de vraag niet uit een
       kolom mag komen maar uit de rijen zelf. Zie de sectiekop in
       pijplijn/claimpoort.ts voor het slot en de race. */
    const bewijs = await toetsGebondenBewijs(c, organisatieId, v.id);
    if (!bewijsDraagt(bewijs)) {
      await legBewijsblokkadeVast(c, organisatieId, bewijs, "publicatie");
      return weiger(v.id, `het bewijs draagt niet meer: ${bewijs.blokkades.join(" | ")}`);
    }

    // Zodra het routeregister van Release 1 bestaat, GENEREERT die
    // generator de pagina's en de sitemap uit data/. Dan is rechtstreeks
    // een .html schrijven en een <url> aan sitemap.xml plakken niet
    // alleen dubbelop maar actief schadelijk: de volgende generatorrun
    // gooit onze sitemapregel weg en onze pagina staat in geen register.
    // De route is dan een registerrecord, niet een bestand.
    if (heeftRouteregister(config.siteWortel)) {
      return await publiceerViaRegister(c, organisatieId, v, config, opties, weiger);
    }

    const bestandsnaam = `${v.pad.replace(/^\//, "")}.html`;
    const volledigPad = join(config.siteWortel, bestandsnaam);
    const html = bouwPagina({
      pad: v.pad,
      titel: v.titel,
      metaOmschrijving: v.meta_omschrijving,
      canoniekeUrl: v.canonieke_url,
      bodyMarkdown: v.body_markdown,
      structuredData: v.structured_data,
      dataPagina: v.soort === "nieuw_artikel" ? "nieuws" : "kennis",
    });

    const bestaatAl = existsSync(volledigPad);
    const vorigeInhoud = bestaatAl ? await readFile(volledigPad, "utf8") : null;

    const sitemapPad = join(config.siteWortel, "sitemap.xml");
    const sitemapVoor = existsSync(sitemapPad) ? await readFile(sitemapPad, "utf8") : null;
    const sitemapNa =
      sitemapVoor === null ? null : sitemapMetPad(sitemapVoor, v.canonieke_url);

    if (opties.droog) {
      return {
        inhoudVersieId: v.id,
        bestandspad: bestandsnaam,
        geschreven: false,
        sitemapBijgewerkt: false,
        publicatieId: null,
        reden:
          `DROOG: zou ${bestaatAl ? "overschrijven" : "aanmaken"} (${html.length} bytes) en de ` +
          `sitemap ${sitemapNa?.gewijzigd ? "bijwerken" : "ongemoeid laten"}`,
      };
    }

    await writeFile(volledigPad, html, "utf8");
    if (sitemapNa?.gewijzigd) await writeFile(sitemapPad, sitemapNa.xml, "utf8");

    const publicatie = await eenRij<{ id: number }>(
      c,
      `insert into intel.publicaties
         (organisatie_id, inhoud_versie_id, bestandspad, bestand_hash,
          vorige_bestand_hash, vorige_inhoud, sitemap_bijgewerkt, status)
       values ($1,$2,$3,$4,$5,$6,$7,'geschreven')
       returning id`,
      [
        organisatieId,
        v.id,
        bestandsnaam,
        sha256hex(html),
        vorigeInhoud === null ? null : sha256hex(vorigeInhoud),
        vorigeInhoud,
        sitemapNa?.gewijzigd ?? false,
      ],
    );

    await c.query("update intel.inhoud_versies set status = 'gepubliceerd' where id = $1", [v.id]);

    // Het pagina-register bijwerken: dit pad is nu van Release 2 en
    // wordt door dit platform beheerd.
    await c.query(
      `insert into intel.pagina_register
         (organisatie_id, pad, canonieke_url, bestandspad, titel, soort,
          in_sitemap, bestaat_in_repo, eigenaar_release, beheer, laatst_gepubliceerd_op)
       values ($1,$2,$3,$4,$5,$6,$7,true,'release2','intelligence',now())
       on conflict (organisatie_id, pad) do update set
         canonieke_url          = excluded.canonieke_url,
         bestandspad            = excluded.bestandspad,
         titel                  = excluded.titel,
         in_sitemap             = excluded.in_sitemap,
         bestaat_in_repo        = true,
         laatst_gepubliceerd_op = now()`,
      [
        organisatieId,
        v.pad,
        v.canonieke_url,
        bestandsnaam,
        v.titel,
        v.soort === "nieuw_artikel" ? "nieuws" : "kennis",
        sitemapNa?.gewijzigd ?? false,
      ],
    );

    await c.query(
      `insert into intel.publicatiebesluiten
         (organisatie_id, inhoud_versie_id, besluit, actor_soort, motivatie)
       values ($1, $2, 'gepubliceerd', 'systeem', $3)`,
      [organisatieId, v.id, `geschreven naar ${bestandsnaam} (${html.length} bytes)`],
    );

    log.info("gepubliceerd", { versie: v.id, bestand: bestandsnaam, bytes: html.length });

    return {
      inhoudVersieId: v.id,
      bestandspad: bestandsnaam,
      geschreven: true,
      sitemapBijgewerkt: sitemapNa?.gewijzigd ?? false,
      publicatieId: publicatie?.id ?? null,
      reden: `geschreven (${html.length} bytes)`,
    };
  });

  function weiger(id: number, reden: string): PublicatieRapport {
    log.waarschuwing("publicatie geweigerd", { versie: id, reden });
    return {
      inhoudVersieId: id,
      bestandspad: "",
      geschreven: false,
      sitemapBijgewerkt: false,
      publicatieId: null,
      reden: `GEWEIGERD: ${reden}`,
    };
  }
}

/* ------------------------------------------------------------------
   De registerroute: schrijf een record, geen pagina.
   ------------------------------------------------------------------ */

/**
 * De interne links van een inhoudsversie naar de twee linkvelden van
 * het contract, met alleen routes die écht op INDEX staan.
 *
 * WAAROM DIT BESTAAT. Hier stond in publiceerViaRegister() letterlijk:
 *
 *     oplossingLinks: [],
 *     kennisLinks: [],
 *     regioLinks: [],
 *
 * Drie lege arrays, hard. Terwijl `intel.inhoud_versies.interne_links`
 * gevuld IS: bouwConcept() berekent hem uit OPLOSSING_PER_CLUSTER en
 * filtert op bestaande paden, en poort 11 (`interne_links_bestaan`)
 * toetst hem nog. Gemeten: alle 7 inhoudsversies dragen
 * `["/contact","/projecten"]`. Die werden dus berekend, opgeslagen,
 * getoetst — en bij de publicatienaad weggegooid.
 *
 * Geen enkele poort ving dat, en dat is logisch: `weigerNieuws()` eist
 * dat ELKE `oplossing_link` op INDEX staat, en een lege lijst haalt die
 * eis triviaal. Het resultaat was een artikel zonder één interne link,
 * terwijl §6 en §7 van de opdracht die juist vragen en het contract het
 * conversiepad erop bouwt (poort 13 van audit.mjs).
 *
 * ALLEEN INDEX, EN DAT IS GEEN OVERDAAD. Zou hier een route meegaan die
 * op PENDING staat, dan zet weigerNieuws() het hele artikel op PENDING
 * — slechter dan geen link. Daarom wordt elke route eerst tegen
 * data/seo/routes.json gehouden; wat niet op INDEX staat valt af, mét
 * een regel in het log zodat het niet stil gebeurt.
 *
 * DE EIGENAAR GAAT ER UIT. `onderwerp_eigenaar` is een eigen veld in
 * het record en de generator rendert dat al als het conversiepad. Hem
 * ook nog als oplossing_link meegeven zou dezelfde link twee keer op de
 * pagina zetten.
 *
 * REGIOLINKS BLIJVEN LEEG, en dat is een besluit en geen vergeten geval.
 * `regio_links` verwacht CBS-gemeente- of provinciecodes, en die zitten
 * in `intel.gebeurtenis_geo` met een grondslag per gebied. Een
 * nieuwsbericht dat een gebied noemt zonder dat de BRON dat gebied
 * noemt, is precies de stille gevolgtrekking die docs/ARCHITECTUUR.md
 * §4 verbiedt ("er is geen geometrische insluiting, juist omdat ...").
 * Een gebiedsgebonden feit hoort een REGIONAL_PATCH te worden, en die
 * route bestaat al. Zodra een nieuwsbericht een eigen geogrondslag
 * krijgt, hoort hij hier te worden gevuld uit gebeurtenis_geo met
 * grondslag 'bron_expliciet' of 'code_match' — nooit 'afgeleid'.
 */
export function splitsInterneLinks(
  interneLinks: readonly string[],
  staatVanRoute: ReadonlyMap<string, string>,
  onderwerpEigenaar: string | null,
): { oplossingLinks: string[]; kennisLinks: string[]; afgevallen: string[] } {
  const oplossingLinks: string[] = [];
  const kennisLinks: string[] = [];
  const afgevallen: string[] = [];
  const eigenaar = (onderwerpEigenaar ?? "").replace(/^\/+/, "");
  /* ONTDUBBELEN NA HET NORMALISEREN, niet ervoor.
     Eerst stond hier `new Set(interneLinks)` op de RUWE strings. '/contact'
     en 'contact' zijn dan twee verschillende elementen die beide naar
     dezelfde route normaliseren, en de link kwam twee keer in het
     record. Gevonden door de eigen toets in
     test/eenheid/nieuwsketen-grendels.test.ts. */
  const gezien = new Set<string>();

  for (const ruw of interneLinks) {
    const route = ruw.replace(/^\/+/, "").replace(/\.html$/, "");
    if (route === "" || route === eigenaar) continue;
    if (gezien.has(route)) continue;
    gezien.add(route);
    const staat = staatVanRoute.get(route);
    if (staat !== "INDEX") {
      afgevallen.push(`${route} (${staat ?? "bestaat niet in routes.json"})`);
      continue;
    }
    if (route.startsWith("kennis/")) kennisLinks.push(route);
    else oplossingLinks.push(route);
  }

  return {
    oplossingLinks: oplossingLinks.sort(),
    kennisLinks: kennisLinks.sort(),
    afgevallen,
  };
}

type VersieRij = {
  id: number;
  pad: string;
  titel: string;
  meta_omschrijving: string;
  canonieke_url: string;
  body_markdown: string;
  soort: string;
  status: string;
  inhoud_afdruk: string | null;
  direct_antwoord: string | null;
  kandidaat_id: number | null;
  goedgekeurd_op: string | null;
  goedkeurder_naam: string | null;
  /** Berekend door bouwConcept(), getoetst door poort 11. */
  interne_links: string[] | null;
};

/**
 * Publiceert via het routeregister van Release 1.
 *
 * Alleen onder data/inhoud/nieuws/. Een voorstel voor een BESTAANDE
 * pagina van Release 1 wordt geweigerd: dat bestand heeft al een
 * schrijver, en dit platform gaat daar niet in staan. Het voorstel
 * blijft in de database en in het dashboard.
 */
async function publiceerViaRegister(
  c: pg.PoolClient,
  organisatieId: number,
  v: VersieRij,
  config: { siteWortel: string },
  opties: { droog?: boolean },
  weiger: (id: number, reden: string) => PublicatieRapport,
): Promise<PublicatieRapport> {
  if (!isNieuwsPad(v.pad)) {
    return weiger(
      v.id,
      `pad '${v.pad}' valt buiten data/inhoud/nieuws/. Release 1 bezit dat inhoudsbestand en ` +
        "SCHEMA.md eist één schrijver per bestand; dit platform overschrijft het niet. " +
        `Het voorstel (${v.soort}) blijft in de database en is zichtbaar in het dashboard, ` +
        "zodat een redacteur het kan overbrengen.",
    );
  }

  const register = await leesRouteregister(config.siteWortel);

  // De onderwerp-eigenaar: de nationale pagina die de zoekintentie bezit.
  // Komt uit het cluster van de kandidaat, via dezelfde kaart die de
  // besluitmotor gebruikt. Nooit geraden op woordovereenkomst.
  let onderwerpEigenaar: string | null = null;
  if (v.kandidaat_id !== null) {
    const cluster = await eenRij<{ sleutel: string }>(
      c,
      `select oc.sleutel
         from intel.inhoud_kandidaten k
         join intel.onderwerp_clusters oc on oc.id = k.onderwerp_cluster_id
        where k.organisatie_id = $1 and k.id = $2`,
      [organisatieId, v.kandidaat_id],
    );
    if (cluster) onderwerpEigenaar = routeVoorCluster(cluster.sleutel, register)?.route ?? null;
  }
  if (onderwerpEigenaar === null) {
    return weiger(
      v.id,
      "geen onderwerp-eigenaar te bepalen. Het contract eist dat een nieuwsartikel zijn " +
        "commerciële intentie leent van een bestaande nationale pagina; zonder die eigenaar " +
        "zou het bericht die intentie zelf claimen en de bestaande pagina beconcurreren.",
    );
  }

  // De bronnen en claims, uit de uitspraken die aan deze versie gebonden
  // zijn. Alleen de PRIMAIRE bron per uitspraak: dat is de vindplaats,
  // niet een artikel dat erover schrijft.
  const gebonden = await rijen<{
    uitspraak_id: number;
    tekst: string;
    soort: string;
    url: string;
    uitgever: string;
    doc_titel: string;
    bron_datum: string | null;
    bron_sleutel: string;
    documentsoort: string | null;
    verificatie_status: string;
    modaliteit: string | null;
    modaliteit_zekerheid: string | null;
  }>(
    c,
    `select u.id as uitspraak_id, u.tekst, u.soort,
            bd.canonieke_url as url, bd.uitgever, bd.titel as doc_titel,
            coalesce(bd.gepubliceerd_op, bv.opgehaald_op)::date::text as bron_datum,
            b.sleutel as bron_sleutel,
            /* R3 — de soort van het DOCUMENT, de modaliteit van de CLAIM.
               Zonder deze vier velden kan dit bestand de bronsoort niet
               verlagen en de claimregels niet filteren. */
            bv.documentsoort, u.verificatie_status, u.modaliteit,
            u.modaliteit_zekerheid::text as modaliteit_zekerheid
       from intel.inhoud_uitspraken iu
       join intel.uitspraken u          on u.id = iu.uitspraak_id
       join intel.uitspraak_bronnen ub  on ub.uitspraak_id = u.id and ub.rol = 'primair'
       join intel.brondocument_versies bv on bv.id = ub.versie_id
       join intel.brondocumenten bd     on bd.id = bv.brondocument_id
       join intel.bronnen b             on b.id = bd.bron_id
      where iu.organisatie_id = $1 and iu.inhoud_versie_id = $2
      order by u.id`,
    [organisatieId, v.id],
  );

  /* De uitgeverssoort staat in het bronregister in code, niet in de
     database: intel.bronnen draagt alleen de uitgevernaam. Onbekende
     sleutel valt terug op MARKTPARTIJ en kan een bericht dus niet
     alleen dragen — de veilige kant.

     R3 — EN DE DOCUMENTSOORT KAN HEM VERLAGEN.
     ------------------------------------------------------------------
     Dit was het defect dat R3 repareert, herhaald op de plek waar het
     het meest kost. De `soort` die hier in het registerrecord belandt is
     exact wat `weigerNieuws()` in scripts/seo/bouw-routes.mjs leest om
     te beslissen of er een DRAGENDE bron onder een bericht zit. Hij kwam
     uitsluitend uit de uitgeverscategorie.

     Gevolg: een ACM-document is `toezichthouder` en dus TOEZICHTHOUDER —
     dragend — ook als dat specifieke document een opiniestuk is of een
     besluit van een ánder gezag navertelt. De publicatiepoort zou dan
     een dragende bron zien waar er geen is.

     Een document dat zelf niets vaststelt verlaagt daarom naar
     MARKTPARTIJ. Dat is niet een tweede regel bovenop de eerste: het is
     dezelfde regel die de claimlaag al gebruikt (NIET_DRAGENDE_
     DOCUMENTSOORTEN), nu ook toegepast op het artefact dat gepubliceerd
     wordt.

     NULL VERLAAGT OOK. Een ongeclassificeerd document is niet
     aantoonbaar dragend, en op deze naad is dat genoeg om het niet te
     zijn. */
  const bronnenOpUrl = new Map<string, RegisterBron>();
  const verlaagdeBronnen: string[] = [];
  for (const g of gebonden) {
    if (bronnenOpUrl.has(g.url)) continue;
    const uitgeverSoort = bronOpSleutel(g.bron_sleutel)?.uitgeverSoort ?? "";
    const uitUitgever = BRONSOORT_UIT_UITGEVER[uitgeverSoort] ?? "MARKTPARTIJ";
    const soort = bronsoortVoorRecord(uitgeverSoort, g.documentsoort);
    if (soort !== uitUitgever) {
      verlaagdeBronnen.push(
        `${g.doc_titel}: ${uitUitgever} -> MARKTPARTIJ wegens documentsoort ` +
          `${g.documentsoort ?? "(niet geclassificeerd)"}`,
      );
    }
    bronnenOpUrl.set(g.url, {
      naam: `${g.doc_titel}, ${g.uitgever}`,
      url: g.url,
      datum: g.bron_datum ?? "",
      soort,
    });
  }
  const bronnen = [...bronnenOpUrl.values()];
  if (verlaagdeBronnen.length > 0) {
    log.info("bronsoort verlaagd op documentsoort", { verlaagd: verlaagdeBronnen });
  }

  /* Alleen een uitspraak met een getal is een claim in de zin van het
     contract; een feit zonder cijfer hoeft geen claimregel.

     R3 — EN ALLEEN EEN CLAIM DIE DRAAGT.
     Een claim die niet bevestigd is, die een voorstel of verwachting
     uitdrukt, of die uit een navertelling of lobbydocument komt, hoort
     niet als claimregel in een gepubliceerd record. Hij zou daar staan
     als een vastgelegd feit met een bronverwijzing eronder, en dat is
     precies de bewering die R3 niet meer wil doen. Zie claimDraagt(). */
  const nietDragendeClaims: string[] = [];
  const claims: RegisterClaim[] = gebonden
    .filter((g) => ["cijfer", "prijs", "specificatie", "datum"].includes(g.soort))
    .filter((g) => {
      const draagt = claimDraagt({
        verificatieStatus: g.verificatie_status,
        modaliteit: g.modaliteit,
        modaliteitZekerheid: g.modaliteit_zekerheid === null ? null : Number(g.modaliteit_zekerheid),
        documentsoort: g.documentsoort,
      });
      if (!draagt) {
        nietDragendeClaims.push(
          `uitspraak ${g.uitspraak_id}: ${waaromNietDragend({
            verificatieStatus: g.verificatie_status,
            modaliteit: g.modaliteit,
            modaliteitZekerheid:
              g.modaliteit_zekerheid === null ? null : Number(g.modaliteit_zekerheid),
            documentsoort: g.documentsoort,
          })}`,
        );
      }
      return draagt;
    })
    .map((g) => ({
      tekst: g.tekst,
      bron: `${g.doc_titel}, ${g.uitgever}`,
      bron_url: g.url,
      bron_datum: g.bron_datum ?? "",
    }));
  if (nietDragendeClaims.length > 0) {
    /* ZICHTBAAR WEGLATEN. Een claim die hier uitvalt verdwijnt uit het
       gepubliceerde record, en dat mag niet stil: de redactie moet
       kunnen nagaan waarom een cijfer dat zij in het concept zag niet
       in het record staat. */
    log.waarschuwing("claimregels weggelaten omdat ze niet dragen", {
      aantal: nietDragendeClaims.length,
      redenen: nietDragendeClaims,
    });
  }

  /* De interne links, nu wél. De routestaten komen uit hetzelfde
     bestand dat weigerNieuws() straks leest (data/seo/routes.json), dus
     wat hier door de filter komt haalt daar dezelfde eis. */
  const staten = await leesRouteStaten(config.siteWortel);
  const staatVanRoute = new Map(staten.routes.map((r) => [r.route, r.staat]));
  const links = splitsInterneLinks(v.interne_links ?? [], staatVanRoute, onderwerpEigenaar);
  if (links.afgevallen.length > 0) {
    log.waarschuwing("interne links afgevallen omdat ze niet op INDEX staan", {
      versie: v.id,
      afgevallen: links.afgevallen,
    });
  }
  if (!staten.aanwezig) {
    /* Zonder routestaten is niet vast te stellen of een link op INDEX
       staat. Dan liever geen link dan een link die het artikel op
       PENDING zet — maar het moet wel zichtbaar zijn. */
    log.waarschuwing("geen routestaten; interne links worden overgeslagen", {
      versie: v.id,
      reden: staten.reden,
    });
  }

  const vandaag = new Date().toISOString().slice(0, 10);
  const record = bouwNieuwsRecord({
    pad: v.pad,
    titel: v.titel,
    metaOmschrijving: v.meta_omschrijving ?? "",
    h1: h1Uit(v.titel),
    lead: leadUit(v.body_markdown, v.meta_omschrijving ?? v.titel),
    bodyMarkdown: v.body_markdown,
    gepubliceerd: vandaag,
    gewijzigd: vandaag,
    status: v.status,
    goedgekeurdDoor: v.goedkeurder_naam,
    goedgekeurdOp: v.goedgekeurd_op,
    onderwerpEigenaar,
    oplossingLinks: staten.aanwezig ? links.oplossingLinks : [],
    kennisLinks: staten.aanwezig ? links.kennisLinks : [],
    // Blijft leeg, en waarom staat in de toelichting bij splitsInterneLinks().
    regioLinks: [],
    bronnen,
    claims,
    // "Wat is er veranderd?" is een vaste, deterministische sectielabel —
    // geen verzonnen vraag en geen bewering. Het directe antwoord zelf
    // komt letterlijk uit de inhoudsversie.
    directAntwoord: v.direct_antwoord
      ? { vraag: "Wat is er veranderd?", antwoord: v.direct_antwoord }
      : null,
    herkomst: {
      inhoudVersieId: v.id,
      inhoudAfdruk: v.inhoud_afdruk,
      besluitSoort: v.soort,
    },
  });

  const uit = await schrijfNieuwsRecord(config.siteWortel, record, { droog: opties.droog });

  if (opties.droog) {
    return {
      inhoudVersieId: v.id,
      bestandspad: uit.bestandspad,
      geschreven: false,
      sitemapBijgewerkt: false,
      publicatieId: null,
      reden:
        `DROOG: zou ${uit.bestondAl ? "overschrijven" : "aanmaken"} (${uit.inhoud.length} bytes). ` +
        `Redactionele staat wordt ${String(record["redactionele_staat"])}; de sitemap blijft van ` +
        "de generator van Release 1.",
    };
  }

  const publicatie = await eenRij<{ id: number }>(
    c,
    `insert into intel.publicaties
       (organisatie_id, inhoud_versie_id, bestandspad, bestand_hash,
        vorige_bestand_hash, vorige_inhoud, sitemap_bijgewerkt, status)
     values ($1,$2,$3,$4,$5,$6,false,'geschreven')
     returning id`,
    [
      organisatieId,
      v.id,
      uit.bestandspad,
      sha256hex(uit.inhoud),
      uit.vorigeInhoud === null ? null : sha256hex(uit.vorigeInhoud),
      uit.vorigeInhoud,
    ],
  );

  await c.query("update intel.inhoud_versies set status = 'gepubliceerd' where id = $1", [v.id]);

  // in_sitemap blijft FALSE: de route staat pas in sitemap.xml nadat de
  // generator van Release 1 heeft gedraaid én de toestandsmachine de
  // route op INDEX heeft gezet. Hier waarheid vastleggen, geen wens.
  await c.query(
    `insert into intel.pagina_register
       (organisatie_id, pad, canonieke_url, bestandspad, titel, soort,
        in_sitemap, bestaat_in_repo, eigenaar_release, beheer, laatst_gepubliceerd_op)
     values ($1,$2,$3,$4,$5,'nieuws',false,true,'release2','intelligence',now())
     on conflict (organisatie_id, pad) do update set
       canonieke_url          = excluded.canonieke_url,
       bestandspad            = excluded.bestandspad,
       titel                  = excluded.titel,
       bestaat_in_repo        = true,
       laatst_gepubliceerd_op = now()`,
    [organisatieId, v.pad, v.canonieke_url, uit.bestandspad, v.titel],
  );

  await c.query(
    `insert into intel.publicatiebesluiten
       (organisatie_id, inhoud_versie_id, besluit, actor_soort, motivatie)
     values ($1, $2, 'gepubliceerd', 'systeem', $3)`,
    [
      organisatieId,
      v.id,
      `registerrecord ${uit.bestandspad} (${uit.inhoud.length} bytes), redactionele staat ` +
        `${String(record["redactionele_staat"])}, eigenaar ${onderwerpEigenaar}, ` +
        `${bronnen.length} bron(nen)`,
    ],
  );

  log.info("registerrecord gepubliceerd", {
    versie: v.id,
    bestand: uit.bestandspad,
    staat: record["redactionele_staat"],
    eigenaar: onderwerpEigenaar,
  });

  return {
    inhoudVersieId: v.id,
    bestandspad: uit.bestandspad,
    geschreven: true,
    sitemapBijgewerkt: false,
    publicatieId: publicatie?.id ?? null,
    reden:
      `registerrecord geschreven (${uit.inhoud.length} bytes), redactionele staat ` +
      `${String(record["redactionele_staat"])}. De pagina en de sitemapregel maakt de generator ` +
      "van Release 1; die run en de commit zijn menselijke handelingen.",
  };
}

export type TerugdraaiRapport = {
  readonly publicatieId: number;
  readonly bestandspad: string;
  readonly teruggezet: "vorige_inhoud" | "verwijderd_uit_sitemap" | "niets";
  readonly reden: string;
};

/**
 * Draait een publicatie terug. Bestond het bestand niet vóór de
 * publicatie, dan wordt het leeggemaakt met een noindex-stub in plaats
 * van verwijderd: een 404 op een URL die in een index kan staan is
 * slechter dan een pagina die zegt dat hij er niet meer is.
 */
export async function draaiTerug(
  pool: Pool,
  organisatieId: number,
  publicatieId: number,
): Promise<TerugdraaiRapport> {
  const config = configLezen();

  return metOrganisatie(pool, { organisatieId }, async (c) => {
    const p = await eenRij<{
      id: number;
      bestandspad: string;
      vorige_inhoud: string | null;
      sitemap_bijgewerkt: boolean;
      inhoud_versie_id: number;
      canonieke_url: string;
      status: string;
    }>(
      c,
      `select p.id, p.bestandspad, p.vorige_inhoud, p.sitemap_bijgewerkt,
              p.inhoud_versie_id, v.canonieke_url, p.status
         from intel.publicaties p
         join intel.inhoud_versies v on v.id = p.inhoud_versie_id
        where p.organisatie_id = $1 and p.id = $2`,
      [organisatieId, publicatieId],
    );
    if (!p) throw new IntelFout("configuratie", `publicatie ${publicatieId} bestaat niet`);
    if (p.status !== "geschreven") {
      return {
        publicatieId: p.id,
        bestandspad: p.bestandspad,
        teruggezet: "niets",
        reden: `status is '${p.status}'; alleen een geschreven publicatie is terug te draaien`,
      };
    }

    const volledigPad = join(config.siteWortel, p.bestandspad);
    let teruggezet: TerugdraaiRapport["teruggezet"] = "niets";

    // Een registerrecord is geen pagina. Terugdraaien betekent hier: het
    // record herstellen of verwijderen. Een noindex-stub zou onzin zijn —
    // het bestand is JSON en staat onder data/, dat niet gecrawld wordt.
    // De pagina zelf verdwijnt bij de volgende generatorrun, die met
    // data/seo/gegenereerd.json opruimt wat niet langer INDEX is.
    if (p.bestandspad.endsWith(".json")) {
      const uit = await draaiNieuwsRecordTerug(
        config.siteWortel,
        p.bestandspad,
        p.vorige_inhoud,
      );
      teruggezet = uit.hersteld ? "vorige_inhoud" : uit.verwijderd ? "verwijderd_uit_sitemap" : "niets";

      await c.query("update intel.publicaties set status = 'teruggedraaid' where id = $1", [p.id]);
      await c.query("update intel.inhoud_versies set status = 'teruggedraaid' where id = $1", [
        p.inhoud_versie_id,
      ]);
      await c.query(
        `update intel.pagina_register
            set bestaat_in_repo = $3, in_sitemap = false
          where organisatie_id = $1 and bestandspad = $2`,
        [organisatieId, p.bestandspad, uit.hersteld],
      );
      await c.query(
        `insert into intel.publicatiebesluiten
           (organisatie_id, inhoud_versie_id, besluit, actor_soort, motivatie)
         values ($1, $2, 'teruggedraaid', 'systeem', $3)`,
        [
          organisatieId,
          p.inhoud_versie_id,
          `registerrecord ${uit.hersteld ? "hersteld naar de vorige versie" : uit.verwijderd ? "verwijderd" : "ongemoeid"}; ` +
            "de pagina verdwijnt bij de volgende generatorrun van Release 1",
        ],
      );

      log.info("registerrecord teruggedraaid", { publicatie: p.id, bestand: p.bestandspad, teruggezet });

      return {
        publicatieId: p.id,
        bestandspad: p.bestandspad,
        teruggezet,
        reden:
          `registerrecord ${uit.hersteld ? "hersteld" : uit.verwijderd ? "verwijderd" : "ongemoeid gelaten"}. ` +
          "De gepubliceerde pagina verdwijnt pas nadat de generator van Release 1 opnieuw heeft gedraaid.",
      };
    }

    if (p.vorige_inhoud !== null) {
      await writeFile(volledigPad, p.vorige_inhoud, "utf8");
      teruggezet = "vorige_inhoud";
    } else {
      // Het bestand bestond nog niet. Het wordt verwijderd door het te
      // overschrijven met een noindex-stub in dezelfde vorm die deze
      // site daar al voor gebruikt (zestien bestaande stubs).
      const stub = [
        "<!doctype html>",
        '<html lang="nl">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="robots" content="noindex, follow">',
        `<link rel="canonical" href="${esc(config.siteBasisUrl)}/">`,
        '<meta http-equiv="refresh" content="0;url=/">',
        "<title>Teruggedraaid — Vibe Energy</title>",
        "</head>",
        "<body><script>location.replace('/')</script></body>",
        "</html>",
        "",
      ].join("\n");
      await writeFile(volledigPad, stub, "utf8");
      teruggezet = "verwijderd_uit_sitemap";
    }

    if (p.sitemap_bijgewerkt) {
      const sitemapPad = join(config.siteWortel, "sitemap.xml");
      if (existsSync(sitemapPad)) {
        const voor = await readFile(sitemapPad, "utf8");
        const na = sitemapZonderPad(voor, p.canonieke_url);
        if (na.gewijzigd) await writeFile(sitemapPad, na.xml, "utf8");
      }
    }

    await c.query("update intel.publicaties set status = 'teruggedraaid' where id = $1", [p.id]);
    await c.query("update intel.inhoud_versies set status = 'teruggedraaid' where id = $1", [
      p.inhoud_versie_id,
    ]);
    await c.query(
      `insert into intel.publicatiebesluiten
         (organisatie_id, inhoud_versie_id, besluit, actor_soort, motivatie)
       values ($1, $2, 'teruggedraaid', 'systeem', $3)`,
      [organisatieId, p.inhoud_versie_id, `terugdraaien via ${teruggezet}`],
    );

    log.info("teruggedraaid", { publicatie: p.id, bestand: p.bestandspad, teruggezet });

    return {
      publicatieId: p.id,
      bestandspad: p.bestandspad,
      teruggezet,
      reden: `teruggedraaid via ${teruggezet}`,
    };
  });
}

/**
 * Zet een versie op goedgekeurd.
 *
 * DE KOPREGEL HIER LUIDDE: "Vier ogen worden door de database
 * afgedwongen." Dat was een valse verzekering, en wel om twee gemeten
 * redenen.
 *
 * 1 GEEN RECHTENCONTROLE. Deze functie nam elke `gebruikerId` aan die
 *   hij kreeg. Gemeten: `grep -c 'rol_rechten\|RECHT_'` over
 *   inhoud/publiceer.ts, cli/publiceer.ts en publicatie/pr.ts geeft
 *   0, 0 en 0. `npm run publiceer -- --versie N --goedkeuren <id>` was
 *   dus een volledige publicatieketen voor iedereen met de CLI en
 *   INTEL_DB_URL — ongeacht of dat id een bevoegde, bestaande,
 *   actieve gebruiker was.
 *
 *   Dat is precies het defect dat inhoud/beoordeling.ts regel 105-122
 *   al eens heeft opgelost, voor de ANDERE goedkeurlaan. Daar staat
 *   de les letterlijk: "Elke andere aanroeper van beoordeel() — een
 *   CLI, een taak, een volgende route — had geen enkele
 *   rechtencontrole." Die laan toetst sindsdien zelf. Deze laan deed
 *   dat nooit, en het is juist DEZE die tot een bestand op schijf en
 *   een pull request leidt; de bewaakte laan publiceert niets.
 *
 * 2 DE VIER-OGENCONSTRAINT WERKT LEEG. Hij luidt
 *   `goedgekeurd_door is null or (goedgekeurd_door is distinct from
 *   aangemaakt_door and goedgekeurd_door is distinct from
 *   bewerkt_door)`. Beide kolommen bestaan (0004 regel 200, 0009 regel
 *   206) maar worden in heel src/ nergens geschreven — gemeten: 7
 *   rijen in intel.inhoud_versies, 0 met aangemaakt_door, 0 met
 *   bewerkt_door. En `x is distinct from null` is TRUE voor elke x,
 *   dus de constraint slaagt voor iedere rij zonder iets te toetsen.
 *
 *   Zolang alleen een AI concepten maakt is dat verdedigbaar: er is
 *   geen menselijke auteur, dus geen zelfgoedkeuring. Maar zodra een
 *   redacteur een concept KAN AANPASSEN — en dat is wat het
 *   redactionele dashboard moet kunnen — wordt zelfgoedkeuring
 *   mogelijk en vangt deze constraint hem niet. Daarom schrijft de
 *   bewerkroute nu `bewerkt_door` (zie `bewerkVersie`), en toetst deze
 *   functie het expliciet in plaats van op de database te vertrouwen.
 *
 * WAT DIT NIET VERANDERT. De append-only regel in
 * intel.publicatiebesluiten stond er al en blijft; dit voegt de
 * bevoegdheidstoets en de echte vier-ogentoets ervoor toe.
 *
 * 3 EN TOEN TOETSTE HIJ GEEN ENKEL UITSPRAAKVELD. Toegevoegd na de
 *   acceptatieaudit: deze functie wist alles over de GOEDKEURDER en
 *   niets over het BEWIJS. Ze keek niet of de claims onder het concept
 *   nog droegen, en niet of de afdruk waaraan ze bond bij de
 *   opgeslagen tekst hoorde. Beide worden nu nagerekend, met een slot
 *   op de uitspraakrijen tegen de race met een herbeoordeling.
 *
 * DAAROM GEEFT HIJ NU EEN UITSLAG TERUG IN PLAATS VAN VOID. Een
 * onbevoegde goedkeurder is een uitzondering en blijft een exceptie.
 * Bewijs dat niet meer draagt is een NORMALE uitkomst van het
 * redactionele proces, en bovendien een die auditeerbaar moet worden
 * vastgelegd — en dat kan niet met een exceptie, want die rolt de
 * auditregel mee terug. De aanroeper moet de uitslag dus lezen.
 */
export async function keurGoed(
  c: pg.PoolClient,
  inhoudVersieId: number,
  gebruikerId: number,
  motivatie: string,
): Promise<GoedkeurUitslag> {
  const v = await eenRij<{
    inhoud_afdruk: string | null;
    organisatie_id: number;
    risico_klasse: string | null;
    aangemaakt_door: number | null;
    bewerkt_door: number | null;
    status: string;
    titel: string;
    direct_antwoord: string | null;
    body_markdown: string;
    structured_data: unknown;
  }>(
    c,
    `select inhoud_afdruk, organisatie_id, risico_klasse,
            aangemaakt_door, bewerkt_door, status,
            titel, direct_antwoord, body_markdown, structured_data
       from intel.inhoud_versies where id = $1`,
    [inhoudVersieId],
  );
  if (!v) throw new IntelFout("configuratie", `inhoudsversie ${inhoudVersieId} bestaat niet`);

  /* ---- de goedkeurder moet bestaan en actief zijn ----
     Een verwijderde of geschorste rekening mag niets vrijgeven. De
     database kent de kolom, dus dit is een vraag en geen aanname. */
  const gebruiker = await eenRij<{ email: string; actief: boolean }>(
    c,
    "select email, actief from intel.gebruikers where id = $1 and organisatie_id = $2",
    [gebruikerId, v.organisatie_id],
  );
  if (!gebruiker) {
    throw new IntelFout(
      "autorisatie",
      `gebruiker ${gebruikerId} bestaat niet in organisatie ${v.organisatie_id}; ` +
        "een goedkeuring zonder herleidbare identiteit is geen goedkeuring",
    );
  }
  if (!gebruiker.actief) {
    throw new IntelFout(
      "autorisatie",
      `gebruiker ${gebruiker.email} is niet actief en mag niets vrijgeven`,
    );
  }

  /* ---- en hij moet het recht hebben ----
     Dezelfde functie en dezelfde rechtnamen als beoordeel(), zodat er
     één waarheid is over wie mag goedkeuren. */
  const { rechtenVan, RECHT_BEOORDELEN, RECHT_HOOGRISICO } = await import("./beoordeling.ts");
  const rechten = await rechtenVan(c, gebruikerId);
  if (!rechten.has(RECHT_BEOORDELEN)) {
    throw new IntelFout(
      "autorisatie",
      `${gebruiker.email} mag inhoudsversie ${inhoudVersieId} niet goedkeuren: ` +
        `het recht ${RECHT_BEOORDELEN} ontbreekt`,
    );
  }
  if (v.risico_klasse === "hoog" && !rechten.has(RECHT_HOOGRISICO)) {
    throw new IntelFout(
      "autorisatie",
      `risicoklasse hoog vraagt het recht ${RECHT_HOOGRISICO} en ${gebruiker.email} heeft dat niet`,
    );
  }

  /* ---- vier ogen, hier getoetst en niet aan de database overgelaten ----
     De constraint blijft staan als tweede slot, maar hij kan niets
     zeggen zolang de kolommen leeg zijn. Deze toets werkt ook als ze
     leeg zijn: is er geen menselijke auteur of bewerker, dan is er ook
     geen zelfgoedkeuring en gaat hij door. */
  if (v.aangemaakt_door !== null && v.aangemaakt_door === gebruikerId) {
    throw new IntelFout(
      "autorisatie",
      `${gebruiker.email} heeft deze versie zelf aangemaakt en mag hem niet goedkeuren (vier ogen)`,
    );
  }
  if (v.bewerkt_door !== null && v.bewerkt_door === gebruikerId) {
    throw new IntelFout(
      "autorisatie",
      `${gebruiker.email} heeft deze versie als laatste bewerkt en mag hem niet goedkeuren (vier ogen)`,
    );
  }

  /* ---- DE AFDRUK MOET BIJ DE TEKST HOREN ----
     Een goedkeuring bindt aan `inhoud_afdruk`, en publiceer() vergelijkt
     die later met `goedgekeurde_afdruk`. Die hele keten is waardeloos
     als de afdruk zelf niet bij de opgeslagen tekst past: dan bindt de
     goedkeuring aan een hash van iets anders. De hertoets herberekent
     hem bij elke bewerking, maar een rechtstreekse databasewijziging
     doet dat niet. Daarom hier narekenen in plaats van aannemen. */
  const nu = inhoudAfdruk({
    titel: v.titel,
    directAntwoord: v.direct_antwoord ?? "",
    bodyMarkdown: v.body_markdown,
    structuredData: v.structured_data,
  });
  if (v.inhoud_afdruk !== nu) {
    throw new IntelFout(
      "validatie",
      `de opgeslagen inhoudsafdruk (${v.inhoud_afdruk?.slice(0, 16) ?? "GEEN"}) hoort niet bij ` +
        `de huidige tekst (${nu.slice(0, 16)}); hertoets deze versie voordat je hem goedkeurt`,
    );
  }

  /* ---- EN HET BEWIJS MOET NU NOG DRAGEN ----
     De kern van deze correctie. Zie de sectiekop in
     pijplijn/claimpoort.ts: tussen de conceptbouw en dit moment zit
     menselijke tijd, en in dat venster kan een bevestiging zijn
     ingetrokken, een plafond zijn verlaagd of een bronbinding zijn
     veranderd. De toets neemt een gedeeld slot op de uitspraakrijen, en
     deze functie draait binnen de transactie van metOrganisatie(), dus
     het slot valt samen met de statuswijziging eronder.

     GEEN EXCEPTIE MAAR EEN UITSLAG, zodat de auditregel de commit
     haalt. Een `throw` zou hem meeslepen in de rollback. */
  const bewijs = await toetsGebondenBewijs(c, v.organisatie_id, inhoudVersieId);
  if (!bewijsDraagt(bewijs)) {
    await legBewijsblokkadeVast(c, v.organisatie_id, bewijs, "goedkeuring");
    return {
      goedgekeurd: false,
      reden:
        `de goedkeuring is geblokkeerd: het bewijs onder dit concept draagt niet meer ` +
        `(${bewijs.blokkades.length} reden(en))`,
      blokkades: bewijs.blokkades,
    };
  }

  await c.query(
    `update intel.inhoud_versies
        set status              = 'goedgekeurd',
            goedgekeurd_door    = $2,
            goedgekeurd_op      = now(),
            goedgekeurde_afdruk = inhoud_afdruk
      where id = $1`,
    [inhoudVersieId, gebruikerId],
  );
  await c.query(
    `insert into intel.publicatiebesluiten
       (organisatie_id, inhoud_versie_id, besluit, door_gebruiker_id, actor_soort, motivatie,
        poortresultaten)
     values ($1, $2, 'goedgekeurd', $3, 'mens', $4, $5)`,
    [
      v.organisatie_id,
      inhoudVersieId,
      gebruikerId,
      motivatie,
      /* WAAROP IS GOEDGEKEURD, niet alleen DAT er is goedgekeurd. De
         claimtoestand van dit moment hoort bij het besluit: zonder die
         vastlegging is later niet na te gaan welk bewijs de goedkeuring
         droeg. De tabel is append-only, dus dit is onwisbaar. */
      JSON.stringify({
        motorversies: bewijs.motorversies,
        dragendeKern: bewijs.dragendeKern,
        claims: bewijs.claims.map((k) => ({
          uitspraakId: k.uitspraakId,
          rol: k.rol,
          verificatieStatus: k.verificatieStatus,
          modaliteit: k.modaliteit,
          modaliteitZekerheid: k.modaliteitZekerheid,
          documentsoort: k.documentsoort,
          bewijsKwaliteit: k.bewijsKwaliteit,
          bewijskrachtPlafond: k.bewijskrachtPlafond,
          primaireVersieId: k.primaireVersieId,
          draagt: k.draagt,
        })),
      }),
    ],
  );
  return { goedgekeurd: true };
}
