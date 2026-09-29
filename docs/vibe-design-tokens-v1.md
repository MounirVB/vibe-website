# Vibe Homepage — Design Tokens v1

**Bron:** `/Users/mounirvanbinsbergen/projects/vibe-website`, commit `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1`
("feat: lock homepage master v1") — hierna **Homepage Master v1**.
**Status:** vastgelegde meetwaarde van de bevroren homepage. Dit document beschrijft wat de code
op deze commit dóét; het schrijft niets voor en er is geen enkel CSS-, HTML-, JS- of assetbestand
voor gewijzigd.
**Afleiding:** dit is de compacte technische tokenreferentie, afgeleid uit Master v1. Elke regel
verwijst naar `bestand:regel`. Waarden in px zijn gerekend op viewport **1774 px**, waar
`1cqw = 17,74 px` (zie §3.0).

**Leesregel:** alle getallen hieronder zijn in deze sessie tegen de bronbestanden gemeten. Waar een
comment in de code een ander getal noemt dan de code oplevert, staat dat er expliciet bij.

**Normatieve laag.** §0 t/m §7 zijn uitsluitend meetwaarde van Master v1 en schrijven niets voor.
**§7A is de enige sectie die wél voorschrijft:** daar staan de bevroren V1.0-besluiten over
tokenarchitectuur, responsive typografie en rgba-normalisatie. §8 is de besluitenlijst. **Master v1
wordt voor §7A NU niet gerefactord** — zie §7A.0.

---

## 0. Systeemwaarschuwing — er is geen componentbibliotheek

Het systeem is visueel consistent maar **structureel niet als bibliotheek geïmplementeerd**. Dat is
de belangrijkste eigenschap van Master v1 en bepaalt hoe elk token hieronder gelezen moet worden.

Er bestaan **15 CTA-klassen**, elk met een eigen definitie:

| Klasse | Bron | Rol |
|---|---|---|
| `.vh-btn` | home-hero.css:207 | gedeeld primitief (vorm, graad, gewicht) |
| `.vh-btn-primair` | home-hero.css:224 | variant op `.vh-btn` |
| `.vh-btn-secundair` | home-hero.css:230 | variant op `.vh-btn` |
| `.vh-cta` | home-hero.css:276 | wrapper, `display:flex` + `gap:1.4093cqw` |
| `.vh-sol-cta` | home-solutions.css:66 | eigen, volledige herdefinitie |
| `.vh-pr-cta` | home-project.css:171 | wrapper |
| `.vh-pr-knop` | home-project.css:176 | eigen, volledige herdefinitie |
| `.vh-ctrl-cta` | home-control.css:259 | eigen, volledige herdefinitie |
| `.vh-proof-cta` | home-proof.css:187 | eigen, volledige herdefinitie |
| `.vh-proof-strip-cta` | home-proof.css:350 | tekstlink met underline |
| `.vh-infra-cta` | home-infra.css:110 | eigen, volledige herdefinitie |
| `.vh-infra-cta2` | home-infra.css:130 | tekstlink |
| `.vh-final-cta` | home-final.css:170 | eigen, volledige herdefinitie |
| `.vh-final-cta2` | home-final.css:189 | secundaire knop, eigen definitie |
| `.vh-footer-nb-cta` | home-footer.css:218 | eigen, volledige herdefinitie |

Alleen `.vh-btn` / `.vh-btn-primair` / `.vh-btn-secundair` is een **echt gedeeld primitief**: één
vormdefinitie met twee varianten. De overige zeven knoppen zetten `display`, `align-items`,
`gap`/`justify-content`, `width`, `height`, `border-radius`, `background`, `color`, `font-size`,
`font-weight`, `line-height`, `white-space` en `transition` elk opnieuw uit. Hetzelfde geldt voor
eyebrow, sectiekop en lead: negen eyebrows (§3.1), zeven H2's en zeven leads, elk met een eigen
volledige specificatie en geen gedeelde selector.

De enige gedeelde bouwsteen die het systeem wél kent — `.vh-m-eyebrow`
(home-mobile.css:227-234) — heeft **0 voorkomens in index.html**. De negen eyebrows dupliceren de
inhoud van die klasse in plaats van hem aan te roepen.

---

## 1. Meetcorrecties op de bronopdracht

Twee tellingen die in de opdracht als vastgesteld waren aangeleverd, komen bij hermeting anders uit.
Hieronder geldt de gemeten waarde.

| Claim | Gemeten op aae26bf | Meting |
|---|---|---|
| "24 `--vibe-*` tokens in home.css" | **23** unieke tokennamen (home.css:35-70) | `grep -oE '^\s*--vibe-[a-z0-9-]+' home.css \| sort -u \| wc -l` = 23 |
| kleur.json: "44 aliassen" over negen sets | **48** kleuraliassen (+1 vormalias `--sol-radius`, +4 ritmevariabelen `--vh-gap-*`/`--vh-copy-top`) | per-sectie geteld, §2b |
| home.css:59 comment: "de 23 losse box-shadows" | **15** `box-shadow`-declaraties | §5.4 |

De breekpunttellingen uit de opdracht (12 × `max-width:1199px`, 11 × `768-1199`) zijn hermeten en
kloppen exact — zie §6.

---

## 2. KLEUR

Het kleursysteem bestaat uit drie lagen:

1. **semantisch** — `--vibe-*` in `home.css:29-71` (23 tokens)
2. **mobiel** — `--m-*` in `home-mobile.css:15-45` (14 tokens, waarvan 3 kleur)
3. **per-sectie alias** — negen sets (`--vh-*`, `--sol-*`, `--pr-*`, `--pc-*`, `--ct-*`, `--pf-*`,
   `--if-*`, `--fi-*`, `--ft-*`), samen 48 kleuraliassen

Alleen blauw is volledig doorgevoerd: alle tien blauwaliassen wijzen naar `--vibe-blauw`. Van de 23
`--vibe-*`-tokens hebben er **12 nul `var()`-verwijzingen**.

### 2a. Semantische tokens

#### `--vibe-*` (home.css:29-71)

| Token | Waarde | Bron | Gebruik (gemeten `var()`-refs) | Waar NIET gebruiken |
|---|---|---|---|---|
| `--vibe-blauw` | `#0073FE` | home.css:35 | **11 refs.** Voedt alle tien sectie-blauwaliassen (home-hero.css:17, home-solutions.css:18, home-project.css:29, home-process.css:28, home-control.css:26, home-proof.css:24, home-infra.css:24, home-final.css:25, home-footer.css:26, home-mobile.css:30) + `--vibe-focus` (home.css:68) | Er is **geen rgb-kanaaltoken**. Elke doorzichtige variant is hardgecodeerd als `rgba(0,115,254,…)` (o.a. home-control.css:149/158/161, home-hero.css:464, home-final.css:395, home-process.css:258/272, home-proof.css:131, home-solutions.css:308/319, home-mobile.css:151) |
| `--vibe-blauw-diep` | `#005FE0` | home.css:36 | **1 ref:** `--vh-blauw-diep` (home-hero.css:18) → `.vh-btn-primair:hover` (home-hero.css:229) | Nooit als rustkleur. De zeven andere secties hardcoderen dezelfde waarde in hun hover: home-solutions.css:84, home-project.css:193, home-control.css:277, home-proof.css:212, home-infra.css:128, home-final.css:188, home-footer.css:236 |
| `--vibe-blauw-licht` | `#3E9BFF` | home.css:37 | **0 refs (dood).** Waarde rendert hardgecodeerd, uitsluitend in S5: home-control.css:90, :93 (2×), :116, :142, :190 | Nooit op een licht vlak — dit is het accent bínnen het donkere dashboard |
| `--vibe-blauw-tint` | `#E4F0FC` | home.css:38 | **0 refs (dood).** Rendert 4× hardgecodeerd, uitsluitend als 1px-scheiding in de KPI-balk van S7: home-infra.css:306, :421, :422, :435 | Nooit als vlak; alleen als lijn |
| `--vibe-navy` | `#08203C` | home.css:41 | **8 refs.** Voedt `--sol-navy`, `--pc-navy`, `--ct-navy`, `--pf-navy`, `--if-navy`, `--fi-navy`, `--m-navy` + de globale `h1,h2,h3`-kleur (home.css:108) | NIET gebruikt door S1 (`--vh-navy` `#071D3A`, home-hero.css:19) en S9 (`--ft-navy` `#0C1B33`, home-footer.css:27) |
| `--vibe-navy-diep` | `#001632` | home.css:42 | **1 ref:** `--pr-navy` (home-project.css:28) → achtergrond Hedin-paneel (home-project.css:53) | Ondanks de comment "diepste navy, dashboard" is dit NIET de dashboardkleur: dat is `--ct-scr` `#011731` (home-control.css:31), telefoon `#050E1B` (home-control.css:65) |
| `--vibe-body` | `#4C5771` | home.css:43 | **5 refs:** `html,body` (home.css:82), `--if-body`, `--fi-body`, `--ft-body`, `--m-body-kleur` | Niet door S1/S2/S4/S5/S6 — die hebben eigen grijzen |
| `--vibe-body-zacht` | `#56627D` | home.css:44 | **3 refs:** `--sol-grijs` (home-solutions.css:20), `--pc-body` (home-process.css:30), `--ct-body` (home-control.css:28) | — |
| `--vibe-sub` | `#6F7A95` | home.css:45 | **3 refs:** `--sol-grijs2` (home-solutions.css:21), `--pc-sub` (home-process.css:31), `--ct-sub` (home-control.css:29) | — |
| `--vibe-op-donker` | `#E6EFFA` | home.css:46 | **0 refs (dood).** Rendert 5× hardgecodeerd als primaire tekst op het donkere dashboard: home-control.css:100, :115, :119, :130, :144 | Nooit op licht |
| `--vibe-wit` | `#FFFFFF` | home.css:49 | **1 ref:** `html,body`-achtergrond (home.css:81) | — |
| `--vibe-paper` | `#FCFDFE` | home.css:50 | **1 ref:** achtergrond S3 (home-project.css:24) | Dezelfde waarde staat hardgecodeerd op home-solutions.css:13, home-process.css:24, home-proof.css:248, home-hero.css:331 — drie opeenvolgende secties delen `#FCFDFE`, maar alleen S3 via het token |
| `--vibe-canvas` | `#F6FAFE` | home.css:51 | **0 refs (dood).** De waarde rendert alleen als gradientstop: home-infra.css:20, home-footer.css:21 | Nergens een paginavlak, ondanks de naam |
| `--vibe-lijn` | `rgba(16,28,58,.12)` | home.css:52 | **0 refs (dood).** Exacte waarde rendert 1× hardgecodeerd: rand klantkaartje S6 (home-proof.css:124) | Alle andere lijnen op de pagina gebruiken een andere waarde — zie §5.2 |
| `--vibe-radius-kaart` | `.5637cqw` (= 10,00 px @1774) | home.css:55 | **0 refs (dood)** | Gedefinieerd in `:root`, waar **geen container bestaat** — een cqw-waarde in `:root` heeft geen inline-size om tegen te rekenen. Niet als "het radiussysteem" presenteren |
| `--vibe-radius-mob` | `14px` | home.css:56 | **0 refs (dood)** | Exacte duplicaatdefinitie van `--m-radius` (home-mobile.css:28), en díé wordt 9× gebruikt |
| `--vibe-radius-rond` | `50%` | home.css:57 | **0 refs (dood).** `50%` staat 6× literal: home-solutions.css:232, home-control.css:92, :156, home-infra.css:271, home-final.css:281, home-process.css:273 | — |
| `--vibe-elev-1` | `0 .18cqw .45cqw rgba(12,38,72,.06), 0 1.50cqw 3.20cqw -1.10cqw rgba(12,38,72,.22)` | home.css:60-61 | **0 refs (dood).** Numeriek identiek en in dezelfde laagvolgorde aan home-process.css:122 | Zie `--vibe-radius-kaart`: cqw in `:root` |
| `--vibe-elev-2` | `0 .28cqw .68cqw -.34cqw rgba(26,86,156,.14), 0 1.35cqw 2.70cqw -1.10cqw rgba(26,86,156,.22)` | home.css:62-63 | **0 refs (dood).** Dezelfde twee lagen als home-proof.css:249-250, maar **in omgekeerde volgorde** opgeschreven | idem |
| `--vibe-elev-mob` | `0 2px 6px rgba(12,38,72,.06), 0 14px 28px -14px rgba(12,38,72,.20)` | home.css:64-65 | **1 ref** — het enige levende elevatietoken: sectorkaarten S7 op mobiel (home-infra.css:402) | Geen andere mobiele kaart gebruikt het; zeven cqw-schaduwen hebben onder 1200 px géén mobiel equivalent (§5.5) |
| `--vibe-focus` | `var(--vibe-blauw)` = `#0073FE` | home.css:68 | **1 ref:** home.css:124. `a/button/input/select/[tabindex]:focus-visible` → `outline:2px solid #0073FE !important; outline-offset:3px !important; border-radius:2px` (home.css:119-127) | home.css laadt ná tokens.css (index.html:56-57), dus de legacy cyane ring `#0096CC` (tokens.css:102-105) rendert **niet** op de homepage |
| `--vibe-ease` | `cubic-bezier(.2,.7,.2,1)` | home.css:69 | **0 refs (dood).** De curve staat letterlijk herhaald op home-infra.css:221 | — |
| `--vibe-dur` | `.2s` | home.css:70 | **0 refs (dood).** Elke sectie schrijft zijn eigen `transition` uit | — |

**Dode tokens (0 `var()`-refs), 12 van 23:** `--vibe-blauw-licht`, `--vibe-blauw-tint`,
`--vibe-op-donker`, `--vibe-canvas`, `--vibe-lijn`, `--vibe-radius-kaart`, `--vibe-radius-mob`,
`--vibe-radius-rond`, `--vibe-elev-1`, `--vibe-elev-2`, `--vibe-ease`, `--vibe-dur`.
Vijf daarvan renderen wél, hardgecodeerd op 1 tot 6 plekken.

#### `--m-*` (home-mobile.css:15-33, tabletoverride :34-45)

| Token | Waarde <768 | Waarde 768-1199 | Bron | Gebruik | Waar NIET gebruiken |
|---|---|---|---|---|---|
| `--m-gutter` | `clamp(20px, 5.4vw, 24px)` | `clamp(32px, 5vw, 48px)` | home-mobile.css:16 / :36 | **36×**, in 11 bestanden, uitsluitend binnen `max-width:1199`-blokken | Staat in een ongekwalificeerde `:root` en bestaat dus ook boven 1200 px, maar géén desktopregel roept hem aan — daar gebruiken breekt de per-sectie-marges (§4.1) |
| `--m-sec-y` | `44px` | `64px` | home-mobile.css:20 / :37 | **12×** | Alleen onder 1200 px. Desktop heeft geen equivalent |
| `--m-h1` | `clamp(34px, 9.1vw, 44px)` | `clamp(46px, 6.4vw, 58px)` | home-mobile.css:21 / :38 | **1×** (home-hero.css:417) | Geen algemene koppenschaal |
| `--m-h2` | `clamp(27px, 7.3vw, 34px)` | `clamp(34px, 4.6vw, 42px)` | home-mobile.css:22 / :39 | **6×** | S8 `.vh-final-kop` gebruikt hem bewust NIET (eigen clamp, home-final.css:345) |
| `--m-h3` | `19px` | `21px` | home-mobile.css:23 / :40 | **1×** (home-solutions.css:403) | Wordt op mobiel daarna voor vier van de zes kaarten overschreven (home-solutions.css:421-424) |
| `--m-lead` | `16.5px` | `18px` | home-mobile.css:24 / :41 | **6×** | S3 en S6 vallen terug op `--m-body` in plaats hiervan (home-project.css:267, home-proof.css:423) |
| `--m-body` | `15.5px` | `16.5px` | home-mobile.css:25 / :42 | **10×** | — |
| `--m-eyebrow` | `11.5px` | **niet herdefinieerd** | home-mobile.css:26 | **10×** (9 levend + `.vh-m-eyebrow`) | Blijft 11,5 px op 768-1199 terwijl alle andere graden meegroeien — zie §8-6 (DECIDED — V1.0) |
| `--m-btn-h` | `52px` | `56px` | home-mobile.css:27 / :43 | **9×** | — |
| `--m-radius` | `14px` | niet herdefinieerd | home-mobile.css:28 | **9×**, uitsluitend kaarten | **Niet** de mobiele knopradius: elke knop zet hard `10px` (§5.1) |
| `--m-radius-img` | `12px` | niet herdefinieerd | home-mobile.css:29 | **6×**, uitsluitend beeld | — |
| `--m-blauw` | `var(--vibe-blauw)` | — | home-mobile.css:30 | **3×** | — |
| `--m-navy` | `var(--vibe-navy)` | — | home-mobile.css:31 | **1×** (home-mobile.css:118, kleur menuknop) | — |
| `--m-body-kleur` | `var(--vibe-body)` | — | home-mobile.css:32 | **0× — dood** | — |

De drie kleurtokens van deze laag zijn pure doorgeefluiken naar `--vibe-*`; de laag voegt geen eigen
kleur toe.

### 2b. Per-sectie aliassen — token-backed vs. hardgecodeerd

Gemeten: **48 kleuraliassen**, waarvan **26 naar een `--vibe-*`-token wijzen** en **22 een eigen
hardgecodeerde waarde dragen**. Met de drie `--m-*`-kleuraliassen erbij: 51 / 29 / 22.

| Sectie | Bestand:regel | Token-backed (→ `--vibe-*`) | Eigen hardgecodeerde waarde |
|---|---|---|---|
| **S1** `.vh` | home-hero.css:17-23 | `--vh-blauw` → `--vibe-blauw`<br>`--vh-blauw-diep` → `--vibe-blauw-diep` | `--vh-navy` `#071D3A`<br>`--vh-grijs` `#475771`<br>`--vh-grijs-licht` `#4E5C78`<br>`--vh-paars-lijn` `#DCE7F3`<br>`--vh-rand` `#46587A` |
| **S2** `.vh-sol` | home-solutions.css:18-23 | `--sol-blauw` → `--vibe-blauw`<br>`--sol-navy` → `--vibe-navy`<br>`--sol-grijs` → `--vibe-body-zacht`<br>`--sol-grijs2` → `--vibe-sub` | `--sol-lijn` `#E5EFFA`<br>`--sol-radius` `.5637cqw` *(vormalias, geen kleur)* |
| **S3** `.vh-pr` | home-project.css:28-32 | `--pr-navy` → `--vibe-navy-diep`<br>`--pr-blauw` → `--vibe-blauw` | `--pr-eyebrow` `#0490FF`<br>`--pr-body` `#93A5BC`<br>`--pr-lijn` `rgba(255,255,255,.22)` |
| **S4** `.vh-proc` | home-process.css:28-33 | `--pc-blauw` → `--vibe-blauw`<br>`--pc-navy` → `--vibe-navy`<br>`--pc-body` → `--vibe-body-zacht`<br>`--pc-sub` → `--vibe-sub` | `--pc-badge` `#D8ECFE`<br>`--pc-chev` `#B9C7D8` |
| **S5** `.vh-ctrl` | home-control.css:26-31 | `--ct-blauw` → `--vibe-blauw`<br>`--ct-navy` → `--vibe-navy`<br>`--ct-body` → `--vibe-body-zacht`<br>`--ct-sub` → `--vibe-sub` | `--ct-badge` `#D8ECFE`<br>`--ct-scr` `#011731` |
| **S6** `.vh-proof` | home-proof.css:24-29 | `--pf-blauw` → `--vibe-blauw`<br>`--pf-navy` → `--vibe-navy` | `--pf-body` `#54607A`<br>`--pf-sub` `#7C88A2`<br>`--pf-slate` `#5F769E`<br>`--pf-strip` `#01234C` |
| **S7** `.vh-infra` | home-infra.css:24-28 | `--if-blauw` → `--vibe-blauw`<br>`--if-navy` → `--vibe-navy`<br>`--if-body` → `--vibe-body` | `--if-sub` `#4E5876`<br>`--if-tint` `#DEEFFD` |
| **S8** `.vh-final` | home-final.css:25-28 | `--fi-blauw` → `--vibe-blauw`<br>`--fi-navy` → `--vibe-navy`<br>`--fi-body` → `--vibe-body` | `--fi-tint` `#E8F3FE` |
| **S9** `.vh-footer` | home-footer.css:26-29 | `--ft-blauw` → `--vibe-blauw`<br>`--ft-body` → `--vibe-body` | `--ft-navy` `#0C1B33`<br>`--ft-lijn` `#DCE7F2` |
| **mobiel** | home-mobile.css:30-32 | `--m-blauw`, `--m-navy`, `--m-body-kleur` (alle drie) | — |

