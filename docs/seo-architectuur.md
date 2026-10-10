# Vibe Energy — SEO/GEO-fundament

Hoe het systeem in elkaar zit, waarom het zo is gebouwd, en hoe je het draait.
Vastgesteld 10 oktober 2026.

## Het idee in één alinea

Er is één **routeregister** met elke denkbare route, en elke route heeft een **staat** met een
**reden**. `PENDING` betekent: geen bestand, geen sitemapregel, geen canonical, geen interne link —
de route bestaat alleen op papier. `INDEX` betekent dat alle poorten zijn gehaald. Een route
promoveert nooit vanzelf, ook niet als het bewijs toereikend is: daar is een redactioneel besluit
voor nodig. Daarmee is "4.398 pagina's" een architectonisch vermogen geworden en geen
publicatiedoel.

## De keten

```
haal-geo ─┐
haal-bewijs ─┼─> data/geo + data/bewijs
haal-netbeheerder ─┘           │
                                v
         data/inhoud ──> bouw-routes ──> data/seo/routes.json
                                │
                                v
                            genereer ──> HTML op schijf
                                │
                                v
                       herstel-bestaand ──> de 35 bestaande pagina's
                                │
                                v
                             sitemap ──> sitemap.xml + robots.txt
                                │
                                v
                              audit ──> 15 poorten, PASS/FAIL per poort
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
| netbeheerder | **0** | ~130 gemeenten delen er één |

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

Een gemeente zonder eigen project blijft PENDING, ook met toereikend bewijs. Vrijgeven is één
regel in `data/seo/publicatiebesluit.json` onder `vrijgegeven`, met de reden waarom juist die
gemeente een eigen pagina verdient. Daarna de keten draaien; de inhouds- en uniciteitspoorten
beslissen alsnog.

## Release 2

De News & Market Intelligence Engine is **niet** gebouwd. Het contract staat in
`data/seo/nieuws-architectuur.json` en het padsegment `/nieuws` is in het register gereserveerd
zodat geen latere pagina die slug kan claimen.
