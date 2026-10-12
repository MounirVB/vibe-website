# Vibe Energy — SEO/GEO-fundament

Hoe het systeem in elkaar zit, waarom het zo is gebouwd, en hoe je het draait.
Vastgesteld 10 oktober 2026. Bijgewerkt 12 oktober 2026 met Release 3.1.

## Release 3.1 in het kort

Van **96 naar 430 geïndexeerde URL's**: 326 gemeentepagina's en 8 provinciepagina's
vrijgegeven die Release 1 bewust vasthield.

Release 1 hield ze tegen met een gemeten argument, niet met een voorgevoel: met alleen een
vestigingstotaal, een terreinenlijst en een netbeheerder deelden de elf gemeentepagina's
**55 tot 57 procent** van hun vijfwoordreeksen, tegen een drempel van 60. Er was te weinig
bewijs om 338 pagina's van te vullen, en de rest zou sjabloon zijn.

Release 3.1 lost dat op met bewijs, niet met een lagere drempel. Drie ingrepen:

1. **Een derde bewijsveld per gemeente.** CBS 81575NED levert het aantal vestigingen per
   bedrijfstak (21 SBI-secties) per gemeente. Daaruit volgt een **locatiequotient**: het
   aandeel van een bedrijfstak hier, gedeeld door het landelijke aandeel. Dat verschilt echt
   per gemeente en het verandert wat de pagina adviseert.
2. **De landelijke uitleg van de pagina af.** De netcongestie-uitleg van ~150 woorden stond
   woordelijk gelijk op elke regionale pagina. Dat is landelijke kennis en die heeft al een
   eigen pagina. Gemeentepagina's verwijzen er nu naar; provinciepagina's houden de lange
   variant, want daar zijn er twaalf van en geen 338.
3. **De wijzigingsdatum uit de inhoud.** Zie "Determinisme" hieronder.

Gemeten na die drie ingrepen, over **92.235 paren**: hoogste jaccard **0,522**, nul paren boven
de drempel, marge **0,078**. Ter vergelijking: vóór deze release was de marge 0,027 over 105
paren. Drie keer zoveel marge bij dertig keer zoveel pagina's.

**Wat NIET is vrijgegeven, en waarom:**

| | aantal | reden |
|---|---:|---|
| gemeente × familie | 4.104 | 2.394 zijn families die niet gemeentelijk zinvol zijn (een EMS is software, advies begint op afstand); 1.694 missen een lokaal project dat die familie aantoont; 16 hebben toereikend bewijs maar delen 84–88% van hun tekst met hun zusterpagina's |
| provincie × familie | 144 | zelfde redenen, 12 met toereikend bewijs en te veel overlap |
| gemeenten zonder bedrijventerrein | 4 | Rozendaal, Bloemendaal, Laren, Voorne aan Zee. Vestigingen en bedrijfstakprofiel komen uit **dezelfde CBS-tabel**: twee doorsnedes van één bron, geen twee onafhankelijke feiten |
| Schiermonnikoog | 1 | geen enkele bedrijfstak haalt 50 vestigingen, dus geen publiceerbaar locatiequotient |

De 4.104 en 144 familieroutes blijven in het register staan met hun reden. Vrijgeven mag pas
met **familiespecifiek** lokaal bewijs dat de zusterpagina's niet delen. Verlaag de drempel niet.

## Het idee in één alinea

Er is één **routeregister** met elke denkbare route, en elke route heeft een **staat** met een
**reden**. `PENDING` betekent: geen bestand, geen sitemapregel, geen canonical, geen interne link —
de route bestaat alleen op papier. `INDEX` betekent dat alle poorten zijn gehaald. Een route
promoveert nooit vanzelf, ook niet als het bewijs toereikend is: daar is een redactioneel besluit
voor nodig. Daarmee is "4.398 pagina's" een architectonisch vermogen geworden en geen
publicatiedoel.

## De keten

