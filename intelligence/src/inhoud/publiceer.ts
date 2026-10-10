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
import { eenRij, metOrganisatie, type Pool } from "../kern/db.ts";
import { IntelFout } from "../kern/fouten.ts";
import { maakLogger } from "../kern/log.ts";
import { sha256hex } from "../kern/tekst.ts";

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
    }>(
      c,
      `select v.id, v.pad, v.titel, v.meta_omschrijving, v.canonieke_url,
              v.body_markdown, v.structured_data, v.status, v.poorten_geslaagd,
              v.blokkades, v.soort, v.inhoud_afdruk, v.goedgekeurde_afdruk,
              pr.beheer as pagina_beheer
         from intel.inhoud_versies v
         left join intel.pagina_register pr
                on pr.organisatie_id = v.organisatie_id and pr.pad = v.pad
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
