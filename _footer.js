/* Global footer loader — injects the shared site footer (ftr v1a) used across the site.
   Self-contained: scopes the dark-theme variables onto footer.ftr.v1a so it renders
   correctly on pages (e.g. project-case pages) that don't define them. */
(function(){
  var CSS = `
  footer.ftr.v1a{--ink-900:#06121C;--signal:#00ADEF;--paper:#FFFFFF;--muted:rgba(255,255,255,.55);--soft:rgba(255,255,255,.78);--hairline:rgba(0,173,239,.14);--line:rgba(255,255,255,.08);background:var(--ink-900);border-top:1px solid var(--hairline);color:var(--paper);font-family:'IBM Plex Sans',sans-serif;font-weight:300;width:100%;padding:0;margin:0;display:block}
  .ftr.v1a a{color:inherit;text-decoration:none;transition:color .18s}
  .ftr.v1a .v1a-inner{max-width:1320px;margin:0 auto;padding:0 56px}
  .ftr.v1a .v1a-sig{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px;padding:18px 0;border-bottom:1px solid var(--line);font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.18em;color:var(--muted);text-transform:uppercase}
  .ftr.v1a .v1a-sig .sig-mid{justify-self:center;display:inline-flex;align-items:center;gap:10px;color:var(--signal)}
  .ftr.v1a .v1a-sig .sig-mid .dot{width:7px;height:7px;background:var(--signal);border-radius:50%;box-shadow:0 0 6px rgba(0,173,239,.6);animation:v1aPulse 2s ease-in-out infinite}
  .ftr.v1a .v1a-sig .sig-r{justify-self:end}
  @keyframes v1aPulse{0%,100%{opacity:1}50%{opacity:.5}}
  .ftr.v1a .v1a-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr 1fr;gap:48px;padding:72px 0 56px}
  .ftr.v1a .v1a-brand{padding-right:24px;border-right:1px solid var(--line)}
  .ftr.v1a .v1a-brand .v1a-logo{display:inline-block;margin-bottom:22px;line-height:0}
  .ftr.v1a .v1a-brand .v1a-logo img{height:46px;width:auto;display:block}
  .ftr.v1a .v1a-tag{font-family:'Archivo',sans-serif;font-weight:700;font-size:24px;line-height:1.15;letter-spacing:-.01em;color:var(--paper);margin-bottom:20px;max-width:18ch}
  .ftr.v1a .v1a-tag em{color:var(--signal);font-style:normal}
  .ftr.v1a .v1a-desc{font-size:14px;line-height:1.6;color:var(--muted);max-width:36ch}
  .ftr.v1a .v1a-col{display:flex;flex-direction:column;gap:18px}
  .ftr.v1a .v1a-col-h{font-family:'Archivo',sans-serif;font-weight:700;font-size:14px;letter-spacing:.18em;color:var(--paper);text-transform:uppercase;display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--line);margin:0}
  .ftr.v1a .v1a-col-h .ix{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:10px;color:var(--signal);letter-spacing:.18em}
  .ftr.v1a .v1a-col ul{list-style:none;display:flex;flex-direction:column;gap:11px;margin:0;padding:0}
  .ftr.v1a .v1a-col ul li a{font-size:14px;color:var(--soft);line-height:1.4;display:inline-block}
  .ftr.v1a .v1a-col ul li a:hover{color:var(--signal)}
  .ftr.v1a .v1a-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:48px;padding:32px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .ftr.v1a .v1a-meta .block{display:flex;flex-direction:column;gap:8px}
  .ftr.v1a .v1a-meta .block .lbl{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.22em;color:var(--muted);text-transform:uppercase;margin-bottom:6px}
  .ftr.v1a .v1a-meta .block a,.ftr.v1a .v1a-meta .block .val{font-family:'IBM Plex Sans',sans-serif;font-size:14.5px;color:var(--paper);font-weight:400;letter-spacing:.005em;line-height:1.45}
  .ftr.v1a .v1a-meta .block a:hover{color:var(--signal)}
  .ftr.v1a .v1a-meta .block .val{color:var(--soft);font-weight:300}
  .ftr.v1a .v1a-bottom{display:grid;grid-template-columns:auto 1fr auto;gap:24px;align-items:center;padding:24px 0 28px;font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.18em;color:var(--muted);text-transform:uppercase}
  .ftr.v1a .v1a-bottom .rule{height:1px;background:var(--line)}
  @media(max-width:1080px){.ftr.v1a .v1a-grid{grid-template-columns:1fr 1fr 1fr;gap:32px}.ftr.v1a .v1a-brand{grid-column:span 3;border-right:0;padding-right:0;border-bottom:1px solid var(--line);padding-bottom:36px}.ftr.v1a .v1a-meta{grid-template-columns:1fr 1fr;gap:32px}.ftr.v1a .v1a-bottom{grid-template-columns:1fr;text-align:left}.ftr.v1a .v1a-bottom .rule{display:none}.ftr.v1a .v1a-sig{grid-template-columns:1fr;gap:8px}.ftr.v1a .v1a-sig .sig-mid,.ftr.v1a .v1a-sig .sig-r{justify-self:start}.ftr.v1a .v1a-inner{padding:0 24px}}
  @media(max-width:640px){.ftr.v1a .v1a-grid{grid-template-columns:1fr 1fr}.ftr.v1a .v1a-brand{grid-column:span 2}}
  @media(max-width:430px){.ftr.v1a .v1a-grid{grid-template-columns:1fr}.ftr.v1a .v1a-brand{grid-column:span 1}.ftr.v1a .v1a-meta{grid-template-columns:1fr}}
  `;
  document.write('<style>'+CSS+'</style>');

  var html =
  '<footer class="ftr v1a">'+
    '<div class="v1a-inner">'+
      '<div class="v1a-grid">'+
        '<div class="v1a-brand">'+
          '<a href="/" class="v1a-logo"><img src="assets/logo.png" alt="Vibe Energy"></a>'+
          '<p class="v1a-tag">Energie is de <em>nieuwe exploitatie.</em></p>'+
          '<p class="v1a-desc">E&eacute;n partij die lokale energiecentrales ontwerpt, bouwt &eacute;n exploiteert &mdash; als systeem, niet als product.</p>'+
        '</div>'+
        '<div class="v1a-col">'+
          '<span class="v1a-col-h"><span class="ix">01</span>Oplossingen</span>'+
          '<ul>'+
            '<li><a href="capaciteit-als-dienst">Capaciteit als Dienst</a></li>'+
            '<li><a href="oplossing-laadplein">Laadplein zonder netverzwaring</a></li>'+
            '<li><a href="oplossing-netcongestie">Netcongestie oplossen</a></li>'+
            '<li><a href="oplossing-exploitatie">Exploitatie zonder investering</a></li>'+
            '<li><a href="energiehandel-flexmarkten">Energiehandel &amp; Flexmarkten</a></li>'+
            '<li><a href="oplossing-energielabel">Energielabel verhogen</a></li>'+
          '</ul>'+
        '</div>'+
        '<div class="v1a-col">'+
          '<span class="v1a-col-h"><span class="ix">02</span>Industrie&euml;n</span>'+
          '<ul>'+
            '<li><a href="industrie-logistiek">Logistiek</a></li>'+
            '<li><a href="industrie-vastgoed">Kantoren &amp; vastgoed</a></li>'+
            '<li><a href="industrie-vve">VvE\'s &amp; Wooncomplexen</a></li>'+
            '<li><a href="industrie-residentieel">Residentieel vastgoed</a></li>'+
            '<li><a href="industrie-recreatie">Recreatie</a></li>'+
          '</ul>'+
        '</div>'+
        '<div class="v1a-col">'+
          '<span class="v1a-col-h"><span class="ix">03</span>Systeem</span>'+
          '<ul>'+
            '<li><a href="microgrids">Microgrids</a></li>'+
            '<li><a href="energy-hubs">Energy Hubs</a></li>'+
            '<li><a href="systeem-ems">EMS</a></li>'+
            '<li><a href="systeem-energieopslag">Energieopslag</a></li>'+
            '<li><a href="systeem-zonnepanelen">Zonnepanelen</a></li>'+
            '<li><a href="systeem-laadpalen">Laadpalen</a></li>'+
          '</ul>'+
        '</div>'+
        '<div class="v1a-col">'+
          '<span class="v1a-col-h"><span class="ix">04</span>Overig</span>'+
          '<ul>'+
            '<li><a href="waarom-vibe">Waarom Vibe</a></li>'+
            '<li><a href="over-ons">Over ons</a></li>'+
            '<li><a href="contact">Contact</a></li>'+
          '</ul>'+
        '</div>'+
      '</div>'+
      '<div class="v1a-meta">'+
        '<div class="block"><span class="lbl">Contact</span><a href="mailto:info@vibeenergy.nl">info@vibeenergy.nl</a><a href="tel:+31850600489">+31 85 060 0489</a></div>'+
        '<div class="block"><span class="lbl">Adres</span><span class="val">Utrechtseweg 310 &middot; 6812AR</span><span class="val">Arnhem &middot; Nederland</span></div>'+
        '<div class="block"><span class="lbl">Registratie</span><span class="val">KvK &middot; 92191487</span><span class="val">BTW &middot; NL865924910B01</span></div>'+
        '<div class="block"><span class="lbl">Documenten</span><a href="privacy">Privacy</a><a href="algemene-voorwaarden">Algemene voorwaarden</a><a href="#cookies" data-cookie-prefs>Cookievoorkeuren</a></div>'+
      '</div>'+
      '<div class="v1a-bottom">'+
        '<span>&copy; 2026 Vibe Energy B.V. &middot; Alle rechten voorbehouden</span>'+
        '<span class="rule"></span>'+
        '<span>Energy systems engineering &middot; Nederland</span>'+
      '</div>'+
    '</div>'+
  '</footer>';

  document.write(html);
})();

