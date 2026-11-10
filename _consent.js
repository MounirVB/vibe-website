/* ============================================================
   VIBE ENERGY — Cookiemelding + consent management
   Laadt als EERSTE script in <head>, vóór GTM en Clarity.
   - Zet Google Consent Mode v2 op 'denied' tot toestemming
   - Toont de cookiebanner (1x, keuze bewaard in localStorage)
   - Geeft window.vibeConsent.on('analytics', cb) voor scripts
     die pas ná toestemming mogen laden (o.a. _clarity.js)
   - window.vibeConsent.open() heropent de instellingen
     (bijv. vanuit een link "Cookievoorkeuren" in de footer)
   ============================================================ */
(function(){
  var KEY='vibe_consent_v1', VERSION=1;
  var state=null;
  try{ var raw=localStorage.getItem(KEY); if(raw){ var p=JSON.parse(raw); if(p&&p.v===VERSION) state=p; } }catch(e){}

  /* ---------- Google Consent Mode v2 defaults ---------- */
  window.dataLayer=window.dataLayer||[];
  function gtag(){ window.dataLayer.push(arguments); }
  gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});

  var listeners={analytics:[],marketing:[]};
  function fire(){
    if(!state) return;
    ['analytics','marketing'].forEach(function(k){
      if(state[k]){ var q=listeners[k]; listeners[k]=[]; q.forEach(function(cb){ try{cb();}catch(e){} }); }
    });
  }
  function push(){
    if(!state) return;
    gtag('consent','update',{
      analytics_storage: state.analytics?'granted':'denied',
      ad_storage: state.marketing?'granted':'denied',
      ad_user_data: state.marketing?'granted':'denied',
      ad_personalization: state.marketing?'granted':'denied'
    });
    window.dataLayer.push({event:'vibe_consent_update',vibe_analytics:!!state.analytics,vibe_marketing:!!state.marketing});
    fire();
  }
  /* ---------- opruimen na een geweigerde marketingkeuze ----------
     Een weigering moet ook TERUGWERKEN: wie eerst accepteert en later
     terugzet, hield anders de cookies die intussen zijn geplaatst.
     Alleen benoemde sleutels — blind wissen kan de site raken.
     Zie de commit voor de meetwaarden. */
  /* _gcl_* komt van de Conversion Linker in GTM-KM2V7VQ3; gemeten bleven die
     na een intrekking staan terwijl _fbp wel werd gewist. */
  var MARKETING_COOKIES=['_fbp','_fbc','_gcl_au','_gcl_aw','_gcl_dc','_gcl_gb','_gcl_gs'];
  var MARKETING_LOCALSTORAGE=['lastExternalReferrer','lastExternalReferrerTime','_gcl_ls'];
  /* Een Custom HTML-tag in de GTM-container schrijft deze weg zodra iemand met
     een advertentieparameter binnenkomt — ook zonder toestemming. Die tag zit
     niet in deze repository; de weigering ruimt zijn sporen hier wel op. */
  var MARKETING_SESSIONSTORAGE=['vibe_gclid','vibe_gbraid','vibe_wbraid','vibe_utm_source','vibe_utm_medium','vibe_utm_campaign','vibe_utm_term'];
  function wisMarketingSporen(){
    var host=location.hostname;
    /* van 'www.vibeenergy.nl' ook '.vibeenergy.nl' proberen: de pixel zet de
       cookie een niveau hoger dan de host waarop hij draait */
    var delen=host.split('.');
    var domeinen=[null,host];
    if(delen.length>2) domeinen.push('.'+delen.slice(-2).join('.'));
    else if(delen.length===2) domeinen.push('.'+host);
    MARKETING_COOKIES.forEach(function(naam){
      domeinen.forEach(function(d){
        try{
          document.cookie=naam+'=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'+(d?'; domain='+d:'');
        }catch(e){}
      });
    });
    MARKETING_LOCALSTORAGE.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
    MARKETING_SESSIONSTORAGE.forEach(function(k){ try{ sessionStorage.removeItem(k); }catch(e){} });
  }

  function save(analytics,marketing){
    state={v:VERSION,analytics:!!analytics,marketing:!!marketing,ts:Date.now()};
    try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){}
    /* Opruimen zodra marketing NIET is toegestaan. Ook bij een eerste keuze
       'Alleen noodzakelijk': er kan al een cookie staan van vóór deze
       wijziging, of uit een eerdere sessie op dit apparaat. */
    if(!state.marketing) wisMarketingSporen();
    push();
  }
  window.vibeConsent={
    get:function(){ return state; },
    has:function(k){ return !!(state&&state[k]); },
    on:function(k,cb){ if(state&&state[k]){ try{cb();}catch(e){} } else { (listeners[k]||(listeners[k]=[])).push(cb); } },
    open:function(){ show(true); }
  };
  if(state) push();

  /* ---------- styles ----------
     De mobiele regels (max-width:560px) zijn omgedraaid: niet drie gestapelde
     knoppen op volle breedte, maar twee naast elkaar met een sticky actierij
     en een hoogteplafond. Reden en meetwaarden staan in de commit. */
  var CSS="\
  .vck-ov{position:fixed;inset:0;z-index:100000;display:flex;align-items:flex-end;justify-content:center;padding:18px;font-family:'IBM Plex Sans',system-ui,-apple-system,sans-serif;pointer-events:none}\
  .vck-ov.pref{align-items:center;background:rgba(4,12,20,.6);backdrop-filter:blur(5px);pointer-events:auto;opacity:0;transition:opacity .28s ease}\
  .vck-ov.pref.on{opacity:1}\
  .vck{pointer-events:auto;width:100%;max-width:660px;background:#fff;border:1px solid rgba(14,27,36,.12);border-top:3px solid #00ADEF;border-radius:4px;box-shadow:0 24px 70px rgba(4,12,20,.28);transform:translateY(18px);opacity:0;transition:transform .34s cubic-bezier(.16,1,.3,1),opacity .28s ease}\
  .vck.on{transform:none;opacity:1}\
  .vck-in{padding:22px 24px 20px}\
  .vck-eb{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#0096CC;margin-bottom:9px}\
  .vck-t{font-family:'Archivo',sans-serif;font-weight:700;font-size:18px;line-height:1.25;letter-spacing:-.01em;color:#0E1B24;margin:0 0 8px}\
  .vck-p{font-size:13.5px;line-height:1.6;color:#33454F;margin:0}\
  .vck-p a{color:#0096CC;text-decoration:underline;text-underline-offset:2px}\
  .vck-p a:hover{color:#0078AD}\
  .vck-act{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}\
  .vck-b{font-family:'IBM Plex Sans',sans-serif;font-size:13px;font-weight:600;line-height:1;padding:13px 20px;border-radius:3px;border:1px solid transparent;cursor:pointer;transition:background .18s ease,color .18s ease,border-color .18s ease}\
  .vck-b:focus-visible{outline:2px solid #00ADEF;outline-offset:2px}\
  .vck-b1{background:#00ADEF;color:#06121C;flex:1 1 auto;min-width:170px}\
  .vck-b1:hover{background:#0096CC;color:#fff}\
  .vck-b2{background:#fff;color:#0E1B24;border-color:rgba(14,27,36,.22)}\
  .vck-b2:hover{border-color:#0096CC;color:#0096CC}\
  .vck-b3{background:transparent;color:#5E6F79;padding-left:12px;padding-right:12px}\
  .vck-b3:hover{color:#0E1B24}\
  .vck-rows{margin:16px 0 4px;border-top:1px solid rgba(14,27,36,.12)}\
  .vck-r{display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:1px solid rgba(14,27,36,.12)}\
  .vck-rt{flex:1}\
  .vck-rn{font-family:'Archivo',sans-serif;font-weight:600;font-size:13.5px;color:#0E1B24;margin-bottom:3px}\
  .vck-rd{font-size:12.5px;line-height:1.55;color:#5E6F79}\
  .vck-sw{position:relative;flex:0 0 auto;width:42px;height:24px;border-radius:12px;background:rgba(14,27,36,.16);border:0;cursor:pointer;transition:background .2s ease;margin-top:2px}\
  .vck-sw:after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(4,12,20,.3);transition:transform .2s cubic-bezier(.16,1,.3,1)}\
  .vck-sw[aria-checked='true']{background:#00ADEF}\
  .vck-sw[aria-checked='true']:after{transform:translateX(18px)}\
  .vck-sw[disabled]{background:rgba(0,173,239,.4);cursor:not-allowed}\
  .vck-sw:focus-visible{outline:2px solid #00ADEF;outline-offset:2px}\
  @media(max-width:560px){\
    .vck-in{padding:16px 16px 14px}\
    .vck-eb{display:none}\
    .vck-t{font-size:16.5px;margin-bottom:6px}\
    .vck-p{font-size:12.5px;line-height:1.5}\
    .vck-act{margin-top:12px;gap:8px;position:sticky;bottom:0;background:#fff;padding:8px 0 2px;box-shadow:0 -10px 12px -8px rgba(4,12,20,.18)}\
    .vck-b{min-height:44px;padding:11px 10px;font-size:12.5px;white-space:normal}\
    /* VOLLE BREEDTE, EN NIET TWEE NAAST ELKAAR.\
       Deze regel stond eerst op flex:1 1 calc(50% - 4px) met een uitzondering\
       onder 376px. Gemeten gaf dat op 390x844 twee knoppen van 126x59 waarin\
       'Alles accepteren' en 'Alleen noodzakelijk' allebei over TWEE regels\
       braken, terwijl 320px (190x44) en 768px (217x44) het wel goed deden.\
       De kapotte band liep van 376 tot 559px en bestrijkt daarmee iPhone 12\
       t/m 16 (390), Pixel (412) en de Pro Max-maten (430) — en dit is het\
       eerste scherm dat een nieuwe bezoeker op elke pagina ziet.\
       De kaart wordt hiervan hoger; een leesbaar label weegt zwaarder. */\
    .vck-b1,.vck-b2{flex:1 1 100%;min-width:0}\
    .vck-b3{flex:1 1 100%}\
    /* Het plafond geldt voor heel mobiel, niet alleen onder 376px. De\
       knoppenrij hierboven is sticky, dus het kost nooit een antwoord. */\
    .vck{max-height:58vh;overflow-y:auto}\
  }\
  ";

  var ov,card,prefsOpen=false,tmpA=false,tmpM=false,laatsteFocus=null;

  function el(tag,cls,html){ var n=document.createElement(tag); if(cls)n.className=cls; if(html!=null)n.innerHTML=html; return n; }

  /* ---------- plaats in de DOM: VOORAAN, maar NA de skip-link ----------
     Achteraan was de melding de 58e tabstop. Maar helemaal vooraan verloor
     .ve-skip zijn axe-uitzondering: 30 region-schendingen in beide engines.
     De skip-link is de eerste tabstop, de melding de tweede.
     position:fixed, dus de weergave verandert niet. */
  function plaatsMelding(n){
    var skip=document.querySelector('.ve-skip');
    if(skip&&skip.parentNode===document.body){
      if(skip.nextSibling) document.body.insertBefore(n,skip.nextSibling);
      else document.body.appendChild(n);
      return;
    }
    if(document.body.firstChild) document.body.insertBefore(n,document.body.firstChild);
    else document.body.appendChild(n);
  }

  function row(name,desc,checked,locked,onchange){
    var r=el('div','vck-r');
    var t=el('div','vck-rt'); t.appendChild(el('div','vck-rn',name)); t.appendChild(el('div','vck-rd',desc));
    var sw=el('button','vck-sw'); sw.type='button'; sw.setAttribute('role','switch');
    sw.setAttribute('aria-checked',checked?'true':'false'); sw.setAttribute('aria-label',name);
    if(locked){ sw.disabled=true; }
    else sw.addEventListener('click',function(){ var v=sw.getAttribute('aria-checked')!=='true'; sw.setAttribute('aria-checked',v?'true':'false'); onchange(v); });
    r.appendChild(t); r.appendChild(sw); return r;
  }

  /* ---------- scrollreserve ----------
     De melding ligt fixed over de pagina; zonder reserve is alles eronder
     onbereikbaar, en onderaan het document permanent. Kleiner maken helpt
     niet: op 390x844 staan de hero-CTA's op y=697 en 768, dus een melding
     die beide vrijlaat mag 13px hoog zijn. Niet-afdekken helpt wel.
     Alleen voor de onderaan verankerde melding, niet voor het modale paneel. */
  var reserveWaarnemer=null;
  function zetReserve(){
    if(!card||prefsOpen){ wisReserve(); return; }
    var h=Math.ceil(card.getBoundingClientRect().height);
    if(h>0) document.body.style.setProperty('padding-bottom', h+'px');
  }
  function wisReserve(){
    try{ document.body.style.removeProperty('padding-bottom'); }catch(e){}
    if(reserveWaarnemer){ try{ reserveWaarnemer.disconnect(); }catch(e){} reserveWaarnemer=null; }
    window.removeEventListener('resize',zetReserve);
    window.removeEventListener('orientationchange',zetReserve);
  }

  function close(){
    if(!ov) return;
    wisReserve();
    card.classList.remove('on'); ov.classList.remove('on');
    setTimeout(function(){ if(ov&&ov.parentNode) ov.parentNode.removeChild(ov); ov=null; },320);
    /* De focus terugzetten waar hij vandaan kwam. Zonder dit valt de focus na
       het sluiten terug naar het begin van het document en moet de bezoeker
       opnieuw naar beneden tabben. */
    if(laatsteFocus&&laatsteFocus.focus){ try{ laatsteFocus.focus({preventScroll:true}); }catch(e){} }
    laatsteFocus=null;
  }

  function render(){
    card.innerHTML='';
    var inn=el('div','vck-in');
    inn.appendChild(el('div','vck-eb','Cookies'));
    if(!prefsOpen){
      inn.appendChild(el('h2','vck-t','Deze site gebruikt cookies'));
        /* Noemt nu ook marketing: het paneel biedt die categorie wel aan, dus de
         oude formulering onderschatte wat er werd gevraagd. */
      inn.appendChild(el('p','vck-p','Noodzakelijke cookies laten de site werken. Analytische en marketingcookies plaatsen wij alleen met uw toestemming. Meer hierover in ons <a href="/privacy">privacybeleid</a>.'));
      var a=el('div','vck-act');
      var b1=el('button','vck-b vck-b1','Alles accepteren'); b1.type='button';
      var b2=el('button','vck-b vck-b2','Alleen noodzakelijk'); b2.type='button';
      var b3=el('button','vck-b vck-b3','Instellingen'); b3.type='button';
      b1.addEventListener('click',function(){ save(true,true); close(); });
      b2.addEventListener('click',function(){ save(false,false); close(); });
      b3.addEventListener('click',function(){ prefsOpen=true; ov.classList.add('pref'); ov.setAttribute('aria-modal','true'); setTimeout(function(){ov.classList.add('on');},10); render(); zetReserve(); });
      a.appendChild(b1); a.appendChild(b2); a.appendChild(b3); inn.appendChild(a);
    } else {
      inn.appendChild(el('h2','vck-t','Cookievoorkeuren'));
      inn.appendChild(el('p','vck-p','Bepaal zelf welke cookies wij mogen plaatsen. Uw keuze wordt bewaard en kan altijd worden gewijzigd.'));
      var rows=el('div','vck-rows');
      rows.appendChild(row('Noodzakelijk','Nodig om de website te laten werken, zoals formulieren, beveiliging en het onthouden van deze cookiekeuze. Deze kunnen niet worden uitgeschakeld.',true,true,function(){}));
      rows.appendChild(row('Analytisch','Meten hoe bezoekers de site gebruiken via Google Analytics en Microsoft Clarity, zodat wij pagina\u2019s kunnen verbeteren.',tmpA,false,function(v){tmpA=v;}));
      rows.appendChild(row('Marketing','Advertentie- en remarketingcookies om onze campagnes te meten en relevanter te maken.',tmpM,false,function(v){tmpM=v;}));
      inn.appendChild(rows);
      var a2=el('div','vck-act');
      var s1=el('button','vck-b vck-b1','Keuze opslaan'); s1.type='button';
      var s2=el('button','vck-b vck-b2','Alles accepteren'); s2.type='button';
      s1.addEventListener('click',function(){ save(tmpA,tmpM); close(); });
      s2.addEventListener('click',function(){ save(true,true); close(); });
      a2.appendChild(s1); a2.appendChild(s2); inn.appendChild(a2);
    }
    card.appendChild(inn);
  }

  function show(openPrefs){
    if(ov) return;
    if(!document.getElementById('vck-css')){ var st=el('style'); st.id='vck-css'; st.textContent=CSS; document.head.appendChild(st); }
    laatsteFocus=document.activeElement&&document.activeElement!==document.body?document.activeElement:null;
    tmpA=!!(state&&state.analytics); tmpM=!!(state&&state.marketing); prefsOpen=!!openPrefs;
    ov=el('div','vck-ov'); ov.setAttribute('role','dialog'); ov.setAttribute('aria-label','Cookiemelding');
    /* aria-modal alleen waar de melding werkelijk modaal is: het paneel heeft
       een achtergrond, de eerste melding laat de pagina bruikbaar.
       role=dialog met aria-live was tegenstrijdig en is weg. */
    ov.setAttribute('aria-modal',openPrefs?'true':'false');
    card=el('div','vck');
    if(openPrefs) ov.classList.add('pref');
    ov.appendChild(card);
    plaatsMelding(ov);
    render();
    requestAnimationFrame(function(){
      card.classList.add('on');
      /* De reserve pas NA de eerste opmaakronde, want daarvoor is de hoogte
         van de kaart nog niet bekend. De waarnemer houdt hem gelijk als de
         tekst herschikt bij draaien of een andere lettergrootte. */
      zetReserve();
      window.addEventListener('resize',zetReserve);
      window.addEventListener('orientationchange',zetReserve);
      if(window.ResizeObserver&&!prefsOpen){
        try{ reserveWaarnemer=new ResizeObserver(zetReserve); reserveWaarnemer.observe(card); }catch(e){}
      }
      if(openPrefs){
        ov.classList.add('on');
        /* In het modale paneel hoort de focus naar binnen. Bij de eerste
           melding NIET: die onderbreekt de bezoeker niet, en focus stelen is
           daar agressiever dan nodig — hij staat nu toch vooraan in de taborde. */
        var eerste=card.querySelector('button,[href],input,select,textarea');
        if(eerste){ try{ eerste.focus({preventScroll:true}); }catch(e){} }
      }
    });
  }

  /* Escape sluit het modale voorkeurenpaneel. Is er nog GEEN keuze, dan gaat
     hij een stap terug naar de keuzevraag in plaats van hem te laten
     verdwijnen — sluiten zonder antwoord zou een stilzwijgende weigering zijn.
     De eerste melding zelf reageert niet op Escape. */
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape'||!ov||!prefsOpen) return;
    e.preventDefault();
    if(state){ close(); return; }
    prefsOpen=false;
    ov.classList.remove('on'); ov.classList.remove('pref');
    ov.setAttribute('aria-modal','false');
    render();
    zetReserve();
  });

  function boot(){
    /* footerlinks met href="#cookies" of data-cookie-prefs heropenen de instellingen */
    document.addEventListener('click',function(e){
      var t=e.target.closest&&e.target.closest('[data-cookie-prefs],a[href="#cookies"],a[href$="#cookies"]');
      if(t){ e.preventDefault(); show(true); }
    });
    /* Een frame wachten: chrome.js plaatst .ve-skip ook op DOMContentLoaded
       maar registreert zijn luisteraar later (defer tegen synchroon in head).
       Zonder uitstel bestaat de skip-link nog niet. */
    if(!state){
      if(window.requestAnimationFrame) requestAnimationFrame(function(){ show(false); });
      else show(false);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
