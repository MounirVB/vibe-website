> **STATUS V1.3 — BEWIJSBIJLAGE, NIET NORMATIEF.**
> Dit document is V1.2. Zijn forensische metingen blijven geldig als BEWIJS; zijn regels en
> poorten zijn **niet aanvaard** en zijn vervangen door `docs/04-visual-language-v1.3.md`.
> Zie `docs/00-changelog.md` §3 voor de reden en §4 voor de twee intrekkingen.

# VIBE VISUAL GRAMMAR

**DESIGN SYSTEM V1.2 — VISUELE TAAL**

| | |
|---|---|
| **Status** | `V1.2 — ADDITIEF`. V1.0 blijft `FROZEN`, V1.1 blijft ongewijzigd. |
| **Bron van waarheid** | Homepage Master v1, commit `aae26bf`. **Zelf geverifieerd in deze sessie:** `git diff --stat aae26bf -- index.html 'home*.css'` geeft lege uitvoer, dus de werkboomversie is byte-identiek aan die commit. |
| **Meetviewport** | 1774px primair (`1cqw = 17,74px`), met controle op 1440 · 1199 · 1024 · 834 · 768 · 390px. |
| **Server** | `http://127.0.0.1:8033/index.html` |
| **Meetharnas** | `forensics.mjs` (aangeleverd), plus `zones.mjs` en `vlakken.mjs` (deze sessie geschreven, read-only Playwright-metingen). |
| **Wijzigingen aan productiecode** | **geen.** Dit document is read-only tot stand gekomen. Er is uitsluitend dit ene bestand onder `docs/` aangemaakt. |

**De laag in het systeem:**

```
TOKENS -> PRIMITIVES -> COMPONENTS -> VISUAL GRAMMAR -> SECTION COMPOSITIONS -> PAGE ARCHETYPES
                                      ^^^^^^^^^^^^^^
                                      dit document
```

COMPONENTS legt vast **waaruit** een sectie bestaat. SECTION COMPOSITIONS legt vast **welke sectie
waarover gaat**. Dit document legt vast **hoe een sectie wordt ontworpen**: hoeveel beeld, waar het
beeld de rand raakt, wat er bovenop ligt, hoe scheef de snede is, hoe leeg het mag zijn en wat er
op tablet en mobiel vervalt. Het beschrijft geen inhoud.

---

## §1 · Hoe je deze regels toetst

### 1.1 Meetdefinities

Elke regel in §3 is geformuleerd als een getal, een verhouding, een telling of een waarneembaar
ja/nee. Dat kan alleen als de meting eenduidig is. Dit zijn de zes definities die het hele
document gebruikt:

| term | definitie | bron |
|---|---|---|
| **overlappend elementpaar** | twee zichtbare elementen, elk > 28×28px, waarvan geen van beide de ander bevat, met een overlap > 8px op beide assen | `forensics.mjs:169-177` |
| **tekstspan** | linkerrand van het meest linkse tot rechterrand van het meest rechtse element met een eigen tekstknoop > 3 tekens en breedte > 40px | `forensics.mjs:88-91` |
| **vrije rand** | een rand van een `clip-path: polygon(...)` waarvan zowel \|dx\| als \|dy\| ≥ 0,5px. De hoek is `atan2(\|dx\|,\|dy\|)` in graden **vanaf de verticaal** | `forensics.mjs:68-73` |
| **kaart op beeld** | het percentage van het *oppervlak* van het informatievlak dat binnen de rechthoek van de beelddrager valt | `zones.mjs` blok 2 |
| **lichtste zijde van een tweedeling** | `min(a,b) / (a+b)` van de breedtes van de twee zones | `zones.mjs` blok 1 |
| **beeldsectie** | een sectie met ten minste één `img` van > 80px breed | — |

### 1.2 De paginabrede nulmeting

Alles in §3 staat of valt met deze acht reeksen, gemeten op 1774px:

| per sectie | 01 Hero | 02 Opl. | 03 Project | 04 Aanpak | 05 CONTROL | 06 Resultaat | 07 Infra | 08 Final | 09 Footer |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sectiehoogte (px) | 908 | 889 | 765 | 624 | 588 | 887 | 887 | 631 | 631 |
| sectiehoogte (cqw) | 51,2 | 50,1 | 43,1 | 35,2 | 33,2 | 50,0 | 50,0 | 35,6 | 35,6 |
| overlappende elementparen | 158 | 64 | 42 | 19 | 57 | 19 | 50 | 43 | 2 |
| beeld als % viewport | 100 | 27,5 | 96,1 | 53,9 | — | 41,4 | 62,0 | 52,7 | 19,7 |
| beeld als % sectiehoogte | 82,4 | 56,0 | 73,9 | 47,0 | — | 62,8 | 83,0 | 100 | 83,3 |
| tekstspan (px) | 1619 | 1606 | 470 | 1671 | 1491 | 1620 | 1593 | 1244 | 1610 |
| kaartvlakken | 3 | 7 | 2 | 2 | 2 | 6 | 6 | 4 | 1 |
| kopgraad (px) | 76,5 | 61,5 | 58,3 | 64,0 | 54,0 | 53,0 | 61,0 | 66,0 | — |

Totaal **454 overlappende elementparen**, **0 van 9 secties met nul overlap**.
Ter vergelijking, dezelfde meting op de B2-kandidaat `systeem-energieopslag.html`: **50 paren**,
**5 van 11 secties met nul overlap**, **0 informatievlakken op een beeld**, **0 maskers**,
**4 geometrie-elementen die alle vier exact 34° zijn**.

**Dat is de scheidslijn die dit document bewaakt.** De homepage legt vlakken ÓP beelden; een
generieke pagina zet beelden NÁÁST tekst in een rastercel.

### 1.3 De vaste taxonomie

Deze namen zijn vast. Er komen er geen bij zonder een nieuwe meting.

**Beeldbehandelingen**

| code | naam | kern | bronsectie |
|---|---|---|---|
| **M1** | PODIUM | het beeld *is* het sectiecanvas; de tekst staat in een vorm die eruit gesneden is | S1 hero |
| **M2** | PANEEL | het beeld is een paneel dat tot één schermrand doorloopt; de scrim draagt de tekst | S3 project |
| **M3** | DRAAGVLAK | beeld 40–62% breed waar informatievlakken OP liggen | S6 proof, S7 infra |
| **M4** | BAND | brede liggende strook (ratio ~3,2) op een diagonale ondergrond, kaart kruist de rand | S4 aanpak |
| **M5** | KAARTBEELD | beeld binnen een donkere kaart, tot de kaartranden, kaarten ONGELIJK van breedte | S2 oplossingen |
| **M6** | HOEKBEELD | beeld vast aan één schermrand, gesneden op de merkhoek, kaart over de binnenrand | S8 final, S9 footer |
| **M0** | GEEN FOTO | gebouwd object in plaats van een foto | S5 VIBE.CONTROL |

**Kaartfamilies**

| code | naam | kern | bronsectie |
|---|---|---|---|
| **K1** | MEDIAKAART | donker, foto tot de kaartrand, ronde pijlknop | S2 |
| **K2** | ZWEVEND INFOVLAK | wit, ligt over een beeldrand heen | S4, S6, S7, S8 |
| **K3** | STROOK | donker, horizontaal, met duimnagel, over een beeldhoek | S6 |
| **K4** | REGISTERKAART | wit, icoon + twee regels, verticale stapel OP een beeld | S7 |
| **K5** | LOGOKAART | wit, klein, naam + ondertitel | S6 bovenband |
| **K6** | APPARAATVLAK | donker met chrome, gebouwd object, onderling overlappend | S5 |
| **K7** | BEWIJSBAND | geen kaart: rij met scheidingslijnen | S1 KPI, S3 metrics |
| **K8** | ICOONREGEL | geen vlak: icoon + label + regel direct op het canvas | S4, S5, S7, S8 |

---

## §2 · De drie breedtebanden

De pagina heeft drie ontwerpen, niet één dat schaalt. Gemeten:

| band | CSS | gemeten gedrag |
|---|---|---|
| **≥ 1200px — desktopmaster** | `container-type: inline-size`, alle maten in `cqw` | de hele pagina schaalt met **één factor**: `pageH@1440 ÷ pageH@1774 = 5528 ÷ 6810 = 0,8117`, exact gelijk aan `1440 ÷ 1774 = 0,8117`. Elke sectiehoogte volgt binnen **0,2%**. |
| **768–1199px — tablet** | `@media (min-width:768px) and (max-width:1199px)` in 10 van 11 `home*.css` | eigen typetrap (`--m-h1: clamp(46px,6.4vw,58px)`, `--m-h2: clamp(34px,4.6vw,42px)`), eigen goot (`clamp(32px,5vw,48px)`), eigen sectieritme (`--m-sec-y: 64px`) — `home-mobile.css:34-45` |
| **≤ 767px — mobiel master** | basiswaarden in `home-mobile.css:15-33` | `--m-h1: clamp(34px,9.1vw,44px)`, `--m-h2: clamp(27px,7.3vw,34px)`, goot `clamp(20px,5.4vw,24px)`, `--m-sec-y: 44px`, `--m-radius: 14px`, `--m-radius-img: 12px` |

**Gemeten paginahoogte:** 6810 @1774 · 5528 @1440 · 8647 @1199 · 8760 @1024 · 9265 @834 ·
9293 @768 · 10056 @390.

Elke regel in §3 heeft daarom drie uitvoeringen. De DESKTOPREGEL is de zwaarste: daar zit alles
wat een pagina herkenbaar maakt, en daar gaat het mis.

---

## §3 · De vierentwintig grammaticaregels

---

### G01 · BEELDREGIE

**DOEL** — Elke sectie geeft het beeld een expliciete rol uit M0–M6 en een gemeten aandeel, zodat
het beeld de compositie draagt in plaats van hem te illustreren.

**VISUELE ANATOMIE** — Acht van negen secties dragen een beeld; één (S5) is M0. Zeven van de acht
beeldsecties gebruiken een andere behandeling dan hun buurman. Per pagina komt M1 één keer voor,
M2 één keer, M3 twee keer, M4 één keer, M5 één keer, M6 twee keer.

**DESKTOPREGEL**
- Beeldaandeel: **41,4–100% van de viewportbreedte**, mediaan **53,3%**. Gemeten: 100 · 96,1 ·
  62,0 · 53,9 · 52,7 · 41,4 · 27,5 · 19,7%. **5 van 8 beelden is ≥ 50% vw.** Minder dan 40% vw is
  alleen toegestaan voor M5 (beeld ín een kaart, 27,5%) en M6-footer (19,7%).
- Beeld : tekstkolom (breedte ÷ breedte, `zones.mjs` blok 1): **1,38 · 1,39 · 1,94 · 2,08 · 2,24 ·
  3,52 · 3,63**. Zeven van acht liggen tussen **1,38 : 1 en 3,63 : 1**. De footer is de enige
  omkering (0,94 : 1 tegen het merkblok, 0,22 : 1 tegen de volle tekstspan).
- Beeld : sectiehoogte: **47,0–100%**, mediaan **78,2%**. Gemeten 100 · 83,3 · 83,0 · 82,4 · 73,9 ·
  62,8 · 56,0 · 47,0%.
- Per pagina maximaal **één M1** en maximaal **één M2**: beide eisen een schermrand en een volle
  bladzijdediagonaal en kannibaliseren elkaar.

**TABLETREGEL** — Het beeld wordt een band boven of onder de tekst. Gemeten @1024: 100 · 90,6 ·
90,6 · 90,6 · 90,6 · 44,2 · 29,0% vw. Beeldhoogte wordt in **px** vastgezet, niet in cqw. Gemeten
@1024: **340** (S3) · **320** (S4) · **300** (S6) · **260** (S7) · **340** (S8) —
`home-proof.css:470`, `home-infra.css:429` en `:443`, `home-final.css:423`. De rol (M1…M6) vervalt;
wat overblijft is "band" of "kaartbeeld".

**MOBIELE REGEL** — @390 gemeten: 100% vw (S3, randvast links én rechts) of **89,2% vw** (S1, S2,
S4, S6, S7, S8) of 43,3% vw (de twee kaartkolommen in S2). Beeldhoogte 184–286px. Het footerbeeld
**vervalt volledig**: 0 beelden gemeten in S9 @1199, @1024 en @390 (`home-footer.css:372`).

**TOEGESTANE VARIATIE** — Eén sectie per pagina mag M0 zijn (gebouwd object in plaats van foto).
M3 mag tweemaal voorkomen als de twee uitvoeringen verschillen in aandeel: gemeten 41,4% (S6) tegen
62,0% (S7), factor 1,50.

**NIET TOEGESTAAN** — Een beeld van < 40% vw naast tekst in een rastercel zonder dat er iets op
ligt. Dat is precies wat de B2-kandidaat doet: beelden van 44,2 · 40,9 · 40,9 · 38,2% vw met
**0 informatievlakken erop** en 5 van 11 secties zonder één overlappend elementpaar. Verder: twee
secties met dezelfde beeldbehandeling naast elkaar.

**HOMEPAGE-BEWIJS** — `forensics.mjs` @1774, regel `beeld` per sectie; `zones.mjs` blok 1 voor
beeld:tekst. Aandelen: `home-hero.css:38` (`aspect-ratio: 1774/748`), `home-project.css:50`
(`aspect-ratio: 1704/565`), `home-infra.css` (foto 1100×736), `home-final.css` (foto 935×631).

**IMPLEMENTATIEAANWIJZING** — Noteer de rol in een commentaarregel boven de sectie-CSS
(`/* M3 DRAAGVLAK — 62% vw */`) en zet het beeldaandeel in `cqw`, niet in `%` van een container:
dat is wat de factor 0,8117 over de hele pagina gelijk houdt.

---

### G02 · BEELDUITSNEDE

**DOEL** — De uitsnede is een ontwerpbesluit met een reden, geen standaardwaarde.

**VISUELE ANATOMIE** — Dertien beelden, dertien keer `object-fit: cover` met een eigen
`object-position`. Geen enkel beeld staat op de browserstandaard `50% 50%` omdat dat zo uitkwam;
twee afwijkingen hebben een geschreven reden in de CSS.

**DESKTOPREGEL**
- **Verticale uitsnede: 34–62%**, mediaan 50%. Gemeten over dertien beelden: 34 · 38 · 46 · 46 ·
  50 · 50 · 50 · 52 · 52 · 52 · 54 · 56 · 62. Spreiding **28 punten** — de horizon blijft dus altijd
  binnen ±16 punten van het midden.