**Gemeten eigenschappen van deze laag:**

- **Blauw is de enige volledig doorgevoerde rol.** Alle tien blauwaliassen wijzen naar
  `--vibe-blauw`. Twee eyebrows vallen er als enige buiten: S3 `#0490FF` (home-project.css:30,
  gebruikt via `var(--pr-eyebrow)` op :115 en als linkhover op :210) en de S6-projectstrook
  `#0097FE` (home-proof.css:332, hard literal).
- **S1 en S9 wijken als enige af op navy én body.** `--vh-navy` `#071D3A` en `--ft-navy` `#0C1B33`
  zijn de tweede en derde navy voor de rol "kop op licht vlak".
- **S8 is de schoonste sectie:** drie van de vier aliassen komen uit de tokenlaag.
- **S6 heeft de meeste eigen grijzen:** vier van de zes aliassen zijn literals; geen ervan wijst naar
  `--vibe-body` of `--vibe-sub`.
- **S1 draagt daarnaast vier ritmevariabelen** die geen kleur zijn: `--vh-copy-top` `9.2364cqw`,
  `--vh-gap-h1` `1.8936cqw`, `--vh-gap-p` `1.5545cqw`, `--vh-gap-btn` `1.9082cqw`
  (home-hero.css:26-29). S1 is de enige sectie die haar tekstritme in eigen custom properties zet.
- **`--sol-radius` (home-solutions.css:23) is de enige per-sectie vormalias** op de hele pagina; hij
  voedt zowel de CTA (:74) als alle zes modulekaarten (:149).

### 2c. Raw palette values zonder token

Waarden die renderen maar in geen enkele tokenlaag bestaan.

#### Navy / inkt (24 waarden; drie zitten in een tokenlaag, 21 niet)

| Waarde | Rol | Bron |
|---|---|---|
| `#08203C` | kopinkt, `--vibe-navy` — **wél token** | home.css:41 |
| `#071D3A` | S1-koppen, `--vh-navy` — **alias, geen `--vibe-*`** | home-hero.css:19 |
| `#0C1B33` | S9-koppen, `--ft-navy` — **alias, geen `--vibe-*`** | home-footer.css:27 |
| `#001632` | S3-paneel, `--vibe-navy-diep` — **wél token** | home.css:42 |
| `#011731` | dashboardscherm, `--ct-scr` | home-control.css:31 |
| `#050E1B` | telefoonbehuizing S5 | home-control.css:65 |
| `#16202F` | telefoonrand S5 | home-control.css:72 |
| `#01234C` | projectstrook S6, `--pf-strip` | home-proof.css:29 |
| `#042B5C` | hover projectstrook S6 | home-proof.css:316 |
| `#061B36` | KPI-waarde S1 | home-hero.css:369 |
| `#0C1424` | kaartkop S7 + S8 — **4× gemeten, geen token** | home-infra.css:92, :255; home-final.css:247, :294 |
| `#101C3A` | klantnaam S6 | home-proof.css:142 |
| `#16243F` | citaattekst S6 | home-proof.css:275 |
| `#16233F` | zoekicoon S1 | home-hero.css:196 |
| `#17264A` | navigatielinks S1 | home-hero.css:178 |
| `#16325A` | sectoricoon S7 | home-infra.css:241 |
| `#1B2740` | basis-`color` van `.vh-footer` | home-footer.css:24 |
| `#0C1A2C` · `#12233A` · `#1B3350` | HVAC-grafiek S2 | home-solutions.css:309 |
| `#0A2340` · `#071A31` · `#061426` · `#040E1C` | mobiel menuverloop | home-mobile.css:152 |

#### Merkblauw — renderende varianten naast `#0073FE`

| Waarde | Rol | Bron |
|---|---|---|
| `#0071FE` | uitsluitend de stroke van de logo-SVG's — **6 voorkomens, allemaal in index.html** | index.html:131-133, 630-632, 697-699, 1037-1039 |
| `#0062FE` | uitsluitend de drie KPI-iconen S1 | home-hero.css:362 |
| `#0097FE` | uitsluitend eyebrow "Volledige case" op de donkere projectstrook | home-proof.css:332 |
| `#0490FF` | uitsluitend eyebrow S3 + linkhover daar | home-project.css:30 (alias `--pr-eyebrow`) |
| `#4DA3FF` | logostroke bij geopend mobiel menu | home-mobile.css:100 |
| `#7FBBFF` | tekst in de EMS-hub | home-control.css:160 |

#### Lichte blauwen — accent- en tintvlakken (20 waarden, geen token)

`#B6D7FC` · `#B8DCFB` · `#BEDCF9` · `#C9DEF6` · `#D8EAFB` · `#D8EBFC` · `#D8ECFE` · `#DCE7F2` ·
`#DCE7F3` · `#DCE8F4` · `#DEEFFD` · `#DFEDFD` · `#DFEEFE` · `#E1ECF8` · `#E3ECF4` · `#E4F0FC` ·
`#E4F2FC` · `#E5EFFA` · `#E7F2FE` · `#E8F3FE`

Bron: home-hero.css:22, :128, :130 · home-proof.css:56 · home-final.css:28, :49, :70, :198 ·
home-process.css:32, :127 · home-footer.css:29, :56, :354 · home-infra.css:28, :156, :273, :306 ·
home-project.css:40 · home-control.css:30 · home-solutions.css:22

Rollen: icoontegel (`#D8ECFE` S4+S5, `#DEEFFD` S7, `#E8F3FE` S8, `#DFEEFE` S4-kaart),
haarlijn (`#E4F0FC`, `#E5EFFA`, `#DCE7F2`, `#DCE7F3`), knoprand (`#C9DEF6` S8),
beeldlaadkleur (`#DCE8F4`, `#E3ECF4`), gradientstop (`#B6D7FC`, `#D8EBFC`, `#E4F2FC`, `#BEDCF9`,
`#D8EAFB`, `#DFEDFD`), ronde pijlknop (`#E7F2FE` S7), rand nieuwsbriefblok (`#E1ECF8` S9 mobiel).

#### Tekstgrijzen (15 waarden; drie in de tokenlaag, twaalf sectie-literals)

| In de tokenlaag | Sectie-literal |
|---|---|
| `#4C5771` (`--vibe-body`) · `#56627D` (`--vibe-body-zacht`) · `#6F7A95` (`--vibe-sub`) | `#475771` S1 lead+KPI-label (home-hero.css:20) · `#54607A` S6 lead (home-proof.css:26) · `#7C88A2` S6 dd (home-proof.css:27) · `#45527A` S7 kaartregel (home-infra.css:263) · `#4E5876` S7 KPI-label (home-infra.css:27) · `#4A5578` S8 kaarttekst (home-final.css:301) · `#5B6B86` S6 organisatie-subregel (home-proof.css:149) · `#6A768F` S9 legal (home-footer.css:280) · `#8A93A8` S9 KvK/BTW (home-footer.css:290) · `#93A5BC` S3 body op navy (home-project.css:31) · `#C3D2E6` S6 specregel op navy (home-proof.css:348) · `#5F769E` S6 tekstlink (home-proof.css:28) |

Aanvullende muted-waarden binnen het S5-dashboard, alle zonder token: `#C8D8EC` (basistekst,
home-control.css:79), `#6F86A2` (3×), `#7E93AE` (3×), `#9CB2CC` (tijdstempel,
home-control.css:175), `#6B7891` (menuknoplabel, home-mobile.css:131), `#B9C7D8` (chevrons S4,
home-process.css:33).

#### Witschrijfwijzen

`#fff` (32×) · `#FFFFFF` (7×) · `#FFF` (1×, home-proof.css:126) — drie schrijfwijzen voor dezelfde
kleur in één codebase. Daarnaast als gradientstop of vlak: `#FEFEFE`, `#FDFEFF`, `#FDFDFE` (2×),
`#FCFDFF` (KPI-balk S7, home-infra.css:290), `#FCFDFE` (5×), `#FAFCFE` (2×), `#FAFCFD`, `#F7FCFF`,
`#F7FBFE`.

#### Sectievlakken

| Sectie | Achtergrond | Bron |
|---|---|---|
| S1 `.vh` | `#fff` | home-hero.css:14 |
| S2 `.vh-sol` | `#FCFDFE` (literal) | home-solutions.css:13 |
| S3 `.vh-pr` | `var(--vibe-paper)` = `#FCFDFE` | home-project.css:25 |
| S4 `.vh-proc` | `#FCFDFE` (literal) | home-process.css:24 |
| S5 `.vh-ctrl` | `#EFF7FE` — enige merkbaar blauwe sectie | home-control.css:22 |
| S6 `.vh-proof` | `#FAFCFE` | home-proof.css:20 |
| S7 `.vh-infra` | verloop 100deg `#FEFEFE → #FDFDFE → #F6FAFE → #EAF5FE` | home-infra.css:19-20 |
| S8 `.vh-final` | `#FAFCFD` | home-final.css:21 |
| S9 `.vh-footer` | verloop 115deg `#EDF6FD → #F7FBFE → #FDFEFF → #F6FAFE → #EFF7FD` | home-footer.css:20-21 |

S6 (`#FAFCFE`) en S8 (`#FAFCFD`) verschillen één eenheid in het blauwe kanaal.

#### Scrims over beeld

Vijf verschillende donkerblauwe basissen, geen gedeelde definitie: `rgba(4,20,44,…)` S1
(home-hero.css:81, :455) · `rgba(3,20,44,…)` S2 + S7 (home-solutions.css:176-198, :426-449;
home-infra.css:177-181) · `rgba(0,22,50,…)` / `rgba(0,18,42,…)` S3 (home-project.css:74-82, :247) ·
`rgba(8,32,60,…)` S8 (home-final.css:77, :385) · `rgba(10,38,74,…)` S9 (home-footer.css:73).
**S6 `.vh-proof-foto` (home-proof.css:218-234) heeft als enige foto géén scrim.**

---

## 3. TYPOGRAFIE

### 3.0 Het cqw-omrekensysteem

De pagina draait volledig op één letter: **Urbanist**, gezet op `html,body` (home.css:83) en op
`h1,h2,h3` (home.css:105). De `<head>` laadt vier families (Archivo, IBM Plex Sans, JetBrains Mono,
Urbanist — index.html:35-37); de andere drie renderen alleen in door scripts geïnjecteerde
overlays (`_consent.js`, `_leadpopup.js`, `_footer.js`), niet in de homepagesecties.

**Runtime-regel.** Alle negen secties dragen `container-type: inline-size` en zijn `width:100%`
zonder `max-width`. Daarmee is de containerbreedte gelijk aan de bodybreedte en geldt voor élk
cqw-getal in élk sectiebestand dezelfde conversie:

> **1cqw = 1 % van de sectiebreedte. Bij viewport 1774 px: 1cqw = 17,74 px.**

Bronnen: home-hero.css:11, home-solutions.css:10, home-project.css:20, home-process.css:20,
home-control.css:17, home-proof.css:15, home-infra.css:14, home-final.css:16, home-footer.css:15.

**Herkomstdocumentatie per sectie.** Elk bestand documenteert in zijn kopcommentaar een eigen
referentiecanvas met een eigen ref-px→cqw factor. Die factoren verschillen; **runtime telt alleen
de cqw-waarde.**

| Secties | Referentiecanvas | Schaalfactor | 1 ref-px = | Bron |
|---|---|---|---|---|
| S1, S2, S6, S7 | 1774 × 887 | ×1,0000 | `0,0563698cqw` | home-hero.css:4-7; home-solutions.css:3-5; home-proof.css:5-7; home-infra.css:5-6 |
| S3 | 2070 × 760, paneel 2056 × 682 | ×0,8288 | `0,046719cqw` | home-project.css:5-14 |
| S4, S5 | 1536 breed, inhoud 1401 ref = 1638 site | ×1,16917 | `0,0659058cqw` | home-process.css:5-14; home-control.css:7-11 |
| S8, S9 | 2103 × 748 | ×0,84356 | `0,047551cqw` | home-final.css:5-10; home-footer.css:5-7 |

Controle: `0,046719 × 17,74 = 0,8288` ✓ · `0,0659058 × 17,74 = 1,1692` ✓ ·
`0,0563698 × 17,74 = 1,0000` ✓ · `0,047551 × 17,74 = 0,84356` ✓.

**Niet gebruiken:** er is **geen gedeelde ref-px-eenheid**. Eén ref-px in S4 is 1,169 site-px, in S3
0,829 site-px — 41 % verschil. Reken nooit een maat uit de ene sectie in de ref-px van een andere om.

**Onder 1200 px vervalt het cqw-systeem.** `home-mobile.css` neemt over met een px/clamp-ladder
(§2a, `--m-*`). Dat is de **enige gedeelde typografieschaal die het project heeft**, en hij bestaat
alleen onder 1200 px.

**Bekend gat in de vertaling.** Van de 15 `box-shadow`-declaraties zijn er 13 in cqw gesteld; slechts
twee krijgen onder 1200 px een px-equivalent (home-control.css:314, home-infra.css:402). Op een
390 px-container is 1cqw = 3,9 px in plaats van 17,74 px — de overige schaduwen krimpen met factor
4,5 (§5.5). Ook `.vh-ctrl-hub` (home-control.css:154-163: `width/height 2.6cqw`, `font-size .50cqw`,
`box-shadow 0 0 1.1cqw`) heeft **geen enkele media-query-override** terwijl `.vh-ctrl-mid` in de
tabletband terugkeert (home-control.css:372).

### 3.1 Tekststijlen

Alle desktopwaarden in `cqw` én in px @1774. Mobiel = `<768px`, tablet = `768-1199px`.

#### Eyebrow (negen instanties)

| Instantie | Desktop `font-size` | px @1774 | `line-height` | Gewicht | `letter-spacing` | Casing | Kleur | Mobiel + tablet | Bron |
|---|---|---|---|---|---|---|---|---|---|
| S1 `.vh-eyebrow` | `.9244cqw` | 16,40 | `1.2965cqw` = 23,00 px | 600 | `.092em` | uppercase | `var(--vh-blauw)` | 11,5 px / lh `1.45` / `.14em` | home-hero.css:249-257; :413 |
| S2 `.vh-sol-eyebrow` | `1.0259cqw` | 18,20 | `1` | 700 | `.175em` | uppercase | `var(--sol-blauw)` | 11,5 px / `.14em` | home-solutions.css:37-45; :340 |
| S3 `.vh-pr-eyebrow` | `.9344cqw` | 16,58 | `1` | 700 | `.045em` | uppercase | `var(--pr-eyebrow)` `#0490FF` | 11,5 px / `.14em` | home-project.css:108-116; :263 |
| S4 `.vh-proc-eyebrow` | `.9526cqw` | 16,90 | `1` | 700 | `.050em` | uppercase | `var(--pc-blauw)` | 11,5 px / `.14em` | home-process.css:63-71; :220 |
| S5 `.vh-ctrl-eyebrow` | `.9470cqw` | 16,80 | `1` | 700 | `.022em` | **geen transform** | `var(--ct-blauw)` | 11,5 px / `.14em` | home-control.css:202-209; :304 |
| S6 `.vh-proof-eyebrow` | `.8681cqw` | 15,40 | `1` | 700 | `.133em` | **geen transform** | `var(--pf-blauw)` | 11,5 px / `.14em` | home-proof.css:68-75; :394 |
| S6b `.vh-proof-eyb2` | `1.0147cqw` | 18,00 | `1` | 700 | `.101em` | **geen transform** | `var(--pf-blauw)` | 11,5 px / `.14em` | home-proof.css:162-169; :420 |
| S7 `.vh-infra-eyebrow` | `.9470cqw` | 16,80 | `1` | 700 | `.137em` | **geen transform** | `var(--if-blauw)` | 11,5 px / `.14em` | home-infra.css:41-48; :353 |
| S8 `.vh-final-eyebrow` | `.9244cqw` | 16,40 | `1` | 700 | `.134em` | **geen transform** | `var(--fi-blauw)` | 11,5 px / `.14em` | home-final.css:137-143; :342 |

Acht desktopgraden tussen 15,40 en 18,20 px en acht `letter-spacing`-waarden tussen `.022em` en
`.175em` (factor 8). **Onder 1200 px convergeren alle negen op `var(--m-eyebrow)` = 11,5 px +
`.14em`** — de sterkste systeemregel van de mobiele laag. S5 t/m S8 hebben géén `text-transform`;
bij S6 rendert de eyebrow daardoor als enige in zinsvorm (de HTML op index.html:797 staat in
zinsvorm, bij S5/S7/S8 staan er al kapitalen in de content).

De projectstrook-eyebrow `.vh-proof-strip-eyb` valt buiten deze reeks: `letter-spacing .22em`,
kleur `#0097FE` (home-proof.css:331-332).

#### Kop — H1 en H2

| Instantie | Desktop `font-size` | px @1774 | `line-height` | px | Gewicht | `letter-spacing` | Kleur | Mobiel | Tablet | Bron |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 `.vh-h1` (enige `<h1>`) | `4.3100cqw` | 76,46 | `4.1150cqw` | 73,00 | 700 | `-.004em` | `var(--vh-navy)` `#071D3A` | `--m-h1` `clamp(34px,9.1vw,44px)` / lh `1.04` / `-.02em` | `clamp(46px,6.4vw,58px)` / lh `1.04` / `-.02em` | home-hero.css:258-266; :415-421 |
| S2 `.vh-sol-kop` | `3.4667cqw` | 61,50 | `3.4104cqw` | 60,50 | 700 | `-.012em` | `var(--sol-navy)` | `--m-h2` / lh `1.08` / `-.018em` | idem, token schaalt mee | home-solutions.css:46-54; :341-345 |
| S3 `.vh-pr-titel` | `3.2875cqw` | 58,32 | `1` | 58,32 | 700 | `-.008em` | `#fff` | `--m-h2` / lh `1.06`, **geen tracking-override** | idem | home-project.css:117-125; :264 |
| S4 `.vh-proc-kop` | `3.6100cqw` | 64,04 | `4.0857cqw` | 72,48 | 700 | `-.012em` | `var(--pc-navy)` | `--m-h2` / lh `1.08` / `-.018em` | idem | home-process.css:72-80; :221-222 |
| S5 `.vh-ctrl-kop2` | `3.0440cqw` | 54,00 | `3.0327cqw` | 53,80 | 700 | `-.012em` | `var(--ct-navy)` | `--m-h2` / lh `1.08` / `-.018em` | idem | home-control.css:210-218; :305-306 |
| S6 `.vh-proof-kop` | `2.9875cqw` | 53,00 | `2.9312cqw` | 52,00 | 700 | `-.012em` | `var(--pf-navy)` | `--m-h2` / lh `1.08` / `-.018em` | idem | home-proof.css:76-84; :395-396 |
| S7 `.vh-infra-kop` | `3.4386cqw` | 61,00 | `3.2694cqw` | 58,00 | 700 | `-.015em` | `var(--if-navy)` | `--m-h2` / lh `1.08` / `-.018em` | idem | home-infra.css:49-57; :354-355 |
| S8 `.vh-final-kop` | `3.7205cqw` | 66,00 | `3.6000cqw` | 63,86 | 700 | `-.016em` | `var(--fi-navy)` | **eigen clamp** `clamp(32px,8.6vw,41px)` / lh `1.05` / `-.02em` | `clamp(42px,5.6vw,52px)` | home-final.css:145-153; :343-349, :419 |

Zeven H2's, zeven graden van 53,00 tot 66,00 px, vier `letter-spacing`-waarden. **Geen ervan is
kanoniek; er bestaat geen H2-token.** De code documenteert drie van de keuzes expliciet:
"grootste H2 van de pagina" (home-final.css:148), "74,2 → 64 px: concurreert niet meer met de
hero-H1" (home-process.css:75), "52 → 47 px: duidelijk secundair aan de sectiekop"
(home-proof.css:173).

