# Vibe Energy — SEO 3.2: indexatieherstel en opruiming van historische URL's

Vastgesteld 13 oktober 2026. Alles hieronder is in die sessie gemeten, behalve waar expliciet
`INFERRED`, `UNVERIFIED` of `NOT_AVAILABLE` staat.

> ## De twee populaties die niet door elkaar mogen lopen
>
> Search Console rapporteert duizenden historische URL's. De huidige site heeft 430 canonieke
> URL's. **Dat zijn twee verschillende verzamelingen, en bijna elke verkeerde conclusie over deze
> site komt uit het verwarren van die twee.**
>
> - De **huidige** inventaris is gemeten en technisch gaaf: 430 van 430 geven HTTP 200, hebben een
>   zelfverwijzende canonical, staan op `index, follow`, staan in de sitemap en hebben minstens
>   twee inkomende interne links. Er is **geen** indexeerbaarheidsdefect gevonden.
> - De **historische** inventaris is van het vorige platform (Shopify) en is hier niet
>   reconstrueerbaar. Dat 7.728 van die URL's 404 geven is in de meeste gevallen **correct gedrag**,
>   geen defect.
>
> "35 geïndexeerd" bewijst dus niet dat 395 huidige pagina's zijn afgewezen. Wat het wél betekent
> staat in §4.

---

## 1 · Wat er echt live staat — gemeten

