# VIBE WEB DESIGN SYSTEM — CHANGELOG EN DOCUMENTARCHITECTUUR

Eén pagina die de hele keten uitlegt. Bijgewerkt 2 oktober 2026.
**Niets in dit document wijzigt productiecode.**

---

## 1 · De keten in het kort

| versie | wat werd vastgesteld | wat werd teruggedraaid |
|---|---|---|
| **V1.0** (bevroren, commit `8ea4c25`) | Zes documenten uit een forensische audit van Homepage Master v1 (`aae26bf`). Tokens, primitives, componenten, archetypes B1–B7 + S2, claimpolicy, migratiemethodiek. `§1A` van het brandbook is de bevroren basislijn en wint bij elke tegenspraak. | — |
| **V1.1** (additief, ongecommit) | `vibe-section-compositions-v1.md`: twaalf compositiefamilies `C1`–`C12`, paginaritme HIGH/MEDIUM/QUIET, zestien antipatronen `A1`–`A16`. Reden: V1.0 legde vast wáár een pagina uit bestaat, niet hóe de delen liggen. | — |
| **V1.2 — AUDIT** (geslaagd) | Forensisch bewijs dat de B2-kandidaat de V1.1-maatstaven haalt en er tóch getemplatet uitziet. Zes gemeten oorzaken, waarvan de proportionele invariantie de hoofdoorzaak is. | — |
| **V1.2 — SYSTEEM** (gezakt) | Vijf documenten met `G01`–`G24`, `M0`–`M6`, `K1`–`K8`, `B01`–`B15`, `P-01`–`P-16`. | **Niet aanvaard.** Zie §3. |
| **V1.3 — REPARATIE** (deze ronde) | `docs/04-visual-language-v1.3.md`, zes hoofdstukken: desktopcanvas met drie modi, beeldsysteem op echte assetklassen, vlakhiërarchie met registers, functionele geometrie, relatieblauwdrukken `BR-01`–`BR-13`, en een poort met vier verdicten. | Twee V1.2-conclusies ingetrokken, zie §4. **Zelf ook GEBLOKKEERD**, zie §5. |

---

## 2 · Wat V1.2 als audit heeft bewezen — aanvaard bewijs

Alles gemeten op 1774px, Homepage Master v1 tegenover de B2-kandidaat.

| meting | homepage | B2 |
|---|---|---|
| `pageH@1440 ÷ pageH@1774` tegen `1440÷1774 = 0,8117` | 0,8117 (afwijking **0,003%**) | 0,8838 (**8,87%** ernaast) |
| mediane werkbreedte, 1774 / 1440 | 90,5% / 90,6% | 68,1% / 86,0% |
| overlappende elementparen | 454, nul secties zonder | 52, vier secties zonder |
| informatievlak óp een beeld | 6 van 9 secties | 0–1 van 11 |
| beelden ≥ 50% viewport | 5 van 8 | 1 van 7 |
| beeldvlakken met polygoonmasker | 5 van 8 | **0 van 5** |
| geometrie | 13 elementen, 14 hoekwaarden | 4 elementen, viermaal 34° |
| `position: absolute` · `cqw` · `container-type` | 73 · 779 · 9 van 9 | 19 · 3 · 1 |
| koppen met handgezette regelval | 7 van 8 | **0 van 10** |
| kleinste kopgraad | 53px | 32px, mediaan 44px |

> **MEETCORRECTIE (2 oktober).** In de V1.2-audit is gerapporteerd dat de homepage *nul* keer
> `position:absolute` gebruikt tegenover 19 keer in de B2-kandidaat. Dat was een grep-artefact: de
> zoekterm had geen spatie, de homepage-CSS wel. Correct geteld: **homepage 73, B2 19.** De homepage
> positioneert dus méér absoluut, niet minder — binnen een proportioneel canvas. De conclusie
> "de homepage werkt in flow" vervalt; de hoofdoorzaak verandert niet, want die rust op de
> cqw-telling (779 tegen 3), de `container-type`-dekking (9 van 9 stylesheets tegen 1), het
> ontbreken van een paginabrede `max-width` en de clamp-plafondberekening hieronder.

**De rekenkundige verklaring** (V1.3 H1 §1.1.2): op de B2-pagina staan **negen van de negen
typerollen op 1774px op hun clamp-plafond**; de hoogste bindende breedte is 1682px, de goot bindt op
1739px. Boven 1739px verandert alleen `--section-y` nog. Een pagina met nul vrijheidsgraden boven
1740px kan geen desktopcompositie meer maken. Dát is de hoofdoorzaak, en hij volgt rechtstreeks uit
`brandbook §1A.6` punt 2 en 3.

---

## 3 · Waarom V1.2 als systeem is afgewezen

