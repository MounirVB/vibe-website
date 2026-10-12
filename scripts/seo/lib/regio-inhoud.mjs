/* ============================================================================
   VIBE ENERGY — REGIONALE PAGINA-INHOUD
   ----------------------------------------------------------------------------
   Bouwt de inhoud van een regionale pagina uit BEWIJS, niet uit een sjabloon
   met een ingevulde plaatsnaam.

   WAT HIER WEL EN NIET MAG — de regels staan in de code, niet in een
   stijlgids, zodat ze niet per pagina kunnen verschuiven:

   · Elk cijfer op de pagina krijgt een zichtbare bronregel met bron en datum.
   · Een netbeheerder wordt alleen DE netbeheerder van een gemeente genoemd bij
     zekerheid EENDUIDIG. Bij OVERWEGEND staat het voorbehoud erbij; bij
     VERDEELD wordt geen enkele netbeheerder als de netbeheerder genoemd.
   · Een eigen project wordt genoemd met naam, plaats, jaar, sector en een link
     naar de projectpagina — en ZONDER de cijfers van dat project. Die staan op
     de projectpagina zelf; ze hier herhalen maakt deze pagina een tweede bron
     voor hetzelfde getal, en het claimregister verbiedt dat expliciet.
   · Een congestiestatus wordt NERGENS aan een gemeente toegekend. 92% van de
     gemeenten wordt door meer dan één voedingsgebied geraakt (gemeten uit
     congestie_pc6 van de Capaciteitskaart), dus een gemeente heeft geen
     congestiestatus. De pagina verwijst naar de Capaciteitskaart, waar de
     bezoeker zijn eigen postcode kan nakijken.
   ============================================================================ */
import { esc, bronregel } from './sjabloon.mjs';
import { href } from './paden.mjs';

export const CAPACITEITSKAART = 'https://capaciteitskaart.netbeheernederland.nl/';

const nf = new Intl.NumberFormat('nl-NL');
export const getal = (n) => nf.format(n);

/** "1 project" / "3 projecten" */
function meervoud(n, enkel, meer) {
  return `${getal(n)} ${n === 1 ? enkel : meer}`;
}

/* ------------------------------------------------------------ netbeheerder */
export function netbeheerderAlinea(gebiedsnaam, nb, bron) {
  if (!nb) return '';
  const naam = esc(nb.netbeheerder_naam || nb.netbeheerder);
  if (nb.zekerheid === 'EENDUIDIG') {
    return (
      `<p>De regionale netbeheerder voor elektriciteit in ${esc(gebiedsnaam)} is <strong>${naam}</strong>. ` +
      `Dat bepaalt bij wie u een aansluiting aanvraagt of laat verzwaren, en wie de transportcapaciteit op uw adres beheert.</p>` +
      bronregel([bron])
    );
  }
  if (nb.zekerheid === 'OVERWEGEND') {
    const rest = nb.verdeling.slice(1).map((x) => `${esc(x.label)} (${x.aandeel}%)`).join(' en ');
    return (
      `<p>Het grootste deel van het gemeentelijk gebied van ${esc(gebiedsnaam)} valt onder <strong>${naam}</strong> ` +
      `(ongeveer ${nb.aandeel_grootste}% van de oppervlakte). Een rand valt onder ${rest}. ` +
      `Controleer op uw eigen adres wie uw netbeheerder is voordat u een aanvraag doet.</p>` +
      bronregel([bron])
    );
  }
  const alle = nb.verdeling.map((x) => `${esc(x.label)} (${x.aandeel}%)`).join(', ');
  return (
    `<p>${esc(gebiedsnaam)} valt onder <strong>meer dan één netbeheerder</strong>: ${alle}. ` +
    `Er is hier dus geen enkele netbeheerder die voor de hele gemeente geldt; welke voor u geldt, hangt van uw adres af.</p>` +
    bronregel([bron])
  );
}

