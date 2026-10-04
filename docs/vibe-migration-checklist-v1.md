# Vibe migratiechecklist v1 — harde controles per pagina

**Referentie:** commit `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1` — "feat: lock homepage master v1".
**Bevroren:** `index.html` + `home.css` + `home-hero.css` … `home-footer.css` + `home-mobile.css`. Niet aanraken.
**Toepassing:** draai deze lijst één keer volledig per pagina. Een pagina is pas af als sectie 6 (OPLEVERING) compleet is ingevuld met gemeten waarden.
**Volgorde:** in welke volgorde pagina's aan de beurt komen, staat in **§0** (migratiemethodiek). Die volgorde is genomen beleid, geen voorstel: eerst de masterpagina van een bouwtype, dan pas de rest van dat type. Lees §0 vóór §1.
**Twee stappen zijn onoverkomelijk:** **§1.2 claimverificatie** (vijf statussen, 0 CONFLICTING) en **§1.4.1 assetverificatie** (NO ASSET → NO DOWNLOAD PROMISE). Een pagina die daar niet doorheen komt, wordt niet gebouwd — ongeacht hoe de QA-poorten eruitzien.

Elke regel hieronder verwijst naar `bestand:regel`. Waar een regel geen verwijzing draagt, is het een procesafspraak, geen meting.

---

## Systeemfeiten die de hele lijst dragen

Lees dit eerst; de rest van de checklist is ervan afgeleid.

| Feit | Gemeten waarde | Bron |
|---|---|---|
| Breekpuntset (enige plek waar hij staat) | `<=767 mobiel · 768-1199 tablet · >=1200 desktopmaster` | `home-mobile.css:9-13` |
| Hoofdgrens | 12 blokken `@media (max-width: 1199px)` | `home-control.css:294`, `home-final.css:329`, `home-footer.css:302`, `home-hero.css:397`, `home-infra.css:339`, `home-mobile.css:67`, `home-mobile.css:213`, `home-mobile.css:226`, `home-process.css:215`, `home-project.css:223`, `home-proof.css:376`, `home-solutions.css:332` |
| Tabletlaag | 11 blokken `@media (min-width: 768px) and (max-width: 1199px)` | `home-control.css:366`, `home-final.css:418`, `home-footer.css:396`, `home-hero.css:495`, `home-infra.css:428`, `home-mobile.css:34`, `home-mobile.css:197`, `home-process.css:292`, `home-project.css:300`, `home-proof.css:469`, `home-solutions.css:458` |
| Componentgrenzen | 768-859 (hero proof-strip), 1000-1199 (footergrid), 1024-1199 (oplossingenraster) | `home-hero.css:529`, `home-footer.css:425`, `home-solutions.css:490` |
| Niet-breedte-queries | `hover:none` 1×, `prefers-reduced-motion` 3× | `home-mobile.css:236`; `home.css:93`, `home-control.css:280`, `home-mobile.css:241` |
| Totaal media-blokken in de homepage-CSS | 30 | gemeten over `home*.css` |
| Merkblauw / navy | `#0073FE` / `#08203C` | `home.css:35`, `home.css:41` |
| Elevatieniveaus | 3 tokens: `--vibe-elev-1`, `--vibe-elev-2`, `--vibe-elev-mob` | `home.css:60-65` |
| Geometrie | `clip-path` in 8 van 9 sectiebestanden; `home-project.css` = 0 | zie tabel in §2.5 |
| Scrim zonder geknipte rand (S3) | `linear-gradient(90deg,#001632 0%,#001632 20%,…,rgba(0,22,50,0) 70%)` | `home-project.css:69-83` |
| Gedeelde componentbibliotheek | **bestaat niet** — zie hieronder | — |

### Er is GEEN componentbibliotheek. Dit is de belangrijkste beperking van deze migratie.

Master v1 is **visueel consistent maar structureel geen bibliotheek**. Vijftien verschillende CTA-klassen zijn in gebruik; elk is apart gedefinieerd en elk heeft eigen breedte, hoogte en radius. Alleen `.vh-btn` / `.vh-btn-primair` / `.vh-btn-secundair` is een echt gedeeld primitief — en dat wordt uitsluitend in sectie 1 ingezet (`home-hero.css:207-235`, markup `index.html:157-159, 189-194`).

Gemeten (selectorvoorkomens in `home*.css` / markupvoorkomens in `index.html`):

| Klasse | CSS | Markup | Status |
|---|---|---|---|
| `.vh-btn` | 4 | 3 | gedeeld primitief |
| `.vh-btn-primair` | 5 | 2 | variant van het primitief |
| `.vh-btn-secundair` | 5 | 1 | variant van het primitief |
| `.vh-cta` | 9 | 1 | sectie-eigen wikkel |
| `.vh-sol-cta` | 6 | 1 | sectie-eigen |
| `.vh-pr-cta` | 3 | 1 | sectie-eigen |
| `.vh-pr-knop` | 6 | 1 | sectie-eigen |
| `.vh-ctrl-cta` | 6 | 1 | sectie-eigen |
| `.vh-proof-cta` | 8 | 1 | sectie-eigen |
| `.vh-proof-strip-cta` | 5 | 1 | sectie-eigen |
| `.vh-infra-cta` | 7 | 1 | sectie-eigen |
| `.vh-infra-cta2` | 5 | 1 | sectie-eigen |
| `.vh-final-cta` | 6 | 1 | sectie-eigen |
| `.vh-final-cta2` | 6 | 1 | sectie-eigen |
| `.vh-footer-nb-cta` | 6 | 1 | sectie-eigen |

Hetzelfde geldt voor de rest van de bouwstenen: negen eigen eyebrow-klassen (`home-hero.css:249-257`, `home-solutions.css:37-45`, `home-project.css:108-116`, `home-process.css:63-71`, `home-control.css:202-209`, `home-proof.css:68-75` en `:162-169`, `home-infra.css:41-48`, `home-final.css:137-144`), acht eigen H2-klassen (`home-solutions.css:46-55`, `home-project.css:117-125`, `home-process.css:72-81`, `home-control.css:210-219`, `home-proof.css:76-85` en `:170-178`, `home-infra.css:49-58`, `home-final.css:145-154`) en acht eigen lead-klassen (`home-hero.css:268-275`, `home-solutions.css:57-64`, `home-project.css:134-140`, `home-process.css:82-88`, `home-control.css:220-226`, `home-proof.css:180-186`, `home-infra.css:59-65`, `home-final.css:155-161`).

**Consequentie voor de meting:** "hergebruik het component uit de bibliotheek" was in Master v1 een onuitvoerbare instructie. Je kopieert een patroon, geen klasse. Dat blijft de gemeten toestand van `index.html` + `home*.css` en verandert niet — Master v1 wordt hiervoor niet gerefactord (§4.5).

> **DECIDED — V1.0 · er kómt een bibliotheek, en het is de bevroren primitive-set.** Het bibliotheekbesluit is genomen in §0.4: de primitives liggen vast (`.vibe-container`, `.vibe-section`, `.vibe-eyebrow`, `.vibe-heading` + `--*`, `.vibe-lead`, `.vibe-btn` + `--primary` `--secondary` `--ghost` `--text`, `.vibe-card` + `--light` `--dark` `--media`, `.vibe-icon`, `.vibe-icon-tile`, `.vibe-arrow`, `.vibe-metric`, `.vibe-media`), met de HARD RULE *REPEATED VISUAL LANGUAGE → primitive/component; UNIQUE COMPOSITION → sectie-specifieke implementatie*. Sectie-namespacing is daarmee **niet** de bedoelde architectuur voor nieuwe pagina's; het is de historische toestand van Master v1. Motivering: één primitive-set is de enige manier waarop een master zijn volgpagina's kan binden (§0.1).
>
> **Wat dat concreet betekent voor de vijftien CTA-klassen hierboven:** ze worden **niet** in Master v1 geconsolideerd, en ze worden **niet** naar nieuwe pagina's gekopieerd. Een nieuwe pagina gebruikt `.vibe-btn` + variant. De vijftien blijven bestaan zolang `index.html` bevroren is; ze zijn meetbewijs, geen bouwinstructie.
>
> Wat §0.4 **niet** vastlegt, zijn de concrete waarden van die primitives — welke secundaire knop de norm is (D2), welk eyebrow-gewicht (D3), welke kapitalisatie (D4), welke radius (D7), hoeveel elevatieniveaus (D6). Die worden **niet nu** bedacht maar vastgesteld bij de B2-master (§0.2 stap 1) en daarna vergrendeld. Zie de bijlage: status DEFERRED TO PAGE MIGRATION met heropenvoorwaarde.

> **AFWIJKING VAN DE BRIEFING — tokentelling.** De briefing en `kleur.json` noemen 24 `--vibe-*`-tokens. Gemeten in deze sessie: **23** definities in `home.css:35-70`, en 23 repo-breed (`grep -rhoE -- '--vibe-[a-z0-9-]+\s*:' *.css` → 23, allemaal in `home.css`). De enumeratie in `kleur.json` bevindingen 0-17 bevat zelf ook 23 namen. Gebruik 23; de 24 is nergens te reproduceren.

### AFWIJKINGEN VAN HET V1.0-KADER — vier gemeten correcties

Het V1.0-besluitenkader draagt vier verwijzingen die in deze sessie niet reproduceerbaar zijn. De meting wint; het kaderbesluit zelf blijft staan, alleen de vindplaats of de telling wordt gecorrigeerd.

| # | Kader zegt | Gemeten in deze sessie | Gevolg voor het besluit |
|---|---|---|---|
| K1 | Dood standaardpad `assets/brochures/netcongestie-oplossen.pdf` staat op `_leadpopup.js:26` | Dat pad staat op **`_leadpopup.js:9`**, binnen het gebruiksvoorbeeld in het kopcommentaar (`_leadpopup.js:1-19`). `_leadpopup.js:26` is `LEAD_ENDPOINT`. Er is **geen runtime-standaardwaarde**: `var file = cfg.file \|\| ''` (`:32`) gevolgd door `if(!file){ return; }` (`:33`) — een pagina zonder `file` krijgt géén popup. | C-06 blijft ongewijzigd. Het risico is niet een dood runtime-pad maar een **dood voorbeeld dat bij migratie gekopieerd wordt**: wie het kopcommentaar volgt, configureert een PDF die niet bestaat. Corrigeer het voorbeeld bij de S2-migratie (§0.2 stap 7), niet eerder. |
| K2 | `project-arnhem-60.html` mist het Sector-veld | `project-arnhem-60.html:58` **heeft** een Sector-veld: `Sector · Residentieel vastgoed · belegger`. Alle **11 van 11** casepagina's dragen het veld. | De asymmetrie is geen ontbrekend veld maar een **extra labelvariant**. Gemeten over de 11 Sector-velden zijn er **zes verschillende labels**: `Residentieel vastgoed` (5), `Automotive` (2), `Residentieel vastgoed · belegger` (1), `Recreatie` (1), `Bedrijfspand` (1), `Commercieel vastgoed` (1). De canonieke taxonomie uit C-05 klopt wél: 6 cases onder Woningportefeuilles. |
| K3 | Case-kruimelpad: Woningportefeuilles ×5 (10 van 11 cases) | Gemeten over `project-*.html`: Woningportefeuilles **×6**, Automotive ×2, Bedrijfspanden ×1, Recreatie ×1, `Netcongestie & Energy Hubs` ×1 = **11 van 11**. Idem `data-sector` op `projecten.html`: Woningen ×6, Automotive ×2, Bedrijfspanden ×1, Netcongestie ×1, Recreatie ×1 = 11. | Sluit aan op C-05: Woningportefeuilles VERIFIED (6). Geen case zonder sectorlabel. |
| K4 | De vier verworpen bedrijfscijfers staan nog live op `projecten.html:173-175` | **Drie** staan daar live: `47` (`projecten.html:173`), `12 MWp` (`:174`), `98%` (`:175`). **`892 ton CO2` staat nergens live** — het komt in de repo alleen voor in het afwijzingscommentaar `index.html:209` en `:212`. | C-07 blijft ongewijzigd. 892 ton is al verwijderd en hoeft niet opnieuw te worden afgewezen; de andere drie wel. Zie §1.2. |

> **NIEUW GEMETEN CONFLICT — sectorlabel binnen één bestand.** `project-ratio-16.html:58` zet als kruimelpad `Netcongestie & Energy Hubs`, terwijl `project-ratio-16.html:62` als Sector-veld `Commercieel vastgoed` zet. Twee sectorlabels voor één case, in hetzelfde bestand, vier regels uit elkaar. Onder de claimpolicy (§1.2) is dit **CONFLICTING**: de migratie van dat label is geblokkeerd tot het is opgelost. Dit raakt de B3-masterpagina rechtstreeks — `project-ratio-16.html` ís de B3-master (§0.2 stap 2). Onder C-05 is de canonieke uitkomst `Commercieel vastgoed`, omdat `Netcongestie & Energy Hubs` van de sector-as naar de oplossing-as verhuist.

---

## 0. MIGRATIEMETHODIEK EN -VOLGORDE — DECIDED, V1.0

Dit hoofdstuk is **genomen beleid**, geen voorstel. Het bepaalt in welke volgorde de checklist uit hoofdstuk 1 t/m 6 wordt toegepast. Wie buiten deze volgorde werkt, werkt buiten V1.0.

### 0.1 De methodiek: lock-step per bouwtype

Per bouwtype wordt **één** masterpagina gebouwd, beoordeeld en vergrendeld. Pas daarna volgen de overige pagina's van dát type. Er wordt nooit aan twee bouwtypen tegelijk gewerkt.

```
DESIGN SYSTEM V1.0 FREEZE
  -> MASTER PAGE PER BOUWTYPE
  -> VISUAL + FUNCTIONAL REVIEW
  -> MASTER LOCK
  -> OVERIGE PAGINA'S VAN DAT TYPE
  -> QA
  -> VOLGENDE BOUWTYPE
```

| Stap | Wat het is | Wat het oplevert | Wanneer je door mag |
|---|---|---|---|
| **DESIGN SYSTEM V1.0 FREEZE** | Primitives en tokens liggen vast (§0.4). Geen nieuwe primitive zonder aantoonbare noodzaak. | De vastgestelde primitive- en tokenlijst. | De lijst is vastgelegd en de HARD RULE uit §0.4 is toepasbaar. |
| **MASTER PAGE PER BOUWTYPE** | Eén echte pagina, volledig gebouwd volgens hoofdstuk 1 en 2. Geen skelet, geen prototype. | Een gemigreerde, publiceerbare pagina. | Hoofdstuk 1 en 2 zijn doorlopen, §1.5 stoppunt is gehaald. |
| **VISUAL + FUNCTIONAL REVIEW** | Visueel over de volledige breedtereeks én functioneel: QA-poorten P1 t/m P11 (§5). | Het opleverrapport uit §6, met gemeten waarden. | Alle poorten PASS, of elke FAIL/NIET GEDRAAID staat met reden in §6.7. |
| **MASTER LOCK** | De master wordt referentie. Wijzigen kan alleen door de lock expliciet op te heffen, zoals bij `index.html` (§4.5). | Een bevroren referentiepagina + de vastgelegde componentbeslissingen van dat type. | De review is akkoord en de lock is genoteerd met SHA. |
| **OVERIGE PAGINA'S VAN DAT TYPE** | De rest van de pagina's van dat bouwtype, tegen de vergrendelde master. | Gemigreerde pagina's die niet van de master afwijken. | — |
| **QA** | Hoofdstuk 5 per pagina, niet steekproefsgewijs. | Per pagina een §6.7-eindblok. | Alle pagina's van het type zijn af. |
| **VOLGENDE BOUWTYPE** | Terug naar stap 2 met het volgende bouwtype uit §0.2. | — | — |

- [ ] De masterpagina van dit bouwtype is **vergrendeld** voordat een tweede pagina van hetzelfde type wordt aangeraakt. Zo niet: **niet beginnen**.
- [ ] Er staat geen tweede bouwtype tegelijk open.
- [ ] Een afwijking van de master wordt niet in de pagina opgelost maar **teruggegeven** naar de master, met de consequentie voor alle andere pagina's van dat type.

### 0.2 De zeven masterpagina's, in volgorde

| # | Bouwtype | Masterpagina | Dekt (archetype → aantal) | Wat deze master vastlegt |
|---|---|---|---|---|
| 1 | **B2** Propositiepagina, variant SYSTEM | `systeem-energieopslag.html` | A1 (5) · en via de varianten A2 (6), A3 (5), A4 (1) | De primitives in hun eerste echte toepassing; de SYSTEM-proofregel; de subpagina-hero (D16); de FAQ-vormtaal (D17); secundaire knop, eyebrow en radius (D2, D3, D4, D7). |
| 2 | **B3** Casepagina | `project-ratio-16.html` | A5 (11) | Casebewijsstructuur; sectorlabel volgens C-05; maandcasing (D19). Let op het gemeten conflict `:58` vs `:62` — zie het blok boven §1. |
| 3 | **B4** Indexpagina | `projecten.html` | A6 (1) | Filter-as volgens C-05; de drie verworpen cijfers op `:173-175` (C-07, §1.2). |
| 4 | **B6** Conversie-instrument | `contact.html` | A8 (1) · variant wizard A9 (1) | Formuliercontract; het bundler-artefact (D15); de leadbestemming onder C-06. |
| 5 | **B5** Standpuntpagina | `waarom-vibe.html` | A7 (2) | Standpunt zonder ongedekt cijfer (C-07). |
| 6 | **B7** Juridisch document | `privacy.html` | A11 (2) | Juridische documentvorm. |
| 7 | **S2** Executive Guide (gated) | de zeven guides | A10 (7) | Gated leverflow onder C-03 en C-06; correctie van het dode voorbeeldpad K1; de leadpopup-claims (§1.2). |

