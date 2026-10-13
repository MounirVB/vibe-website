# Vibe Energy — meetplan, analytics en wat er NIET gemeten kan worden

Vastgesteld 10 oktober 2026, bij de SEO/GEO-release. Bijgewerkt 13 oktober 2026 met het
indexatiemonitoringrapport (paragraaf 6 tot en met 9). Alles hieronder is in die sessies gemeten,
behalve waar expliciet UNKNOWN, NOT_AVAILABLE of PENDING_USER_ACTION staat.

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
- **`scripts/seo/audit.mjs`** geeft zestien poorten met een getal per poort; dat is de
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
4. **Search Console en Bing Webmaster Tools.** Zie paragraaf 5: de property is een
   **domeinproperty**, maar wie toegang heeft en wat er al is ingezonden is niet van buitenaf te
   zien.
5. **Of het lead-endpoint de landingspagina registreert.**
6. **Conversiecijfers, leads en omzet.** Geen bron in deze repo.

## 5 · De property die de data draagt — domeinproperty

De canonical en de sitemapverwijzing staan op **`https://www.vibeenergy.nl`**, omdat gemeten is
dat de apex `vibeenergy.nl` met 301 naar www doorstuurt en alleen www door Railway wordt
beantwoord.

De property die de data draagt is een **domeinproperty: `sc-domain:vibeenergy.nl`**. Dat is de
goede keuze en hij hoeft niet gewijzigd te worden, want een domeinproperty dekt **apex én www**,
plus http en https, in één set. Een URL-prefix-property op de apex zou na de canonicalwissel naar
www een leeg dashboard laten zien terwijl de site prima draait.

Twee gevolgen die wél aandacht vragen:

- **Een domeinproperty bestaat niet in de Search Console-API onder een https-URL.** Een
  API-koppeling moet de property-identiteit letterlijk als `sc-domain:vibeenergy.nl` meegeven.
  `INTEL_GSC_SITE_URL` staat in `intelligence/deploy/analytics-cloudrun-job.yaml` nu op
  `https://www.vibeenergy.nl/`; voor een domeinproperty moet daar `sc-domain:vibeenergy.nl`
  komen. Zolang dat niet is bijgewerkt, zou een koppeling 403 of 404 geven op een property die
  wél bestaat — en dat leest als "geen data" in plaats van als "verkeerde identiteit".
- **Een domeinproperty telt apex-verkeer mee.** De apex geeft 301, dus er horen daar geen
  vertoningen te staan; staan ze er wel, dan serveert iets de apex toch inhoudelijk.

## 6 · Het indexatiemonitoringrapport — tien metrieken, altijd tien regels

Draaien: `cd intelligence && npm run analytics` (voeg `--json` toe voor één machineleesbare regel,
`--bewaar` om de stand van vandaag vast te leggen).

Het rapport print **altijd alle tien de regels**, met per regel
`metriek | aantal-of-ONBEKEND | bron | label | bewijs`. Een weggelaten regel leest als "niet van
toepassing" terwijl hij "niet gemeten" betekent. **Een ontbrekende meting is nooit nul.**

Dat geldt ook zonder database. Gemeten op 13 oktober 2026: `npm run analytics` zonder
`INTEL_DB_URL` geeft nu tien regels en **exitcode 5**, met in elke regel de databasefout als reden.
Daarvóór viel het commando om met een stacktrace en kwamen er **nul** regels uit — en nul regels
leest als "er is niets aan de hand". De enige metriek die geen database nodig heeft blijft daarbij
wél meetbaar: dezelfde run meet 430 technisch indexeerbare pagina's uit de repo-scan.

### De vier labels

| Label | Betekent |
|---|---|
| `MEASURED` | het getal komt uit een **bewaarde** meting: een rij in de database met tijdstempel en bewijs |
| `INFERRED` | in deze run berekend uit gemeten feiten, maar nergens bewaard. Vandaag juist, morgen niet te reconstrueren |
| `UNVERIFIED` | er is data, maar die bewijst de metriek niet — bron niet tegen de echte API gevalideerd, of te weinig dagstanden voor een trend, of een afgekapte export (ondergrens, geen totaal) |
| `NOT_AVAILABLE` | er is geen bron. Dan staat in `bewijs` wát ontbreekt, en het aantal is `ONBEKEND` |

