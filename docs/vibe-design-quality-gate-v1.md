> **STATUS V1.3 — BEWIJSBIJLAGE, NIET NORMATIEF.**
> Dit document is V1.2. Zijn forensische metingen blijven geldig als BEWIJS; zijn regels en
> poorten zijn **niet aanvaard** en zijn vervangen door `docs/04-visual-language-v1.3.md`.
> Zie `docs/00-changelog.md` §3 voor de reden en §4 voor de twee intrekkingen.

# Vibe Web Design System V1.2 — paginacompositiekaart, herhalingstoets en quality gate

**Status:** toetsdocument **V1.2-concept**. Er is in deze sessie geen HTML, CSS, asset of JS gewijzigd;
er is uitsluitend dit ene bestand onder `docs/` geschreven. Niets gecommit, niets gepusht.

**Bron van waarheid:** Homepage Master v1, commit `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1`
("feat: lock homepage master v1"). `git diff aae26bf -- index.html 'home*.css'` is in deze sessie
gedraaid en **leeg** — de werkboom is byte-identiek aan die commit.

**Tegenvoorbeeld:** de B2-kandidaat `systeem-energieopslag.html` in de werkboom, 40 565 bytes,
sha256 `dc3dc96ccdd6be04…`, mtime 2026-10-01 20:15:10. Dit bestand staat als `M` in `git status`;
alle B2-waarden hieronder gelden voor **die werkboomversie**, niet voor een commit.

| | |
|---|---|
| Meetbreedte | 1774px primair, controle op 1440px |
| Server | `http://127.0.0.1:8033/index.html` en `.../systeem-energieopslag.html` |
| Eigen harnas | `scratchpad/v12/poorten.mjs` (afgeleid van `forensics.mjs`), gedraaid 2026-10-02 01:0x op beide pagina's, beide breedtes → `home-poorten.json`, `b2-poorten.json` |
| Aangeleverd bewijs | `forensics-homepage.md`, `home-1774-1440-1199.txt`, `b2-1774-1440-1199.txt`, `home-forensics.json`, `b2-forensics.json`, `shots/home/*.png`, `shots/b2/*.png` |
| Zelf bekeken afdrukken | **twee**: `shots/home/07-energie-infrastructuur.png` en `shots/b2/07-techniek.png` (verkleind naar 900px). De overige zeven homepagesecties zijn in `forensics-homepage.md` bekeken, niet door mij — **NIET ZELF BEKEKEN** |

Elke regel in dit document is een getal, een verhouding, een telling of een waarneembaar ja/nee.
Waar iets niet gemeten kon worden staat **NIET GEMETEN** met de reden. Het document stelt geen
wijziging aan bestaande bestanden voor; waar een bestaand bestand afwijkt van een poort staat dat
als open besluit in §5.

### 0.1 Twee correcties op het aangeleverde bewijs

| Aangeleverd | Eigen meting | Gevolg |
|---|---|---|
| `forensics-homepage.md` §10 rij 3: B2 heeft **50** overlapparen | De reeks in hetzelfde document (17·0·0·2·1·11·2·0·0·17·2) telt op tot **52**; mijn eigen run meet 52 | Rekenslip in de optelling; de reeks zelf klopt. Dit document gebruikt **52** |
| `forensics-homepage.md` §11: hoekwaarde van `.vh-ctrl::before` **NIET GEMETEN** | Het oude harnas doorzoekt alleen de afstammelingen van een sectie, niet het sectie-element zelf. Met die uitbreiding meet ik **88,1 · 87,3 · 27,3 · 32,1°** (`home-control.css:35-45`) | De twee bijna-horizontale randen (>85°) tellen niet als merkhoek; 27,3 en 32,1° wel. De pagina heeft dus **13** geometrie-elementen in **8 van 9** secties, niet 12 in 7 |

---

## DEEL 1 — PAGINACOMPOSITIEKAART

### 1.1 Wat de kaart is

De paginacompositiekaart wordt **vóór het coderen** ingevuld, één rij per sectie, elf velden per
rij. Zonder ingevulde kaart draait de quality gate van DEEL 3 niet: zeven van de zestien poorten
lezen rechtstreeks uit de kaart. De kaart is een belofte; de gate meet achteraf of de bouw die
belofte haalt. Verschilt de gemeten waarde van de kaartwaarde met meer dan de marge in §1.2, dan
is dat een afwijking die genoemd moet worden — niet stilzwijgend de kaart aanpassen.

### 1.2 De elf velden

| # | Veld | Wat je invult | Eenheid / vocabulaire | Marge kaart ↔ meting | Poort die dit veld leest |
|---|---|---|---|---|---|
| 1 | **impact** | rang van de sectie op de pagina (1 = zwaarst, uniek per sectie) + de dominante zone als % van het sectievlak | rang 1..n; % = (breedte%vw × hoogte%sectieh) / 100 | ±5 procentpunt | P-14, P-16 |
| 2 | **blauwdruk** | de structurele skeletnaam + de gemeten verdeling | CB-naam uit §1.3 + aandelen in % | ±2 procentpunt | P-07, P-10, herhalingstoets T1/T2 |
| 3 | **beeldbehandeling** | M-code + beeldbreedte als %vw + masker ja/nee + bleedzijde | M0..M6 (vaste taxonomie); %vw; `L`/`R`/`LR`/`—` | ±2 procentpunt | P-05, P-06, herhalingstoets T4 |
| 4 | **kaartbehandeling** | K-code(s) + aantal + gelijk/ongelijk + hoeveel % van elk vlak op een beeld ligt | K1..K8 (vaste taxonomie); aantal; % dekking | ±5 procentpunt | P-04, P-09, herhalingstoets T3 |
| 5 | **grond** | de computed achtergrond van de sectie, voluit | `rgb(...)` of `linear-gradient(...)` | exact | herhalingstoets T5 |
| 6 | **breedtegedrag** | de rekeneenheid + de sectiefactor hoogte@1440 ÷ hoogte@1774 + het breekpunt | `cqw`/`px`/`%`; factor op 4 decimalen; px | ±0,0010 | P-01, P-02 |
| 7 | **randgedrag** | aantal elementen dat de linker- en de rechterschermrand raakt, en wélk element | `L<n>/R<n>` + elementnaam | exact | P-11 |
| 8 | **overlap** | aantal overlappende elementparen + aantal informatievlakken (≥150×80px) dat op een beeld ligt | twee tellingen | ±10% op het parenaantal, exact op de vlakken | P-03, P-04 |
| 9 | **geometrie** | aantal geometrie-elementen + elke gemeten hoek + familie | aantal; graden vanaf de verticaal; `scherp`/`flauw`/`uitzondering` | ±0,5° | P-12, P-13 |
| 10 | **overgang in** | het kleurverschil met de vorige sectie in digits per kanaal + de witruimte in px | digits; px | ±2 digits, ±5px | — (leesveld voor de review) |
| 11 | **overgang uit** | idem naar de volgende sectie | digits; px | ±2 digits, ±5px | — (leesveld voor de review) |

**Meetvoorschriften bij de velden.**

- *Dominante zone (veld 1)* = de grootste aaneengesloten zone van de sectie (beeld, paneel of
  gebouwd object), als percentage van breedte × hoogte van het sectievlak.
- *Inhoudskader (veld 2)* = de breedste zichtbare wrapper die tekst draagt, ≥ 2 elementkinderen
  heeft en **niet** de volle viewportbreedte beslaat. Dit is het getal dat poort P-07 telt.
- *Masker (veld 3)* = een `clip-path: polygon(...)` op het beeldvlak of zijn directe ouder. Een
  `border-radius` is géén masker.
- *Informatievlak (veld 8)* = een element met een eigen oppervlak (achtergrondkleur, schaduw of
  rand), minstens 150px breed en 80px hoog, waarvan ≥ 50% van het oppervlak op een zichtbare foto
  ligt. Knoppen, chips en bijschriften vallen bewust buiten die maat.
- *Hoek (veld 9)* = de hoek van elke vrije polygoonrand vanaf de verticaal. Randen binnen 5° van de
  verticaal of van de horizontaal tellen niet mee.

### 1.3 Vocabulaire voor veld 2 (blauwdruk)

Acht skeletten, elk afgeleid uit één homepagesectie en elk met zijn gemeten verdeling. De
`CB-`prefix is bewust eigen aan dit document: `docs/vibe-section-blueprints-v1.md` bestaat in deze
werkboom (77 009 bytes, mtime 2026-10-02 01:01) maar is in deze sessie **niet gelezen**; of de
namen moeten samenvallen is DR-V-70.

| CB | Naam | Gemeten kenmerk | Bron |
|---|---|---|---|
| CB-VOL | vol podium | geen inhoudskader; alles absoluut; beeld = sectiecanvas | S1 |
| CB-KADER | kader met tweedeling | één kader, tweedeling met lichtste zijde 25–40% | S2 (30,9/69,1), S7 (34,0/66,0) |
| CB-PANEEL | paneel | één paneel dat één schermrand uitloopt; geen raster | S3 |
| CB-DIAGONAAL | tweedeling op een diagonaal | twee zones boven, gelijke steekrij onder, diagonale ondergrond | S4 |
| CB-GESPIEGELD | gespiegeld | object links, tekst rechts; lichtste zijde 45–48% | S5 (47,2/52,8) |
| CB-ZONES | overlappende zones | drie of meer zones zonder schone kolomnaad | S6 (62px en 42px overlap) |
| CB-CHEVRON | chevron | de scheiding tussen tekst en beeld is een punt, geen lijn | S8 (punt op x839, y55,75%) |
| CB-STEEK | zones met afnemende steek | vier of meer zones, geen twee steken gelijk | S9 (372/226/212/194) |

### 1.4 Ingevulde kaart — Homepage Master v1 @1774px

Alle waarden hieronder zijn gemeten (eigen run `poorten.mjs` + `forensics-homepage.md`), niet
ontworpen. Dit is de kaart die een nieuwe pagina moet kunnen evenaren.

