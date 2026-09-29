# Vibe Website — Legacy-inconsistentieregister v1

**Dit document is uitsluitend registratie. In deze ronde is NIETS gecorrigeerd.** Er is geen
HTML, CSS, JS of asset gewijzigd; de homepage is bevroren op commit
`aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1` ("feat: lock homepage master v1"). Elke regel hieronder
beschrijft een gemeten afwijking en de voorgestelde migratieactie — de actie is *voorgesteld*, niet
*uitgevoerd*.

**Bijwerking 2026-09-29 — besluitenronde V1.0.** Deze versie verwerkt de vastgestelde besluiten
`C-01` t/m `C-07` (navigatiemodel, VIBE.CONTROL/EMS, Executive Guides, sticky mobiele CTA,
sectortaxonomie, brochure-/guidelevering, onbewezen cijfers) plus de bevroren architectuurlagen
(archetypes, primitives, tokens, claimpolicy, migratievolgorde). Elke `DECISION REQUIRED` die
daardoor beantwoord wordt, staat nu als **DECIDED — V1.0** met het besluit en de motivering; de
`MIGRATION ACTION` is daar concreet gemaakt. Wat door `C-01` t/m `C-07` níét wordt geraakt, blijft
als `DECISION REQUIRED` staan. **Ook in deze ronde is geen productiecode gewijzigd** — geen HTML,
CSS, JS, asset, `sitemap.xml` of `robots.txt`. Er zijn twee items toegevoegd (`L-43`, `L-44`) die in
deze sessie op regelniveau zijn gemeten.

- **Bron**: `/Users/mounirvanbinsbergen/projects/vibe-website`
- **Referentie (Master v1)**: `index.html` + `home.css` + `home-{hero,solutions,project,process,proof,control,infra,final,footer,mobile}.css`
- **Peilmoment**: HEAD = `aae26bf`, werkboom schoon voor de gemeten bestanden
- **Omvang site**: 48 `*.html` in de webroot (waarvan `_header.html` een fragment is, geen pagina)

---

## 1. Samenvatting per risiconiveau

| Risico | Aantal | Aandeel | Geverifieerd | Met meetafwijking t.o.v. bewijsbestand | Niet-verifieerbaar deel |
|---|---:|---:|---:|---:|---:|
| Hoog | 17 | 38,6 % | 17 | 2 | 1 |
| Middel | 20 | 45,5 % | 20 | 6 | 1 |
| Laag | 7 | 15,9 % | 7 | 1 | 1 |
| **Totaal** | **44** | **100 %** | **44** | **9** | **3** |

**Niets staat op NIET GEVERIFIEERD.** Alle 44 items zijn in de bronbestanden teruggevonden en op
regelniveau bevestigd: de oorspronkelijke 42 in de eerste ronde, `L-43` en `L-44` in de
besluitenronde van 2026-09-29. Bij negen van de oorspronkelijke items week een getal in het
bewijsbestand af van wat ik meet; daar staat de gemeten waarde in het register en is de afwijking
expliciet gemarkeerd met **AFWIJKING**. Drie items bevatten een deelclaim die van binnen deze
repository principieel niet meetbaar is (live-servergedrag `L-14`, externe brochure-API `L-20` en
`L-37`); die deelclaims staan als **NIET VERIFIEERBAAR VANUIT REPO** bij het betreffende item,
terwijl het item zelf wel bevestigd is.

> **AFWIJKING in dit register zelf.** De vorige versie van deze tabel zette de kolom
> "Niet-verifieerbaar deel" op 4 (Hoog 1, Middel 2, Laag 1). Een telling van de markering
> `NIET VERIFIEERBAAR VANUIT REPO` over het hele document levert **drie** treffers in items:
> `L-14` (Hoog), `L-20` (Middel) en `L-37` (Laag). De vierde is nergens in het register terug te
> vinden; de kolom staat daarom nu op 3. De niet-gemeten productiezaken die géén item-deelclaim
> zijn, staan ongewijzigd in §7.
>
> `L-43` en `L-44` zijn geen onderdeel van de kolom "meetafwijking t.o.v. bewijsbestand": ze stonden
> niet in `legacy.json`. Bij `L-44` wijkt de gemeten regel wél af van de opdrachtformulering — die
> noemt `_leadpopup.js:26`; het dode brochurepad staat op `_leadpopup.js:9`, in het
> documentatiecommentaar `:1-19`. Regel `:26` is `LEAD_ENDPOINT`. Zie `L-44`.

### Verdeling per categorie

| Categorie | Hoog | Middel | Laag | Totaal |
|---|---:|---:|---:|---:|
| Onderbouwing van cijfers en claims | 6 | 1 | 1 | 8 |
| Designsysteem (kleur, letter, vormtaal, tokens, breekpunten) | 3 | 6 | 0 | 9 |
| Gedeelde componenten (header, footer, overlays) | 3 | 1 | 1 | 5 |
| Functioneel defect / kapotte bestemming | 2 | 2 | 0 | 4 |
| Paginastructuur en toegankelijkheid | 2 | 3 | 0 | 5 |
| Aanspreekvorm en taal | 1 | 0 | 2 | 3 |
| Publicatiehygiëne (sitemap, weesbestanden, prototypes) | 0 | 4 | 2 | 6 |
| Naamgeving en labels | 0 | 3 | 1 | 4 |

Gewijzigd t.o.v. de vorige versie: `L-43` telt mee onder *Onderbouwing van cijfers en claims* (Hoog,
5 → 6), `L-44` onder *Functioneel defect / kapotte bestemming* (Middel, 1 → 2). Totaal 42 → 44.

### DECIDED — V1.0 · merk- en scopebeslissingen die nu vastliggen

De vorige versie telde tien openstaande merk- of scopebeslissingen (de kop zei "negen", de tabel gaf
er tien — hierbij gecorrigeerd). Daarvan zijn er in de besluitenronde van 2026-09-29 **zeven
genomen** (`L-09`, `L-15`, `L-17`, `L-20`, `L-21`, `L-37`, `L-42`), is er **één uitgesteld met een
exacte voorwaarde** (`L-06`, naar de `B7`-master) en blijven er **twee open** (`L-14`, `L-40`).
Daar komen zeven items bij die niet in die lijst stonden maar wél door `C-05` en `C-07` worden
beslist: `L-35` (`C-05`), de projecten.html-cijfers `L-01` t/m `L-05` en het nieuwe `L-43` (`C-07`).
In totaal liggen daarmee **veertien items** vast. Elk besluit is per item herhaald in het veld
`MIGRATION ACTION`.

