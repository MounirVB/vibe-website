# VIBE WEB BRANDBOOK v1

**Bron:** `/Users/mounirvanbinsbergen/projects/vibe-website`, commit `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1` — "feat: lock homepage master v1".
**Meetbasis:** `index.html` (1245 regels), `home.css`, `home-hero.css`, `home-solutions.css`, `home-project.css`, `home-process.css`, `home-control.css`, `home-proof.css`, `home-infra.css`, `home-final.css`, `home-footer.css`, `home-mobile.css`.
**Laadvolgorde van de stylesheets:** `index.html:56-67` — `tokens.css` (56) → `home.css` (57) → de negen sectiebestanden (58-66) → `home-mobile.css` (67). Wie bij gelijke specificiteit wint, volgt uit die volgorde.
**Status van de bron:** bevroren. Dit document beschrijft; het schrijft de homepage niet om.

---

## 1. Wat dit document is

### 1.1 Doel

Dit is het hoofddocument van de Vibe-webvormtaal. Het legt vast wat op Homepage Master v1 **gemeten** is, welke regel daaruit volgt, en waar de code géén regel vastlegt. Het is geen wensbeeld en geen stijladvies: elke uitspraak hieronder draagt een verwijzing naar `bestand:regel` in commit `aae26bf`.

Drie schrijfregels zijn op dit document toegepast:

1. **Geen uitspraak zonder meetpunt.** Waar geen getal, token of coderegel staat, staat de uitspraak er niet.
2. **Tegenspraak wordt niet gladgestreken.** Waar het bewijs zichzelf tegenspreekt of niets vastlegt, staat `DECISION REQUIRED` met de reden. Er wordt geen standaard verzonnen.
3. **Commentaar in de code telt als bron.** De negen stylesheets en `index.html` dragen uitgeschreven motiveringen met gemeten pixelwinst. Dat commentaar is in dit systeem de regel, niet de toelichting.

### 1.2 De bron is één pagina, niet een bibliotheek

Master v1 is één HTML-bestand met negen sectie-namespaces. Er is geen build, geen componentframework en geen gedeelde CSS-bibliotheek. Alles wat hieronder "systeem" heet, is een patroon dat negen keer herhaald is — niet een geïmplementeerde abstractie. Sectie 2 werkt dat uit; het is de belangrijkste bevinding van deze audit.

### 1.3 Verhouding tot de vijf andere documenten

Dit brandbook draagt de lagen die over alle pagina's heen gelden: **de bevroren baseline van Design System V1.0 (§1A)**, het drie-lagen-model (§2), de merkconstanten op hoofdlijn (§3), de volledige vormtaal (§4), het responsieve systeem inclusief het navigatiemodel (§5), de contentregels inclusief claim policy en sectortaxonomie (§6) en de matrix die zegt wat waar hergebruikt mag worden (§7).

De vijf andere documenten dragen elk één bewijsdomein in volledige detaillering. Dit brandbook verwijst ernaar in plaats van ze te herhalen:

| Document | Wat daar staat en hier niet | Hier verwerkt in |
|---|---|---|
| `docs/vibe-design-tokens-v1.md` | De volledige waardetabel: 23 `--vibe-*`-tokens (`home.css:35-70`), 14 `--m-*`-tokens (`home-mobile.css:16-33`, tabletoverride `:36-44`), de sectie-aliassen, de typografische schaal per sectie en de spacing-/containermaten in cqw per referentiecanvas; §7 daar draagt de consolidatiekandidaten. | §1A.5, §3 beschrijvend, §5.2 voor de mobiele tokenlaag |
| `docs/vibe-component-library-v1.md` | De anatomie per component: markupopbouw, alle maten per breedteband, varianten die werkelijk bestaan, en de dode CSS-blokken. | §1A.4, §2 (bibliotheekstatus), §7 (matrix) |
| `docs/vibe-page-archetypes-v1.md` | De pagina-archetypes en hun anatomie (§3 daar), de B-mapping van zeven bouwtypes + S2 (§4.1 daar), de besluitenbasis §0.3, de canonieke sectortaxonomie §0.4 en de gemeten brochure-/guide-stand §0.5. | §1A.3, §1A.8, §1A.10, §7 kolom HOMEPAGE ONLY |
| `docs/vibe-migration-checklist-v1.md` | De uitvoerbare checklist per pagina, de lock-stepmethodiek (§0.1-§0.2 daar), de QA-poorten P1-P12 met hun meetmethode, en het **D-register D1-D20** in de bijlage. | §1A.11, §5, §6 leveren de normen die daar worden afgevinkt; §8 gebruikt de D-nummers |
| `docs/vibe-legacy-inconsistencies-v1.md` | De legacy-items L-01 e.v.: `tokens.css` versus `home.css`, de twee navigatiesystemen (L-09), de sticky `.mcta` (L-21), de guides zonder navigatie (L-15/L-16), de dode CSS en de scriptconflicten. | §2.4, §8 |
| `docs/vibe-section-compositions-v1.md` — **V1.1, additief** | De laag tussen component en pagina-archetype: de art direction per homepagesectie S1-S9 (§2 daar), de dertien grammaticaregels (§3), de twaalf compositiefamilies `C1`-`C12` (§4), de geometrieregels inclusief de frequentieregel (§5), het paginaritme HIGH/MEDIUM/QUIET met een ritmepatroon per bouwtype (§6), de zestien anti-patronen `A1`-`A16` (§7) en de elf open punten DR-C-01 t/m DR-C-11 (§8). | §1A.12 |

*De zes documenten zijn in één ronde geschreven en vormen samen v1 van het systeem. Er gelden twee voorrangsregels, in deze volgorde:*

1. ***§1A wint altijd.** De frozen baseline is de primaire bron voor iedere volgende opdracht. Spreekt een detaildocument — of een ander hoofdstuk van dít document — §1A tegen, dan wint §1A en is de tegenspraak een te herstellen fout in dat document.*
2. ***Buiten §1A wint het detaildocument.** Gaat het om een gemeten detail (een waarde, een maat, een telling, een anatomie) en spreken dit brandbook en een detaildocument elkaar tegen, dan wint het detaildocument, omdat dat dichter bij de gemeten broncode staat.*

*De kop van deze paragraaf, de telling "zes documenten" en de twee voorrangsregels hierboven beschrijven de stand van **V1.0**. De zevende regel in de tabel, `docs/vibe-section-compositions-v1.md`, hoort bij **V1.1** en is additief: hij vervangt geen V1.0-vaststelling en is geen zesde detaildocument bij §1A, maar een nieuwe laag erbovenop. Dezelfde twee voorrangsregels gelden er onverkort voor — §1A wint altijd. Zie §1A.12.*

---

## 1A. VIBE WEB DESIGN SYSTEM V1.0 — FROZEN BASELINE

**Status:** `DECIDED — V1.0`. Dit hoofdstuk is de **primaire bron voor iedere volgende opdracht** aan dit systeem. Wat hier staat is genomen; het staat in geen van de zes documenten nog als `DECISION REQUIRED`.

**Nummering.** Dit hoofdstuk heet 1A en niet 2, zodat de bestaande verwijzingen naar §2 t/m §8 in dit document én in de vijf detaildocumenten geldig blijven. Inhoudelijk staat het vóór alles wat volgt.

**Peilmoment.** Alle metingen in dit hoofdstuk komen uit commit `aae26bf`. **Er is geen productiecode gewijzigd**: Homepage Master v1 blijft byte-for-byte zoals in `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1`.

### 1A.1 Canonical navigation model — C-01

1. **Eén header voor de hele site: de platte Master-v1-header.** Desktop: logobadge plus woordmerk links (`index.html:130-138`), zes platte links zonder dropdowns (`:142-147` — Oplossingen, Projecten, Aanpak, VIBE.CONTROL, Waarom Vibe, Over ons), primaire CTA "Plan een gesprek" rechts (`:157`). Mobiel: de Master-v1-navigatie (`index.html:165-181`, `home-mobile.css:71-87`, `:141-194`).
2. **Het legacy mega-menu verdwijnt en wordt niet teruggebouwd:** `_header.js:22-48` (Oplossingen 9 items, Industrieën 5, Systeem 5), plus de vier platte links `:146-149` en de twee CTA's `:152-153`, ingespoten op de 34 andere pagina's.
3. **1199px blijft de primaire responsive navigatiegrens** (12 gemeten `max-width:1199px`-queries; `index.html:1171` gebruikt dezelfde grens via `matchMedia('(min-width:1200px)')`), tenzij implementatiebewijs later iets anders vereist.
4. **Randvoorwaarde: geen propositie verdwijnt uit de IA omdat zij geen top-level item meer is.** "Oplossingen" wordt de belangrijkste inhoudelijke ingang; de vijf systeempagina's, de vijf sectorpagina's en `energy-hubs.html` blijven bereikbaar via overzichtspagina's en interne navigatie. Geen mega-menu terugbouwen om legacy routes zichtbaar te houden.

**Detail:** §5.5 van dit document (landingstabel per legacy-item en het gevolg voor het responsieve systeem); `vibe-page-archetypes-v1.md §0.3` (DR-01); `vibe-legacy-inconsistencies-v1.md L-09`; D-register D14.

### 1A.2 Canonical naming VIBE.CONTROL / EMS — C-02

1. **VIBE.CONTROL is de commerciële productnaam; EMS blijft de functionele categorie en een belangrijke SEO-term.** Toegestane schrijfwijzen naar context: `VIBE.CONTROL`, `Energiemanagementsysteem (EMS)`, `VIBE.CONTROL EMS`.
2. **SEO op *EMS*, *energiemanagementsysteem*, *energie management systeem* en *slim energiemanagement* mag niet verloren gaan.** Gemeten drager: `systeem-ems.html:16` (`<title>` "EMS — slim energiemanagement | Vibe Energy") en `:17` (meta description, tweemaal EMS).
3. **`systeem-ems.html` wordt bij migratie de VIBE.CONTROL-productpagina mét voldoende EMS-context.** Master v1 draagt het precedent al: `index.html:746` "Ontdek VIBE.CONTROL" linkt naar `systeem-ems`, en `index.html:1073` schrijft in de footernavigatie "VIBE.CONTROL (EMS)".

**Detail:** §6.7 van dit document (schrijfwijzen, verboden vormen, aanspreekvorm van de bronpagina); `vibe-page-archetypes-v1.md §0.3`; D-register D18.

### 1A.3 Archetypes

1. **Zeven bouwtypes plus één gated documentsysteem:** B1 Startpagina · B2 Propositiepagina (varianten *Systeem* / *Oplossing* / *Sector* / *Gebied*) · B3 Casepagina · B4 Indexpagina · B5 Standpuntpagina · B6 Conversie-instrument (varianten *formulier* / *wizard*) · B7 Juridisch document · **S2 Executive Guide** (gated documentsysteem, geen publiek webtype).
2. **Een bouwtype is geen rigide template.** Het legt vast: informatiehiërarchie, beschikbare componentfamilies, proof requirements, CTA-strategie en responsieve principes. Het legt **niet** vast: een vaste sectievolgorde of een identieke layout.
3. **B2-proofregel per variant:** SYSTEM = productspecificatie en technische onderbouwing · SOLUTION = probleem → oplossing → projectbewijs · SECTOR = sectorprobleem → toepassing → sectorcase · GEBIED = lokale relevantie → toepasselijke oplossing → echte lokale of projectonderbouwing waar beschikbaar.
4. **Geen generieke SEO-doorway-template.** Een variant zonder eigen proof is CONTENT PENDING, geen ingevulde sjabloonpagina.

**Detail:** `vibe-page-archetypes-v1.md §3` (anatomie per type, gemeten) en `§4.1` (de B-mapping met paginatellingen); §7 van dit document zegt per patroon wat herbruikbaar is.

### 1A.4 Component primitives

1. **Frozen primitieveset:** `.vibe-container` · `.vibe-section` · `.vibe-eyebrow` · `.vibe-heading` + `.vibe-heading--*` · `.vibe-lead` · `.vibe-btn` + `--primary` `--secondary` `--ghost` `--text` · `.vibe-card` + `--light` `--dark` `--media` · `.vibe-icon` · `.vibe-icon-tile` · `.vibe-arrow` · `.vibe-metric` · `.vibe-media`. Extra primitives alleen bij aantoonbare noodzaak.
2. **HARD RULE:** REPEATED VISUAL LANGUAGE → primitive/component; UNIQUE COMPOSITION → section-specific implementation.
3. **Niet abstraheren** (tenzij later werkelijk hergebruik ontstaat): homepage hero-stage (`index.html:77-206`, `home-hero.css:35-49`), VIBE.CONTROL-dashboardcompositie (`home-control.css:50-190`), Hedin featured-projectcompositie (`home-project.css:19-33`, `:143-168`), homepage process timeline (`home-process.css:152-204`), final CTA diagonal composition (`home-final.css:15-104`).
4. **Gevolg voor de gemeten staat:** de vijftien CTA-klassen van Master v1 (§2.3) sluiten af op één knopprimitieve met vier varianten; dat is het besluit dat §8.3 C1 tot nu toe openhield.

**Detail:** `vibe-component-library-v1.md §3` (anatomie per component, maten per breedteband) en `§6` (dode CSS die niet in de bibliotheek komt); §2.3 van dit document voor de nulmeting.

### 1A.5 Token hierarchy

1. **Twee lagen, een derde alleen op aanvraag:** PRIMITIVE → SEMANTIC, en een componenttoken uitsluitend wanneer een component een eigen semantische waarde nodig heeft. Voorbeeld: `--vibe-blue-500` → `--color-action-primary` → (indien nodig) `--btn-primary-bg`.
2. **Geen onnodige enterprise-tokenlagen.**
3. **Hardgecodeerde hex- en rgba-varianten worden tijdens de migratie genormaliseerd** zodra ze een herhaalde semantische rol dragen. De gemeten kandidaten staan in §8.2: navy (T1), body-grijs (T2), kaartkopinkt (T3), icoonblauw (T4), icoontegel-tint (T7), hovertint (T10), haarlijn (T11).
4. **De gemeten tokenlaag is meetbasis, geen contract:** 23 `--vibe-*`-definities (`home.css:35-70`), waarvan twaalf nergens via `var()` worden aangeroepen (§8.2 T9).

**Detail:** `vibe-design-tokens-v1.md §2-§5` (volledige waardetabellen) en `§7` (consolidatiekandidaten); §3 van dit document voor de merkconstanten.

### 1A.6 Responsive model

1. **Breekpunten:** ≤767 mobiel · 768-1199 tablet · ≥1200 desktop (`home-mobile.css:9-13`). `max-width:1199px` is de enige systeemgrens; componentgrenzen (859, 1000, 1024) alleen met een gemeten reden in het commentaar, volgens het patroon in §5.2.
2. **Responsieve typografie: `clamp()` is de default.** `cqw` uitsluitend voor bewust canvas-proportionele composities.
3. **Master v1 wordt hiervoor NU NIET gerefactord**, en B1 wordt niet herbouwd (§1A.11). De gemeten cqw-erfenis van de homepage blijft dus staan; nieuw werk neemt haar niet over.
4. **De collapse-mechaniek uit §5.3 geldt onverkort voor elk nieuw bouwtype:** de vier bewegingen (hoogte, wortel, kinderen, eenheden) en de vier regels die overal identiek terugkeren, inclusief de volle-breedte primaire knop onder 768px (negen keer identiek toegepast) en `<br>` in koppen op `display:none` onder 1200px (28 keer).

**Detail:** §5 van dit document; `vibe-design-tokens-v1.md §6`; QA-poorten P1, P2, P3 en P10 in `vibe-migration-checklist-v1.md §5`.

### 1A.7 Claim policy

1. **Vijf statussen, exact deze:** `VERIFIED` (primaire bron: rapport, contract, meetdata, productspecificatie — publiceerbaar binnen de scope van die bron) · `SUPPORTED` (reproduceerbaar af te leiden uit betrouwbare repository-data — publiceerbaar, uitsluitend in een formulering die exact de telling of bron dekt) · `UNVERIFIED` (bestaat in marketingcopy, onderbouwing ontbreekt — niet automatisch migreren: kwalitatief herschrijven, CONTENT PENDING, of verwijderen) · `CONFLICTING` (bronnen noemen verschillende waarden — migratie van die claim blokkeren tot opgelost) · `REMOVE/REWRITE REQUIRED` (aantoonbaar fout, misleidend of ruimer dan de bron — niet meenemen).
2. **HARD RULE: PUBLICLY EXISTING ≠ VERIFIED.**
3. **C-07 toegepast:** "47 opgeleverde projecten", "12 MWp zon geïnstalleerd" en "98% gemiddelde uptime" (`projecten.html:173-175`) zijn `UNVERIFIED`. Toegestaan is de `SUPPORTED`-formulering "11 projecten uitgelicht" (`index.html:265`) of "11 gepubliceerde projectcases"; **niet** "Vibe heeft slechts 11 projecten gerealiseerd".
4. **De leadpopup valt onder dezelfde policy:** `_leadpopup.js:116` toont "7 waardestromen · 0 jr wachttijd · −22% netinkoop" zonder bron = `UNVERIFIED`. Bij de betreffende migratie VERIFIED maken met een primaire bron, herschrijven, of verwijderen. **Nu geen productiecode wijzigen.**

**Detail:** §6.6 van dit document (statussen met gemeten voorbeelden) en §6.2 (wanneer een getal mag); de verplichte claimverificatie staat als poort in `vibe-migration-checklist-v1.md §1.2`.

### 1A.8 Sector taxonomy

1. **Vijf canonieke sectoren plus één segment:** Commercieel vastgoed (`VERIFIED`, 2 cases) · Woningportefeuilles (`VERIFIED`, 6) · Recreatie (`VERIFIED`, 1) · Logistiek & transport (`CASE PROOF = PENDING`) · Automotive (`VERIFIED`, 2 cases, **pagina ontbreekt**) · VvE als segment **binnen** Woningportefeuilles (`CASE PROOF = PENDING`).
2. **De sectoren zijn bewust breed gehouden**, zodat een sector niet op één case hoeft te drijven.
3. **"Netcongestie & Energy Hubs" is geen sector** maar een probleem/oplossing; het verhuist van de sector-as van `projecten.html` (chip `:185`, `data-sector="Netcongestie"` op Ratio 16) naar de oplossing-as, die door de B2-varianten *Oplossing* en *Gebied* wordt bediend.
4. **Niets verzinnen:** waar geen case bestaat staat `CASE PROOF = PENDING`, en er wordt geen case toegeschreven aan een sector waarin zij niet valt.