```
haal-geo ───────────┐
haal-bewijs ────────┤
haal-bedrijfstakken ┼─> data/geo + data/bewijs
haal-netbeheerder ──┘           │
                                v
                        vrijgeven-r31 ──> data/seo/publicatiebesluit.json
                                │
         data/inhoud ──> bouw-routes ──> data/seo/routes.json
                                │
                                v
                            genereer ──> HTML + data/seo/vingerafdrukken.json
                                │
                                v
                       herstel-bestaand ──> de 34 bestaande pagina's
                                │
                                v
                             sitemap ──> sitemapindex + 2 deelbestanden + robots.txt
                                │
                                v
                              audit ──> 16 poorten, PASS/FAIL per poort
```

Alles in één keer: `node scripts/seo/bouw.mjs` (of `--offline` om de drie ophaalstappen over te
slaan). De keten stopt bij de eerste fout en meldt welke stappen NIET zijn gedraaid.

Daarna, met een lokale Caddy die het echte hostgedrag nabootst:

```
node scripts/seo/qa-http.mjs      # statuscodes, canonicals, stubs, PENDING = 404
node scripts/seo/qa-browser.mjs   # overflow, chrome-injectie, consolefouten, 1440 en 390 px
node scripts/seo/qa-bronnen.mjs   # elke bron-URL onder een claim bestaat nog
```

## De vier beslissingen die alles sturen

### 1 · De host is `www`, niet de apex
Gemeten: `vibeenergy.nl` staat op nginx/Plesk en stuurt met 301 door naar `www.vibeenergy.nl`,
waar Railway de site serveert. Vóór deze release stonden alle 50 canonicals op de apex en wezen dus
naar een doorverwijzing. Alles staat nu op `www`. Zie `scripts/seo/lib/paden.mjs`.

### 2 · Nesten mag, een afsluitende schuine streep niet
De railpack-provider `staticfile` zet Caddy neer met
`try_files {path} {path}.html {path}/index.html`. Lokaal nagebouwd met caddy 2.11.7 en de echte
template gemeten: `/regios/gelderland/arnhem` serveert `regios/gelderland/arnhem.html`, en een map
met dezelfde naam als een `.html`-bestand overschaduwt dat bestand **niet**. `/regios/` geeft 404.
Daarom: geneste bestanden, extensieloze URL's, nooit een afsluitende schuine streep, en op elke
gegenereerde pagina root-relatieve paden.

### 3 · De regionale boom hangt onder `/regios`, niet onder de oplossing
De opdracht stelde `/zakelijke-batterij/gelderland` voor. Dat kan hier niet:
`/systeem-energieopslag` bezit die zoekintentie al en staat geïndexeerd. Een tweede nationale
wortel zou hem kannibaliseren. Onder `/regios` heeft elke regionale pagina precies één ouder en
botst niets met de bestaande slugs.

### 4 · Bewijs is noodzakelijk, niet voldoende
Het gereedheidsmodel weegt hoe ONDERSCHEIDEND een feit is:

| bewijs | gewicht | waarom |
|---|---:|---|
| gerealiseerd project in deze gemeente | 4 | geldt voor 11 gemeenten |
| bedrijventerreinen met naam en oppervlak | 1 | verschilt echt per gemeente |
| aantal vestigingen (CBS) | 1 | verschilt echt per gemeente |
| bedrijfstakprofiel + locatiequotient (CBS) | — | verschilt echt per gemeente, maar telt **niet apart** mee: zie hieronder |
| netbeheerder | **0** | ~130 gemeenten delen er één |

Het bedrijfstakprofiel is in Release 3.1 toegevoegd en is de reden dat 326 gemeenten konden worden
vrijgegeven. Het telt bewust **niet** als een eigen punt: het komt uit dezelfde CBS-tabel als het
vestigingstotaal. Twee doorsnedes van één bron zijn geen twee onafhankelijke feiten. Daarom blijft
een bedrijventerrein uit IBIS vereist — dat is de tweede, onafhankelijke bron — en blijven de vier
gemeenten zonder terrein op PENDING staan.

De netbeheerder weegt nul. Hij mag op de pagina staan als context, maar hij maakt een pagina niet
uniek. Dat is precies het verschil dat de opdracht eist tussen echte lokale waarde en cosmetische
tekstvariatie.

## Waar de data vandaan komt