- **Horizontale uitsnede: vrij (gemeten 6–78%)**, maar elke waarde **buiten 46–56%** moet een
  geschreven reden in de CSS hebben. Gemeten 2 van 2: `26% 52%` met de reden dat de batterijkasten
  anders achter de kaartkolom verdwijnen (`home-infra.css:166-168`), en `78% 56%` met de reden dat
  de carportrijen anders niet in beeld komen (`home-final.css:85-88`).
- **Ratio per rol:** M1/M2 (volvlaks) **2,37–3,26** · M4 band **3,26** · M3 draagvlak **1,32–1,49** ·
  M6 hoekbeeld **0,67–1,48** · M5 kaartbeeld **0,59–1,54**. Eén staand beeld op de pagina (0,67, de
  footer); alle overige twaalf zijn liggend of vierkant.
- `object-fit: cover` in **13 van 13** (`home-forensics.json`, veld `objectFit`). `object-fit:
  contain` komt op de pagina niet voor.

**TABLETREGEL** — De `object-position` blijft ongewijzigd; alleen de drager verandert van ratio.
Gemeten @1024: S3 3,01 (was 3,02), S4 2,90 (was 3,26), S6 1,51 (was 1,32), S7 3,57 (was 1,49),
S8 2,73 (was 1,48). **De ratio-afwijking is het grootst bij M3** (S7: factor 2,40) — controleer daar
of de uitsnede nog klopt.

**MOBIELE REGEL** — @390 lopen de ratio's naar 1,22–2,81. Een `object-position` die op desktop
nodig was om een object vrij te houden van een kaartkolom (S7: `26%`) heeft op mobiel geen
kaartkolom meer naast zich; de uitsnede mag dan terug naar het midden, maar dat is **NIET GEMETEN**
of het in de bron gebeurt.

**TOEGESTANE VARIATIE** — Twee beelden in dezelfde sectie mogen verschillende uitsnedes hebben
(S6: hoofdfoto `52% 46%`, duimnagel `50% 38%`; S2: `56% 46%` · `68% 52%` · `6% 34%` · `50% 50%` ·
`50% 50%`).

**NIET TOEGESTAAN** — Een verticale uitsnede buiten 34–62%. Een horizontale uitsnede buiten
46–56% zonder commentaarregel met de reden. Een beeld dat de `cover`-uitsnede vermijdt door zijn
ratio exact op de drager af te stemmen: dat levert één uitsnede en nul regie.

**HOMEPAGE-BEWIJS** — `vlakken.mjs` blok 3, kolom `objPos`, dertien rijen.

**IMPLEMENTATIEAANWIJZING** — Schrijf bij elke afwijkende `object-position` één commentaarregel die
zegt *welk object* in beeld moet blijven. De twee bestaande voorbeelden
(`home-infra.css:166-168`, `home-final.css:85-88`) zijn het format.

---

### G03 · BEELDMASKERING

**DOEL** — Het beeld krijgt zijn vorm van een polygoon óf van een radius, niet van allebei zonder
reden, en nooit van geen van beide.

**VISUELE ANATOMIE** — Vijf van de acht beeldsecties maskeren hun beeldvlak met
`clip-path: polygon(...)`. De drie overige krijgen hun vorm van de radius van hun drager: 10px
(kaart), 14px (band), 63/0/0/63px (paneel). **Geen enkel beeld is een kale rechthoek.**

**DESKTOPREGEL**
- **5 van 8 beeldsecties gemaskeerd.** Gemeten: S1 `clip[32,8 · 34,4]`, S6 `clip[13,0]`,
  S7 `clip[9,7]`, S8 `clip[35,4 · 32,7]`, S9 `clip[31,6 · 28,1]`.
- **Een masker heeft 1 of 2 vrije randen, nooit meer.** Gemeten aantal vrije randen per
  beeldmasker: 2 · 1 · 1 · 2 · 2. Het aantal polygoonpunten is 4 of 5.
- **Masker en radius sluiten elkaar uit — op één gemeten uitzondering na.** Van de vijf
  maskerdragers hebben er vier `border-radius: 0px`; de uitzondering is `.vh-infra-foto`, die
  tegelijk een snede van 9,7° en een radius van 18px draagt. Dat is ook de flauwste snede van de
  pagina: onder ±15° leest een polygoon zonder radius als een scheef bijgesneden rechthoek. Zie
  **DR-V-03**.
- **Ongemaskeerde beelden krijgen hun vorm van de drager, niet van het `img`.** Gemeten
  `border-radius` op het `img` zelf: **0px in 13 van 13**. De vorm zit op de drager: 10px (`.vh-sol-mod`,
  `.vh-proof-strip-fig`), 14px (`.vh-proc-beeld`), 63/0/0/63px (`.vh-pr-panel`).

**TABLETREGEL** — **0 van 8 beelden is gemaskeerd onder 1200px.** Gemeten: het harnas rapporteert
`clip[]` voor elk beeld @1199, @1024, @834, @768 en @390. Het masker wordt expliciet teruggenomen
met **vijf `clip-path: none`-regels** (`home-hero.css:450`, `home-proof.css:434`,
`home-infra.css:345`, `home-final.css:376`, `home-footer.css:376`). De vorm komt dan volledig van
`--m-radius-img: 12px` (`home-mobile.css:29`, gebruikt in 6 van de 11 stylesheets).

**MOBIELE REGEL** — Identiek aan tablet: één radius van 12px, geen polygonen op het beeldvlak zelf.
Wat wél terugkeert is een gekleurde wig **binnen** het beeld — zie G22.

**TOEGESTANE VARIATIE** — Eén masker mag twee vrije randen hebben (een chevron, 3 van 5 gevallen).
Een masker met een radius is toegestaan als de vrije rand < 15° is (1 van 1 gemeten geval).

**NIET TOEGESTAAN** — Een rechthoekig beeld met alleen een radius in een sectie die M1, M3 of M6
gebruikt. Een `clip-path` met meer dan 2 vrije randen op een beeldvlak. Een radius op het `img`
in plaats van op de drager: dan knipt de `cover`-uitsnede door de hoek heen.

**HOMEPAGE-BEWIJS** — `vlakken.mjs` blok 3 (`dragerRadius`, `dragerClip`, `imgRadius`),
`zones.mjs` blok 6 (dertien clip-dragers met rol). Bronregels: `home-hero.css:57-64`,
`home-proof.css:224`, `home-infra.css:160`, `home-final.css:63-69`, `home-footer.css:48-54`.

**IMPLEMENTATIEAANWIJZING** — Zet `clip-path` altijd op de **drager** (`div`), nooit op het `img`;
anders wordt de scrim-`::after` niet mee geklipt en steekt hij onder de snede uit.

---

### G04 · BEELD AAN DE RAND

**DOEL** — Een beeld dat de schermrand raakt maakt de pagina breed; een beeld dat netjes binnen een
container blijft maakt hem smal. De keuze is per sectie, niet per pagina.

**VISUELE ANATOMIE** — De pagina heeft geen vaste contentbreedte. De linkerrand is bijna vast, de
rechterrand is bewust los: daar breken de beelden uit.

**DESKTOPREGEL**
- **4 van 8 beeldsecties raken met het beeld een schermrand, en in 4 van 4 is dat de RECHTER rand.**
  Gemeten: S1 (links én rechts), S3 (rechts), S8 (rechts), S9 (rechts). **0 van 8 raakt alleen de
  linkerrand.**
- **De linkermarge van de inhoud spreidt 19px**: 70 · 70 · 73 · 78 · 78 · 83 · 84 · 88 px over de
  acht begrensde secties. **De rechtermarge spreidt 53px**: 31 · 65 · 66 · 72 · 84 px waar het beeld
  niet uitbreekt.
- **8 van 9 secties hebben ten minste één element op een schermrand.** De enige sectie waar
  *niets* een rand raakt is S7 (73px links, 31px rechts). Een sectie zonder randcontact is dus
  toegestaan, maar maximaal één per pagina.
- Raakt het beeld de rand niet, dan mag een **geometrie-element** de randovergang overnemen:
  gemeten 1 van 1 geval (S6, `span.vh-proof-wig` 85×133 op x1689…1774, `home-proof.css:48-57`).

**TABLETREGEL** — Eén constante goot vervangt de spreiding: gemeten linkerrand @1024 = 48px in 9 van
9 secties, @834 = 42px, @768 = 38px. Het enige beeld dat nog een rand raakt is S3 (100% vw,
links én rechts). Beelden in de flow houden 90,6% vw aan — **gemeten 5 van 7 identiek**.

**MOBIELE REGEL** — @390: goot **21px in 9 van 9 secties** (`--m-gutter: clamp(20px,5.4vw,24px)`),
hoofdbeeld 89,2% vw in 6 van 7 beeldsecties. Alleen S3 blijft volvlaks (100% vw, randcontact L én
R). **Eén volvlaks beeld per mobiele pagina.**

**TOEGESTANE VARIATIE** — De rechtermarge mag per sectie verschillen (gemeten spreiding 53px). De
linkermarge niet: houd hem binnen de gemeten band **70–88px** op 1774px (3,9–5,0cqw).

**NIET TOEGESTAAN** — Een beeld dat alleen de linkerrand raakt (0 van 8 op de homepage). Twee
volvlakse beelden in opeenvolgende secties. Een sectie waar álles binnen één symmetrische container
van bijvoorbeeld 1280px blijft: dat levert de 60,9% mediane tekstspan van de B2-kandidaat tegen
**90,5%** op de homepage.

**HOMEPAGE-BEWIJS** — `forensics.mjs` regel `tekst … randcontact L:n R:n` per sectie;
`forensics-homepage.md §0.3`.

**IMPLEMENTATIEAANWIJZING** — Een uitbrekend beeld hoort `position: absolute; right: 0` te krijgen
binnen een sectie met `overflow: hidden`, niet een negatieve marge: anders krijgt `html` een
horizontale scrollbalk. Gemeten: `docW == viewport` op alle zes gemeten breedtes.

---

### G05 · BEELD + GEOMETRIE

**DOEL** — Geometrie is er om een randovergang te maken of een hoek te sluiten, niet om een vlak
te versieren.

**VISUELE ANATOMIE** — Dertien `clip-path`-dragers over zeven van de negen secties, plus drie
SVG-vormen. Elf van de dertien zijn structureel; één is decoratief (de 25°-vorm, G22) en één is een
schaduwvlak onder een gebouwd object.

**DESKTOPREGEL**
- **Loopt een vlak langs dezelfde visuele lijn als een beeldsnede, dan is de hoek identiek tot op
  0,1°.** Gemeten 3 van 3: S1 `.vh-band` 34,4 = `.vh-foto` 34,4; S1 `.vh-wig` 32,8/34,4 =
  `.vh-foto` 32,8/34,4; S8 `.vh-final-wig` 32,7/35,4 = `.vh-final-foto` 35,4/32,7.
- **Maximaal 4 gestapelde geometrische middelen per sectie.** Gemeten: S1 vier (bandstrook,
  SVG-accentdriehoek, SVG-navyvorm, uitdoofwig), S8 drie, S3 drie (SVG), S4/S6/S7 één, S2/S5 één.
- **Geometrie zonder beeld is maximaal één element per sectie** (S5: één schaduwvlak; S2: één
  vervangingsvorm).
- Een geometrie-element dat een hoek sluit **moet de schermrand exact raken**: gemeten
  `.vh-final-blauw` 294×401, overschrijding rechts 0,0px en onder 0,0px.
- **De enige ronde knik in de geometrie van de hele pagina** is `a90 90 0 0 0` in de navyvorm van de
  hero (`index.html:120`). Eén per pagina.

**TABLETREGEL** — **Negen van de dertien geometrie-elementen worden uitgezet.** Gemeten
`display:none`-regels onder 1200px: `.vh-band`, `.vh-geo`, `.vh-wig` (`home-hero.css:410`),
`.vh-pr-geo` (`home-project.css:234`), `.vh-proc-backdrop` (`home-process.css:217`),
`.vh-proof-wig` (`home-proof.css:391`), `.vh-final-wig` (`home-final.css:331`), `.vh-final-blauw`
(`home-final.css:388`), `.vh-footer-wig` (`home-footer.css:372`). Twee tekstblokken die op een
beeld lagen gaan mee: `.vh-navy-copy` (`home-hero.css:410`) en `.vh-final-note`
(`home-final.css:331`). Daarnaast nemen **vijf `clip-path: none`-regels** het masker van de
beelddragers terug (G03). Het harnas telt @1199 nog **3** geometrie-elementen tegen **12** @1774.

**MOBIELE REGEL** — Identiek. Wat terugkeert zijn twee nieuwe wiggen **binnen** het beeld
(`.vh-foto::before`, `.vh-final-foto::before`), elk een rechthoekige driehoek rechtsonder van
46%×62% respectievelijk 44%×58% van de beelddrager (`home-hero.css:458-466`,
`home-final.css:389-397`). Zie G22 voor de hoekdrift.

**TOEGESTANE VARIATIE** — Een geometrie-element mag zowel een randovergang maken als de ondergrond
van een halve sectie zijn (S8 `.vh-final-wig`: 1774×631, de volle sectie).

**NIET TOEGESTAAN** — Een geometrisch vlak dat naast een beeldsnede ligt met een **andere** hoek.
Een geometrie-element dat nergens aan raakt en niets sluit. Vier identieke `::after`-wiggen op vier
mediablokken — de B2-kandidaat heeft er precies vier, alle vier 34°, alle vier dezelfde regel.

**HOMEPAGE-BEWIJS** — `zones.mjs` blok 6 (dertien dragers met maat, hoeken en `draagtBeeld`);
`forensics.mjs` regel `geo` per sectie.

**IMPLEMENTATIEAANWIJZING** — Zet de hoek van een begeleidend vlak af van het **percentagepaar** van
het beeldmasker, niet van een losse gradenwaarde. `polygon(56.223% 0, …)` op een vlak van dezelfde
afmeting geeft per definitie dezelfde hoek; een los `34deg` niet.

---

### G06 · KAARTCOMPOSITIE

**DOEL** — Kaarten vormen een compositie met een duidelijke zwaartepunt, geen tegelrooster.

**VISUELE ANATOMIE** — Negen secties, 33 kaartvlakken, acht families. Geen sectie heeft meer dan
zeven vlakken; geen rij draagt meer dan vier kaarten.