> **B1 wordt NIET opnieuw gebouwd.** `index.html` ís Master v1 en blijft byte-for-byte zoals in `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1`. B1 levert de referentie, niet een migratieopdracht. Zie §4.5 en §6.1.

> **B2 heeft vier varianten maar één master.** Stap 1 bouwt alleen de variant SYSTEM. De varianten SOLUTION, SECTOR en GEBIED hebben elk een **eigen proofregel** (§0.4) en krijgen daarom elk een eigen variant-review en variant-lock vóórdat hun pagina's volgen. De primitives en tokens liggen dan al vast; wat per variant nog open is, is uitsluitend informatiehiërarchie, proof en CTA-strategie.

### 0.3 Bouwtype (V1.0) tegenover archetype (gemeten inventaris)

De archetypetabel in §1.3 is de **meting** over de bestaande 48 bestanden. De bouwtypen B1-B7 en S2 zijn het **bouwvocabulaire** van V1.0. Ze vervangen elkaar niet; ze worden op elkaar afgebeeld.

| Bouwtype V1.0 | Archetype (§1.3) | Aantal |
|---|---|---|
| B1 Startpagina | A0 | 1 — niet opnieuw bouwen |
| B2 Propositiepagina · SYSTEM | A1 Systeempagina | 5 |
| B2 Propositiepagina · SOLUTION | A2 Oplossingspagina | 6 |
| B2 Propositiepagina · SECTOR | A3 Sectorpagina | 5 |
| B2 Propositiepagina · GEBIED | A4 Infrastructuur/gebied | 1 |
| B3 Casepagina | A5 Projectdetail | 11 |
| B4 Indexpagina | A6 Projectoverzicht | 1 |
| B5 Standpuntpagina | A7 Corporate / waarom-Vibe | 2 |
| B6 Conversie-instrument · formulier | A8 Contact / conversie | 1 |
| B6 Conversie-instrument · wizard | A9 Tool / assessment | 1 |
| B7 Juridisch document | A11 Juridisch | 2 |
| S2 Executive Guide (gated) | A10 Executive Guide | 7 |

- [ ] Bouwtype én archetype allebei genoteerd in het opleverrapport (§6.1). Eén van de twee is niet genoeg: het archetype zegt wat de pagina nú is, het bouwtype wat hij wordt.

### 0.4 Wat een bouwtype wél en niet vastlegt

Een bouwtype is **geen rigide template**. Het bepaalt informatiehiërarchie, beschikbare componentfamilies, proof requirements, CTA-strategie en responsive principes — **niet** een vaste sectievolgorde of een identieke layout.

**B2-proofregels per variant.** Deze zijn bindend; een B2-pagina zonder de proof van zijn variant is niet af.

| Variant | Proofregel |
|---|---|
| **SYSTEM** | Productspecificaties / technische onderbouwing. |
| **SOLUTION** | Probleem → oplossing → projectbewijs. |
| **SECTOR** | Sectorprobleem → toepassing → sectorcase. |
| **GEBIED** | Lokale relevantie → toepasselijke oplossing → echte lokale/projectonderbouwing waar beschikbaar. |

- [ ] Geen generieke SEO-doorway-template. Een B2-variant zonder eigen proof is een doorway, geen propositiepagina.
- [ ] **PRIMITIVES (frozen).** Uitsluitend: `.vibe-container` · `.vibe-section` · `.vibe-eyebrow` · `.vibe-heading` + `.vibe-heading--*` · `.vibe-lead` · `.vibe-btn` + `--primary` `--secondary` `--ghost` `--text` · `.vibe-card` + `--light` `--dark` `--media` · `.vibe-icon` · `.vibe-icon-tile` · `.vibe-arrow` · `.vibe-metric` · `.vibe-media`. Een extra primitive alleen met aantoonbare noodzaak, genoteerd in §6.6.
- [ ] **HARD RULE toegepast:** REPEATED VISUAL LANGUAGE → primitive/component; UNIQUE COMPOSITION → sectie-specifieke implementatie.
- [ ] **Niet abstraheren**, tenzij er werkelijk hergebruik ontstaat: homepage hero-stage, VIBE.CONTROL-dashboardcompositie, Hedin featured-projectcompositie, homepage process timeline, final CTA diagonal composition.
- [ ] **TOKENS (frozen):** PRIMITIVE → SEMANTIC; een componenttoken alleen wanneer een component een eigen semantische waarde nodig heeft. Voorbeeld: `--vibe-blue-500` → `--color-action-primary` → (indien nodig) `--btn-primary-bg`. Geen extra enterprise-tokenlaag.
- [ ] **Responsive typografie:** `clamp()` is de standaard. `cqw` uitsluitend voor bewust canvas-proportionele composities. Master v1 wordt hiervoor **nu niet** gerefactord (§4.5).
- [ ] Hardgecodeerde `rgba`-varianten worden tijdens migratie genormaliseerd **wanneer ze een herhaalde semantische rol hebben** — zoals `#005FE0`, dat 7× hardgecodeerd staat (§2.1).

---

## 1. VOORAF — voordat één regel CSS wordt aangeraakt

### 1.1 Inhoud inventariseren

- [ ] Noteer bestandsnaam, `<title>`-regelnummer, `<h1>`-regelnummer en de eyebrow-tekst van de pagina (patroon: zie `archetypes.json` → `paginaInventaris`, 46 regels).
- [ ] Tel de secties: `grep -c 'data-screen-label' <pagina>`. Noteer het aantal. `data-screen-label` is **geen** stylehaak — 0 treffers in alle `*.css` (`componenten.json` bevinding 29).
- [ ] Tel de uitgaande interne links en leg per link vast of het doel bestaat in de repo. Doodlopende pagina's bestaan: `capaciteit-als-dienst.html:500` heeft als enige uitgaande link een persoonlijk mailadres (`legacy.json` item 15).
- [ ] Tel de `<img>`-elementen en noteer voor elk: `src`, `srcset` aanwezig j/n, `loading`, `alt`. Buiten `index.html` gebruikt **geen enkele pagina** `loading` of `fetchpriority` (`legacy.json` item 25).
- [ ] Noteer de aanspreekvorm: `grep -oE '\b(je|jouw|u|uw)\b' <pagina> | sort | uniq -c`. Master v1 is 12× je/jouw en 0× u/uw (`index.html:307, 560, 590, 732, 964, 965, 986, 999, 1104, 1105, 1108`). 44 van de 47 andere pagina's hanteren u/uw (`legacy.json` item 5).
- [ ] Noteer of de pagina `_header.js`, `_footer.js`, `_consent.js`, `_leadpopup.js` laadt. `index.html` laadt `_consent.js` (r.4), `_clarity.js` (r.12), `_footer.js` (r.1174), `_leadpopup.js` (r.1243) — en **niet** `_header.js` (`componenten.json` beslissingNodig 11). Dit is een **nulmeting**, geen doeltoestand: onder C-01 verdwijnt `_header.js` bij migratie (§2.7.1). Noteer daarom ook welke bestemmingen deze pagina uitsluitend via het mega-menu bereikte — die hebben een nieuwe ingang nodig.

### 1.2 Claimverificatie — VERPLICHTE STAP, geen pagina passeert deze

Deze stap is niet optioneel en niet uitstelbaar. Een pagina waarvan de claimtabel (§6.2) ontbreekt of onvolledig is, is **niet af**, ongeacht de QA-poorten.

De regel staat letterlijk in de code: *"een pagina die een cijfer herhaalt is geen bron"* (`index.html:252-253`).

> **HARD RULE: PUBLICLY EXISTING != VERIFIED.** Dat een claim al op de live site staat, is geen onderbouwing. Het is alleen bewijs dat hij ooit is opgeschreven.

#### 1.2.1 De vijf statussen en de exacte handeling per status

Elke niet-triviale claim op de pagina krijgt **precies één** van deze vijf statussen. Er is geen zesde status en geen "voorlopig laten staan".

| Status | Definitie | Exacte handeling |
|---|---|---|
| **VERIFIED** | Primaire bron: rapport, contract, meetdata of productspecificatie. | Publiceren **mag**, uitsluitend binnen de scope van die bron. Zet de bron als HTML-commentaar direct boven de claim (patroon: de 18 blokken in `index.html`, zie hieronder). Noteer bron + `bestand:regel` in de claimtabel. |
| **SUPPORTED** | Reproduceerbaar af te leiden uit betrouwbare repository-data. | Publiceren **mag**, uitsluitend in een formulering die **exact** de telling dekt. Noteer in de claimtabel het telcommando én de uitkomst, zodat een ander hem kan herhalen. Een formulering die verder reikt dan de telling is geen SUPPORTED maar REMOVE/REWRITE REQUIRED. |
| **UNVERIFIED** | Bestaat in marketingcopy; onderbouwing ontbreekt. | **Niet automatisch migreren.** Kies één van drie uitwegen en noteer welke: (a) kwalitatief herschrijven zonder getal, (b) `CONTENT PENDING` tot de businessinformatie er is, (c) verwijderen. Doorschuiven is geen uitweg. |
| **CONFLICTING** | Bronnen noemen verschillende waarden. | **Migratie van die claim blokkeren** tot het conflict is opgelost. De pagina kan niet worden opgeleverd met een openstaande CONFLICTING-claim. Registreren in §6.6. |
| **REMOVE/REWRITE REQUIRED** | Aantoonbaar fout, misleidend, of ruimer geformuleerd dan de bron bewijst. | **Niet meenemen.** De verwijdering staat als geschrapt element met reden in §6.2 — nooit een stille verwijdering. |

- [ ] Elke claim op de pagina heeft een status uit deze vijf. Geen claim zonder status.
- [ ] Geen enkele claim staat op CONFLICTING op het moment van opleveren.
- [ ] Elke UNVERIFIED-claim heeft een genoteerde uitweg (a/b/c), niet alleen een label.

#### 1.2.2 Concrete gevallen — C-07, gemeten in deze sessie

Deze zijn al beoordeeld. Ze zijn **B tot A bewezen is**: geen van de vier is VERIFIED geworden door publicatie.

| Claim | Vindplaats (gemeten) | Status | Exacte handeling |
|---|---|---|---|
| `47` opgeleverde projecten | `projecten.html:173` — live | **CONFLICTING** (`projecten.html:191` zegt in dezelfde pagina `Alle 11 gerealiseerde projecten`) én UNVERIFIED. Afwijzing met reden: `index.html:208-221`. | Migratie geblokkeerd tot opgelost. Bij de B4-master (§0.2 stap 3) vervangen door een SUPPORTED-formulering, niet door een lager totaal. |
| `12 MWp` zon geïnstalleerd | `projecten.html:174` — live | **UNVERIFIED.** Reden vastgelegd: geen enkele projectpagina noemt zoncapaciteit in kWp, dus het is nergens uit op te tellen (`index.html:212-214`). | Uitweg (c) verwijderen, of (a) kwalitatief herschrijven. Niet migreren. |
| `98%` gemiddelde uptime | `projecten.html:175` — live | **UNVERIFIED.** Het enige onderbouwde beschikbaarheidscijfer op de site is de contractuele 99,5%-SLA voor laadpalen — een andere grootheid (`index.html:214-216`). | Uitweg (c) verwijderen. Een contractuele SLA niet als gemeten uptime presenteren: dat zou REMOVE/REWRITE REQUIRED zijn. |
| `892 ton CO2` | **Nergens live.** Alleen in het afwijzingscommentaar `index.html:209` en `:212`. | Reeds **REMOVE/REWRITE REQUIRED**, reeds uitgevoerd. | Niet opnieuw afwijzen; niet opnieuw introduceren. Zie correctie K4 boven §1. |

**De SUPPORTED-formulering die wél mag.** Gemeten: er zijn **11** `project-*.html`-bestanden en `projecten.html:191` toont `Alle 11 gerealiseerde projecten`.

- [ ] Gebruik `11 projecten uitgelicht` of `11 gepubliceerde projectcases`. Dat dekt exact wat de repository bewijst.
- [ ] Gebruik **niet** `Vibe heeft slechts 11 projecten gerealiseerd`. Dat is een uitspraak over het bedrijf, niet over de repository, en daarmee ruimer dan de bron → REMOVE/REWRITE REQUIRED.
- [ ] Let op: ook het bestaande `Alle 11 gerealiseerde projecten` (`projecten.html:191`) reikt verder dan de telling. De repository bewijst 11 **gepubliceerde cases**, niet 11 **gerealiseerde** projecten. Herformuleren bij de B4-master.
- [ ] Worden later primaire bronnen aangeleverd, dan wordt elk van deze claims opnieuw beoordeeld — niet automatisch teruggezet.

#### 1.2.3 Concrete gevallen — de leadpopup-cijfers

`_leadpopup.js:116` toont drie cijfers zonder bron, in één regel:

```
'<p class="vlp-mono">VIBE ENERGY<br>7 waardestromen · 0 jr wachttijd<br>−22% netinkoop</p>'+
```

| Claim | Vindplaats | Status | Exacte handeling |
|---|---|---|---|
| `7 waardestromen` | `_leadpopup.js:116` | **UNVERIFIED** onder dezelfde C-07-policy | Bij de S2-migratie (§0.2 stap 7): VERIFIED maken met een primaire bron, herschrijven, of verwijderen. |
| `0 jr wachttijd` | `_leadpopup.js:116` | **UNVERIFIED** | idem |
| `−22% netinkoop` | `_leadpopup.js:116` | **UNVERIFIED** | idem |

> **NU GEEN PRODUCTIECODE WIJZIGEN.** `_leadpopup.js` valt onder de bevroren productiecode. De drie claims worden geregistreerd en meegenomen bij de migratie van het bouwtype dat ze draagt (S2, stap 7) — niet eerder, en niet als losse fix.

- [ ] Vastgelegd dat deze overlay **wél op de homepage vuurt** (`index.html:1243`), zodat Master v1 in de praktijk drie ongedekte cijfers toont die niet in `index.html` staan. Dit is een geregistreerde bevinding, geen migratieopdracht (zie D11 in de bijlage).

#### 1.2.4 De meting zelf

- [ ] Maak een lijst van élk getal op de pagina (`grep -oE '[0-9][0-9.,]*\s*(%|kW|kWh|MWp|ton|uur|jr|projecten|woningen)?'`).
- [ ] Wijs per getal één primaire bron aan: een `project-*.html`-casepagina, een productspec of een extern document. Kan dat niet → schrappen of kwalitatief herformuleren, niet "voorlopig laten staan".
- [ ] Controleer dat geen enkel getal een **optelsom of gemiddelde over het bedrijf** is. Alle acht harde getallen van Master v1 hangen aan één benoemd project: 645 kWh / 300 kW / +70% (Hedin Alkmaar, `index.html:503-509`) en 78% / 240 / 12 / 51 kW (Ratio 16, `index.html:849-852`).
- [ ] Controleer op de vier reeds verworpen bedrijfscijfers: `47 opgeleverde projecten`, `12 MWp zon`, `892 ton CO2`, `98% uptime`. Verworpen met reden op `index.html:208-221` en `:251-255` (`legacy.json` items 0-3, alle risico **hoog**). **Gemeten in deze sessie:** drie staan nog live — `47` (`projecten.html:173`), `12 MWp` (`:174`), `98%` (`:175`); `892 ton CO2` staat nergens live en komt alleen voor in het afwijzingscommentaar `index.html:209`/`:212`. Zie correctie K4 en de statustabel in §1.2.2.
- [ ] Controleer op cijfers die een andere pagina tegenspreekt. Gemeten conflict: `projecten.html:173` zegt 47, `projecten.html:191` en `:322` zeggen 11 (`legacy.json` item 3).
- [ ] Controleer tijdsclaims tegen de casedata. `projecten.html:171` zegt "het afgelopen jaar"; 10 van de 11 casepagina's zijn ouder dan een jaar (`legacy.json` item 4).
- [ ] Controleer reactietermijnen. Master v1 en 6 andere pagina's zeggen 48 uur; `netcongestie-check.html:421` zegt 24 uur (`legacy.json` item 22).
- [ ] Schrijf de bron van élke niet-triviale claim als HTML-commentaar direct boven de claim. Master v1 heeft 18 zulke blokken (`index.html:81-83, 208-221, 223-255, 399-401, 435-436, 463-466, 505-508, 535-537, 615-622, 650-652, 724-726, 789-794, 817-826, 842-844, 909-913, 950-955, 975-978, 994-995, 1014-1017, 1021-1023, 1028-1033, 1099-1102, 1116-1119`).
- [ ] Noteer expliciet wat je hebt **afgewezen** en waarom. Master v1 doet dat zes keer (`index.html:505-508, 615-622, 724-726, 789-794, 975-978` en `:208-221`).
- [ ] Testimonial alleen met naam, functie én organisatie. Ontbreekt er één → derde-persoons "Projectresultaat", geen aanhalingstekens (`index.html:818-820`, uitwerking `:846-847`).
- [ ] Gedemonstreerde interface krijgt een zichtbaar label. Master v1: "Voorbeeldweergave" op `index.html:688`, met motivering `:650-652`.

### 1.3 Archetype bepalen

Kies één archetype uit `archetypes.json` en noteer het in het opleverrapport. A0 is **geen** archetype om te repliceren.

