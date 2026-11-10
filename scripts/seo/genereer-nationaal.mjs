/* ============================================================================
   VIBE ENERGY — NATIONALE PAGINA'S UIT INHOUDSBESTANDEN
   ----------------------------------------------------------------------------
   De vorm komt hier uit data/inhoud/<type>/<slug>.json, niet uit bewijs. Dat
   maakt het mogelijk om de redactie te scheiden van de opmaak: één bestand per
   pagina, zodat er nooit twee schrijvers in hetzelfde bestand zitten.

   Het schema staat in data/inhoud/SCHEMA.md. De poort in audit.mjs dwingt af
   dat elk cijfer in de tekst een claim met bron-URL en brondatum heeft.
   ============================================================================ */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { url, href } from './lib/paden.mjs';
import { pagina, opening, directAntwoord, tekstsectie, kaarten, specs, faqSectie, verwant, conversie, esc, bronregel, ic,
         mediaBlok, projectband, statement, beeldband, canvasband,
         railsectie, kaartrij12, specblok, feitenstrook, artikelrij, uitspraakband, noot, artikelkop } from './lib/sjabloon.mjs';
import { beeldTag, beeldVoor, beeldenVoor, projectFiltersVoor } from './lib/beeld.mjs';
import { artikel, dienst, faq as faqLd } from './lib/schema.mjs';
import { naamVan } from './lib/links.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');

/* Het projectregister. Zestien echte projecten met slug, plaats, sector,
   sectorFilter, beeld en beeldAlt — dezelfde bron die de projectpagina's en
   de projectenoverzichtspagina voeden. Hier alleen gelezen, nooit aangevuld. */
const ALLE_PROJECTEN = JSON.parse(
  readFileSync(join(wortel, 'scripts', 'projecten.json'), 'utf8')
).projecten;

function alleInhoud() {
  const basis = resolve(wortel, 'data', 'inhoud');
  const uit = [];
  if (!existsSync(basis)) return uit;
  const loop = (map) => {
    for (const d of readdirSync(map, { withFileTypes: true })) {
      const p = join(map, d.name);
      if (d.isDirectory()) loop(p);
      else if (d.name.endsWith('.json')) uit.push({ pad: p, j: JSON.parse(readFileSync(p, 'utf8')) });
    }
  };
  loop(basis);
  return uit.sort((a, b) => String(a.j.route).localeCompare(String(b.j.route)));
}

/**
 * Normaliseert interne links in redactionele HTML.
 *
 * TWEE DINGEN, en beide zijn een vangnet voor door mensen of agents getypte
 * HTML in een `alineas`-regel:
 *
 * 1 ROOT-RELATIEF EN EXTENSIELOOS. Een schrijver typt `href="project-ratio-16"`.
 *   Op een wortelpagina klopt dat, op /sectoren/automotive wijst het naar
 *   /sectoren/project-ratio-16. Alles krijgt daarom een leidende schuine streep
 *   en verliest een eventuele .html.
 *
 * 2 GEEN LINK NAAR EEN PENDING-ROUTE. De linkmotor filtert `verwant` en de
 *   kaarten al, maar een rauwe <a> in de lopende tekst ontsnapte daaraan. Zo'n
 *   link wijst naar een pagina die niet bestaat: een 404 voor de bezoeker en
 *   verspild crawlbudget. Hij wordt hier uitgekleed tot gewone tekst, zodat de
 *   zin blijft lopen. Zodra de route INDEX wordt, komt de link bij de volgende
 *   generatorrun automatisch terug.
 *
 * Externe links, ankers, mailto en tel blijven ongemoeid.
 */