S8 breekt onder 1200 px bewust uit `--m-h2` met een eigen clamp zodat de slotkop (32-41 px) net
onder de hero-H1 (34-44 px) blijft — `--m-h2` zou hem op 27-34 px zetten en de hiërarchie omdraaien.

#### Kop — H3 en vetgezette kaarttitels

| Instantie | Desktop | px @1774 | `line-height` | Gewicht | `letter-spacing` | Kleur | Mobiel + tablet | Bron |
|---|---|---|---|---|---|---|---|---|
| S6 `.vh-proof-kop2` | `2.6493cqw` | 47,00 | `2.4804cqw` = 44,00 | 700 | `-.014em` | `var(--pf-navy)` | 25 px / lh `1.14` — gebruikt `--m-h2` noch `--m-h3` | home-proof.css:170-178; :421-422 |
| S4 `.vh-proc-kaart h3` | `1.1218cqw` | 19,90 | `1.4487cqw` = 25,70 | 700 | `-.004em` | `#08203C` | 16,5 px / lh 22 px | home-process.css:133-140; :242 |
| S4 `.vh-proc-stap h3` | `1.0541cqw` | 18,70 | `1.1838cqw` = 21,00 | 700 | `-.004em` | `#08203C` | 17,5 px / lh 22 px | home-process.css:180-187; :285 |
| S5 `.vh-ctrl-kop` | `.80cqw` | 14,19 | `1` | **600** | `-.012em` **geërfd** uit home.css:107 | `#E6EFFA` | 15 px | home-control.css:119; :325 |
| S2 `.vh-sol-mod h3` | `1.0372cqw` | 18,40 | `1.30` | 700 | `-.004em` | `#fff` | `--m-h3` 19 px, daarna overschreven: `--bat/--laad/--onder` 16 px, `--handel` 17 px; tablet alle 17 px | home-solutions.css:209-216; :403, :421-424, :475-478 |
| S2 `.vh-sol-mod--zon h3` | `1.4995cqw` | 26,60 | `1.30` | 700 | `-.004em` | `#fff` | tablet 21 px / lh 26 px | home-solutions.css:242; :477 |
| S7 `.vh-infra-kaart-tx b` | `1.0485cqw` | 18,60 | `1` | 700 | — | `#0C1424` | 15,5 px (mobiel lh 19 px) | home-infra.css:250-256; :407, :439 |
| S8 `.vh-final-kaart b` | `1.1838cqw` | 21,00 | `1.3529cqw` = 24,00 | 700 | — | `#0C1424` | 18,5 px / lh 24 px | home-final.css:288-295; :410 |

`.vh-ctrl-kop` is de enige H3 met gewicht 600 en de enige kop die zijn `letter-spacing` uit de
basisregel `h1,h2,h3` (home.css:104-111) erft. De laatste twee gebruiken `<b>`, geen heading-element,
en vallen dus buiten `text-wrap:balance` en `overflow-wrap:break-word`. **Er is geen H4-niveau op de
pagina.**

Op mobiel is de proceskaartkop (16,5 px) **kleiner** dan de processtapkop (17,5 px), terwijl hij op
desktop groter is (19,90 vs 18,70 px) — de rangorde draait om.

#### Lead

| Instantie | Desktop | px @1774 | `line-height` | px | Gewicht | Kleur | `max-width` desktop | Mobiel + tablet | Bron |
|---|---|---|---|---|---|---|---|---|---|
| S1 `.vh-lead` | `1.2176cqw` | 21,60 | `1.7052cqw` | 30,25 | 400 | `#475771` | `25.93cqw` = 460 px | `--m-lead` / lh `1.55` / **34ch** | home-hero.css:268-275; :422-427 |
| S2 `.vh-sol-lead` | `1.2458cqw` | 22,10 | `1.5896cqw` | 28,20 | 400 | `var(--sol-grijs)` `#56627D` | `22.5479cqw` = 400 px | `--m-lead` / `1.55` / 36ch; tablet 52ch | home-solutions.css:57-64; :348-353, :460 |
| S4 `.vh-proc-lead` | `1.3316cqw` | 23,62 | `1.7793cqw` | 31,56 | 400 | `var(--pc-body)` | — | `--m-lead` / `1.55` / 36ch | home-process.css:82-88; :223 |
| S5 `.vh-ctrl-lead` | `1.1387cqw` | 20,20 | `1.5841cqw` | 28,10 | 400 | `var(--ct-body)` | — | `--m-lead` / `1.55` / 36ch | home-control.css:220-226; :307 |
| S6 `.vh-proof-lead` | `1.1274cqw` | 20,00 | `1.6347cqw` | 29,00 | 400 | `var(--pf-body)` `#54607A` | — | **`--m-body`** / lh 23 px / 38ch; tablet 52ch | home-proof.css:180-186; :423-424, :473 |
| S7 `.vh-infra-lead` | `1.2120cqw` | 21,50 | `1.6178cqw` | 28,70 | 400 | `var(--if-body)` `#4C5771` | — | `--m-lead` / `1.55` / 36ch | home-infra.css:59-65; :356-357 |
| S8 `.vh-final-lead` | `1.1613cqw` | 20,60 | `1.6178cqw` | 28,70 | 400 | `var(--fi-body)` | — | `--m-lead` / `1.55` / **34ch** | home-final.css:155-161; :350-351 |

Zeven leads, zeven graden (20,00-23,62 px), drie grijzen. **S6 valt als enige terug op `--m-body`
(15,5 px) in plaats van `--m-lead` (16,5 px).** Neem niet aan dat elke `-lead`-klasse op `--m-lead`
uitkomt.

#### Body en kleine body

| Instantie | Desktop | px @1774 | `line-height` | Gewicht | Kleur | Mobiel + tablet | Bron |
|---|---|---|---|---|---|---|---|
| `html,body` basis | **geen `font-size`** → 16 px browserdefault | 16 | — | 400 | `var(--vibe-body)` | — | home.css:80-86 |
| S3 `.vh-pr-body` | `1.1265cqw` | 19,98 | `1.5885cqw` = 28,18 | 400 | `#93A5BC` | `--m-body` / lh 23 px | home-project.css:134-140; :267 |
| S6 `.vh-proof-citaat` | `1.1274cqw` | 20,00 | `1.4938cqw` = 26,50 | 400 | `#16243F` | `--m-body` / lh 23 px | home-proof.css:270-276; :448 |
| S9 `.vh-footer-tag` | `1.0260cqw` | 18,20 | `1.4265cqw` = 25,31 | 400 | `var(--ft-body)` | `--m-body` / lh 22 px | home-footer.css:127-133; :314 |
| S2 `.vh-sol-punt b+span` | `.9414cqw` | 16,70 | `1.1274cqw` = 20,00 | 400 | `var(--sol-grijs2)` | `--m-body` | home-solutions.css:112-119; :370 |
| S2 `.vh-sol-mod p` | `.9301cqw` | 16,50 | `1.3529cqw` = 24,00 | 400 | `rgba(255,255,255,.90)` | `--m-body`; op `<768` verborgen voor `--bat/--laad/--onder` | home-solutions.css:217-223; :394-396, :404, :480 |
| S2 `.vh-sol-mod--zon p` | `1.0710cqw` | 19,00 | `1.5220cqw` = 27,00 | 400 | `rgba(255,255,255,.90)` | nooit verborgen | home-solutions.css:243 |
| S4 `.vh-proc-stap p` | `.8640cqw` | 15,33 | `1.4487cqw` = 25,70 | 400 | `var(--pc-sub)` | `--m-body` | home-process.css:188-194; :286 |
| S4 `.vh-proc-kaart p` | `.8620cqw` | 15,29 | `1.1838cqw` = 21,00 | 400 | `var(--pc-sub)` | `--m-body` | home-process.css:141-147; :243 |
| S5 `.vh-ctrl-feat b+span` | `.9470cqw` | 16,80 | `1.2514cqw` = 22,20 | 400 | `var(--ct-sub)` | **14 px**, niet `--m-body` | home-control.css:250-257 |
| S7 `.vh-infra-kaart-tx b+span` | `.9019cqw` | 16,00 | `1.3529cqw` = 24,00 | 400 | `#45527A` | **13 px**, niet `--m-body` | home-infra.css:257-264 |
| S8 `.vh-final-kaart p` | `.9244cqw` | 16,40 | `1.2402cqw` = 22,00 | 400 | `#4A5578` | `--m-body` | home-final.css:296-302; :412 |

**Er is geen `--vibe-body-size`.** De bodygraad bestaat op desktop alleen per sectie; onder 1200 px
is `var(--m-body)` de gedeelde graad (10 gebruikspunten).

#### Metadata en specregel

| Instantie | Desktop | px @1774 | `line-height` | Kleur | Mobiel | Bron |
|---|---|---|---|---|---|---|
| S6 `.vh-proof-strip-tx span.spec` | `.8455cqw` | 15,00 | `1` | `#C3D2E6` | 13,5 px | home-proof.css:342-349; :464 |
| S6 `.vh-proof-org span` | `.7891cqw` | 14,00 | `1.3` | `#5B6B86` | 12 px | home-proof.css:144-150; :417 |
| S6 `.vh-proof-cijfers dd` | `.7891cqw` | 14,00 | `1.25` | `var(--pf-sub)` | 12,5 px | home-proof.css:289-294; :455 |
| S9 `.vh-footer-contact` | `.9019cqw` | 16,00 | `1.1274cqw` = 20,00 | `var(--ft-body)` | 15 px / lh 21 px | home-footer.css:147-153; :319 |
| S9 `.vh-footer-legal` | `.8455cqw` | 15,00 | `1.2402cqw` = 22,00 | `#6A768F`; `.reg` `#8A93A8` | 13 px / lh 20 px | home-footer.css:268-290; :387-393 |

#### Bewijsstrook — vier onafhankelijke specificaties

| Instantie | Waarde-graad desktop | Kwalificatie desktop | Kleur waarde | Mobiel / tablet | Bron |
|---|---|---|---|---|---|
| S1 `.vh-kpi-getal` / `-label` | `max(19px, 1.5784cqw)` = **28,00** / lh `1.18` / 700 / `-.004em` / `text-wrap:balance` | `max(13.5px, .9019cqw)` = **16,00** / lh `1.3` / 400 | `#061B36` | `<768`: 23 px / 13 px · 860-1199: 17 px / 13 px · **768-859: 16,5 px + `max-width:15ch` / 12,5 px** | home-hero.css:368-382; :488-492, :520-521, :529-533 |
| S3 `.vh-pr-metric b` / `span` | `1.6024cqw` = **28,43** / lh `1.2149cqw` / 700 / `-.012em` | `.9811cqw` = **17,40** / lh `1` / 400 | `#fff` / `#93A5BC` | 24 px / 13,5 px | home-project.css:153-168; :286-287 |
| S6 `.vh-proof-cijfers dt` / `dd` | `1.1838cqw` = **21,00** / lh `1.15` / 700 | `.7891cqw` = **14,00** / lh `1.25` | `#0073FE` (literal, home-proof.css:287) / `var(--pf-sub)` | 19 px / 12,5 px | home-proof.css:283-294; :454-455 |
| S6 `.vh-proof-strip-tx b` / `span.spec` | `1.2402cqw` = **22,00** / lh `1` / 700 | `.8455cqw` = **15,00** / lh `1` | `#fff` / `#C3D2E6` | 18 px / 13,5 px | home-proof.css:334-349; :463-464 |

`max(19px, …)` en `max(13.5px, …)` zijn **de enige twee `max()`-vloeren in de hele homepage-CSS**.
Rekenkundig: `19 / 0,015784 = 1203,8 px` en `13,5 / 0,009019 = 1496,8 px`. Omdat de media query pas
bij ≤1199 ingrijpt, werkt de vloer van het getal alleen in de band 1200-1203,8 px en die van het
label in 1200-1496,8 px. Het is een vangnet voor de overgangsband net bóven het breekpunt, geen
mobiel vangnet.

#### CTA-typografie en -vorm

| Klasse | `font-size` desktop | px | Gewicht | `letter-spacing` | Hoogte | Breedte | Radius | Mobiel + tablet | Bron |
|---|---|---|---|---|---|---|---|---|---|
| `.vh-btn` (S1) | `1.0147cqw` | 18,00 | 600 | `-.002em` | `3.5513cqw` = 63,00 px (`.vh-cta`-instantie 62,00) | 228 / 249 px | `.5637cqw` = 10,00 | 16 px / `var(--m-btn-h)` / radius 10 px / `space-between` | home-hero.css:207-222, :281-282; :430-440 |
| `.vh-sol-cta` (S2) | `1.0147cqw` | 18,00 | 600 | — | `3.5513cqw` = 63,00 | `16.0090cqw` = 284,00 | `var(--sol-radius)` = 10,00 | idem | home-solutions.css:66-83; :354-364 |
| `.vh-pr-knop` (S3) | `1.0138cqw` | 17,98 | 600 | — | `3.6908cqw` = 65,47 | `13.2215cqw` = 234,55 | `.5139cqw` = **9,12** | idem | home-project.css:176-192; :290-295 |
| `.vh-ctrl-cta` (S5) | `.9583cqw` | 17,00 | 600 | — | `2.8355cqw` = **50,30** | `13.7767cqw` = 244,40 | `.6595cqw` = **11,70** | idem | home-control.css:259-276; :354-363 |
| `.vh-proof-cta` (S6) | `.9583cqw` | 17,00 | 600 | — | `3.7768cqw` = **67,00** | `17.4746cqw` = 310,00 | `.5637cqw` = 10,00 | idem | home-proof.css:187-211; :425-430 |
| `.vh-infra-cta` (S7) | `1.0147cqw` | 18,00 | 600 | — | `3.7768cqw` = **67,00** | `12.4013cqw` = 220,00 | `.5637cqw` = 10,00 | idem | home-infra.css:110-127; :370-374 |
| `.vh-final-cta` (S8) | `.9583cqw` | 17,00 | 600 | — | `3.5663cqw` = 63,27 | `17.7366cqw` = 314,65 | `.6657cqw` = **11,81** | idem | home-final.css:170-187; :353-357 |
| `.vh-final-cta2` (S8, secundair) | `.9583cqw` | 17,00 | 600 | — | `3.5663cqw` = 63,27 | `15.0737cqw` = 267,41 | `.6657cqw` = 11,81 | idem | home-final.css:189-207 |
| `.vh-btn-secundair` (S1) | `1.0147cqw` | 18,00 | 600 | `-.002em` | 62,00 | 249 px | `.5637cqw` = 10,00 | idem, rand blijft 1,5 px | home-hero.css:230-235 |
| `.vh-footer-nb-cta` (S9) | `.9019cqw` | **16,00** | 600 | — | `3.3289cqw` = 59,06 | `17.0011cqw` = 301,60 | `.5637cqw` = 10,00 | idem | home-footer.css:218-235; :359-364 |

**Vier desktopgraden** (16,00 / 17,00 / 17,98 / 18,00 px) en **vier desktopradii**
(9,12 / 10,00 / 11,70 / 11,81 px). Alleen `.vh-btn` heeft `letter-spacing`; de overige zeven erven
`normal`. Knophoogte desktop loopt van 50,30 px (S5) tot 67,00 px (S6/S7).

**Onder 1200 px convergeert alles.** Acht secties herhalen letterlijk dezelfde zeven declaraties:
`box-sizing:border-box` · `width:100%` · `height:var(--m-btn-h)` · `padding:0 20px` ·
`font-size:16px` · `border-radius:10px` · `justify-content:space-between`, plus `svg 19×19px`
(home-hero.css:430-440, home-solutions.css:354-364, home-project.css:290-295,
home-control.css:354-363, home-proof.css:425-430, home-infra.css:370-374, home-final.css:353-357,
home-footer.css:359-364). **Geen gedeelde klasse — alleen herhaling per namespace.**
De mobiele radius 10 px is **niet** `var(--m-radius)` (= 14 px).

Op tablet wordt `width:auto` met een per-sectie `min-width`: S1 232 · S2 280 · S3 250 · S5 280 ·
S6 280 · S7 240 · S8 250 · S9 260 px (home-hero.css:499, home-solutions.css:459,
home-project.css:306, home-control.css:375, home-proof.css:472/485, home-infra.css:445,
home-final.css:421, home-footer.css:419).

#### Tekstlink-CTA (vijf instanties)

| Klasse | Desktop | px | Gewicht | Kleur | Hover | Mobiel | Bron |
|---|---|---|---|---|---|---|---|
| `.vh-pr-link` (S3) | `1.0138cqw` | 17,98 | 500 | `#fff` | `var(--pr-eyebrow)` `#0490FF` + gap-animatie | 15,5 px / `min-height:44px` | home-project.css:196-210; :296-297 |
| `.vh-proof-alle` (S6) | `1.0429cqw` | 18,50 | 500 | `--pf-slate` `#5F769E` | `--pf-blauw` | `display:none` | home-proof.css:87-103; :400 |
| `.vh-proof-strip-cta` (S6) | `.9019cqw` | 16,00 | 500 | `#fff` | — | 14,5 px | home-proof.css:350-361; :465-466 |
| `.vh-infra-cta2` (S7) | `1.0147cqw` | 18,00 | 600 | `--if-blauw` | `opacity .78` | 15,5 px / `min-height:44px` | home-infra.css:130-143; :374-375 |
| `.vh-final-kaart-link` (S8) | `.9188cqw` | 16,30 | 600 | `--fi-blauw` | — | `display:none` | home-final.css:303-317, :339 |

Alleen `.vh-proof-strip-cta` is onderstreept (`text-underline-offset: .2255cqw` = 4,00 px,
home-proof.css:360).

#### Logo, navigatie, legal

| Instantie | Desktop | px | Gewicht | `letter-spacing` | Kleur | Mobiel / tablet | Bron |
|---|---|---|---|---|---|---|---|
| Header `.vh-logo-vibe` | `1.1273cqw` | 20,00 | 800 | `.003em` | `#071D3A` | 16 px / 19 px; lh daarna `1.05` uit home-mobile.css:214 | home-hero.css:152-159; home-mobile.css:104, :200, :214 |
| Header `.vh-logo-energy` | `.9639cqw` | 17,10 | 400 | `.040em` | `--vh-grijs-licht` `#4E5C78` | 13,5 px + `.09em` / 16 px; lh `1.12` uit home-mobile.css:215 | home-hero.css:160-166; home-mobile.css:105, :201, :215 |
| Footer `.vh-footer-logo-vibe` | `1.8069cqw` | 32,05 | **700** | `.012em` | `--ft-navy` `#0C1B33` | 21 px / lh 20 px | home-footer.css:113-120; :312 |
| Footer `.vh-footer-logo-energy` | `1.5220cqw` | 27,00 | 400 | `.075em` | `--ft-navy` | 17,5 px / lh 20 px | home-footer.css:121-126; :313 |
| `.vh-nav a` | `.8737cqw` | 15,50 | 600 | — | `#17264A` | `display:none` onder 1200 | home-hero.css:175-184 |
| Mobiel menu `nav a` | — | — | 700 | `-.015em` | `#fff` | `clamp(25px,6.8vw,32px)`; tablet 34 px | home-mobile.css:164-177, :203 |
| `.vh-footer-nav b` | `1.1274cqw` | 20,00 | 700 | `-.004em` | `--ft-navy` | 15,5 px | home-footer.css:167-174; :335 |
| `.vh-footer-nb b` | `1.2740cqw` | 22,60 | 700 | `-.004em` | `--ft-navy` | 18,5 px | home-footer.css:203-210; :356 |
| `.vh-footer-nav ul a` | `.9696cqw` | 17,20 | 400 | — | `--ft-body` | 14,5 px / `min-height:40px`; **`line-height` effectief `1.35`** | home-footer.css:183-191, :342-346; home-mobile.css:218 |

Header- en footerlogo zijn **typografisch niet identiek**: gewicht 800 vs 700, tracking
`.003/.040em` vs `.012/.075em`, kleuren `#071D3A`/`#4E5C78` vs `#0C1B33` voor beide delen.

De mobiele regelhoogte van de footerlink is **1,35 (≈19,58 px), niet 19 px**: home-mobile.css:218
laadt later dan home-footer.css:344 bij gelijke specificiteit en wint.

