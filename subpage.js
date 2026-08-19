/* Subpage shared interactions: FAQ accordion + scroll reveal */
(function(){
  function faqInit(){
    var list=document.querySelector('.faq-list');
    if(list){
      list.addEventListener('click',function(e){
        var q=e.target.closest('.faq-q');if(!q)return;
        var item=q.parentElement,a=item.querySelector('.faq-a'),isOpen=item.classList.contains('open');
        list.querySelectorAll('.faq-item.open').forEach(function(o){o.classList.remove('open');o.querySelector('.faq-a').style.maxHeight=null;});
        if(!isOpen){item.classList.add('open');a.style.maxHeight=a.scrollHeight+'px';}
      });
      var first=list.querySelector('.faq-item.open .faq-a');
      if(first)first.style.maxHeight=first.scrollHeight+'px';
      window.addEventListener('resize',function(){var o=list.querySelector('.faq-item.open .faq-a');if(o)o.style.maxHeight=o.scrollHeight+'px';});
    }
  }
  function revealInit(){
    var els=[].slice.call(document.querySelectorAll('.reveal'));
    if(!els.length)return;
    if(!('IntersectionObserver' in window)){els.forEach(function(el){el.classList.add('in');});return;}
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.14,rootMargin:'0px 0px -8% 0px'});
    els.forEach(function(el){io.observe(el);});
  }
  function init(){faqInit();revealInit();emsInit();}
  function emsInit(){
    var box=document.getElementById('emsConsole');if(!box)return;
    var edges=document.getElementById('emsEdges');
    var tabs=[].slice.call(document.querySelectorAll('#emsTabs .ems-tab'));
    var panes=[].slice.call(document.querySelectorAll('#emsPanel .ems-pane'));
    var nodes=[].slice.call(document.querySelectorAll('.ems-net .ems-node'));
    var ticker=document.getElementById('emsTicker');
    var pts={solar:[14,24],accu:[14,74],charger:[86,24],hvac:[86,74],light:[50,90]};
    Object.keys(pts).forEach(function(k){var p=pts[k];var l=document.createElementNS('http://www.w3.org/2000/svg','line');l.setAttribute('x1',50);l.setAttribute('y1',50);l.setAttribute('x2',p[0]);l.setAttribute('y2',p[1]);l.setAttribute('class','edge');l.setAttribute('vector-effect','non-scaling-stroke');edges.appendChild(l);});
    var edgeEls={};Object.keys(pts).forEach(function(k,i){edgeEls[k]=edges.children[i];});
    var tickers=['09:00:14 › HVAC zone B · setpoint −1.5°C · bezetting 18%','13:22:07 › verlichting vloer 2 · 3/9 zones actief · −31%','08:41:55 › laadplein · 11 sessies · load balanced · 0 pieken','17:08:31 › peak forecast +340 kVA · battery dispatch · grid −38%'];
    var cur=-1,timer=null;
    function select(i){if(i===cur)return;cur=i;tabs.forEach(function(t){t.classList.toggle('active',+t.dataset.i===i);});panes.forEach(function(p){p.classList.toggle('show',+p.dataset.i===i);});var asset=tabs[i].dataset.asset;nodes.forEach(function(n){n.classList.toggle('active',n.dataset.asset===asset);});Object.keys(edgeEls).forEach(function(k){edgeEls[k].classList.toggle('flow',k===asset);});if(ticker)ticker.textContent=tickers[i];}
    function cycle(){select((cur+1)%tabs.length);}
    function startAuto(){stopAuto();timer=setInterval(cycle,4200);}
    function stopAuto(){if(timer)clearInterval(timer);}
    tabs.forEach(function(t){t.addEventListener('click',function(){select(+t.dataset.i);startAuto();});});
    box.addEventListener('mouseenter',stopAuto);box.addEventListener('mouseleave',startAuto);
    var started=false;
    if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting&&!started){started=true;select(0);startAuto();}});},{threshold:.25});io.observe(box);}else{select(0);startAuto();}
    select(0);
  }
  if(document.readyState!=='loading'){init();}else{document.addEventListener('DOMContentLoaded',init);}
})();