| # | Besluit | Bron | Kern |
|---|---|---|---|
| L-09 | Navigatiemodel = platte Master-v1-header; legacy mega-menu verdwijnt | `C-01` | Geen mega-menu terugbouwen; "Oplossingen" wordt de navigatie-ingang, systemen/producten via overzichtspagina's; 1199px blijft de primaire responsive navigatiegrens |
| L-42 | VIBE.CONTROL is de commerciële productnaam, EMS blijft de functionele categorie | `C-02` | `systeem-ems.html` wordt de VIBE.CONTROL-productpagina met voldoende EMS-context; EMS-SEO mag niet verloren gaan |
| L-15 | De zeven Executive Guides zijn **gated** assets (lead magnets), geen publiek pagina-archetype | `C-03` | Archetype `S2`; uit de publieke sitemap waar van toepassing; ontsluiten via de leadflow; delivery moet aantoonbaar werken |
| L-21 | **Geen** sticky mobiele CTA in Design System V1.0 | `C-04` | Legacy `.mcta` (26 pagina's) verdwijnt bij migratie; CTA's worden in de pagina geïntegreerd. Niet dogmatisch verboden: mag later als losse CRO-test terugkomen |
| L-35 | Nieuwe canonieke sectortaxonomie: 5 sectoren + 1 segment | `C-05` | Zie de tabel bij `L-35`. "Netcongestie & Energy Hubs" verhuist van de sector-as naar de oplossing-as |
| L-17 | Routering naar een zakelijke centrale bestemming, niet naar een persoonlijk e-mailadres | `C-06` | `mounir@vibeenergy.nl` op de zeven guides vervalt |
| L-20 | Brochure-/guidelevering: `A` waar het asset bestaat, anders `B` | `C-06` | Harde regel **NO ASSET → NO DOWNLOAD PROMISE**; er bestaat 0 PDF in de repo, dus geleverd wordt een guidepagina en de copy mag geen PDF-download beloven |
| L-37 | Idem — de spelfout `zodner` hoort bij een PDF die niet bestaat | `C-06` | Correctie hoort bij het moment waarop een echt asset geleverd wordt, niet eerder |
| L-01 – L-05 | 47 projecten / 12 MWp / 98% uptime zijn **UNVERIFIED**, niet VERIFIED | `C-07` | `PUBLICLY EXISTING != VERIFIED`; uitsluitend reproduceerbare formuleringen ("11 projecten uitgelicht"), niet "Vibe heeft slechts 11 projecten gerealiseerd" |
| L-43 | De drie leadpopup-cijfers vallen onder dezelfde `C-07`-policy | `C-07` | VERIFIED maken met primaire bron, herschrijven of verwijderen — bij de betreffende migratie, niet nu |

### DEFERRED TO PAGE MIGRATION

| # | Vraag | Waar het besluit valt | Heropeningsvoorwaarde |
|---|---|---|---|
| L-06 | Blijven `algemene-voorwaarden.html` en `privacy.html` in u-vorm? | Bij de bouw van de **B7-master `privacy.html`** — stap 6 in de migratievolgorde | Het besluit wordt genomen zodra de B7-master wordt gebouwd; tot dat moment wordt de u-vorm in die twee bestanden niet aangeraakt. Herzien zodra een jurist of de merkeigenaar een registervoorschrift aanlevert |

### DECISION REQUIRED — nog echt open

Twee punten worden niet door `C-01` t/m `C-07` geraakt en blijven open.

| # | Beslissing | Waarom de code het antwoord niet geeft |
|---|---|---|
| L-14 | Werken `.html`-links op de productieserver? | `railpack.json` zet alleen `provider:"staticfile"`; niet meetbaar vanuit repo |
| L-40 | Is `&amp;` verplicht in tekstknopen, inclusief `<title>`? | Master v1 is hier zelf niet strikt (`index.html:16` draagt een rauwe `&`) |

---

## 2. Verificatiemethode

Elk item is in deze sessie opnieuw gemeten in de bronbestanden, niet overgenomen uit het
bewijsbestand. Gebruikte metingen:

| Meting | Methode |
|---|---|
| Aanspreekvorm | Python: commentaar, `<script>` en `<style>` verwijderd, tags gestript, daarna `\b(je\|jouw\|jou)\b` en `\b(u\|uw)\b` geteld over alle 48 `*.html` |
| Kapotte bestemmingen | Python: alle `href="…"` uit alle 48 pagina's, protocol-URI's en fragmenten uitgefilterd, rest getoetst tegen het bestandssysteem (met en zonder `.html`) |
| Ingebed contactdocument | `__bundler/template`-JSON uitgepakt en apart geauditeerd op links, fonts en aanspreekvorm |
| Ongerefereerde assets | Python: alle `*.html`, `*.css`, `*.js`, `*.json`, `*.xml` in webroot en in `assets/`, `img/`, `api/`, `scripts/`, `review/` samengevoegd; elke media-/fontnaam in de webroot daartegen getoetst; zelfreferentie in het bestand zelf uitgesloten |
| Duplicaten | `md5` over de verdachte `.mp4`-bestanden |
| Tokens, breekpunten, klassen | `grep -n` / `grep -o` met tellingen per bestand |

Alle regelnummers in dit register zijn in deze sessie afgelezen.

### Onafhankelijk bevestigde systeemfeiten

Deze feiten vormen de meetlat waaraan de legacy-lagen hieronder worden afgezet.

| Feit | Gemeten waarde | Meetpunt |
|---|---|---|
| Hoofdbreekpunt | `max-width:1199px` | `home-mobile.css:67, 213, 226`; `index.html:1171` `matchMedia('(min-width:1200px)')` |
| Tabletlaag | `(min-width:768px) and (max-width:1199px)` | `home-mobile.css:34, 197` |
| Overige mediaquery's | `(hover:none)`, `prefers-reduced-motion` | `home-mobile.css:236, 241` |
| Merktokens | 23 unieke `--vibe-*`-definities, alle in `home.css` | `home.css:35-71` — **AFWIJKING**: de opdracht noemt 24; ik tel er 23 (`--vibe-blauw`, `-blauw-diep`, `-blauw-licht`, `-blauw-tint`, `-body`, `-body-zacht`, `-canvas`, `-dur`, `-ease`, `-elev-1`, `-elev-2`, `-elev-mob`, `-focus`, `-lijn`, `-navy`, `-navy-diep`, `-op-donker`, `-paper`, `-radius-kaart`, `-radius-mob`, `-radius-rond`, `-sub`, `-wit`) |
| Merkblauw | `#0073FE` | `home.css:35` |
| Navy | `#08203C` | `home.css:41` |
| Elevatie | 3 niveaus: `--vibe-elev-1` / `-2` / `-mob` | `home.css:60, 62, 64` |
| Geometrie | `clip-path` in 8 van 9 sectiebestanden; `home-project.css` = 0 | hero 5, final 5, proof 3, infra 2, footer 2, solutions 1, process 1, control 1 |
| Componentbibliotheek | **bestaat niet**: 15 CTA-klassen, waarvan alleen `.vh-btn*` gedeeld | zie §3 |

### Structureel feit dat het hele register conditioneert

**Er is geen gedeelde componentbibliotheek.** De homepage is visueel consistent, maar die
consistentie is met de hand per sectie opnieuw gemaakt, niet uit een primitief afgeleid. Gemeten in
`index.html` + `home*.css`:

| CTA-klasse | Gebruik in `index.html` | Gedefinieerd in |
|---|---:|---|
| `.vh-btn` | 3 | `home-hero.css` |
| `.vh-btn-primair` | 2 | `home-hero.css` |
| `.vh-btn-secundair` | 1 | `home-hero.css` |
| `.vh-cta` | 1 | `home-hero.css` |
| `.vh-sol-cta` | 1 | `home-solutions.css` |
| `.vh-pr-cta` | 1 | `home-project.css` |
| `.vh-pr-knop` | 1 | `home-project.css` |
| `.vh-ctrl-cta` | 1 | `home-control.css` |
| `.vh-proof-cta` | 1 | `home-proof.css` |
| `.vh-proof-strip-cta` | 1 | `home-proof.css` |
| `.vh-infra-cta` | 1 | `home-infra.css` |
| `.vh-infra-cta2` | 1 | `home-infra.css` |
| `.vh-final-cta` | 1 | `home-final.css` |
| `.vh-final-cta2` | 1 | `home-final.css` |
| `.vh-footer-nb-cta` | 1 | `home-footer.css` |

Alleen `.vh-btn`, `.vh-btn-primair` en `.vh-btn-secundair` zijn een echt gedeeld primitief (drie
gebruiken, één definitiebestand). De overige twaalf zijn eenmalige, sectie-eigen knoppen. Hetzelfde
patroon geldt voor eyebrows, koppen en leads: elke sectie herdefinieert ze. **Gevolg voor migratie:
"migreer pagina X naar het `.vh-*`-systeem" is op dit moment geen uitvoerbare instructie** — er is
geen bibliotheek om naar toe te migreren. Voor elk item hieronder dat een `.vh-*`-doelcomponent
noemt geldt dat dat component eerst uit `index.html` geëxtraheerd moet worden.

**Bijwerking V1.0 — de doelbibliotheek ligt nu vast.** De meting hierboven blijft staan: de
bibliotheek *bestaat* nog steeds niet in de code. Wat wél is opgelost, is dat het doel niet langer
onbepaald is. De bevroren primitieveset is: `.vibe-container` · `.vibe-section` · `.vibe-eyebrow` ·
`.vibe-heading` + `--*` · `.vibe-lead` · `.vibe-btn` + `--primary` `--secondary` `--ghost` `--text` ·
`.vibe-card` + `--light` `--dark` `--media` · `.vibe-icon` · `.vibe-icon-tile` · `.vibe-arrow` ·
`.vibe-metric` · `.vibe-media`. Extra primitives alleen wanneer aantoonbaar nodig. De harde regel is
**REPEATED VISUAL LANGUAGE → primitive/component; UNIQUE COMPOSITION → section-specific
implementation**; expliciet **niet** te abstraheren zijn de homepage hero-stage, de
VIBE.CONTROL-dashboardcompositie, de Hedin featured-projectcompositie, de homepage process timeline
en de final-CTA diagonal composition — tenzij later werkelijk hergebruik ontstaat. De vijftien
`.vh-*`-CTA-klassen hierboven zijn daarmee te herleiden tot één primitive (`.vibe-btn` met vier
varianten); de twaalf eenmalige knoppen verliezen hun eigen klasse. Tokenrichting is
`PRIMITIVE → SEMANTIC`, met componenttokens alleen waar een component een eigen semantische waarde
nodig heeft (`--vibe-blue-500 → --color-action-primary → --btn-primary-bg`). Responsive typografie:
`clamp()` als default, `cqw` uitsluitend voor bewust canvas-proportionele composities —
**Master v1 wordt hiervoor NU NIET gerefactord** (zie `L-33`, waar `home-hero.css:207-235` nog in
`cqw` rekent).

De migratievolgorde is eveneens vastgesteld: `DESIGN SYSTEM V1.0 FREEZE → MASTER PAGE PER BOUWTYPE →
VISUAL + FUNCTIONAL REVIEW → MASTER LOCK → OVERIGE PAGINA'S VAN DAT TYPE → QA → VOLGENDE`, met als
masters (1) `B2` `systeem-energieopslag.html`, (2) `B3` `project-ratio-16.html`, (3) `B4`
`projecten.html`, (4) `B6` `contact.html`, (5) `B5` `waarom-vibe.html`, (6) `B7` `privacy.html`,
(7) `S2` gated guides. `B1` is al Master v1 en wordt **niet** opnieuw gebouwd. Elk item hieronder dat
een migratieactie noemt, hangt aan de master van zijn bouwtype.

---

## 3. Register — HOOG (17)

### L-01 · Cijfer "47 opgeleverde projecten" zonder primaire onderbouwing

| Veld | Inhoud |
|---|---|
| **LOCATION** | `projecten.html:173` |
| **CURRENT STATE** | `<div class="st"><div class="v">47</div><div class="l">Opgeleverde projecten</div></div>`. Grep op `\b47\b` over alle 48 `*.html` levert precies vier treffers: `projecten.html:173` plus `index.html:209`, `:210` en `:251` — alle drie commentaarregels die het cijfer juist afwijzen. Er bestaan 11 bestanden `project-*.html`. Geen bestand in de repository telt naar 47 toe. |
| **MASTER V1 RULE** | `index.html:251-253`: "NIET GEBRUIKT: 47 opgeleverde projecten / 12 MWp zon / 98% uptime - die staan alleen op projecten.html zelf, zonder primaire onderbouwing in deze codebase; een pagina die een cijfer herhaalt is geen bron." De bewijsstrook toont in plaats daarvan "11 projecten uitgelicht" (`index.html:265`). **DECIDED — V1.0 (`C-07`)**: claimstatus = **UNVERIFIED**. De claimpolicy kent exact vijf statussen (VERIFIED / SUPPORTED / UNVERIFIED / CONFLICTING / REMOVE-REWRITE REQUIRED) met de harde regel `PUBLICLY EXISTING != VERIFIED` — dat het cijfer gepubliceerd is, maakt het geen bron. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: niet migreren. Vervang door een **SUPPORTED**-formulering die exact dekt wat de repository bewijst — "11 projecten uitgelicht" of "11 gepubliceerde projectcases" naar het model van `index.html:265`; expliciet **niet** "Vibe heeft slechts 11 projecten gerealiseerd", want elf openbare cases bewijzen geen totaal. Herinvoeren van 47 alleen na aanlevering van een primaire bron buiten deze repository; dan opnieuw beoordelen. Uitvoeren bij de `B4`-master `projecten.html` (stap 3). |
| **RISK** | Hoog |

### L-02 · Cijfer "12 MWp zon geïnstalleerd" is nergens uit op te tellen en wordt tegengesproken

| Veld | Inhoud |
|---|---|
| **LOCATION** | `projecten.html:174` |
| **CURRENT STATE** | `<div class="v">12 <em>MWp</em></div><div class="l">Zon geïnstalleerd</div>`. Grep op `MWp` over alle `*.html` (buiten `contact.html`) levert: `projecten.html:174`; `oplossing-exploitatie.html:235` met "24 MWp PV portefeuillebreed … Over 14 daken"; `systeem-zonnepanelen.html:26, 31, 33, 197` met "van 100 kWp tot 5 MWp" als leveringsbereik; en de vier afwijzende commentaren in `index.html:209, 210, 214, 251`. Geen enkele `project-*.html` noemt zonnecapaciteit in kWp of MWp — de elf casepagina's noemen alleen aantallen panelen. Eén anonieme case claimt 24 MWp, twee keer het bedrijfsbrede totaal. |
| **MASTER V1 RULE** | `index.html:213-214`: "Geen enkele projectpagina noemt zonnecapaciteit in kWp, dus 12 MWp is nergens uit op te tellen." Master v1 gebruikt op die plek de gedekte productspecificatie "Zon, opslag, laden en sturing / Van ontwerp tot beheer" (`index.html:277`). **DECIDED — V1.0 (`C-07`)**: claimstatus = **CONFLICTING** — twee bronnen noemen verschillende waarden (12 MWp op `projecten.html:174`, 24 MWp op `oplossing-exploitatie.html:235`). Migratie van deze claim is daarmee **geblokkeerd tot opgelost**, niet ter beoordeling van de migrerende pagina. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: verwijderen; niet meenemen naar de `B4`-master (stap 3). De blokkade heft pas op wanneer per project de kWp als primaire specificatie is vastgelegd op de elf `project-*.html` en de som reproduceerbaar is — dan wordt de claim **SUPPORTED** in een formulering die exact die telling dekt. De 24-vs-12-MWp-tegenspraak met `oplossing-exploitatie.html:235` moet in dezelfde beweging worden opgelost; zolang die staat, blijft de status CONFLICTING. Zonder kWp-gegevens: **CONTENT PENDING**. |
| **RISK** | Hoog |

### L-03 · Cijfer "98% gemiddelde uptime" meet een andere grootheid dan het enige onderbouwde cijfer

| Veld | Inhoud |
|---|---|
| **LOCATION** | `projecten.html:175` |
| **CURRENT STATE** | `<div class="v">98<em>%</em></div><div class="l">Gemiddelde uptime</div>`. Grep op `98%` levert alleen `projecten.html:175` plus `index.html:210` en `:251`. Het enige andere beschikbaarheidscijfer op de site is 99,5% op `systeem-laadpalen.html:79, 150, 201` — op `:150` expliciet "Contractueel via SLA — monitoring, onderhoud en storingsafhandeling door Vibe", met scope-label `uptime · jaarbasis`. Bij de 98% staat geen meetbron, geen meetperiode en geen scope. |
| **MASTER V1 RULE** | `index.html:215-216`: "het enige onderbouwde beschikbaarheidscijfer op de site is de contractuele 99,5% SLA voor laadpalen - een andere grootheid dan een gemeten 98%." Master v1 voert geen uptimecijfer. **DECIDED — V1.0 (`C-07`)**: 98% = **UNVERIFIED** (geen meetbron, geen meetperiode, geen scope); de contractuele 99,5% op `systeem-laadpalen.html:150` = **VERIFIED**, maar uitsluitend binnen de scope van die bron — laadpalen, jaarbasis, contractueel. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: de 98% niet migreren. Een beschikbaarheidsclaim mag alleen de contractuele 99,5% voeren, mét scope (laadpalen) én het woord "contractueel", exact zoals `systeem-laadpalen.html:150` dat al formuleert — publiceren buiten die scope is `REMOVE/REWRITE REQUIRED`, want ruimer dan de bron. Uitvoeren bij de `B4`-master `projecten.html` (stap 3). |
| **RISK** | Hoog |

### L-04 · `projecten.html` spreekt zichzelf tegen: 47 in de hero, 11 in de teller eronder

| Veld | Inhoud |
|---|---|
| **LOCATION** | `projecten.html:173` tegenover `:191` en `:322` |
| **CURRENT STATE** | `:173` claimt "47 Opgeleverde projecten"; `:191` toont `<span class="pj-count" id="count">Alle 11 gerealiseerde projecten</span>`; `:322` laat het filterscript die tekst bij een klik vervangen door `count.textContent=(f==='all'?'Uitgelicht · ':f+' · ')+n+' project'+(n===1?'':'en')`. Het raster bevat 11 kaarten (`:195-287`). 47 en 11 staan gelijktijdig zichtbaar boven elkaar. |
| **MASTER V1 RULE** | `index.html:254-255`: "Ook niet gebruikt: '11 opgeleverde projecten' - het tellen van elf openbare cases bewijst geen totaal aantal opgeleverde projecten." Master v1 formuleert daarom "11 projecten uitgelicht" (`index.html:265`): het aantal slaat op de getoonde cases. **DECIDED — V1.0 (`C-07`)**: 47 = UNVERIFIED, 11 = **SUPPORTED** maar uitsluitend in een formulering die exact de telling dekt. "Alle 11 gerealiseerde projecten" (`:191`) is daarmee óók fout: het zegt *alle*, wat de elf casebestanden niet bewijzen. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: één telling, en die telling is het aantal **gepubliceerde projectcases**. Toegestane formuleringen: "11 projecten uitgelicht" / "11 gepubliceerde projectcases". Verboden: "47 opgeleverde projecten" (UNVERIFIED) en "alle 11 gerealiseerde projecten" / "Vibe heeft slechts 11 projecten gerealiseerd" (ruimer dan de bron). Het filterscript op `:322` formuleert al correct met "Uitgelicht · "; de hero (`:173`) en de begintekst (`:191`) sluiten daarop aan. Uitvoeren bij de `B4`-master `projecten.html` (stap 3). |
| **RISK** | Hoog |

### L-05 · "het afgelopen jaar" is aantoonbaar onjuist: 10 van de 11 cases zijn ouder dan een jaar

| Veld | Inhoud |
|---|---|
| **LOCATION** | `projecten.html:171` |
| **CURRENT STATE** | "Een selectie van wat we het afgelopen jaar opleverden — van laadpleinen tot batterijopslag. De cijfers zijn gerealiseerd, niet beloofd." Gemeten opleverdata uit het veld `Opgeleverd` op de elf casepagina's: **Juli 2023** (`project-purmerend.html:58`), **December 2023** (`project-schouwburgring.html:58`), **Juni 2024** (`project-nieuw-schoonoord.html:58`, `project-van-beethovenstraat.html:58`), **Juli 2024** (`project-ratio-16.html:62`), **Oktober 2024** (`project-dormio-medemblik.html:62`, `project-burchtstraat.html:58`), **December 2024** (`project-arnhem-60.html:58`, `project-ketsheuvel.html:58`), **Mei 2025** (`project-hedin-alkmaar.html:62`), **Maart 2026** (`project-hedin-amsterdam.html:62`). Spreiding 33 maanden; op peilmoment 2026-09-29 valt alleen Maart 2026 binnen twaalf maanden. |
| **MASTER V1 RULE** | Master v1 doet nergens een tijdsuitspraak over de projectenverzameling. `index.html:227-234` beschrijft de elf cases uitsluitend naar aantal en sectorbereik ("11 projecten uitgelicht / Van vastgoed tot automotive"), zonder periode — geen claim die aan de kalender veroudert. **DECIDED — V1.0 (`C-07`)**: "het afgelopen jaar" = **REMOVE/REWRITE REQUIRED** — aantoonbaar onjuist (10 van 11 cases vallen buiten twaalf maanden), dus niet meenemen. De periode juli 2023 – maart 2026 is wél **SUPPORTED**: ze is reproduceerbaar uit het veld `Opgeleverd` op de elf casepagina's. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: de tijdsbepaling vervalt. Twee toegestane vervangingen: (a) tijdloos naar Master v1-model, zonder periode; (b) de gemeten periode "juli 2023 – maart 2026", exact zoals die uit de elf `Opgeleverd`-velden volgt. Een relatieve formulering ("het afgelopen jaar", "recent") is verboden omdat ze aan de kalender veroudert en dus opnieuw onwaar wordt. Uitvoeren bij de `B4`-master `projecten.html` (stap 3). |
| **RISK** | Hoog |

### L-06 · Aanspreekvorm: 44 van de 47 andere pagina's hanteren u/uw; de homepage uitsluitend je/jouw

| Veld | Inhoud |
|---|---|
| **LOCATION** | Alle `*.html` behalve `index.html`. Hoogste concentraties: `oplossing-exploitatie.html` (26), `oplossing-netcongestie.html` (24), `exploitatie-zonder-investering.html` (23), `systeem-zonnepanelen.html` (21), `oplossing-laadplein.html` (20), `privacy.html` (20), `systeem-energieopslag.html` (20) |
| **CURRENT STATE** | Gemeten op zichtbare tekst (commentaar, `<script>`, `<style>` verwijderd, tags gestript): `index.html` = **12× je/jouw, 0× u/uw**. Alle 47 andere pagina's: **0× je/jouw**. 44 pagina's bevatten u/uw; alleen `404.html`, `algemene-voorwaarden.html` en de `contact.html`-loader komen op nul uit — het in `contact.html` ingebedde document bevat wél 9× u/uw. Voorbeelden: `projecten.html:295` "Uw locatie als volgende?", `project-ratio-16.html:102` "Uw locatie als *volgende*?", `project-arnhem-60.html:68` "Uw portefeuille als *volgende*? … voor uw woningen of pand". |
| **MASTER V1 RULE** | Master v1 tutoyeert consequent: `index.html:307` "afgestemd op jouw operatie", `:560` "We brengen je energieverbruik", `:964` "jouw organisatie", `:1104-1106` "jouw locatie … je pand of portefeuille … jouw aansluiting", `:1108` "je vraag". Nul u/uw in zichtbare tekst. De homepage wint. **Bijwerking V1.0**: de architectuur erkent `B7 Juridisch document` als eigen bouwtype met een eigen master (`privacy.html`, stap 6 in de migratievolgorde). De registervraag hoort daarmee bij dat bouwtype thuis en niet bij de site-brede copy-migratie. |
| **MIGRATION ACTION** | Migreer alle paginacopy naar je/jouw — dat deel ligt vast en is niet open. **DEFERRED TO PAGE MIGRATION** voor `algemene-voorwaarden.html` en `privacy.html`: het registerbesluit valt bij de bouw van de **B7-master `privacy.html`** (stap 6). Exacte voorwaarde waaronder het besluit heropend wordt: zodra die master gebouwd wordt, óf eerder zodra een jurist of de merkeigenaar een registervoorschrift aanlevert. Tot dat moment blijft de u-vorm in die twee bestanden onaangeroerd — een bewuste uitzondering, geen vergeten pagina. `C-01` t/m `C-07` doen hierover geen uitspraak; dit is geen merk- of scopebesluit maar een bouwtypebesluit. |
| **RISK** | Hoog |

### L-07 · Fontgebruik: geen enkele andere pagina laadt Urbanist; alle 47 laden Archivo + IBM Plex Sans

| Veld | Inhoud |
|---|---|
| **LOCATION** | Alle `*.html` behalve `index.html`; o.a. `projecten.html:19, 31, 67, 69`; `subpage.css:38`; `report.css`; `project-case.css`; `_header.js:77, 78, 82, 194`; `_footer.js:6, 18, 22` |
| **CURRENT STATE** | 47 van de 48 `*.html` laden een Google-Fonts-`css2`-stylesheet (alleen het fragment `_header.html` niet). **Alle 47** bevatten `family=Archivo` en `IBM+Plex+Sans`; **exact één** (`index.html`) bevat daarnaast `Urbanist`. De families worden ook daadwerkelijk toegepast: `projecten.html:31` `body{font-family:'IBM Plex Sans'}`, `:69` `.pj-hero h1{font-family:'Archivo'}`, `:67` `.eyb{font-family:'JetBrains Mono'}`. De gedeelde componenten doen hetzelfde: `_header.js:194` nav-link in IBM Plex Sans, `:82` `.mega-promo-h` in Archivo; `_footer.js:6` footer in IBM Plex Sans, `:18` en `:22` in Archivo. `Urbanist` komt voor in exact 12 bestanden: `index.html` en de elf `home*.css`. |
| **MASTER V1 RULE** | `home.css:83` zet `html,body` op `'Urbanist'`; `home.css:105-107` zet `h1,h2,h3` op `'Urbanist'` met `font-weight:700` en `letter-spacing:-.012em`. Het commentaar op `home.css:17-23` legt uit dat IBM Plex Sans en Archivo juist daarom uit de basislaag zijn verwijderd. |
| **MIGRATION ACTION** | Vervang per pagina de fontlink en de `font-family`-declaraties door Urbanist volgens `home.css:83` en `:105-107`. Doe dit gelijk op met `_header.js` en `_footer.js`, anders keert de oude letter via de geïnjecteerde componenten terug op elke gemigreerde pagina. |
| **RISK** | Hoog |

### L-08 · Merkkleur: het blauw van Master v1 bestaat alleen op de homepage; de rest is cyaan `#00ADEF`

| Veld | Inhoud |
|---|---|
| **LOCATION** | `tokens.css:12`; `subpage.css`; `report.css`; `project-case.css`; `_header.js`; `_footer.js:6`; `_consent.js` (5×); `_leadpopup.js` (7×); `projecten.html:25`; `api/server.js`; plus alle inline stylesheets |
| **CURRENT STATE** | Grep op `0073FE\|0071FE` levert exact vijf bestanden: `index.html` (7×), `home.css` (1×), `home-process.css` (2×), `home-mobile.css` (1×), `home-proof.css` (1×). Grep op `00ADEF` levert **41 bestanden**, waaronder alle vier gedeelde componenten. `tokens.css:12` definieert `--t-signal:#00ADEF` met het commentaar `/* brand cyan · fills + accents on DARK */`. `projecten.html:25` zet `--signal:#00ADEF` lokaal opnieuw. |
| **MASTER V1 RULE** | `home.css:35-38` definieert `--vibe-blauw:#0073FE`, `--vibe-blauw-diep:#005FE0`, `--vibe-blauw-licht:#3E9BFF`, `--vibe-blauw-tint:#E4F0FC` als één bron. `index.html:55` zet `<meta name="theme-color" content="#0073FE">`. Het logo tekent met `stroke="#0071FE"` in header (`index.html:131-133`) en footer (`:1037-1039`). |
| **MIGRATION ACTION** | Kies één merkkleur. Omdat de homepage wint, is dat `#0073FE`. Vervang `#00ADEF` site-breed, te beginnen bij de vier gedeelde bestanden (`_header.js`, `_footer.js`, `_consent.js`, `_leadpopup.js`), want die renderen nu cyaan **óp de Master-homepage zelf**. |
| **RISK** | Hoog |

### L-09 · Legacy-header `_header.js`: ander navigatiemodel, andere kleur, ander logo, andere CTA's

| Veld | Inhoud |
|---|---|
| **LOCATION** | `_header.js:22-48` (menudefinitie), `:142-163` (markup), `:189-211` (core nav CSS); ingespoten op **35 pagina's** |
| **CURRENT STATE** | Zeven navigatie-items: drie mega-menu's — Oplossingen met **9** links (`:24-32`), Industrieën met **5** (`:35-39`), Systeem met **5** (`:42-46`) — plus Energy Hubs, Projecten, Waarom Vibe, Over ons. Twee acties: "Netcongestie Check" (`.cta-secondary`) en "Plan gesprek" (`.cta-pill`, `:203`, met `clip-path:polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)`). Logo is `<img>` op `height:110px` (`:52`). Vaste navhoogte `92px` (`:190`), accentkleur `#00ADEF` (`:207`). Mobiel breekpunt `1024px` (`:113`, `:210`), met een tussenstap op `1180px` (`:209`). |
| **MASTER V1 RULE** | `index.html:141-160`: zes navigatie-items zonder dropdowns (Oplossingen `#oplossingen`, Projecten, Aanpak `#aanpak`, VIBE.CONTROL `#vibe-control`, Waarom Vibe, Over ons). Eén actie: "Plan een gesprek" met `data-calendly` (`:157`). Logo is een inline SVG-badge plus woordmerk VIBE/ENERGY (`:130-138`). Mobiel menu `.vh-mobielmenu` (`:165-181`) met breekpunt 1200px (`index.html:1171`, `home-mobile.css:67`). **DECIDED — V1.0 (`C-01`, variant A)**: de platte Master-v1-header wordt de standaard; het legacy mega-menu verdwijnt. Desktop: platte header, logo links, primaire CTA rechts. Mobiel: de Master-v1-navigatie. **1199px blijft de primaire responsive navigatiegrens** tenzij implementatiebewijs later iets anders vereist. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: bouw één header naar het bevroren primitieve-model (`.vibe-*`, zie §2) en vervang `_header.js` daardoor. **Geen mega-menu terugbouwen** om legacy routes zichtbaar te houden — dat is expliciet afgewezen. De 11 routes verdwijnen echter niet uit de IA: proposities mogen niet uit de informatiearchitectuur vallen alleen omdat ze geen top-level item meer zijn. "Oplossingen" wordt de belangrijke navigatie-ingang; systemen en producten blijven bereikbaar via overzichtspagina's en interne navigatie; Energy Hubs en de systeemcategorieën moeten logisch in de nieuwe IA landen. Concreet te beleggen bij de migratie: de 5 `industrie-*`-pagina's volgen de canonieke sectortaxonomie uit `L-35` (`C-05`), de 5 systeempagina's hangen onder de `B2`-variant *Systeem* met `systeem-energieopslag.html` als master (stap 1), en `energy-hubs` verhuist naar de oplossing-as (`B2`-variant *Oplossing*), net als de filterchip uit `L-35`. Motivering: één navigatiemodel is voorwaarde voor elke andere migratie, en het mega-menu droeg tegelijk de afwijkende kleur, letter, logohoogte en het 1024px-breekpunt (zie `L-08`, `L-07`, `L-41`). |
| **RISK** | Hoog |

### L-10 · Legacy-footer `_footer.js` wordt óók op de Master-homepage in de DOM geschreven en alleen met CSS verborgen

| Veld | Inhoud |
|---|---|
| **LOCATION** | `_footer.js:5-106`; geladen op **35 pagina's** waaronder `index.html:1174`; verborgen via `home-footer.css:35` |
| **CURRENT STATE** | `_footer.js:39` doet `document.write('<style>'+CSS+'</style>')` en `:105` `document.write(html)` van een complete `footer.ftr.v1a` in het oude systeem: IBM Plex Sans en Archivo (`:6, 18, 22, 30`), `--signal:#00ADEF` en `--ink-900:#06121C` (`:6`), vijf kolommen, monospace signatuurbalk. `index.html:1174` laadt het script omdat het óók de Calendly-afhandeling (`:137` `CAL_URL`, `:151-170` listener) en de preview-linkfix (`:108-135`) bevat. `home-footer.css:35` zet `.vh-footer ~ footer.ftr.v1a{ display: none !important }`. Markup en CSS worden dus geladen en geparsed, alleen niet getoond. |
| **MASTER V1 RULE** | `index.html:1012-1129` definieert de eigen footer `.vh-footer` met drie kolomnavigaties (`:1067-1097`), een contactblok in je-vorm (`:1103-1112`) en een legalregel (`:1120-1128`). `home-footer.css:32-34` documenteert dat de gedeelde footer ongewijzigd blijft maar op de homepage wordt verborgen. |
| **MIGRATION ACTION** | Splits `_footer.js`: haal de Calendly-afhandeling (`:137-170`) en de preview-linkfix (`:108-135`) uit het footerbestand, zodat de homepage die gedragslagen kan laden zonder de oude footermarkup binnen te halen. Migreer daarna de overige 34 pagina's naar `.vh-footer-*`. |
| **RISK** | Hoog |

### L-11 · Cookiebanner en leadpopup renderen in het oude designsysteem, óók op de Master v1-homepage

| Veld | Inhoud |
|---|---|
| **LOCATION** | `_consent.js:54-84` (geladen op 39 pagina's, `index.html:4`) en `_leadpopup.js:59-99` (geladen op 5 pagina's, `index.html:1243`) |
| **CURRENT STATE** | `_consent.js:54` zet `.vck-ov` op `'IBM Plex Sans'`; `:57` `border-top:3px solid #00ADEF` met `border-radius:4px`; `:60` eyebrow in `'JetBrains Mono'` kleur `#0096CC`; `:61` titel in `'Archivo'`; `:66` knoppen met `border-radius:3px`; `:67, 68` accent `#00ADEF` (5× `#00ADEF` in het bestand). `_leadpopup.js:59` `'IBM Plex Sans'`; `:70` eyebrow `'JetBrains Mono'` `#00ADEF`; `:71, 85, 97, 99` `'Archivo'`; `:80, 85, 99` `border-radius:3px`; 7× `#00ADEF`. Beide overlays verschijnen bovenop de gelockte homepage. |
| **MASTER V1 RULE** | `home.css:83` en `:105` schrijven Urbanist voor; `:35` `--vibe-blauw:#0073FE`; `:55-57` `--vibe-radius-kaart` / `--vibe-radius-mob:14px`; `:113-127` een merkblauwe focusring die de cyane ring van `tokens.css` expliciet overschrijft. Twee overlays in Archivo/IBM Plex Sans met cyane accenten en 3–4px radii voldoen aan geen van die regels. |
| **MIGRATION ACTION** | Migreer `_consent.js` en `_leadpopup.js` naar de `--vibe-*`-tokenlaag: Urbanist, `#0073FE`, de radiustokens uit `home.css:55-57`. Dit is de **zichtbaarste** schending in het register, want hij treedt op op de gelockte homepage zelf. |
| **RISK** | Hoog |

### L-12 · CTA's met de tekst "Bekijk praktijkcase(s)" openen de Calendly-widget in plaats van de cases te tonen — functionele regressie

| Veld | Inhoud |
|---|---|
| **LOCATION** | `_footer.js:154` (de onderscheppende regex) en `:118` (dezelfde regex in de preview-linkfix); **28 elementen op 16 pagina's** |
| **CURRENT STATE** | `_footer.js:151-155` definieert `isCalTrigger`: na een `data-calendly`-check op `:153` valt `:154` terug op `/plan.*gesprek\|adviesgesprek\|bekijk.*praktijkcase/i.test((el.textContent\|\|'').trim())`. De listener op `:157-169` draait in de **capture-fase op documentniveau** en doet `e.preventDefault()` plus `e.stopPropagation()`. Gemeten doelwitten: **23 `<a>`-elementen** op 13 pagina's (o.a. `systeem-laadpalen.html:74, 216`; `industrie-vastgoed.html:74, 232`; `oplossing-exploitatie.html:74, 277`; `systeem-ems.html:235`) plus **5 `<button>`-elementen** op 3 pagina's (`oplossing-energielabel.html:793`; `oplossing-paris-proof.html:382, 735`; `oplossing-subsidies.html:382, 745`) = 28 elementen op 16 pagina's. De 23 ankers wijzen naar `href="#proof"`, `href="#cases"` (beide bestaan) of `href="projecten"`. De 5 buttons dragen `onclick="location.href='projecten'"` — door `stopPropagation()` in de capture-fase bereikt het event die handler niet, dus ook die navigatie gaat verloren. Alle 16 pagina's laden `_footer.js`. **AFWIJKING**: het bewijsbestand spreekt van "28 ankers"; het zijn 23 ankers en 5 buttons. |
| **MASTER V1 RULE** | Master v1 koppelt afspraakgedrag aan het attribuut `data-calendly`, niet aan linktekst: `index.html:157, 174, 189, 970, 1000` dragen het. De navigerende CTA's (`:513` "Bekijk de case", `:516` "Meer projecten", `:801` "Alle projecten", `:868` "Bekijk alle projecten") dragen het niet en navigeren dus gewoon. |
| **MIGRATION ACTION** | Beperk de onderschepping tot het expliciete `data-calendly`-attribuut en verwijder de tekstherkenning op `_footer.js:118` en `:154`. Zet daarna `data-calendly` op de CTA's die wél een afspraak horen te openen. **Dit is een echte functionele regressie — hier geregistreerd, niet gecorrigeerd** (zie staande regel 3: de gebruiker beslist of het in scope is). |
| **RISK** | Hoog |

### L-13 · `contact.html` is geen pagina maar een bundlerartefact dat het document pas bij runtime uitpakt

| Veld | Inhoud |
|---|---|
| **LOCATION** | `contact.html` — 228 regels, 409 619 bytes; payload op `:217-227` |
| **CURRENT STATE** | `:2` is `<html>` **zonder `lang`-attribuut**, als enige van alle 48 pagina's (de overige 47 dragen `<html lang="nl">`; het fragment `_header.html` heeft geen `<html>`-tag). `:37-41` toont een laadscherm plus een `<noscript>` met "This page requires JavaScript to display." — zonder JavaScript is er geen inhoud. `:217-219` bevat `<script type="__bundler/manifest">` met **20 base64-gecodeerde woff2-bestanden** (305 657 bytes). `:225-227` bevat `<script type="__bundler/template">` met het volledige contactdocument (**92 790 bytes JSON**, 91 053 tekens uitgepakt). Het ingebedde document gebruikt vijf lettertypes — Barlow Condensed (12×), Outfit (8×), Archivo (8×), IBM Plex Sans (11×), JetBrains Mono (32×), Urbanist 0× — waarvan **Barlow Condensed en Outfit nergens anders in de repository voorkomen**. Het heeft een eigen hardgecodeerde topnav, laadt noch `_header.js` noch `_footer.js` (0 treffers in het uitgepakte document), en gebruikt 9× u/uw en 0× je/jouw. `contact.html:14-16` laadt bovendien `gtag.js` met `G-G9W07Y612T` (2 treffers) **naast** de GTM-container `GTM-KM2V7VQ3` (2 treffers) die alle andere pagina's gebruiken. |
| **MASTER V1 RULE** | Master v1 is een server-renderbaar document: `index.html:2` `<html lang="nl">`, één fontlink (`:37`), één analyticsroute (GTM-KM2V7VQ3 op `:6-10`), één gedeeld headermodel. Geen runtime-unpacking, geen JS-afhankelijkheid voor de basisinhoud. `contact.html` is de bestemming van drie Master v1-links: `index.html:903`, `:1085`, `:1106`. |
| **MIGRATION ACTION** | Herbouw `contact.html` als statisch document op de bevroren primitieveset (§2). **Bijwerking V1.0**: `contact.html` is de **`B6`-master (conversie-instrument, variant formulier)** — stap 4 in de migratievolgorde, en dus de pagina waaraan het hele `B6`-bouwtype wordt afgemeten. Pak daarbij mee: `lang="nl"` terugzetten, de dubbele GA4-property opheffen of verantwoorden, en Barlow Condensed en Outfit laten vallen. `netcongestie-check.html` is de `B6`-variant *wizard* en volgt ná deze master. Dit is qua omvang de zwaarste migratie van de site. |
| **RISK** | Hoog |

### L-14 · De enige kapotte linkbestemming op de hele site: `Vibe Energy.html`

| Veld | Inhoud |
|---|---|
| **LOCATION** | `contact.html:226`, in het ingebedde bundlerdocument (linktekst "Vibe Energy/") |
| **CURRENT STATE** | Een volledige audit van **alle** `href`-waarden op alle 48 pagina's (protocol-URI's en fragmenten uitgefilterd, rest getoetst tegen het bestandssysteem met en zonder `.html`) levert **nul** kapotte bestemmingen. Een aparte audit van het uitgepakte bundlerdocument levert 41 hrefs, waarvan 32 intern over 18 unieke bestemmingen; **17 daarvan bestaan, één niet**: `<a href="Vibe Energy.html">Vibe Energy/</a>`, kennelijk als kruimelpad. Er bestaat geen bestand met die naam in de webroot. Alle 32 interne links in dat document dragen de `.html`-extensie, terwijl de rest van de site schone URL's hanteert; `contact.html` laadt de preview-linkfix uit `_footer.js:108-135` niet. **AFWIJKING**: het bewijsbestand noemt 38 interne links; ik meet er 32 over 18 unieke bestemmingen. |
| **MASTER V1 RULE** | Master v1 gebruikt uitsluitend schone, bestaande bestemmingen: `index.html:143` `href="projecten"`, `:146` `href="waarom-vibe"`, `:157` `href="contact"`. Alle Master v1-hrefs resolven. |
| **MIGRATION ACTION** | Verwijder de kruimelpadlink of laat hem naar `/` wijzen. Zet de interne links van `contact.html` op schone URL's, gelijk met de herbouw van die pagina als `B6`-master (stap 4, zie `L-13`). **NIET VERIFIEERBAAR VANUIT REPO**: of de `.html`-links op de productieserver werken volgt niet uit deze repository — `railpack.json` zet alleen `provider:"staticfile"`. **DECISION REQUIRED — blijft open**: `C-01` t/m `C-07` raken dit punt niet; het wachtende antwoord is een meting tegen de live server, geen merkbesluit. De link `Vibe Energy.html` is hoe dan ook kapot, want het doelbestand ontbreekt — dat deel is niet afhankelijk van de meting. |
| **RISK** | Hoog |