export function normaliseerHrefs(html, motor) {
  let uit = String(html).replace(/href="([^"]+)"/g, (hele, h) => {
    if (/^(https?:|mailto:|tel:|#|\/|javascript:)/i.test(h)) return hele;
    const [pad, rest] = h.split(/(?=[#?])/);
    return `href="/${pad.replace(/\.html$/, '')}${rest || ''}"`;
  });

  if (!motor) return uit;

  uit = uit.replace(/<a\b([^>]*)href="(\/[^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi, (hele, voor, h, na, tekst) => {
    const route = h.split('#')[0].split('?')[0].replace(/^\//, '').replace(/\/$/, '');
    if (route === '' || motor.isIndex(route)) return hele;
    /* Onbekend pad dat geen route is (een asset, een bestand) laten staan. */
    if (!motor.register.has(route)) return hele;
    return tekst;
  });

  return uit;
}

/* Een tabel in lopende tekst is de klassieke oorzaak van horizontaal schuiven
   op een telefoon. De generator zet er daarom altijd zelf een schuifcontainer
   om, zodat een redactionele tabel per constructie niet de pagina kan
   oprekken. Poort 14 controleert dit; deze wikkel maakt dat de poort er niet
   meer op kan vallen. */
function wikkelTabellen(html) {
  return String(html).replace(/(<table\b[\s\S]*?<\/table>)/gi, (hele) =>
    /ve-scroll-x/.test(hele) ? hele : `<div class="ve-scroll-x"${SCHUIFBAAR}>${hele}</div>`
  );
}

/* Een container die horizontaal schuift moet met het toetsenbord bereikbaar
   zijn, anders komt een gebruiker zonder muis nooit bij de rechterkolommen.
   axe meldde dit als scrollable-region-focusable (serious) op de regiopagina's
   bij 390px: de tabel is daar 522px breed in een venster van 272px.
   role=group in plaats van region: dit is geen landmark en hoeft niet in de
   landmarkstructuur van de pagina op te duiken, maar accepteert wel een naam. */
export const SCHUIFBAAR = ' tabindex="0" role="group" aria-label="Tabel, horizontaal schuifbaar"';

/** Zet alinea's om naar HTML; een alinea mag al HTML bevatten. */
function alineas(lijst, bronnen, motor) {
  const h = (lijst || [])
    .map((a) => (/^\s*<(p|ul|ol|table|h3|h4|blockquote|div)\b/i.test(a) ? a : `<p>${a}</p>`))
    .map((a) => normaliseerHrefs(a, motor))
    .map(wikkelTabellen)
    .join('\n        ');
  return bronnen && bronnen.length ? `${h}\n        ${bronregel(bronnen)}` : h;
}

/* ---------------------------------------------------- vorm uit inhoud
   DRIE VORMEN DIE ER AL IN ZATEN MAAR NOOIT UIT KWAMEN.

   De inhoudsbestanden kennen drie sectiesoorten: tekst, kaarten en specs. De
   generator gaf elke soort precies een vorm, en dat is wat de gegenereerde
   pagina's op een sjabloon deed lijken. Gemeten over de 46 inhoudsbestanden:

     258 tekstsecties, waarvan 173 boven de 1.500 tekens
      56 tekstsecties met twee of meer <h3>-tussenkoppen
      55 kaartsecties, waarvan 50 met drie of meer kaarten
      48 specsecties

   Die tussenkoppen stonden al in de alinea's; ze werden alleen als lopende
   tekst uitgeserveerd. Ze worden nu de ruggengraat van een .ve-rails-lijst —
   dezelfde vorm die contact.html er al voor gebruikt.

   Een rij van drie of meer gelijke kaarten is wat KP-07 in
   docs/qa/composition-gate.mjs juist afkeurt. Die wordt nu een asymmetrisch
   raster: de eerste kaart dragend over zeven kolommen, de rest gestapeld over
   vijf. Dat is de verdeling die index.html er zelf voor gebruikt.

   ER WORDT GEEN TEKST TOEGEVOEGD, VERPLAATST OF HERSCHREVEN. Dezelfde koppen,
   dezelfde alinea's, dezelfde volgorde, dezelfde links. Alleen de vorm
   verandert. Dat is ook waarom poort 11 niet beweegt: die meet tekst. */

/** Splitst alinea's op hun <h3>-tussenkoppen in [{kop, tekst}]. Wat vóór de
    eerste tussenkop staat, komt terug als aanloop. */
function railsUitAlineas(lijst, motor) {
  const aanloop = [];
  const items = [];
  let huidig = null;
  for (const rauw of lijst || []) {
    const a = String(rauw);
    const m = /^\s*<h3[^>]*>([\s\S]*?)<\/h3>\s*([\s\S]*)$/i.exec(a);
    if (m) {
      if (huidig) items.push(huidig);
      huidig = { kop: m[1].replace(/<[^>]+>/g, '').trim(), stukken: [] };
      if (m[2].trim()) huidig.stukken.push(m[2]);
      continue;
    }
    if (huidig) huidig.stukken.push(a);
    else aanloop.push(a);
  }
  if (huidig) items.push(huidig);
  return {
    aanloop,
    items: items.map((i) => ({ kop: i.kop, tekst: alineas(i.stukken, null, motor) })),
  };
}

export function sectieHtml(s, motor, ctx = {}) {
  switch (s.soort) {
    case 'tekst': {
      const h3 = (s.alineas || []).filter((a) => /^\s*<h3/i.test(String(a))).length;
      if (h3 >= 2) {
        const { aanloop, items } = railsUitAlineas(s.alineas, motor);
        return railsectie({
          id: s.id,
          kop: s.kop,
          lead: s.lead,
          prose: aanloop.length ? alineas(aanloop, null, motor) : '',
          items,
          variant: s.variant || '',
        });
      }
      return tekstsectie({
        id: s.id,
        kop: s.kop,
        lead: s.lead,
        prose: `        ${alineas(s.alineas, s.bronnen, motor)}`,
        variant: s.variant || '',
      });
    }
    case 'kaarten': {
      const lijst = (s.kaarten || []).map((k) => ({
        kop: normaliseerHrefs(k.kop, motor),
        tekst: normaliseerHrefs(k.tekst, motor),
        route: k.route,
        label: k.label,
      }));
      if (lijst.length >= 3) {
        /* De dragende kaart krijgt het OPENINGSBEELD VAN DE PAGINA WAAR HIJ
           HEEN WIJST — dezelfde foto die de bezoeker na de klik ziet. Niet een
           sfeerbeeld dat bij de kop lijkt te passen.
           ctx.beeldVoorKaart ontdubbelt over de hele pagina: is de visuele
           groep al gebruikt, dan komt er geen beeld en blijft het de
           tekstkaart die er stond. Dat is de fallbacklayout, en die is beter
           dan een foto die al twee secties hoger staat. */
        return kaartrij12({
          id: s.id,
          kop: s.kop,
          lead: s.lead,
          dominant: lijst[0],
          rest: lijst.slice(1),
          img: ctx.uitgifte ? ctx.uitgifte.kaart(lijst[0].route) : null,
          variant: s.variant || '',
        });
      }
      return kaarten({ id: s.id, kop: s.kop, lead: s.lead, kaarten: lijst, variant: s.variant || '' });
    }
    case 'specs': {
      const rijen = (s.rijen || []).map((r) => r.map((c) => normaliseerHrefs(c, motor)));
      return specblok({
        id: s.id,
        kop: s.kop,
        icoon: ctx.icoon || null,
        rijen,
        img: ctx.uitgifte ? ctx.uitgifte.spec() : null,
        kant: ctx.specKant || 'rechts',
        noot: s.noot ? normaliseerHrefs(s.noot, motor) : null,
        variant: s.variant || 've-sec--sunken ve-sec--line-y',
      });
    }
    default:
      throw new Error(`onbekende sectiesoort: ${s.soort}`);
  }
}

/* ---------------------------------------------------------------- ritme
   WAAROM DEZE FUNCTIE BESTAAT.

   Gemeten op basis 96725da, alleen binnen <main>, per sectie geteld als
   DOCUMENT (louter tekst) of niet:

     index.html          handgeschreven   10 secties,  2 DOCUMENT, langste
                                          tekstreeks 1, 777 tekens per beeld
     netcongestie.html   gegenereerd      12 secties, 10 DOCUMENT, langste
                                          tekstreeks 7, 4.716 tekens per beeld
     laadplein.html      gegenereerd      15 secties, 14 DOCUMENT, langste
                                          tekstreeks 14, 22.140 tekens per beeld

   Dat verschil is wat 'nauwelijks verschil' betekent als je het telt. De
   generator bouwde elke sectie als tekstsectie of als kaartrij en had geen
   derde vorm.

   WAT HIER GEBEURT, EN WAT NADRUKKELIJK NIET.
   Deze pass schrijft GEEN nieuwe tekst. Hij verandert alleen de VORM van
   secties die er al staan:
     · elke derde tekstsectie wordt een beeldband — dezelfde kop, dezelfde
       alinea's, met een foto ernaast en de kant die per keer wisselt;
     · er komt één canvasband vóór het slot, met de og-titel en de
       beschrijving die het inhoudsbestand al draagt. Die twee staan nu
       alleen in de <head>; op de pagina zelf waren ze onzichtbaar.
   Er wordt dus geen claim toegevoegd die niet al door de claimpoort is
   gekomen. */
export function metRitme({ secties, motor, banden, canvas, ctx = {} }) {
  const tekstIdx = secties.map((s, i) => (s.soort === 'tekst' ? i : -1)).filter((i) => i >= 0);
  /* Hoeveel beeldbanden een pagina verdraagt, hangt af van hoeveel tekst er
     staat. Twee banden op een pagina met veertien tekstsecties laat nog
     altijd een reeks van vier over; op een pagina met drie tekstsecties zou
     drie banden de tekst juist verdringen. */
  const wil = Math.max(1, Math.min(3, Math.floor(tekstIdx.length / 2)));
  const stap = Math.max(1, Math.round(tekstIdx.length / (wil + 1)));
  const bandOp = new Set();
  for (let k = 1; k <= wil; k++) {
    const i = tekstIdx[Math.min(k * stap, tekstIdx.length - 1)];
    if (i !== undefined) bandOp.add(i);
  }
  /* De canvasband komt na de middelste sectie, niet achteraan. Een pagina
     met zijn enige visuele gebeurtenis op 90% van de hoogte is precies wat
     de compositiepoort als generiek aanmerkt. */
  const canvasNa = secties.length ? Math.floor(secties.length / 2) : -1;

  const uit = [];
  let gebruikt = 0;
  secties.forEach((s, i) => {
    if (bandOp.has(i)) {
      /* Elk bandslot krijgt zijn EIGEN beeld. Ze wisselden eerst over slot 1
         en 2, maar slot 2 is ook de canvasband: gemeten stond daardoor op 42
         pagina's hetzelfde bestand twee keer. */
      const b = banden[gebruikt % banden.length];
      if (!b) { uit.push(sectieHtml(s, motor, ctx)); return; }
      const kant = gebruikt % 2 === 0 ? 'rechts' : 'links';
      gebruikt++;
      uit.push(
        beeldband({
          id: s.id,
          kop: s.kop,
          tekst: alineas(s.alineas, s.bronnen, motor),
          img: beeldTag({
            basis: b.basis,
            alt: b.alt,
            sizes: '(min-width:1100px) 440px, (min-width:900px) 40vw, 100vw',
          }),
          kant,
          variant: s.variant || '',
        })
      );
    } else {
      uit.push(sectieHtml(s, motor, ctx));
    }
    if (i === canvasNa && canvas) uit.push(canvas);
  });
  if (canvasNa < 0 && canvas) uit.push(canvas);
  return uit;
}

/* Geeft een beeldtag voor de bestemming van een kaart, of null.
   Houdt per pagina bij welke visuele groepen al gebruikt zijn — inclusief de
   groepen van het openingsbeeld, de beeldbanden en de canvasband — zodat een
   hub met zes kaartsecties nooit twee keer dezelfde scene toont. Is er geen
   ongebruikte groep meer, dan komt er geen beeld: de kaart blijft de
   tekstkaart die hij was. */
function beeldUitgifte(route, gebruiktDoorPagina) {
  const gebruikt = new Set((gebruiktDoorPagina || []).map((t) => t.groep));
  const basisRoute = String(route || '').replace(/^\/+/, '');

  const pak = (voorkeurRoute) => {
    const r = String(voorkeurRoute || basisRoute).replace(/^\/+/, '');
    /* eerst de set van de bestemming zelf, dan die van de pagina, dan de rest */
    const kandidaten = [...beeldenVoor(r, typeVanRoute(r), 6), ...beeldenVoor(basisRoute, typeVanRoute(basisRoute), 8)];
    for (const t of kandidaten) {
      if (gebruikt.has(t.groep)) continue;
      gebruikt.add(t.groep);
      return t;
    }
    return null;
  };

  const tag = (t, sizes) => {
    if (!t) return null;
    try {
      return beeldTag({ basis: t.basis, alt: t.alt, sizes });
    } catch (e) {
      return null;
    }
  };

  return {
    /* De dragende kaart krijgt het beeld van de pagina waar hij heen wijst. */
    kaart: (voorkeurRoute) => tag(pak(voorkeurRoute), '(min-width:1100px) 680px, (min-width:900px) 58vw, 100vw'),
    /* Elk specificatieblok krijgt een eigen beeld. laadplein.html heeft er
       twee; die kregen eerst allebei hetzelfde bestand. */
    spec: () => tag(pak(null), '(min-width:1100px) 440px, (min-width:900px) 40vw, 100vw'),
  };
}

/* Het type van een route, voor de beeldset. Afgeleid uit het eerste segment;
   dat is hoe de routes in deze repo zijn ingedeeld. */
function typeVanRoute(r) {
  if (r.startsWith('kennis/')) return 'kennis';
  if (r.startsWith('sectoren/')) return 'sector';
  if (r.startsWith('toepassingen/')) return 'toepassing';
  if (r.startsWith('regios/')) return 'regio';
  return 'oplossing';
}

export function bouwNationaal({ register, motor, schrijf, reg }) {
  const bestanden = alleInhoud();
  let aantal = 0;
  const fouten = [];

  for (const { pad, j } of bestanden) {
    const route = String(j.route).replace(/^\/+/, '');
    const r = register.get(route);
    if (!r) { fouten.push(`${pad}: route '${route}' staat niet in het register`); continue; }
    if (r.staat !== 'INDEX') continue;
    /* Nieuwsartikelen hebben een eigen bouwer: ze leiden hun kruimelpad,
       verwante links en bronnenlijst af uit de contractvelden in plaats van
       die te laten uittypen. Zie scripts/seo/genereer-nieuws.mjs. */
    if (j.type === 'nieuws' || route === 'nieuws' || route.startsWith('nieuws/')) continue;

    const paginaUrl = url(route);

    /* Interne links filteren op INDEX. Een link naar een PENDING-route hoort
       niet in de HTML te komen; dat is een harde regel van de linkmotor. */
    const verwantGroepen = (j.verwant || [])
      .map((g) => ({ kop: g.kop, items: motor.filter((g.items || []).map((i) => ({ route: String(i.route).replace(/^\/+/, ''), naam: i.naam || naamVan(i.route) }))) }))
      .filter((g) => g.items.length);
    for (const g of verwantGroepen) motor.tel(route, g.items);

    /* Kaartlinks ook filteren, zodat een kaart niet naar een PENDING-pagina
       wijst. Een kaart zonder geldige route blijft staan als tekstkaart. */
    const secties = (j.secties || []).map((s) => {
      if (s.soort !== 'kaarten') return s;
      const kaartjes = (s.kaarten || []).map((k) => {
        if (!k.route) return k;
        const kr = String(k.route).replace(/^\/+/, '');
        return motor.isIndex(kr) ? { ...k, route: kr } : { ...k, route: null, label: null };
      });
      motor.tel(route, kaartjes.filter((k) => k.route).map((k) => ({ route: k.route, naam: k.kop })));
      return { ...s, kaarten: kaartjes };
    });

    const kruimels = (j.kruimels || []).map((k) => ({ naam: k.naam, route: String(k.route).replace(/^\/+/, '') }));

    /* HET OPENINGSBEELD.
       Elke gegenereerde pagina kreeg tot nu toe een tekstopening zonder beeld;
       gemeten droegen 417 van de 448 pagina's geen enkele <img> in <main>. Het
       onderwerpsbeeld komt uit beeldVoor(), die per route een BESTAAND bestand
       aanwijst en nooit een klantproject suggereert.
       fetchpriority high en loading eager: dit is het LCP-element, en lazy
       laden van je eigen LCP is een gemeten vertraging. */
    /* Zes slots, zes verschillende onderwerpen:
         0 opening (breed)   1 band A   2 canvasband (breed)
         3 band B            4 band C
       De specificatieblokken en de dragende kaarten halen hun beeld bij de
       paginabrede uitgifte, die bijhoudt welke visuele groepen al op deze
       pagina staan en null teruggeeft zodra ze op zijn. Geen beeld is dan de
       fallbacklayout: de kaart blijft de tekstkaart die hij was. */
    const beelden = beeldenVoor(j.route, j.type, 5);
    const beeld = beelden[0];
    const heroBeeld = mediaBlok({
      verhouding: '21x9',
      diepte: 'diep',
      img: beeldTag({
        basis: beeld.basis,
        alt: beeld.alt,
        sizes: '(min-width:1200px) 1216px, 100vw',
        lazy: false,
        fetchpriority: 'high',
      }),
      stijl: 'margin-top:var(--ve-s-2xl)',
    });

    /* PROJECTBEWIJS, ALLEEN BIJ EEN ECHTE SECTOROVEREENKOMST.
       projectFiltersVoor() geeft null voor elke route zonder overeenkomst, en
       dan verschijnt er geen band. Liever geen band dan een project uit een
       andere sector. */
    const projectFilters = projectFiltersVoor(j.route);
    const bandProjecten = projectFilters
      ? ALLE_PROJECTEN.filter((p) => projectFilters.includes(p.sectorFilter)).map((p) => ({
          route: p.slug,
          titel: p.titel || p.kop,
          plaats: p.plaats,
          sector: p.sector,
          samenvatting: p.statement || '',
          img: beeldTag({
            basis: p.beeld,
            alt: p.beeldAlt || `${p.titel || p.kop} in ${p.plaats}`,
            sizes: '(min-width:1200px) 380px, (min-width:760px) 50vw, 100vw',
          }),
        }))
      : [];

    const delen = [
      opening({
        kruimels,
        kruimelLabel: j.kruimel_label || j.og_titel || j.h1,
        h1: j.h1,
        lead: normaliseerHrefs(j.lead, motor),
        naLead: heroBeeld,
        acties: (j.acties || []).map((a) =>
          a.soort === 'primair'
            ? `<a class="ve-btn ve-btn--primair ve-btn--lg" href="${href(a.route)}">${esc(a.label)}${ic('pijl')}</a>`
            : a.anker
            ? `<a class="ve-btn ve-btn--ghost ve-btn--lg" href="${a.anker}">${esc(a.label)}</a>`
            : `<a class="ve-btn ve-btn--ghost ve-btn--lg" href="${href(a.route)}">${esc(a.label)}</a>`
        ),
      }),
      j.direct_antwoord
        ? directAntwoord({
            vraag: j.direct_antwoord.vraag,
            antwoord: normaliseerHrefs(j.direct_antwoord.antwoord, motor),
            voorbehoud: j.direct_antwoord.voorbehoud ? normaliseerHrefs(j.direct_antwoord.voorbehoud, motor) : j.direct_antwoord.voorbehoud,
          })
        : '',
      /* De canvasband: het enige moment op een gegenereerde pagina dat niet
         de donkere slotband is. Kop en tekst komen uit og_titel en
         beschrijving, die tot nu toe alleen in de <head> stonden. */
      ...metRitme({
        secties,
        motor,
        banden: [beelden[1], beelden[3], beelden[4]].filter(Boolean),
        /* Het vierde beeld gaat naar het specificatieblok. Niet naar de
           kaartrij: die heeft zijn dragende kaart al, en twee beelden uit
           dezelfde set op een pagina zou precies de herhaling zijn die het
           register nu juist voorkomt. */
        ctx: { uitgifte: beeldUitgifte(j.route, beelden.slice(0, 5)) },
        canvas: canvasband({
          img: beeldTag({
            basis: beelden[2].basis,
            alt: beelden[2].alt,
            sizes: '(min-width:1200px) 1216px, 100vw',
          }),
          kop: j.og_titel || j.h1,
          tekst: esc(j.beschrijving || ''),
        }),
      }),
      bandProjecten.length
        ? projectband({
            id: 'projectbewijs',
            kop: 'Opgeleverd werk in deze sector',
            lead: '',
            projecten: bandProjecten,
            variant: 've-sec--paper ve-sec--line-y',
          })
        : '',
      j.faq && j.faq.length
        ? faqSectie({
            kop: j.faq_kop || 'Veelgestelde vragen',
            vragen: j.faq.map((v) => ({ vraag: v.vraag, antwoord: normaliseerHrefs(v.antwoord, motor) })),
          })
        : '',
      verwant(verwantGroepen),
      j.conversie
        ? conversie({
            kop: j.conversie.kop,
            tekst: j.conversie.tekst,
            primair: j.conversie.primair && motor.isIndex(j.conversie.primair.route) ? j.conversie.primair : { route: 'contact', label: 'Plan een adviesgesprek' },
            secundair: j.conversie.secundair && motor.isIndex(j.conversie.secundair.route) ? j.conversie.secundair : null,
          })
        : '',
    ].filter(Boolean);

    const extra = [];
    if (j.type === 'kennis') {
      extra.push(
        artikel(paginaUrl, {
          titel: j.og_titel || j.h1,
          beschrijving: j.beschrijving,
          gepubliceerd: j.gepubliceerd || reg._gegenereerd,
          gewijzigd: j.gewijzigd || reg._gegenereerd,
        })
      );
    }
    if (j.type === 'oplossing' || j.type === 'sector' || j.type === 'toepassing') {
      extra.push(
        dienst(paginaUrl, {
          naam: j.dienst_naam || j.og_titel || j.h1,
          beschrijving: j.beschrijving,
        })
      );
    }
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
        dataPagina: j.data_pagina || route.split('/')[0],
        kruimels,
        kruimelLabel: j.kruimel_label || j.og_titel || j.h1,
        gewijzigd: j.gewijzigd || reg._gegenereerd,
        extraKnopen: extra,
        inhoud: delen.join('\n\n'),
      })
    );
    aantal += 1;
  }

  if (fouten.length) {
    for (const f of fouten) console.error(`INHOUDSFOUT: ${f}`);
    process.exitCode = 1;
  }
  return { aantal, fouten };
}