/* ------------------------------------------------------ bedrijventerreinen */
export function terreinenAlinea(gebiedsnaam, terreinen, bron) {
  if (!terreinen || !terreinen.length) return '';
  const metNaam = terreinen.filter((t) => t.naam);
  const nettoTotaal = terreinen.reduce((a, t) => a + (t.ha_netto ?? 0), 0);
  const top = metNaam.slice(0, 6);
  const jaren = [...new Set(terreinen.map((t) => t.jaar).filter(Boolean))].sort();

  /* Het veld HA_TOTTUIT uit IBIS wordt BEWUST niet gepubliceerd. De waarden
     gedragen zich als "terstond uitgeefbaar" (altijd <= bruto, in 3.641 van
     3.646 terreinen <= netto, en 0 bij 85% van de terreinen), maar er is geen
     attribuutdocumentatie gevonden die dat bevestigt — niet op het
     WFS-endpoint en niet op de registratie bij data.overheid.nl. Vijf
     terreinen hebben een waarde boven netto, wat die lezing juist tegenspreekt.
     Een getal publiceren op een aangenomen veldbetekenis is een verzinsel met
     een bronvermelding eronder, en dat is erger dan het weglaten. */

  let h =
    `<p>${esc(gebiedsnaam)} telt <strong>${meervoud(terreinen.length, 'bedrijventerrein', 'bedrijventerreinen')}</strong> in het landelijke ` +
    `IBIS-register, samen ongeveer ${getal(Math.round(nettoTotaal))} hectare netto` +
    `. Dat is de plek waar de zakelijke energievraag in deze gemeente zit: hallen met een plat dak, ` +
    `wagenparken die elektrificeren en aansluitingen die bij uitbreiding knellen.</p>`;

  if (top.length) {
    h +=
      `<p>De grootste terreinen zijn ` +
      top
        .map((t) => `<strong>${esc(t.naam)}</strong>${t.ha_netto ? ` (${getal(Math.round(t.ha_netto))} ha netto)` : ''}`)
        .join(', ') +
      `.</p>`;
  }
  h += bronregel([{ ...bron, naam: `${bron.naam}${jaren.length ? `, peiljaar ${jaren.join(' en ')}` : ''}` }]);
  return h;
}

/* ----------------------------------------------------------- vestigingen */
export function vestigingenAlinea(gebiedsnaam, aantal, bron) {
  if (typeof aantal !== 'number') return '';
  return (
    `<p>In ${esc(gebiedsnaam)} staan <strong>${getal(aantal)} vestigingen van bedrijven</strong> ingeschreven. ` +
    `Dat getal zegt niets over hoeveel daarvan een capaciteitsprobleem heeft, maar het geeft de schaal van de ` +
    `zakelijke markt waarin een gedeelde of individuele energie-oplossing moet passen.</p>` +
    bronregel([bron])
  );
}

/* ===================================================== bedrijfstakprofiel
   RELEASE 3.1 — de laag die 327 vastgehouden gemeenten publiceerbaar maakt.

   Release 1 hield ze vast omdat er te WEINIG lokaal bewijs was om een pagina
   te vullen: met een vestigingstotaal, een terreinenlijst en een netbeheerder
   deelden de 11 bestaande gemeentepagina's 55 tot 57 procent van hun
   vijfwoordreeksen (gemeten, drempel 60). De rest was onvermijdelijk sjabloon.

   Het bedrijfstakprofiel uit CBS 81575NED voegt per gemeente 21 getallen toe
   die echt verschillen, plus een locatiequotient per bedrijfstak. Dat is geen
   tekstvariatie maar extra FEIT, en het verandert wat de pagina adviseert.

   WAAROM ER NIET OP DE HOOGSTE LQ WORDT GERANGSCHIKT — gemeten.
   De sterkst overgerepresenteerde bedrijfstak is in 129 van de 342 gemeenten
   'A landbouw, bosbouw en visserij'. Dat is waar (de LQ loopt daar op tot
   5,74) maar het is geen doelgroep van Vibe Energy: de propositie gaat over
   bedrijfspanden, industrie, logistiek, wagenparken, vastgoed en
   laadinfrastructuur. Op de hoogste LQ rangschikken zou 129 pagina's een
   agrarische kop geven voor een dienst die daar niet over gaat.

   Daarom rangschikt deze code alleen over de bedrijfstakken die een EIGEN
   sectorpagina op deze site hebben. Dat is de toets: bestaat er een pagina
   die deze bedrijfstak bedient, dan mag de bedrijfstak de advieslijn van een
   gemeentepagina bepalen. Zo niet, dan staat hij wel in het profiel als feit
   maar bepaalt hij niets. De overige bedrijfstakken worden niet verzwegen —
   ze staan in de profielopsomming — maar ze sturen geen advies.
   ===================================================================== */

