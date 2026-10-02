/* ============================================================================
   VIBE WEB DESIGN SYSTEM V1.0 — mobiel menu
   ----------------------------------------------------------------------------
   Nieuw bestand; geen legacypagina laadt het. Verwacht de markup uit
   vibe-system.css: .vibe-menubtn + .vibe-mobilemenu[hidden].

   LET OP - Calendly.
   _footer.js registreert een click-listener op document in de CAPTURE-fase en
   roept daar stopPropagation() aan voor elementen met [data-calendly]. Een
   capture-listener op het menu zelf wordt daardoor nooit bereikt. Dit script
   registreert zijn sluit-listener daarom op document in de capture-fase EN
   wordt vóór _footer.js geladen, zodat het als eerste aan de beurt is.
   ============================================================================ */
(function () {
  var knop = document.querySelector('.vibe-menubtn');
  var menu = document.querySelector('.vibe-mobilemenu');
  if (!knop || !menu) return;

  var open = false, bewaardeScroll = 0;
  // Het paneel is visueel en qua tab-orde een dialoog; hulpsoftware moet dat
  // ook kunnen zien, en de pagina eronder moet eruit zolang het open staat.
  var achtergrond = [document.querySelector('header.vibe-header'),
                     document.getElementById('hoofdinhoud'),
                     document.querySelector('footer.vibe-footer')].filter(Boolean);
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-modal', 'true');
  menu.setAttribute('aria-label', 'Menu');

  function zet(aan) {
    open = aan;
    knop.setAttribute('aria-expanded', aan ? 'true' : 'false');
    knop.setAttribute('aria-label', aan ? 'Menu sluiten' : 'Menu openen');
    if (aan) {
      bewaardeScroll = window.scrollY;
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
      document.documentElement.classList.add('vibe-menu-open');
      achtergrond.forEach(function (el) { el.inert = true; el.setAttribute('aria-hidden', 'true'); });
      document.body.style.position = 'fixed';
      document.body.style.top = (-bewaardeScroll) + 'px';
      document.body.style.width = '100%';
      var eerste = menu.querySelector('a');
      if (eerste) eerste.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      document.documentElement.classList.remove('vibe-menu-open');
      achtergrond.forEach(function (el) { el.inert = false; el.removeAttribute('aria-hidden'); });
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, bewaardeScroll);
      // [hidden] pas na de uitfade, anders springt het menu weg
      setTimeout(function () { if (!open) menu.hidden = true; }, 260);
      knop.focus({ preventScroll: true });
    }
  }

  knop.addEventListener('click', function () { zet(!open); });

  document.addEventListener('click', function (e) {
    if (open && e.target.closest && e.target.closest('.vibe-mobilemenu a')) zet(false);
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) zet(false);
  });

  // eenvoudige focus-trap zolang het menu open is
  menu.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = menu.querySelectorAll('a,button');
    if (!f.length) return;
    var eerste = f[0], laatste = f[f.length - 1];
    if (e.shiftKey && document.activeElement === eerste) { e.preventDefault(); laatste.focus(); }
    else if (!e.shiftKey && document.activeElement === laatste) { e.preventDefault(); knop.focus(); }
  });

  // bij terugschalen naar desktop altijd sluiten
  window.matchMedia('(min-width:1200px)').addEventListener('change', function (m) {
    if (m.matches && open) zet(false);
  });
})();
