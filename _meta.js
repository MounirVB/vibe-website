/* Meta Pixel — site-wide loader.
   Laadt PAS nadat de bezoeker MARKETINGcookies heeft geaccepteerd
   (zie _consent.js). Zonder toestemming wordt de pixel niet geladen.

   WAAROM DIT BESTAND BESTAAT, EN NIET MEER INLINE IN index.html STAAT

   Tot deze wijziging stond het pixelsnippet rechtstreeks in de <head> van
   index.html, buiten elke toestemmingspoort. Gemeten op 9 november 2026 tegen
   een byte-identieke kopie van productie:

     · met de cookiemelding nog open en localStorage.vibe_consent_v1 === null
       werden al vier verzoeken naar connect.facebook.net gedaan, waaronder
       /en_US/fbevents.js en /signals/config/1164445461468919;
     · er stond dan al een eerstepartijcookie `_fbp` met een looptijd van
       90 dagen, plus de sleutels lastExternalReferrer en
       lastExternalReferrerTime in localStorage;
     · na een expliciete klik op "Alleen noodzakelijk" bleef die cookie staan
       EN vuurde de pixel bij elke volgende paginalading opnieuw.

   cookiebeleid.html belooft letterlijk het tegendeel: "Hiervoor gebruiken wij
   de Meta Pixel. Ook deze cookies worden pas geplaatst na uw toestemming."
   De grendel die dat waarmaakt bestond al — _consent.js draagt sinds zijn
   eerste versie een 'marketing'-kanaal in `listeners` — maar niets gebruikte
   hem. Dit bestand is dat gebruik, naar hetzelfde model als _clarity.js.

   De <noscript>-variant die in index.html stond is NIET meegekomen en komt
   ook niet terug: een <img>-baken kan per definitie geen toestemming afwachten.

   'marketing' en niet 'analytics': zo staat de pixel in cookiebeleid.html en
   in het voorkeurenpaneel van _consent.js gecategoriseerd. */
(function () {
  var ID = window.VIBE_META_PIXEL_ID || '1164445461468919';
  if (!ID) return;

  function load() {
    if (window.__vibeMetaLoaded) return; window.__vibeMetaLoaded = true;
    /* Het officiële Meta-snippet, ongewijzigd op één punt: de twee aanroepen
       fbq('init') en fbq('track','PageView') staan nu BINNEN deze functie, dus
       achter de toestemming, in plaats van op het hoofdniveau van de pagina. */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', ID);
    window.fbq('track', 'PageView');
  }

  if (window.vibeConsent && window.vibeConsent.on) window.vibeConsent.on('marketing', load);
})();