/* SBI-sectie -> de sectorpagina's en toepassingen die hem bedienen.
   Alleen secties waarvoor op deze site echt een pagina bestaat. De koppeling
   is op SECTIENIVEAU; een sectie is grover dan een sectorpagina. Daarom staat
   er nooit 'uw sector is X' op de pagina, maar 'deze bedrijfstak is hier
   sterk vertegenwoordigd'. */
export const TAK_NAAR_SECTOR = {
  307500: {
    letter: 'C',
    sectoren: ['sectoren/productie-en-industrie'],
    toepassing: 'toepassingen/pieken-in-verbruik',
    knelpunt:
      'Productieprocessen zetten kort veel vermogen gelijktijdig in. Die piek bepaalt het gecontracteerde ' +
      'vermogen voor het hele jaar, ook als hij maar een paar minuten per dag duurt.',
  },
  383100: {
    letter: 'H',
    sectoren: ['sectoren/transport-en-wagenparken', 'sectoren/opslag-en-distributie'],
    toepassing: 'toepassingen/elektrificatie-bedrijfswagens',
    knelpunt:
      'Vervoer en opslag elektrificeert het snelst aan de laadkant: bestelwagens en trucks die &rsquo;s nachts ' +
      'op eigen terrein laden, op een aansluiting die op de hal was gedimensioneerd en niet op een wagenpark.',
  },
  354200: {
    letter: 'G',
    sectoren: ['sectoren/retail', 'sectoren/automotive'],
    toepassing: 'toepassingen/laden-met-beperkte-aansluiting',
    knelpunt:
      'Handel heeft meestal veel dakoppervlak en een bezoekersstroom die wil laden. Beide concurreren om ' +
      'dezelfde aansluiting, en teruglevering en laadvraag vallen zelden op hetzelfde moment.',
  },
  350000: {
    letter: 'F',
    sectoren: ['sectoren/bouw'],
    toepassing: 'toepassingen/elektrificatie-bedrijfswagens',
    knelpunt:
      'In de bouw staat het materieel &rsquo;s nachts op de eigen werf. Als bestelwagens en machines daar ' +
      'tegelijk aan de lader gaan, is de werfaansluiting het knelpunt en niet de accu.',
  },
  389100: {
    letter: 'I',
    sectoren: ['sectoren/horeca'],
    toepassing: 'toepassingen/pieken-in-verbruik',
    knelpunt:
      'Horeca heeft koeling, keuken en klimaat op dezelfde kleine aansluiting, met een piek die samenvalt met ' +
      'het drukste moment van de dag.',
  },
  422400: {
    letter: 'Q',
    sectoren: ['sectoren/zorgvastgoed'],
    toepassing: 'toepassingen/processen-sturen-met-ems',
    knelpunt:
      'Zorgvastgoed kan niet uit. Continuïteit is hier de eis, en dat maakt sturing over opslag en opwek ' +
      'belangrijker dan het laatste procent rendement.',
  },
  402000: {
    letter: 'L',
    sectoren: ['sectoren/gebiedsontwikkeling', 'sectoren/bedrijventerreinen'],
    toepassing: 'toepassingen/meerdere-locaties',
    knelpunt:
      'Bij verhuurd vastgoed zit de aansluiting bij de eigenaar en de energierekening bij de huurder. Wie ' +
      'investeert en wie de opbrengst krijgt, is hier de eerste vraag en niet de techniek.',
  },
};

/** De bedrijfstakken die een advieslijn mogen bepalen, gesorteerd op hoe
 *  sterk ze in deze gemeente zijn overgerepresenteerd (locatiequotient
 *  aflopend). De eerste is de advieslijn; of hij ook BOVEN het landelijke
 *  gemiddelde ligt, moet de aanroeper toetsen met LQ_STERK. */
export function stuurTakken(profiel) {
  if (!profiel || !profiel.takken) return [];
  return profiel.takken
    .filter((t) => TAK_NAAR_SECTOR[t.sbi] && t.lq_publiceerbaar)
    .slice()
    .sort((a, b) => b.lq - a.lq);
}