### De stand op 13 oktober 2026

| # | Metriek | Aantal | Bron | Label | Waarom |
|---|---|---|---|---|---|
| 1 | `CURRENT_CANONICAL_INVENTORY` | 430 | `pagina_register` | **MEASURED** | 430 canonieke URL's, vierwegpariteit: routes.json INDEX = sitemap = repobestanden = live 200. Bewaard als rij per URL. |
| 2 | `TECHNICALLY_INDEXABLE` | 430 | repo-scan | **INFERRED** | berekenbaar uit de robots-meta per bestand, maar `pagina_register` heeft geen robots-kolom en er stond geen dagstand. Morgen niet te reconstrueren. |
| 3 | `GOOGLE_INDEXED` | ONBEKEND | `gsc` | **NOT_AVAILABLE** | geen GSC-credentials, nul rijen met `bron='gsc'`. **Wordt nooit vervangen door regel 2.** |
| 4 | `HISTORICAL_404` | ONBEKEND | `gsc` | **NOT_AVAILABLE** | alleen uit een CSV-export te halen; het Wayback-archief kent voor het hele domein maar 169 unieke URL's. |
| 5 | `CURRENT_PAGE_INDEXATION` | half | `eigen_meting` | **UNVERIFIED** | de credentialvrije helft (HTTP-status, in sitemap, canonical) is vandaag meetbaar; de trend bestond niet. Zie paragraaf 7. |
| 6 | `SITEMAP_PROCESSING` | ONBEKEND | `gsc` | **NOT_AVAILABLE** | staat alleen in Search Console > Sitemaps. De repo mag het niet afdwingen; zie paragraaf 9. |
| 7 | `ORGANIC_IMPRESSIONS` | ONBEKEND | `gsc` | **NOT_AVAILABLE** | `intel.zoekvraag_metingen` is leeg. |
| 8 | `ORGANIC_CLICKS` | ONBEKEND | `gsc` | **NOT_AVAILABLE** | idem. |
| 9 | `SEARCH_QUERIES` | ONBEKEND | `gsc` | **NOT_AVAILABLE** | idem. Gemeten zoekopdrachten, niet zoekvolume — dat laatste is nergens gemeten. |
| 10 | `CONVERSION_PERFORMANCE` | ONBEKEND | `ga4`+`crm` | **NOT_AVAILABLE** | `intel.funnel_metingen` en `intel.attributies` zijn leeg, en of het leadendpoint de landingspagina meestuurt is niet vastgesteld. |

Samengevat: **1 MEASURED, 1 INFERRED, 1 UNVERIFIED, 7 NOT_AVAILABLE.**

### Metriek 2 en metriek 3 zijn twee metrieken en blijven dat

Dit is de kern van het rapport. *Technisch indexeerbaar* is wat wij toestaan; *geïndexeerd* is wat
Google heeft besloten. De eigenaar zag op 13 oktober 2026 in Search Console **35 geïndexeerd
tegenover ~15.300 niet-geïndexeerd** — schermafbeeldingswaarnemingen, geen meting uit dit
platform, en nergens als meting te noemen. Zou regel 2 (430) voor regel 3 doorgaan, dan was een
verschil van een factor twaalf stil weggepoetst.

De code dwingt dat af: `bewaakScheiding()` in `intelligence/src/analytics/koppelingen.ts` werpt
zodra `GOOGLE_INDEXED` een getal uit een eigen bron krijgt, of zodra een van de twee regels
ontbreekt. De toets staat in `intelligence/test/eenheid/indexatiemonitor.test.ts`.

## 7 · Het blokkerende defect van metriek 5, en de reparatie

`intel.indexatie_status` kón **per constructie geen trend** bevatten:

- de tabel heeft `unique (organisatie_id, url, bron)`;
- de enige schrijver doet `on conflict ... do update set laatst_gecontroleerd_op = now()`.

Elke nieuwe meting overschreef dus de vorige tijdstempel en daarmee het vorige meetpunt. Over 33
migraties en 56 `intel`-tabellen bestond geen dagstand- of historietabel. De dagelijkse schrijver
was al ontworpen (Cloud Scheduler `vibe-analytics-dagelijks`, cron `30 4 * * *`, zie
`intelligence/deploy/analytics-cloudrun-job.yaml` — **NIET UITGEROLD**): de cadans stond, de
bewaring niet.