#### Regelafbreking

- `text-wrap:balance` op twee plekken: `h1,h2,h3` (home.css:109, geldt voor alle 21 koppen) en
  `.vh-kpi-getal` (home-hero.css:374). **Geen `text-wrap:pretty`**, geen balance op leads of body.
- `overflow-wrap:break-word` op `h1,h2,h3` (home.css:110). Koppen die als `<b>`/`<span>` zijn
  gemarkeerd (`.vh-kpi-getal`, `.vh-infra-kaart-tx b`, `.vh-footer-nav b`) vallen hierbuiten.
- **28 `br{display:none}`-regels**, alle binnen `@media (max-width:1199px)`: hero 3
  (home-hero.css:414, :421, :428), solutions 2 (:347, :405), project 2 (:266, :268), process 4
  (:222, :224, :244, :287), control 3 (:306, :308, :353), proof 4 (:396, :422, :424, :449), infra 3
  (:355, :357, :409/:410 — letterlijk duplicaat), final 4 (:349, :351, :411, :413), footer 2
  (:315, :358). De desktopcomposities zetten hun regelbreuken hard in de HTML (43 `<br>` in
  index.html).
- **Twee gaten:** `<br>` blijft staan onder 1200 px bij `.vh-proc-kaart h3` (index.html:546) en
  `.vh-footer-nb b` (index.html:1104). De analoge `.vh-final-kaart b` *is* wél onderdrukt
  (home-final.css:411).
- **Twee no-ops:** `.vh-proof-lead br` (home-proof.css:424) en `.vh-proof-citaat br` (:449) —
  index.html:833 en :847 bevatten 0 `<br>`.

---

## 4. SPACING

### 4.1 Gutters — desktop (≥1200 px)

Er is **geen gedeelde wrapper, geen `max-width` en geen paginabrede gutter-variabele**. Elke sectie
verankert haar marge op het referentiecanvas waaruit zij is gereconstrueerd.

| Sectie | Links | px @1774 | Rechts | px @1774 | Bron |
|---|---|---|---|---|---|
| S1 header + `.vh-copy` | `4.6787cqw` | **83,00** | `4.0586cqw` | 72,00 | home-hero.css:144-145, :246 |
| S1 KPI-strook | `width:98.084cqw; margin:0 auto` | 16,99 per zijde | idem | 16,99 | home-hero.css:336-338 |
| S2 `.vh-sol-inner` | `3.9459cqw` | **70,00** | `3.7204cqw` | 66,00 | home-solutions.css:29 |
| S3 `.vh-pr-panel` | `3.9459cqw` | **70,00** | geen — paneel bleedt naar rechts | — | home-project.css:49 |
| S4 kopkolom | `3.9459cqw` | **70,00** | — | — | home-process.css:59 |
| S4 stappenrij | `5.2987cqw` | 94,00 | `5.4115cqw` | 96,00 | home-process.css:155 |
| S5 `.vh-ctrl-copy` | tekstkolom start `55.350cqw`; apparatenblok `11.3924cqw` = 202,08 | — | `3.7204cqw` | 66,00 | home-control.css:55, :198, :200 |
| S6 | `4.3968cqw` | 78,00 | `4.2841cqw` | 76,00 | home-proof.css:64, :89 |
| S6 CTA | `4.5078cqw` | 79,97 | — | — | home-proof.css:193-194 |
| S7 | `4.1150cqw` | 73,00 | geen | — | home-infra.css:36 |
| S8 copy | `4.9929cqw` | **88,57** | — | — | home-final.css:132 |
| S8 bewijsrij | `4.9453cqw` | 87,73 | — | — | home-final.css:214 |
| S9 (merk, lijn, legal) | `4.7551cqw` | 84,36 | `4.7551cqw` | 84,36 | home-footer.css:105, :261-262, :270-271 |

S9 is de **enige sectie met een symmetrische desktopmarge**. S8 heeft de grootste linkermarge, en
twee blokken onder elkaar verschillen daar 0,84 px. Binnen S4 staan twee verschillende linkerankers
(70 px kop, 94 px stappenrij).

De bestandskoppen van S3 en S4 noemen 70/66 px "de containermarges van de site"
(home-project.css:8-9, home-process.css:7-8), en home-process.css:59 zegt letterlijk
"70px, gelijk aan sectie 1-3" — maar S1 staat gemeten op 83 px. **Vijf van de negen secties volgen
de gedocumenteerde marge niet** (S1 83, S6 78, S7 73, S8 88,6, S9 84,4). Zie §8-10 (DECIDED — V1.0).

### 4.2 Gutters — onder 1200 px

Eén token, paginabreed: `--m-gutter` = `clamp(20px, 5.4vw, 24px)` (home-mobile.css:16), in de
tabletband `clamp(32px, 5vw, 48px)` (home-mobile.css:36). **36 toepassingen in 11 bestanden**, altijd
binnen een `max-width:1199`-blok. Geen sectie zet een eigen paddingwaarde ernaast.

Berekend: 360 px → 20,00 · 390 px → 21,06 · 414 px → 22,36 · 430 px → 23,22 · ≥445 px → 24,00.
Tablet: 768 px → 38,40 · 900 px → 45,00 · ≥960 px → 48,00.

### 4.3 Sectie-spacing

**Desktop: er is geen sectie-paddingsysteem.** Zes van de negen secties zijn vaste-hoogte-vlakken met
absoluut gepositioneerde inhoud; de verticale ruimte ontstaat uit de sectiehoogte plus de
`top`-waarden van de kinderen.

| Sectie | Verticale maat desktop | px @1774 | Bron |
|---|---|---|---|
| S1 | `.vh-stage aspect-ratio: 1774/748` (748 px) + `.vh-kpi height 9.0191cqw` (160,00) = 908 | 908 | home-hero.css:38, :330 |
| S2 | **echte padding** boven `4.1714cqw` / onder `3.3258cqw` | 74,00 / 59,00 | home-solutions.css:29 |
| S3 | **echte padding** `5.6369cqw` boven én onder | 100,00 / 100,00 | home-project.css:23 |
| S4 | geen sectiepadding; `.vh-proc-top 22.340cqw` = 396,31, stappenrij `margin-top .9414cqw` = 16,70, `.vh-proc-onder height 3.2074cqw` = 56,90 (leeg `aria-hidden` blok, index.html:609) | — | home-process.css:54, :155, :204 |
| S5 | `height: 33.171cqw` | 588,45 | home-control.css:20 |
| S6 | `height: 50cqw` | 887,00 | home-proof.css:18 |
| S7 | `height: 50cqw` | 887,00 | home-infra.css:17 |
| S8 | `height: 35.5681cqw` | 630,98 | home-final.css:19 |
| S9 | `height: 35.5681cqw` | 630,98 | home-footer.css:17 |

Alleen S2 en S3 hebben echte sectiepadding, en die twee komen niet overeen. **Er bestaat op desktop
geen `--sec-y`-achtige variabele.**

**Onder 1200 px: `--m-sec-y`.** Mobiel 44 px (home-mobile.css:20), tablet 64 px (:37), 12
toepassingen. Deze waarde is in commit aae26bf verlaagd van 56 → 44 px (mobiel) en 76 → 64 px
(tablet), met de motivatie in de code (home-mobile.css:17-19):
> "56 px boven én onder betekende 112 px tussen twee secties op een scherm van 390 px breed. 44 px
> houdt de secties duidelijk gescheiden en haalt ruim 150 px uit de pagina."

Toepassing per sectie: S1 alleen onder (home-hero.css:472) · S2 boven+onder
(home-solutions.css:336) · S3 alleen onder (home-project.css:259) · S4 boven+onder
(home-process.css:216) · S5 boven+onder (home-control.css:295) · S6 boven op deel A + onder op
deel B (home-proof.css:378, :381) · S7 boven+onder (home-infra.css:348) · S8 boven +
`calc(var(--m-sec-y) + 6px)` onder (home-final.css:330) · S9 boven + **vaste 26 px** onder
(home-footer.css:303, :409).

S1 opent op mobiel met `padding-top: calc(64px + 34px)` = 98 px, op tablet `calc(76px + 48px)` =
124 px — dat rekent letterlijk met de headerhoogte van die band (home-mobile.css:74, :198) plus
lucht (home-hero.css:402, :496).

### 4.4 Grid gaps

| Sectie | Desktop | Mobiel `<768` | Tablet `768-1199` | Bron |
|---|---|---|---|---|
| S1 KPI | `repeat(3,1fr)`, **geen gap** (scheiding via `::before`) | `minmax(0,1fr)`, gap 14 px | `repeat(3,minmax(0,1fr))`, gap 20 px; **768-859: gap 16 px** | home-hero.css:336-341, :482-484, :507-511, :529-533 |
| S2 buitenraster | `28.5231cqw 63.8670cqw` (506 \| 1133 px), geen gap | `1fr` | — | home-solutions.css:27-28, :335 |
| S2 moduleraster | cols `27.4521 / 17.0237 / 16.4600cqw` (487 \| 302 \| 292); rows `28.0722 / 12.9651cqw` (498 \| 230); **column-gap `1.4656cqw` = 26,00 px; row-gap `1.2965cqw` = 23,00 px** | `1fr 1fr`, gap 10 px | 768-1023: gap 16 px · **1024-1199: `repeat(3,1fr)`, gap 18 px** | home-solutions.css:126-134, :376-382, :464-465, :491-498 |
| S2 onderrij | `20.9132 / 19.8985 / 20.0113cqw` (371 \| 353 \| 355), column-gap 26,00 px | `1fr 1fr`, gap 10 px | `repeat(3,1fr)`, gap 16/18 px | home-solutions.css:140-143, :383-387 |
| S2 voordeelpunten | `2.2547cqw 1fr` (40 px icoon), column-gap `2.5366cqw` = 45,00 px | `30px 1fr`, column-gap 14 px | `repeat(3,1fr)`, gap 20 px | home-solutions.css:97-99, :366, :461 |
| S3 metrics | flex, scheiding via border | `1fr 1fr`, **gap 0**, derde `1/-1` | `repeat(3,1fr)` | home-project.css:143-147, :271-283, :303-304 |
| S4 stappen | flex `space-between`, stap `16.4644cqw` = 292,08 px | `column`, **gap 0** + tijdlijn-`::before` | `1fr 1fr`, column-gap 34 px | home-process.css:152-166, :247-252, :295 |
| S4 stap intern | — | `36px 1fr`, column-gap 14 px | idem, padding-bottom 28 px | home-process.css:260-266, :297 |
| S5 dashboard | `7.4cqw 1fr` | `1fr` (rail verborgen) | `150px 1fr` | home-control.css:104, :322-323, :367-368 |
| S5 tegels | `repeat(3,1fr)`, gap `.62cqw` = 11,00 px | gap 8 px | — | home-control.css:122, :327 |
| S5 stroom | `1fr 5.2cqw 1fr`, gap `.5cqw` | `1fr`, gap 10 px | `1fr 70px 1fr` | home-control.css:132, :331, :371 |
| S5 kenmerken | `repeat(4,minmax(0,1fr))`, **geen gap** | `1fr 1fr`, gap 22 px 16 px | `repeat(4,1fr)` | home-control.css:228-232, :347, :374 |
| S6 cijfers | `1fr 1fr`, gap `.9019cqw 1.1274cqw` = 16,00 / 20,00 px | gap 12 px 14 px | — | home-proof.css:277-282, :450-453 |
| S6 klantnamen | flex, gap `1.1274cqw` = 20,00 px | `1fr 1fr`, gap 10 px | `repeat(2,minmax(0,300px))`, gap 14 px | home-proof.css:105-116, :402-410, :488 |
| S6 deel B | absoluut | flex-column | `1fr 1fr`, column-gap 22 px | home-proof.css:475-485 |
| S7 KPI-balk | `297fr 278fr 288fr 237fr`, scheiding via border | `1fr 1fr` | `repeat(4,1fr)` | home-infra.css:293-294, :417, :433 |
| S7 sectorkaarten | **geen grid** — vier absolute kaarten op `top 8.1000 / 16.0677 / 24.0343 / 31.9998cqw` | `1fr 1fr`, gap 10 px | `repeat(4,1fr)`, gap 14 px | home-infra.css:209-231, :385-390, :437 |
| S7 voordeelrijen | flex, gap `1.9166cqw` = 34,00 px, vaste rijhoogte `4.6223cqw` = 82,00 px | flex, gap 12 px | `repeat(3,1fr)`, gap 20 px | home-infra.css:68-74, :363, :441 |
| S8 bewijsitems | `326fr 355fr 294fr`, **geen gap** | `1fr`, gap 14 px | `repeat(3,1fr)`, gap 20 px | home-final.css:212-223, :359-364, :422 |
| S9 navkolommen | **geen grid** — absoluut op `left 25.6775 / 38.4636 / 50.4041cqw` | `1fr 1fr`, gap 22 px 18 px | `repeat(3,1fr)`, gap 24 px 22 px | home-footer.css:159-166, :326-332, :415 |

Het enige terugkerende grid-idee is **"vier/drie op desktop → twee kolommen op mobiel → volle rij op
tablet"**. Elk raster is verder sectie-uniek.

### 4.5 Kaartpadding

| Kaart | Desktop | px @1774 | Mobiel | Tablet | Bron |
|---|---|---|---|---|---|
| S2 modulekaart | `1.7476cqw 1.8602cqw` | 31,00 / 33,00 | `16px 16px 18px` | `20px 20px 22px` | home-solutions.css:200-207, :399-400, :471-472 |
| S2 zonkaart | idem + `padding-bottom:0` | — | `20px 20px 22px` | `24px 24px 26px` | home-solutions.css:250 |
| S4 inzichtkaart | `1.2000 1.3000 1.7217 1.8453cqw` | 21,29 / 23,06 / 30,54 / 32,74 | `16px 18px 18px` | — | home-process.css:114-123, :237 |
| S6 klantnaamkaart | `.9583cqw 1.4655cqw` | 17,00 / 26,00 | `12px 13px` | `14px 16px` | home-proof.css:117-129, :411-415, :489 |
| S6 resultaatkaart | `2.1430 1.8047 1.9739 2.3685cqw` | 38,02 / 32,02 / 35,02 / 42,02 — **grootste van de pagina** | `20px` rondom | — | home-proof.css:239-254, :436-445 |
| S6 projectstrook | `.9583 1.2402 .9583 1.0147cqw` | 17,00 / 22,00 / 17,00 / 18,00 | `14px` rondom | — | home-proof.css:299-315, :457-460 |
| S7 sectorkaart | **geen padding** — inhoud absoluut (`ic` op `1.2965/1.7475cqw` = 23,00/31,00; `tx` op `7.6663/1.6347cqw` = 136,00/29,00) | — | `14px 14px 12px` | `16px 16px 14px` | home-infra.css:209-222, :400, :438 |
| S8 afspraakkaart | `1.4265 1.4655 1.7876 1.8069cqw` | 25,31 / 26,00 / 31,71 / 32,05 | `18px 18px 20px` | — | home-final.css:261-276, :405 |
| S9 contactblok | **geen padding** — absoluut gepositioneerde tekstkolom, geen kaart | — | `20px 20px 22px` + `#F3F8FE` + `1px #E1ECF8` | — | home-footer.css:196-202, :348-355 |
| S5 console-tegel | `.58cqw .62cqw` | 10,29 / 11,00 | `10px` | — | home-control.css:123-128, :328 |
| S5 console-knoop | `.40cqw .48cqw` | 7,10 / 8,52 | `10px 11px` | — | home-control.css:134-141, :340 |
| S5 console-hoofdvlak | `.9cqw 1.0cqw` | 15,97 / 17,74 | `16px 14px 18px` | — | home-control.css:118, :324 |
| S5 console-balk | `.62cqw .85cqw` | 11,00 / 15,08 | `12px 14px` | — | home-control.css:80-88, :330 |
| S5 console-voet | `.55cqw .85cqw` | 9,76 / 15,08 | `11px 14px` | — | home-control.css:168-174, :344 |

De S5-console is een **mini-designsysteem binnen één sectie**, met een eigen maatladder die een
factor 3 kleiner is dan de rest van de pagina.

S1, S3 en S9 hebben op desktop **geen kaartvlak** — die secties dragen hun inhoud op geometrie en
fotografie.

### 4.6 Verticaal ritme

#### Desktop — eyebrow → kop → lead → CTA

| Sectie | eyebrow | kop `margin-top` | px | lead `margin-top` | px | CTA `margin-top` | px | Bron |
|---|---|---|---|---|---|---|---|---|
| S1 | `margin:0` | `--vh-gap-h1` `1.8936cqw` | 33,59 | `--vh-gap-p` `1.5545cqw` | 27,58 | `--vh-gap-btn` `1.9082cqw` | 33,85 | home-hero.css:26-29, :256, :259, :269, :277 |
| S2 | 0 | `.9583cqw` | 17,00 | `1.2965cqw` | 23,00 | `1.6910cqw` | 30,00 | home-solutions.css:38, :47, :58, :67 |
| S3 | 0 | `.9470cqw` | 16,80 | body `1.0090cqw` | 17,90 | `1.8659cqw` | 33,10 | home-project.css:109, :118, :135, :174 |
| S4 | 0 | `1.1209cqw` | 19,88 | `.8899cqw` | **15,79** | — | — | home-process.css:64, :73, :83 |
| S5 | 0 | `1.1500cqw` | 20,40 | `.9481cqw` | 16,82 | `1.3867cqw` | 24,60 | home-control.css:203, :211, :221, :264 |
| S6 (deel A) | 0 | `1.0710cqw` | 19,00 | — | — | — | — | home-proof.css:69, :77 |
| S6 (deel B) | 0 | `1.1274cqw` | 20,00 | `1.2966cqw` | 23,00 | **absoluut** `left 4.5078cqw / top 21.2223cqw` | — | home-proof.css:163, :171, :181, :187-194 |
| S7 | 0 | `1.0147cqw` | 18,00 | `1.1275cqw` | 20,00 | acties `.9019cqw` | 16,00 | home-infra.css:42, :50, :60, :108 |
| S8 | 0 | `.8513cqw` | **15,10** | `.8454cqw` | 15,00 | acties `1.4772cqw` | 26,20 | home-final.css:138, :146, :156, :168 |

S4 is de enige sectie waar de lead-afstand **kleiner** is dan de kop-afstand. S8 heeft het strakste
kopritme (15,10 px) bij de grootste H2 (66,00 px). S3 zet de statement op `.0620cqw` = **1,10 px**
onder de titel (home-project.css:127) omdat beide samen één kopblok vormen.

#### Mobiel — het gedeelde ritme

Het herhaalde patroon onder 768 px:

| Stap | Declaraties | Bron | Afwijkingen |
|---|---|---|---|
| eyebrow | `margin:0`, `font-size:var(--m-eyebrow)`, `letter-spacing:.14em` | negen secties, zie §3.1 | geen — **9/9** |
| kop | `margin-top:14px`, `font-size:var(--m-h2)`, `line-height:1.08`, `letter-spacing:-.018em` | home-solutions.css:341-345, home-process.css:221, home-control.css:305, home-proof.css:395, home-infra.css:354 | **5/9 exact.** S1 14 px / `1.04` / `-.02em` (home-hero.css:415-420) · S8 14 px + eigen clamp / `1.05` / `-.02em` (home-final.css:343-348) · S3 **12 px** / `1.06` (home-project.css:264) · S6-kop2 **12 px** / 25 px / `1.14` (home-proof.css:421) |
| lead | `margin-top:16px`, `font-size:var(--m-lead)`, `line-height:1.55`, `max-width:36ch` | home-solutions.css:348-353, home-process.css:223, home-control.css:307, home-infra.css:356 | **4/9 exact.** S1 34ch · S8 `margin-top:15px` + 34ch · S3 en S6 `var(--m-body)` / lh 23 px / `margin-top:14px` / 38ch |
| CTA | `margin-top` | S1 26 · S2 24 · S3 24 · S5 26 · S6 20 · S7 20 · S8 20 · S9 18 px | **geen gedeelde waarde**, spreiding 18-26 px (home-hero.css:429, home-solutions.css:358, home-project.css:289, home-control.css:358, home-proof.css:427, home-infra.css:369, home-final.css:352, home-footer.css:360) |