| laag | bron | licentie | sleutel |
|---|---|---|---|
| gemeenten en provincies | PDOK Locatieserver (BZK Bestuurlijke Grenzen) | open, bronvermelding | CBS-gemeentecode |
| vestigingen per gemeente | CBS OData 81575NED | CC BY 4.0 | `RegioS` = GM+code |
| bedrijventerreinen | IBIS via warmteatlas.nl (RVO) | CC0 1.0 | `GEM_CODES` |
| netbeheerders | Stichting Mijnaansluiting.nl, WFS | Publiek domein (PDM 1.0) | geometrie |
| gemeentegrenzen | PDOK CBS Gebiedsindelingen 2026 | — | `statcode` |
| eigen projecten | `scripts/projecten.json` | eigen | slug |

### Wat BEWUST niet is overgenomen
De **Capaciteitskaart** van Netbeheer Nederland levert congestiedata per PC6 inclusief een
gemeentekolom. Die data is **niet** in de repo opgenomen. Drie gemeten redenen:

1. **Geen licentie.** Alleen een disclaimer; op `info/algemene-info`, `info/definities` en
   `info/faq` leverde zoeken op licentie, hergebruik, auteursrecht en Creative Commons nul
   treffers. Er honderden publieke pagina's op bouwen is een juridisch risico.
2. **Een gemeente heeft geen congestiestatus.** 72% van de voedingsgebieden raakt meer dan één
   gemeente en 92% van de gemeenten wordt door meer dan één voedingsgebied geraakt. Voor 248 van
   de 342 gemeenten verschilt de kleurcode binnen de eigen grens.
3. **De gemeentekolom is ongedocumenteerd.** De eigen brondocumentatie (versie 2.0, 2024-11-20)
   beschrijft hem niet.

In plaats daarvan verwijst elke regionale pagina naar de Capaciteitskaart zelf, waar de bezoeker
zijn eigen postcode opzoekt. Dat is juridisch veilig, actueler en inhoudelijk correcter.

## De poorten

`scripts/seo/audit.mjs` draait vijftien poorten en geeft per poort PASS/FAIL met een getal. Eén
exitcode zonder tabel zegt te weinig om op te releasen.

1 routeregister en pariteit · 2 geo-integriteit · 3 lokaal bewijs · 4 metadata · 5 canonical ·
6 structured data · 7 interne links · 8 weespagina's · 9 sitemappariteit · 10 claims ·
11 duplicaat-inhoud · 12 kannibalisatie · 13 conversie · 14 mobiel · 15 projectverwijzingen

**Poort 11 heeft in deze release een echt defect gevonden in het eigen ontwerp.** De routes
`/regios/<prov>/<gem>/<familie>` deelden 84 tot 88 procent van hun vijfwoordreeksen met hun
zusterpagina's, omdat het lokale bewijs per gemeente bestaat en niet per combinatie van gemeente
en familie. Die 28 routes zijn daarop teruggezet naar PENDING in plaats van de drempel te
verlagen. De reden staat in `data/seo/oplossingen.json`, sleutel `familieroutes_publiceren`.

## Inhoud toevoegen

Eén JSON per pagina onder `data/inhoud/<type>/<slug>.json`. Het schema en de redactieregels staan
in `data/inhoud/SCHEMA.md`; `data/inhoud/oplossing/netcongestie.json` en
`data/inhoud/kennis/kw-versus-kwh.json` zijn de maatstaf. Daarna de keten draaien.

Elk cijfer dat een uitkomst, bedrag, percentage, marktomvang of status beweert, hoort met bron-URL
en brondatum in `claims`. `docs/vibe-claims-register-v2.md` is bindend en poort 10 zoekt er
letterlijk op.

## Een regio vrijgeven

Een gemeente promoveert nooit vanzelf. Vrijgeven is een regel in
`data/seo/publicatiebesluit.json` onder `vrijgegeven`, met de reden waarom juist die gemeente een
eigen pagina verdient. Daarna de keten draaien; de inhouds- en uniciteitspoorten beslissen alsnog.