#### S1 — HERO (`div.vh`), y 0…908, h 908

| veld | waarde |
|---|---|
| impact | **rang 1**; dominante zone = het beeld, 100% vw × 82,4% sectieh = **82,4%** van het sectievlak; beeld : tekst = 1774 : 504 = 3,5 : 1 |
| blauwdruk | **CB-VOL** — geen inhoudskader om de sectie; breedste tekstdragende wrapper = de KPI-band, **1740px** (`98.084cqw`, `home-hero.css:335-341`), raster 33,3/33,3/33,3 |
| beeldbehandeling | **M1 PODIUM** — 1774×748, **100% vw**, ratio 2,37, masker **ja** (`polygon`, 32,8°/34,4°, `home-hero.css:57-64`), bleed **LR** |
| kaartbehandeling | geen kaart. **K7 BEWIJSBAND**: 3 cellen × 580px, 1px `#DCE7F3` van 69px (`home-hero.css:353-360`). 3 knopvlakken r10. Gelijke kaartrij: **geen** |
| grond | `rgb(255,255,255)` lopend naar `#EAF4FE` op 11,2299% (= 84px, exact de headerhoogte) en `#E7F4FC` (`home-hero.css:42-46`); KPI-band eigen horizontaal verloop `#F7FCFF → #FDFDFE` (`home-hero.css:331`) |
| breedtegedrag | `cqw`; sectiefactor **737 ÷ 908 = 0,8117**; breekpunt 1199px → apart mobiel ontwerp |
| randgedrag | **L8 / R11** — `div.vh-stage`, `div.vh-foto`, `img`, `div.vh-band`, `svg`, `div.vh-wig`; het beeld raakt beide randen; de header ligt ín het podium (84px, z10, `home-hero.css:137-146`) |
| overlap | **158 overlapparen** (hoogste van de pagina); **0** informatievlakken ≥150×80 op het beeld — de witte tekst rechts rust op de SVG-navyvorm (`index.html:120-121`), niet op een kaart |
| geometrie | **3** clip-elementen: foto 32,8/34,4°, band 34,4°, wig 32,8/34,4° — alle **scherp**; plus 2 SVG-vormen (accentdriehoek 35,8°, navyvorm met de enige `a90`-knik van de pagina) |
| overgang in | paginatop; geen losse navigatiebalk boven de compositie |
| overgang uit | `#FDFDFE → #FCFDFE` = **1 digit per kanaal**; geen lijn, geen marge |

#### S2 — OPLOSSINGEN (`section#oplossingen.vh-sol`), y 908…1797, h 889

| veld | waarde |
|---|---|
| impact | **rang 8**; dominante zone = de grote mediakaart, 487×498 = **24,2%** van het sectievlak |
| blauwdruk | **CB-KADER** — inhoudskader **1133px**; tweedeling **30,9 / 69,1** (`home-solutions.css:28`); twee rijen met verschillende kolomverdelingen (45,1/27,9/27,0 en 32,8/31,2/31,4), naden verspringen **116px** resp. **65px** |
| beeldbehandeling | **M5 KAARTBEELD** — 5 foto's, breedste 487px = **27,5% vw**, masker **nee** (0 van 5), bleed **—** |
| kaartbehandeling | **K1 MEDIAKAART ×6** (r10, schaduw `rgba(23,84,150,.10) 0 9,93 25,90`, `home-solutions.css:152`) + **K8 ICOONREGEL ×3**. Gelijk: **nee** (487 : 302 : 292 = 1,61 : 1,00 : 0,97). Op een beeld: **0%** — alle tekst zit ín de kaart |
| grond | `rgb(252,253,254)` (`home-solutions.css:13`) |
| breedtegedrag | `cqw`; sectiefactor **722 ÷ 889 = 0,8121** |
| randgedrag | **L1 / R1** (alleen het sectie-element zelf); 70px links, 65px rechts; geen enkel vlak raakt een schermrand |
| overlap | **64 overlapparen**; **0** informatievlakken op een beeld |
| geometrie | **1** element, **25,0°** (`span.vh-sol-grafisch::before`, `home-solutions.css:306-320`) — **uitzondering**, de enige waarde buiten beide hoekfamilies; vervangt ontbrekende fotografie |
| overgang in | `#FDFDFE → #FCFDFE`, naadloos |
| overgang uit | **0 digits** — S3 heeft exact dezelfde grond; de scheiding komt van het donkere paneel met 100px wit ertussen |

#### S3 — PROJECT IN DE KIJKER (`section#projecten.vh-pr`), y 1797…2562, h 765

| veld | waarde |
|---|---|
| impact | **rang 2**; dominante zone = het paneel, 96,1% vw × 73,9% sectieh = **71,0%** |
| blauwdruk | **CB-PANEEL** — inhoudskader **1704px**; geen raster; tekstkolom absoluut op `left: 4.5318cqw` (`home-project.css:104`), tekstspan **470px = 26,5% vw**, de smalste van de pagina |
| beeldbehandeling | **M2 PANEEL** — 1704×565, **96,1% vw**, ratio 3,02, masker **nee**, radius 63/0/0/63 (`home-project.css:52`), bleed **R** |
| kaartbehandeling | geen zwevende kaart. **K7 BEWIJSBAND**: 120/140/140px, 1px `rgba(255,255,255,.22)` (`home-project.css:148-152`), contentgedreven ongelijk. Knop 235×65 ligt **100%** op het beeld |
| grond | `rgb(252,253,254)` + radiale gloed `#DFEDFD` over de bovenste `11cqw` = 195px (`home-project.css:35-41`) |
| breedtegedrag | `cqw`; sectiefactor **621 ÷ 765 = 0,8118** |
| randgedrag | **L0 / R7** — alleen het paneel en zijn inhoud raken de rechterrand; links staat het paneel op de containermarge van 70px |
| overlap | **42 overlapparen**; **0** informatievlakken ≥150×80 op het beeld — kop, statement, body en knop (4 items) liggen wél op het beeld maar dragen geen eigen vlak |
| geometrie | **0** clip-path-elementen; de geometrie is een inline SVG in paneelcoördinaten 2056×682 met wig **35,9°** (`index.html:478-492`) — **niet** door het clip-harnas gezien, wel met de hand gemeten in `forensics-homepage.md` |
| overgang in | 100px wit op dezelfde grond; radiale gloed kondigt het paneel aan |
| overgang uit | 100px wit, **0 digits** verschil met S4 |

#### S4 — VAN PLAN NAAR PRESTATIE (`section#aanpak.vh-proc`), y 2562…3186, h 624

| veld | waarde |
|---|---|
| impact | **rang 7**; dominante zone = het beeld, 53,9% vw × 47,0% sectieh = **25,3%** |
| blauwdruk | **CB-DIAGONAAL** — inhoudskader **1584px** (de stappenrij); boven absoluut copy 460 \| beeld 956 met 222px gat → lichtste zijde **32,5%**; onder een flexrij van 4×292px met steek **430,7px, exact gelijk** (`home-process.css:152-166`) |
| beeldbehandeling | **M4 BAND** — 956×294, **53,9% vw**, ratio 3,26, masker **nee**, radius 14px, bleed **—** |
| kaartbehandeling | **K2 ZWEVEND INFOVLAK ×1** (338×254, r11,7, dubbele schaduw, `home-process.css:122`) — **81%** van zijn oppervlak op de foto, steekt **56px** voorbij de rechterrand en **8px** onder de onderrand ervan. **K8 ICOONREGEL ×4**, exact gelijk, bewust zonder kaartvlak |
| grond | `rgb(252,253,254)` + diagonale backdrop `#E1F1FE → #E9F5FE → #EFF8FE`, geklipt op **33,7°** (`home-process.css:43-44`) |
| breedtegedrag | `cqw`; sectiefactor **507 ÷ 624 = 0,8125** |
| randgedrag | **L3 / R3** — de backdrop loopt beide randen uit; de kaart stopt 10px vóór de rechterrand |
| overlap | **19 overlapparen** (samen met S6 het laagste van de acht beeldsecties); **1** informatievlak op het beeld |
| geometrie | **1** element, **33,7°**, **scherp**; de diagonaal zit in de ondergrond, niet in het beeld |
| overgang in | naadloos `#FCFDFE → #FCFDFE`; de backdrop begint `1.3866cqw` = 24px onder de sectietop (`home-process.css:40`) en maakt zelf de scheidslijn |
| overgang uit | `#FCFDFE → #EFF7FE` = **14 digits**, de eerste echte kleurtrede van de pagina; 141px witruimte |

#### S5 — VIBE.CONTROL (`section#vibe-control.vh-ctrl`), y 3186…3774, h 588

| veld | waarde |
|---|---|
| impact | **rang 5**; dominante zone = het dashboard, 687×429 = **28,0%** van het sectievlak |
| blauwdruk | **CB-GESPIEGELD** — object links (x78…889 = 811px), copy rechts (x982…1708 = 726px), gat 93px → lichtste zijde **47,2%**, de krapste tweedeling van de pagina; inhoudskader **726px** |
| beeldbehandeling | **M0 GEEN FOTO** — gemeten **0** `img`-elementen; geen uitsnede, geen ratio, geen overlay |
| kaartbehandeling | **K6 APPARAATVLAK ×2** (dashboard 687×429 r13, telefoon 151×308 r18,7) die elkaar **27px** overlappen; ratio 1,60 tegenover 0,49. **K8 ICOONREGEL ×4** van 182px. Op een beeld: n.v.t. |
| grond | `rgb(239,247,254)` (`home-control.css:22`) — het enige eigen sectievlak van de pagina |
| breedtegedrag | `cqw`; sectiefactor **478 ÷ 588 = 0,8129** — de grootste afwijking van de pagina (0,15% boven de laagste sectie) |
| randgedrag | **L1 / R1** (alleen het sectie-element); niets raakt een schermrand: 78px links, 205px rechts tot het laatste vlak |
| overlap | **57 overlapparen**, bijna allemaal binnen het gebouwde object; **0** informatievlakken op een beeld (er is geen beeld) |
| geometrie | **1** element, `.vh-ctrl::before` (`home-control.css:35-45`), randen **88,1 · 87,3 · 27,3 · 32,1°**; de eerste twee zijn bijna-horizontaal en tellen niet mee, 27,3 en 32,1° zijn **scherp** |
| overgang in | `#FCFDFE → #EFF7FE` = 14 digits |
| overgang uit | `#EFF7FE → #FAFCFE` = 11 digits terug naar licht |