/** Een getal met een komma als decimaalteken, voor '1,8 keer'. */
const komma = (n, decimalen = 1) => nf.format(Number(Number(n).toFixed(decimalen)));

/* Het locatiequotient krijgt OVERAL twee decimalen.

   Gemeten defect: de looptekst gebruikte komma(lq, 2) en de opsomming
   komma(lq) met de standaard van één decimaal. Op dezelfde pagina stond
   daardoor "2,85 keer" in de alinea en "2,9x" in de lijst — twee getallen
   voor hetzelfde feit. Bij een maat waar 1,27 en 1,3 een ander verhaal
   vertellen is één decimaal bovendien te grof. */
const lqTekst = (n) => komma(n, 2);

/* De grens voor 'relatief sterk vertegenwoordigd'. 1,25 is de gangbare
   drempel in de economische geografie. Daaronder spreken wij niet van een
   sterke tak, want dan is het verschil met landelijk niet de moeite. */
export const LQ_STERK = 1.25;

/* Een naam die al op een punt eindigt ("Enexis Netbeheer B.V.") krijgt er
   geen tweede bij. Gemeten op de gegenereerde pagina's: "De netbeheerder is
   hier Enexis Netbeheer B.V..". */
export const puntNa = (s) => (/[.!?]$/.test(String(s).trim()) ? '' : '.');

/* CBS codeert een jaarperiode als '2026JJ00'. Dat is een interne sleutel en
   geen peiljaar dat je een bezoeker voorzet. */
function jaarVanPeriode(p) {
  const m = String(p || '').match(/^(\d{4})JJ\d{2}$/);
  return m ? m[1] : String(p || '').trim();
}

/* Het profiel als feitenblok. Dit is bewust rijk aan getallen en namen: dat
   zijn precies de vijfwoordreeksen die per gemeente verschillen. */