### L-15 · Zeven Executive Guides zonder navigatie, footer, cookiebanner, analytics of canonical

| Veld | Inhoud |
|---|---|
| **LOCATION** | `capaciteit-als-dienst.html`, `energie-als-vastgoedopbrengst.html`, `energiehandel-flexmarkten.html`, `energielabel-verhogen.html`, `exploitatie-zonder-investering.html`, `laadplein-zonder-verzwaring.html`, `netcongestie-oplossen.html` — telkens `:11` `<link rel="stylesheet" href="report.css">` |
| **CURRENT STATE** | Deze zeven pagina's laden uitsluitend `report.css`. Per pagina gemeten: **0** treffers op `_header.js`, **0** op `_footer.js`, **0** op `_consent.js`, **0** op `GTM-KM2V7VQ3`, **0** op `rel="canonical"`, **0** op `<main`. Ze zijn de enige pagina's zonder cookietoestemming én zonder analytics. Drie staan in `sitemap.xml` (`capaciteit-als-dienst`, `energie-als-vastgoedopbrengst`, `energiehandel-flexmarkten`), vier niet; `robots.txt` bevat `Allow: /` zonder enige `Disallow`. |
| **MASTER V1 RULE** | Master v1 draagt de volledige stapel: `_consent.js` vóór GTM (`index.html:4`), GTM (`:6-10`), Clarity (`:12`), Meta Pixel (`:19-34`), het SEO-blok met canonical, `og:`, `twitter:` en JSON-LD (`:38-54`), en `<main id="hoofdinhoud">` (`:72`). Elke pagina die als bestemming van een Master-CTA dient, hoort diezelfde stapel te voeren. **DECIDED — V1.0 (`C-03`, variant B)**: de zeven guides zijn **gated assets / lead magnets**, geen publiek pagina-archetype en geen normale SEO-contentpagina's. Ze krijgen het eigen bouwtype **`S2` Executive Guide (gated documentsysteem)** — stap 7 en laatste in de migratievolgorde. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: gated. Concreet: (1) uit de publieke `sitemap.xml` waar van toepassing — de drie die er nu in staan (`capaciteit-als-dienst`, `energie-als-vastgoedopbrengst`, `energiehandel-flexmarkten`, gemeten op `sitemap.xml:118, 16, 124`) verdwijnen, zodat het onverklaarde 3-in/4-uit-verschil vervalt; (2) ontsluiten via de leadflow, niet via crawlbare navigatie; (3) **delivery moet aantoonbaar werken** — zie `L-20` en `L-44`: een guide of brochure wordt niet beloofd wanneer het bestand niet bestaat; (4) de guide-inhoud zélf blijft behouden, het is een routerings- en verpakkingsbesluit, geen contentsanering. Gevolg voor de ontbrekende stapel: omdat deze pagina's geen publieke SEO-pagina's worden, is het toevoegen van canonical/`og:`/JSON-LD niet langer de opdracht; cookietoestemming en `<main>` horen er wél bij zodra ze achter de leadflow worden geleverd. Motivering: de code sprak zichzelf tegen (deels in de sitemap, volledig crawlbaar, geen sitecontext); `C-03` kiest één lezing zodat `L-25` en `L-27` uitvoerbaar worden. |
| **RISK** | Hoog |