#### S6 — PROJECTRESULTAAT (`section#klantverhaal.vh-proof`), y 3775…4662, h 887

| veld | waarde |
|---|---|
| impact | **rang 6**; dominante zone = de foto, 41,4% vw × 62,8% sectieh = **26,0%** |
| blauwdruk | **CB-ZONES** — inhoudskader **634px**; drie zones die elkaar overlappen: verhaal 532 \| foto 734 \| citaatkaart 448, met **62px** en **42px** overlap. Geen enkele kolomnaad is schoon. De sectie is intern in twee banden gesneden op `13.6cqw` = 241px (`home-proof.css:34-46`) |
| beeldbehandeling | **M3 DRAAGVLAK** — 734×557, **41,4% vw**, ratio 1,32, masker **ja** (**13,0°**, flauw, `home-proof.css:224`), bleed **—**; tweede beeld: duimnagel 98×91 |
| kaartbehandeling | vier families op één sectievlak. **K5 LOGOKAART ×2** (289×81 en 197×81, ongelijk) · **K2 ZWEVEND INFOVLAK ×1** (448×374, **9,4%** op de foto) · **K3 STROOK ×1** (629×124, r20, **100%** op de foto) · knop 310×67. Gelijke kaartrij: **geen** |
| grond | band A `rgb(250,252,254)` tot 241px; band B `linear-gradient(112deg, #EDF7FE → #F2F9FE 26% → #ECF6FE 60% → #E3F1FE)` |
| breedtegedrag | `cqw`; sectiefactor **720 ÷ 887 = 0,8117** |
| randgedrag | **L2 / R3** — alleen `span.vh-proof-wig` (85×133, 32,6°) raakt de rechterrand |
| overlap | **19 overlapparen**; **1** informatievlak op het beeld (de strook, 629×124) |
| geometrie | **2** elementen: wig **32,6°** (scherp) en fotosnede **13,0°** (flauw) — de enige sectie met een element uit beide families |
| overgang in | `#EFF7FE → #FAFCFE` = 11 digits |
| overgang uit | `#E3F1FE → #FEFEFE` (linkerkant S7) |

#### S7 — ENERGIE-INFRASTRUCTUUR (`section#energie-infrastructuur.vh-infra`), y 4662…5549, h 887

| veld | waarde |
|---|---|
| impact | **rang 4**; dominante zone = de foto, 62,0% vw × 83,0% sectieh = **51,5%** |
| blauwdruk | **CB-KADER** — inhoudskader **568px**; copy 568 \| foto 1100, naad op x642 met **2px** tussenruimte → lichtste zijde **34,0%**. Kopkolom, lead en de drie voordeelregels zijn exact even breed (568px) over 699px hoogte |
| beeldbehandeling | **M3 DRAAGVLAK** — 1100×736, **62,0% vw**, ratio 1,49, masker **ja** (**9,7°**, de flauwste van de pagina, `home-infra.css:160`), radius 18px, bleed **—** |
| kaartbehandeling | **K4 REGISTERKAART ×4**, elk **422×126**, steek 141,3px (`home-infra.css:228-231`) — **de enige gelijke kaartrij van de pagina**, en alle vier liggen **100%** op de foto. **K8 ICOONREGEL ×3**, knop 220×67 |
| grond | `linear-gradient(100deg, #FEFEFE 0%, #FDFDFE 38%, #F6FAFE 72%, #EAF5FE 100%)` (`home-infra.css:19-20`) |
| breedtegedrag | `cqw` (`height: 50cqw`, `home-infra.css:17`); sectiefactor **720 ÷ 887 = 0,8117** |
| randgedrag | **L0 / R0** — de **enige** sectie van de pagina zonder enig randcontact |
| overlap | **50 overlapparen**; **4** informatievlakken op het beeld — het hoogste aantal van de pagina |
| geometrie | **1** element, **9,7°**, **flauw** |
| overgang in | `#FAFCFE → #FEFEFE`, lichte trede omhoog |
| overgang uit | `#EAF5FE → #FAFCFD`; 185px witruimte, de ruimste onderzone van de pagina |

#### S8 — FINAL CTA (`section#contact-cta.vh-final`), y 5549…6179, h 631

| veld | waarde |
|---|---|
| impact | **rang 3**; dominante zone = het beeld, 52,7% vw × 100% sectieh = **52,7%** |
| blauwdruk | **CB-CHEVRON** — inhoudskader **822px**; de scheiding tussen tekst en beeld is **een punt op x839, y 55,75%**, geen verticaal; bewijsrij `326fr 355fr 294fr` → gemeten 33,5/36,4/30,2 (`home-final.css:221`). Als tweedeling gemeten: copy 674 \| beeld 935 → lichtste zijde **41,9%** |
| beeldbehandeling | **M6 HOEKBEELD** — 935×631, **52,7% vw**, ratio 1,48, **100% sectiehoogte** (het enige beeld van de pagina dat dat doet), masker **ja** (chevron **35,4°/32,7°**, `home-final.css:63-69`), bleed **R** |
| kaartbehandeling | **K2 ZWEVEND INFOVLAK ×1** (305×272, r13,5, **100%** op het beeld, 215px voorbij de chevronpunt). **K8 ICOONREGEL ×3**. Twee knoppen van gelijke hoogte naast elkaar (315×63 en 267×63) — de enige sectie met dat paar |
| grond | `rgb(250,252,253)` (`home-final.css:15-21`) |
| breedtegedrag | `cqw` (`height: 35.5681cqw`, `home-final.css:19`); sectiefactor **512 ÷ 631 = 0,8114** |
| randgedrag | **L1 / R4** — `span.vh-final-blauw` raakt de rechterrand én de onderrand met overschrijding **0 en 0** |
| overlap | **43 overlapparen**; **1** informatievlak op het beeld |
| geometrie | **3** elementen: wig over de volle sectiebreedte **32,7/35,4/35,4/32,6°**, fotochevron **35,4/32,7°**, merkvlak **36,2°** — alle **scherp**, alle drie uit dezelfde familie |
| overgang in | `#EAF5FE → #FAFCFD`, vrijwel naadloos |
| overgang uit | de footer begint direct eronder en herhaalt dezelfde chevron op **19,7%** van de schaal |

#### S9 — FOOTER (`footer.vh-footer`), y 6179…6810, h 631

| veld | waarde |
|---|---|
| impact | **rang 9**; dominante zone = het beeld, 19,7% vw × 83,3% sectieh = **16,4%** |
| blauwdruk | **CB-STEEK** — inhoudskader **1605px**; vijf zones met steken **372 / 226 / 212 / 194px**, geen twee gelijk |
| beeldbehandeling | **M6 HOEKBEELD** — 350×526, **19,7% vw**, ratio **0,67** (het enige staande beeld van de pagina), masker **ja** (chevron **31,6/28,1°**), bleed **R**; gedeeltelijke scrim over de bovenste 58% (`home-footer.css:69-75`) |
| kaartbehandeling | **geen kaartfamilie**; één vlak gemeten (het beeldvlak). Beeld : tekst = 350 : 1610 = **0,22 : 1**, de omgekeerde verhouding van elke andere sectie |
| grond | `linear-gradient(115deg, #EDF6FD → #F7FBFE 26% → #FDFEFF 46% → #F6FAFE 74% → #EFF7FD)` — vijf stops, de rijkste grond van de pagina |
| breedtegedrag | `cqw` (`height: 35.5681cqw`, `home-footer.css:18`); sectiefactor **512 ÷ 631 = 0,8114** |
| randgedrag | **L0 / R2** — alleen het beeld raakt de rechterrand |
| overlap | **2 overlapparen** (het laagste van de pagina); **0** informatievlakken — de notitie 149×100 draagt geen eigen vlak |
| geometrie | **1** element, **31,6/28,1°**, **scherp** |
| overgang in | direct na S8, zonder lijn, eigen verloop onder 115° |
| overgang uit | paginaeinde |

### 1.5 De paginaregel onder de kaart

Negen rijen leveren samen één regel die de gate van DEEL 3 leest:

| grootheid | Homepage Master v1 @1774 |
|---|---|
| secties | 9 |
| impactrangen | 1..9, **uniek**; dominante zones 82,4 · 24,2 · 71,0 · 25,3 · 28,0 · 26,0 · 51,5 · 52,7 · 16,4% → **max/min = 5,02** |
| blauwdrukken | 8 verschillende CB-skeletten op 9 secties (CB-KADER tweemaal: S2 en S7) |
| beeldbehandelingen | M1 · M5 · M2 · M4 · M0 · M3 · M3 · M6 · M6 — **7 van de 7 taxonomiecodes in gebruik** |
| kaartfamilies | K1 · K2 · K3 · K4 · K5 · K6 · K7 · K8 — **8 van de 8 in gebruik** |
| gronden | 9 gronden, waarvan `#FCFDFE` driemaal (S2, S3, S4) |
| sectiefactoren @1440 | 0,8117 · 0,8121 · 0,8118 · 0,8125 · 0,8129 · 0,8117 · 0,8117 · 0,8114 · 0,8114 → **spreiding 0,0015** |
| randcontact | 16 elementen links, 32 rechts; **1** sectie zonder enig randcontact |
| overlapparen | 158 · 64 · 42 · 19 · 57 · 19 · 50 · 43 · 2 = **454**, mediaan **43**, **0** secties met nul |
| informatievlakken op beeld | 0 · 0 · 0 · 1 · 0 · 1 · 4 · 1 · 0 = **7** in **4** secties |
| geometrie | **13** elementen in **8** van 9 secties, **14** unieke hoekwaarden |
| inhoudskaders | 1740 · 1133 · 1704 · 1584 · 726 · 634 · 568 · 822 · 1605 → **9 unieke op 9 secties** |