Op tablet verruimen alleen S2 en S6 de leesregel naar 52ch (home-solutions.css:460,
home-proof.css:473).

#### Beeldhoogtes mobiel (geen gedeelde waarde)

| Sectie | Mobiel | Tablet | Bron |
|---|---|---|---|
| S1 | 232 px | 360 px | home-hero.css:447, :500 |
| S3 | 236 px | 340 px | home-project.css:241, :301 |
| S4 | 184 px | 320 px | home-process.css:226, :293 |
| S6 | 220 px | 320 px (grid-variant 300) | home-proof.css:433, :470, :482 |
| S7 | 190 px | **260 px** (330 px op :429 is dode code) | home-infra.css:378, :429, :443 |
| S8 | 204 px | 340 px | home-final.css:374, :423 |

Alle zes gebruiken wel `var(--m-radius-img)` = 12 px en `clip-path:none`.

#### Kaart-over-beeld-overlap

Drie secties laten een witte kaart over het beeld erboven vallen, alle drie met `position:relative`
(niet `static`) en dezelfde vastgelegde reden — de foto is vervangen inhoud en tekent zich anders
over de kaartachtergrond:

| Sectie | Overlap | Inspringing | Bron |
|---|---|---|---|
| S4 | `margin-top:-26px` | `margin-left: calc(var(--m-gutter) + 16px)` | home-process.css:229-238 (reden :230-231) |
| S6 | `margin-top:-28px` | `margin-left:16px` | home-proof.css:436-445 (reden :437-439) |
| S8 | `margin:-34px` | `margin-left: calc(var(--m-gutter) + 14px)` | home-final.css:398-407 (reden :399-400) |

### 4.7 Gedeelde cqw-maatladder

Dertien cqw-waarden komen over sectiegrenzen heen terug, allemaal hele pixels op de 1774-schaal:

| cqw | px @1774 | Gemeten frequentie |
|---|---|---|
| `.5637` | 10,00 | 12× in 6 bestanden |
| `.7891` | 14,00 | — |
| `.9019` | 16,00 | — |
| `.9583` | 17,00 | — |
| `1.0147` | 18,00 | 23× in 7 bestanden |
| `1.1274` | 20,00 | **26× in 7 bestanden** |
| `1.1838` | 21,00 | 19× in 7 bestanden |
| `1.2402` | 22,00 | — |
| `1.2965` | 23,00 | — |
| `1.4655` | 26,00 | — |
| `1.6911` | 30,00 | — |
| `1.9166` | 34,00 | — |
| `2.2547` | 40,00 | — |

Deze ladder wordt óók gebruikt in S3, S4, S5, S8 en S9, die een **ánder referentiecanvas** hebben —
daar is `1.1274cqw` dus geen heel getal in ref-px. **De ladder is nergens als token vastgelegd; hij
bestaat uitsluitend als herhaalde literal.**

### 4.8 Box-sizing

Er is **nergens een `*{box-sizing:border-box}`**. In plaats daarvan staat `box-sizing:border-box`
18× per element: home-hero.css:432, home-project.css:291, home-solutions.css:355, :459,
home-final.css:174, :193, :267, home-footer.css:222, :407, :419, home-infra.css:114, :214, :288,
:445, home-proof.css:197, :245, :305, :426. Vijf daarvan staan in een mobiel blok met de motivering
"anders tellen padding en rand bij de 100% op" (home-hero.css:432).

**Consequentie:** elke knop die op mobiel `width:100%` krijgt moet `box-sizing` zélf meenemen. Een
nieuwe volle-breedte-knop zonder die declaratie loopt buiten de gutter.

Vangrail tegen horizontale overloop: `html,body{ overflow-x:clip }` (home.css:85). Dat knipt
overlopende inhoud af — het herschikt niets en verbergt dus fouten.

---

## 5. RADII, RANDEN, SCHADUWEN, ELEVATIE

### 5.1 Border-radius

#### Knoppen

| Waarde desktop | px @1774 | Toepassingen |
|---|---|---|
| `.5139cqw` | **9,12** | home-project.css:183 (`.vh-pr-knop`) |
| `.5637cqw` | **10,00** | home-hero.css:213 (`.vh-btn`), home-solutions.css:74 (via `--sol-radius`), home-proof.css:202, home-infra.css:118, home-footer.css:227 |
| `.6595cqw` | **11,70** | home-control.css:267 |
| `.6657cqw` | **11,81** | home-final.css:178, :197 |
| **mobiel: `10px`** | 10 | 9× letterlijk herhaald: home-hero.css:437, home-solutions.css:361, home-project.css:293, home-control.css:360, home-proof.css:428, home-infra.css:372, home-final.css:355, home-footer.css:361, home-mobile.css:184 |

Negen knopdefinities, vier desktopwaarden, één mobiele waarde. De mobiele 10 px is **nergens een
token** — niet `--m-radius` (14 px) en niet `--vibe-radius-kaart`, dat precies `.5637cqw` is maar
door geen enkele knop wordt aangeroepen.

#### Kaarten

| Waarde desktop | px @1774 | Kaart | Bron |
|---|---|---|---|
| `.12cqw` | 2,13 | taptab S5 | home-control.css:189 |
| `.28cqw` | 4,97 | knoop S5 | home-control.css:138 |
| `.32cqw` | 5,68 | tegel S5 | home-control.css:125 |
| `.5637cqw` | 10,00 | modulekaart S2 · klantkaartje S6 · stripfoto S6 | home-solutions.css:149, home-proof.css:125, :321 |
| `.6595cqw` | 11,70 | zwevende kaart S4 | home-process.css:120 |
| `.7329cqw` | 13,00 | dashboard S5 | home-control.css:58 |
| `.7608cqw` | 13,50 | afspraakkaart S8 | home-final.css:269 |
| `.7892cqw` | 14,00 | sectorkaart S7 | home-infra.css:215 |
| `.9019cqw` | 16,00 | citaatkaart S6 | home-proof.css:247 |
| `1.0541cqw` | 18,70 | telefoon S5 | home-control.css:70 |
| `1.0711cqw` | 19,00 | KPI-balk S7 | home-infra.css:289 |
| `1.1274cqw` | 20,00 | projectstrook S6 | home-proof.css:307 |

**Mobiel:** `var(--m-radius)` = 14 px, 9× (home-solutions.css:388, home-process.css:238,
home-control.css:313, home-proof.css:444, :459, home-infra.css:401, :416, home-final.css:405,
home-footer.css:352), plus 12 px (home-proof.css:414), 10 px (home-proof.css:461) en 8 px
(home-control.css:328, :340).

**Twaalf verschillende kaartradii op desktop tegenover in wezen één op mobiel. Mobiel ís het
geconsolideerde systeem; desktop is het niet.**

#### Beeld, paneel, icoontegel, rond

| Rol | Desktop | px | Mobiel | Bron |
|---|---|---|---|---|
| Beeld S4 | `.7893cqw` | 14,00 | `var(--m-radius-img)` 12 px | home-process.css:97; home-mobile.css:29 |
| Beeld S7 | `1.0147cqw` | 18,00 | 12 px | home-infra.css:154 |
| Beeld overig | — | — | 12 px (home-hero.css:448, home-process.css:227, home-proof.css:434, home-infra.css:380, home-final.css:376, home-footer.css:376) | |
| Groot paneel S3 | `3.5507cqw 0 0 3.5507cqw` | 62,99 links / 0 rechts | `0` | home-project.css:52, :230 |
| Icoontegel S4-badge | `.35cqw` | 6,21 | **`0`** — enige plek waar een radius bewust naar nul gaat | home-process.css:172, :282 |
| Icoontegel S4-kaart | `.4cqw` | 7,10 | 8 px | home-process.css:126, :240 |
| Icoontegel S5 | `.42cqw` | 7,45 | 9 px | home-control.css:236, :349 |
| Icoontegel S8 | `.6657cqw` | 11,81 | 10 px | home-final.css:234, :366 |
| Icoontegel S7 | `.7328cqw` | 13,00 | 9 px | home-infra.css:79, :364 |
| Rond `50%` | — | — | 6× literal: home-solutions.css:232, home-control.css:92, :156, home-infra.css:271, home-final.css:281, home-process.css:273 | |

Het S3-paneel is de **enige asymmetrische radius** in de compositie; de skiplink
(`border-radius: 0 0 10px 10px`, home-mobile.css:53) is de tweede asymmetrische vorm.

#### Overige

`2px` focusring (home.css:126) · `2px` hamburgerlijn (home-mobile.css:124) · `6px`
`.vh-menuknop:focus-visible` (home-mobile.css:138) · `0 0 10px 10px` skiplink (home-mobile.css:53).

Let op de cascade op home-mobile.css:138: de `outline`-kleur daar rendert **niet** (home.css:124 is
`!important`), maar de `border-radius:6px` **wel** — specificiteit 0-2-0 verslaat 0-1-1 voor die
niet-`!important` eigenschap.

### 5.2 Randen

Gemeten over home.css + home-*.css:

| Breedte | Aantal | Bron |
|---|---|---|
| `1px solid` | **25** | verspreid |
| `1.5px solid` | **1** | home-hero.css:233 — `.vh-btn-secundair`, `var(--vh-rand)` `#46587A` |
| `.115cqw solid` (≈2,04 px @1774) | **1** | home-control.css:72 — telefoonbehuizing S5, `#16202F` |
| `border:0` | 5 | o.a. home-hero.css:227, home.css:98 |
| `outline: 2px solid` | 3 | home.css:124, home-mobile.css:138, :177 |
| `dashed` / `dotted` | **0** | — |

De 1,5 px-rand komt exact één keer op de hele pagina voor en blijft ook op mobiel staan: het mobiele
blok (home-hero.css:430-439) zet alleen `box-sizing`, `width`, `height`, `padding`, `font-size` en
`border-radius`, niet de randbreedte.

Het enige onderbroken lijnstuk op de pagina is **geen border** maar een SVG-stroke:
`stroke-dasharray:3 6` op `.vh-ctrl-stroom` (home-control.css:164), geanimeerd.

**Randkleuren:** `#C9DEF6` (home-final.css:198) · `#E1ECF8` (home-footer.css:354) · `#E4F0FC` (4×,
home-infra.css:306, :421, :422, :435) · `#16202F` (home-control.css:72) · `rgba(16,28,58,.12)`
(home-proof.css:124) · de `rgba(120,175,240,…)`-familie, **7 declaraties, exclusief voor het
S5-dashboard**: `.20` buitenrand (home-control.css:60) · `.16` tegel en knoop (:124, :137) ·
`.14` kopbalk en voetbalk (:83, :171) · `.12` rail en taptab (:106, :187) · `rgba(255,255,255,.12)` (4×,
metriekscheiding S3 mobiel, home-project.css:276-282) en `.10` (menulinkscheiding,
home-mobile.css:174) · `rgba(0,115,254,.22)` (ring tijdlijn-icoon mobiel, home-process.css:272) ·
`rgba(12,27,51,.08)` (home-mobile.css:83) en `rgba(12,27,51,.07)` (home-hero.css:474).

**Scheidingslijnen als element (geen border):**

| Lijn | Waarde | Bron |
|---|---|---|
| `.vh-navy-lijn` | 1px `rgba(110,205,255,.40)` — **enige cyaan-getinte lijn op de pagina** | home-hero.css:305-312 |
| `.vh-kpi-item::before` | 1px `var(--vh-paars-lijn)` `#DCE7F3`, hoogte `3.8895cqw` = 69,00 px | home-hero.css:353-361 |
| `.vh-sol-scheiding` | 1px `#E5EFFA` | home-solutions.css:87-93 |
| `.vh-sol-stats div+div::before` | 1px `rgba(255,255,255,.28)` | home-solutions.css:263-269 |
| `.vh-footer-lijn` | 1px `var(--ft-lijn)` `#DCE7F2` | home-footer.css:259-267 |
| `.vh-proc-stappen::before` | **2px** verloop `#0073FE → rgba(0,115,254,.18)` — enige niet-egale lijn, alleen mobiel | home-process.css:253-259 |

### 5.3 Geometrie (clip-path)

Gemeten `clip-path`-declaraties per bestand: **8 van de 9 sectiebestanden dragen geometrie.**

| Bestand | Aantal | Regels |
|---|---|---|
| home-hero.css | **5** | :57, :92, :120, :450 (`none`), :463 |
| home-final.css | **5** | :40, :63, :99, :376 (`none`), :394 |
| home-proof.css | 3 | — |
| home-footer.css | 2 | — |
| home-infra.css | 2 | — |
| home-control.css | 1 | — |
| home-process.css | 1 | — |
| home-solutions.css | 1 | — |
| **home-project.css** | **0** | S3 gebruikt in plaats daarvan een navy gradient-scrim (home-project.css:74-82, :247, :261) |
| home.css / home-mobile.css | 0 | — |

Hero en final CTA dragen er elk vijf — de twee zwaarst geometrische secties. In beide gevallen is de
mobiele behandeling identiek van vorm: `clip-path:none` op de foto, en de merkwig keert terug als
pseudo-element met `polygon(100% 0, 100% 100%, 0 100%)` (home-hero.css:463, home-final.css:394) met
bijna dezelfde gradient-stops: `rgba(0,115,254,.90) → rgba(0,60,150,.92)` (hero, :464) tegenover
`rgba(0,115,254,.92) → rgba(0,60,150,.94)` (final, :395), beide 200deg.

### 5.4 Box-shadows — alle 15

Gemeten: **15 `box-shadow`-declaraties** (de drie `transition`-vermeldingen op home-control.css:140,
home-infra.css:221 en home-proof.css:128 tellen niet mee). Verdeling: control 6, infra 4, proof 2,
solutions 1, process 1, final 1. **Nul** in home-hero.css, home-project.css, home-footer.css,
home-mobile.css en home.css zelf.

| # | Element | Waarde (bron) | px @1774 | Bron |
|---|---|---|---|---|
| 1 | `.vh-sol-mod` | `0 .56cqw 1.46cqw rgba(23,84,150,.10)` | 0 / 9,9 / 25,9 | home-solutions.css:152 |
| 2 | `.vh-proc-kaart` | `0 .18cqw .45cqw rgba(12,38,72,.06), 0 1.5cqw 3.2cqw -1.1cqw rgba(12,38,72,.22)` | 3,2 / 8,0 + 26,6 / 56,8 / -19,5 | home-process.css:122 |
| 3 | `.vh-ctrl-dash` | `0 1.10cqw 2.20cqw -0.92cqw rgba(26,86,156,.30), 0 .22cqw .55cqw -0.30cqw rgba(26,86,156,.20)` | 19,5 / 39,0 / -16,3 + 3,9 / 9,8 / -5,3 | home-control.css:61 |
| 4 | `.vh-ctrl-phone` | `0 .80cqw 1.60cqw -0.66cqw rgba(26,86,156,.34), 0 .16cqw .42cqw -0.22cqw rgba(26,86,156,.22)` | 14,2 / 28,4 / -11,7 + 2,8 / 7,5 / -3,9 | home-control.css:73 |
| 5 | `.vh-ctrl-bar .live i` | `0 0 .45cqw #3E9BFF` | 0 / 8,0 — **gloed, geen elevatie** | home-control.css:93 |
| 6 | `.vh-ctrl-node.hot` | `0 0 .9cqw rgba(62,155,255,.28)` | 0 / 16,0 — **gloed** | home-control.css:150 |
| 7 | `.vh-ctrl-hub` | `0 0 1.1cqw rgba(0,115,254,.30)` | 0 / 19,5 — **gloed** | home-control.css:161 |
| 8 | `.vh-ctrl-dash` mobiel | `0 18px 40px -22px rgba(26,86,156,.45)` | px | home-control.css:314 |
| 9 | `.vh-proof-org:hover` | `0 .68cqw 1.58cqw -.9cqw rgba(26,86,156,.30)` | 12,1 / 28,0 / -16,0 | home-proof.css:132 |
| 10 | `.vh-proof-kaart` | `0 1.35cqw 2.70cqw -1.10cqw rgba(26,86,156,.22), + .28/.68/-.34 rgba(26,86,156,.14)` | 23,9 / 47,9 / -19,5 + 5,0 / 12,1 / -6,0 | home-proof.css:249-250 |
| 11 | `.vh-infra-kaart` | `0 .90cqw 1.80cqw -.80cqw rgba(16,58,110,.22), + kleine laag rgba(16,58,110,.14)` | 16,0 / 31,9 / -14,2 + 3,2 / 8,0 / -4,3 | home-infra.css:217 |
| 12 | `.vh-infra-kaart:hover` | `0 1.20cqw 2.30cqw -.80cqw rgba(16,58,110,.28)` + idem kleine laag | 21,3 / 40,8 / -14,2 | home-infra.css:225 |
| 13 | `.vh-infra-kpi` | `0 .85cqw 1.90cqw -.95cqw rgba(16,58,110,.16)` + kleine laag `.10` | 15,1 / 33,7 / -16,9 + 2,8 / 7,1 / -3,9 — **dood element** (0 treffers `.vh-infra-kpi` in index.html) | home-infra.css:291 |
| 14 | `.vh-infra-kaart` mobiel | `var(--vibe-elev-mob)` | px | home-infra.css:402 |
| 15 | `.vh-final-kaart` | `0 1.20cqw 2.60cqw -1.00cqw rgba(9,38,78,.30)` + kleine laag `.18` | 21,3 / 46,1 / -17,7 + 4,3 / 11,0 / -5,3 | home-final.css:271 |

**Text-shadows (drie, alle op handgeschreven notities op foto):** `.vh-infra-note`
`0 .06cqw .28cqw rgba(9,40,80,.34)` (home-infra.css:195) · `.vh-final-note`
`0 .05cqw .24cqw rgba(2,40,88,.30)` (home-final.css:115) · `.vh-footer-note` twee lagen,
`.62` + `.48` alfa (home-footer.css:88) — de zwaarste, met de reden in de comment op
home-footer.css:87: de echte opname is daar licht. Alle drie renderen **niet** onder 1200 px
(home-mobile.css:219, home-footer.css:384). `.vh-infra-note` en `.vh-final-note` hebben bovendien
**0 voorkomens in index.html** — dode CSS.

### 5.5 Elevatie — wat wél uit herhaling volgt

De comment op home.css:59 claimt **drie niveaus**. Dat wordt door de code **niet gedragen**.

**Wat wél aantoonbaar is — één structuurregel, geen hiërarchie:**

> Groot diffuus vlak met negatieve spread + kleine contactlaag; twee lagen;
> **blur : y-offset ≈ 2 : 1**; **spread ≈ −0,7 × de y-offset**.

Verifieerbare blur/offset-verhoudingen (px @1774):

| Element | blur / offset | Verhouding |
|---|---|---|
| `.vh-proc-kaart` | 56,8 / 26,6 | 2,14 |
| `.vh-ctrl-dash` | 39,0 / 19,5 | 2,00 |
| `.vh-ctrl-phone` | 28,4 / 14,2 | 2,00 |
| `.vh-proof-kaart` | 47,9 / 23,9 | 2,00 |
| `.vh-infra-kaart` | 31,9 / 16,0 | 1,99 |
| `.vh-infra-kpi` | 33,7 / 15,1 | 2,23 |
| `.vh-final-kaart` | 46,1 / 21,3 | 2,16 |

De structuur herhaalt zich in 7 van de 12 niet-gloed-schaduwen, en de twee dode tokens
`--vibe-elev-1`/`-2` volgen hem óók.

**Eén bewezen rust→hover-paar:** `.vh-infra-kaart` 16,0 px → 21,3 px, spread blijft gelijk, alleen
de grote laag groeit (home-infra.css:217 vs :225).

**Waarom er géén drie niveaus zijn:**

1. **De schaduwtint verschilt per sectie** en heeft geen gedeelde basis: `rgba(23,84,150)` S2 ·
   `rgba(12,38,72)` S4 · `rgba(26,86,156)` S5+S6 · `rgba(16,58,110)` S7 · `rgba(9,38,78)` S8.
2. **De y-offsets vormen een doorlopende reeks zonder clustering:** 9,9 / 12,1 / 14,2 / 15,1 / 16,0 /
   19,5 / 21,3 / 21,3 / 23,9 / 26,6 px. Drie niveaus zijn daar niet uit af te leiden.
