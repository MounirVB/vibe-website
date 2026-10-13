# Vibe Energy — historische URL's: importeren, classificeren en wat niet kan

Vastgesteld 13 oktober 2026. Alles hieronder is in die sessie gemeten, behalve waar expliciet
INFERRED, UNVERIFIED of NOT_AVAILABLE staat.

Dit document hoort bij drie bestanden:

| Bestand | Wat het is |
|---|---|
| `scripts/seo/gsc-import.mjs` | leest een Search Console-export en normaliseert hem |
| `scripts/seo/historische-urls.mjs` | classificeert elke bekende URL en drukt het inventarisrapport af |
| `data/seo/historische-urls.json` | het datacontract: familieregels, controles, de Wayback-inventaris, de geïmporteerde export |

`data/`, `scripts/` en `docs/` zijn INTERN. Ze staan op Disallow in `robots.txt`, in de
excludelijst van `railpack.json` en buiten de allowlist van `scripts/publiek-artefact.mjs`. Deze
drie bestanden en dit document worden dus niet geserveerd.

---

## 1 · Het probleem, met de herkomst van elk getal

Search Console toont voor `www.vibeenergy.nl` **7.728 niet-gevonden (404) URL's**, naast ongeveer
15.300 niet-geïndexeerde en 35 geïndexeerde pagina's.

> **Die getallen zijn GEEN meting.** Het zijn schermafbeeldingswaarnemingen van de eigenaar op
> 13 oktober 2026. Er zijn geen GSC-credentials (gemeten: niet lokaal en niet op de vier
> Railway-services) en er is geen GSC-API-client in de code. Niets hiervan is in deze repository
> te reproduceren. Ze staan in `data/seo/historische-urls.json` onder
> `rapportcijfers_eigenaar` met `_herkomst: SCHERMAFBEELDING` en `_vertrouwen: UNVERIFIED`, en
> het rapport noemt ze nooit als telling.

De lijst van 7.728 URL's bestaat **nergens anders**. Dat is drie keer nagegaan:

| Weg | Uitkomst | Hoe gemeten |
|---|---|---|
| GSC-API | NOT_AVAILABLE | geen credentials, geen client in de code |
| Wayback-archief | 172 momentopnames voor het hele domein, 169 op de hoofdhost | CDX-API, inventaris staat nu in het datacontract |
| git-historie | 0 verloren URL's | alle 318 ooit verwijderde html/xml-paden bestaan vandaag weer |

Daarom is er een importmechanisme in plaats van een reconstructie: de eigenaar exporteert, het
script normaliseert, en de classificator beslist.

---

## 2 · De export maken — exact

### 2a · Pagina-indexering (hier zitten de 404's)

1. Open Search Console en kies de property **`www.vibeenergy.nl`** (niet de apex: die stuurt met
   301 door naar www, zie `docs/vibe-url-conventie.md`).
2. Linkermenu: **Indexering → Pagina's**.
3. Onderaan staat de tabel **"Waarom pagina's niet worden geïndexeerd"**, met per reden een aantal
   in de kolom **Pagina's**. Schrijf dat aantal op — dat is het gezaghebbende totaal voor die
   reden en straks de waarde van `--totaal`.
4. **Klik op de rij van één reden** (bijvoorbeeld "Niet gevonden (404)"). Er opent een
   detailvenster met de voorbeeld-URL's.
5. Gebruik in dat detailvenster de **exportknop** rechtsboven → **CSV downloaden**.
6. **Herhaal dit per reden, apart.** Dit is de kern: Search Console kapt af op **1.000
   voorbeeld-URL's per reden**. Eén export is dus nooit de hele lijst, en alle redenen door elkaar
   in één bestand bestaat niet.

De CSV die hieruit komt heeft een URL-kolom en een crawldatum, en soms een reden- of statuskolom.

### 2b · Prestaties (klikken, vertoningen, CTR, positie)

1. Linkermenu: **Prestaties → Zoekresultaten**.
2. Stel het bereik in (maximaal 16 maanden) en open het tabblad **Pagina's**.
3. **Exporteren** rechtsboven → **CSV downloaden**. Dat levert een **ZIP** met meerdere CSV's.
4. Pak de ZIP uit en gebruik het bestand met de pagina's (meestal `Pages.csv` of `Pagina's.csv`).
   Geef je de ZIP zelf mee, dan weigert de importer met precies deze uitleg.

---

## 3 · Importeren

```sh
# één reden, met het gezaghebbende totaal uit het overzicht
node scripts/seo/gsc-import.mjs ~/Downloads/niet-gevonden.csv \
  --reden "Niet gevonden (404)" --totaal 7728

