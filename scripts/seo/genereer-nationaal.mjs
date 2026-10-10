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
import { pagina, opening, directAntwoord, tekstsectie, kaarten, specs, faqSectie, verwant, conversie, esc, bronregel, ic } from './lib/sjabloon.mjs';
import { artikel, dienst, faq as faqLd } from './lib/schema.mjs';
import { naamVan } from './lib/links.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..', '..');

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
function normaliseerHrefs(html, motor) {
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
    /ve-scroll-x/.test(hele) ? hele : `<div class="ve-scroll-x">${hele}</div>`
  );
}

/** Zet alinea's om naar HTML; een alinea mag al HTML bevatten. */
function alineas(lijst, bronnen, motor) {
  const h = (lijst || [])
    .map((a) => (/^\s*<(p|ul|ol|table|h3|h4|blockquote|div)\b/i.test(a) ? a : `<p>${a}</p>`))
    .map((a) => normaliseerHrefs(a, motor))
    .map(wikkelTabellen)
    .join('\n        ');
  return bronnen && bronnen.length ? `${h}\n        ${bronregel(bronnen)}` : h;
}

function sectieHtml(s, motor) {
  switch (s.soort) {
    case 'tekst':
      return tekstsectie({
        id: s.id,
        kop: s.kop,
        lead: s.lead,
        prose: `        ${alineas(s.alineas, s.bronnen, motor)}`,
        variant: s.variant || '',
      });
    case 'kaarten':
      return kaarten({
        id: s.id,
        kop: s.kop,
        lead: s.lead,
        kaarten: (s.kaarten || []).map((k) => ({ kop: normaliseerHrefs(k.kop, motor), tekst: normaliseerHrefs(k.tekst, motor), route: k.route, label: k.label })),
        variant: s.variant || '',
      });
    case 'specs':
      return specs({
        kop: s.kop,
        rijen: (s.rijen || []).map((r) => r.map((c) => normaliseerHrefs(c, motor))),
        noot: s.noot ? normaliseerHrefs(s.noot, motor) : s.noot,
      });
    default:
      throw new Error(`onbekende sectiesoort: ${s.soort}`);
  }
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

    const delen = [
      opening({
        kruimels,
        kruimelLabel: j.kruimel_label || j.og_titel || j.h1,
        h1: j.h1,
        lead: normaliseerHrefs(j.lead, motor),
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
      ...secties.map((sec) => sectieHtml(sec, motor)),
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