Dat was **geen "pas met credentials"-probleem**: de credentialvrije helft (`http_status`,
`in_sitemap`, canonical, met `bron='eigen_meting'`) is vandaag al meetbaar en ging door dezelfde
overschrijving verloren.

**Reparatie:** migratie `intelligence/db/migraties/0034_indexatie_dagstand.sql` voegt
`intel.indexatie_dagstand` toe: één rij per organisatie, dag, metriek en bron. De unieke sleutel
bevat `datum`, dus de run van vandaag raakt de stand van gisteren niet. Twee dagstanden zijn een
trend; één rij die zichzelf overschrijft is dat nooit.

- `aantal` is **nullable met opzet**. Een dagstand legt óók vast dat een metriek die dag niet te
  meten was; met `not null` zou daar een 0 moeten staan, en 0 betekent "gemeten, niets gevonden".
  Twee CHECK-constraints sluiten de verboden combinaties af: `NOT_AVAILABLE` mét getal, en
  `MEASURED` zónder getal.
- `noemer` staat ernaast, want "12" is geen informatie en "12 van 430" wel.
- Dezelfde migratie dropt twee dode kolommen: `pagina_register.live_http_status` en
  `pagina_register.live_gemeten_op`. Gemeten: in de hele repo heeft elk van die twee exact één
  treffer — hun eigen definitieregel in `0004_inhoud.sql`. Vullen zou slechter zijn dan droppen:
  de live-status is al zonder join bereikbaar, `indexatie_status` draagt al bron plus bewijs, en
  vullen zou via de `BEFORE UPDATE`-trigger `bijgewerkt_op` op elke gemeten pagina stampen —
  waarmee "gewijzigd" en "gemeten" niet meer te onderscheiden zijn.

**De migratie is NIET toegepast.** Er is geen database met deze rollen beschikbaar en de
productiedatabase is privé-only.

### De eigen meting dekt nu de hele site, niet twaalf pagina's

Gemeten defect: de live meting selecteerde met `order by in_sitemap desc, pad limit 12` en gaf
daardoor elke run dezelfde twaalf paden (`/`, `/algemene-voorwaarden`, `/contact`,
`/cookiebeleid`, `/energieadvies`, `/energy-hubs`, `/industrie-logistiek`,
`/industrie-recreatie`, `/industrie-residentieel`, `/industrie-vastgoed`, `/industrie-vve`,
`/kennis`). **Geen van de 350 `/regios`-routes werd ooit gemeten**, en door `in_sitemap desc`
kwamen de 17 NOINDEX-stubs structureel nooit aan bod — juist de pagina's waar een foute status het
meest kost.

Nu: `order by pad` (stabiel en volledig), een `offset` zodat de site in vensters te doorlopen is,
en **begrensde gelijktijdigheid**. Dat laatste is een voorwaarde en geen optie: de netwerktimeout
staat op 20.000 ms, dus een sequentiële run over 430 pagina's heeft een timeoutstaart tot ~2,4 uur
en zou nooit binnen een cronvenster afmaken. Bij zes parallel is die bovengrens ~24 minuten.

```
npm run analytics -- --meet --alles          # alle 430, zes parallel
npm run analytics -- --meet --max 50 --offset 100
npm run analytics -- --meet --gelijktijdig 4
npm run analytics -- --bewaar                # de dagstand van vandaag
```

De uitvoer print **altijd de noemer**: "12 van 430" is informatie, "12 pagina's" niet.

De tijdstempel is nu `clock_timestamp()` in plaats van `now()`. `now()` is de transactietijd, dus
na een run van 430 pagina's droegen alle 430 rijen exact dezelfde waarde — waarmee de
dashboardquery `order by laatst_gecontroleerd_op desc limit 20` ordeninstabiel wordt. Dat is nu
per rij het echte controlemoment, wat de kolomnaam ook belooft.

### Openstaand, buiten dit onderdeel

- **`intelligence/src/dashboard/server.ts` regel 1941** sorteert op
  `laatst_gecontroleerd_op desc limit 20` zonder tweede sorteersleutel. Met `clock_timestamp()` is
  de ordening stabiel geworden, maar een `, url` erachter maakt hem ook bij gelijke tijdstempels
  deterministisch.