/* Preview-mode link fix: clean URLs (no .html) resolve fine on the live server,
   but not when pages are opened directly as .html files. Only when the current
   page is served as *.html do we rewrite same-site extensionless links to point
   at the matching .html file. The live site (clean URLs) is untouched. */
(function(){
  if(!/\.html$/i.test(location.pathname)) return;
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href]');
    if(!a) return;
    if(a.target === '_blank' || a.hasAttribute('download')) return;
    if(a.hasAttribute('data-calendly') || /plan.*gesprek|adviesgesprek|bekijk.*praktijkcase/i.test(a.textContent||'')) return; // handled by Calendly popup
    var h = a.getAttribute('href');
    if(!h) return;
    if(/^(https?:|mailto:|tel:|#|javascript:)/i.test(h)) return;
    if(h === '/' ){ e.preventDefault(); location.href = 'index.html'; return; }
    var path = h.split(/[?#]/)[0], extra = h.slice(path.length);
    if(!path || /\.[a-z0-9]+$/i.test(path)) return;            // already has an extension
    e.preventDefault();
    location.href = path.replace(/^\//,'').replace(/\/$/,'') + '.html' + extra;
  }, true);
})();

/* ============================================================
   Calendly popup — "Plan (advies)gesprek" CTAs open an in-page
   scheduling overlay instead of navigating away.
   Any <a>/<button> whose text contains "gesprek"/"adviesgesprek"
   (or carries data-calendly) is intercepted site-wide.
   ============================================================ */
(function(){
  var CAL_URL = 'https://calendly.com/vibeenergy-sales/30min?hide_gdpr_banner=1';

  // Load Calendly widget assets once.
  if(!document.querySelector('link[href*="calendly.com/assets/external/widget.css"]')){
    var l = document.createElement('link');
    l.rel='stylesheet'; l.href='https://assets.calendly.com/assets/external/widget.css';
    document.head.appendChild(l);
  }
  if(!document.querySelector('script[src*="calendly.com/assets/external/widget.js"]')){
    var s = document.createElement('script');
    s.src='https://assets.calendly.com/assets/external/widget.js'; s.async=true;
    document.head.appendChild(s);
  }

  function isCalTrigger(el){
    if(!el) return false;
    if(el.hasAttribute('data-calendly')) return true;
    return /plan.*gesprek|adviesgesprek|bekijk.*praktijkcase/i.test((el.textContent||'').trim());
  }

  document.addEventListener('click', function(e){
    var el = e.target.closest && e.target.closest('a,button');
    if(!el || !isCalTrigger(el)) return;
    e.preventDefault();
    e.stopPropagation();
    var url = el.getAttribute('data-calendly') || CAL_URL;
    if(window.Calendly && typeof window.Calendly.initPopupWidget === 'function'){
      window.Calendly.initPopupWidget({ url: url + (url.indexOf('utm_')<0 ? '&utm_source=website&utm_medium=cta' : '') });
    } else {
      // Widget not ready yet — open scheduling page in a new tab as fallback.
      window.open(url, '_blank', 'noopener');
    }
  }, true);
})();
