> **STATUS V1.3 — BEWIJSBIJLAGE, NIET NORMATIEF.**
> Dit document is V1.2. Zijn forensische metingen blijven geldig als BEWIJS; zijn regels en
> poorten zijn **niet aanvaard** en zijn vervangen door `docs/04-visual-language-v1.3.md`.
> Zie `docs/00-changelog.md` §3 voor de reden en §4 voor de twee intrekkingen.

# VIBE SECTION BLUEPRINTS

**DESIGN SYSTEM V1.2 — VISUELE TAAL, LAAG ONDER DE COMPOSITIEFAMILIES**

| | |
|---|---|
| **Status** | `V1.2 — ADDITIEF`. V1.0 blijft `FROZEN`, V1.1 (`vibe-section-compositions-v1.md`) blijft geldig en wordt hier **niet** gewijzigd. |
| **Wat dit document toevoegt** | Vijftien **sectieblauwdrukken** `B01`–`B15` onder de twaalf compositiefamilies `C1`–`C12`. Een familie zegt *welke rangschikking*; een blauwdruk zegt *met welke maten, welke beeldbehandeling, welke kaartfamilie, hoeveel inhoud en welke overlap*. |
| **Bron van waarheid** | Homepage Master v1, commit `aae26bf`. `index.html` + `home*.css` in de werkboom zijn byte-identiek aan die commit (aangeleverd bewijs; `git diff` is in deze sessie **niet** gedraaid). |
| **Meetbreedte** | 1774px primair, met controlemetingen op 1440px en 1199px. |
| **Zelf gemeten in deze sessie** | `meet.mjs` → rechthoeken (x1/x2/w/yrel/h/z/position) van elk `.vh-*`-element, `img` en `svg` per sectie op 1774, 1440 en 1199px · `woorden.mjs` → woord- en regeltelling per tekstblok op 1774px · `typo.mjs` → graad, regelafstand, tracking en gewicht per tekstblok plus de dichtheid per sectie (`a` / `img` / `svg` / `br` / koppen) · visuele inspectie van alle negen sectieafdrukken. |
| **Overgenomen bewijs** | `home-forensics.json` (overlapparen, tekstspan, hoeken, ratio's) en de forensicsnotitie bij V1.2. Waar een getal daarvandaan komt staat **(json)** erbij. |
| **Wijzigingen aan productiecode** | **geen.** Er is uitsluitend dit ene bestand onder `docs/` aangemaakt. Voorstellen staan in §8 als besluit, nooit als uitgevoerde wijziging. |

**De laag in het systeem:**

```
TOKENS -> PRIMITIVES -> COMPONENTS -> SECTION COMPOSITIONS (C1..C12) -> SECTION BLUEPRINTS (B01..B15) -> PAGE ARCHETYPES
                                                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                                        dit document
```

---

## §1 · Waarom deze laag erbij komt

`C1`–`C12` beschrijven de rangschikking op het niveau "redactiekolom links, mozaïek rechts". Twee ontwikkelaars die daar onafhankelijk mee bouwen komen niet op herkenbaar verwant werk uit, omdat de familie geen enkel getal verplicht stelt: geen kolomverhouding, geen beeldbreedte, geen overlapwaarde, geen inhoudsplafond. Een blauwdruk vult precies dat in.

**Gemeten verschil tussen een ontworpen en een generieke pagina** (1774px, homepage tegenover de B2-kandidaat `systeem-energieopslag.html`, json):

| Meting | Homepage Master v1 | B2-kandidaat |
|---|---|---|
| Overlappende elementparen per sectie | 158 · 64 · 42 · 19 · 57 · 19 · 50 · 43 · 2 = **454** | 17 · 0 · 0 · 2 · 1 · 11 · 2 · 0 · 0 · 17 · 2 = **50** |
| Secties met **nul** overlap | **0 van 9** | **5 van 11** |
| Secties met een informatievlak **op** een zichtbaar beeld | **6 van 9** | **0 van 11** |
| Beelden ≥ 50% van de viewportbreedte | **5 van 8** | **1 van 7** |
| Tekstspan, mediaan | **1606px = 90,5%** | **1080px = 60,9%** |

De scheidslijn is één eigenschap: **de homepage legt kaarten, stroken en panelen ÓP beelden; de B2-kandidaat zet beelden NÁÁST tekst in een rastercel.** Elke blauwdruk hieronder legt vast waar dat ene mechanisme zit, met welke maat, en wanneer het niet mag.

### 1.1 Wat een blauwdruk wél en niet vastlegt

**Wel:** rasterverhouding, beeldbreedte in px en in % van de viewport, beeldbehandeling (M-code), kaartfamilie (K-code), hoekwaarde, overlapwaarde in px, inhoudsplafond in woorden en items, CTA-positie, impactniveau, de collapse op 1199px, en per blauwdruk drie tot vijf **toetsen** die een reviewer kan narekenen.

**Niet:** copy, kleurwaarden, componentanatomie, tokens. Die komen uit V1.0. Ook niet: de exacte clip-percentages. Een percentage is doosgebonden — `vibe-section-compositions-v1.md §3.5` legt al vast dat wie de merkhoek in een nieuwe doos wil, het percentage **uitrekent** uit de doosverhouding. Blauwdrukken noteren daarom de **hoek in graden**, niet het percentage.

### 1.2 Hoe je de wireframes leest

```
x70 .. x1708      absolute x-posities op een viewport van 1774px, gemeten
[ BLOK 474 ]      een blok met zijn gemeten breedte in px
|<- 207,6 ->|     gemeten tussenruimte
\_ 33,7 graden    gemeten hoek vanaf de verticaal
>> 55,8           gemeten overschrijding van een rand
yrel 143,7        y vanaf de sectietop, niet vanaf de paginatop
```

Alle maten in de wireframes zijn metingen op 1774px uit deze sessie, tenzij er **BEREKEND** bij staat. Dat laatste geldt uitsluitend voor de posities in de vier varianten `B12`–`B15`; hun afmetingen zijn wél gemeten, alleen hun plaatsing is uit een gemeten waarde afgeleid (spiegeling `x' = 1774 − x`, of overname van een gemeten blokmaat op een andere ondergrond).

---

## §2 · Vaste taxonomie

Deze codes worden in elke blauwdruk gebruikt. Er komen er geen bij.

### 2.1 Beeldbehandelingen

| Code | Behandeling | Kerneigenschap, gemeten | Bronsectie |
|---|---|---|---|
| **M1 PODIUM** | het beeld **is** het sectiecanvas; de tekst staat in een vorm die eruit gesneden is | 1774 × 748, 100% vw, randvast links én rechts, clip 32,8/34,4° | S1 |
| **M2 PANEEL** | het beeld is een paneel dat tot één schermrand doorloopt; een scrim draagt de tekst | 1704 × 565, 96,1% vw, radius 63/0/0/63 | S3 |
| **M3 DRAAGVLAK** | beeld van 40–62% breed waar informatievlakken **op** liggen | 734,4 × 557 (41,4%) en 1100 × 736,2 (62%), snede 13° resp. 9,7° | S6, S7 |
| **M4 BAND** | brede liggende strook op een diagonale ondergrond; een kaart kruist de rand | 956,4 × 293,5, ratio 3,26, backdrop 33,7° | S4 |
| **M5 KAARTBEELD** | beeld binnen een donkere kaart, tot de kaartranden; kaarten **ongelijk** van breedte | 487/302/292 × 498 en 353/355 × 230 | S2 |
| **M6 HOEKBEELD** | beeld vast aan één schermrand, gesneden op de merkhoek; een kaart over de binnenrand | 934,7 × 631 (35,4/32,7°) en 350,1 × 525,5 (31,6/28,1°) | S8, S9 |
| **M0 GEEN FOTO** | gebouwd object in plaats van een foto | gemeten 0 `img`-elementen in S5, tegenover 1 tot 5 in elke andere sectie | S5 |

### 2.2 Kaartfamilies

| Code | Familie | Kerneigenschap, gemeten | Bronsectie |
|---|---|---|---|
| **K1 MEDIAKAART** | donker, foto tot de kaartrand, ronde pijlknop | r10, pijl 46 op de hoofdkaart tegen 38/39 op de rest | S2 |
| **K2 ZWEVEND INFOVLAK** | wit, ligt over een beeldrand heen | 337,6 × 253,7 (r11,7) · 448 × 374 (r16) · 304,5 × 272,5 (r13,5) | S4, S6, S8 |
| **K3 STROOK** | donker, horizontaal, met duimnagel, over een beeldhoek | 629 × 124, r20 — de grootste kaartradius van de pagina | S6 |
| **K4 REGISTERKAART** | wit, icoon + twee regels, verticale stapel **op** een beeld | 4 × 422 × 126, r14, steek 141,3 | S7 |
| **K5 LOGOKAART** | wit, klein, naam + ondertitel | 281,3 × 80,7 en 189,4 × 80,7 — ongelijk, contentgedreven | S6 |
| **K6 APPARAATVLAK** | donker met chrome, gebouwd object, onderling overlappend | 687,1 × 428,7 (r13) en 151,3 × 308 (r18,7), overlap 27,4 | S5 |
| **K7 BEWIJSBAND** | geen kaart: rij met 1px scheidingslijnen | 3 × 580 (gelijk) en 110,1/130,9/139,1 (contentgedreven) | S1, S3 |
| **K8 ICOONREGEL** | geen vlak: icoon + label + regel direct op het canvas | 4 × 292,1 (steek 430,6) · 4 × 181,5 · 3 × 567,7 | S4, S5, S7, S8 |

---

## §3 · Overzicht van de vijftien blauwdrukken

Negen secties leveren elf blauwdrukken (S4 en S6 dragen er elk twee, zoals V1.1 al vaststelt). Vier blauwdrukken zijn **varianten**: twee spiegelingen en twee uitvoeringen zonder foto of zonder beeld.

| # | Blauwdruk | Familie | Bron | M | K | Impact | Beeld % vw | Overlapparen (json) | Tekstspan (json) |
|---|---|---|---|---|---|---|---:|---:|---:|
| **B01** | Podiumopening | C1 | S1 | M1 | K7 | HIGH | 100 | 158 | 1619 |
| **B02** | Redactiekolom + ongelijk mozaïek | C2 | S2 | M5 | K1 · K8 | MEDIUM | 27,5 (grootste kaart) | 64 | 1606 |
| **B03** | Randpaneel | C3 | S3 | M2 | K7 | HIGH | 96,1 | 42 | 470 |
| **B04** | Band met kruisende kaart | C4 | S4-boven | M4 | K2 | MEDIUM | 53,9 | 19 (hele sectie) | 1671 |
| **B05** | Voortgangsrij zonder vlak | C5 | S4-onder | M0 | K8 | QUIET | — | 19 (hele sectie) | 1671 |
| **B06** | Gespiegeld gebouwd object | C6 | S5 | M0 | K6 · K8 | MEDIUM | — (object 45,7) | 57 | 1491 |
| **B07** | Bewijsband met leeg midden | C7 | S6-A | M0 | K5 | QUIET | — | 19 (hele sectie) | 1620 |
| **B08** | Verhaal op draagvlak | C8 | S6-B | M3 | K2 · K3 | MEDIUM | 41,4 | 19 (hele sectie) | 1620 |
| **B09** | Kaartkolom op draagvlak | C9 | S7 | M3 | K4 · K8 | MEDIUM | 62,0 | 50 | 1593 |
| **B10** | Chevronslot | C10 | S8 | M6 | K2 · K8 | HIGH | 52,7 | 43 | 1244 |
| **B11** | Voetbeeld in de hoek | C11 | S9 | M6 | — | QUIET | 19,7 | 2 | 1610 |
| **B12** | Spiegelband | C4 | variant op B04 | M4 | K2 | MEDIUM | 53,9 | BEREKEND | — |
| **B13** | Kaartkolom zonder foto | C9 | variant op B09 | M0 | K4 · K8 | MEDIUM | — | BEREKEND | — |
| **B14** | Paneel aan de linkerrand | C3 | variant op B03 | M2 | K7 | HIGH | 96,1 | BEREKEND | — |
| **B15** | Bewijsregel zonder vlak | C7 | variant op B01/B03 | M0 | K7 | QUIET | — | BEREKEND | — |

**Gemeten dichtheid per sectie (deze sessie, S1…S9):** links `19 · 7 · 2 · 0 · 7 · 5 · 6 · 3 · 23` · `img` `1 · 5 · 1 · 1 · 0 · 2 · 1 · 1 · 1` · `svg` `9 · 16 · 3 · 8 · 24 · 3 · 13 · 7 · 9` · koppen `1 · 7 · 1 · 6 · 2 · 2 · 1 · 1 · 0`. Daaruit volgen vier harde eigenschappen die in de blauwdrukken terugkomen: B03 draagt **2** links, B04+B05 draagt er **0**, B06 draagt **0** `img`, B11 draagt **0** koppen.

**Gemeten kopgraden (deze sessie):** 76,46 · 61,5 · 58,32 · 64,04 · 54 · 53 (en 47 als tweede kop) · 61 · 66 · — . Acht koppen, acht graden; de footer heeft er geen.

**Gemeten sectieposities op 1774px (deze sessie):** sectietops 0 · 908 · 1797 · 2562 · 3160 · 3749 · 4636 · 5523 · 6154; hoogtes 908 · 889 · 765 · 599 · 588 · 887 · 887 · 631 · 631. Zie **DR-V-B7**: de aangeleverde forensics meet sectie 4 op 624px en schuift daardoor alles eronder 25–26px op. De **x**-maten van beide metingen vallen samen tot op 0,1px; alleen de hoogte van de stappenrij verschilt.

---

## §4 · De blauwdrukken

### B01 · PODIUMOPENING — `C1` · M1 PODIUM · K7 BEWIJSBAND · HIGH

```
x0                                                                               x1774
+--- header IN het podium: yrel 0..84, z10, logo x83, CTA x1475..1702 ------------+
|                                        \ diagonaal 32,8 graden vanaf (997, 0)   |
| [ COPY 504 = 28,4% vw ] x83..587        \                                       |
|   eyebrow 16,4 / 5 woorden / 2 regels    \   M1 PODIUM — foto 1774 x 748        |
|   H1 76,5 / 5 woorden / 3 regels / 2 br   \  100% vw, 82,4% sectiehoogte        |
|   lead 460 breed / 15 woorden / 3 regels   \ object-fit cover, inset 0          |
|   [ knop 228x62 ] [ knop 251x64 ]           \__ knik (624, 545)                 |
|                                             /                                   |
|        454 px leeg tussen lead en diagonaal/ 34,4 graden  [ NAVY-TEKST 312,2 ]  |
|                                           /               x1368..1680 op de SVG |
+--------------------------------------------------------------------------------+ yrel 748
| K7 BEWIJSBAND — 1740 breed (x17..1757), 3 cellen van 580 (33,3% elk),           |
| 1px lijnen 69 hoog, icoon 49,2, getal 28, label 16; bandhoogte 160              |
+--------------------------------------------------------------------------------+ yrel 908
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie** | Beeld → H1 → lead → knoppen → bewijsband. Beeld : tekst = 1774 : 504 = **3,5 : 1**. De H1 is met 76,5px de grootste letter van de pagina; de drie bewijscellen zijn de enige gelijkverdeelde rij in de bovenste helft. |
| **Raster** | **Geen kolommenraster.** Alles absoluut binnen één podium met vaste verhouding (`aspect-ratio: 1774/748`, `home-hero.css:38`). Het enige raster is de bewijsband: `repeat(3, 1fr)` over 1740px (`home-hero.css:340`). |
| **Dominant element** | Het beeld — 100% vw × 82,4% sectiehoogte. |
| **Beeldbehandeling** | **M1 PODIUM.** Eén foto op `inset:0`, geklipt tot twee vrije randen van 32,8° en 34,4° met een knik op (624, 545) (`home-hero.css:57-64`). `loading="eager"`, LCP-beeld. Scrim 255° in drie stops (`home-hero.css:81`). |
| **Kaartbehandeling** | **Geen kaart in het podium.** Drie knopvlakken (227×63 header, 228×62 primair, 251×64 secundair), alle r10. Bewijs = **K7**, buiten het podium. |
| **Geometrie** | **Vier gestapelde middelen** — fotosnede, lichtband op exact dezelfde helling (`home-hero.css:92-97`), SVG-accentwig 35,8°, SVG-navyvorm met de enige ronde knik van de pagina (`index.html:120-121`), plus de uitdoofwig. Dit is het **maximum** van het systeem en alleen toegestaan in de pagina-opening. |
| **Overlap** | **158 overlapparen (json) — het hoogste van de pagina.** Zeven gepositioneerde niveaus, z 1·2·3·4·10·11·11. Nul negatieve marges op desktop. |
| **Inhoudsgrenzen** | eyebrow ≤ **5 woorden** / 2 regels · H1 ≤ **5 woorden** / 3 regels / 2 handgezette `<br>` · lead ≤ **15 woorden** / 3 regels op ≤ 460px · **2** knoppen · **exact 3** bewijscellen van ≤ 5 woorden (getal) + ≤ 4 woorden (label) · **0 koppen** onder de H1 binnen het podium · optioneel één tweede tekstblok van ≤ 1 woord-kop + 4 labels op een **getekend** vlak, nooit op fotopixels. |
| **CTA-positie** | Twee knoppen in de copykolom op yrel 614,6, 34px onder de lead. Plus één header-CTA rechtsboven. Nooit sticky (C-04). |
| **Ideaal impactniveau** | **HIGH.** Eén van de maximaal drie per pagina, altijd de eerste sectie. |
| **Responsieve transformatie** | Gemeten op 1199px: `aspect-ratio` vervalt (`home-hero.css:400`), de copy komt bovenaan (yrel 124..484,9) en het beeld eronder (1103 × 360, yrel 514,9..874,9). Band, SVG-geometrie, uitdoofwig en het tweede tekstblok zijn **niet meer in de DOM-meting aanwezig**; de header wordt 77px hoog met een menuknop van 52×44. Sectiehoogte 1078 tegen 908 op desktop. |
| **Pagina-archetypes** | B1 (bestaand, niet herbouwen) · B2 alle varianten · B3 · B4 · B5. **Niet** B6 (een LCP-beeld doet niets op een formulierpagina) · **niet** B7 · **niet** S2. |
| **Inhoudstypes** | De propositie van een pagina in één zin, met drie harde bewijsregels eronder. Niet: een opsomming, niet: een productlijst. |
| **Antipatronen** | Een tekstkolom breder dan 30% vw naast het beeld (hier 28,4%) · een tweede kop onder de H1 binnen het podium · een afgeronde foto in een container van ~1280px: dat levert gemeten 0–5 overlapparen en een beeld van ~40% vw op, precies de B2-toestand (44,2% vw, 17 overlapparen) · bewijscellen met ongelijke breedte (dit is de enige blauwdruk waar gelijkheid de regel is). |
| **Toets** | (1) beeld = 100% vw en raakt beide schermranden; (2) ≥ 100 overlapparen in de sectie; (3) de drie bewijscellen zijn exact gelijk (33,3% elk, afwijking < 1px); (4) tussen de rechterrand van de lead en de diagonaal ligt ≥ 400px leeg; (5) de band eindigt op dezelfde achtergrondwaarde als de volgende sectie (gemeten `#FDFDFE` → `#FCFDFE`). |

---

### B02 · REDACTIEKOLOM + ONGELIJK MOZAÏEK — `C2` · M5 KAARTBEELD · K1 + K8 · MEDIUM

```
x70                       x576                                                  x1709
|<--- COPY 506 (30,9%) --->|<--------------- MOZAIEK 1133 (69,1%) --------------->|
  eyebrow 1 woord          | [ 487 x 498 ]  26 [ 302 x 498 ] 26 [ 292 x 498 ]     | rij 1
  H2 61,5 / 5 w / 3 regels | K1 MEDIAKAART, M5: foto tot alle vier de kaartranden |  h 498
  lead 400 breed / 18 w    | icoon 44 / pijl 46 |  icoon 40 / pijl 38 (de andere 5)|
  [ CTA 284 x 63 ]         |------------------- rijafstand 23 --------------------|
  1px scheidingslijn       | [ 371 x 230 ]  26 [ 353 x 230 ] 26 [ 355 x 230 ]     | rij 2
  K8 ICOONREGEL x3         |   naad x973           naad x1351,9                   |  h 230
  (506 x 45, steek 79,5)   \___ naden verspringen 116 en 65,1 px t.o.v. rij 1
                           \___ kaart 1 is 1,61x zo breed als kaart 2; rij 1 is 2,17x zo hoog
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie** | Eén hoofdkaart (487 × 498 = 24,2% van het sectievlak) → vijf nevenkaarten → redactiekolom. Beeld : tekst = 1133 : 506 = **2,24 : 1**. De hoofdkaart heeft als enige een eigen typografische graad — gemeten kop 27px tegen 18px en onderregel 19px tegen 17px op de vijf andere kaarten — plus als enige een statistiekbalk. |
| **Raster** | Hoofdverdeling `28.5231cqw 63.8670cqw` = 506 \| 1133 **zonder gap** (`home-solutions.css:28`). Bovenrij `27.4521/17.0237/16.4600cqw` (`:128`), onderrij `20.9132/19.8985/20.0113cqw` (`:141`). **Twee rijen, twee verschillende verdelingen** — de verticale naden verspringen gemeten 116 en 65,1px. |
| **Dominant element** | De zonnepaneelkaart, 487 × 498. |
| **Beeldbehandeling** | **M5 KAARTBEELD.** Vijf foto's op `inset:0` met `object-fit:cover` binnen hun kaart; de 10px radius komt van de kaart. Geen masker, geen diagonaal in het beeld, geen randcontact. Het leesbaarheidsverloop is **per rij** anders ingesteld (`home-solutions.css:176-198`). De zesde kaart heeft geen foto en krijgt een **getekend** vlak van 25° (`home-solutions.css:306-320`). |
| **Kaartbehandeling** | **K1 × 6** (r10, schaduw `rgba(23,84,150,.10) 0 9,93 25,90`), **K8 × 3** in de kolom (506 × 45, icoonkolom 40, kolomafstand 45, rijafstand 79,5). |
| **Geometrie** | **Eén** middel, en alleen op de kaart zónder foto (25°). De sectie zelf is ongesneden. |
| **Overlap** | 64 overlapparen (json), **alle binnen een kaart**: beeld z0 → verloop z1 → inhoud z2 → pijl z3. **Dit is de enige beeldblauwdruk zonder informatievlak op een beeld** — de tekst zit ín de kaart. |
| **Inhoudsgrenzen** | **4 tot 6 kaarten**, nooit 3 (dan is het een raster met een gat) en nooit meer dan 6. Per kaart: 1 icoon + kop van **4–7 woorden** (gemeten 6/4/6/5/7/4) over ≤ 2 regels + pijl. Kolom: eyebrow ≤ 1 woord · H2 ≤ 5 woorden / 3 regels · lead ≤ **18 woorden** op ≤ 400px (5 regels — de langste lead van de pagina) · 1 CTA · ≤ 3 icoonregels van 3–4 woorden. |
| **CTA-positie** | Eén knop in de redactiekolom (284 × 63, yrel 500,7). Elke kaart is zelf een link met pijlknop: boven-rechts in rij 1, onder-rechts in rij 2. Geen tweede knop in het mozaïek. |
| **Ideaal impactniveau** | **MEDIUM.** |
| **Responsieve transformatie** | Gemeten op 1199px: het mozaïek wordt 1103 breed met drie kolommen van 355,7 (`home-solutions.css:492`) en kaarthoogte 330; de kolom gaat erboven. De ongelijke verdeling is dus een **desktopeigenschap**; onder 1200px is de rij gelijk. |
| **Pagina-archetypes** | B1 · B2 *Systeem* en *Oplossing* · B4 (uitgelichte case als hoofdtegel) · B5. |
| **Inhoudstypes** | Bestemmingen, modules, productgroepen. Niet: een volgorde (dat is B05), niet: bewijs (dat is B07/B15). |
| **Antipatronen** | Twee rijen met dezelfde kolomverdeling (dan is het een raster, geen mozaïek) · alle zes kaarten op dezelfde typografische graad · een witte kaart met een foto erin in plaats van een foto tot de kaartrand · een plaatshouder waar een foto ontbreekt, in plaats van een getekend vlak · drie kolommen met een onderling maatverschil onder 1% (gemeten in de B2-kandidaat: 246 / 255 / 252px = 0,8%). |
| **Toets** | (1) de breedste kaart is ≥ 1,5× de smalste van zijn rij (gemeten 1,61); (2) de twee rijen verschillen ≥ 50px in minstens één verticale naad (gemeten 116 en 65,1); (3) rijhoogtes verschillen ≥ factor 2 (gemeten 2,17); (4) exact één kaart heeft een eigen graad; (5) elk beeld raakt alle vier de randen van zijn kaart. |

---

### B03 · RANDPANEEL — `C3` · M2 PANEEL · K7 BEWIJSBAND · HIGH

```
x0    x70                                                                        x1774
|     |========== M2 PANEEL 1704 x 565 (96,1% vw, ratio 3,02) ====================|
| 100 | radius 63 / 0 / 0 / 63 — de enige eenzijdige radius van de pagina         |
| px  |  <- 80,4 ->                                                               |
| wit | [ COPY 461,7 ]                                                            |
|     |   eyebrow 4 woorden                      scrim 90 graden: massief op de   |
|     |   H2 58,3 / 2 woorden / 1 regel          eerste 20%, transparant op 70%   |
|     |   statement 40,11 / gewicht 400 / 4 woorden                               |
|     |   body 19 woorden / 3 regels                                              |
|     |   K7: 110,1 | 1px | 130,9 | 1px | 139,1  — contentgedreven ongelijk       |
|     |   [ knop 234,5 x 65,5 ] [ link 160,1 ]        SVG-wig 35,9 graden ------> \|
|     |===========================================================================|
| 100 px wit onder het paneel (home-project.css:23)                                |
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie** | Paneel → titel → statement in gewicht 400 → body → drie metrieken → twee acties. Beeld : tekst = 1704 : 461,7 = **3,69 : 1**. Vijf niveaus in één kolom; de tekstspan van 470px (json) is de smalste van de pagina. |
| **Raster** | **Geen raster.** Eén paneel met `aspect-ratio: 1704/565` (`home-project.css:50`) en een absoluut geplaatste tekstkolom op `left: 4.5318cqw` = gemeten 80,4px vanaf de paneelrand. De rasterbreuk is het paneel zelf: het staat links op de containermarge van 70px en negeert de rechtermarge volledig. |
| **Dominant element** | Het paneel — 96,1% vw × 73,9% sectiehoogte. |
| **Beeldbehandeling** | **M2 PANEEL.** De foto **is** het paneel (`inset:0`, `object-position: 54% 62%`). Geen masker; de vorm komt volledig van de radius `3.5507cqw 0 0 3.5507cqw` = 63/0/0/63 (`home-project.css:52`). Tweetraps scrim vanaf de leeskant (`home-project.css:74-82`); de tekst staat in de donkerste 20%. |
| **Kaartbehandeling** | **Geen zwevende kaart.** Het paneel is het object. Bewijs = **K7**, ín het beeld: drie metrieken van 110,1 / 130,9 / 139,1 met 1px lijnen — **contentgedreven ongelijk**, de tegenhanger van de gelijke band in B01. |
| **Geometrie** | Inline SVG in paneelcoördinaten 2056 × 682 met `preserveAspectRatio="none"` (`index.html:478-492`), zodat de punten op elke schaal blijven staan: topvlak, blauwe wig van 35,9° en een 2,6px lichtrand. **Geen `clip-path` in dit bestand.** |
| **Overlap** | 42 overlapparen (json), vier niveaus: foto z0 → scrim z1 → SVG z2 → copy z3. De knop ligt voor 100% op het beeld. |
| **Inhoudsgrenzen** | eyebrow ≤ 4 woorden · titel ≤ **2 woorden / 1 regel** (de enige kop van de pagina zonder `<br>` en zonder accentkleur) · optioneel één statement van ≤ 4 woorden in gewicht 400 · body ≤ **19 woorden** / 3 regels · **exact 3** metrieken van ≤ 2 woorden · 1 knop + 1 tekstlink. **Eén onderwerp per paneel.** |
| **CTA-positie** | Onderin de copykolom, volledig op het beeld: knop 234,5 × 65,5 plus tekstlink. Gemeten 2 `<a>` in de hele sectie — de laagste linkdichtheid van de pagina, en dat is het punt. |
| **Ideaal impactniveau** | **HIGH.** |
| **Responsieve transformatie** | Gemeten op 1199px: het paneel wordt 1199 × 803,5, dus volle breedte met radius 0 (`home-project.css:228`); de copy komt onder de foto met de gemeten negatieve marge van 26px (`home-project.css:260`). De desktoplaag wordt een negatieve marge, geen verdwenen laag. |
| **Pagina-archetypes** | B1 · B2 *Oplossing* en *Sector* · B3 (de case zelf) · B4 (uitgelichte case bovenaan). |
| **Inhoudstypes** | Eén project, één systeem, één case — met drie onderbouwde cijfers. Zonder eigen beeld en zonder drie cijfers bestaat deze blauwdruk niet. |
| **Antipatronen** | Twee onderwerpen in één paneel · een geleend beeld (dan is het paneel een claim zonder dekking) · radius aan alle vier de hoeken (de eenzijdige radius is het vormbesluit) · de cijfers in drie witte tegels ónder het paneel in plaats van als lijnenband erín · een donker paneel dat de sectienaad raakt (gemeten 100px wit boven én onder). |
| **Toets** | (1) het paneel raakt exact één schermrand en heeft radius 0 aan die zijde; (2) tekstkolom ≤ 30% van de paneelbreedte (gemeten 461,7 / 1704 = 27,1%); (3) exact drie metrieken, gescheiden door 1px; (4) ≥ 100px papier boven en onder het paneel; (5) de tekst staat volledig binnen het massieve deel van de scrim. |

---

### B04 · BAND MET KRUISENDE KAART — `C4` · M4 BAND · K2 ZWEVEND INFOVLAK · MEDIUM

```
x70              x544        x751,6                                      x1708   x1763,8
|<-- COPY 474 -->|<- 207,6 ->|========= M4 BAND 956,4 x 293,5 (53,9% vw) =======|      |
  eyebrow 4 w                 ratio 3,26 / radius 14 / GEEN scrim                |      |
  H2 64,04 / 4 w / 2 regels                   [ K2 ZWEVEND INFOVLAK 337,6x253,7 ]      |
  lh/graad 1,13 (enige kop > 1,0)              yrel 121,6..375,3                 >> 55,8
  lead 23,6 / 11 w / 2 regels                  83,5% van de kaart ligt op de foto|      |
                                               8,1 px onder de onderrand -------->      |
 \_ backdrop 1774 x 355,4 op z0, clip 42,30%/28,92% = 33,7 graden, yrel 24,6..380
    loopt 49 px boven en 13 px onder het beeld uit; de diagonaal zit in de ONDERGROND
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie** | Kop → lead → beeld → kaart. Beeld : tekst = 956,4 : 474 = **2,02 : 1**. De lead is met 23,62px de grootste van de pagina; de kop heeft als enige van de acht koppen een regelafstand groter dan de graad (gemeten lh/graad 1,13 tegenover 0,95–1,00 elders). |
| **Raster** | **Geen gedeclareerd raster**; twee absolute zones met 207,6px ertussen. De rasterbreuk is de kaart: hij steekt **55,8px voorbij de rechterrand van de foto en 8,1px onder de onderrand**, en eindigt op 10,2px van de schermrand. |
| **Dominant element** | Het beeld — 53,9% vw, 47% sectiehoogte. |
| **Beeldbehandeling** | **M4 BAND.** Ratio 3,26, radius 14 (`home-process.css:97`), `object-position: 50% 52%`, geen masker, geen randcontact (66px van de rechterrand). **Geen scrim** — wat erop ligt is dekkend. De diagonaal zit niet in het beeld maar in de ondergrond (`home-process.css:43`, gemeten 33,7°). |
| **Kaartbehandeling** | **K2 × 1.** 337,6 × 253,7, r11,7, wit, dubbele schaduw (`home-process.css:122`), icoonvak 35,1. Precies één kaart; twee of meer maakt er B09 van. |
| **Geometrie** | **Eén** middel, structureel: de diagonale backdrop. Hij snijdt het beeld niet maar draagt het, en loopt rechts de schermrand uit. Richting gelijk aan de hero-diagonaal. |
| **Overlap** | De sectie meet 19 overlapparen (json) — samen met S6 het laagste van de acht beeldsecties. De enige cross-element-overlap op desktop is kaart × foto. |
| **Inhoudsgrenzen** | eyebrow ≤ 4 woorden · H2 ≤ **4 woorden** / 2 regels · lead ≤ **11 woorden** / 2 regels op ≤ 474px · kaart: 1 icoon (vak 35,1) + **≤ 17 woorden in totaal** (gemeten 17: kop van 19,9px over 2 regels plus 3 regels van 15,29px). De kaart is een accent, geen tweede sectie. |
| **CTA-positie** | **Geen.** Deze blauwdruk mag zonder uitgang bestaan; in Master v1 heeft de hele sectie nul `<a>`. Op een conversiepagina: zie DR-C-07 in V1.1. |
| **Ideaal impactniveau** | **MEDIUM** als los blok; samen met B05 eronder leest de sectie QUIET (gemeten: kortste sectie, nul links, geen donker vlak). |
| **Responsieve transformatie** | Gemeten op 1199px: beeld 1103 × 320 (yrel 228,6..548,6), kaart 456 × 170 op yrel 522,6 — **de kaart overlapt de foto nog steeds, met gemeten 26,0px** (`home-process.css:235`). Op 1440px steekt de kaart 45,3px voorbij de fotorand tegen 55,8px op 1774px: verhouding 0,812, exact de schaalfactor 1440/1774 = 0,8117. |
| **Pagina-archetypes** | B2 alle varianten · B3 · B4 · B5. Dit is de werkfamilie voor gewone inhoudelijke secties. |
| **Inhoudstypes** | Een mechanisme, een werkwijze, een belofte met één onderbouwing ernaast. |
| **Antipatronen** | De kaart zonder gedeelde maat "ergens op" het beeld leggen · méér dan één kaart (dat is B09) · een scrim toevoegen terwijl er alleen dekkende inhoud op ligt · dezelfde tweedeling op dezelfde as als de vorige sectie · een tweedeling tussen 46/54 en 54/46 (gemeten zes keer op rij in de B2-kandidaat). |
| **Toets** | (1) de kaart kruist de beeldrand met een **gemeten** waarde (hier 55,8 / 8,1) óf deelt een rand op de pixel — niet iets ertussenin; (2) ≥ 80% van de kaartbreedte ligt op het beeld (gemeten 83,5%); (3) de diagonaal ligt in de ondergrond, niet in het beeld; (4) beeldratio ≥ 3,0 (gemeten 3,26); (5) de kaart blijft ≥ 10px van de schermrand (gemeten 10,2). |

---

### B05 · VOORTGANGSRIJ ZONDER VLAK — `C5` · M0 · K8 ICOONREGEL · QUIET

```
x94                x524,6              x955,3              x1385,9            x1678
|<------------------------ STAPPENRIJ 1584 (89,3% vw) --------------------------->|
[ stap 292,1 ]  >   [ stap 292,1 ]  >   [ stap 292,1 ]  >   [ stap 292,1 ]
 icoon 48            steek 430,6         steek 430,7         steek 430,6
 badge 36,2 x 35,1 met volgnummer / kop / 2 regels / 9 tot 11 woorden / h 128,7
 chevron #B9C7D8 tussen de stappen — iconografie, geen geometrie
|<-------------- leegte-element 1774 x 56,9, aria-hidden (index.html:609) --------->|
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie** | Vlak. Vier gelijke stappen, geen hoofdstap. De graadval binnen de sectie loopt van de H2 van B04 (gemeten 64,04px) via de stapkop (18,7) en de staptekst (15,33) naar de badge (14,19) — een val van factor 4,5 binnen één sectie. |
| **Raster** | Eén rij die de tekstmarge doorbreekt: 1584px tussen marges van 94 en 96px. Vier stappen van 292,1 op x94 / 524,6 / 955,3 / 1385,9 → **steek 430,6 · 430,7 · 430,6 — exact gelijk**. Dit is de enige gelijke rij in de sectie, en bewust zonder kaartvlak. |
| **Dominant element** | Geen. Dat is het doel: dit blok is de ademhaling van de pagina. |
| **Beeldbehandeling** | **M0.** Geen beeld. Iconen per stap, lijndikte constant. |
| **Kaartbehandeling** | **K8 ICOONREGEL × 4.** Geen vlak, geen rand, geen schaduw. Icoon 48 + genummerde badge 36,2 × 35,1 + kop + twee regels. |
| **Geometrie** | **Nul** eigen middelen. De chevron is iconografie. Deelt de rij een sectie met B04, dan draagt B04 het ene toegestane middel. |
| **Overlap** | **Nul** binnen het blok. |
| **Inhoudsgrenzen** | **3 tot 5 stappen**, gemeten 4. Per stap: nummer + kop van ≤ 2 woorden + **9 tot 11 woorden** toelichting over ≤ 3 regels. Meer dan vijf stappen maakt er een raster van. |
| **CTA-positie** | **Nul links is toegestaan en aanbevolen.** Gemeten: 0 `<a>` in de hele sectie. |
| **Ideaal impactniveau** | **QUIET.** Een pagina draagt ≥ 2 QUIET-blokken, waarvan er één de kortste sectie is. |
| **Responsieve transformatie** | Gemeten op 1199px: 2 × 2-raster van 1103 breed, hoogte 291,9 (`home-process.css:295`); onder 768px een verticale tijdlijn met een doorlopende 2px-lijn — de chevrons worden de lijn, de richting blijft. |
| **Pagina-archetypes** | B1 · B2 alle varianten (implementatie) · B5 · B6 (de stappen van het instrument). |
| **Inhoudstypes** | Alles met een **volgorde**: proces, keten, doorlooptijd. Niet: een set gelijkwaardige eigenschappen (dat is B02). |
| **Antipatronen** | Vier witte kaarten met schaduw naast elkaar — dan is het geen voortgang meer maar een raster · een voortgangsbalk die op elke stap even lang is (decoratie, geen markering) · meer dan vijf stappen · een CTA in de rij, waardoor het blok zijn rustfunctie verliest. |
| **Toets** | (1) de steken verschillen < 1px onderling (gemeten 0,1); (2) nul kaartvlakken, nul randen, nul schaduwen; (3) de rij doorbreekt de tekstmarge (gemeten 1584 tegen een containerrand van 70); (4) het leegte-element eronder heeft een gemeten hoogte en `aria-hidden` (gemeten 56,9); (5) het blok draagt 0 of 1 link. |

---

### B06 · GESPIEGELD GEBOUWD OBJECT — `C6` · M0 GEEN FOTO · K6 + K8 · MEDIUM

```
x78,2                                x889,2  x981,9                             x1708
|<------- OBJECT 811 (45,7% vw) ------->|<-92,7->|<----- COPY 726,1 (40,9% vw) ----->|
 [ K6 telefoon 151,3 x 308, r18,7, z2 ]           eyebrow 1 woord
   overlapt het dashboard 27,4 px                 H2 54 / 5 woorden / 2 regels
   en valt er verticaal volledig in               lead 20,2 / 20 woorden / 4 regels
     [ K6 dashboard 687,1 x 428,7, r13 ]          K8 ICOONREGEL x4, kolommen 181,5
       rail 131,3 | hoofdvlak 553,8 (19,1/80,9)   [ CTA 244,4 x 50,3 ]
       tegels 3 x 165,5 | stroom 204,2|92,2|204,2
 M0 GEEN FOTO — 0 img-elementen in de hele sectie (gemeten)
 DE ENIGE GESPIEGELDE COMPOSITIE: object links, tekst rechts
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie** | Object → kop → lead → vier kenmerken → CTA. Object : tekst = 811 : 726,1 = **1,12 : 1** — de dichtste verhouding van de pagina, en de enige onder 1,4. De kopkolom is met 726,1px (40,9% vw) de breedste van de pagina. |
| **Raster** | Twee zones, **gespiegeld ten opzichte van alle andere blauwdrukken**: object links, copy rechts, 92,7px ertussen. Drie geneste rasters binnen het object: rail/hoofdvlak 19,1/80,9 (`home-control.css:104`), tegels `repeat(3,1fr)` (`:122`), stroomschema `1fr 5.2cqw 1fr` = 40,8/18,4/40,8 (`:132`). Rechts vier kolommen van 181,5 (`:230`). |
| **Dominant element** | Het dashboard — 687,1 × 428,7 = 28% van het sectievlak. |
| **Beeldbehandeling** | **M0 GEEN FOTO.** Gemeten nul `img`-elementen. In plaats daarvan twee gebouwde apparaatvlakken met echte, leesbare inhoud. Verplicht label "Voorbeeldweergave" in de figuur zelf (`index.html:688`); elk getoond getal moet elders op de site gepubliceerd zijn. |
| **Kaartbehandeling** | **K6 APPARAATVLAK × 2** (687,1 × 428,7 r13 en 151,3 × 308 r18,7). Het kleinste staat aan de **buitenkant** en overlapt het grootste met gemeten 27,4px, terwijl het er verticaal volledig binnen valt (161,3..469,3 binnen 60,8..489,5). Plus **K8 × 4** rechts. |
| **Geometrie** | **Eén** middel, bijna onzichtbaar: een vijfhoek met een punt links op 46% hoogte als schaduwvlak áchter de apparaten (`home-control.css:40`), op 52% al volledig transparant. De vormtaal zit hier in het **diagram**, niet in de snede. |
| **Overlap** | 57 overlapparen (json), vrijwel allemaal **binnen** het gebouwde object — de tegenpool van B01. |
| **Inhoudsgrenzen** | eyebrow ≤ 1 woord · H2 ≤ 5 woorden / 2 regels · lead ≤ **20 woorden** / 4 regels over de volle 726,1px · **exact 4** kenmerken van 5–7 woorden waarin kop en toelichting dezelfde graad delen en alleen in gewicht verschillen · 1 CTA. Binnen het object: ≤ 6 railitems, ≤ 6 knopen, 1 hub, 3 waardetegels. |
| **CTA-positie** | Eén knop onderaan de tekstkolom, 244,4 × 50,3 — de **laagste** primaire knop van de pagina. Het object is de boodschap. |
| **Ideaal impactniveau** | **MEDIUM.** |
| **Responsieve transformatie** | Gemeten op 1199px: het object komt bovenaan (1103 × 450,6) en de copy eronder (yrel 514,6..940) — **de volgorde draait om**. Bij 1000–1199px wordt de rail 150px (`home-control.css:367`); onder 768px gaan telefoon, rail en stroomlijnen uit met de uitgeschreven winst "ruim 190 px" (`home-control.css:336`). |
| **Pagina-archetypes** | B1 · B2 *Systeem* · B5 · B6 (de uitkomstweergave van de wizard). |
| **Inhoudstypes** | Een product of mechanisme waarvan **geen fotografie bestaat**. Niet gebruiken als er wél een echt productbeeld is. |
| **Antipatronen** | Een stockmockup of laptopdeksel om het scherm · verzonnen cijfers in de interface · een diagram dat kleiner is dan ~45% vw (dan is het een illustratie naast tekst en verliest het de rol van onderwerp) · het kleine apparaat in het midden in plaats van aan de buitenkant · een tweede gespiegelde blauwdruk op dezelfde pagina (gemeten: 1 van 9 secties spiegelt). |
| **Toets** | (1) nul `img`-elementen in de sectie; (2) het kleine vlak overlapt het grote met 20–30px (gemeten 27,4) en valt er verticaal volledig in; (3) ≥ 90px tussen object en tekstkolom (gemeten 92,7); (4) elk getal in het object is elders op de site gepubliceerd; (5) het label "Voorbeeldweergave" is zichtbaar in de figuur. |

---

### B07 · BEWIJSBAND MET LEEG MIDDEN — `C7` · M0 · K5 LOGOKAART · QUIET

```
x78                     x699,9                              x1207,3            x1698
|<---- KOP-BLOK 621,9 ---->|<------- 507,4 px LEEG --------->|<-- BEWIJS 490,8 -->|
 eyebrow 6 woorden                                            [ K5 281,3 x 80,7 ]
 H2 53 / 6 woorden / 2 regels                                 [ K5 189,4 x 80,7 ]
                                                              1,49 : 1 — ongelijk,
                                                              contentgedreven
                                                   [ tekstlink 167,4 'Alle projecten' ]
|<------------- bandhoogte 241,3 (13,6cqw) over de volle 1774 breed --------------->|
 eigen achtergrondwaarde; de grens eronder is de enige harde horizontale kleurnaad
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie** | Kop links, bewijs rechts, **het midden blijft leeg**. Gemeten leegte tussen het kopblok en de logorij: 507,4px. Het commentaar legt vast dat de band is teruggebracht van 17,7 naar 13,6cqw omdat de rechterhelft leeg bleef (`home-proof.css:36-38`). |
| **Raster** | Geen raster; twee absolute zones. De breedte van de bewijsrij wordt door het **aantal onderbouwde items** bepaald, niet door een kolomaantal. |
| **Dominant element** | Geen. Dit is een QUIET-band. |
| **Beeldbehandeling** | **M0.** Geen sectiebeeld. Een logo of duimnagel mag, maar dan als klein dekkend object binnen het item. |
| **Kaartbehandeling** | **K5 LOGOKAART × 2.** Wit, r10, 1px rand `rgba(16,28,58,.12)` (`home-proof.css:117-129`), hoogte 80,7; naam 18px/700 (`:135-142`) + ondertitel 14px/400 (`:144-150`), met de uitgeschreven regel dat dit **nadrukkelijk geen nagebouwd logo** is. Breedtes gemeten 281,3 en 189,4 — **ongelijk omdat de namen ongelijk zijn**. Geen kaart ligt op een andere. |
| **Geometrie** | Maximaal **één**, en dit is de enige plek in het systeem waar een **vrijstaande** versiering mag staan — maximaal één per negen secties. Gemeten in S6: een driehoek van 85 × 133 (32,6°) tegen x1774. |
| **Overlap** | Nul binnen de band. |
| **Inhoudsgrenzen** | **2 tot 4 bewijsitems**, gemeten 2. Per item: naam + één contextregel (gemeten 7 en 4 woorden). Eyebrow ≤ 6 woorden · H2 ≤ 6 woorden / 2 regels. **Geen logo's zonder onderbouwing.** |
| **CTA-positie** | Maximaal één tekstlink, rechts onder de bewijsrij (167,4 breed). Geen primaire knop in de band. |
| **Ideaal impactniveau** | **QUIET.** |
| **Responsieve transformatie** | Gemeten op 1199px: kop boven (1103 breed), items eronder als **twee kaarten van exact 300** (`home-proof.css:488`, `minmax(0,300px)`). De contentgedreven ongelijkheid is dus een desktopeigenschap; op tablet zijn de kaarten gelijk en begrensd. |
| **Pagina-archetypes** | B1 · B2 alle varianten · B3 · B4 · B5. **Niet** B7. |
| **Inhoudstypes** | Klantnamen, sectoren, certificeringen — uitsluitend onderbouwd. |
| **Antipatronen** | Zes slots vullen terwijl er twee onderbouwde items zijn (dat leest als niet-geladen logo's) · het midden opvullen omdat het leeg is · de band als vulling tussen twee zware secties gebruiken, waarvoor B05 bestaat · meer dan vier items, want dan is het een raster en gelden de regels van B02. |
| **Toets** | (1) aantal kolommen = aantal onderbouwde items, nooit een vast getal; (2) ≥ 400px aaneengesloten leegte tussen kop en bewijs bij twee items (gemeten 507,4); (3) de bandhoogte is teruggebracht tot de inhoud hem vult — gemeten 241,3px (13,6cqw) ná een verlaging vanaf 17,7cqw, met de reden in de code; een band die niet is bijgesteld is niet getoetst (zie **DR-V-B5**); (4) nul overlap binnen de band; (5) elke naam valt onder de claimpolicy. |

---

### B08 · VERHAAL OP DRAAGVLAK — `C8` · M3 DRAAGVLAK · K2 + K3 · MEDIUM

```
x78              x610,2                                                           x1774
|<-- VERHAAL 532,2 -->|                                                               |
 eyebrow 2 w      |<-62->|                                                            |
 H3 47 / 9 w / 3 regels  |======= M3 DRAAGVLAK 734,4 x 557 (41,4% vw) =====|          |
 lead 21 w / 3 regels    | clip 17,55% = 13 graden — FLAUWE snede, geen    |          |
 [ CTA 310 x 67 ]        | merkhoek; hij haalt het beeld weg precies waar  |          |
                         | de verhaalkolom eroverheen loopt               x1282       |
                         |                               x1240 [ K2 KAART 448 x 374 ] |
                         |                                      42 px (9,4%) op de foto
                         | x632 [ K3 STROOK 629 x 124, r20 ] x1261                    |
                         |       100% op de foto; 84,4 vanaf de linkerrand,           |
                         |       32,1 boven de onderrand                              |
                         |                                    wig 85x133, 32,6 gr --> |
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie** | Verhaal → beeld → resultaatkaart → projectstrook. Beeld : tekst = 734,4 : 532,2 = **1,38 : 1 — de dichtste beeld-tekstverhouding van de pagina.** Twee koppenniveaus: sectiekop 53 en verhaalkop 47 (verhouding 1,13, expliciet "duidelijk secundair", `home-proof.css:173`). |
| **Raster** | **Geen schone kolomnaad — dat is de rasterbreuk.** Drie zones die elkaar overlappen: verhaal 78..610,2, foto 547,6..1282, kaart 1240..1688. Verhaal/foto overlappen 62,6px; foto/kaart 42px. |
| **Dominant element** | De foto — 41,4% vw × 62,8% sectiehoogte. |
| **Beeldbehandeling** | **M3 DRAAGVLAK.** Masker `polygon(17.55% 0, …)` = gemeten **13,0°**, een flauwe snede in plaats van de scherpe merkhoek (`home-proof.css:224`), zodat de verhaalkolom ernaast kan doorlopen. **Geen scrim** — alles wat erop ligt is dekkend. Tweede beeld: duimnagel 98 × 91 in de strook. |
| **Kaartbehandeling** | **K2 × 1** (448 × 374, r16, dubbele schaduw) die **42px (9,4%)** over de foto valt — de toegestane variant voor een kaart die niet uitlijnt: een **gemeten** overlapwaarde in plaats van een gedeelde rand. **K3 × 1** (629 × 124, r20) die **100%** op de foto ligt, 84,4px van de linkerrand en 32,1px boven de onderrand; de strook raakt geen enkele vlakrand. |
| **Geometrie** | **Eén** functionele fotosnede (13°). De vrijstaande wig telt bij B07. |
| **Overlap** | De hele sectie meet 19 overlapparen (json); dit blok draagt er twee die tellen: kaart × foto en strook × foto. |
| **Inhoudsgrenzen** | eyebrow ≤ 2 woorden · verhaalkop ≤ **9 woorden** / 3 regels, 5–6px kleiner dan de sectiekop · verhaal ≤ **21 woorden** / 3 regels op ≤ 532px · kaart: citaat of resultaatregel ≤ **32 woorden** + **maximaal 4** cijfers · strook: eyebrow + projectnaam + één specregel (≤ 11 woorden samen). |
| **CTA-positie** | Eén knop links onder het verhaal (310 × 67) plus één tekstlink in de strook. De knop staat bewust buiten de flow zodat hij op mobiel niet tussen case en bewijs valt (`home-proof.css:188-190`). |
| **Ideaal impactniveau** | **MEDIUM.** |
| **Responsieve transformatie** | Gemeten op 1199px: foto 540,5 links en kaart 540,5 rechts op dezelfde hoogte (`1fr 1fr`, `home-proof.css:405`), de strook eronder over de volle 1103. De fotosnede gaat uit (`home-proof.css:434`, `clip-path:none`) en het beeld krijgt `--m-radius-img`. |
| **Pagina-archetypes** | B1 · B2 *Oplossing* en *Sector* · B3 (kernfamilie) · B4. |
| **Inhoudstypes** | Eén echte case in drie registers: verhaal, resultaat, identiteit. Niet: een case buiten de eigen sector; niet direct na B03 (twee uitgelichte onderwerpen achter elkaar). |
| **Antipatronen** | Een scrim toevoegen terwijl alles wat op het beeld ligt dekkend is · de scherpe merkhoek gebruiken waar de tekstkolom eroverheen moet (daar hoort de flauwe snede) · een testimonial verzinnen: een citaat dat niet bestaat wordt een resultaatbeschrijving in derde persoon · de strook tegen een beeldrand aan leggen in plaats van er volledig binnen. |
| **Toets** | (1) de kaart overlapt de foto met een gemeten waarde van 5–12% van zijn breedte (gemeten 9,4%); (2) de strook ligt 100% binnen de fotodoos in **beide** assen; (3) de snede is flauw (≤ 15°) waar een tekstkolom het beeld raakt; (4) tweede kop 5–6px kleiner dan de eerste; (5) ≤ 4 cijfers in de kaart. |

---

### B09 · KAARTKOLOM OP DRAAGVLAK — `C9` · M3 DRAAGVLAK · K4 + K8 · MEDIUM

```
x73                       x640,7 | x642,6                                      x1742,6
|<------ COPY 567,7 (32%) ------->| naad  |===== M3 DRAAGVLAK 1100 x 736,2 (62% vw) ==|
 eyebrow 1 woord                  | 1,9px | clip 11,5% = 9,7 graden (flauwste snede),  |
 H2 61 / 8 woorden / 3 regels     |       | radius 18, object-position 26% 52%         |
 lh/graad 0,95 — strakste gemeten |       |      x1295 [ K4 422 x 126 ] x1717  yrel 143,7
 lead 16 woorden / 4 regels       |       |            [ K4 422 x 126 ]        yrel 285,0
 K8 ICOONREGEL x3, steek 82       |       |            [ K4 422 x 126 ]        yrel 426,4
 [ CTA 220x67 ] [ link 188 ]      |       |            [ K4 422 x 126 ]        yrel 567,7
 kolomrand 699,4 hoog, kaarsrecht |       | steek 141,3 / lucht 15,3 / 25,6 binnen de rand
                                          | onder de laatste kaart 93,5 px foto vrij
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie** | Beeld → kaartkolom → tekstkolom. Beeld : tekst = 1100 : 567,7 = **1,94 : 1**. De kopkolom, de lead en de drie voordeelregels hebben **exact dezelfde breedte (567,7)**, waardoor links één rechte kolomrand van 699,4px ontstaat. |
| **Raster** | Twee zones zonder gedeclareerd raster, met een naad van **1,9px** — de enige plek op de pagina waar twee zones elkaar praktisch raken zonder marge. Binnen de foto een verticale kaartkolom x1295..1717. |
| **Dominant element** | De foto — 62% vw × 83% sectiehoogte, het grootste niet-bleedende beeld van de pagina. |
| **Beeldbehandeling** | **M3 DRAAGVLAK.** Masker `polygon(11.5% 0, …)` = gemeten **9,7° — de flauwste snede van de pagina** (`home-infra.css:160`), met de reden in de code: zonder die snede is het vlak "een kale rechthoek met zwevende kaarten". `object-position: 26% 52%` zodat het onderwerp **naast** de kaartkolom staat. Richtingsverloop op `::after` dat alleen onder de kolom verdonkert (`home-infra.css:173-183`) — het bestaat om de kaarten een veld te geven. |
| **Kaartbehandeling** | **K4 REGISTERKAART × 4 — de enige gelijke kaartfamilie van de pagina** (422 × 126, r14, steek 141,3 uit `home-infra.css:228-231`, 15,3px lucht ertussen). Alle vier liggen **100%** op de foto; hun rechterrand ligt 25,6px binnen de fotorand. Plus **K8 × 3** links. |
| **Geometrie** | **Eén**: de fotosnede. De hoek volgt uit de doosverhouding (hoge doos → flauwe hoek) en valt daardoor buiten de merkfamilie; dat is toegestaan en verklaarbaar. |
| **Overlap** | 50 overlapparen (json). Zes niveaus: foto z1 → vier kaarten z2 → copy z3. **De enige blauwdruk met een kolom van overlappende kaarten.** |
| **Inhoudsgrenzen** | **3 of 4 kaarten**, nooit meer. Per kaart: icoon + kop van 1 woord + één regel toelichting (gemeten 4–6 woorden samen). Kolom: eyebrow ≤ 1 woord · H2 ≤ **8 woorden** / 3 regels · lead ≤ **16 woorden** / 4 regels · ≤ 3 voordeelregels van 5–8 woorden. |
| **CTA-positie** | Eén knop (220 × 67) plus één tekstlink onderaan de tekstkolom. Elke kaart is zelf een link met pijl. |
| **Ideaal impactniveau** | **MEDIUM.** |
| **Responsieve transformatie** | Gemeten op 1199px: foto 1103 × 260 met **`clip-path:none`** (`home-infra.css:345`) en de vier kaarten eronder in één rij van 265,3 elk. **Snede én verloop gaan uit op naam van de inhoud** — een vlak dat niets meer draagt, gaat uit. Gemeten winst in het commentaar: "ruim 140 px korter". |
| **Pagina-archetypes** | B1 · B2 *Sector* en *Gebied* · B4. **Niet** B6, **niet** B7. |
| **Inhoudstypes** | Drie tot vier bestemmingen, sectoren of toepassingsgebieden. |
| **Antipatronen** | Meer dan vier kaarten · kaarten zonder richtingsverloop eronder (dan zweven ze — precies de fout die `home-infra.css:171-172` benoemt) · kaarten die buiten het beeldvlak steken · dezelfde kaartkolom op een beeld zonder eigen fotografie · vier tegels in een rij **onder** de tekst, wat de generieke uitvoering is. |
| **Toets** | (1) alle kaarten liggen 100% binnen het beeldvlak, met ≥ 20px marge tot de beeldrand (gemeten 25,6); (2) de steek is gelijk met een afwijking < 1px (gemeten 141,3); (3) onder de laatste kaart blijft ≥ 90px beeld vrij (gemeten 93,5); (4) het verloop onder de kolom is aanwezig en richtingsgebonden; (5) de linkerkolom heeft één rechte rand: kop, lead en lijst delen dezelfde breedte op de pixel. |

---

### B10 · CHEVRONSLOT — `C10` · M6 HOEKBEELD · K2 + K8 · HIGH

```
x0                                  x839,3 = chevronpunt (55,75% hoogte = yrel 351,8)
|<------------ COPY 674,1 (38% vw) ---------->\                                  x1774
 eyebrow 5 woorden                             \   M6 HOEKBEELD 934,7 x 631      |
 H2 66 — GROOTSTE VAN DE PAGINA / 8 w / 3 reg   \  52,7% vw, 100% sectiehoogte   |
 lead 20 woorden / 2 regels                      \ chevron 35,4 en 32,7 graden   |
 [ knop 314,6 x 63,3 ] [ knop 267,4 x 63,3 ]     /                               |
                                                / x1053,6 [ K2 KAART 304,5x272,5 ]
 K8 ICOONREGEL x3 — rij 822,5 breed:           /   100% op het beeld, KRUIST het |
   275 | 299,5 | 248  (326fr 355fr 294fr)     /    chevronpunt (yrel 290,2..562,6)|
 speling tot de schuine rand 24,9 .. 66,2 px /     (berekend uit de gemeten clip) |
                                             \     [ merkvlak 293,6x400,7, 36,2 gr ]
                                              \     raakt rechts en onder exact 0 / 0
|<--------- wig 1774 x 631 op inset 0, zes punten, z1, deelt de lijn 47,31% ------>|
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie** | H2 (66px, grootste van de pagina, alleen de hero-H1 is groter) → lead → twee knoppen → bewijsrij; rechts beeld → merkvlak → afspraakkaart. Beeld : tekst = 934,7 : 674,1 = **1,39 : 1**. |
| **Raster** | **Geen raster in de hoofdcompositie.** De scheiding tussen tekst en beeld is **geen verticale lijn maar een punt** op x839,3 / 55,75%. De bewijsrij is bewust ongelijk: `326fr 355fr 294fr` (`home-final.css:221`) → gemeten 275 / 299,5 / 248. |
| **Dominant element** | Het beeld — 52,7% vw × **100% sectiehoogte**, het enige beeld van de pagina dat de volle sectiehoogte vult. |
| **Beeldbehandeling** | **M6 HOEKBEELD.** Chevronmasker met de punt naar links (`home-final.css:63-69`), gemeten 35,4° en 32,7°; randvast rechts. Scrim 200° in drie stops, want er komt wit op te liggen. `object-position: 78% 56%` met de reden in het commentaar. |
| **Kaartbehandeling** | **K2 × 1** (304,5 × 272,5, r13,5) die 100% op het beeld ligt en het chevronpunt **kruist**. Plus **K8 × 3** onderaan. Een overliggende **kaart** mag een vormpunt kruisen; een tekst**rij** houdt afstand: uit de gemeten clip en de gemeten rijpositie volgt een speling van 24,9px aan de bovenrand van de rij tot 66,2px aan de onderrand. De rij raakt de schuine rand dus nergens. |
| **Geometrie** | **Drie** middelen die alle drie dezelfde lijn (47,31%) of hetzelfde punt (55,75%) delen: de wig over de volle sectiebreedte, de chevronsnede van de foto, en het blauwe merkvlak van 36,2° dat de rechteronderhoek exact op de schermrand sluit (overschrijding 0 en 0). Dit is de derde en laatste ankerrol van een pagina. |
| **Overlap** | 43 overlapparen (json), zes niveaus: wig z1 → foto z2 → merkvlak z3 → kaart z4 → copy en bewijsrij z5. |
| **Inhoudsgrenzen** | eyebrow ≤ 5 woorden · H2 ≤ **8 woorden** / 3 regels — en het moet de grootste H2 van de pagina zijn · lead ≤ **20 woorden** / 2 regels · **2** knoppen van gelijke hoogte · **exact 3** geruststellingen van 5–9 woorden · 1 kaart met kop + ≤ **17 woorden**. Eén boodschap, niet twee. |
| **CTA-positie** | Twee knoppen in de linkerkolom (314,6 en 267,4, beide h 63,3) plus een afspraakkaart op het beeld die naar dezelfde flow mag wijzen. Nooit sticky. |
| **Ideaal impactniveau** | **HIGH.** Altijd de laatste inhoudelijke sectie. |
| **Responsieve transformatie** | Gemeten op 1199px: foto 1103 × 340, kaart 430 × 172 die de foto nog steeds met **34,0px** overlapt (`home-final.css:403`). Wig en merkvlak gaan uit; onder 768px keert het blauw terug als `::before` op het beeld zelf (`home-final.css:394`). |
| **Pagina-archetypes** | B1 · B2 alle varianten · B3 · B4 · B5 · B6. **Niet B7**: een juridisch document met een conversieknop is een vertrouwensprobleem. |
| **Inhoudstypes** | De afsluitende conversie. Niet als de pagina al een B03 met hetzelfde beeld draagt, en nooit met het herobestand. |
| **Antipatronen** | Een slotsectie die de hero herhaalt in verloop, kolomverdeling, knoptekst of fotobestand (gemeten vijf keer in de B2-kandidaat) · de grootste H2 in de eerste inhoudelijke sectie zetten · drie geruststellingen in gelijke kolommen (hier bewust 33,5/36,4/30,2) · een kaart die het vormpunt net níet kruist en daardoor als misplaatst leest. |
| **Toets** | (1) de H2 is de grootste van de pagina; (2) de sectie escaleert in minstens twee van drie: kopgraad, mediaschaal, aantal lagen (gemeten alle drie); (3) de drie geometrische middelen delen één lijn of één punt; (4) de bewijsrij houdt ≥ 24px afstand tot de schuine beeldrand; (5) het beeld vult 100% van de sectiehoogte en raakt één schermrand. |

---

### B11 · VOETBEELD IN DE HOEK — `C11` · M6 HOEKBEELD · geen kaartfamilie · QUIET

```
x84,3        x455,5    x682,3   x894,2    x1088,5          x1423,9             x1774
[ MERK 372,5 ][NAV 165,1][NAV 130,5][NAV 150,6][ CONTACT 319,3 ]  M6 HOEKBEELD   |
 steken: 371,2 | 226,8 | 211,9 | 194,3 — STRIKT AFNEMEND          350,1 x 525,5  |
 geen H1, geen H2; zwaarste letter is het woordmerk               19,7% vw,      |
 3 contactregels    4-7 links per kolom    [ knop 301,6 x 59 ]    ratio 0,67     |
                                                                  chevron 31,6 / 28,1
                                                      [ notitie 149 x 99,7, 3 woorden ]
|<-------- juridische regel 1605,3 breed, 1px lijn erboven, yrel 549,1 ------------>|
 beeld : tekst = 350,1 : 1610 = 0,22 : 1 — omgekeerd t.o.v. elke andere blauwdruk
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie** | Vlak en breed: de hoogste linkdichtheid en de laagste typografische spanning van de pagina. Gemeten 15 navigatielinks van 1–3 woorden. **Geen H2.** |
| **Raster** | Vijf zones met **strikt afnemende steek**: 371,2 · 226,8 · 211,9 · 194,3. Geen enkel paar steken is gelijk. De juridische regel is een vierde margebreker (1605,3). |
| **Dominant element** | Geen. De footer sluit af, hij opent niets. |
| **Beeldbehandeling** | **M6 HOEKBEELD**, gespiegeld in schaal ten opzichte van B10: 350,1 × 525,5 (19,7% vw), ratio 0,67 — **het enige staande beeld van de pagina**. Chevron 31,6° en 28,1° (`home-footer.css:48-54`), randvast rechts. Gedeeltelijke scrim over alleen de bovenste 58% (`inset: 0 0 42% 0`), uitsluitend voor de notitie. |
| **Kaartbehandeling** | **Geen.** Navigatie zonder kolomranden, uitsluitend gescheiden door positie. |
| **Geometrie** | **Eén**: de chevron van het beeld zelf, die de signatuur van B10 op een vijfde van de schaal herhaalt. |
| **Overlap** | **2 overlapparen (json) — het laagste van de pagina.** Alleen de notitie ligt op het beeld. |
| **Inhoudsgrenzen** | Woordmerk + één regel van ≤ **13 woorden** · **3** navigatiegroepen van 4–7 bestemmingen · 3 contactregels · 1 knop · ≤ 3 vinkregels · één juridische regel van ≤ **19 woorden** · op het beeld: **exact één** notitie van ≤ 3 woorden. |
| **CTA-positie** | Eén knop in het contactblok (301,6 × 59). **Geen primaire CTA-sectie**: wat er niet is, wordt niet aangekondigd (geen nieuwsbriefformulier zonder werkende flow, geen link naar een niet-bestaande pagina). |
| **Ideaal impactniveau** | **QUIET.** Altijd direct na B10, zodat het rijm werkt: gemeten dezelfde hoogte (631 = 631), dezelfde vormfamilie, hetzelfde referentiecanvas. |
| **Responsieve transformatie** | Gemeten op 1199px: **de beeldwig is weg** (geen enkel wigvlak in de meting), de drie navigatiekolommen staan in een blok van 656,6 en de juridische regel loopt over 1103. Het vlak dat niets meer draagt, gaat uit. |
| **Pagina-archetypes** | Alle. De footer is sitebreed. |
| **Inhoudstypes** | Navigatie, contactgegevens, juridische verwijzingen, één merkregel. |
| **Antipatronen** | Vier gelijke navigatiekolommen op een egale donkere band zonder beeld (de generieke uitvoering) · een beeldwig terwijl B10 er niet boven staat — dan vervalt het rijm en is de wig decoratie · een kop in de footer (de zwaarste letter hoort het woordmerk te zijn) · meer dan één element op het beeld. |
| **Toets** | (1) dezelfde hoogte als de sectie erboven (gemeten 631 = 631); (2) geen twee steken gelijk; (3) ≤ 1 element op het beeld; (4) nul claims behalve geverifieerde bedrijfsgegevens; (5) de wig verdwijnt zodra hij niets meer draagt. |

---

### B12 · SPIEGELBAND — `C4` · M4 BAND · K2 · MEDIUM · **variant op B04**

**Herkomst.** Gespiegeld uit de gemeten B04-geometrie met `x' = 1774 − x`. Niet als render gemeten — **BEREKEND**. De maten (956,4 × 293,5, kaart 337,6 × 253,7, overschrijding 55,8, backdrop 33,7°) zijn gemeten; alleen hun positie is gespiegeld.

```
x0                                              x1016,2    x1230                 x1704
|====== M4 BAND 956,4 x 293,5, raakt de LINKER schermrand =====|          |<- COPY 474 ->|
|                      x678,6 [ K2 INFOVLAK 337,6 x 253,7 ]   |<- 213,8 ->|  eyebrow
|                             kruist de rechter beeldrand met  |           |  H2 / lead
|                             >> 55,8 px NAAR BINNEN           |           |
 \_ backdrop gespiegeld: 33,7 graden, van rechtsonder naar linksboven
 HARDE RANDVOORWAARDE: de kaart kruist naar BINNEN, nooit naar de linker schermrand
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie** | Gelijk aan B04, met beeld links en copy rechts. |
| **Raster** | Gespiegeld: beeld x0..956,4 (randvast links), copy x1230..1704 (rechtermarge 70). De kaart staat op x678,6..1016,2 en kruist de beeldrand **naar binnen**; tussenruimte tot de copykolom 213,8 (tegen 207,6 gemeten in B04). |
| **Beeldbehandeling / Kaartbehandeling / Geometrie / Overlap** | Identiek aan B04. |
| **Waarom de kaart naar binnen kruist** | Zelf gemeten: de **linker** inhoudsrand is over de negen secties 83 · 70 · 150,4¹ · 70 · 78,2 · 78 · 73 · 88,6 · 84,3px — spreiding **19px** over de zeven vergelijkbare secties. De **rechter** rand spreidt volgens de aangeleverde forensics 53px (31–84). Een letterlijke spiegeling zou de kaart op 10,2px van de linker schermrand zetten en die vaste rand breken. ¹ gemeten binnen het paneel van S3, dat zelf op x70 begint. |
| **Inhoudsgrenzen / CTA / Impact** | Gelijk aan B04. |
| **Responsieve transformatie** | Onder 1200px identiek aan B04 (de spiegeling bestaat alleen op desktop; de collapse zet beeld en kaart toch onder elkaar). |
| **Pagina-archetypes / Inhoudstypes** | Gelijk aan B04. |
| **Antipatronen** | Spiegelen alleen om afwisseling te maken · twee gespiegelde blauwdrukken op één pagina (gemeten: Master v1 spiegelt 1 van 9 secties) · de kaart naar de linker schermrand laten kruisen. |
| **Toets** | (1) de linkerrand van de copykolom valt binnen de gemeten bandbreedte van de rechtermarges (31–84px vanaf de schermrand); (2) de kaart kruist naar binnen, met ≥ 150px lucht tot de copykolom (berekend 213,8); (3) maximaal één gespiegelde blauwdruk per pagina. |

---

### B13 · KAARTKOLOM ZONDER FOTO — `C9` · M0 GEEN FOTO · K4 + K8 · MEDIUM · **variant op B09**

**Herkomst.** B09 met de fotolaag vervangen door een getekend vlak. Twee gemeten precedenten: de ontbrekende HVAC-fotografie wordt een getekend navyvlak met een snede van 25° (`home-solutions.css:303-320`), en het ontbrekende productbeeld wordt een gebouwd object (B06). De kaartgeometrie is ongewijzigd gemeten uit B09; het **vlak** is BEREKEND.

```
x73                       x640,7 | x642,6                                      x1742,6
|<------ COPY 567,7 (32%) ------->| naad  |=== M0 GETEKEND DRAAGVLAK 1100 x 736,2 ====|
 identiek aan B09                 | 1,9px | geen img; vlak in de merktaal, snede in    |
                                  |       | de FLAUWE familie (9,7 .. 13 graden)       |
                                  |       |      [ K4 422 x 126 ] x4, steek 141,3      |
                                  |       |      rechterrand 25,6 binnen het vlak      |
                                  |       |      onder de laatste kaart >= 93,5 vrij   |
                                  |       | het vlak moet de kolom aan ALLE zijden     |
                                  |       | met die marges omsluiten, anders zweven    |
                                  |       | de kaarten                                 |
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie / Raster / Inhoudsgrenzen / CTA / Impact** | Gelijk aan B09. |
| **Beeldbehandeling** | **M0.** Nul `img`-elementen. Het draagvlak is een getekend vlak in de merktaal met een snede uit de **flauwe** familie (gemeten 9,7°–13,0°), niet uit de scherpe (31,6°–36,2°) — de scherpe familie maakt randovergangen, de flauwe is een snede in een vlak. |
| **Kaartbehandeling** | **K4 × 4** ongewijzigd: 422 × 126, r14, steek 141,3, 15,3px lucht, rechterrand 25,6px binnen het vlak. |
| **Geometrie** | **Eén**: de snede van het getekende vlak zelf. |
| **Overlap** | Vier kaarten op het vlak; de telling blijft gelijk aan B09 (50 in de gemeten bronsectie) minus de foto-overlappingen. **BEREKEND, niet gerenderd gemeten.** |
| **Responsieve transformatie** | Gelijk aan B09: onder 1200px gaan snede én verdonkering uit en staan de kaarten in één rij onder het vlak. |
| **Pagina-archetypes** | B2 *Systeem* en *Sector* · B4 · B5 — overal waar vier bestemmingen bestaan maar geen eigen fotografie. |
| **Inhoudstypes** | Sectoren, toepassingen of modules zonder beschikbare foto. |
| **Antipatronen** | Een stockfoto of gegenereerd beeld als vervanging · een plaatshouder · witte kaarten op een licht vlak zonder meetbaar contrastverschil (zie **DR-V-B4**) · het vlak kleiner maken dan de kaartkolom plus de gemeten marges. |
| **Toets** | (1) nul `img`-elementen in de sectie; (2) het vlak omsluit de kaartkolom met ≥ 25,6px rechts en ≥ 93,5px onder; (3) de snede ligt in de flauwe familie (≤ 15°); (4) het contrast van de witte kaart op het vlak is **gemeten** vastgelegd voordat deze blauwdruk in productie gaat — in dit document NIET GEMETEN. |

---

### B14 · PANEEL AAN DE LINKERRAND — `C3` · M2 PANEEL · K7 · HIGH · **variant op B03**

**Herkomst.** Gespiegeld uit B03 met `x' = 1774 − x`. **BEREKEND**, niet als render gemeten.

```
x0                                                                        x1704   x1774
|========== M2 PANEEL 1704 x 565, raakt de LINKER schermrand ==============|  70   |
| radius 0 / 63 / 63 / 0                                                   | marge |
| scrim gespiegeld: massief op de RECHTER 20%, transparant op 70%          |       |
|                                            x1161,9 [ COPY 461,7 ] x1623,6|       |
|                                            = 80,4 vanaf de paneelrand    |       |
|                                            -> 150,4 px tot de SCHERMRAND |       |
| SVG-wig 35,9 graden linksonder (gespiegeld)                              |       |
```

| Veld | Specificatie |
|---|---|
| **Alle velden** | Gelijk aan B03, met één uitzondering hieronder. |
| **Randvoorwaarde** | De gespiegelde tekstkolom eindigt op 150,4px van de rechter schermrand, terwijl de gemeten rechtermarges van de pagina tussen 31 en 84px liggen (json). Dat is een **afwijking van de gemeten bandbreedte** en de reden dat deze variant hooguit één keer per pagina mag voorkomen — zie **DR-V-B2**. |
| **Wanneer** | Alleen als de pagina er compositioneel om vraagt: twee B03-achtige panelen op één pagina die beide rechts aflopen, lezen als herhaling. Een pagina draagt er nooit twee van dezelfde kant. |
| **Antipatronen** | Spiegelen om variatie · radius aan beide zijden · een gespiegeld paneel direct naast een gespiegelde B12 of B06 (dan verliest de pagina haar vaste linkerrand volledig). |
| **Toets** | (1) radius uitsluitend aan de kant die de containermarge raakt; (2) de scrim is meegespiegeld, zodat de tekst nog steeds in de donkerste 20% staat; (3) maximaal één gespiegelde blauwdruk per pagina, B06 meegeteld. |

---

### B15 · BEWIJSREGEL ZONDER VLAK — `C7` · M0 · K7 BEWIJSBAND · QUIET · **variant op B01/B03**

**Herkomst.** K7 losgemaakt van zijn gastsectie. Twee gemeten uitvoeringen, met tegengestelde regels.

```
variant A — GELIJKVERDEELD (precedent B01; gemeten 1 x op 9 secties)
x17                        x597                      x1177                       x1757
|<---- cel 580 (33,3%) ---->|<---- cel 580 (33,3%) --->|<---- cel 580 (33,3%) ---->|
 icoon 49,2 | getal 28 px / 3-5 woorden | label 16 px / 4 woorden
 1px lijnen 69 hoog; bandhoogte 160; eigen grond; GEEN bovenlijn

variant B — CONTENTGEDREVEN (precedent B03; binnen een paneel of een copykolom)
x150,4         x260,5  x295,7        x426,6  x461,9           x600,9
|<-- 110,1 -->| 1px  |<--- 130,9 --->| 1px |<---- 139,1 ----->|
 getal 28,43 / gewicht 700, label 17,4 / gewicht 400; kolommen ongelijk omdat de inhoud dat is
```

| Veld | Specificatie |
|---|---|
| **Visuele hiërarchie** | Eén niveau: getal boven label. Geen kaart, geen vlak, geen schaduw. |
| **Raster** | Variant A: `repeat(3, 1fr)` over 1740px, cellen exact gelijk. Variant B: contentgedreven, gemeten 110,1 / 130,9 / 139,1 — ongelijk. **De twee varianten mogen niet op één pagina door elkaar lopen zonder reden.** |
| **Dominant element** | Geen. |
| **Beeldbehandeling** | **M0.** Geen beeld; wel één icoon per cel in variant A. |
| **Kaartbehandeling** | **K7.** 1px scheidingslijnen (`#DCE7F3`, 69px hoog in variant A; `rgba(255,255,255,.22)` in variant B). |
| **Geometrie** | **Nul.** |
| **Overlap** | Nul in variant A (de band staat buiten het beeld); 100% op het beeld in variant B (de band ligt in het paneel). |
| **Inhoudsgrenzen** | **Exact 3 cellen.** Per cel: getal of korte claim van 3–5 woorden + label van ≤ 4 woorden, elk op **één** regel. |
| **CTA-positie** | Geen. |
| **Ideaal impactniveau** | **QUIET.** Variant A is tevens een decompressiekamer: haar eindkleur is gelijk aan de achtergrond van de volgende sectie (gemeten `#FDFDFE` → `#FCFDFE`, één digit per kanaal). |
| **Responsieve transformatie** | Gemeten op 1199px: drie kolommen blijven (`home-hero.css:507-511`, `repeat(3, minmax(0,1fr))` met gap 20px), maar het icoon gaat bóven de tekst in plaats van ernaast, met de reden in de code: naast elkaar past de regel niet op één lijn, dat kost per kolom zo'n 50px. Onder 768px één kolom. |
| **Pagina-archetypes** | Alle behalve B7. |
| **Inhoudstypes** | Drie onderbouwde cijfers of drie geverifieerde claims. Niet: drie beloften. |
| **Antipatronen** | Vier of meer cellen (dan wordt het een raster en gelden de regels van B02) · een scheidingslijn boven de band, waardoor de sectie "ophoudt" in plaats van afloopt · gelijke cellen binnen een paneel waar de inhoud ongelijk is · dezelfde drie cijfers nog eens herhalen in een later register. |
| **Toets** | (1) exact drie cellen; (2) variant A: celbreedtes gelijk binnen 1px; variant B: minstens 15% verschil tussen de breedste en de smalste (gemeten 139,1 / 110,1 = 1,26); (3) elke cel is één regel hoog; (4) geen bovenlijn; (5) variant A komt maximaal één keer per pagina voor. |

---

## §5 · Combinatieregels

Afgeleid uit het gemeten ritme van Master v1 en uit de gemeten eigenschappen van de B2-kandidaat.

**Gemeten ritme van de referentiepagina:**

```
B01     B02      B03     B04+B05   B06      B07+B08   B09      B10     B11
HIGH    MEDIUM   HIGH    QUIET     MEDIUM   MEDIUM    MEDIUM   HIGH    QUIET
908     889      765     599       588      887       887      631     631   px (gemeten)
M1      M5       M2      M4/M0     M0       M0/M3     M3       M6      M6
158     64       42      19        57       19        50       43      2     overlapparen (json)
```

| # | Regel | Meting waarop hij steunt |
|---|---|---|
| **R1** | **Nooit twee HIGH achter elkaar**, en maximaal **drie** HIGH per pagina. | B01, B03, B10 staan op plek 1, 3 en 8 van 9. |
| **R2** | Dezelfde **M-code** mag twee keer achter elkaar, maar alleen als de beeldbreedte ≥ 40% verschilt **én** de K-familie wisselt. | M3 staat twee keer op rij: 734,4 → 1100px = **+49,8%**, met K2+K3 tegenover K4. |
| **R3** | **Ten minste de helft** van de secties draagt een informatievlak **op** een beeld. | Gemeten 6 van 9 (67%) tegen 0 van 11 bij de B2-kandidaat. |
| **R4** | **Ten minste één** beeld is ≥ 50% van de viewportbreedte. | Gemeten 5 van 8 beeldsecties (100 · 96,1 · 62 · 53,9 · 52,7%). |
| **R5** | **Elke** sectie draagt ≥ 1 overlappend elementpaar. | Gemeten 0 van 9 secties zonder overlap, tegen 5 van 11 bij de B2-kandidaat. |
| **R6** | Een pagina draagt **ten hoogste één** gespiegelde blauwdruk (B06, B12, B14 samen geteld). | Gemeten 1 van 9 secties spiegelt; de linkerinhoudsrand spreidt 19px over zeven secties. |
| **R7** | Maximaal **één** gelijke kaartrij per pagina. | Gemeten: alleen B09 heeft gelijke kaarten (4 × 422); de andere acht secties zijn bewust ongelijk. |
| **R8** | De pagina sluit **HIGH → QUIET** met een rijm: gelijke hoogte en gelijke vormfamilie. | Gemeten 631 = 631, chevron 35,4/32,7° tegenover 31,6/28,1°. |
| **R9** | Sectiehoogtes variëren; max/min ≤ **1,6**. | Gemeten 908 / 588 = **1,54**. |
| **R10** | Sectiegrenzen zijn kleuruitdovingen of gemeten leegtes, geen lijnen. | Gemeten nul horizontale scheidingslijnen tussen secties; de enige harde kleurnaad ligt **binnen** B07/B08 op yrel 241,3. |
| **R11** | **Verboden reeks:** vier secties achter elkaar die alle vier een tweedeling tussen 46/54 en 54/46 dragen, dezelfde containerbreedte delen en nul overlap hebben. | Gemeten in de B2-kandidaat: zes splitsingen binnen 4 procentpunt van half-half, twaalf keer dezelfde inhoudsbox, 5 secties zonder overlap. |

**Toegestane paren achter elkaar** (gemeten in Master v1): B04 → B05, B07 → B08, B10 → B11. Alle andere herhalingen van dezelfde familie achter elkaar zijn niet gemeten en dus niet toegestaan zonder besluit.

---

## §6 · Selectietabel per pagina-archetype

De bouwtypes zijn bevroren (`vibe-page-archetypes-v1.md §4.1`): B1..B7 + S2. Deze tabel vervangt geen ritmepatroon uit V1.1 §6.3; hij vertaalt het naar blauwdrukken.

| Archetype | Opening | Werkblauwdrukken | Slot | Uitgesloten |
|---|---|---|---|---|
| **B1 Startpagina** | B01 | B02 · B03 · B04+B05 · B06 · B07+B08 · B09 | B10 → B11 | — (dit **is** de referentie; niet herbouwen) |
| **B2 Propositiepagina** | B01 | B07 · B02 · B04 · B05 · B03 · B09 of B13 · B06 | B10 → B11 | B14 zonder besluit |
| **B3 Casepagina** | B01 | B04 · B03 · B08 · B05 · B02 | B10 → B11 | B13 (een case zonder eigen beeld is geen case) |
| **B4 Indexpagina** | B01 | B02 (lijst als één blok) · B07 · B05 | B10 → B11 | B06 |
| **B5 Standpuntpagina** | B01 | B04 zonder kaart · B05 · B08 · B07 · B02 | B10 → B11 | B09 (vier kaarten op beeld is te veel gewicht voor proza) |
| **B6 Conversie-instrument** | gereduceerde opening, **geen** B01 | B06 (het instrument op sectieschaal) · B07 · B15 | **geen B10** | B01 · B03 · B10 |
| **B7 Juridisch document** | geen beeldopening | B15 (uitsluitend geverifieerde gegevens) | B11 | B01 · B03 · B08 · B09 · B10 |
| **S2 Verkoopdocument** | n.v.t. | n.v.t. — `report.css` rekent in `mm`, niet in `cqw` | n.v.t. | alle |

---

## §7 · Wat ik NIET heb gemeten

| Onderwerp | Reden |
|---|---|
| Contrastwaarden van witte tekst of witte kaarten op beeld | Het harnas meet geometrie, geen contrast. Dit raakt B01, B03, B08, B09, B10 en vooral **B13** (wit op een getekend vlak). |
| De vier animaties in B06 | Als CSS-declaratie gelezen; de render is stilstaand gemeten. |
| Gedrag onder 1200px, behalve de meting op exact 1199px | Alle responsieve uitspraken in dit document steunen op 1774 / 1440 / 1199. Onder 768px zijn uitsluitend CSS-regels geciteerd, geen metingen. |
| B12, B13, B14, B15 als render | Vier varianten, **BEREKEND** uit gemeten waarden. Geen van de vier is als pagina gerenderd en opgemeten. |
| Byte-identiteit met `aae26bf` | Aangeleverd als bewijs; `git diff` is in deze sessie niet gedraaid. |
| De hoekwaarde van het vijfhoekvlak in B06 | De hoekdetectie van het harnas slaat die clip over; de punt staat wel vast op (−0,6%, 46%). |
| Of de 55,8px-overschrijding in B04 bedoeld is | Gemeten feit tegenover een eigen notitie (`home-process.css:118`, "rechterrand gelijk aan de foto"). Welke van de twee waar moet zijn, is een besluit — **DR-V-B1**. |

---

## §8 · Open besluiten

Elk besluit volgt uit een gemeten spreiding of een gemeten tegenspraak. Geen ervan is een voorstel om nu iets te wijzigen. De `B`-nummering hoort bij dít document en botst daarmee niet met de `DR-V-01..10` uit de forensicsnotitie of met de `DR-C-xx` uit V1.1.

- **DR-V-B1 — Kaart kruist beeldrand.** B04 kruist gemeten 55,8px voorbij rechts en 8,1px onder, terwijl `home-process.css:118` "rechterrand gelijk aan de foto" claimt. Wordt de overschrijding het vastgelegde middel van M4 BAND (met een bandbreedte, bijvoorbeeld 40–60px), of wordt de kaart naar de notitie gecorrigeerd? Zolang dit open staat kan een tweede bouwer B04 niet reproduceren.
- **DR-V-B2 — Spiegelen.** B12 en B14 breken de gemeten vaste linkerrand (spreiding 19px over zeven secties) of de gemeten rechtermarge (31–84px). Mogen gespiegelde blauwdrukken bestaan, en zo ja: één per pagina (R6) of nul?
- **DR-V-B3 — Ondergrens overlap.** R3 zet "informatievlak op een beeld" op ≥ 50% van de secties; gemeten is 67% (6 van 9). Wordt de norm de gemeten waarde of de helft?
- **DR-V-B4 — B13 zonder foto.** Een getekend draagvlak onder vier witte kaarten vraagt een minimale donkerte die ik niet heb gemeten. Welke contrastwaarde wordt de ondergrens, en wie meet hem?
- **DR-V-B5 — Bandhoogte van B07.** De gemeten band is 241,3px op een sectie van 887px = 27,2%, en is volgens het commentaar teruggebracht van 17,7 naar 13,6cqw omdat de rechterhelft leeg bleef (`home-proof.css:36-38`). De toets in B07 verwijst daarom naar dat proces en niet naar een getal. Wordt er alsnog een harde grens vastgelegd — een percentage van de sectiehoogte, een vaste `cqw`-waarde — of blijft "zo laag als het bewijs toelaat" de regel, die alleen te toetsen is aan een vastgelegde verlaging?
- **DR-V-B6 — Sectie zonder uitgang.** B04+B05 heeft gemeten nul `<a>`. Mag een conversiepagina (B2, B6) een sectie zonder uitgang dragen, of geldt die vrijheid alleen voor B1 en B5?
- **DR-V-B7 — Welke hoogte is "de sectie".** Mijn meting geeft sectie 4 een boxhoogte van 599px en zet sectie 5 op y3160; de aangeleverde forensics meet 624 respectievelijk 3186. Het verschil van 25–26px zit volledig in de hoogte van de stappenrij (gemeten 128,7px per stap) en schuift alle latere secties op. Welke meting is de referentie voor het ritme in R9?
- **DR-V-B8 — B15 variant A.** Gemeten komt de gelijkverdeelde bewijsband precies één keer voor, direct onder de opening. Wordt "maximaal één per pagina, altijd onder de opening" een regel, of mag hij ook elders?

---

## Verantwoording

Gemeten in deze sessie met een eigen harnas op `http://127.0.0.1:8033/index.html`, viewports 1774 × 950, 1440 × 950 en 1199 × 950, na volledige scroll:

1. **Rechthoeken** van elk `.vh-*`-element, elke `img` en elke `svg` met w ≥ 30 en h ≥ 14, inclusief `z-index` en `position`, per sectie en relatief aan de sectietop.
2. **Woorden en regels** per tekstblok (eyebrow, kop, lead, kaart, stap, cel) op 1774px.
3. **Graad, regelafstand, tracking en gewicht** van 31 tekstblokken, plus de dichtheid per sectie (`a`, `img`, `svg`, `br`, koppen).
4. **Visuele inspectie** van alle negen sectieafdrukken op 1774px.

Waar een getal uit het aangeleverde `home-forensics.json` komt staat **(json)**; waar het uit een CSS-regel komt staat `bestand:regel`; waar het uit een spiegeling of een overgenomen blokmaat volgt staat **BEREKEND**. Er is geen productiebestand gewijzigd, geen bestaand document aangepast, niets gecommit en niets gepusht.
