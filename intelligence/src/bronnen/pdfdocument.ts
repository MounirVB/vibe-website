/* ============================================================
   BRONNEN — één PDF-besluit opnemen in de documentketen
   ------------------------------------------------------------
   DIT IS GEEN CRAWLER, EN DAT IS EEN EIGENSCHAP EN GEEN BELOFTE.

   `neemPdfOp()` neemt ÉÉN URL. Hij volgt geen links, leest geen
   sitemap, kent geen wachtrij en heeft geen enkele manier om een
   tweede document te vinden. "Geen algemene onbegrensde PDF-crawler
   bouwen" is daarmee niet een regel die iemand moet naleven maar een
   eigenschap van de code.

   ------------------------------------------------------------
   VIJF POORTEN VOORDAT ER ÉÉN BYTE WORDT OPGEHAALD

   1 DE BRON MOET GEREGISTREERD EN ACTIEF ZIJN. Er is geen pad waarlangs
     een losse URL wordt opgehaald zonder dat er een rij in
     intel.bronnen onder hangt; zonder die rij is er geen uitgever, geen
     betrouwbaarheid, geen gezag en dus geen bewijsketen.

   2 DE HOST MOET DIE VAN DE BRON ZIJN. Een document van een andere host
     dan de basis-URL van de bron is geen document VAN die bron, ook niet
     als het er inhoudelijk op lijkt.

   3 HET PAD MOET IN HET TOEGESTANE REGISTER STAAN. Per bron staat
     vastgelegd welke padprefixen documenten dragen. Dat is de grens
     tussen 'een besluit van de ACM' en 'een willekeurig bestand op
     acm.nl'.

   4 ROBOTS.TXT MOET HET PAD TOESTAAN. Dezelfde motor als de collector:
     urlToegestaan() uit robots.ts. Weigert robots, dan stopt het hier
     en wordt er niets opgehaald.

   5 HET TDM-VOORBEHOUD VAN DE BRON MOET LEEG ZIJN. bepaalToestemming()
     in toestemmingsbeleid.ts weegt bij de REGISTRATIE van een bron het
     expliciete verbod, de uitsluiting van AI-crawlers, de licentie en
     de hergebruikverklaring, en legt de uitkomst vast in
     intel.bronnen.tdm_status. Die vastgelegde uitkomst wordt hier
     gelezen en niet opnieuw berekend: één beslissing, op één plek, met
     haar bewijs ernaast in `verificatie_bewijs`.

     Een bron met 'voorbehoud' levert GEEN volledige tekst. Een PDF is
     per definitie volledige tekst — er is geen samenvattingsvariant —
     dus daar is het een weigering en geen beperking.

     DEZE POORT IS EEN TWEEDE BODEM EN NIET DE GRENDEL, en dat is
     gemeten op 6 november 2026. De database heeft al
     `bronnen_actief_vereist_toestemming`, die een ACTIEVE bron met een
     voorbehoud weigert. Er bestaat dus geen stand waarin deze poort
     wordt bereikt: een bron met een voorbehoud is inactief, en dan
     weigert poort 1b al. Hij blijft staan omdat een tweede bodem geen
     kwaad kan en omdat een toekomstige versiewissel van die constraint
     hier niet stil een gat mag openen — maar wie wil weten WAT
     beschermt, moet naar de constraint kijken.

   6 HET NETWERK MOET AANSTAAN. INTEL_NETWERK_TOEGESTAAN=0 is de
     schakelaar waarmee de toetsomgeving elk extern verzoek weigert.

   ------------------------------------------------------------
   DE VERSIES BLIJVEN STAAN

   Een document wordt per OPHAALMOMENT een versie, met de inhoudshash
   als identiteit. Komt dezelfde PDF ongewijzigd terug, dan is er geen
   nieuwe versie — `versies_hash_uniek` weigert hem ook. Is hij
   gewijzigd, dan komt er een versie bij en blijft de oude staan, met
   `vorige_versie_id` als keten. Dat is de eis "behoud documentversies",
   en het is dezelfde opslagvorm als voor elk ander document in dit
   platform.

   ------------------------------------------------------------
   DE INHOUD IS ONBETROUWBAAR EN BLIJFT DAT

   De tekst gaat door ontwapen() in pdf.ts en daarna door dezelfde
   injectieverdenking als elke andere brontekst. Er is geen tak waarin
   PDF-inhoud als instructie wordt behandeld: de tekst gaat naar
   `ruwe_tekst` en nergens anders heen.
   ============================================================ */

import type pg from "pg";
import { eenRij } from "../kern/db.ts";
import { bepaalWijziging, inhoudHash } from "../kern/tekst.ts";
import { maakLogger } from "../kern/log.ts";
import { urlToegestaan, onzeUserAgentToken } from "./robots.ts";
import { leesPdfTekst, PDF_VERSIE, type PdfWeigering, type PdfPagina } from "./pdf.ts";
import { onderzoekInjectie } from "../pijplijn/injectie.ts";