**Detail:** §6.8 van dit document (de vijf gemeten vocabulaires, de mapping van legacy-labels, de asymmetrieën en de aanbevolen URL's); `vibe-page-archetypes-v1.md §0.4`.

### 1A.9 CTA policy

1. **Eén primaire CTA-anatomie:** label van 2-4 woorden met het werkwoord voorop en zonder leesteken, gevolgd door de pijlglyph `M4 12h15m-6-6 6 6-6 6`; `data-calendly` met `href="contact"` als fallback (`index.html:157-159`).
2. **CTA's worden in de pagina geïntegreerd, nooit sticky. Geen sticky mobiele CTA in Design System V1.0** (C-04). De legacy `.mcta` op **26 gemeten pagina's** (definitie o.a. `projecten.html:328`, `position:fixed … bottom:0`) verdwijnt bij migratie.
3. **Onder 768px wordt elke primaire CTA een volle-breedte knop** met de anatomie uit §5.3: `box-sizing:border-box`, `width:100%`, `height:var(--m-btn-h)`, `padding:0 20px`, `font-size:16px`, `border-radius:10px`, `justify-content:space-between`, svg 19×19px.
4. **Niet dogmatisch verboden:** een sticky variant mag later terugkomen als afzonderlijke CRO-test wanneer conversiedata dat ondersteunt — buiten V1.0, en niet als stilzwijgende uitzondering binnen een bouwtype.

**Detail:** §5.5 van dit document (uitgesloten patroon, met de 26 gemeten pagina's) en §7 (matrixrij `Sticky mobiele CTA — EXCLUDED`); `vibe-legacy-inconsistencies-v1.md L-21`; D-register D10.

### 1A.10 Gated-guide policy

1. **De zeven `report.css`-documenten zijn gated assets / lead magnets**, geen publiek pagina-archetype en geen normale SEO-contentpagina's: ze worden via de leadflow ontsloten, niet via navigatie, footer of interne knoppen, en gaan uit de publieke sitemap waar van toepassing (nu staan er drie in: `sitemap.xml:16`, `:118`, `:124`).
2. **HARDE REGEL: NO ASSET → NO DOWNLOAD PROMISE.** Gemeten: **nul PDF-bestanden** in de repository, `assets/brochures/` bestaat niet, en alle vijf `window.VIBE_LEAD`-configuraties leveren een **HTML-guidepagina** als `file`.
3. **De copy mag dus geen PDF-download beloven.** Dat raakt de knoptekst "Stuur mij de brochure" (`_leadpopup.js:124`) en de eyebrow "Gratis brochure" (`:113`); het dode voorbeeldpad `assets/brochures/netcongestie-oplossen.pdf` (`_leadpopup.js:9`) wordt bij migratie gecorrigeerd of verwijderd.
4. **Delivery moet aantoonbaar werken** en routeert naar een zakelijke centrale bestemming, niet naar een persoonlijk e-mailadres. **De guide-inhoud zelf blijft behouden.**

**Detail:** §6.9 van dit document; `vibe-page-archetypes-v1.md §0.5` (volledige assetinventarisatie); `vibe-legacy-inconsistencies-v1.md L-15`, `L-16`, `L-17`; D-register D12.

### 1A.11 Migration methodology

1. **Volgorde, per bouwtype, in lock-step:** DESIGN SYSTEM V1.0 FREEZE → MASTER PAGE PER BOUWTYPE → VISUAL + FUNCTIONAL REVIEW → MASTER LOCK → OVERIGE PAGINA'S VAN DAT TYPE → QA → VOLGENDE.
2. **De zeven masters, in deze volgorde:** 1 · B2 `systeem-energieopslag.html` — 2 · B3 `project-ratio-16.html` — 3 · B4 `projecten.html` — 4 · B6 `contact.html` — 5 · B5 `waarom-vibe.html` — 6 · B7 `privacy.html` — 7 · S2 de gated guides.
3. **B1 is al Master v1 en wordt NIET opnieuw gebouwd.**
4. **Open punten worden beslist bij de master die ze als eerste raakt.** Daarom staan de punten uit het D-register (`vibe-migration-checklist-v1.md`, bijlage D1-D20) in §8 als `DEFERRED TO PAGE MIGRATION`, elk met de exacte voorwaarde waaronder het besluit heropent.
5. **Ontbrekende businessinformatie blijft `CONTENT PENDING`** en wordt niet met een plaatshouder, een aankondiging of een gegenereerd beeld ingevuld (§6.3).

**Detail:** `vibe-migration-checklist-v1.md §0.1` (methodiek), `§0.2` (de zeven masters), `§1.2` (claimverificatie) en `§5` (QA-poorten P1-P12); §8 van dit document voor de stand van de open punten.

### 1A.12 V1.1 — COMPOSITION EXTENSION

**Status:** `V1.1 — ADDITIEF op V1.0`. Deze paragraaf is zelf **geen** nieuw besluit en draagt daarom niet de stempel `DECIDED — V1.0`. §1A.1 t/m §1A.11 blijven onverkort `FROZEN`; hieronder staat uitsluitend welke laag erbij is gekomen en waar die is vastgelegd.

1. **De architectuurketen heeft één laag erbij.**

```
TOKENS -> PRIMITIVES -> COMPONENTS -> SECTION COMPOSITIONS -> PAGE ARCHETYPES
                                      ^^^^^^^^^^^^^^^^^^^^
                                      nieuw in V1.1
```

2. **Waar de compositielaag staat:** `docs/vibe-section-compositions-v1.md`. Dat document legt vast wat V1.0 niet vastlegt — niet **waaruit** een pagina bestaat, maar **hoe die delen liggen**: de rangschikking binnen één sectie (twaalf families `C1`-`C12`, §4 daar) en de verhouding tussen secties binnen één pagina (paginaritme HIGH/MEDIUM/QUIET, met een aanbevolen ritmepatroon per bouwtype, §6 daar). Het is afgeleid uit dezelfde bron als dit brandbook: Homepage Master v1, commit `aae26bf`.

3. **V1.0 blijft ongewijzigd.** Niet vervangen en niet geherinterpreteerd: de tokenketen (§1A.5), de primitieveset en het abstractieverbod (§1A.4), de naamgeving (§1A.2), de archetypes B1..B7 + S2 (§1A.3), de claim policy (§1A.7), de navigatiebesluiten (§1A.1, C-01) en het CTA-besluit (§1A.9, C-04), de responsieve architectuur (§1A.6) en de migratiemethodiek (§1A.11). V1.1 introduceert bovendien **geen enkele nieuwe token** (`vibe-section-compositions-v1.md §1.4`). Het compositiedocument is read-only tot stand gekomen en registreert in zijn koptabel dat er geen productiecode is gewijzigd.

4. **Voorrang blijft zoals in §1.3.** Bij tegenspraak wint §1A. Een compositieregel die een bevroren besluit zou doorkruisen, staat in `§8` van het compositiedocument als `DECISION REQUIRED` (DR-C-01 t/m DR-C-11) en geldt daar uitdrukkelijk **niet** als regel. Eén zo'n tegenspraak is al gemeten: familie `C5` (voortgangsrij) noemt zichzelf gedeelde CSS en kandidaat voor `.vibe-steps`, terwijl §1A.4 punt 3 de homepage process timeline (`home-process.css:152-204`) expliciet niet-abstraheerbaar verklaart. §1A.4 wint tot er werkelijk hergebruik in de repository staat; zie `vibe-component-library-v1.md §0.2a` en `§0.4`.

5. **Let op de nummerbotsing.** `P1`-`P16` in het compositiedocument zijn **principes** (§2.10 daar); `P1`-`P13` in `vibe-migration-checklist-v1.md §5` zijn **QA-poorten**. Verwijs er altijd volledig gekwalificeerd naar, met documentnaam erbij.

**Detail:** `docs/vibe-section-compositions-v1.md` §1 (afbakening en gemeten aanleiding), §4 (de twaalf families), §6 (paginaritme en de patronen per bouwtype), §7 (de zestien anti-patronen); `vibe-component-library-v1.md §0.2a` (component tegenover sectiecompositie); `vibe-page-archetypes-v1.md §4.1a` (ritmepatroon per bouwtype); `vibe-migration-checklist-v1.md §2.0` (verplicht compositieplan) en `§5 P13` (anti-patroonpoort).

---

**De overige vijf documenten — `vibe-design-tokens-v1.md`, `vibe-component-library-v1.md`, `vibe-page-archetypes-v1.md`, `vibe-migration-checklist-v1.md` en `vibe-legacy-inconsistencies-v1.md` — zijn detaildocumenten bij deze baseline. Zij werken uit, meten na en maken uitvoerbaar wat hier is vastgelegd. Bij tegenspraak tussen een detaildocument en deze frozen baseline wint de frozen baseline.**

---

## 2. Het drie-lagen-model

### 2.1 De drie lagen

| Laag | Definitie | Toets |
|---|---|---|
| **BRAND CONSTANTS** | Waarden die nooit per pagina veranderen: merkblauw, navy, de letter, de focusring, de hoek van de Vibe-diagonaal, de pijlglyph. | Verandert deze waarde als de pagina verandert? Nee → constante. |
| **REUSABLE COMPONENTS** | Patronen die op meerdere pagina-archetypes terugkomen met dezelfde anatomie en andere inhoud: knop, eyebrow, kop, lead, kaart, sectorkaart, footer. | Kan een ander archetype dit vullen met eigen inhoud zonder de vorm te wijzigen? Ja → component. |
| **PAGE-SPECIFIC COMPOSITIONS** | Composities die hun betekenis ontlenen aan hun plaats op de homepage: de hero-diagonaalcompositie, de bewijsstrook, het uitgelichte projectpaneel, de VIBE.CONTROL-console, de final-CTA-chevron. | Wordt dit op een tweede pagina een leugen, een herhaling of een lege doos? Ja → alleen homepage. |

### 2.2 Waarom dit onderscheid bestaat

Het onderscheid is geen ordeningsvoorkeur. Het houdt drie soorten schade tegen die alle drie in deze repository al zijn aangetroffen:

1. **Inhoudelijke schade.** De bewijsstrook (`index.html:222-293`) telt wat de site toont. Zet je hem ook op `projecten.html`, dan staan er twee tellingen van hetzelfde onderwerp naast elkaar — precies het conflict dat `projecten.html:173-175` (47 / 12 MWp / 98%) tegenover `projecten.html:191` ("Alle 11 gerealiseerde projecten") nu al veroorzaakt.
2. **Vormschade.** De hero-header zit ingebakken in dezelfde `.vh-stage`-container als de hero zelf (`index.html:128` binnen `index.html:77-206`, podium op `home-hero.css:35-49`). Die compositie is niet los te trekken; elke pagina die `_header.js` draait kan hem niet dragen.
3. **Onderhoudsschade.** Een waarde die als constante geldt maar op vijftien plekken staat uitgeschreven, drift. Gemeten: de hoverkleur `#005FE0` staat zeven keer hardgecodeerd (`home-solutions.css:84`, `home-project.css:193`, `home-control.css:277`, `home-proof.css:212`, `home-infra.css:128`, `home-final.css:188`, `home-footer.css:236`) en één keer via het token (`home-hero.css:229`), terwijl `--vibe-blauw-diep` op `home.css:36` bestaat.

### 2.3 Master v1 is visueel consistent, maar heeft structureel nog geen bibliotheek

Dit is de kernbevinding en hij moet bij elke migratiebeslissing op tafel liggen.

**De pagina oogt als één systeem.** Alle tien blauwaliassen wijzen naar `var(--vibe-blauw)` (`home-hero.css:17`, `home-solutions.css:18`, `home-project.css:29`, `home-process.css:28`, `home-control.css:26`, `home-proof.css:24`, `home-infra.css:24`, `home-final.css:25`, `home-footer.css:26`, `home-mobile.css:30`). Eén letter (`home.css:83`, `home.css:105`: Urbanist). Eén pijlglyph, 27 keer (`index.html`, pad `M4 12h15m-6-6 6 6-6 6`, geteld: 27 treffers). Eén lijnstijl: 79× `stroke="currentColor"` tegenover 6× `fill="currentColor"` (geteld in `index.html`).

**Maar er is geen gedeeld primitief.** Er bestaan **vijftien** verschillende CTA-klassen in de negen stylesheets:

| Klasse | Gedefinieerd in | Instanties in `index.html` |
|---|---|---|
| `.vh-btn` | `home-hero.css:207-229` | 3 (regels 157, 189, 192) |
| `.vh-btn-primair` | `home-hero.css:226-229` | 2 (157, 189) |
| `.vh-btn-secundair` | `home-hero.css:230-235` | 1 (192) |
| `.vh-cta` | `home-hero.css` (wikkel) | 1 |
| `.vh-sol-cta` | `home-solutions.css` | 1 (308) |
| `.vh-pr-cta` | `home-project.css` | 1 |
| `.vh-pr-knop` | `home-project.css:183 e.v.` | 1 (513) |
| `.vh-ctrl-cta` | `home-control.css:267 e.v.` | 1 (746) |
| `.vh-proof-cta` | `home-proof.css:187-213` | 1 |
| `.vh-proof-strip-cta` | `home-proof.css` | 1 |
| `.vh-infra-cta` | `home-infra.css:128 e.v.` | 1 (900) |
| `.vh-infra-cta2` | `home-infra.css:130-143` | 1 (903) |
| `.vh-final-cta` | `home-final.css:178 e.v.` | 1 (970) |
| `.vh-final-cta2` | `home-final.css:189-208` | 1 (971) |
| `.vh-footer-nb-cta` | `home-footer.css:236 e.v.` | 1 (1106) |

Gemeten met `grep` over `home-*.css` en `index.html`: alle vijftien bestaan in CSS; `.vh-btn` komt drie keer in de markup voor en **alle drie in sectie 1** (`index.html:157`, `:189`, `:192`). Sectie 2 tot en met 9 gebruiken `.vh-btn` nergens.

Datzelfde geldt voor de andere basiselementen:

- **Eyebrow:** negen sectie-eigen klassen met elk een eigen graad en tracking (`home-hero.css:249-257`, `home-solutions.css:37-45`, `home-project.css:108-116`, `home-process.css:63-71`, `home-control.css:202-209`, `home-proof.css:68-75` en `:162-169`, `home-infra.css:41-48`, `home-final.css:137-144`). Eén is `font-weight:600` (`.vh-eyebrow`, `home-hero.css:252`), de acht andere zijn 700.
- **Kop en lead:** acht sectie-eigen klassen, elk met een eigen `font-size` in cqw op een eigen referentiecanvas.
- **Radius:** `home.css:55-57` definieert `--vibe-radius-kaart`, `--vibe-radius-mob` en `--vibe-radius-rond`. Alle drie worden **nul keer** via `var()` aangeroepen; elke sectie zet zijn eigen waarde.
- **Elevatie:** `--vibe-elev-1` (`home.css:60-61`) en `--vibe-elev-2` (`home.css:62-63`) worden nul keer aangeroepen, terwijl hun exacte waarden zijn uitgeschreven in `home-process.css:122` respectievelijk `home-proof.css:249-250`. Alleen `--vibe-elev-mob` (`home.css:64-65`) leeft, en dan één keer (`home-infra.css:402`).

**Conclusie:** Master v1 is een *visueel* consistent systeem dat op tokenniveau voor de helft is doorgevoerd en op componentniveau niet bestaat. De enige echt gedeelde primitieven zijn: de `--vibe-*`-kleurtokens die via aliassen worden geïmporteerd, de `--m-*`-tokenlaag onder 1200px, en `.vh-btn*` — dat laatste alleen binnen sectie 1.

### 2.4 Wat dat voor de migratie betekent

| Situatie | Consequentie |
|---|---|
| Je bouwt een tweede pagina | Je kunt géén component importeren. Er is niets te importeren. Elke knop, eyebrow en kop moet opnieuw worden opgeschreven, of de bibliotheek moet eerst worden gebouwd. |
| Je bouwt de bibliotheek | De vijftien CTA-klassen moesten eerst worden teruggebracht tot een beslissing over hoeveel knopvarianten het systeem kent. **Dat besluit is genomen:** één primitieve `.vibe-btn` met vier varianten (`--primary`, `--secondary`, `--ghost`, `--text`), §1A.4. De vijftien klassen worden niet overgenomen; hun waarden leveren hooguit de startwaarden. De exacte maten volgen bij de B2-master (§8.3 C1, C2). |
| Je trekt maten gelijk | Doe dat niet blind. De verschillen komen uit vier verschillende referentiecanvassen: 1774×748/887 voor S1, S2, S6, S7 (`home-hero.css:4-7`: "1cqw = 17,74 referentiepixels"), een 2056-paneel voor S3 (`home-project.css:14`: "1 referentie-px = 0,046719cqw"), 1536 voor S4 en S5 (`home-process.css:13`: "0,0659058cqw"), 2103 voor S8 en S9 (`home-final.css:9-10`: "0,047551cqw"). Een radius van `.7328cqw` (`home-infra.css:79`) en `.7329cqw` (`home-control.css:58`) renderen beide exact 13,00px — dat zijn géén twee waarden. |
| Je tokeniseert door | De mobiele laag is het geconsolideerde deel: onder 1200px kent de pagina drie radii (10px knop, 12px `--m-radius-img`, 14px `--m-radius`) en twee schaduwen. Desktop kent vier knopradii en twaalf kaartradii. Neem de mobiele consolidatie als model, niet de desktoplaag. |
| Je laadt `tokens.css` mee | Op de homepage is dat bestand dood: nul `var(--t-*)`-verwijzingen in alle elf home-bestanden, en geen enkele selector van de UNIFY LAYER (`tokens.css:69-105`) matcht op de 229 klassen in `index.html`. Op de 34 andere pagina's is het wél actief, inclusief `--t-radius:0px` met de kop "brand vormtaal is SHARP" (`tokens.css:50-51`) en een `!important`-laag die radii op 0 forceert (`tokens.css:87-94`). Master v1 doet precies het omgekeerde: afgeronde hoeken en ronde lijneinden. Dat conflict moet worden opgelost voordat een Master v1-kaart op een subpagina komt. |

---

## 3. BRAND CONSTANTS

Beschrijvend. De volledige waardetabel staat in het **tokendocument**; hier staat welke laag wat draagt en welke constanten werkelijk constant zijn.

### 3.1 De drie tokenlagen

1. **Semantische laag — `home.css:29-71`.** Gemeten: **23** `--vibe-*`-definities (`home.css:35-70`). Dit is de enige laag die merkbetekenis draagt.
2. **Mobiele laag — `home-mobile.css:15-33`**, met één tabletoverride op `:34-45`. Veertien `--m-*`-tokens die onder 1200px de maatvoering, de typografie en de gutter dragen.
3. **Sectie-aliassen — 44 stuks** over de negen sectiebestanden. Elke sectie hernoemt de tokens die zij gebruikt (`--sol-blauw`, `--pr-blauw`, `--pc-blauw`, `--ct-blauw`, `--pf-blauw`, `--if-blauw`, `--fi-blauw`, `--ft-blauw`, `--vh-blauw`, `--m-blauw`). Tweeëntwintig daarvan wijzen naar een `--vibe-*`-token; tweeëntwintig dragen nog een eigen hardgecodeerde waarde.

> **Correctie op het aangeleverde bewijs.** Zowel `kleur.json` als de opdrachtsamenvatting spreekt van **24** `--vibe-*`-tokens. Gemeten in `home.css` op commit `aae26bf`: **23** definities, op de regels 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 49, 50, 51, 52, 55, 56, 57, 60, 62, 64, 68, 69, 70. Er is geen `--vibe-*`-definitie in enig ander `home-*.css`-bestand (gemeten). Dit document houdt 23 aan.

### 3.2 De constanten die werkelijk constant zijn

| Constante | Waarde | Vastgelegd in | Hoe hard |
|---|---|---|---|
| Merkblauw | `#0073FE` | `home.css:35`; ook `<meta name="theme-color">` op `index.html:55` | Hard. Tien aliassen wijzen hierheen — de enige volledig doorgevoerde consolidatie van de pagina. |
| Hoverblauw | `#005FE0` | `home.css:36` | Waarde is hard (acht knoppen, acht keer dezelfde waarde), tokenisering niet: zeven van de acht staan uitgeschreven. |
| Navy (kopinkt) | `#08203C` | `home.css:41` | Half. S1 gebruikt `#071D3A` (`home-hero.css:19`) en S9 `#0C1B33` (`home-footer.css:27`) voor dezelfde rol. Zie §8. |
| Diepste navy | `#001632` | `home.css:42` | Hard binnen S3 en de console. |
| Letter | Urbanist 400/500/600/700/800 | `home.css:83` (html, body) en `home.css:105` (h1, h2, h3) | Hard. Eén letter op de hele pagina. |
| Focusring | 2px `var(--vibe-focus)` = `#0073FE`, offset 3px, `!important` | `home.css:68` + `home.css:119-127` | Hard. Verslaat de cyane `#0096CC`-ring uit `tokens.css:102-105` doordat `home.css` later laadt (`index.html:56-57`). Het commentaar op `home.css:115-117` legt dat expliciet vast. |
| Lijnstijl | 1px solid, geen dashed, geen dotted | 25 randen gemeten; twee uitzonderingen: 1,5px op `.vh-btn-secundair` (`home-hero.css:233`) en `.115cqw` op de telefoonbehuizing (`home-control.css:72`) | Hard. |
| Lijneinden in iconen | `stroke-linecap: round` (79×), `stroke-linejoin: round` (74×) | `index.html`, geteld | Hard. Nergens een butt- of miter-einde. Dit staat haaks op `tokens.css:50-51`, dat op de homepage niet meer doorwerkt. |
| Elevatie | Drie niveaus benoemd: `--vibe-elev-1`, `--vibe-elev-2`, `--vibe-elev-mob` | `home.css:59-65` | Zacht. Het commentaar op `home.css:59` noemt "23 losse box-shadows"; gemeten op deze commit zijn het er 15 in de negen sectiebestanden (solutions 1, process 1, control 6, proof 2, infra 4, final 1; hero/project/footer/mobile 0). Zie §8. |
| Overloopvangrail | `html,body{ overflow-x:clip }` | `home.css:80-86` | Hard, op elke breedte. Let op: `clip` snijdt af, het herschikt niet — het verbergt fouten. |
| Koppenvangrail | `text-wrap:balance` + `overflow-wrap:break-word` op `h1,h2,h3` | `home.css:104-111` | Hard, maar raakt alleen `h1/h2/h3`. Koppen die als `<b>` of `<span>` zijn gemarkeerd (`.vh-kpi-getal`, `.vh-infra-kaart-tx b`, `.vh-footer-nav b`) vallen erbuiten en hebben hun eigen behandeling. |
| Viewport | `width=device-width,initial-scale=1`, geen `maximum-scale`, geen `user-scalable=no` | `index.html:15` | Hard. Knijpzoomen blijft toegestaan. `-webkit-text-size-adjust:100%` op `home.css:77`. |

### 3.3 Drie secties dragen geen elevatie

`home-hero.css`, `home-project.css` en `home-footer.css` bevatten nul `box-shadow`-declaraties (gemeten). Dat zijn exact de drie secties die op geometrie en fotografie leunen in plaats van op zwevende kaarten. De zes kaartsecties dragen samen alle vijftien schaduwen. Dit is een bruikbare regel: **een sectie kiest tussen geometrie en elevatie, niet allebei.**

---

## 4. VIBE VORMTAAL

De vormtaal rust op drie pijlers: geometrie (§4.1), fotografie (§4.2) en iconografie (§4.3). De harde contentregels voor beeld staan in §4.4.

### 4.1 Geometrie

#### 4.1.1 Waar geometrie zit

**Acht van de negen sectiebestanden bevatten `clip-path`.** Gemeten per bestand:

| Sectie | Bestand | `clip-path`-declaraties | Waarvan mobiel/uit |
|---|---|---|---|
| S1 hero | `home-hero.css` | **5** (`:57`, `:92`, `:120`, `:450`, `:463`) | `:450` = `none`, `:463` = mobiele driehoek |
| S2 oplossingen | `home-solutions.css` | 1 (`:318`) | — |
| S3 project | `home-project.css` | **0** | — |
| S4 proces | `home-process.css` | 1 (`:43`) | — |
| S5 VIBE.CONTROL | `home-control.css` | 1 (`:40`) | — |
| S6 bewijs | `home-proof.css` | 3 (`:54`, `:224`, `:434`) | `:434` = `none` |
| S7 infrastructuur | `home-infra.css` | 2 (`:160`, `:345`) | `:345` = `none` |
| S8 final CTA | `home-final.css` | **5** (`:40`, `:63`, `:99`, `:376`, `:394`) | `:376` = `none`, `:394` = mobiele driehoek |
| S9 footer | `home-footer.css` | 2 (`:48`, `:376`) | `:376` = `none` |

Totaal 20 declaraties, waarvan 4 `clip-path: none`. **Hero en final CTA dragen er elk vijf** — de twee zwaarst geladen bestanden.

**S3 is de uitzondering, maar niet vormloos.** `home-project.css` heeft geen `clip-path`; de sectie leunt op twee andere middelen:
- Een inline SVG met twee polygonen (`index.html:478-493`, viewBox `0 0 2056 682`, `preserveAspectRatio="none"`): het verdonkerende topvlak `1777,0 2056,0 2056,682 1321,682` en de accentwig `2056,296 1776,682 2056,682`, met een lichtrand `M2056 296 1776 682` in `#BFD9FF` op 55% (`index.html:492`).
- Een navy gradient-scrim zonder geknipte rand (`home-project.css:69-83`): `linear-gradient(90deg, #001632 0%, #001632 20%, rgba(0,22,50,.74) 32%, rgba(0,22,50,.30) 46%, rgba(0,22,50,.06) 60%, rgba(0,22,50,0) 70%)` plus `linear-gradient(180deg, rgba(0,18,42,.30) 0%, rgba(0,18,42,0) 26%)`. **Dit — niet de SVG — maakt de witte projectkolom leesbaar.**

Ook S1 draagt inline SVG-geometrie naast zijn clip-paths: `index.html:95-122`, viewBox `0 0 1774 748`, met de accentwig `1774,50 1270,748 1774,748` en de navyvorm `M1774 441H1454.4a90 90 0 0 0-72.8 37.2L1186 748H1774Z`, twee keer gevuld (`index.html:120-121`).

#### 4.1.2 De exacte vormen

| # | Vorm | Exacte definitie | Bron |
|---|---|---|---|
| 1 | S1 fotolaag — hoofddiagonaal met inkeping | `polygon(56.223% 0, 100% 0, 100% 100%, 42.537% 100%, 35.169% 72.861%)` → op 1774×748: (997,0) (1774,0) (1774,748) (755,748) (624,545) | `home-hero.css:57-63` |
| 2 | S1 lichte band langs de diagonaal | `polygon(56.223% 0, 62.141% 0, 33.246% 100%, 27.328% 100%)`; breedte 105 ref-px; vulling `linear-gradient(180deg, rgba(255,255,255,.50) 0%, rgba(255,255,255,.22) 29%, rgba(255,255,255,0) 62%)` | `home-hero.css:85-102` |
| 3 | S1 zachte wig onder de knik | `polygon(35.169% 72.861%, 42.537% 100%, 27.328% 100%)`; vulling `linear-gradient(180deg, rgba(182,215,252,0) 72.86%, #B6D7FC 72.86%, #D8EBFC 80.2%, #E4F2FC 85.6%, rgba(232,244,253,0) 91%)` | `home-hero.css:114-132` |
| 4 | S1 SVG-accentwig | `<polygon points="1774,50 1270,748 1774,748" fill="url(#vhAccent)" opacity=".92"/>` | `index.html:119`, verloop `:97-103` |
| 5 | S1 SVG-navyvorm (tekstplaat) | `M1774 441H1454.4a90 90 0 0 0-72.8 37.2L1186 748H1774Z`, boog r=90, twee vullingen | `index.html:120-121`, verlopen `:104-117` |
| 6 | S2 HVAC-vlak | `polygon(46% 0, 100% 0, 100% 100%, 0 100%)` op `.vh-sol-grafisch::before`, `right:-18%`, `top:-12%`, `width:78%`, `height:124%` | `home-solutions.css:311-320` |
| 7 | S3 topvlak (SVG) | `points="1777,0 2056,0 2056,682 1321,682"`, vulling `#00265E` .34 → 0 op .62 | `index.html:490` |
| 8 | S3 accentwig + lichtrand (SVG) | `points="2056,296 1776,682 2056,682"` + `stroke="#BFD9FF" stroke-opacity=".55" stroke-width="2.6"` | `index.html:491-492` |
| 9 | S4 achtervlak | `polygon(42.30% 0, 100% 0, 100% 100%, 28.92% 100%)`, `top:1.3866cqw`, `height:20.034cqw`, vulling `linear-gradient(180deg, #E1F1FE 0%, #E9F5FE 52%, #EFF8FE 100%)` | `home-process.css:37-46` |
| 10 | S5 vijfhoek | `polygon(7.0% 9.5%, 62% 4%, 62% 96%, 6.6% 88%, -0.6% 46%)`, vulling `linear-gradient(100deg, rgba(186,220,252,.52) 0%, rgba(192,224,252,.16) 30%, rgba(200,228,252,0) 52%)` | `home-control.css:35-45` |
| 11 | S6 accentdriehoek | `polygon(0 0, 100% 0, 100% 100%)`, `right:0`, `top:8.0000cqw`, 4.7914 × 7.4972cqw (85 × 133 ref), massief `#B8DCFB` | `home-proof.css:48-57` |
| 12 | S6 fotosnede | `polygon(17.55% 0, 100% 0, 100% 100%, 0 100%)` op een doos van 41.3980 × 31.4cqw | `home-proof.css:224` |
| 13 | S7 fotosnede | `polygon(11.5% 0, 100% 0, 100% 100%, 0 100%)` op een doos van 62.0068 × 41.5cqw | `home-infra.css:160` |
| 14 | S8 chevronwig | `polygon(48.83% 0, 60.06% 0, 47.31% 55.75%, 58.49% 100%, 47.31% 100%, 36.14% 55.75%)`; op 2103×748: (1027,0) (1263,0) (995,417) (1230,748) (995,748) (760,417) | `home-final.css:40-47` |
| 15 | S8 fotochevron | `polygon(24.19% 0, 100% 0, 100% 100%, 21.21% 100%, 0 55.75%)`, `left:47.31%` | `home-final.css:63-69` |
| 16 | S8 blauw merkvlak | `polygon(100% 0, 100% 100%, 0 100%)`, `right:0`, `top:36.50%`, `width:16.55%`, `height:63.50%`, vulling `linear-gradient(205deg, rgba(11,113,226,.88) 0%, rgba(1,92,208,.92) 48%, rgba(1,68,141,.94) 100%)` | `home-final.css:94-104` |
| 17 | S9 beeldwig | `polygon(38.07% 0, 100% 0, 100% 100%, 48.43% 100%, 0 47.51%)`, `left:80.2663cqw`, 19.7337 × 29.6244cqw (415 × 623 ref) | `home-footer.css:42-58` |
| 18 | Mobiele vervangdriehoek (S1) | `polygon(100% 0, 100% 100%, 0 100%)` op `.vh-foto::before`, `right:0`, `bottom:0`, `width:46%`, `height:62%`, `linear-gradient(200deg, rgba(0,115,254,.90) 0%, rgba(0,60,150,.92) 100%)` | `home-hero.css:458-466` |
| 19 | Mobiele vervangdriehoek (S8) | Zelfde `polygon`, `width:44%`, `height:58%`, `linear-gradient(200deg, rgba(0,115,254,.92) 0%, rgba(0,60,150,.94) 100%)` | `home-final.css:389-397` |

#### 4.1.3 De hellingfamilie

Gemeten dx/dy van de **vrije** randen (wiggen, banden, merkvlakken):

| Vorm | dx/dy | Graden uit het lood |
|---|---|---|
| S1 hoofddiagonaal | −0,684 | 34,4° |
| S1 band (beide randen) | −0,684 | 34,4° |
| S1 inkeping | +0,645 | 32,8° |
| S1 SVG-accentwig | −0,722 | 35,8° |
| S1 SVG-navyvorm | −0,725 | 35,9° |
| S3 topvlak | −0,669 | 33,8° |
| S3 wig | −0,725 | 35,9° |
| S4 achtervlak | −0,668 | 33,7° |
| S6 accentdriehoek | +0,639 | 32,6° |
| S8 wig boven / onder | −0,640 / +0,710 | 32,6° / 35,4° |
| S8 blauw vlak | −0,733 | 36,2° |
| S9 wig boven / onder | −0,534 / +0,615 | 28,1° / 31,6° |

**Twaalf van de zestien vrije randen liggen tussen 0,615 en 0,733 — dat is 31,6° tot 36,2°, ongeveer 1 : 1,4.** Dat is de feitelijke merkhoek.

**De fotosnedes vallen daar buiten, en dat is verklaarbaar:** S2 HVAC −0,467 (25,0°), S6 fotosnede −0,231 (13,0°), S7 fotosnede −0,172 (9,8°), de mobiele driehoeken −1,113 (48,1°) en −1,294 (52,3°). Oorzaak is meetbaar: deze clip-paths staan in **procenten van hun eigen doos**, en die dozen zijn hoog (S6 734 × 557 ref-px, S7 1100 × 736 ref-px) of klein (mobiele driehoeken). De hoek is een gevolg van de doosverhouding, niet van een gekozen waarde.

> **Praktische regel:** wie de merkhoek wil aanhouden in een nieuwe doos, moet het percentage **uitrekenen** uit de doosverhouding. Een percentage overnemen levert een andere hoek op.

#### 4.1.4 Functioneel versus decoratief

Van de achttien geknipte vlakken op desktop doen er **zes** werk en zijn er **twaalf** merkvocabulaire.

**FUNCTIONEEL (6)** — het vlak doet één van twee dingen: (a) beeld wegsnijden van een tekstkolom, of (b) een donkere plaat leveren waar witte tekst op staat.

| Vlak | Welk werk, met de meting |
|---|---|
| S1 fotosnede | Snijdt het herobeeld volledig weg uit de linkerkolom (`.vh-copy` op `left:4.6787cqw`). Het HTML-commentaar noemt de laag letterlijk "fotolaag, bijgesneden op de Vibe-diagonaal" (`index.html:79`). |
| S1 SVG-navyvorm | Draagt `.vh-navy-copy` (`left:77.114cqw`, `top:32.5812cqw`): witte tekst "Energy people progress" plus vier kernwoorden (`index.html:200`, `:203`). |
| S6 fotosnede | De verhaalkolom (`left:4.3968cqw`, breedte 30cqw → rechterrand 34,4cqw) overlapt de fotodoos (linkerrand 30,87cqw) met 3,5cqw. De snede haalt bovenin 7,3cqw beeld weg, precies waar de H3 staat. |
| S7 fotosnede | De kopkolom eindigt op 36,115cqw, de fotodoos begint op 36,2258cqw; de snede geeft 7,1cqw extra lucht naast de H2. Commentaar: "Zonder deze snede is dit vlak een kale rechthoek met zwevende kaarten" (`home-infra.css:158-159`). |
| S8 fotochevron | De fotorand zélf is de vorm: de chevron duwt het beeld weg van de tekstkolom. Binnenrand valt samen met de buitenrand van `.vh-final-wig` (beide op 47.31% / 995 ref). |
| S9 beeldwig | Draagt via `.vh-footer-wig::after` (`inset:0 0 42% 0`, `linear-gradient(180deg, rgba(10,38,74,.46) 0%, rgba(10,38,74,.16) 58%, rgba(10,38,74,0) 100%)`) de witte notitie `.vh-footer-note`. Commentaar: "leesbaarheidsscrim voor de notitie" (`home-footer.css:67-68`). |

**DECORATIEF (12):** S1 band, S1 wig, S1 accentwig, S2 HVAC-diagonaal, S3 topvlak, S3 wig, S3 lichtrand, S4 achtervlak, S5 vijfhoek, S6 accentdriehoek, S8 chevronwig, S8 blauw vlak.

Twee observaties bij de decoratieve groep:
- **S5 is nooit zichtbaar als vorm.** Het verloop is op 52% al volledig transparant, dus de rechterrand op 62% leest niet. Alleen de linkerpunt rond 46% hoogte is zichtbaar (`home-control.css:40-45`).
- **S6 is de enige vrijstaande.** Zeventien van de achttien vlakken zitten vast aan een fotorand, een tekstplaat, een fotoloze kaart of een apparaatblok. Precies één staat vrij: `.vh-proof-wig` (`home-proof.css:48-57`, 85 × 133 ref-px). Gemeten binnen `.vh-proof-b` staat hij **naast** de rechterrand van `.vh-proof-kaart` (kaart eindigt op 95,152cqw, wig begint op 95,209cqw), niet erachter — terwijl het commentaar op `home-proof.css:47` "achter de citaatkaart" zegt.

#### 4.1.5 De harde regel tegen diagonaalinflatie

De code legt geen regel vast in tekst, maar de **telling** is eenduidig en levert er een. Op desktop:

| Aantal geometrische gebaren | Secties |
|---|---|
| 5 | S1 (opening) |
| 3 | S3 (uitgelicht paneel), S8 (slot-CTA) |
| 1 | S2, S4, S5, S6, S7, S9 |

**REGEL — één gebaar per sectie, drie ankerpunten uitgezonderd.**
Een nieuwe sectie krijgt **precies één** geometrisch gebaar. Een meerdelige compositie (drie of meer vlakken) is voorbehouden aan drie rollen: een pagina-opening, één uitgelicht paneel en één slot-CTA. Een pagina heeft er hooguit drie van.

**REGEL — vrijstaande versiering: maximaal één per negen secties.**
Zeventien van achttien vlakken hangen ergens aan. De bovengrens voor vrij zwevende versiering is dus één per negen secties (`home-proof.css:48-57`). Een tweede vrijstaand driehoekje heeft geen precedent in deze codebase.

**REGEL — een vlak dat niets draagt, gaat uit zodra zijn inhoud verdwijnt.**
Dit is de enige schakelregel die letterlijk in de code staat, en hij staat op naam van wat **eroverheen ligt**, niet van de schermbreedte. Woordelijk, `home-infra.css:340-344`:

> "De Vibe-diagonaal en het verloop rechts horen bij de desktopcompositie, waar de sectorkaarten over de rechterhelft van de foto liggen. Op een volle-breedte beeldband zonder kaarten erover knipt de diagonaal een witte driehoek uit de linkerbovenhoek en verduistert het verloop de rechterkant zonder reden. Beide dus alleen op desktop."

Gevolgd door `.vh-infra-foto{ clip-path: none }` (`:345`) en `.vh-infra-foto::after{ display: none }` (`:346`).

**REGEL — een nieuwe vorm die geen van beide werksoorten doet, voegt zich bij de twaalf decoratieve.** Dat is precies de plek waar de pagina al verzadigd is. Wie een vlak toevoegt, moet kunnen aanwijzen of het beeld wegsnijdt van tekst, of een donkere plaat levert voor witte tekst. Kan hij dat niet, dan is het gebaar overtollig.

#### 4.1.6 De mobiele vormtaal is een derde van de desktopvormtaal

Onder 1200px houden **drie van de negen** secties geometrie:

| Sectie | Wat blijft |
|---|---|
| S1 | `.vh-foto::before` — blauwe driehoek rechtsonder in het beeld, 46% × 62%, gemeten op 390px viewport: 160 × 143,8px → −1,113 → 48,1° (`home-hero.css:458-466`) |
| S2 | `.vh-sol-grafisch::before` — onveranderd, want dit vlak *is* het beeld van de HVAC-kaart |
| S8 | `.vh-final-foto::before` — 44% × 58%, gemeten op 390px: 153,1 × 118,3px → −1,294 → 52,3° (`home-final.css:389-397`) |

Uitgeschakeld: S1 band/geo/wig (`home-hero.css:410`), S3 `.vh-pr-geo` (`home-project.css:234`), S4 achtervlak (`home-process.css:217`), S5 `::before` (`home-control.css:296`), S6 wig + fotosnede (`home-proof.css:391`, `:434`), S7 snede + verloop (`home-infra.css:345-346`), S8 wig + blauw vlak (`home-final.css:331`, `:388`), S9 wig volledig (`home-footer.css:372`).

**De Vibe-diagonaal verdwijnt niet, hij verhuist.** Commentaar `home-hero.css:457`: "de Vibe-diagonaal keert terug als accentwig onder het beeld". Commentaar `home-final.css:387`: "blauwe slotwig hoort bij het beeld zelf, niet als los vlak". De maten verschillen bewust licht (46%/62% tegenover 44%/58%, alfa .90/.92 tegenover .92/.94).

**Let op:** de regel is **niet** "geen diagonalen op mobiel". S1 en S8 houden juist wél een driehoek — een andere, steilere (48–52° tegenover de desktopfamilie op 32–36°).

#### 4.1.7 Waar het commentaar afwijkt van de coördinaten

Twee gevallen. In beide is het proza fout en zijn de coördinaten juist.

1. `home-hero.css:52` beschrijft de knik als "(621,545)", terwijl de `clip-path` 35.169% geeft = 623,9px en het inline commentaar op `home-hero.css:62` zelf "(624,545)" noteert.
2. `home-footer.css:39-40` noemt hellingen "−0,5486" en "+0,6493", terwijl de in hetzelfde commentaar genoemde coördinaten (1846,0)→(1688,296) en (1688,296)→(1889,623) respectievelijk −0,534 en +0,615 geven.

**Bij het overnemen van een vorm: volg de coördinaten, niet de in proza genoemde hellingen.**

---

### 4.2 Fotografie

Dertien inhoudelijke `<img>`-elementen. Alle dertien: `.webp` met `srcset`, `decoding="async"`, en een `alt`-attribuut. Eén is `loading="eager"` met `fetchpriority="high"` (het LCP-beeld, `index.html:84-88`); twaalf zijn `loading="lazy"`. Eén `alt` is bewust leeg (`s6-thumb`, `index.html:857`) omdat de link eromheen de tekst draagt. Daarnaast staat één tracking-pixel in `<noscript>` (`index.html:31-33`).

#### 4.2.1 Crop-principes

Twee afleidbare regels, beide gemeten over alle dertien beelden.

**Principe 1 — de horizontale uitsnede duwt het onderwerp wég van wat eroverheen ligt.**

| Waarde | Waar | Reden |
|---|---|---|
| 26% | S7 (`home-infra.css:168`) | Kaartkolom ligt rechts (`left:72.9989cqw`). Commentaar: "de batterijkasten stonden midden in beeld en vielen daardoor achter de sectorkaarten; nu staan ze links, naast de kaartkolom" (`home-infra.css:166-167`) |
| 78% | S8 desktop (`home-final.css:88`) | Onderwerp staat rechts. Commentaar: "Bij 50%/46% vulde de parkeerplaats het beeld en was de zonnecarport nauwelijks zichtbaar" (`home-final.css:85-87`) |
| 6% | S2 laadkaart (`home-solutions.css:505`) | Onderwerp staat links |
| 54% | S3 (`home-project.css:64`) | Scrim komt van links (`home-project.css:69-83`) |
| 50% | S1 (`home-hero.css:73`) | De uitsnede zit al in het derivaat: "bron x 1800..4400, y 900..2000" (`home-hero.css:68-69`) |

**Principe 2 — de verticale uitsnede ligt vrijwel altijd onder 50%.** In elf van dertien gevallen tussen 34% en 62%, waarvan het merendeel tussen 46% en 62%. Dat kort de lucht in en houdt het gebouw of de installatie in beeld.

#### 4.2.2 `object-position` per breakpoint

Alle gemeten waarden, met het gedrag over de breakpointgrens:

| Beeld | Desktop ≥1200 | ≤1199 | Bron |
|---|---|---|---|
| S1 hero | `50% 50%` | `56% 54%` | `home-hero.css:73` / `:453` |
| S2 zon | `56% 46%` | idem | `home-solutions.css:503` |
| S2 accu | `68% 52%` | idem | `home-solutions.css:504` |
| S2 laad | `6% 34%` | idem | `home-solutions.css:505` |
| S2 ems | `50% 50%` (geen declaratie) | idem | `index.html:418` |
| S2 handel | `50% 50%` (geen declaratie) | idem | `index.html:437` |
| S3 project | `54% 62%` | `56% 60%` | `home-project.css:64` / `:242` |
| S4 proces | `50% 52%` | idem | `home-process.css:109` |
| S6 verhaal | `52% 46%` | idem | `home-proof.css:232` |
| S6 duimnagel | `50% 38%` | idem | `home-proof.css:324` |
| S7 opslag | `26% 52%` | `46% 52%` | `home-infra.css:168` / `:347` |
| S8 CTA | `78% 56%` | `76% 44%` | `home-final.css:88` / `:382` |
| S9 footerwig | `46% 54%` | `46% 56%` (inert, zie hieronder) | `home-footer.css:64` / `:380` |

**Het gedrag over de grens volgt twee regels:**
1. **Valt de desktopoverlay weg, dan keert de uitsnede terug naar het midden.** S7 gaat van 26% naar 46% zodra de kaarten niet meer op de foto liggen.
2. **Wordt de beeldband laag (190–232px), dan gaat de verticale waarde omhóóg** om de horizon binnen de band te houden. S8 gaat van 56% naar 44%. Commentaar: "horizon iets hoger: skyline en carportrijen komen beide in de zichtbare band boven de afspraakkaart, minder leeg asfalt achter de kaart" (`home-final.css:380-381`).

**Uitzondering:** de drie S2-uitsnedes staan bewust **ná** alle media queries (`home-solutions.css:502-505`, commentaar `:502`: "bijsnijding van de foto's zodat het onderwerp in beeld blijft") en gelden daardoor op élke breedte. Het zijn de enige beelden met één uitsnede voor alle banden.

**Inert:** de mobiele `object-position` van S9 (`home-footer.css:380`) werkt niet, omdat `.vh-footer-wig{ display:none }` op `home-footer.css:372` in hetzelfde `≤1199`-blok staat en niet wordt teruggedraaid. Ook `height:180px` op `home-footer.css:401` is daardoor inert.

#### 4.2.3 Scrims — exacte waarden

| Scrim | Definitie | Bron |
|---|---|---|
| S1 hero, desktop | `linear-gradient(255deg, rgba(4,20,44,.30) 0%, rgba(4,20,44,.12) 46%, rgba(4,20,44,.34) 100%)` | `home-hero.css:81` |
| S1 hero, mobiel | `linear-gradient(196deg, rgba(4,20,44,.06) 0%, rgba(4,20,44,.34) 100%)` | `home-hero.css:455` |
| S2 boven-kaarten | `linear-gradient(180deg, rgba(3,20,44,.92) 0%, .90 38%, .56 50%, .12 62%, 0 72%)` + `linear-gradient(158deg, rgba(4,42,96,.30) 0%, rgba(4,34,80,0) 62%)` | `home-solutions.css:176-198` |
| S2 onder-kaarten | `linear-gradient(180deg, .62 0%, .80 26%, .90 46%, .90 100%)` + `linear-gradient(96deg, rgba(3,20,44,.40) 0%, 0 72%)` | `home-solutions.css:176-198` |
| S2 mobiel | Stops verschoven naar 0/52/66/80/92%; `--zon` apart op 0/40/56/72/86% | `home-solutions.css:426-449` |
| S3 project (tekstdrager) | `linear-gradient(90deg, #001632 0%, #001632 20%, rgba(0,22,50,.74) 32%, rgba(0,22,50,.30) 46%, rgba(0,22,50,.06) 60%, rgba(0,22,50,0) 70%)` + `linear-gradient(180deg, rgba(0,18,42,.30) 0%, rgba(0,18,42,0) 26%)` | `home-project.css:69-83` |
| S7 kaartkolom | `linear-gradient(268deg, rgba(3,20,44,.52) 0%, rgba(3,20,44,.30) 26%, rgba(3,20,44,.06) 46%, rgba(3,20,44,0) 62%)` | `home-infra.css:177-181` |
| S8 CTA, desktop | `linear-gradient(200deg, rgba(8,32,60,.62) 0%, rgba(8,32,60,.38) 44%, rgba(8,32,60,.58) 100%)` | `home-final.css:73-90` |
| S8 CTA, mobiel | `196deg`, .46 / .24 op 52% / .52 | `home-final.css:378-386` |
| S9 footerwig | `inset: 0 0 42% 0`; `linear-gradient(180deg, rgba(10,38,74,.46) 0%, rgba(10,38,74,.16) 58%, rgba(10,38,74,0) 100%)` | `home-footer.css:67-75` |

**REGEL — een scrim volgt de tekst, niet de diagonaal.** Dit is de enige scrimregel die de code met een meting onderbouwt, `home-solutions.css:171-175`:

> "Gemeten: met het oude, diagonale verloop stond de witte kaarttekst op sommige foto's op bijna zuiver wit (slechtste contrast 1,00:1 op de batterij- en laadkaart). Een diagonaal verloop volgt de tekst niet. Nu een band die dicht is waar de tekst staat en daarna snel opklaart, zodat de onderste helft van de foto vrij blijft."

Daaruit volgt: boven-kaarten (tekst bovenin) zijn dicht bovenin; onder-kaarten (tekst onderin) zijn dicht onderin. Op mobiel schuiven de stops mee, met de reden erbij: "op mobiel staan kop en onderregel dieper in de kaart dan op desktop" (`home-solutions.css:425`).

**Twee beelden hebben geen scrim:** `.vh-proof-foto` en `.vh-proof-strip-fig` (S6). Daar levert de kaart ernaast het contrast.

#### 4.2.4 Plaatshouderkleuren

| Kleur | Element | Bron |
|---|---|---|
| `#E8F1FB` | `.vh-proc-beeld` | `home-process.css:104` |
| `#DCE8F4` | `.vh-infra-foto` | `home-infra.css:156` |
| `#DCE8F4` | `.vh-footer-wig` | `home-footer.css:56` |
| `#E3ECF4` | `.vh-final-foto` | `home-final.css:70` |
| `#001632` | `.vh-pr-panel` (`var(--pr-navy)`) | `home-project.css:53` |
| *(geen)* | `.vh-sol-mod` (vijf fotokaarten), `.vh-proof-foto`, `.vh-proof-strip-fig` | `home-solutions.css:145-154`, `home-proof.css:218-227`, `:317-323` |

**REGEL — een lazy vlak krijgt een lichte tint uit de eigen sectie.** De reden staat één keer uitgeschreven en geldt voor alle vier, `home-process.css:99-103`:

> "Het beeld bedekt dit vak altijd volledig (object-fit: cover, 100%/100%), dus deze kleur is uitsluitend zichtbaar zolang het lazy beeld nog laadt. Met het oude #16283C leverde dat een groot donker vlak op in elke render waarin het beeld nog niet geladen was. Nu de eigen sectietint: de laadtoestand oogt als lege ruimte in plaats van als een fout."

**De enige donkere plaatshouder is gemotiveerd:** in S3 is de eindtoestand zelf navy (de scrim gaat tot `#001632` over 0–20% breedte), dus een lichte plaatshouder zou juist flitsen.

#### 4.2.5 Beeldhiërarchie

| Niveau | Kenmerk | Instantie |
|---|---|---|
| 1 — LCP | `loading="eager"` + `fetchpriority="high"`, vaste verhouding via `width=2600 height=1100` | S1 hero (`index.html:84-88`). Enige eager beeld van de pagina. |
| 2 — sectiebeeld | `loading="lazy"`, volle sectiebreedte of bijna, eigen scrim of eigen geometrie, lichte plaatshouder | S3 (96vw), S7 (62vw), S8 (52,7vw), S4 (54vw) |
| 3 — kaartbeeld | `loading="lazy"`, binnen een kaart, scrim uit de kaartklasse, géén plaatshouder | S2 (vijf fotokaarten), S6 verhaalbeeld (41,4vw) |
| 4 — duimnagel | `loading="lazy"`, `alt=""`, 5,5vw, geen scrim, geen plaatshouder | S6 projectstrook (`index.html:857`) |
| 5 — decoratieve band | `loading="lazy"`, draagt via de scrim een notitie, verdwijnt volledig onder 1200px | S9 footerwig (19,7vw) |

**Twee systeemregels in de levering:**

1. **`width`/`height` dragen de bronmaat, niet de derivaatmaat.** Gemeten: `hero-1920.webp` is 1920×813 bij `width=2600 height=1100` (verhouding 2,362 tegenover 2,364); `s2-zon-680` is 680×510 bij 4032×3024 (1,3333 tegenover 1,3333); `s3-project-1850` is 1850×1041 bij 5120×2880 (1,777 tegenover 1,778). De attributen dienen uitsluitend als verhoudingsreservering tegen layout shift. Het grootste geleverde derivaat is 2560px breed.
2. **`sizes` = de gemeten cqw-kolombreedte, op één decimaal.** Klopt voor tien van dertien beelden: hero 100vw, S3 96vw (paneel = 100cqw − 3,9459cqw marge = 96,05cqw), S4 54vw (53,912cqw), S6 41,4vw (41,3980cqw), S6-thumb 5,5vw (5,5242cqw), S7 62vw (62,0068cqw), S8 52,7vw (100% − 47,31%), S9 19,7vw (19,7337cqw), S2-ems 20vw (19,8985cqw), S2-handel 20vw (20,0113cqw). **Drie wijken af:** de bovenste S2-kaarten declareren alle drie 37,5vw terwijl hun kolommen 27,4521 / 17,0237 / 16,4600cqw breed zijn (`home-solutions.css:128`). Zie §8.

---

### 4.3 Iconografie

92 `<svg>`-elementen in `index.html` (geteld).

#### 4.3.1 Toegankelijkheidsconventie

**Elk icoon is decoratief.** Gemeten: 0× `role="img"`, 0× `aria-label` op een svg, 0× `<title>` binnen een svg. `focusable="false"` staat op 83 van de 92. `aria-hidden="true"` staat op de svg óf op de directe wikkel.

**REGEL — betekenis komt altijd van tekst ernaast.** Er is geen enkele plek op de pagina waar een svg zelf de naam van een bedieningselement draagt. Gebruik een svg dus nooit als enige label van een knop of link — dat patroon bestaat hier niet.

*Afwijkingen:* `aria-hidden` ontbreekt op de svg bij `index.html:450`, `:544`, `:641-646` en `:1025`; in alle gevallen draagt de ouder het. Negen svg's missen `focusable`: `:564`, `:580`, `:594` en `:641-646`.

#### 4.3.2 Stroke

**Lijn is de norm, vlak is de uitzondering met betekenis.** Gemeten: 79× `fill="none"` met `stroke="currentColor"`; 6× `fill="currentColor"` zonder stroke.

De zes gevulde pictogrammen zijn er twee in duplo-plus: de bliksem `M13.4 2 5 13.4h5.4L9.8 22l8.8-11.8h-5.6z` (`index.html:544`, `:722`), de bliksem `M13.6 1.8 4.9 13.1a.7.7 0 0 0 .56 1.12h4.3l-.86 7.5…` (`:884`, `:981`) en het staafdiagram met rects op x = 2.6 / 9.7 / 16.8 (`:888`, `:989`).

**REGEL — een pictogram dat een wáárde uitdrukt (snelheid, energie, rendement) is massief; alles wat een ding, een actie of een navigatie aanduidt is een lijntekening.**

**Lijndikte per context (gemeten in het 24-raster):**

| Dikte | Waar |
|---|---|
| 1.5 | S7 sectorkaart-iconen (`index.html:923`, `:928`, `:933`, `:938`) |
| 1.6 | EMS-knooppunticonen (`:664-666`, `:680-682`, `:705-708`) |
| 1.7 | S7 blad (`:892`), S8 kalender (`:985`, `:997`) |
| 1.8 | Footer contact (`:1049`, `:1053`, `:1057`), consolerail (`:641-646`) |
| 1.9 | S5 kenmerkiconen (`:730`, `:735`, `:740`) |
| 2.0 | Footernotitie-pijl (`:1025`) |
| 2.1 | Alle knop- en linkpijlen + de drie `.vh-sol-punt`-iconen (`:316`, `:323`, `:331`) |
| 2.2 | S4 stapiconen en chevrons, S6-pijlen |
| 2.3 | S2 cirkelpijlen |
| 2.4 | S1 KPI-iconen (`:258`, `:270`, `:282`), S2 kaarticonen, S7 sectorpijlen |
| 2.6 | Footervinkjes (`:1108-1110`) |
| 3.2 / 3.4 | Logobadge |

**Binnen één sectie is de dikte constant; over secties heen varieert hij.** De dikte volgt **niet** de weergavemaat: `.vh-proof-alle svg` is 1.5784cqw (28px) bij dikte 2.2, terwijl `.vh-btn svg` 1.2965cqw (23px) is bij 2.1 — groter én zwaarder. Zie §8.

**viewBox:** `0 0 24 24` dekt 62 van de 92. Daarnaast `0 0 44 44` (logobadge, 4×), `0 0 46 46` (S1 KPI, 3×), `0 0 40 40` (S2 blad, 1×), `0 0 20 24` (footer contact, 3×), `0 0 10 18` (proceschevron, 3×), `0 0 66 41` (footernotitie-pijl, 1×), elf afgeknipte viewBoxen met niet-nul oorsprong (bijvoorbeeld `2.4 4.4 35.2 33.2`), plus `0 0 92 240` (EMS-stroomlijnen) en de twee geometrie-SVG's `0 0 1774 748` en `0 0 2056 682`.

#### 4.3.3 Maten

**Desktop rekent in cqw; mobiel schakelt zonder uitzondering om naar vaste pixels.** De mobiele glyphmaat ligt overal tussen 16 en 24px, de container tussen 34 en 44px.

| Icoon | Desktop | <768px | 768–1199px |
|---|---|---|---|
| Logobadge (header) | 2.4802cqw (44px) | 34px | 40px |
| Logobadge (footer) | 3.5188cqw | 42px | — |
| S1 KPI | 2.7745cqw (49px) | 30px | 26px |
| S2 kaarticoon | 2.2547cqw (40px), zon 2.4803cqw (44px) | 28 / 32px | 30 / 34px |
| S2 puntlijst | 2.2547cqw | 30px | — |
| S4 stapicoon | 2.7060cqw (48px) | 17px in een 36px-cirkel | — |
| S4 kaarticoon-svg | 1.1cqw | 18px | — |
| S5 kenmerk-svg | 1.24cqw | 19px | — |
| S7 sectoricoon | 3.2694cqw (58px) | 24px in 38px | — |
| S7 voordeel-svg | 1.6911cqw | 18px in 34px | — |
| S8 voordeel-svg | 1.5220cqw | 20px in 40px | — |
| S8 kaart-svg | 1.5220cqw | 21px in 44px | — |
| Pijl in knoppen | 1.2965cqw (23px) | 19px | — |

Bron: `home-hero.css:150`, `:362`, `:440`, `:490`, `:519`; `home-solutions.css:208`, `:237`, `:401-402`, `:419`, `:473-474`; `home-process.css:132`, `:167`, `:241`, `:277`; `home-control.css:241`, `:350`; `home-infra.css:85`, `:243`, `:277`, `:365`, `:405`; `home-final.css:240`, `:287`, `:357`, `:367`, `:409`; `home-footer.css:111`, `:237`, `:254`, `:311`, `:318`.

Omrekening: 1cqw = 17,74 referentiepixels op het 1774-canvas (`home-hero.css:4-7`).

#### 4.3.4 Containers

**Twee families, en de scheiding wordt over alle negen secties volgehouden.**

| Familie | Vorm | Achtergrond | Rol |
|---|---|---|---|
| Afgerond vierkant | radius .40–.7328cqw | `#DFEEFE` (`home-process.css:132`), `#D8ECFE` (`home-control.css:241`), `#DEEFFD` (`home-infra.css:79`), `#E8F3FE` (`home-final.css:240`) | Eigenschap of voordeel |
| Volledige cirkel | radius 50% | `#fff` (`home-solutions.css:226-237`), `#E7F2FE` (`home-infra.css:265-277`), massief blauw (`home-final.css:277-287`) | Actie (pijl) of de ene primaire afspraakknop |

Exacte maten: `.vh-proc-kaart-ic` 1.9772cqw (30 ref) radius .4cqw; `.vh-ctrl-feat-ic` 2.3730cqw radius .42cqw; `.vh-infra-vd-ic` 3.5513cqw (63 ref) radius .7328cqw; `.vh-final-vd-ic` 3.3761 × 3.2810cqw (71 × 69 ref) radius .6657cqw; `.vh-final-kaart-ic` 3.2335cqw (68 ref) radius 50%, wit icoon; `.vh-infra-kaart-pijl` 2.0857cqw (37 ref) radius 50%; `.vh-sol-pijl` 2.1420cqw (38 ref; 46 ref op de zonkaart) radius 50%.

**REGEL — geen cirkel om een voordeelicoon, geen afgerond vierkant om een pijl.**

**Kleurtoewijzing binnen iconen:**
- **Blauw `#0073FE`** = actie én voordeel. Draagt `.vh-sol-punt svg`, `.vh-proc-stap-ic`, `.vh-proc-kaart-ic`, `.vh-ctrl-feat-ic`, `.vh-infra-vd-ic`, `.vh-infra-kaart-pijl`, `.vh-infra-kpi-ic`, `.vh-final-vd-ic`, `.vh-final-kaart-link svg`, `.vh-footer-contact svg`, `.vh-footer-nb ul svg`.
- **Navy `#16325A`** = onderwerp. Uitsluitend `.vh-infra-kaart-ic` (`home-infra.css:242`). Dit is de enige expliciete blauw/navy-splitsing van de pagina: in de S7-sectorkaart staat een navy onderwerp-icoon naast een blauwe actiepijl.
- **Wit** = op beeld. `.vh-sol-mod-ic` (erft `color:#fff`, `home-solutions.css:151`), `.vh-final-kaart-ic`.
- **`#3E9BFF`** = op de donkere console. Alles in `home-control.css` plus de logobadge in de dashboardbalk.
- **Grijsblauw `#B9C7D8`** = `.vh-proc-chev`.

#### 4.3.5 De cirkelpijl

**Eén glyph draagt elke "verder"-actie op de pagina.** `path d="M4 12h15m-6-6 6 6-6 6"` in viewBox `0 0 24 24`, `fill="none"`, `stroke="currentColor"`, ronde linecap en linejoin. **27 treffers** in `index.html` (geteld), in vier diktes: 2.1 (14×, knoppen en tekstlinks), 2.2 (4×), 2.3 (5×, de witte cirkelpijlen op de S2-kaarten), 2.4 (4×, de blauwe cirkelpijlen op de S7-sectorkaarten).

**Twee varianten van hetzelfde signaal, per sectie consequent:**

| | S2 `.vh-sol-pijl` | S7 `.vh-infra-kaart-pijl` |
|---|---|---|
| Cirkel | Wit, 38 ref-px (46 op de zonkaart) | `#E7F2FE`, 37 ref-px |
| Pijl | `var(--sol-blauw)` | `var(--if-blauw)` |
| Positie desktop | Per kaartsoort: zon `top:4.4532cqw right:2.0857cqw`; accu/laad `top:4.8478cqw right:1.3529cqw`; onder-kaarten `right:1.1274cqw bottom:1.1274cqw` | Vast: `left:20.6877cqw top:2.5930cqw` |
| Beweging | Op de pijl: `.vh-sol-mod:hover .vh-sol-pijl{ transform: translateX(.22cqw) }` (`home-solutions.css:238`) | Op de kaart: `translateY(-.16cqw)` + zwaardere schaduw (`home-infra.css:224`) |
| Onder 1200px | Groeit en verhuist: 40×40px op `top:10px right:10px`; zon- en handelkaart 44×44px op 14px/14px; svg 16px. Tablet 42×42px op 14px/14px | Verdwijnt volledig: `display:none` (`home-infra.css:411`) |

De mobiele verplaatsing draagt een reden: "pijl als comfortabel raakdoel, op elke kaart op dezelfde plek" (`home-solutions.css:408`). De desktopvariatie in positie (drie ankerpunten) wordt daar opgeheven tot één plek, en de pijl verliest zijn positiebetekenis — hij is er puur raakdoel van minimaal 40px.

#### 4.3.6 Iconen op mobiel: wat verdwijnt, wat erbij komt

**Verdwijnt** (iconen die alleen verbinding uitdrukken): `.vh-proc-chev` (`home-process.css:288`), `.vh-infra-kaart-pijl` (`home-infra.css:411`), `.vh-ctrl-rail` onder 768 (`home-control.css:323`, terug op 768–1199 met 15px-iconen, `:368-370`), `.vh-ctrl-mid` met de stroomlijnen (`home-control.css:332`), `.vh-proof-quote` (`home-proof.css:446`).

**Komt erbij** (iconen die een stap markeren krijgen een container): `.vh-proc-stap-ic` wordt 36×36px, `background:#fff`, `border:1px solid rgba(0,115,254,.22)`, `border-radius:50%` (`home-process.css:268-276`) — dezelfde glyph die op desktop een kale lijntekening is, leest op de verticale tijdlijn als knooppunt.

---

### 4.4 Harde contentregels voor beeld

Deze vier regels staan letterlijk in de markup van Master v1 en zijn niet onderhandelbaar. Ze zijn hier onverkort opgenomen omdat ze de enige plek zijn waar de pagina zichzelf begrenst.

**1. Geen gegenereerde projectbeelden als er echte Vibe-fotografie is.**
`index.html:909-913` (S7): *"De referentie toont een AI-gemaakte batterijcontainer met opschrift. Echt en in deze repository aanwezig is de eigen Vibe-BESS-opstelling van assets/projects: energieopslag-hero.jpg — twee Vibe-batterijkasten in een gebouwde omgeving. Geen stockbeeld, geen gegenereerde infrastructuur."*
`index.html:1014-1017` (S9): *"De referentie toont een gegenereerd pand met Vibe-gevel. Gebruikt is echte Vibe-hardware: drie batterijkasten op locatie."*

**2. Geen stock om een gerealiseerd project te suggereren.**
`index.html:950-955` (S8): *"De referentie toont een gegenereerd pand met een Vibe-gevel. Echt en van een gerealiseerd Vibe-project: de zonnecarport en laadinfra bij Hedin Automotive Amsterdam — dezelfde opname als assets/projects/hedin-amsterdam.jpg — met de stadsskyline erachter. **Geen stock, geen gegenereerd pand, geen verzonnen klant.**"*
`index.html:836-837` (S6): *"Eigen dronefoto van het project: zonnedak, laadplein en het pand in een opname. Geen portret, geen gegenereerd beeld."*
`index.html:435-436` (S2 energiehandel): *"Geen handelsbeeld in de repository; wel de echte meetlaag waarop flexibiliteit wordt afgerekend. **Geen beursbeeld, geen geldgrafiek.**"* — dit sluit een hele metafoorklasse uit, niet één bestand.

**3. Geen verzonnen logo's, personen, testimonials of projectrelaties.**
`index.html:789-794` (logo's): *"De referentie toont acht merklogo's. Er staat in deze repository geen enkel logobestand van een derde partij, en slechts twee organisaties zijn als klant onderbouwd met een eigen casepagina: Hedin Automotive en Dormio. Liever twee echte organisaties met hun sector, locatie en project erbij dan zes lege slots die als niet-geladen logo's ogen."*
`index.html:817-820` (testimonial): *"Dit is uitdrukkelijk GEEN testimonial: er bestaat nergens in deze repository een citaat met naam, functie en organisatie. Alle tekst is derde persoon."* De uitwerking: een badge "Projectresultaat" (`index.html:846`) in plaats van een aanhalingsteken, geen naamblok, geen portretfoto.
`index.html:1014-1017`: *"geen klantnaam geclaimd die hier niet onderbouwd is."*

**4. Waar geen echt beeld bestaat: de eigen vormtaal, geen plaatshouder.**
`index.html:399-401` (HVAC): *"Er bestaat geen HVAC-fotografie in deze repository. In plaats van een plaatshouder krijgt deze kaart een bewuste grafische behandeling in de eigen vormtaal: navyvlak met de Vibe-diagonaal."* Herhaald in `home-solutions.css:303-305`.
`index.html:918-920` (sectorkaarten): *"Er bestaat geen sectorfotografie als uitsnede, dus SVG-iconen."*
Dit vlak is geen plaatshouder voor een beeld dat nog komt — het is de gekozen **eindbehandeling** voor een onderwerp zonder eigen fotografie.

**Restpunt:** beeld 13 (S9, `s9-footer-720.webp`) draagt dezelfde `alt`-tekst als beeld 11 (S7, `s7-opslag-1200.webp`) — "Batterijopslag van Vibe Energy op locatie" — terwijl het een andere bron is (`microgrids-hero.jpg` tegenover `energieopslag-hero.jpg`). Gemeten in `index.html:915` en `:1019`.

---

## 5. RESPONSIVE SYSTEEM

### 5.1 Breakpointarchitectuur

De breekpuntset staat op één plek expliciet opgeschreven, `home-mobile.css:9-13`:

```
BREEKPUNTEN
  <= 767px    mobiel masterontwerp (390 / 430 primair)
  768-1199px  tablet
  >= 1200px   desktopmaster (cqw-layout, ongewijzigd)
```

**Dat is geen volledige lijst.** Gemeten over alle elf home-bestanden:

| Query | Aantal | Aard |
|---|---|---|
| `@media (max-width: 1199px)` | **12** | GLOBAL — de enige echte systeemgrens |
| `@media (min-width: 768px) and (max-width: 1199px)` | **11** | GLOBAL — de tabletlaag |
| `@media (min-width: 768px) and (max-width: 859px)` | 1 | COMPONENT-SPECIFIC — hero proof-strip (`home-hero.css:529`) |
| `@media (min-width: 1000px) and (max-width: 1199px)` | 1 | COMPONENT-SPECIFIC — footergrid (`home-footer.css:425`) |
| `@media (min-width: 1024px) and (max-width: 1199px)` | 1 | COMPONENT-SPECIFIC — oplossingenraster (`home-solutions.css:490`) |
| `@media (hover: none)` | 1 | Genest in `max-width:1199px` (`home-mobile.css:236`) |
| `@media (prefers-reduced-motion: reduce)` | 3 | `home.css:93`, `home-control.css:280`, `home-mobile.css:241` |

**Er bestaat géén `@media (min-width: 1200px)`.** Desktop is de **ongekwalificeerde basislaag**; de mobiele laag is de uitzondering. Elke sectie schrijft haar desktopcompositie zonder query en ontmantelt hem daarna in `max-width:1199px`. Het tabletblok stapelt daar bovenop en herstelt selectief.

**Twee gevolgen:**
1. Een regel die je in de desktoplaag wijzigt, raakt **alle drie** de banden, tenzij hij onder 1200 is overschreven.
2. Alles wat op `≤1199` `display:none` krijgt en in het tabletblok niet expliciet wordt teruggezet, blijft ook op tablet verborgen.

**De grens zit ook buiten de CSS.** `index.html:1171` gebruikt `window.matchMedia('(min-width:1200px)')` om het mobiele menu te sluiten bij terugschalen — exact dezelfde grens. De `srcset`/`sizes`-laag gebruikt dezelfde twee getallen: 767 en 1199.

**Valstrik:** de `hover:none`-query zit genest binnen `max-width:1199px` (`home-mobile.css:236`) en werkt dus **niet** op een desktopscherm met aanraakbediening boven 1200px.

### 5.2 GLOBAL versus COMPONENT-SPECIFIC

#### GLOBAL — geldt paginabreed

| Regel | Waarde | Bron |
|---|---|---|
| Guttertoken mobiel | `--m-gutter: clamp(20px, 5.4vw, 24px)` | `home-mobile.css:16`, in een ongekwalificeerde `:root` |
| Guttertoken tablet | `--m-gutter: clamp(32px, 5vw, 48px)` | `home-mobile.css:36` |
| Verticaal sectieritme | `--m-sec-y: 44px` (mobiel) / `64px` (tablet) | `home-mobile.css:20` / `:37` |
| Typografische tokens mobiel | `--m-h1: clamp(34px, 9.1vw, 44px)`, `--m-h2: clamp(27px, 7.3vw, 34px)`, `--m-h3: 19px`, `--m-lead: 16.5px`, `--m-body: 15.5px`, `--m-eyebrow: 11.5px` | `home-mobile.css:21-26` |
| Typografische tokens tablet | `--m-h1: clamp(46px, 6.4vw, 58px)`, `--m-h2: clamp(34px, 4.6vw, 42px)`, `--m-h3: 21px`, `--m-lead: 18px`, `--m-body: 16.5px` | `home-mobile.css:38-43` |
| Knophoogte | `--m-btn-h: 52px` (mobiel) / `56px` (tablet) | `home-mobile.css:27` / `:44` |
| Radii | `--m-radius: 14px`, `--m-radius-img: 12px` | `home-mobile.css:28-29` |
| Overloopvangrail | `html,body{ overflow-x:clip }` | `home.css:80-86` |
| Beeld- en koppenvangrail | `img{ max-width:100%; display:block }`, `h1,h2,h3{ text-wrap:balance; overflow-wrap:break-word }` | `home.css:99`, `:104-111` |
| Viewport en tekstzoom | `width=device-width,initial-scale=1`; `-webkit-text-size-adjust:100%` | `index.html:15`, `home.css:77` |

**Let op bij de tokens:** `--m-eyebrow`, `--m-radius`, `--m-radius-img` en `--m-blauw`/`--m-navy`/`--m-body-kleur` worden in het tabletblok **niet** opnieuw gezet. Wie daar tabletwaarden verwacht, vindt ze niet. En `--m-h1` wordt maar door één element gebruikt (`.vh-h1`, `home-hero.css:417`), `--m-h3` ook maar door één (`.vh-sol-mod h3`, `home-solutions.css:403`) — het zijn geen algemene koppenschalen.

**De motivering van het ritme staat vast**, `home-mobile.css:17-19`: *"56 px boven én onder betekende 112 px tussen twee secties op een scherm van 390 px breed. 44 px houdt de secties duidelijk gescheiden en haalt ruim 150 px uit de pagina."*

#### GLOBAL — wat er op desktop juist níét is

- **Geen gedeelde container, geen max-width.** Elke sectie heeft een eigen, hardgecodeerde linkermarge in cqw: 4.6787cqw (S1), 3.9459cqw (S2, S3, S4), 4.1150cqw (S7), 4.3968cqw (S6), 4.7551cqw (S9), 4.9929cqw (S8). Rechtermarges: 4.0586cqw (S1), 3.7204cqw (S2, S5), 4.2841cqw (S6), 4.7551cqw (S9). Die verschillen zijn het gevolg van vier referentiecanvassen, niet van slordigheid — zie §2.4.
- **Geen bovengrens op de schaal.** Geen enkele `max-width` in `home*.css`; alle negen sectiewortels hebben `width:100%`. Boven 1774px groeit alles lineair mee: `.vh-h1` is 4.3100cqw (`home-hero.css:261`), dus op een 2560px-scherm 110px in plaats van 76,5px. Dit is niet met een `max-width` te repareren zonder de compositie te breken: de hero is een `aspect-ratio`-podium (1774/748, `home-hero.css:38`) met absoluut gepositioneerde lagen in percentages.
- **Geen universele `box-sizing`.** Er staat nergens `*{box-sizing:border-box}`. In plaats daarvan staat `box-sizing:border-box` achttien keer per element, waarvan vijf keer expliciet in een mobiel blok met de toelichting "anders tellen padding en rand bij de 100% op" (`home-solutions.css:355`). **Een nieuwe volle-breedte knop zonder eigen `box-sizing` loopt gegarandeerd buiten de gutter.**
- **Geen universele reset, dus krimpbescherming is handmatig.** Gemeten over `home.css` + `home-*.css`: `min-width:0` staat **14×** en `minmax(0, …)` **7×** met de hand op elk flex- of grid-item dat lange tekst draagt, plus een paginabrede vangrail `.vh-footer > *{ min-width:0 }` (`home-footer.css:412`) met de reden erboven (`:410-411`): *"rasteritems krimpen standaard niet onder hun inhoud; zonder deze regel duwen de lange navigatielabels de footer buiten het scherm."* (Het aangeleverde bewijs noemt hier 15 respectievelijk 5; die getallen zijn op deze commit niet reproduceerbaar.)

#### COMPONENT-SPECIFIC — drie grenzen, elk in één bestand

| Grens | Bestand | Raakt | Reden staat in |
|---|---|---|---|
| 859px | `home-hero.css:529-533` | Drie selectors, alle binnen de hero proof-strip | `home-hero.css:524-528` |
| 1000px | `home-footer.css:425-429` | Alleen `.vh-footer` | `home-footer.css:404-406` |
| 1024px | `home-solutions.css:490-500` | Alleen `.vh-sol-*` | `home-solutions.css:452-457` |

**PATROON — wie een vierde componentgrens toevoegt, volgt dit: één bestand, één component, reden in het commentaar met de meting erbij.**

De 1000px-grens: *"768-999: merkblok boven, navigatie eronder over de volle breedte — de kolommen zijn anders te smal en elke link breekt af. Vanaf 1000 px staan merk en navigatie wél naast elkaar."* (`home-footer.css:404-406`)
De 1024px-grens: *"768-1023: twee kolommen, uitgelichte kaart over de volle breedte. 1024-1199: hetzelfde 3 × 2 raster als desktop, op kleinere schaal."* (`home-solutions.css:452-457`)

### 5.3 Wat er per bereik verandert

#### De collapse is altijd dezelfde vier bewegingen

Per sectie:
1. **Hoogte** — `height`/`aspect-ratio` → `height:auto` + `padding: var(--m-sec-y)`.
2. **Wortel** — sectiewortel wordt `display:flex` of `grid` met `flex-direction:column`.
3. **Kinderen** — alle absoluut gepositioneerde kinderen worden `position:static` of `relative` en krijgen een expliciete `order`.
4. **Eenheden** — alle cqw-maten worden vervangen door px, `clamp()` of `--m-*`-tokens.

Zeven van de negen secties doen alle vier (S1, S3, S5, S6, S7, S8, S9). S2 en S4 doen alleen 1, 3 en 4, omdat ze al op grid respectievelijk statische flow staan.

#### Vier regels die overal identiek terugkeren

| Regel | Waar toegepast |
|---|---|
| **Een element dat op een beeld ligt, wordt `position:relative` — nooit `static`.** De foto is vervangen inhoud en tekent zich anders over de kaartachtergrond heen. | `home-process.css:230-231`, `home-proof.css:437-439`, `home-final.css:399-400` — drie keer met dezelfde uitgeschreven reden |
| **Elke primaire CTA wordt onder 768 een volle-breedte knop met dezelfde anatomie:** `box-sizing:border-box`, `width:100%`, `height:var(--m-btn-h)`, `padding:0 20px`, `font-size:16px`, `border-radius:10px`, `justify-content:space-between`, `svg 19×19px`. In de tabletband `width:auto` met `min-width` 232–280px. | Negen keer identiek: `home-hero.css:430-440`, `home-solutions.css:354-364`, `home-project.css:290-295`, `home-control.css:354-363`, `home-proof.css:425-430`, `home-infra.css:370-374`, `home-final.css:353-357`, `home-footer.css:359-364`, `home-mobile.css:178-190` |
| **Handmatige regelafbreking is een desktopmiddel.** 28 regels zetten een `<br>` in een kop, lead of kaarttekst op `display:none` onder 1200px. Zonder uitzondering. | `home-hero.css:414`/`:421`/`:428`, `home-solutions.css:347`/`:405`, `home-project.css:266`/`:268`, `home-process.css:222`/`:224`/`:244`/`:287`, `home-control.css:306`/`:308`/`:353`, `home-proof.css:396`/`:422`/`:424`/`:449`, `home-infra.css:355`/`:357`/`:409`/`:410`, `home-final.css:349`/`:351`/`:411`/`:413`, `home-footer.css:315`/`:358` |
| **Elke verborgen of verplaatste inhoud draagt een gemeten motivering, meestal met een pixelwinst.** | "ruim 500 px korter" (`home-solutions.css:374`), "ruim 190 px" (`home-control.css:336`), "ruim 140 px korter" (`home-infra.css:361`), "ruim 160 px" (`home-footer.css:371`), "ruim 150 px uit de pagina" (`home-mobile.css:19`) |

Die laatste regel is de bewijsvorm van dit systeem: **geen inhoud verdwijnt zonder cijfer en reden.**

#### De sectiespecifieke collapse in één overzicht

| Sectie | ≥1200 | ≤1199 | 768–1199 |
|---|---|---|---|
| S1 hero | `aspect-ratio:1774/748`, vijf gestapelde absolute lagen | `aspect-ratio:auto`, `padding-top:calc(64px+34px)`, flexkolom; `.vh-copy` order 1, `.vh-foto` order 2, band/geo/wig/navy-copy `display:none`; beeld 232px hoog | `padding-top:calc(76px+48px)`; beeld 360px |
| S2 oplossingen | `.vh-sol-grid` 27.4521 / 17.0237 / 16.4600cqw, areas `a b c` / `d e f` | `1fr 1fr`, areas `a a` / `b c` / `d d`, gap 10px; onderregel verborgen op de vijf compacte kaarten | gap 16px; `.vh-sol-onder` `repeat(3,1fr)`; onderregel terug. **1024–1199:** `repeat(3,1fr)`, areas `a b c` / `d d d` |
| S3 project | Paneel `margin-left:3.9459cqw`, `aspect-ratio:1704/565`, radius links 3.5507cqw | Volle breedte, radius 0, flexkolom; foto order 1 (236px), copy order 2 met `margin-top:-26px` + `padding-top:34px` | Foto 340px; copy `max-width:660px` |
| S4 proces | Horizontale rij met chevrons | Verticale tijdlijn met doorlopende `::before`-lijn (2px, `left:17px`) | 2×2-raster, `::before` uit |
| S5 console | `height:33.171cqw`, dashboard + telefoon absoluut | `height:auto`; **volgorde omgedraaid**: devices order 1, copy order 2; telefoon, rail, stroomlijnen en linkerkolom uit | Rail én stroomlijnen terug; `.vh-ctrl-feats` `repeat(4,1fr)` |
| S6 bewijs | `height:50cqw`, zes absolute kinderen | Flexkolom, volgorde verhaal 1 → foto 2 → kaart 3 → strook 4 → CTA 5; wig, `.vh-proof-alle` en quote uit | `.vh-proof-b` wordt `1fr 1fr`: bewijs naast beeld |
| S7 infra | Vier kaarten absoluut over de foto (`left:72.9989cqw`) | Kaarten onder de foto in `1fr 1fr`; clip-path en verloop uit | Kaarten `repeat(4,1fr)` op één rij |
| S8 final CTA | Chevronwig + fotochevron + blauw vlak | Flexkolom, copy 1 → voordelen 2 → foto 3 (204px) → kaart 4; wig en blauw vlak uit, blauw keert terug als `::before` op het beeld | Foto 340px; kaart `max-width:430px` |
| S9 footer | Zeven absolute blokken, `height:35.5681cqw` | Flexkolom; navs `1fr 1fr`; wig, notitie en tweede checklist uit | Grid `minmax(0,1fr)`; navs `repeat(3,1fr)`. **1000–1199:** `minmax(0,1fr) minmax(0,1.6fr)` |

#### Het cqw-vangnet en zijn gat

`home-mobile.css:213-221` vangt de cqw-eigenschappen op die de sectieblokken zelf niet overschrijven. Het commentaar formuleert de systeemregel (`:207-212`): *"De secties rekenen in cqw. Onder 1200px zijn die eenheden betekenisloos klein; hieronder staan de laatste eigenschappen die de sectieblokken niet zelf al overschrijven."* In alle vijf werkzame gevallen gaat het om `line-height` in cqw — de eigenschap die het snelst onleesbaar wordt.

**Het vangnet is niet volledig.** Dertien `box-shadow`-declaraties staan in cqw; slechts twee zijn onder 1200 overschreven (`home-control.css:314`, `home-infra.css:402`). Niet overschreven: `.vh-sol-mod` (`home-solutions.css:152`), `.vh-proof-org:hover` (`:132`), `.vh-proof-kaart` (`:249`), `.vh-proc-kaart` (`home-process.css:122`), `.vh-final-kaart` (`home-final.css:271`), `.vh-ctrl-node.hot` (`home-control.css:150`), `.vh-ctrl-hub` (`:161`), `.vh-ctrl-bar .live i` (`:93`). De containers zijn per sectie `inline-size`, dus op een 390px-scherm is 1cqw = 3,9px in plaats van 17,74px: die schaduwen krimpen met factor 4,5 en de kaarten verliezen hun elevatie. Er bestáát een token voor (`--vibe-elev-mob`, `home.css:64-65`), maar dat wordt één keer gebruikt.

**Cascadegevolg dat nergens gedocumenteerd is:** `home-mobile.css` laadt als laatste (`index.html:67`) en het vangnetblok staat op `:213`, ná het tabletblok op `:197` en na alle negen sectiebestanden. Bij gelijke specificiteit wint dit blok. Concreet: `.vh-sol-mod--zon p{ line-height:1.4 }` overschrijft de 21px van `home-solutions.css:404` én de 20px van `:481` in de hele band onder 1200. Wie later een `line-height` in een sectiebestand aanpast, ziet geen effect zolang `home-mobile.css:213-221` dezelfde selector draagt.

---

### 5.4 Uitgewerkt voorbeeld: de hero proof-strip

De proof-strip (`.vh-kpi`, markup `index.html:222-293`) is het enige onderdeel van de pagina met **vier** volledig uitgeschreven composities. Hij is hier volledig uitgewerkt omdat elke grens een gemeten reden draagt, en omdat die redenen de enige plek zijn waar het systeem uitlegt hóé een breakpoint wordt afgeleid.

#### Anatomie

`div.vh-kpi > div.vh-kpi-grid > 3× div.vh-kpi-item > svg.vh-kpi-icoon + span.vh-kpi-tekst > span.vh-kpi-getal + span.vh-kpi-label`

De drie waarden zijn (`index.html:265-266`, `:277-278`, `:288-289`):
1. "11 projecten uitgelicht" / "Van vastgoed tot automotive"
2. "Zon, opslag, laden en sturing" / "Van ontwerp tot beheer"
3. "Start zonder eigen investering" / "Exploitatie mogelijk per situatie"

#### Band 1 — ≥1200px: drie kolommen, icoon links

| Eigenschap | Waarde | Bron |
|---|---|---|
| Strookhoogte | `9.0191cqw` (160px op 1774) | `home-hero.css:328-330` |
| Achtergrond | `linear-gradient(90deg, #F7FCFF 0%, #FCFDFE 55%, #FDFDFE 100%)` | `home-hero.css:328-336` |
| Grid | `width:98.084cqw` (1740px), `margin:0 auto`, `repeat(3, 1fr)`, `align-items:center` | `home-hero.css:338-346` |
| Item | `display:flex`, gecentreerd, `gap:1.8602cqw` (33px), `padding-bottom:.5073cqw`, `padding-right:1.1274cqw` | `home-hero.css:347-356` |
| Scheiding | `.vh-kpi-item + .vh-kpi-item::before` — 1px × `3.8895cqw` (69px) in `var(--vh-paars-lijn)` `#DCE7F3` | `home-hero.css:357-361` |
| Icoon | `2.7745cqw` (49px), `color:#0062FE` | `home-hero.css:362` |
| Getal | `font-size: max(19px, 1.5784cqw)` (28px op 1774), `line-height:1.18`, 700, `letter-spacing:-.004em`, `#061B36`, `text-wrap:balance` | `home-hero.css:368-375` |
| Label | `margin-top:.3946cqw`, `font-size: max(13.5px, .9019cqw)` (16px op 1774), `line-height:1.3`, 400, `var(--vh-grijs)` | `home-hero.css:376-382` |

**De reden voor één graad op desktop staat vast**, `home-hero.css:364-367`:
> "Eén graad voor alle drie de waarden houdt de strook een familie. De graad is terug op het niveau van de eerdere cijferstrook (28px op 1774): de copy is kort genoeg om die kracht te dragen zonder af te breken. Gecontroleerd op de langste regel, 'Start zonder eigen investering'."

Dat is het citeerbare argument tégen het later differentiëren van de drie waarden op desktop, mét de toetssteen erbij.

**Twee maten zijn bewust asymmetrisch en mogen niet worden "rechtgezet":** `padding-bottom:.5073cqw` ("inhoud iets boven het midden, als in de referentie") en `padding-right:1.1274cqw` ("inhoud 10px links van het celmidden, als in de referentie"), `home-hero.css:350-351`.

**De twee `max()`-vloeren zijn geen mobiel vangnet.** Reken uit: 19 / 0,015784 = **1203,8px** en 13,5 / 0,009019 = **1496,8px**. Omdat de media query pas bij `≤1199` ingrijpt, is de vloer van het getal alleen werkzaam in de band 1200–1203,8px en die van het label in de band 1200–1496,8px. In die laatste band staat het label vast op 13,5px terwijl alles eromheen nog krimpt. Dit zijn de enige `max()`-vloeren in de hele homepage-CSS.

#### Band 2 — 860–1199px: drie compacte kolommen, icoon BOVEN de tekst

| Eigenschap | Waarde |
|---|---|
| Grid | `repeat(3, minmax(0, 1fr))`, `gap:20px`, `align-items:start` |
| Item | `flex-direction:column`, `align-items:flex-start`, `gap:10px`, `min-width:0` |
| Scheiding | `display:none` |
| Icoon | 26×26px |
| Getal | 17px, `line-height:1.24`, `letter-spacing:-.002em` |
| Label | 13px, `line-height:1.32`, `margin-top:4px` |

Bron: `home-hero.css:507-521`, binnen het blok dat op `:495` opent.

**Het feitelijke bereik is 860–1199, niet 768–1199**, omdat het 768–859-blok (`home-hero.css:529-533`) de onderste 92px overschrijft.

**De reden voor het icoon boven de tekst is gemeten**, `home-hero.css:501-506`:
> "TABLETVARIANT — drie kolommen, eigen compositie. Naast elkaar past de regel niet op één lijn zolang het icoon ernaast staat: **dat kost per kolom zo'n 50 px.** Het icoon gaat hier daarom boven de tekst, zodat de volle kolombreedte voor de regel beschikbaar is. Typografie en witruimte zijn compacter dan op desktop; de kwalificatie eronder is bewust kleiner. **Copy en onderbouwing blijven ongewijzigd.**"

Twee dingen liggen daarmee vast: `flex-direction:column` is een gemeten keuze (50px iconkosten per kolom), en de copy mag **niet** worden ingekort om de layout te redden.

`minmax(0, 1fr)` en `min-width:0` zijn hier geen decoratie: zonder die twee weigeren de rasteritems onder hun inhoud te krimpen en loopt de rij buiten de gutter.

#### Band 3 — 768–859px: graad- en regelafbreekgrens

| Eigenschap | 860–1199 | 768–859 |
|---|---|---|
| Getal | 17px | **16,5px** + `max-width:15ch` |
| Label | 13px | **12,5px** |
| Gap | 20px | **16px** |

Bron: `home-hero.css:529-533`.

**De vierde en belangrijkste ingreep is `max-width: 15ch` op `.vh-kpi-getal`** — een maatgrens op de **regel**, niet op de kolom, die alle drie de waarden dwingt op twee regels te breken.

**De volledige motivering van de enige component-specifieke breedtegrens van het systeem**, `home-hero.css:524-528`:
> "Onderaan het tabletbereik is een kolom ~217 px. 'Start zonder eigen investering' past daar op geen enkele leesbare graad op één regel, terwijl '11 projecten uitgelicht' dat wel doet — dat gaf 1/2/2 regels en dus drie ongelijk zware kolommen. Met een maatgrens op de regel breken alle drie de waarden op twee regels; de kolommen wegen daardoor weer even zwaar."

Het doel is expliciet **visueel gewicht**, niet leesbaarheid: drie kolommen van gelijk gewicht. De gemeten kolombreedte (~217px) en de twee toetsstrings staan erbij.

#### Band 4 — <768px: één kolom, icoon weer links

| Eigenschap | Waarde |
|---|---|
| Strook | `position:static`, `height:auto`, `margin-top:30px`, `padding:24px 0 var(--m-sec-y)`, `background:#F4F9FE`, `border-top:1px solid rgba(12,27,51,.07)` |
| Grid | `width:auto`, `minmax(0, 1fr)` (één kolom), `gap:14px`, `padding:0 var(--m-gutter)` |
| Item | `justify-content:flex-start`, `gap:12px`, `min-width:0` — blijft flex **row** |
| Icoon | 30px |
| Getal | 23px, `line-height:1.05` |
| Label | 13px, `line-height:1.3`, `margin-top:5px`, `overflow-wrap:break-word` |

Bron: `home-hero.css:468-492`.

De graad is hier het **grootst** van alle banden onder 1200 (23px), omdat de volle schermbreedte beschikbaar is. De strook wordt bovendien visueel losgemaakt van de hero met een eigen achtergrond en een `border-top`.

#### Waarom 1200 / 860 / 768 — de drie redenen naast elkaar

| Grens | Wat er verandert | Waarom precies dit getal |
|---|---|---|
| **1200** | Van cqw-compositie naar px-compositie; van gecentreerde cellen met scheidingslijnen naar linksuitgelijnde kolommen | Systeemgrens, niet componentgrens. Het hele desktopontwerp is een cqw-layout op een referentiecanvas (`home-mobile.css:9-13`: ">= 1200px desktopmaster (cqw-layout, ongewijzigd)"). Onder die grens zijn de cqw-eenheden betekenisloos klein (`home-mobile.css:207-212`) en moet elke sectie opnieuw worden opgebouwd. **Deze grens is niet van de proof-strip; de proof-strip volgt hem.** |
| **860** | Getal 17px → 16,5px, label 13px → 12,5px, gap 20px → 16px, en `max-width:15ch` op de regel | Afgeleid uit één meting: onderaan het tabletbereik is een kolom ~217px. Bij die breedte breekt "Start zonder eigen investering" wél en "11 projecten uitgelicht" niet, wat 1/2/2 regels geeft — drie ongelijk zware kolommen. 859 is de breedte waaronder dat gebeurt bij de **huidige copy** en de **huidige gutter** (`clamp(32px,5vw,48px)`, `home-mobile.css:36`). **Wijzigt de copy of de gutter, dan is 859 niet meer het juiste getal — dan moet opnieuw gemeten worden, niet geraden.** |
| **768** | Van drie kolommen met icoon boven de tekst naar één kolom met icoon links; graad springt omhóóg naar 23px | Systeemgrens tussen tablet en telefoon (`home-mobile.css:9-13`). Onder 768 is er ruimte in de breedte maar niet in de kolom: drie kolommen geven op telefoonbreedte 100–121px per kolom. Het commentaar op `home-hero.css:477-481` benoemt dat expliciet. |

> **DECISION REQUIRED — de 600px-grens die niet bestaat.**
> Het commentaar bij het KPI-grid zegt letterlijk: *"Onder 600 px staat elk cijfer daarom op een eigen regel, met het label ernaast. Vanaf 600 px passen de drie naast elkaar."* (`home-hero.css:477-481`). Er bestaat **geen** 600px-media query in de hele homepage-CSS (gemeten). De feitelijke omslag van 1 naar 3 kolommen staat op `min-width:768px` (`home-hero.css:495` + `:508`). Tussen 600 en 767px staat de strip dus nog steeds in één kolom. Is 600 de bedoelde grens (dan ontbreekt de query) of is 768 de bedoelde grens (dan is het commentaar achterhaald)? Niet uit de code op te lossen.
>
> **Bijkomend:** datzelfde commentaar motiveert de één-koloms keuze met de string **"Opgeleverde projecten"**, die in de huidige `index.html` niet voorkomt. De meting rust dus op oudere copy. Opnieuw meten of het commentaar bijwerken is een keuze, geen afleiding.

---

### 5.5 Navigatiearchitectuur — DECIDED — V1.0 (C-01)

§5.1 t/m §5.4 beschrijven hoe Master v1 zich gedraagt. Deze subsectie legt vast **welk navigatiemodel daar vanaf V1.0 op draait**. Zij sluit het punt dat tot nu toe als §8.6 S1 openstond: twee onverenigbare navigatiesystemen naast elkaar.

#### Het besluit

| Laag | V1.0 | Gemeten bron |
|---|---|---|
| Desktopheader ≥1200 | **Plat, geen dropdowns.** Logobadge + woordmerk links, zes links, één primaire CTA rechts. | `index.html:130-138` (logo), `:142-147` (links), `:157` (CTA) |
| Mobiele navigatie ≤1199 | **De Master-v1-navigatie.** Hamburger 52×44px, `position:fixed`-overlay, scroll-lock, focus-trap, `.vh-mobielmenu[hidden]{display:none}`. | `home-mobile.css:71-87`, `:107-120`, `:141-194`; markup `index.html:165-181`; JS `:1143-1152` |
| Navigatiegrens | **1199/1200px**, dezelfde grens als het hele responsieve systeem. Wijzigen mag alleen op implementatiebewijs, niet op smaak. | 12× `max-width:1199px`; `index.html:1171` `matchMedia('(min-width:1200px)')` |
| Legacy mega-menu | **Vervalt.** Drie panelen — Oplossingen 9 items, Industrieën 5, Systeem 5 — plus vier platte links en twee CTA's. Niet terugbouwen. | `_header.js:22-48`, `:146-149`, `:152-153` |

**Motivering in één zin:** twee navigaties naast elkaar (`index.html:142-147` tegenover `_header.js:146-153`) maakten elk archetype onbouwbaar, omdat elke subpagina met een header begint.

**Correctie op §8.6 S1 zoals dat er stond:** daar stond "vijf platte links". Gemeten op `aae26bf` zijn het er **zes** (`index.html:142-147`: `#oplossingen`, `projecten`, `#aanpak`, `#vibe-control`, `waarom-vibe`, `over-ons`), plus één CTA op `:157`. Dezelfde zes staan in het mobiele menu (`:167-172`) met een eigen CTA op `:174`.

#### Wat uit de top-level verdwijnt, en waar het landt

De randvoorwaarde bij C-01 is hard: **een propositie mag niet uit de informatie-architectuur verdwijnen omdat zij geen top-level menu-item meer is.**

| Legacy top-level item | Gemeten bron | Waar het in V1.0 landt |
|---|---|---|
| Oplossingen (9 links) | `_header.js:24-32` | Blijft top-level als ingang `Oplossingen` (`index.html:142`). Drie van de negen zijn Executive Guides (`capaciteit-als-dienst`, `energiehandel-flexmarkten`, `energie-als-vastgoedopbrengst`) en horen daar niet: die gaan naar de leadflow (§6.9). |
| Industrieën (5 links) | `_header.js:35-39` | De sector-as van de canonieke taxonomie (§6.8): overzichtspagina plus interne navigatie vanuit B2-*Sector* en B3-cases. |
| Systeem (5 links) | `_header.js:42-46` | Productoverzicht plus interne navigatie; `systeem-ems` wordt daarbinnen de VIBE.CONTROL-productpagina (§6.7). |
| Energy Hubs | `_header.js:146` | B2-variant *Gebied*; tevens de bestemming waar "Netcongestie & Energy Hubs" van de sector-as naartoe verhuist (§6.8). |
| Netcongestie Check (tweede CTA) | `_header.js:152` | B6-variant *wizard*; niet als tweede header-CTA — de platte header draagt één primaire actie. |

**Regel:** een route die in de nieuwe IA geen plek krijgt, verdwijnt **zichtbaar** — als migratiebesluit op de betreffende pagina, met de reden erbij. Nooit stilzwijgend, en nooit opgelost door een mega-menu terug te bouwen.

#### Wat dit voor het responsieve systeem betekent

1. **1199px draagt nu twee rollen tegelijk:** de omslag van cqw-compositie naar px-compositie (§5.1) én de omslag van platte header naar overlay. Eén grens verplaatsen raakt dus beide.
2. **De componentgrenzen 859, 1000 en 1024 (§5.2) veranderen hier niet door.** Ze horen bij de proof-strip, de footer en het oplossingenraster, niet bij de navigatie.
3. **De valstrik uit §5.1 blijft staan:** `@media (hover: none)` zit genest binnen `max-width:1199px` (`home-mobile.css:236`) en werkt dus niet op een aanraakscherm boven 1200px. Een platte desktopheader met hovergedrag erft dat probleem.

#### Uitgesloten patroon — sticky mobiele CTA (C-04) — DECIDED — V1.0

**Er komt geen sticky mobiele CTA in Design System V1.0.** Master v1 kent er geen; de legacy-balk `.mcta` bestaat op **26 gemeten pagina's**. Definitie: `subpage.css:262-266` — `position:fixed; left:0; right:0; bottom:0; z-index:90`, `backdrop-filter:blur(16px)`, twee knoppen (`.p` en `.g`) in `'IBM Plex Sans'`, zichtbaar onder **760px** (`:266`) met `body{padding-bottom:74px}` als compensatie, plus een lichte override op `:379-381`. `projecten.html:328` draagt dezelfde balk inline. De 26 pagina's: `energy-hubs`, de vijf `industrie-*`, `microgrids`, `oplossing-exploitatie`, `oplossing-laadplein`, `oplossing-netcongestie`, de elf `project-*`, `projecten` en de vier `systeem-*`.

- **In plaats daarvan:** CTA's worden in de pagina geïntegreerd, zoals in Master v1 — de volle-breedte knop onder 768px uit §5.3, negen keer identiek toegepast.
- **Bij migratie:** `.mcta` verdwijnt op alle 26 pagina's, samen met de `body{padding-bottom:74px}`-compensatie (`subpage.css:266`) die de balk nu vrijhoudt. Let op de eigen breedtegrens: `.mcta` schakelt op **760px**, het V1.0-systeem op 767/768 (§5.1) — dat is geen kleine afwijking maar een tweede, ongedocumenteerde grens die met de balk mee verdwijnt.
- **Niet dogmatisch verboden:** een sticky variant mag later terugkomen als afzonderlijke CRO-test met conversiedata. Dan is het een expliciet experiment bovenop V1.0, geen stilzwijgende uitzondering binnen een bouwtype.

Zie §7 voor de matrixrij (`EXCLUDED`) en `vibe-legacy-inconsistencies-v1.md L-21` voor het volledige legacy-item.

---

## 6. CONTENT DESIGN RULES

### 6.1 De claimcategorieën en het verbod ze te mengen

Master v1 labelt zijn eigen copy in HTML-commentaar. De bewijsstrook noemt drie categorieën bij naam — BEWIJS (`index.html:227`), PRODUCTSPECIFICATIE (`:236`), PROPOSITIE (`:243`) — en de overige commentaarblokken voegen er drie toe.

**Zes categorieën die een toetsbare bewering doen:**

| # | Categorie | Wat het is | Wat de bron moet zijn | Voorbeeld op Master v1 |
|---|---|---|---|---|
| 1 | **Gerealiseerde projectdata (BEWIJS)** | Een meting aan één benoemd, opgeleverd project | Een eigen `project-*.html` | `645 kWh` / `300 kW` / `+70%` (Hedin Alkmaar, `index.html:503-509`); `78%` / `240` / `12` / `51 kW` (Ratio 16, `:849-852`) |
| 2 | **Productspecificatie** | Wat het aanbod omvat of kan | De bijbehorende `systeem-*.html` | "Zon, opslag, laden en sturing / Van ontwerp tot beheer" (`:277-278`) |
| 3 | **Propositie** | Een commerciële belofte met kwalificatie | Een gepubliceerde formulering elders op de site | "Start zonder eigen investering / Exploitatie mogelijk per situatie" (`:288-289`) |
| 4 | **Klantbewijs** | Een klant of klantrelatie bij naam | Een eigen, gepubliceerde casepagina | "Hedin Automotive — Automotive · Alkmaar en Amsterdam" (`:807-808`), "Dormio — Recreatie · Medemblik" (`:811-812`) |
| 5 | **Productdemonstratie** | Een interface met getallen die géén prestatie zijn | Al gepubliceerde waarden + een zichtbaar label | De VIBE.CONTROL-console met `Voorbeeldweergave` (`:688`) |
| 6 | **Feitelijke bedrijfsdata** | NAW, KvK, BTW | De gedeelde bron (`_footer.js:92-94`) | `Utrechtseweg 310`, `+31 85 060 0489`, `KvK 92191487` (`:1050`, `:1054`, `:1121`) |

Daarnaast bestaan er twee klassen die géén toetsbare bewering doen en dus geen bron nodig hebben: **algemene marketingcopy / merkpayoff** ("Energy people progress", `:200`; "De energie-infrastructuur van morgen, vandaag", `:185`) en **technische procesuitleg** (de vier processtappen, `:558-604`).

#### Het mengverbod

`index.html:218-221` zegt woordelijk waarom de scheiding bestaat:

> "Vervangen door drie regels die wel gedekt zijn, met een categorielabel erboven. **Dat label is niet decoratief: het houdt gerealiseerd bewijs, klantrelaties en een commerciele propositie uit elkaar, zodat de strook niet als een staat-van-dienst in cijfers kan worden gelezen.**"

Drie toepassingen van dat verbod staan in de code:

1. **Een cijfer van project A mag niet naar project B verhuizen, ook niet als het ontwerp erom vraagt.** `index.html:505-508`: *"De referentie toont hier '78% kostenbesparing'. Dat cijfer hoort in deze repository bij Ratio 16, niet bij Hedin Alkmaar. De derde geverifieerde KPI van dit project is +70% netvermogen."*
2. **Een demonstratiewaarde mag niet als prestatie worden gelezen.** `index.html:650-652`: *"De waarden in dit dashboard zijn een voorbeeldweergave van de interface, geen gemeten of geclaimde prestatie. Daarom staat 'Voorbeeldweergave' in de voettekst van het paneel."* Acht referentiewaarden zijn bij naam verboden (`:615-622`): 842 kW, 612 kW, 230 kW, 78%, 12%, 34%, 48%, 12 sep. 2026 — geen van die acht komt in de repository voor.
3. **Een servicebelofte mag niet van zijn context loskomen.** `index.html:975-978`: de 24-uurbelofte hoort uitsluitend bij de Netcongestie Check (`netcongestie-check.html:421`), niet bij een algemeen contactverzoek; daar geldt de breed gepubliceerde 48 uur.

> **DECISION REQUIRED — het categorielabel bestaat niet in de markup.**
> `index.html:218-221` noemt het label "niet decoratief" en dragend voor de scheiding. In de markup bestaat het niet: `.vh-kpi-item` bevat alleen een SVG, `.vh-kpi-getal` en `.vh-kpi-label` (`index.html:256-292`), en `home-hero.css` kent geen enkele categorielabel-selector (gemeten over `:328-383` en `:468-533`). De categorieën BEWIJS / PRODUCTSPECIFICATIE / PROPOSITIE staan uitsluitend in het commentaar op `:227`, `:236` en `:243`. Is het label bewust geschrapt (dan klopt `:218-221` niet meer) of per ongeluk niet meegenomen (dan mist de strook de scheiding die het commentaar dragend noemt)?

### 6.2 Wanneer een getal mag

**Een getal mag op de site staan als, en alleen als, het aan één van deze drie voldoet:**

| Toets | Voorwaarde | Bewijs op Master v1 |
|---|---|---|
| (a) | Het hoort bij **één benoemd, gerealiseerd project** met een eigen `project-*.html` | 645 kWh / 300 kW / +70% (`project-hedin-alkmaar.html:67`, `:81`); 78% / 240 / 12 / 51 kW (`project-ratio-16.html:68`, `:82`, `:95`) |
| (b) | Het is een **productspecificatie** die op de betreffende `systeem-*.html` staat | De vijf systeempagina's achter de tweede bewijsregel |
| (c) | Het is een **contractuele afspraak** met zichtbare kwalificatie | "Binnen 48 uur contact" — gepubliceerd op zes pagina's; KvK/BTW/telefoon uit `_footer.js:92-94` |

De onderliggende toets is één vraag: **bestaat er een primaire bron in déze codebase?**

**Nooit toegestaan:** opgetelde bedrijfstotalen, gemiddelde uptime, CO₂-besparing, MWp-portfolio, aantal klanten, aantal medewerkers.

**Vier cijfers zijn bij naam verbannen** (`index.html:208-221`): 47 opgeleverde projecten, 12 MWp zon, 892 ton CO₂, 98% uptime. De redenering staat volledig uitgeschreven:

> "Geen van de vier had een primaire bron. 47, 12 MWp en 98% kwamen met de bulkupload c5476f0 (19-08-2026) mee zonder onderbouwing; 892 ton is op 17-09-2026 toegevoegd in 1ede4b3 en volgt alleen uit een ontwerpreferentie, niet uit data. Geen enkele projectpagina noemt zonnecapaciteit in kWp, dus 12 MWp is nergens uit op te tellen, en het enige onderbouwde beschikbaarheidscijfer op de site is de contractuele 99,5% SLA voor laadpalen — een andere grootheid dan een gemeten 98%."

**Twee harde regels komen daaruit voort** (`index.html:251-255`):
1. **Een pagina die een cijfer herhaalt is geen bron.** Daarom sneuvelden 47 / 12 MWp / 98% ondanks dat ze op `projecten.html:173-175` staan.
2. **Een telling van gepubliceerde cases is geen bewijs van een totaal.** Ook "11 opgeleverde projecten" is verworpen: *"het tellen van elf openbare cases bewijst geen totaal aantal opgeleverde projecten."*

Gevolg: "11 projecten **uitgelicht**" (`index.html:265`), niet "opgeleverd". **Een aantal op de site beschrijft wat de site toont, nooit wat het bedrijf heeft gedaan.**

> **DECIDED — V1.0 (C-07) · deze drie toetsen gelden site-breed, niet alleen op de homepage.**
> "47 opgeleverde projecten", "12 MWp zon geïnstalleerd" en "98% gemiddelde uptime" (`projecten.html:173-175`) zijn **`UNVERIFIED`** — niet omdat ze onjuist bewezen zijn, maar omdat er geen primaire bron is; publicatie is geen onderbouwing. Tot er primaire bronnen worden aangeleverd, wordt uitsluitend gepubliceerd wat reproduceerbaar is, in een formulering die exact dekt wat de bron bewijst: "11 projecten uitgelicht" of "11 gepubliceerde projectcases". **Niet toegestaan is de omkering** "Vibe heeft slechts 11 projecten gerealiseerd" — die claimt een bedrijfstotaal dat de telling niet draagt en valt onder `REMOVE/REWRITE REQUIRED`. Worden later primaire bronnen aangeleverd, dan wordt opnieuw beoordeeld. De vijf statussen staan in §6.6.

#### Wanneer het kwalitatief moet

Zodra de claim bedrijfsbreed is, of het cijfer alleen door optellen of aannemen zou ontstaan. Master v1 past dan een vast vervangingspatroon toe:

| Van | Naar | Instantie |
|---|---|---|
| Kwantiteit → scope | "47 opgeleverd" → "11 projecten uitgelicht" | `index.html:265` |
| Kwantiteit → bereik | "12 MWp" → "Zon, opslag, laden en sturing" | `index.html:277` |
| Kwantiteit → voorwaardelijkheid | rendementsgarantie → "Start zonder eigen investering / Exploitatie mogelijk per situatie" | `index.html:288-289` |
| Kwantiteit → comparatief zonder referentiepunt | "Minder CO2, meer impact", "Lagere kosten, hogere opbrengsten", "Onafhankelijker", "Efficiënter" | `index.html:320`, `:328`, `:885`, `:889` |

**De kwalificerende woorden zijn dragend, geen stopwoorden.** "uitgelicht", "mogelijk", "per situatie" (`index.html:243-249`) en "Voorbeeldweergave" (`:688`) zijn de vergunning voor de claim. `index.html:247-249` zegt het expliciet: *"'Mogelijk' en 'per situatie' blijven staan; zonder die twee wordt het een garantie."*

### 6.3 CONTENT PENDING

**De regel:** is er geen bron, geen beeld en geen pagina — dan weglaten, of vervangen door de eigen vormtaal. **Nooit een plaatshouder en nooit een aankondiging.**

Zes toegepaste gevallen op Master v1:

| Ontbreekt | Oplossing | Bron |
|---|---|---|
| HVAC-fotografie | Grafisch navyvlak in de eigen vormtaal | `index.html:399-401` |
| Acht merklogo's | Twee onderbouwde organisaties met sector, locatie en project | `index.html:789-794` |
| AI-batterijcontainer uit de referentie | Eigen BESS-opname | `index.html:909-913` |
| Beschikbaarheidsbron voor tijdslots | Uitnodiging zonder slots: "Kies een moment" | `index.html:994-995` |
| Zes footerbestemmingen (Advies & engineering, Werken bij Vibe, Nieuws, Kennisbank, Downloads, Klantverhalen) | Weggelaten | `index.html:1063-1065` |
| Nieuwsbriefinfrastructuur (0 treffers op nieuwsbrief/newsletter/subscribe/mailchimp) | Contactblok met de bestaande route | `index.html:1099-1102` |

**Twee alternatieven zijn expliciet afgekeurd:**
- "zes lege slots die als niet-geladen logo's ogen" (`index.html:793-794`)
- "Er stond hier eerder 'de nieuwsbrief is in voorbereiding' — dat kondigt een functie aan die er niet is" (`index.html:1100-1101`)

**Dus verboden:** placeholder-slots, "in voorbereiding", "binnenkort beschikbaar", stockbeeld, AI-render, of een link naar een pagina die niet bestaat.

**De referentie is geen bron.** Zes keer wordt een element uit de goedgekeurde ontwerpreferentie afgewezen omdat de waarde niet in de codebase bestaat: 78% bij Hedin (`:505-508`), acht schermcijfers (`:615-622`), "boetes" bij peak shaving (`:724-726`), acht merklogo's (`:789-794`), "Binnen 24 uur" (`:975-978`), Velperweg 37 en +31 88 303 7300 (`:1028-1033`). **Design mag de vorm dicteren, nooit de inhoud.**

### 6.4 Tone of voice

Alle voorbeelden hieronder zijn letterlijke copy uit `index.html` op commit `aae26bf`.

#### Eyebrow
1–6 woorden, **geen punt**, staat altijd boven de kop, blauw `#0073FE`, `font-weight:700`, tracking `.10–.14em`.
- "Oplossingen" (`:305`)
- "Project in de kijker" (`:497`)
- "Gerealiseerd project" (`:831`)
- "ENERGIE-INFRASTRUCTUUR" (`:878`)
- "Vertrouwd door organisaties die vooruit willen" (`:797`)

**Casing-splitsing, gemeten:** S1, S2, S3 en S4 krijgen `text-transform:uppercase` uit CSS, dus de bron staat in zinsnaamvorm. S6, S7 en S8 hebben géén `text-transform`; S7 en S8 staan daarom al in kapitalen in de markup, S6 houdt bewust zinsnaamvorm. **Niet zelf kapitaliseren in secties waar de CSS dat al doet.**

*Uitzondering op het gewicht:* `.vh-eyebrow` is `font-weight:600` (`home-hero.css:252`); de acht andere zijn 700. Zie §8.

#### Kop (H1/H2/H3)
4–9 woorden, **altijd afgesloten met een punt**, regelval handmatig gestuurd met `<br>`, **nooit een uitroepteken**.
- "Ruimte voor `<br>`groei. `<span class="vh-accent">`Zonder `<br>`netcongestie.`</span>`" (`:186`)
- "Van plan naar `<br>`prestatie." (`:531`, 4 woorden)
- "Intelligente sturing `<br>`voor maximale waarde." (`:717`, 5 woorden)
- "Ratio 16, Duiven: `<br>`zonnedak en laadplein `<br>`binnen 51 kW." (`:832`, 9 woorden)
- "Netcongestie opgelost. `<br>`Maximale exploitatie." (`:499` — twee werkwoordloze fragmenten, elk met punt)

**Geen vraagteken in een kop.** De twee vraagtekens op de pagina staan in een eyebrow ("KLAAR VOOR DE VOLGENDE STAP?", `:963`) en een footerkop ("Benieuwd wat er op jouw locatie kan?", `:1104`).

#### Accentkleur in koppen
`#0073FE`, altijd via **één** `<span class="vh-*-accent">` op het **slotdeel** van de kop — de payoff. Acht accentspans, elk gekoppeld aan dezelfde kleur via een sectietoken (`home-hero.css:267`, `home-solutions.css:55`, `home-process.css:81`, `home-control.css:219`, `home-proof.css:85` en `:179`, `home-infra.css:58`, `home-final.css:154`).

**Eén uitzondering, en die is betekenisvol:** `index.html:964` zet het accent middenin, op de lezer — "Ontdek wat energie voor **jouw organisatie** kan betekenen."

**Nooit meer dan één accentspan per kop; nooit het accent op de neutrale aanloop.**

#### Lead
1–3 zinnen, 5–20 woorden per zin, geen vraag, geen uitroep. Opent vaak met een kader ("Van …", "Een …", "Wij …").
- "Volledig geïntegreerde lokale energiesystemen die bedrijven vooruit helpen. Van ontwerp tot beheer, met meetbaar resultaat." (`:187` — 2 zinnen van 8 en 7 woorden)
- "Een helder proces, één geïntegreerde partner. `<br>`Van analyse tot langdurige exploitatie." (`:532` — 6 en 5 woorden)
- "Wij ontwikkelen en exploiteren geïntegreerde energiesystemen die bedrijven energieonafhankelijker maken, netcongestie oplossen en nieuwe verdienmodellen creëren." (`:880` — 1 zin van 16 woorden)
- "Van analyse tot exploitatie — wij laten zien hoe je netcongestie oplost, kosten verlaagt en energie een nieuw verdienmodel maakt." (`:965` — 1 zin van 20 woorden, de langste van de pagina)

**~20 woorden per zin is de bovengrens die de pagina zelf hanteert.**

#### Body / micro-copy bij labels
Naamwoordelijke frase van 2–7 woorden achter een vet label; punt aan het eind, **behalve in S5 en de footerchecklist**.
- Mét punt: "Rendabel — Lagere kosten, hogere opbrengsten." (`:328`), "Onafhankelijker — Minder afhankelijk van het net en de energiemarkt." (`:885`)
- Zonder punt: "Peak shaving — Voorkomt pieken en piekkosten" (`:727`), "Realtime inzicht — Volledige grip, altijd en overal" (`:742`), "Persoonlijk antwoord op je vraag" (`:1108`), "Geen verplichtingen" (`:1110`)

**Geen volzin met werkwoord in een labelpaar** — die vorm is voorbehouden aan lead en processtap.

#### CTA
2–4 woorden, werkwoord of bezittelijk voornaamwoord voorop, **geen punt, geen uitroepteken**, altijd gevolgd door hetzelfde pijl-SVG.
- Primair, 4× dezelfde: "Plan een gesprek" (`:157`, `:174`, `:189`, `:970`)
- "Bekijk capaciteit als dienst" (`:308`), "Ontdek VIBE.CONTROL" (`:746`), "Kies een moment" (`:1000`), "Neem contact op" (`:903`, `:1106`)
- Secundair is beschrijvend in plaats van imperatief: "Meer projecten" (`:516`), "Alle projecten" (`:801`), "Onze aanpak" (`:900`)

**Geen urgentie-taal** ("Nu aanvragen!", "Mis het niet"), **geen leestekens in het label.**

#### Technische uitleg — alleen binnen de console
Kleine letters, telegramstijl met `&middot;` als scheiding, Engelse vakterm toegestaan.
- "5 assets online · dispatch AUTO" (`:636`)
- "09:00:14 › peak forecast +340 kVA · dispatch activated" (`:688`)
- "net · +41 kW import · onder capaciteitstarief" (`:760`)

**Dit is de enige plek op de pagina waar Engels en kleine letters voorkomen, en het is afgedekt met het label "Voorbeeldweergave" (`:688`). Deze telegramstijl nooit buiten een als voorbeeld gelabeld interfacevlak gebruiken.** De −22% en −31% in de ticker zijn geen claims.

#### Projectcopy
Derde persoon, verleden/voltooid tijd, **geen aanspreekvorm**, cijfer vet met de eenheid erin, label eronder in kleine letters.
- "Het pand kampte met ernstige netcongestie. Vibe Energy combineerde zonnepanelen, batterijopslag en een laadplein — zonder de bestaande netaansluiting te overschrijden." (`:833`)
- "Meer opwek, meer laadcapaciteit en lagere kosten — binnen dezelfde netaansluiting." (`:847`)
- Cijferopmaak: `<b>645 kWh</b><span>batterijopslag</span>` (`:503`), `<dt>78%</dt><dd>besparing</dd>` (`:849`)

**S3 en S6 bevatten samen nul aanspreekvormen.**

#### Leestekens en typografie
Gemeten over alle zichtbare copy (commentaren, scripts en SVG uitgesloten):

| Teken | Aantal | Waar |
|---|---|---|
| Uitroepteken | **0** | — (geverifieerd: alle `!` in `index.html` staan in JS, CSS of de DOCTYPE) |
| Vraagteken | **2** | Beide in een uitnodiging: `:963` en `:1104` |
| Em-dash `—` | 3 | `:833`, `:847`, `:965` — voor bijstellingen |
| `&minus;` (U+2212) | 3 | `:659`, `:666`, `:706` — voor negatieve kW |
| `&middot;` | 5 | `:636`, `:688`, `:808`, `:812`, `:861`, `:1121` — als metadatascheiding |

**Nooit een gewoon koppelteken voor een negatieve waarde. Nooit een uitroepteken.**

#### Terugkerend retorisch patroon: "Van X tot Y"
Negen keer op de pagina, altijd om een volledige keten of reikwijdte af te bakenen: `:187`, `:266`, `:278`, `:307`, `:500`, `:532`, `:546`, `:590`, `:965`. De sectiekop "Van plan naar prestatie" (`:530`/`:531`) is de "naar"-variant.

**Het patroon vervangt een kwantitatieve dekkingsclaim — niet combineren met een percentage of aantal.**

### 6.5 Aanspreekvorm

**Master v1 is onomstotelijk je/jouw.**

| Vorm | Aantal | Regels |
|---|---|---|
| `je` | 7 | `:560`, `:590`, `:732`, `:965`, `:986`, `:1105`, `:1108` |
| `jouw` | 5 | `:307`, `:964`, `:999`, `:1104`, `:1105` |
| `jij` / `jou` / `jullie` | 0 | — |
| `u` / `uw` | **0** | — (geverifieerd met `grep`) |

Afzenderkant: `wij` 4× (`:604`, `:880`, `:965`, `:1105`), `we` 5× (`:560`, `:576`, `:986`, `:999`, `:1046`), `onze` 4× (`:192`, `:900`, `:971`, `:1082`).
**"Wij" staat bij verplichtingen en leveringen, "we" bij samenwerking:** vergelijk "Wij beheren en optimaliseren voor maximaal rendement." (`:604`) met "We denken direct met je mee." (`:986`).

**De bronpagina's zijn formeel.** `systeem-energieopslag.html:33`: "Vibe investeert en **u** betaalt voor de capaciteit". `over-ons.html:597`: "Zo weet **u** welke oplossingen…". **Bij het overnemen van een bron MOET je omzetten naar je/jouw**, zoals Master v1 al doet bij de 48-uurbelofte en de exploitatiepropositie.

> **DECIDED — V1.0 · de ongedekte cijfers in de gedeelde leadpopup (C-07).**
> `_leadpopup.js:116` toont drie cijferclaims — "7 waardestromen · 0 jr wachttijd · −22% netinkoop" — zonder enig broncommentaar, zichtbaar op de homepage zodra de popup opent (`index.html:1242-1243`, `window.VIBE_LEAD`). **Status: `UNVERIFIED`** onder de claim policy van §6.6: gepubliceerd zijn is geen onderbouwing. Bij de migratie van de leadflow geldt één van drie uitkomsten — VERIFIED maken met een primaire bron, kwalitatief herschrijven, of verwijderen. **Nu geen productiecode wijzigen.** Niet als precedent gebruiken: de gedeelde popup is niet meegenomen in de Master v1-verantwoording.
>
> **DEFERRED TO PAGE MIGRATION · de aanspreekvorm van de gedeelde overlays** (D-register D11).
> `index.html` bevat 0× u/uw, maar twee overlays die op de homepage renderen zijn volledig formeel: `_leadpopup.js:121` ("Uw naam"), `:125` ("Wij gebruiken uw gegevens…") en `_consent.js:125` ("Uw keuze wordt bewaard…"). De contentregels van V1.0 gelden voor alles wat de bezoeker ziet, dus ook voor overlay-copy; wat nog niet vastligt is **wanneer** die twee bestanden worden omgezet, omdat ze op 35 pagina's tegelijk renderen. **Heropeningsvoorwaarde:** bij de migratie van de leadflow (S2, stap 7 van de migratievolgorde) of zodra een gemigreerde pagina als eerste `_leadpopup.js`/`_consent.js` laadt — dan wordt de je/jouw-omzetting uit §6.5 in één keer doorgevoerd, samen met het cijferbesluit hierboven.

---

### 6.6 Claim policy — DECIDED — V1.0 (C-07)

§6.1 zegt in welke **categorie** een bewering valt en §6.2 wanneer een getal mág. Deze subsectie voegt de ontbrekende laag toe: welke **bewijsstatus** een concrete claim draagt, en wat die status toestaat. De vijf statussen zijn bevroren; er komen er geen bij en er worden er geen samengevoegd.

| Status | Definitie | Publiceerbaar? | Gemeten voorbeeld in deze repository |
|---|---|---|---|
| **VERIFIED** | Primaire bron: rapport, contract, meetdata of productspecificatie. | **Ja, uitsluitend binnen de scope van die bron.** | 645 kWh / 300 kW / +70% bij Hedin Alkmaar (`project-hedin-alkmaar.html:67`, `:81`; gebruikt op `index.html:503-509`); 78% / 240 / 12 / 51 kW bij Ratio 16 (`project-ratio-16.html:68`, `:82`, `:95`) |
| **SUPPORTED** | Reproduceerbaar af te leiden uit betrouwbare repository-data. | **Ja, uitsluitend in een formulering die exact de telling of de bron dekt.** | "11 projecten uitgelicht" (`index.html:265`), gedekt door elf `project-*.html` en elf `data-sector`-kaarten op `projecten.html`; "Binnen 48 uur contact", gepubliceerd op zes pagina's |
| **UNVERIFIED** | Bestaat in marketingcopy; onderbouwing ontbreekt. | **Nee.** Niet automatisch migreren: kwalitatief herschrijven, `CONTENT PENDING`, of verwijderen. | 47 / 12 MWp / 98% (`projecten.html:173-175`); "7 waardestromen · 0 jr wachttijd · −22% netinkoop" (`_leadpopup.js:116`) |
| **CONFLICTING** | Bronnen noemen verschillende waarden voor hetzelfde onderwerp. | **Nee.** Migratie van die claim blokkeren tot het conflict is opgelost. | `projecten.html:173-175` ("47") tegenover `:191` ("Alle 11 gerealiseerde projecten"), vijftien regels lager op dezelfde pagina |
| **REMOVE/REWRITE REQUIRED** | Aantoonbaar fout, misleidend, of ruimer dan de bron toestaat. | **Nee.** Niet meenemen. | Een vervanging als "Vibe heeft slechts 11 projecten gerealiseerd"; een demonstratiewaarde uit de console zonder het label "Voorbeeldweergave" (`index.html:650-652`) |

**HARD RULE: PUBLICLY EXISTING ≠ VERIFIED.** Dat een cijfer al op de site staat, telt niet als bron. Master v1 heeft die regel al toegepast op vier cijfers (`index.html:208-221`, `:251-255`); V1.0 maakt hem site-breed.

**Drie toepassingsregels die uit de statussen volgen:**

1. **De status hoort bij de claim, niet bij de pagina.** Dezelfde grootheid kan op de ene plek VERIFIED zijn en op de andere REMOVE/REWRITE REQUIRED zodra de formulering ruimer is dan de bron. Voorbeeld uit de code: 78% is VERIFIED bij Ratio 16 en verboden bij Hedin Alkmaar (`index.html:505-508`).
2. **Scope is onderdeel van de status.** Een VERIFIED claim mag alleen binnen de scope van haar bron staan — daarom hoort "Binnen 24 uur" uitsluitend bij de Netcongestie Check (`netcongestie-check.html:421`) en geldt elders de breed gepubliceerde 48 uur (`index.html:975-978`).
3. **Een citaatvorm vraagt een letterlijke bron.** `index.html:976` citeert *"Binnen 48 uur weet u wat haalbaar is"*; die zin staat in deze repository alleen op regel 976 zelf. De **belofte** is SUPPORTED en publiceerbaar; de **citaatvorm** is dat niet, want de aangehaalde tekst is niet reproduceerbaar. Bij migratie: parafrase zonder aanhalingstekens, of een echte vindplaats.

**Verplichting bij migratie:** elke pagina passeert de claimverificatie uit `vibe-migration-checklist-v1.md §1.2` voordat zij wordt gebouwd. Claims met status UNVERIFIED, CONFLICTING of REMOVE/REWRITE REQUIRED blokkeren die pagina tot ze zijn herschreven of verwijderd.

### 6.7 Naamgeving: VIBE.CONTROL en EMS — DECIDED — V1.0 (C-02)

**Gemeten uitgangspositie.** "VIBE.CONTROL" komt **tien keer** voor in `index.html` (`:145`, `:170`, `:612`, `:613`, `:616`, `:716`, `:718`, `:746`, `:752`, `:1073`) en **één keer** in `systeem-ems.html`; nergens anders in de repository. De bestemmingspagina draagt daarentegen de EMS-terminologie: `systeem-ems.html:16` `<title>` "EMS — slim energiemanagement | Vibe Energy", `:17` meta description met tweemaal EMS, `:70` `<h1>` "Haal meer uit uw complete *energiesysteem*." De merknaam is dus door Master v1 geïntroduceerd zonder dat de bestemmingspagina hem draagt.

**Het besluit.**

| Rol | Vorm | Waar |
|---|---|---|
| Commerciële productnaam | `VIBE.CONTROL` — kapitalen, punt, geen spatie | Koppen, CTA's, navigatie; Master v1 doet dit al (`index.html:716`, `:746`) |
| Functionele categorie en SEO-term | `Energiemanagementsysteem (EMS)` | Lead, lopende tekst, `<title>`, meta description, H2/H3 van de productpagina |
| Combinatie waar beide nodig zijn | `VIBE.CONTROL EMS` of `VIBE.CONTROL (EMS)` | Master v1 doet dit al in de footernavigatie (`index.html:1073`) |

**Vier harde regels:**

1. **SEO op *EMS*, *energiemanagementsysteem*, *energie management systeem* en *slim energiemanagement* mag niet verloren gaan.** Die termen blijven aanwezig in `<title>`, meta description en koppenstructuur van de productpagina.
2. **De merknaam vervangt de categorie niet.** Een productpagina die alleen nog "VIBE.CONTROL" zegt, verliest de categorie waarop gezocht wordt.
3. **De categorie vervangt de merknaam niet.** Waar Master v1 VIBE.CONTROL zegt (navigatie, sectiekop, CTA), wordt het geen "EMS".
4. **`systeem-ems.html` wordt bij migratie de VIBE.CONTROL-productpagina mét voldoende EMS-context**, inclusief de omzetting van de aanspreekvorm: de huidige H1 (`:70`) staat in u-vorm en moet volgens §6.5 naar je/jouw.

**Openstaand punt dat hierdoor niet verdwijnt:** `.vh-sol-mod--hvac` (`index.html:398`) en `.vh-sol-mod--ems` (`:417`) linken beide naar `systeem-ems`, terwijl er geen HVAC-pagina bestaat. C-02 zegt wat `systeem-ems` wórdt, niet waar de HVAC-kaart heen gaat — zie §8.3 C9.

### 6.8 Sectortaxonomie — DECIDED — V1.0 (C-05)

De site voert op `aae26bf` **vijf sectorvocabulaires naast elkaar**, alle vijf in deze sessie geteld:

| # | Bron | Gemeten labels |
|---|---|---|
| 1 | Master v1 sectorkaarten | Vastgoed → `industrie-vastgoed` (`index.html:922`); Logistiek → `:927`; Recreatie → `:932`; Woningportefeuilles → `:937`. **Master v1 linkt niet naar `industrie-vve`** (gemeten: vier `href="industrie-*"`-treffers) |
| 2 | Sectorpagina's (5) | `industrie-logistiek`, `-recreatie`, `-residentieel`, `-vastgoed`, `-vve` |
| 3 | `projecten.html` filterchips (5 inhoudelijk + "Alle") | Netcongestie & Energy Hubs (`:185`) · Automotive (`:186`) · Recreatie (`:187`) · Woningportefeuilles (`:188`, `data-f="Woningen"`) · Bedrijfspanden (`:189`) |
| 4 | `Sector ·`-veld op de elf casepagina's | Residentieel vastgoed ×5 · Residentieel vastgoed · belegger ×1 · Automotive ×2 · Recreatie ×1 · Bedrijfspand ×1 · Commercieel vastgoed ×1 |
| 5 | Kruimelpad `.pc-crumb` op de elf casepagina's | Woningportefeuilles ×6 · Automotive ×2 · Recreatie ×1 · Bedrijfspanden ×1 · Netcongestie & Energy Hubs ×1 |
| — | Legacy mega-menu | Vijf items: Logistiek, Kantoren & vastgoed, VvE's & Wooncomplexen, Recreatie, Woningportefeuilles (`_header.js:35-39`) |

> **Twee correcties op het aangeleverde bewijs, beide in deze sessie nagemeten.**
> (a) Het aangeleverde bewijs stelt dat `project-arnhem-60.html` **geen** Sector-veld heeft. Gemeten: het veld bestaat wél — `project-arnhem-60.html:58` zegt `Sector · Residentieel vastgoed · belegger`. Alle **elf** casepagina's dragen een Sector-veld; de afwijking is de uitgebreide schrijfwijze met het achtervoegsel "· belegger", niet een ontbrekend veld.
> (b) Het aangeleverde bewijs telt vijf kruimelpaden "Woningportefeuilles". Gemeten: **zes** (`project-arnhem-60`, `-burchtstraat`, `-ketsheuvel`, `-nieuw-schoonoord`, `-schouwburgring`, `-van-beethovenstraat`). De elf kruimelpaden tellen daarmee op tot 6 + 2 + 1 + 1 + 1 = 11. Dit document houdt de meting aan.

**De canonieke taxonomie — vijf sectoren plus één segment.** De sectoren zijn bewust breed gehouden, zodat een sector niet op één case hoeft te drijven.

| Canoniek | Legacy-labels die hierop afbeelden | Pagina | Cases | Bewijsstatus | Aanbevolen URL |
|---|---|---|---|---|---|
| **Commercieel vastgoed** | Vastgoed · Bedrijfspand · Bedrijfspanden · Kantoren & vastgoed | `industrie-vastgoed.html` | `project-purmerend`, `project-ratio-16` | **VERIFIED (2)** | `/sector/commercieel-vastgoed` |
| **Woningportefeuilles** | Residentieel vastgoed · Residentieel vastgoed · belegger · Woningen | `industrie-residentieel.html` | `project-arnhem-60`, `-burchtstraat`, `-ketsheuvel`, `-nieuw-schoonoord`, `-schouwburgring`, `-van-beethovenstraat` | **VERIFIED (6)** | `/sector/woningportefeuilles` |
| **Recreatie** | — | `industrie-recreatie.html` | `project-dormio-medemblik` | **VERIFIED (1)** | `/sector/recreatie` |
| **Logistiek & transport** | Logistiek | `industrie-logistiek.html` | geen | **CASE PROOF = PENDING** | `/sector/logistiek` |
| **Automotive** | — | **ONTBREEKT (PAGE PENDING)** | `project-hedin-alkmaar`, `project-hedin-amsterdam` | **VERIFIED (2), pagina ontbreekt** | `/sector/automotive` |
| **VvE** *(segment binnen Woningportefeuilles)* | — | `industrie-vve.html` | geen | **CASE PROOF = PENDING** | `/sector/woningportefeuilles/vve` |

**Vier vastgestelde asymmetrieën:**

| # | Asymmetrie | Bewijs | Status |
|---|---|---|---|
| A1 | Automotive heeft twee cases maar geen sectorpagina | `project-hedin-alkmaar.html:62`, `project-hedin-amsterdam.html:62`; geen `industrie-automotive.html` | PAGE PENDING |
| A2 | Logistiek heeft een sectorpagina maar nul cases | `industrie-logistiek.html` bestaat; geen case met dat label | CASE PROOF = PENDING |
| A3 | VvE heeft een sectorpagina maar nul cases, en Master v1 linkt er niet naartoe | `industrie-vve.html` bestaat; vier `href="industrie-*"` in `index.html` | CASE PROOF = PENDING |
| A4 | "Netcongestie & Energy Hubs" staat op de sector-as | `projecten.html:185` (chip), `data-sector="Netcongestie"` op Ratio 16, kruimelpad `project-ratio-16.html` | Verhuist naar de oplossing-as |

**"Netcongestie & Energy Hubs" is geen sector.** Het is een probleem/oplossing en hoort op de oplossing-as, bediend door de B2-varianten *Oplossing* (`oplossing-netcongestie.html`) en *Gebied* (`energy-hubs.html`). Ratio 16 krijgt op de sector-as het canonieke label **Commercieel vastgoed**, conform zijn eigen detailpagina (`project-ratio-16.html:62`).

**Drie harde regels:**

1. **Niets verzinnen.** Waar geen case bestaat staat `CASE PROOF = PENDING`. Aan `industrie-logistiek.html` en `industrie-vve.html` mag geen case worden toegeschreven die niet in die sector valt.
2. **Een sectorpagina zonder case toont geen casesectie**, of toont expliciet dat de eerste case in die sector nog loopt — die tweede variant vereist een primaire bron en is dus `CONTENT PENDING`.
3. **Eén vocabulaire over de hele keten.** Bij de migratie van `projecten.html` (B4, stap 3) komen `data-f` en `data-sector` op het canonieke vocabulaire, zodat overzicht, kaart, kruimelpad en detailpagina dezelfde taal spreken.

**Gevolg voor §7:** de vertrouwensrij en de sectorkaartenrij mogen niet suggereren dat elke sector door cases gedekt is — drie van de zes canonieke ingangen hebben nul of één case.

### 6.9 Gated guides en brochurelevering — DECIDED — V1.0 (C-03, C-06)

**Gemeten stand op `aae26bf`:**

| Meting | Uitkomst |
|---|---|
| PDF-bestanden in de repository | **nul** (`find . -name "*.pdf"` → geen treffers) |
| Map `assets/brochures/` | **bestaat niet** |
| Dood brochurepad | `_leadpopup.js:9` — `file:'assets/brochures/netcongestie-oplossen.pdf'`, **in het commentaarblok met de voorbeeldconfiguratie** (r.4-11), niet in de runtime-default. De runtime-default is leeg (`:32`, `var file = cfg.file \|\| ''`) en zonder `file` verschijnt er geen popup (`:33`) |
| Pagina's met een `window.VIBE_LEAD`-config | **vijf**, alle vijf met een **HTML-pagina** als `file`: `index.html:1242` → `energie-als-vastgoedopbrengst.html` · `oplossing-laadplein.html:269` → `laadplein-zonder-verzwaring.html` · `oplossing-energielabel.html:857` → `energielabel-verhogen.html` · `oplossing-exploitatie.html:295` → `exploitatie-zonder-investering.html` · `oplossing-netcongestie.html:299` → `netcongestie-oplossen.html` |
| Copy in de popup | Eyebrow "Gratis brochure" (`_leadpopup.js:113`), knop "Stuur mij de brochure" (`:124`) |
| Guides op `report.css` | **zeven**: `capaciteit-als-dienst`, `energie-als-vastgoedopbrengst`, `energiehandel-flexmarkten`, `exploitatie-zonder-investering`, `energielabel-verhogen`, `laadplein-zonder-verzwaring`, `netcongestie-oplossen` |
| In `sitemap.xml` | **drie**: `energie-als-vastgoedopbrengst` (r.16), `capaciteit-als-dienst` (r.118), `energiehandel-flexmarkten` (r.124); de andere vier niet |
| Guides die door géén leadconfig als asset worden aangeboden | **twee**: `capaciteit-als-dienst`, `energiehandel-flexmarkten` |
| Persoonlijk e-mailadres in het contactblok | **7 van 7 guides** tonen `mailto:mounir@vibeenergy.nl` (gemeten in alle zeven `report.css`-documenten) |

> **Correctie op het aangeleverde bewijs.** Het aangeleverde bewijs plaatst het dode pad op `_leadpopup.js:26` als "standaard". Gemeten: het pad staat op **regel 9**, in het commentaarblok met de voorbeeldconfiguratie. De runtime-default voor `file` is een **lege string** (`:32`); ontbreekt `file`, dan opent de popup niet (`:33`). Het pad is dus dood documentatiebewijs, geen actieve fallback — dat maakt het minder ernstig, maar niet minder fout.

**Het besluit — C-03.** De zeven `report.css`-documenten zijn **gated assets / lead magnets**: geen publiek pagina-archetype, geen normale SEO-contentpagina's. Zij worden ontsloten via de leadflow en gaan uit de publieke sitemap waar van toepassing. **De guide-inhoud zelf blijft behouden** — het besluit gaat over de ontsluiting, niet over de tekst.

**Het besluit — C-06.** Delivery is variant A (het bestand leveren) wáár het asset bestaat, en anders variant B (de guidepagina leveren). **HARDE REGEL: NO ASSET → NO DOWNLOAD PROMISE.**

**Vier regels die daaruit volgen:**

1. **Beloof nooit een PDF die niet bestaat.** Zolang er geen PDF in de repository staat, dekken "Stuur mij de brochure" (`_leadpopup.js:124`) en "Gratis brochure" (`:113`) de levering niet: wat geleverd wordt is een guidepágina. Herschrijven bij de migratie van de leadflow.
2. **Delivery moet aantoonbaar werken**, gemeten aan de ontvangende kant — niet afgeleid uit het feit dat het formulier een succesmelding toont.
3. **Routering naar een zakelijke centrale bestemming**, niet naar een persoonlijk e-mailadres: de zeven guides tonen nu alle zeven `mailto:mounir@vibeenergy.nl` in hun contactblok.
4. **Het dode voorbeeldpad wordt gecorrigeerd of verwijderd** (`_leadpopup.js:9`), zodat de documentatie geen assetstructuur beschrijft die niet bestaat.

**Nu geen productiecode wijzigen.** Dit document legt de regel vast; de uitvoering hoort bij stap 7 van de migratievolgorde (S2, gated guides) — zie §1A.11.

---

## 7. DE MATRIX

**Legenda**

- **GLOBAL** — geldt op elke pagina, zonder uitzondering. Wijzigen is een systeemwijziging.
- **REUSABLE** — herbruikbaar patroon; een ander archetype kan het vullen met eigen inhoud zonder de vorm te wijzigen. **Let op:** op Master v1 bestaat geen van deze patronen als geïmplementeerd component (zie §2.3). "REUSABLE" betekent hier: *mag herbouwd worden volgens deze anatomie*, niet: *kan geïmporteerd worden.*
- **HOMEPAGE ONLY** — verliest zijn betekenis, wordt een herhaling of wordt een onwaarheid op een tweede pagina.
- **CONDITIONAL** — herbruikbaar, maar alleen als een genoemde voorwaarde is vervuld.
- **EXCLUDED — V1.0** — het patroon bestaat bewust **niet** in Design System V1.0. Zo'n rij draagt `EXCLUDED` in de patroonkolom en een streepje in alle vier de kolommen: dat is een verbod, geen omissie. Heropenen kan alleen met het genoemde bewijs.

*Rijen die door een V1.0-besluit zijn gewijzigd of toegevoegd, dragen het C-nummer in de motivering. De besluiten zelf staan in §1A.*

| PATTERN | GLOBAL | REUSABLE | HOMEPAGE ONLY | CONDITIONAL | Motivering (één zin) | Bron |
|---|---|---|---|---|---|---|
| **Hero diagonal composition** (`.vh-stage` + `.vh-foto` + band + wig + SVG-geometrie) | — | — | **✔** | — | De header zit ingebakken in hetzelfde `aspect-ratio`-podium als de hero, waardoor de compositie onbruikbaar is op elke pagina die `_header.js` draait. | `index.html:77-206`; `home-hero.css:35-49` |
| **Vibe-diagonaal als vormprincipe** (schuine snede op fotorand, 31,6°–36,2°, mobiel vervangen door blauwe driehoek) | **✔** | — | — | — | Keert in acht van de negen secties terug en is het enige vormkenmerk dat de pagina over alle banden vasthoudt. | `home-hero.css:57`, `home-proof.css:224`, `home-infra.css:160`, `home-final.css:63`, `home-footer.css:48`; mobiel `home-hero.css:463`, `home-final.css:394` |
| **Proof strip** (`.vh-kpi`, drie claimzinnen met kwalificatie) | — | — | **✔** | — | De strook telt wat déze site toont; een tweede instantie levert per definitie een tweede, afwijkende telling van hetzelfde onderwerp. De drie regels dragen status `SUPPORTED` (§6.6) en zijn alleen in díe formulering publiceerbaar. | `index.html:222-293`; verbod op hergebruik in `:251-255` |
| **Solution mosaic** (`.vh-sol-grid`, 3×2 met één uitgelichte kaart) | — | **✔** | — | — | Zes bestemmingen in één raster met één dominante kaart is een generiek navigatiepatroon; alleen de inhoud is homepage-specifiek. | `home-solutions.css:126-143`; ritme vastgelegd op `:328-330` |
| **Solution mosaic — de inhoud "voor elke sector"** | — | — | **✔** | — | `index.html:300-457` is bewust breed en ondermijnt de scherpte van een oplossings- of sectorpagina. | Archetypebeperking A2 |
| **Hedin feature** (`.vh-pr-panel`: uitgelicht project met scrim, drie metrieken, bleed naar rechts) | — | — | — | **✔** | Herbruikbaar als "uitgelicht project", maar alleen op een pagina die niet zelf een projectoverzicht is — daar duwt één uitgelicht project de andere tien weg. | `home-project.css:19-33`, `:143-168`; beperking bij archetype A6 |
| **Process section** (`.vh-proc-stappen`: 4 stappen, desktop horizontaal met chevrons, <768 verticale tijdlijn, tablet 2×2) | — | **✔** | — | — | Vier genummerde stappen met een doorlopende lijn is inhoudsneutraal en komt op elk verkoopverhaal terug. | `home-process.css:152-204`, `:246-289`, `:292-297` |
| **VIBE.CONTROL showcase** (`.vh-ctrl-devices`: dashboard + telefoon + ticker) | — | — | **✔** | — | De waarden zijn een voorbeeldweergave die alleen geldig is naast het label "Voorbeeldweergave"; losgeknipt daarvan wordt het een prestatieclaim. | `index.html:615-622`, `:650-652`, `:688`; `home-control.css:50-190` |
| **Customer / project story** (`.vh-proof-b`: verhaal + foto + resultaatkaart + strook + CTA) | — | — | — | **✔** | Herbruikbaar **alleen** als derde-persoons resultaatbeschrijving; de kaart heet `citaat` in de klasse maar mag nooit een spreker krijgen zolang er geen citaat met naam, functie en organisatie bestaat. | `index.html:817-826`, `:842-844`; `home-proof.css:155-361` |
| **Vertrouwensrij** (`.vh-proof-logos`, twee organisaties met sector en locatie) | — | — | — | **✔** | Alleen bruikbaar waar twee onderbouwde organisaties de lading dekken. **C-05:** gemeten over de canonieke taxonomie halen alleen Commercieel vastgoed (2), Woningportefeuilles (6) en Automotive (2) die drempel; Recreatie heeft één case, Logistiek en VvE nul. Op die drie ingangen leest een rij van twee als een onwaarheid. | `index.html:789-794`, `:807-812`; taxonomie §6.8 |
| **Infrastructure section** (`.vh-infra`: kopkolom + hoofdbeeld + vier sectorkaarten over het beeld) | — | **✔** | — | — | Vier bestemmingen met icoon, titel en belofte is een generiek distributiepatroon; de geometrie schakelt zichzelf uit zodra de kaarten wegvallen. **C-05:** de bestemmingen volgen de canonieke sector-as (§6.8) — Master v1 toont nu vier van de zes ingangen (`index.html:922`, `:927`, `:932`, `:937`), Automotive heeft nog geen pagina en VvE is een segment, geen zelfstandige kaart. | `home-infra.css:209-277`, `:340-346`, `:385-411`; `index.html:922`, `:927`, `:932`, `:937` |
| **Final CTA** (`.vh-final`: chevronwig + fotochevron + blauw vlak + afspraakkaart) | — | — | — | **✔** | De chevroncompositie is herbruikbaar als slotsectie, maar de dubbele CTA naar dezelfde Calendly is te transactioneel voor een leesstuk en de kaartknop is onder 1200 bewust geschrapt. | `home-final.css:15-104`; `:336-339` |
| **Footer** (`.vh-footer`, zeven blokken, ingebakken) | — | — | **✔** | — | `.vh-footer ~ footer.ftr.v1a{ display:none !important }` bestaat alleen waar `.vh-footer` staat; de 35 andere pagina's krijgen de footer uit `_footer.js`. | `home-footer.css:35`; `index.html:1008-1011` |
| **Footer — NAW, KvK, BTW, cookievoorkeuren** | **✔** | — | — | — | Adres, telefoon, e-mail en KvK/BTW komen uit één bron en mogen nooit achter een accordeon of `display:none` verdwijnen. | `_footer.js:92-94`; `index.html:1050-1058`, `:1121`; regel op `home-footer.css:300-301` |
| **Skiplink** (`.vh-skip`) | **✔** | — | — | — | Toegankelijkheidsbasis; hoort op elke pagina. | `home-mobile.css` (skiplink-blok) |
| **Platte desktopheader** (logo links, zes links zonder dropdowns, één primaire CTA rechts) | **✔** | — | — | — | **C-01:** de Master-v1-header wordt de sitebrede standaard; één header maakt de bouwtypes pas bouwbaar. | `index.html:130-138`, `:142-147`, `:157`; besluit §1A.1, uitwerking §5.5 |
| **Legacy mega-menu** (`_header.js`, drie panelen: Oplossingen 9, Industrieën 5, Systeem 5) — **EXCLUDED** | — | — | — | — | **C-01:** vervalt en wordt niet teruggebouwd om legacy routes zichtbaar te houden; de routes landen via overzichtspagina's en interne navigatie (§5.5). | `_header.js:22-48`, `:146-149`, `:152-153`; `vibe-legacy-inconsistencies-v1.md L-09` |
| **Mobiele header + menu-overlay** (64px/76px, hamburger 52×44px, `position:fixed` overlay met scroll-lock en focus-trap) | **✔** | — | — | — | Één navigatiegedrag onder 1200px voor de hele site; de regel `.vh-mobielmenu[hidden]{display:none}` is niet cosmetisch en mag niet verdwijnen. **C-01** maakt dit de standaard voor alle 35 pagina's, niet alleen voor de homepage. | `home-mobile.css:71-87`, `:107-120`, `:141-194`, `:159-162`; JS `index.html:1143-1152` |
| **Sticky mobiele CTA-balk** (`.mcta`, 26 pagina's, `position:fixed bottom:0`, zichtbaar <760px) — **EXCLUDED** | — | — | — | — | **C-04:** CTA's worden in de pagina geïntegreerd zoals in Master v1; `.mcta` verdwijnt bij migratie, inclusief de `body{padding-bottom:74px}`-compensatie. Mag alleen terugkomen als afzonderlijke CRO-test met conversiedata, buiten V1.0. | `subpage.css:262-266`, `:379-381`; `projecten.html:328`; §5.5 en `vibe-legacy-inconsistencies-v1.md L-21` |
| **Primaire CTA-anatomie** (label + pijl-SVG 2.1, `data-calendly`, `href=contact` als fallback) | **✔** | — | — | — | Eén knopgedrag en één fallback op de hele site; de pijlglyph is een merkconstante. **C-04:** de knop staat altijd in de pagina, nooit in een vastgezette balk. | `index.html:157-159`, `:189-191`; `home-hero.css:207-229`; CTA-policy §1A.9 |
| **Mobiele volle-breedte-knop** (`box-sizing:border-box`, `width:100%`, `--m-btn-h`, radius 10px, `space-between`, svg 19px) | **✔** | — | — | — | Negen keer identiek toegepast; zonder het eigen `box-sizing` loopt de knop buiten de gutter, want er is geen universele reset. | Negen bronnen, zie §5.3 |
| **Eyebrow** (1–6 woorden, blauw, 700, tracking .10–.14em, geen punt) | **✔** | — | — | — | Op alle negen secties dezelfde rol en toon; alleen de graad en het gewicht drijven. | `index.html:185`, `:305`, `:497`, `:530`, `:716`, `:797`, `:831`, `:878`, `:963` |
| **Kop met accentspan op het slotdeel** | **✔** | — | — | — | Acht instanties, één regel: één accent, op de payoff. | Acht bronnen, zie §6.4 |
| **Tekstlink-CTA** (tekst + pijl, geen onderstreping, hover verandert kleur of opacity, mobiel `min-height:44px`) | — | **✔** | — | — | Vier implementaties met identiek patroon en verschillende maten — een kandidaat voor het eerste echte gedeelde component. | `home-project.css:196-210`, `home-proof.css:87-103`, `home-infra.css:130-143`, `home-final.css:303-317` |
| **Iconcontainer-scheiding** (afgerond vierkant = voordeel, cirkel = actie) | **✔** | — | — | — | Over alle negen secties volgehouden zonder uitzondering. | `home-process.css:124-132`, `home-control.css:234-241`, `home-infra.css:75-85`, `home-final.css:230-240`, `:277-287` |
| **Cirkelpijl op kaarten** (wit op beeld, lichtblauw op wit; mobiel 40–44px raakdoel op één vaste plek) | — | **✔** | — | — | Twee varianten van hetzelfde signaal, per sectie consequent; de mobiele normalisering is een raakdoelregel, geen stijl. | `home-solutions.css:226-249`, `:408-419`; `home-infra.css:265-277`, `:411` |
| **Scrim volgt de tekst, niet de diagonaal** | **✔** | — | — | — | De enige scrimregel met een gemeten contrastonderbouwing (1,00:1 op twee kaarten met het oude diagonale verloop). | `home-solutions.css:171-198`, `:425-449` |
| **Lichte sectietint als plaatshouder onder lazy beeld** | **✔** | — | — | — | Eén keer uitgeschreven, vier keer toegepast; de enige donkere uitzondering is gemotiveerd doordat de eindtoestand daar ook navy is. | `home-process.css:99-104`; `home-infra.css:156`, `home-final.css:70`, `home-footer.css:56`; uitzondering `home-project.css:53` |
| **`position:relative` voor een element dat op een beeld ligt** | **✔** | — | — | — | Drie keer identiek toegepast met dezelfde uitgeschreven reden; dit is een systeemregel, geen incident. | `home-process.css:230-231`, `home-proof.css:437-439`, `home-final.css:399-400` |
| **`<br>` in koppen op `display:none` onder 1200px** | **✔** | — | — | — | 28 keer zonder uitzondering; een nieuwe kop met `<br>` moet die regel meekrijgen. | 28 bronnen, zie §5.3 |
| **Claimcategorieën en het mengverbod** | **✔** | — | — | — | De enige regel die de pagina expliciet "niet decoratief" noemt. | `index.html:218-221` |
| **Claim policy — vijf bewijsstatussen** (VERIFIED · SUPPORTED · UNVERIFIED · CONFLICTING · REMOVE/REWRITE REQUIRED) | **✔** | — | — | — | **C-07:** elke publiceerbare bewering draagt een status en een scope; PUBLICLY EXISTING ≠ VERIFIED. Zonder deze laag zegt §6.1 wél in welke categorie een claim valt, maar niet of hij mag. | §6.6; toegepast bewijs `index.html:208-221`, `:251-255`; tegenvoorbeeld `projecten.html:173-175` |
| **Naamgeving VIBE.CONTROL / EMS** | **✔** | — | — | — | **C-02:** VIBE.CONTROL is de productnaam, EMS de functionele categorie en SEO-term; beide blijven, in de drie toegestane schrijfwijzen. | §6.7; `index.html:716`, `:746`, `:1073`; `systeem-ems.html:16-17`, `:70` |
| **Canonieke sectortaxonomie** (5 sectoren + 1 segment) | **✔** | — | — | — | **C-05:** vijf vocabulaires naast elkaar maken elke sectorclaim onbetrouwbaar; één as, met `CASE PROOF = PENDING` waar bewijs ontbreekt. "Netcongestie & Energy Hubs" verhuist naar de oplossing-as. | §6.8; `projecten.html:185-189`, elf `Sector ·`-velden, `_header.js:35-39` |
| **Aanspreekvorm je/jouw** | **✔** | — | — | — | 12 informele treffers, 0 formele; bij het overnemen van een formele bron is omzetten verplicht. Geldt ook voor gedeelde overlay-copy (§6.5). | `index.html`, geteld |
| **Executive Guide als gated asset** (S2, `report.css`) | — | — | — | **✔** | **C-03:** bruikbaar als lead magnet achter de leadflow, op voorwaarde dat de delivery aantoonbaar werkt; de zeven documenten dragen geen navigatie, footer of cookiebanner en zijn daarom geen publieke bestemming. | §6.9; `vibe-page-archetypes-v1.md §0.5`; `vibe-legacy-inconsistencies-v1.md L-15` |
| **Executive Guide als publieke SEO-contentpagina of menubestemming** — **EXCLUDED** | — | — | — | — | **C-03:** drie van de zeven staan nu in het mega-menu en in `sitemap.xml` (r.16, r.118, r.124); een A4-document zonder menu, footer en cookiebanner is als publieke landing een doodlopende weg. | §6.9; `_header.js:24-32`; `sitemap.xml:16`, `:118`, `:124` |
| **Downloadbelofte zonder bestaand asset** ("Stuur mij de brochure" → PDF) — **EXCLUDED** | — | — | — | — | **C-06:** NO ASSET → NO DOWNLOAD PROMISE. Gemeten: nul PDF's in de repository, `assets/brochures/` bestaat niet, alle vijf leadconfigs leveren een HTML-guide. | §6.9; `_leadpopup.js:9`, `:32-33`, `:113`, `:124`; `index.html:1242` |
| **FAQ-sectie** | — | — | — | **✔** | Bestaat op veertien subpagina's maar **niet** in Master v1; er staat wel dode FAQ-JavaScript in `index.html:1227-1240`, beschermd door een guard op een niet-bestaande `#faqList`. Master v1 levert dus geen vormtaal voor het meest gebruikte subpagina-component. **Status: DEFERRED TO PAGE MIGRATION** (D17) — de vormtaal wordt vastgelegd bij de B2-master. | `index.html:1227-1240`; zie §8.6 S3 |
| **Subpagina-hero** | — | — | — | **✔** | Bestaat niet in Master v1. De veertien `subpage.css`-pagina's gebruiken `.phero` met fotolaag, scrim en trust-row, maar dat patroon draagt de Vibe-geometrie niet. **C-01 haalt de blokkade weg** — de header is niet langer in de hero ingebakken — maar de herovorm zelf is **DEFERRED TO PAGE MIGRATION** (D16), vast te leggen bij de B2-master `systeem-energieopslag.html`. | Zie §8.6 S2; besluit §1A.1 |

---

## 8. DECISION REQUIRED

Verzameld. Elk punt is een plek waar de code géén regel vastlegt of zichzelf tegenspreekt. **De kolommen "Wat de code zegt" en "Wat ontbreekt" zijn auditbewijs en blijven ongewijzigd staan, ook waar het punt inmiddels is beslist** — een genomen besluit maakt de meting niet ongeldig.

**Wat sinds V1.0 wél is ingevuld: de status.** Drie statussen, elk met een vaste betekenis:

| Status | Betekenis | Wat ermee gebeurt |
|---|---|---|
| **DECIDED — V1.0** | Beantwoord door C-01 t/m C-07 of door de bevroren architectuur in §1A. | Uitvoeren volgens §1A. Geen open vraag meer; nergens opnieuw ter discussie stellen. |
| **DEFERRED TO PAGE MIGRATION** | Categorie D: pas beslisbaar in de context van één concrete pagina. De genummerde punten staan als **D1-D20** in het register in de bijlage van `vibe-migration-checklist-v1.md`; dat nummer staat erbij waar het bestaat. | Beslissen bij de master van het bouwtype dat het punt als eerste raakt. De **heropeningsvoorwaarde** staat per punt in de statuskolom. |
| **DECISION REQUIRED** | Nog echt open, en niet geraakt door C-01 t/m C-07. | Blijft staan. Niet zelf invullen. |

**Leesregel:** een punt zonder statusmarkering in de kolom "Wat ontbreekt" is en blijft `DECISION REQUIRED`.

**Stand op `aae26bf`** — 57 punten: **10 DECIDED — V1.0**, **3 gemengd** (deels beslist, deels uitgesteld: C2, I6, S2), **24 DEFERRED TO PAGE MIGRATION**, **20 DECISION REQUIRED**.

**Twee dingen die deze stand níét betekenen.** (a) Een DEFERRED-punt is geen vrijbrief om het bij de migratie stilzwijgend in te vullen: de beslissing wordt genoteerd bij de master, met de meting erbij. (b) Geen enkel besluit in dit hoofdstuk is uitgevoerd — **productiecode is niet gewijzigd** en Master v1 blijft byte-for-byte zoals in `aae26bf` (§1A.11).

### 8.1 Vormtaal

| # | Onderwerp | Wat de code zegt | Wat ontbreekt |
|---|---|---|---|
| V1 | **Is er één Vibe-hoek?** | Vrije wiggen 31,6°–36,2°; fotosnedes 9,8°–25,0°; mobiele driehoeken 48,1°–52,3°. | Er bestaat geen variabele, token of commentaar dat een hoek vastlegt; elk vlak herhaalt zijn eigen percentages. Zonder besluit is "de Vibe-diagonaal" geen reproduceerbare maat. |
| V2 | **Canonieke viewBox** | `0 0 24 24` dekt 62 van de 92 SVG's; daarnaast 44, 46, 40, 20×24, 10×18 en elf afgeknipte viewBoxen. | De code kiest niet. Voor nieuw iconwerk moet worden vastgelegd of 24×24 de norm is en wat er met de afwijkers gebeurt. |
| V3 | **Canonieke lijndikte** | Binnen een sectie constant; over secties 1.5 tot 2.6 in hetzelfde 24-raster. Geen relatie met weergavemaat (`.vh-proof-alle` 28px bij 2.2, `.vh-btn` 23px bij 2.1). | Een regel "dikte volgt maat" is niet uit de code te halen. |
| V4 | **Welke glyph bij welk onderwerp?** | Drie bladvarianten (`index.html:317`, `:598`, `:892`), vier staafdiagramvarianten (`:324-326`, `:440-442`, `:740`, `:888`/`:989`), twee bliksemvarianten (`:544`/`:722` tegenover `:884`/`:981`). | De code geeft geen voorkeur; per onderwerp moet één tekening worden aangewezen. |
| V5 | **Plaatshouder voor S2 en S6** | Vier fotodozen hebben een lichte plaatshouder met gedocumenteerde reden; `.vh-sol-mod` (vijf kaarten), `.vh-proof-foto` en `.vh-proof-strip-fig` hebben er geen. | Of dat een bewuste uitzondering is of een gat, staat nergens. Bij `.vh-sol-mod` komt erbij dat de `::after`-scrim (tot `rgba(3,20,44,.92)`) al vóór het beeld schildert. |
| V6 | **`sizes` van de drie bovenste S2-kaarten** | Declareren 37,5vw terwijl de kolommen 27,4521 / 17,0237 / 16,4600cqw breed zijn (`home-solutions.css:128`). Alle tien andere `sizes`-waarden zijn exact. | Bewuste marge of restwaarde uit een eerdere indeling? Niet uit de code op te maken. |
| V7 | **Status van de zeven dode CSS-blokken** | `.vh-sol-stats`, `.vh-infra-kpi`, `.vh-infra-note`, `.vh-final-note`, `.vh-proof-quote`, `.vh-zoek`, `.vh-footer-wig-ongebruikt` — alle zeven 0 treffers in `index.html`. | Ze beschrijven onderdelen van de vormtaal (statistiekbalk, KPI-balk, handgeschreven notities, citaatteken, zoekknop). Bewaren als vocabulaire of opruimen is een keuze die de code niet maakt. |
| V8 | **Dubbele `alt`-tekst** | Beeld 13 (S9, `microgrids-hero.jpg`) draagt dezelfde `alt` als beeld 11 (S7, `energieopslag-hero.jpg`): "Batterijopslag van Vibe Energy op locatie". | Bedoeld of drift? Niet vastgelegd. |

### 8.2 Tokens en constanten

| # | Onderwerp | Wat de code zegt | Wat ontbreekt |
|---|---|---|---|
| T1 | **Navy — drie varianten voor één rol** | `--vibe-navy` `#08203C` (`home.css:41`, 8 var-refs), `--vh-navy` `#071D3A` (`home-hero.css:19`), `--ft-navy` `#0C1B33` (`home-footer.css:27`). Alle drie "kop op licht vlak". | S1 en S9 zijn de enige twee secties die níét naar `--vibe-navy` wijzen. Het hero-commentaar zegt alleen "gemeten uit de referentie". Welke canoniek is, volgt niet uit de code. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D). De tokenhiërarchie ligt vast (§1A.5), de waarde niet. **Heropening:** de eerste master met een kop op een licht vlak — B2 `systeem-energieopslag.html`, stap 1 — kiest één navy en legt die vast als SEMANTIC token; de twee andere worden daar vervangen, niet naast elkaar gehouden. |
| T2 | **Body-grijs — `#4C5771` versus `#475771`** | `--vibe-body` (`home.css:43`) en `--vh-grijs` (`home-hero.css:19-20`) verschillen uitsluitend in het rode kanaal (76 tegenover 71). Beide dragen het label "lopende tekst". | Onbeslisbaar uit de code of dit opzet is. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D). **Heropening:** bij de eerste master die lopende tekst zet (B2, stap 1) wordt één body-kleur als SEMANTIC token vastgelegd. |
| T3 | **Kopinkt op kaarten — `#0C1424` heeft geen token** | 4× gebruikt (`home-infra.css:92`, `:255`, `home-final.css:247`, `:294`). Is geen van de drie navies en staat in geen enkele tokenlaag. | Consistent binnen S7+S8, nergens anders. Geen token. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D). **Heropening:** bij de eerste master met `.vibe-card` (B2, stap 1) — de kaartkopinkt krijgt daar een SEMANTIC token of wordt teruggebracht tot de gekozen navy uit T1. |
| T4 | **Welk blauw is het icoonblauw?** | `--vibe-blauw` `#0073FE` (`home.css:35`), logobadge `#0071FE` (`index.html:131-133`, `:630-632`, `:697-699`, `:1037-1039`), S1 KPI-iconen `#0062FE` (`home-hero.css:362`). | Drie tinten claimen dezelfde rol. In de header staan `#0071FE` (logo) en `#0073FE` (CTA) direct naast elkaar. Opzet of typefout volgt niet uit de code. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D). **Heropening:** bij de primitieve `.vibe-icon` in de B2-master (stap 1); daar wordt één icoonblauw gekozen en aan `--color-action-primary` gekoppeld. Tot dan geen van de drie tinten site-breed doorvoeren. |
| T5 | **Knopradius — vier waarden** | Desktop op 1774px: `.5139cqw` = 9,12px (`home-project.css:183`), `.5637cqw` = 10,00px (5 knoppen), `.6595cqw` = 11,70px (`home-control.css:267`), `.6657cqw` = 11,81px (`home-final.css:178`/`:197`). Mobiel is alles 10px. | Reconstructie-artefact van vier referentiecanvassen, of bedoeld? Niet te beslissen. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D, register **D7**). **Heropening:** bij `.vibe-btn` in de B2-master (stap 1) — één knopradius voor alle vier de varianten, in px of `clamp()`, niet in cqw (§1A.6). |
| T6 | **Radii die op duizendsten verschillen** | `.7328cqw` (`home-infra.css:79`) en `.7329cqw` (`home-control.css:58`) renderen beide exact 13,00px; `.7892cqw` (`home-infra.css:215`) en `.7893cqw` (`home-process.css:97`) beide 14,00px. | Of dit vier waarden of twee waarden moeten zijn, volgt niet uit de code. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D, register **D7**). **Heropening:** samen met T5 bij de B2-master. Twee waarden die identiek renderen zijn één waarde; de normalisatie gebeurt wanneer de radius als SEMANTIC token wordt vastgelegd. |
| T7 | **Icoontegel-tint — vier waarden voor één rol** | `--pc-badge` `#D8ECFE` en `--ct-badge` `#D8ECFE` zijn identiek maar apart gedefinieerd; `--if-tint` `#DEEFFD` en `--fi-tint` `#E8F3FE` vervullen dezelfde rol met een andere waarde. | Er is geen token voor deze rol. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D). **Heropening:** bij de primitieve `.vibe-icon-tile` in de B2-master (stap 1) — daar krijgt de rol "getinte tegel achter een voordeelicoon" één SEMANTIC token, en vervallen de vier losse waarden. |
| T8 | **Hoeveel elevatieniveaus kent het systeem?** | `home.css:59` zegt "drie niveaus voor de 23 losse box-shadows". Gemeten op `aae26bf`: **15** box-shadow-declaraties in de negen sectiebestanden. `--vibe-elev-1` en `--vibe-elev-2` worden nul keer aangeroepen terwijl hun waarden zijn uitgeschreven in `home-process.css:122` en `home-proof.css:249-250`; `.vh-infra-kaart` en `.vh-final-kaart` hebben weer eigen, afwijkende schaduwen. | Waar de 23 vandaan komt is in deze commit niet reproduceerbaar. Drie niveaus of de vijf die feitelijk in de secties staan — de code bepaalt het niet. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D, register **D6**). **Heropening:** bij de eerste master die een kaart met elevatie draagt (B2, stap 1); het aantal niveaus wordt daar vastgelegd mét een mobiel equivalent, zodat R6 zich niet herhaalt. |
| T9 | **Tokenlaag: contract of restant?** | Twaalf `--vibe-*`-tokens worden nergens via `var()` aangeroepen: `--vibe-blauw-licht`, `--vibe-blauw-tint`, `--vibe-op-donker`, `--vibe-canvas`, `--vibe-lijn`, `--vibe-radius-kaart`, `--vibe-radius-mob`, `--vibe-radius-rond`, `--vibe-elev-1`, `--vibe-elev-2`, `--vibe-ease`, `--vibe-dur`. Plus `--m-body-kleur` (`home-mobile.css:32`). Van vijf rendert de waarde wél — hardgecodeerd op 4 tot 7 plekken. | Of de tokenlaag als contract bedoeld is of als restant, is niet vastgelegd. **STATUS: DECIDED — V1.0** (§1A.5). De tokenhiërarchie is PRIMITIVE → SEMANTIC, met een componenttoken alleen wanneer een component een eigen semantische waarde nodig heeft. **De 23 `--vibe-*`-definities zijn meetbasis, geen contract:** een token dat geen semantische rol draagt, wordt bij migratie niet overgenomen — het krijgt een semantische naam of het verdwijnt. Geen extra enterprise-tokenlagen. |
| T10 | **Hovertint — token of hardcodering?** | `#005FE0` staat zeven keer hardgecodeerd en één keer als `--vibe-blauw-diep` (`home.css:36`), dat via `var()` maar één keer wordt gebruikt. | Sectie-onafhankelijkheid als opzet, of achterstallige tokenisering? Niet af te leiden. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D, register **D5**). **Heropening:** bij `.vibe-btn --primary` in de B2-master (stap 1); de hovertint is een herhaalde semantische rol en wordt daar getokeniseerd (§1A.5), niet per sectie uitgeschreven. |
| T11 | **Drie verschillende haarlijnen** | `#E5EFFA` (`home-solutions.css:22`), `#E4F0FC` (`home-infra.css:306`) en `rgba(16,28,58,.12)` (`home-proof.css:124`) zijn alle drie een 1px-scheiding op een licht vlak. Daarnaast `#DCE7F3` (`home-hero.css:22`) en `#DCE7F2` (`home-footer.css:29`), exact 1 eenheid verschil in het blauwe kanaal. | Welke de systeemlijn is, is niet af te leiden. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D). **Heropening:** bij de eerste master met een scheidingslijn op een licht vlak (B2, stap 1) — één haarlijn als SEMANTIC token; varianten die op één kanaal of 0,01 alfa verschillen worden daar samengevoegd. |
| T12 | **Mobiele headerrand** | `rgba(12,27,51,.08)` (`home-mobile.css:83`) en `rgba(12,27,51,.07)` (`home-hero.css:474`) — zelfde kleur, 0,01 alfa verschil, beide een 1px-grens op mobiel. | Bedoeld onderscheid of drift, niet te bepalen. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D). **Heropening:** bij de implementatie van de C-01-header in de eerste master (stap 1); de mobiele headerrand wordt daar één waarde, samen met T11. |
| T13 | **Dode focusring** | `home-mobile.css:177` zet `.vh-mobielmenu nav a:focus-visible{ outline:2px solid #4DA3FF }`. `home.css:119-125` zet `a:focus-visible{ outline:…!important }`. Een `!important`-declaratie wint altijd van een niet-`!important`-declaratie. | `#4DA3FF` kan dus nooit renderen; de menulinks krijgen `#0073FE`. Of dat de bedoeling is, staat nergens. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D). **Heropening:** bij de implementatie van de C-01-navigatie in de eerste master; de dode regel wordt daar verwijderd óf de focusring van de menulinks wordt expliciet gemaakt. De focusring zelf blijft een merkconstante (§3.2) — `#0073FE`, 2px, offset 3px. |
| T14 | **Aantal `--vibe-*`-tokens** | Aangeleverd bewijs zegt 24; gemeten in `home.css` op `aae26bf`: **23** (regels 35–70). | De afwijking is opgelost ten gunste van de meting, maar de bron van het getal 24 is niet te achterhalen. **STATUS: DECIDED — V1.0** (register **D8** gesloten). **23** is het getal; de meting wint van de briefing. Dit punt blijft staan als meetverantwoording, niet als open vraag. |