| # | bevinding | meetwaarde |
|---|---|---|
| 1 | Een nep-pagina van ±40 regels CSS haalde de poort | **22 van 22 PASS**, en versloeg Master v1 op 6 van de 14 scheidende poorten |
| 2 | Vijf bevroren homepagecomposities werden herbruikbare blauwdrukken | in strijd met `brandbook §1A.4` (abstractieverbod) |
| 3 | Alle vijf papieren pagina's werden bijna-kopieën van de homepage | **0 van 126** maatwaarden nieuw |
| 4 | Tien van vijftien blauwdrukken eisten een eigen foto, één fotoloze sectie toegestaan | echte pagina's hebben er 5 tot 7 nodig |
| 5 | Geen registerblauwdruk | 20 FAQ-paren over vier pagina's hadden geen plaats |
| 6 | 23 van 48 pagina's niet meetbaar | de poort las `[data-screen-label]`, dat op 25 pagina's staat |
| 7 | Vier tegenstrijdigheden tussen de vijf documenten | o.a. `B13` kan niet bestaan |

Vijf structurele fouten eronder: plafonds zonder vloeren · tellen zonder wegen · het harnas meet
CSS-mechanismen in plaats van verschijning · een lege meting slaagt (`[].every()` is `true`) · de
ontwerplaag zelf is zelfgerapporteerd.

---

## 4 · Twee intrekkingen in V1.3

**4.1 — "M1, M2 en M4 zijn onbouwbaar" (V1.2 papiertest §2.1) is INGETROKKEN.**
De toets was fout. Een bronbeeld hoeft de doelratio niet te hébben; het moet hem na uitsnede kunnen
léveren met genoeg pixels én met het onderwerp intact. Uit een 16:9-bron van 2400×1350 levert
M1 (2,37) **75% van de hoogte**, M2 (3,02) 59%, M4 (3,26) 55% — elke uitkomst geeft meer pixels dan
de weergave vraagt. Master v1 doet het zelf: `s3-project` snijdt 41% hoogte uit een bron van
5120×2880. De echte beperking is **onderwerpbehoud**, en die verschilt per beeldsoort.
Wat ervoor in de plaats komt: zes behandelingen met per stuk `REAL-ASSET FEASIBILITY` en de
bestandsnamen die hem kunnen dragen. **M1 heeft er twee, waarvan er één de resolutie-eis haalt.**

**4.2 — Het voorstel om sub-AA-contrast als norm vast te leggen (V1.2 `DR-V-20b`) is VERWORPEN.**
V1.2 stelde voor de gemeten masterwaarden ("ongunstigst ≥ 3,9:1") tot norm te verheffen. V1.3 legt
vast dat normale tekst AA haalt. Master v1 wordt **niet** gewijzigd; zijn twaalf gemeten tekorten
staan als `LEGACY EXCEPTION — FUTURE REMEDIATION` in een register met de exacte waarden
(`#0073FE` 4,30:1 · `--vibe-sub` 4,29:1 · eyebrow op beeld 3,95:1 · footernotitie 2,00:1, `aria-hidden`).
Nieuwe pagina's kennen zes meetbare verboden, elk een **FAIL** — waaronder: type op een beeld zonder
glyphgemaskeerde meting is FAIL, **niet N.V.T. en zeker niet PASS**.

---

## 5 · Waarom V1.3 zelf nog GEBLOKKEERD is

| # | blokkade | meetwaarde | reparatie |
|---|---|---|---|
| **BLK-01** | **20 onopgeloste tegenstrijdigheden** van de 60 substantieve rijen | **40** opgelost · 16 toegewezen · 4 open | per rij een besluit of één meting |
| **BLK-02** | **De poort is onbruikbaar op 43 van de 48 pagina's.** Onder `H6 F-6` kan geen pagina met één DOCUMENT-sectie ooit `GOEDGEKEURD` worden, terwijl `H1 §1.3.6` minimaal één DOCUMENT-sectie voorschrijft op B2, B4, B5, B6 en B7 | 43 van 48 | één regel in `§6.1.4` |
| **BLK-03** | **De homepagekloon komt erdoor.** Elke uitvoerbare poort is paginaintern: van de 26 telbare toetsen kijken er twee over de paginagrens en geen van beide is uitvoerbaar | kloon behoudt 9/9 sectieposities, 6/6 beeldbehandelingen, 9/9 kaders, 8/8 kopgraden, 14/14 hoekwaarden | `VAR-07` tot poort maken en het siteregister aanleggen dat `D-06` nodig heeft |
| **BLK-04** | **De diversiteitstoets laat uniformiteit door.** Vier van vijf pagina's dragen dezelfde complete HIGH-reeks; de grens is vier | 23,8% van elke pagina is van de toets vrijgesteld | grens naar drie, vrijstelling inperken |
| **BLK-05** | **`DR-I-22` is onhaalbaar.** Plafond van 40% fotoloze secties; de vijf papieren pagina's zitten op 57–86%. Over 48 pagina's vraagt dat ±240 beeldslots tegen 25 bruikbare opnamen — tekort factor 9,6. Botst bovendien met `DR-S-09` (max 5 fotoloze secties): alleen verenigbaar op een pagina van exact 11 secties | 5 van 5 FAIL | plafond vervangen door de verscheidenheidsvloer `BR-F2` (≥ `ceil(n÷2)` dragersoorten, max 3). Nagerekend: 4 van 5 PASS |
| **BLK-06** | **Eén M1-drager, en dat is de homepagehero.** Een podium van 1774px eist ≥2484px; van de drie kandidaten halen `hedin-amsterdam` en `purmerend` (beide 2400px) dat niet. Blijft over: `projects/hedin-alkmaar-2.jpg` — het herobeeld van Master v1 | 1 van 27 opnamen | M1 als HOMEPAGE-ONLY markeren, óf fotografie aanschaffen, óf de podiumbreedte verlagen |