export function bedrijfstakProfielBlok(gebiedsnaam, profiel, bron) {
  if (!profiel || !profiel.takken || !profiel.takken.length) return '';

  /* De vier grootste bedrijfstakken naar aantal vestigingen. Dit is het
     feitelijke economische profiel en staat los van wat Vibe aanbiedt. */
  const grootste = profiel.takken.slice(0, 4);

  const sterk = profiel.takken.filter((t) => t.lq_publiceerbaar && t.lq >= LQ_STERK).sort((a, b) => b.lq - a.lq).slice(0, 3);

  let h =
    `<p>De ${getal(profiel.totaal_cbs)} vestigingen in ${esc(gebiedsnaam)} zijn niet gelijk verdeeld over de ` +
    `bedrijfstakken, en die verdeling bepaalt hoe de zakelijke energievraag hier eruitziet. De grootste ` +
    `bedrijfstakken zijn ` +
    grootste
      .map((t) => `<strong>${esc(t.naam)}</strong> (${getal(t.vestigingen)} vestigingen, ${komma(t.aandeel_pct)}%)`)
      .join(', ') +
    `.</p>`;

  if (sterk.length) {
    h +=
      `<p>Afgezet tegen heel Nederland valt op dat ` +
      sterk
        .map((t) => `<strong>${esc(t.naam)}</strong> hier ${lqTekst(t.lq)} keer zo sterk vertegenwoordigd is`)
        .join(', en dat ') +
      `. Dat zegt niets over de omvang van die bedrijven, maar wel waar de zakelijke energievraag in deze ` +
      `gemeente een andere vorm krijgt dan het landelijke gemiddelde.</p>`;
  } else {
    h +=
      `<p>Geen enkele bedrijfstak is in ${esc(gebiedsnaam)} duidelijk sterker vertegenwoordigd dan landelijk. ` +
      `Het profiel is gemengd; de energievraag volgt hier het pand en niet de bedrijfstak.</p>`;
  }

  /* DE VOLLEDIGE TABEL — en waarom hij er staat.

     Met alleen de vier grootste en de drie sterkste bedrijfstakken faalde
     poort 11 op 45 van de 92.665 paren (hoogste jaccard 0,63 tegen een
     drempel van 0,60). Het waren precies de paren waar twee gemeenten een
     vergelijkbaar profiel hebben: de Waddeneilanden onderling, en een
     handvol plattelandsgemeenten in Gelderland en Fryslân.

     De oplossing is niet de drempel verlagen en niet de tekst herschrijven,
     maar MEER ECHTE INFORMATIE geven. Deze opsomming is het volledige
     officiële bedrijfstakprofiel van de gemeente. Dat is geen opvulling: een
     ondernemer kan hier zijn eigen bedrijfstak opzoeken, en dat kon op de
     vorige versie van deze pagina niet.

     Dat het ook de vijfwoordoverlap verlaagt is een gevolg en geen truc: de
     aantallen en percentages verschillen per gemeente, dus elke regel levert
     reeksen op die geen zusterpagina heeft. Het percentage staat er bewust
     bij — twee gemeenten kunnen hetzelfde afgeronde aantal hebben bij een
     ander totaal, en dan verschilt het percentage alsnog. */
  const metWaarde = profiel.takken.filter((t) => t.vestigingen > 0);
  if (metWaarde.length) {
    h +=
      `<p>Het volledige beeld, alle bedrijfstakken op een rij:</p>` +
      `<ul class="ve-footer__lijst" style="margin-top:var(--ve-s-md)">\n` +
      metWaarde
        .map(
          (t) =>
            `          <li><strong>${esc(t.naam)}</strong>` +
            `<span class="ve-small" style="display:block">${getal(t.vestigingen)} vestigingen &middot; ` +
            `${komma(t.aandeel_pct)}% van het totaal` +
            (t.lq_publiceerbaar ? ` &middot; ${lqTekst(t.lq)}x het landelijke aandeel` : '') +
            `</span></li>`
        )
        .join('\n') +
      `\n        </ul>`;
  }

  /* LET OP: bronregel() doet esc() over de naam. HTML-entiteiten die je hier
     meegeeft worden dus DUBBEL ge-escaped en komen letterlijk op de pagina te
     staan. Gemeten op de gerenderde pagina: er stond "secties A&ndash;U".
     Hier horen echte tekens, geen entiteiten. */
  h += bronregel([
    {
      ...bron,
      naam:
        `${bron.naam}, bedrijfstakken SBI 2008 secties A–U, peiljaar ${jaarVanPeriode(profiel._periode)}` +
        ` — de verhouding tot het landelijke aandeel is onze eigen berekening op deze cijfers`,
    },
  ]);

  /* CBS rondt elke waarde af op een vijfvoud. Dat moet op de pagina staan,
     anders suggereert '115 vestigingen' een precisie die de bron niet geeft. */
  h +=
    `<p class="ve-small">CBS rondt deze aantallen af op vijfvouden. De percentages zijn berekend over de som van ` +
    `de bedrijfstakken (${getal(profiel.totaal_secties)}); die som kan door het afronden een paar vestigingen ` +
    `verschillen van het gepubliceerde totaal van ${getal(profiel.totaal_cbs)}.</p>`;
  return h;
}

/* De advieslijn: wat betekent dit profiel voor een bedrijf hier.
   Kort gehouden en met de eigen cijfers van de gemeente erin, zodat de
   gedeelde zin niet de pagina domineert. */
export function profielAdvies(gebiedsnaam, profiel, bron, linkHref, naamVanRoute) {
  const takken = stuurTakken(profiel);
  if (!takken.length) return '';
  const t = takken[0];
  const m = TAK_NAAR_SECTOR[t.sbi];

  const sectorLinks = m.sectoren
    .map((r) => `<a class="ve-link" href="${linkHref(r)}">${esc(naamVanRoute(r))}</a>`)
    .join(' en ');

  /* Een locatiequotient onder de sterkgrens mag NIET als 'bovengemiddeld'
     worden gepresenteerd. In een gemeente met een gemengd profiel is de
     leidende tak gewoon het grootste zakelijke segment, en dat is een ander
     en zwakker argument. Het verschil benoemen is het verschil tussen een
     feit en een verkooppraatje. */
  const sterkGenoeg = t.lq >= LQ_STERK;

  return (
    `<p>In ${esc(gebiedsnaam)} zitten <strong>${getal(t.vestigingen)} vestigingen</strong> in ${esc(t.naam)}` +
    (sterkGenoeg
      ? `, ${lqTekst(t.lq)} keer het landelijke aandeel. `
      : ` &mdash; van de bedrijfstakken die wij bedienen is dat hier de sterkste, zonder dat hij boven het ` +
        `landelijke gemiddelde uitkomt (${lqTekst(t.lq)}x). `) +
    `${m.knelpunt}</p>` +
    `<p>Wat dat concreet betekent en wat er aan te doen is, staat op ${sectorLinks}` +
    (m.toepassing ? ` en op <a class="ve-link" href="${linkHref(m.toepassing)}">${esc(naamVanRoute(m.toepassing))}</a>` : '') +
    `.</p>` +
    /* Poort 10 eist een zichtbare bronregel in ELKE sectie die een cijfer
       noemt, ook als de bron een sectie hoger al staat. Die regel is goed:
       wie één sectie scant, moet daar de herkomst zien staan en niet hoeven
       zoeken. De twee getallen hier komen uit dezelfde CBS-tabel als het
       profiel erboven. */
    bronregel([bron])
  );
}