---

## DEEL 2 — HERHALINGSTOETS

Een pagina wordt afgekeurd **vóór het coderen** als te veel opeenvolgende secties hetzelfde delen.
De toets draait op de ingevulde kaart uit DEEL 1 en herhaalt zich na de bouw op de meting.

### 2.1 De zes kenmerken, elk met meetmethode

| # | Kenmerk | Meetmethode | "Gelijk" betekent |
|---|---|---|---|
| T1 | **breedte** | inhoudskader uit kaartveld 2 (breedste tekstdragende wrapper, ≥2 kinderen, niet volle viewportbreedte) | verschil ≤ **10px** |
| T2 | **splitsing** | lichtste zijde van de hoofdtweedeling: elk gedeclareerd tweekoloms raster ≥ 50% vw, of de twee absoluut geplaatste zones van de sectie | beide secties hebben er één **en** het verschil is ≤ **5 procentpunt** |
| T3 | **kaartstructuur** | elk gedeclareerd raster met ≥ 3 kolommen; vergeleken op kolomaandelen | beide secties hebben er één, met hetzelfde aantal kolommen en elk aandeel ≤ **5 procentpunt** verschil |
| T4 | **beeldbehandeling** | beeldrecept = (breedste beeld in %vw, afgerond op een band van 5 procentpunt) + (masker ja/nee) | beide secties hebben een beeld **en** hetzelfde recept |
| T5 | **grond** | de computed achtergrondwaarde van de sectie, voluit vergeleken | exact gelijke string |
| T6 | **visueel gewicht** | sectiehoogte + aantal kaarten met een eigen oppervlak | hoogteverschil ≤ **2%** **en** gelijk kaartaantal |

### 2.2 Parenmatrix — Homepage Master v1 (8 paren)

| paar | T1 breedte | T2 splitsing | T3 kaartraster | T4 beeld | T5 grond | T6 gewicht | gedeeld |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| S1→S2 | 1740 vs 1133 | S1 geen | 33,3/33,3/33,3 vs 45,1/27,9/27,0 | 100%+masker vs 25-30%+geen | wit vs `#FCFDFE` | 908/889 = 2,1%; 3 vs 7 | **0** |
| S2→S3 | 1133 vs 1704 | S3 geen | S3 geen | 25-30% vs 95-100% | `#FCFDFE` = `#FCFDFE` ✔ | 889/765; 7 vs 2 | **1** |
| S3→S4 | 1704 vs 1584 | S3 geen | beide geen | 95-100% vs 50-55% | `#FCFDFE` = `#FCFDFE` ✔ | 765/624; 2 vs 2 | **1** |
| S4→S5 | 1584 vs 726 | 32,5 vs 47,2 (Δ14,7) | S4 geen | S5 geen beeld | `#FCFDFE` vs `#EFF7FE` | 624/588 = 5,8% | **0** |
| S5→S6 | 726 vs 634 | S6 geen | S6 geen | S5 geen beeld | `#EFF7FE` vs `#FAFCFE` | 588/887 | **0** |
| S6→S7 | 634 vs 568 | S6 geen | beide geen | 40-45%+masker vs 60-65%+masker | `#FAFCFE` vs gradient 100° | 887 = 887 **en** 6 = 6 ✔ | **1** |
| S7→S8 | 568 vs 822 | 34,0 vs 41,9 (Δ7,9) | S7 geen | 60-65% vs 50-55% | gradient vs `#FAFCFD` | 887/631 | **0** |
| S8→S9 | 822 vs 1605 | S9 geen | S9 geen | 50-55% vs 15-20% | `#FAFCFD` vs gradient 115° | 631 = 631 maar 4 ≠ 1 | **0** |

**Uitkomst homepage:** maximaal **1** gedeeld kenmerk per paar; **3** treffers over 8 paren; T5
komt 2× voor, T6 1×, T1/T2/T3/T4 **0×**.

### 2.3 Parenmatrix — B2-kandidaat `systeem-energieopslag.html` (10 paren)

Inhoudskaders gemeten: 1440 · 1280 · 1240 · 1240 · 1240 · 1440 · 1240 · 1240 · 1240 · 1100 · 1440.

| paar | T1 breedte | T2 splitsing | T3 kaartraster | T4 beeld | T5 grond | T6 gewicht | gedeeld |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| S1→S2 | 1440 vs 1280 | S2 geen | 39,4/30,3/30,3 = 39,4/30,3/30,3 ✔ | S2 geen beeld | gradient 162° = gradient 162° ✔ | 789/141 | **2** |
| S2→S3 | 1280 vs 1240 (Δ40) | beide geen | 39,4/30,3/30,3 vs 42,2/28,9/28,9 (Δ≤2,8) ✔ | beide geen beeld | gradient vs `#F6FAFE` | 141/796 | **1** |
| S3→S4 | **1240 = 1240** ✔ | S3 geen | S4 geen | S3 geen beeld | `#F6FAFE` vs `#001632` | 796/939 | **1** |
| S4→S5 | **1240 = 1240** ✔ | 37,0 vs 40,0 (Δ3,0) ✔ | beide geen | S5 geen beeld | `#001632` vs gradient 168° | 939/724 | **2** |
| S5→S6 | 1240 vs 1440 | 40,0 vs 50,0 (Δ10) | 41,3/17,4/41,3 vs 33,3/33,3/33,3 | S5 geen beeld | gradient vs `#F6FAFE` | 724/1348 | **0** |
| S6→S7 | 1440 vs 1240 | 50,0 vs 37,0 | S7 geen | 100% vs 40-45% | `#F6FAFE` vs `#FFFFFF` | 1348/904 | **0** |
| S7→S8 | **1240 = 1240** ✔ | 37,0 vs 43,0 (Δ6,0) | beide geen | S8 geen beeld | `#FFFFFF` vs `#001632` | 904/576 | **1** |
| S8→S9 | **1240 = 1240** ✔ | S9 geen | S9 geen | beide geen beeld | `#001632` vs `#F6FAFE` | 576/516 = 10,4% | **1** |
| S9→S10 | 1240 vs 1100 | S9 geen | 25/25/25/25 vs geen | beide geen beeld | `#F6FAFE` vs `#FFFFFF` | 516/597 | **0** |
| S10→S11 | 1100 vs 1440 | 39,0 vs 35,0 (Δ4,0) ✔ | S11 geen | S10 geen beeld | `#FFFFFF` vs gradient 348° | 597/742 | **1** |

**Uitkomst B2:** maximaal **2** gedeelde kenmerken per paar; **9** treffers over 10 paren; T1 komt
**4×** voor, T2 2×, T3 2×, T5 1×, T4/T6 0×.

### 2.4 De zes grenzen

| regel | grens | Homepage Master v1 | B2-kandidaat |
|---|---|---|---|
| **H-01** | geen twee opeenvolgende secties delen **2 of meer** van de zes kenmerken | max **1** (3 paren met 1, 5 paren met 0) → **PASS** | **2** bij S1→S2 en bij S4→S5 → **FAIL** |
| **H-02** | geen enkel kenmerk komt in **meer dan 2** van de paren voor | T5 2×, T6 1×, rest 0 → **PASS** | **T1 in 4 paren** → **FAIL** |
| **H-03** | geen kenmerk in twee aaneensluitende paren (= drie opeenvolgende secties die hetzelfde delen). Geldt voor **T1, T2, T3, T4** — niet voor T5 en T6 | 0 reeksen op T1–T4 → **PASS** | **drie reeksen**: T3 over S1-S2-S3, T1 over S3-S4-S5, T1 over S7-S8-S9 → **FAIL** |
| **H-04** | geen inhoudskader in **meer dan 3** secties van de pagina | 9 unieke kaders op 9 secties, max **1** → **PASS** | **1240px in 6 van 11 secties** → **FAIL** |
| **H-05** | geen beeldrecept (band 5 procentpunt + masker ja/nee) in **meer dan 2** secties | max **1** (alle acht beeldsecties hebben een eigen recept) → **PASS** | **(40-45%, geen masker) in 3 secties** (S1 44,2 · S4 40,9 · S7 40,9) → **FAIL** |
| **H-06** | geen kopgraad **meer dan 2×** op de pagina | 8 koppen, 8 graden, max **1×** → **PASS** | **44px komt 4× voor**, 32px 2× → **FAIL** |

**De uitzondering in H-03 is gemeten, niet bedacht.** De homepage deelt bij S2→S3 én S3→S4 dezelfde
grond `#FCFDFE`: drie opeenvolgende secties op precies dezelfde kleur. De scheiding wordt daar
gemaakt door het donkere paneel van S3 (`#001632`, 1704×565) met 100px wit erboven en eronder, niet
door een kleurtrede. Een regel die drie gelijke gronden verbiedt zou de bron van waarheid afkeuren;
daarom telt T5 wel mee in H-01 en H-02, maar niet in H-03.

**Het paar S6→S7 is de tweede kalibratie.** Beide secties zijn exact 887px hoog (`height: 50cqw`,
`home-proof.css:18` en `home-infra.css:17`) en hebben beide 6 kaarten. Ze delen verder **niets**:
ander kader (634 vs 568), andere grond, ander beeldrecept (41,4% vs 62,0% vw), andere kaartfamilies
(K5+K2+K3 tegenover K4), ander randgedrag (L2/R3 tegenover L0/R0). Eén gedeeld kenmerk is dus
toegestaan; twee niet.

**Controle: de grens keurt de homepage niet af en de B2-kandidaat wel.**
Homepage 6 van 6 regels PASS. B2-kandidaat 0 van 6 regels PASS.

---

## DEEL 3 — VIBE DESIGN QUALITY GATE