**Wat wél staat.** Drie van de vijf papieren pagina's halen alle drie de haalbaarheidsvragen; de twee
die zakken, zakken uitsluitend op **inhoud die niet bestaat** (zonnepanelen: 4 van 4 KPI-waarden
`UNVERIFIED`; EMS: elf ongedekte getallen). De silhouettoets haalt **10 van 10 paren**. Er zijn
**17 beeldslots en 0 leeg**, tegen 17 van 28 leeg in V1.2. En van de maatwaarden van Master v1 keert
er **geen enkele** terug in de vijf kaarten — 0 van 9 kaders, 0 van 8 kopgraden, 0 van 9
sectiehoogtes, 0 van 13 beeldbreedtes. De generieke aanval en de nep-pagina SYSTEEM-X worden beide
afgewezen (SYSTEEM-X van 22/22 PASS naar ≥18 FAIL).

---

## 6 · Documentarchitectuur — voorstel, nog niet uitgevoerd

Doel: zes lagen. Niets wordt verwijderd.

| laag | bestand | status |
|---|---|---|
| **01 BRAND** | `vibe-web-brandbook-v1.md` | BLIJFT — `§1A` bevroren, wint altijd |
| **02 TOKENS** | `vibe-design-tokens-v1.md` | BLIJFT |
| **03 COMPONENTS** | `vibe-component-library-v1.md` | BLIJFT — aanvullen met de constatering dat `.vibe-card` de families `K1`, `K7` en `K8` niet kan maken |
| **04 VISUAL LANGUAGE** | **`04-visual-language-v1.3.md`** | **NIEUW** — vervangt de rol van de vijf V1.2-documenten |
| | `vibe-visual-grammar-v1.md` · `vibe-image-system-v1.md` · `vibe-card-system-v1.md` · `vibe-section-blueprints-v1.md` · `vibe-design-quality-gate-v1.md` | WORDEN BIJLAGE — bewijsmateriaal, niet normatief |
| | `vibe-section-compositions-v1.md` (V1.1, `C1`–`C12`) | BLIJFT — V1.3 koppelt eraan |
| **05 PAGE ARCHETYPES** | `vibe-page-archetypes-v1.md` | BLIJFT — aanvullen met blauwdruksequenties per bouwtype |
| **06 MIGRATION / QA** | `vibe-migration-checklist-v1.md` | BLIJFT — `§2.0` uitbreiden met de paginacompositiekaart en de poort |
| | `vibe-legacy-inconsistencies-v1.md` | BLIJFT — bewijsbijlage |

**Voorgestelde wijzigingen aan bevroren documenten — nog niet gedaan, alle vragen een besluit:**

1. `brandbook §1A.6` punt 2/3 splitsen: typografie begrenzen met `clamp()`; compositieverhoudingen
   proportioneel. Punt 3 verbiedt letterlijk *"de gemeten cqw-erfenis"* — de 780 concrete waarden.
   Die blijven verboden en zijn in V1.3 als klasse **C** geclassificeerd. Dat composities
   proportioneel mogen rekenen is een andere vraag, en punt 3 beantwoordt die niet.
2. `brandbook §8` regel R10 herclassificeren: het ontbreken van een bovengrens is daar als
   tekortkoming van Master v1 genoteerd; gemeten is het de reden dat de homepage op desktop
   ontworpen oogt.
3. `brandbook §0` en `§1A.13` uitbreiden met laag 04 en de nieuwe keten.

---

## 7 · V1.3 — BLOKKADERESOLUTIERONDE (2 oktober)

Zes blokkades aangepakt, vriestoetsen opnieuw gedraaid. **Uitkomst: nog steeds GEBLOKKEERD**, maar
op een fundamenteel ander punt dan daarvoor.

### 7.1 Wat de ronde heeft opgelost

