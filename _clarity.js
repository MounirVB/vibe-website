/* Microsoft Clarity — site-wide loader.
   Laadt PAS nadat de bezoeker analytische cookies heeft geaccepteerd
   (zie _consent.js). Zonder toestemming wordt Clarity niet geladen. */
(function(){
  var ID = window.VIBE_CLARITY_ID || 'xthcjvmbj7';
  if(!ID) return;
  function load(){
    if(window.__vibeClarityLoaded) return; window.__vibeClarityLoaded=true;
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window,document,"clarity","script",ID);
  }
  if(window.vibeConsent && window.vibeConsent.on) window.vibeConsent.on('analytics',load);
})();