/* ------------------------------------------------------------- congestie */
export function congestieAlinea(gebiedsnaam) {
  return (
    `<p>Of er in ${esc(gebiedsnaam)} transportcapaciteit beschikbaar is, is <strong>geen eigenschap van de gemeente</strong>. ` +
    `Netbeheerders publiceren beperkingen per voedingsgebied, en een voedingsgebied is een verzameling postcodes rond één ` +
    `onderstation — die grens loopt dwars door gemeentegrenzen heen. Vrijwel elke gemeente wordt door meerdere ` +
    `voedingsgebieden geraakt. Eén status voor een hele gemeente bestaat dus niet, en wij publiceren er geen.</p>` +
    `<p>Wat u wél kunt doen: zoek uw eigen postcode op in de Capaciteitskaart van Netbeheer Nederland. Daar staat per ` +
    `voedingsgebied of er ruimte is voor afname en voor invoeding, en of er een wachtrij is.</p>` +
    `<p><a class="ve-link" href="${CAPACITEITSKAART}" rel="nofollow noopener" target="_blank">Capaciteitskaart elektriciteitsnet &mdash; zoek op postcode</a></p>`
  );
}

/* De KORTE congestievariant, voor gemeentepagina's.

   WAAROM DEZE ER IS — gemeten, niet bedacht.
   congestieAlinea() is ongeveer 150 woorden en staat WOORDELIJK GELIJK op elke
   regionale pagina; alleen de gebiedsnaam verschilt. Bij 11 gemeentepagina's
   is dat te dragen. Bij 338 is het de grootste enkele bron van
   vijfwoordoverlap die er is: ruim een kwart van de hoofdtekst van elke
   pagina zou identiek zijn aan die van elke andere.

   De uitleg zelf is niet lokaal — het is landelijke kennis en die heeft al
   een eigen pagina, /kennis/netcongestie-uitgelegd. Die pagina is de
   canonieke eigenaar van die zoekintentie. Hem op 338 gemeentepagina's
   herhalen is bovendien kannibalisatie van het eigen kennisartikel.

   Deze variant houdt de ene uitspraak die WEL nodig is op een gemeentepagina
   (een gemeente heeft geen congestiestatus, en wij kennen er geen toe) en
   verwijst voor de uitleg door. Provinciepagina's houden de lange variant:
   er zijn er twaalf, en op dat niveau zijn er geen 338 zusterpagina's. */
export function congestieKort(gebiedsnaam, linkHref) {
  return (
    `<p>Transportcapaciteit is <strong>geen eigenschap van een gemeente</strong>. Netbeheerders publiceren ` +
    `beperkingen per voedingsgebied, en zo'n gebied loopt dwars door gemeentegrenzen. Wij kennen ${esc(gebiedsnaam)} ` +
    `daarom geen congestiestatus toe.</p>` +
    `<p><a class="ve-link" href="${linkHref('kennis/netcongestie-uitgelegd')}">Hoe netcongestie werkt</a> &middot; ` +
    `<a class="ve-link" href="${CAPACITEITSKAART}" rel="nofollow noopener" target="_blank">Capaciteitskaart &mdash; zoek op uw postcode</a></p>`
  );
}

