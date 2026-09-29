# Vibe Energy — Componentbibliotheek v1

**Bron** `/Users/mounirvanbinsbergen/projects/vibe-website`
**Commit** `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1` — *feat: lock homepage master v1*
**Scope** `index.html` + `home.css` + `home-hero/-solutions/-project/-process/-control/-proof/-infra/-final/-footer/-mobile.css` + `_footer.js`, `_consent.js`, `_leadpopup.js`, `tokens.css`
**Status van dit document** NORMATIEF. Het beschrijft niet wat er aan herbruikbare code bestaat, maar wat de componenten ZIJN en waar de migratie naartoe werkt. De doelarchitectuur staat in § 0 en is **frozen**; het auditbewijs over de huidige toestand staat in § 1 t/m § 7.

**Meetmethode** Elke waarde in dit document is in deze sessie teruggelezen in het bronbestand op de genoemde regel. Waar "gemeten" staat, is de waarde in een echte browser afgelezen (chrome-headless-shell 1243, `--window-size=1200,900`, pagina in een 390px-iframe over een lokale HTTP-server op de werkdirectory). Waar het bewijs zichzelf tegenspreekt of niets vaststelt, draagt het punt een expliciete besliststatus met de reden — **DECIDED — V1.0**, **DEFERRED TO PAGE MIGRATION**, **DECISION REQUIRED**, **CONTENT/PAGE PENDING** of een claimstatus; het register in § 4 houdt die statussen bij. Er staat nergens een getal dat niet uit een bestand komt.

**Rekenregel voor alle cqw-waarden** Elke sectiewortel draagt `container-type: inline-size` en is `width:100%`. Op een viewport van 1774px geldt dus voor élke sectie: `1cqw = 17,74px`. De referentiecanvassen verschillen per sectie (1774 / 2056 / 1536 / 2103, zie § 2.4) maar dat raakt alleen de omrekening in het commentaar, niet de rendering.

**Leeswijzer** § 0 is de bevroren doelarchitectuur: waar de migratie naartoe werkt. § 1 t/m § 7 zijn het auditbewijs: wat Master v1 vandaag gemeten dóet. Waar § 0 en § 1-7 iets anders zeggen, beschrijft § 1-7 de huidige toestand en § 0 de norm. Geen van beide wordt voor de ander herschreven.

---

## 0 · Doelarchitectuur V1.0 (frozen)

### 0.1 Wat hier bevroren is, en wat niet

Bevroren zijn: de primitivelijst (§ 0.3), de HARD RULE (§ 0.2), de lijst composities die níét geabstraheerd worden (§ 0.4), de tokenketen (§ 0.7), de responsive-typografieregel (§ 0.8), de claim policy (§ 0.9) en de besluiten C-01 t/m C-07 (§ 0.6). Deze staan niet meer ter discussie en mogen nergens in dit document nog als **DECISION REQUIRED** verschijnen.

**Niet** bevroren zijn de numerieke waarden van de primitives. Master v1 bevat voor vrijwel elke primitieve rol meerdere onverenigbare waarden — zeven knophoogtes, vier radii, vier tekstgraden (§ 1.2), vier icoontegel-tinten (D11), vijf haarlijnen (D12), drie navies (D8). Welke waarde de norm wordt, is geen ontwerpstemming maar een meting die per migratiestap wordt vastgelegd en daarna gesloten is (§ 0.10). Tot die stap blijft Master v1 renderen zoals hij rendert.

**Master v1 blijft de visuele norm.** De primitive neemt de waarde van Master v1 over, niet omgekeerd. Master v1 wordt hiervoor niet gerefactord: `index.html` en `home*.css` blijven byte-for-byte zoals in HEAD `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1` (gemeten in deze sessie: `git log -1` geeft exact die SHA, *feat: lock homepage master v1*).

### 0.2 HARD RULE

> **REPEATED VISUAL LANGUAGE → primitive/component.**
> **UNIQUE COMPOSITION → section-specific implementation.**

De regel is in dit document meetbaar, niet gevoelsmatig. "Repeated visual language" betekent: hetzelfde visuele patroon is in Master v1 méér dan één keer onder een eigen klassenaam opnieuw geïmplementeerd. Dat is precies de telling in § 1.6: **8 patronen, samen 48 losse implementaties** (07 ×7 · 08 ×2 · 09 ×5 · 10 ×11 · 12 ×8 · 13 ×8 · 21 ×3 · 26 ×4). Die 48 zijn per definitie primitive-materiaal.

"Unique composition" betekent: één instantie, geen tweede plek in de repository waar hetzelfde patroon voorkomt. Dat zijn de 15 componenten die § 1.6 als UNIEK telt. Die worden section-specific geïmplementeerd — dus mét gebruik van de primitives waar ze primitieve rollen bevatten, maar zonder dat de compositie zelf een herbruikbare klasse wordt.

**Toetsmoment.** De regel wordt per migratiestap opnieuw toegepast, niet één keer vooraf. Komt een tot nu toe unieke compositie voor de tweede keer aantoonbaar terug op een gemigreerde pagina, dan verhuist hij alsnog naar de primitivelaag — behalve de vijf uit § 0.4, die ook dan section-specific blijven tot er werkelijk hergebruik is.

### 0.3 Primitives (frozen) — de volledige lijst

Twaalf families. **Extra primitives alleen wanneer aantoonbaar nodig**, dat wil zeggen: pas nadat een dertiende rol in minstens twee gemigreerde pagina's onder twee verschillende klassennamen is geïmplementeerd.

| # | Primitive | Rol | Landt op (Master v1, gemeten) | Waarde vastgesteld bij | Open normvraag |
|---|---|---|---|---|---|
| P01 | `.vibe-container` | horizontale begrenzing en gutter | **geen equivalent in Master v1.** Op desktop positioneert elke sectie absoluut in cqw; op mobiel is `--m-gutter` (home-mobile.css:16, `clamp(20px,5.4vw,24px)`) de enige containernorm | migratiestap 1 | — |
| P02 | `.vibe-section` | sectiewortel: `container-type:inline-size`, verticaal ritme | negen sectiewortels, elk met eigen canvas (§ 2.4) en eigen `--m-sec-y` (home-mobile.css:17/37: 44px / 64px) | migratiestap 1 | — |
| P03 | `.vibe-eyebrow` | korte kwalificatie boven de kop | component **10** — tien levende klassen + één dode (`.vh-m-eyebrow`, home-mobile.css:227-234, 0 treffers) | migratiestap 1 | D2 gewicht · D3 kapitalisatie |
| P04 | `.vibe-heading` + `--*` | kop, met graad als modifier | component **11** (H1) en **12** (acht H2-klassen, waarvan `.vh-proof-kop2` in een `<h3>` staat) | migratiestap 1 | — |
| P05 | `.vibe-lead` | één alinea onder de kop | component **13** — acht klassen | migratiestap 1 | — |
| P06 | `.vibe-btn` + `--primary` `--secondary` `--ghost` `--text` | alle vier CTA-gedragingen | `--primary` ← component **07** (`.vh-btn-primair` + 7 sectie-eigen knoppen) · `--secondary` ← component **08** (A en B) · `--text` ← component **09** (A t/m E) · `--ghost` ← **geen Master v1-implementatie** | migratiestap 1 | D1 · D7 |
| P07 | `.vibe-card` + `--light` `--dark` `--media` | omkaderd inhoudsblok | `--light` ← **15**, **21** (×3), **23**, **27**, **29**, de resultaatkaart in **24** · `--dark` ← **16**, **25** · `--media` ← **17** en de beeldvariant van 16 | migratiestap 1-3 | D5 elevatie · D6 radius |
| P08 | `.vibe-icon` | kaal lijnicoon op de achtergrondkleur | KPI-icoon (**14**, `#0062FE`) · processtap-icoon (**20**) · voordeelicoon A (**26** A) · sectorkaart-icoon (**27**, `#16325A`) | migratiestap 1 | — |
| P09 | `.vibe-icon-tile` | icoon in een getint vlak | **15** (`--ct-badge` `#D8ECFE`) · **20** badge · **21** (`#DFEEFE`) · **26** B (`--if-tint` `#DEEFFD`) · **26** C (`--fi-tint` `#E8F3FE`) · **29** (rond, gevuld blauw) | migratiestap 1 | D11 |
| P10 | `.vibe-arrow` | pijlaffordance in een cirkel | `.vh-sol-pijl` (**16**) · `.vh-infra-kaart-pijl` (**27**). De inline pijl-`svg` ín een knop (`path d="M4 12h15m-6-6 6 6-6 6"`, 07/08/09) hoort bij `.vibe-btn`, niet hier | migratiestap 1 | D22 `aria-hidden` |
| P11 | `.vibe-metric` | waarde + kwalificatie | **14** (`.vh-kpi-getal`/`-label`) · **19** (`b`/`span`) · **24** (`dl` > `dt`/`dd`). Dit is het patroon dat § 1.6 drie keer los benoemt | migratiestap 2 | — |
| P12 | `.vibe-media` | beeld met bijsnijding en `srcset`/`sizes` | **17** · `.vh-pr-foto` (**18**) · `.vh-proof-foto` (**24**) · `.vh-infra-foto` (**27**) · `.vh-final-foto` (**28**) · footerwig-`img` (**30**) | migratiestap 2 | — |

**Buiten de primitivelijst, bewust.**

- **01 Skiplink** en **02 Focus-indicator** worden **globale basisregels** in het nieuwe stylesheet, geen primitive. Ze delen geen visuele taal met iets anders en komen één keer per pagina voor; onder de HARD RULE is dat geen "repeated visual language". De focusregel behoudt zijn `!important` (home.css:119-127) — zonder dat wint hij niet, zoals § 5.1 meet.
- **31 Cookiecomponent** en **33 Leadpopup** blijven **EXTERN**. Ze draaien op hun eigen stylesheet in `_consent.js` / `_leadpopup.js`, gebruiken geen enkel `--vibe-*`-token en worden in V1.0 niet gemigreerd. Zie § 0.6 (C-03, C-06) voor de copy-eisen die wél gelden.
- **32 Calendly-CTA-gedrag** heeft geen stijl en dus geen primitive. Het gedrag blijft ongewijzigd — zie § 0.6.

### 0.4 Composities die NIET geabstraheerd worden

Deze vijf blijven **section-specific implementation**, ook als een latere pagina er visueel op lijkt. Ze mogen primitives gebruiken; ze worden er zelf geen.

| Compositie | Component | Waarom uniek (gemeten) |
|---|---|---|
| Homepage hero-stage | **11** + de hero-geometrie | Vijf `clip-path`-declaraties in één bestand (§ 2.3), één `<h1>` per pagina, en een KPI-strook met een eigen 768-859-blok (home-hero.css:529-533). Komt nergens anders voor |
| VIBE.CONTROL-dashboardcompositie | **22** | Eigen markup-skelet van ~90 regels (index.html:623-713), eigen gedrag met `IntersectionObserver` en ticker (index.html:751-783), eigen toestandsklassen `.aan`/`.hot`/`.uit`/`.live` |
| Hedin featured-projectcompositie | **18** | Vier lagen met vaste z-volgorde, het enige sectiebestand zonder `clip-path` (§ 2.3) omdat de diagonaal in een SVG-polygoon zit (home-project.css:85-88) |
| Homepage process timeline | **20** | De horizontale voortgang met chevrons op desktop en de verticale `::before`-tijdlijn op mobiel (home-process.css:149-151 noemt het expliciet "één horizontale voortgang, geen losse kaarten") |
| Final CTA diagonal composition | **28** | Zespunts chevron-wig, foto-`clip-path` en blauw vlak als drie gestapelde `clip-path`-lagen (home-final.css:15-104); vijf `clip-path`-declaraties, het hoogste aantal samen met de hero |

**Voorwaarde voor heropening** Alleen wanneer dezelfde compositie op een tweede, gemigreerde pagina aantoonbaar terugkeert — dus met markup en CSS in de repository, niet als voornemen. Tot dat bewijs bestaat, is elke poging tot abstractie een regressie tegen de HARD RULE.

Overige UNIEKE componenten (**14**, **15**, **19**, **24**, **25**, **29**, **30**) zijn óók section-specific, maar zonder die garantie: zij verhuizen wél naar de primitivelaag zodra het tweede gebruik in de repository staat. **14**, **19** en **24** dragen bovendien nu al hetzelfde waarde/kwalificatie-patroon en landen daarom in hun kern op `.vibe-metric` (P11), met hun omhulsel section-specific.

### 0.5 Landingstabel — alle 33 componenten

`PRIMITIVE` = gaat volledig op in de primitivelaag. `PRIMITIVE + SECTION` = primitieve onderdelen komen uit P01-P12, de compositie blijft section-specific. `SECTION` = volledig section-specific. `NAV` = sitebrede navigatiecomponent onder C-01. `GLOBAAL` = globale basisregel. `EXTERN` = buiten V1.0.

| # | Component | Status in Master v1 (§ 1.6) | V1.0-landing | Primitives |
|---|---|---|---|---|
| 01 | Skiplink | GEDEELD | **GLOBAAL** | — |
| 02 | Focus-indicator | GEDEELD | **GLOBAAL** | — |
| 03 | Header + desktopnavigatie | UNIEK | **NAV** (C-01, platte header wordt standaard) | P06 `--primary` |
| 04 | Mobiele header | UNIEK | **NAV** (C-01) | P06 `--primary` |
| 05 | Menuknop | UNIEK | **NAV** (C-01) | — |
| 06 | Mobiel menu | UNIEK | **NAV** (C-01, Master-v1-navigatie wordt de mobiele standaard) | P06 `--primary` |
| 07 | Primaire CTA | GEDEELD in S1 · HERHAALD ×7 | **PRIMITIVE** | P06 `--primary` |
| 08 | Secundaire CTA | HERHAALD ×2 | **PRIMITIVE** | P06 `--secondary` |
| 09 | Tekstlink-CTA | HERHAALD ×5 | **PRIMITIVE** | P06 `--text` |
| 10 | Eyebrow | HERHAALD ×11 | **PRIMITIVE** | P03 |
| 11 | Hero-kop H1 | UNIEK | **PRIMITIVE + SECTION** — kop primitief, hero-stage niet (§ 0.4) | P04 |
| 12 | Sectiekop H2 | HERHAALD ×8 | **PRIMITIVE** | P04 |
| 13 | Lead-paragraaf | HERHAALD ×8 | **PRIMITIVE** | P05 |
| 14 | Proof/KPI-strip | UNIEK | **PRIMITIVE + SECTION** | P11, P08, P02 |
| 15 | Feature-kaart | UNIEK | **PRIMITIVE + SECTION** | P07 `--light`, P09 |
| 16 | Donkere oplossingskaart | GEDEELD in S2 | **PRIMITIVE** | P07 `--dark`/`--media`, P10, P08 |
| 17 | Beeldkaart | variant van 16 | **PRIMITIVE** | P07 `--media`, P12 |
| 18 | Projectpaneel | UNIEK | **SECTION** (§ 0.4, Hedin featured) | P12, P11 (via 19) |
| 19 | Projectmetriek | UNIEK | **PRIMITIVE + SECTION** | P11 |
| 20 | Processtap | GEDEELD in S4 | **SECTION** (§ 0.4, process timeline) | P08, P09, P04, P05 |
| 21 | Zwevende informatiekaart | HERHAALD ×3 | **PRIMITIVE** | P07 `--light`, P09 |
| 22 | VIBE.CONTROL-showcase | UNIEK | **SECTION** (§ 0.4) | — |
| 23 | Organisatie-vertrouwensrij | GEDEELD in S6 | **PRIMITIVE + SECTION** | P07 `--light` |
| 24 | Projectverhaalmodule | UNIEK | **PRIMITIVE + SECTION** | P11, P12, P07 `--light`, P06 `--primary` |
| 25 | Donkere projectstrook | UNIEK | **PRIMITIVE + SECTION** | P07 `--dark`, P06 `--text`, P12 |
| 26 | Voordelenlijst | HERHAALD ×4 | **PRIMITIVE** | P08, P09 |
| 27 | Infrastructuur/sectorkaart | GEDEELD in S7 | **PRIMITIVE** | P07 `--light`, P08, P10 |
| 28 | Final-CTA-compositie | UNIEK | **SECTION** (§ 0.4) | P06 `--primary`+`--secondary`, P12, P07 |
| 29 | Afspraakkaart | UNIEK | **PRIMITIVE + SECTION** | P07 `--light`, P09, P06 `--text` |
| 30 | Footer | UNIEK | **SECTION** (sitebreed, één implementatie) | P06 `--primary`, P12 |
| 31 | Cookiecomponent | EXTERN | **EXTERN** — niet in V1.0 | — |
| 32 | Calendly-CTA-gedrag | GEDEELD (gedrag) | **GEDRAG — ongewijzigd** (§ 0.6) | hangt op P06 |
| 33 | Leadpopup | EXTERN | **EXTERN** — niet in V1.0 | — |

**Controle op de telling.** 33 componenten: **2 GLOBAAL** (01, 02) · **4 NAV** (03, 04, 05, 06) · **11 PRIMITIVE** (07, 08, 09, 10, 12, 13, 16, 17, 21, 26, 27) · **8 PRIMITIVE + SECTION** (11, 14, 15, 19, 23, 24, 25, 29) · **5 SECTION** (18, 20, 22, 28, 30) · **2 EXTERN** (31, 33) · **1 GEDRAG** (32). Samen 33.

De acht herhaalde patronen uit § 1.6 — 07, 08, 09, 10, 12, 13, 21 en 26, samen **48** losse implementaties — vallen alle acht in de kolom PRIMITIVE. Dat is precies de werkvoorraad die na migratie verdwijnt. Ze landen op zeven primitivefamilies: 07/08/09 → **P06** (drie modifiers) · 10 → **P03** · 12 → **P04** · 13 → **P05** · 21 → **P07** + **P09** · 26 → **P08** + **P09**.

### 0.6 Besluiten die de bibliotheek binden

Alle onderstaande punten zijn **DECIDED — V1.0**. Ze mogen nergens in dit document nog als DECISION REQUIRED staan; § 4 is daarop bijgewerkt.

#### C-01 · Navigatiemodel = A — DECIDED — V1.0