| blokkade | resultaat | bewijs |
|---|---|---|
| **BLK-H1** poort onbruikbaar op 43/48 | archetypebewuste matrix, 264 cellen, klasse `NIET-PAGINA` met 12 gedraaide eisen | **48 van 48 classificeerbaar** |
| **BLK-H2** homepagekloon | compositievingerafdruk op zes structurele assen; negen `CP`-regels | kloon afgewezen met marges van 2–5 posities |
| **BLK-H3** diversiteit | protagonist per archetype; HIGH-reeks volgt de inhoud | pagina's met dezelfde HIGH-reeks: **4 van 5 → 0 van 5** |
| **BLK-H4** beelddichtheid | acht visuele rollen; fotobudget met vloer én plafond per archetype | fotoslots **17 → 8**; klasse-D in gebruik **4 → 0** |
| **BLK-H5** M1-podium | zes podiumstrategieën in plaats van één | 2–3 dragers per strategie na de volledige toets |
| **BLK-H6** tegenstrijdigheden | `§1A.11` punt 4 als werkregel: een op één pagina geijkte drempel is een **meting met een eigenaar**, geen gebruikersbesluit | 19 van 20 gesloten |

Papieren test: **20 van 20 niet-inhoudelijke verdicten PASS op 5 van 5 pagina's** (was 3 van 5).
Assetschaarsteaanval **PASS**: met één klasse-A- en één klasse-B-foto levert het stelsel tien
inhoudssecties met **nul kaartrijen**.

### 7.2 Waarom het tóch geblokkeerd blijft

De eindreview haalt **3 van de 17** vriesvoorwaarden. De beslissende bevinding is scherper dan
"een generieke pagina komt erdoor":

> **De poort geeft een opzettelijk generieke pagina en een premiumpagina dezelfde uitkomstvector.**
> Op ongeveer veertig telbare toetsen eindigen beide op PASS of op N.V.T.-met-geslaagde-vervanger.
> Beide hangen op dezelfde **vier infrastructurele gaten**: er is geen benoemde reviewer, geen
> siteregister, geen herschreven harnas, en de ch→px-factor is niet gemeten.
> Het verschil tussen de twee pagina's zit volledig in de laag die vandaag **geen uitvoerder** heeft.

Daarnaast: drie legitieme composities worden ten onrechte afgewezen, waaronder één door een
**rekenfout in de regel zelf** (`NF-4`: de doorsnede van zijn eigen eisen is leeg).

### 7.3 Meetcorrecties van deze ronde

| wat | was | is | gevonden door |
|---|---|---|---|
| `position: absolute` homepage | 0 | **73** | hoofdstuk 1 (`CH1-01`), bevestigd in de eindreview |
| `cqw` homepage | 768 | **~780** (vier tellingen in omloop) | hoofdstuk 1 (`Z2`) |
| `ratio-16` = `ratio16` | duplicaat | **twee verschillende gebouwen**, RMS 83,9 | hoofdstuk 2, nagemeten |
| `vastgoed-hero` = `residentieel-hero` | duplicaat | **geen duplicaat**, RMS 74,8 | hoofdstuk 2, nagemeten |
| `residentieel-hero` = `beethovenstraat` | niet opgemerkt | **duplicaat**, RMS 0,88 | hoofdstuk 2 |
| tegenstrijdigheidsrijen | 53 | **60** substantieve rijen | `R4` |

De voorraad gaat daarmee van ~27 naar **~30 verschillende opnamen**; `projects/ratio16.jpg`
(5472×3078) is een zelfstandige klasse-A-opname die ten onrechte was afgeschreven.

### 7.4 Wat er nu voor nodig is

Niet meer ontwerpregels. De vier infrastructurele gaten:

1. **Een benoemde reviewer** — zonder die kan geen pagina `GOEDGEKEURD` worden.
2. **Het siteregister** — zonder dat zijn de drie hergebruikplafonds `NIET MEETBAAR`.
3. **Het herschreven harnas** — `A-02`, `A-06`, `VAR-04` en `VAR-06` zijn nu niet uitvoerbaar.
4. **De ch→px-factor van Urbanist** — één meting; draagt de leesmaatbanden.

Plus: de compositiekaart bestaat op **0 van 48** pagina's en `data-canvas-mode` ook. Zolang die
twee niet worden gedeclareerd, rust elke modusgescopeerde uitkomst op een aanname.

---

## 8 · V1.3 — UITVOERENDE GOVERNANCERONDE (2 oktober)

Deze ronde was geen ontwerpronde. De opdracht was de **uitvoerende laag** te bouwen die V1.3
afdwingbaar maakt, met als primaire slaagvoorwaarde: *een premiumcompositie en een generieke,
oppervlakkig merkconforme compositie mogen niet dezelfde uitkomst geven.*

### 8.1 · De vier infrastructurele gaten uit §7 — gesloten

| gat uit §7 | status na deze ronde | bewijs |
|---|---|---|
| **1. Geen benoemde reviewer** | **GESLOTEN** — vijf rollen als functie, plus een pas-id in plaats van een persoonsnaam; de auteur mag het visuele oordeel niet in dezelfde stap zelf invullen | `H7 §7.9`; de regel staat letterlijk in de uitvoer van `--packet` |
| **2. Het siteregister** | **GESLOTEN** — `docs/data/vibe-site-register.json`, 48 pagina's, **gegenereerd** uit gemeten signalen | `docs/qa/bouw-register.mjs`; `classifiable` = 48, `without_measurement_status` = 0 |
| **3. Het herschreven harnas** | **GESLOTEN** — `docs/qa/composition-gate.mjs` draait; 8 kaarten, 120 regeluitkomsten; zelftest 8/8 | `H7 §7.4`, `§7.11` |
| **4. De ch→px-factor van Urbanist** | **GEMETEN** — `1ch = 0,5856 × font-size(px)`, over **24** font/maat-combinaties, spreiding **0,09%** | `H7 §7.5` |

