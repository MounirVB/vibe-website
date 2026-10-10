/* ============================================================================
   VIBE ENERGY — HET NIEUWSKANAAL (/nieuws)
   ----------------------------------------------------------------------------
   Release 1 reserveerde het padsegment en legde het contract vast in
   data/seo/nieuws-architectuur.json. Dit bestand vult het in.

   WAT HIER ANDERS IS DAN BIJ EEN NATIONALE PAGINA
   Een nieuwsartikel typt zijn navigatie niet uit. Het kruimelpad, de verwante
   links en de bronnenlijst worden AFGELEID uit de contractvelden
   (`onderwerp_eigenaar`, `oplossing_links`, `regio_links`, `bronnen`). Reden:
   die velden worden door het intelligenceplatform geschreven, en een
   machine die zijn eigen kruimelpad uittypt kan dat fout doen zonder dat
   iemand het merkt. Afleiden kan niet uit de pas lopen.

   DRIE DINGEN DIE HIER BEWUST NIET GEBEUREN

   1 · GEEN CATEGORIEROUTES. De opdracht vraagt categorieën. Die zijn hier
       groepen OP de overzichtspagina, met een anker per onderwerp — niet
       /nieuws/categorie/<x> als eigen URL. Met nul tot enkele artikelen per
       onderwerp zou elke categoriepagina een dunne pagina zijn die de
       nationale pagina op dezelfde term beconcurreert. Het contract verbiedt
       dat laatste expliciet ("De bestaande commerciële pagina's laten
       kannibaliseren door een nieuwsartikel op dezelfde term"). Zodra een
       onderwerp genoeg artikelen heeft om een eigen pagina te verdienen, is
       dat een redactioneel besluit, geen automatisch gevolg van een teller.

   2 · GEEN AUTEURSNAAM. De site heeft geen redactieprofielen. De organisatie
       is auteur; een verzonnen journalist is een verzinsel.

   3 · GEEN SAMENVATTING VAN EEN ANDER ARTIKEL. Dat staat in het contract
       onder `wat_release_2_NIET_mag_doen` en wordt aan de schrijvende kant
       afgedwongen, niet hier. Deze generator maakt alleen op wat hij krijgt.

   Draaien: via scripts/seo/genereer.mjs
   ============================================================================ */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { url, href, routeGemeente, routeProvincie } from './lib/paden.mjs';
import {
  pagina,
  opening,
  directAntwoord,
  tekstsectie,
  kaarten,
  faqSectie,
  verwant,
  conversie,
  esc,
} from './lib/sjabloon.mjs';
import { nieuwsartikel, faq as faqLd } from './lib/schema.mjs';
import { naamVan } from './lib/links.mjs';
import { normaliseerHrefs, sectieHtml } from './genereer-nationaal.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');
const lees = (...p) => JSON.parse(readFileSync(resolve(wortel, ...p), 'utf8'));

export const NIEUWS_WORTEL = 'nieuws';

/* Labels voor de brontypen uit het contract. Zichtbaar op de pagina, zodat een
   lezer ziet of een feit van een wetgever of van een leverancier komt. */
const BRONSOORT_LABEL = {
  WETGEVING: 'wetgeving',
  TOEZICHTHOUDER: 'toezichthouder',
  NETBEHEERDER: 'netbeheerder',
  STATISTIEK: 'statistiek',
  MARKTPARTIJ: 'marktpartij',
  EIGEN_MEETDATA: 'eigen meetdata',
};

/** Alle artikelbestanden onder data/inhoud/nieuws/, op route gesorteerd. */
function artikelbestanden() {
  const map = resolve(wortel, 'data', 'inhoud', NIEUWS_WORTEL);
  if (!existsSync(map)) return [];
  return readdirSync(map)
    .filter((b) => b.endsWith('.json'))
    .map((b) => {
      const pad = join(map, b);
      return { pad, bestandsnaam: b, j: JSON.parse(readFileSync(pad, 'utf8')) };
    })
    .sort((a, b) => String(a.j.route).localeCompare(String(b.j.route)));
}

/* Geo is nodig om een regio_link (een gemeente- of provinciecode) om te zetten
   naar de route die erbij hoort. Een code zonder gepubliceerde pagina levert
   geen link op; de linkmotor filtert dat er daarna nog eens uit. */