### L-16 · `capaciteit-als-dienst.html` is doodlopend — en Master v1 stuurt er bezoekers heen

| Veld | Inhoud |
|---|---|
| **LOCATION** | `capaciteit-als-dienst.html:500`; ingang vanaf `index.html:308` |
| **CURRENT STATE** | Een volledige inventarisatie van alle `href`-waarden in `capaciteit-als-dienst.html` levert **vijf** treffers: `https://fonts.googleapis.com`, de Google-Fonts-`css2`-link, `https://fonts.gstatic.com`, `report.css`, en één echte link: `<a href="mailto:mounir@vibeenergy.nl">`. Geen logo, geen menu, geen footer, geen weg terug. Master v1 zet op deze pagina zijn sectie-2-CTA: `index.html:308` `<a class="vh-sol-cta" href="capaciteit-als-dienst">Bekijk capaciteit als dienst</a>`. Dezelfde structuur geldt voor de andere zes report-pagina's (enige uitgaande link telkens `mailto:mounir@vibeenergy.nl`, op `:449, 451, 467, 478, 485, 537`). |
| **MASTER V1 RULE** | Master v1 kent geen doodlopende bestemmingen. `index.html:1063-1065` documenteert dat routes bewust zijn weggelaten zodra de bestemming niet bestaat ("Uit de referentie weggelaten omdat de pagina niet bestaat: Advies & engineering, Werken bij Vibe, Nieuws, Kennisbank, Downloads, Klantverhalen") — de norm is dus dat een gelinkte pagina bruikbaar is. **Bijwerking V1.0 (`C-03`)**: `capaciteit-als-dienst.html` is een gated `S2`-asset. Een directe, publieke CTA vanaf de homepage naar een gated asset is daarmee per definitie de verkeerde route — het probleem is niet meer "de pagina mist een header", maar "de link gaat om de leadflow heen". |
| **MIGRATION ACTION** | **DECIDED — V1.0**: de sectie-2-CTA op `index.html:308` mag niet rechtstreeks naar de guide linken. Hij loopt voortaan via de leadflow (`S2`), of hij krijgt een publieke `B2`-bestemming. Aanvullende gemeten complicatie: `capaciteit-als-dienst` is één van de **twee** guides die door géén enkele `window.VIBE_LEAD`-configuratie als asset wordt aangeboden (de andere is `energiehandel-flexmarkten`; gemeten over de vijf configuraties op `index.html:1242`, `oplossing-exploitatie.html:295`, `oplossing-energielabel.html:857`, `oplossing-laadplein.html:269`, `oplossing-netcongestie.html:299`). Er bestaat dus op dit moment géén leadflow die deze guide levert; die moet er eerst komen, anders verwijst de CTA naar een belofte zonder levering — precies wat `C-06` verbiedt. Uitvoeren bij stap 7 (`S2`), niet eerder. |
| **RISK** | Hoog |

### L-43 · De gedeelde leadpopup toont drie ongedekte cijferclaims — óók op de gelockte Master v1-homepage

| Veld | Inhoud |
|---|---|
| **LOCATION** | `_leadpopup.js:116`; gerenderd op de **5 pagina's** die het script laden (`index.html:1243`, `oplossing-exploitatie.html`, `oplossing-energielabel.html`, `oplossing-laadplein.html`, `oplossing-netcongestie.html`) |
| **CURRENT STATE** | `_leadpopup.js:116` schrijft `'<p class="vlp-mono">VIBE ENERGY<br>7 waardestromen · 0 jr wachttijd<br>−22% netinkoop</p>'+` in de linkerkolom van de popup, boven het formulier. Drie cijfers, geen bron, geen scope, geen broncommentaar. Gemeten per claim over de hele repository: **"7 waardestromen"** — de enige andere vindplaatsen van het woord zijn `systeem-energieopslag.html:125` ("**vier** waardestromen tegelijk") en de JSON-LD-FAQ op `:33` / `:197` ("vaak meerdere waardestromen tegelijk"); nergens wordt naar zeven geteld. **"0 jr wachttijd"** — verwante cijfers bestaan wél, maar in maanden en met scope: `energy-hubs.html:194` "0 mnd wachttijd", `oplossing-laadplein.html:212` "24→0 Maanden wachttijd", `oplossing-netcongestie.html:242` "30→0 Maanden wachttijd"; alle drie horen bij een anonieme case, niet bij een bedrijfsbrede uitspraak. **"−22% netinkoop"** — `energiehandel-flexmarkten.html:328` toont `−22%` met label "Minder netinkoop", maar `systeem-ems.html:146` gebruikt dezelfde −22% voor een **andere grootheid** ("HVAC-verbruik over een portefeuille van 50 panden"), en `index.html:763` / `:1208` gebruikt −22% in de VIBE.CONTROL-tickerregel, die in het paneel expliciet als **"Voorbeeldweergave"** is gelabeld (`index.html:688`, gedocumenteerd op `:652`) en dus juist géén claim is. Dezelfde drie cijfers staan ook in het interne prototype `popup-designs.html:156` (daar met em-dash `—22%` in plaats van de minus `−22%`) — zie `L-28`. |
| **MASTER V1 RULE** | `index.html:208-255` is de bewijsstrook-doctrine: elk cijfer op de homepage is herleidbaar tot een bron, en cijfers zonder primaire onderbouwing worden expliciet **niet** gebruikt (`:251-253`). De popup omzeilt die doctrine volledig — hij is niet meegenomen in de Master v1-verantwoording en verschijnt bovenop de gelockte pagina. **DECIDED — V1.0 (`C-07`)**: claimstatus = **UNVERIFIED**, onder exact dezelfde policy als `L-01` t/m `L-03`; de harde regel `PUBLICLY EXISTING != VERIFIED` geldt hier onverkort. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: drie toegestane uitkomsten bij de betreffende migratie — (a) VERIFIED maken met een primaire bron, (b) kwalitatief herschrijven naar een formulering die exact dekt wat de bron bewijst, of (c) verwijderen. Er is geen vierde optie waarin het cijfer blijft staan omdat het er al stond. Specifiek: "−22% netinkoop" mag niet worden hergebruikt zolang dezelfde −22% op `systeem-ems.html:146` een andere grootheid meet — dat is `CONFLICTING`. "0 jr wachttijd" mag hoogstens de scope van de onderliggende case dragen, niet bedrijfsbreed. **NU GEEN PRODUCTIECODE WIJZIGEN**: `_leadpopup.js` blijft in deze ronde onaangeroerd; dit item is registratie. Uitvoeren bij de migratie van de gedeelde overlays (samen met `L-11`) en van de leadflow (`S2`, stap 7). |
| **RISK** | Hoog |

Risicomotivering: `Hoog`, gelijk aan `L-01` t/m `L-03`, omdat deze claims — anders dan die drie — renderen op de pagina die de bewijsdoctrine zelf vaststelt. De inconsistentie is daarmee zichtbaar op het referentiedocument.

---

## 4. Register — MIDDEL (20)

### L-17 · Persoonlijk e-mailadres `mounir@vibeenergy.nl` op zeven pagina's

| Veld | Inhoud |
|---|---|
| **LOCATION** | `capaciteit-als-dienst.html:500`, `energie-als-vastgoedopbrengst.html:449`, `energiehandel-flexmarkten.html:485`, `energielabel-verhogen.html:467`, `exploitatie-zonder-investering.html:451`, `laadplein-zonder-verzwaring.html:537`, `netcongestie-oplossen.html:478` |
| **CURRENT STATE** | Zeven keer `<a href="mailto:mounir@vibeenergy.nl" style="color:var(--signal)">mounir@vibeenergy.nl</a>` in het contactblok. Op alle andere pagina's is het adres `info@vibeenergy.nl`: `_footer.js:92`, `index.html:179`, `index.html:1058`, `algemene-voorwaarden.html:82`, `privacy.html:90, 132, 138`, plus het ingebedde contactdocument. Het staat ook in de Organization-JSON-LD op `index.html:53`. |
| **MASTER V1 RULE** | `index.html:1031-1033` legt vast dat adres, telefoon en e-mail letterlijk uit `_footer.js:92-93` komen — `info@vibeenergy.nl` en `+31 85 060 0489` — en dat gegevens die niet in de repository staan niet worden gepubliceerd. **DECIDED — V1.0 (`C-06`)**: routering gaat naar een **zakelijke centrale bestemming, niet naar een persoonlijk e-mailadres**. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: het persoonlijke adres vervalt op alle zeven guides. Vervangen door de zakelijke centrale bestemming; de enige zakelijke adressen die in deze repository zijn gemeten zijn `info@vibeenergy.nl` (`_footer.js:92`, `index.html:179`, `:1058`, `algemene-voorwaarden.html:82`, `privacy.html:90, 132, 138`, plus de Organization-JSON-LD op `index.html:53`) en `sales@vibeenergy.nl` (genoemd als lead-ontvanger in het commentaar `_leadpopup.js:17`). Welke van die twee de centrale guide-bestemming wordt, is **CONTENT PENDING** — een bedrijfsgegeven, geen codebesluit; zolang het ontbreekt geldt `info@vibeenergy.nl` als de enige in de publieke site gepubliceerde waarde. De open vraag "moet dit bewust persoonlijk routeren?" is met `C-06` beantwoord met *nee* en is daarmee gesloten. Uitvoeren bij stap 7 (`S2`). |
| **RISK** | Middel |

### L-18 · `tokens.css` is een dood designsysteem: 45 tokens die door geen enkel ander bestand worden geconsumeerd

| Veld | Inhoud |
|---|---|
| **LOCATION** | `tokens.css:10-67` (tokenschaal) en `:69-105` (unify-laag); geladen door **36 pagina's**, waaronder `index.html:56` |
| **CURRENT STATE** | Grep op `var(--t-` over alle `*.html` en `*.css` levert **exact één bestand**: `tokens.css` zelf, met 5 treffers (`:77, 79, 80, 98, 103`) binnen de eigen unify-laag. De **45** gedefinieerde tokens (3 kleur, 3 licht oppervlak, 3 donker oppervlak, 6 ink, 3 lijnen, 5 type, 8 spacing, 2 radii, 2 elevatie, 4 motion, 3 z-index, 3 icon) worden nergens buiten dat bestand gebruikt. Wat wél doorwerkt is de `!important`-unify-laag op `:76-105`, gericht op legacy-klassen: `.eyebrow/.eyb/.nc-eyb/.lg-eyb/.mc-eyb`, `.btn-p/.btn-s/.btn-go/.btn-cta`, `.card/.pc-*/.mc-*/.inp/.opt/.nc-wizard`. Geen van die selectoren komt voor op de homepage, die `.vh-*` gebruikt. Alleen de focusring op `:102-105` raakt de homepage. **AFWIJKING**: het bewijsbestand noemt 40 tokens en 33 pagina's; ik meet 45 en 36. |
| **MASTER V1 RULE** | `home.css:29-71` is de tokenlaag van Master v1 (23 `--vibe-*`-tokens). `home.css:113-118` documenteert dat `tokens.css` alleen nog wordt geladen omdat het de site-brede cyane focusring zet, die op `:119-127` bewust wordt overschreven. |
| **MIGRATION ACTION** | Behandel `tokens.css` als uitsluitend legacy: zolang de 35 oude pagina's bestaan blijft de unify-laag nodig. Haal het bestand uit `index.html:56` zodra de focusring-overschrijving in `home.css:119-127` overbodig is, en laat het vervallen bij de laatste gemigreerde pagina. **Niet uitbreiden.** |
| **RISK** | Middel |

### L-19 · Master v1 laadt zelf nog het oude fontpakket en het oude tokenbestand

| Veld | Inhoud |
|---|---|
| **LOCATION** | `index.html:37` en `:56` |
| **CURRENT STATE** | `:37` haalt `family=Archivo:wght@500;600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Urbanist:wght@400;500;600;700;800` op — **vier families**, waarvan de homepage zelf alleen Urbanist toepast (`home.css:83`, `:105`). `:56` laadt `tokens.css`. Beide zijn functioneel nodig zolang `_consent.js`, `_leadpopup.js` en de geïnjecteerde `_footer.js` op de pagina staan: die gebruiken Archivo, IBM Plex Sans en JetBrains Mono (`_consent.js:54, 60, 61`; `_leadpopup.js:59, 70, 71`; `_footer.js:6, 18, 22`). |
| **MASTER V1 RULE** | `home.css:9-15` stelt dat de volledige stylesheet van de vorige homepage is verwijderd nadat gemeten was dat 128 van de 132 klassen nergens meer matchten, en dat de pagina in Urbanist rendert. Drie extra fontfamilies laden is daarmee in tegenspraak — maar afgedwongen door de gedeelde componenten. |
| **MIGRATION ACTION** | Koppel dit aan L-11 en L-10. Zodra `_consent.js`, `_leadpopup.js` en `_footer.js` op Urbanist staan, kunnen Archivo, IBM Plex Sans en JetBrains Mono uit `index.html:37` en kan `tokens.css` uit `:56`. Niet eerder — anders vallen de overlays terug op de systeemletter. |
| **RISK** | Middel |

### L-20 · De beloofde "brochure" is een HTML-pagina; er bestaat geen enkele PDF in deze repository