En de vijfde, die §7 apart noemde: de compositiekaart bestond op **0 van 48** pagina's. Nu op
**1 van 48** (`index.html`, de referentievingerafdruk) plus zeven controle- en papierkaarten.
Dat is eerlijk gezegd nog steeds 47 van 48 zonder kaart — en dat is **bedoeld**: legacy-pagina's
dragen `MIGRATIESTATUS = LEGACY / NIET GEMAPT` en doen niet alsof zij V1.3-metadata hebben.

### 8.2 · De beslissende uitkomst

| kaart | uitkomst | FAIL | gezakt op |
|---|---|---:|---|
| `control-a-premium` | **ONTWERP OK** | 0 | — |
| `control-b-generiek` | **AFGEKEURD** | 6 | `G-03` `G-04` `G-05` `G-06` `G-07` `G-08` |
| `control-c-kloon` | **AFGEKEURD** | 2 | `X-01` `X-02` |
| `homepage` · `schaarste-b2` · `vrij-a` · `vrij-b` · `vrij-c` | ONTWERP OK | 0 | — |

**De twee aanvallen vallen op disjuncte regelverzamelingen.** `control-c-kloon` slaagt op **alle
twaalf** intra-paginaregels — het is een goed ontworpen pagina — en valt uitsluitend op de
cross-paginaregels, met impact · blauwdruk · drager · media alle vier **9/9 positiegewijs identiek**
aan de homepage. `control-b-generiek` slaagt op **elke** cross-paginaregel en valt uitsluitend
intra-pagina. De poort meet daarmee drie onafhankelijke dingen in plaats van één score:
merkconformiteit, compositiekwaliteit en originaliteit.

`control-b-generiek` is geschreven door een agent die **de poortregels niet te zien kreeg**, uit de
opbouwbeschrijving alleen. Anders zou de kaart naar de test zijn geschreven en zou de test niets bewijzen.

**Eerlijk erbij:** `G-09` (dragerverscheidenheid) en `G-10` (fotobudget) keuren de generieke pagina
**goed**. Die twee toetsen scheiden niet. Dat staat zo in `H7 §7.11`, omdat het de reden is dat de
vorige poort met dit soort toetsen alleen niet te redden was.

### 8.3 · Drie retracties en correcties uit deze ronde

1. **`DR-U2-01`, `DR-U2-06` en `DR-U2-07` bestaan niet in de werkboom.** `grep -rn "DR-U2" docs/`
   geeft nul treffers. Hun inhoud stond in het meetmateriaal van de vorige ronde. Zij zijn daar
   teruggelezen en in `H7 §7.7` gesloten — twee van de drie door code, niet door tekst.
2. **De `440,0px` in `NF-4` is geen cap op het statement maar op de SECTIEHOOGTE.** Eis (4)
   (`statement ≥ 45% van de sectiehoogte`) impliceert met een statementblok van 198px een maximum van
   `198 ÷ 0,45 = 440,0px`, tegen een MEDIUM-vloer van `≥ 443,5px`. Mijn eerdere formulering van deze
   lege doorsnede als "statement ≤ 440,0px" was onnauwkeurig. De reparatie staat in `H7 §7.6`.
3. **Het `ch`/`px`-conflict was een `cqw`-conflict.** Gemeten: van de **147** CSS-regels die op
   `index.html` een breedte zetten gebruiken er **3** een `ch`-eenheid, en die drie zitten in de
   cookiepopup en de legacy-footer — **buiten** de mastercompositie. De master declareert in `cqw`
   (`.vh-lead{max-width:25.93cqw}` → 460px → 36,4ch). Er zijn dus **drie** domeinen, niet twee.
   Dat sluit `R7` en `R8` met een meting in plaats van met uitstel.

### 8.4 · Interne tegenstrijdigheden

| | n |
|---|---:|
| Gemeten en gelezen in `04-visual-language-v1.3.md` | **18** |
| Gesloten met resolutie + een toets die in PASS of FAIL eindigt | **18** |
| `DR-U2-01` · `DR-U2-06` · `DR-U2-07`, teruggelezen uit het meetmateriaal en gesloten | **3** |
| `R7` · `R8`, gesloten met een browsermeting in deze ronde | **2** |
| `T-1` · `T-4` · `T-6`, gesloten | **3** |
| **INTERNE TEGENSTRIJDIGHEDEN OPEN** | **4** |
| USER DECISION REQUIRED, operationeel gesloten met een standaardwaarde | **1** |

**De vier die openblijven, en twee heb ik zelf veroorzaakt.** Het doelgetal 0 is **niet gehaald**.

