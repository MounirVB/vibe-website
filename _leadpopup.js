/* ============================================================
   VIBE ENERGY — Brochure lead popup (site-wide, self-contained)
   ------------------------------------------------------------
   Werkt op elke pagina. Zet vóór dit script een config:

     <script>window.VIBE_LEAD={
       slug:'netcongestie',
       brochure:'Netcongestie oplossen',
       file:'assets/brochures/netcongestie-oplossen.pdf'
     };</script>
     <script src="_leadpopup.js"></script>

   ============================================================
   >>> Mailen via de brochure-API (aparte Railway-service) <<<
   De popup post naam/e-mail/telefoon + brochure-id naar de API;
   die valideert server-side en stuurt via Resend de brochure naar
   de bezoeker en een lead-melding naar sales@vibeenergy.nl.
   De API-key staat uitsluitend als env-var op de API-service.
   ============================================================ */
(function(){
  var SEND_ENDPOINT = (window.VIBE_LEAD&&window.VIBE_LEAD.endpoint) || 'https://vibe-website-api-production.up.railway.app/api/brochure';

  var cfg = window.VIBE_LEAD || {};
  var slug     = cfg.slug || (location.pathname.replace(/^.*\//,'').replace(/\.html$/,'')||'home');
  var brochure = cfg.brochure || 'Vibe Energy brochure';
  var file     = cfg.file || '';
  if(!file){ return; } // geen brochure gekoppeld -> geen popup

  // beeld per pagina (config.photo overschrijft; anders map op slug)
  var PHOTO_MAP = {
    capaciteit:'assets/capaciteit-hero.jpg',
    netcongestie:'assets/netcongestie-hero.jpg',
    exploitatie:'assets/exploitatie-hero.jpg',
    energiehandel:'assets/energiehandel-hero.jpg',
    energielabel:'assets/energielabel-hero.jpg',
    vastgoedopbrengst:'assets/vastgoed-hero.jpg',
    laadplein:'assets/laadplein-hero.jpg',
    home:'assets/energy-hubs-hero.jpg'
  };
  var photo = cfg.photo || PHOTO_MAP[slug] || 'assets/energy-hubs-hero.jpg';

  // ?popup=1 -> forceer tonen (voor review); reset sessie-vlag
  var force = /[?&]popup=1/.test(location.search);

  var configured = true; // mailen loopt via de PHP-endpoint (Resend)
  var SS_KEY = 'vibe_lead_seen_'+slug;      // 1x per sessie per pagina
  var DONE_KEY = 'vibe_lead_done_'+slug;    // al ingevuld -> nooit meer

  function absUrl(p){ try{ return new URL(p, location.href).href; }catch(e){ return p; } }

  /* ---------- styles ---------- */
  var CSS = "\
  .vlp-ov{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(4,12,20,.72);backdrop-filter:blur(6px);opacity:0;transition:opacity .3s ease;font-family:'IBM Plex Sans',system-ui,sans-serif}\
  .vlp-ov.on{opacity:1}\
  .vlp{position:relative;width:100%;max-width:720px;max-height:calc(100vh - 40px);overflow-y:auto;background:#fff;border-radius:5px;box-shadow:0 40px 100px rgba(4,12,20,.5);transform:translateY(16px) scale(.98);transition:transform .34s cubic-bezier(.16,1,.3,1)}\
  .vlp-ov.on .vlp{transform:none}\
  .vlp-view{display:flex}\
  .vlp-left{width:44%;flex:none;position:relative;background:#06121C;color:#fff;padding:40px 32px;display:flex;flex-direction:column;overflow:hidden}\
  .vlp-left .vlp-bg{position:absolute;inset:0;background-size:cover;background-position:center;z-index:0}\
  .vlp-left .vlp-bg:after{content:'';position:absolute;inset:0;background:linear-gradient(160deg,rgba(6,18,28,.72),rgba(6,18,28,.94))}\
  .vlp-left>*{position:relative;z-index:1}\
  .vlp-left:before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:#00ADEF;z-index:2}\
  .vlp-right{flex:1;min-width:0;padding:40px 34px}\
  .vlp-ey{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:#00ADEF;margin:0}\
  .vlp-h{font-family:'Archivo',sans-serif;font-weight:800;font-size:27px;line-height:1.12;letter-spacing:-.015em;margin:16px 0 0}\
  .vlp-h em{color:#00ADEF;font-style:normal}\
  .vlp-sub{font-size:13.5px;line-height:1.55;color:rgba(255,255,255,.7);margin:14px 0 0}\
  .vlp-mono{margin-top:auto;font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,.42);letter-spacing:.04em;line-height:1.7;border-top:1px solid rgba(255,255,255,.12);padding-top:16px}\
  .vlp-x{position:absolute;top:12px;right:12px;z-index:5;width:38px;height:38px;border:1px solid #D5DEE5;background:#fff;color:#06121C;border-radius:50%;cursor:pointer;font-size:18px;font-weight:600;line-height:1;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(4,12,20,.18);transition:background .18s,color .18s,border-color .18s}\
  .vlp-x:hover{background:#06121C;color:#fff;border-color:#06121C}\
  .vlp-f{display:flex;flex-direction:column;gap:14px}\
  .vlp-field label{display:block;font-size:12px;font-weight:500;color:#06121C;margin:0 0 6px;letter-spacing:.01em}\
  .vlp-field label .req{color:#00ADEF}\
  .vlp-field input{width:100%;box-sizing:border-box;padding:12px 14px;font-family:inherit;font-size:15px;color:#06121C;background:#F4F7F9;border:1px solid #E2E8ED;border-radius:3px;transition:border-color .16s,background .16s;outline:none}\
  .vlp-field input:focus{border-color:#00ADEF;background:#fff}\
  .vlp-field input.err{border-color:#E0483D;background:#FDF3F2}\
  .vlp-err{font-size:11.5px;color:#E0483D;margin:5px 0 0;display:none}\
  .vlp-field.bad .vlp-err{display:block}\
  .vlp-submit{margin-top:6px;width:100%;padding:14px;border:0;border-radius:3px;background:#00ADEF;color:#041018;font-family:'Archivo',sans-serif;font-weight:700;font-size:15px;letter-spacing:.01em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;transition:background .18s,transform .12s}\
  .vlp-submit:hover{background:#1cbcff}\
  .vlp-submit:active{transform:translateY(1px)}\
  .vlp-submit[disabled]{opacity:.6;cursor:default}\
  .vlp-submit .arr{width:16px;height:16px;border:solid #041018;border-width:0 2px 2px 0;display:inline-block;padding:3px;transform:rotate(-45deg);margin-left:2px}\
  .vlp-note{font-size:11px;line-height:1.5;color:#6B7A85;margin:14px 0 0;text-align:center}\
  .vlp-note a{color:#0090c8}\
  .vlp-spin{width:16px;height:16px;border:2px solid rgba(4,16,24,.3);border-top-color:#041018;border-radius:50%;animation:vlpspin .7s linear infinite}\
  @keyframes vlpspin{to{transform:rotate(360deg)}}\
  .vlp-ok{padding:38px 34px 40px;text-align:center}\
  .vlp-ok .ic{width:56px;height:56px;margin:0 auto 18px;border-radius:50%;background:rgba(0,173,239,.12);display:flex;align-items:center;justify-content:center}\
  .vlp-ok .ic svg{width:28px;height:28px;stroke:#00ADEF;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}\
  .vlp-ok h3{font-family:'Archivo',sans-serif;font-weight:800;font-size:22px;color:#06121C;margin:0 0 10px}\
  .vlp-ok p{font-size:14px;line-height:1.55;color:#4A5A65;margin:0 auto;max-width:32ch}\
  .vlp-dl{display:inline-flex;align-items:center;gap:9px;margin-top:22px;padding:12px 22px;background:#06121C;color:#fff;text-decoration:none;border-radius:3px;font-family:'Archivo',sans-serif;font-weight:700;font-size:14px}\
  .vlp-dl:hover{background:#0c2233}\
  @media(max-width:600px){.vlp{max-width:430px}.vlp-view{flex-direction:column}.vlp-left{width:auto;padding:30px 26px}.vlp-right{padding:26px 26px 28px}.vlp-h{font-size:23px}.vlp-mono{margin-top:16px}}\
  ";
  var st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);

  /* ---------- markup ---------- */
  var ov=document.createElement('div'); ov.className='vlp-ov'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
  ov.innerHTML =
    '<div class="vlp">'+
      '<button class="vlp-x" type="button" aria-label="Sluiten">&#10005;</button>'+
      '<div class="vlp-view">'+
        '<div class="vlp-left">'+
          '<div class="vlp-bg" style="background-image:url('+esc(photo)+')"></div>'+
          '<p class="vlp-ey">Gratis brochure</p>'+
          '<h2 class="vlp-h">'+esc(brochure)+'.</h2>'+
          '<p class="vlp-sub">Het volledige verhaal: businesscase, exploitatiemodel en praktijkcases &mdash; in één document, direct beschikbaar.</p>'+
          '<p class="vlp-mono">VIBE ENERGY<br>7 waardestromen · 0 jr wachttijd<br>−22% netinkoop</p>'+
        '</div>'+
        '<div class="vlp-right">'+
          '<form class="vlp-f" novalidate>'+
            '<input name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;height:0;width:0;border:0;padding:0">'+
            '<div class="vlp-field"><label>Naam</label><input name="name" type="text" autocomplete="name" placeholder="Uw naam"></div>'+
            '<div class="vlp-field" data-req><label>E-mail <span class="req">*</span></label><input name="email" type="email" autocomplete="email" placeholder="naam@bedrijf.nl"><p class="vlp-err">Vul een geldig e-mailadres in.</p></div>'+
            '<div class="vlp-field" data-req><label>Telefoon <span class="req">*</span></label><input name="phone" type="tel" autocomplete="tel" placeholder="06 12 34 56 78"><p class="vlp-err">Vul een geldig telefoonnummer in.</p></div>'+
            '<button class="vlp-submit" type="submit"><span class="lbl">Stuur mij de brochure</span><span class="arr"></span></button>'+
            '<p class="vlp-note">Wij gebruiken uw gegevens alleen om de brochure te sturen en eventueel contact op te nemen. Zie ons <a href="privacy" target="_blank">privacybeleid</a>.</p>'+
          '</form>'+
        '</div>'+
      '</div>'+
    '</div>';
  function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

  var view = ov.querySelector('.vlp-view');
  var form = ov.querySelector('.vlp-f');
  var btn  = ov.querySelector('.vlp-submit');
  var closed=false;

  /* ---------- open / close ---------- */
  function open(){ if(document.body.contains(ov))return; document.body.appendChild(ov); document.body.style.overflow='hidden'; requestAnimationFrame(function(){ov.classList.add('on');}); sessionStorage.setItem(SS_KEY,'1'); }
  function close(){ closed=true; ov.classList.remove('on'); document.body.style.overflow=''; setTimeout(function(){ if(ov.parentNode)ov.parentNode.removeChild(ov); },320); }
  ov.querySelector('.vlp-x').addEventListener('click',close);
  ov.addEventListener('mousedown',function(e){ if(e.target===ov)close(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&document.body.contains(ov))close(); });

  /* ---------- validation ---------- */
  function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function validPhone(v){ return (v.replace(/[^\d]/g,'').length>=8); }
  [].forEach.call(form.querySelectorAll('input'),function(i){ i.addEventListener('input',function(){ i.classList.remove('err'); i.closest('.vlp-field').classList.remove('bad'); }); });

  /* ---------- submit ---------- */
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var name=form.name.value.trim(), email=form.email.value.trim(), phone=form.phone.value.trim();
    var ok=true;
    var fe=form.email.closest('.vlp-field'), fp=form.phone.closest('.vlp-field');
    if(!validEmail(email)){ form.email.classList.add('err'); fe.classList.add('bad'); ok=false; }
    if(!validPhone(phone)){ form.phone.classList.add('err'); fp.classList.add('bad'); ok=false; }
    if(!ok){ (form.email.classList.contains('err')?form.email:form.phone).focus(); return; }

    var lead={ name:name, email:email, phone:phone, brochure:brochure, page:slug, ts:new Date().toISOString() };
    try{ var all=JSON.parse(localStorage.getItem('vibe_leads')||'[]'); all.push(lead); localStorage.setItem('vibe_leads',JSON.stringify(all)); }catch(err){}

    btn.setAttribute('disabled','');
    btn.querySelector('.lbl').textContent='Versturen';
    btn.querySelector('.arr').outerHTML='<span class="vlp-spin"></span>';

    // Succes ALLEEN als de API echt 2xx teruggeeft; anders eerlijke foutmelding.
    sendEmails(lead).then(function(){
      localStorage.setItem(DONE_KEY,'1');
      if(window.gtag)gtag('event','generate_lead',{brochure:brochure,page:slug});
      if(window.fbq)fbq('track','Lead',{content_name:brochure});
      success();
    }).catch(function(err){
      console.error('[VibeLead] aanvraag MISLUKT:', (err&&err.message)||err);
      failure();
    });
  });

  function sendEmails(lead){
    // Server-side whitelist: alleen het brochure-id (slug) gaat mee; de API
    // bepaalt zelf titel, brochure-URL en ontvanger.
    return fetch(SEND_ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        name: lead.name||'', email: lead.email, phone: lead.phone||'',
        brochure: slug, website: (form.website&&form.website.value)||''
      })
    }).then(function(r){
      if(!r.ok){ throw new Error('endpoint '+r.status); }
      return r.json();
    });
  }

  function success(){
    var msg = 'De brochure is onderweg naar <strong>'+esc(form.email.value.trim())+'</strong>. Geen mail ontvangen? Check uw spam of open hieronder direct.';
    view.style.display='block';
    view.innerHTML =
      '<div class="vlp-ok">'+
        '<div class="ic"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></div>'+
        '<h3>Gelukt!</h3>'+
        '<p>'+msg+'</p>'+
        '<a class="vlp-dl" href="'+esc(file)+'" target="_blank" download>Brochure openen'+
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 11l5 4 5-4M5 21h14"/></svg>'+
        '</a>'+
      '</div>';
    // open de brochure automatisch in een nieuw tabblad
    try{ window.open(file,'_blank'); }catch(e){}
  }

  function failure(){
    view.style.display='block';
    view.innerHTML =
      '<div class="vlp-ok">'+
        '<div class="ic"><svg viewBox="0 0 24 24"><path d="M12 8v5M12 16.5v.5"/></svg></div>'+
        '<h3>Versturen niet gelukt</h3>'+
        '<p>De brochure is geopend, maar het versturen van uw aanvraag is niet gelukt. Probeer het later opnieuw of mail ons op <a href="mailto:sales@vibeenergy.nl">sales@vibeenergy.nl</a>.</p>'+
        '<a class="vlp-dl" href="'+esc(file)+'" target="_blank" download>Brochure openen'+
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 11l5 4 5-4M5 21h14"/></svg>'+
        '</a>'+
      '</div>';
    // de brochure-download blijft de primaire delivery — ook bij mailfalen
    try{ window.open(file,'_blank'); }catch(e){}
  }

  /* ---------- triggers ---------- */
  if(force){ requestAnimationFrame(open); return; }
  if(localStorage.getItem(DONE_KEY)) return; // alleen na invullen nooit meer tonen
  var fired=false;
  function cookieBannerOpen(){ return !!document.querySelector('.vck-ov'); }
  function fire(){ if(fired||closed)return; if(cookieBannerOpen()){ setTimeout(fire,600); return; } fired=true; cleanup(); open(); }
  function heroBottom(){
    var h=document.querySelector('.phero,.hero,section[data-screen-label*="Hero"],main>section:first-of-type');
    if(h){ var r=h.getBoundingClientRect(); return r.height ? r.top+window.pageYOffset+r.height*0.75 : window.innerHeight*0.6; }
    return window.innerHeight*0.6;
  }
  // trigger: zodra de bezoeker de hero-banner voorbij scrollt
  function onScroll(){ if((window.pageYOffset||document.documentElement.scrollTop)>=heroBottom())fire(); }
  function cleanup(){ window.removeEventListener('scroll',onScroll); }
  window.addEventListener('scroll',onScroll,{passive:true});
})();