| Code | Archetype | Aantal pagina's |
|---|---|---|
| A0 | Homepage (referentie, niet repliceren) | 1 |
| A1 | Systeempagina | 5 |
| A2 | Oplossingspagina | 6 |
| A3 | Sectorpagina | 5 |
| A4 | Infrastructuur/gebied | 1 |
| A5 | Projectdetail | 11 |
| A6 | Projectoverzicht | 1 |
| A7 | Corporate / waarom-Vibe | 2 |
| A8 | Contact / conversie | 1 |
| A9 | Tool / assessment | 1 |
| A10 | Executive Guide (A4-document) | 7 |
| A11 | Juridisch | 2 |

- [ ] Archetype gekozen en genoteerd.
- [ ] Gecontroleerd of de pagina binnen haar archetype afwijkt. Bekende afwijkers: `oplossing-energielabel.html`, `oplossing-paris-proof.html`, `oplossing-subsidies.html` laden `frameiq-harmonize.css` in plaats van `subpage.css` en hebben hun `<h1>` rond r.373-405 in plaats van r.70 (`archetypes.json` beslissingNodig 2).
- [ ] **A10 = S2, gated documentsysteem — DECIDED, V1.0 (C-03).** De zeven guides worden **geen** publiek pagina-archetype maar gated assets in de leadflow; het eerdere "uitsluiten zonder apart besluit" is daarmee vervangen door een besluit. De vormtechnische reden blijft staan: ze draaien op `report.css` met `width:210mm`, hebben geen navigatie, geen footer, geen cookiebanner, geen analytics, geen canonical, en 8-9 `<h1>`-elementen per document zonder h2-niveau (`legacy.json` items 14 en 24). Migratie volgt als bouwtype S2 op §0.2 stap 7; de guide-inhoud blijft behouden. Zie §1.4.1 stap 6.

> **DEFERRED TO PAGE MIGRATION — er is geen subpagina-hero in Master v1.** De homepage-hero heeft de header ingebakken in dezelfde container (`index.html:77-206`) en is daardoor onbruikbaar op elke pagina die `_header.js` draait (`archetypes.json` beslissingNodig 7). **C-01 neemt de blokkade weg**: de platte Master-v1-header wordt de standaard, dus de header hoeft niet langer met twee systemen te verzoenen. Wat resteert is de hero-**compositie** van een subpagina. **Heropenvoorwaarde:** wordt vastgesteld bij de B2-master `systeem-energieopslag.html` (§0.2 stap 1) en geldt daarna voor alle B2-varianten.

> **DEFERRED TO PAGE MIGRATION — er is geen FAQ-vormtaal in Master v1.** 14 subpagina's hebben elk 5 of 6 FAQ-items; de homepage heeft er 0 en draagt alleen dode FAQ-JS (`index.html:1227-1240`, guard op `#faqList` dat niet bestaat) (`archetypes.json` beslissingNodig 8). **Heropenvoorwaarde:** wordt vastgesteld bij de B2-master (§0.2 stap 1), het eerste bouwtype dat een FAQ draagt. Tot dan wordt geen FAQ gemigreerd en geen FAQ-vorm verzonnen.

> **DECIDED — V1.0 · C-01 NAVIGATIEMODEL = A.** De platte Master-v1-header wordt de standaard en het legacy mega-menu verdwijnt, omdat één navigatiesysteem de voorwaarde is voor één bouwvocabulaire. Gemeten uitgangspunt: `index.html` heeft een eigen platte header met **zes** links in `nav.vh-nav` (`index.html:142-147`: Oplossingen, Projecten, Aanpak, VIBE.CONTROL, Waarom Vibe, Over ons); de 34 andere pagina's laden `_header.js?v=3` met drie mega-menu's (`archetypes.json` beslissingNodig 0). Uitwerking en controles: §2.7.

### 1.4 Echte assets inventariseren

- [ ] Draai `npm run qa:assets` vóór je begint. Noteer het getal uit de OK-regel als nulmeting (`scripts/qa-assets.mjs:83`). Exit 1 = stoppen.
- [ ] Inventariseer welke echte beelden bestaan voor deze pagina: `ls assets/`. `assets/home/` bevat 40 `.webp`. Noteer per beeld de intrinsieke maat (`sips -g pixelWidth -g pixelHeight`).
- [ ] Bepaal per beeldplek: bestaat er een **eigen, echt** beeld? Zo nee → geen stockfoto, geen AI-render, geen nagebouwd logo. Master v1 sluit dat vier keer expliciet uit (`index.html:81-83, 909-913, 950-955, 1014-1017`) en sluit één keer een hele metafoorklasse uit — geen beursbeeld, geen geldgrafiek (`index.html:435-436`).
- [ ] Ontbreekt een beeld → kies de gedocumenteerde uitweg: grafisch vlak in de eigen vormtaal (`.vh-sol-grafisch`, `home-solutions.css:303-320`, markup `index.html:398-402`, motivering `:399-401`) of een SVG-icoon (sectorkaarten, `index.html:924-939`).
- [ ] Controleer op ongerefereerde assets in de webroot. Gemeten: 47 bestanden, 44,38 MB, waaronder 12 `.mp4` van samen 39,94 MB (`legacy.json` item 29). Voeg er geen toe.
- [ ] Controleer op duplicaten met afwijkende naamgeving vóór je een pad kiest: `assets/projects/ratio-16.jpg` naast `assets/projects/ratio16.jpg`; `project-ratio-16.html:63` gebruikt de eerste (`archetypes.json` beslissingNodig 12).

#### 1.4.1 Assetverificatie — VERPLICHTE STAP

> ## NO ASSET → NO DOWNLOAD PROMISE
>
> Een pagina belooft nooit een bestand dat niet bestaat. De copy wordt aangepast aan het asset — niet het asset "later aangeleverd" om de copy te redden. Dit is een harde regel onder C-06, geen voorkeur.

De volgorde is: **eerst het bestand aanwijzen, dan pas de belofte formuleren.** Omgekeerd werken levert gegarandeerd een dode belofte op.

**Gemeten situatie in deze repository (deze sessie):**