| | wat | door mij? |
|---|---|---|
| **T-2** | twee rivaliserende reviewerlagen: `B-01`…`B-07` in het doc (13 treffers) tegenover `RQ-01`…`RQ-07` in het harnas, met **andere** vragen. Welke laag gezag heeft, is niet besloten. | **deels** — ik heb de tweede laag toegevoegd |
| **T-3** | **twaalf** botsende codereeksen, gemeten; `§1A.12` punt 5 noteerde er vier. In deze ronde verminderd (`KP-`, `XP-`, `DG-`, `RQ-` zijn op vrije prefixen gezet) maar niet weggewerkt. | **deels** — ik heb `S3-28`…`S3-36` en `IC-01`…`IC-18` toegevoegd |
| **T-5** | `VAR-07` heet een poort en is er geen; drempels 0,40/0,30 **NIET GEMETEN**; opdracht en `§6.5.8` spreken elkaar tegen | nee — geërfd |
| **T-7** | de twintigste tegenstrijdigheidsrij uit `§7.1` is **niet geïdentificeerd** | nee — geërfd |

Waarom niet alsnog gesloten: `T-2` vraagt een gezagsbesluit, geen meting; `T-3` vraagt een
stelselbrede hernummering over 7 400 regels met reële kans op stille fouten; `T-5` vraagt een
ijkmeting op een pagina die nog niet bestaat; `T-7` zou raden zijn. Zie `H7 §7.14`.

### 8.5 · Wat deze ronde NIET heeft gedaan

- **Geen productiecode.** `systeem-energieopslag.html`, `vibe-system.css`, `vibe-storage.css`,
  `vibe-nav.js`, Homepage Master, overige HTML/CSS/JS en `assets/` zijn byte-identiek.
  Vingerafdruk over de 220 getrackte niet-doc-bestanden vóór en na: **gelijk**.
- **Geen B2-herbouw.** De drie bevroren zware secties die `D-01` in `systeem-energieopslag.html` meet
  (`03 Probleem`, `09 Implementatie`, `10 FAQ`) zijn **gerapporteerd, niet gerepareerd**. Dat is een
  meting aan bestaand werk, geen regressie uit deze ronde.
- **Geen V1.4.** Alles is in `04-visual-language-v1.3.md` als `H7` toegevoegd.
- **Geen retrofit van 48 pagina's.** 47 van 48 dragen geen kaart, met expliciete meetstatus.

### 8.6 · Nieuwe bestanden — alle uitvoerbaar, alle onder `docs/`

| pad | wat het is |
|---|---|
| `docs/schema/composition-card.schema.json` | het kaartschema |
| `docs/data/vibe-site-register.json` | het siteregister, 48 pagina's, gegenereerd |
| `docs/compositions/*.json` | 8 compositiekaarten (1 master · 7 controle/papier) |
| `docs/qa/composition-gate.mjs` | de poort, met `--zelftest` en `--packet` |
| `docs/qa/bouw-register.mjs` | de registergenerator |
| `docs/qa/desktop-governance.mjs` | de browsermeting bij 1440/1774/1920 |

Alles staat onder `docs/` zodat **beide** productievingerafdrukken ongemoeid blijven — de getrackte
(220 bestanden) en de volledige niet-doc-vingerafdruk (866 bestanden). `package.json` is daarom
**niet** gewijzigd en er is geen npm-script toegevoegd; het harnas draait met `node <pad>`.

### 8.7 · Twee correcties op mijn eigen werk in deze ronde

1. **Valse verwijzing in het kaartschema.** `composition-card.schema.json` beschreef `VR-A`…`VR-H` als
   *"uit hoofdstuk 3"*. Hoofdstuk 3 benoemt **vier dragersoorten** (`D-0`, `D-F`, `D-V`, `D-O`) — iets
   anders — en de acht `VR`-codes stonden **nergens** in `docs/` gedefinieerd, terwijl `KP-09` er een
   MACHINE-telling op uitvoert. De agent die de homepagekaart schreef weigerde te doen alsof en legde
   de acht codes in haar eigen `notes` vast. Die definities zijn nu normatief in `H7 §7.2` gezet en de
   schemabeschrijving is gecorrigeerd.
2. **Botsende codereeksen, deels door mij.** De poortcodes zijn omgenummerd naar prefixen die vóór
   deze ronde **0** treffers hadden: `G-01`…`G-12` → **`KP-01`…`KP-12`** · `X-01`…`X-03` →
   **`XP-01`…`XP-03`** · de desktopregels → **`DG-01`…`DG-03`** · de reviewervragen →
   **`RQ-01`…`RQ-07`**. Zonder die ingreep botsten zij met `G01`–`G24` (grammatica), `D-01`–`D-06`
   (deel D) en `R1`–`R8` (§1.8). De omnummering is in beide harnasbestanden en in heel `H7`
   doorgevoerd en daarna opnieuw gedraaid: zelftest 8/8, poort 120 uitkomsten, uitslagen identiek.

