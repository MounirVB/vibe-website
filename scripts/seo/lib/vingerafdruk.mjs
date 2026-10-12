/* ============================================================================
   VIBE ENERGY — INHOUDSVINGERAFDRUKKEN PER ROUTE
   ----------------------------------------------------------------------------
   Bepaalt de wijzigingsdatum van een pagina uit haar INHOUD en niet uit de
   klok.

   HET DEFECT DAT DIT OPLOST — gemeten, niet vermoed.

   `bouw-routes.mjs` zette `_gegenereerd` op `new Date()` en genereer.mjs gaf
   die datum aan elke pagina mee als `gewijzigd`. Die waarde landt in
   `dateModified` in de JSON-LD. Gevolg: wie de keten een dag later draaide
   zonder één letter te veranderen, kreeg 430 pagina's met een nieuwe
   wijzigingsdatum. Dat is een onwaar signaal aan een zoekmachine, en op deze
   schaal een signaal dat de hele site elke dag verandert.

   Bij 62 pagina's was dat al fout; bij 430 is het schadelijk.

   HOE HET WERKT — EEN PLAATSHOUDER, EEN HASH, DAN DE DATUM.

   De datum staat IN de HTML, dus de HTML hashen nadat de datum erin staat is
   circulair: elke datumwijziging verandert de hash die moet bepalen of de
   datum mag wijzigen. Daarom rendert de generator één keer met een
   PLAATSHOUDER op de plek van de datum, hasht die uitvoer, en vult daarna de
   datum in die uit de hash volgt:

     1 render met @@GEWIJZIGD@@        -> inhoud zonder datum
     2 sha256 over die uitvoer         -> de vingerafdruk van de inhoud
     3 gelijk aan het grootboek?       -> houd de oude datum
        anders                         -> neem de bouwdatum en schrijf bij
     4 vervang de plaatshouder         -> de uitvoer die op schijf komt

   Daarmee is de uitvoer deterministisch over dagen heen: dezelfde invoer
   geeft hetzelfde bestand, ook volgend jaar.

   HET GROOTBOEK IS BRONBESTAND, GEEN CACHE.
   data/seo/vingerafdrukken.json hoort gecommit te worden. Gooi je het weg,
   dan krijgt elke pagina de bouwdatum en is de historie kwijt — niet fout,
   maar wel onnodig verlies. De CI-poort controleert dat het grootboek na een
   ketenrun niet verandert; dat is precies de toets die bewijst dat de bouw
   niet aan de klok hangt.
   ============================================================================ */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export const PLAATSHOUDER = '@@GEWIJZIGD@@';

export class Vingerafdrukken {
  /**
   * @param {string} pad      pad naar data/seo/vingerafdrukken.json
   * @param {string} bouwdatum ISO-datum die een GEWIJZIGDE pagina krijgt
   */
  constructor(pad, bouwdatum) {
    this.pad = pad;
    this.bouwdatum = bouwdatum;
    const vorig = existsSync(pad) ? JSON.parse(readFileSync(pad, 'utf8')) : {};
    this.vorige = vorig.routes || {};
    this.nieuw = {};
    this.telling = { ongewijzigd: 0, gewijzigd: 0, nieuw: 0 };
  }

  /**
   * Hasht de uitvoer-met-plaatshouder, kiest de datum en geeft de uitvoer
   * terug met de datum erin.
   * @param {string} route
   * @param {string} htmlMetPlaatshouder
   * @returns {string} de definitieve HTML
   */
  verwerk(route, htmlMetPlaatshouder) {
    const hash = createHash('sha256').update(htmlMetPlaatshouder).digest('hex').slice(0, 16);
    const oud = this.vorige[route];

    let datum;
    if (!oud) {
      datum = this.bouwdatum;
      this.telling.nieuw += 1;
    } else if (oud.hash === hash) {
      datum = oud.gewijzigd;
      this.telling.ongewijzigd += 1;
    } else {
      datum = this.bouwdatum;
      this.telling.gewijzigd += 1;
    }

    this.nieuw[route] = { hash, gewijzigd: datum };
    /* split/join in plaats van replace met een reguliere expressie: de
       plaatshouder komt meer dan één keer voor (JSON-LD en de <time>), en
       een string-replace vervangt er maar één. */
    return htmlMetPlaatshouder.split(PLAATSHOUDER).join(datum);
  }

  /** De gekozen datum voor een route, nadat verwerk() is gedraaid. */
  datumVan(route) {
    return this.nieuw[route]?.gewijzigd || null;
  }

  schrijf() {
    /* Gesorteerd, zodat het bestand een stabiele diff heeft en een poort kan
       zien dat er niets veranderde. */
    const routes = {};
    for (const k of Object.keys(this.nieuw).sort()) routes[k] = this.nieuw[k];
    writeFileSync(
      this.pad,
      JSON.stringify(
        {
          _toelichting:
            'Inhoudsvingerafdruk per gegenereerde route. De hash is sha256 over de gerenderde pagina MET een ' +
            'plaatshouder op de datumplek; gewijzigd is de datum waarop die hash voor het laatst veranderde. ' +
            'Dit bestand hoort gecommit te worden: het is de reden dat dateModified niet aan de klok hangt. ' +
            'Niet met de hand bijwerken.',
          _schrijver: 'scripts/seo/genereer.mjs via scripts/seo/lib/vingerafdruk.mjs',
          aantal: Object.keys(routes).length,
          routes,
        },
        null,
        2
      ) + '\n'
    );
  }
}
