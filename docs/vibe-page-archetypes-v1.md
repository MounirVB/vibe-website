# Vibe Energy — paginatype-architectuur v1

**Bron:** `/Users/mounirvanbinsbergen/projects/vibe-website`, commit `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1` ("feat: lock homepage master v1") = Homepage Master v1.
**Bewijsbestand:** `scratchpad/bewijs/archetypes.json` (12 archetypes, 46 inventarisregels, 14 beslispunten) — volledig gelezen en steekproefsgewijs tegen de bronbestanden gecontroleerd.
**Status van dit document:** architectuurbeschrijving **V1.0**. Er is in deze sessie geen HTML, CSS, asset of JS gewijzigd; er is uitsluitend onder `docs/` geschreven.

**Wat er in deze bijwerkronde is veranderd.** De reductie van twaalf archetypes naar **B1..B7 + S2** is niet langer een voorstel maar een genomen besluit (§4, DR-00 = DECIDED — V1.0). De besluiten C-01 t/m C-07 staan als vastgestelde uitgangspunten in §0.3, de canonieke sectortaxonomie in §0.4, de gemeten asset-situatie achter C-06 in §0.5. De paginatoewijzing in §1 draagt nu een bouwtypekolom naast de oorspronkelijke archetypekolom. De twaalf A-secties in §3 blijven staan als auditbewijs en dragen elk bovenaan hun B-toewijzing. Het DR-register in §5 is bijgewerkt: elk punt dat door C-01 t/m C-07 wordt beantwoord staat als DECIDED — V1.0, punten die alleen nog uitvoeringsafhankelijk zijn als DEFERRED TO PAGE MIGRATION met hun heropeningsvoorwaarde, en de rest blijft DECISION REQUIRED.

**Drie aangeleverde feiten reproduceren niet op deze commit** en zijn met de meting vervangen: het Sector-veld van `project-arnhem-60.html` bestaat wél (§6.5), het kruimelpad telt zes Woningportefeuilles en niet vijf (§6.6), en het dode brochurepad staat in een commentaarblok en niet in de runtime-default (§6.7). Zie ook §6.8 over het mega-menu.

---

## 0 · Meetbasis

Wat hieronder staat komt uit statische bestandsinhoud op bovenstaande commit. Elke uitspraak draagt een `bestand:regel`-verwijzing. Waar het bewijsbestand afwijkt van wat ik zelf heb gemeten, staat de meting in §6.

**NIET GEMETEN:** geen browser gedraaid, geen build uitgevoerd, geen screenshot gemaakt. Wat de pagina's werkelijk renderen is niet waargenomen — dat geldt in het bijzonder voor `contact.html`, dat zonder JavaScript niets toont (`contact.html:40`).

### 0.1 Vastgestelde feiten die dit document als gegeven neemt

| Feit | Meting in deze sessie |
|---|---|
| Hoofdbreekpunt `max-width:1199px` | 12 media queries over `home*.css` — bevestigd |
| Tabletlaag `min-width:768px and max-width:1199px` | 11 queries — bevestigd |
| Component-specifiek: 768–859 (hero proof-strip), 1000–1199 (footer), 1024–1199 (oplossingenraster) | elk 1 query — bevestigd |
| `hover:none` en `prefers-reduced-motion` | 1 resp. 2 queries — bevestigd |
| Merkblauw `#0073FE`, navy `#08203C` | `home.css:35`, `home.css:41` — bevestigd |
| Drie elevatieniveaus `--vibe-elev-1 / -2 / -mob` | `home.css:60-65` — bevestigd |
| `--vibe-*` tokens in `home.css` | **23 gemeten**, niet 24 — zie §6.1 |
| Geometrie in 8 van 9 sectiebestanden; alleen `home-project.css` zonder `clip-path` | bevestigd: hero 5, final 5, proof 3, footer 2, infra 2, control 1, process 1, solutions 1, project 0 |
| `home-project.css` gebruikt in plaats daarvan een navy gradient-scrim | `home-project.css:82`, `:247`, `:261` — bevestigd |
| 15 verschillende CTA-klassen, alleen `.vh-btn*` is een echt gedeeld primitief | bevestigd: 19 knopachtige `.vh-*`-klassen in `home*.css`, waarvan 4 menu-specifiek (`.vh-menuknop`, `.vh-menuknop-lbl`, `.vh-menuknop-lijn`, `.vh-mobielmenu-cta`) → 15 CTA-klassen |

**Dit moet in elke afgeleide documentatie blijven staan: er is GEEN gedeelde componentbibliotheek.** `home.css` levert de tokenlaag en drie knopklassen (`.vh-btn`, `.vh-btn-primair`, `.vh-btn-secundair`); elk van de negen secties zet daarna op zijn eigen wortelselector `container-type:inline-size`, een eigen `font-family`-regel en een eigen set aliastokens (`--sol-*`, `--pr-*`, `--pc-*`, `--ct-*`, `--pf-*`, `--if-*`, `--fi-*`, `--ft-*`) en herdefinieert eyebrow, kop, lead, knop en kaart met eigen maten. De twaalf overige CTA-klassen (`.vh-cta`, `.vh-sol-cta`, `.vh-pr-cta`, `.vh-pr-knop`, `.vh-ctrl-cta`, `.vh-proof-cta`, `.vh-proof-strip-cta`, `.vh-infra-cta`, `.vh-infra-cta2`, `.vh-final-cta`, `.vh-final-cta2`, `.vh-footer-nb-cta`) zijn sectie-eigen. Het systeem is visueel consistent maar structureel nog niet als bibliotheek geïmplementeerd. Elk archetype dat hieronder "HERGEBRUIK" zegt, vraagt dus eerst om een extractie — er valt op dit moment niets te importeren.

### 0.2 Gemeten bouwfamilies

De site kent nu **zeven** bouwfamilies, afgeleid uit de `<link rel="stylesheet">`-regels van de 43 pagina's:

| # | Bouwfamilie | Pagina's | Archetypes die erin vallen |
|---|---|---:|---|
| BF1 | `tokens.css` + `home.css` + 10× `home-*.css` (`index.html:56-67`) | 1 | A0 |
| BF2 | `subpage.css` + `tokens.css` | 14 | A1 (5), A2 (3), A3 (5), A4 (1) |
| BF3 | `frameiq-harmonize.css` + `tokens.css` | 4 | A2 (3), A7 (1) |
| BF4 | `project-case.css` + `tokens.css` | 11 | A5 |
| BF5 | alleen `tokens.css` + inline | 5 | A6, A7 (1), A9, A11 (2) |
| BF6 | `report.css` | 7 | A10 |
| BF7 | geen stylesheet-link; alles in een bundler-string | 1 | A8 |

1 + 14 + 4 + 11 + 5 + 7 + 1 = 43. De twaalf archetypes sneden dwars door deze zeven families heen — dat was de kern van het consolidatievraagstuk dat in §4 is beslecht met B1..B7 + S2.

### 0.3 Vastgestelde besluiten V1.0 die dit document als gegeven neemt

Dit zijn **genomen** besluiten, geen voorstellen. Ze staan nergens in dit document meer als DECISION REQUIRED. Waar een besluit een uitspraak in §2, §3 of §5 raakt, wint het besluit.

**C-01 · NAVIGATIEMODEL = A — DECIDED — V1.0.**
De platte Master-v1-header wordt de standaard; het legacy mega-menu uit `_header.js:22-48` verdwijnt. Desktop: platte header, logo links, primaire CTA rechts. Mobiel: de Master-v1-navigatie. `max-width:1199px` blijft de primaire responsive navigatiegrens (12 gemeten queries over `home*.css`, §0.1) tenzij implementatiebewijs later iets anders vereist.
*Randvoorwaarde die bij het besluit hoort:* proposities mogen niet uit de informatie-architectuur verdwijnen omdat ze geen top-level menu-item meer zijn. "Oplossingen" wordt een belangrijke navigatie-ingang; systemen en producten blijven bereikbaar via overzichtspagina's en interne navigatie; Energy Hubs (`energy-hubs.html`) en de systeemcategorieën (`_header.js:41-47`, vijf items) moeten logisch in de nieuwe IA landen. **Geen mega-menu terugbouwen** om legacy routes zichtbaar te houden.
*Motivering:* twee onverenigbare navigaties naast elkaar (`index.html:141-148` tegenover `_header.js:146-153`) blokkeerden élk archetype; één header maakt de bouwtypes pas bouwbaar.

**C-02 · VIBE.CONTROL / EMS = A — DECIDED — V1.0.**
VIBE.CONTROL is de commerciële productnaam; EMS blijft de functionele categorie en een belangrijke SEO-term. Toegestane schrijfwijzen naar context: "VIBE.CONTROL", "Energiemanagementsysteem (EMS)", "VIBE.CONTROL EMS". SEO op *EMS*, *energiemanagementsysteem*, *energie management systeem* en *slim energiemanagement* mag NIET verloren gaan. `systeem-ems.html` (`<title>` r.16 "EMS — slim energiemanagement", `<h1>` r.70) wordt bij migratie de VIBE.CONTROL-productpagina **met voldoende EMS-context**.
*Motivering:* één naam voor het product, één term voor de categorie — samenvoegen tot één label zou of de merknaam of het zoekvolume kosten.

**C-03 · EXECUTIVE GUIDES = B — DECIDED — V1.0.**
De zeven `report.css`-documenten zijn **gated assets / lead magnets**, geen publiek pagina-archetype en geen normale SEO-contentpagina's. Ze worden ontsloten via de leadflow, niet via navigatie, footer of interne knoppen; uit de publieke sitemap waar van toepassing (nu staan er drie in, `sitemap.xml:16`, `:118`, `:124` — gemeten). Delivery moet aantoonbaar werken. **Geen guide of brochure beloven wanneer het bestand niet bestaat.** De guide-*inhoud* zelf blijft behouden.
*Gevolg voor dit document:* S2 is daarom geen achtste publiek archetype maar een **gated documentsysteem** naast de zeven webtypes — zie §4.1 en §4.2.
*Motivering:* een A4-document zonder menu, footer of cookiebanner is als publieke landingspagina een doodlopende weg; als beloning achter een formulier is het precies wat het is.

**C-04 · STICKY MOBIELE CTA = A — DECIDED — V1.0.**
Geen sticky mobiele CTA in Design System V1.0. CTA's worden in de pagina geïntegreerd, zoals in Master v1. De legacy `.mcta` (`subpage.css:262-266`, zichtbaar onder 760px) verdwijnt bij migratie op **26 gemeten pagina's**: energy-hubs, de 5 industrie-pagina's, microgrids, oplossing-exploitatie/-laadplein/-netcongestie, de 11 project-pagina's, projecten en de 4 systeem-pagina's.
*Niet dogmatisch verboden:* mag later als afzonderlijke CRO-test terugkomen wanneer conversiedata dat ondersteunt, maar hoort niet bij V1.0.
**Leesinstructie voor §3:** elke vermelding van "sticky `.mcta`" in de A-secties hieronder beschrijft de **gemeten legacy-staat**, niet het V1.0-doelbeeld. Dat auditbewijs blijft staan; het besluit erover is C-04.

**C-05 · SECTOREN = nieuwe canonieke taxonomie — DECIDED — V1.0.** Volledig uitgewerkt in §0.4.

**C-06 · BROCHURE-/GUIDE-DELIVERY = A waar het asset bestaat, anders B — DECIDED — V1.0.**
Harde regel: **NO ASSET → NO DOWNLOAD PROMISE.** Routering gaat uiteindelijk naar een zakelijke centrale bestemming, niet naar een persoonlijk e-mailadres. Gemeten situatie in §0.5.

**C-07 · ONBEWEZEN CIJFERS = B tot A bewezen is — DECIDED — V1.0.**
"47 opgeleverde projecten", "12 MWp zon geïnstalleerd" en "98% gemiddelde uptime" (`projecten.html:173-175`) zijn **NIET VERIFIED** puur omdat ze gepubliceerd zijn. Gebruik voorlopig uitsluitend reproduceerbare gegevens, in een formulering die exact dekt wat de bron bewijst: **"11 projecten uitgelicht"** of **"11 gepubliceerde projectcases"** — níet "Vibe heeft slechts 11 projecten gerealiseerd". Worden later primaire bronnen aangeleverd, dan opnieuw beoordelen.
*Motivering:* `index.html:209-216` en `:251-255` hebben deze drie cijfers al onderzocht en verworpen; `over-ons.html:532` (`hidden`, motivering r.539) laat zien hoe het hoort.
**HARD RULE: PUBLICLY EXISTING ≠ VERIFIED.** De vijf statussen van de frozen claim policy staan in §4.3.

**LEADPOPUP-CLAIMS — UNVERIFIED onder dezelfde C-07-policy.**
`_leadpopup.js:116` toont in het linkerpaneel van de popup de regel `VIBE ENERGY / 7 waardestromen · 0 jr wachttijd / −22% netinkoop` (gemeten, exacte tekst). Voor geen van deze drie waarden staat een bron in deze repository. Bij de betreffende migratie: **VERIFIED maken met een primaire bron, herschrijven, of verwijderen.** **NU GEEN productiecode wijzigen.**

### 0.4 C-05 · Canonieke sectortaxonomie — DECIDED — V1.0

De site voert op dit moment **vijf verschillende sectorvocabulaires** naast elkaar. Alle vijf zijn in deze sessie geteld:

| # | Bron | Gemeten labels |
|---|---|---|
| 1 | Master v1 sectorkaarten | Vastgoed → `index.html:922`; Logistiek → r.927; Recreatie → r.932; Woningportefeuilles → r.937. **Master v1 linkt NIET naar `industrie-vve`** (gemeten: 4 `href="industrie-*"`-treffers in `index.html`) |
| 2 | Sectorpagina's (5) | `industrie-logistiek`, `-recreatie`, `-residentieel`, `-vastgoed`, `-vve` |
| 3 | `projecten.html` filterchips (5 inhoudelijk + "Alle") | Netcongestie & Energy Hubs (r.185) · Automotive (r.186) · Recreatie (r.187) · Woningportefeuilles (r.188, `data-f="Woningen"`) · Bedrijfspanden (r.189) |
| 4 | `Sector ·`-veld op de 11 casepagina's | Residentieel vastgoed ×5 · **Residentieel vastgoed · belegger ×1** (`project-arnhem-60.html:58`) · Automotive ×2 · Recreatie ×1 · Bedrijfspand ×1 · Commercieel vastgoed ×1 = **11 van 11, geen enkele ontbreekt** (zie §6.5) |
| 5 | Kruimelpad `.pc-crumb` op de 11 casepagina's | Woningportefeuilles ×**6** · Automotive ×2 · Recreatie ×1 · Bedrijfspanden ×1 · Netcongestie & Energy Hubs ×1 = 11 (zie §6.6) |
| — | Legacy mega-menu `_header.js:34-39` | **vijf** items: Logistiek, Kantoren & vastgoed, VvE's & Wooncomplexen, Recreatie, Woningportefeuilles (zie §6.8) |

**De canonieke taxonomie — 5 sectoren + 1 segment.** De sectoren zijn bewust breed gehouden, zodat een sector niet op één case hoeft te drijven.

| Canoniek | Legacy-labels die hierop afbeelden | Pagina | Cases | Bewijsstatus | Aanbevolen URL | Ontbrekende case |
|---|---|---|---|---|---|---|
| **Commercieel vastgoed** | Vastgoed · Bedrijfspand · Bedrijfspanden · Kantoren & vastgoed | `industrie-vastgoed.html` | `project-purmerend.html`, `project-ratio-16.html` | **VERIFIED (2)** | `/sector/commercieel-vastgoed` | — |
| **Woningportefeuilles** | Residentieel vastgoed · Residentieel · Residentieel vastgoed · belegger · Woningen | `industrie-residentieel.html` | `project-arnhem-60.html`, `-burchtstraat`, `-ketsheuvel`, `-nieuw-schoonoord`, `-schouwburgring`, `-van-beethovenstraat` | **VERIFIED (6)** | `/sector/woningportefeuilles` | — |
| **Recreatie** | — | `industrie-recreatie.html` | `project-dormio-medemblik.html` | **VERIFIED (1)** | `/sector/recreatie` | — |
| **Logistiek & transport** | Logistiek | `industrie-logistiek.html` | geen | **CASE PROOF = PENDING** | `/sector/logistiek` | **ja** — 0 cases tegenover een bestaande sectorpagina met sectie 06 "Cases" (`industrie-logistiek.html:158`) |
| **Automotive** | — | **ONTBREEKT (PAGE PENDING)** — gemeten: geen enkel HTML-bestand met "automotive" in de naam | `project-hedin-alkmaar.html`, `project-hedin-amsterdam.html` | **VERIFIED (2), pagina ontbreekt** | `/sector/automotive` | — (de *pagina* ontbreekt, niet de case) |
| **VvE** *(segment binnen Woningportefeuilles)* | — | `industrie-vve.html` | geen | **CASE PROOF = PENDING** | `/sector/woningportefeuilles/vve` | **ja** — 0 cases; Master v1 linkt er ook niet naartoe |

**"Netcongestie & Energy Hubs" is geen sector.** Het is een probleem/oplossing en staat ten onrechte op de sector-as van `projecten.html` (chip r.185, `data-sector="Netcongestie"` op `projecten.html:195` voor Ratio 16, en het kruimelpad van `project-ratio-16.html:58`). Het **verhuist van de sector-as naar de oplossing-as** — de as die in B2 door de varianten *Oplossing* (`oplossing-netcongestie.html`) en *Gebied* (`energy-hubs.html`) wordt bediend. Ratio 16 krijgt op de sector-as het canonieke label **Commercieel vastgoed**, conform zijn eigen detailpagina (`project-ratio-16.html:62`).

**Vastgestelde asymmetrieën — vier stuks, alle gemeten:**

| # | Asymmetrie | Bewijs | Status |
|---|---|---|---|
| A1 | **Automotive heeft 2 cases maar geen sectorpagina** | `project-hedin-alkmaar.html:62`, `project-hedin-amsterdam.html:62`; geen `industrie-automotive.html` in de repositorywortel | PAGE PENDING |
| A2 | **Logistiek heeft een sectorpagina maar 0 cases** | `industrie-logistiek.html` bestaat en draagt sectie 06 "Cases" (r.158); geen case met dat label | CASE PROOF = PENDING |
| A3 | **VvE heeft een sectorpagina maar 0 cases** | `industrie-vve.html` bestaat; geen case met dat label; Master v1 linkt er niet naartoe | CASE PROOF = PENDING |
| A4 | **"Netcongestie & Energy Hubs" staat op de sector-as** | `projecten.html:185`, `projecten.html:195`, `project-ratio-16.html:58` | verhuist naar de oplossing-as |

**Niets verzinnen.** Waar geen case bestaat staat **CASE PROOF = PENDING**. Aan `industrie-logistiek.html` en `industrie-vve.html` mag geen case worden toegeschreven die niet in die sector valt; een sectorpagina zonder case toont geen casesectie, of toont expliciet dat de eerste case in die sector nog loopt — de tweede variant vereist een primaire bron en is dus CONTENT PENDING.

**Migratieplicht die uit C-05 volgt.** Bij de migratie van `projecten.html` (B4, stap 3 van de migratievolgorde) moeten `data-f` en `data-sector` op het canonieke vocabulaire komen, zodat overzicht, kaart, kruimelpad en detailpagina één taal spreken. Dat lost DR-11(a) en DR-11(b) tegelijk op.

### 0.5 C-06 · Brochure- en guide-assets — gemeten stand op deze commit

| Meting | Uitkomst |
|---|---|
| PDF-bestanden in de repository | **nul** (`find . -name "*.pdf"` → geen treffers) |
| Map `assets/brochures/` | **bestaat niet** (gemeten inhoud van `assets/`: 23 beeld-/logobestanden plus de mappen `home` en `projects`) |
| Dood brochurepad | `_leadpopup.js:9` — `file:'assets/brochures/netcongestie-oplossen.pdf'`, **in het commentaarblok** met de voorbeeldconfiguratie (r.4-11), niet in de runtime-default. De runtime-default is leeg (`_leadpopup.js:32`) en zonder `file` verschijnt er geen popup (r.33: "geen brochure gekoppeld -> geen popup"). Zie §6.7 |
| `data-brochure-file`-attributen | **7 van 7 guides** noemen een `.pdf`-bestandsnaam die niet bestaat, bv. `netcongestie-oplossen.html:100` "Vibe brochure Netcongestie Oplossen.pdf" en `laadplein-zonder-verzwaring.html:112` "Vibe brochure Laadplein zodner Verzwaring.pdf" (inclusief de tikfout *zodner*). Dode metadata: geen enkel script leest deze attributen |
| Pagina's met een `window.VIBE_LEAD`-config | **vijf**, alle vijf met een **HTML-pagina** als `file`, geen PDF: `index.html:1242` → `energie-als-vastgoedopbrengst.html` · `oplossing-laadplein.html:269` → `laadplein-zonder-verzwaring.html` · `oplossing-energielabel.html:857` → `energielabel-verhogen.html` · `oplossing-exploitatie.html:295` → `exploitatie-zonder-investering.html` · `oplossing-netcongestie.html:299` → `netcongestie-oplossen.html` |
| Knoptekst in de popup | "Stuur mij de brochure" (`_leadpopup.js:124`); de eyebrow zegt "Gratis brochure" (r.113) |
| Guides op `report.css` | **zeven**: capaciteit-als-dienst, energie-als-vastgoedopbrengst, energiehandel-flexmarkten, exploitatie-zonder-investering, energielabel-verhogen, laadplein-zonder-verzwaring, netcongestie-oplossen |
| In `sitemap.xml` | **drie**: energie-als-vastgoedopbrengst (r.16), capaciteit-als-dienst (r.118), energiehandel-flexmarkten (r.124). De andere vier niet |
| Serverwhitelist `api/server.js:33-39` | vijf sleutels: `home`, `exploitatie`, `energielabel`, `laadplein`, `netcongestie` — elk met een `doc:` dat naar een **`.html`-guide** wijst, niet naar een PDF |
| Guides die door géén enkele leadconfig als asset worden aangeboden | **twee**: `capaciteit-als-dienst.html`, `energiehandel-flexmarkten.html` |
| Persoonlijk e-mailadres | **7 van 7 guides** tonen `mailto:mounir@vibeenergy.nl` in hun contactblok: `capaciteit-als-dienst.html:500`, `energie-als-vastgoedopbrengst.html:449`, `energiehandel-flexmarkten.html:485`, `energielabel-verhogen.html:467`, `exploitatie-zonder-investering.html:451`, `laadplein-zonder-verzwaring.html:537`, `netcongestie-oplossen.html:478` |
| Zakelijke bestemmingen die al wél kloppen | `api/server.js` verstuurt vanaf `no-reply@vibeenergy.nl` en meldt de lead aan `sales@vibeenergy.nl`; de site voert verder `info@vibeenergy.nl` (`index.html:1058`) |