### 8.3 Componenten

| # | Onderwerp | Wat de code zegt | Wat ontbreekt |
|---|---|---|---|
| C1 | **Hoeveel knopvarianten kent het systeem?** | Vijftien CTA-klassen; alleen `.vh-btn*` is een gedeeld primitief en dat wordt buiten sectie 1 nergens gebruikt. | Zonder besluit hierover kan geen bibliotheek worden gebouwd. Dit was het zwaarste openstaande punt. **STATUS: DECIDED — V1.0** (§1A.4, register **D1**). Eén knopprimitieve met **vier varianten**: `.vibe-btn` + `--primary` `--secondary` `--ghost` `--text`. De vijftien sectie-eigen CTA-klassen worden niet overgenomen; hun maten en kleuren leveren hooguit de startwaarden voor de varianten. Extra varianten alleen bij aantoonbare noodzaak, volgens de HARD RULE. |
| C2 | **Secundaire CTA — er bestaan er twee** | `.vh-btn-secundair` (wit, rand 1,5px `#46587A`, tekst navy, radius 10px, `home-hero.css:230-235`) en `.vh-final-cta2` (wit, rand 1px `#C9DEF6`, tekst blauw, radius `.6657cqw`, `home-final.css:189-208`). Geen enkele waarde komt overeen. | De code zegt niet welke de norm is; ze staan in verschillende namespaces zonder onderlinge verwijzing. **STATUS: GEMENGD.** **DECIDED — V1.0** (§1A.4): het systeem kent **één** secundaire knop, `.vibe-btn--secondary`; twee naast elkaar bestaan niet meer. **DEFERRED TO PAGE MIGRATION** (categorie D, register **D2**) voor de waarden — randbreedte, randkleur, tekstkleur en radius worden vastgelegd bij `.vibe-btn` in de B2-master (stap 1), samen met T5. |
| C3 | **Eyebrow-gewicht** | `.vh-eyebrow` is 600 (`home-hero.css:252`), de acht andere zijn 700. Geen commentaar. | Bewust lichter of afwijking? **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D, register **D3**). **Heropening:** bij de primitieve `.vibe-eyebrow` in de B2-master (stap 1) — één gewicht voor alle bouwtypes. |
| C4 | **Eyebrow-kapitalisatie** | Vier eyebrows hebben `text-transform:uppercase` in CSS, vijf niet. Bij drie daarvan staat de tekst al in kapitalen in de markup; bij `.vh-proof-eyebrow` en `.vh-proof-eyb2` juist in zinsvorm. | Is de regel "kapitaliseer in CSS" of "kapitaliseer in de copy"? Niet eenduidig af te leiden. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D, register **D4**). **Heropening:** samen met C3 bij `.vibe-eyebrow` — één plek voor de kapitalisatie (CSS óf copy), zodat de contentregel in §6.4 eenduidig wordt. |
| C5 | **Kaartklasse-conflict** | `.vh-proof-kaart` bevat `.vh-proof-citaat` en er is een dode `.vh-proof-quote`-regel, terwijl het commentaar uitdrukkelijk zegt dat het **geen** citaat is (`index.html:817-826`). | Klassenamen en bedoelde semantiek spreken elkaar tegen. Hernoemen is een ontwerpbeslissing, geen meting. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D). **Heropening:** bij de B3-master `project-ratio-16.html` (stap 2), waar de resultaatkaart als `.vibe-card`-variant wordt gebouwd. De inhoudelijke regel ligt al vast en verandert niet: **geen spreker zonder citaat met naam, functie en organisatie** (`index.html:817-826`). |
| C6 | **`.vh-ctrl-hub` heeft geen mobiele vertaling** | `width`/`height` `2.6cqw`, `font-size` `.50cqw`, `box-shadow` `0 0 1.1cqw` — géén media-query-override (`home-control.css:154-163`). Onder 768 onzichtbaar omdat `.vh-ctrl-mid` verdwijnt, maar op 768–1199 komt `.vh-ctrl-mid` terug (`:372`) terwijl de hub in cqw blijft rekenen: op een 1000px-container 26px met een letter van 5px voor het woord "EMS". | Dit is de enige plek waar een element in de tabletband wordt teruggezet zonder dat zijn cqw-maten worden vertaald. Alle andere teruggezette elementen krijgen wél px-waarden. Acceptabel of niet is een ontwerpbeslissing. **STATUS: DECIDED — V1.0 · geen actie** (§1A.4 + §1A.6). De VIBE.CONTROL-dashboardcompositie wordt **niet geabstraheerd** en Master v1 wordt **niet gerefactord**; het gemeten defect blijft dus binnen de bevroren B1 en wordt naar geen enkel bouwtype meegenomen. Het punt heropent alleen als de Master-v1-lock expliciet wordt opgeheven (§1A.11). |
| C7 | **Hover-uitschakeling dekt de verkeerde elementen** | `home-mobile.css:236-238` noemt `.vh-sol-mod:hover`, `.vh-infra-kaart:hover` en `.vh-proof-strip:hover`, maar alleen `.vh-infra-kaart:hover` heeft een transform (`home-infra.css:224`). Het element dat wél een transform op hover heeft en **niet** in de lijst staat, is `.vh-proof-org:hover` (`home-proof.css:133`). | Of die omissie bewust is, volgt niet uit de code. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D). **Heropening:** bij de eerste master met een kaarthover (B2, stap 1) — de hover-uitschakeling wordt daar op de werkelijke transform-dragers gezet, niet op een lijst die uit Master v1 is overgenomen. |
| C8 | **`data-screen-label` op de hero staat op de verkeerde tag** | Negen secties dragen het attribuut, maar op sectie 1 staat het op een `<div class="vh">` (`index.html:75`) en niet op een `<section>`. Daardoor matcht de heroselector van `_leadpopup.js:265` niet en opent de brochurepopup op sectie 2. | Bedoelde trigger of gevolg van de tagkeuze? Blijkt nergens uit. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D, register **D9**). **Heropening:** bij de migratie van de leadflow (S2, stap 7), samen met C-03 en C-06 (§6.9). Tot dan geen wijziging in `_leadpopup.js` of `index.html`. |
| C9 | **Dubbele bestemming** | `.vh-sol-mod--hvac` (`index.html:398`) en `.vh-sol-mod--ems` (`:417`) linken beide naar `systeem-ems`. Er is geen HVAC-pagina in de repository. | Bedoeld of wachtend op een ontbrekende pagina? **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D, register **D13**). C-02 legt vast wát `systeem-ems` wordt (de VIBE.CONTROL-productpagina, §6.7), niet waar de HVAC-kaart heen gaat. **Heropening:** bij de IA-uitwerking van de ingang "Oplossingen" (C-01, §5.5) in de B2-master — HVAC krijgt daar een eigen bestemming of de kaart vervalt. Een tweede link naar dezelfde pagina is geen bestemming. |
| C10 | **`aria-hidden`-inconsistentie in de oplossingskaarten** | Vijf `.vh-sol-pijl`-spans hebben geen `aria-hidden` en hun inner-svg wel; de zesde (`index.html:449-451`, Energiehandel) heeft het op de span en niet op de svg. Diezelfde pijl heeft bovendien `stroke-width:2.2` terwijl de vijf andere 2.3 hebben. | De enige kaartpijl die op beide punten afwijkt. Welke de norm is, volgt niet uit de code. |
| C11 | **Zwevende `</div>`** | `index.html:297` bevat een sluittag zonder open element, met `<!-- trust bar -->` erboven (`:296`) — restant van een verwijderde sectie. De parser negeert hem, dus de weergave klopt, maar de markup is niet valide. | Herstellen valt buiten deze read-only opdracht. |