| Veld | Inhoud |
|---|---|
| **LOCATION** | `index.html:1242`, `oplossing-exploitatie.html:295`, `oplossing-energielabel.html:857`, `oplossing-laadplein.html:269`, `oplossing-netcongestie.html:299`; levering in `_leadpopup.js:113, 124, 235, 240, 250, 255` |
| **CURRENT STATE** | Alle **vijf** `VIBE_LEAD`-configuraties zetten `file` op een `.html`-pad, bijvoorbeeld `index.html:1242` `file:"energie-als-vastgoedopbrengst.html"`. De popup toont "Gratis brochure" (`_leadpopup.js:113`) en "Stuur mij de brochure" (`:124`), en levert met `<a class="vlp-dl" href="…" target="_blank" download>Brochure openen</a>` (`:235`, `:250`) plus `window.open(file,'_blank')` (`:240`, `:255`). De doelbestanden zijn de zeven Executive Guides zonder navigatie (zie L-15). Die pagina's dragen zelf `data-brochure-*`-attributen naar PDF's (`capaciteit-als-dienst.html:126` `"Vibe brochure Meer Capaciteit.pdf"`, en zes soortgelijke op `netcongestie-oplossen.html:100`, `energiehandel-flexmarkten.html:120`, `energielabel-verhogen.html:124`, `laadplein-zonder-verzwaring.html:112`, `exploitatie-zonder-investering.html:130`, `energie-als-vastgoedopbrengst.html:107`), maar: **`find` op `*.pdf` levert 0 bestanden**, `assets/brochures` bestaat niet, en geen enkel script in deze repository leest die attributen — de zeven pagina's laden helemaal geen JavaScript. |
| **MASTER V1 RULE** | `index.html:1099-1102` stelt de norm expliciet: er stond eerder "de nieuwsbrief is in voorbereiding" in de footer en dat is verwijderd omdat het "een functie aankondigt die er niet is". Datzelfde principe raakt het woord "brochure" voor een HTML-pagina. **DECIDED — V1.0 (`C-06`)**: levering is variant `A` waar het asset bestaat, anders variant `B`, onder de harde regel **NO ASSET → NO DOWNLOAD PROMISE**. Gemeten stand: **0 PDF's in de hele repository** (zie `L-44`), dus voor alle vijf leadconfiguraties geldt vandaag variant `B`. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: geen PDF-download beloven. Geleverd wordt een **guidepagina**, dus de propositie heet wat ze is ("guide", niet "brochure") en het `download`-attribuut op `_leadpopup.js:235` en `:250` vervalt, net als `window.open(file,'_blank')` als download-gebaar (`:240`, `:255`). De knoptekst "Stuur mij de brochure" (`:124`) en de eyebrow "Gratis brochure" (`:113`) worden meegenomen. Variant `A` — een echte PDF achter `file` — mag pas terugkomen zodra het asset in de repository staat; zie `L-44` voor de assetgap en het dode standaardpad. **NIET VERIFIEERBAAR VANUIT REPO**: of de brochure-API (`_leadpopup.js:23`, endpoint `https://vibe-website-api-production.up.railway.app/api/brochure`) de PDF's wél heeft, is van binnen deze repository niet te meten — dat blokkeert het besluit echter niet meer: wat de API ook bezit, de site mag geen download beloven die deze repository niet levert. **NU GEEN PRODUCTIECODE WIJZIGEN.** Uitvoeren bij stap 7 (`S2`). |
| **RISK** | Middel |

### L-21 · Sticky mobiele CTA-balk `.mcta` op 26 pagina's bestaat niet in Master v1

| Veld | Inhoud |
|---|---|
| **LOCATION** | Markup `<div class="mcta">` op **26 pagina's**; inline `<style>`-kopie op **12** daarvan (`projecten.html:327-333` plus de elf `project-*.html`, o.a. `project-ratio-16.html:109-116`); de overige 14 krijgen hun stijl uit `subpage.css:262-266` |
| **CURRENT STATE** | De regels zijn in beide bronnen vrijwel identiek: `position:fixed`, `background:rgba(6,18,28,.94)`, `border-top:1px solid rgba(0,173,239,.14)`, `font-family:'IBM Plex Sans'`, `.mcta .p{background:#00ADEF;color:#06121C}`, en `@media(max-width:760px){.mcta{display:flex}body{padding-bottom:74px}}`. `subpage.css:379-381` voegt daar nog een lichte `!important`-variant aan toe. **AFWIJKING**: het bewijsbestand stelt dat de CSS 26× inline in HTML is gedupliceerd; gemeten zijn het 12 inline kopieën plus één gedeelde definitie in `subpage.css`. |
| **MASTER V1 RULE** | Master v1 kent geen sticky mobiele CTA. Het mobiele model is het menu `.vh-mobielmenu` (`index.html:165-181`) met breekpunt 1200px, gestuurd door `home-mobile.css`. Kleur (`#00ADEF` vs `#0073FE`), letter (IBM Plex Sans vs Urbanist) en breekpunt (760px vs 1199px) wijken alle drie af. **DECIDED — V1.0 (`C-04`, variant A)**: **geen sticky mobiele CTA in Design System V1.0**. CTA's worden in de pagina geïntegreerd, zoals Master v1 dat doet. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: `.mcta` verdwijnt bij migratie — alle 26 markupblokken, de 12 inline `<style>`-kopieën (`projecten.html:327-333` plus de elf `project-*.html`), de gedeelde definitie op `subpage.css:262-266` en de `!important`-variant op `:379-381`. Er wordt géén `.vibe-*`-vervanger voor gebouwd; de CTA-strategie komt uit het bouwtype van de pagina. Niet dogmatisch verboden: een sticky mobiele CTA mag later terugkomen als **afzonderlijke CRO-test** wanneer conversiedata dat ondersteunt — maar hij hoort niet bij V1.0 en wordt dus niet meegemigreerd "omdat hij er was". Sleept `L-22` mee: de 25 "Bel"-knoppen zitten in dit blok en verdwijnen ermee. Motivering: één sticky element in drie afwijkende systemen (kleur, letter, breekpunt) handhaven kost meer dan het opnieuw ontwerpen zou opleveren, en er is geen conversiebewijs dat het patroon draagt. |
| **RISK** | Middel |

### L-22 · Knop met het label "Bel" navigeert naar de contactpagina in plaats van te bellen

| Veld | Inhoud |
|---|---|
| **LOCATION** | **25 pagina's**, telkens in het `.mcta`-blok; o.a. `projecten.html:334`, `project-ratio-16.html:116`, `microgrids.html:228` |
| **CURRENT STATE** | `<a class="g" href="contact">Bel</a>` — 25 identieke treffers. De `href` is een paginanavigatie, geen `tel:`-URI. De tekst "Bel" valt ook buiten de Calendly-regex van `_footer.js:154`, dus er opent evenmin een afspraakwidget: de knop navigeert simpelweg naar `contact.html`, de bundlerpagina uit L-13. Een werkend telefoonnummer bestaat wél in de repository: `tel:+31850600489` op `_footer.js:92` en `index.html:1054`. |
| **MASTER V1 RULE** | Master v1 koppelt de belactie aan een echte `tel:`-URI: `index.html:178` `<a href="tel:+31850600489">+31 85 060 0489</a>` in het mobiele menu, en `:1054` in de footer. Label en bestemming komen overeen. |
| **MIGRATION ACTION** | **DECIDED — V1.0 (via `C-04`)**: het defect wordt niet gerepareerd maar verwijderd — `.mcta` verdwijnt in zijn geheel (`L-21`), en 25 van de 26 blokken dragen deze knop, dus alle 25 foute "Bel"-links verdwijnen ermee. Losse reparatie van de `href` is daarmee overbodig werk. Voorwaarde die wél blijft staan: waar een belactie in het nieuwe bouwtype terugkomt, draagt ze een echte `tel:`-URI (`tel:+31850600489`, gemeten op `_footer.js:92` en `index.html:1054`) en nooit een paginanavigatie onder het label "Bel". |
| **RISK** | Middel |

### L-23 · Reactietermijn: één pagina belooft 24 uur, veertien andere beloven 48 uur

| Veld | Inhoud |
|---|---|
| **LOCATION** | `netcongestie-check.html:421` |
| **CURRENT STATE** | `<span class="res-note">Ontvang binnen 24 uur een persoonlijk rapport en adviesgesprek met een energiespecialist.</span>` — de **enige** treffer op "binnen 24 uur" in de hele repository. Alle andere reactiebeloften staan op 48 uur: **14 pagina's** tonen "Reactie binnen 48 uur" in de eind-CTA-band (`energy-hubs.html:286`, `microgrids.html:218`, `industrie-logistiek.html:235`, `industrie-recreatie.html:237`, `industrie-residentieel.html:235`, `industrie-vastgoed.html:235`, `industrie-vve.html:234`, `oplossing-exploitatie.html:280`, `oplossing-laadplein.html:254`, `oplossing-netcongestie.html:284`, `systeem-ems.html:238`, `systeem-energieopslag.html:219`, `systeem-laadpalen.html:219`, `systeem-zonnepanelen.html:219`), en `over-ons.html:597` zegt "binnen 48 uur". **AFWIJKING**: het bewijsbestand noemt dertien pagina's; ik tel er veertien. |
| **MASTER V1 RULE** | `index.html:986` en `:1109` beloven beide "Binnen 48 uur contact". `index.html:975-978` documenteert de keuze: de ontwerpreferentie zei 24 uur, maar de site belooft 48 uur, dus 48 uur wint. |
| **MIGRATION ACTION** | Zet `netcongestie-check.html:421` op 48 uur, of onderbouw waarom de check-flow een kortere termijn kent. Zonder onderbouwing is dit de enige pagina die een belofte doet die de rest van de site niet dekt. |
| **RISK** | Middel |

### L-24 · Geen `<main>`-landmark op 43 van de 48 pagina's; skiplink op alleen de homepage

| Veld | Inhoud |
|---|---|
| **LOCATION** | Alle `*.html` behalve `index.html`, `algemene-voorwaarden.html`, `netcongestie-check.html`, `privacy.html` en `projecten.html` |
| **CURRENT STATE** | Geteld op openingstags `<main`: `algemene-voorwaarden.html` 1, `index.html` 1, `netcongestie-check.html` 1, `privacy.html` 1, `projecten.html` 1; **alle overige 43 bestanden 0** — inclusief alle elf `project-*.html`, alle vier `systeem-*.html`, alle vijf `industrie-*.html`, alle zes `oplossing-*.html`, alle zeven Executive Guides, `over-ons.html`, `waarom-vibe.html`, `contact.html` en `404.html`. Een skiplink bestaat op exact één plaats: `index.html:71`. **AFWIJKING**: de titel in het bewijsbestand noemt 42 pagina's; de gemeten waarde is 43 van 48. |
| **MASTER V1 RULE** | `index.html:71-72`: `<a class="vh-skip" href="#hoofdinhoud">Naar de hoofdinhoud</a>` gevolgd door `<main id="hoofdinhoud" tabindex="-1">`, met bijbehorende styling in `home-mobile.css`. |
| **MIGRATION ACTION** | Voeg per pagina een `<main>`-landmark en de skiplink uit Master v1 toe. Goedkope, uniforme ingreep; voer hem uit bij de headermigratie (`L-09`), want de skiplink hoort direct achter `<body>` en vóór de geïnjecteerde header. **Bijwerking V1.0**: `L-09` ligt met `C-01` vast (platte Master-v1-header), dus deze ingreep is niet langer geblokkeerd door een openstaand navigatiebesluit — hij gaat mee met elke bouwtype-master (`B2` stap 1, `B3` stap 2, `B4` stap 3, `B6` stap 4, `B5` stap 5, `B7` stap 6, `S2` stap 7) en wordt daar onderdeel van de MASTER LOCK. |
| **RISK** | Middel |

### L-25 · De zeven Executive Guides hebben elk 8 of 9 `<h1>`-elementen en slaan `<h2>` volledig over

