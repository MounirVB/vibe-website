# VIBE WEB DESIGN SYSTEM — VISUELE TAAL (laag 04)

**Versie V1.3 · REVIEWKANDIDAAT, NIET BEVROREN.** Samengesteld uit zes hoofdstukken die parallel zijn
geschreven tegen hetzelfde bewijs. Dit document vervangt de rol van de vijf losse V1.2-documenten
(`vibe-visual-grammar-v1.md`, `vibe-image-system-v1.md`, `vibe-card-system-v1.md`,
`vibe-section-blueprints-v1.md`, `vibe-design-quality-gate-v1.md`); die blijven staan als bewijsbijlage
en worden niet verwijderd.

| | |
|---|---|
| **Status** | V1.3 = **GEBLOKKEERD**, geen vriescandidaat. De blokkades staan in `docs/00-changelog.md` en in het eindrapport. |
| **Voorrang** | `vibe-web-brandbook-v1.md` §1A blijft `FROZEN` en wint bij elke tegenspraak (`brandbook §1.3`). V1.1 (`vibe-section-compositions-v1.md`) blijft geldig. |
| **Productiecode** | Er is bij het schrijven van dit document geen HTML, CSS, JS of asset gewijzigd of toegevoegd, en er is geen schermafdruk gemaakt. |
| **Besluitprefixen** | H1 `DR-C` · H2 `DR-I` · H3 `DR-S` · H4 `DR-G` · H5 `DR-B` · H6 `DR-Q`. Toetsen: `DR-T` (papieren test), `DR-A` (aanvallen), `DR-X` (consolidatie). Geen van deze blokken botst; de V1.2-botsing is apart gerepareerd (kaartsysteem → `DR-V-60…69`, poort → `DR-V-70…76`). |
| **Klassen bij elk getal** | **A** transferable floor · **B** referentiebereik · **C** homepage-specifiek. Een homepagemeting is bewijs, geen automatische regel. |
| **Poortuitkomsten** | PASS · FAIL · N.V.T.-met-reden. Een lege verzameling is NOOIT PASS. |

## Inhoud

| hoofdstuk | regels | wat het vervangt |
|---|---:|---|
| **1 · HET DESKTOPCANVAS** | 625 | `§1A.6` punt 2/3 lezing · V1.2 `G17`, `G19`, `G20`, `P-01`, `P-02` |
| **2 · BEELD EN ASSETS** | 987 | `vibe-image-system-v1.md` §1–§12 (M0–M6, V-1…V-8, U-1…U-4) |
| **3 · VLAKKEN, HIERARCHIE EN REGISTERS** | 925 | `vibe-card-system-v1.md` §1, §3.3, §4.1, §4.8; de ontbrekende registerlaag |
| **4 · GEOMETRIE, TYPOGRAFIE EN TOEGANKELIJKHEID** | 907 | V1.2 `G21`, `G22`, `P-08`, `P-12`, `P-13`, `P-15`, contrastvoorstel `DR-V-20` |
| **5 · BLAUWDRUKKEN ALS RELATIES** | 1149 | `vibe-section-blueprints-v1.md` `B01`–`B15` → `BR-01`–`BR-13` |
| **6 · DE KWALITEITSPOORT** | 691 | `vibe-design-quality-gate-v1.md` DEEL 2 en DEEL 3 (`P-01…P-16`, `H-01…H-06`) |
| **totaal** | **5284** | |

---

# H1 · HET DESKTOPCANVAS — Vibe Web Design System V1.3

| | |
|---|---|
| **Status** | `V1.3 — VOORSTEL`. Dit hoofdstuk legt eenheden, maten en modi vast. Het bevat **geen** besluit dat §1A van `vibe-web-brandbook-v1.md` overschrijft; waar het dat zou doen staat een `DR-C`-besluit en wint §1A tot de opdrachtgever beslist (`brandbook §1.3`, `§1A.12` punt 4). |
| **Besluitblok** | **DR-C-20 t/m DR-C-39** is hierbij geclaimd voor hoofdstuk 1. Gemeten deze sessie met `grep -ho "DR-C-[0-9A-Za-z]*" docs/*.md`: **DR-C-01 t/m DR-C-11 zijn bezet** (`vibe-section-compositions-v1.md §8`), plus één `DR-C-xx`-plaatshouder. 12–19 blijft vrij voor een ander V1.3-hoofdstuk. |
| **Geldigheidsbereik** | **≥ 1200px.** Onder 1200px verandert dit hoofdstuk niets: `1A.6` punt 1 en punt 4 blijven onverkort. |
| **Geen productiecode** | Er is in deze sessie geen HTML, CSS, JS of asset gewijzigd of toegevoegd, en er is geen screenshot gemaakt. Alle metingen zijn leesmetingen op de werkboom plus narekeningen. |
| **Master v1** | Wordt **niet** gerefactord (`1A.6` punt 3, `1A.11` punt 3). Elke regel hieronder geldt voor **nieuw** werk; waar Master v1 zelf een regel niet haalt, staat dat er met het getal bij. |

## 0 · Leeswijzer

### 0.1 De drie klassen

Elke numerieke waarde in dit hoofdstuk draagt één van deze drie codes. Een waarde zonder code is een fout in dit document.

| code | betekenis | gevolg |
|---|---|---|
| **A TRANSFERABLE FLOOR** | geldt op elke pagina van de site, in de modus waarvoor hij is gescopeerd | wordt een poort met PASS / FAIL / N.V.T.-met-reden |
| **B REFERENTIEBEREIK** | richtwaarde, afgeleid uit één of twee metingen | **geen** poort; een afwijking is een gespreksonderwerp, geen afkeuring |
| **C HOMEPAGE-SPECIFIEK** | beschrijft Master v1 op één breedte | wordt **nooit** een regel; mag worden geciteerd als bewijs |

### 0.2 De drie poortuitkomsten

1. **PASS** — het te toetsen object bestaat én haalt de grens.
2. **FAIL** — het object bestaat en haalt de grens niet, **of** het object ontbreekt terwijl de modus het vereist.
3. **N.V.T.-met-reden** — de modus van deze sectie vereist het object niet; de reden staat erbij, met het nummer van de modusregel.

**Een lege verzameling is nooit PASS.** `[].every()` is in JavaScript `true`; dat is de gemeten oorzaak van twee PASS-en van de nep-pagina SYSTEEM-X (`kritiek-ontduiking.md §5` fout S4: P-10 op negen 50/50-secties, P-09 zonder enige kaartrij). Elke poort in dit hoofdstuk noemt daarom eerst **de noemer** en geeft FAIL als die nul is.

### 0.3 Wat dit hoofdstuk niet doet

- Het abstraheert **geen** van de vijf composities die `1A.4` punt 3 verbiedt te abstraheren (hero-stage, Hedin-projectpaneel, VIBE.CONTROL-console, process timeline, final CTA). Dit hoofdstuk benoemt eenheden, maten en modi; het benoemt geen enkele herbruikbare compositie. Toets: zoek in dit bestand naar een blauwdruknaam of een componentklasse — er staat er geen.
- Het definieert **niet** wat een "beeld" of een "informatievlak" is. Die twee definities zijn de gemeten hoofdoorzaak van de ontduiking (`kritiek-ontduiking.md §5` fouten S3 en S2: een volledig transparante 1×1 GIF geldt als beeld, een vlak van `rgba(255,255,255,.01)` geldt als informatievlak). Ze horen in het beeld- en kaarthoofdstuk. Waar een canvasregel op die definitie leunt, staat dat er expliciet bij: **deze vloer is forgeerbaar zolang DR-V-40 en DR-V-41 openstaan.**
- Het stelt **geen** contrast- of leesbaarheidsnorm vast. `gate §4` noteert zelf dat geen enkele poort leesbaarheid toetst (DR-V-16). Dit hoofdstuk zet wel graadvloeren (§1.2.7), en die zijn geen contrastnorm.

### 0.4 Wat ik in déze sessie zelf heb gemeten

Leesmetingen op `/Users/mounirvanbinsbergen/projects/vibe-website`, plus narekeningen in `python3`. Alles hieronder is reproduceerbaar met de genoemde opdracht.

| # | meting | uitkomst |
|---|---|---|
| Z1 | `container-type:inline-size` in `home*.css` | **9 treffers**, één per sectiebestand (`home-hero.css:11`, `home-solutions.css:10`, `home-project.css:20`, `home-process.css:20`, `home-control.css:17`, `home-proof.css:15`, `home-infra.css:14`, `home-final.css:16`, `home-footer.css:15`) — bevestigt het aanvaarde bewijs "9 van 9" |
| Z2 | treffers op `cqw` in `home*.css` | **782** totaal, **780** buiten `home-mobile.css`; per bestand 126 · 114 · 108 · 94 · 80 · 79 · 64 · 64 · 39 · 12 · 2. Het aanvaarde bewijs noemt 768 — zie §1.5 conflict CH1-03 |
| Z3 | `max-width` in `home.css` | **1 treffer**: `img{ max-width:100%; display:block }` (`home.css:99`). **Geen paginabrede max-width** — bevestigt het aanvaarde bewijs |
| Z4 | `[0-9]+ch` in `home*.css` | **12 declaraties**: 15 · 34 · 34 · 34 · 36 · 36 · 36 · 36 · 38 · 38 · 52 · 52 ch. **Alle twaalf staan binnen een media query op ≤1199px** (gecontroleerd met een script dat per treffer de laatste `@media`-regel erboven opzoekt). Elf zijn regellengtecaps 34–52ch (bevestigt het aanvaarde bewijs); de twaalfde is `15ch` op `.vh-kpi-getal` in de band 768–859px, en `brandbook §5.4` documenteert die als een **gewichtsmiddel** ("drie kolommen van gelijk gewicht"), niet als leesbaarheidscap |
| Z5 | `position:absolute` in `home*.css` | **73 treffers**, waarvan 71 buiten `home-mobile.css`: 11 · 10 · 9 · 9 · 8 · 7 · 6 · 6 · 5 · 2 · 0. Het aanvaarde bewijs noemt **0x** voor de homepage — zie §1.5 conflict CH1-01 |
| Z6 | `position:absolute` in de B2-stylesheets | `vibe-system.css` **3** + `vibe-storage.css` **16** = **19** — identiek aan het aanvaarde bewijs, dus de telmethode is dezelfde als die waarmee de homepage 73 oplevert |
| Z7 | de breedtegrendel van de B2-kandidaat | `--container-max:1240px` (`vibe-system.css:85`), toegepast als `width:100%; max-width:var(--container-max); padding-inline:var(--gutter)` op `.vibe-container` (`:144-145`); twee overrides `--wide:1440px` (`:151`) en `--smal:1100px` (`:154`) |
| Z8 | `container-type` in de B2-stylesheets | **1 treffer**: `.vibe-stage{ container-type:inline-size }` (`vibe-system.css:348`), en `cqw` **4 treffers**, waarvan `--bleed:calc((min(100cqw, var(--container-max)) - 100cqw) / 2 - var(--gutter))` (`:350`) — zie §1.1.4 |
| Z9 | de negen typerollen van de B2-kandidaat | `--fs-h1:clamp(34px,6.2vw,62px)` · `h2 clamp(27px,3.6vw,44px)` · `h3 clamp(19px,1.5vw,23px)` · `h4 clamp(16.5px,1.1vw,18.5px)` · `lead clamp(16.5px,1.25vw,20px)` · `body clamp(15.5px,1.05vw,17px)` · `small clamp(13px,.9vw,14.5px)` · `eyebrow clamp(11.5px,.85vw,13px)` · `metric clamp(26px,2.6vw,38px)` (`vibe-system.css:88-96`) |
| Z10 | het desktopritme van de B2-kandidaat | `@media (min-width:1200px){ :root{ --gutter:clamp(48px,4.6vw,80px); --section-y:clamp(84px,6vw,112px) } }` (`vibe-system.css:107-109`) |
| Z11 | de regellengtecaps van de B2-kandidaat | `.vibe-lead{ max-width:58ch }` (`:184`), `.vibe-body{ max-width:62ch }` (`:188`), `.st-hero-copy .vibe-lead{ max-width:46ch }` (`vibe-storage.css:51`), `.st-techniek-bij{ max-width:min(30ch,74%) }` (`:412`) — **actief op desktop**, anders dan de twaalf caps van de homepage (Z4) |
| Z12 | `clip-path: polygon(...)` in de desktoplaag van `home*.css` | **13 declaraties**, en **alle coördinaten staan in procenten** (`100%`, `42.30%`, `28.92%`, `11.5%`, `17.55%`, `46%`, `7.0% 9.5% … -0.6% 46%`). **Nul polygonen in px.** `aspect-ratio` staat maar twee keer in de desktoplaag: `1774/748` (`home-hero.css:38`) en `1704/565` (`home-project.css:50`) |

Narekeningen: `1774/748 = 2,372` en `1704/565 = 3,016` — gelijk aan de doelratio's 2,37 (M1) en 3,02 (M2) uit `BEWIJS-assets.md §1`. De twee ratio's van het aanvaarde bewijs zijn dus deze twee `aspect-ratio`-declaraties.

---

## 1.1 · DE CORRECTIE OP 1A.6

### 1.1.1 Wat 1A.6 letterlijk zegt

`brandbook §1A.6`, punt 2 en 3, woordelijk:

> 2. **Responsieve typografie: `clamp()` is de default.** `cqw` uitsluitend voor bewust canvas-proportionele composities.
> 3. **Master v1 wordt hiervoor NU NIET gerefactord**, en B1 wordt niet herbouwd (§1A.11). De gemeten cqw-erfenis van de homepage blijft dus staan; **nieuw werk neemt haar niet over.**

Twee waarnemingen over die tekst, beide toetsbaar op de tekst zelf:

1. **Punt 2 is naar de letter over typografie** ("Responsieve *typografie*"), maar de tweede helft van dezelfde regel gaat over **composities**. Eén regel draagt twee lagen. Elke lezer die punt 2 en punt 3 achter elkaar leest, leest één verbod: *geen cqw in nieuw werk*. Zo is het ook gelezen — `kritiek-overfitting.md §5.1` meet dat V1.2's `P-01`, `P-02` en `G17` alleen haalbaar zijn met cqw en daarmee op elke nieuwe pagina onhandhaafbaar zijn zolang `1A.6` geldt, "en dat is tegelijk de verklaring waarom de B2-kandidaat 0,8838 haalt in plaats van 0,8117: die pagina doet precies wat `§1A.6` voorschrijft".
2. **Punt 3 verbiedt de erfenis, niet het principe.** Het object van "neemt haar niet over" is "**de gemeten cqw-erfenis van de homepage**" — dat zijn de 780 concrete cqw-waarden van Z2, bijvoorbeeld `4.3100cqw` voor `.vh-h1` (`home-hero.css:261`) en `3.9459cqw` voor de linkermarge van S2/S3/S4. Dat die 780 getallen niet worden overgenomen is in dit hoofdstuk **volledig onderschreven**: §1.4 classificeert ze als **C**. Of composities proportioneel met het canvas mogen rekenen, is een andere vraag, en punt 3 beantwoordt die niet.

### 1.1.2 Gemeten: de B2-kandidaat bevriest boven 1682px

De B2-kandidaat doet wat `1A.6` voorschrijft: `clamp()` voor alle typografie, één container-type, 4 cqw-treffers (Z8, Z9). Reken de negen typerollen na. Een `clamp(min, k·vw, max)` bereikt zijn plafond bij de breedte `max ÷ k`:

| rol | declaratie (Z9) | plafond bindt vanaf | graad @1774 |
|---|---|---:|---:|
| h1 | `clamp(34px, 6.2vw, 62px)` | **1000px** | 62px |
| h2 | `clamp(27px, 3.6vw, 44px)` | **1222px** | 44px |
| metric | `clamp(26px, 2.6vw, 38px)` | **1462px** | 38px |
| eyebrow | `clamp(11.5px, .85vw, 13px)` | **1529px** | 13px |
| h3 | `clamp(19px, 1.5vw, 23px)` | **1533px** | 23px |
| lead | `clamp(16.5px, 1.25vw, 20px)` | **1600px** | 20px |
| small | `clamp(13px, .9vw, 14.5px)` | **1611px** | 14,5px |
| body | `clamp(15.5px, 1.05vw, 17px)` | **1619px** | 17px |
| h4 | `clamp(16.5px, 1.1vw, 18.5px)` | **1682px** | 18,5px |

**Negen van de negen typerollen staan op 1774px op hun plafond. De hoogste bindende breedte is 1682px.** Daar bovenop: de goot `clamp(48px, 4.6vw, 80px)` bindt op **1739px** (Z10). Boven 1739px verandert op die pagina **alleen nog** `--section-y` (plafond op 1867px).

Dit is de rekenkundige verklaring van drie dingen die als aanvaard bewijs zijn aangeleverd en die tot nu toe als smaakoordeel klonken:

- **"44px viermaal" op tien koppen** (`gate P-08`). Dat is geen slordigheid. Boven 1222px is élke `h2` op die pagina exact 44px, want dat is het plafond. Vier h2's op één pagina leveren dus vier keer 44px, met rekenkundige zekerheid.
- **"De pagina krimpt naarmate het scherm groeit."** De breedtegrendel is 1240px (Z7). Aandeel van de viewport: `1240 ÷ 1774 = 69,9%` tegen `1240 ÷ 1440 = 86,1%` — een daling van **16,2 procentpunt** terwijl het scherm 23% breder wordt. Het aanvaarde bewijs meet 68,1% tegen 86,0% met zijn eigen werkbreedte-definitie; dezelfde daling, 17,9 procentpunt. De grendel `1240 − 2 × 16 = 1208px = 68,1% van 1774` reproduceert het aanvaarde getal exact.
- **"De B2-kandidaat haalt de V1.1-maatstaven en oogt toch getemplatet."** Een pagina waarvan negen van de negen typerollen en de goot op hun plafond staan, heeft boven 1739px **nul** vrijheidsgraden over. Alles wat de pagina nog onderscheidt, is dan de inhoud van de tekstvakken.

### 1.1.3 Gemeten: Master v1 heeft geen plafond

De andere kant is even hard. `brandbook §5.2` meet: *"Geen bovengrens op de schaal. Geen enkele `max-width` in `home*.css`; alle negen sectiewortels hebben `width:100%`. Boven 1774px groeit alles lineair mee: `.vh-h1` is 4.3100cqw (`home-hero.css:261`), dus op een 2560px-scherm **110px** in plaats van 76,5px."* En: de enige twee `max()`-vloeren van de hele pagina werken alleen in de banden 1200–1203,8px en 1200–1496,8px (`brandbook §5.4`, nagerekend: `19 ÷ 0,015784 = 1203,8` en `13,5 ÷ 0,009019 = 1496,8`).

**Master v1 heeft dus vloeren die vrijwel nooit binden en nul plafonds. De B2-kandidaat heeft plafonds die allemaal binnen de desktopband binden en vloeren die alleen onder 1000px binden.** Beide pagina's zakken op de gerepareerde regel van §1.2.7, in tegengestelde richting. Dat is het bewijs dat die regel niet op één van de twee is overgefit.

### 1.1.4 De vier koppelingen

Typografie en compositie zijn twee onafhankelijke keuzes. Er zijn vier combinaties en alle vier zijn in deze repository gemeten of na te rekenen:

| | **compositie proportioneel met het canvas** | **compositie met een px-grendel** |
|---|---|---|
| **type proportioneel zonder plafond** | **Master v1.** Schaalt als één compositie (0,8117, afwijking 0,003%), werkbreedte 90,5% op 1774 én 1440. Breekt boven ±2500px: `.vh-h1` = 110px op 2560 | niet gemeten in deze repo |
| **type geclamped met plafond in de desktopband** | **de correctie** (§1.2.7) | **de B2-kandidaat.** Bevroren boven 1739px; aandeel 69,9% → 86,1%; schaalfactor 0,8838, 8,87% ernaast; spreiding 0,138 |

Er is nog een vijfde geval, en dat is de val: **cqw binnen een px-grendel.** Gemeten op `vibe-system.css:350`: `--bleed:calc((min(100cqw, var(--container-max)) - 100cqw) / 2 - var(--gutter))`. Boven 1240px is `min(100cqw, 1240px)` constant 1240px; de "proportionele" uitdrukking is daarmee proportioneel aan een **constante**. `1A.6` punt 2 staat cqw toe "uitsluitend voor bewust canvas-proportionele composities" en laat precies de constructie open die het eigen doel opheft. → **DR-C-21**.

### 1.1.5 De vervangende tekst — DR-C-20

**Status: `DECISION REQUIRED`.** `1A.6` is bevroren; onderstaande tekst geldt pas na een besluit van de opdrachtgever. Tot dat besluit wint `1A.6` punt 2 zoals hij er staat (`brandbook §1.3`).

Voorgestelde vervanging van `1A.6` punt 2, als **twee** punten in plaats van één:

> **2a · LAAG T — TYPOGRAFIE IS BEGRENSD.** Elke typerol draagt een **vloer én een plafond**. `clamp()` blijft de default; de middenterm mag canvas-proportioneel zijn. De vloer is nooit lager dan de gemeten waarde van dezelfde rol in de tabletband (`home-mobile.css:38-43`): h1 ≥ 58px, h2 ≥ 42px, lead ≥ 18px, body/label ≥ 16,5px. Het plafond van de koprollen bindt niet vóór 2000px. Toets: `plafond ÷ vw-coëfficiënt` per rol (§1.2.7).
>
> **2b · LAAG C — COMPOSITIE IS PROPORTIONEEL MET HET CANVAS.** Boven 1200px wordt de maat van een sectie, een beeld, een vlak en een hoek uitgedrukt in een eenheid die met het canvas meeschaalt (`cqw` of `vw`, §1.2.0), en **nooit** in een px-plafond op de inhoudsdoos van een sectie. Een regellengtecap in `ch` op een **tekstelement** is geen px-plafond en is toegestaan in elke modus; een `max-width` in px op de **inhoudsdoos** van een sectie is in CANVAS- en HYBRID MODE verboden en in DOCUMENT MODE overbodig (§1.3.5 middel D1). De cqw-waarden van Master v1 worden **niet** overgenomen (zij zijn klasse C, §1.4).

Het onderscheid in 2b tussen *cap op het tekstelement* en *plafond op de inhoudsdoos* is geen formulering maar een gemeten scheidslijn. Z4: de homepage heeft 11 regellengtecaps (34–52ch) en nul px-plafonds op een inhoudsdoos. Z7 + Z11: de B2-kandidaat heeft 4 regellengtecaps (30 · 46 · 58 · 62ch) **en** een px-plafond van 1240px op `.vibe-container`. **De regellengtecaps zijn niet het probleem — het px-plafond is het probleem.** De B2-caps 58ch en 62ch worden in §1.2.8 juist overgenomen als bovengrens.

### 1.1.6 Wat NIET verandert

| onderdeel | blijft | bewijs dat het ongemoeid blijft |
|---|---|---|
| **`1A.6` punt 1 — breekpunten** | ≤767 mobiel · 768–1199 tablet · ≥1200 desktop; `max-width:1199px` is de **enige** systeemgrens (12 gemeten queries); componentgrenzen 859 / 1000 / 1024 alleen met een gemeten reden in het commentaar | Dit hoofdstuk voegt **geen** breekpunt toe en wijzigt **geen** grens. Het geldigheidsbereik is ≥1200px; 1200 blijft de grens waar de compositie wordt afgebroken |
| **`1A.6` punt 4 — collapse-mechaniek** | de vier bewegingen (hoogte → auto, wortel → flex/grid, kinderen → static met `order`, eenheden → px/clamp/`--m-*`), de vier altijd terugkerende regels, de volle-breedte primaire knop onder 768px (**9×** identiek gemeten), `<br>` in koppen op `display:none` onder 1200px (**28×** gemeten) | Dit hoofdstuk raakt uitsluitend de laag ≥1200px. Alle vier de bewegingen blijven de voorgeschreven weg naar beneden, ook vanuit DOCUMENT MODE |
| **Het cqw-vangnet** | `home-mobile.css:207-221` blijft de verplichte vorm, en het gemeten gat wordt benoemd: **13 `box-shadow`-declaraties in cqw, waarvan 2 overschreven onder 1200** — op 390px is 1cqw = 3,9px tegen 17,74px, dus die schaduwen krimpen met factor **4,5** | Nieuwe regel, additief: wie een canvas-eenheid gebruikt, dekt hem onder 1200px af voor **alle** eigenschappen, niet alleen `line-height`. → **DR-C-22** |
| **Master v1 niet refactoren** | `index.html` en `home*.css` blijven byte-for-byte zoals in `aae26bf` (`1A.6` punt 3, `1A.11` punt 3) | Z1–Z5, Z12 zijn **leesmetingen**. Er is geen regel die Master v1 moet halen; waar de master zelf zakt (§1.2.7, §1.3.7) staat dat als bevinding, niet als opdracht |
| **`1A.4` punt 3 — abstractieverbod** | de vijf composities blijven niet-abstraheerbaar | §0.3, eerste bullet: dit hoofdstuk benoemt nul blauwdrukken en nul componenten |
| **`1A.3` punt 2** | een bouwtype legt geen vaste sectievolgorde vast | §1.3.6 geeft per archetype een **bandbreedte per modus** (bijvoorbeeld "CANVAS 3–5"), nooit een volgorde en nooit een sectienummer |

### 1.1.7 Waarom de oude regel desktopkwaliteit onmogelijk maakte — de rekensom in vijf regels

1. Een `clamp()`-plafond is een **vast getal in px**. Het bindt bij `plafond ÷ coëfficiënt`. Voor de negen rollen van de B2-kandidaat ligt dat punt tussen **1000 en 1682px** (§1.1.2).
2. Een `max-width` in px op de inhoudsdoos is óók een vast getal. Het aandeel van de viewport dat de pagina gebruikt, is dan `grendel ÷ schermbreedte` en dus **dalend in de schermbreedte**: 86,1% op 1440, 69,9% op 1774 (Z7, nagerekend).
3. De merkgeometrie is een hoek, en een hoek is alleen invariant als de doos waarop het polygoon staat zijn **verhouding** houdt. Z12: alle dertien desktoppolygonen staan in procenten. Reken de drift na voor de flauwe snede van S7 (gemeten 9,7°, `clip-path: polygon(11.5% 0, 100% 0, 100% 100%, 0 100%)`, `home-infra.css:160`): bij een in px vastgezette dooshoogte wordt die hoek **7,9° op 1440** en **13,9° op 2560**. De band van `P-12` is flauw **9–14°**; een px-vaste doos blijft daar alleen tussen **1644px en 2588px** binnen. Buiten dat venster van 944px is de merkhoek per definitie buiten de familie.
4. Gevolg: op een px-gegrendeld canvas is `P-12` (hoek binnen de merkfamilie) over de desktopband **niet haalbaar**, en `P-01` (schaalfactor) en `P-02` (spreiding) zijn **rekenkundig** niet haalbaar. Gemeten: 0,8838 tegen 0,8117 = **8,87% ernaast**, spreiding **0,138** tegen 0,0050.
5. De som: `1A.6` punt 2 schreef de typografieregel voor en liet de compositieregel impliciet. Wie beide zo leest, krijgt een pagina die boven 1739px stilstaat terwijl het canvas doorgroeit, waarvan het aandeel daalt als het scherm stijgt, en waarvan de merkhoeken buiten de eigen familie vallen. **Dat is geen uitvoeringsfout maar de uitkomst van de regel.**

---

## 1.2 · HET VIBE DESKTOPCANVAS, VANAF 1200px

### 1.2.0 De eenheidskeuze: cqw of vw

De implementator kiest. Beide zijn toegestaan; hier staat wat elk kost, gemeten of na te rekenen.

| | **`cqw`** | **`vw`** |
|---|---|---|
| **vereist** | `container-type: inline-size` op een voorouder. Z1: de homepage zet het 9× (één per sectie); Z8: de B2-kandidaat 1× | niets |
| **referentie** | de **inline-breedte van de container**, dus per sectie instelbaar. Master v1 gebruikt daarom **vier referentiecanvassen** (`brandbook §5.2`), en dat is de gemeten reden dat de linkermarges verschillen: 3,9459 · 4,1150 · 4,3968 · 4,6787 · 4,7551 · 4,9929cqw | altijd de viewport, dus één referentie voor de hele pagina |
| **sterkste voordeel** | een sectie kan een **eigen podium** zijn: zet `aspect-ratio` plus `width:100%` en elk percentage binnen die sectie is invariant. Gemeten: `1774/748` (hero) en `1704/565` (paneel), Z12 | één goot en één verticaal ritme voor de hele pagina met één token, zonder per sectie een container te declareren |
| **gemeten val 1** | **cqw binnen een px-grendel is niet proportioneel.** `vibe-system.css:350` rekent `min(100cqw, 1240px)`; boven 1240px is dat een constante (§1.1.4) | **`vw` telt de verticale scrollbalk mee.** Een element van `100vw` is daarmee breder dan het zichtbare veld. De homepage heeft een vangrail (`html,body{overflow-x:clip}`, `home.css:80-86`); een pagina zonder die rail krijgt een horizontale scrollbalk |
| **gemeten val 2** | cqw is onder 1200px betekenisloos klein en vraagt een vangnet. Het vangnet van de master is **incompleet**: 13 cqw-schaduwen, 2 overschreven, krimpfactor 4,5 op 390px | de scrollbalkbreedte is in **deze sessie NIET GEMETEN** (reden: geen browser gedraaid, geen screenshots toegestaan). Bij een gangbare breedte van 0–17px is dat op 1774px **0–0,96% van de viewport** |
| **gevolg voor de toetsen** | de invariantietoetsen van §1.2 mogen op **0,5 procentpunt** tolerantie | bij `vw` moet de tolerantie naar **1,0 procentpunt**, of beide metingen moeten met dezelfde scrollbalktoestand worden gedraaid. Dit is de enige plaats waar de eenheidskeuze een poortgrens verandert |

**Advies, met de reden.** `cqw` voor CANVAS- en HYBRID-secties, omdat de eigenschap "deze sectie is een podium met een eigen verhouding" alleen met een containercanvas uit te drukken is (Z12: de twee `aspect-ratio`-declaraties van Master v1 zijn precies de twee secties met de meest gesloten compositie). `vw` voor paginabrede ritmewaarden — goot en verticaal sectieritme — omdat je daar juist **één** waarde wil en de B2-kandidaat bewijst dat dat werkt (`--gutter`, `--section-y`, Z10). Wie `vw` kiest voor sectiematen, zet de goot dan op een paginawikkel en niet per sectie, anders ontstaat de gemeten spreiding van 1,047cqw uit §1.2.2 zonder dat iemand daarvoor heeft gekozen.

**A TRANSFERABLE FLOOR C-01 · DE EENHEIDSTOETS.** Meet één sectie-inhoudsdoos op 1440px en op 1774px. `breedte@1440 ÷ breedte@1774` moet gelijk zijn aan `1440 ÷ 1774 = 0,8117` binnen **0,5 procentpunt** (`cqw`) of **1,0 procentpunt** (`vw`). Noemer = het aantal secties; is dat nul → **FAIL**. Gemeten: Master v1 0,8117 (PASS, afwijking 0,003%); B2-kandidaat 0,8838 (FAIL, 8,87%). Deze toets is **N.V.T.-met-reden** voor DOCUMENT-secties (modusregel M-D3).

### 1.2.1 Werkbreedte als doelwaarde

| # | regel | waarde | klasse | gemeten anker |
|---|---|---|---|---|
| **W1** | werkbreedte van een CANVAS- of HYBRID-sectie | **≥ 80% vw** | **A** | `gate P-16` zet 80%; de B2-kandidaat haalt als maximum **79,3%** en als mediaan 60,9%. De scheiding is **0,7 procentpunt** — dun, en zo benoemd |
| **W2** | doelbereik werkbreedte | **88–94% vw** | **B** | Master v1: mediaan 90,5%, 7 van 9 secties ≥84%, reeks 26,5 · 70,1 · 84,0 · 89,8 · 90,5 · 90,8 · 91,3 · 91,3 · 94,2 |
| **W3** | zijmarge van elk tekstdragend element | **≥ 1,5% vw** (26,6px @1774) | **A** | gemeten master-minimum **31px = 1,75% vw** (rechtermarges 31–84px); linkermarges 70–89px = 3,9–5,0% vw |
| **W4** | de negen inhoudskaderbreedtes 1740 · 1133 · 1704 · 1584 · 726 · 634 · 568 · 822 · 1605 | — | **C** | `gate P-07`. De papiertest meet dat vijf pagina's 36 kaders ontwierpen en **0 nieuwe**: deze negen getallen zijn de master, niet het systeem |
| **W5** | geen px-plafond op de inhoudsdoos van een sectie | ja/nee | **A** | Z3 (homepage: 1 `max-width`, op `img`) tegen Z7 (B2: `max-width:var(--container-max)` = 1240px) |
| **W6** | twee inhoudskaders gelden als verschillend vanaf | **1,0% vw** (17,7px @1774) | **A, grens dun** | reparatie van `P-07`. Nagerekend: de negen masterkaders gesorteerd 568 · 634 · 726 · 822 · 1133 · 1584 · 1605 · 1704 · 1740 hebben als **kleinste onderlinge gat 21px = 1,18% vw**; de stagger waarmee SYSTEEM-X `P-07` afvinkte is **12px = 0,68% vw**. 1,0% laat de master door (marge 0,18 procentpunt) en houdt de stagger tegen (marge 0,32 procentpunt). Beide marges zijn dun → **DR-C-23** |

**Waarom W1 een vloer is en 90,5% niet.** Het aanvaarde bewijs zegt: *"Mediane werkbreedte homepage 90,5% van de viewport op 1774 **EN** 1440."* De eigenschap is de **invariantie**, niet het getal. De invariantie wordt A (C-01 en W5); het getal 90,5% beschrijft één pagina op één breedte en wordt C. Wie 90,5% tot vloer maakt, verbiedt elke DOCUMENT-sectie, want een begrensde leeskolom van 26,5–40,9% vw haalt die nooit — en 26,5% is de **eigen** smalste tekstkolom van de master (S3, het paneel).

### 1.2.2 Proportionele gutters

| # | regel | waarde | klasse | gemeten anker |
|---|---|---|---|---|
| **G1** | de goot staat in een canvas-proportionele eenheid, of in een `clamp()` met een proportionele middenterm | ja/nee | **A** | Master v1 heeft **geen gedeelde goot**: per sectie 3,9459 · 4,1150 · 4,3968 · 4,6787 · 4,7551 · 4,9929cqw = 70–89px @1774. De B2-kandidaat heeft er één: `clamp(48px, 4.6vw, 80px)` (Z10) |
| **G2** | doelbereik goot | **3,9–5,0 cqw** (69–89px @1774) | **B** | de zes gemeten waarden hierboven; spreiding **1,047cqw = 19px** |
| **G3** | plafond van de goot bindt niet vóór | **2000px** | **A** | reparatie: `clamp(48px, 4.6vw, 80px)` bindt op **1739px** (nagerekend uit Z10) en daarboven is de goot vast terwijl de pagina groeit. Zelfde logica als §1.2.7 |
| **G4** | de zes cqw-waarden zelf | — | **C** | ze volgen uit vier referentiecanvassen (`brandbook §5.2`), niet uit een ontwerpkeuze. `DR-V-05` houdt al open of er één rand komt; dit hoofdstuk herbeslist dat niet |

### 1.2.3 Wanneer sectiehoogtes proportioneel zijn — en wanneer niet

Dit is het punt waarop V1.2 lange tekst onbouwbaar maakte. `vibe-visual-grammar-v1.md G17` zegt: *"**NIET TOEGESTAAN** — Een sectie met `height: auto` boven 1200px."* Gemeten gevolg (`kritiek-overfitting.md §3.2`): `algemene-voorwaarden.html` heeft 13 hoofdstukken van **62 tot 1581 woorden**, spreiding **25,5**, tegen een canvasbudget van **2,13**; hoofdstuk 4 vraagt ±1815px tekst in een sectie die de band op 709,6px aftopt → **1105px overloop**.

| # | regel | waarde | klasse | gemeten anker |
|---|---|---|---|---|
| **CAN-01** | in **CANVAS MODE** staat de sectiehoogte in een canvas-proportionele eenheid | ja/nee | **A** | 9 van 9 secties van Master v1, 33,2–51,2cqw |
| **CAN-02** | in **DOCUMENT MODE** is de sectiehoogte **inhoudsgestuurd** (`height:auto` + proportioneel verticaal ritme) | ja/nee | **A** | de spreiding 25,5 hierboven. `G17`'s verbod wordt hiermee **gescopeerd op CANVAS MODE**, niet geschrapt → **DR-C-24** |
| **CAN-03** | in **HYBRID MODE** is de sectiehoogte `max(podium, kolom)`: het podium een `min-height` in een canvas-eenheid, de kolom auto | ja/nee | **A** | — |
| **CAN-04** | hoogtespreiding over de **CANVAS-secties** van één pagina | **band 1,25 – 2,00** | **A, geijkt op 3 gevallen** | Master v1 `908 ÷ 588 = 1,544` **PASS** · B2 `1348 ÷ 141 = 9,56` **FAIL** · SYSTEEM-X `780,6 ÷ 780,6 = 1,00` **FAIL**. De vloer 1,25 komt uit `DR-V-43`; het plafond 2,0 is `P-14`. Derde échte pagina **NIET GEIJKT** |
| **CAN-05** | dominantie: ten minste **1 sectie ≥ 45% vw** én ten minste **1 sectie ≤ 38% vw** | ja/nee | **A, geijkt op 3 gevallen** | nagerekend @1774. Master: 4 secties ≥45% (51,2 · 50,1 · 50,0 · 50,0) en 4 ≤38% (35,2 · 33,1 · 35,6 · 35,6) → **PASS**. B2: 3 en 4 → **PASS**. SYSTEEM-X: alle negen op **44,0% vw** → **0 en 0** → **FAIL op beide helften**. Dit is de enige vloer in dit hoofdstuk die de nep-pagina rechtstreeks afkeurt |
| **CAN-06** | sectiehoogte ≥ **25% vw** | **A** | `P-14`, ongewijzigd overgenomen. Master-minimum 588px = 33,1% vw; de B2-snapshotstrook 141px = **7,9%** → FAIL |
| **CAN-07** | de negen hoogtes 908 · 889 · 765 · 624 · 588 · 887 · 887 · 631 · 631 en de drie gedeelde formules (`50cqw` ×2, `35.5681cqw` ×2) | — | **C** | `G17`. Zes van de negen hoogtes delen hun formule in drie paren — dat is een compositiekeuze van één pagina |
| **CAN-08** | leegtebudget `(boven + onder) ÷ sectiehoogte` | **16,8 – 23,3%** | **B** | `G20`, 7 van 9 secties; de twee uitzonderingen zijn 7,2% (podium) en 39,0% (paneel met eigen padding). In DOCUMENT MODE **N.V.T.-met-reden**: daar is de hoogte inhoudsgestuurd, dus is leegte geen budget maar een uitkomst |

**Waarom CAN-04 een band is en geen plafond.** `kritiek-ontduiking.md §5` fout S1: *"Plafonds zonder vloeren. Een pagina die niets doet overtreedt geen plafond."* SYSTEEM-X verslaat de master op `P-14` met 1,00 tegen 1,54. Een plafond alleen belonen betekent: hoe uniformer, hoe beter. CAN-04 plus CAN-05 draaien dat om.

### 1.2.4 Proportionele beeldmaten

| # | regel | waarde | klasse | gemeten anker |
|---|---|---|---|---|
| **MED-01** | de breedte van een beeld staat in een canvas-proportionele eenheid | invariantie ≤ **0,5 procentpunt** tussen 1440 en 1774 | **A** | de toets vergelijkt twee breedtes van **hetzelfde** element en is daarmee ongevoelig voor de definitie van "beeld". Master: alles in cqw → drift 0. B2: beelden in px in een 1240-doos → drift gelijk aan de 16,2 procentpunt van §1.1.2 |
| **MED-02** | doelbereiken per behandeling | M1 **100% vw** · M2 **96–100%** · M3 **40–62%** · M4 **50–56%** · M5 **16,5–27,5%** · M6 **52,7% / 19,7%** | **B** | `vibe-image-system-v1.md §6`. Het document is daar zelf eerlijk over: *"Eén meetpunt: 53,9% vw. De band 50–56% vw is om die meting heen gelegd met ±2 punten en is dus **niet onafhankelijk gemeten**"* |
| **MED-03** | een CANVAS-sectie draagt **≥ 1 beeld ≥ 40% vw** óf een gebouwd object (M0) | ja/nee | **A** | de 40%-ondergrens is de gemeten onderkant van M3 (41,4%, `image-system §6-C`: *"Niet gebruiken onder 40% vw"*). De **óf**-tak is noodzakelijk: `BEWIJS-assets.md §4` meet **9 klasse-A-beelden op 27 verschillende opnamen voor 48 pagina's**, dus gemiddeld minder dan één sterk beeld per pagina |
| **MED-04** | beelddekking van de pagina | — | **C** | 43,7% beschrijft Master v1 op 1774px. Zelfde pagina: **23,9% @1199 · 22,8% @768 · 17,2% @390** (`image-system §12`). Zie §1.4.1 |
| **MED-05** | de dertien beeldbreedtes 100 · 96,1 · 62,0 · 53,9 · 52,7 · 41,4 · 27,5 · 19,7% vw e.d. | — | **C** | `grammar §1.2` |

**Eerlijkheid over MED-01 en MED-03.** Beide leunen op "wat een beeld is". `kritiek-ontduiking.md §2` meet dat een uitgerekte volledig transparante 1×1 GIF in beide harnassen als beeld telt, omdat de definitie `backgroundImage.includes('url(')` is. **MED-01 en MED-03 zijn forgeerbaar zolang DR-V-40 openstaat.** Dit hoofdstuk sluit dat gat niet en doet ook niet alsof.

### 1.2.5 Proportionele vlakmaten

| # | regel | waarde | klasse | gemeten anker |
|---|---|---|---|---|
| **V1** | een informatievlak dat op een beeld ligt, is in een canvas-proportionele eenheid gemaat; zijn **oppervlakaandeel van het sectievlak** drift ≤ **0,5 procentpunt** tussen 1440 en 1774 | **A** | zelfde argument als MED-01: vergelijkt hetzelfde element met zichzelf |
| **V2** | minimumoppervlak van een informatievlak | **≥ 2,5% van het sectievlak** | **A, grens dun** | nagerekend uit `gate P-04`: `vh-proc-kaart` 338×254 op 1774×624 = **7,76%** · `vh-final-kaart` 305×272 op 1774×631 = **7,41%** · `vh-proof-strip` 629×124 op 1774×887 = **4,96%** · `vh-infra-kaart` 422×126 op 1774×887 = **3,38%**. Master-minimum **3,38%**; het schijnvlak van SYSTEEM-X (200×160 op 1774×780,6) meet **2,31%**. 2,5% laat de master door met 0,88 procentpunt en houdt het schijnvlak tegen met 0,19 procentpunt |
| **V3** | `P-04`'s absolute maat 150 × 80px | — | **C, en zwak** | 12.000px² is **2,5× zwakker** dan de 30.000px² van `V-5` in het beeldsysteem (`kritiek-overfitting.md §6.1`). V2 vervangt hem door een **aandeel**, zodat de grens op elke sectiehoogte hetzelfde betekent |
| **V4** | de vier vlakmaten 338×254 · 629×124 · 422×126 · 305×272 | — | **C** | `gate P-04` |

**V2 is niet genoeg, en dat moet hier staan.** Het werkelijke gebrek van het schijnvlak is niet zijn maat maar zijn dekking: `background: rgba(255,255,255,.01)`. Een oppervlakvloer vangt dat niet. Alleen een alfa- of contrastdefinitie van "vlak" doet dat → **DR-V-41** en **DR-V-47**, beide open, beide buiten dit hoofdstuk. **Wie V2 als gesloten gat leest, leest verkeerd.**

### 1.2.6 Proportionele geometrie

| # | regel | waarde | klasse | gemeten anker |
|---|---|---|---|---|
| **GEO-01** | een polygoon dat een merkhoek draagt, staat in **procenten**, op een doos waarvan de verhouding binnen de desktopband vast is | ja/nee | **A** | Z12: 13 declaraties, alle coördinaten in procenten, **nul in px**; sectiehoogte in cqw + `width:100%` = een vaste verhouding |
| **GEO-02** | hoekdrift tussen 1440 en 1774 | **≤ 0,3°** | **A** | Master: drift 0 (procentpolygoon op proportionele doos). Nagerekend voor een px-vaste doos met de S7-snede van 9,7°: **7,9° @1440**, **13,9° @2560**; binnen de flauwe band 9–14° van `P-12` alleen tussen **1644 en 2588px** |
| **GEO-03** | hoekfamilies | scherp **27–37°**, flauw **9–14°**, max 1 benoemde uitzondering per pagina | **A** | `P-12`, ongewijzigd. Master: 13 in familie + 1 uitzondering (25,0°, benoemd als fotovervanger in `home-solutions.css:303-305`) → PASS |
| **GEO-04** | dichtheid en spreiding | geometrie in ≥60% van de secties **én** ≥4 unieke hoekwaarden | **A, maar gewogen** | `P-13`. Ongewogen is de regel afgevinkt met vier nikjes van 3×5px: **30px² weggesneden op 809.600px² = 0,0037%** van het beeld, vier "unieke" waarden binnen 1,5° (`kritiek-ontduiking.md §2`). Weging: masker snijdt **≥5%** van de beeldrechthoek weg, element **≥0,5%** van het sectievlak (`DR-V-42`, daar geijkt op master 6% en 0,72%). **Die ijking heb ik niet opnieuw gedraaid — NIET GEMETEN** |
| **GEO-05** | de veertien hoekwaarden 9,7 · 13,0 · 25,0 · 27,3 · 28,1 · 31,6 · 32,1 · 32,6 · 32,7 · 32,8 · 33,7 · 34,4 · 35,4 · 36,2° | — | **C** | `grammar §0.4`, `P-12` |

### 1.2.7 Begrensde typografieschaling

| # | regel | waarde | klasse | gemeten anker |
|---|---|---|---|---|
| **T1** | elke typerol draagt een **vloer én een plafond** | ja/nee | **A** | Master v1: nul plafonds, twee vloeren die alleen binden onder 1203,8px respectievelijk 1496,8px → **FAIL**. B2-kandidaat: negen plafonds die alle binden onder 1682px → **FAIL** op T3. Beide gemeten pagina's zakken, in tegengestelde richting |
| **T2** | desktopvloer per rol = de gemeten **tabletwaarde** van dezelfde rol | h1 **≥ 58px** · h2 **≥ 42px** · lead **≥ 18px** · body/label **≥ 16,5px** | **A** | `home-mobile.css:38-43`: `--m-h1: clamp(46px,6.4vw,58px)` (plafond 58px, bereikt op `58 ÷ 0,064 = 906px`, dus 58px in de hele band 906–1199) · `--m-h2: clamp(34px,4.6vw,42px)` (42px vanaf 913px) · `--m-lead:18px` · `--m-body:16.5px`. Gemeten tabletgraden @1024 en @1199: **58 / 42 / 52px** (`G21`). **Argument: een desktopgraad onder de tabletgraad is per definitie fout — het scherm is groter.** Master: h1 76,5 ✔, kleinste h2 53 ✔. B2: h1 62 ✔, kleinste h2 **32** ✘ → **FAIL**, en dat is de gemeten verklaring van "oogt getemplatet" |
| **T3** | het plafond van de koprollen bindt niet vóór | **2000px** | **A** | reparatie van §1.1.2. Uitgewerkt voorbeeld dat de mastermaat exact reproduceert: `clamp(58px, 4.31cqw, 88px)` geeft 58px @1200 (vloer bindt), **76,5px @1774** (= de gemeten `.vh-h1`) en plafond vanaf `88 ÷ 0,0431 = 2042px`. Idem voor een h2 van 61px: `clamp(42px, 3.44cqw, 70px)`, plafond vanaf **2035px** |
| **T4** | ten hoogste **3 van de 9** typerollen mag een plafond hebben dat vóór 1800px bindt | **A** | B2: **9 van 9** binden vóór 1682px → FAIL. Master: 0 van 9 heeft een plafond → FAIL op T1, PASS op T4. De twee halve regels samen vormen de band |
| **T5** | kopgraden per pagina: unieke graden ÷ koppen ≥ **0,85**, geen graad vaker dan **2×** | **A** | `P-08` (i) en (iii), ongewijzigd. Master 8/8 = 1,00 en max 1× → PASS. B2 6/10 = 0,60, 44px **4×** → FAIL |
| **T6** | `max h2 ÷ min h2` | **band 1,20 – 1,35** | **A, geijkt op 3 gevallen** | `P-08`(ii) was een plafond zonder vloer. Nagerekend: Master `66 ÷ 53 = 1,245` **PASS** · B2 `60 ÷ 32 = 1,875` **FAIL** (plafond) · SYSTEEM-X `51 ÷ 44 = 1,159` **FAIL** (vloer; de 1px-trap 44·45·46·47·48·49·50·51 haalde `P-08` wél). Vloer uit `DR-V-43`. Derde échte pagina **NIET GEIJKT** |
| **T7** | schaalvrije verhoudingen | kop : eyebrow **≥ 3,21** · kop : lead **≥ 2,65** | **A** | `G21`, gemeten banden 3,21–4,66 en 2,65–3,54. Deze twee zijn eenheidsloos en overleven dus elke modus- en breedtewissel — ze zijn de enige typografieregels in dit hoofdstuk die geen px kennen |
| **T8** | de acht kopgraden 53 · 54 · 58,3 · 61 · 61,5 · 64 · 66 · 76,5px | — | **C** | `G21`. Zie §1.4.1 voor de volledige redenering waarom 53px géén vloer wordt |
| **T9** | handgezette regelval ≥60% van de koppen (`P-15`) | — | **C, en als poort ongeldig** | Master 7 van 8 = 87,5%; SYSTEEM-X haalt **100%** met een `<br>` achter het laatste woord van elke kop, zonder één zichtbare regelval. De poort telt DOM-knopen, niet regels. Een geldige vorm vraagt een **gerenderde** regeltelling → **DR-C-25**; tot dan is `P-15` een B REFERENTIEBEREIK, geen poort |

### 1.2.8 Onder- en bovengrens voor leesbaarheid

| # | regel | waarde | klasse | gemeten anker |
|---|---|---|---|---|
| **L1** | regellengte van lopende tekst op desktop | **46 – 62 ch** | **A, geijkt op de repository** | de vier desktopcaps die in deze repository bestaan (Z11): **46ch** (`vibe-storage.css:51`), **58ch** (`vibe-system.css:184`), **62ch** (`:188`), plus **30ch** voor een bijschrift (`vibe-storage.css:412`). De homepage heeft op desktop **nul** caps (Z4) en begrenst de regel dus via de kolombreedte |
| **L2** | uitzondering onder L1 | **≤ 30ch** voor een bijschrift of label van **≤ 2 regels** | **A** | `vibe-storage.css:412` (`min(30ch,74%)`); plus het gewichtsmiddel `15ch` op een cijferregel (`home-hero.css:530`, motivering in `brandbook §5.4`: drie kolommen van gelijk gewicht) |
| **L3** | de elf homepagecaps 34 · 34 · 34 · 36 · 36 · 36 · 36 · 38 · 38 · 52 · 52 ch | — | **C** | Z4 — en met een belangrijke nuance: **alle elf staan onder 1200px.** Het zijn tablet- en mobielwaarden en ze mogen dus niet als desktopband worden gelezen. De tabletband 52ch is de bovenkant daarvan en ligt onder de desktopband van L1, wat de juiste richting is: smaller scherm, kortere regel |
| **L4** | breedte van een DOCUMENT-kolom als aandeel van de viewport | **26,5 – 40,9% vw** | **B** | de gemeten uiterste **tekstkolommen** van Master v1: 470px = 26,5% vw (S3, het smalste) en 726px = 40,9% vw (S5, het breedste, `image-system`: *"de breedste inhoudsbreedte van de pagina"*). Beide randen zijn losse metingen op één pagina, daarom B en geen A |
| **L5** | de DOCUMENT-kolom staat **niet gecentreerd**: lichtste zijde ≤ **47,5%** | **A** | `P-10`, ongewijzigd toegepast op de splitsing kolom ↔ rest. Nagerekend: een kolom van 620px in 1774 geeft een lichtste zijde van **34,9%** → PASS; dezelfde kolom gecentreerd geeft twee gelijke zijden en leest als een gecentreerd tekstblok. Zie §1.3.5 middel D3 |
| **L6** | minimumgraad lopende tekst / label op desktop | **18px / 16,5px** | **A** | identiek aan T2; de gemeten tabletwaarden `--m-lead:18px` en `--m-body:16.5px` |
| **L7** | maximumgraad lopende tekst op desktop | **≤ 24px**, plafond bindend vanaf ±2100px | **A, voorstel** | afgeleid: de gemeten masterbody is **20px** op 1774 = **1,13% vw**; `clamp(18px, 1.13cqw, 24px)` geeft 18px @1200 (vloer), 20,0px @1774 (= de meting) en plafond vanaf `24 ÷ 0,0113 = 2124px`. Het getal 24 is een **keuze**, niet een meting → **DR-C-26** |

**Niet gemeten en dus geen poort: de ch→px-factor.** Een `ch` is de breedte van de "0" in de gebruikte letter. Voor Urbanist is die factor in deze sessie **NIET GEMETEN** (reden: geen browser gedraaid, geen screenshots toegestaan). L1 en L4 kunnen daarom nog niet tegen elkaar worden geijkt: of 62ch bij een lead van 20px binnen de band van L4 valt, is een **rekening die in de browser moet worden gedraaid** vóór L1 een poort wordt. Tot dat moment is L1 een **A-vloer op de declaratie** (staat er een cap tussen 46 en 62ch? ja/nee) en géén vloer op de gerenderde breedte.

### 1.2.9 Het canvas in één tabel

| grootheid | CANVAS MODE | DOCUMENT MODE | HYBRID MODE |
|---|---|---|---|
| werkbreedte | ≥80% vw (W1), doel 88–94% (W2) | kolom 26,5–40,9% vw (L4), niet gecentreerd (L5) | kolom als DOCUMENT, podium als CANVAS |
| goot | proportioneel (G1), 3,9–5,0cqw (G2) | idem | idem |
| sectiehoogte | proportioneel (CAN-01), band 1,25–2,00 (CAN-04), ≥25% vw (CAN-06) | inhoudsgestuurd (CAN-02), **geen** spreidingsplafond | `max(podium, kolom)` (CAN-03) |
| beeldbreedte | ≥1 beeld ≥40% vw of M0 (MED-03) | geen beeldeis; een beeld is toegestaan maar draagt niets af | ≥1 beeld ≥40% vw of M0 in het podium |
| informatievlak | ≥2,5% sectievlak (V2), proportioneel (V1) | N.V.T. als eis; toegestaan als middel | als CANVAS, in het podium |
| geometrie | procentpolygoon (GEO-01), drift ≤0,3° (GEO-02), familie (GEO-03) | ten hoogste één gebaar, familie (GEO-03) | als CANVAS, in het podium |
| type | T1–T8 | T1–T8 plus L1, L6, L7 | T1–T8 plus L1 in de kolom |
| eenheidstoets C-01 | PASS verplicht | **N.V.T.-met-reden** (M-D3) | PASS verplicht voor het podium |

---

## 1.3 · DE DRIE MODI

### 1.3.1 Definities

| modus | definitie | wat de maat bepaalt |
|---|---|---|
| **CANVAS MODE** | de sectie is een **podium**: zijn hoogte en zijn inhoud zijn uitgedrukt als aandeel van het canvas, en de compositie is pas af als zij het hele canvas gebruikt | het scherm |
| **DOCUMENT MODE** | de sectie is een **register of een leeskolom**: de regellengte is begrensd, de hoogte volgt de inhoud, en de rest van het canvas is ontworpen leegte met een eigen gewicht | de inhoud, binnen een begrensde regel |
| **HYBRID MODE** | de sectie draagt **twee zones**: een redactionele kolom die de DOCUMENT-regels volgt en een ontworpen visueel podium dat de CANVAS-regels volgt; de sectiehoogte is het maximum van de twee | de inhoud links, het scherm rechts (of omgekeerd) |

### 1.3.2 Hoe je ziet in welke modus een sectie staat

De modus is **niet** zelfgerapporteerd. `kritiek-ontduiking.md §5` fout S5: *"Het ontwerp zit in de laag die niemand meet. De kaart, de M/K/CB/B-codes, de blauwdrukken, de impactniveaus: alles wat V1.2 inhoudelijk ís, is zelfgerapporteerd."* De modus wordt daarom **afgeleid uit twee gerenderde breedtes**, 1440 en 1774. Drie waarnemingen per modus, elk een ja/nee:

| waarneming | CANVAS | DOCUMENT | HYBRID |
|---|---|---|---|
| **O1** · schaalt de sectiehoogte mee? `h@1440 ÷ h@1774` vergeleken met 0,8117 | **ja**, binnen 0,5 procentpunt | **nee**: de hoogte wijzigt **≤ 2%** terwijl de viewport 23% krimpt | **ja** voor het podium, **nee** voor de kolom |
| **O2** · raakt een element een schermrand? (`left ≤ 1,5px` of `right ≥ W − 1,5px`) | **ja**, ≥1 element, en ≥1 daarvan is een beeld of een gemaskerd vlak | **nee**, op de sectiegrond na | **ja**, precies in één van de twee zones |
| **O3** · draagt elk lopend-tekstelement een regellengtecap in `ch`? | niet vereist | **ja**, 46–62ch (L1) of ≤30ch (L2) | **ja** in de kolom, niet vereist in het podium |

**Modusbepaling:** O1 + O2 + O3 geven per sectie één van de drie modi. Geven zij geen eenduidige uitkomst — bijvoorbeeld: hoogte schaalt mee **en** geen enkel element raakt een rand **en** geen cap — dan is de sectie **MODUSLOOS** en dat is **FAIL**, niet N.V.T. Een modusloze sectie is precies de toestand die het aanvaarde bewijs bij de B2-kandidaat meet: beelden náást tekst in een rastercel, 0 informatievlakken op een beeld, 4 van 11 secties zonder één overlappaar.

### 1.3.3 Verplicht en verboden per modus

| | **verplicht wanneer** | **verboden wanneer** |
|---|---|---|
| **CANVAS** | de sectie draagt een **hero**, **projectbewijs**, **productvisualisatie** of de **slot-CTA** (opdrachtgeversbesluit) | de sectie draagt lopende tekst waarvan de lengte per pagina varieert. Gemeten reden: inhoudsspreiding **25,5** tegen een canvasbudget van 2,13 (`kritiek-overfitting.md §3.2`) · óf de sectie draagt een register van **>6 gelijkvormige items**: `B02` topt op 6 en `projecten.html` heeft **11** (`kritiek-overfitting.md §3.7`) |
| **DOCUMENT** | de sectie draagt een **FAQ**, **juridische tekst**, een **technisch register**, een **tabel** of **lange tekst** (opdrachtgeversbesluit). Harde ondergrens: vanaf **5 vraag-antwoordparen** of vanaf **1 antwoord van >32 woorden**. Gemeten: 13 pagina's met een `faq-item`-accordeon, **67 items**, langste antwoord **72 woorden**, grootste tekstvat in alle vijftien V1.2-blauwdrukken **32 woorden** → factor **2,25×** | de sectie opent de pagina als enige sectie boven de plooi **en** draagt het LCP-beeld. Reden: een leeskolom als opening levert geen ankerbeeld |
| **HYBRID** | de pagina heeft **meer** secties nodig die een beeld dragen dan er bruikbare beelden zijn. Gemeten: **9 klasse-A-beelden op 27 verschillende opnamen** voor **48 pagina's** (`BEWIJS-assets.md §4`), en 10 van 11 projecten hebben **1** foto | het podium is een klasse-C-beeld in M1, M2 of M4. Gemeten verbod: *"Een klasse-C-beeld in M1/M2/M4 verliest zijn onderwerp"* (`BEWIJS-assets.md §3`) |

### 1.3.4 Welke poortregels per modus gelden

Dit is de tabel die van V1.2 ontbrak en waardoor 23 van de 48 pagina's niet meetbaar waren en de juridische pagina op vijf onafhankelijke blokkades vastliep. Elke `N.V.T.` draagt een reden met een getal.

| poort | CANVAS | DOCUMENT | HYBRID |
|---|---|---|---|
| **C-01 / P-01 / P-02** schaalfactor en spreiding | **PASS verplicht** | **N.V.T.** — M-D3: de hoogte is inhoudsgestuurd, dus de factor meet de inhoud en niet de compositie | PASS verplicht, **alleen over de podiumzones** |
| **P-03 / G23** overlap ≥1 per sectie, mediaan ≥15 | PASS verplicht, **gewogen** (het overlappende vlak ≥2,5% sectievlak, V2) | **N.V.T.** — M-D4: 13 tekstkolommen van `algemene-voorwaarden.html` hebben er 0, en er is geen inhoudelijke reden een artikel over eigendomsvoorbehoud over een foto te leggen. **Vervangen door P-03D** (§1.3.5 middel D5) | PASS verplicht in het podium |
| **P-04** informatievlak op een beeld, ≥3 secties | PASS verplicht | **N.V.T.** — M-D5: er is geen beeld vereist | de podiumzones tellen mee voor de drempel van 3 |
| **P-05** beeldschaal (≥1 ≥90% vw, ≥3 ≥50% vw) | **vervangen door MED-03** (≥1 beeld ≥40% vw óf M0, per sectie). Reden: **39 van 48 pagina's kunnen P-05 niet halen, ongeacht het ontwerp** (`kritiek-overfitting.md §3.1`) | **N.V.T.** — M-D5 | MED-03 per podium |
| **P-06** maskers ≥50% van de beeldsecties | PASS verplicht; noemer nul → **FAIL**, niet PASS | **N.V.T.** — M-D5 | PASS verplicht over de podia |
| **P-07 / W6** inhoudskaders | PASS verplicht met de 1,0%-weging | PASS verplicht: twee DOCUMENT-secties met dezelfde kolombreedte zijn **één** kader | PASS verplicht |
| **P-08 / T5 / T6** kopgraden | PASS verplicht, **als band** (T6: 1,20–1,35) | PASS verplicht | PASS verplicht |
| **P-09** gelijke kaartrasters | PASS verplicht | **N.V.T.** — M-D6: een register **is** een gelijke rij; dat is zijn vorm, niet zijn fout. Vervangen door D4 | PASS verplicht in het podium |
| **P-10 / L5** lichtste zijde ≤47,5% | PASS verplicht; **lege lijst = FAIL** (de meting moet mechanisme-onafhankelijk zijn: de twee breedste niet-overlappende kinderen, niet `display:grid`) | **PASS verplicht** op de splitsing kolom ↔ rest (L5) | PASS verplicht op de splitsing kolom ↔ podium |
| **P-11** randcontact | PASS verplicht; een randraker moet ≥2,5% van het sectievlak beslaan (anders vinkt een stip van 3×3px de poort af) | **N.V.T.** — M-D2: O2 eist juist dat **niets** de rand raakt | PASS verplicht voor de podiumzone |
| **P-12** hoekfamilie | PASS verplicht (GEO-03) | PASS verplicht als er een gebaar is; **geen gebaar = N.V.T.**, nooit PASS-op-leeg | PASS verplicht |
| **P-13 / GEO-04** geometriedichtheid | PASS verplicht, **gewogen** (GEO-04) | **N.V.T.** — M-D7: ten hoogste één gebaar per DOCUMENT-sectie; 60% dichtheid is daar betekenisloos | ≥60% gerekend over de **podia**, niet over alle secties |
| **P-14 / CAN-04 / CAN-05 / CAN-06** hoogtes | PASS verplicht (band + dominantie + 25% vw) | **N.V.T.** voor de band — M-D1: gemeten inhoudsspreiding **25,5**. CAN-06 (≥25% vw) blijft **wél** gelden | band over de podia; CAN-06 over alle secties |
| **P-15 / T9** handgezette regelval | **B REFERENTIEBEREIK**, geen poort, tot DR-C-25 is beslist | idem | idem |
| **P-16 / W1** tekstspan | PASS verplicht (≥80% vw) | **N.V.T.** — M-D8: vervangen door L1, L4 en L5. Een begrensde leeskolom haalt 80% vw per definitie niet | ≥80% vw gerekend over de **volle sectie** (kolom + podium), niet over de kolom |

**Twee regels over deze tabel.**
1. **Geen enkele `N.V.T.` is een vrijstelling.** Elke `N.V.T.` draagt een vervangende eis (D1–D6, MED-03, P-03D, L1, L4, L5) of een gemeten reden waarom er niets te toetsen is. Een sectie die in geen enkele kolom een PASS haalt, is **MODUSLOOS** = FAIL (§1.3.2).
2. **De noemer wordt uit de DOM afgeleid, niet uit `data-screen-label`.** Gemeten: `[data-screen-label]` staat op **25 van 48** pagina's; op de overige 23 geeft het harnas `mediaan([]) = undefined` en NaN op vier poorten. Zolang de noemer uit een attribuut komt, is de helft van de site onmeetbaar → **DR-V-49**, hier onderschreven.

### 1.3.5 DOCUMENT MODE is een ontworpen modus — zes middelen

DOCUMENT MODE is niet "de secties die CANVAS niet halen". Hij heeft eigen middelen, elk met een getal.

| # | middel | maat | klasse |
|---|---|---|---|
| **D1** | **De begrensde regel staat op het tekstelement, nooit op de sectiedoos.** De sectiedoos blijft 100% breed en proportioneel | regellengte 46–62ch (L1); sectiedoos zonder px-plafond (W5) | **A** |
| **D2** | **De kolom staat uit het midden.** De sectie houdt daarmee de asymmetrie die een gecentreerd tekstblok verliest | lichtste zijde ≤47,5% (L5); nagerekend 620px in 1774 → **34,9%** | **A** |
| **D3** | **Het verticale ritme blijft proportioneel met het scherm**, ook al groeit de kolom niet mee. De pagina blijft dus ademen | `clamp(84px, 6vw, 112px)` — de bestaande, gemeten desktopwaarde van deze repository (`vibe-system.css:108`); 6vw bindt op **1867px** | **A**, waarde **B** |
| **D4** | **Een register draagt één doorlopende drager** — één verticale lijn of één doorlopende grond over alle items — in plaats van een rij losse kaarten | de drager loopt over **≥60%** van de sectiehoogte. Gemeten precedent: `.vh-proc` draagt een doorlopende `::before`-lijn van 2px op `left:17px` in de mobiele tijdlijn (`brandbook §5.3`) | **A**, drempel **TE IJKEN** |
| **D5** | **P-03D — diepte zonder overlap.** Een DOCUMENT-sectie bewijst diepte met **minstens één** van: (a) een grondtrede van ≥4 digits per kanaal, (b) een doorlopende drager over ≥60% van de hoogte, (c) een vlak met eigen oppervlak ≥2,5% van het sectievlak. **Nul van de drie = FAIL** | de tredebanden komen uit `G18`: 6 van 8 naden ≤4 digits, maximaal 2 zichtbare treden per pagina van elk ≤13 digits | **A** |
| **D6** | **De hoogtespreiding is vrij.** Er is geen plafond op `max ÷ min` over DOCUMENT-secties | gemeten noodzaak: **25,5** (`algemene-voorwaarden.html`, 13 hoofdstukken, 62–1581 woorden) en **4,1** (`privacy.html`, 10 hoofdstukken, 19–78 woorden) tegen een canvasbudget van **2,13** | **A** |

Daarmee zijn de vijf gemeten blokkades op lange juridische tekst (`kritiek-overfitting.md §3.2`) afgedekt: het vat (D1), de spreiding (D6), de noemer (§1.3.4 regel 2), de overlap (D5) en de beeldeis (M-D5). De zesde, de tabel (`§3.3`), krijgt met D4 een drager; dat de **inhoud** van een tabel of een FAQ een eigen blauwdruk nodig heeft (**DR-V-30**, B16 REGISTER) blijft open en staat buiten dit hoofdstuk.

### 1.3.6 Toegestane modusverdeling per archetype

Paginatellingen uit `vibe-page-archetypes-v1.md §1.2` (43 pagina's, 7 webtypes + S2); ritmepatronen en omvang uit `§4.1a`.

| archetype | pagina's | omvang | **CANVAS** | **DOCUMENT** | **HYBRID** | gemeten grond voor de verdeling |
|---|---:|---|---:|---:|---:|---|
| **B1 · Startpagina** | 1 | 9 secties | **9** | 0 | 0 | Dit **is** Master v1, gemeten: 9 van 9 secties in cqw, 0 van 9 met nul overlap. Wordt niet herbouwd (`1A.11` punt 3). **B1 is de enige pagina van de site met één modus — zie §1.3.7** |
| **B2 · Propositiepagina** | 17 | 10–12, exact 3 HIGH | **3 – 5** | **2 – 4**, minimaal 1 | **3 – 5** | DOCUMENT is **verplicht** ≥1: 4 van de 5 papieren B2-pagina's dragen een FAQ van 5 paren en 3 daarvan ook een `FAQPage`-schema. HYBRID vult het beeldtekort: de vijf papieren pagina's hadden **17 van 28 beeldslots leeg** |
| **B3 · Casepagina** | 11 | 8–10, 2–3 HIGH | **2 – 3** | **1 – 2** | **3 – 5** | **10 van de 11 projecten hebben precies 1 foto** (`assets/projects/`; Hedin Alkmaar heeft 5). V1.2's B3-rij vroeg **≥11 verschillende foto's per casepagina** → tekort 10. CANVAS mag dus ten hoogste één fotodragende sectie zijn; de rest is HYBRID met een niet-fotografisch podium |
| **B4 · Indexpagina** | 1 | 5–7, 2 HIGH | **1 – 2** | **1 – 2**, minimaal 1 | **1 – 2** | de lijst zelf is DOCUMENT: `projecten.html` draagt **11** `data-sector`-kaarten tegen het B02-plafond van **6**. Een register van 11 items is geen podium |
| **B5 · Standpuntpagina** | 2 | 7–9, 2 HIGH | **2** | **2 – 3** | **2 – 3** | `waarom-vibe.html`: 5 hoofdstukken van **112–192 woorden**, spreiding **1,7** — de enige gemeten pagina die binnen het canvasbudget van 2,13 valt, en toch draagt zij lopende tekst. HYBRID is daar de natuurlijke modus |
| **B6 · Conversie-instrument** | 2 | 4–6, 1 HIGH | **0 – 1** | **2 – 4** | **1** | CANVAS als **opening verboden**: `§4.1a` zegt zelf *"de opening is geen beeldpodium maar kop-plus-lead, omdat `C1` een LCP-beeld inbrengt dat op een formulierpagina niets doet"*. Gemeten: `contact.html` 1 formulier, 5 velden, **10 woorden** lopende tekst, 3 beelden; `netcongestie-check.html` 2 velden, 1 beeld. Dit repareert de gemeten absurditeit dat de V1.2-selectietabel een B6-pagina voorschreef die **op ≥10 punten** door de eigen poort werd afgekeurd |
| **B7 · Juridisch document** | 2 | — | **0** | **1 – 3** | **0 – 1**, alleen de opening | CANVAS **verboden**, met de rekensom: hoofdstuk 4 van `algemene-voorwaarden.html` (1581 woorden) vraagt ±66 regels × 27,5px = **1815px** tekst; de canvasband topt die sectie op `1,6 × 443,5 = 709,6px` → **1105px overloop**. Omgekeerd: hoofdstuk 12 (81 woorden) in een sectie van 443,5px geeft **81,4% leegte** → `G20` FAIL. Beide kanten zakken, dus de modus klopt niet, niet de pagina. `§4.1a` liet B7 open omdat Master v1 geen juridische pagina bevat; dit is het ontbrekende antwoord |
| **S2 · Executive Guide** | 7 | — | **N.V.T.** | **N.V.T.** | **N.V.T.** | **N.V.T.-met-reden:** `report.css:29` rekent in `width:210mm` / `height:297mm`. Een gepagineerd A4-document heeft geen desktopcanvas en geen viewportaandeel; dit hoofdstuk is er niet op van toepassing. **Geen PASS, geen FAIL.** C-03: geen publiek webtype |

De twee verboden reeksen van `§4.1a` blijven gelden: `HIGH · HIGH · HIGH · HIGH` en vier GENERIEKE secties achter elkaar.

### 1.3.7 De modusbeweging als poort

Het aanvaarde bewijs zegt: *"Een pagina beweegt BEWUST tussen de modi."* Dat is toetsbaar te maken:

**A TRANSFERABLE FLOOR C-02 · MODUSBEWEGING.** Een pagina van **≥6 secties** draagt **≥2** verschillende modi, en geen enkele modus draagt **meer dan 70%** van de secties. Noemer = het aantal secties; nul → FAIL.

Reken het na op de gemeten gevallen:

| pagina | secties | modusverdeling | C-02 |
|---|---:|---|---|
| Master v1 (B1) | 9 | CANVAS 9 van 9 = **100%** | **FAIL** |
| B2-kandidaat | 11 | geen enkele sectie haalt O1 (schaalfactoren 0,8194–0,9574) en 4 van 11 hebben nul overlap → **MODUSLOOS** | **FAIL** |
| papieren pagina A (9 secties) | 9 | 9× CANVAS, want zij kopieert de masterverdeling: **9 van 9 inhoudskaders uit de masterset, 0 nieuw** | **FAIL** |

**Alle drie zakken, en dat is het punt.** Master v1 zakt op C-02 omdat zij één modus heeft — en dat is exact de gemeten oorzaak van de gezakte papiertest: vijf pagina's die een pagina met één modus kopieerden, leverden **36 inhoudskaders, 32 kopgraden, 22 tweedelingen en 36 overlapparenwaarden waarvan 0 nieuw**. Een pagina met één modus kan geen bron zijn voor 47 andere pagina's die twee of drie modi nodig hebben.

C-02 geldt daarom **niet** voor B1: `1A.11` punt 3 bevriest B1 en dit hoofdstuk refactort haar niet. Dat is geen uitzondering uit gemak maar een **benoemde**, eenmalige uitzondering met een bevroren besluit als grond. Voor **elke andere pagina** is C-02 een poort. → **DR-C-27** (is 70% het juiste plafond, of 60%?).

---

## 1.4 · VLOEREN TEGENOVER REFERENTIEBEREIKEN

### 1.4.1 De zes gevraagde redeneringen, uitgeschreven

#### (1) Werkbreedte 90,5% → **C**; de vloer is 80% (**A**); het bereik 88–94% (**B**)

Wat er gemeten is: mediaan tekstspan **1606px = 90,5% vw** op 1774, en **dezelfde 90,5%** op 1440 (aanvaard bewijs). De reeks is 26,5 · 70,1 · 84,0 · 89,8 · 90,5 · 90,8 · 91,3 · 91,3 · 94,2% — met twee uitersten die het document zelf verklaart: 26,5% is het paneel (G12) en 70,1% de slot-CTA.

Waarom het getal **C** is: het is de **mediaan van negen secties van één pagina**. De eigenschap die generaliseert is dat die mediaan op twee breedtes **gelijk** is; dat is de invariantie, en die wordt A (C-01, W5). Wie 90,5% tot vloer maakt, maakt DOCUMENT MODE onbouwbaar, want een begrensde leeskolom meet 26,5–40,9% vw — en 26,5% is de master zijn **eigen** smalste tekstkolom.

Waarom 80% de vloer is: `P-16` zet hem daar al, en hij scheidt de twee gemeten pagina's: de B2-kandidaat haalt als **maximum** 79,3% en als mediaan 60,9%. De scheiding is **0,7 procentpunt** — dun, en zo benoemd. Wie de vloer op 85% zet, keurt een pagina af die de kandidaat op 79,3% ruim verslaat zonder dat daarvoor een meting bestaat.

Waarom 88–94% een **B** is en geen A: er is één pagina gemeten. Zeven van negen secties ≥84% is een eigenschap van negen secties, niet van een systeem.

#### (2) Beelddekking 43,7% → **C**; er is geen overdraagbare dekkingsvloer

Drie metingen maken 43,7% onbruikbaar als regel:

1. **Dezelfde pagina meet 23,9% @1199, 22,8% @768 en 17,2% @390** (`image-system §12`). Een getal dat op de eigen pagina met factor 2,5 varieert over de breedtebanden, beschrijft een breedte, niet een ontwerp.
2. **39 van de 48 pagina's kunnen `P-05` niet halen, ongeacht het ontwerp** (`kritiek-overfitting.md §3.1`): 4 pagina's hebben 0 beelden, 17 hebben er 1, 18 hebben er 2. V-1's vloer van ≥35% is afgeleid als "80% van de homepagewaarde" en is daarmee een afgeleide van één pagina.
3. **De voorraad kan het niet leveren.** `BEWIJS-assets.md §4`: 36 bestanden, ongeveer **27 verschillende opnamen**, waarvan **9 klasse A** — gemiddeld minder dan één sterk beeld per pagina over 48 pagina's. Een dekkingsvloer die alleen met stock, gegenereerd beeld of plaatshouders te halen is, botst op `brandbook §4.4` en `1A.11` punt 5. `kritiek-overfitting.md §5.7` formuleert het scherp: *"Een harde minimumeis die alleen met verboden middelen te halen is, is een regel die om overtreding vraagt."*

Wat ervoor in de plaats komt: **MED-03** — een CANVAS-sectie draagt ≥1 beeld ≥40% vw **óf** een gebouwd object (M0). Dat is een **A**-vloer per sectie in plaats van een paginatotaal, en de M0-tak is noodzakelijk, want `BEWIJS-assets.md §4` concludeert zelf: *"niet-fotografische middelen moeten MEDIUM-secties zelfstandig kunnen dragen."* Daarmee vervalt ook het V1.2-plafond van **1 M0-sectie per pagina**, dat de vijf papieren pagina's met 5 · 6 · 6 · 7 · 6 fotoloze blokken tegen een maximum van 3 onbouwbaar maakte (`DR-V-32`, hier onderschreven).

De band 35–45% dekking blijft als **B REFERENTIEBEREIK**, uitsluitend voor een pagina die ≥3 klasse-A-beelden tot haar beschikking heeft.

#### (3) 454 overlapparen → **C**; de gewogen overlap per sectie is **A**

Wat er gemeten is: 158 · 64 · 42 · 19 · 57 · 19 · 50 · 43 · 2 = **454**, 0 van 9 secties met nul. Tegenover 52 (B2, 4 secties zonder).

Drie metingen die het getal diskwalificeren als regel:

1. **Dezelfde pagina meet 72 paren @1199** (−84%) en 73 @390. Het getal beschrijft één breedte.
2. **Het is afvinkbaar met onzichtbare elementen.** Zes absoluut geplaatste broers van 30×30px met `opacity:.06` binnen een vakje van 60×60 leveren `6 × 5 ÷ 2 = 15` paren; dat is exact de mediaandrempel van `P-03`, en SYSTEEM-X haalde er PASS mee in vijf secties (`kritiek-ontduiking.md §2`, T4).
3. **158 paren in de hero is geen kwaliteitsmaat maar een gevolg van de compositie**: vijf gestapelde absolute lagen in één podium (`brandbook §5.3`).

Wat ervoor in de plaats komt: per CANVAS-sectie **≥1 overlappaar waarvan het bovenliggende vlak een eigen oppervlak van ≥2,5% van het sectievlak heeft** (V2) en de overlap ≥8px op beide assen. Dus: **wegen, niet tellen** (`kritiek-ontduiking.md §5`, fout S2). De **mediaan ≥15** vervalt als poort en wordt **B**: hij meet aantal, niet diepte.

Eerlijkheid: **de masterwaarden onder de gewogen definitie zijn NIET GEMETEN.** `kritiek-ontduiking.md §7` noemt dit al "GRENS TE IJKEN". Zolang die ijking niet is gedraaid, is de gewogen overlapregel een **A-vorm met een ongeijkte drempel** — geen poort met een getal.

#### (4) Kopgraadvloer 53px → **C**; de vloer is 42px (**A**) en de banden zijn schaalvrij (**A**)

Wat er gemeten is: acht koppen, acht graden **53 · 54 · 58,3 · 61 · 61,5 · 64 · 66 · 76,5px**. 53px is de kleinste.

Waarom 53px **C** is:
- Het is de kleinste van acht waarden op **één** pagina op **één** breedte. Dezelfde acht koppen meten @1024/@1199 **58 / 42 / 52px** en @390 **35,5 / 28,5 / 33,5px** (`G21`). De graad is dus al in het eigen systeem een functie van de band.
- Als vloer verbiedt 53px een legitieme H2 op een DOCUMENT-pagina: `privacy.html` heeft **10 hoofdstukken van 19 tot 78 woorden**. Tien koppen van ≥53px op een pagina van 515 woorden is meer kop dan tekst.
- 53px = **2,99% vw**. Als percentage is de waarde bruikbaar, maar het percentage van één pagina is nog steeds één meting.

Wat ervoor in de plaats komt, in drie lagen:
1. **T2 — de desktopvloer is de gemeten tabletwaarde**: h1 ≥58px, h2 ≥42px, lead ≥18px, body ≥16,5px (`home-mobile.css:38-43`). Het argument is sluitend en vraagt geen nieuwe meting: **een desktopgraad onder de tabletgraad is fout omdat het scherm groter is.** Deze vloer bijt meteen: de B2-kandidaat heeft koppen van **32px** op desktop terwijl de tabletband van dezelfde site h2 op **42px** rendert → FAIL.
2. **T6 — een band in plaats van een plafond**: `max h2 ÷ min h2` in **1,20–1,35**. Nagerekend: master 1,245 PASS, B2 1,875 FAIL, SYSTEEM-X 1,159 FAIL. Dit is de enige van de drie lagen die de 1px-trap van de nep-pagina tegenhoudt.
3. **T7 — schaalvrije verhoudingen**: kop : eyebrow ≥3,21 en kop : lead ≥2,65. Deze twee kennen geen px en overleven elke modus- en breedtewissel.

#### (5) Sectiehoogtespreiding 1,54 → waarde **B**, band **A**

Wat er gemeten is: `908 ÷ 588 = 1,544`; zes van de negen hoogtes delen hun formule in drie paren; `G17` verbiedt >1,6× en `P-14` >2,0×.

Waarom 1,54 geen vloer en geen plafond mag zijn:
- Als **plafond** belonen het uniformiteit: SYSTEEM-X verslaat de master met **1,00**. `kritiek-ontduiking.md §5` fout S1.
- Als **vloer** sluit het de B2-kandidaat niet uit op de juiste grond: die meet 9,56 en zakt, maar ook zonder de 141px-strook nog 2,61.
- De waarde zelf verandert per band: @1024 meet dezelfde pagina **1,407** (contentgedreven) en @390 **1,721**.

Wat ervoor in de plaats komt: **CAN-04** band 1,25–2,00 **plus CAN-05** dominantie (≥1 sectie ≥45% vw én ≥1 ≤38% vw), beide gescopeerd op CANVAS-secties, beide **N.V.T.** in DOCUMENT MODE met de gemeten reden 25,5. Narekening van alle drie de gevallen staat in §1.2.3; CAN-05 is de enige vloer in dit hoofdstuk die SYSTEEM-X rechtstreeks afkeurt (alle negen secties op 44,0% vw → nul boven 45%, nul onder 38%).

#### (6) Schaalfactorafwijking 0,003% → **A als mechanismetoets**, nooit als kwaliteitsmaat

Wat er gemeten is: `5528 ÷ 6810 = 0,811747` tegen `1440 ÷ 1774 = 0,811725` → afwijking **0,003%**; sectiefactorspreiding **0,0015**. B2: 0,883751, afwijking **8,87%**, spreiding **0,138**.

Waarom het A is: het is het enige getal dat rechtstreeks aantoont dát een pagina als één compositie schaalt, en het is onafhankelijk van inhoud, beeldvoorraad en smaak. Het blijft daarom een **A TRANSFERABLE FLOOR** voor CANVAS-secties, met de tolerantie van `P-01` (1,0%) en `P-02` (0,0050).

Waarom het **geen kwaliteitsmaat** is: SYSTEEM-X scoort **0,000% en 0,0000** — beter dan de master — met negen identieke banden van `0,44 × vw`. Een pagina die niets doet, scoort perfect. Daarom:

> **C-03 · RANGREGEL.** `P-01` en `P-02` mogen **nooit** worden meegeteld bij de "scheidende" poorten en nooit in een eindtelling als bewijs van kwaliteit verschijnen. Zij toetsen één mechanisme: *schaalt deze compositie als één geheel?* Niets meer.

Dit is de reparatie van de scherpste bevinding van de ontduikingstoets. Gemeten: op **6 van de 14** scheidende poorten verslaat de nep-pagina de bron van waarheid. De lijst in `§3.1` noemt acht metingen — P-01, P-02, P-08(ii), P-11, P-12, P-14, P-15 en H-01 — en het verschil is precies verklaard: **H-01** is een herhalingstoets en geen poort, en **P-12** is een borg en geen scheidende poort. 8 − 2 = **6**. Van die zes zijn er in dit hoofdstuk vijf gerepareerd (P-08(ii) → T6 · P-11 → randraker ≥2,5% · P-14 → CAN-04+CAN-05 · P-15 → T9 als B · P-01/P-02 → C-03). De zesde, **P-12**, blijft een borg en is dat ook met GEO-02 (hoekdrift) nog.

### 1.4.2 De volledige classificatietabel

Alle numerieke V1.2-waarden die met canvas, breedte, hoogte of ritme te maken hebben.

| # | waarde | bron | klasse | motivering in één regel |
|---|---|---|---|---|
| 1 | schaalfactor **0,8117**, afwijking ≤1,0% | `P-01`, `G17` | **A** | mechanismetoets, inhoudsonafhankelijk; zie C-03 voor de rangregel |
| 2 | sectiefactorspreiding ≤**0,0050** | `P-02` | **A** | idem |
| 3 | afwijking **0,003%** van Master v1 | `P-01` | **C** | de prestatie van één pagina; SYSTEEM-X doet 0,000% |
| 4 | tekstspan-mediaan ≥**80% vw** | `P-16` | **A** | scheidt de twee gemeten pagina's met 0,7 procentpunt |
| 5 | tekstspan-mediaan **90,5% vw** | `P-16`, `G20` | **C** | mediaan van negen secties van één pagina |
| 6 | tekstspanreeks 26,5 … 94,2% vw | `G20` | **C** | negen losse metingen |
| 7 | tekstspan-doelbereik **88–94% vw** | afgeleid | **B** | om de mediaan heen gelegd; één pagina |
| 8 | tekstkolombreedtes 470 · 504 · 506 · 532 · 568 · 674 · 726px | `G19` | **C** | per-sectiematen; de uitersten worden B-band L4 |
| 9 | inhoudskaders 1740 · 1133 · 1704 · 1584 · 726 · 634 · 568 · 822 · 1605px | `P-07` | **C** | papiertest: 36 kaders op 5 pagina's, **0 nieuw** |
| 10 | unieke kaders ÷ secties ≥**0,70**, geen kader in >3 secties | `P-07` | **A** | blijft, met de weging van W6 |
| 11 | kaderverschil ≥**1,0% vw** | nieuw (W6) | **A, dun** | master-minimumgat 1,18%, stagger 0,68% |
| 12 | zijmarge ≥**1,5% vw** | nieuw (W3) | **A** | master-minimum 1,75% (31px) |
| 13 | linkermarges 3,9459 … 4,9929cqw (70–89px) | `brandbook §5.2` | **C** | gevolg van vier referentiecanvassen |
| 14 | goot-doelbereik **3,9–5,0cqw** | afgeleid | **B** | zes metingen op één pagina |
| 15 | goot `clamp(48px,4.6vw,80px)` | `vibe-system.css:107` | **B** | bestaande waarde van deze repo; plafond bindt op 1739px → G3 |
| 16 | sectiehoogtes 33,2 … 51,2cqw | `G17` | **C** | negen losse metingen |
| 17 | hoogtespreiding **1,544** | `G17` | **B** | de prestatie van één pagina, midden in band CAN-04 |
| 18 | hoogtespreiding ≤**1,6** | `G17` | **C, vervangen** | plafond zonder vloer; vervangen door CAN-04 |
| 19 | hoogtespreiding ≤**2,0** | `P-14` | **A** als plafond van band CAN-04 | blijft, maar alleen als bovenkant van een band |
| 20 | hoogtespreiding **band 1,25–2,00** | nieuw (CAN-04) | **A** | master 1,544 PASS · B2 9,56 FAIL · SYSTEEM-X 1,00 FAIL |
| 21 | dominantie ≥45% vw en ≤38% vw | nieuw (CAN-05) | **A** | SYSTEEM-X FAIL op beide helften |
| 22 | laagste sectie ≥**25% vw** | `P-14` | **A** | master 33,1%; B2-strook 7,9% FAIL |
| 23 | `height:auto` boven 1200px verboden | `G17` | **A, gescopeerd** | geldt in CANVAS MODE; in DOCUMENT MODE verplicht omgekeerd (CAN-02, D6) |
| 24 | leegtebudget **16,8–23,3%** | `G20` | **B** | 7 van 9 secties, twee benoemde uitzonderingen |
| 25 | leegte ≤**25%** van de sectiehoogte | `G20` | **C, vervangen** | levert op een hoofdstuk van 81 woorden 81,4% leegte → onbouwbaar |
| 26 | boven-/ondermarge 42–155px / 54–143px | `G20` | **C** | per-sectiematen |
| 27 | ritme eyebrow→kop **34px**, kop→lead **28px**, lead→CTA **34px** | `G20` | **C** als px | de **A**-vorm is: één proportionele ritmeset per pagina, niet drie px-waarden |
| 28 | `--section-y: clamp(84px,6vw,112px)` | `vibe-system.css:108` | **A**-vorm, **B**-waarde | bestaande gemeten desktopwaarde; plafond bindt op 1867px |
| 29 | beelddekking **43,7%** | `image-system §1` | **C** | zelfde pagina 23,9 / 22,8 / 17,2% op de andere banden |
| 30 | beelddekking ≥**35%** (V-1) | `image-system §10` | **C, vervangen** | 80% van één pagina-waarde; 39 van 48 pagina's onhaalbaar → MED-03 |
| 31 | ≥1 beeld ≥**90% vw**, ≥3 ≥**50% vw** | `P-05` | **C, vervangen** | rekenkundig onhaalbaar voor 39 van 48 pagina's → MED-03 |
| 32 | beeld ≥**40% vw** of M0 per CANVAS-sectie | nieuw (MED-03) | **A** | 40% is de gemeten onderkant van M3 (41,4%) |
| 33 | M-banden 100 / 96–100 / 40–62 / 50–56 / 16,5–27,5 / 52,7–19,7% vw | `image-system §6` | **B** | het document noemt de 50–56-band zelf "niet onafhankelijk gemeten" |
| 34 | beeldbreedte-invariantie ≤**0,5 procentpunt** | nieuw (MED-01) | **A** | vergelijkt hetzelfde element met zichzelf |
| 35 | informatievlak **150×80px** | `P-04` | **C, vervangen** | 2,5× zwakker dan V-5's 30.000px² → V2 |
| 36 | informatievlak ≥**2,5% sectievlak** | nieuw (V2) | **A, dun** | master-minimum 3,38%; schijnvlak 2,31% |
| 37 | vlakmaten 338×254 · 629×124 · 422×126 · 305×272 | `P-04` | **C** | vier losse metingen |
| 38 | ≥**3 secties** met een vlak op een beeld | `P-04` | **A** in CANVAS/HYBRID | blijft; noemer nul = FAIL |
| 39 | maskers ≥**50%** van de beeldsecties | `P-06` | **A** in CANVAS/HYBRID | blijft; lege noemer = FAIL, niet `0/0 ≥ .5 = false` als stil FAIL |
| 40 | hoeken **27–37°** / **9–14°** | `P-12` | **A** | borg, blijft |
| 41 | hoekdrift ≤**0,3°** | nieuw (GEO-02) | **A** | px-vaste doos: 7,9° @1440, 13,9° @2560 |
| 42 | de 14 hoekwaarden 9,7 … 36,2° | `P-12`, `G22` | **C** | de inventaris van één pagina |
| 43 | geometrie in ≥**60%** van de secties, ≥**4** unieke hoeken | `P-13` | **A, gewogen** | ongewogen af te vinken met 0,0037% weggesneden oppervlak |
| 44 | geometrie-minimum 5% masker / 0,5% sectievlak | `DR-V-42` | **A-vorm, TE IJKEN** | de ijking (6% / 0,72%) is door mij **NIET GEMETEN** |
| 45 | overlapparen **454** | `P-03`, `G23` | **C** | 72 @1199 op dezelfde pagina; af te vinken met zes onzichtbare broers |
| 46 | overlapparen-mediaan ≥**15** | `P-03` | **B** | telt aantal, niet diepte; SYSTEEM-X haalt exact 15 |
| 47 | elke sectie ≥**1** overlappaar | `P-03`, `G23` | **A** in CANVAS, **N.V.T.** in DOCUMENT | 13 tekstkolommen hebben 0; D5 vervangt |
| 48 | kopgraden 53 … 76,5px | `G21` | **C** | zie §1.4.1 (4) |
| 49 | kopgraadvloer **53px** | afgeleid uit `G21` | **C** | vervangen door T2 (42px, tabletafgeleid) |
| 50 | unieke graden ÷ koppen ≥**0,85**, geen graad >2× | `P-08` | **A** | blijft |
| 51 | `max h2 ÷ min h2` ≤**1,35** | `P-08`(ii) | **A** als plafond van band T6 | plafond zonder vloer; SYSTEEM-X haalt 1,159 |
| 52 | `max h2 ÷ min h2` **band 1,20–1,35** | nieuw (T6) | **A** | master 1,245 · B2 1,875 · SYSTEEM-X 1,159 |
| 53 | kop:eyebrow **3,21–4,66**, kop:lead **2,65–3,54** | `G21` | **A** als ondergrens, **B** als band | eenheidsloos, dus overdraagbaar |
| 54 | `lh ÷ graad` kop 0,951–1,132, lead 1,276–1,450, gat 1,132–1,276 leeg | `G21` | **B** | een gemeten gat is geen regel; het is een waarneming over één pagina |
| 55 | handgezette regelval ≥**60%** van de koppen | `P-15` | **B** | DOM-telling, 100% haalbaar zonder één zichtbare regelval |
| 56 | 28× `br{display:none}` onder 1200px | `brandbook §5.3` | **A** als mechaniek | `1A.6` punt 4, ongewijzigd |
| 57 | regellengtecaps **34–52ch** | Z4 | **C** | alle elf staan onder 1200px; tablet- en mobielwaarden |
| 58 | regellengte desktop **46–62ch** | Z11 | **A** op de declaratie | de drie desktopwaarden van deze repository; de gerenderde ijking is **NIET GEMETEN** |
| 59 | bijschriftcap ≤**30ch** | Z11 | **A** | `vibe-storage.css:412` |
| 60 | DOCUMENT-kolom **26,5–40,9% vw** | `G19`, `image-system` | **B** | de twee uiterste tekstkolommen van één pagina |
| 61 | lichtste zijde ≤**47,5%** | `P-10` | **A** | marge op de master is **0,3 procentpunt** (47,2%) — dun, en zo benoemd (`DR-V-71`) |
| 62 | lichtste zijde ≤**42%** | `G19` | **C, ongeldig** | de eigen S5 meet 48,6% én 47,2% in twee documenten; de master valt tussen de twee drempels |
| 63 | breekpunten **767 / 1199 / 1200** | `1A.6` punt 1 | **A** | ongewijzigd, bevroren |
| 64 | componentgrenzen **859 / 1000 / 1024** | `1A.6` punt 1 | **A** als patroon | ongewijzigd: één bestand, één component, reden met meting in het commentaar |
| 65 | typeplafond bindt niet vóór **2000px** (kop) / **1800px** (overig) | nieuw (T3, T4) | **A** | B2 bindt 9 van 9 vóór 1682px; de master heeft 0 plafonds |
| 66 | desktopgraadvloeren **58 / 42 / 18 / 16,5px** | `home-mobile.css:38-43` | **A** | gemeten tabletwaarden van dit systeem |
| 67 | 13 cqw-schaduwen, 2 overschreven, krimpfactor **4,5** | `brandbook §5.3` | **A** als verplichting | wie een canvas-eenheid gebruikt, dekt hem onder 1200px volledig af (DR-C-22) |
| 68 | modusbeweging: ≥2 modi, ≤70% per modus | nieuw (C-02) | **A** | master 100% CANVAS → FAIL; benoemde uitzondering voor B1 |

### 1.4.3 Wat er na deze classificatie van V1.2 overblijft

| categorie | aantal | welke |
|---|---:|---|
| **A TRANSFERABLE FLOOR** | **37** | 1 · 2 · 4 · 10 · 11 · 12 · 19 · 20 · 21 · 22 · 23 · 27(vorm) · 28(vorm) · 32 · 34 · 36 · 38 · 39 · 40 · 41 · 43 · 44(vorm) · 47 · 50 · 51 · 52 · 53 · 56 · 58 · 59 · 61 · 63 · 64 · 65 · 66 · 67 · 68 |
| **B REFERENTIEBEREIK** | **12** | 7 · 14 · 15 · 17 · 24 · 28(waarde) · 29(als band 35–45% voor beeldrijke pagina's) · 33 · 46 · 54 · 55 · 60 |
| **C HOMEPAGE-SPECIFIEK** | **23** | 22 genummerde waarden — 3 · 5 · 6 · 8 · 9 · 13 · 16 · 18 · 25 · 26 · 27(px) · 29 · 30 · 31 · 35 · 37 · 42 · 45 · 48 · 49 · 57 · 62 — plus de 780 cqw-waarden van Z2 als één blok |
| **vervangen** | **8** | 18 → CAN-04 · 25 → D6 · 30 → MED-03 · 31 → MED-03 · 35 → V2 · 49 → T2 · 55 → B · 62 → 61 |
| **TE IJKEN vóór het een poort is** | **5** | 11 (1,0% vw) · 36 (2,5%) · 44 (5% / 0,5%) · 58 (ch→px voor Urbanist) · de gewogen overlapdrempel van §1.4.1 (3) |

37 + 12 + 23 = 72 tegen 68 tabelrijen: **de rijen 27, 28 en 29 staan in twee kolommen**, omdat hun **vorm** A is en hun **waarde** B of C, en rij 51 staat in A uitsluitend als bovengrens van band T6. Dat verschil van vier is dus geen telfout maar de kern van dit hoofdstuk: een gemeten getal mag een regelvorm leveren zonder zelf de regel te zijn.

---

## 1.5 · TEGENSTRIJDIGHEDEN

Elke rij noemt het bestand en de paragraaf. Geen van deze rijen is een opdracht om nu iets te wijzigen.

| # | tegenstrijdigheid | bestand en paragraaf | wat dit hoofdstuk ermee doet |
|---|---|---|---|
| **CH1-01** | Het aanvaarde bewijs noemt voor de homepage **"0x position:absolute"**. Gemeten deze sessie: **73** treffers in `home*.css` (71 buiten `home-mobile.css`), per bestand 11 · 10 · 9 · 9 · 8 · 7 · 6 · 6 · 5 · 2 · 0. Dezelfde telmethode levert voor de B2-kandidaat **19** (3 + 16), exact het aanvaarde getal — dus de methode is identiek en het homepagegetal is een overschrijffout. `forensics-homepage.md §0.1` en `brandbook §5.3` beschrijven de absolute lagen ook uitdrukkelijk ("vijf gestapelde absolute lagen", "zeven absolute blokken") | taakbriefing AANVAARD BEWIJS, regel "In de bron"; tegen Z5/Z6 en `brandbook §5.3` | **Niet als regel overgenomen.** Zou "0x absolute" een vloer worden, dan is het middel waarmee de homepage vlakken ÓP beelden legt per definitie verboden en is CANVAS MODE onbouwbaar. Absolute plaatsing met **proportionele** offsets is in dit hoofdstuk toegestaan; het px-plafond is het probleem, niet `position` |
| **CH1-02** | Beelddekking van de B2-kandidaat: taakbriefing **20,2%**, `vibe-image-system-v1.md §1` tabel **19,2%** | taakbriefing tegen `image-system §1` | Geen van beide gebruikt als grens; de homepagewaarde 43,7% is in beide bronnen gelijk en wordt klasse **C** (§1.4.1 (2)) |
| **CH1-03** | cqw-treffers in de homepage: taakbriefing **768×**, gemeten deze sessie **782** (780 buiten `home-mobile.css`) | taakbriefing tegen Z2 | Geen gevolg: het aantal is in beide gevallen klasse **C**. De telmethode (substringtreffers met `grep -o`) staat in Z2 zodat het verschil naspeurbaar is |
| **CH1-04** | `1A.6` punt 2 verbiedt cqw buiten "bewust canvas-proportionele composities", maar laat de constructie **cqw binnen een px-grendel** open — gemeten op `vibe-system.css:350`, waar `min(100cqw, 1240px)` boven 1240px een constante is | `brandbook §1A.6` punt 2 tegen `vibe-system.css:350` | → **DR-C-21** |
| **CH1-05** | `G17` verbiedt `height:auto` boven 1200px; een juridische pagina met 13 hoofdstukken van 62–1581 woorden (spreiding 25,5) is daarmee onbouwbaar | `vibe-visual-grammar-v1.md G17` tegen `kritiek-overfitting.md §3.2` | `G17` wordt **gescopeerd op CANVAS MODE** → **DR-C-24**, H2, D6 |
| **CH1-06** | `G20` verklaart "een tekstspan onder 80% vw op desktop" NIET TOEGESTAAN en `P-16` eist een mediaan ≥80% vw; een begrensde leeskolom meet 26,5–40,9% vw — ook op de master zelf (S3 = 26,5%) | `grammar G20` en `gate P-16` tegen `G19`/`image-system` | In DOCUMENT MODE **N.V.T.-met-reden** (M-D8), vervangen door L1, L4, L5 |
| **CH1-07** | `P-03` eist elke sectie ≥1 overlappaar en een mediaan ≥15; `G23` verklaart nul overlap NIET TOEGESTAAN. Dertien tekstkolommen van `algemene-voorwaarden.html` hebben er 0 | `gate P-03`, `grammar G23` tegen `kritiek-overfitting.md §3.2` | In DOCUMENT MODE **N.V.T.-met-reden** (M-D4), vervangen door **P-03D** (D5) |
| **CH1-08** | `P-14` topt de hoogtespreiding op 2,0; de gemeten inhoudsspreiding van de echte juridische pagina is 25,5 | `gate P-14` tegen `kritiek-overfitting.md §1` bevinding 3 | In DOCUMENT MODE **N.V.T.-met-reden** (M-D1, D6); CAN-06 (≥25% vw) blijft wél gelden |
| **CH1-09** | Twee drempels voor dezelfde meting, met de master ertussen: `G19` zet de lichtste zijde op ≤42%, `P-10` op ≤47,5%, en S5 is gemeten als 47,2% (gate) én 48,6% (grammar) | `grammar G19` tegen `gate P-10` | `P-10` (47,5%) wordt gevolgd; `G19`'s 42% wordt klasse **C** en ongeldig als poort. De marge van 0,3 procentpunt op de master is benoemd (`DR-V-71`) |
| **CH1-10** | `1A.6` punt 1 staat componentgrenzen 859/1000/1024 alleen toe met een gemeten reden in het commentaar; V1.2 citeert consequent metingen @1024 als **tabletregel** (G01, G06, G07, G19, G24) en noemt de gemeten band **768–859px** nergens | `brandbook §1A.6` punt 1 en `§5.4` tegen `grammar §2` | Dit hoofdstuk citeert geen enkele @1024-meting als systeemregel. Het geldigheidsbereik is ≥1200px; alle vier de banden van `brandbook §5.4` blijven onverminderd geldig |
| **CH1-11** | `DR-C-01 t/m DR-C-11` zijn al uitgegeven in `vibe-section-compositions-v1.md §8`; de taakbriefing geeft `DR-C` als besluitprefix voor dit hoofdstuk | `vibe-section-compositions-v1.md §8`, gemeten deze sessie | Dit hoofdstuk nummert vanaf **DR-C-20** en claimt het blok 20–39. Zo wordt de T-4-fout (dubbel uitgegeven DR-V-20…29) niet herhaald |
| **CH1-12** | De vijf composities die `1A.4` punt 3 niet-abstraheerbaar verklaart, zijn in V1.2 herbruikbare blauwdrukken geworden (B01, B03, B05, B06, B10) | `brandbook §1A.4` punt 3 en `§2.1` tegen `vibe-section-blueprints-v1.md §6` | Dit hoofdstuk benoemt **nul** blauwdrukken en lost dit conflict niet op; het blijft staan voor het blauwdrukhoofdstuk. `1A.4` wint tot er werkelijk hergebruik in de repository staat (`1A.12` punt 4) |

---

## 1.6 · WAT IK NIET HEB GEMETEN

| onderwerp | reden |
|---|---|
| **Gerenderd gedrag op welke breedte dan ook** | Geen browser gedraaid, geen screenshots gemaakt (taakregel). Alle metingen zijn leesmetingen op de werkboom plus narekeningen. De getallen @1774/@1440/@1199 komen uit het aanvaarde bewijs en uit `forensics-homepage.md`, `vibe-visual-grammar-v1.md` en `vibe-design-quality-gate-v1.md` |
| **De band 1200–1439px** | Niet bemonsterd, en ook `grammar §5` noteert dat al: *"Tussen 1200 en 1439px is NIET GEMETEN."* Elke vloer in §1.2 is geijkt op 1774 en 1440; of een compositie **binnen** die band breekt, is onbekend |
| **Gedrag boven 1774px** | Niet bemonsterd. De plafondvoorstellen T3 (2000px), G3 (2000px) en L7 (2124px) zijn **rekenkundig** afgeleid uit de declaraties, niet uit een render. De 110px van `.vh-h1` op 2560px komt uit `brandbook §5.2` |
| **De ch→px-factor van Urbanist** | Niet gemeten. L1 en L4 kunnen daarom niet tegen elkaar worden geijkt; L1 is tot die meting een vloer op de **declaratie**, niet op de gerenderde breedte |
| **De scrollbalkbreedte in deze omgeving** | Niet gemeten. Daarom staat bij `vw` een tolerantie van 1,0 procentpunt in plaats van 0,5 (§1.2.0) in plaats van een getal |
| **De masterwaarden onder de gewogen overlapdefinitie** | Niet gedraaid. `kritiek-ontduiking.md §7` noemt dit al "GRENS TE IJKEN". De gewogen overlapregel is een A-vorm zonder geijkte drempel |
| **De geometrie-minima 5% / 0,5%** | Niet opnieuw gemeten. De ijkwaarden (master 6% en 0,72%) komen uit `DR-V-42`; ik heb ze niet gereproduceerd |
| **SYSTEEM-X** | Nooit gebouwd of gerenderd — `kritiek-ontduiking.md §7` zegt dat zelf. Elke PASS van die pagina is een narekening op opgegeven waarden. CAN-05 en T6 keuren hem af op **papier**; dat is geen gerenderd bewijs |
| **Of een derde pagina de nieuwe vloeren haalt** | Elke nieuwe grens in dit hoofdstuk is geijkt op twee gemeten pagina's plus één papieren nep-pagina. `DR-V-15` waarschuwt hier al voor. Een derde echte pagina is **NIET GEIJKT** |
| **Contrast, alfa en leesbaarheid van tekst op beeld** | Buiten dit hoofdstuk (§0.3). De twee gemeten sub-AA-waarden van de master (3,95:1 en 4,27:1) en `DR-V-47` blijven open |
| **Toegankelijkheid bij tekstvergroting** | `kritiek-overfitting.md §6.6` meet dat vaste sectiehoogtes en tekstvergroting botsen. Dit hoofdstuk verhoogt dat risico in CANVAS MODE (H1) en verlaagt het in DOCUMENT MODE (H2). Het effect is niet gemeten → reviewvraag R7 |
| **De 48e pagina en de vijf uitgesloten bestanden** | `vibe-page-archetypes-v1.md §1.1` sluit bestanden uit; §1.3.6 rekent met de **43** toegewezen pagina's. Het verschil 48 − 43 is niet door mij geïnventariseerd |

---

## 1.7 · BESLUITREGISTER DR-C-20 … DR-C-28

Geen van deze besluiten is een opdracht om nu iets te wijzigen. Blok 20–39 is geclaimd voor hoofdstuk 1; 29–39 blijft vrij.

- **DR-C-20 — De twee lagen van 1A.6.** Wordt `1A.6` punt 2 gesplitst in 2a (typografie begrensd met vloer én plafond) en 2b (compositie proportioneel met het canvas, met de scheidslijn *ch-cap op het tekstelement ≠ px-plafond op de inhoudsdoos*)? Dit is de enige wijziging aan een bevroren besluit die dit hoofdstuk vraagt. **Tot het besluit wint `1A.6` zoals hij er staat.** Bewijs: §1.1.2 (9 van 9 rollen bevroren onder 1682px), §1.1.3 (0 plafonds op de master), §1.1.7 (hoekdrift-venster van 944px).
- **DR-C-21 — cqw binnen een px-grendel.** Wordt expliciet verboden dat een canvas-eenheid binnen een px-plafond wordt uitgedrukt (`min(100cqw, var(--container-max))`, `vibe-system.css:350`)? Zonder dat verbod is "canvas-proportioneel" een woord zonder meting.
- **DR-C-22 — Volledigheid van het cqw-vangnet.** Wordt de vangnetverplichting uitgebreid van `line-height` naar **alle** eigenschappen met een canvas-eenheid? Gemeten gat: 13 `box-shadow`-declaraties in cqw, 2 overschreven, krimpfactor 4,5 op 390px.
- **DR-C-23 — Hoe verschillend is een ander kader?** W6 zet 1,0% vw (17,7px @1774). Master-minimumgat **1,18%**, ontduikingsstagger **0,68%**. Beide marges liggen onder 0,35 procentpunt. Is 1,0% het getal, of wordt de kadertoets vervangen door een toets op de **verhouding** tussen opeenvolgende kaders?
- **DR-C-24 — Scope van G17.** Wordt `G17`'s verbod op `height:auto` boven 1200px gescopeerd op CANVAS MODE, zodat DOCUMENT MODE bestaat? Zonder dat besluit blijft lange tekst onbouwbaar (spreiding 25,5 tegen budget 2,13).
- **DR-C-25 — Handgezette regelval, gerenderd.** `P-15` telt `<br>`-knopen in de DOM en is met een `<br>` achter het laatste woord op 100% te zetten. Wordt de toets een **gerenderde regeltelling** (aantal regelvakken per kop op 1774px), of vervalt `P-15` als poort? Tot dat besluit is hij in dit hoofdstuk klasse **B**.
- **DR-C-26 — Het bovenplafond van lopende tekst.** L7 stelt 24px voor (plafond bindend op 2124px, afgeleid uit de gemeten 20px = 1,13% vw). Het getal 24 is een keuze. Welk plafond, en bij welke breedte moet het binden?
- **DR-C-27 — Het modusplafond van C-02.** Is 70% per modus het juiste plafond, of 60%? En blijft B1 de enige benoemde uitzondering?
- **DR-C-28 — Wie is de noemer?** Onderschrijft de opdrachtgever `DR-V-49`: wordt de sectieverzameling uit de DOM afgeleid in plaats van uit `data-screen-label`? Gemeten: 25 van 48 pagina's draagt het attribuut; op de overige 23 geeft het harnas `undefined` en NaN.

**Onderschreven, niet opnieuw beslist** (zij horen in een ander hoofdstuk, maar dit hoofdstuk leunt erop): `DR-V-32` (plafond op fotoloze secties), `DR-V-40` (wat is een beeld), `DR-V-41` (één definitie van informatievlak), `DR-V-42` (minimummaat voor geometrie), `DR-V-43` (vloer of plafond), `DR-V-44` (mag een lege meting PASS zijn — hier met **nee** geantwoord, §0.2), `DR-V-47` (contrastpoort), `DR-V-48` (één DR-register), `DR-V-49` (de noemer), `DR-V-30` (registerblauwdruk B16).

---

## 1.8 · VISUELE REVIEWVRAGEN

Niet toetsbaar met een getal; daarom géén poort. Elke vraag noemt wat er wél gemeten is.

- **R1 — Leest een leeskolom uit het midden als ontworpen of als een fout?** D2 eist lichtste zijde ≤47,5% voor de splitsing kolom ↔ rest; nagerekend geeft een kolom van 620px in 1774 een lichtste zijde van 34,9%. Of dat **oogt** als compositie of als een vergeten centrering, is een oordeel.
- **R2 — Hoe vult de lege zijde van een DOCUMENT-sectie zich?** Gemeten: `G20` constateert voor de master *"leegte zit in de hoogte, niet in de breedte"*. In DOCUMENT MODE is dat per definitie omgekeerd. Of daar een inhoudsopgave, een citaat, een merkgebaar of niets hoort, is een ontwerpvraag.
- **R3 — Is één doorlopende drager (D4) genoeg om twintig FAQ-paren samen te binden?** Gemeten: 20 paren over vier pagina's hebben in V1.2 geen plaats; 13 pagina's dragen 67 accordeon-items. De drempel "drager over ≥60% van de sectiehoogte" is **TE IJKEN**.
- **R4 — Oogt een HYBRID-podium met een gebouwd object (M0) even sterk als met een klasse-A-foto?** Gemeten: 9 klasse-A-beelden op 27 verschillende opnamen voor 48 pagina's; `BEWIJS-assets.md §4` eist dat niet-fotografische middelen MEDIUM-secties zelfstandig dragen. Of ze ook een HIGH-sectie dragen, is niet te meten.
- **R5 — Welke twee modi mogen naast elkaar staan?** C-02 eist beweging maar zegt niets over de **naad** tussen twee modi. Gemeten houvast: `G18` (0 van 8 naden met een lijn, maximaal 2 zichtbare treden per pagina van elk ≤13 digits per kanaal). Of een CANVAS-sectie direct op een DOCUMENT-sectie mag volgen, is een reviewvraag.
- **R6 — Is 46–62ch op een scherm van 2560px nog comfortabel?** De ch-cap is breedte-onafhankelijk; de regel blijft dus even lang terwijl het scherm groeit. Gemeten: nul van de drie desktopcaps van deze repository is op een breedte boven 1774px beoordeeld.
- **R7 — Wat doet tekstvergroting met een CANVAS-sectie?** Gemeten: `kritiek-overfitting.md §6.6` benoemt de botsing tussen vaste sectiehoogtes en tekstvergroting. CAN-01 handhaaft de vaste hoogte in CANVAS MODE; het effect is niet gemeten.
- **R8 — Is het hoekdriftvenster van 944px een praktisch probleem?** Nagerekend: een px-vaste doos houdt de S7-snede alleen tussen 1644 en 2588px binnen de flauwe band 9–14°. Of een afwijking van 1,8° (op 1440) visueel opvalt, is niet gemeten en is een oordeel.


---

# HOOFDSTUK 2 — BEELD EN ASSETS

Vibe Web Design System **V1.3**. Besluitprefix **DR-I**.
Dit hoofdstuk vervangt `vibe-image-system-v1.md` §1–§12 (V1.2 M0–M6, V-1…V-8, U-1…U-4).
Het is documentatie. **Geen implementatie.** Dit bestand wijzigt geen HTML, CSS, JS of asset.

---

## 2.0 MEETBASIS

### 2.0.1 Wat ik in deze sessie zelf heb gemeten

| meting | instrument | uitkomst staat in |
|---|---|---|
| maten en ratio's van alle 36 bron-JPG's in `assets/` + `assets/projects/` | `sips -g pixelWidth -g pixelHeight` | 2.1.1 |
| maten en ratio's van 11 legacy-JPG's in `img/` | idem | 2.1.3 |
| maten en ratio's van 13 homepage-derivaten in `assets/home/` | idem | 2.0.4 |
| byte-identiteit van alle 36 bronnen | `md5` | 2.1.2 |
| visuele duplicaten | genormaliseerde RMS-afstand op 32×24 grijswaarden, alle 630 paren | 2.1.2 |
| herkomst van elk homepage-derivaat | zelfde RMS-maat, derivaat tegen alle 36 bronnen + `img/` | 2.0.4 |
| inhoud van alle 36 bronnen | zelf bekeken: drie contactvellen `vel-0/1/2.png` **en** 36 losse afdrukken op 300px | 2.1.3 |
| opdruk van `ems-hero.jpg` | uitsnede 620×420 op x1100 y380, 1:1 bekeken | 2.1.2 |
| detailbehoud, concentratie, drift en brandpuntzone per bron | `snede.py` op 160×120 grijswaarden, zie 2.0.2 | 2.1.4 |
| luminantiespreiding per bron | p95 − p05 over 19.200 monsters | 2.3.1 |
| welke as van `object-position` op de master werkelijk snijdt | narekening uit gemeten kadermaat en gemeten bronratio | 2.0.5 |

**NIET GEMETEN in deze sessie:** de gerenderde pagina. Ik heb geen browser gedraaid, geen afdruk
gemaakt en geen contrast gemeten. Alle gerenderde maten (kadergroottes, % vw, scrimstops,
contrastverhoudingen) zijn **overgenomen** uit het aanvaarde bewijs — `forensics-homepage.md`,
`vibe-image-system-v1.md` §3–§8, `contrast-1774.txt` — en als zodanig gemerkt.
Wat ik zelf gemeten heb, zijn de **bronbestanden** en de **rekenkundige gevolgen** daarvan.

### 2.0.2 Het meetinstrument voor onderwerpbehoud

Het bewijsdocument stelt vast dat resolutie nergens de beperking is en **onderwerpbehoud** wel.
Onderwerpbehoud was tot nu toe een oordeel. Hier is het een meting.

Elke bron wordt teruggebracht tot een raster van 160×120 grijswaarden. Daarop:

```
detailenergie      E(x,y) = |L(x,y) − L(x−1,y)| + |L(x,y) − L(x,y−1)|
detailbehoud       D(r)   = Σ E binnen de beste horizontale band van hoogte r·h  ÷  Σ E totaal
concentratie       C(r)   = D(r) / r
drift              DRIFT(r) = D(r)_beste − D(r)_gecentreerd, in procentpunten
brandpuntzone      ZONE(r) = boven- en onderrand van die beste band, als % van de beeldhoogte
```

Lezing:
- **C = 1,00** — de energie is gelijkmatig verdeeld. Het beeld is een textuur; een diepe snede
  neemt geen onderwerp weg omdat er geen onderwerpband is. Dat is geen compliment: er blijft
  een strook textuur over, geen gebouw.
- **C ≥ 1,40** — er zit een duidelijke onderwerpband met dode lucht of dode voorgrond eromheen.
  Precies dat maakt een letterbox-snede veilig.
- **DRIFT ≥ 10** — `object-position` op de middenwaarde kost meer dan 10 procentpunten detail.
  De brandpuntzone moet dan expliciet worden gedeclareerd.
- **DRIFT < 5** — het profiel is vlak; de argmax is dan niet betekenisvol en ZONE mag niet als
  ontwerpbesluit worden opgeschreven.

**Eén meetfout, gevonden en gecorrigeerd.** De eerste doorloop las de BMP-rijen van onder naar
boven, terwijl `sips` deze bestanden top-down wegschrijft (headerveld `height` = **−120**).
Daardoor stonden ZONE en de luchtmaat ondersteboven. Na correctie meet `microgrids-hero` — drie
witte kasten tegen een blauwe lucht — **83,6%** lucht en `vve-hero` — zuiver loodrecht op een dak —
**0,5%**; vóór de correctie stond dat omgekeerd. Alle cijfers in dit hoofdstuk komen uit de
gecorrigeerde doorloop. De RMS-afstanden van 2.1.2 zijn door de fout niet geraakt: een
rijomkering die op alle beelden gelijk is, verandert geen enkele paarsgewijze afstand.

**Reproduceerbaarheid, gemeten.** Negen opnamen bestaan onder twee namen, los gecomprimeerd en
soms op een andere pixelmaat. Hun C-waarden lopen onderling **maximaal 0,01** uiteen
(negen paren: 0,01 · 0,00 · 0,01 · 0,01 · 0,01 · 0,00 · 0,00 · 0,01 · 0,00).
Het instrument is dus precies tot ±0,01. Elke drempel hieronder staat minstens 0,02 van de
gemeten masterwaarde af, zodat hij geen enkele-meting-drempel is.

**Validatie tegen de handgezette uitsnedes van de master.** De master kiest zijn
`object-position` met de hand en legt de reden in het commentaar vast. Het instrument kent die
waarden niet. Vergelijking op de zes beelden waar de snede-as werkelijk acteert:

| beeld | as | master | instrument (midden van ZONE) | verschil | drift van de masterkeuze |
|---|---|---|---|---|---|
| S3 project ← `hedin-alkmaar-3` | y, keep 0,59 | **62%** | 65,5% | 3,5 pt | 1,6 pt detail |
| S8 final ← `hedin-amsterdam` | y, keep 0,89 | **56%** | 53,5% | 2,5 pt | 2,2 pt |
| S4 proces ← `exploitatie-hero` | y, keep 0,41 | **52%** | 44,5% | 7,5 pt | 0,7 pt |
| S1 hero ← `hedin-alkmaar-2` | y, keep 0,38 (in het derivaat) | **50,3%** | 59,0% | 8,7 pt | 5,3 pt |
| S2 accu ← `microgrids-hero` | x, keep ≈0,46 | **68%** | rechterhelft | zelfde kant | — |
| S2 laad ← `laadpalen-hero` | x, keep ≈0,44 | **6%** | linkerrand | zelfde kant | — |

Vier van de vier verticale keuzes liggen binnen 8,7 procentpunten van het optimum en kosten
hooguit 5,3 procentpunten detail; twee van de twee horizontale keuzes wijzen dezelfde kant op.
Het instrument reproduceert dus wat een ontwerper met de hand deed. **Dat is de rechtvaardiging
om het als poort te gebruiken** — niet omdat het mooi rekent, maar omdat het de master naloopt.

### 2.0.3 Classificatie van elke overgenomen numerieke waarde

Elk getal in dit hoofdstuk draagt één van drie merken:

| merk | betekenis |
|---|---|
| **A TRANSFERABLE FLOOR** | geldt overal, is poort, faalt een pagina |
| **B REFERENTIEBEREIK** | richtwaarde met een band eromheen; wordt nooit alleen een pagina fataal |
| **C HOMEPAGE-SPECIFIEK** | beschrijft Master v1; wordt geen regel |

### 2.0.4 Welke bron draagt welke behandeling — zelf gemeten

Dit stond nergens vast. V1.2 noemt geen enkele bronnaam bij M1–M6; `brandbook §4.2.5` noemt alleen
bronmaten. Gemeten door elk derivaat tegen alle 36 bronnen te leggen (RMS, 32×24, genormaliseerd):

| sectie | behandeling | derivaat | **bron, gemeten** | afstand | derivaatratio | kaderratio | wat de snede wegneemt |
|---|---|---|---|---|---|---|---|
| S1 | M1 PODIUM | `hero-2560` 2560×1084 | **`projects/hedin-alkmaar-2.jpg`** 5120×2880 | 0,229 ¹ | 2,362 | 2,37 | in het derivaat: 49,2% van de breedte, **61,8% van de hoogte** |
| S2 zon | M5 | `s2-zon-1360` 1360×1020 | `zonnepanelen-hero.jpg` 4032×3024 | 0,009 | 1,333 | 0,98 | 26,5% van de breedte |
| S2 accu | M5 | `s2-accu-1360` 1360×1021 | `microgrids-hero.jpg` 2000×1501 | 0,034 | 1,332 | 0,61 | **54,2% van de breedte** |
| S2 laad | M5 | `s2-laad-1360` 1360×1021 | `laadpalen-hero.jpg` 2560×1921 | 0,030 | 1,332 | 0,59 | **55,7% van de breedte** |
| S2 ems | M5 | `s2-ems-780` 780×586 | **`img/ems-tech.jpg`** 1400×1051 | 0,063 | 1,331 | 1,53 | 13,0% van de hoogte |
| S2 handel | M5 | `s2-handel-780` 780×520 | `ems-hero.jpg` 2000×1333 | 0,041 | 1,500 | 1,54 | 2,6% van de hoogte |
| S3 | M2 PANEEL | `s3-project-2560` 2560×1440 | **`projects/hedin-alkmaar-3.jpg`** 5120×2880 | 0,016 | 1,778 | 3,02 | **41,1% van de hoogte** |
| S4 | M4 BAND | `s4-proces-2080` 2080×1561 | `exploitatie-hero.jpg` 2560×1921 | — ² | 1,332 | 3,26 | **59,1% van de hoogte** |
| S6 verhaal | M3 | `s6-verhaal-1600` 1600×1109 | `projects/ratio-16.jpg` 2400×1350 | 0,669 ³ | 1,443 | 1,32 | 18,8% breedte vooraf + 8,7% bij render |
| S6 duimnagel | M3 | `s6-thumb-360` 360×203 | `projects/ratio-16.jpg` (waarschijnlijk) | 1,037 ⁴ | 1,773 | 1,08 | 39,3% van de breedte |
| S7 | M3 | `s7-opslag-2400` 2400×1802 | `energieopslag-hero.jpg` 2400×1802 | 0,024 | 1,332 | 1,49 | 10,6% van de hoogte |
| S8 | M6 HOEKBEELD | `s8-cta-2040` 2040×1532 | `projects/hedin-amsterdam.jpg` 2560×1922 | 0,033 ⁵ | 1,332 | 1,48 | 10,0% van de hoogte |
| S9 | M6 HOEKBEELD | `s9-footer-1440` 1440×1081 | `microgrids-hero.jpg` 2000×1501 | 0,033 | 1,332 | 0,67 | **50,0% van de breedte** |

¹ De hero is in het derivaat al hard gesneden (`home-hero.css:68`: "bron x 1800..4400, y 900..2000"),
dus de RMS-afstand tot het hele bronframe is groot. Beslissend is de narekening: diezelfde uitsnede
genomen uit `hedin-alkmaar-2` geeft afstand **0,229**, uit `hedin-alkmaar-3` **1,505** — factor 6,6.
² `index.html:537` noemt de bron letterlijk ("Bron assets/exploitatie-hero.jpg"); los gemeten is de
ratio identiek (1,332 tegen 1,333).
³ Boven de duplicaatband (0,07) omdat het derivaat al 18,8% van de breedte is afgesneden; de
eerstvolgende kandidaat staat op 1,254, factor 1,9 verder.
⁴ **NIET SLUITEND.** `ratio-16` is de dichtstbijzijnde van 36, maar op 1,037 — ruim buiten de
duplicaatband. De uitsnede is te klein voor een betrouwbare match.
⁵ `index.html:955` noemt `laadplein-hero.jpg`; `energy-hubs-hero`, `laadplein-hero` en
`projects/hedin-amsterdam` zijn gemeten dezelfde opname (2.1.2). De naamkeuze is willekeurig.

**Vier gevolgen, alle vier toetsbaar:**

1. **De homepage gebruikt 11 unieke opnamen voor 13 beelden.** `microgrids-hero` draagt zowel
   S2-accu (17,0% vw) als S9-footer (19,7% vw); `ratio-16` draagt zowel S6-verhaal (41,4% vw) als
   de duimnagel (5,5% vw). *(C HOMEPAGE-SPECIFIEK als telling; de regel die eruit volgt staat in
   2.4.5.)*
2. **Eén van die elf ligt niet in `assets/`.** `img/ems-tech.jpg` (1400×1051) is een legacy-bestand.
   Het bewijsdocument telt 36 bronnen in `assets/` en komt daardoor één opname tekort.
3. **Eén van die elf is synthetisch.** Zie 2.1.2.
4. **De geleverde resolutiefactor is gemeten en niet constant.** Derivaatbreedte ÷ kaderbreedte:
   S9 4,11× · M5-kaarten 2,79× · S6 2,18× · S7 2,18× · S4 2,18× · S8 2,18× · S3 **1,50×** ·
   S1 **1,44×**. Boven de 1700px kaderbreedte zakt de master naar 1,44–1,50×, daaronder zit hij
   op 2,18× of hoger. *(B REFERENTIEBEREIK.)*

### 2.0.5 De inerte as — een gemeten constructiefout in de uitsnedeleer

`object-position` acteert alleen op de as waar het geschaalde beeld daadwerkelijk buiten het kader
valt. Met `object-fit: cover` geldt:

```
schaal       s  = max(kaderB / bronB , kaderH / bronH)
overloopX    = bronB · s − kaderB
overloopY    = bronH · s − kaderH
```

Is `overloopX = 0`, dan doet de x-waarde **niets**, hoe nadrukkelijk hij ook in de code staat.
Nagerekend met de gemeten kadermaten (overgenomen bewijs) en de door mij gemeten bronratio's:

| beeld | kader | kaderratio | bronratio | snijdt | x acteert | y acteert |
|---|---|---|---|---|---|---|
| S1 hero | 1774×748 | 2,372 | 2,362 | hoogte, **3px** | nee | nauwelijks |
| S2 zon | 487×497 | 0,98 | 1,333 | breedte | **ja (56%)** | nee |
| S2 accu | 302×495 | 0,61 | 1,332 | breedte | **ja (68%)** | nee |
| S2 laad | 292×495 | 0,59 | 1,332 | breedte | **ja (6%)** | nee |
| S2 ems | 353×231 | 1,53 | 1,331 | hoogte | nee | ja (niet gedeclareerd) |
| S2 handel | 355×231 | 1,54 | 1,500 | hoogte | nee | ja (niet gedeclareerd) |
| S3 project | 1704×565 | 3,017 | 1,778 | hoogte, 393px | **nee — 54% is inert** | ja (62%) |
| S4 proces | 956×294 | 3,252 | 1,332 | hoogte, 423px | **nee — 50% is inert** | ja (52%) |
| S6 verhaal | 734×557 | 1,318 | 1,443 | breedte, 70px | ja (52%) | **nee — 46% is inert** |
| S6 duimnagel | 98×91 | 1,077 | 1,773 | breedte | ja (50%) | **nee — 38% is inert** |
| S7 opslag | 1100×736 | 1,494 | 1,332 | hoogte, 90px | **nee — 26% is inert** | ja (52%) |
| S8 final | 935×631 | 1,482 | 1,332 | hoogte, 71px | **nee — 78% is inert** | ja (56%) |
| S9 footer | 350×526 | 0,665 | 1,332 | breedte, 351px | ja (46%) | **nee — 54% is inert** |

**Zeven van de dertien beelden dragen een gedeclareerde uitsnedewaarde die niets doet.**
De ratio's veranderen niet over de breedtebanden: elk `srcset`-gezin houdt zijn ratio binnen 0,2%
(gemeten: `s8-cta` 1,3300/1,3316/1,3316 · `s4-proces` 1,3302/1,3316/1,3325 · `s7-opslag`
1,3306/1,3319/1,3319 · `s3-project` 1,7778/1,7771/1,7778). De bevinding geldt dus op élke
gemeten breedte en bij élk gekozen derivaat.

Twee van die zeven dragen bovendien een geschreven motivatie die onmogelijk kan kloppen:

- `home-infra.css:166-167` — *"de batterijkasten stonden midden in beeld en vielen daardoor achter
  de sectorkaarten; nu staan ze links, naast de kaartkolom"*. De x-waarde 26% heeft 0px overloop.
- `home-final.css:85-87` — *"Bij 50%/46% vulde de parkeerplaats het beeld en was de zonnecarport
  nauwelijks zichtbaar"*. De x-waarde 78% heeft 0px overloop; alleen de wijziging 46% → 56%
  op de y-as kan het effect hebben geleverd.

**Gevolg voor de regels.** `brandbook §4.2.1` Principe 1 (*"de horizontale uitsnede duwt het
onderwerp wég van wat eroverheen ligt"*) is gebouwd op vijf waarden — 26% · 78% · 6% · 54% · 50% —
waarvan er **één acteert** (6%, S2-laad). De focuspuntregel van `vibe-image-system-v1.md` §5-D
(*"minstens 24 procentpunten weg van de bedekte kant"*, en DR-V-23) is afgeleid uit uitsluitend
26% en 78%: **beide inert**. Die regel heeft dus nul werkende meetpunten en vervalt. Zie DR-I-05
en de conflictlijst 2.5.

---

## 2.1 KWALITEITSKLASSEN

### 2.1.1 De voorraad, hermeten

| waar | aantal | wat |
|---|---|---|
| `assets/*.jpg` | 20 | onderwerp-hero's |
| `assets/projects/*.jpg` | 16 | projectbeelden |
| `assets/*.mp4`, `assets/projects/*.mp4` | 2 | `recreatie-hero.mp4`, `arnhem-drone.mp4` — **buiten dit hoofdstuk**, video is niet gemeten |
| `assets/*.png` | 3 | logo's — geen fotografie |
| `assets/home/*.webp` | 39 | derivaten van 13 beelden; geen eigen bronnen |
| `assets/systeem/` | — | derivaten; niet geteld, geen eigen bronnen |
| `img/*.jpg` | 11 | legacy; **één ervan (`ems-tech.jpg`) staat op de homepage** |

**36 fotografische bronbestanden in `assets/`.** Dat bevestigt de telling van het bewijsdocument.

### 2.1.2 Duplicaten — gemeten, met twee correcties en vijf aanvullingen

Methode: elk bestand teruggebracht tot 32×24 grijswaarden, genormaliseerd op gemiddelde en
spreiding (zodat belichtings- en compressieverschil wegvalt), daarna de RMS-afstand over alle
**630** paren. De uitkomst is niet grensgevoelig: er zijn elf paren onder **0,07** en het
eerstvolgende paar staat op **0,833** — een gat van factor **12,6**.

| afstand | paar | status t.o.v. `BEWIJS-assets.md` |
|---:|---|---|
| **0,000** | `energielabel-hero` = `projects/nieuw-schoonoord` | **AANVULLING** — byte-identiek: zelfde md5 `efff0d4fed65d9fce304f7551deb2047`, beide 2400×1350 en 784.429 bytes |
| 0,003 | `ems-hero` = `energiehandel-hero` | bevestigd |
| **0,005** | `residentieel-hero` = `projects/beethovenstraat` | **AANVULLING** |
| 0,009 | `capaciteit-hero` = `energieopslag-hero` | bevestigd |
| **0,011** | `vastgoed-hero` = `projects/purmerend` | **AANVULLING** |
| 0,019 / 0,021 / 0,037 | `energy-hubs-hero` = `laadplein-hero` = `projects/hedin-amsterdam` | bevestigd |
| 0,026 | `microgrids-hero` = `netcongestie-hero` | bevestigd |
| **0,048** | `subsidies-hero` = `projects/schouwburgring` | **AANVULLING** |
| **0,066** | `logistiek-hero` = `projects/hedin-alkmaar-3` | **AANVULLING** |

**Twee beweringen uit het bewijsdocument zijn onjuist en worden ingetrokken:**

| bewering | gemeten | factor buiten de duplicaatband |
|---|---:|---:|
| *"`vastgoed-hero` = `residentieel-hero`"* | **1,313** | 18,8× |
| *"`projects/ratio-16` = `projects/ratio16` — zelfde frame, 2400 en 5472 breed"* | **1,502** | 21,5× |

`ratio-16.jpg` (2400×1350) en `ratio16.jpg` (5472×3078) zijn **twee verschillende gebouwen**.
Zelf bekeken: `ratio-16` is een lichte bedrijfshal met een PV-veld op een plat dak, schuin van
boven, met terrein en vrachtwagens eromheen. `ratio16` is een bijna loodrechte opname van een
donker bakstenen gebouw met een binnenhof. Bovendien gemeten: het homepage-derivaat
`s6-verhaal-1600`, waarvan `index.html:837` zegt dat het **Ratio 16 in Duiven** is, matcht
`ratio-16.jpg` op 0,669 en `ratio16.jpg` op meer dan 1,2. **`ratio16.jpg` toont niet Ratio 16.**
Welk project het wél toont is **NIET VASTGESTELD** — er is geen bijschrift, geen alt-tekst en geen
commentaar dat het benoemt.

**Synthetisch beeld — bevestigd, en zwaarder dan het bewijsdocument stelt.**
Ik heb `ems-hero.jpg` op 1:1 bekeken (uitsnede 620×420 vanaf x1100 y380). Op de metersbehuizing
staat gespiegelde, niet-bestaande lettertekst (herkenbare omkeringen van losse letters, gevolgd
door een cijferreeks die het kader uitloopt), en de twee leesbare displays tonen **beide exact
`15308 kWh`**. Dat is de handtekening van een gegenereerd beeld. De kwalificatie *"synthetisch /
afgekeurd"* uit het bewijsdocument is hiermee **onafhankelijk bevestigd**, niet overgenomen.

Dat raakt de master zelf: `ems-hero.jpg` is de bron van `s2-handel` (M5 KAARTBEELD, 20,0% vw), en
`index.html:435-436` noemt het *"de echte meetlaag waarop flexibiliteit wordt afgerekend"*.
Die claim is onjuist. Zie 2.5 conflict **CH2-03** en besluit **DR-I-07**.

**Telling.** Negen duplicaatgroepen met 19 leden; 10 bestanden zijn dus een tweede naam.
**36 − 10 = 26 verschillende opnamen in `assets/`.** Met `img/ems-tech.jpg` erbij — de elfde
opname van de homepage — zijn er **27 opnamen in gebruik**. Het bewijsdocument schatte "ongeveer
27 verschillende opnamen" binnen `assets/`; gemeten zijn dat er 26.

### 2.1.3 Wat er werkelijk in de voorraad zit — zelf bekeken

Op de drie contactvellen én op 36 losse afdrukken van 300px. Afwijkend van het bewijsdocument:

| bestand | bewijsdocument | wat ik zie | gevolg |
|---|---|---|---|
| `subsidies-hero` / `schouwburgring` | B, *"dronefoto"* | **geen dronefoto**: opname vanaf een plat grinddak, horizon in beeld, kerktoren op de skyline, zwaar bewolkt, het PV-veld ligt vlak en is nauwelijks als PV leesbaar | verhuist naar **B** om een andere reden, en is de enige horizonopname van de voorraad |
| `vastgoed-hero` | *"plein met glazen overkapping en kerktoren"* | **luchtfoto van een bedrijventerrein** met een zwart hoekig pand met PV en witte hallen — dezelfde opname als `purmerend` | de omschrijving hoorde bij `subsidies-hero`; de naamverwisseling zette twee opnamen in de verkeerde klasse |
| `residentieel-hero` | D (*"duplicaat van `vastgoed-hero`"*) | luchtfoto van een rij woningen met volledig PV-dak — identiek aan `beethovenstraat`, dat in B stond | dezelfde opname stond in twee klassen; wordt één opname, klasse **A** |
| `schouwburgring` ↔ `subsidies-hero` | A respectievelijk B | dezelfde opname | kan niet in twee klassen staan; wordt **B** |
| `logistiek-hero` ↔ `hedin-alkmaar-3` | beide A | dezelfde opname | één opname; het aantal A daalt |
| `hedin-alkmaar-4` | C | portret 1200×1600, man boven op een container, laadvloer van een dieplader vult de onderste 40%, kabel dwars door het kader | **D** — de reden is de kadrering, niet de resolutie |
| `zonnepanelen-hero` | C | opname op dakniveau van een schuin PV-veld; hoogste resolutie van de hele voorraad (4032×3024) | **C** bevestigd, maar met de kanttekening dat het een oppervlak is, geen locatie |
| *(ontbreekt)* | — | `img/ems-tech.jpg`: monteur met Vibe-jas bij een open schakelkast | **derde mensopname**; het bewijsdocument telt er twee |

**Mensen in beeld: drie, niet twee** — `over-ons-hero`, `waarom-vibe-hero` en `img/ems-tech.jpg`.
Alle drie zijn ze op grondniveau en vullen ze het kader.

### 2.1.4 De klassen

De klasse zegt **wat een beeld voorstelt en hoe dominant het mag zijn**. De klasse zegt níét of
het een bepaalde snede overleeft — dat is per behandeling gemeten en staat in 2.2. Dat onderscheid
is de kern van de correctie: het bewijsdocument koppelt klasse C aan *"nooit M1, M2 of M4"*,
en dat is **weerlegd door de master zelf**, die `exploitatie-hero` (grondniveau, wandlader met
auto) als M4 BAND gebruikt met een verticale snede van 59,1%.

| klasse | definitie — elk criterium toetsbaar | mag dragen | mag NIET |
|---|---|---|---|
| **A** | gerealiseerd Vibe-project of -installatie, in het kader herkenbaar als gebouw of locatie (horizon of omringende context zichtbaar), geen tweede naam, niet synthetisch | elke behandeling waarvoor hij de drempel van 2.2 haalt, inclusief HIGH: eerste sectie, ≥ 50% vw, sectiehoogtebepalend | — |
| **B** | bruikbare lucht- of locatieopname die **niet** als specifiek project herkenbaar is: loodrecht zonder context, vlak/bewolkt, of een generieke straat waarin het project niet aan te wijzen is | MEDIUM: 20–50% vw, middendeel van de pagina | eerste sectie · ≥ 90% vw · sectiehoogtebepalend — tenzij met een aangehecht bewijsvlak (T9) |
| **C** | grondniveau, product, detail of mens; het onderwerp vult het kader, korte opnameafstand | M2 · M3 · M4 · M5 · M6, mits de drempel van 2.2 gehaald wordt | **eerste sectie** · **≥ 90% vw** · M1 PODIUM |
| **D** | tweede naam van een A/B/C-opname · synthetisch · kadrering onbruikbaar | niets; verwijs naar de canonieke naam | alles |
| **PENDING** | het onderwerp heeft geen beeld in deze repository | niets | alles — de sectie gaat naar een niet-fotografisch middel (hoofdstuk 3) |

**Resolutie is geen klassecriterium.** Het bewijsdocument heeft gelijk: resolutie is nergens de
beperking. Er staat dan ook geen pixelmaat in de klassetabel. De enige resolutie-eis staat per
behandeling in 2.2 en is **relatief**:
**bronbreedte ≥ 1,40 × de kaderbreedte in CSS-px** *(A TRANSFERABLE FLOOR; geijkt op de laagste
gemeten masterwaarde 1,44× bij S1, zie 2.0.4 punt 4)*.
Gevolg, gemeten: de smalste bron van de voorraad is `projects/hedin-alkmaar-4` (1200px) en de
smalste bron die werkelijk gebruikt wordt is `img/ems-tech.jpg` (1400px). Die laatste draagt op
de master een kader van 353px = **3,97×** en heeft dus ruim marge; hij valt pas af boven een kader
van 1000px. **Geen enkele bron wordt door zijn resolutie uit een klasse gehouden** — wel uit een
behandeling, en dan altijd met de kaderbreedte erbij genoemd.

### 2.1.5 De indeling per opname

26 opnamen in `assets/` plus `img/ems-tech.jpg`. Canonieke naam vet; tweede namen in de laatste
kolom zijn **klasse D** en mogen niet apart worden gebruikt.

De kolom **lucht** is het aandeel van de **bovenste helft** van het beeld dat helder én vlak is
(L > 0,70 × maximum en lokale detailenergie < 12) — een maat voor "is er hemel in het kader".
Gemeten scheiding binnen klasse A: de vier bijna-loodrechte opnamen meten **3,0 – 5,0%**, de zes
met horizon **9,3 – 52,6%**. Er zit een gat van 4,3 procentpunten tussen beide groepen.

| # | opname | bron | klasse | wat het is | C(0,38) | C(0,41) | C(0,59) | lucht | tweede naam (= D) |
|---|---|---|---|---|---:|---:|---:|---:|---|
| 1 | **`projects/hedin-alkmaar-2`** | 5120×2880 | **A** | dealer Alkmaar, schuin van boven, horizon + windturbines | 1,35 | 1,31 | 1,21 | 24,9% | — |
| 2 | **`projects/hedin-alkmaar-3`** | 5120×2880 | **A** | zelfde dealer, wijder, waterloop + horizon | 1,14 | 1,13 | 1,12 | 23,4% | `logistiek-hero` |
| 3 | **`projects/hedin-alkmaar`** | 2400×1350 | **A** | zelfde dealer, hoger standpunt | 1,20 | 1,18 | 1,17 | 9,3% | — |
| 4 | **`projects/hedin-amsterdam`** | 2560×1922 | **A** | parkeerterrein Amsterdam, PV-overkapping, skyline | 1,65 | 1,62 | 1,47 | 52,6% | `energy-hubs-hero` · `laadplein-hero` |
| 5 | **`projects/ratio-16`** | 2400×1350 | **A** | Ratio 16 Duiven, lichte hal met PV-veld | 1,23 | 1,21 | 1,14 | **3,1%** | — |
| 6 | **`projects/dormio`** | 5472×3078 | **A** | lang dak volledig PV, straatcontext aan de randen | 1,23 | 1,24 | 1,14 | **5,0%** | — |
| 7 | **`projects/purmerend`** | 2400×1350 | **A** | bedrijventerrein, zwart hoekig pand met PV | 1,40 | 1,34 | 1,26 | 17,1% | `vastgoed-hero` |
| 8 | **`kantoor-hero`** | 2400×1340 | **A** | zelfde pand, dichterbij | 1,24 | 1,21 | 1,15 | 14,5% | — |
| 9 | **`projects/burchtstraat`** | 2400×1350 | **A** | bakstenen pand met binnenhof, PV, bijna loodrecht | 1,30 | 1,27 | 1,19 | **3,0%** | — |
| 10 | **`projects/beethovenstraat`** | 2400×1350 | **A** | woningrij met volledig PV-dak, schuin van boven | 1,20 | 1,18 | 1,13 | **4,0%** | `residentieel-hero` |
| 11 | **`projects/nieuw-schoonoord`** | 2400×1350 | B | donker L-vormig complex, winter, PV slecht leesbaar | 1,14 | 1,12 | 1,09 | 1,7% | `energielabel-hero` (byte-identiek) |
| 12 | **`projects/arnhem-60`** | 2400×1350 | B | straat met gemengde daken; het project is één dak tussen vele | 1,16 | 1,14 | 1,10 | 1,6% | — |
| 13 | **`projects/ketsheuvel`** | 2400×1350 | B | lang woonblok tussen kale bomen, winter, vlak licht | 1,16 | 1,13 | 1,07 | 0,3% | — |
| 14 | **`projects/ratio16`** | 5472×3078 | B | donker bakstenen gebouw, bijna loodrecht, **project onbekend** | 1,10 | 1,07 | 1,05 | 2,5% | — |
| 15 | **`vve-hero`** | 2000×1125 | B | zuiver loodrecht op één woningrij; vlakste profiel van de voorraad | **1,07** | **1,05** | **1,04** | 0,5% | — |
| 16 | **`projects/schouwburgring`** | 2400×1800 | B | dakniveau, horizon, kerktoren, zwaar bewolkt | **1,77** | **1,70** | **1,40** | 67,7% | `subsidies-hero` |
| 17 | **`energieopslag-hero`** | 2400×1802 | C | twee Vibe-batterijkasten in houten omkasting | 1,25 | 1,21 | 1,14 | 25,7% | `capaciteit-hero` |
| 18 | **`microgrids-hero`** | 2000×1501 | C | drie witte batterijkasten op betonvoeten | 1,61 | 1,60 | 1,44 | 83,6% | `netcongestie-hero` |
| 19 | **`exploitatie-hero`** | 2560×1921 | C | wandlader tegen damwandgevel + auto | 1,29 | 1,26 | 1,19 | 48,4% | — |
| 20 | **`laadpalen-hero`** | 2560×1921 | C | ladende auto, kabel, laadpaal op afstand | 1,34 | 1,31 | 1,24 | 2,1% | — |
| 21 | **`zonnepanelen-hero`** | 4032×3024 | C | schuin PV-veld op plat dak, dakniveau | 1,65 | 1,59 | 1,41 | 5,8% | — |
| 22 | **`over-ons-hero`** | 2560×1921 | C | twee mensen over een tekening in een showroom | 1,47 | 1,43 | 1,34 | 35,6% | — |
| 23 | **`waarom-vibe-hero`** | 2000×1501 | C | monteur op ladder aan een overkappingsligger | 1,69 | 1,65 | 1,44 | 54,3% | — |
| 24 | **`projects/hedin-alkmaar-1`** | 2048×1536 | C | Jaguar-dealergevel met Vibe-bus, grondniveau | 1,51 | 1,48 | 1,33 | 17,6% | — |
| 25 | **`img/ems-tech`** | 1400×1051 | C | monteur bij open schakelkast — **buiten `assets/`** | 1,13 | 1,10 | 1,08 | 46,0% | — |
| 26 | **`ems-hero`** | 2000×1333 | **D** | kWh-meters, **synthetisch** (gespiegelde pseudo-tekst, 2× `15308 kWh`) | 1,50 | 1,46 | 1,33 | 11,8% | `energiehandel-hero` |
| 27 | **`projects/hedin-alkmaar-4`** | 1200×1600 | **D** | man op container, dieplader in de voorgrond, kabel door het kader | 1,51 | 1,45 | 1,40 | 47,1% | — |

**Telling: 10 × A · 6 × B · 9 × C · 2 × D-opnamen · 10 × D-duplicaatnamen.**
Bruikbaar voor ontwerp: **25 opnamen**. Paginadragend (A): **10**.

### 2.1.6 De harde regel

> **DR-I-03 — Een zwak beeld wordt nooit een dominant podium.** *(A TRANSFERABLE FLOOR)*
> Een beeld dat niet klasse **A** is, mag niet tegelijk aan deze drie voldoen:
> **(a)** ≥ 50% van de viewportbreedte meten, **(b)** staan in de bovenste 20% van de
> paginahoogte, **(c)** de sectiehoogte bepalen (de sectie heeft geen hoogte die onafhankelijk
> van het beeld is vastgelegd).
> Haalt de opmaak dat alleen met een B- of C-beeld, dan **verandert de opmaak**, niet de klasse:
> de sectie gaat naar een kleinere behandeling of naar een niet-fotografisch middel (hoofdstuk 3).
>
> **Toetsuitslagen.** PASS = er is een beeld en het is A, of (a)(b)(c) zijn niet alle drie waar.
> FAIL = (a)(b)(c) zijn alle drie waar met een niet-A-beeld.
> **N.V.T.-met-reden** = de pagina heeft geen sectie in de bovenste 20% met een beeld; dan moet de
> reden worden genoemd (DOCUMENT MODE, of een niet-fotografische opening). Een lege verzameling
> is nooit PASS.

> **DR-I-04 — Klasse B op HIGH alleen met een aangehecht bewijsvlak.** *(A TRANSFERABLE FLOOR)*
> Een klasse-B-beeld mag wél ≥ 50% vw meten, maar alleen als er een bewijsvlak (T9) op ligt dat
> **≥ 0,95% van vw²** groot is en waarvan **≥ 80% van zijn eigen oppervlak** op gerenderde
> beeldpixels valt. Geijkt op de gemeten masterwaarden: de informatievlakken van de master meten
> 53.172–85.852px² en liggen voor **81–100%** van zichzelf op het beeld *(overgenomen bewijs,
> `vibe-image-system-v1.md` §10 V-5)*; het grootste B2-vlak dat de 50%-eis haalt is 24.600px².

---

## 2.2 DE BEHANDELINGEN M0–M6, HERZIEN

### 2.2.1 Tien mechanismen waaruit de behandelingen zijn opgebouwd

De behandelingen zijn geen varianten van "foto in een vak". Ze zijn samenstellingen van tien
mechanismen. Elk mechanisme is afzonderlijk toetsbaar.

| | mechanisme | toets |
|---|---|---|
| **T1** | **GESTUURDE COVER-UITSNEDE** | de snijdende as is berekend (2.0.5) en de waarde op díé as is gedeclareerd; de waarde op de inerte as is **weggelaten**, niet op 50% gezet |
| **T2** | **OVERSIZED BEELDCANVAS** | het beeldelement is breder dan zijn inhoudskolom; gemeten verhouding beeld : tekstkolom ≥ 2,0 : 1 |
| **T3** | **DOORLOOP BUITEN CONTAINER OF VIEWPORT** | het beeld raakt ≥ 1 schermrand, of steekt ≥ 24px buiten de containermarge |
| **T4** | **DOORLOPENDE VLAKGEOMETRIE** | een vlak snijdt of draagt het beeld en loopt aan ≥ 1 kant **buiten de beeldrechthoek** door, over ≥ 0,5% van het sectievlak |
| **T5** | **GEDEELTELIJK GEVULD PODIUM** | het gemaskerde podium is groter dan het beeldvlak; het beeld vult **55–90%** van het podium, de rest is vlak of geometrie |
| **T6** | **SCRIM** | verloop over het beeld met ≥ 3 kleurstops; richting bepaald door waar de tekst staat |
| **T7** | **SNIJVEILIGE BRANDPUNTZONE** | ZONE(r) is gemeten en de uitsnede valt erbinnen; bij DRIFT ≥ 10 is de waarde expliciet gedeclareerd |
| **T8** | **SAMENGESTELD BEELDPODIUM** | twee of meer beelden binnen één podium, met **ongelijke** maat (factor ≥ 1,5) en een gedeelde maskerrand |
| **T9** | **AANGEHECHT BEWIJSVLAK** | vlak ≥ 0,95% vw², ≥ 80% van zichzelf op beeldpixels, dat een meetwaarde of een projectnaam draagt |
| **T10** | **BEWUSTE AFSNIJDING** | het masker neemt **≥ 5%** van de beeldrechthoek weg (geijkt: de laagste gemeten wegname van de master is 6% bij M3-infra, de hoogste 44% bij M1) |

**T10 vervangt de V1.2-definitie van "masker".** V1.2 telt elke `clip-path: polygon` als masker;
de criticus haalde die poort met een afgesneden hoekje van 3,0 × 5,0px = **0,0037%** van de
beeldrechthoek. De drempel van 5% maakt dat onmogelijk en laat alle drie de gemeten
mastermaskers staan (44% · 8% · 6%). *(A TRANSFERABLE FLOOR.)*

### 2.2.2 De drie canvasmodi en wat ze met beeld doen

| modus | beeldgedrag | welke behandelingen |
|---|---|---|
| **CANVAS MODE** | het beeld schaalt proportioneel met het scherm; geen paginabrede `max-width`; de sectiehoogte volgt uit het beeld | M1 · M2 · M4 · M6 · M8-techniek T8 |
| **DOCUMENT MODE** | begrensde leesbreedte; het beeld staat binnen de leeskolom of ontbreekt | M3 (≤ 45% vw) · M5 · M0 |
| **HYBRID MODE** | redactionele kolom naast een ontworpen podium; het podium is CANVAS, de kolom is DOCUMENT | M2 · M3 · M5 · M6 |

Een pagina beweegt bewust tussen de modi. **De modus wordt per sectie gedeclareerd**
(`data-canvas-mode="canvas|document|hybrid"`), want zonder declaratie is niet toetsbaar of een
smalle sectie een keuze is of een ongeluk. *(DR-I-15.)*

---

### 2.2.3 M0 — GEEN FOTO

| veld | waarde |
|---|---|
| **doelratio** | n.v.t. — er is geen beeld |
| **toegestane bronklassen** | geen; dit is de behandeling voor **PENDING** |
| **maximale verticale snede** | n.v.t. |
| **minimale bronbreedte** | n.v.t. |
| **brandpuntzone** | n.v.t. |
| **toegestane schermranden** | geen *(gemeten master: zichtbaar vlak x78…889 en x982…1708, raakt niets — C HOMEPAGE-SPECIFIEK)* |
| **geometrie-interactie** | T4 verplicht: één gebouwd vlak dat buiten zijn eigen kolom doorloopt |
| **scrim** | n.v.t. |
| **tekstinteractie** | tekst staat naast het object, niet erop |
| **vlakinteractie** | ≥ 2 vlakken die elkaar overlappen *(gemeten master: 27px overlap, 100px hoogteverschil — C)* |
| **responsieve transformatie** | de sectie groeit op mobiel *(gemeten master: factor 1,83 — C)* |
| **wanneer NIET** | wanneer er wél een bruikbaar beeld bestaat voor dit onderwerp. M0 is geen plaatshouder; `brandbook §4.4.4` is hier bindend |

> **REAL-ASSET FEASIBILITY = N.V.T.-met-reden.** M0 draagt per definitie geen bestand. De toets
> wordt niet als PASS geboekt. De inhoudelijke eis — dat het getoonde object het product zelf is
> en echte waarden draagt — verhuist naar **hoofdstuk 3**, waar de niet-fotografische middelen
> staan. M0 blijft hier alleen als code bestaan zodat de nummering M0–M6 aansluit op V1.2.

**Correctie op V1.2 MFQ-01.** V1.2 begrenst M0 op **1× per pagina**. Het archetype B2 vraagt volgens
`blueprints §6` drie tot vier M0-secties (B07 · B05 · B06, optioneel B13). Die tegenstrijdigheid
(papiertest T-3) wordt hier opgeheven: **M0 heeft geen bovengrens per pagina.** Wat begrensd wordt
is de fotoloze *fractie* van een pagina, en die staat in 2.4.3.

---

### 2.2.4 M1 — PODIUM

> Het beeld **is** het sectiecanvas; de tekst staat in een vorm die eruit gesneden is.

| veld | waarde |
|---|---|
| **doelratio** | **2,20 – 2,45** *(B REFERENTIEBEREIK; gemeten master 2,37 = C HOMEPAGE-SPECIFIEK)* |
| **toegestane bronklassen** | **alleen A** |
| **maximale verticale snede** | **62%** van de bronhoogte *(A; gemeten master 61,8%)*, mits **C(0,38) ≥ 1,30** *(A; gemeten masterdrager 1,35, marge 0,05 = 5× de reproduceerbaarheid)* |
| **extra eis: horizon** | **lucht ≥ 6,0%** van het bronframe *(A; gemeten masterdrager 24,9%)*. Een loodrechte opname levert na een 62%-snede een textuurstrook, geen gebouw. De drempel ligt in het gemeten gat tussen de bijna-loodrechte klasse-A-opnamen (3,0–5,0%) en die met horizon (9,3–52,6%) |
| **minimale bronbreedte** | 1,40 × kaderbreedte *(A)*. Bij 1774px kader: **≥ 2484px** |
| **brandpuntzone** | ZONE(0,38) van de gekozen bron; bij DRIFT ≥ 10 expliciet declareren. *Gemeten masterdrager: ZONE 40–78%, DRIFT 5,3 — de master koos 31–69% en betaalt daarvoor 5,3 procentpunten detail* |
| **toegestane schermranden** | links, rechts én boven; **onder niet** — daar sluit een eigen band de naad *(B)* |
| **geometrie-interactie** | T10 verplicht (masker neemt ≥ 5% weg; gemeten master 44%) + T4 (de band loopt buiten het masker door) |
| **scrim** | vignetscrim toegestaan **mits alle tekst op een eigen vlak staat**. Gemeten master: met en zonder scrim meet de kop 16,03:1 — de scrim dient de geometrie, niet de leesbaarheid *(overgenomen bewijs)* |
| **tekstinteractie** | de H1 staat **buiten** het masker; alleen een secundair blok mag op beeldpixels |
| **vlakinteractie** | géén informatievlak op het beeld *(gemeten master: grootste kandidaat 14.301px², onder de drempel)* |
| **responsieve transformatie** | onder 1200px: masker → radius, ratio → vaste hoogte, scrim kantelt |
| **wanneer NIET** | geen klasse-A-bron beschikbaar · bron haalt C(0,38) < 1,30 of lucht < 6,0% · de pagina heeft geen sectie die van rand tot rand mag lopen · het onderwerp valt in het weggesneden deel · er staat geen eigen band onder het beeld |

> **REAL-ASSET FEASIBILITY = PASS, maar op 3 van de 27 opnamen.**
> Dragers: **`projects/hedin-alkmaar-2`** (C 1,35 · lucht 24,9%) ·
> **`projects/hedin-amsterdam`** (C 1,65 · lucht 52,6%) ·
> **`projects/purmerend`** (C 1,40 · lucht 17,1%).
> Afgevallen op de horizoneis, ondanks voldoende concentratie:
> `projects/burchtstraat` (C 1,30 · lucht **3,0%**) — een bijna loodrechte opname.
> Afgevallen op concentratie: `kantoor-hero` 1,24 · `projects/dormio` 1,23 · `projects/ratio-16`
> 1,23 · `projects/hedin-alkmaar` 1,20 · `projects/beethovenstraat` 1,20 ·
> `projects/hedin-alkmaar-3` 1,14.

**Dit is de belangrijkste schaarsteconstatering van het hoofdstuk.** M1 is bouwbaar — het
bewijsdocument heeft gelijk dat de behandeling niet onbouwbaar is — maar op **drie** opnamen:
een autodealer, een parkeerterrein en een bedrijventerrein. Een systeem dat M1 als
standaardopening voor 48 pagina's voorschrijft, schrijft **zestien keer hetzelfde beeld** voor.
M1 is daarom **geen standaardopening**; zie 2.4.2.

---

### 2.2.5 M2 — PANEEL

> Het beeld is een paneel dat tot één schermrand doorloopt; de scrim draagt de tekst.

| veld | waarde |
|---|---|
| **doelratio** | **2,90 – 3,15** *(B; gemeten master 3,02 = C)* |
| **toegestane bronklassen** | **A** onbeperkt · **B** alleen met T9 (DR-I-04) · **C** alleen als het onderwerp horizontaal is uitgestrekt — zie de reviewvraag hieronder |
| **maximale verticale snede** | **42%** van de bronhoogte *(A; gemeten master 41,1%)*, mits **C(0,59) ≥ 1,10** *(A; gemeten masterdrager `hedin-alkmaar-3` 1,12, marge 0,02)* |
| **minimale bronbreedte** | 1,40 × kaderbreedte *(A)*. Bij 1704px kader: **≥ 2386px** |
| **brandpuntzone** | ZONE(0,59). *Gemeten masterdrager: 36–95%, midden 65,5%; de master declareert 62% — verschil 3,5 punten* |
| **toegestane schermranden** | **precies één** — de kant waar het paneel doorloopt. De andere kant staat op de containermarge met een **eenzijdige** radius *(B; gemeten master 63px)* |
| **geometrie-interactie** | T4 binnen het paneel: een wig die de paneelhoek sluit en de merkhoek herhaalt. **T10 niet vereist** — M2 heeft geen masker |
| **scrim** | **verplicht**, richtingsscrim met ≥ 4 stops, donkerste stop aan de tekstkant, eerste 20% van de paneelbreedte **dekkend**. Zonder scrim zakt de gemeten kop van 18,09:1 naar **3,67:1**, factor 4,9 *(overgenomen bewijs)* |
| **tekstinteractie** | **alle** tekst staat kaal op beeldpixels, binnen de dekkende zone. Gemeten master: 12 van 12 tekstdragers 100% op beeldpixels, `pctDonker = 100%` *(overgenomen bewijs)* |
| **vlakinteractie** | **geen** zwevende kaart; de bewijsrij staat als kaal type ín het beeld |
| **responsieve transformatie** | de scrim **kantelt mee met de tekst**: 90deg → 180deg zodra de tekst onder het beeld staat; ratio → vaste hoogte; het paneel wordt 100% vw |
| **wanneer NIET** | de sectie moet haar marge aan beide kanten houden · er is geen richtingsscrim · de bron haalt C(0,59) < 1,10 · de tekst kan niet in de dekkende 20% passen |

> **REAL-ASSET FEASIBILITY = PASS, 10 onvoorwaardelijke dragers + 2 voorwaardelijke.**
> Klasse A, alle tien halen C(0,59) ≥ 1,10 en ≥ 2386px:
> `hedin-amsterdam` 1,47 · `purmerend` 1,26 · `hedin-alkmaar-2` 1,21 · `burchtstraat` 1,19 ·
> `hedin-alkmaar` 1,17 · `kantoor-hero` 1,15 · `ratio-16` 1,14 · `dormio` 1,14 ·
> `beethovenstraat` 1,13 · `hedin-alkmaar-3` 1,12.
> Klasse B met T9: `schouwburgring` 1,40 · `arnhem-60` 1,10.
> Afgevallen: `nieuw-schoonoord` 1,09 · `ketsheuvel` 1,07 · `ratio16` 1,05 · `vve-hero` **1,04**.

**VISUELE REVIEWVRAAG R-2.1.** Bij een klasse-C-bron in M2: blijft het onderwerp na een snede van
42% nog als object herkenbaar, of wordt het een strook materiaal? Niet meetbaar met C alleen —
`microgrids-hero` haalt C(0,59) = 1,44 maar is drie staande kasten; een band van 3,02 toont daar
alleen de middenmoot. **Beantwoorden op de afdruk, niet op het getal.**

---

### 2.2.6 M3 — DRAAGVLAK

> Beeld van 40–62% breed waar informatievlakken ÓP liggen.

| veld | waarde |
|---|---|
| **doelratio** | **1,30 – 1,55** *(B; gemeten master 1,32 en 1,49 = C)* |
| **toegestane bronklassen** | **A · B · C** — alle 25 bruikbare opnamen |
| **maximale verticale snede** | **12%** *(A; gemeten master 10,6%)*. Dit is een ondiepe snede; **geen enkele bron valt erop af**: de laagste gemeten D(0,89) van de hele voorraad is 88,1% (`vve-hero`) |
| **minimale bronbreedte** | 1,40 × kaderbreedte *(A)*. Bij 1100px kader **≥ 1540px**; bij 734px kader **≥ 1028px** |
| **brandpuntzone** | ZONE(0,89); bij DRIFT ≥ 10 declareren. **Let op T1**: bij ratio 1,49 uit een bron van 1,332 snijdt alleen de **y**-as |
| **toegestane schermranden** | **geen**. M3 is de enige behandeling die binnen de marges blijft *(B; gemeten master: 73px links, 31px rechts)* |
| **geometrie-interactie** | **T10 verplicht**, uit de flauwe hoekfamilie **9–14°** *(B; gemeten master 13,0° en 9,7°)*. Dit is de enige behandeling die de flauwe familie gebruikt |
| **scrim** | verplicht **zodra er witte vlakken op het beeld liggen**: richtingsscrim met ≥ 4 stops, donkerste stop aan de kaartkant. Gemeten winst op de master: ×1,15 · ×1,46 · ×1,62 · ×1,59 *(overgenomen bewijs)*. Ligt er een **dekkende** donkere strook op, dan mag de scrim weg *(gemeten master S6)* |
| **tekstinteractie** | **geen kaal type** op beeldpixels; alle tekst zit in een vlak. Een tekstblok mag de beeldrechthoek overlappen zolang **≤ 0,5%** van zijn meetvlak beeldpixels is *(A; geijkt op de enige gemeten overlap, 0,1%)* |
| **vlakinteractie** | **dit ís de behandeling**: ≥ 1 vlak dat aan de definitie van 2.3.2 voldoet. Een M3 zonder vlak is een rechthoek naast tekst |
| **responsieve transformatie** | masker → radius 12px; ratio → vaste hoogte; de vlakken gaan van *op het beeld* naar *kruisend met de onderrand* |
| **wanneer NIET** | er ligt geen enkel vlak op · onder 40% vw (dan blijft naast een kaartkolom van 422px te weinig beeld over) · het onderwerp staat aan dezelfde kant als de kaartkolom |

> **REAL-ASSET FEASIBILITY = PASS, 25 van 25 bruikbare opnamen bij een kader ≤ 1000px;
> 24 van 25 bij een kader van 1100px** (`img/ems-tech` 1400px haalt 1,40× niet boven een kader van
> 1000px). M3 is de enige behandeling die de hele voorraad kan dragen. **Dat maakt M3 het
> werkpaard van V1.3** en niet, zoals in V1.2, een nevenbehandeling met plafond 2×.

---

### 2.2.7 M4 — BAND

> Brede liggende strook op een diagonale ondergrond; de kaart kruist de beeldrand.

| veld | waarde |
|---|---|
| **doelratio** | **3,15 – 3,40** *(B; gemeten master 3,26 = C)* |
| **toegestane bronklassen** | **A · B · C** — expliciet ook C. *Bewijs: de master draagt M4 met `exploitatie-hero`, een grondopname van een wandlader, en snijdt daar 59,1% van de hoogte af.* Dit weerlegt de regel *"klasse C nooit M4"* uit het bewijsdocument |
| **maximale verticale snede** | **60%** *(A; gemeten master 59,1%)*, mits **C(0,41) ≥ 1,20** *(A; gemeten masterdrager 1,26, marge 0,06)* |
| **minimale bronbreedte** | 1,40 × kaderbreedte *(A)*. Bij 956px kader: **≥ 1338px** |
| **brandpuntzone** | ZONE(0,41). *Gemeten masterdrager: 24–65%, DRIFT 0,7 — vlak profiel, de middenwaarde volstaat.* Zes opnamen hebben hier DRIFT ≥ 10 en **moeten** declareren: `waarom-vibe-hero` 25,7 · `microgrids-hero` 22,2 · `purmerend` 17,9 · `hedin-alkmaar-1` 15,9 · `energieopslag-hero` 12,6 |
| **toegestane schermranden** | **geen voor het beeld**; de ondergrond (T4) loopt wél de rand uit en de kaart komt tot 10px van de rand *(B)* |
| **geometrie-interactie** | **T4 verplicht**: de diagonaal zit **niet in het beeld maar in de ondergrond**, steekt boven en onder het beeld uit en loopt de schermrand uit. Zonder die ondergrond is M4 een afgeronde rechthoek |
| **scrim** | **toegestaan afwezig** — de enige behandeling waarbij dat mag. Dan geldt **M4-O**: het vlak dat erop ligt draagt een tweetraps schaduw met negatieve spreiding, en de vlak/veldscheiding mag tot **2,2:1** zakken *(A; geijkt op de gemeten ondergrens 2,24:1)*. Zie DR-I-09 |
| **tekstinteractie** | **geen tekst** op het beeld buiten de kaart |
| **vlakinteractie** | **T9 verplicht**: één bewijsvlak dat de beeldrand **kruist** — ≥ 75% van de kaart op de beeldrechthoek, en hij steekt er aan ≥ 1 kant overheen *(B; gemeten master 80,8% en 56px + 8px)* |
| **responsieve transformatie** | de kruising overleeft maar kantelt: de kaart kruist de **onderrand** in plaats van de zijrand, met een vaste pixelmaat *(gemeten master 26px op alle drie de mobiele breedtes)*. De diagonale ondergrond verdwijnt |
| **wanneer NIET** | geen diagonale ondergrond · geen kaart die de beeldrand kruist · ratio onder 3,0 (dan is er te weinig hoogte voor de kruising) · bron haalt C(0,41) < 1,20 |

> **REAL-ASSET FEASIBILITY = PASS, 16 dragers.**
> **A (7):** `hedin-amsterdam` 1,62 · `purmerend` 1,34 · `hedin-alkmaar-2` 1,31 ·
> `burchtstraat` 1,27 · `dormio` 1,24 · `ratio-16` 1,21 · `kantoor-hero` 1,21.
> **B (1):** `schouwburgring` 1,70.
> **C (8):** `waarom-vibe-hero` 1,65 · `microgrids-hero` 1,60 · `zonnepanelen-hero` 1,59 ·
> `hedin-alkmaar-1` 1,48 · `over-ons-hero` 1,43 · `laadpalen-hero` 1,31 · `exploitatie-hero` 1,26 ·
> `energieopslag-hero` 1,21.
> **Afgevallen (9):** `hedin-alkmaar` 1,18 · `beethovenstraat` 1,18 · `arnhem-60` 1,14 ·
> `ketsheuvel` 1,13 · `hedin-alkmaar-3` 1,13 · `nieuw-schoonoord` 1,12 · `ems-tech` 1,10 ·
> `ratio16` 1,07 · `vve-hero` 1,05.

**Waarom een grondopname hier wél werkt en in M1 niet.** `exploitatie-hero` heeft 9,3% lucht en
C(0,41) = 1,26: boven de wandlader zit lucht, eronder grind. Een band van 3,26 neemt precies die
dode randen weg. Bij M1 valt diezelfde bron af op de klasse-eis (C mag geen 100%-vw-podium
dragen), niet op de snede. **De klasse begrenst de dominantie, de meting begrenst de snede.**

---

### 2.2.8 M5 — KAARTBEELD

> Het beeld zit binnen een donkere kaart, tot de kaartranden; de kaarten zijn ongelijk van breedte.

| veld | waarde |
|---|---|
| **doelratio** | twee groepen: **staand 0,55–1,00** en **liggend 1,45–1,60** *(B; gemeten master 0,59/0,61/0,98 en 1,53/1,54 = C)* |
| **toegestane bronklassen** | **A · B · C** |
| **maximale snede** | dit is de enige behandeling waar **de breedte** wordt gesneden, tot **56%** *(A; gemeten master 55,7% bij de laadkaart)*, mits **C_breedte(0,50) ≥ 1,05**. *De drempel is op 0,50 gemeten, niet op 0,44 — **NIET GEMETEN** op de exacte keep-waarde van elke kaart; 0,50 wordt als benadering gebruikt en dat staat hier* |
| **minimale bronbreedte** | 1,40 × kaderbreedte *(A)*. Bij 487px kader: **≥ 682px** — geen enkele bron valt hierop af |
| **brandpuntzone** | ZONE op de **x**-as. Bij staande kaarten is de y-waarde **inert** (2.0.5) en wordt niet gedeclareerd |
| **toegestane schermranden** | **geen**, op geen enkele breedte. Het beeld loopt wél tot alle vier de **kaartranden**: de kaart *is* de foto |
| **geometrie-interactie** | **geen** geometrie op de foto's; de vorm komt van de kaartradius |
| **scrim** | **verplicht**, richtingsscrim per rij, donkerste kant waar de tekst staat. Zonder scrim zakt de gemeten kop van 17,02:1 naar **3,97:1** *(overgenomen bewijs)* |
| **tekstinteractie** | **alle** kaarttekst kaal op beeldpixels; er is geen tweede oppervlak |
| **vlakinteractie** | hooguit één klein vlak (pijlknop, statistiekbalk); **geen** informatievlak |
| **responsieve transformatie** | hoogtes worden `min-height`; de dichte scrimzone rekt mee met de kortere kaart |
| **wanneer NIET** | **nooit met gelijke tegels** — de gemeten signatuur is 1,61 : 1,00 : 0,97 · nooit zonder richtingsscrim · niet als er tekst **buiten** de kaart op het beeld moet (dan is het M2 of M3) |

> **REAL-ASSET FEASIBILITY = PASS, 25 van 25 bruikbare opnamen.**
> Drie halen C_breedte(0,50) < 1,05 en mogen daarom alleen in de **liggende** groep, waar de
> hoogte wordt gesneden en niet de breedte: `projects/burchtstraat` 1,04 ·
> `projects/arnhem-60` 1,04 · `projects/nieuw-schoonoord` 1,02.
> De master gebruikt hier vijf opnamen, waarvan er één (`ems-hero`) klasse D is — zie DR-I-07.

---

### 2.2.9 M6 — HOEKBEELD

> Beeld vast aan één schermrand, gesneden op de merkhoek; een kaart over de binnenrand.

| veld | waarde |
|---|---|
| **doelratio** | twee rollen: **groot 1,40–1,55** en **klein 0,60–0,75** *(B; gemeten master 1,48 en 0,67 = C)* |
| **toegestane bronklassen** | groot: **A** onbeperkt, **B/C** met T9 · klein: **A · B · C** |
| **maximale snede** | groot: **12% van de hoogte** *(A; gemeten master 10,0%)* · klein: **50% van de breedte** *(A; gemeten master 50,0%)*, mits **C_breedte(0,50) ≥ 1,05** |
| **minimale bronbreedte** | 1,40 × kaderbreedte *(A)*. Groot (935px): **≥ 1309px** · klein (350px): **≥ 490px** |
| **brandpuntzone** | groot: ZONE op de **y**-as (de x-as is inert, 2.0.5) · klein: ZONE op de **x**-as |
| **toegestane schermranden** | **verplicht ≥ 1**, en altijd dezelfde kant binnen één pagina. *Gemeten master: beide instanties rechtsgebonden, chevronpunt naar binnen (C HOMEPAGE-SPECIFIEK; links is niet verboden, maar niet gemengd)* |
| **geometrie-interactie** | **T10 verplicht**, scherpe hoekfamilie **27–37°** *(B; gemeten master 35,4/32,7° en 31,6/28,1°)*, plus T4: de chevron loopt over de volle sectiebreedte |
| **scrim** | verplicht. Vignet toegestaan als alle tekst op een eigen vlak staat *(gemeten master: witte kaart 5,14:1 met scrim tegen 2,10:1 zonder)* |
| **tekstinteractie** | **geen kaal type op beeldpixels bij de grote rol**. Bij de kleine rol alleen decoratief type, en dan geldt de uitzondering hieronder |
| **vlakinteractie** | groot: T9 verplicht, ≥ 90% van de kaart op beeldpixels *(gemeten master 100%)* · klein: geen vlak |
| **responsieve transformatie** | masker → radius; de kaart kruist de **onderrand** *(gemeten master 34px)*; de kleine rol **verdwijnt volledig** onder 1200px |
| **wanneer NIET** | het beeld mag geen schermrand raken · twee instanties op dezelfde maat (de gemeten twee verschillen factor 2,67) · de kleine rol met dezelfde opname als een ander beeld op de pagina op minder dan factor 1,5 verschil |

> **REAL-ASSET FEASIBILITY = PASS.**
> **Grote rol:** alle 10 klasse-A-opnamen (alle ≥ 2400px, alle D(0,89) ≥ 90,9%), plus B/C met T9.
> **Kleine rol:** 22 van 25 opnamen halen C_breedte(0,50) ≥ 1,05; af vallen
> `projects/burchtstraat` 1,04 · `projects/arnhem-60` 1,04 · `projects/nieuw-schoonoord` 1,02.

**Herziening van M6-O.** V1.2 legt vast dat type op beeldpixels onder elke leesbaarheidsgrens mag
blijven (gemeten 2,00:1, bij het lichtste 5% **1,43:1**) zolang het `aria-hidden` is.
**Dat wordt hier ingetrokken.** Decoratief type dat niemand kan lezen is geen ontwerpmiddel maar
een restant. Vervanging:

> **DR-I-10.** Type op beeldpixels haalt **mediaan ≥ 5,5:1** en **ongunstigste monster ≥ 3,9:1**,
> of het staat er niet. *(A TRANSFERABLE FLOOR; geijkt op de laagste gemeten waarden van gekleurd
> type op de master: 5,55:1 mediaan, 3,95:1 ongunstigst.)* Er is geen `aria-hidden`-uitzondering.
> De gemeten footernotitie (2,00:1) voldoet niet en vervalt.

---

### 2.2.10 Samenvatting feasibility

| behandeling | FEASIBILITY | dragers | binnen de voorraad |
|---|---|---:|---|
| M0 GEEN FOTO | **N.V.T.-met-reden** | — | geen bestand; verhuist naar hoofdstuk 3 |
| M1 PODIUM | **PASS** | **3** | `hedin-alkmaar-2` · `hedin-amsterdam` · `purmerend` |
| M2 PANEEL | **PASS** | **10 + 2** | 10× klasse A · 2× klasse B met T9 |
| M3 DRAAGVLAK | **PASS** | **25** | de hele bruikbare voorraad |
| M4 BAND | **PASS** | **16** | 7 A · 1 B · 8 C |
| M5 KAARTBEELD | **PASS** | **25** | 4 alleen in de liggende groep |
| M6 HOEKBEELD groot | **PASS** | **10 + T9** | 10× klasse A |
| M6 HOEKBEELD klein | **PASS** | **22** | — |

**Geen behandeling gaat eruit en geen behandeling wordt PENDING.** De bewering van V1.2 dat M1,
M2 en M4 onbouwbaar zijn, is onjuist en blijft ingetrokken. Wat wél waar is: **M1 is bouwbaar op
3 van de 27 opnamen**, en dat is een schaarsteprobleem, geen bouwbaarheidsprobleem. Het antwoord
daarop staat in 2.4 en in hoofdstuk 3, niet in het schrappen van M1.

---

## 2.3 DE TWEEMIDDELENREGEL, HERZIEN

### 2.3.1 Wat "een beeld" is

V1.2 telt elk element met `background-image: url(` als beeld. De criticus haalde daarmee
**zes poorten tegelijk** met negen kinderloze divs met een volledig transparante 1×1 GIF,
uitgerekt tot 1774 × 900px. De definitie moet verschijning meten, niet syntaxis.

> **DR-I-11 — definitie BEELD.** *(A TRANSFERABLE FLOOR)*
> Een **beeld** is een gerenderde rechthoek die aan **alle vier** voldoet. Elk criterium wordt
> gemeten op de gerenderde pagina, niet op de CSS.
>
> | # | criterium | drempel | ijking |
> |---|---|---|---|
> | **B-a** | **herkomst** — een `<img>` met `complete === true` en een `naturalWidth > 0`, óf een `background-image` met een gedecodeerde bron | bestaat | de master: 13 van 13 zijn `img` met `complete` |
> | **B-b** | **resolutie** — `naturalWidth ≥ 1,40 × de gerenderde CSS-breedte` | **1,40×** | laagste gemeten masterwaarde 1,44× (S1); hoogste 4,11× (S9) |
> | **B-c** | **dekking** — gemiddelde alfa over 400 monsters van de gerenderde rechthoek | **≥ 0,90** | de master meet 1,00 op alle dertien (ondoorzichtige JPEG/WebP). **De marge van 0,10 is een keuze, geen meting** — zie DR-I-13 |
> | **B-d** | **inhoud** — luminantiespreiding p95 − p05 over diezelfde 400 monsters | **≥ 0,15** | zelf gemeten over alle 37 bronnen: laagste **0,366** (`vve-hero`), mediaan 0,756, hoogste 0,893. Een effen vlak meet 0,000. De drempel ligt op 41% van de laagste echte foto |
>
> Een rechthoek die B-a t/m B-d niet alle vier haalt, **is geen beeld** en telt in geen enkele
> teller mee — niet in beelddekking, niet in de noemer van een verhoudingspoort, en niet als
> ondergrond voor een informatievlak.
>
> **Toetsuitslagen.** PASS = ≥ 1 rechthoek haalt B-a..B-d. FAIL = er zijn rechthoeken maar geen
> enkele haalt het. **N.V.T.-met-reden** = de sectie is als DOCUMENT MODE gedeclareerd en vraagt
> geen beeld. Nul beelden is **nooit** PASS.

Dit sluit de transparante GIF (faalt B-c: alfa 0,00), het effen pseudo-beeld (faalt B-d: spreiding
0,00) en het 1×1-bronbestand (faalt B-b: `naturalWidth` 1) alle drie af.

### 2.3.2 Wat "een vlak" is

V1.2 telt een vlak zodra `backgroundColor` niet exact transparant is. De criticus haalde dat met
`rgba(255,255,255,.01)`.

> **DR-I-12 — definitie VLAK.** *(A TRANSFERABLE FLOOR)*
> Een **vlak** is een element dat aan **alle drie** voldoet:
>
> | # | criterium | drempel | ijking |
> |---|---|---|---|
> | **V-a** | **maat** — eigen oppervlak | **≥ 0,95% van vw²** (= 30.000px² @1774) | kleinste masterkaart op een beeld 53.172px²; grootste B2-vlak dat de 50%-eis haalt 24.600px² *(overgenomen bewijs)* |
> | **V-b** | **zichtbaarheid** — gemeten luminantiecontrast met de ondergrond eronder, het vlak verborgen en een afdruk van zijn rechthoek genomen | **≥ 2,2:1** | laagste gemeten masterwaarde 2,24:1 (de kaart van M4 zonder scrim) *(overgenomen bewijs)* |
> | **V-c** | **ligging** — aandeel van het **eigen** oppervlak dat op gerenderde beeldpixels valt | **≥ 50%** | master 81–100%; B2 3,2–22,3% *(overgenomen bewijs)* |
>
> V-b is de regel die de ontduiking sluit: `rgba(255,255,255,.01)` meet **1,00:1** en is dus geen
> vlak. V-b vervangt elke toets op `backgroundColor !== transparent`.

### 2.3.3 Wat "dekking" is

> **DR-I-13 — definitie DEKKING.** *(A voor de methode, B voor de drempel)*
> **Dekking** is nooit een CSS-waarde. Het is de gemeten alfa van het **samengestelde** oppervlak:
> bemonster 400 punten van de rechthoek, met alle afstammelingen van het element verborgen en de
> achtergrond eronder vervangen door twee bekende kleuren (zwart en wit); de alfa volgt uit het
> verschil tussen beide metingen.
> Voor **beelden** geldt de drempel ≥ 0,90 (B-c). Voor **vlakken** wordt geen aparte
> alfadrempel gesteld: V-b (contrast ≥ 2,2:1) meet hetzelfde verschijnsel beter, omdat een
> donker vlak met lage alfa op een lichte foto wél zichtbaar is en een wit vlak met lage alfa niet.
> **De waarde 0,90 is niet geijkt op een gemeten masterbereik** — de master meet 1,00 op alle
> dertien beelden. Het is een gekozen marge. Zie de open besluiten.

### 2.3.4 De regel zelf

> **DR-I-14 — U-1 herzien.** *(A TRANSFERABLE FLOOR)*
> Elk **beeld** (DR-I-11) dat **≥ 10% van de viewportbreedte** meet, draagt **minstens twee** van
> deze vijf middelen:
>
> 1. **masker** — T10: een `clip-path` die **≥ 5% van de beeldrechthoek wegneemt**, gemeten met
>    een punt-in-polygoontoets op 400 monsters. *Niet* "er staat `polygon` in de CSS".
> 2. **scrim** — T6: een verloop over het beeld met ≥ 3 kleurstops **waarvan de gemeten
>    luminantiewinst onder de tekst of onder het vlak ≥ ×1,15 is** *(geijkt op de laagste gemeten
>    masterwinst, ×1,15 bij de eerste infrakaart)*. Een verloop van 3 transparante stops telt niet.
> 3. **dragende geometrie** — T4: een vlak dat het beeld snijdt of draagt, er aan ≥ 1 kant buiten
>    doorloopt, en **zelf ≥ 0,5% van het sectievlak** beslaat *(geijkt op het kleinste gemeten
>    geometrie-element van de master: 85 × 133px = 0,72% van zijn sectie)*.
> 4. **informatievlak** — T9: een **vlak** volgens DR-I-12 (dus inclusief V-b ≥ 2,2:1).
> 5. **kaal type op beeld** — tekst waartussen en het beeldvlak géén enkel vlak zit, met ≥ 70% van
>    zijn rechthoek binnen het beeld, ≥ 50% daarvan op gerenderde beeldpixels, **en een gemeten
>    contrast dat DR-I-10 haalt** (mediaan ≥ 5,5:1, ongunstigst ≥ 3,9:1).
>
> **U-2.** Beelden onder 10% vw zijn vrijgesteld *(geijkt op de enige middelloze uitzondering van
> de master: de duimnagel van 5,5% vw)*.
> **U-3.** Per pagina draagt ≥ 1 beeld **drie of meer** middelen *(gemeten master: vier beelden
> halen 3 of 4)*.
> **U-4 — de losse-rechthoektoets.** Een beeld faalt sowieso als alle drie waar zijn:
> (a) rechthoekig met uniforme radius, geen masker dat ≥ 5% wegneemt; (b) geen vlak en geen type
> eroverheen dat de drempels haalt; (c) alle sectietekst volledig buiten de beeldrechthoek.
>
> **Toetsuitslagen per beeld.** PASS = score ≥ 2. FAIL = score < 2. **N.V.T.-met-reden** = het
> beeld meet < 10% vw (noem de gemeten breedte), of de sectie is DOCUMENT MODE.
> **Een sectie zonder beeld levert nooit PASS op deze regel** — hij levert N.V.T.-met-reden, en
> die telt in 2.4 mee als fotoloze sectie.

**Wat er verandert ten opzichte van V1.2, in één zin per middel:** middel 1 krijgt een
oppervlaktedrempel, middel 2 een gemeten effectdrempel, middel 3 een maatdrempel, middel 4 een
contrastdrempel, en middel 5 een leesbaarheidsdrempel. Alle vijf waren eerder zuivere
syntaxistoetsen.

### 2.3.5 Beelddekking — vereniging, niet som

> **DR-I-16.** *(A voor de methode, B voor de drempel)*
> Beelddekking is het oppervlak van de **vereniging** van alle beeldrechthoeken (rasterbenadering
> op 100 × 400 cellen over het paginavlak), **na aftrek van het weggemaskerde deel**, gedeeld door
> het paginavlak. De som telt drie kopieën van hetzelfde beeld drie keer; de vereniging niet.
> *Gemeten master: 43,7% bruto, **37,2%** na maskeraftrek (overgenomen bewijs).*
> **De drempel van 35% uit V1.2 V-1 vervalt** — hij is onhaalbaar voor 39 van de 48 pagina's
> (overgenomen uit `kritiek-overfitting.md` §3.1) en legt bij een paginadekking van 49,2% per
> beeldsectie op dat **≥ 71% van alle secties** een beeld van homepageproporties draagt.
> Wat ervoor in de plaats komt, staat in 2.4.

### 2.3.6 Rastercel- en zichtbaarheidstoets

> **DR-I-17.** Een element telt als "op een beeld liggend" alleen wanneer het snijvlak op
> **gerenderde beeldpixels** valt, bemonsterd met 400 punten, en elk monster voldoet aan B-c en
> B-d van DR-I-11. De V1.2-implementatie geeft 100% terug zodra er geen `clip-path` is; dat is een
> polygoontoets, geen pixeltoets, en hij laat elk vlak boven elk pseudo-beeld slagen.
> **Een `clip-path` die `calc(` bevat en niet uitleesbaar is, levert MEETFOUT op, nooit stilzwijgend
> "geen masker".**

---

## 2.4 FREQUENTIE, MINIMA EN SCHAARSTE

### 2.4.1 De schaarste, in één tabel

| wat | gemeten |
|---|---:|
| fotografische bronbestanden in `assets/` | 36 |
| verschillende opnamen daarin | **26** |
| plus de opname die alleen in `img/` bestaat en wél gebruikt wordt | 1 |
| **bruikbaar voor ontwerp (A + B + C)** | **25** |
| waarvan paginadragend (A) | **10** |
| waarvan geschikt voor M1 PODIUM | **3** |
| HTML-pagina's in de werkboom *(overgenomen uit `kritiek-overfitting.md` §3.1)* | 48 |
| unieke opnamen die de homepage alleen al gebruikt | **11** |
| aandeel van de hele voorraad dat op één pagina staat | **11 / 27 = 41%** |

Als elke pagina doet wat de homepage doet, is er **11 × 48 = 528** opnamen nodig. Beschikbaar: 27.
**Tekort: factor 19,6.** Dat is geen marge die met beter ontwerp te overbruggen is.

**Gevolg.** Elk paginaminimum dat in beelden is uitgedrukt, is daarom laag, en het verschil wordt
gemaakt door hoofdstuk 3 (niet-fotografische middelen). Een poort die om meer beeld vraagt dan er
is, is geen kwaliteitspoort maar een blokkade.

### 2.4.2 Minima per archetype en per modus

> **DR-I-20.** *(A TRANSFERABLE FLOOR)*

| modus | minimum beelden | minimum klasse | wat als dat er niet is |
|---|---:|---|---|
| **CANVAS MODE** (hero, projectbewijs, productvisualisatie, slot-CTA) | **≥ 1** | ≥ 1 beeld van klasse **A** óf **B met T9** | de sectie gaat naar een **niet-fotografisch podium** (hoofdstuk 3) en wordt dan geteld als CANVAS-sectie zonder foto; de pagina faalt niet |
| **HYBRID MODE** (redactionele kolom naast een podium) | **≥ 1** | A · B · C | idem |
| **DOCUMENT MODE** (FAQ, juridisch, technische registers, lange tekst) | **0** | — | **niets.** DOCUMENT MODE is vrijgesteld van elk beeldminimum, van DR-I-14 (U-1) en van DR-I-16. De vrijstelling moet gedeclareerd zijn (`data-canvas-mode="document"`), anders geldt hij niet |

> **De vrijstelling is niet gratis.** Een DOCUMENT-MODE-sectie moet de minima van hoofdstuk 3
> halen. Een sectie die noch een beeld noch een niet-fotografisch middel draagt, is **FAIL** —
> in geen enkele modus.

**Waarom geen minimum per pagina in aantallen.** V1.2 V-2 (≥ 1 beeld ≥ 90% vw) en V-3
(≥ 50% van de beeldsecties heeft een beeld ≥ 50% vw) zijn rekenkundig onhaalbaar voor de 17
pagina's met één beeld en de 4 met nul *(overgenomen uit `kritiek-overfitting.md` §3.1)*.
V-2 en V-3 vervallen. Wat blijft:

> **DR-I-21.** Op een pagina met **≥ 3 beelden** geldt: hoogste ÷ laagste beeldbreedte **≥ 3,0**
> *(A; gemeten master 6,06 zonder de duimnagel, B2-kandidaat 1,16)*.
> Op een pagina met **1 of 2 beelden** is deze toets **N.V.T.-met-reden** (noem het aantal).
> Hij wordt dan **niet** als PASS geboekt en de pagina moet in plaats daarvan het
> schaalverschil van hoofdstuk 3 halen.

### 2.4.3 De fotoloze fractie

V1.2 F-6 zegt: "minstens één sectie zonder foto — bovengrens 1, ondergrens 0". Dat is een plafond
zonder vloer en het is precies de klasse regel die de criticus gratis haalt. Vervanging:

> **DR-I-22.** *(A TRANSFERABLE FLOOR)*
> Per pagina geldt een **vloer én een plafond** op het aandeel secties zonder beeld:
>
> | modus van de pagina | fotoloze secties toegestaan |
> |---|---|
> | overwegend CANVAS | **≤ 40%** van de secties, en **≥ 1** |
> | overwegend HYBRID | ≤ 60%, en ≥ 1 |
> | overwegend DOCUMENT | **geen bovengrens**; 100% fotoloos is toegestaan |
>
> *Gemeten master: 1 van 9 = 11,1% fotoloos (C HOMEPAGE-SPECIFIEK).* Het plafond van 40% is
> **geen gemeten waarde** maar een keuze; de master zit er ruim onder en een pagina met 5 van 12
> fotoloze secties zit er net onder. Zie de open besluiten.
> **Elke fotoloze sectie draagt een middel uit hoofdstuk 3.** Een lege sectie is geen fotoloze
> sectie maar een gat, en is FAIL.

### 2.4.4 Frequentie per behandeling

> **DR-I-23.** *(B REFERENTIEBEREIK, met twee A-vloeren)*

| behandeling | max per pagina | plaatsgebondenheid | bron |
|---|---:|---|---|
| M0 | **geen plafond** | — | V1.2's 1× is ingetrokken (2.2.3) |
| M1 PODIUM | 1 | alleen de eerste sectie | gemeten master: paginapositie 0–13,3% *(C)* |
| M2 PANEEL | 1 | niet in de eerste en niet in de laatste sectie | gemeten master: 26,4–37,6% *(C → B)* |
| M3 DRAAGVLAK | **4** | vrij | V1.2 stond 2× toe; met 25 dragers en M3 als werkpaard wordt dat 4. **Dit is een keuze, geen meting** |
| M4 BAND | 1 | vrij | gemeten master 1× |
| M5 KAARTBEELD | 1 sectie, 2–6 beelden erin | vrij | gemeten master: 1 sectie met 5 |
| M6 HOEKBEELD | 2 | laatste 25% van de pagina | gemeten master 81,5–100% *(C → B)* |

> **MFQ-02 blijft, maar per behandeling:** komt een behandeling twee keer voor, dan verschillen de
> beeldbreedtes **factor ≥ 1,5** *(A; gemeten master M3 1,50 en M6 2,67)*.
> **MFQ-05 wordt een vloer én een plafond:** maximaal **2** beelden ≥ 90% vw per pagina, en nooit in
> opeenvolgende secties *(gemeten master 100% en 96,1% met S2 ertussen)*. Heeft de pagina geen
> enkel beeld ≥ 90% vw, dan is dat **toegestaan** — V-2 is vervallen (2.4.2).

### 2.4.5 Hergebruik van dezelfde opname

Met 25 bruikbare opnamen voor 48 pagina's is hergebruik onvermijdelijk. Het moet dus geregeld
worden in plaats van stilzwijgend gebeuren.

> **DR-I-24.** *(A TRANSFERABLE FLOOR)*
> Dezelfde opname mag **tweemaal** op één pagina verschijnen, en dan alleen als:
> (a) de beeldbreedtes **factor ≥ 1,5** verschillen, **of**
> (b) de tweede instantie een duimnagel **< 10% vw** is.
> Een derde instantie is FAIL.
>
> **De master haalt deze regel één keer wel en één keer niet:**
> - `ratio-16` op 41,4% en 5,5% vw = factor **7,5** → PASS (en (b) geldt ook).
> - `microgrids-hero` op 17,0% (S2-accu) en 19,7% vw (S9-footer) = factor **1,16** → **FAIL**.
>
> De code erkent dat zelf: `home-footer.css:370-371` verbergt de footerband onder 1200px met als
> reden dat hij *"dezelfde batterijkasten als sectie 2 en 7 toont"*. Dat is een mobiele remedie
> voor een desktopprobleem. **Dit is een gemeten tekortkoming van Master v1, geen reden om de
> regel te verzwakken.**

Over pagina's heen:

> **DR-I-25.** *(B REFERENTIEBEREIK)* Dezelfde opname op meer dan **vier** pagina's in dezelfde
> navigatiegroep mag niet de dominante opening van elk van die pagina's zijn. Met 2 M1-dragers
> voor 48 pagina's is dit de bindende beperking op M1, niet de bouwbaarheid.
> **NIET GEMETEN:** welke opname nu op hoeveel pagina's staat. Ik heb de 48 pagina's in deze
> sessie niet geïnventariseerd; de telling van 48 komt uit `kritiek-overfitting.md` §3.1.

### 2.4.6 PENDING — wat er niet is

> **DR-I-26.** Een onderwerp zonder bruikbaar beeld krijgt de status **PENDING** en daarmee
> behandeling **M0**. PENDING is **geen plaatshouder**: `brandbook §1A.11.5` verbiedt
> plaatshouders en `brandbook §4.4.4` legt vast dat de eigen vormtaal de **eindbehandeling** is,
> niet een tussenstand. Een PENDING-sectie wordt dus afgebouwd alsof er nooit een foto komt.
>
> **Gemeten PENDING-onderwerpen** (uit de markup van de master, overgenomen bewijs):
> HVAC (`index.html:399-401`) · sectorfotografie (`index.html:918-920`) · energiehandel
> (`index.html:435-436` — en de huidige invulling is een **synthetisch** beeld, zie 2.1.2).
> **NIET GEMETEN:** welke onderwerpen op de overige 47 pagina's PENDING zijn.

---

## 2.5 CONFLICTEN MET V1.0 / V1.1 / V1.2

| # | conflict | bron A | bron B | besluit hier |
|---|---|---|---|---|
| **CH2-01** | De focuspuntregel is afgeleid uit twee **inerte** waarden | `vibe-image-system-v1.md` §5-D en DR-V-23: *"minstens 24 procentpunten weg van de bedekte kant"*, afgeleid uit 26% (S7) en 78% (S8) | zelf nagerekend: bij S7 is `overloopX` = 0px, bij S8 = 0px — beide x-waarden doen niets | **De focuspuntregel vervalt.** Vervangen door T1 + T7 (2.2.1): eerst de snijdende as berekenen, dan alleen op die as declareren |
| **CH2-02** | `brandbook §4.2.1` Principe 1 steunt op vijf waarden waarvan er één acteert | `vibe-web-brandbook-v1.md` §4.2.1, tabel met 26% · 78% · 6% · 54% · 50% | zelf nagerekend: alleen 6% (S2-laad) heeft horizontale overloop | **§4.2.1 Principe 1 wordt herschreven als T1.** §4.2 valt **niet** onder de bevroren §1A, dus dit raakt de frozen baseline niet |
| **CH2-03** | De master gebruikt een synthetisch beeld en noemt het echt | `index.html:435-436`: *"wel de echte meetlaag waarop flexibiliteit wordt afgerekend"* | zelf bekeken op 1:1: gespiegelde pseudo-tekst op de meters, twee displays met identiek `15308 kWh`; `brandbook §4.4.1` verbiedt gegenereerd beeld | **`ems-hero` is klasse D.** Zie DR-I-07 voor het overgangsbesluit |
| **CH2-04** | "Informatievlak op een beeld" heeft vier definities en vier drempels | `gate P-04` (≥150×80px, ≥3 secties) · `image V-5` (≥30.000px², ≥2 secties) · `blueprints R3` (≥50% van de secties) · `forensics-homepage.md` (elk overlappend vlak) | — | **Eén definitie: DR-I-12.** De andere drie worden ingetrokken. 150×80 = 12.000px² is 2,5× zwakker dan V-5 en wordt niet overgenomen |
| **CH2-05** | M0 mag 1× per pagina, maar archetype B2 vraagt er 3 à 4 | `image §9 MFQ-01` | `blueprints §6` rij B2 (B07 · B05 · B06, optioneel B13) | **M0 krijgt geen plafond** (2.2.3). De fotoloze *fractie* wordt begrensd (DR-I-22) |
| **CH2-06** | V-1 (≥35% beelddekking) is onhaalbaar voor 39 van de 48 pagina's | `image §10 V-1` | `kritiek-overfitting.md` §3.1 en §4.2 | **V-1 vervalt** (DR-I-16); de vereniging vervangt de som, en de drempel verhuist naar de modus-minima van 2.4.2 |
| **CH2-07** | V-8 eist dat 100% van de beeldsecties V-5 of V-6 haalt; bij 1 beeld dwingt dat tekst op dat beeld | `image §10 V-8` | `kritiek-overfitting.md` §6.1 | **V-8 vervalt.** DR-I-14 (U-1) toetst per beeld met drie uitslagen; een lege verzameling is N.V.T.-met-reden, nooit PASS en nooit een dwang |
| **CH2-08** | `M6-O` laat type van 1,43:1 toe | `image §8` regel M6-O en DR-V-22 | `kritiek-overfitting.md` §6.3 | **M6-O vervalt**, vervangen door DR-I-10 |
| **CH2-09** | Het DR-V-nummerblok 20–29 is dubbel uitgegeven | `vibe-image-system-v1.md` §16 | `vibe-card-system-v1.md` §7 | **Dit hoofdstuk gebruikt uitsluitend `DR-I-xx`** en raakt geen DR-V-nummer aan |
| **CH2-10** | Het bewijsdocument noemt twee duplicaatparen die er geen zijn, en mist er vijf | `BEWIJS-assets.md` §2 | zelf gemeten, 630 paren | **De tabel van 2.1.2 is leidend** |
| **CH2-11** | `projects/ratio16.jpg` draagt de naam van een project dat er niet op staat | de bestandsnaam | zelf gemeten: het homepage-derivaat voor "Ratio 16, Duiven" matcht `ratio-16.jpg`, niet `ratio16.jpg` | **`ratio16.jpg` is klasse B met onbekend onderwerp**; de naam is misleidend. Hernoemen is een repo-ingreep en valt buiten dit document |

---

## 2.6 WAT IK NIET HEB GEMETEN

| onderwerp | reden |
|---|---|
| De gerenderde pagina | Geen browser gedraaid in deze sessie. Elke kadermaat, elk % vw, elke scrimstop en elke contrastverhouding in dit hoofdstuk is **overgenomen** uit het aanvaarde bewijs en als zodanig gemerkt |
| Contrast van welk beeld dan ook | Vereist een afdruk van de gerenderde rechthoek. Alle contrastgetallen zijn overgenomen |
| De 48 pagina's | Niet geïnventariseerd. Het getal 48, de verdeling 0/1/2/≥3 beelden en de 23 pagina's zonder `data-screen-label` komen uit `kritiek-overfitting.md` §3.1 |
| `assets/systeem/` | Derivaten; niet geteld en niet aan bronnen gekoppeld |
| De twee videobestanden | `recreatie-hero.mp4` en `projects/arnhem-drone.mp4`. Video valt buiten dit hoofdstuk; er is geen behandeling voor en geen meting van |
| De bron van `s6-thumb` | Dichtstbijzijnde match `ratio-16` op 1,037 — ruim buiten de duplicaatband. **NIET SLUITEND** |
| Welk project `projects/ratio16.jpg` toont | Geen bijschrift, geen alt-tekst, geen commentaar |
| C_breedte op de exacte keep-waarde van elke M5-kaart | Gemeten op keep 0,50; de kaarten snijden 0,44–0,46. De benadering wordt in 2.2.8 genoemd |
| De alfadrempel 0,90 (DR-I-11 B-c) | De master meet 1,00 op alle dertien beelden. 0,90 is een gekozen marge, geen gemeten bereik |
| Het plafond van 40% fotoloze secties (DR-I-22) | Een keuze. De enige meting is de master: 11,1% |
| Het plafond van 4× M3 (DR-I-23) | Een keuze, afgeleid uit 25 dragers. De master meet 2× |
| Gedrag boven 1774px | Niet gemeten; de verwachting van lineair doorschalen in `cqw` is een verwachting, geen meting |
| Of de 36 bronnen rechtenvrij zijn | Niet onderzocht. Buiten scope |

---

## 2.7 OPEN BESLUITEN

- **DR-I-01** — Wordt de canonieke naam per duplicaatgroep (2.1.5) vastgelegd en worden de tien
  tweede namen uit de repo verwijderd, of blijven ze staan met een verwijzing? Gemeten gevolg van
  laten staan: 10 bestanden die volgens de klassetabel niets mogen dragen.
- **DR-I-02** — `energielabel-hero.jpg` en `projects/nieuw-schoonoord.jpg` zijn **byte-identiek**
  (zelfde md5, zelfde 784.429 bytes). Eén van beide weg, of een symlink?
- **DR-I-05** — Wordt de inerte-as-toets (2.0.5) een poort die **faalt** bij een gedeclareerde
  waarde op een as zonder overloop, of alleen een waarschuwing? De master zou er zeven keer op
  afgaan.
- **DR-I-06** — M1 is bouwbaar op **3** opnamen. Wordt M1 beperkt tot de homepage en twee
  hoofdpagina's, of komt er een niet-fotografische M1-variant in hoofdstuk 3?
- **DR-I-07** — `ems-hero` is synthetisch en draagt op de master `s2-handel` (20,0% vw). Drie
  opties: (a) de kaart gaat naar M0 en krijgt een niet-fotografisch middel; (b) het beeld blijft
  totdat er een echt meetbeeld is, met als voorwaarde dat de dichte scrimzone de opdruk dekt —
  gemeten ligt de opdruk op 54–60% van de beeldhoogte en loopt de scrim van 46% tot 100% op .90;
  (c) het beeld gaat er nu uit. **Dit is geen meting maar een merkbesluit.**
- **DR-I-08** — `projects/hedin-alkmaar-4.jpg` (1200×1600) is als klasse D ingedeeld op kadrering.
  Blijft het bestand in de repo?
- **DR-I-09** — M4 mag zonder scrim met een vlak/veldscheiding van 2,2:1. Blijft die uitzondering,
  of wordt een scrim ook bij M4 verplicht? Gemeten gevolg van verplichten: de witte kaart klimt van
  2,24:1 naar minstens 5:1, maar de band wordt donkerder dan de gemeten mediaan L 0,419.
- **DR-I-13** — De alfadrempel 0,90 voor beelden is niet geijkt. Op 1,00 zetten (gelijk aan de
  gemeten master) is strenger maar sluit elk legitiem beeld met een transparante rand uit.
- **DR-I-18** — Is er een bovengrens aan hoe vaak één opname over de hele site mag voorkomen?
  Met 25 opnamen voor 48 pagina's is gemiddeld bijna 2 pagina's per opname onvermijdelijk.
- **DR-I-19** — Video (`recreatie-hero.mp4`, `arnhem-drone.mp4`) heeft geen behandeling. Krijgt
  het er een, of blijft het buiten het systeem?
- **DR-I-22-b** — Het plafond van 40% fotoloze secties in CANVAS MODE is een keuze. Vastleggen op
  40%, of op de gemeten masterwaarde 11,1% (strenger, maar dan haalt alleen de homepage het)?
- **DR-I-27** — Hoofdstuk 3 moet MEDIUM-secties **zelfstandig** kunnen dragen. Dit hoofdstuk legt
  de last daar neer (2.4.2, 2.4.3, DR-I-26) maar toetst hem niet. De minima van hoofdstuk 3 moeten
  minstens zo streng zijn als DR-I-14, anders is de fotoloze route de goedkope route.


---

# H3 · VLAKKEN, HIERARCHIE EN REGISTERS

**Vibe Web Design System V1.3 — REPARATIE. Hoofdstuk 3.**

| | |
|---|---|
| **Status** | V1.3 — REPARATIE van de V1.2-laag. V1.0 (`vibe-web-brandbook-v1.md` §1A) blijft `FROZEN` en wint bij elke tegenspraak. V1.1 (`vibe-section-compositions-v1.md`) blijft geldig. |
| **Wat dit hoofdstuk vervangt** | De uniciteitstelling van `vibe-card-system-v1.md` §1 en §3.3, de drie grenzen van §4.8 (GRENS 1 · 2 · 3), de rij-regel §4.1 (C1), en de ontbrekende registerlaag die `papiertest.md` §8.1 vaststelt. |
| **Wat dit hoofdstuk toevoegt** | Vier vlakrollen, één rangregel, vijf registers (`REG-1`…`REG-5`) en zes niet-fotografische middelen (`NF-1`…`NF-6`). |
| **Productiecode** | **geen gewijzigd.** Geen HTML, CSS, JS, asset of screenshot. Niet gecommit, niet gepusht. Dit is één documentbestand. |
| **Besluitprefix** | `DR-S-01` … `DR-S-12`. |
| **Poortprefix** | `S3-00` … `S3-24`, vijfentwintig poorten, lijst in §3.10. Bewust gescheiden van `P-01…P-16` (quality gate), `G01…G24` (grammatica), `C1…C12` (composities) en `P1…P16` (principes in V1.1) — die vier reeksen botsen al onderling, zie `vibe-web-brandbook-v1.md` §1A.12 punt 5. |

---

## 3.0 · Leesinstructie — vier dingen die in elke regel hieronder gelden

### 3.0.1 Herkomstclassificatie van elk getal

Elk getal dat uit de Homepage Master v1 komt, is **bewijs**, geen automatische regel. Daarom draagt
elk getal hieronder één van vier merken:

| merk | betekenis | wordt het een poort? |
|---|---|---|
| **A** TRANSFERABLE FLOOR | geldt overal, op elke pagina, in elke modus | **ja** |
| **B** REFERENTIEBEREIK | richtwaarde; de master viel hier; nieuw werk mag erbuiten vallen met een reden | **nee** |
| **C** HOMEPAGE-SPECIFIEK | beschrijft Master v1 en niets anders | **nee, nooit** |
| **D** GEZETTE ONDERGRENS | niet uit een meting afgeleid; gezet omdat er een grens nodig is, mét de reden en met de review die hem moet bevestigen | **ja, voorlopig** |

`D` bestaat omdat V1.2's tweede fout was dat er geen grens stond waar de master geen voorbeeld had.
Een `D`-grens is eerlijk gelabeld als gezet en staat in §3.5 als open besluit.

### 3.0.2 Elke poort kent drie uitkomsten

`PASS` · `FAIL` · `N.V.T.-met-reden`. Er is geen vierde.

> **S3-00 · DE LEGE-VERZAMELINGSGRENDEL.** Een toets over een verzameling luidt altijd
> `n > 0 && every(...)`, nooit `every(...)`. Een lege verzameling levert `N.V.T.-met-reden`, en de
> reden moet een modus of een inhoudsreden noemen. **Een lege meting is nooit `PASS`.**
> Dit repareert de gemeten fout dat `[].every(...)` in `poorten.mjs` `true` oplevert
> (`kritiek-ontduiking.md` §5). Een deling waarvan de noemer 0 is (`0/0 >= .5`) levert óók
> `N.V.T.-met-reden`, niet `FAIL` en niet `PASS` — dat repareert `DR-V-O-02`.

### 3.0.3 De drie canvasmodi en wat dit hoofdstuk per modus doet

| | CANVAS MODE | DOCUMENT MODE | HYBRID MODE |
|---|---|---|---|
| **waarvoor** | hero, projectbewijs, productvisualisatie, slot-CTA | FAQ, juridisch, technische registers, lange tekst | redactionele kolom naast een ontworpen visueel podium |
| **werkbreedte** | **≥ 85% van de viewport** (A) — mediaan master 90,5% @1774 **én** @1440 | geen paginabrede `max-width`; de begrenzing zit als `ch`-cap op het tekstelement zelf | podium + kolom samen ≥ 85% van de viewport (A) |
| **rekeneenheid** | `cqw` toegestaan — dit is de "bewust canvas-proportionele compositie" van `§1A.6` punt 2 | **`clamp()` verplicht**, `cqw` verboden | `cqw` voor het podium, `clamp()` voor de kolom |
| **dominant vlak** | beeld of gebouwd object | het registerveld zelf | het podium |
| **rollen aanwezig** | alle vier | DOMINANT + 0–1 ONDERSTEUNEND + MICRO | alle vier |
| **AANGEHECHT** | toegestaan | **0** — er is geen beeldrand om aan te hechten → `N.V.T.-met-reden` | toegestaan |
| **vlakken op een foto** | 6 van 9 secties op de master (C) | **0, en dat is PASS** | ≥ 1 per sectie met podiumfoto |

Dit lost `kritiek-overfitting.md` §5.1 op: de `cqw`-erfenis botst niet meer met `§1A.6` punt 2, omdat
`cqw` nu aan één modus hangt en `clamp()` aan een andere.

> **S3-01 · WERKBREEDTE KRIMPT NIET.** Meet de mediane werkbreedte als % van de viewport op 1774 en
> op 1440. Het verschil `%@1774 − %@1440` is **≥ −1,0 procentpunt**. (A)
> Gemeten master: 90,5 en 90,5 → **0,0**. Gemeten B2-kandidaat: 68,1 en 86,0 → **−17,9**.
> Dit is de scherpste enkele toets die de twee pagina's scheidt en hij is in drie van de drie modi
> van toepassing. `N.V.T.` bestaat hier niet: elke pagina heeft een werkbreedte.

> **S3-02 · GEEN PAGINABREDE MAX-WIDTH.** Tel declaraties van een `max-width` op een
> paginabrede wrapper: **0**. Tel `ch`-caps op tekstelementen: **≥ 1 per lopende-tekstblok**. (A)
> Gemeten master: 0 paginabrede `max-width`, regellengtecaps 34–52ch. Gemeten B2:
> `max-width: var(--container-max)`. DOCUMENT MODE voert zijn leesbreedte dus uit met hetzelfde
> mechanisme als de master, niet met een container.

### 3.0.4 Afgeleide tegenover vaste maten — de reparatie van V1.2's derde fout

V1.2 leverde vijf papieren pagina's op met **0 van 126 nieuwe maatwaarden** (`papiertest.md` toets 2).
De oorzaak staat in `vibe-section-blueprints-v1.md` §1.1: een blauwdruk legt px-maten vast en is dus
een **bevroren meting**, geen geparametriseerd skelet.

> **S3-03 · ELK REGISTER EN ELK MIDDEL VERKLAART ZIJN AFGELEIDE MATEN.** Elke `REG-`- en
> `NF-`-code hieronder draagt een tabelregel **AFGELEID** (maten die uit de inhoud volgen en dus
> tussen twee pagina's verschillen) en **VAST** (maten die overal gelijk zijn). Een code met
> **0 afgeleide maten** wordt afgekeurd. **Toets:** bouw dezelfde code met twee verschillende
> inhoudsladingen; verschilt geen enkele gemeten maat, dan is het een bevroren meting → `FAIL`.
> Verschilt alles, inclusief wat als VAST staat → ook `FAIL`.

---

## 3.1 · HIERARCHIE IN PLAATS VAN VARIATIE

### 3.1.1 Wat het overdraagbare principe wél is

De homepage is gemeten **één proportionele compositie**: `pageH@1440 / pageH@1774 = 0,8117 = 1440/1774`,
afwijking 0,003%; elke sectiehoogte volgt binnen 0,2%. De B2-kandidaat: 0,8838, 8,87% ernaast,
spreiding over de secties 0,138. (A — de proportionaliteit is overdraagbaar; de factor 0,8117 is
C, want die is alleen de verhouding van die twee meetbreedtes.)

Binnen die compositie zit het verschil **niet** in kaartdiversiteit. V1.2 telde uniciteit en kwam op
8 radii, 7 schaduwrecepten, 5 schaduwinkten, 6 gronden, 4 randbehandelingen, 6 paddingcombinaties.
Een nep-pagina van 40 regels CSS haalde daarmee 22 van 22 poorten (`kritiek-ontduiking.md` §1).

> **HIERARCHIE TUSSEN VLAKKEN is het overdraagbare principe. Visueel verschil zonder hierarchie is
> ruis. Willekeurig verschil in radius, schaduw, hoek of grond wordt NIET beloond en levert nul
> punten.**

### 3.1.2 Wat in plaats van de uniciteitstelling komt

Elke vormeigenschap moet **herleidbaar** zijn tot de rol of de binding van het vlak. Gemeten
correlaties op de master:

| V1.2 telde | wat er werkelijk achter zit, gemeten | merk |
|---|---|---|
| 8 unieke radii | **radius codeert de BINDING, twee banden zonder overlap.** Vlak dat volledig in de sectiegrond staat: **10,00px in 8 van 8** (K1 ×6, K5 ×2). Vlak dat op een beeld ligt of een gebouwd object is: **11,70 · 13,00 · 13,50 · 14,00 · 16,00 · 18,70 · 20,00 in 8 van 8** (K2 ×3, K4, K3, K6 ×2). Gat 10,00 → 11,70. | A (de twee banden) · C (de zeven waarden) |
| 7 schaduwrecepten, 5 inkten | **schaduw codeert het gemeten contrast met wat eronder ligt.** Ondergrondluminantie onder de vlakken loopt van 0,048 tot 0,981 — factor 20. Vier regimes: contrast 5,08:1 → **geen schaduw** (K3, n=1) · 1,24–5,65:1 → **dubbele schaduw met negatieve spread** (K2 ×3, K4, n=4) · 1,03:1 → **1px rand, geen schaduw** (K5, n=1) · egale lichte grond met eigen foto in het vlak → **één laag, alfa 0,10** (K1, n=1). | A (schaduw volgt contrast) · B (de vier drempels) |
| 6 gronden | **grond codeert rol + binding.** Doorzichtig waar een foto het vlak vult (K1). Wit/bijna-wit waar het vlak een claim op een donkere ondergrond zet (K2, K4). Donker waar het vlak op een lichter beeld ligt (K3) of het product verbeeldt (K6). | A |
| 6 paddingcombinaties | **padding codeert de leesrichting.** In 3 van 3 K2-vlakken is de linkerpadding groter dan de rechter (factor 1,42 · 1,31 · 1,23). **0 van 6 paddings heeft vier gelijke zijden > 0**; de generieke `.vibe-card` heeft er maar één vorm: 30/30/30/30. | A (asymmetrie) · B (de factoren) |
| 8 unieke kopgraden | **kopgraad codeert rang.** Zie S3-06. | A |
| 14 hoekwaarden | **hoek codeert functie.** Flauw 9,7–13,0° waar een tekstkolom over het beeld moet lopen; scherp 27–37° waar de rand vrij is. Eén gemeten uitzondering op de hele pagina: 25° op het gebouwde vlak dat ontbrekende HVAC-fotografie vervangt. | A (twee families + ≤1 uitzondering) · C (de 14 waarden) |

> **S3-04 · DE VERKLARINGSTOETS.** Voor elk vlak in een sectie bestaat één regel in de
> compositieverantwoording met: rol · binding · radius mét de band waaruit hij komt · schaduw of rand
> mét het gemeten contrast dat hem rechtvaardigt · hoek mét zijn familie. Een vormeigenschap die niet
> tot rol of binding herleid kan worden → **FAIL**. Een sectie zonder verantwoording →
> **FAIL**, niet `N.V.T.`: de verantwoording is altijd te schrijven.
> Dit is de poort die SYSTEEM-X niet haalt: die pagina had wel 2 radii en 3 schaduwen, maar nul
> vlakken met een rol.

### 3.1.3 De vier rollen

Elk vlak heeft **precies één** rol. De rol gaat over **gewicht**; de **binding** is een tweede,
onafhankelijke eigenschap die elk niet-dominant vlak moet declareren (§3.1.5).

---

#### **DOMINANT** — draagt het onderwerp van de sectie

| | |
|---|---|
| **aantal** | **exact 1 per sectie.** Gemeten: 9 van 9 secties hebben precies één grootste zichtbare vlak. (A) |
| **relatieve maat** | **≥ 27% van de viewportbreedte** (A). Gemeten 9 waarden: 19,7 · 27,5 · 41,4 · 45,7 · 52,7 · 53,9 · 62,0 · 96,1 · 100 %vw. Minimum in een inhoudssectie **27,5** (S02, de dominante mediakaart); de 19,7 is de footer → zie uitzondering.<br>**≥ 49% van de sectiehoogte** (A). Gemeten 9 waarden: 49,0 · 56,0 · 62,8 · 72,9 · 73,9 · 82,4 · 83,0 · 83,3 · 100%. Minimum **49,0** (S04). |
| **oppervlakaandeel** | product van de twee: gemeten 15,4 · 16,4 · 26,0 · 26,4 · 28,2 · 51,5 · 52,7 · 70,9 · 82,4% van de sectierechthoek, mediaan 28,2%. (B — referentiebereik, **géén poort**; de twee losse floors zijn de poort.) |
| **plaats** | ongebonden. Het dominante vlak is het **enige** vlak in de sectie dat géén binding declareert; alles hecht aan hém, niet omgekeerd. (A) |
| **toegestane oppervlakken** | foto · gebouwd object · getekend merkvlak · registerveld (DOCUMENT MODE). Een vlak dat niets dan een grond is, is geen dominant vlak: het moet inhoud dragen. |
| **toegestane typografie** | de sectiekop, gemeten band **53,0–76,5px / 700 / tracking −0,004…−0,016em / lh÷graad 0,951–1,132** (B — het is de master-band; de ondergrens 53 is C). Binnen een dominante kaart: eigen graad **1,446× de buren** (26,6 tegen 18,4; n=1 → B). |
| **hoe je de rol ziet** | (1) het is het grootste vlak; (2) het haalt beide floors hierboven; (3) de sectiekop is **≥ 2,0×** elke typegraad in elk vlak van die sectie (S3-06); (4) het declareert geen binding. Drie van de vier moeten waar zijn. |
| **uitzondering** | een **sluitband** (footer, bewijsband, afsluitende regel) heeft geen onderwerp en dus geen dominant vlak. Dan: `N.V.T.-met-reden = sluitband`. Gemeten 1 van 9 (S09, 19,7%vw / 83,3% sectiehoogte). **Maximaal 1 sluitband per pagina** (D — gezet; de master meet 1, maar n=1 draagt geen plafond). |

> **S3-05 · DOMINANTIE.** Per sectie: 1 dominant vlak, ≥ 27%vw **en** ≥ 49% van de sectiehoogte.
> Twee vlakken die beide beide floors halen → **FAIL** (twee onderwerpen in één sectie).
> Sectie zonder enig vlak → `N.V.T.-met-reden` alleen als de sectie als sluitband is gedeclareerd,
> anders **FAIL**.

> **S3-06 · TYPOGRAFISCHE RANG.** `sectiekopgraad ÷ grootste typegraad in enig vlak van die sectie
> ≥ 2,0`. (A) Gemeten 8 van 8: 76,46/28 = **2,73** · 61,5/26,6 = **2,31** · 58,32/28,4 = **2,05** ·
> 64,04/19,9 = **3,22** · 54/14,2 = **3,80** · 53/22 = **2,41** · 61/18,9 = **3,23** ·
> 66/21 = **3,14**. Minimum 2,05 → floor 2,0.
> Deze toets werkt in alle drie de modi en op elke paginasoort, ook op een pagina zonder beeld.
> Sectie zonder vlakken → `N.V.T.-met-reden = geen vlak`; sectie zonder kop → **FAIL**.

---

#### **ONDERSTEUNEND** — draagt een eigen claim over het onderwerp

| | |
|---|---|
| **aantal** | **0–2 per sectie** als afzonderlijke rangen; één rang mag meerdere leden hebben (§3.2). Gemeten: K2 komt in 3 secties voor en **exact 1× per sectie**, zonder uitzondering. (A voor het plafond van 1 zwevend wit vlak per sectie; 2 rangen is het gemeten maximum in S06.) |
| **relatieve maat** | **0,14–0,62 × het oppervlak van het dominante vlak** (B, n=10). Gemeten: 0,141 (K2-S08) · 0,158 (K6-telefoon ÷ dashboard) · 0,191 (K3-S06) · 0,287 (K4-stapel als één rang ÷ foto S07) · 0,305 (K2-S04) · 0,335 · 0,337 · 0,352 (K1-onderrij) · 0,410 (K2-S06) · 0,600 · 0,620 (K1-bovenrij-buren). |
| **harde grens** | **nooit 0,75–1,00 × het dominante vlak** (A). Die band is op de master leeg: hoogste gemeten 0,620. Een tweede vlak dat het dominante vlak evenaart maakt de sectie tot twee onderwerpen — en is precies de 50/50-tweedeling die de B2-kandidaat één keer maakt (S6, 50,0%). |
| **plaats** | naast het dominante vlak, of gedeeltelijk erop. Binding verplicht. |
| **toegestane oppervlakken** | wit/bijna-wit met dubbele schaduw zonder rand (K2) · donker zonder schaduw óp een lichter beeld (K3) · doorzichtig met een eigen foto erin (K1-buur) · donker gebouwd object (K6-telefoon). Nooit: wit mét rand én schaduw tegelijk (0 van 18 gemeten). |
| **toegestane typografie** | kop **18,4–22,0px / 700**; body **15,3–19,0 / 400 / lh 21–27px**. (B) Gemeten koppen: 18,4 (K1-buur) · 19,9 (K2-S04) · 20,0 (K2-S06 citaat, gewicht 400) · 21,0 (K2-S08) · 22,0 (K3). Eén gemeten uitzondering: K6 werkt op **7,1–14,2px** omdat het een afgebeelde interface is en niet bedoeld is om gelezen te worden (C). |
| **hoe je de rol ziet** | het vlak draagt een kop **én** een body, en de tekst erop is als losse zin te lezen zonder het dominante vlak. Haal het dominante vlak weg en de claim blijft staan. |

---

#### **AANGEHECHT** — annoteert het onderwerp en verliest zonder hem zijn betekenis

| | |
|---|---|
| **aantal** | **0–4 per sectie.** Gemeten maximum 4 (K4 ×4 in S07). Grendel B uit `vibe-card-system-v1.md` §5 (max 4 kaartvlakken per sectie) blijft staan voor déze rol. (A) |
| **relatieve maat** | **0,02–0,07 × het dominante vlak** (B, **n=3** — dun). Gemeten: 0,039 (K5 197×81) · 0,057 (K5 289×81) · 0,066 (K4 422×126 ÷ foto 1100×736,2). |
| **gemeten gat** | tussen 0,07 en 0,14 zit op de master **niets**, factor 2,1. Dat gat scheidt AANGEHECHT van ONDERSTEUNEND. (B — het gat is gemeten, maar met n=3 aan de onderkant draagt het geen poort; zie `DR-S-04`.) |
| **plaats** | aan of op het dominante vlak. Binding verplicht, en **nooit `LOS`** — een los aangehecht vlak is per definitie ONDERSTEUNEND of MICRO. Enige gemeten uitzondering: K5, 0 van 2 op een beeld, bindingsklasse `LOS` (C). |
| **toegestane oppervlakken** | wit met dubbele schaduw (K4) · wit met 1px rand en géén schaduw in rust (K5, bij gemeten grondcontrast 1,03:1). |
| **toegestane typografie** | kop **18,0–18,6 / 700**; body **14,0–16,0 / 400**, **maximaal 2 regels** (A — gemeten: K4 draagt in 4 van 4 exact 48px = 2 regels; K5 draagt 1 naam + 1 regel). |
| **hoe je de rol ziet** | **de wegneemtoets:** haal het dominante vlak weg en de tekst op dit vlak is onbegrijpelijk of overbodig. "Commercieel vastgoed · 3 locaties" zonder de foto eronder zegt niets. |

---

#### **MICRO** — geen vlak

| | |
|---|---|
| **aantal** | per rij **3 of 4** leden (A — gemeten 17 regels in 5 rijen: 3 · 4 · 4 · 3 · 3; en K7 2 banden van 3 cellen). In een **register** (§3.3) is dit plafond vervangen door het rijplafond van het register. |
| **relatieve maat** | niet van toepassing: een MICRO-element heeft geen vlak en dus geen oppervlakverhouding. |
| **toegestane oppervlakken** | **geen.** Gemeten in **25 van 25** elementen (8× K7, 17× K8): grond `rgba(0,0,0,0)`, radius **0**, schaduw **geen**, rand **geen**, padding **0**. (A) |
| **scheiding** | 1px haarlijn. Gemeten inkten: `#DCE7F3` (K7-S01, 69px hoog) · `rgba(255,255,255,.22)` (K7-S03) · `#E5EFFA` (K8-S02, 398px breed). (C voor de inkten, A voor "1px haarlijn in plaats van een vlak".) |
| **toegestane typografie** | label **15,2–18,9 / 700** + regel **14,3–17,4 / 400**. **Een metriekgetal mag 28,0–28,4 / 700** zijn. (B) |
| **hoe je de rol ziet** | **aan de AFWEZIGHEID van een vlak, nooit aan de maat.** Gemeten tegenbewijs: het K7-getal is 28,0px en daarmee **groter** dan elke kop op een AANGEHECHT vlak (18,0–18,6). Wie MICRO aan "klein" herkent, leest de hierarchie verkeerd. |
| **toegestane icoontegel** | tegel 35,1–63,0px met `radius ÷ tegelmaat = 0,19` (gemeten 0,172 · 0,177 · 0,197 · 0,202 · 0,206 over 5 tegels in 4 families; gemiddelde 0,191). (A voor de verhouding, B voor de maten.) Of bewust géén tegel: gemeten 1 van 5 rijen draagt een kaal icoon van 40px. |

> **S3-07 · TYPEGRAAD ONDERSCHEIDT DE ROLLEN NIET.** Gemeten overlap: 18,0–18,9px komt voor in drie
> van de vier rollen (AANGEHECHT 18,0 / 18,6 · ONDERSTEUNEND 18,4 · MICRO 18,9). **Daarom is er geen
> poort op typegraad per rol.** De rol volgt uit oppervlak en vlakgedrag; de typografie mag die rol
> alleen niet tegenspreken — en de enige harde tegenspraak is S3-06.

### 3.1.4 K1…K8 ondergebracht bij de rollen

Een familie mag meerdere rollen dienen. `●` = gemeten op de master · `○` = toegestaan, niet gemeten
· `—` = verboden.

| familie | DOMINANT | ONDERSTEUNEND | AANGEHECHT | MICRO | gemeten bewijs |
|---|---|---|---|---|---|
| **K1** MEDIAKAART | **●** 1 per rij, 487×498, eigen graad 26,6 | **●** de 5 overige, 0,335–0,620 | — | — | `home-solutions.css:126-143` |
| **K2** ZWEVEND INFOVLAK | — | **●** 3 van 3, 0,141 · 0,305 · 0,410 | ○ alleen onder 0,07 — **NIET GEMETEN**, laagste gemeten 0,141 | — | `home-process/proof/final.css` |
| **K3** STROOK | — | **●** 0,191 | — | — | `home-proof.css:306-361` |
| **K4** REGISTERKAART | — | **●** de stapel als één rang, 0,287 | **●** de losse kaart, 0,066 | — | `home-infra.css:209-277` |
| **K5** LOGOKAART | — | — | **●** 0,039 · 0,057 | — | `home-proof.css:117-150` |
| **K6** APPARAATVLAK | **●** dashboard, 45,7%vw / 72,9% sectiehoogte | **●** telefoon, 0,158 | — | — | `home-control.css:52-76` |
| **K7** BEWIJSBAND | — | — | — | **●** 8 van 8 zonder vlak | `home-hero.css:337-362` |
| **K8** ICOONREGEL | — | — | — | **●** 17 van 17 zonder vlak | 5 rijen in S02·04·05·07·08 |

**Drie families dienen twee rollen:** K1 (dominant + ondersteunend), K4 (ondersteunend als stapel,
aangehecht per kaart), K6 (dominant + ondersteunend). **Twee families dienen precies één rol en
hebben geen vlak:** K7, K8.

**De gemeten leegte in de tabel is de opdracht van §3.3:** er bestaat geen familie die in DOCUMENT
MODE een DOMINANT vlak kan zijn. Dat is de reden dat V1.2 `algemene-voorwaarden.html` niet kon
bouwen, en dat is precies wat `REG-1`…`REG-5` toevoegen.

### 3.1.5 De bindingsklassen

Elk niet-dominant vlak declareert er één. Er zijn er vier en geen vijfde.

| klasse | definitie | gemeten waarden |
|---|---|---|
| **`ON`** | ≥ 99% van het vlakoppervlak ligt op het dominante vlak | 8 vlakken op 100% en 1 op 99,8% |
| **`KRUIST`** | kruist een rand van het dominante vlak met **8–56px** | 1 van 1: 55,8px voorbij rechts, 8,0px voorbij onder, 80,8% op het beeld |
| **`RAND`** | dekt een rand van buitenaf af; **9–12%** van het vlak ligt erop | 2 van 2: 9,4% en 11,8% |
| **`LOS`** | 0% erop, en **≥ 8px** vrij van elke rand van het dominante vlak | K5 ×2, 0 van 2 op een beeld |

> **S3-08 · GEEN SAMENVALLENDE RANDEN.** Per kaartrand/beeldrandpaar: `|Δ| ≥ 8px`. (A)
> Gemeten 7 paren: 8,0 · 21,0 · 25,6 · 32,1 · 42,0 · 55,8 · 84,4px. De waarde 0 komt niet voor.
> `Δ = 0` → **FAIL**: dat is een rastercel, geen compositie.
> Geen beeld in de sectie → `N.V.T.-met-reden = DOCUMENT MODE / geen beeld`.

> **S3-09 · DE LEGE BINDINGSBAND.** Het aandeel van een vlak dat op een beeld ligt is **≤ 12%** of
> **≥ 80%**. De band **12–80% is verboden**. (A) Gemeten 11 waarden: 100 · 100 · 100 · 100 · 100 ·
> 100 · 100 · 99,8 · 80,8 · 11,8 · 9,4%. Er ligt niets tussen 12 en 80: dat leest als een
> plaatsingsfout en niet als een besluit.

> **S3-10 · WIT VLAK OP EEN BEELD.** Een wit vlak dat ≥ 50% op een beeld ligt, ligt op een gemeten
> achtergrondluminantie **≤ 0,14**, of het draagt een tweede scheidingsmiddel. (A voor de eis,
> **B** voor de drempel 0,14 — die rust op 3 metingen: 0,048 · 0,084 · 0,136, tegenover 1 vlak dat er
> met 0,409 boven ligt en dan de zwaarste schaduw van de pagina draagt.)
> De zone 2,5:1 – 5,0:1 komt op de master niet voor; daar is dus **geen regel** en een vlak dat daar
> landt levert `N.V.T.-met-reden = ongemeten contrastzone` plus een VISUELE REVIEWVRAAG, niet `PASS`.

---

## 3.2 · MEERVOUDIGE KAARTCOMPOSITIES

### 3.2.1 Elke compositie met meer dan één vlak benoemt haar hierarchie

> **S3-11 · DE HIERARCHIEVERANTWOORDING.** Een sectie met ≥ 2 vlakken draagt een tabel met per vlak:
> **rol · rang · oppervlak in px² · oppervlakverhouding tot het dominante vlak · bindingsklasse**.
> Ontbreekt de tabel, of staat er een vlak zonder rol in → **FAIL**. Dit is nooit `N.V.T.`: een
> compositie met twee vlakken heeft altijd een hierarchie, ook als die hierarchie "twee gelijke leden
> van één rang" is.

**RANG** = de verzameling vlakken met **dezelfde rol én dezelfde veldenset**. Gemeten rangen op de
master: S02 heeft drie rangen (1 dominant · 2 buren van 0,620/0,600 · 3 van 0,352/0,335/0,337);
S06 heeft vier (foto · K2 · K3 · K5 ×2); S07 heeft twee (foto · K4-stapel).

> **S3-12 · AFSTAND TUSSEN RANGEN.** Voor elk opeenvolgend rangpaar met een eigen oppervlak:
> `oppervlak(rang n) ÷ oppervlak(rang n+1) ≥ 1,55`. (A, n=9)
> Gemeten 9 rangparen: **1,613** (S02 dominant→buur) · **1,762** (S02 buur→onderrij) ·
> **2,148** (S06 K2→K3) · **2,441** (S06 foto→K2) · **3,277** (S04 foto→K2) · **3,332** (S06 K3→K5) ·
> **3,490** (S07 foto→stapel) · **6,319** (S05 dashboard→telefoon) · **7,110** (S08 beeld→K2).
> Minimum 1,613 → floor 1,55.
> **MICRO-elementen doen niet mee** (zij hebben geen vlak en dus geen oppervlak) → voor S01 en S03,
> die naast het dominante vlak alleen MICRO dragen, geldt `N.V.T.-met-reden = geen tweede vlakrang`.

### 3.2.2 Wanneer gelijke vlakken wél mogen — DE REGISTERTOETS

Gelijke vlakken mogen **alleen** als de inhoud aantoonbaar één **gelijk register** is. Dat stel je vast
met vier vragen. **Alle vier moeten JA zijn.** Eén NEE → de rang moet ongelijk, en de hierarchie moet
benoemd.

| # | vraag | hoe je het toetst | gemeten op de master |
|---|---|---|---|
| **R-a** | **Uitwisselbaar?** Verandert de betekenis van de sectie als je twee leden van plaats wisselt? | waarneembaar ja/nee, vastgelegd in de verantwoording | K4 ×4 (vier doelgroepen): JA. K1-bovenrij (één dominant aanbod + twee neven): NEE. |
| **R-b** | **Gelijke veldenset?** Elk lid draagt exact dezelfde velden in dezelfde orde, en **geen lid heeft een veld dat de andere missen**. Aantal velden ≥ 2. | tel de velden per lid; alle tellingen gelijk | K4: icoon + vet + 2 regels, **4 van 4 identiek** → JA. K7-S01: icoon + getal + label, **3 van 3** → JA. K1-bovenrij: de dominante kaart draagt als enige een statistiekbalk van 3 cellen → **NEE**. |
| **R-c** | **Gelijke inhoudsmaat?** `woorden(langste lid) ÷ woorden(kortste lid) ≤ 1,40`. (A, n=5; gemeten maximum 1,40) | tel woorden per lid | gemeten over 5 gelijke rijen: **1,00** (K4, 4× exact 2 regels) · **1,00** (K7-S01, ≤5 + ≤4 woorden) · **1,22** (K8-S04, 9–11 woorden) · **1,33** (K8-S02, 3–4 woorden) · **1,40** (K8-S05, 5–7 woorden). |
| **R-d** | **Geen eigen rang?** Geen lid heeft een eigen CTA terwijl de andere die missen, en geen lid wordt elders op de site als "het belangrijkste" aangewezen. | waarneembaar ja/nee | K4: alle vier zijn een `<a>` met dezelfde ronde pijl → JA. |

**R-c is de scherpste van de vier en doet het meeste werk.** Hij verklaart in één getal waarom
`algemene-voorwaarden.html` géén gelijk register is: 13 hoofdstukken van 62 tot 1581 woorden, spreiding
**25,5** — een factor **18** boven 1,40. Dertien juridische hoofdstukken zijn dus **nooit** dertien
gelijke kaarten, en dat is geen opmaakvoorkeur maar een gemeten uitkomst. Ze hebben `REG-5` nodig.

> **S3-13 · DE REGISTERTOETS.** Voor elke rang met ≥ 2 leden: 4 van 4 JA → de rang mag gelijk;
> < 4 JA → de rang moet ongelijk. Een rang waarvan de verantwoording de vier vragen niet beantwoordt
> → **FAIL**. Rang met 1 lid → `N.V.T.-met-reden = enkel lid`.

### 3.2.3 De V1.2-tegenstrijdigheid, opgelost

**De botsing.** `vibe-card-system-v1.md` §4.1 (C1) normeert een rij van drie kaarten met
`max/min ≤ 1,06` **of** `≥ 1,55` en verklaart de zone daartussen verboden. §4.8 **GRENS 2** zegt
"**nul** horizontale rijen van drie of meer kaarten met identieke breedte". De master zelf heeft een
rij van 371 · 353 · 355px = **max/min 1,051**, dus binnen C1's toegestane band en net buiten GRENS 2's
"identiek". De band 1,06 is afgeleid uit **4 rijen** (2 master, 2 B2) — `DR-V-66` noemt dat zelf — en
is daarmee op de master gefit: B2's 1,110 wordt afgekeurd, de master's 1,051 goedgekeurd, bij een
feitelijk verschil van 0,059.

**Het besluit — DR-S-01: de rangregel vervangt C1, GRENS 1, GRENS 2 en GRENS 3.**

| | regel | merk |
|---|---|---|
| **tussen rangen** | oppervlakverhouding **≥ 1,55** (S3-12) | A, n=9, gemeten minimum 1,613 |
| **binnen een rang die de registertoets 4× JA haalt** | breedte `max/min` **≤ 1,01** — exact gelijk, niet bijna | A, n=5: K4 **1,000** · K7-S01 **1,000** · K8-S04 **1,000** · K8-S05 **1,000** · K8-S07 **1,000**. Er bestaat op de master **geen** rang die de registertoets haalt én tussen 1,02 en 1,05 ligt. |
| **binnen een rang die de registertoets níét haalt** | breedte `max/min` **≥ 1,20**, én het breedste lid draagt **precies één element dat de andere missen** | A, n=4: **1,208** (K8-S08) · **1,283** (S09-navkolommen) · **1,467** (K5) · **1,668** (K1-bovenrij). Minimum 1,208 → floor 1,20. Het extra element is gemeten op K1: statistiekbalk van 3 cellen, kop ×1,446, icoon ×1,100, pijl ×1,211. |
| **verboden zone binnen een rang** | **1,01 < max/min < 1,20** | A — hier ziet een rij "bijna gelijk maar net niet" uit |
| **vrijstelling: CONTENTGEDREVEN** | de breedte is niet gedeclareerd maar volgt de tekst. Dan geldt geen `max/min`-eis. **Alleen toegestaan** voor een rang waarvan elk lid ≤ 2 tekstblokken draagt, geen icoontegel > 63px heeft en geen eigen zichtbare CTA. | A, n=3: **1,167** (K7-S03, cellen 120/140/139,6) · **1,208** (K8-S08, `326fr 355fr 294fr`) · **1,467** (K5, `flex:none` + `white-space:nowrap`). Alle drie dragen ≤ 2 tekstblokken en 0 eigen CTA. |

**Waarom 1,20 en niet 1,55.** C1's 1,55 maakt elke rij van drie items tot een hero-achtige
compositie en is daardoor de directe oorzaak van vier onbouwbare inhoudstypes
(`kritiek-overfitting.md` §3.3 en §3.4). De gemeten ondergrens van wat op de master als **bewust
ongelijk** leest, is **1,208** — en dat is een K8-rij zonder vlak. 1,20 is dus niet versoepeld maar
**gemeten**; wat eruit valt is uitsluitend de band 1,01–1,20.

**Wat dit besluit kost — en dat is het punt.** De eigen onderrij van de master, K1 371 · 353 · 355 =
**1,051**, faalt deze regel, **ongeacht de registertoets**:

- haalt de rang de registertoets → de eis is `≤ 1,01`; 1,051 → **FAIL**;
- haalt de rang hem niet → de eis is `≥ 1,20`; 1,051 → **FAIL**.

Welke drie van de zes K1-kaarten in de onderrij staan en hoeveel woorden hun koppen dragen, is in
**deze** sessie **NIET GEMETEN** (gemeten is alleen de spreiding over alle zes: 4–7 woorden,
factor 1,75). Dat hoeft ook niet: beide takken geven `FAIL`. **Hiermee is vastgelegd dat deze
onderrij een gemeten tekortkoming van Master v1 is en geen regel.** Dat is de enige leesbare uitkomst:
drie bijna gelijke fotokaarten op één rij zijn precies het templatebeeld dat de hele reparatie moet
voorkomen, en V1.2 had er een band om heen gelegd in plaats van hem te benoemen. Zie `DR-S-02` voor
het besluit of de master wordt bijgesteld (hij wordt volgens `§1A.11` punt 3 **niet** herbouwd, dus
het antwoord is vermoedelijk: regel geldt voor nieuw werk, master houdt een gedocumenteerde afwijking).

### 3.2.4 Wat GRENS 1 blokkeerde en nu niet meer

`vibe-card-system-v1.md` §4.8 **GRENS 1** stond een gelijk kaartraster toe in **precies één vorm**:
verticaal gestapeld **op een beeld**, met een scrim die de ondergrond op L ≤ 0,14 brengt. Dat ene
voorwaardelijke beeld blokkeerde vijf dingen tegelijk, alle vijf gemeten:

| wat GRENS 1 blokkeerde | bewijs | status onder DR-S-01 |
|---|---|---|
| **B13 KAARTKOLOM ZONDER FOTO** kon niet bestaan | `papiertest.md` §8.6 T-1: B13 stapelt 4 identieke K4 op een getekend vlak; GRENS 1 eist een beeld | **opgeheven** — een gelijke rang mag overal staan zodra de registertoets slaagt |
| **FAQ vanaf 5 vragen** | `kritiek-overfitting.md` §3.4: 5 gesloten items = 5 vlakken met identieke breedte én hoogte | **opgeheven** → `REG-1` |
| **vergelijkingstabel** | `kritiek-overfitting.md` §3.3: 3 pakketten × 6 eigenschappen = 6 rijen van 3 identieke breedtes. "Een prijstabel op een foto met een scrim die de ondergrond op L ≤ 0,14 brengt is geen prijstabel meer." | **opgeheven** → `REG-3` |
| **technisch register** | idem; de beslisboom `§5` eindigt voor een tabel bij stap 7 "GEEN KAART" | **opgeheven** → `REG-2` |
| **20 FAQ-paren over vier pagina's** | `papiertest.md` §8.1: 15 blauwdrukken, **0** registerblauwdrukken | **opgeheven** → `REG-1`, 5 per pagina |

**Twee uitzonderingen van V1.2 blijven staan, want ze zijn gemeten en nuttig.** Binnen een afgebeelde
interface mag alles gelijk zijn (3 tegels van 166×51, radius 5,68 in het dashboard — het verbeeldt een
scherm, het is geen paginacompositie). En een gelijke rang **zonder vlak** leest als tekstkolommen en
niet als een tegelraster: gemeten 4 van 5 K8-rijen zijn exact gelijk van breedte, en de master gebruikt
dat middel in 5 van de 9 secties. **Dat laatste is de goedkoopste manier om gelijkwaardige punten te
tonen, en het is het fundament van alle vijf registers in §3.3.**

> **S3-14 · GELIJKE RANG MET VLAK.** Per pagina: elke rang met ≥ 3 gelijke leden **mét** een eigen vlak
> heeft een verantwoording met 4× JA op de registertoets. Een rang van ≥ 3 gelijke leden **zonder**
> vlak (grond doorzichtig, radius 0, geen schaduw, geen rand) is altijd toegestaan en wordt niet
> geteld. (A)
> Dit vervangt `P-09` uit `vibe-design-quality-gate-v1.md`, dat `≤ 1` gelijke-kaartrij per pagina
> toestaat **en** eist dat die sectie ≥ 3 informatievlakken **op een beeld** heeft. In DOCUMENT MODE
> is dat tweede deel structureel onhaalbaar. → **DR-S-03** (de poortlaag moet dit overnemen; dit
> hoofdstuk bezit `P-09` niet).

---

## 3.3 · REGISTERS — het ontbrekende systeem

`papiertest.md` §8.1: **15 blauwdrukken, 0 registerblauwdrukken.** De beslisboom van het kaartsysteem
eindigt voor een FAQ, een tabel, een specificatie en een juridisch hoofdstuk bij stap 7, "GEEN KAART".
Vijf registers vullen dat gat. Elk moet **zelfstandig een MEDIUM-sectie kunnen dragen**.

### 3.3.0 Wat "zelfstandig een MEDIUM-sectie dragen" meetbaar betekent

| eis | waarde | merk |
|---|---|---|
| **sectiehoogte** | **≥ 443,5px @1774** = 25% van de viewportbreedte | A — overgenomen uit `P-14`, de enige bestaande ondergrens voor een sectiehoogte |
| **leegte** | ≤ 25% van de sectiehoogte onbenut | A — overgenomen uit `G20` |
| **werkbreedte** | registerveld ≥ 55% van de werkbreedte in DOCUMENT MODE; ≥ 40% in HYBRID MODE | D — gezet; de master heeft geen registersectie om uit te meten |
| **eigen kop** | sectiekop ≥ 2,0× de grootste typegraad in het register (S3-06) | A, n=8 |
| **0 secundaire families nodig** | het register vult de sectie zonder een tweede gevlakte familie | A — gemeten: 8 van 9 mastersecties dragen hoogstens één gevlakte familie |

De hoogteberekeningen per register hieronder staan als **BEREKEND** met hun ingangen erbij. Zij zijn
**geen meting** en worden bij de eerste gebouwde pagina nagemeten.

### 3.3.1 De gemeenschappelijke anatomie van alle vijf

Elk register bestaat uit drie delen en geen vierde:

```
[ REGISTERKOP ]      sectiekop + eyebrow; rol = de kop van de sectie, geen vlak
[ REGISTERVELD ]     het DOMINANTE vlak van de sectie in DOCUMENT MODE
  [ rij 1 ]          rol = MICRO: grond doorzichtig, radius 0, geen schaduw, geen rand
  [ --- 1px --- ]    haarlijnscheiding in plaats van een kaartvlak
  [ rij 2 ]
  ...
[ REGISTERVOET ]     optioneel; 1px haarlijn + maximaal 1 tekstlink
```

**De vier gedeelde harde ondergrenzen — hier valt "kop plus drie witte kaarten" om:**

> **S3-15 · DE REGISTERSIGNATUUR.** Voor elk register geldt, alle vier:
> **(a)** `aantal rijen ≥ 4`;
> **(b)** `aantal rijen mét een eigen vlak ≤ 1` — en dat ene vlak is uitsluitend de rij die de
> DOMINANT-rol binnen het register draagt;
> **(c)** `aantal haarlijnen = aantal rijgrenzen` (elke rijgrens één 1px lijn, nooit twee en nooit
> nul);
> **(d)** de rijen staan **verticaal gestapeld**; `aantal horizontale rijen met ≥ 2 gevlakte leden = 0`.
> (A — (a) en (b) zijn `D`-grenzen met de reden hieronder; (c) en (d) volgen uit de gemeten
> MICRO-signatuur: 25 van 25 K7/K8-elementen hebben grond `rgba(0,0,0,0)`, radius 0, geen schaduw,
> geen rand, padding 0.)
> **Drie witte kaarten naast elkaar falen (a) op het aantal, (b) op drie vlakken in plaats van ten
> hoogste één, en (d) op de horizontale as. Alle drie tegelijk.** Een register met 0 rijen levert
> `N.V.T.-met-reden` — en die reden mag niet "nog geen inhoud" zijn, want dan hoort het register er
> niet te staan.

Waarom `≥ 4` rijen (D): onder 4 leden is een opsomming geen register maar een MICRO-rij, en daar
geldt het gemeten plafond van 3 of 4 leden al. Waarom `≤ 1` gevlakte rij (D): het maakt de hierarchie
binnen het register zichtbaar met één vlak in plaats van met variatie — precies de correctie van §3.1.

### 3.3.2 Typografische trap, gedeeld door alle vijf

| niveau | graad | gewicht | tracking | lh ÷ graad | merk |
|---|---|---|---|---|---|
| sectiekop | 53,0–66,0 | 700 | −0,004…−0,016em | 0,951–1,132 | B (masterband voor H2) |
| eyebrow / groepskop | 11,2–13,0 | 700 | **+0,133…+0,220em** | — | B; let op het conflict in §3.6 |
| rijlabel (de vraag, de sleutel, de kolomkop) | 16,0–18,9 | 700 | 0 … −0,004em | 1,00–1,30 | B (gemeten AANGEHECHT/MICRO-band) |
| rijwaarde / antwoord / lopende tekst | 15,3–19,0 | 400 | 0 (`normal`) | **1,55–1,70** | graad B · **lh = D** |
| metriekgetal in een register | 28,0–28,4 | 700 | −0,004…−0,012em | 0,76–1,18 | B (K7) |

**De lh 1,55–1,70 is GEZET, niet gemeten.** De gemeten lead-band van de master is **1,276–1,450**
(`G21`, 7 van 7) en is gemeten op leads van ≤ 20 woorden. Een hoofdstuk van 1581 woorden is een ander
tekstsoort; 1,55–1,70 is gezet omdat de gemeten band daar niet over gaat. → `DR-S-06`, plus een
VISUELE REVIEWVRAAG.

**De leesmaat is GEZET:** in DOCUMENT MODE meet de langste regel lopende tekst **60–75 tekens**. De
master heeft geen lopende tekst van deze lengte — het grootste gemeten tekstvat in alle vijftien
blauwdrukken is **32 woorden** — dus er is niets om uit te meten. De gemeten regellengtecaps van de
master zijn **34–52ch**, en die zitten op leads en kaartbody's (C voor die rollen). → `DR-S-05`.

---

### **REG-1 VRAAGREGISTER** — FAQ

| | |
|---|---|
| **inhoudstype** | vraag-en-antwoordparen. Gemeten behoefte: **67 items over 13 pagina's**, 5 of 6 per pagina; `FAQPage`-schema op 3 van 5 papieren kaarten. Langste bestaande antwoord **72 woorden** (`oplossing-exploitatie.html`). |
| **anatomie** | registerkop → `n` rijen → registervoet (optioneel). Rij gesloten = vraagregel + indicator, **geen vlak**. Rij open = vraagregel + antwoordvlak; **dit is de enige rij met een vlak** en daarmee de DOMINANT binnen het register. |
| **maten · VAST** | haarlijn 1px per rijgrens · indicator 24px, rechts uitgelijnd · verticale padding gesloten rij 22px boven en onder · lucht onder het antwoord = **0,12 × de gesloten rijhoogte** (A: gemeten K4-steek 141,3px met 15,3px lucht = **12,1%** van de kaarthoogte) · radius van het open vlak uit de **bindingsband `in de grond`: 10,00px** (A, gemeten 8 van 8) |
| **maten · AFGELEID** | aantal rijen = aantal vragen · hoogte open rij = regels antwoord × `lh` · registerveldbreedte = modus · totale sectiehoogte = som van de rijen |
| **hierarchie zichtbaar** | (1) sectiekop ≥ 2,0× de vraaggraad — met vraag 18,9 en kop 53 is dat **2,80**; (2) **exact één** rij is bij laden open en is de enige met een vlak; (3) de gesloten rijen zijn onderling exact gelijk (`max/min ≤ 1,01`, registertoets 4× JA: vragen zijn uitwisselbaar, dragen dezelfde veldenset, hebben geen eigen CTA). |
| **registertoets R-c** | `woorden(langste antwoord) ÷ woorden(kortste antwoord) ≤ 1,40` geldt **niet** binnen REG-1: de antwoorden zijn verborgen en dragen dus geen gelijke visuele maat. Wat wél geldt is `woorden(langste vraag) ÷ woorden(kortste vraag) ≤ 1,40` — de vragen zijn de zichtbare gelijke rang. (A, afgeleid uit S3-13) |
| **inhoudscapaciteit** | **4–20 items** (D; gemeten behoefte 5–6, plafond 20 gezet op het gemeten `papiertest`-geval van 20 paren over vier pagina's). Vraag **4–14 woorden** (D). Antwoord **15–120 woorden** (D; plafond gezet ruim boven het gemeten maximum van 72). |
| **DOCUMENT MODE** | registerveld **60–75 tekens** breed, één kolom, 0 beelden, 0 vlakken behalve de open rij. Rijen over de volle veldbreedte. Max **20** items. |
| **HYBRID MODE** | registerveld **40–48%** van de werkbreedte naast een visueel podium van 48–56% (§3.4). Max **8** items, want het podium moet de registerhoogte kunnen overspannen. Podium : kolom breedteverhouding **≥ 1,10** (B, n=6: gemeten 1,12 · 1,38 · 2,02 · 2,24 · 3,52 · 3,69). |
| **CANVAS MODE** | **niet toegestaan.** Een FAQ is geen onderwerp dat een canvas vult → `N.V.T.-met-reden = verkeerde modus`. |
| **hoogte BEREKEND** | kop 160 (eyebrow 13 + kop 53 × 2 regels bij lh 0,98 = 104 + 43 lucht) · 5 gesloten rijen × 64 (18,9 label + 2×22 padding + 1px lijn) = 320 · 1 open rij 249 (64 + 6 regels × 27 + 24 voet) → **729px ≥ 443,5** ✔ bij 6 items. Bij 4 items: 160 + 3×64 + 249 = **601px** ✔. |
| **waarom het niet vervalt tot "kop plus drie witte kaarten"** | S3-15: ≥ 4 rijen (drie kaarten = 3), ≤ 1 vlak (drie kaarten = 3), verticaal (drie kaarten = horizontaal). Bovendien: een gesloten rij heeft radius 0 en geen schaduw, dus er is geen kaart om te zien. |
| **poort** | **S3-16.** `rijen ≥ 4` · `gevlakte rijen = 1` · `haarlijnen = rijen − 1` · `max/min(vraagbreedte) ≤ 1,01` · `sectiehoogte ≥ 443,5px @1774` · `elk antwoord ≥ 15 woorden`. Een leeg antwoord of een rij zonder antwoord → **FAIL**, nooit `PASS`. |

---

### **REG-2 SPECIFICATIEREGISTER** — technische specificatie

| | |
|---|---|
| **inhoudstype** | sleutel-waardeparen in groepen: vermogen, capaciteit, afmetingen, aansluiting, certificering. Gemeten behoefte: V1.2 heeft **geen M-code, geen K-familie, geen blauwdruk en geen beslisboomtak** voor een specificatie (`kritiek-overfitting.md` §3.3). |
| **anatomie** | registerkop → `g` groepen, elk met een groepskop → per groep `p` paren in twee kolommen: **sleutelkolom** + **waardekolom**. Geen vlak per paar. Precedent voor de paartypografie: het gemeten `dl` in K2-S06 — `dt` 21/700 blauw, `dd` 14/400 `#7C88A2` (`home-proof.css`). |
| **maten · VAST** | sleutelkolom **30–38%** van de registerveldbreedte (D; afgeleid uit de typografie: een sleutel van 3–5 woorden op één regel vraagt bij 15–16px ongeveer 200–280px, dus 30–38% van een veld van ~700px) · haarlijn 1px per paar · groepskop in het eyebrowregime · paarhoogte = `lh(waarde) + 12px` |
| **maten · AFGELEID** | aantal groepen · aantal paren per groep · waardekolombreedte = rest · sectiehoogte |
| **hierarchie zichtbaar** | drie niveaus, elk met een eigen regime: sectiekop (53–66 / 700 / negatieve tracking) → groepskop (11,2–13,0 / 700 / **positieve** tracking 0,133–0,220em) → paar (sleutel 16,0–18,9/700, waarde 15,3–19,0/400). De drie trackingtekens zijn **−, +, 0** en overlappen nergens; gemeten over de master: eyebrow 8 van 8 positief, kop 8 van 8 negatief, lead 7 van 7 exact 0. (A) |
| **één dominante groep toegestaan** | **ten hoogste één** groep krijgt het enige vlak van het register én **precies één veld dat de andere groepen missen** (bijvoorbeeld een voetnootregel). Dat spiegelt het gemeten dominantiepatroon: de dominante K1-kaart draagt als enige een statistiekbalk. (A) |
| **inhoudscapaciteit** | **2–5 groepen × 4–12 paren = 8–60 paren** (D). Sleutel ≤ 5 woorden, waarde ≤ 12 woorden (D). |
| **DOCUMENT MODE** | één registerveld over 60–75 tekens; twee kolommen; 0 beelden. |
| **HYBRID MODE** | registerveld **48–58%** naast `NF-1` TECHNISCHE PRODUCTCOMPOSITIE op 38–48%. Bindingsregel S3-08 geldt: geen rand van het veld valt samen met een rand van de compositie, absolute afstand ≥ 8px. |
| **CANVAS MODE** | niet toegestaan → `N.V.T.-met-reden = verkeerde modus`. |
| **hoogte BEREKEND** | kop 160 · 2 groepskoppen × 36 = 72 · 20 paren × 37 (24 lh + 12 lucht + 1px) = 740 → **972px ≥ 443,5** ✔. Minimumgeval: 160 + 36 + 8×37 = **492px** ✔. |
| **claimpolicy** | elke waarde is een **productspecificatie** en moet op de bijbehorende `systeem-*.html` staan — toets (b) van `brandbook §6.2`. Een waarde zonder die bron is `UNVERIFIED` en wordt **niet geplaatst**; de rij vervalt, er komt geen plaatshouder (`§6.3`). |
| **waarom het niet vervalt** | S3-15 (a)(b)(c)(d) + de drie trackingregimes. Drie witte kaarten hebben één typografisch niveau en nul haarlijnen. |
| **poort** | **S3-17.** `paren ≥ 8` · `groepen ≥ 2` · `gevlakte groepen ≤ 1` · `sleutelkolom 30–38%` · drie trackingtekens **−/+/0** aanwezig · **elke waarde heeft een bron in deze codebase**. Een paar met een lege waarde → **FAIL**. Een register met 0 paren → `N.V.T.-met-reden`, en dan hoort de sectie er niet. |

---

### **REG-3 VERGELIJKINGSREGISTER** — vergelijking en matrix

| | |
|---|---|
| **inhoudstype** | `n` opties × `m` eigenschappen. Gemeten behoefte: **2** `<table>` in de repo (`capaciteit-als-dienst.html`, `laadplein-zonder-verzwaring.html`), **20 pagina's** met prijs-/tariefwoorden, en nul V1.2-dekking. |
| **anatomie** | registerkop → kopregel met `n` optiekoppen → `m` eigenschapsrijen, elk met een eigenschapslabel links en `n` waardecellen. **Geen cel heeft een eigen vlak.** Scheiding = 1px haarlijn per eigenschapsrij; gemeten precedent `#E5EFFA` (398px, K8-S02) en `#DCE7F3` (69px, K7-S01). |
| **maten · VAST** | optiekolom **≥ 180px** (D; afgeleid van de gemeten K5-kaart van 197px die een naam van 18px plus een ondertitel van 14px draagt) · eigenschapskolom 26–34% van het veld · rijhoogte = `lh(waarde) + 2 × 12px` · haarlijn 1px |
| **maten · AFGELEID** | aantal opties · aantal eigenschappen · kolombreedte = `(veld − eigenschapskolom) ÷ n` · sectiehoogte |
| **registertoets** | een vergelijking haalt **R-a, R-b en R-d per definitie**: de opties zijn uitwisselbaar, dragen exact dezelfde veldenset en geen optie heeft een eigen CTA. **R-c moet je tellen**: `woorden(langste cel) ÷ woorden(kortste cel) ≤ 1,40`. Daarom zijn de kolommen **exact gelijk** (`max/min ≤ 1,01`) — en dat is onder DR-S-01 toegestaan, waar GRENS 2 het verbood. |
| **één aanbevolen optie toegestaan** | wordt één optie aanbevolen, dan haalt de rang R-d níét en moet de rang ongelijk: die kolom wordt **≥ 1,20×** zo breed als de andere én krijgt het enige vlak van het register én precies één extra veld (bijvoorbeeld een `aanbevolen`-label). (A, gemeten ondergrens 1,208) |
| **hierarchie zichtbaar** | de optiekoppen zitten in de ONDERSTEUNEND-typeband (18,4–22,0/700), de cellen in de MICRO-band (14,3–17,4/400), het eigenschapslabel in het rijlabelregime (16,0–18,9/700). Daarmee zijn er drie zichtbare niveaus zonder één kaartvlak. |
| **inhoudscapaciteit** | **2–4 opties** (A — gemeten `G06`: "een rij draagt 2, 3 of 4 kaarten; **0 rijen met ≥ 5**") × **4–14 eigenschappen** (D) = **8–56 cellen**. Cel ≤ 6 woorden (D). |
| **DOCUMENT MODE** | de matrix neemt **72–90%** van de werkbreedte. Past hij niet, dan **scrolt hij binnen zijn eigen `overflow-x`-container** — de pagina scrolt nooit horizontaal. Max 4 opties. |
| **HYBRID MODE** | max **3** opties naast `NF-3` BEWIJSCOMPOSITIE of `NF-6`. |
| **CANVAS MODE** | niet toegestaan → `N.V.T.-met-reden = verkeerde modus`. |
| **hoogte BEREKEND** | kop 160 · kopregel 64 · 8 eigenschapsrijen × 48 = 384 → **608px ≥ 443,5** ✔. Minimumgeval 4 rijen: 160 + 64 + 192 = **416px** ✘ → **bij 4 eigenschappen haalt REG-3 de MEDIUM-hoogte niet** en moet hij gekoppeld worden; **vanaf 6 eigenschappen** (160 + 64 + 288 = 512px) staat hij zelfstandig. |
| **claimpolicy** | elk getal in een cel is **`VERIFIED` of `SUPPORTED`**, anders komt het er niet. Een onbekende waarde wordt een expliciete `—`; **een lege cel is een FAIL, geen PASS** (de lege-verzamelingsgrendel S3-00 geldt ook per cel). Een vergelijking die een concurrent noemt valt buiten dit hoofdstuk → VISUELE REVIEWVRAAG plus juridische toets. |
| **waarom het niet vervalt** | drie witte kaarten kunnen geen matrix zijn: ze hebben geen eigenschapskolom, geen haarlijnen en geen tweede as. Toets `(d)` van S3-15 slaat hier bewust niet op de optiekolommen (die zijn horizontaal) maar op de **cellen**: `aantal cellen met een eigen vlak = 0`. |
| **poort** | **S3-18.** `opties ∈ [2,4]` · `eigenschappen ≥ 4` · `cellen met eigen vlak = 0` · `gevlakte kolommen ≤ 1` · `max/min(kolombreedte) ≤ 1,01` **of** `≥ 1,20 met één extra veld` · `lege cellen = 0` · `getallen zonder bron = 0` · geen horizontale paginascroll. |

---

### **REG-4 VERLOOPREGISTER** — proces

| | |
|---|---|
| **inhoudstype** | alles met een **volgorde**: proces, keten, doorlooptijd, implementatie. |
| **verschil met B05** | `B05 VOORTGANGSRIJ` staat op **3–5 stappen van 9–11 woorden** en bestaat alleen horizontaal. REG-4 moet **3–7 fasen van 9–35 woorden** dragen én verticaal werken, want de gemeten papieren pagina's dragen 4 tot 7 implementatiestappen. |
| **anatomie** | registerkop → `f` fasen. Fase = **ordinaal** (genummerde badge) + titel + 1–3 regels + optioneel een doorlooptijdlabel. **Geen vlak per fase.** Over de hele reeks loopt **één doorlopende verbinder**: horizontaal chevrons tussen de fasen, verticaal een doorlopende 2px lijn. |
| **maten · VAST** | badge **32–38px**, radius = `0,19 × badge` (A: gemeten 0,172–0,206 over 5 tegels; gemeten badges 35,1 en 36,2 met radius 6,21) · icoon 48px of geen · verbinderlijn 2px · verticale indent = `badge + 0,5 × badge` · horizontale steek onderling gelijk tot **≤ 1%** (A: gemeten 430,6 · 430,7 · 430,6 = afwijking 0,1px = 0,02%) |
| **maten · AFGELEID** | aantal fasen · fasehoogte = regels × `lh` · steek = `(veldbreedte − fasebreedte) ÷ (f − 1)` · sectiehoogte |
| **hierarchie zichtbaar** | de hierarchie **ís de orde**, en die wordt op drie manieren zichtbaar gemaakt, alle drie verplicht: **(1)** elke fase draagt een zichtbaar ordinaal; **(2)** er loopt één **doorlopende** verbinder over de hele reeks — niet een decoratie tussen paren; **(3)** de eerste fase draagt de eyebrow en de laatste fase draagt de **enige** CTA van het register. |
| **registertoets** | de fasen zijn **niet** uitwisselbaar (R-a = NEE) → onder S3-13 moet de rang dus ongelijk zijn. **Uitzondering, gemeten:** `B05` meet 4 stappen van exact 292,1px, `max/min = 1,000`, in de contentgedreven-vrijstelling vallen ze niet (ze dragen 2 tekstblokken, 0 CTA, badge 36,2 ≤ 63 → **wél** in de vrijstelling). → **een verloopregister mag gelijke fasen hebben omdat het ordinaal de ongelijkheid draagt.** Dat is een eigen vrijstelling: `DR-S-07`. |
| **inhoudscapaciteit** | **3–7 fasen** (D; gemeten 4 op de master, 4–7 nodig op de papieren pagina's). Titel ≤ 4 woorden (B, gemeten ≤ 2). Body **9–35 woorden** (D; plafond gezet net boven het grootste gemeten tekstvat in alle vijftien blauwdrukken, **32 woorden**). Doorlooptijdlabel ≤ 3 woorden. |
| **DOCUMENT MODE** | verticaal. Links een doorlopende 2px lijn, de badges erop, de tekst erachter. 3–7 fasen. Veldbreedte 60–75 tekens voor de body. |
| **HYBRID MODE** | horizontaal, **3 of 4** fasen naast of onder een podium. Chevrons tussen de fasen; gemeten precedent `#B9C7D8`. |
| **CANVAS MODE** | niet toegestaan → `N.V.T.-met-reden = een proces is geen canvasonderwerp`. |
| **hoogte BEREKEND** | **verticaal**, 5 fasen: kop 160 + 5 × 148 (badge 36 + titel 26 + 2 regels 54 + 32 lucht) = **900px ≥ 443,5** ✔. **horizontaal**, 4 fasen: kop 160 + rij 155 (gemeten stapblokhoogte 154,4) = **315px** ✘ — **de horizontale vorm haalt de MEDIUM-hoogte niet en kan dus NIET zelfstandig een MEDIUM-sectie dragen.** Hij mag alleen gekoppeld, precies zoals de master het doet: `B04 + B05` in één sectie. Dat staat hier als meetbare uitkomst, niet als voorkeur. |
| **waarom het niet vervalt** | drie witte kaarten hebben geen ordinaal en geen doorlopende verbinder. Beide zijn in REG-4 verplicht en beide zijn met het oog te zien. |
| **poort** | **S3-19.** `fasen ∈ [3,7]` · `fasen met eigen vlak = 0` · `fasen met een zichtbaar ordinaal = fasen` (niet "≥ 1") · `verbinders = 1 doorlopende` · horizontaal: `max/min(steek) ≤ 1,01` · `CTA's in het register ≤ 1` · verticaal: `sectiehoogte ≥ 443,5px`; horizontaal zelfstandig: **FAIL** met de reden "315px BEREKEND < 443,5px". |

---

### **REG-5 BETOOGREGISTER** — lange redactionele en juridische tekst

Dit is het register dat V1.2 volledig miste. `algemene-voorwaarden.html`: **215 regels, 6106 woorden,
13 `<h2>`, 1 beeld, 0 `data-screen-label`**; hoofdstukken van **62 · 210 · 1140 · 1581 · 425 · 213 ·
294 · 328 · 1086 · 198 · 205 · 81 · 120** woorden, spreiding **25,5**. V1.2's grootste tekstvat is
32 woorden; 6106 ÷ 27 woorden per `B15`-sectie = **226 secties**.

| | |
|---|---|
| **inhoudstype** | juridisch document, lange redactionele uitleg, beleid, voorwaarden. |
| **anatomie** | drie zones:<br>**(1) REGISTERINDEX** — `c` hoofdstuklinks als MICRO-rijen: geen vlak, 1px haarlijn per rij, ordinaal + hoofdstuktitel.<br>**(2) KAPITTELS** — per hoofdstuk: kapittelkop + lopende tekst + optionele tussenkoppen en lijsten.<br>**(3) KAPITTELVOET** — optioneel: 1px haarlijn + één tekstlink "terug naar index". |
| **de structurele vondst** | **de sectie is niet de eenheid; het hoofdstuk is het.** V1.2 brak omdat elk hoofdstuk een eigen sectie met een hoogtebudget moest worden: `G17` (≤ 1,6× de kleinste sectie), `G20` (leegte ≤ 25%) en `P-14` (max/min ≤ 2,0) laten samen een spreiding van **2,13** tot **2,67** toe, tegenover een gemeten **25,5**: een factor **9,6 tot 12** te veel. REG-5 plaatst **alle `c` hoofdstukken in één sectie** en laat de sectiehoogte de inhoud volgen. |
| **maten · VAST** | indexrij 40px · haarlijn 1px · kapittelvoet 1px + 1 link · leesmaat 60–75 tekens (D) |
| **maten · AFGELEID** | aantal hoofdstukken · woorden per hoofdstuk · kapittelhoogte · indexhoogte = `c × 40` · sectiehoogte = index + Σ kapittels |
| **typografische trap — exact drie niveaus** | sectiekop **53–66** → kapittelkop = `sectiekop ÷ 1,35…1,60` = **33–49px** → tussenkop = `kapittelkop ÷ 1,35…1,50` = **22–36px** → lopende tekst **17–19 / 400 / lh 1,55–1,70**.<br>De **stapfactor ≥ 1,35** is overgenomen uit `P-08`, dat `max/min` van de H2-graden op **≤ 1,35** begrenst; die bovengrens voor spreiding *tussen* koppen wordt hier de ondergrens voor de stap *tussen niveaus*. (A voor het hergebruik van 1,35; de 1,13 die `G13`/`B08` meet voor twee koppenniveaus in één sectie is met 13 hoofdstukken onbruikbaar — dan is de kapittelkop 47px en concurreert hij met de sectiekop.) |
| **hierarchie zichtbaar** | **(1)** drie niveaus en nooit een vierde; **(2)** de index noemt elk hoofdstuk — `aantal indexregels = aantal hoofdstukken`, een verschil is een `FAIL`; **(3)** het **actieve** hoofdstuk is het enige element in het hele register met een vlak (de indexregel van het actieve hoofdstuk); **(4)** elke kapittelkop draagt zijn ordinaal, zodat de diepte zichtbaar is zonder inspringing. |
| **inhoudscapaciteit** | **4–20 hoofdstukken** (D; gemeten behoefte 13 en 10) · **50–1600 woorden per hoofdstuk** (D; gemeten bereik 19–1581, dus de ondergrens 50 sluit `privacy.html`-hoofdstukken van 19 woorden uit → zie `DR-S-08`) · **spreiding tussen hoofdstukken: onbegrensd**, en dat is het hele punt. |
| **DOCUMENT MODE** | één kolom van 60–75 tekens; index erboven of in een smalle kolom ernaast; **0 beelden**; **0 vlakken** behalve de actieve indexregel. |
| **HYBRID MODE** | registerveld **52–62%** van de werkbreedte naast een visueel podium; dan **maximaal 6 hoofdstukken**, want het podium moet de registerhoogte kunnen overspannen. Podium : kolom ≥ 1,10 (B, n=6). |
| **CANVAS MODE** | niet toegestaan → `N.V.T.-met-reden = verkeerde modus`. |
| **hoogte BEREKEND** | 13 hoofdstukken: kop 160 + index 13 × 40 = 520 + eerste kapittel ≥ 50 woorden (3 regels × 28) = 84 → **≥ 764px** ✔, en met alle 6106 woorden ver daarboven. Minimumgeval 4 hoofdstukken × 50 woorden: 160 + 160 + 4 × (49 kapittelkop + 84) = **852px** ✔. |
| **waarom het niet vervalt** | de body is **lopende tekst**, niet kaartinhoud. Drie witte kaarten kunnen 1581 woorden niet dragen en missen de index. S3-15(a) eist ≥ 4 rijen in de index en S3-15(b) laat precies één vlak toe. |
| **claimpolicy** | juridische tekst valt niet onder de zes claimcategorieën van `brandbook §6.1`, maar wél onder `§6.2`: een getal in een voorwaarde (termijn, bedrag, percentage) is een **contractuele afspraak** en moet toets (c) halen — zichtbaar gekwalificeerd en met een bron in deze codebase. |
| **poort** | **S3-20.** `hoofdstukken ≥ 4` · `indexregels = hoofdstukken` · `koppenniveaus = 3` · `stapfactor tussen niveaus ≥ 1,35` · `vlakken in het register ≤ 1` · `langste regel 60–75 tekens` · `hoofdstukken met 0 woorden = 0`. Een hoofdstuk zonder tekst → **FAIL**. Een index die niet elk hoofdstuk noemt → **FAIL**. `G17`/`G20`/`P-14` zijn binnen een REG-5-sectie `N.V.T.-met-reden = DOCUMENT MODE, hoofdstuklengte is de inhoud` → zie `DR-S-03`. |

---

### 3.3.3 Bouwbaarheidscontrole — de twee archetypes die V1.2 niet aankon

| pagina | gemeten lading | V1.2 | V1.3 met registers | foto's nodig |
|---|---|---|---|---|
| `algemene-voorwaarden.html` | 6106 woorden · 13 hoofdstukken van 62–1581 · spreiding 25,5 · 1 beeld · 0 `data-screen-label` | **ONBOUWBAAR** — 226 `B15`-secties nodig; `G20` faalt op 81,4% leegte in het kleinste hoofdstuk; `P-03`/`P-08`/`P-14`/`P-15` rekenen op lege lijsten en geven `NaN` → `FAIL` | opening `NF-4` · **één** `REG-5`-sectie met alle 13 hoofdstukken · optioneel `REG-1` · sluitband = **4 secties** | **0** |
| `privacy.html` | 515 woorden · 10 hoofdstukken van 19–78 · spreiding 4,1 · B7-master | **ONBOUWBAAR** — spreiding 4,1 tegen een budget van 2,13 | opening `NF-4` · één `REG-5` met 10 hoofdstukken · sluitband = **3 secties** | **0** |
| FAQ over vier pagina's | 20 paren, 5 per pagina · `FAQPage`-schema op 3 | **geen plaats** (`papiertest.md` §8.1) | één `REG-1` per pagina, 5 items, 729px BEREKEND | **0** |
| `capaciteit-als-dienst.html` + `laadplein-zonder-verzwaring.html` | 2 `<table>` · 20 pagina's met tariefwoorden | **geen M-code, K-familie, blauwdruk, poort of beslisboomtak** | `REG-3`, 2–4 opties × 6–14 eigenschappen | **0** |
| technische systeempagina's | specificaties zonder dekking in V1.2 | beslisboom eindigt bij "GEEN KAART" | `REG-2`, 8–60 paren | **0** |

**Vijf registers, nul foto's nodig.** Dat is de voorwaarde die uit de beeldvoorraad volgt: van de
**27 verschillende opnamen** zijn er **9 klasse A**, verdeeld over **48 pagina's** — gemiddeld minder
dan één sterk beeld per pagina (`BEWIJS-assets.md` §4). Een systeem dat per pagina acht tot tien unieke
premiumfoto's vraagt, is niet uitvoerbaar.

> **S3-21 · REGISTERS EISEN GEEN BEELD.** Een sectie met rol DOCUMENT MODE en een `REG-`-code heeft
> `beelden = 0` als geldige, **PASS**-waardige uitkomst. De poorten die een beeld eisen — `P-04`
> (≥ 3 secties met een informatievlak op een beeld), `P-05` (≥ 1 beeld ≥ 90%vw én ≥ 3 ≥ 50%vw),
> `P-06` (≥ 50% gemaskeerde beeldsecties) — zijn per DOCUMENT-MODE-sectie
> `N.V.T.-met-reden = DOCUMENT MODE`. (A) Zonder deze regel falen **39 van de 48 pagina's** `P-05`
> ongeacht het ontwerp, en **23 van de 48** zijn met de poort niet eens meetbaar.

---

## 3.4 · DE ZES NIET-FOTOGRAFISCHE VISUELE MIDDELEN

### 3.4.0 Waarom er zes zijn en niet één

`vibe-image-system-v1.md` §9 **MFQ-01** en **F-6** staan **M0 maximaal 1× per pagina** toe. Gemeten
behoefte op de vijf papieren pagina's: **5 · 6 · 6 · 7 · 6 fotoloze inhoudsblokken**, tekort **−2 tot
−4** per pagina (`papiertest.md` §8.2). Met 9 klasse-A-beelden voor 48 pagina's is dat tekort structureel.

> **DR-S-09 · M0 WORDT VERVANGEN DOOR EEN PLAFOND PER MIDDEL.** Niet "maximaal één sectie zonder
> foto", maar: **elke `NF-`-code maximaal 2× per pagina**, en **maximaal 5 NF-secties per pagina**.
> Met zes codes is het absolute maximum dus 5 fotoloze inhoudssecties — ruim genoeg voor de gemeten
> 5–7 blokken wanneer twee blokken één sectie delen, zoals de master zelf doet (`B04+B05`, `B07+B08`).
> Dit hoofdstuk bezit MFQ-01 niet; de beeldsysteemlaag moet dit overnemen.

**Elk middel moet zelfstandig een MEDIUM-sectie dragen:** ≥ 443,5px @1774, leegte ≤ 25%, dominant vlak
≥ 27%vw en ≥ 49% van de sectiehoogte (S3-05). Elk middel heeft daarnaast een **harde ondergrens** die
voorkomt dat het vervalt tot kop-plus-drie-kaarten.

### 3.4.1 Twee claimregels die over alle zes gaan

Uit `brandbook §1A.7` en §6.1–6.3:

> **S3-22 · GEEN ONGEDEKT CIJFER IN EEN GEBOUWD BEELD.** Elk getal in een `NF-`-compositie is
> **`VERIFIED`** of **`SUPPORTED`** en heeft een primaire bron in déze codebase. `UNVERIFIED` →
> het getal komt er niet, en er komt **geen plaatshouder** (`§6.3`). Gemeten precedent: acht
> referentiewaarden zijn bij naam verboden (842 kW · 612 kW · 230 kW · 78% · 12% · 34% · 48% ·
> 12 sep. 2026) omdat geen van de acht in de repository voorkomt. **Een compositie met 0 gedekte
> getallen levert `N.V.T.-met-reden` en valt terug op `NF-4`; hij wordt nooit met nullen gevuld.**

> **S3-23 · GEEN GESUGGEREERDE INSTALLATIE.** Een systeemtopologie, een productcompositie of een
> datavisualisatie draagt een **zichtbaar** label dat zegt wat het is: `Schematische weergave` of
> `Voorbeeldweergave`. Gemeten precedent: `Voorbeeldweergave` staat in de voettekst van het
> VIBE.CONTROL-paneel (`index.html:688`), met de uitgeschreven reden op `:650-652`. Een topologie
> noemt **geen** projectnaam, adres of vermogen tenzij dat getal `VERIFIED` is **voor dat benoemde
> project** én het project in de tekening wordt genoemd. Label ontbreekt → **FAIL**.

### 3.4.2 Het abstractieverbod — en hoe dit hoofdstuk het respecteert

`brandbook §1A.4` punt 3 verklaart **vijf** composities niet-abstraheerbaar: de homepage hero-stage,
de VIBE.CONTROL-dashboardcompositie, de Hedin featured-projectcompositie, de homepage process timeline
en de final CTA diagonal composition. V1.2's tweede fout was dat het die vijf alsnog tot herbruikbare
blauwdrukken maakte.

> **S3-24 · PRECEDENT, GEEN BLAUWDRUK.** Waar een `NF-` of `REG-`-code naar één van die vijf
> composities verwijst, is dat **uitsluitend als gemeten precedent voor een verhouding of een
> signatuur**, nooit als anatomie om te hergebruiken. Elke `NF-`-code heeft daarom **eigen** afgeleide
> maten (S3-03) en **nul** overgenomen px-waarden uit die vijf composities. Een `NF-`-instantie waarvan
> ≥ 3 gemeten maten gelijk zijn aan de mastercompositie → **FAIL** op S3-03. `§1A.4` is `FROZEN` en
> wint; dit hoofdstuk schrijft daarom nergens `.vibe-hero-stage`, `.vibe-console` of `.vibe-timeline`
> voor.

---

### **NF-1 TECHNISCHE PRODUCTCOMPOSITIE**

| | |
|---|---|
| **wat het is** | het eigen product — batterijkast, omvormer, laadpunt, schakelkast — als **gebouwd object** met uitgelichte onderdelen en aanwijsregels. Geen foto, geen render, geen stockmockup. |
| **anatomie** | dominant objectvlak + **3–8 aanwijsregels** (MICRO: geen vlak, 1px aanwijslijn, label 15,2–18,9/700 + regel 14,3–17,0/400) + optioneel één ONDERSTEUNEND vlak met de kernspecificatie. |
| **maten · VAST** | objectvlak **≥ 38%vw** (A; gemeten dashboard 38,7%vw, en het gemeten antipatroon van `B06` zegt dat een object onder ~45%vw "de rol van onderwerp verliest") · aanwijslijn 1px · labelafstand tot het object ≥ 8px (S3-08) · radius van het objectvlak uit de band `op/gebouwd`: **11,7–20,0px** (A) |
| **maten · AFGELEID** | aantal aanwijsregels · objecthoogte · labelposities · sectiehoogte |
| **hierarchie** | object = DOMINANT · kernspecificatievlak = ONDERSTEUNEND (0,14–0,62 × het object) · aanwijsregels = MICRO (geen vlak) |
| **MEDIUM-hoogte BEREKEND** | object 38%vw = 674px breed; bij ratio 1,60 (gemeten dashboardratio) → 421px hoog = 71% van een sectie van 592px → sectie **592px ≥ 443,5** ✔ |
| **HARDE ONDERGRENS** | **(1)** `beelden in de sectie = 0` · **(2)** `onderdelen met een eigen label ≥ 3` · **(3)** het object is **≥ 38%vw** · **(4)** elke aanwijsregel raakt het object met een lijn, dus `aanwijslijnen = aanwijsregels` · **(5)** `vlakken in de sectie ≤ 2` (object + ten hoogste één specificatievlak). **Drie witte kaarten falen (2), (3), (4) en (5).** |
| **DOCUMENT / HYBRID** | HYBRID: object 38–48% naast `REG-2` op 48–58%. DOCUMENT: niet van toepassing → `N.V.T.-met-reden = een object is geen lopende tekst`. |
| **claim** | elk genoemd onderdeel bestaat in het echte product; elke specificatie staat op de bijbehorende `systeem-*.html` (toets b). Label `Schematische weergave` verplicht (S3-23). |

---

### **NF-2 SYSTEEMTOPOLOGIE**

| | |
|---|---|
| **wat het is** | de keten bron → omvorming → opslag → belasting → net als knoop-en-verbindingstekening. Verklaart het **mechanisme**, niet een installatie. |
| **anatomie** | tekenvlak + **≥ 5 knopen** + **≥ 4 verbindingen** + ten hoogste **1 hub** + een legenda van 2–4 MICRO-regels + het verplichte label. |
| **maten · VAST** | tekenvlak ≥ 38%vw · knoop 40–72px · hub ≤ 1,5× een knoop (gemeten precedent: hub 48,1px tegen knopen in het stroomschema) · verbindingslijn 2px · legenda-regels zonder vlak |
| **maten · AFGELEID** | aantal knopen · aantal verbindingen · knooppositie · tekenvlakhoogte · sectiehoogte |
| **hierarchie** | tekenvlak = DOMINANT · hub = het enige element met een eigen grond, dus de zichtbare top van de topologie · knopen = MICRO · legenda = MICRO |
| **MEDIUM-hoogte BEREKEND** | tekenvlak 38%vw = 674px bij ratio 1,45 → 465px hoog; + kop 160 → sectie **625px** met het tekenvlak op 74% ✔ |
| **HARDE ONDERGRENS** | **(1)** `knopen ≥ 5` — onder 5 leest een topologie als een icoonrij · **(2)** `verbindingen ≥ 4` en elke knoop heeft **≥ 1** verbinding; een losse knoop → **FAIL** · **(3)** `richting zichtbaar` op elke verbinding (pijl of animatierichting) · **(4)** `hubs ≤ 1` · **(5)** label `Schematische weergave` zichtbaar · **(6)** `vlakken met een eigen grond ≤ 2`. **Drie witte kaarten falen (1), (2) en (3).** |
| **DOCUMENT / HYBRID** | HYBRID: tekening 48–56% naast een redactionele kolom van 40–48%. DOCUMENT: `N.V.T.-met-reden`. |
| **claim** | **geen actuele installatie suggereren** (S3-23): geen projectnaam, geen adres, geen vermogen tenzij `VERIFIED` voor een benoemd project dat in de tekening staat. Gemeten precedent voor de noodzaak: `645 kWh` reist in de repo naar **drie** plaatsen waar het niet hoort (`systeem-ems.html:188`, `:193`, `industrie-vastgoed.html:180`) terwijl `systeem-energieopslag.html:317-322` dat conflict beschrijft en blokkeert. |

---

### **NF-3 BEWIJSCOMPOSITIE**

| | |
|---|---|
| **wat het is** | 3–6 bewijswaarden met hun herkomst. De opvolger van `K7 BEWIJSBAND`, met het veld dat K7 mist. |
| **anatomie** | **geen vlak**, in 8 van 8 gemeten K7-elementen: grond `rgba(0,0,0,0)`, radius 0, geen schaduw. Cellen gescheiden door een 1px lijn (gemeten 69px hoog, `#DCE7F3`). Per cel: **getal 28,0–28,4/700** + **label 16,0–17,4/400** + **bronregel** (nieuw). |
| **maten · VAST** | celscheiding 1px · getal- en labelband als boven · cel ≥ 180px (D, zelfde ondergrens als een REG-3-kolom) |
| **maten · AFGELEID** | aantal cellen · celbreedte = `veld ÷ n` of contentgedreven · bandhoogte · sectiehoogte |
| **hierarchie** | de band is DOMINANT in rol maar MICRO in oppervlak — dit is de enige code waar dat samenvalt, en dat is toegestaan omdat het dominante **vlak** hier de sectiegrond zelf is. `N.V.T.-met-reden = bewijsband` op S3-05. |
| **MEDIUM-hoogte BEREKEND** | gemeten bandhoogte 160px (S01). Kop 160 + 3 cellen in één band 160 = **320px** ✘ **<443,5** → **met 3 waarden kan NF-3 niet zelfstandig een MEDIUM-sectie dragen.** Met 6 waarden in twee banden: 160 + 2 × 160 = **480px** ✔. |
| **HARDE ONDERGRENS** | **(1)** `waarden ≥ 3` · **(2)** `cellen met een eigen vlak = 0` · **(3)** **elke waarde draagt een zichtbare bronverwijzing naar een pagina in deze codebase** — een waarde zonder bron → **FAIL**, niet verbergen · **(4)** `aantal 1px scheidingen = aantal cellen − 1` · **(5)** zelfstandig: `waarden ≥ 6`. **Drie witte kaarten falen (2) en (3).** |
| **waarom (3) nieuw is** | `K7` heeft geen bronveld; alleen `vibe-metric cite` op de B2-kandidaat heeft dat, en **geen enkele V1.2-regel toetst herkomst** (`papiertest.md` §8.5). Dat is de directe oorzaak van de 645 kWh-migratie naar drie verkeerde pagina's. |
| **claim** | per waarde één van de drie toetsen uit `§6.2`: (a) één benoemd gerealiseerd project met eigen `project-*.html`, (b) productspecificatie op de bijbehorende `systeem-*.html`, (c) contractuele afspraak met zichtbare kwalificatie. Opgetelde bedrijfstotalen, gemiddelde uptime, CO₂-besparing, MWp-portfolio, aantal klanten en aantal medewerkers zijn **nooit** toegestaan. |

---

### **NF-4 TYPOGRAFISCH PROPOSITIEPODIUM**

| | |
|---|---|
| **wat het is** | een sectie waarvan de **zin zelf** het onderwerp is. Het goedkoopste middel in beeldbudget en het enige dat altijd beschikbaar is — daarom het terugvalmiddel van S3-22. |
| **anatomie** | statementvlak (de grond, gesneden op de merkgeometrie) + het statement + **1–3 MICRO-bewijsregels** + ten hoogste 1 CTA. **0 kaarten.** |
| **maten · VAST** | statement **≥ 40px** (A; gemeten precedent: het enige statement van de master is **40,11px in gewicht 400** met 4 woorden, `B03`) · ten minste **1 handgezette `<br>`** (A; gemeten 11 `<br>` over 7 van de 8 koppen, alle elf zichtbaar op 1774px, **geen enkele kop wrapt zelf**) · hoek uit de twee gemeten families: **scherp 27–37°** of **flauw 9–14°** |
| **maten · AFGELEID** | statementgraad = functie van het aantal woorden · aantal regels · regelval · sectiehoogte |
| **hierarchie** | statement = DOMINANT (en dan geldt de maat op het **tekstblok**: ≥ 27%vw breed en ≥ 45% van de sectiehoogte, D — de 49% uit S3-05 is op beeldvlakken gemeten en een tekstblok is geen beeldvlak) · bewijsregels = MICRO |
| **MEDIUM-hoogte BEREKEND** | statement 66px over 3 regels bij lh 1,00 = 198px = 45% van een sectie van 440px; met kop en bewijsregels: 160 + 198 + 2 × 45 = **448px ≥ 443,5** ✔ (marge 4,5px — dus dit is het **krapste** van de zes middelen en vraagt bij review aandacht). |
| **HARDE ONDERGRENS** | **(1)** `statementgraad ≥ 40px` · **(2)** `handgezette <br> ≥ 1` · **(3)** `kaartvlakken in de sectie = 0` · **(4)** statement **≥ 45%** van de sectiehoogte · **(5)** `gewicht van het statement ∈ {400, 700}` en als 400 wordt gekozen is dat het enige blok in gewicht 400 boven 24px op de pagina. **Drie witte kaarten falen (1), (3) en (4).** |
| **DOCUMENT / HYBRID / CANVAS** | alle drie. In CANVAS MODE mag het statement 100%vw aan beide schermranden raken; in DOCUMENT MODE blijft het binnen de leesmaat van 60–75 tekens **behalve** het statement zelf, dat als kop geldt. |
| **claim** | een statement is **propositie** (categorie 3) of **merkpayoff** (geen toetsbare bewering). Kwalificerende woorden zijn dragend: gemeten "mogelijk", "per situatie", "uitgelicht". Zonder die woorden wordt een propositie een garantie. |

---

### **NF-5 MERKGEOMETRISCHE COMPOSITIE**

| | |
|---|---|
| **wat het is** | een gebouwd vlak in de eigen vormtaal dat de plaats inneemt van fotografie die niet bestaat. Gemeten precedent: `span.vh-sol-grafisch`, **289×285 met een 25°-snede**, expliciet als noodgreep beschreven voor ontbrekende HVAC-fotografie (`home-solutions.css:303-305`). |
| **het risico** | dit is het middel dat het snelst tot wallpaper vervalt. Daarom de strengste ondergrens van de zes. |
| **anatomie** | gesneden grondvlak + **ten minste één inhoudselement erin** (een label, een MICRO-regel of een cijfer met bron) + optioneel één ONDERSTEUNEND vlak. |
| **maten · VAST** | vlak ≥ 27%vw **en** ≥ 49% van de sectiehoogte (A, dezelfde dominantiefloor als elk ander dominant vlak — er komt geen eigen floor bij) · hoek uit de twee families · radius uit de band `op/gebouwd` 11,7–20,0px |
| **maten · AFGELEID** | hoekpercentage = uitgerekend uit de doosverhouding, **nooit overgenomen** (`vibe-section-compositions-v1.md` §3.5) · vlakmaat · inhoudspositie |
| **hierarchie** | vlak = DOMINANT · de inhoud erin = MICRO · ten hoogste één ONDERSTEUNEND vlak erop, met binding |
| **MEDIUM-hoogte BEREKEND** | vlak 27%vw = 479px bij 49% van een sectie van 500px → 245px hoog, ratio 1,96; + kop 160 → sectie **500px ≥ 443,5** ✔ |
| **HARDE ONDERGRENS** | **(1)** het vlak draagt **≥ 1 inhoudselement** — een leeg gesneden vlak is decoratie en levert **FAIL** · **(2)** de hoek valt in **9–14°** of **27–37°**; **maximaal 1 hoek per pagina valt erbuiten**, en die uitzondering heeft een uitgeschreven reden in de code (A; gemeten: `P-12` laat `≤ 1` buitenlander toe en de master gebruikt die ene op de 25°-snede van het fotoloze vlak) · **(3)** **maximaal 2× per pagina** · **(4)** `vrijstaande versieringen ≤ 1 per pagina` (A; gemeten: 1 driehoek van 85×133 bij 32,6° in 9 secties) · **(5)** het vlak haalt de dominantiefloor. **Drie witte kaarten falen (1) en (5).** |
| **DOCUMENT / HYBRID / CANVAS** | CANVAS en HYBRID. In DOCUMENT MODE: `N.V.T.-met-reden = een getekend vlak is geen leesinhoud`. |
| **claim** | het vlak vervangt ontbrekende fotografie en mag **niets** suggereren wat er niet is: geen gebouw, geen installatie, geen plaats. Verboden alternatieven, gemeten afgekeurd: plaatshouder-slots, "in voorbereiding", "binnenkort beschikbaar", stockbeeld, AI-render. |

---

### **NF-6 GESTUURDE DATAVISUALISATIE**

| | |
|---|---|
| **wat het is** | een grafiek die een verloop verklaart — belastingprofiel, piekafvlakking, opbrengst over een dag. **Het strengst gegrendelde middel van de zes**, want een grafiek vermenigvuldigt een ongedekt cijfer met elk datapunt. |
| **anatomie** | grafiekvlak + **1–3 reeksen** + waardenas met eenheid + categorie-as + **1 bronregel** + het verplichte label. |
| **maten · VAST** | grafiekvlak ≥ 38%vw · aslijn 1px · **≥ 4 datapunten per reeks** · reeksen ≤ 3 · bronregel 14,3–17,0/400 |
| **maten · AFGELEID** | aantal reeksen · aantal datapunten · asbereik · grafiekhoogte · sectiehoogte |
| **hierarchie** | grafiekvlak = DOMINANT · legenda = MICRO · ten hoogste één ONDERSTEUNEND vlak met de conclusie in één zin |
| **MEDIUM-hoogte BEREKEND** | grafiekvlak 38%vw = 674px bij ratio 1,60 → 421px; + kop 160 → sectie **592px** ✔ |
| **HARDE ONDERGRENS** | **(1)** `reeksen ≥ 1` **en elke reeks heeft één benoemde primaire bron in deze codebase** — een reeks zonder bron wordt **niet getekend** · **(2)** `datapunten per reeks ≥ 4`; met 3 of minder is het een bewijsband en hoort het bij `NF-3` · **(3)** **de waardenas begint op 0, of de nullijn is zichtbaar gelabeld** — een afgekapte as die een verschil uitvergroot valt onder `REMOVE/REWRITE REQUIRED` · **(4)** elke as draagt een **eenheid** · **(5)** label `Voorbeeldweergave` of `Schematische weergave` zichtbaar, tenzij elke reeks `VERIFIED` is voor één benoemd project dat in de titel staat · **(6)** **een lege dataset levert `N.V.T.-met-reden` en de sectie valt terug op `NF-4`; een grafiek met 0 reeksen is nooit `PASS`.** **Drie witte kaarten falen (1), (2) en (4).** |
| **DOCUMENT / HYBRID** | HYBRID: grafiek 48–56% naast een redactionele kolom. DOCUMENT: toegestaan als volle-veldbreedte blok tussen twee kapittels van `REG-5`, maximaal 1 per sectie. |
| **claim** | **geen cijfer dat niet `VERIFIED` of `SUPPORTED` is** (S3-22). Een gemodelleerd profiel is geen meting: dan is elk getal `UNVERIFIED` en mag de grafiek **geen asgetallen** tonen — alleen vorm, met het label erbij. Dat is de enige toegestane vorm van een illustratieve grafiek. |

### 3.4.3 De zes middelen tegen de modi en de MEDIUM-eis

| code | CANVAS | DOCUMENT | HYBRID | zelfstandig MEDIUM? | kritieke ondergrens |
|---|---|---|---|---|---|
| **NF-1** productcompositie | ja | n.v.t. | ja | **ja**, 592px BEREKEND | ≥ 3 gelabelde onderdelen |
| **NF-2** systeemtopologie | ja | n.v.t. | ja | **ja**, 625px BEREKEND | ≥ 5 knopen, ≥ 4 verbindingen |
| **NF-3** bewijscompositie | ja | ja | ja | **alleen vanaf 6 waarden** (3 waarden = 320px) | bron per waarde |
| **NF-4** propositiepodium | ja | ja | ja | **ja**, 448px BEREKEND (krapste marge) | statement ≥ 40px, 0 kaarten |
| **NF-5** merkgeometrie | ja | n.v.t. | ja | **ja**, 500px BEREKEND | ≥ 1 inhoudselement in het vlak |
| **NF-6** datavisualisatie | ja | ja (1× per sectie) | ja | **ja**, 592px BEREKEND | bron per reeks, as op 0 |

**Vier van de zes dragen een MEDIUM-sectie onvoorwaardelijk; NF-3 vanaf zes waarden; NF-4 met 4,5px
marge.** Dat is de eerlijke uitkomst van de berekening en niet van een voorkeur.

---

## 3.5 · OPEN BESLUITEN — `DR-S-01` … `DR-S-12`

Elk besluit volgt uit een gemeten spreiding of uit een gezette grens. Geen ervan is een voorstel om nu
productiecode te wijzigen.

| # | besluit | wat ervoor nodig is |
|---|---|---|
| **DR-S-01** | **De rangregel vervangt C1, GRENS 1, GRENS 2 en GRENS 3.** Tussen rangen ≥ 1,55 (n=9, minimum 1,613); binnen een rang ≤ 1,01 óf ≥ 1,20 (n=5 gelijk op exact 1,000; n=4 ongelijk met minimum 1,208); verboden zone 1,01–1,20. | vaststellen of overnemen. Hiermee valt de verboden zone 1,06–1,55 van `DR-V-66` weg, die op 4 rijen rustte. |
| **DR-S-02** | **De eigen onderrij van Master v1 (371 · 353 · 355 = 1,051) faalt DR-S-01 langs beide takken.** `§1A.11` punt 3 zegt dat B1 niet wordt herbouwd. Wordt dit een gedocumenteerde afwijking van de master, of wordt de regel afgezwakt tot 1,05? | besluit. Afzwakken tot 1,05 betekent dat de regel op de master is gefit, precies V1.2's fout. |
| **DR-S-03** | **Vier poorten moeten modusbewust worden** en dat is de poortlaag, niet dit hoofdstuk: `P-09` (gelijke kaartrasters, eist ≥ 3 informatievlakken op een beeld), `P-14` + `G17` + `G20` (sectiehoogtespreiding en leegte, blokkeren `REG-5`), `P-04`/`P-05`/`P-06` (eisen beeld, blokkeren DOCUMENT MODE), `P-03`/`G23` (eisen ≥ 1 overlappaar per sectie, onhaalbaar in een registersectie). | overname door de poortlaag. Zonder deze overname blijven **39 van 48** pagina's op `P-05` falen en zijn **23 van 48** niet meetbaar. |
| **DR-S-04** | **De AANGEHECHT-band 0,02–0,07 rust op n=3** (0,039 · 0,057 · 0,066). Het gat 0,07–0,14 is gemeten maar met drie waarden aan de onderkant. Wordt de band normatief, of blijft hij `B` tot er een tweede pagina gemeten is? | een tweede gebouwde pagina meten. Nu staat hij als `B`. |
| **DR-S-05** | **Leesmaat 60–75 tekens in DOCUMENT MODE is GEZET, niet gemeten.** De master heeft geen lopende tekst van die lengte; zijn gemeten caps zijn 34–52ch op leads en kaartbody's. | meten op de eerste gebouwde `REG-5`-pagina en de grens bijstellen of bevestigen. |
| **DR-S-06** | **`lh` 1,55–1,70 voor lopende tekst is GEZET.** De gemeten lead-band is 1,276–1,450 over 7 van 7, maar gemeten op leads van ≤ 20 woorden. | idem. |
| **DR-S-07** | **REG-4 mag gelijke fasen hebben omdat het ordinaal de ongelijkheid draagt** — een eigen vrijstelling op S3-13, want R-a (uitwisselbaar) is bij een proces NEE. Is het ordinaal voldoende als hierarchiedrager, of moet ook de eerste of laatste fase een maatverschil krijgen? | visuele review op een gebouwd verloopregister. |
| **DR-S-08** | **REG-5's ondergrens van 50 woorden per hoofdstuk sluit `privacy.html` uit**, dat hoofdstukken van 19 woorden heeft (10 hoofdstukken, 19–78 woorden). Wordt de ondergrens 15 woorden, of worden korte hoofdstukken samengevoegd? | besluit bij de B7-master. |
| **DR-S-09** | **MFQ-01/F-6 (`M0` maximaal 1× per pagina) wordt een plafond per middel: elke `NF-`-code ≤ 2× en ≤ 5 NF-secties per pagina.** Dit hoofdstuk bezit MFQ-01 niet. | overname door de beeldsysteemlaag. Zonder overname blijft het gemeten tekort van −2 tot −4 fotoloze blokken per pagina bestaan. |
| **DR-S-10** | **`K7`'s "VERBODEN context: meer dan drie cellen" en `K8`'s "meer dan vier stuks"** staan `NF-3` (3–6 waarden) en de registers (8–60 rijen) in de weg. Beide plafonds zijn het gemeten maximum van een **horizontale** rij. Worden ze beperkt tot de horizontale as? | besluit; dit hoofdstuk gaat ervan uit dat ja. |
| **DR-S-11** | **Welke drie van de zes K1-kaarten in de onderrij staan** en hoeveel woorden hun koppen dragen, is **NIET GEMETEN** in deze sessie. Gemeten is alleen de spreiding over alle zes: 4–7 woorden, factor 1,75. Nodig om de registertoets voor die rij volledig af te ronden — al geeft DR-S-01 langs beide takken `FAIL`. | één meting op `index.html` @1774. |
| **DR-S-12** | **De eyebrow-trackingband botst tussen twee V1.2-documenten.** `G21` noemt +0,022…+0,175em over 8 sectie-eyebrows; `vibe-card-system-v1.md` §2 meet K3's eyebrow op **0,220em** en noemt dat "de wijdste tracking van de pagina". `REG-2` gebruikt dat regime voor groepskoppen en moet het plafond weten. | één meting die beide claims naast elkaar legt; de twee tellen vermoedelijk een andere verzameling (sectie-eyebrows tegenover kaart-eyebrows). |

---

## 3.6 · TEGENSTRIJDIGHEDEN MET V1.0 / V1.1 / V1.2

Met bestand en paragraaf. Waar `§1A` in het geding is, **wint `§1A`** (`brandbook §1.3`).

| # | tegenstrijdigheid | bestand + paragraaf | hoe dit hoofdstuk zich verhoudt |
|---|---|---|---|
| **1** | **Gelijke rij: ≤ 1,06 toegestaan tegenover drie gelijke kaarten verboden.** De master heeft 371·353·355 = 1,051, dus binnen de ene en net buiten de andere. | `vibe-card-system-v1.md` §4.1 (C1) tegen §4.8 GRENS 2; `DR-V-66` erkent dat de band op 4 rijen rust | **opgelost** door DR-S-01: zone 1,01–1,20 verboden, en de masterrij faalt. Expliciet benoemd in §3.2.3. |
| **2** | **Een gelijk kaartraster mag alleen verticaal op een beeld met scrim L ≤ 0,14.** Dat blokkeert FAQ, tabel, specificatie en `B13`. | `vibe-card-system-v1.md` §4.8 GRENS 1, tegen `vibe-section-blueprints-v1.md` §4-B13 en tegen `vibe-design-quality-gate-v1.md` `P-09` | **GRENS 1 wordt opgeheven** voor rangen die de registertoets halen. Dit lost `papiertest.md` §8.6 **T-1** op. |
| **3** | **`P-09` eist dat de sectie met een gelijke kaartrij ≥ 3 informatievlakken op een beeld heeft.** In DOCUMENT MODE is dat structureel onhaalbaar. | `vibe-design-quality-gate-v1.md` `P-09` (`S.filter(s => s.gelijkeRij.length).every(s => s.infoVlak >= 3)`) | **S3-14 vervangt het inhoudelijk**, maar de poortlaag bezit `P-09`. → `DR-S-03`. |
| **4** | **Sectiehoogtespreiding ≤ 1,6× / ≤ 2,0× en leegte ≤ 25% maken `REG-5` onmogelijk.** Gemeten behoefte: 13 hoofdstukken van 62–1581 woorden, spreiding **25,5** tegen een budget van 2,13–2,67. | `vibe-visual-grammar-v1.md` `G17` en `G20`; `vibe-design-quality-gate-v1.md` `P-14` | **`REG-5` zet alle hoofdstukken in één sectie** en vraagt een DOCUMENT-MODE-vrijstelling. → `DR-S-03`. |
| **5** | **`P-04`/`P-05`/`P-06` eisen beeld; `P-03`/`G23` eisen ≥ 1 overlappaar per sectie.** Een registersectie heeft 0 beelden en 0 overlap. Gemeten gevolg: 39 van 48 pagina's kunnen `P-05` niet halen, 23 van 48 zijn niet meetbaar. | `vibe-design-quality-gate-v1.md` `P-03`…`P-06`; `vibe-visual-grammar-v1.md` `G23` | **S3-21** maakt `beelden = 0` een `PASS`-waardige uitkomst per DOCUMENT-MODE-sectie. → `DR-S-03`. |
| **6** | **`M0` maximaal 1× per pagina tegenover een gemeten behoefte van 5 tot 7 fotoloze blokken.** En `vibe-section-blueprints-v1.md` §6 schrijft voor archetype B2 drie à vier `M0`-blauwdrukken voor. | `vibe-image-system-v1.md` §9 `MFQ-01` en `F-6`, tegen `vibe-section-blueprints-v1.md` §6; `papiertest.md` §8.6 **T-3** | **DR-S-09**: plafond per `NF-`-code (≤ 2×) en ≤ 5 NF-secties per pagina. Lost T-3 en `DR-V-O-04` op. |
| **7** | **`K7` verbiedt meer dan drie cellen; `K8` verbiedt meer dan vier stuks.** Dat maakt een vergelijking en een register van 8–60 rijen onmogelijk. | `vibe-card-system-v1.md` §2 (K7 en K8, VERBODEN context) | **DR-S-10**: beide plafonds gelden alleen op de horizontale as; verticaal gestapeld geldt het rijplafond van het register. |
| **8** | **`K4` verbiedt "naast elkaar in een horizontale rij"** terwijl `REG-3` horizontale optiekolommen heeft. | `vibe-card-system-v1.md` §2 (K4, VERBODEN context) | **geen echte botsing**: een REG-3-cel is géén K4-kaart (0 vlakken, 0 radius, 0 schaduw). Wel een **gat** dat V1.2 niet vulde: de beslisboom `§5` eindigt voor een tabel bij stap 7 "GEEN KAART". |
| **9** | **Eyebrow-tracking: plafond +0,175em tegenover een gemeten 0,220em.** | `vibe-visual-grammar-v1.md` `G21` tegen `vibe-card-system-v1.md` §2 (K3) | **onopgelost** → `DR-S-12`. `REG-2` noteert voorlopig +0,133…+0,220em en markeert het. |
| **10** | **Het abstractieverbod op vijf composities** tegenover `NF-1`/`NF-2`/`REG-4`, die hun signatuur uit het VIBE.CONTROL-dashboard en de process timeline citeren. | `vibe-web-brandbook-v1.md` §1A.4 punt 3 (`FROZEN`) | **`§1A.4` wint.** S3-24 legt vast dat die vijf uitsluitend als **gemeten precedent** worden geciteerd en dat elke `NF-`-code eigen afgeleide maten heeft. Een `NF-`-instantie met ≥ 3 maten gelijk aan de mastercompositie → `FAIL`. Dit voorkomt V1.2's tweede fout. |
| **11** | **`cqw` tegenover `clamp()` als default.** | `vibe-web-brandbook-v1.md` §1A.6 punt 2; `kritiek-overfitting.md` §5.1 | **opgelost** door §3.0.3: `cqw` hoort bij CANVAS MODE ("bewust canvas-proportionele compositie"), `clamp()` is verplicht in DOCUMENT MODE. Geen botsing meer. |
| **12** | **DR-V-nummerblok 20–29 is dubbel uitgegeven** door het beeldsysteem (§16, contrastondergrenzen) en het kaartsysteem (§7, kaartradius). | `papiertest.md` §8.6 **T-4** | **vermeden**: dit hoofdstuk gebruikt `DR-S-01…12` en `S3-00…24`, twee reeksen die in geen enkel V1.2-document voorkomen. |

---

## 3.7 · VISUELE REVIEWVRAGEN — geen poorten

Deze punten zijn niet met een getal te toetsen en staan daarom **niet** als poort.

1. Leest een rang van exact gelijke registerrijen als "tekstkolommen" of alsnog als "tegels"? De
   gemeten MICRO-signatuur (geen vlak, radius 0, geen schaduw) is het middel; of het werkt is een
   oordeel. Betreft REG-1, REG-2, REG-3.
2. Is één open rij voldoende om de hierarchie binnen `REG-1` te laten zien, of leest een accordeon
   waarvan 1 van 20 rijen open staat als een lijst zonder zwaartepunt?
3. Blijft `NF-4` met 4,5px marge boven de MEDIUM-hoogte als een **sectie** lezen, of als een
   tussenkop? Dit is het krapste van de zes middelen.
4. Is de leesmaat van 60–75 tekens bij `lh` 1,55–1,70 op een tekst van 1581 woorden prettig in de
   eigen letter? Dit is de review die `DR-S-05` en `DR-S-06` moet sluiten.
5. Leest de **doorlopende** verbinder van `REG-4` in verticale vorm als één reeks, of als een
   zijlijn? De horizontale chevronvorm is gemeten; de verticale 2px-lijn is alleen als mobiele
   declaratie gelezen, niet gerenderd gezien.
6. Suggereert een `NF-2`-topologie met het label `Schematische weergave` nog steeds een bestaande
   installatie? Het label is het middel; of het volstaat is een oordeel, en bij twijfel wint
   `§1A.7` punt 2: **PUBLICLY EXISTING ≠ VERIFIED.**
7. Is een `NF-6`-grafiek zonder asgetallen (de enige toegestane illustratieve vorm) informatief of
   leeg? Zo niet, dan valt de sectie terug op `NF-4` en verdwijnt de grafiek.
8. Draagt het ene toegestane vlak in een register voldoende onderscheid, of is er een tweede
   zichtbaar middel nodig dat géén vlak is?

---

## 3.8 · HERKOMSTOVERZICHT — elk overgenomen getal geclassificeerd

| getal / reeks | waarde | merk | waar het hier staat |
|---|---|---|---|
| paginaproportionaliteit `pageH@1440 ÷ pageH@1774` | 0,8117, afwijking 0,003% | **A** als principe · **C** als factor | §3.1.1 |
| mediane werkbreedte | 90,5% @1774 **én** @1440 | **A** als floor ≥ 85% en als krimpverbod | S3-01 |
| regellengtecaps | 34–52ch | **C** (gemeten op leads en kaartbody's) | S3-02, §3.3.2 |
| radius in de sectiegrond | 10,00px, 8 van 8 | **A** (twee banden zonder overlap) · **C** (de waarde) | §3.1.2 |
| radius op een beeld of gebouwd | 11,70 · 13,00 · 13,50 · 14,00 · 16,00 · 18,70 · 20,00 | **A** (de band) · **C** (de zeven waarden) | §3.1.2 |
| ondergrondluminantie onder vlakken | 0,048 – 0,981 (factor 20) | **A** (schaduw volgt contrast) · **B** (de drempels) | §3.1.2, S3-10 |
| drempel wit vlak op beeld | L ≤ 0,14 (uit 0,048 · 0,084 · 0,136) | **B** — n=3 | S3-10 |
| linkerpadding > rechterpadding | 1,42 · 1,31 · 1,23, 3 van 3 | **A** (asymmetrie) · **B** (de factoren) | §3.1.2 |
| paddings met vier gelijke zijden > 0 | 0 van 6 | **A** | §3.1.2 |
| dominant vlak, breedte | 19,7 · 27,5 · 41,4 · 45,7 · 52,7 · 53,9 · 62,0 · 96,1 · 100 %vw | **A** als floor ≥ 27% | S3-05 |
| dominant vlak, hoogte | 49,0 · 56,0 · 62,8 · 72,9 · 73,9 · 82,4 · 83,0 · 83,3 · 100% | **A** als floor ≥ 49% | S3-05 |
| dominant vlak, oppervlakaandeel | 15,4 · 16,4 · 26,0 · 26,4 · 28,2 · 51,5 · 52,7 · 70,9 · 82,4% | **B** — géén poort | §3.1.3 |
| sectiekop ÷ grootste vlakgraad | 2,05 · 2,31 · 2,41 · 2,73 · 3,14 · 3,22 · 3,23 · 3,80 | **A** als floor ≥ 2,0, n=8 | S3-06 |
| ondersteunend ÷ dominant oppervlak | 0,141 · 0,158 · 0,191 · 0,287 · 0,305 · 0,335 · 0,337 · 0,352 · 0,410 · 0,600 · 0,620 | **B** · **A** voor het verbod op 0,75–1,00 | §3.1.3 |
| aangehecht ÷ dominant oppervlak | 0,039 · 0,057 · 0,066 | **B** — n=3, `DR-S-04` | §3.1.3 |
| rangverhouding | 1,613 · 1,762 · 2,148 · 2,441 · 3,277 · 3,332 · 3,490 · 6,319 · 7,110 | **A** als floor ≥ 1,55, n=9 | S3-12 |
| gelijke rang, `max/min` | 1,000 × 5 | **A** als eis ≤ 1,01 | §3.2.3 |
| ongelijke rang, `max/min` | 1,208 · 1,283 · 1,467 · 1,668 | **A** als floor ≥ 1,20, n=4 | §3.2.3 |
| contentgedreven rangen | 1,167 · 1,208 · 1,467 | **A** als vrijstelling, n=3 | §3.2.3 |
| de masterrij die faalt | 1,051 | **C** — gemeten tekortkoming, geen regel | §3.2.3, `DR-S-02` |
| woordspreiding in een gelijke rang | 1,00 · 1,00 · 1,22 · 1,33 · 1,40 | **A** als plafond ≤ 1,40, n=5 | R-c in §3.2.2 |
| MICRO zonder vlak | 25 van 25 (grond `rgba(0,0,0,0)`, radius 0, geen schaduw, geen rand, padding 0) | **A** | §3.1.3, S3-15 |
| icoontegel `radius ÷ maat` | 0,172 · 0,177 · 0,197 · 0,202 · 0,206 (gem. 0,191) | **A** | §3.1.3 |
| metriekgetal in MICRO | 28,0 · 28,4px | **B** | §3.1.3 |
| typegraadoverlap over rollen | 18,0 · 18,4 · 18,6 · 18,9px | **A** als verbod op een typegraadpoort per rol | S3-07 |
| kaart-/beeldrandafstanden | 8,0 · 21,0 · 25,6 · 32,1 · 42,0 · 55,8 · 84,4px | **A** als floor ≥ 8px | S3-08 |
| aandeel vlak op beeld | 100 ×7 · 99,8 · 80,8 · 11,8 · 9,4% | **A** als verbod op 12–80% | S3-09 |
| overlapparen | 454 (0 secties zonder) tegenover 52 (4 zonder) | **C** — geen poort in dit hoofdstuk | §3.6 nr. 5 |
| sectietussenruimte K4 | steek 141,3px, lucht 15,3px = 12,1% | **A** als verhouding 0,12 | REG-1 |
| steekgelijkheid K8-S04 | 430,6 · 430,7 · 430,6 (0,02%) | **A** als eis ≤ 1% | REG-4 |
| grootste tekstvat V1.2 | 32 woorden | **C** — gebruikt als onderbouwing voor de gezette plafonds 35 en 120 | REG-1, REG-4 |
| stapfactor tussen koppenniveaus | 1,35 (uit `P-08`) · 1,13 (gemeten in-sectie, onbruikbaar bij 13 hoofdstukken) | **A** voor 1,35 · **C** voor 1,13 | REG-5 |
| statementgraad | 40,11px / gewicht 400 / 4 woorden, n=1 | **A** als floor ≥ 40px | NF-4 |
| handgezette `<br>` | 11 over 7 van 8 koppen, alle zichtbaar @1774 | **A** als eis ≥ 1 | NF-4 |
| objectbreedte | 38,7%vw (dashboard); antipatroongrens ~45%vw | **A** als floor ≥ 38%vw | NF-1, NF-2, NF-6 |
| gebouwd object, minimale lading | 3 waardetegels + 9 knopen + 1 hub | **C** · **A** omgezet naar ≥ 5 knopen en ≥ 4 verbindingen | NF-2 |
| bewijsbandhoogte | 160px | **B** — ingang van de BEREKENDE hoogte | NF-3 |
| hoekfamilies | scherp 27–37° · flauw 9–14° · ≤ 1 uitzondering per pagina (gemeten: 25°) | **A** | NF-5 |
| vrijstaande versiering | 1 per 9 secties (driehoek 85×133, 32,6°) | **A** als plafond ≤ 1 per pagina | NF-5 |
| podium : kolom breedteverhouding | 1,12 · 1,38 · 2,02 · 2,24 · 3,52 · 3,69 | **B** · **A** als floor ≥ 1,10 | HYBRID MODE |
| sectiehoogte-ondergrens | 443,5px = 25% vw (uit `P-14`) | **A** | §3.3.0 |
| leegteplafond | 25% van de sectiehoogte (uit `G20`) | **A** | §3.3.0 |
| rijen ≥ 4, gevlakte rijen ≤ 1 | — | **D** — gezet, met reden | S3-15 |
| leesmaat 60–75 tekens | — | **D** — `DR-S-05` | §3.3.2 |
| `lh` 1,55–1,70 lopende tekst | tegen gemeten lead-band 1,276–1,450 | **D** — `DR-S-06` | §3.3.2 |
| sleutelkolom 30–38% | afgeleid uit de gemeten typegraad, niet uit een layoutmeting | **D** | REG-2 |
| kolom/cel ≥ 180px | afgeleid uit de gemeten K5-breedte 197px | **D** | REG-3, NF-3 |
| itemplafonds 20 · 60 · 56 · 7 · 20 | gemeten behoefte 5–6 FAQ · 13 hoofdstukken · 4–7 stappen | **D** | §3.3 |

---

## 3.9 · WAT IN DIT HOOFDSTUK NIET IS GEMETEN

| onderwerp | reden |
|---|---|
| **Alle rendermetingen** | Dit hoofdstuk heeft **geen** screenshot gemaakt, geen harnas gedraaid en geen browser geopend. Elk getal komt uit het aanvaarde bewijs (`BEWIJS-assets.md`, `forensics-homepage.md`, `kritiek-ontduiking.md`, `kritiek-overfitting.md`, `papiertest.md`) of uit de V1.2-documenten, met de herkomst in §3.8. Niets is hier opnieuw gemeten. |
| **De BEREKENDE sectiehoogtes** | De zeven hoogtes in §3.3 en §3.4 (729 · 601 · 972 · 492 · 608 · 416 · 900 · 315 · 764 · 852 · 592 · 625 · 320 · 480 · 448 · 500) zijn **rekensommen met de ingangen erbij**, geen metingen. Zij worden nagemeten op de eerste gebouwde registerpagina. |
| **De verdeling van de zes K1-kaarten over twee rijen** | Welke drie koppen van 4–7 woorden in de onderrij staan: `DR-S-11`. Niet nodig voor de uitkomst, want beide takken van DR-S-01 geven `FAIL`. |
| **Hover op registerrijen** | Het hoverharnas van V1.2 werkte niet: na `page.mouse.move()` gaf `el.matches(':hover')` **false** op alle 18 geteste doelen. Er is dus geen gemeten hovergedrag om een registerrij op te baseren. Geen regel, geen poort. |
| **Gedrag onder 1200px** | Dit hoofdstuk beschrijft de desktopcompositie (1774 met controle op 1440). De vier gemeten collapse-bewegingen van `§5.3` gelden onverkort, maar hoe een register van 20 rijen onder 768px leest is niet berekend en niet gemeten. |
| **Toegankelijkheid van de registers** | Twee gemeten tekstsoorten op de master halen WCAG AA niet (`kritiek-overfitting.md` §6.2) en `M6-O` licentieert type van 1,03:1. Dit hoofdstuk zet daarom **geen** contrastondergrens voor registerteksten; dat hoort bij de laag die de contrastnorm bezit. Wel geldt: een registerrij staat nooit op fotopixels, dus het probleem van tekst-op-beeld doet zich hier niet voor. |
| **Of vijf registers en zes middelen de 48 pagina's werkelijk dekken** | Nagerekend voor 5 gemeten gevallen (§3.3.3). De overige 43 pagina's zijn niet doorgerekend. |

---

## 3.10 · POORTENLIJST VAN DIT HOOFDSTUK

Vijfentwintig poorten, elk met drie uitkomsten. De `N.V.T.`-reden staat er verplicht bij.

| # | poort | schaal |
|---|---|---|
| **S3-00** | lege-verzamelingsgrendel: `n > 0 && every(...)`; `0/0` → `N.V.T.` | harnas |
| **S3-01** | werkbreedte krimpt niet: `%@1774 − %@1440 ≥ −1,0 pp` | pagina |
| **S3-02** | 0 paginabrede `max-width`; ≥ 1 `ch`-cap per lopende-tekstblok | pagina |
| **S3-03** | elke `REG-`/`NF-`-code heeft afgeleide én vaste maten | code |
| **S3-04** | verklaringstoets: elke vormeigenschap herleid tot rol of binding | sectie |
| **S3-05** | 1 dominant vlak, ≥ 27%vw **en** ≥ 49% sectiehoogte | sectie |
| **S3-06** | sectiekop ÷ grootste vlakgraad ≥ 2,0 | sectie |
| **S3-07** | géén typegraadpoort per rol (gemeten overlap 18,0–18,9) | — |
| **S3-08** | kaartrand ↔ beeldrand: absolute afstand ≥ 8px | sectie |
| **S3-09** | aandeel vlak op beeld ≤ 12% of ≥ 80% | vlak |
| **S3-10** | wit vlak op beeld: ondergrond L ≤ 0,14 of tweede scheidingsmiddel | vlak |
| **S3-11** | hierarchieverantwoording aanwezig en volledig | sectie |
| **S3-12** | rangverhouding ≥ 1,55 | sectie |
| **S3-13** | registertoets 4× JA, anders ongelijk | rang |
| **S3-14** | gelijke rang mét vlak heeft een registerverantwoording | pagina |
| **S3-15** | registersignatuur (a)(b)(c)(d) | register |
| **S3-16** | REG-1 VRAAGREGISTER | sectie |
| **S3-17** | REG-2 SPECIFICATIEREGISTER | sectie |
| **S3-18** | REG-3 VERGELIJKINGSREGISTER | sectie |
| **S3-19** | REG-4 VERLOOPREGISTER | sectie |
| **S3-20** | REG-5 BETOOGREGISTER | sectie |
| **S3-21** | registers eisen geen beeld; `beelden = 0` is `PASS`-waardig | sectie |
| **S3-22** | geen ongedekt cijfer in een gebouwd beeld | sectie |
| **S3-23** | geen gesuggereerde installatie; label zichtbaar | sectie |
| **S3-24** | precedent, geen blauwdruk: ≥ 3 maten gelijk aan de master → `FAIL` | instantie |

**Zou SYSTEEM-X deze poorten halen?** De nep-pagina van 40 regels CSS had wel twee radii en drie
schaduwen, maar **nul vlakken met een rol en nul verantwoording**: `FAIL` op S3-04 en S3-11, en daarmee
op de twee poorten die geen enkele CSS-truc kan omzeilen, omdat ze geen mechanisme meten maar een
**verklaring** eisen. Dat is het verschil met V1.2, dat `display:grid`, `url(` en `backgroundColor`
telde.


---

# H4 · GEOMETRIE, TYPOGRAFIE EN TOEGANKELIJKHEID

Vibe Web Design System **V1.3**, hoofdstuk 4. Besluitprefix **DR-G**.
Dit hoofdstuk vervangt de vormlaag van V1.2: `G21` (typografisch schaalcontrast), `G22`
(merkgeometrie), de poorten `P-08`, `P-12`, `P-13`, `P-15` uit
`vibe-design-quality-gate-v1.md §3.2`, en het contrastvoorstel `DR-V-20` uit
`vibe-image-system-v1.md §16`.

| | |
|---|---|
| Meetbreedtes | 1774 · 1440 · 1200px (desktopband volgens brandbook §1A.6.1: ≥1200px) |
| Server | `http://127.0.0.1:8033/index.html` — HTTP 200 gecontroleerd deze sessie |
| Zelf gemeten deze sessie | `silhouet.mjs` → `sil-1774.txt`, `sil-1440.txt`, `sil-1200.txt` (regelvakken per kop via `Range.getClientRects()`, accentpositie, silhouetverhoudingen) · `aa-screen.mjs` → `aa-1774.txt` (CSS-voorscreening tekstcontrast, 242 tekstdragers) · `_c.mjs`/`_c2.mjs`/`_c3.mjs` (WCAG-contrast per kleurpaar, nagerekend) |
| Overgenomen bewijs | `forensics-homepage.md` §0.3 · §0.4 · §0.5 · §0.7 · §01-§09 blok D en G · `contrast-1774.txt` · `contrast2-1774.txt` · `lagen-home-1774.txt` · `kritiek-ontduiking.md` GAT-09 · GAT-10 · GAT-11 · GAT-19 · GAT-20 · GAT-21 · `kritiek-overfitting.md` §4.5 · §5.6 · §6.7 · `BEWIJS-assets.md` §3 · §4 |
| Gelezen, niet gewijzigd | `home.css:35-70, 104-127` · `home-project.css:108-140` · `home-proof.css:155-186` · `home-hero.css:368-378` · `subpage.css:420-421` · `vibe-system.css:127` |
| Wat ik niet heb gedaan | geen productiecode, geen screenshot, geen commit. Master v1 is niet gewijzigd. |

**Wat dit hoofdstuk NIET regelt:** beelduitsnede en scrimopbouw (hoofdstuk beeld), kaartanatomie,
de paginamoduskaart zelf. Dit hoofdstuk gebruikt de drie canvasmodi als **conditie** op elke vloer;
het stelt ze niet vast.

---

## 4.0 · Leesinstructie

### 4.0.1 Drie klassen, bij elk getal verplicht

| klasse | betekenis | gevolg |
|---|---|---|
| **A TRANSFERABLE FLOOR** | geldt op elke pagina van de site | wordt poort |
| **B REFERENTIEBEREIK** | richtwaarde uit één pagina | wordt géén poort; wordt reviewvraag of band zonder uitkomst |
| **C HOMEPAGE-SPECIFIEK** | beschrijft Master v1 | wordt nooit regel; staat er om een nieuwe pagina te kunnen vergelijken |

Een getal zonder klasse is in dit hoofdstuk een fout.

### 4.0.2 Drie uitkomsten, en hoe de lege verzameling wordt behandeld

Elke poort geeft **PASS**, **FAIL** of **N.V.T.-met-reden**. Regels:

1. Een poort van de vorm *"elk X voldoet aan Y"* op een **lege** X-verzameling is **N.V.T.-met-reden**,
   nooit PASS. (V1.2-fout: `[].every(...)` is `true`; `kritiek-ontduiking.md` S1.)
2. Een poort van de vorm *"het aantal X is 0"* op een bestaande sectie is een **echte meting** en mag
   PASS geven. Het verschil met punt 1: hier is de telling zelf de uitkomst, niet een eigenschap van
   leden die niet bestaan.
3. **N.V.T. moet door de paginamoduskaart worden gedekt.** Een N.V.T. zonder regel in die kaart is
   **FAIL**.
4. **NIET GEMETEN is geen uitkomst.** Een poort die niet is gedraaid heet `NIET GEDRAAID` met reden en
   telt als FAIL voor de vraag "is de pagina af".
5. Een pagina is af wanneer elke poort PASS of gedekt-N.V.T. is. Eén FAIL = niet af.

### 4.0.3 De modus conditioneert elke vloer

| modus | typografisch regime | geometrie | eenheid |
|---|---|---|---|
| **CANVAS MODE** | kopgraad als fractie van de viewportbreedte | **verplicht ≥1 drager** | `cqw` (brandbook §1A.6.2: *"`cqw` uitsluitend voor bewust canvas-proportionele composities"*) |
| **DOCUMENT MODE** | kopgraad als `clamp()` met px-plafond, regellengtecap | **verplicht 0 dragers** | `clamp()` (brandbook §1A.6.2: *"`clamp()` is de default"*) |
| **HYBRID MODE** | de redactionele kolom volgt DOCUMENT, het podium volgt CANVAS | verplicht ≥1 drager, **uitsluitend in het podium** | gemengd, grens expliciet |

Dit lost drie V1.2-tegenstrijdigheden op met een telling in plaats van een uitzondering:

- `P-13` eiste geometrie in ≥60% van **alle** secties. Op een pagina met 5 secties waarvan 3 een
  register of FAQ dragen is dat onhaalbaar (`kritiek-overfitting.md §5.6`: *"voorgerekend in §3.5:
  40% en 3 hoeken"*). In V1.3 is de noemer **CANVAS + HYBRID**, en DOCUMENT-secties horen 0 te hebben.
- `G21`'s regelafstandsband 0,951–1,000 is gemeten op koppen van 53–76,5px. Op een
  DOCUMENT-kop van 32px betekent 0,951 dat stijgers en dalers elkaar raken
  (`kritiek-overfitting.md §6.7`). In V1.3 geldt die band alleen in CANVAS/HYBRID.
- `P-08`'s kopgraadspreiding is een CANVAS-eigenschap. Een FAQ-register met tien gelijke `h3`'s van
  24px is geen fout; het is DOCUMENT MODE.

---

## 4.1 · GEOMETRIE ALS FUNCTIE

### 4.1.1 Wat er mis was, met de getallen

| # | gemeten defect | bewijs |
|---|---|---|
| 1 | **`P-13` beloont unieke floats, niet variatie.** 31,0 · 30,5 · 30,0 · 29,5° = "vier unieke hoekwaarden", spreiding **1,5°**, één familie → PASS. Master: 9,7–36,2°, spreiding **26,5°** → ook PASS. De poort scheidt de twee niet. | `kritiek-ontduiking.md` GAT-10 |
| 2 | **Er is geen ondergrens op de maat.** Een hoeknik van **3,0 × 5,0px** (hoek 31,0°, weggesneden oppervlak **0,0037%** van de beeldrechthoek, **0,0005%** van het sectievlak) haalt `P-06`, `P-12` en `P-13` in één declaratie. | `kritiek-ontduiking.md` GAT-09, trucregel T2 |
| 3 | **`P-12` is een borg die niets tegenhoudt.** Master 13 van 14 waarden in familie + 1 benoemde uitzondering = PASS; de B2-kandidaat met **viermaal exact 34,0°** = ook PASS. | `vibe-design-quality-gate-v1.md §3.2 P-12` ("deze poort houdt de kandidaat **niet** tegen") |
| 4 | **De hoek is niet de identiteit.** Van de 14 gemeten unieke hoekwaarden liggen er **6** (32,6 · 32,7 · 32,8 · 33,7 · 34,4 · 35,4) in de band 32,6–35,4° — **43%** — en **3 van de 4** rollen hebben leden in precies die band. Een hoekwaarde kan dus niet zeggen welke rol hij speelt. | eigen telling op `G22`'s rollentabel |
| 5 | **Een `calc()`-vertex is onzichtbaar.** Dezelfde polygoon levert 4 punten met `calc()` en 5 in procenten; een groot, zorgvuldig masker in `calc()` wordt stil als "geen masker" geteld. | `kritiek-ontduiking.md` GAT-11 |

**Conclusie:** V1.2 telt CSS-mechanismen. V1.3 toetst of een vorm iets dóet.

### 4.1.2 Vier functionele families

Namen vastgesteld door de opdrachtgever. De banden zijn de gemeten waarden uit `G22`, vanaf de
**verticaal** gemeten met `atan2(|dx|,|dy|)` op de werkelijke afmeting van de drager.

| familie | functie in één zin | gemeten hoeken op Master v1 | band | n | mediaan | klasse |
|---|---|---|---:|---:|---:|---|
| **RANDSNEDE** | het beeld raakt een schermrand en de snede **is** de sectiegrens | 28,1 · 31,6 · 32,7 · 32,8 · 34,4 · 35,4 (S1, S8, S9) | **28,1–35,4°** | 6 | 32,75° | **B** |
| **BEELDSNEDE** | het beeld raakt geen rand; een tekstkolom loopt langs of over de snede | 9,7 · 13,0 (S7, S6) | **9,7–13,0°** | 2 | 11,35° | **B** |
| **MERKWIG** | vol gekleurd vlak dat een hoek sluit of een rand oversteekt | 32,6 · 34,4 · 35,8 · 35,9 · 36,2 (S6, S1-band, S1-SVG, S3-SVG, S8-blauw) | **32,6–36,2°**, spreiding 3,6° | 5 | 35,8° | **A** |
| **ACHTERGRONDVELD** | getint vlak ónder de inhoud; draagt geen merkkleur | 27,3 · 32,1 · 32,6 · 32,7 · 32,8 · 33,7 · 34,4 · 35,4 · 35,4 (S1-wig, S4, S5, S8-wig) | **27,3–35,4°** | 9 | 33,7° | **B** |

**MERKWIG is de enige A-band.** Reden, gemeten: spreiding **3,6° over 5 waarden**, tegenover 7,3°
(RANDSNEDE, n=6) en 8,1° (ACHTERGRONDVELD, n=9). BEELDSNEDE is numeriek smaller (3,3°) maar heeft
**n=2**, dus die spreiding is een artefact van twee metingen. MERKWIG is daarnaast de enige familie
die een **volle merkkleur** draagt; dat is de hoek die als "het merk" wordt herkend. De drie andere
banden zijn **B**: ze komen van één pagina en hun breedte volgt uit de functie, niet uit een
merkbesluit.

**Buitenomhulsel, klasse A:** elke vrije schuine rand op elke pagina ligt in **9,0–14,0°** of
**27,0–37,0°**. Gemeten op Master v1: 13 van 14 waarden in het omhulsel; één uitzondering (25,0°,
zie 4.1.6 DR-G-07). Randen binnen 5,0° van de verticaal of horizontaal tellen niet mee als schuine
rand (gemeten uitzondering: `.vh-ctrl::before` heeft randen op 88,1° en 87,3° vanaf de verticaal,
dus 1,9° en 2,7° vanaf de horizontaal — die maken een punt, geen diagonaal).

**Niet toegestaan, met bewijs:** één vaste gradenwaarde voor alles. De B2-kandidaat heeft 4
geometrie-elementen, **alle vier exact 34,0°**, alle vier hetzelfde `::after` op een mediablok. En
omgekeerd: vier waarden binnen 1,5° (SYSTEEM-X: 31,0 · 30,5 · 30,0 · 29,5°) zijn geen variatie.

### 4.1.3 De zes structurele antwoorden, elk met een eigen meting

Elk geometrie-element moet **precies één** van deze zes antwoorden geven, en dat antwoord moet met
het bijbehorende getal worden onderbouwd. **"Decoratie" is geen antwoord.**

| # | antwoord | bewijs dat de reviewer meet | gemeten voorbeeld op Master v1 |
|---|---|---|---|
| **F1** | **verbindt media met de schermrand** | de drager heeft `left ≤ 1,5px` of `right ≥ viewport − 1,5px`, én de snede loopt dóór tot die rand (overschrijding 0,0px) | `.vh-final-blauw` raakt rechts en onder exact: overschrijding **0 en 0** (`forensics §08 D3`) |
| **F2** | **maakt een sectieovergang** | de drager kruist de sectiegrens, of begint ≤ 25px eronder/erboven en is de **enige** zichtbare scheiding (kleurverschil tussen de twee gronden ≤ 2 digits per kanaal) | `.vh-proc-backdrop` begint `1.3866cqw` = **24px** onder de sectietop en maakt zelf de scheidslijn; de gronden zijn `#FCFDFE → #FCFDFE`, verschil **0 digits** (`forensics §04 D, H`) |
| **F3** | **geeft visuele richting** | de hoek van de drager wijkt ≤ 3,0° af van de dominante diagonaal van de sectie, en wijst naar de tekstkolom of naar de volgende sectie | `.vh-proc-backdrop` 33,7°, richting linksonder→rechtsboven, **dezelfde als de hero-diagonaal** 32,8/34,4° (afwijking ≤1,1°) (`forensics §04 D`) |
| **F4** | **verankert een aangehecht vlak** | er ligt ≥1 informatievlak of tekstkolom op de drager waarvan ≥50% van het eigen oppervlak binnen de drager valt, en dat vlak heeft zonder de drager géén eigen ondergrond | `.vh-ctrl::before` is de ondergrond van twee zwevende apparaatvlakken (687×429 en 151×308) (`forensics §05 D`) |
| **F5** | **verlengt een beeldcompositie** | de hoek van de drager is gelijk aan de maskerhoek van het beeld dat erop of ernaast ligt, afwijking **≤1,0°** | 2 van 2 gemeten: S1 `.vh-wig` 32,8/34,4 = `.vh-foto` 32,8/34,4 (**0,0°**); S8 `.vh-final-wig` 32,7/35,4 = `.vh-final-foto` 35,4/32,7 (**0,0°**) (`G22`) |
| **F6** | **maakt voor- en achtergronddiepte** | de drager staat tussen twee `z-index`-niveaus die beide een eigen zichtbaar vlak hebben, en het aantal overlappende elementparen van de sectie daalt met ≥1 als de drager verdwijnt | hero: 7 gepositioneerde niveaus, `.vh-band` op z2 tussen `.vh-foto` z1 en `svg.vh-geo` z3 (`lagen-home-1774.txt` sectie 01) |

**Klasse A** voor de verplichting (elk element geeft één van de zes antwoorden met zijn getal erbij).
**Klasse B** voor de drempels 25px (F2), 3,0° (F3), 50% (F4): die komen van één pagina. De
**≤1,0°** van F5 is **A**, want hij is in 2 van 2 gevallen exact 0,0° en de regel is voorwaardelijk:
hij geldt alleen als er een beeld bij hoort.

### 4.1.4 De WEGLAATTOETS — de toets waarmee een reviewer "decoratie" vaststelt

Dit is de toets die niet te ontduiken is met een CSS-declaratie, want hij vraagt een **tweede
rendering**.

**Procedure.** Zet de drager op `display: none` (of `clip-path: none` als hij een beeld maskeert) en
meet de sectie opnieuw op dezelfde breedte. Noteer vier waarden, vóór en ná:

| # | meting | instrument |
|---|---|---|
| W1 | aantal elementen met randcontact (`left ≤ 1,5px` of `right ≥ viewport − 1,5px`) | `forensics.mjs`-regel randcontact |
| W2 | aantal overlappende elementparen in de sectie (>28×28px, overlap >8×8px, geen ouder-kindrelatie) | `poorten.mjs` P-03-definitie |
| W3 | glyphgemaskeerd contrast van elke tekstdrager die (deels) op de drager lag | 4.3.2 |
| W4 | aantal informatievlakken dat nog een eigen ondergrond heeft (achtergrondkleur, schaduw of rand binnen de drager) | `kaal.mjs`-definitie |

**Uitkomst.**

- Verandert **geen** van W1-W4 → het antwoord was **decoratie** → **FAIL**, tenzij de drager de ene
  benoemde uitzondering per pagina is (DR-G-07).
- Verandert ≥1 van W1-W4 → noteer **welke**, en controleer dat die verandering hoort bij het
  opgegeven antwoord F1-F6. Een drager die F2 claimt maar alleen W2 verandert, heeft het verkeerde
  antwoord opgegeven → **FAIL op het antwoord**, niet op het bestaan.
- Kan de toets niet gedraaid worden (geen harnas, geen server) → **NIET GEDRAAID met reden**, geen
  PASS.

**Zelfmeting op Master v1: NIET GEDRAAID.** Reden: de weglaattoets vraagt per drager een eigen
rendering met een geïnjecteerde stijlregel; dat is 13 tot 16 runs. Het bestaande bewijs bevat
precies één zo'n meting, en die bevestigt de methode: `contrast.mjs` zet de scrims uit en meet
opnieuw — `.vh-pr-titel` gaat van 18,09:1 (slechtst 8,22:1) naar 3,67:1 (slechtst 1,01:1)
(`contrast-1774.txt`, blok SCRIM AAN/UIT). Dat is W3 die verandert; de scrim is dus geen decoratie.

### 4.1.5 Ondergrenzen: wanneer heet iets geometrie

Beide drempels komen uit `kritiek-ontduiking.md` GAT-09 en zijn daar al op de master geijkt. V1.3
neemt ze over.

| # | ondergrens | ijking op Master v1 | SYSTEEM-X-nik | klasse |
|---|---|---|---|---|
| **GEO-06** | een masker telt alleen als het **≥5,0%** van de rechthoek van zijn drager wegneemt | laagste gemeten wegname **6%** (M3-infra); M1 PODIUM neemt **44%** weg | **0,0037%** → FAIL | **A** |
| **GEO-07** | een geometrie-element telt alleen als het **≥0,5%** van het sectievlak beslaat | kleinste gemeten drager `span.vh-proof-wig` 85×133 = 11.305px² op 1.573.538px² = **0,72%** | **0,0005%** → FAIL | **A** |
| **GEO-08** | een vertex met `calc()` wordt **niet stil overgeslagen**: de meting meldt `MEETFOUT` en de poort gaat op FAIL tot de drager meetbaar is gemaakt | gemeten gedrag van de regex `poorten.mjs:649`: 4 punten in plaats van 5 | n.v.t. | **A** |

GEO-08 is de enige van de drie die **tegen** eerlijk werk beschermde: een groot, zorgvuldig masker in
`calc()` werd als "geen masker" geteld. De stille nul wordt een luide fout.

**De teleenheid, klasse A.** Een **GEOMETRIEDRAGER** is een element, pseudo-element **of SVG-pad** met
ten minste één vrije schuine rand (≥5,0° van zowel de verticaal als de horizontaal) dat GEO-06 én GEO-07
haalt. **SVG-vormen tellen mee.** `vibe-design-quality-gate-v1.md §4` sluit ze expliciet uit van P-12
en P-13 (*"de inline `<svg>`-vormen zijn … niet meegeteld"*), terwijl de master er drie heeft met
gemeten hoeken 35,8° en 35,9°. Daardoor scoort de master op zijn eigen poorten te laag, en kan een
nieuwe pagina haar geometrie in SVG zetten en de poort ontwijken. Gevolg: de telling van Master v1
moet opnieuw (DR-G-23).

### 4.1.6 De poorten

#### DR-G-01 · Geometriedichtheid per modus — *vervangt P-13 deel 1*

| | |
|---|---|
| **Besluit** | geometrie is verplicht in CANVAS- en HYBRID-secties en verboden in DOCUMENT-secties |
| **Meetmethode** | tel per sectie de dragers die GEO-06 én GEO-07 halen. Noemer: het aantal CANVAS- + HYBRID-secties uit de paginamoduskaart |
| **Grens** | ≥ **⅔** van de CANVAS+HYBRID-secties draagt ≥1 drager **én** elke DOCUMENT-sectie draagt **0** |
| **Master v1** | 9 van 9 secties zijn CANVAS of HYBRID; dragers in 8 van 9 = **0,89** ✔; DOCUMENT-secties: 0 → tweede deel **N.V.T.-met-reden** (de pagina heeft geen DOCUMENT-sectie) — **PASS op deel 1** |
| **B2-kandidaat** | 4 dragers in 4 van 11 = **0,36** → **FAIL** (ongewijzigd t.o.v. P-13) |
| **N.V.T.** | een pagina zonder CANVAS- en HYBRID-secties: N.V.T.-met-reden, uitsluitend als de moduskaart dat zo opgeeft |
| **Klasse** | **A** voor de structuur; de grens ⅔ is **B** (geijkt op één pagina: 0,89 met 0,22 marge) |

#### DR-G-02 · Familiespreiding — *vervangt P-13 deel 2 en P-12*

| | |
|---|---|
| **Besluit** | niet het aantal unieke floats telt, maar het aantal **families in gebruik** en de spreiding |
| **Meetmethode** | (a) hoeveel van de vier families hebben ≥1 drager; (b) max − min over alle gemeten hoeken; (c) ligt elke waarde in het omhulsel 9–14° of 27–37° |
| **Grens** | (a) ≥ **2** families bij ≥4 dragers op de pagina; bij <4 dragers **N.V.T.-met-reden** · (b) spreiding ≥ **8,0°** bij ≥4 dragers · (c) **alle** waarden in het omhulsel, met maximaal 1 benoemde uitzondering |
| **Master v1** | (a) 4 van 4 families ✔ (b) 36,2 − 9,7 = **26,5°** ✔ (c) 13 van 14 in omhulsel, 1 benoemde uitzondering ✔ — **PASS** |
| **SYSTEEM-X** | (a) 1 familie ✘ (b) 31,0 − 29,5 = **1,5°** ✘ — **FAIL (2 van 3)** |
| **B2-kandidaat** | (a) 1 familie ✘ (b) **0,0°** ✘ (c) 34,0° in omhulsel ✔ — **FAIL (2 van 3)** |
| **Klasse** | **A** voor (c); **B** voor de getallen 2, 8,0° en 4 (één pagina) |

#### DR-G-03 · Functie per drager — *nieuw, vervangt niets*

| | |
|---|---|
| **Besluit** | elke drager noemt één antwoord F1-F6 met het bijbehorende getal; de weglaattoets 4.1.4 bevestigt het |
| **Meetmethode** | per drager: opgegeven antwoord + gemeten getal + weglaattoets W1-W4 |
| **Grens** | **100%** van de dragers heeft een bevestigd antwoord |
| **Master v1** | **NIET GEDRAAID** — reden in 4.1.4 (13-16 renderings). **Geen enkele geometriedrager heeft de weglaattoets ondergaan.** Wel bewezen is dat de méthode werkt (de scrim-aan/uit-meting in `contrast-1774.txt`, die een W3-verandering van 18,09:1 naar 3,67:1 laat zien), en één drager is door de master zelf als decoratie benoemd (25,0°, `home-solutions.css:303-305`) |
| **N.V.T.** | alleen voor een pagina met 0 dragers, en dan uitsluitend als DR-G-01 die 0 toestaat |
| **Klasse** | **A** |

#### DR-G-04 · Hoekrijm bij een dragend achtergrondveld

| | |
|---|---|
| **Besluit** | draagt een ACHTERGRONDVELD een beeld, dan is zijn hoek gelijk aan de maskerhoek van dat beeld |
| **Meetmethode** | per achtergrondveld met een beeld erop: `|hoek veld − hoek beeldmasker|` per vrije rand |
| **Grens** | ≤ **1,0°** |
| **Master v1** | 2 van 2: S1 **0,0°** (32,8/34,4 = 32,8/34,4), S8 **0,0°** (32,7/35,4 = 35,4/32,7) — **PASS** |
| **N.V.T.** | geen achtergrondveld met een beeld erop |
| **Klasse** | **A** (voorwaardelijke regel, n=2, beide exact) |

#### DR-G-05 · Beeldsnede en tekstkolom

| | |
|---|---|
| **Besluit** | loopt een tekstkolom langs of over een beeldsnede, dan komt die snede uit de **BEELDSNEDE**-familie (9,7–13,0°), niet uit RANDSNEDE of MERKWIG |
| **Meetmethode** | per beeld: ligt er een tekstdrager binnen de beeldrechthoek of ≤ 5px ernaast? Zo ja, meet de hoek van het masker |
| **Grens** | hoek ≤ **14,0°** |
| **Master v1** | 2 van 2: S6 13,0° met de verhaalkolom **62px over** het beeld; S7 9,7° met de kolomrand **2px vóór** de fotorand — **PASS** |
| **Tegenbewijs** | een beeldsnede in de flow met een wighoek snijdt dwars door de tekstkolom; dat komt op Master v1 **0 keer** voor |
| **Klasse** | **A** (de 14,0° is het omhulsel, niet de gemeten band) |

#### DR-G-06 · Maatondergrens

| | |
|---|---|
| **Besluit** | GEO-06 en GEO-07 uit 4.1.5 zijn poortvoorwaarden: een drager die ze niet haalt bestaat voor de poort niet |
| **Meetmethode** | weggesneden oppervlak ÷ drageroppervlak; drageroppervlak ÷ sectieoppervlak |
| **Grens** | ≥ **5,0%** respectievelijk ≥ **0,5%** |
| **Master v1** | laagste wegname **6%**; kleinste drager **0,72%** — **PASS**, met 1,0 procentpunt en 0,22 procentpunt marge |
| **SYSTEEM-X** | 0,0037% en 0,0005% — **FAIL** |
| **Klasse** | **A** |

#### DR-G-07 · Decoratiebudget

| | |
|---|---|
| **Besluit** | maximaal **één** drager per pagina mag geen antwoord F1-F6 geven; hij heet dan **BEELDVERVANGER** en staat met reden in de paginamoduskaart |
| **Meetmethode** | tel de dragers zonder bevestigd antwoord |
| **Grens** | ≤ **1** per pagina, **en** die drager haalt GEO-06 en GEO-07 |
| **Master v1** | 1 van 13 = `span.vh-sol-grafisch::before`, 25,0°, 289×285 = 82.365px² op een sectievlak van 1774×889 = 1.577.086px² = **5,22%** ✔ GEO-07; reden staat in de bron (`home-solutions.css:303-305`: vervanging van ontbrekende HVAC-fotografie) — **PASS** |
| **Koppeling met de beeldvoorraad** | `BEWIJS-assets.md §4`: 9 klasse-A-beelden voor 48 pagina's, dus gemiddeld **<1 sterk beeld per pagina**. Een BEELDVERVANGER is daarom een voorzien middel, niet een noodgreep — maar één per pagina, en nooit als vervanging van een HIGH-beeld (`BEWIJS-assets.md §3`: een klasse-C-beeld in M1/M2/M4 verliest zijn onderwerp) |
| **Klasse** | **A** voor het plafond 1; de 25,0° zelf is **C** |

### 4.1.7 Visuele reviewvragen — geen poort

| # | vraag | waarom geen poort |
|---|---|---|
| **RV-G-01** | Leest de diagonaal als één doorlopende lijn door de pagina, of als losse schuine randen per sectie? | "doorlopend" is niet te meten zonder een oordeel over waarneming; de deelmetingen (hoekrijm DR-G-04, richting F3) dekken het gedeeltelijk |
| **RV-G-02** | Herkent een reviewer die het merk niet kent de MERKWIG als hetzelfde gebaar in hero en slot-CTA? | herkenning is geen getal |
| **RV-G-03** | Oogt de BEELDVERVANGER als een bewuste vorm of als een gat waar een foto had moeten staan? | dit is precies het oordeel dat de meting niet kan geven; `forensics §02 D` noemt het element zelf "het enige decoratieve geometrie-element van de pagina" |
| **RV-G-04** | Snijdt een RANDSNEDE ooit een herkenbaar onderwerp uit het beeld (een dak halverwege, een voertuig in tweeën)? | onderwerpbehoud is per beeldsoort verschillend (`BEWIJS-assets.md §1`) en niet uit geometrie af te leiden |

### 4.1.8 Wat in 4.1 niet is gemeten

| onderwerp | reden |
|---|---|
| Het werkelijke aantal dragers op Master v1 | Drie tellingen in de V1.2-documenten spreken elkaar tegen (zie 4.4 C-1). Een hertelling volgens de definitie van 4.1.5 is **NIET GEDRAAID**. |
| Oppervlak van `.vh-ctrl::before` | Niet in het bewijs aanwezig; GEO-07 is voor deze drager **NIET GEMETEN**. |
| Hoekdrift onder 1200px | `G22` meet @390 48,1° en 52,3° tegenover de wigfamilie 32,6–36,2°: een drift van **15,6-18,2°** over 390-1199px, omdat de polygoon in procenten van een box staat waarvan de ratio meebeweegt. V1.3 stelt daar geen grens; dat hoort bij het responsieve hoofdstuk. |
| Weglaattoets per drager | 13-16 renderings, zie 4.1.4. |

---

## 4.2 · TYPOGRAFISCHE ART DIRECTION

### 4.2.1 Het instrument was fout; hier is de hermeting

**Gemeten defect.** `lagen.mjs:100` leest `kop.getClientRects()` op een `h1`/`h2`. Dat is een
**blokelement**: de aanroep geeft één rechthoek, de borderbox. `lagen-home-1774.txt` meldt daarom
voor alle negen secties `regels=1`, óók voor de hero-kop die aantoonbaar drie regels heeft (76,5px,
2 zichtbare `<br>`). De voorgestelde aanscherping in `kritiek-ontduiking.md` GAT-21
(*"het aantal regelvakken van de kop (`element.getClientRects().length`)"*) zou dus op **elke** kop
1 meten en nooit een zwak silhouet vinden.

**Het juiste instrument:** een `Range` over de inhoud van de kop, daarna `range.getClientRects()`,
en de rechthoeken groeperen op `top` binnen 4px. Dat geeft één rechthoek per **regelvak**.
Gedraaid deze sessie op `index.html` @1774, @1440 en @1200 (`silhouet.mjs` → `sil-*.txt`).

**Uitkomst @1774px — acht koppen, negentien regelvakken:**

| sectie | graad | %vw | lh÷graad | ls | regels | regelbreedtes (px) | kortste÷langste | langste÷blok | br zichtbaar |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|
| 01 Hero `h1` | 76,5 | 4,313% | 0,954 | −0,004em | 3 | 411,3 · 456,3 · 453,0 | **0,901** | 0,905 | 2 |
| 02 Oplossingen | 61,5 | 3,467% | 0,984 | −0,012em | 3 | 264,3 · 458,7 · 435,8 | **0,576** | 0,907 | 2 |
| 03 Project | 58,3 | 3,286% | 1,000 | −0,008em | 1 | 390,2 | 1,000 | 0,845 | 0 |
| 04 Aanpak | 64,0 | 3,608% | 1,133 | −0,012em | 2 | 400,5 · 264,0 | **0,659** | 0,845 | 1 |
| 05 VIBE.CONTROL | 54,0 | 3,044% | 0,996 | −0,012em | 2 | 439,8 · 569,7 | **0,772** | 0,785 | 1 |
| 06 Projectresultaat | 53,0 | 2,988% | 0,981 | −0,012em | 2 | 468,1 · 621,9 | **0,753** | 1,000 | 1 |
| 07 Infrastructuur | 61,0 | 3,439% | 0,951 | −0,015em | 3 | 511,3 · 422,7 · 281,8 | **0,551** | 0,901 | 2 |
| 08 Final CTA | 66,0 | 3,720% | 0,968 | −0,016em | 3 | 574,7 · 619,6 · 437,6 | **0,706** | 0,919 | 2 |

Totalen: **19 regelvakken op 8 koppen**, maximaal **3** per kop, nooit 4. `text-wrap: balance` staat
op alle acht (`home.css:109`), `overflow-wrap: break-word` ook (`home.css:110`). Klasse **C** voor de
getallen per sectie; de afgeleide verhoudingen hieronder zijn A of B.

### 4.2.2 Bedoelde regelval op de desktopmaatbreedtes — de sterkste gemeten eigenschap

Dezelfde meting op 1440 en 1200px:

| meting | @1774 | @1440 | @1200 | afwijking |
|---|---|---|---|---|
| aantal zichtbare `<br>` in koppen | 11 | 11 | 11 | **0** |
| aantal regelvakken per kop | 3·3·1·2·2·2·3·3 | 3·3·1·2·2·2·3·3 | 3·3·1·2·2·2·3·3 | **0 op 8 van 8** |
| kortste÷langste per kop | 0,901 · 0,576 · 1,000 · 0,659 · 0,772 · 0,753 · 0,551 · 0,706 | identiek | 0,902 · 0,576 · 1,000 · 0,659 · 0,772 · 0,753 · 0,551 · 0,706 | **≤0,001** |
| langste÷blok per kop | 0,905 · 0,907 · 0,845 · 0,845 · 0,785 · 1,000 · 0,901 · 0,919 | identiek | 0,904 · 0,907 · 0,845 · 0,845 · 0,784 · 1,000 · 0,901 · 0,919 | **≤0,001** |
| kleinste kopgraad | 53,0px | 43,0px | 35,9px | — |
| kleinste kopgraad als %vw | 2,988% | 2,986% | 2,992% | **≤0,006 pp** |

**De regelval is schaal-invariant over de hele desktopband.** Dat is geen toeval: de pagina rekent in
`cqw` en de breuken zijn met de hand gezet, dus elke regel schaalt mee. Dit is het typografische
tegenhanger van het paginabewijs (`pageH@1440 ÷ pageH@1774 = 0,8117`, afwijking 0,003%).

**Gevolg voor de regel:** "zet een `<br>`" is niet de regel. De regel is dat het **silhouet** van de
kop over 1200-1774px niet verandert. Dat is meetbaar, en een `<br>` achter het laatste woord of met
`display:none` haalt het niet.

### 4.2.3 De impacttrap — drie niveaus met twee lege banden

`P-08` eiste *"unieke graden ÷ koppen ≥ 0,85"*. Een trap van 1px (66 · 44 · 45 · 46 · 47 · 48 · 49 ·
50 · 51px) haalt 1,00 en is visueel één graad (`kritiek-ontduiking.md` GAT-19). V1.3 vervangt
uniciteit door een **trap met lege banden**.

**Clustering, tolerantie 0,23% vw (= 4,0px op 1774, 2,7px op 1200):**

| niveau | gemeten leden op Master v1 | band in %vw | aantal koppen |
|---|---|---|---:|
| **HIGH** — opent of sluit de pagina | 76,5px | **4,313%** | 1 van 8 |
| **MID** — werksectie met eigen onderwerp | 58,3 · 61,0 · 61,5 · 64,0 · 66,0px | **3,286-3,720%** | 5 van 8 |
| **QUIET** — sectie die een andere sectie ondersteunt | 53,0 · 54,0px | **2,988-3,044%** | 2 van 8 |

**De twee lege banden zijn de meting:** geen enkele kopgraad ligt in **3,045-3,285% vw**
(gat 0,24 procentpunt = 4,3px op 1774) of in **3,721-4,312% vw** (gat 0,59 procentpunt = 10,5px).
Een 1px-trap vult die banden en valt dus om; een pagina met tien koppen van 44px levert één cluster
en valt ook om.

| modus | hoe de graad wordt uitgedrukt | plafond/vloer |
|---|---|---|
| **CANVAS** | als fractie van de viewportbreedte, in `cqw` | sectiekop ≥ **2,9% vw** (gemeten minimum 2,988%, marge 0,088 pp) |
| **HYBRID** | podiumkop volgt CANVAS; kop in de redactionele kolom mag naar de DOCUMENT-band | grens expliciet in de moduskaart |
| **DOCUMENT** | `clamp()` met px-plafond (brandbook §1A.6.2) | **geen** %vw-vloer; in plaats daarvan een regellengtecap van **34-52ch** (de enige breedtebegrenzing die Master v1 kent, aanvaard bewijs) |

**Waarom de %vw-vloer alleen in CANVAS geldt, met het getal:** de B2-kandidaat heeft een kleinste
kopgraad van 32px = **1,804% vw** en een mediaan van 44px = **2,480% vw** — dáár zakt de
compositie weg. Maar in een FAQ-register of een juridische pagina is 32px de juiste graad. Zonder de
moduslaag is elke drempel óf te laag voor CANVAS óf onhaalbaar voor DOCUMENT; dat is de
hoofdoorzaak van de papieren test (`papiertest.md §8`).

**Klasse:** de structuur (3 niveaus, 2 lege banden, tolerantie 0,23% vw) is **A**. De bandgrenzen in
%vw zijn **C** — ze beschrijven Master v1. De vloer 2,9% vw voor CANVAS is **A**, geijkt met 0,088
procentpunt marge.

### 4.2.4 Maximaal aantal regels per impactniveau

Gemeten (4.2.1): HIGH 3 regels · MID 1 tot 3 · QUIET 2. Nooit 4.

| niveau | regels toegestaan | gemeten | klasse |
|---|---:|---|---|
| HIGH | **2 of 3** | 3 (1 van 1) | **A** voor het plafond 3; de ondergrens 2 is een **besluit**, niet gemeten (n=1) |
| MID | **1 tot 3** | 1 · 2 · 2 · 3 · 3 | **A** plafond 3 |
| QUIET | **1 of 2** | 2 · 2 | **B** (n=2) |
| DOCUMENT-kop | **1 of 2**, automatisch gebroken | **NIET GEMETEN** op Master v1 (0 DOCUMENT-secties) | — |

Een kop van **4 regels of meer** bestaat op Master v1 niet en is in CANVAS en HYBRID **niet
toegestaan**. Reden met een getal: bij `lh ÷ graad` 0,951-1,000 is een vierde regel bij 76,5px al
73px extra; `kritiek-overfitting.md §6.6` rekent voor dat sectie 08 een leegtebudget van 147px heeft
waarvan de kop bij `lh 1,5` al 102px opeet.

### 4.2.5 Silhouet van een kop — definitie, vloer en de toets voor een zwak silhouet

**Definitie (meetbaar).** Het silhouet van een kop is de rij regelbreedtes, gemeten met het
`Range`-instrument uit 4.2.1, uitgedrukt in twee verhoudingen:

- **S1 = kortste regel ÷ langste regel.** Hoe ongelijk de regels zijn.
- **S2 = langste regel ÷ blokbreedte van de kop.** Of de regelval en de kolom bij elkaar horen, of de
  kop in een kolom valt die door iets anders is bepaald.

**Let op bij S2: drie van de acht kopblokken zijn shrink-to-fit.** Gemeten deze sessie:
`.vh-pr-copy` (`home-project.css:101-107`) en `.vh-proof-head` (`home-proof.css:62-67`) zijn
`position: absolute` met uitsluitend `left` en `top` — geen `width` — en `.vh-proc-copy`
(`home-process.css:57-62`) heeft alleen `max-width: 34.5cqw`. Hun breedte volgt dus uit de inhoud.
Gevolg, gemeten: S6 heeft S2 = **1,000** omdat de langste kopregel de box zelf bepaalt, terwijl S3 en
S4 op **0,845** staan omdat daar een **zusterelement** (de lead respectievelijk het statement) breder
is dan de langste kopregel. S2 blijft daarmee een geldige toets — hij meet of de kop even breed komt
als de breedste buur in zijn eigen kolom — maar hij meet in die drie gevallen géén gedeclareerde
kolombreedte. De vijf overige kopblokken zijn wél gedeclareerd (S1, S2, S5 `left`+`right`, S7, S8).

**Gemeten op Master v1** (7 meerregelige koppen): S1 = 0,551 · 0,576 · 0,659 · 0,706 · 0,753 ·
0,772 · 0,901 → minimum **0,551**, mediaan **0,706**. S2 over alle 8 = 0,785 · 0,845 · 0,845 ·
0,901 · 0,905 · 0,907 · 0,919 · 1,000 → minimum **0,785**, mediaan **0,903**.

**De vloeren:**

| # | vloer | ijking | klasse |
|---|---|---|---|
| **S1 ≥ 0,50** | geen regel is korter dan de helft van de langste | gemeten minimum 0,551 → **0,051 marge**; een laatste regel van één woord (±100px op 600px = 0,167) valt om | **A** |
| **S2 ≥ 0,75** | de langste regel vult ten minste driekwart van zijn kolom | gemeten minimum 0,785 → **0,035 marge**; een kop in een 1240px-container die op 400px breekt (0,32) valt om | **A** |

**ZWAK-SILHOUETTOETS voor een HIGH-kop.** Een HIGH-kop mag niet per ongeluk in een zwak silhouet
terechtkomen. De toets is één procedure met vier metingen, alle vier op 1774 **en** 1200px:

| # | meting | eis | wat het tegenhoudt |
|---|---|---|---|
| **TYP-01** | aantal regelvakken (`Range`-instrument) | gelijk op 1774 en 1200, en 2 of 3 | een kop die op één breedte een extra regel krijgt |
| **TYP-02** | S1 | ≥ 0,50 op beide breedtes, verschil ≤ 0,02 | een wees: één kort woord op een eigen regel |
| **TYP-03** | S2 | ≥ 0,75 op beide breedtes | een kolom die breder is dan de tekst, waardoor de `<br>` willekeurig staat |
| **TYP-04** | aantal regelvakken **ná het eerste** dat niet door een `<br>` is begonnen | **0** bij een HIGH-kop | automatische afbreking in de belangrijkste kop van de pagina |
| **TYP-05** | aantal binnen-woord-afbrekingen door `overflow-wrap: break-word` | **0** | `home.css:110` zet `break-word` op alle `h1,h2,h3`; een lang samengesteld woord ("energie-infrastructuur") kan daardoor middenin breken |

**Uitkomst op Master v1:** TYP-01 PASS (8 van 8, 4.2.2) · TYP-02 PASS (minimum 0,551) · TYP-03 PASS (minimum
0,785) · TYP-04 PASS voor de hero (3 regelvakken, 2 `<br>`) · **TYP-05 NIET GEMETEN** — het
`Range`-instrument geeft regelbreedtes, niet de oorzaak van de breuk. De meting die dat oplost staat
in 4.2.10.

### 4.2.6 Plaatsing van het accentwoord — zeven koppen, twee harde regels

Gemeten deze sessie per accentspan (eerste inline-element met een andere `color` dan de kop):

| sectie | accentkleur | start op regel | eind op regel | afstand tot regelbegin | afstand tot regeleinde |
|---|---|---:|---:|---:|---:|
| 01 Hero | `#0073FE` | 2 | 3 | 208,5px | **0,0px** |
| 02 | `#0073FE` | 3 | 3 | 0,0px | **0,0px** |
| 03 | — | — | — | — | — |
| 04 | `#0073FE` | 2 | 2 | 0,0px | **0,0px** |
| 05 | `#0073FE` | 2 | 2 | 119,3px | **0,0px** |
| 06 | `#0073FE` | 2 | 2 | 0,0px | **0,0px** |
| 07 | `#0073FE` | 2 | 3 | 0,0px | **0,0px** |
| 08 | `#0073FE` | 2 | 2 | 144,5px | **0,0px** |

**Drie gemeten regels:**

1. **Het accent staat nooit op regel 1.** 7 van 7: zes beginnen op regel 2, één op regel 3.
   Klasse **A**.
2. **Het accent eindigt altijd vlak met een regeleinde.** 7 van 7, afwijking **0,0px**. Klasse **A**.
3. **Het accent mag midden in een regel beginnen.** 3 van 7 doen dat (208,5 · 119,3 · 144,5px).
   Dit is een **toestemming**, geen eis. Klasse **B**.

Afgeleid: in 6 van 7 koppen loopt het accent door tot het einde van de kóp; in 1 (S8) eindigt het op
het einde van regel 2 met regel 3 erachter. Eén kop (S3) heeft **geen** accent — de enige, en die
heeft ook geen `<br>` en is de enige met `lh ÷ graad = 1,000`. Een kop zonder accent is dus
toegestaan: **≤1 per pagina** (gemeten 1 van 8), klasse **B**.

**Niet toegestaan, met bewijs:** een accent dat midden in een regel **eindigt**. Dat komt op Master
v1 0 van 7 keer voor en is de meetbare vorm van "het accent is per ongeluk een gekleurd woord" in
plaats van een gezette regelval.

### 4.2.7 Verhouding tussen kop en het beeld ernaast

| sectie | kopblok (eigen meting) | beeldbreedte | kop : beeld | gemeten speling tussen de langste kopregel en de beeld-/diagonaalrand |
|---|---:|---:|---:|---|
| 01 Hero | 504,0 | 1774 | **1 : 3,52** | 457,7px tot de diagonaal (eigen meting: langste regel eindigt op x539,3, blokrand x587,0) |
| 03 Project | 461,7 | 1704 | **1 : 3,69** | kop in de donkerste 20% van de scrim |
| 04 Aanpak | 474,0 | 956 | **1 : 2,02** | de **lead** eindigt 2px vóór de backdrop-diagonaal |
| 06 Projectresultaat | 621,9 | 734 | **1 : 1,18** | de verhaal**kolom** ligt 62px over het beeld, in de hoek die de 13,0°-snede vrijlaat |
| 07 Infrastructuur | 567,7 | 1100 | **1 : 1,94** | de kolomrand eindigt 2px vóór de fotorand |
| 08 Final CTA | 674,1 | 935 | **1 : 1,39** | 130,8px tot de chevronpunt op x839 (eigen meting: langste regel eindigt op x708,2) |

De kopblokbreedtes komen uit mijn eigen meting; drie ervan wijken af van `lagen-home-1774.txt`
(470 → 461,7 · 460 → 474,0 · 634 → 621,9). Dat zijn exact de drie shrink-to-fit-blokken uit 4.2.5,
en de oorzaak is gemeten: `lagen.mjs:28` wacht alleen tot elk `img` `complete` is, niet op
`document.fonts.ready`. Bij een shrink-to-fit-box bepaalt de **geladen** letter de breedte. De vijf
gedeclareerde blokken komen in beide runs tot op 0,1px overeen (504 · 506 · 726 · 568 · 674).
**Instrumenteis, klasse A: elke typografische meting wacht op `document.fonts.ready` én op
`img.complete`.**

**Twee regels:**

1. **Een kop overlapt nooit een beeldrand.** Gemeten **0 van 8**. Alleen lopende tekst mag dat, en
   dan alleen bij een BEELDSNEDE uit de flauwe familie (S6, 13,0°, 62px overlap). Klasse **A** —
   dit is de koppeling tussen 4.1 en 4.2: de hoekkeuze volgt uit de vraag of er tekst langs loopt
   (DR-G-05).
2. **De verhouding kop : beeld is vrij binnen 1 : 1,18 … 1 : 3,69.** Spreiding factor **3,13**.
   Klasse **B** — er is geen gemeten reden om een vaste verhouding voor te schrijven, en een
   plafond zou de hero (1 : 3,52) of de slot-CTA (1 : 1,39) verbieden.

### 4.2.8 Wanneer automatisch afbreken wel mag

**Gemeten uitgangspunt:** `text-wrap: balance` staat al op **alle** `h1,h2,h3` in drie van drie
relevante stylesheets: `home.css:109`, `subpage.css:420`, `vibe-system.css:127`. De handgezette
`<br>` ligt daar bovenóp. Automatisch afbreken is dus niet het alternatief voor handwerk; het is de
ondergrond ervan.

| geval | automatisch afbreken | bewijs / eis |
|---|---|---|
| HIGH-kop in CANVAS of HYBRID | **nee** | Z4: elk regelvak ná het eerste begint met een `<br>`. Gemeten: geen enkele kop wrapt zelf op 1774px |
| MID-kop in CANVAS of HYBRID, 1 regel | **n.v.t.** | 1 van 8 (S3, "Hedin Alkmaar", 390,2px in een blok van 461,7) |
| MID/QUIET-kop in CANVAS of HYBRID, 2-3 regels | **nee** | zelfde meting; de `<br>` is een ontwerpbeslissing (`G21` implementatieaanwijzing) |
| Kop in DOCUMENT MODE | **ja, verplicht** | een `<br>` in een register- of FAQ-kop die op een onbekende leesbreedte staat, breekt de regelval; `balance` + `max-width` in `ch` doet het werk |
| Kop in de redactionele kolom van HYBRID | **ja** | die kolom is DOCUMENT |
| Elke kop ≤1199px | **ja, verplicht** | brandbook §1A.6.4 bevriest de collapse-mechaniek: `<br>` in koppen op `display:none` onder 1200px, **28 keer** toegepast. De poorten van 4.2 gelden daarom uitsluitend ≥1200px |
| Lopende tekst, alle modi | **ja** | `subpage.css:421` zet `text-wrap: pretty` op `p`; op de homepage is dat **niet** gedeclareerd (gemeten: 0 van 10 `home*.css`) → zie RV-G-07 |

### 4.2.9 De poorten

#### DR-G-08 · Impacttrap — *vervangt P-08*

| | |
|---|---|
| **Besluit** | niet uniciteit maar een trap met lege banden; `font-size` van elke `h1`/`h2` in CANVAS- en HYBRID-secties, uitgedrukt in %vw |
| **Meetmethode** | cluster de graden met tolerantie **0,23% vw**; tel de clusters; meet de laagste graad |
| **Grens** | (i) ≥ **3** clusters · (ii) geen cluster draagt > **⅔** van de koppen · (iii) laagste CANVAS-kop ≥ **2,9% vw** · (iv) de H1 wordt op `tagName` geïdentificeerd, nooit op positie |
| **Master v1** | (i) {53; 54} \| {58,3…66} \| {76,5} = **3** ✔ (ii) grootste cluster 5 van 8 = **0,625** ✔ (iii) **2,988%** ✔ — **PASS** |
| **SYSTEEM-X** | (i) {44…51} \| {66} = **2** ✘ — **FAIL** |
| **B2-kandidaat** | (iii) laagste 32px = **1,804% vw** ✘; grootste cluster 4 van 10 = 0,40 ✔ — **FAIL op (iii)** |
| **Reparatie van GAT-20** | `poorten.mjs:761` gooide met `graden.slice(1)` de eerste gemeten kop weg in de aanname dat dat de H1 is. Eis (iv) sluit dat af |
| **N.V.T.** | een pagina met 0 CANVAS- en HYBRID-secties, of met <3 koppen: **N.V.T.-met-reden**, gedekt door de moduskaart |
| **Klasse** | **A** voor (i)(ii)(iv); **B** voor de getallen 3 en ⅔; **A** voor 2,9% vw |

#### DR-G-09 · Zichtbare regelval — *vervangt P-15*

| | |
|---|---|
| **Besluit** | geteld wordt het **regelvak**, niet de `<br>` in de DOM |
| **Meetmethode** | `Range.getClientRects()` over de inhoud van de kop, gegroepeerd op `top` binnen 4px; op 1774 **en** 1200px |
| **Grens** | (i) ≥ **60%** van de koppen in CANVAS/HYBRID heeft ≥2 regelvakken, waarvan elk regelvak ná het eerste door een `<br>` is begonnen · (ii) het aantal regelvakken per kop is **gelijk** op 1774 en 1200 · (iii) S1 ≥ 0,50 |
| **Master v1** | (i) 7 van 8 = **87,5%** ✔ (ii) 8 van 8 gelijk ✔ (iii) minimum **0,551** ✔ — **PASS** |
| **SYSTEEM-X** | een `<br>` achter het laatste woord levert **0** extra regelvakken → (i) 0% — **FAIL** (onder P-15 haalde dezelfde pagina 100%) |
| **B2-kandidaat** | (i) 0 van 10 = 0% — **FAIL** (ongewijzigd) |
| **Master v1 ≤1199px** | **N.V.T.-met-reden**: brandbook §1A.6.4 zet alle `<br>` in koppen uit onder 1200px. Onder P-15 meldde dezelfde pagina daar nog 87,5%, want de elementen stonden in de DOM |
| **Klasse** | **A** voor (ii) en (iii); **B** voor de 60% |

#### DR-G-10 · Silhouet

| | |
|---|---|
| **Besluit** | S1 en S2 zijn poortwaarden voor elke kop in CANVAS en HYBRID |
| **Meetmethode** | 4.2.5, op 1774 en 1200px |
| **Grens** | S1 ≥ **0,50** (verschil tussen de breedtes ≤ 0,02) **én** S2 ≥ **0,75** |
| **Master v1** | S1 min 0,551 (verschil ≤0,001) ✔ · S2 min 0,785 ✔ — **PASS** |
| **N.V.T.** | eenregelige koppen: S1 is dan 1,000 per definitie; de poort toetst voor die koppen alleen S2 |
| **Klasse** | **A** |

#### DR-G-11 · Accentplaatsing

| | |
|---|---|
| **Besluit** | het accent staat niet op regel 1 en eindigt vlak met een regeleinde |
| **Meetmethode** | `Range` over het accent-inline-element; vergelijk `top` met de regelvakken en `right` met het regeleinde |
| **Grens** | startregel ≥ **2** (bij ≥2 regels) **én** afstand tot het regeleinde ≤ **1,0px** |
| **Master v1** | 7 van 7 op beide: startregel 2 (6×) of 3 (1×); afstand **0,0px** (7×) — **PASS** |
| **N.V.T.** | koppen zonder accent: ≤1 per pagina toegestaan (DR-G-12), die kop is N.V.T.-met-reden |
| **Klasse** | **A** |

#### DR-G-12 · Kop zonder accent

| | |
|---|---|
| **Besluit** | maximaal **1** kop per pagina zonder accentkleur |
| **Meetmethode** | tel koppen waarvan geen inline-kind een andere `color` heeft dan de kop |
| **Grens** | ≤ **1** |
| **Master v1** | 1 van 8 (S3) — **PASS** |
| **B2-kandidaat** | **NIET GEMETEN** (geen accenttelling in het aangeleverde bewijs) |
| **Klasse** | **B** (n=1) |

#### DR-G-13 · Kop en beeldrand

| | |
|---|---|
| **Besluit** | geen regelvak van een kop overlapt een beeldrechthoek of een geometrische diagonaal |
| **Meetmethode** | per regelvak: overlap met elke beeldrechthoek en met elk polygoonvlak (punt-in-polygoontoets) |
| **Grens** | overlap = **0px²** voor koppen; lopende tekst mag overlappen, en dan uitsluitend bij een snede ≤14,0° |
| **Master v1** | koppen **0 van 8** ✔; lopende tekst 1 van 9 secties (S6, 62px, snede 13,0°) ✔ — **PASS** |
| **Let op** | `forensics-homepage.md §01` en `§08` noemen bij "de langste kopregel eindigt op x…" de **blokrand**, niet het regeleinde. Eigen hermeting: S1 539,3 in plaats van 587 (47,7px verschil), S8 708,2 in plaats van 763 (54,5px verschil). De speling in die twee paragrafen is dus **te klein** opgegeven, niet te groot; de poort wordt er niet soepeler van |
| **Klasse** | **A** |

### 4.2.10 Visuele reviewvragen en wat niet is gemeten

| # | vraag of gat | status |
|---|---|---|
| **RV-G-05** | Leest de kop als één bedoelde vorm of als tekst die toevallig zo afbreekt? | reviewvraag; de getallen S1/S2/TYP-01-TYP-04 dekken het gedeeltelijk |
| **RV-G-06** | Staat het accentwoord op het inhoudelijk zwaarste woord, of op het woord dat toevallig op regel 2 begon? | niet te meten; alleen een mens kan dit zien |
| **RV-G-07** | De homepage declareert `text-wrap: pretty` **niet** (0 van 10 `home*.css`), `subpage.css:421` wel. Wordt `pretty` de sitebrede default voor lopende tekst? | open; het effect op Master v1 is **NIET GEMETEN** |
| **RV-G-08** | Bij `lh ÷ graad` = 0,951 en 76,5px is de regelafstand 72,8px op een letter van 76,5px. Raken een daler op regel 1 en een kapitaal met diakriet (Ë, Ô) op regel 2 elkaar? | **NIET GEMETEN**: daarvoor zijn de ascent/descent-metrieken van Urbanist nodig. `kritiek-overfitting.md §6.7` noemt het risico; de meting is `ascent + descent` uit de font-tabel tegen 72,8px |
| **TYP-05** | Hoeveel regelvakken ontstaan door `overflow-wrap: break-word` in plaats van door een `<br>` of door `balance`? | **NIET GEMETEN**. Meting: vergelijk het aantal regelvakken met en zonder `overflow-wrap: normal` via een geïnjecteerde stijlregel |
| **DOCUMENT-typografie** | Kopgraad, regelafstand en regellengte voor DOCUMENT MODE | **NIET GEMETEN** op Master v1: de pagina heeft **0** DOCUMENT-secties. De enige gemeten begrenzing is de regellengtecap 34-52ch (aanvaard bewijs) en `max-width: 38ch` op drie leads onder 1200px (`home-project.css:267`, `home-proof.css:423`) |
| **Tabletband 768-1199px** | `G21` meet daar drie graden (58 · 42 · 52px) in plaats van acht | buiten de poorten van 4.2; brandbook §1A.6.1 maakt 1199px de systeemgrens |

---

## 4.3 · TOEGANKELIJKHEID — BESLUIT, GEEN BEVRIEZING

### 4.3.1 Het besluit

**DR-G-14 · Normale tekst haalt AA.** `DR-V-20` uit `vibe-image-system-v1.md §16` stelde voor om de
gemeten sub-AA-waarden tot norm te verheffen: *"gekleurd type op beeldpixels haalt 5,55-7,19:1
mediaan en 3,95-4,27:1 in het ongunstigste monster → norm mediaan ≥ 5,5:1, ongunstigst ≥ 3,9:1."*
**Dat voorstel wordt verworpen.** Een norm die onder 4,5:1 ligt, legt een gemeten fout vast als
contract.

| rol | eis | definitie |
|---|---|---|
| normale tekst | **≥ 4,5:1** | `font-size` < 24,0px bij gewicht < 700, **of** < 18,66px bij gewicht ≥ 700 |
| grote tekst | **≥ 3,0:1** | ≥ 24,0px, **of** ≥ 18,66px bij gewicht ≥ 700 |
| focusindicator en vlakscheiding | **≥ 3,0:1** | tegen de kleur waar hij werkelijk op landt |
| AAA (7:1) | **niet** vastgelegd | geen gemeten reden om het te eisen. Gemeten: wit type op beeld haalt 15,4-18,4:1 ruim; van het gekleurde type haalt alleen `#93A5BC` het bij zijn mediaan (7,19:1) en geen enkel gekleurd type bij het ongunstigste monster |

**Gewicht 600 telt niet als vet.** Besluit, want WCAG laat "bold" open en de master gebruikt 600 op
negen knoplabels. Een label van 18,0px/600 is dus **normale** tekst en heeft 4,5:1 nodig.
Klasse **A**.

### 4.3.2 De meetmethode — glyphgemaskeerd, niet de CSS-kleur

**DR-G-15 · Meetmethode.** Drie niveaus, en alleen niveau 3 is een poort.

| niveau | wat het doet | wat het waard is |
|---|---|---|
| **N1 · kleurpaarberekening** | WCAG-luminantie van twee hexwaarden | bewijst een **plafond**: haalt een paar het op puur wit niet, dan nergens. Deterministisch, reproduceerbaar zonder browser |
| **N2 · CSS-voorscreening** | computed `color` tegen de eerste dekkende achtergrondkleur in de **voorouder**keten | **geen poort.** Mist zuster-vlakken en verlopen. Gemeten bewijs hieronder |
| **N3 · glyphgemaskeerde pixelmeting** | **poort** | zie procedure |

**Procedure N3.**

1. Laad de pagina op de meetbreedte; wacht tot elk zichtbaar `img` `complete` is en
   `document.fonts.ready` is vervuld.
2. Zet het te meten tekstelement op `color: transparent` — **niet** `visibility: hidden`. Zo blijft
   de tekstschaduw staan en blijft de layout intact.
3. Neem een schermafdruk van de rechthoek van het element.
4. **Maak het glyphmasker:** render dezelfde tekst in dezelfde font, graad, gewicht, tracking en
   regelval als wit-op-zwart in een offscreen canvas, op exact dezelfde positie binnen de
   rechthoek, en gebruik de alfa van die rendering als masker. Alleen pixels met glyphalfa ≥ 0,5
   tellen mee.
5. Reken per gemaskeerde pixel de WCAG-luminantie uit en rapporteer min / p05 / mediaan / p95 / max.
6. Reken het contrast met de gecomponeerde tekstkleur (bij `color` met alfa < 1: eerst over de
   gemeten ondergrond componeren).

**Grenswaarden bij een fotografische of verlopende ondergrond:** het contrast haalt zijn eis
(4,5:1 of 3,0:1) bij de **p95** van de gemaskeerde ondergrondluminantie, **en** blijft bij de **max**
boven **3,0:1** voor normale tekst. Bij een vlakke ondergrond zijn p05, mediaan, p95 en max gelijk en
is dat één getal — dan is de regel identiek aan WCAG. Klasse **A** voor de procedure; de p95-marge is
**B** en staat als DR-G-20 open.

**Waarom niveau 2 geen poort mag zijn — eigen bewijs deze sessie.** `aa-screen.mjs` draaide op
`index.html` @1774 en vond 242 tekstdragers. Van de 55 die het als FAIL meldde, zijn **12 aantoonbaar
goed**: de witte koppen en lopende tekst in de zes `.vh-sol-mod`-kaarten van sectie 02. Die liggen op
een foto, maar die foto is een **broer**-`<img>` en geen `background-image`, dus de voorscreening
leest de witte sectiegrond `#FCFDFE` en rapporteert 1,02:1. De werkelijke, pixelgemeten waarden zijn
**15,42-18,42:1** (`contrast-1774.txt`, blok M5). Eén instrument, 12 valse alarmen, in één sectie.
Omgekeerd meldt de voorscreening voor `p.vh-final-eyebrow` 4,18:1 tegen de sectiegrond `#FAFCFD`,
terwijl het element op `span.vh-final-wig` ligt (z1, 1774×631, onder `.vh-final-copy` op z5), een
verloop met `#BEDCF9` als donkerste stop; op die stop is hetzelfde `#0073FE` nog maar **3,03:1**.
Welke stop onder de glyphs valt is **NIET GEMETEN**. De voorscreening is dus óók te optimistisch.

**Waarom de V1.2-metingen niet glyphgemaskeerd zijn, en wat dat betekent.** `contrast.mjs` leest
*alle* pixels in de rechthoek van het element (`vibe-image-system-v1.md §13.2`). Het document geeft
dat zelf toe in §14: *"Of een glyph van `.vh-proof-story p` ooit in de 0,1% fotopixels van zijn
meetvlak valt — gemeten is het meetvlak, niet de glyphposities."* Gevolg: de kolom "ongunstigst" is
een **rechthoek**waarde. Hij overdrijft het risico waar de donkere of lichte pixel tussen de letters
valt, en hij onderschat niets. Daarom is het onderscheid hieronder noodzakelijk: de twee
**scrimfouten** (L-08, L-09) zijn **bewezen risico** — hun uitkomst hangt af van waar de glyphs
vallen, en de glyphgemaskeerde hermeting is **NIET GEDRAAID**. De **tekstkleurfout** (L-10) is een
**bewezen fout**, want het plafond van het kleurpaar ligt onder de eis en dat is
ondergrondonafhankelijk.

### 4.3.3 Gemeten staat van Master v1

**A. Onvoorwaardelijke kleurpaarfouten.** Berekend met N1; het plafond is het contrast tegen de
lichtst mogelijke ondergrond (puur wit) of, bij een vast paar, de waarde zelf. Instanties geteld met
N2 op `index.html` @1774, in de negen secties van Master v1.

| kleurpaar | plafond | eis | instanties | waar (voorbeelden) |
|---|---:|---:|---:|---|
| `#0073FE` als normale tekst op licht | **4,30:1** | 4,5 | **12** | `p.vh-sol-eyebrow` 18,2/700 · `p.vh-proc-eyebrow` 16,9/700 · `p.vh-ctrl-eyebrow` 16,8/700 · `p.vh-final-eyebrow` 16,4/700 · `p.vh-proof-eyebrow` 15,4/700 · `span.vh-proc-badge` 14,2/700 (4×) · `span.vh-proof-badge` 13/700 · `a.vh-final-cta2` 17/600 · `a.vh-final-kaart-link` 16,3/600 |
| `--vibe-sub: #6F7A95` als normale tekst | **4,29:1** | 4,5 | **13** | 4× in S5, 4× in S4, 3× in S2, 1× `sub` in S2, 1× in S4 |
| `#7C88A2` (niet-getokeniseerd grijs) 14px | **3,56:1** | 4,5 | **4** | `dd` in `.vh-proof-cijfers`, S6 |
| wit op `#0073FE` (knoplabel) | **4,30:1** | 4,5 | **9** | `a.vh-btn-primair` 18/600 · `a.vh-sol-cta` · `a.vh-pr-knop` · `a.vh-infra-cta` · `a.vh-ctrl-cta` 17/600 · `a.vh-proof-cta` · `a.vh-final-cta` · `a.vh-skip` 15/600 |
| `#1B2740` op `#0073FE` 16px/600 | **3,46:1** | 4,5 | **1** | `a.vh-footer-nb-cta`, S9 |
| `#5F758F` op `#011731` 7,8px/400 | **3,79:1** | 4,5 | **1** | microlabel in het dashboard, S5 |
| **totaal onvoorwaardelijk** | | | **40** | |

Daarnaast **1 voorwaardelijke** fout: `a.vh-proof-alle` 18,5px/500 in `#5F769E` meet **4,47:1** op
`#FAFCFE` (plafond 4,59:1 op puur wit) — 0,03 tekort. Samen **41 tekstdragers in de negen secties**.

Buiten Master v1, wel op dezelfde pagina: de legacy consentlaag `div.vck-eb` en een link in
`#0096CC` op wit meten **3,37:1** (10px en 13,5px/400). Die laag valt niet onder de negen secties en
niet onder dit hoofdstuk; hij is hier alleen geteld om de scope eerlijk te maken.

**B. Wat een pixelmeting vereist.** 75 van de 242 tekstdragers hebben een `background-image` (foto
of verloop) in hun voorouderketen; 12 extra liggen op een broer-`<img>`. Dus **≥87 van 242 = 36%**
is niet uit CSS-waarden te beslissen. Met het V1.2-rechthoekinstrument zijn er **28** gemeten
(`contrast-1774.txt`, 28 tekstregels). Daarmee is **≥59** nog **NIET GEMETEN**.

**C. De drie gemeten sub-AA-gevallen op beeld.** Uit `contrast-1774.txt` en `contrast2-1774.txt`,
rechthoekgemaskeerd:

| element | kleur · graad · gewicht | eis | mediaan | ongunstigst | ondergrond-L die de eis haalt | diagnose |
|---|---|---:|---:|---:|---:|---|
| `.vh-pr-eyebrow` | `#0490FF` 16,6px/700 | 4,5 | 5,55:1 | **3,95:1** bij L=0,031 | L ≤ **0,0215** | **SCRIMFOUT.** Bij de gemeten mediane ondergrond (L = 0,008) haalt dezelfde kleur **5,55:1**; op de drie vlakke navyprimitieven 5,02 (`#08203C`) tot 5,55 (`#001632`). De p95 van de ondergrond is 0,023 en het maximum 0,031; de scrim is **0,0095 L** te zwak op het lichtste monster |
| `.vh-pr-body` | `#93A5BC` 20px/400 | 4,5 | 7,19:1 | **4,27:1** bij L=0,048 | L ≤ **0,0428** | **SCRIMFOUT.** Op vlak navy 6,51-7,19:1. Tekort 0,005 L |
| `.vh-proof-eyb2` | `#0073FE` 18px/700 | 4,5 | **4,01:1** | 3,97:1 | **bestaat niet** | **TEKSTKLEURFOUT.** `#0073FE` haalt op puur wit 4,30:1; de vereiste ondergrondluminantie is 1,0488 en wit is 1,0000. Met geen enkele lichte ondergrond haalbaar |

**Dit onderscheid is het belangrijkste resultaat van 4.3:** twee van de drie zijn op te lossen met
een diepere scrim (een beeldbesluit), één alleen met een andere tekstkleur (een tokenbesluit). V1.2
behandelde alle drie als één norm.

**D. Buiten de eis, met reden.** `.vh-footer-note` 18px/500 wit meet mediaan **2,00:1** en
ongunstigst **1,43:1**; met de tekstschaduw meegerekend 2,19:1 respectievelijk 1,03:1. Het element is
`aria-hidden` en draagt geen informatie (`DR-V-22`). Besluit: zie DR-G-19.

**E. De focusindicator blijft.** `--vibe-focus` = `#0073FE`, `outline: 2px solid`,
`outline-offset: 3px` (`home.css:68, 124-127`). Tegen de eigen knopkleur `#0073FE` is dat **1,00:1**;
tegen de gemeten lichte sectiegronden **3,72:1** (`#E4F0FC`) tot **4,30:1** (wit) — allemaal ≥3,0.
**De 3px offset is dragend:** zonder offset landt de ring op de knop en is hij onzichtbaar. Besluit:
de offset mag niet naar 0. Klasse **A**.

### 4.3.4 De blauwbeslissing

**Nagerekend, zoals gevraagd.** `#005FE0` tegen wit = **5,655:1** → 5,66:1. **Bevestigd.**
Eén correctie: *"en wit erop eveneens 5,66:1"* is geen tweede meting. De WCAG-formule is symmetrisch
in de twee luminanties, dus donker-op-licht en licht-op-donker van hetzelfde paar geven altijd
exact hetzelfde getal. Het is **één** waarde, niet twee.

**DR-G-16 · Semantische tekstkleur voor blauw.**

| | |
|---|---|
| **Besluit** | `#0073FE` (primitief `--vibe-blue-500`, nu `--vibe-blauw`, `home.css:35`) mag als tekst **alleen** waar de grote-tekstdrempel is gehaald. Voor normale tekst op een lichte grond komt er een semantische kleur die naar het bestaande primitief `#005FE0` wijst (`--vibe-blauw-diep`, `home.css:36`; in de tokenbegroting `--vibe-blue-600`, `vibe-design-tokens-v1.md:1161`) |
| **Gemeten onderbouwing** | `#0073FE` op wit **4,30:1**; vereiste ondergrondluminantie voor 4,5:1 is **1,0488** terwijl wit 1,0000 is → onhaalbaar. `#005FE0` op wit **5,66:1**, op `#FCFDFE` 5,55, op `#F6FAFE` 5,39, op `#EFF7FE` 5,23, op `#EAF4FE` 5,08, op `#E4F0FC` 4,89, op `#D8ECFE` 4,67 — **alle zes gemeten lichte gronden ✔**. De ondergrens: `#005FE0` haalt 4,5:1 tot een ondergrondluminantie van **0,7855** (≈ `#E5E5E5`) |
| **Waar `#0073FE` als tekst blijft** | grote tekst: kopaccenten 53-76,5px (4,01-4,30:1 ≥ 3,0 ✔) · `.vh-proof-cijfers dt` 21px/700 (4,30:1 ✔) · `.vh-proof-accent` 47px (✔) |
| **Dark-ground-tegenhanger** | op een vlak navyveld faalt `#005FE0` juist: **2,90:1** op `#08203C`, **3,20:1** op `#001632`, **3,07:1** op `#021A3A` → **niet** als normale tekst op donker. Wat daar werkt, gemeten: `#0490FF` 5,02-5,55:1 en `#3E9BFF` 5,72-6,32:1. En omgekeerd faalt `#3E9BFF` op wit met **2,86:1** — onder zelfs de grote-tekstdrempel |
| **Klasse** | **A** (kleurpaarberekening, ondergrondonafhankelijk plafond) |

**DR-G-17 · Het knoplabel.** Wit op `#0073FE` is **4,30:1** bij labels van 15,0-18,0px en gewicht
500-600 — negen gemeten instanties, allemaal normale tekst. Twee wegen, beide nagerekend:

| optie | gemeten gevolg | botsing |
|---|---|---|
| **(a) knopvlak naar `#005FE0`** | wit erop **5,66:1** ✔ | `#005FE0` is nu de **hover**kleur, gemeten op 8 plaatsen (`home-hero.css:229` + 7 hardcodes). Rust en hover zouden identiek worden. Er bestaat in `home.css:35-38` **geen** primitief dat donkerder is dan `#005FE0`: de vier blauwen zijn `#0073FE` (L = 0,1942) · `#005FE0` (**0,1357**) · `#3E9BFF` (0,3169) · `#E4F0FC` (0,8584) → **0 donkerder**. **Er is dus een nieuw primitief nodig; de waarde daarvan is NIET BEPAALD** en hoort in het tokenhoofdstuk |
| **(b) label naar ≥18,66px/700** | dan is het grote tekst en volstaat 3,0:1, dus 4,30 ✔ | brandbook §1A.9.3 bevriest de knopanatomie onder 768px op `font-size: 16px`; de gemeten labels zijn 15,0-18,0px bij gewicht 500-600. Optie (b) wijzigt een bevroren primitieve |
| **Besluit** | **(a) voor nieuwe pagina's**, met de hovertrede als open besluit DR-G-21. Master v1 ongewijzigd (4.3.5) | |

**Eén geval heeft binnen de bestaande primitieven geen oplossing:** `#1B2740` op `#0073FE` meet
3,46:1, en op `#005FE0` wordt het **slechter**: 2,63:1 (de knop wordt donkerder, het label is al
donker). Wit op `#005FE0` zou 5,66:1 geven. Besluit: dit knoplabel wordt wit, of de knop krijgt een
lichte grond — de keuze is een kleurbesluit, niet een toegankelijkheidsbesluit, en staat als
DR-G-22 open.

### 4.3.5 HOMEPAGE LEGACY EXCEPTION / FUTURE REMEDIATION

**DR-G-18 · Master v1 wordt nu niet gewijzigd.** Grond: brandbook §1A.11.3 (*"B1 is al Master v1 en
wordt NIET opnieuw gebouwd"*) en §1A.6.3 (*"Master v1 wordt hiervoor NU NIET gerefactord"*). Dit
hoofdstuk schrijft geen productiewijziging voor en heeft er geen gedaan.

**Het register.** Elke regel heeft een gemeten waarde, een eis en een aanpak. Status van alle regels:
`LEGACY EXCEPTION — FUTURE REMEDIATION`.

| # | object | gemeten | eis | tekort | aanpak bij toekomstige remediatie | instrument |
|---|---|---:|---:|---:|---|---|
| **L-01** | `#0073FE` als normale tekst, 12 instanties | plafond 4,30:1 | 4,5 | 0,20 | semantische kleur → `#005FE0` (DR-G-16) | N1, deterministisch |
| **L-02** | `--vibe-sub` `#6F7A95`, 13 instanties | plafond 4,29:1 | 4,5 | 0,21 | `--vibe-body-zacht` `#56627D` meet 5,28-6,11:1 op de gemeten gronden ✔; `--vibe-body` `#4C5771` 6,25-7,22:1 ✔ | N1 |
| **L-03** | `#7C88A2` 14px, 4 instanties | plafond 3,56:1 | 4,5 | 0,94 | niet-getokeniseerd grijs; vervangen door een primitief dat de eis haalt | N1 |
| **L-04** | wit op `#0073FE`, 9 knoplabels | 4,30:1 | 4,5 | 0,20 | DR-G-17 optie (a), met nieuwe hovertrede | N1 |
| **L-05** | `#1B2740` op `#0073FE`, 1 label | 3,46:1 | 4,5 | 1,04 | geen oplossing binnen de huidige primitieven; zie DR-G-22 | N1 |
| **L-06** | `#5F758F` 7,8px op `#011731`, 1 microlabel | 3,79:1 | 4,5 | 0,71 | onderdeel van een gebouwd apparaatvlak; graad 7,8px is zelf het probleem | N1 |
| **L-07** | `a.vh-proof-alle` `#5F769E` 18,5px/500 | 4,47:1 | 4,5 | 0,03 | plafond 4,59:1 op wit, dus oplosbaar met een lichtere grond óf een stap donkerder tekst | N1 |
| **L-08** | `.vh-pr-eyebrow` `#0490FF` 16,6/700 op beeld | 3,95:1 bij L=0,031 | 4,5 | 0,55 | **scrim** verdiepen tot ondergrond-L ≤ 0,0215 bij p95; de kleur zelf haalt 5,55:1 bij de gemeten mediane ondergrond | N3 vereist |
| **L-09** | `.vh-pr-body` `#93A5BC` 20/400 op beeld | 4,27:1 bij L=0,048 | 4,5 | 0,23 | **scrim** verdiepen tot L ≤ 0,0428 bij p95 | N3 vereist |
| **L-10** | `.vh-proof-eyb2` `#0073FE` 18/700 | 4,01:1 | 4,5 | 0,49 | **tekstkleur**; met geen enkele lichte grond oplosbaar | N1 + N3 |
| **L-11** | `.vh-footer-note` 18/500 wit op beeld | 2,00:1 (1,43 ongunstigst) | — | — | `aria-hidden`, geen informatie; zie DR-G-19 | N3 |
| **L-12** | legacy consentlaag `#0096CC` 10 en 13,5px | 3,37:1 | 4,5 | 1,13 | buiten Master v1's negen secties; hoort bij de migratie van `tokens.css` | N1 |

**DR-G-19 · Decoratief type op beeld.** `DR-V-22` liet open of `.vh-footer-note` (2,00:1,
`aria-hidden`) als uitzondering mag blijven. Besluit: **ja, onder drie meetbare voorwaarden**:
(i) het element is `aria-hidden="true"`; (ii) het draagt geen informatie die elders op de pagina
ontbreekt — toetsbaar door de tekst te zoeken in de rest van de sectie; (iii) het is geen link, geen
knop en geen label van een interactief element. Master v1: 1 van 1 gemeten element voldoet aan (i) en
(iii); (ii) is **NIET GEMETEN**. Klasse **A** voor de voorwaarden, **B** voor het plafond van één
zo'n element per pagina (n=1).

### 4.3.6 Wat nieuwe pagina's niet mogen herhalen

| # | verbod | meetbare vorm | poortuitkomst bij overtreding |
|---|---|---|---|
| 1 | `#0073FE` als normale tekst | `font-size` < 24px bij gewicht < 700, of < 18,66px bij gewicht ≥ 700, met `color` = `#0073FE` of een alias ervan | **FAIL** |
| 2 | `--vibe-sub` of `#7C88A2` als normale tekst | zelfde meting | **FAIL** |
| 3 | wit op `#0073FE` als knop- of linklabel onder de grote-tekstdrempel | zelfde meting | **FAIL** |
| 4 | type op een beeld zonder N3-meting | het element heeft een `background-image` of een broer-`<img>` onder zich en er is geen glyphgemaskeerde meting | **FAIL** — niet N.V.T., en zeker niet PASS |
| 5 | `outline-offset: 0` op de focusring bij een knop in merkblauw | gemeten offset | **FAIL** (contrast ring↔knop 1,00:1) |
| 6 | een nieuwe kleur als tekst zonder N1-plafondcontrole | ontbrekende berekening | **FAIL** |

### 4.3.7 De poort

#### DR-G-20 · Tekstcontrast

| | |
|---|---|
| **Meetmethode** | N3 (4.3.2) op elke tekstdrager ≥ 2×2px op 1774px. Bij een vlakke ondergrond mag N1 de uitkomst leveren, met de gemeten ondergrondkleur als bewijs |
| **Grens** | normale tekst ≥ **4,5:1** bij p95 en ≥ **3,0:1** bij max; grote tekst ≥ **3,0:1** bij p95 |
| **Master v1** | **FAIL.** 41 tekstdragers in de negen secties halen hun eis niet bij N2, waarvan 40 onvoorwaardelijk (N1-plafond); van de 28 dragers die met het V1.2-rechthoekinstrument op beeld zijn gemeten zitten er **3** onder de eis (L-08, L-09, L-10) en 1 ver eronder maar vrijgesteld (L-11). Uitkomst vastgelegd als LEGACY EXCEPTION (DR-G-18), niet als norm |
| **Nieuwe pagina** | **één FAIL = niet af** |
| **N.V.T.** | alleen voor een pagina zonder tekst. Een niet-gemeten tekstdrager is **FAIL**, geen N.V.T. |
| **Open** | de p95-marge voor fotografische ondergronden is **B**: op Master v1 scheelt hij bij `.vh-pr-eyebrow` het verschil tussen 3,95:1 (max) en een p95 die **NIET GEMETEN** is, want `contrast-1774.txt` rapporteert het contrast bij de mediaan en bij het ongunstigste monster, niet bij p95 |
| **Klasse** | **A** voor de eisen en de procedure; **B** voor de p95-marge |

### 4.3.8 Visuele reviewvragen en wat niet is gemeten

| # | vraag of gat | status |
|---|---|---|
| **RV-G-09** | Is de tweetraps tekstschaduw (`contrast2-1774.txt`: mediaan 0,475 → 0,430, aandeel donkere pixels 0,5% → 9,9%) een leesbaarheidsmiddel of een pleister op een te zwakke scrim? | reviewvraag; de bijdrage is gemeten, het oordeel niet |
| **RV-G-10** | Leest een gebruiker het verschil tussen rust `#005FE0` en een nieuwe donkere hovertrede nog als "dit reageert"? | reviewvraag; DR-G-21 |
| **Contrast op 1440 · 1199 · 768 · 390** | alle contrastmetingen, ook de mijne, zijn op **1774px** gedaan. De mobiele scrims hebben andere stops (`vibe-image-system-v1.md §12 M-5`) | **NIET GEMETEN** |
| **Glyphgemaskeerde hermeting van de 28 V1.2-metingen** | het bestaande instrument leest rechthoeken | **NIET GEDRAAID** |
| **De ≥59 niet-gemeten tekstdragers op beeld of verloop** | 87 vragen een pixelmeting, 28 zijn gemeten | **NIET GEMETEN** |
| **Contrast op de B2-kandidaat** | `vibe-image-system-v1.md §14`: *"Geen enkele contrastmeting gedaan"* | **NIET GEMETEN** |
| **Vlakscheiding (kaart↔ondergrond)** | gemeten met hetzelfde instrument: `.vh-proof-kaart` scheidt zich met **1,12:1** van de lichte lucht erachter, `.vh-proc-kaart` met 2,24:1 zonder scrim. Of een informatievlak een eigen 3,0:1-eis krijgt, hoort bij het beeldhoofdstuk | buiten 4.3 |
| **Fontmetrieken van Urbanist** | nodig voor RV-G-08 | **NIET GEMETEN** |

---

## 4.4 · CONFLICTEN MET V1.0 / V1.1 / V1.2

| # | conflict | bestand en paragraaf | hoe 4.x het oplost |
|---|---|---|---|
| **C-1** | **Drie onverenigbare tellingen van de geometrie.** `forensics-homepage.md §0.4` kopt "12 geometrie-elementen over 7 van de 9 secties", maar de eigen tabel eronder somt **14** dragers op over **8** secties (S1 ×4 · S2 · S3 · S4 · S6 ×2 · S7 · S8 ×3 · S9). `vibe-design-quality-gate-v1.md §3.2 P-13` telt **13** dragers in **8 van 9**; `P-12` telt **14** unieke hoekwaarden. En `§4` van hetzelfde document zegt dat de drie SVG-vormen (35,8° · 35,9°) in P-12/P-13 **niet** zijn meegeteld — terwijl `forensics §0.4` ze in zijn familietabel wél noemt. Deze drie tellingen kunnen niet allemaal juist zijn. | `forensics-homepage.md §0.4` tegen `vibe-design-quality-gate-v1.md §3.2 P-12 · P-13 · §4` | 4.1.5 definieert de teleenheid (GEO-06 + GEO-07 + SVG meegeteld). De hertelling op Master v1 is **NIET GEDRAAID** en staat als DR-G-23 open |
| **C-2** | **De hoek van `.vh-ctrl::before` is tegelijk gemeten en niet gemeten.** `forensics-homepage.md §05 D` zegt **"Gradenwaarde NIET GEMETEN"** met de reden dat geen van de vier zijden zuiver schuin is; `vibe-image-system-v1.md §14` herhaalt dat. `vibe-visual-grammar-v1.md G22` zet voor dezelfde drager **27,3 · 32,1°** in de ACHTERGRONDVLAK-rij, plus 88,1° en 87,3°, met bron `zones.mjs` blok 6. | `forensics-homepage.md §05` en `vibe-image-system-v1.md §14` tegen `vibe-visual-grammar-v1.md G22` | 4.1.2 neemt de G22-waarden over omdat daar een bron bij staat, en markeert in 4.1.8 dat het oppervlak van deze drager (M2) **NIET GEMETEN** is |
| **C-3** | **`forensics-homepage.md` noemt de blokrand "de langste kopregel".** §01: *"de langste regel (x83…587)"*; §08: *"de langste kopregel eindigt op x763"*. Eigen hermeting met het `Range`-instrument: de langste regel van S1 eindigt op **x539,3** (blokrand x587,0) en die van S8 op **x708,2** (blokrand x762,7). De afgeleide speling tot het beeld is daardoor 47,7px (S1) respectievelijk 54,5px (S8) **te klein** opgegeven. | `forensics-homepage.md §01 G` en `§08 G` | 4.2.1 vervangt het instrument; 4.2.7 geeft de gecorrigeerde spelingen |
| **C-4** | **`G21` verbiedt wat `P-08` toestaat.** `G21` NIET TOEGESTAAN: *"Twee koppen met dezelfde graad op één pagina"* = maximaal 1×. `P-08(iii)`: *"geen graad vaker dan 2×"*. `vibe-migration-checklist-v1.md` H-06 idem 2×. Eén meting, twee drempels. | `vibe-visual-grammar-v1.md G21` tegen `vibe-design-quality-gate-v1.md §3.2 P-08` (en `kritiek-overfitting.md §4.5`) | DR-G-08 vervangt beide: uniciteit verdwijnt, clusters en lege banden komen ervoor |
| **C-5** | **`P-08(ii)` is een plafond zonder vloer en verwijdert de verkeerde kop.** `poorten.mjs:761` doet `graden.slice(1)` in de aanname dat de eerste gemeten kop de H1 is; een vlakke reeks haalt dan 51 ÷ 44 = 1,159 onder het plafond 1,35. | `kritiek-ontduiking.md` GAT-20 | DR-G-08(iv): de H1 wordt op `tagName` geïdentificeerd; de spreiding wordt vervangen door clusters en de %vw-vloer |
| **C-6** | **`P-15` telt DOM-elementen waar brandbook §1A.6.4 ze uitzet.** De master zet onder 1200px **28 keer** `… br{display:none}`; P-15 meldt daar nog 87,5% omdat de `<br>`'s in de DOM staan. | `vibe-design-quality-gate-v1.md §3.2 P-15` tegen `vibe-web-brandbook-v1.md §1A.6.4` (en `kritiek-ontduiking.md` GAT-21) | DR-G-09 meet regelvakken en is uitsluitend ≥1200px van toepassing; onder 1200px is hij N.V.T.-met-reden |
| **C-7** | **`DR-V-20` wil een sub-AA-waarde als norm.** Voorstel (b): *"norm mediaan ≥ 5,5:1, ongunstigst ≥ 3,9:1"* — onder de AA-eis van 4,5:1. | `vibe-image-system-v1.md §16 DR-V-20` | DR-G-14 verwerpt het voorstel; DR-G-18 legt de gemeten toestand vast als legacy exception |
| **C-8** | **Het nummerblok DR-V-20…29 is dubbel uitgegeven.** `vibe-image-system-v1.md §16` gebruikt DR-V-20 voor contrastondergrenzen, `vibe-card-system-v1.md §7` voor kaartradius; alle tien nummers botsen. | `papiertest.md §8.6 T-4` | Dit hoofdstuk gebruikt uitsluitend de prefix **DR-G**, met doorlopende nummers 01-23. Er is in V1.3 geen DR-V bijgekomen |
| **C-9** | **`P-13` tegen "één gebaar per sectie".** `vibe-section-blueprints-v1.md §4.1.5`: *"één gebaar per sectie"* en *"vrijstaande versiering: maximaal één per negen secties"*; `P-13` eist geometrie in ≥60% van de secties **en** ≥4 unieke hoekwaarden. Op een pagina van 5 secties is het quotum versiering 0 en P-13 onhaalbaar (voorgerekend: 40% en 3 hoeken). | `kritiek-overfitting.md §5.6` | DR-G-01 maakt de noemer CANVAS+HYBRID; DR-G-02 vervangt "unieke hoekwaarden" door families en spreiding, met N.V.T. onder 4 dragers; DR-G-07 houdt het versieringsbudget op 1 per **pagina** in plaats van per negen secties |
| **C-10** | **`G21` schrijft `lh ÷ graad ≤ 1,000` voor en verklaart 1,13-1,28 verboden.** Bij 76,5px is 0,951 een regelafstand van 72,8px; als sitebrede regel vergroot dat de kans op botsende glyphs bij andere talen en diakrieten. | `vibe-visual-grammar-v1.md G21` tegen `kritiek-overfitting.md §6.7` | 4.0.3 beperkt de band tot CANVAS/HYBRID; RV-G-08 geeft de meting die de botsing zou aantonen. Voor DOCUMENT MODE legt dit hoofdstuk **geen** regelafstand vast, omdat er geen meting is |
| **C-11** | **Drie kopblokbreedtes verschillen tussen twee runs van dezelfde, ongewijzigde pagina.** `lagen-home-1774.txt` meldt 470 (S3) · 460 (S4) · 634 (S6); eigen meting 461,7 · 474,0 · 621,9 — afwijkingen van 1,8% · 3,0% · 1,9%. De vijf overige blokken zijn in beide runs gelijk tot 0,1px. Gemeten oorzaak: deze drie blokken zijn shrink-to-fit (`home-project.css:101-107`, `home-process.css:57-62`, `home-proof.css:62-67`) en `lagen.mjs:28` wacht niet op `document.fonts.ready`. De bestandsdatums van `home*.css` (28-29 september) liggen vóór beide runs en `git status` meldt geen wijziging in `home*.css` of `index.html`, dus de pagina is niet veranderd. | `lagen-home-1774.txt` tegen `sil-1774.txt` | 4.2.7 stelt de instrumenteis: wachten op `document.fonts.ready` én `img.complete`. Geen poortuitkomst verandert: de S2-minimumwaarde 0,785 komt van S5, een gedeclareerd blok dat in beide runs 726px meet |

### 4.4.1 Botsingen binnen V1.3 zelf — gelezen in de parallelle hoofdstukken

Dit zijn **geen** V1.2-conflicten; ze ontstaan tussen hoofdstukken van V1.3 en moeten door de
opdrachtgever worden beslecht. Gelezen in `H2-beeld.md` en `H6-poort.md` zoals die op het moment van
schrijven in de scratchpad stonden.

| # | botsing | de twee posities | voorstel tot oplossing |
|---|---|---|---|
| **X-1** | **Sub-AA als norm: aangenomen in H2, verworpen in H4.** `H2-beeld.md` **DR-I-10**: *"Type op beeldpixels haalt mediaan ≥ 5,5:1 en ongunstigste monster ≥ 3,9:1, of het staat er niet"*, met het label `A TRANSFERABLE FLOOR`. Dat is woordelijk voorstel (b) van `DR-V-20`, dat mijn opdracht expliciet verwerpt. | H2: 3,9:1 bij het ongunstigste monster is de vloer · H4 (**DR-G-14**, **DR-G-20**): normale tekst 4,5:1 bij p95 en ≥3,0:1 bij max | De twee zijn **samen te nemen zonder de AA-eis te verlagen**: DR-G-20 blijft de vloer (4,5:1 bij p95, 3,0:1 bij max) en de mediaan-eis van DR-I-10 (≥5,5:1) komt er als **extra** eis voor type op beeldpixels bovenop. Alleen het getal **3,9:1 als vloer vervalt**. Gemeten gevolg: `.vh-pr-eyebrow` en `.vh-pr-body` blijven dan FAIL (L-08, L-09) in plaats van PASS |
| **X-2** | **`aria-hidden`-uitzondering: ingetrokken in H2, voorwaardelijk toegestaan in H4.** `H2-beeld.md` trekt `M6-O` in en schrijft *"De gemeten footernotitie (2,00:1) voldoet niet en **vervalt**"*. | H2: geen uitzondering, het element verdwijnt · H4 (**DR-G-19**): toegestaan bij `aria-hidden="true"` + geen unieke informatie + niet interactief | **"Vervalt" is een productiewijziging in Master v1** en botst met brandbook §1A.11.3 en met **DR-G-18**. Oplossing: de intrekking geldt **voor nieuwe pagina's**; op Master v1 blijft het element staan als **L-11, FUTURE REMEDIATION**. Daarmee is er geen tegenspraak over de regel, alleen over het tempo |
| **X-3** | **Kopgraadvloer: twee waarden.** `H6-poort.md` **DR-Q-08** vraagt de vloer op aan het typografiehoofdstuk en noemt als mogelijkheid *"het middenpunt 2,40% vw = 42,5px @1774"*. | H6: 2,40% vw (middenpunt tussen master 2,99% en B2 1,80%) · H4 (**DR-G-08(iii)**): **2,9% vw**, geijkt op de gemeten master-ondergrens 2,988% met 0,088 pp marge | H4 beantwoordt DR-Q-08 met **2,9% vw**, en uitsluitend voor **CANVAS**-secties. H6's middenpunt 2,40% is geen meting maar een compromis; bovendien zou 2,40% een CANVAS-kop van 42,5px toestaan, en dat is 0,6 pp onder elke gemeten masterkop. In **DOCUMENT MODE** geldt er géén %vw-vloer, waardoor het compromis niet nodig is |
| **X-4** | **Contrastpoort binnen of buiten de poort.** `H6-poort.md` **DR-Q-09** laat open of de contrastpoort buiten de kwaliteitspoort blijft, met als argument: *"Met een AA-poort zakt de master zelf"*. | H6: eruit laten · H4 (**DR-G-20**): erin, en de master zakt inderdaad | Dit hoofdstuk beslist het: **de poort komt erin**, de master zakt, en die uitkomst is als `LEGACY EXCEPTION` vastgelegd (DR-G-18) in plaats van weggelaten. Een poort die de bron van waarheid ontziet door niet te meten, is precies de V1.2-fout |
| **X-5** | **Prefixbotsing tussen twee andere hoofdstukken.** `DR-C-` komt voor in zowel `H1-canvas.md` als `H5-blauwdrukken.md`. | — | Niet mijn hoofdstuk, wel het risico uit `papiertest.md §8.6 T-4` dat zich herhaalt. **DR-G** komt in geen enkel ander hoofdstuk voor (gecontroleerd: H1 DR-C/DR-V · H2 DR-I · H3 DR-S · H5 DR-B/DR-C · H6 DR-Q) |

---

## 4.5 · BESLUITENREGISTER DR-G

| # | besluit | klasse | poort | Master v1 |
|---|---|---|---|---|
| **DR-G-01** | geometriedichtheid per modus: ≥⅔ van CANVAS+HYBRID, 0 in DOCUMENT | A/B | ja | PASS (0,89) |
| **DR-G-02** | familiespreiding ≥2 families, spreiding ≥8,0°, omhulsel 9-14°/27-37° | A/B | ja | PASS (4 families, 26,5°) |
| **DR-G-03** | elke drager geeft één antwoord F1-F6, bevestigd met de weglaattoets | A | ja | NIET GEDRAAID |
| **DR-G-04** | hoekrijm achtergrondveld ↔ beeldmasker ≤1,0° | A | ja | PASS (0,0° in 2 van 2) |
| **DR-G-05** | beeldsnede met tekst erlangs ≤14,0° | A | ja | PASS (13,0 en 9,7°) |
| **DR-G-06** | maatondergrens: masker ≥5,0%, drager ≥0,5% van het sectievlak | A | ja | PASS (6% en 0,72%) |
| **DR-G-07** | decoratiebudget ≤1 per pagina, benoemd als BEELDVERVANGER | A | ja | PASS (1 van 13) |
| **DR-G-08** | impacttrap: ≥3 clusters bij 0,23% vw, cluster ≤⅔, CANVAS-kop ≥2,9% vw, H1 op `tagName` | A/B | ja | PASS (3 clusters, 2,988%) |
| **DR-G-09** | zichtbare regelval: regelvakken, gelijk op 1774 en 1200, ≥60% met `<br>` | A/B | ja | PASS (87,5%, 8 van 8 gelijk) |
| **DR-G-10** | silhouet S1 ≥0,50 en S2 ≥0,75 | A | ja | PASS (0,551 en 0,785) |
| **DR-G-11** | accent niet op regel 1, eindigt ≤1,0px van een regeleinde | A | ja | PASS (7 van 7) |
| **DR-G-12** | ≤1 kop per pagina zonder accent | B | ja | PASS (1 van 8) |
| **DR-G-13** | kop overlapt geen beeldrand; lopende tekst alleen bij ≤14,0° | A | ja | PASS (0 van 8) |
| **DR-G-14** | normale tekst haalt AA 4,5:1; grote tekst 3,0:1; gewicht 600 is niet vet; AAA niet vastgelegd | A | — | FAIL, zie DR-G-18 |
| **DR-G-15** | meetmethode N1/N2/N3; alleen N3 is poort | A | — | N3 NIET GEDRAAID |
| **DR-G-16** | `#0073FE` als tekst alleen groot; normale tekst op licht via `#005FE0` (5,66:1 nagerekend) | A | ja | 12 instanties FAIL |
| **DR-G-17** | knoplabel: knopvlak naar `#005FE0`, hovertrede open | A | ja | 9 instanties FAIL |
| **DR-G-18** | Master v1 nu niet wijzigen; register L-01…L-12 als LEGACY EXCEPTION / FUTURE REMEDIATION | A | — | vastgelegd |
| **DR-G-19** | decoratief type op beeld toegestaan onder drie voorwaarden (`aria-hidden`, geen unieke informatie, niet interactief) | A/B | ja | 1 van 1, (ii) NIET GEMETEN |
| **DR-G-20** | tekstcontrastpoort: 4,5:1 bij p95 en 3,0:1 bij max; niet gemeten = FAIL | A/B | ja | FAIL (41 dragers) |
| **DR-G-21** | **OPEN** — welke donkere blauwtrede wordt de nieuwe hover als rust naar `#005FE0` gaat? Gemeten randvoorwaarde: in `home.css:35-38` bestaat **geen** blauw donkerder dan `#005FE0` (L = 0,1357 tegenover 0,1942 · 0,3169 · 0,8584) | — | — | waarde NIET BEPAALD |
| **DR-G-22** | **OPEN** — `#1B2740` op `#0073FE` (3,46:1) heeft binnen de huidige primitieven geen oplossing: op `#005FE0` wordt het 2,63:1. Wit label (5,66:1 op `#005FE0`) of lichte knopgrond? | — | — | 1 instantie |
| **DR-G-23** | **OPEN** — hertelling van de geometriedragers op Master v1 volgens 4.1.5, nodig om C-1 te sluiten | — | — | NIET GEDRAAID |

---

## 4.6 · WAT IK IN DIT HOOFDSTUK NIET HEB GEMETEN

| onderwerp | reden |
|---|---|
| De weglaattoets per drager (DR-G-03) | 13-16 renderings met geïnjecteerde stijlregels; niet gedraaid. Het bewijs dat de methode werkt bestaat wel: de scrim-aan/uit-meting in `contrast-1774.txt` |
| Het werkelijke aantal geometriedragers (DR-G-23) | de drie V1.2-tellingen spreken elkaar tegen (C-1) |
| Oppervlak van `.vh-ctrl::before` tegen GEO-07 | niet in het bewijs; **NIET GEMETEN** |
| Glyphgemaskeerde hermeting van de 28 V1.2-contrastmetingen | het bestaande instrument leest rechthoeken; de hermeting is **NIET GEDRAAID** |
| Contrast op 1440 · 1199 · 768 · 390px | alle contrastmetingen, inclusief de mijne, zijn op 1774px gedaan |
| Oorzaak per regelvak (TYP-05) | het `Range`-instrument geeft breedtes, niet of een breuk van een `<br>`, van `balance` of van `break-word` komt |
| Fontmetrieken van Urbanist (RV-G-08) | nodig om glyphbotsing bij `lh ÷ graad` = 0,951 aan te tonen |
| DOCUMENT MODE-typografie en -geometrie op een echte pagina | Master v1 heeft **0** DOCUMENT-secties; elke DOCUMENT-waarde in dit hoofdstuk is een besluit zonder meting op een gebouwde pagina, en is als zodanig gemarkeerd |
| Silhouetmeting op de B2-kandidaat | `silhouet.mjs` is alleen op `index.html` gedraaid |
| Gedrag boven 1774px | niet gemeten; de pagina rekent in `cqw` en zou lineair doorschalen, maar dat is een verwachting |


---

# HOOFDSTUK 5 · BLAUWDRUKKEN ALS RELATIES

**VIBE WEB DESIGN SYSTEM V1.3 — REPARATIELAAG OP V1.2**

| | |
|---|---|
| **Wat dit hoofdstuk doet** | Het vervangt de vijftien V1.2-sectieblauwdrukken `B01`–`B15` door dertien **relatieblauwdrukken** `BR-01`–`BR-13`. Een `B`-blauwdruk legde een **gemeten maat** vast; een `BR`-blauwdruk legt vast **wat zich tot wat verhoudt**, met welke vrijheidsgraden, en wat hij wordt als je hem lui uitvoert. |
| **Wat het niet doet** | Geen productiecode. Geen HTML, CSS, JS of asset gewijzigd of toegevoegd. Geen screenshot gemaakt. Geen commit, geen push. Geen bestaand document onder `docs/` aangepast. |
| **Zelf gemeten in deze sessie** | **niets gerenderd.** Alle getallen in dit hoofdstuk komen uit het AANVAARD BEWIJS van de V1.2-audit, uit `BEWIJS-assets.md`, of zijn een **narekening** daarvan (optelling, deling, percentage). Waar ik reken staat **BEREKEND**; waar ik een marge om een meting leg staat **AFGELEID MET MARGE, NIET ONAFHANKELIJK GEMETEN**. |
| **Bronnen gelezen** | `docs/vibe-section-blueprints-v1.md` (§1–§8 volledig) · `docs/vibe-section-compositions-v1.md` §4 (`C1`–`C12`) · `docs/vibe-web-brandbook-v1.md` §1A.1–§1A.12 en §2.1/§2.2 · `docs/vibe-image-system-v1.md` §9 (`F-1`–`F-7`) · `docs/vibe-card-system-v1.md` GRENS 1–3 · `scratchpad/papiertest.md` §3–§11 · `scratchpad/v12/kritiek-overfitting.md` §2, §4.7, §5 · `scratchpad/v12/kritiek-ontduiking.md` §5, §6 · `scratchpad/v13/BEWIJS-assets.md` volledig. |
| **Besluitprefix** | **`DR-B-01` … `DR-B-14`.** Gekozen omdat `DR-V-01…10`, `DR-V-11…17`, `DR-V-20…29` (tweemaal uitgegeven), `DR-V-30…40` en `DR-V-B1…B8` alle bezet zijn (`papiertest §11`, `blueprints §8`). |
| **Vindplaats van `papiertest.md`** | `scratchpad/papiertest.md`, **niet** `scratchpad/v12/papiertest.md`. Op het in de opdracht genoemde pad staat het bestand niet; `kritiek-ontduiking.md §7` noteerde dezelfde afwezigheid al. Alle verwijzingen hieronder gebruiken het werkelijke pad. |

---

## 5.0 · De vier reparaties die dit hoofdstuk uitvoert

V1.2 zakte als systeem op vier dingen die alle vier in deze laag zitten. Hier staat wat er per stuk verandert; de rest van het hoofdstuk is de uitwerking.

| # | V1.2-defect, met bewijs | Reparatie in V1.3 |
|---|---|---|
| **1** | **Vijf bevroren-verboden composities werden herbruikbare blauwdrukken.** `brandbook §1A.4` punt 3 verklaart hero-stage, VIBE.CONTROL-console, Hedin-projectcompositie, process timeline en final CTA **niet-abstraheerbaar**; `blueprints §6` wijst ze toe aan vijf tot zes archetypes (`kritiek-overfitting §5.2`). | §5.1 classificeert alle vijftien. De verboden composities blijven HOMEPAGE-ONLY; er wordt uitsluitend hun **principe** overgedragen. |
| **2** | **Een blauwdruk was een bevroren meting.** Over vijf papieren pagina's: 36 inhoudskaders, 32 kopgraden, 22 tweedelingen, 36 overlapparenwaarden — **0 nieuw** (`papiertest §9 toets 2`). Oorzaak staat in `blueprints §1.1`: een blauwdruk legt "beeldbreedte in px", "overlapwaarde in px" en "inhoudsplafond in woorden" vast. | §5.2 schrijft elke blauwdruk als **verhouding + stuurmaat met bereik + rekenprocedure voor de capaciteit**. Een px-waarde komt uitsluitend nog voor als bron van een verhouding, nooit als eis. |
| **3** | **Tien van vijftien blauwdrukken eisten een eigen foto**, bij maximaal drie fotoloze inhoudsblokken per pagina; de echte pagina's hebben er 5 · 6 · 6 · 7 · 6 nodig (`papiertest §8.2`). Van 27 verschillende opnamen zijn er **9 klasse A** voor 48 pagina's (`BEWIJS-assets §3`, `§4`). | §5.2 maakt de **drager** een variabele met drie toegestane soorten (foto · gebouwd object · getekend vlak) en §5.4 vervangt het M0-plafond door een vloer op dragerverscheidenheid. |
| **4** | **Geen registerblauwdruk**: 20 FAQ-paren over vier pagina's hadden geen plaats (`papiertest §8.1`), lange juridische tekst is onbouwbaar (`kritiek-overfitting §3.2`: 6106 woorden ÷ 27 woorden per `B15`-sectie = 226 secties). | `BR-12 REGISTER MET GEWICHT` en `BR-13 LANGE LEESKOLOM`, beide in DOCUMENT MODE, beide met de status "geen precedent in Master v1" en een eigen DR-B. |

### 5.0.1 Uitkomsten van een toets — drie, nooit twee

Elke toets in dit hoofdstuk kent exact drie uitkomsten.

| Uitkomst | Voorwaarde |
|---|---|
| **PASS** | Het te toetsen object is aanwezig, is gemeten, en de meting ligt binnen het bereik. |
| **FAIL** | Het object is aanwezig en de meting ligt buiten het bereik, **óf** het object is aanwezig en is **niet gemeten**. Niet gemeten = FAIL, nooit PASS. |
| **N.V.T.-met-reden** | Het object kan in deze blauwdruk niet bestaan, en de reden staat in de uitkomst. Een N.V.T. zonder uitgeschreven reden is FAIL. |

Twee gevolgen, die beide een gemeten V1.2-gat dichten:

1. **Een lege verzameling is nooit PASS.** `kritiek-ontduiking §5 S4`: `[].every() === true` liet `P-10` slagen op negen 50/50-secties en `P-09` slagen zonder enige kaartrij. Elke toets hieronder begint daarom met een **tellingsvoorwaarde** (`n ≥ 1`), en bij `n = 0` is de uitkomst N.V.T.-met-reden of FAIL — nooit PASS.
2. **Een ontbrekende meting is geen vrijbrief.** `blueprints §4-B13` toets 4 schreef zelf "in dit document NIET GEMETEN" bij de contrasteis. In V1.3 is dat FAIL tot de meting er is.

### 5.0.2 Wat een blauwdruk mag vastleggen, en wat niet

| Mag | Mag niet |
|---|---|
| Een **verhouding** tussen twee vlakken (`drager : vlak`, `beeld : tekst`). | Een absolute px-maat van een vlak. |
| Een **stuurmaat met een bereik** en een minimale stap tussen twee pagina's. | Eén waarde die gelijk is aan de enige waarneming. |
| Een **vlakhiërarchie** (wie ligt op wie) en een **geometrierol**. | Een clip-percentage, want dat is doosgebonden (`compositions §3.5`). |
| Een **rekenprocedure** voor de inhoudscapaciteit. | Een woordenaantal uit de homepage-copy. |
| Een **oriëntatievrijheid** met de randvoorwaarde die haar begrenst. | Een verbod op spiegelen dat alleen uit "niet gemeten" volgt. |
| Een **verboden generieke terugval** met een meetbare signatuur. | Een antipatroon dat alleen in woorden bestaat. |

Dit is de directe reparatie van `kritiek-overfitting §2.3`: V1.2 gebruikt 15 + 11 + 11 = **37 keer** het woord "maximaal", en in minstens zeven gevallen is de bovengrens gelijk aan de enige waarneming (`G05` 4 middelen, `G06` 4 kaartfamilies, `G11` 5 kleurstops, `K8` 4 stuks). Afwezigheid van meting werd verbod. In V1.3 is afwezigheid van meting een **DR-B**, geen regel.

### 5.0.3 Classificatie van elke overgenomen meetwaarde

Verplicht door de opdracht: elke numerieke waarde die ik overneem krijgt een klasse.

- **A TRANSFERABLE FLOOR** — geldt overal, is een vloer (niet een plafond), en is te toetsen op elke pagina.
- **B REFERENTIEBEREIK** — richtwaarde of bandbreedte; informeert een keuze, is **geen** poort.
- **C HOMEPAGE-SPECIFIEK** — beschrijft Master v1 en wordt **geen** regel.

**De A-vloeren. Dit is de volledige lijst; er zijn er zeven.**

| # | Vloer | Bewijs waaruit hij volgt | Status van de drempel |
|---|---|---|---|
| **A1** | **Elke sectie draagt ≥ 1 overlappend elementpaar waarvan beide delen ≥ 1% van het sectievlak beslaan.** | Homepage **0 van 9** secties zonder overlap; B2-kandidaat **4 van 11** (`blueprints §1`) resp. **5 van 11** (`blueprints §5 R5`). | De 1%-ondergrens is **AFGELEID MET MARGE, NIET ONAFHANKELIJK GEMETEN** — zij sluit `kritiek-ontduiking` GAT-12 ("15 overlapparen van onzichtbare broers"). → **DR-B-01** |
| **A2** | **≥ 2 secties per pagina leggen een informatievlak op een drager, waarbij ≥ 30% van het vlakoppervlak op die drager valt.** Drager = foto, gebouwd object of getekend vlak. | Homepage **6 van 9** secties met een informatievlak op een beeld; B2 **0 van 11**. Kaartvlakken op een beeld: 12 van 18 (66,7%) tegen 1 van 19 (5,3%) (`card §` bij GRENS 1). | Getal 2 in plaats van 50% omdat 39 van 48 pagina's rekenkundig geen drie grote beelden kunnen halen (`kritiek-overfitting §3.1`). De 30%-dekking sluit GAT-03/06/07 (1%-dekking op een transparante GIF haalde `P-04`). **AFGELEID MET MARGE.** → **DR-B-02** |
| **A3** | **Elke kop op een pagina heeft een eigen graad; het aantal unieke graden ÷ het aantal koppen is ≥ 0,80 en de twee dichtstbijzijnde graden verschillen ≥ 3px.** | Homepage **8 koppen, 8 graden** = 1,00; B2 **6 graden op 10 koppen** = 0,60. | 0,80 en 3px zijn **AFGELEID MET MARGE**; de 3px sluit GAT-19/20 (1px-trap, `slice(1)`). → **DR-B-03** |
| **A4** | **≥ 50% van de koppen draagt handgezette regelval die de regelval meetbaar verandert**: zonder de `<br>` valt het aantal regels anders uit. | Homepage **7 van 8** koppen met in totaal **11** `<br>`; B2 **0 van 10**. | Niet "aantal `<br>` ≥ 1" maar "het aantal regels verandert" — dat sluit GAT-21 (DOM-telling zonder zichtbare regelval). De drempel 50% is **AFGELEID MET MARGE**. |
| **A5** | **≥ 1 beeldvlak per pagina draagt een polygoonmasker, en over de pagina is dat ≥ 1/3 van de beeldvlakken.** | Homepage **5 van 8**; B2 **0 van 5**. | 1/3 is **AFGELEID MET MARGE**. Bij nul beeldvlakken: N.V.T.-met-reden "pagina zonder fotografische drager", en dan treedt A7 in werking. |
| **A6** | **≥ 3 geometrie-elementen per pagina, met ≥ 3 verschillende hoekwaarden, en de spreiding tussen de kleinste en de grootste hoek is ≥ 5,0°.** | Homepage **13 elementen, 14 hoekwaarden, 9,7°–36,2°** → spreiding 26,5° **BEREKEND**; B2 **4 elementen, viermaal exact 34,0°** → spreiding 0,0°. | De spreidingseis sluit GAT-09 ("4 hoekwaarden binnen 1,5°" haalde `P-12`). De 5,0° is **AFGELEID MET MARGE**. |
| **A7** | **In CANVAS MODE: de mediane werkbreedte is ≥ 80% van de viewport, op twee breedtes gemeten, en zij daalt niet als de viewport groeit.** | Homepage **90,5% op 1774 én op 1440**; B2 **68,1% op 1774 en 86,0% op 1440** — de pagina krimpt naarmate het scherm groeit. | 80% is **AFGELEID MET MARGE** (de 90,5 is één pagina). De tweede helft — "daalt niet" — is **geen marge maar een richting** en is daarom de scherpere helft van de toets. In DOCUMENT MODE: N.V.T.-met-reden "DOCUMENT MODE", en dan geldt de regellengtecap 34–52ch. |

**Het REFERENTIEBEREIK (klasse B). Richtwaarden; geen van deze is een poort.**

| Waarde | Meting | Waarom B en niet A |
|---|---|---|
| Beelddekking **43,7%** homepage tegen **20,2%** B2 | aanvaard bewijs | Dekking is een gevolg van de beeldvoorraad, niet van het ontwerp. `kritiek-overfitting §5.7`: `V-1` (≥35% dekking) is alleen te halen met middelen die `brandbook §4.4` verbiedt. |
| **5 van 8** beeldvlakken ≥ 50% vw tegen **1 van 7** | aanvaard bewijs | 39 van 48 pagina's halen `P-05` niet, ongeacht het ontwerp (`kritiek-overfitting §3.1`). Als vloer is dit een regel die om overtreding vraagt. |
| **454** overlapparen homepage, mediaan **43** per sectie | json | Een telling zonder weging; `kritiek-ontduiking §5 S2`. A1 vervangt haar door een gewogen vloer. |
| Kleinste kopgraad **53px** homepage tegen **32px** B2, mediaan B2 **44px** | aanvaard bewijs | Graadhoogte hangt af van de inhoud en van de breedteband; richtwaarde. |
| Sectiehoogte max/min **1,544** (908 ÷ 588) | `blueprints §5 R9` | Met `G20` (leegte ≤ 25%) samen levert dit een toelaatbare inhoudsspreiding van **2,13**, terwijl `algemene-voorwaarden.html` **25,5** meet (`kritiek-overfitting §3.2`) — factor 12 ernaast. Als plafond onbruikbaar buiten korte pagina's. |
| Hoekfamilies **scherp 31,6°–36,2°** en **flauw 9,7°–13,0°** | `blueprints §4-B13`, `§4-B09` | Twee banden om vijf respectievelijk twee waarnemingen; richtwaarde voor de **rol**, niet voor de waarde. |
| Beeld : tekst **1,12** (dichtst) tot **3,69** (wijdst) | `blueprints §4-B06`, `§4-B03` | Het bereik is bruikbaar als keuzeruimte; de uiteinden zijn n=1. |

**HOMEPAGE-SPECIFIEK (klasse C). Deze waarden worden in V1.3 geen regel. Niet-limitatief, maar wel de volledige lijst die V1.2 tot regel verhief.**

`1774 × 748` podium · `aspect-ratio 1774/748` · knik op `(624, 545)` · band `1740` met `3 × 580` · `1704 × 565` paneel · radius `63/0/0/63` · tekstkolom `461,7` op `80,4` van de paneelrand · `100px` papier boven en onder het paneel · `956,4 × 293,5` band met ratio `3,26` · overschrijding `55,8` / `8,1` · kaart `337,6 × 253,7` · tussenruimte `207,6` · `4 × 292,1` stappen met steek `430,6` · leegte-element `56,9` · `687,1 × 428,7` dashboard · `151,3 × 308` telefoon met overlap `27,4` · `92,7` tussenruimte · kolom `726,1` · leegte `507,4` · band `241,3` (13,6cqw) · `281,3` / `189,4` logokaarten · `734,4 × 557` draagvlak · kaart `448 × 374` met `42px` overlap · strook `629 × 124` r20 · `1100 × 736,2` draagvlak · `4 × 422 × 126` met steek `141,3` · naad `1,9` · `934,7 × 631` chevron · lijn `47,31%` / punt `55,75%` · merkvlak `293,6 × 400,7` · `350,1 × 525,5` voetbeeld · steken `371,2 / 226,8 / 211,9 / 194,3` · `1605,3` juridische regel · de acht kopgraden `76,46 · 61,5 · 58,32 · 64,04 · 54 · 53 · 61 · 66` · de negen inhoudskaders `1740 · 1133 · 1704 · 1584 · 726 · 634 · 568 · 822 · 1605` · de negen sectiehoogtes `908 · 889 · 765 · 599 · 588 · 887 · 887 · 631 · 631`.

**Mechanismetellingen worden geen poort.** Homepage **~780× `cqw`** (vier tellingen in omloop — 768 · 779 · 780 · 782 — afhankelijk van de zoekterm; zie H1 Z2), `container-type` in 9 van 9 stylesheets, **73× `position:absolute`** (de eerdere opgave "0×" was een grep-artefact: zoekterm zonder spatie — zie H1 §1.5 conflict CH1-01), geen paginabrede `max-width` (alleen regellengtecaps 34–52ch); B2 **4× `cqw`**, 1 `container-type`, **19× absolute**, `max-width:var(--container-max)`. Dit is sterk **diagnostisch** bewijs en het verklaart waarom de twee pagina's zich anders gedragen. Het wordt géén toets, om twee redenen: (a) `kritiek-ontduiking §5 S3` — een harnas dat CSS-mechanismen meet in plaats van verschijning is met vijf regels CSS te verslaan; (b) `brandbook §1A.6` punt 2/3 schrijft `clamp()` als default voor en `cqw` **uitsluitend** voor bewust canvas-proportionele composities, dus een regel "gebruik meer `cqw`" zou een bevroren besluit doorkruisen. Zie §5.4.3.

### 5.0.4 Vaste vocabulaires van dit hoofdstuk

Drie korte codelijsten; ze komen in elke blauwdruk terug en er komen er geen bij.

**Dragersoorten** — wat een vlak kan dragen.

| Code | Drager | Toets |
|---|---|---|
| **D-F** | fotografische drager | ≥ 1 `img` of een beeldvlak met een werkelijk bestand, klasse A of B uit `BEWIJS-assets §3` |
| **D-O** | gebouwd object | nul `img`; een interface, diagram of apparaat met echte, elders gepubliceerde waarden; zichtbaar label "Voorbeeldweergave" |
| **D-V** | getekend vlak | nul `img`; een vlak in de merktaal met een snede, en een **gemeten** luminantie onder elk vlak dat erop ligt |
| **D-0** | geen drager | typografie en 1px-lijnen direct op de sectiegrond |

**Vlakhiërarchieën** — wie ligt op wie.

| Code | Hiërarchie | Waar hij toegestaan is |
|---|---|---|
| **H-OP** | vlak op drager, ≥ 30% van het vlakoppervlak op de drager | CANVAS en HYBRID |
| **H-IN** | drager **is** het vlak; de tekst staat erin, op een scrim | CANVAS |
| **H-NEST** | vlak binnen vlak (inhoud binnen een kaart) | overal |
| **H-KRUIS** | vlak kruist een drager**rand** of een vormpunt, met een **gemeten** waarde | CANVAS en HYBRID |
| **H-NAAST** | vlak naast de drager, geen overlap | **uitsluitend** DOCUMENT MODE; in CANVAS en HYBRID is dit de generieke terugval |

**Geometrierollen** — waarvoor een vorm er staat.

| Code | Rol | Hoekband (klasse B) | Begrenzing |
|---|---|---|---|
| **GR-RAND** | randovergang: de vorm brengt een beeld naar een schermrand | scherp, 31,6°–36,2° | max 1 per sectie |
| **GR-SNEDE** | snede in een vlak: haalt beeld weg waar tekst eroverheen loopt | flauw, 9,7°–15,0° | max 1 per sectie; verplicht flauw zodra een tekstkolom het vlak raakt |
| **GR-GROND** | ondergrond die een beeld draagt in plaats van snijdt | 33,7° gemeten | max 1 per sectie |
| **GR-ANKER** | merkvlak dat een hoek op de schermrand sluit | 36,2° gemeten | max 1 per **pagina** |
| **GR-VRIJ** | vrijstaande versiering | 32,6° gemeten | quotum `floor(aantal secties ÷ 9)`; op een pagina van 6 secties is dat **0** (`brandbook §4.1.5`, narekening in `kritiek-overfitting §2.2`) |

**Canvasmodi** — vastgesteld door de opdrachtgever, hoofdstuk 1. Exact deze namen: **CANVAS MODE** (proportioneel met het scherm), **DOCUMENT MODE** (begrensde leesbreedte), **HYBRID MODE** (redactionele kolom naast een ontworpen visueel podium).

---

## 5.1 · Classificatie van `B01`–`B15`

### 5.1.1 De maatstaf: het bevroren abstractieverbod, en het is breder dan vijf

`brandbook §1A.4` punt 3 noemt vijf composities die niet geabstraheerd mogen worden. `brandbook §2.1` noemt onder PAGE-SPECIFIC COMPOSITIONS óók vijf, met de toets *"Wordt dit op een tweede pagina een leugen, een herhaling of een lege doos? Ja → alleen homepage."* **De twee lijsten zijn niet dezelfde lijst.**

| Compositie | staat in §1A.4.3 | staat in §2.1 |
|---|---|---|
| homepage hero-stage / hero-diagonaalcompositie | ja | ja |
| uitgelicht projectpaneel (Hedin) | ja | ja |
| VIBE.CONTROL-console | ja | ja |
| final CTA diagonal / final-CTA-chevron | ja | ja |
| homepage process timeline | **ja** | nee |
| **de bewijsstrook** (`index.html:222-293`) | nee | **ja** |

**De vereniging van beide bevroren lijsten telt zes composities, niet vijf.** Bij tegenspraak wint §1A (`brandbook §1.3`), en hier is geen tegenspraak maar een aanvulling: beide paragrafen zijn `FROZEN`, dus beide gelden. De zesde is de bewijsstrook, en `brandbook §2.2` punt 1 schrijft het verbod zelfs uit: *"De bewijsstrook telt wat de site toont. Zet je hem ook op `projecten.html`, dan staan er twee tellingen van hetzelfde onderwerp naast elkaar."* Dat is precies wat `blueprints §4-B15` doet — het heet daar woordelijk *"K7 **losgemaakt van zijn gastsectie**"*, met pagina-archetypes *"Alle behalve B7"*.

Een tweede, afgeleide maatstaf volgt daaruit: **een spiegeling van een verboden compositie is die compositie.** `x' = 1774 − x` verandert geen betekenis. `B14` is `B03` gespiegeld (`blueprints §4-B14`, "Herkomst: gespiegeld uit B03"), en `B03` is de Hedin-compositie. `B14` kan dus niet herbruikbaar zijn als `B03` dat niet is.

### 5.1.2 De classificatie van alle vijftien

| # | V1.2-blauwdruk | Bron­sectie | Verdict | Grond |
|---|---|---|---|---|
| **B01** | Podiumopening | S1 | **HOMEPAGE-ONLY** | §1A.4.3 en §2.1 noemen de hero-stage expliciet. Het podium draagt bovendien de header ín dezelfde `.vh-stage`-container (`brandbook §2.2` punt 2: *"die compositie is niet los te trekken; elke pagina die `_header.js` draait kan hem niet dragen"*). |
| **B02** | Redactiekolom + ongelijk mozaïek | S2 | **ADAPTIVE** | Niet in beide verbodslijsten. `C2` noemt zichzelf "Beide" — gedeelde kaartprimitieve, compositierichtlijn voor de verdeling. De homepagespecifieke uitvoering die los moet: `487 / 302 / 292` en `371 / 353 / 355`, naadverspringing `116` en `65,1`, rijhoogtes `498 / 230`. |
| **B03** | Randpaneel | S3 | **HOMEPAGE-ONLY** | §1A.4.3 "Hedin featured-projectcompositie"; §2.1 "het uitgelichte projectpaneel". `C3` erkent het zelf: *"§1A.4 punt 3 noemt de Hedin-projectcompositie expliciet als niet te abstraheren"*, en voegt toe dat de regellengte met drie `<br>` handgezet is zonder `max-width` — *"dat werkt alleen bij die exacte copy"*. |
| **B04** | Band met kruisende kaart | S4-boven | **ADAPTIVE** | Niet verboden. Let op de grens: §1A.4.3 verbiedt `home-process.css:152-204` (de stappenrij), **niet** `:37-123` (de band). Los te laten: `956,4 × 293,5`, ratio `3,26`, overschrijding `55,8`/`8,1`, tussenruimte `207,6`. |
| **B05** | Voortgangsrij zonder vlak | S4-onder | **HOMEPAGE-ONLY** | §1A.4.3 noemt `home-process.css:152-204` letterlijk. Dit is al één keer beslist: `C5` noemde zich kandidaat voor `.vibe-steps` en `brandbook §1A.12` punt 4 antwoordt *"§1A.4 wint tot er werkelijk hergebruik in de repository staat"*. `B05` is dezelfde compositie onder een nieuwe naam. |
| **B06** | Gespiegeld gebouwd object | S5 | **HOMEPAGE-ONLY** | §1A.4.3 "VIBE.CONTROL-dashboardcompositie (`home-control.css:50-190`)"; §2.1 "de VIBE.CONTROL-console". `brandbook §8.3 C6` beslist bovendien expliciet *"geen actie — de VIBE.CONTROL-dashboardcompositie wordt niet geabstraheerd"*. |
| **B07** | Bewijsband met leeg midden | S6-A | **TRANSFERABLE** | De **enige** van de vijftien die geen enkele homepagespecifieke uitvoeringseis draagt die zijn relatie bepaalt: de relatie **is** "aantal kolommen = aantal onderbouwde items" (`C7`: *"Het bewijs bepaalt de breedte, niet andersom"*). Niet in een verbodslijst. `C7` wijst hem zelf aan als gedeelde CSS (`.vibe-proofband`). Let op: dit is **niet** de bewijsstrook van §2.1 — die zit in S1 (`index.html:222-293`) en is `B15` variant A. |
| **B08** | Verhaal op draagvlak | S6-B | **ADAPTIVE** | Niet verboden. `C8` noemt zichzelf compositierichtlijn omdat *"de drie blokken aan coördinaten van één canvas hangen"*. Los te laten: `734,4 × 557`, kaart `448 × 374` met `42px`, strook `629 × 124`, snede `13,0°`. |
| **B09** | Kaartkolom op draagvlak | S7 | **ADAPTIVE** | Niet verboden; `C9` noemt zichzelf "Beide, met een open punt" (`DR-C-06`). Los te laten: `1100 × 736,2`, `4 × 422 × 126`, steek `141,3`, naad `1,9`, snede `9,7°`. |
| **B10** | Chevronslot | S8 | **HOMEPAGE-ONLY** | §1A.4.3 "final CTA diagonal composition (`home-final.css:15-104`)"; §2.1 "de final-CTA-chevron". `C10` erkent het en voegt toe: *"de chevroncoördinaten horen bij het 2103 × 748-canvas"*. |
| **B11** | Voetbeeld in de hoek | S9 | **SPLITST: TRANSFERABLE + HOMEPAGE-ONLY** | De navigatievoet zelf is sitebreed en niet verboden; `C11` noemt hem gedeelde CSS. Het **beeldvlak** is dat niet: het rijmt op `B10` (`C11`: *"Als `C10` niet direct erboven staat vervalt het rijm en wordt dit een gewone footer — dan géén beeldwig"*) en `B10` is HOMEPAGE-ONLY. Gemeten gevolg: `s9-footer` toont batterijkasten en staat op 4 van de 5 papieren pagina's buiten het onderwerp (`papiertest §8.4`), terwijl `home-footer.css:370-371` dat argument voor mobiel zelf al maakt. |
| **B12** | Spiegelband | variant op B04 | **ADAPTIVE** | Spiegeling van een niet-verboden compositie, dus toegestaan. Maar `B12` bestaat in V1.3 niet als **aparte** blauwdruk: oriëntatie is een vrijheidsgraad binnen de relatie, geen tweede blauwdruk. Zie §5.1.4. |
| **B13** | Kaartkolom zonder foto | variant op B09 | **ADAPTIVE, nu geblokkeerd** | Spiegelt geen verbod, maar botst frontaal: `gate P-09` eist dat een gelijke kaartrij **op een beeld** ligt en `card GRENS 1` zegt *"toegestaan in precies één vorm: verticaal gestapeld **op een beeld**"* (`papiertest §8.6 T-1`). Opgelost in `BR-09` door de eis te verplaatsen van "`img`" naar "**gemeten** luminantie ≤ 0,14 onder elk vlak". |
| **B14** | Paneel aan de linkerrand | variant op B03 | **HOMEPAGE-ONLY — ingetrokken als blauwdruk** | Spiegeling van een verboden compositie. Daarmee valt ook de eigen randvoorwaarde weg die `DR-V-B2` openhield (tekstkolom op `150,4px` van de rechterrand tegen een gemeten margeband van 31–84px). Gemeten gebruik: **0 van 5** papieren pagina's (`papiertest §9 toets 4`). |
| **B15** | Bewijsregel zonder vlak | variant op B01/B03 | **variant A HOMEPAGE-ONLY · variant B ADAPTIVE** | Variant A is de bewijsstrook uit §2.1 en §2.2.1, losgemaakt van haar gastsectie — exact het verbod. Variant B is de contentgedreven lijnenband ín een paneel; die is een **relatie** (`ongelijk omdat de inhoud ongelijk is`) en gaat als vlakrol op in `BR-03` en `BR-07`. Aanvullend: `brandbook §1A.7` punt 3 classificeert de drie getallen van `projecten.html:173-175` als `UNVERIFIED`, en `P-04`/`P-09` belonen het vlak, niet de bron. |

**Telling.** HOMEPAGE-ONLY: **B01 · B03 · B05 · B06 · B10 · B14 · B15-A** plus het beeldvlak van **B11** = **zeven blauwdrukken en één halve**. TRANSFERABLE: **B07** en de navigatiehelft van **B11** = **anderhalf**. ADAPTIVE: **B02 · B04 · B08 · B09 · B12 · B13 · B15-B** = **zeven**.

De opdrachtgever noemde vijf zekere HOMEPAGE-ONLY's. **Alle vijf bevestigd**, en er komen er twee en een halve bij: `B14` (spiegeling van `B03`), `B15` variant A (de bewijsstrook, verboden in §2.1/§2.2.1 maar niet in §1A.4.3) en het beeldvlak van `B11` (rijmt op een verboden compositie).

### 5.1.3 Het principe uit elke HOMEPAGE-ONLY-blauwdruk

Dit is de kern van de reparatie: niet de compositie reist mee, maar de relatie eronder.

| HOMEPAGE-ONLY | **Niet** dit | **Wel** dit principe | Wordt |
|---|---|---|---|
| **B01** hero-stage | "het 1774 × 748-podium met de knik op (624, 545) en de drie bewijscellen van 580" | **Eén drager vult het openingsvlak van rand tot rand; de propositie ligt als smalle laag ín die drager, niet ernaast; de drager wordt door één randovergang tot vorm gemaakt; het bewijs staat erbuiten en in de hoeveelheid die bestaat.** | `BR-01` |
| **B03** Hedin-projectpaneel | "het paneel van 1704 × 565 met radius 63/0/0/63 en de tekstkolom op 80,4" | **Dominant projectbeeld + aangehecht bewijsvlak + ondergeschikte projectnavigatie; de drager loopt naar exact één schermrand door en draagt de tekst in zijn donkerste deel; één onderwerp per drager.** | `BR-03` |
| **B05** process timeline | "vier stappen van 292,1 met steek 430,6 en het leegte-element van 56,9" | **Richting zonder vlak: gelijke stappen op een gelijke steek, zonder kaart, rand of schaduw, in een rij die veel breder is dan de begeleidende tekst — zodat de rij als beweging leest en niet als raster.** | `BR-05` |
| **B06** VIBE.CONTROL-console | "het dashboard van 687,1 × 428,7 met de telefoon van 151,3 × 308 die 27,4 overlapt" | **Een gebouwd onderwerp vervangt de ontbrekende fotografie en is zélf de boodschap: hoofdapparaat plus één kleiner apparaat aan de buitenzijde dat erover valt en er verticaal volledig in blijft; elk getoond getal is elders gepubliceerd; de knop is het kleinste element.** | `BR-06` |
| **B10** final-CTA-compositie | "de chevron op lijn 47,31% met punt 55,75% op het 2103 × 748-canvas" | **De slotsectie escaleert aantoonbaar boven de rest van de pagina in ten minste twee van drie: kopgraad, mediaschaal, aantal lagen — en de escalerende vormen delen één lijn of één punt, zodat ze als diepte lezen en niet als drie vormen.** | `BR-10` |
| **B14** gespiegeld paneel | "x' = 1774 − x" | **Oriëntatie is een vrijheidsgraad van de relatie, begrensd door een margeregel, niet door een spiegelverbod.** | opgenomen in `BR-03` |
| **B15-A** bewijsstrook | "drie cellen van 580 met icoon 49,2 en getal 28, onder de opening" | **Bewijs staat in de hoeveelheid die bestaat, één keer per pagina, met de herkomst in de cel — niet in een vast aantal slots.** | opgenomen in `BR-01` en `BR-07` |
| **B11**-beeldvlak | "het voetbeeld van 350,1 × 525,5 met chevron 31,6/28,1" | **Een vlak dat niets draagt, bestaat niet.** Draagt het voetvlak geen inhoud die bij déze pagina hoort, dan is er geen voetvlak. | opgenomen in `BR-11` |

### 5.1.4 Vier V1.2-blauwdrukken verdwijnen als blauwdruk

| Verdwijnt | Reden, met meting | Waar het naartoe gaat |
|---|---|---|
| **B12** Spiegelband | Een spiegeling is geen tweede blauwdruk. `papiertest §9 toets 4`: **0 van 5** pagina's gebruikt hem, omdat `R6` één gespiegelde blauwdruk per pagina toestaat en die plek altijd naar `B06` gaat. | Oriëntatie-as van `BR-04`. |
| **B13** Kaartkolom zonder foto | Geblokkeerd door T-1; **0 van 5** gebruikt. | Dragervariant `D-V` van `BR-09`. |
| **B14** Paneel aan de linkerrand | Spiegeling van een verboden compositie; **0 van 5** gebruikt. | Oriëntatie-as van `BR-03`. |
| **B15** Bewijsregel zonder vlak | Variant A is verboden (§2.1/§2.2.1); **0 van 5** gebruikt, omdat `K7` altijd al in `B01` of `B03` meekwam. | Vlakrol binnen `BR-01`, `BR-03` en `BR-07`. |

Dat is dezelfde vier die V1.2 in de praktijk onbereikbaar maakte. Het signaal uit `papiertest §9 toets 4` ("vier op nul, drie op alle vijf") was dus geen gebruiksfout maar een structuurfout: **vier van de vijftien waren varianten, en een variant hoort een vrijheidsgraad te zijn, geen bibliotheekpost.**

---

## 5.2 · De herbouwde bibliotheek — dertien relaties

### 5.2.0 Hoe je een `BR` leest

```
VERPLICHT       de relatie zonder welke dit een andere blauwdruk is
OPTIONEEL       wat erbij mag, met de voorwaarde
ORIENTATIE      welke assen en spiegelingen toegestaan zijn, met de randvoorwaarde
DRAGER          D-F / D-O / D-V / D-0 — welke dragersoorten mogen
VLAKHIERARCHIE  H-OP / H-IN / H-NEST / H-KRUIS / H-NAAST
GEOMETRIE       welke GR-rollen, en hoeveel
CANVASMODUS     CANVAS / DOCUMENT / HYBRID
STUURMAAT       de ene maat die de uitvoering bepaalt, met bereik en met de minimale
                stap tussen twee pagina's die deze BR beide gebruiken (DELTA-BR)
CAPACITEIT      rekenprocedure, geen woordenaantal
VARIATIEBEREIK  wat op desktop mag verschillen zonder dat het een andere BR wordt
TERUGVAL        de verboden generieke uitvoering, met meetbare signatuur
TOETSEN         PASS / FAIL / N.V.T.-met-reden
```

**De DELTA-BR-regel, eenmalig.** Gebruiken twee pagina's dezelfde `BR`, dan verschillen hun stuurmaten met ten minste de opgegeven stap. Dit is de enige regel in het hele systeem die **twee pagina's tegen elkaar** legt; `papiertest §9 toets 2` meet dat nul van de 75 genummerde V1.2-regels dat doet. Alle DELTA-stappen hieronder zijn **AFGELEID MET MARGE, NIET ONAFHANKELIJK GEMETEN** → **DR-B-04**.

---

### `BR-01` · OPENENDE DRAGER — familie `C1`

| Veld | Inhoud |
|---|---|
| **VERPLICHT** | (1) één drager die het openingsvlak van rand tot rand vult op ten minste één as; (2) de propositie ligt als **laag ín** die drager (`H-IN`), niet ernaast; (3) de drager wordt door **precies één** `GR-RAND` tot vorm gemaakt; (4) de laag is smal ten opzichte van de drager: laag : drager ≤ 1 : 3. |
| **OPTIONEEL** | bewijs als aparte band **buiten** de drager, met het aantal cellen = het aantal onderbouwde items (2–4) en per cel een herkomstregel · een tweede tekstblok, uitsluitend op een **getekend** vlak, nooit op dragerpixels · een lichtband op exact dezelfde helling als de randovergang (dan is het geen tweede vorm maar licht op de eerste) |
| **ORIENTATIE** | laag links of rechts; randovergang naar beide zijden; drager boven de laag toegestaan in HYBRID. **Randvoorwaarde:** de buitenrand van de tekstlaag ligt in de gemeten margeband **31–84px** vanaf de schermrand (klasse B). Dit vervangt het spiegelverbod uit `DR-V-B2`. |
| **DRAGER** | `D-F` klasse A · `D-O` · `D-V`. **Niet** `D-F` klasse C: een klasse-C-beeld verliest in een volvlaksnede zijn onderwerp (`BEWIJS-assets §3`, harde regel). **Niet** `D-0`. |
| **VLAKHIERARCHIE** | `H-IN` verplicht · `H-NEST` toegestaan · `H-OP` toegestaan voor het tweede tekstblok · `H-NAAST` **verboden** |
| **GEOMETRIE** | 1 × `GR-RAND` verplicht. Tot 3 extra middelen toegestaan **mits** elk een rand of een punt met de eerste deelt; 4 gestapelde middelen is het gemeten maximum van Master v1 (klasse C) en wordt hier **geen** plafond maar een motiveringsplicht: elk middel boven het eerste verantwoordt zich met een gedeelde lijn. |
| **CANVASMODUS** | CANVAS (standaard) · HYBRID (drager boven, kolom onder) |
| **STUURMAAT** | **dragerbreedte in % vw**, bereik **60–100**. Gemeten ijkpunten: homepage **100** (klasse C), B2-kandidaat **44,2** (buiten bereik, en dat is het punt). **DELTA-BR ≥ 8 procentpunt.** |
| **CAPACITEIT** | Reken uit, kopieer niet. (1) kies de leesbreedte: 34–52ch; (2) kopgraad zodanig dat de kop over **2 of 3** regels valt binnen die breedte; (3) lead = het aantal regels dat past tussen de kop en de onderrand van de laag, maximaal 4; (4) 1 of 2 knoppen. Verboden: een woordenaantal uit Master v1 overnemen. |
| **VARIATIEBEREIK** | dragerbreedte 60–100% vw · laagzijde L/R · hoek van de randovergang binnen 31,6°–36,2° · bewijs 2–4 cellen of geen band · kopgraad vrij, mits A3 |
| **TERUGVAL — VERBODEN** | **"Afgeronde foto naast een kop in een container van ~1240px."** Meetbare signatuur: dragerbreedte ≤ 50% vw **én** 0 vlakken op de drager **én** `H-NAAST` **én** een paginabrede `max-width`. Dat is de gemeten B2-toestand (44,2% vw, 17 overlapparen, `max-width:var(--container-max)`). Tweede terugval: **een bewijsband van drie cellen die een vast aantal is in plaats van een telling** — signatuur: aantal cellen ≠ aantal onderbouwde items. |
| **TOETSEN** | (1) dragerbreedte in bereik → anders FAIL. (2) laag : drager ≤ 1:3 → anders FAIL. (3) `GR-RAND` aanwezig en de drager raakt daar de schermrand op 0,0px → ontbreekt de randovergang: FAIL. (4) bewijsband: aantal cellen = aantal onderbouwde items **en** elke cel draagt een herkomstverwijzing → geen onderbouwde items: **N.V.T.-met-reden "geen onderbouwd bewijs"**, en de band wordt niet gebouwd; een band met lege slots is FAIL. (5) beeldklasse: `D-F` is klasse A of B → klasse C of D: FAIL met de reden. (6) A7 (werkbreedte ≥ 80% vw op twee breedtes, niet dalend). |

**Uitwerking 1 — volvlaks, laag links, bewijsband van drie (CANVAS)**

```
x0                                                                           xVW
+-- DRAGER 100% vw, GR-RAND naar rechts ---------------------------------------+
| [ LAAG ]  breedte = drager/3,5                \                             |
|  eyebrow                                        \   D-F klasse A            |
|  kop 2-3 regels, handgezette regelval            \  H-IN: tekst in de drager |
|  lead 3 regels op 34-52ch                         \                         |
|  [ knop ] [ knop ]                                 \__ knik                 |
+-----------------------------------------------------------------------------+
| BEWIJS buiten de drager: 3 cellen = 3 onderbouwde items, 1px lijnen,        |
| per cel getal + label + herkomst                                            |
+-----------------------------------------------------------------------------+
```

**Uitwerking 2 — drager 64% vw rechts, laag rechts, bewijs vervallen (HYBRID)**

```
x0                        x36%                                               xVW
+---------------------------+--- DRAGER 64% vw, GR-RAND naar rechts ----------+
|                           | \                                              |
| [ LAAG buiten de drager ] |  \   D-O gebouwd object: de console IS het      |
|  eyebrow                  |   \  onderwerp; nul img; label Voorbeeldweergave|
|  kop 3 regels             |    \                                           |
|  lead 4 regels            |     \  [ klein apparaat kruist de rand H-KRUIS ]|
|  [ knop ]                 |      \                                         |
+---------------------------+------------------------------------------------+
  GEEN bewijsband: nul onderbouwde items -> N.V.T.-met-reden, niet gebouwd
  Dit is een OPENING ZONDER FOTO en lost DR-V-31 op (systeem-ems heeft er geen)
```

**Waarom dit een relatie is en geen sjabloon:** uitwerking 1 heeft dragerbreedte 100, uitwerking 2 heeft 64 (Δ 36 pp > 8), de laag staat in de één ín de drager en in de ander ernaast-maar-op-zijn-eigen-vlak, de dragersoort verschilt (`D-F` tegen `D-O`), en de bewijsband bestaat in de één en bestaat in de ander **niet** — niet als lege doos, maar als N.V.T.-met-reden.

---

### `BR-02` · ONGELIJKE VERZAMELING — familie `C2`

| Veld | Inhoud |
|---|---|
| **VERPLICHT** | (1) **één** item is aantoonbaar dominant: het draagt een eigen typografische graad **en** is ≥ 1,55× zo breed als het smalste item van zijn rij; (2) het aantal rijen is ≥ 2 **en** de rijen hebben verschillende kolomverdelingen; (3) elk item is één link met één bestemming. |
| **OPTIONEEL** | redactiekolom naast de verzameling (dan: kolom ≤ 35% van de sectiebreedte) · een afsluitende `D-0`-regelrij in die kolom · een statistiekregel, uitsluitend op het dominante item |
| **ORIENTATIE** | verzameling links of rechts · kolom boven of naast · rijen van gelijke hoogte of oplopend. **Randvoorwaarde:** de twee rijen verschillen in ≥ 1 verticale naad met ≥ 3% van de sectiebreedte (gemeten homepage 116 en 65,1px op 1774 = 6,5% en 3,7% — **BEREKEND**, klasse C als px, klasse B als percentage). |
| **DRAGER** | per item: `D-F` (foto tot alle vier de itemranden) · `D-V` (getekend vlak, als er geen foto is) · gemengd toegestaan. **Nooit** een plaatshouder (`C2`, `brandbook §4.4`). |
| **VLAKHIERARCHIE** | `H-NEST` verplicht (inhoud binnen het item) · `H-OP` verboden tussen items: geen item ligt op een ander · `H-NAAST` tussen items is hier normaal en geen terugval, omdat de ongelijkheid de compositie draagt |
| **GEOMETRIE** | 0 of 1. Eén `GR-SNEDE`, en **uitsluitend** op een item met dragersoort `D-V`. De sectie zelf blijft ongesneden. |
| **CANVASMODUS** | HYBRID (standaard) · DOCUMENT toegestaan als alle dragers `D-V` zijn en de verzameling binnen de leesbreedte blijft |
| **STUURMAAT** | **max/min van de breedste rij**, bereik **≥ 1,55** (gemeten 1,61 en 1,668) **of** exact ≤ 1,06 bij een bewust gelijke `D-0`-rij. De zone 1,06 < x < 1,55 is **verboden** (`card GRENS 3`; B2-kandidaat zit er tweemaal in met 1,459 en 1,110). **DELTA-BR ≥ 0,15.** |
| **CAPACITEIT** | **3 tot 6 items.** Drie is toegestaan — dit herstelt `papiertest §8.6 T-2` — **mits** max/min ≥ 1,55 óf de drie items dragersoort `D-0` hebben. Reden, gemeten: `card §` noteert dat familie K8 gelijk **mag** zijn omdat er geen vlak is, en dat 4 van de 5 K8-rijen van Master v1 exact gelijk van breedte zijn. Per item: kop van 1–2 regels binnen 34–52ch, berekend uit de itembreedte; één onderregel. |
| **VARIATIEBEREIK** | 3–6 items · 2–3 rijen · dominant item in elke hoek · dragersoorten gemengd · kolom aanwezig of niet |
| **TERUGVAL — VERBODEN** | **"n gelijke tegels in een n×m-raster."** Meetbare signatuur: max/min van elke rij < 1,06 **terwijl** de items een vlak hebben (dus niet `D-0`), **of** twee rijen met identieke kolomverdeling, **of** alle items op dezelfde typografische graad. Gemeten in de B2-kandidaat: drie kolommen van 246 / 255 / 252px = 0,8% onderling verschil. Tweede terugval: **n identieke getekende vlakken** — zijn er ≥ 3 `D-V`-items, dan dragen ze ≥ 2 verschillende hoekwaarden en ≥ 2 verschillende vlakstructuren; n keer hetzelfde 25°-vlak is FAIL. → **DR-B-05** |
| **TOETSEN** | (1) stuurmaat in bereik of exact ≤ 1,06 met `D-0` → anders FAIL. (2) exact één item heeft een eigen graad → nul of twee: FAIL. (3) de rijen verschillen ≥ 3% van de sectiebreedte in ≥ 1 naad → anders FAIL. (4) bij `D-F`: elk beeld raakt alle vier de itemranden. (5) bij `D-V` ≥ 3: ≥ 2 hoekwaarden én ≥ 2 vlakstructuren → anders FAIL. (6) nul plaatshouders: een leeg beeldslot is FAIL, niet N.V.T. |

**Uitwerking 1 — zes items, twee rijen, kolom links, gemengde dragers (HYBRID)**

```
|<-- KOLOM 31% -->|<------------------ VERZAMELING 69% ---------------------->|
 eyebrow          | [ DOMINANT D-F ] [ item D-F ] [ item D-V 25 gr ]   rij 1 h
 kop 3 regels     |   eigen graad      naad a          naad b          hoog
 lead op 42ch     |---------------------------------------------------------- |
 [ CTA ]          | [ item D-V 18 gr ] [ item D-F ] [ item D-V 31 gr ] rij 2 |
 D-0 regelrij x3  |   naden verspringen t.o.v. rij 1 met >= 3% sectiebreedte  |
                  \__ max/min rij 1 = 1,61   rijhoogteverhouding 2,17
```

**Uitwerking 2 — drie items, één rij, geen kolom, alle dragers `D-0` (DOCUMENT)**

```
|<------------------- VERZAMELING binnen de leesbreedte --------------------->|
 kop 2 regels, daaronder een 1px lijn
 [ item 1 D-0 ] [ item 2 D-0 ] [ item 3 D-0 ]
   icoon+label     icoon+label     icoon+label      geen vlak, geen schaduw
   breedtes gelijk: max/min = 1,00 <= 1,06  -> TOEGESTAAN, want D-0
   dominantie zit in de graad van item 1, niet in zijn breedte
 Dit is de enige vorm waarin DRIE items mogen, en hij lost T-2 op zonder foto's
```

**Waarom dit een relatie is:** de ene uitwerking heeft zes items met een breedteverhouding van 1,61 en vlakken; de andere heeft er drie met verhouding 1,00 en géén vlakken. Beide halen dezelfde verplichte relatie ("één item is dominant"), met tegengestelde middelen: de één via breedte, de ander via graad.

---

### `BR-03` · DOORLOPENDE DRAGER MET AANGEHECHT BEWIJS — familie `C3`

*Principe uit `B03`: dominant projectbeeld + aangehecht bewijsvlak + ondergeschikte projectnavigatie.*

| Veld | Inhoud |
|---|---|
| **VERPLICHT** | (1) **één** onderwerp per drager, en de drager loopt naar **exact één** schermrand door; (2) de tekst staat **ín** de drager (`H-IN`) in het donkerste deel van een scrim die vanaf de leeszijde opbouwt; (3) een **aangehecht bewijsvlak** ín de drager: 2–4 cellen met 1px scheidingen, breedtes **contentgedreven ongelijk**; (4) de uitgang is **ondergeschikt**: ten hoogste 1 knop + 1 tekstlink, en de sectie draagt daarmee de laagste linkdichtheid van de pagina. |
| **OPTIONEEL** | een statement in gewicht 400 tussen kop en body · een radiale aankondiging boven de drager · een `GR-RAND`-wig die de vorm op elke schaal vasthoudt (SVG met `preserveAspectRatio="none"` is de aanbevolen route, want die schaalt met de drager) |
| **ORIENTATIE** | drager loopt naar links **of** naar rechts door; tekst aan de doorlopende zijde of aan de margezijde; radius uitsluitend aan de kant die de containermarge raakt. **Randvoorwaarde die `B14` vervangt:** de buitenrand van de tekstkolom ligt in de margeband **31–84px** vanaf de schermrand. Dat is géén spiegeling van de 80,4px-inzet maar een eigen berekening, en daarmee is `DR-V-B2` opgelost: spiegelen mag, letterlijk mee-spiegelen van de inzet niet. |
| **DRAGER** | `D-F` klasse A verplicht bij een projectclaim: een geleend beeld maakt de drager een claim zonder dekking (`C3`). `D-V` toegestaan **mits** het onderwerp geen gerealiseerd project is. **Nooit** klasse C of D. |
| **VLAKHIERARCHIE** | `H-IN` verplicht · `H-NEST` voor de bewijscellen · `H-OP` verboden (geen zwevende kaart op dit vlak; dan is het `BR-04` of `BR-09`) |
| **GEOMETRIE** | tot 3 middelen (ankerrol), die alle een rand of punt met elkaar delen. Ten minste 1 × `GR-RAND`. |
| **CANVASMODUS** | CANVAS |
| **STUURMAAT** | **dragerbreedte in % vw**, bereik **70–100**. Gemeten ijkpunt 96,1 (klasse C). **DELTA-BR ≥ 6 procentpunt.** |
| **CAPACITEIT** | kop: 1–2 regels, **berekend** uit de kolombreedte bij 34–52ch — niet "≤ 2 woorden", want dat was de maatlijst van één projectnaam (`kritiek-overfitting §2.1`: *"een tweede project met een langere naam haalt ≤ 2 woorden / 1 regel niet"*). Body: het aantal regels dat past tussen statement en bewijsvlak, maximaal 4. Bewijs: **2–4** cellen, elk één regel, elk met herkomst. |
| **VARIATIEBEREIK** | dragerbreedte 70–100% vw · doorlopende zijde L/R · 2–4 bewijscellen · met of zonder statement · tekstkolom 20–32% van de dragerbreedte (gemeten 27,1%) |
| **TERUGVAL — VERBODEN** | **"Een brede foto met een kop erboven en drie witte tegels eronder."** Meetbare signatuur: bewijscellen **buiten** de drager **en** gelijk van breedte **en** `H-NAAST`. Tweede terugval: **radius aan alle vier de hoeken** — dan is de eenzijdige doorloop vervallen en is de drager een plaatje in een container. Derde: **twee onderwerpen in één drager** — signatuur: 2 koppen of 2 projectnamen in hetzelfde vlak. |
| **TOETSEN** | (1) de drager raakt **exact één** schermrand met overschrijding 0,0px, en heeft radius 0 aan die zijde → twee randen of radius rondom: FAIL. (2) de tekst valt volledig binnen het massieve deel van de scrim; het contrast is **gemeten** → niet gemeten: FAIL (dit sluit `blueprints §7`, dat contrast uitdrukkelijk niet meette). (3) 2–4 bewijscellen, ongelijk met ≥ 15% tussen breedste en smalste (gemeten 139,1 ÷ 110,1 = 1,26) **en** elke cel draagt herkomst → geen herkomstveld: FAIL. Dit sluit `DR-V-39` (645 kWh op drie pagina's aan twee projecten). (4) papier boven én onder de drager ≥ 10% van de dragerhoogte (gemeten 100 op 565 = 17,7% — **BEREKEND**). (5) beeldklasse A → anders FAIL met reden. |

**Uitwerking 1 — drager naar rechts, tekst links, 3 cellen (CANVAS)**

```
x0   marge                                                                   xVW
|    |===== DRAGER 96% vw, loopt naar de RECHTER schermrand ==================|
|    | radius alleen links; scrim vanaf links: massief 0-20%, nul op 70%      |
|    | [ eyebrow / kop 1 regel / statement 400 / body 3 regels ]              |
|    | [ cel 110 | cel 131 | cel 139 ]  ongelijk, 1px lijnen, herkomst per cel |
|    | [ knop ] [ tekstlink ]                      GR-RAND wig 35,9 gr ----->  |
|    |=======================================================================|
  >= 10% van de dragerhoogte papier boven EN onder
```

**Uitwerking 2 — drager naar links, tekst rechts, 2 cellen, drager 74% vw (CANVAS)**

```
x0                                              x74%            marge 31-84  xVW
|===== DRAGER 74% vw, loopt naar de LINKER schermrand ====|                   |
| radius alleen rechts; scrim vanaf rechts                | [ eyebrow      ]  |
| onderwerp staat links in het frame, object-position      | [ kop 2 regels ]  |
| expliciet gekozen en verantwoord                         | [ body 4 regels] |
|                                        [ cel 41% | 59% ] | [ knop ]         |
|=========================================================|                   |
  tekstkolom BUITEN de drager: toegestaan, want H-IN geldt voor de cellen;
  de buitenrand van de kolom ligt op 31-84px van de schermrand (margeregel)
  stuurmaat 74 tegen 96 = 22 pp verschil, ruim boven DELTA-BR 6
```

---

### `BR-04` · GEDRAGEN BAND MET KRUISEND VLAK — familie `C4`

| Veld | Inhoud |
|---|---|
| **VERPLICHT** | (1) een **liggende** drager met ratio ≥ 3,0; (2) **precies één** vlak dat die drager kruist, met een **gemeten** overschrijdingswaarde óf een rand die op de pixel samenvalt — niets ertussenin; (3) een ondergrond (`GR-GROND`) die de drager **draagt** en niet snijdt, en die aan ten minste één zijde de schermrand uitloopt. |
| **OPTIONEEL** | geen uitgang (deze relatie mag zonder CTA bestaan; gemeten 0 `<a>` in de hele sectie) · een begeleidende `D-0`-reeks eronder (dan ontstaat het toegestane paar `BR-04 → BR-05`) |
| **ORIENTATIE** | drager links of rechts; het kruisende vlak naar binnen of naar buiten. **Randvoorwaarde:** kruist het vlak naar buiten, dan blijft het ≥ 10px van de schermrand; kruist het naar binnen, dan houdt het ≥ 150px lucht tot de tekstkolom. Dit maakt de voormalige `B12` een oriëntatiekeuze. |
| **DRAGER** | `D-F` klasse A of B (een dronefoto overleeft een verticale snede tot ~55%; `BEWIJS-assets §2`) · `D-V`. **Niet** klasse C: ratio ≥ 3,0 vraagt 55–59% hoogteverlies en dat verliest het onderwerp van een grondfoto. |
| **VLAKHIERARCHIE** | `H-KRUIS` verplicht · `H-OP` voor de rest van het vlak · scrim **verboden** zolang alles wat op de drager ligt dekkend is |
| **GEOMETRIE** | precies 1 × `GR-GROND`. De diagonaal ligt in de **ondergrond**, nooit in de drager. |
| **CANVASMODUS** | HYBRID (standaard) · CANVAS als de ondergrond de volle sectiebreedte vult |
| **STUURMAAT** | **dragerbreedte in % vw**, bereik **44–62**. Gemeten ijkpunt 53,9; `image §6-C` geeft zelf toe dat de band 50–56 *"om die meting heen is gelegd met ±2 punten en dus niet onafhankelijk gemeten"* — ik verruim daarom bewust naar 44–62 en noteer het als **AFGELEID MET MARGE**. **DELTA-BR ≥ 6 procentpunt.** |
| **CAPACITEIT** | kop 2 regels binnen 34–52ch, berekend uit de kolombreedte · lead 2–3 regels · kruisend vlak: 1 icoon + wat op 2 regels kop plus 3 regels body past binnen zijn breedte. Verboden: "≤ 17 woorden" overnemen; dat is de telling van één kaart. |
| **VARIATIEBEREIK** | dragerbreedte 44–62% vw · zijde L/R · overschrijding 40–60px of exacte randdeling · ondergrondhoek binnen 31,6°–36,2° · met of zonder CTA |
| **TERUGVAL — VERBODEN** | **"Tekst links, plaatje rechts, 50/50."** Meetbare signatuur: lichtste zijde 46–54% **én** nul kruisende vlakken **én** ratio < 2,0. Gemeten in de B2-kandidaat: **zes** splitsingen binnen 4 procentpunt van half-half, twaalf keer dezelfde inhoudsbox, 5 secties zonder overlap. Tweede terugval: **het vlak "ergens op" de drager** zonder gedeelde maat — signatuur: de overschrijding is niet opgeschreven en niet te herleiden. |
| **TOETSEN** | (1) ratio ≥ 3,0 → anders FAIL. (2) exact 1 kruisend vlak; ≥ 80% van zijn breedte ligt op de drager → 0 vlakken: FAIL (niet N.V.T., want de relatie eist er één); ≥ 2: dit is `BR-09`, FAIL met de doorverwijzing. (3) de overschrijding is **gemeten en opgeschreven**, en de code zegt niet iets anders dan er staat → een notitie die de bouw tegenspreekt is FAIL. Dit sluit `DR-V-B1` (55,8px gemeten tegen `home-process.css:118` "rechterrand gelijk aan de foto"). (4) de diagonaal zit in de ondergrond → in de drager: FAIL. (5) nul scrim zolang alles erop dekkend is. |

**Uitwerking 1 — drager rechts 53,9% vw, vlak kruist naar buiten (HYBRID)**

```
|<-- KOLOM 27% -->|<-->|===== DRAGER 53,9% vw, ratio 3,26, radius 14 ========|   |
 eyebrow                |                        [ VLAK kruist NAAR BUITEN ] -->|
 kop 2 regels           |                          83,5% op de drager          |
 lead 2 regels          |                          >= 10px van de schermrand   |
 geen CTA               |======================================================|
 \_ GR-GROND 33,7 gr op z0, loopt 49px boven en 13px onder de drager uit
```

**Uitwerking 2 — drager links 46% vw, vlak kruist naar binnen, met reeks eronder (CANVAS)**

```
|===== DRAGER 46% vw, ratio 3,10 ============|  <-- 150 -->  |<-- KOLOM 30% -->|
|            [ VLAK kruist NAAR BINNEN ]     |               | eyebrow         |
|              deelt de ONDERrand exact      |               | kop 3 regels    |
|============================================|               | lead 3 regels   |
 \_ GR-GROND gespiegeld: 33,7 gr van rechtsonder naar linksboven
 [ reeks stap 1 ] > [ stap 2 ] > [ stap 3 ]   <- BR-05 eronder, toegestaan paar
 stuurmaat 46 tegen 53,9 = 7,9 pp, boven DELTA-BR 6
```

---

### `BR-05` · GERICHTE REEKS ZONDER VLAK — familie `C5`

*Principe uit `B05` (HOMEPAGE-ONLY): richting zonder vlak.*

| Veld | Inhoud |
|---|---|
| **VERPLICHT** | (1) 3–5 stappen met een **gelijke steek** (afwijking < 1px) en gelijke breedte; (2) **nul** kaartvlakken, nul randen, nul schaduwen — de ongelijkheid zit in de volgorde, niet in de vorm; (3) de reeks is aantoonbaar breder dan de begeleidende tekst: reeksbreedte ≥ 2,0 × de breedte van de lead in dezelfde sectie; (4) een richtingsmarkering tussen de stappen die **per stap verschilt** of één doorlopende richting aangeeft. |
| **OPTIONEEL** | een genummerde badge per stap · een expliciet leegte-element met `aria-hidden` en een gemeten hoogte eronder · nul links (toegestaan en aanbevolen) |
| **ORIENTATIE** | horizontaal (desktop) · verticaal met een doorlopende lijn (mobiel, en toegestaan op desktop in DOCUMENT MODE) · richting L→R of boven→onder |
| **DRAGER** | `D-0` verplicht. Elke andere dragersoort maakt dit `BR-02`. |
| **VLAKHIERARCHIE** | geen. Dit is de enige relatie zonder vlakhiërarchie, en dat is haar functie. |
| **GEOMETRIE** | **0**. De richtingsmarkering is iconografie, geen geometrie. Deelt de reeks een sectie met `BR-04`, dan draagt `BR-04` het ene toegestane middel. |
| **CANVASMODUS** | CANVAS · DOCUMENT (verticaal) |
| **STUURMAAT** | **reeksbreedte ÷ leadbreedte**, bereik **≥ 2,0**. Gemeten ijkpunt: 1584 ÷ 474 = **3,34** (**BEREKEND** uit twee klasse-C-maten). **DELTA-BR ≥ 0,4.** |
| **CAPACITEIT** | 3–5 stappen. Per stap: kop van 1 regel + toelichting van het aantal regels dat past binnen de stapbreedte bij 34–52ch, maximaal 3. Verboden: "9 tot 11 woorden" overnemen. |
| **VARIATIEBEREIK** | 3, 4 of 5 stappen · horizontaal of verticaal · met of zonder badge · met of zonder leegte-element · graadval binnen de sectie vrij, mits A3 |
| **TERUGVAL — VERBODEN** | **"Vier witte kaarten met schaduw naast elkaar."** Meetbare signatuur: ≥ 1 stap heeft een achtergrondvlak, rand of schaduw. Tweede terugval: **een voortgangsbalk die op elke stap even lang is** — signatuur: de markering heeft dezelfde lengte bij elke stap; dan is het decoratie, geen markering. Derde: **meer dan 5 stappen** — dan is het een raster en gelden de regels van `BR-02`. |
| **TOETSEN** | (1) steken onderling < 1px verschil → anders FAIL. (2) nul vlakken, nul randen, nul schaduwen op de stappen → ≥ 1: FAIL. (3) reeksbreedte ÷ leadbreedte ≥ 2,0 → is er geen lead in de sectie: **N.V.T.-met-reden "geen begeleidende lead"**, en dan geldt reeksbreedte ≥ 75% vw. (4) de richtingsmarkering verschilt per stap of is doorlopend → identieke segmenten: FAIL. (5) 0 of 1 link in het blok. |

**Uitwerking 1 — vier stappen horizontaal, chevrons, leegte-element (CANVAS)**

```
|<------------------- REEKS >= 75% vw, steek gelijk <1px --------------------->|
[ stap 1 ] >  [ stap 2 ] >  [ stap 3 ] >  [ stap 4 ]
 badge+kop     badge+kop     badge+kop     badge+kop     geen vlak, geen rand
 2 regels      2 regels      2 regels      2 regels
|<-- leegte-element met gemeten hoogte en aria-hidden ---------------------->|
 reeks 1584 / lead 474 = 3,34
```

**Uitwerking 2 — drie stappen verticaal met doorlopende lijn (DOCUMENT)**

```
|<---- leesbreedte 34-52ch ---->|
| o--- stap 1 kop               |   doorlopende 2px lijn ALS richting
| |    1 regel toelichting      |   (de markering is niet per segment gelijk:
| o--- stap 2 kop               |    de lijn loopt door, er is er maar een)
| |    1 regel                  |
| o--- stap 3 kop               |   3 stappen i.p.v. 4
| |    2 regels                 |   geen lead in deze sectie
|                               |   -> toets 3 = N.V.T.-met-reden, reeks = 100%
                                     van de leeskolom
```

---

### `BR-06` · GEBOUWD ONDERWERP — familie `C6`

*Principe uit `B06` (HOMEPAGE-ONLY): een gebouwd onderwerp vervangt de ontbrekende fotografie en is zélf de boodschap.*

| Veld | Inhoud |
|---|---|
| **VERPLICHT** | (1) **nul** `img` in de sectie; (2) het object is het onderwerp, niet een illustratie: objectbreedte ≥ 40% vw; (3) een **hoofdvlak** plus **één** kleiner vlak dat aan de **buitenzijde** staat, het hoofdvlak met een gemeten waarde overlapt en er verticaal volledig in valt; (4) elk getal in het object is elders op de site gepubliceerd, en een zichtbaar label benoemt het als voorbeeldweergave. |
| **OPTIONEEL** | een `D-0`-kenmerkenrij naast of onder het object · een nauwelijks zichtbare `GR-SNEDE` als schaduwvlak achter de apparaten · animatie, uitsluitend via `IntersectionObserver` en volledig uit onder `prefers-reduced-motion` |
| **ORIENTATIE** | object links of rechts; object boven de tekst toegestaan. **Randvoorwaarde:** ≥ 5% van de sectiebreedte leeg tussen object en tekstkolom (gemeten 92,7 op 1774 = 5,2% — **BEREKEND**). Deze relatie is daarmee **niet** "de gespiegelde": spiegeling is hier een as, geen identiteit, en `R6` ("ten hoogste één gespiegelde blauwdruk per pagina") vervalt — die regel bestond alleen omdat Master v1 er één had. |
| **DRAGER** | `D-O` verplicht. |
| **VLAKHIERARCHIE** | `H-KRUIS` tussen de twee apparaatvlakken · `H-NEST` binnen het object · `H-OP` verboden boven het object (een kaart op een gebouwd object leest als een tweede interface) |
| **GEOMETRIE** | 0 of 1, en bij voorkeur bijna onzichtbaar. De vormtaal zit in het **diagram**, niet in de snede. |
| **CANVASMODUS** | CANVAS · HYBRID |
| **STUURMAAT** | **object : tekstkolom**, bereik **1,0–1,6**. Gemeten ijkpunt 1,12 — de dichtste verhouding van Master v1. **DELTA-BR ≥ 0,15.** |
| **CAPACITEIT** | Binnen het object: ≥ 1 hoofdweergave, ≥ 1 secundair vlak, en zoveel elementen als **elders gepubliceerd** zijn. Verboden: "minimaal 3 waardetegels + 9 knopen + 1 hub" — dat is de inventaris van één diagram, verheven tot ondergrens (`kritiek-overfitting §2.1`), en hij sluit elk product met vier assets buiten. Naast het object: kop 2 regels, lead 3–4 regels, 3–5 kenmerken. |
| **VARIATIEBEREIK** | objectbreedte 40–60% vw · zijde L/R · object boven of naast · 3–5 kenmerken · aantal elementen in het object vrij, begrensd door wat gepubliceerd is |
| **TERUGVAL — VERBODEN** | **"Een stockmockup of laptopdeksel om een screenshot."** Meetbare signatuur: een frame-asset, een dekselschaduw, of een `img` in de sectie. Tweede terugval: **verzonnen cijfers in de interface** — signatuur: een waarde in het object die nergens anders op de site staat. Derde: **een diagram < 40% vw** — dan is het een illustratie naast tekst en verliest het de rol van onderwerp. |
| **TOETSEN** | (1) nul `img` in de sectie → ≥ 1: FAIL. (2) objectbreedte ≥ 40% vw. (3) het kleine vlak staat aan de buitenzijde, overlapt met een **gemeten** waarde en valt verticaal volledig in het grote → niet gemeten: FAIL. (4) elk getal in het object is elders gepubliceerd; de vindplaats is opgeschreven → geen vindplaats: FAIL (`brandbook §1A.7`, `REMOVE/REWRITE REQUIRED`). (5) het voorbeeldweergave-label is zichtbaar in de figuur → anders FAIL. (6) de kleinste letter in het object draagt geen informatie die niet ook in de tekstkolom staat. |

**Uitwerking 1 — object links 46% vw, kenmerken rechts (CANVAS)**

```
|<---- OBJECT 46% vw ---->| <-5%-> |<------ KOLOM 41% vw ------>|
 [ klein vlak, BUITEN ]            eyebrow
   overlapt met gemeten waarde     kop 2 regels
   valt verticaal volledig in      lead 4 regels
     [ HOOFDVLAK ]                 [ kenmerk ][ kenmerk ]
       rail | hoofdveld            [ kenmerk ][ kenmerk ]
       3 tegels | stroomschema     [ knop ]  <- kleinste knop van de pagina
 label "Voorbeeldweergave" zichtbaar in de figuur
 object : tekst = 1,12
```

**Uitwerking 2 — object boven, breed 58% vw, kenmerken in drie kolommen eronder (HYBRID)**

```
|<------------------- OBJECT 58% vw, gecentreerd ------------------->|
|  [ HOOFDVLAK: 4 assets, geen 9 knopen ]  [ klein vlak RECHTSBUITEN ]|
|   alle vier de waarden staan ook op systeem-ems.html               |
|   label "Voorbeeldweergave" in de figuur                            |
+--------------------------------------------------------------------+
 kop 3 regels over de volle leesbreedte
 [ kenmerk 1 ] [ kenmerk 2 ] [ kenmerk 3 ]       object : tekst = 1,45
 Dit is de OPENING van een pagina zonder productfoto: geen B01 nodig,
 en daarmee is DR-V-31 opgelost zonder B2 een gereduceerde opening te geven
```

---

### `BR-07` · BEWIJS NAAR MAAT — familie `C7`

| Veld | Inhoud |
|---|---|
| **VERPLICHT** | (1) het **aantal kolommen is gelijk aan het aantal onderbouwde items**, nooit een vast getal; (2) de bandhoogte is aantoonbaar **teruggebracht** tot de inhoud hem vult, en de verlaging is opgeschreven met haar reden; (3) de leegte in het midden blijft leeg: ≥ 20% van de bandbreedte aaneengesloten leeg bij 2 items; (4) elk item draagt een naam **plus** één contextregel, en valt onder de claimpolicy. |
| **OPTIONEEL** | één tekstlink rechts onder de rij, die op mobiel mag vervallen · één `GR-VRIJ`, en alleen als het quotum `floor(secties ÷ 9)` ≥ 1 is · een klein dekkend logo of duimnagel binnen een item |
| **ORIENTATIE** | kop links, bewijs rechts · gespiegeld · kop boven, bewijs onder (dan vervalt de middenleegte-eis en geldt: bandhoogte ≤ 20% van de sectiehoogte) |
| **DRAGER** | `D-0` voor de band · optioneel een klein `D-F` binnen een item |
| **VLAKHIERARCHIE** | `H-NAAST` toegestaan — dit is naast `BR-05` en `BR-12` de derde relatie waar geen vlak op een drager hoeft te liggen, en de reden is dat de band zelf geen drager is · `H-OP` verboden: geen item ligt op een ander |
| **GEOMETRIE** | 0 of 1 × `GR-VRIJ`, met het quotum uit §5.0.4. Op een pagina van 6 secties is dat **0**. |
| **CANVASMODUS** | HYBRID · DOCUMENT |
| **STUURMAAT** | **aaneengesloten leegte ÷ bandbreedte**, bereik **≥ 0,20** bij 2 items, **≥ 0,10** bij 3–4. Gemeten ijkpunt 507,4 ÷ 1620 = **0,313** (**BEREKEND**). **DELTA-BR ≥ 0,06.** |
| **CAPACITEIT** | **2 tot 4 items.** Per item: naam + één contextregel. Bij 0 onderbouwde items: de band bestaat niet. Bij ≥ 5: dit is `BR-02` en de regels van `BR-02` gelden. |
| **VARIATIEBEREIK** | 2–4 items · kop links/rechts/boven · bandhoogte vrij, mits de verlaging is opgeschreven · met of zonder tekstlink |
| **TERUGVAL — VERBODEN** | **"Zes grijze logoslots."** Meetbare signatuur: aantal kolommen > aantal onderbouwde items; dat leest als niet-geladen logo's. Tweede terugval: **het midden opvullen omdat het leeg is** — signatuur: aaneengesloten leegte < 10% bij 2 items. Derde: **de band als vulling tussen twee zware secties**, waarvoor `BR-05` bestaat — signatuur: de band staat tussen twee secties met impact HIGH en draagt zelf 0 items. |
| **TOETSEN** | (1) aantal kolommen = aantal onderbouwde items → anders FAIL. (2) nul items → **N.V.T.-met-reden "geen onderbouwd bewijs"**, en de band wordt niet gebouwd; een gebouwde band met nul items is FAIL. (3) de verlaging van de bandhoogte is opgeschreven met de reden → geen verlaging opgeschreven: FAIL. Dit is het antwoord op `DR-V-B5`: niet een getal, maar een vastgelegd proces, en de toets is dat het proces er is. (4) stuurmaat in bereik. (5) nul overlap binnen de band. (6) elke naam valt onder `brandbook §1A.7`; de status staat erbij → geen status: FAIL. |

**Uitwerking 1 — kop links, twee items rechts, leeg midden (HYBRID)**

```
|<-- KOP 35% -->|<------- 31% AANEENGESLOTEN LEEG ------->|<-- BEWIJS 28% -->|
 eyebrow                                                   [ item A, 281 br ]
 kop 2 regels                                              [ item B, 189 br ]
                                                           ongelijk omdat de
                                                           NAMEN ongelijk zijn
                                          [ tekstlink, mag op mobiel vervallen ]
 bandhoogte teruggebracht van 17,7 naar 13,6cqw, reden opgeschreven
 GR-VRIJ: quotum floor(9/9) = 1 -> een vrijstaande wig is toegestaan
```

**Uitwerking 2 — kop boven, vier items onder, geen middenleegte-eis (DOCUMENT)**

```
|<------------------------ leesbreedte ------------------------>|
 kop 2 regels
 [ item 1 ] [ item 2 ] [ item 3 ] [ item 4 ]
  naam        naam       naam       naam        4 kolommen = 4 onderbouwde items
  context     context    context    context     elk met claimstatus VERIFIED
 bandhoogte 18% van de sectiehoogte
 GR-VRIJ: pagina heeft 6 secties -> quotum floor(6/9) = 0 -> GEEN versiering
 stuurmaat n.v.t. bij kop-boven; in plaats daarvan bandhoogte <= 20%
```

---

### `BR-08` · DRIE REGISTERS OP EEN DRAGER — familie `C8`

| Veld | Inhoud |
|---|---|
| **VERPLICHT** | (1) **drie** registers over één onderwerp: verhaal (tekst), resultaat (vlak met cijfers), identiteit (strook met de naam); (2) **geen schone kolomnaad** — ten minste twee van de drie zones overlappen elkaar met een gemeten waarde; (3) de drager draagt een `GR-SNEDE` uit de **flauwe** familie precies daar waar de tekstkolom eroverheen loopt; (4) de strook ligt **100% binnen** de dragerdoos in beide assen en raakt geen enkele vlakrand. |
| **OPTIONEEL** | een duimnagel binnen de strook · één knop buiten de leesvolgorde, zodat hij op mobiel niet tussen case en bewijs valt · een tweede koppenniveau, 5–6px kleiner dan de sectiekop |
| **ORIENTATIE** | verhaal links of rechts · drager midden-rechts of midden-links · resultaatvlak aan de buitenzijde of op de drager. **Randvoorwaarde:** het resultaatvlak overlapt de drager met **5–12%** van zijn eigen breedte (gemeten 9,4%) — een gemeten overlapwaarde in plaats van een gedeelde rand. |
| **DRAGER** | `D-F` klasse A of B · `D-V` (dan is de `GR-SNEDE` de snede van het getekende vlak zelf, en de luminantie onder elk vlak is **gemeten**) |
| **VLAKHIERARCHIE** | `H-OP` × 2 verplicht (resultaatvlak en strook) · `H-NEST` binnen de vlakken · scrim **verboden** zolang alles wat erop ligt dekkend is |
| **GEOMETRIE** | precies 1 × `GR-SNEDE`, flauw (≤ 15°). Een `GR-VRIJ` in dezelfde sectie telt bij `BR-07`, niet hier. |
| **CANVASMODUS** | HYBRID |
| **STUURMAAT** | **dragerbreedte in % vw**, bereik **32–55**. Gemeten ijkpunt 41,4. **DELTA-BR ≥ 5 procentpunt.** |
| **CAPACITEIT** | verhaalkop: regels berekend uit de kolombreedte bij 34–52ch · verhaal: 3–5 regels · resultaatvlak: één resultaatregel + **≤ 4** cijfers (het enige inhoudsplafond dat ik overneem, omdat het een **verhouding tot de leesbaarheid** is en niet een maat) · strook: eyebrow + naam + één specregel. |
| **VARIATIEBEREIK** | dragerbreedte 32–55% vw · zijde L/R · overlap 5–12% · drager `D-F` of `D-V` · met of zonder duimnagel |
| **TERUGVAL — VERBODEN** | **"Een citaatblok naast een foto."** Meetbare signatuur: drie zones met schone kolomnaden (nul overlap), of een resultaatvlak dat de drager niet raakt. Tweede terugval: **een verzonnen testimonial** — een citaat dat niet bestaat wordt een resultaatbeschrijving in derde persoon, nooit een leeg citaatblok. Derde: **de scherpe merkhoek gebruiken waar de tekstkolom het vlak raakt** — daar hoort de flauwe snede. |
| **TOETSEN** | (1) drie registers aanwezig → twee: FAIL met de reden welk register mist. (2) ≥ 2 van de 3 zones overlappen met een gemeten waarde. (3) de snede is ≤ 15° waar een tekstkolom de drager raakt → scherp: FAIL. (4) de strook ligt 100% binnen de dragerdoos in **beide** assen. (5) ≤ 4 cijfers in het resultaatvlak. (6) bij `D-V`: de luminantie onder elk vlak is gemeten → niet gemeten: FAIL. |

**Uitwerking 1 — verhaal links, fotodrager 41% vw, resultaatvlak rechtsbuiten (HYBRID)**

```
|<-- VERHAAL 30% -->|
 eyebrow        |<->|   overlap 62px: de SNEDE haalt het beeld hier weg
 kop 3 regels   |====== DRAGER D-F 41% vw, GR-SNEDE 13 gr ======|
 verhaal 3 reg  |                                               |
 [ knop ]       |                        [ RESULTAATVLAK, 9,4% op de drager ]
                |  [ STROOK 100% binnen de dragerdoos, raakt geen rand ]
                |===============================================|
```

**Uitwerking 2 — verhaal rechts, getekende drager 52% vw, resultaatvlak op de drager (HYBRID)**

```
|===== DRAGER D-V 52% vw, GR-SNEDE 11 gr, luminantie GEMETEN =====|  |<- VERHAAL ->|
|  [ RESULTAATVLAK ligt 100% OP de drager ]                       |   eyebrow
|      luminantie onder het vlak 0,07 (gemeten) <= 0,14           |   kop 2 regels
|  [ STROOK met duimnagel, 100% binnen de doos ]                  |   verhaal 5 reg
|=================================================================|   [ knop ]
 geen foto nodig: dit is de uitvoering voor project-ratio-16,
 dat EEN beeldbestand heeft en het al in de opening gebruikt
 stuurmaat 52 tegen 41 = 11 pp, boven DELTA-BR 5
```

---

### `BR-09` · BESTEMMINGENKOLOM OP EEN DRAGER — familie `C9`

*Hier zijn `B09` en `B13` één relatie geworden; dat lost `papiertest §8.6 T-1` op.*

| Veld | Inhoud |
|---|---|
| **VERPLICHT** | (1) 3–4 **gelijke** vlakken, verticaal gestapeld, die **100%** binnen de drager vallen; (2) een richtingsverloop onder de kolom, zodat de vlakken een veld hebben en niet zweven; (3) de **gemeten** achtergrondluminantie onder elk vlak ≤ **0,14**; (4) onder het laatste vlak blijft drager vrij: ≥ 10% van de dragerhoogte; (5) de tekstkolom heeft één rechte rand: kop, lead en lijst delen dezelfde breedte op de pixel. |
| **OPTIONEEL** | een `D-0`-regelrij in de tekstkolom · één knop plus één tekstlink · een naad tussen tekstkolom en drager die tot enkele pixels terugloopt, mits de snede bovenin lucht maakt |
| **ORIENTATIE** | drager links of rechts · kolom aan de binnen- of buitenzijde van de drager. **Randvoorwaarde:** de buitenrand van de kolom blijft ≥ 2% van de dragerbreedte binnen de dragerrand (gemeten 25,6 op 1100 = 2,3% — **BEREKEND**). |
| **DRAGER** | `D-F` klasse A of B · **`D-V` toegestaan** — dit is de reparatie van T-1. `gate P-09` en `card GRENS 1` eisten een `img`; de werkelijke eis is dat de kaart leesbaar op haar grond ligt, en dat is een **luminantiemeting**, niet een elementsoort. Gemeten precedent voor de drempel: `K4` op de homepagefoto, 0,048–0,084 (`card` bij GRENS 1). |
| **VLAKHIERARCHIE** | `H-OP` × 3–4 verplicht, elk 100% op de drager · `H-NEST` binnen de vlakken · `H-KRUIS` verboden: een vlak dat buiten de drager steekt breekt de relatie |
| **GEOMETRIE** | precies 1 × `GR-SNEDE`, en de hoek **volgt uit de doosverhouding**: een hoge doos levert een flauwe hoek. Dat een uitkomst buiten de merkfamilie valt is toegestaan en verklaarbaar; een percentage overnemen is dat niet. |
| **CANVASMODUS** | CANVAS |
| **STUURMAAT** | **dragerbreedte in % vw**, bereik **48–70**. Gemeten ijkpunt 62,0. **DELTA-BR ≥ 5 procentpunt.** |
| **CAPACITEIT** | 3 of 4 vlakken, nooit meer. Per vlak: icoon + kop van 1 regel + één regel toelichting, berekend uit de vlakbreedte. Verboden: "4–6 woorden samen" overnemen; `papiertest` meet dat zestien `K4`-kaarten hun tekst ≥ 70% zouden moeten laten krimpen om die telling te halen. |
| **VARIATIEBEREIK** | dragerbreedte 48–70% vw · zijde L/R · 3 of 4 vlakken · drager `D-F` of `D-V` · snedehoek volgt de doos |
| **TERUGVAL — VERBODEN** | **"Vier tegels in een rij onder de tekst."** Meetbare signatuur: de vlakken liggen niet op de drager (`H-NAAST`), of er is geen drager. Tweede terugval: **vlakken zonder richtingsverloop** — signatuur: nul verloop onder de kolom; dan zweven ze. Derde: **een gelijke rij van drie of meer vlakken die horizontaal ligt** — dat is `card GRENS 2`, gemeten 0 in alle negen homepagesecties. Vierde: **witte vlakken op een licht getekend vlak zonder meting** — luminantie > 0,14 of niet gemeten. |
| **TOETSEN** | (1) 3 of 4 vlakken, alle 100% binnen de drager met ≥ 2% marge → anders FAIL. (2) steek gelijk, afwijking < 1px. (3) **luminantie onder elk vlak gemeten en ≤ 0,14** → niet gemeten: FAIL. Dit sluit `DR-V-B4` en `blueprints §4-B13` toets 4. (4) richtingsverloop aanwezig en richtingsgebonden → afwezig: FAIL. (5) ≥ 10% van de dragerhoogte vrij onder het laatste vlak. (6) de tekstkolom heeft één rechte rand op de pixel. |

**Uitwerking 1 — fotodrager 62% vw rechts, vier vlakken (CANVAS)**

```
|<------ KOLOM 32% ------>| naad |===== DRAGER D-F 62% vw, GR-SNEDE 9,7 gr ====|
 eyebrow                  | 1,9  | object-position zo dat het onderwerp NAAST  |
 kop 3 regels             |      | de kolom staat                             |
 lead 4 regels            |      |        [ vlak 1 ]  lum 0,048 (gemeten)     |
 D-0 regelrij x3          |      |        [ vlak 2 ]  lum 0,061               |
 [ knop ] [ tekstlink ]   |      |        [ vlak 3 ]  lum 0,070               |
 een rechte kolomrand     |      |        [ vlak 4 ]  lum 0,084               |
                                 | >= 10% dragerhoogte vrij onder vlak 4      |
                                 | richtingsverloop ALLEEN onder de kolom      |
```

**Uitwerking 2 — getekende drager 50% vw links, drie vlakken (CANVAS)**

```
|===== DRAGER D-V 50% vw, GR-SNEDE 12 gr, nul img =====| naad |<-- KOLOM 42% -->|
| [ vlak 1 ]   luminantie 0,09 GEMETEN                 |      eyebrow
| [ vlak 2 ]   luminantie 0,09                         |      kop 2 regels
| [ vlak 3 ]   luminantie 0,10                         |      lead 3 regels
| >= 10% hoogte vrij onder vlak 3                      |      [ knop ]
| het vlak omsluit de kolom aan ALLE zijden met marge  |
|======================================================|
 3 vlakken i.p.v. 4, drager 50 i.p.v. 62 (12 pp), D-V i.p.v. D-F
 dit is B13 die nu WEL kan bestaan, omdat de eis luminantie is en niet <img>
```

---

### `BR-10` · ESCALEREND SLOT — familie `C10`

*Principe uit `B10` (HOMEPAGE-ONLY): de slotsectie escaleert aantoonbaar, en de vormen delen een lijn of een punt.*

| Veld | Inhoud |
|---|---|
| **VERPLICHT** | (1) de sectie escaleert boven de rest van de pagina in **ten minste twee van drie**: grootste kopgraad, grootste mediaschaal van de laatste helft, hoogste aantal lagen; (2) de scheiding tussen tekst en drager is **geen verticale lijn maar een punt of een schuine rand**; (3) ≥ 2 geometrische middelen die **één lijn of één punt delen**; (4) exact één vlak mag een vormpunt kruisen; een tekst**rij** houdt ≥ 1,5% van de sectiebreedte afstand tot een schuine rand (gemeten 24,9px op 1774 = 1,40% — **BEREKEND**, afgerond naar boven). |
| **OPTIONEEL** | een afspraakvlak op de drager dat naar dezelfde flow wijst als de primaire knop · een `D-0`-rij met geruststellingen, bewust ongelijk verdeeld · een `GR-ANKER` dat een hoek exact op de schermrand sluit (max 1 per pagina) |
| **ORIENTATIE** | drager links of rechts · punt boven of onder de halve hoogte · tekstkolom aan de puntzijde |
| **DRAGER** | `D-F` klasse A, en **nooit het bestand van de opening** · `D-V` (dan escaleert de mediaschaal via het getekende vlak, en de drager mag een ankervlak zijn) |
| **VLAKHIERARCHIE** | `H-KRUIS` × 1 · `H-OP` voor de rest · `H-IN` voor de kop als de drager de volle sectiehoogte vult |
| **GEOMETRIE** | 2 of 3 (ankerrol), die alle een lijn of een punt met elkaar delen. Geneste vormen die één rand delen lezen als diepte, niet als twee vormen. |
| **CANVASMODUS** | CANVAS |
| **STUURMAAT** | **dragerbreedte in % vw**, bereik **40–60**; plus de escalatiefactor **grootste kopgraad ÷ mediane kopgraad van de pagina**, ondergrens **1,10**. Gemeten ijkpunt: 66 ÷ 61 = **1,082** op de homepage (**BEREKEND**) — dus zelfs Master v1 zit onder 1,10 als je de mediaan neemt, en op `66 ÷ 53 = 1,245` ruim erboven als je het minimum neemt. Ik leg de toets daarom op **grootste ÷ kleinste H2 ≥ 1,20** (gemeten 1,245) en noteer de mediaanvariant als verworpen. **DELTA-BR ≥ 5 procentpunt.** |
| **CAPACITEIT** | eyebrow 1 regel · de grootste kop van de pagina over 2–3 regels · lead 2–3 regels · 2 knoppen van gelijke hoogte · 3 geruststellingen van elk één regel · 1 vlak met kop plus het aantal regels dat binnen zijn breedte past. **Eén** boodschap, niet twee. |
| **VARIATIEBEREIK** | dragerbreedte 40–60% vw · zijde L/R · puntpositie 40–65% hoogte · 2 of 3 middelen · drager `D-F` of `D-V` |
| **TERUGVAL — VERBODEN** | **"De hero nog een keer, onderaan."** Meetbare signatuur: ≥ 2 van {verloop, kolomverdeling ±4 pp, knoptekst, beeldbestand} gelijk aan de opening. Gemeten vijf keer in de B2-kandidaat. Tweede terugval: **drie geruststellingen in gelijke kolommen** — signatuur: max/min < 1,06 terwijl ze een vlak hebben. Derde: **de grootste kop in de eerste inhoudelijke sectie zetten** — dan is er geen escalatie meer mogelijk. |
| **TOETSEN** | (1) escalatie in ≥ 2 van 3, elk met een getal → anders FAIL. (2) grootste ÷ kleinste H2 ≥ 1,20. (3) de middelen delen één lijn of één punt → anders FAIL. (4) de tekstrij houdt ≥ 1,5% van de sectiebreedte afstand tot de schuine rand. (5) het beeldbestand is **niet** dat van de opening → zelfde bestand: FAIL. Is er geen tweede bestand, dan is de drager `D-V` en de toets **N.V.T.-met-reden "één beeldbestand beschikbaar"** — dit is de uitweg die `papiertest §7` voor `project-ratio-16` niet had. (6) nul sticky CTA (`brandbook §1A.9`, C-04). |

**Uitwerking 1 — fotodrager rechts 52% vw, punt op 56% hoogte (CANVAS)**

```
x0                                   punt op 56% hoogte
|<------------ KOLOM 38% ----------->\                                      xVW
 eyebrow                              \   DRAGER D-F 52% vw, volle hoogte   |
 GROOTSTE KOP van de pagina, 3 regels  \  grootste / kleinste H2 = 1,245    |
 lead 2 regels                          /                                   |
 [ knop ] [ knop ]                     /   [ VLAK kruist het vormpunt ]     |
 [ D-0 rij: 3 geruststellingen,       /                                     |
   bewust ongelijk 33,5/36,4/30,2 ]  /      [ GR-ANKER sluit de hoek 0/0 ]  |
   >= 1,5% afstand tot de rand       \                                      |
|<---- GR-RAND wig over de volle sectiebreedte, deelt dezelfde lijn ------->|
```

**Uitwerking 2 — getekend ankervlak links 44% vw, geen foto (CANVAS)**

```
x0                                                                         xVW
|=== DRAGER D-V 44% vw ===\                                                 |
| ankervlak in de merktaal \     eyebrow                                    |
| escalatie via MEDIASCHAAL:\    GROOTSTE KOP, 2 regels                     |
| 44% vw is groter dan elk    \  lead 3 regels                              |
| ander vlak op deze pagina   /  [ knop ] [ knop ]                          |
| [ VLAK kruist het punt ]   /   [ 3 geruststellingen, D-0, ongelijk ]      |
|===========================/                                               |
 escalatie 2 van 3: kopgraad 1,22 EN lagen 5 tegen max 3 elders
 mediaschaal escaleert niet t.o.v. de opening -> dat is de derde, en die mag falen
 beeldbestandstoets: N.V.T.-met-reden "een beeldbestand beschikbaar, al in de opening"
```

---

### `BR-11` · AFSLUITENDE NAVIGATIE — familie `C11`

| Veld | Inhoud |
|---|---|
| **VERPLICHT** | (1) de hoogste linkdichtheid en de **vlakste** hiërarchie van de pagina: **geen kop**, en de zwaarste letter is het woordmerk; (2) ≥ 4 zones met **strikt afnemende** steek — geen enkel paar steken is gelijk; (3) nul kaartvlakken: navigatie wordt uitsluitend door positie gescheiden; (4) nul claims behalve geverifieerde bedrijfsgegevens. |
| **OPTIONEEL** | **één** beeldvlak, en uitsluitend als het iets draagt dat bij **deze** pagina hoort · een juridische regel met een 1px lijn erboven · ten hoogste één knop in het contactblok |
| **ORIENTATIE** | zones links→rechts in afnemende steek; beeldvlak aan een schermrand; verticale stapeling toegestaan in DOCUMENT MODE |
| **DRAGER** | `D-0` standaard · `D-F` uitsluitend onder de voorwaarde hieronder |
| **VLAKHIERARCHIE** | `H-NAAST` normaal · `H-OP` ten hoogste **één** element op het beeldvlak |
| **GEOMETRIE** | 0 of 1. Eén `GR-RAND` op het beeldvlak, **alleen** als dat vlak bestaat. |
| **CANVASMODUS** | DOCUMENT (zonder beeldvlak) · HYBRID (met beeldvlak) |
| **STUURMAAT** | **steekverhouding eerste ÷ laatste**, bereik **≥ 1,6**. Gemeten ijkpunt 371,2 ÷ 194,3 = **1,91** (**BEREKEND**). **DELTA-BR ≥ 0,2.** |
| **CAPACITEIT** | woordmerk + één regel · 3 navigatiegroepen van 4–7 bestemmingen · 3 contactregels · 1 knop · 1 juridische regel · bij een beeldvlak: **exact één** notitie erop. |
| **VARIATIEBEREIK** | 4–5 zones · met of zonder beeldvlak · beeldvlak links of rechts · DOCUMENT of HYBRID |
| **TERUGVAL — VERBODEN** | **"Vier gelijke navigatiekolommen op een egale donkere band."** Meetbare signatuur: ≥ 2 steken gelijk, of een kop in de voet. Tweede terugval, en dit is de gemeten fout van V1.2: **een beeldvlak dat niets van deze pagina draagt.** Signatuur: het bestand in het voetvlak komt niet voor in de onderwerpsverzameling van de pagina. Gemeten: `s9-footer` toont batterijkasten en staat op **4 van de 5** papieren pagina's buiten het onderwerp (`papiertest §8.4`), terwijl `home-footer.css:370-371` dat argument voor mobiel al maakt. Dit is de oplossing van `DR-V-37`: niet "een beeld per paginafamilie" en niet "M6 vervalt buiten de homepage", maar **het vlak bestaat alleen als het draagt**. |
| **TOETSEN** | (1) nul koppen in de voet; de grootste lettergraad is het woordmerk → anders FAIL. (2) geen twee steken gelijk; eerste ÷ laatste ≥ 1,6. (3) is er een beeldvlak: het draagt ≤ 1 element **en** het bestand hoort bij het onderwerp van deze pagina → hoort het er niet bij: FAIL, en de reparatie is het vlak weglaten, niet een ander beeld zoeken. Is er geen beeldvlak: **N.V.T.-met-reden "voet zonder beeldvlak"** — en dat is de normale toestand buiten de homepage. (4) nul claims behalve `VERIFIED` bedrijfsgegevens. (5) nul links naar niet-bestaande pagina's; wat er niet is, wordt niet aangekondigd. |

**Uitwerking 1 — vijf zones, geen beeldvlak (DOCUMENT)**

```
[ MERK 372 ][ NAV 165 ][ NAV 131 ][ NAV 151 ][ CONTACT 319 ]
 steken 371,2 | 226,8 | 211,9 | 194,3 -- STRIKT AFNEMEND, 371,2/194,3 = 1,91
 geen kop; zwaarste letter is het woordmerk
 [ knop ]  3 contactregels  4-7 links per groep
|<------------- juridische regel, 1px lijn erboven --------------->|
 GEEN beeldvlak: toets 3 = N.V.T.-met-reden "voet zonder beeldvlak"
```

**Uitwerking 2 — vier zones, beeldvlak rechts dat wél draagt (HYBRID)**

```
[ MERK 410 ][ NAV 190 ][ NAV 150 ]    [ CONTACT 300 ]    BEELDVLAK 18% vw
 steken 409 | 250 | 205 -> 409/205 = 2,00                 GR-RAND 31 gr
 geen kop                                                 [ EEN notitie erop ]
|<-------- juridische regel --------->|
 het beeldbestand komt voor in de onderwerpsverzameling van DEZE pagina
 -> het vlak mag bestaan. Komt het er niet in voor, dan vervalt het vlak
 steekverhouding 2,00 tegen 1,91 = 0,09 verschil: ONDER DELTA-BR 0,2
 -> deze twee uitwerkingen mogen NIET op twee pagina's zo naast elkaar staan;
    de tweede pagina kiest 4 zones i.p.v. 5 en komt daarmee op 2,00 -- toegestaan,
    want het aantal zones is zelf een variatie-as. Zie DR-B-06.
```

---

### `BR-12` · REGISTER MET GEWICHT — familie `C12` · **GEEN PRECEDENT IN MASTER V1**

*Nieuw. Lost `papiertest §8.1` en `DR-V-30` op: 20 FAQ-paren over vier pagina's hadden geen plaats, en de beslisboom van het kaartsysteem eindigde bij "GEEN KAART". Status: voorstel met vastgelegde ondergrens, gelijk aan `C12`/`DR-C-03`.*

| Veld | Inhoud |
|---|---|
| **VERPLICHT** | (1) een reeks label/waarde- of vraag/antwoordparen met **ten minste één gewichtsverschil**: een uitgelichte eerste rij, een groepering met tussenkop, of een graadsprong van ≥ 5px tussen label en waarde; (2) nul kaartvlakken; scheiding uitsluitend met 1px-lijnen; (3) de lichtste zijde van de tweedeling ≤ 42% van de sectiebreedte; (4) elke waarde valt onder `VERIFIED` en staat **niet** elders op dezelfde pagina in een andere vorm. |
| **OPTIONEEL** | één knop of tekstlink in de kopkolom · groepering met tussenkoppen boven acht rijen · `<details>`/`<summary>` voor vragen, met een raakvlak ≥ 44px |
| **ORIENTATIE** | kop links / register rechts · gespiegeld · kop boven / register onder (dan vervalt de 42%-eis) · register in twee kolommen als het aantal rijen > 8 |
| **DRAGER** | `D-0` verplicht |
| **VLAKHIERARCHIE** | `H-NAAST` normaal; dat is hier geen terugval, omdat DOCUMENT MODE de leesbaarheid boven de laagwerking stelt |
| **GEOMETRIE** | **0** |
| **CANVASMODUS** | DOCUMENT |
| **STUURMAAT** | **aantal rijen per groep**, bereik **4–8**; boven 8 verplicht groeperen. **DELTA-BR ≥ 2 rijen.** |
| **CAPACITEIT** | 4–8 rijen per groep, onbeperkt aantal groepen. Per rij: label van 1 regel + waarde van 1–3 regels binnen 34–52ch. **Dit is de enige relatie zonder inhoudsplafond op het totaal** — en daarmee is de FAQ van vijf paren én de speclijst van vier regels én de KPI-rij van vier cellen plaatsbaar, waar `K7`'s "exact 3 cellen" ze alle drie afkeurde (`papiertest §7`). |
| **VARIATIEBEREIK** | 4–8 rijen · 1 of 2 kolommen · kop links/rechts/boven · met of zonder tussenkoppen · accordeon of open lijst |
| **TERUGVAL — VERBODEN** | **"n identieke rijen zonder enig gewichtsverschil."** Meetbare signatuur: alle rijen dezelfde graad **én** hetzelfde gewicht **én** dezelfde hoogte. Tweede terugval: **het register direct vóór het slot zetten**, waar de pagina juist zou moeten oplopen — gemeten in de B2-kandidaat, waar de accordeon precies daar staat en de pagina afvlakt (`compositions §4 C12`). Derde: **een derde herhaling van feiten die al in twee eerdere secties stonden.** |
| **TOETSEN** | (1) ≥ 1 gewichtsverschil, met een getal: graadverschil ≥ 5px of een gewichtssprong 700/400 → anders FAIL. (2) nul kaartvlakken → ≥ 1: FAIL. (3) lichtste zijde ≤ 42% bij een tweedeling; bij kop-boven N.V.T.-met-reden. (4) rijen per groep in bereik; > 8 zonder groepering: FAIL. (5) elke waarde heeft claimstatus `VERIFIED` en komt niet elders op de pagina voor → geen status: FAIL. (6) het register staat **niet** als laatste inhoudelijke sectie vóór `BR-10` → wel: FAIL. |

**Uitwerking 1 — specificatieregister, kop links, 6 rijen, uitgelichte eerste rij (DOCUMENT)**

```
|<-- KOP 38% -->|<------------- REGISTER 62% ------------->|
 eyebrow        | SYSTEEMVERMOGEN        xxx kW   <- uitgelicht: graad +6px
 kop 2 regels   |------------------------------------------ 1px
 lead 3 regels  | Opslagcapaciteit       xxx kWh
 [ tekstlink ]  | Omvormers              xxx
                | Netaansluiting         xxx
                | Regelsysteem           VIBE.CONTROL
                | Garantie               xxx jaar
 6 rijen, gewichtsverschil = uitgelichte eerste rij, nul kaartvlakken
 lichtste zijde 38% <= 42%
```

**Uitwerking 2 — vragenregister, kop boven, 5 paren, accordeon in twee kolommen (DOCUMENT)**

```
|<------------------------ leesbreedte ------------------------>|
 kop 2 regels
 +-- VEELGESTELDE VRAGEN -------------------+-----------------+
 | > vraag 1 (summary 700, 19px)            | > vraag 4       |
 |   antwoord (400, 16px) -> sprong 700/400 | > vraag 5       |
 | > vraag 2                                |                 |
 | > vraag 3                                |                 |
 +------------------------------------------+-----------------+
 5 paren, gewichtsverschil = 700/400, raakvlak >= 44px
 kop boven -> 42%-toets = N.V.T.-met-reden "geen tweedeling"
 stuurmaat 5 rijen tegen 6 = 1 -> ONDER DELTA-BR 2; op een pagina die BR-12
 tweemaal gebruikt moet het tweede register dus <= 4 of >= 8 rijen hebben,
 OF de orientatie-as verschillen. Hier: orientatie verschilt (links vs boven)
 en het type verschilt (spec vs vraag). Zie DR-B-07.
```

---

### `BR-13` · LANGE LEESKOLOM MET ANKERS — familie `C12` (tweede gebruik) · **GEEN PRECEDENT IN MASTER V1**

*Nieuw. Lost `kritiek-overfitting §3.2` op: `algemene-voorwaarden.html` heeft 6106 woorden met een hoofdstukspreiding van **25,5**, terwijl V1.2's enige toegestane werkblauwdruk voor `B7` (`B15`, exact 3 cellen van ≤ 27 woorden) daarvoor **226 secties** zou vragen. Status: voorstel, geen vastgesteld patroon.*

| Veld | Inhoud |
|---|---|
| **VERPLICHT** | (1) één leeskolom van 34–52ch; (2) **geen** `height` in `cqw` en **geen** vaste sectiehoogte: de hoogte volgt de tekst; (3) een ankerlijst of inhoudsopgave die naast of boven de kolom staat en elk hoofdstuk bereikbaar maakt; (4) de hoofdstukhiërarchie is zichtbaar met ≥ 5px graadverschil tussen niveaus. |
| **OPTIONEEL** | een meelopende ankerkolom op desktop · een terug-naar-boven-anker per hoofdstuk · een datum- en versieregel |
| **DRAGER** | `D-0` verplicht |
| **VLAKHIERARCHIE** | `H-NAAST` normaal |
| **GEOMETRIE** | **0** |
| **CANVASMODUS** | DOCUMENT, en deze relatie is de reden dat DOCUMENT MODE bestaat |
| **STUURMAAT** | **regellengte in ch**, bereik **34–52**. Gemeten ijkpunt: de homepage heeft geen paginabrede `max-width`, alleen regellengtecaps van **34–52ch** — dat is het enige stuk van Master v1 dat deze relatie al bevat. **DELTA-BR: n.v.t.**, want twee juridische pagina's mogen identiek zijn: ze horen identiek te zijn. |
| **CAPACITEIT** | onbegrensd. De hoofdstukspreiding van 25,5 is geen probleem meer, omdat er geen sectiehoogteplafond geldt. |
| **VARIATIEBEREIK** | regellengte 34–52ch · ankerkolom links, rechts of boven · met of zonder meelopende kolom |
| **TERUGVAL — VERBODEN** | **"Een juridische tekst in secties van vaste hoogte persen."** Meetbare signatuur: `height` in `cqw` of een vaste `px`-hoogte op een tekstsectie, of een hoofdstuk dat overloopt. Tweede terugval: **een conversieknop in een juridisch document** — `brandbook §1A.9` en `compositions §4 C10`: dat is een vertrouwensprobleem. |
| **TOETSEN** | (1) regellengte in bereik, op twee breedtes gemeten → anders FAIL. (2) nul `cqw`-hoogtes en nul vaste hoogtes op tekstsecties → ≥ 1: FAIL. (3) elke `<h2>` is via een anker bereikbaar → ontbreekt de ankerlijst: FAIL. (4) ≥ 5px graadverschil tussen hoofdstuk- en paragraafniveau. (5) nul conversieknoppen. (6) de A1-vloer (overlap per sectie) is hier **N.V.T.-met-reden "DOCUMENT MODE, geen lagen"** — en dat is de enige plek in het systeem waar A1 niet geldt. |

**Uitwerking 1 — ankerkolom links, meelopend (DOCUMENT)**

```
|<-- ANKERS 24% -->|<--------- LEESKOLOM 42ch ---------->|
 1 Definities      | ## 3 Totstandkoming
 2 Toepasselijkheid|    1140 woorden, hoogte volgt de tekst
 3 Totstandkoming  |    geen cqw, geen vaste hoogte
 4 Prijzen         |
 ...               | ## 4 Prijzen
 13 Toepasselijk   |    1581 woorden -> 1815px tekst, en dat MAG hier
 recht             |
 (meelopend)       |    graadverschil h2 -> h3 = 6px
```

**Uitwerking 2 — ankers boven, één kolom, geen meelopende kolom (DOCUMENT)**

```
|<------------------------ LEESKOLOM 48ch ------------------------>|
 [ 1 ][ 2 ][ 3 ][ 4 ][ 5 ][ 6 ][ 7 ][ 8 ][ 9 ][ 10 ][ 11 ][ 12 ][ 13 ]
 ## 1 Definities      62 woorden   <- de KORTSTE: 82,5px tekst
 ## 4 Prijzen       1581 woorden   <- de LANGSTE: 1815px tekst
 spreiding 25,5 -> GEEN probleem, want er is geen hoogteplafond
 A1 (overlap per sectie) = N.V.T.-met-reden "DOCUMENT MODE, geen lagen"
 regellengte 48ch tegen 42ch: beide in bereik, DELTA-BR n.v.t.
```

---

## 5.3 · De variatie-eis

### 5.3.1 De eis, meetbaar gemaakt

De vraag is of vijf pagina's hetzelfde systeem kunnen gebruiken zonder hetzelfde paginasilhouet te krijgen. Dat moet meetbaar zijn, dus definieer ik het silhouet:

> **Silhouetvingerafdruk** = de geordende reeks `BR`-codes van de **werkzone** van de pagina, dat zijn alle secties behalve de laatste twee.
>
> **Overlap tussen twee pagina's** = het aantal posities waarop beide pagina's dezelfde `BR` dragen, geteld **van boven**.
>
> **Toets S:** de overlap is **≤ 2**, en twee overlappende posities zijn **nooit aangrenzend**.

De laatste twee posities vallen er bewust buiten. `BR-10 → BR-11` staat op alle vijf de pagina's, want zo sluit de site af; `papiertest §9 toets 4` meet dat `B10` en `B11` op 5 van de 5 voorkomen en noemt dat een signaal. Het blijft een signaal, maar niet van armoede: de variatie zit daar in de **stuurmaat** en de **dragersoort**, niet in de keuze van de relatie. Daarom staat de slotreeks in een eigen kolom met zijn eigen getallen.

### 5.3.2 De vijf pagina's

Inhoud per pagina overgenomen uit `papiertest §3`–`§7`; beeldklassen uit `BEWIJS-assets §3`.

**A · `systeem-energieopslag.html` — B2 Systeem — 8 secties**

| pos | `BR` | modus | stuurmaat | drager | beeld, klasse |
|---|---|---|---:|---|---|
| 1 | BR-01 | CANVAS | 100% vw | D-F | `hedin-alkmaar-2` **A** |
| 2 | BR-12 | DOCUMENT | 6 rijen | D-0 | — |
| 3 | BR-04 | HYBRID | 58% vw | D-F | `logistiek-hero` **A** |
| 4 | BR-09 | CANVAS | 62% vw | D-F | `projects/ratio16` **A** |
| 5 | BR-06 | CANVAS | 1,12 | D-O | — |
| 6 | BR-07 | HYBRID | 0,31 | D-0 | — |
| 7 | BR-10 | CANVAS | 52% vw | D-F | `projects/beethovenstraat` **A** |
| 8 | BR-11 | DOCUMENT | 1,91 | D-0 | geen voetvlak |

Werkzone: `01 · 12 · 04 · 09 · 06 · 07`. De klasse-C-foto `energieopslag-hero` (batterijkasten op grondniveau) komt **niet** in `BR-01`, `BR-03` of `BR-04`; hij kan wel in een `BR-02`-item of een `BR-08`-duimnagel. De FAQ zit niet in deze compositie en gaat naar een eigen groep binnen de `BR-12` op positie 2 (6 specrijen + een tweede groep met 5 vragen, onder één kop).

**B · `systeem-zonnepanelen.html` — B2 Systeem/Oplossing — 7 secties**

| pos | `BR` | modus | stuurmaat | drager | beeld, klasse |
|---|---|---|---:|---|---|
| 1 | BR-03 | CANVAS | 88% vw | D-F | `projects/ratio16` **A** |
| 2 | BR-02 | HYBRID | 1,00 (D-0) | D-0 | — |
| 3 | BR-05 | CANVAS | 3,34 | D-0 | — |
| 4 | BR-09 | CANVAS | 55% vw | D-F | `projects/purmerend` **B** |
| 5 | BR-12 | DOCUMENT | 5 rijen | D-0 | — |
| 6 | BR-10 | CANVAS | 47% vw | D-F | `projects/beethovenstraat` **A** |
| 7 | BR-11 | DOCUMENT | 2,05 | D-0 | geen voetvlak |

Werkzone: `03 · 02 · 05 · 09 · 12`. Deze pagina **opent met een paneel in plaats van een podium** — dat is de grootste silhouetbreuk van de vijf, en hij is legaal omdat `BR-01` niet verplicht is en `BR-03` CANVAS-opening toestaat. De drie probleemkaarten zitten in `BR-02` met dragersoort `D-0`, zodat er geen drie ontbrekende foto's nodig zijn; dat lost drie CONTENT PENDING op en herstelt T-2.

**C · `systeem-ems.html` — B2 Systeem zonder productfoto — 6 secties**

| pos | `BR` | modus | stuurmaat | drager | beeld, klasse |
|---|---|---|---:|---|---|
| 1 | BR-06 | CANVAS | 1,45 | D-O | — |
| 2 | BR-04 | HYBRID | 46% vw | D-F | `kantoor-hero` **A** |
| 3 | BR-09 | CANVAS | 50% vw | D-V | — |
| 4 | BR-12 | DOCUMENT | 8 rijen | D-0 | — |
| 5 | BR-10 | CANVAS | 44% vw | D-V | — |
| 6 | BR-11 | DOCUMENT | 1,75 | D-0 | geen voetvlak |

Werkzone: `06 · 04 · 09 · 12`. Deze pagina draagt **nul klasse-A-productbeelden**, want die bestaan niet: `ems-hero` is synthetisch en afgekeurd, `energiehandel-hero` is hetzelfde bestand (`BEWIJS-assets §2`). De opening is een gebouwd onderwerp; dat is `DR-V-31` opgelost zonder B2 een uitzondering te geven. Van de zes secties zijn er vier zonder foto, met **drie verschillende dragersoorten**: `D-O` (1×), `D-V` (2×), `D-0` (2×). Zie §5.4.2.

**D · `industrie-vastgoed.html` — B2 Sector — 9 secties**

| pos | `BR` | modus | stuurmaat | drager | beeld, klasse |
|---|---|---|---:|---|---|
| 1 | BR-01 | CANVAS | 92% vw | D-F | `kantoor-hero` **A** |
| 2 | BR-02 | HYBRID | 1,67 | D-F ×1 + D-V ×5 | `vastgoed-hero` **B** |
| 3 | BR-12 | DOCUMENT | 4 rijen | D-0 | — |
| 4 | BR-08 | HYBRID | 38% vw | D-F | `projects/schouwburgring` **A** |
| 5 | BR-09 | CANVAS | 66% vw | D-F | `projects/ratio16` **A** |
| 6 | BR-07 | HYBRID | 0,22 | D-0 | — |
| 7 | BR-12 | DOCUMENT | 7 rijen | D-0 | — |
| 8 | BR-10 | CANVAS | 56% vw | D-F | `projects/dormio` **A** |
| 9 | BR-11 | HYBRID | 2,20 | D-F | `projects/schouwburgring` **A** |

Werkzone: `01 · 02 · 12 · 08 · 09 · 07 · 12`. De homeloze blokken van `papiertest §6` krijgen alle een plaats: *Gevolgen* wordt het `BR-12` op positie 3 (4 rijen met een uitgelichte eerste rij), de *FAQ* wordt het tweede `BR-12` op positie 7 (7 rijen). `BR-12` komt hier tweemaal voor met 4 en 7 rijen: Δ = 3 ≥ DELTA-BR 2. De zes sectoruitdagingen zitten in `BR-02` met één foto en vijf getekende vlakken; die vijf dragen ≥ 2 hoekwaarden en ≥ 2 vlakstructuren (voorwaarde uit `BR-02`, **DR-B-05**). Dit is de **enige** van de vijf pagina's met een voetvlak, en dat mag omdat het bestand bij het onderwerp hoort.

**E · `project-ratio-16.html` — B3 Case met één beeldbestand — 7 secties**

| pos | `BR` | modus | stuurmaat | drager | beeld, klasse |
|---|---|---|---:|---|---|
| 1 | BR-01 | CANVAS | 100% vw | D-F | `projects/ratio16` **A**, enige bestand |
| 2 | BR-06 | CANVAS | 1,30 | D-O | — |
| 3 | BR-12 | DOCUMENT | 4 rijen | D-0 | — |
| 4 | BR-05 | CANVAS | 2,60 | D-0 | — |
| 5 | BR-08 | HYBRID | 52% vw | D-V | — |
| 6 | BR-10 | CANVAS | 44% vw | D-V | — |
| 7 | BR-11 | DOCUMENT | 1,65 | D-0 | geen voetvlak |

Werkzone: `01 · 06 · 12 · 05 · 08`. Deze pagina was in V1.2 **geblokkeerd**: `B10`'s antipatroon verbiedt het herobestand in het slot en er is geen tweede bestand (`papiertest §7`). In V1.3 is het slot een `BR-10` met dragersoort `D-V`, en de beeldbestandstoets geeft `N.V.T.-met-reden "één beeldbestand beschikbaar"`. De vier KPI-cellen en de vier specregels gaan naar `BR-12` — `K7`'s "exact 3" blokkeerde ze beide.

### 5.3.3 Toets S — de pagina's zijn aantoonbaar verschillend

**Werkzones naast elkaar:**

```
A  01 · 12 · 04 · 09 · 06 · 07
B  03 · 02 · 05 · 09 · 12
C  06 · 04 · 09 · 12
D  01 · 02 · 12 · 08 · 09 · 07 · 12
E  01 · 06 · 12 · 05 · 08
```

**Overlap per paar, geteld van boven (10 paren):**

| paar | positie-voor-positie | overlap | aangrenzend? | Toets S |
|---|---|---:|---|---|
| A–B | 01/03 · 12/02 · 04/05 · **09/09** · 06/12 | **1** | n.v.t. | **PASS** |
| A–C | 01/06 · 12/04 · 04/09 · 09/12 | **0** | n.v.t. | **PASS** |
| A–D | **01/01** · 12/02 · 04/12 · 09/08 · 06/09 · **07/07** | **2** | pos 1 en 6 — nee | **PASS** |
| A–E | **01/01** · 12/06 · 04/12 · 09/05 · 06/08 | **1** | n.v.t. | **PASS** |
| B–C | 03/06 · 02/04 · 05/09 · 09/12 | **0** | n.v.t. | **PASS** |
| B–D | 03/01 · **02/02** · 05/12 · 09/08 · 12/09 | **1** | n.v.t. | **PASS** |
| B–E | 03/01 · 02/06 · 05/12 · 09/05 · 12/08 | **0** | n.v.t. | **PASS** |
| C–D | 06/01 · 04/02 · 09/12 · 12/08 | **0** | n.v.t. | **PASS** |
| C–E | 06/01 · 04/06 · 09/12 · 12/05 | **0** | n.v.t. | **PASS** |
| D–E | **01/01** · 02/06 · **12/12** · 08/05 · 09/08 | **2** | pos 1 en 3 — nee | **PASS** |

**10 van 10 paren PASS.** Maximale overlap **2**, bereikt bij A–D en D–E; in beide gevallen liggen de overlappende posities niet naast elkaar. Gemiddelde overlap **BEREKEND**: (1+0+2+1+0+1+0+0+0+2) ÷ 10 = **0,7** op gemiddeld (6+5+4+7+5) ÷ 5 = **5,4** werkzoneposities = **13,0%**.

**Tweede bewijs: de modusreeks.**

| pagina | modusreeks (werkzone + slot) | wisselingen |
|---|---|---:|
| A | C · D · H · C · C · H · C · D | **5** |
| B | C · H · C · C · D · C · D | **5** |
| C | C · H · C · D · C · D | **5** |
| D | C · H · D · H · C · H · D · C · H | **7** |
| E | C · C · D · C · H · C · D | **4** |

Vijf verschillende reeksen; vier verschillende wisselgetallen. Een pagina die bewust tussen de modi beweegt, zoals hoofdstuk 1 eist, is hier een **telbaar** gegeven.

**Derde bewijs: de slotreeks is wél dezelfde relatie en toch niet dezelfde uitvoering.**

| pagina | `BR-10` stuurmaat | `BR-10` drager | `BR-11` stuurmaat | voetvlak |
|---|---:|---|---:|---|
| A | 52% vw | D-F | 1,91 | nee |
| B | 47% vw | D-F | 2,05 | nee |
| C | 44% vw | D-V | 1,75 | nee |
| D | 56% vw | D-F | 2,20 | **ja** |
| E | 44% vw | D-V | 1,65 | nee |

`BR-10` stuurmaten: 52 · 47 · 44 · 56 · 44. Kleinste onderlinge afstand tussen twee verschillende pagina's: **C–E = 0**. Dat is **FAIL op DELTA-BR 5**. Hersteld door C naar **49%** te zetten: dan is de reeks 52 · 47 · 49 · 56 · 44 en de kleinste afstand 2 (47–49) — **nog steeds FAIL**. Met C op **41%** wordt de reeks 52 · 47 · 41 · 56 · 44, afstanden 3 (41–44), 3 (44–47), 5 (47–52), 4 (52–56) — **ook FAIL**.

> **Dit is een echte bevinding en ik laat hem staan.** DELTA-BR ≥ 5 procentpunt is **niet haalbaar** voor vijf pagina's binnen een bereik van 40–60% vw: vijf waarden met onderlinge afstand ≥ 5 vragen een spanwijdte van ≥ 20 punten, en die is er net (40…60), maar dan liggen de waarden vast op 40 · 45 · 50 · 55 · 60 en is er geen keuzevrijheid meer over — bij zes pagina's is het rekenkundig onmogelijk. **DELTA-BR mag dus geen paarsgewijze eis zijn op een absolute schaal.** → **DR-B-08** met het voorstel: DELTA-BR geldt uitsluitend tussen **opeenvolgend gepubliceerde** pagina's binnen één paginafamilie, niet tussen alle paren, en wordt aangevuld met een tweede as (dragersoort of oriëntatie) die ook mag verschillen. Met die lezing: C en E hebben beide 44% maar **verschillende** `BR-11`-stuurmaat (1,75 tegen 1,65) en C opent met `BR-06` waar E met `BR-01` opent — de pagina's zijn niet verwisselbaar. De paarsgewijze absolute eis is te streng en de reeksbewijzen hierboven doen het werk.

### 5.3.4 Wat deze vijf pagina's aan beeld vragen, en of het bestaat

| pagina | `D-F`-slots | klasse A nodig | klasse B toegestaan | unieke bestanden | CONTENT PENDING |
|---|---:|---:|---:|---:|---:|
| A | 4 | 4 | 0 | 4 | **0** |
| B | 3 | 2 | 1 | 3 | **0** |
| C | 1 | 1 | 0 | 1 | **0** |
| D | 6 | 5 | 1 | 5 (`schouwburgring` 2× — **FAIL** op één bestand per pagina) | **0**, maar 1 dubbelgebruik |
| E | 1 | 1 | 0 | 1 | **0** |

**Totaal 15 `D-F`-slots over vijf pagina's tegen 28 in V1.2, waarvan daar 17 CONTENT PENDING waren** (`papiertest §10`). De daling van 28 naar 15 komt van drie dingen: `BR-02` mag `D-0`- en `D-V`-items dragen, `BR-09` mag een `D-V`-drager hebben, en `BR-11` heeft standaard geen voetvlak.

Eén harde bevinding blijft: pagina D gebruikt `projects/schouwburgring` tweemaal (positie 4 en 9). Dat is **FAIL** op de regel "één bestand hoogstens één keer per pagina", en de reparatie is het voetvlak van D laten vervallen — dan heeft geen van de vijf pagina's een voetvlak, en dan is de eerlijke conclusie dat `BR-11`'s beeldvlak **buiten de homepage niet voorkomt**. Dat is precies wat `papiertest §8.4` en `home-footer.css:370-371` suggereren. Ik leg het niet als regel vast — het is een uitkomst van vijf gevallen. → **DR-B-09**

---

## 5.4 · Koppeling

### 5.4.1 `BR` × `C`-families × canvasmodi

| `BR` | `C`-familie | Canvasmodi | Ritmeniveau (V1.1 §6) | Afkomst |
|---|---|---|---|---|
| BR-01 OPENENDE DRAGER | **C1** Openingspodium | CANVAS · HYBRID | HIGH | principe uit `B01` (HOMEPAGE-ONLY) |
| BR-02 ONGELIJKE VERZAMELING | **C2** Ongelijk kaartmozaïek | HYBRID · DOCUMENT | MEDIUM | `B02` ADAPTIVE |
| BR-03 DOORLOPENDE DRAGER | **C3** Uitgelicht paneel | CANVAS | HIGH | principe uit `B03` + `B14` (HOMEPAGE-ONLY) |
| BR-04 GEDRAGEN BAND | **C4** Redactionele splitsing | HYBRID · CANVAS | MEDIUM | `B04` + `B12` ADAPTIVE |
| BR-05 GERICHTE REEKS | **C5** Voortgangsrij | CANVAS · DOCUMENT | QUIET | principe uit `B05` (HOMEPAGE-ONLY) |
| BR-06 GEBOUWD ONDERWERP | **C6** Gebouwd object | CANVAS · HYBRID | MEDIUM, **HIGH als opening** | principe uit `B06` (HOMEPAGE-ONLY) |
| BR-07 BEWIJS NAAR MAAT | **C7** Bewijsband | HYBRID · DOCUMENT | QUIET | `B07` TRANSFERABLE + `B15-B` |
| BR-08 DRIE REGISTERS | **C8** Verhaalblok | HYBRID | MEDIUM | `B08` ADAPTIVE |
| BR-09 BESTEMMINGENKOLOM | **C9** Kaartkolom op beeld | CANVAS | MEDIUM | `B09` + `B13` ADAPTIVE |
| BR-10 ESCALEREND SLOT | **C10** Slotcompositie | CANVAS | HIGH | principe uit `B10` (HOMEPAGE-ONLY) |
| BR-11 AFSLUITENDE NAVIGATIE | **C11** Navigatievoet | DOCUMENT · HYBRID | QUIET | `B11` navigatiehelft TRANSFERABLE |
| BR-12 REGISTER MET GEWICHT | **C12** Register — `DR-C-03` open | DOCUMENT | QUIET | **nieuw**, geen precedent |
| BR-13 LANGE LEESKOLOM | **C12**, tweede gebruik | DOCUMENT | QUIET | **nieuw**, geen precedent |

De koppeling is 1:1 voor `C1`–`C12`, en dat is opzettelijk: V1.1 blijft daarmee onaangetast. Wat `BR` toevoegt boven `C` is precies vijf dingen: de **dragersoort als variabele**, de **oriëntatie-as met randvoorwaarde**, de **stuurmaat met bereik en DELTA**, de **rekenprocedure voor de capaciteit** en de **verboden terugval met meetbare signatuur**. Wat `BR` wegneemt is de px-maat.

Twee opmerkingen bij de tabel:

- **`BR-06` mag HIGH zijn.** `C6` en `blueprints §4-B06` zetten het gebouwde object op MEDIUM. Voor een pagina zonder productfotografie is dat de enige mogelijke opening, en een opening is HIGH. Dit is nieuw ten opzichte van V1.1/V1.2 en dus een besluit, geen regel. → **DR-B-10**
- **`BR-13` heeft geen eigen familie.** Hij past onder `C12`, maar `C12` is zelf `DECISION REQUIRED` (`DR-C-03`). Een dertiende familie voorstellen zou V1.1 wijzigen; dat doe ik niet. → **DR-B-11**

### 5.4.2 De opgeloste tegenstrijdigheid: archetype B2 tegen het beeldsysteem

**De tegenspraak, exact.** `blueprints §6` zet voor B2: `B07 · B02 · B04 · B05 · B03 · B09 of B13 · B06` — dat zijn drie, soms vier `M0`-blauwdrukken. `image §9 MFQ-01` zegt *"M1, M2, M4 en M0 maximaal 1×"* en `F-6` zegt *"Minstens één sectie zonder foto. Gemeten: 1 van 9. Bovengrens 1."* (`papiertest §8.6 T-3`). De echte pagina's hebben 5 · 6 · 6 · 7 · 6 fotoloze inhoudsblokken nodig (`papiertest §8.2`).

**Waarom MFQ-01/F-6 hier fout staan, met bewijs.** `M0` is geen behandeling. `M1`–`M6` beschrijven wat er met een **beeld** gebeurt; `M0` beschrijft dat er **geen beeld** is. Een plafond op een afwezigheid is een plafond op niets. En de bovengrens 1 is letterlijk de enige waarneming: `F-6` schrijft zelf *"Gemeten: 1 van 9"*. Dat is het patroon uit `kritiek-overfitting §2.3`: het gemeten maximum wordt het toegestane maximum, en de regel kan alleen door zijn eigen bron bevestigd worden.

**De oplossing: vervang het plafond op de afwezigheid door een vloer op de verscheidenheid.**

> **Regel `BR-F1` — plafond op de fotografische behandelingen, niet op hun afwezigheid.**
> De bovengrenzen van `image MFQ-01` blijven gelden voor `M1`–`M6`. **Voor `M0` vervalt de bovengrens.** `F-6` blijft als ondergrens staan (minstens één sectie zonder foto) en verliest zijn bovengrens.
>
> **Regel `BR-F2` — vloer op de dragerverscheidenheid.** Draagt een pagina `n` secties zonder foto, dan gebruikt zij ten minste `ceil(n ÷ 2)` **verschillende** dragersoorten uit `{D-O, D-V, D-0}`, met een maximum van drie. Narekening op de vijf pagina's:
>
> | pagina | fotoloze secties `n` | vereist `ceil(n÷2)`, max 3 | gebruikte soorten | uitkomst |
> |---|---:|---:|---|---|
> | A | 4 (pos 2·5·6·8) | 2 | D-0 · D-O · D-0 · D-0 → **2** (`D-0`, `D-O`) | **PASS** |
> | B | 4 (pos 2·3·5·7) | 2 | D-0 ×4 → **1** | **FAIL** |
> | C | 5 (pos 1·3·4·5·6) | 3 | D-O · D-V · D-0 · D-V · D-0 → **3** | **PASS** |
> | D | 3 (pos 3·6·7) | 2 | D-0 ×3 → **1** | **FAIL** |
> | E | 6 (pos 2·3·4·5·6·7) | 3 | D-O · D-0 · D-0 · D-V · D-V · D-0 → **3** | **PASS** |
>
> **Twee van de vijf FAILen, en dat is het punt van een vloer.** B en D dragen hun fotoloze secties alle op typografie alleen. De reparatie is aanwijsbaar: op B wordt `BR-02` op positie 2 een `D-V`-variant (drie getekende itemvlakken in plaats van drie `D-0`-regels), op D wordt het `BR-12` op positie 3 een `BR-02` met `D-V`-items. Beide reparaties zijn binnen hetzelfde systeem beschikbaar, en geen van beide vraagt een foto die niet bestaat. Dit is precies waarvoor `BEWIJS-assets §4` vraagt: *"niet-fotografische middelen moeten MEDIUM-secties zelfstandig kunnen dragen."*

> **Regel `BR-F3` — één bestand, één sectie.** Eén beeldbestand komt hoogstens één keer per pagina voor, en nooit in twee opeenvolgende secties. Dit is `DR-V-36`, en het sluit de route die `papiertest §7` voor `project-ratio-16` meette: drie uitsnedes van één bestand haalden `F-7` en de hele herhalingstoets. **Gevolg, eerlijk opgeschreven:** een pagina met één bestand heeft één fotografische sectie, en de rest draagt `D-O`, `D-V` of `D-0`. Dat is geen beperking van het systeem maar een beschrijving van de voorraad: van 27 verschillende opnamen zijn er 9 klasse A voor 48 pagina's (`BEWIJS-assets §4`).

**`MFQ-04` wordt losgelaten als paginahoogte-eis.** `image MFQ-04` zegt *"M6 alleen in de laatste 20%"*; `papiertest §8.3` rekent voor dat `B10 + B11` samen 1262px vast zijn en dat die eis daarom een pagina van ≥ 6310px vraagt, dus ongeveer negen secties — en dat drie van de vier composities erop omvallen zonder dat één poort het ziet. In V1.3 is de regel een **positie-eis**, niet een hoogte-eis: `BR-10` is de laatste inhoudelijke sectie en `BR-11` de laatste; de hoogte doet niet mee. Dat is `DR-V-34` beantwoord in de richting "percentage van het aantal secties" en het is te toetsen op elke pagina, ongeacht lengte. → **DR-B-12**

### 5.4.3 De canvasmodi als scheidslijn voor de proportionaliteitspoort

Dit is de reparatie van de botsing die `kritiek-overfitting §5.1` meet: `P-01`/`P-02` en `G17` eisen `cqw` overal, terwijl `brandbook §1A.6` punt 2/3 `clamp()` als default voorschrijft en `cqw` **uitsluitend** voor *"bewust canvas-proportionele composities"*. Bij tegenspraak wint §1A, dus `P-01`/`P-02` zijn op nieuw werk nu onhandhaafbaar.

De canvasmodi lossen het op, omdat §1A.6 de uitzondering zelf benoemt:

| Modus | Rekeneenheid | Proportionaliteitstoets |
|---|---|---|
| **CANVAS MODE** | `cqw` toegestaan — dit **is** een bewust canvas-proportionele compositie (§1A.6 punt 2) | **verplicht**: de sectiehoogte op 1440 ÷ die op 1774 ligt binnen 1,0% van 0,8117. Gemeten homepage: afwijking **0,003%**, elke sectiehoogte binnen **0,2%** |
| **HYBRID MODE** | `cqw` voor het podium, `clamp()` voor de kolom | **gedeeltelijk**: de toets geldt voor het podium, en is voor de kolom **N.V.T.-met-reden "DOCUMENT-helft van HYBRID"** |
| **DOCUMENT MODE** | `clamp()` verplicht, `cqw` **verboden** | **omgekeerd**: de sectiehoogte mag **niet** proportioneel meeschalen; schaalt zij wél binnen 1,0% van 0,8117, dan is dat **FAIL** — want dan krimpt de leeskolom met het scherm |

Daarmee is de B2-kandidaat niet langer een pagina die op `P-01` zakt: zij haalt 0,8838 in plaats van 0,8117 omdat zij doet wat §1A.6 voorschrijft (`kritiek-overfitting §5.1`). Met de modus-scheiding wordt de vraag "welke modus hoort bij deze sectie" en dan is 0,8838 op een DOCUMENT-sectie geen fout maar de bedoeling — en 0,8838 op een CANVAS-sectie wel een fout. De spreiding over de secties blijft toetsbaar: homepage spreiding **0,0015** over negen secties tegen de B2-kandidaat **0,138**, en die 0,138 is een echte diagnose zodra de modus per sectie vastligt.

**A7 krijgt dezelfde splitsing.** In CANVAS MODE ≥ 80% werkbreedte, niet dalend bij groeiende viewport; in DOCUMENT MODE N.V.T.-met-reden en dan geldt 34–52ch. De gemeten B2-waarden (68,1% op 1774 tegen 86,0% op 1440) blijven daarmee een FAIL, maar nu met een aanwijsbare oorzaak: een paginabrede `max-width` op een sectie die CANVAS had moeten zijn.

### 5.4.4 De overige drie V1.2-tegenstrijdigheden

| # | Tegenstrijdigheid | Beslechting in V1.3 | Eigenaar |
|---|---|---|---|
| **T-1** | `B13` stapelt vier gelijke vlakken op een getekend vlak; `gate P-09` en `card GRENS 1` eisen dat een gelijke rij **op een beeld** ligt | `BR-09` vervangt de eis "op een `img`" door "**gemeten** achtergrondluminantie ≤ 0,14 onder elk vlak". De grond mag `D-F` of `D-V` zijn. Niet gemeten = FAIL. | `BR-09`; `gate P-09` moet luminantie lezen in plaats van elementsoort → **DR-B-13** |
| **T-2** | `card §4.1 C1` normeert een rij van drie kaarten; `blueprints B02` verbiedt drie ("nooit 3") | `BR-02` staat drie items toe in **twee** vormen: ongelijk met max/min ≥ 1,55, of gelijk met dragersoort `D-0` (geen vlak). De verboden zone 1,06 < x < 1,55 blijft (`GRENS 3`). Grond: `card` meet zelf dat 4 van de 5 `K8`-rijen van Master v1 exact gelijk zijn en dat dat mag omdat er geen oppervlak is. | `BR-02` |
| **T-4** | Het `DR-V`-nummerblok 20–29 is tweemaal uitgegeven (`image §16` tegen `card §7`) | Niet in dit hoofdstuk op te lossen: het is een registratieprobleem over twee documenten. Dit hoofdstuk gebruikt daarom `DR-B-`, een prefix die in `docs/` nul treffers heeft (**gemeten in deze sessie**: `grep -rl "DR-B-0" docs/` geeft geen bestand). | buiten dit hoofdstuk → **DR-B-14** |

---

## 5.5 · Wat ik in dit hoofdstuk NIET heb gemeten

| Onderwerp | Reden |
|---|---|
| **Elke render** | Ik heb niets gerenderd, niets gescreenshot en niets in een browser gemeten. Alle getallen zijn overgenomen uit het AANVAARD BEWIJS of narekeningen daarvan. De vijf pagina's in §5.3 zijn **papier**, net als de vijf kaarten van `papiertest`. |
| **De luminantiedrempel 0,14 op een getekend vlak** | Overgenomen uit `card` bij GRENS 1 (gemeten 0,048–0,084 op de homepagefoto). Of een getekend navyvlak die waarde haalt is **NIET GEMETEN** — en in `BR-09` daarom FAIL tot het gemeten is. |
| **Of de 15 `D-F`-slots van §5.3.4 met de werkelijke uitsnedes passen** | Onderwerpbehoud per uitsnede is per beeldsoort verschillend (`BEWIJS-assets §1`). Ik heb geen uitsnede nagerekend; `papiertest §3`–`§7` deed dat voor andere slots. |
| **De DELTA-BR-stappen** | Alle **AFGELEID MET MARGE**. §5.3.3 laat zien dat de paarsgewijze absolute lezing rekenkundig niet houdbaar is. → `DR-B-08` |
| **A1 t/m A7 op een derde pagina** | Elke vloer is op twee pagina's geijkt (Master v1 en de B2-kandidaat) plus op papier. `kritiek-ontduiking §7` waarschuwde hier al voor; de waarschuwing geldt onverkort. |
| **De gewogen definities van A1 en A2** | "≥ 1% van het sectievlak" en "≥ 30% van het vlakoppervlak op de drager" zijn nieuwe meetdefinities. De **masterwaarden onder die definities zijn niet gedraaid** — dat moet gebeuren vóór het grenzen worden, exact zoals `kritiek-ontduiking §7` bij GAT-12 en GAT-08 noteert. |
| **Of `BR-12` en `BR-13` werken** | Geen precedent in Master v1, geen render, geen contrastmeting. Beide zijn voorstellen met een vastgelegde ondergrens, net als `C12` in V1.1. |
| **Toegankelijkheid en leesbaarheid** | Niet in dit hoofdstuk. `kritiek-overfitting §6` meet dat twee tekstsoorten op de master WCAG AA niet halen en dat de poort leesbaarheid nergens toetst. Dit hoofdstuk voegt de eis "contrast is **gemeten**" toe bij `BR-03`, `BR-08` en `BR-09`, maar legt geen contrastwaarde vast. |

---

## 5.6 · VISUELE REVIEWVRAGEN

Niet toetsbaar met een getal; expliciet géén poort. Elke vraag hoort bij een `BR` en wordt door een mens beantwoord.

1. **`BR-01`** — Leest de opening als een ruimte of als een rij elementen? De stuurmaat kan 100% zijn en de sectie kan nog steeds als een banner lezen.
2. **`BR-02`** — Wijst de dominante tegel de bezoeker werkelijk waar te beginnen, of is zij alleen de grootste?
3. **`BR-03`** — Draagt de tekst in de drager of ligt zij erop? De scrim kan het contrast halen en de tekst kan er nog steeds op geplakt uitzien.
4. **`BR-04`** — Draagt de ondergrond het beeld, of staat zij erachter?
5. **`BR-05`** — Lees je stap 4 verder dan stap 1, of lees je vier gelijke blokken?
6. **`BR-06`** — Ziet het gebouwde object eruit als een werkend systeem of als een illustratie van een systeem?
7. **`BR-07`** — Is de leegte in het midden rust of vergetelheid?
8. **`BR-08`** — Vertellen de drie registers hetzelfde verhaal in drie toonhoogtes, of drie verschillende verhalen?
9. **`BR-09`** — Liggen de vlakken op de drager of zweven ze erboven? Het verloop kan aanwezig zijn en het effect kan uitblijven.
10. **`BR-10`** — Voelt het slot als een climax of als nog een sectie die ook groot is?
11. **`BR-11`** — Hoort het voetvlak bij deze pagina, of is het er omdat de homepage er een heeft?
12. **`BR-12`** — Is het register leesbaar als lijst, of alleen scanbaar als tabel?
13. **`BR-13`** — Is de lange tekst te lezen of alleen te vinden?
14. **Over de hele pagina** — Beweegt de pagina bewust tussen de modi, of wisselt zij alleen van breedte?

---

## 5.7 · Open besluiten — `DR-B`

Elk besluit volgt uit een gemeten spreiding, een narekening of een gemeten tegenspraak. Geen ervan is een opdracht om nu iets te wijzigen.

- **`DR-B-01` — De gewichtsgrens van A1.** "Elke sectie ≥ 1 overlappend paar waarvan beide delen ≥ 1% van het sectievlak" sluit GAT-12 (15 overlapparen van onzichtbare broers). De **masterwaarde onder deze definitie is niet gedraaid**. Wordt 1% de grens, of eerst de master meten en dan beslissen?
- **`DR-B-02` — De dekkingsgrens van A2.** "≥ 30% van het vlakoppervlak op de drager" sluit GAT-03/06/07. Ook hier: de masterwaarde onder de nieuwe definitie is niet gemeten. En: wordt het aantal secties 2 (mijn voorstel, op grond van 39 van 48 pagina's die `P-05` niet kunnen halen) of blijft het de gemeten 6 van 9?
- **`DR-B-03` — De graadspreiding van A3.** `unieke graden ÷ koppen ≥ 0,80` met ≥ 3px tussen de twee dichtstbijzijnde. Gemeten: homepage 1,00, B2 0,60. Wordt 0,80 de grens, of 1,00 (de meting), of een ander getal?
- **`DR-B-04` — Bestaat DELTA-BR?** Een regel die twee pagina's tegen elkaar legt, bestaat in V1.2 niet: nul van de 75 genummerde regels doet het (`papiertest §9 toets 2`). Komt zo'n regel er, en dan in welke vorm — zie `DR-B-08`.
- **`DR-B-05` — Meerdere getekende vlakken in één verzameling.** `BR-02` staat ≥ 3 `D-V`-items toe mits ≥ 2 hoekwaarden en ≥ 2 vlakstructuren. Master v1 heeft **één** getekend itemvlak (25°). Is "n getekende vlakken in één sectie" toegestaan, en wat is de ondergrens op hun onderling verschil?
- **`DR-B-06` — Het aantal zones als variatie-as.** `BR-11` kan op twee pagina's dezelfde steekverhouding halen met een ander aantal zones. Telt "ander aantal zones" als variatie, of moet de verhouding zelf verschillen?
- **`DR-B-07` — Twee registers op één pagina.** Pagina A en D dragen `BR-12` tweemaal (specs en FAQ). Is dat toegestaan, en verschillen ze dan in rijaantal, in oriëntatie, of in beide?
- **`DR-B-08` — DELTA-BR is paarsgewijs niet haalbaar.** Voorgerekend in §5.3.3: vijf pagina's met DELTA ≥ 5 pp binnen een bereik van 40–60 pp laat geen keuzevrijheid; bij zes pagina's is het onmogelijk. Wordt DELTA-BR een eis tussen **opeenvolgend gepubliceerde** pagina's binnen één familie, met een tweede as (dragersoort of oriëntatie) als alternatief?
- **`DR-B-09` — Het voetvlak buiten de homepage.** Van de vijf pagina's in §5.3 houdt er nul een voetvlak over zodra "één bestand, één sectie" geldt. Vervalt `BR-11`'s beeldvlak buiten de homepage, of krijgt het een eigen bestand per paginafamilie (`DR-V-37` onbeslist)?
- **`DR-B-10` — Mag een gebouwd onderwerp HIGH zijn?** `C6` en `B06` zetten het op MEDIUM. Voor `systeem-ems.html` is het de enige mogelijke opening, en een opening is HIGH. Wordt `BR-06` een HIGH-relatie als hij opent?
- **`DR-B-11` — Krijgt het register een eigen familie?** `BR-12` en `BR-13` hangen beide onder `C12`, dat zelf `DECISION REQUIRED` is (`DR-C-03`). Komt er een `C13`, of blijven er twee relaties onder één onbesliste familie?
- **`DR-B-12` — `MFQ-04` als positie-eis.** V1.3 leest *"M6 alleen in de laatste 20%"* als *"`BR-10` is de laatste inhoudelijke sectie en `BR-11` de laatste"*. Dat maakt de regel onafhankelijk van de paginahoogte en lost `DR-V-34` op. Wordt de hoogte-eis daadwerkelijk ingetrokken?
- **`DR-B-13` — De poort moet luminantie lezen.** `gate P-09` leest een elementsoort (`img`); `BR-09` eist een luminantiemeting. Wie meet, met welk gereedschap, en op welk punt onder elk vlak?
- **`DR-B-14` — Nummereigendom.** `DR-V-20…29` is tweemaal uitgegeven (`papiertest §8.6 T-4`) en `P-01…P-16` bestaat in drie betekenissen (`kritiek-overfitting §5.9`). `DR-B-` is in `docs/` vrij (gemeten). Wie is eigenaar van het nummerregister, en worden de bestaande botsingen hernummerd of alleen gekwalificeerd?

---

## Verantwoording

Dit hoofdstuk is geschreven zonder één bestand in `/Users/mounirvanbinsbergen/projects/vibe-website` te lezen-en-wijzigen: alle acht gelezen documenten onder `docs/` zijn ongewijzigd, er is geen HTML, CSS, JS of asset aangemaakt of aangepast, er is geen screenshot gemaakt, er is niets gecommit en niets gepusht. Het enige bestand dat deze sessie heeft geschreven is dit bestand.

Alle metingen zijn **overgenomen**, niet opnieuw gedraaid. Waar ik reken staat **BEREKEND**; waar ik een marge om een meting leg staat **AFGELEID MET MARGE, NIET ONAFHANKELIJK GEMETEN**; waar iets niet is gemeten staat **NIET GEMETEN** met de reden. Eén meting heb ik in deze sessie zelf gedaan, en zij is van de goedkoopste soort: `grep -rl "DR-B-0"` over `docs/` geeft **nul bestanden**, dus de prefix was vrij.

Homepagemetingen zijn in dit hoofdstuk **bewijs**, nooit een automatische regel. Van de 37 keer dat V1.2 het woord "maximaal" gebruikt, neemt V1.3 er geen enkele over als plafond zonder vloer. De zeven vloeren staan in §5.0.3, de verboden terugvallen staan per relatie, en elke toets kent drie uitkomsten.


---

# 6 · DE KWALITEITSPOORT

**Status.** Vervangt `docs/vibe-design-quality-gate-v1.md` DEEL 2 en DEEL 3 (P-01…P-16, H-01…H-06)
volledig. Die poort is ONGELDIG: een pagina van negen identieke flexrijen, gebouwd met ongeveer
40 regels CSS en zes onzichtbare hulpmiddelen, haalt er **22 van 22** en verslaat de Homepage Master
op **6 van de 14 scheidende poorten** (`scratchpad/v12/kritiek-ontduiking.md` §3, §3.1). Een poort
waarop een generieke pagina hoger scoort dan de bron van waarheid is geen poort maar een meetlat die
de verkeerde kant op wijst.

**Wat deze poort anders doet, in vijf punten.**

| # | V1.2 | V1.3 |
|---|---|---|
| 1 | tellen (aantal unieke waarden) | **wegen dan tellen**: eerst een maatvloer per object, dan een minimale AFSTAND tussen waarden voordat ze als verschillend gelden (§6.5) |
| 2 | CSS-mechanismen (`display:grid`, `url(`, `backgroundColor`, `querySelectorAll('br')`) | **verschijning**: elke harde toets is op een schermafdruk of in een gemeten rechthoek waarneembaar (§6.3) |
| 3 | plafonds zonder vloeren | **banden en vloeren**, en de ontwerplaag gaat naar een mens die hem niet zelf heeft gebouwd (§6.4) |
| 4 | een lege meting is PASS (`[].every() === true`) | **PASS / FAIL / N.V.T.-met-reden**, met een vervangende eis per N.V.T. (§6.8) |
| 5 | één numeriek harnas is het eindoordeel | **vijf soorten toets, vier eindverdicten**, en het harnas is nooit het laatste woord (§6.1) |

**Wat deze poort NIET is.** Geen groot numeriek nalevingsharnas. Er staan in dit hoofdstuk
**26 harde of telbare toetsen** (A 9 · C 7 · D 6 · E 4), **7 reviewvragen** en **5 regels
meetcontract**, tegenover 22 geautomatiseerde toetsen in V1.2. Het verschil zit niet in het aantal
maar in de weging, de drie uitkomsten en de verdeling tussen machine en mens: **18 van de 26** harde
toetsen vuren op een eigenschap die op een schermafdruk of in twee schermafdrukken naast elkaar is te
zien (A 8 van 9 · C 6 van 7 · E 4 van 4; de acht overige zijn registertoetsen: A-08, VAR-07 en alle zes
van D), en **geen enkele** leest een CSS-eigenschap als bewijs van verschijning.

---

## 6.1 Hoe de poort draait

### 6.1.1 De vijf soorten toets

| deel | soort | wie stelt vast | uitkomst |
|---|---|---|---|
| **A** | structurele hard fails, 9 condities | machinemeting + schermafdruk | PASS / FAIL / N.V.T. |
| **B** | visuele reviewcriteria, 7 vragen | een mens, niet de bouwer | JA / NEE / ONBEANTWOORD |
| **C** | herhalingsgrenzen met weging, 6 toetsen | machinemeting | PASS / FAIL / N.V.T. |
| **D** | inhouds- en assethaalbaarheid, 6 toetsen | register + meting | PASS / FAIL / PENDING |
| **E** | responsieve integriteit, 4 toetsen | meting op 390 / 1440 / 1774px | PASS / FAIL / N.V.T. |

**F** (§6.8) is geen deel maar de regel die over alle vijf heen geldt. **G** (§6.9) is de eerlijke
lijst van wat deze poort nog steeds niet vangt.

### 6.1.2 De drie canvasmodi worden gedeclareerd, niet afgeleid

Elke sectie draagt exact één gedeclareerde modus. De modus bepaalt WELKE toetsen van toepassing
zijn; hij is dus zelf de belangrijkste declaratie op de pagina en wordt daarom in deel A getoetst.

| modus | wat hij betekent | typische inhoud |
|---|---|---|
| **CANVAS MODE** | proportioneel met het scherm: de dominante maat is een percentage van de viewport en verandert niet als het scherm groeit | hero, projectbewijs, productvisualisatie, slot-CTA |
| **DOCUMENT MODE** | begrensde leesbreedte: de leeskolom heeft een bewuste bovengrens | FAQ, juridisch, technische registers, lange tekst |
| **HYBRID MODE** | een begrensde redactionele kolom NAAST een proportioneel visueel podium | tekst met een ontworpen visueel vlak ernaast |

Een pagina beweegt bewust tussen de modi. **Een pagina met één modus in álle secties is niet
verboden, maar hij moet dat in de kaart als keuze opschrijven** (toets A-01 en VAR-02).

### 6.1.3 Het meetcontract — vóór toets 1

De poort draait niet op zelfverklaarde markeringen. V1.2 las
`document.querySelectorAll('[data-screen-label]')`; dat attribuut staat op **25 van de 48** pagina's
in de werkboom (`scratchpad/v12/kritiek-overfitting.md` DR-V-O-01), dus 23 pagina's waren met de
poort niet meetbaar en kregen een FAIL die niets over hun ontwerp zei.

| regel | inhoud |
|---|---|
| **MC-1** | De sectieverzameling wordt uit de DOM afgeleid: alle directe kinderen van de paginawrapper met een eigen hoogte ≥ 10% van de viewportbreedte. Het aantal gedeclareerde secties in de kaart moet daaraan **gelijk** zijn. Verschil ≠ 0 → **NIET MEETBAAR**, de poort draait niet, de pagina is niet afgekeurd maar ook niet goedgekeurd. |
| **MC-2** | Geneste sectiedeclaraties zijn verboden. Eén declaratie binnen een andere → NIET MEETBAAR. |
| **MC-3** | Een meting die niet kan worden uitgevoerd heet **MEETFOUT** en wordt met de reden gerapporteerd. Voorbeeld uit V1.2: een `clip-path` met `calc()` werd door de regex niet gelezen en stil geboekt als "geen masker" (GAT-11). Stil = verboden. |
| **MC-4** | Elke verhoudingstoets rapporteert teller, noemer en absolute vloer. Noemer 0 → N.V.T.-met-reden volgens §6.8, nooit PASS en nooit een stille FAIL. |
| **MC-5** | De poort wordt gedraaid op **1774px en 1440px** (compositie), **390px** (richtingstoetsen in deel E) en met een schermafdruk op 1774px (deel A en B). De band **1200–1439px is in alle V1.2-documenten NIET GEMETEN** (`vibe-visual-grammar-v1.md §5`) en blijft dat; zie §6.9 punt 4. |

### 6.1.4 De vier eindverdicten

| verdict | voorwaarde |
|---|---|
| **GOEDGEKEURD** | 0 × FAIL in A, C, D, E · 0 × NEE en 0 × ONBEANTWOORD in B · 0 × N.V.T. zonder geslaagde vervangende eis · 0 × PENDING |
| **AFGEKEURD** | ≥ 1 × FAIL in A, of ≥ 2 × NEE in B op één sectie, of ≥ 1 × FAIL in C/D/E |
| **INCOMPLEET — CONTENT PENDING** | geen enkele FAIL, maar ≥ 1 × PENDING of ≥ 1 × N.V.T. De pagina mag bestaan en gebouwd blijven; zij mag **niet** als afgerond gelden en niet als voorbeeld voor een volgende pagina dienen |
| **NIET MEETBAAR** | MC-1, MC-2 of MC-3 vuurt |

**Er is geen vijfde uitkomst en geen "haalt 22 van 22".** De eindtelling van V1.2 (een breuk) is
afgeschaft: zij maakte het mogelijk dat een pagina met nul ontwerpbesluiten een perfecte score kreeg.

### 6.1.5 Wie en wanneer

| moment | wat | door wie |
|---|---|---|
| **FAS-00 · kaart** | modus per sectie, beeldslot per sectie met bestandsnaam en klasse, blauwdruk per sectie, claimstatus per claim | de bouwer |
| **FAS-01 · papier** | deel D volledig, deel B vragen B-03 en B-07 op de schets | reviewer (niet de bouwer) |
| **FAS-02 · gerenderd** | deel A, C, E machinaal + schermafdruk; deel B volledig per sectie | machine (A/C/E) + reviewer (B) |
| **FAS-03 · afsluiting** | het poortrapport volgens §6.1.6, met alle N.V.T.-redenen | de bouwer schrijft, de reviewer tekent |

FAS-02 vindt plaats **vóór** samenvoegen en vóór elke push. Een pagina zonder FAS-01 of zonder FAS-02 is
NIET MEETBAAR, niet GOEDGEKEURD.

### 6.1.6 Het rapportformaat

```
PAGINA        <pad>            BREEDTES 1774 / 1440 / 390
MODI          <per sectie: CANVAS | DOCUMENT | HYBRID>
MEETCONTRACT  MC-1 n_dom=<n> n_kaart=<n> · MC-2 · MC-3 <meetfouten of geen>
A  A-01..A-09  PASS/FAIL/N.V.T.(reden + vervangende eis + uitkomst daarvan)
B  B-01..B-07  per sectie JA/NEE + de waarneming in één regel · reviewer <naam>
C  VAR-01..VAR-06  waarde | drempel | PASS/FAIL/N.V.T.
D  D-01..D-06  PASS/FAIL/PENDING + bestandsnaam + klasse
E  E-01..E-04  waarde@1774 | waarde@1440 | waarde@390 | PASS/FAIL/N.V.T.
N.V.T.-TELLING <n>   PENDING-TELLING <n>
VERDICT  GOEDGEKEURD | AFGEKEURD | INCOMPLEET-CONTENT PENDING | NIET MEETBAAR
```

---

## 6.2 Classificatie van elke overgenomen meetwaarde

Homepagemetingen zijn bewijs, geen automatische regel. Elke numerieke waarde in dit hoofdstuk draagt
een klasse.

| klasse | betekenis | gevolg |
|---|---|---|
| **A TRANSFERABLE FLOOR** | geldt overal; het getal is een richting, een nul of een verhouding die niet uit één pagina komt | wordt poort |
| **B REFERENTIEBEREIK** | richtwaarde, geijkt op ten hoogste twee gemeten pagina's | wordt poort **mét** de marge erbij en de verplichting opnieuw te ijken na de derde pagina |
| **C HOMEPAGE-SPECIFIEK** | beschrijft Master v1 | wordt **geen** regel; staat hier alleen als bewijs |

### 6.2.1 De tabel

| waarde | bron | klasse | waarom |
|---|---|---|---|
| mediane werkbreedte verandert niet als het scherm groeit (home −0,1pp van 1440→1774; B2 −17,9pp) | `v12/hoofdoorzaak.md §1` | **A** | een richting, geen maat. Geldt in CANVAS en HYBRID, niet in DOCUMENT |
| beeldbreedte in %vw krimpt niet als het scherm groeit (home 0,0pp; B2 −2,2pp mediaan) | idem | **A** | idem |
| mediane werkbreedte ≥ 80% vw @1774 in CANVAS/HYBRID | home 90,5 · B2 68,1 | **B** | middenpunt 79,3 van twee pagina's, afgerond op 80,0 |
| hoekclustertolerantie 3,5° | G22-families | **B** | kleinste waarde die de smalste benoemde familie van de master (A2, interne afstand 3,3°) niet splitst |
| ≥ 3 hoekclusters per pagina | master 3 | **B** | master staat exact op de vloer, nul marge |
| hoekspreiding (max − min) ≥ 8,0° | master 26,5° · SYSTEEM-X 1,5° · B2 0,0° | **B** | ruim tussen de drie metingen gelegd |
| kaderclustertolerantie 2,0% vw | master: samengevoegd paar 1,18% vw, kleinste onderscheiden paar 2,03% vw | **A** | de drempel ligt in een gemeten gat in de verdeling zelf, niet op een gemeten waarde |
| unieke kaderclusters ÷ secties ≥ 0,70 | master 0,89 · SYSTEEM-X 0,11 | **B** | |
| kopgraadclustertolerantie ratio 1,07 | master: grootste stap binnen een cluster 1,046, kleinste stap tussen clusters 1,080 | **A** | ligt in een gemeten gat; als ratio draagbaar over elke typeschaal |
| ≥ 3 kopgraadclusters | master 3 · SYSTEEM-X 2 · **B2 5 (PASS)** | **B** | scheidt B2 NIET; zie §6.5.3 en §6.9 punt 2 |
| geometrie-element ≥ 0,5% van het sectievlak | kleinste op de master 0,72% | **B** | marge 0,22 procentpunt, dun |
| masker neemt ≥ 5% van de beeldrechthoek weg | laagste gemeten wegname 6% | **B** | marge 1 procentpunt, dun |
| beeld ≥ 40% vw valt onder de integratieregel | master beeldbreedtes 19,7 · 27,5 · 41,4 · 52,7 · 53,9 · 62 · 96,1 · 100 | **A** | 40 ligt in het gemeten gat 27,5→41,4 (13,9pp breed) |
| informatievlak ≥ 30.000px² @1774 (= 0,95% van vw²) | V-5-definitie | **B** | de strengste van de vier V1.2-definities; zie conflict K-2 |
| dominante zone HIGH ≥ 50% | master HIGH 82,4 · 71,0 · 52,7; hoogste niet-HIGH 51,5 | **B** | marge van de laagste HIGH boven de hoogste niet-HIGH is **1,2pp**; daarom óók de ordeningseis |
| kleinste verandering lichtste zijde tussen opeenvolgende secties 6,6pp | master S5→S6 | **C** | beschrijft Master v1 |
| drempel "zelfde splitsing" 2,0pp | onder de gemeten 6,6pp gelegd | **B** | marge 4,6pp |
| kaartrij max/min ≤ 1,06 = gelijk; verboden zone 1,06–1,55 | `vibe-card-system-v1.md §4.1` | **B** | master 1,051 en 1,668 ✓; B2 1,459 en 1,110 ✗ |
| lichtste zijde ≤ 45,0%, één benoemde gespiegelde uitzondering ≤ 48,6% | master 21,6 · 22,1 · 30,9 · 32,5 · 34,0 · 41,9 · 42,0 · 48,6 | **B** | lost conflict K-1 op |
| overlapparen 454 ÷ 52, nulsecties 0 ÷ 4 | `v12/kritiek-ontduiking.md` | **C** | elke numerieke vorm hiervan is aantoonbaar namaakbaar; wordt reviewvraag B-02, geen poort |
| sectiehoogte max/min 1,54 · hoogteclusters 6 van 9 | master | **C** | plafond zonder vloer in V1.2; de vloer is niet onafhankelijk geijkt, blijft bewijs |
| beelddekking 43,7% bruto / 37,2% na maskeraftrek | `vibe-image-system-v1.md §0` | **C** | de V1.2-formule telt overlappende beelden dubbel (GAT-05); zonder verenigingsmeting geen poort |
| kopgraadvloer 2,99% vw (53px @1774) | master min 53px · B2 min 32px = 1,80% vw | **C** hier | hoort in het typografiehoofdstuk, niet in de poort; zie §6.9 punt 2 |
| kleinste kop 53px, mediaan B2 44px | `v12/hoofdoorzaak.md §5` | **C** | |
| 11 `<br>` in 7 van 8 koppen | idem §6 | **C** | DOM-telling is namaakbaar (GAT-21); wordt reviewvraag B-06 |

---

## 6.3 DEEL A — STRUCTURELE HARD FAILS

Negen condities. Eén FAIL = AFGEKEURD. Elke conditie is op een schermafdruk van 1774px óf in een
gemeten rechthoek waarneembaar; geen enkele leest een CSS-eigenschap als bewijs van verschijning.

### A-01 · Dominante desktopinhoud opgesloten in een smal gecentreerd document zonder bewuste reden

| | |
|---|---|
| **Waarneembaar als** | op de schermafdruk @1774px staat de inhoud van de sectie in een kolom met lege marges links en rechts, en de sectie draagt geen gedeclareerde DOCUMENT MODE |
| **Meting** | werkbreedte = afstand van de meest linkse tot de meest rechtse rand van een element dat tekst of beeld draagt, als % van 1774. Mediaan over alle secties in CANVAS of HYBRID MODE |
| **FAIL** | mediane werkbreedte < **80,0% vw @1774** in de secties die CANVAS of HYBRID declareren |
| **Bewijs** | home 90,5% @1774 en 90,6% @1440 — PASS met 10,5pp marge. B2 **68,1% @1774** en 86,0% @1440 — FAIL met 11,9pp marge. B2 haalt de drempel op 1440 wél: **deze toets moet op de breedste gemeten breedte draaien, anders vindt hij het defect niet** |
| **N.V.T.** | alle secties declareren DOCUMENT MODE → vervangende eis E-04 |
| **Klasse** | 80,0% = **B** (middenpunt van twee pagina's) |

### A-02 · Groot beeld dat de integratieregel niet haalt

**De integratieregel.** Een beeld van ≥ 40% vw draagt minstens **twee** van de vijf onderstaande
middelen. Elk middel heeft een maatvloer, want zonder maatvloer waren alle vijf met onzichtbare
elementen af te vinken (GAT-03, GAT-06, GAT-09).

| middel | maatvloer | master |
|---|---|---|
| (a) het beeld raakt ≥ 1 schermrand | de raking is op de schermafdruk zichtbaar; een `<div>` van 3×3px op `left:0` is geen raking | 4 secties met een beeld aan de rand |
| (b) polygoonmasker | neemt ≥ **5%** van de beeldrechthoek weg | 5 van 8 beeldvlakken gemaskeerd; laagste gemeten wegname **6%** |
| (c) informatievlak op het beeld | ≥ **30.000px² @1774** (0,95% van vw²), ≥ 50% van zijn eigen oppervlak op beeldpixels, en luminantiecontrast met de ondergrond ≥ **2,2:1** | 4 van 9 secties streng gemeten; 6 van 9 met de ruime definitie |
| (d) kaal type op de beeldpixels | ≥ **5 woorden** | ≥ 4 secties (S1, S2, S3, S9) |
| (e) een kaart of vlak kruist een beeldrand | het kruisende element is ≥ 2% van het sectievlak | S6 strook 629×124 over een foto van 734×557; S7 vier kaarten 422×126 op 1100×736; S8 kaart 305×272 op 935×631 |

| | |
|---|---|
| **FAIL** | er is ≥ 1 beeld ≥ 40% vw dat < 2 middelen draagt |
| **Bewijs** | home: 5 beelden ≥ 50% vw, alle in secties met masker en/of vlak — PASS. B2: 1 beeld ≥ 50% vw, **0 van 5 beeldvlakken gemaskeerd**, 0 tot 1 informatievlak op beeld in 11 secties — FAIL |
| **Waarom niet ≥ 10% vw zoals U-1** | met 10% viel de eis ook op duimnagels en werd zij met een onzichtbaar verloop afgevinkt. 40% ligt in het gemeten gat 27,5 → 41,4% vw van de master |
| **N.V.T.** | de pagina heeft 0 beelden ≥ 40% vw → vervangende eis A-02-V: de pagina draagt in ≥ 2 secties een gebouwd, niet-fotografisch visueel object van ≥ 25% van het sectievlak (bijvoorbeeld M0: diagram, console, voortgangsrij) dat als dominante zone meetbaar is. Nul beelden en nul gebouwde objecten → **FAIL**, niet N.V.T. |
| **Klasse** | 40% vw = **A** · 5% masker en 30.000px² = **B** · 2,2:1 = **B** |

### A-03 · Opeenvolgende secties die dezelfde splitsing of compositie herhalen

| | |
|---|---|
| **Compositiesignatuur** | het viertal (modus · zijde van de dominante zone: L/M/R · lichtste-zijdecluster op 2,0pp · kaderclusterindex op 2,0% vw) |
| **FAIL** | twee opeenvolgende secties hebben een identieke signatuur |
| **Bewijs** | master, lichtste zijde per sectie in paginavolgorde: S1 22,1 · S2 30,9 · S3 21,6 · S4 32,5 · S5 48,6 · S6 42,0 · S7 34,0 · S8 41,9 (`vibe-visual-grammar-v1.md` G19). Kleinste verandering tussen twee opeenvolgende secties: **6,6pp** (S5→S6). Met een tolerantie van 2,0pp vuurt de toets op de master in 0 van 7 paren, marge 4,6pp |
| **SYSTEEM-X** | negen keer 50,0% en negen keer dezelfde flexrij → de signatuur is in alle 8 paren identiek → **FAIL** |
| **Aanvullend** | 0 van 8 tweedelingen op de master is 50/50; de dichtstbijzijnde is 48,6% en dat is de enige gespiegelde sectie. Een tweedeling op **50,0 ± 2,0%** is daarom zelf een signaal en wordt geteld in VAR-01 |
| **N.V.T.** | de pagina heeft < 2 secties met een meetbare tweedeling → vervangende eis: VAR-01 wordt verplicht en de zijde van de dominante zone mag niet in ≥ 3 opeenvolgende secties gelijk zijn |
| **Klasse** | 2,0pp = **B** · 6,6pp = **C** |

### A-04 · HIGH-sectie zonder dominant visueel element

| | |
|---|---|
| **Dominante zone** | (breedte van de grootste aaneengesloten visuele zone als % vw × hoogte als % sectiehoogte) ÷ 100 |
| **FAIL** | een sectie die HIGH declareert heeft een dominante zone < **50%**, **of** een sectie die HIGH declareert heeft een kleinere dominante zone dan een sectie op dezelfde pagina die MEDIUM of QUIET declareert |
| **Bewijs** | master HIGH = S1 82,4 · S3 71,0 · S8 52,7; hoogste niet-HIGH = S7 51,5; pagina max÷min = 5,02. De marge van de laagste HIGH boven de hoogste niet-HIGH is **1,2pp** — daarom is de ordeningseis nodig naast de vloer: de vloer alleen scheidt niet (B2 bereikt 50,1 op de breedst gemeten sectie) |
| **Tegenrichting** | V1.2 kende alleen een **plafond** (R1: max 3 HIGH) en een eis van ≥ 2 QUIET-blokken. **Nul HIGH-secties overtrad niets** (GAT-26). Nieuw: elke pagina van ≥ 5 secties declareert ≥ 1 HIGH |
| **N.V.T.** | pagina van < 5 secties zonder HIGH-declaratie → vervangende eis: pagina max÷min van de dominante zones ≥ **2,0** |
| **Klasse** | 50% = **B** · de ordeningseis = **A** (relatie, geen maat) |

### A-05 · Kaarten als gelijk raster zonder gelijke inhoud

| | |
|---|---|
| **Gelijke rij** | ≥ 3 kaarten naast elkaar met max÷min van de breedtes ≤ **1,06** |
| **Gelijke inhoud** | elke kaart in de rij heeft hetzelfde aantal tekstvelden **en** alle kaarten dragen een beeld of geen enkele |
| **FAIL** | (i) een gelijke rij met ongelijke inhoud; **of** (ii) een rij van ≥ 3 kaarten met max÷min in de **verboden zone 1,06 < max÷min < 1,55**; **of** (iii) > 1 gelijke rij per pagina |
| **Bewijs** | master: S2-onderrij 371 · 353 · 355 = **1,051** (gelijk) en elke kaart draagt een foto tot alle vier haar randen; de naden verspringen 116 en 65px ten opzichte van de rij erboven. Tweede gemeten rij 1,668 — buiten de zone. B2: **1,459 en 1,110 — beide in de verboden zone → FAIL**. Dit is volgens `vibe-card-system-v1.md §4.1` de enige kaartrijmaat waarop de twee pagina's elkaar uitsluiten, en hij stond in **geen enkele V1.2-poort** |
| **Waarom de zone en niet alleen "identiek"** | V1.2 rondde breedtes af op 5px; een jitter van 6px (400 / 406 / 412) maakte een gelijke rij onvindbaar en haalde tegelijk de "praktisch gelijk"-zone van §4.1. Breedtes worden nu exact vergeleken met een tolerantie van **0,5% vw (9px @1774)** |
| **N.V.T.** | de pagina heeft 0 rijen van ≥ 3 kaarten → de toets is N.V.T.; **een pagina zonder kaartrijen is geen geslaagde kaartrijtoets** |
| **Klasse** | 1,06 / 1,55 = **B** · 0,5% vw = **B** |

### A-06 · Decoratieve geometrie zonder structurele rol

| | |
|---|---|
| **Weegvloer** | een geometrie-element telt alleen mee als het ≥ **0,5% van het sectievlak** beslaat; een masker alleen als het ≥ **5% van de beeldrechthoek** wegneemt |
| **Structurele rol** | precies één van: (1) het vormt de sectiegrens; (2) het snijdt een beeld; (3) het sluit een hoek waar het beeld de schermrand niet bereikt; (4) het draagt tekst of een kaart |
| **FAIL** | een meetellend geometrie-element heeft geen van de vier rollen, en het aantal zulke elementen is > **⌈n_secties ÷ 9⌉** |
| **Bewijs** | master: 13 `clip-path`-dragers in 7 van 9 secties plus 3 SVG-vormen; **11 van 13 structureel, 1 decoratief (de 25°-vorm), 1 schaduwvlak onder een gebouwd object** (`vibe-visual-grammar-v1.md` G-geometrie). `brandbook §4.1.5` begrenst vrijstaande versiering op 1 per 9 secties → master op de grens, PASS. Kleinste meetellend element 85×133 = 11.305px² op 1.573.538px² = **0,72%** |
| **Wat het vangt** | de HOEKNIK van SYSTEEM-X: 3,0 × 5,0px, weggesneden oppervlak **0,0037%** van het beeld en **0,0005%** van het sectievlak → telt niet mee, dus P-06, P-12, P-13, V-4 en U-1-middel-1 vallen niet meer in één CSS-declaratie om |
| **N.V.T.** | 0 meetellende geometrie-elementen → vervangende eis: ≥ 2 secties dragen een beeld dat ≥ 1 schermrand raakt, of ≥ 2 secties dragen een eigen grond die van de buursectie verschilt (VAR-05) |
| **Klasse** | 0,5% en 5% = **B**, beide met een dunne marge (0,72 en 6,0 gemeten) |

### A-07 · Verzonnen of onderbouwingsloze claim of visual

| | |
|---|---|
| **FAIL (claim)** | een getal, superlatief of resultaatuitspraak zonder status uit `brandbook §1A.7` (`VERIFIED` · `SUPPORTED` · `UNVERIFIED` · `CONFLICTING` · `REMOVE/REWRITE REQUIRED`) en zonder bronverwijzing; **of** een claim met status `CONFLICTING` of `UNVERIFIED` die toch gepubliceerd staat |
| **FAIL (visual)** | een beeld dat een project, locatie of meting voorstelt die niet in het projectregister staat; **of** een synthetisch/gegenereerd beeld (`brandbook §4.4`) |
| **Bewijs** | `ems-hero` en `energiehandel-hero` zijn dezelfde synthetische opname met onleesbare, verzonnen opdruk op de meters en staan in klasse **D** (`v13/BEWIJS-assets.md §2-§3`) → mogen nergens worden gebruikt. Claim "645 kWh batterijopslag" staat op twee **verschillende** projecten (`project-ratio-16.html:68`, `project-hedin-alkmaar.html:67`) en wordt op drie pagina's hergebruikt (`systeem-ems.html:188`, `:193`, `industrie-vastgoed.html:180`) → status `CONFLICTING` → publicatie van die claim is FAIL tot opgelost |
| **N.V.T.** | de sectie draagt 0 getallen en 0 resultaatuitspraken → de toets is N.V.T. voor die sectie; dat is geen PASS en telt mee in de N.V.T.-telling |
| **Grens van deze toets** | de poort toetst **aanwezigheid van status en bron**, niet de waarheid van de bron. Zie §6.9 punt 6 |
| **Klasse** | geen numerieke drempel |

### A-08 · Vereiste asset ontbreekt en is stilzwijgend vervangen

| | |
|---|---|
| **FAIL** | (i) een beeldslot draagt een bestand uit een klasse die lager is dan de behandeling vraagt — **klasse C nooit in M1 PODIUM, M2 PANEEL of M4 BAND**; (ii) een beeldslot draagt een **klasse D**-bestand (duplicaatnaam of synthetisch); (iii) hetzelfde bestand of dezelfde opname staat twee keer op één pagina; (iv) een slot is leeg zonder PENDING-markering in de kaart |
| **Bewijs** | 36 bestanden, ongeveer **27 verschillende opnamen**. Gemeten duplicaten: `capaciteit-hero` = `energieopslag-hero` · `ems-hero` = `energiehandel-hero` · `microgrids-hero` = `netcongestie-hero` · `energy-hubs-hero` = `laadplein-hero` = `projects/hedin-amsterdam` · `vastgoed-hero` = `residentieel-hero` · `projects/ratio-16` = `projects/ratio16` (`v13/BEWIJS-assets.md §2`). Een klasse-C-beeld in M1/M2/M4 verliest zijn onderwerp: een grondfoto overleeft hooguit ~20% snede, een dronefoto ~55% |
| **Waarom dit een hard fail is** | op de vijf papieren pagina's van de V1.2-test waren **17 van de 28 beeldslots leeg** en werden stilzwijgend door hergebruik gevuld (`scratchpad/papiertest.md §9 toets 4) |
| **N.V.T.** | bestaat niet. Een leeg slot is **PENDING** (deel D), nooit N.V.T. en nooit PASS |
| **Klasse** | de klasse-indeling zelf = **A** (regel, geen maat); 55% / 20% sneden = **B** |

### A-09 · Desktopontwerp dat slechts een vergrote mobiele opmaak is

| | |
|---|---|
| **FAIL** | de pagina haalt **geen enkele** van de drie bewegingen E-01, E-02 en E-03 (§6.7) |
| **Waarneembaar als** | leg de schermafdruk @390px en @1774px naast elkaar: als de tweede dezelfde elementen in dezelfde volgorde, dezelfde stapeling en dezelfde onderlinge verhoudingen laat zien, alleen groter, dan is het één ontwerp op twee schalen |
| **Bewijs dat de master dit niet is** | drie gemeten bewegingen: (1) stapeling → naast elkaar, 8 tweedelingen op desktop; (2) **28 regels `br{display:none}` onder 1200px** en 11 zichtbare `<br>` op 1774px (`vibe-visual-grammar-v1.md` G21, G24); (3) de primaire knop is **9× identiek** volle breedte onder 768px (`brandbook §1A.6` punt 4) |
| **N.V.T.** | bestaat niet. Een pagina die op 390px identiek is aan 1774px is altijd te meten |
| **Klasse** | **A** (telling van bewegingen, geen maat) |

---

## 6.4 DEEL B — VISUELE REVIEWCRITERIA

**Waarom dit deel bestaat.** De ontwerplaag van V1.2 — de M-, K-, CB- en B-codes, de impactniveaus,
de blauwdruknamen — werd door geen enkele poort gelezen en was dus **zelfgerapporteerd** (GAT-24,
GAT-27). Dat is de reden dat negen identieke flexrijen een kaart konden dragen die "M1 PODIUM ·
M5 KAARTBEELD · M2 PANEEL · M4 BAND" zei. Deze zeven vragen vervangen die laag niet door een getal —
ze geven hem aan een mens.

**Wie.** Een reviewer die de pagina **niet zelf heeft gebouwd**. De bouwer mag zijn eigen review niet
beantwoorden; dat was precies de fout die V1.2 toeliet.

**Wanneer.** B-03 en B-07 op de papieren schets (FAS-01, vóór code). Alle zeven op de gerenderde pagina
(FAS-02), per sectie, op 1774px met een volledige schermafdruk **én** een live scroll, vóór samenvoegen.

**Vorm.** Per sectie per vraag: `JA` of `NEE` plus één regel waarneming met een genoemd element.
**`JA` zonder waarneming geldt als `ONBEANTWOORD`, en ONBEANTWOORD is geen PASS** (§6.8 regel F-3).

**Gewicht.** ≥ 2 × NEE op één sectie → de sectie gaat terug. ≥ 1 × NEE op B-06 → de pagina gaat
terug, ongeacht de rest. Er is geen score en geen gemiddelde: dit deel wordt niet opgeteld.

| # | vraag | waar je naar kijkt | onvoldoende antwoord |
|---|---|---|---|
| **B-01** | Heeft de sectie een duidelijk dominant element? | welk element je als eerste ziet als je de schermafdruk 2 seconden bekijkt; of dat hetzelfde element is dat de dominante-zonemeting (A-04) aanwijst | "de kop en het beeld zijn even belangrijk"; of: de meting wijst een ander element aan dan de reviewer noemt |
| **B-02** | Is de diepte bewust? | liggen vlakken, kaarten of type ÓP beeld, of staan alle elementen naast elkaar in één laag; kruist iets een beeldrand | "er is een schaduw". Een schaduw is geen laag. Meetwaarde als context, niet als antwoord: home 11 vlakken in 6 van 9 secties voor > 25% op een beeld, B2 2 in 2 van 11 |
| **B-03** | Is de relatie tussen tekst en beeld sterk? | zegt de tekst iets over dít beeld; zou een ander beeld uit de voorraad even goed passen | "het beeld is sfeerbeeld". Op vier van de vijf papieren pagina's stond de sitebrede voetfoto (batterijkasten) op een pagina over zonnepanelen, EMS of vastgoed |
| **B-04** | Is de schermbreedte zinvol gebruikt? | wat er in de buitenste 15% links en rechts gebeurt op 1774px | "daar staat marge". In CANVAS MODE is lege buitenmarge over de volle sectiehoogte een NEE; in DOCUMENT MODE is het een JA mits de marge een gedeclareerde keuze is |
| **B-05** | Is de leegte beheerst? | ligt de leegte op gekozen plekken of overal evenveel; is er één plek waar het ontwerp bewust niets doet | leegte die ontstaat omdat de inhoud korter was dan het vak. Gemeten voorbeeld op de master zelf: de rechterhelft van S6 bleef leeg en de bandhoogte is daarom **met de hand verlaagd van 17,7 naar 13,6cqw** — dat is beheerste leegte; hetzelfde vak zonder die ingreep is het niet |
| **B-06** | Is er een herkenbare Vibe-signatuur? | zou je deze sectie zonder logo als Vibe herkennen: de scherpe hoek (familie 31,6–36,2°), de snede die de sectiegrens IS, type dat op beeldpixels staat, de handgezette regelval van de kop | "de kleuren zijn blauw". Een geometrie-element dat de weegvloer van A-06 niet haalt bestaat voor deze vraag niet |
| **B-07** | Heeft de sectie een ander silhouet dan de secties ernaast? | leg de drie opeenvolgende schermafdruk-fragmenten naast elkaar en kijk alleen naar de buitenvorm: waar begint en eindigt de inhoud, waar zit de dominante zone, hoe hoog is de sectie | "de kleuren verschillen". Gelijke buitenvorm met een andere grond is een NEE |

**Wat dit deel kost.** 7 vragen × n secties. Op een pagina van 9 secties zijn dat 63 antwoorden met
63 waarnemingen. Dat is de prijs voor het sluiten van de zelfrapportage.

---

## 6.5 DEEL C — HERHALINGSGRENZEN MET WEGING

**De V1.2-fout die hier wordt gerepareerd.** Vier hoekwaarden binnen **1,5°** (31,0 · 30,5 · 30,0 ·
29,5) telden als vier unieke waarden; negen containerbreedtes binnen **0,68% vw** (stappen van 12px)
telden als negen unieke kaders; negen kopgraden met een trap van 1px telden als negen unieke graden.
Tellen zonder afstand is geen variatietoets.

### 6.5.1 De twee weegregels, voor alle zes toetsen

| regel | inhoud |
|---|---|
| **W-1 MAATVLOER** | een object telt pas mee als het de maatvloer van zijn soort haalt (A-06: geometrie ≥ 0,5% sectievlak, masker ≥ 5% beeldrechthoek; A-05: kaartbreedtes met tolerantie 0,5% vw; informatievlak ≥ 30.000px² @1774 met contrast ≥ 2,2:1) |
| **W-2 AFSTAND** | twee waarden gelden als verschillend als hun afstand ≥ de clustertolerantie τ van hun soort is. Clustering met **enkelvoudige koppeling**: waarden in één keten zijn één cluster. Geteld worden **clusters**, nooit ruwe waarden |

**Hoe elke τ is bepaald.** Niet gekozen, maar in een gemeten gat gelegd: τ ligt boven de grootste
afstand die de master zelf als "dezelfde waarde" behandelt en onder de kleinste afstand die hij als
"een andere waarde" behandelt. Waar dat gat ontbreekt, staat het erbij.

### 6.5.2 VAR-01 · Splitsingen

| | |
|---|---|
| **Meting** | per sectie de lichtste zijde van de hoofdtweedeling = `min(a,b) ÷ (a+b)` van de breedtes van de twee zones (`zones.mjs` blok 1) |
| **τ** | **2,0 procentpunt**. Gemeten gat: de kleinste verandering tussen twee opeenvolgende secties op de master is **6,6pp** (S5 48,6 → S6 42,0); de kleinste afstand tussen twee willekeurige waarden is 0,1pp (S8 41,9 / S6 42,0) maar die secties zijn niet aaneensluitend. τ = 2,0 vuurt op de master in 0 van 7 opeenvolgende paren |
| **PASS** | (i) geen tweedeling met lichtste zijde > **45,0%**, met maximaal **één** benoemde gespiegelde uitzondering tot **48,6%**; (ii) ≥ **0,50 × n_tweedelingen** verschillende clusters; (iii) geen tweedeling op 50,0 ± 2,0% |
| **Bewijs** | master 21,6 · 22,1 · 30,9 · 32,5 · 34,0 · 41,9 · 42,0 · 48,6: clusters op 2,0pp = {21,6 22,1} {30,9 32,5 34,0} {41,9 42,0} {48,6} = **4 op 8 = 0,50**. Een vloer van 0,60 zou **de master zelf afkeuren**; vandaar 0,50, met de master exact op de vloer en nul marge — zie DR-Q-07. SYSTEEM-X: 9× 50,0 → 1 cluster = 0,11 **en** (iii) FAIL |
| **N.V.T.** | 0 meetbare tweedelingen → **FAIL met reden "niet meetbaar"**, nooit PASS. In V1.2 filterde de poort op `display:grid` met exact twee kolommen; bij flexbox bleef de lijst leeg en gaf `[].every()` `true`, waardoor negen 50/50-secties PASS kregen. De meting is daarom mechanisme-onafhankelijk: de twee breedste niet-overlappende zichtbare kinderen die samen ≥ 50% vw beslaan en elk ≥ 1 tekstknoop of beeld dragen. Levert dat niets op, dan is er geen tweedeling en moet de sectie één dominante zone ≥ 70% hebben — anders FAIL |
| **Klasse** | 45,0 / 48,6 = **B** · 2,0pp = **B** · 0,50 = **B** (master op de vloer) |

### 6.5.3 VAR-02 · Inhoudskaders

| | |
|---|---|
| **Meting** | per sectie de breedte van het buitenste kader dat de inhoud begrenst, in px @1774 |
| **τ** | **2,0% vw = 35,5px @1774**. Gemeten gat in de master zelf: het paar dat zij als **hetzelfde** kader behandelt staat 21px = **1,18% vw** uit elkaar (1584 / 1605); het kleinste paar dat zij als **verschillend** behandelt staat 36px = **2,03% vw** uit elkaar (1704 / 1740). τ ligt in dat gat |
| **PASS** | unieke clusters ÷ n_secties ≥ **0,70** **én** geen cluster in > **3** secties |
| **Bewijs** | master 568 · 634 · 726 · 822 · 1133 · 1584 · 1605 · 1704 · 1740 → clusters {568} {634} {726} {822} {1133} {1584 1605} {1704} {1740} = **8 op 9 = 0,89**, grootste cluster **2** — PASS. SYSTEEM-X 1240…1336 in stappen van 12px → **1 cluster = 0,11**, grootste cluster **9** → FAIL op beide helften. V1.2 gaf hier 1,00 en "grootste groep 1" |
| **N.V.T.** | de pagina declareert in alle secties CANVAS MODE zonder kader (de inhoud reikt tot de schermranden) → vervangende eis: ≥ 0,70 verschillende clusters van de **dominante-zonebreedte** in plaats van de kaderbreedte |
| **Klasse** | τ = **A** (ligt in een gemeten gat, als % vw draagbaar) · 0,70 en 3 = **B** |

### 6.5.4 VAR-03 · Kopgraden

| | |
|---|---|
| **Meting** | de gerenderde graad van elke H1/H2 @1774. De H1 wordt op `tagName` geïdentificeerd, **niet** op positie: V1.2 gooide met `graden.slice(1)` de eerste gemeten kop weg en meette daardoor bij twee koppen in sectie 1 iets anders dan het dacht |
| **τ** | **ratio 1,07**. Gemeten gat: de grootste stap binnen een cluster op de master is **1,046** (61 / 58,3), de kleinste stap tussen twee clusters **1,080** (58,3 / 54). Een ratio in plaats van px, zodat de drempel op elke typeschaal draagbaar is |
| **PASS** | ≥ **3** clusters |
| **Bewijs** | master 53 · 54 · 58,3 · 61 · 61,5 · 64 · 66 · 76,5 → {53 54} {58,3 61 61,5 64 66} {76,5} = **3 clusters**, exact op de vloer. SYSTEEM-X 44…51 + 66 → {44…51} {66} = **2** → FAIL |
| **Wat deze toets NIET vangt** | **B2 haalt hem.** 32 · 32 · 44 · 44 · 44 · 44 · 49 · 54 · 60 · 62 → {32 32} {44×4} {49} {54} {60 62} = **5 clusters** = PASS. Het B2-defect is niet de spreiding maar de **vloer**: de kleinste kop van de master is 53px = 2,99% vw, de mediaan van B2 is 44px en zes van elf secties zitten op 44px of lager (1,80–2,48% vw). Een vloer hoort in het typografiehoofdstuk; zonder die vloer vangt deze poort het B2-geval niet. Zie §6.9 punt 2 |
| **N.V.T.** | < 3 koppen op de pagina → de toets is N.V.T.; vervangende eis: de enige of de twee koppen staan in verschillende clusters van VAR-02 (verschillend kader) of verschillende modi |
| **Klasse** | τ = **A** · ≥ 3 clusters = **B** (master op de vloer) · de vloer 2,99% vw = **C** hier |

### 6.5.5 VAR-04 · Hoeken

| | |
|---|---|
| **Meting** | de hoek vanaf de verticaal van elke rand van een geometrie-element of masker dat de weegvloer W-1 haalt |
| **τ** | **3,5°**. Gemeten gat: de master zet twee randen langs dezelfde visuele lijn **identiek tot op 0,1°** (3 van 3 gemeten, G05) — dat is zijn eigen gelijkheidstolerantie. Zijn smalste benoemde familie A2 (beeldsnede in de flow) bestaat uit **9,7 en 13,0°**, afstand **3,3°**, en is één gebaar; de afstand naar het volgende gebaar is **12,0°**. τ = 3,5 is de kleinste waarde die A2 niet splitst |
| **Zichtbaarheidscontrole** | bij 33° verschuift een rand per graad met 0,0248 × de lengte van zijn verloop. Op het kleinste meetellende element van de master (verloop 133px) is 3,5° = **11,5px**; op de S7-foto (verloop 736px) **64px**; over de volle viewport **154px**. 0,1° is op dat laatste verloop 1,8px — terecht "gelijk" |
| **PASS** | ≥ **3** clusters **én** spreiding (max − min) ≥ **8,0°** |
| **Twee tellingen van dezelfde pagina** | het aanvaarde bewijs noemt **13 elementen met 14 hoekwaarden** (de harnasrun, die alleen `clip-path`-polygonen leest); `vibe-visual-grammar-v1.md` G22 noemt per familie **16 unieke randwaarden** (inclusief de drie SVG-vormen en de 25°-eenling). Beide zijn juist voor hun eigen meetdefinitie. De clustering hieronder gebruikt de 16 van G22, omdat zij de enige telling is waarvan de afzonderlijke waarden zijn opgeschreven. Met de 14 van het harnas verandert het clusteraantal niet, want de twee extra waarden (25,0 en één SVG-rand) vallen binnen bestaande clusters — **dat is afgeleid, niet opnieuw gemeten** |
| **Bewijs** | master, 16 unieke waarden over 9,7–36,2°, spreiding **26,5°** → clusters op 3,5° = {9,7 13,0} {25,0 27,3 28,1} {31,6 32,1 32,6 32,7 32,8 33,7 34,4 35,4 35,8 35,9 36,2} = **3 clusters**, exact op de vloer. SYSTEEM-X 29,5…31,0 → **1 cluster**, spreiding **1,5°** → FAIL op beide helften (V1.2 gaf hier "4 unieke hoekwaarden" en PASS). B2: 4 elementen, **viermaal exact 34,0°** → 1 cluster, spreiding **0,0°** → FAIL |
| **N.V.T.** | < 4 meetellende geometrie-elementen → de toets is N.V.T.; vervangende eis: A-06 N.V.T.-variant (≥ 2 beelden aan een schermrand of ≥ 2 verschillende sectiegronden) |
| **Klasse** | τ = **B** (geijkt op één pagina, maar met een gemeten gat van 3,3 → 12,0°) · ≥ 3 clusters = **B** · 8,0° = **B** |

### 6.5.6 VAR-05 · Sectiegronden

| | |
|---|---|
| **Meting** | de gerenderde grond van elke sectie als exacte computed-string; verlopen inclusief richting en stops |
| **τ** | geen. Exacte vergelijking, want een grond die gelijk is aan zijn buur is op de schermafdruk gelijk |
| **PASS** | unieke gronden ÷ n_secties ≥ **0,55** **én** geen twee opeenvolgende secties met dezelfde grond, tenzij de sectiegrens door een geometrie-element of beeldsnede wordt gevormd |
| **Bewijs** | master 9 gronden waarvan `#FCFDFE` 3× → **7 unieke = 0,78** — PASS. SYSTEEM-X: alles `#FFFFFF` → **1 = 0,11** → FAIL. V1.2 meldde hier PASS omdat het grondkenmerk T5 in het harnas **hardcoded op `false`** stond (`poorten.mjs:794`, met de notitie "vul met de hand uit kaartveld 5"); het kaartrasterkenmerk T3 stond op regel 792 óók op `false`. Twee van de zes herhalingskenmerken vuurden in de automatische run nooit |
| **N.V.T.** | bestaat niet. Elke sectie heeft een gerenderde grond |
| **Klasse** | 0,55 = **B** |

### 6.5.7 VAR-06 · Beeldbehandelingen en beeldbronnen

| | |
|---|---|
| **Meting** | de behandelingsklasse wordt **uit de meting afgeleid**, niet uit de kaart gelezen: het vijftal (beeldbreedte in %vw afgerond op het dichtstbijzijnde cluster van 5pp · randcontact ja/nee · masker ≥ 5% ja/nee · informatievlak op het beeld ja/nee · is het een echt `<img>` ja/nee) |
| **PASS** | (i) ≥ **4** verschillende afgeleide klassen op een pagina van ≥ 7 secties, ≥ **3** op 5–6 secties, ≥ **2** daaronder; (ii) geen klasse in > **2** secties; (iii) geen bestand én geen opname twee keer op één pagina; (iv) nooit twee opeenvolgende secties met hetzelfde bestand |
| **Bewijs** | master: 7 verschillende behandelingen op 9 secties (`vibe-design-quality-gate-v1.md §1.5`) — PASS. SYSTEEM-X: 1 klasse → FAIL. B2: 1 klasse → FAIL. Pagina X uit de papieren test — drie keer dezelfde blauwdruk, dezelfde behandeling, dezelfde kaartfamilie **en hetzelfde fotobestand** — haalde 22 van 22 in V1.2 omdat geen enkel kaartveld het bestandspad vastlegde; (iii) en (iv) vangen haar |
| **Waarom uit de meting en niet uit de kaart** | V1.2 las de taxonomie nergens. Een kaart met "M1 PODIUM · M5 KAARTBEELD · M2 PANEEL · M4 BAND" boven negen identieke flexrijen werd door geen enkele poort tegengesproken |
| **N.V.T.** | 0 beelden op de pagina → de toets is N.V.T.; vervangende eis A-02-V (≥ 2 gebouwde niet-fotografische objecten van ≥ 25% van het sectievlak) |
| **Klasse** | 4 / 3 / 2 klassen = **B** · "≤ 2 secties per klasse" = **B** (gelijk aan MFQ-01 van V1.2) · (iii) en (iv) = **A** |

### 6.5.8 Over paginagrenzen heen — VAR-07 SITEHERHALING

De V1.2-papiertest zakte op precies dit punt: over vijf pagina's en 36 secties waren **36
inhoudskaders, 32 kopgraden, 22 tweedelingen en 36 overlapparenwaarden** ontworpen en daarvan kwam
**100% uit de Homepage Master; nul nieuwe maatwaarden**. Alle 75 genummerde V1.2-regels waren
gescopeerd op één pagina of één sectie; **nul** regel legde twee pagina's tegen elkaar.

| | |
|---|---|
| **Meting** | één siteregister met per pagina: de kaderclusters (VAR-02), de kopgraadclusters (VAR-03) en de beeldbestanden |
| **PASS** | over n pagina's: ≥ **0,40 × n** kaderclusters die op geen eerdere pagina voorkomen, ≥ **0,30 × n** kopgraadclusters idem, en geen beeldbestand op > **1** pagina |
| **Bewijs** | de drempels 0,40 en 0,30 zijn **niet gemeten** — er zijn geen twee pagina's die elkaar onder deze definitie zijn vergeleken. **GRENS TE IJKEN**, en daarom is VAR-07 tot de eerste ijking een **reviewvraag**, niet een poort: *"welke maat op deze pagina komt niet van de homepage, en waarom die?"* |
| **Klasse** | 0,40 / 0,30 = **NIET GEMETEN** |

---

## 6.6 DEEL D — INHOUDS- EN ASSETHAALBAARHEID

**Grondregel.** Een sectie kan niet worden goedgekeurd als de inhoud of het beeld niet bestaat. Een
niet-bestaand beeld is geen ontwerpvrijheid en geen N.V.T.; het is **PENDING**, en PENDING maakt het
eindverdict `INCOMPLEET — CONTENT PENDING`.

**De klassen uit hoofdstuk 2**, met het aantal gemeten bestanden en wat elke klasse mag dragen:

| klasse | n | mag dragen | mag nooit dragen |
|---|---:|---|---|
| **A** sterk architectuur-/projectbeeld | 9 | HIGH-sectie · M1 PODIUM · M2 PANEEL · M4 BAND | — |
| **B** bruikbaar ondersteunend | 10 | MEDIUM · M3 DRAAGVLAK · M6 HOEKBEELD; HIGH alleen met een aangehecht bewijsvlak | M1/M2/M4 zonder bewijsvlak |
| **C** detail / product / mens | 9 | M3 · M5 KAARTBEELD · M6 · duimnagel | **M1, M2, M4** — het onderwerp overleeft de snede niet |
| **D** zwak of duplicaat | 8 | niets; verwijst naar het origineel | alles |
| **PENDING** | per pagina | niets; de sectie krijgt een niet-fotografisch middel | elk fotografisch slot |

**De rekensom die dit deel noodzakelijk maakt.** Van de ~27 verschillende opnamen zijn er **9 klasse
A**. Over 48 pagina's is dat **minder dan één sterk beeld per pagina**. Een systeem dat per pagina
acht tot tien unieke klasse-A-foto's vraagt, is niet uitvoerbaar; daarom moeten niet-fotografische
middelen een MEDIUM-sectie **zelfstandig** kunnen dragen (`v13/BEWIJS-assets.md §4`).

| # | toets | PASS | FAIL | PENDING |
|---|---|---|---|---|
| **D-01** | elk beeldslot draagt een bestandsnaam **en** een klasse in de kaart | beide aanwezig | klasse ontbreekt of is onjuist t.o.v. hoofdstuk 2 | bestandsnaam ontbreekt → de sectie declareert haar niet-fotografische vervanging, die zelf onder A-02-V en VAR-06 wordt getoetst |
| **D-02** | klasse dekt de behandeling | zie tabel hierboven | C in M1/M2/M4, of D waar dan ook | — |
| **D-03** | uniciteit | 0 dubbele bestanden en 0 dubbele opnamen per pagina | ≥ 1 duplicaat, of een klasse-D-naam naast zijn origineel | — |
| **D-04** | tekstvat | elk tekstblok past in het vat van zijn blauwdruk | het langste blok overschrijdt het grootste vat van de gedeclareerde blauwdrukken **terwijl** de sectie CANVAS of HYBRID declareert | het blok bestaat nog niet |
| **D-05** | claimstatus | elke claim heeft een status uit `§1A.7` en een bron | status `CONFLICTING` of `UNVERIFIED` gepubliceerd | status nog niet vastgesteld |
| **D-06** | beeldbudget over de site | elk klasse-A-bestand staat op ≤ 1 pagina | een klasse-A-bestand op ≥ 2 pagina's zonder genoemde reden | het register bestaat nog niet → **de poort is op dit punt NIET MEETBAAR**, niet PASS |

**D-04, gemeten bewijs.** Het grootste tekstvat in alle vijftien V1.2-blauwdrukken is **32 woorden**.
Het langste FAQ-antwoord in de werkboom is **72 woorden** (`oplossing-exploitatie.html`);
`algemene-voorwaarden.html` heeft **6106 woorden** in 13 hoofdstukken van **62 tot 1581 woorden**
(spreiding 25,5), terwijl de inhoudsspreiding die V1.2 toeliet **2,13** was. Daar is DOCUMENT MODE
voor: D-04 faalt niet op de lange tekst, hij faalt op de **modus** die bij die tekst is gedeclareerd.

**Wat deel D niet oplost.** 17 van de 28 beeldslots op de vijf papieren V1.2-pagina's waren leeg.
Deel D maakt dat zichtbaar en benoemt het verdict `INCOMPLEET — CONTENT PENDING`; het maakt geen
beelden.

---

## 6.7 DEEL E — RESPONSIEVE INTEGRITEIT

Niet "geen overflow". De vraag is of de desktopcompositie een eigen ontwerp is. Drie van de vier
toetsen zijn **richtingstoetsen**: zij meten of een grootheid de verkeerde kant op beweegt als het
scherm groeit, en hebben daarom geen gekozen drempel — klasse **A**.

### E-01 · De pagina krimpt niet als het scherm groeit

| | |
|---|---|
| **Meting** | mediane werkbreedte als % vw op 1440 en op 1774; **Δ = waarde@1774 − waarde@1440** |
| **PASS** | Δ ≥ **−1,0 procentpunt** (1,0pp is meetruis, geen ontwerpruimte) |
| **Bewijs** | home 90,6 → 90,5, **Δ = −0,1pp** — PASS. B2 86,0 → 68,1, **Δ = −17,9pp** — FAIL. Tweede meting, beeldbreedte in %vw: home `100 · 27,5 · 96,1 · 53,9 · 41,4 · 62 · 52,7 · 19,7` op **beide** breedtes identiek, Δ = 0,0pp; B2 44,2→42,7 · 40,9→38,7 · 40,9→38,7 · 38,2→35,3, mediane **Δ = −2,2pp** |
| **N.V.T.** | de sectie declareert DOCUMENT MODE — daar is krimpen in %vw de bedoeling → vervangende eis **E-04** |
| **Klasse** | **A** (richting) · 1,0pp meetruis = **B** |

### E-02 · De desktopcompositie bestaat niet op 390px

| | |
|---|---|
| **Meting** | tel de secties waarin op 1774px ≥ 2 inhoudsdragende kinderen naast elkaar staan met een lichtste zijde ≤ 45%, en op 390px gestapeld staan |
| **PASS** | ≥ 1 zo'n sectie, **of** de pagina declareert in alle secties DOCUMENT MODE |
| **Bewijs** | master 8 tweedelingen op 9 secties, alle gestapeld onder 768px — PASS. **Deze toets scheidt B2 niet** (B2 is negen flexrijen die ook stapelen); hij vangt de vergrote-mobiele-opmaak, een ander defect |
| **N.V.T.** | alle secties DOCUMENT MODE → vervangende eis E-04 |
| **Klasse** | **A** (telling ≥ 1) |

### E-03 · Er is minstens één beweging die niet een maat is

| | |
|---|---|
| **Meting** | tel over 390 → 1774px de bewegingen waarin een element van **rol of plaats** verandert, niet van maat: (1) stapeling → naast elkaar; (2) regelval van een kop wordt vrijgegeven of vastgezet; (3) een element verschijnt of verdwijnt; (4) een knop of kaart verandert van volle breedte naar inline |
| **PASS** | ≥ **2** van de vier |
| **Bewijs** | master 3 van 4: tweedelingen stapelen; **28 regels `br{display:none}` onder 1200px** tegenover 11 zichtbare `<br>` op 1774px; de primaire knop **9× identiek** volle breedte onder 768px |
| **FAIL = A-09** | 0 van 4 is tegelijk de hard fail A-09 |
| **N.V.T.** | bestaat niet |
| **Klasse** | ≥ 2 van 4 = **B** |

### E-04 · DOCUMENT MODE is een ontwerp, geen gecentreerde restpagina

Dit is de vervangende eis voor E-01 en E-02 en voor de N.V.T. van A-01. Zonder deze toets zou
"DOCUMENT MODE" het ontsnappingsluik worden waarmee elke gecentreerde 1240px-pagina de poort haalt.

| | |
|---|---|
| **PASS** | alle vier: (i) de leesbreedte is een **gedeclareerde** waarde (token of ch-maat), geen gevolg van een container; (ii) in ≥ **50%** van de DOCUMENT-secties raakt ≥ 1 element beide schermranden (band, lijn, grond of beeld), zodat de pagina op 1774px niet als een kolom in leegte leest; (iii) de regellengte ligt tussen **34 en 52ch** (gemeten op de master: 34 · 36 · 38 · 52ch en 420px; B2: 58 · 62 · 64ch — **buiten de band**); (iv) de pagina draagt ≥ 1 sectie in CANVAS of HYBRID MODE, tenzij de pagina als geheel een register is en dat in de kaart staat |
| **Bewijs** | de master heeft **geen enkele paginabrede `max-width`** en begrenst alleen regellengte (34–52ch); B2 begrenst het canvas (`max-width:var(--container-max)`) en heeft daardoor op 1774px een werkbreedte van 68,1%. Dat is precies het verschil dat (i) en (ii) vastleggen |
| **N.V.T.** | de pagina heeft 0 secties in DOCUMENT MODE |
| **Klasse** | 50% = **B** · 34–52ch = **B** (n=1 pagina, maar B2 valt er duidelijk buiten) |

---

## 6.8 DEEL F — HET LEGE-PAGINA-LEK

De belangrijkste reparatie. In V1.2 gaf `[].every() === true` een PASS op P-10 voor negen
50/50-secties, en `S.filter(...).every(...)` op nul treffers gaf PASS op P-09 zonder één kaartrij.
Een niet-uitgevoerde meting werd als geslaagd geboekt.

### 6.8.1 De zes regels

| # | regel |
|---|---|
| **F-1** | Elke toets kent exact drie uitkomsten: **PASS**, **FAIL**, **N.V.T.-met-reden**. Er is geen vierde, en "niet gemeten" is geen uitkomst maar een **MEETFOUT** (MC-3). |
| **F-2** | **Een lege verzameling is nooit PASS.** Een toets over een verzameling van nul objecten geeft N.V.T.-met-reden of FAIL-met-reden-"niet meetbaar", afhankelijk van §6.8.3. Nooit PASS. |
| **F-3** | **Geen enkele toets wordt als universele bewering geschreven.** Verboden vorm: "alle X hebben eigenschap P". Verplichte vorm: "n_X = <gemeten getal>, en van die n hebben er k eigenschap P, met k ≥ <vloer>". Een toets zonder gerapporteerde n is een MEETFOUT. Dit sluit `[].every()` als constructie uit, niet alleen als symptoom. |
| **F-4** | **Elke verhouding rapporteert teller, noemer en absolute vloer.** Noemer 0 → F-2. Een verhouding zonder absolute vloer bestaat niet: de bouwer kiest anders zijn eigen noemer. Vloeren die met de pagina meegroeien: informatievlakken `max(3, ⌈0,33 × n⌉)` secties · gemaskerde beeldsecties `max(3, ⌈0,50 × n_beeldsecties⌉)` · geometrie `max(5, ⌈0,60 × n⌉)`. Master op n=9: 3 ✓ (gemeten 4), 5 ✓ (gemeten 5), 6 ✓ (gemeten 8). |
| **F-5** | **N.V.T. bestaat alleen met een vervangende eis, en die eis wordt zelf geëvalueerd.** N.V.T. zonder vervangende eis = FAIL. N.V.T. met een vervangende eis die FAIL geeft = FAIL. Een vervangende eis mag nooit zelf N.V.T. worden: de keten eindigt in PASS of FAIL. |
| **F-6** | **N.V.T. wordt geteld en verandert het verdict.** ≥ 1 N.V.T. of ≥ 1 PENDING → `INCOMPLEET — CONTENT PENDING`, nooit `GOEDGEKEURD`. Een incomplete pagina mag niet als voorbeeld voor een volgende pagina dienen; dat is hoe de homepagematen zich over vijf papieren pagina's verspreidden. |

### 6.8.2 Waarom dit niet te omzeilen is

Drie ontsnappingen zijn expliciet afgesloten:

1. **Het object weglaten.** Werkte in V1.2: geen `grid` → geen tweedeling → PASS. Nu: F-2 plus de
   mechanisme-onafhankelijke meting van VAR-01 (de twee breedste niet-overlappende zichtbare kinderen)
   plus FAIL-met-reden-"niet meetbaar" voor juist die toets.
2. **De noemer verkleinen.** Werkte in V1.2: minder gelabelde secties maakte P-04, P-06, P-07 en
   P-13 alle vier makkelijker. Nu: MC-1 leidt de noemer uit de DOM af, en F-4 zet een absolute vloer
   naast elke verhouding.
3. **N.V.T. claimen.** Nu: F-5 eist een vervangende eis die zelf PASS of FAIL geeft, en F-6 laat
   N.V.T. het verdict veranderen. N.V.T. is daarmee duurder dan FAIL-herstellen zodra de inhoud
   bestaat.

### 6.8.3 Wanneer N.V.T. geldt, en wat er dan in de plaats komt

Dit is de volledige lijst. Een N.V.T.-reden die hier niet staat, bestaat niet.

| toets | N.V.T. als | vervangende eis (wordt zelf PASS/FAIL) |
|---|---|---|
| **A-01** werkbreedte | alle secties declareren DOCUMENT MODE | **E-04** volledig |
| **A-02** beeldintegratie | 0 beelden ≥ 40% vw | **A-02-V**: ≥ 2 secties met een gebouwd niet-fotografisch object ≥ 25% van het sectievlak, meetbaar als dominante zone. 0 beelden **én** 0 objecten → **FAIL** |
| **A-03** herhaalde compositie | < 2 secties met een meetbare tweedeling | VAR-01 verplicht + de zijde van de dominante zone niet gelijk in ≥ 3 opeenvolgende secties |
| **A-04** HIGH-dominantie | pagina < 5 secties zonder HIGH-declaratie | pagina max÷min van de dominante zones ≥ 2,0 |
| **A-05** kaartrij | 0 rijen van ≥ 3 kaarten | **geen** vervangende eis nodig; de toets is N.V.T. en telt mee in F-6. Een pagina zonder kaartrijen heeft geen kaartrijtoets gehaald |
| **A-06** geometrie | 0 meetellende geometrie-elementen | ≥ 2 secties met een beeld aan een schermrand **of** ≥ 2 verschillende sectiegronden op opeenvolgende secties |
| **A-07** claim/visual | de sectie draagt 0 getallen en 0 resultaatuitspraken | geen; N.V.T. telt mee in F-6 |
| **A-08** asset | **nooit** | een leeg slot is PENDING (D-01), niet N.V.T. |
| **A-09** vergrote mobiele opmaak | **nooit** | — |
| **B-01…B-07** review | **nooit**; een onbeantwoorde vraag is ONBEANTWOORD en dat is geen PASS | de reviewer antwoordt met een waarneming |
| **VAR-01** splitsingen | 0 meetbare tweedelingen → **FAIL met reden "niet meetbaar"** | de sectie moet één dominante zone ≥ 70% hebben, anders FAIL |
| **VAR-02** kaders | alle secties CANVAS zonder kader | ≥ 0,70 verschillende clusters van de dominante-zonebreedte |
| **VAR-03** kopgraden | < 3 koppen | de koppen staan in verschillende kaderclusters of verschillende modi |
| **VAR-04** hoeken | < 4 meetellende geometrie-elementen | gelijk aan de vervangende eis van A-06 |
| **VAR-05** gronden | **nooit** | — |
| **VAR-06** beeldbehandelingen | 0 beelden | **A-02-V** |
| **VAR-07** siteherhaling | tot de eerste ijking: reviewvraag, geen poort | de reviewer benoemt ≥ 1 maat die niet van de homepage komt |
| **D-01…D-05** | **nooit**; een leeg object is PENDING | — |
| **D-06** beeldbudget | ~~het siteregister bestaat niet → **NIET MEETBAAR**~~ → **ACHTERHAALD, zie `H7 §7.3`.** Het register bestaat: `docs/data/vibe-site-register.json`, 48 pagina's, reproduceerbaar uit `docs/qa/bouw-register.mjs`. `D-06` is daarmee **MEETBAAR** geworden en de `N.V.T.`-reden vervalt | register aangelegd in de uitvoerende ronde |
| **E-01** krimp | sectie in DOCUMENT MODE | **E-04** |
| **E-02** desktopcompositie | alle secties DOCUMENT MODE | **E-04** |
| **E-03** bewegingen | **nooit** | — |
| **E-04** DOCUMENT MODE | 0 secties in DOCUMENT MODE | — |

**Het voorbeeld uit de opdracht, uitgeschreven.** Geen projectbewijs beschikbaar → `PROJECTBEWIJS =
N.V.T. / CONTENT PENDING`, de sectie declareert haar vervanging (bijvoorbeeld een gebouwd object of
een bewijsband met `SUPPORTED`-claims), die vervanging wordt onder A-02-V en VAR-06 beoordeeld, en het
eindverdict van de pagina is `INCOMPLEET — CONTENT PENDING`. **Niet PASS.** Een sectie zonder beeld
geeft `BEELDINTEGRATIE = N.V.T.` en krijgt de visuele eis A-02-V in de plaats.

---

## 6.9 DEEL G — WAT DEZE POORT NIET DOET

Eerlijk opgeschreven: welke ontduikingen uit `scratchpad/v12/kritiek-ontduiking.md` deze poort nog
steeds niet vangt, en waarom er geen poort voor komt.

**1 · De taxonomie blijft op één punt zelfgerapporteerd — GAT-24, GAT-27.**
V1.2 liet M-, K-, CB- en B-codes volledig ongelezen. VAR-06 leidt de beeldbehandeling nu uit de meting
af en A-04 toetst het impactniveau tegen de gemeten dominante zone, maar de **blauwdruknaam**, de
**kaartfamilie** en de **compositienaam** worden nergens tegen een meting gelegd. Geen poort, want de
enige manier was P-18 KAARTAFSTEMMING: een machineleesbare kaart met elf velden die veld voor veld
tegen de meting wordt gelegd op marges van ±5pp, ±2pp, ±0,0010 en ±0,5°. Dat is precies het grote
numerieke nalevingsharnas dat hier niet gebouwd wordt. **In plaats daarvan:** de modusdeclaratie
(§6.1.2) is de enige declaratie die een poort stuurt, en zij wordt door A-01, E-01, E-02 en E-04
tegengesproken zodra zij onjuist is. Voor de rest van de taxonomie is reviewvraag B-06 de enige
controle, en die is een mensenoordeel.

**2 · Geen vloer op kopgraad, en daarom vangt dit hoofdstuk het B2-geval op typografie niet.**
VAR-03 telt kopgraadclusters; **B2 haalt die toets met 5 clusters.** Het gemeten defect is de vloer:
de kleinste kop van de master is 53px = 2,99% vw, de mediaan van B2 is 44px, en zes van elf secties
zitten op 44px of lager. Een vloer hoort in het typografiehoofdstuk, niet in de poort — de poort kan
geen typeschaal vaststellen. Zolang die vloer niet elders staat, is dit een **open gat**:
een pagina met tien koppen van 32 tot 62px haalt deel C volledig.

**3 · Geen contrast- of leesbaarheidspoort — GAT-28.**
De methode bestaat en is op de master gedraaid, maar de master **faalt WCAG AA zelf**:
`.vh-pr-eyebrow` 16,6px/700 haalt in het ongunstigste monster **3,95:1** en `.vh-pr-body` 20px/400
haalt **4,27:1**, beide onder 4,5:1; `.vh-footer-note` meet **2,00:1** en `home-solutions.css:171-175`
legt **1,00:1** vast. Een contrastpoort in dit hoofdstuk zou de bron van waarheid afkeuren, en dat
is een besluit van de opdrachtgever, geen poortkeuze. Eén onderdeel is wél overgenomen: het
informatievlak van A-02 middel (c) moet ≥ 2,2:1 contrast met zijn ondergrond hebben, want zonder die
eis was `rgba(255,255,255,.01)` een informatievlak (GAT-06). Leesbaarheid van **type** blijft buiten
deze poort.

**4 · Geen mobiele poort, en de band 1200–1439px blijft ongemeten — GAT-29.**
Deel E meet op 390px alleen **richtingen** (E-02, E-03), geen compositiekwaliteit. Dat is bewust: de
master **faalt zijn eigen V1.2-poort op 1199px** — daar meet hij overlapparen `0 · 47 · 12 · 4 · 5 ·
0 · 0 · 4 · 0` (4 nulsecties, mediaan 4) en **0 gemaskeerde beelden**, wat P-03, P-06, P-13 en P-08
zou laten falen. Een numerieke mobiele poort met de master als ijkpunt zou dus een ijkpunt gebruiken
dat zelf zakt. De band **1200–1439px is in alle vijf V1.2-documenten NIET GEMETEN** en blijft dat;
een pagina kan daar slecht zijn en deze poort halen.

**5 · Geen numerieke dieptetoets — GAT-12, GAT-13, GAT-14.**
Overlap is in V1.2 met zes onderling overlappende broers van 30×30px en `opacity:.06` tot exact de
mediaangrens van 15 paren opgepompt, en de mediaan liet vier van negen secties volledig plat
(reeks 15·1·15·1·15·1·15·1·15 → PASS). Een gewogen variant bestaat op papier (elk element ≥ 2% van
het sectievlak, overlapvlak ≥ 1%, één van de twee draagt beeld of tekst met dekking ≥ 0,5), maar
**de masterreeks onder die definitie is niet gemeten**; de bestaande reeks 158·64·42·19·57·19·50·43·2
geldt voor de oude definitie en gaat omlaag. Een vloer zetten op een ongemeten reeks is raden.
Daarom is diepte **reviewvraag B-02**, met de ongewogen telling (home 11 vlakken in 6 van 9 secties,
B2 2 in 2 van 11) als context en niet als antwoord.

**6 · De poort kan een claim niet verifiëren — A-07 toetst alleen vorm.**
A-07 ziet of een claim een status en een bron heeft, niet of de bron klopt. Een `VERIFIED`-stempel op
een verzonnen getal haalt deze poort. Geen poort mogelijk: verificatie is bronwerk, niet meetwerk.
Wat wél gemeten kan worden en hier staat: dezelfde claim op twee verschillende projecten is
`CONFLICTING`, en dat blokkeert publicatie.

**7 · Beelddekking als paginagrootheid is niet opgenomen — GAT-05.**
De V1.2-formule somde beeldoppervlakken en telde **overlappende beelden dubbel**: drie gestapelde
volbeelden in één sectie leverden al 39,6% op een pagina van 6810px, en één beeld plus twee
onzichtbare kopieën haalde de drempel van 35%. Een verenigingsmeting (rasterbenadering over het
paginavlak, na maskeraftrek) is nodig voordat 43,7% bruto / 37,2% netto een drempel kan worden. Niet
gemeten in deze sessie → geen poort. A-02 vangt het belangrijkste deel ervan per beeld.

**8 · Hover- en bewegingstoestanden zijn ongemeten gebleven.**
In alle V1.2-metingen gaf `el.matches(':hover')` **false op 18 van 18** doelen. Deze poort toetst
geen enkele hover-, focus- of animatietoestand. Geen poort voorgesteld: het is een meetprobleem in
het harnas, niet een ontwerpregel.

**9 · Het harnas zelf is geen onderdeel van dit hoofdstuk.**
MC-3 eist dat een onleesbare meting **MEETFOUT** heet in plaats van stil "geen masker" (GAT-11: de
regex las een `clip-path` met `calc()` niet en boekte vier van de vijf punten weg). Of de code dat
werkelijk doet, kan dit hoofdstuk niet bewijzen — er is in deze sessie **geen code geschreven en
geen meting gedraaid**. Zolang het harnas niet is herschreven, zijn A-02, A-06, VAR-04 en VAR-06 **niet
uitvoerbaar** en staan ze op NIET MEETBAAR, niet op PASS.

**10 · Eén dubbele nummering is niet opgelost — GAT-30.**
`DR-V-11`, `DR-V-12` en `DR-V-20…29` bestaan elk tweemaal met verschillende inhoud, verdeeld over
vier V1.2-documenten. Dit hoofdstuk gebruikt daarom het eigen blok **DR-Q**. Elke verwijzing naar een
`DR-V`-nummer in V1.2 blijft niet-resolveerbaar en is daarmee geen regel; een register aanleggen is
geen poortbeslissing.

---

## 6.10 Besluiten — DR-Q

| # | besluit | waarom het open staat |
|---|---|---|
| **DR-Q-01** | Wordt de sectieverzameling uit de DOM afgeleid (MC-1) in plaats van uit `data-screen-label`? | Zonder dit zijn 23 van de 48 pagina's niet meetbaar en kan de bouwer zijn eigen noemer zetten. Kost een herschrijving van het harnas. |
| **DR-Q-02** | Wordt de modus per sectie een verplicht veld in de kaart? | De hele mode-afhankelijke structuur van A-01, E-01, E-02 en E-04 hangt eraan. Zonder declaratie valt de poort terug op één regel voor alle inhoud. |
| **DR-Q-03** | Lichtste zijde: **45,0% met één gespiegelde uitzondering tot 48,6%**? | Lost conflict K-1 op (G19 zegt 42%, P-10 zegt 47,5%, de master is op dezelfde sectie als 47,2% én 48,6% gemeten). Eén grens, één meetdefinitie, één document. |
| **DR-Q-04** | Eén definitie van informatievlak: **≥ 30.000px² @1774, ≥ 50% op beeldpixels, contrast ≥ 2,2:1**? | Lost conflict K-2 op: vier definities en drie drempels in vier documenten. 150×80 = 12.000px² is 2,5× zwakker dan de V-5-eis. |
| **DR-Q-05** | Worden de maatvloeren van A-06 vastgesteld op **0,5% sectievlak** en **5% beeldwegname**? | Beide zijn op één pagina geijkt met een dunne marge (gemeten 0,72% en 6%). De master haalt ze; een derde pagina kan ze omver halen. |
| **DR-Q-06** | Clustertoleranties: **2,0% vw** (kader), **ratio 1,07** (kopgraad), **3,5°** (hoek), **2,0pp** (lichtste zijde)? | Drie van de vier liggen in een gemeten gat; de vierde (2,0pp) is onder de gemeten 6,6pp gelegd. Alle vier opnieuw ijken na de derde gemeten pagina. |
| **DR-Q-07** | Blijft VAR-01(ii) op **≥ 0,50** verschillende splitsingsclusters? | Bij 0,60 **faalt de master zelf** (4 clusters op 8 tweedelingen = 0,50). Dit is een spanning in de bron, geen vrije keuze. |
| **DR-Q-08** | Komt de kopgraadvloer in het typografiehoofdstuk, en op welke waarde? | Zonder vloer haalt B2 deel C. Gemeten: master min **2,99% vw**, B2 min **1,80% vw**; het middenpunt is 2,40% vw = 42,5px @1774. Dat getal is een besluit, geen meting. |
| **DR-Q-09** | Wordt de contrastpoort buiten deze poort gehouden? | Met een AA-poort zakt de master zelf (3,95:1 en 4,27:1 gemeten). Erin = de bron afkeuren; eruit = wit op licht blijft mogelijk. |
| **DR-Q-10** | Komt er een mobiele poort, of wordt vastgelegd dat deze poort alleen boven 1200px geldt? | De master faalt zijn eigen V1.2-poort op 1199px (gemeten). Bij "alleen boven 1200px" moet dat ook in `vibe-visual-grammar-v1.md` G19 staan, dat onder 1200px gelijk verdelen tot **regel** maakt. |
| **DR-Q-11** | Wordt de gewogen dieptemeting op de master gedraaid, zodat B-02 een poort kan worden? | Nu reviewvraag. De masterreeks onder de gewogen definitie is NIET GEMETEN; de oude reeks (mediaan 43) is niet overdraagbaar. |
| **DR-Q-12** | Komt het siteregister voor D-06 en VAR-07 er, en op welke drempels? | 9 klasse-A-beelden over 48 pagina's. Zonder register is D-06 NIET MEETBAAR en zijn de VAR-07-drempels (0,40 / 0,30) ongeijkt. Dit is het enige deel dat de gezakte V1.2-toets 2 raakt (0 van 126 maatwaarden nieuw). |
| **DR-Q-13** | Wie is de reviewer van deel B, met naam en mandaat? | De enige eis die vastligt: niet de bouwer. Zonder benoemde reviewer is deel B niet uitvoerbaar en valt de ontwerplaag terug op zelfrapportage — de hoofdoorzaak van het V1.2-falen. |

---

## 6.11 Wat ik in deze sessie NIET heb gemeten

| onderwerp | reden |
|---|---|
| **Elke numerieke waarde in dit hoofdstuk is OVERGENOMEN** | uit `v13/BEWIJS-assets.md`, `v12/hoofdoorzaak.md`, `v12/kritiek-ontduiking.md`, `v12/kritiek-overfitting.md`, `scratchpad/papiertest.md` en de zes `docs/vibe-*.md`. Er is in deze sessie **geen browser gestart, geen pagina gerenderd, geen schermafdruk gemaakt en geen DOM gemeten** |
| **Zelf gerekend in deze sessie** | alleen de clusteringen en hun drempels, in `node` (`scratchpad/v13-check.mjs`): de hoekclusters op τ 1,0–4,0°, de kaderclusters op 2,0% vw, de kopgraadclusters op ratio 1,07, de buurafstanden van alle drie de reeksen, `d(tan)/dgraad` bij 33°, de dominante-zonemarges en de richtingsdelta's van E-01 |
| **De opeenvolgende lichtste-zijdereeks** | gelezen uit `vibe-visual-grammar-v1.md` G19 (S1 22,1 · S2 30,9 · S3 21,6 · S4 32,5 · S5 48,6 · S6 42,0 · S7 34,0 · S8 41,9); de kleinste opeenvolgende verandering **6,6pp** is daaruit berekend, niet opnieuw gerenderd |
| **Geen enkele drempel is op een derde pagina geijkt** | alle B-klasse-waarden rusten op twee gemeten pagina's (Master v1 en de B2-kandidaat) plus SYSTEEM-X op papier. Zes drempels staan exact op de mastermeting: 3 hoekclusters, 3 kopgraadclusters, 0,50 splitsingsclusters, 1 decoratief element per 9 secties, 0,5% geometrie en 5% beeldwegname |
| **De B2-waarden onder de nieuwe definities** | VAR-02 (kaderclusters), VAR-05 (gronden, 1440-meting), VAR-06 (afgeleide beeldklassen) en A-03 (opeenvolgende signaturen) zijn voor B2 **niet gemeten**. B2 faalt al op A-01, A-02, A-05, VAR-04 en E-01 |
| **Het harnas** | geen code geschreven, geen run gedraaid. A-02, A-06, VAR-04 en VAR-06 zijn zonder herschreven harnas niet uitvoerbaar (§6.9 punt 9) |
| **`papiertest.md` staat niet op het in de opdracht genoemde pad** | niet in `scratchpad/v12/`, maar in `scratchpad/papiertest.md` (900 regels, gelezen). De twee V1.2-kritieken hebben hem daarom **niet meegewogen**; alles wat in dit hoofdstuk uit §8.6 en §9 van die test komt, is hierbij voor het eerst verwerkt |
| **Niets gewijzigd** | geen productiecode, geen bestaand `docs/`-bestand, geen asset, geen screenshot. Eén nieuw bestand in de scratchpad plus één wegwerpscript. Niets gecommit, niets gepusht |

---
---

# H7 · DE UITVOERENDE GOVERNANCELAAG

| | |
|---|---|
| **Status** | normatief. Dit hoofdstuk is geen ontwerptheorie maar de laag die H1–H6 **uitvoerbaar** maakt. |
| **Waarom het bestaat** | de vorige ronde gaf `SYSTEEM-Y` (opzettelijk generiek) en een premiumcompositie **dezelfde uitkomstvector**. Niet omdat de theorie fout was, maar omdat niets haar uitvoerde. |
| **Wat het toevoegt** | een kaartschema, een siteregister, een draaiend harnas, drie cross-paginaregels, drie desktopregels, een reviewmodel en de sluiting van 21 interne tegenstrijdigheden. |
| **Wat het NIET toevoegt** | geen nieuwe visuele regels, op één uitzondering: `NF-4`'s eis (4) is vervangen omdat zij een lege doorsnede produceerde. Zie §7.6. |

---

## 7.0 · De klasse NIET-PAGINA — de normatieve sluiting van `DR-R1-13`

`DR-R1-13` blokkeerde de meetbaarheid van 48 van 48 pagina's. De grond is een **meetfeit**, geen uitvlucht:
vijf van de 48 `.html`-bestanden zijn geen paginadocument.

| bestand | gemeten signaal | klasse |
|---|---|---|
| `_header.html` | **geen `<html>`**, 160 woorden, 0 `<section>` | `NIET-PAGINA` — fragment |
| `popup-designs.html` | 253 woorden, 1 `<form>`, **niet in `sitemap.xml`** | `NIET-PAGINA` — ontwerpzandbak |
| `popup-designs-met-afbeelding.html` | 193 woorden, 1 `<form>`, niet in `sitemap.xml` | `NIET-PAGINA` — ontwerpzandbak |
| `cookie-popup-designs.html` | 480 woorden, niet in `sitemap.xml` | `NIET-PAGINA` — ontwerpzandbak |
| `404.html` | 47 woorden, 0 `<section>` | `SERVICEPAGINA` — eigen minimale eis |

> **S3-30 · DE KLASSE NIET-PAGINA.** Een `.html`-bestand dat **geen `<html>`-element** bevat, of dat
> **niet in `sitemap.xml`** staat en geen publieke route heeft, is géén pagina en wordt niet aan een
> paginapoort onderworpen. Het krijgt `page_class = NIET-PAGINA` met een **uitgeschreven reden** en
> `measurement_status = NIET VAN TOEPASSING — geen paginadocument`.
> Een bestand zonder reden mag deze klasse **niet** dragen: dat zou de klasse in een achterdeur
> veranderen. De reden staat per bestand in het register, veld `not_a_page_reason`.

**Gemeten uitkomst**, uit `docs/data/vibe-site-register.json`, gegenereerd door `docs/qa/bouw-register.mjs`:

| voorwaarde | meting | uitkomst |
|---|---|---|
| 48/48 **CLASSIFICEERBAAR** | `totals.classifiable` = **48** van 48 | **GEHAALD** |
| 48/48 met een expliciete **MEASUREMENT STATUS** | `totals.without_measurement_status` = **0** | **GEHAALD** |

| `measurement_status` | n |
|---|---:|
| `NIET GEMIGREERD / REVIEW NIET VEREIST VOOR FREEZE` | **42** |
| `NIET VAN TOEPASSING — geen paginadocument` | **4** |
| `REVIEW NIET VEREIST VOOR FREEZE — eigen minimale eis` | **1** |
| `GEMETEN EN GEMAPT — referentievingerafdruk` | **1** |

Archetypen, gemeten: `B1` 1 · `B2` 4 · `B3` 15 · `B4` 5 · `B5` 11 · `B6` 2 · `B7` 2 · `S2` 3 · `null` 5 = **48**.

**Wat hier eerlijk staat:** 47 van 48 pagina's dragen **geen** compositiekaart. Legacy-pagina's doen niet
alsof zij V1.3-metadata hebben. Het register bestaat zodat toekomstige gemigreerde pagina's onderling
vergelijkbaar zijn — niet om de site deze ronde te retrofitten.

---

## 7.1 · De vier regelklassen — en waarom de scheiding zelf de belangrijkste regel is

> **S3-31.** Elke actieve regel draagt precies één klasse en precies één evaluator.
> **A** NORMATIEVE ONTWERPREGEL · **B** MACHINE-MEETBARE REGEL ·
> **C** REVIEWER-OORDEELSREGEL · **D** CONTENT/ASSET-AFHANKELIJKHEID.
> Evaluator ∈ { `MACHINE`, `REVIEWER`, `MACHINE+REVIEWER`, `NVT-VOOR-DIT-ARCHETYPE` }.

**Niet elk goed ontwerpprincipe hoort een DOM-metriek te worden.** Subjectieve compositiekwaliteit
machinaal willen meten is zelf een faalmodus: het levert een regel die *iets* telt en daarmee de indruk
wekt dat zij kwaliteit meet. Dat is precies hoe de vorige poort `SYSTEEM-Y` liet passeren. Een regel die
een **relatie** beoordeelt die geen getal heeft, gaat naar `REVIEWER` — met een inspecteerbare vraag,
niet met een smaakvraag.

**Gemeten dekking**, over alle zes hoofdstukken geïnventariseerd:

| | n | aandeel |
|---|---:|---:|
| `MACHINE` | **162** | 59,3% |
| `REVIEWER` | **60** | 22,0% |
| `MACHINE+REVIEWER` | **43** | 15,8% |
| `NVT-VOOR-DIT-ARCHETYPE` | **8** | 2,9% |
| **zonder evaluator** | **0** | **0%** |
| **totaal** | **273** | 100% |

De volledige matrix per familie staat in §7.13.

---

## 7.2 · Het kaartschema

`docs/schema/composition-card.schema.json`. Een compositiekaart beschrijft de **ontwerpintentie** van een
pagina, structureel. Zij wordt geschreven **vóór** de implementatie en is het document waarop de poort draait.

**Verboden in een kaart**, afgedwongen door `KP-01`: pixelposities, kopgraden, `clip-path`-coördinaten,
`cqw`-waarden, CSS-klassenamen, `font-size`. Een kaart die implementatie bevat is geen intentie meer.

Per sectie verplicht: `id` · `purpose` · `impact` · `canvas_mode` · `blueprint` · `protagonist` ·
`visual_role` · `media_treatment` · `surface_hierarchy` · `geometry_role` · `transition` ·
`content_status` · `asset_status`.

**De twee velden die het werk doen.** `surface_hierarchy` is geen telling maar een paar:

```
"surface_hierarchy": {
  "pattern":  "1D-2O-1A-0M",          // DOMINANT / ONDERSTEUNEND / AANGEHECHT / MICRO
  "bindings": [ {"from":"bewijsvlak","to":"podiumbeeld","kind":"OP-BEELD"} ],
  "equal_row": {"count": 3, "equal_register_justification": "..."}
}
```

`bindings` is de gemeten scheidslijn tussen Master v1 en de B2-kandidaat: **vlakken die OP beelden liggen**
tegenover **beelden die NAAST tekst in een rastercel staan**. Een los raster heeft `bindings: []`.
`equal_row` maakt een gelijke kaartrij **declareerbaar** in plaats van onzichtbaar — zie `DR-U2-01` in §7.8.

**Afgeleide vingerafdruk.** Zeven positiereeksen: impact · blauwdruk · drager · beeldbehandeling ·
geometrie · hoofdrol · overgang. Geen CSS-waarden.

### De acht visuele rollen `VR-A`…`VR-H` — hier voor het eerst gedefinieerd

> **CORRECTIE OP DEZE RONDE.** Het kaartschema verwees voor deze codes naar *"hoofdstuk 3"*. **Dat was
> een valse verwijzing:** hoofdstuk 3 benoemt vier **dragersoorten** (`D-0`, `D-F`, `D-V`, `D-O`), wat
> iets anders is, en `VR-A`…`VR-H` stonden nergens in `docs/` gedefinieerd. `KP-09` is een
> MACHINE-regel die het **aantal verschillende** van deze acht telt, dus een ongedefinieerd
> vocabulaire maakt die regel onnavolgbaar. De acht definities hieronder zijn afgeleid uit het lezen
> van Master v1 en worden hierbij normatief.

| code | de drager | gemeten voorkomen op Master v1 |
|---|---|---|
| `VR-A` | **volvlaks fotopodium** van schermrand tot schermrand | sectie 01 |
| `VR-B` | **doorlopend fotopaneel** dat naar één schermrand uitloopt | sectie 03 |
| `VR-C` | **begrensd fotodraagvlak** met vlakken erop | secties 06 · 07 |
| `VR-D` | **verzameling** waarin elk item zijn eigen drager is | sectie 02 |
| `VR-E` | **gebouwd object** als drager, zonder foto | sectie 05 |
| `VR-F` | **vlakloze bewijsband of register** op de sectiegrond | komt op Master v1 niet voor |
| `VR-G` | **getekend merkvlak** dat het beeld draagt | secties 08 · 09 |
| `VR-H` | **beeldband op een getekende ondergrond** | sectie 04 |

`VR-F` is de enige rol die de master **niet** gebruikt, en dat is precies de rol die de fotoloze
MEDIUM-secties van de andere archetypen moet dragen. Dat is geen toeval maar het gevolg van
`BEWIJS-assets §4`: 10 klasse-A-opnamen over 48 pagina's.

---

## 7.3 · Het register

`docs/data/vibe-site-register.json`, gegenereerd — niet met de hand geschreven. Elke telling in het veld
`measured` is door het script uit het `.html`-bestand zelf gelezen. Per pagina: `path` · `page_class` ·
`archetype` · `variant` · `governance_status` · `measurement_status` · `migration_status` ·
`composition_card` · `content_status` · `asset_status` · `canonical` · `canonical_asset`.

> **S3-32.** Alleen pagina's met een `composition_card` doen mee aan de cross-paginatoetsen. Het register
> is de **enige** canonieke kaartenset. Dat sluit `DR-U2-06` — zie §7.8.

---

## 7.4 · Het harnas

```
node docs/qa/bouw-register.mjs                       register uit gemeten signalen
node docs/qa/composition-gate.mjs                    alle kaarten
node docs/qa/composition-gate.mjs --zelftest         toets op het harnas zelf
node docs/qa/composition-gate.mjs --packet <kaart>   reviewerpakket
node docs/qa/desktop-governance.mjs <basis> <pagina> browsermeting bij 1440/1774/1920
```

### De drie uitkomsten, en de reden dat er geen vierde is

> **S3-33 · GEEN LEGE VERZAMELING ALS PASS.** Elke regel eindigt in `PASS`, `FAIL` of
> `NVT-met-reden-en-vervanger`. Een `NVT` **zonder reden** is `FAIL`. Een `NVT` **zonder vervangende eis**
> is `FAIL`. Een vervanger die zelf niet in `PASS` of `FAIL` eindigt is `FAIL`. Een vervanger die `FAIL`t
> maakt de `NVT` een `FAIL`.

Dit is afgedwongen in de functie `verdict()` en **bewezen** door `--zelftest`: 8 van 8 toetsen `PASS`,
waaronder de lege-pagina-exploit — een kaart met het minimum aan secties en overal leegte levert
**10 FAIL** in plaats van door te glippen op `NVT`'s.

### De twaalf intra-paginaregels

| regel | wat zij meet | evaluator |
|---|---|---|
| `KP-01` SCHEMA | vorm, enums, verboden implementatiedetails | MACHINE |
| `KP-02` OMVANG | sectietelling binnen de band van het archetype | MACHINE |
| `KP-03` IMPACTRITME | aantal HIGH, en **nooit twee HIGH naast elkaar** | MACHINE |
| `KP-04` MODUSBAND | CANVAS/DOCUMENT/HYBRID binnen de band, **≥ 2 overgangen** | MACHINE |
| **`KP-05` HERHAALDE DRIELING** | geen twee secties met dezelfde (impact, blauwdruk, vlakpatroon, drager) | MACHINE |
| **`KP-06` HECHTING** | ≥ `max(2, ⌈n/4⌉)` secties met een niet-lege `bindings` | MACHINE |
| **`KP-07` GELIJKE RIJEN** | ≤ 1 rij van ≥ 3 gelijke kaarten, en altijd gerechtvaardigd | MACHINE |
| **`KP-08` HOOFDROL PER HIGH** | de HIGH-secties dragen ≥ 2 verschillende hoofdrollen | MACHINE |
| **`KP-09` DRAGERVERSCHEIDENHEID** | ≥ `min(⌈n/2⌉, 4)` verschillende visuele rollen | MACHINE |
| `KP-10` FOTOBUDGET | unieke bestanden in de band, 0 klasse-D, 0 klasse-C in M1/M2/M4 | MACHINE |
| `KP-11` INHOUD | 0 CONFLICTING; PENDING levert `NVT` + de **ablatietoets** | MACHINE+REVIEWER |
| `KP-12` GEOMETRIE | ≥ 2 rollen zodra er > 2 dragers zijn | MACHINE |

**De vijf vetgedrukte regels zijn de scheidende laag.** Zij meten geen aanwezigheid maar **relaties**:
herhaalt de pagina zichzelf · hangt er iets aan iets · staan er rijen gelijke tegels · draagt elke climax
een eigen onderwerp · is er meer dan één soort drager. Dat is wat de vorige poort niet kon zien.

### De drie cross-paginaregels

| regel | wat zij meet | drempel |
|---|---|---|
| `XP-01` KLOON | positiegewijze overlap per as tegen elke andere kaart | **< 3 assen** boven 60% |
| `XP-02` HIGH-PATROON | identieke **relatieve** HIGH-posities | **0** kaarten |
| `XP-03` HOOFDROLPATROON | dezelfde HIGH-hoofdrolverzameling | **≤ 1** andere kaart |

> **S3-34.** `XP-01` vergelijkt **zeven assen** afzonderlijk en verwerpt pas bij drie. Twee pagina's worden
> daarom **nooit** afgekeurd omdat zij een header, een footer, merkkleuren, buttonprimitieven, typografie,
> één sectiefamilie of één geometriemechanisme delen. Alleen **structureel klonen** valt.

### De drie desktopregels

| regel | wat zij meet | evaluator |
|---|---|---|
| `DG-01` BEVROREN ZWARE SECTIE | een zware sectie met **identieke contentbreedte bij 1440 en 1920** | MACHINE |
| `DG-02` BEDOELDE SMALHEID | de reviewervraag die `DG-01` oproept | REVIEWER |
| `DG-03` RESPONSIEVE SCHALING | per **afgeleide** modus, niet per declaratie | MACHINE |

Zie §7.10.

---

## 7.5 · De drie meeteenheden — de werkelijke sluiting van het `ch`/`px`-conflict

Het conflict was niet `ch` tegen `px`. **Er is een derde domein, en dat is wat de master gebruikt.**

**Gemeten op `index.html` bij 1774px.** Van de **147** CSS-regels die een breedte zetten, gebruiken er
**3** een `ch`-eenheid — en die drie zitten in de cookiepopup en de legacy-footer
(`.vlp-ok p`, `.ftr.v1a .v1a-tag`, `.ftr.v1a .v1a-desc`), dus **buiten de mastercompositie**.
De mastercompositie declareert haar leesbreedtes in **`cqw`**:

| element | declaratie | gerenderd @1774 | gerealiseerd |
|---|---|---:|---:|
| `.vh-lead` | `max-width: 25.93cqw` | 460,0px | **36,4ch** |
| `.vh-sol-lead` | `max-width: 22.5479cqw` | 400,0px | **30,9ch** |
| `.vh-proof-kaart` | `width: 25.2537cqw` | 448,0px | **47,8ch** |

> **S3-28 · DRIE DOMEINEN.**
> **S — SEMANTISCH.** Leesmaat hoort in **`ch`**. `ch` is het gezag over leesbaarheid.
> **G — GEOMETRISCH.** Botsings-, rand- en overlaptoetsen horen in **px**, **gemeten in de browser bij een
> benoemde viewportbreedte**. Nooit berekend uit een aangenomen factor.
> **P — PROPORTIONEEL.** De **declaratie-eenheid** op een CANVAS-pagina is `cqw`. Een `cqw`-declaratie
> levert een **invariante** `ch` dan en slechts dan als de typeschaal óók proportioneel is.
>
> De naad tussen S en G is **gemeten, nooit aangenomen**:
> `1ch = 0,5856 × font-size(px)` voor Urbanist — gemeten over **24** font/maat-combinaties op twee
> pagina's bij twee breedtes, spreiding **0,09%** (0,5851–0,5856).
> Deze factor is **per letterfamilie** en moet met de **gerenderde** `font-size` worden vermenigvuldigd.
> Een universele `ch→px`-constante bestaat niet en mag nergens worden ingevoerd.

**De uitvoerbare toets die hieruit volgt**, en die het hele conflict vervangt:

> **S3-29 · LEESMAATDRIFT.** Per sectie: `|ch@1920 − ch@1440| ÷ ch@1440 ≤ 6%`.
> **Gemeten.** Master v1: **0,0%** op alle 7 tekstdragende secties (36,4 → 36,4 · 30,9 → 30,9 ·
> 39,5 → 39,5 · 61,4 → 61,4 · 45,5 → 45,5 · 45,1 → 45,1 · 55,9 → 55,9).
> B2-kandidaat: **tot 25,2%** (73,5 → 55,0 · 61,7 → 54,2 · 57,2 → 49,8).
> De oorzaak is gemeten: de mastertypografie schaalt **exact** proportioneel
> (12,34 → 16,45 = **1,3331** tegen 1920/1440 = 1,3333; 17,94 → 23,92 = **1,3333**), de B2-typografie niet
> (13 → 13 = **1,000**, bevroren op zijn clamp-grens; 15,5 → 17 = 1,097; 18 → 20 = 1,111).

**Gevolg voor `E-04(iii)`.** De vijfde meetwaarde **`420px`** in de reeks *"34 · 36 · 38 · 52ch en 420px"*
is **geen** bandlid en **geen** `E-04(i)`-FAIL. Zij is de **gerenderde realisatie van een `cqw`-declaratie
bij één viewportbreedte**. De band blijft `B`, **n=4**, in domein S; de 420px verhuist naar domein G als
rapportagewaarde. Dit sluit `R7` met een meting in plaats van met uitstel.

**Gevolg voor `REG-1`/`REG-5` tegenover §3.3.0.** De `%`-vloer op de registerveldbreedte (`≥ 55%` in
DOCUMENT, `≥ 40%` in HYBRID, merk `D` — gezet) vervalt als **breedte**-eis en wordt een
**rapportagewaarde**. De `ch`-maat is het gezag; de zorg "kolom in leegte" blijft gedekt door `E-04(ii)`,
een randtoets in domein G waar hij hoort. Dit sluit `R8`. **`DR-S-14`** blijft staan als meetopdracht op de
eerste gebouwde registerpagina — een rapportagewaarde, nooit een tweede concurrerende breedte-eis.

---

## 7.6 · REPARATIE VAN `NF-4` — de lege doorsnede, vanuit de eerste beginselen

> Deze paragraaf is in deze ronde geschreven en volledig opgenomen.
> Elke regel draagt SOURCE / INTENT / CONFLICT / RESOLUTION / EVALUATOR / TEST.

**Wat hier wél en niet gemeten is.** Geen browser gedraaid, geen screenshot gemaakt. Alles hieronder is
een **leesmeting op `docs/04-visual-language-v1.3.md`** plus een **narekening** van de getallen die dat
document zelf als ingang opgeeft. Elke nieuwe grens staat met merk (`A` gemeten · `B` band met n ·
`C` beschrijvend · `D` gezet met reden) en elk getal dat uit een rekensom komt staat als **BEREKEND**.
Er is in deze sessie **geen productiebestand gewijzigd**.

---

### 3.9.1 · De diagnose van `NF-4` — wat de pixelbovengrens eigenlijk was

`NF-4` (regel 2339–2351) heeft vier getallen die samen een **overbepaald** stelsel vormen:

| ingang | waar | waarde |
|---|---|---|
| statementgraad | `maten · VAST` | ≥ 40px (`A`, n=1: 40,11px / 400 / 4 woorden, `B03`) |
| statementaandeel | `HARDE ONDERGRENS (4)` | statement ≥ **45%** van de sectiehoogte (`D`) |
| MEDIUM-hoogtevloer | §3.3.0 / `P-14` | sectiehoogte ≥ **443,5px** @1774 (= 25% van 1774, `A`) |
| de BEREKENDE som | `MEDIUM-hoogte BEREKEND` | `kop 160 + statement 198 + 2 × 45` = **448px** |

Leg (2) en (4) over elkaar met een statement van 198px: `198 ÷ 0,45 = 440,0px` is dan de **grootste**
sectie die (4) nog toestaat, terwijl de vloer **443,5px** eist. Doorsnede leeg, breedte **−3,5px**.
De eigen som verraadt het al: `198 ÷ 448 = 44,2%` **BEREKEND** — **de BEREKENDE hoogte van `NF-4` faalt
`NF-4`'s eigen ondergrens (4)**. De cel rekent met twee verschillende noemers (440 voor het aandeel,
448 voor de sectie) en noemt het resultaat `✔ (marge 4,5px)`. Die 4,5px marge bestaat niet; het is een
tekort van 3,5px aan de andere kant.

**Welke visuele relatie beschermde (4)?** Twee, en ze zijn allebei relatief, niet absoluut:

1. **Dominantie.** Het statement moet tegenover de omringende tekst een **dominante maat** hebben.
   `≥ 40px` is daarvoor een slechte proxy: 40px is dominant naast een MICRO-regel van 17,4px
   (`40,11 ÷ 17,4 = 2,31` **BEREKEND**) maar **niet** naast een metriekgetal van 28,4px, dat de
   MICRO-band uitdrukkelijk toestaat (`40,11 ÷ 28,4 = 1,41` **BEREKEND**). Een absolute px-vloer kent
   het verschil niet; een verhouding wel.
2. **Rust in plaats van vulling.** `statement ≥ 45% van de sectiehoogte` is een **anti-vulregel**: elk
   extra blok verlaagt het aandeel. Dat is de goede bedoeling, uitgedrukt in het verkeerde domein —
   hij regelt de **sectiehoogte** terwijl hij de **inhoudshoeveelheid** bedoelt, en botst daarom op de
   enige andere regel die over de sectiehoogte gaat.

**Er is nog een derde, onbenoemd defect.** De `anatomie`-regel van `NF-4` luidt: *"statementvlak (de
grond) + het statement + 1–3 MICRO-bewijsregels + ten hoogste 1 CTA"* — **geen sectiekop**. In
`DOCUMENT / HYBRID / CANVAS` staat het ook letterlijk: *"het statement zelf, dat als kop geldt."* De
BEREKENDE hoogte telt er desondanks `kop 160` bij, de kopblokingang van `REG-1` (eyebrow 13 + kop
53 × 2 regels + 43 lucht). Met die 160px erin draagt de sectie **twee** koppen, en dan spreekt `S3-06`
(`sectiekop ÷ grootste typegraad in enig vlak ≥ 2,0`, `A`, n=8) `NF-4` tegen: `53 ÷ 66 = 0,80`
**BEREKEND**, tegen een vloer van 2,0. Omgekeerd zou een statement van 66px onder `S3-06` een sectiekop
van ≥ 132px vragen, ver buiten de gemeten kopband 53,0–76,5px. **De 160px hoort er niet; hij is uit
`REG-1` overgenomen en is de rekenkundige oorzaak van de krapte.**

---

### 3.9.2 · De vier reparatieregels, per regel uitgeschreven

---

#### **R1 — `NF-4` HARDE ONDERGRENS (4): `statement ≥ 45% van de sectiehoogte`** → **vervallen**

- **SOURCE** — `docs/04-visual-language-v1.3.md:2349`, `HARDE ONDERGRENS` punt (4), merk `D` (gezet; het
  getal 45 komt uit `hierarchie` op `:2347`, waar het als verlaging van de gemeten 49% van `S3-05` staat
  omdat *"een tekstblok geen beeldvlak is"*).
- **INTENT** — voorkomen dat het podium zijn hoogte uit vulling haalt: elk extra blok verlaagt het
  aandeel van het statement, dus de regel straft stapelen af.
- **CONFLICT** — met de MEDIUM-hoogtevloer `≥ 443,5px` (§3.3.0, uit `P-14`). Bij een statement van 198px
  laat (4) ten hoogste `198 ÷ 0,45 = 440,0px` **BEREKEND** toe. `440,0 < 443,5` → lege doorsnede. De eigen
  BEREKENDE som van 448px faalt (4) met `198 ÷ 448 = 44,2%` **BEREKEND**. Een legitieme compositie wordt
  dus afgekeurd door een rekenfout, niet door een ontwerpfout.
- **RESOLUTION** — **punt (4) vervalt** en wordt vervangen door `S3-25` (R2) en `S3-26` (R3). De 45%
  blijft bestaan als **beschrijving**, merk **`C`**: de gerealiseerde aandelen van de twee uitgewerkte
  gevallen hieronder zijn `44,6%` en `46,3%` **BEREKEND**, dus het getal was als *uitkomst* juist en
  alleen als *poort* onbruikbaar. Het wordt gerapporteerd, nooit getoetst. **440px verdwijnt uit het
  document; er komt geen 450px in de plaats.**
- **EVALUATOR** — **MACHINE** (de regel wordt verwijderd; wat blijft is een gerapporteerd getal zonder
  drempel).
- **TEST** — `S3-16`-stijl assertie: `het poortscript kent geen vergelijking van statementhoogte met
  sectiehoogte`. Regressietoets: de BEREKENDE hoogte van `NF-4` en de MEDIUM-vloer hebben **geen**
  gemeenschappelijke onbekende meer, dus de doorsnede kan per constructie niet leeg zijn.

---

#### **R2 — `S3-25 · DOMINANTIEVERHOUDING VAN HET STATEMENT`** → nieuw, vervangt de px-proxy

> **S3-25.** In een `NF-4`-sectie geldt, beide:
> **(a)** `statementgraad ÷ grootste andere typegraad in de sectie ≥ 2,0`;
> **(b)** `aantal typegraden groter dan de statementgraad = 0` — het statement **is** de sectiekop en er
> staat geen tweede kop naast.

- **SOURCE** — `S3-06` (`:1801-1806`), `sectiekopgraad ÷ grootste typegraad in enig vlak ≥ 2,0`, merk
  **`A`**, n=8, gemeten 2,05 · 2,31 · 2,41 · 2,73 · 3,14 · 3,22 · 3,23 · 3,80, minimum 2,05 → vloer 2,0.
  Omringende tekst = de MICRO-band (`:1846`): label 15,2–18,9/700 · regel 14,3–17,4/400 · metriekgetal
  28,0–28,4/700.
- **INTENT** — de relatie die punt (4) en `≥ 40px` samen probeerden te vangen: het statement heeft een
  **dominante maat tegenover de omringende tekst**. Dat is een verhouding, en er bestaat al een gemeten
  verhouding voor precies deze relatie — `S3-06`. Er komt dus géén nieuw getal bij.
- **CONFLICT** — (i) `S3-06` tegen `NF-4`'s eigen anatomie: met de uit `REG-1` overgenomen `kop 160`
  draagt de sectie twee koppen en meet `S3-06` `53 ÷ 66 = 0,80` **BEREKEND** < 2,0 → FAIL; zonder tweede
  kop is `S3-06` nergens gedefinieerd voor dit middel. (ii) `statementgraad ≥ 40px` tegen de MICRO-band:
  bij een metriekgetal van 28,4px meet de verhouding `1,41` **BEREKEND** < 2,0 — een statement op de
  px-vloer is dan **niet** dominant, terwijl de px-vloer hem goedkeurt.
- **RESOLUTION** — het statement neemt de rol van sectiekop over en wordt de **teller** van `S3-06`;
  `aantal koppen naast het statement = 0`. De px-vloer `≥ 40px` **blijft** staan (merk `A`, gemeten
  precedent 40,11px) maar is niet langer de dominantietoets — hij is de ondergrens van de *rol*, niet
  van de *verhouding*. Gevolg, **BEREKEND**: bij een statement op 40,11px mag de grootste andere
  typegraad hoogstens `40,11 ÷ 2,0 = 20,05px` zijn, dus **een statement op de vloer verdraagt geen
  metriekgetal van 28,0–28,4px**. Dat is geen nieuwe grens maar het eerste zichtbare gevolg van de
  oude twee samen.
- **EVALUATOR** — **MACHINE**. Beide helften zijn `getComputedStyle().fontSize` over de tekstdragers
  van de sectie; geen oordeel nodig.
- **TEST** — per `NF-4`-sectie: `n_tekstdragers = <getal>` (F-3: nooit een universele bewering), daaruit
  `g_max = max(graad ≠ statement)`; assert `statementgraad ÷ g_max ≥ 2,0` **en** `#{graad >
  statementgraad} = 0`. `n_tekstdragers = 0` → `FAIL met reden "niet meetbaar"` (F-2), nooit PASS.
  **Verwachte uitkomsten:** legitiem `66 ÷ 17,4 = 3,79` **BEREKEND** → PASS, en dat ligt binnen de
  gemeten `S3-06`-spreiding (hoogste gemeten waarde 3,80). Mastersprecedent `40,11 ÷ 17,4 = 2,31`
  **BEREKEND** → PASS.

---

#### **R3 — `S3-26 · RUSTVLOER EN VULPLAFOND VAN HET PODIUM`** → nieuw, vervangt de hoogteproxy

> **S3-26.** In een `NF-4`-sectie geldt, alle drie:
> **(a)** `Σ(hoogte van alles naast het statement) ÷ statementhoogte ≤ 0,62`;
> **(b)** `leegte = (sectiehoogte − inkthoogte) ÷ sectiehoogte ∈ [25,0% ; 39,0%]`, met
> `inkthoogte = statementhoogte + Σ(hoogte van alles naast het statement)`;
> **(c)** `kaartvlakken = 0` · `vlakken in de sectie = 1` (de grond zelf) · `bewijsregels ≤ 3` ·
> `CTA ≤ 1`.
> De sectiehoogte is daarmee een **afgeleide**: `sectiehoogte = inkthoogte ÷ (1 − leegte)`.

- **SOURCE** — (a) uit de harde grens van **ONDERSTEUNEND** (`:1816`): *"nooit 0,75–1,00 × het dominante
  vlak"*, met als hoogste ooit gemeten waarde **0,620** (`B`, n=10: 0,141…0,620). (b) uit het
  leegtebudget `CAN-08` (`:233`): `(boven + onder) ÷ sectiehoogte` = **16,8–23,3%** over 7 van 9 secties,
  met twee benoemde uitzonderingen **7,2%** (podium) en **39,0%** (paneel met eigen padding). (c) uit
  `NF-4`'s eigen `anatomie` (`:2344`) en `HARDE ONDERGRENS (3)`.
- **INTENT** — *"het podium haalt hoogte uit RUST in plaats van uit vulling"*, als twee aparte,
  meetbare uitspraken: (a) **niets naast het onderwerp mag het onderwerp benaderen** — de enige
  gemeten uitdrukking van die regel in dit document is de 0,62/0,75-band; (b) **de resterende hoogte
  is ontworpen leegte en geen restruimte**, met een expliciete ondergrens zodat 443,5px niet met
  blokken wordt volgelegd.
- **CONFLICT** — met §3.3.0, dat voor registers `leegte ≤ 25%` eist (overgenomen uit `G20`). Voor een
  `NF-4`-podium staat dat getal aan de **verkeerde kant**: daar is leegte het materiaal, niet het
  verlies. Verder met de gemeten band 16,8–23,3%: de legitieme compositie hieronder landt op **35,1%**
  **BEREKEND**, dus **boven** de band van 7 van 9 mastersecties en **onder** het gemeten maximum van
  39,0%. Dat moet hardop staan: `NF-4` is leger dan de typische mastersectie en niet leger dan de
  leegste.
- **RESOLUTION** — de 25,0% van `G20` wordt **omgekeerd** en als **ondergrens** hergebruikt (merk
  **`D`**, met als uitgeschreven reden: in een propositiepodium is leegte de drager, niet het verlies;
  het getal is niet nieuw gekozen maar van kant gewisseld). Het plafond 39,0% is **`B`, n=1** — de
  leegste gemeten mastersectie; leger dan de leegste gemeten sectie mag niet. De sectiehoogte is geen
  ingang meer maar een **uitkomst**, precies zoals `REG-5` de hoogte al door de inhoud laat bepalen.
  **Gevolg, BEREKEND:** om `443,5px` met leegte ≤ 39,0% te halen is minimaal
  `443,5 × 0,61 = 270,5px` inkt nodig, en met (a) daarbij een statement van minimaal
  `270,5 ÷ 1,62 = 167,0px`. Dat levert een **zelfstandigheidsoppervlak** in plaats van één krap punt:

  | statementgraad × regels (lh 1,00) | statementhoogte | inkt max | sectiehoogte bij leegte 25–39% | zelfstandig MEDIUM? |
  |---|---|---|---|---|
  | 40,11 × 3 | 120,3 | 194,9 | 259,9 – 319,6 | **nee** (`< 443,5`) |
  | 53 × 3 | 159,0 | 257,6 | 343,4 – 422,3 | **nee** |
  | 40,11 × 5 | 200,6 | 324,9 | 433,2 – 532,6 | **ja** |
  | 66 × 3 | 198,0 | 320,8 | 427,7 – 525,8 | **ja** |
  | 76,5 × 3 | 229,5 | 364,5 | 486,0 – 597,5 | **ja** |
  | 66 × 2 | 132,0 | 213,8 | 285,1 – 350,6 | **nee** |

  Alle waarden **BEREKEND** uit `NF-4`'s eigen ingangen. Minimale graad per regelaantal, **BEREKEND**:
  2 regels → 83,5px (buiten de gemeten kopband 76,5 → **2 regels is zelfstandig niet haalbaar**) ·
  3 regels → 55,7px · 4 regels → 41,7px · 5 regels → 33,4px.
- **EVALUATOR** — **MACHINE+REVIEWER**. De machine rekent (a), (b) en (c) uit `getBoundingClientRect()`.
  De reviewer beantwoordt §3.7 vraag 3 — leest het podium als **sectie** of als **tussenkop** — en die
  vraag is nu scherper gesteld: hij gaat niet meer over 4,5px marge maar over het geval waarin het
  venster smal is (zie TEST).
- **TEST** — per `NF-4`-sectie rapporteren: `statementhoogte`, `Σ naast`, `inkthoogte`, `sectiehoogte`,
  `leegte%`, met teller én noemer naast elke verhouding (`F-4`). Asserties: `Σnaast ÷ statement ≤ 0,62`
  · `25,0 ≤ leegte% ≤ 39,0` · `kaartvlakken = 0` · `vlakken = 1` · `bewijsregels ≤ 3` · `CTA ≤ 1` ·
  `sectiehoogte ≥ 443,5`. Het **venster** wordt meegerapporteerd, want dat is wat de reviewer nodig
  heeft: bij 2 bewijsregels op een statement van 66 × 3 is het `[443,5 ; 472,1]` = **28,6px**
  **BEREKEND**; bij 3 bewijsregels op een statement van 72,6 × 3 is het `[470,4 ; 578,3]` = **107,9px**
  **BEREKEND**. Venster ≤ 0 → `FAIL met reden "lege doorsnede"`, nooit PASS.

---

#### **R4 — `S3-27 · WAT EEN BEWIJSREGEL IS`** → nieuw, en de reden dat de generieke variant faalt

> **S3-27.** Een `NF-4`-bewijsregel is **één MICRO-paar**: label 15,2–18,9/700 + regel 14,3–17,4/400,
> ten hoogste **2 regels** hoog, zonder vlak. `bewijsregels ∈ [1,3]`. Lopende tekst in een
> `NF-4`-sectie → **FAIL** met de reden *"alinea is geen bewijsregel"*.

- **SOURCE** — de MICRO-rol (`:1844-1846`): grond `rgba(0,0,0,0)`, radius 0, geen schaduw, geen rand,
  padding 0, gemeten in **25 van 25** elementen (`A`); typeband label 15,2–18,9/700 + regel
  14,3–17,4/400 (`B`). Plus de ingang die `NF-4` zelf gebruikt: `2 × 45` in de BEREKENDE som.
- **INTENT** — vastleggen wat er naast het statement mag staan, zodat het vulplafond van `S3-26(a)` niet
  omzeilbaar is door "één blok" te schrijven dat in werkelijkheid acht regels lopende tekst is.
- **CONFLICT** — `NF-4` gebruikt `45px` als ingang maar definieert nergens wat een bewijsregel is. Zonder
  definitie is `bewijsregels ≤ 3` leeg: een alinea van acht regels is dan "1 bewijsregel".
- **RESOLUTION** — de 45px wordt **gereconstrueerd uit de gemeten MICRO-band** in plaats van gezet:
  `(18,9 + 17,4) × 1,24 = 45,01` **BEREKEND**, met de factor 1,24 binnen de gemeten rijlabelband
  `lh ÷ graad = 1,00–1,30` (§3.3.2). De 45px van `NF-4` **is** dus precies één label-plus-regel-paar aan
  de bovenkant van de gemeten banden. Dat is de ontbrekende definitie, en ze kost geen nieuw getal.
- **EVALUATOR** — **MACHINE**.
- **TEST** — per blok naast het statement: `regels = <getal>` (uit `Range.getClientRects()`, dezelfde
  methode als `silhouet.mjs`), `graad`, `gewicht`, `grond`, `radius`, `schaduw`. Assert `regels ≤ 2` ·
  `graad ∈ MICRO-band` · `grond = rgba(0,0,0,0)` · `radius = 0`. **Verwachte uitkomst op de opzettelijk
  zwakke variant** (een kop met een alinea, niets meer): een alinea van 8 regels lopende tekst van 17px
  bij `lh 1,60` meet `217,6px` **BEREKEND**; tegen een kop van 53px over 2 regels (`106px`) is
  `217,6 ÷ 106 = 2,05` **BEREKEND** → **FAIL op `S3-26(a)`** (plafond 0,62, en 2,05 ligt zelfs boven de
  verboden band 0,75–1,00), **en** FAIL op `S3-27` (`regels = 8 > 2`). Twee onafhankelijke gronden.

---

#### **R5 — `3.4.3`-tabelregel en `§3.7` vraag 3** → herformulering, geen nieuwe eis

- **SOURCE** — `:2393` (*"ja, 448px BEREKEND (krapste marge)"*), `:2397-2398` (*"NF-4 met 4,5px marge"*),
  `:2454-2455` (reviewvraag 3), `:2531` (de reeks BEREKENDE hoogtes, met `448` erin).
- **INTENT** — eerlijk melden hoe ruim elk middel de MEDIUM-vloer haalt.
- **CONFLICT** — 448px is onjuist: de som bevat de `kop 160` die `NF-4`'s eigen anatomie niet heeft, en
  het getal faalt `NF-4`'s eigen punt (4). "Marge 4,5px" beschrijft een marge die niet bestaat.
- **RESOLUTION** — de regel wordt gelijkvormig aan de regels die het document voor `NF-3` en `REG-4` al
  schrijft (voorwaardelijke zelfstandigheid, met het rekenkundige waarom erbij):
  **`NF-4` propositiepodium — zelfstandig MEDIUM: ja vanaf `inkthoogte ≥ 270,5px` BEREKEND; nee bij een
  statement van 40,11px over 3 regels (319,6px maximum) en nee bij 2 regels op elke graad binnen de
  gemeten kopband. Kritieke ondergrens: `S3-25` ≥ 2,0 · `S3-26` leegte 25–39% · 0 kaarten.`**
  Het getal `448` vervalt uit `:2393`, uit `:2397` en uit de reeks op `:2531`. `NF-4` is daarmee **niet
  langer het krapste van de zes**; het is het enige van de zes waarvan de sectiehoogte een **uitkomst**
  is in plaats van een optelling, net als bij `REG-5`.
- **EVALUATOR** — **REVIEWER** voor de leesvraag (podium of tussenkop), **MACHINE** voor het venster dat
  de reviewer meekrijgt.
- **TEST** — reviewvraag 3 wordt: *"bij een gerapporteerd venster van 28,6px — 2 bewijsregels op een
  statement van 66 × 3 — leest het podium als sectie of als tussenkop? En bij 107,9px?"* Een
  onbeantwoorde reviewvraag is **ONBEANTWOORD** en geen PASS (`:5197`, `B-01…B-07`).

---

### 3.9.3 · Verificatie van de twee gevraagde uitkomsten

**(1) Een legitieme compositie slaagt.** Statement 66px / 700 / `lh 1,00` / 3 regels met ≥ 1 handgezette
`<br>` = 198px · 2 bewijsregels van 45px = 90px · 0 kaarten · 1 grond · 0 tweede kop.

| toets | meting (BEREKEND) | uitkomst |
|---|---|---|
| `statementgraad ≥ 40px` | 66 | **PASS** |
| `S3-25(a)` `66 ÷ 17,4` | 3,79 ≥ 2,0 | **PASS** (binnen de gemeten spreiding 2,05–3,80) |
| `S3-25(b)` graden > statement | 0 | **PASS** |
| `S3-26(a)` `90 ÷ 198` | 0,455 ≤ 0,62 | **PASS** |
| `S3-26(b)` leegte bij `S = 443,5` | `(443,5 − 288) ÷ 443,5 = 35,1%` ∈ [25,0;39,0] | **PASS** |
| MEDIUM-vloer | `S ∈ [443,5 ; 472,1]`, venster 28,6px | **PASS** |
| `S3-27` regels per bewijsregel | 2 ≤ 2 | **PASS** |
| handgezette `<br>` ≥ 1 | 1 | **PASS** |
| *gerapporteerd, niet getoetst:* statementaandeel | `198 ÷ 443,5 = 44,6%` | `C` |

**(2) De opzettelijk zwakke, generieke variant faalt.** Een kop met een alinea, niets meer: kop 53px / 2
regels = 106px · alinea 17px / `lh 1,60` / 8 regels = 217,6px.

| toets | meting (BEREKEND) | uitkomst |
|---|---|---|
| `S3-26(a)` `217,6 ÷ 106` | **2,05** > 0,62 | **FAIL** — en boven de verboden band 0,75–1,00 |
| `S3-27` regels in het blok naast de kop | **8** > 2 | **FAIL** — alinea is geen bewijsregel |
| `S3-25(a)` `53 ÷ 17` | 3,12 ≥ 2,0 | PASS — **de verhoudingsregel alleen vangt dit geval niet** |
| `S3-26(b)` leegte bij `S = 443,5` | `(443,5 − 323,6) ÷ 443,5 = 27,0%` ∈ band | PASS — **de rustregel alleen vangt dit geval niet** |

Dat laatste is het punt van de reparatie: **de dominantieverhouding en het vulplafond moeten er beide
staan.** De graadverhouding keurt een generieke kop-met-alinea goed (een kop ís groter dan body), en de
rustmeting keurt hem ook goed (de sectie is niet overvol). Alleen de **verhouding tussen het statement en
wat ernaast staat** scheidt een podium van een tussenkop. Eén enkel getal — of het nu 440px, 450px of
45% is — kan dat verschil per constructie niet zien.

**Niet omzeilbaar.** Drie ontsnappingen, in de vorm van `§6.8.2`: *de alinea opsplitsen* in 4 blokken
van 2 regels → `bewijsregels ≤ 3` faalt. *De kop vergroten* tot 66 × 3 = 198 → `217,6 ÷ 198 = 1,10`
**BEREKEND** > 0,62, faalt nog steeds. *De alinea tot 3 regels inkorten* (81,6px) → `81,6 ÷ 198 = 0,412`
en leegte `(443,5 − 279,6) ÷ 443,5 = 36,9%`, **PASS** — en terecht, want dat **is** een
propositiepodium: één dominant statement, drie korte regels eronder, ruim een derde van de sectie lucht.
De poort scheidt op de juiste as.

---

### 3.9.4 · Het `ch`/`px`-conflict — twee domeinen, één naad

**De vondst.** Het conflict is niet alleen een eenheidskwestie; de twee banden zijn **disjunct**.
`E-04(iii)` eist `34–52ch`; `REG-1` DOCUMENT MODE, `REG-5` `maten · VAST` en poort `S3-20` eisen
`60–75 tekens`. `52 < 60`, gat **8 tekens** — **elke `REG-5`-pagina in DOCUMENT MODE faalt `E-04(iii)`
per constructie**, en `E-04` is via `§6.8.3` de **vervangende eis** voor de N.V.T. van `A-01`, `E-01` en
`E-02`. Onder `F-5` (*"N.V.T. met een vervangende eis die FAIL geeft = FAIL"*) betekent dat: de twee
archetypes die hoofdstuk 3 juist bouwbaar maakt — `algemene-voorwaarden.html` en `privacy.html` — zakken
op deel E, ongeacht hoe ze gebouwd worden. Het document weet de helft hiervan al (`DR-S-05`: *"Leesmaat
60–75 tekens in DOCUMENT MODE is GEZET, niet gemeten; zijn gemeten caps zijn 34–52ch op leads en
kaartbody's"*) maar trekt die conclusie niet.

**De twee domeinen, expliciet benoemd.**

| | **DOMEIN S — semantisch/typografisch** | **DOMEIN G — gerenderde geometrie** |
|---|---|---|
| **eenheid** | `ch` (en `tekens` als inhoudsmaat) | `px`, gemeten | 
| **waarover het gaat** | **leesmaat**: hoeveel tekens een regel draagt. Een eigenschap van letter + graad + tekstsoort, niet van het scherm | **botsing en plaats**: raakt iets een rand, overlapt iets, loopt iets over, hoe hoog is een sectie |
| **hoe vastgesteld** | **gedeclareerd** op het tekstelement zelf (`max-width: 64ch`), nooit op een container | **gemeten** met `getBoundingClientRect()` / `Range.getClientRects()` op 1774 · 1440 · 390px |
| **welke regels** | `E-04(i)` · `E-04(iii)` · `REG-1` DOCUMENT-veldbreedte · `REG-2`/`REG-4`/`REG-5` leesmaat · `S3-20` *"langste regel"* · `A-07`/`A7` DOCUMENT-vervanging (`:3564`, `:4565`) | `E-04(ii)` schermranden · `E-01` werkbreedte in %vw · `C-01` eenheidstoets · `S3-05` dominantiefloors · de MEDIUM-vloer 443,5px · `S3-26` rust · `REG-3` `overflow-x` |
| **wat verboden is** | een leesmaat in px of %, en een leesmaat die uit een container volgt | een botsingstoets in `ch` |

**De naad, en waarom er geen constante is.** `1ch` is de voortzetbreedte van het `0`-teken in de
**computed font** van *dát* element: hij verandert met letter, graad, `font-weight` en `font-feature`.
Een universele `ch → px`-factor bestaat daarom niet en wordt hier **niet** vastgelegd. De twee domeinen
raken elkaar op precies **één** plaats, en dat is een **meting per element**, geen constante:

> **`S3-28 · DE CH-TERUGLEZING.`** Voor elk element met een gedeclareerde leesmaat wordt per
> meetbreedte de **gerealiseerde** `ch` teruggelezen uit de browser: meet de gerenderde breedte in px en
> de voortzetbreedte van `0` in de computed font van dát element, en rapporteer
> `gerealiseerde ch = breedte_px ÷ ch_px`, **naast** de gedeclareerde waarde. Assert
> `|gerealiseerd − gedeclareerd| ≤ 1,0ch`. Een afwijking groter dan 1,0ch betekent dat een **container**
> de leesmaat heeft afgeknepen — en dat is precies het defect dat `E-04(i)` bedoelt te vangen.
> De `ch`-declaratie is het **gezag** (zij bepaalt of het ontwerp juist is); de px-terugmeting is de
> **getuige** (zij bewijst dat de declaratie ook echt gerealiseerd is). Nooit omgekeerd, en nooit via
> een gedeelde factor.

---

#### **R6 — `E-04(iii)`: `regellengte 34–52ch`** → gesplitst per tekstsoort, blijft in `ch`

- **SOURCE** — `:5144`, `E-04` PASS-voorwaarde (iii): *"de regellengte ligt tussen 34 en 52ch (gemeten op
  de master: 34 · 36 · 38 · 52ch **en 420px**; B2: 58 · 62 · 64ch — buiten de band)"*. Merk `B`
  (`:5147`, n=1 pagina). Herkomst van de waarden: `DR-S-05` (`:2413`) — *"gemeten caps zijn 34–52ch op
  **leads en kaartbody's**"*.
- **INTENT** — voorkomen dat DOCUMENT MODE een gecentreerde 1240px-restpagina wordt: de leesbreedte moet
  een **ontwerpbesluit** zijn en binnen een leesbare band vallen.
- **CONFLICT** — drie lagen. **(a) Disjuncte banden:** `34–52ch` tegen `60–75 tekens` van
  `REG-1`/`REG-5`/`S3-20`, gat 8 tekens → `E-04(iii)` faalt elke `REG-5`-pagina, en via `F-5` faalt
  daarmee de pagina. **(b) Vermengde eenheden binnen één band:** vier van de vijf mastermetingen staan
  in `ch`, de vijfde in **px (420px)**. Een px-waarde kan geen lid van een `ch`-band zijn; de band heeft
  feitelijk n=4, niet n=5. **(c) Vermengde eenheden in (i):** `E-04(i)` accepteert *"token of ch-maat"*,
  en een token mag px zijn — daarmee laat (i) binnen wat (iii) wil uitsluiten.
- **RESOLUTION** — **de leesmaat blijft volledig in DOMEIN S en wordt per tekstsoort gesplitst**, want
  het zijn twee verschillende gemeten objecten en niet twee meningen over één object:
  - **leads, kaartbody's, MICRO-regels, registerrijen (≤ 32 woorden): `34–52ch`** — merk `B`, n=4,
    **gemeten** (34 · 36 · 38 · 52), met de uitgeschreven herkomst *"gemeten op korte tekstvaten; het
    grootste tekstvat in alle vijftien V1.2-blauwdrukken is 32 woorden"*;
  - **lopende tekst in `REG-5`-kapittels en redactionele kolommen: `60–75ch`** — merk **`D`**, met de
    reden *"de master heeft geen lopende tekst van deze lengte, dus er is niets om uit te meten"* →
    blijft onder `DR-S-05` staan tot de eerste gebouwde `REG-5`-pagina.
  - **`tekens` wordt overal `ch`.** `REG-1`, `REG-2`, `REG-4`, `REG-5` en `S3-20` schrijven nu `tekens`,
    een **inhoudstelling** die van de string afhangt; `ch` is een **typografische maat** die van de
    letter afhangt. Alleen `ch` is declareerbaar en terugleesbaar, dus alleen `ch` blijft.
  - **(i) wordt scherper:** *"de leesbreedte is gedeclareerd in `ch` op het tekstelement zelf; een
    px- of %-token als leesbreedte is FAIL, ook wanneer het een token is."*
  - **de 420px vervalt uit de band** en wordt een eigen regel: zie **R7**.
  De tekstsoort is daarmee de **selector**, en de poort moet hem rapporteren — niet de bouwer kiezen.
- **EVALUATOR** — **MACHINE+REVIEWER**. De machine leest declaratie en realisatie per element en kiest
  de band op de gemeten tekstsoort (woorden per blok). De reviewer sluit `DR-S-05` en `DR-S-06`:
  *"is 60–75ch bij `lh 1,55–1,70` op 1581 woorden prettig in de eigen letter?"* — dat is §3.7 vraag 4
  en blijft een oordeel.
- **TEST** — per tekstdrager rapporteren: `woorden`, `tekstsoort` (kort ≤ 32 woorden / lopend > 32),
  `gedeclareerde ch`, `gerealiseerde ch` (`S3-28`), `band`, PASS/FAIL. `n_tekstdragers = 0` → `FAIL met
  reden "niet meetbaar"` (`F-2`). Regressietoets op de disjunctie zelf: assert dat de band van de
  lopende tekst en de band van de korte vaten **dezelfde tekstsoort niet beide claimen** — twee banden
  die op één element van toepassing zijn is een MEETFOUT (`MC-3`), geen FAIL.

---

#### **R7 — `E-04(iii)`, de vijfde meetwaarde `420px`** → geen bandlid, **blijft OPEN**

- **SOURCE** — `:5144`, binnen de reeks *"34 · 36 · 38 · 52ch en 420px"*.
- **INTENT** — vijf mastermetingen aanvoeren als bewijs voor de band.
- **CONFLICT** — de waarde staat in DOMEIN G terwijl de band in DOMEIN S ligt. Twee mogelijkheden, en
  welke het is **is in deze sessie niet gemeten** (geen browser gedraaid): **(a)** het element
  declareert zijn leesmaat in `ch` en alleen de **px-realisatie** is opgeschreven → dan moet de `ch`
  worden teruggelezen onder `S3-28` en kan de waarde alsnog bandlid worden; **(b)** het element
  declareert zijn leesmaat in **px** → dan is het geen bandlid maar het eerste **FAIL-geval van
  `E-04(i)`** op de master zelf, en dat is een bevinding over de bron van waarheid, niet over de band.
- **RESOLUTION** — de waarde wordt **uit de band gehaald** (de band is `B`, **n=4**) en apart genoteerd
  als `NIET GEMETEN — eenheid onverenigbaar met de band`. **`DR-S-13`:** lees op de eerste gerenderde
  meting de computed font en de gedeclareerde leesmaat van dit element terug en plaats hem in route (a)
  of (b). Tot dan is deze deeltoets **NIET MEETBAAR**, en dat is onder `F-1` geen PASS.
- **EVALUATOR** — **MACHINE** (één terugleesmeting beslist het), maar **nu niet uitvoerbaar**.
- **TEST** — `S3-28` op dat ene element; rapporteer `gedeclareerde eenheid`, `ch_px`,
  `gerealiseerde ch`. Uitkomst (a) → bandlid, n wordt 5. Uitkomst (b) → `E-04(i)` FAIL op de master,
  met de consequentie in `§6.9` (de poort mag de bron van waarheid afkeuren of de regel moet wijken —
  dat is een besluit van de opdrachtgever, net als bij het contrastgat `GAT-28`).

---

#### **R8 — `REG-1`/`REG-5` leesmaat tegenover §3.3.0 `registerveld ≥ 55% van de werkbreedte`** → **blijft OPEN**

- **SOURCE** — `:2039` (§3.3.0): *"registerveld ≥ 55% van de werkbreedte in DOCUMENT MODE; ≥ 40% in
  HYBRID MODE"*, merk `D` — gezet. Tegenover `:2114` (`REG-1` DOCUMENT MODE: *"registerveld 60–75
  tekens breed"*) en `:2199`/`:2204` (`REG-5`).
- **INTENT** — §3.3.0 wil dat een registersectie niet als smalle kolom in leegte leest (dezelfde zorg
  als `E-04(ii)`). `REG-1`/`REG-5` willen een leesbare regel.
- **CONFLICT** — een **%-vloer op de breedte** is DOMEIN G; een **`ch`-maat** is DOMEIN S. Of ze
  tegelijk haalbaar zijn hangt af van de `ch_px` van de eigen letter op de eigen graad, en dat is in
  deze sessie **niet gemeten**. Wat wél **BEREKEND** kan worden uit twee gemeten waarden: de mediane
  werkbreedte is `90,5% × 1774 = 1605,5px` (het document meet 1606px), dus `55% = 883,0px`. Of `75ch`
  bij de eigen letter op 17–19px die 883px haalt, is een **terugleesvraag**, geen ontwerpvraag.
- **RESOLUTION** — de twee eisen worden **niet** met een aangenomen factor verzoend. In plaats daarvan:
  **de `ch`-maat is het gezag** (zij bepaalt de leesbaarheid) en de %-eis van §3.3.0 wordt
  **geherformuleerd als een niet-afknijptoets in DOMEIN G**, in de vorm die `E-04(i)` al bedoelt:
  *"de breedte van het registerveld wordt niet door een container onder zijn gedeclareerde `ch`
  gebracht"* — dat is `S3-28` met de assertie `|gerealiseerd − gedeclareerd| ≤ 1,0ch`. De zorg "kolom in
  leegte" blijft gedekt, maar door de regel die daarvoor gemaakt is: **`E-04(ii)`** (≥ 50% van de
  DOCUMENT-secties heeft ≥ 1 element dat beide schermranden raakt) — een randtoets in px, precies waar
  hij hoort. De `55%`/`40%`-vloer vervalt als **breedte**-eis. **`DR-S-14`:** meet op de eerste gebouwde
  registerpagina `ch_px` en de gerealiseerde veldbreedte in %vw, en stel dan vast of de %-vloer als
  *rapportagewaarde* terugkomt — nooit als tweede, concurrerende breedte-eis.
- **EVALUATOR** — **MACHINE+REVIEWER**. Machine: `S3-28` plus `E-04(ii)`. Reviewer: §3.7 vraag 1 en 4 —
  leest het veld als leeskolom of als zwevende strook.
- **TEST** — per registersectie rapporteren: `gedeclareerde ch`, `gerealiseerde ch`, `veldbreedte px`,
  `veldbreedte %vw`, `elementen die beide schermranden raken`. Asserties: `S3-28` ≤ 1,0ch ·
  `E-04(ii)`-teller/noemer met absolute vloer (`F-4`). **Geen** assertie op %vw tot `DR-S-14` is
  gemeten; de waarde wordt gerapporteerd, niet getoetst.

---

#### **R9 — `NF-4` in CANVAS MODE tegenover de leesmaat** → `NVT-VOOR-DIT-ARCHETYPE`

- **SOURCE** — `:2350`: *"In CANVAS MODE mag het statement 100%vw aan beide schermranden raken; in
  DOCUMENT MODE blijft het binnen de leesmaat van 60–75 tekens **behalve** het statement zelf, dat als
  kop geldt."*
- **INTENT** — het statement vrijstellen van de leesmaat, omdat het een kop is en geen lopende tekst.
- **CONFLICT** — schijnbaar: een regel die zowel `100%vw` (DOMEIN G) als `60–75 tekens` (DOMEIN S) in één
  zin noemt. In werkelijkheid geen botsing — de uitzondering is al correct gesteld.
- **RESOLUTION** — vastleggen in de domeintaal, zodat de poort de uitzondering niet per ongeluk toetst:
  een `NF-4`-statement is **geen leesmaatobject**. Zijn regelval wordt bepaald door de ≥ 1 handgezette
  `<br>` (merk `A`: gemeten 11 `<br>` over 7 van 8 koppen, **geen enkele kop wrapt zelf**), dus zijn
  regellengte is een **auteursbesluit**, niet een maat. De `100%vw` in CANVAS MODE is een
  DOMEIN-G-uitspraak over het **vlak**, niet over de regel. De leesmaat van `R6` geldt wél voor de
  bewijsregels.
- **EVALUATOR** — **NVT-VOOR-DIT-ARCHETYPE** voor de leesmaattoets op het statement; **MACHINE** voor
  `<br> ≥ 1` en voor de leesmaat van de bewijsregels.
- **TEST** — assert `handgezette <br> in het statement ≥ 1` (geteld in de bron, niet in de render) én
  `regels(statement) = <br>-aantal + 1` op 1774px (`Range.getClientRects()`) — wrapt het statement
  alsnog zelf, dan is de regelval niet gezet en is dat **FAIL**, niet N.V.T. Leesmaattoets op het
  statement: `N.V.T.-met-reden = het statement is een kop`, en die N.V.T. telt mee onder `F-6`.

---

### 3.9.5 · Wat deze sectie toevoegt aan `§3.5` en `§3.6`

| nieuw | inhoud |
|---|---|
| **`S3-25`** | dominantieverhouding van het statement, hergebruik van `S3-06` (vloer 2,0, `A`, n=8) |
| **`S3-26`** | rustvloer 25,0–39,0% + vulplafond 0,62 (`B`, n=10) + sectiehoogte als afgeleide |
| **`S3-27`** | definitie van een bewijsregel = één MICRO-paar, ≤ 2 regels; `45px` gereconstrueerd als `(18,9 + 17,4) × 1,24` |
| **`S3-28`** | de `ch`-terugleesmeting: de enige naad tussen DOMEIN S en DOMEIN G, per element, geen constante |
| **`DR-S-13`** | de `420px` in `E-04(iii)` — route (a) of (b), **NIET GEMETEN** |
| **`DR-S-14`** | `ch_px` en veldbreedte %vw op de eerste gebouwde registerpagina — **NIET GEMETEN** |
| **vervallen** | `NF-4` `HARDE ONDERGRENS (4)` · de waarden `440` en `448` · *"krapste marge 4,5px"* · §3.3.0's `55%`/`40%` als breedte-eis · `tekens` als eenheid · de `420px` als bandlid |
| **nieuw in `§3.6`** | **13** — *`E-04(iii)` `34–52ch` tegenover `REG-1`/`REG-5`/`S3-20` `60–75 tekens`: disjuncte banden, gat 8 tekens; via `F-5` faalt elke `REG-5`-pagina op deel E.* Opgelost door `R6` (splitsing per tekstsoort, beide in `ch`). **14** — *`NF-4 (4)` tegenover de MEDIUM-vloer: lege doorsnede van 3,5px.* Opgelost door `R1`–`R3`. |

**EINDSTAND VAN DEZE SECTIE.** Zeven regels gesloten met een gemeten of herleide grens
(`R1`–`R6`, `R9`), **twee** regels blijven open omdat ze een browsermeting vragen die in deze sessie
niet gedraaid is (`R7` → `DR-S-13`, `R8` → `DR-S-14`). Drie reviewvragen blijven oordeel en geen poort
(§3.7 vragen 1, 3 en 4); die staan hier niet als open tegenstrijdigheid maar als `REVIEWER`.
**NIET GEDRAAID:** elke gerenderde meting — geen browser, geen screenshot, geen `silhouet.mjs`-run in
deze sessie. Alle px-waarden hierboven zijn **BEREKEND** uit ingangen die het document zelf opgeeft.

---


## 7.7 · `DR-U2-01`, `DR-U2-06`, `DR-U2-07` — gesloten, en twee ervan door uitvoering

Deze drie besluiten stonden **niet** in de werkboom: `grep -rn "DR-U2" .` geeft nul treffers in `docs/`.
Hun inhoud stond in het meetmateriaal van de vorige ronde (`scratchpad/v13/U2-aanvallen.md`, regels 137,
168–169, 195, 513, 552, 874). Zij zijn daar teruggelezen en hieronder gesloten — **twee van de drie door
dit ronde's harnas, niet door een tekst.**

### `DR-U2-01` — gelijke items met of zonder vlak

- **SOURCE** — `U2-aanvallen.md:137` en `:169`. `BLA-BR-02`'s terugval verbiedt een rij waarvan
  `max/min < 1,06` **terwijl de items een vlak hebben**. `DR-R4-09`'s kaartrijband staat `1,000` toe
  (≤ 1,01) zodra de registertoets 4× JA haalt. Drie identieke witte kaarten halen die toets met gelijke
  copylengte.
- **INTENT** — `BLA-BR-02` wil de terugval "vier witte kaarten met schaduw" uitsluiten. `DR-R4-09` wil een
  gelijk register toestaan, omdat Master v1 zelf 4 van 5 `K8`-rijen exact gelijk heeft — en dat mag daar,
  **omdat die rijen geen oppervlak hebben**.
- **CONFLICT** — twee lagen beoordeelden dezelfde rij met twee drempels en gaven twee antwoorden. De
  oorzaak: *de aanwezigheid van een vlak was niet declareerbaar*, dus elke laag moest hem raden.
- **RESOLUTION** — het kaartschema maakt beide feiten expliciet in **één** veld.
  `surface_hierarchy.pattern` telt de vlakken (`0D-0O-0A-nM` = geen vlak, de `D-0`-vorm);
  `surface_hierarchy.equal_row.count` telt de gelijke items. Eén regel leest beide. Een gelijke rij **met**
  vlakken is nooit toegestaan boven één voorkomen en nooit zonder uitgeschreven rechtvaardiging; een
  gelijke rij **zonder** vlak is onbeperkt toegestaan en dát is de mastervorm.
- **EVALUATOR** — **MACHINE**. `KP-07`.
- **TEST** — `KP-07 GELIJKE RIJEN`. **Gedraaid.** `control-b-generiek` declareert twee rijen met patroon
  `0D-3O-0A-0M` (drie ONDERSTEUNENDE vlakken) en `equal_row.count = 3` → **FAIL**, *"2 rijen, 2 zonder
  rechtvaardiging"*. `homepage` declareert één gelijke rij (sectie 07, vier registerkaarten) **met**
  rechtvaardiging → **PASS**. `control-a-premium` idem, één rij met rechtvaardiging → **PASS**.

### `DR-U2-06` — `CP-01a` gaf drie antwoorden op drie kaartensets

- **SOURCE** — `U2-aanvallen.md:874`. Dezelfde functie en dezelfde drempel gaven op de `T1`-, `H5`- en
  `U1`-werkzones drie verschillende uitkomsten (`B` FAIL · `A`+`D` FAIL · 5 van 5 PASS). Gemarkeerd
  **BLOKKEREND voor `CP-01a`**.
- **INTENT** — één cross-paginacriterium dat structureel klonen aanwijst.
- **CONFLICT** — er bestond **geen canonieke kaartenset**. Het criterium was daarmee geen poort maar een
  functie van de willekeurig gekozen invoer. De eerdere `U1`-PASS was dus geen bewijs dat de drempel scheidt.
- **RESOLUTION** — `docs/data/vibe-site-register.json` plus `docs/compositions/` **is** de enige canonieke
  set, en het register schrijft dat zelf op in `governance_note`. `CP-01a` wordt vervangen door `XP-01`,
  `XP-02` en `XP-03`, die uitsluitend op die set draaien. Het drie-antwoordenprobleem kan niet terugkomen
  omdat er één set is. **Wat eerlijk blijft staan:** de set bevat nu **1** niet-controle-kaart
  (`homepage`), dus de cross-paginatoetsen draaien op een verzameling van één plus de controlekaarten.
  Dat is de reden dat `XP-01` op `homepage` zelf een `NVT`-met-vervanger geeft en niet een PASS.
- **EVALUATOR** — **MACHINE**.
- **TEST** — `XP-01`/`XP-02`/`XP-03`. **Gedraaid.** `control-c-kloon` → `XP-01` **FAIL**, 7 van 7 assen boven
  60%, waarvan impact · blauwdruk · drager · media alle vier **9/9 identiek**; `XP-02` **FAIL**, identieke
  relatieve HIGH-posities. Dezelfde functie, één set, één antwoord.

### `DR-U2-07` — een `NVT` zonder vervanger keurde een premiumpagina af

- **SOURCE** — `U2-aanvallen.md:513` en `:552`. Na `DR-R1-01` is een `NVT` zonder vervangende eis een
  `FAIL`. `A-05` (kaartrij) is op een premiumpagina met **0** kaartrijen `NVT` — en `H6 §6.8.3` zei
  letterlijk *"geen vervangende eis nodig"*. Gevolg: de poort keurde een goede pagina af omdat zij een
  antipatroon **niet** had.
- **INTENT** — voorkomen dat een niet-uitgevoerde toets als PASS wordt geteld.
- **CONFLICT** — de reparatie die lege-verzameling-PASS sloot, opende een lege-verzameling-FAIL.
- **RESOLUTION** — de regel wordt **drieledig** in plaats van tweeledig, en dat staat in code, niet in
  prozatekst. Een afwezig antipatroon is géén `NVT`: hij is een **PASS op een plafondregel**. Een
  afwezige *vereiste* is een `NVT` die een vervanger nodig heeft. In het harnas is `KP-07` daarom een
  plafond (`≤ 1`, dus 0 rijen = PASS) en zijn `KP-08`, `KP-11`, `KP-12` en `XP-01` vloeren die elk een
  benoemde vervanger dragen.
- **EVALUATOR** — **MACHINE**. De functie `verdict()`.
- **TEST** — `node docs/qa/composition-gate.mjs --zelftest`. **Gedraaid, 8 van 8 PASS**, waaronder
  *"NVT zonder reden ⇒ FAIL"*, *"NVT zonder vervanger ⇒ FAIL"*, *"NVT met falende vervanger ⇒ FAIL"*,
  *"NVT met NVT-vervanger ⇒ FAIL"* en *"NVT met geslaagde vervanger ⇒ NVT"*.
  En op een echte kaart: `control-a-premium` heeft **0** kaartrijen en krijgt `KP-07` **PASS**, niet `NVT`.

---


## 7.8 · INTERNE TEGENSTRIJDIGHEDEN — `IC-01`…`IC-18` gesloten

> Deze paragraaf is in deze ronde geschreven en volledig opgenomen.
> Elke regel draagt SOURCE / INTENT / CONFLICT / RESOLUTION / EVALUATOR / TEST.

**Meetbasis van deze sessie.** Gelezen: `/Users/mounirvanbinsbergen/projects/vibe-website/docs/04-visual-language-v1.3.md` (5335 regels) en `/Users/mounirvanbinsbergen/projects/vibe-website/docs/00-changelog.md` (200 regels). Zelf gedraaid in deze sessie: zes greps over `docs/`, `review/` en de projectwortel. **Nul bestanden gewijzigd** — geen productiebestand, geen doc, geen asset, niets gecommit.

Codes in dit stuk: `IC-01…IC-18`. Gemeten in deze sessie: `grep -rc "IC-0" docs/*.md` geeft **nul treffers**, dus de prefix botst met geen enkel bestaand register (`DR-B-14` noemt nummereigendom met reden een probleem).

Elke resolutie hieronder heeft een **MACHINE-uitvoerbare** kern. Waar een REVIEWER-toets erbij staat is die **adviserend**: hij kan een FAIL niet in een PASS veranderen. Dat is bewust — er is nog geen benoemde reviewer (zie USER DECISION REQUIRED).

---

### 0 · NIET VINDBARE REFERENTIES — `DR-U2-01`, `DR-U2-06`, `DR-U2-07`

**Gemeten, deze sessie:**

```
grep -rn "DR-U2" .                      -> 0 treffers (hele projectwortel)
grep -rn "DR-U2\|DR-U-" docs/ *.html    -> 0 treffers
git log --all -S"DR-U2"                 -> 0 commits
```

De prefixen die in `04-visual-language-v1.3.md` werkelijk bestaan zijn `DR-C` (H1), `DR-I` (H2), `DR-S` (H3), `DR-G` (H4), `DR-B` (H5), `DR-Q` (H6), plus overgenomen `DR-V` uit V1.2 en één `DR-R1-13` in een codecommentaar (`docs/qa/bouw-register.mjs:14`). Een reeks `DR-U2` bestaat in deze werkboom **niet**.

**Gevolg, eerlijk opgeschreven:** ik kan `DR-U2-01`, `DR-U2-06` en `DR-U2-07` niet lezen en dus niet sluiten. Hun inhoud is **UNKNOWN**. Ze als "opgelost" boeken zou een verzinsel zijn. Ze blijven daarom geteld als openstaand, met reden *bron ontbreekt*, niet met reden *inhoudelijk onbeslist*.

- **RESOLUTION (procedureel, wél uitvoerbaar).** De drie codes worden aangeleverd als tekst, óf hernummerd onder een prefix die in `docs/` bestaat en een eigenaar heeft (`DR-S` voor de vlakken-/registerlaag, `DR-B` voor de blauwdruklaag). Zolang ze nergens staan, mag geen enkel poortrapport of besluit ernaar verwijzen.
- **EVALUATOR** — MACHINE.
- **TEST** — `grep -rn "DR-U2" .` geeft ≥ 1 treffer in een bestand onder `docs/` **en** elke treffer staat in een besluitenregister met een eigenaar → **PASS**. Nul treffers terwijl een besluit of rapport de code aanhaalt → **FAIL** (hangende verwijzing).

> Vermoedelijke aansluiting, **niet gemeten, geen bewijs**: de drie vragen van de taakstelling (BR-02 rond r. 3769, T-2 rond r. 4572, DR-B-05 rond r. 4621) worden hieronder volledig gesloten als `IC-01…IC-11`. Als `DR-U2-01/06/07` dáárop doelden, zijn ze daarmee inhoudelijk gedekt. Dat is een hypothese over de nummering, geen vastgestelde gelijkstelling.

---

### 1 · `BR-02` ONGELIJKE VERZAMELING — elf tegenstrijdigheden, alle gesloten

#### IC-01 · De stuurmaatband van `BR-02` botst met de rangregel `DR-S-01`

- **SOURCE** — `04-visual-language-v1.3.md` r. 3780–3781, 3784 (BR-02 STUURMAAT/CAPACITEIT/TOETSEN) tegen r. 1964–1978 + r. 2409 (`DR-S-01`, §3.2.3).
- **INTENT** — H3 wil één rangregel die C1, GRENS 1, GRENS 2 en GRENS 3 vervangt; H5 wil dat een rij van drie kaarten weer bouwbaar is (`T-2`).
- **CONFLICT** — twee onverenigbare banden voor dezelfde grootheid. `BR-02`: toegestaan `≤ 1,06` of `≥ 1,55`, verboden `1,06 < x < 1,55`. `DR-S-01`: toegestaan `≤ 1,01` of `≥ 1,20`, verboden `1,01 < x < 1,20`. Meetbaar uiteenlopend op twee stroken: **1,02–1,06** is PASS onder `BR-02` en FAIL onder `DR-S-01`; **1,20–1,55** is PASS onder `DR-S-01` en FAIL onder `BR-02`. Eén waarde beslist niets (de masterrij 1,051 faalt beide, want zij draagt vlakken), de band wel.
- **RESOLUTION** — `BR-02` neemt de rangregel over; H3 is er eigenaar van (§3.2.3 zegt letterlijk dat zij C1/GRENS 1/2/3 vervangt). `BR-02` meet voortaan **twee** stuurmaten in plaats van één:
  - **SM-A (rangscheiding)** `oppervlak(dominant) ÷ oppervlak(breedste niet-dominante item) ≥ 1,55` — `S3-12`, klasse A, n=9, gemeten minimum 1,613. Zijn **alle** items `D-0`, dan bestaat er geen vlak: SM-A = `N.V.T.-met-reden "geen vlak"` en in de plaats komt **SM-A′** `graad(dominant) ÷ graad(hoogste niet-dominante item) ≥ 1,35` — de stapfactor die het document al bezit (`S3-20`, r. 2210), met gemeten steun in `DR-S-01` zelf: het extra element van de K1-dominant is `kop ×1,446` (r. 1970), marge 0,096 boven 1,35.
  - **SM-B (binnen de niet-dominante rang)** breedte `max/min ≤ 1,01` bij registertoets 4 × JA, óf `≥ 1,20` bij < 4 × JA mét "het breedste lid draagt precies één element dat de andere missen". Verboden zone: `1,01 < x < 1,20`.
  - De getallen `1,06` en de zone `1,06–1,55` vervallen uit `BR-02`. `DELTA-BR ≥ 0,15` wordt gemeten op SM-A waar SM-A geldt, anders op SM-B.
- **EVALUATOR** — MACHINE.
- **TEST** — per `BR-02`-sectie: (i) SM-A ≥ 1,55, of SM-A `N.V.T. (alle D-0)` **en** SM-A′ ≥ 1,35; (ii) SM-B ≤ 1,01 of ≥ 1,20; (iii) geen SM-waarde in `1,01 < x < 1,20`; (iv) de kaart noemt teller én noemer van beide (`MC-4`). Alle vier → **PASS**; één niet → **FAIL**. Narekening op het bestaande papier: pagina B pos 2 (`1,00`, alle `D-0`) → SM-B 1,00 ≤ 1,01 **PASS**, SM-A′ moet nog in de kaart; pagina D pos 2 (`1,67`, `D-F ×1 + D-V ×5`) → SM-A 1,67 **PASS**, SM-B **NIET GEMETEN** in de kaart → **FAIL tot de vijf itembreedtes erin staan**.

#### IC-02 · `T-2` leunt op `GRENS 3`, die in hetzelfde document is afgeschaft

- **SOURCE** — r. 4572 (§5.4.4, rij T-2): *"De verboden zone 1,06 < x < 1,55 blijft (`GRENS 3`)"* tegen r. 1964: *"`DR-S-01`: de rangregel vervangt C1, GRENS 1, GRENS 2 en GRENS 3."*
- **INTENT** — H5 wil de band van de kaartlaag behouden als grond voor de T-2-reparatie.
- **CONFLICT** — H5 verklaart een regel geldig die H3 twee hoofdstukken eerder heeft ingetrokken. De T-2-beslechting rust daarmee op een niet-bestaande bron.
- **RESOLUTION** — de verwijzing `GRENS 3` in r. 4572 wordt vervangen door `DR-S-01`, en de band in die rij wordt de band uit IC-01. T-2 blijft opgelost, maar nu op de regel die werkelijk geldt: drie items mogen in **twee** vormen — (a) dominant item met SM-A ≥ 1,55 en de rest op SM-B, (b) alle items `D-0` met SM-A′ ≥ 1,35 en SM-B ≤ 1,01.
- **EVALUATOR** — MACHINE.
- **TEST** — `grep -n "GRENS 3" docs/04-visual-language-v1.3.md` levert geen regel meer op waarin GRENS 3 als **geldend** wordt aangehaald (alleen als vervangen) → **PASS**; elke overgebleven aanhaling als geldende norm → **FAIL**.

#### IC-03 · `VERPLICHT (1)` eist graad **én** breedte; de drie-itemvorm haalt alleen graad

- **SOURCE** — r. 3773 (*"het draagt een eigen typografische graad **en** is ≥ 1,55× zo breed als het smalste item van zijn rij"*) tegen r. 3781 + r. 3798–3807 (Uitwerking 2: `max/min = 1,00`, *"dominantie zit in de graad van item 1, niet in zijn breedte"*).
- **INTENT** — dominantie meetbaar maken; en tegelijk een fotoloze drie-itemvorm toestaan.
- **CONFLICT** — de `en` maakt Uitwerking 2 van `BR-02` **ongeldig onder `BR-02` zelf**: 1,00 < 1,55. De blauwdruk verbiedt zijn eigen tweede uitwerking, en daarmee ook pagina B pos 2 (r. 4374).
- **RESOLUTION** — `VERPLICHT (1)` wordt: *"één item is aantoonbaar dominant: het draagt een eigen typografische graad **en** haalt SM-A ≥ 1,55, óf — als alle items `D-0` zijn — SM-A′ ≥ 1,35."* De `en` blijft dus bestaan, maar de tweede helft is modus- en dragerafhankelijk in plaats van altijd een breedte. Let op de tweede correctie: `S3-12` meet **oppervlak**, niet breedte; `BR-02` schreef breedte. Oppervlak wordt de maat, breedte alleen binnen SM-B.
- **EVALUATOR** — MACHINE.
- **TEST** — exact één item heeft een eigen graad **en** (SM-A ≥ 1,55 óf SM-A′ ≥ 1,35) → **PASS**; nul of twee items met eigen graad, of beide maten onder hun vloer → **FAIL**.

#### IC-04 · `VERPLICHT (2)` eist ≥ 2 rijen; de drie-itemvorm heeft er één

- **SOURCE** — r. 3773 (*"het aantal rijen is ≥ 2"*) en r. 3782 (VARIATIEBEREIK *"2–3 rijen"*) tegen r. 3798 (*"drie items, één rij"*) en r. 4374 (pagina B pos 2).
- **INTENT** — een `n×m`-raster uitsluiten door ten minste twee verschillend verdeelde rijen te eisen.
- **CONFLICT** — de hele T-2-reparatie is één rij van drie. `BR-02` eist er twee. De blauwdruk is met zichzelf in strijd op het punt waarvoor hij is geschreven.
- **RESOLUTION** — het rijaantal wordt een functie van het itemaantal, en dat is precies waar `BR-02`'s capaciteitsrekening al voor bedoeld is: **n = 3 → exact 1 rij** (en dan geldt de rijverschilvoorwaarde niet, zie IC-05); **n = 4–6 → ≥ 2 rijen met verschillende kolomverdeling**. VARIATIEBEREIK wordt `1 rij bij 3 items · 2–3 rijen bij 4–6 items`. De ORIENTATIE-randvoorwaarde ("de twee rijen") wordt geherformuleerd als *"ten minste één paar opeenvolgende rijen"*, zodat hij ook bij 3 rijen uitvoerbaar is.
- **EVALUATOR** — MACHINE.
- **TEST** — `n = 3 ∧ rijen = 1`, of `4 ≤ n ≤ 6 ∧ rijen ∈ {2,3}` → **PASS**; elke andere combinatie (bijv. 3 items over 2 rijen, of 6 items op 1 rij) → **FAIL**.

#### IC-05 · `TOETS (3)` slaagt stil op de lege verzameling — exact het V1.2-lek

- **SOURCE** — r. 3784, toets 3 (*"de rijen verschillen ≥ 3% van de sectiebreedte in ≥ 1 naad → anders FAIL"*) tegen `00-changelog.md` r. 66 (*"een lege meting slaagt (`[].every()` is `true`)"*) als een van de vijf structurele V1.2-fouten.
- **INTENT** — twee identiek verdeelde rijen uitsluiten.
- **CONFLICT** — bij één rij is de verzameling rijparen leeg. Een `every()`-implementatie boekt dan **PASS** zonder iets te meten. De drie-itemvorm zou dus langs de toets glippen die haar had moeten beoordelen, en dat is de fout die V1.3 nu juist repareert.
- **RESOLUTION** — toets 3 wordt onder `MC-4` gebracht (r. 4711: *"Noemer 0 → N.V.T.-met-reden volgens §6.8, nooit PASS en nooit een stille FAIL"*): bij `rijen = 1` luidt de uitkomst `N.V.T.-met-reden "één rij, n = 3"`, mét de vervangende eis uit IC-03/IC-01 (SM-A′ ≥ 1,35 en SM-B ≤ 1,01) die **wél** een PASS/FAIL geeft. Een N.V.T. zonder geslaagde vervangende eis is volgens §6.1.4 geen GOEDGEKEURD.
- **EVALUATOR** — MACHINE.
- **TEST** — bij `rijen = 1` rapporteert de poort letterlijk `N.V.T. (één rij) + vervanger SM-A′/SM-B = PASS|FAIL`; rapporteert zij `PASS` zonder teller en noemer → **FAIL** (MEETFOUT, `MC-3`).

#### IC-06 · Het `DRAGER`-veld sluit `D-0` uit, terwijl vier andere velden `D-0` eisen

- **SOURCE** — r. 3776 (*"per item: `D-F` … `D-V` … gemengd toegestaan"*, `D-0` komt er niet in voor) tegen r. 3781 (CAPACITEIT), r. 3780 (STUURMAAT), r. 3784 (toets 1), r. 3798–3807 (Uitwerking 2) en r. 4374 (pagina B pos 2 met drager `D-0`).
- **INTENT** — plaatshouders en lege beeldslots buitensluiten (`C2`, `brandbook §4.4`).
- **CONFLICT** — `D-0` is in dit veld door weglating verboden en in vier andere velden voorgeschreven. De B-pagina staat met `D-0` in de compositietabel en zou op zijn eigen blauwdruk falen.
- **RESOLUTION** — `DRAGER` wordt: *"per item `D-F`, `D-V` of `D-0`; gemengd toegestaan, met deze beperking: `D-0` en `D-V`/`D-F` mogen niet in dezelfde **rang** staan — een rang is óf geheel zonder vlak, óf geheel met vlak. Nooit een plaatshouder."* Die beperking is geen nieuw getal maar de leesbare consequentie van `TERUGVAL` (r. 3783: gelijk mág zonder vlak, niet mét vlak).
- **EVALUATOR** — MACHINE.
- **TEST** — per rang: `aantal items met vlak ∈ {0, n}` → **PASS**; een rang die `D-0` en `D-V` mengt → **FAIL**. En: `D-0` komt voor in het DRAGER-veld van `BR-02` → **PASS**, anders **FAIL** (documentatietoets).

#### IC-07 · `CANVASMODUS` eist voor DOCUMENT "alle dragers `D-V`"; Uitwerking 2 is DOCUMENT met alle dragers `D-0`

- **SOURCE** — r. 3779 (*"DOCUMENT toegestaan als alle dragers `D-V` zijn"*) tegen r. 3798 (*"Uitwerking 2 — drie items, één rij, geen kolom, alle dragers `D-0` (DOCUMENT)"*).
- **INTENT** — in DOCUMENT MODE geen fotografische verzameling toestaan.
- **CONFLICT** — de blauwdruk verbiedt in één regel de modus die zijn eigen tweede uitwerking in de volgende regel gebruikt. En het verbod is te streng de verkeerde kant op: `D-0` is nóg terughoudender dan `D-V`.
- **RESOLUTION** — `CANVASMODUS` wordt: *"HYBRID (standaard) · DOCUMENT toegestaan als **geen item een `D-F`-drager heeft** (dus alle items `D-V`, alle items `D-0`, of een mengvorm per rang volgens IC-06) **en** de verzameling binnen de leesbreedte blijft."* Grond: in DOCUMENT MODE is `cqw` verboden en geldt de leesmaat (§1.3.5, §4.2.3); een foto is dat wat de leeskolom breekt, niet een getekend vlak of een regel.
- **EVALUATOR** — MACHINE.
- **TEST** — `modus = DOCUMENT ∧ aantal D-F-items = 0 ∧ verzamelingsbreedte ≤ leesbreedte` → **PASS**; één `D-F`-item in DOCUMENT → **FAIL**.

#### IC-08 · `GEOMETRIE` staat 0 of 1 snede toe; `TOETS (5)` eist er ≥ 2 — `DR-B-05`, deel 1

- **SOURCE** — r. 3778 (*"GEOMETRIE: 0 of 1. Eén `GR-SNEDE`, en **uitsluitend** op een item met dragersoort `D-V`. De sectie zelf blijft ongesneden."*) tegen r. 3783/3784 (*"zijn er ≥ 3 `D-V`-items, dan dragen ze ≥ 2 verschillende hoekwaarden en ≥ 2 verschillende vlakstructuren"*), r. 3790–3793 (Uitwerking 1 toont **drie** gesneden items: 25°, 18°, 31°), r. 4401/4410 (pagina D: **vijf** `D-V`-items die *"≥ 2 hoekwaarden en ≥ 2 vlakstructuren"* dragen) en `5.0.4` r. 3611–3615 (elke `GR-`rol: *"max 1 per sectie"*).
- **INTENT** — geometrie als functie houden en een sectie niet vol diagonalen zetten; tegelijk "n keer hetzelfde vlak" uitsluiten.
- **CONFLICT** — `≥ 2 hoekwaarden` op `≥ 3 D-V`-items is rekenkundig onverenigbaar met `max 1 GR-SNEDE per sectie`. De eigen uitwerking en de eigen pagina D overtreden het eigen GEOMETRIE-veld. Dit is de eerste helft van de vraag in `DR-B-05`.
- **RESOLUTION** — scheid **sectiegeometrie** van **itemgeometrie**; die scheiding bestaat al in het vocabulaire (`H-NEST` = vlak binnen vlak).
  - Het `GR-`quotum (max 1 per sectie per rol, `GR-ANKER` max 1 per pagina) geldt voor **sectiemiddelen**: middelen die de sectiegrens, de schermrand of de ondergrond raken. In `BR-02` blijft dat **0 of 1**, en de sectie blijft ongesneden.
  - De snede ín een `D-V`-item is **itemgeometrie** (`H-NEST`), telt niet mee in het `GR-`quotum, en kent een eigen plafond: **ten hoogste één snede per item**, dus ten hoogste `n` sneden in een verzameling van `n` items (`n ≤ 6` volgens CAPACITEIT).
  - Een itemsnede moet een van de zes structurele antwoorden `F1…F6` geven (§4.1.3) — anders is zij decoratie en valt zij onder de WEGLAATTOETS (§4.1.4).
- **EVALUATOR** — MACHINE + REVIEWER (de machine telt en meet; de weglaattoets per snede is reviewerwerk).
- **TEST** — `sectiemiddelen(BR-02) ≤ 1 ∧ ∀item: sneden(item) ≤ 1 ∧ sneden_totaal ≤ n ∧ ∀snede: antwoord ∈ {F1…F6} met zijn getal` → **PASS**; een sectiebrede snede in een `BR-02`, of een item met twee sneden, of een snede zonder F-antwoord → **FAIL**.

#### IC-09 · De hoekwaarden van Uitwerking 1 (25°, 18°) liggen buiten het klasse-A-omhulsel — `DR-B-05`, deel 2

- **SOURCE** — r. 3790–3793 (25°, 18°, 31°) en r. 4621 (*"Master v1 heeft **één** getekend itemvlak (25°)"*) tegen r. 2685–2689 (*"Buitenomhulsel, klasse A: elke vrije schuine rand … ligt in **9,0–14,0°** of **27,0–37,0°**. Gemeten op Master v1: 13 van 14 waarden in het omhulsel; één uitzondering (25,0°, zie 4.1.6 `DR-G-07`)"*) en r. 3578 (homepagespecifieke waarden zijn klasse C en worden in V1.3 **geen** regel).
- **INTENT** — DR-B-05 wil weten wat het minimale onderlinge verschil tussen getekende vlakken is.
- **CONFLICT** — meetbaar drie keer: **18,0°** ligt in geen van beide klasse-A-banden; **25,0°** is juist de enige benoemde masteruitzondering en wordt door `BR-02` tot voorbeeldwaarde verheven, wat tegen de klasse-C-politiek van r. 3578 ingaat; **31,0°** haalt het omhulsel maar valt buiten de rolband `GR-RAND 31,6–36,2°` van `5.0.4`. De illustratie van `BR-02` is dus op twee van de drie waarden ongeldig onder H4.
- **RESOLUTION** — `DR-B-05` wordt gesloten met de meetmethode die H4 zelf gebruikt (banden met een **gemeten leeg interval**, zoals de impacttrap in §4.2.3):
  - **Hoeveel getekende vlakken mag een verzameling dragen?** 1 tot `n`, met `n ≤ 6` (CAPACITEIT), ten hoogste één snede per item (IC-08).
  - **Wat is het minimale onderlinge verschil?** Bij `≥ 3 D-V`-items dekt de verzameling **beide** klasse-A-banden: ten minste één hoek in `9,0–14,0°` en ten minste één in `27,0–37,0°`. Daarmee is het onderlinge verschil per constructie **≥ 13,0°** — precies de breedte van het gemeten lege interval `14,0–27,0°` op Master v1. Geen nieuw getal, wel een harde vloer.
  - **Anti-schijnvariatie:** drie of meer itemhoeken binnen `1,5°` van elkaar is **FAIL**, letterlijk de SYSTEEM-X-signatuur uit §4.1.1 defect 1 (31,0 · 30,5 · 30,0 · 29,5°, spreiding 1,5°).
  - **"≥ 2 vlakstructuren"** wordt meetbaar gemaakt als: de itemvlakken geven ten minste **twee verschillende antwoorden uit `F1…F6`** (§4.1.3). Dat is de enige structuurdefinitie die het document bezit.
  - **25,0° en 18,0° verdwijnen uit Uitwerking 1.** De illustratie gaat naar twee waarden die beide banden dekken, bijvoorbeeld één hoek uit `9,0–14,0°` en twee uit `27,0–37,0°` die ≥ 1,5° uiteen liggen. Welke exacte waarden is een bouwkeuze, geen besluit: elke combinatie die de toets haalt, is goed.
- **EVALUATOR** — MACHINE + REVIEWER (machine: banden, spreiding, F-antwoorden; reviewer: of twee regimes ook als twee regimes lézen — reviewvraag 2 bij `BR-02`, r. 4597).
- **TEST** — bij `≥ 3 D-V`-items: `(∃ hoek ∈ [9,0;14,0]) ∧ (∃ hoek ∈ [27,0;37,0]) ∧ (geen 3 hoeken binnen 1,5°) ∧ (|unieke F-antwoorden| ≥ 2)` → **PASS**; elke hoek buiten beide banden (18,0° · 25,0°), of drie hoeken binnen 1,5°, of één F-antwoord voor alle vlakken → **FAIL**.

#### IC-10 · De `BR-F2`-reparatie van pagina B produceert een `BR-02` die op zijn eigen TERUGVAL faalt

- **SOURCE** — r. 4545 (*"op B wordt `BR-02` op positie 2 een `D-V`-variant (drie getekende itemvlakken in plaats van drie `D-0`-regels)"*) tegen r. 4374 (pagina B pos 2 stuurmaat `1,00`) en r. 3783 (TERUGVAL: `max/min < 1,06` **terwijl** de items een vlak hebben → verboden).
- **INTENT** — de dragerverscheidenheidsvloer `BR-F2` halen op pagina B (nu 1 soort, vereist 2).
- **CONFLICT** — de voorgeschreven reparatie laat de stuurmaat op 1,00 en geeft de items een vlak. Dat is letterlijk de verboden terugval "n gelijke tegels". De reparatie van blokkade BLK-05 maakt pagina B op `BR-02` ongeldig, en geen enkele regel in §5.4.2 merkt het.
- **RESOLUTION** — de reparatie wordt volledig opgeschreven in plaats van half: pagina B pos 2 wordt een `BR-02` met **drie `D-V`-items, SM-A ≥ 1,55 en SM-B ≤ 1,01 of ≥ 1,20** (dus niet 1,00 met vlakken), hoeken volgens IC-09. Alternatief dat óók telt voor `BR-F2` en minder vraagt: houd pos 2 op `D-0` en maak een **andere** fotoloze sectie van pagina B `D-O` of `D-V` — `BR-F2` eist 2 verschillende soorten over 4 fotoloze secties, niet dat juist pos 2 verandert. Beide routes zijn toetsbaar; de kaart kiest er één en noteert welke.
- **EVALUATOR** — MACHINE.
- **TEST** — pagina B: `|{dragersoorten over fotoloze secties}| ≥ 2` **én** elke `BR-02` op die pagina haalt IC-01 en IC-09 → **PASS**; een `BR-02` met vlakken op SM-B < 1,06, of nog steeds 1 dragersoort → **FAIL**.

#### IC-11 · De `BR-F2`-reparatie van pagina D botst met `DELTA-BR` op dezelfde pagina

- **SOURCE** — r. 4545 (*"op D wordt het `BR-12` op positie 3 een `BR-02` met `D-V`-items"*) tegen r. 4401 (pagina D pos 2 is al een `BR-02` met stuurmaat `1,67`) en r. 3780 (`DELTA-BR ≥ 0,15`).
- **INTENT** — pagina D van 1 naar 2 dragersoorten brengen.
- **CONFLICT** — na de reparatie staat `BR-02` twee keer op pagina D. `DELTA-BR ≥ 0,15` geldt ook binnen een pagina — zo wordt hij in dezelfde paragraaf gebruikt voor het dubbele `BR-12` (r. 4410: *"4 en 7 rijen: Δ = 3 ≥ DELTA-BR 2"*). Narekening: toegestaan is `SM-A ≥ 1,55`; verboden is het interval `1,52 ≤ SM-A ≤ 1,82` rond 1,67. Het overlapstuk `[1,55; 1,82]` valt dus weg en de nieuwe `BR-02` moet **SM-A ≥ 1,82** halen. Dat staat nergens, dus de reparatie is onuitvoerbaar zoals opgeschreven.
- **RESOLUTION** — twee uitwerkingen, beide gesloten: (a) de tweede `BR-02` op pagina D krijgt **SM-A ≥ 1,82** (berekend: `1,67 + 0,15`); (b) of de twee exemplaren verschillen op de **dragercategorie-as** — één verzameling geheel zonder vlak (`D-0`) tegen één met vlak — en dan is `DELTA-BR` `N.V.T.-met-reden "andere stuurmaat-as"` met de dragersoort als variatiedrager. Route (b) valt binnen het bereik van `DR-B-08` (DELTA-BR paarsgewijs onhaalbaar) en mag niet stil worden gekozen: de kaart noemt de as.
- **EVALUATOR** — MACHINE.
- **TEST** — staan er twee `BR-02` op één pagina, dan `|SM-A₁ − SM-A₂| ≥ 0,15` **of** de kaart noemt de dragercategorie-as als verschilas → **PASS**; twee exemplaren zonder genoemd verschil, of met Δ < 0,15 op dezelfde as → **FAIL**.

---

### 2 · Vijf tegenstrijdigheden buiten `BR-02`, in dezelfde ronde geïntroduceerd

#### IC-12 · `H-NEST verplicht` is onmogelijk op een `D-0`-item

- **SOURCE** — r. 3777 (`BR-02` VLAKHIERARCHIE: *"`H-NEST` verplicht (inhoud binnen het item)"*) tegen r. 3595 (`D-0` = *"geen drager; typografie en 1px-lijnen direct op de sectiegrond"*) en r. 3603 (`H-NEST` = *"vlak binnen vlak"*).
- **INTENT** — voorkomen dat iteminhoud buiten zijn item valt.
- **CONFLICT** — een `D-0`-item heeft geen vlak, dus er is geen "binnen". `H-NEST` is op de hele `D-0`-vorm onuitvoerbaar — en dat is precies de vorm die pagina B pos 2 en Uitwerking 2 gebruiken.
- **RESOLUTION** — `H-NEST` wordt voorwaardelijk: *"`H-NEST` verplicht voor elk item **met** een vlak (`D-F`, `D-V`). Voor een `D-0`-item geldt `H-NEST` als `N.V.T.-met-reden "geen vlak"` en in de plaats komt een **typografische insluiting**: elk `D-0`-item heeft één kop en één onderregel binnen zijn kolombreedte, en de 1px-lijn loopt niet door naar het volgende item."* De twee elementen (kop, onderregel) staan al in CAPACITEIT (r. 3781); er komt geen nieuwe eis bij.
- **EVALUATOR** — MACHINE.
- **TEST** — per item: heeft het een vlak, dan `≥ 50%` ... nee: dan `100%` van zijn inhoud binnen zijn vlakrechthoek → **PASS/FAIL**; heeft het geen vlak, dan `N.V.T. (geen vlak)` + vervanger "kop en onderregel binnen de kolombreedte, geen doorlopende lijn" → **PASS/FAIL**. Stille PASS op een `D-0`-item → **FAIL** (`MC-3`).

#### IC-13 · `BR-02` verklaart `H-NAAST` normaal in HYBRID; `5.0.4` staat `H-NAAST` uitsluitend in DOCUMENT toe

- **SOURCE** — r. 3777 (*"`H-NAAST` tussen items is hier normaal en geen terugval"*) met r. 3779 (HYBRID = standaardmodus van `BR-02`) tegen r. 3605 (*"`H-NAAST` … **uitsluitend** DOCUMENT MODE; in CANVAS en HYBRID is dit de generieke terugval"*).
- **INTENT** — in `BR-02` mag de ongelijkheid de compositie dragen zonder dat items over elkaar liggen; in het vocabulaire moet "naast elkaar zetten" niet de uitweg worden voor elke sectie.
- **CONFLICT** — dezelfde hiërarchie is in dezelfde modus in het ene veld normaal en in het andere de generieke terugval. Een `BR-02` in HYBRID is daarmee per definitie zowel toegestaan als afgekeurd.
- **RESOLUTION** — de uitzondering wordt in `5.0.4` benoemd in plaats van in `BR-02` alleen: *"`H-NAAST` is in CANVAS en HYBRID de generieke terugval, **behalve tussen de leden van één verzameling binnen `BR-02`**, waar de rangscheiding (SM-A/SM-A′) de hiërarchie draagt. De vrijstelling geldt alleen tussen items, nooit tussen de verzameling en de redactiekolom."* De vrijstelling is daarmee begrensd en toetsbaar in plaats van impliciet.
- **EVALUATOR** — MACHINE.
- **TEST** — `H-NAAST` tussen items van één `BR-02` met een geldige SM-A/SM-A′ → **PASS**; `H-NAAST` tussen verzameling en redactiekolom, of in een andere `BR` in CANVAS/HYBRID zonder eigen vrijstelling → **FAIL**.

#### IC-14 · `BR-04` verbiedt klasse C; H2 §2.2.7 staat klasse C in M4 expliciet toe en bewijst het op de master

- **SOURCE** — r. 3870 (`BR-04` DRAGER: *"**Niet** klasse C: ratio ≥ 3,0 vraagt 55–59% hoogteverlies en dat verliest het onderwerp van een grondfoto"*) tegen r. 1214 (M4 BAND, *"toegestane bronklassen **A · B · C** — expliciet ook C. Bewijs: de master draagt M4 met `exploitatie-hero`, een grondopname van een wandlader, en snijdt daar 59,1% van de hoogte af. Dit weerlegt de regel 'klasse C nooit M4'"*), r. 1215 (*"maximale verticale snede 60%, mits C(0,41) ≥ 1,20"*), r. 1231 (`exploitatie-hero` C(0,41) = **1,26**, in de PASS-lijst) en r. 1240 (*"De klasse begrenst de dominantie, de meting begrenst de snede"*).
- **INTENT** — H2 wil de klasse-eis vervangen door een meting per bron; H5 wil een band niet met een onderwerploze foto laten vullen.
- **CONFLICT** — `BR-04` is de blauwdruk van exact die behandeling (`C4` · ratio ≥ 3,0 · M4) en herhaalt de regel die H2 twee hoofdstukken eerder met een masterwaarde heeft weerlegd. Meetbaar: `exploitatie-hero` is PASS onder H2 (C(0,41) = 1,26 ≥ 1,20, snede 59,1% ≤ 60%) en FAIL onder `BR-04`, zonder dat één getal verschilt.
- **RESOLUTION** — `BR-04` DRAGER wordt: *"`D-F` klasse A of B · `D-V` · **klasse C toegestaan mits `C(0,41) ≥ 1,20` gemeten en de verticale snede ≤ 60%** (§2.2.7, klasse A, gemeten master 1,26 / 59,1%). Klasse D nooit."* Dit is geen versoepeling maar de overname van de meting die er al staat; H2 bezit de beeldklassen.
- **EVALUATOR** — MACHINE.
- **TEST** — per `BR-04`-drager: `klasse ∈ {A,B}` → **PASS**; `klasse = C ∧ C(0,41) ≥ 1,20 ∧ snede ≤ 60%` → **PASS**; `klasse = C` zonder gemeten `C(0,41)` → **FAIL** (niet N.V.T.); `klasse = D` → **FAIL**.

#### IC-15 · Het `D-F`-vocabulaire van H5 sluit klasse C uit, terwijl H5's eigen pagina A een klasse-C-foto in een `BR-02`-item zet

- **SOURCE** — r. 3592 (`5.0.4`: `D-F` = *"een beeldvlak met een werkelijk bestand, klasse A of B"*) tegen r. 4367 (*"De klasse-C-foto `energieopslag-hero` … komt **niet** in `BR-01`, `BR-03` of `BR-04`; hij kan wel in een `BR-02`-item of een `BR-08`-duimnagel"*) en r. 962 (klassetabel: klasse C *"mag dragen: M2 · M3 · M4 · M5 · M6, mits de drempel van 2.2 gehaald wordt"*; verboden zijn **eerste sectie**, **≥ 90% vw**, **M1**).
- **INTENT** — H5 wil met één code zeggen "hier hoort een bruikbare foto"; H2 wil dominantie begrenzen per klasse en de snede per meting.
- **CONFLICT** — de definitie in `5.0.4` maakt elk klasse-C-bestand in elke `BR` onmogelijk, terwijl H2 negen klasse-C-opnamen als bruikbaar classificeert (r. 1014: `9 × C`) en H5's eigen compositietekst er één inplant. Een verzamelingsitem is bovendien precies een M5-kaartbeeld, de behandeling waarvoor klasse C expliciet is toegestaan.
- **RESOLUTION** — `D-F` wordt: *"fotografische drager: ≥ 1 `img` of beeldvlak met een werkelijk bestand, **klasse A, B of C**. De klasse begrenst de dominantie (§2.1.4: klasse C nooit eerste sectie, nooit ≥ 90% vw, nooit M1), de meting begrenst de snede (§2.2). Klasse D en PENDING nooit."* De strengere eis blijft daar staan waar zij gemeten is: `BR-01` (r. 3723, klasse A verplicht) en `BR-03` (r. 3823, nooit klasse C of D) houden hun eigen, onderbouwde beperking.
- **EVALUATOR** — MACHINE.
- **TEST** — per beeldslot: `klasse ∈ {A,B,C}` **en** de klassebeperkingen van §2.1.4 gelden (geen C in de eerste sectie, geen C ≥ 90% vw, geen C in M1) **en** de behandelingsdrempel van §2.2 is gemeten → **PASS**; klasse D, PENDING, of een C-slot op een verboden positie → **FAIL**. Narekening pagina A: `energieopslag-hero` (C) in een `BR-02`-item op positie ≠ 1, breedte < 90% vw → **PASS**.

#### IC-16 · Twee niet-identieke hoektaxonomieën voor dezelfde vormen

- **SOURCE** — r. 3611–3615 (`5.0.4` geometrierollen: `GR-RAND 31,6–36,2°` · `GR-SNEDE 9,7–15,0°` · `GR-GROND 33,7°` · `GR-ANKER 36,2°` · `GR-VRIJ 32,6°`) tegen r. 2673–2676 (§4.1.2 vier functionele families: `RANDSNEDE 28,1–35,4°` · `BEELDSNEDE 9,7–13,0°` · `MERKWIG 32,6–36,2°` · `ACHTERGRONDVELD 27,3–35,4°`) en r. 2685 (klasse-A-omhulsel `9,0–14,0°` of `27,0–37,0°`).
- **INTENT** — H4 wil gemeten banden per functie; H5 wil korte rolcodes die in elke blauwdruk passen.
- **CONFLICT** — meetbaar op twee plaatsen. (i) Een hoek in `[27,3; 31,6)` is een geldige `RANDSNEDE`/`ACHTERGRONDVELD` onder H4 en past onder geen enkele `GR-`rol van H5 — zo valt de 31,0° uit `BR-02`'s eigen uitwerking tussen wal en schip. (ii) `GR-SNEDE` loopt tot `15,0°`, wat zowel de gemeten `BEELDSNEDE`-band (`9,7–13,0°`) als het klasse-A-omhulsel (`≤ 14,0°`) overschrijdt, zonder herkomst.
- **RESOLUTION** — H4 bezit de banden (hij heeft ze gemeten, met `n` en klasse per familie). Elke `GR-`rol erft de band van zijn familie en wordt begrensd door het omhulsel: `GR-SNEDE ← BEELDSNEDE`, band `9,7–13,0°`, uiterste rek tot het omhulsel `9,0–14,0°`; `GR-RAND ← RANDSNEDE 28,1–35,4°`; `GR-GROND ← ACHTERGRONDVELD 27,3–35,4°`; `GR-ANKER ← MERKWIG 32,6–36,2°`; `GR-VRIJ ← MERKWIG 32,6–36,2°` met quotum `floor(secties ÷ 9)`. De rol blijft **gedeclareerd**, niet uit de hoek afgeleid — §4.1.1 defect 4 meet dat een hoekwaarde zijn rol niet kan verraden.
- **EVALUATOR** — MACHINE.
- **TEST** — per geometrie-element: `hoek ∈ band(gedeclareerde rol) ∧ hoek ∈ omhulsel (9,0–14,0 ∪ 27,0–37,0)` → **PASS**; `GR-SNEDE` op 14,5°, of een hoek op 29,0° gedeclareerd als `GR-RAND` → **FAIL**; geen gedeclareerde rol → **FAIL** (niet N.V.T.).

---

### 3 · Twee besluiten die als "open" stonden maar in hetzelfde document al beslecht zijn

#### IC-17 · `DR-S-02` — de masterrij 1,051

- **SOURCE** — r. 2410 (`DR-S-02`: *"Wordt dit een gedocumenteerde afwijking van de master, of wordt de regel afgezwakt tot 1,05?"*) tegen r. 1988–1993 (*"Hiermee is vastgelegd dat deze onderrij een gemeten tekortkoming van Master v1 is en geen regel"*, met `§1A.11` punt 3: B1 wordt niet herbouwd) en r. 3465 (`DR-G-18`: Master v1 niet wijzigen, register `L-01…L-12` als `LEGACY EXCEPTION / FUTURE REMEDIATION`, status **vastgelegd**).
- **INTENT** — niet opnieuw een regel op de master fitten (de V1.2-hoofdfout), én de master niet herbouwen (bevroren `§1A`).
- **CONFLICT** — `DR-S-02` presenteert als open besluit wat §3.2.3 al beslist en wat `§1A.11` punt 3 bovendien dwingt. Tegelijk zou de tweede tak ("afzwakken tot 1,05") de verboden zone `1,01–1,20` van `DR-S-01` openbreken en daarmee IC-01 heropenen.
- **RESOLUTION** — `DR-S-02` wordt gesloten langs het bestaande mechanisme van `DR-G-18`: de K1-onderrij (`371 · 353 · 355 = 1,051`) komt als regel in het `LEGACY EXCEPTION / FUTURE REMEDIATION`-register, met de exacte waarde en beide faaltakken erbij. De regel `DR-S-01` geldt onverkort voor nieuw werk; er wordt **niet** afgezwakt tot 1,05. Geen gebruikersbesluit: `§1A.11` punt 3 is bevroren en wint.
- **EVALUATOR** — MACHINE.
- **TEST** — het LEGACY-register bevat een rij `K1-onderrij · 371/353/355 · max/min 1,051 · FAIL langs beide takken van DR-S-01 · geen regel` → **PASS**; een nieuwe pagina met `max/min ∈ (1,01; 1,20)` → **FAIL**; `DR-S-01` ergens op 1,05 gezet → **FAIL**.

#### IC-18 · `DR-S-12` — de eyebrow-trackingband (+0,175em tegenover 0,220em)

- **SOURCE** — r. 2086 (§3.3.2 gebruikt `+0,133…+0,220em` voor eyebrow/groepskop, met *"let op het conflict in §3.6"*), r. 2438 (§3.6 rij 9: **onopgelost**), r. 2421 (`DR-S-12`: `G21` meet `+0,022…+0,175em` over 8 sectie-eyebrows, `vibe-card-system-v1.md §2` meet K3's eyebrow op `0,220em` en noemt dat *"de wijdste tracking van de pagina"*).
- **INTENT** — één plafond voor tracking, zodat `REG-2` weet waar de groepskop ophoudt.
- **CONFLICT** — twee plafonds voor dezelfde eigenschap op dezelfde pagina: `0,175em` en `0,220em`. `REG-2` gebruikt nu de wijdere band en markeert dat zelf als onzeker.
- **RESOLUTION** — `DR-S-12` noemt de oplossing zelf (*"de twee tellen vermoedelijk een andere verzameling"*) en die wordt nu normatief in plaats van vermoedelijk: **twee gescopeerde banden**, elk met zijn gemeten populatie. **Sectie-eyebrow** (eyebrow van een sectiekop, `n = 8`, `G21`): `+0,022…+0,175em`. **Kaart-/groepskop-eyebrow** (eyebrow binnen een kaart of registergroep, `n = 1`, K3): `+0,133…+0,220em`, klasse B wegens `n = 1`. Geen nieuwe meting nodig om te sluiten: beide banden bestaan al, ze golden alleen voor één verzameling tegelijk. Wat wél open blijft is een **meting** (de kaart-band op `n = 1`), en dat is een `NIET GEMETEN`-post, geen tegenstrijdigheid.
- **EVALUATOR** — MACHINE.
- **TEST** — per eyebrow: bepaal de populatie uit de DOM (voorouder is een sectiekop-blok of een kaart/registergroep), meet `letter-spacing` in `em`, vergelijk met de band van díe populatie → **PASS/FAIL**. Een eyebrow die niet aan een populatie is toe te wijzen → **MEETFOUT** (`MC-3`), nooit PASS.

---

### 4 · USER DECISION REQUIRED — één post, met standaardwaarde

| # | besluit | waarom het geen meting is | **standaardwaarde tot het besluit** |
|---|---|---|---|
| **UD-1** | **Wie is de reviewer van deel B, met naam en mandaat?** (`DR-Q-13`, r. 5319; `00-changelog.md` §7.4 punt 1) | De enige eis die vastligt is "niet de bouwer". Geen meting kan een persoon aanwijzen; dit is een organisatiebesluit van de opdrachtgever. | Elke REVIEWER-toets rapporteert `GEBLOKKEERD — geen benoemde reviewer` en telt in §6.1.4 als **N.V.T. zonder geslaagde vervangende eis**, dus een pagina kan maximaal `INCOMPLEET` worden, nooit `GOEDGEKEURD`. Alle MACHINE-toetsen in dit stuk draaien ondertussen volledig en geven PASS of FAIL. |

Daarmee is de koppeling tussen UD-1 en de resoluties hierboven **operationeel gesloten**: geen enkele resolutie hangt voor zijn verdict op de reviewer. Bij `IC-08` en `IC-09` is de reviewerrol adviserend en expliciet gemarkeerd.

---

### 5 · Expliciet GEEN interne tegenstrijdigheid — niet opnieuw meetellen

**Inhouds- en assetgaten** (de pagina mag bestaan, zij is `INCOMPLEET — CONTENT PENDING`, §6.1.4): 4 van 4 KPI-waarden `UNVERIFIED` op zonnepanelen · elf ongedekte getallen op EMS · één bruikbare M1-drager (`projects/hedin-alkmaar-2`, blokkade BLK-06) · 9 klasse-A-opnamen voor 48 pagina's.

**Meetgaten** (`NIET GEMETEN` met reden, geen botsing tussen twee regels): `DR-S-04` (AANGEHECHT-band op `n = 3`) · `DR-S-05`/`DR-S-06` (leesmaat 60–75 tekens en `lh` 1,55–1,70 zijn **gezet**) · `DR-S-11` (verdeling van de zes K1-kaarten) · `DR-B-01`/`DR-B-02`/`DR-B-03` (de masterwaarden onder de nieuwe definities zijn niet gedraaid) · `DR-Q-11` (gewogen dieptemeting) · de ch→px-factor van Urbanist.

**Infrastructuurgaten** (geen uitvoerder, geen tegenspraak): siteregister voor `D-06`/`VAR-07` · herschreven harnas voor `A-02`, `A-06`, `VAR-04`, `VAR-06` · `data-canvas-mode` en de compositiekaart bestaan op 0 van 48 pagina's.

---

### 6 · Eindtelling

| | aantal |
|---|---:|
| Interne tegenstrijdigheden in deze ronde gemeten en gelezen | **18** |
| Gesloten met resolutie + PASS/FAIL-toets | **18** |
| Nog openstaand als interne tegenstrijdigheid | **0** |
| Referenties die niet te vinden zijn, dus niet te sluiten (`DR-U2-01`, `DR-U2-06`, `DR-U2-07`) | **3** |
| USER DECISION REQUIRED, operationeel gesloten met standaardwaarde | **1** |

**OPENSTAAND = 3**, en alle drie om dezelfde gemeten reden: `grep -rn "DR-U2" .` geeft nul treffers in de hele werkboom, dus hun inhoud is onbekend. Ze zijn niet inhoudelijk onbeslist — ze zijn niet aanwezig. Zodra de tekst er is, krijgen ze dezelfde zes velden als `IC-01…IC-18`.

**NIET GEDRAAID** — geen render, geen schermafdruk, geen browsermeting; alle getallen zijn gelezen uit `04-visual-language-v1.3.md` met regelnummer, of nagerekend uit getallen die daar staan (`1,67 + 0,15 = 1,82`; `14,0 → 27,0 = 13,0°`). **GEWIJZIGD = niets.**

---


## 7.9 · HET REVIEWMODEL EN DE REVIEWAUTORITEIT

> Deze paragraaf is in deze ronde geschreven en volledig opgenomen.
> Elke regel draagt SOURCE / INTENT / CONFLICT / RESOLUTION / EVALUATOR / TEST.

Dit hoofdstuk sluit het eerste van de vier infrastructurele gaten uit `docs/00-changelog.md` §7.4
("er is geen benoemde reviewer"). Het legt **geen persoonsnaam** vast. Het legt vast welke rollen
bestaan, welke uitgang elke rol produceert, welke rol Claude mag vullen en welke niet, en welke
vragen de reviewer op welk bewijs beantwoordt.

Het model hangt aan drie bestaande artefacten in deze repo:

| artefact | pad | wat het levert |
|---|---|---|
| compositiekaart | `docs/compositions/<kaart>.json` | de ontwerpintentie, gevalideerd tegen `docs/schema/composition-card.schema.json` |
| machinepoort | `docs/qa/composition-gate.mjs` | `KP-01`–`KP-12`, `XP-01`–`XP-03`, en het reviewerpakket (`--packet`) |
| desktopmeting | `docs/qa/desktop-governance.mjs` | per sectie bij 1440 / 1774 / 1920: breedtes, bezetting, dominant beeld, leesmaat in ch, grootste gat, afgeleide modus, `D-01` en `D-03` |

Niets in dit hoofdstuk wijzigt een productiebestand. Waar het model een regel noemt die het harnas
nog niet uitgeeft (`R-08`–`R-13`), staat dat er expliciet bij.

---

## DEEL 1 — ROLLEN EN REVIEWAUTORITEIT

### 1.1 Vijf rollen, als functie gedefinieerd

De autoriteit zit niet in een identiteit maar in een **pas**: een afgebakende handeling met een
vastgelegde ingang, een vastgelegde uitgang en een registratie. Een rol is de functie die zo'n pas
uitvoert.

| code | rol | levert | mag niet | mag Claude dit vullen |
|---|---|---|---|---|
| **A** | AUTEUR | compositiekaart, implementatie, compositie | haar eigen compositie visueel goedkeuren | **JA** |
| **P** | GEAUTOMATISEERDE POORT (operator) | gate-rapport, desktopmeting, zelftestuitslag | een meting als smaakoordeel presenteren | **JA**, als operator |
| **V** | VISUELE REVIEWER | ingevulde `R`-antwoorden met bewijsverwijzing, per-sectie desktopblad | tijdens de pas bestanden wijzigen | **JA, maar alleen in een aparte, expliciet opgedragen reviewpas** (§1.4) |
| **C** | CONTENT/CLAIM-REVIEWER | per sectie `DEKKEND` / `PENDING` / `CONFLICTING`, met bron per cijfer of claim | een ongedekt cijfer `DEKKEND` verklaren | **NEE** voor `DEKKEND`; wel voor het *markeren* van `PENDING`/`CONFLICTING` |
| **E** | EINDGOEDKEURDER | het enige verdict `GOEDGEKEURD`, met datum, kaart en bewijsset | goedkeuren zonder uitgang van P, V en (waar vereist) C | **NOOIT** |

`E` is de opdrachtgever van de ronde: de mens die in dát bericht opdracht geeft. Het dossier noteert
de rolcode en de pas-id, niet de persoon. Een verdict zonder pas-id is geen verdict.

### 1.2 Pas-id

Elke pas krijgt één regel:

```
<rol>:<datum>/<kaart>/<bewijsset>
V:2026-10-02/schaarste-b2/review-b2-energy-storage-master-v2
```

De bewijsset is een map onder `review/`. Verwijst de pas naar bewijs dat niet bestaat, dan is de
uitkomst **NIET GEDRAAID**, nooit PASS.

### 1.3 De procedure: zeven stappen met in- en uitgangen

| # | stap | rol | INGANG | UITGANG | afbreekvoorwaarde |
|---|---|---|---|---|---|
| S1 | kaart schrijven | A | archetype, hoofdrol, inhoudsvoorraad | `docs/compositions/<kaart>.json` | kaart valideert niet tegen het schema |
| S2 | machinepoort | P | kaart + alle andere kaarten + siteregister | gate-rapport; `AFGEKEURD` / `ONTWERP OK — CONTENT/ASSET PENDING` / `ONTWERP OK — WACHT OP VISUELE REVIEW` | één `FAIL` ⇒ terug naar S1, geen S3 |
| S3 | implementatie | A | kaart met gepasseerde machinepoort | HTML/CSS | — |
| S4 | bewijsproductie | A | geïmplementeerde pagina, lokaal geserveerd | `review/<slug>/full-1440.png`, `-1774.png`, `-1920.png`, `section-<nn>-<naam>-<breedte>.png`, plus de JSON van `desktop-governance.mjs` | bewijs onvolledig ⇒ S5 start niet |
| S5 | **reviewpas** | V | **alleen** het pakket (`--packet`) en de bewijsset uit S4 | ingevuld pakket: `R-01`–`R-13` met antwoord + bewijsverwijzing, en het desktopblad uit DEEL 3 | antwoorden zonder bewijsverwijzing ⇒ `NIET GEDRAAID` |
| S6 | content/claim-pas | C | sectielijst met `content_status` ≠ `DEKKEND` | per sectie een bron, of `PENDING` blijft staan | `CONFLICTING` ⇒ `AFGEKEURD` |
| S7 | eindgoedkeuring | E | uitgangen van S2, S5 en S6 | `GOEDGEKEURD` / `AFGEKEURD` / `GEBLOKKEERD OP <wat>` | één openstaande `FAIL` of `NIET GEDRAAID` ⇒ geen `GOEDGEKEURD` |

S4 is expliciet toegestaan voor Claude: bewijs **voorbereiden** is geen bewijs **beoordelen**.

### 1.4 De scheiding als mechanisme

Niet "de auteur moet objectief zijn", maar vijf controleerbare sloten.

| slot | mechanisme | hoe je ziet dat het geschonden is |
|---|---|---|
| **GOV-01 pakketgrens** | de reviewpas leest uitsluitend het `--packet`-pakket en de bestanden in de bewijsset. Niet de kaartmotivatie, niet het ontwerpgesprek. | een `R`-antwoord dat een intentie noemt die alleen in de auteurstekst staat |
| **GOV-02 schrijfslot** | tijdens de reviewpas wijzigt geen enkel bestand onder de repo-root behalve het pasverslag | `git status` vóór en na de pas verschilt in meer dan het verslag |
| **GOV-03 aparte opdracht** | de pas start alleen op een bericht dat haar benoemt ("voer de reviewpas uit op `<kaart>`"). Een auteursbeurt mag geen `R`-antwoorden uitgeven. | `R`-antwoorden in dezelfde beurt als de compositie ⇒ uitkomst **ONGELDIG**, niet PASS |
| **GOV-04 geen eigen reparatie** | een `FAIL` in de pas wordt gerapporteerd en de pas stopt; de auteur beslist over scope | een beurt die in de pas zowel `FAIL` vaststelt als de oorzaak wegwerkt |
| **GOV-05 bewijsbinding** | elk antwoord noemt minstens één bestand én één breedte | antwoord zonder verwijzing ⇒ `NIET GEDRAAID` |

**ONGELDIG** is een vierde uitkomst naast PASS / FAIL / NVT-met-vervanger, en bestaat alleen voor
stilzwijgende zelfgoedkeuring. Zij telt in het eindoordeel als FAIL.

### 1.5 Wat elke rol in het dossier achterlaat

| rol | artefact | bestaat vandaag |
|---|---|---|
| A | `docs/compositions/<kaart>.json` | ja, 8 kaarten |
| P | gate-rapport (stdout), zelftest `--zelftest` | ja, script aanwezig |
| A (S4) | `review/<slug>/full-<breedte>.png` | deels — zie §3.1 |
| P | desktopmeting-JSON | script aanwezig; uitslag niet in de repo opgeslagen |
| V | pasverslag met `R`-antwoorden + desktopblad | **nog niet**; voorgesteld pad `docs/review-passes/<datum>-<kaart>.md` |
| C | brongeving per cijfer | **nog niet** als apart artefact |
| E | regel met verdict, pas-id's en bewijsset | **nog niet** |

### 1.6 Uitkomstvocabulaire

`PASS` · `FAIL` · `NVT` (alleen met reden **en** een vervanger die zelf in PASS of FAIL eindigt —
afgedwongen in `verdict()` van de gate) · `NIET GEDRAAID` (met reden) · `ONGELDIG` (zelfgoedkeuring).
`GOEDGEKEURD` bestaat uitsluitend als uitgang van S7.

---

## DEEL 2 — REVIEWERREGELS

Dertien regels. Elke regel stelt een vraag over een **relatie** tussen twee waarneembare dingen, niet
over smaak. "Ziet dit er premium uit" is geen reviewervraag en komt hier niet voor.

`R-01`–`R-07` houden de codes die `composition-gate.mjs` al uitgeeft (de lijst `REVIEWERVRAGEN`), met
de PASS/FAIL-voorwaarden en foutmodi hieronder als scherpere formulering. `R-08`–`R-13` zijn nieuw en
staan nog **niet** in die lijst; het pakket geeft ze vandaag dus niet mee uit.

Twee hulpmiddelen die in meerdere regels terugkomen:

- **grijstoetstest** — bekijk de schermafbeelding zonder kleur. Wat alleen door kleur gerangschikt
  was, valt om. Methode: elke beeldviewer met een grijsfilter; registreer de leesorde vóór en na.
- **ruiltest** — vervang in gedachten de inhoud door een onverwant Vibe-product en noteer welke
  compositiebesluiten daardoor breken.

### R-01 HOOFDROLDOMINANTIE

- **Bewijs** — `section-<nn>-…-1774.png` van elke `HIGH`-sectie; uit de desktopmeting `dominant_pct` en `grootste_gat`.
- **Vraag** — Is er in deze `HIGH`-sectie één duidelijk dominante visuele hoofdrol, of concurreren twee elementen van vergelijkbaar gewicht zonder rangorde?
- **PASS** — de reviewer noemt binnen drie seconden de hoofdrol én de verliezer, en de dominantie loopt via minstens twee routes (maat, plus randcontact, contrast of positie).
- **FAIL** — twee elementen van vergelijkbare maat zonder rangorde; of het grootste element is alleen in oppervlak dominant terwijl de aandacht elders landt.
- **Valse positieven** (regel keurt onterecht af) — een bedoelde tweeluik waarin links en rechts hetzelfde object zijn: één hoofdrol in twee kaders. Een volbleed beeld met een klein aangehecht paneel: de meting ziet twee dragers, het oog één.
- **Valse negatieven** (regel laat onterecht door) — een groot leeg achtergrondbeeld of verloopvlak haalt een hoge `dominant_pct` terwijl er niets te zien is. Dominantie door formaat van een element dat niets toont.

### R-02 INHOUDSAFHANKELIJKHEID (de ruiltest)

- **Bewijs** — sectieafbeelding + `purpose` en `protagonist` uit de kaart.
- **Vraag** — Zou deze sectie vrijwel dezelfde compositie houden als haar inhoud werd vervangen door een onverwant Vibe-product? Zo ja, dan is de compositie generiek.
- **PASS** — minstens twee compositiebesluiten breken bij de ruil: de uitsnede volgt de geometrie van dít onderwerp, een vlak hangt aan een kenmerk van dít beeld, of het aantal cellen volgt de werkelijke telling van dít onderwerp.
- **FAIL** — de ruil is verliesloos: alleen woorden en bestandsnaam veranderen.
- **Valse positieven** — een legitiem herhaalbare systeemsectie (FAQ, specificatietabel, voorwaarden) is per ontwerp inhoudsonafhankelijk. De regel geldt alleen voor `HIGH` en `MEDIUM` met een niet-typografische hoofdrol.
- **Valse negatieven** — de reviewer rekent het verwisselen van de foto zelf als structurele breuk. Of een kleuraccent dat "bij het product past" wordt geteld als afhankelijkheid, terwijl de structuur onaangeroerd blijft.

### R-03 HIËRARCHIE VOLGT PRIORITEIT

- **Bewijs** — sectieafbeelding, in kleur én in grijstoets; `purpose` uit de kaart.
- **Vraag** — Communiceert de hiërarchie de inhoudsprioriteit, of ontstaat zij alleen door decoratief verschil in maat en kleur?
- **PASS** — de reviewer leest de drie zwaarste elementen in een orde die het doel van de sectie volgt, **en** die orde overleeft de grijstoetstest.
- **FAIL** — de orde valt om zonder kleur; of de zin die de sectie moet dragen is het kleinste element.
- **Valse positieven** — een bedoeld stille dominantie (één klein getal op een groot leeg veld) wordt gelezen als "te klein".
- **Valse negatieven** — de reviewer reconstrueert de prioriteit uit de kaart in plaats van uit het beeld. Dat is een schending van GOV-01 en maakt het antwoord ongeldig.

### R-04 BEDOELDE SMALHEID

- **Bewijs** — `full-1440.png` naast `full-1920.png`; uit de desktopmeting `breedtes{1440,1774,1920}`, `bevroren`, `zwaar`, `modus`, `D-01`.
- **Vraag** — Is deze smalheid bedoeld voor de compositie, of louter het gevolg van een container die zijn maximum bereikt?
- **PASS** — de kaart declareert `DOCUMENT` of `HYBRID` **en** de reviewer kan noemen wat de buitenrand vasthoudt bij de 480 px extra (een geometrie, een achtergrondveld, een bleedend beeld, een bedoelde asymmetrie).
- **FAIL** — `D-01` = FAIL (zware sectie, bevroren breedte) en de extra ruimte is aan beide zijden ongedifferentieerde achtergrond.
- **Valse positieven** — een correct bevroren `DOCUMENT`-sectie (FAQ, voorwaarden) komt in `zwaar` terecht louter omdat zij hoger is dan 400 px.
- **Valse negatieven** — een meeschalende achtergrondvideo verbergt een bevroren inhoudsblok: het oog zegt "hij schaalt", de meting zegt bevroren. Daarom is de meting hier leidend en het oog aanvullend.

### R-05 HECHTING TEGEN RASTER

- **Bewijs** — `surface_hierarchy.bindings` uit de kaart; sectieafbeelding bij 1440 **en** 1920.
- **Vraag** — Hangt dit vlak aan iets (een beeld, een naad, een rand), of zweeft het in een rastercel?
- **PASS** — elke gedeclareerde hechting is aanwijsbaar als overlap, gedeelde rand of kruising van de naad, en de relatie houdt bij beide breedtes.
- **FAIL** — hechting gedeclareerd, maar het vlak staat in zijn eigen kolom met lucht rondom; of de overlap bestaat bij 1440 en is bij 1920 weggeschoven.
- **Valse positieven** — een hechting met een bedoelde optische spleet van een of twee pixels (schaduwscheiding) wordt gelezen als los.
- **Valse negatieven** — een vlak dat alleen een effen achtergrondkleur overlapt wordt geteld als `OP-BEELD`. Overlap met niets is geen hechting.

### R-06 EIGEN VIBE-IDENTITEIT

- **Bewijs** — `full-1774.png` van de pagina naast `review/homepage-master-v1/full-1774.png`; `XP-01`/`XP-02`/`XP-03` uit het gate-rapport.
- **Vraag** — Herkent de reviewer de pagina als Vibe zónder dat zij de homepage nadoet?
- **PASS** — de reviewer noemt minstens twee dragers van de identiteit die geen kopie van een homepagepatroon zijn, **en** minstens twee structurele verschillen met de homepagereeks.
- **FAIL** — alleen herkenbaar doordat zij de homepage nadoet (dezelfde opening, dezelfde oplossingenrij, hetzelfde projectpaneel op dezelfde plek); of helemaal niet herkenbaar.
- **Valse positieven** — gedeelde componenten die buiten de toets vallen (navigatie, footer, cookiebalk) worden als imitatie gerekend.
- **Valse negatieven** — cosmetische verschillen (andere foto, ander accent) worden geaccepteerd als eigen identiteit terwijl de zes structurele assen van `XP-01` samenvallen.

### R-07 BEELD DRAAGT OF ILLUSTREERT

- **Bewijs** — sectieafbeelding; `dominant_pct`; `media_treatment` en `protagonist` uit de kaart.
- **Vraag** — Draagt het beeld de sectie, of staat het als illustratie naast de tekst?
- **PASS** — denk het beeld weg en de sectie verliest haar structuur: de tekst heeft geen kader meer, de geometrie geen ankerpunt. Het beeld raakt een rand of draagt een vlak.
- **FAIL** — het beeld staat als gelijkwaardige rastercel naast een tekstcel; wegnemen verandert alleen de versiering.
- **Valse positieven** — een bedoeld bescheiden steunbeeld in een `MEDIUM`-sectie wordt afgerekend. De regel geldt alleen waar de kaart het beeld als hoofdrol declareert (`foto`, `gebouwd-object`, `technische-compositie`).
- **Valse negatieven** — een volbleed achtergrondbeeld waarop niets te onderscheiden is wordt "dragend" genoemd omdat het de hele sectie vult.

### R-08 OVERGANGSWAARHEID *(nieuw; nog niet in het harnas)*

- **Bewijs** — `full-1774.png` plus een uitsnede van elke naad tussen twee opeenvolgende secties; `transition` per sectie uit de kaart.
- **Vraag** — Doet deze naad wat de kaart claimt (`GEDRAGEN` / `GEDEELDE-RAND` / `HARDE-FLIP` / `RUST`), of is elke naad op de pagina in werkelijkheid dezelfde?
- **PASS** — de gedeclareerde overgang is aanwijsbaar, en de pagina laat minstens twee verschillende naadgedragingen zien.
- **FAIL** — alle naden zijn één en dezelfde padding-wissel; of een gedeclareerde `GEDEELDE-RAND` toont een spleet.
- **Valse positieven** — een `RUST`-naad wordt afgekeurd omdat zij vlak is. `RUST` mag vlak zijn; alleen *alle* naden `RUST` is een fout.
- **Valse negatieven** — een achtergrondkleurwissel wordt als `HARDE-FLIP` geaccepteerd terwijl de structuur identiek doorloopt.

### R-09 LEEGTE MET EIGENAAR *(nieuw)*

- **Bewijs** — `grootste_gat` bij 1440 en 1920 uit de desktopmeting; sectieafbeelding bij beide breedtes.
- **Vraag** — Is het grootste lege veld in deze sectie een gecomponeerd interval, of restruimte die ontstond doordat een element niet meegroeide?
- **PASS** — de reviewer benoemt wat de leegte scheidt of uitlicht, en de verandering van het gat tussen 1440 en 1920 heeft een opgeschreven reden.
- **FAIL** — het gat groeit met vrijwel de volle viewportwinst terwijl niets die ruimte gebruikt; of de leegte valt precies tussen twee dingen die bij elkaar horen.
- **Valse positieven** — een bedoeld asymmetrische compositie (tekst links, beeld rechts, groot interval in het midden) wordt gelezen als rest.
- **Valse negatieven** — een gat dat met een decoratief verloop is opgevuld wordt geteld als "bezet". Een verloop is geen eigenaar.

### R-10 BEWIJSRANGORDE *(nieuw)*

- **Bewijs** — secties met `protagonist: metriek-bewijs`; hun sectieafbeelding in kleur én grijstoets; `content_status` en `KP-11v ABLATIE` uit het gate-rapport.
- **Vraag** — Wint het cijfer dat deze sectie moet bewijzen van de cijfers die haar versieren, en blijft de compositie staan als het ongedekte cijfer wegvalt?
- **PASS** — één metriek domineert, de rest is ondergeschikt, en met het `PENDING`-cijfer op blanco componeert de sectie nog.
- **FAIL** — drie tot vijf metrieken van gelijk gewicht zonder gerechtvaardigd gelijk register; of de sectie valt tot een leeg kader terug zodra het ongedekte cijfer verdwijnt.
- **Valse positieven** — een legitiem gelijk register (vier gelijkwaardige specificaties van één kast) wordt afgekeurd; `KP-07` staat er één toe, mét rechtvaardiging.
- **Valse negatieven** — de rangorde bestaat alleen in kleur; na de grijstoetstest zijn alle cijfers gelijk, maar de reviewer heeft alleen de kleurversie bekeken.

### R-11 CTA-ZWAARTEPUNT *(nieuw)*

- **Bewijs** — afbeeldingen van de secties met `cta_role: PRIMAIR` of `SECUNDAIR`, bij 1440 en 1920.
- **Vraag** — Eindigt de aandacht van de compositie waar de primaire actie staat, of is die actie ergens aangeplakt?
- **PASS** — de primaire actie ligt in het aandachtspad van het dominante element (zelfde visuele as, of aan het eind van de leesdiagonaal) en er is er precies één per beeldvullend scherm.
- **FAIL** — twee primaire acties concurreren in één scherm; of de actie zit in een hoek buiten elke relatie met het dominante element.
- **Valse positieven** — een bedoeld stille tekstlink in een `QUIET`-sectie wordt afgerekend. De regel geldt per `cta_role: PRIMAIR`.
- **Valse negatieven** — een knop is alleen groot en wordt daarom "zwaartepunt" genoemd, zonder enige relatie met de hoofdrol van de sectie.

### R-12 GEOMETRIE DOET WERK *(nieuw)*

- **Bewijs** — secties met `geometry_role` ≠ `GEEN`; sectieafbeelding bij 1440 en 1920.
- **Vraag** — Scheidt of verbindt deze geometrie twee werkelijke dingen, of ligt zij decoratief over een vlak waar niets gebeurt?
- **PASS** — de reviewer noemt beide zijden van de snede (wat erboven, wat eronder; wat ervoor, wat erna) en de snede houdt bij beide breedtes dezelfde relatie tot haar onderwerp.
- **FAIL** — de geometrie kruist niets; of zij schuift bij 1920 van het kenmerk af dat zij bij 1440 sneed.
- **Valse positieven** — een `MERKWIG` met een puur ritmische taak op paginaniveau (openings- of sluitingshaak) wordt decoratief genoemd. Toegestaan zolang de pagina er hoogstens twee gebruikt, op structurele posities.
- **Valse negatieven** — een hoek in een effen kleurvlak wordt functioneel genoemd omdat de kaart `RANDSNEDE` declareert. De declaratie is geen bewijs.

### R-13 GELIJK REGISTER OF UITGEPUT REPERTOIRE *(nieuw)*

- **Bewijs** — elke rij van drie of meer gelijke cellen; `surface_hierarchy.equal_row.count` en `equal_register_justification`; de aangrenzende secties; `KP-07` en `KP-09` uit het gate-rapport.
- **Vraag** — Staat deze rij gelijke kaarten er omdat de inhoud werkelijk één register is, of omdat er geen compositie meer over was?
- **PASS** — de items zijn van één soort en één niveau, de pagina heeft geen tweede zulke rij, en de omliggende secties tonen andere dragers.
- **FAIL** — items van verschillend niveau (één product, één argument, één bewijs) in één rij platgeslagen; of elders op de pagina staat een tweede rij.
- **Valse positieven** — een specificatietabel in een `DOCUMENT`-sectie wordt als kaartrij geteld.
- **Valse negatieven** — er staat een rechtvaardiging, maar een generieke ("vier gelijkwaardige voordelen"), en de reviewer controleert de niveaus niet.

### 2.1 Verwerking van de antwoorden

1. Elk antwoord luidt `PASS`, `FAIL` of `NIET GEDRAAID — <reden>`, met minstens één bestandsnaam en één breedte.
2. Eén `FAIL` op `R-01` t/m `R-13` verhindert `GOEDGEKEURD`. De pas rapporteert en stopt (GOV-04).
3. Een regel die op deze pagina niet van toepassing is, volgt de NVT-regel van de gate: reden **en** een vervangende eis die zelf in PASS of FAIL eindigt.
4. Antwoorden die in dezelfde beurt als de compositie zijn opgeschreven: `ONGELDIG` (GOV-03).

---

## DEEL 3 — DESKTOPGOVERNANCE ≥ 1200 px

### 3.1 Scope en bewijsposten

Drie meetposten: **1440**, **1774**, **1920**. 1440 is de ondergrens van het bedoelde desktopcanvas,
1774 de middenpost die lineaire schaling van een sprong onderscheidt, 1920 de bovenpost. Breedtes
onder 1200 px vallen buiten dit model.

Gemeten voorraad in deze repo op dit moment:

| bewijs | aanwezig |
|---|---|
| `review/homepage-master-v1/full-1440.png`, `full-1774.png` | ja |
| `review/b2-energy-storage-master-v2/full-1440.png`, `full-1774.png`, `section-01`–`section-11` bij 1774 | ja |
| enig bestand met `1920` in de naam onder `review/` | **nul** |
| sectieafbeeldingen bij 1440 of 1920 | **nul** |

Daarmee is de 1920-kolom van de tabel hieronder vandaag voor elke pagina **NIET GEDRAAID — bewijs
ontbreekt**, en nooit PASS. `desktop-governance.mjs` meet 1920 wel live in Chromium; wat ontbreekt is
de vastgelegde visuele post waarop `R-04`, `R-05`, `R-09` en `R-12` hun tweede breedte beoordelen.

Twee randvoorwaarden om de meting te kunnen draaien: de pagina moet lokaal geserveerd worden
(`node docs/qa/desktop-governance.mjs http://127.0.0.1:<poort> <pagina>`), en het script importeert
Playwright uit een absoluut pad in de npx-cache van deze machine (regel 18). Faalt die import, dan is
de uitkomst `NIET GEDRAAID — Playwright niet beschikbaar`, geen FAIL.

### 3.2 De zeven grootheden, per `HIGH`-sectie en per breedte

| # | grootheid | definitie | meetmethode | eenheid |
|---|---|---|---|---|
| 1 | **viewportbreedte** | de meetpost | `window.innerWidth`, veld `vw` | px |
| 2 | **ontworpen canvasbreedte** | de breedte die de compositie claimt te gebruiken, dus het plafond dat de CSS oplegt | vergelijk `contentbreedte` over 1440/1774/1920: een waarde die bij 1774 en 1920 gelijk blijft **is** het plafond in px; strikt groeiend = geen plafond onder 1920 | px |
| 3 | **dominante beeldbreedte** | breedste zichtbare `img`/`video`/`svg`/`canvas`/`picture` | velden `dominant_media` (px) en `dominant_pct` (% van vw) | px en % vw |
| 4 | **leesmaat** | regellengte van de breedste lopende tekst (≥ 12 woorden) | in-pagina sonde met het eigen font van het element; velden `leesmaat.ch`, `leesmaat.px`, `leesmaat.chpx`, `leesmaat.fontpx` | ch (plus px) |
| 5 | **bezette horizontale uitstrekking** | van de linkerrand van het meest linkse zichtbare blok tot de rechterrand van het meest rechtse | `contentbreedte` en `bezet_pct`; `randrakend` geeft aan of de inhoud de viewportrand raakt | % vw |
| 6 | **grootste BEDOELD lege veld** | breedste horizontale gaping tussen twee opeenvolgende zichtbare blokken op dezelfde hoogteband | machinedeel: `grootste_gat` (px). Het woord **bedoeld** is géén machinewaarde: de toeschrijving komt uit `R-09` | px + toeschrijving |
| 7 | **canvasmodus** | `CANVAS` / `DOCUMENT` / `HYBRID` | **twee waarden verplicht**: de *gedeclareerde* uit de kaart (`canvas_mode`) en de *afgeleide* uit het gedrag (veld `modus`, met `GEMENGD` als vierde uitkomst) | enum × 2 |

Grootheid 6 en 7 zijn de enige twee waarin een reviewer verplicht is; de andere vijf zijn zuiver
machinaal en mogen door Claude als operator worden geproduceerd.

### 3.3 De centrale reviewervraag

`D-01` is de machineregel: een **zware** sectie (hoogte ≥ 400 px, óf randrakend, óf `dominant_pct`
≥ 30) die bij 1920 exact dezelfde `contentbreedte` heeft als bij 1440 (verschil ≤ 1,5 px) is
**bevroren**. `D-01` velt daarover geen smaakoordeel; hij roept `D-02` op:

> **D-02 — Is deze smalheid bedoeld voor de compositie, of louter het gevolg van een container die
> zijn maximum bereikt?**

Beslisweg:

1. `D-01` = PASS ⇒ `D-02` wordt niet gesteld.
2. `D-01` = FAIL ⇒ `D-02` is verplicht, en wordt beantwoord in de reviewpas (`R-04`), niet door de auteur.
3. Antwoord **"bedoeld"** is alleen geldig als de reviewer benoemt *wat de buitenrand vasthoudt* bij de extra 480 px. Een antwoord zonder die benoeming is `NIET GEDRAAID`.
4. Antwoord **"gevolg van het plafond"** ⇒ FAIL op de sectie. Dit is de oorspronkelijke desktopfout: mobiel acceptabel, desktop smal en dood.

`DOCUMENT`-modus mag smal zijn. Een `HIGH`-landingssectie mag niet per ongeluk als `DOCUMENT`
gedragen doordat een `max-width`- of `clamp`-plafond haar bevroor. Het verschil is niet zichtbaar in
één schermafbeelding; het is alleen zichtbaar in het verschil tussen 1440 en 1920.

### 3.4 De responsieve toets, per modus meetbaar

Geen "alles moet schalen". Per modus één grootheid, één methode, één PASS-voorwaarde. Referentie­
factoren: 1774 / 1440 = **1,2319**; 1920 / 1440 = **1,3333**. Toleranties zoals in het harnas:
2 % op proportionele schaling, 6 % op leesmaat in ch.

| modus | grootheid | meetmethode | PASS-voorwaarde | FAIL |
|---|---|---|---|---|
| **CANVAS** | schaalfactor van de compositie, plus de stabiliteit van de verhoudingen | `S₁₉₂₀ = contentbreedte(1920) / contentbreedte(1440)`, `S₁₇₇₄` idem; daarnaast `dominant_pct` per breedte | (a) \|S₁₉₂₀ − 1,3333\| / 1,3333 ≤ 0,02 **en** (b) \|S₁₇₇₄ − 1,2319\| / 1,2319 ≤ 0,02 **en** (c) `dominant_pct` verschilt over de drie posten ≤ 2 procentpunt | de compositie groeit niet mee (bevroren of sprongsgewijs), of het dominante beeld verliest zijn aandeel in de viewport |
| **DOCUMENT** | leesmaat in ch | \|ch(1920) − ch(1440)\| / ch(1440) | ≤ 0,06 **en** `contentbreedte` constant binnen 1,5 px **en**, als de sectie `zwaar` is, `D-02` beantwoord met "bedoeld" + benoemde randhouder | de leesmaat loopt meer dan 6 % uit (de regel wordt te lang), of een zware sectie is bevroren zonder toeschrijving |
| **HYBRID** | het paar (schaalfactor, leesmaat) | beide metingen hierboven samen | \|S₁₉₂₀ − 1,3333\| / 1,3333 ≤ 0,02 **én** \|Δch\| / ch(1440) ≤ 0,06: het canvas groeit, de leesmaat blijft begrensd | één van de twee benen faalt — ofwel het canvas groeit niet, ofwel de regel groeit mee |
| **GEMENGD** (alleen afgeleid) | — | het gedrag past in geen van de drie definities | geen machineuitkomst: `D-03` = `REVIEWER`. De reviewer wijst één modus toe, of de kaart wordt gecorrigeerd | een `GEMENGD` die als PASS wordt geboekt |

Daarnaast één koppeling die geen aparte regel nodig heeft: wijkt de **gedeclareerde** modus uit de
kaart af van de **afgeleide** modus uit de meting, dan is dat geen FAIL maar een verplichte
reviewervraag — welke van de twee is verkeerd, de kaart of de implementatie? Zie het eerste
openstaande punt hieronder: die vergelijking is vandaag alleen ordinaal te maken.

### 3.5 Het invulblad per `HIGH`-sectie

Drie regels per sectie, één per breedte. Het blad is de uitgang van S5 en hoort in het pasverslag.

```
sectie: <id uit de kaart>   ·   gedeclareerde modus: <CANVAS|DOCUMENT|HYBRID>
afgeleide modus (meting): <…>      D-01: <PASS|FAIL>      D-03: <PASS|FAIL|REVIEWER>

| breedte | ontworpen canvas | dominant beeld | leesmaat | bezet | grootste gat | bedoeld? (R-09) | bewijsbestand |
|---------|------------------|----------------|----------|-------|--------------|-----------------|---------------|
| 1440    | … px             | … px / … % vw  | … ch     | … %   | … px         | ja/nee + waarom | full-1440.png |
| 1774    | … px             | … px / … % vw  | … ch     | … %   | … px         | ja/nee + waarom | full-1774.png |
| 1920    | … px             | … px / … % vw  | … ch     | … %   | … px         | ja/nee + waarom | full-1920.png |

S₁₉₂₀ = …   S₁₇₇₄ = …   Δch = … %   D-02-antwoord: ………………
```

### 3.6 Afbreek- en koppelregels

1. `D-01` = FAIL ⇒ `R-04` is verplicht en moet door `V` worden beantwoord.
2. Afgeleide modus `GEMENGD` ⇒ `D-03` = `REVIEWER`; nooit PASS.
3. Bewijs bij een breedte ontbreekt ⇒ die rij is `NIET GEDRAAID — bewijs ontbreekt`; het eindoordeel kan dan niet `GOEDGEKEURD` worden.
4. De desktopmeting kon niet draaien ⇒ `NIET GEDRAAID` met reden, en de hele desktopgovernance van die pagina blijft open.

### 3.7 Wat dit model expliciet niet doet

Het eist niet dat alles schaalt. Het beoordeelt geen typografische graden, geen kleurkeuzes en geen
breedtes onder 1200 px. Het verbiedt smalle secties niet; het verbiedt **onverantwoorde** smalheid.

---

## OPENSTAANDE TEGENSTRIJDIGHEDEN NA DIT HOOFDSTUK — 3

1. **Kaart en DOM delen geen sectie-identiteit.** Gemeten: `docs/compositions/homepage.json` gebruikt de id's `01-opening`, `03-projectpaneel`, `08-slot`; `index.html` draagt `data-screen-label="01 Hero"`, `"03 Project in de kijker"`, `"08 Final CTA"` en zeven `<section id>`-waarden (`oplossingen`, `projecten`, `aanpak`, `vibe-control`, `klantverhaal`, `energie-infrastructuur`, `contact-cta`). Verder: `data-canvas-mode` komt **0×** voor in `index.html` en **0×** in `systeem-energieopslag.html`. `desktop-governance.mjs` selecteert bovendien `section, main > div[class], header`, dus de gemeten reeks hoeft niet gelijk te zijn aan de kaartreeks. Gevolg: de vergelijking *gedeclareerde modus versus afgeleide modus* (§3.4, slot) is alleen **ordinaal** te maken en moet met de hand worden bevestigd. Sluiten vereist een id-brug (een attribuut per sectie dat de kaart-id draagt) — een productiewijziging, dus hier niet gedaan.
2. **De absolute leesmaatband heeft geen eigenaar.** De relatieve toets is meetbaar (6 % invariantie, §3.4) en de ch→px-factor wordt per element in de pagina gesondeerd, dus die rekent niet meer op een constante. Maar een absolute onder- en bovengrens in ch ontbreekt; `docs/00-changelog.md` §7.4 noemt die band wel als drager. Zolang die grenzen niet uit een meting op een mastersectie zijn vastgesteld, is elke uitspraak "de leesmaat is te lang" smaak en geen uitkomst.
3. **De bezetting van `E` per ronde is niet geregeld.** De rol is als functie gedefinieerd en expliciet verboden voor Claude. Wie haar per ronde vult, is een besluit van de opdrachtgever; dit model legt bewust geen naam vast en kan dat gat dus niet zelf dichten.

**Ontbrekende ingangen (geen tegenstrijdigheid, wel blokkerend):** geen enkel bewijsbestand bij 1920
onder `review/` (gemeten: nul), en geen sectieafbeeldingen bij 1440 of 1920. Daarmee staat de
1920-kolom van §3.5 vandaag voor elke pagina op `NIET GEDRAAID`.

**Niet gedraaid in deze sessie:** `node docs/qa/composition-gate.mjs --zelftest`,
`--packet <kaart>` en `node docs/qa/desktop-governance.mjs <basis> <pagina>`. Er staat in dit
hoofdstuk daarom geen enkele uitslag van die drie commando's.

---


## 7.10 · Desktopgovernance — gemeten bij 1440, 1774 en 1920

Het oorspronkelijke probleem was: **mobiel acceptabel, desktop generiek, smal en dood.** Statische analyse
kan dat niet zien, dus `docs/qa/desktop-governance.mjs` meet het in Chromium. Per sectie worden de zeven
grootheden uit de opdracht vastgelegd: viewportbreedte · ontworpen canvasbreedte · dominante beeldbreedte ·
leesmaat · bezette horizontale uitstrekking · grootste bedoeld lege veld · canvasmodus.

### De afgeleide canvasmodus — uit gedrag, niet uit een declaratie

> **S3-35.** De modus wordt **afgeleid** uit twee metingen tussen 1440 en 1920:
> `schaalt` = `|contentbreedte@1920 ÷ contentbreedte@1440 − 1,3333| ÷ 1,3333 ≤ 2%` ·
> `leesBegrensd` = `|ch@1920 − ch@1440| ÷ ch@1440 ≤ 6%`.
> **CANVAS** = schaalt · **HYBRID** = schaalt én leesmaat begrensd · **DOCUMENT** = breedte staat stil én
> leesmaat begrensd · **GEMENGD** = geen van drie, en dat is een `REVIEWER`-uitkomst, nooit een PASS.
>
> Een gedeclareerde modus die niet met de afgeleide modus overeenkomt is een `FAIL` op de **declaratie**,
> niet op het ontwerp. Dat onderscheid is het hele punt van §7.1.

### `DG-01` — de kerntoets

> **S3-36 · BEVROREN ZWARE SECTIE.** Een sectie is **zwaar** als zij ≥ 400px hoog is, óf een schermrand
> raakt, óf een dominant beeld van ≥ 30%vw draagt. Een zware sectie met
> `|contentbreedte@1920 − contentbreedte@1440| ≤ 1,5px` is **bevroren** → `FAIL`.
>
> `DOCUMENT`-modus **mag** smal zijn. Maar een zware landingssectie mag niet per **ongeluk** als
> DOCUMENT-modus gedragen doordat een `max-width`- of `clamp`-plafond haar bevroor.

### `DG-02` — de reviewervraag die `DG-01` oproept

> **RV-D-01.** *"Is deze smalheid bedoeld voor de compositie, of louter het gevolg van een container die
> zijn maximum bereikt?"*
> **Te inspecteren bewijs:** de drie schermafdrukken bij 1440/1774/1920 van dezelfde sectie, naast de
> gemeten rij uit `DG-01`.
> **PASS** — de smalheid is in de kaart gedeclareerd als `DOCUMENT` **en** de sectie draagt een
> randrakend element of een bedoeld leeg veld dat de smalle kolom in de compositie plaatst.
> **FAIL** — de sectie is als `CANVAS` of `HYBRID` gedeclareerd, óf de smalheid is nergens gedeclareerd en
> het blok staat gecentreerd in restruimte.
> **Valse positief:** een registersectie (`REG-5`) die terecht smal is en dat ook declareert.
> **Valse negatief:** een sectie die bij 1920 nog net binnen 1,5px schaalt maar bij 2560 vastloopt — `DG-01`
> meet tot 1920 en niet verder, en dat staat zo in de uitvoer.

### `DG-03` — responsieve schaling per modus. Geen "alles moet schalen"

| afgeleide modus | eis | grond |
|---|---|---|
| **CANVAS** | de compositorische verhoudingen blijven schalen: `schaalt` = waar | de bedoeling van een getekend canvas |
| **DOCUMENT** | de leesmaat blijft **bedoeld begrensd**: `leesBegrensd` = waar | smal is daar het ontwerp |
| **HYBRID** | het canvas groeit **én** de leesmaat blijft staan: beide waar | de enige modus met twee eisen |
| **GEMENGD** | `REVIEWER` | de machine kan dit niet beslissen |

### De gemeten uitkomst

**`index.html` — 9 secties, Master v1.**

| sectie | zwaar | modus | breedte 1440/1774/1920 | bezet % | dominant % | leesmaat ch | `DG-01` | `DG-03` |
|---|---|---|---|---|---|---|---|---|
| 01 Hero | ja | HYBRID | 1440 / 1774 / 1920 | 100 / 100 / 100 | 100 / 100 / 100 | 36,4 / 36,4 / 36,4 | PASS | PASS |
| vh-header | — | CANVAS | 1314,2 / 1619,0 / 1752,3 | 91,3 / 91,3 / 91,3 | 2,5 / 2,5 / 2,5 | — | PASS | PASS |
| oplossingen | ja | HYBRID | 1440 / 1774 / 1920 | 100 / 100 / 100 | 27,5 / 27,5 / 27,5 | 30,9 / 30,9 / 30,9 | PASS | PASS |
| projecten | ja | HYBRID | 1383,2 / 1704,0 / 1844,3 | 96,1 / 96,1 / 96,1 | 96,1 / 96,1 / 96,1 | 39,5 / 39,5 / 39,5 | PASS | PASS |
| aanpak | ja | CANVAS | 1440 / 1774 / 1920 | 100 / 100 / 100 | 53,9 / 53,9 / 53,9 | — | PASS | PASS |
| vibe-control | ja | HYBRID | 1440 / 1774 / 1920 | 100 / 100 / 100 | 5,2 / 5,2 / 5,2 | 61,4 / 61,4 / 61,4 | PASS | PASS |
| klantverhaal | ja | HYBRID | 1440 / 1774 / 1920 | 100 / 100 / 100 | 41,4 / 41,4 / 41,4 | 45,5 / 45,4 / 45,5 | PASS | PASS |
| energie-infrastructuur | ja | HYBRID | 1355,3 / 1669,6 / 1807,0 | 94,1 / 94,1 / 94,1 | 62,0 / 62,0 / 62,0 | 45,1 / 45,1 / 45,1 | PASS | PASS |
| contact-cta | ja | HYBRID | 1440 / 1774 / 1920 | 100 / 100 / 100 | 52,7 / 52,7 / 52,7 | 55,9 / 55,9 / 55,9 | PASS | PASS |

**`DG-01` bevroren zware secties: 0. `DG-03` schalingsfouten: 0.** Afgeleide modi: HYBRID 7 · CANVAS 2 ·
DOCUMENT 0. **Elke bezettingswaarde is bij alle drie breedtes identiek tot op de tiende.** Dat is
proportionele invariantie, gemeten in plaats van beweerd.

**`systeem-energieopslag.html` — 11 secties, de B2-kandidaat van de vorige ronde.**

| sectie | zwaar | modus | breedte 1440/1774/1920 | bezet % | leesmaat ch | `DG-01` | `DG-03` |
|---|---|---|---|---|---|---|---|
| vibe-header | — | CANVAS | 1307,5 / 1614,0 / 1760,0 | 90,8 / 91,0 / 91,7 | — | PASS | PASS |
| 01 Hero | ja | HYBRID | 1440 / 1774 / 1920 | 100 / 100 / 100 | 46,8 / 46,8 / 46,8 | PASS | PASS |
| **03 Probleem** | ja | DOCUMENT | **1240 / 1240 / 1240** | **86,1 / 69,9 / 64,6** | 59,0 / 59,0 / 59,0 | **FAIL** | PASS |
| 04 Het systeem | ja | GEMENGD | 1340 / 1507 / 1580 | 93,1 / 84,9 / 82,3 | **73,5 / 55,0 / 55,0** | PASS | REVIEWER |
| 05 VIBE.CONTROL | ja | GEMENGD | 1340 / 1507 / 1580 | 93,1 / 84,9 / 82,3 | 40,2 / 35,0 / 35,0 | PASS | REVIEWER |
| projectbewijs | ja | CANVAS | 1440 / 1774 / 1920 | 100 / 100 / 100 | — | PASS | PASS |
| 07 Techniek | ja | GEMENGD | 1340 / 1507 / 1580 | 93,1 / 84,9 / 82,3 | 59,0 / 55,1 / 55,1 | PASS | REVIEWER |
| 08 Exploitatie | ja | GEMENGD | 1340 / 1507 / 1580 | 93,1 / 84,9 / 82,3 | 57,2 / 49,8 / 49,8 | PASS | REVIEWER |
| **09 Implementatie** | ja | DOCUMENT | **1240 / 1240 / 1240** | **86,1 / 69,9 / 64,6** | 28,6 / 25,2 / 25,2 | **FAIL** | **FAIL** |
| **10 FAQ** | ja | DOCUMENT | **1100 / 1100 / 1100** | **76,4 / 62,0 / 57,3** | 61,7 / 54,2 / 54,2 | **FAIL** | **FAIL** |
| 11 Slot | ja | GEMENGD | 1440 / 1607 / 1680 | 100 / 90,6 / 87,5 | 59,0 / 59,0 / 59,0 | PASS | REVIEWER |

**`DG-01` bevroren zware secties: 3** (`03 Probleem`, `09 Implementatie`, `10 FAQ`).
**`DG-03` schalingsfouten: 2.** Afgeleide modi: GEMENGD 5 · DOCUMENT 3 · CANVAS 2 · HYBRID 1.

**Wat dit is en wat het niet is.** Dit is een **meting aan de bestaande B2-kandidaat**, geen regressie die
in deze ronde is veroorzaakt: `systeem-energieopslag.html` is sinds de B2-ronde byte-identiek en is in deze
ronde niet aangeraakt. Het is ook **geen opdracht om B2 te herbouwen** — dat valt buiten deze ronde. Het is
het bewijs dat `DG-01` en `DG-03` werkelijk scheiden: dezelfde drie regels geven de master 0 FAIL en de
kandidaat 3 FAIL, op precies de drie secties waar het clamp-plafond de breedte bevroor terwijl de
viewport doorgroeide.

---


## 7.11 · De beslissende differentiatietest — gedraaid

De primaire slaagvoorwaarde van deze ronde: **een premiumcompositie en een generieke, oppervlakkig
merkconforme compositie mogen niet dezelfde uitkomst geven.**

`node docs/qa/composition-gate.mjs` over acht kaarten, **120 regeluitkomsten**:

| kaart | uitkomst | FAIL | NVT | gezakt op |
|---|---|---:|---:|---|
| `control-a-premium` | **ONTWERP OK** | 0 | 0 | — |
| `control-b-generiek` | **AFGEKEURD** | **6** | 0 | `KP-03` `KP-04` `KP-05` `KP-06` `KP-07` `KP-08` |
| `control-c-kloon` | **AFGEKEURD** | **2** | 1 | `XP-01` `XP-02` |
| `homepage` | ONTWERP OK — PENDING | 0 | 1 | — |
| `schaarste-b2` | ONTWERP OK — PENDING | 0 | 1 | — |
| `vrij-a-mediagestuurd` | ONTWERP OK — PENDING | 0 | 1 | — |
| `vrij-b-systeemgestuurd` | ONTWERP OK — PENDING | 0 | 1 | — |
| `vrij-c-bewijsgestuurd` | ONTWERP OK — PENDING | 0 | 1 | — |

### Welke toetsen het verschil maken — premium tegenover generiek

`control-b-generiek` is eerlijk opgebouwd uit de opdrachtbeschrijving (hero · drie gelijke kaarten ·
50/50 · drie gelijke kaarten · FAQ · CTA) door een agent die **de poortregels niet te zien kreeg**. Dat is
de methode: anders zou de kaart naar de test zijn geschreven.

| toets | premium (A) | generiek (B) | wat de toets werkelijk ziet |
|---|---|---|---|
| **`KP-05` HERHAALDE DRIELING** | 0 herhalingen | **1** — `2× MEDIUM\|BR-02\|0D-3O-0A-0M\|VR-C` | de pagina herhaalt zichzelf letterlijk |
| **`KP-06` HECHTING** | 5 van 8 secties hechten | **0 van 6** | niets ligt op iets; alles zweeft in een raster |
| **`KP-07` GELIJKE RIJEN** | 1 rij, gerechtvaardigd | **2 rijen, 0 gerechtvaardigd** | twee rijen gelijke tegels |
| **`KP-08` HOOFDROL PER HIGH** | 3 hoofdrollen over 3 HIGH | **1 over 2** — beide `typografie` | de tweede climax is een herhaling |
| **`KP-03` IMPACTRITME** | 3 HIGH | **2 HIGH** | de pagina heeft geen derde moment |
| **`KP-04` MODUSBAND** | C4·D2·H2, 6 overgangen | **C0·D6·H0, 0 overgangen** | één modus voor de hele pagina |
| `KP-09` DRAGERVERSCHEIDENHEID | 5 rollen | 3 rollen — **PASS** | *deze toets scheidt niet* |
| `KP-10` FOTOBUDGET | 2 bestanden | 1 bestand — **PASS** | *deze toets scheidt niet* |
| `XP-01` `XP-02` `XP-03` | PASS | **PASS** | *generiek ≠ kloon; terecht* |

**Vier van de zes FAILs zijn kwaliteitstoetsen** (`KP-05` `KP-06` `KP-07` `KP-08`); twee zijn ritmetoetsen
(`KP-03` `KP-04`). En er staat eerlijk bij **welke toetsen níet scheiden**: `KP-09` en `KP-10` keuren de
generieke pagina goed. Dat moet opgeschreven staan, want het is de reden dat dragerverscheidenheid en
fotobudget alléén de vorige poort niet redden.

### Welke regels de kloon vangen

`control-c-kloon` is de omgekeerde aanval: andere inhoud, andere beelden, ander product, **hetzelfde
structurele ritme als de homepage**.

> **`control-c-kloon` slaagt op `KP-01` tot en met `KP-12`. Alle twaalf.**
> 9 secties · 3 HIGH niet aangrenzend · C5·D1·H3 met 6 overgangen · 0 herhaalde drielingen ·
> **8 van 9 secties hechten** · 1 gerechtvaardigde gelijke rij · 2 hoofdrollen over 3 HIGH ·
> 7 dragerrollen · 2 unieke klasse-A-bestanden · 9 geometriedragers in 4 rollen.
>
> Het is, intra-pagina gemeten, **een goed ontworpen pagina.** Hij valt uitsluitend op:
> `XP-01` **7 van 7 assen boven 60%**, waarvan impact · blauwdruk · drager · media alle vier **9/9
> positiegewijs identiek** · `XP-02` identieke relatieve HIGH-posities.

**Dat is de scheiding die de ronde moest aantonen.** De twee aanvallen vallen op **disjuncte
regelverzamelingen**: B zakt uitsluitend intra-pagina en slaagt op elke cross-paginaregel; C zakt
uitsluitend cross-pagina en slaagt op elke intra-paginaregel. De poort meet dus drie onafhankelijke
dingen — **merkconformiteit** (`KP-01`, `KP-10`), **compositiekwaliteit** (`KP-05`…`KP-09`) en
**originaliteit** (`XP-01`…`XP-03`) — in plaats van één samengestelde score.

### Ontwerpersvrijheid — drie legitieme composities voor dezelfde inhoud

| variant | secties | HIGH-posities | HIGH-hoofdrollen | blauwdrukken | uitkomst |
|---|---:|---|---|---|---|
| `vrij-a-mediagestuurd` | 7 | eigen | eigen verzameling | eigen reeks | **PASS** |
| `vrij-b-systeemgestuurd` | 10 | eigen | `gebouwd-object` + `topologie` | eigen reeks | **PASS** |
| `vrij-c-bewijsgestuurd` | 8 | eigen | `foto` + `metriek-bewijs` + `typografie` | eigen reeks | **PASS** |

Alle drie dragen dezelfde B2-inhoud (batterijopslag) en alle drie slagen, met **0 FAIL**. `XP-02` geeft op
alle drie `0 kaarten met identieke relatieve HIGH-posities` — zij verschillen dus ook onderling
structureel, niet alleen in woorden. **De poort codeert geen enkel "juist" ontwerp.**

### Assetschaarste — door het echte harnas

Invoer, hard: **1 klasse-A-foto · 1 klasse-B-foto · 0 productscreenshots.**
`schaarste-b2`: 7 secties, **2** fotosecties (`M2` op `logistiek-hero` klasse A, `M3` op `vve-hero` klasse
B), **5** secties `M0` met een niet-fotografische drager en `asset_status = NVT`.
**0 FAIL → PASS.** Geen nepscreenshot, geen herhaalde stockfoto, geen verzonnen project in de kaart.

### De exploit die de vorige poort openliet

`node docs/qa/composition-gate.mjs --zelftest` → **8 van 8 PASS**. De lege-pagina-exploit — een kaart met
het minimum aan secties, overal `QUIET`, overal `DOCUMENT`, overal `M0`, nergens een hechting — levert
**10 FAIL** en het eindoordeel `AFGEKEURD`. Zij glipt niet meer door op `NVT`'s.

---

## 7.12 · Het reviewerpakket

`node docs/qa/composition-gate.mjs --packet <kaart>` genereert het reviewartefact. **Gemeten omvang: 85
regels** voor `control-a-premium` — ongeveer twee pagina's, binnen het doel van één tot drie.

De reviewer hoeft dit hoofdstuk **niet** te lezen om te kunnen beslissen. Het pakket bevat:

| onderdeel | vorm |
|---|---|
| PAGINA · ARCHETYPE · VARIANT · HOOFDROL | één kopregel |
| **IMPACTKAART** | één tabelrij per sectie met alle elf structuurvelden, inclusief het aantal hechtingen |
| **MACHINEPOORT** | 15 rijen met uitkomst, gemeten waarde en eis naast elkaar |
| CONTENT/ASSET PENDING | per sectie benoemd, of *"geen"* |
| CROSS-PAGINA | `XP-01` `XP-02` `XP-03` met hun gemeten waarde |
| **DESKTOPBEWIJS 1440/1774/1920** | lege tabel, door `desktop-governance.mjs` te vullen |
| **REVIEWERVRAGEN** | zeven vragen met per vraag de FAIL-voorwaarde en een antwoordregel |
| VERDICT | drie regels: machinepoort (gevuld) · visuele review (leeg) · eindoordeel (leeg) |

De regel *"visuele review: _______ (AUTEUR MAG DIT NIET ZELF INVULLEN)"* staat letterlijk in de uitvoer.
Dat is de scheiding uit §7.9 als artefact in plaats van als beginsel.

De zeven reviewervragen in de uitvoer zijn relatievragen, geen smaakvragen:

| | vraag | FAIL als |
|---|---|---|
| `RQ-01` | Draagt elke HIGH-sectie een duidelijk dominant visueel element, of concurreren er twee om de hoofdrol? | twee elementen van vergelijkbaar gewicht zonder rangorde |
| `RQ-02` | Zou deze sectie vrijwel dezelfde compositie houden als je haar inhoud verving door een **onverwant** Vibe-product? | ja — de compositie is inhoudsonafhankelijk |
| `RQ-03` | Communiceert de hiërarchie de inhoudsprioriteit, of ontstaat zij alleen door decoratief verschil in maat en kleur? | alleen decoratief |
| `RQ-04` | Is de smalheid van deze sectie bedoeld voor de compositie, of het gevolg van een container die zijn maximum raakt? | gevolg van de cap |
| `RQ-05` | Hangt een vlak aan iets, of zweeft het in een raster? | zweeft, terwijl de kaart een hechting claimt |
| `RQ-06` | Herkent de reviewer de pagina als Vibe **zonder** dat zij de homepage nadoet? | alleen herkenbaar doordat zij de homepage nadoet |
| `RQ-07` | Draagt het beeld de sectie, of is het een illustratie naast de tekst? | illustratie |

`RQ-05` is de reviewertegenhanger van `KP-06`: de machine kan lezen **dat** de kaart een hechting declareert,
niet **of** de implementatie hem waarmaakt. Dat is precies de grens uit §7.1.

---


## 7.13 · DE EVALUATORMATRIX PER FAMILIE

> Deze paragraaf is in deze ronde geschreven en volledig opgenomen.
> Elke regel draagt SOURCE / INTENT / CONFLICT / RESOLUTION / EVALUATOR / TEST.

ated# DR-R1-13 RESOLUTIE + EVALUATORMATRIX — V1.3

Alles hieronder is in déze sessie gemeten. Geen productiebestand is gewijzigd (`git status --porcelain`
toont uitsluitend de wijzigingen die er vóór deze sessie al stonden).

---

# DEEL 1 · DR-R1-13 — DE KLASSE NIET-PAGINA

## 1.1 Waar DR-R1-13 werkelijk staat

| zoekopdracht | treffers | bestand |
|---|---:|---|
| `DR-R1-13` in `docs/00-changelog.md` | **0** | — |
| `DR-R1-13` in `docs/04-visual-language-v1.3.md` | **0** | — |
| `DR-R1-13` in de hele `docs/`-boom | **1** | `docs/qa/bouw-register.mjs:14` |
| `NIET-PAGINA` in `docs/04-visual-language-v1.3.md` | **0** | — |
| `CP-<n>` in de hele `docs/`-boom | **0** | — |

**Eerste bevinding, en hij is geen formaliteit.** De blokkade is al *opgelost in uitvoerbare code*
en nog *niet opgeschreven in de normatieve laag*. `changelog §7.1` claimt voor blokkade BLK-H1
"archetypebewuste matrix, 264 cellen, klasse `NIET-PAGINA` met 12 gedraaide eisen" en voor BLK-H2
"negen `CP`-regels". Van die drie termen is er **nul** in `04-visual-language-v1.3.md` terug te
vinden. De resolutie leeft in `docs/qa/bouw-register.mjs` en in het register dat hij schrijft.
Zolang dat zo blijft, is de vriesvoorwaarde door een script gedekt en niet door het stelsel.

## 1.2 De meetgrondslag, zelf nagerekend

`ls *.html | wc -l` in de werkboom → **48**. Dat is de noemer, en hij komt niet uit een attribuut.

Hergeneratie van het register in de scratchpad (dezelfde `bouw-register.mjs`, alleen `DOCS`/`ROOT`
en het schrijfpad vastgezet) levert een **byte-identiek** bestand aan
`docs/data/vibe-site-register.json`. De meting is dus reproduceerbaar en niet met de hand ingevuld.

```
register geschreven: 48 pagina's
page_class        {"PAGINA":43,"NIET-PAGINA":4,"SERVICEPAGINA":1}
governance        {"LEGACY":42,"MASTER":1,"NIET-PAGINA":4,"SERVICE-MINIMAAL":1}
met kaart         1
zonder meetstatus 0
diff tegen docs/data/vibe-site-register.json → leeg
```

### De vijf bestanden die geen pagina zijn — gemeten signalen uit het register

| bestand | `<html>` | `<section>` | woorden | in `sitemap.xml` | klasse |
|---|:--:|---:|---:|:--:|---|
| `_header.html` | **false** | 0 | 160 | nee | `NIET-PAGINA` — fragment |
| `popup-designs.html` | true | 5 | 253 | nee | `NIET-PAGINA` — ontwerpzandbak |
| `popup-designs-met-afbeelding.html` | true | 5 | 193 | nee | `NIET-PAGINA` — ontwerpzandbak |
| `cookie-popup-designs.html` | true | 5 | 480 | nee | `NIET-PAGINA` — ontwerpzandbak |
| `404.html` | true | 0 | 47 | nee | `SERVICEPAGINA` — eigen minimale eis |

`_header.html` draagt **geen `<html>`**. Dat is het harde meetfeit: een fragment kan niet aan een
paginapoort worden onderworpen, want de poort meet een document op 1774/1440/390px en dit bestand
wordt in andere documenten ingevoegd. De drie zandbakken staan **niet in `sitemap.xml`** en hebben
dus geen publieke route. Dit is geen uitvlucht; het is de reden dat "48 van 48 classificeerbaar"
zonder een klasse `NIET-PAGINA` een onwaarheid zou zijn.

## 1.3 De twee vriesvoorwaarden, gemeten

| voorwaarde | meting | uitkomst |
|---|---|---|
| **48/48 CLASSIFICEERBAAR** | `totals.classifiable` = **48** van 48; elk van de 48 bestanden draagt een `page_class` én een `governance_status` | **GEHAALD** |
| **48/48 MET EXPLICIETE MEASUREMENT STATUS** | `totals.without_measurement_status` = **0** | **GEHAALD** |

### De vier meetstatussen en hun tellingen

| `measurement_status` | n | wat het eerlijk zegt |
|---|---:|---|
| `NIET GEMIGREERD / REVIEW NIET VEREIST VOOR FREEZE` | **42** | legacy; draagt **geen** V1.3-metadata en doet daar niet alsof |
| `NIET VAN TOEPASSING — geen paginadocument` | **4** | de klasse `NIET-PAGINA` |
| `REVIEW NIET VEREIST VOOR FREEZE — eigen minimale eis` | **1** | `404.html` |
| `GEMETEN EN GEMAPT — referentievingerafdruk` | **1** | `index.html`, de enige pagina met een compositiekaart |

`totals.with_composition_card` = **1** (`docs/compositions/homepage.json`). Daarmee is óók gemeten
wat er níet is: **47 van 48** pagina's dragen geen kaart, en de cross-paginatoetsen draaien dus op
een verzameling van één. Dat is precies hoe het register het zelf opschrijft in `governance_note`:
*"Alleen pagina's met een `composition_card` doen mee aan de cross-paginatoetsen."*

### Archetypetoewijzing, gemeten

`B1` 1 · `B2` 4 · `B3` 15 · `B4` 5 · `B5` 11 · `B6` 2 · `B7` 2 · `S2` 3 · `null` 5 — som **48**.
De vijf `null` zijn exact de vijf niet-pagina's/servicepagina's.

### Nog drie tellingen die het register meelevert

- `data-screen-label` staat op **25 van 48** pagina's. Het register gebruikt dat attribuut
  nergens als noemer; dat is de uitvoering van `DR-V-49` / `DR-C-28`.
- Schraal in de DOM (<60 woorden): **`404.html`, `contact.html`, `netcongestie-check.html`** — 3 van 48.
- Beeldstatus: **11** pagina's met een benoemd canoniek projectbeeld, **32** met `<img>` in de DOM
  maar **klasse niet per pagina geverifieerd**, **5** n.v.t.

## 1.4 Wat er voor DR-R1-13 nog ontbreekt — en het is één ding

De uitvoerende laag is klaar. De **normatieve tekst** voor de klasse `NIET-PAGINA` staat niet in
`04-visual-language-v1.3.md`. Zonder die paragraaf is de klasse een scriptconstante die een volgende
ronde ongemerkt kan verdwijnen. Hieronder de tekst die het gat dicht, geschreven om in **H6, nieuw
§6.0** te worden gezet. **Niet toegepast** — dit is een voorstel, geen wijziging.

> ### 6.0 · WAT DE POORT TOETST — DE DRIE BESTANDSKLASSEN
>
> De poort draait op **paginadocumenten**. Welke bestanden dat zijn, wordt gemeten en niet aangenomen.
> Het siteregister (`docs/data/vibe-site-register.json`, gebouwd door `docs/qa/bouw-register.mjs`)
> kent elk `*.html`-bestand in de werkboom exact één klasse toe. Gemeten op 2 oktober: **48 bestanden,
> 43 · 4 · 1**.
>
> | klasse | voorwaarde (gemeten) | poortgevolg |
> |---|---|---|
> | **PAGINA** | het bestand draagt `<html>` **en** heeft een publieke route (`sitemap.xml`) **of** is een benoemde interne route | de volledige poort A–F geldt, gescopeerd op het archetype en de gedeclareerde modi |
> | **SERVICEPAGINA** | document zonder landingscompositie (`404.html`: 0 `<section>`, 47 woorden) | eigen minimale eis; `REVIEW NIET VEREIST VOOR FREEZE` |
> | **NIET-PAGINA** | **geen `<html>`** (fragment), **of** geen publieke route én gedeclareerd als ontwerpzandbak | de paginapoort is `NIET VAN TOEPASSING — geen paginadocument`. Dit is **geen** `N.V.T.` in de zin van `F-5`: er is geen vervangende eis, omdat er geen pagina is om een eis op te leggen |
>
> **Drie regels die deze klasse niet tot een achterdeur maken.**
> 1. `NIET-PAGINA` wordt **gemeten**, nooit gedeclareerd door de bouwer. De voorwaarde is een
>    afwezig `<html>`-element of een afwezige route — beide uit het bestand zelf gelezen.
> 2. Het aantal `NIET-PAGINA`-bestanden staat **in het poortrapport**. Groeit het, dan is dat een
>    bevinding, niet een vrijstelling.
> 3. Een `NIET-PAGINA` mag **niet** als precedent dienen (`S3-24`) en komt niet voor in de
>    cross-paginatoetsen `VAR-07`, `D-06`, `XP-01`…`XP-03`.
>
> ### 6.0.1 · MEASUREMENT STATUS — verplicht op elk bestand
>
> Elk bestand draagt exact één van vijf statussen. Een bestand zonder status is een **MEETFOUT**
> (`MC-3`), niet een PASS.
>
> | status | betekenis |
> |---|---|
> | `GEMETEN EN GEMAPT` | compositiekaart aanwezig; doet mee aan alle toetsen, inclusief cross-pagina |
> | `GEMETEN EN GEMAPT — referentievingerafdruk` | als boven, en dit is de master (`index.html`) |
> | `NIET GEMIGREERD / REVIEW NIET VEREIST VOOR FREEZE` | legacy. Draagt **geen** V1.3-metadata, pretendeert dat ook niet, en blokkeert de freeze niet. Zij kan niet `GOEDGEKEURD` worden, want zij is niet getoetst |
> | `REVIEW NIET VEREIST VOOR FREEZE — eigen minimale eis` | servicepagina |
> | `NIET VAN TOEPASSING — geen paginadocument` | `NIET-PAGINA` |
>
> **De vriesvoorwaarde luidt daarmee niet "48 van 48 GOEDGEKEURD" maar "48 van 48 met een
> gedefinieerd governancepad".** Gemeten: 48 van 48 classificeerbaar, 0 van 48 zonder meetstatus,
> **1** van 48 met een kaart. Die laatste 1 is het eerlijke getal van deze ronde: het stelsel is
> toetsbaar gemaakt, de site is nog niet geretrofit, en dat verschil wordt niet weggepoetst.

---

# DEEL 2 · DE EVALUATORMATRIX

## 2.1 Wat er geïnventariseerd is, en met welke telregel

Gegrepen op de in de opdracht genoemde prefixen in `docs/04-visual-language-v1.3.md`
(5.335 regels). Ruwe treffers: `G-0` 44 · `P-0` 127 · `S3-` 97 · `DR-V-` 80 · `BR-` 179 ·
`REG-` 61 · `NF-` 56 · `VR-` **0** · `E-0` 31 · `A-0` 54 · `M[0-6] ` 145.

Ruwe treffers zijn geen regels — ze bevatten verwijzingen, herhalingen en codes uit andere
documenten. De **telregel** die ik gebruik:

> Een **regelpositie** is een genummerd element dat in V1.3 een poortuitkomst, een vloer/band,
> een verplichte declaratie of een reviewvraag vastlegt. Niet meegeteld: open besluiten zonder
> waarde, meetlogboeken, klasse-C masterwaarden (die zijn uitdrukkelijk **geen** regel), en codes
> die alleen als verwijzing naar V1.0/V1.1/V1.2 voorkomen.

Met die regel: **273 regelposities**, en elk daarvan krijgt hieronder precies één evaluator.

## 2.2 De vier klassen — en waarom de scheiding zelf de belangrijkste regel is

| klasse | definitie | n |
|---|---|---:|
| **A NORMATIEVE ONTWERPREGEL** | legt een intentie of een verplichte verantwoording vast. De machine kan de *aanwezigheid* van de declaratie meten, nooit de *juistheid* | **58** |
| **B MACHINE-MEETBARE REGEL** | reduceert tot een getal met teller, noemer en absolute vloer, leesbaar uit DOM/CSSOM/render op een genoemde breedte | **143** |
| **C REVIEWER-OORDEELSREGEL** | vraagt een waarneming of een oordeel, óf heeft geen geijkte drempel. Een getal eraan hangen maakt hem zwakker, niet sterker | **51** |
| **D CONTENT/ASSET-AFHANKELIJKHEID** | de uitkomst hangt aan inhoud of een bestand dat wel of niet bestaat; mag `PENDING` worden | **21** |
| | **totaal** | **273** |

**De expliciete waarschuwing, want zij is in dit stelsel al aantoonbaar waar.** Subjectieve
compositiekwaliteit machinaal willen meten is zelf een faalmodus, en V1.2 heeft dat vier keer
bewezen — alle vier gemeten, niet beweerd:

1. Een nep-pagina van ±40 regels CSS (`SYSTEEM-X`) haalde **22 van 22 PASS** en versloeg Master v1
   op 6 van de 14 scheidende poorten (`changelog §3`).
2. `[].every()` is `true`: negen 50/50-secties haalden `P-10` en een pagina zonder één kaartrij
   haalde `P-09`. Een **niet-uitgevoerde** meting werd als geslaagd geboekt (`§6.8`).
3. Twee van de zes herhalingskenmerken stonden in het harnas **hardcoded op `false`**
   (`poorten.mjs:792` en `:794`) en vuurden in geen enkele automatische run (`§6.5.6`).
4. `VAR-03` kopgraden geeft de B2-kandidaat **PASS** (5 clusters) terwijl haar werkelijke defect de
   *vloer* is: mediaan 44px = 1,80–2,48% vw tegen 2,99% vw op de master. De metriek was juist en
   de conclusie fout (`§6.5.4`).

Daarom staat in deze matrix bij elke klasse-C-regel **REVIEWER** en nergens een DOM-metriek erbij.
`S3-07` is daarvan de eerlijkste: V1.3 **weigert** een typegraadpoort per rol te maken, met als
gemeten grond dat 18,0–18,9px in drie rollen voorkomt. Een regel die zegt "hier komt geen poort"
is een regel, en zijn evaluator is een mens.

## 2.3 De evaluatormatrix per familie — niemand zonder evaluator

### H1 · DESKTOPCANVAS — 77 posities

| familie | n | klasse | evaluator | grond |
|---|---:|---|---|---|
| Canvasparameters `W1`–`W6` werkbreedte | 6 | B | **MACHINE** | % vw op 1774/1440 |
| `G1`–`G4` goot | 4 | B | **MACHINE** | proportionele goot, band 3,9–5,0cqw |
| `CAN-01`–`CAN-08` sectiehoogte | 8 | B | **MACHINE** | band 1,25–2,00; ≥25% vw |
| `MED-01`–`MED-05` beeldmaat | 5 | B | **MACHINE** | ≥40% vw of `M0` |
| `V1`–`V4` informatievlak | 4 | B | **MACHINE** | ≥2,5% sectievlak |
| `GEO-01`–`GEO-05` proportionele geometrie | 5 | B | **MACHINE** | procentpolygoon, drift ≤0,3° |
| `T1`–`T9` typografie | 9 | B | **MACHINE** | graden, clusters, ratio's |
| `L1`–`L7` leeskolom | 7 | B | **MACHINE** | 46–62ch, 26,5–40,9% vw |
| `D1`, `D3`, `D5`, `D6` DOCUMENT-middelen | 4 | B (`D1` = A) | **MACHINE** | trede ≥4 digits, drager ≥60%, spreiding vrij |
| `D2` kolom uit het midden | 1 | B | **MACHINE** | lichtste zijde ≤47,5% |
| `D4` doorlopende drager van een register | 1 | A | **REVIEWER** | drempel 60% is **TE IJKEN** (`R3`) |
| Modusmatrix §1.3.4, `P-01`…`P-14`, `P-16` herscoped | 14 | B | **MACHINE** | per gedeclareerde modus PASS-verplicht |
| `P-15` / `T9` handgezette regelval | 1 | C | **REVIEWER** | `B REFERENTIEBEREIK`, **expliciet geen poort** tot `DR-C-25` |
| `R1`–`R8` visuele reviewvragen | 8 | C | **REVIEWER** | "niet toetsbaar met een getal" — letterlijk in §1.8 |

### De archetypescoping — 8 posities

| familie | n | klasse | evaluator | grond |
|---|---:|---|---|---|
| `M-D1`…`M-D8` N.V.T.-redenen in DOCUMENT MODE | 8 | A | **NVT-VOOR-DIT-ARCHETYPE** | elke reden draagt een getal; `F-5` eist een vervangende eis die zelf PASS/FAIL geeft |

Dit is de enige familie waar `NVT-VOOR-DIT-ARCHETYPE` het *eindantwoord* is. Op elke andere plek is
N.V.T. een **toestand**, niet een evaluator: `§6.8.3` geeft 22 rijen met per toets de N.V.T.-voorwaarde
en de vervangende eis, en voor **A-08, A-09, B-01…B-07, VAR-05, D-01…D-05, E-03** staat daar
letterlijk **"nooit"**. In DOCUMENT MODE worden 9 van de 15 modusrijen volledig N.V.T. (`P-01/P-02`,
`P-03`, `P-04`, `P-05`, `P-06`, `P-09`, `P-11`, `P-13`, `P-16`), `P-14` alleen voor de band.
Voor de 4 `NIET-PAGINA`-bestanden zijn **alle 219 poortregels** `NVT-VOOR-DIT-ARCHETYPE` — dat is
DEEL 1.

### H2 · BEELD EN ASSETS — 23 posities

| familie | n | klasse | evaluator | grond |
|---|---:|---|---|---|
| `M0`–`M6` beeldbehandelingen | 7 | D | **MACHINE+REVIEWER** | breedte, ratio en resolutie machinaal; **onderwerpbehoud** is per beeldsoort verschillend en blijft een oordeel (`§2.0.2`, `RV-G-04`) |
| `DR-I-03` zwak beeld nooit dominant podium · `DR-I-26` PENDING-status | 2 | D | **MACHINE+REVIEWER** | de klasse-indeling van een opname is een oordeel; de gevolgtrekking is machinaal |
| `DR-I-22` fotoloze fractie · `DR-I-25` hergebruik ≤4 pagina's | 2 | D | **MACHINE** | beide nu meetbaar: het siteregister bestaat |
| `DR-I-04`, `-10`, `-11`, `-12`, `-14` (+`U-1`…`U-4`), `-15`, `-16`, `-17`, `-20`, `-21`, `-23`, `-24` | 12 | B | **MACHINE** | oppervlakte-, contrast- en dekkingsdrempels met een genoemde meetmethode |

**Eerlijk gemeld:** van de twaalf `DR-I`-regels in de laatste rij heb ik `-04`, `-10`, `-11`, `-12`,
`-14`, `-16`, `-17`, `-21`, `-23` deze sessie letterlijk gelezen; `-15`, `-20` en `-24` niet — die
erven de familie-evaluator **MACHINE** en de individuele lezing is **NIET GEDRAAID**.
De twaalf open `DR-I`-besluiten uit §2.7 (`-01`, `-02`, `-05`…`-09`, `-13`, `-18`, `-19`, `-22-b`,
`-27`) zijn **geen regels** en tellen niet mee.

### H3 · VLAKKEN, HIERARCHIE EN REGISTERS — 44 posities

| familie | n | klasse | evaluator | grond |
|---|---:|---|---|---|
| `S3-00`, `-01`, `-02`, `-05`, `-06`, `-08`, `-09`, `-10`, `-12`, `-15`, `-16`…`-21` | 16 | B | **MACHINE** | lege-verzamelingsgrendel, afstanden in px, rangverhouding ≥1,55, registersignatuur |
| `S3-03` afgeleide én vaste maten · `S3-24` precedent-geen-blauwdruk | 2 | A | **MACHINE** | aanwezigheid van beide maatsoorten; ≥3 maten gelijk aan de master = FAIL |
| `S3-04` verklaringstoets · `S3-11` hierarchieverantwoording · `S3-14` registerverantwoording | 3 | A | **MACHINE+REVIEWER** | de machine ziet dát er een verantwoording staat; of zij **waar** is, ziet een mens. Dit is de enige poort die geen CSS-truc omzeilt (§3.10) |
| `S3-13` registertoets `R-a`…`R-d` | 1 | A | **MACHINE+REVIEWER** | `R-b` (veldenset) en `R-c` (woordratio ≤1,40) machinaal; `R-a` en `R-d` zijn letterlijk "waarneembaar ja/nee" |
| `S3-22` ongedekt cijfer · `S3-23` gesuggereerde installatie | 2 | A | **MACHINE+REVIEWER** | label- en bronaanwezigheid machinaal; of het label **volstaat** is §3.7 vraag 6 |
| `S3-07` géén typegraadpoort per rol | 1 | A | **REVIEWER** | V1.3 weigert hier een metriek; gemeten overlap 18,0–18,9px in drie rollen |
| `REG-1`…`REG-5` registers | 5 | B | **MACHINE** | gemeenschappelijke anatomie + typografische trap, getoetst via `S3-16`…`S3-20` |
| `NF-1`…`NF-6` niet-fotografische middelen | 6 | A | **MACHINE+REVIEWER** | minima machinaal; "leest dit als een werkend systeem of als een illustratie" is §3.7 vragen 3, 6, 7 |
| §3.7 visuele reviewvragen | 8 | C | **REVIEWER** | "niet met een getal te toetsen en staan daarom **niet** als poort" |

### H4 · GEOMETRIE, TYPOGRAFIE EN TOEGANKELIJKHEID — 45 posities

| familie | n | klasse | evaluator | grond |
|---|---:|---|---|---|
| `DR-G-01`, `-02`, `-04`, `-05`, `-06`, `-08`…`-13`, `-16`, `-17`, `-20` | 14 | B | **MACHINE** | 14 van de 17 poorten; hoeken, clusters, regelvakken, glyphgemaskeerd contrast |
| `DR-G-14` AA-norm · `DR-G-15` meetmethode N1/N2/N3 | 2 | B | **MACHINE** | besluit zonder eigen poort; gehandhaafd via `DR-G-20` |
| `DR-G-23` hertelling geometriedragers | 1 | B | **MACHINE** | open, maar het is een **meting**: status **NIET GEDRAAID** |
| `DR-G-03` functie per drager · `DR-G-07` decoratiebudget · `DR-G-19` decoratief type op beeld | 3 | A | **MACHINE+REVIEWER** | de **weglaattoets** (§4.1.4) is een reviewerinstrument; `RV-G-03` is exact dit oordeel; `DR-G-19`(ii) is **NIET GEMETEN** |
| `DR-G-18` Master v1 niet wijzigen | 1 | A | **REVIEWER** | governancebesluit; de 12 `L-01`…`L-12`-uitzonderingen zijn een register, geen poort |
| `DR-G-21`, `DR-G-22` blauwtreden | 2 | C | **REVIEWER** | **OPEN merkbesluit**; `DR-G-21` heeft geen kandidaat in `home.css:35-38` |
| §4.3.6 zes verboden voor nieuwe pagina's | 6 | B | **MACHINE** | elk **FAIL**; verbod 4 uitdrukkelijk "niet N.V.T., en zeker niet PASS" |
| `F1`–`F6` functionele geometriefamilies | 6 | A | **REVIEWER** | vocabulaire; één antwoord per drager, bevestigd met de weglaattoets |
| `RV-G-01`…`RV-G-10` | 10 | C | **REVIEWER** | "herkenning is geen getal" (`RV-G-02`) |

### H5 · BLAUWDRUKKEN ALS RELATIES — 30 posities

| familie | n | klasse | evaluator | grond |
|---|---:|---|---|---|
| `BR-01`…`BR-13` relatieblauwdrukken | 13 | A | **MACHINE+REVIEWER** | elke `BR` draagt stuurmaten **én** een eigen reviewvraag in §5.6. De schoonste tweedeling in het stelsel |
| `BR-F1` plafond op behandelingen | 1 | A | **MACHINE** | plafond op de fotografische behandelingen, niet op hun afwezigheid |
| `BR-F2` dragerverscheidenheidsvloer · `BR-F3` één bestand, één sectie | 2 | D | **MACHINE** | `ceil(n÷2)` soorten, max 3; 0 duplicaten per pagina |
| §5.6 visuele reviewvragen | 14 | C | **REVIEWER** | "expliciet géén poort. Elke vraag hoort bij een `BR` en wordt door een mens beantwoord" |

`B01`–`B15` (15 V1.2-blauwdrukken) is een **classificatieregister** in §5.1.2, geen regelset, en telt
niet mee. Vier van de vijftien verdwijnen als blauwdruk.

### H6 · DE KWALITEITSPOORT — 46 posities

| regel | klasse | evaluator | grond |
|---|---|---|---|
| `A-01` werkbreedte · `A-02` beeldintegratie · `A-03` herhaalde compositie · `A-09` vergrote mobiele opmaak | B | **MACHINE** | %vw, dominante zones, 390px-meting |
| `A-04` HIGH-dominantie | A | **MACHINE+REVIEWER** | `B-01` kruiscontroleert expressis verbis of de reviewer hetzelfde element noemt als de meting |
| `A-05` gelijk raster zonder gelijke inhoud | A | **MACHINE+REVIEWER** | het raster is machinaal; "gelijke inhoud" is `S3-13` `R-a`/`R-d` |
| `A-06` decoratieve geometrie zonder structurele rol | A | **MACHINE+REVIEWER** | maatvloer `W-1` machinaal; de weglaattoets is de reviewer |
| `A-07` verzonnen of onderbouwingsloze claim | D | **MACHINE+REVIEWER** | claimstatus is een veld; of de bron dekt, is een oordeel (`§1A.7`: PUBLICLY EXISTING ≠ VERIFIED) |
| `A-08` asset ontbreekt en is stilzwijgend vervangen | D | **MACHINE** | N.V.T. **nooit**; leeg slot = `PENDING` via `D-01` |
| `B-01`…`B-07` visuele reviewcriteria | C | **REVIEWER** | **een mens, niet de bouwer**. `JA` zonder waarneming = `ONBEANTWOORD`, en dat is geen PASS |
| `VAR-01`…`VAR-06` herhalingsgrenzen | B | **MACHINE** | clusters met enkelvoudige koppeling; elke τ in een gemeten gat |
| `VAR-07` siteherhaling | C | **REVIEWER** | drempels 0,40/0,30 zijn **NIET GEMETEN** → tot de eerste ijking uitdrukkelijk een reviewvraag |
| `D-02` klasse dekt behandeling · `D-03` uniciteit · `D-04` tekstvat · `D-06` beeldbudget | D | **MACHINE** | tabellookup, duplicaten, vatvergelijking, siteregister |
| `D-01` bestandsnaam én klasse · `D-05` claimstatus | D | **MACHINE+REVIEWER** | aanwezigheid machinaal, juistheid van de klasse/bron menselijk |
| `E-01`…`E-04` responsieve integriteit | B | **MACHINE** | 390/1440/1774px |
| `F-1`…`F-6` het lege-pagina-lek | A (`F-2`, `F-4` = B) | **MACHINE** | drie uitkomsten, lege verzameling nooit PASS, teller/noemer/vloer verplicht, N.V.T. verandert het verdict |
| `MC-1`…`MC-5` meetcontract | A (`MC-3`…`MC-5` = B) | **MACHINE** | noemer uit de DOM, geneste declaraties verboden, stil falen verboden |
| `W-1` maatvloer · `W-2` afstand | B | **MACHINE** | tellen zonder afstand is geen variatietoets |

## 2.4 De matrix in één telling

| evaluator | n | aandeel |
|---|---:|---:|
| **MACHINE** | 162 | 59,3% |
| **REVIEWER** | 60 | 22,0% |
| **MACHINE+REVIEWER** | 43 | 15,8% |
| **NVT-VOOR-DIT-ARCHETYPE** | 8 | 2,9% |
| **zonder evaluator** | **0** | 0% |
| **totaal** | **273** | 100% |

Kruistabel klasse × evaluator (de som sluit in beide richtingen):

| | MACHINE | REVIEWER | M+R | NVT | totaal |
|---|---:|---:|---:|---:|---:|
| **A** normatieve ontwerpregel | 10 | 9 | 31 | 8 | **58** |
| **B** machine-meetbare regel | 143 | 0 | 0 | 0 | **143** |
| **C** reviewer-oordeelsregel | 0 | 51 | 0 | 0 | **51** |
| **D** content/asset-afhankelijkheid | 9 | 0 | 12 | 0 | **21** |
| **totaal** | **162** | **60** | **43** | **8** | **273** |

**Wat deze telling zegt, en het is geen compliment aan het stelsel.** 103 van de 273 posities
(37,7%) hebben een mens nodig — 60 volledig en 43 voor de helft. `changelog §7.4` noemt als eerste
infrastructurele gat *"een benoemde reviewer"*. Zolang die er niet is, is **37,7% van V1.3 niet
uitvoerbaar**, en dat is exact de bevinding uit §7.2: de generieke en de premiumpagina verschillen
uitsluitend in de laag die geen uitvoerder heeft. De matrix maakt dat percentage voor het eerst een
getal in plaats van een vermoeden.

## 2.5 Vijf regels die een familie zouden kunnen ontglippen — en waar zij nu staan

| regel | risico | toewijzing |
|---|---|---|
| `S3-07` | staat in de poortenlijst met schaal "—" en zou als niet-regel wegvallen | **REVIEWER**, klasse A |
| `P-15` / `T9` | `B REFERENTIEBEREIK`, geen poort; valt tussen H1 en H4 | **REVIEWER**, klasse C, tot `DR-C-25` |
| `VAR-07` | heet poort en is er geen | **REVIEWER**, klasse C, tot de eerste ijking |
| `DR-G-21`, `DR-G-22` | OPEN zonder waarde; zou als "later" verdwijnen | **REVIEWER**, klasse C — het zijn merkbesluiten, geen metingen |
| `D4` | drempel 60% is TE IJKEN maar de regel is actief | **REVIEWER**, klasse A, met `R3` als bijbehorende vraag |

## 2.6 Twee toewijzingen die door DEEL 1 veranderen

1. **`D-06` beeldbudget over de site.** `§6.8.3` geeft als N.V.T.-reden: *"het siteregister bestaat
   niet → **NIET MEETBAAR**"*. Dat is sinds deze ronde **feitelijk achterhaald**: het register
   bestaat, is reproduceerbaar en dekt 48 van 48 bestanden. `D-06` gaat daarmee van `NIET MEETBAAR`
   naar **MACHINE**, met één gemeten gat: **32 van 48** pagina's dragen `<img>` in de DOM zonder
   per-pagina klasseverificatie, en **11** dragen een benoemd canoniek projectbeeld. `D-06` kan dus
   nú draaien op 11 pagina's en meldt voor 32 pagina's een ontbrekend veld — niet een PASS.
2. **`S3-24` precedent, geen blauwdruk** en **`VAR-07` siteherhaling** hadden hetzelfde register
   nodig. `S3-24` kan draaien (de mastervingerafdruk bestaat als `docs/compositions/homepage.json`);
   `VAR-07` kan het niet, maar om een andere reden: zijn drempels zijn niet gemeten. Twee blokkades
   die als één werden geboekt, zijn hier gescheiden.

---

# OPENSTAANDE TEGENSTRIJDIGHEDEN — 7

| # | tegenstrijdigheid | gemeten grond | status |
|---|---|---|---|
| **T-1** | `changelog §7.1` claimt voor BLK-H1/BLK-H2 "klasse `NIET-PAGINA`" en "negen `CP`-regels"; geen van beide termen staat in `04-visual-language-v1.3.md` | `NIET-PAGINA` 0 treffers in het doc, 1 in `docs/qa/bouw-register.mjs:14`; `CP-` 0 treffers in de hele `docs/`-boom | **OPEN** — gedicht met de voorgestelde §6.0 in DEEL 1 §1.4, nog niet toegepast |
| **T-2** | Twee rivaliserende reviewerlagen. Het doc heeft `B-01`…`B-07`; het draaiende harnas heeft `R-01`…`R-07` met **andere** vragen, plus `VR-A`…`VR-H` (8 visuele rollen) en een fotobudget die in het doc **0 treffers** hebben | `grep 'VR-' 04-visual-language-v1.3.md` = 0; `VR-A`…`VR-H` in `docs/schema/composition-card.schema.json`; `R-01`…`R-07` in `docs/qa/composition-gate.mjs:298-304` | **OPEN** — de poort die draait is niet de poort die het doc beschrijft |
| **T-3** | Codenaamruimte-botsingen over twaalf reeksen binnen één stelsel | `B1`–`B5` (canvas) ↔ `B1`–`B7` (archetypes) ↔ `B-01`–`B-07` (DEEL B) ↔ `B01`–`B15` (blauwdrukken) · `M1`–`M5` (geometrie) ↔ `M0`–`M6` (beeld) · `H1`–`H8` (hoogte) ↔ `H1`–`H6` (hoofdstukken) · `D1`–`D6` (DOCUMENT) ↔ `D-01`–`D-06` (DEEL D) ↔ klasse `D` (asset) ↔ `D-O`/`D-V`/`D-0` (dragers) ↔ `D-01`/`D-03` (`desktop-governance.mjs`) · `Z1`–`Z12` (§0.4) ↔ `Z1`–`Z5` (§4.2.5) · `K-1`–`K-12` (§1.5) ↔ `K-1`–`K-11` (§2.5) ↔ `K1`–`K8` (kaartfamilies) · `F1`–`F6` (geometrie) ↔ `F-1`–`F-6` (lege-pagina) · `R1`–`R8` (§1.8) ↔ `R-01`–`R-07` (harnas) ↔ `R-a`–`R-d` (registertoets) · `C-01`–`C-07` (DEEL C) ↔ `C1`–`C12` (V1.1) · `KP-01`–`KP-12` (harnas) ↔ `G01`–`G24` (grammatica) ↔ `G1`–`G4` (goot) | **OPEN** — `§1A.12` punt 5 noteert al vier botsende reeksen; het zijn er gemeten **twaalf** |
| **T-4** | `NF-4` TYPOGRAFISCH PROPOSITIEPODIUM: de doorsnede van zijn eigen eisen is leeg | `changelog §7.2`, niet door mij nagemeten | **OPEN** — rekenfout in de regel zelf; een legitieme compositie wordt onterecht afgewezen |
| **T-5** | `VAR-07` heet een poort en is er geen | drempels 0,40 / 0,30 **NIET GEMETEN**; `§6.5.8` noemt hem zelf "tot de eerste ijking een reviewvraag" terwijl `changelog §5` BLK-03 eist "`VAR-07` tot poort maken" | **OPEN** — reparatieopdracht en doc spreken elkaar tegen |
| **T-6** | `§6.8.3` geeft als N.V.T.-reden bij `D-06`: "het siteregister bestaat niet" | het register bestaat: 48 bestanden, reproduceerbaar, byte-identiek na hergeneratie | **OPEN, OPLOSBAAR NU** — tekst achterhaald; zie DEEL 2 §2.6 punt 1 |
| **T-7** | De twintigste tegenstrijdigheidsrij uit `changelog §7.1` ("19 van 20 gesloten") | welke rij dat is, heb ik **niet** vastgesteld | **OPEN, NIET GEÏDENTIFICEERD** — overgeërfd, niet door mij gemeten |

---

# EINDRAPPORT

```
BASE SHA / FINAL SHA  = n.v.t. — geen commit gemaakt, geen bestand in de repo gewijzigd
TYPECHECK  = NIET GEDRAAID — documentatietaak, geen TS in scope
BUILD      = NIET GEDRAAID — documentatietaak
LINT       = NIET GEDRAAID — documentatietaak
TESTS      = register-reproductie 1/1 PASS (bouw-register.mjs in scratchpad → byte-identiek
             aan docs/data/vibe-site-register.json)
             48/48 CLASSIFICEERBAAR   PASS  (totals.classifiable = 48)
             48/48 MEASUREMENT STATUS PASS  (totals.without_measurement_status = 0)
             EVALUATORDEKKING 273/273 PASS  (0 regelposities zonder evaluator)
NIET GEDRAAID = individuele lezing van DR-I-15, DR-I-20, DR-I-24 — buiten het leesbudget,
                erven de familie-evaluator MACHINE
              = narekening van de NF-4-rekenfout — overgenomen uit changelog §7.2
              = identificatie van de twintigste open tegenstrijdigheidsrij
RODE POORTEN  = geen (geen poort gedraaid; dit is een inventarisatie, geen poortronde)
PUSHED = NO    DEPLOYED = NO
EINDOORDEEL = PASS voor beide opgedragen deliverables; V1.3 blijft GEBLOKKEERD op 7 open
              tegenstrijdigheden en op het eerste infrastructurele gat (benoemde reviewer),
              dat nu met 103 van 273 regelposities (37,7%) gequantificeerd is.
```

---


## 7.14 · WAT NA DE UITVOERENDE RONDE OPEN BLEEF — zelf nagemeten

> **STATUS: ACHTERHAALD DOOR `§7.17`, HISTORISCH BEWAARD.**
> Deze paragraaf is de stand aan het eind van de **uitvoerende** ronde: `INTERNE
> TEGENSTRIJDIGHEDEN OPEN = 4` (`T-2`, `T-3`, `T-5`, `T-7`). De afsluitronde heeft die vier gesloten —
> `T-2` in `§7.15`, `T-3` in `§7.17` met `docs/data/vibe-rule-id-registry.json`, `T-5` in `§7.16` als
> `CALIBRATION PENDING`, `T-7` in `§7.18`. **Het canonieke register is `§7.17`.** Elk getal hieronder
> geldt als meting van die eerdere stand, niet als huidige stand. De paragraaf blijft staan omdat zij
> vastlegt wat er mis was en wie het veroorzaakte.

De opdracht vroeg `INTERNE TEGENSTRIJDIGHEDEN OPEN = 0`. **Dat getal is niet gehaald.** Hieronder staat
wat werkelijk open is, met de meting erbij, en bij elk of ik hem in deze ronde heb veroorzaakt.

### Gesloten in deze ronde

| | was | nu | bewijs |
|---|---|---|---|
| **T-1** | `NIET-PAGINA` en de `CP-`regels werden in de changelog geclaimd maar stonden **0×** in het doc | `NIET-PAGINA` **26×**, normatief vastgelegd als `S3-30`; `CP-01a` vervangen door `XP-01`…`XP-03` | `§7.0`, `§7.7` |
| **T-4** | `NF-4`'s eigen eisen hadden een lege doorsnede | gerepareerd, venster **28,6px** gemeten | `§7.6` |
| **T-6** | `§6.8.3` gaf als `N.V.T.`-reden *"het siteregister bestaat niet"* | tekst doorgehaald en gecorrigeerd; het register bestaat | regel `D-06` in `§6.8.3` |
| **R7** · **R8** | twee `ch`/`px`-conflicten, *"niet gemeten in deze sessie"* | gesloten met een browsermeting: de master declareert in **`cqw`** | `§7.5` |
| `DR-U2-01` · `-06` · `-07` | niet vindbaar in de werkboom | teruggelezen en gesloten, twee door code | `§7.7` |
| `IC-01`…`IC-18` | 18 gemeten tegenstrijdigheden | 18 gesloten met een toets die in PASS of FAIL eindigt | `§7.8` |

### Open — en twee ervan heb ik zelf veroorzaakt

| | wat | meting | door mij? |
|---|---|---|---|
| **T-2** | **Twee rivaliserende reviewerlagen.** Het doc heeft `B-01`…`B-07` (**13** treffers); het draaiende harnas heeft `RQ-01`…`RQ-07` met **andere** vragen. Welke laag het gezag heeft, is niet besloten. | `grep -c "B-01"` = 13 | **deels ja** — ik heb de tweede laag toegevoegd |
| **T-3** | **Codenaamruimte-botsingen over twaalf reeksen.** In deze ronde **verminderd maar niet weggewerkt**: `KP-`, `XP-`, `DG-` en `RQ-` zijn nieuw en vrij (elk 0 treffers vóór deze ronde), maar `S3-28`…`S3-36` is aan de bestaande `S3-`reeks geplakt en `IC-01`…`IC-18` botst met niets maar is wéér een nieuwe reeks. De twaalf geërfde botsingen (`B1`–`B5` ↔ `B1`–`B7` ↔ `B-01`–`B-07` ↔ `B01`–`B15`, `M1`–`M5` ↔ `M0`–`M6`, `H1`–`H8` ↔ `H1`–`H6`, …) staan er onverkort. | `§1A.12` punt 5 noteert 4; gemeten zijn **12** | **deels ja** — ik heb er twee reeksen bij gezet |
| **T-5** | **`C-07` heet een poort en is er geen.** De drempels 0,40 / 0,30 zijn **NIET GEMETEN**; `§6.5.8` noemt hem zelf *"tot de eerste ijking een reviewvraag"* terwijl `changelog §5` eist *"`C-07` tot poort maken"*. Opdracht en doc spreken elkaar tegen. | `grep -c "C-07"` = 14 | nee — geërfd |
| **T-7** | **De twintigste tegenstrijdigheidsrij** uit `changelog §7.1` (*"19 van 20 gesloten"*). Welke rij dat is, is in deze ronde **niet vastgesteld**. | niet geïdentificeerd | nee — geërfd |

**INTERNE TEGENSTRIJDIGHEDEN OPEN = 4** (`T-2`, `T-3`, `T-5`, `T-7`).

### Waarom ik ze niet alsnog heb gesloten

- **`T-2`** vraagt een besluit over **gezag**, niet een meting: moet de reviewerlaag van het doc
  (`B-01`…`B-07`) wijken voor die van het harnas (`RQ-01`…`RQ-07`), of omgekeerd, of worden zij
  samengevoegd? Dat eenzijdig beslissen zou een ontwerpbesluit zijn dat buiten deze ronde valt.
- **`T-3`** vraagt een stelselbrede hernummering van twaalf reeksen over 7 000 regels. Dat is een
  mechanische ingreep met een reëel kans op stille fouten, en hij raakt tekst die in deze ronde niet
  ter beoordeling staat. De vier reeksen die ík heb toegevoegd zijn wél op vrije prefixen gezet.
- **`T-5`** vraagt een ijkmeting (de drempels 0,40 / 0,30) op een derde pagina die nog niet bestaat.
- **`T-7`** is een geërfde administratieve post: de rij is niet geïdentificeerd en ik ga niet raden
  welke het was.

### Overige openstaande posten, niet als tegenstrijdigheid geteld

| soort | n | wat |
|---|---:|---|
| **CONTENT PENDING** | 11 secties over 5 kaarten | `homepage` 1 · `schaarste-b2` 4 · `vrij-a` 2 · `vrij-b` 2 · `vrij-c` 3 — alle met een geslaagde ablatietoets, dus het **ontwerp** valt er niet op |
| **ASSET PENDING** | 1 slot | `homepage` sectie 04: klasse-C-bron onder een bandbehandeling |
| **USER DECISION REQUIRED** | 1 | operationeel gesloten met een standaardwaarde (`§7.8` punt 4) |
| **VISUELE REVIEW** | 8 van 8 kaarten | **bij ontwerp onbeslist.** `§7.9` verbiedt de auteur het visuele oordeel in dezelfde stap zelf in te vullen. Geen enkele kaart heeft dus een EINDgoedkeuring — alleen `ONTWERP OK, WACHT OP VISUELE REVIEW`. Dat is de scheiding die werkt, geen gat. |
| **DUNNE CROSS-PAGINASET** | — | de set bevat **1** niet-controlekaart (`homepage`). `XP-01` kon de kloon vangen omdat de homepage erin zit, maar de drempels zijn nog niet op een derde gemigreerde pagina geijkt. |
| **GEEN DESKTOPBEWIJS VOOR DE KAARTEN** | 8 van 8 | de controlekaarten hebben geen HTML — de opdracht verbood die te bouwen. `DG-01`…`DG-03` zijn daarom gedemonstreerd op de twee pagina's die wél bestaan. In het reviewerpakket staat die tabel leeg tot implementatie. |

---

## 7.15 · `T-2` — ÉÉN NORMATIEVE VISUELE REVIEWLAAG

> **NUMMERINGSCORRECTIE.** De analyse stelde de nieuwe vragen voor als `RQ-14` en `R-09` (codes die het harnas nooit heeft gekend). Het harnas
> gaf tot deze ronde `RQ-01`…`RQ-07` uit, dus zijn zij doorgenummerd als **`RQ-08`** (beeldgebondenheid,
> uit `B-03`) en **`RQ-09`** (leegte met eigenaar, uit `B-05`). Beide staan nu werkelijk in
> `docs/qa/composition-gate.mjs` in de constante `REVIEWERVRAGEN` — zij zijn dus geen voorstel meer.

> Deze paragraaf schrijft een **besluit van de opdrachtgever** uit. Zij herontwerpt geen regel, voegt
> geen reviewlaag toe en wijzigt geen productiebestand. `§7.14` noemt `T-2` ("twee rivaliserende
> reviewerlagen") OPEN met als reden: *"dat vraagt een besluit over gezag, niet een meting"*. Het
> besluit is nu genomen; hieronder staat het, plus de afhandeling van alle zeven oude criteria en de
> gezagsorde als procedure.

### 7.15.0 Het besluit — normatief

1. **Er is één normatieve visuele reviewlaag.** Het uitvoerende governance/reviewermodel uit de
   laatste V1.3-ronde is de **canonieke operationele reviewlaag**: de reviewervragen
   `RQ-01`…`RQ-07` in `docs/qa/composition-gate.mjs` (constante `REVIEWERVRAGEN`, regels 297–305) en
   het reviewmodel in `§7.9`, met `§7.12` als beschrijving van het artefact dat het pakket oplevert.
2. **Oudere reviewercriteria mogen alleen blijven als** zij (A) zijn opgenomen als criterium of vraag
   **binnen** die canonieke laag, of (B) expliciet zijn gemarkeerd als **SUPERSEDED / NIET-NORMATIEF**.
3. **Zij mogen niet als tweede onafhankelijk gezag werken.** Geen enkel verdict, geen enkele poort en
   geen enkele reviewpas mag een `B-`code als zelfstandige grond aanvoeren.
4. **Gezagsorde:** (1) normatieve V1.3-regels uit de visuele taal · (2) de uitvoerende
   geautomatiseerde poort · (3) het canonieke visuele-reviewpakket · (4) eindgoedkeuring door een mens.
   Uitgeschreven als procedure in `§7.15.5`.
5. **Schrijfpasgrens.** Claude mag een compositie schrijven en bewijs genereren, maar mag het
   onafhankelijke visuele-reviewverdict **niet in dezelfde schrijfpas** invullen (`§7.9 §1.4` sloten
   `M3`/`M5`; uitkomst anders `ONGELDIG`, en `ONGELDIG` telt als FAIL).

### 7.15.1 Wat de canonieke laag precies is — gemeten in deze sessie

| artefact | pad | gemeten inhoud |
|---|---|---|
| reviewervragen (uitvoerend) | `docs/qa/composition-gate.mjs` r. 297–305 | `REVIEWERVRAGEN` = **7** items: `RQ-01`…`RQ-07`, elk met `code`, `vraag`, `fail` |
| pakketgenerator | `docs/qa/composition-gate.mjs` r. 342–374 (`pakket()`), r. 368 | drukt elke `RQ` af met FAIL-voorwaarde + antwoordregel; r. 371 drukt letterlijk `visuele review: _______ (AUTEUR MAG DIT NIET ZELF INVULLEN)` |
| machinepoort | `docs/qa/composition-gate.mjs` | `KP-01`…`KP-12` + `XP-01`…`XP-03` = **15** regels (r. 309–314); drie eindregels (r. 318–321) |
| reviewmodel | `§7.9` r. 6385–6752 | 5 rollen (`A`,`P`,`V`,`C`,`E`), pas-id, 7 stappen `S1`…`S7`, 5 sloten `M1`…`M5`, reviewerregels `R-01`…`R-13`, desktopgovernance |
| desktopmeting | `docs/qa/desktop-governance.mjs` r. 137–157 | emit per sectie **`DG-01`** (machine), **`DG-02-reviewervraag`**, **`DG-03`** (`PASS`/`FAIL`/`REVIEWER`) |
| pakketbeschrijving | `§7.12` r. 6944–6978 | de zeven `RQ`-vragen met FAIL-voorwaarde; `RQ-05` benoemd als reviewertegenhanger van `KP-06` |

Twee gemeten eigenschappen van die laag die hieronder nodig zijn:

- `R-01`…`R-07` in `§7.9 DEEL 2` zijn **dezelfde zeven vragen** als `RQ-01`…`RQ-07`, in scherpere vorm
  (`§7.9` r. 6493: *"`R-01`–`R-07` houden de codes die `composition-gate.mjs` al uitgeeft"*). De
  canonieke laag heeft dus een **documenthelft** (`R-nn`, met bewijs/PASS/FAIL/valse positief/valse
  negatief) en een **harnashelft** (`RQ-nn`, de vraag + de FAIL-voorwaarde in het pakket).
- `R-08`…`R-13` zijn **wel** canoniek (zij staan in `§7.9 DEEL 2`, r. 6567–6619) maar staan **niet** in
  `REVIEWERVRAGEN`: `grep -c "R-08"` op `composition-gate.mjs` = **0**. Het pakket geeft ze vandaag
  niet mee uit. Dat is een uitgiftegat binnen de canonieke laag, geen tweede laag.
- Naamgevingsafwijking, gemeten: `§7.9` spreekt van `D-01`/`D-02`/`D-03`; het script emit
  `DG-01`/`DG-02-reviewervraag`/`DG-03`. `D-01`…`D-06` is bovendien al bezet door de assetfamilie
  (`§6.8.3` r. 5195). In deze paragraaf worden daarom de **gemeten** codes `DG-01`/`DG-03` gebruikt.

### 7.15.2 De oude laag — wat `B-01`…`B-07` werkelijk vragen

Bron: `§6.4 DEEL B — VISUELE REVIEWCRITERIA`, r. 4920–4951. Alle zeven gelezen. Omvang gemeten:
13 netto voorkomens van `B-01` in dit document (17 totaal, waarvan 4 de besluitcode `DR-B-01`).

| # | letterlijke vraag | wat het criterium **werkelijk** vraagt | eigen bewijsanker in `§6.4` |
|---|---|---|---|
| `B-01` | Heeft de sectie een duidelijk dominant element? | welk element je als eerste ziet in 2 seconden, **en** of dat hetzelfde element is dat de dominante-zonemeting `A-04` aanwijst. Onvoldoende: "kop en beeld zijn even belangrijk", of meting en reviewer noemen verschillende elementen | kruiscontrole op `A-04` (dominante zone < 50% = FAIL, plus ordeningseis, r. 4857) |
| `B-02` | Is de diepte bewust? | liggen vlakken, kaarten of type **óp** beeld, of staat alles naast elkaar in één laag; kruist iets een beeldrand. Onvoldoende: "er is een schaduw" — een schaduw is geen laag | home 11 vlakken in 6 van 9 secties voor > 25% op een beeld; B2 2 in 2 van 11 |
| `B-03` | Is de relatie tussen tekst en beeld sterk? | zegt de tekst iets over **dít** beeld; zou een ander beeld uit de voorraad even goed passen. Onvoldoende: "het is sfeerbeeld" | op 4 van de 5 papieren pagina's stond de sitebrede voetfoto (batterijkasten) op een pagina over zonnepanelen, EMS of vastgoed |
| `B-04` | Is de schermbreedte zinvol gebruikt? | wat er in de buitenste 15% links en rechts gebeurt op 1774px. In CANVAS MODE is lege buitenmarge over de volle sectiehoogte NEE; in DOCUMENT MODE JA mits gedeclareerd | — (de maat zit in `A-01`: mediane werkbreedte < 80,0% vw @1774 = FAIL; home 90,5%, B2 68,1%) |
| `B-05` | Is de leegte beheerst? | ligt de leegte op gekozen plekken of overal evenveel; is er één plek waar het ontwerp bewust niets doet. Onvoldoende: leegte die ontstond doordat de inhoud korter was dan het vak | master S6: rechterhelft bleef leeg, bandhoogte met de hand van 17,7 naar 13,6cqw verlaagd |
| `B-06` | Is er een herkenbare Vibe-signatuur? | zou je de sectie **zonder logo** als Vibe herkennen: scherpe hoek (31,6–36,2°), de snede die de sectiegrens **is**, type op beeldpixels, handgezette regelval. Onvoldoende: "de kleuren zijn blauw" | een geometrie-element onder de weegvloer van `A-06` (≥ 0,5% sectievlak / ≥ 5% beeldrechthoek) bestaat voor deze vraag niet |
| `B-07` | Heeft de sectie een ander silhouet dan de secties ernaast? | leg drie opeenvolgende fragmenten naast elkaar en kijk alleen naar de **buitenvorm**: waar begint en eindigt de inhoud, waar zit de dominante zone, hoe hoog is de sectie. Onvoldoende: "de kleuren verschillen"; gelijke buitenvorm met andere grond = NEE | — |

Twee procedurele eigenschappen van `§6.4` die mee moeten in de afhandeling: `B-03` en `B-07` werden
**op de papieren schets** gesteld (R1, vóór code), en het gewicht was *"≥ 2 × NEE op één sectie → de
sectie terug; ≥ 1 × NEE op `B-06` → de pagina terug"* (r. 4937).

### 7.15.3 Afhandeling — zeven criteria, zeven uitkomsten, geen onbesliste

| oud | uitkomst | waarheen |
|---|---|---|
| `B-01` | **OPGENOMEN IN `RQ-01`** | `RQ-01` / `R-01` HOOFDROLDOMINANTIE |
| `B-02` | **OPGENOMEN IN `RQ-05`** | `RQ-05` / `R-05` HECHTING TEGEN RASTER, met machinevloer `KP-06` |
| `B-03` | **OPGENOMEN ALS NIEUWE VRAAG `RQ-08`** | nieuwe vraag binnen de canonieke laag; exacte code in `§7.15.4` |
| `B-04` | **OPGENOMEN IN `RQ-04`** | `RQ-04` / `R-04` BEDOELDE SMALHEID, met machinevloer `A-01` + `DG-01` |
| `B-05` | **OPGENOMEN IN `RQ-09`** | `RQ-09` LEEGTE MET EIGENAAR — canoniek, maar nog niet door het harnas uitgegeven; promotie in `§7.15.4` |
| `B-06` | **OPGENOMEN IN `RQ-06`** | `RQ-06` / `R-06` EIGEN VIBE-IDENTITEIT |
| `B-07` | **SUPERSEDED** | gedekt door MACHINE-regels `A-03` (compositiesignatuur), `C-01` (splitsingsclusters, τ = 2,0pp) en `KP-05` (herhaalde drieling) |

**`B-01` → `RQ-01`.** Beide vragen of er één dominante hoofdrol is of twee elementen om de hoofdrol
concurreren. `RQ-01`'s FAIL-voorwaarde is letterlijk *"twee elementen van vergelijkbaar gewicht zonder
rangorde"* — dat is `B-01`'s onvoldoende antwoord "kop en beeld zijn even belangrijk". De kruiscontrole
met de meting die `B-01` als enige toevoegde, zit in `R-01`: het bewijs is `dominant_pct` en
`grootste_gat` uit de desktopmeting, en de valse-negatiefclausule beschrijft precies de divergentie
meting-versus-oog ("een groot leeg achtergrondbeeld haalt een hoge `dominant_pct` terwijl er niets te
zien is"). `R-01` is strikter dan `B-01`: het eist naast de hoofdrol ook **de verliezer** en dominantie
via **twee routes**. Niets van `B-01` valt weg.

**`B-02` → `RQ-05`.** De kern van `B-02` — liggen vlakken óp beeld of staat alles in één laag — is
exact de vraag van `RQ-05`: *"Hangt een vlak aan iets, of zweeft het in een raster?"* `R-05` eist dat
elke gedeclareerde hechting aanwijsbaar is als **overlap, gedeelde rand of kruising van de naad** (dat
is `B-02`'s "kruist iets een beeldrand") en noemt als valse negatief: *"een vlak dat alleen een effen
achtergrondkleur overlapt wordt geteld als `OP-BEELD`. Overlap met niets is geen hechting"* — dezelfde
gedachte als `B-02`'s "een schaduw is geen laag". De meetwaarde die `B-02` als context meegaf, heeft
nu twee machinehouders: `KP-06 HECHTING` op de kaart (vloer `max(2, ⌈n/4⌉)` secties met een hechting,
gate r. 146–152) en `A-02` middel (c) op de render (informatievlak ≥ 30.000px² @1774, ≥ 50% op
beeldpixels, contrast ≥ 2,2:1). `B-02` voegt daar niets toe wat `RQ-05` niet vraagt.

**`B-03` → NIEUWE VRAAG.** Dit is het enige oude criterium dat de canonieke laag **niet** dekt, en de
canonieke laag sluit het zelfs expliciet uit. `RQ-02`/`R-02` is de **ruiltest**: inhoud wisselen, beeld
en structuur houden. `B-03` is de **omgekeerde** ruil: inhoud houden, beeld wisselen. `R-02` noemt die
omkering letterlijk als valse negatief: *"de reviewer rekent het verwisselen van de foto zelf als
structurele breuk"* — binnen `R-02` is de beeldwissel dus geen geldig antwoord. `RQ-07`/`R-07` vraagt
of het beeld de sectie **draagt**, niet of het dit specifieke beeld móét zijn: een volbleed beeld dat
de structuur draagt haalt `R-07` ook als het over het verkeerde onderwerp gaat. De machinekant dekt
alleen identiteit en klasse, niet onderwerpsbinding: `A-08` vangt duplicaatnaam, klasse-D en hetzelfde
bestand twee keer op één pagina (gemeten: 36 bestanden, ~27 verschillende opnamen, zes duplicaatparen),
maar niet dat een batterijkastfoto onder een zonnepaneeltekst staat. Het gemeten defect (4 van de 5
papieren pagina's) is reëel en onbedekt. Daarom behouden, als `RQ-08`.

**`B-04` → `RQ-04`.** `B-04` vraagt naar de buitenste 15% op 1774px en onderscheidt CANVAS van
DOCUMENT. `RQ-04` vraagt: *"Is de smalheid van deze sectie bedoeld voor de compositie, of is zij het
gevolg van een container die zijn maximum raakt?"* `R-04` draagt beide helften van `B-04`: de
modusvoorwaarde (PASS vereist dat de kaart `DOCUMENT` of `HYBRID` declareert) en de eis dat de
reviewer benoemt **wat de buitenrand vasthoudt** bij de extra 480px — `B-04`'s "daar staat marge" is
in `R-04` precies het ongeldige antwoord. Daarbovenop is de maatkant in de canonieke laag sterker dan
in `B-04`: `A-01` meet mediane werkbreedte < 80,0% vw @1774 (home 90,5%, B2 68,1%) en `DG-01` vangt de
bevroren zware sectie over de drie posten 1440/1774/1920, waar `B-04` maar één breedte kende.

**`B-05` → `RQ-09`.** `B-05` ("ligt de leegte op gekozen plekken of ontstond zij omdat de inhoud korter
was dan het vak") en `RQ-09 LEEGTE MET EIGENAAR` ("is het grootste lege veld een gecomponeerd interval,
of restruimte die ontstond doordat een element niet meegroeide") zijn dezelfde vraag; `RQ-09` is
scherper omdat hij een meetbare FAIL heeft (*het gat groeit met vrijwel de volle viewportwinst terwijl
niets die ruimte gebruikt*) en een bewijsbron (`grootste_gat` bij 1440 en 1920). `B-05`'s gemeten
voorbeeld — S6, bandhoogte met de hand van 17,7 naar 13,6cqw — is een geldig `RQ-09`-PASS-antwoord.
**Waarschuwing bij deze uitkomst:** `RQ-09` staat in het document, niet in `REVIEWERVRAGEN`. Zolang dat
zo is, stelt het pakket de vraag niet en is de inhoud van `B-05` canoniek maar **niet uitgegeven**.
`§7.15.4` geeft daarom de promotieregel. Dat is geen nieuwe vraag en geen nieuwe laag: het is een
bestaande canonieke vraag die haar harnascode krijgt.

**`B-06` → `RQ-06`.** `RQ-06`: *"Herkent de reviewer de pagina als Vibe zónder dat zij de homepage
nadoet?"* `R-06` eist ≥ 2 dragers van de identiteit die geen kopie van een homepagepatroon zijn én
≥ 2 structurele verschillen met de homepagereeks, met `XP-01`/`XP-02`/`XP-03` als machineflank.
`B-06`'s concrete dragerlijst (hoekfamilie 31,6–36,2°, de snede die de sectiegrens **is**, type op
beeldpixels, handgezette regelval) is een geldige invulling van "dragers van de identiteit" en blijft
als voorbeeldenlijst bruikbaar — maar niet als zelfstandige grond. `B-06`'s extra gewicht (één NEE =
hele pagina terug) is in de canonieke laag niet verzwakt maar verbreed: `§7.9 §2.1` punt 2 stelt dat
**één** FAIL op `R-01`…`R-13` `GOEDGEKEURD` verhindert. Het verschil `B-06`-is-zwaarder vervalt dus
omdat álle vragen dat gewicht hebben.

**`B-07` → SUPERSEDED.** `B-07` is als enige een pure buitenvormvergelijking tussen aangrenzende
secties, en die is machinaal gedekt — op drie plaatsen, waarvan twee met een gemeten marge:
`A-03` vergelijkt per opeenvolgend paar de compositiesignatuur (modus · zijde van de dominante zone
L/M/R · lichtste-zijdecluster op 2,0pp · kaderclusterindex op 2,0% vw) en faalt bij een identieke
signatuur; op de master vuurt die toets in **0 van 7** opeenvolgende paren met een marge van 4,6pp
(kleinste verandering S5→S6 = 6,6pp), terwijl de negen 50/50-flexrijen van SYSTEEM-X in **8 van 8**
paren identiek zijn. `C-01` doet hetzelfde met clusters en τ = 2,0pp. Op de kaart, dus vóór code,
doet `KP-05 HERHAALDE DRIELING` het op de sleutel `impact|blueprint|pattern|visual_role` met eis 0
herhalingen (gate r. 133–140) — dat vervangt `B-07`'s rol op de papieren schets. `KP-03 IMPACTRITME`
verbiedt bovendien twee aangrenzende `HIGH`-secties. Een menselijk silhouetoordeel voegt hier geen
informatie toe die de signatuur niet al scheidt; `B-07` blijft dus niet als vraag bestaan.
Wat `B-07` wél raakte en wat géén silhouettoets is — het gedrag van de **naad** tussen twee secties —
is apart canoniek belegd in `R-08 OVERGANGSWAARHEID`.

### 7.15.4 Gevolgen voor de tekst van dit document

Besluitpunt 2 eist dat wat blijft, gemarkeerd is. Gemeten plaatsen waar `B-`codes vandaag normatief
gewicht dragen, met de vereiste behandeling:

| plaats | regels | behandeling |
|---|---|---|
| `§6.4 DEEL B` (definitie van de zeven, wie/wanneer/vorm/gewicht) | 4920–4951 | kopnoot **SUPERSEDED / NIET-NORMATIEF — afgehandeld in `§7.15`**; de tabel blijft als historische index met per rij de uitkomst uit `§7.15.3`. De gewichtsregel op r. 4937 vervalt; het gewicht is `§7.9 §2.1` punt 2 |
| `§6.8.3` NVT-tabel, rij `B-01…B-07` | 5197 | lees `RQ-01…RQ-07` (+ `RQ-08`); de inhoud blijft ongewijzigd geldig — N.V.T. = **nooit**, een onbeantwoorde vraag is `ONBEANTWOORD` en geen PASS (canoniek: `NIET GEDRAAID`, `§7.9 §1.6`) |
| `§7.13` H6-matrix, rij `B-01`…`B-07` → `REVIEWER` | 7276 | lees `RQ-01…RQ-07` (+ `RQ-08`); evaluator en grond blijven: een mens, niet de bouwer |
| `§7.13` H6-matrix, rij `A-04` (`MACHINE+REVIEWER`, grond noemt `B-01`) | 7271 | lees `RQ-01` |
| `§7.13` DEEL-1-tekst "voor `A-08, A-09, B-01…B-07, …` staat daar **nooit**" | 7205 | lees `RQ-01…RQ-07` (+ `RQ-08`) |
| `§7.14` rij `T-2` = OPEN | 7399, 7404 | `T-2` wordt **GESLOTEN** met verwijzing naar `§7.15`; `INTERNE TEGENSTRIJDIGHEDEN OPEN` gaat van **4** naar **3** (`T-3`, `T-5`, `T-7`) |
| `§7.12` ("zeven vragen", "gemeten omvang 85 regels") | 6946, 6959 | beide uitspraken worden onjuist zodra `§7.15.4`-code is toegepast. De nieuwe regelomvang is **NIET GEMETEN** in deze sessie en moet opnieuw worden geteld na de wijziging |

`T-3` (codenaamruimtebotsingen) wordt hierdoor **niet** groter: `RQ-` was al een vrije reeks en er
komt geen nieuwe prefix bij.

### 7.15.5 Blok voor het harnas — exacte code

Twee regels erbij in `REVIEWERVRAGEN` (`docs/qa/composition-gate.mjs` r. 297–305). `pakket()` r. 368
itereert over de hele lijst, dus beide verschijnen automatisch in `--packet`; er is geen tweede
wijziging nodig.

**(a) Nieuwe vraag — `RQ-08 BEELDGEBONDENHEID` (afhandeling van `B-03`).**

```js
  { code: 'RQ-08', vraag: 'Zegt de tekst van deze sectie iets over DIT beeld, of zou een ander bestand uit de voorraad op deze plek even goed passen? (omgekeerde ruiltest: inhoud blijft, beeld wisselt)', fail: 'het beeld is uitwisselbaar zonder dat een woord of een compositiebesluit verandert; of hetzelfde bestand staat elders op de site onder een ander onderwerp' },
```

De documenthelft, in de vorm van `R-01`…`R-13`:

> #### `R-14` BEELDGEBONDENHEID — de omgekeerde ruiltest *(nieuw; afhandeling van `B-03`)*
>
> - **Te inspecteren bewijs** — `section-<nn>-<naam>-1774.png` van elke sectie met een beeldhoofdrol;
>   uit de kaart `asset_ref`, `asset_class`, `media_treatment`, `protagonist` en `purpose` van die
>   sectie plus `declared_files` van de pagina; `docs/data/vibe-site-register.json` voor het sitebrede
>   gebruik van hetzelfde bestand.
> - **Vraag** — Zegt de tekst van deze sectie iets over **dít** beeld, of zou een ander bestand uit de
>   voorraad op deze plek even goed passen?
> - **PASS** — de reviewer noemt (i) minstens één **zichtbaar** kenmerk van dit beeld waaraan de tekst,
>   de uitsnede of een vlak vastzit, **en** (ii) minstens één ander bestand uit de voorraad dat op deze
>   plek niet werkt, met de reden waarom.
> - **FAIL** — de beeldwissel is verliesloos: geen woord en geen compositiebesluit verandert; **of**
>   hetzelfde bestand staat elders op de site onder een ander onderwerp (de gemeten sitebrede voetfoto
>   op vier van vijf papieren pagina's); **of** het antwoord is "het is sfeerbeeld".
> - **Toepassingsgebied** — alleen secties met `protagonist` ∈ {`foto`, `gebouwd-object`,
>   `technische-compositie`} óf `media_treatment` ∈ {`M1`, `M2`, `M4`, `M5`}. Elders `NVT` met de
>   NVT-regel van de poort (reden **en** een vervangende eis die zelf in PASS of FAIL eindigt).
> - **Valse positief** (regel keurt onterecht af) — een bewust generieke systeemsectie met een neutraal
>   steunbeeld (FAQ, voorwaarden) waarin het beeld per ontwerp verwisselbaar is; die valt buiten het
>   toepassingsgebied. Of: een voorraad die maar één geschikt bestand bevat, waardoor eis (ii) niet te
>   beantwoorden is — dat is `NIET GEDRAAID — voorraad te klein`, geen FAIL.
> - **Valse negatief** (regel laat onterecht door) — de reviewer leest de binding uit de kaart
>   (`purpose`, `asset_ref`) in plaats van uit het beeld; dat schendt `M1` en maakt het antwoord
>   `ONGELDIG`. Of: de naam van het bestand past bij het onderwerp terwijl de **opname** iets anders
>   toont — zes duplicaatparen in de assetvoorraad bewijzen dat de naam geen bewijs is.
> - **Wanneer** — `RQ-08` is ook op de papieren schets te stellen (stap `S1`, vóór code), op
>   `asset_ref` + schets. Dat is de plaats die `B-03` innam.

**(b) Promotie, geen nieuwe vraag — `RQ-09` krijgt zijn harnascode (afhandeling van `B-05`).**

```js
  { code: 'RQ-09', vraag: 'Is het grootste lege veld in deze sectie een gecomponeerd interval, of restruimte die ontstond doordat een element niet meegroeide?', fail: 'het gat groeit met vrijwel de volle viewportwinst terwijl niets die ruimte gebruikt; of de leegte valt precies tussen twee dingen die bij elkaar horen' },
```

Vraag en FAIL-voorwaarde zijn **letterlijk** overgenomen uit `RQ-09` (`§7.9 DEEL 2`, r. 6576–6583); er
is niets nieuw bedacht. De code `RQ-09` is gekozen zodat `RQ-nn` en `R-nn` één-op-één blijven lopen,
zoals `RQ-01`…`RQ-07` ↔ `R-01`…`R-07` dat al doen.

**Nummering — afwijking van de opdracht, met reden.** De opdracht zei: nummer nieuwe vragen door
vanaf `RQ-08`. Gemeten belemmering: `R-08`…`R-13` bestaan al in `§7.9 DEEL 2` (r. 6567–6619:
`R-08` OVERGANGSWAARHEID · `RQ-09` LEEGTE MET EIGENAAR · `R-10` BEWIJSRANGORDE · `R-11` CTA-ZWAARTEPUNT ·
`R-12` GEOMETRIE DOET WERK · `R-13` GELIJK REGISTER OF UITGEPUT REPERTOIRE). `RQ-08` aan een nieuwe
vraag geven zou binnen de canonieke laag `RQ-08` ≠ `R-08` maken en daarmee `T-3` vergroten. Daarom:
`RQ-08` en `RQ-09` zijn in deze ronde uitgegeven; `RQ-10` is de eerste vrije code. Wil de
opdrachtgever letterlijk `RQ-08`, dan is de enige wijziging de codestring in blok (a) — maar dan moet
`R-08` eerst worden omgenummerd.

### 7.15.6 De gezagsorde als procedure

Vier lagen. Per laag: wie levert aan, wie beslist, wat de uitgang is, wat er bij FAIL gebeurt. De
lagen hangen op de bestaande stappen `S1`…`S7` van `§7.9 §1.3`; er komt geen stap bij.

#### `L1` · NORMATIEVE V1.3-REGELS UIT DE VISUELE TAAL — hoogste gezag

| | |
|---|---|
| **INGANG** | de ontwerpvraag: archetype, variant, hoofdrol, inhoudsvoorraad |
| **LEVERANCIER** | dit document: `H3`–`H6` (`A-`, `C-`, `D-`, `E-`, `F-`, `W-`, `MC-`, `BR-`) en `H7` |
| **BESLISSER over de inhoud van `L1`** | de opdrachtgever (`E`) in een **documentronde**. Nooit het harnas, nooit de auteur in een bouwronde |
| **UITGANG** | de regel met zijn klasse (`A`/`B`/`C`/`D`) en zijn evaluator uit `§7.13` |
| **FAIL op `L1`** | twee normatieve regels spreken elkaar tegen, of de regel ontbreekt. Dat is een `IC`-post (`§7.8`), niet een bouwfout: de bouw stopt, de documentronde beslist. Een `IC` mag **nooit** door een harnasuitslag worden beslecht |
| **Botsing met lagere lagen** | `L1` wint altijd. Wijkt de poort af van een normatieve regel, dan wordt **de poort** gecorrigeerd, niet de regel. Een `NIET GEMETEN` drempel in `L1` wordt géén poort maar een reviewvraag (zoals `C-07`, `§6.5.8`) |

#### `L2` · DE UITVOERENDE GEAUTOMATISEERDE POORT

| | |
|---|---|
| **INGANG** | `docs/compositions/<kaart>.json` + alle andere kaarten (voor `XP-01`…`XP-03`) + `docs/data/vibe-site-register.json`; voor de desktopmeting: de **lokaal geserveerde** pagina |
| **LEVERANCIER / OPERATOR** | rol `P`. **Claude mag dit**, als operator — een meting bedienen is geen smaakoordeel vellen |
| **BESLISSER** | het script. De operator mag een uitslag niet herformuleren |
| **UITGANG** | gate-rapport: `KP-01`…`KP-12` + `XP-01`…`XP-03` met per regel uitkomst, gemeten waarde en eis, plus één eindregel: `AFGEKEURD` / `ONTWERP OK — CONTENT/ASSET PENDING` / `ONTWERP OK — WACHT OP VISUELE REVIEW`. Desktoprapport: per sectie `DG-01`, `DG-02-reviewervraag`, `DG-03` bij 1440/1774/1920 |
| **FAIL op `L2`** | één `FAIL` ⇒ terug naar `S1` (kaart herzien). **Geen implementatie, geen bewijsproductie, geen reviewpas.** `L3` start niet |
| **Script kan niet draaien** | `NIET GEDRAAID` met reden (bijvoorbeeld `Playwright niet beschikbaar`), **nooit** `PASS` en nooit `FAIL`. De desktopgovernance van die pagina blijft open en `L4` kan niet `GOEDGEKEURD` geven |
| **Grens naar `L3`** | `L2` mag een `L3`-vraag niet beantwoorden. `KP-06` leest **dat** de kaart een hechting declareert; of de implementatie hem waarmaakt is `RQ-05`. `DG-01` stelt vast dat een zware sectie bevroren is; of die smalheid bedoeld is, is `RQ-04`. `grootste_gat` is een machinegetal; het woord *bedoeld* komt uit `RQ-09`/`RQ-09` |

#### `L3` · HET CANONIEKE VISUELE-REVIEWPAKKET

| | |
|---|---|
| **INGANG** | **uitsluitend** de uitvoer van `node docs/qa/composition-gate.mjs --packet <kaart>` en de bewijsset onder `review/<slug>/` (slot `M1`: niet de kaartmotivatie, niet het ontwerpgesprek) |
| **VOORWAARDE OM TE STARTEN** | `L2` staat op `ONTWERP OK …` **en** de bewijsset is volledig. Ontbreekt bewijs bij een breedte, dan is die rij `NIET GEDRAAID — bewijs ontbreekt`. Gemeten vandaag: **nul** bestanden met `1920` in de naam onder `review/`, en **nul** sectieafbeeldingen bij 1440 of 1920 — de 1920-kolom staat voor elke pagina op `NIET GEDRAAID` |
| **LEVERANCIER / BESLISSER** | rol `V`, een mens of een expliciet opgedragen aparte pas — **niet de bouwer**, **niet dezelfde schrijfpas** (slot `M3`) |
| **UITGANG** | per vraag `RQ-01`…`RQ-07` (en `RQ-09`/`RQ-08` zodra opgenomen): `PASS` / `FAIL` / `NIET GEDRAAID — <reden>`, elk met **minstens één bestandsnaam en één breedte** (slot `M5`), plus het desktopinvulblad van `§7.9 §3.5` per `HIGH`-sectie |
| **FAIL op `L3`** | één `FAIL` ⇒ geen `GOEDGEKEURD`. De pas **rapporteert en stopt** (slot `M4`); de auteur beslist over scope. De reviewpas repareert niets en wijzigt geen bestand behalve het pasverslag (slot `M2`) |
| **Antwoord zonder bewijsverwijzing** | `NIET GEDRAAID`, nooit `PASS` |
| **Antwoord in dezelfde beurt als de compositie** | `ONGELDIG`; telt in het eindoordeel als `FAIL`. **Dit is de regel die Claude bindt.** Gemeten beperking: het harnas handhaaft dit niet — `pakket()` drukt de waarschuwing af (r. 371), er is geen gate-regel die een ingevuld verdict afkeurt. `M3` is dus een **procedureel** slot, geen machineslot |

#### `L4` · EINDGOEDKEURING DOOR EEN MENS

| | |
|---|---|
| **INGANG** | de uitgangen van `L2`, `L3` en de content/claim-pas (`S6`, rol `C`) |
| **BESLISSER** | rol `E` — de mens die in dát bericht opdracht geeft. **Claude nooit** |
| **UITGANG** | één regel: `GOEDGEKEURD` / `AFGEKEURD` / `GEBLOKKEERD OP <wat>`, met datum, kaart, bewijsset en de pas-id's in de vorm `<rol>:<datum>/<kaart>/<bewijsset>` |
| **FAIL op `L4`** | één openstaande `FAIL`, `ONGELDIG` of `NIET GEDRAAID` ⇒ **geen** `GOEDGEKEURD`. `CONFLICTING` op een claim ⇒ `AFGEKEURD` |
| **Niet-bezetting** | wie `E` per ronde vult, is een besluit van de opdrachtgever; dit model legt geen naam vast (`§7.9`, openstaande post 3). Zonder bezette `E` bestaat `GOEDGEKEURD` niet en blijft de hoogste haalbare stand `ONTWERP OK — WACHT OP VISUELE REVIEW` — gemeten vandaag voor **8 van 8** kaarten |

**Wat Claude in deze keten mag.** `S1` kaart schrijven · `S3` implementeren · `S4` bewijs produceren ·
`L2` bedienen als operator · `L1` een tegenstrijdigheid **voorleggen**. Wat Claude niet mag: `L3`
invullen in dezelfde pas als het schrijven, en `L4` ooit.

### 7.15.7 Wat deze paragraaf niet doet

Zij voegt geen reviewlaag toe: de oude laag wordt afgehandeld, niet naast de canonieke gezet. Zij
verandering geen drempel, geen τ, geen maatvloer en geen machineregel. Zij wijzigt geen
productiebestand. Zij bezet rol `E` niet. Zij meet geen nieuwe waarde: elk getal hierboven is
overgenomen uit een regel die in deze sessie is gelezen, met de vindplaats erbij.

**Telling.** 7 oude criteria → **5 OPGENOMEN** (`B-01`→`RQ-01`, `B-02`→`RQ-05`, `B-04`→`RQ-04`,
`B-05`→`RQ-09`, `B-06`→`RQ-06`) · **1 NIEUW** (`B-03`→`RQ-08`) · **1 SUPERSEDED** (`B-07`, door `A-03`,
`C-01`, `KP-05`). Onbeslist: **0**.

**NIET GEDRAAID in deze sessie, met reden:**
`node docs/qa/composition-gate.mjs --zelftest` · `--packet <kaart>` ·
`node docs/qa/desktop-governance.mjs <basis> <pagina>` · `node docs/qa/id-integriteit.mjs` —
de opdracht van deze ronde was uitsluitend lezen en vastleggen, en geen van de vier is nodig om een
gezagsbesluit uit te schrijven. Er staat in deze paragraaf daarom **geen enkele uitslag** van die
commando's. Evenmin gemeten: de nieuwe regelomvang van `--packet` na opname van `RQ-09` en `RQ-08`
(`§7.12` noemt 85 regels voor `control-a-premium`; dat getal geldt voor de lijst van zeven).

---


## 7.16 · `T-5` — `VAR-07` GESPLITST, VIJF DREMPELS OP `CALIBRATION PENDING`

> Deze paragraaf sluit `T-5` (`C-07` heet een poort en is er geen) en geeft dezelfde behandeling aan
> elke andere regel in dat geval. Zij wijzigt **geen** productiebestand en **geen** bestand onder
> `docs/`; zij legt een status, een voorlopige regel en een ijkcontract vast.
>
> **Het besluit van de opdrachtgever dat hieraan voorafgaat.** Het stelsel mag niet geblokkeerd
> blijven omdat een ijkpagina nog niet bestaat. Een toekomstige ijkafhankelijkheid is **geen interne
> tegenstrijdigheid** zolang de procedure eenduidig is: zolang elke pagina vandaag een uitkomst
> krijgt zonder dat één ongemeten getal in die uitkomst voorkomt.

---

### 7.16.1 Wat `C-07` werkelijk vraagt — drie takken, niet één

`§6.5.8` schrijft één `PASS`-regel die bij nadere lezing **drie onafhankelijke eisen** bevat, met
drie verschillende grootheden en drie verschillende ijkbehoeften. Die samenvoeging is de oorzaak van
`T-5`: twee takken zijn ongeijkt, de derde is dat niet, en omdat zij in één regel staan is de hele
regel als ongeijkt geboekt.

| tak | eis zoals zij er staat | grootheid | eenheid | meetmethode | drempel geijkt? |
|---|---|---|---|---|---|
| **1 kadertak** | ≥ **0,40 × n** kaderclusters die op geen eerdere pagina voorkomen | nieuwe kaderclusters ÷ n pagina's | dimensieloze fractie | `C-02`-meting (breedte van het buitenste kader dat de inhoud begrenst, px @1774), clustering met enkelvoudige koppeling op **τ = 2,0% vw = 35,5px @1774** — τ ligt in een gemeten gat (1,18% "hetzelfde" ÷ 2,03% "verschillend", `§6.5.3`) | **NEE — 0,40 is NIET GEMETEN** |
| **2 kopgraadtak** | ≥ **0,30 × n** kopgraadclusters idem | nieuwe kopgraadclusters ÷ n pagina's | dimensieloze fractie | `C-03`-meting (gerenderde graad van elke `H1`/`H2` @1774, `H1` op `tagName`), clustering op **τ = ratio 1,07** — τ ligt in een gemeten gat (1,046 ÷ 1,080, `§6.5.4`) | **NEE — 0,30 is NIET GEMETEN** |
| **3 bestandstak** | geen beeldbestand op > **1** pagina | aantal pagina's per beeldbestandspad | stuks | verzamelingsdoorsnede van de beeldbestandspaden van twee pagina's | **N.V.T. — 1 is een definitie, geen ijking** |

**De meetinstrumenten voor tak 1 en 2 bestaan; hun uitslag niet.** τ is in beide gevallen wél geijkt
— dat is het precieze punt dat `§6.5.8` onderbelicht laat. Ongeijkt is uitsluitend de **fractie**.

**Waarom tak 1 en 2 nog niet geijkt konden worden — gemeten, niet aangenomen.**

| voorwaarde voor een ijking | gemeten stand | meting |
|---|---|---|
| ≥ 2 pagina's die aan de cross-paginatoetsen meedoen (`S3-32`: alleen pagina's mét `composition_card`) | **1 van 48** | `docs/data/vibe-site-register.json`, veld `totals.with_composition_card` |
| die tweede pagina mag niet de referentievingerafdruk zelf zijn | de enige gemapte pagina **is** `index.html`, status `GEMETEN EN GEMAPT — referentievingerafdruk` | register, `pages[].measurement_status` |
| een opgeslagen gerenderde maatmeting per pagina om clusters uit te rekenen | **bestaat niet** — `docs/data/` bevat uitsluitend het register; de uitslag van `desktop-governance.mjs` wordt niet in de repo bewaard (bevestigd in `§7.9` DEEL 1 §1.5: *"script aanwezig; uitslag niet in de repo opgeslagen"*) | `ls docs/data/` = 1 bestand |
| de B2-kandidaat als tweede pagina gebruiken | **kan niet**: `systeem-energieopslag.html` draagt `composition_card: null`, `governance_status: LEGACY`, `measurement_status: NIET GEMIGREERD / REVIEW NIET VEREIST VOOR FREEZE` → onder `S3-32` buiten de cross-paginascope | register |
| de acht bestaande compositiekaarten gebruiken | **kan niet**: 1 van 8 draagt status `MASTER` (`homepage.json` → `index.html`), de overige **7** dragen status `CONTROL` met een `page`-veld `control:*` — geen paginadocument, en onder `§6.0` regel 3 uitdrukkelijk uitgesloten van de cross-paginatoetsen | `docs/compositions/*.json`, veld `status` en `page` |

Er is dus niets verzuimd: **er bestaat vandaag geen tweede in aanmerking komende pagina.** Dat is een
voorraadtoestand, geen regelfout.

**Wat wél bestaat, en waarom het de ijking niet vervangt.** Onder `review/` staan vier bewijssets,
waaronder `review/b2-energy-storage-master-v2/` met `full-1774.png` en **acht** per-sectie-afdrukken
@1774 — vormelijk precies de `S4`-uitgang die een ijking nodig heeft. De pagina waar dat bewijs bij
hoort is echter de hierboven genoemde `LEGACY`-pagina zonder kaart. Bewijs zonder kaart is geen
ijkbasis.

---

### 7.16.2 `CALIBRATION PENDING` — de status, en waar zij in het bestaande vocabulaire hangt

`CALIBRATION PENDING` is **geen nieuwe uitkomst** en verruimt `§7.9` DEEL 1 §1.6 niet. Het is een
**status van een drempel**, niet van een pagina. Een pagina eindigt onverminderd in `PASS`, `FAIL`,
`NVT`-met-reden-en-vervanger, `NIET GEDRAAID` of `ONGELDIG`.

| | |
|---|---|
| **waarop zij hangt** | één getal in één regel — nooit op een regel als geheel en nooit op een pagina |
| **wat zij betekent** | het getal is `NIET GEMETEN`, en de meting die het zou ijken kan **uitsluitend empirisch op een nog niet bestaande geïmplementeerde pagina** worden gedaan |
| **verhouding tot `§3.0.1` klasse `D` GEZETTE ONDERGRENS** | `D` zegt *"gezet omdat er een grens nodig is, mét de reden en met de review die hem moet bevestigen → ja, voorlopig poort"*. `CALIBRATION PENDING` is de **procedurele uitwerking** van dat "voorlopig": welke meting, op welke pagina, met welk bewijs, door welke rol, en wat er bij falen vervalt. Elke `CALIBRATION PENDING`-drempel is een `D`-grens; niet elke `D`-grens is `CALIBRATION PENDING` (zie `§7.16.9`) |
| **verplicht gevolg** | de regel draagt een **voorlopige regel** die vandaag een uitkomst oplevert **zonder de ongemeten drempel te gebruiken**. Een `CALIBRATION PENDING`-regel zonder voorlopige regel is geen regel maar een gat, en dat is wat `T-5` was |
| **wat zij nooit mag doen** | de freeze blokkeren, een pagina `AFGEKEURD` geven op grond van een ongemeten getal, of als `PASS` worden geboekt omdat zij niet gedraaid is (`§6.2` punt 4: *"NIET GEMETEN is geen uitkomst"*) |
| **wie haar opheft** | uitsluitend **E**, met pas-id (`§7.9` DEEL 1 §1.2) |

**De drie eisen aan een voorlopige regel.** (i) Zij gebruikt geen getal dat niet gemeten is.
(ii) Zij is deterministisch: elke in aanmerking komende pagina krijgt vandaag een uitkomst.
(iii) Zij is **monotoon zwakker dan of gelijk aan** de geijkte regel — zij mag nooit een pagina
afkeuren die de geijkte regel zou goedkeuren. De asymmetrie is bewust: een voorlopige regel mag
achteraf te mild blijken, nooit achteraf onrechtvaardig.

---

### 7.16.3 Het besluit over `C-07` — splitsing in `VAR-07a` en `VAR-07b`

`C-07` wordt gesplitst langs de scheidslijn die `§7.16.1` meet. De naam `C-07` blijft bestaan als
koepel, zodat de 15 bestaande verwijzingen in dit document niet bungelend worden.

#### `VAR-07a` · BEELDBESTAND-UNICITEIT OVER PAGINAGRENZEN — **poort, vanaf nu**

| | |
|---|---|
| **Meting** | per pagina de verzameling beeldbestandspaden: `asset_ref` van elke sectie van de compositiekaart, verenigd met `canonical_asset` van die pagina in het register |
| **Vergelijkingsverzameling** | elke andere pagina in de cross-paginascope — de scope die het harnas al gebruikt: kaarten met status `MASTER`, `PAPER` of `MIGRATED`, zichzelf uitgesloten (`docs/qa/composition-gate.mjs:455`) |
| **PASS** | de doorsnede met elke andere pagina is leeg |
| **FAIL** | ≥ 1 gedeeld bestandspad, zonder in de kaart genoemde reden |
| **NVT** | 0 `asset_ref` én geen `canonical_asset` → `NVT` met reden "0 beelden", vervanger **A-02-V** (`§6.8.3`), conform `S3-33` |
| **Drempel** | **1 pagina. Dat is een definitie, geen ijking** — er is geen getal dat gemeten moet worden voordat deze tak kan draaien |
| **Klasse** | **A** op de vorm, **MACHINE** als evaluator |
| **Verhouding tot `D-06`** | strikt sterker: `D-06` eist ≤ 1 pagina per **klasse-A**-bestand; `VAR-07a` eist het voor **elk** bestand. `D-06` blijft als afzonderlijke toets bestaan, want hij draagt de klasseverificatie die `VAR-07a` niet doet |
| **Verhouding tot `KP-10`** | `KP-10` FOTOBUDGET telt unieke bestanden **binnen** één kaart. Er is vandaag geen toets die bestanden **tussen** kaarten vergelijkt. `VAR-07a` vult precies dat gat |

**Gemeten uitkomst van `VAR-07a` vandaag — en zij is geen `PASS`.** Doorsnede van de `asset_ref`-
verzamelingen van de acht kaarten:

| paar | doorsnede | binnen de scope van `:455`? | uitkomst |
|---|---|---|---|
| `vrij-b-systeemgestuurd` ∩ `homepage` | **1** bestand: `assets/energieopslag-hero.jpg` | **ja** (`homepage` = `MASTER`) | **FAIL** |
| `control-a-premium` ∩ `control-c-kloon` ∩ `vrij-b-systeemgestuurd` | `assets/kantoor-hero.jpg` (3 kaarten) | nee — alle drie `CONTROL` | buiten scope |
| `schaarste-b2` ∩ `vrij-a-mediagestuurd` | `assets/logistiek-hero.jpg` | nee — beide `CONTROL` | buiten scope |
| `control-a-premium` ∩ `vrij-c-bewijsgestuurd` | `assets/projects/dormio.jpg` | nee — beide `CONTROL` | buiten scope |
| 11 pagina's met `canonical_asset` in het register | 11 waarden, **11 uniek, 0 duplicaten** | nee — geen van de 11 draagt een kaart | niet toetsbaar onder `S3-32` |

Dat `VAR-07a` bij invoering onmiddellijk één `FAIL` oplevert op een kaart die vandaag `0 FAIL` scoort,
is het bewijs dat de tak iets meet wat nog niet gemeten werd. **De toets is nog niet in
`composition-gate.mjs` geïmplementeerd**; de uitkomst hierboven is in deze sessie met een eenmalig
leesscript over `docs/compositions/*.json` gemeten. Als harnastoets is `VAR-07a` dus
**NIET GEDRAAID — niet geïmplementeerd**, en dat is uitdrukkelijk geen `PASS`.

**Eén precisering van de meetmethode, gemeten.** `VAR-07a` meet **bestandspad**-identiteit. Dat is niet
hetzelfde als **opname**-identiteit. Gemeten voorbeeld: `assets/projects/ratio-16.jpg`
(md5 `1eb1402859fe7c0f58ab180d4dc3dd8d`, 558.252 bytes) en `assets/projects/ratio16.jpg`
(md5 `5e16c719f4c59f26f7e086e4fc984319`, 1.835.968 bytes) zijn twee paden, **niet** byte-identiek, en
of het dezelfde opname is kan een hash niet uitmaken. Daarom: pad-identiteit en hash-identiteit zijn
`MACHINE`, opname-identiteit blijft `REVIEWER` — precies de scheiding die `D-03` al maakt tussen
"dubbele bestanden" en "dubbele opnamen". `VAR-07a` claimt alleen het machinale deel.

#### `VAR-07b` · MAATHERKOMST OVER PAGINAGRENZEN — **`CALIBRATION PENDING`, met voorlopige regel**

| | |
|---|---|
| **Status van 0,40 en 0,30** | `CALIBRATION PENDING` — `NIET GEMETEN`, ijkbaar uitsluitend op een toekomstige geïmplementeerde gemapte pagina (`§7.16.6`) |
| **Voorlopige regel (niet-blokkerend, geldt vandaag)** | de kaart draagt een **herkomsttabel**: elke kaderclusterwaarde en elke kopgraadcluster van de pagina krijgt exact één merk — `VAN DE MASTER` · `VAN PAGINA <pad>` · `NIEUW OP DEZE PAGINA`. **PASS** = de tabel is volledig (0 clusters zonder merk) **én** er is **≥ 1** cluster met merk `NIEUW OP DEZE PAGINA` in **elk van de twee soorten**. **FAIL** = een onvolledige tabel, of 0 nieuwe clusters in één van de twee soorten |
| **Getallen in de voorlopige regel** | **≥ 1** en **0**. Beide zijn `S3-00`-grendels (de lege-verzamelingsgrendel), geen geijkte drempels. Er komt geen enkel getal in voor dat niet gemeten is |
| **NVT-regels** | < 3 koppen op de pagina → de kopgraadtak is `NVT` met de eigen `N.V.T.`-reden van `C-03`, vervanger = de kadertak alleen. Alle secties `CANVAS` zonder kader → de kadertak is `NVT` met de `N.V.T.`-reden van `C-02`, vervanger = de kopgraadtak alleen. **Beide** → `FAIL` met reden "niet meetbaar", conform het precedent van `C-01` (`§6.5.2`), nooit `PASS` |
| **n = 1** | is er geen eerdere pagina, dan is `VAR-07b` `NVT` met reden "geen tweede pagina in de cross-paginascope", vervanger = `XP-01v EIGEN VINGERAFDRUK` (≥ 3 verschillende blauwdrukken) — dezelfde vervanger die het harnas vandaag gemeten voor `XP-01` uitgeeft op `homepage` |
| **Evaluator** | **MACHINE** op de volledigheid van de tabel en op de clusterberekening zodra de meting is opgeslagen; **REVIEWER** (`V`) op de juistheid van elk merk — een merk `NIEUW` dat in werkelijkheid een mastermaat is, is een `FAIL` van de kaart, niet van de poort |
| **Klasse** | **A** op de vorm (een herkomsttabel is altijd op te stellen), `CALIBRATION PENDING` op de fractie |

De oude formulering van `§6.5.8` — *"tot de eerste ijking een reviewvraag, niet een poort"* — vervalt
hiermee. De reviewvraag was: *"welke maat op deze pagina komt niet van de homepage, en waarom die?"*
Die vraag blijft, maar zij is nu **een veld met een gedwongen uitkomst** in plaats van een open vraag
zonder verdict. Dat is het hele verschil tussen een reviewvraag en een poort.

---

### 7.16.4 Waarom `VAR-07b` vandaag niet zwakker is dan de ongeijkte regel — nagerekend

Dit is het argument dat `T-5` werkelijk sluit: de voorlopige regel is voor de eerstvolgende twee
gemapte pagina's **bewijsbaar identiek** aan de regel zoals die er met de ongemeten getallen staat.

`≥ 0,40 × n` en `≥ 0,30 × n` zijn eisen aan een **geheel** aantal clusters. Afgerond naar de
eerstvolgende haalbare telling:

| n (pagina's in de cross-paginascope) | kadertak `0,40 × n` | eist minstens | kopgraadtak `0,30 × n` | eist minstens |
|---:|---:|---:|---:|---:|
| 1 | 0,40 | — (`NVT`, geen eerdere pagina) | 0,30 | — (`NVT`) |
| **2** | 0,80 | **1 cluster** | 0,60 | **1 cluster** |
| **3** | 1,20 | 2 clusters | 0,90 | **1 cluster** |
| 4 | 1,60 | 2 clusters | 1,20 | 2 clusters |

**Gevolg, en dit is de kern.** `VAR-07b`'s voorlopige regel ("≥ 1 nieuwe cluster per soort") is
**exact gelijk** aan de geschreven `C-07` bij `n = 2` op beide takken, en nog steeds exact gelijk bij
`n = 3` op de kopgraadtak. Gemeten stand vandaag: **n = 1**. De eerstvolgende gemapte pagina brengt
`n` op 2 — en dan geven de voorlopige en de geschreven regel **hetzelfde verdict**, zonder dat 0,40
of 0,30 ergens in de berekening voorkomt. De takken beginnen pas te divergeren bij de **derde**
gemapte pagina (kadertak) respectievelijk de **vierde** (kopgraadtak).

Daaruit volgt de uiterste termijn van de ijking, en die is nu een getal in plaats van "later":
**de ijking moet gedraaid zijn vóór de derde gemapte pagina `GOEDGEKEURD` kan worden.** Tot dat
moment is er geen enkel scenario waarin een pagina een andere uitkomst krijgt dan onder de geijkte
regel. Het stelsel is dus niet geblokkeerd en ook niet verzwakt — het is voor twee pagina's
aantoonbaar onverschillig voor de ijking.

---

### 7.16.5 Dekken `XP-01`…`XP-03` de zorg van `C-07` al? — eerlijk, met meting

`changelog §5` blokkade `B3` heet *"De homepagekloon komt erdoor"* en eist twee dingen:
`C-07` tot poort maken **en** het siteregister aanleggen. Het register is er (48 pagina's,
`docs/qa/bouw-register.mjs`). De vraag is of de rest van `B3` al door een ander mechanisme gedekt is.

**Gemeten, `node docs/qa/composition-gate.mjs`** — 8 kaarten, **120 regeluitkomsten, 8 FAIL**,
48 pagina's in het register, 0 zonder `governance_status`:

| kaart | `XP-01` KLOON | `XP-02` HIGH-PATROON | `XP-03` HOOFDROLPATROON |
|---|---|---|---|
| `control-a-premium` | PASS — 0 assen boven 60% | PASS — 0 | PASS |
| `control-b-generiek` | PASS — 0 assen | PASS — 0 | PASS |
| **`control-c-kloon`** | **FAIL — 7 assen boven 60%** | **FAIL — 1 kaart identiek** | PASS — 1 kaart (eis ≤ 1) |
| `homepage` | `NVT` — geen andere kaart om tegen te vergelijken; vervanger `XP-01v` PASS (9 blauwdrukken) | PASS — 0 | PASS |
| `schaarste-b2`, `vrij-a`, `vrij-b`, `vrij-c` | PASS — 0 assen (4 van 4) | PASS — 0 (4 van 4) | PASS (4 van 4) |

**Wat dit wél bewijst.** De scheiding is maximaal: **6 kaarten op 0 assen, de kloon op 7 van 7.**
Elke drempel tussen 1 en 7 geeft hetzelfde verdict, dus `XP-01` is op deze verzameling niet
drempelgevoelig en de gedeclareerde homepagekloon **komt er niet door**. De aanleiding van `B3` is op
de declaratielaag gedekt, en dat is een echt resultaat.

**Wat dit niet bewijst, en dit moet er even hard staan.** `XP-01` vergelijkt zeven assen die alle uit
de **kaart** komen: `impact` · `blueprint` · `visual_role` · `media_treatment` · `geometry_role` ·
`protagonist` · `transition` (`composition-gate.mjs:238-248`). Geen van die zeven assen is een
**gerenderde maat**. De drie grootheden van `C-07` — kaderbreedte in px @1774, kopgraad in px @1774,
beeldbestand — komen in `XP-01` niet voor, in `XP-02` niet en in `XP-03` niet.

Het gemeten bewijs van `B3` zelf benoemt precies die laag: *"kloon behoudt 9/9 sectieposities, 6/6
beeldbehandelingen, **9/9 kaders, 8/8 kopgraden**, 14/14 hoekwaarden"*. De twee vetgedrukte posten
zijn de twee takken van `VAR-07b`. Een pagina die zeven **verschillende** kaartassen declareert en
vervolgens de negen kaderbreedtes en acht kopgraden van de master rendert, haalt `XP-01`, `XP-02` én
`XP-03` en wordt door niets tegengesproken.

Daar komen drie gemeten beperkingen bij:

1. **De vergelijkingsverzameling is vandaag één kaart.** `:455` filtert op status `MASTER`, `PAPER`
   of `MIGRATED`; gemeten zijn dat **1 van 8** kaarten. De drie `XP`-toetsen vergelijken dus
   feitelijk alleen tegen de homepage — toevallig exact de `C-07`-reviewvraag, maar niet omdat de
   regel dat voorschrijft.
2. **`XP-01` op de master zelf is `NVT`**, gemeten, met `XP-01v` als vervanger. Een cross-paginatoets
   die op de referentiepagina structureel `NVT` is, kan de referentie niet beschermen.
3. **`XP-01`…`XP-03` staan in de uitvoer van `node docs/qa/id-integriteit.mjs` onder "harnascodes
   zonder definitie in de docs"** (die run is overigens `FAIL` op `duplicaten + bungelend + ambigu =
   252`). Het harnas draait toetsen die dit document niet normatief definieert — dat is `T-2`, niet
   `T-5`, en wordt hier niet gesloten.

**Conclusie, zonder verzachting.** `XP-01`…`XP-03` dekken de **declaratielaag** van de zorg van
`C-07`; zij dekken de **gerenderde maatlaag** niet. `VAR-07a` en `VAR-07b` zijn dus geen duplicaat van de
`XP`-reeks en vervallen niet omdat die reeks bestaat. Omgekeerd is `B3` niet langer een blokkade:
zijn aanleiding is gedekt, zijn register is gebouwd, en zijn resterende helft heeft nu een procedure.

---

### 7.16.6 Het ijkcontract — wat, waar, welk bewijs, wie, en wat bij falen

Dit contract geldt voor **elke** `CALIBRATION PENDING`-drempel in `§7.16.8`; de kolom "ijkpagina"
daar vult alleen de plaats in.

#### (a) WAT er gemeten wordt

| | |
|---|---|
| **grootheid `IJK-01`** | `nieuwe_kaderclusters ÷ n` — dimensieloze fractie, twee decimalen |
| **grootheid `IJK-02`** | `nieuwe_kopgraadclusters ÷ n` — dimensieloze fractie, twee decimalen |
| **meetmethode** | `node docs/qa/desktop-governance.mjs <basis> <pagina>` bij **1774px**, voor de nieuwe pagina **én** voor `index.html`, in één bewijsset; daarna de clustering uit `§6.5.3` (τ = 35,5px @1774) respectievelijk `§6.5.4` (τ = ratio 1,07) over de **vereniging** van beide paginawaarden; `n` = het aantal pagina's in het register met `composition_card ≠ null` en `page_class = PAGINA` |
| **wat `n` niet is** | `n` is **niet** 48 en niet het aantal `.html`-bestanden. `NIET-PAGINA` (gemeten 4 van 48) en `SERVICEPAGINA` (1 van 48) komen onder `§6.0` regel 3 niet in de cross-paginatoetsen voor |
| **uitvoer** | één regel per tak: `tak · n · nieuwe clusters · fractie · verdict onder de gezette drempel · verdict onder de voorlopige regel`. **Beide** verdicten worden geboekt, zodat zichtbaar is of de ijking de uitkomst verandert |

#### (b) OP WELKE eerste in aanmerking komende geïmplementeerde pagina

De ijkpagina is de **eerste** pagina die aan alle vijf voorwaarden voldoet; alle vijf zijn uit het
register of uit de bewijsset te lezen, geen van de vijf is een oordeel:

| # | voorwaarde | leesbaar uit |
|---|---|---|
| 1 | `page_class = PAGINA` | register |
| 2 | `composition_card ≠ null`, en de kaart valideert tegen `docs/schema/composition-card.schema.json` | register + `KP-01` |
| 3 | `measurement_status = GEMETEN EN GEMAPT` — dus **niet** `— referentievingerafdruk`, want de master is geen tweede pagina | register |
| 4 | de pagina is geïmplementeerd en het `S4`-bewijs bestaat: `review/<slug>/full-1774.png` plus per-sectie-afdrukken @1774 | bestandsbestaan |
| 5 | de pagina draagt ≥ 3 koppen **en** ≥ 1 kader, anders is de betrokken tak `NVT` en levert die pagina geen ijking | `desktop-governance.mjs`-uitslag |

**Gemeten vandaag: 0 van 48 pagina's voldoen** (voorwaarde 2 wordt door 1 pagina gehaald, en die
faalt voorwaarde 3). De ijkpagina is dus **de tweede gemapte pagina**, welke dat ook wordt. De ijking
wordt bij `n = 2` geboekt als **`B` REFERENTIEBEREIK** — `§6.2` zegt al wat daarvoor geldt:
*"geijkt op ten hoogste twee gemeten pagina's → wordt poort mét de marge erbij en de verplichting
opnieuw te ijken na de derde pagina"*. Er wordt hier dus geen nieuwe procedure uitgevonden; de
bestaande wordt aangewezen.

#### (c) WELK bewijs aanvaardbaar is

**Aanvaardbaar:**
- de `desktop-governance.mjs`-uitslag @1774 van **beide** pagina's, als JSON in één bewijsset onder
  `review/<slug>/` — en vanaf nu **opgeslagen**, want dat is het gat uit `§7.9` DEEL 1 §1.5;
- `review/<slug>/full-1774.png` plus de per-sectie-afdrukken @1774 (`S4`);
- de clusterberekening als **reproduceerbaar script** onder `docs/qa/`, dat de twee fracties uit die
  JSON leest — geen handtelling;
- de compositiekaart van de nieuwe pagina, schemavalide;
- een pas-id in de vorm `<rol>:<datum>/<kaart>/<bewijsset>` (`§7.9` DEEL 1 §1.2).

**Niet aanvaardbaar, met reden:**
- een handgetelde clustertabel — `W-2` eist enkelvoudige koppeling; dat is een algoritme, geen
  oogmaat;
- een meting op een andere breedte dan 1774px — beide τ zijn op 1774 geijkt;
- een meting op een pagina zonder kaart (`S3-32`), of op een `control:*`-kaart (`§6.0` regel 3);
- een berekening uit waarden die elders in dit document zijn **opgeschreven** in plaats van in de
  bewijsset zijn **gemeten**. *Illustratie, uitdrukkelijk als afgeleid gemarkeerd en geen ijking:*
  de in `§6.5.4` opgeschreven kopgraden van de master (8 waarden) en van de B2-kandidaat (10 waarden)
  leveren bij gezamenlijke clustering op τ = 1,07 **6 clusters, waarvan 3 uitsluitend B2** → fractie
  `3 ÷ 2 = 1,50`, en bij per-pagina-clustering met representantmatching **ook 3**. Dat is een
  rekenoefening op reeds opgeschreven getallen, niet opnieuw gerenderd, en de betrokken pagina is
  `LEGACY` zonder kaart. **Deze uitkomst mag niet als ijking worden geboekt**, en zij staat hier
  alleen omdat zij het gat in `§7.16.7` blootlegt;
- een pas die naar een niet-bestaande bewijsset verwijst → uitkomst `NIET GEDRAAID` (`§7.9` §1.2).

#### (d) WIE het reviewt — rollen uit `§7.9` DEEL 1 §1.1, geen persoonsnaam

| rol | handeling in de ijking | mag niet |
|---|---|---|
| **A** AUTEUR | levert de kaart (`S1`), de implementatie (`S3`), het bewijs (`S4`) en het ijkscript | de eigen ijkuitkomst visueel goedkeuren; de drempel bijstellen (`M4`: geen eigen reparatie) |
| **P** POORT (operator) | draait `desktop-governance.mjs`, de gate en het ijkscript; geeft beide fracties en **beide** verdicten uit (`S2`) | een meting als smaakoordeel presenteren |
| **V** VISUELE REVIEWER | vult in een **aparte, expliciet opgedragen** reviewpas (`S5`) de herkomsttabel en toetst elk merk tegen het bewijs; leest uitsluitend `--packet` en de bewijsset (`M1`) | tijdens de pas een bestand wijzigen (`M2`); in dezelfde beurt als de compositie antwoorden (`M3` → `ONGELDIG`) |
| **C** CONTENT/CLAIM-REVIEWER | **niet betrokken** — `C-07` raakt geen cijfer en geen claim in de copy | — |
| **E** EINDGOEDKEURDER | stelt de geijkte drempel vast, verwerpt haar, of boekt `GEBLOKKEERD OP <wat>` (`S7`); is de enige die `CALIBRATION PENDING` opheft | goedkeuren zonder uitgang van `P` en `V`; een drempel vaststellen zonder pas-id |

Een drempel zonder pas-id is geen drempel. Een `CALIBRATION PENDING`-regel die zonder `E`-pas naar
poort wordt gepromoveerd, is `ONGELDIG` en telt in het eindoordeel als `FAIL`.

#### (e) WAT er gebeurt als de ijking FAALT

Drie onderscheidbare faalwijzen, elk met een eigen gevolg. In **alle** drie blijven `VAR-07a` en de
voorlopige regel van `VAR-07b` onverkort staan — dat is de reden dat een mislukte ijking het stelsel
niet opnieuw blokkeert.

| faalwijze | wat er is gebeurd | wat **vervalt** | wat **blijft** | wie beslist |
|---|---|---|---|---|
| **F-a NIET UITVOERBAAR** | bewijs onvolledig, script draait niet, of de pagina haalt voorwaarde 5 niet (< 3 koppen of 0 kaders) | **niets**. Uitkomst = `NIET GEDRAAID` **met reden**, nooit `PASS` | `VAR-07a` als poort; `VAR-07b` voorlopige regel; de drempels blijven `CALIBRATION PENDING`. De eerstvolgende in aanmerking komende pagina wordt de nieuwe ijkpagina | **P** meldt, **E** boekt |
| **F-b GEMETEN, MAAR DE FRACTIE LIGT ONDER DE GEZETTE DREMPEL** | de twee pagina's lijken sterker op elkaar dan 0,40 / 0,30 toelaat | de **getallen 0,40 en 0,30 vervallen**. Zij waren nooit gemeten; één paginapaar maakt er geen grens van. De meting wordt geboekt als **`C` PAGINAPAAR-SPECIFIEK** (`§3.0.1`) | `VAR-07a`; `VAR-07b` voorlopige regel blijft de werkende regel; de ijking schuift naar het derde paginapaar | **E**, op voordracht van **V** |
| **F-c GEMETEN EN REPRODUCEERBAAR, MAAR DE DREMPEL KEURT DE MASTER OF DE EERSTE GEMIGREERDE PAGINA AF** | de grens is onhaalbaar voor het bestaande werk | de **drempelwaarde** vervalt. De drempel wordt **niet** afgezwakt om de pagina te laten passeren — dat is exact `V1.2`'s fout, zie `DR-Q-07` en `DR-S-02` (*"afzwakken betekent dat de regel op de master is gefit"*) | `VAR-07a`; `VAR-07b` voorlopige regel; de regelvorm. `A` mag de regel niet zelf bijstellen (`M4`) | **E** |

**Wat er gebeurt als de ijking wél lukt en strenger blijkt dan de voorlopige regel.** De geijkte
drempel geldt **vanaf haar pas-id** en werkt **niet terug**. Elke pagina die onder de voorlopige
regel al `GOEDGEKEURD` is, komt op een hertoetslijst (voorgesteld registerveld `c07_hertoets: true`);
of die hertoets scope is, beslist **E**. Een goedkeuring wordt niet ingetrokken op grond van een
getal dat ten tijde van die goedkeuring niet bestond — anders is de voorlopige regel geen regel maar
een val.

---

### 7.16.7 Eén meetmethodegat dat vóór de eerste ijking gedicht moet worden

`§6.5.8` zegt *"kaderclusters die op geen eerdere pagina voorkomen"* en definieert **niet** wat
clusteridentiteit **over** een paginagrens is. Er zijn minstens twee uitwerkingen:

| uitwerking | hoe | bezwaar |
|---|---|---|
| **(i) gezamenlijke clustering** | cluster de **vereniging** van alle paginawaarden met enkelvoudige koppeling op τ; een cluster is "nieuw" als hij uitsluitend waarden van de nieuwe pagina bevat | enkelvoudige koppeling over een vereniging kan clusters door een tussenliggende waarde laten **samensmelten** die per pagina gescheiden waren — het aantal nieuwe clusters kan dan dalen door een waarde van de **oude** pagina |
| **(ii) per-pagina clustering + representantmatching** | cluster elke pagina apart; een cluster van de nieuwe pagina is "nieuw" als geen representant van een eerder cluster binnen τ ligt | matchingkeuze (dichtstbijzijnde, gemiddelde, uiterste) verandert de uitkomst; τ-overdracht tussen clusters is niet hetzelfde als τ binnen een cluster |

In het afgeleide voorbeeld van `§7.16.6` (c) vallen beide uitwerkingen op **3**. Dat is één geval en
**bewijst niet** dat zij in het algemeen samenvallen. Daarom: **de ijkprocedure legt uitwerking (i) of
(ii) vast vóór de eerste meting**, en het ijkscript implementeert er precies één. Een ijking waarvan
de clusterdefinitie pas na de meting wordt gekozen, is niet reproduceerbaar en daarmee
`NIET GEDRAAID`. Dit gat is **nieuw vastgesteld in deze ronde** en was geen onderdeel van `T-5`.

---

### 7.16.8 De andere regels in hetzelfde geval — `IJK-01` … `IJK-05`

Gezocht met `grep` op `NIET GEMETEN`, `GEZET`, `TE IJKEN`, `ijking` en `tot de eerste ijking` over
`docs/`. **Toelatingstoets:** (a) de drempel is `NIET GEMETEN`, **en** (b) de ijking kan uitsluitend
empirisch op een nog niet bestaande geïmplementeerde pagina. Vier regels halen beide eisen, met vijf
drempels.

De codereeks is **`IJK-`** + twee cijfers, naar het huisgebruik van de nieuwe driedomeinreeksen
(`CAN-`, `MED-`, `SUR-`, `GEO-`, `REL-`, `TYP-`, `GOV-`). Gemeten: `IJK-` heeft vóór deze paragraaf
**0 treffers** in `docs/`, dus geen botsing met de twaalf reeksen van `T-3`. De reeks staat nog
**niet** in `REEKSEN` van `docs/qa/id-integriteit.mjs`; zonder die ene regel volgt het
id-integriteitsharnas deze codes niet. Dat toevoegen is een losse opdracht en is hier **NIET
GEDRAAID**.

| code | regel | gezette drempel | grootheid · eenheid | meetmethode | ijkpagina (eerste in aanmerking komende) | voorlopige, niet-blokkerende regel | bij FALEN: vervalt / blijft |
|---|---|---|---|---|---|---|---|
| **`IJK-01`** | `VAR-07b` kadertak (`§6.5.8`) | **0,40 × n** | nieuwe kaderclusters ÷ n · fractie | `C-02`-meting @1774, clustering τ = 35,5px, over de vereniging met elke eerdere gemapte pagina | **tweede gemapte pagina** (gemeten: 1 van 48 gemapt, en dat is de master) | herkomsttabel volledig **én** ≥ 1 kadercluster `NIEUW OP DEZE PAGINA`. Bewijsbaar identiek aan 0,40 × n bij n = 2 | vervalt: de waarde 0,40 · blijft: `VAR-07a`, de herkomsttabelplicht, de regelvorm |
| **`IJK-02`** | `VAR-07b` kopgraadtak (`§6.5.8`) | **0,30 × n** | nieuwe kopgraadclusters ÷ n · fractie | `C-03`-meting @1774, clustering τ = ratio 1,07, idem | idem `IJK-01` | idem, op de kopgraadtak. Bewijsbaar identiek aan 0,30 × n bij n = 2 **en** n = 3 | vervalt: de waarde 0,30 · blijft: idem |
| **`IJK-03`** | `DR-S-05` leesmaat in DOCUMENT MODE (`§3.3`, `§3.5`) | **60–75 tekens** — het document noemt haar zelf *"GEZET, niet gemeten"* | langste regel lopende tekst · tekens (`ch`) | gerenderde regellengte in `ch` @1774 van het langste lopende tekstblok in een `DOCUMENT`-sectie | **de eerste gebouwde `REG-5`-pagina** — het document wijst die zelf aan. De master heeft **0** `DOCUMENT`-secties; zijn gemeten caps zijn 34–52ch op leads en kaartbody's, een andere grootheid | de sectie declareert een cap in `ch` in de CSS **en** die cap staat in de kaart. `PASS` = cap aanwezig en gedeclareerd; `FAIL` = geen cap of niet gedeclareerd. Geen getal | vervalt: de band 60–75 · blijft: de capplicht en de declaratieplicht |
| **`IJK-04`** | `DR-S-06` regelafstand lopende tekst (`§3.3`, `§3.5`) | **`lh` 1,55–1,70** — `GEZET`; de gemeten band is **1,276–1,450** over 7 van 7, maar op leads van ≤ 20 woorden | `lh ÷ graad` · dimensieloze ratio | gerenderde `line-height ÷ font-size` van het langste lopende tekstblok @1774 | idem `IJK-03` ("idem" in `DR-S-06`) | de ratio staat **buiten** de gemeten leadband 1,276–1,450, en de kaart noemt de reden. `PASS`/`FAIL` op een **gemeten** band, niet op de gezette | vervalt: de band 1,55–1,70 · blijft: de eis dat lopende tekst een andere ratio draagt dan een lead, mét reden |
| **`IJK-05`** | `D4` doorlopende drager van een register (`§1.2`, `R3`, `§7.13` 2.5) | **drager over ≥ 60% van de sectiehoogte** — `TE IJKEN`; het gemeten precedent (`.vh-proc`, 2px `::before` op `left:17px`) is een **mobiele tijdlijn**, geen desktopregister | dragerhoogte ÷ sectiehoogte · fractie | gerenderde hoogte van het doorlopende element ÷ sectiehoogte @1774 | **de eerste gebouwde registersectie op desktop** (`REG-1`/`REG-4`); `R3` vraagt expliciet of één drager twintig FAQ-paren samenbindt — dat is op geen bestaande pagina te zien | de sectie draagt **≥ 1** doorlopend element dat alle items raakt (binair: raakt het eerste en het laatste item, ja/nee). `PASS`/`FAIL`, geen fractie | vervalt: de 60% · blijft: de eis van één doorlopende drager, en `R3` als reviewervraag |

**Telling: 4 regels, 5 drempels, en `C-07` hoort erbij met 2 van de 5.** `IJK-01` en `IJK-02` zijn de
twee `C-07`-takken; de derde `C-07`-tak wordt `VAR-07a` en is géén `IJK`-regel, want haar drempel is
een definitie.

---

### 7.16.9 Wat er **niet** in deze lijst hoort — met de reden, zodat het niet terugkomt

`§1.4.3` noemt **5** waarden *"TE IJKEN vóór het een poort is"*. Drie daarvan zijn **niet**
`CALIBRATION PENDING`, want zij falen eis (b): zij zijn **vandaag** meetbaar op bestaand werk. Zij
krijgen een eigen, scherpere status — `MEETBAAR NU — NIET GEDRAAID` — en die status is géén excuus om
te wachten.

| waarde | wat het document zegt | waarom geen `CALIBRATION PENDING` | status |
|---|---|---|---|
| `#44` / `DR-V-42` geometrie-minimum **5% masker / 0,5% sectievlak** | *"de ijking (6% / 0,72%) is door mij NIET GEMETEN"* | de ijking is een meting op **`index.html`**, een pagina die bestaat. Er is geen toekomstige pagina nodig | **MEETBAAR NU — NIET GEDRAAID**: één `desktop-governance`-run plus oppervlakberekening op de master |
| `#58` regellengte desktop **46–62ch** / de `ch→px`-factor voor Urbanist | *"de gerenderde ijking is NIET GEMETEN"*; *"een rekening die in de browser moet worden gedraaid vóór L1 een poort wordt"* | de factor is een **fonteigenschap**, meetbaar in één browserrun op bestaande pagina's | **MEETBAAR NU — NIET GEDRAAID** |
| de **gewogen overlapdrempel** van `§1.4.1` (3) — bovenvlak ≥ 2,5% sectievlak, overlap ≥ 8px op beide assen | *"de masterwaarden onder de gewogen definitie zijn NIET GEMETEN … GRENS TE IJKEN"* | de masterwaarden zijn op `index.html` te meten | **MEETBAAR NU — NIET GEDRAAID** |

Twee andere waarden uit die lijst van vijf vallen af om een **andere** reden: hun drempel is wél uit
een meting afgeleid, alleen uit één pagina.

| waarde | gemeten grond | status |
|---|---|---|
| `#11` kaderverschil ≥ **1,0% vw** | master-minimumgat **1,18%**, stagger **0,68%** — gemeten | **`B` → `A` onder de bestaande procedure** van `§6.2`: geijkt op ≤ 2 pagina's, dus poort mét marge en de verplichting opnieuw te ijken na de derde pagina. Geen nieuwe procedure nodig |
| `#36` informatievlak ≥ **2,5% sectievlak** | master-minimum **3,38%**, schijnvlak **2,31%** — gemeten | idem |

En één regel die in dezelfde adem genoemd werd maar het **niet meer** is:

| regel | eerdere status | gemeten stand |
|---|---|---|
| `D-06` beeldbudget over de site | `§6.8.3`: *"het siteregister bestaat niet → NIET MEETBAAR"* | **achterhaald**. Het register bestaat: 48 pagina's, `with_composition_card = 1`, `without_measurement_status = 0`, 11 pagina's met een benoemd `canonical_asset` waarvan **11 van 11 uniek en 0 duplicaten**. `D-06` is `MACHINE` geworden. Dit is het precedent dat `§7.16` draagt: een ijkafhankelijkheid wordt opgeheven door infrastructuur te bouwen, niet door de regel te schrappen |

**Dat is de volledige verzameling.** Van de in deze ronde gevonden ongeijkte drempels zijn er 5
`CALIBRATION PENDING`, 3 `MEETBAAR NU — NIET GEDRAAID`, 2 onder de bestaande `B`-procedure, en 1
opgeheven. Er blijft geen restcategorie "later".

---

### 7.16.10 Wat hieruit volgt als tekstwijziging — voorgesteld, **niet uitgevoerd**

Geen van de volgende wijzigingen is in deze ronde aangebracht; dit is de lijst die nodig is om het
document met zichzelf te laten overeenstemmen.

| plaats | huidige tekst | wat er moet komen |
|---|---|---|
| `§6.5.8` rij **Bewijs** | *"daarom is C-07 tot de eerste ijking een reviewvraag, niet een poort"* | de splitsing `VAR-07a` (poort, drempel = definitie) / `VAR-07b` (`CALIBRATION PENDING` met voorlopige regel). De formulering "geen poort" vervalt |
| `§6.5.8` rij **Klasse** | *"0,40 / 0,30 = NIET GEMETEN"* | *"0,40 / 0,30 = `CALIBRATION PENDING` (`IJK-01`, `IJK-02`); bestandstak = **A**, drempel is een definitie"* |
| `§6.8.3` rij `C-07` | *"tot de eerste ijking: reviewvraag, geen poort"* | `VAR-07a`: `NVT` alleen bij 0 beelden → vervanger `A-02-V`. `VAR-07b`: `NVT` alleen bij n = 1 → vervanger `XP-01v`; bij < 3 koppen of 0 kaders de enkeltakvervangers uit `§7.16.3` |
| `§7.13` DEEL 2 §2.3 rij `C-07` | *"klasse C · REVIEWER · tot de eerste ijking uitdrukkelijk een reviewvraag"* | `VAR-07a`: klasse **A**, **MACHINE**. `VAR-07b`: klasse **A** op de vorm, **MACHINE+REVIEWER**, drempel `CALIBRATION PENDING` |
| `§7.13` DEEL 2 §2.5 rij `C-07` | *"heet poort en is er geen"* | *"gesplitst: `VAR-07a` poort, `VAR-07b` `CALIBRATION PENDING` met voorlopige regel"* |
| `OPENSTAANDE TEGENSTRIJDIGHEDEN` rij `T-5` | **OPEN** — *"reparatieopdracht en doc spreken elkaar tegen"* | **GESLOTEN — `CALIBRATION PENDING`**. `changelog §5` `B3` eiste *"`C-07` tot poort maken en het siteregister aanleggen"*: het register is er, de bestandstak wordt poort, de kloon valt gemeten op `XP-01`/`XP-02`, en de twee ongemeten fracties hebben een ijkcontract met een voorlopige regel die tot `n = 2` hetzelfde verdict geeft |
| `§7.14` regel over `T-5` | *"`grep -c "C-07"` = 14"* | gemeten in deze sessie: **15 regels / 19 treffers** in `docs/04-visual-language-v1.3.md`; **105** treffers in `docs/`, waarvan **4** uit `DR-C-07` — een ander domein, en daarmee een instantie van `T-3` |
| `docs/qa/composition-gate.mjs` | geen cross-paginabestandstoets | `VAR-07a` implementeren naast `XP-01`…`XP-03`, met de scope van `:455`. **Niet gedaan** — buiten de opdracht van deze ronde |
| `docs/qa/id-integriteit.mjs` | `REEKSEN` kent `IJK-` niet | één regel `{ re: /\bIJK-\d{2}\b/g, wat: 'ijkcontracten', dom: 'IJK' }`. **Niet gedaan** |

---

### 7.16.11 Wat deze paragraaf niet doet

- Zij **meet geen ijking**. `IJK-01` t/m `IJK-05` zijn na deze paragraaf nog steeds ongeijkt; dat is
  de bedoeling, want de ijkpagina bestaat niet en er is geen pagina gebouwd om hem te laten bestaan.
- Zij **implementeert `VAR-07a` niet** in het harnas. De gemeten `FAIL` op
  `vrij-b-systeemgestuurd` ∩ `homepage` komt uit een eenmalig leesscript in deze sessie, niet uit een
  poortrun. Als harnastoets is `VAR-07a` **NIET GEDRAAID — niet geïmplementeerd**.
- Zij **lost `T-2` niet op** (het harnas draait `XP`- en `RQ`-codes die dit document niet definieert;
  gemeten in de `id-integriteit`-uitvoer) en `T-3` niet (twaalf botsende codereeksen). Zij voegt één
  reeks toe die aantoonbaar niet botst.
- Zij **wijzigt geen productiebestand**: geen `.html`, `.css`, `.js` in de webroot, geen `assets/`,
  en ook geen bestand onder `docs/`. De gate-, register- en id-runs in deze paragraaf zijn
  leesopdrachten.

---

### 7.16.12 Meetbijlage — elke in deze paragraaf gebruikte waarde, met haar bron

| meting | commando / bron | uitkomst |
|---|---|---|
| kaarten, regeluitkomsten, FAIL | `node docs/qa/composition-gate.mjs` | **8 kaarten · 120 regeluitkomsten · 8 FAIL**; 48 pagina's in het register · 0 zonder `governance_status` |
| `XP-01` per kaart | idem | 6 kaarten **0 assen** boven 60% · `control-c-kloon` **7 assen** (FAIL) · `homepage` **`NVT`** met vervanger `XP-01v` PASS (9 blauwdrukken) |
| `XP-02` / `XP-03` | idem | `XP-02`: 1 FAIL (`control-c-kloon`), 7× 0 kaarten. `XP-03`: 8× PASS |
| cross-paginascope | `docs/qa/composition-gate.mjs:455` | kaarten met status `MASTER` · `PAPER` · `MIGRATED`, zelf uitgesloten |
| kaartstatussen | `docs/compositions/*.json`, velden `status` en `page` | **1 `MASTER`** (`homepage.json` → `index.html`, 9 secties) · **7 `CONTROL`** met `page`-veld `control:*` |
| register, totalen | `docs/data/vibe-site-register.json`, `totals` | 48 `html_files` · `PAGINA` 43 / `NIET-PAGINA` 4 / `SERVICEPAGINA` 1 · `MASTER` 1 / `LEGACY` 42 / `NIET-PAGINA` 4 / `SERVICE-MINIMAAL` 1 · **`with_composition_card` 1** · `classifiable` 48 · `without_measurement_status` 0 |
| de enige gemapte pagina | register, `pages[]` | `index.html`, `B1`, `GEMETEN EN GEMAPT — referentievingerafdruk`, kaart `docs/compositions/homepage.json` |
| B2-kandidaat | register, `pages[]` | `systeem-energieopslag.html`, `B2`, `LEGACY`, `NIET GEMIGREERD / REVIEW NIET VEREIST VOOR FREEZE`, `composition_card: null`, 10 secties, 8 beelden |
| `canonical_asset` | register | **11** pagina's dragen er een · **11 van 11 uniek · 0 duplicaten** |
| `asset_ref`-doorsnede | eenmalig leesscript over `docs/compositions/*.json` in deze sessie | `vrij-b-systeemgestuurd` ∩ `homepage` = **1** (`assets/energieopslag-hero.jpg`) → `VAR-07a` FAIL. Buiten de scope: `kantoor-hero.jpg` in 3 kaarten, `logistiek-hero.jpg` in 2, `projects/dormio.jpg` in 2 |
| pad- versus opname-identiteit | `md5`, `ls -l` | `assets/projects/ratio-16.jpg` `1eb1402859fe7c0f58ab180d4dc3dd8d` (558.252 B) ≠ `assets/projects/ratio16.jpg` `5e16c719f4c59f26f7e086e4fc984319` (1.835.968 B) |
| bewijssets | `ls -R review/` | 4 sets; `b2-energy-storage-master-v2` bevat `full-1774.png` + **8** per-sectie-afdrukken @1774 |
| opgeslagen maatmeting | `ls docs/data/` | **1** bestand (het register). Geen opgeslagen `desktop-governance`-uitslag — bevestigt `§7.9` DEEL 1 §1.5 |
| id-integriteit | `node docs/qa/id-integriteit.mjs` | **FAIL** — `duplicaten + bungelend + ambigu = 252`; `XP-01`…`XP-03`, `KP-01`, `KP-02`, `KP-10`…`KP-12`, `RQ-01`…`RQ-07`, `VR-F` staan onder "harnascodes zonder definitie in de docs" |
| `C-07`-treffers | `grep` over `docs/` | **15 regels / 19 treffers** in `04-visual-language-v1.3.md`; **105** in `docs/`, waarvan **4** uit `DR-C-07` |
| `IJK-`-botsing | `grep -r "IJK-" docs/` | **0 treffers** vóór deze paragraaf |
| drempelrekening | afgeleid uit `§6.5.8` | `0,40×2 = 0,80 → ≥1` · `0,40×3 = 1,20 → ≥2` · `0,30×2 = 0,60 → ≥1` · `0,30×3 = 0,90 → ≥1` · `0,30×4 = 1,20 → ≥2` |
| afgeleide clusterillustratie | rekenoefening op de in `§6.5.4` opgeschreven graden; **niet opnieuw gerenderd, geen ijking** | master 8 waarden → 3 clusters; B2 10 waarden → 5 clusters; gezamenlijk op τ = 1,07 → **6 clusters, 3 uitsluitend B2**; per-pagina + representantmatching → **ook 3** |

**NIET GEDRAAID in deze paragraaf, met reden:** de ijking van `IJK-01`…`IJK-05` — er is geen tweede
gemapte pagina (gemeten: 1 van 48, en dat is de master). De harnasimplementatie van `VAR-07a` — buiten
de opdracht. Een browserrun voor de drie `MEETBAAR NU`-waarden van `§7.16.9` — buiten de opdracht.
`node docs/qa/desktop-governance.mjs` — niet gedraaid; deze paragraaf baseert geen enkele uitspraak
op een gerenderde maat die zij zelf zou hebben moeten meten.

---


## 7.17 · HET CANONIEKE TEGENSTRIJDIGHEIDSREGISTER

Eén tabel voor de hele keten. **Toegestane statussen**, en alleen deze vijf:
`RESOLVED` · `SUPERSEDED` · `CALIBRATION PENDING` · `CONTENT PENDING` · `ASSET PENDING`.
Geen van de vijf telt als een open **interne** tegenstrijdigheid, omdat bij elk een deterministische
procedure is aangewezen. `UNKNOWN`, `UNRESOLVED INTERNAL` en `DECISION REQUIRED` zijn als eindstatus
verboden — met één uitzondering die hieronder met bewijs wordt aangewezen.

### Telling per status

| status | n |
|---|---:|
| `RESOLVED` | **44** |
| `SUPERSEDED` | **9** |
| `CALIBRATION PENDING` | **5** |
| `CONTENT PENDING` | **11** secties over 5 kaarten |
| `ASSET PENDING` | **1** slot |
| **INTERNE TEGENSTRIJDIGHEDEN OPEN** | **0** |
| `USER DECISION REQUIRED` — echte strategische besluiten | **1** (`UD-2`) |

### Het register

| ID | DESCRIPTION | ORIGIN | RESOLUTION | STATUS | CURRENT NORMATIVE REFERENCE |
|---|---|---|---|---|---|
| `IC-01`…`IC-18` | 18 interne tegenstrijdigheden gemeten in de visuele taal, elf in en rond `BR-02` | uitvoerende ronde, `§7.8` | elk met SOURCE/INTENT/CONFLICT/RESOLUTION/EVALUATOR/TEST en een MACHINE-toets die in PASS of FAIL eindigt | **RESOLVED** | `04-visual-language-v1.3.md §7.8` |
| `DR-U2-01` | `BR-02`'s terugval verbiedt gelijke items **mét** vlak; `DR-R4-09` staat 1,000 toe | `scratchpad/v13/U2-aanvallen.md:137,169` | het kaartschema maakt vlak én gelijkheid declareerbaar in één veld; één regel leest beide | **RESOLVED** | `docs/schema/composition-card.schema.json` → `surface_hierarchy`; toets `KP-07` in `docs/qa/composition-gate.mjs` |
| `DR-U2-06` | `CP-01a` gaf **drie** uitkomsten op drie kaartensets | `scratchpad/v13/U2-aanvallen.md:874` | er bestond geen canonieke set; die is er nu, en `CP-01a` is vervangen | **SUPERSEDED** | `docs/data/vibe-site-register.json` → `governance_note`; `XP-01`…`XP-03` |
| `DR-U2-07` | een `N.V.T.` zonder vervanger keurde een premiumpagina af omdat zij een antipatroon **niet** had | `scratchpad/v13/U2-aanvallen.md:513,552` | plafondregels en vloerregels gescheiden: een afwezig antipatroon is PASS, een afwezige vereiste is `NVT` + vervanger | **RESOLVED** | `docs/qa/composition-gate.mjs`, functie `verdict()`; bewezen door `--zelftest` 8/8 |
| `NF-4` lege doorsnede | eis (4) capt de sectie op `198 ÷ 0,45 = 440,0px` tegen een MEDIUM-vloer van `≥ 443,5px` | `§7.2` van de blokkaderonde | proxy vervangen door een dominantieverhouding (`S3-06`, gemeten 2,05–3,80) plus een rust/vulband; venster **28,6px** | **RESOLVED** | `04-visual-language-v1.3.md §7.6` |
| `R7` | `E-04(iii)`'s vijfde meetwaarde `420px` ligt in een `ch`-band | `§7.6` | gemeten: de master declareert in **`cqw`**; de waarde is een gerenderde realisatie, geen bandlid | **RESOLVED** | `04-visual-language-v1.3.md §7.5`, regel `S3-28` |
| `R8` | `REG-1`/`REG-5` `ch`-maat tegenover de `%`-vloer van `§3.3.0` | `§7.6` | de `ch`-maat is gezag; de `%`-vloer wordt rapportagewaarde; de zorg "kolom in leegte" blijft bij `E-04(ii)` | **RESOLVED** | `04-visual-language-v1.3.md §5.5`, regel `S3-28` |
| `DR-R1-13` | 48 van 48 pagina's niet classificeerbaar zonder een klasse NIET-PAGINA | blokkaderonde | `S3-30` legt de klasse normatief vast, met per bestand een uitgeschreven reden | **RESOLVED** | `04-visual-language-v1.3.md §7.0`; `docs/data/vibe-site-register.json` |
| `T-1` | `NIET-PAGINA` en de `CP-`regels werden geclaimd maar stonden 0× in het document | `§7.14` | `S3-30` toegevoegd (nu 26 treffers); `CP-01a` vervangen door `XP-01`…`XP-03` | **RESOLVED** | `§7.0`, `§7.7` |
| `T-2` | twee rivaliserende reviewerlagen: `B-01`…`B-07` tegenover `RQ-01`…`RQ-07` | `§7.14` | één canonieke laag; 4 criteria opgenomen, 2 gepromoveerd tot `RQ-08`/`RQ-09`, 1 `SUPERSEDED`; gezagsorde als procedure | **RESOLVED** | `04-visual-language-v1.3.md §7.15`; `docs/qa/composition-gate.mjs` → `REVIEWERVRAGEN` |
| `T-3` | twaalf botsende codereeksen; 59 letterlijke codes met twee betekenissen | `§7.14` | 191 geverifieerde regelvervangingen; elke regeldragende reeks uniek; registry als data | **RESOLVED** | `docs/data/vibe-rule-id-registry.json`; toets `docs/qa/id-integriteit.mjs` |
| `T-4` | `NF-4` — zie hierboven | `§7.14` | zie `NF-4` | **RESOLVED** | `§7.6` |
| `T-5` | `C-07` heet een poort en is er geen; drempels 0,40/0,30 **NIET GEMETEN** | `§7.14` | poort gesplitst: de tak die vandaag meetbaar is wordt poort (`VAR-07`), de twee ongemeten drempels worden `IJK-0n` met een eenduidige ijkprocedure | **CALIBRATION PENDING** | `04-visual-language-v1.3.md §7.16` |
| `T-6` | `§6.8.3` gaf als `N.V.T.`-reden *"het siteregister bestaat niet"* | `§7.14` | tekst doorgehaald en gecorrigeerd; `D-06` is meetbaar geworden | **RESOLVED** | regel `D-06` in `§6.8.3`; `§7.3` |
| `T-7` | de twintigste tegenstrijdigheidsrij was niet geïdentificeerd | `§7.14` | geïdentificeerd als `A-06` deel (b+c) door verschil van twee uitgeschreven lijsten; het getal 20 was géén telfout | **RESOLVED** | `04-visual-language-v1.3.md §7.18` |
| `A-06` (b+c) = `UD-2` | de typografiehelft van `brandbook §1A.6` punt 2 plus het px-plafond op de inhoudsdoos | `scratchpad/v13/R4-tegenstrijdigheden.md:318,352`; leeft als `DR-C-20` | **geen tegenstrijdigheid**: zolang `§1A.6` `FROZEN` is, wint de clausule en is de uitkomst eenduidig. Wat openstaat is de vraag **of de clausule mag wijken** — een wijziging van bevroren beleid, en dus een besluit van de eigenaar | **USER DECISION REQUIRED** | `04-visual-language-v1.3.md §7.18`; `DR-C-20` op `:631` |
| `UD-1` | wie is de reviewer van deel B | `§7.8` | opgelost door `T-2`: er is één canonieke reviewlaag met rollen als functie, geen persoonsnaam | **RESOLVED** | `§7.15` |
| 7 V1.2-bevindingen | nep-pagina haalde 22/22 · bevroren composities als blauwdruk · 0/126 nieuwe maatwaarden · 10/15 blauwdrukken eisten een eigen foto · geen registerblauwdruk · 23/48 niet meetbaar · 4 onderlinge tegenstrijdigheden | `00-changelog.md §3` | V1.2 als **systeem** afgewezen; de vijf documenten dragen de banner *"BEWIJSBIJLAGE, NIET NORMATIEF"*; hun metingen blijven gelden als bewijs | **SUPERSEDED** | `00-changelog.md §3`; de banner in elk van de vijf bestanden |
| 2 V1.2-conclusies | *"M1/M2/M4 zijn onbouwbaar"* · *"sub-AA-contrast tot norm verheffen"* | `00-changelog.md §4` | beide **ingetrokken**, met de meting die het weerlegt resp. het besluit dat AA geldt voor nieuw werk | **RESOLVED** | `00-changelog.md §4` |
| `BLK-H1`…`BLK-H6` | de zes blokkades van de vorige ronde | `00-changelog.md §7.1` | alle zes inhoudelijk opgelost in de blokkaderonde | **RESOLVED** | `00-changelog.md §7` |
| `BLK-01`…`BLK-06` | de zes blokkades van deze keten | `00-changelog.md §5` | gesloten in de uitvoerende ronde en deze afsluitronde | **RESOLVED** | `00-changelog.md §8` en `§9` |
| `IJK-01`…`IJK-05` | vijf drempels die nooit zijn gemeten | `§7.16` | elk met grootheid, meetmethode, eerste in aanmerking komende pagina, aanvaardbaar bewijs, reviewer en faalgedrag | **CALIBRATION PENDING** | `04-visual-language-v1.3.md §7.16` |
| `P-01`…`P-16` · `G01`…`G24` · `B01`…`B15` · `K1`…`K8` · `M`-poorten V1.2 | de poorten en regels van V1.2 | de vijf V1.2-documenten | vervangen door `KP`/`XP`/`DG` resp. `BR-01`…`BR-13`; nog aangehaald als **gemeten precedent** | **SUPERSEDED** | `docs/data/vibe-rule-id-registry.json`, laag `BIJLAGE` |
| 11 secties zonder dekkende inhoud | `homepage` 1 · `schaarste-b2` 4 · `vrij-a` 2 · `vrij-b` 2 · `vrij-c` 3 | de acht compositiekaarten | `KP-11` levert `NVT` met de **ablatietoets** als vervanger; die slaagt op alle elf, dus het **ontwerp** valt er niet op | **CONTENT PENDING** | `KP-11` in `docs/qa/composition-gate.mjs`; `§7.11` |
| 1 assetslot | `homepage` sectie 04: klasse-C-bron onder een bandbehandeling | `docs/compositions/homepage.json` | gedeclareerd als `PENDING` in plaats van als `AANWEZIG`; `KP-10` verbiedt klasse-C in een HIGH-podium | **ASSET PENDING** | `KP-10`; de kaart zelf |

### Wat hier eerlijk staat

**`UD-2` is de enige post die geen van de vijf statussen kan krijgen**, en hij is niet gefabriceerd om
een oud getal te redden: hij is de rij die `T-7` zocht, met vindplaats en met de reden dat hij geen
`IC` is. Hij blokkeert de freeze niet, omdat het stelsel vandaag een eenduidig antwoord heeft — de
bevroren clausule wint. Hij blijft staan tot de eigenaar beslist of zij mag wijken.

---


## 7.18 · `T-7` — de twintigste rij is `A-06`, en het getal 20 was géén telfout

**Uitkomst A.** De rij is geïdentificeerd. Hij is niet verdwenen en niet verzonnen: hij stond in het
meetmateriaal van dezelfde ronde die *"19 van 20 gesloten"* rapporteerde, alleen niet in een bestand
onder `docs/`.

### De vijf grootheden die door elkaar liepen

| getal | vindplaats | wat er geteld werd |
|---|---|---|
| **4** | `00-changelog.md:63` · `scratchpad/papiertest.md:618` | tegenstrijdigheden **tússen de vijf V1.2-documenten** |
| **53** | `scratchpad/v13/T3-consolidatie.md:144` | rijen in het consolidatieregister, **eerste** telling |
| **60** | `scratchpad/v13/T3-consolidatie.md:188` | **substantieve** rijen: groep A 7 + groep B 44 + groep C 9 |
| **20** | `scratchpad/v13/T3-consolidatie.md:194` | **16 TOEGEWEZEN + 4 OPEN** — een **deelverzameling** van de 60 |
| **18** | `04-visual-language-v1.3.md §7.8` | een **andere** verzameling: wat de governanceronde zelf in dit document mat |

**Het getal 20 klopt.** `16 + 4 = 20` in **beide** tellingen, die van 53 en die van 60.
`scratchpad/v13/R4-tegenstrijdigheden.md:402` stelt dat zelf vast: *"het getal 20 klopt in beide"*.

### Het verschil van twee uitgeschreven lijsten

```
de 20   (R4:318, en als tabel R4:324-343 — zelf nageteld: 20 rijen)
  A-02 A-03 A-06 B-02 B-04 B-08 B-11 B-14 B-16 B-34
  B-36 B-39 B-40 C-01 C-04 C-05 B-20 B-31 B-37 C-09

de 19 INTERN OPGELOST   (R4:349)
  A-02 A-03      B-02 B-04 B-08 B-11 B-14 B-16 B-20 B-31
  B-34 B-36 B-37 B-39 B-40 C-01 C-04 C-05 C-09

verschil = A-06
```

En de rij staat er met zijn status, op `R4:352`:

> `BESLUIT GEBRUIKER` | **1** | *"`A-06`, uitsluitend deel (b+c): de typografiehelft van `§1A.6` punt 2
> en het px-plafond op de inhoudsdoos. Deel (a) is INTERN OPGELOST."*

### Waarom `T-7` drie ronden open bleef — en de oorzaak is `T-3`

| oorzaak | bewijs |
|---|---|
| het register van 60/20 rijen staat **alleen in de scratchpad** (`T3`, `R4`), niet onder `docs/` | `grep -rn "De twintig" docs/` geeft nul treffers |
| de `§7.8`-sessie las naar eigen opgave **alleen** `04-visual-language-v1.3.md` en `00-changelog.md` | `§7.8` meetbasis |
| **de rijcode `A-06` botst in het levende document met de poortcode `A-06`** (decoratieve geometrie, `:4875`) | `grep "A-06"` levert de poort, niet de rij |

Die derde oorzaak **is `T-3`**. De naamruimtebotsing maakte de rij onvindbaar met grep. Dat is het
scherpste argument voor de opschoning in `§7.17`: een botsende code kost niet alleen leesbaarheid,
hij verbergt werk.

### Waarom `A-06` géén interne tegenstrijdigheid is

`A-06` deel (b+c) vraagt een **wijziging van een `FROZEN` besluit**: `brandbook §1A.6` punt 2, dat
`clamp()` als default voorschrijft en `cqw` tot bewust canvas-proportionele composities beperkt.
Zolang die clausule bevroren is, **heeft het stelsel vandaag een eenduidig antwoord**: de clausule
wint. Er is dus geen tegenstrijdigheid — er is een **gebruikersbesluit** of de clausule moet wijken.

Dat is de reden dat `§7.8` hem niet onder `IC-01`…`IC-18` kon vinden: hij hoort daar niet.
In het register van `§7.17` staat hij als **`UD-2`**, de enige openstaande post van die soort.

### De telfout die er wél is — en hierbij gecorrigeerd

`00-changelog.md §5` schreef *"20 onopgeloste tegenstrijdigheden van de **60** substantieve rijen |
**33** opgelost · 16 toegewezen · 4 open"*. Maar `33 + 16 + 4 = 53`, niet 60. Het **totaal** is in een
latere ronde naar 60 bijgewerkt, de **uitsplitsing** niet. `T3-consolidatie.md:188` geeft de juiste
uitsplitsing: **40 · 16 · 4 = 60**. De changelog is hierbij gecorrigeerd van 33 naar **40**.

---