**DESKTOPREGEL**
- **Kaartvlakken per sectie: 3 · 7 · 2 · 2 · 2 · 6 · 6 · 4 · 1.** Maximum 7, mediaan 3.
- **Een rij draagt 2, 3 of 4 kaarten. 0 rijen met ≥ 5.** Gemeten rijen: 3 (S1 KPI) · 3 + 3 (S2) ·
  4 (S4) · 4 (S5) · 2 (S6 logo's) · 4 (S7) · 3 (S8) · 3 (S9).
- **Maximaal 4 kaartfamilies in één sectie.** Gemeten maximum: S6 met K5 · K2 · K3 + één losse knop.
  Zeven van negen secties hebben er 1 of 2.
- **Twee rijen in dezelfde kolom gebruiken verschillende kolomverdelingen.** Gemeten S2: bovenrij
  45,1 / 27,9 / 27,0 tegen onderrij 32,8 / 31,2 / 31,4. De verticale naden verspringen **116px**
  respectievelijk **65px** tussen de twee rijen. Dat is geen fout: het is wat het rooster breekt.
- **Dragen twee rijen een verschillend gewicht, dan verschilt ook hun hoogte met een factor ≥ 2.**
  Gemeten 1 van 1 geval (S2): rijhoogtes 498 tegen 230 = **2,17**.

**TABLETREGEL** — Het rooster wordt rechtgetrokken: gemeten @1024 `grid-template-columns:
repeat(3,1fr)` voor S2 (6 kaarten van exact 295px, harnasoordeel "gelijke rijen: 6×~295px") en
`repeat(4,1fr)` voor S7 (`home-infra.css:437`). **Twee gelijke rijen @1024 tegen één @1774.** Dat is
bewust: op tablet is er geen ruimte voor het gewichtsverschil.

**MOBIELE REGEL** — @390 gemeten: S2 wordt 1 volle kaart (89,2% vw) + 3 kaarten van 43,3% vw +
1 volle kaart — een **1 / 2 / 2-opbouw**, geen 3×2-rooster. S7 wordt `46,7 / 53,3` (twee ongelijke
kolommen). Maximaal twee kaarten naast elkaar.

**TOEGESTANE VARIATIE** — Een sectie mag meerdere families combineren zolang elke familie een eigen
taak heeft: in S6 is K5 "wie", K2 "wat het opleverde" en K3 "lees de hele case".

**NIET TOEGESTAAN** — 3×2 identieke tegels met gelijke hoogte en gelijke breedte. Dat is wat de
B2-kandidaat doet in zijn sectie 03: 439 · 301 · 301px met gelijke hoogte 348px en **0 overlapparen**.

**HOMEPAGE-BEWIJS** — `forensics.mjs` regels `kaarten n` en `grid`; `zones.mjs` blok 5 en
`vlakken.mjs` blok 2. `home-solutions.css:130-131` (gaps 26 / 23px).

**IMPLEMENTATIEAANWIJZING** — Declareer de twee rijen van een modulerraster als **twee aparte
grids**, niet als één grid met `grid-auto-rows`. Alleen dan kunnen de naden verspringen.

---

### G07 · KAARTHIERARCHIE

**DOEL** — Binnen een rij is één kaart zwaarder dan de rest, tenzij de rij een register is.

**VISUELE ANATOMIE** — Negen gemeten rijen. Vier zijn exact gelijk, vijf bewust ongelijk. De
scheidslijn loopt precies langs de vraag of de rij *inhoud* of een *register* draagt.

**DESKTOPREGEL**
- **Gemeten `max/min` per rij:**

| rij | familie | n | breedtes (px) | max/min |
|---|---|---:|---|---:|
| S2 bovenrij | K1 MEDIAKAART | 3 | 487 · 302 · 292 | **1,668** |
| S6 logokaarten | K5 LOGOKAART | 2 | 289 · 197 | **1,467** |
| S9 navkolommen | — | 3 | 171,6 · 133,7 · 156,2 | **1,283** |
| S8 voordeelregels | K8 ICOONREGEL | 3 | 275,0 · 299,5 · 248,0 | **1,208** |
| S2 onderrij | K1 MEDIAKAART | 3 | 371 · 353 · 355 | **1,051** |
| S1 KPI-band | K7 BEWIJSBAND | 3 | 580 · 580 · 580 | **1,000** |
| S4 processtappen | K8 ICOONREGEL | 4 | 292,1 ×4 | **1,000** |
| S5 voordeelrij | K8 ICOONREGEL | 4 | 182 ×4 | **1,000** |
| S7 registerkaarten | K4 REGISTERKAART | 4 | 422 ×4 | **1,000** |

*De derde breedte van de S2-onderrij (355px) komt uit `forensics-homepage.md §02 B`; `zones.mjs`
mat de twee benoemde kaarten (371 en 353). De verhouding verandert er niet door.*

- **Inhoudskaarten zijn ongelijk: 3 van 3** (K1 tweemaal, K5 eenmaal), `max/min` **1,051–1,668**.
- **Registers zijn gelijk: 4 van 4 gemeten gelijke rijen zijn K4, K7 of K8**, en drie van die vier
  hebben **n = 4**.
- **De zwaarste kaart in een ongelijke rij draagt als enige een extra laag.** Gemeten S2: de kaart
  van 487px is 1,61× de breedte van zijn buur, heeft een kopgraad van 26,6px tegen 18,4px
  (factor 1,45), een icoon van 44px tegen 40px en als enige een statistiekbalk met drie cellen.
- **Een registerkaart heeft een vaste steek.** Gemeten S7: verticale steek **141,3px** met
  **15,3px lucht** tussen de kaarten; S4: horizontale steek **430,7px**, driemaal exact gelijk.

**TABLETREGEL** — De hiërarchie vervalt; gemeten @1024 wordt S2 `repeat(3,1fr)` (6 × 295px, allemaal
gelijk) en S7 `repeat(4,1fr)` (4 × 220px). De grote kaart houdt wél zijn extra laag (statistiekbalk)
— de hiërarchie verhuist van breedte naar inhoud.

**MOBIELE REGEL** — @390 gemeten: S2 wordt 1 volle + 3 halve + 1 volle; de kaart die op desktop
1,61× zo breed was wordt de volle kaart bovenaan. **De hiërarchie verhuist van breedte naar
volgorde.**

**TOEGESTANE VARIATIE** — Een K8-rij mag bewust ongelijk zijn als de inhoud dat vraagt: gemeten
S8 `grid-template-columns: 326fr 355fr 294fr` (`home-final.css:221`) → 275 / 299,5 / 248px. Zie
**DR-V-05**.

**NIET TOEGESTAAN** — `repeat(3, 1fr)` voor een rij inhoudskaarten op desktop. Een ongelijke rij
waarin de grootste kaart géén extra inhoudslaag draagt: dan is het verschil willekeurig.

**HOMEPAGE-BEWIJS** — `zones.mjs` blok 5 en `vlakken.mjs` blok 2; `home-solutions.css:239-241`,
`home-infra.css:228-231` (de vier `top`-waarden 8,1 / 16,0677 / 24,0343 / 31,9998cqw),
`home-process.css:152-166`.

**IMPLEMENTATIEAANWIJZING** — Schrijf ongelijke kolommen als expliciete `fr`-waarden
(`326fr 355fr 294fr`) of als `cqw`-paren, niet als `auto`. `auto` levert een verhouding die met de
tekstlengte meebeweegt en dus niet toetsbaar is.

---

### G08 · KAART OVER BEELD

**DOEL** — De scherpste eigenschap van de pagina: informatievlakken liggen óp beelden. Deze regel
zegt hoeveel, en hoe ver eroverheen.

**VISUELE ANATOMIE** — Twaalf informatievlakken liggen geheel of gedeeltelijk op een beeldvlak,
verdeeld over zes van de negen secties. De B2-kandidaat heeft er nul.

**DESKTOPREGEL**
- **6 van 9 secties hebben ten minste één informatievlak op een zichtbaar beeld.** Gemeten S1, S3,
  S4, S6, S7, S8. (Telling handmatig gecorrigeerd: het harnas telt de twee heroknoppen mee omdat de
  rechthoek van `.vh-foto` de volle breedte beslaat, terwijl die knoppen visueel op het bleekblauwe
  tekstveld staan — `forensics-homepage.md §0.8`.)
- **Een vlak op een beeld ligt er óf vrijwel helemaal op, óf er nét overheen. Daartussen zit niets.**
  Gemeten percentage van het *kaartoppervlak* op het beeldvlak:
  **100 · 100 · 100 · 100 · 100 · 100 · 100 · 99,8 · 80,8 · 11,8 · 9,4%.** Acht vlakken ≥ 99,8%,
  één op 80,8%, twee onder 12%. Er is geen enkel vlak tussen 12% en 80%.
- **Kruist een kaart de beeldrand, dan steekt hij er 8–56px overheen.** Gemeten 1 van 1 geval
  (`.vh-proc-kaart`): **55,8px voorbij rechts en 8,0px voorbij onder**, waarna hij op 10px van de
  schermrand eindigt. Niet 0 (dan is het geen kruising) en niet > 60 (dan hangt de kaart los).
- **Ligt een kaart volledig op het beeld, dan houdt hij 25,6–84px afstand tot de dichtstbijzijnde
  beeldrand.** Gemeten: S7 vier kaarten op 25,6px binnen de rechterrand; S6 strook op 84,4px van
  links en 32,1px boven onder; S8 kaart op 214,3px voorbij de chevronpunt.
- **Een vlak dat maar 9–12% op het beeld ligt, mag dat alleen als het de rest van zijn breedte op
  de sectiegrond heeft.** Gemeten S6: de citaatkaart van 448px steekt 406px voorbij de fotorand; de
  verhaalkolom van 532px ligt 62,6px over het beeld, precies in de hoek die de 13°-snede vrijlaat.

**TABLETREGEL** — @1024 gemeten blijven drie overlappen over: S3 (12 paren), S4 (4 paren), S8
(4 paren). De kaart komt dan boven of onder het beeld te staan met een **negatieve marge** in plaats
van absolute plaatsing (`home-process.css:238-240`: `margin: -26px var(--m-gutter) 0`).

**MOBIELE REGEL** — @390 gemeten overlap kaart × beeld: **26px (S4) · 28px (S6) · 34px (S8)**. Dat
is de hele regel: **de kaart behoudt 26–34px overlap, niet 80–100% van zijn oppervlak.** Minder
levert een stapel; meer levert onleesbare tekst op fotopixels.

**TOEGESTANE VARIATIE** — Een kaart mag met één hoek over de beeldrand steken in plaats van met een
hele zijde. Een kaart die 100% op het beeld ligt mag donker zijn (K3) of wit (K2, K4).

**NIET TOEGESTAAN** — Een kaart die precies op de beeldrand uitlijnt (0px overschrijding): dat is
geen compositie maar een rastercel. Een overlap tussen 12% en 80% van het kaartoppervlak: op de
homepage bestaat die niet, en hij leest als een plaatsingsfout.

**HOMEPAGE-BEWIJS** — `zones.mjs` blok 2, twaalf rijen met `pctKaartOpBeeld` en overschrijdingen.
`forensics-homepage.md §04 B` (de kaart x1426…1764 tegen de foto x752…1708).

**IMPLEMENTATIEAANWIJZING** — Let op de notitie op `home-process.css:118` ("rechterrand gelijk aan
de foto"): `width: 15.884cqw` is content-box en de padding telt erbij op, wat 19,03cqw = 338px
oplevert in plaats van 241. Gemeten klopt de notitie niet. Zie **DR-V-04**.

---

### G09 · ZWEVENDE INFORMATIEVLAKKEN

**DOEL** — Een vlak dat zweeft moet er ook uitzien alsof het zweeft: één radiusband, één
schaduwrecept, geen rand.

**VISUELE ANATOMIE** — Vier witte zwevende vlakken in vier secties (K2 ×3, K4 ×1 als familie van
vier identieke kaarten). Alle vier liggen op een beeld.

**DESKTOPREGEL**
- **Radius: een vlak op een beeld krijgt 11,7–16,0px; een vlak in de stroom krijgt 10,0px.** De
  twee reeksen overlappen niet. Gemeten op een beeld: **11,7** (S4) · **13,5** (S8) · **14,0** (S7) ·
  **16,0** (S6) · **20,0** (S6 strook, donker). Gemeten in de stroom: **10,0** (K1 mediakaart,
  K5 logokaart) en 9,1–11,8 voor knoppen.
- **Exact twee schaduwen per vlak, 4 van 4.** De brede schaduw heeft blur **31,9–56,8px** met een
  **negatieve spread van −14,2 tot −19,5px**; de smalle heeft blur **≤ 7,98px**. Gemeten:
  S4 `0 3,19 7,98` + `0 26,6 56,8 −19,5`; S6 `0 23,9 47,9 −19,5` + `0 ,28 ,68 −,34`;
  S7 `0 15,97 31,93 −14,19` + `0 ,18 ,45 −,24`; S8 `0 21,3 46,1 −17,7` + `0 ,24 ,62 −,30`.
- **0 van 4 heeft een rand.** De scheiding met het beeld komt van de schaduw, niet van een lijn.
- **Een zwevend vlak is 272–374px hoog en 305–448px breed** (gemeten 338×254 · 448×374 · 422×126 ·
  305×273). Smaller dan 300px leest als een tooltip; breder dan 450px als een tweede kolom.
- **Hover verplaatst, hij kleurt niet.** Gemeten `translateY(-0.16cqw)` met zwaardere schaduw
  (`home-infra.css`), `translateY(-1px)` + randkleur (`home-proof.css`).

**TABLETREGEL** — Radius wordt één waarde: `--m-radius: 14px` (`home-mobile.css:28`). De schaduw
wordt één recept: `--vibe-elev-mob: 0 2px 6px rgba(12,38,72,.06), 0 14px 28px -14px
rgba(12,38,72,.20)` (`home.css:64-65`) — nog steeds twee schaduwen, nog steeds negatieve spread.

**MOBIELE REGEL** — Identiek aan tablet. Het vlak schuift met een negatieve marge 26–34px over het
beeld (zie G08) en wordt breedtevullend binnen de goot.

**TOEGESTANE VARIATIE** — Een zwevend vlak mag donker zijn in plaats van wit (K3 STROOK, `#01234C`,
radius 20px — de grootste kaartradius van de pagina). Het icoonvak mag een tintvlak zijn (4 van 5)
of een vol blauw rond vlak (1 van 5, `home-final.css:277-286`).

**NIET TOEGESTAAN** — Eén enkele `box-shadow`. Een rand van 1px op een vlak dat op een beeld ligt.
Een radius van 10px op een zwevend vlak: dat is de radius van de kaarten die in de stroom staan en
maakt het verschil onzichtbaar.

**HOMEPAGE-BEWIJS** — `vlakken.mjs` blok 1 (`schaduwen: 2`, `rand: 0px`), `zones.mjs` blok 2.
Bronregels: `home-process.css:122`, `home-proof.css:249-250`, `home-infra.css:217-218`,
`home-final.css:271-272`.

**IMPLEMENTATIEAANWIJZING** — Gebruik `--vibe-elev-1` / `--vibe-elev-2` (`home.css:60-63`) in plaats
van een nieuwe `box-shadow`-regel. Er staan nu 23 losse schaduwen in de sectiebestanden tegenover
drie tokens.

---

### G10 · DONKERE VLAKKEN

**DOEL** — Donker is een accent met een budget, geen alternatieve paginastijl.

**VISUELE ANATOMIE** — Geen enkele sectie is donker. Donker bestaat alleen als vlak op een lichte
grond: één paneel, twee apparaatvlakken, één strook, zes kaartbeelden.

**DESKTOPREGEL**
- **0 van 9 sectiegronden is donker.** Gemeten laagste kanaal over alle negen gronden: **234**
  (`#EAF5FE`, de rechterstop van S7). Alle negen liggen in R 234–255 / G 245–255 / B 253–255.
- **Vlakke donkere vlakken beslaan 11,4% van het paginavlak.** Gemeten: paneel 1704×565 + dashboard
  687×429 + telefoon 151×308 + strook 629×124 = 1.381.987px² op een paginavlak van 1774×6810 =
  12.081.940px².
- **Donker komt in 3 van 9 secties voor** (S3, S5, S6). Met de zes mediakaarten van S2 meegeteld
  (foto onder een scrim van .90–.92; 487×498 · 302×498 · 292×498 · 371×230 · 353×230 · 355×230 =
  786.508px²) komt het op 4 van 9 secties en **17,9%** van het paginavlak.
- **Elk gemeten donker vlak heeft alle drie de kanalen ≤ 76.** Gemeten `#001632` · `#011731` ·
  `#01234C` · `#050E1B` · `#03142C` (scrim).
- **Per pagina maximaal één donkere passage over de volle breedte** (S3, 96,1% vw). De overige
  donkere vlakken zijn ≤ 687px breed.
- Tekst op donker is wit of `#93A5BC` / `#C3D2E6`; gemeten 0 gevallen van donkerblauwe tekst op een
  donker vlak.

**TABLETREGEL** — Ongewijzigd in aandeel: gemeten @1024 blijven het paneel (100% vw), het dashboard
en de kaartbeelden donker. Het paneel verliest zijn eenzijdige radius en wordt randvast links én
rechts.

**MOBIELE REGEL** — @390 blijft het paneel volvlaks donker (390×236). De donkere strook en de
apparaatvlakken behouden hun grond. Het aandeel donker per viewport stijgt omdat de pagina smaller
wordt — **NIET GEMETEN** als percentage.

**TOEGESTANE VARIATIE** — Een donker vlak mag een eigen scrim dragen (S3: tweetraps, eerste 20%
volledig dekkend) of een eigen chrome (S5: 1px `rgba(120,175,240,.20)`).

**NIET TOEGESTAAN** — Een donkere sectiegrond. Twee donkere passages over de volle breedte op één
pagina. Een donker vlak dat aan een ander donker vlak grenst zonder lichte tussenruimte.

**HOMEPAGE-BEWIJS** — `vlakken.mjs` blok 1 (33 vlakken met `bg`), `zones.mjs` blok 7 (negen
sectiegronden). Bronregels: `home-project.css:49-52`, `home-control.css:52-76`,
`home-proof.css:299-361`.

**IMPLEMENTATIEAANWIJZING** — Reken het donkere budget per pagina na vóór een tweede donkere sectie
wordt toegevoegd: `(som van de donkere vlakoppervlakken) ÷ (paginabreedte × paginahoogte)`. De
homepage zit op 11,4%.

---

### G11 · LICHTE VLAKKEN

**DOEL** — De lichte grond is geen wit vel: hij heeft treden, verlopen en richting, maar nooit zoveel
dat je een sectiegrens als lijn ziet.

**VISUELE ANATOMIE** — Negen gronden: zeven effen, twee met een verloop. Twee van de negen hebben
een richting (100° en 115°) die bijna gespiegeld is.

**DESKTOPREGEL**
- **Negen gronden, gemeten:** `#FFFFFF` (hero-basis, met een eigen verticaal verloop dat op
  11,2299% — exact de headerhoogte van 84px — naar `#EAF4FE` springt) · `#FCFDFE` ×3 · `#EFF7FE` ·
  `#FAFCFE` · `linear-gradient(100deg, #FEFEFE → #FDFDFE 38% → #F6FAFE 72% → #EAF5FE)` ·
  `#FAFCFD` · `linear-gradient(115deg, #EDF6FD → #F7FBFE 26% → #FDFEFF 46% → #F6FAFE 74% → #EFF7FD)`.
- **Maximaal twee gronden met een verloop per pagina**, en die twee staan niet naast elkaar met
  dezelfde richting: gemeten 100° (S7) en 115° (S9), met S8 ertussen.
- **Maximaal vijf kleurstops per verloop.** Gemeten maximum: 5 (S9).
- **Een lichte sectie met een eigen vlak is de uitzondering, niet de regel: 1 van 9** (S5,
  `#EFF7FE`, 13 digits donkerder dan zijn buurman).
- **Een sectie mag in zichzelf in twee horizontale banden worden gesneden: 1 van 9** (S6, deel A
  `#FAFCFE` tot y = 241px = 27,2% van de sectiehoogte, deel B een 112°-verloop). Zie G13.
- **Een lichte accentvorm op de grond mag donkerder dan de gronden zelf**: gemeten `#E1F1FE`
  (S4 backdrop, R 225), `#B8DCFB` (S6 wig, R 184), `#BEDCF9` (S8 wig, R 190).

**TABLETREGEL** — Dezelfde gronden; de verlopen blijven staan (gemeten @1024 en @390 rapporteert het
harnas dezelfde `linear-gradient(100deg …)` en `(115deg …)`). Wat vervalt zijn de accentvormen
(zie G05).

**MOBIELE REGEL** — Identiek. De trede S4→S5 (13/6/0 digits) blijft de enige zichtbare overgang.

**TOEGESTANE VARIATIE** — Een radiale gloed boven een sectie om een donker vlak aan te kondigen:
gemeten 1 van 1 (`home-project.css:35-41`, `#DFEDFD` over de bovenste 11cqw = 195px, geplaatst op
`120% 100% at 58% 0`).

**NIET TOEGESTAAN** — Een grond met een kanaal onder 234. Drie of meer verlopende gronden op één
pagina. Een verloop dat in dezelfde richting loopt als dat van de aangrenzende sectie: dan leest de
naad als één doorlopend vlak dat per ongeluk springt.

**HOMEPAGE-BEWIJS** — `zones.mjs` blok 7; `home-hero.css:42-46`, `home-proof.css:34-46`,
`home-infra.css:19-20`, `home-footer.css:20-21`.

**IMPLEMENTATIEAANWIJZING** — Zet de kleurtrede altijd op de sectie zelf, niet op een wrapper: het
harnas leest `background` van het element met `data-screen-label` en een trede op een wrapper is
niet toetsbaar.

---

### G12 · VOLVLAKS PROJECTMOMENT

**DOEL** — Eén keer per pagina valt alles weg en staat er één project. Dat moment is zo zeldzaam dat
het alleen werkt als het echt één keer gebeurt.

**VISUELE ANATOMIE** — Eén donker paneel van 1704×565 dat links op de containermarge staat en rechts
het beeld uit loopt, met de tekst in de donkerste 20% van de scrim en het bewijs als lijnenband ín
het beeld.

**DESKTOPREGEL**
- **Precies één per pagina.** Gemeten 1 van 9 secties (11%).
- **Paneel: 96,1% vw, ratio 3,02, hoogte 73,9% van de sectie.** Gemeten 1704×565 met
  `aspect-ratio: 1704/565` (`home-project.css:50`).
- **Eenzijdige radius 63 / 0 / 0 / 63px** (`home-project.css:52`) — de grootste radius van de pagina
  en de enige eenzijdige. Links 70px marge, rechts randvast.
- **De enige sectie met eigen padding:** 100px boven en onder (`home-project.css:23`). De overige
  acht secties hebben `padding: 0`.
- **Tekstkolom 470px = 26,5% vw — de smalste inhoudsbreedte van de pagina.** Beeld : tekst =
  **3,63 : 1**.
- **Tweetraps scrim met een volledig dekkend begin:** `90deg #001632 (0–20%) → .74 (32%) → .30 (46%)
  → .06 (60%) → 0 (70%)` plus `180deg rgba(0,18,42,.30) → 0 op 26%` (`home-project.css:74-82`). De
  tekst staat in het volledig dekkende deel.
- **De kop van deze sectie is in vier opzichten de enige van de pagina:** 1 regel, 0 `<br>`, geen
  accentkleur, en `line-height ÷ graad = 1,000` exact. Daaronder een tweede kopregel in
  **font-weight 400** (`home-project.css:126-133`) die nergens anders voorkomt.
- **Het bewijs staat ín het beeld als K7 BEWIJSBAND**, niet in kaarten ernaast: drie metrieken van
  120 / 140 / 140px met 1px `rgba(255,255,255,.22)` ertussen.

**TABLETREGEL** — Het paneel wordt volvlaks: gemeten @1199 en @1024 is het beeld 100% vw met
randcontact links én rechts. De eenzijdige radius vervalt expliciet
(`home-project.css:230`: `border-radius: 0`), evenals de sectiepadding
(`home-project.css:224`: `padding: 0; height: auto`). De tekstkolom gaat van 26,5% naar
**64,5% vw**.

**MOBIELE REGEL** — @390: beeld 390×236 (100% vw), tekstkolom 348px (89,2% vw), bewijsband van drie
naar **twee kolommen** (`grid 50/50`). De kop gaat van 58,3px naar 28,5px (factor 2,05).

**TOEGESTANE VARIATIE** — De SVG-geometrie binnen het paneel mag in paneelcoördinaten staan met
`preserveAspectRatio="none"` zodat de punten op elke schaal blijven liggen
(`index.html:478-492`).

**NIET TOEGESTAAN** — Twee volvlakse projectmomenten op één pagina. Een casefoto in een afgeronde
container binnen een symmetrische contentbreedte met de cijfers in drie witte tegels eronder: dat is
de generieke oplossing en hij levert 0 overlapparen in plaats van 42.

**HOMEPAGE-BEWIJS** — `forensics-homepage.md §03`; `vlakken.mjs` blok 3 (`dragerRadius:
62.9894px 0px 0px 62.9894px`), blok 4 (`pt/pb: 99.9986px`), blok 5 (`.vh-pr-metrics`,
`eigenVlak: rgba(0,0,0,0)`).

**IMPLEMENTATIEAANWIJZING** — De radius hoort op het paneel, de `clip-path` nergens: dit is het enige
beeld van de pagina dat zijn vorm volledig van een radius krijgt en dat is wat de M2-behandeling
onderscheidt van M6.

---

### G13 · REDACTIONELE SPLITSING

**DOEL** — Eén sectie per pagina mag een pagina-in-een-pagina zijn: twee horizontale banden met een
eigen kop, eigen grond en overlappende zones.

**VISUELE ANATOMIE** — S6 is in twee banden gesneden. Deel A draagt de sectiekop en de logokaarten;
deel B draagt het verhaal, het beeld, de citaatkaart en de strook. Binnen deel B overlappen alle
drie de zones elkaar.

**DESKTOPREGEL**
- **Maximaal één gesplitste sectie per pagina.** Gemeten 1 van 9.
- **Bandverhouding 27,2 / 72,8.** Gemeten: deel A loopt tot `13.6cqw` = 241px van een sectiehoogte
  van 887px (`home-proof.css:34-46`).
- **In een gesplitste sectie is geen enkele kolomnaad schoon.** Gemeten: verhaal x78…610 (532px),
  foto x548…1282 (734px), citaatkaart x1240…1688 (448px). Verhaal/foto overlappen **62,6px**,
  foto/kaart **42px**. Nul schone naden.
- **Tweede koppenniveau toegestaan op factor 1,13.** Gemeten: sectiekop 53px, verhaalkop 47px, met
  de notitie "duidelijk secundair aan de sectiekop" (`home-proof.css:173`).
- **Maximaal drie eyebrow-trackings in één gesplitste sectie.** Gemeten: 0,133em (deel A), 0,101em
  (deel B), 0,22em (strook).
- **Vier kaartfamilies is het maximum** (zie G06): K5 · K2 · K3 + één losse knop.

**TABLETREGEL** — De splitsing wordt verticaal: gemeten `home-proof.css:475-484` zet deel B op
`grid-template-columns: 1fr 1fr` met verhaal over beide kolommen, foto links en citaatkaart rechts.
De overlappen verdwijnen (gemeten 0 overlapparen @1024).

**MOBIELE REGEL** — Volledig lineair: `display:flex; flex-direction:column` met expliciete
`order`-waarden 1…5 (`home-proof.css:386-390`). Gemeten @390: 2 overlapparen (alleen de citaatkaart
28px over het beeld).

**TOEGESTANE VARIATIE** — Deel A mag een effen grond hebben en deel B een verloop (gemeten:
`#FAFCFE` tegen `112deg #EDF7FE → #F2F9FE 26% → #ECF6FE 60% → #E3F1FE`).

**NIET TOEGESTAAN** — Twee gesplitste secties op één pagina. Een splitsing met schone kolomnaden:
dan is het gewoon een raster met twee rijen.

**HOMEPAGE-BEWIJS** — `forensics-homepage.md §06`; `zones.mjs` blok 1 (S6, `gat: -62,6`) en blok 2
(`.vh-proof-kaart` 9,4%, `.vh-proof-story` 11,8%).

**IMPLEMENTATIEAANWIJZING** — Declareer de banden als twee kinderen (`.vh-proof-a`, `.vh-proof-b`)
met absolute plaatsing binnen één `container-type: inline-size`-sectie; alleen dan houden beide
banden dezelfde schaalfactor.

---

### G14 · BEWIJSCOMPOSITIE

**DOEL** — Cijfers staan in een band met lijnen, niet in tegels. Een tegel maakt van bewijs een
product.

**VISUELE ANATOMIE** — Vier bewijsbanden op de pagina. Geen enkele heeft een eigen vlak; alle vier
worden uitsluitend door 1px lijnen verdeeld.

**DESKTOPREGEL**
- **4 van 4 bewijsbanden hebben `background: rgba(0,0,0,0)` en `box-shadow: none`.** Gemeten
  `.vh-kpi-grid` (1740×160), `.vh-pr-metrics` (470×49), `.vh-proof-cijfers` (374×105),
  `.vh-final-vdl` (822×64).
- **De scheiding is altijd 1px.** Gemeten `#DCE7F3` 69px hoog (S1, `home-hero.css:353-360`),
  `rgba(255,255,255,.22)` met 42,5 ref-px padding (S3, `home-project.css:148-152`),
  `rgba(255,255,255,.28)` (S2 statistiekbalk, `home-solutions.css:253-269`).
- **Celverdeling: gelijk óf contentgedreven, nooit willekeurig.** Gemeten: 580/580/580 (exact gelijk),
  177/177 (exact gelijk), 275,0/299,5/248,0 (expliciet `326fr 355fr 294fr`), 120/140/140
  (contentgedreven flex).
- **Getal : label = 1,50–1,75.** Gemeten 28 : 16 = 1,75 (S1), 34,3 : 21 = 1,63 (S3),
  21 : 14 = 1,50 (S6). Getal altijd `font-weight: 700`, label altijd `400`.
- **De KPI-band onder de hero is de enige gelijkverdeelde rij in de bovenste helft van de pagina**
  (3 × 580px = 33,3% elk) en heeft een eigen grond met een eigen horizontaal verloop
  (`#F7FCFF → #FDFDFE`) en **geen bovenlijn**.

**TABLETREGEL** — De band blijft een band: gemeten @1024 `grid 33.3/33.3/33.3` met gap 20px voor
`.vh-kpi-grid`, `.vh-infra-vdl` en `.vh-final-vdl`. De 1px lijnen worden vervangen door gap
(`home-infra.css:434-435` zet `border-top: 0` en `border-left: 1px solid #E4F0FC` voor de
KPI-items).

**MOBIELE REGEL** — @390 gemeten: `.vh-pr-metrics` wordt `grid 50/50` (van drie naar twee kolommen),
`.vh-proof-cijfers` blijft `50/50`. **Een bewijsband wordt nooit één kolom**: twee is het minimum,
anders leest hij als een opsomming.

**TOEGESTANE VARIATIE** — Een bewijsband mag binnen een kaart staan (S2, de statistiekbalk op de
grote mediakaart) of binnen een beeld (S3).

**NIET TOEGESTAAN** — Drie witte tegels met schaduw onder een casefoto. Een bewijsband met een eigen
achtergrondkleur. Eén kolom op mobiel.

**HOMEPAGE-BEWIJS** — `vlakken.mjs` blok 5, vier rijen, `eigenVlak: rgba(0, 0, 0, 0)` en
`eigenSchaduw: none` in alle vier.

**IMPLEMENTATIEAANWIJZING** — Teken de scheidingslijn als `::before` op de cel, niet als
`border-left`: dan kun je hem korter maken dan de cel (gemeten 69px op een cel van 160px) en valt de
lijn niet tegen de sectierand aan.

---

### G15 · PRODUCT- EN SYSTEEMVISUALISATIE

**DOEL** — Het product wordt gebouwd, niet gefotografeerd. Een screenshot in een afgeronde container
is het generieke antwoord.

**VISUELE ANATOMIE** — Eén sectie zonder foto. Twee apparaatvlakken met echte, leesbare inhoud:
een dashboard met live-indicator, drie waardetegels en een stroomschema met negen knopen en een hub,
plus een telefoon die ervoor staat.

**DESKTOPREGEL**
- **0 `img`-elementen in de sectie.** Gemeten: geen uitsnede, geen ratio, geen overlay.
- **Twee apparaatvlakken met bewust ongelijke ratio.** Gemeten dashboard 687×429 (ratio **1,60**),
  telefoon 151×308 (ratio **0,49**).
- **Het kleinste vlak staat vóór het grootste en overlapt het 27px.** Gemeten: telefoon x78…229 op
  `z-index: 2`, dashboard x202…889 op `z-index: 1`; de telefoon staat **100px lager** (y3347…3655
  binnen y3247…3676).
- **Het object beslaat 28% van het sectievlak** (687×429 van 1774×588).
- **Dit is de enige gespiegelde compositie van de pagina:** object links (x78…889), tekst rechts
  (x982…1708), gat 93px. Zie **DR-V-06**.
- **Binnen het object drie geneste rasters:** rail/hoofdvlak 19,1 / 80,9, tegels `repeat(3,1fr)`,
  stroomschema 40,8 / 18,4 / 40,8 (`home-control.css:104, 122, 132`).
- **De interface beweegt.** Twee animaties gedeclareerd: een puls van 1,8s en een stroomanimatie van
  1,1s (`home-control.css:94-96, 164-166`), met `@media (prefers-reduced-motion: reduce)` op
  `home-control.css:280`. *De render van die animaties is **NIET GEMETEN** — het harnas maakt
  stilstaande afdrukken.*
- **Deze sectie is de kleinste van de pagina** (588px = 33,2cqw) en heeft de **krapste bovenmarge**
  (42px) én de **breedste kopkolom** (726px = 40,9% vw).

**TABLETREGEL** — Het object blijft gebouwd. Gemeten @1024: rail/hoofdvlak 16,2 / 83,8,
stroomschema 45,2 / 9,6 / 45,2 — de rail en de middenkolom krimpen, de tegels blijven
`repeat(3,1fr)`. De sectie wordt lineair: object boven, tekst onder.

**MOBIELE REGEL** — @390 gemeten: de voordeelrij gaat van `repeat(4,1fr)` naar `50/50`, de
stroomschema-grid verdwijnt uit de meting en het aantal overlapparen zakt van 57 naar **0**. Het
object wordt één vlak in plaats van twee overlappende.

**TOEGESTANE VARIATIE** — Een derde apparaatvlak is toegestaan zolang de ratio's blijven
verschillen en de stapelvolgorde klein-voor-groot blijft.

**NIET TOEGESTAAN** — Een productscreenshot in een afgeronde container naast de tekst. Twee
apparaatvlakken met dezelfde ratio. Een gebouwd object zonder leesbare inhoud (blinde blokjes).

**HOMEPAGE-BEWIJS** — `forensics.mjs` @1774 sectie 05: geen `beeld`-regel, `kaarten 2`,
`57 overlapparen`. `home-control.css:20, 52-76, 104-132, 228-230`.

**IMPLEMENTATIEAANWIJZING** — Bouw het dashboard in DOM-elementen met `cqw`-maten, niet als SVG of
PNG: alleen dan schaalt het mee met de factor 0,8117 en blijft de tekst erin selecteerbaar.

---

### G16 · CTA-COMPOSITIE

**DOEL** — Eén duidelijke actie per sectie, altijd dezelfde vorm, altijd zonder schaduw.

**VISUELE ANATOMIE** — Negen gevulde blauwe knoppen over negen secties, twee witte secundaire
knoppen, elk met een pijlglyph. De knop is het enige vlak op de pagina dat géén schaduw draagt.

**DESKTOPREGEL**
- **Negen gevulde blauwe CTA's.** Verdeling: S1 twee (de header-CTA 227×63 en de hero-CTA 228×62),
  S2 t/m S3 en S5 t/m S9 elk één, **S4 geen** (de processectie draagt geen actie).
- **Hoogte 59–67px in 8 van 9.** Gemeten 62 · 63 · 63 · 63 · 65 · 67 · 67 · 59 · **50**. De enige
  uitschieter is `.vh-ctrl-cta` op 50px. Zie **DR-V-09**.
- **Breedte 220–315px**, spreiding 95px. Gemeten 220 · 227 · 228 · 235 · 244 · 284 · 302 · 310 · 315.
- **Radius 9,1–11,8px, met 10px in 6 van 9.** Gemeten 9,12 · 10 ×6 · 11,70 · 11,81.
- **0 van 9 heeft een `box-shadow`.** Dat is het verschil met een kaart: kaarten zweven, knoppen
  liggen.
- **Maximaal twee knoppen naast elkaar, in 2 van 9 secties** (S1 en S8). De tweede is wit met een
  1px rand en **dezelfde hoogte binnen 2px**: gemeten 62 tegen 64 (S1) en 63 tegen 63 (S8).
- **Elke CTA draagt een pijl.** Waargenomen op alle negen sectieafdrukken: 9 van 9.
- Binnen een kaart is de CTA een **ronde pijlknop**, geen balk: gemeten 38px standaard, 46px op de
  grote kaart, 39px op de onderrij (`home-solutions.css:226-249, 293-300`).

**TABLETREGEL** — De knoppen komen naast elkaar te staan met een minimumbreedte in plaats van een
vaste: gemeten `min-width: 250px` (`home-final.css:421`), `260px` / `240px`
(`home-infra.css:432, 445`), `280px` (`home-proof.css:471`). Hoogte `--m-btn-h: 56px`.

**MOBIELE REGEL** — De knoppen worden breedtevullend en stapelen: gemeten `width: 100%; height:
var(--m-btn-h)` met `--m-btn-h: 52px`, `border-radius: 10px`, `justify-content: space-between`
(`home-final.css:354-358`). De pijl staat dan rechts in plaats van direct achter de tekst.

**TOEGESTANE VARIATIE** — Een sectie mag een tekstlink met pijl naast de knop zetten in plaats van
een tweede knop (gemeten S3 "Meer projecten", S6 "Alle projecten", S7 "Neem contact op").

**NIET TOEGESTAAN** — Een schaduw onder een knop. Drie knoppen naast elkaar. Twee knoppen van
ongelijke hoogte naast elkaar. Twee blauwe gevulde knoppen in één sectie.

**HOMEPAGE-BEWIJS** — `zones.mjs` blok 8, elf knoppen met maat, radius, grond, randbreedte en
schaduw (`sh: none` in 11 van 11).

**IMPLEMENTATIEAANWIJZING** — Zet de pijl als inline-SVG van 19×19px met `flex: none`; een
pseudo-element met `content: '→'` verschuift mee met de letterafstand en breekt de hoogte van 59–67px.

---

### G17 · SECTIEGRENZEN

**DOEL** — Een sectie heeft een gemeten hoogte, geen hoogte die uit zijn inhoud volgt. Dat is wat de
pagina als één compositie laat schalen.

**VISUELE ANATOMIE** — Negen secties met een vaste hoogte in `cqw`. Zes daarvan delen hun formule in
drie paren. Geen enkele sectie heeft een rand, een marge of (op één na) padding.

**DESKTOPREGEL**
- **Elke sectie zet `height` in `cqw`.** Gemeten: 51,2 · 50,1 · 43,1 · 35,2 · 33,2 · 50,0 · 50,0 ·
  35,6 · 35,6 cqw. **`max ÷ min = 908 ÷ 588 = 1,544`** — geen enkele uitschieter.
- **Drie paren delen exact dezelfde formule:** `50cqw` voor S6 en S7 (`home-proof.css:18`,
  `home-infra.css:17`), `35.5681cqw` voor S8 en S9 (`home-final.css:19`, `home-footer.css:18`), en
  50,1/51,2cqw voor S1 en S2 binnen 1,1cqw.
- **0 van 9 secties heeft `border-top` of `border-bottom`.** Gemeten `0px` in 9 van 9.
- **0 van 9 secties heeft `margin-top` of `margin-bottom`.** Gemeten `0px` in 9 van 9.
- **8 van 9 secties hebben `padding: 0`.** De enige uitzondering is S3 (100px boven en onder) — het
  volvlakse projectmoment, zie G12.
- **Elke sectie is `container-type: inline-size`.** Gemeten 9 van 9 (`home-hero.css:11`,
  `home-solutions.css:10`, `home-project.css:20`, `home-process.css:20`, `home-control.css:17`,
  `home-proof.css:15`, `home-infra.css:14`, `home-final.css:16`, `home-footer.css:15`).
- **Toets:** `pageH@1440 ÷ pageH@1774` moet gelijk zijn aan `1440 ÷ 1774` binnen 0,2%. Gemeten
  0,8117 tegen 0,8117. De B2-kandidaat haalt 0,8838 tegen 0,8117 — **8,9% afwijking**.

**TABLETREGEL** — Vaste hoogtes vervallen: gemeten `height: auto` voor alle negen secties onder
1200px (`.vh`, `.vh-sol`, `.vh-pr`, `.vh-proc`, `.vh-ctrl`, `.vh-proof`, `.vh-infra`, `.vh-final`,
`.vh-footer`). In plaats daarvan `padding: var(--m-sec-y) 0` met `--m-sec-y: 64px`. Gemeten
sectiehoogtes @1024: 1049 · 1059 · 781 · 1099 · 1023 · 1005 · 937 · 1014 · 794 →
`max ÷ min = 1099 ÷ 781 = **1,407**`.

**MOBIELE REGEL** — `--m-sec-y: 44px` (`home-mobile.css:20`, met de genoteerde reden dat 56px boven
én onder 112px tussen twee secties opleverde op een scherm van 390px). Gemeten sectiehoogtes @390:
1033 · 1411 · 820 · 1075 · 1075 · 1244 · 1159 · 1000 · 1240 → `max/min = **1,721**`, ruimer dan de
1,544 op desktop. Zie **DR-V-12**.

**TOEGESTANE VARIATIE** — Twee secties mogen dezelfde hoogte delen; dat bindt ze visueel (S6+S7 en
S8+S9).

**NIET TOEGESTAAN** — Een sectie met `height: auto` boven 1200px. Een sectie waarvan de hoogte meer
dan 1,6× de kleinste sectie is (de homepage zit op 1,544). Een rand of marge tussen twee secties.

**HOMEPAGE-BEWIJS** — `vlakken.mjs` blok 4, negen rijen met `bt`, `bb`, `mt`, `mb`, `pt`, `pb`.
`forensics-homepage.md §0.1-0.2`.

**IMPLEMENTATIEAANWIJZING** — Reken een nieuwe sectiehoogte uit als `ref-px ÷ 17,74` en noteer de
referentiewaarde in het commentaar, zoals `home-control.css:20` doet
(`height: 33.171cqw; /* 476 ref + 32px lucht naar sectie 6 */`).

---

### G18 · SECTIEOVERGANGEN

**DOEL** — Een naad is nooit een lijn. Hij is een kleurtrede, een vorm die doorloopt, of helemaal
niets.

**VISUELE ANATOMIE** — Acht naden. Zes zijn vrijwel onzichtbaar, twee zijn bewuste treden. Eén
sectie maakt zijn eigen scheidslijn door een vlak 24px onder zijn top te laten beginnen.

**DESKTOPREGEL**
- **0 van 8 naden heeft een scheidingslijn.** Gemeten: geen `border` op een sectie, geen `hr`,
  geen 1px vlak op een naad.
- **6 van 8 naden hebben een kleurtrede van ≤ 4 digits per kanaal.** Gemeten:
  S1→S2 `#FDFDFE → #FCFDFE` = 1/0/0 · S2→S3 = 0/0/0 · S3→S4 = 0/0/0 · S5→S6 `#EFF7FE → #FAFCFE` =
  11/5/0 · S6→S7 `#FAFCFE → #FEFEFE` = 4/2/0 · S7→S8 `#FEFEFE → #FAFCFD` = 4/2/1.
- **Maximaal 2 zichtbare treden per pagina, en elk ≤ 13 digits per kanaal.** Gemeten:
  S4→S5 = **13/6/0** en S8→S9 = **13/6/0**. Beide markeren een echte wisseling: de eerste naar de
  enige productsectie, de tweede naar de footer.
- **Een sectie mag zijn eigen scheidslijn maken.** Gemeten 1 van 1: `.vh-proc-backdrop` begint
  `1.3866cqw` = 24px onder de sectietop (`home-process.css:40`), waardoor de diagonale ondergrond
  zelf de grens trekt.
- **Een sectie mag de vorm van zijn voorganger herhalen op een andere schaal.** Gemeten 1 van 1:
  S9 herhaalt de chevron van S8 op **19,7% van de breedte** (350px tegen 935px).
- **De header ligt ín de hero**, niet erboven: absoluut geplaatst, 84px hoog, `z-index: 10`
  (`home-hero.css:137-146`). Er staat dus geen losse navigatiebalk boven de compositie.

**TABLETREGEL** — De treden blijven, de vormherhaling vervalt (`.vh-footer-wig{display:none}`,
`home-footer.css:372`). De header wordt een vaste balk van 76px met
`background: rgba(255,255,255,.92)` en `backdrop-filter: blur(14px)` plus een **1px onderlijn**
`rgba(12,27,51,.08)` (`home-mobile.css:71-85, 198`) — de enige lijn in het hele systeem.

**MOBIELE REGEL** — Header 64px, verder identiek. Sectieafstand wordt `--m-sec-y: 44px` boven én
onder; dat is 88px tussen twee secties.

**TOEGESTANE VARIATIE** — Een radiale gloed over de bovenste 11cqw van een sectie om een donker vlak
aan te kondigen (S3, `home-project.css:35-41`).

**NIET TOEGESTAAN** — Een `border-top` op een sectie. Meer dan twee zichtbare kleurtreden per pagina.
Een trede van meer dan 13 digits per kanaal: dat leest als twee pagina's.

**HOMEPAGE-BEWIJS** — `zones.mjs` blok 7 (negen gronden met exacte kanaalwaarden) en
`vlakken.mjs` blok 4 (`bt: 0px` in 9 van 9).

**IMPLEMENTATIEAANWIJZING** — Reken de trede na met de letterlijke rgb-waarden uit
`getComputedStyle(section).backgroundColor`, niet met de hex in de bron: een verloop levert aan de
naad een andere waarde dan zijn eerste stop.

---

### G19 · ASYMMETRIE

**DOEL** — De hoofdverdeling van een sectie is nooit 50/50. Dat is de goedkoopste en meest zichtbare
manier waarop een pagina generiek wordt.

**VISUELE ANATOMIE** — Acht tweedelingen gemeten. Zeven liggen tussen 21,6 en 42,0%; één is de
gespiegelde productsectie op 48,6%. Nul liggen op 50/50.

**DESKTOPREGEL**
- **De lichtste zijde van een tweedeling is maximaal 42%.** Gemeten
  (`min(tekst,media) ÷ (tekst+media)`, `zones.mjs` blok 1):

| sectie | tekstzone | mediazone | verdeling | lichtste zijde |
|---|---:|---:|---|---:|
| S3 project | 470,0 | 1704,0 | 21,6 / 78,4 | **21,6%** |
| S1 hero | 504,0 | 1774,0 | 22,1 / 77,9 | **22,1%** |
| S2 oplossingen | 506,0 | 1133,0 | 30,9 / 69,1 | **30,9%** |
| S4 aanpak | 460,4 | 956,4 | 32,5 / 67,5 | **32,5%** |
| S7 infra | 567,7 | 1100,0 | 34,0 / 66,0 | **34,0%** |
| S8 final | 674,1 | 934,7 | 41,9 / 58,1 | **41,9%** |
| S6 resultaat | 532,2 | 734,4 | 42,0 / 58,0 | **42,0%** |
| S5 CONTROL | 726,1 | 687,1 | 51,4 / 48,6 | **48,6%** ← gespiegeld |

- **0 van 8 tweedelingen is 50/50.** De dichtstbijzijnde is de gespiegelde productsectie op 48,6%.
- **De zones raken elkaar niet volgens één regel.** Gemeten gat tussen de twee zones: **1,9px**
  (S7, de enige plek op de pagina waar twee zones elkaar praktisch raken) · 76,6px (S8) · 92,7px
  (S5) · 221,2px (S4) · **−62,6px** (S6, de zones overlappen) · −470px en −504px (S3 en S1, de tekst
  ligt op het beeldvlak).
- **Rasters bínnen een sectie mogen wél gelijk zijn.** Gemeten 4 van 9 rijen exact gelijk (G07). De
  verdeling tussen tekst en beeld nooit.
- **Twee rijen in dezelfde kolom hebben verschillende verdelingen.** Gemeten S2: 45,1/27,9/27,0
  tegen 32,8/31,2/31,4, met naden die **116px** en **65px** verspringen.
- **Vijf zones met afnemende steek** is toegestaan als afsluiting: gemeten S9 met steken
  **372 · 226 · 212 · 194px**, geen enkel paar gelijk.

**TABLETREGEL** — De asymmetrie verdwijnt bewust. Gemeten @1024: `grid 50/50` voor `.vh-proof-b`,
`.vh-proof-logos`, `.vh-proof-cijfers` en `.vh-proc-stappen`; `repeat(3,1fr)` en `repeat(4,1fr)`
elders. **Op tablet is gelijk verdelen de regel, niet de uitzondering.**

**MOBIELE REGEL** — @390: `50/50` of één kolom. De asymmetrie verhuist naar de **volgorde**: gemeten
`order: 1…5` in `home-proof.css:386-390` en `order: 1…5` in `home-final.css:332-340`.

**TOEGESTANE VARIATIE** — Eén gespiegelde sectie per pagina (object links, tekst rechts), en die mag
tot 48,6% gaan omdat de spiegeling zelf al het contrast levert. Zie **DR-V-06**.

**NIET TOEGESTAAN** — `grid-template-columns: 1fr 1fr` voor de hoofdverdeling van een desktopsectie.
Twee gespiegelde secties op één pagina. Een lichtste zijde boven 42% in een niet-gespiegelde sectie.

**HOMEPAGE-BEWIJS** — `zones.mjs` blok 1, acht rijen met `aandeelTekst`, `aandeelMedia` en `gat`.
`home-solutions.css:28` (`28.5231cqw 63.8670cqw`).

**IMPLEMENTATIEAANWIJZING** — Schrijf de hoofdverdeling als twee `cqw`-waarden
(`28.5231cqw 63.8670cqw`), niet als `1fr 2fr`: een `fr`-paar geeft 33,3/66,7 en dat valt net buiten
elke gemeten waarde op de pagina.

---

### G20 · BEHEERSTE LEEGTE

**DOEL** — Leegte is een budget per sectie, geen restwaarde.

**VISUELE ANATOMIE** — Gemeten als de afstand van de sectietop tot de bovenkant van het eerste
tekstkader, en van de onderkant van het laatste tekstkader tot de sectieonder.

**DESKTOPREGEL**
- **Leegte boven + onder = 16,8–23,3% van de sectiehoogte in 7 van 9 secties.** Gemeten:

| sectie | hoogte | boven | onder | (boven+onder) ÷ hoogte |
|---|---:|---:|---:|---:|
| 01 Hero | 908 | 11 | 54 | **7,2%** ← podium |
| 02 Oplossingen | 889 | 90 | 59 | 16,8% |
| 03 Project | 765 | 155 | 143 | **39,0%** ← paneel |
| 04 Aanpak | 624 | 85 | 57 | 22,8% |
| 05 CONTROL | 588 | 42 | 62 | 17,7% |
| 06 Resultaat | 887 | 59 | 94 | 17,2% |
| 07 Infra | 887 | 113 | 75 | 21,2% |
| 08 Final | 631 | 67 | 80 | 23,3% |
| 09 Footer | 631 | 83 | 60 | 22,7% |

- **Twee uitzonderingen, beide met een reden:** het podium (7,2% — het beeld *is* de sectie, dus er
  ís geen marge) en het volvlakse projectmoment (39,0% — het paneel heeft 100px eigen padding boven
  en onder).
- **Bovenmarge 42–155px, ondermarge 54–143px.** De krapste bovenmarge (42px) hoort bij de kleinste
  sectie (588px); de ruimste (155px) bij de sectie met eigen padding.
- **Binnen een tekstkolom is het ritme vast:** gemeten eyebrow→kop 34px, kop→lead 28px, lead→CTA 34px
  (`home-hero.css:26-29`).
- **Tekstspan als % viewport: 26,5 · 70,1 · 84,0 · 89,8 · 90,5 · 90,8 · 91,3 · 91,3 · 94,2;
  mediaan 90,5%.** Zeven van negen secties zitten boven 84%; de twee uitzonderingen zijn het paneel
  (26,5%, G12) en de slot-CTA (70,1%, omdat rechts alleen de afspraakkaart staat). **Leegte zit in
  de hoogte, niet in de breedte.**

**TABLETREGEL** — Eén waarde vervangt het budget: `--m-sec-y: 64px` boven én onder
(`home-mobile.css:40`). Gemeten tekstspan @1024: **90,6% vw in 6 van 9 secties**; de drie overige
zijn 85,5 (S1), 64,5 (S3) en 88,0% (S9).

**MOBIELE REGEL** — `--m-sec-y: 44px`, met de genoteerde reden dat 56px "112px tussen twee secties"
opleverde (`home-mobile.css:17-20`). Gemeten tekstspan @390: **89,2% vw in 8 van 9 secties**; de
negende is 94,1% (S5).

**TOEGESTANE VARIATIE** — Een sectie die zelf een paneel of podium is mag buiten de band 16,8–23,3%
vallen, mits de leegte dan in het vlak zit en niet eromheen. Of dat per sectietype wordt
vastgelegd, is **DR-V-10**.

**NIET TOEGESTAAN** — Leegte boven 25% van de sectiehoogte in een gewone sectie: dat leest als een
ontbrekend element. Een tekstspan onder 80% vw op desktop: de B2-kandidaat haalt een mediaan van
60,9% en **0 van 11 secties boven 80%**.

**HOMEPAGE-BEWIJS** — `zones.mjs` blok 3, negen rijen. `forensics.mjs` regel `tekst x … (npx)`.

**IMPLEMENTATIEAANWIJZING** — Reken het budget na als `(boven + onder) ÷ sectiehoogte` en zet de
uitkomst in het commentaar boven de sectie. Het is de goedkoopste toets die er is en hij vangt een
sectie die te leeg of te vol is geworden.

---

### G21 · TYPOGRAFISCH SCHAALCONTRAST

**DOEL** — Eyebrow, kop en lead zijn drie regimes met drie verschillende tracking-tekens en twee
verschillende regelafstandsbanden. Het contrast zit in het systeem, niet in één grote kop.

**VISUELE ANATOMIE** — Acht koppen, acht verschillende graden. Zeven breken hun regels met de hand.
Drie trackingregimes zonder één overlappende waarde.

**DESKTOPREGEL**
- **Drie trackingregimes, één per rol, nul overlap:**
  - eyebrow **+0,022 … +0,175em** — gemeten 0,022 · 0,045 · 0,050 · 0,092 · 0,133 · 0,134 · 0,137 ·
    0,175. **8 van 8 positief.**
  - kop **−0,004 … −0,016em** — gemeten −0,004 · −0,008 · −0,012 ×4 · −0,015 · −0,016.
    **8 van 8 negatief.**
  - lead **0,000em (`normal`)** — **7 van 7.**
- **Twee regelafstandsbanden met een gat ertussen:** kop `lh ÷ graad` = 0,951 · 0,955 · 0,968 ·
  0,981 · 0,984 · 0,996 · 1,000 · **1,132**; lead = 1,276 · 1,335 · 1,336 · 1,391 · 1,393 · 1,400 ·
  1,450. **Geen enkele waarde tussen 1,132 en 1,276.** Zeven van acht koppen zitten op of onder
  1,000.
- **Twee gewichten:** kop **700** in 8 van 8, lead **400** in 7 van 7. Geen tussengewicht in deze
  twee rollen.
- **Kop : eyebrow = 3,21–4,66.** Gemeten 3,21 · 3,38 · 3,44 · 3,51 · 3,63 · 3,79 · 4,02 · 4,66.
  De twee hoogste waarden zijn de hero (4,66) en de slot-CTA (4,02): de twee secties die een
  pagina openen en sluiten.
- **Kop : lead = 2,65–3,54.** Gemeten 2,65 · 2,67 · 2,71 · 2,78 · 2,84 · 3,20 · 3,54.
- **Acht koppen, acht graden:** 53 · 54 · 58,3 · 61 · 61,5 · 64 · 66 · 76,5px. Geen enkele graad
  komt twee keer voor. De H1 is 1,16× de grootste H2.
- **7 van 8 koppen breken met de hand:** 11 `<br>` in totaal (2 · 2 · 0 · 1 · 1 · 1 · 2 · 2), alle
  elf zichtbaar op 1774px. **Geen enkele kop wrapt zelf.**
- **7 van 8 koppen hebben een accentkleur**; in 6 daarvan loopt het accent door tot het einde van de
  kop, in 1 (de slot-CTA) staat het midden in regel 2.

**TABLETREGEL** — De acht graden worden drie. Gemeten @1024 en @1199: **58px** (hero, `--m-h1`),
**42px** (zes H2's, `--m-h2`), **52px** (slot-CTA, `clamp(42px,5.6vw,52px)`,
`home-final.css:419`). Alle `<br>` in koppen worden uitgezet.

**MOBIELE REGEL** — Drie graden, gemeten @390: **35,5px** (`clamp(34px,9.1vw,44px)`), **28,5px**
(`clamp(27px,7.3vw,34px)`), **33,5px** (`clamp(32px,8.6vw,41px)`, `home-final.css:346`).
Regelafstand 1,04–1,08 voor koppen (dus **boven** 1,000, omgekeerd aan desktop) en 1,55 voor leads.
Tracking kop **−0,018em** (`home-process.css:221`, `home-proof.css:395`) tot **−0,02em**
(`home-final.css:348`). Eyebrow **11,5px met vaste tracking 0,14em** (`--m-eyebrow`,
`home-mobile.css:226-234`) — **één waarde in plaats van acht**.

**TOEGESTANE VARIATIE** — Eén kop per pagina mag een regelafstand boven 1,000 hebben (gemeten
1 van 8: 1,132). Eén sectie mag twee koppenniveaus dragen (G13, factor 1,13).

**NIET TOEGESTAAN** — Een eyebrow met negatieve tracking, een kop met positieve tracking, of een
lead met tracking ≠ 0. Twee koppen met dezelfde graad op één pagina (de B2-kandidaat heeft
**6 unieke graden op 10 koppen**, waarvan 44px viermaal). Een kop met `line-height` tussen 1,13 en
1,28: die band is op de hele pagina leeg.

**HOMEPAGE-BEWIJS** — `zones.mjs` blok 4, negen rijen met `eye`, `kop`, `lead`, `verh`, `kopLead`.
`vlakken.mjs` blok 6 (acht koppen met `brs` en `brsZichtbaar`).

**IMPLEMENTATIEAANWIJZING** — De `<br>` in een kop is een ontwerpbeslissing, geen tekstfout. Zet hem
in de HTML en schakel hem per breekpunt uit met `… br{ display: none }`; dat patroon staat **28 keer**
in `home*.css`, waarvan 8 keer op een kop en 6 keer op een lead.

---

### G22 · MERKGEOMETRIE

**DOEL** — De merkhoek is geen enkel getal. Het is een familie per rol, en de rol bepaalt hoe
scherp.

**VISUELE ANATOMIE** — Dertien `clip-path`-dragers op 1774px, plus drie SVG-vormen. Gemeten vanaf
de verticaal. Elke hoek hoort bij precies één van vier rollen.

**DESKTOPREGEL** — Vier rollen, vier banden:

| rol | wat het doet | gemeten hoeken (vanaf de verticaal) | band | mediaan |
|---|---|---|---|---:|
| **A1 · BEELDSNEDE AAN EEN SCHERMRAND** | het beeld raakt een schermrand en de snede *is* de sectiegrens | 28,1 · 31,6 · 32,7 · 32,8 · 34,4 · 35,4 (S1, S8, S9) | **28,1–35,4°** | **32,75°** |
| **A2 · BEELDSNEDE IN DE FLOW** | het beeld raakt geen rand; een tekstkolom loopt langs de snede | 9,7 · 13,0 (S7, S6) | **9,7–13,0°** | 11,35° |
| **B · WIGVLAK** | vol gekleurd vlak dat een hoek sluit of een rand oversteekt | 32,6 · 34,4 · 35,8 · 35,9 · 36,2 (S6, S1-band, S1-SVG, S3-SVG, S8-blauw) | **32,6–36,2°** | **35,8°** |
| **C · ACHTERGRONDVLAK** | getint vlak ónder de inhoud, draagt geen beeld en geen merkkleur | 27,3 · 32,1 · 32,6 · 32,7 · 32,8 · 33,7 · 34,4 · 35,4 · 35,4 (S1-wig, S4, S5, S8-wig) | **27,3–35,4°** | **33,7°** |
| **D · BEELDVERVANGER** | staat waar een foto ontbreekt | 25,0 (S2) | eenmalig | — |

**Wat de analyse oplevert:**
- **Het wigvlak is de scherpste en strakste familie:** band 32,6–36,2°, **spreiding 3,6°**. Dit is de
  hoek die je als "het merk" herkent. Mediaan **35,8°**.
- **De beeldsnede aan een rand is breder:** 28,1–35,4°, spreiding **7,3°**. Hij mag flauwer zijn dan
  het wigvlak omdat hij een hele sectiehoogte overbrugt.
- **De beeldsnede in de flow is een andere familie, geen variant:** 9,7–13,0°, **19,6° flauwer dan de
  scherpste snede**. Dat is geen verzachting maar een functie: beide gevallen hebben een tekstkolom
  die langs of over de snede loopt (S6: de verhaalkolom ligt 62,6px over het beeld, precies in de
  hoek die de 13°-snede vrijlaat; S7: de kolomrand eindigt 1,9px vóór de fotorand).
- **Het achtergrondvlak kopieert de hoek van het beeld dat erop ligt, exact.** Gemeten 2 van 4:
  S1 `.vh-wig` 32,8/34,4 = `.vh-foto` 32,8/34,4; S8 `.vh-final-wig` 32,7/35,4 = `.vh-final-foto`
  35,4/32,7. De twee die geen beeld dragen (S4 33,7°, S5 27,3/32,1°) staan vrij binnen de band.
- **Het achtergrondvlak mag ook bijna-horizontale randen hebben.** Gemeten S5: 88,1° en 87,3° vanaf
  de verticaal, dus **1,9° en 2,7° vanaf de horizontaal**. Dat zijn de enige randen op de pagina
  onder 9,7°, en ze maken een punt, geen diagonaal. (`zones.mjs` blok 6; het harnas van de forensics
  sloeg deze clip over omdat het alleen pseudo-elementen van de *kinderen* van een sectie leest,
  `forensics.mjs:123`.)
- **De 25°-eenling valt buiten elke familie** (dichtstbijzijnde buur 27,3°) en staat op de enige plek
  waar een foto ontbreekt (`home-solutions.css:303-305`). Zie **DR-V-02**.
- **Eén ronde knik per pagina:** `a90 90 0 0 0` in de navyvorm van de hero (`index.html:120`).

**TABLETREGEL** — **Elf van de dertien dragers worden uitgezet, via twee mechanismen.** Vijf krijgen
`clip-path: none` (`home-hero.css:450`, `home-proof.css:434`, `home-infra.css:345`,
`home-final.css:376`, `home-footer.css:376`); zes krijgen `display: none` (G05). Twee blijven staan:
`.vh-ctrl::before` (`home-control.css:40`) en `.vh-sol-grafisch::before`
(`home-solutions.css:318`). Wat terugkeert is **één rol**: een merkwig rechtsonder ín het beeld,
`polygon(100% 0, 100% 100%, 0 100%)` over 46%×62% van de beelddrager (`home-hero.css:458-466`)
respectievelijk 44%×58% (`home-final.css:389-397`).
**Gemeten hoek @1199 66,3° en 67,9°; @1024 62,4° en 64,2°; @834 57,1° en 59,2°; @768 54,9° en 57,0°.**

**MOBIELE REGEL** — Dezelfde wig, gemeten @390 **48,1° en 52,3°**. Afgezet tegen de wigfamilie B
(32,6–36,2°) is dat **11,9 tot 35,3° flauwer**, en de hoek **drijft 18,2° (hero) respectievelijk
15,6° (slot-CTA)** over het bereik 390–1199px, omdat de polygoon in percentages staat van een box
waarvan de ratio meeverandert. Dit is een gemeten feit, geen voorstel. Zie **DR-V-07**.

**TOEGESTANE VARIATIE** — Binnen een rol mag de hoek variëren binnen de gemeten band. Tussen rollen
niet: een wigvlak van 13° of een beeldsnede-in-de-flow van 35° bestaat op de homepage niet. Of de
band blijft of één waarde per rol wordt vastgelegd, is **DR-V-01**.

**NIET TOEGESTAAN** — Eén vaste gradenwaarde voor alles. De B2-kandidaat doet precies dat:
**4 geometrie-elementen, alle vier exact 34°, alle vier hetzelfde `::after` op een mediablok**. Dat
is technisch consistent en visueel leeg. Verder: een beeldsnede in de flow met een hoek uit de
wigfamilie — dan snijdt de diagonaal door de tekstkolom.

**HOMEPAGE-BEWIJS** — `zones.mjs` blok 6: dertien dragers met maat, hoeken, puntenaantal en
`draagtBeeld`. `forensics.mjs` regel `geo` @1774, @1199, @1024, @834, @768 en @390.

**IMPLEMENTATIEAANWIJZING** — Kies eerst de rol, dan de hoek. Reken de polygoonpercentages terug naar
graden met `atan2(|dx|, |dy|)` op de werkelijke afmeting van de drager; een hoek in de bron
opschrijven zonder die controle levert op een andere ratio een andere hoek — precies wat er onder
1200px gebeurt.

---

### G23 · VISUELE DIEPTE

**DOEL** — Diepte komt van stapeling, scrims en schaduw — in die volgorde, en nooit van alleen
schaduw.

**VISUELE ANATOMIE** — 454 overlappende elementparen over negen secties, drie tot zeven
gepositioneerde niveaus per sectie, een hoogste `z-index` van 11.

**DESKTOPREGEL**
- **454 overlappende elementparen, 0 van 9 secties met nul.** Gemeten per sectie 158 · 64 · 42 ·
  19 · 57 · 19 · 50 · 43 · 2; mediaan **43**. **Een sectie met 0 overlapparen bestaat niet op deze
  pagina.** De laagste (2) is de footer, waar alleen de handgeschreven notitie op het beeld ligt.
- **3 tot 7 gepositioneerde niveaus per sectie.** Gemeten: S1 zeven (`z1 .vh-foto` → `z2 .vh-band`
  → `z3 svg` → `z4 .vh-wig` → `z10 header` → `z11 .vh-copy` en `.vh-navy-copy`), S6 zeven,
  S8 zes, S7 zes, S3/S5 vier, S2/S4/S9 drie.
- **De hoogste `z-index` binnen de negen secties is 11** (`.vh-copy` en `.vh-navy-copy`). De
  gemeten z-niveaus lopen van 0 tot 11. Hoger komt alleen buiten de compositie voor: de mobiele
  overlays (menu `39`, header `40`, skiplink `60`, `home-mobile.css:48-85, 141-157`).
- **10 van 13 beelden dragen een scrim.** De drie zonder zijn S4 (de band — de witte kaart draagt
  zijn eigen vlak), S6 hoofdfoto en S6 duimnagel (de strook en de citaatkaart dragen hun eigen
  vlak). Gemeten regel: **staat er ongevlakte tekst direct op beeldpixels, dan is er een scrim —
  3 van 3** (S1, S8, S9). Omgekeerd is de scrim optioneel: S7 heeft er een onder vier witte kaarten,
  met de geschreven reden dat die anders "los zweven" (`home-infra.css:173-183`). Zie **DR-V-08**.
- **Scrimrichting en -diepte zijn per sectie anders.** Gemeten gradienthoeken 255 · 180 · 180 ·
  90+180 · 268 · 200 · 180°; sterkste dekking 1,00 (S3) · 0,92 (S2 boven) · 0,62 (S2 onder, S8) ·
  0,52 (S7) · 0,46 (S9) · 0,34 (S1).
- **Schaduw hoort alleen bij kaarten.** Gemeten: 4 van 4 zwevende vlakken hebben twee schaduwen,
  **0 van 9 knoppen** heeft er één, **0 van 9 secties** heeft er een.
- **Eén gedeeltelijke scrim per pagina is toegestaan:** gemeten `inset: 0 0 42% 0` in de footer, met
  de reden dat de opname daar licht is waar de referentie een schemerlucht had
  (`home-footer.css:69-75`).

**TABLETREGEL** — Diepte zakt met **84%**: gemeten **72 overlapparen @1199** tegen 454 @1774, en 74
@1024. De scrims blijven staan; de stapeling verdwijnt. Vier van negen secties hebben @1199 nul
overlapparen.

**MOBIELE REGEL** — Gemeten **73 overlapparen @390**, verdeeld 0 · 50 · 13 · 4 · 0 · 2 · 0 · 4 · 0.
**Vier van negen secties hebben nul.** Wat overblijft zijn de kaarten die 26–34px over een beeld
schuiven (G08) en de gestapelde inhoud binnen de mediakaarten van S2.

**TOEGESTANE VARIATIE** — Een scrim mag tweetraps zijn (S3: `90deg` plus `180deg`) of gedeeltelijk
(S9). Een sectie mag haar eigen stapel van vier geometrische lagen hebben (S1).

**NIET TOEGESTAAN** — Een sectie met nul overlappende elementparen op desktop. Diepte die
uitsluitend uit `box-shadow` bestaat. Een `z-index` boven 11 in de paginacompositie.

**HOMEPAGE-BEWIJS** — `forensics.mjs` regel `lagen n overlapparen` op alle zes breedtes;
`vlakken.mjs` blok 3 (`scrim`), blok 1 (`schaduwen`).

**IMPLEMENTATIEAANWIJZING** — Meet het aantal overlapparen vóór en na een wijziging met het harnas.
Het is het enige getal dat in één oogopslag laat zien of een sectie een compositie is geworden of een
stapel blokken is gebleven.

---

### G24 · RESPONSIEVE VEREENVOUDIGING

**DOEL** — Onder 1200px is het niet dezelfde pagina kleiner. Het is een ander ontwerp met dezelfde
inhoud, en de regels die vervallen vervallen **expliciet**.

**VISUELE ANATOMIE** — Eén breekpunt op 1200px waar de compositie wordt afgebroken, en één op 768px
waar de typetrap en de goot verspringen. Alles ertussen is lineair.

**DESKTOPREGEL** — Boven 1200px geldt §3 onverkort. Gemeten controle: `pageH@1440 ÷ pageH@1774 =
0,8117` tegen `1440 ÷ 1774 = 0,8117` — afwijking < 0,2%. **Tussen 1200 en 1439px is NIET GEMETEN.**

**TABLETREGEL** — Elf gemeten vereenvoudigingen op het breekpunt 1200px:

| wat | @1774 | @1199 | @1024 |
|---|---:|---:|---:|
| overlappende elementparen | 454 | **72** (−84%) | 74 |
| secties met 0 overlapparen | 0 van 9 | 4 van 9 | 4 van 9 |
| gemaskeerde beelden | 5 van 8 | **0 van 8** | 0 van 8 |
| geometrie-elementen (harnas) | 12 | **3** | 3 |
| unieke kopgraden | **8 op 8 koppen** | 3 | 3 |
| `<br>` zichtbaar in koppen | 11 | 0 | 0 |
| gelijke kaartrijen | 1 van 9 | 1 van 9 | **2 van 9** |
| sectiehoogte `max ÷ min` | 1,544 (vast, cqw) | — | 1,407 (contentgedreven) |
| tekstspan (mediaan % vw) | 90,5 | 92,0 | 90,6 |
| spreiding tekstspan | 26,5–94,2 | 55,0–92,0 | 64,5–90,6 |
| paginahoogte (px) | 6810 | 8647 | 8760 |

Verder gemeten op het breekpunt:
- **`height: auto` + `padding: var(--m-sec-y) 0`** in 9 van 9 secties.
- **Negen geometrie-elementen** worden met `display:none` uitgezet, plus twee tekstblokken die op
  een beeld lagen (G05).
- **28 regels `… br{ display: none }`** zetten de handgezette regelval uit, waarvan 8 op een kop en
  6 op een lead.
- **`position: static`** vervangt absolute plaatsing; de volgorde wordt met `order: 1…5` gezet.
- **Eén radius vervangt veertien:** `--m-radius: 14px` voor kaarten, `--m-radius-img: 12px` voor
  beelden, in 6 van 11 stylesheets.
- **Het footerbeeld verdwijnt volledig** (`home-footer.css:372`). Zie **DR-V-11**.

**MOBIELE REGEL** — Op 768px verspringt de typetrap nogmaals. Gemeten kopgraden: 49,2 / 35,3 / 43,0
@768 · 53,4 / 38,4 / 46,7 @834 · 35,5 / 28,5 / 33,5 @390. Goot 38 / 42 / 21px. Sectieritme
64 → 44px. Gemeten @390: **73 overlapparen**, **4 van 9 secties met nul**, sectiehoogte
`max ÷ min = 1,721`, paginahoogte **10056px** (1,48× die van 1774px terwijl de viewport 4,5×
smaller is).

**TOEGESTANE VARIATIE** — Een element mag op tablet een andere rol krijgen dan op desktop: gemeten
`.vh-proof-b` gaat van drie overlappende zones naar `1fr 1fr` met `.vh-proof-story` over beide
kolommen (`home-proof.css:475-484`). Een element mag op tablet terugkeren in een andere vorm
(de merkwig, G22).

**NIET TOEGESTAAN** — Een desktopcompositie die onder 1200px "gewoon kleiner wordt": dan staan
kaarten op beelden die te klein zijn geworden voor hun tekst. Een geometrie-element dat op mobiel
blijft staan zonder dat zijn hoek is nagemeten. Een `cqw`-maat die onder 1200px blijft doorwerken
zonder vangnet — `home-mobile.css:207-221` is dat vangnet en noemt de reden: "de secties rekenen in
cqw; onder 1200px zijn die eenheden betekenisloos klein".

**HOMEPAGE-BEWIJS** — `forensics.mjs` op 1774 · 1440 · 1199 · 1024 · 834 · 768 · 390px;
`home-mobile.css:9-45` (de drie banden), plus de 11 `display:none`- en 28 `br`-regels uit
`home*.css`.

**IMPLEMENTATIEAANWIJZING** — Draai het harnas op minimaal drie breedtes (1774, 1024, 390) vóór een
sectie klaar heet. De twee getallen die een fout direct laten zien zijn **overlapparen per sectie**
en **tekstspan als % viewport**.

---

## §4 · Toetsblad

Vierentwintig regels, vierentwintig metingen. Elke rij is in één meting te controleren.

| # | regel | toets | homepagewaarde |
|---|---|---|---:|
| G01 | BEELDREGIE | beeld als % vw per beeldsectie | 19,7–100; mediaan **53,3**; 5 van 8 ≥ 50 |
| G02 | BEELDUITSNEDE | verticale `object-position` | **34–62%** in 13 van 13 |
| G03 | BEELDMASKERING | beeldsecties met `clip-path` | **5 van 8**; 4 van 5 met radius 0 |
| G04 | BEELD AAN DE RAND | beelden op een schermrand, en welke | **4 van 8, alle 4 rechts** |
| G05 | BEELD + GEOMETRIE | hoekverschil vlak ↔ beeldsnede langs dezelfde lijn | **0,0°** in 3 van 3 |
| G06 | KAARTCOMPOSITIE | kaarten per rij | **2–4**; 0 rijen met ≥ 5 |
| G07 | KAARTHIERARCHIE | `max ÷ min` per rij | inhoud **1,051–1,668**; register **1,000** |
| G08 | KAART OVER BEELD | % kaartoppervlak op het beeld | **≥ 99,8% (8×), 80,8% (1×), < 12% (2×)** |
| G09 | ZWEVENDE VLAKKEN | aantal schaduwen + radius | **2 schaduwen**, radius **11,7–16,0** |
| G10 | DONKERE VLAKKEN | donker oppervlak ÷ paginavlak | **11,4%**; 0 van 9 gronden donker |
| G11 | LICHTE VLAKKEN | laagste kanaal over alle gronden | **234** |
| G12 | PROJECTMOMENT | aantal volvlakse donkere passages | **1 van 9** |
| G13 | RED. SPLITSING | aantal gesplitste secties + schone naden | **1 van 9**, **0** schone naden |
| G14 | BEWIJSCOMPOSITIE | bewijsbanden met eigen vlak | **0 van 4** |
| G15 | PRODUCTVISUALISATIE | `img`-elementen in de productsectie | **0** |
| G16 | CTA-COMPOSITIE | knoppen met `box-shadow` | **0 van 9**; hoogte 59–67 in 8 van 9 |
| G17 | SECTIEGRENZEN | `pageH@1440 ÷ pageH@1774` | **0,8117** (= 1440 ÷ 1774) |
| G18 | SECTIEOVERGANGEN | naden met een lijn | **0 van 8**; ≤ 2 treden > 4 digits |
| G19 | ASYMMETRIE | lichtste zijde van de hoofdverdeling | **21,6–42,0%** (+ één gespiegelde 48,6%) |
| G20 | BEHEERSTE LEEGTE | (boven + onder) ÷ sectiehoogte | **16,8–23,3%** in 7 van 9 |
| G21 | SCHAALCONTRAST | teken van de tracking per rol | eyebrow **+**, kop **−**, lead **0** |
| G22 | MERKGEOMETRIE | hoek per rol | A1 **28,1–35,4** · A2 **9,7–13,0** · B **32,6–36,2** · C **27,3–35,4** |
| G23 | VISUELE DIEPTE | overlapparen per sectie | **454 totaal**, 0 van 9 met nul |
| G24 | RESP. VEREENVOUDIGING | overlapparen @1774 → @1199 | **454 → 72** (−84%) |

---

## §5 · Wat NIET gemeten is

| onderwerp | reden |
|---|---|
| **Contrastwaarden van tekst op beelden** | Het harnas meet geometrie, geen contrast. `home-solutions.css:171-175` bevat een eerdere meting (slechtste 1,00:1 vóór de correctie) die niet is herhaald. |
| **De vier animaties** (`vhCtrlPuls` 1,8s, `vhCtrlStroom` 1,1s, twee hovertransities) | Als CSS-declaratie gelezen; de render is stilstaand gemeten. |
| **Gedrag tussen 1200 en 1439px** | Gemeten is 1774, 1440, 1199, 1024, 834, 768 en 390. De band 1200–1439 is niet bemonsterd. |
| **Gedrag boven 1774px en op 430px** | Niet bemonsterd. |
| **Of de 55,8px-overschrijding in S4 bedoeld is** | Gemeten feit; `home-process.css:118` claimt het tegendeel. Welke van de twee waar moet zijn is een besluit, geen meting — **DR-V-04**. |
| **Of de mobiele `object-position` nog klopt** | De dragers wijzigen van ratio (G02); of de uitsnede in de bron meeverandert is niet nagegaan. |
| **Het donkere aandeel per mobiele viewport** | Alleen op 1774px berekend (11,4%). |
| **Toegankelijkheid** (focusvolgorde, toetsbediening, `prefers-reduced-motion` in de praktijk) | Buiten de scope van dit document; `home.css:119-127` en `home-control.css:280` zijn als declaratie gelezen. |

---

## §6 · Open besluiten

Elk besluit volgt uit een gemeten spreiding. Geen ervan is een voorstel om nu iets te wijzigen.
De nummering `DR-V-nn` hoort bij **dit** document.

**DR-V-01 — Eén hoek per rol, of de band?**
G22 levert vier banden: A1 28,1–35,4° · A2 9,7–13,0° · B 32,6–36,2° · C 27,3–35,4°. Legt V1.2 per rol
één waarde vast (bijvoorbeeld de medianen 32,8 · 11,5 · 35,8 · 33,7°) of blijft de gemeten band
toegestaan? Vastleggen maakt de regel toetsbaar met `==` in plaats van met `tussen`; de band houdt
de pagina levend.

**DR-V-02 — De 25°-eenling.**
`span.vh-sol-grafisch::before` (289×285, 25°) valt buiten elke familie en vervangt ontbrekende
HVAC-fotografie (`home-solutions.css:303-305`). Wordt hij een eigen rol in de taxonomie
("BEELDVERVANGER"), of vervalt hij zodra de foto er is?

**DR-V-03 — Masker én radius.**
Vier van de vijf maskerdragers hebben radius 0; `.vh-infra-foto` heeft 9,7° **én** 18px. Wordt
"masker XOR radius" de regel met S7 als genoteerde uitzondering, of wordt de combinatie toegestaan
voor snedes onder 15°?

**DR-V-04 — Kaart kruist beeldrand: 55,8px of 0?**
`.vh-proc-kaart` steekt 55,8px voorbij de rechterrand en 8,0px voorbij de onderrand van de foto,
terwijl `home-process.css:118` "rechterrand gelijk aan de foto" claimt. Vastleggen als middel van
M4 BAND (band 8–56px) of corrigeren naar de eigen notitie?

**DR-V-05 — Gelijke rijen: welke uitzondering?**
Vier van negen rijen zijn exact gelijk en alle vier dragen een register (K4, K7, K8 ×2). Maar de
K8-rij in S8 is bewust ongelijk (`326fr 355fr 294fr`). Wordt de regel "inhoudskaarten ongelijk,
registers gelijk" met S8 als uitzondering, of "ongelijk tenzij K4"?

**DR-V-06 — De gespiegelde sectie en de 42%-grens.**
S5 is de enige sectie die G19 overtreedt (lichtste zijde 48,6%) en de enige gespiegelde compositie.
Wordt "één gespiegelde M0-sectie per pagina mag tot 48,6%" vastgelegd, of geldt 42% ook daar?

**DR-V-07 — De merkhoek onder 1200px.**
De teruggekeerde wig drijft van **48,1° @390 tot 67,9° @1199** — 11,9 tot 35,3° flauwer dan de
wigfamilie B (32,6–36,2°), met een drift van 18,2° over het bereik. Wordt de hoek vastgezet
(bijvoorbeeld met een `aspect-ratio` op de pseudo) of wordt de drift geaccepteerd als mobiel
kenmerk?

**DR-V-08 — Wanneer is een scrim verplicht?**
"Ongevlakte tekst op beeldpixels ⇒ scrim" klopt in 3 van 3. S7 heeft een scrim zonder ongevlakte
tekst, met de geschreven reden dat de vier kaarten anders los zweven. Wordt de scrim verplicht onder
elke kaartkolom op een beeld, of blijft hij daar een keuze met motivatie?

**DR-V-09 — CTA-hoogte.**
Acht van negen gevulde CTA's liggen tussen 59 en 67px; `.vh-ctrl-cta` is 50px. Eén hoogte vastleggen
(bijvoorbeeld 63px, de modus) of de band 59–67px toestaan en de 50px corrigeren?

**DR-V-10 — Witruimtebudget per sectietype.**
Zeven van negen secties zitten op 16,8–23,3%; het podium op 7,2% en het paneel op 39,0%. Wordt het
budget per sectietype vastgelegd (podium / paneel / gewoon), of blijft het één band met twee
genoteerde uitzonderingen?

**DR-V-11 — Het footerbeeld onder 1200px.**
`.vh-footer-wig` wordt volledig uitgezet; gemeten 0 beelden in S9 op 1199, 1024 en 390px. Is de
merkvorm in de footer een desktopmiddel, of hoort er een mobiele uitvoering te komen? De footer is
nu de enige sectie die op mobiel geen enkel beeld draagt.

**DR-V-12 — Vaste sectiehoogte als desktopregel.**
Boven 1200px is `max ÷ min = 1,544` bij vaste `cqw`-hoogtes; op 390px is het **1,721** bij
contentgedreven hoogtes. Blijft de vaste hoogte expliciet een desktopregel, of krijgt het mobiele
ontwerp ook een hoogtebudget?

---

## §7 · Herkomst

| bestand | wat het levert |
|---|---|
| `forensics.mjs` (aangeleverd) | sectiegewijze meting: canvas, grid, beeld, geometrie, kaarten, lagen, typografie — gedraaid op 1774 · 1440 · 1199 · 1024 · 834 · 768 · 390px |
| `zones.mjs` (deze sessie) | zonesplitsingen, kaart-op-beeld als oppervlaktepercentage, witruimte per sectie, typografische trap, rijbreedtes, alle `clip-path`-dragers met rol, sectiegronden, knoppen |
| `vlakken.mjs` (deze sessie) | kaartgronden en schaduwstructuur, alle horizontale rijen, scrim per beeld met dragerradius en `object-position`, sectienaden, bewijsbanden, `<br>` per kop |
| `forensics-homepage.md` (aangeleverd) | de forensische basis per sectie, waaruit de taxonomie M0–M6 en K1–K8 is afgeleid |
| `home*.css`, `index.html` | elke `bestand:regel`-verwijzing in dit document |

Beide meetscripts zijn read-only: ze laden de pagina via Playwright op `http://127.0.0.1:8033/` en
lezen `getBoundingClientRect` en `getComputedStyle`. Er is niets aan de productiecode gewijzigd.
