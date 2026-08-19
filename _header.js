/* Global header loader — injects shared nav (mega-menu + mobile menu) into <body>.
   Analytics (GA4) is handled by the GTM container (GTM-KM2V7VQ3) in the page <head>. */
(function(){
  var S = 'stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    bolt:'<svg viewBox="0 0 24 24" '+S+'><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    grid:'<svg viewBox="0 0 24 24" '+S+'><circle cx="5" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 11 17 6.7M7 13l10 4.3"/></svg>',
    euro:'<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="9"/><path d="M15.5 9.2a4 4 0 1 0 0 5.6M8 11h6M8 13.4h6"/></svg>',
    gauge:'<svg viewBox="0 0 24 24" '+S+'><path d="M3.5 13a8.5 8.5 0 0 1 17 0"/><path d="M12 13l4-3"/><circle cx="12" cy="13" r="1.1"/></svg>',
    paris:'<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="9"/><path d="M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    doc:'<svg viewBox="0 0 24 24" '+S+'><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 16.5h6"/></svg>',
    truck:'<svg viewBox="0 0 24 24" '+S+'><path d="M3 6h11v9.5H3z"/><path d="M14 9h3.5l3 3v3.5H14z"/><circle cx="7" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/></svg>',
    building:'<svg viewBox="0 0 24 24" '+S+'><path d="M4 21V5l8-3 8 3v16"/><path d="M9.5 21v-5h5v5"/><path d="M8 8h2M14 8h2M8 12h2M14 12h2"/></svg>',
    leaf:'<svg viewBox="0 0 24 24" '+S+'><path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14z"/><path d="M6 18C10 14 13 11.5 16.5 10"/></svg>',
    house:'<svg viewBox="0 0 24 24" '+S+'><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    cpu:'<svg viewBox="0 0 24 24" '+S+'><rect x="6" y="6" width="12" height="12" rx="1"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/></svg>',
    battery:'<svg viewBox="0 0 24 24" '+S+'><rect x="3" y="7" width="16" height="10" rx="1"/><path d="M21 10.5v3"/><path d="M11 9.5 8.5 12.5H11l-.6 2.3 2.6-3.1H10.4z"/></svg>',
    sun:'<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
    plug:'<svg viewBox="0 0 24 24" '+S+'><rect x="5" y="3" width="9" height="18" rx="1"/><path d="M9.5 7 7.5 11h3l-2 4"/><path d="M14 9h2.5a2 2 0 0 1 2 2v3.5a1.6 1.6 0 0 0 3.2 0V9l-2-2"/></svg>'
  };

  var MENUS = [
    {label:'Oplossingen', items:[
      ['capaciteit-als-dienst','gauge','Capaciteit als Dienst','Geen techniek kopen, maar beschikbaar vermogen'],
      ['oplossing-laadplein','bolt','Laadplein zonder netverzwaring','Laad meer voertuigen op dezelfde aansluiting'],
      ['oplossing-netcongestie','grid','Netcongestie oplossen','Capaciteit toevoegen zonder te wachten op het net'],
      ['oplossing-exploitatie','euro','Exploitatie zonder investering','Energie als inkomstenbron, geen kostenpost'],
      ['energiehandel-flexmarkten','grid','Energiehandel &amp; Flexmarkten','Flexibiliteit als waarde op de energiemarkten'],
      ['energie-als-vastgoedopbrengst','building','Energie als Vastgoedopbrengst','Van kostenpost naar exploitatie en rendement'],
      ['oplossing-energielabel','gauge','Energielabel verhogen','Van label C naar A zonder zorgen'],
      ['oplossing-paris-proof','paris','Paris Proof vastgoed','Voldoe aan de CO&sub2;-norm voor 2050'],
      ['oplossing-subsidies','doc','Subsidies &amp; businesscase','Haal het maximale uit EIA, SDE++ en ISDE']
    ], promo:['Niet zeker waar te beginnen?','Doe de gratis check en zie binnen twee minuten wat haalbaar is op uw aansluiting.','Netcongestie Check','netcongestie-check','Bekijk projecten','projecten','assets/projects/ratio-16.jpg']},
    {label:'Industrie&euml;n', items:[
      ['industrie-logistiek','truck','Logistiek','Distributiecentra, transport, koeling'],
      ['industrie-vastgoed','building','Kantoren &amp; vastgoed','Gebouwgebonden energie als asset'],
      ['industrie-vve','house','VvE\'s &amp; Wooncomplexen','Collectieve energiecentrales voor bewoners'],
      ['industrie-recreatie','leaf','Recreatie','Hotels, parken, attracties'],
      ['industrie-residentieel','house','Woningportefeuilles','Verhuur en woningcorporaties']
    ], promo:['Uw sector niet vermeld?','Elke aansluiting is anders. Vertel ons over uw locatie en we rekenen de businesscase door.','Plan gesprek','contact','Alle projecten','projecten','assets/projects/hedin-alkmaar.jpg']},
    {label:'Systeem', items:[
      ['microgrids','grid','Microgrids','Losse assets als één capaciteitssysteem'],
      ['systeem-ems','cpu','EMS','Het brein dat alles aanstuurt'],
      ['systeem-energieopslag','battery','Energieopslag','Industri&euml;le batterijsystemen'],
      ['systeem-zonnepanelen','sun','Zonnepanelen','Generatie op locatie'],
      ['systeem-laadpalen','plug','Laadpalen','EV-infrastructuur, AC en DC']
    ], promo:['E&eacute;n ge&iuml;ntegreerd systeem.','Opwek, opslag, sturing en laden &mdash; als &eacute;&eacute;n geheel ontworpen en beheerd.','Plan een gesprek','contact','Over Vibe Energy','over-ons','assets/projects/dormio.jpg']}
  ];

  var CSS = `
  .wordmark{align-self:flex-start;margin-top:-16px}
  .wordmark img{height:110px;width:auto;display:block}
  @media(max-width:960px){.wordmark img{height:66px}}
  @media(max-width:880px){.wordmark img{height:58px}}
  @media(max-width:560px){.wordmark img{height:48px}}

  /* ===== Desktop mega-menu (FrameIQ-stijl, vibe-blauw) ===== */
  .topnav .nav-mega{display:grid;grid-template-columns:1fr 290px;width:min(680px,calc(100vw - 40px));min-width:0;padding:0;overflow:hidden}
  .topnav .nav-drop.nav-mega{position:fixed;top:84px;left:50%;transform:translateX(-50%) translateY(-4px)}
  .topnav .nav-item.open .nav-drop.nav-mega{transform:translateX(-50%) translateY(0)}
  .topnav .nav-item[data-nav="oplossingen"] .nav-drop.nav-mega{transform:translateX(-50%) translateX(-108px) translateY(-4px)}
  .topnav .nav-item[data-nav="oplossingen"].open .nav-drop.nav-mega{transform:translateX(-50%) translateX(-108px) translateY(0)}
  .topnav .nav-item[data-nav="systeem"] .nav-drop.nav-mega{transform:translateX(-50%) translateX(98px) translateY(-4px)}
  .topnav .nav-item[data-nav="systeem"].open .nav-drop.nav-mega{transform:translateX(-50%) translateX(98px) translateY(0)}
  .topnav .mega-list{padding:20px 20px 22px;min-width:0}
  .topnav .nav-mega-wide{grid-template-columns:1fr 260px;width:min(900px,calc(100vw - 40px))}
  .topnav .nav-mega-wide .mega-list{display:grid;grid-template-columns:1fr 1fr;gap:0 8px;align-content:start}
  .topnav .nav-mega-wide .mega-label{grid-column:1 / -1}
  @media(max-width:1040px){.topnav .nav-mega-wide{grid-template-columns:1fr;width:min(560px,calc(100vw - 40px))}}
  .topnav .mega-label{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(232,240,245,.42);padding:4px 12px 12px}
  .topnav .mega-list a{display:flex;flex-direction:row;align-items:center;gap:15px;padding:11px 12px;border-left:2px solid transparent;background:none;transition:background .15s,border-color .15s}
  .topnav .mega-list a:hover{background:rgba(0,173,239,.08);border-left-color:#00ADEF}
  .topnav .mega-ic{flex:0 0 auto;width:44px;height:44px;display:grid;place-items:center;background:rgba(0,173,239,.10);color:#00ADEF;transition:background .15s}
  .topnav .mega-list a:hover .mega-ic{background:rgba(0,173,239,.18)}
  .topnav .mega-ic svg{width:21px;height:21px;display:block}
  .topnav .mega-txt{display:flex;flex-direction:column;gap:2px;min-width:0}
  .topnav .mega-txt b{font-family:'IBM Plex Sans',sans-serif;font-weight:600;font-size:14.5px;line-height:1.2;color:#fff}
  .topnav .mega-txt small{font-family:'IBM Plex Sans',sans-serif;font-weight:400;font-size:12px;line-height:1.35;letter-spacing:0;text-transform:none;color:rgba(232,240,245,.52)}
  .topnav .mega-promo{background:rgba(2,9,15,.55);border-left:1px solid rgba(0,173,239,.12);padding:26px 24px;display:flex;flex-direction:column}
  .topnav .mega-promo-img{margin:-26px -24px 20px;height:132px;overflow:hidden}
  .topnav .mega-promo-img img{width:100%;height:100%;object-fit:cover;display:block}
  .topnav .mega-promo-h{font-family:'Archivo',sans-serif;font-weight:800;font-size:21px;letter-spacing:-.02em;line-height:1.08;color:#fff}
  .topnav .mega-promo p{font-family:'IBM Plex Sans',sans-serif;font-weight:300;font-size:13px;line-height:1.5;color:rgba(232,240,245,.58);margin:11px 0 auto}
  .topnav .mega-promo a{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:10px;border-left:0}
  .topnav .mega-cta-primary{margin-top:20px;background:#00ADEF;color:#06121C;font-family:'IBM Plex Sans',sans-serif;font-weight:600;font-size:13.5px;padding:13px 16px;transition:background .2s}
  .topnav .mega-cta-primary:hover{background:#fff}
  .topnav .mega-cta-ghost{margin-top:9px;color:#fff;font-family:'IBM Plex Sans',sans-serif;font-weight:500;font-size:13.5px;padding:12px 16px;border:1px solid rgba(255,255,255,.18);transition:background .2s,border-color .2s}
  .topnav .mega-cta-ghost:hover{background:rgba(0,173,239,.08);border-color:#00ADEF}
  @media(max-width:1040px){.topnav .nav-mega{grid-template-columns:1fr;width:min(420px,calc(100vw - 40px))}.topnav .mega-promo{display:none}}

  /* ===== Hamburger + mobile menu ===== */
  .nav-burger{display:none;flex-direction:column;justify-content:center;gap:5px;width:46px;height:46px;padding:11px;background:none;border:0;cursor:pointer;flex-shrink:0}
  .nav-burger span{display:block;height:2px;width:100%;background:#fff;border-radius:2px;transition:transform .25s ease,opacity .2s ease}
  .topnav.m-open .nav-burger span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .topnav.m-open .nav-burger span:nth-child(2){opacity:0}
  .topnav.m-open .nav-burger span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
  .nav-mobile{display:none;position:fixed;top:92px;left:0;right:0;height:calc(100vh - 92px);height:calc(100dvh - 92px);background:rgba(6,18,28,.985);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);overflow-y:auto;z-index:99;-webkit-overflow-scrolling:touch}
  .nav-mobile .m-inner{padding:8px 22px 48px;display:flex;flex-direction:column;max-width:560px;margin:0 auto}
  .m-sec>button{display:flex;align-items:center;justify-content:space-between;width:100%;padding:19px 4px;background:none;border:0;border-bottom:1px solid rgba(255,255,255,.09);color:#fff;font-family:'IBM Plex Sans',sans-serif;font-weight:500;font-size:18px;cursor:pointer;text-align:left}
  .m-caret{width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid rgba(255,255,255,.5);transition:transform .25s ease;flex-shrink:0}
  .m-sec.open .m-caret{transform:rotate(180deg)}
  .m-sub{display:none;padding:6px 0 16px}
  .m-sec.open .m-sub{display:block}
  .m-sub a{display:flex;flex-direction:column;gap:2px;padding:13px 10px;border-left:2px solid transparent}
  .m-sub a:active{border-left-color:#00ADEF;background:rgba(0,173,239,.08)}
  .m-sub a b{font-family:'IBM Plex Sans',sans-serif;font-weight:600;font-size:15px;color:#fff}
  .m-sub a small{font-family:'IBM Plex Sans',sans-serif;font-weight:400;font-size:12.5px;color:rgba(232,240,245,.55);text-transform:none;letter-spacing:0;line-height:1.4}
  .m-link{padding:19px 4px;border-bottom:1px solid rgba(255,255,255,.09);color:#fff;font-family:'IBM Plex Sans',sans-serif;font-weight:500;font-size:18px}
  .m-cta{display:flex;flex-direction:column;gap:11px;margin-top:28px}
  .m-ghost{text-align:center;padding:16px;border:1px solid rgba(255,255,255,.22);color:#fff;font-family:'IBM Plex Sans',sans-serif;font-weight:500;font-size:15px}
  .m-fill{text-align:center;padding:17px;background:#00ADEF;color:#06121C;font-family:'IBM Plex Sans',sans-serif;font-weight:600;font-size:15px}
  body.m-lock{overflow:hidden}
  @media(max-width:1024px){.topnav .nav-burger{display:flex}.nav-mobile.show{display:block}.topnav .nav-actions{display:none}}
  `;
  document.write('<style>'+CSS+'</style>');

  function mega(m){
    var rows='';
    for(var i=0;i<m.items.length;i++){var it=m.items[i];
      rows+='<a href="'+it[0]+'"><span class="mega-ic">'+ICON[it[1]]+'</span><span class="mega-txt"><b>'+it[2]+'</b><small>'+it[3]+'</small></span></a>';}
    var p=m.promo;
    var wide=m.items.length>6?' nav-mega-wide':'';
    return '<div class="nav-drop nav-mega'+wide+'"><div class="mega-list"><div class="mega-label">'+m.label+'</div>'+rows+'</div>'+
      '<div class="mega-promo">'+(p[6]?'<div class="mega-promo-img"><img src="'+p[6]+'" alt="" loading="lazy"></div>':'')+'<div class="mega-promo-h">'+p[0]+'</div><p>'+p[1]+'</p>'+
      '<a class="mega-cta-primary" href="'+p[3]+'"><span>'+p[2]+'</span><span>&rarr;</span></a>'+
      '<a class="mega-cta-ghost" href="'+p[5]+'"><span>'+p[4]+'</span><span>&rarr;</span></a></div></div>';
  }
  function mobileSec(m){
    var rows='';
    for(var i=0;i<m.items.length;i++){var it=m.items[i];
      rows+='<a href="'+it[0]+'"><b>'+it[2]+'</b><small>'+it[3]+'</small></a>';}
    return '<div class="m-sec"><button type="button">'+m.label+'<span class="m-caret"></span></button><div class="m-sub">'+rows+'</div></div>';
  }

  var dataNav=['oplossingen','industrieen','systeem'];
  var links='', mobile='';
  for(var i=0;i<MENUS.length;i++){
    links+='<div class="nav-item" data-nav="'+dataNav[i]+'"><button class="nav-link" type="button">'+MENUS[i].label+'<span class="nav-caret"></span></button>'+mega(MENUS[i])+'</div>';
    mobile+=mobileSec(MENUS[i]);
  }

  var nav =
  '<nav class="topnav" id="topnav">'+
    '<a href="/" class="wordmark"><img src="assets/logo.png" alt="Vibe Energy"></a>'+
    '<div class="navlinks">'+links+
      '<div class="nav-item"><a href="energy-hubs" class="nav-link" style="text-decoration:none">Energy Hubs</a></div>'+
      '<div class="nav-item"><a href="projecten" class="nav-link" style="text-decoration:none">Projecten</a></div>'+
      '<div class="nav-item"><a href="waarom-vibe" class="nav-link" style="text-decoration:none">Waarom Vibe</a></div>'+
      '<div class="nav-item"><a href="over-ons" class="nav-link" style="text-decoration:none">Over ons</a></div>'+
    '</div>'+
    '<div class="nav-actions">'+
      '<a href="netcongestie-check" class="cta-secondary">Netcongestie Check</a>'+
      '<a href="contact" class="cta-pill" data-calendly><span>Plan gesprek</span><span class="arr"></span></a>'+
    '</div>'+
    '<button class="nav-burger" type="button" aria-label="Menu"><span></span><span></span><span></span></button>'+
    '<div class="nav-mobile"><div class="m-inner">'+mobile+
      '<a class="m-link" href="energy-hubs">Energy Hubs</a>'+
      '<a class="m-link" href="projecten">Projecten</a>'+
      '<a class="m-link" href="waarom-vibe">Waarom Vibe</a>'+
      '<a class="m-link" href="over-ons">Over ons</a>'+
      '<div class="m-cta"><a class="m-ghost" href="netcongestie-check">Netcongestie Check</a><a class="m-fill" href="contact" data-calendly>Plan gesprek</a></div>'+
    '</div></div>'+
  '</nav>';

  document.write(nav);

  /* Move the mobile panel out to <body> so its fixed positioning is never trapped by the nav's backdrop-filter containing block */
  function relocate(){ var mm=document.querySelector('#topnav .nav-mobile'); if(mm){ document.body.appendChild(mm); } }
  if(document.readyState!=='loading'){ relocate(); } else { document.addEventListener('DOMContentLoaded', relocate); }

  /* Mobile menu interactions (event delegation — survives document.write timing) */
  document.addEventListener('click', function(e){
    var burger = e.target.closest('.nav-burger');
    if(burger){ var n=document.getElementById('topnav'); var mm=document.querySelector('.nav-mobile'); var open=!n.classList.contains('m-open'); n.classList.toggle('m-open',open); if(mm){ mm.classList.toggle('show',open); } document.body.classList.toggle('m-lock',open); return; }
    var secBtn = e.target.closest('.nav-mobile .m-sec > button');
    if(secBtn){ secBtn.parentElement.classList.toggle('open'); return; }
    var mlink = e.target.closest('.nav-mobile a');
    if(mlink){ var nn=document.getElementById('topnav'); if(nn){ nn.classList.remove('m-open'); } var m2=document.querySelector('.nav-mobile'); if(m2){ m2.classList.remove('show'); } document.body.classList.remove('m-lock'); }
  });
  window.addEventListener('resize', function(){
    if(window.innerWidth>1024){ var n=document.getElementById('topnav'); if(n){ n.classList.remove('m-open'); } var mm=document.querySelector('.nav-mobile'); if(mm){ mm.classList.remove('show'); } document.body.classList.remove('m-lock'); }
  });

  /* ===== Self-heal core desktop nav for pages without inline nav CSS/JS =====
     Content pages (oplossing-/systeem-/industrie-/…) ship their own core nav
     styles + dropdown script inline. Project-case pages (project-*, projecten,
     netcongestie-check) do not — so the injected dropdowns would be unstyled and
     stuck open. We detect that case and supply the missing CSS + JS. */
  var CORE_NAV_CSS = `
  nav.topnav{position:fixed;top:0;left:0;right:0;height:92px;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 32px;transition:background .3s ease,backdrop-filter .3s ease}
  nav.topnav.scrolled{background:rgba(11,26,36,.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,173,239,.08)}
  .topnav .navlinks{display:flex;gap:2px;align-items:center}
  .topnav .nav-item{position:relative}
  .topnav .nav-link{display:inline-flex;align-items:center;gap:6px;font-family:'IBM Plex Sans',sans-serif;font-weight:400;font-size:14px;letter-spacing:.005em;line-height:1;color:rgba(255,255,255,.74);padding:26px 12px;cursor:pointer;transition:color .2s;background:none;border:0;white-space:nowrap;text-decoration:none}
  .topnav .nav-link:hover,.topnav .nav-item.open .nav-link{color:#fff}
  .topnav .nav-caret{display:inline-block;width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:4px solid currentColor;opacity:.6;transition:transform .2s}
  .topnav .nav-item.open .nav-caret{transform:rotate(180deg)}
  .topnav .nav-drop{background:rgba(6,18,28,.96);border:1px solid rgba(0,173,239,.18);opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease;z-index:101}
  .topnav .nav-item.open .nav-drop{opacity:1;pointer-events:auto}
  .topnav .nav-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
  .topnav .cta-secondary{font-family:'IBM Plex Sans',sans-serif;font-weight:400;font-size:14.5px;line-height:1;color:rgba(255,255,255,.86);padding:13px 20px;background:transparent;border:1px solid rgba(255,255,255,.18);cursor:pointer;transition:border-color .2s,color .2s,background .2s;text-decoration:none}
  .topnav .cta-secondary:hover{color:#fff;border-color:rgba(255,255,255,.4);background:rgba(255,255,255,.04)}
  .topnav .cta-pill{display:inline-flex;align-items:center;gap:14px;padding:11px 22px;background:#fff;color:#06121C;font-family:'IBM Plex Sans',sans-serif;font-weight:400;font-size:14px;letter-spacing:.005em;cursor:pointer;border:0;transition:background .25s ease,color .25s ease;clip-path:polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%);text-decoration:none}
  .topnav .cta-pill .arr{display:inline-block;width:14px;height:1px;background:#06121C;position:relative;transition:background .3s ease,transform .3s ease}
  .topnav .cta-pill .arr::after{content:'';position:absolute;right:0;top:-2.5px;width:6px;height:6px;border-top:1px solid #06121C;border-right:1px solid #06121C;transform:rotate(45deg) translate(-1px,1px);transition:border-color .3s ease}
  .topnav .cta-pill:hover{background:#00ADEF;color:#fff}
  .topnav .cta-pill:hover .arr{background:#fff;transform:translateX(4px)}
  .topnav .cta-pill:hover .arr::after{border-color:#fff}
  @media(max-width:1180px){.topnav .cta-secondary{display:none}.topnav .nav-link{padding:26px 10px;font-size:13.5px}}
  @media(max-width:1024px){.topnav .navlinks{display:none}nav.topnav{padding:0 20px}}
  `;
  function ensureDesktopNav(){
    var nav = document.getElementById('topnav');
    if(!nav || window.__vibeCoreNav) return;
    var probe = nav.querySelector('.nav-item .nav-drop');
    /* If the closed dropdown is already hidden, the host page already styles + scripts the nav. */
    if(probe && getComputedStyle(probe).opacity === '0') return;
    window.__vibeCoreNav = 1;

    var st = document.createElement('style'); st.textContent = CORE_NAV_CSS; document.head.appendChild(st);

    var onScroll = function(){ nav.classList.toggle('scrolled', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, {passive:true}); onScroll();

    var items = Array.prototype.slice.call(nav.querySelectorAll('.nav-item'));
    items.forEach(function(item){
      var drop = item.querySelector('.nav-drop'); if(!drop) return;
      var t = null;
      var open = function(){ items.forEach(function(i){ if(i!==item) i.classList.remove('open'); }); item.classList.add('open'); };
      var close = function(){ item.classList.remove('open'); };
      item.addEventListener('mouseenter', function(){ clearTimeout(t); open(); });
      item.addEventListener('mouseleave', function(){ t = setTimeout(close, 180); });
      var link = item.querySelector('.nav-link');
      if(link) link.addEventListener('click', function(e){ if(link.tagName === 'A') return; e.preventDefault(); item.classList.contains('open') ? close() : open(); });
    });
    document.addEventListener('click', function(e){ if(!nav.contains(e.target)) items.forEach(function(i){ i.classList.remove('open'); }); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') items.forEach(function(i){ i.classList.remove('open'); }); });
    setTimeout(function(){ items.forEach(function(i){ i.classList.remove('open'); }); }, 1200);
  }
  if(document.readyState!=='loading'){ ensureDesktopNav(); } else { document.addEventListener('DOMContentLoaded', ensureDesktopNav); }
})();
