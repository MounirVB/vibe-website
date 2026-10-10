/* ============================================================================
   VIBE ENERGY — PAD- EN URL-REGELS
   ----------------------------------------------------------------------------
   Eén plek waar de afspraak tussen URL, bestandspad en canonical vastligt.

   GEMETEN HOSTGEDRAG (10 oktober 2026)
   De site loopt op Railway met de railpack-provider `staticfile`. Die zet
   Caddy neer met:

       try_files {path} {path}.html {path}/index.html

   Lokaal nagebouwd met caddy 2.11.7 en de echte template gemeten:

     /regios                       -> regios.html            200
     /regios/gelderland            -> regios/gelderland.html 200
     /regios/gelderland/arnhem     -> .../arnhem.html        200
     /regios/                      -> 404   (afsluitende schuine streep bestaat niet)
     /bestaat-niet                 -> 404.html met status 404

   Belangrijk: een map met dezelfde naam als een .html-bestand overschaduwt dat
   bestand NIET. `/regios` bleef `regios.html` serveren terwijl de map
   `regios/` er ook stond. Nesten is dus veilig.

   DE HOST
   `vibeenergy.nl` staat op een andere server (nginx/Plesk) en stuurt alles met
   301 door naar `www.vibeenergy.nl`; daar staat Railway. De canonical hoort
   dus op www te staan, anders wijst hij naar een URL die zelf doorverwijst.

   AFSPRAKEN
   · Publieke URL's zijn extensieloos en hebben GEEN afsluitende schuine streep.
   · Op schijf houdt elk bestand .html — dat is wat de host mapt.
   · Geneste pagina's gebruiken ROOT-RELATIEVE paden (/vibe/vibe.css), nooit
     relatieve: op /regios/gelderland/arnhem zou `vibe/vibe.css` fout oplossen.
   ============================================================================ */

export const HOST = 'https://www.vibeenergy.nl';

/* De oude host. Alleen hier vastgelegd zodat de poort kan controleren dat er
   nergens meer een canonical naar de doorverwijzende variant staat. */
export const HOST_APEX = 'https://vibeenergy.nl';

/** Route -> publieke URL. '' is de homepage. */
export function url(route) {
  const r = String(route).replace(/^\/+|\/+$/g, '');
  return r === '' || r === 'index' ? `${HOST}/` : `${HOST}/${r}`;
}

/** Route -> pad in een href (root-relatief, extensieloos). */
export function href(route) {
  const r = String(route).replace(/^\/+|\/+$/g, '');
  return r === '' || r === 'index' ? '/' : `/${r}`;
}

/** Route -> bestandspad op schijf, relatief aan de repowortel. */
export function bestand(route) {
  const r = String(route).replace(/^\/+|\/+$/g, '');
  return r === '' || r === 'index' ? 'index.html' : `${r}.html`;
}

/** Hoeveel mappen diep ligt deze route? 0 = wortel. */
export function diepte(route) {
  const r = String(route).replace(/^\/+|\/+$/g, '');
  return r === '' ? 0 : r.split('/').length - 1;
}

/* ------------------------------------------------------------ routebouwers
   Alle regionale routes hangen onder /regios. Dat is een bewust besluit en
   geen overname van het voorbeeld in de opdracht:

   De opdracht stelde /zakelijke-batterij/gelderland voor. Dat kan hier niet
   zonder schade: /systeem-energieopslag bezit de zoekintentie "zakelijke
   batterij" al en staat geïndexeerd. Een tweede
   nationale wortel /zakelijke-batterij zou diezelfde intentie pakken en de
   bestaande pagina kannibaliseren. Door alles onder /regios te hangen heeft
   elke regionale pagina precies één ouder, draagt geen enkele regionale route
   een nationale commerciële wortel, en botst niets met de bestaande slugs. */

export const REGIO_WORTEL = 'regios';

export function routeProvincie(provincieSlug) {
  return `${REGIO_WORTEL}/${provincieSlug}`;
}

export function routeGemeente(provincieSlug, gemeenteSlug) {
  return `${REGIO_WORTEL}/${provincieSlug}/${gemeenteSlug}`;
}

export function routeProvincieFamilie(provincieSlug, familieSlug) {
  return `${REGIO_WORTEL}/${provincieSlug}/${familieSlug}`;
}

export function routeGemeenteFamilie(provincieSlug, gemeenteSlug, familieSlug) {
  return `${REGIO_WORTEL}/${provincieSlug}/${gemeenteSlug}/${familieSlug}`;
}

/* Een familieslug mag niet gelijk zijn aan een gemeenteslug binnen dezelfde
   provincie: /regios/gelderland/<x> zou dan twee dingen kunnen betekenen.
   De poort roept dit aan en faalt hard bij een botsing. */
export function botsendeSlugs(gemeenten, families) {
  const fam = new Set(families.map((f) => f.slug));
  const uit = [];
  for (const g of gemeenten) if (fam.has(g.slug)) uit.push({ provincie: g.provincie_slug, slug: g.slug, gemeentecode: g.gemeentecode });
  return uit;
}