**Gevolg onder NO ASSET → NO DOWNLOAD PROMISE.** De copy mag **geen PDF-download beloven**: wat geleverd wordt is een guidepágina, geen bestand. Concreet raakt dat de knoptekst "Stuur mij de brochure" (`_leadpopup.js:124`) en de eyebrow "Gratis brochure" (r.113), én de zeven dode `data-brochure-file`-attributen. Het dode voorbeeldpad in het commentaar (`_leadpopup.js:9`) moet bij migratie worden gecorrigeerd of verwijderd, en de zeven persoonlijke mailto's worden vervangen door de zakelijke centrale bestemming. **NU GEEN productiecode wijzigen.**

---

## 1 · Paginatoewijzing — elke bestaande pagina aan één bouwtype (B1..B7 + S2)

48 HTML-bestanden gevonden in de repositorywortel, 5 uitgesloten, **43 toegewezen**. Er staan geen HTML-bestanden in onderliggende mappen.

Kolommen: **Bouwtype V1.0** = het besloten bouwtype uit §4.1 (B1..B7 + S2) met zijn redactionele variant · **Archetype** = de oorspronkelijke twaalfdeling, behouden als auditbewijs · **BF** = bouwfamilie uit §0.2 · **hdr/ftr** = laadt `_header.js` / `_footer.js` · **lead** = `_leadpopup.js` actief · **mcta** = sticky mobiele CTA-balk (**gemeten legacy-staat; vervalt onder C-04**) · **sec** = aantal `data-screen-label`-secties · **faq** = aantal `.faq-item` · **rgl** = regels.

| Bestand | Bouwtype V1.0 | Archetype | BF | hdr | ftr | lead | mcta | sec | faq | rgl | Anker |
|---|---|---|---|:-:|:-:|:-:|:-:|--:|--:|--:|---|
| `index.html` | **B1** Startpagina | A0 Homepage (referentie) | BF1 | – | ja | ja | – | 9 | 0 | 1245 | `<title>` r.16; `<h1>` r.186 |
| `systeem-ems.html` | **B2** · *Systeem* — wordt onder C-02 de VIBE.CONTROL-productpagina | A1 Systeempagina | BF2 | ja | ja | – | ja | 8 | 5 | 255 | `<h1>` r.70; eyebrow "Systeem · EMS" |
| `systeem-energieopslag.html` | **B2** · *Systeem* — **master van B2**, stap 1 | A1 | BF2 | ja | ja | – | ja | 8 | 5 | 236 | `<title>` r.16 |
| `systeem-zonnepanelen.html` | **B2** · *Systeem* | A1 | BF2 | ja | ja | – | ja | 8 | 5 | 236 | `<title>` r.16 |
| `systeem-laadpalen.html` | **B2** · *Systeem* | A1 | BF2 | ja | ja | – | ja | 8 | 5 | 236 | `<title>` r.16 |
| `microgrids.html` | **B2** · *Systeem* | A1 | BF2 | ja | ja | – | ja | 8 | 5 | 235 | `<h1>` r.70 "Losse assets. / Of één systeem." |
| `oplossing-netcongestie.html` | **B2** · *Oplossing* | A2 Oplossingspagina | BF2 | ja | ja | ja | ja | 9 | 5 | 303 | `<h1>` r.70; `VIBE_LEAD` r.299 |
| `oplossing-laadplein.html` | **B2** · *Oplossing* | A2 | BF2 | ja | ja | ja | ja | 9 | 5 | 273 | `VIBE_LEAD` r.269 |
| `oplossing-exploitatie.html` | **B2** · *Oplossing* | A2 | BF2 | ja | ja | ja | ja | **11** | 6 | 299 | extra secties 04b r.133, 04c r.156; `VIBE_LEAD` r.295 |
| `oplossing-energielabel.html` | **B2** · *Oplossing* — bouw te harmoniseren, DR-03 | A2 (afwijkende bouw) | BF3 | ja | ja | ja | – | **0** | 0 | 860 | `<h1>` r.405; `VIBE_LEAD` r.857 |
| `oplossing-paris-proof.html` | **B2** · *Oplossing* — bouw te harmoniseren, DR-03 | A2 (afwijkende bouw) | BF3 | ja | ja | – | – | **0** | 0 | 800 | `<h1>` r.373 |
| `oplossing-subsidies.html` | **B2** · *Oplossing* — bouw te harmoniseren, DR-03 | A2 (afwijkende bouw) | BF3 | ja | ja | – | – | **0** | 0 | 810 | `<h1>` r.373 |
| `industrie-logistiek.html` | **B2** · *Sector* — canoniek **Logistiek & transport**, CASE PROOF = PENDING | A3 Sectorpagina | BF2 | ja | ja | – | ja | 9 | 5 | 252 | `<h1>` r.70; 6 uitdagingen r.96-101 |
| `industrie-vastgoed.html` | **B2** · *Sector* — canoniek **Commercieel vastgoed** | A3 | BF2 | ja | ja | – | ja | 9 | 5 | 252 | `<h1>` r.70 |
| `industrie-recreatie.html` | **B2** · *Sector* — canoniek **Recreatie** | A3 | BF2 | ja | ja | – | ja | 9 | 5 | 254 | `<h1>` r.72; enige videohero |
| `industrie-residentieel.html` | **B2** · *Sector* — canoniek **Woningportefeuilles** | A3 | BF2 | ja | ja | – | ja | 9 | 5 | 252 | `<h1>` r.70 |
| `industrie-vve.html` | **B2** · *Sector* — segment **VvE** binnen Woningportefeuilles, CASE PROOF = PENDING | A3 | BF2 | ja | ja | – | ja | 9 | 5 | 251 | `<title>` r.16 |
| `energy-hubs.html` | **B2** · *Gebied* | A4 Infrastructuur/gebied | BF2 | ja | ja | – | ja | **10** | 6 | 303 | `<h1>` r.70; dubbel label "03" op r.123 én r.134 |
| `project-ratio-16.html` | **B3** · *asset* — **master van B3**, stap 2 | A5 variant A (asset) | BF4 | ja | ja | – | ja | 0 | 0 | 117 | `<h1>` r.60; `.pc-loc` r.62; `.pc-kpi` r.68 |
| `project-hedin-alkmaar.html` | **B3** · *asset* | A5 variant A | BF4 | ja | ja | – | ja | 0 | 0 | 116 | `<h1>` r.60; `.pc-loc` r.62; `.pc-kpi` r.67 |
| `project-hedin-amsterdam.html` | **B3** · *asset* | A5 variant A | BF4 | ja | ja | – | ja | 0 | 0 | 117 | `.pc-loc` r.62 |
| `project-dormio-medemblik.html` | **B3** · *asset* | A5 variant A | BF4 | ja | ja | – | ja | 0 | 0 | 117 | `.pc-loc` r.62 |
| `project-arnhem-60.html` | **B3** · *portefeuille* | A5 variant B (portefeuille) | BF4 | ja | ja | – | ja | 0 | 0 | 79 | `.pc-loc` r.58 (**mét** Sector-veld, zie §6.5); `.pc-kpi` r.61; enige met `.pc-gal` + `arnhem-drone.mp4` |
| `project-burchtstraat.html` | **B3** · *portefeuille* | A5 variant B | BF4 | ja | ja | – | ja | 0 | 0 | 80 | `<title>` r.14 |
| `project-ketsheuvel.html` | **B3** · *portefeuille* | A5 variant B | BF4 | ja | ja | – | ja | 0 | 0 | 80 | `<title>` r.14 |
| `project-nieuw-schoonoord.html` | **B3** · *portefeuille* | A5 variant B | BF4 | ja | ja | – | ja | 0 | 0 | 80 | `<title>` r.14 |
| `project-purmerend.html` | **B3** · *portefeuille* | A5 variant B | BF4 | ja | ja | – | ja | 0 | 0 | 80 | `.pc-loc` r.58 |
| `project-schouwburgring.html` | **B3** · *portefeuille* | A5 variant B | BF4 | ja | ja | – | ja | 0 | 0 | 80 | `<title>` r.14 |
| `project-van-beethovenstraat.html` | **B3** · *portefeuille* | A5 variant B | BF4 | ja | ja | – | ja | 0 | 0 | 80 | `<title>` r.14 |
| `projecten.html` | **B4** Indexpagina — **master van B4**, stap 3 | A6 Projectoverzicht | BF5 | ja | ja | – | ja | 0 | 0 | 336 | `<h1>` r.170; chips r.184-189; teller r.191 |
| `waarom-vibe.html` | **B5** Standpuntpagina — **master van B5**, stap 5 | A7 Corporate | BF5 | ja | ja | – | – | 6 | 0 | 505 | `<h1>` r.286 |
| `over-ons.html` | **B5** Standpuntpagina — bouw te harmoniseren, DR-04 | A7 Corporate | BF3 | ja | ja | – | – | 7 | 0 | 647 | `<h1>` r.346; sectie 06 `hidden` r.532 |
| `contact.html` | **B6** · *formulier* — **master van B6**, stap 4; herbouw als echte HTML is voorwaarde | A8 Contact/conversie | BF7 | **–** | **–** | – | – | 5* | 0 | 229 | `<title>` r.19; `<noscript>` r.40; bundler-template r.225-227 |
| `netcongestie-check.html` | **B6** · *wizard* | A9 Tool/assessment | BF5 | ja | ja | – | – | 0 | 0 | 506 | `<h1>` r.216; `STEPS` r.248-280 |
| `netcongestie-oplossen.html` | **S2** gated guide — **master van S2**, stap 7 | A10 Executive Guide | BF6 | – | – | – | – | 8 | 0 | 489 | `<title>` r.6; slug `netcongestie` r.100 |
| `exploitatie-zonder-investering.html` | **S2** gated guide | A10 | BF6 | – | – | – | – | 8 | 0 | 463 | slug `exploitatie` r.130 |
| `energielabel-verhogen.html` | **S2** gated guide | A10 | BF6 | – | – | – | – | 8 | 0 | 478 | slug `energielabel` r.124 |
| `laadplein-zonder-verzwaring.html` | **S2** gated guide | A10 | BF6 | – | – | – | – | **9** | 0 | 548 | slug `laadplein` r.112 |
| `energie-als-vastgoedopbrengst.html` | **S2** gated guide — uit `sitemap.xml:16` halen (C-03) | A10 | BF6 | – | – | – | – | 8 | 0 | 460 | slug `vastgoedopbrengst` r.107; serverkey is `home` (`api/server.js:34`) |
| `capaciteit-als-dienst.html` | **S2** gated guide — uit `sitemap.xml:118` halen (C-03); geen leadconfig biedt hem aan | A10 | BF6 | – | – | – | – | 8 | 0 | 511 | slug `meer-capaciteit` r.126 — niet in serverwhitelist |
| `energiehandel-flexmarkten.html` | **S2** gated guide — uit `sitemap.xml:124` halen (C-03); geen leadconfig biedt hem aan | A10 | BF6 | – | – | – | – | 8 | 0 | 496 | slug `energiehandel` r.120 — niet in serverwhitelist |
| `privacy.html` | **B7** Juridisch document — **master van B7**, stap 6 | A11 Juridisch | BF5 | ja | ja | – | – | 0 | 0 | 143 | `<h1>` r.72; 10 artikelen r.80-137 |
| `algemene-voorwaarden.html` | **B7** Juridisch document | A11 Juridisch | BF5 | ja | ja | – | – | 0 | 0 | 216 | `<h1>` r.70; 13 artikelen r.78-208; tekstfout r.201 en r.208 |

\* De vijf `data-screen-label`-waarden van `contact.html` staan als JSON-geëscapete tekst in de bundler-string op `contact.html:226` en niet in de DOM van het bestand zelf.

### 1.1 Uitgesloten bestanden

| Bestand | Reden |
|---|---|
| `404.html` | expliciet uitgesloten in de opdracht |
| `_header.html` | begint met `_`; het is een verouderde referentiekopie van de nav (`_header.html:1`) — de live nav komt uit `_header.js` |
| `cookie-popup-designs.html` | design-experiment |
| `popup-designs.html` | design-experiment |
| `popup-designs-met-afbeelding.html` | design-experiment. **Let op:** dit bestand eindigt niet op `-designs.html`. Een letterlijke lezing van de uitsluitingsregel neemt het mee in scope. Ik volg de bedoeling en sluit het uit — zie DR-15 in §5. |

### 1.2 Toewijzing per bouwtype — V1.0, de geldende indeling

| Bouwtype | Varianten en hun vulling | Pagina's | Aandeel van 43 |
|---|---|---:|---:|
| **B1 · Startpagina** | — | 1 | 2,3% |
| **B2 · Propositiepagina** | *Systeem* 5 · *Oplossing* 6 · *Sector* 5 · *Gebied* 1 | **17** | 39,5% |
| **B3 · Casepagina** | *asset* 4 · *portefeuille* 7 | 11 | 25,6% |
| **B4 · Indexpagina** | — | 1 | 2,3% |
| **B5 · Standpuntpagina** | — | 2 | 4,7% |
| **B6 · Conversie-instrument** | *formulier* 1 · *wizard* 1 | 2 | 4,7% |
| **B7 · Juridisch document** | — | 2 | 4,7% |
| **S2 · Executive Guide** (gated documentsysteem, geen publiek archetype) | — | 7 | 16,3% |

1 + 17 + 11 + 1 + 2 + 2 + 2 + 7 = **43**. Zeven webtypes plus één gated documentsysteem; geen enkel webtype draagt nog minder dan één volledige pagina, en de vier grootste (B2, B3, S2, B5+B6+B7 samen) dekken alles.

### 1.2b Toewijzing per oorspronkelijk archetype — behouden als auditbewijs

| Archetype | Aantal pagina's | Aandeel van 43 | Gaat op in |
|---|---:|---:|---|
| A0 Homepage | 1 | 2,3% | B1 |
| A1 Systeempagina | 5 | 11,6% | B2 · *Systeem* |
| A2 Oplossingspagina | 6 | 14,0% | B2 · *Oplossing* |
| A3 Sectorpagina | 5 | 11,6% | B2 · *Sector* |
| A4 Infrastructuur/gebied | 1 | 2,3% | B2 · *Gebied* |
| A5 Projectdetail | 11 | 25,6% | B3 |
| A6 Projectoverzicht | 1 | 2,3% | B4 |
| A7 Corporate | 2 | 4,7% | B5 |
| A8 Contact | 1 | 2,3% | B6 · *formulier* |
| A9 Tool/assessment | 1 | 2,3% | B6 · *wizard* |
| A10 Executive Guide | 7 | 16,3% | S2 |
| A11 Juridisch | 2 | 4,7% | B7 |

Zes van de twaalf archetypes droegen één of twee pagina's. Dat was het argument voor de reductie in §4 — een reductie die inmiddels genomen is (DR-00 = DECIDED — V1.0).

---

## 2 · A0 · Homepage — referentie, GEEN archetype om te repliceren

> **B-toewijzing V1.0: B1 · Startpagina.** B1 is al Master v1 en wordt **niet opnieuw gebouwd**; `index.html` blijft byte-for-byte zoals in commit `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1`. Onder C-01 wordt de header van deze pagina wél het model voor alle andere bouwtypes — de platte Master-v1-header. Onder §4.4 blijven de hero-stage, de VIBE.CONTROL-dashboardcompositie, de Hedin featured-projectcompositie, de process timeline en de final CTA diagonal composition **expliciet niet-geabstraheerd**: unieke composities, geen componenten.

**Doel.** Merkintroductie plus distributie naar alle andere bouwtypes. Master v1 is de bron van de tokenlaag en de vormtaal; de pagina zelf is uniek en mag door geen enkele subpagina 1-op-1 geërfd worden.

**Pagina's.** `index.html` — `<title>` r.16 "Energieoplossingen voor bedrijven & vastgoed | Vibe Energy"; `<h1>` r.186 "Ruimte voor groei. Zonder netcongestie."

**Waarom hij niet herbruikbaar is.** De header zit ingebakken in dezelfde `.vh-stage`-container als de hero (`index.html:128-161` binnen het heroblok `index.html:77-206`). Elke pagina die `_header.js` draait, kan die hero dus niet overnemen. Bovendien laadt `index.html` `_header.js` niet, terwijl de 34 andere webpagina's dat wél doen.

**Sectievolgorde (gemeten `data-screen-label`).**

| # | Sectie | Regel |
|---|---|---|
| S1 | Hero + bewijs-/propositiestrook `.vh-kpi` | `index.html:75`, strook r.222 |
| S2 | Oplossingen — 6 systeemkaarten | r.300 |
| S3 | Project in de kijker (Hedin Alkmaar, 3 metrics) | r.460, metrics r.502-510 |
| S4 | Van plan naar prestatie — 4 stappen met chevrons | r.525 |
| S5 | VIBE.CONTROL — apparaatcompositie, voettekst "Voorbeeldweergave" | r.613, voettekst r.688 |
| S6 | Vertrouwen (2 organisaties) + Ratio 16-resultaatkaart | r.787, organisaties r.805-814 |
| S7 | Energie-infrastructuur (3 waardedrijvers) + 4 sectorkaarten | r.875, kaarten r.921 |
| S8 | Final CTA — 3 bewijsitems + afspraakkaart | r.946 |
| S9 | Footer | r.1012 |

**Tokenlaag.** `home.css:29-71`: `--vibe-blauw #0073FE` (r.35), `--vibe-navy #08203C` (r.41), `--vibe-body #4C5771` (r.43), `--vibe-canvas #F6FAFE` (r.51), `--vibe-radius-kaart .5637cqw` (r.55, "10 ref-px op de 1774-schaal"), `--vibe-elev-1/-2/-mob` (r.60-65), `--vibe-ease cubic-bezier(.2,.7,.2,1)` (r.69).

**Letter.** Urbanist 400 voor lopende tekst (`home.css:83-84`), Urbanist 700 met `letter-spacing:-.012em` voor `h1,h2,h3` (`home.css:104-111`). Dit is NIET de letter uit `tokens.css`.

**Focus.** Merkblauwe ring 2px met offset 3px (`home.css:119-127`), die de oudere ring uit `tokens.css:101-105` overschrijft omdat `home.css` later laadt (`home.css:113-118`).

**Bewijsdoctrine.** De inline commentaren zijn de geldende contentregel, niet een toelichting: `index.html:208-255` (bewijsstrook), `505-508` (projectmetrieken), `615-622` (VIBE.CONTROL), `789-794` (vertrouwensrij), `817-826` (projectverhaal), `909-913` (hoofdbeeld), `918-920` (sectorkaarten), `975-978` (contactbelofte), `1028-1033` (footeradres), `1063-1065` (footernavigatie), `1099-1102` (nieuwsbrief). Expliciet verworpen cijfers: 47 projecten, 12 MWp, 98% uptime, 892 ton CO₂ (`index.html:209-216` en `251-255`).

**Fotografie.** Uitsluitend eigen gerealiseerd werk, geleverd als webp met srcset in `assets/home/` (39 bestanden gemeten). Eén eager LCP-beeld, de rest lazy. `sizes` is de gemeten cqw-breedte op één decimaal.

**NIET van de homepage kopiëren.** N.v.t. — dit *is* de bron. Elk ander archetype heeft hieronder een eigen verbodslijst.

---

## 3 · De elf afgeleide archetypes — behouden als inhoudelijke onderlegger onder B1..B7 + S2

Per archetype volgt dezelfde structuur: doel · pagina's · hero · informatiehiërarchie · componenten · sectievolgorde · conversiepatroon · bewijsvereisten · fotografie · NIET van de homepage kopiëren.

**Hoe deze sectie zich verhoudt tot het besluit in §4.** De twaalfdeling is niet langer de architectuur — B1..B7 + S2 is dat. Maar de redactionele analyse per archetype is het materiaal waaruit de varianten binnen B2, B3 en B6 zijn opgebouwd, en zij draagt de bewijsvereisten die per variant gelden. Ze blijft daarom integraal staan. Elke A-sectie opent hieronder met zijn **B-toewijzing**.

**Drie leesinstructies die uit §0.3 volgen en op alle A-secties tegelijk van toepassing zijn:**
1. **C-01.** Waar een A-sectie het mega-menu uit `_header.js:22-48` als navigatiecontext noemt, beschrijft dat de gemeten legacy-staat. Het doelbeeld is de platte Master-v1-header.
2. **C-04.** Waar een A-sectie "sticky `.mcta`" noemt, beschrijft dat de gemeten legacy-staat op 26 pagina's. In V1.0 vervalt die balk en worden CTA's in de pagina geïntegreerd.
3. **C-07.** Elk cijfer dat een A-sectie citeert, valt onder de frozen claim policy in §4.3. "Gepubliceerd" is geen bewijsstatus.

---

### A1 · Systeempagina — 5 pagina's

> **B-toewijzing V1.0: B2 · Propositiepagina, variant *Systeem*.** Proofregel: **SYSTEM = productspecificaties / technische onderbouwing** (§4.2). `systeem-energieopslag.html` is de master van B2 (migratiestap 1). `systeem-ems.html` wordt onder C-02 de VIBE.CONTROL-productpagina met behoud van EMS-context.