3. **Drie van de 15 zijn gloedeffecten** ([5], [6], [7] hierboven), geen elevatie. Die horen niet in
   een elevatiehiërarchie thuis.

**Mobiele elevatie is een gat.** Dertien van de 15 schaduwen zijn in cqw gesteld; slechts twee
krijgen onder 1200 px een px-equivalent (home-control.css:314, home-infra.css:402). De overige negen
levende gevallen — `.vh-sol-mod` (home-solutions.css:152), `.vh-proof-org:hover` (:132),
`.vh-proof-kaart` (:249), `.vh-proc-kaart` (home-process.css:122), `.vh-final-kaart`
(home-final.css:271), `.vh-ctrl-node.hot`, `.vh-ctrl-hub`, `.vh-ctrl-bar .live i` — blijven in cqw
rekenen. Op een 390 px-container is 1cqw = 3,9 px: de schaduwen krimpen met **factor 4,5**.
Er bestaat wél een token voor (`--vibe-elev-mob`), maar dat wordt één keer gebruikt.

---

## 6. BREAKPOINTS

Gemeten over home.css + home-*.css: **30 `@media`-blokken.**

| Grens | Aantal | Rol | Bron |
|---|---|---|---|
| `max-width: 1199px` | **12** | **De hoofdgrens.** Elk van de negen secties heeft precies één blok waarin de desktop-cqw-compositie volledig wordt ontmanteld en door px/clamp/vw wordt vervangen. Geen sectie slaat hem over | home-hero.css:397, home-solutions.css:332, home-project.css:223, home-process.css:215, home-control.css:294, home-proof.css:376, home-infra.css:339, home-final.css:329, home-footer.css:302, home-mobile.css:67, :213, :226 |
| `min-width: 768px and max-width: 1199px` | **11** | **De tabletlaag.** Stapelt op het ≤1199-blok: tilt de `--m-*`-tokens op (home-mobile.css:34-45), herstelt rij-layouts en brengt op enkele plekken desktopelementen terug | home-mobile.css:34, :197, home-hero.css:495, home-solutions.css:458, home-project.css:300, home-process.css:292, home-control.css:366, home-proof.css:469, home-infra.css:428, home-final.css:418, home-footer.css:396 |
| `min-width: 768px and max-width: 859px` | **1** | **Component-specifiek: alleen de hero proof-strip.** Raakt drie selectors: `.vh-kpi-getal{font-size:16.5px; max-width:15ch}`, `.vh-kpi-label{font-size:12.5px}`, `.vh-kpi-grid{gap:16px}` | home-hero.css:529-533 |
| `min-width: 1000px and max-width: 1199px` | **1** | **Component-specifiek: alleen de footer.** Zet merkblok en navigatie naast elkaar: `.vh-footer{grid-template-columns: minmax(0,1fr) minmax(0,1.6fr); column-gap:36px}` | home-footer.css:425-429 |
| `min-width: 1024px and max-width: 1199px` | **1** | **Component-specifiek: alleen het oplossingenraster.** Brengt het desktop-3×2-raster terug op kleinere schaal | home-solutions.css:490-500 |
| `prefers-reduced-motion: reduce` | **3** | `scroll-behavior:auto` (home.css:93); stroomanimatie + live-puls uit in S5 (home-control.css:280-283); menu-overgangen uit (home-mobile.css:241-244) | home.css:93, home-control.css:280, home-mobile.css:241 |
| `hover: none` | **1** | Kaarttransformaties uit op aanraakschermen. **Genest binnen `max-width:1199px`** en werkt dus niet op een aanraakscherm boven 1200 px | home-mobile.css:236-238 |

**Er is géén `min-width: 1200px`-query.** Desktop is de niet-gekwalificeerde basislaag; de mobiele
laag is de uitzondering. Desktopregels mogen niet zonder herziening van de hele cascade in een
`min-width:1200px`-wrapper.

De enige plek waar de breekpuntset expliciet is opgeschreven is home-mobile.css:9-13:
```
<= 767px    mobiel masterontwerp (390 / 430 primair)
768-1199px  tablet
>= 1200px   desktopmaster (cqw-layout, ongewijzigd)
```
Die lijst noemt de drie component-specifieke subgrenzen (859, 1000, 1024) niet.

**Breekpunt in JS:** `window.matchMedia('(min-width:1200px)')` sluit het mobiele menu bij
terugschalen (index.html:1171) — de enige breedtegrens in de JS van de pagina, en hij sluit exact
aan op de CSS-grens.

**Breekpunten in de beeldlevering:** de `sizes`-laag gebruikt dezelfde twee grenzen, 767 en 1199
(index.html:86, 344, 361, 379, 418, 437, 469, 539, 839, 857, 915, 957, 1019). Elf van de dertien
beelden zijn `loading="lazy"`; alleen het herobeeld is `loading="eager" fetchpriority="high"`.

**Cascadegevolg.** home-mobile.css laadt als laatste (index.html:67), en het CQW-VANGNET-blok staat
op home-mobile.css:213 — ná het tabletblok (:197) en ná alle negen sectiebestanden. Bij gelijke
specificiteit wint dat blok dus altijd. Vastgesteld gevolg: `.vh-footer-nav ul a{line-height:1.35}`
(home-mobile.css:218) verslaat `line-height:19px` (home-footer.css:344), en
`.vh-sol-mod--zon p{line-height:1.4}` (:216) verslaat home-solutions.css:404 en :481.

---

## 7. CONSOLIDATIEKANDIDATEN

> **UITDRUKKELIJK VOORBEHOUD.** De websitecode is voor deze lijst **NIET gewijzigd**. Dit zijn
> gemeten bijna-identieke waarden op commit aae26bf, geen doorgevoerde consolidaties en geen
> aanbevelingen. Elke samenvoeging raakt een compositie die op een eigen referentiecanvas is
> gereconstrueerd (§3.0) en moet daar eerst opnieuw tegen worden gemeten. De homepage is bevroren.

### 7.1 Kleuren die op enkele eenheden verschillen

| Waarden | Verschil | Rol | Bron |
|---|---|---|---|
| `#4C5771` vs `#475771` | uitsluitend rood-kanaal (76 vs 71); G en B identiek | beide "lopende tekst / labels" | home.css:43 vs home-hero.css:20 |
| `#DCE7F2` vs `#DCE7F3` | **1 eenheid** in het blauwe kanaal | beide een 1px-haarlijn | home-footer.css:29 vs home-hero.css:22 |
| `#FAFCFE` vs `#FAFCFD` | **1 eenheid** in het blauwe kanaal | sectievlak S6 vs S8 | home-proof.css:20 vs home-final.css:21 |
| `#0073FE` vs `#0071FE` | **2 eenheden** in het groene kanaal | merktoken vs logostroke — staan in de header direct naast elkaar | home.css:35 vs index.html:131-133 |
| `.7892cqw` vs `.7893cqw` | renderen **beide exact 14,00 px** | sectorkaart S7 vs beeld S4 | home-infra.css:215 vs home-process.css:97 |
| `.7328cqw` vs `.7329cqw` | renderen **beide exact 13,00 px** | icoontegel S7 vs dashboard S5 | home-infra.css:79 vs home-control.css:58 |
| `rgba(12,27,51,.08)` vs `rgba(12,27,51,.07)` | **0,01 alfa** | beide 1px-bovengrens op mobiel | home-mobile.css:83 vs home-hero.css:474 |
| `.6595cqw` vs `.6657cqw` | **0,11 px** (11,70 vs 11,81) | knopradius S5 vs S8 | home-control.css:267 vs home-final.css:178 |

### 7.2 Exacte duplicaten met twee namen

| Duplicaat | Waarde | Bron |
|---|---|---|
| `--pc-badge` / `--ct-badge` | `#D8ECFE` — twee aliassen, dezelfde waarde, dezelfde rol (icoontegel) | home-process.css:32 / home-control.css:30 |
| `--vibe-radius-mob` / `--m-radius` | `14px` — twee tokenlagen dragen dezelfde waarde; alleen `--m-radius` wordt gebruikt | home.css:56 / home-mobile.css:28 |
| `--vibe-elev-1` / `.vh-proc-kaart` | numeriek identiek, dezelfde laagvolgorde | home.css:60-61 / home-process.css:122 |
| `--vibe-elev-2` / `.vh-proof-kaart` | dezelfde twee lagen, **omgekeerd opgeschreven** | home.css:62-63 / home-proof.css:249-250 |
| `#fff` / `#FFF` / `#FFFFFF` | drie schrijfwijzen voor dezelfde kleur (32× / 1× / 7×) | verspreid |
| `.vh-infra-kaart-tx br{display:none}` | letterlijk twee keer achter elkaar | home-infra.css:409 en :410 |

### 7.3 Eén rol, meerdere waarden zonder token

| Rol | Waarden | Bron |
|---|---|---|
| Navy voor "kop op licht" | `#08203C` · `#071D3A` · `#0C1B33` | home.css:41, home-hero.css:19, home-footer.css:27 |
| Kopinkt op lichte kaart | `#0C1424` (4×, S7+S8) — zit in geen enkele tokenlaag | home-infra.css:92, :255; home-final.css:247, :294 |
| Icoontegel-tint | `#D8ECFE` (S4, S5) · `#DEEFFD` (S7) · `#E8F3FE` (S8) | home-process.css:32, home-control.css:30, home-infra.css:28, home-final.css:28 |
| Haarlijn op licht vlak | `#E5EFFA` · `#E4F0FC` · `rgba(16,28,58,.12)` · `#DCE7F3` · `#DCE7F2` | home-solutions.css:22, home-infra.css:306, home-proof.css:124, home-hero.css:22, home-footer.css:29 |
| Subtekst | `#45527A` · `#4A5578` · `#4E5876` · `#54607A` — vier aparte waarden, geen gedeeld token | home-infra.css:263, home-final.css:301, home-infra.css:27, home-proof.css:26 |
| Knopradius desktop | 9,12 / 10,00 / 11,70 / 11,81 px | §5.1 |
| Kaartradius desktop | twaalf waarden van 2,13 tot 20,00 px | §5.1 |
| Sectie-eyebrowgraad | acht waarden van 15,40 tot 18,20 px, acht trackings van `.022em` tot `.175em` | §3.1 |
| H2-graad | zeven waarden van 53,00 tot 66,00 px | §3.1 |
| Lead-graad | zeven waarden van 20,00 tot 23,62 px, drie grijzen | §3.1 |
| Desktop gutter links | 70 / 73 / 78 / 83 / 84,36 / 88,57 px over zes secties | §4.1 |
| Doorzichtig merkblauw | `rgba(0,115,254,…)` 11× hardgecodeerd; geen rgb-kanaaltoken | §2a |
| Scrimbasis over beeld | vijf donkerblauwe basissen, zes richtingen | §2c |

### 7.4 Al geconsolideerd onder 1200 px

De mobiele laag is op vier punten aantoonbaar al één systeem, in tegenstelling tot desktop:

| Rol | Desktop | Onder 1200 px | Bron |
|---|---|---|---|
| Eyebrow | 8 graden, 8 trackings | **1 graad (11,5 px) + 1 tracking (`.14em`), 9 van de 9** | §3.1 |
| Knopvorm | 4 graden, 4 radii, hoogtes 50-67 px | **7 identieke declaraties, 8 secties** — maar door herhaling, niet door een gedeelde klasse | §3.1 |
| Kaartradius | 12 waarden | **in wezen 1: `var(--m-radius)` 14 px (9×)** | §5.1 |
| Beeldradius | 2 waarden | **1: `var(--m-radius-img)` 12 px (6×)** | §5.1 |
| Paginagutter | 6 waarden, geen token | **1 token: `--m-gutter` (36×)** | §4.2 |

### 7.5 Dode code die een consolidatie blokkeert of simuleert

| Item | Status | Bron |
|---|---|---|
| 12 van de 23 `--vibe-*`-tokens | 0 `var()`-refs; vijf renderen wél, hardgecodeerd | §2a |
| `--m-body-kleur` | 0 refs | home-mobile.css:32 |
| `.vh-m-eyebrow` | volledige gedeelde eyebrow-bouwsteen, **0 voorkomens in index.html** | home-mobile.css:227-234 |
| `.vh-infra-kpi` | volledig uitgewerkte 4 → 2×2 → 4 responsieve trap, 0 voorkomens in index.html | home-infra.css:282-328, :413-425, :433-435 |
| `.vh-sol-stats b/span` | volledige specificatie, 0 voorkomens | home-solutions.css:252-286 |
| `.vh-infra-note` / `.vh-final-note` | volledige specificatie + twee `display:none`-regels, 0 voorkomens | home-infra.css:185-204, home-final.css:106-125 |
| `.vh-kpi-label sub` | regel voor CO₂-notatie, geen `<sub>` in de markup | home-hero.css:383 |
| `.vh-footer-wig-ongebruikt` | 0 voorkomens; naam suggereert bewust geparkeerd | home-footer.css:373-377 |
| `.vh-infra-foto{height:330px}` | zelfde mediablok als `height:260px` op :443 — 260 wint, 330 is dood | home-infra.css:429 |
| `.vh-sol-mod--zon{min-height:300px}` | staat vóór `.vh-sol-mod{min-height:210px}` bij gelijke specificiteit — 210 wint in 768-1023 px | home-solutions.css:467-468 |
| `tokens.css` (`--t-*`) | 38 tokens + UNIFY LAYER; **0 `var(--t-*)`-verwijzingen** in home*.css, en geen enkele klasse uit de unify-laag komt in index.html voor. De enige regel die de homepage raakte (focusring `#0096CC !important`, tokens.css:102-105) wordt door home.css:119-127 overschreven | tokens.css:10-105; index.html:56-57 |

---

## 7A. TOKENARCHITECTUUR V1.0 (frozen)

> **Statuswissel.** §0 t/m §7 beschrijven wat Master v1 **doet**. Deze sectie beschrijft wat Design
> System V1.0 **voorschrijft**. De besluiten hieronder zijn genomen en bevroren; het zijn geen
> voorstellen en geen aanbevelingen. **De websitecode is er niet voor gewijzigd.**

### 7A.0 Scope — en wat er NU uitdrukkelijk niet gebeurt

**Master v1 wordt voor deze architectuur NU NIET gerefactord.** Concreet:

- `index.html`, `home.css` en de negen `home-*.css` blijven byte-for-byte zoals op commit
  `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1`.
- De 23 `--vibe-*`-tokens (home.css:29-71), de 14 `--m-*`-tokens (home-mobile.css:15-45) en de 48
  per-sectie kleuraliassen (§2b) blijven staan zoals gemeten — inclusief de 12 dode `--vibe-*` (§2a)
  en `--m-body-kleur` (home-mobile.css:32, 0 refs).
- De **111** `font-size`-declaraties in `cqw` (gemeten over de negen sectiebestanden) blijven in cqw.
- De hiërarchie hieronder gaat gelden vanaf de **eerste mastermigratie** (B2,
  `systeem-energieopslag.html`) en niet eerder.
- De homepage staat in de migratievolgorde als **B1 en wordt niet opnieuw gebouwd**. Gevolg: een
  hertoepassing van §7A op Master v1 is geen onderdeel van V1.0 en vergt een afzonderlijk besluit.

Waar §7A een waarde noemt die in Master v1 anders is, is dat **geen tegenspraak maar een
statusverschil**: de meting geldt voor aae26bf, de regel geldt voor wat ná de freeze wordt gebouwd.

### 7A.1 De lagen — PRIMITIVE → SEMANTIC, componenttokens alleen op aanvraag

Exact twee verplichte lagen en één voorwaardelijke derde.

| Laag | Wat het is | Naamvorm | Wie leest hem |
|---|---|---|---|
| **PRIMITIVE** | ruwe merkwaarde, draagt géén rol | `--vibe-<familie>-<trede>` | uitsluitend de SEMANTIC-laag |
| **SEMANTIC** | de rol die een waarde vervult | `--color-<rol>[-<variant>]`, `--radius-<rol>`, `--space-<trede>` | componenten en secties |
| **COMPONENT** — *alleen op aanvraag* | de eigen semantische waarde van één component | `--<component>-<eigenschap>` | uitsluitend dat ene component |

Vier harde regels:

1. **Een componentregel leest nooit een PRIMITIVE.** In Master v1 leest een sectieregel een
   per-sectie alias; van die 48 aliassen wijzen er 26 door naar een `--vibe-*` en dragen er 22 een
   eigen hardgecodeerde waarde (§2b). Beide vormen vervallen: de sectie leest de SEMANTIC-token.
2. **Een COMPONENT-token bestaat alleen wanneer de componentwaarde van de semantische waarde móét
   kunnen afwijken.** Is het een doorgeefluik, dan mag het niet bestaan. Gemeten precedent:
   `--m-blauw`, `--m-navy` en `--m-body-kleur` (home-mobile.css:30-32) zijn pure doorgeefluiken naar
   `--vibe-*`; die laag voegt geen enkele kleur toe (§2a) en één van de drie wordt nooit gebruikt.
3. **Geen vierde laag.** Geen `global`/`alias`/`theme`/`brand`-tussenlagen, geen
   enterprise-tokenpiramide.
4. **Eén SEMANTIC-token = één rol = één waarde.** Twee waarden voor één rol is precies de fout die
   §7.3 in **dertien rijen** vastlegt — onder meer: navy 3 waarden · icoontegel-tint 3 · subtekst 4 ·
   haarlijn 5 · knopradius 4 · kaartradius 12 · eyebrowgraad 8 · H2-graad 7 · lead-graad 7 ·
   desktopgutter 6.

### 7A.2 Naamgeving — het voorbeeld, uitgewerkt op gemeten waarden

Vertrekpunt is de gemeten waarde van Master v1; de naamvorm is die van V1.0.

```css
/* PRIMITIVE — merkwaarde, geen rol */
--vibe-blue-500: #0073FE;        /* nu --vibe-blauw,        home.css:35 — 11 refs */
--vibe-blue-600: #005FE0;        /* nu --vibe-blauw-diep,   home.css:36 —  1 ref  */
--vibe-blue-400: #3E9BFF;        /* nu --vibe-blauw-licht,  home.css:37 —  0 refs */
--vibe-blue-500-rgb: 0 115 254;  /* kanaal — bestaat NIET in Master v1 (§2a)      */

/* SEMANTIC — de rol */
--color-action-primary:       var(--vibe-blue-500);
--color-action-primary-hover: var(--vibe-blue-600);
--color-focus-ring:           var(--vibe-blue-500);
--color-accent-on-dark:       var(--vibe-blue-400);
--color-action-primary-halo:  rgb(var(--vibe-blue-500-rgb) / .30);

/* COMPONENT — alleen wanneer de knop een eigen semantische waarde nodig heeft */
--btn-primary-bg:       var(--color-action-primary);
--btn-primary-bg-hover: var(--color-action-primary-hover);
```

`.vibe-btn--primary` leest `--btn-primary-bg`, of — als er geen componenttoken nodig blijkt —
rechtstreeks `--color-action-primary`. **Nooit** `--vibe-blue-500`.

Dezelfde drietrap voor niet-kleur: `--vibe-radius-10` → `--radius-control` → (indien nodig)
`--btn-radius`.

**Wat dit meetbaar oplost.** `--vibe-blauw-diep` (home.css:36) heeft 1 ref; de zeven andere secties
hardcoderen dezelfde waarde `#005FE0` in hun eigen hover (home-solutions.css:84,
home-project.css:193, home-control.css:277, home-proof.css:212, home-infra.css:128,
home-final.css:188, home-footer.css:236). In de hiërarchie hierboven is dat één
`--color-action-primary-hover` en één knopprimitief in plaats van acht losse hoverregels.

### 7A.3 Migratiepad — van drie lagen naar twee

Gemeten vertrekpunt: **drie lagen** (§2) met 23 + 14 + 48 = **85 custom properties**, waarvan 12
`--vibe-*` dood (§2a), 1 `--m-*` dood en 26 van de 48 sectie-aliassen pure doorgeefluiken (§2b).