### 3.1 Hoe de poort draait

1. Vul de paginacompositiekaart (DEEL 1) in. Zonder kaart geen gate.
2. Draai de herhalingstoets (DEEL 2) op de kaart. Eén FAIL = terug naar de kaart, niet coderen.
3. Bouw.
4. Draai het harnas uit bijlage A op 1774px en 1440px.
5. Loop de zestien poorten hieronder langs. **Eén FAIL = de pagina is niet af.**

Een poort heet **scheidend** als hij de B2-kandidaat tegenhoudt, en **borg** als hij beide pagina's
doorlaat en alleen een ondergrens bewaakt. De gate telt 14 scheidende poorten en 2 borgen.

### 3.2 De poorten

Alle waarden @1774px tenzij anders vermeld. "Home" = Homepage Master v1, "B2" = de kandidaat.

#### P-01 · Paginacoherentie — *pagina, scheidend*

| | |
|---|---|
| **Meetmethode** | `pageH@1440 ÷ pageH@1774`, vergeleken met `1440 ÷ 1774 = 0,811725` |
| **Grenswaarde** | afwijking ≤ **1,0%** |
| **Home** | 5528 ÷ 6810 = **0,811747** → afwijking **0,003%** — **PASS** |
| **B2** | 7511 ÷ 8499 = **0,883751** → afwijking **8,87%** — **FAIL** |

#### P-02 · Spreiding van de sectieschaalfactoren — *pagina, scheidend*

| | |
|---|---|
| **Meetmethode** | per sectie `hoogte@1440 ÷ hoogte@1774`; grootste minus kleinste |
| **Grenswaarde** | spreiding ≤ **0,0050** |
| **Home** | 0,8117 · 0,8121 · 0,8118 · 0,8125 · 0,8129 · 0,8117 · 0,8117 · 0,8114 · 0,8114 → spreiding **0,0015** — **PASS** |
| **B2** | 0,9012 · 0,9574 · 0,8844 · 0,8626 · 0,8771 · 0,8732 · 0,9004 · 0,9080 · 0,8702 · 0,9146 · 0,8194 → spreiding **0,1380** — **FAIL** |

#### P-03 · Overlappende vlakken per sectie — *sectie, scheidend*

| | |
|---|---|
| **Meetmethode** | per sectie: aantal paren zichtbare elementen > 28×28px die elkaar over > 8×8px overlappen zonder elkaars (voor)ouder te zijn |
| **Grenswaarde** | **elke** sectie ≥ 1 paar **én** de mediaan over de pagina ≥ **15** |
| **Home** | 158 · 64 · 42 · 19 · 57 · 19 · 50 · 43 · 2 — nulsecties **0 van 9**, mediaan **43** — **PASS** |
| **B2** | 17 · 0 · 0 · 2 · 1 · 11 · 2 · 0 · 0 · 17 · 2 — nulsecties **4 van 11**, mediaan **2** — **FAIL** |

#### P-04 · Informatievlakken OP een beeld — *pagina, scheidend*

| | |
|---|---|
| **Meetmethode** | tel elementen met een eigen oppervlak (achtergrondkleur, schaduw of rand), ≥ 150px breed én ≥ 80px hoog, waarvan ≥ 50% van het oppervlak op een zichtbare foto van ≥ 10% vw ligt |
| **Grenswaarde** | ≥ **3 secties** per pagina met minstens één zo'n vlak |
| **Home** | 0 · 0 · 0 · 1 · 0 · 1 · 4 · 1 · 0 = **7 vlakken in 4 secties** (`vh-proc-kaart` 338×254, `vh-proof-strip` 629×124, 4× `vh-infra-kaart` 422×126, `vh-final-kaart` 305×272) — **PASS** |
| **B2** | **1 vlak in 1 sectie** (`p.st-techniek-bij` 246×100). De overige op-beeld-elementen zijn labels: `st-systeem-chip` 316×48 en `st-paneel-tag` 206×32 — onder de maat — **FAIL** |
| **Losser gemeten** | met de ruime maat (eigen oppervlak, ≥ 60×24px): Home **11** vlakken in 6 secties, B2 **3** in 3 secties. Met tekst meegeteld: Home **39** items, B2 **6** |

#### P-05 · Beeldschaal — *pagina, scheidend*

| | |
|---|---|
| **Meetmethode** | breedte van elk beeld als % van de viewportbreedte |
| **Grenswaarde** | ≥ 1 beeld ≥ **90% vw** **én** ≥ **3** beelden ≥ **50% vw** |
| **Home** | breedste **100%** (S1); ≥50%: 100 · 96,1 · 62,0 · 53,9 · 52,7 = **5 beelden** — **PASS** |
| **B2** | breedste **100%** (S6); ≥50%: **1 beeld**; de overige vier staan op 44,2 · 40,9 · 40,9 · 38,2% — **FAIL** |

#### P-06 · Beeldmaskers — *pagina, scheidend*

| | |
|---|---|
| **Meetmethode** | aandeel beeldsecties waarin het beeldvlak of zijn directe ouder een `clip-path: polygon(...)` draagt |
| **Grenswaarde** | ≥ **50%** van de beeldsecties |
| **Home** | **5 van 8** = 62,5% (S1 32,8/34,4° · S6 13,0° · S7 9,7° · S8 35,4/32,7° · S9 31,6/28,1°) — **PASS** |
| **B2** | **0 van 5** = 0% — **FAIL** |

#### P-07 · Inhoudskaders — *pagina, scheidend*

| | |
|---|---|
| **Meetmethode** | per sectie de breedste tekstdragende wrapper met ≥ 2 elementkinderen die niet de volle viewportbreedte beslaat; tel de unieke waarden en de grootste groep |
| **Grenswaarde** | unieke kaders ÷ secties ≥ **0,70** **én** geen kader in meer dan **3** secties |
| **Home** | 1740 · 1133 · 1704 · 1584 · 726 · 634 · 568 · 822 · 1605 → **9/9 = 1,00**, grootste groep **1** — **PASS** |
| **B2** | 1440 · 1280 · 1240 · 1240 · 1240 · 1440 · 1240 · 1240 · 1240 · 1100 · 1440 → **4/11 = 0,36**, grootste groep **6** (1240px) — **FAIL** |

#### P-08 · Spreiding van de kopgraden — *pagina, scheidend*

| | |
|---|---|
| **Meetmethode** | `font-size` van elke `h1`/`h2` in de secties |
| **Grenswaarde** | (i) unieke graden ÷ koppen ≥ **0,85**; (ii) grootste H2 ÷ kleinste H2 ≤ **1,35**; (iii) geen graad vaker dan **2×** |
| **Home** | 76,5 · 61,5 · 58,3 · 64 · 54 · 53 · 61 · 66 → (i) **8/8 = 1,00** ✔ (ii) 66 ÷ 53 = **1,245** ✔ (iii) max **1×** ✔ — **PASS** |
| **B2** | 62 · 44 · 44 · 49 · 54 · 44 · 44 · 32 · 32 · 60 → (i) **6/10 = 0,60** ✘ (ii) 60 ÷ 32 = **1,875** ✘ (iii) **44px 4×**, 32px 2× ✘ — **FAIL (3 van 3)** |

#### P-09 · Gelijke kaartrasters — *pagina, half scheidend*

| | |
|---|---|
| **Meetmethode** | (a) aantal secties met ≥ 3 kaarten waarvan de breedte binnen 5px gelijk is; (b) per zo'n rij: ligt hij op een beeld? |
| **Grenswaarde** | (a) ≤ **1** sectie per pagina **én** nooit in twee opeenvolgende secties; (b) de rij ligt op een beeld — het harnas toetst dat die sectie ≥ **3** informatievlakken op een beeld heeft (K4 REGISTERKAART) |
| **Home** | (a) **1** (S7, 4×~420px) ✔ (b) alle vier liggen **100%** op de foto, informatievlakken = 4 ✔ — **PASS** |
| **B2** | (a) **1** (S4, 4×~645px) ✔ (b) de rij ligt in een rastercel, **0** op een beeld ✘ — **FAIL op (b)** |

#### P-10 · Lichtste zijde van elke tweedeling — *sectie, scheidend*

| | |
|---|---|
| **Meetmethode** | voor elk gedeclareerd tweekoloms raster ≥ 50% vw en voor elke absoluut geplaatste tweezone-indeling: het aandeel van de smalste zijde in de som van beide zijden |
| **Grenswaarde** | lichtste zijde ≤ **47,5%** — geen enkele tweedeling mag 50/50 benaderen |
| **Home** | 30,9 (S2) · 32,5 (S4) · 47,2 (S5) · 34,0 (S7) · 41,9 (S8) → maximum **47,2%** — **PASS**, met **0,3 procentpunt marge** |
| **B2** | 42,0 (S1) · 37,0 (S4) · 40,0 (S5) · **50,0 (S6, `div.st-steun`, 1280px breed)** · 37,0 (S7) · 43,0 (S8) · 39,0 (S10) · 35,0 (S11) — **FAIL** |
| **Let op** | de marge van 0,3 procentpunt op de homepage is dun. Zie DR-V-71 |

#### P-11 · Randcontact — *sectie en pagina, scheidend*

| | |
|---|---|
| **Meetmethode** | per sectie: aantal zichtbare elementen waarvan `left ≤ 1,5px` of `right ≥ viewport − 1,5px` |
| **Grenswaarde** | ≤ **1** sectie per pagina zonder enig randcontact **én** ≥ **3** secties waarin een **beeld** de rand raakt |
| **Home** | L/R per sectie: 8/11 · 1/1 · 0/7 · 3/3 · 1/1 · 2/3 · 0/0 · 1/4 · 0/2 → **1** sectie zonder (S7) ✔; beelden aan de rand in S1 (LR), S3 (R), S8 (R), S9 (R) = **4** ✔ — **PASS** |
| **B2** | 1/3 · 0/0 · 0/0 · 3/0 · 0/2 · 2/2 · 0/3 · 0/4 · 0/0 · 0/0 · 0/2 → **4** secties zonder (S2, S3, S9, S10) ✘; beelden aan de rand: 5 ✔ — **FAIL op het eerste deel** |