const log = maakLogger("pdfdocument");

/* ------------------------------------------------------------------
   HET REGISTER VAN TOEGESTANE PADDEN

   GESLOTEN EN PER BRON. Een lege lijst betekent: deze bron levert geen
   PDF-documenten. Dat is de veilige kant, en het is de reden dat er
   geen bron is die per ongeluk een hele site openzet.

   De ACM-prefix is GEMETEN: op 5 november 2026 gaf robots.txt van
   www.acm.nl toestemming voor /nl/publicaties en voor
   /system/files/documents/, en de besluitstukken staan onder dat tweede
   pad. Zie de robotsmeting in de koppeling van deze release.
   ------------------------------------------------------------------ */
export const TOEGESTANE_PDF_PADDEN: Readonly<Record<string, readonly string[]>> = {
  "acm-besluiten": ["/system/files/documents/", "/sites/default/files/"],
};

export type PdfOpnameWeigering =
  | "bron_onbekend"
  | "bron_inactief"
  | "host_niet_van_bron"
  | "pad_niet_toegestaan"
  | "robots_verbiedt"
  | "tdm_voorbehoud"
  | "netwerk_uit"
  | "http_fout"
  | `pdf_${PdfWeigering}`;

export type PdfOpnameRapport =
  | {
      readonly ok: true;
      readonly brondocumentId: number;
      readonly versieId: number;
      /** Was dit een nieuwe versie, of stond dezelfde inhoud er al? */
      readonly nieuweVersie: boolean;
      readonly tekstLengte: number;
      readonly aantalPaginas: number;
      readonly paginas: readonly PdfPagina[];
      readonly injectieVerdacht: boolean;
      readonly versie: string;
    }
  | {
      readonly ok: false;
      readonly weigering: PdfOpnameWeigering;
      readonly reden: string;
      readonly versie: string;
    };

function weiger(weigering: PdfOpnameWeigering, reden: string): PdfOpnameRapport {
  return { ok: false, weigering, reden, versie: PDF_VERSIE };
}

/** Staat het pad van deze URL in het register van deze bron? */
export function padIsToegestaan(bronSleutel: string, url: string): boolean {
  const toegestaan = TOEGESTANE_PDF_PADDEN[bronSleutel] ?? [];
  if (toegestaan.length === 0) return false;
  let pad: string;
  try {
    pad = new URL(url).pathname;
  } catch {
    return false;
  }
  return toegestaan.some((p) => pad.startsWith(p));
}

/**
 * Neemt één PDF-document op als brondocumentversie.
 *
 * DE ORDE: eerst de vijf poorten, dan het netwerk, dan de parser, dan
 * de opslag. Elke poort die kan weigeren, staat vóór het eerste werk
 * dat hij zou verspillen.
 */