| Huidige vorm | Gemeten voorbeeld | Bestemming V1.0 | Regel |
|---|---|---|---|
| `--vibe-*` met concrete merkwaarde | `--vibe-blauw` `#0073FE` (home.css:35) | **PRIMITIVE**, hernoemd naar een trede | waarde blijft, naam verliest de rol |
| `--vibe-*` die al een rol benoemt | `--vibe-focus: var(--vibe-blauw)` (home.css:68) | **SEMANTIC** (`--color-focus-ring`) | wijst naar de primitive, nooit naar een hex |
| `--vibe-*` dood maar renderend | `--vibe-blauw-licht` `#3E9BFF` (home.css:37) rendert 6× hardgecodeerd in S5 | **PRIMITIVE + SEMANTIC** (`--color-accent-on-dark`) | de rol bestaat al in de code, alleen niet als token |
| `--vibe-*` dood en niet-renderend | `--vibe-ease` (home.css:69), `--vibe-dur` (:70) | **SEMANTIC** of vervallen | per geval; een token zonder rol migreert niet |
| `--vibe-*` in `cqw` in `:root` | `--vibe-radius-kaart` (:55), `--vibe-elev-1` (:60-61), `--vibe-elev-2` (:62-63) | **vervalt in deze vorm** | `:root` heeft geen container om cqw tegen te rekenen (§2a); terug als px of `clamp()` |
| `--m-*` kleurdoorgeefluik | `--m-blauw`, `--m-navy`, `--m-body-kleur` (home-mobile.css:30-32) | **vervalt** | doorgeefluik zonder eigen semantiek (7A.1, regel 2) |
| `--m-*` maatvoering met breekpunt-herdefinitie | `--m-h2` `clamp(27px,7.3vw,34px)` (:22) → `clamp(34px,4.6vw,42px)` (:39) | **SEMANTIC, één `clamp()` over het hele bereik** | zie 7A.4 |
| sectie-alias → `--vibe-*` (26 van 48) | `--sol-blauw` → `--vibe-blauw` (home-solutions.css:18) | **vervalt** | de sectie leest de SEMANTIC-token rechtstreeks |
| sectie-alias met eigen literal (22 van 48) | `--vh-navy` `#071D3A` (home-hero.css:19), `--ft-navy` `#0C1B33` (home-footer.css:27) | **per rol beoordelen**: één SEMANTIC óf een bewust tweede PRIMITIVE | drie navy's voor één rol (§7.3); de waarde is nog open, zie §8-1 |
| sectie-alias die geen kleur is | `--sol-radius` `.5637cqw` (home-solutions.css:23); `--vh-copy-top`, `--vh-gap-h1`, `--vh-gap-p`, `--vh-gap-btn` (home-hero.css:26-29) | **SEMANTIC** (`--radius-control`, `--space-*`), of onderdeel van een bevroren unieke compositie | ritmevariabelen van één compositie worden geen sitebrede tokens |
| hardgecodeerde `rgba()` (**155 declaraties** gemeten) | `rgba(0,115,254,…)`, 11 declaraties | **PRIMITIVE-kanaal + SEMANTIC** | zie 7A.5 |

**Volgorde.** De hiërarchie wordt per bouwtype ingevoerd in de vastgelegde migratievolgorde
(B2 → B3 → B4 → B6 → B5 → B7 → S2), niet in één keer over de hele site, en niet op Master v1 (7A.0).
Per migratiestap geldt: eerst de SEMANTIC-tokens die dat bouwtype nodig heeft, dan pas eventuele
componenttokens — en alleen als regel 2 van 7A.1 ze toestaat.

### 7A.4 Responsive typografie — `clamp()` is de standaard, `cqw` is de uitzondering

**Regel.** `clamp()` is de **default** voor elke typografische graad en elke responsieve maat. `cqw`
is uitsluitend toegestaan binnen een **bewust canvas-proportionele compositie**: een compositie die
als *unique composition* is bevroren en die haar eigen container heeft.

`cqw` mag daar alleen worden gebruikt als aan **alle drie** de voorwaarden is voldaan:

1. het element zit in een echte container met `container-type: inline-size` — **nooit in `:root`**;
2. elke cqw-waarde heeft onder het canvasbreekpunt een expliciet px- of `clamp()`-equivalent, óf is
   zelf als `clamp()`/`max()` geschreven zodat hij niet kan inklappen;
3. `box-shadow`, `border-width`, icoonmaat en regelhoogte in cqw krijgen **altijd** een
   px-equivalent.

**Onderbouwing — wat Master v1 aantoonbaar nodig had.**

- **De homepage heeft een expliciet cqw-vangnet.** `home-mobile.css:207-221` heet letterlijk
  `CQW-VANGNET` en motiveert zichzelf op :209-211: *"De secties rekenen in cqw. Onder 1200px zijn die
  eenheden betekenisloos klein; hieronder staan de laatste eigenschappen die de sectieblokken niet
  zelf al overschrijven."* Dat blok bestaat alleen omdat de desktopeenheid onder haar canvas niet
  houdbaar is. Een eenheid die een vangnet nodig heeft, is geen default.
- **Dat vangnet moet de cascade winnen om te werken.** home-mobile.css laadt als laatste
  (index.html:67) en het blok staat ná het tabletblok (:197) en ná alle negen sectiebestanden;
  bij gelijke specificiteit wint het daardoor altijd (§6). Twee gemeten gevolgen:
  `.vh-footer-nav ul a{line-height:1.35}` (:218) verslaat `line-height:19px` (home-footer.css:344),
  en `.vh-sol-mod--zon p{line-height:1.4}` (:216) verslaat home-solutions.css:404 en :481. Een
  standaard die op laadvolgorde moet leunen, is geen standaard.
- **Er is geen cqw ónder 1200 px en geen `clamp()` erboven — het zijn twee systemen met een naad.**
  Gemeten: **111** `font-size`-declaraties in cqw, alle in de ongekwalificeerde desktoplaag;
  **0** cqw-declaraties binnen een `max-width:1199px`-blok in welk sectiebestand dan ook; de enige
  twee cqw-vermeldingen in home-mobile.css staan in commentaar (:12, :209). Daartegenover staan
  **9** `clamp()`-declaraties in de hele homepage-CSS, alle negen in dienst van de laag onder
  1200 px: home-mobile.css:16, :21, :22, :36, :38, :39, :168 en home-final.css:345, :419.
- **De naad moet per token opnieuw worden gezet, en dat gaat mis.** Het tabletblok herdefinieert
  **acht van de veertien** `--m-*`-tokens (home-mobile.css:36-43) en laat `--m-eyebrow` staan; de
  eyebrow blijft daardoor 11,5 px op 768-1199 px terwijl alle andere graden meegroeien (§2a, §8-6).
  Eén `clamp()` over het hele bereik kent dat faalgeval niet.
- **Waar het vangnet niet komt, breekt de schaal.** Dertien van de 15 `box-shadow`-declaraties zijn
  in cqw gesteld; twee krijgen onder 1200 px een px-equivalent (home-control.css:314,
  home-infra.css:402). De rest rekent door op de kleine container: op 390 px is `1cqw = 3,9 px` in
  plaats van 17,74 px — **factor 4,5** (§5.5). `.vh-ctrl-hub` (home-control.css:154-163) heeft
  bovendien géén enkele media-query-override en zet op een container van 1000 px het woord "EMS" in
  een letter van 5 px (§8-17).
- **De enige twee `max()`-vloeren van de pagina repareren dezelfde fout lokaal.**
  `max(19px, 1.5784cqw)` en `max(13.5px, .9019cqw)` (home-hero.css:368-382) werken rekenkundig
  alleen in de band 1200-1203,8 px respectievelijk 1200-1496,8 px (§3.1) — een vangnet vlak bóven
  het breekpunt, precies het probleem dat `clamp()` structureel oplost.

**Wat NU blijft staan.** Master v1 wordt hiervoor **niet** gerefactord (7A.0): de 111 cqw-graden,
de vier referentiecanvassen met hun vier verschillende ref-px-factoren (§3.0) en de
`--m-*`-breekpuntladder blijven ongewijzigd. De composities die als *unique composition* bevroren
zijn — hero-stage, de VIBE.CONTROL-dashboardcompositie, de Hedin featured-projectcompositie, de
process timeline en de diagonale final-CTA — zijn de **kandidaten** voor "bewust canvas-proportioneel".
Per compositie moet bij haar eigen migratie worden vastgesteld dát zij dat is en dat aan de drie
voorwaarden hierboven wordt voldaan; dat is geen automatische vrijstelling.

### 7A.5 rgba-normalisatie tijdens migratie

**Regel.** Hardgecodeerde `rgba()`-varianten worden **tijdens migratie genormaliseerd wanneer zij een
herhaalde semantische rol dragen** — dat wil zeggen: dezelfde rol komt op twee of meer plaatsen voor
met een andere literal, óf de rgb-basis is identiek aan een bestaande primitive. Normaliseren =
kanaaltoken op de PRIMITIVE-laag + één SEMANTIC-token per rol, met de alfa in de semantic:
`rgb(var(--vibe-blue-500-rgb) / .30)`. Een **eenmalige** rgba binnen een bevroren unieke compositie
(scrimstops, gradiëntverlopen) blijft literal — dat is geen rol maar tekening.

Buiten scope: Master v1 wordt hiervoor niet aangepast (7A.0). De tabel hieronder is de meetwaarde
waarop de migratie zich baseert.

**Gemeten: 155 `rgba()`-declaraties** in `home.css` + de negen `home-*.css` samen.

| Familie | Gemeten | Rol | rgb-basis | V1.0-behandeling |
|---|---|---|---|---|
| `rgba(0,115,254,…)` | **11 declaraties / 14 waarden**; alfa's `0 · .06 · .14 · .18 · .22 · .30 · .32 · .34 · .42 · .90 · .92` | doorzichtig merkblauw: EMS-hubgloed, knoopgloed, tijdlijnring en -verloop, kaartrand-hover, mobiele menugradiënt, merkwig hero + final | **identiek aan `--vibe-blauw` `#0073FE`** (home.css:35) | **NORMALISEREN.** §2a stelt vast dat er géén rgb-kanaaltoken bestaat; die komt er (`--vibe-blue-500-rgb`). Bron: home-control.css:149, :158, :161 · home-final.css:395 · home-hero.css:464 · home-mobile.css:151 · home-process.css:258, :272 · home-proof.css:131 · home-solutions.css:308, :319 |
| `rgba(62,155,255,…)` | **5 declaraties**, alfa's `.28 · .34 · .62 · .70 · .75`, plus **6 hex-gebruiken** van exact dezelfde kleur | accent op het donkere S5-dashboard: randen, gloed, SVG-stroke, actieve tab | **identiek aan `--vibe-blauw-licht` `#3E9BFF`** (home.css:37, **0 refs**) | **NORMALISEREN.** De primitive bestaat al en is dood, terwijl de rol 11× hardgecodeerd rendert. Bron rgba: home-control.css:148, :150, :159, :164, :165. Bron hex: :90, :93 (2×), :116, :142, :190 |
| `rgba(255,255,255,…)` — tekst op donker | **10 declaraties, 7 alfa's**: `.95 · .94 · .92 · .90 · .80 · .70 · .62` | "wit, iets gedempt, op een donker vlak" | wit | **NORMALISEREN** naar één SEMANTIC (`--color-on-dark-muted`) plus hoogstens één variant. Bron: home-final.css:114, :124 · home-footer.css:97 · home-infra.css:194, :203 · home-mobile.css:137, :193 · home-project.css:132 · home-solutions.css:222, :284 |
| `rgba(255,255,255,…)` — 1px-lijn op donker | **8 declaraties, 4 alfa's**: `.28 · .22 · .12` (4×) · `.10` (2×) | scheidingslijn op een donker vlak | wit | **NORMALISEREN.** Hardste geval: **binnen één sectie** draagt dezelfde rol `.22` op desktop (`--pr-lijn`, home-project.css:32 → gebruikt op :151) en `.12` op mobiel (:276, :280, :282, :304). Verder home-solutions.css:268 (`.28`) en home-mobile.css:174, :176 (`.10`) |
| `rgba(120,175,240,…)` | **7 declaraties, 4 alfa's**: `.20 · .16` (2×) · `.14` (2×) · `.12` (2×) | randen binnen het S5-dashboard | geen token | **NU NIET.** Alle zeven zitten in één bevroren unieke compositie (VIBE.CONTROL-dashboard) en de rol komt nergens anders voor: home-control.css:60, :83, :106, :124, :137, :171, :187. Normaliseren zodra dezelfde rol bewijsbaar buiten S5 terugkeert |
| `rgba(16,28,58,.12)` | token + **1 literal** | haarlijn op een licht vlak | `--vibe-lijn` (home.css:52, **0 refs**); dezelfde rgb-basis als `#101C3A` (home-proof.css:142) | **NORMALISEREN.** Het token bestaat en wordt nergens aangeroepen, terwijl de exacte waarde 1× hardgecodeerd staat (home-proof.css:124) |
| `rgba(12,27,51,.08)` vs `rgba(12,27,51,.07)` | 2 declaraties | 1px-lijn boven/onder, beide op mobiel | geen token | **NORMALISEREN.** Eén rol, **0,01 alfa verschil** — home-mobile.css:83 vs home-hero.css:474 (§7.1) |
| schaduwtint | **5 basissen**: `rgba(23,84,150)` S2 · `rgba(12,38,72)` S4 · `rgba(26,86,156)` S5+S6 · `rgba(16,58,110)` S7 · `rgba(9,38,78)` S8 | schaduwkleur onder kaarten | geen token | **NORMALISEREN** naar één SEMANTIC schaduwkleur; §5.5 stelt vast dat de tint per sectie verschilt en geen gedeelde basis heeft — dat is precies één rol met vijf waarden |
| scrim over beeld | **6 rgb-basissen over 5 secties, 48 waarden**: `rgba(3,20,44)` 25 (S2 + S7) · `rgba(0,22,50)` 7 + `rgba(0,18,42)` 2 (beide S3) · `rgba(8,32,60)` 6 (S8) · `rgba(4,20,44)` 5 (S1) · `rgba(10,38,74)` 3 (S9) | donkerblauwe scrim over fotografie | geen token | **GEDEELTELIJK.** De basiskleur is één rol en wordt één PRIMITIVE; de stopposities en alfaladders horen bij de compositie en blijven daar (§2c) |

**Niet normaliseren** — geen herhaalde rol, of een rol die binnen één bevroren compositie blijft:

- de **eindstop** van de merkwig, `rgba(0,60,150,.92)` (home-hero.css:464) en `rgba(0,60,150,.94)`
  (home-final.css:395). De **beginstop** van diezelfde wig is merkblauw en valt dus wél onder rij 1;
  het is één gradient met een primitive aan de ene kant en een compositiewaarde aan de andere.
- de losse tintstops in S5: `rgba(186,220,252,.52)` en `rgba(192,224,252,.16)`
  (home-control.css:42-43), en `rgba(140,175,215,.35)` (taptab, home-control.css:189) — elk één
  voorkomen, binnen de VIBE.CONTROL-compositie.

Die blijven literal tot er bewijs van herhaling buiten hun eigen compositie is.

---

## 8. BESLUITEN EN OPEN PUNTEN

*(Deze sectie heette "DECISION REQUIRED". De nummering 1 t/m 20 is ongewijzigd, zodat elke oude
verwijzing naar "DECISION REQUIRED #n" hier nog steeds op punt n uitkomt.)*

Deze lijst is bijgewerkt tegen de bevroren V1.0-besluiten. Drie statussen, geen vierde:

| Status | Betekenis |
|---|---|
| **DECIDED — V1.0** | Beantwoord door een bevroren V1.0-besluit. Besluit + één zin motivering. Geen keuze meer. |
| **DEFERRED TO PAGE MIGRATION** | De architectuur is beslist, de wáárde niet. Met de exacte voorwaarde waaronder het punt opnieuw op tafel komt. |
| **DECISION REQUIRED** | Nog echt open en door géén V1.0-besluit geraakt. |

Twee leesregels. (a) **Alle meetwaarde blijft staan**; er is uitsluitend een status en een
besluitregel toegevoegd. (b) Een DECIDED-status zegt wat V1.0 voorschrijft — **niet** dat Master v1
is gewijzigd; Master v1 blijft op aae26bf (7A.0).

Van de punten hieronder worden er drie geraakt door de contentbesluiten C-01 t/m C-07: **#5**
(header/logo, C-01), **#16c** (KPI-copy, C-07) en **#20** (leadflow, C-03 + C-06). De overige
punten zijn tokentechnisch en worden door de bevroren architectuurbesluiten beantwoord of niet.

1. **DEFERRED TO PAGE MIGRATION — Welke navy is canoniek?** `--vibe-navy` `#08203C` (8 refs),
   `--vh-navy` `#071D3A` en `--ft-navy` `#0C1B33` dragen alle drie de rol "kop op licht vlak". S1 en
   S9 zijn de enige twee secties die niet naar `--vibe-navy` wijzen. De code geeft geen reden; het
   herocommentaar zegt alleen "gemeten uit de referentie". *Niet uit de code af te leiden.*
   (home.css:41, home-hero.css:19, home-footer.css:27)
   **V1.0:** de architectuur is beslist — één SEMANTIC-token per rol, dus in V1.0 bestaat er één
   navy voor "kop op licht vlak" (7A.1, regel 4). De **waarde** is niet beslist.
   **Heropenen/beslissen bij:** migratiestap 1 (B2-master `systeem-energieopslag.html`), op het
   moment dat `--color-ink-heading` zijn PRIMITIVE krijgt. Master v1 houdt tot die tijd zijn drie
   navy's (7A.0).

2. **DEFERRED TO PAGE MIGRATION — `#4C5771` vs `#475771`, opzet of drift?** Verschil uitsluitend in
   het rode kanaal; beide dragen het label "lopende tekst / body, labels". *Onbeslisbaar uit de
   code.* (home.css:43, home-hero.css:19-20)
   **V1.0:** één SEMANTIC-token `--color-text-body`, dus één waarde (7A.1, regel 4). Of het in
   Master v1 opzet of drift was, hoeft voor V1.0 niet te worden beslist en blijft onbeslisbaar.
   **Heropenen/beslissen bij:** migratiestap 1, bij het zetten van `--color-text-body`.

3. **DECIDED — V1.0 — Het verschil tussen de vier knopradii migreert niet.** Gemeten blijft:
   9,12 / 10,00 / 11,70 / 11,81 px op desktop, 10 px op mobiel; elk sectiebestand rekent op een eigen
   referentiecanvas, dus het verschil kan reconstructie-artefact zijn of bedoeld, en dát is uit de
   code niet te beslissen (home-project.css:183, home-hero.css:213, home-control.css:267,
   home-final.css:178).
   **Besluit:** `.vibe-btn` is een bevroren primitief, dus V1.0 kent één knopvorm met één radius —
   herhaalde visuele taal hoort in een primitief, en vier radii voor één rol is geen taal maar drift.
   De numerieke waarde (`--radius-control`) wordt vastgelegd bij migratiestap 1. Master v1 wordt niet
   gerefactord (7A.0).

4. **DECIDED — V1.0 — `.7892`/`.7893cqw` en `.7328`/`.7329cqw` worden niet samengevoegd.** Gemeten
   blijft: ze renderen op 1774 px exact hetzelfde (14,00 resp. 13,00 px) en wijken op andere breedtes
   af (home-infra.css:215 vs home-process.css:97; home-infra.css:79 vs home-control.css:58).
   **Besluit:** V1.0 zet radii als tokenwaarde en niet in cqw (7A.3, 7A.4), dus het verschil verdwijnt
   vanzelf bij migratie zonder dat de historische vraag hoeft te worden beantwoord — en Master v1
   wordt er niet voor omgerekend.

5. **DEFERRED TO PAGE MIGRATION (raakt C-01) — Logoblauw `#0071FE` vs merktoken `#0073FE`.** Twee
   eenheden verschil in het groene kanaal; in de header staan logo en CTA-knop direct naast elkaar.
   *Opzet of typefout is niet uit de code af te leiden.* (index.html:131-133, :630-632, :697-699,
   :1037-1039 — zes stroke-attributen in de HTML, geen CSS — vs home.css:35)
   **V1.0:** "merkblauw" is onder 7A.5 een herhaalde semantische rol, dus de logostroke leest in V1.0
   dezelfde PRIMITIVE als de CTA, tenzij een bewust tweede merkblauw wordt vastgelegd.
   **Heropenen/beslissen bij:** het moment waarop de platte Master-v1-header als gedeelde component
   op een gemigreerde pagina wordt gezet (navigatiemodel A, C-01). Dan moet de stroke de primitive
   lezen of moet het tweede merkblauw expliciet worden vastgelegd. `index.html` blijft NU
   byte-for-byte (7A.0).

