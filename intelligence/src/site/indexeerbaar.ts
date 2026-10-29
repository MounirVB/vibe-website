/* ============================================================
   SITE — hoeveel pagina's zijn TECHNISCH indexeerbaar
   ------------------------------------------------------------
   WAAROM DIT EEN EIGEN MODULE IS GEWORDEN.

   Deze meting stond als privéfunctie in src/cli/analytics.ts. Daardoor
   was ze alleen bereikbaar als een mens die CLI aanriep. De dagstand
   (intel.indexatie_dagstand, migratie 0034) staat of valt met deze
   metriek, en de dagstand is de ENIGE plek waar een trend kan ontstaan:
   intel.indexatie_status heeft `unique (organisatie_id, url, bron)` en
   zet bij een upsert `laatst_gecontroleerd_op = now()`, waarmee het
   vorige meetpunt wordt gewist.

   Gemeten gevolg op b2de0c4: `--bewaar` staat in geen enkele planregel
   (grep over PLAN in kern/taken.ts geeft geen 'indexatie' en geen
   'analytics'), en intel.indexatie_dagstand heeft 0 rijen. Een
   vergelijking over 7, 28 of 90 dagen was daarmee niet "nog niet
   gebouwd" maar PER CONSTRUCTIE ONMOGELIJK — er werd nooit een tweede
   meetpunt bewaard.

   Door de meting hier te zetten kan de wachtrijtaak hem gebruiken
   zonder een tweede implementatie. Eén waarheid over wat
   'technisch indexeerbaar' betekent; twee zouden uiteenlopen, en dan
   verschilt de dagstand van wat de CLI toont.

   WAT DEZE METING NIET IS. Technisch indexeerbaar is NIET hetzelfde als
   door Google geïndexeerd. Dat onderscheid wordt door
   analytics/koppelingen.ts bewaakt met bewaakScheiding(); deze module
   levert alleen de linkerkant en zegt waar het getal vandaan komt.
   ============================================================ */

import { APP_WORTEL, configLezen, REPO_WORTEL } from "../kern/config.ts";
import { omgekeerdePariteit } from "../analytics/koppelingen.ts";
import { scanSite } from "./paginascan.ts";
import { leesSitekennis } from "./sitekennis.ts";

export type IndexeerbaarMeting = {
  /** null betekent NIET GEMETEN, nooit nul. */
  readonly getal: { aantal: number; bron: string } | null;
  /** Pagina's die in de sitemap staan terwijl ze noindex of een stub zijn. */
  readonly pariteit: readonly string[];
  /** null = deze richting is niet te toetsen met wat er beschikbaar was. */
  readonly pariteitBron: string | null;
};

/**
 * Hoeveel pagina's zijn technisch indexeerbaar, en waaruit blijkt dat?
 *
 * TWEE BRONNEN, IN DEZE ORDE, en de orde heeft een reden. De repo-scan
 * is het rijkst: hij ziet ook noindex-pagina's en redirectstubs, en kan
 * daarom de omgekeerde sitemappariteit toetsen. Maar hij werkt alleen
 * waar de HTML van de site op schijf staat, en in de productiecontainer
 * is de rootDirectory `intelligence` — daar bestaat die HTML niet.
 *
 * Valt de scan weg, dan is het sitekennisartefact de terugval. Dat
 * bevat UITSLUITEND gepubliceerde pagina's, dus het kan tellen maar de
 * pariteit niet toetsen. Dat wordt gemeld in plaats van verzwegen.
 *
 * Is er geen van beide, dan is het antwoord NIET GEMETEN. Een scan die
 * nul pagina's vindt mag nooit als "de site heeft nul indexeerbare
 * pagina's" worden gerapporteerd; dat is het verschil tussen een meting
 * en een blinde vlek.
 */
export async function meetIndexeerbaar(): Promise<IndexeerbaarMeting> {
  /* De wortel komt uit de configuratie, maar die werpt zonder
     INTEL_DB_URL. Deze meting heeft geen database nodig, dus hij mag er
     ook niet op stuklopen: dan valt de enige metriek weg die zonder
     database wél te meten is. */
  const siteWortel = (() => {
    try {
      return configLezen().siteWortel;
    } catch {
      return REPO_WORTEL;
    }
  })();

  const scan = await scanSite(siteWortel).catch(() => null);
  if (scan && scan.paginas.length > 0) {
    const aantal = scan.paginas.filter((p) => p.indexeerbaar && !p.isRedirectStub).length;
    const omgekeerd = omgekeerdePariteit(
      scan.paginas.map((p) => ({
        pad: p.pad,
        inSitemap: p.inSitemap,
        indexeerbaar: p.indexeerbaar,
        isRedirectStub: p.isRedirectStub,
      })),
    );
    return {
      getal: { aantal, bron: `repo-scan van ${siteWortel}` },
      pariteit: [...omgekeerd.alle],
      pariteitBron: "repo-scan",
    };
  }

  const kennis = await leesSitekennis(APP_WORTEL);
  if (kennis.ok) {
    return {
      getal: {
        aantal: kennis.kennis.aantalPaginas,
        bron: `sitekennisartefact (websiteversie ${kennis.kennis.websiteVersie.slice(0, 12)})`,
      },
      pariteit: [],
      pariteitBron: null,
    };
  }

  return { getal: null, pariteit: [], pariteitBron: null };
}