- **`scanSite()` in `intelligence/src/site/paginascan.ts`** toetst één pariteitsrichting
  (`indexeerbaarZonderSitemap`). De omgekeerde richting — in de sitemap én noindex of een
  redirectstub — is als `omgekeerdePariteit()` toegevoegd in
  `intelligence/src/analytics/koppelingen.ts` en staat als poort in de eenheidstoets. Om hem ook
  `npm run zaai` en `intelligence/src/ops/gezondheid.ts` te laten laten falen, moeten
  `ScanUitkomst`, `ZaaiRapport`, `src/cli/zaai.ts` en `meetGezondheid()` het veld doorgeven; die
  bestanden horen bij een ander onderdeel. Gemeten nulstand vandaag: 430 technisch indexeerbaar,
  430 in de sitemap, beide afwijkingslijsten leeg.

## 8 · De handmatige Search Console-stappen — PENDING_USER_ACTION

Deze stappen kan geen script doen. Ze staan in de volgorde waarin ze moeten gebeuren, met per stap
waarom die volgorde telt.

1. **Leg eerst de VOLLEDIGE inzendlijst vast.** Open Search Console > Sitemaps en noteer letterlijk
   elke ingezonden sitemap met zijn status, datum en aantal gevonden URL's — inclusief de obsolete.
   *Waarom eerst:* dit is de **enige nulmeting die metriek 6 heeft**. Verwijder je eerst en noteer
   je daarna, dan is niet meer vast te stellen wat er stond, en is er geen vertrekpunt voor de
   trend.
2. **Verwijder daarna de obsolete inzendingen.** Alle kandidaat-legacy-eindpunten geven nu 404
   (gemeten): `/sitemap_index.xml`, `/sitemap_products_1.xml`, `/sitemap_collections_1.xml`,
   `/sitemap_pages_1.xml`, `/sitemap_blogs_1.xml`, `/wp-sitemap.xml`, `/post-sitemap.xml`,
   `/page-sitemap.xml`, `/product-sitemap.xml`, `/category-sitemap.xml`, `/sitemap.xml.gz`,
   `/feed`, `/rss`. Een ingezonden sitemap die 404 geeft, houdt een foutmelding in het dashboard
   die elke echte fout onzichtbaar maakt.
3. **Dien `www/sitemap.xml` NIET opnieuw in.** Hij staat al op SUCCESS. Opnieuw inzenden levert
   geen nieuwe crawl op en wist wél de inzenddatum die je bij stap 1 hebt vastgelegd.
4. **Exporteer de dekkingsrapporten als CSV, per reden.** Minstens "Niet gevonden (404)",
   "Gecrawld – momenteel niet geïndexeerd", "Gevonden – momenteel niet geïndexeerd", "Pagina met
   omleiding", "Alternatieve pagina met correcte canonieke tag", "Duplicaat", "Uitgesloten door
   tag 'noindex'". *Waarom per reden:* Search Console exporteert per reden en maximaal **1.000
   voorbeeld-URL's**. Noteer bij elke export het getal uit de kolom *Pagina's* van het
   overzichtsblad; dat is het gezaghebbende totaal.
5. **Noteer de EXPORTDATUM bij elke CSV.** *Waarom:* de dagstand gebruikt de exportdatum, niet de
   importdatum. Importeer je een oude export vandaag, dan zou de trend meeschuiven met het moment
   waarop iemand downloadde — en dan staat er een verzonnen beweging in de historie.
6. **Importeer met `node scripts/seo/gsc-import.mjs <export.csv> --reden "<reden>" --totaal <n>`.**
   Zonder `--totaal` blijft de inventaris `afgekapt: true` / `telling_label: ONDERGRENS`, en een
   ondergrens mag nooit als `MEASURED` in de dagstand landen. Met ~7.700 gerapporteerde 404's en
   een exportgrens van 1.000 per reden is het verschil tussen "ondergrens" en "totaal" een factor
   acht.
7. **Voeg pas daarna een service-account toe voor de API** (optioneel, voor de dagelijkse cadans).
   De identiteit uit `intelligence/deploy/analytics-cloudrun-job.yaml` moet in Search Console als
   gebruiker met **leesrecht** op de domeinproperty worden toegevoegd. Dat kan niet met `gcloud`.
   Zet `INTEL_GSC_SITE_URL` daarbij op `sc-domain:vibeenergy.nl` — zie paragraaf 5.