6. **DECIDED — V1.0 — `--m-eyebrow` als constante is geen open vraag meer.** Gemeten blijft: in het
   tabletblok (home-mobile.css:34-45) worden acht van de veertien `--m-*`-tokens herdefinieerd
   (`--m-gutter/-sec-y/-h1/-h2/-h3/-lead/-body/-btn-h`, :36-43), `--m-eyebrow` niet; de eyebrow
   blijft daardoor 11,5 px op 768-1199 px terwijl alles eromheen meegroeit.
   **Besluit:** V1.0 kent geen breekpunt-herdefinitie van de typeschaal — één `clamp()` per rol over
   het hele bereik (7A.4), waarmee dit faalgeval structureel niet kan ontstaan. Of het in Master v1
   opzet of een vergeten regel was, hoeft daarvoor niet te worden beslist en blijft onbeslisbaar.

7. **DECISION REQUIRED — Twee `<br>`'en overleven onder 1200 px:** index.html:546
   (`.vh-proc-kaart h3`) en index.html:1104 (`.vh-footer-nb b`). Beide hebben een exact analoge
   tegenhanger die wél is onderdrukt (home-final.css:411). *Bewust voor die copy of een gat in het
   patroon — onbekend.*
   **Waarom dit open blijft:** geen enkel V1.0-besluit raakt dit — het is een markupdetail in
   `index.html`, en de migratievolgorde bouwt **B1 niet opnieuw**. Het is daarmee uitsluitend
   beslisbaar als bewuste correctie op de bevroren homepage, niet als migratiegevolg.

8. **DECIDED — V1.0 (architectuur) — Eyebrow-casing.** Gemeten blijft: S1 t/m S4 hebben
   `text-transform:uppercase`, S5 t/m S8 niet; bij S6 (index.html:797) rendert de eyebrow daardoor
   als enige in zinsvorm. Aanvullend in deze sessie gemeten: `text-transform` komt **8×** voor in
   home*.css (home-hero.css:254, :321 · home-solutions.css:43 · home-process.css:69 ·
   home-project.css:114 · home-control.css:86 · home-mobile.css:131, :232). Vier daarvan zijn de
   eyebrows van S1 t/m S4; de overige vier horen bij andere elementen: `.vh-navy-lijst`
   (home-hero.css:321), `.vh-ctrl-bar` (home-control.css:86), het menuknoplabel
   (home-mobile.css:131) en het dode `.vh-m-eyebrow` (home-mobile.css:232). **Geen enkele
   media-query zet de casing van S5 t/m S8 onder 1200 px alsnog: de casing convergeert niet op
   mobiel**, anders dan graad en tracking, die dat wél doen (§3.1).
   **Besluit:** `.vibe-eyebrow` is een bevroren primitief, dus V1.0 kent één casingregel voor alle
   eyebrows. Welke casing dat wordt, is een waardebeslissing bij migratiestap 1; Master v1 houdt zijn
   twee gedragingen (7A.0).

9. **DECISION REQUIRED — `line-height` van de footerlink:** home-footer.css:345 zet `19px`,
   home-mobile.css:218 zet `1.35`; gelijke specificiteit, home-mobile.css wint. Het commentaar bij
   home-mobile.css:207-212 zegt dat dat blok juist alleen eigenschappen bevat "die de sectieblokken
   niet zelf al overschrijven". *Welke waarde bedoeld is, volgt niet uit de code.*
   **Wat V1.0 wél beslist:** het **mechanisme** verdwijnt — V1.0 kent geen CQW-VANGNET-blok dat op
   laadvolgorde moet winnen (7A.4). Welke van de twee waarden in Master v1 bedoeld was, volgt daar
   nog steeds niet uit, en Master v1 wordt niet gerefactord.

10. **DECIDED — V1.0 — De canonieke desktop-gutter komt van één containerprimitief.** Gemeten blijft:
    de bestandskoppen van S3 en S4 noemen 70/66 px "de containermarges van de site" en
    home-process.css:59 zegt "70px, gelijk aan sectie 1-3" — maar S1 staat op 83 px, en vijf van de
    negen secties volgen de gedocumenteerde marge niet (§4.1: 70 / 73 / 78 / 83 / 84,36 / 88,57 px).
    Welke waarde in Master v1 de bedoelde standaard was, is niet af te leiden.
    **Besluit:** `.vibe-container` is een bevroren primitief, dus V1.0 heeft één gutterregel en de
    zes gemeten desktopwaarden migreren niet als zes. De waarde wordt vastgelegd bij migratiestap 1;
    Master v1 houdt zijn per-sectie ankers zoals ze in §4.1 staan (7A.0).

11. **DECIDED — V1.0 — Desktop-sectiespacing komt van één sectieprimitief.** Gemeten blijft: zes van
    de negen secties hebben geen verticale sectiepadding maar een vaste hoogte; alleen S2 (74/59 px)
    en S3 (100/100 px) hebben echte padding en die twee komen niet overeen — er is in Master v1 geen
    waarde die als "sectiepadding" geldt.
    **Besluit:** `.vibe-section` is een bevroren primitief, dus V1.0 heeft één sectieritme in plaats
    van zes vaste-hoogte-vlakken plus twee afwijkende paddings. Waarde bij migratiestap 1; Master v1
    blijft ongewijzigd (7A.0).

12. **DECIDED — V1.0 — Welk radius-systeem geldt.** Gemeten blijft: op desktop staat `.5637cqw` in
    zes bestanden terwijl het bijbehorende token `--vibe-radius-kaart` nergens wordt aangeroepen; op
    mobiel bestaan `--m-radius` (14 px) en `--m-radius-img` (12 px), maar elke knop zet hard 10 px.
    **Besluit:** V1.0 kent één PRIMITIVE-radiusschaal → SEMANTIC per rol (`--radius-card`,
    `--radius-control`, `--radius-media`), met een componenttoken alleen op aanvraag (7A.1, 7A.3).
    De drie concurrerende systemen uit Master v1 zijn daarmee geen keuze meer maar meetwaarde.

13. **DECISION REQUIRED — Tablet-hoogtes met twee regels in hetzelfde blok.** `.vh-sol-mod--zon`
    300 px vs `.vh-sol-mod` 210 px (home-solutions.css:467-468) en `.vh-infra-foto` 330 px vs 260 px
    (home-infra.css:429 vs :443). In beide gevallen wint de laatste regel. *Uit het commentaar valt
    niet op te maken welke waarde bedoeld is.*
    **Waarom dit open blijft:** dode code in een bevroren pagina. Geen V1.0-besluit raakt het en B1
    wordt niet opnieuw gebouwd; het blijft dus een correctiebesluit op Master v1 zelf.

14. **DECIDED — V1.0 — De tokenlaag is een contract.** Gemeten blijft: twaalf van de 23
    `--vibe-*`-tokens hebben nul verwijzingen en vijf van die waarden renderen wel degelijk,
    hardgecodeerd (home.css:29-71); in Master v1 is de laag dus aantoonbaar een **restant**.
    **Besluit:** V1.0 legt de laag vast als contract — PRIMITIVE → SEMANTIC, componenttokens alleen
    wanneer een component een eigen semantische waarde nodig heeft (§7A). Dat contract geldt vanaf de
    eerste mastermigratie; Master v1 blijft het restant, omdat het hiervoor NU niet wordt gerefactord
    (7A.0).

15. **DECIDED — V1.0 (architectuur) — Dode focusring.** Gemeten blijft: home-mobile.css:177 zet
    `.vh-mobielmenu nav a:focus-visible{outline: 2px solid #4DA3FF}`; home.css:119-125 zet dezelfde
    eigenschap met `!important`, en een `!important`-declaratie wint altijd van een
    niet-`!important`-declaratie, ongeacht specificiteit. `#4DA3FF` kan dus nooit als focusring
    renderen.
    **Besluit:** in V1.0 is de focusring één SEMANTIC-rol (`--color-focus-ring`); een afwijkende ring
    op het mobiele menu mag uitsluitend bestaan als **expliciet COMPONENT-token** (7A.1, regel 2),
    nooit als niet-werkende override. Of `#4DA3FF` in Master v1 bedoeld was, blijft onbeslisbaar en
    de regel wordt niet aangepast.

16. **Commentaar vs. meetwaarde — drie gevallen, twee statussen.**
    (a) **DECISION REQUIRED.** home.css:59 zegt "drie niveaus voor de 23 losse box-shadows"; gemeten:
    **15** declaraties en geen af te leiden drie-niveau-hiërarchie (§5.5). Geen V1.0-besluit raakt
    het commentaar van een bevroren bestand.
    (b) **DECISION REQUIRED.** home-hero.css:477-481 noemt een 600px-grens ("Onder 600 px staat elk
    cijfer op een eigen regel"); er bestaat **geen 600px-media query** — de feitelijke omslag staat
    op 768 (home-hero.css:495, :508).
    (c) **DECIDED — V1.0 (C-07).** home-hero.css:479 motiveert die keuze met de string "Opgeleverde
    projecten", die in de huidige index.html **niet voorkomt**. In deze sessie opnieuw gemeten: de
    drie KPI-waarden zijn "11 projecten uitgelicht" (index.html:265), "Zon, opslag, laden en sturing"
    (:277) en "Start zonder eigen investering" (:288), met labels op :266, :278 en :289. De
    bewijsstrook bevat dus **geen** van de drie onder C-07 als UNVERIFIED aangemerkte getallen
    (47 opgeleverde projecten / 12 MWp / 98 % uptime), en "11 projecten uitgelicht" is exact de door
    C-07 voorgeschreven formulering die de telling dekt. **Alleen het commentaar is verouderd; de
    copy is al C-07-conform en wordt NU niet gewijzigd.**
    *Voor (a) en (b) geldt onveranderd: opnieuw meten of het commentaar bijwerken is een keuze, geen
    afleiding.*

17. **DECIDED — V1.0 (regel) + DECISION REQUIRED (Master v1) — `.vh-ctrl-hub` in de tabletband.**
    Gemeten blijft: `width/height 2.6cqw`, `font-size .50cqw`, `box-shadow 0 0 1.1cqw` — **geen
    enkele media-query-override**, terwijl `.vh-ctrl-mid` op home-control.css:372 in 768-1199 px
    terugkeert. Op een container van 1000 px is dat 26 px met een letter van 5 px voor het woord
    "EMS" (index.html:677). Alle andere teruggezette elementen (`.vh-ctrl-rail` :368-370,
    `.vh-ctrl-node` :340-343) krijgen wél px-waarden mee. *De code legt hier geen vangnet vast.*
    **Besluit V1.0:** voorwaarde 2 van 7A.4 verbiedt een cqw-waarde zonder equivalent onder het
    canvasbreekpunt, dus dit patroon kan in V1.0 niet ontstaan. Voor Master v1 blijft open of de
    omissie bewust is; de sectie wordt niet gerefactord (7A.0).
    **Geen tegenspraak met C-02:** het label "EMS" op index.html:677 is correct — EMS is de
    functionele categorie naast de productnaam VIBE.CONTROL. Het defect is uitsluitend de
    maatvoering, niet de term.

18. **DECISION REQUIRED — Hover-uitschakeling mist een element.** home-mobile.css:236-238 noemt
    `.vh-sol-mod:hover`, `.vh-infra-kaart:hover` en `.vh-proof-strip:hover`, maar alleen
    `.vh-infra-kaart:hover` heeft daadwerkelijk een `transform` (home-infra.css:224). Het element dat
    wél een `transform: translateY(-1px)` op hover heeft en **niet** in de lijst staat is
    `.vh-proof-org:hover` (home-proof.css:133). *Of die omissie bewust is, volgt niet uit de code.*
    **Waarom dit open blijft:** geen V1.0-besluit raakt interactiegedrag van Master v1.

19. **DEFERRED TO PAGE MIGRATION — Niet in een browser gemeten (afleidingen uit de code, geen
    render):**
    (a) 1 px kolomoverschot in S2: `28.5231 + 63.8670 = 92.3901cqw` tegenover
    `100 − 3.9459 − 3.7204 = 92.3337cqw` beschikbare breedte = 0,0564cqw = 1,00 px overschot;
    `overflow-x:clip` (home.css:85) knipt het af (home-solutions.css:27-29).
    (b) Losse `</div>` op index.html:297, zonder openende tegenhanger op dat punt (`.vh` sluit al op
    :294).
    (c) Bij browser-**tekst**zoom (niet paginazoom) groeit de tekst wel en het vaste-hoogte-vlak niet;
    op ≥1200 px kan overlopende koptekst dan worden afgekapt door `overflow:hidden`
    (home-control.css:17-22, home-proof.css:15-19, home-infra.css:13-17, home-final.css:15-19,
    home-footer.css:15-19).
    *Alle drie zijn afleidingen; in deze sessie is geen browser gedraaid.*
    **Dit is geen besluit maar een verificatiegat.** **Heropenen/meten bij:** de stap
    VISUAL + FUNCTIONAL REVIEW in de vastgelegde migratievolgorde, waar voor het eerst een render
    wordt beoordeeld. Tot die meting blijven (a), (b) en (c) afleidingen en **NIET GEDRAAID** — nooit
    PASS.

20. **DEFERRED TO PAGE MIGRATION (raakt C-03 + C-06) — Buiten de CSS-scope maar het rendert:**
    index.html laadt `_consent.js` en `_leadpopup.js` (index.html:4, :1243). `_consent.js:57-84`
    injecteert een stylesheet met `#00ADEF`, `#0096CC`, `#0078AD`, `#06121C`, `#0E1B24`, `#5E6F79`,
    `#33454F` — het cyane palet van het vorige designsysteem (in deze sessie geverifieerd op
    _consent.js:57 en :60). De cookiebanner en de leadpopup zijn daarmee de enige cyane vlakken op
    een verder blauwe pagina. *Of dat zo hoort, staat nergens vastgelegd.*
    **V1.0:** een geïnjecteerde overlay leest de V1.0 SEMANTIC-tokens; een tweede, ouder palet naast
    het merkpalet is onder 7A.1 (regel 4) geen toegestane toestand.
    **Heropenen/beslissen bij:** de migratie van de leadflow — de gated guides staan als stap 7 (S2)
    in de migratievolgorde en de leadpopup wordt daar onder C-03 (gated assets) en C-06
    (assetlevering) hoe dan ook aangeraakt. **NU GEEN productiecode wijzigen.**
    *Zijdelings, buiten de tokenscope:* dezelfde file draagt een claim zonder bron —
    `_leadpopup.js:116` rendert `VIBE ENERGY<br>7 waardestromen · 0 jr wachttijd<br>−22% netinkoop`
    (in deze sessie gelezen). Die valt onder de claimpolicy (UNVERIFIED, C-07), niet onder dit
    document, en wordt bij diezelfde migratie VERIFIED gemaakt, herschreven of verwijderd.

### Stand van §8 na bijwerking

| Status | Punten | Aantal |
|---|---|---|
| **DECIDED — V1.0** | 3 · 4 · 6 · 8 · 10 · 11 · 12 · 14 · 15, plus deelgeval 16c en de V1.0-regel in 17 | 9 hele punten + 2 deelgevallen |
| **DEFERRED TO PAGE MIGRATION** | 1 · 2 · 5 · 19 · 20 | 5 |
| **DECISION REQUIRED** | 7 · 9 · 13 · 18, plus deelgevallen 16a, 16b en de Master-v1-vraag in 17 | 4 hele punten + 3 deelgevallen |

**Controle.** Er staat geen punt meer als DECISION REQUIRED waar C-01 t/m C-07 een antwoord geeft:
de drie punten die die besluiten raken — #5 (C-01), #16c (C-07) en #20 (C-03 + C-06) — dragen de
bijbehorende status mét verwijzing. **CONTENT PENDING komt in dit document niet voor:** geen enkel
openstaand punt wacht op ontbrekende businessinformatie; alle resterende DECISION REQUIRED zijn
code-technisch en betreffen een bevroren pagina die niet opnieuw wordt gebouwd.

---

## Verantwoording

**Gemeten in deze sessie**, tegen de bronbestanden op commit
`aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1` (`git log -1` bevestigd; working tree schoon op
`.DS_Store` en `review/` na):

- `--vibe-*`-tokendefinities en per-token `var()`-telling (23 tokens, 12 dood)
- `--m-*`-tokendefinities en per-token gebruikstelling
- alle 48 per-sectie kleuraliassen en hun token-backing
- alle 30 `@media`-blokken, gegroepeerd per grens
- alle `box-shadow`-declaraties (15), `border-radius`-declaraties, randbreedtes (25 × 1px,
  1 × 1,5px, 1 × `.115cqw`, 0 dashed/dotted), `clip-path`-declaraties per bestand
- typografieblokken van S1 t/m S8 (eyebrow, kop, lead) en alle tien CTA-definities, direct gelezen
- gutters en sectiepadding van S1 t/m S9, direct gelezen
- frequentie van 14 losse palettewaarden
- het mobiele eyebrowritme (9 toepassingen) en de gedeelde mobiele knopvorm

**Aanvullend gemeten in deze sessie, voor §7A en de bijwerking van §8** (zelfde commit; `git log -1`
opnieuw bevestigd, working tree onveranderd schoon op `.DS_Store`, `docs/` en `review/` na):

- **111** `font-size`-declaraties in `cqw`, verdeeld over de negen sectiebestanden
  (control 20 · proof 17 · footer 12 · infra 12 · solutions 12 · final 11 · hero 11 · process 8 ·
  project 8); `home.css` en `home-mobile.css` hebben er nul.
- **0** `cqw`-declaraties binnen een `max-width:1199px`-blok — per sectiebestand gecontroleerd vanaf
  de regel waar dat blok opent. De twee cqw-vermeldingen in `home-mobile.css` (:12, :209) staan in
  commentaar.
- **9** `clamp()`-declaraties in de hele homepage-CSS: home-mobile.css:16, :21, :22, :36, :38, :39,
  :168 en home-final.css:345, :419 — alle negen in dienst van de laag onder 1200 px.
- het `CQW-VANGNET`-blok en zijn motivering, direct gelezen: home-mobile.css:207-221.
- **155** `rgba()`-declaraties in `home.css` + de negen `home-*.css`, gegroepeerd per rgb-basis:
  `rgba(3,20,44)` 25 · `rgba(255,255,255)` 22 · `rgba(0,115,254)` 14 waarden over 11 declaraties ·
  `rgba(26,86,156)` 10 · `rgba(120,175,240)` 7 · `rgba(0,22,50)` 7 · `rgba(8,32,60)` 6 ·
  `rgba(16,58,110)` 6 · `rgba(12,38,72)` 6 · `rgba(62,155,255)` 5 · `rgba(4,20,44)` 5 ·
  `rgba(10,38,74)` 3 · `rgba(16,28,58)` 2 · `rgba(12,27,51)` 2.
- alle **8** `text-transform`-declaraties in home*.css, met hun element (§8-8).
- de drie KPI-waarden en -labels van de hero-bewijsstrook, direct gelezen: index.html:265, :266,
  :277, :278, :288, :289 (§8-16c).
- `_consent.js:57-60` (cyaan palet) en `_leadpopup.js:116` (claimregel), direct gelezen — uitsluitend
  gelezen, niet gewijzigd.

**NIET GEDRAAID** — en daarom nergens als PASS gerapporteerd:

- geen browserrender, geen screenshot, geen devtools-meting. Alle px-waarden zijn rekenkundig uit
  cqw × 17,74 afgeleid, niet gemeten in een viewport.
- geen contrastmeting. Waar de code een contrastcijfer noemt (home-solutions.css:171-175), is dat
  geciteerd, niet geverifieerd.
- geen a11y-audit, geen lint, geen build — dit repository is een statische site zonder
  buildpipeline in scope van deze opdracht.

**Wijzigingen aan de website: geen.** Er is uitsluitend geschreven naar
`/Users/mounirvanbinsbergen/projects/vibe-website/docs/vibe-design-tokens-v1.md`.
