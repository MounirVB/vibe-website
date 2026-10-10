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
