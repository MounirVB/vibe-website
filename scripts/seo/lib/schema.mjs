/* ============================================================================
   VIBE ENERGY — STRUCTURED DATA
   ----------------------------------------------------------------------------
   Eén @graph per pagina, met stabiele @id's zodat knopen naar elkaar kunnen
   verwijzen. Wat hier NIET in komt, en waarom:

   · geen AggregateRating, Review of Offer — er is geen beoordelings- of
     prijsbron; nepsterren zijn een handhavingsrisico en een leugen.
   · geen areaServed met 342 gemeenten — Vibe bedient niet aantoonbaar elke
     gemeente. areaServed staat op Nederland, en alleen een regionale pagina
     met bewezen lokaal werk noemt het gebied.
   · geen LocalBusiness met een verzonnen vestiging per gemeente. Er is één
     vestiging: Utrechtseweg 310 B46, Arnhem.
   ============================================================================ */
import { HOST } from './paden.mjs';

export const ORG_ID = `${HOST}/#org`;
export const SITE_ID = `${HOST}/#website`;

export const BEDRIJF = {
  naam: 'Vibe Energy',
  rechtsvorm: 'Vibe Energy B.V.',
  straat: 'Utrechtseweg 310 B46',
  postcode: '6812 AR',
  plaats: 'Arnhem',
  land: 'NL',
  tel: '+31850600489',
  mail: 'info@vibeenergy.nl',
  kvk: '92191487',
  btw: 'NL865924910B01',
  logo: `${HOST}/assets/vibe-energy-logo-dark.svg`,
};

export function organisatie() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: BEDRIJF.naam,
    legalName: BEDRIJF.rechtsvorm,
    url: `${HOST}/`,
    logo: BEDRIJF.logo,
    email: BEDRIJF.mail,
    telephone: BEDRIJF.tel,
    vatID: BEDRIJF.btw,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BEDRIJF.straat,
      postalCode: BEDRIJF.postcode,
      addressLocality: BEDRIJF.plaats,
      addressCountry: BEDRIJF.land,
    },
    areaServed: { '@type': 'Country', name: 'Nederland' },
  };
}

export function website() {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: `${HOST}/`,
    name: BEDRIJF.naam,
    publisher: { '@id': ORG_ID },
    inLanguage: 'nl-NL',
  };
}

export function webpagina({ url, titel, beschrijving, gewijzigd, type = 'WebPage' }) {
  const knoop = {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name: titel,
    description: beschrijving,
    isPartOf: { '@id': SITE_ID },
    inLanguage: 'nl-NL',
    breadcrumb: { '@id': `${url}#kruimels` },
  };
  if (gewijzigd) knoop.dateModified = gewijzigd;
  return knoop;
}

/** kruimels: [{naam, url}] — de laatste is de huidige pagina. */
export function kruimelpad(paginaUrl, kruimels) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${paginaUrl}#kruimels`,
    itemListElement: kruimels.map((k, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: k.naam,
      item: k.url,
    })),
  };
}

/** vragen: [{vraag, antwoord}] — alleen aanroepen als de vragen ook zichtbaar
    op de pagina staan. Verborgen FAQ-markup is een richtlijnovertreding. */
export function faq(paginaUrl, vragen) {
  return {
    '@type': 'FAQPage',
    '@id': `${paginaUrl}#faq`,
    mainEntity: vragen.map((v) => ({
      '@type': 'Question',
      name: v.vraag,
      acceptedAnswer: { '@type': 'Answer', text: v.antwoord },
    })),
  };
}

/** Een dienst zonder prijs en zonder beoordeling. */
export function dienst(paginaUrl, { naam, beschrijving, gebied }) {
  const d = {
    '@type': 'Service',
    '@id': `${paginaUrl}#dienst`,
    name: naam,
    description: beschrijving,
    provider: { '@id': ORG_ID },
    serviceType: naam,
  };
  d.areaServed = gebied || { '@type': 'Country', name: 'Nederland' };
  return d;
}

/** Kennisartikel. `gewijzigd` moet een echte wijzigingsdatum zijn. */
export function artikel(paginaUrl, { titel, beschrijving, gepubliceerd, gewijzigd }) {
  return {
    '@type': 'TechArticle',
    '@id': `${paginaUrl}#artikel`,
    headline: titel,
    description: beschrijving,
    datePublished: gepubliceerd,
    dateModified: gewijzigd || gepubliceerd,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    inLanguage: 'nl-NL',
    isPartOf: { '@id': SITE_ID },
  };
}

/** Bestuurlijk gebied. `code` is de CBS-gemeentecode of de provinciecode. */
export function gebied(paginaUrl, { naam, soort, code, ouderNaam, centroide }) {
  const g = {
    '@type': soort === 'provincie' ? 'AdministrativeArea' : 'AdministrativeArea',
    '@id': `${paginaUrl}#gebied`,
    name: naam,
    identifier: code,
    additionalType: soort === 'provincie' ? 'https://schema.org/State' : 'https://schema.org/City',
  };
  if (ouderNaam) g.containedInPlace = { '@type': 'AdministrativeArea', name: ouderNaam };
  if (centroide) g.geo = { '@type': 'GeoCoordinates', latitude: centroide.lat, longitude: centroide.lon };
  return g;
}

export function graaf(knopen) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': knopen.filter(Boolean) });
}