### 8.4 Responsive

| # | Onderwerp | Wat de code zegt | Wat ontbreekt |
|---|---|---|---|
| R1 | **De 600px-grens die niet bestaat** | `home-hero.css:477-481` noemt 600px als omslagpunt; er is geen 600px-query in de hele CSS. De feitelijke omslag staat op 768. | Is 600 de bedoelde grens (query ontbreekt) of 768 (commentaar achterhaald)? |
| R2 | **Het commentaar meet op oudere copy** | Datzelfde blok motiveert de één-koloms keuze met de string "Opgeleverde projecten", die in de huidige `index.html` niet voorkomt. | Opnieuw meten of het commentaar bijwerken is een keuze, geen afleiding. |
| R3 | **`.vh-infra-kpi` — volledige responsieve trap zonder element** | 23 voorkomens in de CSS, waaronder een complete 4 → 2×2 → 4-trap (`home-infra.css:282-328`, `:413-425`, `:433-435`); 0 voorkomens in `index.html`. `home-infra.css:153` bevestigt de verwijdering. | Weg of als reserve laten staan, staat nergens vast. |
| R4 | **`.vh-footer-wig-ongebruikt`** | 0× in `index.html`. De naam suggereert bewust geparkeerde code, maar dat is niet vastgelegd. Daarnaast zet `home-footer.css:401` `height:180px` op een element dat op `:372` `display:none` krijgt in het bredere blok — die hoogte is inert. | Voorbereiding op terugzetten, of restant? |
| R5 | **Dode maten in de tabletband** | Binnen hetzelfde 768–1199-blok staat `.vh-infra-foto{ height:330px }` op `home-infra.css:429` en `.vh-infra-foto{ height:260px }` op `:443`. Gelijke specificiteit, dus 260px wint; de 330px is dode code. | Bedoeld of overgebleven? |
| R6 | **Het cqw-vangnet heeft een gat** | Negen levende cqw-box-shadows hebben geen mobiel equivalent, terwijl `--vibe-elev-mob` bestaat en één keer wordt gebruikt. Op een 390px-scherm krimpen die schaduwen met factor 4,5. | Geen fout die iets breekt, wel een onbedoelde stijlafwijking tussen kaarten in dezelfde band. Niet vastgelegd. **STATUS: DECIDED — V1.0 voor nieuw werk** (§1A.6). Nieuw werk rekent in `clamp()`/px; `cqw` alleen in bewust canvas-proportionele composities. Een nieuwe schaduw in cqw zonder mobiel equivalent kan daardoor niet meer ontstaan, en het aantal elevatieniveaus krijgt bij T8 meteen zijn mobiele tegenhanger. **Het gat in Master v1 zelf blijft staan:** B1 wordt niet herbouwd (§1A.11). |
| R7 | **Ongedocumenteerde cascade-overschrijvingen** | `home-mobile.css:213-221` laadt als laatste en overschrijft bij gelijke specificiteit `line-height`-waarden in de sectiebestanden (`.vh-logo-vibe`, `.vh-sol-mod--zon p`, `.vh-footer-nav ul a`). | Deze overschrijvingen zijn niet als zodanig gedocumenteerd. Wie later een `line-height` in een sectiebestand aanpast, ziet geen effect. |
| R8 | **Inerte regels in de footer** | `home-footer.css:373-382` (`.vh-footer-wig-ongebruikt`, `.vh-footer-wig img`, `.vh-footer-wig::after`) en `:401` staan ná `display:none` op `:372` en kunnen niets meer beïnvloeden. Gevolg: de `sizes`-waarde `(max-width:1199px) 92vw` van beeld 13 wordt nooit gebruikt. | Opruimen of laten staan is niet vastgelegd. |
| R9 | **Raakdoelhoogte in de footer** | `home-footer.css:322-325` claimt 44px. De code levert `min-height:40px` + `padding:2px 0`, wat 44px doosnhoogte geeft — maar alleen omdat padding bij `content-box` buiten `min-height` valt. Er is geen universele `border-box`-reset. | Met een later toegevoegde `border-box`-reset wordt het 40px. Dat risico is nergens vastgelegd. |
| R10 | **Geen bovengrens op de desktopschaal** | Geen `max-width` in `home*.css`; boven 1774px groeit alles lineair mee (op 2560px is `.vh-h1` 110px in plaats van 76,5px). | Bedoeld of onbehandeld? Een `max-width` is hier geen reparatie: de hero is een `aspect-ratio`-podium met absolute lagen in percentages. Er is geen besluit vastgelegd. **STATUS: DECIDED — V1.0 voor nieuw werk** (§1A.6). `clamp()` is de default en levert de bovengrens die Master v1 mist; `cqw` blijft voorbehouden aan bewust canvas-proportionele composities. **Master v1 zelf blijft ongewijzigd** — de hero is een `aspect-ratio`-podium met absolute lagen in percentages en wordt niet met een `max-width` gerepareerd (§1A.6, §1A.11). |