| Veld | Inhoud |
|---|---|
| **LOCATION** | `capaciteit-als-dienst.html:141, 164, 207, 261, 297, 357, 411, 446` (8×) en dezelfde structuur in `energie-als-vastgoedopbrengst.html` (8), `energiehandel-flexmarkten.html` (8), `energielabel-verhogen.html` (8), `exploitatie-zonder-investering.html` (8), `laadplein-zonder-verzwaring.html` (**9**), `netcongestie-oplossen.html` (8) |
| **CURRENT STATE** | Gemeten `<h1`-tellingen: 8, 8, 8, 8, 8, 9, 8. Per hoofdstuk staat een nieuwe `<h1 class="h1">`; subkoppen springen direct naar `<h3>` (o.a. `capaciteit-als-dienst.html:246, 283, 427). Er is **geen enkele `<h2>`** op deze zeven pagina's. Alle overige 41 pagina's hebben er hoogstens één `<h1>`. |
| **MASTER V1 RULE** | `index.html` heeft één `<h1>` (`:186`, `class="vh-h1"`) en bouwt daaronder met `<h2>` per sectie (`:306` `vh-sol-kop`, `:498` `vh-pr-titel`, `:531` `vh-proc-kop`, `:718`, `:798`, `:879`, `:964`) en `<h3>` voor kaartkoppen (`:351, 369, 387, 546, 559`). |
| **MIGRATION ACTION** | Zet per Executive Guide één `<h1>` en degradeer de overige 7 of 8 naar `<h2>`, zodat de `<h3>`-subkoppen weer op het juiste niveau hangen. **Bijwerking V1.0**: de blokkade is weg — `L-15` is met `C-03` beslist (gated `S2`-assets), dus de ingreep is niet langer "zinloos of schadelijk bij het verkeerde antwoord". Let op de gewijzigde motivering: omdat deze documenten géén publieke SEO-contentpagina's worden, is de koppenhiërarchie hier een **toegankelijkheids- en documentstructuurkwestie**, niet een SEO-kwestie. Uitvoeren bij stap 7 (`S2` gated guides), als onderdeel van het gated documentsysteem. |
| **RISK** | Middel |

### L-26 · Geen enkele pagina buiten de homepage gebruikt `loading`- of `fetchpriority`-attributen

| Veld | Inhoud |
|---|---|
| **LOCATION** | Alle `*.html` behalve `index.html` |
| **CURRENT STATE** | Geteld over alle `<img>`-tags: `index.html` heeft **14** afbeeldingen waarvan **13** een `loading`-attribuut dragen (de veertiende is de Meta-Pixel-trackingpixel op `:31`). Alle 47 andere bestanden: **0 afbeeldingen met een `loading`-attribuut**, terwijl ze samen 81 `<img>`-tags bevatten (o.a. `exploitatie-zonder-investering.html` 6, `laadplein-zonder-verzwaring.html` 4, `netcongestie-oplossen.html` 4, `capaciteit-als-dienst.html` 3, `contact.html` 3). De grootste beeldbestanden staan bovendien als CSS-`background-image` in HTML (`projecten.html:196-284`, de `project-case`-hero's), waarop een `loading`-attribuut niet mogelijk is. |
| **MASTER V1 RULE** | `index.html:84-88` levert het LCP-beeld met `srcset` (4 breedtes), `sizes`, expliciete `width="2600" height="1100"`, `loading="eager"`, `fetchpriority="high"` en `decoding="async"`. Alle overige beelden (`:344, 361, 379, 437, 467, 539, 839, 857, 915, 957, 1019`) dragen `loading="lazy"` en `decoding="async"` plus `srcset`/`sizes`/`width`/`height`. |
| **MIGRATION ACTION** | Voeg bij de migratie per pagina `loading` en `decoding` toe en geef beelden expliciete afmetingen. Overweeg de `background-image`-hero's om te zetten naar `<img>`, zodat ze dezelfde behandeling kunnen krijgen. |
| **RISK** | Middel |

### L-27 · `sitemap.xml` is verouderd en incompleet

| Veld | Inhoud |
|---|---|
| **LOCATION** | `sitemap.xml` |
| **CURRENT STATE** | **39** `<loc>`-entries. Wel opgenomen: `capaciteit-als-dienst`, `energie-als-vastgoedopbrengst`, `energiehandel-flexmarkten`. **Niet** opgenomen: `energielabel-verhogen`, `exploitatie-zonder-investering`, `laadplein-zonder-verzwaring`, `netcongestie-oplossen` — vier pagina's van exact dezelfde soort, zonder zichtbaar onderscheidend criterium. Alle `lastmod`-waarden staan op **2026-06-20 (36×)** of **2026-06-23 (3×)**, inclusief die van `https://vibeenergy.nl/` zelf. `robots.txt` bevat `User-agent: *` / `Allow: /` zonder enige `Disallow`. Master v1 is gelockt in commit `aae26bf`; een `lastmod` van 2026-06-20 voor de homepage-URL is daarmee aantoonbaar onjuist. |
| **MASTER V1 RULE** | `index.html:39` zet `<link rel="canonical" href="https://vibeenergy.nl/">` en `:40` `robots index,follow`; de homepage is in september volledig herschreven. |
| **MIGRATION ACTION** | Werk `lastmod` bij naar de werkelijke wijzigingsdatum. **DECIDED — V1.0 (`C-03`)**: het opnamecriterium voor de zeven guides is nu bepaald — ze zijn **gated** en gaan er dus **uit**, alle zeven. Concreet vervallen de drie huidige entries `https://vibeenergy.nl/energie-als-vastgoedopbrengst` (`sitemap.xml:16`), `https://vibeenergy.nl/capaciteit-als-dienst` (`:118`) en `https://vibeenergy.nl/energiehandel-flexmarkten` (`:124`); de vier die er niet in staan blijven eruit. Daarmee gaat de sitemap van 39 naar 36 `<loc>`-entries en verdwijnt het onverklaarde 3-in/4-uit-verschil. Uitvoeren bij stap 7 (`S2`), samen met de `noindex`-behandeling uit `L-15`. |
| **RISK** | Middel |

### L-28 · Drie interne designprototypes staan publiek crawlbaar in de webroot

| Veld | Inhoud |
|---|---|
| **LOCATION** | `popup-designs.html`, `popup-designs-met-afbeelding.html`, `cookie-popup-designs.html` |
| **CURRENT STATE** | Titels: "Vibe — Popup designs", "Vibe — Popup designs met afbeelding", "Cookiemelding — 5 designs · Vibe Energy". Gemeten per pagina: `rel="canonical"` 0, `name="robots"` 0, `<main` 0; `<h1` = 0 / 0 / 1. `popup-designs.html` en `popup-designs-met-afbeelding.html` laden wél GTM (2 treffers) en `_consent.js`, maar geen Meta Pixel (`fbq(` = 0); `cookie-popup-designs.html` laadt geen van drieën. Geen van de drie staat in `sitemap.xml`, maar `robots.txt` bevat `Allow: /` zonder `Disallow`, dus ze zijn vindbaar en indexeerbaar. |
| **MASTER V1 RULE** | Master v1 publiceert alleen pagina's die deel uitmaken van de site: `index.html:1063-1065` laat routes expliciet weg zodra de bestemming niet bestaat of niet bedoeld is. Interne designvarianten horen niet tot de publieke routeset. |
| **MIGRATION ACTION** | Verplaats naar een niet-gepubliceerde map, of voeg `<meta name="robots" content="noindex">` plus een `Disallow` in `robots.txt` toe. Geen inhoudelijke migratie nodig. |
| **RISK** | Middel |

### L-30 · 47 ongerefereerde assetbestanden van samen 44,38 MB in de gepubliceerde webroot

| Veld | Inhoud |
|---|---|
| **LOCATION** | Webroot `/Users/mounirvanbinsbergen/projects/vibe-website/` — 12 `.mp4` (39,94 MB), 11 `.jpg` (4,09 MB), 20 `.woff2` met GUID-namen (0,22 MB), 3 `.js` met GUID-namen (0,12 MB), `ec.css` (8 KB) |
| **CURRENT STATE** | Geen enkel `*.html`, `*.js`, `*.css`, `*.xml` of `*.json` in de webroot of in `assets/`, `img/`, `api/`, `scripts/` of `review/` noemt deze 47 bestandsnamen (zelfreferentie in het bestand zelf uitgesloten — `ec.css:1` noemt alleen zijn eigen naam in een commentaar). Grootste posten: `roi-bg.mp4` 7,81 MB, `section5-bg.mp4` 5,82 MB, `ems-room1-hvac.mp4` 4,06 MB, `ems-room3-meeting.mp4` 3,04 MB, `ems-room2-lighting.mp4` 3,02 MB, `ems-exterior-battery.mp4` 2,86 MB, `0205-2026_Vibe-drone_small.mp4` 2,76 MB, `ems-exterior-battery-v2.mp4` 2,74 MB, `fb4bd3f3-d9b5-40ba-9904-a08dc7da3b34.mp4` 2,74 MB, `section2-scroll.mp4` 2,74 MB, `DJI_0643.mp4` en `DJI_0643_small.mp4` elk 1,18 MB. **Aangescherpt t.o.v. het bewijsbestand**: `ems-exterior-battery-v2.mp4`, `fb4bd3f3-d9b5-40ba-9904-a08dc7da3b34.mp4` en `section2-scroll.mp4` zijn nu met een hashvergelijking **bewezen identiek** — alle drie md5 `320cda8940e45cd925624d1b1c7ae0ee` (het bewijsbestand noemde dit nog een vermoeden). `DJI_0643.mp4` en `DJI_0643_small.mp4` zijn ondanks vrijwel gelijke grootte **niet** identiek (md5 `2be2dd34…` vs `9c5f195b…`). |
| **MASTER V1 RULE** | Master v1 levert beeld uit de gestructureerde map `assets/home/` met expliciete `srcset` en breedtes (`index.html:84-88, 344, 361, 379, 437, 467, 539, 839, 857, 915, 957, 1019`). Losse, ongerefereerde media in de webroot horen daar niet bij. |
| **MIGRATION ACTION** | Verifieer per bestand of het buiten deze repository wordt gebruikt en ruim daarna op. De drie identieke `.mp4`'s (5,48 MB aan pure duplicatie) kunnen sowieso tot één bestand worden teruggebracht. |
| **RISK** | Middel |

### L-31 · Titelscheidingsteken en woordmerk zijn versplinterd over vijf varianten

| Veld | Inhoud |
|---|---|
| **LOCATION** | De `<title>`-tags van alle 47 pagina's; woordmerk `vibe·energy` in `projecten.html:16, 133, 138, 141`, `contact.html:19, 226`, `netcongestie-check.html:178, 183, 186`, `oplossing-energielabel.html:359, 364, 367`, `oplossing-paris-proof.html:327, 332, 335` |
| **CURRENT STATE** | Vijf patronen naast elkaar: (1) `… \| Vibe Energy` — `index.html:16`, alle `systeem-*`, `industrie-*`, `oplossing-*`, `energy-hubs`, `microgrids`, `netcongestie-check`; (2) `… — Vibe Energy` — alle elf `project-*.html`, `404.html`, `algemene-voorwaarden.html`, `privacy.html`; (3) `Executive Guide — … · Vibe Energy` — de zeven report-pagina's; (4) `vibe·energy — …` — `projecten.html:16`, `contact.html:19`; (5) **merknaam vooraan zonder suffix** — `over-ons.html` ("Over Vibe Energy — één partner voor uw energie") en `waarom-vibe.html` ("Waarom Vibe — exploitant, geen leverancier"). De schrijfwijze `vibe·energy` (kleine letters, middenpunt) staat ook in **vijf** `og:title`/`twitter:title`/JSON-LD-`name`-sets. Daarnaast dragen **zeven** projecttitels een dubbele spatie na het gedachtestreepje: `project-arnhem-60.html`, `project-burchtstraat.html`, `project-ketsheuvel.html`, `project-nieuw-schoonoord.html`, `project-purmerend.html`, `project-schouwburgring.html`, `project-van-beethovenstraat.html` — bijvoorbeeld `<title>Arnhem —  60 woningen verduurzaamd — Vibe Energy</title>`. **AFWIJKING**: het bewijsbestand noemt vier patronen; ik tel er vijf. |
| **MASTER V1 RULE** | `index.html:16` hanteert `<onderwerp> \| Vibe Energy`; `:43-45` zet `og:site_name` en `og:title` op "Vibe Energy". Het woordmerk wordt in header en footer in kapitalen in twee delen getoond, VIBE en ENERGY (`index.html:136-137`, `:1042-1043`). De schrijfwijze `vibe·energy` komt in Master v1 niet voor. |
| **MIGRATION ACTION** | Kies één titelpatroon — "Vibe Energy" als merknaam met `\|` als scheiding — en pas het site-breed toe, inclusief de vijf `og:`/`twitter:`/JSON-LD-`name`-sets. Verwijder de dubbele spaties in de zeven projecttitels. |
| **RISK** | Middel |

### L-32 · CTA-labels zijn versplinterd over ruim veertig varianten voor dezelfde handelingen

| Veld | Inhoud |
|---|---|
| **LOCATION** | Alle `*.html`; tellingen over de hele site |
| **CURRENT STATE** | **Afspraak maken** — `Plan gesprek` 19× in `*.html` plus 3× in `*.js`; `Plan adviesgesprek` 9×; `Plan Adviesgesprek` 2× (o.a. `microgrids.html:215`); `Plan een gesprek` 9×. Verschillend hoofdlettergebruik binnen dezelfde variant. **Netcongestiecheck** — `Doe de Netcongestie Check` 18×; `Doe de check →` 7× (o.a. `project-arnhem-60.html:68`); `Doe de netcongestie-check →` 4× (o.a. `project-ratio-16.html:104`). **Analyse-aanvraag** — 13 unieke varianten van "Vraag een … aan": businesscase (4×), labelanalyse (3×), vastgoedanalyse, recreatiescan, portefeuille-analyse, opslaganalyse, laadscan, dakanalyse, Paris Proof-analyse, EMS-analyse (elk 2×), logistieke energiescan, VvE-scan, VvE-energiescan (elk 1×). **Berekening** — 10 unieke varianten van "Bereken uw …": businesscase (2×), sizing, potentieel, portefeuille, park, pand, opbrengst, locatie, laadveld, laadplein. **AFWIJKING**: het bewijsbestand noemt "Plan gesprek 21×", "Plan een gesprek 6×", "ruim vijftien" analysevarianten en "acht" berekenvarianten; gemeten zijn respectievelijk 19 (+3 in JS), 9, 13 en 10. |
| **MASTER V1 RULE** | Master v1 gebruikt vier CTA-labels voor de hele pagina: "Plan een gesprek" (`index.html:157, 174, 189`), "Bekijk onze aanpak" (`:192`), "Neem contact op" (`:903, 1106`), plus navigerende labels "Bekijk de case" (`:513`), "Meer projecten" (`:516`), "Alle projecten" (`:801`), "Bekijk alle projecten" (`:868`). |
| **MIGRATION ACTION** | Stel een CTA-lexicon vast op basis van de Master v1-labels en normaliseer daarnaartoe. **Let op de volgorde**: de labeltekst stuurt nu gedrag aan via `_footer.js:118` en `:154` (zie L-12). Labels wijzigen verandert dus welke links de Calendly-popup openen — repareer L-12 vóór L-32, niet erna. |
| **RISK** | Middel |

### L-33 · Knopvormtaal: schuin afgesneden hoek met CSS-getekende pijl tegenover de Master-knop met SVG-pijl

| Veld | Inhoud |
|---|---|
| **LOCATION** | `subpage.css:38`, `_header.js:203`, plus zes inline `.cta-pill`-kopieën: `projecten.html:55`, `netcongestie-check.html:56`, `over-ons.html:62`, `oplossing-subsidies.html:63`, `waarom-vibe.html:63`, `oplossing-energielabel.html:63`, `oplossing-paris-proof.html:63`; en `projecten.html:111-114` voor `.btn-go` |
| **CURRENT STATE** | `subpage.css:38` zet op `.btn` `clip-path:polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)` — een schuin afgesneden rechterrand — en tekent de pijl met een 1px-lijn plus een geroteerd vierkantje in `::after` (`:39-40`). `_header.js:203` doet hetzelfde voor `.cta-pill` met een **8px**-afsnijding. De zes inline `.cta-pill`-kopieën gebruiken eveneens 8px. `projecten.html:111-114` herhaalt het pijlpatroon voor `.btn-go` zonder clip-path. `tokens.css:90-94` dwingt daarnaast `border-radius:0!important` af op `.btn-p, .btn-s, .btn-go, .btn-cta, .pc-herofig, .pc-gal .g, .pc-links a, .mc-core, .mc-panel, .card, .res-cta, .done-state, .inp, .opt, .nc-wizard`. |
| **MASTER V1 RULE** | `home-hero.css:207-235` definieert `.vh-btn`, `.vh-btn-primair` en `.vh-btn-secundair` **zonder** clip-path, met `border-radius:.5637cqw` (10px) en `height:3.5513cqw` (63px); de pijl is een echte inline SVG met `<path d="M4 12h15m-6-6 6 6-6 6"/>` en `stroke-width="2.1"` (`index.html:158, 190, 193`). `home.css:55-57` definieert radiustokens (`--vibe-radius-kaart`, `--vibe-radius-mob:14px`) — het merk is daar dus juist **niet** scherp. |
| **MIGRATION ACTION** | Vervang de clip-path-knoppen en de CSS-pijlen door `.vh-btn`-componenten met SVG-pijl. **Let op**: `tokens.css:90-94` dwingt de scherpe vormtaal met `!important` af; zolang dat bestand geladen wordt, overschrijft het elke radius die een gemigreerde pagina zelf zet. L-18 en L-33 moeten daarom samen worden uitgevoerd. |
| **RISK** | Middel |

### L-34 · Scroll-reveal verbergt op 19 pagina's 12 tot 34 elementen met `opacity:0` tot JavaScript ze vrijgeeft

| Veld | Inhoud |
|---|---|
| **LOCATION** | `subpage.css:333-335` plus vijf inline varianten: `over-ons.html:90`, `waarom-vibe.html:225`, `oplossing-subsidies.html:311`, `oplossing-paris-proof.html:311`, `oplossing-energielabel.html:343`; afgehandeld door `subpage.js:17-23` |
| **CURRENT STATE** | `subpage.css:333` `.reveal{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s ease}`. De vijf inline varianten wijken af: `translateY(24px)` en `.8s` in plaats van `18px` en `.7s`. Gemeten `.reveal`-elementen per pagina: `oplossing-subsidies` 34, `oplossing-paris-proof` 32, `oplossing-energielabel` 30, `over-ons` 24, `oplossing-exploitatie` 22, `energy-hubs` 20, `industrie-logistiek/-recreatie/-residentieel/-vastgoed/-vve` elk 17, `oplossing-netcongestie` 17, `waarom-vibe` 17, `oplossing-laadplein` 15, `microgrids` 12, `systeem-ems/-energieopslag/-laadpalen/-zonnepanelen` elk 12 — samen 19 pagina's. **Nuancering t.o.v. het bewijsbestand**: er is wél een fallback voor ontbrekende `IntersectionObserver` (`subpage.js:20` zet in dat geval `.in` op alle elementen). Er is **geen** `<noscript>`-fallback: met JavaScript volledig uit blijft de inhoud onzichtbaar. De reduced-motion-uitzondering is aanwezig (`subpage.css:335`). |
| **MASTER V1 RULE** | Master v1 gebruikt geen scroll-reveal. De enige `IntersectionObserver` op `index.html` (`:777-781`, `:1222`) stuurt de VIBE.CONTROL-console aan en verbergt geen inhoud. Alle homepagesecties zijn bij eerste paint zichtbaar. |
| **MIGRATION ACTION** | Verwijder het reveal-patroon bij de migratie, of geef het een `<noscript>`-fallback. Harmoniseer in de tussentijd de vijf inline varianten met `subpage.css:333` — ze gebruiken nu andere afstanden (24px vs 18px) en duren (.8s vs .7s). |
| **RISK** | Middel |

### L-41 · Mobiele breekpunten lopen uiteen tussen het Master v1-systeem en de legacy-lagen

| Veld | Inhoud |
|---|---|
| **LOCATION** | `home-mobile.css` tegenover `subpage.css`, `project-case.css`, `_header.js:113, 209, 210`, `_footer.js`, `projecten.html` |
| **CURRENT STATE** | `home-mobile.css` kent **zeven** mediaquery's: `(max-width:1199px)` 3× (`:67, 213, 226`), `(min-width:768px) and (max-width:1199px)` 2× (`:34, 197`), `(hover:none)` (`:236`) en `prefers-reduced-motion` (`:241`). De legacy-lagen gebruiken een heel andere ladder: `subpage.css` heeft 440px (1×), 480px (1×), 520px (2×), **560px (7×)**, 760px (4×), 780px (1×), 860px (2×), **920px (5×)**; `project-case.css` alleen 860px; `_header.js` schakelt de desktopnavigatie uit op **1024px** (`:113, 210`) met een tussenstap op **1180px** (`:209`); `projecten.html` schakelt op 1024, 1180, 980, 760 en 620px; `_footer.js` op 1080, 640 en 430px. Het `.mcta`-blok verschijnt op 760px, het mobiele menu van `_header.js` op 1024px, en het Master-menu op 1199px. |
| **MASTER V1 RULE** | Master v1 hanteert één desktop/mobiel-grens op 1200px: `index.html:1171` `window.matchMedia('(min-width:1200px)')` en `home-mobile.css` `@media (max-width:1199px)`. De homepage wint. **DECIDED — V1.0 (`C-01`)**: **1199px blijft de primaire responsive navigatiegrens**, tenzij implementatiebewijs later iets anders vereist. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: de breekpuntladder van `home-mobile.css` is het systeem; de legacy-stylesheets normaliseren daarnaartoe. Begin bij `_header.js`: de 1024px-omschakeling (`:113`, `:210`) en de 1180px-tussenstap (`:209`) vervallen met het mega-menu (`L-09`, `C-01`), waarmee de zichtbaarste sprong verdwijnt — tussen 1024px en 1199px is er nu een venster waarin de legacy-header al mobiel is en het Master-systeem nog desktop. Het 760px-breekpunt van `.mcta` verdwijnt met `.mcta` zelf (`L-21`, `C-04`). De resterende ladder in `subpage.css` (440/480/520/560/760/780/860/920px), `project-case.css` (860px) en `projecten.html` (1024/1180/980/760/620px) wordt per bouwtype-master genormaliseerd, niet in één keer. Heropeningsvoorwaarde voor 1199px: alleen implementatiebewijs, geen voorkeur. |
| **RISK** | Middel |

### L-42 · Productnaam VIBE.CONTROL wordt door Master v1 geïntroduceerd maar niet gedragen door de bestemmingspagina

| Veld | Inhoud |
|---|---|
| **LOCATION** | `index.html:145, 170, 746, 1073` (links naar `systeem-ems`) tegenover `systeem-ems.html:16, 70, 129` |
| **CURRENT STATE** | Grep op alle varianten van `vibe[ .·_-]?control` over `*.html`, `*.js` en `*.css` levert **vier bestanden**: `index.html` met 10 treffers, alle in de schrijfwijze `VIBE.CONTROL` (`:145, 170, 612, 613, 616, 716, 718, 746, 752, 1073`) plus 3× het anker `vibe-control`; `systeem-ems.html` met één treffer (`:129`, in een consolebalk `<span>EMS · VIBE.CONTROL</span>`); en twee commentaarregels in `home-process.css:5` en `home-control.css:2`. **De schrijfwijze is dus overal identiek — er is geen spellingsvariant.** Het probleem is de dekking: `systeem-ems.html:16` heet in de `<title>` "EMS — slim energiemanagement \| Vibe Energy", de `<h1>` op `:70` luidt "Haal meer uit uw complete *energiesysteem*", en de pagina noemt het product verder consequent "het EMS". De homepage stuurt bezoekers met het label "Ontdek VIBE.CONTROL" (`:746`) en "VIBE.CONTROL (EMS)" (`:1073`) naar een pagina die die naam niet voert. Ook `_header.js:43` en `_footer.js:76` noemen de bestemming alleen "EMS". **AFWIJKING**: het bewijsbestand noemt "precies twee bestanden"; het zijn er vier (twee daarvan alleen in CSS-commentaar). |
| **MASTER V1 RULE** | `index.html:716-718` voert VIBE.CONTROL als productnaam: de eyebrow is "VIBE.CONTROL" en de lead begint met "VIBE.CONTROL stuurt alle energie-assets slim aan". De sectie draagt `id="vibe-control"` (`:613`) en staat in de hoofdnavigatie (`:145`, `:170`). **DECIDED — V1.0 (`C-02`, variant A)**: **VIBE.CONTROL is de commerciële productnaam; EMS blijft de functionele categorie** — en een belangrijke SEO-term. De twee lezingen zijn dus niet tegengesteld maar gelaagd: product bovenop categorie. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: `systeem-ems.html` wordt bij migratie **de VIBE.CONTROL-productpagina met voldoende EMS-context** (`B2`-variant *Systeem*, proofregel: productspecificaties / technische onderbouwing). Toegestane schrijfwijzen naar context: `VIBE.CONTROL`, `Energiemanagementsysteem (EMS)`, of `VIBE.CONTROL EMS`. **Harde randvoorwaarde**: de SEO op *EMS*, *energiemanagementsysteem*, *energie management systeem* en *slim energiemanagement* mag **niet** verloren gaan — de productnaam wordt er dus bovenop gelegd, niet in de plaats van. Dat raakt concreet de `<title>` op `:16` ("EMS — slim energiemanagement | Vibe Energy"), de `<h1>` op `:70` en de lopende tekst, plus de menulabels `_header.js:43` en `_footer.js:76`: die mogen niet tot kaal "VIBE.CONTROL" worden gereduceerd. Een titel die de categorie laat vallen is een regressie, geen migratie. Uitvoeren bij het `B2`-bouwtype, ná de master `systeem-energieopslag.html` (stap 1). |
| **RISK** | Middel |

### L-44 · De map `assets/brochures/` bestaat niet en er is geen enkele PDF in de repository, terwijl het voorbeeldpad in `_leadpopup.js` ernaar verwijst

| Veld | Inhoud |
|---|---|
| **LOCATION** | `_leadpopup.js:9` (binnen het documentatiecommentaar `:1-19`); de assetgap raakt `_leadpopup.js:113, 124, 235, 240, 250, 255` en de zeven `data-brochure-file`-attributen op `capaciteit-als-dienst.html:126`, `netcongestie-oplossen.html:100`, `energiehandel-flexmarkten.html:120`, `energielabel-verhogen.html:124`, `laadplein-zonder-verzwaring.html:112`, `exploitatie-zonder-investering.html:130`, `energie-als-vastgoedopbrengst.html:107` |
| **CURRENT STATE** | Drie metingen. (1) **De map bestaat niet**: `ls assets/brochures` geeft *No such file or directory*; `assets/` bevat 22 losse `.jpg`/`.png`/`.mp4`-bestanden plus de submappen `home/` en `projects/`, geen `brochures/`. (2) **Er bestaat geen enkele PDF**: `find` op `*.pdf` over de hele repository (exclusief `.git`) levert **0 bestanden**, terwijl zeven pagina's een `data-brochure-file`-attribuut naar een `.pdf` dragen en de popup "Gratis brochure" (`:113`) en "Stuur mij de brochure" (`:124`) toont. (3) **Het dode pad**: `_leadpopup.js:9` zet in het gebruiksvoorbeeld bovenaan het bestand `file:'assets/brochures/netcongestie-oplossen.pdf'`. **AFWIJKING t.o.v. de opdrachtformulering**: die noemt `_leadpopup.js:26` en spreekt van een hardgecodeerde standaardwaarde. Gemeten is het anders: `:26` is `LEAD_ENDPOINT`, en `:32-33` luidt `var file = cfg.file \|\| ''; if(!file){ return; }` — er is **geen** hardgecodeerde fallback; zonder `file` in de config opent de popup helemaal niet. Het dode pad staat uitsluitend in het commentaar en wordt dus door geen enkel codepad bereikt. Alle vijf werkelijke configuraties zetten een `.html`-bestand (zie `L-20`). Gevolg: de fout is vandaag **misleidende documentatie boven een reële assetgap**, geen live kapotte link. |
| **MASTER V1 RULE** | `index.html:1099-1102` legt vast dat er geen functies of bestanden worden aangekondigd die er niet zijn — "de nieuwsbrief is in voorbereiding" is om precies die reden uit de footer gehaald. **DECIDED — V1.0 (`C-06`)**: harde regel **NO ASSET → NO DOWNLOAD PROMISE**. Zeven pagina's die een PDF-bestandsnaam dragen zonder dat er één PDF bestaat, zijn daarvan de scherpste schending in de repository. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: (a) het dode voorbeeldpad op `_leadpopup.js:9` corrigeren bij de migratie, zodat het documentatievoorbeeld een bestaand leveringsmodel beschrijft in plaats van een map die nooit heeft bestaan; (b) zolang er 0 PDF's zijn, levert de leadflow een **guidepagina** en belooft de copy geen download (uitwerking in `L-20`); (c) de zeven `data-brochure-*`-attributen worden pas betekenisvol zodra er echte assets zijn — tot die tijd zijn het dode metadata (geen enkel script in deze repository leest ze, en de zeven guides laden zelf geen JavaScript). Vereiste vóór variant `A`: de assets bestaan aantoonbaar in de repository **en** de delivery is getest. **NU GEEN PRODUCTIECODE WIJZIGEN.** Uitvoeren bij stap 7 (`S2`). |
| **RISK** | Middel |

Risicomotivering: `Middel`, niet `Hoog`. De assetgap is een directe `C-06`-schending en de gedeelde wortel onder `L-20` (Middel) en `L-37` (Laag), maar geen enkel live codepad loopt vandaag op het dode pad vast — `_leadpopup.js:33` stopt eerder. Het naar `Hoog` tillen zou dit item boven `L-20` zetten, dat dezelfde belofte aan de leveringskant beschrijft en wél door bezoekers wordt gezien.

---

## 5. Register — LAAG (7)

### L-29 · `_header.html` is een verouderde weesreferentie die niet overeenkomt met de geïnjecteerde header

| Veld | Inhoud |
|---|---|
| **LOCATION** | `_header.html:1-77` |
| **CURRENT STATE** | `:1` zegt `<!-- Reference copy of the shared nav. The live nav is injected by _header.js. -->`. Een grep op `_header.html` over alle `*.html`, `*.js`, `*.json` en `*.xml` levert **nul** referenties. De inhoud loopt achter: vier oplossingen (`:11-14`) tegen negen in `_header.js:24-32`, vier industrieën (`:30-33`) tegen vijf in `_header.js:35-39`, vier systeempagina's (`:49-52`) tegen vijf in `_header.js:42-46`; Energy Hubs en Waarom Vibe ontbreken geheel (het bestand heeft alleen Projecten en Over ons op `:63-69`). Alle links dragen de `.html`-extensie, waar `_header.js` schone URL's gebruikt. Het bestand heeft geen `<html>`-tag en is dus een fragment, maar staat wel opvraagbaar in de webroot. |
| **MASTER V1 RULE** | Master v1 kent geen losse referentiekopieën van componenten; de header staat volledig in `index.html:128-181`. Een niet-gerefereerd fragment dat afwijkt van de werkelijke implementatie is per definitie misleidende documentatie. |
| **MIGRATION ACTION** | Verwijder het bestand, of vervang de inhoud door een verwijzing naar de werkelijke implementatie (`_header.js:22-48`). |
| **RISK** | Laag |

### L-35 · Sectortaxonomie is versplinterd: hetzelfde project draagt drie tot vier verschillende sectorlabels

| Veld | Inhoud |
|---|---|
| **LOCATION** | `project-arnhem-60.html:58` tegenover `projecten.html:188` en `:258`; `project-ratio-16.html:58, 59` tegenover `:62` |
| **CURRENT STATE** | **Woningportefeuilles**: het veld Sector zegt "Residentieel vastgoed" (`project-arnhem-60.html:58` zelfs "Residentieel vastgoed · belegger"); `projecten.html:258` zegt in de kaartmeta "Woningportefeuille · belegger"; de filterchip op `projecten.html:188` heet "Woningportefeuilles" met `data-f="Woningen"`. **Ratio 16**: het kruimelpad (`project-ratio-16.html:58`) en de eyebrow (`:59`) zeggen "Netcongestie & Energy Hubs" — een **oplossings**categorie — terwijl het veld Sector op `:62` "Commercieel vastgoed" zegt; de filterchip op `projecten.html:185` heet "Netcongestie &amp; Energy Hubs" met `data-f="Netcongestie"`. Eén filteras mengt dus sectoren (Automotive, Recreatie, Woningen, Bedrijfspanden) met een oplossing (Netcongestie). |
| **MASTER V1 RULE** | `index.html:230-234` stelt de sectorverzameling vast als "Commercieel vastgoed, Residentieel vastgoed, Bedrijfspand, Automotive en Recreatie" — vijf waarden, afgelezen uit het Sector-veld van de elf casepagina's — en gebruikt in de sectorkaarten van sectie 7 de labels Vastgoed (`:924`), Logistiek (`:929`), Recreatie (`:934`) en Woningportefeuilles (`:939`), gelinkt vanaf `:922`, `:927`, `:932` en `:937`. Master v1 linkt **niet** naar `industrie-vve`: de sectie telt vier sectorkaarten, geen vijf. **DECIDED — V1.0 (`C-05`)**: er komt één canonieke taxonomie van **5 sectoren + 1 segment**, bewust breed gehouden; zie de tabel hieronder. |
| **MIGRATION ACTION** | **DECIDED — V1.0**: de canonieke taxonomie hieronder is leidend en wordt op alle vijf de plaatsen toegepast (kruimelpad, eyebrow, Sector-veld, kaartmeta, filterchip). Sector en oplossing worden in **twee filterassen** gesplitst: "Netcongestie & Energy Hubs" is geen sector maar een probleem/oplossing en verhuist van de sector-as naar de oplossing-as (`B2`-variant *Oplossing*) — dat raakt de filterchip `projecten.html:185` en het kruimelpad plus de eyebrow van `project-ratio-16.html:58-59`, dat als Sector `Commercieel vastgoed` houdt (`:62`). Uitvoeren bij de `B3`-master `project-ratio-16.html` (stap 2) en de `B4`-master `projecten.html` (stap 3). Waar geen case bestaat, staat **CASE PROOF = PENDING** — niets verzinnen. |
| **RISK** | Laag |

**`C-05` · Canonieke sectortaxonomie V1.0** — vastgelegd besluit, met de bewijsstatus per rij:

| Canoniek | Legacy-labels | Pagina | Cases | Bewijsstatus | Aanbevolen URL |
|---|---|---|---|---|---|
| Commercieel vastgoed | Vastgoed, Bedrijfspand, Bedrijfspanden | `industrie-vastgoed` | `purmerend`, `ratio-16` | VERIFIED (2) | `/sector/commercieel-vastgoed` |
| Woningportefeuilles | Residentieel vastgoed, Residentieel | `industrie-residentieel` | `arnhem-60`, `burchtstraat`, `ketsheuvel`, `nieuw-schoonoord`, `schouwburgring`, `van-beethovenstraat` | VERIFIED (6) | `/sector/woningportefeuilles` |
| Recreatie | — | `industrie-recreatie` | `dormio-medemblik` | VERIFIED (1) | `/sector/recreatie` |
| Logistiek & transport | Logistiek | `industrie-logistiek` | geen | CASE PROOF = PENDING | `/sector/logistiek` |
| Automotive | — | **ONTBREEKT (PAGE PENDING)** | `hedin-alkmaar`, `hedin-amsterdam` | VERIFIED (2), pagina ontbreekt | `/sector/automotive` |
| VvE (segment binnen Woningportefeuilles) | — | `industrie-vve` | geen | CASE PROOF = PENDING | `/sector/woningportefeuilles/vve` |

Vastgestelde asymmetrieën die de taxonomie moet opheffen: **Automotive** heeft 2 cases maar géén sectorpagina (gemeten: er zijn precies vijf `industrie-*.html` — `logistiek`, `recreatie`, `residentieel`, `vastgoed`, `vve`; geen `industrie-automotive`); **Logistiek** heeft een sectorpagina maar 0 cases; **VvE** heeft een sectorpagina maar 0 cases, en Master v1 linkt er niet naar; **"Netcongestie & Energy Hubs"** staat ten onrechte op de sector-as van `projecten.html:185`.

**AFWIJKING t.o.v. de aangeleverde inventarisatie.** Twee tellingen in de bronopgave kloppen niet met wat ik in deze sessie meet, en de gemeten waarde staat hierboven:

| Opgave | Gemeten (deze sessie) | Meetpunt |
|---|---|---|
| `project-arnhem-60.html` heeft geen Sector-veld | Het veld **bestaat wél**: `Sector · Residentieel vastgoed · belegger` | `project-arnhem-60.html:58` |
| Sector-veld: Residentieel vastgoed ×5, ontbreekt ×1 | **Residentieel vastgoed ×6**, ontbreekt ×0 — alle 11 casepagina's dragen een Sector-veld | `project-{arnhem-60,burchtstraat,ketsheuvel,nieuw-schoonoord,schouwburgring,van-beethovenstraat}.html:58` |
| Kruimelpad: Woningportefeuilles ×5 | **Woningportefeuilles ×6** (verder: Automotive ×2, Recreatie ×1, Bedrijfspanden ×1, Netcongestie & Energy Hubs ×1) | dezelfde zes bestanden, `:54`; overige op `:54`/`:58` |

De canonieke tabel zelf is met de gemeten waarden consistent: ze noemt al zes cases onder Woningportefeuilles. Alleen de losse constatering "Sector-veld ontbreekt bij `arnhem-60`" vervalt.

### L-36 · Ongeldige HTML-entity `CO&sub2;` in het mega-menu rendert als letterlijke tekst

| Veld | Inhoud |
|---|---|
| **LOCATION** | `_header.js:31` |
| **CURRENT STATE** | `['oplossing-paris-proof','paris','Paris Proof vastgoed','Voldoe aan de CO&sub2;-norm voor 2050']` — de enige treffer op `CO&sub2;` in de repository. `&sub2;` is geen gedefinieerde HTML-entity (`&sub;` bestaat wel en betekent ⊂). De string is `it[3]` in de menudefinitie en wordt via stringconcatenatie in `mega()` (`_header.js:120`, desktop-`<small>`) en `mobileSec()` (`:131`, mobiel-`<small>`) opgebouwd en met `document.write(nav)` op `:165` in de DOM gezet — op **alle 35 pagina's** die de gedeelde header laden. |
| **MASTER V1 RULE** | `index.html:320` schrijft hetzelfde subscript correct als markup: `Minder CO<sub>2</sub>, meer impact.` Master v1 gebruikt verder alleen geldige entities (`&Eacute;`, `&eacute;`, `&middot;`, `&mdash;`, `&iuml;`). |
| **MIGRATION ACTION** | Vervang door `CO<sub>2</sub>` of door het teken `CO₂`. Eenregelige correctie die 35 pagina's raakt. |
| **RISK** | Laag |

### L-37 · Spelfout in een brochurebestandsnaam: "zodner" in plaats van "zonder"

| Veld | Inhoud |
|---|---|
| **LOCATION** | `laadplein-zonder-verzwaring.html:112` |
| **CURRENT STATE** | `<body data-brochure-title="Laadplein zonder netverzwaring" data-brochure-file="Vibe brochure Laadplein zodner Verzwaring.pdf" data-brochure-slug="laadplein">`. Grep op `zodner` levert deze **ene** treffer in de hele repository. Het attribuut wordt door geen enkel script in deze repository gelezen en het genoemde PDF-bestand bestaat hier niet (zie L-20: 0 PDF's), dus de fout heeft binnen deze codebase geen zichtbaar effect. |
| **MASTER V1 RULE** | Master v1 stelt geen regel over deze attributen, maar `index.html:1099-1102` legt wel vast dat er geen functies of bestanden worden aangekondigd die niet bestaan. **DECIDED — V1.0 (`C-06`)**: onder **NO ASSET → NO DOWNLOAD PROMISE** verwijst dit attribuut naar een PDF die in deze repository niet bestaat — net als de andere zes (zie `L-44`: 0 PDF's, `assets/brochures/` bestaat niet). |
| **MIGRATION ACTION** | **DECIDED — V1.0**: de spelfout wordt **niet los gerepareerd**. Zolang er geen asset is, is het attribuut dode metadata; een correcte bestandsnaam naar een niet-bestaand bestand is geen verbetering. De correctie hoort bij het moment waarop een echt asset wordt geleverd (variant `A` van `C-06`) — dan wordt de naam vastgesteld op het bestand dat er werkelijk is, samen met de andere zes `data-brochure-file`-waarden. Wordt er geen asset geleverd, dan vervalt het attribuut met de rest (`L-20`, `L-44`). **NIET VERIFIEERBAAR VANUIT REPO**: of de brochure-API dezelfde bestandsnaam gebruikt, is van binnen deze repository niet te meten — dat blokkeert het besluit niet meer, want de naam wordt hoe dan ook afgeleid van het asset in de repo, niet van een extern endpoint. Uitvoeren bij stap 7 (`S2`). |
| **RISK** | Laag |

### L-38 · Master v1 citeert in een codecommentaar een FAQ-zin die nergens in deze repository bestaat

| Veld | Inhoud |
|---|---|
| **LOCATION** | `index.html:976` |
| **CURRENT STATE** | Het commentaar luidt: `de site belooft zelf 48 uur (FAQ: "Binnen 48 uur weet u wat haalbaar is")`. Een grep op die zin en op het fragment "wat haalbaar is" levert vier treffers: dit commentaar zelf (`index.html:976`), `projecten.html:296` ("laten zien wat haalbaar is"), `_header.js:33` ("zie binnen twee minuten wat haalbaar is op uw aansluiting") en `_header.html:18` (dezelfde zin). **De geciteerde FAQ-zin bestaat niet.** De 48-uurbelofte zelf is wél onderbouwd — 14 pagina's tonen "Reactie binnen 48 uur" en `over-ons.html:597` herhaalt hem (zie L-23) — alleen de bronvermelding klopt niet. |
| **MASTER V1 RULE** | `index.html:223-255` zet de norm dat elk cijfer en elke belofte herleidbaar is tot een bestaande bron. Een citaat dat niet te vinden is, ondermijnt die norm in het bestand dat hem stelt. |
| **MIGRATION ACTION** | Corrigeer het commentaar zodat het naar een bestaande vindplaats verwijst (bijvoorbeeld `over-ons.html:597` of een van de 14 eind-CTA-banden). De conclusie zelf — 48 uur in plaats van 24 — blijft overeind. |
| **RISK** | Laag |

### L-39 · Dode legacy-scripts in Master v1 zelf: drie IIFE's die naar niet-bestaande elementen zoeken

| Veld | Inhoud |
|---|---|
| **LOCATION** | `index.html:1177-1241` |
| **CURRENT STATE** | Drie functies met een early return: `initNav()` zoekt `document.getElementById('topnav')` (`:1180`), `ems()` zoekt `'emsConsole'` (`:1200`) en `faq()` zoekt `'faqList'` (`:1228`). Gemeten: geen van die drie id's komt elders in `index.html` voor — de enige treffers zijn exact deze drie regels. `initNav` is bovendien een duplicaat van de logica die `_header.js:212-240` al bevat, en `ems()` dupliceert het script dat de homepage voor de eigen VIBE.CONTROL-console gebruikt (`index.html:752-783`, dat wél een bestaand element aanstuurt). |
| **MASTER V1 RULE** | `home.css:9-15` documenteert dat de volledige stylesheet van de vorige homepage is verwijderd nadat gemeten was dat 128 van de 132 klassen nergens meer matchten. Dezelfde opruiming is op de scriptlaag niet uitgevoerd. |
| **MIGRATION ACTION** | Verwijder de drie blokken (`:1177-1241`). Ze zijn functioneel inert — elk keert onmiddellijk terug — maar het is ~65 regels dode code in het bestand dat als referentie dient. |
| **RISK** | Laag |

### L-40 · Inconsistente ampersand-escaping in tekstknopen

| Veld | Inhoud |
|---|---|
| **LOCATION** | 22 pagina's; o.a. `project-ratio-16.html:58, 59`, `project-arnhem-60.html:63`, `capaciteit-als-dienst.html:378`, `oplossing-paris-proof.html:278`, `index.html:16` |
| **CURRENT STATE** | Beide schrijfwijzen bestaan naast elkaar voor dezelfde tekst. Correct geëscaped: `projecten.html:185` "Netcongestie &amp; Energy Hubs", `_header.js:28` "Energiehandel &amp; Flexmarkten", `_header.js:36` "Kantoren &amp; vastgoed". Rauw: `project-ratio-16.html:58-59` "Netcongestie & Energy Hubs", `project-arnhem-60.html:63` "VvE & woningbouw", `capaciteit-als-dienst.html:378` "Energiehandel & Flexmarkten", `oplossing-paris-proof.html:278` "Analyse & implementatie". Ook de `<title>` van `index.html:16` draagt een rauwe `&` ("Energieoplossingen voor bedrijven & vastgoed \| Vibe Energy"). |
| **MASTER V1 RULE** | Master v1 escapet in de body consequent (`index.html:546` `&Eacute;&eacute;n`, `:808` `&middot;`, `:833` `&mdash;`, `:880` `ge&iuml;ntegreerde`) maar laat in de `<title>` op `:16` een rauwe `&` staan. **De homepage is hier dus zelf niet strikt; er is geen eenduidige regel uit af te leiden.** |
| **MIGRATION ACTION** | **DECISION REQUIRED — blijft open.** `C-01` t/m `C-07` raken dit punt niet; het is geen merk-, scope- of claimbesluit maar een codeerconventie. Leg vast of de repo `&amp;` verplicht stelt in tekstknopen, inclusief titels, en pas die regel daarna site-breed toe inclusief `index.html:16`. HTML5 tolereert een losse `&` die niet op een entity lijkt, dus dit is een consistentie- en geen renderprobleem. Let op de samenloop met `L-35`: de chip "Netcongestie &amp; Energy Hubs" (`projecten.html:185`) verhuist met `C-05` sowieso naar de oplossing-as, dus die tekstknoop wordt daar hoe dan ook aangeraakt. |
| **RISK** | Laag |

---

## 6. Afhankelijkheden tussen items

Negen afhankelijkheidsparen zijn gemeten. Acht gelden nog; één is met `C-03` opgeheven en blijft
doorgestreept staan als auditbewijs. Deze volgorde volgt uit de metingen, niet uit voorkeur.

| Moet eerst | Dan pas | Waarom (gemeten) |
|---|---|---|
| L-12 (Calendly-regex ontkoppelen) | L-32 (CTA-labels normaliseren) | `_footer.js:118` en `:154` matchen op linktékst; labels wijzigen verandert welke links de popup openen |
| L-11 + L-10 (overlays en footer naar Urbanist/`#0073FE`) | L-19 (fontlink en `tokens.css` uit `index.html`) | `index.html:37` en `:56` zijn functioneel nodig zolang die componenten Archivo/IBM Plex/JetBrains gebruiken |
| L-18 (`tokens.css` uitfaseren) | L-33 (knopvormtaal migreren) | `tokens.css:79-82` dwingt `border-radius:0!important` af op de doelklassen |
| ~~L-15 (publiek-of-gated-besluit)~~ → **beslist met `C-03`** | L-25 + L-27 (koppenstructuur, sitemap) | **Opgeheven.** De blokkade was het ontbrekende besluit; dat is genomen (gated). Beide ingrepen zijn nu uitvoerbaar bij stap 7 (`S2`) |
| L-09 (header migreren) | L-24 (`<main>` + skiplink) | De skiplink hoort direct achter `<body>` en vóór de geïnjecteerde header |
| Extractie van de bevroren `.vibe-*`-primitives uit `index.html` | Elke migratieactie die een componentdoel noemt | De bibliotheek bestaat nog niet in code (§2); het **doel** ligt met de bevroren primitieveset wél vast |
| L-21 (`.mcta` verwijderen, `C-04`) | L-22 (de 25 "Bel"-knoppen) | 25 van de 26 `.mcta`-blokken dragen die knop; verwijderen van het blok lost het defect op — losse reparatie is weggegooid werk |
| L-44 (assetgap: 0 PDF's, `assets/brochures/` ontbreekt) | L-20 + L-37 (brochurebelofte, bestandsnaam) | `NO ASSET → NO DOWNLOAD PROMISE`: zonder asset is variant `A` onmogelijk en is de spelling van een niet-bestaand bestand betekenisloos |
| L-15 (`C-03`: gated) + een werkende leadflow voor `capaciteit-als-dienst` | L-16 (de sectie-2-CTA op `index.html:308`) | Die guide wordt door géén van de vijf `VIBE_LEAD`-configuraties aangeboden; zonder leadflow verwijst de CTA naar een belofte zonder levering |

**Migratievolgorde V1.0 (definitief).** `DESIGN SYSTEM V1.0 FREEZE → MASTER PAGE PER BOUWTYPE →
VISUAL + FUNCTIONAL REVIEW → MASTER LOCK → OVERIGE PAGINA'S VAN DAT TYPE → QA → VOLGENDE`. De
afhankelijkheden hierboven gelden *binnen* die volgorde; ze vervangen hem niet.

| Stap | Bouwtype | Master | Items die hier landen |
|---:|---|---|---|
| 1 | `B2` Propositiepagina | `systeem-energieopslag.html` | L-07, L-08, L-24, L-26, L-33, L-34, L-41 · en voor de variant *Systeem*: L-42 (`C-02`) |
| 2 | `B3` Casepagina | `project-ratio-16.html` | L-05, L-24, L-31, L-35 (`C-05`), L-40 |
| 3 | `B4` Indexpagina | `projecten.html` | L-01, L-02, L-03, L-04, L-05, L-35 (filterassen), L-24 |
| 4 | `B6` Conversie-instrument | `contact.html` | L-13, L-14, L-23 (variant *wizard*: `netcongestie-check.html`) |
| 5 | `B5` Standpuntpagina | `waarom-vibe.html` | L-24, L-31, L-34 |
| 6 | `B7` Juridisch document | `privacy.html` | **L-06** (registerbesluit valt hier) |
| 7 | `S2` Executive Guide (gated) | de zeven guides | L-15, L-16, L-17, L-20, L-25, L-27, L-37, L-43, L-44 |
| — | gedeelde lagen, doorlopend | `_header.js`, `_footer.js`, `_consent.js`, `_leadpopup.js` | L-09 (`C-01`), L-10, L-11, L-12, L-19, L-21 (`C-04`), L-22, L-36, L-43 |

`B1` Startpagina is al Master v1 en wordt **niet** opnieuw gebouwd; `L-38` en `L-39` zijn
opruimacties binnen dat bevroren bestand en raken de bouwtypevolgorde niet.

---

## 7. Wat dit register níét vaststelt

- **Geen live-metingen.** Alles is gemeten tegen de werkboom op commit `aae26bf`. Productiegedrag van schone URL's, van de brochure-API (`https://vibe-website-api-production.up.railway.app/api/brochure`) en van de lead-endpoint (`https://dashboard.vibeenergy.nl/api/public/site/lead`) is **NIET GEMETEN** — daarvoor is toegang tot de live server nodig.
- **Geen browsermeting.** Renderresultaat, LCP, CLS en feitelijke zichtbaarheid van `.reveal`-inhoud zijn **NIET GEMETEN**; alleen de CSS- en JS-bronregels zijn gelezen.
- **Geen volledigheidsclaim.** Het register bevat 44 items: de 42 aangeleverde en geverifieerde, plus `L-43` en `L-44` uit de besluitenronde. Het is geen uitputtende audit van de codebase; wat niet in `legacy.json` stond en niet in de opdracht werd benoemd, is niet systematisch gezocht.
- **Geen prioritering naar business-impact.** De risiconiveaus van de oorspronkelijke 42 komen uit het bewijsbestand en zijn inhoudelijk getoetst, maar niet herwogen tegen commerciële prioriteiten. De niveaus van `L-43` (Hoog) en `L-44` (Middel) zijn in deze ronde toegekend; de motivering staat onder het item zelf.
- **Geen besluiten over ontbrekende businessinformatie.** Waar een besluit een bedrijfsgegeven vereist dat niet in de repository staat, is dat als **CONTENT PENDING** gemarkeerd in plaats van ingevuld. Gemeten gevallen: de zakelijke centrale guide-bestemming (`L-17`), de kWp per project (`L-02`), en de primaire bronnen achter 47 / 12 MWp / 98% (`L-01` t/m `L-03`) en achter de drie leadpopup-cijfers (`L-43`).
- **Geen bewijs waar het niet bestaat.** In de canonieke sectortaxonomie (`C-05`, bij `L-35`) staat **CASE PROOF = PENDING** waar geen case bestaat, en **PAGE PENDING** waar geen sectorpagina bestaat. Die velden zijn niet met aannames ingevuld.
- **Geen productiecode aangeraakt.** Ook in deze besluitenronde is geen HTML, CSS, JS, asset, `sitemap.xml` of `robots.txt` gewijzigd. De besluiten `C-01` t/m `C-07` staan hier vastgelegd; ze zijn hier niet uitgevoerd. De homepage is onveranderd byte-for-byte gelijk aan HEAD `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1`.

---

*Registratie, geen correctie. Besluiten `C-01` t/m `C-07` vastgelegd op 2026-09-29; homepage bevroren op `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1`.*
