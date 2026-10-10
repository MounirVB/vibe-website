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
import {
  heeftRouteregister,
  leesRouteregister,
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
    }>(
      c,
      `select v.id, v.pad, v.titel, v.meta_omschrijving, v.canonieke_url,
              v.body_markdown, v.structured_data, v.status, v.poorten_geslaagd,
              v.blokkades, v.soort, v.inhoud_afdruk, v.goedgekeurde_afdruk,
              v.direct_antwoord, v.kandidaat_id, v.goedgekeurd_door,
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
  }>(
    c,
    `select u.id as uitspraak_id, u.tekst, u.soort,
            bd.canonieke_url as url, bd.uitgever, bd.titel as doc_titel,
            coalesce(bd.gepubliceerd_op, bv.opgehaald_op)::date::text as bron_datum,
            b.sleutel as bron_sleutel
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

  // De uitgeverssoort staat in het bronregister in code, niet in de
  // database: intel.bronnen draagt alleen de uitgevernaam. Onbekende
  // sleutel valt terug op MARKTPARTIJ en kan een bericht dus niet
  // alleen dragen — de veilige kant.
  const bronnenOpUrl = new Map<string, RegisterBron>();
  for (const g of gebonden) {
    if (bronnenOpUrl.has(g.url)) continue;
    const uitgeverSoort = bronOpSleutel(g.bron_sleutel)?.uitgeverSoort ?? "";
    bronnenOpUrl.set(g.url, {
      naam: `${g.doc_titel}, ${g.uitgever}`,
      url: g.url,
      datum: g.bron_datum ?? "",
      soort: BRONSOORT_UIT_UITGEVER[uitgeverSoort] ?? "MARKTPARTIJ",
    });
  }
  const bronnen = [...bronnenOpUrl.values()];

  // Alleen een uitspraak met een getal is een claim in de zin van het
  // contract; een feit zonder cijfer hoeft geen claimregel.
  const claims: RegisterClaim[] = gebonden
    .filter((g) => ["cijfer", "prijs", "specificatie", "datum"].includes(g.soort))
    .map((g) => ({
      tekst: g.tekst,
      bron: `${g.doc_titel}, ${g.uitgever}`,
      bron_url: g.url,
      bron_datum: g.bron_datum ?? "",
    }));

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
    oplossingLinks: [],
    kennisLinks: [],
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

/** Zet een versie op goedgekeurd. Vier ogen worden door de database afgedwongen. */
export async function keurGoed(
  c: pg.PoolClient,
  inhoudVersieId: number,
  gebruikerId: number,
  motivatie: string,
): Promise<void> {
  const v = await eenRij<{ inhoud_afdruk: string | null; organisatie_id: number }>(
    c,
    "select inhoud_afdruk, organisatie_id from intel.inhoud_versies where id = $1",
    [inhoudVersieId],
  );
  if (!v) throw new IntelFout("configuratie", `inhoudsversie ${inhoudVersieId} bestaat niet`);

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
       (organisatie_id, inhoud_versie_id, besluit, door_gebruiker_id, actor_soort, motivatie)
     values ($1, $2, 'goedgekeurd', $3, 'mens', $4)`,
    [v.organisatie_id, inhoudVersieId, gebruikerId, motivatie],
  );
}