### 8.5 Content

| # | Onderwerp | Wat de code zegt | Wat ontbreekt |
|---|---|---|---|
| I1 | **Het categorielabel bestaat niet in de markup** | `index.html:218-221` noemt het dragend; `.vh-kpi-item` bevat het niet en `home-hero.css` kent er geen selector voor. | Bewust geschrapt (dan klopt het commentaar niet meer) of per ongeluk niet meegenomen (dan mist de strook de scheiding)? |
| I2 | **Hangende zelfverwijzing** | `index.html:617` verwijst naar *"index.html sectie 2: 'geen dashboard-/schermfotografie'"*. Die frase komt in de hele repo alleen op regel 617 zelf voor. | Verwijderde regel uit een eerdere versie, of een besluit dat buiten de code leeft? De regel is bruikbaar maar niet verifieerbaar. |
| I3 | **Citaat niet letterlijk terug te vinden** | `index.html:976` citeert een FAQ: *"Binnen 48 uur weet u wat haalbaar is"*. Die zin staat in deze repo alleen op regel 976 zelf. De substantie is wél breed gedekt ("Reactie binnen 48 uur" op zes pagina's; `over-ons.html:597`; `contact.html:226`). | Gewijzigde bronpagina of parafrase in citaatvorm? Voor de claim maakt het niets uit; voor de bronverantwoording wel. **STATUS: DECIDED — V1.0** (§6.6, toepassingsregel 3). De **belofte** is `SUPPORTED` — "Reactie binnen 48 uur" staat op zes pagina's — en blijft publiceerbaar. De **citaatvorm** is dat niet: een aanhalingsteken vraagt een letterlijk reproduceerbare bron. Bij migratie: parafrase zonder aanhalingstekens, of een echte vindplaats. |
| I4 | **Maandcasing bij projectdata** | `index.html:861` schrijft "opgeleverd juli 2024"; `project-ratio-16.html:62` schrijft "Opgeleverd · Juli 2024". | Bewust naar kleine letters (past bij de lopende zin) of overschrijffout? Er is maar één datumvermelding op de homepage. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D, register **D19**). **Heropening:** bij de B3-master `project-ratio-16.html` (stap 2), waar de datumnotatie van álle elf casepagina's in één vorm wordt gezet. |
| I5 | **Em-dash-codering inconsistent** | `index.html:833` en `:847` gebruiken `&mdash;`, `:965` een letterlijke U+2014. Gerenderd identiek. | Geen regel in de code die zegt welke de norm is. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D, register **D20**). **Heropening:** bij de eerste master die em-dashes zet (B2, stap 1) — één codering wordt norm en komt als contentregel in §6.4 te staan. Gerenderd verandert er niets; het is een bronregel, geen vormregel. |
| I6 | **Scope van Master v1 tegenover de gedeelde overlays** | `_leadpopup.js` en `_consent.js` hanteren "u/uw" en de popup toont drie ongedekte cijfers (`_leadpopup.js:116`). De popup vuurt wél op de homepage (`index.html:1242-1243`). | Valt gedeelde overlay-copy onder de Master v1-doctrine? Er is geen commentaar in `index.html` dat hier iets over zegt. Conflict genoteerd, geen regel uit afgeleid. **STATUS: GEMENGD.** **DECIDED — V1.0 (C-07)** voor de drie cijfers op `_leadpopup.js:116`: status `UNVERIFIED`, dus VERIFIED maken met een primaire bron, herschrijven of verwijderen (§6.6). **DEFERRED TO PAGE MIGRATION** (categorie D, register **D11**) voor de aanspreekvorm: de contentregels van V1.0 gelden voor alles wat de bezoeker ziet, maar `_leadpopup.js` en `_consent.js` renderen op 35 pagina's tegelijk; **heropening** bij de migratie van de leadflow (S2, stap 7) of zodra een gemigreerde pagina als eerste een van beide laadt. **Nu geen productiecode wijzigen.** |
| I7 | **De 48-uurbelofte tegenover de 24-uurbelofte** | Master v1 kiest 48 uur en wijst 24 uur af (`index.html:975-978`); 24 uur hoort uitsluitend bij de Netcongestie Check (`netcongestie-check.html:421`). | Vastgelegd voor de homepage; of dat ook voor andere pagina's geldt, staat nergens. **STATUS: DECIDED — V1.0** (§6.6, toepassingsregel 2). **Scope hoort bij de status:** een VERIFIED claim geldt alleen binnen de scope van haar bron. "Binnen 24 uur" blijft dus uitsluitend bij de Netcongestie Check (`netcongestie-check.html:421`); overal elders geldt de breed gepubliceerde 48 uur. Dit geldt site-breed, niet alleen voor de homepage. |