Sinds Release 3.1 schrijft `scripts/seo/vrijgeven-r31.mjs` dat bestand, met per gemeente een reden
die háár eigen cijfers noemt. Dat is geen vlag maar een besluit: 327 keer dezelfde zin zou geen
verantwoording zijn. De generator kiest zijn kandidaten uit het **bewijs**, niet uit de huidige
staat van `routes.json` — een eerdere versie las zijn eigen uitvoer en schreef bij de tweede run
een leeg besluit, waarmee alle 326 pagina's weer verdwenen.

Een provinciehub komt op INDEX bij een eigen project **of** bij minstens één vrijgegeven gemeente
eronder. Die tweede grond is niet redactioneel maar dwingend: elke gemeentepagina draagt de kruimel
`Regio's > <Provincie> > <Gemeente>`, en een kruimel naar een PENDING-route is een interne link
naar een pagina die niet bestaat. Poort 7 valt daar terecht over.

## Determinisme — de bouw hangt niet aan de klok

Tot Release 3.1 zette `bouw-routes.mjs` `_gegenereerd` op `new Date()`, en die waarde ging als
`gewijzigd` naar elke pagina en belandde in `dateModified` en `lastmod`. Een ketenrun een dag
later gaf dus de hele site een nieuwe wijzigingsdatum. Bij 62 pagina's was dat al fout; bij 430
is het een signaal aan Google dat alles elke dag verandert. De CI loste het op door de datum te
**pinnen** — groen door de klok vast te zetten, niet doordat de bouw reproduceerbaar was.

Nu bepaalt de inhoud de datum, op twee niveaus:

- **Per pagina**, via `scripts/seo/lib/vingerafdruk.mjs`. De generator rendert één keer met een
  plaatshouder op de datumplek, hasht die uitvoer, en vult de datum in die daaruit volgt. Alleen
  een pagina met een veranderde hash krijgt de bouwdatum. Het grootboek staat in
  `data/seo/vingerafdrukken.json` en **hoort gecommit te worden**.
- **Voor het register**, via een hash over de routeset (`_routeset`). Blijft die gelijk, dan
  blijft `_gegenereerd` staan.

De sitemap gebruikt hetzelfde grootboek, zodat `lastmod` en `dateModified` hetzelfde zeggen.

Gemeten: een ketenrun met alle datumvariabelen achttien maanden vooruit geeft **byte-identieke
uitvoer**. De CI toetst dat nu expliciet in plaats van het te omzeilen.

## De sitemap

`sitemap.xml` is sinds Release 3.1 een **sitemapindex** met twee deelbestanden:
`sitemap-nationaal.xml` (80 URL's) en `sitemap-regios.xml` (350 URL's).

Dat is geen technische noodzaak — 430 URL's passen ruim in één bestand; de protocolgrens is
50.000. De reden is **meetbaarheid**: Search Console rapporteert dekking per sitemap, en met twee
groepen zie je in één blik of de 334 nieuwe regiopagina's worden geïndexeerd of dat het de
bestaande 96 zijn. `MAX_PER_BESTAND` in `sitemap.mjs` laat een groep die ooit te groot wordt
vanzelf in genummerde delen uiteenvallen.

## De vijandige QA

`node scripts/seo/qa-vijandig.mjs` injecteert per scenario één echt defect in een kopie van de
werkboom en eist dat de juiste poort **faalt**. Een scenario dat groen blijft is daar een fout.
Tien scenario's: een PENDING-route die stiekem een bestand krijgt, een gemeente vrijgegeven zonder
bedrijventerrein, bewijs dat wel in het register maar niet op de pagina staat, een dubbele
canonical, een link naar PENDING, een verboden claim, een inhoudelijke kloon, een dubbele titel,
HTML-injectie via een externe bronnaam, en een intern bestand dat de publieke set in sluipt.

Zestien groene poorten zeggen niets zolang niemand heeft geprobeerd ze rood te krijgen.

## Release 2

De News & Market Intelligence Engine is **niet** gebouwd. Het contract staat in
`data/seo/nieuws-architectuur.json` en het padsegment `/nieuws` is in het register gereserveerd
zodat geen latere pagina die slug kan claimen.