export async function neemPdfOp(
  c: pg.PoolClient,
  organisatieId: number,
  invoer: { url: string; bronSleutel: string; titel?: string },
): Promise<PdfOpnameRapport> {
  /* ---------- POORT 1 EN 2: DE BRON ---------- */
  const bron = await eenRij<{
    id: number;
    uitgever: string;
    basis_url: string;
    actief: boolean;
    tdm_status: string;
    verificatie_bewijs: string | null;
  }>(
    c,
    `select id, uitgever, basis_url, actief, tdm_status, verificatie_bewijs
       from intel.bronnen
      where organisatie_id = $1 and sleutel = $2`,
    [organisatieId, invoer.bronSleutel],
  );
  if (!bron) {
    return weiger(
      "bron_onbekend",
      `bron '${invoer.bronSleutel}' staat niet in intel.bronnen. Zonder bronrij is er geen ` +
        `uitgever, geen betrouwbaarheid en geen gezag, en dus geen bewijsketen.`,
    );
  }
  if (!bron.actief) {
    return weiger("bron_inactief", `bron '${invoer.bronSleutel}' staat op inactief`);
  }

  let host: string;
  let bronHost: string;
  try {
    host = new URL(invoer.url).host;
    bronHost = new URL(bron.basis_url).host;
  } catch {
    return weiger("host_niet_van_bron", `'${invoer.url}' is geen geldige URL`);
  }
  if (host !== bronHost) {
    return weiger(
      "host_niet_van_bron",
      `host '${host}' is niet de host van bron '${invoer.bronSleutel}' (${bronHost}). Een ` +
        `document van een andere host is geen document van deze bron.`,
    );
  }

  /* ---------- POORT 3: HET PAD ---------- */
  if (!padIsToegestaan(invoer.bronSleutel, invoer.url)) {
    return weiger(
      "pad_niet_toegestaan",
      `het pad van '${invoer.url}' staat niet in TOEGESTANE_PDF_PADDEN voor ` +
        `'${invoer.bronSleutel}'. Toegestaan: ` +
        `${(TOEGESTANE_PDF_PADDEN[invoer.bronSleutel] ?? []).join(", ") || "geen enkel pad"}.`,
    );
  }

  /* ---------- POORT 4: ROBOTS ---------- */
  const robots = await urlToegestaan(invoer.url);
  if (!robots.toegestaan) {
    return weiger(
      "robots_verbiedt",
      `robots.txt van ${host} staat dit pad niet toe: ${robots.reden}. Er wordt niets opgehaald.`,
    );
  }

  /* ---------- POORT 5: HET TDM-VOORBEHOUD ---------- */
  if (bron.tdm_status === "voorbehoud") {
    return weiger(
      "tdm_voorbehoud",
      `bron '${invoer.bronSleutel}' staat op tdm_status 'voorbehoud'. De vastgelegde grond: ` +
        `${(bron.verificatie_bewijs ?? "geen bewijs vastgelegd").slice(0, 200)}. Een PDF is ` +
        `volledige tekst en daar is een voorbehoud een weigering, geen beperking.`,
    );
  }

  /* ---------- POORT 6: HET NETWERK ---------- */
  if (process.env["INTEL_NETWERK_TOEGESTAAN"] === "0") {
    return weiger(
      "netwerk_uit",
      "INTEL_NETWERK_TOEGESTAAN=0: er wordt in deze omgeving niets opgehaald",
    );
  }

  let bytes: Buffer;
  let contentType: string | null;
  try {
    const r = await fetch(invoer.url, {
      headers: { "user-agent": onzeUserAgentToken() },
      redirect: "follow",
    });
    if (!r.ok) {
      return weiger("http_fout", `HTTP ${r.status} bij het ophalen van het document`);
    }
    contentType = r.headers.get("content-type");
    bytes = Buffer.from(await r.arrayBuffer());
  } catch (e) {
    return weiger(
      "http_fout",
      `ophalen mislukt: ${e instanceof Error ? e.message.slice(0, 160) : "onbekend"}`,
    );
  }

  /* ---------- DE PARSER ---------- */
  const gelezen = leesPdfTekst(bytes, {
    url: invoer.url,
    contentType,
    bronSleutel: invoer.bronSleutel,
  });
  if (!gelezen.ok) {
    return weiger(`pdf_${gelezen.weigering}`, gelezen.reden);
  }

  /* ---------- DE INJECTIEVERDENKING ----------
     Dezelfde motor als voor elke andere brontekst. Een PDF uit een
     vreemde hand krijgt geen vrijstelling omdat hij van een
     toezichthouder komt. */
  const injectie = onderzoekInjectie(invoer.titel ?? "", gelezen.tekst);

  /* ---------- DE OPSLAG ----------
     DE TITEL KOMT UIT DE AANROEPER OF UIT DE EERSTE REGEL, en wordt
     NIET uit de PDF-metadata gehaald: /Title is door de maker vrij in
     te vullen en is daarmee een bewering van de bron over zichzelf.
     De eerste leesbare regel staat wél in het document. */
  const eersteRegel =
    gelezen.paginas
      .find((p) => p.tekst.length > 0)
      ?.tekst.split("\n")
      .map((r) => r.trim())
      .find((r) => r.length >= 12 && r.length <= 200) ?? null;
  const titel = (invoer.titel ?? eersteRegel ?? invoer.url).slice(0, 400);

  const doc = await eenRij<{ id: number }>(
    c,
    `insert into intel.brondocumenten
       (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
        eerst_opgehaald_op, laatst_opgehaald_op, url_is_identiteit, datum_herkomst)
     values ($1,$2,$3,$4,$5,$6,'dataset', now(), now(), true, 'onbekend')
     /* TWEE GEMETEN CORRECTIES OP MIJN EERSTE VERSIE, beide betrapt
        door de eigen integratietoets:

        1 DE UNIEKE SLEUTEL IS (bron_id, extern_id). Met de organisatie
          erbij gaf Postgres "there is no unique or exclusion
          constraint matching the ON CONFLICT specification". De
          organisatie zit al in bron_id; zie
          brondocumenten_extern_uniek in 0002_bronnen.sql.

        2 datum_herkomst MOET uit een gesloten lijst komen: feed,
          sitemap_lastmod, news_sitemap, item_metadata, pagina_inhoud,
          onbekend (0009). Ik schreef 'ontbreekt', en dat bestaat niet.
          'onbekend' is hier ook het EERLIJKE antwoord: deze module
          leest geen publicatiedatum uit de PDF, dus gepubliceerd_op
          blijft NULL en de herkomst van die datum is onbekend. Een
          /CreationDate uit de PDF-metadata zou een bewering van de
          maker over zichzelf zijn. */
     on conflict (bron_id, extern_id)
       do update set laatst_opgehaald_op = now(), titel = excluded.titel
     returning id`,
    [organisatieId, bron.id, invoer.url, invoer.url, titel, bron.uitgever],
  );
  if (!doc) {
    return weiger("http_fout", "het brondocument kon niet worden vastgelegd");
  }

  /* DE INHOUDSHASH IS DE IDENTITEIT VAN DE VERSIE. Dezelfde PDF
     opnieuw ophalen geeft dezelfde hash en dus geen nieuwe versie.

     DEZELFDE HASHFUNCTIE ALS DE COLLECTOR, en niet een eigen
     createHash hier: twee hashfuncties over dezelfde tekst geven twee
     identiteiten voor één document, en dan is `versies_hash_uniek`
     geen grendel meer. Zie inhoudHash() in kern/tekst.ts. */
  const hash = inhoudHash(titel, gelezen.tekst);
  const bestaand = await eenRij<{ id: number }>(
    c,
    `select id from intel.brondocument_versies
      where organisatie_id = $1 and brondocument_id = $2 and inhoud_hash = $3`,
    [organisatieId, doc.id, hash],
  );
  if (bestaand) {
    log.info("pdf ongewijzigd", { url: invoer.url, versieId: bestaand.id });
    return {
      ok: true,
      brondocumentId: doc.id,
      versieId: bestaand.id,
      nieuweVersie: false,
      tekstLengte: gelezen.tekst.length,
      aantalPaginas: gelezen.aantalPaginas,
      paginas: gelezen.paginas,
      injectieVerdacht: injectie.verdacht,
      versie: PDF_VERSIE,
    };
  }

  const vorige = await eenRij<{ id: number; versie: number; ruwe_tekst: string }>(
    c,
    `select id, versie, ruwe_tekst from intel.brondocument_versies
      where organisatie_id = $1 and brondocument_id = $2
      order by versie desc limit 1`,
    [organisatieId, doc.id],
  );
  const wijziging = bepaalWijziging(vorige ? vorige.ruwe_tekst : null, gelezen.tekst);

  const nieuw = await eenRij<{ id: number }>(
    c,
    `insert into intel.brondocument_versies
       (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte,
        opgehaald_op, http_status, wijziging_soort, vorige_versie_id,
        verschil_ratio, injectie_verdacht, injectie_patronen, documentvorm)
     values ($1,$2,$3,$4,$5,$6,$7, now(), 200, $8, $9, $10, $11, $12, 'BEKENDMAKING')
     returning id`,
    [
      organisatieId,
      doc.id,
      (vorige?.versie ?? 0) + 1,
      hash,
      titel,
      gelezen.tekst,
      gelezen.tekst.length,
      /* DE WIJZIGINGSSOORT KOMT UIT bepaalWijziging() EN NIET UIT EEN
         EIGEN WAARDE.
         Mijn eerste versie schreef 'gewijzigd', en dat bestaat niet:
         brondocument_versies_wijziging_soort_check staat alleen
         'nieuw', 'materieel' en 'cosmetisch' toe (0002). Betrapt door
         de eigen integratietoets.

         En de keuze tussen materieel en cosmetisch hoort niet door mij
         geraden te worden: de collector gebruikt bepaalWijziging() met
         een verschilratio, en dat is dezelfde vraag over dezelfde twee
         teksten. Eén meting, twee aanroepers. */
      wijziging.soort,
      vorige?.id ?? null,
      wijziging.ratio.toFixed(4),
      injectie.verdacht,
      JSON.stringify(injectie.patronen),
    ],
  );
  if (!nieuw) {
    return weiger("http_fout", "de bronversie kon niet worden vastgelegd");
  }

  await c.query(
    `update intel.brondocumenten
        set huidige_versie_id = $3, aantal_versies = coalesce(aantal_versies, 0) + 1
      where organisatie_id = $1 and id = $2`,
    [organisatieId, doc.id, nieuw.id],
  );

  log.info("pdf opgenomen", {
    url: invoer.url,
    brondocumentId: doc.id,
    versieId: nieuw.id,
    paginas: gelezen.aantalPaginas,
    tekens: gelezen.tekst.length,
    injectieVerdacht: injectie.verdacht,
  });

  return {
    ok: true,
    brondocumentId: doc.id,
    versieId: nieuw.id,
    nieuweVersie: true,
    tekstLengte: gelezen.tekst.length,
    aantalPaginas: gelezen.aantalPaginas,
    paginas: gelezen.paginas,
    injectieVerdacht: injectie.verdacht,
    versie: PDF_VERSIE,
  };
}