function geoIndex() {
  const provincies = lees('data', 'geo', 'provincies.json').provincies;
  const gemeenten = lees('data', 'geo', 'gemeenten.json').gemeenten;
  const op = new Map();
  for (const p of provincies) op.set(p.provinciecode, { naam: p.naam, route: routeProvincie(p.slug) });
  for (const g of gemeenten) {
    op.set(g.gemeentecode, { naam: g.naam, route: routeGemeente(g.provincie_slug, g.slug) });
  }
  return op;
}

/** De datumregel. Zichtbaar, want een nieuwsfeit zonder datum veroudert blind. */
function datumregel(j) {
  const delen = [`<time datetime="${esc(j.gepubliceerd)}">Gepubliceerd op ${esc(j.gepubliceerd)}</time>`];
  if (j.gewijzigd && j.gewijzigd !== j.gepubliceerd) {
    delen.push(`<time datetime="${esc(j.gewijzigd)}">bijgewerkt op ${esc(j.gewijzigd)}</time>`);
  }
  return `<p class="ve-small" data-nieuws-datum>${delen.join(' &middot; ')}</p>`;
}

/**
 * De zichtbare bronnenlijst. Verplicht op elk artikel: het contract eist een
 * zichtbare peildatum per bron, en poort 16 faalt als die ontbreekt.
 */
function bronnenSectie(bronnen) {
  const rijen = bronnen
    .map((b) => {
      const soort = BRONSOORT_LABEL[String(b.soort || '').toUpperCase()] || 'bron';
      return (
        `          <li><a class="ve-link" href="${esc(b.url)}" rel="nofollow noopener" target="_blank">${esc(b.naam)}</a>` +
        ` <span class="ve-small">(${esc(soort)}, geraadpleegd op ${esc(b.datum)})</span></li>`
      );
    })
    .join('\n');
  return tekstsectie({
    id: 'bronnen',
    kop: 'Bronnen',
    lead: 'Elk feit in dit bericht is terug te voeren op een van deze bronnen, met de datum waarop die is geraadpleegd.',
    prose: `        <ul>\n${rijen}\n        </ul>`,
    variant: 've-sec--paper ve-sec--line-y',
  });
}

/* ========================================================== artikelpagina */
function bouwArtikel({ j, route, motor, schrijf, geo }) {
  const paginaUrl = url(route);
  const eigenaar = String(j.onderwerp_eigenaar || '').replace(/^\/+/, '');
  const eigenaarNaam = naamVan(eigenaar, j.onderwerp_eigenaar_naam || eigenaar);
  const bronnen = Array.isArray(j.bronnen) ? j.bronnen : [];

  const kruimels = [{ naam: 'Nieuws', route: NIEUWS_WORTEL }];

  /* Verwante links, in de keten die de opdracht vraagt: van het bericht naar
     het onderwerp dat het bezit, dan naar de oplossing, dan naar de regio. */
  const groepen = [
    { kop: 'Het onderwerp', items: [{ route: eigenaar, naam: eigenaarNaam }] },
    {
      kop: 'Oplossingen',
      items: (j.oplossing_links || []).map((r) => {
        const k = String(r).replace(/^\/+/, '');
        return { route: k, naam: naamVan(k) };
      }),
    },
    {
      kop: 'Kennis',
      items: (j.kennis_links || []).map((r) => {
        const k = String(r).replace(/^\/+/, '');
        return { route: k, naam: naamVan(k) };
      }),
    },
    {
      kop: "Regio's",
      items: (j.regio_links || [])
        .map((code) => geo.get(code))
        .filter(Boolean)
        .map((g) => ({ route: g.route, naam: g.naam })),
    },
  ]
    .map((g) => ({ kop: g.kop, items: motor.filter(g.items) }))
    .filter((g) => g.items.length);

  for (const g of groepen) motor.tel(route, g.items);

  const delen = [
    opening({
      kruimels,
      kruimelLabel: j.kruimel_label || j.og_titel || j.h1,
      h1: j.h1,
      lead: normaliseerHrefs(j.lead, motor),
      naLead: datumregel(j),
    }),
    j.direct_antwoord
      ? directAntwoord({
          vraag: j.direct_antwoord.vraag,
          antwoord: normaliseerHrefs(j.direct_antwoord.antwoord, motor),
          voorbehoud: j.direct_antwoord.voorbehoud
            ? normaliseerHrefs(j.direct_antwoord.voorbehoud, motor)
            : null,
          bronnen: bronnen.slice(0, 2),
        })
      : '',
    ...(j.secties || []).map((s) => sectieHtml(s, motor)),
    bronnenSectie(bronnen),
    j.faq && j.faq.length
      ? faqSectie({
          kop: j.faq_kop || 'Veelgestelde vragen',
          vragen: j.faq.map((v) => ({ vraag: v.vraag, antwoord: normaliseerHrefs(v.antwoord, motor) })),
        })
      : '',
    verwant(groepen),
    conversie({
      kop: j.conversie?.kop || 'Wat betekent dit voor uw locatie?',
      tekst:
        j.conversie?.tekst ||
        'Een marktontwikkeling zegt nog niets over uw aansluiting, uw profiel of uw contract. Leg uw situatie naast dit bericht in een adviesgesprek.',
      primair:
        j.conversie?.primair && motor.isIndex(String(j.conversie.primair.route).replace(/^\/+/, ''))
          ? j.conversie.primair
          : { route: 'contact', label: 'Plan een adviesgesprek' },
      secundair: motor.isIndex(eigenaar) ? { route: eigenaar, label: `Over ${eigenaarNaam}` } : null,
    }),
  ].filter(Boolean);

  const extra = [
    nieuwsartikel(paginaUrl, {
      titel: j.og_titel || j.h1,
      beschrijving: j.beschrijving,
      gepubliceerd: j.gepubliceerd,
      gewijzigd: j.gewijzigd || j.gepubliceerd,
      bronnen,
      eigenaarUrl: motor.isIndex(eigenaar) ? url(eigenaar) : null,
    }),
  ];
  if (j.faq && j.faq.length) extra.push(faqLd(paginaUrl, j.faq));

  schrijf(
    route,
    pagina({
      route,
      titel: j.titel,
      beschrijving: j.beschrijving,
      ogTitel: j.og_titel || j.h1,
      ogBeschrijving: j.og_beschrijving || j.beschrijving,
      ogBeeld: j.og_beeld || null,
      dataPagina: j.data_pagina || 'nieuws',
      kruimels,
      kruimelLabel: j.kruimel_label || j.og_titel || j.h1,
      gewijzigd: j.gewijzigd || j.gepubliceerd,
      extraKnopen: extra,
      inhoud: delen.join('\n\n'),
    })
  );
}