| # | Meting | Uitkomst |
|---|---|---|
| A1 | PDF's in de repository — `find . -iname '*.pdf' -not -path './node_modules/*'` | **0 treffers.** Er bestaat geen enkele PDF. |
| A2 | Bestaat `assets/brochures/`? | **Nee.** De map bestaat niet. |
| A3 | Het pad `assets/brochures/netcongestie-oplossen.pdf` | Staat als gebruiksvoorbeeld op **`_leadpopup.js:9`**, in het kopcommentaar. Het pad is **dood**. Er is géén runtime-standaardwaarde: `var file = cfg.file \|\| ''` (`:32`), `if(!file){ return; }` (`:33`). Zie correctie K1. |
| A4 | Pagina's die `window.VIBE_LEAD` met een `file:` configureren | **Vijf**, en alle vijf wijzen naar een **HTML-pagina**, niet naar een PDF. |
| A5 | De tekst op de popupknop | `Stuur mij de brochure` (`_leadpopup.js:124`). |
| A6 | Executive Guides op `report.css` | **Zeven**: `capaciteit-als-dienst`, `energie-als-vastgoedopbrengst`, `energiehandel-flexmarkten`, `exploitatie-zonder-investering`, `energielabel-verhogen`, `laadplein-zonder-verzwaring`, `netcongestie-oplossen`. |
| A7 | Guides in `sitemap.xml` | **Drie**: `energie-als-vastgoedopbrengst` (`sitemap.xml:16`), `capaciteit-als-dienst` (`:118`), `energiehandel-flexmarkten` (`:124`). De andere vier staan er niet in. |
| A8 | Guides die door géén enkele leadconfig als asset worden aangeboden | **Twee**: `capaciteit-als-dienst`, `energiehandel-flexmarkten`. |

De vijf leadconfiguraties uit A4, met gemeten regelnummer en doelbestand:

| Pagina | Regel | `slug` | `file:` wijst naar |
|---|---|---|---|
| `index.html` | `:1242` | `home` | `energie-als-vastgoedopbrengst.html` |
| `oplossing-laadplein.html` | `:269` | `laadplein` | `laadplein-zonder-verzwaring.html` |
| `oplossing-energielabel.html` | `:857` | `energielabel` | `energielabel-verhogen.html` |
| `oplossing-exploitatie.html` | `:295` | `exploitatie` | `exploitatie-zonder-investering.html` |
| `oplossing-netcongestie.html` | `:299` | `netcongestie` | `netcongestie-oplossen.html` |

**Gevolg onder de regel.** De knop zegt "Stuur mij de brochure" en het geleverde bestand is een **HTML-guidepagina**. Er is geen brochure. De copy mag dus geen PDF-download beloven; wat geleverd wordt is een guidepagina, en dát moet er staan.

- [ ] **Stap 1 — wijs het bestand aan.** Voor elke download-, brochure- of guidebelofte op deze pagina: noteer het exacte pad en bevestig dat het bestaat. Geen pad → geen belofte.
- [ ] **Stap 2 — controleer het bestandstype.** Belooft de copy een PDF, brochure of "document", en is het doel een `.html`-pagina? Dan is de copy fout, niet het doel. Herformuleer naar wat er werkelijk geleverd wordt.
- [ ] **Stap 3 — controleer de leverketen.** Delivery moet **aantoonbaar werken** (C-03). Test de flow end-to-end zoals in §3.13: beide requests 2xx, en het beloofde bestand komt daadwerkelijk aan. Een leadformulier dat een lead vastlegt maar niets levert, voldoet niet.
- [ ] **Stap 4 — controleer de bestemming.** Routering gaat naar een **zakelijke centrale bestemming**, niet naar een persoonlijk e-mailadres (C-06). Gemeten tegenvoorbeeld: `capaciteit-als-dienst.html:500` heeft als enige uitgaande link een persoonlijk mailadres (`legacy.json` item 15).
- [ ] **Stap 5 — corrigeer het dode voorbeeld, maar alleen op zijn beurt.** Het gebruiksvoorbeeld op `_leadpopup.js:9` wijst naar een niet-bestaande PDF en wordt bij kopiëren een nieuwe dode belofte. Corrigeren hoort bij de S2-migratie (§0.2 stap 7). **Nu geen productiecode wijzigen.**
- [ ] **Stap 6 — guides zijn gated, geen contentpagina's (C-03).** De zeven Executive Guides zijn lead magnets: geen publiek pagina-archetype, geen normale SEO-contentpagina, uiteindelijk uit de publieke sitemap waar van toepassing, ontsloten via de leadflow. De **inhoud** van de guides blijft behouden. Dit vervangt het eerdere "A10 uitsluiten zonder apart besluit" in §1.3.
- [ ] **Stap 7 — registreer de twee niet-aangeboden guides.** `capaciteit-als-dienst` en `energiehandel-flexmarkten` worden door geen enkele leadconfig aangeboden, maar staan wél in de sitemap. Onder C-03 is dat de verkeerde kant op: gated asset, publiek vindbaar, niet ontsloten. Beslissen bij stap 7, niet nu (D12).

### 1.5 Stoppunt

- [ ] De informatiearchitectuur van deze pagina is akkoord bevonden (zie §4.1). Zo niet: **niet beginnen**.
- [ ] Alle punten uit de bijlage die deze pagina raken zijn opgezocht en dragen een van de vier statussen (DECIDED — V1.0 / DEFERRED TO PAGE MIGRATION / DECISION REQUIRED / CONTENT PENDING). Een **DECISION REQUIRED** dat deze pagina raakt, wordt teruggegeven — niet omzeild. Een **DEFERRED**-punt dat op déze stap moet sluiten (§0.2), wordt hier gesloten.
- [ ] **Claimverificatie (§1.2) is volledig gedraaid.** Elke claim heeft een van de vijf statussen; er staat **geen enkele CONFLICTING-claim open**. Zo niet: **niet beginnen**.
- [ ] **Assetverificatie (§1.4.1) is volledig gedraaid.** Elke download-, brochure- of guidebelofte op deze pagina is teruggevoerd op een bestaand bestand, of de belofte is geschrapt. NO ASSET → NO DOWNLOAD PROMISE.
- [ ] **De masterpagina van dit bouwtype is vergrendeld** (§0.1), tenzij deze pagina zélf die master is. Zo niet: **niet beginnen**.
- [ ] Bouwtype (B1-B7 / S2) en variant zijn bepaald, en de bijbehorende proofregel uit §0.4 is bekend.

---

## 2. TIJDENS — bouwen

### 2.0 Compositieplan — VERPLICHTE STAP, vóór één regel CSS van de pagina wordt geschreven

**V1.1, additief.** Deze stap komt vóór §2.1 en is een stoppunt: zonder vastgelegd compositieplan begint de implementatie niet. Reden: V1.0 legt vast waaruit een pagina bestaat, niet hoe die delen liggen. Een pagina die alle V1.0-regels volgt kan nog steeds generiek zijn — dat is gemeten op de B2-reviewkandidaat (`vibe-section-compositions-v1.md §1.2`: 5 overlappingen tegenover 48 op Master v1, 12 secties op dezelfde containerbreedte van 1240px, tien `<h2>` op exact 44px). Na afloop toetst **P13** in §5 hetzelfde plan aan de zestien anti-patronen.

**Nummerbotsing, let op.** `P1`-`P16` in `vibe-section-compositions-v1.md` zijn **principes** (§2.10 daar); `P1`-`P13` in §5 van dít document zijn **QA-poorten**. Hieronder staat de documentnaam er daarom altijd bij.

- [ ] Bouwtype vastgesteld (§1.3) en het bijbehorende **ritmepatroon** overgenomen uit `vibe-page-archetypes-v1.md §4.1a` / `vibe-section-compositions-v1.md §6.3`. Voor **B1** geldt het gemeten ritme uit `§6.2` daar en wordt niet herbouwd (§0.2). Voor **B7 en S2 bestaat geen patroon**: die twee gaan niet in bouw voordat dat besluit genomen is (`vibe-page-archetypes-v1.md §4.1a`, beide `DECISION REQUIRED`).
- [ ] **Sectietabel uitgeschreven vóór implementatie**, met per sectie: nummer · familie `C1`-`C12` · ritmeniveau HIGH/MEDIUM/QUIET · ontworpen hoogte of verhouding · breedteklasse · breedte van het beeld · H2-graad. Deze tabel gaat mee in het opleverrapport (§6). Een plan dat pas achteraf wordt opgeschreven is geen plan en telt als NIET GEDRAAID.
- [ ] Per sectie **één** familie gekozen (`vibe-section-compositions-v1.md §4`). Twee opeenvolgende secties dragen nooit dezelfde familie, behalve `C7` gevolgd door `C8` en `C10` gevolgd door `C11` (selectieregel §4 daar).
- [ ] Ritmeniveaus geteld tegen `§6.1`: het aantal HIGH volgt het bouwtype (B2: exact 3 op 10-12 secties), **nooit twee HIGH achter elkaar** (§6.2 regel 1), en ten minste 2 QUIET waarvan er één aantoonbaar de **kortste sectie van de pagina** is (§6.2 regel 3). Een MEDIUM-reeks van drie mag, maar alleen als familie én mediaschaal per sectie verschuiven (§6.2 regel 2).
- [ ] Geen van de twee verboden reeksen uit `§6.4`: niet `HIGH·HIGH·HIGH·HIGH`, en niet vier GENERIEKE secties achter elkaar (alle vier de voorwaarden uit §6.4 tegelijk).
- [ ] **Breedteklasse per sectie** genoteerd — tekstmarge, marge-breker of volle breedte — en ten minste één inhoudsvlak op de pagina doorbreekt de tekstmarge (anti-patroon A1). Tot hoever een subpagina mag doorbreken is nog open: **DR-C-01**. Neem het besluit bij de master die het als eerste raakt en noteer het (§0.1).
- [ ] **Ontworpen hoogte** per ankersectie, en één sectie aantoonbaar korter dan de rest. Hoogte = inhoud + gelijke padding op elke sectie is anti-patroon A2.
- [ ] **Beeldplan:** ten minste één beeld ≥ 50% van de viewportbreedte, dat aan één zijde tot de schermrand loopt of door een snede tot vorm wordt gemaakt (A6). Bestaat die asset niet, dan `CONTENT PENDING` (§4.2 hier) plus een getekend vlak of een in eigen tokens gebouwd object met expliciet label (`C6`); **nooit** een geleend of binnen de pagina herhaald beeld (A8), nooit een plaatshouder of gegenereerd beeld (§1.4.1, §4.4).
- [ ] **Kopgraadladder** vooraf uitgeschreven: welke sectie welke H2-graad krijgt. De grootste H2 staat in de slot-CTA, niet in de eerste inhoudelijke sectie; niet elke H2 op dezelfde graad (A9). Gemeten referentie: Master v1 spreidt 66,0-53,0px (factor 1,25), de B2-kandidaat 44/44 (factor 1,00). Een exacte ondergrens voor de spreiding is **niet** vastgelegd; de ladder bij tien of meer koppen is **DR-C-02**.
- [ ] **Slot escaleert** ten opzichte van de opening in minstens twee van drie: kopgraad, mediaschaal, aantal lagen (A10). Slot en footer mogen rijmen (`C10` → `C11`), maar het slot mag de hero niet herhalen.
- [ ] **Laagplan:** overlap op desktop uitsluitend met `position:absolute` binnen een `position:relative`-sectie en `z-index` 0-11, **nul negatieve marges** (negatieve marges horen in het `max-width:1199px`-blok, zoals `home-project.css:260`, `home-process.css:235`, `home-proof.css:443`, `home-final.css:403`, `home-mobile.css:114`). Elk element dat op een beeld ligt, deelt minstens één rand **exact** met dat beeld of met een vormpunt (A11 en `vibe-section-compositions-v1.md §2.10 P1/P2`).
- [ ] **Geometrie begroot** vóór het bouwen: één gebaar per sectie, alleen de ankerrollen meer (`§5.9` daar, en §2.5 hier). Een afgeschuind hoekje als enig gebaar is A12.
- [ ] **Sectieovergangen belegd:** kleuruitdoving naar dezelfde waarde, een gloed met ≥ 100px padding, of een gemeten lege band. Een grens die alleen een haarlijn is of alleen een harde kleurflip zonder vormdrager, is A13.
- [ ] **Feitenverdeling gecontroleerd:** elk feit staat op één plek. Wat in de opening staat komt niet terug in het register, wat in het register staat niet in de slotsectie (A15). Dit loopt gelijk op met de claimverificatie in §1.2 — de status van het cijfer verandert er niet door.

### 2.1 Tokens toepassen

Gedeelde laag = `home.css` (`--vibe-*`, 23 tokens, r.35-70) + `home-mobile.css` (`--m-*`, r.15-45). Laadvolgorde is de architectuur: `tokens.css` → `home.css` → negen sectiebestanden → `home-mobile.css` als laatste (`index.html:56-67`).

- [ ] Sectieprefix aangemaakt met aliassen naar `--vibe-*`, zoals de tien bestaande sets (`home-hero.css:17`, `home-solutions.css:18`, `home-project.css:29`, `home-process.css:28`, `home-control.css:26`, `home-proof.css:24`, `home-infra.css:24`, `home-final.css:25`, `home-footer.css:26`, `home-mobile.css:30`).
- [ ] Blauw komt **altijd** uit `var(--vibe-blauw)` (`home.css:35`). Alle tien bestaande blauwaliassen doen dat al.
- [ ] Hovertint: gebruik `var(--vibe-blauw-diep)` (`home.css:36`). Master v1 codeert `#005FE0` zeven keer hard (`home-solutions.css:84`, `home-project.css:193`, `home-control.css:277`, `home-proof.css:212`, `home-infra.css:128`, `home-final.css:188`, `home-footer.css:236`) — herhaal dat niet.
- [ ] Mobiele maten komen uit de `--m-*`-set, niet uit eigen px-waarden: `--m-gutter clamp(20px,5.4vw,24px)` (`home-mobile.css:16`), `--m-sec-y 44px`, `--m-h1 clamp(34px,9.1vw,44px)`, `--m-h2 clamp(27px,7.3vw,34px)`, `--m-h3 19px`, `--m-lead 16.5px`, `--m-body 15.5px`, `--m-eyebrow 11.5px`, `--m-btn-h 52px`, `--m-radius 14px`, `--m-radius-img 12px` (`home-mobile.css:15-33`).
- [ ] Tabletwaarden komen uit één blok: `--m-sec-y 64px`, `--m-h1 clamp(46px,6.4vw,58px)`, `--m-h2 clamp(34px,4.6vw,42px)`, `--m-h3 21px`, `--m-lead 18px`, `--m-body 16.5px`, `--m-btn-h 56px`, `--m-gutter clamp(32px,5vw,48px)` (`home-mobile.css:34-45`). `--m-eyebrow`, `--m-radius`, `--m-radius-img` worden daar bewust **niet** opnieuw gezet.
- [ ] `--m-sec-y` niet verhogen. De motivering staat vast: *"56 px boven én onder betekende 112 px tussen twee secties op een scherm van 390 px breed. 44 px houdt de secties duidelijk gescheiden en haalt ruim 150 px uit de pagina."* (`home-mobile.css:17-19`).
- [ ] `--m-gutter` niet aanvullen met een eigen paddingwaarde ernaast. Het is het enige paginabrede containercontract onder 1200px; 36 toepassingen in 11 bestanden (`spacing-layout.json` patroon 2).
- [ ] Geen `--m-*`-token boven 1200px aanroepen. `--m-gutter` staat in een ongekwalificeerde `:root` (`home-mobile.css:16`) en bestaat daar dus wél, maar geen enkele desktopregel gebruikt hem.
- [ ] Elevatie via `var(--vibe-elev-mob)` onder 1200px (`home.css:64-65`). Gemeten: dat token wordt nu één keer gebruikt (`home-infra.css:402`); `--vibe-elev-1` en `-2` nul keer.
- [ ] Geen `--t-*`-token uit `tokens.css` gebruiken. Dat is het oude systeem; geen enkele UNIFY-selector matcht op de homepage (`tokens.css:10-105`, toelichting `home.css:1-27`).

### 2.2 Componenten uit de bibliotheek

De bibliotheek is de bevroren primitive-set uit §0.4. De recepten hieronder zijn de **gemeten** Master-v1-implementatie: ze beschrijven het gedrag dat een primitive moet reproduceren (maatvoering, `box-sizing`, focus, raakdoel), niet de klassenamen die je overneemt. Neem het gedrag over, niet de `.vh-*`-namespacing — die is historisch (zie het bibliotheekbesluit boven §1).

- [ ] Primaire CTA: `<a class="vh-btn vh-btn-primair" href="<fallback>" data-calendly>Label + inline SVG`. Desktopbasis: `inline-flex`, gap `1.1274cqw`, hoogte `3.5513cqw`, radius `.5637cqw`, `font-size 1.0147cqw`, `font-weight 600`, `line-height 1`, `white-space nowrap` (`home-hero.css:207-229`); primair = achtergrond `var(--vh-blauw)`, hover `var(--vh-blauw-diep)`.
- [ ] Mobiele knop volgt letterlijk het recept, in acht secties herhaald: `box-sizing:border-box` + `width:100%` + `height:var(--m-btn-h)` + `padding:0 20px` + `font-size:16px` + `border-radius:10px` + `justify-content:space-between` + `svg 19×19px` (`home-hero.css:429-440`, `home-solutions.css:355`, `home-project.css:291`).
- [ ] `box-sizing:border-box` staat er expliciet bij. Er is **geen** universele reset; `box-sizing` komt 18× per element voor (`home-hero.css:432`, `home-project.css:291`, `home-solutions.css:355` met commentaar; verder `home-final.css:174/193/267`, `home-footer.css:222/407/419`, `home-infra.css:114/214/288/445`, `home-proof.css:197/245/305/426`, `home-solutions.css:459`). Zonder deze regel loopt een knop met `width:100%` gegarandeerd 40px buiten de gutter.
- [ ] Tabletvariant: `width:auto` + `min-width` 232-280px (`home-hero.css:495-522`).
- [ ] Pijlicoon: één pad, `M4 12h15m-6-6 6 6-6 6`, 27 voorkomens in vier lijndiktes (`vormtaal.json` bevinding 44). Geen tweede pijlvorm introduceren.
- [ ] Alle decoratieve SVG's krijgen `aria-hidden="true"` én `focusable="false"` (92 SVG's in `index.html`, 0× `role="img"`, 0× `<title>`) (`vormtaal.json` bevinding 42).
- [ ] Geen SVG als enig label van een knop of link. Dat patroon bestaat nergens in Master v1.
- [ ] Skiplink: `<a class="vh-skip" href="#hoofdinhoud">` als **eerste element in `<body>`**, doel `<main id="hoofdinhoud" tabindex="-1">` (`index.html:71-72`, CSS `home-mobile.css:47-60`: `top:-60px` → `:focus{top:0}`).
- [ ] Mobiel menu volgt het bestaande contract: `aria-expanded` + `aria-controls` op de knop (`index.html:150`), `hidden` op het menu (`index.html:165`), sluiten op ESC, op linkklik en op de knop, focus-trap over `a,button`, en `matchMedia('(min-width:1200px)')` sluit bij terugschalen (`index.html:1134-1172`).
- [ ] Het inline menu-script staat **vóór** `<script src="_footer.js">`. Reden staat in de code: `_footer.js` registreert een document-capture-listener met `stopPropagation()`, dus later geregistreerde listeners zien de klik nooit (`index.html:1155-1157`, `_footer.js:157-169`).
- [ ] Mobiele raakdoelen ≥ 40px `min-height`. Precedent: `.vh-footer-nav ul a{min-height:40px;padding:2px 0}` = 44px doos (`home-footer.css:342-346`), `.vh-footer-contact a{min-height:30px}` (`:320`), `.vh-footer-legal-rechts a{min-height:42px}` (`:393`). **Let op:** de 44px klopt alleen omdat padding bij `content-box` buiten `min-height` valt; introduceer je alsnog een border-box-reset, dan wordt het 40px.
- [ ] `prefers-reduced-motion:reduce` uitgewerkt voor elke animatie die je toevoegt. Precedent: `home.css:93-95` (scroll-behavior), `home-control.css:280-283` (stroomlijnen + live-stip), `home-mobile.css:241-244` (menu-animatie).
- [ ] `hover:none` afgehandeld waar een hover-effect betekenis draagt (`home-mobile.css:236-238`).

### 2.3 Responsive vanaf het begin

- [ ] Drie composities gebouwd, niet één geschaalde: ≥1200 cqw-master, 768-1199 eigen tabletcompositie, ≤767 eigen mobiel ontwerp. De code zegt letterlijk dat tablet géén brede telefoon is (`home-solutions.css:452-456`).
- [ ] Elk nieuw sectiebestand heeft exact twee media-blokken in dezelfde volgorde: `max-width:1199` daarna `768-1199` (`spacing-layout.json` patroon 11). Een derde grens alleen met gemeten motivering in het commentaar, zoals `home-hero.css:524-528` (859px) en `home-infra.css:340-344` (1200px).
- [ ] Collapse-recept toegepast: `height:auto`, sectiewortel naar `flex-column`, absolute kinderen naar `static/relative` met expliciete `order`, cqw naar px/clamp (`home-hero.css:398-410`, `home-proof.css:376-466`).
- [ ] Elke cqw-waarde die onder 1200px betekenisloos wordt, is per sectie overschreven. Het vangnet in `home-mobile.css:213-221` is **niet volledig**: negen levende `box-shadow`s in cqw hebben geen mobiel equivalent (`home-solutions.css:152`, `home-proof.css:132` en `:249`, `home-process.css:122`, `home-final.css:271`, `home-control.css:93/150/161`) en `.vh-ctrl-hub` blijft ongedekt in de tabletband (`home-control.css:154-163`).
- [ ] Line-heights in cqw gecontroleerd. Voorbeeld van de ontsporing: `.vh-sol-stats b{line-height:1.0147cqw}` = ±4px op een 390px-container (`home-mobile.css:207-212`).
- [ ] Gecontroleerd dat je line-height-aanpassing in een sectiebestand niet wordt overschreven door `home-mobile.css:213-221` — dat blok laadt als laatste en wint bij gelijke specificiteit (`index.html:67`).
- [ ] `sizes` op elke `<img>` = de gemeten kolombreedte op één decimaal. Tien van dertien voldoen; drie niet: de bovenste S2-kaarten delen `37.5vw` terwijl hun kolommen 27,45 / 17,02 / 16,46cqw breed zijn (`index.html:344, 361, 379`). Herhaal die fout niet.
- [ ] `width`/`height` op elke `<img>` = de **bronmaat**, als verhoudingsreservering tegen layout shift (`vormtaal.json` bevinding 37).
- [ ] Rasterdegradatie volgt het patroon: desktop 3-4 kolommen → mobiel **2** kolommen (standaard) of 1 → tablet terug naar 3-4 (`spacing-layout.json` patroon 10).
- [ ] Mobiel tekstritme: eyebrow (margin 0) → kop `margin-top:14px` → lead `margin-top:16px`; kop `line-height:1.08`, `letter-spacing:-.018em`; lead `line-height:1.55`, `max-width:36ch` (`spacing-layout.json` patronen 3-5).

### 2.4 Fotografie: crop- en scrimregels

- [ ] **Crop-regel 1 — horizontaal duwt het onderwerp weg van de overlay.** Gemeten: `object-position` 26% waar rechts kaarten liggen (`home-infra.css:168`), 78%/76% waar het onderwerp rechts staat (`home-final.css:88`, `:382`), 6% waar het onderwerp links staat (`home-solutions.css:505`), 54-56% waar de scrim van links komt (`home-project.css:64`, `:242`).
- [ ] **Crop-regel 2 — verticaal onder het midden.** In 11 van 13 gevallen 46-62%: de lucht wordt ingekort, het gebouw blijft in beeld (`vormtaal.json` bevinding 39).
- [ ] **Crop-regel 3 — mobiel keert de uitsnede terug naar het midden** zodra de desktopoverlay wegvalt (S1 50→56/54, S3 54/62→56/60, S7 26→46, S8 78/56→76/44), en gaat de verticale waarde omhóóg bij een lage beeldband van 190-232px.
- [ ] `object-fit:cover` **altijd** met een expliciete `object-position`. Geen enkel beeld in Master v1 laat de uitsnede aan de browser over.
- [ ] **Scrimregel 1 — geen diagonaal verloop over tekst.** Dat is afgeschaft met een meting: *"met het oude, diagonale verloop stond de witte kaarttekst op sommige foto's op bijna zuiver wit (slechtste contrast 1,00:1 op de batterij- en laadkaart). Een diagonaal verloop volgt de tekst niet."* (`home-solutions.css:171-175`).
- [ ] **Scrimregel 2 — de scrim is dicht waar de tekst staat en klaart daarna snel op.** Tekst bovenin → `linear-gradient(180deg, rgba(3,20,44,.92) 0%, .90 38%, .56 50%, .12 62%, 0 72%)` (`home-solutions.css:176-188`). Tekst onderin → `.62 0%, .80 26%, .90 46%, .90 100%` (`home-solutions.css:189-198`). Mobiele varianten apart (`home-solutions.css:426-449`).
- [ ] **Scrimregel 3 — een tekstkolom over een foto krijgt een horizontale scrim tot volledige dekking.** S3: `#001632` volledig tot 20% breedte, transparant vanaf 70% (`home-project.css:69-83`).
- [ ] **Scrimregel 4 — elke scrim krijgt `pointer-events:none`.** 19 voorkomens in Master v1 (`home-hero.css:82/91/111/119`, `home-solutions.css:169`, `home-project.css:41/73/95`, `home-process.css:45`, `home-control.css:39`, `home-proof.css:56`, `home-infra.css:182/196`, `home-final.css:50/78/103/117`, `home-footer.css:74/90`).
- [ ] Lazy beeld krijgt een **lichte** plaatshouderkleur uit de eigen sectie: `#E8F1FB` (`home-process.css:104`), `#DCE8F4` (`home-infra.css:157`, `home-footer.css:56`), `#E3ECF4` (`home-final.css:70`). Reden vastgelegd op `home-process.css:99-103`: een donker vlak leest tijdens het laden als een fout. Uitzondering alleen waar de eindtoestand zelf donker is: `#001632` (`home-project.css:54`).
- [ ] Laadbeleid: exact één `loading="eager"` + `fetchpriority="high"` (LCP-kandidaat), al het overige `loading="lazy"`, alles `decoding="async"`. Gemeten in `index.html`: 1 / 12 / 13 op 13 inhoudelijke `<img>` (+1 tracking-pixel in `<noscript>`, `index.html:31-33`).
- [ ] Alle bronnen `.webp` met `srcset`, 2 tot 4 varianten per beeld. Gemeten: 13 `srcset`, 13 `alt` (waarvan 1 bewust leeg op de duimnagel, `index.html:857`).

### 2.5 Geometrie spaarzaam

Gemeten `clip-path`-declaraties per bestand (inclusief de mobiele `none`-resets):

| Bestand | Aantal | Regels |
|---|---|---|
| `home-hero.css` | 5 | 57, 92, 120, 450 (`none`), 463 (mobiele vervanging) |
| `home-final.css` | 5 | 40, 63, 99, 376 (`none`), 394 (mobiele vervanging) |
| `home-proof.css` | 3 | 54, 224, 434 (`none`) |
| `home-footer.css` | 2 | 48, 376 (`none`) |
| `home-infra.css` | 2 | 160, 345 (`none`) |
| `home-solutions.css` | 1 | 318 |
| `home-process.css` | 1 | 43 |
| `home-control.css` | 1 | 40 |
| `home-project.css` | **0** | — gebruikt een navy gradient-scrim (`home-project.css:69-83`) + inline SVG-polygonen (`index.html:490-491`) |

- [ ] Maximaal één geometrisch element per sectie, tenzij de sectie een hero of een slot-CTA is. Zeven van de negen sectiebestanden komen uit op 1-3 declaraties; alleen hero en final CTA dragen er vijf.
- [ ] Hellingen binnen de vastgelegde familie: dx/dy 0,64-0,73 (32,6-36,2° uit het lood) voor vrije wiggen (`home-final.css:31-36` noemt -0,6375 en +0,709; `home-footer.css:39-40` noemt -0,5486 en +0,6493).
- [ ] Fotosnedes in procenten van de eigen doos, niet in de wiggenfamilie: 17,55% (`home-proof.css:224`), 11,5% (`home-infra.css:160`), 46% (`home-solutions.css:318`), 42,30%/28,92% (`home-process.css:43`).
- [ ] Onder 1200px vervalt de geometrie. Vier `clip-path:none`-resets (`home-hero.css:450`, `home-final.css:376`, `home-footer.css:376`, `home-proof.css:434`) plus `home-infra.css:345`; de mobiele vervanging is telkens één driehoek `polygon(100% 0,100% 100%,0 100%)` (`home-hero.css:463`, `home-final.css:394`) of `border-radius:var(--m-radius-img)`.
- [ ] Geen geometrie toevoegen die een raakdoel overlapt zonder `pointer-events:none`.

### 2.6 Toon en copy

- [ ] Koppen 4-9 woorden, eindigen op een punt (`index.html:186, 306, 531, 717, 798, 832, 879, 964`).
- [ ] Accentkleur `#0073FE` op het sluitstuk van de kop (`home-hero.css:267`, `home-solutions.css:55`, `home-process.css:81`, `home-control.css:219`, `home-proof.css:85` en `:179`, `home-infra.css:58`, `home-final.css:154`).
- [ ] Lead 1-3 zinnen van 5-20 woorden.
- [ ] CTA 2-4 woorden, werkwoord voorop, zonder leesteken, één vast pijlicoon.
- [ ] Nul uitroeptekens (gemeten: 0 op de hele homepage).
- [ ] Aanspreekvorm je/jouw, consequent (`index.html`: 12 treffers, 0× u/uw).
- [ ] Kwalificeerders blijven staan: "uitgelicht", "mogelijk", "per situatie" (`index.html:243-249`), "Voorbeeldweergave" (`:688`). Schrappen maakt er een garantie van.

### 2.7 Navigatie, CTA-model en naamgeving — V1.0-besluiten

Drie genomen besluiten met directe bouwgevolgen. Ze staan hier als controleerbare items, niet als beleidstekst.

#### 2.7.1 C-01 · Navigatiemodel = A — DECIDED, V1.0

**Besluit:** de platte Master-v1-header wordt de standaard; het legacy mega-menu verdwijnt. **Motivering:** één navigatiesysteem is de voorwaarde voor één bouwvocabulaire; twee systemen naast elkaar maken elke gemigreerde pagina een uitzondering.

Gemeten precedent in Master v1: logo-anker sluit op `index.html:139`; `nav.vh-nav` met zes links op `:141-148`; menuknop op `:150-154`; `.vh-acties` met de primaire CTA `.vh-btn.vh-btn-primair` (`href="contact"`, `data-calendly`) op `:156-160`.

- [ ] **Desktop: platte header.** Logo links, primaire CTA rechts — het patroon van `index.html:139` / `:156-160`.
- [ ] **Mobiel: Master-v1-navigatie.** Het bestaande menucontract uit §2.2 geldt onverkort; controleren met P10.
- [ ] **1199px blijft de primaire responsive navigatiegrens**, tenzij implementatiebewijs later iets anders vereist. Dat sluit aan op de gemeten hoofdgrens (12 blokken `@media (max-width:1199px)`) en op `matchMedia('(min-width:1200px)')` in `index.html:1172`.
- [ ] **Geen mega-menu terugbouwen** om legacy routes zichtbaar te houden. `_header.js?v=3` wordt niet opnieuw ingehangen.
- [ ] **Proposities mogen niet uit de IA verdwijnen omdat ze geen top-level item meer zijn.** De platte header draagt zes items; het mega-menu ontsloot er meer. Per gemigreerde pagina controleren dat elke propositie bereikbaar blijft.
- [ ] **"Oplossingen" wordt een belangrijke navigatie-ingang** (`index.html:142` → `#oplossingen`).
- [ ] **Systemen en producten blijven bereikbaar** via overzichtspagina's en interne navigatie, niet via een menu-laag.
- [ ] **Energy Hubs en systeemcategorieën landen logisch in de nieuwe IA.** Gemeten legacy-ingangen die een nieuwe bestemming nodig hebben: `energy-hubs` (`_header.js:146`, `:157`), `industrie-logistiek` (`_header.js:35`), `industrie-vve` (`:37`), `industrie-recreatie` (`:38`), `systeem-ems` (`:43`).
- [ ] **Geen route verdwijnt stil.** Elke bestemming die alleen via het mega-menu bereikbaar was, krijgt een genoteerde nieuwe ingang in §6.5. §3.1 eist 0 verdwenen doelen — dat blijft de harde grens.

#### 2.7.2 C-04 · Sticky mobiele CTA = A — DECIDED, V1.0: legacy `.mcta` verdwijnt

**Besluit:** geen sticky mobiele CTA in Design System V1.0. CTA's worden in de pagina geïntegreerd, zoals in Master v1. **Motivering:** Master v1 lost de mobiele CTA in de pagina op; een tweede, permanent zwevend CTA-systeem ernaast is een afwijking zonder onderbouwing.

Gemeten in deze sessie: `.mcta` staat in **26** HTML-bestanden. CSS: `subpage.css:262-266` plus de lichte variant `subpage.css:379-381`. Activering: `@media(max-width:760px){.mcta{display:flex}body{padding-bottom:74px}}` (`subpage.css:266`). Master v1 draagt hem niet.

- [ ] Bij migratie van een pagina die `.mcta` draagt: de sticky balk **verwijderen**, niet verplaatsen en niet verbergen.
- [ ] De bijbehorende `body{padding-bottom:74px}` (`subpage.css:266`) mee verwijderen. Blijft die staan, dan houdt de pagina 74 px dode ruimte onderaan op mobiel.
- [ ] De CTA's uit de verwijderde balk worden **in de pagina geïntegreerd**, niet geschrapt. Noteer per CTA waar hij terechtkomt (§6.2 — geen stille verwijdering).
- [ ] Let op de breekpuntafwijking: `.mcta` schakelt op **760px** (`subpage.css:266`), terwijl de V1.0-breekpuntset `≤767 · 768-1199 · ≥1200` is. De band 761-767 px valt daardoor nu tussen wal en schip. Bij verwijdering verdwijnt dat gat vanzelf; voer het niet opnieuw in.
- [ ] Na verwijdering **P3 opnieuw draaien**. De balk lag op `z-index:90` (`subpage.css:262`) en dekte raakdoelen af; zijn verdwijnen verandert de hittest aantoonbaar.
- [ ] **Niet dogmatisch verboden.** Een sticky mobiele CTA mag later terugkomen als afzonderlijke CRO-test wanneer conversiedata dat ondersteunt. Hij hoort niet bij V1.0 en wordt niet meegemigreerd "omdat hij er al stond".

#### 2.7.3 C-02 · VIBE.CONTROL / EMS = A — DECIDED, V1.0

**Besluit:** VIBE.CONTROL is de commerciële productnaam; EMS blijft de functionele categorie én een belangrijke SEO-term. **Motivering:** de productnaam is nieuw en draagt geen zoekvolume; de categorie wel — dus komt de naam erbij, niet ervoor in de plaats.

Toegestane schrijfwijzen, naar context: `VIBE.CONTROL` · `Energiemanagementsysteem (EMS)` · `VIBE.CONTROL EMS`.

> **HARDE EIS: SEO op EMS / energiemanagementsysteem / energie management systeem / slim energiemanagement mag NIET verloren gaan.**

- [ ] `systeem-ems.html` wordt bij migratie de **VIBE.CONTROL-productpagina met voldoende EMS-context**. Bouwtype **B2 · variant SYSTEM**; proofregel: productspecificaties / technische onderbouwing (§0.4).
- [ ] **Nulmeting van de vier termen vastleggen vóór de migratie en herhalen erna.** Meetcommando: `grep -oi -- '<term>' systeem-ems.html | wc -l`. Gemeten in deze sessie op `systeem-ems.html`:

| Term | Voorkomens vóór migratie | Opmerking |
|---|---|---|
| `EMS` | **74** (op 48 regels) | Substringtelling: omvat ook `systeem-ems`, `ems-hero`. |
| `energiemanagementsysteem` | **2** | Repo-breed in 2 bestanden. |
| `energie management systeem` | **0** | **Komt repo-breed nergens voor.** Dit is een SEO-**doel**, geen bestaand bezit: het kan niet verloren gaan, het moet worden toegevoegd. |
| `slim energiemanagement` | **1** | Draagt het `<title>`; repo-breed in 3 bestanden. |

- [ ] **Geen daling op de drie termen die wél bestaan** (`EMS`, `energiemanagementsysteem`, `slim energiemanagement`). Een daling is alleen acceptabel met expliciete motivering in §6.5.
- [ ] Gemeten EMS-dragers die niet stil mogen sneuvelen:
  - `<title>` (`systeem-ems.html:16`): `EMS — slim energiemanagement | Vibe Energy` — draagt twee van de vier termen tegelijk
  - `<meta name="description">` (`:17`) — bevat `EMS-analyse` en `Vibe EMS`
  - canonical (`:19`) — `https://vibeenergy.nl/systeem-ems`
  - `og:title` / `og:description` (`:25-26`), `twitter:title` / `twitter:description` (`:30-31`)
  - JSON-LD (`:33`): `Service` met `"name":"EMS (energiemanagementsysteem)"`, `BreadcrumbList` positie 2 `"EMS"`, en een `FAQPage` met vijf vragen waarvan `"Wat is een EMS?"`
  - zichtbare eyebrow `Systeem · EMS` (`:69`) en de lead met `Het Vibe EMS` (`:71`)
- [ ] De JSON-LD `Service.name` blijft de **categorie** dragen. VIBE.CONTROL mag ernaast staan, niet in plaats van `energiemanagementsysteem`.
- [ ] `<title>` wijzigen valt onder §3.3: alleen binnen expliciete scope, en met het titelregister erbij. Een titel die `slim energiemanagement` laat vallen, haalt de enige vindplaats van die term op deze pagina weg.
- [ ] Canonical blijft `https://vibeenergy.nl/systeem-ems`, tenzij een routewijziging apart is besloten. §3.9 eist dat de `@id`-verwijzingen dan meelopen.
- [ ] Master v1 introduceert VIBE.CONTROL al op `index.html:145, 170, 746, 1073`, terwijl de bestemmingspagina die naam nog niet draagt (`legacy.json` item 41). Dat gat wordt bij §0.2 stap 1 gedicht — niet eerder, en niet door `index.html` aan te passen (§4.5).
- [ ] **De C-02-schrijfwijze bestaat al in Master v1 en is de te volgen vorm.** `index.html:1073` schrijft in de footer letterlijk `VIBE.CONTROL (EMS)` en linkt naar `systeem-ems`; `index.html:746` linkt met `Ontdek VIBE.CONTROL` naar dezelfde route. Productnaam vóór, categorie erbij, één bestemming — dat is het patroon dat `systeem-ems.html` bij stap 1 moet overnemen.
- [ ] `_header.js:43` ontsluit `systeem-ems` als `EMS · Het brein dat alles aanstuurt`. Onder C-01 verdwijnt dat mega-menu; deze ingang moet in de nieuwe IA opnieuw landen (§2.7.1).
- [ ] **D13 blijft open.** `.vh-sol-mod--hvac` (`index.html:398`) en `.vh-sol-mod--ems` (`:417`) linken beide naar `systeem-ems`. Wordt `systeem-ems` de VIBE.CONTROL-productpagina, dan wordt die dubbele bestemming zichtbaarder, niet minder. Zie de bijlage.

---

## 3. BEHOUDEN — wat kapot kan en hoe je dat controleert

| # | Item | Wat kapot kan | Controle | Acceptabel |
|---|---|---|---|---|
| 3.1 | **Route / bestandsnaam** | De hele site linkt extensieloos (`href="projecten"`); `_footer.js:112-128` herschrijft dat alleen wanneer de huidige URL op `.html` eindigt. Hernoemen breekt zowel de live clean-URL als de lokale preview. | `grep -o 'href="[^"#:]*"' *.html \| sort -u` vóór en na; diff | 0 verdwenen doelen |
| 3.2 | **Interne ankers** | Master v1 gebruikt `#oplossingen`, `#aanpak`, `#vibe-control` (`index.html:141-146`). Een hernoemd sectie-`id` maakt de navigatie stil stuk (geen foutmelding). | voor elke `href="#x"`: `grep -c 'id="x"'` in de doelpagina | elke `#anker` heeft exact 1 doel |
| 3.3 | **`<title>`** | 48 titels, vier verschillende scheidingstekens en woordmerkvarianten (`legacy.json` item 30). Herschrijven zonder register maakt het erger. | `grep -h '<title>' *.html` | onveranderd, tenzij expliciet in scope |
| 3.4 | **`<meta name="description">`** | Verdwijnt geruisloos bij een template-herbouw. | `for f in *.html; do grep -q 'name="description"' $f \|\| echo $f; done` | dezelfde lijst als vóór de migratie |
| 3.5 | **Canonical** | 36 van 48 bestanden hebben er één; de 7 Executive Guides, `404.html`, `_header.html` en 3 prototypes niet. | `grep -c 'rel="canonical"' *.html` | ≥36, en de gemigreerde pagina houdt de exacte URL |
| 3.6 | **`SEO-FOUNDATION`-blok** | 22 bestanden dragen het `<!--SEO-FOUNDATION-->…<!--/SEO-FOUNDATION-->`-blok (`index.html:38-54`); 14 bestanden hebben wél canonical maar géén blok (alle `project-*.html`, `contact.html`, `privacy.html`, `algemene-voorwaarden.html`). Een sjabloon dat het blok verplaatst, laat die 14 leeg achter. | `grep -l 'SEO-FOUNDATION' *.html \| wc -l` | 22, of hoger met verklaring |
| 3.7 | **Open Graph / Twitter** | 34 bestanden hebben `og:*`; 14 niet. `og:image` wijst naar `https://vibeenergy.nl/assets/projects/ratio-16.jpg` (`index.html:48`) en wordt door `qa:assets` lokaal geverifieerd (`scripts/qa-assets.mjs:43`). | `npm run qa:assets` + `grep -c 'property="og:' *.html` | geen daling, 0 kapotte og-paden |
| 3.8 | **JSON-LD** | 33 bestanden dragen schema; `project-*.html` elk 2 blokken. Types in gebruik: Question 71, Answer 71, ListItem 64, BreadcrumbList 32, WebPage 22, Service 14, FAQPage 14, Organization 12, Place 11, CreativeWork 11, WebSite 1, PostalAddress 1. Eén ontbrekende komma sloopt het hele blok zonder zichtbaar effect. | `python3 -c "import json,re,sys;[json.loads(m) for m in re.findall(r'ld\+json\">(.*?)</script>',open(f).read(),re.S)]"` per pagina | parse-fouten = 0; typetelling ongewijzigd |
| 3.9 | **`@graph`-`@id`-verwijzingen** | `index.html:53` koppelt `#org` → `#website` → `#webpage`. Een gewijzigde canonical maakt de `@id`'s inconsistent met de URL. | vergelijk elke `@id`-host+pad met de canonical | identiek |
| 3.10 | **`sitemap.xml`** | 39 `<loc>`-entries; alle `lastmod` staan op 2026-06-20 (36×) of 2026-06-23 (3×) — vóór de homepage-herbouw. 3 van de 7 guides staan erin, 4 niet (`legacy.json` item 26). | `grep -c '<loc>' sitemap.xml`; elke `<loc>` naar een bestaand bestand mappen | elke gemigreerde route staat erin, `lastmod` = werkelijke wijzigingsdatum. **Uitzondering onder C-03:** de zeven Executive Guides (bouwtype S2) zijn gated assets en gaan uiteindelijk **uit** de publieke sitemap waar van toepassing — voor die zeven is verwijdering de juiste uitkomst, niet een ontbrekende regel. Zie §1.4.1 stap 6 en D12. |
| 3.11 | **`robots.txt`** | `Allow: /` zonder uitzonderingen, dus `popup-designs.html`, `popup-designs-met-afbeelding.html` en `cookie-popup-designs.html` zijn crawlbaar (`legacy.json` item 27). | `cat robots.txt` | onveranderd, tenzij prototypes worden uitgesloten |
| 3.12 | **Formulieren** | Slechts 3 bestanden bevatten `<form>`: `contact.html`, `popup-designs.html`, `popup-designs-met-afbeelding.html`. `contact.html` is een bundler-artefact van 409 KB dat het hele document pas bij runtime uitpakt (`contact.html:217-227`); de `<noscript>` zegt dat de pagina JavaScript vereist (r.40). Elke reguliere edit gaat verloren. | pagina openen met JS **uit** en met JS **aan**; velden invullen en versturen | formulier rendert en verstuurt in beide gevallen, of de pagina is bewust buiten scope gehouden |
| 3.13 | **Lead-endpoints** | `_leadpopup.js` gebruikt `https://dashboard.vibeenergy.nl/api/public/site/lead` (moet `ok:true`+`leadId` geven, anders faalt de aanvraag) en daarna `https://vibe-website-api-production.up.railway.app/api/brochure`. De whitelist in `api/server.js:33-39` kent `home, exploitatie, energielabel, laadplein, netcongestie` — de slugs `meer-capaciteit`, `energiehandel` en `vastgoedopbrengst` ontbreken (`archetypes.json` beslissingNodig 4). | popup openen met `?popup=1`, formulier versturen, netwerkpanel op beide calls | beide requests 2xx, of het falen is bekend en genoteerd |
| 3.14 | **Leadpopup-trigger** | `window.VIBE_LEAD` op `index.html:1242` zet `file:"energie-als-vastgoedopbrengst.html"`; zonder `file` sluit het script direct af. De trigger-selector `'.phero,.hero,section[data-screen-label*="Hero"],main>section:first-of-type'` (`_leadpopup.js:265`) matcht de hero **niet**, omdat `data-screen-label="01 Hero"` op een `<div>` staat (`index.html:75`) — de popup opent op sectie 2. | met `?popup=1` laden en het scrollpunt noteren | trigger vuurt; afwijkend scrollpunt expliciet geaccepteerd |
| 3.15 | **Calendly** | `data-calendly` staat op 5 elementen, alle **zonder waarde** (`index.html:157, 174, 189, 970, 1000`), dus altijd de fallback-URL `https://calendly.com/vibeenergy-sales/30min?hide_gdpr_banner=1` (`_footer.js:137`). De listener draait in de **capture-fase op document** met `preventDefault()` + `stopPropagation()` (`_footer.js:157-169`) en blokkeert daarmee elke later geregistreerde listener. | klik elk van de 5 triggers; controleer dat de overlay opent en dat `utm_source=website&utm_medium=cta` is aangeplakt | 5/5 openen; JS-loze fallback `href="contact"` blijft staan |
| 3.16 | **Calendly-tekstheuristiek** | `isCalTrigger` matcht óók op tekst: `/plan.*gesprek\|adviesgesprek\|bekijk.*praktijkcase/i` (`_footer.js:151-155`). Gevolg: 28 ankers met de tekst "Bekijk praktijkcase(s)" op 16 pagina's openen Calendly in plaats van naar de cases te navigeren (`legacy.json` item 11 — **echte functionele regressie, geregistreerd, niet gefixt**). Omgekeerd leunt "Kies een moment" (`index.html:1000`) volledig op het attribuut. | `grep -rniE 'plan.*gesprek\|adviesgesprek\|bekijk.*praktijkcase' <pagina>`; elk resultaat klikken | geen knop opent Calendly die dat niet hoort te doen |
| 3.17 | **Analytics — GTM** | `GTM-KM2V7VQ3`, inline in `<head>` (`index.html:6-10`) plus `<noscript>`-iframe direct na `<body>` (`index.html:70`). Verhuizen naar het einde van `<head>` of achter een bundler breekt de volgorde met consent. | `dataLayer` in de console; GTM-preview | container laadt, `gtm.js`-event aanwezig |
| 3.18 | **Analytics — Meta Pixel** | `fbq('init','1164445461468919')` + `fbq('track','PageView')` (`index.html:19-30`) en de `<noscript>`-pixel (`:31-33`). Die pixel is de 14e `<img>` op de pagina — hij mag geen `loading`/`alt`-controle triggeren. | netwerkpanel: request naar `facebook.com/tr` | 1 PageView per paginaload |
| 3.19 | **Analytics — Clarity** | `_clarity.js` (`index.html:12`) leest de consentstatus uit `_consent.js:15` (`_clarity.js:15`). | consent weigeren → geen Clarity-request; accepteren → wél | gedrag volgt de keuze |
| 3.20 | **Consent-volgorde** | `_consent.js` **moet** vóór GTM en Clarity laden; dat staat als commentaar op `index.html:4`. Een asset-bundler die scripts hersorteert breekt dit stil. | broncode van de gerenderde pagina: `_consent.js` staat als eerste `<script>` in `<head>` | volgorde ongewijzigd |
| 3.21 | **Cookievoorkeuren-link** | `[data-cookie-prefs]` (`index.html:1125`) hangt aan de listener op `_consent.js:155-158`. | klik de link in de footer | banner heropent |
| 3.22 | **Legacy-footer** | `_footer.js:5-106` schrijft met `document.write()` een complete `footer.ftr.v1a` in het oude systeem; die wordt **alleen met CSS verborgen** door `home-footer.css:35` (`.vh-footer ~ footer.ftr.v1a{display:none!important}`). Verdwijnt `.vh-footer` of verandert de zusterrelatie, dan verschijnt de oude footer. | DOM inspecteren op `footer.ftr.v1a`; `getComputedStyle(...).display` | `none`, of de oude footer wordt niet meer geschreven |
| 3.23 | **`<main>`-landmark** | Aanwezig op 6 van de 48 pagina's (`index.html:72`, `algemene-voorwaarden.html`, `netcongestie-check.html` e.a.); ontbreekt op 42 (`legacy.json` item 23). Een skiplink zonder `<main>` springt nergens heen. | `grep -c '<main' <pagina>` | 1, met `id="hoofdinhoud"` en `tabindex="-1"` |
| 3.24 | **Focusring** | `tokens.css` zet site-breed een cyane ring `#0096CC` met `!important`; `home.css:119-127` wint alleen doordat het later laadt (`index.html:56-57`). Verandert de laadvolgorde, dan is de ring weer cyaan. | `getComputedStyle(el,':focus-visible').outlineColor` | `rgb(0,115,254)` |

---

## 4. NIET DOEN

### 4.1 Niet restylen terwijl de informatiearchitectuur slecht is

- [ ] **Niet aan de vormgeving beginnen** zolang een van deze op de pagina van toepassing is:
  - de pagina spreekt zichzelf of een andere pagina tegen in cijfers (`projecten.html:173` vs `:191`/`:322`);
  - de pagina is doodlopend (enige uitgaande link is een mailadres — `capaciteit-als-dienst.html:500`);
  - de pagina bestaat alleen bij gratie van JavaScript (`contact.html:40` `<noscript>`);
  - de koppenstructuur slaat een niveau over (8-9 `<h1>`, geen `<h2>` — `capaciteit-als-dienst.html:141,164,207,261,297,357,411,446`);
  - het archetype van de pagina is niet vast te stellen.
- [ ] Een restyling die op een van deze punten landt, wordt geregistreerd als IA-bevinding en **teruggegeven**, niet omzeild.

### 4.2 Geen placeholders live

- [ ] Geen `lorem`, `TODO`, `TBD`, `xxx`, `CONTENT PENDING` in de opgeleverde markup: `grep -rniE 'lorem|todo|tbd|content.?pending|placeholder' <pagina>` → 0 treffers in zichtbare tekst.
- [ ] Geen nagebouwd klantlogo. Master v1 toont twee onderbouwde organisaties in de eigen letter in plaats van acht gefantaseerde logo's (`index.html:789-794, 805-814`).
- [ ] Geen verzonnen tijdslot of beschikbaarheid. Master v1 laat die bewust weg (`index.html:994-995`).
- [ ] Geen link naar een pagina die niet bestaat. Gemeten voorbeeld: `contact.html:226` linkt naar `"Vibe Energy.html"` — bestaat niet (`legacy.json` item 13).
- [ ] Geen footerlink naar een rubriek die niet bestaat. Master v1 schrapte er zes: Advies & engineering, Werken bij Vibe, Nieuws, Kennisbank, Downloads (`index.html:1063-1065`).
- [ ] Geen nieuwsbrieffunctie zonder werkende backend; Master v1 verving hem door een contactblok (`index.html:1099-1102, 1104-1110`).
- [ ] **NO ASSET → NO DOWNLOAD PROMISE** (§1.4.1). Geen "brochure" beloven die een HTML-pagina is. Gemeten: er bestaat **geen enkele PDF** in deze repository en `assets/brochures/` **bestaat niet**, terwijl de popupknop `Stuur mij de brochure` zegt (`_leadpopup.js:124`) en alle vijf leadconfiguraties naar een `.html`-guide wijzen (`legacy.json` item 19).
- [ ] Geen guide of brochure beloven wanneer het bestand niet bestaat — ook niet met "volgt later". De belofte wordt aangepast aan het asset, nooit andersom.

### 4.3 Geen claim zonder bron

- [ ] Geen cijfer overnemen omdat het al ergens op de site staat. Vastgelegd: *"een pagina die een cijfer herhaalt is geen bron"* (`index.html:252-253`).
- [ ] Geen cijfer uit de ontwerpreferentie overnemen. Master v1 wijst er zes expliciet af (`index.html:505-508, 615-622, 724-726, 789-794, 975-978`).
- [ ] Geen "telling" als "totaal" presenteren: "projecten uitgelicht", niet "projecten opgeleverd" (`index.html:227-234, 254-255`).
- [ ] Geen kwalificeerder schrappen om de zin strakker te maken.
- [ ] Geen citaat toeschrijven zonder naam, functie en organisatie (`index.html:818-820`).

### 4.4 Geen assets verzinnen

- [ ] Geen stockfoto, geen AI-render, geen verzonnen klant (`index.html:81-83, 909-913, 950-955, 1014-1017`).
- [ ] Geen beursbeeld of geldgrafiek als metafoor voor energiehandel (`index.html:435-436`).
- [ ] Geen assetpad schrijven dat je niet hebt geverifieerd — `npm run qa:assets` controleert ook op **case mismatch**, omdat APFS case-insensitief is en de live server niet (`scripts/qa-assets.mjs:23-32`).
- [ ] Geen nieuw beeld in de webroot dumpen; er staan al 47 ongerefereerde bestanden van 44,38 MB (`legacy.json` item 29).

### 4.5 Niet aan het bevroren systeem sleutelen

- [ ] `index.html` en `home*.css` blijven ongewijzigd tot de lock expliciet wordt opgeheven.
- [ ] Geen universele `*{box-sizing:border-box}` introduceren — dat verandert `home-footer.css:342-346` van 44px naar 40px raakdoel.
- [ ] `overflow-x:clip` op `html,body` (`home.css:80-86`) is een vangnet, geen oplossing: inhoud die eronder valt wordt **afgesneden**, niet herschikt. Nooit gebruiken als bewijs dat een overflow is opgelost.
- [ ] Geen nieuw `--t-*`-token, geen nieuwe `tokens.css`-afhankelijkheid.

---

## 5. QA-POORTEN

Elke poort: methode → eis → uitkomst. Een poort zonder gedraaide meting heet **NIET GEDRAAID** met reden, nooit PASS.

**Breedtereeks (11 breedtes + 1 device):** 1920 · 1774 · 1440 · 1280 · 1199 · 1024 · 900 · 768 · 430 · 390 · 360, plus 844×390 (landschap).
De Master v1-baseline in `review/homepage-master-v1/` dekt 360, 390, 430, 768, 900, 1024, 1199, 1440, 1774 en 844×390 — **1920 en 1280 ontbreken daar**. Voor deze reeks moeten ze alsnog gemeten worden.

### P1 — Horizontale overflow (pagina)

- [ ] **Methode:** per breedte, na volledige scroll: `document.documentElement.scrollWidth - document.documentElement.clientWidth`.
- [ ] **Belangrijk:** `home.css:85` zet `overflow-x:clip`, waardoor `scrollWidth` de fout kán maskeren. Meet daarom óók per element (P2).
- [ ] **Eis:** `≤ 0` op alle 12 viewports.
- [ ] **Acceptabel:** 12/12 op 0. Elke andere waarde = FAIL met de breedte erbij.

### P2 — Elementoverflow

- [ ] **Methode:** per breedte, na volledige scroll:
  `[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.right>document.documentElement.clientWidth+1||r.left<-1)}).map(e=>e.className||e.tagName)`
- [ ] **Uitzonderen:** elementen met `pointer-events:none` die bewust buiten de doos vallen (de 19 scrim-/geometrie-elementen uit §2.4) — mits ze `overflow-x` niet vergroten.
- [ ] **Eis:** lijst leeg, op de gedocumenteerde uitzonderingen na.
- [ ] **Acceptabel:** 0 onverklaarde elementen op alle 12 viewports; elke uitzondering staat met klassenaam en reden in het opleverrapport.

### P3 — Hittest op elke zichtbare link en knop

- [ ] **Methode:** per breedte, voor elke `a[href], button` met `getBoundingClientRect().width>0`:
  1. bereken het middelpunt;
  2. `document.elementFromPoint(cx,cy)` moet het element zelf zijn of een afstammeling ervan;
  3. voor de 5 Calendly-triggers ook werkelijk klikken en de overlay verifiëren.
- [ ] **Waarom stap 2:** de pagina draagt 18 geknipte vlakken en 61 `z-index`-declaraties in `home*.css`; een geometrisch vlak zonder `pointer-events:none` dekt een knop af zonder zichtbaar spoor.
- [ ] **Eis:** raakdoel ≥ 44×44 px op ≤767 px, of ≥ 40 px `min-height` met padding tot 44 px zoals `home-footer.css:342-346`.
- [ ] **Acceptabel:** `elementFromPoint` = het element zelf of een kind voor 100% van de gemeten links/knoppen; 0 raakdoelen onder 40 px.

### P4 — Beeldlading

- [ ] **Methode:** scroll tot `scrollY + innerHeight >= scrollHeight`, wacht 2 s, dan:
  `[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.currentSrc||i.src)`
- [ ] **Eis:** lijst leeg. Op de homepage horen 13 inhoudelijke beelden geladen te zijn (1 eager + 12 lazy) plus 1 tracking-pixel.
- [ ] **Extra:** noteer per beeld `currentSrc` en controleer dat de gekozen variant bij de `sizes`-waarde past (bekende afwijking: de drie S2-kaarten met `37.5vw` — `index.html:344, 361, 379`).
- [ ] **Acceptabel:** 0 niet-geladen beelden op 390 px en op 1774 px; geen variant die meer dan één stap te groot is.

### P5 — Consolefouten

- [ ] **Methode:** console leegmaken, pagina hard herladen, volledig scrollen, mobiel menu openen en sluiten, één Calendly-trigger klikken, cookievoorkeuren openen. Verzamel `console.error`, `console.warn`, `window.onerror`, `unhandledrejection`.
- [ ] **Eis:** 0 `error`, 0 uncaught exception, 0 unhandled rejection.
- [ ] **Waarschuwingen** van derden (GTM, Clarity, Meta Pixel, Calendly) worden apart geteld en benoemd, niet weggelaten.
- [ ] **Acceptabel:** 0 eigen fouten. Elke externe waarschuwing staat met bron in het rapport.

### P6 — Kapotte assets

- [ ] **Methode:** `npm run qa:assets` (`package.json:7` → `scripts/qa-assets.mjs`).
- [ ] **Eis:** exit 0 en de regel `qa:assets OK — <n> lokale asset-referenties gecontroleerd, 0 kapot, 0 case mismatches.`
- [ ] **Acceptabel:** exit 0. Noteer `<n>` en vergelijk met de nulmeting uit §1.4; een gedaald aantal betekent dat referenties zijn verdwenen en moet verklaard worden.
- [ ] **Aanvullend, want `qa:assets` dekt het niet:** netwerkpanel op 4xx/5xx voor alle requests (het script controleert alleen lokale paden, geen HTTP-status en geen externe hosts).

### P7 — Contrast van tekst op fotografie

- [ ] **Methode (verplicht achter de tekst meten, niet tegen de ontwerpkleur):**
  1. render de pagina op de te meten breedte;
  2. bepaal de bounding box van de tekst;
  3. neem een screenshot en bemonster de **gecomposeerde** pixels binnen die box (foto + scrim + eventueel verloop) — minimaal de vier hoeken en het midden, plus de lichtste pixel voor witte tekst en de donkerste voor donkere tekst;
  4. bereken de WCAG-contrastratio tussen de tekstkleur en die extreme pixel.
- [ ] **Eis:** ≥ 4,5:1 voor alle tekst op fotografie, gemeten op de ongunstigste pixel. (Master v1 gebruikt geen lagere drempel voor grote tekst; hanteer 4,5:1 over de hele linie.)
- [ ] **Te meten plekken op de homepage-referentie:** de zes oplossingskaarten (`home-solutions.css:176-198`, mobiel `:426-449`), de projectkolom (`home-project.css:69-83`), het infrabeeld (`home-infra.css:171-183`), de final-CTA (`home-final.css:73-78`, gradient op r.77), de footerwig (`home-footer.css:69-75`, gradient op r.73) en de hero-tekstplaat.
- [ ] **Precedent:** de vorige diagonale scrim leverde 1,00:1 op de batterij- en laadkaart (`home-solutions.css:171-175`). Dat is de fout die deze poort moet vangen.
- [ ] **Acceptabel:** elke gemeten plek ≥ 4,5:1, met de gemeten ratio én de bemonsterde kleur in het rapport. "Ziet er goed uit" is geen uitkomst.

### P8 — Toetsenbordfocus

- [ ] **Methode:** vanaf een verse paginaload alleen met Tab en Shift+Tab de hele pagina doorlopen; per stap `document.activeElement` loggen.
- [ ] **Eis 1:** elke tabstop heeft een zichtbare ring: `outline: 2px solid #0073FE` met `outline-offset: 3px` (`home.css:119-127`). Meet met `getComputedStyle(el,':focus-visible')` dat `outlineColor` `rgb(0,115,254)` is en niet de cyane `#0096CC` uit `tokens.css`.
- [ ] **Eis 2:** de tabvolgorde loopt in leesvolgorde; geen focus op een element dat `display:none`, `visibility:hidden` of `hidden` is.
- [ ] **Eis 3:** geen focus verdwijnt achter een geknipt vlak — scroll de focus in beeld en controleer dat de ring zichtbaar is.
- [ ] **Eis 4:** geen element dat op mobiel bewust is verborgen vangt nog focus. Master v1 verbergt er meerdere met reden (`home-final.css:336-338`, `home-proof.css:397-399`, `home-infra.css:358-361`, `home-footer.css:368/372/384`).
- [ ] **Acceptabel:** 100% van de tabstops heeft een zichtbare merkblauwe ring; 0 focusstops op verborgen elementen.

### P9 — Skiplink

- [ ] **Methode:** verse paginaload → één keer Tab.
- [ ] **Eis 1:** de eerste tabstop is `.vh-skip` (`index.html:71`).
- [ ] **Eis 2:** bij focus verschuift hij van `top:-60px` naar `top:0` en is hij volledig zichtbaar (`home-mobile.css:47-60`).
- [ ] **Eis 3:** Enter zet de focus op `#hoofdinhoud`; verifieer `document.activeElement.id === 'hoofdinhoud'` — dat werkt alleen met `tabindex="-1"` op `<main>` (`index.html:72`).
- [ ] **Eis 4:** werkt op alle 12 viewports (de skiplink heeft geen media query).
- [ ] **Acceptabel:** 4/4 op 12/12 viewports.

### P10 — Mobiel menu

Meten op 360, 390, 430, 768, 1024, 1199 en 844×390.

- [ ] `aria-expanded` wisselt `false` ↔ `true` en `aria-label` wisselt "Menu openen" ↔ "Menu sluiten" (`index.html:1139-1141`).
- [ ] Openen zet `hidden` uit en voegt `vh-menu-open` toe aan `<html>`; de achtergrond scrollt niet (`index.html:1143-1146`).
- [ ] Bij openen krijgt de eerste link focus (`index.html:1147`).
- [ ] ESC sluit; de focus keert terug naar de knop (`index.html:1152`, `:1161`).
- [ ] Klik op een menulink sluit het menu — de listener staat op document-capture en móét vóór `_footer.js` geregistreerd zijn (`index.html:1158-1160`, reden `:1155-1157`).
- [ ] Tab en Shift+Tab blijven binnen het menu (focus-trap, `index.html:1163-1170`).
- [ ] Schalen naar ≥1200 px sluit het menu automatisch (`index.html:1172`).
- [ ] Bij sluiten wordt de scrollpositie exact hersteld (`index.html:1148-1150`).
- [ ] **Acceptabel:** 8/8 op alle 7 gemeten viewports.

### P11 — Calendly-triggers

- [ ] **Methode:** klik elk element met `data-calendly` (`index.html:157, 174, 189, 970, 1000`) op 390 px en op 1774 px.
- [ ] **Eis 1:** de overlay opent; de URL bevat `calendly.com/vibeenergy-sales/30min` én `utm_source=website&utm_medium=cta` (`_footer.js:137`, `:165`).
- [ ] **Eis 2:** `widget.css` en `widget.js` worden elk **één keer** aan `<head>` toegevoegd (`_footer.js:140-149`).
- [ ] **Eis 3:** met JS uit navigeert elk van de vijf naar `contact` (`index.html:967-968`).
- [ ] **Eis 4 — negatieve test:** `grep -rniE 'plan.*gesprek|adviesgesprek|bekijk.*praktijkcase' <pagina>`; klik elk resultaat dat **géén** `data-calendly` draagt. Geen daarvan mag Calendly openen (`_footer.js:151-155`; bekende schending: 28 ankers op 16 pagina's, `legacy.json` item 11).
- [ ] **Eis 5:** een component dat zelf op kliks moet reageren, registreert zijn listener vóór `_footer.js` — anders ziet hij de klik nooit (`_footer.js:157-169`).
- [ ] **Acceptabel:** 5/5 openen, 0 valse triggers, fallback werkt.

### P13 — Compositie en anti-patronen — V1.1, additief

Deze poort toetst het compositieplan uit §2.0 aan de zestien anti-patronen `A1`-`A16` uit `vibe-section-compositions-v1.md §7`. Zij vervangt geen enkele poort P1-P12 en verandert er niets aan. **Nummerbotsing:** `P1`-`P16` in dat document zijn principes (§2.10 daar), niet poorten.

- [ ] **Methode:** op **1774px**, na volledige scroll, per pagina meten — (a) het aantal cross-element-overlappingen; (b) het aantal `clip-path`-dragers in de DOM; (c) de drie breedste inhoudsvlakken in px; (d) het aantal volle-breedte vlakken; (e) de H2-graad per sectie; (f) de hoogte per sectie; (g) de kolomverhouding van elke tweedeling; (h) de breedte van het breedste beeld als percentage van 1774. Daarna `A1` t/m `A16` één voor één aftekenen tegen die waarden.
- [ ] **Referentiemeting** (gemeten op 1774px, na volledige scroll):

| Meting | B2-reviewkandidaat (afgekeurd) | Homepage Master v1 (norm) |
|---|---:|---:|
| Overlappende elementen | 5 | 48 |
| `clip-path`-dragers (geometrie) | 2 | 11 |
| Breedste inhoudsvlakken | 1240 / 1080 / 716 px | 1740 / 1704 / 1584 px |
| Volle-breedte vlakken | 15 | 25 |

  De homepage **laagt** (48 overlappingen), de B2-pagina **stapelt** (5). De B2-pagina doorbreekt haar container van 1240px nergens; de homepage voert inhoudsvlakken tot 1740px, dus tot op 17px van de schermrand.

- [ ] **Eis — elk aangetroffen anti-patroon is afzonderlijk een FAIL:**
  - `A1` niet elke sectie op dezelfde containerbreedte; ≥ 1 marge-breker (open punt: **DR-C-01**).
  - `A2` niet elke sectie byte-identieke verticale padding; ankersecties met ontworpen hoogte; één sectie aantoonbaar korter.
  - `A3` geen tweedeling binnen 46/54-54/46; de lichtste kant ≤ 42%.
  - `A4` maximaal twee gelijke kaartrasters per pagina, nooit twee achter elkaar; binnen een set krijgt één kaart een eigen graad.
  - `A5` geen twee opeenvolgende gelijkverdelingen — wissel van familie, niet van kolomaantal.
  - `A6` ≥ 1 beeld ≥ 50% van de viewportbreedte.
  - `A7` het sterkste bewijsmateriaal staat niet als kaartbovenrand.
  - `A8` geen geleend beeld en geen beeld dat binnen dezelfde pagina wordt herhaald.
  - `A9` niet elke H2 op dezelfde graad; de grootste H2 staat in de slot-CTA. Geen vastgelegde ondergrens voor de spreiding — referentie 1,25 (Master v1) tegenover 1,00 (B2-kandidaat); ladder bij ≥ 10 koppen is **DR-C-02**.
  - `A10` het slot escaleert in ≥ 2 van 3 (kopgraad, mediaschaal, aantal lagen) en herhaalt de hero niet.
  - `A11` nul negatieve marges op desktop en elke overlapping verdiend op de uitlijning. *Streefwaarde, geen harde eis:* ten minste de helft van de secties draagt ≥ 1 cross-element-overlapping.
  - `A12` elk geometrisch gebaar doet werk — een afgeschuind hoekje als enig gebaar is FAIL.
  - `A13` geen sectiegrens die alleen een haarlijn is of alleen een harde kleurflip zonder vormdrager.
  - `A14` een voortgangsmarkering verschilt per stap, of zij vervalt.
  - `A15` elk feit op één plek; geen drie neutrale rasters met dezelfde waarden.
  - `A16` het zwaarste compositionele middel valt op de kernpropositie; een vragenregister staat niet direct vóór de slot-CTA, of anders als QUIET met aantoonbaar minder gewicht dan de sectie erna.
- [ ] **Eis — geen van de twee verboden reeksen** uit `vibe-section-compositions-v1.md §6.4`: `HIGH·HIGH·HIGH·HIGH`, en vier GENERIEKE secties achter elkaar (alle vier de voorwaarden uit §6.4 tegelijk). De drie `SHOULD NOT`-grenzen uit dezelfde paragraaf worden apart gerapporteerd, niet als FAIL geteld.
- [ ] **Acceptabel:** 16/16 anti-patronen afwezig én 0 verboden reeksen, met de acht meetwaarden uit de methode erbij. Elk aangetroffen anti-patroon = FAIL met sectienummer en meetwaarde. Een anti-patroon dat niet gemeten is heet **NIET GEDRAAID** met reden, nooit PASS.

### P12 — Poortoverzicht

| Poort | Meting | Acceptabel |
|---|---|---|
| P1 overflow pagina | `scrollWidth - clientWidth` × 12 breedtes | 12× ≤ 0 |
| P2 elementoverflow | rect-scan × 12 breedtes | 0 onverklaarde elementen |
| P3 hittest | `elementFromPoint` op elk zichtbaar anker/knop | 100% treffers; 0 raakdoelen < 40 px |
| P4 beeldlading | `complete && naturalWidth>0` na volledige scroll | 0 niet-geladen |
| P5 console | error/warn/onerror/rejection | 0 eigen fouten |
| P6 assets | `npm run qa:assets` | exit 0, 0 kapot, 0 case mismatch |
| P7 contrast | bemonsterde pixel achter de tekst | elke plek ≥ 4,5:1 |
| P8 focus | Tab-doorloop + `:focus-visible` | 100% zichtbare ring `#0073FE` |
| P9 skiplink | eerste Tab + Enter | 4/4 op 12 viewports |
| P10 mobiel menu | 8 controles × 7 viewports | 56/56 |
| P11 Calendly | 5 triggers + negatieve test | 5/5 open, 0 vals |
| P13 compositie (V1.1) | 8 metingen op 1774px + `A1`-`A16` aftekenen | 16/16 afwezig, 0 verboden reeksen |

*P13 staat hierboven, vóór dit overzicht, zodat P12 het overzicht blijft. De poortnummering loopt dus P1-P11, P13, met P12 als overzichtspoort.*

---

## 6. OPLEVERING — wat gerapporteerd moet zijn voordat een pagina af is

Zonder deze gegevens is een pagina niet af, ongeacht hoe hij eruitziet.

### 6.1 Identiteit

- [ ] Pagina-bestandsnaam en archetypecode (A1-A11).
- [ ] **Bouwtype en variant** (B1-B7 / S2; voor B2 ook SYSTEM / SOLUTION / SECTOR / GEBIED) — §0.3.
- [ ] **Positie in de migratievolgorde** (§0.2 stap 1-7) en of deze pagina de **master** van zijn bouwtype is of een volgpagina.
- [ ] Is het een volgpagina: de **SHA van de vergrendelde master** van dat bouwtype, plus de bevestiging dat de lock niet is opgeheven.
- [ ] BASE SHA en FINAL SHA.
- [ ] Lijst van gewijzigde bestanden.
- [ ] Bevestiging dat `index.html` en `home*.css` niet zijn aangeraakt: `git diff --name-only <BASE> <FINAL> | grep -E '^(index\.html|home.*\.css)$'` → leeg.

### 6.2 Inhoud

- [ ] **Claimtabel (VERPLICHT, §1.2).** Per claim één rij: `claim | plaats (bestand:regel) | bron (bestand:regel) of telcommando | status | handeling`. De status is er **één van vijf**: VERIFIED · SUPPORTED · UNVERIFIED · CONFLICTING · REMOVE/REWRITE REQUIRED. Ontbreekt de tabel of staat er een claim zonder status in, dan is de pagina **niet af**.
- [ ] **Tellijn onder de claimtabel:** aantal claims per status. `CONFLICTING` moet **0** zijn — anders is de pagina geblokkeerd, niet opgeleverd.
- [ ] Per SUPPORTED-claim: het telcommando én de uitkomst, zodat een ander hem kan herhalen.
- [ ] Per UNVERIFIED-claim: de gekozen uitweg (a herschrijven / b `CONTENT PENDING` / c verwijderen).
- [ ] Lijst van afgewezen claims met reden, als HTML-commentaar in de pagina én in het rapport.
- [ ] Aanspreekvorm-telling vóór en na (`je`/`jouw` vs `u`/`uw`).
- [ ] Uitroeptekentelling = 0.
- [ ] Lijst van geschrapte of weggelaten elementen met reden (geen stille verwijdering).

### 6.3 Assets

- [ ] Per beeld: pad, intrinsieke maat, `srcset`-varianten, `sizes`-waarde, gemeten kolombreedte, `object-position`, `loading`, `alt`.
- [ ] Bevestiging: 1× `eager`+`fetchpriority="high"`, rest `lazy`, alles `decoding="async"`.
- [ ] Lijst van beeldplekken zonder echt beeld en de gekozen uitweg (grafisch vlak / icoon / weglating).
- [ ] **Assetverificatie (VERPLICHT, §1.4.1) — NO ASSET → NO DOWNLOAD PROMISE.** Per download-, brochure- of guidebelofte op de pagina één rij: `belofte (bestand:regel) | beloofd bestandstype | werkelijk doelpad | bestaat j/n | werkelijk bestandstype | uitkomst`.
- [ ] Uitkomst is er één van drie: **belofte gedekt** · **copy herschreven naar wat werkelijk geleverd wordt** · **belofte geschrapt**. Een vierde uitkomst bestaat niet.
- [ ] Bevestiging dat er **0 beloofde bestanden** zijn die niet bestaan.
- [ ] Bevestiging dat de leverketen end-to-end is getest (§1.4.1 stap 3 en §3.13): beide requests 2xx én het beloofde bestand komt aan — of het falen is bekend en genoteerd.
- [ ] Bestemming van de lead: bevestiging dat er **geen persoonlijk e-mailadres** in de route zit (C-06, §1.4.1 stap 4).

### 6.4 QA-poorten

- [ ] Tabel P1 t/m P11 met per poort: gemeten waarde, eis, PASS/FAIL/NIET GEDRAAID.
- [ ] **V1.1:** P13 apart gerapporteerd — de acht metingen op 1774px, de aftekening van `A1` t/m `A16`, en de sectietabel uit §2.0 (nummer · familie · ritmeniveau · hoogte · breedteklasse · beeldbreedte · H2-graad). Zonder die sectietabel is P13 **NIET GEDRAAID**, niet PASS.
- [ ] Voor elke NIET GEDRAAID: de reden. Nooit PASS invullen voor een stap die niet is gedraaid.
- [ ] Contrastmetingen (P7) met per gemeten plek: tekstkleur, bemonsterde achtergrondkleur, ratio.
- [ ] Screenshots op alle 12 viewports, opgeslagen naast de Master v1-baseline (`review/homepage-master-v1/` als voorbeeld van de naamgeving: `full-<breedte>.png`, `menu-<breedte>-open.png`, `popup-<breedte>.png`).

### 6.5 Behoud

- [ ] Diff van routes, ankers, `<title>`, description, canonical, og/twitter, JSON-LD, sitemap-entry: **wat is gewijzigd en waarom**, of "ongewijzigd".
- [ ] JSON-LD parse-check: 0 fouten.
- [ ] Bevestiging dat `_consent.js` nog als eerste script in `<head>` staat.
- [ ] Bevestiging dat GTM (`GTM-KM2V7VQ3`), Meta Pixel (`1164445461468919`) en Clarity nog vuren.
- [ ] Calendly: 5/5 triggers geverifieerd, negatieve test gedraaid.
- [ ] Formulieren: getest met JS aan **en** uit, of expliciet buiten scope verklaard.

### 6.6 Open punten

- [ ] Alle punten uit de bijlage die deze pagina raakt, met hun status uit de vier die het register kent: **DECIDED — V1.0** · **DEFERRED TO PAGE MIGRATION** · **DECISION REQUIRED** · **CONTENT PENDING**.
- [ ] Is deze pagina de master van zijn bouwtype: welke **DEFERRED TO PAGE MIGRATION**-punten zijn hier gesloten, en met welk besluit. Een master die zijn deferred punten niet sluit, wordt niet vergrendeld.
- [ ] Elk punt dat open blijft: de exacte **heropenvoorwaarde** — bij welke stap uit §0.2 het opnieuw op tafel komt.
- [ ] Elk **CONTENT PENDING**-punt: welke businessinformatie ontbreekt en wie hem moet aanleveren. Niet invullen, niet gokken.
- [ ] Alle aangetroffen regressies, geregistreerd en **niet meegefixt** (één echte regressie = stoppen en rapporteren).
- [ ] Alle afwijkingen van dit document, met reden.

### 6.7 Eindblok

```
PAGINA        = <bestand> (archetype <code>)
BOUWTYPE      = <B1-B7/S2> [variant] · volgorde-stap <1-7> · MASTER/VOLGPAGINA
MASTER LOCK   = <SHA van de vergrendelde master> / N.V.T. (deze pagina IS de master)
BASE SHA / FINAL SHA
CLAIMVERIFICATIE = PASS/FAIL (VERIFIED n · SUPPORTED n · UNVERIFIED n · CONFLICTING n · REMOVE n)
                   CONFLICTING > 0 = GEBLOKKEERD, nooit PASS
ASSETVERIFICATIE = PASS/FAIL (n beloften, m gedekt, k herschreven, j geschrapt, 0 dood)
QA:ASSETS     = PASS/FAIL (n referenties, m kapot, k case mismatch)
P1 OVERFLOW   = PASS/FAIL (12 breedtes)
P2 ELEMENTEN  = PASS/FAIL (n onverklaarde elementen)
P3 HITTEST    = PASS/FAIL (n/n links+knoppen, kleinste raakdoel <x>px)
P4 BEELDEN    = PASS/FAIL (n/n geladen)
P5 CONSOLE    = PASS/FAIL (n eigen fouten, m externe waarschuwingen)
P7 CONTRAST   = PASS/FAIL (laagste gemeten ratio <x>:1)
P8 FOCUS      = PASS/FAIL (n/n tabstops met zichtbare ring)
P9 SKIPLINK   = PASS/FAIL
P10 MENU      = PASS/FAIL (n/56)
P11 CALENDLY  = PASS/FAIL (5/5 + negatieve test)
NIET GEDRAAID = <wat> — <reden>
RODE POORTEN  = <lijst of geen>
DECISION REQUIRED OPEN = <lijst of geen>
DEFERRED TO PAGE MIGRATION BESLIST = <welke D-punten deze pagina heeft gesloten, of geen>
CONTENT PENDING = <lijst of geen>
PUSHED = NO/YES    DEPLOYED = NO/YES
EINDOORDEEL = PASS/FAIL
```

---

## Bijlage — Besluitenregister

Dit register was een DECISION REQUIRED-lijst. Met de V1.0-besluiten is het een **besluitenregister met vier statussen**. Het auditbewijs per punt (de kolom "Waarom niet af te leiden" en de bron) blijft ongewijzigd staan; alleen de status en het besluit zijn toegevoegd.

| Status | Betekenis | Wat je ermee moet |
|---|---|---|
| **DECIDED — V1.0** | Genomen. Staat nergens meer als open punt. | Uitvoeren. Niet heropenen zonder nieuw besluit. |
| **DEFERRED TO PAGE MIGRATION** | Kan pas op een echte pagina worden vastgesteld. | Niet nu bedenken. Sluiten bij de genoemde stap uit §0.2; daarna vergrendeld voor alle pagina's van dat bouwtype. |
| **DECISION REQUIRED** | Echt open, en niet geraakt door C-01 t/m C-07. | Teruggeven, niet omzeilen. |
| **CONTENT PENDING** | Ontbrekende businessinformatie. | Benoemen wie het moet aanleveren. Niet invullen, niet gokken. |

### A · DECIDED — V1.0

| # | Onderwerp | Besluit | Motivering in één zin | Waarom het eerder niet af te leiden was (gemeten) | Bron |
|---|---|---|---|---|---|
| D1 | Componentbibliotheek: consolideren of namespacing houden | **DECIDED — V1.0.** De bibliotheek is de bevroren primitive-set uit §0.4; nieuwe pagina's gebruiken `.vibe-*`, niet de `.vh-*`-namespacing. Master v1 wordt niet gerefactord. | Eén primitive-set is de enige manier waarop een vergrendelde master zijn volgpagina's kan binden (§0.1). | 15 CTA-klassen, 9 eyebrows, 8 koppen, 8 leads tegenover een patroon dat namespacing voorschrijft | `componenten.json` patroon 0 + de tabel in dit document |
| D5 | Hovertint tokeniseren of hardcoderen | **DECIDED — V1.0.** Tokeniseren: PRIMITIVE → SEMANTIC (§0.4). De hovertint heeft een herhaalde semantische rol en wordt tijdens migratie genormaliseerd. Geldt voor nieuwe pagina's; `home*.css` blijft ongemoeid (§4.5). | Een waarde die 7× identiek terugkomt is per definitie een semantische rol, geen toeval. | `#005FE0` staat 7× hardgecodeerd én 1× als `--vibe-blauw-diep` (`home.css:36`) dat 1× via `var()` wordt gebruikt | `componenten.json` beslissingNodig 3 |
| D8 | Aantal `--vibe-*`-tokens | **OPGELOST DOOR METING — 23.** Geen besluit nodig; de meting wint van de briefing. | 23 is reproduceerbaar, 24 is nergens te herleiden. | Briefing en `kleur.json`-samenvatting zeggen 24; gemeten en geënumereerd zijn er 23 | deze sessie, `home.css:35-70` |
| D10 | Sticky mobiele CTA-balk `.mcta` | **DECIDED — V1.0 · C-04 = A.** Geen sticky mobiele CTA in V1.0; legacy `.mcta` verdwijnt bij migratie, CTA's gaan in de pagina. Mag later terugkomen als afzonderlijke CRO-test. Uitwerking: §2.7.2. | Master v1 lost de mobiele CTA in de pagina op; een tweede permanent zwevend CTA-systeem ernaast is een afwijking zonder onderbouwing. | Bestaat op 26 pagina's, niet in Master v1; Master v1 zegt er niets over | `legacy.json` item 20, `subpage.css:262-266`, `:379-381` |
| D11a | De drie ongedekte cijfers in de leadpopup | **DECIDED — V1.0 · C-07.** `7 waardestromen`, `0 jr wachttijd`, `−22% netinkoop` (`_leadpopup.js:116`) zijn **UNVERIFIED**. Bij de S2-migratie (§0.2 stap 7): VERIFIED maken met primaire bron, herschrijven, of verwijderen. **Nu geen productiecode wijzigen.** | Gepubliceerd zijn is geen onderbouwing — PUBLICLY EXISTING != VERIFIED. | De overlay vuurt wél op de homepage, dus Master v1 toont in de praktijk drie cijfers die niet in `index.html` staan | `content.json` beslissingNodig 5, `_leadpopup.js:116`, `index.html:1243` |
| D12 | Opnamecriterium Executive Guides in sitemap | **DECIDED — V1.0 · C-03 = B.** Guides zijn gated lead magnets: geen publiek archetype, geen normale SEO-contentpagina, uiteindelijk uit de publieke sitemap waar van toepassing, ontsloten via de leadflow. De guide-inhoud blijft behouden. Delivery moet aantoonbaar werken. | Een gated asset hoort niet publiek vindbaar te zijn; het huidige 3-van-7 is geen criterium maar een ongeluk. | 3 van 7 staan erin, 4 niet, zonder zichtbaar criterium. Gemeten: `sitemap.xml:16`, `:118`, `:124` | `legacy.json` item 26, `archetypes.json` beslissingNodig 3 |
| D14 | Navigatiemodel | **DECIDED — V1.0 · C-01 = A.** Platte Master-v1-header wordt standaard; legacy mega-menu verdwijnt. Desktop plat, mobiel Master-v1-navigatie, logo links, primaire CTA rechts, 1199px blijft de primaire grens. Geen mega-menu terugbouwen. Uitwerking: §2.7.1. | Eén navigatiesysteem is de voorwaarde voor één bouwvocabulaire. | Eigen platte header op `index.html` vs mega-menu via `_header.js?v=3` op 34 pagina's | `archetypes.json` beslissingNodig 0 |
| D18 | VIBE.CONTROL als productnaam | **DECIDED — V1.0 · C-02 = A.** VIBE.CONTROL is de commerciële productnaam, EMS blijft de functionele categorie én SEO-term. `systeem-ems.html` wordt de VIBE.CONTROL-productpagina met voldoende EMS-context. EMS-SEO mag niet verloren gaan. Uitwerking: §2.7.3. | De productnaam draagt geen zoekvolume, de categorie wel — dus komt de naam erbij, niet ervoor in de plaats. | Door Master v1 geïntroduceerd (`index.html:145, 170, 746, 1073`), niet gedragen door de bestemmingspagina `systeem-ems.html` | `legacy.json` item 41 |
| D25 | Sectortaxonomie | **DECIDED — V1.0 · C-05.** De canonieke taxonomie hieronder (5 sectoren + 1 segment) vervangt alle legacy-labelsets. `Netcongestie & Energy Hubs` verhuist van de sector-as naar de oplossing-as (B2-variant SOLUTION). | Vijf bronnen hanteerden vijf verschillende labelsets; zonder één canonieke as is elke sectorpagina en elk filter een nieuwe afwijking. | Gemeten over 5 bronnen: Master-v1-sectorkaarten, 5 sectorpagina's, `projecten.html`-filters, Sector-veld op 11 cases, kruimelpad op 11 cases, mega-menu | deze sessie; zie tabel D25.1 |

#### D25.1 · Canonieke sectortaxonomie (C-05)

| Canoniek | Legacy-labels | Pagina | Cases | Bewijsstatus | Aanbevolen URL |
|---|---|---|---|---|---|
| Commercieel vastgoed | Vastgoed, Bedrijfspand, Bedrijfspanden | `industrie-vastgoed` | purmerend, ratio-16 | VERIFIED (2) | `/sector/commercieel-vastgoed` |
| Woningportefeuilles | Residentieel vastgoed, Residentieel | `industrie-residentieel` | arnhem-60, burchtstraat, ketsheuvel, nieuw-schoonoord, schouwburgring, van-beethovenstraat | VERIFIED (6) | `/sector/woningportefeuilles` |
| Recreatie | — | `industrie-recreatie` | dormio-medemblik | VERIFIED (1) | `/sector/recreatie` |
| Logistiek & transport | Logistiek | `industrie-logistiek` | geen | **CASE PROOF = PENDING** | `/sector/logistiek` |
| Automotive | — | **ONTBREEKT (PAGE PENDING)** | hedin-alkmaar, hedin-amsterdam | VERIFIED (2), pagina ontbreekt | `/sector/automotive` |
| VvE (segment binnen Woningportefeuilles) | — | `industrie-vve` | geen | **CASE PROOF = PENDING** | `/sector/woningportefeuilles/vve` |

Gemeten asymmetrieën die hieruit volgen: Automotive heeft 2 cases maar geen sectorpagina (`ls industrie-*.html` → 5 bestanden, geen `industrie-automotive.html`); Logistiek en VvE hebben elk een sectorpagina maar 0 cases; Master v1 linkt naar 4 van de 5 sectorpagina's (`index.html:922, 927, 932, 937`) en **niet** naar `industrie-vve`. Waar geen case is, staat **CASE PROOF = PENDING** — niets invullen.

### B · DEFERRED TO PAGE MIGRATION

Elk punt hieronder wordt gesloten op de genoemde stap uit §0.2 en daarna vergrendeld. Een master die zijn deferred punten niet sluit, wordt niet vergrendeld (§6.6).

| # | Onderwerp | Heropenvoorwaarde (exact) | Waarom niet af te leiden | Bron |
|---|---|---|---|---|
| D2 | Welke secundaire knop is de norm | Vastgesteld bij de **B2-master `systeem-energieopslag.html` (stap 1)**, als waarde van `.vibe-btn--secondary`. | `.vh-btn-secundair` (wit, rand 1,5px `#46587A`, tekst navy, radius 10px, `home-hero.css:230-235`) vs `.vh-final-cta2` (wit, rand 1px `#C9DEF6`, tekst blauw, radius `.6657cqw`, `home-final.css:189-208`); geen enkele waarde komt overeen | `componenten.json` beslissingNodig 0 |
| D3 | Eyebrow-gewicht | Vastgesteld bij de **B2-master (stap 1)**, als waarde van `.vibe-eyebrow`. | `.vh-eyebrow` is 600 (`home-hero.css:252`), de acht andere zijn 700; geen commentaar | `componenten.json` beslissingNodig 1 |
| D4 | Eyebrow-kapitalisatie | Vastgesteld bij de **B2-master (stap 1)**, samen met D3. Kapitalisatie in CSS óf in de markup, niet allebei. | 4 van 9 hebben `text-transform:uppercase`, 5 niet; bij 3 staat de tekst al in kapitalen in de markup | `componenten.json` beslissingNodig 2 |
| D6 | Hoeveel elevatieniveaus het systeem kent | Vastgesteld bij de **B2-master (stap 1)**. Componenttoken alleen wanneer een component een eigen semantische waarde nodig heeft (§0.4). | 3 tokens in `home.css:59-65`, maar 5 feitelijk verschillende schaduwen in de secties; `--vibe-elev-1`/`-2` worden 0× gebruikt | `componenten.json` beslissingNodig 4 |
| D7 | Welke radius de norm is | Vastgesteld bij de **B2-master (stap 1)**. | 3 radiustokens, alle 0× gebruikt; elke sectie zet een eigen waarde (`.5637` t/m `3.5507cqw`) | `componenten.json` beslissingNodig 5 |
| D9 | Leadpopup-trigger | Vastgesteld bij de **S2-migratie (stap 7)**, het eerste moment waarop `_leadpopup.js` legitiem wordt aangeraakt. Tot dan: gedrag meten en noteren (§3.14), niet corrigeren. | Selector matcht de hero niet; popup opent op sectie 2. Bedoeld of niet, staat nergens | `componenten.json` beslissingNodig 7, `_leadpopup.js:265`, `index.html:75` |
| D11b | Aanspreekvorm in de gedeelde overlays | Vastgesteld bij de **S2-migratie (stap 7)** voor `_leadpopup.js`. **Let op:** `_consent.js` hangt aan géén enkel bouwtype en valt dus buiten elke pagina-migratie; bij stap 7 wordt hij meegenomen óf expliciet opnieuw uitgesteld met reden. Zonder dat expliciete moment blijft hij permanent onbehandeld. | `_leadpopup.js` en `_consent.js` hanteren u/uw terwijl Master v1 12× je/jouw en 0× u/uw hanteert, en ze vuren wél op de homepage | `content.json` beslissingNodig 5 |
| D15 | `contact.html` | Vastgesteld bij de **B6-master `contact.html` (stap 4)**. | Bundler-artefact van 409 KB dat zonder JS niets toont; laadt `_header.js` noch `_footer.js` | `archetypes.json` beslissingNodig 1, `contact.html:40, 217-227` |
| D16 | Subpagina-hero | Vastgesteld bij de **B2-master (stap 1)**; geldt daarna voor alle B2-varianten. C-01 heeft de blokkade al weggenomen — de header is beslist, alleen de hero-compositie resteert. | Master v1 heeft er geen; de homepage-hero heeft de header ingebakken (`index.html:77-206`) | `archetypes.json` beslissingNodig 7 |
| D17 | FAQ-vormtaal | Vastgesteld bij de **B2-master (stap 1)**, het eerste bouwtype dat een FAQ draagt. Tot dan wordt geen FAQ gemigreerd en geen FAQ-vorm verzonnen. | 14 subpagina's hebben een FAQ, Master v1 niet; de homepage draagt alleen dode FAQ-JS (`index.html:1227-1240`) | `archetypes.json` beslissingNodig 8 |
| D19 | Maandcasing bij projectdata | Vastgesteld bij de **B3-master `project-ratio-16.html` (stap 2)**. | `index.html:861` "opgeleverd juli 2024" vs `project-ratio-16.html:62` "Opgeleverd · Juli 2024"; één datumvermelding, dus niet af te leiden | `content.json` beslissingNodig 3 |
| D20 | Em-dash-codering | Vastgesteld bij de **B2-master (stap 1)**; daarna repo-breed één vorm. | `&mdash;` (`index.html:833, 847`) naast letterlijke U+2014 (`index.html:965`); geen regel in de code | `content.json` beslissingNodig 4 |
| D24 | Sectorlabel van `project-ratio-16` | **Blokkeert stap 2.** Onder C-05 is de canonieke uitkomst `Commercieel vastgoed`; het kruimelpad moet mee. Sluiten bij de **B3-master (stap 2)** — de pagina in kwestie ís die master. | Gemeten in deze sessie: `project-ratio-16.html:58` zet kruimelpad `Netcongestie & Energy Hubs`, `:62` zet Sector-veld `Commercieel vastgoed`. Twee labels, één case, vier regels uit elkaar → **CONFLICTING** (§1.2) | deze sessie |

### C · DECISION REQUIRED — nog echt open

| # | Onderwerp | Waarom niet af te leiden | Bron |
|---|---|---|---|
| D13 | HVAC-bestemming | `.vh-sol-mod--hvac` (`index.html:398`) en `.vh-sol-mod--ems` (`:417`) linken beide naar `systeem-ems`; er is geen HVAC-pagina. Niet geraakt door C-01 t/m C-07. C-02 maakt het zichtbaarder, niet kleiner: `systeem-ems` wordt de VIBE.CONTROL-productpagina, en dan wijst een HVAC-kaart naar een productpagina die geen HVAC-propositie draagt. **Bestaat er een HVAC-propositie?** Dat is businessinformatie, geen codevraag → tevens CONTENT PENDING (D23). | `componenten.json` beslissingNodig 9 |

### D · CONTENT PENDING — ontbrekende businessinformatie

Niet invullen, niet gokken. Benoemen wie het aanlevert.

| # | Onderwerp | Wat ontbreekt | Gevolg zolang het ontbreekt |
|---|---|---|---|
| D21 | Automotive-sectorpagina | Er bestaan 2 VERIFIED Automotive-cases (`project-hedin-alkmaar.html:62`, `project-hedin-amsterdam.html:62`) maar geen sectorpagina; `ls industrie-*.html` geeft 5 bestanden, geen `industrie-automotive`. | **PAGE PENDING** onder C-05. De sector staat in de canonieke taxonomie maar heeft geen bestemming. Geen pagina verzinnen; de cases blijven bereikbaar via `projecten.html`. |
| D22 | Casebewijs voor Logistiek en VvE | `industrie-logistiek.html` en `industrie-vve.html` bestaan, maar 0 van de 11 cases dragen die sector — gemeten over het Sector-veld én het kruimelpad. | **CASE PROOF = PENDING.** De B2-variant SECTOR eist sectorprobleem → toepassing → **sectorcase** (§0.4). Zonder case kan die proofregel niet worden gehaald; de pagina's kunnen niet als SECTOR-variant worden opgeleverd. Geen case verzinnen en geen case uit een andere sector lenen. |
| D23 | Zakelijke centrale bestemming voor brochure-/guideleads | C-06 besluit dát de routering naar een zakelijke centrale bestemming gaat en niet naar een persoonlijk e-mailadres. Welk adres of welke inbox dat is, is niet aangeleverd. | De leadflow kan niet worden opgeleverd zonder bestemming. Gemeten tegenvoorbeeld dat níét mag blijven: `capaciteit-als-dienst.html:500`, waar de enige uitgaande link een persoonlijk mailadres is (`legacy.json` item 15). |
| D13 | HVAC-propositie | Bestaat er een HVAC-propositie, en zo ja: welke? Zie sectie C. | De dubbele bestemming `hvac` → `systeem-ems` blijft staan. Geen HVAC-pagina verzinnen. |