8. **Plan de dagelijkse run.** `npm run analytics -- --meet --alles --bewaar`, één keer per dag.
   *Waarom na alle bovenstaande stappen:* een cadans zonder bewaring levert geen trend, en een
   bewaring zonder nulmeting levert een trend zonder vertrekpunt.

## 9 · Wat de repo met opzet NIET doet, en de poort die dat bewaakt

**De repo dient geen sitemap in bij Google en roept de Indexing API niet aan.** Gemeten: nul
treffers in de hele codebase, met een geslaagde controlemeting dat de zoekmethode werkt
(`git log -S "urlNotification"` geeft 0 commits, `git log -S "indexatie_status"` geeft 2 — dus de
zoekmethode vindt wél wat er is).

Dat is nu een **poort**, geen toevalligheid. In
`intelligence/test/eenheid/indexatiemonitor.test.ts` scant een toets elk `.ts`, `.mjs`, `.js`,
`.json`, `.sql`, `.yaml` en `.yml` bestand in de repo op:

- `urlNotification`, `indexing.googleapis.com`, `auth/indexing` — de Indexing API;
- `auth/webmasters` zonder `.readonly` — de Search Console **schrijf**scope;
- `sitemaps/submit` of `sitemaps.submit` — inzending via de API;
- `ping?sitemap=` — het oude pingendpoint.

`webmasters.readonly` blijft toegestaan: lezen is precies wat metriek 3 en 6 nodig hebben.
Markdown wordt niet gescand, zodat dit document kan opschrijven wat verboden is. De toets draait
zelf met een controlemeting: hij moet een string die er zeker staat ook werkelijk vinden, want een
scanner die stuk is ziet er precies zo uit als een repo die schoon is.

**Waarom verboden:** de opdracht staat de Indexing API niet toe voor gewone commerciële en
regionale pagina's. Dat verbod is hier het uitgangspunt; of Google het gebruik erbuiten ook zelf
beperkt is in deze sessie **niet nagetrokken** en staat daarom niet als onderbouwing. Een sitemap
dient een mens één keer met de hand in — dat houdt metriek 6 een nulmeting en voorkomt dat een
script de inzenddatum telkens opnieuw wist.

## 10 · De eerlijke beperkingen van dit hele meetplan

1. **Negen van de tien metrieken hangen aan één partij.** Zonder Search Console blijven er van de
   tien regels acht op `NOT_AVAILABLE` of `UNVERIFIED` staan. Dat is geen tekortkoming van dit
   platform; het is waar de data vandaan komt.
2. **Elke telling uit een CSV-export is een ondergrens.** Zie stap 6 hierboven.
3. **De historische 404's zijn nergens anders te krijgen.** Het Wayback-archief kent voor het hele
   domein 169 unieke URL's; de git-historie bevat geen verloren URL's. Komt er geen export, dan
   blijft metriek 4 permanent `NOT_AVAILABLE` — en dat is het eerlijke antwoord, niet nul.
4. **De cijfers 35 geïndexeerd / ~15.300 niet / 7.728 historische 404's / 31 doorverwezen / 6
   alternatieve canonical / 3 duplicaat / 1 noindex zijn SCHERMAFBEELDINGSWAARNEMINGEN** van de
   eigenaar op 13 oktober 2026. Ze zijn geen meting van dit platform en mogen nergens als meting
   verschijnen.
5. **Een eigen live-meting is bereikbaarheid, geen indexatie.** HTTP 200 met een kloppende
   canonical zegt dat de pagina er staat en wat hij van zichzelf beweert. Of een zoekmachine hem
   heeft opgenomen, zegt alleen metriek 3.
6. **De dagelijkse job is niet uitgerold.** `vibe-analytics-dagelijks` bestaat als manifest en als
   cron-expressie, niet als draaiende dienst. Tot die uitrol moet iemand `--bewaar` met de hand
   draaien, en tot er twee dagstanden staan is elke trendmetriek `UNVERIFIED`.
7. **Conversie-attributie is onbewezen zolang de landingspagina niet meekomt.** Zie paragraaf 3.
   `intel.attributies` dwingt daarom een `onzekerheid_reden` af en kent geen "bewezen" zonder
   methode.
