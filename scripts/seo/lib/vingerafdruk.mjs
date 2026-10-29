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

   ----------------------------------------------------------------------------
   TWEE SCHRIJVERS, EEN GROOTBOEK — NIEUW IN DEZE RELEASE, EN WAAROM.

   Tot nu toe vulde alleen genereer.mjs dit grootboek, voor de 397 GEGENEREERDE
   routes. De 34 met de hand geschreven wortelpaginas (/, contact, projecten,
   systeem-*, project-*, industrie-*, de juridische paginas) stonden er niet in
   en vielen in sitemap.mjs terug op `git log -1 --format=%cs` van het bestand.

   DAT WAS HET DEFECT, en het is geen dagkwestie maar een kip-en-ei. Gemeten op
   b2de0c4: die commit raakte 432 HTML-bestanden en is zelf een squash-merge
   met een NIEUWE commitdatum. De sitemap die in die commit landde was
   gegenereerd voordat de commit bestond, dus met de toen laatste datum
   (2026-10-28). Elke bouw erna leest terecht 2026-10-29. Een lastmod uit de
   git-commitdatum kan de datum van de commit waarin hij ZELF landt niet
   bevatten, en dus faalde de reproduceerbaarheidspoort op main zelf.

   De oplossing is GEEN tweede systeem maar dezelfde regel, ook voor die 34:
   hash de inhoud, en verschuif de datum alleen als de hash verschuift. Voor
   een gegenereerde pagina is die inhoud de render-met-plaatshouder; voor een
   handgeschreven pagina is het het bestand zelf. Zie `datumVoorInhoud()`.

   WAAROM DE PLAATSHOUDER DAAR NIET NODIG IS. De plaatshouder bestaat omdat de
   datum IN de gegenereerde HTML staat, waardoor hashen circulair zou zijn.
   Gemeten op alle 34: nul treffers op `dateModified`, nul op `<time`, nul
   ISO-datums. Er staat geen datum in, dus geen circulariteit, en dan is een
   kale inhoudshash voldoende.

   DAAROM SAMENVOEGEN BIJ HET SCHRIJVEN. Twee schrijvers met disjuncte
   sleutelverzamelingen — genereer.mjs de gegenereerde routes,
   herstel-bestaand.mjs de handgeschreven — zouden elkaar leegvegen als elke
   `schrijf()` alleen zijn eigen rijen wegschreef. Elke schrijver werkt nu
   uitsluitend zijn EIGEN routes bij en laat de rest staan. Daarmee doet de
   orde van de twee stappen niet meer ter zake, en levert `genereer` alleen
   draaien geen grootboek op dat 34 rijen mist.

   WAT DAAR DE PRIJS VAN IS, eerlijk benoemd: een route die uit de site
   verdwijnt blijft in het grootboek staan. Dat is onschadelijk — sitemap.mjs
   zoekt alleen INDEX-routes op — maar het is wel een rij die niemand meer
   opruimt. Bewust verkozen boven het alternatief, waarin de ene schrijver de
   rijen van de andere wist.
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

  /**
   * Dezelfde regel, maar voor inhoud die AL op schijf staat.
   *
   * Voor een handgeschreven pagina is de inhoud het bestand zelf: er zit geen
   * datum in (gemeten op alle 34: nul `dateModified`, nul `<time`, nul
   * ISO-datums), dus hashen is niet circulair en er is geen plaatshouder
   * nodig.
   *
   * Geeft ALLEEN de datum terug en raakt de inhoud niet aan — het verschil
   * met verwerk(), dat de HTML teruggeeft die weggeschreven moet worden.
   *
   * @param {string} route
   * @param {string} inhoud  de bytes van het bestand, zoals ze op schijf staan
   * @returns {string} de wijzigingsdatum voor deze route
   */
  datumVoorInhoud(route, inhoud) {
    const hash = createHash('sha256').update(inhoud).digest('hex').slice(0, 16);
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
    return datum;
  }

  /** De gekozen datum voor een route, nadat verwerk() is gedraaid. */
  datumVan(route) {
    return this.nieuw[route]?.gewijzigd || null;
  }

  schrijf() {
    /* SAMENVOEGEN, NIET OVERSCHRIJVEN. Zie de toelichting in de kop: twee
       schrijvers vullen dit grootboek, elk voor zijn eigen routes. Een
       `schrijf()` die alleen `this.nieuw` wegschreef zou de rijen van de
       andere schrijver wissen, en dan hangt de uitkomst af van wie het laatst
       draaide. */
    const samengevoegd = { ...this.vorige, ...this.nieuw };
    /* Gesorteerd, zodat het bestand een stabiele diff heeft en een poort kan
       zien dat er niets veranderde. */
    const routes = {};
    for (const k of Object.keys(samengevoegd).sort()) routes[k] = samengevoegd[k];
    writeFileSync(
      this.pad,
      JSON.stringify(
        {
          _toelichting:
            'Inhoudsvingerafdruk per INDEX-route. Voor een GEGENEREERDE route is de hash sha256 over de ' +
            'gerenderde pagina MET een plaatshouder op de datumplek; voor een HANDGESCHREVEN wortelpagina is ' +
            'het sha256 over het bestand zelf, want daar staat geen datum in en is hashen dus niet ' +
            'circulair. gewijzigd is de datum waarop die hash voor het laatst veranderde. Dit bestand hoort ' +
            'gecommit te worden: het is de reden dat lastmod en dateModified niet aan de klok en niet aan de ' +
            'git-commitdatum hangen. Niet met de hand bijwerken.',
          _schrijvers: [
            'scripts/seo/genereer.mjs — de gegenereerde routes',
            'scripts/seo/herstel-bestaand.mjs — de handgeschreven wortelpaginas',
          ],
          _samenvoegen:
            'Elke schrijver werkt uitsluitend zijn EIGEN routes bij en laat de rest staan. Een route die uit ' +
            'de site verdwijnt blijft daarom achter; dat is onschadelijk, want sitemap.mjs zoekt alleen ' +
            'INDEX-routes op.',
          aantal: Object.keys(routes).length,
          routes,
        },
        null,
        2
      ) + '\n'
    );
  }
}
