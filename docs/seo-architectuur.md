# Vibe Energy — SEO/GEO-fundament

Hoe het systeem in elkaar zit, waarom het zo is gebouwd, en hoe je het draait.
Vastgesteld 10 oktober 2026. Bijgewerkt 12 oktober 2026 met Release 3.1.

Op 13 oktober 2026 zijn in dit document zeven gemeten onwaarheden gecorrigeerd: de
poortentelling, het overlapbereik, de ontbrekende metrieknaam op twee plaatsen, de twee
paartellingen die verschillende populaties vergeleken, de caddyversie, de telling van de bestaande
pagina's en de staat van het nieuwskanaal. Daarbij is één waarschuwing toegevoegd over de
providermetadata van Railway. Elke correctie staat bij het onderwerp zelf, met wat er stond en
waarom dat onjuist was — niet in een losse errata-lijst, want die wordt niet gelezen door wie de
regel hergebruikt.

## Release 3.1 in het kort

Van **96 naar 430 geïndexeerde URL's**: 326 gemeentepagina's en 8 provinciepagina's
vrijgegeven die Release 1 bewust vasthield.

Release 1 hield ze tegen met een gemeten argument, niet met een voorgevoel: met alleen een
vestigingstotaal, een terreinenlijst en een netbeheerder lag de **jaccard over vijfwoordreeksen**
tussen de elf gemeentepagina's op **0,49 tot 0,57, mediaan 0,53**, tegen een drempel van 0,60.
Er was te weinig bewijs om 338 pagina's van te vullen, en de rest zou sjabloon zijn.