#### P-12 · Hoeken binnen de merkfamilie — *pagina, borg*

| | |
|---|---|
| **Meetmethode** | elke vrije polygoonrand van elk zichtbaar element, het sectie-element en de pseudo-elementen, gemeten vanaf de verticaal; randen binnen 5° van verticaal of horizontaal tellen niet |
| **Grenswaarde** | elke waarde in **scherp 27–37°** of **flauw 9–14°**; maximaal **1** benoemde uitzondering per pagina |
| **Home** | 14 unieke waarden: 9,7 · 13,0 \| 25,0 \| 27,3 · 28,1 · 31,6 · 32,1 · 32,6 · 32,7 · 32,8 · 33,7 · 34,4 · 35,4 · 36,2 → **13 in familie, 1 uitzondering** (25,0°, `span.vh-sol-grafisch::before`, benoemd als fotovervanger in `home-solutions.css:303-305`) — **PASS** |
| **B2** | 1 unieke waarde: **34,0°**, viermaal — in familie, 0 uitzonderingen — **PASS** |
| **Oordeel** | deze poort houdt de kandidaat **niet** tegen; hij bewaakt alleen dat niemand een vreemde hoek introduceert. De spreiding wordt door P-13 bewaakt |

#### P-13 · Geometriedichtheid en -spreiding — *pagina, scheidend*

| | |
|---|---|
| **Meetmethode** | aantal geometrie-elementen (clip-path op element, sectie of pseudo), het aandeel secties met minstens één, en het aantal unieke hoekwaarden |
| **Grenswaarde** | geometrie in ≥ **60%** van de secties **én** ≥ **4** unieke hoekwaarden per pagina |
| **Home** | **13** elementen in **8 van 9** secties = **89%**; **14** unieke waarden — **PASS** |
| **B2** | **4** elementen in **4 van 11** secties = **36%**; **1** unieke waarde (viermaal hetzelfde `::after` op een mediablok) — **FAIL (2 van 2)** |

#### P-14 · Spreiding van de sectiehoogtes — *pagina, scheidend*

| | |
|---|---|
| **Meetmethode** | hoogste ÷ laagste sectiehoogte; plus de laagste sectiehoogte als % van de viewportbreedte |
| **Grenswaarde** | hoogste ÷ laagste ≤ **2,0** **én** geen sectie lager dan **25% vw** |
| **Home** | 908 · 889 · 765 · 624 · 588 · 887 · 887 · 631 · 631 → **908 ÷ 588 = 1,54** ✔; laagste 588 = **33,1% vw** ✔ — **PASS** |
| **B2** | 789 · 141 · 796 · 939 · 724 · 1348 · 904 · 576 · 516 · 597 · 742 → **1348 ÷ 141 = 9,56** ✘ (zonder de 141px-snapshotstrook nog **1348 ÷ 516 = 2,61** ✘); laagste 141 = **7,9% vw** ✘ — **FAIL** |

#### P-15 · Handgezette regelval — *pagina, scheidend*

| | |
|---|---|
| **Meetmethode** | aandeel koppen met minstens één `<br>` in de koptekst |
| **Grenswaarde** | ≥ **60%** van de koppen |
| **Home** | **7 van 8** = 87,5% (11 `<br>` in totaal; alleen "Hedin Alkmaar" is één regel) — **PASS** |
| **B2** | **0 van 10** = 0% — alle koppen wrappen zelf — **FAIL** |

#### P-16 · Tekstspan — *pagina, scheidend*

| | |
|---|---|
| **Meetmethode** | per sectie de afstand van de meest linkse tot de meest rechtse tekstdragende rechthoek; mediaan over de pagina als % vw |
| **Grenswaarde** | mediaan ≥ **80% vw** |
| **Home** | 1619 · 1606 · 470 · 1671 · 1491 · 1620 · 1593 · 1244 · 1610 → mediaan **1606px = 90,5% vw** — **PASS** |
| **B2** | 1244 · 1208 · 1050 · 972 · 1381 · 1280 · 915 · 1406 · 1080 · 940 · 800 → mediaan **1080px = 60,9% vw**; geen enkele sectie ≥ 80% vw, maximum 1406px = 79,3% — **FAIL** |

### 3.3 Eindtelling

| | Homepage Master v1 | B2-kandidaat |
|---|---|---|
| Herhalingstoets (DEEL 2) | **6 van 6 PASS** | **0 van 6 PASS** |
| Quality gate (DEEL 3) | **16 van 16 PASS** | **1 van 16 PASS** (alleen P-12, de borg) |
| **Eindoordeel** | **DOOR** | **AFGEKEURD** |

De B2-kandidaat valt op elke scheidende poort. De scherpste drie, in volgorde van grootte van het
verschil: **P-04** (7 informatievlakken op een beeld in 4 secties tegenover 1 in 1), **P-13** (14
unieke hoekwaarden tegenover 1) en **P-07** (9 unieke inhoudskaders op 9 secties tegenover 4 op 11,
waarvan één kader 6× terugkomt).

### 3.4 Wat de poorten samen zeggen

De zestien poorten meten één ding op zestien manieren: **de homepage legt vlakken ÓP beelden en
geeft elke sectie een eigen kader, terwijl de kandidaat beelden NÁÁST tekst in een rastercel zet
binnen één herhaald kader.** Dat is geen smaakoordeel maar de optelsom van 454 tegenover 52
overlapparen, 7 tegenover 1 informatievlak op een beeld, 5 tegenover 0 beeldmaskers, 9 tegenover 4
inhoudskaders en 13 tegenover 4 geometrie-elementen.

---

## 4 · Wat ik NIET heb gemeten

| onderwerp | reden |
|---|---|
| Contrast van tekst op foto's | Het harnas meet geometrie, geen contrast. Geen enkele poort in dit document toetst leesbaarheid; dat is een gat |
| Gedrag onder 1200px | Gemeten op 1774 en 1440. Op 1199 schakelt de homepage naar een apart ontwerp (4 van 9 secties hebben daar 0 overlapparen volgens `home-1774-1440-1199.txt`); de poorten P-03, P-04 en P-11 zijn op die breedte **niet** van toepassing en hebben nog geen mobiele grenswaarde — zie DR-V-72 |
| Animaties | Als CSS-declaratie gelezen, stilstaand afgebeeld; geen poort toetst beweging |
| De SVG-geometrie van S1 en S3 | Het clip-harnas ziet alleen `clip-path`; de inline `<svg>`-vormen (`index.html:97-121`, `:478-492`) zijn in `forensics-homepage.md` met de hand gemeten (35,8° en 35,9°) en zijn in P-12/P-13 **niet** meegeteld. De homepage scoort daar dus eerder te laag dan te hoog |
| B2-sectiekleur en -radius | Ik heb de maskers (0 van 5) en de hoeken (4× 34°) zelf gemeten; de claim "radius 12px op alle B2-beelden" komt uit `forensics-homepage.md` §10 en is door mij **niet** herhaald (de radius staat op de wrapper, op het `img`-element meet ik 0px) |
| Dominante zone van B2-secties zonder beeld | Het harnas leidt de dominante zone af uit het grootste beeld; voor de zes B2-secties zonder beeld is veld 1 van de kaart niet automatisch te vullen. De vijf gemeten waarden zijn 33,0 · 24,5 · 50,1 · 28,8 · 26,2% → max/min **2,04** tegenover 5,02 op de homepage, maar die vergelijking rust op 5 van 11 secties |
| Of de poortgrenzen een dérde pagina doorlaten | Alleen op twee pagina's gekalibreerd. Een grens die precies tussen twee metingen ligt (P-10 met 0,3 procentpunt marge) kan bij een derde pagina te streng blijken |

---

## 5 · Open besluiten

Elk besluit volgt uit een gemeten waarde en is geen voorstel om nu iets te wijzigen. De nummering
sluit aan op DR-V-01 t/m DR-V-10 uit `forensics-homepage.md`.

- **DR-V-70 — CB-namen.** Dit document gebruikt acht eigen skeletnamen (CB-VOL … CB-STEEK) voor
  kaartveld 2. `docs/vibe-section-blueprints-v1.md` bestaat in deze werkboom (77 009 bytes, mtime
  2026-10-02 01:01) maar is in deze sessie niet gelezen. Moeten de namen samenvallen, en welk
  document is dan de eigenaar van het vocabulaire?
- **DR-V-71 — Grenswaarde P-10.** De homepage haalt de grens "lichtste zijde ≤ 47,5%" met 0,3
  procentpunt marge, uitsluitend door S5 (47,2%, object 811 tegenover copy 726). Blijft de grens op
  47,5%, of gaat hij naar 45% met S5 als benoemde uitzondering?
- **DR-V-72 — Mobiele grenswaarden.** P-03, P-04 en P-11 zijn op 1199px niet haalbaar: de homepage
  zelf heeft daar 4 secties met 0 overlapparen. Krijgt de gate een tweede, lagere set grenzen onder
  1200px, of geldt hij alleen boven het breekpunt?
- **DR-V-73 — Het 56px-kruisen in S4.** Poort P-04 beloont dat `vh-proc-kaart` 81% op de foto ligt;
  `home-process.css:118` zegt "rechterrand gelijk aan de foto", terwijl de kaart gemeten 56px
  voorbij de foto en 8px eronder steekt. Wordt de meting de norm (en de notitie dus onjuist) of
  andersom? Dit is DR-V-08 uit het forensicsdocument, nu met een poort eraan vast.
- **DR-V-74 — Aantal secties.** Alle paginagrenzen (P-04 ≥ 3 secties, P-05 ≥ 3 beelden, P-13 ≥ 60%)
  zijn gekalibreerd op een pagina van 9 tot 11 secties. Geldt de gate ongewijzigd voor een pagina
  van 5 secties, of worden de absolute tellingen dan verhoudingsgetallen?
