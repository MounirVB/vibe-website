# Vibe Energy — meetplan, analytics en wat er NIET gemeten kan worden

Vastgesteld 10 oktober 2026, bij de SEO/GEO-release. Alles hieronder is in die sessie gemeten,
behalve waar expliciet UNKNOWN staat.

## 1 · Wat er draait — gemeten

| Laag | Waarde | Hoe vastgesteld |
|---|---|---|
| Tag manager | `GTM-KM2V7VQ3` | `grep` over alle HTML; één id, op alle 51 bestanden |
| Microsoft Clarity | `xthcjvmbj7` | `_clarity.js`, laadt pas na toestemming voor analytische cookies |
| Meta Pixel | `1164445461468919` | **alleen op `index.html`**, niet op de andere pagina's |
| Toestemming | `_consent.js`, geladen vóór GTM | eerste `<script>` in elke `<head>` |
| Boekingen | Calendly `vibeenergy-sales/30min` | `vibe/chrome.js`, popup laadt pas bij de eerste klik |
| Leadformulier | `POST https://dashboard.vibeenergy.nl/api/public/site/lead` | `contact.html` |
| Brochure-API | `POST /api/brochure` (Express, Resend) | `api/server.js` |
| Hosting | Railway, railpack-provider `staticfile` (Caddy) | responsheaders `server: railway-hikari` + de CSP uit de railpack-template |

**Geen GA4-meet-id in de codebase.** Er staat geen `G-XXXXXXX` in enig bestand. Of er een GA4-property
achter GTM-KM2V7VQ3 hangt, is van buiten de repo niet vast te stellen: UNKNOWN.

### Geen identifier van Vibe Home overgenomen
De opdracht waarschuwt hiervoor. Gemeten: `vibehome` gebruikt `GTM-WFWS7DRN`, deze site
`GTM-KM2V7VQ3`. Twee verschillende containers; er is niets hergebruikt.

### Openstaand punt, niet in deze release aangeraakt
De Meta Pixel staat alleen op de homepage. Dat is óf bewust óf een omissie uit de herbouw. Het is
geen SEO-defect en het raakt het meten van organisch verkeer niet, dus deze release laat het staan.
Wie het oppakt: óf op alle pagina's, óf nergens.

## 2 · Wat deze release aan meetbaarheid toevoegt

- **`data/seo/routes.json`** is het meetbare routeregister: 4.700 kandidaten met per route een
  staat en een reden. Hieruit volgt direct hoeveel routes INDEX, PENDING en NOINDEX zijn, en
  waaróm.
- **`sitemap.xml`** is pariteit-gegarandeerd gelijk aan de INDEX-set (poort 9). Afwijking is een
  harde fout, geen waarschuwing.
- **`lastmod`** is echt: git-commitdatum voor ongewijzigde bestanden, de releasedatum voor wat in
  deze release is aangeraakt of nieuw is. Geen pauschale datum.
- **`scripts/seo/audit.mjs`** geeft vijftien poorten met een getal per poort; dat is de
  kwaliteitsmeting over de tijd.

## 3 · Rapportage die hierop te bouwen is

Zodra Search Console en Bing Webmaster Tools gekoppeld zijn, is dit de verdeelsleutel. Elke regel
is af te leiden uit `data/seo/routes.json` zonder extra administratie:

| Rapport | Sleutel uit het register |
|---|---|
| Geïndexeerde routes tegenover gepubliceerde routes | `staat === 'INDEX'` |
| Vertoningen, kliks, CTR, positie per paginatype | `subsoort` (oplossing, sector, toepassing, kennis, subsidie, regio, project) |
| Prestatie per oplossing | `data/seo/oplossingen.json`, veld `nationale_eigenaar` |
| Prestatie per regio | `gemeentecode` / `provinciecode` op de regionale routes |
| Leads per oplossing en per regio | de landingspagina uit GA4/GTM terugkoppelen aan dezelfde sleutels |

**Conversie-attributie werkt alleen als de landingspagina wordt meegestuurd.** Het leadformulier op
`contact.html` post naar `dashboard.vibeenergy.nl`; of dat de verwijzende pagina meeneemt is in
deze sessie NIET gecontroleerd — dat vraagt toegang tot het dashboard. **UNKNOWN.**

## 4 · Wat UNKNOWN blijft en dus nergens als cijfer mag verschijnen

1. **Zoekvolumes.** Voor geen enkele term gemeten. Er is in deze sessie geen volumebron
   aangeroepen. Noem nergens een getal.
2. **Nederlandse posities.** De gebruikte zoekhulp is Amerikaans gelokaliseerd; gemeten is wélk
   soort pagina bestaat, niet hoe iets rankt vanaf een Nederlands IP.
3. **Of er een GA4-property achter de GTM-container hangt** — vereist toegang tot GTM.
4. **Search Console en Bing Webmaster Tools.** Of de property's bestaan, op welke host
   (`vibeenergy.nl` of `www.vibeenergy.nl`) en wie toegang heeft: niet te zien van buitenaf.
   **Dit is het enige punt dat na deze release aandacht vraagt**, want de canonical-host is in deze
   release van de apex naar `www` gezet.
5. **Of het lead-endpoint de landingspagina registreert.**
6. **Conversiecijfers, leads en omzet.** Geen bron in deze repo.

## 5 · Eén ding om direct na de release te doen

De canonical en de sitemapverwijzing staan nu op **`https://www.vibeenergy.nl`**, omdat gemeten is
dat de apex `vibeenergy.nl` met 301 naar www doorstuurt en alleen www door Railway wordt
beantwoord. Controleer in Search Console welke property de data draagt. Staat die op de apex, voeg
dan de www-property toe (of gebruik een domeinproperty, die beide dekt) en dien
`https://www.vibeenergy.nl/sitemap.xml` opnieuw in.