Twee correcties op hoe dat getal eerder in deze repository stond, beide nagemeten op de
Release-1-commit `a2fbad7` met het algoritme van poort 11 (55 paren, de elf gemeentepagina's):

- Hier stond **"55 tot 57 procent"**. Dat is niet het bereik maar het **bovenste kwartiel**
  (0,550 tot 0,573, 14 van de 55 paren). Het bereik begint bij 0,489. Wie het kwartiel voor het
  bereik leest, denkt dat de ONDERgrens 0,55 was en dus dat de pagina's dichter op de drempel
  zaten dan ze deden.
- De **metrieknaam** ontbrak, en poort 11 meet er twee. Naast de jaccard rekent hij de
  **dekking**: gedeelde reeksen als aandeel van de kleinste pagina, met een eigen drempel van
  0,85 (`audit.mjs` regel 577-578). Over diezelfde 55 paren geeft die metriek **68 tot 74
  procent**. Een los percentage tussen 49 en 74 is zonder metrieknaam dus niet thuis te brengen.

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

Gemeten na die drie ingrepen, zoals poort 11 het zelf rapporteert: **92.235 paren** over alle 430
INDEX-routes, hoogste jaccard **0,522**, nul paren boven de drempel, marge **0,078**.

De vergelijking met Release 1 hoort in **één populatie** te staan. Eerder stond hier "marge 0,027
over 105 paren" naast die 92.235, en dat zijn verschillende dingen: 105 is C(15,2) over de 15
regionale pagina's van Release 1 (11 gemeenten plus 4 provincies), 92.235 is C(430,2) over alle
INDEX-routes. Zo lijkt het aantal paren 878 keer te zijn gegroeid terwijl de populatie wisselde.
De eerlijke vergelijking staat op de **gemeentepagina's**, want daar ging het argument over:

| | gemeentepagina's | paren | hoogste jaccard | marge tot 0,60 |
|---|---:|---:|---:|---:|
| Release 1 (`a2fbad7`) | 11 | 55 | 0,573 | 0,027 |
| nu (`edc10d2`) | 337 | 56.616 | 0,522 | 0,078 |

Bijna drie keer zoveel marge (×2,9) bij ruim dertig keer zoveel gemeentepagina's (×30,6).

Dat die tabel mag staan naast de 92.235 van poort 11 is zelf gemeten: het hoogst scorende paar is
in alle drie de populaties hetzelfde gemeentepaar — `regios/noord-brabant/eersel` met
`regios/noord-brabant/steenbergen`, jaccard 0,5217. Het maximum verschuift dus niet met de
populatiekeuze, alleen de noemer. Voor de drie populaties nu: 430 pagina's → 92.235 paren,
349 regionale pagina's → 60.726 paren, 337 gemeentepagina's → 56.616 paren.

**Wat NIET is vrijgegeven, en waarom:**

| | aantal | reden |
|---|---:|---|
| gemeente × familie | 4.104 | 2.394 zijn families die niet gemeentelijk zinvol zijn (een EMS is software, advies begint op afstand); 1.694 missen een lokaal project dat die familie aantoont; 16 hebben toereikend bewijs maar delen 84–88% van hun vijfwoordreeksen met hun zusterpagina's op de dekkingsmetriek (jaccard 0,71–0,77) |
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
                       herstel-bestaand ──> de 51 bestaande bestanden
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
`try_files {path} {path}.html {path}/index.html`. Met de echte template nagebouwd en gemeten:
`/regios/gelderland/arnhem` serveert `regios/gelderland/arnhem.html`, en een map met dezelfde naam
als een `.html`-bestand overschaduwt dat bestand **niet**. `/regios/` geeft 404.
Daarom: geneste bestanden, extensieloze URL's, nooit een afsluitende schuine streep, en op elke
gegenereerde pagina root-relatieve paden.

**Natoetsen hoort op de versie die productie pint: caddy 2.11.4.** Hier stond 2.11.7, en dat is
niet cosmetisch. Uit de bouwlogs van twee deployments: `Railpack 0.40.1`,
`railpack-frontend:v0.40.1`, `mise install-into caddy@2.11.4`. De gegenereerde template verschilt
tussen die twee versies precies op een plek die een poort kan verbergen: 2.11.4 laat de eerste
`hide`-regel vallen en geeft `[".env*"]`, waar 2.11.7 `[".git",".env*"]` geeft. Een nameting op
2.11.7 maakt dat defect dus ONZICHTBAAR. Een poort die je op een andere versie draait dan
productie, toetst productie niet.

**En de metadata van Railway is hier geen bron — de bouwlog is dat.** Gemeten op dezelfde
deployment: de deployment-metadata zegt `providers = "node"` en `detectedProviders = ["node"]`,
terwijl de bouwlog van diezelfde deployment `Using provider Staticfile from config` afdrukt en als
enige pakket caddy 2.11.4 oplost — geen node, geen npm-install, geen bundelstap. De verklaring zit
in railpack zelf: de node-detector ziet `package.json` nog steeds staan, omdat `core/app/app.go`
die bestandscontrole met `os.Stat` doet ZONDER de excludematcher, en de `provider`-sleutel in
`railpack.json` overruleert de detectie daarna. Wie uit dat metadataveld concludeert dat hier een
node-build loopt, gaat op zoek naar een buildstap die niet bestaat en trekt verkeerde conclusies
over wat een push naar `main` doet.

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

`scripts/seo/audit.mjs` draait **zestien** poorten en geeft per poort PASS/FAIL met een getal. Eén
exitcode zonder tabel zegt te weinig om op te releasen.

1 routeregister en pariteit · 2 geo-integriteit · 3 lokaal bewijs · 4 metadata · 5 canonical ·
6 structured data · 7 interne links · 8 weespagina's · 9 sitemappariteit · 10 claims ·
11 duplicaat-inhoud · 12 kannibalisatie · 13 conversie · 14 mobiel · 15 projectverwijzingen ·
16 nieuwskanaal

Hier stond "vijftien" met een opsomming van vijftien. De zestiende poort (nieuwskanaal) kwam er in
Release 2.1 bij; de telling is te toetsen met `grep -c "^poort(" scripts/seo/audit.mjs`, die geeft
**16**. Een telling die niet meegroeit met de code is gevaarlijker dan geen telling: de verderop
genoemde "zestien groene poorten" van de vijandige QA sprak hem al tegen, en wie dan één van de
twee gelooft, gelooft de verkeerde.

**Poort 11 heeft in deze release een echt defect gevonden in het eigen ontwerp.** De routes
`/regios/<prov>/<gem>/<familie>` deelden binnen één gemeente **84 tot 88 procent** van hun
vijfwoordreeksen op de **dekkingsmetriek**, bij een **jaccard van 0,71 tot 0,77** — dus ruim boven
beide drempels (0,85 dekking, 0,60 jaccard). Beide getallen horen erbij, want zonder metrieknaam
staat 84% naast 0,77 zonder dat te zien is dat het dezelfde meting is. De oorzaak: het lokale
bewijs bestaat per gemeente en niet per combinatie van gemeente en familie. Die 28 routes zijn
daarop teruggezet naar PENDING in plaats van de drempel te verlagen. De volledige meting, inclusief
het provincieniveau (78 tot 81 procent dekking, jaccard 0,61 tot 0,66), staat in
`data/seo/oplossingen.json`, sleutel `familieroutes_publiceren`.

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

## Release 2 — het nieuwskanaal

De News & Market Intelligence Engine is **gebouwd en staat leeg**. Hier stond "niet gebouwd", en
dat kon niet meer waar zijn zodra poort 16 bestond: een poort op een onderdeel dat niet bestaat,
heeft niets om op te toetsen.

Gemeten op deze commit:

| onderdeel | waar | meting |
|---|---|---|
| poort | `scripts/seo/audit.mjs` | poort 16 "Nieuwskanaal", verplicht |
| generator | `scripts/seo/genereer-nieuws.mjs` | aanwezig |
| toestandsmachine | `scripts/seo/bouw-routes.mjs` | `weigerNieuws()` |
| QA | `node scripts/seo/qa-nieuws.mjs` | 47 geslaagd, 0 mislukt, exitcode 0 |
| contract | `data/seo/nieuws-architectuur.json` | `_status` = geïmplementeerd in Release 2.1 |

Wat er NIET is, is één artikel. Gemeten in `data/seo/routes.json`: **nul** routes met
`subsoort: "nieuws"`, en de hub `nieuws` staat op **PENDING**. Dat is de bedoelde uitkomst en geen
achterstand: een artikel komt alleen op INDEX met `redactionele_staat: "GOEDGEKEURD"`, en die staat
zet een mens. Het padsegment `/nieuws` blijft gereserveerd zodat geen latere pagina die slug kan
claimen, en poort 16 blokkeert zowel een artikel zonder goedkeuring als een hub op INDEX zonder
artikel.