**Doel.** Eén technische bouwsteen verkopen als onderdeel van één geïntegreerd systeem. De bezoeker komt uit het mega-menu "Systeem" (`_header.js:41-47`, vijf items) of vanaf een oplossings- of projectpagina. De pagina legt de component uit én koppelt terug naar het geheel. *Onder C-01 verdwijnt dat mega-menu; de ingang wordt de platte header plus de overzichts- en interne navigatie.*

**Pagina's.** `systeem-ems.html` (r.16 "EMS — slim energiemanagement"), `systeem-energieopslag.html` (r.16 "Batterijopslag voor bedrijven"), `systeem-zonnepanelen.html` (r.16 "Zakelijke zonnepanelen op maat"), `systeem-laadpalen.html` (r.16 "Slimme laadpalen voor bedrijven"), `microgrids.html` (r.16 "Microgrids — losse assets als één gestuurd systeem").

**C-02 · naamgeving op deze vijf pagina's — DECIDED — V1.0.** VIBE.CONTROL is de commerciële productnaam, EMS de functionele categorie. `systeem-ems.html` wordt de VIBE.CONTROL-productpagina, maar de pagina moet **voldoende EMS-context** houden: de `<title>` op r.16 draagt nu "EMS — slim energiemanagement" en dat zoekvolume mag niet verdwijnen. Toegestane schrijfwijzen: "VIBE.CONTROL", "Energiemanagementsysteem (EMS)", "VIBE.CONTROL EMS". De termen *EMS*, *energiemanagementsysteem*, *energie management systeem* en *slim energiemanagement* blijven in kop, lead en body aanwezig. De vier andere systeempagina's raken dit besluit niet.

**Aanbevolen hero.** `.phero` zoals gemeten op `oplossing-netcongestie.html:65-83`: `<img class="bg-photo">` (r.66) + `<div class="scrim">` (r.67) + eyebrow (r.69) + `h1` (r.70) + `.hsub` (r.71) + `.hero-cta` met twee knoppen (r.72-75) + `.trust-row` met vier metrics (r.76-81). Die compositie blijft; erop komen de Vibe-geometrie en de Urbanist-typografie van Master v1. De trust-row draagt hier **systeemspecs**, niet uitkomstcijfers — dat is het enige verschil met A2 op heronavau.

De homepage-hero is hier onbruikbaar: hij bevat de header (`index.html:128-161`). **NIEUW NODIG:** een B2-herovariant die de Vibe-diagonaal draagt zonder gelockte header. Die bestaat niet in Master v1. Onder C-01 is het navigatieconflict opgelost en is dit een bouwopdracht geworden, belegd bij migratiestap 1 op de master `systeem-energieopslag.html` — zie DR-07.

**Informatiehiërarchie.**

1. Welke component is dit, en van welk systeem is hij deel — eyebrow "Systeem · X" + `h1` (`systeem-ems.html:70`).
2. Wat gaat er mis zonder — drie pijnpunten als `h3` (`systeem-ems.html:96-98`: "Solar lekt weg" / "Accu verkeerd getimed" / "Laadpalen botsen").
3. Hoe ziet het eruit als het wél klopt — reframe, altijd als "Stel u voor: …" (`systeem-ems.html:108`).
4. Het mechanisme (`systeem-ems.html:124` "Eén regelaar. Alles verbonden.").
5. De cijfers, elk met bronregel.
6. Het bewijs — drie cases uit de elf bestaande.
7. Restbezwaren — 5 FAQ-items (`systeem-ems.html:206`, aside-kop r.211 "Goed om te weten.").
8. De vraag.

**Componenten.**

| Herkomst | Component | Inzet |
|---|---|---|
| HERGEBRUIK Master v1 | `.vh-proc-stappen` — 4 stappen met badge 01-04, icoon en chevron (`index.html:551-608`) | vervangt de huidige `.steps` in sectie 04 |
| HERGEBRUIK | `.vh-sol-grid` moduleraster (`index.html:341-457`) | "past bij deze andere systeemdelen" |
| HERGEBRUIK | `.vh-proof-strip` (`index.html:856-866`) | compacte caselink in sectie 06 |
| HERGEBRUIK | `.vh-final-kaart` afspraakkaart (`index.html:996-1001`) | sectie 08 |
| BESTAAND, behouden | `.kpi` met verplichte `.src`-bronregel (`oplossing-netcongestie.html:229`), `.faq-grid` + `.faq-item`, `.mcta` sticky balk (`subpage.css:262-266`, zichtbaar onder 760px) | secties 05, 07 en mobiel |
| NIEUW NODIG | subpagina-hero zonder gelockte header | sectie 01 |