/* Een gemeente zonder eigen project moet dat ZEGGEN, niet suggereren.

   De oude pagina opende met 'Wat Vibe Energy in X heeft opgeleverd' en het
   directe antwoord begon met 'Vibe Energy heeft in de gemeente X 0 projecten
   opgeleverd'. Voor de 11 gemeenten met werk is dat correct. Voor de 327
   zonder werk is het een belofte die de pagina niet nakomt, en '0 projecten'
   als eerste zin is een reden om weg te klikken.

   Deze alinea zegt het eerlijk en verwijst naar waar het werk wél staat. */
export function geenEigenProjectAlinea(gebiedsnaam, provincienaam, provincieRoute, linkHref) {
  return (
    `<p>In ${esc(gebiedsnaam)} heeft Vibe Energy <strong>nog geen project opgeleverd</strong>. Deze pagina staat er ` +
    `voor de officiële cijfers over de bedrijvigheid hier en voor de weg naar de juiste oplossing &mdash; niet om ` +
    `werk te suggereren dat er niet is.</p>` +
    `<p>Wat er in ${esc(provincienaam)} wél staat, vindt u op ` +
    `<a class="ve-link" href="${linkHref(provincieRoute)}">de provinciepagina ${esc(provincienaam)}</a>.</p>`
  );
}

/* --------------------------------------------------------- eigen projecten
   Noemt wat er is gebouwd, met naam, plaats, jaar en sector. Zonder cijfers:
   die staan op de projectpagina en horen daar te blijven. */
export function projectenBlok(gebiedsnaam, lijst) {
  if (!lijst || !lijst.length) return '';
  const regels = lijst
    .map((p) => {
      const waar = p.plaats_is_gemeente ? esc(p.plaats) : `${esc(p.plaats)}, gemeente ${esc(gebiedsnaam)}`;
      const sector = p.sector ? ` &middot; ${esc(p.sector)}` : '';
      const jaar = p.opgeleverd ? ` &middot; ${esc(p.opgeleverd)}` : '';
      return (
        `          <li><a class="ve-link" href="${href(p.route)}">${esc(p.titel)}</a>` +
        `<span class="ve-small" style="display:block">${waar}${sector}${jaar}</span></li>`
      );
    })
    .join('\n');
  return (
    `<p>Dit is wat hier daadwerkelijk is gerealiseerd. De technische en financiële gegevens staan op de projectpagina zelf.</p>\n` +
    `        <ul class="ve-footer__lijst" style="margin-top:var(--ve-s-md)">\n${regels}\n        </ul>`
  );
}

/* ------------------------------------------------- de families op de pagina */
export function familieRegels(families) {
  return families
    .map((f) => ({ kop: f.naam, tekst: f.belofte, route: f.route, label: `Bekijk ${f.naam.toLowerCase()}` }))
    .filter((x) => x.route);
}

/** Korte belofte per familie, voor kaarten op een regionale pagina. */
export const FAMILIE_BELOFTE = {
  'zakelijke-batterij':
    'Een gestuurde batterij vangt de piek op en bewaart eigen opwek, zodat er ruimte vrijkomt op de aansluiting die er al ligt.',
  netcongestie:
    'Groeien terwijl de netbeheerder geen extra transportvermogen kan leveren: door de bestaande aansluiting slimmer te gebruiken in plaats van te verzwaren.',
  'zonnepanelen-bedrijven':
    'Opwek op het bedrijfsdak, ontworpen op het verbruiksprofiel van het pand in plaats van op het maximale aantal panelen.',
  'zakelijke-laadpalen':
    'Laadpunten voor personeel, bezoekers en bedrijfswagens, die zich voegen naar de capaciteit die over is.',
  laadplein:
    'Meerdere laadpunten op één terrein, met opslag en sturing ertussen zodat de aansluiting niet mee hoeft te groeien.',
  ems:
    'Eén stuurlaag over opslag, opwek en laden, die bepaalt wat er op welk moment gebeurt.',
  'peak-shaving': 'De korte gelijktijdige piek afvlakken die uw gecontracteerde vermogen voor het hele jaar bepaalt.',
  energieadvies: 'Eerst meten en rekenen, dan pas bouwen: wat levert welke ingreep op uw locatie werkelijk op.',
  'verduurzaming-bedrijfspanden':
    'De energieprestatie van een pand verbeteren met ingrepen die zich in de exploitatie terugbetalen.',
  'energiecentrale-achter-de-meter':
    'Losse installaties verbinden tot één lokale energievoorziening achter de meter.',
};