### 8.6 Systeem en migratie

| # | Onderwerp | Wat de code zegt | Wat ontbreekt |
|---|---|---|---|
| S1 | **Twee onverenigbare navigatiesystemen** | `index.html` draagt een eigen ingebakken header met **zes** platte links (`:142-147`, plus dezelfde zes in het mobiele menu op `:167-172`) en één CTA (`:157`); de pagina laadt `_header.js` **niet**. De 34 andere pagina's laden `_header.js?v=3` met drie mega-menu's (`_header.js:22-48`), vier platte links (`:146-149`) en twee CTA's (`:152-153`). Een bezoeker die van de homepage naar een subpagina klikt, ziet een compleet andere navigatie. *(Meetcorrectie op de eerdere versie van deze regel: het zijn zes links, niet vijf.)* | Zolang dit niet is besloten kan geen enkel archetype worden gebouwd. **STATUS: DECIDED — V1.0 (C-01)** (§1A.1, §5.5, register **D14**). De platte Master-v1-header wordt de sitebrede standaard, het mega-menu vervalt en wordt niet teruggebouwd, 1199px blijft de navigatiegrens. Randvoorwaarde: de vijf systeempagina's, de vijf sectorpagina's en `energy-hubs.html` landen aantoonbaar in de nieuwe IA — zie de landingstabel in §5.5. |
| S2 | **Er bestaat geen subpagina-herovariant** | De homepage-hero heeft de header ingebakken in dezelfde `.vh-stage` (`index.html:77-206`) en is daardoor onbruikbaar op elke pagina met `_header.js`. De veertien `subpage.css`-pagina's gebruiken `.phero`, dat de Vibe-geometrie niet draagt. | De grootste ontbrekende component. **STATUS: GEMENGD.** **DECIDED — V1.0 (C-01):** de blokkade zelf is weg — de header wordt een losse platte balk en zit niet langer in het hero-podium ingebakken, dus een subpagina-hero is nu bouwbaar (§1A.1). **DEFERRED TO PAGE MIGRATION** (categorie D, register **D16**) voor de herovorm zelf: **heropening** bij de B2-master `systeem-energieopslag.html` (stap 1), die de subpagina-hero vastlegt voor alle vier de B2-varianten. |
| S3 | **De FAQ bestaat op veertien subpagina's maar niet in Master v1** | De homepage heeft geen FAQ-sectie; wel staat er dode FAQ-JavaScript in (`index.html:1227-1240`, guard op een niet-bestaande `#faqList`). | Master v1 levert geen vormtaal voor het meest gebruikte subpagina-component. FAQ toevoegen of bewust subpagina-eigen houden — dat moet vastliggen. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D, register **D17**). **Heropening:** bij de B2-master `systeem-energieopslag.html` (stap 1). Een bouwtype bepaalt welke componentfamilies het kent (§1A.3); de FAQ hoort daar thuis, niet in een losse componentbeslissing vooraf. De dode FAQ-JavaScript in `index.html:1227-1240` blijft onaangeroerd zolang B1 bevroren is. |
| S4 | **`tokens.css` is niet dood buiten de homepage** | Op de homepage overschrijft `home.css` de letter (`:83`, `:104-111`) en de focusring (`:119-127`). Op de 34 andere pagina's is `tokens.css` volledig actief, inclusief de UNIFY LAYER met `!important` die radii op 0 forceert bij `.card`, `.btn-p` en elf andere selectoren (`tokens.css:87-94`) en kaartschaduw overschrijft (`:97-99`). | Zodra een archetype de Master v1-kaartvorm krijgt, vecht `tokens.css:87-94` met `!important` terug. Dat conflict moet worden opgelost, niet omzeild. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D). **Heropening:** bij de eerste master die een Master-v1-kaart op een `tokens.css`-pagina zet — B2 `systeem-energieopslag.html` (stap 1). Daar wordt de UNIFY LAYER (`tokens.css:87-94`) opgelost door haar te verwijderen of te vervangen, **niet** door er met hogere specificiteit overheen te schrijven. |
| S5 | **Het oude cyane systeem rendert wél op de homepage** | `index.html` laadt `_consent.js` (regel 4) en `_leadpopup.js` (`:1243`). `_consent.js:57-84` injecteert een stylesheet met `#00ADEF`, `#0096CC`, `#0078AD` — het palet van het vorige designsysteem. | De cookiebanner en de leadpopup zijn de enige cyane vlakken op een verder blauwe pagina. Buiten de CSS-scope van deze audit, maar het rendert. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D). **Heropening:** bij de migratie van de leadflow (S2, stap 7) of zodra een gemigreerde pagina als eerste `_consent.js`/`_leadpopup.js` laadt — dezelfde voorwaarde als I6 en C8, zodat kleur, aanspreekvorm en claimstatus in één ingreep worden meegenomen. **Nu geen productiecode wijzigen.** |
| S6 | **`contact.html` is een bundler-artefact** | 409 KB; de volledige pagina staat als JSON-geëscapete string in `<script type="__bundler/template">` (`contact.html:225-227`); de `<noscript>` zegt "This page requires JavaScript to display" (`:40`); laadt `_header.js` noch `_footer.js`. Dit is de eindbestemming van vrijwel elke CTA op de site. | Herbouw als echte HTML is een voorwaarde, geen verbetering. **STATUS: DEFERRED TO PAGE MIGRATION** (categorie D, register **D15**). **Heropening:** ingepland als **stap 4** van de migratievolgorde, de B6-master `contact.html` (§1A.11). De voorwaarde verandert niet door het uitstel: zolang de pagina een bundlerartefact is, is zij de eindbestemming van vrijwel elke CTA op de site zonder dat er zonder JavaScript iets staat. |
| S7 | **`projecten.html` spreekt zichzelf tegen en botst met de homepage** | Hero toont 47 / 12 MWp / 98% (`:173-175`); de teller vijftien regels lager zegt "Alle 11 gerealiseerde projecten" (`:191`). De homepage heeft precies deze drie cijfers verworpen. | De homepage wint. De vervangwaarde — het getelde aantal gepubliceerde cases, of geen cijfer — moet worden gekozen. **STATUS: DECIDED — V1.0 (C-07)** (§6.6, §6.2). De drie herocijfers zijn `UNVERIFIED` en de pagina spreekt zichzelf tegen (`CONFLICTING`): beide blokkeren migratie van die claim. **De vervangwaarde is gekozen:** de `SUPPORTED`-formulering "11 gepubliceerde projectcases" of "11 projecten uitgelicht", die exact dekt wat de telling bewijst — nooit "slechts 11 projecten gerealiseerd". **Uitvoering:** bij de B4-master `projecten.html` (stap 3), tegelijk met de omzetting van `data-f`/`data-sector` naar het canonieke sectorvocabulaire (§6.8). |