| | |
|---|---|
| Railway-project | `authentic-eagerness` (`7c8d796e-bf0a-4ee5-88c8-6bcfa1b5c10a`), env `production` |
| Service | `vibe-website` (`0e3c1eee-47ad-4e52-aaf6-7eb9892e0229`), builder RAILPACK, provider `staticfile` |
| Resolveert | Railpack 0.40.1 → **Caddy 2.11.4** (uit de bouwlog van de actieve deploy) |
| Gedeployde SHA bij aanvang | `078785a`, SUCCESS 2026-10-13T10:50:12Z |
| `main` schoof tijdens de sessie | `078785a` → `be8b0ed` (#21) → `edc10d2` (#22) → `46aa0fb` (#23) |
| Basis van deze release | `46aa0fb` |
| Canonieke inventaris | **430** URL's in `sitemap.xml` → `sitemap-nationaal.xml` (80) + `sitemap-regios.xml` (350) |
| Latentie | mediaan 398 ms, p95 434 ms, max 1262 ms over 430 verzoeken |

**`main` schoof tijdens deze sessie drie keer door, en dat is gecontroleerd onschadelijk.**
`git diff 078785a..46aa0fb` raakt **uitsluitend** `intelligence/` — nul bestanden buiten die map —
en `intelligence/` staat in de `railpack.json` excludelijst. De `last-modified` van de geserveerde
bestanden bleef op 2026-10-13T10:21:42 GMT staan. De geserveerde bytes zijn dus onveranderd en elke
statische meting in dit document blijft geldig. Deze release is op `46aa0fb` herbaseerd en daarna
opnieuw volledig gemeten; er was nul overlap met de bestanden uit #21, #22 en #23 en geen
migratienummerbotsing.

**Valkuil, vastgelegd omdat hij kost:** Railway's eigen deploymentmetadata zegt voor deze service
`detectedProviders = ["node"]`. Dat is misleidend — de bouwlog van diezelfde deployment zegt
"Using provider Staticfile from config" en resolveert alleen Caddy, geen node. Oorzaak: de
node-detector van railpack leest `package.json` met `os.Stat`, buiten de excludematcher om, waarna
de `provider`-sleutel in `railpack.json` de detectie overruleert. **De bouwlog is de enige
betrouwbare bron.**

### Vierwegpariteit — de sterkste meting van deze audit

| laag | INDEX | NOINDEX | PENDING |
|---|---:|---:|---:|
| `data/seo/routes.json` | 430 | 17 | 4.254 |
| sitemap (live) | 430 | 0 | 0 |
| bestanden in de repo | 430 | 17 | 0 |
| productie, HTTP 200 | 430 | 17 | n.v.t. |

Nul afwijkingen in beide richtingen: geen INDEX-route zonder sitemapregel, geen sitemapregel zonder
INDEX-route, geen PENDING-route met een bestand, geen PENDING-route in de sitemap.

---

## 2 · De huidige 430 pagina's — volledig gecrawld

Alle 430 canonieke URL's zijn opgehaald van productie (4 gelijktijdig, 120 ms tussen starts).

| controle | uitkomst |
|---|---|
| HTTP 200 | **430 / 430** · 0 netwerkfouten |
| canonical zelfverwijzend en exact gelijk aan de URL | **430 / 430** |
| `robots` meta | **430 / 430** `index, follow` |
| `X-Robots-Tag` | **0** pagina's |
| `<html lang>` | **430 / 430** `nl` |
| exact één `<h1>` | **430 / 430** |
| `<main>` aanwezig, inhoud server-side in de HTML | **430 / 430** |
| JSON-LD aanwezig, 0 parsefouten | **430 / 430** |
| dubbele titels / dubbele descriptions / ontbrekende descriptions | **0 / 0 / 0** |
| `BreadcrumbList` | 429 / 430 — de homepage niet, en dat is correct |
| viewport-meta | **430 / 430** |

JSON-LD-typen: `Organization` 430, `WebSite` 430, `WebPage` 430, `BreadcrumbList` 429,
`Service` 374, `AdministrativeArea` 349, `FAQPage` 46, `TechArticle` 17.

Woorden in `<main>`: minimum 191, p05 641, mediaan 1.054, maximum 6.095. Eén pagina onder 300
woorden: `/contact` met 191 — dat is poort-13-afgedwongen ontwerp (een conversiepagina), geen
tekort.

### Interne linkgraaf

0 weespagina's · 0 onbereikbare pagina's · 0 gebroken interne links · 0 interne links naar een
`.html`-variant · 0 interne links naar een noindex-stub. Klikdiepte vanaf `/`: diepte 0 = 1,
diepte 1 = 26, diepte 2 = 66, diepte 3 = 337. Elke pagina heeft minstens 2 inkomende interne links.

**Eerlijke nuance bij dat getal.** De hoge inkomende tellingen (tot 445) komen bijna volledig uit
sjabloonoppervlakken: de noscript-navigatie en een verwant-blok. Binnen `<main>` is de mediaan
inkomend 1 en uitgaand 5. "429 inkomende links" is dus geen interne-linkkracht; zie het
reviewmanifest §7 voor wat daar wél aan te doen valt.

### robots.txt — nagemeten op 13 oktober 2026, GEEN defect, dus niet gewijzigd

| controle | uitkomst |
|---|---|
| HTTP-status en type | **200**, `text/plain; charset=utf-8` |
| vorm | 687 bytes, **geen BOM**, 18 × LF en 0 × CRLF, 0 niet-ASCII bytes |
| groepen | precies één `User-agent: *` |
| `Allow` | `/` |
| `Disallow` | `/data/`, `/scripts/`, `/docs/`, `/api/`, `/intelligence/` |
| niet-ondersteunde richtlijnen | **geen** `noindex`, `crawl-delay` of `host` |
| blokkeert het een canonieke URL? | **0 van 430** |
| blokkeert het een renderbenodigde asset? | **geen** — `/vibe/vibe.css`, `/vibe/tokens.css`, `/vibe/chrome.js`, `/_consent.js`, `/_clarity.js`, `/assets/*` vallen alle buiten elke `Disallow` |
| `Sitemap`-regel | `https://www.vibeenergy.nl/sitemap.xml` → **200 zonder redirect**, `text/xml` |
| apex-variant | `https://vibeenergy.nl/robots.txt` → 301 naar www |

De vijf `Disallow`-paden geven zelf alle 404 op productie (gemeten), dus ze sluiten niets uit wat
bestaat; ze zijn de tweede laag naast de allowlist van `publiek-artefact.mjs`. Er is geen
aantoonbaar defect, en het bestand is daarom **niet aangeraakt**.

### Eén meetfout, voor de volledigheid

Mijn eerste crawl meldde een ontbrekende `meta description` op
`/regios/noord-brabant/s-hertogenbosch`. Dat was een fout in míjn crawler: de attribuutregex
`content=["']([^"']*)["']` brak op de waarde `"'s-Hertogenbosch: …"`, die met een apostrof begint.
Met een regex die de delimiter vastlegt en met een backreference afsluit: **0** ontbrekende
descriptions. De pagina was altijd in orde.

---

## 3 · De historische inventaris — en waarom hij hier ophoudt

### Het vorige platform was Shopify, niet WordPress

Gemeten uit de Wayback CDX-index, snapshots januari 2024:

- `/cdn/shop/files/…`, `/cdn/shop/t/3/assets/…`, `/cdn/shopifycloud/…`, `/cdn/fonts/…`
- `/checkouts/internal/preloads.js?locale=nl-NL&permanent-domain=782e0c.myshopify.com`
- een hmac-parameter waarvan een veld base64 `vibebatterij.nl` bevat

Dat verklaart de ordegrootte van 7.728 beter dan WordPress zou doen: een Shopify-winkel brengt
`?v=`- en `&width=`-varianten per afbeelding voort, plus facetfilters op `/collections/`. De
"oude WordPress-sitemapeindpunten" uit de opdracht zijn daarmee vermoedelijk Shopify's
`/sitemap_products_1.xml`-familie — `INFERRED`, want welke adressen zijn ingediend weet alleen
Search Console.

### De dekkingsbeperking, onverbloemd

| bron | unieke URL's | bruikbaar |
|---|---:|---|
| Search Console (7.728 404's) | 7.728 | **NOT_AVAILABLE** — geen credentials, geen export |
| Wayback CDX, hele domein `vibeenergy.nl` | 169 | ja, maar ≈2% van de populatie |
| Wayback CDX, `aanvragen.vibeenergy.nl` | 3 | andere host, niet uit deze repo geserveerd |
| git-historie (ooit verwijderde html/xml) | 318 | **geen verlies**: alle verwijderde `regios/*`-paden bestaan vandaag weer |
| oude sitemapbestanden in de repo | 0 | er zijn er nooit andere geweest dan de huidige drie |

Wayback kent **geen** `/collections/`, `/products/`, `/pages/` of `/blogs/`-URL's van dit domein.
De 7.728 zijn dus **nergens anders te verkrijgen dan uit een GSC-CSV-export**. Daarom is de
importer gebouwd in plaats van de lijst geraden.

### Kandidaat-legacy-sitemapeindpunten — alle gemeten 404

`/sitemap_index.xml` · `/sitemap_products_1.xml` · `/sitemap_collections_1.xml` ·
`/sitemap_pages_1.xml` · `/sitemap_blogs_1.xml` · `/wp-sitemap.xml` ·
`/wp-sitemap-posts-post-1.xml` · `/post-sitemap.xml` · `/page-sitemap.xml` ·
`/product-sitemap.xml` · `/category-sitemap.xml` · `/sitemap.xml.gz` · `/feed` · `/rss`

404 is hier het juiste antwoord: zouden ze gaan bestaan, dan stond er een tweede, verouderde
URL-verzameling naast `sitemap.xml`. De resterende actie zit **niet op de site maar in de console**
— zie §6.

### Classificatie

`node scripts/seo/historische-urls.mjs` classificeert vandaag **603** URL's zonder export:
0 voorgestelde 301's, 3 × `REQUIRES_REVIEW`, de rest `KEEP` of `RETURN_404`.

**Nul voorgestelde 301's is de uitkomst, niet een tekortkoming.** Met het bewijs dat er is, heeft
geen enkele historische URL een aantoonbaar relevante opvolger. De classificator weigert daarom
actief: een voorgestelde bestemming die naar de homepage, naar een onverwante pagina, naar een
PENDING-route, naar een noindex-pagina of in een keten of lus wijst, wordt **geweigerd** en niet
als waarschuwing doorgelaten.

Met een geïmporteerde export verschuift dat meteen en meetbaar. Proef met een synthetische export
van vijf URL's: `/pages/over-ons` → **`REDIRECT_301`** naar `/over-ons`, terwijl
`/collections/batterijen`, `/products/vibe-ess-100` en `/cdn/shop/files/x.png?v=1&width=750`
correct op `RETURN_404` blijven. `/pages/<handle>` is de enige Shopify-familie waar een 301
verdedigbaar is, want dat waren redactionele pagina's.

---

## 4 · Waarom Google er 35 heeft en niet 430

Dit is de diagnostische kernvraag, en het antwoord is **tijd en identiteit**, niet een defect.

1. **De URL-identiteit van de site is 3,3 dagen oud.** Tot 2026-10-10 stonden alle canonicals en
   alle sitemapregels op de apex `vibeenergy.nl`. Sinds commit `6b47dc9` staan ze op `www`. Alles
   wat Google vóór dat moment had geïndexeerd, werd op dat moment een 301.
2. **334 van de 430 URL's bestonden bij de GSC-schermafbeelding 25 uur.** De regiositemap met de
   337 gemeentepagina's komt uit commit `5ffea19` van 2026-10-12. Aantal URL's dat op het moment
   van meten ≥7 dagen in een gedeployde sitemap stond: **0 van 430**.
3. **Googlebot crawlt, en krijgt 200.** Uit de Railway-toegangslogs van de actieve deployment:
   404 Googlebot-verzoeken, **100% HTTP 200**, 37 unieke documenten waaronder 7 gemeentepagina's.
   Tempo ≈52 documenten per uur; in dat tempo is de hele inventaris in ~8 uur te crawlen. Er is
   dus geen crawlblokkade en geen crawlbudgetprobleem.
4. **De sitemap is pas één keer gelezen.** Ingediend 2026-10-12, eerste succesvolle lezing
   2026-10-13. Uit een waarneming van één dag volgt geen permanent indexatiefalen.

**Wat hieruit NIET volgt.** Welke 35 pagina's geïndexeerd zijn, is `NOT_AVAILABLE` — zonder Search
Console is dat niet te weten, en een geautomatiseerde Google-zoekopdracht is daar geen geldige
vervanging. Er staat in dit document dus geen lijst van 35.

**Wat wij niet beloven.** Dat alle 430 pagina's geïndexeerd worden. Dat is Google's selectie, niet
onze poort. Wat wij garanderen is dat alle 430 technisch indexeerbaar zijn, en dát is gemeten.

Meetbare signalen die Google's selectie kunnen remmen, eerlijk gelabeld: alle 396 nieuwe pagina's
dragen dezelfde `lastmod` (`MEASURED`, en correct — het was één release); 349 pagina's delen een
sjabloonstructuur (`MEASURED`, hoogste jaccard 0,5304 bij drempel 0,60); nul externe links naar
gemeentepagina's (`UNVERIFIED` — er is geen backlinkbron geautoriseerd); beperkte topische
autoriteit (`UNVERIFIED`).

---

## 5 · Wat deze release verandert

### 5.1 De poorten — vijf gaten die een groene keten mogelijk maakten

**De depublicatiegrendel (`intelligence/ops/publicatiecontract.mjs`, stap 7).**
Gemeten op een wegwerpkopie van `edc10d2`: `vrijgeven-r31.mjs --fase 1` — een commando dat
`bouw.mjs:52` letterlijk aanbeveelt — plus een normale ketenrun bracht 430 INDEX-routes naar 116,
verwijderde 314 HTML-bestanden, en gaf daarna `audit.mjs` exit 0 (16/16 PASS),
`publicatiecontract.mjs` exit 0, `qa-vijandig.mjs` exit 0, en na de commit ook
`publiek-artefact.mjs` exit 0, met een lege `git status` na een ketenrun. **Er stond nul rem op het
depubliceren van de halve site.**

De grendel vergelijkt de INDEX-set met die van de **basis van de wijziging** — niet met `HEAD`, want
`HEAD` en de werkboom zijn door de reproduceerbaarheidspoort altijd byte-identiek (gemeten: beide
sha256 `91fce181…`), waardoor een grendel op `HEAD` eeuwig "verdwenen: 0" meldt, óók in exact de PR
die 314 pagina's weggooit. Geen drempel en geen marge: één weggegooide indexeerbare URL zonder
verantwoording is al het defect. De ontsnappingsklep is de sectie `ingetrokken` in
`data/seo/publicatiebesluit.json`, met per route een niet-lege reden. Zonder basisreferentie is de
uitkomst **OVERGESLAGEN met reden** en telt hij niet als geslaagd — nooit een stille PASS.

**Poort 15 beoordeelde nul projectlinks.** De sectieregex ankerde door de `/i`-vlag op het proza
"opgeleverd in" in plaats van op de kop. Gemeten over alle 11 gemeentepagina's met een projectlink:
de oude regex beoordeelde **0** van de 16, geankerd op `id="bewijs"` beoordeelt hij alle **16**. Een
verplichte poort die PASS meldt over een controle die hij niet uitvoert, is erger dan geen poort.
Er zit nu ook een teller op: beoordeelt de lus nul links terwijl er pagina's met een projectlink
bestaan, dan faalt de poort.

**Poort 5 toetst nu de bestemming van de 16 doorverwijsstubs.** Tot deze release was alleen de
*legaliteit* getoetst (bestaat de route, is hij geen PENDING). Drie defecten glipten daarlangs, elk
via de brontabel en dus via een normale ketenrun: een **keten** (stub → stub), een **lus** (stub →
zichzelf) en het **homepage-afvoerputje** (stub → `/`, de wortel is een geldige INDEX-route). De
eis is nu: bestemming is INDEX, niet de pagina zelf, niet de wortel, en de `meta`-refresh noemt
route-genormaliseerd dezelfde route als de canonical.

**Eén teken kon een poort uitschakelen zonder dat de vijandige QA het zag.** `audit.mjs` telt zijn
eindoordeel als `!p.ok && p.verplicht`; `verplicht` op `false` laat de FAIL-rij staan maar maakt het
eindoordeel PASS en de exitcode 0. `poortFaalt()` las alleen de tabelrij en gooide de exitcode weg.
Een scenario is nu pas geslaagd als de rij FAIL meldt **én** het eindoordeel FAIL is **én** de
exitcode niet nul is. Daarbovenop een poortinventaris-toets: wijkt het aantal poorten of hun
`verplicht`-vlag af van 16 verplichte, dan faalt de QA vóór het eerste scenario.

**De vijandige QA groeide van 10 naar 15 scenario's**, alle 15 GOED. De vijf nieuwe zijn eerst op de
oude code gemeten en bleven daar groen: de halve site depubliceren, een project uit een andere
gemeente als lokaal bewijs, stub → stub, stub → homepage, en een poort op niet-verplicht.

**Poort 11 meldt nu de marge.** De rij gaf alleen het aantal paren en de drempel, waardoor de enige
vraag die telt — hoeveel ruimte is er nog — onzichtbaar was. Dat is geen theorie: de marge rust
volledig op de sectie `id="profiel"`. Zonder dat blok springt de hoogste jaccard naar 0,7092 en
vallen 1.256 paren door de drempel. De rij draagt nu de hoogste jaccard, de marge en de hoogste
dekking.

**Poort 4 meldt nu ook het blokkerende aantal.** De rij noemde wél de 36 niet-blokkerende
lengteafwijkingen en níet de blokkerende fouten — de verkeerde asymmetrie bij een FAIL.

**`intelligence/ops/ci-lokaal.sh` miste vier stappen uit `poort.yml`** (de klokstap, `qa-vijandig`,
`publiek-artefact`, `npm run poort`). Drie daarvan kwamen ná dit script in de werkstroom en zijn
nooit overgezet; de vierde ontbrak vanaf het begin. Lokaal groen was dus een valse voorsprong op
precies de scherpste poorten. De klokstap `unset` eerst de gepinde datumvariabelen, want via
`npm run e2e` erfde het script ze en zou hij de pin meten in plaats van de generator.

### 5.2 Historische URL's — het importmechanisme

- `scripts/seo/gsc-import.mjs` — leest een GSC-CSV-export, **headergestuurd en weigerend bij
  twijfel**: onbekende kopregel → exit 2 en er wordt niets geschreven (gemeten). Herkent het
  overzichtsblad, het detailvenster per reden en de prestatie-export, in NL en EN.
  Zet `afgekapt: true` als standaard omdat GSC per reden maximaal 1.000 voorbeeld-URL's exporteert;
  elke telling daaruit draagt het woord **ONDERGRENS** tenzij `--totaal` een gezaghebbend totaal
  meegeeft.
- `scripts/seo/historische-urls.mjs` — classificeert met de elf acties uit de opdracht en levert het
  inventarisrapport met de 15 gevraagde kolommen. Veertien zijn vulbaar; `zoekprestatie` blijft
  `NOT_AVAILABLE` tot er een export is. Een leeg veld draagt `ONBEKEND` of `NOT_AVAILABLE`, nooit
  niets — een leeg veld leest als nul.
- `data/seo/historische-urls.json` — het datacontract met de familieregels, de gemeten
  Wayback-inventaris en de legacy-sitemapeindpunten.
- `docs/seo-historische-urls.md` — hoe de eigenaar de export maakt en wat de uitkomst betekent.

Alle vier liggen in `data/`, `scripts/` of `docs/`: intern volgens `robots.txt`, volgens
`railpack.json` exclude én volgens de allowlist van `publiek-artefact.mjs`. Die poort blijft groen
en meldt 860 publieke bestanden tegen 330 interne (was 314).

### 5.3 Inhoud — vier gemeten defecten in de generator

- **Bronvermelding in het citeerbare direct-antwoordblok.** 326 van de 337 gemeentepagina's noemden
  daar een IBIS-bedrijventerreinaantal terwijl de bronregel alleen CBS en de netbeheerder noemde.
  Juist dat IBIS-terrein is het vereiste bewijspunt voor vrijgave van een gemeente. Op 30 pagina's
  stond omgekeerd de netbeheerbron erbij terwijl er geen netbeheerder werd genoemd.
- **Het locatiequotient ontbrak zonder uitleg** (mediaan 3 ontbrekende bedrijfstakken, maximum 15).
  Raakt 349 bestanden, want de provinciepagina's gebruiken dezelfde opsomming.
- **Het hectaretotaal is een ondergrens** op 10 pagina's, omdat terreinen met nul hectare meetellen
  als nul. Hulst valt er expliciet buiten: daar zou "ondergrens" een ongedekte bewering zijn.
- **Vijf naamvarianten bereikten geen pagina** ('Friesland', 'Den Bosch' en drie andere): de
  aliasregel was dood sinds de funderingscommit, terwijl `geo-overschrijvingen.json` beweerde dat
  ze "in titel en inhoud" stonden.

Elke tekstwijziging is tegen poort 11 doorgerekend. Hoogste jaccard **0,5304** bij drempel 0,60,
marge **0,0696**, nul paren boven de drempel. De sectie `id="profiel"` is niet bekort.

### De `lastmod` die een echte wijziging verzwéég

Deze release vond zijn eigen defect bij het uitrollen. De inhoudscorrecties hierboven wijzigden de
vingerafdruk van **346** routes, en toch bleef de sitemap **byte-identiek**: alle 350 regionale
`lastmod`-waarden en alle 346 `dateModified`-velden hielden `2026-10-12`, de datum van de vorige
release.

Oorzaak: `genereer.mjs` gaf het vingerafdrukgrootboek
`process.env.ROUTES_DATUM || reg._gegenereerd` als bouwdatum mee, en `_gegenereerd` schuift per
ontwerp **alleen op als de ROUTESET verandert** (`bouw-routes.mjs:606`, een hash over elke route met
haar staat). Dat is juist voor het register — het is precies waarom een ketenrun geen valse
wijzigingsdatum geeft — maar het is de verkeerde klok voor een *inhouds*wijziging: de routeset bleef
identiek (430 / 17 / 4.254) terwijl de inhoud van 346 pagina's veranderde.

Het gevolg is de spiegel van het defect dat de vingerafdrukken oorspronkelijk oplosten. Daar
*verzon* `lastmod` een wijziging; hier *verzwijgt* hij er een. Beide zijn onwaar, maar de tweede is
schadelijker in deze release: de hele waarde van de gerepareerde bronvermelding hangt ervan af dat
Google die 326 pagina's opnieuw leest.

De bouwdatum voor de inhoud is nu `INHOUD_DATUM || ROUTES_DATUM || de dag van vandaag`, en het
grootboek blijft de poortwachter: **alleen een route met een veranderde hash komt bij die datum.**
Daardoor is een ketenrun zónder inhoudswijziging nog steeds byte-identiek. Gemeten, drie keer:
een tweede gewone ketenrun → identiek; met de vier datums op 2028-04-12 → byte-identiek;
met `INHOUD_DATUM=2029-01-01` → byte-identiek.

De 346 grootboekregels die in deze release een verkeerde datum hadden gekregen, zijn gecorrigeerd
naar `2026-10-13` — de dag waarop hun inhoud werkelijk veranderde. Resultaat in de sitemap:
346 × `2026-10-13`, 4 × `2026-10-12` (de regiopagina's die niet veranderden), en in
`sitemap-nationaal.xml` onveranderd 34 × `2026-10-10` en 46 × `2026-10-12`.

Geen enkel getal is toegevoegd dat niet al in `data/bewijs/` of `data/geo/` stond. Geen lokale
netcapaciteit, geen projectresultaat, geen besparing, geen subsidie, geen klantreferentie.

### 5.4 Monitoring

`intelligence/src/analytics/koppelingen.ts` en `src/cli/analytics.ts` leveren nu het rapport van
tien metrieken, dat **altijd alle tien de regels print** met
`metriek | aantal-of-ONBEKEND | bron | label | bewijs`. Een weggelaten regel leest als "niet van
toepassing" terwijl hij "niet gemeten" betekent. `TECHNICALLY_INDEXABLE` en `GOOGLE_INDEXED` zijn
twee gescheiden metrieken en de een vervangt de ander nooit.

Stand vandaag: 1 van 10 `MEASURED`, 1 berekenbaar maar niet bewaard, 1 half, 7 `NOT_AVAILABLE`.

De eigen live-meting dekte 12 van 430 pagina's en koos die door `in_sitemap desc` plus een
alfabetisch prefix: **geen van de 350 `/regios`-routes werd ooit gemeten**, en de 17 NOINDEX-stubs
structureel nooit. Dat is gerepareerd, met begrensde gelijktijdigheid als voorwaarde (sequentieel
met een timeout van 20 s zou een 430-run een staart tot ~2,4 uur geven) en met de noemer altijd in
de uitvoer.

`intelligence/db/migraties/0034_indexatie_dagstand.sql` lost op dat `intel.indexatie_status` per
constructie geen trend kan bevatten: `unique (organisatie_id, url, bron)` met
`on conflict … do update` zet `laatst_gecontroleerd_op = now()` en vernietigt daarmee de vorige
stand. Over 33 migraties bestond geen dagstandtabel.

> ### CORRECTIE 13 oktober 2026 — deze paragraaf beweerde het tegenovergestelde
>
> Hier stond: *"geschreven, in CI bewezen, en NIET op productie toegepast"*, en punt 8 van het
> reviewmanifest vroeg om toestemming om hem later toe te passen. **Dat was onjuist.** De schrijver
> had `buildCommand`, `startCommand` en `rootDirectory` van de services gemeten, maar niet
> `preDeployCommand` — en juist daar zit het migratiepad.
>
> Gemeten via de Railway-API: `vibe-intel-api` draagt
> `preDeployCommand = ["npm run migreer && npm run zaai && npm run geo"]`. Die draait *binnen* het
> privénet, bij elke deploy, vóór de nieuwe container live gaat. **Een merge naar `main` past
> openstaande migraties dus toe op productie.** Dat is geen losse, later te kiezen handeling.
>
> Bewijsketen dat 0034 bij de deploy van `8cbf6b5` (2026-10-13T14:42:15Z, SUCCESS) is toegepast:
>
> | stap | meting |
> |---|---|
> | het pad bestaat | `preDeployCommand` zoals hierboven, via de Railway-API |
> | de runner faalt hard | `src/cli/migreer.ts` eindigt met `process.exit(1)` bij elke fout; empirisch bevestigd — een droogloop die op `ENOTFOUND` stuitte gaf exitcode **1** |
> | de keten is voltooid | de `&&`-keten liep door: het deploylog van `8cbf6b5` bevat de volledige uitvoer van `zaai` (`ZAAIEN GEREED`, 430 pagina's) **en** van `geo` (`GEOGRAFIE GESYNCHRONISEERD`, 12 provincies), en de container startte |
> | dus | `migreer` eindigde met exitcode 0 tegen de productiedatabase, en liet geen migratie open |
>
> ### MEASURED sinds 13 oktober 2026, 16:12:40 UTC — maar alleen het REGISTER
>
> De eigenaar heeft de leesmeting zelf gedraaid:
>
> ```
> railway ssh --service vibe-intel-api "npm run migreer -- --droog"
>   toegepast: 0 · overgeslagen: 34 · namen: [] · droog: true
> ```
>
> **Wat dit BEWIJST — `MEASURED`:**
>
> - Alle **34** migratiebestanden staan geregistreerd als toegepast in `intel.migraties`. De
>   runner leest letterlijk `select naam, hash, toegepast_op from intel.migraties`
>   (`src/db/migraties.ts`) en vergelijkt dat met de bestanden op schijf.
> - **Drift 0.** Van elke toegepaste migratie is de sha256 bewaard, en
>   `drift: rij !== undefined && rij.hash !== m.hash` zou aanslaan bij één byte verschil. De
>   runner weigert dan te draaien. Hij draaide schoon, dus geen enkel toegepast bestand wijkt af.
> - **Niets staat open.** `toegepast: 0` met `namen: []` betekent dat er geen migratie meer te
>   doen is — 0034 inbegrepen.
> - De productiedatabase is bereikbaar en de applicatierol kan lezen.
>
> **Wat dit NIET bewijst — nog steeds niet geïnspecteerd:**
>
> De runner leest zijn **eigen grootboek**, niet het schema. Hij doet geen enkele query op
> `information_schema` of `pg_class`. Daarom blijft ongemeten:
>
> - of `intel.indexatie_dagstand` fysiek bestaat met de tien kolommen, drie indexen, zes
>   CHECK-constraints, RLS en de grants zoals de migratie ze beschrijft;
> - of `live_http_status` en `live_gemeten_op` fysiek van `intel.pagina_register` verdwenen zijn.
>
> Een geregistreerde migratie en een geverifieerd schema zijn twee verschillende beweringen, en
> deze meting dekt alleen de eerste. Wat de tweede ondersteunt is INDIRECT en blijft dat: de
> migratie liep in één transactie (faalt er iets, dan is er niets half toegepast), en dezelfde
> 34 migraties gaven op een wegwerpdatabase een schema dat `intel_priv.controleer_invarianten()`
> met 0 bevindingen doorkwam.
>
> **Status: `MIGRATIEREGISTRATIE = MEASURED` · `FYSIEK SCHEMA = NIET GEÏNSPECTEERD`.**
> Wie dat laatste wil sluiten, heeft een introspectiequery nodig, niet de migratierunner.
>
> **De twee `DROP COLUMN`-statements zijn daarmee ook uitgevoerd**, zonder dat daar expliciet om is
> gevraagd. Wat dat verzacht, elk gemeten: beide kolommen waren leeg op een onafhankelijke database
> met 449 rijen in `pagina_register` (0 non-null in `live_http_status`, 0 in `live_gemeten_op`), geen
> regel code buiten hun eigen definitie in `0004_inhoud.sql` noemt ze, en terugdraaien is het
> opnieuw toevoegen van twee nullable kolommen — er was geen data om te verliezen. Wat het niet
> verzacht: een migratie die een additieve tabel en een onomkeerbare `DROP COLUMN` in één bestand
> combineert, dwingt beide beslissingen tot één. **Aanbeveling: splits zo'n migratie voortaan.**

**Gemeten in CI tegen een echte PostgreSQL 17.11:** `MIGRATIES PASS — 34/34 toegepast, drift 0`,
`INVARIANTEN PASS — 0 bevindingen`, integratietoetsen 185/185.

**Gemeten in een repetitie op een wegwerpdatabase** (PostgreSQL 17.11, alle 34 migraties vanaf nul,
daarna opgeruimd): tabel met tien kolommen waarvan alleen `aantal` en `noemer` nullable, drie
indexen (`_pkey`, `_uniek`, `_idx`), `relrowsecurity = true`, policy
`indexatie_dagstand_eigen_organisatie` voor `vibe_intel_app` + `vibe_intel_lezer`, grants exact
`INSERT, SELECT, UPDATE` voor de app en `SELECT` voor de lezer — **geen DELETE**, want een dagstand
is historie. Beide dode kolommen verdwenen. `intel_priv.controleer_invarianten()` gaf **0
bevindingen**. En de zeven gedragstoetsen op de constraints:

| toets | verwacht | uitkomst |
|---|---|---|
| geldige `MEASURED`-rij | lukt | lukt |
| `NOT_AVAILABLE` mét getal | faalt | `indexatie_dagstand_ontbrekend_heeft_geen_getal` |
| `MEASURED` zónder getal | faalt | `indexatie_dagstand_gemeten_heeft_een_getal` |
| `NOT_AVAILABLE` zónder getal | lukt | lukt — de reden dat `aantal` nullable is |
| leeg `bewijs` | faalt | `indexatie_dagstand_bewijs_check` |
| onbekende metriek | faalt | `indexatie_dagstand_metriek_check` |
| twee rijen op twee datums | lukt | 2026-10-13 = 430 én 2026-10-14 = 431 naast elkaar |

Die laatste is het hele punt: twee meetpunten op twee datums zijn een trend, en dat was onder
`indexatie_status` structureel onmogelijk.

**Waarom het productieschema niet te lezen was.** Zes routes gemeten, alle dicht: de
Postgres-service heeft geen `RAILWAY_TCP_PROXY_DOMAIN` en geen `DATABASE_PUBLIC_URL` (over alle 26
variabelen); `railway run` voert lokaal uit en strandt op
`getaddrinfo ENOTFOUND postgres.railway.internal`; `railway ssh` weigert zonder SSH-sleutel en er
staat geen sleutel in `~/.ssh` of in de agent; zeven onbeveiligde HTTP-routes gaven 404
(`/migraties`, `/schema`, `/versie`, …); de structuurlogregels van de runner worden door Railway's
pre-deploy-logcapture niet bewaard (vier filterquery's, nul regels); en de enige code die de tabel
expliciet aftast — `indexatieRapport()` in `src/analytics/koppelingen.ts` — is alleen bereikbaar via
`src/cli/analytics.ts`, dat in productie door niets wordt aangeroepen.

**Eén van die zes routes is inmiddels geopend.** De eigenaar heeft een SSH-sleutel aangemaakt en
`railway ssh --service vibe-intel-api "npm run migreer -- --droog"` zelf gedraaid; de uitkomst
staat hierboven. Dat is de route die werkt, en hij is read-only zolang `--droog` erbij staat.

**Wat er nog ontbreekt voor een geverifieerd SCHEMA** is een introspectiequery, niet de
migratierunner. Bijvoorbeeld:

```
railway ssh --service vibe-intel-api "node -e \"
  import('./src/kern/db.ts').then(async m => {
    const p = m.maakPool();
    const q = async (s) => (await m.rijen(p, s)).at(0);
    console.log('dagstand bestaat :', await q(\\\"select to_regclass('intel.indexatie_dagstand') is not null as v\\\"));
    console.log('kolommen         :', await q(\\\"select count(*) as v from information_schema.columns where table_schema='intel' and table_name='indexatie_dagstand'\\\"));
    console.log('constraints      :', await q(\\\"select count(*) as v from pg_constraint where conrelid='intel.indexatie_dagstand'::regclass\\\"));
    console.log('rls aan          :', await q(\\\"select relrowsecurity as v from pg_class where oid='intel.indexatie_dagstand'::regclass\\\"));
    console.log('dode kolommen    :', await q(\\\"select count(*) as v from information_schema.columns where table_schema='intel' and table_name='pagina_register' and column_name in ('live_http_status','live_gemeten_op')\\\"));
    process.exit(0);
  })\""
```

Verwacht: `dagstand bestaat true` · `kolommen 10` · `constraints` ≥ 8 · `rls aan true` ·
`dode kolommen 0`. Tot die uitvoer bestaat, blijft het fysieke schema **niet geïnspecteerd** en
staat er nergens in dit document dat het wel is.

**De gedeployde code hangt niet van de migratie af.** `koppelingen.ts:955` en `:1176` doen
`select to_regclass('intel.indexatie_dagstand') is not null` en degraderen naar
`"intel.indexatie_dagstand bestaat niet (migratie 0034 niet toegepast)"`. Productie kon dus nooit
in een inconsistente staat komen, ongeacht of de migratie al had gelopen.

Gemeten en bevestigd: er staat **nul** code in deze repo die een sitemap bij Google indient of de
Indexing API aanroept, en er is nu een poort die een `webmasters`-schrijfscope of een
`urlNotification`-aanroep rood maakt.

### 5.5 Documentatie die gemeten onwaar was

"Vijftien poorten" stond op vier plekken; er zijn zestien. "55 tot 57 procent overlap" was het
bovenste kwartiel, niet het bereik — het is jaccard 0,49 tot 0,57 met mediaan 0,53, en de metriek
hoort erbij omdat de dekking over diezelfde paren 68–74% is. Twee paartellingen (92.235 en 105)
stonden naast elkaar zonder dat erbij stond dat het verschillende populaties zijn. De caddyversie
stond op 2.11.7 terwijl productie 2.11.4 pint — en dat verschil is niet cosmetisch: 2.11.4 laat de
eerste `hide`-regel vallen, dus natoetsen op 2.11.7 maakt dat defect onzichtbaar.
`docs/vibe-url-conventie.md` suggereerde dat een eigen Caddyfile niet kan; gemeten kan hij wel.

**De basislijnreden van de assetpoort was zelf onjuist.** Er stond dat twee bevindingen in
`vibe/chrome.js` een live defect zijn. Gemeten: `/assets/vibe-energy-logo-light.svg` en
`-dark.svg` geven live beide **HTTP 200**, en de bestandsnamen zijn teken voor teken gelijk aan de
referentie. Het label "CASE MISMATCH" is onjuist: `chrome.js:125` stelt het pad tijdens runtime
samen als `'/assets/' + bestand`, en `qa-assets.mjs` kan die concatenatie niet zien — hij lost de
bare bestandsnaam op, mist hem twee keer, en de hoofdletterongevoelige suffixzoeker kiest dan het
verkeerde label. Geen live defect, maar een beperking van de statische controleur. De basislijn
blijft op 2; een derde bevinding blokkeert onverminderd.

---

## 6 · Search Console — PENDING_USER_ACTION

Er zijn **geen** GSC-credentials: `INTEL_GSC_CLIENT_EMAIL`, `INTEL_GSC_PRIVATE_KEY` en
`INTEL_GSC_SITE_URL` ontbreken lokaal **en** op alle vier Railway-services (gemeten via de
Railway-API), en er is geen GSC-API-client in de code — `koppelingen.ts` rapporteert alleen
ontbrekende env-namen. `intelligence/deploy/railway.md` zet `INTEL_GSC_*` expliciet onder "Niet
zetten, bewust". Deze stappen zijn dus handwerk, in deze volgorde:

1. **Leg de huidige sitemapinzendingen vast** vóór je iets verwijdert. Dat is de enige nulmeting
   van metriek 6, en na het verwijderen is hij weg.
2. **Stel het propertytype vast.** Een domeinproperty (`sc-domain:vibeenergy.nl`) dekt apex én
   `www`; een URL-prefixproperty op de apex zou verklaren waarom er 31 "doorverwezen" URL's staan
   — dat zijn dan de oude apex-URL's na de hostwissel van 10 oktober.
3. **Verwijder de obsolete inzendingen**, niet het bestand: de Shopify-eindpunten uit §3 en een
   eventuele apex-inzending. Een 404 op het adres haalt de inzending niet weg; zolang hij staat
   ingediend blijft Google hem opvragen en blijft de fout gerapporteerd.
4. **Dien `https://www.vibeenergy.nl/sitemap.xml` NIET opnieuw in.** Hij staat al op SUCCESS met 430
   ontdekte pagina's. Een onveranderde sitemap opnieuw inzenden levert niets op.
5. **Exporteer de pagina-indexering per reden apart.** GSC kapt per reden af op 1.000
   voorbeeld-URL's, dus één export van "alles" levert een onbruikbaar mengsel. Neem het
   gezaghebbende totaal per reden over uit het overzichtsblad en geef het mee met `--totaal`.
6. **Importeer** met `node scripts/seo/gsc-import.mjs <export.csv> --reden "<de letterlijke
   redenregel>" --totaal <n>` en classificeer met `node scripts/seo/historische-urls.mjs`.
7. **Inspecteer 3 tot 5 gemeentepagina's** met URL-inspectie, inclusief "Live testen". Dat is de
   enige manier om te zien wat Google feitelijk rendert.
8. **Gebruik de Indexing API niet** voor commerciële of regionale pagina's.

**Zeven van de acht exclusiecategorieën tellen niet op.** 7.728 + 31 + 6 + 3 + 1 = 7.769 van de
~15.300. Er is dus ongeveer 7.530 URL's aan niet-zichtbare categorieën, vermoedelijk "Gecrawld —
momenteel niet geïndexeerd" en "Gevonden — momenteel niet geïndexeerd". Welke het zijn is
`NOT_AVAILABLE`; vraag die twee redenen apart op, want ze betekenen iets heel verschillends.

**Verwacht geen snelle daling van de 404-telling.** Google blijft bekende URL's maandenlang
hercontroleren. Een 404 of 410 is het juiste antwoord, maar het verdwijnt niet uit het rapport
omdat wij iets hebben uitgerold.

---

## 7 · Reviewmanifest — destructief, wacht op expliciete goedkeuring

Niets uit deze lijst zit in deze release.

| # | ingreep | waarom het wacht |
|---|---|---|
| 1 | **Een eigen `Caddyfile` met echte 301's** voor de 16 legacy-URL's, de `.html`-tweelingen en de afsluitende streep | Technisch mogelijk en gemeten: railpack leest een `Caddyfile` in de wortel rechtstreeks van schijf en injecteert hem als plan-asset, dus zelfs een Caddyfile in de excludelijst bereikt Caddy. Maar hij **vervangt de hele gegenereerde template**: `try_files`, `handle_errors` naar `404.html`, `respond /health 200`, en de CSP plus vier beveiligingskoppen die op alle 430 pagina's worden geserveerd en nergens in de repo staan. Daarbovenop: `caddy fmt` in de bouwstap geeft **exit 0 op een kapotte Caddyfile** terwijl `healthcheckPath` null is, een onbekende `{{.X}}` rendert stil naar `<no value>`, `caddy validate` keurt zelfs een 301-lus goed, en `qa-http.mjs:80` gaat rood op alle 16 stubs. Voorwaarden vóór goedkeuring: (i) `healthcheckPath = /health` gezet en gezond bevestigd, (ii) gemeten dat railpack een repo-Caddyfile op een échte builder honoreert — dat is in geen enkele onderzoekslijn gemeten en het is de ongemeten premisse onder dit hele voorstel, (iii) `qa-http.mjs` en twee docs in dezelfde wijziging, (iv) toetsen op caddy **2.11.4**, (v) `grep -c '{{' Caddyfile` == 0 op het gerenderde asset, (vi) `/index.html → /` expliciet, (vii) de 16 stubtweelingen uitgezonderd. |
| 2 | **De `noindex` uit de 16 stubs halen** | Breekt `qa-http.mjs:83` voor alle 16 en maakt 4 titelstrings over 8 bestanden indexeerbaar tegen de 7 doelen. |
| 3 | **De 16 stubbestanden verwijderen** | `audit.mjs:109` eist een bestand bij elke NOINDEX-route; vraagt `routes.json` én `herstel-bestaand.mjs` mee. |
| 4 | **Titel en h1 van 349 regiopagina's differentiëren** op bewijs dat de pagina al draagt | Geen URL verandert en het is omkeerbaar, maar het is een zichtbare inhoudswijziging op 349 live pagina's → redactionele goedkeuring, en vóór landing doorrekenen tegen poort 11. |
| 5 | **Navigatie voor `/energieadvies` en `/verduurzaming-bedrijfspanden`** | Gemeten: de enige 2 van de 10 `oplossing`-routes die in géén van de vier navigatieoppervlakken staan. Commit `6b47dc9` maakte alle vier nieuwe oplossingpagina's én is de laatste commit die `chrome.js` aanraakte — hij nam `/laadplein` en `/netcongestie` op en sloeg deze twee over, zonder reden. Repareren is per definitie een sitewide blok, dus een navigatiebesluit. |
| 6 | **10.442 zusterlinks verwijderen** (52% van alle `<main>`-links, 337 pagina's) | Gesimuleerd gunstig, maar niet nagemeten tegen poort 8 en de linkgraaf ná generatie. |
| 7 | **Verwant-blok op de vier bevroren masters** | Grootste gemeten hefboom (1.559 inkomende links die nergens heen gaan), maar expliciet tegen `herstel-bestaand.mjs` en `audit.mjs:346-352`. |
| 8 | ~~**Migratie 0034 op PRODUCTIE toepassen**~~ — **VERVALLEN, en afgesloten met een poort** | Dit punt rustte op een onjuiste aanname. `vibe-intel-api` draagt een `preDeployCommand` die bij elke deploy `npm run migreer` binnen het privénet draait, dus de migratie is bij `8cbf6b5` al toegepast. Zie de correctie in §5.4. Het patroon is daarna structureel afgesloten: `intelligence/ops/migratiepoort.mjs` print vóór elke merge wat er op productie wordt weggegooid en faalt op een destructieve statement zonder `-- DESTRUCTIEF: <reden>`. Draait in CI (job `beveiliging`) en in `ci-lokaal.sh`. Gemeten: **0034 is de enige migratie in de hele historie die werkelijk een `drop column` uitvoert** — de veertien andere treffers staan in `TERUGDRAAIEN:`-commentaar en tellen terecht niet mee. |
| 9 | **`Cache-Control` op de subresources** | Googlebot haalt per render acht gedeelde bestanden opnieuw op; 2.082 KiB assets tegen 341 KiB documentbytes (6,1:1), de woff2 alleen 850 KiB (41%). Maar: ETag staat op 430/430 en hervalidatie werkt, en Googlebot stuurde **0** conditionele verzoeken — hij negeerde signalen die hij al had. De winst is dus een hypothese. Alle acht namen zijn ongehasht, en een lange `max-age` op `/_consent.js` is een nalevingsrisico. `railway cdn` niet blind omzetten: `available: true, enabled: false`, en `htmlLastPurgedEpoch` wijst erop dat hij ook HTML kan cachen. |
| 10 | **De 107 onverwezen bestanden (51,75 MiB)** | Uitsluiten van de deploy maakt die paden 404; eerst de Railway-toegangslogs. Uit de repo verwijderen breekt 27 social cards en de maak-webp-masters. |

### Afgewezen, met reden

- **349 gemeentepagina's consolideren naar provincieniveau.** Vernietigt 337 live URL's en breekt
  poort 7. Drie onafhankelijke metingen weerleggen de premisse dat het bijna-duplicaten zijn:
  hoogste jaccard 0,5304 bij drempel 0,60 met nul overtredingen, en de 4.248 familieroutes staan
  juist om deze reden al op PENDING.
- **Nulregels opnemen in de bedrijfstakopsomming.** Gemeten contraproductief voor poort 11.
- **Een uit de inhoud afgeleide mtime, en een inhoudsgebonden ETag.** De eerste vereist een
  buildCommand op een service zonder bouwfase én het ontsluiten van `data/` en `scripts/` in de
  bouwcontext — precies het lek dat `publiek-artefact.mjs` bestaat om te stoppen. De tweede ruilt
  een juiste header (`Last-Modified` is waarheidsgetrouw) voor een onjuiste.

---

## 8 · Buiten de SEO-scope, maar gemeten en te belangrijk om te verzwijgen

**De Meta Pixel plaatst `_fbp` zonder toestemming, en óók na een expliciete weigering.** Gemeten:
na een klik op "Alleen noodzakelijk" (`vibe_consent_v1 = {analytics:false, marketing:false}`, gtag
consent alles denied) staat `_fbp` er nog; na cookies wissen en herladen mét weigering wordt
`_fbp` opnieuw gezet met 90 dagen geldigheid en worden `fbevents.js` en `signals/config` opnieuw
opgehaald. Met JavaScript uit vuurt de `<noscript>`-pixel aantoonbaar. **Dat weerspreekt
`cookiebeleid.html:107` letterlijk.** Het marketing-kanaal bestaat volledig in `_consent.js` maar
heeft nul consumenten.

**De GTM-container laadt onvoorwaardelijk vóór toestemming.** Gemeten 465.965 bytes onverpakt
(~129–155 KiB op de draad), aanwezig op 431 van 447 bestanden, en op een inhoudspagina 68–72% van
het paginagewicht. `_clarity.js` is wél poortgewacht — gemeten nul verzoeken bij weigering — maar
GTM zelf niet.

Dit is een nalevingsdefect, geen SEO-defect, en het valt buiten de opdracht ("do not rewrite
unrelated systems"). Het staat hier omdat het tijdens de audit is gemeten en omdat de reparatie
klein is: het pixelblok achter `vibeConsent.on('marketing', …)` en de `<noscript>`-pixel eruit.
**Het is niet aangeraakt in deze release.**

---

## 9 · Wat niet is gemeten, en waarom

0. **Het grootboek dat CI vond, en wij niet.** De eerste CI-run faalde op één stap:
   `SITEKENNIS FAIL — gecommit 437d0608…, werkelijk 3d4ec1d0…`. `intelligence/data/sitekennis.json`
   draagt een hash over de websitebestanden, en de inhoudscorrecties uit §5.3 maakten die ongeldig.
   Lokaal was dat niet te zien omdat de stap `npm run poort` tot deze release in
   `ci-lokaal.sh` ontbrak — precies het gat uit §5.1. De poort werkte dus zoals bedoeld, en het
   gat dat hem lokaal onzichtbaar maakte is in dezelfde release gedicht.
1. **Search Console: alles.** Geen credentials, geen API-client, geen export. Daarmee: de 7.728
   404-URL's, welke 35 geïndexeerd zijn, het propertytype, de 7.530 onverklaarde uitsluitingen, en
   metrieken 3, 4, 5, 7, 8, 9 en 10 van het monitoringrapport. Alle zeven schermbeeldcijfers uit de
   opdracht zijn `UNVERIFIED`.
2. **Of railpack een repo-`Caddyfile` op een échte builder honoreert.** Gemeten in de
   railpack-broncode en met een lokaal gebouwde CLI, niet op Railway. Dit is de ongemeten premisse
   onder manifestpunt 1.
3. **Railway's promotiegedrag bij `healthcheckPath = null`.** Niemand heeft een falende deploy
   uitgelokt, dus "de site kan plat" is `INFERRED`.
4. **Backlinks en externe inkomende links: nul meting.** Geen geautoriseerde bron. Elk
   linkwaarde-argument in dit document rust uitsluitend op de interne graaf.
5. **Verkeer en conversie per pagina: nul meting.** "Commercieel belangrijk" is de lijst uit de
   opdracht, geen meting.
6. **Googlebot buiten één venster.** Railway bewaart `httpLogs` alleen voor de actieve deployment;
   queries op acht eerdere deployment-ID's gaven 0 regels. De GSC-crawlstatistieken zijn de enige
   gezaghebbende bron.
7. **Rendering van 400 van de 430 pagina's.** 30 zijn echt gerenderd; GTM- en Clarity-uitvoering
   waren in de meetomgeving geblackholet.
8. **De exacte vorm van een GSC-CSV-export.** Alle kolomnamen en redenstrings zijn `INFERRED`.
   Daarom weigert de importer bij een onbekende kopregel in plaats van te raden.
9. **Het vrijgavepad PENDING → INDEX voor de 4.254 wachtende routes.** Niet beoordeeld in deze
   release, en het is de grootste toekomstige bron van sjabloonrisico.
10. **`aanvragen.vibeenergy.nl`.** Andere host, niet uit deze repo geserveerd.