/* ============================================================== de hub */
function bouwHub({ gepubliceerd, motor, schrijf }) {
  const route = NIEUWS_WORTEL;

  /* Groeperen op onderwerp-eigenaar. Dat IS de categorie: het onderwerp dat
     de commerciële intentie bezit. Nieuwste eerst binnen een groep. */
  const perOnderwerp = new Map();
  for (const a of gepubliceerd) {
    const eigenaar = String(a.j.onderwerp_eigenaar || '').replace(/^\/+/, '');
    if (!perOnderwerp.has(eigenaar)) perOnderwerp.set(eigenaar, []);
    perOnderwerp.get(eigenaar).push(a);
  }
  for (const lijst of perOnderwerp.values()) {
    lijst.sort((x, y) => String(y.j.gepubliceerd).localeCompare(String(x.j.gepubliceerd)));
  }

  /* Groepen op aflopende recentheid van hun nieuwste bericht, zodat wat leeft
     bovenaan staat en de orde deterministisch blijft. */
  const groepen = [...perOnderwerp.entries()].sort((a, b) => {
    const da = String(a[1][0].j.gepubliceerd);
    const db = String(b[1][0].j.gepubliceerd);
    return db.localeCompare(da) || a[0].localeCompare(b[0]);
  });

  const alles = gepubliceerd
    .slice()
    .sort((x, y) => String(y.j.gepubliceerd).localeCompare(String(x.j.gepubliceerd)));
  const nieuwste = alles[0];

  const indexItems = motor.filter(alles.map((a) => ({ route: a.route, naam: a.j.og_titel || a.j.h1 })));
  motor.tel(route, indexItems);

  const secties = [
    opening({
      kruimels: [],
      kruimelLabel: 'Nieuws',
      h1: 'Nieuws en marktontwikkelingen',
      lead:
        'Ontwikkelingen in netcongestie, tarieven, regelgeving en subsidies die iets veranderen aan ' +
        'de businesscase van een zakelijke energie-installatie. Elk bericht noemt zijn bron en de ' +
        'datum waarop die is geraadpleegd.',
    }),
  ];

  /* Een ankerlijst als er meer dan één onderwerp is. Dit zijn de categorieën,
     zonder er eigen URL's van te maken. */
  if (groepen.length > 1) {
    const ankers = groepen
      .map(([eigenaar, lijst]) => {
        const naam = naamVan(eigenaar, eigenaar);
        return `<a class="ve-link" href="#onderwerp-${esc(eigenaar.replace(/\//g, '-'))}">${esc(naam)} (${lijst.length})</a>`;
      })
      .join(' &middot; ');
    secties.push(`  <section class="ve-sec ve-sec--tight ve-sec--paper ve-sec--line-y">
    <div class="ve-wrap">
      <p class="ve-small">Onderwerpen: ${ankers}</p>
    </div>
  </section>`);
  }

  for (const [eigenaar, lijst] of groepen) {
    const naam = naamVan(eigenaar, eigenaar);
    const kaartjes = lijst.map((a) => ({
      kop: esc(a.j.og_titel || a.j.h1),
      tekst: `${esc(a.j.beschrijving)} <span class="ve-small">(${esc(a.j.gepubliceerd)})</span>`,
      route: motor.isIndex(a.route) ? a.route : null,
      label: motor.isIndex(a.route) ? 'Lees het bericht' : null,
    }));
    secties.push(
      kaarten({
        id: `onderwerp-${eigenaar.replace(/\//g, '-')}`,
        kop: naam,
        lead: motor.isIndex(eigenaar)
          ? `Deze berichten horen bij <a class="ve-link" href="${href(eigenaar)}">${esc(naam)}</a>.`
          : null,
        kaarten: kaartjes,
      })
    );
  }

  const onderwerpItems = motor.filter(groepen.map(([e]) => ({ route: e, naam: naamVan(e, e) })));
  motor.tel(route, onderwerpItems);

  secties.push(
    verwant([
      { kop: 'Alle berichten', items: indexItems },
      { kop: 'Onderwerpen', items: onderwerpItems },
    ])
  );

  secties.push(
    conversie({
      kop: 'Wat betekent dit voor uw locatie?',
      tekst:
        'Marktontwikkelingen zeggen nog niets over uw aansluiting, uw verbruiksprofiel of uw ' +
        'contract. In een adviesgesprek leggen we ze naast uw situatie.',
      primair: { route: 'contact', label: 'Plan een adviesgesprek' },
    })
  );

  schrijf(
    route,
    pagina({
      route,
      titel: 'Nieuws en marktontwikkelingen | Vibe Energy',
      beschrijving:
        'Ontwikkelingen in netcongestie, nettarieven, regelgeving en subsidies die de businesscase ' +
        'van een zakelijke energie-installatie veranderen. Met bron en peildatum.',
      ogTitel: 'Nieuws en marktontwikkelingen',
      dataPagina: 'nieuws',
      kruimels: [],
      kruimelLabel: 'Nieuws',
      gewijzigd: nieuwste ? nieuwste.j.gewijzigd || nieuwste.j.gepubliceerd : undefined,
      inhoud: secties.filter(Boolean).join('\n\n'),
    })
  );
}

