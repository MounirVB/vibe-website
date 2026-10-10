/* ============================================================================
   VIBE ENERGY — GEDEELDE CHROME
   ----------------------------------------------------------------------------
   Injecteert op elke pagina: icoonsprite, header (incl. mega-dropdowns en
   mobiel menu) en footer. Eén bron voor de navigatie, zoals _header.js /
   _footer.js dat in de oude site deden.

   Gebruik in een pagina:
     <body data-pagina="energieopslag">        <- zet de actieve rubriek
     <script src="vibe/chrome.js" defer></script>

   De <noscript>-fallback in elke pagina bevat dezelfde links, zodat de site
   ook zonder JavaScript navigeerbaar en crawlbaar blijft.
   ============================================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- iconen */
  /* Vormen afgeleid van de Material Symbols die de Stitch-masters aanroepen,
     maar als inline SVG: geen externe iconfont, geen FOUT, geen 300 kB. */
  var A = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  var ICONEN = {
    bolt:        '<path ' + A + ' d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    accu:        '<rect ' + A + ' x="2" y="7" width="16" height="10" rx="2"/><path ' + A + ' d="M21 10.5v3"/><path ' + A + ' d="M10.5 9.5 8 12.5h3l-.5 2.5 2.8-3.2H10z"/>',
    zon:         '<circle ' + A + ' cx="12" cy="12" r="4"/><path ' + A + ' d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
    laadpaal:    '<rect ' + A + ' x="4" y="3" width="10" height="18" rx="2"/><path ' + A + ' d="M9.5 7.5 7.5 11h3l-2 3.5"/><path ' + A + ' d="M14 10h2.5a2 2 0 0 1 2 2v4a1.75 1.75 0 0 0 3.5 0V9l-2-2"/>',
    hub:         '<circle ' + A + ' cx="12" cy="12" r="2.4"/><circle ' + A + ' cx="5" cy="6" r="2"/><circle ' + A + ' cx="19" cy="6" r="2"/><circle ' + A + ' cx="5" cy="18" r="2"/><circle ' + A + ' cx="19" cy="18" r="2"/><path ' + A + ' d="m6.6 7.4 3.2 3.2M17.4 7.4l-3.2 3.2M6.6 16.6l3.2-3.2M17.4 16.6l-3.2-3.2"/>',
    gebied:      '<path ' + A + ' d="M3 20V9l5-3 5 3v11"/><path ' + A + ' d="M13 20V12l4-2.5 4 2.5v8"/><path ' + A + ' d="M3 20h18M6.5 12h3M16 15h2"/>',
    truck:       '<path ' + A + ' d="M2 6.5h11V16H2z"/><path ' + A + ' d="M13 9.5h3.6l3.4 3.2V16h-7z"/><circle ' + A + ' cx="6.5" cy="18" r="1.9"/><circle ' + A + ' cx="17" cy="18" r="1.9"/>',
    kantoor:     '<path ' + A + ' d="M4 21V5.5L12 2l8 3.5V21"/><path ' + A + ' d="M9.5 21v-5.5h5V21"/><path ' + A + ' d="M8 8.5h2M14 8.5h2M8 12.5h2M14 12.5h2"/>',
    woning:      '<path ' + A + ' d="M3 11 12 4l9 7"/><path ' + A + ' d="M5.5 10v10h13V10"/><path ' + A + ' d="M10 20v-5.5h4V20"/>',
    recreatie:   '<path ' + A + ' d="M4.5 19.5C4.5 11.5 11 5 19.5 4.5c0 8.5-6.5 15-15 15z"/><path ' + A + ' d="M6 18C10 14 13.5 11.5 17 10"/>',
    portefeuille:'<path ' + A + ' d="M3 20V10l5-2.5L13 10v10"/><path ' + A + ' d="M13 20V6l4-2 4 2v14"/><path ' + A + ' d="M2 20h20M6 13h2M17 9h1.5M17 13h1.5"/>',
    pijl:        '<path ' + A + ' d="M4 12h15M13 6l6 6-6 6"/>',
    caret:       '<path ' + A + ' d="m6 9 6 6 6-6"/>',
    menu:        '<path ' + A + ' d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/>',
    sluit:       '<path ' + A + ' d="M6 6l12 12M18 6 6 18"/>',
    vink:        '<path ' + A + ' d="m4.5 12.5 5 5 10-11"/>',
    kruis:       '<path ' + A + ' d="M6 6l12 12M18 6 6 18"/>',
    schild:      '<path ' + A + ' d="M12 2.5 20 6v6c0 5-3.4 8.2-8 9.5C7.4 20.2 4 17 4 12V6z"/><path ' + A + ' d="m8.8 12 2.2 2.2 4.2-4.4"/>',
    meter:       '<path ' + A + ' d="M3.5 13.5a8.5 8.5 0 0 1 17 0"/><path ' + A + ' d="m12 13.5 4-3.2"/><circle ' + A + ' cx="12" cy="13.5" r="1.1"/>',
    net:         '<path ' + A + ' d="M12 3v4M8 21l4-6 4 6"/><path ' + A + ' d="m6 9 6-2 6 2"/><path ' + A + ' d="M7 15h10"/><circle ' + A + ' cx="12" cy="8" r="1.2"/>',
    koeling:     '<path ' + A + ' d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5 4.2 16.5"/><path ' + A + ' d="M12 7 9.8 5M12 7l2.2-2M12 17l-2.2 2M12 17l2.2 2"/>',
    tijd:        '<circle ' + A + ' cx="12" cy="12" r="9"/><path ' + A + ' d="M12 7v5.2l3.4 2"/>',
    euro:        '<circle ' + A + ' cx="12" cy="12" r="9"/><path ' + A + ' d="M15.5 9.2a4 4 0 1 0 0 5.6M8 11h6M8 13.4h6"/>',
    doc:         '<path ' + A + ' d="M6 3h8l4 4v14H6z"/><path ' + A + ' d="M14 3v4h4M9 13h6M9 16.5h5"/>',
    telefoon:    '<path ' + A + ' d="M7 3.5 9.5 9l-2 1.6a12 12 0 0 0 5.9 5.9L15 14.5l5.5 2.5-1 3A2 2 0 0 1 17.3 21 17.5 17.5 0 0 1 3 6.7 2 2 0 0 1 4.9 4.5z"/>',
    mail:        '<rect ' + A + ' x="2.5" y="5" width="19" height="14" rx="2"/><path ' + A + ' d="m3 7 9 6 9-6"/>',
    agenda:      '<rect ' + A + ' x="3" y="5" width="18" height="16" rx="2"/><path ' + A + ' d="M3 10h18M8 3v4M16 3v4"/>',
    locatie:     '<path ' + A + ' d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle ' + A + ' cx="12" cy="10" r="2.6"/>'
  };

  /* ------------------------------------------------------------ navigatie */
  var OPLOSSINGEN = [
    ['netcongestie',          'net',      'Netcongestie',      'Groeien terwijl de netbeheerder geen extra vermogen kan leveren'],
    ['systeem-energieopslag', 'accu',     'Energieopslag',     'Batterijopslag die capaciteit vrijspeelt op uw aansluiting'],
    ['systeem-zonnepanelen',  'zon',      'Zonne-energie',     'Opwek op dak, carport of veld, ontworpen op uw profiel'],
    ['systeem-laadpalen',     'laadpaal', 'Laadinfrastructuur','AC en DC laden binnen de bestaande aansluiting'],
    ['laadplein',             'gebied',   'Laadplein',         'Meerdere laadpunten op een terrein, zonder de aansluiting te verzwaren'],
    ['vibe-control',          'hub',      'VIBE.CONTROL',      'De stuurlaag die alle assets als één systeem bedient'],
    ['microgrids',            'net',      'Microgrids',        'Losse assets verbonden tot één lokale energiecentrale'],
    ['energy-hubs',           'gebied',   'Energy Hubs',       'Capaciteit gedeeld over meerdere panden en aansluitingen']
  ];

  var DOELGROEPEN = [
    ['industrie-logistiek',    'truck',        'Logistiek',               'Distributie, transport en koeling'],
    ['industrie-vastgoed',     'kantoor',      'Kantoren & vastgoed',     'Gebouwgebonden energie als exploitatie'],
    ['industrie-vve',          'woning',       "VvE's & wooncomplexen",   'Collectieve opwek en laden voor bewoners'],
    ['industrie-recreatie',    'recreatie',    'Recreatie',               'Parken, hotels en verblijfsaccommodatie'],
    ['industrie-residentieel', 'portefeuille', 'Woningportefeuilles',     'Verhuur, beleggers en corporaties'],
    ['sectoren',               'hub',          'Alle sectoren',           'Automotive, transport, productie, retail, zorg en meer']
  ];

  var BEDRIJF = [
    ['over-ons',     'Over Vibe'],
    ['projecten',    'Projecten'],
    ['kennis',       'Kennisbank'],
    ['toepassingen', 'Toepassingen'],
    ['subsidies',    'Subsidies'],
    ['regios',       "Regio's"],
    ['contact',      'Plan een gesprek']
  ];

  /* De primaire boekingsactie. Eén bron voor header en mobiel menu, zodat
     desktop en mobiel nooit uiteenlopen. Dezelfde URL als op contact.html.
     De navigatielinks hierboven blijven naar contact wijzen: die pagina draagt
     ook het vragenformulier en moet bereikbaar blijven. */
  var BOEKING = 'https://calendly.com/vibeenergy-sales/30min?hide_gdpr_banner=1';

  var JURIDISCH = [
    ['privacy',              'Privacyverklaring'],
    ['algemene-voorwaarden', 'Algemene voorwaarden'],
    ['cookiebeleid',         'Cookiebeleid']
  ];

  var BEDRIJFSGEGEVENS = {
    naam: 'Vibe Energy B.V.',
    straat: 'Utrechtseweg 310 B46',
    plaats: '6812 AR Arnhem',
    tel: '+31 85 060 0489',
    telHref: '+31850600489',
    mail: 'info@vibeenergy.nl',
    kvk: '92191487',
    btw: 'NL865924910B01'
  };

  /* ---------------------------------------------------------------- logo
     ÉÉN bron voor het merkteken. Header en footer renderen allebei hieruit.

     Het logo is de afgeronde horizontale master VIBE ⚡ ENERGY, als native SVG
     geladen uit assets/. Twee varianten, identiek van geometrie, alleen andere
     inkt: -dark (#171A1B) voor een lichte ondergrond, -light (#F7F7F7) voor een
     donkere. De bestanden worden ONGEWIJZIGD geladen; aan de vorm, de spatiëring
     en de verhoudingen verandert hier niets. Alleen de weergavegrootte wordt
     gezet, en die staat in .ve-logo in vibe/vibe.css.

     De <a>/<span> eromheen hoort bij de header respectievelijk de footer; de
     header draagt het aria-label, dus daar is het beeld decoratief. */
  function logoMerk(variant, alt) {
    /* variant 'licht' = lichte inkt voor een donkere ondergrond (footer),
       anders de donkere inkt voor een lichte ondergrond (header).
       De SVG's zijn de afgeronde horizontale master en worden ongewijzigd
       geladen; de weergavegrootte komt uit .ve-logo in vibe/vibe.css. */
    var bestand = variant === 'licht' ? 'vibe-energy-logo-light.svg' : 'vibe-energy-logo-dark.svg';
    return '<img class="ve-logo" src="/assets/' + bestand + '"' +
           ' alt="' + (alt || '') + '"' + (alt ? '' : ' aria-hidden="true"') +
           ' decoding="async">';
  }

  /* ------------------------------------------------------------- helpers */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function ic(naam, klasse) {
    return '<svg class="' + (klasse || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
           '<use href="#ve-i-' + naam + '"/></svg>';
  }

  /* welke rubriek is actief? uit data-pagina, anders uit de bestandsnaam */
  var hier = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  var pagina = document.body.getAttribute('data-pagina') || hier;
  function actief(href) { return href.replace(/^\//, '').replace(/\.html$/, '') === pagina; }
  function rubriekActief(lijst) {
    for (var i = 0; i < lijst.length; i++) { if (actief(lijst[i][0])) return true; }
    return false;
  }

  /* ------------------------------------------------------------- sprite */
  function sprite() {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">';
    for (var k in ICONEN) {
      if (!Object.prototype.hasOwnProperty.call(ICONEN, k)) continue;
      s += '<symbol id="ve-i-' + k + '" viewBox="0 0 24 24">' + ICONEN[k] + '</symbol>';
    }
    return s + '</svg>';
  }

  /* ------------------------------------------------------------- header */
  function dropdown(id, label, lijst) {
    var h = '<div class="ve-nav__item' + (rubriekActief(lijst) ? ' ve-nav__item--actief' : '') + '" data-drop="' + id + '">' +
      '<button class="ve-nav__link" type="button" aria-expanded="false" aria-controls="ve-drop-' + id + '">' +
        esc(label) + ic('caret', 've-nav__caret') +
      '</button>' +
      '<div class="ve-drop" id="ve-drop-' + id + '">';
    for (var i = 0; i < lijst.length; i++) {
      var r = lijst[i];
      h += '<a class="ve-drop__link" href="/' + r[0] + '"' + (actief(r[0]) ? ' aria-current="page"' : '') + '>' +
             '<span class="ve-drop__ic">' + ic(r[1]) + '</span>' +
             '<span><span class="ve-drop__t">' + r[2] + '</span>' +
             '<span class="ve-drop__d">' + r[3] + '</span></span>' +
           '</a>';
    }
    return h + '</div></div>';
  }

  function header() {
    return '<a class="ve-skip" href="#hoofdinhoud">Direct naar de inhoud</a>' +
      '<header class="ve-header">' +
        '<div class="ve-wrap ve-header__bar">' +
          '<a class="ve-wordmark" href="/" aria-label="Vibe Energy, naar de homepage">' +
            logoMerk('donker') +
          '</a>' +
          '<nav class="ve-nav" aria-label="Hoofdnavigatie">' +
            dropdown('opl', 'Oplossingen', OPLOSSINGEN) +
            dropdown('doe', 'Doelgroepen', DOELGROEPEN) +
            '<div class="ve-nav__item"><a class="ve-nav__link" href="/projecten"' +
              (actief('projecten') ? ' aria-current="page"' : '') + '>Projecten</a></div>' +
            '<div class="ve-nav__item"><a class="ve-nav__link" href="/over-ons"' +
              (actief('over-ons') ? ' aria-current="page"' : '') + '>Over Vibe</a></div>' +
          '</nav>' +
          '<div class="ve-header__acties">' +
            /* Secundaire actie: direct bellen. Alleen het icoon, op elke breedte —
               het nummer komt uit BEDRIJFSGEGEVENS, dezelfde bron als de footer. */
            '<a class="ve-btn ve-btn--ghost ve-telbtn" href="tel:' + BEDRIJFSGEGEVENS.telHref + '"' +
              ' aria-label="Bel Vibe Energy" title="Bel direct">' + ic('telefoon') + '</a>' +
            '<a class="ve-btn ve-btn--primair ve-btn--sm" href="' + BOEKING + '">Plan een gesprek</a>' +
            '<button class="ve-menubtn" type="button" aria-expanded="false" aria-controls="ve-mobiel" aria-label="Menu openen">' +
              ic('menu') + '</button>' +
          '</div>' +
        '</div>' +
      '</header>' +
      mobiel();
  }

  function mobiel() {
    function groep(titel, lijst, met) {
      var h = '<div class="ve-mobiel__groep"><p class="ve-mobiel__kop">' + esc(titel) + '</p>';
      for (var i = 0; i < lijst.length; i++) {
        h += '<a class="ve-mobiel__link" href="/' + lijst[i][0] + '">' + (met ? lijst[i][2] : lijst[i][1]) + '</a>';
      }
      return h + '</div>';
    }
    return '<div class="ve-mobiel" id="ve-mobiel" hidden>' +
      groep('Oplossingen', OPLOSSINGEN, true) +
      groep('Doelgroepen', DOELGROEPEN, true) +
      groep('Vibe Energy', BEDRIJF, false) +
      '<div class="ve-mobiel__cta">' +
        '<a class="ve-btn ve-btn--primair ve-btn--blok" href="' + BOEKING + '">Plan een gesprek</a>' +
      '</div></div>';
  }

  /* ------------------------------------------------------------- footer */
  function kolom(titel, lijst, met) {
    var h = '<div><p class="ve-footer__kop">' + esc(titel) + '</p><ul class="ve-footer__lijst">';
    for (var i = 0; i < lijst.length; i++) {
      h += '<li><a href="/' + lijst[i][0] + '">' + (met ? lijst[i][2] : lijst[i][1]) + '</a></li>';
    }
    return h + '</ul></div>';
  }

  function footer() {
    var b = BEDRIJFSGEGEVENS;
    return '<footer class="ve-footer">' +
      '<div class="ve-wrap">' +
        '<div class="ve-footer__top">' +
          '<div class="ve-footer__merk">' +
            '<span class="ve-wordmark">' + logoMerk('licht', 'Vibe Energy') + '</span>' +
            '<p class="ve-footer__claim">Wij ontwerpen, bouwen en beheren lokale energie-infrastructuur achter de meter &mdash; als systeem, niet als los product.</p>' +
            '<ul class="ve-footer__lijst" style="margin-top:1.5rem">' +
              '<li><a href="tel:' + b.telHref + '">' + b.tel + '</a></li>' +
              '<li><a href="mailto:' + b.mail + '">' + b.mail + '</a></li>' +
              '<li>' + b.straat + ', ' + b.plaats + '</li>' +
            '</ul>' +
          '</div>' +
          kolom('Oplossingen', OPLOSSINGEN, true) +
          kolom('Doelgroepen', DOELGROEPEN, true) +
          '<div>' +
            '<p class="ve-footer__kop">Vibe Energy</p>' +
            '<ul class="ve-footer__lijst">' +
              '<li><a href="/over-ons">Over Vibe</a></li>' +
              '<li><a href="/projecten">Projecten</a></li>' +
              '<li><a href="/kennis">Kennisbank</a></li>' +
              '<li><a href="/toepassingen">Toepassingen</a></li>' +
              '<li><a href="/subsidies">Subsidies</a></li>' +
              '<li><a href="/regios">Regio\'s</a></li>' +
              '<li><a href="/contact">Plan een gesprek</a></li>' +
            '</ul>' +
            '<p class="ve-footer__kop" style="margin-top:1.75rem">Juridisch</p>' +
            '<ul class="ve-footer__lijst">' +
              '<li><a href="/privacy">Privacyverklaring</a></li>' +
              '<li><a href="/algemene-voorwaarden">Algemene voorwaarden</a></li>' +
              '<li><a href="/cookiebeleid">Cookiebeleid</a></li>' +
              '<li><button type="button" data-cookie-prefs style="background:none;border:0;padding:0;cursor:pointer;font:inherit;text-align:left;color:inherit">Cookie-instellingen</button></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="ve-footer__onder">' +
          '<span>&copy; ' + new Date().getFullYear() + ' ' + b.naam + ' &middot; KvK ' + b.kvk + ' &middot; btw ' + b.btw + '</span>' +
          '<nav aria-label="Juridisch">' +
            '<a href="/privacy">Privacy</a>' +
            '<a href="/algemene-voorwaarden">Voorwaarden</a>' +
            '<a href="/cookiebeleid">Cookies</a>' +
          '</nav>' +
        '</div>' +
      '</div>' +
    '</footer>';
  }

  /* ------------------------------------------------------- Calendly-popup
     De boekings-CTA's openen Calendly als overlay BOVEN de pagina; de bezoeker
     blijft op vibeenergy.nl staan. Dit is de officiële widget
     (window.Calendly.initPopupWidget), overgenomen uit de vorige productie-
     implementatie in _footer.js, met twee bewuste correcties:

     1 · TRIGGER OP HREF, NIET OP LINKTEKST.
         De oude versie herkende een boekingsknop aan zijn tekst
         (/plan.*gesprek|adviesgesprek|bekijk.*praktijkcase/i). Daardoor ving
         zij ook gewone navigatieknoppen af — 28 elementen op 16 pagina's,
         vastgelegd als L-12 in docs/vibe-legacy-inconsistencies-v1.md. Hier
         is de voorwaarde de bestemming: alleen een link naar exact de
         boekings-URL opent de popup. Navigatie naar contact, de
         analyse-aanvragen en alle overige links blijven ongemoeid.

     2 · DE WIDGET LAADT PAS BIJ DE EERSTE KLIK.
         De oude versie haalde widget.js en widget.css op bij ELKE
         paginaweergave. Ons cookiebeleid zegt dat Calendly "pas cookies
         plaatst wanneer u de planningspagina daadwerkelijk opent"; daarom
         wordt er niets van Calendly geladen tot de bezoeker zelf klikt.

     Er wordt geen stopPropagation() gebruikt (dat was de tweede helft van
     L-12) en de href blijft in de opmaak staan: zonder JavaScript, of als de
     widget onbereikbaar is, navigeert de link gewoon naar Calendly. */
  function bindBoeking() {
    var CSS = 'https://assets.calendly.com/assets/external/widget.css';
    var JS = 'https://assets.calendly.com/assets/external/widget.js';
    var laden = null;

    function assets() {
      if (laden) return laden;                       // nooit twee keer injecteren
      laden = new Promise(function (klaar, mislukt) {
        if (!document.querySelector('link[data-vibe-calendly]')) {
          var l = document.createElement('link');
          l.rel = 'stylesheet'; l.href = CSS;
          l.setAttribute('data-vibe-calendly', '');
          document.head.appendChild(l);
        }
        var s = document.querySelector('script[data-vibe-calendly]');
        if (s && window.Calendly) { klaar(); return; }
        if (!s) {
          s = document.createElement('script');
          s.src = JS; s.async = true;
          s.setAttribute('data-vibe-calendly', '');
          document.head.appendChild(s);
        }
        s.addEventListener('load', klaar);
        s.addEventListener('error', mislukt);
      });
      return laden;
    }

    function boekingslink(a) {
      var h = a.getAttribute('href') || '';
      return h.indexOf(BOEKING) === 0;
    }

    document.addEventListener('click', function (e) {
      /* laat de browser zijn werk doen bij midden-/rechtsklik en bij
         ctrl/cmd-klik: wie bewust een nieuw tabblad wil, krijgt dat */
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || !boekingslink(a)) return;

      var url = a.getAttribute('href');
      e.preventDefault();                            // bewust géén stopPropagation

      /* al een overlay open? dan niets nogmaals initialiseren */
      if (document.querySelector('.calendly-overlay')) return;

      assets().then(function () {
        if (window.Calendly && typeof window.Calendly.initPopupWidget === 'function') {
          window.Calendly.initPopupWidget({ url: url });
        } else {
          location.href = url;                       // widget geladen maar onbruikbaar
        }
      }, function () {
        location.href = url;                         // widget onbereikbaar
      });
    });
  }

  /* --------------------------------------------------------------- mount */
  function mount() {
    /* de <noscript>-fallback is alleen nodig zolang dit script niet draaide */
    var fallback = document.querySelector('[data-chrome-fallback]');
    if (fallback) fallback.remove();

    document.body.insertAdjacentHTML('afterbegin', sprite() + header());
    var voet = document.querySelector('[data-chrome-footer]');
    if (voet) voet.outerHTML = footer();
    else document.body.insertAdjacentHTML('beforeend', footer());

    bindDropdowns();
    bindMobiel();
    bindBoeking();
  }

  /* ---- dropdowns: hover op desktop, klik overal, Escape sluit ---- */
  function bindDropdowns() {
    var items = document.querySelectorAll('.ve-nav__item[data-drop]');
    function sluitAlles(behalve) {
      Array.prototype.forEach.call(items, function (el) {
        if (el === behalve) return;
        el.classList.remove('ve-nav__item--open');
        el.querySelector('.ve-nav__link').setAttribute('aria-expanded', 'false');
      });
    }
    Array.prototype.forEach.call(items, function (el) {
      var knop = el.querySelector('.ve-nav__link');
      var dicht, viaHover = false;
      function isOpen() { return el.classList.contains('ve-nav__item--open'); }
      function zet(open) {
        el.classList.toggle('ve-nav__item--open', open);
        knop.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) sluitAlles(el);
      }
      /* Hover opent, klik schakelt. Zonder de viaHover-vlag sluit een muisklik
         het menu meteen weer: de muis is er dan al overheen gegaan, dus hover
         had het net geopend en de klik draaide dat terug. */
      knop.addEventListener('click', function (e) {
        e.preventDefault();
        if (viaHover) { viaHover = false; return; }
        zet(!isOpen());
      });
      el.addEventListener('mouseenter', function () {
        clearTimeout(dicht);
        if (!isOpen()) { viaHover = true; zet(true); }
      });
      el.addEventListener('mouseleave', function () {
        dicht = setTimeout(function () { zet(false); viaHover = false; }, 140);
      });
      /* toetsenbord: verlaat het item met Tab, dan dicht */
      el.addEventListener('focusout', function (e) {
        if (!el.contains(e.relatedTarget)) zet(false);
      });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sluitAlles(null); });
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.ve-nav__item[data-drop]')) sluitAlles(null);
    });
  }

  /* ---- mobiel menu ---- */
  function bindMobiel() {
    var knop = document.querySelector('.ve-menubtn');
    var menu = document.getElementById('ve-mobiel');
    if (!knop || !menu) return;
    var open = false, scrollPos = 0;

    function zet(aan) {
      open = aan;
      knop.setAttribute('aria-expanded', aan ? 'true' : 'false');
      knop.setAttribute('aria-label', aan ? 'Menu sluiten' : 'Menu openen');
      knop.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#ve-i-' +
                       (aan ? 'sluit' : 'menu') + '"/></svg>';
      if (aan) {
        scrollPos = window.scrollY;
        menu.hidden = false;
        requestAnimationFrame(function () { menu.classList.add('is-open'); });
        document.documentElement.classList.add('ve-menu-open');
        var eerste = menu.querySelector('a');
        if (eerste) eerste.focus({ preventScroll: true });
      } else {
        menu.classList.remove('is-open');
        document.documentElement.classList.remove('ve-menu-open');
        setTimeout(function () { if (!open) menu.hidden = true; }, 300);
        window.scrollTo(0, scrollPos);
      }
    }
    knop.addEventListener('click', function () { zet(!open); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) zet(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) zet(false); });
    /* boven de desktop-breakpoint hoort het paneel nooit open te staan */
    window.addEventListener('resize', function () {
      if (open && window.innerWidth >= 1200) zet(false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