De platte Master-v1-header wordt de sitebrede standaard en het legacy mega-menu verdwijnt. *Motivering:* Master v1 laadt het mega-menu al niet (§ 3/03 DON'T) en de platte header is de enige navigatie die in de bevroren homepage bewezen rendert.

Wat dat concreet betekent voor de componenten 03 t/m 06:

- **Desktop:** platte header, logo links, primaire CTA rechts — exact de compositie van component **03** (`index.html:128-161`, `home-hero.css:137-192, 238`).
- **Mobiel:** de Master-v1-navigatie van component **04**, **05** en **06** wordt de standaard, inclusief de scroll-lock op `html` én `body` (home-mobile.css:68-69) en de `document`-level capture-listener die het menu sluit (index.html:1158-1160, zie § 3/32.5).
- **Responsive grens:** **1199px** blijft de primaire navigatiegrens. Gemeten tegenbewijs dat hiermee vervalt: het legacy mega-menu schakelt op drie andere grenzen — `_header.js:113` en `_header.js:210` op `max-width:1024px` (burger aan, navlinks uit), `_header.js:209` op `max-width:1180px` (secundaire CTA uit), `_header.js:69` en `:89` op `max-width:1040px` (mega-menu-kolommen). Met het mega-menu verdwijnen alle drie. Herziening van 1199px alleen op implementatiebewijs, niet op smaak.
- **Proposities verdwijnen niet uit de IA.** Het mega-menu ontsluit vandaag 19 bestemmingen in drie kolommen (gemeten `_header.js:22-47`: Oplossingen 9 items, Industrieën 5 items, Systeem 5 items). De platte Master-v1-header draagt er zes (index.html:142-147: `#oplossingen`, `projecten`, `#aanpak`, `#vibe-control`, `waarom-vibe`, `over-ons`). Het verschil moet landen op overzichtspagina's en interne navigatie, niet op een teruggebouwd mega-menu.
- **"Oplossingen" wordt een belangrijke navigatie-ingang.** Gemeten: er bestaat **geen** `oplossingen.html` in de repository (48 HTML-bestanden geteld; wel `oplossing-energielabel`, `-exploitatie`, `-laadplein`, `-netcongestie`, `-paris-proof`, `-subsidies`). Het Master-v1-menu-item wijst naar het interne anker `#oplossingen` (index.html:142), niet naar een pagina. De bestemming is dus **PAGE PENDING** — zie D25.
- **Systemen, producten, Energy Hubs en systeemcategorieën** blijven bereikbaar via overzichtspagina's en interne navigatie. Bestaande bestemmingen, gemeten: `systeem-ems`, `systeem-energieopslag`, `systeem-zonnepanelen`, `systeem-laadpalen`, `microgrids`, `energy-hubs`. Waar een overzichtspagina ontbreekt, is dat **PAGE PENDING**, geen reden om het mega-menu te behouden.

#### C-02 · VIBE.CONTROL / EMS = A — DECIDED — V1.0

VIBE.CONTROL is de commerciële productnaam, EMS blijft de functionele categorie en SEO-term; schrijfwijzen naar context: `VIBE.CONTROL`, `Energiemanagementsysteem (EMS)`, `VIBE.CONTROL EMS`. *Motivering:* de SEO-waarde op EMS / energiemanagementsysteem mag niet verloren gaan terwijl de propositie onder één merknaam komt.

Master v1 implementeert dit al correct en hoeft er niet voor te veranderen: de eyebrow van sectie 5 is `VIBE.CONTROL` (index.html:716) terwijl de hub ín het dashboard letterlijk `EMS` heet (`div.vh-ctrl-hub "EMS"`, § 3/22 anatomie) en de oplossingskaart `--ems` naar `systeem-ems` linkt (index.html:417). Bij migratie wordt `systeem-ems.html` de VIBE.CONTROL-productpagina met voldoende EMS-context. Gevolg voor component **16**: de `--ems`-kaart houdt zijn bestemming; alleen het label volgt de contextregel.

#### C-03 · Executive Guides = B — DECIDED — V1.0

Gated assets / lead magnets, geen publiek pagina-archetype. *Motivering:* ze zijn de inhoudelijke lading van de leadflow, niet van de SEO-contentlaag.

Gemeten: zeven guides draaien op `report.css` (`capaciteit-als-dienst`, `energie-als-vastgoedopbrengst`, `energiehandel-flexmarkten`, `exploitatie-zonder-investering`, `energielabel-verhogen`, `laadplein-zonder-verzwaring`, `netcongestie-oplossen`). Drie daarvan staan in `sitemap.xml` (regels 16, 118, 124: `energie-als-vastgoedopbrengst`, `capaciteit-als-dienst`, `energiehandel-flexmarkten`), vier niet. De guide-inhoud blijft behouden; ontsluiting loopt via de leadflow. Raakt component **33**, niet de primitivelaag. **NU GEEN productiecode wijzigen.**

#### C-04 · Sticky mobiele CTA = A — DECIDED — V1.0

**Geen sticky mobiele CTA in Design System V1.0.** CTA's worden in de pagina geïntegreerd, zoals in Master v1. *Motivering:* Master v1 lost de mobiele conversiedruk op met volle-breedte-CTA's ín de sectie (§ 1.3: acht knoppen convergeren onder 1200px naar `width:100%` · `height:var(--m-btn-h)` · `border-radius:10px` · `justify-content:space-between`), zonder een vaste balk over de inhoud.

Wat verdwijnt, gemeten:

- `.mcta` is een `position:fixed` balk onderaan het scherm met `z-index:90`, `display:none` als basis en `display:flex` onder `max-width:760px`, plus `body{padding-bottom:74px}` (`subpage.css:262-266`); een lichte variant staat op `subpage.css:379-381`.
- De string `mcta` komt voor in **26** HTML-bestanden (gemeten). De CSS staat in `subpage.css` én in eigen `<style>`-blokken van twaalf pagina's (elf `project-*.html` plus `projecten.html`, waarvan `projecten.html:328`).
- Markupvorm, voorbeeld `systeem-ems.html:246-249`: `div.mcta > a.p` + `a.g` — twee acties naast elkaar.

**Gevolg voor de bibliotheek:** er komt géén primitive voor een sticky balk; `.vibe-btn` kent geen `--sticky`. Let op de breekpuntbotsing: `.mcta` schakelt op **760px** (`subpage.css:266`), terwijl Master v1 uitsluitend op 767 / 1199 schakelt (§ 2.1). Gemeten komt `max-width:760px` **17×** voor in de repo — het is de bredere legacy-subpaginagrens, niet iets van `.mcta` alleen. Het schrappen van de balk haalt dus één van die zeventien weg; de overige zestien blijven tot de betreffende pagina's zelf migreren. Niet opruimen als neveneffect. **Niet dogmatisch verboden:** een sticky CTA mag terugkomen als afzonderlijke CRO-test wanneer conversiedata dat ondersteunt, maar hoort niet bij V1.0 en wordt dan als losse test gespecificeerd, niet als primitive.

#### C-05 · Sectoren = nieuwe canonieke taxonomie — DECIDED — V1.0

Vijf sectoren plus één segment. *Motivering:* vijf bronnen in de repository gebruiken vier verschillende labelsets voor dezelfde as; zonder één canonieke lijst kan geen enkele sectorcomponent een vaste contentregel krijgen.

| Canoniek | Legacy-labels | Pagina | Cases | Bewijsstatus | Aanbevolen URL |
|---|---|---|---|---|---|
| Commercieel vastgoed | Vastgoed, Bedrijfspand, Bedrijfspanden | `industrie-vastgoed` | purmerend, ratio-16 | VERIFIED (2) | `/sector/commercieel-vastgoed` |
| Woningportefeuilles | Residentieel vastgoed, Residentieel | `industrie-residentieel` | arnhem-60, burchtstraat, ketsheuvel, nieuw-schoonoord, schouwburgring, van-beethovenstraat | VERIFIED (6) | `/sector/woningportefeuilles` |
| Recreatie | — | `industrie-recreatie` | dormio-medemblik | VERIFIED (1) | `/sector/recreatie` |
| Logistiek & transport | Logistiek | `industrie-logistiek` | geen | **CASE PROOF = PENDING** | `/sector/logistiek` |
| Automotive | — | **ONTBREEKT (PAGE PENDING)** | hedin-alkmaar, hedin-amsterdam | VERIFIED (2), pagina ontbreekt | `/sector/automotive` |
| VvE (segment binnen Woningportefeuilles) | — | `industrie-vve` | geen | **CASE PROOF = PENDING** | `/sector/woningportefeuilles/vve` |

"Netcongestie & Energy Hubs" is geen sector maar een probleem/oplossing en verhuist van de sector-as naar de oplossing-as (B2-variant Oplossing). Gemeten staat het vandaag ten onrechte als eerste filterchip op de sector-as van `projecten.html:185`.

**Herkomst van deze tabel.** In déze sessie zelf hergeteld: het bestaan van de vijf `industrie-*.html`-sectorpagina's, het **ontbreken** van een automotive-sectorpagina (48 HTML-bestanden), en de vijf filterchips op `projecten.html:183-190`. **Niet** in deze sessie hergeteld, maar overgenomen uit de repo-inventarisatie waarmee de besluiten zijn vastgesteld: de toewijzing van de elf casepagina's aan sectoren via hun `Sector`-veld en hun kruimelpad, en de labelset van het legacy mega-menu per sector. Wie die toewijzing opnieuw nodig heeft, telt hem opnieuw; dit document beweert niet hem zelf per casepagina te hebben afgelezen.

**Vastgestelde asymmetrieën die de taxonomie moet dekken:** Automotive heeft cases maar geen sectorpagina · Logistiek heeft een sectorpagina maar geen case · VvE heeft een sectorpagina maar geen case · `project-arnhem-60.html` mist het `Sector`-veld. Waar geen case is, staat **CASE PROOF = PENDING**; niets invullen.

**Gevolg voor component 27 (Infrastructuur/sectorkaart).** De vier kaarten dragen nu de labels Vastgoed, Logistiek, Recreatie, Woningportefeuilles (index.html:921-942). Onder de canonieke taxonomie worden dat Commercieel vastgoed, Logistiek & transport, Recreatie, Woningportefeuilles. Automotive heeft twee VERIFIED cases maar geen sectorpagina; een vijfde kaart mag pas verschijnen als die pagina bestaat — **NO PAGE → NO LINK PROMISE**, analoog aan C-06. De kaartlabels wijzigen pas bij de sectiemigratie van sectie 7; tot dan blijft Master v1 byte-for-byte.

#### C-06 · Brochure-/guide-delivery = A waar het asset bestaat, anders B — DECIDED — V1.0

> **HARDE REGEL: NO ASSET → NO DOWNLOAD PROMISE.**

*Motivering:* de download die de copy belooft bestaat niet. Gemeten in deze sessie:

- **Er staat geen enkele PDF in de repository** (`find . -name '*.pdf'` buiten `.git`: nul treffers) en de map `assets/brochures/` **bestaat niet** (`ls assets/brochures` → *No such file or directory*).
- Het dode pad `assets/brochures/netcongestie-oplossen.pdf` staat op **`_leadpopup.js:9`**, in het voorbeeldconfigblok van het bestandscommentaar (`_leadpopup.js:1-19`) — **niet** als runtime-default. De runtime-default is leeg: `var file = cfg.file || '';` (`_leadpopup.js:32`) en zonder `file` breekt het script direct af (`_leadpopup.js:33`). *Afwijking van de briefing:* die noemt `_leadpopup.js:26`; regel 26 is gemeten `var LEAD_ENDPOINT = …`. De vindplaats is gecorrigeerd, de conclusie niet: het gedocumenteerde voorbeeldpad is dood en moet bij migratie worden gecorrigeerd.
- Vijf pagina's configureren `window.VIBE_LEAD` met een `file` die naar een **HTML-pagina** wijst, niet naar een PDF: `index.html:1242` → `energie-als-vastgoedopbrengst.html` · `oplossing-laadplein.html:269` → `laadplein-zonder-verzwaring.html` · `oplossing-energielabel.html:857` → `energielabel-verhogen.html` · `oplossing-exploitatie.html:295` → `exploitatie-zonder-investering.html` · `oplossing-netcongestie.html:299` → `netcongestie-oplossen.html`.
- De popup-copy zegt niettemin `Gratis brochure` (`_leadpopup.js:113`) en belooft "in één document, direct beschikbaar" (`_leadpopup.js:115`).
- Twee guides (`capaciteit-als-dienst`, `energiehandel-flexmarkten`) worden door geen enkele leadconfig als asset aangeboden.

**Gevolg voor component 33.** De copy mag geen PDF-download beloven; geleverd wordt een guidepagina. Routering uiteindelijk naar een zakelijke centrale bestemming, niet naar een persoonlijk e-mailadres. **NU GEEN productiecode wijzigen** — dit wordt uitgevoerd bij migratiestap 7 (S2 gated guides).

#### C-07 · Onbewezen cijfers = B tot A bewezen is — DECIDED — V1.0

`47 opgeleverde projecten` / `12 MWp zon geïnstalleerd` / `98% gemiddelde uptime` zijn **NIET VERIFIED** puur omdat ze gepubliceerd zijn. *Motivering:* **PUBLICLY EXISTING ≠ VERIFIED** (§ 0.9).

Master v1 past dit al toe en is daarmee de referentie-implementatie: component **14** wijst `47 opgeleverde projecten`, `12 MWp zon`, `98% uptime`, `892 ton CO2` én `11 opgeleverde projecten` expliciet af (index.html:208-255) en publiceert in plaats daarvan `11 projecten uitgelicht`. Component **22** wijst acht referentiewaarden af (index.html:615-622). Component **23** wijst nagebouwde logo's af (index.html:789-794). Component **24** wijst een testimonial af (index.html:817-826).

**Twee nieuwe UNVERIFIED-vindplaatsen, gemeten in deze sessie.**

1. `_leadpopup.js:116` toont `VIBE ENERGY · 7 waardestromen · 0 jr wachttijd · −22% netinkoop` zonder bron. Status **UNVERIFIED** onder dezelfde policy. Bij de migratie van component **33**: VERIFIED maken met primaire bron, herschrijven, of verwijderen. **NU GEEN productiecode wijzigen.**
2. `projecten.html:191` toont `Alle 11 gerealiseerde projecten`, terwijl component **14** de formulering `11 opgeleverde projecten` uitdrukkelijk afwijst en `11 projecten uitgelicht` gebruikt (index.html:208-255). Dat is **CONFLICTING**: twee pagina's in dezelfde repository dekken dezelfde telling met een andere claim. Migratie van die claim is geblokkeerd tot opgelost — zie D29.

Worden later primaire bronnen aangeleverd, dan opnieuw beoordelen.

#### Secundaire CTA-norm — DECIDED — V1.0

**Er komt één `.vibe-btn--secondary`.** De twee onverenigbare specificaties van component **08** (`.vh-btn-secundair`, home-hero.css:230-235 + 282 · `.vh-final-cta2`, home-final.css:189-208) convergeren; geen van beide overleeft als klasse. *Motivering:* de primitivelijst is bevroren op vier knopmodifiers (§ 0.3, P06) — de vraag "welke van de twee is de norm" bestaat daarmee niet meer als ontwerpvraag, alleen nog als meting.

Wat daarmee óók vastligt:

- Alle vijf tekstlink-CTA's van component **09** landen op `--text`, niet op een eigen sectieklasse.
- `--ghost` heeft **geen** Master v1-implementatie en wordt pas ingevuld wanneer een gemigreerde pagina hem aantoonbaar nodig heeft.
- De zeven hardgecodeerde hovertinten `#005FE0` (home-solutions.css:84, home-project.css:193, home-control.css:277, home-proof.css:212, home-infra.css:128, home-final.css:188, home-footer.css:236) worden één semantisch token; `--vibe-blauw-diep` (home.css:36) bevat die waarde al — zie D4.
- `box-sizing:border-box` staat in de **basisdefinitie** van `.vibe-btn`, niet per instantie. § 5.2 meet waarom: `.vh-ctrl-cta` is de enige van de acht mobiele CTA's met `content-box` en steekt daardoor 18,93px voorbij de gutterlijn.

De numerieke waarden (hoogte, radius, tekstgraad, randdikte, uitlijning) worden vastgelegd bij **migratiestap 1** en daarna gesloten — zie D1 en D7.

#### Calendly-CTA-gedrag — DECIDED — V1.0: ongewijzigd

Component **32** blijft exact zoals § 3/32 het beschrijft. *Motivering:* het is het enige gedrag in het systeem waarvan gemeten is dat een verkeerde implementatie het mobiele menu sloopt (§ 3/32.4-32.5), en er is geen besluit dat het raakt.

Dat betekent voor elke nieuwe pagina en elke primitive:

- `data-calendly` staat expliciet op elke afspraak-CTA, ook als het label toevallig op `/plan.*gesprek|adviesgesprek|bekijk.*praktijkcase/i` matcht (`_footer.js:151-155`).
- `href="contact"` blijft de werkende fallback zonder JS.
- Elk nieuw component dat op dezelfde kliks moet reageren, registreert op `document` of `window` in de **capture**-fase. Niet op `body` of dieper, en nooit in de bubble-fase (§ 3/32.4, gemeten met twaalf listeners).
- `.vibe-btn` krijgt geen eigen klikafhandeling. Het gedrag hangt op het attribuut, niet op de klasse — dat is precies waarom het primitief-worden van de knoppen het gedrag niet raakt.

### 0.7 Tokens (frozen): PRIMITIVE → SEMANTIC → component

Twee verplichte lagen, een derde alleen wanneer een component een eigen semantische waarde nodig heeft:

```
--vibe-blue-500        PRIMITIVE   de kale waarde
   ↓
--color-action-primary SEMANTIC    de rol
   ↓
--btn-primary-bg       COMPONENT   alleen wanneer nodig
```

Geen onnodige enterprise-tokenlagen. **Hardgecodeerde hex- en rgba-varianten worden tijdens migratie genormaliseerd wanneer ze een herhaalde semantische rol hebben** — en alleen dan. Wat dat concreet raakt, met de metingen uit § 1.4 en § 4:

| Rol | Gemeten spreiding | Actie |
|---|---|---|
| Hovertint primaire knop | 7× `#005FE0` hardgecodeerd, 1× via `var(--vibe-blauw-diep)` | herhaalde rol → SEMANTIC token (D4) |
| Icoontegel-tint | `#D8ECFE` (2× apart gedefinieerd), `#DEEFFD`, `#E8F3FE` | herhaalde rol → één SEMANTIC token (D11) |
| Haarlijn op licht | `#E5EFFA`, `#E4F0FC`, `rgba(16,28,58,.12)`, `#DCE7F3`, `#DCE7F2` | herhaalde rol → één SEMANTIC token (D12) |
| Navy | `--vibe-navy` `#08203C`, `--vh-navy` `#071D3A`, `--ft-navy` `#0C1B33` | herhaalde rol → één SEMANTIC token (D8) |
| Elevatie | `--vibe-elev-1`/`-2` 0× via `var()`, 15 losse `box-shadow`-declaraties | herhaalde rol → SEMANTIC schaal (D5) |
| Sectie-aliassen (`--vh-blauw`, `--sol-blauw`, …, ~44 stuks) | alleen het merkblauw is volledig token-backed (§ 1.4) | vervallen met de sectienamespaces |

**Wat níét genormaliseerd wordt:** waarden die één keer voorkomen en geen rol delen — bijvoorbeeld de scrimverlopen van component **16** (home-solutions.css:171-175, met de gemeten 1,00:1-motivering) en de `clip-path`-coördinaten van § 0.4. Die horen bij een unieke compositie en zijn per definitie geen herhaalde semantische rol.

**`tokens.css` blijft legacy.** § 2.5 meet dat geen van de 229 unieke klassen in `index.html` door de UNIFY-laag wordt geraakt. De nieuwe semantische laag komt in het nieuwe stylesheet, niet in `tokens.css`.

### 0.8 Responsive typografie

**Default: `clamp()`.** `cqw` uitsluitend voor bewust canvas-proportionele composities — dat wil zeggen: de vijf composities van § 0.4 plus de secties die als één geschaald canvas zijn ontworpen (§ 2.4: canvassen 1774 / 2056 / 1536 / 2103).

**Master v1 wordt hiervoor NU NIET gerefactord.** De homepage is vrijwel volledig in `cqw` opgebouwd en blijft dat; alleen nieuwe pagina's en gemigreerde secties volgen de clamp-default. De mobiele laag doet dit al: `--m-h1` t/m `--m-body` zijn `clamp()`-waarden (home-mobile.css:21-25), alleen `--m-h3`, `--m-lead`, `--m-body`, `--m-eyebrow`, `--m-btn-h`, `--m-radius` en `--m-radius-img` staan vast.

### 0.9 Claim policy (frozen — exact deze vijf statussen)

| Status | Betekenis | Publiceerbaar? |
|---|---|---|
| **VERIFIED** | primaire bron: rapport, contract, meetdata, productspecificatie | ja, binnen de scope van die bron |
| **SUPPORTED** | reproduceerbaar af te leiden uit betrouwbare repository-data | ja, uitsluitend in een formulering die exact de telling/bron dekt |
| **UNVERIFIED** | bestaat in marketingcopy, onderbouwing ontbreekt | nee — niet automatisch migreren; kwalitatief herschrijven, CONTENT PENDING, of verwijderen |
| **CONFLICTING** | bronnen noemen verschillende waarden | nee — migratie van die claim blokkeren tot opgelost |
| **REMOVE/REWRITE REQUIRED** | aantoonbaar fout, misleidend of ruimer dan de bron | nee — niet meenemen |

> **HARD RULE: PUBLICLY EXISTING ≠ VERIFIED.**

De contentregels in § 3 zijn hierop al geschreven. Voorbeelden van SUPPORTED-formuleringen die Master v1 hanteert: `11 projecten uitgelicht` in plaats van `11 opgeleverde projecten` (component **14**), `Exploitatie mogelijk per situatie` in plaats van een garantie (component **14**), `Voorbeeldweergave` bij het dashboard (component **22**), `Voorkomt pieken en piekkosten` in plaats van "boetes" (component **15**).

### 0.10 Migratiepad zonder visuele regressie

Vier stappen, in deze volgorde. Stap 4 begint niet voordat 1 t/m 3 af zijn.

#### Stap 1 — Primitives additief invoeren in een nieuw stylesheet

- De primitives komen in **één nieuw CSS-bestand**. Gemeten: de repo bevat **17** CSS-bestanden — `ec.css`, `frameiq-harmonize.css`, `home.css`, `home-control.css`, `home-final.css`, `home-footer.css`, `home-hero.css`, `home-infra.css`, `home-mobile.css`, `home-process.css`, `home-project.css`, `home-proof.css`, `home-solutions.css`, `project-case.css`, `report.css`, `subpage.css`, `tokens.css`. Er is nog geen primitivebestand; het wordt **nieuw aangemaakt**, niet uit een bestaand bestand afgesplitst en niet aan `home.css` toegevoegd.
- **`home*.css` wordt niet aangeraakt.** Geen regel toegevoegd, geen regel verwijderd, geen selector hernoemd. Hetzelfde geldt voor `index.html`, `tokens.css`, `_header.js`, `_footer.js`, `_leadpopup.js` en `_consent.js`. Dit verbod geldt gedurende **stap 1 t/m 3**; pas in stap 4 komt de homepage per sectie aan de beurt, en dan alleen onder de pixeldiff-poort. `index.html` en `home*.css` blijven tot dat moment byte-for-byte zoals in HEAD `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1`.
- **Bewijs dat dit additief kán.** Elke homepage-klasse draagt het prefix `.vh-` (§ 1.1, negen namespaces) en § 2.5 meet 229 unieke klassen in `index.html` met **0** treffers op de UNIFY-selectors van `tokens.css`. De naamruimten `.vibe-*` en `.vh-*` zijn disjunct. Zelfs als het nieuwe stylesheet per ongeluk op de homepage zou laden, verandert er niets — dat is de poort die de additiviteit bewijst, en hij is vóór stap 2 te draaien.
- **Uitzondering die bewust géén uitzondering is:** de globale basisregels (01 skiplink, 02 focus-indicator) selecteren wél op elementen en pseudoklassen. Zij worden in het nieuwe stylesheet herhaald met dezelfde waarden als `home.css:119-127`, inclusief `!important` — zodat een pagina die alleen het nieuwe stylesheet laadt dezelfde focusring krijgt. De homepage blijft `home.css` gebruiken.

#### Stap 2 — Nieuwe pagina's uitsluitend op primitives

- Elke pagina die ná de freeze wordt gebouwd, gebruikt **uitsluitend** P01-P12 plus een section-specific laag voor wat aantoonbaar uniek is.
- **Verboden:** een nieuwe sectie-eigen knop, eyebrow, kop of lead. Dat is precies het patroon dat dit document beëindigt (§ 3/07 DON'T, § 1.6: 48 losse implementaties).
- **Verboden:** een nieuwe `.vh-*`-klasse. Die namespace is van Master v1 en blijft dat.
- Per archetype geldt bovendien de proofregel van B2 (SYSTEM / SOLUTION / SECTOR / GEBIED, § 0.11) en de claim policy (§ 0.9).
- De CTA-regels van C-04 (geen sticky) en § 0.6 (Calendly) gelden vanaf de eerste nieuwe pagina.

#### Stap 3 — Master per bouwtype, met visual + functional review

Volgens de vastgestelde migratievolgorde (§ 0.11). Elke master wordt opgeleverd, visueel én functioneel beoordeeld en daarna **gelockt**; pas dan volgen de overige pagina's van dat type.

#### Stap 4 — Homepage sectie voor sectie, met pixeldiff-poort

De homepage gaat als **laatste**, en dan sectie voor sectie — nooit in één keer. B1 is al Master v1 en wordt niet opnieuw gebouwd; de secties worden alleen van `.vh-*` naar primitives overgezet waar de landingstabel (§ 0.5) dat voorschrijft.

**De poort.** Per sectie, vóór en ná, op vier breedtes:

| Breedte | Waarom deze (gemeten) |
|---|---|
| **1774** | het referentiecanvas van de secties 1, 2, 6 en 7 (§ 2.4). Hier geldt `1cqw = 17,74px`, zodat élke cqw-waarde in § 3 één op één met de gedocumenteerde px vergelijkbaar is |
| **1440** | desktop ónder het referentiecanvas, boven de 1199-grens. Toetst de cqw-schaling zonder een breekpunt te kruisen |
| **768** | de onderrand van het tabletbereik: de exacte ondergrens van elf `(min-width:768px) and (max-width:1199px)`-blokken (§ 2.1) en de bovengrens van het mobiele bereik |
| **390** | de breedte waarop § 5.2, § 5.3 en de Calendly-zichtbaarheidstabel (§ 3/32.3) in deze sessie zijn gemeten; alle mobiele bevindingen zijn hierop reproduceerbaar |

**Slaagcriterium: delta = 0 px, behalve voor vooraf opgesomde wijzigingen.** Elke afwijking moet vóór de migratie van die sectie per component en per eigenschap zijn opgeschreven, met de gemeten oude en nieuwe waarde. Een niet-opgesomde afwijking is een regressie: stoppen en rapporteren, niet doorfixen.

**Wat als opgesomde wijziging is toegestaan.** Alleen twee soorten:

1. **Convergentie naar een al vastgelegde primitive-waarde.** Zodra migratiestap 1 bijvoorbeeld de knophoogte heeft vastgelegd, wijkt elke sectie die vandaag een andere hoogte rendert daarvan af — zeven hoogtes worden er één (§ 1.2). Die delta is per sectie vooraf te berekenen uit de tabel in § 1.2 en moet daar ook uit zijn overgenomen.
2. **Een in § 5 gemeten defect dat deze sectie betreft.** Vandaag zijn dat er vier: § 5.1 dode focusring (sectie mobiel menu), § 5.2 `.vh-ctrl-cta`/`.vh-ctrl-feats` buiten het paginaraster (sectie 5), § 5.3 `order` zonder flexcontainer (sectie 5), § 5.4 `.vh-final-kaart-link` verborgen op tablet (sectie 8). Het herstel daarvan is een bedoelde delta.

**Wat nooit een toegestane delta is:** een andere kleur, een ander verloop, een andere `clip-path`, een andere bijsnijding of een andere copy. Die horen niet bij een structurele migratie.

**Terugrollen.** Een gezakte poort rolt uitsluitend díé sectie terug. `home*.css` is per sectie één bestand, dus de terugrol is een bestandsherstel — dat is de tweede reden om `home*.css` in stap 1 onaangeroerd te laten.

**Volgorde binnen de homepage.** Van laag naar hoog risico, gemeten aan het aantal `clip-path`-declaraties en het aantal gemeten defecten: eerst de secties zonder geometrie en zonder defect, als laatste de hero (5 `clip-path`) en de final CTA (5 `clip-path`). Sectie 3 heeft als enige geen `clip-path` maar wel een SVG-polygoon die mee moet (§ 2.3).

#### Wat buiten de pixeldiff-poort valt

De 26 `.mcta`-pagina's (C-04) zijn geen Master v1 en hebben geen bevroren referentie. Zij krijgen hun eigen vóór/ná op 390px, waarbij het verdwijnen van de vaste balk **en** van `body{padding-bottom:74px}` (`subpage.css:266`) de bedoelde wijziging is. Daar is de delta per definitie niet nul; de eis is dat de in-page CTA die ervoor in de plaats komt op 390px bereikbaar is zonder de balk.

### 0.11 Archetypes en migratievolgorde

**Archetypes (geaccepteerd).** B1 Startpagina · B2 Propositiepagina (varianten Systeem / Oplossing / Sector / Gebied) · B3 Casepagina · B4 Indexpagina · B5 Standpuntpagina · B6 Conversie-instrument (varianten formulier / wizard) · B7 Juridisch document · S2 Executive Guide (gated documentsysteem).

Een bouwtype is **geen rigide template**: het bepaalt informatiehiërarchie, beschikbare componentfamilies, proof requirements, CTA-strategie en responsive principes — niet een vaste sectievolgorde of identieke layout.

**B2-proofregels per variant:**

| Variant | Proof requirement |
|---|---|
| SYSTEM | productspecificaties / technische onderbouwing |
| SOLUTION | probleem → oplossing → projectbewijs |
| SECTOR | sectorprobleem → toepassing → sectorcase |
| GEBIED | lokale relevantie → toepasselijke oplossing → echte lokale/projectonderbouwing waar beschikbaar |

Geen generieke SEO-doorway-template.

**Migratievolgorde (definitief).**

```
DESIGN SYSTEM V1.0 FREEZE → MASTER PAGE PER BOUWTYPE → VISUAL + FUNCTIONAL REVIEW
→ MASTER LOCK → OVERIGE PAGINA'S VAN DAT TYPE → QA → VOLGENDE
```

| Stap | Bouwtype | Masterpagina |
|---|---|---|
| 1 | B2 | `systeem-energieopslag.html` |
| 2 | B3 | `project-ratio-16.html` |
| 3 | B4 | `projecten.html` |
| 4 | B6 | `contact.html` |
| 5 | B5 | `waarom-vibe.html` |
| 6 | B7 | `privacy.html` |
| 7 | S2 | gated guides |

**B1 is al Master v1 en wordt NIET opnieuw gebouwd.** De homepage komt alleen aan bod in stap 4 van § 0.10, en dan uitsluitend als sectie-voor-sectie-omzetting onder de pixeldiff-poort.

---

## 1 · Status van de bibliotheek

### 1.1 De kern, zonder omhaal

**Master v1 implementeert de componenten in dit document NIET als gedeelde klassen.** Er is één echt gedeeld primitief — `.vh-btn` / `.vh-btn-primair` / `.vh-btn-secundair` (`home-hero.css:207-235`) — en dat wordt buiten sectie 1 nergens gebruikt. Elk van de negen secties herdefinieert daarna zijn eigen knop, eyebrow, kop, lead en kaart met eigen maten, onder een eigen namespace (`.vh-`, `.vh-sol-`, `.vh-pr-`, `.vh-proc-`, `.vh-ctrl-`, `.vh-proof-`, `.vh-infra-`, `.vh-final-`, `.vh-footer-`).

Het resultaat is visueel consistent en structureel niet-herbruikbaar. Dit document is de normatieve definitie waar de migratie naartoe werkt; het is geen beschrijving van bestaande herbruikbare code.

### 1.2 Bewijs A — vijftien CTA-klassen voor vier gedragingen

Vijftien klassen, elk exact één keer in de markup behalve `.vh-btn` (3×) en `.vh-btn-primair` (2×). Gemeten breedte/hoogte/radius/tekstgraad in px op een viewport van 1774 (`1cqw = 17,74px`):

| # | Klasse | Bestand:regel | Rol | Breedte | Hoogte | Radius | Tekst | svg |
|---|---|---|---|---|---|---|---|---|
| 1 | `.vh-btn` (basis) | home-hero.css:207-223 | primitief | — | 63,00 | 10,00 | 18,00 | 23,00 |
| 2 | `.vh-btn-primair` (header) | home-hero.css:224-229 + 238 | gevuld | 227,00 | 63,00 | 10,00 | 18,00 | 23,00 |
| 3 | `.vh-btn-primair` (hero) | home-hero.css:281 | gevuld | 228,00 | 62,00 | 10,00 | 18,00 | 23,00 |
| 4 | `.vh-btn-secundair` (hero) | home-hero.css:230-235 + 282 | outline | 249,00 | 62,00 | 10,00 | 18,00 | 23,00 |
| 5 | `.vh-cta` (wrapper) | home-hero.css:276-282 | rij | — | — | — | — | — |
| 6 | `.vh-sol-cta` | home-solutions.css:66-85 | gevuld | 284,00 | 63,00 | 10,00 | 18,00 | 23,00 |
| 7 | `.vh-pr-cta` (wrapper) | home-project.css:171-175 | rij | — | — | — | — | — |
| 8 | `.vh-pr-knop` | home-project.css:176-194 | gevuld | 234,55 | **65,47** | **9,12** | **17,98** | 23,00 |
| 9 | `.vh-ctrl-cta` | home-control.css:259-278 | gevuld | 244,40 | **50,30** | **11,70** | 17,00 | 21,00 |
| 10 | `.vh-proof-cta` | home-proof.css:187-213 | gevuld | 310,00 | **67,00** | 10,00 | 17,00 | 21,00 |
| 11 | `.vh-proof-strip-cta` | home-proof.css:350-361 | tekstlink (onderstreept) | — | — | — | 16,00 | 21,00 |
| 12 | `.vh-infra-cta` | home-infra.css:110-129 | gevuld | 220,00 | **67,00** | 10,00 | 18,00 | 21,00 |
| 13 | `.vh-infra-cta2` | home-infra.css:130-143 | tekstlink | — | — | — | 18,00 | 21,00 |
| 14 | `.vh-final-cta` | home-final.css:170-188 | gevuld | 314,65 | **63,27** | **11,81** | 17,00 | 20,00 |
| 15 | `.vh-final-cta2` | home-final.css:189-208 | outline (1px #C9DEF6) | 267,41 | **63,27** | **11,81** | 17,00 | 20,00 |
| 16 | `.vh-footer-nb-cta` | home-footer.css:218-237 | gevuld | 301,60 | **59,05** | 10,00 | 16,00 | 18,00 |

Daarnaast drie tekstlink-CTA's buiten deze telling: `.vh-pr-link` (home-project.css:196-210), `.vh-proof-alle` (home-proof.css:87-103), `.vh-final-kaart-link` (home-final.css:303-317).

**Wat dit bewijst.** Zeven verschillende knophoogtes (50,30 · 59,05 · 62,00 · 63,00 · 63,27 · 65,47 · 67,00), vier radii (9,12 · 10,00 · 11,70 · 11,81) en vier tekstgraden (16,00 · 17,00 · 17,98 · 18,00) voor wat in alle gevallen dezelfde handeling is: "gevulde blauwe knop met label en pijl". Zeven van de acht gevulde knoppen zetten hun hoverkleur bovendien hardgecodeerd op `#005FE0` (home-solutions.css:84, home-project.css:193, home-control.css:277, home-proof.css:212, home-infra.css:128, home-final.css:188, home-footer.css:236) terwijl `--vibe-blauw-diep` in `home.css:36` precies die waarde bevat en maar één keer via `var()` wordt aangeroepen (home-hero.css:18).

### 1.3 Bewijs B — op mobiel is de gedeelde knop er al, acht keer uitgeschreven

Onder 1200px convergeren álle acht gevulde/outline-knoppen naar exact dezelfde regelset: `width:100%` · `height:var(--m-btn-h)` · `padding:0 20px` · `font-size:16px` · `border-radius:10px` · `justify-content:space-between` · `svg 19×19px`.

| Sectie | Bestand:regel | Afwijking t.o.v. de gedeelde set |
|---|---|---|
| 1 hero | home-hero.css:430-440 | — (`box-sizing:border-box` expliciet, r. 432) |
| 2 oplossingen | home-solutions.css:354-364 | — |
| 3 project | home-project.css:290-295 | — |
| 5 VIBE.CONTROL | home-control.css:354-363 | `width: calc(100% - 2*var(--m-gutter))`, **geen `box-sizing`** — zie § 5.2 |
| 6 projectresultaat | home-proof.css:425-430 | — |
| 7 infrastructuur | home-infra.css:370-374 | — |
| 8 final CTA | home-final.css:353-357 | — |
| 9 footer | home-footer.css:359-364 | — |

Zeven van de acht schrijven daarna op tablet weer hetzelfde op: `width:auto` + een `min-width` van 232 / 240 / 250 / 260 / 280px (home-hero.css:499, home-infra.css:445, home-final.css:420, home-footer.css:419, home-solutions.css:459). De component bestaat dus feitelijk al; hij heeft alleen acht namen.

### 1.4 Bewijs C — de tokenlaag is halfvoltooid

Gemeten in `home.css:35-70`: **23** `--vibe-*`-definities (niet 24; de auditbriefing en `kleur.json` noemen 24 — blijft **DECISION REQUIRED**, zie D14 in § 4.4; het blokkeert de primitivelaag niet, want die bouwt een eigen semantische laag, § 0.7). Gemeten `var(--vibe-*)`-gebruik over alle `home*.css`:

| Token | Referenties | Token | Referenties |
|---|---|---|---|
| `--vibe-blauw` | 11 | `--vibe-blauw-licht` | **0** |
| `--vibe-navy` | 8 | `--vibe-blauw-tint` | **0** |
| `--vibe-body` | 5 | `--vibe-op-donker` | **0** |
| `--vibe-sub` | 3 | `--vibe-canvas` | **0** |
| `--vibe-body-zacht` | 3 | `--vibe-lijn` | **0** |
| `--vibe-wit` | 1 | `--vibe-radius-kaart` | **0** |
| `--vibe-paper` | 1 | `--vibe-radius-mob` | **0** |
| `--vibe-navy-diep` | 1 | `--vibe-radius-rond` | **0** |
| `--vibe-focus` | 1 | `--vibe-elev-1` | **0** |
| `--vibe-elev-mob` | 1 | `--vibe-elev-2` | **0** |
| `--vibe-blauw-diep` | 1 | `--vibe-ease` | **0** |
| | | `--vibe-dur` | **0** |

Elf van de 23 tokens worden gebruikt, twaalf nul keer — terwijl vijf van die dode waarden wél renderen, uitgeschreven in de secties: `--vibe-elev-1` staat letterlijk in `home-process.css:122`, `--vibe-elev-2` in `home-proof.css:249-250`, `--vibe-blauw-diep` zevenmaal als `#005FE0`, `--vibe-ease` als `cubic-bezier(.2,.7,.2,1)` in `home-infra.css:221`. Het commentaar bij `home.css:59` spreekt van "de 23 losse box-shadows"; gemeten zijn het er **15** (home-solutions.css:152, home-process.css:122, home-control.css:61/73/93/150/161/314, home-proof.css:132/249, home-infra.css:217/225/291/402, home-final.css:271).

Wat wél volledig is doorgevoerd: het merkblauw. Tien sectiebestanden importeren `--vibe-blauw` onder een eigen alias — `--vh-blauw` (home-hero.css:17) · `--sol-blauw` (home-solutions.css:18) · `--pr-blauw` (home-project.css:29) · `--pc-blauw` (home-process.css:28) · `--ct-blauw` (home-control.css:26) · `--pf-blauw` (home-proof.css:24) · `--if-blauw` (home-infra.css:24) · `--fi-blauw` (home-final.css:25) · `--ft-blauw` (home-footer.css:26) · `--m-blauw` (home-mobile.css:30).

### 1.5 Bewijs D — geen gedeelde kop, eyebrow of lead

`home.css:104-111` zet op `h1,h2,h3` alleen letter (Urbanist), gewicht 700, `letter-spacing:-.012em`, `color:var(--vibe-navy)`, `text-wrap:balance` en `overflow-wrap:break-word`. Graad, regelafstand en kleur komen altijd uit de sectie. Gevolg: tien levende eyebrow-klassen, acht H2-klassen, acht lead-klassen. De enige gedeelde mobiele bouwsteen die daarvoor bedoeld was — `.vh-m-eyebrow` (home-mobile.css:227-234) — is **dood**: gemeten 0 treffers in `index.html`.

### 1.6 Statuslegenda en statusoverzicht

- **GEDEELD** — één klasse, gebruikt in meer dan één sectie.
- **UNIEK** — één klasse, één instantie; geen duplicatie, maar ook geen bibliotheek.
- **HERHAALD ×n** — hetzelfde patroon, n keer opnieuw geïmplementeerd onder n klassenamen.
- **EXTERN** — buiten het `.vh-*`-systeem, sitebreed, in het oude designsysteem.

| # | Component | Status in Master v1 |
|---|---|---|
| 01 | Skiplink | **GEDEELD** (1 klasse, buiten elke namespace) |
| 02 | Focus-indicator | **GEDEELD** (globale selector, home.css:119-127) |
| 03 | Header + desktopnavigatie | **UNIEK** |
| 04 | Mobiele header | **UNIEK** (zelfde markup als 03) |
| 05 | Menuknop | **UNIEK** |
| 06 | Mobiel menu | **UNIEK** |
| 07 | Primaire CTA | **GEDEELD** binnen sectie 1 · **HERHAALD ×7** daarbuiten |
| 08 | Secundaire CTA | **HERHAALD ×2** (twee onverenigbare specs) |
| 09 | Tekstlink-CTA | **HERHAALD ×5** |
| 10 | Eyebrow | **HERHAALD ×11** (10 levend + 1 dood) |
| 11 | Hero-kop H1 | **UNIEK** |
| 12 | Sectiekop H2 | **HERHAALD ×8** |
| 13 | Lead-paragraaf | **HERHAALD ×8** |
| 14 | Proof/KPI-strip | **UNIEK** (patroon keert terug in 19 en 24) |
| 15 | Feature-kaart | **UNIEK** |
| 16 | Donkere oplossingskaart | **GEDEELD** binnen sectie 2 (6 instanties, 2 positievarianten) |
| 17 | Beeldkaart | idem — variant van 16, **niet** een eigen klasse |
| 18 | Projectpaneel | **UNIEK** |
| 19 | Projectmetriek | **UNIEK** |
| 20 | Processtap | **GEDEELD** binnen sectie 4 (4 instanties) |
| 21 | Zwevende informatiekaart | **HERHAALD ×3** (proc / proof / final) |
| 22 | VIBE.CONTROL-showcase | **UNIEK** |
| 23 | Organisatie-vertrouwensrij | **GEDEELD** binnen sectie 6 (2 instanties) |
| 24 | Projectverhaalmodule | **UNIEK** |
| 25 | Donkere projectstrook | **UNIEK** |
| 26 | Voordelenlijst | **HERHAALD ×4** |
| 27 | Infrastructuur/sectorkaart | **GEDEELD** binnen sectie 7 (4 instanties, 4 positievarianten) |
| 28 | Final-CTA-compositie | **UNIEK** |
| 29 | Afspraakkaart | **UNIEK** |
| 30 | Footer | **UNIEK** |
| 31 | Cookiecomponent | **EXTERN** (sitebreed, oud designsysteem) |
| 32 | Calendly-CTA-gedrag | **GEDEELD** (gedrag, geen stijl — 5 aanhaakpunten) |
| 33 | Leadpopup | **EXTERN** (sitebreed, oud designsysteem) |

**Telling.** 33 componenten.

- **Paginabreed gedeeld: 3** — 01 skiplink, 02 focus-indicator, 32 Calendly-gedrag. Alleen 01 en 02 zijn ook *stijl*; 32 is gedrag.
- **Gedeeld binnen één sectie: 5** — 07 in S1 (3 instanties), 16/17 in S2 (6), 20 in S4 (4), 23 in S6 (2), 27 in S7 (4).
- **Uniek, één instantie: 15** — 03, 04, 05, 06, 11, 14, 15, 18, 19, 22, 24, 25, 28, 29, 30.
- **Herhaald: 8 patronen, samen 48 losse implementaties** — 07 (×7 buiten S1) + 08 (×2) + 09 (×5) + 10 (×11) + 12 (×8) + 13 (×8) + 21 (×3) + 26 (×4).
- **Extern: 2** — 31 cookiecomponent, 33 leadpopup.

Die 48 implementaties van 8 patronen zijn de werkvoorraad van de migratie. **Waar elk van deze 33 componenten in V1.0 landt — primitive, primitive + section-specific, section-specific, nav, globaal of extern — staat in de landingstabel § 0.5**; per component staat de landing bovendien als `V1.0-landing` in § 3. Deze tabel hierboven blijft ongewijzigd: hij meet de huidige toestand, niet de doeltoestand.

---

## 2 · Systeemkaders die elk component bindt

### 2.1 Breekpunten — gemeten, niet aangenomen

Volledige telling van `@media` in `home*.css` + `home.css`:

| Query | Aantal | Waar |
|---|---|---|
| `(max-width: 1199px)` | **12** | final:329 · control:294 · footer:302 · hero:397 · mobile:67/213/226 · infra:339 · project:223 · process:215 · solutions:332 · proof:376 |
| `(min-width: 768px) and (max-width: 1199px)` | **11** | final:418 · footer:396 · control:366 · hero:495 · mobile:34/197 · process:292 · infra:428 · project:300 · solutions:458 · proof:469 |
| `(min-width: 768px) and (max-width: 859px)` | 1 | hero:529 — alleen de KPI-strip |
| `(min-width: 1000px) and (max-width: 1199px)` | 1 | footer:425 — alleen het footerraster |
| `(min-width: 1024px) and (max-width: 1199px)` | 1 | solutions:490 — alleen het oplossingenraster |
| `(prefers-reduced-motion: reduce)` | 3 | home.css:93 · control:280 · mobile:241 |
| `(hover: none)` | 1 | mobile:236 (genest in de 1199-blok) |

**Trap 1 — er bestaat geen mobiel-only query.** Nergens staat `max-width: 767px`. "Mobiel" is de 1199-blok; "tablet" is diezelfde blok plús de 768-1199-override. Elke regel die je aan de 1199-blok toevoegt, raakt dus óók tablet tenzij je hem daar expliciet terugdraait. In dit document betekent **Mobiel** = wat ≤767px rendert, **Tablet** = wat 768-1199px rendert.

**Trap 2 — `home-mobile.css` laadt als laatste en wint bij gelijke specificiteit.** Laadvolgorde `index.html:56-67`: `tokens.css` → `home.css` → negen sectiebestanden in sectievolgorde → `home-mobile.css`. Gemeten conflict: `home-footer.css:345` zet `.vh-footer-nav ul a{line-height:19px}`, `home-mobile.css:218` zet `.vh-footer-nav ul a{line-height:1.35}` — identieke specificiteit, `home-mobile.css` wint.

### 2.2 Tokenlagen

| Laag | Waar | Aantal | Status |
|---|---|---|---|
| `--vibe-*` semantisch | home.css:35-70 | 23 | 11 gebruikt, 12 dood (§ 1.4) |
| `--m-*` mobiel | home-mobile.css:16-33 | 11 + 3 kleuraliassen | volledig gebruikt |
| `--m-*` tabletoverride | home-mobile.css:34-45 | 8 herdefinities | `--m-eyebrow`, `--m-radius`, `--m-radius-img` níét herdefinieerd |
| sectie-aliassen | per sectiebestand, top of file | ~44 | alleen blauw volledig token-backed |
| `--t-*` legacy | tokens.css:10-105 | — | **dood op de homepage**, zie § 2.5 |

Mobiele tokens, letterlijk (home-mobile.css:16-29 / tabletoverride 36-43):

| Token | ≤767px | 768-1199px |
|---|---|---|
| `--m-gutter` | `clamp(20px,5.4vw,24px)` | `clamp(32px,5vw,48px)` |
| `--m-sec-y` | `44px` | `64px` |
| `--m-h1` | `clamp(34px,9.1vw,44px)` | `clamp(46px,6.4vw,58px)` |
| `--m-h2` | `clamp(27px,7.3vw,34px)` | `clamp(34px,4.6vw,42px)` |
| `--m-h3` | `19px` | `21px` |
| `--m-lead` | `16.5px` | `18px` |
| `--m-body` | `15.5px` | `16.5px` |
| `--m-eyebrow` | `11.5px` | *niet herdefinieerd* → blijft 11,5px |
| `--m-btn-h` | `52px` | `56px` |
| `--m-radius` | `14px` | *niet herdefinieerd* |
| `--m-radius-img` | `12px` | *niet herdefinieerd* |

### 2.3 Vormtaal

Geometrie zit in **8 van de 9** sectiebestanden. `home-project.css` heeft als enige geen `clip-path`; dat gebruikt een navy gradient-scrim (home-project.css:74-82) plus een SVG-polygoon (`index.html` sectie 3). Getelde `clip-path`-declaraties: hero 5 · final 5 · proof 3 · footer 2 · infra 2 · control 1 · process 1 · solutions 1 · project **0**.

### 2.4 Referentiecanvas per sectie

| Sectie | Canvas | 1 ref-px = | Bron |
|---|---|---|---|
| 1 hero, 2 oplossingen, 6 projectresultaat, 7 infrastructuur | 1774 × 887 | `0,0563698cqw` | home-hero.css:4-5 · home-solutions.css:3-5 · home-proof.css:5-7 · home-infra.css:5-6 |
| 3 project | paneel 2056 × 682 (beeld 2070 × 760) | `0,046719cqw` | home-project.css:4-10 |
| 4 proces, 5 VIBE.CONTROL | 1536 breed | `0,0659058cqw` | home-process.css:4-11 · home-control.css:4-10 |
| 8 final CTA, 9 footer | 2103 × 748 | `0,047551cqw` | home-final.css:5-10 · home-footer.css:5-7 |

### 2.5 `tokens.css` is legacy en raakt de homepage niet

`tokens.css` laadt als eerste (`index.html:56`) en bevat een UNIFY-laag met `!important` op `.eyebrow,.eyb,.nc-eyb,.lg-eyb,.mc-eyb` (r. 76-85), op een radius-0-lijst (r. 90-94) en op `.card,.pc-specs .s` (r. 97-99). Gemeten: `index.html` bevat 229 unieke klassenamen en **geen enkele** daarvan komt in die selectors voor. De enige regel die de pagina raakt is de focusring (tokens.css:102-105, `#0096CC`) en die wordt overschreven door `home.css:119-127`. **Leid uit `tokens.css` dus geen enkele regel voor de homepage af.**

---

## 3 · De componenten

---

### 01 · SKIPLINK

**Status v1** GEDEELD — één klasse, buiten elke sectienamespace, geen mediaquery.

**V1.0-landing** **GLOBAAL** — globale basisregel in het nieuwe stylesheet, geen primitive. Eén klasse buiten elke sectienamespace, één instantie per pagina: onder de HARD RULE (§ 0.2) geen herhaalde visuele taal.

**Doel** Eerste tabstop van de pagina; slaat header, hero en hele navigatie over en zet de focus in `<main>`.

**Anatomie**
```
a.vh-skip[href="#hoofdinhoud"]      ← allereerste element in <body>
main#hoofdinhoud[tabindex="-1"]     ← doel
```

**Tokens** Geen. Alles hardgecodeerd, inclusief `#0073FE` dat identiek is aan `--vibe-blauw` (home.css:35).

**Desktop (≥1200px)** `position:absolute` · `left:12px` · `top:-60px` · `z-index:60` · `padding:12px 18px` · `border-radius:0 0 10px 10px` · `background:#0073FE` · `color:#fff` · `font-family:'Urbanist'` · `font-size:15px` · `font-weight:600` · `transition:top .18s ease`. `:focus` → `top:0`.

**Tablet (768-1199px)** Identiek aan desktop — geen enkele mediaquery raakt `.vh-skip`.

**Mobiel (≤767px)** Identiek aan desktop, om dezelfde reden.

**Contentregels** Label is `Naar de hoofdinhoud` (index.html:71). Het doel moet `tabindex="-1"` houden, anders krijgt `<main>` geen focus na de sprong.

**Toegestane varianten** Geen.

**DO** Als eerste kind van `<body>` plaatsen, vóór `<main>`, en vóór elk ander focusbaar element.
**DON'T** Niet als zichtbare navigatie gebruiken — hij staat op `top:-60px` en komt uitsluitend bij `:focus` in beeld. Niet in een sectienamespace trekken: hij hoort bij de pagina, niet bij een sectie.

**Source implementation** markup `index.html:71-72` · CSS `home-mobile.css:48-60`

---

### 02 · FOCUS-INDICATOR

**Status v1** GEDEELD — de enige globale interactieve primitief van het systeem.

**V1.0-landing** **GLOBAAL** — globale basisregel, geen primitive. Wordt in het nieuwe stylesheet herhaald met exact de waarden van `home.css:119-127`, **inclusief `!important`**: zonder dat wint de regel niet, zoals § 5.1 meet.

**Doel** Eén zichtbare focustoestand voor elk bedienbaar element op de pagina.

**Anatomie** Selector, geen markup:
```
a:focus-visible, button:focus-visible, input:focus-visible,
select:focus-visible, [tabindex]:focus-visible
```

**Tokens** `--vibe-focus` → `var(--vibe-blauw)` `#0073FE` (home.css:68).

**Desktop (≥1200px)** `outline:2px solid var(--vibe-focus)!important` · `outline-offset:3px!important` · `border-radius:2px` (home.css:119-127).

**Tablet (768-1199px)** Identiek — de regel staat buiten elke mediaquery.

**Mobiel (≤767px)** Identiek, met één overschrijving: `.vh-menuknop:focus-visible` zet `border-radius:6px` (home-mobile.css:138).

**Contentregels** n.v.t. — dit component heeft geen tekst.

**Toegestane varianten** Eén overschrijving met hogere specificiteit is aantoonbaar effectief: `.vh-menuknop:focus-visible{ border-radius:6px }` (home-mobile.css:138) wint op `border-radius`, want dat is niet `!important` in `home.css`.

**DO** Per component alleen `border-radius` aanpassen; kleur en dikte komen uit deze regel.
**DON'T** Niet proberen de outlinekleur per component te zetten zonder `!important`. **Gemeten dode regel:** `home-mobile.css:177` zet `.vh-mobielmenu nav a:focus-visible{outline:2px solid #4DA3FF; outline-offset:4px}` zonder `!important`; `home.css:124-125` heeft `!important` en wint ongeacht specificiteit. `#4DA3FF` rendert dus nooit.

**Source implementation** CSS `home.css:119-127` · overschreven legacyregel `tokens.css:102-105` · dode override `home-mobile.css:177`

---

### 03 · HEADER + DESKTOPNAVIGATIE

**Status v1** UNIEK — één instantie; `_header.js` bevat een tweede, volledig ander headersysteem dat deze pagina niet laadt.

**V1.0-landing** **NAV** — sitebrede navigatiecomponent onder **C-01 (DECIDED — V1.0)**. Deze platte header wórdt de standaard; het legacy mega-menu uit `_header.js` verdwijnt. Geen primitive (één implementatie per site), maar de CTA rechts komt uit `.vibe-btn--primary` (P06). Responsive grens blijft **1199px**; de legacy-grenzen 1024 / 1040 / 1180 (`_header.js:113, 210, 69, 89, 209`) verdwijnen met het mega-menu.

**Doel** Merkbevestiging links, zes vaste bestemmingen midden, één actie rechts.

**Anatomie**
```
header.vh-header[role="banner"]
├─ a.vh-logo[href="/"][aria-label]
│  ├─ svg.vh-logo-badge (rect + 3 path, stroke #0071FE)
│  └─ span.vh-logo-tekst > span.vh-logo-vibe + span.vh-logo-energy
├─ nav.vh-nav[aria-label="Hoofdnavigatie"] > 6 × a
├─ button.vh-menuknop            ← zie 05, display:none op desktop
└─ div.vh-acties > a.vh-btn.vh-btn-primair[data-calendly]
```

**Tokens** `--vh-blauw` = `var(--vibe-blauw)` (home-hero.css:17) · `--vh-navy` `#071D3A` (home-hero.css:19) · `--vh-grijs-licht` `#4E5C78`.

**Desktop (≥1200px)** `position:absolute` · `top/left/right:0` · `z-index:10` · `height:4.7351cqw` (84px) · `display:flex; align-items:center` · `padding-left:4.6787cqw` (83px) · `padding-right:4.0586cqw` (72px). Logo: `gap:.5637cqw`, badge `2.4802cqw` (44px), VIBE `1.1273cqw`/800/`ls .003em`/`lh 1.0711cqw`/`#071D3A`, ENERGY `.9639cqw`/400/`ls .040em`/`lh 1.0147cqw`/`margin-top .1691cqw`/`#4E5C78`. Nav: `gap:1.8320cqw` (32,5px), `margin-left:3.7204cqw` (66px), links `.8737cqw` (15,5px)/600/`#17264A`/`lh 1`/`nowrap`, hover `var(--vh-blauw)`, `transition:color .18s ease`. Acties: `margin-left:auto`, `gap:1.7954cqw`. Header-CTA vast op `12.7959cqw` (227 × 63).

**Tablet (768-1199px)** `height:76px`; badge 40px; VIBE 19px/`lh 18px`; ENERGY 16px/`lh 18px` (home-mobile.css:198-201). `.vh-nav` en `.vh-acties` staan op `display:none` (home-mobile.css:86-87).

**Mobiel (≤767px)** Zie 04.

**Contentregels** Zes vaste bestemmingen: `#oplossingen`, `projecten`, `#aanpak`, `#vibe-control`, `waarom-vibe`, `over-ons` — drie interne ankers, drie pagina's (index.html:142-147). Eén actie rechts, altijd de Calendly-CTA met label `Plan een gesprek` en `href="contact"` als JS-loze fallback.

**Toegestane varianten** Geen modifiers. De mobiele toestand is een mediaquery-override, geen variant.

**DO** Logo als `<a href="/">` met `aria-label` (index.html:129). Badge-SVG `aria-hidden="true" focusable="false"`.
**DON'T** Geen dropdown of mega-menu — het mega-menu uit `_header.js` wordt door `index.html` niet geladen (de pagina laadt alleen `_consent.js`, `_clarity.js` via consent, `_footer.js` en `_leadpopup.js`). Onder **C-01 (DECIDED — V1.0)** is dat definitief: het mega-menu wordt niet teruggebouwd, ook niet om legacy routes zichtbaar te houden. De 19 bestemmingen die het vandaag ontsluit (`_header.js:22-47`) landen op overzichtspagina's en interne navigatie — zie D25 voor de bestemming die daarvoor nog ontbreekt. Geen zoekknop: `.vh-zoek` bestaat wel in CSS (home-hero.css:193-202) maar komt **0×** in de markup voor — dode CSS.

**Source implementation** markup `index.html:128-161` · CSS `home-hero.css:137-192, 238` · dode zoekknop `home-hero.css:193-202`

---

### 04 · MOBIELE HEADER

**Status v1** UNIEK — geen aparte component: dezelfde markup als 03 met een tweede compositie.

**V1.0-landing** **NAV** — sitebreed onder **C-01 (DECIDED — V1.0)**: mobiel krijgt de Master-v1-navigatie. Geen primitive; de scroll-lock op `html` én `body` (home-mobile.css:68-69) is onderdeel van de norm.

**Doel** Logo + menuknop op één balk van 64px, met een leesbare achtergrond boven het hero-beeld.

**Anatomie** Identiek aan 03. `.vh-nav` en `.vh-acties` vervallen; `.vh-menuknop` verschijnt.

**Tokens** `--m-gutter`, `--m-navy`, `--m-blauw`.

**Desktop** n.v.t. (`.vh-menuknop{display:none}`, home-mobile.css:65).

**Tablet (768-1199px)** `height:76px`; badge 40 × 40px; VIBE 19px/`lh 18px`; ENERGY 16px/`lh 18px` (home-mobile.css:197-201).

**Mobiel (≤767px)** `position:absolute` · `left/right/top:0` · `height:64px` · `display:flex; align-items:center; justify-content:space-between` · `gap:12px` · `padding:0 var(--m-gutter)` · `background:rgba(255,255,255,.92)` · `backdrop-filter:blur(14px)` (+ `-webkit-`) · `border-bottom:1px solid rgba(12,27,51,.08)` · `z-index:40`. Logo: `gap:9px`, `min-height:44px`, badge 34 × 34px, VIBE 16px/`lh 15px`, ENERGY 13,5px/`lh 15px`/`ls .09em`.

**Open-toestand** `html.vh-menu-open .vh-header` → `background:transparent`, `border-bottom-color:transparent`, `backdrop-filter:none`, `z-index:41`; logotekst `#fff`; badge `rect`/`path` `stroke:#4DA3FF` (home-mobile.css:90-100). Scroll-lock: `html.vh-menu-open, html.vh-menu-open body{overflow:hidden}` en `html.vh-menu-open body{position:fixed; left:0; right:0; width:100%}` (home-mobile.css:68-69).

**Contentregels** Zelfde zes bestemmingen als desktop; geen aparte mobiele copy.

**Toegestane varianten** Alleen de open-toestand via `html.vh-menu-open`.

**DO** De open-toestand op `<html>` zetten, niet op de header — de scroll-lock heeft `html` én `body` nodig.
**DON'T** Geen sticky of fixed header: `position` blijft `absolute`, hij scrollt dus mee weg. Alleen met een open menu wordt hij onderdeel van het donkere overlayvlak.

**Source implementation** CSS `home-mobile.css:67-105` (mobiel), `home-mobile.css:197-205` (tablet), scroll-lock `home-mobile.css:68-69` · markup identiek aan `index.html:128-161`

---

### 05 · MENUKNOP

**Status v1** UNIEK.

**V1.0-landing** **NAV** — sitebreed onder **C-01 (DECIDED — V1.0)**. Geen primitive: één knop per pagina, eigen toestandsklasse `.aan`. De enige primitive die hem raakt is de focusregel (02).

**Doel** Openen en sluiten van het mobiele menu, met de toestand zichtbaar in vorm én in `aria-expanded`.

**Anatomie**
```
button.vh-menuknop[type=button][aria-label="Menu openen"]
                  [aria-expanded="false"][aria-controls="vh-mobielmenu"]
├─ span.vh-menuknop-lijn[aria-hidden]   ×2
└─ span.vh-menuknop-lbl  "Menu"
```

**Tokens** `--m-navy`, `--m-blauw`.

**Desktop** `display:none` (home-mobile.css:65).

**Tablet (768-1199px)** Identiek aan mobiel — er is geen aparte 768-1199-regel voor de knop.

**Mobiel (≤767px)** `display:inline-flex` · `flex-direction:column` · `align-items:flex-end` · `justify-content:center` · `gap:5px` · `52 × 44px` · `margin-right:-6px` · `color:var(--m-navy)`. Lijn: `24 × 2px`, `border-radius:2px`, `background:currentColor`, `transition:transform .26s ease, opacity .2s ease, width .26s ease`; `:last-of-type` `width:16px`. Label: 9,5px/700/`ls .16em`/uppercase/`#6B7891`/`margin-top:1px`. Focus: `outline:2px solid var(--m-blauw)`, `outline-offset:3px`, `border-radius:6px`.

**Aan-variant** `.vh-menuknop.aan` (door het script gezet): `color:#fff`; beide lijnen 24px; `:first-of-type` `translateY(3.5px) rotate(45deg)`; `:last-of-type` `translateY(-3.5px) rotate(-45deg)`; label `rgba(255,255,255,.62)`.

**Contentregels** Label is `Menu`; `aria-label` wisselt tussen `Menu openen` en `Menu sluiten` (index.html:1141).

**Toegestane varianten** Alleen `.aan`.

**DO** `aria-expanded` en `aria-label` samen met `.aan` wisselen — het script doet alle drie in één functie (`zet()`, index.html:1138-1153). `prefers-reduced-motion` zet de lijntransitie uit (home-mobile.css:243).
**DON'T** Geen drie-strepen-hamburger: het zijn er bewust twee, waarvan de onderste korter (16px). De lijnen zijn `aria-hidden`; alleen het tekstlabel draagt betekenis.

**Source implementation** markup `index.html:150-154` · CSS `home-mobile.css:65, 107-138, 243` · gedrag `index.html:1134-1154`

---

### 06 · MOBIEL MENU

**Status v1** UNIEK. **Dit component is de referentie-implementatie voor het Calendly-probleem uit 32.**

**V1.0-landing** **NAV** — sitebreed onder **C-01 (DECIDED — V1.0)**: dit menu wordt de mobiele standaard voor de hele site. De CTA erin komt uit `.vibe-btn--primary` (P06). De `document`-level capture-listener (index.html:1158-1160) is onderdeel van de norm en blijft ongewijzigd — zie § 0.6, Calendly.

**Doel** Volledig scherm met dezelfde zes bestemmingen, de bestaande Calendly-CTA en de directe contactgegevens.

**Anatomie**
```
div#vh-mobielmenu.vh-mobielmenu[hidden]
├─ nav[aria-label="Mobiele navigatie"] > 6 × a
├─ a.vh-mobielmenu-cta[href="contact"][data-calendly]  + svg
└─ div.vh-mobielmenu-contact > a[href^="tel:"] + a[href^="mailto:"]
```

**Tokens** `--m-gutter`, `--m-btn-h`, `--m-blauw`.

**Desktop** Nooit zichtbaar — alle regels staan in `@media (max-width:1199px)`. Bij terugschalen naar ≥1200px sluit het script het menu (`matchMedia('(min-width:1200px)')`, index.html:1171).

**Tablet (768-1199px)** `padding-top:116px`; links `font-size:34px`; CTA `align-self:flex-start` + `min-width:280px` (home-mobile.css:202-204).

**Mobiel (≤767px)** `position:fixed; inset:0` · `z-index:39` · `display:flex; flex-direction:column; justify-content:center` · `gap:26px` · `padding:96px var(--m-gutter) calc(34px + env(safe-area-inset-bottom))`. Achtergrond twee lagen: `radial-gradient(120% 80% at 88% 6%, rgba(0,115,254,.34) 0%, rgba(0,115,254,0) 58%)` over `linear-gradient(205deg,#0A2340 0%,#071A31 34%,#061426 68%,#040E1C 100%)`. Instap: `opacity:0` + `translateY(-8px)`, `transition:opacity .24s ease, transform .24s ease`; `.aan` → `opacity:1; transform:none`. Links: `display:block`, `padding:13px 0`, `font-size:clamp(25px,6.8vw,32px)`/700/`ls -.015em`/`lh 1.12`/`#fff`, `border-bottom:1px solid rgba(255,255,255,.10)`, `:first-child` ook `border-top`. CTA: `height:var(--m-btn-h)`, `padding:0 20px`, `border-radius:10px`, `background:var(--m-blauw)`, 16px/600, `justify-content:space-between`, svg 19 × 19px. Contact: `flex-direction:column`, `gap:8px`, 15px, `rgba(255,255,255,.70)`.

**Contentregels** Dezelfde zes bestemmingen als de desktopnavigatie plus de bestaande Calendly-CTA — dat staat letterlijk als eis in het markupcommentaar (index.html:163-164). Telefoon `+31 85 060 0489` en e-mail `info@vibeenergy.nl` (index.html:178-179).

**Toegestane varianten** Alleen `.aan`.

**DO**
- `.vh-mobielmenu[hidden]{display:none}` is verplicht (home-mobile.css:163). `display:flex` overschrijft anders het browser-`[hidden]`-gedrag en het gesloten menu blijft als onzichtbare, klikbare laag over de hele pagina liggen (motivatie staat in het commentaar op home-mobile.css:159-162).
- Sluiten op ESC, op linkklik en op de knop zelf; focus-trap met Tab/Shift+Tab (index.html:1163-1169); scrollpositie bewaren en herstellen (index.html:1143-1150); `[hidden]` pas na 260ms terugzetten zodat de uitfade afloopt (index.html:1151).
- **De sluit-listener bij linkklik is een `document`-level CAPTURE-listener** (index.html:1158-1160). Dat is de enige plek in Master v1 waar het Calendly-probleem uit 32 echt is opgelost.

**DON'T** Het menu mag **geen** capture-listener op zichzelf gebruiken om kliks af te vangen. `_footer.js` roept `stopPropagation()` aan in de capture-fase op `document`; een listener op `#vh-mobielmenu` of dieper wordt daardoor nooit bereikt (gemeten, zie 32.4). De reden staat letterlijk in het commentaar op `index.html:1155-1157`.

**Source implementation** markup `index.html:165-181` · CSS `home-mobile.css:141-194` (mobiel), `home-mobile.css:202-204` (tablet), `home-mobile.css:242` (reduced motion) · gedrag `index.html:1134-1172`

---

### 07 · PRIMAIRE CTA

**Status v1** GEDEELD binnen sectie 1 (3 instanties van `.vh-btn`) · HERHAALD ×7 daarbuiten.

**V1.0-landing** **PRIMITIVE** — `.vibe-btn` + `--primary` (P06). Alle acht gevulde knoppen uit § 1.2 convergeren hierop; `box-sizing:border-box` staat in de **basisdefinitie**, niet per instantie (§ 5.2). Waarde vastgesteld bij migratiestap 1 (B2 master `systeem-energieopslag.html`). Zeven hardgecodeerde hovertinten `#005FE0` worden één semantisch token (§ 0.7, D4).

**Doel** De zwaarste actie in een compositie: gevuld blauw vlak, label, pijl.

**Anatomie**
```
a.vh-btn.vh-btn-primair[href="contact"][data-calendly]
   "Plan een gesprek"
   svg[viewBox="0 0 24 24"][stroke-width="2.1"][aria-hidden][focusable=false]
      > path d="M4 12h15m-6-6 6 6-6 6"
```

**Tokens** `--vh-blauw` = `var(--vibe-blauw)`; hover `--vh-blauw-diep` = `var(--vibe-blauw-diep)` — dit is de **enige** van de acht knoppen die de hovertint via `var()` betrekt (home-hero.css:18 + 229).

**Desktop (≥1200px)** Basis `.vh-btn`: `display:inline-flex` · `align-items/justify-content:center` · `gap:1.1274cqw` (20px) · `height:3.5513cqw` (63,00px) · `border-radius:.5637cqw` (10,00px) · `font-size:1.0147cqw` (18,00px) · `font-weight:600` · `ls -.002em` · `line-height:1` · `white-space:nowrap` · `transition:background .2s ease, border-color .2s ease, color .2s ease`; svg `1.2965cqw` (23,00px). Modifier `.vh-btn-primair`: `background:var(--vh-blauw)`, `color:#fff`, `border:0`, hover `var(--vh-blauw-diep)`. Instanties: header `width:12.7959cqw` (227 × 63); hero `12.8523 × 3.4949cqw` (228 × 62).

**Tablet (768-1199px)** `.vh-cta{flex-direction:row}`; knoppen `width:auto; min-width:232px`; `--m-btn-h` = 56px (home-hero.css:498-499).

**Mobiel (≤767px)** `box-sizing:border-box` · `width:100%` · `height:var(--m-btn-h)` (52px) · `padding:0 20px` · `font-size:16px` · `border-radius:10px` · `justify-content:space-between`; svg 19 × 19px. `.vh-cta` wordt `flex-direction:column; gap:10px; margin-top:26px` (home-hero.css:429-440).

**Contentregels** Label in Master v1 altijd `Plan een gesprek`; `href="contact"` is de werkende fallback zonder JS (index.html:967-968). Zie **32** voor de tekstheuristiek die dit label automatisch naar Calendly stuurt.

**Toegestane varianten** `--primair` en `--secundair`, meer niet.

**DO** `box-sizing:border-box` staat er op mobiel met reden: anders tellen padding en rand bij de 100% op (commentaar home-hero.css:432).
**DON'T** Deze knop wordt in sectie 2 t/m 9 **niet** gebruikt; elke sectie heeft zijn eigen klasse met eigen breedte, hoogte en radius (§ 1.2). Voeg geen nieuwe sectie-eigen knop toe — dat is precies wat dit document wil beëindigen.

**Source implementation** markup `index.html:157-159` (header), `index.html:189-191` (hero) · CSS `home-hero.css:207-229, 238, 281, 429-440`

---

### 08 · SECUNDAIRE CTA

**Status v1** HERHAALD ×2 — twee onverenigbare specificaties.

**V1.0-landing** **PRIMITIVE** — `.vibe-btn` + `--secondary` (P06). **DECIDED — V1.0: er komt één secundaire CTA**; A en B convergeren en geen van beide overleeft als klasse (§ 0.6, "Secundaire CTA-norm"). De zes verschillende eigenschappen worden bij migratiestap 1 tot één set gemeten en daarna gesloten (D1, D7).

**Doel** De tweede actie naast de primaire: wit vlak met rand.

**Anatomie** A: `a.vh-btn.vh-btn-secundair[href]` + svg · B: `a.vh-final-cta2[href]` + svg.

**Tokens** A: `--vh-navy` `#071D3A`, `--vh-rand` `#46587A`, hover `--vh-blauw`. B: `--fi-blauw` = `var(--vibe-blauw)`; rand `#C9DEF6` hardgecodeerd; hoverachtergrond `#F6FAFF` hardgecodeerd.

**Desktop (≥1200px)**

| | A `.vh-btn-secundair` | B `.vh-final-cta2` |
|---|---|---|
| Bestand | home-hero.css:230-235 + 282 | home-final.css:189-208 |
| Maat | 249,00 × 62,00 px | 267,41 × 63,27 px |
| Radius | 10,00 px | 11,81 px |
| Rand | `1.5px solid #46587A` | `1px solid #C9DEF6` |
| Tekstkleur | `var(--vh-navy)` navy | `var(--fi-blauw)` blauw |
| Tekstgraad | 18,00 px | 17,00 px |
| Uitlijning | `justify-content:center` | `justify-content:space-between` |
| Hover | randkleur + tekst → blauw | randkleur → blauw, vlak → `#F6FAFF` |

**Tablet (768-1199px)** A: `width:auto; min-width:232px` (home-hero.css:499). B: `width:auto; min-width:250px` (home-final.css:420).

**Mobiel (≤767px)** Beide vallen samen met de gedeelde mobiele knopregel uit § 1.3.

**Contentregels** A: één instantie op de hele pagina, `Bekijk onze aanpak` → `waarom-vibe` (index.html:192). B: één instantie, in de final-CTA naast de primaire knop (index.html:971).

**Toegestane varianten** Geen.

**DO** Naast een primaire CTA plaatsen, nooit alleen.
**DON'T** Geen derde secundaire knop toevoegen, en geen van deze twee klassen op een nieuwe pagina hergebruiken.

**DECIDED — V1.0 · secundaire CTA-norm.** Er komt **één** `.vibe-btn--secondary`; A en B convergeren en geen van beide blijft als klasse bestaan. *Motivering:* de primitivelijst is bevroren op vier knopmodifiers (§ 0.3, P06), dus "welke van de twee" is geen ontwerpvraag meer.

Het gemeten probleem blijft staan als werkopdracht: geen van de zes eigenschappen komt overeen — randdikte (1,5px vs 1px), randkleur (`#46587A` vs `#C9DEF6`), tekstkleur (navy vs blauw), radius (10,00 vs 11,81px), graad (18,00 vs 17,00px) en uitlijning (`center` vs `space-between`). De code bevat geen onderlinge verwijzing en geen commentaar dat een keuze motiveert. De numerieke set wordt daarom **vastgesteld bij migratiestap 1** (B2 master `systeem-energieopslag.html`), daarna gelockt, en de resulterende delta per homepagesectie wordt vooraf opgesomd in de pixeldiff-poort (§ 0.10, stap 4) — zie D1 en D7.

**Source implementation** A markup `index.html:192-194`, CSS `home-hero.css:207-222, 230-235, 282, 429-440` · B markup `index.html:971`, CSS `home-final.css:189-209, 353-357, 418-420`

---

### 09 · TEKSTLINK-CTA

**Status v1** HERHAALD ×5.

**V1.0-landing** **PRIMITIVE** — `.vibe-btn` + `--text` (P06). Alle vijf implementaties A t/m E landen hierop; de onderstreping van E wordt een toestand van `--text`, geen zesde klasse. De contentregel "B en D vervallen op mobiel omdat ze een actie herhalen" (zie DON'T) is een **contentregel en blijft gelden** — hij verhuist mee naar de section-specific laag, niet naar de primitive.

**Doel** Zachte vervolgactie: label + pijl, geen vlak, geen onderstreping (behalve E).

**Anatomie** `a` of `span` > tekst + `svg` pijl (`M4 12h15m-6-6 6 6-6 6`).

**Tokens** Zie de kolom Tokens hieronder; geen van de vijf gebruikt een `--vibe-*`-token rechtstreeks.

**Desktop (≥1200px)**, **Tablet (768-1199px)** en **Mobiel (≤767px)** per implementatie:

| | Klasse | Context | Desktopspec | Mobiel |
|---|---|---|---|---|
| A | `.vh-pr-link` | op navy | `gap 1.0000cqw` · `margin-left 2.1000cqw` · `#fff` · `1.0138cqw`/500 · svg `1.1838cqw` · hover `gap 1.28cqw` + `#0490FF` | `margin-left:0`, 15,5px, `gap:10px`, `min-height:44px`, svg 17px |
| B | `.vh-proof-alle` | op licht | `absolute right 4.2841cqw top 9.2000cqw` · `gap 1.5220cqw` · `1.0429cqw` (18,5px)/500 · `var(--pf-slate) #5F769E` · hover `var(--pf-blauw)` · svg `1.5784cqw` | **`display:none`** |
| C | `.vh-infra-cta2` | op licht | `gap 1.6347cqw` · `1.0147cqw`/600 · `var(--if-blauw)` · hover `opacity .78` · svg `1.1838cqw` | 15,5px, `gap:10px`, `min-height:44px`, `justify-content:flex-start` |
| D | `.vh-final-kaart-link` | in kaart | `gap .8455cqw` · `margin-top:auto` · `.9188cqw`/600 · `var(--fi-blauw)` · hover `opacity .78` · svg `1.0147cqw` | **`display:none`** op mobiel **én** tablet — zie § 5.4 |
| E | `.vh-proof-strip-cta` | op donker | `gap 1.1838cqw` · `.9019cqw`/500 · `#fff` · inner `<span>` `text-decoration:underline` met `text-underline-offset:.2255cqw` | 14,5px, `width:100%`, `justify-content:flex-end`, `min-height:32px` |

**Tokens** `--pr-eyebrow` `#0490FF` (A) · `--pf-slate` / `--pf-blauw` (B) · `--if-blauw` (C) · `--fi-blauw` (D).

**Contentregels** Labels: `Meer projecten` (A) · `Alle projecten` (B) · `Neem contact op` (C) · `Kies een moment` (D) · `Bekijk project` (E).

**Toegestane varianten** Op licht (B, C), op donker (A, E), in-kaart (D).

**DO** Mobiel minimaal `min-height:44px` als raakdoel (A, C, D-op-tablet).
**DON'T** B en D worden op mobiel **bewust** weggelaten omdat ze een actie herhalen die al elders op hetzelfde scherm staat; de reden staat in het CSS-commentaar (home-proof.css:397-399 — drie projectacties onder elkaar; home-final.css:336-338 — dezelfde Calendly 400px hoger). Dat is een contentregel, geen responsive-ongeluk; vul die gaten niet op.

**Source implementation** A `index.html:516-518` + `home-project.css:196-210, 296-297` · B `index.html:801-803` + `home-proof.css:87-103, 400` · C `index.html:903-905` + `home-infra.css:130-143, 374-375` · D `index.html:1000` + `home-final.css:303-317, 339` · E `index.html:863` + `home-proof.css:350-361`

---

### 10 · EYEBROW

**Status v1** HERHAALD ×11 — tien levende klassen (negen sectie-eyebrows plus de strook-eyebrow) en één dode gedeelde klasse.

**V1.0-landing** **PRIMITIVE** — `.vibe-eyebrow` (P03). Tien levende klassen worden er één; de dode `.vh-m-eyebrow` wordt **niet** meegenomen (§ 6). Gewicht (D2) en kapitalisatie (D3) worden bij migratiestap 1 vastgelegd.

**Doel** Korte kwalificatie boven de kop: blauw, vet, wijde tracking.

**Anatomie** `p.vh-<ns>-eyebrow` met platte tekst; in twee gevallen met een `<br>` die op mobiel vervalt.

**Tokens** Kleur komt uit de sectiealias (`--vh-blauw`, `--sol-blauw`, `--pr-eyebrow` `#0490FF`, …); graad op mobiel uit `--m-eyebrow` (home-mobile.css:26). Er is geen token voor tracking of gewicht — beide staan per klasse uitgeschreven.

**Desktop (≥1200px)**

| Klasse | Graad | Gewicht | Tracking | `text-transform` | Bron |
|---|---|---|---|---|---|
| `.vh-eyebrow` | `.9244cqw` (16,4px) | **600** | `.092em` | uppercase | home-hero.css:249-257 |
| `.vh-sol-eyebrow` | `1.0259cqw` (18,2px) | 700 | `.175em` | uppercase | home-solutions.css:37-45 |
| `.vh-pr-eyebrow` | `.9344cqw` | 700 | `.045em` | uppercase | home-project.css:108-116 |
| `.vh-proc-eyebrow` | `.9526cqw` | 700 | `.050em` | uppercase | home-process.css:63-71 |
| `.vh-ctrl-eyebrow` | `.9470cqw` | 700 | `.022em` | — | home-control.css:202-209 |
| `.vh-proof-eyebrow` | `.8681cqw` (15,4px) | 700 | `.133em` | — | home-proof.css:68-75 |
| `.vh-proof-eyb2` | `1.0147cqw` (18px) | 700 | `.101em` | — | home-proof.css:162-169 |
| `.vh-infra-eyebrow` | `.9470cqw` (16,8px) | 700 | `.137em` | — | home-infra.css:41-48 |
| `.vh-final-eyebrow` | `.9244cqw` | 700 | `.134em` | — | home-final.css:137-144 |
| `.vh-proof-strip-eyb` | `.6313cqw` (11,2px) | 700 | `.22em` | — (kleur `#0097FE`) | home-proof.css:326-333 |

**Tablet (768-1199px)** `font-size:var(--m-eyebrow)` + `letter-spacing:.14em`. Omdat `--m-eyebrow` in het tabletblok níét wordt herdefinieerd (home-mobile.css:34-45), is de eyebrow op tablet even groot als op telefoon: **11,5px**.

**Mobiel (≤767px)** Identiek: `font-size:var(--m-eyebrow)` 11,5px + `letter-spacing:.14em`, `<br>` op `display:none`.

**Contentregels** De schrijfwijze bepaalt of `text-transform:uppercase` nodig is. Waar de markup al kapitalen bevat (`ENERGIE-INFRASTRUCTUUR` index.html:878, `KLAAR VOOR DE VOLGENDE STAP?` 963, `VIBE.CONTROL` 716) staat geen `uppercase` in CSS. Bij `.vh-proof-eyebrow` (index.html:797, `Vertrouwd door organisaties die vooruit willen`) staat de tekst in zinsvorm én is er geen `uppercase` — die rendert daardoor als enige in zinsvorm.

**Toegestane varianten** Op licht (alle) en op donker (`.vh-pr-eyebrow` `#0490FF`, `.vh-proof-strip-eyb` `#0097FE`).

**DO** Eén regel, geen punt, direct boven de H2.
**DON'T** Gebruik `.vh-m-eyebrow` (home-mobile.css:227-234) níét als bron: gemeten **0** treffers in `index.html`. Hij is dood.

**DEFERRED TO PAGE MIGRATION — twee open punten.** Dat er één `.vibe-eyebrow` komt, is bevroren (§ 0.3, P03). Welke waarde hij krijgt, wordt gemeten bij **migratiestap 1** (B2 master `systeem-energieopslag.html`) en daarna gelockt.

1. **Gewicht** (D2). `.vh-eyebrow` is 600 (home-hero.css:252), alle acht andere zijn 700. Er staat geen commentaar bij; uit de code volgt niet of de hero bewust lichter is. *Voorwaarde voor heropening:* alleen als de pixeldiff-poort bij de migratie van sectie 1 een zichtbaar verschil op 1774px aantoont dat niet vooraf was opgesomd.
2. **Kapitalisatie** (D3). Vier klassen hebben `uppercase` in CSS, vijf niet. Bij drie daarvan staat de tekst al in kapitalen in de markup, bij `.vh-proof-eyebrow` en `.vh-proof-eyb2` juist in zinsvorm. Of de regel "kapitaliseer in CSS" of "kapitaliseer in de copy" luidt, is niet uit de code af te leiden. *Voorwaarde voor heropening:* alleen als de bij stap 1 gekozen regel een bestaande eyebrow-copy onleesbaar of feitelijk onjuist maakt.

**Source implementation** CSS per klasse hierboven · mobiele overrides `home-hero.css:413` · `home-solutions.css:340` · `home-project.css:263` · `home-process.css:220` · `home-control.css:304` · `home-proof.css:394, 420` · `home-infra.css:353` · `home-final.css:342` · markup `index.html:185, 305, 497, 530, 716, 797, 831, 859, 878, 963`

---

### 11 · HERO-KOP (H1)

**Status v1** UNIEK — één H1 per pagina.

**V1.0-landing** **PRIMITIVE + SECTION** — de kop zelf landt op `.vibe-heading--h1` (P04); de **homepage hero-stage waarin hij staat wordt NIET geabstraheerd** (§ 0.4). De accentspan blijft een contentregel van de kop, geen aparte primitive.

**Doel** De enige kop op de pagina die de eerste schermvulling draagt.

**Anatomie**
```
h1.vh-h1  "Ruimte voor <br>groei. "
          span.vh-accent  "Zonder <br>netcongestie."
```

**Tokens** `--vh-gap-h1` `1.8936cqw` · `--vh-navy` `#071D3A` · `--vh-blauw`.

**Desktop (≥1200px)** `margin-top:var(--vh-gap-h1)` · `font-size:4.3100cqw` (76,5px; kaphoogte 53) · `line-height:4.1150cqw` (73px) · `font-weight:700` · `ls -.004em` · `color:var(--vh-navy)`; `.vh-accent` → `var(--vh-blauw)`.

**Tablet (768-1199px)** `--m-h1` = `clamp(46px,6.4vw,58px)`.

**Mobiel (≤767px)** `margin-top:14px` · `font-size:var(--m-h1)` = `clamp(34px,9.1vw,44px)` · `line-height:1.04` · `ls -.02em`; alle `<br>` op `display:none` (home-hero.css:421).

**Contentregels** Vaste opbouw: eerste helft navy, tweede helft in `.vh-accent` blauw. Regelafbrekingen zijn handmatig en gelden alleen op desktop.

**Toegestane varianten** Geen.

**DO** Precies één `<h1>` per pagina.
**DON'T** Geen andere kop mag deze graad benaderen — `home-process.css:75` noteert letterlijk dat `.vh-proc-kop` is teruggebracht naar 64px zodat hij "niet meer concurreert met de hero-H1".

**Source implementation** markup `index.html:186` · CSS `home-hero.css:258-267` (desktop), `home-hero.css:415-421` (≤1199) · tokens `home-mobile.css:21, 38`

---

### 12 · SECTIEKOP (H2)

**Status v1** HERHAALD ×8.

**V1.0-landing** **PRIMITIVE** — `.vibe-heading` + graadmodifier (P04). Acht klassen worden er één met modifiers. Let op: `.vh-proof-kop2` staat in een `<h3>` — de primitive scheidt **graad** (modifier) van **semantisch niveau** (het element), zodat die combinatie geen negende klasse hoeft te worden.

**Doel** De kop van een sectie, met een accentspan op het laatste zinsdeel.

**Anatomie** `h2.vh-<ns>-kop` met handmatige `<br>` + `span.vh-<ns>-accent` op het laatste deel.

**Tokens** Kleur erft van `home.css:107` (`var(--vibe-navy)`), behalve `.vh-pr-titel` (`#fff`). De accentspan gebruikt de sectiealias van het merkblauw. Graad op mobiel uit `--m-h2` (home-mobile.css:22 / 39). Er is geen token voor graad of regelafstand op desktop.

**Desktop (≥1200px)** Alle acht `font-weight:700`, elk een eigen graad:

| Klasse | Graad | Regelafstand | Tracking | Bron |
|---|---|---|---|---|
| `.vh-sol-kop` | `3.4667cqw` (61,5px) | `3.4104cqw` | `-.012em` | home-solutions.css:46-55 |
| `.vh-pr-titel` | `3.2875cqw` | `1` | `-.008em` (`#fff`) | home-project.css:117-125 |
| `.vh-proc-kop` | `3.6100cqw` | `4.0857cqw` | `-.012em` | home-process.css:72-81 |
| `.vh-ctrl-kop2` | `3.0440cqw` | `3.0327cqw` | `-.012em` | home-control.css:210-219 |
| `.vh-proof-kop` | `2.9875cqw` (53px) | `2.9312cqw` | `-.012em` | home-proof.css:76-85 |
| `.vh-proof-kop2` | `2.6493cqw` (47px) | `2.4804cqw` | `-.014em` (staat in een `<h3>`) | home-proof.css:170-178 |
| `.vh-infra-kop` | `3.4386cqw` (61px) | `3.2694cqw` | `-.015em` | home-infra.css:49-58 |
| `.vh-final-kop` | `3.7205cqw` (66px) | `3.6000cqw` | `-.016em` — grootste H2 | home-final.css:145-154 |

**Tablet (768-1199px)** `--m-h2` = `clamp(34px,4.6vw,42px)`; `.vh-final-kop` `clamp(42px,5.6vw,52px)` (home-final.css:419).

**Mobiel (≤767px)** Allemaal `font-size:var(--m-h2)` = `clamp(27px,7.3vw,34px)`, `line-height:1.08`, `margin-top:14px`, `ls -.018em`, `<br>` op `display:none` — **behalve** `.vh-proof-kop2` (25px/`lh 1.14`/`margin-top 12px`) en `.vh-final-kop` (`clamp(32px,8.6vw,41px)`/`lh 1.05`/`ls -.02em`).

**Contentregels** Vaste opbouw per sectie: eyebrow → H2 met handmatige `<br>` en een accentspan op het laatste deel → lead. De graad daalt met de hiërarchie: sectiekop groot, verhaalkop eronder (`.vh-proof-kop2`) expliciet kleiner.

**Toegestane varianten** Op licht (zes) en op donker (`.vh-pr-titel`, `#fff`).

**DO** Accentspan altijd op het laatste zinsdeel, kleur = het sectieblauw.
**DON'T** Er is geen gedeelde H2-klasse. Leid graad of regelafstand niet af uit `home.css:104-111`; dat zet alleen letter, gewicht 700, `ls -.012em`, `color:var(--vibe-navy)`, `text-wrap:balance` en `overflow-wrap:break-word`.

**Source implementation** zie tabel · mobiele overrides `home-solutions.css:341-347` · `home-project.css:264` · `home-process.css:221-222` · `home-control.css:305-306` · `home-proof.css:395-396, 421-422` · `home-infra.css:354-355` · `home-final.css:343-349, 419` · markup `index.html:306, 498, 531, 717, 798, 832, 879, 964`

---

### 13 · LEAD-PARAGRAAF

**Status v1** HERHAALD ×8.

**V1.0-landing** **PRIMITIVE** — `.vibe-lead` (P05). Acht klassen worden er één. De `max-width`-regel (zie DON'T) gaat mee in de primitive: zeven van de acht begrenzen de regellengte al expliciet. De donkervariant wordt een modifier, geen tweede klasse.

**Doel** Eén alinea direct onder de H2 die de belofte concretiseert.

**Anatomie** `p.vh-<ns>-lead` met handmatige `<br>` voor de desktopcompositie.

**Tokens** Drie van de acht gebruiken een `--vibe-*`-token voor de kleur (`--vibe-body-zacht`, `--vibe-body`); de overige vijf zetten een eigen hex of sectiealias. Graad op mobiel uit `--m-lead` / `--m-body` (home-mobile.css:24-25 / 41-42).

**Desktop (≥1200px)** Alle acht `font-weight:400`, altijd een grijstint, altijd een maximale regellengte:

| Klasse | Graad | Regelafstand | Kleur | Max-breedte | Bron |
|---|---|---|---|---|---|
| `.vh-lead` | `1.2176cqw` (21,6px) | `1.7052cqw` (30,25px) | `var(--vh-grijs)` `#475771` | `25.93cqw` (460px) | home-hero.css:268-275 |
| `.vh-sol-lead` | `1.2458cqw` (22,1px) | `1.5896cqw` | `var(--vibe-body-zacht)` | `22.5479cqw` (400px) | home-solutions.css:57-64 |
| `.vh-pr-body` | `1.1265cqw` | `1.5885cqw` | `var(--pr-body)` `#93A5BC` | — | home-project.css:134-140 |
| `.vh-proc-lead` | `1.3316cqw` | `1.7793cqw` | — | — | home-process.css:82-88 |
| `.vh-ctrl-lead` | `1.1387cqw` | `1.5841cqw` | — | — | home-control.css:220-226 |
| `.vh-proof-lead` | `1.1274cqw` (20px) | `1.6347cqw` | `#54607A` | — | home-proof.css:180-186 |
| `.vh-infra-lead` | `1.2120cqw` (21,5px) | `1.6178cqw` | `var(--vibe-body)` | — | home-infra.css:59-65 |
| `.vh-final-lead` | `1.1613cqw` (20,6px) | `1.6178cqw` | — | — | home-final.css:155-161 |

**Tablet (768-1199px)** `--m-lead` = 18px, `--m-body` = 16,5px; `.vh-sol-lead` en `.vh-proof-lead` `max-width:52ch`; `.vh-pr-copy` `max-width:660px`.

**Mobiel (≤767px)** `font-size:var(--m-lead)` 16,5px (`.vh-pr-body` en `.vh-proof-lead`: `var(--m-body)` 15,5px); `line-height` 1.55 of 23px; `margin-top` 14-16px; `<br>` op `display:none`; `max-width` 34ch (hero, final) / 36ch (sol, proc, ctrl, infra) / 38ch (pr-body, proof-lead).

**Contentregels** Altijd direct onder de H2, altijd gewicht 400, altijd een grijstint — nooit navy. De handmatige `<br>` bepaalt de desktopcompositie en verdwijnt onder 1200px.

**Toegestane varianten** Op licht (zeven) en op donker (`.vh-pr-body` `#93A5BC`).

**DO** Op een donker vlak de donkervariant gebruiken; de lichte-achtergrondgrijzen halen daar het contrast niet.
**DON'T** Niet zonder `max-width` zetten — zeven van de acht begrenzen de regellengte op desktop of op mobiel expliciet.

**Source implementation** zie tabel · mobiele overrides `home-hero.css:422-428` · `home-solutions.css:348-353, 460` · `home-project.css:267-268, 302` · `home-process.css:223-224` · `home-control.css:307-308` · `home-proof.css:423-424, 473` · `home-infra.css:356-357` · `home-final.css:350-351`

---

### 14 · PROOF/KPI-STRIP

**Status v1** UNIEK — maar hetzelfde patroon (waarde + kwalificatie) keert terug in 19 en 24 onder andere klassen.

**V1.0-landing** **PRIMITIVE + SECTION** — elk item landt op `.vibe-metric` (P11) met `.vibe-icon` (P08); de strook zelf (het 160px-vlak met verloop, de scheidingslijnen en het eigen 768-859-blok) blijft section-specific bij de hero-stage (§ 0.4). De contentregels hieronder zijn de referentie-implementatie van de claim policy (§ 0.9, C-07) en blijven ongewijzigd gelden.

**Doel** Drie onderbouwde claims onder de hero, elk met een categorie-icoon.

**Anatomie**
```
div.vh-kpi > div.vh-kpi-grid
  └─ 3 × div.vh-kpi-item
       ├─ svg.vh-kpi-icoon[aria-hidden][focusable=false]
       └─ span.vh-kpi-tekst
            ├─ span.vh-kpi-getal    ← de claimzin
            └─ span.vh-kpi-label    ← de kwalificatie
```

**Tokens** `--vh-paars-lijn` `#DCE7F3` (scheidingslijn) · `--vh-grijs` (label).

**Desktop (≥1200px)** `.vh-kpi` `height:9.0191cqw` (160px), `background:linear-gradient(90deg,#F7FCFF 0%,#FCFDFE 55%,#FDFDFE 100%)`. Grid: `height:100%`, `width:98.084cqw` (1740px), `margin:0 auto`, `grid-template-columns:repeat(3,1fr)`, `align-items:center`. Item: `display:flex`, gecentreerd, `gap:1.8602cqw` (33px), `padding-bottom:.5073cqw`, `padding-right:1.1274cqw`. Scheiding: `.vh-kpi-item + .vh-kpi-item::before` → 1px × `3.8895cqw` (69px) in `var(--vh-paars-lijn)`, links, verticaal gecentreerd. Icoon `2.7745cqw`, `color:#0062FE`. Getal: `max(19px, 1.5784cqw)`/`lh 1.18`/700/`ls -.004em`/`#061B36`/`text-wrap:balance`. Label: `margin-top:.3946cqw`, `max(13.5px,.9019cqw)`/`lh 1.3`/400/`var(--vh-grijs)`.

**Tablet (768-1199px)** 3 kolommen `gap:20px`, `align-items:start`; item `flex-direction:column`, `align-items:flex-start`, `gap:10px`; scheidingslijnen uit; icoon 26px; getal 17px/`lh 1.24`/`ls -.002em`; label 13px/`lh 1.32`. Het commentaar motiveert dat: naast elkaar kost het icoon per kolom ~50px, dus gaat het boven de tekst (home-hero.css:501-506).

**Sub-tablet (768-859px)** getal 16,5px + `max-width:15ch`; label 12,5px; `gap:16px`. Reden in het commentaar (home-hero.css:524-528): onderaan het tabletbereik is een kolom ~217px en gaf 1/2/2 regels; met de maatgrens breken alle drie op twee regels.

**Mobiel (≤767px)** `position:static` · `margin-top:30px` · `padding:24px 0 var(--m-sec-y)` · `background:#F4F9FE` · `border-top:1px solid rgba(12,27,51,.07)`; grid één kolom `minmax(0,1fr)` met `gap:14px`; item `justify-content:flex-start`, `gap:12px`; icoon 30px; getal 23px/`lh 1.05`; label 13px/`lh 1.3`/`margin-top 5px`; scheidingslijnen uit.

**Contentregels** Drie items, elk een claimzin plus een kwalificatie, elk met bron in het markupcommentaar (index.html:223-255):
1. `11 projecten uitgelicht` / `Van vastgoed tot automotive` — geteld uit elf `project-*.html`. **Uitgelicht**, niet opgeleverd-in-totaal.
2. `Zon, opslag, laden en sturing` / `Van ontwerp tot beheer` — uit de vijf systeempagina's.
3. `Start zonder eigen investering` / `Exploitatie mogelijk per situatie` — uit `systeem-energieopslag.html`. `mogelijk` en `per situatie` blijven staan; zonder die twee wordt het een garantie.

**Toegestane varianten** Geen.

**DO** Elke claim met een primaire bron in het markupcommentaar.
**DON'T** Gebruik de strook niet als cijferrij of staat-van-dienst. Expliciet afgewezen in de markup (index.html:208-255): `47 opgeleverde projecten`, `12 MWp zon`, `98% uptime`, `892 ton CO2` én `11 opgeleverde projecten`. Reden: geen primaire bron; een pagina die een cijfer herhaalt is geen bron; elf openbare cases bewijzen geen totaal.

**DEFERRED TO PAGE MIGRATION — commentaar en code lopen uiteen** (D18). `home-hero.css:478-481` motiveert de één-kolomsopzet met "Onder 600px staat elk cijfer op een eigen regel … Vanaf 600px passen de drie naast elkaar", maar de drie-kolomsregel begint pas bij 768px (home-hero.css:495). Tussen 600 en 767px rendert dus de mobiele één-kolom, niet wat het commentaar beschrijft. Of de grens 600 of 768 moet zijn, volgt niet uit de code.

*Voorwaarde voor heropening:* dit wordt beslist bij de sectiemigratie van sectie 1 — de laatste homepagesectie in de volgorde van § 0.10 — en uitsluitend met een meting op 600, 700 en 767px. Tot dan blijft Master v1 byte-for-byte en verandert er niets. **Let op:** dit raakt de responsive navigatiegrens van **C-01 (1199px)** niet; het gaat om een KPI-raster binnen het mobiele bereik, niet om navigatie.

**Source implementation** markup `index.html:222-293` · CSS `home-hero.css:328-383` (desktop), `468-492` (≤1199), `495-522` (tablet), `529-533` (768-859)

---

### 15 · FEATURE-KAART

**Status v1** UNIEK — vier instanties van één klasse binnen sectie 5.

**V1.0-landing** **PRIMITIVE + SECTION** — icoon op `.vibe-icon-tile` (P09), kaart op `.vibe-card--light` (P07); het vierkolomsraster binnen de VIBE.CONTROL-sectie blijft section-specific, want die compositie wordt niet geabstraheerd (§ 0.4). Tint `--ct-badge` `#D8ECFE` gaat op in één semantisch tegeltoken (D11).

**Doel** Kort kenmerk: icoon in getint vlak, vet trefwoord, één regel uitleg.

**Anatomie**
```
div.vh-ctrl-feats > 4 × div.vh-ctrl-feat
  ├─ span.vh-ctrl-feat-ic[aria-hidden] > svg
  ├─ b
  └─ span
```

**Tokens** `--ct-badge` `#D8ECFE` · `--ct-blauw` · `--ct-navy` · `--ct-sub` `#6F7A95`.

**Desktop (≥1200px)** Raster `repeat(4, minmax(0,1fr))`, `margin-top:.9075cqw`. De `minmax(0,1fr)` staat er expliciet omdat vier vaste kolommen van 202px 16px buiten de sectie vielen (commentaar home-control.css:230). `.vh-ctrl-feat{min-width:0}`. Icoon `2.3730cqw` vierkant, `border-radius:.42cqw`, `display:grid; place-items:center`, `background:var(--ct-badge)`, `color:var(--ct-blauw)`, svg `1.24cqw`. `b`: `margin-top:.6690cqw`, `.9470cqw`/`lh 1.0147cqw`/700/`var(--ct-navy)`. `b + span`: `margin-top:.1920cqw`, `.9470cqw`/`lh 1.2514cqw`/400/`var(--ct-sub)`.

**Tablet (768-1199px)** `grid-template-columns:repeat(4,1fr)`.

**Mobiel (≤767px)** `grid-template-columns:1fr 1fr`, `gap:22px 16px`, `margin:28px var(--m-gutter) 0`; icoon 36px, `border-radius:9px`, svg 19px; `b` 15,5px/`lh 20px`/`margin-top 11px`; `span` 14px/`lh 19px`/`margin-top 5px` met `<br>` uit.

**Contentregels** Vier kenmerken, elk één belofte van twee regels: `Peak shaving`, `Opslagsturing`, `Netbalans`, `Realtime inzicht` (index.html:723, 731, 736, 741).

**Toegestane varianten** Geen.

**DO** `minmax(0,1fr)` + `min-width:0` op het item houden; vaste kolombreedtes breken de sectie.
**DON'T** De referentie schrijft bij Peak shaving "Voorkomt pieken en boetes". De site koppelt piekafvlakking nergens aan boetes, wel aan het capaciteitstarief — er staat daarom `Voorkomt pieken en piekkosten` (index.html:724-727). Claim geen boetes.

**Source implementation** markup `index.html:720-744` · CSS `home-control.css:228-257` (desktop), `347-353` (≤1199), `374` (tablet)

**Gemeten defect** zie § 5.2 — het feats-raster staat op mobiel 21px te ver naar binnen.

---

### 16 · DONKERE OPLOSSINGSKAART

**Status v1** GEDEELD binnen sectie 2 — één klasse `.vh-sol-mod`, zes instanties, twee positievarianten en zes identiteitsvarianten.

**V1.0-landing** **PRIMITIVE** — `.vibe-card--dark` / `--media` (P07) met `.vibe-arrow` (P10) en `.vibe-icon` (P08). Dit is de best bewijsbare primitive van het hele systeem: één klasse, zes instanties, twee positievarianten. **De scrims gaan mee in de primitive**, niet in de sectie — ze zijn een leesbaarheidseis met een gemeten motivering (1,00:1, home-solutions.css:171-175), geen decoratie. De zes identiteitsvarianten blijven modifiers.

**Doel** Één systeemcomponent als volledig klikbare kaart: beeld of grafiek, leesbaarheidsscrim, icoon, kop, belofte, pijl.

**Anatomie**
```
a.vh-sol-mod.vh-sol-mod--<positie>.vh-sol-mod--<identiteit>
├─ img   |   span.vh-sol-grafisch[aria-hidden]
├─ span.vh-sol-mod-inhoud
│   ├─ svg.vh-sol-mod-ic
│   └─ span.vh-sol-mod-kop > h3 + p
└─ span.vh-sol-pijl > svg
```

**Tokens** `--sol-radius` `.5637cqw` (home-solutions.css:23) · `--sol-blauw` (pijlkleur).

**Desktop (≥1200px)** Raster `.vh-sol-grid`: kolommen `27.4521 / 17.0237 / 16.4600cqw` (487 | 302 | 292), rijen `28.0722 / 12.9651cqw` (498 | 230), `column-gap:1.4656cqw` (26px), `row-gap:1.2965cqw` (23px), areas `'a b c' 'd e f'`. `.vh-sol-onder` spant `d..f` en heeft **eigen** kolommen `20.9132 / 19.8985 / 20.0113cqw` (371 | 353 | 355).
Kaart: `border-radius:var(--sol-radius)` · `box-shadow:0 .56cqw 1.46cqw rgba(23,84,150,.10)` · `isolation:isolate` · `color:#fff` · `overflow:hidden`.
Scrims (`::after`, `z-index:1`, `pointer-events:none`): `--boven` `180deg` .92/.90/.56/.12/0 op 0/38/50/62/72% plus `158deg rgba(4,42,96,.30)→0`; `--onder` `180deg` .62/.80/.90/.90 op 0/26/46/100% plus `96deg rgba(3,20,44,.40)→0`.
Inhoud `padding:1.7476cqw 1.8602cqw` (31/33px). Icoon `2.2547cqw` (40px), `--zon` `2.4803cqw` (44px). `h3` `1.0372cqw` (18,4px)/`lh 1.30`/700/`ls -.004em`; `--zon` `1.4995cqw` (26,6px). `p` `.9301cqw` (16,5px)/`lh 1.3529cqw` (24px)/`rgba(255,255,255,.90)`; `--zon` `1.0710cqw`/`lh 1.5220cqw`.
Pijl: `2.1420cqw` (38px) witte cirkel, `color:var(--sol-blauw)`, svg `1.0147cqw`, hover `translateX(.22cqw)`; `--zon` `2.5930cqw` (46px).

**Tablet 1024-1199px** `repeat(3,1fr)` met areas `'a b c' / 'd d d'`, `gap:18px`; `--zon` en de overige kaarten 330px hoog; `--onder` en `--handel` 190px (home-solutions.css:490-499).

**Tablet 768-1023px** `1fr 1fr` met `'a a' / 'b c' / 'd d'`, `gap:16px`; `.vh-sol-onder` `repeat(3,1fr)` `gap:16px`; `--handel` `grid-column:auto`; `--zon` 300px, overige 210px; `p` **komt terug** (14,5px/`lh 20px`); `h3` 17px/`lh 22px`, `--zon` 21px/26px; pijl 42px.

**Mobiel (≤767px)** Raster `1fr 1fr` met `'a a' / 'b c' / 'd d'`, `gap:10px`, `margin-top:30px`; `.vh-sol-onder` `1fr 1fr` `gap:10px`. Kaart `min-height:150px`, `border-radius:var(--m-radius)` (14px); `--zon` 286px; `--handel` `grid-column:1/-1`, `min-height:124px`. `p` **verborgen** op `--bat`, `--laad` en `--onder`. Inhoud `padding:16px 16px 18px` (`--zon` 20/20/22). Icoon 28px (`--zon` 32px). `h3` `var(--m-h3)` 19px, op `--bat`/`--laad`/`--onder` 16px/`lh 20px`, `--handel` 17px. Pijl 40 × 40px, `top/right:10px` (`--zon` en `--handel` 44px, `top/right:14px`), svg 16px. Eigen mobiele scrims.

**Contentregels** Zes bestemmingen; de hele kaart is één `<a>` en daarmee het enige klikdoel. Beeldvariant en grafische variant zijn uitwisselbaar in dezelfde anatomie.

**Toegestane varianten** Positie: `--boven`, `--onder`. Identiteit: `--zon`, `--bat`, `--laad`, `--hvac`, `--ems`, `--handel`.

**DO** Het gelaagde scrim is geen decoratie. Het CSS-commentaar (home-solutions.css:171-175) noteert dat het oude diagonale verloop een gemeten contrast van **1,00:1** gaf op de batterij- en laadkaart; het huidige verloop is dicht waar de tekst staat en klaart daarna snel op.
**DON'T** Geen plaatshouderbeeld. Waar geen echte fotografie bestaat krijgt de kaart `.vh-sol-grafisch` — een navyvlak met de Vibe-diagonaal (HVAC, index.html:398-402). Dode CSS: `.vh-sol-stats` / `-stats b` / `-stats span` (home-solutions.css:252-286 + home-mobile.css:217) hoort bij een statistiekbalk die **0×** in de markup staat.

**DECIDED — V1.0 · bestemming van de `--ems`-kaart.** Onder **C-02** wordt `systeem-ems.html` de VIBE.CONTROL-productpagina met voldoende EMS-context. De `--ems`-kaart (index.html:417) houdt dus zijn bestemming; alleen het label volgt de contextregel (`VIBE.CONTROL`, `Energiemanagementsysteem (EMS)` of `VIBE.CONTROL EMS`). De SEO-waarde op EMS / energiemanagementsysteem / energie management systeem / slim energiemanagement mag niet verloren gaan.

**DEFERRED TO PAGE MIGRATION — twee open punten.**
1. **HVAC-bestemming** (D21). `--hvac` (index.html:398) linkt óók naar `systeem-ems`, terwijl er geen HVAC-pagina in de repository staat (gemeten: 48 HTML-bestanden, geen `systeem-hvac`). *Voorwaarde voor heropening:* zodra een HVAC-pagina bestaat. Tot dan blijft de kaart wijzen waar hij wijst — **NO PAGE → NO LINK PROMISE**, analoog aan C-06. Geen nieuwe bestemming verzinnen en geen kaart verwijderen.
2. **`aria-hidden` op de pijl** (D22). Vijf `.vh-sol-pijl`-spans hebben géén `aria-hidden` terwijl hun inner-svg dat wel heeft; de zesde (Energiehandel, index.html:449-451) heeft het omgekeerd. Welke de norm is, volgt niet uit de code. *Voorwaarde voor heropening:* `.vibe-arrow` (P10) krijgt bij zijn eerste implementatie in migratiestap 1 één a11y-norm; die geldt daarna voor alle zes.

**Source implementation** markup `index.html:343-452` · CSS `home-solutions.css:126-320` (desktop), `376-449` (≤1199), `458-499` (tablet 768-1023 + 1024-1199)

---

### 17 · BEELDKAART

**Status v1** Geen eigen klasse — dit is de fotovariant van 16. Als component apart benoemd omdat de contentregel verschilt.

**V1.0-landing** **PRIMITIVE** — `.vibe-card--media` (P07) met `.vibe-media` (P12). Geen eigen klasse, ook niet in V1.0: het blijft de fotovariant van 16. De `srcset`/`sizes`-regel op de breekpunten 767 / 1199 wordt onderdeel van `.vibe-media`.

**Doel** Dezelfde anatomie als 16, met echte fotografie in plaats van een grafisch vlak.

**Anatomie** Identiek aan 16, met `<img>` als eerste kind in plaats van `span.vh-sol-grafisch`.

**Tokens** Zelfde als 16.

**Desktop (≥1200px)** Zelfde als 16, plus bijsnijding per identiteit: `--zon` `object-position:56% 46%`, `--bat` `68% 52%`, `--laad` `6% 34%` (home-solutions.css, sectie `--<identiteit>`). Elke `<img>` draagt `srcset` + `sizes` met een expliciete mobiel/tablet/desktop-breekpunt (bijv. index.html:344: `(max-width:767px) 400px, (max-width:1199px) 92vw, 37.5vw`), `width`/`height` voor de verhouding, `loading="lazy"` en `decoding="async"`.

**Tablet (768-1199px)** Zelfde raster en maten als 16; de `sizes`-regel schakelt op `(max-width:1199px)` naar `92vw`.

**Mobiel (≤767px)** Zelfde raster en maten als 16; `sizes` schakelt op `(max-width:767px)` naar de kleinste bron (bijv. 400px).

**Contentregels** Elke `alt` beschrijft wat er staat, niet wat het verkoopt: `Zonnepanelen op een bedrijfsdak` (344), `Vibe Energy-monteur aan een schakelkast` (418), `Slimme kWh-meters` (435).

**Toegestane varianten** Zelfde als 16.

**DO** `srcset`/`sizes` met dezelfde drie breekpunten als het CSS-systeem (767 / 1199).
**DON'T** Voor Energiehandel is bewust **geen** beursbeeld of geldgrafiek gekozen maar de echte meetlaag; de reden staat in het commentaar op `index.html:434-436`.

**Source implementation** markup `index.html:343-452` (vijf van de zes kaarten) · CSS identiek aan 16

---

### 18 · PROJECTPANEEL

**Status v1** UNIEK.

**V1.0-landing** **SECTION** — de **Hedin featured-projectcompositie wordt NIET geabstraheerd** (§ 0.4). Vier lagen met vaste z-volgorde, en het enige sectiebestand zonder `clip-path`. De foto gebruikt `.vibe-media` (P12) en de cijfers erin `.vibe-metric` (P11, via 19); de rest — scrim, geo-SVG, asymmetrische radius — blijft section-specific. Heropening alleen bij aantoonbaar tweede gebruik in de repository.

**Doel** Eén uitgelicht project op volle breedte: foto, navyscrim voor leesbaarheid, Vibe-projectgeometrie rechts, copy links.

**Anatomie** Vier lagen met vaste z-volgorde:
```
div.vh-pr-panel
├─ img.vh-pr-foto      z0
├─ div.vh-pr-scrim     z1
├─ svg.vh-pr-geo       z2
└─ div.vh-pr-copy      z3
```

**Tokens** `--vibe-paper` `#FCFDFE` (sectievlak) · `--vibe-navy-diep` `#001632` (paneel) · `--pr-lijn` `rgba(255,255,255,.22)`.

**Desktop (≥1200px)** Sectie `.vh-pr` `padding:5.6369cqw 0` (100px), `background:var(--vibe-paper)`, met `::before` `radial-gradient(120% 100% at 58% 0%, #DFEDFD → 0)` over 11cqw hoogte. Paneel: `margin-left:3.9459cqw` (70px), `aspect-ratio:1704/565`, `border-radius:3.5507cqw 0 0 3.5507cqw` (63px links, rechts vlak — loopt van het beeld af), `background:var(--vibe-navy-diep)`, `overflow:hidden`, `isolation:isolate`. Foto `object-position:54% 62%`. Scrim: `90deg #001632 0-20% → rgba(0,22,50,.74) 32% → .30 46% → .06 60% → 0 70%`, plus `180deg rgba(0,18,42,.30)→0` op 26%. Geo-SVG `viewBox="0 0 2056 682"`, `preserveAspectRatio="none"`, met `polygon prTop`, `polygon prWedge` (`#0A6CEA→#0055C2→#003E96`) en een lichtrand `<path stroke="#BFD9FF" stroke-opacity=".55" stroke-width="2.6">`. Copy `absolute left:4.5318cqw top:3.1173cqw`, `color:#fff`.

**Tablet (768-1199px)** Foto 340px hoog; copy `max-width:660px`.

**Mobiel (≤767px)** Sectie `padding:0`, `::before` weg. Paneel `margin-left:0`, `aspect-ratio:auto`, `border-radius:0`, `flex-direction:column`. Geo `display:none`. Foto `position:relative`, `order:1`, `height:236px`, `object-position:56% 60%`. Scrim wordt `180deg 0 → rgba(0,22,50,.45) 46% → #001632 96%`. Copy `order:2`, `padding:34px var(--m-gutter) var(--m-sec-y)`, `margin-top:-26px`, met eigen achtergrond `linear-gradient(180deg, rgba(0,22,50,0) 0%, #001632 26px)` zodat de eyebrow niet op de foto valt.

**Contentregels** Eén uitgelicht project per pagina: Hedin Alkmaar (index.html:498).

**Toegestane varianten** Geen.

**DO** De projectgeometrie is expliciet als herbruikbaar merkonderdeel aangemerkt, met coördinaten in referentiepixels van het paneel (home-project.css:85-88).
**DON'T** De goedgekeurde schemeropname bestaat niet in deze repository. Gebruikt is de echte dronefoto van hetzelfde project; het navyverloop levert het donkere karakter (index.html:463-466). Bouw geen lichtsituatie na. Dit is het **enige** sectiebestand zonder `clip-path` — de diagonaal zit hier in de SVG, niet in CSS.

**Source implementation** markup `index.html:461-521` · CSS `home-project.css:19-107` (desktop), `223-262` (≤1199), `300-302` (tablet)

---

### 19 · PROJECTMETRIEK

**Status v1** UNIEK — maar hetzelfde waarde/kwalificatie-patroon als 14 en 24.

**V1.0-landing** **PRIMITIVE + SECTION** — `.vibe-metric` (P11), donkervariant. Samen met 14 en 24 is dit het bewijs dat waarde/kwalificatie een herhaald patroon is en dus primitive-materiaal; de haarlijnverdeling en de plaatsing binnen het projectpaneel blijven section-specific (§ 0.4). De haarlijn `--pr-lijn` gaat op in één semantisch lijntoken (D12).

**Doel** Drie geverifieerde projectcijfers naast elkaar, gescheiden door haarlijnen.

**Anatomie**
```
div.vh-pr-metrics > 3 × div.vh-pr-metric
  ├─ b      ← waarde
  └─ span   ← eenheid
```

**Tokens** `--pr-lijn` `rgba(255,255,255,.22)` · `--pr-body` `#93A5BC`.

**Desktop (≥1200px)** Rij `display:flex`, `align-items:flex-start`, `margin-top:1.7136cqw`. `.vh-pr-metric + .vh-pr-metric`: `margin-left:1.9856cqw` + `padding-left:1.9856cqw` (42,5 ref) + `border-left:1px solid var(--pr-lijn)`. `b`: `display:block`, `1.6024cqw` (34,3 ref)/`lh 1.2149cqw` (26 ref)/700/`ls -.012em`/`#fff`. `span`: `display:block`, `margin-top:.5918cqw`, `.9811cqw` (21 ref)/`lh 1`/400/`var(--pr-body)`.

**Tablet (768-1199px)** `grid-template-columns:repeat(3,1fr)`; `:nth-child(3)` `grid-column:auto` + `padding-left:18px` + `border-left`.

**Mobiel (≤767px)** `display:grid`, `1fr 1fr`, `gap:0`, `margin-top:24px`, met `border-top:1px solid rgba(255,255,255,.12)`. Metric `padding:16px 0 14px` + `border-bottom:1px`; `:nth-child(2)` `padding-left:18px` + `border-left`; `:nth-child(3)` `grid-column:1/-1`. `metric + metric` verliest `margin-left`/`padding-left`. `b` 24px/`lh 26px`; `span` 13,5px/`margin-top 5px`.

**Contentregels** Precies drie geverifieerde cijfers, bron `project-hedin-alkmaar.html`: `645 kWh` batterijopslag · `300 kW` vermogen · `+70%` netvermogen (index.html:502-510).

**Toegestane varianten** Geen.

**DO** Waarde en eenheid altijd gescheiden in `b` en `span`.
**DON'T** `78% kostenbesparing` hoort **niet** bij Hedin Alkmaar maar bij Ratio 16, en is hier bewust vervangen door `+70% netvermogen` (index.html:505-508). Haal die 78% dus niet uit sectie 6 hierheen.

**Source implementation** markup `index.html:502-510` · CSS `home-project.css:143-168` (desktop), `271-287` (≤1199), `303-304` (tablet)

---

### 20 · PROCESSTAP

**Status v1** GEDEELD binnen sectie 4 — één klasse, vier instanties.

**V1.0-landing** **SECTION** — de **homepage process timeline wordt NIET geabstraheerd** (§ 0.4): de horizontale voortgang met chevrons op desktop en de verticale `::before`-tijdlijn op mobiel zijn één compositie, geen kaartenrij. Binnen de stap landen wél primitives: `.vibe-icon` (P08), `.vibe-icon-tile` (P09) voor de badge, `.vibe-heading` (P04) en `.vibe-lead` (P05).

**Doel** Vier stappen als één horizontale voortgang, met chevrons ertussen.

**Anatomie**
```
div.vh-proc-stappen
├─ div.vh-proc-stap
│   ├─ svg.vh-proc-stap-ic
│   └─ div > span.vh-proc-badge + h3 + p
├─ span.vh-proc-chev[aria-hidden] > svg
└─ … (4 stappen, 3 chevrons)
```

**Tokens** `--pc-blauw` · `--pc-badge` `#D8ECFE` · `--pc-navy` · `--pc-sub` `#6F7A95` · `--pc-chev` `#B9C7D8`.

**Desktop (≥1200px)** Rij `margin:.9414cqw 5.4115cqw 0 5.2987cqw`, `display:flex`, `align-items:flex-start`, `justify-content:space-between`. Stap: `display:flex`, `align-items:flex-start`, `gap:1.9166cqw` (34px), `width:16.4644cqw` (292px), `flex:none`. Icoon `2.7060cqw`, `color:var(--pc-blauw)`. Badge: `inline-grid`, `2.0410 × 1.9790cqw` (31 × 30 ref), `border-radius:.35cqw`, `background:var(--pc-badge)`, `color:var(--pc-blauw)`, `.8000cqw`/700/`ls .02em`/`lh 1`. `h3` `margin-top:.7800cqw`, `1.0541cqw`/`lh 1.1838cqw`/700/`ls -.004em`/`var(--pc-navy)`. `p` `margin-top:.4158cqw`, `.8640cqw`/`lh 1.4487cqw`/`var(--pc-sub)`. Chevron: `width:.5300cqw`, `height:1.0000cqw`, `margin-top:3.0300cqw` (op de titelregel), `color:var(--pc-chev)`.

**Tablet (768-1199px)** `display:grid`, `1fr 1fr`, `column-gap:34px`; tijdlijn uit; stap `padding-bottom:28px`.

**Mobiel (≤767px)** `flex-direction:column`, `gap:0`, `margin:24px var(--m-gutter) 0`, met `::before` als verticale tijdlijn: 2px breed, `left:17px`, `top:12px`, `bottom:26px`, `linear-gradient(180deg,#0073FE 0%,rgba(0,115,254,.18) 100%)`. Stap wordt `display:grid` `36px 1fr`, `column-gap:14px`, `padding-bottom:14px` (`:last-child` 0). Icoon 36px witte cirkel met `border:1px solid rgba(0,115,254,.22)`, `grid-row:1/span 3`, svg 17px. Badge verliest zijn vlak en wordt platte tekst: 11px/700/`ls .18em`/`#0073FE`, `align-self:center`. `h3` 17,5px/`lh 22px`/`margin-top 4px`. `p` `var(--m-body)`/`lh 21px`/`margin-top 6px` met `<br>` uit. Chevron `display:none`.

**Contentregels** Precies vier stappen met badges `01`-`04`: Analyse, Ontwerp, Realisatie, Exploitatie (index.html:551-608). De chevrons dragen geen betekenis (`aria-hidden`) en verdwijnen zodra de tijdlijn het overneemt.

**Toegestane varianten** Geen.

**DO** De badge is op desktop een vlak en op mobiel platte tekst. Dat is bewust, geen twee vrij te kiezen varianten.
**DON'T** Geen losse kaarten. Het CSS-commentaar (home-process.css:149-151) omschrijft het expliciet als "één horizontale voortgang, geen losse kaarten".

**Source implementation** markup `index.html:551-608` · CSS `home-process.css:152-202` (desktop), `247-289` (≤1199), `292-297` (tablet)

---

### 21 · ZWEVENDE INFORMATIEKAART

**Status v1** HERHAALD ×3 — `.vh-proc-kaart`, `.vh-proof-kaart`, `.vh-final-kaart`, elk met eigen maten maar één gedeelde regel.

**V1.0-landing** **PRIMITIVE** — `.vibe-card--light` (P07) met `.vibe-icon-tile` (P09). Drie implementaties worden er één. **De mobiele regel `position:relative` + `z-index` gaat mee in de primitive**, niet in de sectie: hij staat nu drie keer met dezelfde motivering uitgeschreven (home-process.css:229-232, home-proof.css:436-440, home-final.css:398-401) en is daarmee het meest herhaalde expliciete patroon van het systeem.

**Doel** Witte kaart die half over een foto valt en de kernbelofte van de sectie herhaalt.

**Anatomie** (`.vh-proc-kaart` als voorbeeld)
```
div.vh-proc-kaart
├─ span.vh-proc-kaart-ic[aria-hidden] > svg
├─ h3
└─ p
```

**Tokens** Geen `var()` voor de schaduw — `home-process.css:122` schrijft `0 .18cqw .45cqw rgba(12,38,72,.06), 0 1.5cqw 3.2cqw -1.1cqw rgba(12,38,72,.22)` uit, **exact de waarde van `--vibe-elev-1`** (home.css:60-61). Wel token: `--pc-blauw`, `--pc-navy`, `--pc-sub`.

**Desktop (≥1200px)** `position:absolute` `left:80.395cqw` `top:6.8546cqw`; `width:15.884cqw` (241 ref, rechterrand gelijk aan de foto); `padding:1.2000cqw 1.3000cqw 1.7217cqw 1.8453cqw`; `border-radius:.6595cqw`; `background:#FFFFFF`. Icoon `1.9772cqw` (30 ref) vierkant, `border-radius:.4cqw`, `display:grid; place-items:center`, `background:#DFEEFE`, `color:var(--pc-blauw)`, svg `1.1cqw`. `h3` `margin-top:1.0300cqw`, `1.1218cqw`/`lh 1.4487cqw`/700/`ls -.004em`. `p` `margin-top:.7400cqw`, `.8620cqw`/`lh 1.1838cqw`.

**Tablet (768-1199px)** `max-width:420px` (proc) · `max-width:430px` (final).

**Mobiel (≤767px)** `position:relative` (**niet** `static`) + `z-index:2`; `margin:-26px var(--m-gutter) 0` met `margin-left:calc(var(--m-gutter) + 16px)`; `padding:16px 18px 18px`; `border-radius:var(--m-radius)`; icoon 34px `border-radius:8px` svg 18px; `h3` 16,5px/`lh 22px`/`margin-top 11px`; `p` `var(--m-body)`/`lh 20px`/`margin-top 7px` met `<br>` uit.

**Contentregels** Eén icoon, één kop, één alinea. De kaart herhaalt de kernbelofte van de sectie, hij introduceert geen nieuw feit.

**Toegestane varianten** Drie contexten: proces (`.vh-proc-kaart`), projectresultaat (`.vh-proof-kaart`), afspraak (`.vh-final-kaart`, zie 29 — die heeft als enige een **rond** icoon).

**DO** **Op mobiel altijd `position:relative` + `z-index`, nooit `position:static`.** Het CSS-commentaar (home-process.css:229-232) legt uit waarom: de foto is vervangen inhoud en tekent zich anders over de kaartachtergrond, waardoor het icoon half wordt afgesneden. Dezelfde regel met dezelfde reden staat bij `.vh-proof-kaart` (home-proof.css:436-440) en `.vh-final-kaart` (home-final.css:398-401). Dit is het meest herhaalde expliciete patroon van het hele systeem.
**DON'T** De overlap niet loslaten op mobiel — die blijft bestaan via de negatieve `margin-top`.

**Source implementation** markup `index.html:542-548` · CSS `home-process.css:114-147` (desktop), `229-244` (≤1199), `294` (tablet) · zusterregels `home-proof.css:436-440` · `home-final.css:398-401`

---

### 22 · VIBE.CONTROL-SHOWCASE

**Status v1** UNIEK.

**V1.0-landing** **SECTION** — de **VIBE.CONTROL-dashboardcompositie wordt NIET geabstraheerd** (§ 0.4). Eigen markup-skelet, eigen gedrag, eigen toestandsklassen; geen enkele primitive dekt dit. Onder **C-02 (DECIDED — V1.0)** blijft de naamgeving zoals Master v1 hem al implementeert: eyebrow `VIBE.CONTROL` (index.html:716), hub-label `EMS` — commerciële productnaam bovenin, functionele categorie in het systeem.

**Doel** Een voorbeeldweergave van het dashboard en de telefoon-app, met leven erin via een ticker en een stroomanimatie.

**Anatomie**
```
div.vh-ctrl-devices
├─ div.vh-ctrl-dash > div.vh-ctrl-scr
│   ├─ div.vh-ctrl-bar > span.vh-ctrl-merk + span.live
│   ├─ div.vh-ctrl-dash-body
│   │   ├─ nav.vh-ctrl-rail                    (6 links, één .aan)
│   │   └─ div.vh-ctrl-main
│   │       ├─ h3.vh-ctrl-kop + span
│   │       ├─ div.vh-ctrl-tiles > 3 × div.vh-ctrl-tile
│   │       └─ div.vh-ctrl-flow
│   │            > div.vh-ctrl-col.l
│   │            + div.vh-ctrl-mid > svg > path.vh-ctrl-stroom
│   │            + div.vh-ctrl-hub  "EMS"
│   │            + div.vh-ctrl-col.r
│   └─ div.vh-ctrl-foot > span.tk#vhCtrlTicker + span
└─ div.vh-ctrl-phone > .vh-ctrl-scr
    > .vh-ctrl-bar + .vh-ctrl-phone-body (4 × .vh-ctrl-node) + .vh-ctrl-phone-tab
```

**Tokens** `--ct-scr` `#011731` · `--ct-blauw` · `--ct-navy` · `--ct-sub`.

**Desktop (≥1200px)** Sectie `height:33.171cqw`, `background:#EFF7FE`, met `::before` `clip-path:polygon(7.0% 9.5%,62% 4%,62% 96%,6.6% 88%,-0.6% 46%)` + `linear-gradient(100deg, rgba(186,220,252,.52)→0)`. Dash: `left:11.3924cqw top:3.4273cqw`, `38.6189 × 24.0530cqw` (587 × 366 ref), `border-radius:.7329cqw`, `background:var(--ct-scr)`, `border:1px solid rgba(120,175,240,.20)`. Phone: `left:4.4081cqw top:9.0925cqw`, `8.3032 × 17.1364cqw` (126 × 260 ref), `border-radius:1.0541cqw`, `background:#050E1B`, `border:.115cqw solid #16202F`, `z-index:2`. Bar `.455cqw`/`ls .13em`/uppercase/`#7E93AE`; `.live` `#3E9BFF` met `i` `0.28cqw` + `animation:vhCtrlPuls 1.8s`. Dash-body `grid-template-columns:7.4cqw 1fr`; rail zes links `.50cqw`, `.aan` → `#E6EFFA` + svg `#3E9BFF`. Tiles `grid` 3 kolommen; tile `border:1px solid rgba(120,175,240,.16)`, `border-radius:.32cqw`, `background:rgba(10,34,66,.55)`, `padding:.58cqw .62cqw`; `span` `.44cqw` `#6F86A2`; `b` `.80cqw`/700/`#E6EFFA`. Flow `grid 1fr 5.2cqw 1fr`; node `padding:.40/.48cqw`, `border-radius:.28cqw`, `background:rgba(10,34,66,.45)`, `transition:border-color/background/box-shadow .3s`; `.hot` → `border:rgba(62,155,255,.75)` + `background:rgba(0,115,254,.14)` + `box-shadow:0 0 .9cqw rgba(62,155,255,.28)`. Hub `2.6cqw` cirkel. Stroom `stroke:rgba(62,155,255,.34)`, `stroke-dasharray:3 6`, `animation:vhCtrlStroom 1.1s linear infinite`.

**Tablet (768-1199px)** Rail komt terug (150px, 12px tekst), `.vh-ctrl-mid` komt terug, flow `1fr 70px 1fr`, `col.r` weer `row-reverse`, feats 4 kolommen, CTA `width:auto` + `min-width:280px`.

**Mobiel (≤767px)** Sectie `display:flex; flex-direction:column`, `padding:var(--m-sec-y) 0`; `::before` uit. **Volgorde: devices 1 · copy 2 · feats 3 · cta 4** — de console opent de sectie (commentaar home-control.css:299). Phone `display:none`. Dash `position:static`, `width/height:auto`, `border-radius:var(--m-radius)`, `box-shadow:0 18px 40px -22px rgba(26,86,156,.45)`. Rail, `mid` en `col.l` op `display:none` — `col.l` omdat de tegels dezelfde bronnen al tonen, wat ruim 190px scheelt (commentaar home-control.css:333-336). Bar `12px 14px`/10px; main `16px 14px 18px`; kop 15px; tiles `gap:8px`, tile `10px` `border-radius:8px`; node `10px 11px`, `gap:10px`, `border-radius:8px`, svg 16px, `b` 13px, `span` 11,5px; foot `11px 14px`/10px.

**Gedrag** Zes tickerregels rouleren elke 2600ms. Een `IntersectionObserver` met `threshold .25` start de cyclus één keer. `mouseenter` op een node stopt de cyclus en selecteert die node; `mouseleave` op het dashboard herstart (index.html:751-783).

**Contentregels** Alle waarden komen uit het al gepubliceerde EMS-blok van de site: `+128 kW` zon, `+41 kW` net, `−36 kW` accu, `64 kW` laden, `52 kW` HVAC, `17 kW` licht. De voettekst zegt letterlijk `Voorbeeldweergave`.

**Toegestane varianten** Toestandsklassen: `.aan` (railitem), `.hot` (node), `.uit` (stroomlijn), `.live` (statusstip).

**DO** `prefers-reduced-motion` zet de stroomlijnen en de pulserende stip stil (home-control.css:280-283).
**DON'T** Geen productscreenshot en geen nagebouwde cijfers. `index.html:615-622` wijst acht referentiewaarden expliciet af (842/612/230 kW, 78%, 12%, 34%, 48%, 12 sep. 2026) omdat geen van de acht in de repository voorkomt. Presenteer de waarden niet als gemeten of geclaimde prestatie (index.html:650-652).

**Source implementation** markup `index.html:623-713` · CSS `home-control.css:50-190` (desktop), `294-344` (≤1199), `366-375` (tablet), `280-283` (reduced motion) · gedrag `index.html:751-783`

---

### 23 · ORGANISATIE-VERTROUWENSRIJ

**Status v1** GEDEELD binnen sectie 6 — één klasse, twee instanties.

**V1.0-landing** **PRIMITIVE + SECTION** — de kaartjes landen op `.vibe-card--light` (P07); de absolute plaatsing rechtsboven in deel A van sectie 6 blijft section-specific. De rand `rgba(16,28,58,.12)` is gemeten identiek aan `--vibe-lijn` (home.css:52) en gaat op in één semantisch lijntoken (D12). Het sectorlabel in `span` volgt de canonieke taxonomie van **C-05** (Automotive, Recreatie).

**Doel** Vertrouwen tonen zonder logo's: naam, sector, plaats, elk gelinkt aan de eigen casepagina.

**Anatomie**
```
div.vh-proof-logos > 2 × a.vh-proof-org
  ├─ b      ← organisatie
  └─ span   ← "sector · plaats"
```

**Tokens** Geen `var()` voor rand of vlak; `rgba(16,28,58,.12)` is hardgecodeerd terwijl `--vibe-lijn` (home.css:52) precies die waarde bevat en nul keer wordt gebruikt.

**Desktop (≥1200px)** `.vh-proof-logos` `position:absolute` `right:4.2841cqw top:3.3000cqw`, `min-height:3.7204cqw` (66 ref), `display:flex`, `align-items:stretch`, `justify-content:flex-end`, `gap:1.1274cqw`, `z-index:2`. `.vh-proof-org`: `flex:none`, `flex-direction:column`, `justify-content:center`, `gap:.2254cqw`, `padding:.9583cqw 1.4655cqw`, `border:1px solid rgba(16,28,58,.12)`, `border-radius:.5637cqw`, `background:#FFF`, `transition:border-color/box-shadow/transform .2s ease`; hover `border:rgba(0,115,254,.42)` + `box-shadow:0 .68cqw 1.58cqw -.9cqw rgba(26,86,156,.30)` + `translateY(-1px)`. `b` `1.0147cqw` (18px)/700/`lh 1.25`/`ls .01em`/`#101C3A`/`nowrap`. `span` `.7891cqw` (14px)/400/`lh 1.3`/`#5B6B86`/`nowrap`.

**Tablet (768-1199px)** `grid-template-columns:repeat(2, minmax(0,300px))`, `gap:14px`, `justify-content:start` (links uitgelijnd met de kop); org `padding:14px 16px`.

**Mobiel (≤767px)** `position:static`, `display:grid` `1fr 1fr`, `align-items:stretch`, `gap:10px`, `margin-top:18px`, `min-height:0`; org `gap:3px`, `padding:12px 13px`, `border-radius:12px`; `b` 14,5px; `span` 12px met `white-space:normal`.

**Contentregels** Precies twee organisaties, elk met een eigen casepagina: Hedin Automotive (`Automotive · Alkmaar en Amsterdam`) → `project-hedin-alkmaar`; Dormio (`Recreatie · Medemblik`) → `project-dormio-medemblik` (index.html:805-814). De naam staat in de eigen huisletter, niet in een logo.

**Toegestane varianten** Geen.

**DO** De hover-`transform` wordt op aanraakschermen uitgezet via `@media (hover:none)` (home-mobile.css:236-238), samen met `.vh-sol-mod` en `.vh-proof-strip`.
**DON'T** Nadrukkelijk **geen nagebouwd logo** (home-proof.css:135). Er staat geen enkel logobestand van een derde partij in de repository; de acht merklogo's uit de referentie zijn afgewezen met de reden "liever twee echte organisaties met hun sector, locatie en project erbij dan zes lege slots die als niet-geladen logo's ogen" (index.html:789-794).

**Source implementation** markup `index.html:805-814` · CSS `home-proof.css:105-150` (desktop), `402-417` (≤1199), `486-489` (tablet) · hover-uitschakeling `home-mobile.css:236-238`

---

### 24 · PROJECTVERHAALMODULE

**Status v1** UNIEK — de zwaarste compositie van de pagina.

**V1.0-landing** **PRIMITIVE + SECTION** — de onderdelen landen op primitives: `.vibe-metric` (P11) voor de `dl`, `.vibe-media` (P12) voor de foto, `.vibe-card--light` (P07) voor de resultaatkaart, `.vibe-btn--primary` (P06) voor de CTA, `.vibe-eyebrow`/`.vibe-heading`/`.vibe-lead` (P03-P05) voor de story. De **compositie** — wig, de 17,55%-diagonaal, de vijf absoluut geplaatste blokken — blijft section-specific. Niet gegarandeerd permanent: bij een tweede gebruik in de repository verhuist hij alsnog (§ 0.4).

**Doel** Eén gerealiseerd project uitvoerig: verhaal, foto, resultaatkaart met vier cijfers, donkere strook naar de case, en een CTA naar alle projecten.

**Anatomie**
```
div.vh-proof-b
├─ span.vh-proof-wig[aria-hidden]
├─ div.vh-proof-story  > p.vh-proof-eyb2 + h3.vh-proof-kop2 + p.vh-proof-lead
├─ div.vh-proof-foto   > img
├─ div.vh-proof-kaart  > span.vh-proof-badge
│                       + p.vh-proof-citaat
│                       + dl.vh-proof-cijfers > 4 × (div > dt + dd)
├─ a.vh-proof-strip    ← zie 25
└─ a.vh-proof-cta
```

**Tokens** `--pf-blauw` · `--pf-sub` `#7C88A2` · `--pf-strip` `#01234C`. De kaartschaduw is `--vibe-elev-2` uitgeschreven (home-proof.css:249-250 vs home.css:62-63).

**Desktop (≥1200px)** Deel B `position:absolute` `top:13.6000cqw bottom:0`, `background:linear-gradient(112deg,#EDF7FE 0%,#F2F9FE 26%,#ECF6FE 60%,#E3F1FE 100%)`. Wig: `right:0 top:8.0000cqw`, `4.7914 × 7.4972cqw` (85 × 133 ref), `clip-path:polygon(0 0,100% 0,100% 100%)`, `background:#B8DCFB`. Story `left:4.3968cqw top:4.2000cqw width:30.0000cqw`, `z-index:3`. Foto `left:30.8681cqw top:2.6000cqw`, `41.3980 × 31.4000cqw`, `clip-path:polygon(17.55% 0,100% 0,100% 100%,0 100%)` = de Vibe-diagonaal, `object-position:52% 46%`, `z-index:1`. Kaart `left:69.8985cqw top:4.8000cqw`, `25.2537 × 21.0823cqw` (448 × 374 ref), `padding:2.1430/1.8047/1.9739/2.3685cqw`, `border-radius:.9019cqw`, `background:#FCFDFE`, `display:flex; flex-direction:column`, `z-index:2`. Badge `.7328cqw`/700/`ls .16em`/blauw. Citaat `margin-top:1.0148cqw`, `1.1274cqw` (20px)/`lh 1.4938cqw`/400/`#16243F`. Cijfers `dl` `grid 1fr 1fr`, `gap:.9019cqw 1.1274cqw`, `margin:auto 0 0`; `dt` `1.1838cqw` (21px)/700/`lh 1.15`/`#0073FE`; `dd` `margin-top:.1691cqw`, `.7891cqw` (14px)/`lh 1.25`/`var(--pf-sub)`. CTA `absolute left:4.5078cqw top:21.2223cqw`, `17.4746 × 3.7768cqw` (310 × 67 ref), `padding:0 1.1274cqw 0 .8455cqw`, `border-radius:.5637cqw`, `background:var(--pf-blauw)`, `justify-content:space-between`.

**Tablet (768-1199px)** Deel B `display:grid` `1fr 1fr`, `column-gap:22px`, `align-items:start` — story `1/-1`, foto kolom 1 (300px hoog), kaart kolom 2 (`margin:24px 0 0`), strip `1/-1`, CTA `width:auto` + `min-width:280px`.

**Mobiel (≤767px)** Sectie `flex-direction:column`. Deel A `position:static`, `padding:var(--m-sec-y) var(--m-gutter) 0`. Deel B `position:static`, `padding:26px var(--m-gutter) var(--m-sec-y)`. **Volgorde: story 1 · foto 2 · kaart 3 · strip 4 · cta 5.** Wig `display:none`. Foto `position:static`, `height:220px`, `margin-top:26px`, `clip-path:none`, `border-radius:var(--m-radius-img)`. Kaart `position:relative`, `z-index:2`, `margin-top:-28px`, `margin-left:16px`, `padding:20px`, `border-radius:var(--m-radius)`. Badge 10,5px; citaat `var(--m-body)`/`lh 23px`/`margin-top 12px`; cijfers `gap:12px 14px`, `dt` 19px, `dd` 12,5px. CTA `width:100%`, `height:var(--m-btn-h)`, `border-radius:10px`.

**Contentregels** Vier cijfers in de resultaatkaart, alle uit `project-ratio-16.html`: `78%` besparing · `240` zonnepanelen · `12` laadplekken · `51 kW` aansluiting. Sectie 3 licht Hedin Alkmaar uit, sectie 6 bewust een **ander** gerealiseerd project, zodat de homepage niet op één klant leunt (index.html:824-826).

**Toegestane varianten** Geen.

**DO** De foto-diagonaal (`17.55%`) is dezelfde vormtaal als in hero, project, infra, final en footer.
**DON'T** Uitdrukkelijk **geen testimonial**. Nergens in de repository bestaat een citaat met naam, functie en organisatie; alle tekst staat daarom in de derde persoon en er is geen naamblok in citaatvorm (index.html:817-826, 842-844). Dode CSS: `.vh-proof-quote` (home-proof.css:263-269 + 446) hoort bij een aanhalingsteken-icoon dat **0×** in de markup staat.

**DEFERRED TO PAGE MIGRATION — klassenaam versus semantiek** (D19). `.vh-proof-kaart` draagt de naam van een resultaatkaart, maar de tekst zit in `.vh-proof-citaat` en er is een dode `.vh-proof-quote`-regel, terwijl het commentaar uitdrukkelijk zegt dat het **geen** citaat is.

*Voorwaarde voor heropening:* de vraag verdwijnt vanzelf zodra deze kaart op `.vibe-card--light` (P07) landt — de `.vh-*`-naam bestaat dan niet meer. Wat wél beslist moet worden is de naam van de section-specific wrapper, en die mag **geen citaatsemantiek dragen**. Beslismoment: de sectiemigratie van sectie 6. De dode `.vh-proof-quote` gaat niet mee (§ 6).

**Source implementation** markup `index.html:817-871` · CSS `home-proof.css:42-57, 155-361` (desktop), `376-467` (≤1199), `469-489` (tablet)

---

### 25 · DONKERE PROJECTSTROOK

**Status v1** UNIEK.

**V1.0-landing** **PRIMITIVE + SECTION** — `.vibe-card--dark` (P07) met `.vibe-media` (P12) voor de duimnagel, `.vibe-eyebrow` (P03) en `.vibe-btn--text` (P06, onderstreepte variant E uit component 09). De absolute plaatsing binnen sectie 6 blijft section-specific. De lege `alt=""` op de duimnagel is een contentregel en blijft: de tekst ernaast draagt de betekenis.

**Doel** Eén brede, donkere strook die met duimnagel, eyebrow, titel en specregel naar de volledige case linkt.

**Anatomie**
```
a.vh-proof-strip[href]
├─ span.vh-proof-strip-fig > img[alt=""]
├─ span.vh-proof-strip-tx
│   ├─ span.vh-proof-strip-eyb   "Volledige case"
│   ├─ b                          ← projecttitel
│   └─ span.spec                  ← specregel
└─ span.vh-proof-strip-cta > span (onderstreept) + svg
```

**Tokens** `--pf-strip` `#01234C`; hover `#042B5C` hardgecodeerd.

**Desktop (≥1200px)** `position:absolute` `left:35.6257cqw top:25.2000cqw`, `35.4566 × 6.9899cqw` (629 × 124 ref), `box-sizing:border-box`, `padding:.9583cqw 1.2402cqw .9583cqw 1.0147cqw`, `border-radius:1.1274cqw`, `background:var(--pf-strip)`, `display:flex`, `align-items:center`, `gap:1.1274cqw`, `z-index:3`, `transition:background .2s ease`. Fig `5.5242 × 5.1297cqw` (98 × 91 ref), `border-radius:.5637cqw`, img `object-position:50% 38%`. Eyb `.6313cqw`/700/`ls .22em`/`#0097FE`. `b` `margin-top:.6765cqw`, `1.2402cqw` (22px)/700/`#fff`. `span.spec` `margin-top:.5637cqw`, `.8455cqw` (15px)/400/`#C3D2E6`. Strip-CTA `.9019cqw`/500/`#fff`, met `text-decoration:underline` en `text-underline-offset:.2255cqw` op de inner `<span>`.

**Tablet (768-1199px)** `grid-column:1/-1` binnen het tweekolomsraster van deel B.

**Mobiel (≤767px)** `position:static`, `height:auto`, `margin-top:18px`, `padding:14px`, `gap:14px`, `border-radius:var(--m-radius)`, `flex-wrap:wrap`; fig 74 × 68px `border-radius:10px`; eyb 10px; `b` 18px; spec 13,5px; strip-CTA 14,5px, `width:100%`, `justify-content:flex-end`, `min-height:32px`.

**Contentregels** Eyebrow `Volledige case`, CTA-label `Bekijk project`. De duimnagel draagt `alt=""`: dit is de **enige** lege alt op de pagina, en die is correct — de tekst ernaast draagt de betekenis.

**Toegestane varianten** Geen.

**DO** Hover-`transform` uit op aanraakschermen (home-mobile.css:236-238).
**DON'T** Niet als knop opmaken — hij is een strook, met een onderstreepte tekstlink als affordance.

**Source implementation** markup `index.html:856-866` · CSS `home-proof.css:299-361` (desktop), `465-466` (≤1199)

---

### 26 · VOORDELENLIJST

**Status v1** HERHAALD ×4.

**V1.0-landing** **PRIMITIVE** — `.vibe-icon` (P08) voor variant A en D, `.vibe-icon-tile` (P09) voor B en C. Vier implementaties worden er één met twee icoonmodifiers (kaal / getint) en een vinkjesvariant. De vier tinten `#D8ECFE` / `#D8ECFE` / `#DEEFFD` / `#E8F3FE` worden één semantisch token (D11). De contentregels bij DON'T (B ingekort op mobiel, D weg op mobiel wegens herhaling) blijven section-specific — dat zijn contentbesluiten, geen stijl.

**Doel** Icoon + vet trefwoord + één regel uitleg, drie of vier keer naast of onder elkaar.

**Anatomie** Alle vier delen hetzelfde skelet: `ul`/`div` > item > icoon + `b` + `span`.

**Desktop (≥1200px)**, **Tablet (768-1199px)** en **Mobiel (≤767px)** per implementatie:

| | Klassen | Icoonbehandeling | Desktopspec | Mobiel | Tablet |
|---|---|---|---|---|---|
| A | `.vh-sol-punten` / `.vh-sol-punt` | kaal | `grid 2.2547cqw 1fr`, `column-gap 2.5366cqw`, `margin-top 1.7024cqw`; svg `2.2547cqw` in `var(--sol-blauw)`; `b` `1.0259cqw`/`lh 1.1274cqw`/700; `span` `.9414cqw` in `var(--vibe-sub)` | `grid 30px 1fr`, `gap 14px`, svg 30px, `b` 16px, `span` `var(--m-body)` | `repeat(3,1fr)`, `gap 20px` |
| B | `.vh-infra-vdl` / `.vh-infra-vd` | in getint vlak | `flex`, `gap 1.9166cqw`, `height 4.6223cqw` (steek 82 ref); ic `3.5513cqw` (63 ref) `radius .7328cqw` `background var(--if-tint) #DEEFFD`, svg `1.6911cqw`; `b` `1.0654cqw`/700/`#0C1424`; `span` `.9583cqw` | `height auto`, `gap 12px`, ic 34px `radius 9px` svg 18px, `b` 15,5px, `span` 13,5px | `repeat(3,1fr)`, `gap 20px` |
| C | `.vh-final-vdl` / `.vh-final-vd` | in getint vlak | `absolute left 4.9453cqw top 27.4369cqw width 46.3622cqw`, `grid 326fr 355fr 294fr`; ic `3.3761 × 3.2810cqw` `radius .6657cqw` `background var(--fi-tint) #E8F3FE`, svg `1.5220cqw`; `b` `.8568cqw`/700; `span` `.8060cqw` | `static`, `grid 1fr`, `gap 14px`, ic 40px `radius 10px` svg 20px, `b` 15,5px, `span` 14px | `repeat(3,1fr)`, `gap 20px` |
| D | `.vh-footer-nb ul` | vinkje | `gap .9583cqw`; `li` `flex gap 1.1274cqw`, `.8681cqw`/`lh 1`; svg `.9019cqw` blauw | **`display:none`** | — |

**Tokens** `--sol-blauw` / `--vibe-sub` (A) · `--if-tint` `#DEEFFD` (B) · `--fi-tint` `#E8F3FE` (C) · `--ft-blauw` (D).

**Contentregels** C draagt de drie beloftes van de final-CTA: `Vrijblijvend advies` · `Binnen 48 uur contact` · `Maatwerkoplossingen` (index.html:979-992).

**Toegestane varianten** Icoon kaal (A), icoon in getint vlak (B, C), vinkje (D).

**DON'T**
- B wordt op mobiel bewust tot één regel per item ingekort omdat sectie 2 hetzelfde patroon (icoon + kop + uitleg) kort daarvoor al toont en herhaling als vulling leest (home-infra.css:358-361).
- D vervalt op mobiel omdat sectie 8 er vlak boven al `Vrijblijvend advies / Binnen 48 uur contact / Maatwerkoplossingen` toont (home-footer.css:365-368).

**DEFERRED TO PAGE MIGRATION — icoontegel-tint** (D11). Vier waarden voor één rol: `--pc-badge` `#D8ECFE` (home-process.css:32) en `--ct-badge` `#D8ECFE` (home-control.css:30) zijn identiek maar apart gedefinieerd; `--if-tint` `#DEEFFD` en `--fi-tint` `#E8F3FE` vervullen dezelfde rol met een andere waarde. Welke de norm is, staat nergens.

*Wat wél vastligt:* `.vibe-icon-tile` (P09) is een bevroren primitive met **één** semantisch tinttoken — vier waarden voor één rol is per definitie een herhaalde semantische rol en wordt dus genormaliseerd (§ 0.7). *Voorwaarde voor heropening:* de waarde wordt gemeten bij de eerste gemigreerde pagina die een icoontegel bevat (migratiestap 1) en daarna gelockt; heropening alleen wanneer een tweede tint aantoonbaar een ándere rol dient, niet dezelfde rol in een andere sectie.

**Source implementation** A `index.html:314-337` + `home-solutions.css:95-121, 366-370, 461-462` · B `index.html:882-895` + `home-infra.css:68-101, 362-368, 441-442` · C `index.html:979-992` + `home-final.css:212-256, 359-370, 422` · D `index.html:1107-1111` + `home-footer.css:238-254, 368`

---

### 27 · INFRASTRUCTUUR/SECTORKAART

**Status v1** GEDEELD binnen sectie 7 — één klasse, vier instanties, vier positievarianten.

**V1.0-landing** **PRIMITIVE** — `.vibe-card--light` (P07) met `.vibe-icon` (P08) en `.vibe-arrow` (P10). De vier positievarianten `--1` t/m `--4` vervallen: dat is plaatsing, geen component. De easing `cubic-bezier(.2,.7,.2,1)` gaat naar `--vibe-ease` (home.css:69, nu 0× gebruikt). `box-shadow:var(--vibe-elev-mob)` is de enige plek in het systeem waar een elevatietoken via `var()` wordt gebruikt en is daarmee het model voor D5.

**Labels onder C-05 (DECIDED — V1.0).** De vier kaarten dragen nu Vastgoed / Logistiek / Recreatie / Woningportefeuilles (index.html:921-942). Canoniek worden dat **Commercieel vastgoed · Logistiek & transport · Recreatie · Woningportefeuilles**. Automotive heeft twee VERIFIED cases maar **geen sectorpagina**; een vijfde kaart mag pas verschijnen als die pagina bestaat (**NO PAGE → NO LINK PROMISE**). "Netcongestie & Energy Hubs" hoort niet op deze as — dat is een oplossing, geen sector. Labelwijziging pas bij de sectiemigratie van sectie 7; tot dan blijft Master v1 byte-for-byte.

**Doel** Vier sectoren als kaarten die op desktop over de foto liggen.

**Anatomie**
```
div.vh-infra-kaarten > 4 × a.vh-infra-kaart.vh-infra-kaart--<n>
  ├─ span.vh-infra-kaart-ic > svg
  ├─ span.vh-infra-kaart-tx > b + span
  └─ span.vh-infra-kaart-pijl > svg
```

**Tokens** `--if-blauw` (pijl). De `transition`-easing `cubic-bezier(.2,.7,.2,1)` is uitgeschreven terwijl `--vibe-ease` (home.css:69) precies die waarde bevat en nul keer wordt gebruikt.

**Desktop (≥1200px)** Kaart `position:absolute` `left:72.9989cqw` (ref 1295), `width:23.7881cqw` (422 ref), `height:7.1026cqw` (126 ref), `box-sizing:border-box`, `border-radius:.7892cqw`, `background:#fff`, `box-shadow:0 .90cqw 1.80cqw -.80cqw rgba(16,58,110,.22), 0 .18cqw .45cqw -.24cqw rgba(16,58,110,.14)`, `z-index:2`, `transition:transform .25s cubic-bezier(.2,.7,.2,1), box-shadow .25s ease`. Hover: `translateY(-.16cqw)` + `box-shadow:0 1.20cqw 2.30cqw -.80cqw rgba(16,58,110,.28), 0 .18cqw .45cqw -.24cqw rgba(16,58,110,.14)`. Icoon `absolute left:1.2965cqw top:1.7475cqw`, `4.6223 × 3.9459cqw`, `color:#16325A`, svg `3.2694cqw`. Tekst `absolute left:7.6663cqw top:1.6347cqw right:2.8749cqw`; `b` `1.0485cqw` (18,6px)/`lh 1`/700/`#0C1424`; `span` `margin-top:.3946cqw`, `.9019cqw` (16px)/`lh 1.3529cqw`/`#45527A`. Pijl `absolute left:20.6877cqw top:2.5930cqw`, `2.0857cqw` cirkel, `background:#E7F2FE`, `color:var(--if-blauw)`, svg `1.0147cqw`.

**Tablet (768-1199px)** `grid-template-columns:repeat(4,1fr)`, `gap:14px`; kaart `min-height:152px`, `padding:16px 16px 14px`; `b` 15,5px; `span` 13px/`lh 18px`.

**Mobiel (≤767px)** `display:grid` `1fr 1fr`, `gap:10px`, `margin:18px var(--m-gutter) 0`. Kaart `position:static`, `width/height:auto`, `min-height:132px`, `flex-direction:column`, `align-items:flex-start`, `gap:10px`, `padding:14px 14px 12px`, `border-radius:var(--m-radius)`, `box-shadow:var(--vibe-elev-mob)` — **de enige plek in het hele systeem waar een elevatietoken via `var()` wordt gebruikt** (home-infra.css:402). Icoon `position:static` 38px, svg 24px. `b` 15,5px/`lh 19px`; `span` 13px/`lh 18px`/`margin-top 4px` met `<br>` uit. Pijl `display:none`.

**Contentregels** Vier sectoren, titels en beloftes uit de industriepagina's zelf: Vastgoed, Logistiek, Recreatie, Woningportefeuilles (index.html:921-942). Sectie 2 toont de systeemcomponenten, deze kolom toont voor wie we bouwen (index.html:918-920).

**Toegestane varianten** Uitsluitend positioneel: `--1` `top:8.1000cqw` · `--2` `16.0677cqw` · `--3` `24.0343cqw` · `--4` `31.9998cqw`.

**DO** Hover-`transform` uit op aanraakschermen (home-mobile.css:236-238).
**DON'T** Geen sectorfotografie — die bestaat niet als uitsnede, dus SVG-iconen (index.html:918-920). Op desktop liggen de kaarten óver de foto (daarom `.vh-infra-foto::after` als verdonkering); op mobiel staan ze eronder en vervallen zowel de Vibe-diagonaal als het verloop (home-infra.css:340-346). Dode CSS in ditzelfde bestand: de volledige `.vh-infra-kpi-balk` (home-infra.css:282-328, 413-425, 433-435) — de KPI-strook is uit de markup verdwenen maar de CSS staat er nog — en `.vh-infra-note` (home-infra.css:185-204), **0×** in de markup.

**Source implementation** markup `index.html:921-942` · CSS `home-infra.css:209-277` (desktop), `385-411` (≤1199), `437-440` (tablet)

---

### 28 · FINAL-CTA-COMPOSITIE

**Status v1** UNIEK — draagt samen met de hero de meeste geometrie (5 `clip-path` per bestand).

**V1.0-landing** **SECTION** — de **final CTA diagonal composition wordt NIET geabstraheerd** (§ 0.4): drie gestapelde `clip-path`-lagen (wig, foto, blauw vlak) plus de mobiele vereenvoudiging via `::before`. Binnen de compositie landen `.vibe-btn--primary` en `--secondary` (P06), `.vibe-media` (P12), `.vibe-card--light` (P07, via 29) en de voordelenlijst (26 C → P09). De mobiele volgorde copy 1 · vdl 2 · foto 3 · kaart 4 is een compositiebesluit en blijft section-specific.

**Doel** De laatste, zwaarste conversiecompositie: chevron-wig, foto, blauw vlak, copy met twee knoppen, drie bewijsitems, afspraakkaart.

**Anatomie**
```
section#contact-cta.vh-final
├─ span.vh-final-wig[aria-hidden]
├─ div.vh-final-foto > img
├─ span.vh-final-blauw[aria-hidden]
├─ div.vh-final-copy
│   ├─ p.vh-final-eyebrow + h2.vh-final-kop + p.vh-final-lead
│   └─ div.vh-final-acties > a.vh-final-cta[data-calendly] + a.vh-final-cta2
├─ ul.vh-final-vdl        ← zie 26 C
└─ div.vh-final-kaart     ← zie 29
```

**Tokens** `--fi-blauw` = `var(--vibe-blauw)` · `--fi-tint` `#E8F3FE`.

**Desktop (≥1200px)** Sectie `height:35.5681cqw` (748 ref), `background:#FAFCFD`, `overflow:hidden`. Wig: `inset:0`, zespunts chevron `clip-path:polygon(48.83% 0, 60.06% 0, 47.31% 55.75%, 58.49% 100%, 47.31% 100%, 36.14% 55.75%)`, `background:linear-gradient(180deg,#BEDCF9 0%,#D8EAFB 17%,#EAF3FD 38%,#F2F9FE 56%,#F1F9FE 100%)`, `z-index:1`. Foto: `left:47.31% top/right/bottom:0`, `clip-path:polygon(24.19% 0,100% 0,100% 100%,21.21% 100%,0 55.75%)`, `background:#E3ECF4`, `z-index:2`; `::after` `linear-gradient(200deg, rgba(8,32,60,.62) 0%, .38 44%, .58 100%)`; img `object-position:78% 56%`. Blauw vlak: `right:0 top:36.50%`, `width:16.55% height:63.50%`, `clip-path:polygon(100% 0,100% 100%,0 100%)`, `linear-gradient(205deg, rgba(11,113,226,.88) → rgba(1,92,208,.92) → rgba(1,68,141,.94))`, `z-index:3`. Copy `left:4.9929cqw top:3.8047cqw width:38.0000cqw`, `z-index:5`. Acties `gap:.9986cqw`, `margin-top:1.4772cqw`; knoppen zie 07/08.

**Tablet (768-1199px)** Kop `clamp(42px,5.6vw,52px)`; acties `flex-direction:row`; knoppen `width:auto` + `min-width:250px`; vdl 3 kolommen `gap:20px`; foto 340px; kaart `max-width:430px`.

**Mobiel (≤767px)** Sectie `display:flex; flex-direction:column`, `padding:var(--m-sec-y) 0 calc(var(--m-sec-y)+6px)`. **Volgorde: copy 1 · vdl 2 · foto 3 · kaart 4.** Wig en note `display:none`. Blauw vlak `display:none`, vervangen door `.vh-final-foto::before` (44% × 58% rechtsonder, `clip-path:polygon(100% 0,100% 100%,0 100%)`, `linear-gradient(200deg, rgba(0,115,254,.92) → rgba(0,60,150,.94))`, `z-index:2`). Foto `position:relative`, `height:204px`, `margin:24px var(--m-gutter) 0`, `clip-path:none`, `border-radius:var(--m-radius-img)`, `object-position:76% 44%`, eigen zachter `::after`. Acties `flex-direction:column`, `align-items:stretch`, `gap:10px`; beide knoppen `width:100%`, `height:var(--m-btn-h)`, `border-radius:10px`, `justify-content:space-between`, svg 19px.

**Contentregels** Drie bewijsitems: `Vrijblijvend advies` · `Binnen 48 uur contact` · `Maatwerkoplossingen`. De primaire CTA opent de Calendly-popup via `data-calendly`; `href="contact"` blijft de werkende fallback zonder JS (index.html:967-968).

**Toegestane varianten** Geen.

**DO** De mobiele vereenvoudiging van de Vibe-diagonaal tot één blauwe driehoek rechtsonder het beeld via `::before` is het vaste patroon (home-final.css:389-397, identiek aan home-hero.css:458-466).
**DON'T** `Binnen 24 uur contact` uit de referentie is **afgewezen**: de site belooft zelf 48 uur (FAQ) en de 24-uurbelofte staat alleen bij de Netcongestie Check, niet bij een algemeen contactverzoek (index.html:975-978). Ook niet gebruikt: een gegenereerd pand met Vibe-gevel — gebruikt is de echte opname van Hedin Automotive Amsterdam (index.html:950-955). Dode CSS: `.vh-final-note` (home-final.css:106-125), **0×** in de markup.

**Source implementation** markup `index.html:946-1002` · CSS `home-final.css:15-104, 127-256` (desktop), `329-415` (≤1199), `418-424` (tablet)

---

### 29 · AFSPRAAKKAART

**Status v1** UNIEK — variant van 21 met één onderscheidend kenmerk.

**V1.0-landing** **PRIMITIVE + SECTION** — `.vibe-card--light` (P07) met `.vibe-icon-tile` (P09, **ronde modifier**) en `.vibe-btn--text` (P06). Het ronde icoon wordt een modifier van de tegel, geen aparte primitive. De plaatsing binnen de final-CTA-compositie blijft section-specific (§ 0.4). Calendly-gedrag ongewijzigd: `data-calendly` blijft expliciet op de link staan, want het label `Kies een moment` matcht de tekstheuristiek **niet** (§ 3/32.7).

**Doel** Uitnodigen tot het plannen van een gesprek, met dezelfde Calendly-flow als de primaire CTA.

**Anatomie**
```
div.vh-final-kaart
├─ span.vh-final-kaart-ic > svg     ← ROND
├─ b
├─ p
└─ a.vh-final-kaart-link[data-calendly] > svg
```

**Tokens** `--fi-blauw`.

**Desktop (≥1200px)** `position:absolute` `left:59.3912cqw top:16.3575cqw`, `17.1659 × 15.3590cqw` (361 × 323 ref), `padding:1.4265/1.4655/1.7876/1.8069cqw`, `border-radius:.7608cqw`, `background:#fff`, `box-shadow:0 1.20cqw 2.60cqw -1.00cqw rgba(9,38,78,.30), 0 .24cqw .62cqw -.30cqw rgba(9,38,78,.18)`, `display:flex; flex-direction:column`, `z-index:4`. Icoon `3.2335cqw` (68 ref) met `border-radius:50%`, `background:var(--fi-blauw)`, `color:#fff`, svg `1.5220cqw`. `b` `margin-top:.5918cqw`, `1.1838cqw` (21px)/`lh 1.3529cqw`/700/`#0C1424`. `p` `margin-top:.6425cqw`, `.9244cqw` (16,4px)/`lh 1.2402cqw`/`#4A5578`. Link `margin-top:auto`, `.9188cqw`/600/`var(--fi-blauw)`, `gap:.8455cqw`, hover `opacity:.78`, svg `1.0147cqw`.

**Tablet (768-1199px)** `max-width:430px` (home-final.css:424). De link blijft **verborgen**: `display:none` staat op home-final.css:339 in het 1199-blok en wordt in het tabletblok (418-425) nergens teruggedraaid. Gemeten bij 900px: `display: none`. De regels op home-final.css:414-415 die de link op 15,5px / `min-height:44px` / svg 17px zetten zijn daardoor **dode CSS** — zie § 5.4.

**Mobiel (≤767px)** `position:relative` (niet `static`, zie 21), `width/height:auto`, `margin:-34px var(--m-gutter) 0` met `margin-left:calc(var(--m-gutter)+14px)`, `padding:18px 18px 20px`, `border-radius:var(--m-radius)`, `z-index:3`. Icoon 44px, svg 21px. `b` 18,5px/`lh 24px`/`margin-top 14px` met `<br>` uit. `p` `var(--m-body)`/`lh 21px`/`margin-top 10px` met `<br>` uit. **Link `display:none`.**

**Contentregels** Label van de link is `Kies een moment` (index.html:1000).

**Toegestane varianten** Geen.

**DO** Het ronde icoon is hier het bewuste onderscheid met alle andere kaarten, die afgeronde vierkanten hebben.
**DON'T** Geen tijdslots of data: er is geen beschikbaarheidsbron in deze repository (index.html:994-995). Onder 1200px geen tweede knop naar dezelfde actie — de kaart houdt zijn geruststellende tekst maar verliest de link, omdat `Plan een gesprek` 400px hoger in dezelfde sectie staat (home-final.css:336-338). Neem de maatregels op home-final.css:414-415 niet over als tabletspec: ze renderen nergens.

**Source implementation** markup `index.html:996-1001` · CSS `home-final.css:261-317` (desktop), `398-415` (≤1199), `424` (tablet)

---

### 30 · FOOTER

**Status v1** UNIEK — en de enige component met een sitebrede neveneffect-regel.

**V1.0-landing** **SECTION** — sitebreed, één implementatie, geen primitive. Binnen de footer landen `.vibe-btn--primary` (P06) voor de NB-CTA en `.vibe-media` (P12) voor de wig-`img`; de chevron-`clip-path`, het absolute kolomraster en het merkblok blijven section-specific. **De sleutelregel `.vh-footer ~ footer.ftr.v1a{display:none!important}` (home-footer.css:35) blijft staan zolang de homepage niet gemigreerd is** — zij is de enige reden dat er geen dubbele footer verschijnt. De navkolommen volgen C-01: wat het mega-menu ontsloot en de platte header niet draagt, landt hier of op een overzichtspagina.

**Doel** Merk, drie navigatiekolommen, een contactblok als kaart, en de juridische regel.

**Anatomie**
```
footer.vh-footer
├─ div.vh-footer-wig > img
├─ span.vh-footer-note[aria-hidden]
├─ div.vh-footer-merk
│   ├─ a.vh-footer-logo (badge + VIBE + ENERGY)
│   ├─ p.vh-footer-tag
│   └─ ul.vh-footer-contact
├─ div.vh-footer-navs > 3 × nav.vh-footer-nav.vh-footer-nav--<n> (b + ul)
├─ div.vh-footer-nb > b + p + a.vh-footer-nb-cta + ul
├─ span.vh-footer-lijn[aria-hidden]
└─ div.vh-footer-legal
```

**Tokens** `--ft-blauw` = `var(--vibe-blauw)` · `--ft-navy` `#0C1B33` · `--ft-body` = `var(--vibe-body)` · `--ft-lijn` `#DCE7F2`.

**Desktop (≥1200px)** `height:35.5681cqw` (748 ref); `background:linear-gradient(115deg,#EDF6FD 0%,#F7FBFE 26%,#FDFEFF 46%,#F6FAFE 74%,#EFF7FD 100%)`; `color:#1B2740`; `overflow:hidden`. Wig: `left:80.2663cqw top:0`, `19.7337 × 29.6244cqw` (415 × 623 ref), vijfpunts chevron `clip-path:polygon(38.07% 0, 100% 0, 100% 100%, 48.43% 100%, 0 47.51%)`, `background:#DCE8F4`, `z-index:1`; img `object-position:46% 54%`; `::after` scrim `inset:0 0 42% 0` met `linear-gradient(180deg, rgba(10,38,74,.46) → .16 58% → 0)`. Note: `left:87.1cqw top:4.7cqw width:8.4cqw`, `1.0147cqw`/`lh 1.2402cqw`/500/`#FFFFFF`, dubbele `text-shadow` `rgba(2,26,58,.62)` + `(.48)`, `z-index:2`, `pointer-events:none`. Merk: `left:4.7551cqw top:5.9439cqw width:21.0cqw`, `z-index:3`; logo `gap:.6657cqw`, badge `3.5188cqw`, VIBE `1.8069cqw`/`lh 1.7113cqw`/700/`ls .012em`, ENERGY `1.5220cqw`/`lh 1.7113cqw`/400/`ls .075em` — **beide** `var(--ft-navy)`, anders dan de header waar ENERGY `#4E5C78` is. Navs: `top:7.7500cqw`; `--1 left:25.6775cqw`, `--2 left:38.4636cqw`, `--3 left:50.4041cqw`; `b` `1.1274cqw` (20px)/700/`ls -.004em`; `ul` `margin-top:1.0710cqw`, `gap:.6963cqw`; `a` `.9696cqw` (17,2px)/`lh 1.1274cqw`/`nowrap`, hover `var(--ft-blauw)`. NB-blok: `left:61.3583cqw top:7.7500cqw width:18.0cqw`. Lijn: `left/right:4.7551cqw top:29.4816cqw`, 1px `var(--ft-lijn)`. Legal: `left/right:4.7551cqw top:30.9556cqw`, `flex` `space-between`, `gap:2.0cqw`, `.8455cqw` (15px)/`lh 1.2402cqw`/`#6A768F`; rechts `gap:2.6cqw`; `.reg` `#8A93A8`.

**Tablet (768-1199px)** Footer wordt `display:grid` `minmax(0,1fr)` met `padding:var(--m-sec-y) var(--m-gutter) 26px`, alle kinderen `min-width:0`; navs 3 kolommen; nb `grid-column:1/-1`; legal `row`.
**Tablet 1000-1199px** `grid-template-columns:minmax(0,1fr) minmax(0,1.6fr)`, `column-gap:36px` (home-footer.css:425-429).

**Mobiel (≤767px)** `display:flex; flex-direction:column`, `padding:var(--m-sec-y) 0 26px`. **Volgorde: merk 1 · navs 2 · nb 3 · wig 4 · lijn 5 · legal 6.** Navs `grid 1fr 1fr`, `gap:22px 18px`, `padding:26px var(--m-gutter) 0`; `nav--3` `grid-column:1/-1` met eigen tweekoloms `ul`; `b` 15,5px; `a` `display:flex`, `min-height:40px`, `padding:2px 0`, 14,5px/`lh 19px`, `white-space:normal`. NB wordt een kaart: `background:#F3F8FE`, `border:1px solid #E1ECF8`, `border-radius:var(--m-radius)`, `padding:20px 20px 22px`, CTA `width:100%` `height:var(--m-btn-h)`; `nb ul` `display:none`. Wig `display:none`, note `display:none`. Badge 42px, VIBE 21px/`lh 20px`, ENERGY 17,5px/`lh 20px`. Legal `flex-direction:column`, `gap:14px`, 13px/`lh 20px`, links `min-height:42px`.

**Contentregels** Adres, telefoon en e-mail komen letterlijk uit `_footer.js:92-93`. Legal: `© 2026 Vibe Energy B.V.` + KvK 92191487 + BTW NL865924910B01 (index.html:1121).

**Toegestane varianten** Drie navkolommen: `--1` (Oplossingen), `--2` (Over ons), `--3` (Resources).

**DO** **Sleutelregel:** `.vh-footer ~ footer.ftr.v1a{ display:none !important }` (home-footer.css:35). Die zusterselector bestaat alleen waar `.vh-footer` staat — dus uitsluitend op de homepage. De gedeelde footer uit `_footer.js` blijft voor de overige pagina's ongewijzigd, en het script blijft geladen omdat het óók de Calendly-popup en de preview-linkfix bevat (index.html:1008-1011). **Verwijder `_footer.js` dus nooit van de homepage om de dubbele footer op te lossen.**
**DON'T** Uit de referentie weggelaten omdat de pagina niet bestaat: Advies & engineering, Werken bij Vibe, Nieuws, Kennisbank, Downloads, Klantverhalen (index.html:1063-1065). Geen nieuwsbrief — 0 treffers op nieuwsbrief/newsletter/subscribe/mailchimp, dus dat blok is vervangen door de bestaande contactroute (index.html:1099-1102). Geen `Cookiebeleid`-pagina en geen taalschakelaar (index.html:1116-1119). Niet gebruikt: `Velperweg 37` en `+31 88 303 7300` uit de referentie — die staan nergens in de repository. Dode CSS: `.vh-footer-wig-ongebruikt` (home-footer.css:373-377).

**Source implementation** markup `index.html:1012-1129` · CSS `home-footer.css:14-290` (desktop), `302-393` (≤1199), `396-423` (tablet), `425-429` (1000-1199)

---

### 31 · COOKIECOMPONENT

**Status v1** EXTERN — sitebreed, volledig in het oude designsysteem, bewust ongewijzigd.

**V1.0-landing** **EXTERN — niet in V1.0.** Blijft op zijn eigen stylesheet in `_consent.js`, gebruikt geen enkel `--vibe-*`-token en wordt niet gemigreerd. Er komt **geen** primitive voor een consentdialoog. Herstijlen mag alleen sitebreed, niet vanuit de homepage.

**Doel** Consent vragen, bewaren en herroepbaar maken; Google Consent Mode v2 op `denied` zetten tot toestemming.

**Anatomie**
- **Aanhaakpunt in de homepage** `<a href="#cookies" data-cookie-prefs>Cookievoorkeuren</a>` (index.html:1125).
- **Banner** `.vck-ov > .vck` met `.vck-eb` "Cookies", `.vck-t`, `.vck-p`, `.vck-act` > `.vck-b1` "Alles accepteren" / `.vck-b2` "Alleen noodzakelijk" / `.vck-b3` "Instellingen".
- **Voorkeurenvenster** `.vck-rows > 3 × .vck-r` (Noodzakelijk locked, Analytisch, Marketing) met schakelaars `.vck-sw[role=switch][aria-checked]`.

**Tokens** Geen `--vibe-*`. Eigen `<style id="vck-css">` in het oude systeem: `IBM Plex Sans`, `Archivo`, `JetBrains Mono`, `#00ADEF`, `#0096CC`, `#0E1B24`, radius 3-4px.

**Desktop (≥1200px)** Volledig binnen `_consent.js:53-86`; raakt het `.vh-*`-systeem nergens.

**Tablet (768-1199px)** Idem — de eigen stylesheet van `_consent.js` bevat geen enkele 1199- of 768-breekpuntregel; hij schaalt binnen zijn eigen systeem.

**Mobiel (≤767px)** Idem.

**Gedrag** Laadt als **eerste** script in `<head>` (index.html:4), vóór GTM en Clarity. Opslag: `localStorage` key `vibe_consent_v1`, `VERSION 1`, object `{v, analytics, marketing, ts}` (_consent.js:12, 40-41). Consent Mode v2 defaults: `ad_storage`/`ad_user_data`/`ad_personalization`/`analytics_storage` = `denied`; `functionality_storage`/`security_storage` = `granted`; `wait_for_update:500` (_consent.js:19). Publieke API: `window.vibeConsent.get()` · `.has(k)` · `.on(k,cb)` · `.open()` (_consent.js:44-49). `_clarity.js` laadt pas via `vibeConsent.on('analytics', …)`.

**Contentregels** De dialoog is ook de bestemming van `Cookievoorkeuren` in de footer, omdat er geen cookiebeleid-pagina bestaat.

**Toegestane varianten** Banner en voorkeurenvenster.

**DO** De klik-listener staat in de **bubble**-fase met selector `[data-cookie-prefs],a[href="#cookies"],a[href$="#cookies"]` (_consent.js:155-158). Dat werkt vandaag omdat noch de preview-linkfix (`href` begint met `#`, _footer.js:121) noch de Calendly-handler (label `Cookievoorkeuren` matcht de regex niet) deze klik onderschept.
**DON'T** Deze component volgt **niet** het `.vh-*`-systeem en gebruikt geen enkel `--vibe-*`-token; hij is bewust ongewijzigd gelaten als sitebrede voorziening. Herstijl hem niet vanuit de homepage zonder de overige pagina's mee te nemen. **En:** geef deze link nooit een label dat op `/plan.*gesprek|adviesgesprek|bekijk.*praktijkcase/i` matcht — dan vangt `_footer.js` hem af in de capture-fase en bereikt de klik de bubble-listener nooit meer (zie 32).

**Source implementation** markup `index.html:1125` · script `index.html:4` · implementatie `_consent.js:11-162` (listener 155-158, API 44-49, defaults 19, CSS 53-86) · consument `_clarity.js:15`

---

### 32 · CALENDLY-CTA-GEDRAG

**Status v1** GEDEELD — gedrag zonder stijl. **Dit is het detail dat een latere implementatie sloopt als het niet gedocumenteerd is.**

**V1.0-landing** **GEDRAG — DECIDED — V1.0: ongewijzigd.** Geen primitive, geen stijl, geen wijziging. Het gedrag hangt op het attribuut `data-calendly` en één document-capture-listener, niet op een klasse — daarom raakt het primitief-worden van de knoppen (07, 08, 09) dit component niet. `.vibe-btn` krijgt géén eigen klikafhandeling. De regel voor elk nieuw component blijft: **document- of window-level capture** (§ 32.4).

**Doel** Elke afspraak-CTA opent een in-page Calendly-popup in plaats van weg te navigeren, met een werkende fallback zonder JS.

#### 32.1 Anatomie

**Anatomie** Geen eigen markup en geen eigen klasse: het component is een attribuut plus één document-listener. Het hangt op de knoppen van 07, de tekstlinks van 09 en de CTA van 06.

**Attribuut** `data-calendly` staat op **vijf** elementen in `index.html`, alle vijf **zonder waarde**:

| Regel | Element | Label |
|---|---|---|
| 157 | `a.vh-btn.vh-btn-primair` (header) | `Plan een gesprek` |
| 174 | `a.vh-mobielmenu-cta` | `Plan een gesprek` |
| 189 | `a.vh-btn.vh-btn-primair` (hero) | `Plan een gesprek` |
| 970 | `a.vh-final-cta` | `Plan een gesprek` |
| 1000 | `a.vh-final-kaart-link` | `Kies een moment` |

Omdat het attribuut leeg is, geeft `el.getAttribute('data-calendly')` een lege string (falsy) en valt de code terug op de vaste URL: `https://calendly.com/vibeenergy-sales/30min?hide_gdpr_banner=1` (_footer.js:137). Bevat de URL geen `utm_`, dan wordt `&utm_source=website&utm_medium=cta` aangeplakt (_footer.js:164). Alle vijf hebben `href="contact"` als fallback zonder JS.

**Detectie** `isCalTrigger(el)` (_footer.js:151-155) is waar als het element `data-calendly` heeft, **of** als `el.textContent` matcht op `/plan.*gesprek|adviesgesprek|bekijk.*praktijkcase/i`.

**Afvang** `document.addEventListener('click', handler, true)` — **capture-fase op `document`** — met `e.preventDefault(); e.stopPropagation();` (_footer.js:157-169). Het doel wordt bepaald met `e.target.closest('a,button')` (r. 158), dus de **opgetelde tekst van de dichtstbijzijnde `a`/`button`-voorouder** telt, niet die van het aangeklikte kind.

**Widget** `link` naar `assets.calendly.com/assets/external/widget.css` en `script` `widget.js` worden één keer aan `<head>` toegevoegd (_footer.js:140-149). Is `window.Calendly.initPopupWidget` er nog niet, dan `window.open(url,'_blank','noopener')` als fallback (r. 167).

#### 32.2 Tokens

**Tokens** Geen. Dit component heeft geen stijl; alle zichtbare eigenschappen komen van het element waarop `data-calendly` staat.

#### 32.3 Breekpunten

Gemeten `display` per aanhaakpunt (chrome-headless-shell 1243 op de echte pagina):

| Aanhaakpunt | Desktop ≥1200 | Tablet 900px (gemeten) | Mobiel 390px (gemeten) |
|---|---|---|---|
| header-CTA (157) | zichtbaar | `.vh-acties` = `display:none` | `display:none` |
| mobielmenu-CTA (174) | onbereikbaar | alleen met open menu | alleen met open menu |
| hero-CTA (189) | zichtbaar | zichtbaar, `width:232px` | zichtbaar, volle breedte |
| `.vh-final-cta` (970) | zichtbaar | zichtbaar, `width:250px` | zichtbaar, volle breedte |
| `.vh-final-kaart-link` (1000) | zichtbaar | `display:none` | `display:none` |

**Desktop (≥1200px)** Vier bereikbare aanhaakpunten.

**Tablet (768-1199px)** Drie: hero-CTA, `.vh-final-cta` en — met open menu — de mobielmenu-CTA.

**Mobiel (≤767px)** Dezelfde drie.

Het *gedrag* is op alle drie identiek; alleen het aantal bereikbare aanhaakpunten verschilt.

#### 32.4 Wat `stopPropagation()` in de capture-fase precies blokkeert — GEMETEN

Gemeten met chrome-headless-shell 1243 op een testpagina die de registratievolgorde van `index.html` nabootst (inline menuscript vóór `_footer.js`). Twaalf listeners geregistreerd, geklikt op het `<a data-calendly>`:

| Listener | Fase / knoop | Vuurt? |
|---|---|---|
| `window` | capture | **JA** — vóór `document` |
| `document`, geregistreerd **vóór** de handler | capture | **JA** |
| `document`, de `_footer.js`-handler zelf | capture | **JA** (roept `stopPropagation`) |
| `document`, geregistreerd **ná** de handler | capture | **JA** |
| `body` | capture | NEE |
| tussenliggende knoop (`#menu`) | capture | NEE |
| doelelement | capture | NEE |
| doelelement | target/bubble | NEE |
| tussenliggende knoop | bubble | NEE |
| `body` | bubble | NEE |
| `document` | bubble | NEE |
| `window` | bubble | NEE |

**Conclusie, en dit wijkt af van wat het commentaar suggereert.** `stopPropagation()` stopt de voortgang naar de **volgende knoop** in het pad, niet de overige listeners op dezelfde knoop. Daarom geldt:

- **Wél bereikbaar:** elke capture-listener op `document` — ongeacht of hij vóór of ná `_footer.js` is geregistreerd — en elke capture-listener op `window`.
- **Niet bereikbaar:** alles op `body` of dieper (capture, target én bubble) en élke bubble-listener, ook die op `document` en `window`.

De regel voor nieuwe componenten is dus **"document- of window-level capture"**, niet "registreer vóór `_footer.js`". Het commentaar op `index.html:1155-1157` noemt de volgorde als reden; de gemeten oorzaak is de **fase en de knoop**. De volgorde bepaalt alleen wie eerst draait, niet wie draait.

#### 32.5 Hoe het mobiele menu het oplost

Het mobiele menu moet sluiten wanneer je op zijn Calendly-CTA (index.html:174) klikt. Die klik wordt door `_footer.js` afgevangen. De oplossing in Master v1:

```js
document.addEventListener('click', function(e){
  if(open && e.target.closest && e.target.closest('#vh-mobielmenu a')) zet(false);
}, true);                                  // index.html:1158-1160
```

Een **document-level capture-listener**, in een inline `<script>` op `index.html:1131-1173`, dus vóór `<script src="_footer.js">` op regel 1174. Gevolg: het menu sluit én Calendly opent. Had deze listener op `#vh-mobielmenu` gestaan — capture of bubble — dan was hij nooit bereikt en zou het menu open blijven staan onder de Calendly-popup.

#### 32.6 Hoe `_footer.js` een botsing met zichzelf vermijdt

`_footer.js` heeft een tweede capture-listener op `document`: de preview-linkfix die extensieloze links naar `.html` herschrijft (r. 112-128). Die is eerder geregistreerd en slaat `data-calendly` én dezelfde tekstregex **expliciet over** (r. 118). Zonder die uitzondering zou hij de Calendly-links naar `contact.html` navigeren voordat de popup kon openen.

#### 32.7 Contentregels

**Contentregels** Label van de vier hoofdknoppen is `Plan een gesprek`; van de afspraakkaart `Kies een moment`. **De tekstheuristiek is een contentregel, geen implementatiedetail.** `Plan een gesprek` (3× in de `.vh-`-markup) zou óók zonder het attribuut worden afgevangen. `Kies een moment` (index.html:1000) **niet** — die leunt volledig op `data-calendly`.

**Toegestane varianten** `data-calendly` leeg (= vaste URL) of met een eigen URL als waarde. In Master v1 komt alleen de lege vorm voor.

**DO**
- Zet `data-calendly` expliciet op elke afspraak-CTA, ook als het label toevallig matcht. Vertrouw niet op de tekstheuristiek.
- Houd `href="contact"` als fallback.
- Nieuw component dat op dezelfde kliks moet reageren: registreer op `document` of `window`, in de **capture**-fase.

**DON'T**
- Geef een knop die **niet** naar Calendly mag, nooit een label dat op `/plan.*gesprek|adviesgesprek|bekijk.*praktijkcase/i` matcht. Dat geldt ook voor een `<a>` met veel geneste tekst: `closest('a,button')` telt de hele `textContent` op.
- Bouw geen klikafhandeling op `body` of dieper, en geen enkele in de bubble-fase, voor elementen die een Calendly-trigger kunnen bevatten.
- `_header.js` zet óók `data-calendly` (r. 153, 161), maar dat script wordt door `index.html` niet geladen en is hier dus **geen** bron.

**Source implementation** markup `index.html:157, 174, 189, 970, 1000` · URL `_footer.js:137` · `isCalTrigger` `_footer.js:151-155` · listener `_footer.js:157-169` · widgetlader `_footer.js:140-149` · preview-linkfix-uitzondering `_footer.js:118` · menu-oplossing `index.html:1155-1160` · fallbackcommentaar `index.html:967-968`

---

### 33 · LEADPOPUP

**Status v1** EXTERN — sitebreed, oud designsysteem.

**V1.0-landing** **EXTERN — niet in V1.0.** Blijft op zijn eigen stylesheet in `_leadpopup.js`. Er komt geen primitive voor een leadpopup. Drie besluiten raken wél zijn **copy en delivery**, uit te voeren bij migratiestap 7 (S2 gated guides) — **nu geen productiecode wijzigen**:

- **C-03 (DECIDED — V1.0):** de zeven Executive Guides zijn gated assets, ontsloten via déze leadflow. Drie staan in `sitemap.xml` (regels 16, 118, 124), vier niet; uiteindelijk horen ze waar van toepassing uit de publieke sitemap. De guide-inhoud blijft behouden.
- **C-06 (DECIDED — V1.0), NO ASSET → NO DOWNLOAD PROMISE:** gemeten staat er **geen enkele PDF** in de repository en `assets/brochures/` **bestaat niet**, terwijl de popup-copy `Gratis brochure` (`_leadpopup.js:113`) en "in één document, direct beschikbaar" (`_leadpopup.js:115`) belooft en de knop `Stuur mij de brochure` heet. Alle vijf leadconfigs leveren een **HTML-guidepagina**, geen PDF (index.html:1242 · oplossing-laadplein.html:269 · oplossing-energielabel.html:857 · oplossing-exploitatie.html:295 · oplossing-netcongestie.html:299). De copy moet dekken wat geleverd wordt. Het dode voorbeeldpad `assets/brochures/netcongestie-oplossen.pdf` staat op **`_leadpopup.js:9`** (bestandscommentaar, niet de runtime-default — die is leeg op `_leadpopup.js:32`) en wordt bij migratie gecorrigeerd. Routering naar een zakelijke centrale bestemming, niet naar een persoonlijk e-mailadres.
- **C-07 (DECIDED — V1.0):** `_leadpopup.js:116` toont `VIBE ENERGY · 7 waardestromen · 0 jr wachttijd · −22% netinkoop` zonder bron. Status **UNVERIFIED**. Bij migratie: VERIFIED maken met primaire bron, herschrijven, of verwijderen — zie D28.

**Doel** Brochure aanbieden nadat de bezoeker voorbij de hero is gescrold.

**Anatomie** `.vlp-*`, volledig in `_leadpopup.js`. Configuratie op de homepage:
```js
window.VIBE_LEAD = { slug:"home",
  brochure:"Van energiekosten naar energieopbrengsten",
  file:"energie-als-vastgoedopbrengst.html" };      // index.html:1242
```
Beeld voor slug `home`: `assets/home/popup-960.webp`. Zonder `file` sluit het script direct af.

**Tokens** Geen `--vibe-*`; opnieuw `IBM Plex Sans` / `Archivo` / `JetBrains Mono` / `#00ADEF`.

**Desktop (≥1200px)** Volledig binnen `_leadpopup.js`; raakt het `.vh-*`-systeem nergens.

**Tablet (768-1199px)** Idem — `_leadpopup.js` kent de breekpunten van het homepagesysteem niet.

**Mobiel (≤767px)** Idem.

**Contentregels** Brochuretitel `Van energiekosten naar energieopbrengsten`, bestand `energie-als-vastgoedopbrengst.html`, slug `home` (index.html:1242). Zonder `file` toont het script niets.

**Toegestane varianten** Eén per pagina, gestuurd door `window.VIBE_LEAD.slug`; de homepage gebruikt `home`.

**Gedrag** Trigger: scrollen voorbij `heroBottom()`, met selector `'.phero,.hero,section[data-screen-label*="Hero"],main>section:first-of-type'` (_leadpopup.js:265). Opslag: `sessionStorage` `vibe_lead_seen_home`, `localStorage` `vibe_lead_done_home`; `?popup=1` forceert tonen. Zolang `.vck-ov` (de cookiebanner) open staat wordt elke 600ms opnieuw geprobeerd. Endpoints: `https://dashboard.vibeenergy.nl/api/public/site/lead` (moet `ok:true` + `leadId` geven, anders faalt de aanvraag), daarna `https://vibe-website-api-production.up.railway.app/api/brochure` (mag falen).

**DON'T** Gebruik `data-screen-label` niet als stylehaak of als betrouwbare sectieselector: geen enkel CSS-bestand selecteert erop (0 treffers in `*.css`).

**DEFERRED TO PAGE MIGRATION — de trigger wijst naar de verkeerde sectie** (D20). De hero draagt `data-screen-label="01 Hero"` op een **`<div class="vh">`** (index.html:75), niet op een `<section>`, en er is geen `.phero` of `.hero` op deze pagina. De selector `section[data-screen-label*="Hero"]` matcht dus niet en de code valt door naar `main>section:first-of-type` — dat is `section#oplossingen` (index.html:300). De popup opent daardoor op 75% van sectie 2, niet van de hero. Of dat de bedoelde trigger is, blijkt nergens uit de code.

*Voorwaarde voor heropening:* beslismoment is **migratiestap 7** (S2 gated guides), samen met de C-06-correctie van het dode assetpad. De oplossing moet een expliciete trigger zijn — een eigen attribuut of een echte sectiewortel — niet een uitgebreide selectorlijst die opnieuw op toeval leunt. **NU GEEN productiecode wijzigen**: `index.html` blijft byte-for-byte en `_leadpopup.js` is sitebreed.

**Source implementation** config `index.html:1242` · script `index.html:1243` · implementatie `_leadpopup.js:23-33, 36-46, 49-53, 259-272` · trigger-selector `_leadpopup.js:265`

---

## 4 · Register — besliststatus per open punt

Dit register is bijgewerkt op de besluiten C-01 t/m C-07 en op de bevroren doelarchitectuur van § 0. Het auditbewijs per regel is ongewijzigd overgenomen; alleen de status is toegevoegd.

### 4.1 Statuslegenda

| Status | Betekenis | Mag het een migratiestap blokkeren? |
|---|---|---|
| **DECIDED — V1.0** | Beantwoord door C-01 t/m C-07 of door de bevroren primitive-/tokenarchitectuur (§ 0.3, § 0.7). Niet heropenen | nee |
| **DEFERRED TO PAGE MIGRATION** | De *architectuurvraag* is beslist; de *waarde* wordt bij een benoemde migratiestap gemeten en daarna gelockt. Elke regel draagt de exacte voorwaarde waaronder hij heropend wordt | nee — de stap zelf beslist |
| **DECISION REQUIRED** | Werkelijk open, en niet geraakt door C-01 t/m C-07 | ja, voor het onderdeel dat hij raakt |
| **CONTENT PENDING / PAGE PENDING** | Ontbrekende businessinformatie of ontbrekende pagina. Geen ontwerpvraag; niet invullen, niet verzinnen | ja, voor de betreffende bestemming |
| **CONFLICTING / UNVERIFIED** | Claimstatus onder de claim policy (§ 0.9). Migratie van díé claim is geblokkeerd tot opgelost | ja, alleen voor die claim |

**Telling.** 29 punten: **3** DECIDED — V1.0 · **18** DEFERRED TO PAGE MIGRATION · **3** DECISION REQUIRED · **3** CONTENT/PAGE PENDING · **2** CONFLICTING/UNVERIFIED.

### 4.2 DECIDED — V1.0 (3)

| # | Onderwerp | Bewijs (ongewijzigd) | Besluit + motivering in één zin |
|---|---|---|---|
| D1 | **Secundaire CTA — welke van de twee?** Zes eigenschappen verschillen (randdikte, randkleur, tekstkleur, radius, graad, uitlijning); geen onderlinge verwijzing, geen commentaar | home-hero.css:230-235 vs home-final.css:189-208 | **DECIDED — V1.0:** er komt één `.vibe-btn--secondary` waarop A en B convergeren, omdat de primitivelijst bevroren is op vier knopmodifiers (§ 0.3, P06) en de vraag "welke van de twee" daarmee geen ontwerpvraag meer is; de numerieke set wordt bij migratiestap 1 gemeten en gelockt (zie D7) |
| D4 | **Hovertint `#005FE0`** 7× hardgecodeerd, 1× als token; opzet of achterstallig? | home.css:36 vs 7 sectiebestanden | **DECIDED — V1.0:** wordt één semantisch token, omdat zevenmaal dezelfde waarde voor dezelfde rol per definitie een herhaalde semantische rol is en de bevroren tokenketen die normaliseert (§ 0.7) |
| D23 | **Gedeelde header uit `_header.js`** Bevat een volledig mega-menu met eigen CTA's, maar wordt door `index.html` niet geladen. Definitief of tijdelijk? | index.html:56-67, 1174-1243 · _header.js | **DECIDED — V1.0 (C-01): definitief.** De platte Master-v1-header wordt de sitebrede standaard en het mega-menu verdwijnt, omdat de platte header de enige navigatie is die in de bevroren homepage bewezen rendert; de drie legacy-breekpunten 1024 / 1040 / 1180 (`_header.js:113, 210, 69, 89, 209`) vervallen daarmee en **1199px** blijft de primaire navigatiegrens |

### 4.3 DEFERRED TO PAGE MIGRATION (18)

De architectuurvraag is in § 0 beslist; wat rest is een meting op een benoemd moment. **Geen van deze punten rechtvaardigt een wijziging aan `index.html` of `home*.css` vóór dat moment.**

| # | Onderwerp | Bewijs (ongewijzigd) | Beslismoment | Exacte voorwaarde voor heropening |
|---|---|---|---|---|
| D2 | **Eyebrow-gewicht** — `.vh-eyebrow` = 600, de acht andere = 700; geen commentaar | home-hero.css:252 | stap 1 (B2 master) | alleen als de pixeldiff-poort bij sectie 1 een niet-opgesomd zichtbaar verschil op 1774px aantoont |
| D3 | **Eyebrow-kapitalisatie** — 4× `uppercase` in CSS, 5× niet; bij 3 staat de copy al in kapitalen, bij 2 juist in zinsvorm | home-proof.css:68-75 · index.html:797, 878, 963 | stap 1 | alleen als de gekozen regel een bestaande eyebrow-copy onleesbaar of feitelijk onjuist maakt |
| D5 | **Aantal elevatieniveaus** — `--vibe-elev-1/-2` 0× via `var()` maar wel uitgeschreven; `.vh-infra-kaart` en `.vh-final-kaart` hebben weer eigen schaduwen. Drie niveaus of vijf? | home.css:59-65 · home-process.css:122 · home-proof.css:249-250 · home-infra.css:217 · home-final.css:271 | stap 1-3 | elke schaduwwaarde die in een tweede gemigreerde context terugkeert wordt alsnog een semantisch niveau; een waarde die uniek blijft, blijft section-specific |
| D6 | **Radius-norm** — drie radiustokens, alle 0× gebruikt; elke sectie zet een eigen waarde (11 verschillende cqw-waarden) | home.css:55-57 | stap 1 | idem D5: tweede voorkomen van dezelfde rol → token |
| D7 | **Knopradius — vier of twee waarden?** Gerenderd 9,12 / 10,00 / 11,70 / 11,81px. `.6595cqw` en `.6657cqw` liggen 0,11px uit elkaar — bedoeld verschil of afrondingsdrift van twee referentiecanvassen? | home-project.css:183 · home-control.css:267 · home-final.css:178 | stap 1, samen met D1 | alleen als de gelockte waarde op 1774px een zichtbare knik geeft in een compositie uit § 0.4 |
| D8 | **Navy — drie varianten voor één rol** — `--vibe-navy` `#08203C` (8 refs), `--vh-navy` `#071D3A`, `--ft-navy` `#0C1B33`; S1 en S9 zijn de enige twee die niet naar `--vibe-navy` wijzen | home.css:41 · home-hero.css:19 · home-footer.css:27 | stap 1 | alleen als twee navies aantoonbaar een ándere rol dragen (bijv. tekst vs vlak), niet dezelfde rol in een andere sectie |
| D9 | **Body-grijs `#4C5771` vs `#475771`** — verschil zit uitsluitend in het rode kanaal (76 vs 71); beide dragen het label "lopende tekst" | home.css:43 · home-hero.css:19-20 | stap 1 | alleen bij een gemeten contrastverschil dat een WCAG-drempel kruist |
| D10 | **Kopinkt op kaarten `#0C1424`** — 4× gebruikt, in geen enkele tokenlaag, geen van de drie navies; consistent binnen S7+S8, nergens anders | home-infra.css:92, 255 · home-final.css:247, 294 | stap 1 | viermaal dezelfde waarde voor dezelfde rol = herhaalde rol → token; heropening alleen bij aantoonbaar andere rol |
| D11 | **Icoontegel-tint — vier waarden** — `#D8ECFE` tweemaal apart gedefinieerd, plus `#DEEFFD` en `#E8F3FE` voor dezelfde rol | home-process.css:32 · home-control.css:30 · home-infra.css:28 · home-final.css:28 | stap 1, eerste pagina met een icoontegel | alleen wanneer een tweede tint aantoonbaar een ándere rol dient |
| D12 | **Haarlijn — vijf waarden** — `#E5EFFA`, `#E4F0FC`, `rgba(16,28,58,.12)`, `#DCE7F3`, `#DCE7F2` zijn alle vijf een 1px-scheiding op licht | home-solutions.css:22 · home-infra.css:306 · home-proof.css:124 · home-hero.css:22 · home-footer.css:29 | stap 1 | alleen wanneer een lijn op donker of een lijn met een andere functie (scheiding vs omranding) een tweede token nodig heeft |
| D16 | **`--m-eyebrow` niet in het tabletblok** — `--m-h1/h2/h3/lead/body/btn-h` worden wél herdefinieerd, de eyebrow niet — bewuste constante of vergeten regel? | home-mobile.css:34-45 | eerste homepagesectie met een eyebrow die door de poort gaat (§ 0.10, stap 4) | alleen als de 11,5px op 768px in de vóór/ná-meting als afwijking opvalt; tot dan blijft `home-mobile.css` onaangeraakt |
| D17 | **Twee `<br>`'en overleven onder 1200px** — `index.html:546` (`.vh-proc-kaart h3`) en `index.html:1104` (`.vh-footer-nb b`); de analoge `.vh-final-kaart b` wordt wél onderdrukt (home-final.css:411) | — | sectiemigratie van sectie 4 resp. sectie 9 | markupwijziging, dus pas mogelijk wanneer die sectie migreert; de homepage blijft tot dan byte-for-byte |
| D18 | **KPI-strip: commentaar noemt 600px, code doet 768px** — tussen 600 en 767px rendert de mobiele één-kolom, niet wat het commentaar beschrijft | home-hero.css:478-481 vs 495 | sectiemigratie van sectie 1 (laatste in de volgorde) | uitsluitend met een meting op 600, 700 en 767px. Raakt de navigatiegrens uit C-01 **niet** |
| D19 | **`.vh-proof-kaart` heet resultaatkaart, bevat `.vh-proof-citaat`** — klassenamen en bedoelde semantiek spreken elkaar tegen; het commentaar zegt uitdrukkelijk dat het géén citaat is | home-proof.css:263-269 · index.html:842-847 | sectiemigratie van sectie 6 | de `.vh-*`-naam verdwijnt bij de landing op `.vibe-card--light`; wat rest is de naam van de section-specific wrapper, die **geen citaatsemantiek mag dragen** |
| D20 | **Leadpopup opent op sectie 2** — `data-screen-label` staat op een `<div>` i.p.v. een `<section>`; de selector valt door naar `main>section:first-of-type` | index.html:75, 300 · _leadpopup.js:265 | stap 7 (S2 gated guides), samen met de C-06-correctie | de oplossing moet een expliciete trigger zijn (eigen attribuut of echte sectiewortel), niet een langere selectorlijst. Nu geen productiecode wijzigen |
| D21 | **HVAC en EMS linken naar dezelfde pagina** — er is geen HVAC-pagina; bedoeld of wachtend op een ontbrekende pagina? | index.html:398, 417 | — | **Deels DECIDED (C-02):** `systeem-ems.html` wordt de VIBE.CONTROL-productpagina, dus de `--ems`-kaart houdt zijn bestemming. De **HVAC**-bestemming heropent uitsluitend zodra er een HVAC-pagina bestaat (gemeten: 48 HTML-bestanden, geen `systeem-hvac`) — **NO PAGE → NO LINK PROMISE** |
| D22 | **`aria-hidden` op de oplossingspijl** — 5× op de svg, 1× op de span (index.html:449-451); welke is de norm? | index.html:343-452 | stap 1, eerste implementatie van `.vibe-arrow` (P10) | de daar gekozen a11y-norm geldt voor alle zes; heropening alleen op een gemeten screenreaderafwijking |
| D24 | **Zwevende `</div>`** — `index.html:297`, met `<!-- trust bar -->` erboven (296) — restant van een verwijderde sectie. De parser negeert een sluittag zonder open element, dus de weergave klopt; de markup is niet valide | index.html:296-297 | sectiemigratie van sectie 2 | markupwijziging in `index.html`; de homepage blijft tot dat moment byte-for-byte, dus dit wordt niet eerder opgeruimd |

### 4.4 DECISION REQUIRED — werkelijk open (3)

Deze drie worden door geen van de besluiten C-01 t/m C-07 geraakt en volgen ook niet uit de bevroren architectuur.

| # | Onderwerp | Waarom onbeslisbaar | Bewijs | Wat het blokkeert |
|---|---|---|---|---|
| D13 | **Logoblauw `#0071FE` vs merkblauw `#0073FE`** | Twee eenheden verschil in het groene kanaal; in de header staan ze direct naast elkaar (logo vs CTA) | index.html:131-133, 1037-1039 vs home.css:35 | Een merkbesluit, geen tokenbesluit: het logoblauw zit in de SVG-markup van het merk zelf. De semantische kleurlaag kan zonder dit besluit worden gebouwd; het logo krijgt tot die tijd geen token |
| D14 | **Tokentelling 23 of 24** | Gemeten: **23** `--vibe-*`-definities in `home.css`. Auditbriefing en `kleur.json` noemen 24. De 24e is in deze sessie niet gevonden | `grep` op `home.css:35-70` | Niets in de primitivelaag: die bouwt een eigen semantische laag (§ 0.7) en erft de telling niet. Blijft open als bewijsconflict tussen twee bronnen |
| D15 | **Commentaar "23 losse box-shadows"** | Gemeten: 15 declaraties. Waar 23 vandaan komt is niet te herleiden | home.css:59 vs 15 gemeten declaraties | Idem D14: geen blokkade, wel een onopgeloste tegenspraak tussen commentaar en code die niet stilzwijgend mag worden "gecorrigeerd" |

### 4.5 CONTENT PENDING / PAGE PENDING (3)

Ontbrekende businessinformatie of ontbrekende pagina's. Niet invullen, niet verzinnen.

| # | Onderwerp | Gemeten in deze sessie | Status |
|---|---|---|---|
| D25 | **"Oplossingen" heeft geen bestemmingspagina** | Er bestaat **geen** `oplossingen.html` (48 HTML-bestanden geteld). Het Master-v1-menu-item wijst naar het interne anker `#oplossingen` (index.html:142); het legacy mega-menu ontsloot negen losse oplossingspagina's (`_header.js:23-31`) | **PAGE PENDING.** C-01 maakt "Oplossingen" een belangrijke navigatie-ingang, maar de bestemming bestaat niet. Geen mega-menu terugbouwen om dat te maskeren |
| D26 | **Automotive-sectorpagina ontbreekt; Logistiek en VvE hebben geen case** | C-05: Automotive heeft 2 VERIFIED cases (hedin-alkmaar, hedin-amsterdam) maar geen sectorpagina; `industrie-logistiek` en `industrie-vve` bestaan maar hebben 0 cases | **PAGE PENDING** (Automotive) en **CASE PROOF = PENDING** (Logistiek & transport, VvE). Component 27 krijgt pas een vijfde kaart als de pagina bestaat — **NO PAGE → NO LINK PROMISE** |
| D27 | **Vervangende in-page CTA voor de 26 `.mcta`-pagina's** | C-04 schrapt de sticky balk (`subpage.css:262-266`, plus eigen `<style>`-blokken in elf `project-*.html` en `projecten.html:328`). Markupvorm in de gemeten steekproef (`systeem-ems.html:246-249`): `div.mcta > a.p + a.g` — twee acties, hier `Netcongestie Check` + `Bel`. De 26 pagina's zijn niet één voor één op hun labels nagelopen | **CONTENT PENDING** per pagina: welke twee acties in de pagina worden opgenomen is een contentbesluit, geen stijlbesluit. De eis is meetbaar: op 390px bereikbaar zonder vaste balk |

### 4.6 Claimstatus onder de claim policy (2)

Deze twee blokkeren uitsluitend de migratie van de betreffende claim (§ 0.9, C-07).

| # | Claim | Vindplaats (gemeten) | Status | Actie |
|---|---|---|---|---|
| D28 | `VIBE ENERGY · 7 waardestromen · 0 jr wachttijd · −22% netinkoop` | `_leadpopup.js:116` | **UNVERIFIED** — bestaat in marketingcopy, onderbouwing ontbreekt | Bij migratiestap 7: VERIFIED maken met primaire bron, herschrijven, of verwijderen. **Nu geen productiecode wijzigen** |
| D29 | `Alle 11 gerealiseerde projecten` versus `11 projecten uitgelicht` | `projecten.html:191` versus index.html:222-293 (component 14, met de afwijzing van `11 opgeleverde projecten` op index.html:208-255) | **CONFLICTING** — twee pagina's in dezelfde repository dekken dezelfde telling met een andere claim, en de strengere is expliciet gemotiveerd | Migratie van deze claim is geblokkeerd tot opgelost. De SUPPORTED-formulering is die welke exact de telling dekt; `gerealiseerd` gaat verder dan elf gepubliceerde casepagina's bewijzen |

---

## 5 · Gemeten defecten in Master v1

Dit zijn geen ontwerpvragen maar gemeten afwijkingen. Ze staan hier omdat een bibliotheekmigratie ze anders meeneemt.

### 5.1 Dode focusring in het mobiele menu

`home-mobile.css:177` zet `.vh-mobielmenu nav a:focus-visible{ outline:2px solid #4DA3FF; outline-offset:4px }` **zonder** `!important`. `home.css:124-125` zet `outline` en `outline-offset` mét `!important`. Een `!important`-declaratie wint altijd van een niet-`!important`-declaratie, ongeacht specificiteit. `#4DA3FF` rendert dus nooit; de menu-links krijgen de merkblauwe ring op een donkere achtergrond.

### 5.2 `.vh-ctrl-cta` en `.vh-ctrl-feats` staan op mobiel buiten het paginaraster

**Gemeten** bij een viewport van 390px (chrome-headless-shell 1243, `getBoundingClientRect` op de echte pagina):

| Element | left | right | Gutter aangehouden? |
|---|---|---|---|
| `.vh-ctrl-eyebrow` | 21,05 | 368,95 | ja |
| `.vh-ctrl-kop2` | 21,05 | 368,95 | ja |
| `.vh-ctrl-dash` | 21,05 | 368,95 | ja |
| `.vh-ctrl-feats` | **42,09** | **347,91** | **nee** — 21px te ver naar binnen, beide zijden |
| `.vh-ctrl-cta` | **42,09** | **387,88** | **nee** — 18,93px **voorbij** de rechter gutterlijn, 2,12px van de schermrand |
| ter vergelijking `.vh-sol-cta` | 21,05 | 368,95 | ja |

**Twee samenlopende oorzaken.**

1. **Dubbele gutter.** `.vh-ctrl-copy` heeft op mobiel al `padding: 26px var(--m-gutter) 0` (home-control.css:301). `.vh-ctrl-feats` voegt daar `margin: 28px var(--m-gutter) 0` aan toe (home-control.css:347) en `.vh-ctrl-cta` `margin: 26px var(--m-gutter) 0` + `width: calc(100% - 2*var(--m-gutter))` (home-control.css:356-358). De gutter wordt dus twee keer toegepast.
2. **Ontbrekende `box-sizing`.** `.vh-ctrl-cta` is de **enige** van de acht mobiele CTA's met `box-sizing: content-box` (gemeten). Er is geen universele `box-sizing`-regel in het project (gemeten: 0 treffers op een `*`-selector in `home*.css` en `tokens.css`) en `home-control.css` declareert hem nergens. Daardoor telt `padding: 0 20px` bovenop de berekende breedte: 305,78 + 40 = 345,78px in een container van 347,9px, met 21,06px marge links.

`documentElement.scrollWidth` blijft 390 (= `clientWidth`), dus er ontstaat geen horizontale scrollbalk — `html,body{overflow-x:clip}` (home.css:85) vangt dat af. De misuitlijning zelf blijft zichtbaar.

**Consequentie voor de bibliotheek.** De gedeelde mobiele knopcomponent moet `box-sizing:border-box` in zijn basisdefinitie dragen, niet per instantie. Vijf van de acht huidige knoppen zetten het in hun desktopregel, drie in hun mobiele regel, één helemaal niet.

### 5.3 `order` zonder flexcontainer

`home-control.css:347` zet `order:3` op `.vh-ctrl-feats` en `home-control.css:355` `order:4` op `.vh-ctrl-cta`. Gemeten: hun ouder `.vh-ctrl-copy` heeft `display:block`, geen flex. Beide declaraties zijn dus no-ops; de volgorde klopt alleen doordat de bronvolgorde al goed is. De werkende ordertoewijzingen zijn `.vh-ctrl-devices{order:1}` en `.vh-ctrl-copy{order:2}` — die zijn wél flex-items van `.vh-ctrl` (gemeten: ouder `display:flex`).

---

### 5.4 `.vh-final-kaart-link` krijgt maatregels die nooit renderen

Binnen hetzelfde `@media (max-width: 1199px)`-blok (home-final.css:329-416) staat twee keer een regel voor dezelfde selector:

| Regel | Declaratie |
|---|---|
| home-final.css:339 | `.vh-final-kaart-link{ display: none }` |
| home-final.css:414 | `.vh-final-kaart-link{ font-size: 15.5px; margin-top: 16px; min-height: 44px; align-items: center }` |
| home-final.css:415 | `.vh-final-kaart-link svg{ width: 17px; height: 17px }` |

Regel 414-415 zet géén `display`, dus de `display:none` van regel 339 blijft staan. Het tabletblok (home-final.css:418-425) draait hem evenmin terug — het zet alleen `.vh-final-kaart{max-width:430px}`.

**Gemeten** bij een viewport van 900px: `getComputedStyle('.vh-final-kaart-link').display === "none"`, met `font-size: 15.5px`. De link is dus op **tablet én mobiel** verborgen; de maatregels op 414-415 zijn dode CSS.

Het auditbewijs (`componenten.json`, component 25) noteerde hier "TABLET: link zichtbaar met 15,5px". Dat is in deze sessie weerlegd en hierboven gecorrigeerd.

---

## 6 · Dode CSS en dode scriptblokken — niet in de bibliotheek opnemen

Deze klassen hebben een volledige specificatie maar **geen markup**. Er is geen bewijs hoe ze eruit horen te zien; wie ze wil terugbrengen moet de markup opnieuw ontwerpen, niet de CSS "reactiveren".

| Klasse / blok | Bestand:regel | Treffers in `index.html` |
|---|---|---|
| `.vh-zoek` + `svg` + `:hover` | home-hero.css:193-202 | 0 |
| `.vh-sol-stats` (+ `div`/`b`/`span`/`sub`) | home-solutions.css:252-286 · home-mobile.css:217 | 0 |
| `.vh-proof-quote` | home-proof.css:263-269, 446 | 0 |
| `.vh-infra-kpi-balk` (+ `-item`/`-ic`/`-tx`) | home-infra.css:282-328, 413-425, 433-435 | 0 |
| `.vh-infra-note` | home-infra.css:185-204 | 0 |
| `.vh-final-note` | home-final.css:106-125 | 0 |
| `.vh-footer-wig-ongebruikt` | home-footer.css:373-377 | 0 |
| `.vh-m-eyebrow` | home-mobile.css:227-234 | 0 |

En één geval van CSS mét markup die tóch nooit rendert: `.vh-final-kaart-link` op 15,5px/`min-height:44px`/svg 17px (home-final.css:414-415), verborgen door home-final.css:339 — zie § 5.4.

**Let op:** `home-mobile.css:219` verbergt `.vh-infra-note, .vh-final-note` expliciet op mobiel — alsof ze bestaan. Die regel is óók dood.

**Dode scriptblokken** (alle drie `if(!x) return;`, dus onschadelijk maar dood): `initNav()` zoekt `#topnav` (index.html:1179-1196) · `ems()` zoekt `#emsConsole` (index.html:1199-1224 — een volledige duplicaat van het werkende blok op 751-783) · `faq()` zoekt `#faqList` (index.html:1227-1240).

---

## 7 · Verificatielog van deze sessie

Wat in deze sessie zelf is teruggelezen of gemeten, zodat elke lezer weet waar de zekerheid ophoudt.

| Gecontroleerd | Methode | Uitkomst |
|---|---|---|
| Commit-SHA en werkboom | `git log -1` | `aae26bf…` — *feat: lock homepage master v1* |
| Aantal `--vibe-*`-definities | `grep` op `home.css` | **23** (briefing zegt 24 → D14) |
| `var(--vibe-*)`-gebruik | `grep` + telling over `home*.css` | 11 tokens gebruikt, 12 dood |
| 15 CTA-klassen + markuptreffers | `grep` per klasse | alle 15 bevestigd; 1 instantie elk, behalve `.vh-btn` (3) en `.vh-btn-primair` (2) |
| Knopmaten in px | omrekening `cqw × 17,74` | 7 hoogtes, 4 radii, 4 tekstgraden (§ 1.2) |
| Alle `@media` in `home*.css` | `grep '@media'` | 12 × 1199 · 11 × 768-1199 · 768-859 · 1000-1199 · 1024-1199 · 3 × reduced-motion · 1 × hover:none |
| `clip-path` per bestand | `grep -c` | 8 van 9 secties; `home-project.css` = 0 |
| `box-shadow`-declaraties | `grep` zonder `transition` | **15** (commentaar zegt 23 → D15) |
| `tokens.css`-UNIFY-selectors op de homepage | klassentokens uit `index.html` geparseerd | 229 unieke klassen, **0** treffers |
| Skiplink, header, mobiel menu, menuknop | Read van markup + CSS | alle waarden bevestigd op de genoemde regels |
| Calendly-afvang | Read `_footer.js:112-170` + `index.html:1131-1174` | bevestigd, inclusief de uitzondering op r. 118 |
| Gedrag van `stopPropagation` in capture | chrome-headless-shell 1243, 12 listeners | zie 32.4 — document- en window-capture blijven bereikbaar |
| Mobiele geometrie sectie 5 | chrome-headless-shell 1243, `getBoundingClientRect` op 390px | § 5.2 — `.vh-ctrl-cta` 18,93px voorbij de gutter |
| `order` zonder flexcontainer | idem, `getComputedStyle(parent).display` | § 5.3 — `.vh-ctrl-copy` = `block` |
| `.vh-final-kaart-link` op tablet | chrome-headless-shell 1243, `getComputedStyle` op 900px | § 5.4 — `display: none`; bewijs weerlegd en gecorrigeerd |
| Zichtbaarheid van de 5 Calendly-aanhaakpunten | idem, 390px en 900px | tabel in 32.3 |
| Cookie-listener fase | Read `_consent.js:155-158` | bubble, geen capture |
| Zwevende `</div>` | Read `index.html:296-297` | bevestigd |

### 7.1 Aanvullend geverifieerd bij het vastleggen van § 0 (doelarchitectuur)

Deze metingen zijn gedaan om de besluiten C-01 t/m C-07 met bestand:regel te kunnen vastleggen. Alleen lezen; geen productiebestand is gewijzigd.

| Gecontroleerd | Methode | Uitkomst |
|---|---|---|
| Commit-SHA | `git log -1` | `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1` — *feat: lock homepage master v1*; ongewijzigd |
| PDF's in de repository | `find . -name '*.pdf'` buiten `.git` | **nul treffers** |
| Map `assets/brochures/` | `ls assets/brochures` | **bestaat niet** |
| Dood brochurepad | `grep -rn 'assets/brochures'` | **één** treffer: `_leadpopup.js:9`, in het voorbeeldconfigblok van het bestandscommentaar (`_leadpopup.js:1-19`) — **niet** als runtime-default. **Afwijking van de briefing**, die `_leadpopup.js:26` noemt; regel 26 is gemeten `var LEAD_ENDPOINT = …`. Conclusie ongewijzigd: het pad is dood |
| Runtime-default voor `file` | Read `_leadpopup.js:29-33` | `var file = cfg.file || '';` (r. 32) en `if(!file){ return; }` (r. 33) — leeg, dus geen download zonder expliciete config |
| Leadconfigs met `file` | `grep -rn 'window.VIBE_LEAD *='` over `*.html` | **vijf**, alle vijf naar een HTML-pagina: index.html:1242 · oplossing-exploitatie.html:295 · oplossing-energielabel.html:857 · oplossing-laadplein.html:269 · oplossing-netcongestie.html:299 |
| Popup-copy | Read `_leadpopup.js:112-118` | `Gratis brochure` (r. 113) · "in één document, direct beschikbaar" (r. 115) · de claimregel op **r. 116** — bevestigd, briefing correct op dit punt |
| Executive Guides op `report.css` | `grep -ln 'report.css' *.html` | **zeven**: capaciteit-als-dienst, energie-als-vastgoedopbrengst, energiehandel-flexmarkten, exploitatie-zonder-investering, energielabel-verhogen, laadplein-zonder-verzwaring, netcongestie-oplossen |
| Guides in `sitemap.xml` | `grep -n` per slug | **drie**: regels 16, 118, 124 (energie-als-vastgoedopbrengst, capaciteit-als-dienst, energiehandel-flexmarkten); vier ontbreken |
| `.mcta` — aantal pagina's | `grep -l 'mcta' *.html \| wc -l` | **26** |
| `.mcta` — CSS-vindplaatsen | `grep -ln '\.mcta' *.css *.html` | `subpage.css` plus eigen `<style>`-blokken in elf `project-*.html` en `projecten.html` |
| `.mcta` — specificatie | Read `subpage.css:262-266, 379-381` | `position:fixed`, `z-index:90`, `display:flex` onder `max-width:760px`, `body{padding-bottom:74px}`; lichte variant op 379-381 |
| Breekpunt 760px in de repo | `grep -rn 'max-width:760px'` over css/html/js | **17** treffers — de legacy-subpaginagrens, niet exclusief van `.mcta` (bijv. `subpage.css:60, 119, 133, 266`) |
| `.mcta` — markupvorm | Read `systeem-ems.html:246-249` | `div.mcta > a.p` + `a.g` — twee acties |
| Legacy mega-menu — omvang | Read `_header.js:22-47` | drie kolommen, **19** bestemmingen: Oplossingen 9 · Industrieën 5 · Systeem 5 |
| Legacy header — breekpunten | `grep -n 'max-width'` op `_header.js` | **1024px** (r. 113, 210: burger aan / navlinks uit) · **1180px** (r. 209: secundaire CTA uit) · **1040px** (r. 69, 89: mega-menu-kolommen). Alle drie wijken af van de 1199px van Master v1 (§ 2.1) |
| Bestaan van `oplossingen.html` | `ls *.html` | **bestaat niet**; 48 HTML-bestanden geteld. Master-v1-nav wijst naar het anker `#oplossingen` (index.html:142) |
| Sectorpagina's | `ls industrie-*.html` | vijf: logistiek, recreatie, residentieel, vastgoed, vve. **Geen** automotive-pagina |
| Sectorfilters op `projecten.html` | Read `projecten.html:183-190` | vijf chips; de eerste is `Netcongestie & Energy Hubs` (r. 185) — geen sector |
| Projecttelling op `projecten.html` | Read `projecten.html:191` | `Alle 11 gerealiseerde projecten` — **CONFLICTING** met component 14 (D29) |
| CSS-bestanden in de repo | `ls *.css \| wc -l` | **17**; er bestaat nog geen primitivebestand, dat wordt nieuw aangemaakt (§ 0.10, stap 1) |
| HTML-bestanden in de repo | `ls *.html \| wc -l` | **48** (inclusief `_header.html`, `404.html` en drie popup-designpagina's) |

**Niet gecontroleerd in deze sessie:** de exacte cqw-waarden van componenten 18, 22, 24, 25 en 30 zijn per steekproef geverifieerd (paneelmaten, stripmaten, footerwig, `.vh-footer ~ footer.ftr.v1a`), niet declaratie voor declaratie. Alle overige waarden komen uit het auditbewijs dat op ruim twintig punten is gecontroleerd en op drie punten afweek: de tokentelling (D14), de werking van `stopPropagation` (32.4) en de tabletzichtbaarheid van `.vh-final-kaart-link` (§ 5.4). Alle drie zijn gecorrigeerd in plaats van overgenomen.