# een tweede reden erbij, zonder de eerste kwijt te raken
node scripts/seo/gsc-import.mjs ~/Downloads/soft-404.csv \
  --reden "Zachte 404" --voeg-toe

# de prestatie-export (géén --reden: een prestatierij heeft geen indexeringsreden)
node scripts/seo/gsc-import.mjs ~/Downloads/Pages.csv --voeg-toe

# eerst kijken wat hij ervan maakt, zonder te schrijven
node scripts/seo/gsc-import.mjs ~/Downloads/niet-gevonden.csv --droog

# welke kopregels en kolomnamen hij herkent
node scripts/seo/gsc-import.mjs --help
```

De importer schrijft **alleen** de sleutel `gsc_inventaris` in
`data/seo/historische-urls.json`. De familieregels, controles en de Wayback-inventaris in dat
bestand blijven ongemoeid. Zonder `--voeg-toe` vervangt een nieuwe aanroep de hele inventaris.

### Wat hij weigert, en waarom dat de bedoeling is

De exacte kolomnamen van een GSC-export zijn **INFERRED**: niemand in dit project heeft een echte
export gezien. Daarom werkt de importer op de **kopregel** en weigert hij bij twijfel, met de
gevonden kopregel er letterlijk bij. Drie sloten:

1. **Kopregel niet herkend** → weigeren, de kopregel afdrukken en de volledige lijst van herkende
   kolomnamen laten zien. Staat de echte naam er niet bij, vul dan de lijst `KOP` in
   `scripts/seo/gsc-import.mjs` aan. Niet omzeilen, aanvullen.
2. **Het overzichtsblad** van de indexeringsrapportage (reden + Pagina's + Trend) wordt
   *herkend als onbruikbaar* en geweigerd met de uitleg dat je de reden moet aanklikken. Dit slot
   bestaat omdat de kolomnaam "Pagina's" óók de URL-kolom van de prestatie-export is: zonder deze
   voorrang werd de telling 7728 netjes "genormaliseerd" naar `https://www.vibeenergy.nl/7728`.
   Dat is in een eigen proef gebeurd en daarom staat er nu ook een vormcontrole op elke waarde:
   iets wat niet met `http(s)://` of met `/` begint, is geen URL.
3. **Meer onleesbare dan leesbare waarden** in de kolom die wij voor de URL-kolom hielden → het
   hele bestand weigeren. Een halve inventaris ziet er in het rapport uit als een volledige.

Een ZIP wordt herkend en geweigerd met de instructie hem uit te pakken.

### Normalisatie — één beleid, vastgelegd op één plek

`normaliseerUrl()` in `scripts/seo/gsc-import.mjs` is de enige normalisatie; de classificator
importeert diezelfde functie, zodat de twee niet uit elkaar kunnen lopen.

| Regel | Waarom |
|---|---|
| `http` → `https` | gemeten: http geeft 301 naar https |
| `vibeenergy.nl` → `www.vibeenergy.nl` | gemeten: de apex geeft 301 naar www |
| fragment eraf | nooit deel van de serverrequest |
| afsluitende streep eraf, behalve op de wortel | gemeten: `/x/` geeft 404, `/x` geeft 200 |
| **querystring blijft**, inclusief parametervolgorde | bij Shopify ís de query het onderscheidende deel: `...green-city.png?v=1694261092&width=750` en `&width=360` zijn twee verschillende gearchiveerde URL's |
| pad **niet** naar kleine letters | gemeten: `/X` geeft 404, `/x` geeft 200 — het pad is hoofdlettergevoelig |

De **gerapporteerde vorm** blijft altijd bewaard, naast de canonieke. Dat verschil is geen
boekhouding maar bepaalt de actie: `/contact/` is een gemeten 404 die een 301 verdient, `/contact`
is een gemeten 200 die je met rust laat. In het rapport staat de gerapporteerde vorm in kolom 1
(`volledige_url`) en de canonieke in kolom 2 (`genormaliseerd_pad`).

### Elke telling uit een import is een ONDERGRENS