**Mogelijke sectievolgorde.** 01 Hero → 02 Probleem (3 punten) → 03 Reframe → 04 Mechanisme → 05 Resultaten (4 KPI's) → 06 Projectbewijs (3 cases) → 07 FAQ (5) → 08 CTA. Gemeten: alle vijf A1-pagina's draaien exact 8 secties en 5 FAQ-items.

**Conversiepatroon.** Primair `netcongestie-check.html`, secundair `contact.html`, plus sticky `.mcta` onder 760px. **GEEN leadpopup:** geen van de vijf pagina's laadt `_leadpopup.js` (gemeten), en er staat geen systeembrochure in de whitelist `api/server.js:33-39`.

**Bewijsvereisten.**
- Elke KPI draagt een `.src`-regel met de grondslag; het patroon staat op `oplossing-netcongestie.html:229` ("vs. 24-84 mnd netverzwaring").
- Sectie 06 mag uitsluitend naar de elf bestaande `project-*.html` verwijzen. Er is geen twaalfde case.
- Geen bedrijfsbreed cijfer. Het enige onderbouwde beschikbaarheidsgetal op de site is een contractuele 99,5% SLA voor laadpalen, geen gemeten uptime (`index.html:215-216`).
- Geen zonnecapaciteit in kWp: geen enkele projectpagina noemt die grootheid (`index.html:213-214`).

**Fotografie.** Eén herofoto per pagina; alle vijf bestaan al: `assets/ems-hero.jpg`, `assets/energieopslag-hero.jpg`, `assets/zonnepanelen-hero.jpg`, `assets/laadpalen-hero.jpg`, `assets/microgrids-hero.jpg`. Voor sectie 06 de beelden uit `assets/projects/` (17 bestanden gemeten). Er bestaat **geen** productscreenshot van VIBE.CONTROL in deze repository (`index.html:616-617`).

**NIET van de homepage kopiëren.**

| Wat | Reden |
|---|---|
| De VIBE.CONTROL-apparaatcompositie uit S5 met haar waarden (`index.html:657-682`) | Het is een voorbeeldweergave en draagt daarom de voettekst "Voorbeeldweergave" (`index.html:688`). Losgeknipt van dat label wordt het een prestatieclaim zonder meting. |
| De `.vh-kpi` bewijsstrook (`index.html:222-293`) | Die telt de sitebrede staat van dienst; per definitie hoort dat op één pagina. Een tweede telling levert een tweede, afwijkend getal op. |
| De ingebakken `.vh-header` (`index.html:128-161`) | Subpagina's draaien nu op `_header.js` met drie mega-menu's (`_header.js:22-48`). Twee navigaties naast elkaar is het probleem dat DR-01 beschrijft; **C-01 lost het op met één platte Master-v1-header voor alle pagina's**, niet door de ingebakken hero-header te kopiëren. |
| De ingebakken `.vh-footer` (`index.html:1012`) | 35 pagina's krijgen hun footer uit `_footer.js` (gemeten). |
| De negen-sectie-opbouw | A1 draait op 8 secties met een andere leesvolgorde; de homepage-volgorde begint met merk, A1 met probleem. |

---

### A2 · Oplossingspagina — 6 pagina's

> **B-toewijzing V1.0: B2 · Propositiepagina, variant *Oplossing*.** Proofregel: **SOLUTION = probleem → oplossing → projectbewijs** (§4.2). Alle zes pagina's vallen in één variant; de bouwverschillen van de drie BF3-pagina's zijn een migratiekwestie, geen archetypekwestie — zie DR-03. Onder C-03 is de "gated brochure" die deze variant als tweede conversie voert een **guidepagina**, geen PDF; onder C-06 mag de copy daarom geen download beloven.

**Doel.** Een zakelijk probleem oplossen, geen product uitleggen. Het onderscheid met A1 zit in sectie 02: daar staat de pijn van de klant, en pas in sectie 05 de techniek. Dit is het enige archetype met een gated brochure als tweede conversie.

**Pagina's.**

| Pagina | Bouw | Leadpopup |
|---|---|---|
| `oplossing-netcongestie.html` (`<h1>` r.70 "Meer capaciteit voor uw bedrijf. Zonder jaren wachten.") | BF2, 9 secties | ja, slug `netcongestie` (r.299) |
| `oplossing-laadplein.html` | BF2, 9 secties | ja, slug `laadplein` (r.269) |
| `oplossing-exploitatie.html` (r.16 "Energie zonder investering — exploitatiemodel") | BF2, **11 secties** (extra 04b r.133, 04c r.156) | ja, slug `exploitatie` (r.295) |
| `oplossing-energielabel.html` (`<h1>` r.405) | **BF3**, 0 `data-screen-label`, 0 FAQ, geen `.mcta` | ja, slug `energielabel` (r.857) |
| `oplossing-paris-proof.html` (`<h1>` r.373) | **BF3**, 0 secties, 0 FAQ, geen `.mcta` | **nee** |
| `oplossing-subsidies.html` (`<h1>` r.373) | **BF3**, 0 secties, 0 FAQ, geen `.mcta` | **nee** |

De laatste drie delen het doel met de eerste drie maar niets van de bouw. Zie DR-03.

**Aanbevolen hero.** Identiek aan A1 (`.phero`), met precies twee verschillen: de eyebrow leest "Oplossing · X" in plaats van "Systeem · X" (`oplossing-netcongestie.html:69`), en de `.trust-row` draagt **uitkomstcijfers** in plaats van systeemspecs — gemeten `oplossing-netcongestie.html:76-81`: `+60%` meer capaciteit / `14 wkn` snel live / `0 mnd` geen wachtrij / `€ 0` zonder eigen investering. Leg het onderscheid tussen A1 en A2 uitsluitend in die twee plekken; één hero-implementatie volstaat voor A1 t/m A4.

**Informatiehiërarchie.**

1. Welk zakelijk probleem is dit, en wat kost het aan tijd — `h1` + `.hsub` (`oplossing-netcongestie.html:70-71`).
2. Waarom het bestaat — `.vs-grid` met de kolommen VRAAG en AANBOD (`oplossing-netcongestie.html:95-118`). Dit blok bestaat nergens anders op de site en is het handelsmerk van A2.
3. Wat het u nu al kost — drie consequentiekaarten `.crow > .c` met `.cv`-waarde (`oplossing-netcongestie.html:129-131`: "2–7 jr" / "€€€" / "Risico").
4. Het alternatief — reframe met attributieregel "— Eén partner. Van advies tot beheer." (r.143).
5. Hoe het loopt — 4 stappen.
6. Dat het al is gedaan — 3 projectkaarten.
7. Wat het oplevert — kpi-grid (4) + `.bcase-split` praktijkcase met vierregelig paneel (r.233-246) + verplichte disclaimer (r.247).
8. Restbezwaren — FAQ met interne links naar A1.
9. De vraag.

**Componenten.**

| Herkomst | Component |
|---|---|
| HERGEBRUIK | `.vh-proc-stappen` (`index.html:551-608`) voor sectie 05 |
| HERGEBRUIK | `.vh-proof-kaart` resultaatkaart met `<dl>`-cijferrij (`index.html:845-854`) voor het businesscase-paneel |
| HERGEBRUIK | `.vh-final-vdl` drie bewijsitems (`index.html:979-992`) in plaats van losse `.meta`-regels in sectie 09 |
| UNIEK voor A2, behouden | `.vs-grid` (vraag/aanbod), `.crow` gevolgkaarten, `.bcase-split` + `.bcase-panel`, `.mono` disclaimerregel |
| CONVERSIE | `_leadpopup.js`, geconfigureerd via `window.VIBE_LEAD{slug,brochure,file}` (`oplossing-netcongestie.html:299`) |

**Mogelijke sectievolgorde.** 01 Hero → 02 Probleem (`.vs-grid`) → 03 Gevolg → 04 Oplossing → 05 Hoe werkt het → 06 Proof of success → 07 Businesscase → 08 FAQ → 09 CTA. `oplossing-exploitatie.html` breidt dit uit met 04b Laadinfrastructuur en 04c Verdienmodel — een legitieme variatie, mits de nummering (`04b`, `04c`) expliciet blijft zoals daar.

**Conversiepatroon — drietraps.**
1. `_leadpopup.js` vuurt zodra de bezoeker de hero voorbij scrollt (`_leadpopup.js:264-270`, drempel = bovenkant hero + 75% van de hoogte) en levert de Executive Guide uit A10/S2 tegen naam, e-mail en telefoon. De popup vuurt alleen als er een bestand aan hangt: `_leadpopup.js:33` — "geen brochure gekoppeld -> geen popup". Levering gebeurt met `window.open(file,'_blank')` (r.240 en r.255), de mail is secundair.
   **C-06-correctie op dit patroon.** `file` is op alle vijf configuraties een **HTML-guidepagina**, geen PDF (gemeten, §0.5). Er bestaat geen enkele PDF in deze repository. De knoptekst "Stuur mij de brochure" (`_leadpopup.js:124`) en de eyebrow "Gratis brochure" (r.113) beloven dus een bestand dat niet bestaat. Onder **NO ASSET → NO DOWNLOAD PROMISE** wordt de copy bij migratie herschreven naar wat feitelijk geleverd wordt: een guide die in een nieuw tabblad opent. Van de zes A2-pagina's dragen er vier een `window.VIBE_LEAD` (§6.4); `oplossing-paris-proof.html` en `oplossing-subsidies.html` hebben er geen en krijgen er geen zolang er geen guide voor hun onderwerp bestaat — CONTENT PENDING.
   **C-07-correctie op dit patroon.** Het linkerpaneel van dezelfde popup toont "7 waardestromen · 0 jr wachttijd · −22% netinkoop" (`_leadpopup.js:116`) zonder bron. Status **UNVERIFIED**. Bij migratie: VERIFIED maken met een primaire bron, herschrijven, of verwijderen.
2. `netcongestie-check.html` als primaire knop.
3. `contact.html` als secundaire, plus sticky `.mcta`.

**Bewijsvereisten.**
- Sectie 07: elke kpi een `.src`-bronregel, en de praktijkcase eindigt altijd met "Cijfers indicatief · uitkomst hangt af van locatie, vermogensvraag en groeiplan" (`oplossing-netcongestie.html:247`).
- De praktijkcase in sectie 07 mag anoniem zijn ("producent Brabant") — maar dan zonder klantnaam en zonder logo.
- Contactbelofte: **48 uur** voor een algemeen contactverzoek (`index.html:975-978`). 24 uur is uitsluitend toegestaan bij de Netcongestie Check (`netcongestie-check.html:218`). Zie ook DR-13.

**Fotografie.** `assets/netcongestie-hero.jpg`, `assets/laadplein-hero.jpg`, `assets/exploitatie-hero.jpg`, `assets/energielabel-hero.jpg`, `assets/kantoor-hero.jpg` (paris-proof), `assets/subsidies-hero.jpg` — alle zes bestaan. Sectie 06 put uit `assets/projects/`.

**NIET van de homepage kopiëren.**

| Wat | Reden |
|---|---|
| Homepage-sectie 2 "Complete energiesystemen voor elke sector" (`index.html:300-457`) | Bewust breed. Een oplossingspagina die met een compleet assortiment opent, verliest de scherpte die haar van A1 onderscheidt. |
| De `.vh-kpi` bewijsstrook | Zie A1. |
| De vertrouwensrij met twee organisaties (`index.html:805-814`) | Op een oplossingspagina leest een rij van twee als een schrale klantenlijst. Gebruik daar drie projectkaarten met cijfers. |
| De ingebakken header/footer | Zie A1. |
| De `.vh-final` afspraakkaart als enige CTA | A2 heeft een drietraps conversie; één afspraakkaart laat de gated brochure en de check ongebruikt. |

---

### A3 · Sectorpagina — 5 pagina's

> **B-toewijzing V1.0: B2 · Propositiepagina, variant *Sector*.** Proofregel: **SECTOR = sectorprobleem → toepassing → sectorcase** (§4.2). De canonieke taxonomie uit C-05 (§0.4) is bindend: `industrie-vastgoed` = Commercieel vastgoed, `industrie-residentieel` = Woningportefeuilles, `industrie-recreatie` = Recreatie, `industrie-logistiek` = Logistiek & transport (**CASE PROOF = PENDING**), `industrie-vve` = segment VvE binnen Woningportefeuilles (**CASE PROOF = PENDING**). **Automotive ontbreekt als pagina** terwijl het twee VERIFIED cases heeft — PAGE PENDING.

**Doel.** Dezelfde propositie vertalen naar het vocabulaire van één sector. Onderscheidend tegenover A2: **zes** sectorspecifieke uitdagingen in plaats van drie generieke gevolgen, plus een extra sectie "Waarom Vibe" vóór de FAQ.

**Pagina's.** `industrie-logistiek.html` (`<h1>` r.70 "Klaar voor een elektrische vloot."), `industrie-vastgoed.html` (r.16 "Energie voor kantoren & vastgoed"), `industrie-recreatie.html` (`<h1>` r.72), `industrie-residentieel.html` (r.16 "Energie voor woningcorporaties & vastgoed"), `industrie-vve.html` (r.16 "Energie voor VvE's & wooncomplexen").

**Aanbevolen hero.** `.phero` met sectorfoto, eyebrow "Voor <sector>". **Eén extra variant vastleggen:** `industrie-recreatie.html` heeft géén `.bg-photo` maar `assets/recreatie-hero.mp4`. Leg die videovariant vast als officiële optie van dezelfde hero, in plaats van hem als eenmalige uitzondering te laten bestaan.

**Informatiehiërarchie.**

1. Herkenning — een `h1` in het vocabulaire van de sector (`industrie-logistiek.html:70` "Klaar voor een elektrische vloot. Niet voor een grotere aansluiting.").
2. Zes uitdagingen met eigen label in plaats van nummers (`industrie-logistiek.html:96-101`: WET / TIJD / MARGE / DOCK / GROEI / KOEL). Dat labelidioom vervangt de generieke `01-06`-nummering en is het sterkste sectorsignaal op de pagina.
3. Gevolgen.
4. Vier oplossingen, elk doorlinkend naar A1, A2 of A4 (`industrie-logistiek.html:121`).
5. Resultaten.
6. Cases in díe sector (`industrie-logistiek.html:158`).
7. Waarom Vibe, sectorspecifiek — drie `h3`'s (`industrie-logistiek.html:188`).
8. FAQ (5).
9. CTA.

**Componenten.**

| Herkomst | Component | Inzet |
|---|---|---|
| HERGEBRUIK | `.vh-infra-kaarten` sectorkaartjes (`index.html:921`) | spiegel het als "andere sectoren"-rij onderaan; dit is precies het blok dat vanaf de homepage naar A3 leidt |
| HERGEBRUIK | `.vh-sol-punten` drie waardedrijvers met icoon (`index.html:314-337`) | sectie 07 |
| HERGEBRUIK | `.vh-proc-kaart` uitgelicht statement (`index.html:542-548`) | het "één partij, end-to-end"-argument |
| BESTAAND | 6-koloms uitdagingenraster, `.proof-grid`, `.faq-grid`, `.endcta`, `.mcta` | |

**Mogelijke sectievolgorde.** Zoals hierboven, 9 secties. Gemeten: alle vijf A3-pagina's draaien exact 9 secties en 5 FAQ-items.

**Conversiepatroon.** Netcongestie Check primair, contact secundair, sticky `.mcta` (legacy; vervalt onder C-04). **GEEN leadpopup:** geen van de vijf laadt `_leadpopup.js` (gemeten) en er is geen sectorbrochure. Onder C-06 (**NO ASSET → NO DOWNLOAD PROMISE**) mag daar dus ook niets over worden beloofd. Wie B2 · *Sector* leadmagnetisch wil maken, moet éérst een sectorasset maken én registreren in `api/server.js:33-39` — tot dan **CONTENT PENDING**; zie DR-05.

**Bewijsvereisten.** Sectie 06 mag alleen cases tonen die daadwerkelijk in die sector vallen. De sectorlabels die de elf projectpagina's zélf voeren zijn gemeten:

| Label in `.pc-loc` | Cases |
|---|---|
| Automotive | `project-hedin-alkmaar.html:62`, `project-hedin-amsterdam.html:62` |
| Residentieel vastgoed | burchtstraat, ketsheuvel, nieuw-schoonoord, schouwburgring, van-beethovenstraat |
| Residentieel vastgoed · belegger | `project-arnhem-60.html:58` |
| Recreatie | `project-dormio-medemblik.html:62` |
| Commercieel vastgoed | `project-ratio-16.html:62` |
| Bedrijfspand | `project-purmerend.html:58` |

Alle elf casepagina's dragen een `Sector ·`-veld; geen enkele ontbreekt (zie §6.5). Deze zes gemeten labels bilden onder C-05 af op de canonieke taxonomie van §0.4: Automotive → **Automotive** · Residentieel vastgoed *en* Residentieel vastgoed · belegger → **Woningportefeuilles** · Recreatie → **Recreatie** · Commercieel vastgoed *en* Bedrijfspand → **Commercieel vastgoed**.

Voor **VvE** en voor **Logistiek & transport** bestaat geen case met dat label: **CASE PROOF = PENDING**. Aan `industrie-vve.html` en `industrie-logistiek.html` mag dus geen case worden toegeschreven die dat niet is. Een sectorpagina zonder case toont geen casesectie; een regel als "de eerste case in deze sector loopt" vereist een primaire bron en is tot die er is CONTENT PENDING. Zie DR-11, dat onder C-05 op DECIDED staat.

**Fotografie.** `assets/logistiek-hero.jpg`, `assets/vastgoed-hero.jpg`, `assets/recreatie-hero.mp4`, `assets/residentieel-hero.jpg`, `assets/vve-hero.jpg` — alle vijf bestaan. Er is geen sectorfotografie als kaartuitsnede; de homepage loste dat op met SVG-iconen en legde de reden vast (`index.html:918-920`). Volg die keuze in plaats van stock in te kopen.

**NIET van de homepage kopiëren.**

| Wat | Reden |
|---|---|
| De koppen van de homepage-sectorkaarten letterlijk (`index.html:921` e.v.) | Dat zijn samenvattingen die naar de pagina toe leiden, geen pagina-inhoud. Letterlijke herhaling maakt de sectorpagina een dubbele van de kaart. |
| De `.vh-proof`-vertrouwenskop met twee organisaties (`index.html:797`, organisaties r.805-814) | Op een sectorpagina leest dat als "twee klanten in deze sector". Dat is voor drie van de vijf sectoren onwaar: Logistiek en VvE hebben nul cases, Commercieel vastgoed heeft er één. |
| De `.vh-kpi` bewijsstrook | Zie A1. |
| De ingebakken header/footer | Zie A1. |

---

### A4 · Infrastructuur-/gebiedspagina — 1 pagina

> **B-toewijzing V1.0: B2 · Propositiepagina, variant *Gebied*.** Proofregel: **GEBIED = lokale relevantie → toepasselijke oplossing → echte lokale/projectonderbouwing waar beschikbaar** (§4.2). Dit is de variant met het grootste risico op een generieke SEO-doorwaytemplate; §4.2 verbiedt die expliciet. Onder C-01 moeten Energy Hubs logisch in de nieuwe IA landen, ook zonder mega-menu-item.

**Doel.** Het aanbod opschalen van één locatie naar meerdere panden of een heel gebied. Inhoudelijk geen systeem (A1) en geen klantprobleem (A2), maar dezelfde propositie op een ander schaalniveau.

**Pagina.** `energy-hubs.html` — r.16 "Energy Hubs — energie-infrastructuur op gebiedsniveau"; `<h1>` r.70 "Eén energiecentrale. Meerdere gebouwen."; eyebrow "Energie-infrastructuur · gebiedsniveau".

**Aanbevolen hero.** Identiek aan A1/A2, met een eyebrow die het **schaalniveau** benoemt in plaats van een productcategorie. Foto `assets/energy-hubs-hero.jpg`.

**Informatiehiërarchie.**

1. Het schaalniveau, meteen in de `h1` (`energy-hubs.html:70`).
2. Capaciteit zit vast (r.86).
3. Wat een Energy Hub is (r.123).
4. Wanneer het één locatie is en wanneer een gebied (r.134) — dit is de scheidslijn met A1/A2 en hoort dus hoog.
5. Hoe gedeelde capaciteit werkt (r.168).
6. Zes argumenten (r.187).
7. Zakelijke impact (r.205).
8. Projectbewijs (r.223).
9. FAQ — 6 items (r.253).
10. CTA (r.275).

**Gemeten fout in de bestaande pagina:** het label "03" komt tweemaal voor, op r.123 én r.134. Tien secties met negen nummers. Dat moet bij de herbouw recht.

**Componenten.**

| Herkomst | Component | Inzet |
|---|---|---|
| HERGEBRUIK | `.vh-infra-kop` + `.vh-infra-vdl` drie waardedrijvers (`index.html:877-895`) | Homepage-sectie 7 heet "Energie-infrastructuur" (`index.html:875`) en is het directe bovenliggende blok van deze pagina |
| HERGEBRUIK | `.vh-proc-stappen` | de hub-opbouw |
| BESTAAND | 6-argumentenraster, `.proof-grid`, `.faq-grid`, `.endcta`, `.mcta` | |

**Mogelijke sectievolgorde.** Zoals hierboven, met de dubbele "03" gesplitst in 03 en 04 en de rest doorgenummerd tot 10.

**Conversiepatroon.** Netcongestie Check + contact + sticky `.mcta`. Geen leadpopup (gemeten).

**Bewijsvereisten.** Sectie 07 heet "Meerdere panden, één systeem." (`energy-hubs.html:228`). In de elf projectpagina's bestaat **geen** multi-pand-case: elke `.pc-loc`-regel noemt exact één locatie. Het dichtstbijzijnde is Hedin Automotive op twee locaties, met twee losse cases (`project-hedin-alkmaar.html:62`, `project-hedin-amsterdam.html:62`). De claim mist een primaire bron — claimstatus **UNVERIFIED** onder C-07; zie DR-10. Onder de GEBIED-proofregel betekent dat: de variant mag de gebiedspropositie uitleggen, maar mag geen gerealiseerd gebiedsbewijs suggereren zolang die case niet bestaat.

**Fotografie.** `assets/energy-hubs-hero.jpg` voor de hero. `assets/microgrids-hero.jpg` toont drie batterijkasten op locatie en is het beste beschikbare beeld voor schaal; de homepage gebruikt het om dezelfde reden (`index.html:1017`).

**NIET van de homepage kopiëren.**

| Wat | Reden |
|---|---|
| De VIBE.CONTROL-console (`index.html:613-688`) | Die verbeeldt sturing op één locatie en ondermijnt precies het gebiedsverhaal dat A4 moet vertellen. |
| De `.vh-kpi` bewijsstrook | Zie A1. |
| De `.vh-pr` uitgelicht-projectsectie (`index.html:460`) | Eén uitgelicht project op locatieniveau spreekt het gebiedsverhaal tegen. |
| De ingebakken header/footer | Zie A1. |

---

### A5 · Projectdetailpagina — 11 pagina's, 2 varianten

> **B-toewijzing V1.0: B3 · Casepagina, varianten *asset* (`.mc-core`, 4 pagina's) en *portefeuille* (`.pc-impact`, 7 pagina's).** `project-ratio-16.html` is de master van B3 (migratiestap 2). Elke casepagina draagt onder C-05 een canoniek sectorlabel uit §0.4; dat label is de bron waar de B2-variant *Sector* en de B4-indexpagina uit citeren.

**Doel.** Eén gerealiseerd project bewijzen met verifieerbare cijfers. Dit is het bewijsfundament waarop alle andere archetypes leunen: sectie 06 van A1/A2/A3 en de secties S3 en S6 van de homepage halen hun cijfers hiervandaan.

**Varianten (gemeten aan de aanwezigheid van `.mc-core` versus `.pc-impact`).**

| Variant | Pagina's | Kenmerk | Omvang |
|---|---|---|---|
| **A** asset-case | ratio-16, hedin-alkmaar, hedin-amsterdam, dormio-medemblik | sectie 07 is `.pc-console` met de `.mc-core` EMS-ring en de échte projectwaarden | 116-117 regels |
| **B** portefeuille-case | arnhem-60, burchtstraat, ketsheuvel, nieuw-schoonoord, purmerend, schouwburgring, van-beethovenstraat | sectie 07 is `.pc-impact` met drie cijfers "waarde voor eigenaar én bewoner" | 79-80 regels |

Alleen `project-arnhem-60.html` en `project-hedin-alkmaar.html` dragen een `.pc-gal` galerij; alleen arnhem-60 heeft bewegend beeld (`assets/projects/arnhem-drone.mp4`).

**Aanbevolen hero.** Compacte `.pc-hero` met kruimelpad, eyebrow met categorie, `h1` in de vorm "Naam — `<em>`claim`</em>`" (`project-ratio-16.html:60`), `.pc-sub`, en een vaste metadataregel `.pc-loc` met Locatie · Sector · Opgeleverd (`project-ratio-16.html:62`). Behouden; alleen de vormtaal vernieuwen. **De volledige homepage-hero is hier fout:** een projectpagina moet binnen één scherm zijn feiten tonen, geen merkstatement.

**Informatiehiërarchie.**

1. Welk project, waar, welke sector, wanneer opgeleverd — `h1` + `.pc-loc` staan binnen twee regels van elkaar (`project-ratio-16.html:60-62`).
2. De vier tot vijf kerncijfers — `.pc-kpi` direct daaronder (r.68).
3. De uitdaging (tag "03 · Uitdaging", r.71).
4. De oplossing + `.pc-links` terug naar A1/A2/A3/A4 (r.77).
5. Technische configuratie — `.pc-specs` (r.82).
6. Resultaat (r.94).
7. Console (variant A) of impact (variant B).
8. Media, alleen bij cases met extra beeld.
9. CTA — "Uw locatie als volgende?" (asset) of "Uw portefeuille als volgende?" (portefeuille).

**Componenten.**

| Herkomst | Component | Inzet |
|---|---|---|
| HERGEBRUIK | `.vh-pr-metrics` drie-metric-rij (`index.html:502-510`) | overweging als vervanger voor de huidige `.pc-kpi` van drie à vier waarden |
| HERGEBRUIK | `.vh-proof-kaart` met `<dl>`-cijferrij (`index.html:845-854`) | sectie 06 Resultaat |
| HERGEBRUIK | `.vh-pr-panel`-geometrie — fotopaneel met navy-scrim en getapte accentwig (`index.html:461-494`; het scrim zelf in `home-project.css:82`, `:247`, `:261`) | heropbouw van de heroafbeelding |
| BESTAAND | `.pc-specs`, `.pc-links`, `.mc-core`, `.pc-impact`, `.pc-gal` | |

**Migratieblokkade.** `project-case.css` zet afgeronde hoeken (`project-case.css:20` `.pc-herofig{border-radius:8px}`, r.51 `.mc-core{border-radius:10px}`, r.61 `.mc-panel{border-radius:8px}`, r.68 `.pc-gal .g{border-radius:6px}`, r.73 `.pc-links a{border-radius:5px}`), terwijl `tokens.css:90-94` diezelfde selectoren met `!important` op `border-radius:0` zet. Zodra B3 de Master v1-kaartvorm `--vibe-radius-kaart` krijgt (`home.css:55`), vecht `tokens.css` met `!important` terug. Dit is de zwaarste `tokens.css`-botsing van alle bouwtypes en valt daarom samen met migratiestap 2. Zie DR-09, status DEFERRED TO PAGE MIGRATION.

**Mogelijke sectievolgorde.** Zoals hierboven, 9 stappen, met sectie 08 optioneel.

**Conversiepatroon.** "Doe de netcongestie-check →" primair + "Plan gesprek" secundair + sticky `.mcta` (`project-ratio-16.html:104`, r.116). Geen leadpopup, geen brochure. Het échte navigatie-instrument is de `.pc-links`-rij in sectie 04: die stuurt terug naar A1/A2/A3/A4.

**Bewijsvereisten — strengst van alle archetypes.** Elk cijfer op een projectpagina wordt elders op de site geciteerd, dus fouten planten zich voort.

1. Cijfers horen bij hun eigen project. De homepage corrigeerde expliciet "78%" van Ratio 16 naar "+70% netvermogen" voor Hedin Alkmaar, met de reden erbij (`index.html:505-508`).
2. Geen zonnecapaciteit in kWp — geen enkele projectpagina noemt die grootheid (`index.html:213-214`).
3. Geen testimonials. Er bestaat in deze repository geen citaat met naam, functie en organisatie (`index.html:818-820`). Tot er één is, is een testimonial verboden.
4. **Gemeten conflict:** `project-ratio-16.html:68` en `project-hedin-alkmaar.html:67` dragen allebei "645 kWh batterijopslag" voor twee verschillende projecten. De homepage citeert 645 kWh voor Hedin Alkmaar (`index.html:503`), `projecten.html:198` citeert 645 kWh voor Ratio 16. Claimstatus **CONFLICTING** onder de frozen claim policy (§4.3): migratie van déze claim is geblokkeerd tot een primaire bron uitwijst welke waarde bij welk project hoort. Zie DR-12.
5. **Het `Sector ·`-veld is verplicht en compleet.** Alle elf casepagina's dragen het (§6.5). Het veld moet bij migratie het **canonieke** label uit §0.4 voeren, niet het legacy-label — anders ontstaat opnieuw het vocabulaireconflict dat DR-11 beschrijft.

**Fotografie.** `assets/projects/` — 17 bestanden gemeten: `arnhem-60.jpg`, `arnhem-drone.mp4`, `beethovenstraat.jpg`, `burchtstraat.jpg`, `dormio.jpg`, `hedin-alkmaar.jpg` + `-1` t/m `-4`, `hedin-amsterdam.jpg`, `ketsheuvel.jpg`, `nieuw-schoonoord.jpg`, `purmerend.jpg`, `ratio-16.jpg`, `ratio16.jpg`, `schouwburgring.jpg`. Alleen Hedin Alkmaar heeft genoeg beeld voor een galerij (5 bestanden); alleen Arnhem heeft bewegend beeld. `ratio-16.jpg` en `ratio16.jpg` zijn duplicaten met afwijkende naam — zie DR-14.

**NIET van de homepage kopiëren.**

| Wat | Reden |
|---|---|
| De `.vh-proof-citaat`-vorm (`index.html:847`) | Die kaart heet in de klasse "citaat" maar draagt bewust een resultaatbeschrijving in de derde persoon, zonder spreker (`index.html:817-820`). Kopieer de vorm nooit mét een spreker erbij — dan verzint u een testimonial die niet bestaat. |
| De VIBE.CONTROL-console met haar voorbeeldwaarden (`index.html:657-682`) | De projectpagina heeft haar eigen `.mc-core` met de échte projectwaarden (`project-ratio-16.html:88-89`). Die twee door elkaar halen levert verzonnen meetwaarden op een bewijspagina op — de ernstigste fout die dit archetype kan maken. |
| De `.vh-kpi` bewijsstrook | Zie A1. |
| De ingebakken header/footer | Zie A1. |
| De volledige homepage-hero | Duwt `.pc-loc` en `.pc-kpi` onder de vouw; dat zijn juist de twee blokken waarvoor de bezoeker komt. |

---

### A6 · Projectoverzicht — 1 pagina

> **B-toewijzing V1.0: B4 · Indexpagina.** `projecten.html` is tevens de master van B4 (migratiestap 3). Twee besluiten raken deze pagina hard: **C-07** verwerpt de drie herocijfers (r.173-175) en schrijft "11 projecten uitgelicht" / "11 gepubliceerde projectcases" voor, en **C-05** vervangt de filterchips door het canonieke vocabulaire uit §0.4 — inclusief het verwijderen van "Netcongestie & Energy Hubs" van de sector-as.

**Doel.** Alle bewijs op één plek, filterbaar, als sprong naar A5. Ontvangt verkeer uit het mega-menu (`_header.js:147`), uit elke "Alle projecten"-link en uit twee homepage-secties (`index.html:801`, `index.html:868`).

**Pagina.** `projecten.html` — r.16 "vibe·energy — Projecten"; `<h1>` r.170 "Geen theorie. Gerealiseerd."; eyebrow r.169.

**Aanbevolen hero.** **Tekst-hero zonder achtergrondfoto behouden.** Een overzichtspagina die zelf een groot beeld voert, concurreert met de elf kaartbeelden eronder. Wel de Vibe-geometrie eroverheen leggen, en de statistiekenrij pas invullen als §Bewijsvereisten hieronder is opgelost.

**Informatiehiërarchie.**

1. De belofte dat het gerealiseerd werk is — `h1` (r.170).
2. Eventueel één geteld cijfer (zie bewijsvereisten).
3. Het filter (r.184-189) met live teller (r.191).
4. Het raster — 11 `.card`-kaarten met beeld, `.tag` categorie, `.ov` overlay met hoofdcijfer + jaar/plaats, en `.res` resultaatregel (voorbeeld: r.195-205).
5. CTA (r.292-295).

**Componenten.**

| Herkomst | Component | Inzet |
|---|---|---|
| HERGEBRUIK | `.vh-proof-strip` (`index.html:856-866`) | rijweergave-alternatief naast het raster |
| HERGEBRUIK | `.vh-infra-kaarten` sectorkaartjes | filterchips met icoon |
| HERGEBRUIK | `.vh-final-kaart` afspraakkaart | de slot-CTA |
| BESTAAND | `.pj-filters` met `data-f`, `.grid` met `data-sector` per kaart, `.pj-count` live teller | |
| VERVALT | de radius- en schaduwcorrecties uit `tokens.css:90-99` die specifiek `.card` rechttrekken | zodra Master v1 de tokenlaag levert |

**Mogelijke sectievolgorde.** 01 Hero (tekst) → 02 Filterbalk + teller → 03 Raster → 04 CTA. Vier secties; meer is voor een overzicht niet nodig.

**Conversiepatroon.** Het raster ís de conversie: elke kaart leidt naar A5. Secundair de `.pj-cta` met netcongestie-check + contact. Sticky `.mcta` aanwezig. Geen leadpopup.

**Bewijsvereisten — HARD CONFLICT, de homepage wint.**

`projecten.html:173-175` toont "47 Opgeleverde projecten", "12 MWp Zon geïnstalleerd" en "98% Gemiddelde uptime". De homepage heeft precies deze drie cijfers onderzocht en verworpen omdat geen ervan een primaire bron heeft (`index.html:209-216` en `251-255`), en ze vervangen door "11 projecten uitgelicht". De teller vijftien regels lager op dezelfde pagina zegt "Alle 11 gerealiseerde projecten" (`projecten.html:191`) — de pagina spreekt zichzelf dus tegen. `over-ons.html:532` laat zien hoe het hoort: de hele Track-record-sectie staat op `hidden`, met de motivering "Cijfers worden niet ingevuld zolang ze niet kloppen" (r.539).

**Regel voor het nieuwe bouwtype — DECIDED — V1.0 onder C-07.** De hero toont het getelde aantal gepubliceerde cases, of geen cijfer. De toegestane formulering is **"11 projecten uitgelicht"** of **"11 gepubliceerde projectcases"**. Níet toegestaan: "Vibe heeft slechts 11 projecten gerealiseerd" — die formulering gaat verder dan de bron bewijst en valt onder REMOVE/REWRITE REQUIRED. De drie herocijfers (47 / 12 MWp / 98%) zijn **UNVERIFIED** en migreren niet mee.

**Tweede gemeten conflict — twee sectorvocabulaires — opgelost door C-05.** De filterchips gebruiken andere labels dan de detailpagina's. De canonieke taxonomie in §0.4 is nu de bindende derde kolom:

| Kaart | `data-sector` in `projecten.html` | `Sector ·` op de detailpagina | Kruimelpad `.pc-crumb` | **Canoniek (C-05)** |
|---|---|---|---|---|
| ratio-16 | `Netcongestie` (r.195) | Commercieel vastgoed (r.62) | Netcongestie & Energy Hubs (r.58) | **Commercieel vastgoed** |
| purmerend | `Bedrijfspanden` (r.281) | Bedrijfspand (r.58) | Bedrijfspanden (r.54) | **Commercieel vastgoed** |
| hedin-alkmaar | `Automotive` (r.206) | Automotive (r.62) | Automotive (r.58) | **Automotive** |
| hedin-amsterdam | `Automotive` (r.217) | Automotive (r.62) | Automotive (r.58) | **Automotive** |
| dormio-medemblik | `Recreatie` (r.228) | Recreatie (r.62) | Recreatie (r.58) | **Recreatie** |
| arnhem-60 | `Woningen` (r.239) | Residentieel vastgoed · belegger (r.58) | Woningportefeuilles (r.54) | **Woningportefeuilles** |
| burchtstraat | `Woningen` (r.246) | Residentieel vastgoed (r.58) | Woningportefeuilles (r.54) | **Woningportefeuilles** |
| ketsheuvel | `Woningen` (r.253) | Residentieel vastgoed (r.58) | Woningportefeuilles (r.54) | **Woningportefeuilles** |
| nieuw-schoonoord | `Woningen` (r.260) | Residentieel vastgoed (r.58) | Woningportefeuilles (r.54) | **Woningportefeuilles** |
| schouwburgring | `Woningen` (r.267) | Residentieel vastgoed (r.58) | Woningportefeuilles (r.54) | **Woningportefeuilles** |
| van-beethovenstraat | `Woningen` (r.274) | Residentieel vastgoed (r.58) | Woningportefeuilles (r.54) | **Woningportefeuilles** |

Negen van de elf wijken af tussen kaart en detailpagina, en bij Ratio 16 is het zelfs een andere soort categorie (een probleem in plaats van een sector). Onder C-05 wordt de laatste kolom bindend voor alle drie de plekken tegelijk — kaartattribuut, detailveld en kruimelpad. Zie DR-11, status DECIDED.

**Derde gemeten conflict — vulling van de filters.** De vijf inhoudelijke chips (`projecten.html:185-189`) dekken: Woningen 6, Automotive 2, Netcongestie 1, Recreatie 1, Bedrijfspanden 1. **Drie van de vijf chips leveren precies één kaart op.** Onder de canonieke taxonomie wordt dat: Woningportefeuilles 6, Automotive 2, Commercieel vastgoed 2, Recreatie 1 — vier chips, waarvan één met één kaart. Logistiek & transport en VvE krijgen **geen** chip zolang zij nul cases hebben (CASE PROOF = PENDING), want een filter dat nul kaarten oplevert is een lege belofte. "Netcongestie & Energy Hubs" verdwijnt van de sector-as. Zie DR-11.

**Fotografie.** Elf kaartbeelden uit `assets/projects/`. Geen herobeeld.

**NIET van de homepage kopiëren.**

| Wat | Reden |
|---|---|
| De `.vh-kpi` bewijsstrook uit S1 (`index.html:222-293`) | Die gaat over exact hetzelfde onderwerp als de `.pj-stats`-rij en zou hier een tweede, afwijkende telling opleveren — precies het probleem dat deze pagina nu al heeft. |
| De `.vh-pr` uitgelicht-projectsectie (`index.html:460`) | Op een overzichtspagina duwt één uitgelicht project de andere tien weg. |
| Een fotohero zoals `index.html:77-206` | Concurreert met elf kaartbeelden op hetzelfde scherm. |
| De ingebakken header/footer | Zie A1. |

---

### A7 · Corporate / waarom-Vibe — 2 pagina's

> **B-toewijzing V1.0: B5 · Standpuntpagina.** `waarom-vibe.html` is de master van B5 (migratiestap 5); `over-ons.html` volgt en wordt daarbij van BF3 naar de B5-bouw gehaald (DR-04). Beide pagina's dragen nu al géén `.mcta` en géén leadpopup, dus C-04 verandert hier niets.

**Doel.** Het bedrijfsmodel verkopen in plaats van een product: Vibe is exploitant, geen leverancier. Dit archetype levert het vertrouwensargument waar A1 t/m A4 naar terugverwijzen (`index.html:900` "Onze aanpak" → waarom-vibe).

**Pagina's.**

| Pagina | Bouw | Secties |
|---|---|---|
| `waarom-vibe.html` (r.16 "Waarom Vibe — exploitant, geen leverancier"; `<h1>` r.286) | **BF5** — alleen `tokens.css` + inline | 6: 01 Hero r.279 → 02 Probleem r.301 → 03 Waar partijen stoppen r.340 → 04 Onderscheid r.379 → 05 Overstappen r.412 → 06 CTA r.447 |
| `over-ons.html` (r.15 "Over Vibe Energy — één partner voor uw energie"; `<h1>` r.346) | **BF3** — `frameiq-harmonize.css` + `tokens.css` | 7: 01 Hero r.340 → 02 Waarom kiezen r.368 → 03 Wat wij doen r.386 → 04 Wat ons anders maakt r.446 → 05 Onze visie r.480 → 06 Track record r.532 (`hidden`) → 07 CTA r.591 |

De twee pagina's delen het doel maar draaien op twee verschillende bouwfamilies. Zie DR-04.

**Aanbevolen hero.** `.band-dark` tekst-hero met eyebrow en grote `h1`, **zonder fotolaag in het herovlak** (`waarom-vibe.html:279-286`). Behouden: een standpuntpagina die met een productfoto opent, verzwakt het standpunt. Wel de Vibe-geometrie en Urbanist uit Master v1.

**Informatiehiërarchie.**

1. Het standpunt, onomwonden in de `h1` (`waarom-vibe.html:286` "Geen leverancier van techniek. Een exploitant van energie.").
2. Waarom de markt vastloopt (r.301).
3. Waar andere partijen stoppen — productbedrijf / adviesbedrijf / softwarebedrijf / Vibe (r.340). Dit is het dragende blok van A7 en hoort vóór de eigenschappen.
4. Wat dat concreet anders maakt — drie `h3`'s (r.379).
5. Hoe overstappen werkt (r.412).
6. Eén CTA (r.447).

**Componenten.**

| Herkomst | Component | Inzet |
|---|---|---|
| HERGEBRUIK | `.vh-proc-stappen` (`index.html:551-608`) | "Van plan naar prestatie" — dit is letterlijk de aanpak die A7 uitlegt |
| HERGEBRUIK | `.vh-infra-vdl` drie waardedrijvers (`index.html:882-895`) | sectie 04 |
| HERGEBRUIK | `.vh-proof-a` vertrouwensblok met twee organisaties (`index.html:795-814`) | **de enige pagina waar een rij van twee klanten niet schraal oogt**, want de pagina gaat over het bedrijf zelf en niet over een sector |
| HERGEBRUIK | `.vh-ctrl-feats` vier kenmerken met icoon (`index.html:720-744`) | de vier principes van `over-ons.html:480-523` |
| BESTAAND | `.band-dark` sectiewissel, `.stats-row` lege-cijferstructuur (`over-ons.html:542-559`), `.team-card` zonder namen en portretten (r.566-585) | |

**Mogelijke sectievolgorde.** 01 Hero (tekst) → 02 Probleem → 03 Waar partijen stoppen → 04 Onderscheid → 05 Aanpak/overstappen → 06 Track record (pas zichtbaar als gevuld) → 07 CTA.

**Conversiepatroon.** Eén CTA-sectie aan het eind naar contact. **Geen** sticky `.mcta` (gemeten: beide pagina's hebben er nul), **geen** leadpopup, **geen** FAQ. Aanbeveling: zo laten — dit archetype is een leesstuk, geen trechter. Of het Calendly-patroon (`data-calendly`) hier hoort, is nog niet beslist: geen van beide pagina's draagt het nu. Zie DR-06.

**Bewijsvereisten.** `over-ons.html:532` is de norm die de hele site zou moeten volgen: de sectie Track record staat op `hidden` met de motivering op r.539. De teamblokken noemen alleen rollen, geen namen en geen portretten (`over-ons.html:566-585`) — er zijn ook geen portretfoto's in de repository. Geen klantlogo's: er staat geen enkel logobestand van een derde partij in deze repository (`index.html:789-794`).

**Fotografie.** `assets/waarom-vibe-hero.jpg` en `assets/over-ons-hero.jpg` zijn de enige twee beelden die deze pagina's gebruiken. Er is geen kantoor-, team- of portretfotografie. Vul dat gat met eigen installatiefotografie uit `assets/projects/`, niet met stockbeelden van mensen.

**NIET van de homepage kopiëren.**

| Wat | Reden |
|---|---|
| De `.vh-kpi` bewijsstrook | A7 is juist de plek waar het ontbreken van cijfers bewust is en wordt uitgelegd (`over-ons.html:539`). Een cijferstrook erboven breekt precies dat argument. |
| De VIBE.CONTROL-console met voorbeeldwaarden (`index.html:657-688`) | Een pagina die zegt "wij zijn geen softwarebedrijf" (`waarom-vibe.html:340`) mag niet openen met een dashboard. |
| De `.vh-final` afspraakkaart met dubbele CTA (`index.html:996-1001`) | Te transactioneel voor een leesstuk; één afsluitende CTA volstaat. |
| De ingebakken header/footer | Zie A1. |

---

### A8 · Contact / conversie — 1 pagina

> **B-toewijzing V1.0: B6 · Conversie-instrument, variant *formulier met kanaalkeuze*.** `contact.html` is de master van B6 (migratiestap 4). De herbouw als echte HTML is daarmee belegd — zie DR-02.

**Doel.** De transactiepagina: gesprek plannen, mailen, bellen of formulier sturen. Eindpunt van vrijwel elke CTA op de site; `href="contact"` komt in alle andere archetypes voor.

**Pagina.** `contact.html` — `<title>` r.19 "vibe·energy — Contact".

**REGRESSIE, eerst oplossen.** Dit is geen HTML-pagina maar een bundler-artefact van **409.619 bytes** in 229 regels. De hele pagina staat als JSON-geëscapete string in `<script type="__bundler/template">` (`contact.html:225-227`); regel 226 alleen is **92.788 tekens** lang. De `<noscript>` zegt letterlijk "This page requires JavaScript to display" (`contact.html:40`). De pagina laadt `_header.js` noch `_footer.js` (gemeten) en heeft geen enkele stylesheet-link. De belangrijkste conversiepagina van de site rendert niet zonder JavaScript en is onindexeerbaar. Herbouw als echte HTML is een **voorwaarde** voor B6, geen verbetering — en die herbouw is onder DR-02 belegd als migratiestap 4, met `contact.html` als master van B6.

**Aanbevolen hero.** Korte tekst-hero zonder foto. Overweeg de hero en sectie 02 samen te voegen zodat de drie kanalen boven de vouw staan — het formulier moet zo hoog mogelijk.

**Informatiehiërarchie.**

1. Dat dit de contactpagina is — `h1` "Neem contact op." (in de template).
2. De vier kanalen, gelijkwaardig naast elkaar — "Kies de manier die u past." met de kaarten "Plan een gesprek." / "E-mail." / "Telefoon.".
3. Het formulier: naam, bedrijf, e-mail, telefoon (optioneel), bericht.
4. Bedrijfsgegevens — "Officieel. Volledig traceerbaar."
5. De uitwijk voor wie niet weet waar te beginnen → netcongestie-check.

De vijf `data-screen-label`-waarden in de template zijn: 01 Hero, 02 Opties, 03 Formulier, 04 Bedrijfsgegevens, 05 CTA.

**Componenten.**

| Herkomst | Component | Inzet |
|---|---|---|
| HERGEBRUIK | `.vh-final-kaart` afspraakkaart met `data-calendly` (`index.html:996-1001`) | de kanaalkaart "Plan een gesprek" |
| HERGEBRUIK | `.vh-final-vdl` drie bewijsitems (`index.html:979-992`) | direct naast het formulier |
| HERGEBRUIK | `.vh-footer-contact` adres/telefoon/e-mail met iconen (`index.html:1047-1060`) | sectie 04 |
| BESTAAND | `.form-card` met `novalidate` en eigen validatie, `.opt-tag` voor optionele velden | |

**Mogelijke sectievolgorde.** 01 Hero + kanalen samengevoegd → 02 Formulier → 03 Bedrijfsgegevens → 04 Uitwijk-CTA. Vier secties; een contactpagina hoort kort te zijn.

**Conversiepatroon.** Vier parallelle kanalen zonder rangorde: Calendly, e-mail, telefoon, formulier. Geen leadpopup, geen sticky `.mcta`.

**Bewijsvereisten.**
- Contactbelofte: **48 uur** voor een algemeen contactverzoek, niet 24 (`index.html:975-978`).
- Gepubliceerde gegevens: telefoon `+31 85 060 0489` (`index.html:1054`), `info@vibeenergy.nl` (`index.html:1058`), adres Utrechtseweg 310, 6812 AR Arnhem (`index.html:1050`), KvK 92191487 en BTW NL865924910B01 (`index.html:1121`).
- **Velperweg 37 en +31 88 303 7300 staan nergens in deze repository** en zijn niet gepubliceerd (`index.html:1031-1033`; gemeten: 0 treffers op "Velperweg" in `contact.html`).

**Fotografie.** Geen; de pagina gebruikt op dit moment geen enkel beeld. Hooguit één rustig locatiebeeld bij sectie 04. Geen stockbeeld van mensen aan een bureau.

**NIET van de homepage kopiëren.**

| Wat | Reden |
|---|---|
| De `.vh-kpi` bewijsstrook | Zie A1; bovendien is elke klikbare afleiding naast een formulier verlies. |
| De VIBE.CONTROL-console | Idem: een demo boven een formulier kost invullingen. |
| De negen-sectie-opbouw van de homepage | Een contactpagina hoort kort te zijn; vier secties. |
| De ingebakken header/footer | Deze pagina laadt nu géén van beide en heeft dus helemáál geen navigatie — de oplossing is `_header.js` en `_footer.js`, niet de homepage-header overnemen. |

---

### A9 · Tool / assessment (lead-gen wizard) — 1 pagina

> **B-toewijzing V1.0: B6 · Conversie-instrument, variant *wizard met scoreuitkomst*.** De twee B6-varianten delen de bouw maar niet de conversielogica: *formulier* biedt vier gelijkwaardige kanalen zonder rangorde, *wizard* biedt precies één pad en verbiedt elke afleiding. Dat verschil is de reden dat B6 varianten kent en geen eenvormige template is.

**Doel.** Een kwalificerende zelfdiagnose die een risicoscore en een rapport oplevert, in ruil voor een volledig ingevuld leadprofiel. Dit is de primaire CTA van A1, A2, A3, A4, A5 en A6 — de zwaarst belaste conversieroute van de site.

**Pagina.** `netcongestie-check.html` — r.16 "Gratis Netcongestie Check voor uw locatie"; `<h1>` r.216 "Loopt uw aansluiting tegen het net aan?"; eyebrow r.215 "Gratis tool · ± 2 minuten".

**Aanbevolen hero.** Korte tekst-hero met drie beloftes (`netcongestie-check.html:218`: "6 stappen" / "Direct resultaat" / "Gratis rapport binnen 24 u"), geen foto. **Behouden en desnoods verder inkorten:** elke pixel boven de wizard kost invullingen. De homepage-hero is hier van alle archetypes het schadelijkst.

**Informatiehiërarchie.**

1. Wat de tool beantwoordt — `h1` (r.216).
2. Wat de uitkomst is en wat hij níet is — "indicatieve netcongestie-risicoscore" (r.217). Die kwalificatie is inhoudelijk verplicht: er wordt geen meting gedaan.
3. Wat het kost aan tijd en geld (r.218).
4. De wizard zelf, meteen daaronder.
5. Het scorepaneel.
6. De bevestiging.

**Wizardstructuur (gemeten, `netcongestie-check.html:248-280`).**

| Stap | Titel | Velden |
|---|---|---|
| 1 | Bedrijfsgegevens | bedrijf, naam, e-mail, tel, postcode, huisnr, functie (r.250-256) |
| 2 | Aansluiting & verbruik | aansluiting, verbruik, rekening (r.259-261) |
| 3 | Netcongestie-problemen | meervoudige checkbox (r.264) |
| 4 | Verduurzaming | zon, zonGrootte (conditioneel via `showIf`, r.268), laadpalen, laadpunten (conditioneel, r.270), batterij |
| 5 | Groei & toekomst | geplande uitbreidingen (r.274) |
| 6 | Directe besparingsscan | doel, startmoment (r.277-278) |

**Componenten.**

| Herkomst | Component | Inzet |
|---|---|---|
| HERGEBRUIK | `.vh-proc-stappen` badge 01-04 met chevrons (`index.html:551-608`) | visuele grammatica voor de voortgangsbalk — de site heeft dat stappenidioom al |
| HERGEBRUIK | `.vh-proof-kaart` met `<dl>`-cijferrij (`index.html:845-854`) | vorm voor het scorepaneel (r.404) |
| HERGEBRUIK | `.vh-final-vdl` drie bewijsitems (`index.html:979-992`) | onder het formulier |
| BESTAAND | `.nc-card` wizardkaart (r.316), `.nc-prog` segmentbalk (r.317), `.opt` keuzeknoppen met checkmark, conditionele velden via `showIf`, `.err-msg` per stap | |

**Mogelijke sectievolgorde.** 01 Hero (kort) → 02 Wizard → 03 Resultaat → 04 Bevestiging. Vier schermen, geen vijfde.

**Conversiepatroon.** Eén enkel pad: de wizard. Geen concurrerende CTA, geen sticky `.mcta`, geen leadpopup — correct, want de pagina ís de leadmagneet. **Openstaand:** stap 1 vraagt bedrijf, naam, e-mail, telefoon, postcode, huisnummer en functie (r.250-256) vóórdat enige waarde is geleverd. Zie DR-08.

**Bewijsvereisten.**
- De hero belooft "Gratis rapport binnen 24 u" (r.218). Dit is de enige plek op de site waar 24 uur is toegestaan; overal elders geldt 48 uur (`index.html:975-978`).
- Het resultaat heet expliciet "indicatieve netcongestie-risicoscore" (r.217); die kwalificatie moet blijven staan.
- **Gemeten derde waarde:** het bevestigingsscherm belooft "binnen één werkdag contact" (`netcongestie-check.html:477`). Dat is een derde termijn naast 24 u en 48 u. Zie DR-13.

**Fotografie.** Geen. Zo houden. Als er beeld bij moet, pas ná het resultaat, bij de vervolgstap.

**NIET van de homepage kopiëren.**

| Wat | Reden |
|---|---|
| De volledige homepage-hero (`index.html:77-206`) | Die duwt de wizard onder de vouw. Op een pagina waarvan de hele waarde in stap 1 zit, is dat het duurste dat je kunt doen. |
| De `.vh-kpi` bewijsstrook en de vertrouwensrij | Elke extra klikbare afleiding naast een wizard verlaagt de voltooiing; beide zijn volledig klikbaar. |
| De negen-sectie-opbouw | Vier schermen is de maat. |
| De ingebakken header/footer | Deze pagina draait op `_header.js` én heeft daarnáást een eigen kopie van de nav-dropdownlogica inline (`netcongestie-check.html:231-242`). Dat duplicaat moet weg, niet vervangen worden door een derde header. |

---

### A10 · Executive Guide / brochuredocument (A4) — 7 pagina's

> **B-toewijzing V1.0: S2 · Executive Guide — een gated documentsysteem, GEEN publiek archetype (C-03).** S2 staat bewust náást B1..B7 en niet erin. `netcongestie-oplossen.html` is de master van S2 (migratiestap 7). Concrete gevolgen van C-03: deze zeven documenten verdwijnen uit de hoofdnavigatie (`_header.js:24`, `:28`, `:29`), uit de homepage-footernavigatie (`index.html:1075-1076`), uit interne knoplinks (`oplossing-netcongestie.html:146`) en uit `sitemap.xml` (r.16, r.118, r.124) — ze worden uitsluitend via de leadflow ontsloten. **De guide-inhoud zelf blijft behouden.** Onder C-06 geldt daarbij NO ASSET → NO DOWNLOAD PROMISE: er bestaat geen PDF, dus er mag er geen beloofd worden.

**Doel.** Geen webpagina maar een afdrukbaar verkoopdocument van acht tot negen A4-pagina's, dat als beloning uit de leadflow van B2 · *Oplossing* komt.

**Volstrekt eigen systeem.** `report.css` rekent in `width:210mm` / `height:297mm` (`report.css:29`) met `@page{size:A4}` (`report.css:399`), paginanummering en kop-/voetregels per pagina. Gemeten: geen van de zeven laadt `_header.js`, `_footer.js`, `_consent.js` of `_clarity.js` — ze hebben dus geen navigatie, geen footer, geen cookiebanner en geen analytics.

**Pagina's.**

| Bestand | Pagina's | `data-brochure-slug` | In `api/server.js:33-39`? | In `sitemap.xml`? |
|---|---:|---|---|---|
| `netcongestie-oplossen.html` | 8 | `netcongestie` (r.100) | ja (r.38) | nee |
| `exploitatie-zonder-investering.html` | 8 | `exploitatie` (r.130) | ja (r.35) | nee |
| `energielabel-verhogen.html` | 8 | `energielabel` (r.124) | ja (r.36) | nee |
| `laadplein-zonder-verzwaring.html` | **9** | `laadplein` (r.112) | ja (r.37) | nee |
| `energie-als-vastgoedopbrengst.html` | 8 | `vastgoedopbrengst` (r.107) | ja, maar onder de key `home` (r.34) | **ja**, r.16 |
| `capaciteit-als-dienst.html` | 8 | `meer-capaciteit` (r.126) | **nee** | **ja**, r.118 |
| `energiehandel-flexmarkten.html` | 8 | `energiehandel` (r.120) | **nee** | **ja**, r.124 |

**Aanbevolen "hero".** Een coverpagina, geen hero: `.page.dark` met achtergrondbeeld, logo, kicker "Executive Guide" + "Editie 2026" (`netcongestie-oplossen.html:110`), documenttitel, covertitel, lead, `.strip` met vier genummerde beloftes en een voetregel met bedrijf en domein (`netcongestie-oplossen.html:103-129`).

**NIET vernieuwen naar Master v1.** Een A4-document en een responsieve webpagina hebben tegengestelde eisen: vaste mm tegenover fluid cqw, paginabreuk tegenover scroll. Laat `report.css` een apart, expliciet gedocumenteerd tweede systeem zijn.

**Informatiehiërarchie (documentvolgorde).** P1 Cover → P2 Het probleem → P3 De oplossing (hub-diagram met `.grid-node`, `.ems`, `.fan5` van vijf knopen, uitkomst-node, `netcongestie-oplossen.html:174-203`) → P4-P7 verdieping, tabellen, resultaten → P8 (of P9) afsluiting en contact.

**Componenten — eigen systeem, geen Master v1.** `report.css` levert `.page`, `.rhead`, `.rfoot`, `.pnum`, `.sec-head`, `.checks.pos/.neg`, `.callout`, `.tbl-title`, `.fig.fig-frame`, `.hub` met `.fan5`, `.cover-title`, `.strip`, `.cdoc`.

**Levering.** `api/server.js:33-39` bevat een whitelist met vijf brochures; de client levert alleen het id, URL en titel komen altijd van de server (`api/server.js:31-32`). Verzending via Resend, met rate limiting per IP (5 per 10 min) en per e-mailadres (3 per 10 min) (`api/server.js:42-44`).

**C-06 · Delivery moet aantoonbaar werken — gemeten stand.** Elk van de vijf whitelist-sleutels wijst met zijn `doc:`-veld naar een **`.html`-guidepagina**, niet naar een PDF (`api/server.js:34-38`). Dat is consistent met de vijf `window.VIBE_LEAD`-configuraties op de site (§0.5). Wat níet klopt: alle zeven documenten dragen een `data-brochure-file`-attribuut met een PDF-bestandsnaam die nergens bestaat — bijvoorbeeld `netcongestie-oplossen.html:100` en `laadplein-zonder-verzwaring.html:112` (inclusief de tikfout "zodner"). Dat is dode metadata die een bestand suggereert dat er niet is; onder NO ASSET → NO DOWNLOAD PROMISE moet het bij migratie weg of kloppend worden gemaakt. Twee documenten — `capaciteit-als-dienst.html` en `energiehandel-flexmarkten.html` — worden door géén enkele leadconfig aangeboden en staan ook niet in de serverwhitelist; zij zijn op dit moment onbereikbaar via de leadflow en tegelijk wél publiek geïndexeerd (`sitemap.xml:118`, `:124`). Dat is exact de omgekeerde situatie van wat C-03 voorschrijft.

**C-06 · Zakelijke bestemming in plaats van een persoonlijk adres.** Alle zeven documenten tonen in hun contactblok `mailto:mounir@vibeenergy.nl`: `capaciteit-als-dienst.html:500`, `energie-als-vastgoedopbrengst.html:449`, `energiehandel-flexmarkten.html:485`, `energielabel-verhogen.html:467`, `exploitatie-zonder-investering.html:451`, `laadplein-zonder-verzwaring.html:537`, `netcongestie-oplossen.html:478`. De server routeert al wél zakelijk (afzender `no-reply@vibeenergy.nl`, leadmelding naar `sales@vibeenergy.nl`) en de site voert `info@vibeenergy.nl` (`index.html:1058`). Bij migratie van S2 gaan deze zeven mailto's naar de zakelijke centrale bestemming. **NU GEEN productiecode wijzigen.**

**Conversiepatroon.** Geen. Dit ís de beloning, niet de vraag. De conversie gebeurt in A2 via `_leadpopup.js`, dat naam, e-mail en telefoon opvraagt en het document daarna automatisch in een nieuw tabblad opent (`_leadpopup.js:240`); de download is de primaire levering, de mail secundair (`_leadpopup.js:254-255`).

**Bewijsvereisten.** Deze documenten staan het verst van de bewijsdiscipline van Master v1 af en zijn het minst gecontroleerd. Ze dragen een editieaanduiding "Editie 2026" (`netcongestie-oplossen.html:110`) die jaarlijks veroudert. Elk cijfer erin moet dezelfde toets doorstaan als op de site zelf. **Dat is in deze sessie NIET geverifieerd** — de inhoud van de zeven documenten is niet cijfer voor cijfer nagelopen.

**Fotografie.** Eigen map `img/` in plaats van `assets/`: 11 bestanden gemeten, waaronder `img/hero-a.jpg` en `img/bess-cabinets.jpg` met bijschrift "Gerealiseerd · Vibe Energy BESS-cabinetten op locatie" (`netcongestie-oplossen.html:158-161`). Logo via `logo-header-white.png` in de repositorywortel. Deze documenten delen dus geen enkele asset-conventie met de rest van de site.

**NIET van de homepage kopiëren — hier geldt het omgekeerde in beide richtingen.** Kopieer niets van Master v1 hierheen, en niets hiervandaan naar de site. Concreet niet overnemen:

| Wat | Reden |
|---|---|
| De `--vibe-*` tokenlaag (`home.css:29-71`) | Rekent in `cqw` op een containerschaal; een A4-document rekent in mm. `--vibe-radius-kaart:.5637cqw` heeft in een 210mm-doos geen betekenis. |
| De scroll-gedreven secties, de sticky CTA, de leadpopup, het gedeelde menu | Een document heeft paginabreuken, geen scrollpositie; en het is al de beloning, dus het vraagt niets meer. |
| Omgekeerd: `report.css`-componenten naar de site | `.page{width:210mm;height:297mm}` (`report.css:29`) breekt elke responsieve compositie. |

Wat wél moet gebeuren is de classificatiefout herstellen: drie van deze documenten staan als gewone webpagina in de navigatie. **Onder C-03 is die keuze gemaakt — optie B: ze verdwijnen uit navigatie, footer, interne links en sitemap.** Zie DR-02b, status DECIDED — V1.0.

---

### A11 · Juridisch — 2 pagina's

> **B-toewijzing V1.0: B7 · Juridisch document.** `privacy.html` is de master van B7 (migratiestap 6). B7 mag niet bij B5 worden gevoegd: beide B5-pagina's sluiten af met een CTA-sectie (`waarom-vibe.html:447`, `over-ons.html:591`) en een juridisch document met een conversieknop is een vertrouwensprobleem.

**Doel.** Verplichte, statische, doorzoekbare tekstdocumenten. Geen conversie, geen overtuiging; uitsluitend vindbaarheid en leesbaarheid.

**Pagina's.** `privacy.html` (r.15 "Privacyverklaring — Vibe Energy"; `<h1>` r.72; tien genummerde artikelen r.80-137) en `algemene-voorwaarden.html` (r.15; `<h1>` r.70; dertien artikelen r.78-208).

**Aanbevolen hero.** Eenvoudige tekstband: `.lg-hero` met `.lg-eyb`, `h1` en `.lg-updated` datumregel (`privacy.html:69-74`). Behouden, hooguit de Vibe-geometrie als smalle accentband.

**Informatiehiërarchie.**

1. Welk document dit is — `h1`.
2. Wanneer het voor het laatst is bijgewerkt — `.lg-updated`, direct onder de `h1`.
3. Inhoudsopgave met ankers (**aanbevolen toevoeging**: `algemene-voorwaarden.html` heeft dertien artikelen en geen enkel navigatiemiddel).
4. De genummerde artikelen.

**Componenten.**

| Herkomst | Component |
|---|---|
| HERGEBRUIK | alleen de typografie en de tokenlaag van Master v1: Urbanist (`home.css:83`, `104-111`), `--vibe-navy` voor koppen (`home.css:41`), `--vibe-body` voor lopende tekst (`home.css:43`) |
| BESTAAND | `.lg-hero`, `.lg-eyb`, `.lg-updated`, `.lg-body` — vier klassen, meer is niet nodig |
| NIEUW, aanbevolen | ankernavigatie boven `.lg-body` |

**Mogelijke sectievolgorde.** 01 Hero → 02 Inhoudsopgave → 03 Body. Drie secties.

**Conversiepatroon.** Geen. Uitsluitend de gedeelde footer uit `_footer.js`.

**Bewijsvereisten.** Juridische tekst wordt niet herschreven voor de vormtaal. De `.lg-updated`-datum moet kloppen. KvK 92191487 en BTW NL865924910B01 zijn de geverifieerde registratiegegevens (`index.html:1121`). **Bestaande tekstfout:** `algemene-voorwaarden.html:201` en r.208 tonen `h2`-koppen waarin de artikelkop en de eerste alinea aan elkaar geplakt zitten — "Artikel 11. Overmacht1. Onder overmacht wordt verstaan…" respectievelijk "Artikel 13. Forum-, rechtskeuze en overdracht van rechten1. Vibe Energy B.V. is bevoegd…".

**Fotografie.** Geen. Niet toevoegen.

**NIET van de homepage kopiëren — alles behalve de tokenlaag en de letter.**

| Wat | Reden |
|---|---|
| Hero-geometrie met foto (`index.html:77-206`) | Een juridisch document met een productfoto in de kop leest als marketing en ondermijnt de status van de tekst. |
| De `.vh-kpi` bewijsstrook | Zie A1. |
| Sectorkaarten, CTA-secties, de `.vh-final` afspraakkaart, sticky `.mcta`, leadpopup | Een juridische pagina met een conversieknop is een vertrouwensprobleem: de bezoeker is daar om te controleren, niet om te kopen. |

---

## 4 · ARCHITECTUUR V1.0 — de reductie is genomen

**DR-00 · Consolidatie van 12 archetypes naar 7 bouwtypes + 1 documentsysteem — DECIDED — V1.0.**
De geaccepteerde architectuur is **B1 · B2 · B3 · B4 · B5 · B6 · B7 + S2**. Het alternatief (acht webtypes door B6 te splitsen in contact en wizard) is afgewezen: het verschil tussen die twee is conversielogica, en dat is precies wat een *variant* binnen een bouwtype hoort te dragen. Dit is geen voorstel meer en mag nergens in dit document nog als DECISION REQUIRED verschijnen.
*Motivering:* zes van de twaalf archetypes droegen één of twee pagina's (§1.2b) terwijl de site maar zeven bouwfamilies kent (§0.2); twaalf specificaties onderhouden voor 43 pagina's kost meer dan het oplevert, en de redactionele verschillen blijven als varianten volledig behouden.

**De onderbouwing die tot dit besluit leidde, blijft staan.** Twaalf archetypes betekende twaalf specificaties, twaalf reviewsporen en twaalf plekken waar dezelfde hero opnieuw werd beschreven — terwijl A1, A2, A3 en A4 gemeten dezelfde `.phero` gebruiken (`oplossing-netcongestie.html:65-83`), dezelfde `.mcta`-breedtegrens (`subpage.css:262-266`), dezelfde `.faq-grid` en dezelfde 8-tot-11-sectie-ruggengraat. Tegelijk is het onderscheid tussen die vier **redactioneel echt**: A1 opent met drie technische pijnpunten (`systeem-ems.html:96-98`), A2 met een vraag-aanbod-vergelijking (`oplossing-netcongestie.html:95-118`), A3 met zes sectorspecifieke uitdagingen onder eigen labels (`industrie-logistiek.html:96-101`), A4 met een schaalniveauvraag (`energy-hubs.html:134`). Dat verschil blijft bestaan — als variant binnen B2, niet als vier losse bouwspecificaties.

### 4.1 De architectuur: 7 bouwtypes + 1 gated documentsysteem — DECIDED — V1.0

| Bouwtype | Vervangt | Pagina's | Redactionele varianten binnen het type |
|---|---|---:|---|
| **B1 · Startpagina** | A0 | 1 | — |
| **B2 · Propositiepagina** | A1 + A2 + A3 + A4 | 17 | *Systeem* (eyebrow "Systeem · X", 3 pijnpunten, trust-row = specs, geen leadpopup) · *Oplossing* (eyebrow "Oplossing · X", `.vs-grid`, trust-row = uitkomsten, leadflow) · *Sector* (eyebrow "Voor X", 6 uitdagingen met labels, extra sectie "Waarom Vibe") · *Gebied* (eyebrow = schaalniveau, onderscheidsectie locatie-vs-gebied) |
| **B3 · Casepagina** | A5 | 11 | *asset* (`.mc-core`) · *portefeuille* (`.pc-impact`) |
| **B4 · Indexpagina** | A6 | 1 | — |
| **B5 · Standpuntpagina** | A7 | 2 | — |
| **B6 · Conversie-instrument** | A8 + A9 | 2 | *formulier met kanaalkeuze* · *wizard met scoreuitkomst* |
| **B7 · Juridisch document** | A11 | 2 | — |
| **S2 · Executive Guide** — gated documentsysteem op `report.css`, **geen publiek archetype** (C-03) | A10 | 7 | — |

**Een bouwtype is GEEN rigide template.** Het bepaalt informatiehiërarchie, beschikbare componentfamilies, proof requirements, CTA-strategie en responsive principes — **niet** een vaste sectievolgorde of een identieke layout. Twee B2-pagina's mogen er verschillend uitzien zolang zij dezelfde hiërarchie, dezelfde componentfamilies en dezelfde proofregel eerbiedigen.

**Waarom B2 verdedigbaar is.** De vier samengevoegde archetypes delen gemeten: dezelfde bouwfamilie BF2, dezelfde hero-anatomie, dezelfde `.mcta`-breedtegrens 760px (die onder C-04 vervalt), dezelfde FAQ, dezelfde primaire CTA. Ze verschillen in eyebrowtekst, in de inhoud van sectie 02, in de inhoud van de trust-row, in de proofregel en in de aanwezigheid van de leadflow. Dat zijn configuratieknoppen, geen vier bouwwerken.

**Waarom B6 één type is en geen twee.** `contact.html` en `netcongestie-check.html` delen: geen `.phero`, geen foto, geen `.mcta`, geen leadpopup, één instrument per pagina. Ze verschillen in conversielogica — contact biedt vier gelijkwaardige kanalen zonder rangorde, de wizard biedt precies één pad en verbiedt elke afleiding. Dat verschil is vastgelegd als **variant**, niet als tweede bouwtype.

**Wat níet samen mag.** B7 mag niet bij B5: `over-ons.html:591` en `waarom-vibe.html:447` sluiten af met een CTA-sectie, en een juridisch document met een conversieknop is een vertrouwensprobleem. S2 mag niet bij enig webtype: `report.css:29` rekent in `width:210mm`/`height:297mm`, alle webtypes in `cqw`.

### 4.1a Ritmepatroon per bouwtype — V1.1, additief

Een bouwtype blijft geen rigide template (§4.1 hierboven, `§1A.3` punt 2 — ongewijzigd). Wat V1.1 toevoegt is geen sectievolgorde maar een **aanbevolen ritme**: per sectie een niveau (HIGH IMPACT / MEDIUM / QUIET) en een compositiefamilie `C1`-`C12`. De patronen hieronder zijn letterlijk overgenomen uit `docs/vibe-section-compositions-v1.md §6.3`; de niveaudefinities staan daar in `§6.1`, het gemeten ritme van Master v1 in `§6.2` en de twee verboden reeksen in `§6.4`. Er is hier geen patroon bedacht: waar §6.3 er geen geeft, staat dat als open punt.

| Bouwtype | Aanbevolen ritmepatroon (`vibe-section-compositions-v1.md §6.3`) | Omvang |
|---|---|---|
| **B1 · Startpagina** | **Geen patroon in §6.3** — B1 **is** Master v1 en wordt niet herbouwd (§4.5 hier, `§1A.11` punt 3). Het **gemeten** ritme van B1 staat in `§6.2`: `HIGH C1 · MEDIUM C2 · HIGH C3 · QUIET C4+C5 · MEDIUM C6 · MEDIUM C7+C8 · MEDIUM C9 · HIGH C10 · QUIET C11`. Dat is de referentie waartegen de andere bouwtypes worden gelezen, geen bouwopdracht. | 9 secties, 3 HIGH |
| **B2 · Propositiepagina** | `1 HIGH C1 · 2 QUIET C7 · 3 MEDIUM C2 · 4 MEDIUM C4 · 5 QUIET C5 · 6 HIGH C3 · 7 MEDIUM C9 · 8 QUIET C12 · 9 MEDIUM C6 of C4 · 10 QUIET C12 · 11 HIGH C10 · 12 QUIET C11` | 10-12 secties, **exact 3 HIGH** |
| **B3 · Casepagina** | `HIGH C1 · MEDIUM C4 · HIGH C3 · MEDIUM C8 · QUIET C5 · QUIET C12 · MEDIUM C2 · HIGH C10 · QUIET C11` | 8-10 secties, 2-3 HIGH |
| **B4 · Indexpagina** | `HIGH C1 · MEDIUM C2 · QUIET C7 · MEDIUM (de lijst) · QUIET C5 of leegte · HIGH C10 · QUIET C11` | 5-7 secties, 2 HIGH |
| **B5 · Standpuntpagina** | `HIGH C1 · QUIET (proza in C4 zonder kaart) · MEDIUM C4 · QUIET C5 · MEDIUM C8 · QUIET C7 · MEDIUM C2 · HIGH C10 · QUIET C11` | 7-9 secties, 2 HIGH |
| **B6 · Conversie-instrument** | `MEDIUM (gereduceerde opening) · HIGH C6 · QUIET C7 · QUIET C12 · QUIET C11` — **geen `C10`**: het instrument *is* de conversie, een tweede CTA-sectie is een afleiding. De opening is geen beeldpodium maar kop-plus-lead, omdat `C1` een LCP-beeld inbrengt dat op een formulierpagina niets doet. | 4-6 secties, 1 HIGH |
| **B7 · Juridisch document** | **DECISION REQUIRED — §6.3 geeft geen patroon voor B7.** Wat wél uit `§4` volgt: `C12` (register/FAQ) en `C11` (footer) zijn expliciet geschikt; `C1`, `C7`, `C9` en `C10` zijn expliciet ongeschikt — `C10` omdat een juridisch document met een conversieknop een vertrouwensprobleem is (dezelfde grond als "Wat níet samen mag" hierboven). De overige families noemen B7 niet en zijn dus niet vrijgegeven. *Reden dat het openstaat:* Master v1 bevat geen juridische pagina, dus er is geen gemeten precedent om een ritme uit af te leiden. Te beslissen bij master 6 (`privacy.html`, §4.5). | — |
| **S2 · Executive Guide** | **DECISION REQUIRED — §6.3 geeft geen patroon voor S2, en dat is consistent:** S2 is geen publiek webtype (C-03) en `report.css:29` rekent in `mm`, terwijl het hele compositiesysteem in `cqw` per referentiecanvas rekent (`§2` daar). `C1` noemt S2 op die grond expliciet ongeschikt. *Reden dat het openstaat:* een ritmesysteem voor een A4-document is een ander stelsel, niet een variant op dit stelsel. Te beslissen bij master 7 (de gated guides, §4.5). | — |

**Varianten binnen B2.** Het patroon is per variant afwijkend, en die afwijkingen zijn vastgeknoopt aan de proofregels in §4.2 hieronder — ze zijn dus bindend, niet smaakvol:

- *SYSTEM* — slot 3 draagt de drie technische pijnpunten; **slot 8 is verplicht** en draagt de specificaties, want dat is de proofregel van deze variant. Bestaat er geen eigen case, dan vervalt slot 6 en heeft de pagina **twee** HIGH: drie is een maximum, geen minimum.
- *SOLUTION* — slot 3 draagt de vraag/aanbod-vergelijking; **slot 6 is verplicht**. Een oplossingspagina zonder projectbewijs is een belofte, geen propositie (§4.2, proofregel SOLUTION).
- *SECTOR* — slot 7 draagt de zes sectoruitdagingen onder eigen labels; slot 6 alleen met een case **in die sector** volgens de canonieke taxonomie van §0.4, anders `CASE PROOF = PENDING` en géén casesectie.
- *GEBIED* — slot 6 vervalt bij gebrek aan lokale onderbouwing en slot 5 krijgt dan extra gewicht. Geen gesuggereerd bewijs (§4.2, proofregel GEBIED; DR-10).

**Twee reeksen die op elk bouwtype verboden zijn** (`§6.4` daar): `HIGH · HIGH · HIGH · HIGH` — vier ankerrollen op één pagina bestaan niet, de gemeten bovengrens is drie — en vier GENERIEKE secties achter elkaar, waarbij een sectie GENERIEK heet als zij aan alle vier deze voorwaarden tegelijk voldoet: tweedeling binnen 46/54-54/46 of een gelijkverdeeld raster; dezelfde containerbreedte als de vorige sectie; een achtergrondstap van ΔRGB ≤ 11 per kanaal of een harde flip zonder vormdrager; nul cross-element-overlappingen.

**Hoe dit wordt afgedwongen:** `vibe-migration-checklist-v1.md §2.0` eist het compositieplan vóór implementatie, `§5 P13` daar toetst de zestien anti-patronen na afloop.

### 4.2 B2-proofregels per variant — DECIDED — V1.0, expliciet en bindend

Elke B2-variant heeft een **eigen bewijsketen**. Dit is het onderdeel van B2 dat níet configureerbaar is: een variant die zijn proofregel niet kan vullen, mag de bijbehorende sectie niet tonen.

| Variant | Proofregel | Wat dat concreet betekent | Waar het bewijs vandaan komt |
|---|---|---|---|
| **SYSTEM** | **productspecificaties / technische onderbouwing** | De pagina bewijst met wat het ding *is* en *doet*: specificaties, mechanisme, technische randvoorwaarden. De trust-row draagt **systeemspecs**, geen uitkomstcijfers. Elk cijfer een `.src`-bronregel, patroon `oplossing-netcongestie.html:229` | productspecificatie = primaire bron (VERIFIED). Geen bedrijfsbreed cijfer; het enige onderbouwde beschikbaarheidsgetal is een contractuele 99,5% SLA voor laadpalen, géén gemeten uptime (`index.html:215-216`) |
| **SOLUTION** | **probleem → oplossing → projectbewijs** | De keten moet volledig zijn. Opent met de pijn (`.vs-grid` vraag/aanbod, `oplossing-netcongestie.html:95-118`), dan het alternatief, dan **een echte case**. Een oplossingspagina zonder projectbewijs is een belofte, geen propositie | uitsluitend de 11 bestaande `project-*.html`. Er is geen twaalfde case. De businesscase in sectie 07 eindigt verplicht met de disclaimer op `oplossing-netcongestie.html:247` |
| **SECTOR** | **sectorprobleem → toepassing → sectorcase** | De case moet in **díe** sector vallen, volgens de canonieke taxonomie van §0.4. Geen case in die sector = geen casesectie. Voor Logistiek & transport en VvE geldt nu **CASE PROOF = PENDING** | het canonieke sectorlabel van de casepagina zelf (`.pc-loc`, alle 11 gemeten). Niet het kaartattribuut, niet het kruimelpad |
| **GEBIED** | **lokale relevantie → toepasselijke oplossing → echte lokale/projectonderbouwing waar beschikbaar** | "Waar beschikbaar" is de kern: is er geen lokale of gebiedscase, dan wordt er geen gesuggereerd. De pagina mag de propositie uitleggen zonder bewijs te fingeren | er bestaat op deze commit **geen multi-pand-case**: elke `.pc-loc` noemt exact één locatie. De claim van `energy-hubs.html:228` is daarmee **UNVERIFIED** (DR-10) |

**WAARSCHUWING — geen generieke SEO-doorwaytemplate.** De grootste faalmodus van B2 is dat de vier varianten tot één invulformulier verschrompelen: één layout, één tekstskelet, en per pagina alleen een ander zelfstandig naamwoord in kop, eyebrow en meta. Dat levert doorwaypagina's op — pagina's die bestaan om een zoekterm te vangen en verder niets bewijzen. Ze zijn herkenbaar aan vier eigenschappen, en elk daarvan is in B2 verboden:

1. **Uitwisselbare body.** De tekst blijft kloppen als je het onderwerp vervangt. → Verboden: elke B2-pagina moet ten minste één blok dragen dat alleen op díe pagina waar is (de drie pijnpunten, de vraag-aanbodvergelijking, de zes sectorlabels, de locatie-vs-gebiedsectie).
2. **Bewijs uit een andere bewijsketen geleend.** Een sectorpagina die een case uit een andere sector toont, of een gebiedspagina die een enkelvoudige locatiecase als gebiedsbewijs presenteert. → Verboden door de proofregel hierboven.
3. **Geprogrammeerde variantenreeks.** Pagina's genereren per sector, per plaatsnaam of per systeemterm zonder dat er inhoud of bewijs achter zit. → Verboden: **Automotive krijgt pas een sectorpagina als die pagina eigen inhoud heeft**, ook al zijn de twee cases er al (§0.4, asymmetrie A1). Andersom krijgt een sector met een pagina maar zonder case geen verzonnen case.
4. **Lege belofte in navigatie of filter.** Een chip of menu-item dat naar nul resultaten leidt. → Verboden: zie de filterregel in §A6.

**Toetsvraag per B2-pagina, te stellen vóór publicatie:** *welke van deze blokken zou op geen enkele andere B2-pagina op deze site kunnen staan, en welk cijfer erop heeft een primaire bron?* Kan die vraag niet beantwoord worden, dan is het een doorway en gaat de pagina niet live.

### 4.3 CLAIM POLICY — frozen, exact deze vijf statussen

| Status | Definitie | Publicatieregel |
|---|---|---|
| **VERIFIED** | primaire bron: rapport, contract, meetdata, productspecificatie | publiceerbaar, **binnen de scope van die bron** |
| **SUPPORTED** | reproduceerbaar af te leiden uit betrouwbare repository-data | publiceerbaar, **uitsluitend in een formulering die exact de telling/bron dekt** |
| **UNVERIFIED** | bestaat in marketingcopy, onderbouwing ontbreekt | **niet automatisch migreren** → kwalitatief herschrijven, CONTENT PENDING, of verwijderen |
| **CONFLICTING** | bronnen noemen verschillende waarden | **migratie van die claim blokkeren** tot opgelost |
| **REMOVE/REWRITE REQUIRED** | aantoonbaar fout, misleidend, of ruimer dan de bron | **niet meenemen** |

**HARD RULE: PUBLICLY EXISTING ≠ VERIFIED.**

Toepassing op de in dit document gemeten claims:

| Claim | Vindplaats | Status |
|---|---|---|
| 47 opgeleverde projecten · 12 MWp zon · 98% gemiddelde uptime | `projecten.html:173-175` | **UNVERIFIED** (C-07) — vervangen door "11 projecten uitgelicht" / "11 gepubliceerde projectcases" |
| "Alle 11 gerealiseerde projecten" | `projecten.html:191` | **SUPPORTED** — de telling is reproduceerbaar; de formulering mag niet impliceren dat 11 het totaal van het bedrijf is |
| 7 waardestromen · 0 jr wachttijd · −22% netinkoop | `_leadpopup.js:116` | **UNVERIFIED** |
| 645 kWh batterijopslag | `project-ratio-16.html:68` én `project-hedin-alkmaar.html:67` | **CONFLICTING** — migratie geblokkeerd (DR-12) |
| "Meerdere panden, één systeem." als gerealiseerd gebiedsbewijs | `energy-hubs.html:228` | **UNVERIFIED** (DR-10) |
| PDF-brochure beloofd in popupcopy en in 7 `data-brochure-file`-attributen | `_leadpopup.js:113`, `:124`; 7 guides | **REMOVE/REWRITE REQUIRED** — het bestand bestaat niet (§0.5) |
| 99,5% SLA laadpalen (contractueel, geen gemeten uptime) | `index.html:215-216` | **VERIFIED binnen scope** — uitsluitend als contractuele SLA te noemen, nooit als gemeten beschikbaarheid |
| Telefoon, e-mail, adres, KvK 92191487, BTW NL865924910B01 | `index.html:1050`, `:1054`, `:1058`, `:1121` | **VERIFIED** |
| Velperweg 37 · +31 88 303 7300 | nergens in de repository | **REMOVE/REWRITE REQUIRED** — niet gepubliceerd (`index.html:1031-1033`) |

### 4.4 Design-systeemkaders die dit document als gegeven neemt

**PRIMITIVES (frozen).** `.vibe-container` · `.vibe-section` · `.vibe-eyebrow` · `.vibe-heading` + `.vibe-heading--*` · `.vibe-lead` · `.vibe-btn` + `--primary` `--secondary` `--ghost` `--text` · `.vibe-card` + `--light` `--dark` `--media` · `.vibe-icon` · `.vibe-icon-tile` · `.vibe-arrow` · `.vibe-metric` · `.vibe-media`. Extra primitives alleen wanneer aantoonbaar nodig.

**HARD RULE:** REPEATED VISUAL LANGUAGE → primitive/component; UNIQUE COMPOSITION → section-specific implementation.

**Niet abstraheren** — tenzij later werkelijk hergebruik ontstaat: de homepage hero-stage (`index.html:77-206`), de VIBE.CONTROL-dashboardcompositie (`index.html:613-688`), de Hedin featured-projectcompositie (`index.html:460-510`), de homepage process timeline (`index.html:525-608`), de final CTA diagonal composition (`index.html:946-1001`). Dit sluit aan op de meting in §0.1: er ís nog geen gedeelde componentbibliotheek, dus elke "HERGEBRUIK" in §3 vraagt eerst om een extractie.

**TOKENS (frozen).** PRIMITIVE → SEMANTIC; componenttokens alleen wanneer een component een eigen semantische waarde nodig heeft. Voorbeeld: `--vibe-blue-500` → `--color-action-primary` → (indien nodig) `--btn-primary-bg`. Geen onnodige enterprise-tokenlagen. De gemeten huidige laag telt **23** `--vibe-*`-tokens in `home.css:29-71` (§6.1).

**RESPONSIVE TYPOGRAFIE.** Default `clamp()`; `cqw` uitsluitend voor bewust canvas-proportionele composities. **Master v1 wordt hiervoor NU NIET gerefactord** — `--vibe-radius-kaart:.5637cqw` (`home.css:55`) en de negen `container-type:inline-size`-wortels blijven zoals ze zijn. Hardgecodeerde `rgba`-varianten worden tijdens migratie genormaliseerd wanneer ze een herhaalde semantische rol hebben.

### 4.5 Migratievolgorde — definitief

```
DESIGN SYSTEM V1.0 FREEZE
  -> MASTER PAGE PER BOUWTYPE
  -> VISUAL + FUNCTIONAL REVIEW
  -> MASTER LOCK
  -> OVERIGE PAGINA'S VAN DAT TYPE
  -> QA
  -> VOLGENDE BOUWTYPE
```

| Stap | Bouwtype | Masterpagina | Pagina's daarna |
|---:|---|---|---:|
| 1 | **B2** | `systeem-energieopslag.html` | 16 |
| 2 | **B3** | `project-ratio-16.html` | 10 |
| 3 | **B4** | `projecten.html` | 0 |
| 4 | **B6** | `contact.html` | 1 |
| 5 | **B5** | `waarom-vibe.html` | 1 |
| 6 | **B7** | `privacy.html` | 1 |
| 7 | **S2** | `netcongestie-oplossen.html` (gated guides) | 6 |

**B1 is al Master v1 en wordt NIET opnieuw gebouwd.** `index.html` blijft byte-for-byte zoals in commit `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1`.

---

## 5 · Beslispuntenregister — bijgewerkt naar V1.0

**Leeswijzer voor de statussen in dit register:**

| Status | Betekenis |
|---|---|
| **DECIDED — V1.0** | beantwoord door C-01 t/m C-07 of door DR-00. Staat vast; geen open vraag meer |
| **DEFERRED TO PAGE MIGRATION** | het archetypebesluit is genomen, de uitvoering hangt aan een migratiestap. De exacte heropeningsvoorwaarde staat erbij |
| **DECISION REQUIRED** | nog echt open en **niet** geraakt door C-01 t/m C-07 |
| **CONTENT PENDING** | ontbrekende businessinformatie; geen ontwerp- of architectuurvraag |

**Telling — 20 punten (DR-00 t/m DR-18, plus DR-02b):**

| Status | Aantal | Punten |
|---|---:|---|
| **DECIDED — V1.0**, volledig | 8 | DR-00, DR-01, DR-02, DR-02b, DR-10, DR-11, DR-16, DR-18 |
| **DEFERRED TO PAGE MIGRATION** (archetype- of beleidsdeel is beslist, uitvoering hangt aan een migratiestap) | 5 | DR-03, DR-04, DR-05, DR-07, DR-09 |
| **CONTENT PENDING** met migratieblokkade | 1 | DR-12 |
| **DECISION REQUIRED** — nog echt open | 6 | DR-06, DR-08, DR-13, DR-14, DR-15, DR-17 — zie §5.5 |

8 + 5 + 1 + 6 = 20. **Geen enkel punt dat door C-01 t/m C-07 of door DR-00 wordt beantwoord, staat nog als DECISION REQUIRED.**

### 5.1 Pagina's zonder eenduidig archetype

**DR-01 · Twee onverenigbare navigatiesystemen — DECIDED — V1.0 onder C-01 (model A).**
*Besluit:* de platte Master-v1-header wordt de standaard; het legacy mega-menu verdwijnt, en er wordt er geen teruggebouwd om legacy routes zichtbaar te houden.
*Motivering in één zin:* zolang homepage en subpagina's twee verschillende navigaties voeren, begint elke subpagina met een tegenstrijdigheid en is geen enkel bouwtype bouwbaar.
*Gemeten uitgangssituatie, behouden als auditbewijs:* `index.html:141-148` draagt een eigen ingebakken header met zes platte links — `#oplossingen`, `projecten`, `#aanpak`, `#vibe-control`, `waarom-vibe`, `over-ons` — plus één CTA naar contact (r.157); de pagina laadt `_header.js` **niet**. De 34 andere webpagina's laden `_header.js` wél; dat script schrijft via `document.write` (`_header.js:165`) een nav met drie mega-menu's — Oplossingen (9 items, r.23-33), Industrieën (**5**, r.34-39, zie §6.8), Systeem (5, r.41-47) — plus vier platte links (Energy Hubs, Projecten, Waarom Vibe, Over ons, r.146-149) en twee CTA's (Netcongestie Check, Plan gesprek, r.152-153).
*Wat het besluit expliciet meeneemt:* de negen Oplossingen-items, de vijf Industrieën-items en de vijf Systeem-items mogen niet zomaar verdampen. "Oplossingen" wordt een belangrijke navigatie-ingang; systemen/producten blijven bereikbaar via overzichtspagina's en interne navigatie; `energy-hubs.html` en de systeemcategorieën moeten logisch in de nieuwe IA landen. Van de negen Oplossingen-items zijn er drie in werkelijkheid S2-guides (DR-02b) en die vallen sowieso af.
*Responsive:* `max-width:1199px` blijft de primaire navigatiegrens (12 gemeten queries, §0.1), tenzij implementatiebewijs later iets anders vereist.

**DR-02 · `contact.html` is een bundler-artefact — DECIDED — V1.0.**
*Besluit:* `contact.html` wordt herbouwd als echte HTML en is de **master van B6** (migratiestap 4).
*Motivering in één zin:* de migratievolgorde in §4.5 is definitief en belegt deze herbouw expliciet, dus de vraag "herbouwen of niet" is beantwoord.
*Gemeten:* 409.619 bytes in 229 regels, de hele pagina als JSON-geëscapete string in `<script type="__bundler/template">` (`contact.html:225-227`; r.226 alleen is 92.788 tekens). `<noscript>` r.40: "This page requires JavaScript to display". Geen `_header.js`, geen `_footer.js`, geen stylesheet-link.
*Wat nog uitvoeringsafhankelijk is — DEFERRED TO PAGE MIGRATION:* de concrete formuliertechniek en de endpointkeuze. **Heropeningsvoorwaarde:** alleen wanneer bij migratiestap 4 blijkt dat de bestaande formulierafhandeling niet zonder de bundler kan worden gereproduceerd.

**DR-02b · Drie Executive Guides staan als gewone webpagina in de hoofdnavigatie — DECIDED — V1.0 onder C-03 (optie B).**
*Besluit:* het zijn gated assets. Ze verdwijnen uit navigatie, footer, interne links en sitemap, en worden uitsluitend via de leadflow ontsloten. Ze worden **geen** B2-pagina's.
*Motivering in één zin:* een A4-document zonder menu, footer en cookiebanner is als publieke landingspagina een doodlopende weg, terwijl het als beloning achter een formulier precies doet waarvoor het gemaakt is.
*Gemeten omvang van de op te ruimen verwijzingen:* `_header.js:24` (`capaciteit-als-dienst`), `:28` (`energiehandel-flexmarkten`) en `:29` (`energie-als-vastgoedopbrengst`) in het mega-menu Oplossingen; twee ervan ook in de homepage-footernavigatie (`index.html:1075-1076`); `oplossing-netcongestie.html:146` linkt er met een gewone knop naartoe; alle drie staan in `sitemap.xml` (r.16, r.118, r.124).
*Aandachtspunt dat bij de uitvoering hoort:* `capaciteit-als-dienst` en `energiehandel-flexmarkten` staan wél in de sitemap maar in géén enkele leadconfig en ook niet in de serverwhitelist (§0.5) — na het verwijderen uit de sitemap zijn zij onbereikbaar tenzij er een leadconfig voor komt. Dat laatste is **CONTENT PENDING**.

**DR-03 · Drie van de zes B2 · *Oplossing*-pagina's draaien op een ander systeem — archetypedeel DECIDED — V1.0, bouwdeel DEFERRED TO PAGE MIGRATION.**
*Besluit (archetype):* alle zes vallen in één bouwtype en één variant, **B2 · *Oplossing***. Er komt géén apart subarchetype voor de drie afwijkers.
*Motivering in één zin:* een bouwtype is geen template maar een hiërarchie plus een proofregel, en die delen alle zes — het verschil zit uitsluitend in de bouw.
*Gemeten:* `oplossing-energielabel.html`, `oplossing-paris-proof.html` en `oplossing-subsidies.html` laden `frameiq-harmonize.css` in plaats van `subpage.css`, hebben **nul** `data-screen-label`, **nul** FAQ-items en **geen** `.mcta`; hun `h1` staat op r.405 respectievelijk r.373 in plaats van r.70 — er zit dus honderden regels inline CSS vóór.
*DEFERRED:* de harmonisatie naar de B2-bouw gebeurt in migratiestap 1, ná de master `systeem-energieopslag.html`. **Heropeningsvoorwaarde:** alleen wanneer bij die migratie blijkt dat de inline CSS van deze drie pagina's inhoud draagt die niet in de B2-componentfamilies past.

**DR-04 · De twee B5-pagina's draaien op twee bouwfamilies — archetypedeel DECIDED — V1.0, bouwdeel DEFERRED TO PAGE MIGRATION.**
*Besluit (archetype):* beide zijn **B5 · Standpuntpagina**; `waarom-vibe.html` is de master (migratiestap 5).
*Motivering in één zin:* ze delen doel, informatiehiërarchie en conversiepatroon volledig — alleen de bouwfamilie verschilt, en die wordt bij migratie gelijkgetrokken.
*Gemeten:* `waarom-vibe.html` is BF5 (alleen `tokens.css` + inline), `over-ons.html` is BF3 (`frameiq-harmonize.css`).
*DEFERRED:* `over-ons.html` volgt de master in stap 5. **Heropeningsvoorwaarde:** alleen wanneer de zevensectie-opbouw van `over-ons.html` (inclusief de verborgen Track record-sectie r.532) niet in de B5-hiërarchie van zes secties past.

**DR-16 · Geen kennis-/contentarchetype — DECIDED — V1.0.**
*Besluit:* er komt **geen** kennis-/contentarchetype in V1.0. De geaccepteerde architectuur is B1..B7 + S2 en bevat er geen.
*Motivering in één zin:* er bestaat geen enkele bestaande pagina om zo'n type op te baseren, en een bouwtype zonder pagina is een specificatie die niemand kan reviewen.
*Gemeten:* geen blog, nieuwsrubriek of kennisbank in deze repository. `index.html:1063-1065` legt expliciet vast dat Advies & engineering, Werken bij Vibe, Nieuws, Kennisbank, Downloads en Klantverhalen uit de footer zijn weggelaten omdat de pagina's niet bestaan; er is ook geen nieuwsbriefinfrastructuur (`index.html:1099-1102`). S2 is het dichtstbijzijnde maar is een gated verkoopdocument, geen open contentpagina.
*Heropeningsvoorwaarde:* zodra er daadwerkelijk contentpagina's worden geschreven. Dat is dan een uitbreidingsbesluit op V1.1, geen classificatievraag op V1.0.

### 5.2 Blokkades op componentniveau

**DR-07 · Er bestaat geen subpagina-herovariant in Master v1 — navigatiehelft DECIDED — V1.0, bouwhelft DEFERRED TO PAGE MIGRATION.**
*Wat door C-01 is beslist:* de reden dat de homepage-hero onbruikbaar was op subpagina's — twee concurrerende navigaties — is weg. Er is nog één header, de platte Master-v1-header.
*Motivering in één zin:* met één header wordt "een hero zonder gelockte header" een bouwopdracht in plaats van een architectuurconflict.
*Gemeten:* de homepage-hero heeft de header ingebakken in dezelfde `.vh-stage`-container (`index.html:77-206`, header r.128-161). Alle veertien BF2-pagina's gebruiken `.phero` met fotolaag, scrim en trust-row (`oplossing-netcongestie.html:65-83`), maar dat patroon is niet in Master v1 beschreven en draagt de Vibe-geometrie niet.
*DEFERRED:* de B2-herospecificatie wordt vastgelegd in **migratiestap 1**, op de master `systeem-energieopslag.html`, en daar gereviewd en gelockt vóór de overige zestien B2-pagina's volgen. Onder de HARD RULE van §4.4 is dit REPEATED VISUAL LANGUAGE (17 pagina's) en dus een component, geen sectie-specifieke implementatie. **Heropeningsvoorwaarde:** alleen wanneer bij stap 1 blijkt dat de vier B2-varianten niet met één hero-implementatie plus configuratie te bedienen zijn — dan valt de aanname onder §4.1 ("vier configuratieknoppen, geen vier bouwwerken") en moet DR-00's B2-samenvoeging opnieuw worden gewogen.

**DR-17 · De FAQ bestaat op 14 subpagina's maar niet in Master v1 — DECISION REQUIRED.**
Niet geraakt door C-01 t/m C-07. De homepage heeft geen FAQ-sectie (gemeten: nul `.faq-item` in de DOM); wel staat er nog dode FAQ-JavaScript in, beschermd door een guard op `#faqList` die nergens bestaat (`index.html:1226-1240`). De veertien BF2-pagina's hebben er elk vijf of zes. Master v1 levert dus geen vormtaal voor het meest gebruikte subpagina-component. **Kies:** óf de FAQ wordt een Design System V1.0-component, óf hij blijft bewust B2-eigen — maar dan moet dat vastliggen. **Dit moet beantwoord zijn vóór de Design System V1.0 freeze**, want 14 van de 17 B2-pagina's hangen ervan af.

**DR-09 · `tokens.css` is niet dood buiten de homepage — DEFERRED TO PAGE MIGRATION.**
*Waarom dit geen open besluit meer is:* de migratievolgorde in §4.5 is definitief en schrijft per bouwtype een freeze → master → review → lock → rest → QA-cyclus voor. Daarmee is het conflict belegd bij de stap die het veroorzaakt, in plaats van dat het de hele migratie blokkeert.
*Gemeten:* op de homepage matcht geen enkele UNIFY-selector — nul bare `.eyebrow`, `.btn-p`, `.btn-s`, `.card`, `.inp`, `.opt` of `.pc-*`-elementen in `index.html` (alle treffers zijn compound klassen als `.vh-sol-eyebrow` en `.vh-btn-primair`). Op de 34 andere pagina's is `tokens.css` volledig actief, inclusief de UNIFY LAYER met `!important` die eyebrows op mono zet (`tokens.css:76-82`), radii op 0 forceert bij veertien selectoren waaronder `.card`, `.btn-p`, `.pc-herofig` en `.mc-core` (`tokens.css:90-94`), en de kaartschaduw overschrijft (`tokens.css:97-99`). Master v1 rekent in `--vibe-radius-kaart:.5637cqw` (`home.css:55`).
*Concreet risico:* zodra een bouwtype de Master v1-kaartvorm krijgt, vecht `tokens.css:90-94` met `!important` terug. Dat raakt B3 het hardst (`project-case.css:20`, `:51`, `:61`, `:68`, `:73` tegenover `tokens.css:90-94`) en B4 (`tokens.css:90-99` op `.card`).
**Heropeningsvoorwaarde:** als bij migratiestap 1 blijkt dat `tokens.css` niet per bouwtype kan worden afgebouwd maar in één keer van alle 34 pagina's af moet, dan is het geen migratiedetail meer maar een eigen release en moet de volgorde in §4.5 opnieuw worden vastgesteld.

### 5.3 Blokkades op conversie- en dataniveau

**DR-05 · De brochure-whitelist dekt vijf van de zeven documenten — beleidsdeel DECIDED — V1.0 onder C-06, uitvoering DEFERRED TO PAGE MIGRATION.**
*Besluit (beleid):* **NO ASSET → NO DOWNLOAD PROMISE.** Waar een asset bestaat wordt het geleverd (optie A); waar het niet bestaat wordt niets beloofd (optie B). Routering gaat naar een zakelijke centrale bestemming.
*Motivering in één zin:* een leadformulier dat een bestand belooft dat niet bestaat, beschadigt precies het vertrouwen waarvoor het formulier is ingevuld.
*Gemeten:* `api/server.js:33-39` kent `home`, `exploitatie`, `energielabel`, `laadplein` en `netcongestie` — elk met een `doc:` dat naar een **`.html`-guide** wijst, niet naar een PDF. De slugs `meer-capaciteit`, `energiehandel` en `vastgoedopbrengst` uit de `data-brochure-slug`-attributen bestaan server-side niet. Die `data-brochure-*`-attributen worden bovendien door géén enkel script gelezen — `_leadpopup.js:29-33` leest `window.VIBE_LEAD`. Het is dode metadata die een niet-bestaande koppeling suggereert. `_leadpopup.js:36-45` bevat een `PHOTO_MAP` met acht slugs (`capaciteit`, `netcongestie`, `exploitatie`, `energiehandel`, `energielabel`, `vastgoedopbrengst`, `laadplein`, `home`) — drie meer dan de server accepteert. Een popup die op `capaciteit`, `energiehandel` of `vastgoedopbrengst` wordt geconfigureerd, toont het juiste beeld maar krijgt geen mail verstuurd.
*Nieuw gemeten in deze ronde:* er bestaat **geen enkele PDF** in de repository en `assets/brochures/` bestaat niet; het pad `assets/brochures/netcongestie-oplossen.pdf` staat op `_leadpopup.js:9`, in het commentaarblok met de voorbeeldconfiguratie, niet in de runtime-default (§6.7). Alle zeven guides dragen een `data-brochure-file` met een niet-bestaande PDF-naam, en alle zeven tonen `mailto:mounir@vibeenergy.nl` (§0.5).
*DEFERRED:* het corrigeren van het dode voorbeeldpad, het opruimen van de dode `data-brochure-*`-attributen, het gelijktrekken van `PHOTO_MAP` met de whitelist en het vervangen van de zeven persoonlijke mailto's gebeurt bij **migratiestap 7 (S2)**. **Heropeningsvoorwaarde:** als bij stap 7 blijkt dat er wél PDF-assets worden aangeleverd, verschuift de leveringsvorm van guidepagina naar bestand en moet de copy opnieuw worden vastgesteld.
*Gevolg voor B2 · Sector:* de sectorbrochure die deze variant leadmagnetisch zou maken bestaat niet. Er wordt er geen beloofd. **CONTENT PENDING.**

**DR-06 · Hoort `data-calendly` op B5? — DECISION REQUIRED.**
Niet geraakt door C-01 t/m C-07. Op de homepage dragen zes primaire CTA's `data-calendly`, met `href="contact"` als fallback zonder JS (`index.html:157`, `index.html:967-971`). Geen van beide B5-pagina's draagt het attribuut. Dit is geen ontwerpfout maar een onbeslist punt: past een directe agenda-inplanning bij een leesstuk over het bedrijfsmodel, of niet? Te beantwoorden vóór migratiestap 5.

**DR-08 · Contactvelden in stap 1 van de wizard — DECISION REQUIRED.**
Niet geraakt door C-01 t/m C-07. `netcongestie-check.html:250-256` vraagt bedrijf, naam, e-mail, telefoon, postcode, huisnummer en functie vóórdat enige waarde is geleverd. Die velden naar stap 6 verplaatsen verhoogt doorgaans de voltooiing, maar verandert het leadmodel: nu levert elke afgebroken invulling nog steeds een compleet contactprofiel op. **Dat is een businessbeslissing, geen ontwerpbeslissing.** Te beantwoorden vóór migratiestap 4.

**DR-13 · Drie verschillende contacttermijnen op één site — DECISION REQUIRED.**
Niet geraakt door C-01 t/m C-07. 48 uur voor een algemeen contactverzoek (`index.html:975-978`), 24 uur voor het rapport van de Netcongestie Check (`netcongestie-check.html:218`), en "binnen één werkdag" op het bevestigingsscherm van diezelfde check (`netcongestie-check.html:477`). De eerste twee zijn bewust onderscheiden en gedocumenteerd; de derde is dat niet. Vaststellen welke termijn waar geldt. Te beantwoorden vóór migratiestap 4, want B6 draagt alle drie de plekken.

### 5.4 Blokkades op bewijsniveau

**DR-18 · `projecten.html` spreekt zichzelf tegen en botst met de homepage — DECIDED — V1.0 onder C-07.**
*Besluit:* de homepage wint. De drie herocijfers zijn **UNVERIFIED** en migreren niet mee. Vervangwaarde: **"11 projecten uitgelicht"** of **"11 gepubliceerde projectcases"**, of geen cijfer.
*Motivering in één zin:* gepubliceerd zijn is geen bewijsstatus, en de pagina spreekt zichzelf vijftien regels lager al tegen.
*Gemeten:* hero r.173-175 "47 Opgeleverde projecten / 12 MWp Zon geïnstalleerd / 98% Gemiddelde uptime"; teller r.191 "Alle 11 gerealiseerde projecten". De homepage heeft precies deze drie cijfers onderzocht en verworpen bij gebrek aan primaire bron (`index.html:209-216`, `:251-255`). `over-ons.html:532` doet het al goed: hele sectie op `hidden`, motivering op r.539.
*Verboden formulering:* "Vibe heeft slechts 11 projecten gerealiseerd" — dat gaat verder dan de bron bewijst en valt onder REMOVE/REWRITE REQUIRED.
*Heropeningsvoorwaarde:* worden er primaire bronnen voor 47 / 12 MWp / 98% aangeleverd, dan opnieuw beoordelen onder C-07.

**DR-10 · `energy-hubs.html` claimt een gebiedsbewijs dat niet bestaat — DECIDED — V1.0 onder C-07, claimstatus UNVERIFIED.**
*Besluit:* de claim gaat niet mee zoals hij er staat. De B2-variant *Gebied* mag de propositie uitleggen zonder gerealiseerd gebiedsbewijs te suggereren — dat is precies wat de GEBIED-proofregel met "waar beschikbaar" bedoelt (§4.2).
*Motivering in één zin:* er is geen multi-pand-case, dus elke formulering die er één impliceert is ruimer dan de bron.
*Gemeten:* sectie 07 heet "Meerdere panden, één systeem." (`energy-hubs.html:228`), maar elk van de elf projectpagina's noemt exact één locatie in de `.pc-loc`-regel. Het dichtstbijzijnde is Hedin Automotive op twee locaties met twee losse cases (`project-hedin-alkmaar.html:62`, `project-hedin-amsterdam.html:62`).
*Heropeningsvoorwaarde:* zodra er een case bestaat waarin meerdere panden aantoonbaar op één systeem draaien. Tot die er is: **CONTENT PENDING.**

**DR-11 · Sectorvocabulaire, filtervulling en ontbrekende sectorcases — DECIDED — V1.0 onder C-05.**
*Besluit:* de canonieke taxonomie van §0.4 is bindend voor alle drie de plekken tegelijk — het `data-sector`-attribuut op de kaart, het `Sector ·`-veld op de detailpagina en het kruimelpad. Vijf sectoren plus één segment: Commercieel vastgoed, Woningportefeuilles, Recreatie, Logistiek & transport, Automotive, en VvE als segment binnen Woningportefeuilles.
*Motivering in één zin:* vijf vocabulaires naast elkaar maakten elke sectorclaim onverifieerbaar; één vocabulaire maakt overzicht, kaart, kruimelpad en detailpagina wederzijds controleerbaar.
*(a) Gemeten:* negen van de elf kaarten op `projecten.html` voeren een ander sectorlabel dan hun eigen detailpagina (volledige tabel met regelnummers in §A6). Ratio 16 draagt zelfs een andere soort categorie: `data-sector="Netcongestie"` (`projecten.html:195`) tegenover "Commercieel vastgoed" (`project-ratio-16.html:62`). → **Opgelost:** het canonieke label wint; Ratio 16 wordt Commercieel vastgoed.
*(b) Gemeten:* de vijf inhoudelijke filterchips (`projecten.html:185-189`) dekken Woningen 6, Automotive 2, Netcongestie 1, Recreatie 1, Bedrijfspanden 1 — drie van de vijf chips leveren precies één kaart op. → **Opgelost:** onder de canonieke taxonomie wordt dat Woningportefeuilles 6, Automotive 2, Commercieel vastgoed 2, Recreatie 1. "Netcongestie & Energy Hubs" verdwijnt van de sector-as naar de oplossing-as. Logistiek & transport en VvE krijgen geen chip zolang zij nul cases hebben.
*(c) Gemeten:* voor Logistiek & transport en voor VvE bestaat geen enkele case, terwijl `industrie-logistiek.html` en `industrie-vve.html` allebei een sectie 06 "Cases" dragen. → **Niet met ontwerp op te lossen: CASE PROOF = PENDING.** Geen casesectie tonen, of wachten op een echte case. Niets verzinnen.
*Vierde asymmetrie, nieuw vastgelegd:* **Automotive heeft twee VERIFIED cases maar geen sectorpagina** (gemeten: geen HTML-bestand met "automotive" in de naam). **PAGE PENDING** — en de pagina komt er pas met eigen inhoud, niet als doorway (§4.2).
*Uitvoering:* migratiestap 3 (B4, `projecten.html`) en migratiestap 2 (B3, casepagina's).

**DR-12 · Twee projecten claimen hetzelfde cijfer — CONTENT PENDING, claimstatus CONFLICTING, migratie van deze claim geblokkeerd.**
*Wat vaststaat onder de claim policy (§4.3):* bij status CONFLICTING wordt migratie van die claim geblokkeerd tot hij is opgelost. Dat is geen open besluit meer maar beleid.
*Wat niet vaststaat:* welke waarde bij welk project hoort. Dat volgt niet uit de repository en vereist een primaire bron.
*Gemeten:* `project-ratio-16.html:68` en `project-hedin-alkmaar.html:67` dragen beide "645 kWh batterijopslag". De homepage citeert 645 kWh voor Hedin Alkmaar (`index.html:503`), `projecten.html:198` citeert 645 kWh voor Ratio 16. Eén van beide is fout, of beide installaties zijn toevallig even groot.
*Waarom dit zwaar weegt:* B3 is het bewijsfundament waar B1, B2 en B4 uit citeren — een fout hier plant zich over vier bouwtypes voort. Dit moet zijn opgehelderd vóór migratiestap 2.

**DR-14 · Duplicaat met afwijkende naamgeving — DECISION REQUIRED.**
Niet geraakt door C-01 t/m C-07. `assets/projects/ratio-16.jpg` en `assets/projects/ratio16.jpg`. Welke canoniek is volgt niet uit de code; `project-ratio-16.html:63` gebruikt `ratio-16.jpg` en `projecten.html:196` eveneens. Vaststellen en de andere verwijderen. Te beantwoorden vóór migratiestap 2.

**DR-15 · Scope-afbakening van de design-experimenten — DECISION REQUIRED.**
Niet geraakt door C-01 t/m C-07. De opdracht sluit `*-designs.html` uit. `popup-designs-met-afbeelding.html` eindigt niet op dat achtervoegsel maar hoort onmiskenbaar tot dezelfde serie als `popup-designs.html` en `cookie-popup-designs.html`. Ik heb hem uitgesloten. Bevestig dat, of neem hem alsnog in scope. Raakt de telling van 43 pagina's, verder niets.

### 5.5 Wat na deze ronde nog echt openstaat

| DR | Onderwerp | Waarom het niet door C-01..C-07 wordt beantwoord | Uiterlijk te beantwoorden |
|---|---|---|---|
| **DR-06** | `data-calendly` op B5 | conversiekeuze op één bouwtype; geen van de zeven besluiten raakt het | vóór migratiestap 5 |
| **DR-08** | contactvelden in stap 1 van de wizard | leadmodel, dus een businessbeslissing | vóór migratiestap 4 |
| **DR-13** | drie contacttermijnen (48 u / 24 u / één werkdag) | geen van de besluiten stelt een termijn vast | vóór migratiestap 4 |
| **DR-14** | `ratio-16.jpg` versus `ratio16.jpg` | assethygiëne, geen architectuur | vóór migratiestap 2 |
| **DR-15** | scope van `popup-designs-met-afbeelding.html` | scopeafbakening van de opdracht zelf | vrij |
| **DR-17** | FAQ als Design System-component of B2-eigen | componentbesluit dat de freeze raakt | vóór de Design System V1.0 freeze |

En één punt dat geen besluit is maar ontbrekende informatie: **DR-12** (645 kWh) blijft **CONTENT PENDING** tot een primaire bron uitwijst welk project welke waarde heeft.

---

## 6 · Afwijkingen tussen aangeleverde beweringen en mijn eigen meting

De eerste vier afwijkingen (§6.1 t/m §6.4) betreffen het oorspronkelijke bewijsbestand. De vier daarna (§6.5 t/m §6.8) zijn nieuw in deze bijwerkronde: het zijn aangeleverde inventarisatiefeiten die op commit `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1` **niet reproduceren**. Ik neem in alle gevallen mijn meting op, niet de bewering.

**6.1 · Tokenaantal: 23, niet 24.** `home.css:29-71` definieert 23 unieke `--vibe-*`-tokens, alle in het `:root`-blok; over het hele bestand zijn er 23 declaraties en 23 unieke namen. Geen enkel `home-*.css` definieert een extra `--vibe-*`-token. De lijst: `--vibe-blauw`, `-blauw-diep`, `-blauw-licht`, `-blauw-tint`, `--vibe-navy`, `-navy-diep`, `--vibe-body`, `-body-zacht`, `--vibe-sub`, `--vibe-op-donker`, `--vibe-wit`, `--vibe-paper`, `--vibe-canvas`, `--vibe-lijn`, `--vibe-radius-kaart`, `-radius-mob`, `-radius-rond`, `--vibe-elev-1`, `-elev-2`, `-elev-mob`, `--vibe-focus`, `--vibe-ease`, `--vibe-dur`. De opdracht noemt 24; mijn meting komt op 23. Verschil van één, niet verklaard.

**6.2 · `microgrids.html` staat wél in een mega-menu.** Het bewijsbestand zegt "staat in GEEN mega-menu". Dat volgt uit `_header.html:44-53`, de **verouderde referentiekopie** — dat bestand zegt zelf op r.1 dat de live nav uit `_header.js` komt. De live nav plaatst microgrids als eerste item onder Systeem (`_header.js:42`). Hetzelfde geldt voor `industrie-vve.html` (`_header.js:37`), `oplossing-paris-proof.html` (r.31), `oplossing-subsidies.html` (r.32) en `energy-hubs.html` (r.146): alle vijf staan in de live navigatie en in geen van beide gevallen in `_header.html`. **Gebruik `_header.js` als bron voor navigatievragen, nooit `_header.html`.**

**6.3 · Er staan drie, niet twee Executive Guides in de navigatie.** Het bewijsbestand noemt `capaciteit-als-dienst` en `energiehandel-flexmarkten` in de homepage-footer. Gemeten staat er ook `energie-als-vastgoedopbrengst` in het mega-menu Oplossingen (`_header.js:29`), naast de andere twee (r.24, r.28). Zie DR-02b.

**6.4 · De leadpopup dekt A2 niet volledig.** Het bewijsbestand noemt `_leadpopup.js` als conversiepatroon van A2. Gemeten dragen slechts vier van de zes A2-pagina's een `window.VIBE_LEAD`-configuratie: netcongestie (r.299), laadplein (r.269), exploitatie (r.295) en energielabel (r.857). `oplossing-paris-proof.html` en `oplossing-subsidies.html` hebben er geen, en er bestaat ook geen brochure voor hun onderwerp. De vijfde configuratie op de site staat op de homepage (`index.html:1242`, slug `home`).

**6.5 · `project-arnhem-60.html` MIST het Sector-veld NIET.** De aangeleverde inventarisatie zegt dat de sectortelling over elf casepagina's uitkomt op "Residentieel vastgoed ×5, Automotive ×2, Recreatie ×1, Bedrijfspand ×1, Commercieel vastgoed ×1, ontbreekt ×1 (project-arnhem-60.html heeft geen Sector-veld)". **Gemeten klopt dat niet.** `project-arnhem-60.html:58` luidt voluit:

```html
<div class="pc-loc"><span>Locatie · <b>Arnhem</b></span><span>Sector · <b>Residentieel vastgoed · belegger</b></span><span>Opgeleverd · <b>December 2024</b></span></div>
```

Het veld bestaat dus wél; het draagt alleen een **variantlabel** ("Residentieel vastgoed · belegger") dat in geen van de andere tien casepagina's voorkomt. Correcte telling over alle elf: Residentieel vastgoed ×5 · Residentieel vastgoed · belegger ×1 · Automotive ×2 · Recreatie ×1 · Bedrijfspand ×1 · Commercieel vastgoed ×1 = **11 van 11, geen enkele ontbreekt**. Dit is geen ontbrekend veld maar een zesde vocabulairevariant, en het valt daarmee gewoon onder C-05: het label bildt af op canoniek **Woningportefeuilles** (§0.4). Dit document registreerde het variantlabel al vóór deze bijwerkronde, in de sectortabel van §A3.

**6.6 · Het kruimelpad telt zes Woningportefeuilles, niet vijf.** De aangeleverde inventarisatie noemt "Woningportefeuilles ×5, Automotive ×2, Recreatie ×1, Bedrijfspanden ×1, Netcongestie ×1" — dat is tien, terwijl er elf casepagina's zijn. Gemeten over alle elf `.pc-crumb`-regels: **Woningportefeuilles ×6** (`project-arnhem-60.html:54`, `-burchtstraat:54`, `-ketsheuvel:54`, `-nieuw-schoonoord:54`, `-schouwburgring:54`, `-van-beethovenstraat:54`) · Automotive ×2 (`-hedin-alkmaar:58`, `-hedin-amsterdam:58`) · Recreatie ×1 (`-dormio-medemblik:58`) · Bedrijfspanden ×1 (`-purmerend:54`) · Netcongestie & Energy Hubs ×1 (`-ratio-16:58`) = **11**. De ontbrekende zesde is `project-arnhem-60.html`, dezelfde pagina als in §6.5.

**6.7 · Het dode brochurepad staat in een commentaarblok, niet in de runtime-default.** De aangeleverde inventarisatie zegt: "`_leadpopup.js:26` zet als standaard `file:'assets/brochures/netcongestie-oplossen.pdf'`. Dat pad is dood." **Half correct.** Het pad is inderdaad dood — er bestaat geen enkele PDF in de repository en `assets/brochures/` bestaat niet (gemeten) — maar het staat op een andere plek en heeft een andere werking:

| Bewering | Meting |
|---|---|
| staat op `_leadpopup.js:26` | staat op **`_leadpopup.js:9`**, binnen het commentaarblok r.1-18 dat de voorbeeldconfiguratie toont. `_leadpopup.js:26` is `var LEAD_ENDPOINT = …` |
| is de standaardwaarde van `file` | de runtime-default is **leeg**: `var file = cfg.file \|\| '';` (`_leadpopup.js:32`), gevolgd door `if(!file){ return; }` op r.33 |
| een leeg `file` levert een dood pad op | een leeg `file` levert **geen popup** op — r.33: "geen brochure gekoppeld -> geen popup" |

Het verschil is operationeel relevant: er wordt op dit moment **nergens** een dood PDF-pad aan een bezoeker aangeboden. Het probleem is een **misleidende voorbeeldconfiguratie in de documentatie van het script**, plus zeven `data-brochure-file`-attributen die een niet-bestaande PDF noemen (§0.5). Onder C-06 moeten beide bij migratie worden gecorrigeerd; de urgentie is lager dan bij een live dood pad, maar de regel NO ASSET → NO DOWNLOAD PROMISE geldt onverkort voor de popupcopy die wél live is (`_leadpopup.js:113`, `:124`).

**6.8 · Het legacy mega-menu Industrieën heeft vijf items, niet vier.** De aangeleverde inventarisatie noemt "Legacy mega-menu (`_header.js`): Logistiek, Recreatie, Vastgoed, VvE". Gemeten op `_header.js:34-39` staan er **vijf**: Logistiek (`industrie-logistiek`, r.35), Kantoren & vastgoed (`industrie-vastgoed`, r.36), VvE's & Wooncomplexen (`industrie-vve`, r.37), Recreatie (`industrie-recreatie`, r.38), Woningportefeuilles (`industrie-residentieel`, r.39). Het ontbrekende item in de bewering is **Woningportefeuilles** — de sector met de meeste cases (6). Dit document telde het mega-menu al correct als vijf items in §5.1/DR-01. Het menu verdwijnt hoe dan ook onder C-01, maar de telling is van belang omdat C-01 eist dat de proposities niet uit de IA verdwijnen: er moeten vijf sectoringangen landen, niet vier.

---

## Eindrapport

```
BASE SHA   = aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1
FINAL SHA  = aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1 (geen code gewijzigd)
TYPECHECK  = NIET GEDRAAID — geen typesysteem in deze repository
BUILD      = NIET GEDRAAID — statische site, opdracht verbiedt aanraken van HTML/CSS/JS
LINT       = NIET GEDRAAID — geen lintconfiguratie aanwezig
TESTS      = NIET GEDRAAID — geen testsuite aanwezig
NIET GEDRAAID = browser/screenshot — opdracht is documentatie, geen rendering;
                inhoudelijke cijfercontrole van de 7 Executive Guides (S2) — buiten scope
RODE POORTEN  = geen
GEWIJZIGD  = docs/vibe-page-archetypes-v1.md (bijgewerkt naar V1.0)
PRODUCTIECODE = ONAANGERAAKT — index.html, home*.css, tokens.css, _header.js,
                _footer.js, _leadpopup.js, _consent.js, overige JS, productie-HTML,
                assets, sitemap.xml, robots.txt en formulieren zijn uitsluitend GELEZEN
PUSHED = NO    DEPLOYED = NO

--- Bijwerkronde V1.0 ---
ARCHITECTUUR  = B1..B7 + S2 DEFINITIEF (DR-00 = DECIDED — V1.0)
BESLUITEN     = C-01 t/m C-07 verwerkt in §0.3; C-05 volledig uitgewerkt in §0.4;
                C-06 gemeten in §0.5
B2-PROOFREGELS = SYSTEM / SOLUTION / SECTOR / GEBIED expliciet vastgelegd in §4.2,
                 met een expliciet verbod op een generieke SEO-doorwaytemplate
SECTORTAXONOMIE = 5 sectoren + 1 segment; 4 asymmetrieen vastgelegd
                  (Automotive PAGE PENDING · Logistiek CASE PROOF = PENDING ·
                   VvE CASE PROOF = PENDING · Netcongestie verhuist naar de oplossing-as)
MAPPING       = 43/43 pagina's toegewezen aan B1..B7 + S2 (§1, §1.2);
                1+17+11+1+2+2+2+7 = 43
DR-REGISTER   = 20 punten: 8 DECIDED — V1.0 · 5 DEFERRED TO PAGE MIGRATION ·
                1 CONTENT PENDING · 6 DECISION REQUIRED
                Geen achtergebleven DECISION REQUIRED over C-01..C-07 of DR-00
AFWIJKINGEN   = 8 vastgelegd in §6, waarvan 4 NIEUW: drie aangeleverde
                inventarisatiefeiten reproduceren niet op deze commit
                (§6.5 Sector-veld arnhem-60 bestaat wel · §6.6 kruimelpad telt 6
                 Woningportefeuilles · §6.7 dood brochurepad staat op _leadpopup.js:9
                 in commentaar, niet als runtime-default op r.26), plus §6.8
                 (mega-menu Industrieen heeft 5 items, niet 4)

EINDOORDEEL = PASS — reductie definitief gemaakt, B2-proofregels vastgelegd,
              canonieke sectortaxonomie toegevoegd, C-03 verwerkt (S2 = gated
              documentsysteem, geen publiek archetype), mapping van alle 43
              pagina's kloppend met B1..B7 + S2, DR-registers bijgewerkt volgens
              de werkregels. Alle nieuw opgenomen cijfers en paden zijn in deze
              sessie zelf gemeten; drie aangeleverde feiten zijn met de meting
              gecorrigeerd in plaats van overgenomen.
```