/* ============================================================ hoofdingang */
export function bouwNieuws({ register, motor, schrijf }) {
  const bestanden = artikelbestanden();
  const geo = geoIndex();
  const fouten = [];
  const gepubliceerd = [];

  for (const { pad, j } of bestanden) {
    const route = String(j.route || '').replace(/^\/+/, '');
    if (!route) {
      fouten.push(`${pad}: geen route`);
      continue;
    }
    if (route === NIEUWS_WORTEL) {
      fouten.push(
        `${pad}: de hub /nieuws wordt gegenereerd uit de artikelen; een inhoudsbestand voor die route wordt genegeerd`
      );
      continue;
    }
    const r = register.get(route);
    if (!r) {
      fouten.push(`${pad}: route '${route}' staat niet in het register`);
      continue;
    }
    if (r.staat !== 'INDEX') continue;
    gepubliceerd.push({ route, j, pad });
  }

  /* De artikelen eerst: de hub linkt ernaar en moet weten wat INDEX is. */
  for (const a of gepubliceerd) bouwArtikel({ ...a, motor, schrijf, geo });

  const hubIsIndex = register.get(NIEUWS_WORTEL)?.staat === 'INDEX';
  if (hubIsIndex) {
    if (!gepubliceerd.length) {
      fouten.push('de hub /nieuws staat op INDEX maar er is geen enkel gepubliceerd artikel');
    } else {
      bouwHub({ gepubliceerd, motor, schrijf });
    }
  }

  if (fouten.length) {
    for (const f of fouten) console.error(`NIEUWSFOUT: ${f}`);
    process.exitCode = 1;
  }

  return { artikelen: gepubliceerd.length, hub: hubIsIndex, kandidaten: bestanden.length, fouten };
}