`afgekapt` staat op `true` en `telling_label` op `ONDERGRENS`, tenzij je met `--totaal` een
gezaghebbend totaal meegeeft **en** het aantal ingelezen URL's daaraan gelijk is **en** geen
enkele reden de grens van 1.000 raakt. Alleen dan staat er `VOLLEDIG`.

Reken daarom nooit met het verschil tussen "1.000 geïmporteerd" en "7.728 gerapporteerd" alsof het
voortgang is. Het is dekking: met 1.000 van 7.728 ken je 13 procent van de lijst en 87 procent
niet.

---

## 4 · Classificeren

```sh
node scripts/seo/historische-urls.mjs                 # samenvatting + de rijen die werk vragen
node scripts/seo/historische-urls.mjs --alles         # alle rijen
node scripts/seo/historische-urls.mjs --csv > inv.csv # alle rijen als CSV (17 kolommen)
node scripts/seo/historische-urls.mjs --json          # alle rijen als JSON
node scripts/seo/historische-urls.mjs --familie shopify-redactionele-paginas
node scripts/seo/historische-urls.mjs --actie REQUIRES_REVIEW
```

Het script **schrijft niets** en is **geen poort**. Het leest `data/seo/routes.json`,
`data/seo/historische-urls.json`, de HTML in de werkboom en de drie sitemaps. Wil je de uitvoer
bewaren, leid hem dan zelf om.

### Het werkt ook zónder export

Dan classificeert hij de inventarissen die wél gemeten zijn — de 430 canonieke pagina's, de 16
doorverwijsstubs, de 172 Wayback-URL's en de 13 oude sitemapeindpunten, samen **603 URL's** — en
zegt hij van de GSC-inventaris expliciet `NOT_AVAILABLE`, met de reden en de instructie om er een
aan te leveren.

