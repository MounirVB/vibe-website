/* ============================================================
   PIJPLIJN — verzamelen
   ------------------------------------------------------------
   Haalt actieve bronnen op en schrijft brondocumenten en versies weg.
   Vier dingen die hier bepalend zijn:

   1. De inhoudshash bepaalt of er een nieuwe versie komt. Zonder die
      hash tikt elke bron met een tijdstempel in de HTML elke ronde als
      gewijzigd aan, en genereert het platform eindeloos werk.
   2. Conditional GET gaat vóór alles. Een 304 kost niets.
   3. Van feeds bewaren we titel en de samenvatting die de uitgever
      zelf meegeeft — niet het volledige artikel. Dat is tegelijk de
      auteursrechtelijke grens en de reden dat de opslag klein blijft.
   4. Elke ophaling levert een rij in intel.bron_ophalingen op, ook als
      er niets veranderde. Een bron die stilvalt is dan zichtbaar in
      plaats van onopgemerkt.
   ============================================================ */

import type pg from "pg";
import { eenRij, metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { bepaalWijziging, inhoudHash, kort, normaliseerTekst } from "../kern/tekst.ts";
import { haalBron } from "../bronnen/haal.ts";
import { bronOpSleutel } from "../bronnen/register.ts";
import type { Gezondheid, RuwItem } from "../bronnen/soorten.ts";
import { onderzoekInjectie } from "./injectie.ts";

const log = maakLogger("verzamelen");

/**
 * Bronsoorten waarbij de URL het item identificeert. Daarbuiten is
 * extern_id de identiteit: WFS-features hebben geen eigen URL, een
 * catalogusrij kan de tabel-URL delen en een tijdreeks citeert per dag
 * hetzelfde endpoint. Zie migratie 0011.
 */
const URL_IS_IDENTITEIT = new Set<string>(["rss", "atom", "sitemap", "sru", "html_lijst"]);

export type BronRij = {
  id: number;
  sleutel: string;
  actief: boolean;
  ophaalinterval_minuten: number;
  laatste_etag: string | null;
  laatste_last_modified: string | null;
  laatst_opgehaald_op: Date | null;
  opeenvolgende_fouten: number;
  gezondheid: Gezondheid;
};

export type BronUitkomst = {
  readonly sleutel: string;
  readonly resultaat: "ok" | "niet_gewijzigd" | "fout" | "overgeslagen";
  readonly httpStatus: number | null;
  readonly items: number;
  readonly nieuw: number;
  readonly gewijzigd: number;
  readonly materieel: number;
  readonly injectieVerdacht: number;
  readonly gezondheid: Gezondheid;
  readonly opmerking: string;
  readonly duurMs: number;
};

export type VerzamelRapport = {
  readonly bronnenGeprobeerd: number;
  readonly bronnenOk: number;
  readonly bronnenOvergeslagen: number;
  readonly bronnenFout: number;
  readonly nieuweDocumenten: number;
  readonly nieuweVersies: number;
  readonly materieleWijzigingen: number;
  readonly injectieVerdacht: number;
  readonly perBron: readonly BronUitkomst[];
};

function isToeAanOphalen(rij: BronRij, nu: Date, forceer: boolean): boolean {
  if (forceer) return true;
  if (!rij.laatst_opgehaald_op) return true;
  const verstrekenMinuten = (nu.getTime() - rij.laatst_opgehaald_op.getTime()) / 60_000;
  return verstrekenMinuten >= rij.ophaalinterval_minuten;
}

function bepaalGezondheid(
  resultaat: "ok" | "niet_gewijzigd" | "fout" | "overgeslagen",
  aantalItems: number,
  opeenvolgendeFouten: number,
  vorige: Gezondheid,
): Gezondheid {
  switch (resultaat) {
    case "ok":
      // Nul items na filteren is geen storing: een bron die door een
      // uitsluitpatroon leegloopt is gezond maar stil.
      return aantalItems > 0 ? "HEALTHY" : "QUIET";
    case "niet_gewijzigd":
      return vorige === "ONBEKEND" ? "HEALTHY" : vorige;
    case "fout":
      return opeenvolgendeFouten >= 3 ? "BROKEN" : "DEGRADED";
    case "overgeslagen":
      return "DISABLED";
  }
}

/**
 * Verwerkt één item tot een brondocument en, als de inhoud veranderd
 * is, een nieuwe versie. Geeft terug wat er gebeurde.
 */
async function verwerkItem(
  c: pg.PoolClient,
  organisatieId: number,
  bronId: number,
  bronSleutel: string,
  item: RuwItem,
  onderwerpen: readonly string[],
  urlIsIdentiteit: boolean,
): Promise<{ nieuwDocument: boolean; nieuweVersie: boolean; materieel: boolean; injectie: boolean }> {
  const titel = kort(item.titel, 500);
  // Alleen titel en de door de uitgever meegegeven samenvatting. Nooit
  // het volledige artikel ophalen of bewaren.
  const tekst = normaliseerTekst(
    [item.samenvatting, item.tekst].filter((t): t is string => Boolean(t)).join("\n\n"),
  );
  const hash = inhoudHash(titel, tekst);

  const bestaand = await eenRij<{
    id: number;
    aantal_versies: number;
    huidige_versie_id: number | null;
  }>(
    c,
    `insert into intel.brondocumenten
       (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
        taal, gepubliceerd_op, datum_herkomst, onderwerpen, url_is_identiteit, extra)
     values ($1, $2, $3, $4, $5,
             (select uitgever from intel.bronnen where id = $2),
             (select soort from intel.bronnen where id = $2),
             'nl', $6, $7, $8, $9, $10)
     on conflict (bron_id, extern_id) do update set
       laatst_opgehaald_op = now(),
       canonieke_url       = excluded.canonieke_url,
       status              = 'actief',
       verdwenen_sinds     = null,
       extra               = excluded.extra
     returning id, aantal_versies, huidige_versie_id`,
    [
      organisatieId,
      bronId,
      item.externId,
      item.url,
      titel,
      item.gepubliceerdOp,
      item.datumHerkomst,
      onderwerpen,
      urlIsIdentiteit,
      JSON.stringify(item.extra ?? {}),
    ],
  );
  if (!bestaand) throw new Error(`brondocument kon niet geschreven worden: ${item.externId}`);

  const nieuwDocument = bestaand.aantal_versies === 0;

  // Bestaat er al een versie met precies deze inhoud? Dan is er niets
  // veranderd en stopt het hier. Dit is de belangrijkste kostenrem.
  const zelfdeHash = await eenRij<{ id: number }>(
    c,
    "select id from intel.brondocument_versies where brondocument_id = $1 and inhoud_hash = $2",
    [bestaand.id, hash],
  );
  if (zelfdeHash) {
    return { nieuwDocument, nieuweVersie: false, materieel: false, injectie: false };
  }

  const vorige = await eenRij<{ id: number; versie: number; ruwe_tekst: string }>(
    c,
    `select id, versie, ruwe_tekst from intel.brondocument_versies
      where brondocument_id = $1 order by versie desc limit 1`,
    [bestaand.id],
  );

  const wijziging = bepaalWijziging(vorige ? vorige.ruwe_tekst : null, tekst);
  const injectie = onderzoekInjectie(titel, tekst);

  const nieuweVersie = await eenRij<{ id: number }>(
    c,
    `insert into intel.brondocument_versies
       (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst,
        tekst_lengte, samenvatting_bron, wijziging_soort, vorige_versie_id,
        verschil_ratio, injectie_verdacht, injectie_patronen)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     on conflict (brondocument_id, inhoud_hash) do nothing
     returning id`,
    [
      organisatieId,
      bestaand.id,
      (vorige?.versie ?? 0) + 1,
      hash,
      titel,
      tekst,
      tekst.length,
      item.samenvatting ? kort(item.samenvatting, 2000) : null,
      wijziging.soort,
      vorige?.id ?? null,
      wijziging.ratio.toFixed(4),
      injectie.verdacht,
      injectie.patronen,
    ],
  );
  if (!nieuweVersie) {
    // Een race met een parallelle worker; de andere heeft gewonnen.
    return { nieuwDocument, nieuweVersie: false, materieel: false, injectie: false };
  }

  await c.query(
    `update intel.brondocumenten
        set huidige_versie_id = $2,
            aantal_versies    = aantal_versies + 1,
            titel             = $3
      where id = $1`,
    [bestaand.id, nieuweVersie.id, titel],
  );

  if (injectie.verdacht) {
    log.waarschuwing("promptinjectie vermoed in brontekst", {
      bron: bronSleutel,
      versie_id: nieuweVersie.id,
      patronen: injectie.patronen,
      toelichting: injectie.toelichting,
    });
    await c.query(
      `insert into intel.systeem_meldingen
         (organisatie_id, soort, ernst, bericht, context, dedup_sleutel)
       values ($1, 'promptinjectie', 'waarschuwing', $2, $3, $4)
       on conflict (organisatie_id, soort, dedup_sleutel) where dedup_sleutel is not null and opgelost_op is null
       do update set aantal = intel.systeem_meldingen.aantal + 1, laatst_op = now()`,
      [
        organisatieId,
        `Injectiepatroon in bronversie ${nieuweVersie.id} van ${bronSleutel}`,
        JSON.stringify({ patronen: injectie.patronen, toelichting: injectie.toelichting }),
        `injectie:${bronSleutel}`,
      ],
    );
  }

  return {
    nieuwDocument,
    nieuweVersie: true,
    materieel: wijziging.soort === "materieel",
    injectie: injectie.verdacht,
  };
}

async function verzamelBron(
  c: pg.PoolClient,
  organisatieId: number,
  rij: BronRij,
): Promise<BronUitkomst> {
  const bron = bronOpSleutel(rij.sleutel);
  const start = Date.now();

  if (!bron) {
    // De databaserij bestaat maar het coderegister kent de bron niet.
    // Dat kan na een rename; dan is het coderegister leidend.
    return {
      sleutel: rij.sleutel,
      resultaat: "overgeslagen",
      httpStatus: null,
      items: 0,
      nieuw: 0,
      gewijzigd: 0,
      materieel: 0,
      injectieVerdacht: 0,
      gezondheid: "DISABLED",
      opmerking: "bron staat in de database maar niet in het coderegister",
      duurMs: Date.now() - start,
    };
  }

  const uitkomst = await haalBron(bron, {
    etag: rij.laatste_etag,
    lastModified: rij.laatste_last_modified,
  });

  let nieuw = 0;
  let gewijzigd = 0;
  let materieel = 0;
  let injectieVerdacht = 0;
  let aantalItems = 0;
  let httpStatus: number | null = null;
  let opmerking = uitkomst.opmerking ?? "";

  if (uitkomst.resultaat === "ok") {
    httpStatus = uitkomst.httpStatus;
    aantalItems = uitkomst.items.length;
    for (const item of uitkomst.items) {
      const r = await verwerkItem(
        c,
        organisatieId,
        rij.id,
        rij.sleutel,
        item,
        bron.onderwerpen,
        URL_IS_IDENTITEIT.has(bron.soort),
      );
      if (r.nieuwDocument) nieuw += 1;
      if (r.nieuweVersie) gewijzigd += 1;
      if (r.materieel) materieel += 1;
      if (r.injectie) injectieVerdacht += 1;
    }
  } else if (uitkomst.resultaat === "fout") {
    httpStatus = uitkomst.httpStatus;
    opmerking = `${uitkomst.foutSoort}: ${uitkomst.foutBericht}`;
  } else if (uitkomst.resultaat === "overgeslagen") {
    opmerking = uitkomst.reden;
  }

  const opeenvolgendeFouten =
    uitkomst.resultaat === "fout" ? rij.opeenvolgende_fouten + 1 : 0;
  const gezondheid = bepaalGezondheid(
    uitkomst.resultaat,
    aantalItems,
    opeenvolgendeFouten,
    rij.gezondheid,
  );

  // Ophaallog: altijd een rij, ook bij 304 en bij overgeslagen.
  await c.query(
    `insert into intel.bron_ophalingen
       (organisatie_id, bron_id, duur_ms, http_status, resultaat, aantal_items,
        aantal_nieuw, aantal_gewijzigd, bytes, etag, last_modified,
        fout_soort, fout_bericht, reden_overgeslagen)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      organisatieId,
      rij.id,
      Date.now() - start,
      httpStatus,
      uitkomst.resultaat,
      aantalItems,
      nieuw,
      gewijzigd,
      uitkomst.resultaat === "ok" ? uitkomst.bytes : null,
      uitkomst.resultaat === "ok" ? uitkomst.etag : null,
      uitkomst.resultaat === "ok" ? uitkomst.lastModified : null,
      uitkomst.resultaat === "fout" ? uitkomst.foutSoort : null,
      uitkomst.resultaat === "fout" ? uitkomst.foutBericht : null,
      uitkomst.resultaat === "overgeslagen" ? uitkomst.reden : null,
    ],
  );

  // Gemeten toestand op de bron bijwerken. De validators alleen
  // overschrijven bij een geslaagde ophaling; bij 304 blijven ze staan.
  await c.query(
    `update intel.bronnen
        set laatst_opgehaald_op   = now(),
            laatste_resultaat     = $2,
            opeenvolgende_fouten  = $3,
            gezondheid            = $4,
            gezondheid_reden      = $5,
            laatste_etag          = coalesce($6, laatste_etag),
            laatste_last_modified = coalesce($7, laatste_last_modified),
            laatst_gewijzigd_op   = case when $8 > 0 then now() else laatst_gewijzigd_op end,
            laatst_item_op        = case when $9 > 0 then now() else laatst_item_op end
      where id = $1`,
    [
      rij.id,
      uitkomst.resultaat === "overgeslagen" ? "fout" : uitkomst.resultaat,
      opeenvolgendeFouten,
      gezondheid,
      opmerking.slice(0, 500) || null,
      uitkomst.resultaat === "ok" ? uitkomst.etag : null,
      uitkomst.resultaat === "ok" ? uitkomst.lastModified : null,
      gewijzigd,
      aantalItems,
    ],
  );

  return {
    sleutel: rij.sleutel,
    resultaat: uitkomst.resultaat,
    httpStatus,
    items: aantalItems,
    nieuw,
    gewijzigd,
    materieel,
    injectieVerdacht,
    gezondheid,
    opmerking,
    duurMs: Date.now() - start,
  };
}

export async function verzamel(
  pool: Pool,
  organisatieId: number,
  opties: { forceer?: boolean; alleenBron?: string } = {},
): Promise<VerzamelRapport> {
  const nu = new Date();
  const perBron: BronUitkomst[] = [];

  const kandidaten = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<BronRij>(
      c,
      `select id, sleutel, actief, ophaalinterval_minuten, laatste_etag,
              laatste_last_modified, laatst_opgehaald_op, opeenvolgende_fouten, gezondheid
         from intel.bronnen
        where actief
          and ($1::text is null or sleutel = $1)
        order by laatst_opgehaald_op nulls first`,
      [opties.alleenBron ?? null],
    ),
  );

  const toe = kandidaten.filter((r) => isToeAanOphalen(r, nu, opties.forceer ?? false));

  // Bronnen worden bewust achter elkaar opgehaald. Parallel ophalen zou
  // de minimumintervallen per host doorkruisen en levert bij deze
  // volumes niets op.
  for (const rij of toe) {
    try {
      const uitkomst = await metOrganisatie(pool, { organisatieId }, (c) =>
        verzamelBron(c, organisatieId, rij),
      );
      perBron.push(uitkomst);
    } catch (e) {
      log.fout("bron mislukte buiten de normale foutpaden", { bron: rij.sleutel, fout: e });
      perBron.push({
        sleutel: rij.sleutel,
        resultaat: "fout",
        httpStatus: null,
        items: 0,
        nieuw: 0,
        gewijzigd: 0,
        materieel: 0,
        injectieVerdacht: 0,
        gezondheid: "BROKEN",
        opmerking: `onverwachte fout: ${(e as Error).message}`,
        duurMs: 0,
      });
    }
  }

  return {
    bronnenGeprobeerd: toe.length,
    bronnenOk: perBron.filter((b) => b.resultaat === "ok" || b.resultaat === "niet_gewijzigd").length,
    bronnenOvergeslagen: kandidaten.length - toe.length,
    bronnenFout: perBron.filter((b) => b.resultaat === "fout").length,
    nieuweDocumenten: perBron.reduce((a, b) => a + b.nieuw, 0),
    nieuweVersies: perBron.reduce((a, b) => a + b.gewijzigd, 0),
    materieleWijzigingen: perBron.reduce((a, b) => a + b.materieel, 0),
    injectieVerdacht: perBron.reduce((a, b) => a + b.injectieVerdacht, 0),
    perBron,
  };
}