---

## Bijlage — meetverantwoording

| Wat | Hoe gemeten |
|---|---|
| Commit | `git -C /Users/mounirvanbinsbergen/projects/vibe-website log -1` → `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1` "feat: lock homepage master v1" |
| Werkboom | `git status --porcelain` → alleen ongetrackte `.DS_Store` en `review/`; geen wijziging in HTML, CSS, JS of assets |
| Media queries | `grep -o '@media (max-width: 1199px)' home*.css` → 12; tabletband → 11; 859/1000/1024 → elk 1; `hover:none` → 1; `prefers-reduced-motion` → 3 |
| `--vibe-*`-tokens | `grep -c '^\s*--vibe-[a-z0-9-]*:' home.css` → 23; geen definities in enig ander `home-*.css` |
| `clip-path` per bestand | `grep -c 'clip-path' <bestand>` → hero 5, solutions 1, project 0, process 1, control 1, proof 3, infra 2, final 5, footer 2 |
| CTA-klassen | `grep` per klasse over `home*.css` en `index.html` → alle 15 bestaan in CSS; `.vh-btn` 3× in de markup, alle drie in sectie 1 (`index.html:157`, `:189`, `:192`) |
| SVG's | `grep -o '<svg' index.html` → 92; `role="img"` → 0; `<title>` binnen svg → 0; `focusable="false"` → 83; `stroke="currentColor"` → 79; `fill="currentColor"` → 6; pijlpad `M4 12h15m-6-6 6 6-6 6` → 27 |
| Aanspreekvorm | `grep -o '\bjouw\b' index.html` → 5; `grep -oE '\b(uw)\b'` → 0 |
| Uitroeptekens | Alle `!` in `index.html` gecontroleerd: uitsluitend in JavaScript, `!important` en de DOCTYPE; **0** in zichtbare copy |
| `object-position` | `grep -rn 'object-position' home-*.css` → 16 declaraties, zie §4.2.2 |
| Krimpbescherming | `grep -rhoE 'min-width: *0(px)?\b' home.css home-*.css` → 14; `grep -rho 'minmax(0' …` → 7; `grep -rho 'box-sizing' …` → 18 |
| `<br>` op `display:none` onder 1200px | `grep -rn 'br{ *display: *none' home-*.css` → 28 |
| Laadvolgorde | `index.html:56-67` |
| **Metingen voor §1A, §5.5 en §6.6-§6.9 (tweede ronde, zelfde commit)** | |
| Headerlinks Master v1 | `grep -n 'href="#oplossingen"…' index.html` → **zes** links op `:142-147`, primaire CTA op `:157`; dezelfde zes in het mobiele menu op `:167-172` met eigen CTA op `:174` |
| Legacy-navigatie | `_header.js:22-48` — drie mega-menu's met 9 (`:24-32`), 5 (`:35-39`) en 5 (`:42-46`) items; vier platte links `:146-149`; twee CTA's `:152-153`. `grep -l "_header.js" *.html` → 35 treffers, waarvan 34 webpagina's plus het fragment `_header.html` (dat het script alleen in een commentaar noemt) |
| Sticky CTA `.mcta` | `grep -ln "mcta" *.html` → **26** pagina's; definitie `subpage.css:262-266` (zichtbaar <760px, `body{padding-bottom:74px}`), override `:379-381`, inline kopie `projecten.html:328` |
| PDF's en brochuremap | `find . -name "*.pdf"` → **0** treffers; `ls assets/brochures` → map bestaat niet; dood voorbeeldpad `_leadpopup.js:9` staat in het commentaarblok, runtime-default is leeg (`:32`) en zonder `file` opent de popup niet (`:33`) |
| Leadconfiguraties | `grep -rn "VIBE_LEAD" *.html` → **vijf**, alle vijf met een `.html`-guide als `file` (`index.html:1242`, `oplossing-laadplein.html:269`, `oplossing-energielabel.html:857`, `oplossing-exploitatie.html:295`, `oplossing-netcongestie.html:299`); popupcopy `_leadpopup.js:113`, `:124` |
| Executive Guides | `grep -l "report.css" *.html` → **zeven**; in `sitemap.xml` drie (`:16`, `:118`, `:124`); `grep -n "mailto:mounir@vibeenergy.nl"` over de zeven → **7 van 7** |
| Sectorvocabulaires | `Sector ·`-veld aanwezig op **11 van 11** casepagina's (Residentieel vastgoed ×5, Residentieel vastgoed · belegger ×1 op `project-arnhem-60.html:58`, Automotive ×2, Recreatie ×1, Bedrijfspand ×1, Commercieel vastgoed ×1); `.pc-crumb` → Woningportefeuilles ×6, Automotive ×2, Recreatie ×1, Bedrijfspanden ×1, Netcongestie & Energy Hubs ×1; `grep -o 'data-sector="[^"]*"' projecten.html` → Woningen 6, Automotive 2, Bedrijfspanden 1, Netcongestie 1, Recreatie 1; chips `projecten.html:185-189`; `grep -n 'industrie-' index.html` → **vier** sectorkaarten (`:922`, `:927`, `:932`, `:937`), geen `industrie-vve` |
| Naamgeving | `grep -c "VIBE.CONTROL" *.html` → 10× `index.html`, 1× `systeem-ems.html`, nul elders; EMS-termen in `systeem-ems.html` → 47 treffers, `<title>` `:16`, meta description `:17`, `<h1>` `:70` |
| **Niet gemeten** | Geen browser gedraaid, geen build uitgevoerd, geen screenshot gemaakt. Alle uitspraken komen uit statische bestandsinhoud op commit `aae26bf`. Gerenderde uitkomsten (werkelijke pixelmaten, werkelijke contrastverhoudingen, werkelijke laadvolgorde in de browser) zijn in deze sessie **niet waargenomen**. |