### 8.8 · Harnascommando's en hun uitkomst

```
node docs/qa/composition-gate.mjs --zelftest     8 toetsen, 0 FAIL
node docs/qa/bouw-register.mjs                   48 pagina's, 0 zonder meetstatus
node docs/qa/composition-gate.mjs                8 kaarten, 120 uitkomsten, 8 FAIL
node docs/qa/composition-gate.mjs --packet <k>   82 regels
node docs/qa/desktop-governance.mjs <basis> <p>  master 0 FAIL · B2-kandidaat 3 FAIL
```

---

## 9 · V1.3 — AFSLUITRONDE: DE LAATSTE VIER BLOKKADES (2 oktober)

Chirurgische ronde. Geen herontwerp, geen nieuwe governancelaag, geen V1.4.
Enige opdracht: `T-2`, `T-3`, `T-5` en `T-7` sluiten.

### 9.1 · Uitkomst per blokkade

| | wat het was | resolutie | status |
|---|---|---|---|
| **`T-2`** | twee rivaliserende reviewerlagen: `B-01`…`B-07` in het document (13 treffers) tegenover `RQ-01`…`RQ-07` in het harnas, met **andere** vragen | één canonieke laag. 4 oude criteria **opgenomen** in bestaande vragen, 2 **gepromoveerd** tot `RQ-08` (beeldgebondenheid, uit `B-03`) en `RQ-09` (leegte met eigenaar, uit `B-05`), 1 **SUPERSEDED** (`B-07`, gedekt door `A-03`, `VAR-01` en `KP-05`). Beide nieuwe vragen staan werkelijk in `docs/qa/composition-gate.mjs`. Gezagsorde als procedure met in- en uitgangen | **RESOLVED** · `§7.15` |
| **`T-3`** | 12 botsende codereeksen; gemeten **59** letterlijke codes met twee betekenissen, 58 binnen de normatieve laag | **191 geverifieerde regelvervangingen** in 2 documenten. Elke regeldragende reeks is uniek. De referentiekaart is nu **data**: `docs/data/vibe-rule-id-registry.json`, 70 reeksen | **RESOLVED** · `§7.17` |
| **`T-5`** | `VAR-07` (voorheen `C-07`) heet een poort en is er geen; drempels 0,40/0,30 **NIET GEMETEN** | poort **gesplitst**: `VAR-07a` (beeldbestand-uniciteit over paginagrenzen) wordt poort vanaf nu, `VAR-07b` wordt `IJK-0n`. Vijf drempels op `CALIBRATION PENDING`, elk met grootheid, meetmethode, eerste in aanmerking komende pagina, aanvaardbaar bewijs, reviewer en faalgedrag | **CALIBRATION PENDING** · `§7.16` |
| **`T-7`** | de twintigste tegenstrijdigheidsrij was niet geïdentificeerd | **uitkomst A.** De rij is `A-06` deel (b+c), gevonden als verschil van twee **uitgeschreven** lijsten in `scratchpad/v13/R4-tegenstrijdigheden.md:318` en `:349`, met status op `:352`. Het getal **20 was géén telfout**: `16 + 4 = 20` in beide tellingen | **RESOLVED** · `§7.18` |

### 9.2 · De oorzaak van `T-7` was `T-3`

De rijcode `A-06` botst in het levende document met de **poortcode** `A-06` (decoratieve geometrie,
`:4875`). Daardoor leverde `grep "A-06"` de poort op en niet de rij, en bleef de post drie ronden
onvindbaar. Een botsende code kost dus niet alleen leesbaarheid — **hij verbergt werk.** Dat is het
scherpste argument voor de opschoning.

### 9.3 · De vijftien hernoemingen

| van | naar | reden |
|---|---|---|
| `H1`–`H8` hoogteregels | `CAN-01`…`CAN-08` | botste met het hoofdstuknummer `H1`–`H7` **en** met HTML-kopniveaus; er bestaat geen tekenreekspatroon dat die drie scheidt, dus de **regel** wijkt |
| `M1`–`M5` (§1.2.6) | `GEO-01`…`GEO-05` | botste met de beeldbehandeling `M0`–`M6`, die in vier documenten staat en in het kaartschema is vastgedraaid |
| `M1`–`M3` (§4.1.5) | `GEO-06`…`GEO-08` | idem; regel 2752 draagt beide betekenissen in één cel — daar is **alleen de rij-ID** hernoemd |
| `M1`–`M5` (§7.9) | `GOV-01`…`GOV-05` | idem |
| `B1`–`B5` beeldmaten | `MED-01`…`MED-05` | botste met archetype `B1`–`B7` (514 treffers, `FROZEN`) |
| `C-01`–`C-07` poorten | `VAR-01`…`VAR-07` | botste met de `FROZEN` besluiten `C-01`…`C-07` in `brandbook §1A`, die bij elke tegenspraak winnen |
| `R0`–`R3` poortmomenten | `FAS-00`…`FAS-03` | `R1`–`R3` had drie normatieve betekenissen in één document |
| `K-1`–`K-12` / `K-1`–`K-11` | `CH1-01`… / `CH2-01`… | twee reeksen met dezelfde codes in één document |
| `Z1`–`Z5` (§4.2.5) | `TYP-01`…`TYP-05` | botste met `Z1`–`Z12` van de forensische zones |
| `F-1`/`-2`/`-4`/`-5` beeldfrequentie | `MFQ-01`/`-02`/`-04`/`-05` | botste met de lege-verzamelingregels `F-1`…`F-6` |
| `B1`–`B6` blokkades | `BLK-01`…`BLK-06` · `BLK-H1`…`BLK-H6` | botste met archetype `B1`–`B7` |
| `G-01`–`G-12` | `KP-01`…`KP-12` | botste met grammatica `G01`–`G24` en gootregels `G1`–`G4` |
| `X-01`–`X-03` | `XP-01`…`XP-03` | nieuwe reeks op een vrije prefix |
| `D-01`–`D-03` desktop | `DG-01`…`DG-03` | botste met de poorten DEEL D |
| `R-01`–`R-07` reviewervragen | `RQ-01`…`RQ-07` | botste met de reparatiepunten `R1`–`R8` |

