> **STATUS V1.3 — BEWIJSBIJLAGE, NIET NORMATIEF.**
> Dit document is V1.2. Zijn forensische metingen blijven geldig als BEWIJS; zijn regels en
> poorten zijn **niet aanvaard** en zijn vervangen door `docs/04-visual-language-v1.3.md`.
> Zie `docs/00-changelog.md` §3 voor de reden en §4 voor de twee intrekkingen.

# Vibe Web Design System V1.2 — BEELDCOMPOSITIESYSTEEM

Documentatie. **Geen implementatie.** Dit document wijzigt geen HTML, CSS, JS of ander docs-bestand.
Waar het een wijziging aan de productie voorstelt, staat dat als voorstel *in dit bestand* onder
§16 OPEN BESLUITEN.

| | |
|---|---|
| Bron van waarheid | Homepage Master v1, commit `aae26bf`. **Zelf getoetst:** `git diff aae26bf -- index.html 'home*.css'` geeft 0 regels verschil; HEAD staat op `8ea4c25`. De gemeten pagina is dus byte-identiek aan de master. |
| Primaire meetbreedte | 1774px, met controlemetingen op 1440 · 1199 · 768 · 390px |
| Server | `http://127.0.0.1:8033/index.html` |
| Vergelijkingspagina | `systeem-energieopslag.html` ("B2-kandidaat"), zelfde breedtes |
| Overgenomen bewijs | `home-1774-1440-1199.txt`, `home-forensics.json`, `b2-forensics.json`, `forensics-homepage.md`, `shots/home/*.png` (acht sectieafdrukken bekeken) |
| Zelf gemeten in deze sessie | `beeld.mjs` → `home-beeld.json`/`.txt` en `b2-beeld.json`/`.txt` (beeldgeometrie op 5 breedtes, met punt-in-polygoontoets), `contrast.mjs` → `contrast-1774.txt` (gecomponeerd contrast onder tekst en vlakken, scrim aan/uit), `contrast2.mjs` → `contrast2-1774.txt` (tekstschaduw meegerekend, stoorvlakken uitgesloten), `kaal.mjs` → `kaal.txt` (informatievlakken en kaal type op beeldpixels, beide pagina's) |

Elke regel hieronder is toetsbaar: een getal, een verhouding, een telling of een waarneembaar
ja/nee. Waar iets niet gemeten kon worden staat **NIET GEMETEN** met de reden.

---

## 0. BESTAANSRECHT

In V1.0/V1.1 is een beeld een **asset**: je kiest een afbeelding, legt hem in een rastercel, geeft
hem een radius en zet er tekst naast. Op de Homepage Master is een beeld een **dragend
ontwerpelement**: het bepaalt de sectiehoogte, het draagt de typografie, het wordt gesneden door de
merkhoek en er liggen vlakken bovenop.

Het verschil is gemeten, niet aangevoeld:

| gemeten eigenschap @1774 | Homepage Master | B2-kandidaat |
|---|---|---|
| beeldrechthoek als % van het paginavlak | **43,7%** | **19,2%** |
| idem, na aftrek van het weggemaskerde deel | **37,2%** | 19,2% (geen maskers) |
| beelden ≥ 50% viewportbreedte | **5 van 13** (100 · 96,1 · 62,0 · 53,9 · 52,7%) | **1 van 7** |
| beeldsecties met een beeld ≥ 50% vw | **5 van 8 (62,5%)** | **1 van 5 (20%)** |
| beelden met een polygoonmasker | **5 van 13** | **0 van 7** |
| secties met *enig* vlak dat op werkelijke beeldpixels ligt | 6 van 8 | **5 van 5** — geen onderscheid |
| secties met een **informatievlak** (≥ 30.000px², ≥ 50% van zijn eigen oppervlak op beeldpixels) | **4 van 8** (7 vlakken) | **0 van 5** |
| secties met **kaal type** op beeldpixels (geen tussenliggend vlak) | **4 van 8** | **1 van 5** |
| beeldsecties met minstens één van die twee | **8 van 8** | **1 van 5** |
| middelen per beeld (zie §11, tweemiddelenregel) | **2 tot 4** | **0 of 2** |

Berekend uit `home-beeld.json`, `b2-beeld.json` en `kaal.txt` (alle drie deze sessie gemeten);
de percentages van het paginavlak zijn
`Σ(breedte × hoogte van elk beeld) ÷ (viewportbreedte × paginahoogte)`.

De B2-kandidaat heeft vier beelden met ratio 1,33 · 1,29 · 1,14 · 1,33 op 44,2 · 40,9 · 40,9 ·
38,2% vw, elk met hetzelfde middel: een `::after` van **34°** die vier keer identiek terugkomt.
Dat is "afgeronde rechthoek naast tekst", vier keer. §11 bestaat om precies dat te blokkeren.

**Twee correcties op het aangeleverde bewijs, zelf gemeten.** `forensics-homepage.md` stelt dat de
B2-kandidaat "0 van 11" secties heeft met een informatievlak op een beeld. Met mijn eigen harnas
(`kaal.mjs`, punt-in-polygoontoets) meet ik dat **5 van de 5** B2-beeldsecties wel degelijk een
vlak op beeldpixels hebben — maar het zijn chips, tags en bijschriften van 6.592 tot 24.600px², en
drie ervan raken het beeld maar met 3,2 tot 22,3% van hun eigen oppervlak. Het verschil zit dus
niet in *of* er een vlak op het beeld ligt, maar in **hoe groot het is en hoeveel van zichzelf het
erop legt**: homepage 7 vlakken van 53.172 tot 85.852px² die voor 81–100% van hun eigen oppervlak
op beeldpixels liggen, B2 **nul**.
Ook de vijfde B2-sectie (06 Projectbewijs, een paneelbeeld van 100% vw met een 92deg-scrim van
4 stops en witte metriektekst erop) is wél gecomponeerd: dat beeld haalt de tweemiddelenregel.
Eén van de vijf, niet nul van de vijf.

---

## 1. DE ZEVEN BEHANDELINGEN — overzicht

| | naam | bronsectie | stylesheet | beeldbreedte @1774 | ratio @1774 | masker | scrim |
|---|---|---|---|---|---|---|---|
| **M0** | GEEN FOTO | S5 VIBE.CONTROL | `home-control.css` | — (0 beelden) | — | — | — |
| **M1** | PODIUM | S1 Hero | `home-hero.css` | 100% vw | 2,37 | 32,8 / 34,4° | ja (vignet) |
| **M2** | PANEEL | S3 Project | `home-project.css` | 96,1% vw | 3,02 | nee (radius 63px) | ja (richting) |
| **M3** | DRAAGVLAK | S6 Proof · S7 Infra | `home-proof.css` · `home-infra.css` | 41,4% · 62,0% vw | 1,32 · 1,49 | 13,0° · 9,7° | nee · ja (richting) |
| **M4** | BAND | S4 Aanpak | `home-process.css` | 53,9% vw | 3,26 | nee (radius 14px) | **nee** |
| **M5** | KAARTBEELD | S2 Oplossingen | `home-solutions.css` | 16,5–27,5% vw (5×) | 0,59–1,54 | nee (kaartradius 10px) | ja (richting) |
| **M6** | HOEKBEELD | S8 Final · S9 Footer | `home-final.css` · `home-footer.css` | 52,7% · 19,7% vw | 1,48 · 0,67 | 35,4/32,7° · 31,6/28,1° | ja (vignet) · ja (richting, 58%) |

Twee scrimsoorten, beide gemeten:

- **richtingsscrim** — de donkerste stop ligt aan de kant waar de tekst staat. Gemeten 5×:
  M2 (90deg, tekst links), M5 bovenrij (180deg donker boven, tekst boven), M5 onderrij (180deg
  donker onder, tekst onder), M3-infra (268deg donker rechts, kaarten rechts), M6-footer (180deg
  donker boven, notitie boven).
- **vignetscrim** — donker aan beide uiteinden, licht in het midden. Gemeten 2×: M1
  (.30 → **.12 op 46%** → .34) en M6-final (.62 → **.38 op 44%** → .58). In beide gevallen staat
  er géén type rechtstreeks op de beeldpixels: M1 zet de tekst op een navyvorm, M6-final op een
  witte kaart.

**Regel S-1.** Staat er type rechtstreeks op beeldpixels, dan is de scrim een richtingsscrim met
zijn donkerste stop aan de tekstkant. Staat alle tekst op een eigen vlak, dan mag het een vignet
zijn met zijn lichtste stop tussen 44 en 46% (de twee gemeten waarden).

---

## 2. M0 — GEEN FOTO

**A BRON.** S5 VIBE.CONTROL, `section#vibe-control.vh-ctrl`, `home-control.css:17-45` (sectie),
`:52-76` (de twee apparaatvlakken). Gemeten: **0 `img`-elementen in deze sectie**, op alle vijf de
breedtes (`home-beeld.txt`, regel "05 VIBE.CONTROL … beelden=0" bij 1774 · 1440 · 1199 · 768 · 390).

**B BEELDVERHOUDING.** Niet van toepassing. De twee gebouwde vlakken hebben ratio **1,60**
(dashboard 687×429) en **0,49** (telefoon 151×308).

**C MAAT.** Het dashboard beslaat 38,7% vw (687px) en 73% van de sectiehoogte; samen met de
telefoon 28% van het sectievlak. De sectie is met `height: 33.171cqw` (`home-control.css:20`) =
588px de **kleinste van de pagina**.

**D UITSNEDE EN FOCUS.** Geen uitsnede. In plaats daarvan echte, leesbare inhoud: een
live-indicator, drie waardetegels, een stroomschema met negen knopen en één hub.

**E SCHERMRANDEN.** Geen. Gemeten zichtbaar vlak x78…889 (object) en x982…1708 (copy):
niets raakt een schermrand.

**F GEOMETRIE.** Eén vijfhoekig schaduwvlak achter de apparaten,
`clip-path: polygon(7% 9.5%, 62% 4%, 62% 96%, 6.6% 88%, -0.6% 46%)` (`home-control.css:35-45`).
**Gradenwaarde NIET GEMETEN** — geen van de vier zijden is zuiver schuin, de hoekdetectie van
`forensics.mjs:58-75` slaat de vorm over.

**G OVERLAY.** Geen.

**H TEKST.** Gespiegelde compositie: object links (x78…889), copy rechts (x982…1708), gat 93px.
Kopkolom 726px = **40,9% vw, de breedste van de pagina**.

**I KAARTEN.** K6 APPARAATVLAK ×2. De kleinste overlapt de grootste met **27px** en staat 100px
lager. Bewust ongelijk: ratio 1,60 tegenover 0,49.

**J RESPONSIEF.** 0 beelden op alle breedtes. Sectiehoogte 588 → 478 (1440) → 1004 (1199) →
1016 (768) → 1075 (390): de sectie groeit op mobiel met factor **1,83** ten opzichte van 1774.

**K NIET GEBRUIKEN.** Maximaal 1× per pagina. Niet als vervanging van een foto die er wél zou
moeten zijn — dat is wat `span.vh-sol-grafisch` in S2 doet, en dat staat expliciet als noodgreep
beschreven (`home-solutions.css:303-305`): één 25°-vlak dat ontbrekende HVAC-fotografie vervangt.
M0 is alleen geldig als het getoonde object **het product zelf** is en echte waarden draagt
(gemeten minimum: 3 waardetegels + 9 knopen + 1 hub).

---

## 3. M1 — PODIUM

> Het beeld **is** het sectiecanvas; de tekst staat in een vorm die eruit gesneden is.

**A BRON.** S1 Hero, `div.vh`. Podium `home-hero.css:36-39`; fotolaag `.vh-foto`
`home-hero.css:54-64` (clip-path) en `:67-75` (`object-fit: cover`, `object-position: 50% 50%`);
scrim `:77-82`; band `:87-102`; wig `:115-132`; SVG-geometrie `index.html:97-121`.

**B BEELDVERHOUDING per breedteband** (gemeten):

| breedte | beeld | ratio | % vw | % sectiehoogte |
|---|---|---|---|---|
| 1774 | 1774×748 | **2,37** | 100 | 82,4 |
| 1440 | 1440×607 | 2,37 | 100 | 82,4 |
| 1199 | 1103×360 | 3,06 | 92,0 | 34,3 |
| 768 | 691×360 | 1,92 | 90,0 | 34,3 |
| 390 | 348×232 | 1,50 | 89,2 | 22,5 |

De desktopratio is vastgelegd als `aspect-ratio: 1774/748` op het podium (`home-hero.css:38`);
1774 en 1440 zijn één en dezelfde compositie op schaal 0,8117.

**C MAAT.** Desktop vast op **100% vw**; er is geen band. De beeldrechthoek beslaat 82,4% van de
sectiehoogte, maar na het masker blijft **56% van die rechthoek** over (gemeten met een
punt-in-polygoontoets, 400 monsters) = **46,1% van het sectievlak**.

**D UITSNEDE EN FOCUS.** `object-position: 50% 50%` (`home-hero.css:73`); de uitsnede zit al in het
derivaat. Focuspuntregel: het masker snijdt de linkerhelft weg — de vrije rand loopt van **56,2%**
van de breedte bovenaan naar **35,2%** op 72,9% hoogte. Het onderwerp moet dus rechts van die lijn
vallen. Op mobiel verschuift de uitsnede naar **56% 54%**.

**E SCHERMRANDEN.** Links, rechts én boven (gemeten `rand[LRT]`). Onder niet: daar ligt de
KPI-band van 160px. Op ≤1199 raakt het beeld geen enkele rand meer (gutter).

**F GEOMETRIE.** Vier lagen op één beeld — het dichtste geometriegebruik van de pagina:
de witte band langs de diagonaal (34,4°), de SVG-accentdriehoek (35,8°), de SVG-navyvorm (drager
van de witte tekst, met de enige ronde knik van de pagina, `index.html:120`) en de uitdoofwig
(`home-hero.css:115-132`). Het maskerpaar meet **32,8° en 34,4°** met een knik op (624, 545).

**G OVERLAY.** Vignetscrim `linear-gradient(255deg, rgba(4,20,44,.30) 0%, rgba(4,20,44,.12) 46%,
rgba(4,20,44,.34) 100%)` (`home-hero.css:81`).
**Gemeten contrast onder de tekst** (achtergrond gemeten met de tekst onzichtbaar):

| tekst | kleur | mediane achtergrond-L | contrast mediaan | contrast bij p95 | ongunstigste monster |
|---|---|---|---|---|---|
| `.vh-navy-kop` 31px | wit | 0,015 | **16,03:1** | 14,8:1 | 14,14:1 |
| `.vh-navy-lijst li` 15,3px ×4 | wit | 0,009–0,014 | 16,37–17,74:1 | — | 15,95:1 |

**Scrim uit gemeten:** het contrast onder `.vh-navy-kop` blijft **16,03:1** — ongewijzigd. De
navyvorm is dekkend en ligt boven de scrim. De scrim van M1 dient dus de leesbaarheid van de
**geometrie**, niet van de tekst. Dat is een meting, geen aanname (`contrast-1774.txt`, blok
"SCRIM AAN / UIT").

**H TEKST.** De H1 staat **niet** op het beeld: 12 van de 17 tekstdragers binnen de beeldrechthoek
vallen buiten het masker (gemeten). Alleen het navyblok (1 kop + 4 regels) staat op beeldpixels.
De langste H1-regel eindigt 410px vóór de diagonaal. Beeld : tekstkolom = 1774 : 504 = **3,5 : 1**.

**I KAARTEN.** Geen kaart. Drie knopvlakken; gemeten ligt alleen de header-CTA (227×63)
**100% op beeldpixels**, de twee hero-knoppen liggen binnen de beeldrechthoek maar buiten het
masker. Met 14.301px² haalt die knop de informatievlak-drempel van §11 niet: M1 draagt géén
informatievlak op zijn beeld. Bewijsrij = K7 BEWIJSBAND onder het beeld, niet erop.

**J RESPONSIEF.**

| | 1774 | 1440 | 1199 | 768 | 390 |
|---|---|---|---|---|---|
| masker | 32,8/34,4° | idem | **geen** (`home-hero.css:450`) | geen | geen |
| vorm | polygoon | polygoon | radius 12px (`--m-radius-img`) | idem | idem |
| hoogte | 748 (ratio) | 607 (ratio) | **360 vast** (`home-hero.css:500`) | 360 vast | **232 vast** (`home-hero.css:447`) |
| scrim | 255deg vignet | idem | **196deg** `.06 → .34` (`home-hero.css:455`) | idem | idem |
| merkvlak | SVG-driehoek | idem | `::before` in het beeld, `polygon(100% 0, 100% 100%, 0 100%)` (`home-hero.css:463`) | idem | idem |

**K NIET GEBRUIKEN.** Maximaal 1× per pagina en alleen in de eerste sectie (gemeten paginapositie
0–13,3%). Niet gebruiken als de pagina geen sectie heeft die van rand tot rand mag lopen; niet als
het onderwerp in de weggesneden 44% links valt; niet als er onder het beeld geen eigen band staat
die de naad met de volgende sectie sluit (hier: KPI-band, kleurverschil met S2 één digit per
kanaal).

---

## 4. M2 — PANEEL

> Het beeld is een paneel dat tot één schermrand doorloopt; de scrim draagt de tekst.

**A BRON.** S3 Project, `section#projecten.vh-pr`. Paneel `home-project.css:49-52`
(`aspect-ratio: 1704/565`, `border-radius: 3.5507cqw 0 0 3.5507cqw`); foto `:58-65`
(`object-position: 54% 62%`); scrim `.vh-pr-scrim` `:69-82`; SVG `index.html:478-492`.

**B BEELDVERHOUDING per breedteband:**

| breedte | beeld | ratio | % vw | % sectiehoogte |
|---|---|---|---|---|
| 1774 | 1704×565 | **3,02** | 96,1 | 73,9 |
| 1440 | 1383×459 | 3,02 | 96,1 | 73,9 |
| 1199 | 1199×340 | 3,53 | **100** | 43,6 |
| 768 | 768×340 | 2,26 | **100** | 44,0 |
| 390 | 390×236 | 1,65 | **100** | 28,8 |

**C MAAT.** Desktopband **96–100% vw**. M2 is het enige beeld dat op mobiel relatief *groeit*
(96,1 → 100% vw) omdat het als enige de gutter negeert.

**D UITSNEDE EN FOCUS.** `object-position: 54% 62%` desktop, `56% 60%` mobiel. Focuspuntregel: de
linker **20% van de paneelbreedte (341px @1774) is volledig dekkend** `#001632` — elk onderwerp
daarbinnen is onzichtbaar. Het onderwerp hoort rechts van de 46%-stop (x ≈ 784px).

**E SCHERMRANDEN.** Alleen rechts (gemeten `rand[R]`). Links staat het paneel op de containermarge
van 70px met een **eenzijdige radius van 63px** — de grootste radius van de pagina en de enige
eenzijdige. Op mobiel: links, rechts én boven.

**F GEOMETRIE.** Eén SVG in paneelcoördinaten 2056×682 met `preserveAspectRatio="none"`: een
lichte topvorm, een blauwe wig van **35,9°** en een 2,6px lijn `#BFD9FF` langs die wigrand. De wig
sluit de rechteronderhoek van het paneel en herhaalt de hero-hoek.

**G OVERLAY.** Richtingsscrim, tweetraps: `90deg #001632 0–20% → .74 (32%) → .30 (46%) → .06 (60%)
→ 0 (70%)` plus `180deg rgba(0,18,42,.30) → 0 op 26%` (`home-project.css:74-82`).
**Gemeten contrast onder de tekst:**

| tekst | kleur | mediane achtergrond-L | contrast mediaan | contrast bij p95 | ongunstigste monster |
|---|---|---|---|---|---|
| `.vh-pr-titel` 58,3px | `#FFFFFF` | 0,008 | **18,09:1** | **12,2:1** | 8,22:1 |
| `.vh-pr-statement` 40,1px | wit .94 | 0,008 | 18,09:1 | 13,1:1 | 8,46:1 |
| `.vh-pr-body` 20px | `#93A5BC` | 0,008 | **7,19:1** | 5,6:1 | 4,27:1 |
| `.vh-pr-eyebrow` 16,6px | `#0490FF` | 0,008 | **5,55:1** | 4,6:1 | 3,95:1 |
| `.vh-pr-metric b` 28,4px ×3 | wit | 0,008–0,010 | 17,47–18,09:1 | — | 13,62:1 |

**Scrim uit gemeten:** `.vh-pr-titel` zakt van **18,09:1 naar 3,67:1** (mediaan) en naar 1,01:1 in
het ongunstigste monster. De scrim is hier dragend, factor **4,9**.
Gemeten is ook dat 100% van de meetrechthoek van elke tekstdrager donker is (`pctDonker = 100%`):
de tekst staat volledig in de dichte 20%-zone.

**H TEKST.** Alle twaalf tekstdragers van de sectie liggen **100% op beeldpixels**. Tekstkolom
470px tegenover 1704px beeld = **1 : 3,6** — de smalste inhoudsbreedte van de pagina (26,5% vw).

**I KAARTEN.** Geen zwevende kaart. Eén blauwe knop (235×65 = 15.275px²) ligt 100% op het beeld,
maar haalt de informatievlak-drempel van §11 niet; de drie metrieken staan als K7 BEWIJSBAND ín
het beeld, gescheiden door 1px `rgba(255,255,255,.22)`. M2 draagt zijn informatie dus volledig met
**kaal type op het beeld**, niet met een vlak.

**J RESPONSIEF.** Masker heeft M2 nooit; de radius gaat van `63/0/0/63` naar 12px. De scrim
**kantelt mee met de tekst**: `90deg` (tekst links van het beeld) wordt `180deg`
`rgba(0,22,50,0) → .45 (46%) → #001632 (96%)` zodra de tekst ónder het beeld staat
(`home-project.css:247`). Hoogte 565 (ratio) → **340 vast** (`home-project.css:301`) → **236 vast**
(`home-project.css:241`). Op ≤1199 ligt er niets meer op het beeld (gemeten: "niets op dit beeld").

**K NIET GEBRUIKEN.** Maximaal 1× per pagina, in het middendeel (gemeten paginapositie 26,4–37,6%).
Niet gebruiken als de sectie zijn rechtermarge moet houden — het middel bestaat juist uit het
breken ervan. Niet gebruiken zonder richtingsscrim: zonder scrim meet dezelfde kop 3,67:1.

---

## 5. M3 — DRAAGVLAK

> Beeld van 40–62% breed waar informatievlakken ÓP liggen.

**A BRON.** Twee instanties.
S6 Projectresultaat: `.vh-proof-foto`, `home-proof.css:218-226` (positie, maat,
`clip-path: polygon(17.55% 0, 100% 0, 100% 100%, 0 100%)` op `:224`).
S7 Energie-infrastructuur: `.vh-infra-foto`, `home-infra.css:148-161` (`border-radius: 1.0147cqw`
= 18px op `:154`, clip op `:160`), uitsnede `:162-169`, scrim `:173-183`.

**B BEELDVERHOUDING per breedteband:**

| | 1774 | 1440 | 1199 | 768 | 390 |
|---|---|---|---|---|---|
| S6 proof | 734×557 **1,32** | 596×452 1,32 | 541×300 1,80 | 335×300 1,12 | 348×220 1,58 |
| S7 infra | 1100×736 **1,49** | 893×598 1,49 | 1103×260 **4,24** | 691×260 2,66 | 348×190 1,83 |

**C MAAT.** Desktopband **40–62% vw** (gemeten 41,4 en 62,0). Sectiehoogte-aandeel 62,8% (proof) en
83,0% (infra) — S7 is het **grootste niet-bleedende beeld van de pagina** (51,5% van het
sectievlak). Na masker blijft 92% (proof) respectievelijk 94% (infra) van de rechthoek over.

**D UITSNEDE EN FOCUS.** S6 `object-position: 52% 46%`; S7 **`26% 52%`** met de reden erbij:
zonder die verschuiving verdwijnen de batterijkasten achter de kaartkolom
(`home-infra.css:166-168`).
**Focuspuntregel, gemeten:** ligt er een kaartkolom over ≥ 25% van de beeldbreedte, dan verschuift
het horizontale focuspunt **minstens 24 procentpunten weg van die kant**. Op de hele pagina komt
dat twee keer voor: S7 (kaarten rechts → 26%, dus −24) en S8/M6 (kaart links van het midden →
78%, dus +28). Alle andere beelden blijven binnen 46–68%, met één uitschieter van 6% in een
292px-brede M5-kaart.

**E SCHERMRANDEN.** **Geen**, beide instanties (gemeten `rand[]`). S7 houdt 73px links en 31px
rechts; S6 raakt niets. De enige randaanraking in S6 is de 85×133-wig (32,6°) rechts tegen de
schermrand, een geometrie-element, geen beeld.

**F GEOMETRIE.** De **flauwe** hoekfamilie, en die bestaat alleen hier: **13,0°** (S6) en
**9,7°** (S7) — tegenover 31,6–36,2° in de rest van de pagina. De snede neemt 126,5px van de
fotobreedte weg bij S7. De CSS noemt de reden: zonder die snede is het vlak "een kale rechthoek met
zwevende kaarten" (`home-infra.css:158-159`).

**G OVERLAY.**
S6: **geen scrim op de foto.** De tekst die erop ligt zit in een dekkende donkere strook.
S7: richtingsscrim `linear-gradient(268deg, rgba(3,20,44,.52) 0%, .30 (26%), .06 (46%), 0 (62%))`
(`home-infra.css:177-183`) — donker aan de rechterkant, waar de kaartkolom staat.

**Gemeten scheiding van witte kaarten op het beeld** (achtergrond gemeten met de kaart onzichtbaar;
contrast van het witte kaartvlak tegen die achtergrond):

| kaart | mediane achtergrond-L | met scrim | zonder scrim | winst |
|---|---|---|---|---|
| `.vh-infra-kaart` 1 | 0,019 | **15,15:1** | 13,14:1 | ×1,15 |
| `.vh-infra-kaart` 2 | 0,105 | **6,76:1** | 4,63:1 | ×1,46 |
| `.vh-infra-kaart` 3 | 0,115 | **6,36:1** | 3,93:1 | ×1,62 |
| `.vh-infra-kaart` 4 | 0,116 | **6,32:1** | 3,97:1 | ×1,59 |

Onder de kaarten is 55,8–86,9% van het veld donkerder dan L 0,2; het lichtste 5% haalt L 0,40–0,59
(losse hooglichten in de foto). De scrim brengt de mediaan van het veld op **53–63%** van de
waarde zonder scrim (0,019 vs 0,030 · 0,105 vs 0,177 · 0,115 vs 0,217 · 0,116 vs 0,215).

S6, dekkende vlakken: de strook `#01234C` meet L **0,0172**; het veld eronder meet mediaan
**0,275**. Scheiding strook ↔ veld = **4,84:1** (berekend uit beide gemeten luminanties). Witte
tekst op die strook meet **15,6:1** bij een volstrekt vlakke achtergrond (min = max = 0,017):
dekkend vlak, geen fotoruis.

**H TEKST.** Geen type rechtstreeks op beeldpixels bij M3 — alle tekst zit in een vlak.
Eén randgeval, gemeten: de verhaalkolom van S6 (`.vh-proof-story p`) ligt met zijn rechthoek **62px
over de beeldrechthoek**, maar van die rechthoek is **99,9% sectiegrond (L 0,93)** en **0,1%
fotopixel (L 0,035)**. Zou een glyph in die 0,1% vallen, dan meet hij **1,95:1**. De 13°-snede
houdt de letters er net buiten.
**Regel M3-T.** Een tekstblok mag de beeldrechthoek overlappen zolang ≤ 0,5% van zijn meetvlak
beeldpixels zijn. Die drempel is afgeleid van de enige gemeten overlap op de pagina (0,1%).

**I KAARTEN.** Dit is de kern van M3.
S6 draagt K3 STROOK (629×124, **100% op de foto**, 84px van de linkerrand, 32px boven de onderrand)
en K2 ZWEVEND INFOVLAK (448×374, waarvan **42px = 9,4% van zijn oppervlak** op de foto ligt).
S7 draagt K4 REGISTERKAART ×4 (elk 422×126, **alle vier 100% op de foto**, rechterrand 26px binnen
de fotorand, steek 141,3px, dus 15,3px lucht). Dit is de **enige gelijke kaartrij van de pagina**.

**J RESPONSIEF.**

| | 1774/1440 | 1199 | 768 | 390 |
|---|---|---|---|---|
| masker S6/S7 | 13,0° / 9,7° | **geen** (`home-infra.css:345`, `home-proof.css:434`) | geen | geen |
| vorm | polygoon (+18px radius S7) | radius 12px | radius 12px | radius 12px |
| hoogte S6 | ratio | **300 vast** (`home-proof.css:482`) | 300 vast | **220 vast** (`home-proof.css:433`) |
| hoogte S7 | ratio | **260 vast** (`home-infra.css:443`) | 260 vast | **190 vast** (`home-infra.css:378`) |
| kaarten op het beeld | 4 (S7) + 2 (S6) | **0** | 0 | 1 (S6, 28px over de onderrand) |
| scrim S7 | 268deg | 268deg, ongewijzigd | idem | idem |

Gemeten bijzonderheid: op tablet wordt S6 een twee­koloms raster (`home-proof.css:475-483`),
waardoor het beeld daar smaller is (335px) dan op 390px (348px). De beeldhoogte in dat blok wordt
twee keer gedeclareerd (`:470` 320px en `:482` 300px); de laatste wint. Hetzelfde patroon in
`home-infra.css:429` (330px) en `:443` (260px). Zie DR-V-24.

**K NIET GEBRUIKEN.** Maximaal 2× per pagina. **Nooit zonder minstens één vlak erop** — dat ís de
behandeling; een M3 zonder vlak is een gewone rechthoek naast tekst. Niet gebruiken als het
onderwerp aan dezelfde kant staat als de kaartkolom (gemeten correctie: `object-position` 26%).
Niet gebruiken onder 40% vw — de gemeten ondergrens is 41,4%. Ter oriëntatie: bij 1100px beeld
beslaat de kaartkolom van 422px 38% van de beeldbreedte; onder 40% vw blijft daar te weinig beeld
naast over om het beeld nog drager te laten zijn.

---

## 6. M4 — BAND

> Brede liggende strook op een diagonale ondergrond; de kaart kruist de beeldrand.

**A BRON.** S4 Van plan naar prestatie, `.vh-proc-beeld`, `home-process.css:91-98`
(`width: 53.912cqw`, `height: 16.545cqw`, `border-radius: .7893cqw` = 14px);
backdrop `home-process.css:40-44` (clip 33,7°); kaart `home-process.css:118-122`.

**B BEELDVERHOUDING per breedteband:**

| breedte | beeld | ratio | % vw | % sectiehoogte |
|---|---|---|---|---|
| 1774 | 956×294 | **3,26** | 53,9 | 47,0 |
| 1440 | 776×238 | 3,26 | 53,9 | 47,0 |
| 1199 | 1103×320 | 3,45 | 92,0 | 29,9 |
| 768 | 691×320 | 2,16 | 90,0 | 29,8 |
| 390 | 348×184 | 1,89 | 89,2 | 17,1 |

**C MAAT.** Eén meetpunt: 53,9% vw. De band **50–56% vw** is om die meting heen gelegd met ±2
punten en is dus *niet* onafhankelijk gemeten. Ratio-eis: **3,2–3,3** (gemeten 3,26). Daarmee is M4
na M1 en M2 de breedste liggende verhouding van de pagina.

**D UITSNEDE EN FOCUS.** `object-position: 50% 52%` op alle breedtes. Geen verschuiving nodig: de
kaart dekt 56px van 956px = 5,9% van de beeldbreedte af, ver onder de 25%-drempel uit §5-D.

**E SCHERMRANDEN.** Geen. Gemeten 66px van de rechterschermrand. De **kaart** komt wel tot 10px van
de schermrand — het beeld zelf nooit.

**F GEOMETRIE.** De diagonaal zit **niet in het beeld maar in de ondergrond**:
`.vh-proc-backdrop`, `clip-path: polygon(42.30% 0, 100% 0, 100% 100%, 28.92% 100%)` = **33,7°**
(`home-process.css:43`), die 49px boven en 13px onder het beeld uitsteekt en rechts de schermrand
uit loopt. Zonder die backdrop is M4 een afgeronde rechthoek.

**G OVERLAY.** **Geen scrim.** M4 is het enige beeld ≥ 50% vw van de pagina zonder enige
verdonkering (gemeten: `home-beeld.txt`, geen `scrim`-regel bij `img<div.vh-proc-beeld`).
Gevolg, gemeten: het veld onder de witte kaart heeft mediaan **L 0,419**, met 33,3% van de pixels
lichter dan 0,6 en 18,7% donkerder dan 0,2. Het witte kaartvlak scheidt zich daardoor met slechts
**2,24:1** van het veld — de zwakste vlak/veldscheiding van de pagina. Wat de kaart leesbaar houdt
is niet contrast maar de dubbele schaduw `rgba(12,38,72,.06) 0 3,19 7,98` +
`rgba(12,38,72,.22) 0 26,6 56,8 −19,5` (`home-process.css:122`).
**Regel M4-O.** Een vlak dat zonder scrim op een beeld ligt, moet een tweetraps schaduw met een
negatieve spreiding dragen; de scheiding mag dan tot **2,2:1** zakken (gemeten ondergrens van de
pagina). Mét scrim is de gemeten ondergrens **5,1:1** (M6-final) — zie DR-V-20.

**H TEKST.** Geen tekst op het beeld buiten de kaart. De kopkolom staat **222px links van het
beeld**; de lead eindigt 2px vóór de linkerrand van de backdrop-diagonaal op dat niveau.
Beeld : tekstkolom = 956 : 460 = **2,08 : 1**.

**I KAARTEN.** K2 ZWEVEND INFOVLAK ×1, 338×254, radius 11,7px. Gemeten overlapgedrag:
**80,8% van de kaart ligt op de beeldrechthoek en 100% van dat snijvlak op werkelijke beeldpixels**;
de kaart steekt **56px voorbij de rechterrand en 8px onder de onderrand** van het beeld.
Daarnaast K8 ICOONREGEL ×4 onder het beeld, zonder vlak, op een steek van exact 430,7px.

**J RESPONSIEF.** De kruising overleeft de kanteling: op ≤1199 staat de kaart met
`margin: -26px var(--m-gutter) 0` (`home-process.css:235`) en kruist daarmee de **onderrand** van
het beeld in plaats van de zijrand. Gemeten overlap: **26px** op 1199, 768 én 390 — een vaste
pixelmaat, geen percentage. Backdrop verdwijnt (`home-process.css:217`), hoogte wordt 320px
(`:293`) respectievelijk 184px (`:226`).

**K NIET GEBRUIKEN.** Maximaal 1× per pagina. Niet gebruiken zonder diagonale ondergrond — zonder
`.vh-proc-backdrop` voldoet M4 nog maar aan één van de vijf middelen (§11) en valt hij terug op
"afgeronde rechthoek naast tekst". Niet gebruiken als er geen kaart is die de beeldrand kruist.
Niet gebruiken bij een ratio onder 3,0: bij 956×294 is er 294px hoogte voor een kaart van 254px,
en dat is precies wat de kruising zichtbaar maakt.

---

## 7. M5 — KAARTBEELD

> Het beeld zit binnen een donkere kaart, tot de kaartranden; de kaarten zijn ongelijk van breedte.

**A BRON.** S2 Oplossingen, `a.vh-sol-mod` ×6 (5 met foto, 1 met het 25°-grafiekvlak).
Kaart `home-solutions.css:149-152` (radius `var(--sol-radius)` = 10px, schaduw
`rgba(23,84,150,.10) 0 9,93 25,90`); beeld `:155-163` (`inset: 0`, `object-fit: cover`);
scrim `:164-198`; inhoud `:200-206`; pijlknop `:226-249`.

**B BEELDVERHOUDING per breedteband** (vijf beelden):

| breedte | ratio's | % vw |
|---|---|---|
| 1774 | **0,98 · 0,61 · 0,59 · 1,53 · 1,54** | 27,5 · 17,0 · 16,5 · 19,9 · 20,0 |
| 1440 | identiek (0,98 · 0,61 · 0,59 · 1,53 · 1,54) | identiek |
| 1199 | 1,08 · 1,08 · 1,08 · 1,87 · 1,87 | 29,7 (alle vijf) |
| 768 | 3,29 · 1,61 · 1,61 · 1,05 · 1,05 | 90,0 · 44,0 · 44,0 · 28,6 · 28,6 |
| 390 | 1,22 · 1,13 · 1,13 · 1,13 · 2,81 | 89,2 · 43,3 · 43,3 · 43,3 · 89,2 |

Twee desktopgroepen: **staand 0,59–0,98** (bovenrij) en **liggend 1,53–1,54** (onderrij).
De rijhoogtes verhouden zich als 498 : 230 = **2,17**.

**C MAAT.** Band **16,5–27,5% vw**. Onderlinge verhouding in de bovenrij 487 : 302 : 292 =
**1,61 : 1,00 : 0,97**. Het harnas oordeelt: "gelijke rijen: geen".

**D UITSNEDE EN FOCUS.** Vijf verschillende uitsnedes: `56% 46%` · `68% 52%` · **`6% 34%`** ·
`50% 50%` · `50% 50%`. M5 is de enige behandeling met een vrij focuspunt (gemeten spreiding 6–68%
horizontaal, 34–52% verticaal), omdat er geen vlak over het beeld ligt dat een zone afdekt.

**E SCHERMRANDEN.** Geen, op geen enkele breedte. Het beeld loopt wél tot alle vier de
**kaartranden**: er is geen witte kaart met een foto erin, de kaart *is* de foto.

**F GEOMETRIE.** Geen geometrie op de foto's. Het enige geometrie-element van de sectie,
`span.vh-sol-grafisch::before` met **25°** (`home-solutions.css:306-320`), staat juist daar waar
een foto ontbreekt. Dat is uitdrukkelijk een noodgreep (`:303-305`), geen onderdeel van M5.

**G OVERLAY.** Richtingsscrim, per rij anders, en de richting volgt de tekst:

| rij | gradient | donkerste kant | tekst staat |
|---|---|---|---|
| boven | `180deg .92 → .90 (38%) → .56 (50%) → .12 (62%) → 0 (72%)` + `158deg` | boven | boven |
| onder | `180deg .62 → .80 (26%) → .90 (46%) → .90 (100%)` + `96deg` | onder | onder |

**Gemeten contrast onder de tekst** (zes kaarten, witte pijlknop uitgesloten uit het meetvlak):

| tekst | mediaan | laagste van de zes | ongunstigste monster |
|---|---|---|---|
| `h3` (26,6px grote kaart, 18,4px overige) | 15,45 – 18,09:1 | **15,45:1** | 14,10:1 |
| body `p` wit .90 | 15,42 – 18,42:1 | **15,42:1** | 14,66:1 |

In alle zes de meetvlakken is **100% van de achtergrond donkerder dan L 0,2** — de scrim dekt het
hele tekstgebied, niet alleen de letters.
**Scrim uit gemeten:** de kop van de grote kaart zakt van **17,02:1 naar 3,97:1** (factor 4,3).
De CSS documenteert bovendien een eerdere meting van **1,00:1** met een diagonaal verloop
(`home-solutions.css:171-175`); die oude toestand heb ik niet gereconstrueerd — **NIET GEMETEN**.

**H TEKST.** Alle kaarttekst ligt **100% op beeldpixels** zonder tussenliggend vlak. Dat is het
onderscheid met een witte kaart met foto: er is geen tweede oppervlak. Kopkolom van de sectie
(506px) en modulenraster (1133px) raken elkaar op x576 zonder tussenruimte;
beeld : tekst = **2,24 : 1**.

**I KAARTEN.** De kaart *is* het beeld (K1 MEDIAKAART). Enig extra vlak op het beeld: de ronde
witte pijlknop (38/46/39px) en, alleen op de grote kaart, een statistiekbalk met een eigen
verloop (`home-solutions.css:253-269`).

**J RESPONSIEF.** Maskers heeft M5 nooit; de vorm komt van de kaartradius (10px desktop →
`--m-radius: 14px` mobiel, `home-solutions.css:388`). Hoogtes worden `min-height`:
286/150/124px @390 (`:388-391`), 300/210/210px @768–1199 (`:467-469`), 330/330/190px in het
1024–1199-blok (`:496-499`). De scrimstops rekken mee met de kortere kaart: de dichte zone loopt op
mobiel door tot **86%** (bovenrij) respectievelijk **92%** (variant) in plaats van 72%.

**K NIET GEBRUIKEN.** Maximaal 1 sectie per pagina. **Nooit met gelijke tegels** — de gemeten
signatuur is 1,61 : 1,00 : 0,97 met twee rijen die hun kolomnaden 116px en 65px verspringen.
Nooit zonder richtingsscrim: zonder scrim meet dezelfde witte tekst 3,97:1. Niet gebruiken als er
tekst buiten de kaart op het beeld moet (dan is het M3 of M2).

---

## 8. M6 — HOEKBEELD

> Beeld vast aan één schermrand, gesneden op de merkhoek; een kaart over de binnenrand.

**A BRON.** Twee instanties.
S8 Final CTA: `.vh-final-foto`, `home-final.css:57-71` (clip 35,4/32,7°), scrim `:73-78`,
uitsnede `:85-88`, merkvlak `.vh-final-blauw` `:93-104`, kaart `:261-286`.
S9 Footer: `.vh-footer-wig`, `home-footer.css:42-58` (clip 31,6/28,1°), uitsnede `:59-65`,
gedeeltelijke scrim `:69-75`, notitie `:77-88` + `index.html:1024`.

**B BEELDVERHOUDING per breedteband:**

| | 1774 | 1440 | 1199 | 768 | 390 |
|---|---|---|---|---|---|
| S8 final | 935×631 **1,48** | 759×512 1,48 | 1103×340 3,24 | 691×340 2,03 | 348×204 1,71 |
| S9 footer | 350×526 **0,67** | 284×427 0,67 | **weg** | weg | weg |

S9 is het enige staande beeld **buiten een kaart**. (`forensics-homepage.md` noemt het "het enige
staande beeld van de pagina"; gemeten zijn ook de M5-kaarten staand: 0,61 en 0,59. Het onderscheid
is dus "staand én vrijstaand", niet "staand".)

**C MAAT.** Twee rollen binnen één behandeling: **groot 52,7% vw** (S8) en **klein 19,7% vw** (S9),
een verschil van factor **2,67**. S8 vult **100% van de sectiehoogte** — het enige beeld van de
pagina dat dat doet; S9 vult 83,3%. Na masker blijft 88% (S8) en 78% (S9) van de rechthoek over.

**D UITSNEDE EN FOCUS.** S8 `object-position: **78% 56%**`, met de reden erbij: anders komen de
carportrijen niet in beeld (`home-final.css:85-88`). Dat is +28 punten van het midden, weg van de
kaart — de tweede gemeten toepassing van de focuspuntregel uit §5-D. S9 `46% 54%`.

**E SCHERMRANDEN.** S8 rechts, boven én onder (`rand[RTB]`). S9 rechts en boven (`rand[RT]`), niet
onder. Beide zijn rechtsgebonden; de chevronpunt wijst naar binnen. Het merkvlak
`.vh-final-blauw` raakt de rechter- en onderrand met overschrijding exact 0 en 0.

**F GEOMETRIE.** De scherpe hoekfamilie, drie lagen bij S8: de chevron over de **volle
sectiebreedte** (1774×631, hoeken 32,7 / 35,4 / 35,4 / 32,6°), de chevronsnede van de foto zelf
(35,4 / 32,7°) met zijn binnenrand exact op de buitenrand van de wig, en het blauwe merkvlak
(36,2°). S9 herhaalt dezelfde vorm op een vijfde van de schaal (31,6 / 28,1°).
De scheidslijn tussen tekst en beeld is daardoor **een punt** (x839, y 55,75%), geen lijn.

**G OVERLAY.**
S8 vignetscrim `linear-gradient(200deg, rgba(8,32,60,.62) 0%, .38 (44%), .58 (100%))`
(`home-final.css:77`).
S9 **gedeeltelijke** richtingsscrim `180deg rgba(10,38,74,.46) → .16 (58%) → 0`, met
`inset: 0 0 42% 0` (`home-footer.css:69-75`) — de enige scrim van de pagina die maar een deel van
zijn beeldvlak dekt (gemeten inset-bodem 220,7px van 526px).

**Gemeten:**

| wat | mediane achtergrond-L | met scrim | zonder scrim |
|---|---|---|---|
| `.vh-final-kaart` (wit vlak op de foto) | 0,154 | **5,14:1** | 2,10:1 (×2,4) |
| `.vh-footer-note` (witte tekst op de foto) | 0,475 | **2,00:1** | 1,16:1 |

De footernotitie is daarmee **het enige type op de pagina dat onder elke redelijke
leesbaarheidsgrens blijft**: 2,00:1 bij de mediaan, **1,43:1** bij de lichtste 5% van zijn
achtergrond. Twee metingen horen erbij:
1. Met de dubbele tekstschaduw meegerekend (gemeten door de glyph transparant te maken en de
   schaduw te laten staan) wordt de mediaan **2,19:1** en het ongunstigste monster **1,03:1**.
   De schaduw verlaagt de mediane achtergrond van 0,475 naar 0,430 en maakt 9,9% van het meetvlak
   donkerder dan 0,2 (zonder schaduw 0,5%).
2. De notitie is `aria-hidden="true"` (`index.html:1024`) — zij draagt geen informatie.

**Regel M6-O.** Type rechtstreeks op beeldpixels mag onder de ondergrens van DR-V-20 blijven **alleen**
als het `aria-hidden` is en nergens anders voorkomt. Gemeten frequentie op de hele pagina: 1×.

**H TEKST.** S8: de kop staat links van de chevronpunt met **76px lucht** (langste kopregel eindigt
op x763, punt op x839). Geen type op het beeld; alles zit in de kaart.
S9: één handgeschreven regel op het beeld, verder tekstkolommen links ervan.
Beeld : tekst = 935 : 674 = **1,39 : 1** (S8) en 350 : 1610 = **0,22 : 1** (S9) — S9 is de enige
omgekeerde verhouding van de pagina.

**I KAARTEN.** S8: K2 ZWEVEND INFOVLAK ×1, 305×272, **100% op het beeld**, 215px voorbij de
chevronpunt, met als enige kaart van de pagina een vol blauw rond icoon van 68 ref-px.
S9: geen kaartfamilie; alleen de notitie ligt op het beeld (2 overlapparen, het laagste van de
pagina).

**J RESPONSIEF.**

| | 1774/1440 | 1199 | 768 | 390 |
|---|---|---|---|---|
| S8 masker | chevron 35,4/32,7° | **geen**, radius 12px (`home-final.css:376`) | idem | idem |
| S8 hoogte | 631 (= 100% sectie) | **340 vast** (`:423`) | 340 vast | **204 vast** (`:374`) |
| S8 merkvlak | los vlak 294×401 | `::before` ín het beeld, 44%×58%, `polygon(100% 0, 100% 100%, 0 100%)` (`:389-394`); `.vh-final-blauw` wordt `display:none` (`:388`) | idem | idem |
| S8 kaart | 100% op het beeld | kruist de **onderrand** met **34px** (`margin: -34px`, `:403`) | 34px | 34px |
| S8 wig + notitie | aanwezig | `display: none` (`:331`) | idem | idem |
| S9 beeld | 350×526 | **`display: none`** (`home-footer.css:372`) | idem | idem |
| S9 notitie | aanwezig | `display: none` (`home-footer.css:384`) | idem | idem |

S9 is de enige behandeling die op mobiel **helemaal verdwijnt**, met de reden in de code:
de beeldband "toont dezelfde batterijkasten als sectie 2 en 7 en draagt op mobiel geen informatie;
hij rekte de footer met ruim 160 px" (`home-footer.css:370-371`). De mobiele uitvoering staat
geparkeerd onder een naam die niets raakt (`.vh-footer-wig-ongebruikt`, `home-footer.css:373-377`,
`height: 132px`; plus `:401` `height: 180px` voor tablet) en is op geen enkele gemeten breedte
zichtbaar.

**K NIET GEBRUIKEN.** Maximaal 2× per pagina en alleen in de slotzone (gemeten paginapositie
81,5–100%). Niet aan de linkerschermrand — beide gemeten instanties zijn rechtsgebonden en de
chevronpunt wijst naar binnen. Niet gebruiken als het beeld niet minstens één schermrand mag raken.
Niet twee keer op dezelfde maat: de twee gemeten instanties verschillen factor 2,67 in breedte.

---

## 9. FREQUENTIEREGEL

**Gemeten frequentie op de Homepage Master** (negen secties, dertien beelden):

| behandeling | aantal secties | aantal beelden | paginapositie (y als % van 6810px) |
|---|---|---|---|
| M0 GEEN FOTO | 1 | 0 | 46,8 – 55,4% |
| M1 PODIUM | 1 | 1 | **0 – 13,3%** |
| M2 PANEEL | 1 | 1 | 26,4 – 37,6% |
| M3 DRAAGVLAK | **2** | 3 (incl. duimnagel 5,5% vw) | 55,4 – 68,5% en 68,5 – 81,5% |
| M4 BAND | 1 | 1 | 37,6 – 46,8% |
| M5 KAARTBEELD | 1 | **5** | 13,3 – 26,4% |
| M6 HOEKBEELD | **2** | 2 | **81,5 – 90,7% en 90,7 – 100%** |

**F-1 Bovengrens.** Geen behandeling meer dan **2×** per pagina. M1, M2, M4 en M0 maximaal **1×**;
M5 maximaal **1 sectie** (met 2 tot 6 beelden erin); M3 en M6 maximaal **2×**.

**F-2 Herhaling verandert van schaal.** Komt een behandeling twee keer voor, dan verschillen de
beeldbreedtes minstens **factor 1,5**. Gemeten: M3 62,0 ÷ 41,4 = **1,50**; M6 52,7 ÷ 19,7 =
**2,67**. Er is op de hele pagina geen enkel paar beelden van dezelfde behandeling op vergelijkbare
maat.

**F-3 Herhaling staat naast elkaar.** De enige twee herhalingen staan in opeenvolgende secties
(S6+S7 en S8+S9). Een behandeling die twee keer voorkomt met andere behandelingen ertussen is op de
Homepage Master niet gemeten en valt buiten het systeem.

**F-4 Plaatsgebonden behandelingen.** M1 alleen in de eerste sectie (gemeten 0–13,3% van de
paginahoogte). M6 alleen in de laatste 20% (gemeten 81,5–100%). M2 in het middendeel
(gemeten 26,4–37,6%).

**F-5 Volbeelden.** Maximaal **2 beelden ≥ 90% vw** per pagina, en nooit in opeenvolgende secties.
Gemeten: 100% (S1) en 96,1% (S3), met S2 ertussen.

**F-6 Minstens één sectie zonder foto.** Gemeten: 1 van 9 (M0). Bovengrens 1, ondergrens 0 —
dit is een maximum, geen verplichting (zie §10 voor wat wél verplicht is).

**F-7 Afwisselingstoets.** Geen twee opeenvolgende beeldsecties met dezelfde **combinatie** van
{behandeling, %vw ±6 punten, ratio ±0,10}. Gemeten homepage: de grootste groep die aan die
criteria voldoet telt **2** beelden (de twee onderste M5-kaarten: 1,53/19,9% en 1,54/20,0%).
Gemeten B2-kandidaat: een groep van **3** (ratio 1,33 · 1,29 · 1,33 op 44,2 · 40,9 · 38,2% vw,
alle drie met hetzelfde 34°-`::after`). De regel trekt de grens dus precies tussen beide pagina's.

---

## 10. VERPLICHTE MINIMA PER PAGINA

Geldt voor **≥ 1200px**; §12 geeft de mobiele variant. Alle drempels zijn afgeleid van gemeten
waarden van de Homepage Master, met de B2-kandidaat als ondergrens-ijkpunt.

| # | minimum | drempel | homepage | B2 | hoe afgeleid |
|---|---|---|---|---|---|
| **V-1** | beelddekking van de pagina | **≥ 35%** van het paginavlak (som van de beeldrechthoeken) | 43,7% | 19,2% | homepage 43,7%, B2 19,2%; drempel ligt op 80% van de homepagewaarde |
| **V-2** | één groot beeld | **≥ 1 beeld ≥ X = 90% vw** | 2 (100 en 96,1%) | 1 | kleinste van de twee gemeten volbeelden is 96,1%; drempel afgerond omlaag op 90 |
| **V-3** | grote beelden over de pagina verdeeld | **≥ 50% van de beeldsecties** heeft een beeld ≥ 50% vw | 62,5% (5 van 8) | 20% (1 van 5) | homepage 62,5%; drempel op de helft, zodat één kleine beeldsectie is toegestaan |
| **V-4** | gesneden beelden | **≥ 2 beelden met een polygoonmasker** | 5 van 13 | 0 van 7 | homepage 5; drempel op 2 zodat een kortere pagina kan voldoen |
| **V-5** | informatievlakken op beeld | **≥ N = 2 secties** met een vlak van **≥ 30.000px² (bij 1774px)** waarvan **≥ 50% van zijn eigen oppervlak** op werkelijke beeldpixels ligt | **4** (S4 · S6 · S7 · S8), samen 7 vlakken van 53.172–85.852px², elk 81–100% van zichzelf op het beeld | **0** (grootste kandidaat 24.600px²; de drie grotere raken het beeld met 3,2–22,3% van zichzelf) | homepage 4; N op de helft (2) zodat een pagina met minder secties kan voldoen |
| **V-6** | kaal type op beeld | **≥ 1 sectie** met type waartussen en het beeldvlak géén enkel vlak zit | **4** (S1 · S2 · S3 · S9) | **1** (06 Projectbewijs) | homepage 4; drempel op 1 |
| **V-7** | schaalverschil | hoogste ÷ laagste beeldbreedte **≥ 3,0** | 100 ÷ 5,5 = 18,2; zonder de duimnagel 100 ÷ 16,5 = **6,06** | 100 ÷ 7,2 = 13,9; zonder duimnagels 44,2 ÷ 38,2 = **1,16** | B2 haalt 1,16 zodra je zijn twee duimnagels wegstreept; homepage 6,06 |
| **V-8** | elke beeldsectie doet mee | **100% van de beeldsecties** haalt V-5 of V-6 | **8 van 8** (4 + 4, elkaar niet overlappend) | **1 van 5** | gemeten homepagewaarde is 100%; dit is de enige drempel die gelijk is aan de meting |

Toelichting bij **V-5**: er zitten drie filters in, en alle drie zijn nodig.
(1) *Op beeldpixels*, niet *binnen de beeldrechthoek*: bij S1 ligt de header-CTA binnen de
rechthoek **én** binnen het masker, terwijl de twee heroknoppen binnen de rechthoek maar **buiten**
het masker vallen; de punt-in-polygoontoets (400 monsters per snijvlak) houdt die gevallen uit
elkaar. (2) *≥ 50% van het vlak zelf*, niet van het snijvlak: dat filtert de brede stroken weg die
alleen een hoek van een beeld raken (B2: 3,2% · 5,8% · 22,3%). (3) *≥ 30.000px²*: dat filtert
chips, tags en bijschriften weg (B2: 6.592 · 15.168 · 24.600px²).

Toelichting bij **V-7**: dit minimum vangt het geval waarin alle beelden dezelfde maat hebben —
precies wat de B2-kandidaat doet met 44,2 / 40,9 / 40,9 / 38,2% vw.

**Toetsvolgorde.** Een pagina voldoet pas als V-1 t/m V-8 **allemaal** waar zijn. Eén enkele
V-regel haalt een generieke pagina niet onderuit (B2 haalt V-2 en V-6), de combinatie wel: B2 faalt
op V-1, V-3, V-4, V-5, V-7 en V-8.

---

## 11. DE UITSLUITINGSREGEL — de tweemiddelenregel

**Het probleem.** Alle regels hierboven zijn te bevredigen met een pagina vol afgeronde
rechthoeken naast tekst, zolang er één groot beeld bovenin staat. En "er ligt iets op het beeld"
is als criterium te zwak: gemeten hebben **5 van de 5** B2-beeldsecties iets op het beeld liggen —
een chip van 316×48, een tag van 206×32, een bijschrift van 246×100, en twee brede stroken die het
beeld maar met 3,2 en 22,3% van hun eigen oppervlak raken. De regel moet dus niet vragen *of* er
iets op ligt, maar *hoeveel* en *hoe*.

**De regel.**

> **U-1.** Elk beeld dat **≥ 10% van de viewportbreedte** meet, draagt **minstens twee** van deze
> vijf middelen:
>
> 1. **masker** — een `clip-path: polygon` op het beeldvlak met minstens één schuine rand;
> 2. **scrim** — een verloop over het beeld met **≥ 3 kleurstops**;
> 3. **dragende geometrie** — een vlak dat het beeld snijdt of draagt en er aan minstens één kant
>    **buiten doorloopt**;
> 4. **informatievlak** — een vlak met een eigen oppervlak van **≥ 30.000px² bij 1774px breed**
>    (schaalt mee: ≥ 0,95% van viewportbreedte²) waarvan **≥ 50% van zijn eigen oppervlak** op
>    werkelijke beeldpixels ligt. Een chip, tag of bijschrift telt dus niet mee, en een brede
>    strook die alleen een hoek van het beeld raakt ook niet;
> 5. **kaal type op beeld** — tekst waartussen en het beeldvlak **géén enkel vlak** zit (geen
>    voorouder met een eigen achtergrond, schaduw of rand), met ≥ 70% van zijn rechthoek binnen
>    het beeld en ≥ 50% daarvan op werkelijke beeldpixels.
>
> **U-2.** Beelden onder 10% vw zijn vrijgesteld. Afgeleid van de enige middelloze uitzondering op
> de pagina: de duimnagel van 98×91 in de strook van S6, **5,5% vw**.
>
> **U-3.** Per pagina draagt minstens één beeld **drie of meer** middelen. Gemeten homepage: vier
> beelden halen 3 of 4.

**Gemeten score per beeld, Homepage Master @1774:**

| beeld | % vw | 1 masker | 2 scrim | 3 geometrie | 4 informatievlak | 5 kaal type | **score** |
|---|---|---|---|---|---|---|---|
| M1 hero | 100 | 32,8/34,4° | 255deg, 3 stops | band + 2 SVG + wig, lopen buiten het masker door | — (header-CTA is 14.301px²) | navyblok, 5 dragers | **4** |
| M5 kaart 1 | 27,5 | — | 180deg, 5 stops | — | — | kop + body 100% | **2** |
| M5 kaart 2–5 | 16,5–20,0 | — | 180deg, 4–5 stops | — | — | kop + body 100% | **2** |
| M2 paneel | 96,1 | — | 90deg, 6 stops | — (de SVG blijft binnen het paneel) | — (knop is 15.275px²) | 12 dragers 100% | **2** |
| M4 band | 53,9 | — | **geen** | backdrop 33,7°, loopt 49px boven en 13px onder het beeld uit | kaart 338×254, 81% van zichzelf | — | **2** |
| M3 proof | 41,4 | 13,0° | geen | — (de 85×133-wig van 32,6° raakt het beeld niet) | strook 629×124, 100% van zichzelf | — | **2** |
| M3 infra | 62,0 | 9,7° | 268deg, 4 stops | — | 4 × 422×126, 100% van zichzelf | — | **3** |
| M6 final | 52,7 | 35,4/32,7° | 200deg, 3 stops | chevronwig 1774×631 + merkvlak | kaart 305×272, 100% van zichzelf | — | **4** |
| M6 footer | 19,7 | 31,6/28,1° | 180deg, 3 stops (58%) | — | — | notitie 100% | **3** |
| duimnagel S6 | 5,5 | — | — | — | — | — | **0** (vrijgesteld) |

Laagste score boven 10% vw: **2**, gehaald door **8 van de 13 beelden** (de vijf M5-kaarten, M2,
M4 en M3-proof). De regel legt de lat dus exact op de eigen ondergrens van de Homepage Master —
niet hoger, niet lager.

**Gemeten score B2-kandidaat @1774:**

| beeld | % vw | wat er gemeten is | score |
|---|---|---|---|
| hero-media | 44,2 | geen masker; `::after` is een blauwe merkwig met **2** stops (minder dan 3); 34°-hoek blijft binnen het blok; `st-snapshot` 1280×141 raakt het beeld met 22,3% van zichzelf; geen kaal type (de tekst zit ín `st-snapshot`) | **0** |
| systeemfiguur | 40,9 | idem; `st-systeem-chip` 316×48 = 15.168px² | **0** |
| **projectbewijs** | **100** | geen masker, maar wél een scrim van 92deg met **4** stops én kaal type (36px wit + 17px) direct op beeldpixels | **2 — voldoet** |
| techniekfiguur | 40,9 | `st-techniek-bij` 246×100 = 24.600px² (onder 30.000) | **0** |
| slot-media | 38,2 | `st-slot-proof` 878×88 raakt het beeld met 3,2% van zichzelf | **0** |
| 2 duimnagels | 7,2 | geen | vrijgesteld |

**Vier van de vijf B2-beelden scoren 0; het vijfde haalt de regel.** Dat vijfde beeld is ook het
enige dat in de aangeleverde telling al opviel (11 overlapparen in die sectie, 100% vw). De
uitsluitingsregel wijst dus niet een hele pagina af, maar precies de vier beelden die een
afgeronde rechthoek naast tekst zijn — en laat het ene beeld staan dat dat niet is.

**Waarom twee en niet één.** Met één middel is "afgeronde rechthoek met een hoekje" genoeg — dat
is precies de B2-situatie. Met twee moet een implementator altijd een tweede beslissing nemen die
het beeld aan de compositie bindt: hij moet het snijden, verdonkeren, dragen, bedekken of bedrukken.
Dat is niet met een component-prop te halen.

**Waarom de drempels in middel 4 nodig zijn.** Zonder de oppervlakte-eis van 30.000px² en de eis
dat het vlak voor ≥ 50% van *zijn eigen* oppervlak op het beeld ligt, haalt elk B2-beeld middel 4
met een chip of een bijschrift. Gemeten ligt de scheiding scherp: de **kleinste** homepagekaart op
een beeld is 53.172px² (81–100% van zichzelf op het beeld), het **grootste** B2-vlak dat de eis
van 50% haalt is 24.600px². Tussen 24.600 en 53.172 is 30.000 een veilige grens.

**U-4 Negatieve toets (de "losse-rechthoek-toets").** Een beeld faalt sowieso als **alle drie**
deze dingen waar zijn: (a) rechthoekig met een uniforme radius en zonder polygoonmasker,
(b) geen enkel vlak en geen type eroverheen, (c) alle tekst van de sectie staat volledig buiten de
beeldrechthoek.
Gemeten Homepage Master: **0 van 13 beelden** voldoet aan (a)+(b)+(c) — elk beeld ≥ 10% vw heeft
iets op zich liggen of is gesneden.
Gemeten B2-kandidaat: **4 van 5 grote beelden** voldoet eraan (44,2 · 40,9 · 40,9 · 38,2% vw);
het paneelbeeld van 100% vw valt af op (b), want daar staat wél kaal type op het beeld.

**Wat géén onderscheid maakt: randcontact.** Gemeten op de B2-kandidaat raken **5 van de 5** grote
beelden een schermrand (`randL` of `randR` true: hero R, systeem L, projectbewijs L+R, techniek R,
slot R). Een beeld dat naar de rand doorloopt is dus geen bewijs van compositie. Het onderscheid
zit niet in *of het beeld de rand raakt*, en ook niet in *of er iets op ligt* (6 tegen 5), maar in
**hoe groot dat iets is**: informatievlakken van ≥ 30.000px² die voor ≥ 50% van zichzelf op het
beeld liggen — 7 tegen 0. Daarom staat randcontact niet in de vijf middelen van U-1.

---

## 12. MOBIELE VARIANT VAN DE REGELS (≤ 1199px)

Op mobiel is het systeem aantoonbaar een ander systeem — dat is gemeten, geen interpretatie:

| gemeten @1774 | @1199 | @768 | @390 |
|---|---|---|---|
| 13 beelden in 8 secties | 12 in 7 | 12 in 7 | 12 in 7 |
| 5 gemaskerde beelden | **0** | **0** | **0** |
| beelddekking 43,7% | 23,9% | 22,8% | 17,2% |
| 6 secties met een vlak op beeldpixels | 2 | 2 | 3 |
| beeldbreedte: 5 verschillende maten | vrijwel alles `100vw − 2 × gutter` | idem | idem |

**M-1 Breedte.** Elk beeld is `viewport − 2 × gutter` breed: gemeten **92,0%** @1199,
**90,0%** @768, **89,2%** @390 (`--m-gutter: clamp(20px, 5.4vw, 24px)`, mobiel
`clamp(32px, 5vw, 48px)` op tablet, `home-mobile.css:16` en `:36`). Enige uitzondering: **M2 blijft
100% vw** en houdt zijn randcontact links, rechts en boven.

**M-2 Hoogte is vast, ratio volgt.** Gemeten vaste hoogtes: @390 **184 · 190 · 204 · 220 · 232 ·
236px**; @768–1199 **260 · 300 · 320 · 340 · 340 · 360px**. De ratio is daarmee een gevolg, geen
keuze; hij loopt op 390px van 1,50 tot 2,81.

**M-3 Masker wordt radius.** Alle vijf de maskers verdwijnen onder 1200px en worden
`--m-radius-img: 12px` (`home-mobile.css:29`). Er is op mobiel geen enkel gemaskerd beeld.

**M-4 De kruising blijft, maar kantelt.** Minstens twee vlakken blijven een beeldrand kruisen,
en ze kruisen de **onderrand** in plaats van de zijrand. Gemeten overlap, constant in pixels over
alle drie de mobiele breedtes: **26px** (M4, `home-process.css:235`), **34px** (M6-final,
`home-final.css:403`) en **28px** (M3-proof, alleen @390). Dat is 13,7% · 19,8% · 9,1% van de
kaarthoogte.

**M-5 Scrim kantelt mee.** Gemeten: M1 255deg → 196deg; M2 90deg → 180deg; M6-final 200deg →
196deg; M5 blijft 180deg maar rekt zijn dichte zone van 72% naar 86–92%; M3-infra blijft
ongewijzigd 268deg.

**M-6 Wegvallen mag.** M6-footer verdwijnt volledig (`home-footer.css:372`), net als de
chevronwig en de notitie van S8 (`home-final.css:331`). Een behandeling die op mobiel niet
overeind blijft, wordt verwijderd en niet uitgerekt.

**M-7 De tweemiddelenregel (U-1) geldt niet onder 1200px.** Gemeten @390: **0** maskers;
scrims op M1 (2 stops), M2, M5 (×5), M3-infra en M6-final; **kaal type op beeldpixels alleen in de
M5-kaarten** (plus één badge van 10,5px in S6); **3 vlakken die een beeldrand kruisen** (M4 26px,
M3-proof 28px, M6-final 34px), geen daarvan groter dan de 30.000px²-drempel ten opzichte van de
mobiele beeldmaat. Per beeld zakt de score daarmee naar **1**. De mobiele eis is daarom een
pagina-eis in plaats van een beeld-eis: **≥ 2 vlakken die een beeldrand kruisen** (gemeten 3 @390,
2 @768 en @1199) en **≥ 1 beeld met kaal type erop** (gemeten 1 sectie, met 5 beelden).

---

## 13. MEETPROTOCOL — hoe je dit toetst

Elke regel hierboven is met deze vier stappen te controleren; ze zijn alle vier in deze sessie
gedraaid op `http://127.0.0.1:8033/index.html` (stap 1 en 3 ook op
`http://127.0.0.1:8033/systeem-energieopslag.html`).

1. **Geometrie.** `beeld.mjs <pagina> <naam> 1774,1440,1199,768,390` schrijft per beeld: maat,
   ratio, % vw, % sectiehoogte, % sectievlak, randcontact L/R/T/B, maskerhoeken, scrimdeclaraties,
   welke vlakken erop liggen (met het percentage dat op **werkelijke beeldpixels** valt via een
   punt-in-polygoontoets met 400 monsters) en welke tekstdragers erop liggen.
2. **Contrast.** `contrast.mjs 1774` maakt het te meten element onzichtbaar
   (`visibility: hidden`, layout blijft staan), neemt een schermafdruk van exact zijn rechthoek,
   leest de pixels in een canvas en rekent per pixel de WCAG-luminantie uit. Het rapporteert
   min / p05 / mediaan / p95 / max en de contrastverhouding met de gemeten tekstkleur. Hetzelfde
   script zet elke scrim via een geïnjecteerde stijlregel uit en meet opnieuw: dat levert de
   kolommen "met scrim / zonder scrim".
3. **Vlakken en type op beeld, streng.** `kaal.mjs` telt per sectie (a) informatievlakken van
   ≥ 30.000px² die voor ≥ 50% van hun eigen oppervlak op werkelijke beeldpixels liggen en (b) type
   waartussen en het beeldvlak geen enkele voorouder met een eigen achtergrond, schaduw of rand
   zit. Het draait op beide pagina's en levert de tellingen 4/4/8-van-8 (homepage) tegen 0/1/1-van-5
   (B2-kandidaat).
4. **Tekstschaduw.** `contrast2.mjs` meet een tweede keer met `color: transparent` in plaats van
   `visibility: hidden`: de glyph verdwijnt, de tekstschaduw blijft staan. Het verschil tussen
   beide metingen is de bijdrage van de schaduw (gemeten bij `.vh-footer-note`: mediaan 0,475 →
   0,430, aandeel donkere pixels 0,5% → 9,9%).

De harnassen staan in de sessiescratchpad naast `forensics.mjs`; ze lezen de pagina en wijzigen
geen bestand. Runtime-injecties (scrim uit, pijlknop verbergen) bestaan alleen binnen één
browsercontext.

---

## 14. WAT IK NIET HEB GEMETEN

| onderwerp | reden |
|---|---|
| De oude 1,00:1-meting uit `home-solutions.css:171-175` | Die hoort bij een diagonaal verloop dat niet meer in de code staat. Ik heb de huidige toestand gemeten (15,42–18,42:1), niet de oude gereconstrueerd. |
| Contrast op 1440 · 1199 · 768 · 390 | Alle contrastmetingen zijn op 1774px gedaan. De mobiele scrims hebben andere stops (§12 M-5); hun gemeten contrast is onbekend. |
| Hoekwaarde van `.vh-ctrl::before` (M0) | De hoekdetectie van `forensics.mjs:58-75` slaat deze vijfhoek over; geen van de vier zijden is zuiver schuin. |
| Het effect van `loading`/`decoding`-attributen en van de laadkleuren (`#DCE8F4`, `#E3ECF4`) op het waargenomen beeld | Alle metingen zijn gedaan nadat elk zichtbaar beeld `complete` was. |
| Of een glyph van `.vh-proof-story p` ooit in de 0,1% fotopixels van zijn meetvlak valt | Gemeten is het meetvlak, niet de glyphposities. Bij andere tekstlengtes of een ander lettertype kan dat veranderen. |
| Animaties (`vhCtrlPuls` 1,8s, `vhCtrlStroom` 1,1s, hovertransities) | Alle afdrukken zijn stilstaand. |
| De B2-kandidaat op 1440 · 1199 · 768 · 390 met mijn eigen harnas | `beeld.mjs` en `kaal.mjs` zijn op B2 alleen op 1774px gedraaid; de overige breedtes komen uit het aangeleverde `b2-forensics.json`, dat een andere, ruimere definitie van "vlak op een beeld" gebruikt. |
| Contrast op de B2-kandidaat | Geen enkele contrastmeting gedaan; de vergelijking in dit document gaat over geometrie en vlakken, niet over leesbaarheid van die pagina. |
| Gedrag boven 1774px | Niet gemeten; de pagina rekent in `cqw` en zou lineair moeten doorschalen, maar dat is een verwachting, geen meting. |

---

## 15. AFWIJKINGEN DIE IK TEGENKWAM (waarnemingen, geen voorstellen)

1. **De notitie-op-beeld bestaat één keer, niet drie keer.** `forensics-homepage.md` schrijft dat
   het middel drie keer voorkomt (S7, S8, S9). Gemeten in `index.html`: het woord `note` komt
   **één keer** voor, op `index.html:1024` (`span.vh-footer-note`). De regelblokken
   `.vh-infra-note` (`home-infra.css:185-204`) en `.vh-final-note` (`home-final.css:106-125`)
   hebben in deze HTML **geen enkel element**. Als CSS-middel bestaat het drie keer, als
   ontwerpelement één keer. Toetsmethode: `grep -c note index.html` = **1**.
2. **Dubbele hoogtedeclaraties in hetzelfde mediablok.** `home-infra.css:429` zet
   `.vh-infra-foto{height:330px}` en `:443` in hetzelfde blok `height:260px`; `home-proof.css:470`
   zet 320px en `:482` 300px. De laatste wint; de gemeten hoogtes zijn 260 en 300. Zie DR-V-24.
3. **M4 is het enige beeld ≥ 50% vw zonder scrim**, met een vlak/veldscheiding van 2,24:1. Zie
   §6-G en DR-V-21.
4. **De footernotitie meet 2,00:1** en is daarmee het enige type op beeld dat onder elke gangbare
   drempel blijft; het is `aria-hidden`. Zie §8-G en DR-V-22.
5. **"B2 heeft 0 informatievlakken op een beeld" klopt niet.** `forensics-homepage.md` meldt
   "0 van 11". Zelf gemeten: **5 van de 5** B2-beeldsecties hebben een vlak dat op beeldpixels
   ligt. Het verschil met de homepage zit in de maat (24.600px² tegenover 53.172–85.852px²) en in
   het aandeel van het vlak dat op het beeld ligt (3,2–22,3% tegenover 81–100%). Ook heeft de
   B2-sectie 06 wél kaal type op beeldpixels. De conclusie van het aangeleverde bewijs blijft
   overeind, de telling niet. Zie §0 en §11.
   **Niet veroorzaakt door een gewijzigd bestand:** `systeem-energieopslag.html` is voor het laatst
   gewijzigd op 1 okt 20:15 en de eerdere meting (`b2-forensics.json`) is van 2 okt 00:17 — beide
   metingen draaiden op dezelfde bytes. Het verschil komt uitsluitend van de definitie van
   "vlak op een beeld". (De pagina wijkt wel 712 regels af van `aae26bf`; dat is werk van een
   andere sessie en staat los van deze meting.)
6. **"Het enige staande beeld van de pagina" klopt niet.** `forensics-homepage.md` schrijft dat
   over S9 (ratio 0,67). Gemeten zijn ook twee M5-kaartbeelden staand (0,61 en 0,59) en één bijna
   vierkant (0,98). S9 is wel het enige staande beeld buiten een kaart. Zie §8-B.
7. De kaart van S4 steekt 56px voorbij de rechterrand van de foto en 8px onder de onderrand,
   terwijl `home-process.css:118` "rechterrand gelijk aan de foto" noteert. Dat is in
   `forensics-homepage.md` al vastgesteld; mijn meting bevestigt 56 en 8px. Zie DR-V-08 aldaar.

---

## 16. OPEN BESLUITEN

Genummerd vanaf **DR-V-20** om niet te botsen met DR-V-01 t/m DR-V-10 uit
`forensics-homepage.md`. Elk besluit volgt uit een gemeten waarde; geen ervan is een opdracht om nu
iets te wijzigen.

- **DR-V-20 — Ondergrenzen voor contrast op beeld.** Drie gemeten families, drie voorstellen:
  (a) **wit type op beeldpixels** haalt mediaan 15,45–18,42:1 en bij p95 minimaal 12,2:1 → norm
  **mediaan ≥ 15:1, p95 ≥ 12:1**;
  (b) **gekleurd type op beeldpixels** (`#93A5BC`, `#0490FF`) haalt 5,55–7,19:1 mediaan en
  3,95–4,27:1 in het ongunstigste monster → norm **mediaan ≥ 5,5:1, ongunstigst ≥ 3,9:1**;
  (c) **wit vlak op beeldpixels** haalt 5,14–15,15:1 mét scrim en 2,24:1 zónder scrim (maar mét
  tweetraps schaduw) → norm **≥ 5:1 met scrim, ≥ 2,2:1 met een tweetraps schaduw**.
  Vastleggen als norm, of per sectie vrij laten?
- **DR-V-21 — Scrim verplicht bij M4?** M4 is het enige beeld ≥ 50% vw zonder enige verdonkering;
  de witte kaart erop scheidt zich met 2,24:1. Wordt een scrim verplicht (en zakt de kaart dan niet
  te veel weg in de band), of wordt de tweetraps schaduw de officiële vervanger?
- **DR-V-22 — Decoratief type op beeld.** `.vh-footer-note` meet 2,00:1 (1,43:1 bij de lichtste 5%)
  en is `aria-hidden`. Blijft dat toegestaan als uitzondering (regel M6-O), of moet alle type op
  beeld aan DR-V-20 voldoen?
- **DR-V-23 — Focuspuntregel.** Tweemaal gemeten: 26% met kaarten rechts, 78% met de kaart links.
  Leggen we "minstens 24 procentpunten weg van de bedekte kant" vast, of blijft `object-position`
  per beeld een handmatige keuze?
- **DR-V-24 — Dubbele hoogtedeclaraties.** `home-infra.css:429/443` en `home-proof.css:470/482`
  declareren in hetzelfde mediablok twee hoogtes. Opruimen of laten staan? (Het gerenderde
  resultaat verandert niet; de leesbaarheid van het stylesheet wel.)
- **DR-V-25 — Geparkeerde mobiele footerwig.** `home-footer.css:373-377` definieert
  `.vh-footer-wig-ongebruikt` met `height: 132px`; die selector raakt geen element en is op geen
  enkele gemeten breedte zichtbaar. De reden voor het verbergen staat erbij (`:370-371`: de band
  draagt op mobiel geen informatie en rekte de footer met ruim 160px). Blijft M6 op mobiel
  afwezig — en wordt dat dan regel M-6 — of komt de band terug op 132px?
- **DR-V-26 — Minimumdrempels V-1 t/m V-8.** De drempels in §10 liggen tussen de gemeten
  homepagewaarde en de gemeten B2-waarde in. Blijven ze daar, of worden ze opgetrokken naar de
  homepagewaarde zelf (strenger, maar dan haalt alleen de homepage zijn eigen norm)?
- **DR-V-28 — Welke telling wordt de officiële?** `forensics-homepage.md` telt "informatievlak op
  een beeld" als *elk* vlak dat de beeldrechthoek overlapt (homepage 6, B2 0). Dit document telt
  alleen vlakken van ≥ 30.000px² die voor ≥ 50% van hun eigen oppervlak op werkelijke beeldpixels
  liggen (homepage 4 secties / 7 vlakken, B2 0) en daarnaast "kaal type op beeldpixels"
  (homepage 4, B2 1). De tweede telling is strenger en onderscheidt wél; de eerste geeft B2
  ten onrechte een 0. Welke telling gaat in V1.2 de norm zijn?
- **DR-V-29 — Nummerreeks DR-V.** Dit document gebruikt DR-V-20 t/m DR-V-29 om niet te botsen met
  DR-V-01…10 uit `forensics-homepage.md`. Er worden in dezelfde ronde meer V1.2-documenten
  geschreven; of die reeks vrij is, is **NIET GEMETEN**. Eén centrale nummering afspreken?
- **DR-V-27 — Mobiele tweemiddelenregel.** Op ≤1199px is de gemeten ondergrens 1 middel per beeld.
  Accepteren we dat het systeem op mobiel een ander systeem is, of komt er een mobiele variant van
  U-1 (bijvoorbeeld: elk beeld ≥ 50% vw draagt een scrim én een kruisend vlak)?