Een nul in de actietabel draagt altijd zijn reden. `IMPROVE_LINKING` staat op 0 omdat de laagste
gemeten waarde 2 interne ingangen is (mediaan 42, hoogste 446, over alle 430 bestaande pagina's) en
de drempel op 2 staat; `RETURN_410` staat op 0 omdat die actie op deze host niet uitvoerbaar is;
`IMPROVE_CONTENT` en `FIX_TECHNICAL` staan op 0 zolang er geen export is die zo'n signaal geeft.

De 4.254 PENDING-routes staan **niet** als rijen in het rapport: ze hebben gemeten 0 bestanden en
staan 0 keer in de sitemap, dus hun juiste antwoord is vandaag 404. Ze worden als aggregaat
genoemd. Een PENDING-route die tóch in een export opduikt, krijgt wel een eigen rij met
`RETURN_404` en de reden erbij.

### De 17 kolommen

De opdracht eist vijftien kolommen; dit rapport draagt die vijftien in die volgorde, plus twee:

1–15: `volledige_url`, `genormaliseerd_pad`, `broninventaris`, `http_status`,
`redirectbestemming`, `canonical`, `robots_richtlijn`, `sitemaplidmaatschap`,
`interne_inkomende_links`, `paginafamilie`, `historisch_bewijs`, `zoekprestatie`,
`aanbevolen_actie`, `reden`, `vertrouwen`.

16: `seo_risico` — de opdracht eist dit per URL, maar niet als kolom.
17: `uitvoering` — wat de actie in déze repository kost: niets, een hostregel die hier niet
bestaat, een redactie, of een handmatige stap in Search Console.

**Een lege cel bestaat niet.** Elke cel draagt een waarde, of `NOT_AVAILABLE`, of `ONBEKEND` —
nooit iets blanco dat als nul leest. `zoekprestatie` staat op `NOT_AVAILABLE` tot er een
prestatie-export is. Gecontroleerd: 603 rijen × 17 kolommen, 0 lege cellen.

Elke rij draagt ook de herkomst van zijn status: `200 (GEMETEN — 430 canonieke URL's gaven alle
HTTP 200 op 2026-10-13)` is iets anders dan `404 (AFGELEID uit het gemeten hostgedrag: een
onbekend pad geeft 404 met 404.html)`. Wijzigt het routeregister ten opzichte van de meting in
`productiemeting`, dan **verloopt de meting zichzelf**: alle statusvelden vallen terug op
AFGELEID, met die reden erbij.

### De families, en wat per familie is besloten

De regels staan in `data/seo/historische-urls.json` onder `familieregels`, **in volgorde: de
eerste treffer wint**. `/cdn/shop` staat vóór de algemene `/cdn`-regel en vóór de eigen-assetregel,
anders zou een Shopify-themabestand dat op `.css` eindigt als eigen bestand worden beoordeeld.

| Familie | Bewijs | Actie | Waarom |
|---|---|---|---|
| `/cdn/shop/*` (113 in Wayback) | MEASURED | RETURN_404 | themabestanden en afbeeldingsderivaten van een winkel die niet bestaat |
| `/cdn/shopifycloud/*` (5) | MEASURED | RETURN_404 | broncode van het platform zelf |
| `/cdn/fonts/*` (4) | MEASURED | RETURN_404 | lettertypen van het oude thema |
| `/checkouts/*` (1) | MEASURED | RETURN_404 | afrekenproces; stond bij Shopify al op noindex |
| `/cart*`, `/account*`, `/search*`, `/apps/*` | INFERRED | RETURN_404 | functionele eindpunten, geen inhoud, geen opvolger |
| `/collections/*`, `/products/*` | INFERRED | RETURN_404 | de catalogus is weg; een 301 naar een uitlegpagina verplaatst koopintentie naar informatie-intentie |
| `/policies/*` | INFERRED | per handle | `privacy-policy → /privacy`, `terms-of-service` en `legal-notice → /algemene-voorwaarden`, `contact-information → /contact`; retour, verzending en abonnement zijn beoordeeld en krijgen 404 |
| `/blogs/<blog>` | INFERRED | REDIRECT_301 → `/kennis` | index naar index: de kennisbank is de inhoudelijke opvolger van een blogindex |
| `/blogs/<blog>/<artikel>` | INFERRED | REQUIRES_REVIEW | welk kennisartikel een oud blogartikel opvolgt, weet alleen wie de titel kent; alles naar `/kennis` zou een verzamelbak zijn |
| `/pages/<handle>` | INFERRED | per handle | de enige familie waar een 301 kansrijk is — zie hieronder |
| de 13 oude sitemapeindpunten | MEASURED (404) | RETURN_404 + handmatig | de site is al goed; de actie zit in Search Console |
| eigen assets (`/assets/*`, `.css`, `.js`, …) | MEASURED | KEEP of 404 | bestaat het bestand op schijf, dan KEEP; anders 404 |

`/pages/<handle>` loopt een ladder af: gelijke slug van een bestaande INDEX-route → 301 daarheen;
gelijk aan een van de 16 doorverwijsstubs → 301 naar de **gemeten canonical van die stub** en
nooit naar de stub zelf (dat zou een keten naar een noindex-pagina zijn); een regel in
`handle_afbeelding.pages` → die regel; anders **REQUIRES_REVIEW**. Raden is verboden.

### De oude sitemapeindpunten: de actie zit niet op de site

Alle dertien (`/sitemap_index.xml`, `/sitemap_products_1.xml`, `/sitemap_collections_1.xml`,
`/sitemap_pages_1.xml`, `/sitemap_blogs_1.xml`, `/wp-sitemap.xml`, `/post-sitemap.xml`,
`/page-sitemap.xml`, `/product-sitemap.xml`, `/category-sitemap.xml`, `/sitemap.xml.gz`, `/feed`,
`/rss`) geven gemeten **404**, en dat is correct: ze mogen niet gaan bestaan, want dan stond er
een tweede, verouderde URL-verzameling naast `sitemap.xml`.

De enige resterende stap is **handmatig**: verwijder in Search Console de *inzending* van zo'n
adres (Sitemaps → rij selecteren → Sitemap verwijderen). Een 404 op het adres haalt de inzending
niet weg; zolang hij ingediend staat, blijft Google hem opvragen en blijft de fout gerapporteerd.

### De controles: weigeren, niet waarschuwen

Een verkeerde 301 is duurder dan een 404. De 404 verliest één URL; de verkeerde 301 verplaatst het
signaal van die URL naar een pagina waar het niet hoort en laat de bezoeker op iets anders landen
dan hij zocht. Daarom staan de verboden als controles in de code:

| Code | Eis |
|---|---|
| C1 | geen 301 naar de homepage (de klassieke verzamelbak) |
| C2 | de bestemming moet een route in `routes.json` zijn |
| C3 | de bestemming mag niet PENDING zijn |
| C4 | de bestemming mag niet NOINDEX zijn |
| C5 | de bestemming moet een bestand op schijf hebben |
| C6 | de bestemming mag zelf geen doorverwijsbron zijn (geen keten) |
| C7 | de bestemming mag niet de bron zijn (geen lus) |
| C8 | de bestemming moet ONDERBOUWD zijn: gelijke slug, een gemeten stub-canonical, of een regel met reden en bewijs |
| C9 | niet meer dan `drempels.max_bronnen_per_bestemming` bronnen naar één bestemming |
| C10 | de bestemming mag niet op de zwarte lijst `verboden_bestemmingen` staan |

C8 is de controle tegen de onverwante 301: verwantschap is geen gevoel, maar een van drie
aantoonbare herkomsten.

Wat er gebeurt bij een schending hangt af van wie het voorstel deed:

- **door een mens vastgelegd** (`handle_afbeelding` of een familieregel met bestemming) → het
  script **faalt met exitcode 3** en noemt de regel en de codes. Een opgeschreven besluit dat niet
  uitvoerbaar is, mag niet stil in het rapport blijven staan.
- **automatisch gevonden** (gelijke slug) → de rij valt terug op `REQUIRES_REVIEW`, de bestemming
  wordt `GEWEIGERD`, en de terugval wordt geteld en benoemd.

Bewezen met vier foute regels in het datacontract (C1+C10, C2+C5, C3+C5, C4) en drie meer
(C6, C7, C9 bij een tijdelijk verlaagde drempel): alle zeven leverden exitcode 3 met de juiste
codes. C8 vuurt vandaag nergens — hij is het slot op een toekomstig codepad dat een nieuwe,
ongekeurde herkomst zou introduceren.

---

## 5 · Wat deze repository niet kan — en wat dus elders moet

**Een echte 301 per pad kan deze site vandaag niet serveren.** Gemeten op 13 oktober 2026: er is
in de repository geen `Caddyfile`, `nginx.conf`, `_redirects` of `static.json`
(`docs/vibe-url-conventie.md` regel 27 zegt hetzelfde). De apex-naar-www- en
http-naar-https-redirects komen van de nginx/Plesk-server vóór Railway, niet hieruit.

Het mechanisme dat de repository wél heeft is de **doorverwijsstub**: HTTP 200 met `noindex`, een
canonical naar de opvolger, een meta-refresh en een `location.replace` (gemeten in
`capaciteit-als-dienst.html`; 16 stubs in gebruik). Dat is geen 301, maar het houdt een oude URL
levend en geeft het signaal door.

Een rij met `REDIRECT_301` is dus een **besluit**, geen uitgevoerde wijziging. Het veld
`uitvoering` zegt dat erbij. Wie zo'n 301 wil uitvoeren, kiest tussen een hostregel (nieuw
mechanisme, buiten deze bestanden) of een stub per URL (nieuwe publieke HTML, dus een besluit van
de redactie).