**Methode, en waarom er niets blind is vervangen.** Vijf analyses leverden **geen** bestandswijzigingen
maar **regelvervangingen als data**: per edit het bestand, het regelnummer, de volledige originele regel
en de volledige nieuwe regel. `docs/qa/pas-edits-toe.mjs` weigert elke edit waarvan de originele regel
niet teken-voor-teken klopt, weigert twee verschillende vervangingen op dezelfde regel, en schrijft
**alles of niets**. Op zes regels wilden twee analyses elk een **ander deel** wijzigen; die zijn
token-voor-token samengevoegd in plaats van dat er één is gekozen. Van 200 aangeboden edits bleven er
na ontdubbeling 191 over; **191 toegepast, 0 geweigerd**.

**Regressiebewijs.** De poortuitvoer vóór en na de hernoeming is **byte-identiek**
(`3dd27c9305a4a6c0a2c8f48426c15515`). Geen verdictlogica is verschoven.

### 9.4 · Twee eigen fouten gecorrigeerd

1. **Telfout in `§5`.** Daar stond *"20 onopgeloste tegenstrijdigheden van de **60** substantieve rijen |
   **33** opgelost · 16 toegewezen · 4 open"*. Maar `33 + 16 + 4 = 53`, niet 60: het **totaal** was in een
   latere ronde naar 60 bijgewerkt, de **uitsplitsing** niet. `T3-consolidatie.md:188` geeft de juiste
   uitsplitsing **40 · 16 · 4 = 60**. Gecorrigeerd naar 40.
2. **Twee verzonnen codes.** De `T-2`-analyse stelde de nieuwe vragen voor als `RQ-14` en `R-09` —
   codes die het harnas nooit heeft gekend. Doorgenummerd naar `RQ-08` en `RQ-09` en werkelijk in
   `docs/qa/composition-gate.mjs` gezet, zodat zij geen voorstel meer zijn.

Daarnaast is `§7.14` van de vorige ronde gemarkeerd als **ACHTERHAALD DOOR `§7.17`**; zonder die banner
zou het document op twee plaatsen een ander aantal open tegenstrijdigheden noemen.

### 9.5 · De integriteitstoets

`docs/qa/id-integriteit.mjs` is **herschreven**. De eerste versie leidde uit markdown-opmaak af wat een
definitie was, en gaf daardoor 92 valse duplicaten (archetype `B2` in vijf documenten is correcte
kruisverwijzing) en 160 valse bungelaars (een tabelrij zonder vette code). De vraag *"is dit een
definitie"* is een **oordeel** en hoort in data. Het register is nu de bron van waarheid.

```
TOTAL RULE IDS           624
UNIQUE RULE IDS          624
REFERENCES CHECKED       12348
DUPLICATE IDS              0
DANGLING REFERENCES        0
AMBIGUOUS REFERENCES       0
HARNESS REFS RESOLVED    196 van 196
```

### 9.6 · Eindstand

**INTERNE TEGENSTRIJDIGHEDEN OPEN = 0.** Het canonieke register staat in `§7.17`: 44 `RESOLVED`,
9 `SUPERSEDED`, 5 `CALIBRATION PENDING`, 11 secties `CONTENT PENDING`, 1 slot `ASSET PENDING`.

Eén post blijft `USER DECISION REQUIRED`: **`UD-2`** = `A-06` deel (b+c), de typografiehelft van
`brandbook §1A.6` punt 2. Hij is **niet** gefabriceerd om een getal te redden — hij is de rij die `T-7`
zocht — en hij blokkeert de freeze niet, omdat het stelsel vandaag een eenduidig antwoord heeft: zolang
de clausule `FROZEN` is, wint zij. Wat openstaat is of de eigenaar haar laat wijken.

Productie onaangeroerd: beide vingerafdrukken vóór en na gelijk.