- **DR-V-75 — Contrastpoort.** Er is geen enkele poort die leesbaarheid toetst, terwijl de homepage
  in zes secties tekst op een foto zet en `home-solutions.css:171-175` een eerdere meting van 1,00:1
  vastlegt. Komt er een zeventiende poort, en met welke methode?
- **DR-V-76 — Status van de B2-kandidaat.** `systeem-energieopslag.html` staat als `M` in
  `git status`; de meting geldt voor de werkboomversie van 2026-10-01 20:15:10. Moet de kandidaat
  opnieuw gemeten worden nadat hij is vastgezet, voordat de uitkomst "AFGEKEURD" ergens als
  vaststaand wordt overgenomen?

---

## Bijlage A — meetharnas

Dit harnas telt de poorten automatisch. Het staat **bewust niet in de repo**: het is in deze sessie
gedraaid vanuit `scratchpad/v12/poorten.mjs` tegen `http://127.0.0.1:8033`, en alle waarden in DEEL
1 t/m DEEL 3 komen uit die run. Kopieer het naar een scratchpad, draai het daar, gooi het weg.

Gebruik: `node poorten.mjs index.html home 1774,1440`

```js
/* Poortenharnas — telt de Vibe Design Quality Gate per sectie en per pagina.
   Afgeleid van forensics.mjs. Vereist een draaiende statische server op 8033
   en de playwright-installatie uit ~/.npm/_npx. NIET in de repo zetten. */
import { chromium } from '/Users/mounirvanbinsbergen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:8033/';
const OUT = process.env.OUT || '.';
const pagina = process.argv[2] || 'index.html';
const naam = process.argv[3] || 'home';
const breedtes = (process.argv[4] || '1774,1440').split(',').map(Number);

const browser = await chromium.launch();
const alles = {};

for (const W of breedtes) {
  const ctx = await browser.newContext({ viewport: { width: W, height: 950 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {                       // consent + leadpopup uit, anders dekken ze de hero af
    try {
      localStorage.setItem('vibe_consent_v1', JSON.stringify({ v: 1, analytics: true, marketing: true }));
      const slug = location.pathname.replace(/^\/|\.html$/g, '') || 'index';
      sessionStorage.setItem('vibe_lead_seen_' + slug, '1');
      localStorage.setItem('vibe_lead_done_' + slug, '1');
      sessionStorage.setItem('vibe_lead_seen_index', '1');
      localStorage.setItem('vibe_lead_done_index', '1');
    } catch (e) {}
  });
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  await page.goto(BASE + pagina, { waitUntil: 'load' });
  for (const im of await page.locator('img').all()) await im.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => [...document.images].filter(i => i.getClientRects().length > 0).every(i => i.complete), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(700);

  const data = await page.evaluate((W) => {
    const nm = el => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
      (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')).slice(0, 48);
    const R = el => el.getBoundingClientRect();
    const zichtbaarIn = s => [...s.querySelectorAll('*')].filter(e => {
      const b = R(e); const c = getComputedStyle(e);
      return b.width > 2 && b.height > 2 && c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity > .05;
    });
    const eigenVlak = e => {
      const c = getComputedStyle(e);
      return (c.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(c.backgroundColor))
        || c.boxShadow !== 'none'
        || (c.borderTopWidth !== '0px' && c.borderTopStyle !== 'none' && c.borderTopStyle !== 'hidden');
    };
    const eigenTekst = e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2);
    const opp = (a, b) => {
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      return ox > 0 && oy > 0 ? ox * oy : 0;
    };
    // P-12/P-13: hoek van elke vrije polygoonrand vanaf de verticaal; 5..85 graden telt mee
    const clipHoeken = (el, pe) => {
      const cs = getComputedStyle(el, pe || null);
      const cp = cs.clipPath;
      if (!cp || cp === 'none' || !cp.startsWith('polygon')) return [];
      const r = R(el);
      const bw = pe ? (parseFloat(cs.width) || r.width) : r.width;
      const bh = pe ? (parseFloat(cs.height) || r.height) : r.height;
      const pts = [...cp.matchAll(/(-?[\d.]+)(px|%)\s+(-?[\d.]+)(px|%)/g)]
        .map(m => [m[2] === '%' ? +m[1] / 100 * bw : +m[1], m[4] === '%' ? +m[3] / 100 * bh : +m[3]]);
      const uit = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
        if (dx < .5 || dy < .5) continue;
        const g = +(Math.atan2(dx, dy) * 180 / Math.PI).toFixed(1);
        if (g >= 5 && g <= 85) uit.push(g);
      }
      return uit;
    };

    const uit = [];
    for (const s of document.querySelectorAll('[data-screen-label]')) {
      const S = R(s), zicht = zichtbaarIn(s);

      const beelden = zicht.filter(e => e.tagName === 'IMG' || (getComputedStyle(e).backgroundImage || '').includes('url('));
      const beeldInfo = beelden.map(e => {
        const b = R(e);
        return { el: nm(e), w: Math.round(b.width), h: Math.round(b.height),
          pctVw: +(b.width / W * 100).toFixed(1),
          masker: clipHoeken(e).concat(e.parentElement ? clipHoeken(e.parentElement) : []),
          randL: b.left <= 1.5, randR: b.right >= W - 1.5 };
      });
      const grootBeeld = beelden.filter(e => R(e).width >= .10 * W && R(e).height >= 80);

      // P-04: informatievlak = eigen oppervlak, >=150x80, >=50% van zijn vlak op een foto
      const kand = zicht.filter(e => { const b = R(e); return b.width >= 60 && b.height >= 24 && e.tagName !== 'IMG' && (eigenVlak(e) || eigenTekst(e)); });
      const opBeeld = [];
      for (const e of kand) {
        const be = R(e), A = be.width * be.height;
        for (const img of grootBeeld) {
          if (e.contains(img) || img.contains(e)) continue;
          if (opp(be, R(img)) / A >= .5) { opBeeld.push({ e, w: Math.round(be.width), h: Math.round(be.height) }); break; }
        }
      }
      const infoVlak = opBeeld.filter(v => eigenVlak(v.e) && v.w >= 150 && v.h >= 80);

      // P-07: inhoudskader = breedste tekstdragende wrapper, >=2 kinderen, niet volle viewportbreedte
      const kaders = zicht.filter(e => {
        const b = R(e);
        return b.width <= W - 2 && b.width >= .25 * W && e.children.length >= 2 && e.textContent.trim().length > 20;
      }).map(e => Math.round(R(e).width));

      // P-16: tekstspan
      const tv = zicht.filter(eigenTekst).map(R).filter(b => b.width > 40);

      // P-03: overlappende elementparen
      let paren = 0;
      const kO = zicht.filter(e => { const b = R(e); return b.width > 28 && b.height > 28; });
      for (let i = 0; i < kO.length; i++) for (let j = i + 1; j < kO.length; j++) {
        const a = kO[i], b = kO[j];
        if (a.contains(b) || b.contains(a)) continue;
        const ra = R(a), rb = R(b);
        if (Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left) > 8 &&
            Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > 8) paren++;
      }

      // P-09: kaarten en gelijke rijen
      const kaarten = zicht.filter(e => { const b = R(e); return eigenVlak(e) && b.width > 90 && b.height > 60 && e !== s; }).map(e => Math.round(R(e).width));
      const tel = {}; kaarten.forEach(w => { const k = Math.round(w / 5) * 5; tel[k] = (tel[k] || 0) + 1; });

      // P-12/P-13: geometrie, sectie-element meegerekend
      const geo = [];
      for (const e of [s, ...zicht]) {
        const h = clipHoeken(e); if (h.length) geo.push({ el: nm(e), hoeken: h });
        for (const pe of ['::before', '::after']) {
          if (getComputedStyle(e, pe).content === 'none') continue;
          const hh = clipHoeken(e, pe); if (hh.length) geo.push({ el: nm(e) + pe, hoeken: hh });
        }
      }

      // P-08/P-15: koppen
      const koppen = [...s.querySelectorAll('h1,h2')].map(k => ({
        graad: +parseFloat(getComputedStyle(k).fontSize).toFixed(1),
        br: k.querySelectorAll('br').length }));

      // P-10: tweedelingen >= 50% vw (absoluut geplaatste zones vul je met de hand in de kaart in)
      const tweedelingen = zicht.filter(e => /grid/.test(getComputedStyle(e).display)).map(e => {
        const k = (getComputedStyle(e).gridTemplateColumns || '').split(' ').filter(Boolean).map(parseFloat).filter(v => v > 0);
        if (k.length !== 2 || R(e).width < .5 * W) return null;
        const t = k[0] + k[1];
        return { el: nm(e), lichtste: +(Math.min(...k) / t * 100).toFixed(1), breedte: Math.round(R(e).width) };
      }).filter(Boolean);

      uit.push({ label: s.dataset.screenLabel, el: nm(s), h: Math.round(S.height),
        kader: kaders.length ? Math.max(...kaders) : null,
        tekstspan: tv.length ? Math.round(Math.max(...tv.map(b => b.right)) - Math.min(...tv.map(b => b.left))) : null,
        randL: zicht.filter(e => R(e).left <= 1.5).length,
        randR: zicht.filter(e => R(e).right >= W - 1.5).length,
        overlapparen: paren, infoVlak: infoVlak.length,
        beelden: beeldInfo, breedsteBeeld: beeldInfo.length ? Math.max(...beeldInfo.map(b => b.pctVw)) : null,
        kaarten: kaarten.length, gelijkeRij: Object.entries(tel).filter(([, n]) => n >= 3).map(([w, n]) => n + '×~' + w),
        geo, koppen, tweedelingen });
    }
    return { W, pageH: document.body.scrollHeight, secties: uit };
  }, W);

  alles[W] = data;
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/${naam}-poorten.json`, JSON.stringify(alles, null, 1));