**RETURN_410 zit in de woordenlijst maar is hier niet uitvoerbaar**: een 410 per pad is op de
staticfile-provider niet te configureren zonder zo'n mechanisme. Omdat 404 en 410 voor Google
vrijwel hetzelfde effect hebben, is dat geen verlies — maar het mag niet geadviseerd worden alsof
het klaarstaat.

---

## 6 · De eerlijke dekkingsbeperking

- De 7.728 is een **schermafbeeldingswaarneming**, geen meting.
- Een export dekt **maximaal 1.000 URL's per reden**. Volledige dekking van 7.728 is met dit
  mechanisme onmogelijk; elke telling heet daarom ONDERGRENS.
- Buiten Search Console is er niets: Wayback kent 169 URL's op de hoofdhost, de git-historie 0
  verloren paden.
- Van de Shopify-families is alleen het deel onder `/cdn/*` en `/checkouts/*` **gezien** (124
  gearchiveerde rijen). `/collections`, `/products`, `/cart`, `/account`, `/search`, `/apps`,
  `/policies`, `/blogs` en `/pages` zijn **INFERRED**: standaardgedrag van het platform, hier niet
  gearchiveerd. Elke rij draagt dat label.
- Van elke familie is één representatieve URL live opgevraagd (14 metingen op 13 oktober 2026,
  alle 404). Dat is een **steekproef** en geen familietelling; het zegt niets over de duizenden
  URL's die wij niet hebben.

Wat dit mechanisme wél garandeert: zodra er een export is, krijgt elke URL erin precies één actie
met een reden, een vertrouwenslabel en een bestemming die tien controles heeft doorstaan — en geen
enkele URL krijgt stil een 301 naar de homepage.