// ---- poortoordeel
const mediaan = a => { const s = [...a].sort((x, y) => x - y); return s[(s.length - 1) >> 1]; };
const P = [];
const D = alles[breedtes[0]], K = alles[breedtes[1]];
const S = D.secties, n = S.length;
const kaders = S.map(s => s.kader), groep = w => kaders.filter(k => k === w).length;
const kop = S.flatMap(s => s.koppen), graden = kop.map(k => k.graad);
const h2 = graden.slice(1);                                   // P-08(ii): H1 telt niet mee in de H2-spreiding
const hoeken = [...new Set(S.flatMap(s => s.geo.flatMap(g => g.hoeken)))];
const beeldS = S.filter(s => s.beelden.length);
const recept = s => `${Math.floor(s.breedsteBeeld / 5) * 5}|${s.beelden.some(b => b.masker.length)}`;
const vw = breedtes[0];

if (K) {
  const doel = breedtes[1] / breedtes[0];
  P.push(['P-01 paginacoherentie', Math.abs((K.pageH / D.pageH) / doel - 1) <= .01, (K.pageH / D.pageH).toFixed(4)]);
  const f = S.map((s, i) => K.secties[i].h / s.h);
  P.push(['P-02 schaalfactorspreiding', Math.max(...f) - Math.min(...f) <= .005, (Math.max(...f) - Math.min(...f)).toFixed(4)]);
}
P.push(['P-03 overlap per sectie', S.every(s => s.overlapparen >= 1) && mediaan(S.map(s => s.overlapparen)) >= 15, S.map(s => s.overlapparen).join(' ')]);
P.push(['P-04 informatievlak op beeld', S.filter(s => s.infoVlak > 0).length >= 3, S.map(s => s.infoVlak).join(' ')]);
P.push(['P-05 beeldschaal', S.some(s => s.breedsteBeeld >= 90) && S.filter(s => s.breedsteBeeld >= 50).length >= 3, S.map(s => s.breedsteBeeld).join(' ')]);
P.push(['P-06 beeldmaskers', beeldS.filter(s => s.beelden.some(b => b.masker.length)).length / beeldS.length >= .5, `${beeldS.filter(s => s.beelden.some(b => b.masker.length)).length}/${beeldS.length}`]);
P.push(['P-07 inhoudskaders', new Set(kaders).size / n >= .7 && Math.max(...kaders.map(groep)) <= 3, `${new Set(kaders).size}/${n} max ${Math.max(...kaders.map(groep))}`]);
P.push(['P-08 kopgraden', new Set(graden).size / graden.length >= .85 && Math.max(...h2) / Math.min(...h2) <= 1.35 && Math.max(...graden.map(g => graden.filter(x => x === g).length)) <= 2, graden.join(' ')]);
P.push(['P-09 gelijke kaartrasters', S.filter(s => s.gelijkeRij.length).length <= 1 && S.filter(s => s.gelijkeRij.length).every(s => s.infoVlak >= 3), S.map(s => s.gelijkeRij.join('') || '-').join(' ')]);
P.push(['P-10 lichtste zijde', S.flatMap(s => s.tweedelingen).every(t => t.lichtste <= 47.5), S.flatMap(s => s.tweedelingen).map(t => t.lichtste).join(' ')]);
P.push(['P-11 randcontact', S.filter(s => s.randL + s.randR === 0).length <= 1 && S.filter(s => s.beelden.some(b => b.randL || b.randR)).length >= 3, S.map(s => s.randL + '/' + s.randR).join(' ')]);
P.push(['P-12 merkhoekfamilie', hoeken.filter(g => !((g >= 27 && g <= 37) || (g >= 9 && g <= 14))).length <= 1, hoeken.join(' ')]);
P.push(['P-13 geometriespreiding', S.filter(s => s.geo.length).length / n >= .6 && hoeken.length >= 4, `${S.filter(s => s.geo.length).length}/${n}, ${hoeken.length} waarden`]);
P.push(['P-14 sectiehoogtes', Math.max(...S.map(s => s.h)) / Math.min(...S.map(s => s.h)) <= 2 && Math.min(...S.map(s => s.h)) >= .25 * vw, (Math.max(...S.map(s => s.h)) / Math.min(...S.map(s => s.h))).toFixed(2)]);
P.push(['P-15 handgezette regelval', kop.filter(k => k.br > 0).length / kop.length >= .6, `${kop.filter(k => k.br > 0).length}/${kop.length}`]);
P.push(['P-16 tekstspan', mediaan(S.map(s => s.tekstspan)) / vw >= .8, `${mediaan(S.map(s => s.tekstspan))}px`]);

// herhalingstoets H-01..H-06
const paar = (a, b) => [
  Math.abs(a.kader - b.kader) <= 10,
  a.tweedelingen.length && b.tweedelingen.length && Math.abs(a.tweedelingen[0].lichtste - b.tweedelingen[0].lichtste) <= 5,
  false,                                           // T3 vergt de >=3-koloms rasters; vul met de hand uit de kaart
  a.beelden.length && b.beelden.length && recept(a) === recept(b),
  false,                                           // T5 grond: vul met de hand uit kaartveld 5
  Math.abs(a.h - b.h) / Math.max(a.h, b.h) <= .02 && a.kaarten === b.kaarten,
].map(Boolean);
const matrix = S.slice(0, -1).map((s, i) => paar(s, S[i + 1]));
P.push(['H-01 max gedeeld per paar', Math.max(...matrix.map(r => r.filter(Boolean).length)) <= 1, matrix.map(r => r.filter(Boolean).length).join(' ')]);
P.push(['H-02 kenmerk in <=2 paren', [0, 1, 2, 3, 4, 5].every(k => matrix.filter(r => r[k]).length <= 2), [0, 1, 2, 3, 4, 5].map(k => matrix.filter(r => r[k]).length).join(' ')]);
P.push(['H-03 geen reeks van 3', [0, 1, 2, 3].every(k => !matrix.some((r, i) => r[k] && matrix[i + 1] && matrix[i + 1][k])), '']);
P.push(['H-04 kader in <=3 secties', Math.max(...kaders.map(groep)) <= 3, kaders.join(' ')]);
P.push(['H-05 beeldrecept in <=2', Math.max(...beeldS.map(s => beeldS.filter(t => recept(t) === recept(s)).length)) <= 2, beeldS.map(recept).join(' ')]);
P.push(['H-06 kopgraad max 2x', Math.max(...graden.map(g => graden.filter(x => x === g).length)) <= 2, graden.join(' ')]);

console.log(`\n=== ${naam} @${vw}  secties=${n}  pageH=${D.pageH}`);
for (const [naamP, ok, waarde] of P) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${naamP.padEnd(30)} ${waarde}`);
console.log(`  EINDOORDEEL = ${P.every(p => p[1]) ? 'DOOR' : 'AFGEKEURD'} (${P.filter(p => p[1]).length}/${P.length})`);
```

**Twee dingen doet het harnas niet automatisch**, en dat is met opzet: T3 (kaartraster) en T5
(grond) uit de herhalingstoets staan op `false` omdat ze uit de ingevulde kaart komen, niet uit de
render — de rasters met ≥3 kolommen en de voluit geschreven grond staan in kaartveld 4 en 5. Vul
die twee kolommen met de hand in; de overige vier rekent het harnas.

## Bijlage B — ruwe uitkomsten van de run

```
home @1774  pageH=6810  secties=9
  sectiehoogtes  908 889 765 624 588 887 887 631 631      max/min=1.54
  overlapparen   158 64 42 19 57 19 50 43 2               som=454  mediaan=43  nul=0/9
  informatievlak 0 0 0 1 0 1 4 1 0                        som=7    secties>=1=4
  inhoudskaders  1740 1133 1704 1584 726 634 568 822 1605 uniek=9
  tekstspan      1619 1606 470 1671 1491 1620 1593 1244 1610  mediaan=1606
  breedste beeld 100 27.5 96.1 53.9 — 41.4 62 52.7 19.7
  maskers        1 0 0 0 0 1 1 1 1                        5 van 8 beeldsecties
  randcontact    8/11 1/1 0/7 3/3 1/1 2/3 0/0 1/4 0/2     secties zonder=1
  kopgraden      76.5 61.5 58.3 64 54 53 61 66            uniek=8/8  met <br>=7
  geometrie      13 elementen in 8/9 secties              14 unieke hoekwaarden
home @1440  pageH=5528
  sectiehoogtes  737 722 621 507 478 720 720 512 512      factoren 0.8117…0.8129
  inhoudskaders  1412 920 1383 1286 589 517 461 668 1303  uniek=9

b2 @1774  pageH=8499  secties=11
  sectiehoogtes  789 141 796 939 724 1348 904 576 516 597 742   max/min=9.56
  overlapparen   17 0 0 2 1 11 2 0 0 17 2                 som=52  mediaan=2  nul=4/11
  informatievlak 0 0 0 0 0 0 1 0 0 0 0                    som=1   secties>=1=1
  inhoudskaders  1440 1280 1240 1240 1240 1440 1240 1240 1240 1100 1440  uniek=4
  tekstspan      1244 1208 1050 972 1381 1280 915 1406 1080 940 800  mediaan=1080
  breedste beeld 44.2 — — 40.9 — 100 40.9 — — — 38.2
  maskers        0 0 0 0 0 0 0 0 0 0 0                    0 van 5 beeldsecties
  randcontact    1/3 0/0 0/0 3/0 0/2 2/2 0/3 0/4 0/0 0/0 0/2  secties zonder=4
  kopgraden      62 44 44 49 54 44 44 32 32 60            uniek=6/10  met <br>=0
  geometrie      4 elementen in 4/11 secties              1 unieke hoekwaarde (34.0°)
  tweedelingen   58/42 · 37/63 · 40/60 · 50/50 · 63/37 · 57/43 · 39/61 · 65/35
b2 @1440  pageH=7511
  sectiehoogtes  711 135 704 810 635 1177 814 523 449 546 608   factoren 0.8194…0.9574
```
