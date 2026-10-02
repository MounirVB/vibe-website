# VIBE SECTION COMPOSITION SYSTEM

**DESIGN SYSTEM V1.1 — COMPOSITION EXTENSION**

| | |
|---|---|
| **Status** | `V1.1 — ADDITIEF op V1.0`. V1.0 blijft `FROZEN`. |
| **Bron Homepage Master v1** | commit `aae26bf9a93c800e1ab0aac7e7dbd74a41eafdf1` (`index.html` + de tien `home-*.css`) |
| **Bron Design System V1.0** | commit `8ea4c2528fde185df07035fa3c581ef50bf18339` — `FROZEN` |
| **B2-reviewkandidaat** | `systeem-energieopslag.html` + `vibe-system.css` + `vibe-storage.css`, ongecommit in de werkboom |
| **Meetviewport** | 1774px, na volledige scroll. Op dat scherm geldt `1cqw = 17,74px` voor elke homepagesectie. |
| **Wijzigingen aan productiecode** | **geen.** Dit document is READ-ONLY tot stand gekomen. Er is uitsluitend één bestand onder `docs/` aangemaakt. |
| **Controle op de bron** | `git diff --stat aae26bf..8ea4c25 -- index.html home-*.css` geeft lege uitvoer: de werkboomversie van `index.html` en de tien `home-*.css` is byte-identiek aan Master v1. |

**De nieuwe laag in het systeem:**

```
TOKENS -> PRIMITIVES -> COMPONENTS -> SECTION COMPOSITIONS -> PAGE ARCHETYPES
                                      ^^^^^^^^^^^^^^^^^^^^
                                      dit document
```

---

## §1 · Wat dit document is

### 1.1 Waarom het bestaat

De B2-reviewkandidaat `systeem-energieopslag.html` is **technisch consistent** en **visueel generiek**. Hij overtreedt geen enkele regel uit V1.0: hij gebruikt de bevroren primitieveset, de bevroren tokenhiërarchie, de bevroren breekpunten en de bevroren claimpolicy. Hij ziet er niettemin niet uit als een Vibe-pagina, en de reden is meetbaar.

V1.0 legt vast **waaruit** een pagina bestaat. Het legt niet vast **hoe die delen zich tot elkaar verhouden binnen één sectie** en **hoe secties zich tot elkaar verhouden binnen één pagina**. Dat gat is precies de laag waarin Homepage Master v1 haar herkenbaarheid draagt. `vibe-web-brandbook-v1.md §2.3` stelt dat al vast in andere woorden: *Master v1 is visueel consistent, maar heeft structureel nog geen bibliotheek.* V1.1 vult die ene ontbrekende laag in — meer niet.

### 1.2 De gemeten aanleiding

Gemeten in deze sessie op 1774px, na volledige scroll:

| Meting | B2-kandidaat | Homepage Master v1 |
|---|---:|---:|
| Overlappende elementen | **5** | **48** |
| `clip-path`-dragers in de DOM (geometrie) | **2** | **11** |
| Breedste inhoudsvlakken | **1240 / 1080 / 716 px** | **1740 / 1704 / 1584 px** |
| Volle-breedte vlakken | **15** | **25** |

**Conclusie: de homepage LAAGT, de B2-pagina STAPELT.** De homepage legt 48 elementen over elkaar; de B2-pagina vijf, waarvan drie hetzelfde label op drie casefoto's (`vibe-storage.css:134`). De B2-pagina doorbreekt haar container van 1240px nergens — twaalf van de twaalf secties delen exact dezelfde `.vibe-container` (`vibe-system.css:85`, `:143-146`), inhoudsbox 1080px, van `x=347` tot `x=1427`, op elke sectie dezelfde twee verticale lijnen. De homepage voert inhoudsvlakken tot 1740px, dus tot op 17px van de schermrand.

**Corroboratie van de clip-path-telling.** `grep` over de tien `home-*.css` geeft **20** `clip-path`-declaraties. Vijf daarvan zijn `clip-path:none` (`home-hero.css:450`, `home-proof.css:434`, `home-infra.css:345`, `home-final.css:376`, `home-footer.css:376`) en alle vijf staan binnen een `@media (max-width:1199px)`-blok — gecontroleerd. Blijft 15. Twee daarvan zijn mobiele vervangdriehoeken (`home-hero.css:463`, `home-final.css:394`). Blijft 13 desktopregels. Twee daarvan staan op een pseudo-element (`home-solutions.css:318` op `.vh-sol-grafisch::before`, `home-control.css:40` op `.vh-ctrl::before`) en zijn dus niet als DOM-element te tellen. **Blijft 11 — exact de browsermeting.**

> **Afwijking van het bevroren document, gemeten in deze sessie.** `vibe-web-brandbook-v1.md §4.1.1` noemt "Totaal 20 declaraties, waarvan 4 `clip-path: none`". De per-bestand-tabel in diezelfde paragraaf noemt er echter vijf (`:450`, `:434`, `:345`, `:376` in `home-final.css`, `:376` in `home-footer.css`), en `grep` bevestigt vijf. Het getal 4 in de prozaregel is fout; de tabel en het totaal van 20 kloppen. Dit verandert niets aan de telling van 11 en niets aan enige regel — het is hier vastgelegd zodat een volgende lezer niet op de prozaregel afgaat.

**Corroboratie van de breedtes.** `1740,0px = 98,084cqw` (`home-hero.css:337`). `1704,0px = 1774 − 70` (`home-project.css:49`). `1584,0px = 1774 − 94 − 96` (`home-process.css:155`). Alle drie statisch nagerekend.

**Per sectie gemeten.** Homepage: 6 · 6 · 2 · 0 · 3 · 6 · 5 · 5 · 8 overlappingen — 8 van 9 secties laagt. B2: 0 · 0 · 0 · 0 · 0 · 3 · 0 · 0 · 0 · 0 · 0 — 10 van 12 secties stapelt alleen.

**Kopschaal.** Homepage: 76 · 61 · 58 · 64 · 54 · 53 · 61 · 66 px, spreiding H2 `66,0/53,0 = factor 1,25`. B2: 62 · 44 · 44 · 44 · 44 · 44 · 44 · 44 · 44 · 44 · 44 px, spreiding H2 `44/44 = factor 1,00`. Tien sectiekoppen op één graad.

### 1.3 Wat dit document NIET doet

V1.1 is **additief**. Het vervangt niets. Ongewijzigd en bindend blijven:

- **Tokens** — `vibe-design-tokens-v1.md`, en `vibe-web-brandbook-v1.md §1A.5` (PRIMITIVE → SEMANTIC, derde laag alleen op aanvraag).
- **Primitives** — de bevroren set uit `§1A.4` / `vibe-page-archetypes-v1.md §4.4`.
- **Naamgeving** — `§1A.2` (VIBE.CONTROL / EMS) en de `.vibe-*` / sectieprefix-conventie uit `vibe-component-library-v1.md §2`.
- **Archetypes** — B1..B7 + S2, `§1A.3` en `vibe-page-archetypes-v1.md §4.1`. Een bouwtype blijft geen rigide template.
- **Claim policy** — de vijf statussen, `§1A.7` en `vibe-page-archetypes-v1.md §4.3`. `PUBLICLY EXISTING ≠ VERIFIED` blijft hard.
- **Navigatiebesluiten** — `§1A.1` (C-01) en `§1A.9` (C-04: geen sticky mobiele CTA).
- **Responsive architectuur** — `§1A.6`: ≤767 / 768-1199 / ≥1200, `clamp()` als default, de vier collapse-bewegingen uit `§5.3`.
- **Migratiemethodiek** — `§1A.11` en `vibe-migration-checklist-v1.md §0`.

**Bij tegenspraak wint V1.0.** Een compositieregel die een bevroren besluit zou doorkruisen, staat in §8 als `DECISION REQUIRED` en niet als regel.

### 1.4 Verhouding tot de zes bestaande documenten

| Document | Wat V1.1 daaruit als gegeven neemt | Wat V1.1 toevoegt |
|---|---|---|
| `vibe-web-brandbook-v1.md` | §1A (frozen baseline), §4.1 (geometrie, vormen, hellingfamilie), §4.2 (fotografie, scrims), §5.3 (collapse) | §3 en §5: de compositionele regels die uit diezelfde metingen volgen maar er niet in stonden |
| `vibe-design-tokens-v1.md` | §2-§5 waardetabellen, §6 breekpunten | niets; V1.1 introduceert **geen enkele nieuwe token** |
| `vibe-component-library-v1.md` | §3 componentanatomie, §6 dode CSS | §4: de laag bóven componenten — hoe componenten binnen een sectie worden gerangschikt |
| `vibe-page-archetypes-v1.md` | §4.1 B1..B7, §4.2 B2-proofregels | §6: welk ritme een archetype mag dragen; §4: welke families per archetype geschikt zijn |
| `vibe-migration-checklist-v1.md` | §5 QA-poorten P1-P12 | §7: dertien-plus anti-patronen die als extra reviewpoort dienen |
| `vibe-legacy-inconsistencies-v1.md` | het register HOOG/MIDDEL/LAAG | niets; V1.1 voegt geen legacy-item toe |

---

## §2 · Art direction uit Master v1

Per homepagesectie tien aspecten, en per sectie de scheiding tussen wat **herbruikbaar** is en wat **homepage-specifiek** blijft. De maten zijn berekend uit `cqw` op 1774px; alle negen secties zetten `container-type:inline-size` (`home-hero.css:11`, `home-solutions.css:10`, `home-project.css:20`, `home-process.css:20`, `home-control.css:17`, `home-proof.css:15`, `home-infra.css:14`, `home-final.css:16`, `home-footer.css:15`).

**Vijf referentiecanvassen, niet één.** S1 `1774×748` · S2/S6/S7 `1774×887` · S4/S5 `1536` breed met factor ×1,16917 · S8/S9 `2103×748` met factor ×0,84356 · het S3-paneel `2056×682` met factor ×0,8288.

**Sectiehoogtes op 1774px:** S1 908,0 · S2 ca. 884 · S3 765,0 · S4 453,2 · S5 588,5 · S6 887,0 · S7 887,0 · S8 631,0 · S9 631,0.

---

### S1 · Hero — `index.html:75-297`, `home-hero.css`

| Aspect | Meting |
|---|---|
| **Compositie** | Eén podium van 1774×748 (`:35-49`, `aspect-ratio:1774/748`, `overflow:hidden`) met **zeven** absoluut gepositioneerde lagen; vijf staan op `inset:0`. Tekstkolom links op `x=83,0` (`:243-248`). Fotovlak rechts, weggesneden langs een diagonaal van (997,0) via de knik (624,545) naar (755,748) (`:57-63`). De header zit **in** hetzelfde podium (`:137-146`, `z-index:10`). Daaronder, buiten het podium, een strook van 160,0px met drie bewijsregels op 1740,0px (`:328-342`). |
| **Hiërarchie** | H1 76,5px / regelafstand 73px (`:258-266`) — grootste letter van de pagina. Eyebrow 16,4px, tracking `.092em` (`:249-257`). Lead 21,6px, `max-width:460,0px` (`:268-275`). Twee knoppen van 62px. Desktopnavigatie 15,5px/600 (`:175-183`) — bewust één niveau **onder** de lead. Tweede kop 31,0px in gewicht 400 op de navyvorm (`:296-304`). |
| **Dichtheid** | 19 `<a>`, 1 `<img>`, 0 koppen onder de H1, 9 `<svg>`, 4 `<li>`, 5 `<br>`. Laagste tekstdichtheid per pixel van de pagina. |
| **Mediarelatie** | Eén beeld (`index.html:84-88`, `loading=eager`, `fetchpriority=high`, het LCP-beeld). Het is geen object maar een **vlak**: het vult het podium en wordt door de snede tot vorm gemaakt. Tekst staat er nooit op. De enige witte tekst op donker staat op de SVG-navyvorm — getekende geometrie, geen fotografie. |
| **Geometrie** | Vijf gebaren, het maximum van de pagina: fotosnede (`:57-63`) · lichte band van 105 ref-px die **beide** randen met de hoofddiagonaal deelt (`:87-102`) · zachte wig onder de knik (`:115-132`) · SVG-accentwig `1774,50 → 1270,748` (`index.html:119`) · SVG-navyvorm met boog `r=90` (`index.html:120-121`). Helling hoofddiagonaal −0,684 (34,4°), terugslag +0,645. |
| **Overlap** | Zeven lagen, `z-index 1 · 2 · 3 · 4 · 10 · 11 · 11`. **Nul negatieve marges.** Het laagwerk komt volledig uit `position:absolute` binnen één `position:relative`-podium. De navy-tekstkolom op `x=1368,0` valt met 59px marge binnen de SVG-vorm. |
| **Leegte** | Tussen de rechterrand van de lead (83 + 460 = 543px) en het begin van de diagonaal bovenin (997px) ligt **454px** onbewerkt bleekblauw — de grootste aaneengesloten leegte van de pagina. Zij is het onderwerp: de H1 luidt "Ruimte voor groei" (`index.html:186`). |
| **Contrast** | Navy `#071D3A` op `#EAF4FE` links; wit op een vijfstops-verloop `#2E93FD → #001836` rechts (`index.html:97-113`). KPI-strook `#061B36` op bijna wit. |
| **Overgang** | De KPI-strook van 160,0px is een decompressiekamer: haar verloop (`:331`, `#F7FCFF → #FCFDFE → #FDFDFE`) eindigt op de achtergrondwaarde van S2 (`#FCFDFE`, `home-solutions.css:13`). Geen zichtbare naad. |
| **Herkenbaarheid** | De Vibe-diagonaal **met** inkeping, de badge-plus-woordmerk-lockup, een wig die in één verloop naar `#001836` zakt, en een H1 waarvan de tweede helft in merkblauw staat. |

**HERBRUIKBAAR PRINCIPE — OPENINGSPODIUM.** Een sectie mag een vlak met vaste verhouding zijn waarin alle lagen absoluut zijn gepositioneerd. Beeld wordt tot vorm gemaakt door een **snede**, niet door een kader. Maatregel: één fotovlak, één lichtstreep op exact dezelfde helling als de snede, maximaal vijf geometrische gebaren, en alleen in een pagina-opening. Typografisch: de navigatie blijft één niveau onder de lead. Inhoudelijk: een tweede tekstkolom mag op een getekend vlak staan, nooit op fotografie.

**HOMEPAGE-SPECIFIEK.** De hero met **ingebakken header**: `.vh-header` zit in dezelfde `.vh-stage` (`index.html:128-161` binnen `:77-206`) en `index.html` laadt `_header.js` **niet**, terwijl de 34 andere pagina's dat wel doen (`vibe-page-archetypes-v1.md:256`). Verder: de `aspect-ratio 1774/748`, de exacte knikcoördinaat (624,545), de tweede tekstkolom binnen de navyvorm, en de driedelige bewijsstrook op 1740,0px.

---

### S2 · Oplossingen — `index.html:300-457`, `home-solutions.css`

| Aspect | Meting |
|---|---|
| **Compositie** | Twee kolommen zonder gap: redactionele kolom 506,0px links, moduleraster 1133,0px rechts (`:26-30`, padding 74/66/59/70) — verhouding **31/69**. Het raster is uitdrukkelijk géén gelijkmatig grid: bovenrij `487 \| 302 \| 292`, onderrij `371 \| 353 \| 355`, rijhoogtes 498 en 230 (`:126-143`). Twee verschillende kolomverdelingen boven elkaar via `grid-template-areas 'a b c' / 'd e f'` plus een genest raster. |
| **Hiërarchie** | H2 61,5px op 60,5px (`:46-54`). Eyebrow 18,2px met tracking `.175em` (`:37-45`) — de zwaarste tracking van de pagina. Binnen het raster **twee** graden: de uitgelichte kaart krijgt h3 26,6px, icoon 44px, pijl 46px (`:241-249`); de vijf overige h3 18,4px, icoon 40px, pijl 38px (`:208-231`). Eén hoofdkaart, vijf nevenkaarten. |
| **Dichtheid** | De hoogste elementdichtheid van de pagina: 7 `<a>`, 5 `<img>`, 7 koppen, 16 `<svg>`, 3 `<li>`, 8 `<br>`. Toch geen drukte: de lead is op 400,0px vastgezet (`:57-64`) en de kaarttekst blijft in de bovenste ca. 30%. |
| **Mediarelatie** | Vijf foto's zijn kaart**GROND**, geen illustratie: `position:absolute; inset:0; object-fit:cover; z-index:0` (`:155-163`). Het leesbaarheidsverloop is **per rij** afgestemd: bovenrij dicht van 0 tot 38%, volledig opgeklaard op 72% (`:176-187`); onderrij juist onderin dicht (`:188-198`). Het commentaar noemt de meting die daartoe leidde: met het vorige diagonale verloop stond witte kaarttekst plaatselijk op **1,00:1** contrast (`:171-175`). De HVAC-kaart heeft geen foto en krijgt een **getekend** navyvlak met dezelfde diagonaal (`:306-320`). |
| **Geometrie** | Eén gebaar: `.vh-sol-grafisch::before`, `polygon(46% 0, 100% 0, 100% 100%, 0 100%)` op een doos van 78%×124% (`:311-320`). De sectie zelf is ongesneden. Radius `.5637cqw = 10,0px` op elke kaart. |
| **Overlap** | Per kaart vier lagen: beeld z0, verloop z1, inhoud z2, pijlknop z3. Zes kaarten × drie elementen op het beeld = **18 overlappingen**, het grootste aandeel in de 48. Geen kaart steekt buiten een andere: het laagwerk zit **binnen** de kaart. |
| **Leegte** | De onderste 60-70% van de drie bovenkaarten blijft leeg beeld. Rijafstand 23,0px en kolomafstand 26,0px zijn de smalste van de pagina — de leegte zit **in** de kaart, niet ertussen. |
| **Contrast** | Sectiegrond `#FCFDFE`; kaarten wit op `rgba(3,20,44,.90-.92)`; links navy `#08203C` op bijna wit. De enige sectie waar licht en donker naast elkaar in één raster staan. |
| **Overgang** | In: de KPI-strook dooft uit op dezelfde waarde. Uit: `#FCFDFE` is identiek aan `.vh-pr{background:var(--vibe-paper)}` (`home-project.css:24`, `home.css:50`). De naad S2→S3 bestaat kleurtechnisch niet. |
| **Herkenbaarheid** | De donkere kaart met wit icoon linksboven, kop eronder en een ronde witte pijlknop op vaste positie. Plus de regel dat een ontbrekend beeld een getekend vlak in de eigen vormtaal wordt. |

**HERBRUIKBAAR PRINCIPE — ONGELIJK KAARTRASTER.** Twee rijen met verschillende kolomverdeling én verschillende rijhoogte. Eén kaart krijgt een eigen typografische graad, de rest deelt er één. Nooit twee gelijke kaartrasters achter elkaar; daarna volgt dominant beeld, asymmetrische redactionele compositie of bewuste leegte. Tweede principe: het leesbaarheidsverloop volgt de **tekstpositie** (verticale band), niet de kaartdiagonaal, en wordt per rij opnieuw ingesteld — met een gemeten contrastwaarde als reden.

**HOMEPAGE-SPECIFIEK.** De zes bestemmingen (zon, batterij, laden, HVAC, EMS, handel), de 506|1133-verdeling, en het feit dat de linkerkolom naast kop en lead óók een eigen CTA, een scheidingslijn en drie voordeelrijen draagt. Een subpagina met vier of vijf modules kan die kolomverdeling niet overnemen.

---

### S3 · Project in de kijker — `index.html:460-522`, `home-project.css`

| Aspect | Meting |
|---|---|
| **Compositie** | Eén paneel van 1704,0 × 565,0px (`:47-55`, `aspect-ratio:1704/565`) dat op de containermarge van 70,0px begint en aan de rechterkant van het scherm **af** loopt — 96,1% van de viewport. Radius uitsluitend links: `3.5507cqw 0 0 3.5507cqw` = 63,0px links, 0 rechts (`:52`). Binnen het paneel vier absolute lagen; de tekstkolom staat op 97 ref-px vanaf de paneelrand (`:101-107`). |
| **Hiërarchie** | Titel 58,3px in gewicht 700 (`:117-125`), daaronder een statement van 40,1px in gewicht **400** (`:126-133`) — een tweede kopregel in lichter gewicht in plaats van een kleinere graad. Dan body 20,0px in `#93A5BC`, dan drie metrieken met `b` op 28,4px gescheiden door 1px-lijnen (`:143-168`), dan een knop van 65,5px plus een tekstlink. Vijf niveaus in één kolom. |
| **Dichtheid** | De laagste van de negen: 2 `<a>`, 1 `<img>`, 1 kop, 3 `<svg>`, 0 `<li>`, 3 `<br>`. Eén project, drie cijfers, twee acties. |
| **Mediarelatie** | De foto **is** het paneel (`:58-66`, `inset:0`, `object-position:54% 62%`). Leesbaarheid komt van een scrim met vijf stops die op 70% volledig transparant is en waarvan de linker 20% massief `#001632` is (`:69-83`). Dit is de enige sectie waar witte tekst over de volle koplengte rechtstreeks op fotografie staat. |
| **Geometrie** | **Geen enkele `clip-path` in dit bestand.** De vorm komt uit een inline SVG met `preserveAspectRatio="none"` (`index.html:478-493`): verdonkerend topvlak `1777,0 2056,0 2056,682 1321,682`, blauwe accentwig `2056,296 → 1776,682`, lichtrand `#BFD9FF` op 55%. De afgeronde linkerhoek van 63,0px tegenover een kaarsrechte, aflopende rechterrand is zelf het vormbesluit. |
| **Overlap** | Vier lagen, `z-index 0 · 1 · 2 · 3`. Het paneel overlapt de sectiegrens niet, maar loopt wél over de rechter **scherm**rand. Op mobiel wordt die laag een negatieve marge: `.vh-pr-copy` krijgt `margin-top:-26px` plus een verloop dat de bovenste 26px doorzichtig houdt (`:250-262`). |
| **Leegte** | 100,0px padding boven en onder (`:23`). Binnen het paneel blijft de rechterhelft leeg beeld. De verhouding 1704:565 = **3,02:1** is de breedste van de pagina — leegte is hier horizontaal. |
| **Contrast** | Het enige grote donkere vlak van de pagina: `#001632` met wit. Merkblauw alleen in de knop en de eyebrow `#0490FF`. |
| **Overgang** | In: `.vh-pr::before`, een radiale gloed van 195,1px hoog met brandpunt op 58% breedte (`:35-42`), plus 100,0px padding — het donkere paneel raakt de sectienaad nooit. Uit: opnieuw 100,0px papier. |
| **Herkenbaarheid** | Navy `#001632` met één afgeronde hoek links, een beeld dat van het scherm af loopt, en een blauwe wig met lichtrand rechtsonder. |

**HERBRUIKBAAR PRINCIPE — UITGELICHT PANEEL.** Eén onderwerp per paneel; beeld als grond; scrim **vanaf** de leeskant; tekst op de donkerste 20%. Het paneel begint op de containermarge en loopt aan één zijde van het scherm af, met radius uitsluitend aan de kant die de marge raakt. Drie metrieken gescheiden door 1px, nooit meer. Een tweede kopregel mag de eerste opvolgen in gewicht 400 zonder ermee te concurreren — een goedkopere hiërarchie dan een extra graad.

**HOMEPAGE-SPECIFIEK.** Hedin Alkmaar met 645 kWh / 300 kW / +70% (`index.html:502-510`) en de SVG-coördinaten op het 2056×682-canvas. Ook: `.vh-pr-copy` heeft **geen** `width` en geen `max-width` (`:101-107`); de regellengte is met de hand gezet via drie `<br>` (`index.html:500`). Dat werkt alleen bij deze exacte copy. **Let op:** de claim `645 kWh` staat in `vibe-page-archetypes-v1.md §4.3` als `CONFLICTING` (DR-12) — de compositie is herbruikbaar, het cijfer niet.

---

### S4 · Van plan naar prestatie — `index.html:525-610`, `home-process.css`

| Aspect | Meting |
|---|---|
| **Compositie** | Twee blokken onder elkaar. Boven (`:51-55`, hoogte 396,3px): kopkolom links op `x=70,0` (breedte 612,0px), foto rechts op `x=751,6..1708,0`, en een witte kaart op `x=1426,2..1708,0` die over de rechterkant van die foto ligt — **beide eindigen op exact dezelfde x**. Onder: vier processtappen in één rij van 1584,0px (`:152-159`, marges 94,0 links / 96,0 rechts) met chevrons ertussen. Daaronder een lege balk van 56,9px. |
| **Hiërarchie** | H2 64,0px (`:72-80`), met het commentaar `/* 74,2 -> 64 px: concurreert niet meer met de hero-H1 */` op `:75`. Lead 23,6px — de **grootste** lead van de pagina. In de stappenrij zakt alles: badge 14,2px, h3 18,7px, body 15,3px. Van 64 naar 14,2px binnen één sectie. |
| **Dichtheid** | **Nul links in de hele sectie** — de enige sectie zonder uitgang. 1 `<img>`, 6 koppen, 8 `<svg>`, 10 `<br>` (de meeste handgezette regelovergangen van de pagina). Vier stappen van 292,0px breed. |
| **Mediarelatie** | Eén foto, en als enige grote foto **zonder scrim**: `.vh-proc-beeld` heeft geen `::after` (`:91-111`). Dat mag, omdat er geen tekst op ligt — wat erop ligt is een dekkende witte kaart. Het kader heeft radius 14,0px en achtergrond `#E8F1FB`, expliciet gekozen zodat de laadtoestand als lege ruimte leest en niet als fout (`:99-104`). |
| **Geometrie** | Eén gebaar: `.vh-proc-backdrop`, `polygon(42.30% 0, 100% 0, 100% 100%, 28.92% 100%)` op een volle-breedte vlak van `y=24,6` tot `y=380,0` (`:37-46`). De diagonaal loopt van `x=750,4` boven naar `x=513,0` onder. De linkerrand van de foto staat op `x=751,6` — **1,2px** van het bovenste hoekpunt. |
| **Overlap** | Eén echte cross-element-overlapping op desktop: `.vh-proc-kaart` over `.vh-proc-beeld`, met een **gedeelde rechterpunt op `x=1708,0`** (`:92-123`, commentaar "rechterrand gelijk aan de foto" op `:118`). Op mobiel wordt dezelfde overlapping met `margin:-26px` plus `position:relative;z-index:2` gemaakt (`:229-239`). |
| **Leegte** | `.vh-proc-onder{height:3.2074cqw}` = **56,9px zuivere lege hoogte** (`:204`), `aria-hidden` in de HTML (`index.html:609`) — het enige leegte-element van de pagina. S4 is met 453,2px bovendien de laagste sectie: hij is de ademhaling tussen twee zware blokken. |
| **Contrast** | Het lichtste blok van de pagina: grond `#FCFDFE` met een achtervlak `#E1F1FE → #EFF8FE`. Geen enkel donker vlak. Accent alleen in de badges en in de chevrons op `#B9C7D8` — een grijs dat nergens anders voorkomt (`:33`). |
| **Overgang** | In: 100,0px papier, dan begint de diagonaal 24,6px na de sectierand. Uit: 56,9px leeg wit. Dit is de enige harde spatie op de pagina; alle andere overgangen zijn kleuruitdovingen. |
| **Herkenbaarheid** | De voortgang als **één horizontale rij met chevrons** in plaats van vier kaarten — en de witte kaart die met de pixel op de fotorand uitlijnt in plaats van er willekeurig op te zweven. |

**HERBRUIKBAAR PRINCIPE — PROCES ALS RIJ, NIET ALS RASTER.** Vier stappen in één horizontale voortgang met chevrons; geen kaarten, geen randen, geen schaduwen. Tweede principe: een zwevende kaart deelt **minstens één rand exact** met het beeld waarop hij ligt — dat is het verschil tussen laag en rommel. Derde principe: een sectie zonder uitgang mag bestaan als ademruimte, en is dan ook de kortste van de pagina.

**HOMEPAGE-SPECIFIEK.** De vier stapnamen, de rij van precies 1584,0px, en de snijpercentages 42,30% / 28,92%. Die percentages horen bij **deze** doosverhouding; overnemen levert een andere hoek op (`vibe-web-brandbook-v1.md §4.1.3`).

---

### S5 · VIBE.CONTROL — `index.html:613-784`, `home-control.css`

| Aspect | Meting |
|---|---|
| **Compositie** | Apparaten links, tekst rechts. Dashboard op `x=202,1..887,2`, `y=60,8..487,5`; telefoon op `x=78,2..225,5`, `y=161,3..465,3` — hij steekt 23,4px over de linkerrand van het dashboard en valt er verticaal **volledig** binnen. Tekstkolom `x=981,9` tot 66,0px van de rechterrand: 726,1px breed. Daartussen 94,7px leeg. |
| **Hiërarchie** | H2 54,0px (`:210-218`), lead 20,2px. Vier kenmerken in een 4-koloms raster waarin kop en toelichting op **dezelfde** graad staan (beide `.947cqw = 16,8px`, `:242-257`); alleen gewicht 700 tegen 400 scheidt ze. De CTA is 50,3px hoog — de laagste primaire knop van de pagina. Binnen het scherm loopt de typografie door tot `.40cqw = 7,1px`, de kleinste letter van de pagina (`:178`). |
| **Dichtheid** | 24 `<svg>` — meer dan drie keer het pagina-gemiddelde — maar bijna allemaal in de nagebouwde interface. 7 `<a>`, 2 koppen, **0 `<img>`**, 8 `<br>`. De tekstkolom zelf is juist rustig. |
| **Mediarelatie** | De enige sectie met **nul fotografie**. In plaats van een productscreenshot — die volgens het eigen commentaar niet bestaat (`index.html:615-622`) — staat er een gebouwde interface met waarden die al elders op de site gepubliceerd zijn, plus de voettekst "Voorbeeldweergave" (`index.html:688`). Twee apparaten zonder mockup-frame: alleen radius, 1px rand en twee schaduwlagen. |
| **Geometrie** | Eén gebaar, en het is bijna onzichtbaar: `polygon(7.0% 9.5%, 62% 4%, 62% 96%, 6.6% 88%, -0.6% 46%)` met een verloop dat op 52% al volledig transparant is (`:35-45`); alleen de linkerpunt rond 46% hoogte leest. De vormtaal zit hier in het **diagram**: de EMS-hub is een cirkel met stroomlijnen van links naar rechts (`index.html:662-684`), animatie via `stroke-dasharray 3 6`. |
| **Overlap** | Eén cross-element-overlapping: de telefoon op z2 over het dashboard. Binnen het dashboard nog een laag: `.vh-ctrl-hub` op z2 over de stroom-SVG. Weinig laagwerk, veel binnenstructuur — de tegenpool van S2. |
| **Leegte** | 94,7px tussen apparaatblok en tekstkolom; 66,0px rechts; ruim 100px onder de apparaten. De sectiehoogte bevat 32px ingebouwde lucht naar S6 (`:20`). |
| **Contrast** | De grootste sprong binnen één beeldvlak: schermgrond `#011731` met tekst in `#C8D8EC` en `#6F86A2`, op een sectiegrond `#EFF7FE`. Merkblauw komt terug als `#3E9BFF` — een lichtere variant, want `#0073FE` licht op navy onvoldoende op. |
| **Overgang** | In: 56,9px leeg wit uit S4; `#EFF7FE` zet in zonder rand. Uit: 32px lucht in de sectiehoogte zelf. |
| **Herkenbaarheid** | Een donkere console in merkkleur met een pulserende live-indicator, een EMS-hub met stromende stippellijnen, en een telefoon die er half voor staat. Plus de discipline dat élk getal in dat scherm elders op de site gepubliceerd is. |

**HERBRUIKBAAR PRINCIPE — PRODUCT ZONDER SCREENSHOT.** Waar geen productbeeld bestaat, bouw je de interface in eigen tokens en **label** je hem als voorbeeldweergave — geen stockmockup, geen verzonnen cijfers. Compositieregel: twee apparaten waarvan het kleinste met 20-25px over het grootste steekt en er verticaal volledig binnen blijft; het kleinste staat aan de **buitenkant**, niet in het midden. Bewegingsregel: animatie start pas via `IntersectionObserver` op `threshold .25` (`index.html:777-781`) en staat volledig uit onder `prefers-reduced-motion` (`:280-283`).

**HOMEPAGE-SPECIFIEK.** De exacte console-inhoud (Zon +128 / Net +41 / Accu −36 / Laden 64 / HVAC 52 / Licht 17 kW), de zes tickerregels (`index.html:758-765`), en het inline script in de sectie zelf (`index.html:751-783`) — een eenmalige oplossing, geen component.

---

### S6 · Bewijs + projectresultaat — `index.html:787-872`, `home-proof.css`

| Aspect | Meting |
|---|---|
| **Compositie** | Eén sectie van 887,0px, intern verdeeld in twee absoluut gepositioneerde banden: deel A `y=0..241,3` (`#FAFCFE`) en deel B `241,3..887,0` (112°-verloop) (`:34-46`). Deel A is één rij: kop links op `x=78,0`, twee organisatiekaarten rechts tegen `x=1698,0`; het midden blijft leeg. Het commentaar legt vast dat de band is teruggebracht van 17,7 naar 13,6cqw omdat de rechterhelft leeg bleef (`:36-38`). Deel B draagt vier absolute blokken: verhaalkolom (78,0..610,2), foto (547,6..1282,0), resultaatkaart (1240,0..1688,0) en een donkere projectstrook (632,0..1261,0). |
| **Hiërarchie** | Twee koppen in dalende graad: `.vh-proof-kop` 53,0px (`:76-84`) en `.vh-proof-kop2` 47,0px, met het commentaar `/* 52 -> 47 px: duidelijk secundair aan de sectiekop */` op `:173`. In de kaart 20,0px citaat en 21,0px cijfers; in de strook 22,0px projectnaam en 11,2px eyebrow. Vier niveaus binnen deel B. |
| **Dichtheid** | 5 `<a>`, 2 `<img>`, 2 koppen, 3 `<svg>`, 3 `<br>`. Deel A is bewust **leeg**: twee onderbouwde organisaties in plaats van de acht logo's van de referentie (`index.html:789-794`). Deel B is per oppervlak juist het dichtst bevolkte blok van de pagina. |
| **Mediarelatie** | Hoofdfoto met een diagonale snede linksboven: `polygon(17.55% 0, 100% 0, 100% 100%, 0 100%)` (`:224`). De snede is **functioneel**: de verhaalkolom loopt tot `x=610,2` en de fotodoos begint op `x=547,6` — ze overlappen 62,6px, maar de snede haalt het beeld bovenin weg tot `x=676,5`, precies waar de kop staat. Geen scrim, want alles wat erop ligt is dekkend. Het tweede beeld is een thumbnail van 98×91 ref-px met bewust lege `alt` (`index.html:857`). |
| **Geometrie** | Eén gebaar: `.vh-proof-wig`, een massieve driehoek `#B8DCFB` van 85×133 ref-px tegen `right:0` (`:48-57`). De **enige vrijstaande versiering** van de negen secties. Let op de afwijking die ook al in het bevroren brandbook staat (`§4.1.4`): het commentaar op `:47` zegt "achter de citaatkaart", maar gemeten begint de wig op `x=1689,0` en eindigt de kaart op `x=1688,0` — hij staat **ernaast**. |
| **Overlap** | Twee echte overlappingen: de resultaatkaart op z2 ligt 42,0px over de foto op z1; de donkere strook op z3 ligt **volledig** op de foto (632,0..1261,0 binnen 547,6..1282,0 en 688,2..812,2 binnen 287,4..844,4). De verhaalkolom overlapt de fotodoos maar niet het zichtbare beeld — dat regelt de snede. Mobiel: `margin-top:-28px`, `margin-left:16px`, `position:relative;z-index:2` (`:436-445`). |
| **Leegte** | Het midden van deel A: circa 700px leeg tussen kop en organisatiekaarten. Dat is een besluit, geen ongeluk. |
| **Contrast** | Drie gronden in één sectie: `#FAFCFE` boven, een verloop `#EDF7FE → #E3F1FE` onder, en daarop precies één donker object — de strook in `#01234C`. De cijfers in de kaart staan in `#0073FE`: het enige punt op de pagina waar merkblauw als **cijfer**kleur wordt ingezet. |
| **Overgang** | In: kleurstap zonder lijn. **Intern: de enige harde horizontale kleurnaad van de pagina, op `y=241,3px`** (`:41`, `:43`). Uit: de rechteronderhoek van B is `#E3F1FE` en S7 opent links met `#FEFEFE` — het blauw wisselt van kant. |
| **Herkenbaarheid** | Een diagonaal gesneden projectfoto met een witte resultaatkaart die er 42px overheen valt en een donkere projectstrook die er dwars overheen ligt. En de merkregel dat een testimonial die niet bestaat, een resultaatbeschrijving in derde persoon wordt (`index.html:817-826`). |

**HERBRUIKBAAR PRINCIPE — BEWIJSBAND PLUS VERHAALBLOK.** Een smalle bovenband met kop links en bewijs rechts, daaronder een blok met beeld, kaart en strook. Harde maatregel: **het bewijs bepaalt de breedte van de band, niet andersom** — bij twee items blijft het midden leeg in plaats van dat er slots worden bijgevuld. Tweede kop is 5-6px kleiner dan de sectiekop. Derde principe: een dekkende kaart op een foto krijgt **geen** scrim; alleen tekst-op-beeld krijgt er een.

**HOMEPAGE-SPECIFIEK.** Ratio 16 met 78% / 240 / 12 / 51 kW (`index.html:845-854`), de tweedeling op exact 13,6cqw, en de coördinaten op het 1774×887-canvas. Ook: de vrijstaande accentdriehoek is een **eenmalige uitzondering** — het bevroren brandbook (`§4.1.5`) zet de bovengrens op één vrijstaand vlak per negen secties.

---

### S7 · Energie-infrastructuur — `index.html:875-943`, `home-infra.css`

| Aspect | Meting |
|---|---|
| **Compositie** | Drie verticale zones over 887,0px hoogte: tekstkolom `x=73,0..640,7` (`:34-40`), fotovlak `x=642,6..1742,6` (`:148-161`) en daarbovenop een kolom van vier kaarten `x=1295,0..1717,0` (`:209-231`). Tekstkolom en fotodoos raken elkaar met **1,9px** speling. De vier kaarten staan op een vaste steek van 141,3px (tops 143,7 / 285,0 / 426,4 / 567,7, hoogte 126,0). Verhouding tekst/beeld = **34/66**. |
| **Hiërarchie** | H2 61,0px op 58,0px in **twee kleuren**: eerste regel navy, rest merkblauw (`index.html:879`, `:49-58`). Lead 21,5px. Drie voordeelrijen met steek 82 ref-px en iconen in een tintvierkant van 63×63 ref-px. De kaarten zakken naar 18,6px kop en 16,0px regel. Twee acties: gevulde knop van 67 ref-px plus blauwe tekstlink. |
| **Dichtheid** | 6 `<a>`, 1 `<img>`, 1 kop, 13 `<svg>`, 3 `<li>`, 9 `<br>`. Alle inhoud in twee kolommen; geen derde niveau. |
| **Mediarelatie** | Eén foto als **grond voor een kaartkolom** (`:148-170`), gesneden op `polygon(11.5% 0, 100% 0, 100% 100%, 0 100%)` (`:160`). De zichtbare bovenrand begint pas op `x=769,1`, dus 128,4px lucht naast de H2. De uitsnede is verschoven naar `object-position:26% 52%` met het commentaar "de batterijkasten stonden midden in beeld en vielen daardoor achter de sectorkaarten; nu staan ze links, naast de kaartkolom" (`:166-168`). Het verloop op `::after` bestaat uitsluitend om de kaarten een veld te geven: "de kaarten liggen daardoor op een veld in plaats van los op de foto te zweven" (`:171-172`). |
| **Geometrie** | Eén gebaar: de fotosnede, met de reden in de code: "Zonder deze snede is dit vlak een kale rechthoek met zwevende kaarten" (`:158-159`). |
| **Overlap** | Vijf: vier kaarten op z2 liggen **volledig** binnen het fotovlak op z1, plus het richtingsverloop dat alleen bestaat om die stapeling te dragen. De tekstkolom op z3 raakt het beeld niet. De enige sectie met een **kolom** van overlappende kaarten. |
| **Leegte** | Onder de vierde kaart blijft 93,5px foto vrij. De 1,9px tussen tekstkolom en fotodoos is de kleinste speling van de pagina — de leegte zit hier in de **diagonaal**, niet in de marge. |
| **Contrast** | De sectiegrond is zelf een verloop van links (`#FEFEFE`) naar rechts (`#EAF5FE`) (`:19-20`) — de enige sectie waar de grond de leesrichting volgt. |
| **Overgang** | In: S6 eindigt rechtsonder in `#E3F1FE`, S7 opent linksboven in `#FEFEFE`. Uit: rechterrand `#EAF5FE` naar `#FAFCFD`. |
| **Herkenbaarheid** | Een beeldvlak met een lichte diagonale hap linksboven en daarop een kolom van vier witte kaarten op een verduisterd veld. De tegenhanger van S2: daar zes kaarten **in** een raster, hier vier kaarten **op** een beeld. |

**HERBRUIKBAAR PRINCIPE — KAARTKOLOM OP BEELD.** Maximaal vier kaarten met gelijke steek, elk **volledig** binnen het beeldvlak; het beeld krijgt een richtingsverloop dat alleen onder die kolom werkt. Schakelregel: verdwijnt de kolom (mobiel), dan gaan snede én verloop uit — een vlak dat niets meer draagt, gaat uit, en de schakelaar staat op naam van de **inhoud**, niet van de schermbreedte. Derde principe: een tekstkolom en een beeldvlak mogen tot op enkele pixels naast elkaar staan zolang een diagonale snede bovenin lucht maakt.

**HOMEPAGE-SPECIFIEK.** De vier sectoren, de steek van 141,3px en de fotobreedte van 1100 ref-px. Let op: `home-infra.css:282-328` (`.vh-infra-kpi`) en `:185-204` (`.vh-infra-note`) hebben **nul** treffers in `index.html` — dode regels die niet in het systeem horen (zie `vibe-component-library-v1.md §6` en DR-C-09).

---

### S8 · Final CTA — `index.html:946-1002`, `home-final.css`

| Aspect | Meting |
|---|---|
| **Compositie** | Twee **geneste chevrons** over de volle sectiehoogte van 631,0px. Buiten: `.vh-final-wig` op `inset:0` met zes punten (`:37-52`). Binnen: `.vh-final-foto` vanaf `left:47.31%` (= `x=839,3`) tot de rechterrand, met de punt op dezelfde 47.31% en dezelfde hoogte 55.75% (`:57-72`). **De binnenrand van de wig ÍS de buitenrand van de foto — ze delen één lijn.** Links de tekstkolom (88,6..762,7 = 674,1px), onderaan een rij van drie bewijsitems (87,7..910,2). Rechtsonder een blauw merkvlak van 293,6px (`:93-104`), over de foto een afspraakkaart (1053,6..1358,1). Verhouding tekst/beeld = **42/58**. |
| **Hiërarchie** | H2 66,0px, met het commentaar `/* 56,2 -> 66 px: grootste H2 van de pagina */` op `:148`. Alleen de hero-H1 (76,5px) is groter. Lead 20,6px, twee knoppen van 63,3px, drie bewijsitems met `b` op 15,2px. De kaart draagt 21,0px kop en 16,4px body. De sectie loopt van 66,0 naar 14,3px. |
| **Dichtheid** | 3 `<a>`, 1 `<img>`, 1 kop, 7 `<svg>`, 3 `<li>`, 5 `<br>`. Eén boodschap, twee acties, drie geruststellingen, één kaart. Na S3 de strengste verhouding tussen oppervlak en inhoud. |
| **Mediarelatie** | De foto is geen rechthoek maar een **chevron**: de vorm van het beeld is zelf het gebaar. Scrim op 200° met drie stops (`:73-79`), want er komt wit op te liggen. De uitsnede is verplaatst naar `object-position:78% 56%` met de reden erbij: "Bij 50%/46% vulde de parkeerplaats het beeld … Deze uitsnede zet de carportrijen en de skyline in beeld" (`:85-88`). |
| **Geometrie** | Drie gebaren — chevronwig (hellingen −0,640 / +0,710), fotochevron, blauw merkvlak (−0,733). Alle drie delen de punt op 55.75% hoogte of de lijn op 47.31% breedte. |
| **Overlap** | Vier vlakken op `z1 · 2 · 3 · 4` plus tekst op `z5`. Het blauwe vlak ligt over de foto; de afspraakkaart ligt op de foto en **kruist** het chevronpunt (kaart `y=290,2..562,7`, punt op `y=351,8`). De bewijsrij stopt op `x=910,2` terwijl de fotorand op die hoogte op circa `x=935` ligt: **25px speling, bewust geen overlap**. Mobiel: `margin:-34px` (`:398-407`). |
| **Leegte** | Tussen de knoppen (eindigen rond `y=340`) en de bewijsrij (`y=486,7`) ligt circa 145px leeg in de linkerkolom — de rustplek vlak vóór de conversie. Rechts is de leegte juist weggehaald: elk vlak raakt een ander vlak. |
| **Contrast** | De grootste kleurspanning in één beeld: een verloop `#BEDCF9 → #F1F9FE` in de wig, een donker gescrimde foto, en daarop een massief blauw vlak `rgba(11,113,226,.88) → rgba(1,68,141,.94)`. |
| **Overgang** | S8 en S9 delen **exact** hetzelfde referentiecanvas (2103×748), exact dezelfde hoogte (`35,5681cqw = 631,0px`, `:19` en `home-footer.css:18`) en dezelfde vormfamilie. De pagina eindigt op een rijm van twee gelijke blokken. |
| **Herkenbaarheid** | De dubbele chevron met de punt naar links, het blauwe merkvlak rechtsonder, en een witte afspraakkaart die het chevronpunt kruist. |

**HERBRUIKBAAR PRINCIPE — SLOTCOMPOSITIE.** De grootste H2 van een pagina hoort in de **slot-CTA**, niet in de eerste inhoudelijke sectie. Twee geneste vormen mogen één rand **delen** — dat leest als diepte, niet als twee vormen. Drie geometrische gebaren zijn toegestaan in precies drie rollen: opening, uitgelicht paneel, slot; een pagina heeft er hooguit drie van. Laatste maatregel: een overliggende **kaart** mag een vormpunt kruisen, maar een tekst**rij** houdt minstens 25px afstand tot een schuine beeldrand.

**HOMEPAGE-SPECIFIEK.** De chevroncoördinaten op het 2103×748-canvas, de drie beloften (`index.html:975-991`) en de afspraakkaart die naar dezelfde Calendly-flow wijst als de knop 400px hoger. Ook: `home-final.css:106-125` definieert `.vh-final-note`, met nul treffers in `index.html`.

---

### S9 · Footer — `index.html:1012-1129`, `home-footer.css`

| Aspect | Meting |
|---|---|
| **Compositie** | Vier kolommen op absolute posities over 631,0px: merkkolom op `x=84,4`, drie navigatiekolommen op 455,5 / 682,3 / 894,2, contactblok 1088,5..1407,8. Rechts een beeldwig van `x=1423,9` tot de schermrand (350,1px breed = 19,7% van de viewport). Onderaan een hairline van 84,4 tot 1689,7 op `y=523,0` (1605,2px breed) en daaronder de juridische regel (`:259-282`). |
| **Hiërarchie** | **Geen H2.** De zwaarste letter is het woordmerk VIBE op 32,1px, daarna het contactblok op 22,6px, de navigatiekoppen op 20,0px en de links op 17,2px. Een vlakke, viertraps hiërarchie zonder dominant element — precies omgekeerd aan S1. |
| **Dichtheid** | De hoogste linkdichtheid van de pagina: **23 `<a>` en 21 `<li>`** in één sectie, tegen 19 in S1 en 2 in S3. 1 `<img>`, 9 `<svg>`, 8 `<br>`. |
| **Mediarelatie** | Eén beeld, geen illustratie maar een chevronvormig beeld**vlak** tegen de rechterrand: `polygon(38.07% 0, 100% 0, 100% 100%, 48.43% 100%, 0 47.51%)` (`:42-58`). Het draagt precies één ding: de notitie, waarvoor `::after` een scrim van `inset:0 0 42% 0` levert (`:69-75`) — "leesbaarheidsscrim voor de notitie" (`:67-68`). |
| **Geometrie** | Eén gebaar, met hellingen −0,534 en +0,615 (28,1° en 31,6°). Dat is de **flauwste** hoek van de merkfamilie (die verder tussen 31,6° en 36,2° ligt) en dat is meetbaar verklaarbaar: de wig is 350,1 breed tegen 525,5 hoog en zou bij de standaardhelling de navigatiekolommen raken. |
| **Overlap** | Twee: de notitie op z2 op de wig op z1; en de hairline plus de juridische regel op z3 kruisen de onderpunt van de wig. Het contactblok stopt op `x=1407,8` en de wigpunt staat op 1423,9: **16,1px speling, geen overlap**. |
| **Leegte** | De footer is de enige sectie waar de leegte **onder** de inhoud zit in plaats van ernaast. Tussen navigatiekolom 3 en het contactblok ligt circa 90px. |
| **Contrast** | Het lichtste blok van de pagina: een 115°-verloop `#EDF6FD → #FDFEFF → #EFF7FD`, koppen `#0C1B33`, body `#4C5771`, lijn `#DCE7F2`, juridisch `#6A768F` en de KvK/BTW-regel nog een stap lichter in `#8A93A8`. Zes grijswaarden, geen enkel donker vlak. |
| **Overgang** | In: kleurstap van minder dan 3%. Uit: geen. De pagina sluit met een 1px lijn en een regel van 15,0px. |
| **Herkenbaarheid** | Dezelfde badge-plus-woordmerk-lockup als in de header, een chevron-beeldvlak tegen de rechterrand dat rijmt op S8, en een notitie in de **huisletter** in plaats van een handschriftletter — met de reden erbij (`index.html:1021-1023`). |

**HERBRUIKBAAR PRINCIPE — DE FOOTER RIJMT OP DE SLOT-CTA.** Dezelfde hoogte, hetzelfde referentiecanvas, dezelfde vormfamilie tegen dezelfde schermrand. Geen kop in de footer: de zwaarste letter is het woordmerk. Navigatie zonder kolomranden, uitsluitend gescheiden door positie. Inhoudelijk: wat er niet is, wordt niet aangekondigd (geen nieuwsbrief, `index.html:1099-1102`) en een niet-bestaande pagina wordt niet gelinkt (`index.html:1063-1065`). Vormmaatregel: wijkt een hoek van de merkfamilie af, dan moet de reden aanwijsbaar zijn in de **doosverhouding**.

**HOMEPAGE-SPECIFIEK.** De absolute kolomposities, de wig op `80.2663cqw`, en de zusterselector `.vh-footer ~ footer.ftr.v1a{display:none!important}` (`:32-35`) die alleen werkt omdat `_footer.js` ná deze footer injecteert. Ook: `home-footer.css:373-381` bevat `.vh-footer-wig-ongebruikt`, dat nergens in de HTML voorkomt.

---

### 2.10 De zestien principes in één tabel

| # | Principe | Kernmeting |
|---|---|---|
| **P1** | Lagen, niet stapelen — op desktop zonder één negatieve marge | 48 overlappingen; alle vijf negatieve marges staan in een `max-width:1199px`-blok (`home-project.css:260`, `home-process.css:235`, `home-proof.css:443`, `home-final.css:403`, `home-mobile.css:114`) |
| **P2** | De overlapping wordt verdiend op de uitlijning | S4 kaart en foto eindigen beide op `x=1708,0`; S8 wig en foto delen 47.31% en 55.75%; S6 strook volledig binnen de fotodoos in beide assen; S7 vier kaarten op steek 141,3px |
| **P3** | Drie breedteklassen, geen gedeelde container | Tekstmarges 70-105 ref-px; marge-brekers 1740,0 / 1704,0 / 1584,0px; volle-breedte decoratie op 1774px |
| **P4** | Wat breed is, draagt korte regels — proza blijft smal | Brede vlakken dragen cellen van één regel; alle prozabreedtes ≤ 726,1px (S5), verder 460,0 / 400,0 / 532,2 / 567,7 / 612,0 / 674,1 |
| **P5** | Geen donkere volle-breedte band — donker is een OBJECT | Negen sectiegronden liggen tussen `#EAF4FE` en `#FEFEFE`; vier donkere objecten: `#001632`, zes S2-kaarten, `#011731`, `#01234C` |
| **P6** | Scrim alleen waar tekst op beeld staat | Wél: S1, S2, S3, S8, S9. Niet: S4 en S6 (alleen dekkende inhoud). Eén gemotiveerde uitzondering: S7 (`home-infra.css:171-172`) |
| **P7** | Een vlak dat niets draagt, gaat uit — op naam van de INHOUD | `home-infra.css:340-346`, de enige schakelregel die letterlijk in de code staat |
| **P8** | Kopgraad volgt de ROL, niet de volgorde | 76,5 · 66,0 · 64,0 · 61,5 · 61,0 · 58,3 · 54,0 · 53,0 · 47,0; drie expliciete commentaren |
| **P9** | Twee koppen in één sectie verschillen 5-6px — of alleen in gewicht | S6: 53,0 en 47,0. S3: 58,3/700 gevolgd door 40,1/400 |
| **P10** | Eén geometrisch gebaar per sectie, drie ankerrollen uitgezonderd | 5 (S1) · 3 (S3, S8) · 1 (S2, S4, S5, S6, S7, S9) |
| **P11** | Handgezette regelovergangen zijn desktop — en gaan mobiel volledig uit | 59 `<br>` in de inhoud tegenover 28 regels `br{display:none}` in alle negen sectiebestanden |
| **P12** | Onregelmatig ritme, met de kortste sectie als ademhaling | Hoogtes 908,0 / ~884 / 765,0 / 453,2 / 588,5 / 887,0 / 887,0 / 631,0 / 631,0 |
| **P13** | Sectieovergangen zijn kleuruitdovingen, geen randen | Nul horizontale scheidingslijnen tussen secties; de enige harde kleurnaad staat **binnen** S6 op `y=241,3` |
| **P14** | Het ontbrekende beeld wordt een getekend vlak, geen plaatshouder | HVAC-navyvlak; gebouwde console met "Voorbeeldweergave"; twee organisaties in plaats van acht logoslots |
| **P15** | De compositiemaat is `cqw`, en elke sectie heeft een eigen referentiecanvas | Negen `container-type:inline-size`-wortels, vijf referentiecanvassen |
| **P16** | Elke foto draagt iets — geen enkele staat bloot | Negen secties, één uitzondering: de 98×91 ref-px thumbnail in de S6-strook, die zelf al binnen een dekkend object zit |

---

## §3 · Vibe Layout Grammar

Dertien regelgroepen. Elke regel draagt een getal of een codeverwijzing. `SHOULD` en `SHOULD NOT` zijn bindend voor nieuw werk; ze wijzigen niets aan bestaande productiecode.

### 3.1 ASYMMETRIE

**Gemeten tweedelingen in Master v1** (lichtste deel als percentage): S2 **31/69** · S7 **34/66** · S4-boven **39/61** · S6-B **42/58** · S8 **42/58** · S5 **47/53**.
**Gemeten tweedelingen in de B2-kandidaat:** 50,5/49,5 · 52,1/47,9 · 49,0/51,0 · 48,1/51,9 · 54,0/46,0 · 41,0/59,0 · 51,0/49,0 — zes van de zeven binnen 4 procentpunt van half-half.

- **SHOULD** — een tweedeling geeft de lichtste kant **maximaal 42%** van de gedeelde breedte. Vijf van de zes Master-v1-splitsingen voldoen daaraan.
- **SHOULD NOT** — een split tussen **46/54 en 54/46**. Dat bereik is optisch niet van half-half te onderscheiden en is in de B2-kandidaat zes keer op rij gebruikt (`vibe-storage.css:21`, `:64`, `:86`, `:152`, `:169`, `:232`).
- **SHOULD** — als een split tóch bij half uitkomt, draagt hij dat met een gemeten reden. De enige Master-v1-uitzondering is S5 (47/53) en daar is de linkerhelft géén tekstkolom maar een overlapcompositie van twee apparaten, gescheiden door 94,7px leegte.
- **SHOULD NOT** — vier of meer opeenvolgende secties op dezelfde verticale deelas. In de B2-kandidaat staan de secties 06, 08, 09 en 11 alle vier op dezelfde as binnen 1080px.
- **SHOULD** — asymmetrisch gewicht valt op de **zwaarste** inhoud. In de B2-kandidaat valt de enige echte asymmetrie (41/59) op de FAQ, inhoudelijk de lichtste sectie.

### 3.2 MEDIASCHAAL

**Gemeten beeldbreedtes Master v1 (op 1774px):** S3-paneel 1704,0 (96,1%) · S7-foto 1100,0 (62,0%) · S4-foto 956,4 (53,9%) · S8-fotochevron 934,7 (52,7%) · S5-apparaatblok 809,0 (45,6%) · S6-foto 734,4 (41,4%) · S9-wig 350,1 (19,7%) · S1-fotovlak = het hele podium van 1774.
**Gemeten beeldbreedtes B2-kandidaat:** 503,0 (28,4%) · 486,8 (27,4%) · 3 × 346,7 (19,5%) · 500,0 (28,2%). **Geen enkel beeld boven 28,4%.**

- **SHOULD** — ten minste één beeld per pagina is **≥ 50% van de viewportbreedte**. Master v1 heeft er vijf.
- **SHOULD NOT** — een pagina waarop élk beeld onder 30% van de viewportbreedte blijft. Dat is de gemeten B2-toestand en het is de belangrijkste enkele oorzaak van het generieke aanzien.
- **SHOULD** — een beeld dat een sectie draagt, loopt aan minstens één zijde tot de schermrand of wordt door een snede tot vorm gemaakt. Master v1 doet dat zeven keer.
- **SHOULD NOT** — een beeld als bovenrand van een kaart wanneer dat beeld het **sterkste materiaal van de pagina** is. In de B2-kandidaat wordt gerealiseerd werk verdeeld over drie snippers van elk 19,5% (`vibe-storage.css:132-138`).
- **SHOULD NOT** — hetzelfde bestand tweemaal op één pagina. `assets/energieopslag-hero.jpg` staat op `systeem-energieopslag.html:135` én `:517`, beide rechts in de kolom, beide met `.vibe-cut-tl`.

### 3.3 INHOUDSSCHAAL

**Drie breedteklassen in Master v1 (P3):** tekstmarges 70,0 - 105 ref-px · marge-brekende inhoudsvlakken 1740,0 / 1704,0 / 1584,0px · volle-breedte decoratie op 1774px. **Er is geen gedeelde containerbreedte.**

- **SHOULD** — een pagina draagt **ten minste één** inhoudsvlak dat de tekstmarge doorbreekt. Master v1 heeft er drie (vier als de juridische regel van 1605,2px meetelt — zie DR-C-01).
- **SHOULD** — wat breed is, draagt korte regels (P4). Alle drie de marge-brekers dragen cellen van één regel: drie bewijsregels op 1740,0px, vier processtappen op 1584,0px, één juridische regel op 1605,2px.
- **SHOULD NOT** — lopende tekst breder dan **730px**. Alle acht prozabreedtes van Master v1 liggen tussen 400,0 en 726,1px.
- **SHOULD NOT** — twaalf secties op exact dezelfde inhoudsbox. De B2-kandidaat zet 13 × `.vibe-container` in (`systeem-energieopslag.html:119, 145, 168, 202, 239, 280, 314, 379, 406, 427, 458, 497, 527`) en levert twaalf keer dezelfde linkerlijn op `x=347` en rechterlijn op `x=1427`; 694px (39,1%) van het scherm blijft op elke sectie ongebruikt.

### 3.4 OVERLAP

**Gemeten:** 48 overlappingen over negen secties (6 · 6 · 2 · 0 · 3 · 6 · 5 · 5 · 8); 8 van 9 secties laagt. B2: 5 over twaalf secties, 10 van 12 secties heeft er nul.

- **SHOULD** — overlapping op desktop wordt uitsluitend gemaakt met `position:absolute` binnen een `position:relative`-sectie, plus `z-index` tussen 0 en 11 (P1).
- **SHOULD NOT** — een negatieve marge op desktop. Master v1 heeft er **nul**; alle vijf negatieve marges staan in een `max-width:1199px`-blok.
- **SHOULD** — elk element dat op een beeld ligt, deelt minstens één rand **exact** met dat beeld of met een vormpunt (P2). Vier gemeten bewijsvoorbeelden: `x=1708,0` (S4), 47.31%/55.75% (S8), volledige insluiting in beide assen (S6), vaste steek 141,3px (S7).
- **SHOULD NOT** — een kaart die "ergens op" het beeld zweeft. Dat is precies de fout die `home-infra.css:171-172` benoemt en met een richtingsverloop oplost.
- **SHOULD** — ten minste de helft van de secties van een pagina draagt ≥ 1 cross-element-overlapping. Master v1: 8 van 9.
- **SHOULD NOT** — een pagina waarop alle overlapping binnen een kaart of binnen een beeldkader blijft. Dat is de gemeten B2-toestand: de drie overlappingen van sectie 07 zijn drie labels op drie casefoto's.

### 3.5 GEOMETRIE

**Gemeten:** 18 geknipte vlakken op desktop, waarvan **6 functioneel** en **12 merkvocabulaire** (`vibe-web-brandbook-v1.md §4.1.4`). Hellingfamilie: twaalf van de zestien vrije randen tussen **0,615 en 0,733** = **31,6° tot 36,2°**, ongeveer 1:1,4.

- **SHOULD** — een nieuw vrij vlak ligt in de hellingfamilie 31,6°-36,2°.
- **SHOULD** — wie de merkhoek in een nieuwe doos wil aanhouden, **rekent het percentage uit** de doosverhouding. Een percentage overnemen levert een andere hoek op: S6 fotosnede meet 13,0° en S7 9,8° juist omdat hun dozen hoog zijn.
- **SHOULD** — een nieuw vlak is aanwijsbaar (a) beeld wegsnijden van een tekstkolom, of (b) een donkere plaat leveren voor witte tekst. Kan de bouwer dat niet aanwijzen, dan voegt het gebaar zich bij de twaalf decoratieve, en daar is de vormtaal al verzadigd.
- **SHOULD NOT** — `.vibe-cut-tl` als enige geometrie van een hele pagina. In de B2-kandidaat is `polygon(12% 0, 100% 0, 100% 100%, 0 100%)` (`vibe-system.css:308`) het enige gebaar op twaalf secties: één afgeschuinde hoek van één rechthoek, die niets doorsnijdt.
- **SHOULD NOT** — meer dan één vrijstaande versiering per negen secties. Master v1 heeft er precies één: `.vh-proof-wig` (`home-proof.css:48-57`).
- Frequentie: zie **§5.8**.

### 3.6 SECTIE-OVERGANGEN

**Gemeten Master v1:** nul horizontale scheidingslijnen tussen twee secties. Overgangen zijn kleuruitdovingen (S1→S2 doven uit op dezelfde waarde `#FCFDFE`), een radiale gloed van 195,1px met 100,0px padding (S3), of een gemeten lege hoogte van 56,9px (S4→S5). De enige harde kleurnaad staat **binnen** S6 op `y=241,3`.
**Gemeten B2:** elf grenzen — 4 harde licht/donker-flips, 4 vrijwel onzichtbare overgangen (ΔRGB ≤ 11 per kanaal), 3 kleine stappen, **0 geometrische**.

- **SHOULD** — een sectiegrens is een van drie dingen: een kleuruitdoving naar dezelfde waarde, een gloed plus ≥ 100px padding, of een gemeten lege band.
- **SHOULD NOT** — een 1px-haarlijn als enige afsluiting van een sectie. In de B2-kandidaat sluit de snapshotband de hero af met `1px rgba(16,28,58,.10)` over 1240px (`vibe-storage.css:30`), waarna de volgende sectie op een ΔRGB van circa 2 per kanaal begint: de hero loopt niet af, hij houdt op.
- **SHOULD NOT** — twee opeenvolgende grenzen die beide vrijwel onzichtbaar zijn. In de B2-kandidaat zijn 10→11 (ΔRGB 9,5,2) en 11→12 (ΔRGB 11,6,2) dat allebei.
- **SHOULD** — een harde licht/donker-flip wordt gedragen door een vorm die de naad kruist of door een gemeten leegte ervoor. Master v1 doet dat voor S3 met 100,0px papier aan beide zijden; de B2-kandidaat heeft vier flips zonder enige vormdrager.

### 3.7 DONKER/LICHT-RITME

**Gemeten Master v1:** negen sectieachtergronden, alle tussen `#EAF4FE` en `#FEFEFE`. **Nul donkere sectiebanden.** Vier donkere objecten: projectpaneel `#001632`, zes S2-kaarten `rgba(3,20,44,.90-.92)`, consolescherm `#011731`, projectstrook `#01234C` (P5).
**Gemeten B2:** twee volle-breedte donkere secties op `#001632` (`vibe-system.css:153`, secties 04 en 09), met letterlijk dezelfde vulling en rand (`rgba(255,255,255,.05)` + `rgba(255,255,255,.10)` in `vibe-storage.css:101` én `:175`).

- **SHOULD** — donker is objectgebonden: een paneel, een kaart, een scherm, een strook.
- **SHOULD NOT** — een donkere volle-breedte band waarin de inhoud binnen de container blijft. De B2-secties 04 en 09 zijn 1774px breed terwijl hun beeld 486,8px meet (27,4%): vlak en beeld lopen niet samen, en dat is exact waar Master v1 het paneel juist tot de schermrand voert.
- **SHOULD NOT** — twee donkere banden per pagina met dezelfde behandeling. De tweede leest als herhaling, niet als klimaks.
- **SHOULD** — als een pagina een donkere band gebruikt, loopt het beeld of paneel erin tot ten minste één schermrand (patroon S3: `margin-left:3.9459cqw`, rechts 0).

### 3.8 NEGATIEVE RUIMTE

**Gemeten Master v1:** S1 **454px** leeg tussen lead en diagonaal — de grootste aaneengesloten leegte, en tevens het onderwerp van de H1. S6 deel A circa **700px** leeg in het midden, omdat er twee onderbouwde organisaties zijn en niet zes. S4 `.vh-proc-onder{height:3.2074cqw}` = **56,9px** `aria-hidden` — het enige zuivere leegte-element. S8 circa **145px** leeg tussen de knoppen en de bewijsrij.

- **SHOULD** — het **bewijs** bepaalt de breedte van een band, niet andersom. Het commentaar op `home-proof.css:36-38` legt vast dat de band van 17,7 naar 13,6cqw is teruggebracht omdat de rechterhelft leeg bleef.
- **SHOULD NOT** — n items over de volle breedte verdelen omdat het raster n kolommen heeft. De motivering staat woordelijk in `index.html:789-794`: liever twee echte organisaties dan zes lege slots die als niet-geladen logo's ogen.
- **SHOULD** — een pagina mag één expliciet leegte-element dragen, met `aria-hidden` en een gemeten hoogte.
- **SHOULD** — vlak vóór de conversie staat rust: 145px leeg in de S8-linkerkolom tussen actie en geruststelling.

### 3.9 KAARTDICHTHEID

**Gemeten Master v1:** de pagina verdeelt **nooit** gelijk. S2-raster `27,4521 / 17,0237 / 16,4600cqw` over rijen `28,0722 / 12,9651cqw` (`home-solutions.css:128-131`); hoofdraster 31/69; S7-kaarten `297fr 278fr 288fr 237fr`; S8-tegels `326fr 355fr 294fr`.
**Gemeten B2:** vijf gelijke rasters (`vibe-storage.css:32`, `vibe-system.css:315` ×2, `:316`, `vibe-storage.css:184`), waaronder drie vierdelingen van 246,0 / 255,0 / 252,0px — een onderling maatverschil van 0,8% op een inhoudsbox van 1080px.

- **SHOULD NOT** — meer dan **twee** gelijke kaartrasters op één pagina.
- **SHOULD NOT** — twee gelijke kaartrasters **direct achter elkaar**. In de B2-kandidaat volgen 02→03 elkaar op (4 dan 3 gelijke kolommen) en 08→09→10 zijn drie opeenvolgende gelijkverdelingen.
- **SHOULD** — na een kaartraster volgt dominant beeld, een asymmetrische redactionele compositie of bewuste leegte.
- **SHOULD** — binnen een kaartset krijgt **één** kaart een eigen typografische graad. S2: h3 26,6px / icoon 44px / pijl 46px tegenover h3 18,4px / 40px / 38px.
- **SHOULD NOT** — twee secties die uitsluitend in kolomaantal verschillen. Een telverschil is geen compositieverschil: de B2-secties 03 en 05 delen kopformule, afstand tot het raster (beide 44px, `vibe-storage.css:48` en `:80`) en interne kaartvolgorde.
- **SHOULD** — een kaartkolom **op** beeld telt maximaal vier kaarten met gelijke steek (S7: 141,3px), elk volledig binnen het beeldvlak.

### 3.10 BEWIJS

**Gemeten Master v1:** S1 drie bewijsregels op 1740,0px · S3 drie metrieken gescheiden door 1px-lijnen (`home-project.css:143-168`) · S6 twee organisaties plus vier cijfers · S8 drie beloften. Merkregel: een testimonial die niet bestaat, wordt een resultaatbeschrijving in derde persoon (`index.html:817-826`).

- **SHOULD** — maximaal **drie** metrieken in één paneel, gescheiden door 1px.
- **SHOULD** — cijfers krijgen één eigen kleurrol per pagina. Master v1 zet merkblauw `#0073FE` precies één keer als cijferkleur in (`home-proof.css:283-288`).
- **SHOULD NOT** — dezelfde feiten in drie neutrale rasters herhalen. In de B2-kandidaat staan vijf van de zes specificatiewaarden uit sectie 08 al in de snapshotband van 02 en/of in de syslist van 04.
- **SHOULD NOT** — bewijs lenen uit een andere bewijsketen. Dit is al bevroren in `vibe-page-archetypes-v1.md §4.2`; V1.1 voegt alleen de compositionele kant toe: een geleend **beeld** is even zwaar als een geleend cijfer. `assets/microgrids-hero.jpg` (`systeem-energieopslag.html:229`) is het herobeeld van `microgrids.html` en staat ook op `index.html` — die sectie kan er compositioneel niets mee claimen.
- **SHOULD** — een ontbrekend beeld wordt een getekend vlak in de eigen vormtaal of een in eigen tokens gebouwde interface met expliciet label (P14), nooit een stockfoto of een gegenereerd beeld.

### 3.11 DATA EN SPECIFICATIES

Master v1 bevat **geen specificatietabel**. Wat wél gemeten is: label/waarde-paren in metrieken en kaarten, en de regel dat twee graden binnen één sectie 5-6px schelen of uitsluitend in gewicht verschillen (P9).

- **SHOULD** — in een label/waarde-paar verschillen de twee ten minste **5px in graad** of ze delen de graad en verschillen in **gewicht 700/400**. Beide varianten zijn gemeten: S6 53,0/47,0px; S5 kenmerken beide 16,8px met 700 tegenover 400.
- **SHOULD NOT** — een verschil van 2,5px. In de B2-kandidaat staat `dt` op 14,5px vet en `dd` op `--fs-body` = 17px (`vibe-storage.css:160-161`): het label is kleiner dan de waarde én te dicht bij de body-graad, waardoor zes label/waarde-paren als zes gelijke regels lezen.
- **SHOULD NOT** — zes of meer rijen met identieke padding en identieke lijndikte zonder enige gewichtsverdeling.
- **DECISION REQUIRED** — de volledige anatomie van een specificatieregister volgt niet uit Master v1. Zie **DR-C-03** en familie **C12**.

### 3.12 CONVERSIE

**Gemeten Master v1:** links per sectie 19 · 7 · 2 · 0 · 7 · 5 · 6 · 3 · 23. De slot-CTA draagt de grootste H2 van de pagina (66,0px), alleen de hero-H1 is groter. S4 heeft nul links en is tegelijk de kortste sectie.

- **SHOULD** — de **grootste H2** van een pagina staat in de slot-CTA, niet in de eerste inhoudelijke sectie (P8).
- **SHOULD NOT** — een slotsectie die de hero herhaalt. De B2-kandidaat doet dat op vijf meetbare punten: dezelfde verloopfamilie met dezelfde starthoek en startkleur (`168deg` vanaf `#F4F9FE`, `vibe-storage.css:18` en `:229`), dezelfde kolomverdeling (1.02/1 tegen 1.04/1), dezelfde `.vibe-cut-tl` op dezelfde rasterplek, dezelfde primaire knoptekst en letterlijk dezelfde foto.
- **SHOULD** — de slotsectie escaleert in minstens twee van deze drie: kopgraad, mediaschaal, aantal lagen. Master v1 escaleert in alle drie (66,0px; chevronfoto van 934,7px; vijf lagen).
- **SHOULD NOT** — sticky CTA. Bevroren als C-04 (`vibe-web-brandbook-v1.md §1A.9`); V1.1 verandert daar niets aan.
- **SHOULD** — onder 768px is elke primaire CTA een volle-breedte knop met de anatomie uit `§5.3`, negen keer identiek toegepast in Master v1.
- **SHOULD** — een overliggende kaart mag een vormpunt kruisen; een tekst**rij** houdt ≥ 25px afstand tot een schuine beeldrand (S8: 25px gemeten speling).

### 3.13 MOBIELE TRANSFORMATIE

**Gemeten:** de collapse is altijd dezelfde vier bewegingen (hoogte → `auto`, wortel → flex/grid-kolom, absolute kinderen → `static`/`relative` met expliciete `order`, `cqw` → px/`clamp()`/`--m-*`). Zeven van de negen secties doen alle vier; S2 en S4 doen 1, 3 en 4 (`vibe-web-brandbook-v1.md §5.3`).

- **SHOULD** — een desktoplaag wordt mobiel een **negatieve marge**, niet een verdwenen laag. Vier gemeten gevallen: −26px (`home-project.css:260`), −26px (`home-process.css:235`), −28px (`home-proof.css:443`), −34px (`home-final.css:403`).
- **SHOULD** — een element dat op een beeld ligt, wordt mobiel `position:relative` — nooit `static`. Drie keer met dezelfde uitgeschreven reden: vervangen inhoud (de `<img>`) tekent zich anders over de kaartachtergrond.
- **SHOULD** — een vlak dat niets meer draagt, gaat uit op naam van de **inhoud** (P7, `home-infra.css:340-346`).
- **SHOULD** — alle handgezette `<br>` gaan onder 1200px uit. 59 `<br>` in de inhoud tegenover 28 regels `br{display:none}`, zonder uitzondering.
- **SHOULD** — elke verborgen of verplaatste inhoud draagt een gemeten motivering met een pixelwinst. Vijf gemeten voorbeelden: "ruim 500 px korter" (`home-solutions.css:374`), "ruim 190 px" (`home-control.css:336`), "ruim 140 px korter" (`home-infra.css:361`), "ruim 160 px" (`home-footer.css:371`), "ruim 150 px uit de pagina" (`home-mobile.css:19`).
- **SHOULD NOT** — `box-shadow` in `cqw` laten staan zonder mobiele override. Dertien declaraties staan in `cqw`, slechts twee zijn onder 1200px overschreven; op 390px is 1cqw = 3,9px in plaats van 17,74px en verliezen die kaarten hun elevatie (`vibe-web-brandbook-v1.md §5.3`, "Het cqw-vangnet en zijn gat").
- **SHOULD NOT** — nieuwe `cqw`-typografie. `clamp()` is de default; `cqw` uitsluitend voor bewust canvas-proportionele composities (`§1A.6`). Zie **DR-C-10** voor de spanning die dat met §4 oplevert.

---

## §4 · Compositiefamilies

Twaalf families, `C1` tot en met `C12`. Elke familie is afgeleid uit een gemeten sectie van Master v1, behalve `C12`, dat expliciet als `DECISION REQUIRED` is gemarkeerd omdat Master v1 er geen precedent voor heeft.

**Wat een familie is.** Een familie legt de **rangschikking binnen één sectie** vast: welke vlakken er zijn, wie op wie ligt, welke randen gedeeld worden, hoeveel inhoud erin past en wat er bij de collapse gebeurt. Een familie legt géén copy, géén kleurwaarden en géén component vast — die komen uit V1.0.

**Selectieregel.** Een pagina kiest per sectie één familie. Twee opeenvolgende secties mogen niet dezelfde familie dragen, behalve `C7` gevolgd door `C8` (dat is de gemeten S6-combinatie) en `C10` gevolgd door `C11` (dat is het gemeten S8/S9-rijm).

**Overzicht**

| Code | Familie | Bron | Ritmeniveau (§6) | Geometrische gebaren |
|---|---|---|---|---:|
| **C1** | Openingspodium | S1 | HIGH IMPACT | 5 |
| **C2** | Ongelijk kaartmozaïek | S2 | MEDIUM | 1 |
| **C3** | Uitgelicht paneel | S3 | HIGH IMPACT | 3 |
| **C4** | Redactionele splitsing met gedeelde rand | S4-boven | MEDIUM | 1 |
| **C5** | Voortgangsrij | S4-onder | QUIET | 0 |
| **C6** | Gebouwd object | S5 | MEDIUM | 1 |
| **C7** | Bewijsband | S6 deel A | QUIET | 1 |
| **C8** | Verhaalblok met beeld, kaart en strook | S6 deel B | MEDIUM | 1 |
| **C9** | Kaartkolom op beeld | S7 | MEDIUM | 1 |
| **C10** | Slotcompositie | S8 | HIGH IMPACT | 3 |
| **C11** | Navigatievoet die rijmt | S9 | QUIET | 1 |
| **C12** | Register (specificatie of vraag) | — geen precedent | QUIET | 0 |

---

### C1 · OPENINGSPODIUM

| Veld | Specificatie |
|---|---|
| **Doel** | De pagina openen met één vlak waarin beeld de compositie is en tekst een laag. Het onderwerp is de **ruimte**, niet de opsomming. |
| **Geschikte archetypes** | B1 (bestaand, niet herbouwen — `§1A.11` punt 3) · B2 alle vier de varianten · B5 · B4. |
| **Ongeschikt gebruik** | B6 (conversie-instrument: één instrument per pagina, geen beeldpodium) · B7 (juridisch document) · S2 (`report.css` rekent in `mm`, niet in `cqw`) · elke sectie die niet de eerste van de pagina is. |
| **Desktopanatomie** | Eén `position:relative`-podium met vaste verhouding en `overflow:hidden`. Daarbinnen uitsluitend absolute lagen: (1) fotovlak op `inset:0`, gesneden; (2) lichtband op **exact dezelfde helling** als de snede; (3) optioneel een zachte wig onder de knik; (4) optionele SVG-geometrie; (5) tekstkolom links op 70-105 ref-px van de rand. `z-index` 1..11, oplopend. **Nul negatieve marges.** |
| **Tabletgedrag** | `aspect-ratio` vervalt, `padding-top:calc(76px + 48px)`, flexkolom; beeldhoogte 360px. Band, SVG-geometrie, wig en tweede tekstkolom gaan uit. Gemeten patroon: `home-hero.css`, band 768-1199px. |
| **Mobielgedrag** | Flexkolom, `.copy` `order:1`, beeld `order:2` op 232px hoog. Alle decoratieve lagen uit; de diagonaal keert terug als één steilere driehoek rechtsonder in het beeld (46% × 62%, 48,1°, `home-hero.css:458-466`). Alle `<br>` uit. Primaire CTA volle breedte. |
| **Aanbevolen inhoudsvolume** | Eyebrow (1 regel) · H1 (2-3 regels) · lead ≤ 460px breed, ≤ 3 regels · 2 knoppen · optioneel 3 bewijsregels in een aparte strook eronder. **Nul koppen onder de H1** binnen het podium. |
| **Mediagedrag** | Eén beeld, `loading="eager"`, `fetchpriority="high"` — dit is het LCP-beeld. Het beeld is een vlak, geen object: het vult het podium en wordt door de snede tot vorm gemaakt. Scrim verplicht als er tekst op komt; komt er geen tekst op, dan alleen een verloop voor wat eroverheen ligt. |
| **Kaartgedrag** | Geen kaarten in het podium. Bewijs staat in een strook **buiten** het podium. |
| **Toegestane geometrie** | Maximaal **vijf** gebaren, en alleen hier. De lichtband deelt beide randen met de hoofddiagonaal — het is geen tweede vorm maar een lichtstreep óp de eerste. Helling in de familie 31,6°-36,2°. |
| **Spacinggedrag** | Tekstkolom op 70-105 ref-px. De strook eronder is een decompressiekamer: haar eindkleur is **identiek** aan de achtergrond van de volgende sectie. Geen scheidingslijn. |
| **Bewijsvereisten** | Drie bewijsregels maximaal, elk één regel, in een vlak dat de tekstmarge doorbreekt (1740,0px gemeten). Elk cijfer valt onder de bevroren claimpolicy (`§1A.7`). |
| **CTA-gedrag** | Twee knoppen: één primair, één secundair. Nooit sticky (C-04). Onder 768px volle breedte. |
| **Toegankelijkheid** | Elke `<svg>` decoratief: `aria-hidden` op de svg of de directe wikkel, `focusable="false"`. Betekenis komt altijd van tekst ernaast (`§4.3.1`). Bevat het podium de header, dan moet de skiplink vóór het podium staan. Animatie volledig uit onder `prefers-reduced-motion`. |
| **Voorbeeld Master v1** | S1, `index.html:75-297` + `home-hero.css:35-132`. |
| **Gedeelde CSS of compositierichtlijn?** | **Compositierichtlijn.** `§1A.4` punt 3 verbiedt abstractie van de hero-stage expliciet. Elke pagina snijdt zijn eigen polygoon uit zijn eigen doosverhouding; percentages zijn niet overdraagbaar. Wel gedeeld: de primitives erin (`.vibe-eyebrow`, `.vibe-heading`, `.vibe-lead`, `.vibe-btn`). |

---

### C2 · ONGELIJK KAARTMOZAÏEK

| Veld | Specificatie |
|---|---|
| **Doel** | Vier tot zes bestemmingen tonen zonder dat ze gelijkwaardig lezen. Eén kaart vertelt waar te beginnen. |
| **Geschikte archetypes** | B1 · B2 varianten *Systeem* en *Oplossing* · B4 (indexpagina: de uitgelichte case als hoofdtegel) · B5. |
| **Ongeschikt gebruik** | Voor drie of minder items (dan is een mozaïek een raster met een gat) · voor inhoud die een **volgorde** heeft — een keten of een voortgang hoort in `C5` · voor bewijs, dat hoort in `C7`/`C8`. |
| **Desktopanatomie** | Twee kolommen **zonder gap**: redactionele kolom links (ca. 31%), mozaïek rechts (ca. 69%). Het mozaïek heeft twee rijen met **verschillende kolomverdeling** en **verschillende rijhoogte**, via `grid-template-areas 'a b c' / 'd e f'` plus een genest raster voor de onderrij. Gemeten: `487 \| 302 \| 292` over `371 \| 353 \| 355`, rijhoogtes 498 / 230. |
| **Tabletgedrag** | 1024-1199px: `repeat(3,1fr)` met areas `a b c` / `d d d`. 768-1023px: `1fr 1fr`, gap 16px, onderregel terug op de compacte kaarten, `.onder` als `repeat(3,1fr)`. |
| **Mobielgedrag** | `1fr 1fr` met areas `a a` / `b c` / `d d`, gap 10px; de onderregel verdwijnt op de vijf compacte kaarten; `min-height:150px`, `border-radius:var(--m-radius)`. Gemeten winst in het commentaar: "ruim 500 px korter" (`home-solutions.css:374`). |
| **Aanbevolen inhoudsvolume** | 4-6 kaarten. Eén hoofdkaart plus 3-5 nevenkaarten. Per kaart: icoon, kop van 1-2 regels, onderregel van één regel, pijlknop. Redactionele kolom: eyebrow, kop, lead ≤ 400px, CTA, scheidingslijn, ≤ 3 voordeelrijen. |
| **Mediagedrag** | Foto's zijn kaart**grond**: `position:absolute; inset:0; object-fit:cover; z-index:0`. Het leesbaarheidsverloop volgt de **tekstpositie** (verticale band) en wordt **per rij** opnieuw ingesteld, met een gemeten contrastwaarde als reden. Ontbreekt een foto, dan een **getekend** vlak in de eigen vormtaal — nooit een plaatshouder (P14). |
| **Kaartgedrag** | Per kaart vier lagen: beeld z0, verloop z1, inhoud z2, pijl z3. Geen enkele kaart steekt buiten een andere: het laagwerk zit **binnen** de kaart. De hoofdkaart krijgt een eigen typografische graad (26,6 / 44 / 46px tegenover 18,4 / 40 / 38px). Radius 10,0px op elke kaart. |
| **Toegestane geometrie** | **Eén** gebaar, en alleen op een kaart zonder foto. De sectie zelf blijft ongesneden. |
| **Spacinggedrag** | Kolomafstand 26,0px, rijafstand 23,0px — de smalste van de pagina. De leegte zit **in** de kaart (onderste 60-70% blijft leeg beeld), niet ertussen. |
| **Bewijsvereisten** | Geen. Deze familie draagt navigatie, geen bewijs. Een cijfer op een kaart valt onder de claimpolicy en mag de kaart niet in een metriek veranderen. |
| **CTA-gedrag** | Eén CTA in de redactionele kolom. Elke kaart is zelf een link met een ronde pijlknop op vaste positie; de pijl schuift `translateX(.22cqw)` op hover. Geen tweede knop in het mozaïek. |
| **Toegankelijkheid** | De pijlknop is decoratief; de kaartkop draagt de naam van de link. Contrast op elke kaart meten: het commentaar op `home-solutions.css:171-175` documenteert dat een eerder diagonaal verloop plaatselijk 1,00:1 opleverde. Hover-effecten mogen niet de enige statusindicatie zijn. |
| **Voorbeeld Master v1** | S2, `index.html:300-457` + `home-solutions.css:126-198`, `:306-320`. |
| **Gedeelde CSS of compositierichtlijn?** | **Beide.** Gedeeld: de kaartprimitieve (`.vibe-card--media`), de pijl (`.vibe-arrow`, `vibe-system.css:255-264`), de radius. Compositierichtlijn: de kolom- en rijverdeling wordt per pagina opnieuw gekozen — een vast mozaïekraster zou de regel "nooit twee gelijke rasters" zelf breken zodra twee pagina's het delen. |

---

### C3 · UITGELICHT PANEEL

| Veld | Specificatie |
|---|---|
| **Doel** | Eén onderwerp met volledige aandacht tonen: één project, één systeem, één case. Alles wat niet dat ene onderwerp is, wordt weggelaten. |
| **Geschikte archetypes** | B1 · B2 varianten *Oplossing* en *Sector* (als projectbewijs) · B3 (de case zelf) · B4 (uitgelichte case bovenaan het overzicht). |
| **Ongeschikt gebruik** | Voor twee of meer onderwerpen naast elkaar · voor een onderwerp zonder eigen beeld (een geleend beeld maakt het paneel een leugen — zie DR-C-04) · voor inhoud zonder drie onderbouwde cijfers. |
| **Desktopanatomie** | Eén paneel dat op de containermarge begint en aan **één** schermzijde afloopt. Gemeten: 1704,0 × 565,0px, `margin-left:3.9459cqw`, rechtermarge 0, verhouding 3,02:1. Radius **uitsluitend** aan de kant die de marge raakt (63,0px links, 0 rechts). Binnen het paneel vier absolute lagen: foto z0, scrim z1, geometrie z2, tekstkolom z3 op 97 ref-px van de paneelrand. |
| **Tabletgedrag** | Foto 340px hoog, tekstkolom `max-width:660px`, paneel volle breedte, radius 0. |
| **Mobielgedrag** | Flexkolom: foto `order:1` (236px), copy `order:2` met `margin-top:-26px` plus `padding-top:34px` en een verloop dat de bovenste 26px doorzichtig houdt. De desktoplaag wordt hier een negatieve marge — niet een verdwenen laag. |
| **Aanbevolen inhoudsvolume** | Eyebrow · titel (1-2 regels) · optioneel een tweede kopregel in gewicht 400 · body van 2-4 regels · **exact drie** metrieken · één knop plus één tekstlink. Dat is vijf niveaus in één kolom en het maximum. |
| **Mediagedrag** | De foto **is** het paneel (`inset:0`). Scrim vanaf de leeskant met vijf stops: massief op de eerste 20%, volledig transparant op 70%. Tekst staat op de donkerste 20%. `object-position` expliciet gekozen en in het commentaar verantwoord. |
| **Kaartgedrag** | Geen kaarten. Het paneel zelf is het object. |
| **Toegestane geometrie** | Tot **drie** gebaren — dit is een van de drie ankerrollen. In Master v1 zonder enige `clip-path`: de vorm komt uit een inline SVG met `preserveAspectRatio="none"` plus de asymmetrische radius. Dat is de aanbevolen route, want een SVG schaalt met het paneel. |
| **Spacinggedrag** | 100,0px papier boven én onder het paneel; het donkere vlak raakt de sectienaad nooit. Een radiale gloed van ca. 195px hoog kondigt het paneel aan. |
| **Bewijsvereisten** | **Drie metrieken, gescheiden door 1px-lijnen, nooit meer.** Elk cijfer een primaire bron conform `§1A.7`. Bij B3 geldt bovendien de bevroren proofregel per B2-variant (`vibe-page-archetypes-v1.md §4.2`). |
| **CTA-gedrag** | Eén primaire knop plus één tekstlink. Twee acties, niet meer: de sectie heeft gemeten 2 `<a>` — de laagste linkdichtheid van de pagina, en dat is het punt. |
| **Toegankelijkheid** | Witte tekst op fotografie: contrast meten op het donkerste én het lichtste deel van de uitsnede. De scrim is de enige leesbaarheidsgarantie — de SVG-geometrie doet dat werk niet (`vibe-web-brandbook-v1.md §4.1.1`). Inline SVG `aria-hidden`. |
| **Voorbeeld Master v1** | S3, `index.html:460-522` + `home-project.css:47-107`, SVG `index.html:478-493`. |
| **Gedeelde CSS of compositierichtlijn?** | **Compositierichtlijn.** `§1A.4` punt 3 noemt de Hedin-projectcompositie expliciet als niet te abstraheren. De regellengte is daar bovendien met de hand gezet via drie `<br>` (`.vh-pr-copy` heeft geen `max-width`), en dat werkt alleen bij die exacte copy. Wie de familie overneemt, zet wél een `max-width`. |

---

### C4 · REDACTIONELE SPLITSING MET GEDEELDE RAND

| Veld | Specificatie |
|---|---|
| **Doel** | Tekst en beeld naast elkaar zetten zónder in de half-half-val te lopen, door een derde element (een kaart) over de beeldrand te leggen dat een rand **exact** met het beeld deelt. |
| **Geschikte archetypes** | B2 alle varianten · B3 · B5 · B4. Dit is de werkfamilie voor gewone inhoudelijke secties. |
| **Ongeschikt gebruik** | Als vierde of vijfde opeenvolgende tweedeling op dezelfde as · zonder de overliggende kaart (dan is het een gewone 39/61-split en mist de sectie elke laag) · met een geleend beeld. |
| **Desktopanatomie** | Kopkolom links (gemeten 612,0px), beeld rechts (956,4px) — verhouding **39/61**. Over de rechterkant van het beeld een dekkende kaart waarvan de rechterrand **op de pixel** met de beeldrand samenvalt (`x=1708,0`). De kaart begint 47,9px onder de bovenrand van de foto en steekt er onderuit. Daarachter een volle-breedte diagonaal achtervlak op z0, waarvan het bovenste hoekpunt op 1,2px van de linkerrand van de foto ligt. |
| **Tabletgedrag** | Kolommen naar `1fr`; de kaart onder het beeld of met behouden overlap als de breedte dat toelaat. Het diagonale achtervlak gaat uit zodra de kaart niet meer over het beeld ligt (P7). |
| **Mobielgedrag** | Beeld met `margin:22px var(--m-gutter) 0` en `border-radius:var(--m-radius-img)`; de kaart met `margin:-26px` plus `position:relative; z-index:2` — met de uitgeschreven reden dat vervangen inhoud zich anders over de kaartachtergrond tekent. |
| **Aanbevolen inhoudsvolume** | Eyebrow · H2 · lead van 2-4 regels · optioneel 3-4 puntregels. In de kaart: icoon, kop van één regel, 2-3 regels body. Niet meer — de kaart is een accent, geen tweede sectie. |
| **Mediagedrag** | Eén beeld in een kader met radius 14,0px en een expliciete achtergrondkleur zodat de laadtoestand als lege ruimte leest en niet als fout (`#E8F1FB`, `home-process.css:99-104`). **Geen scrim**, want wat erop ligt is dekkend (P6). |
| **Kaartgedrag** | Precies **één** kaart op het beeld. Die kaart deelt minstens één rand exact met het beeld. Meer dan één kaart maakt hier `C9` van, en dan gelden de regels van `C9`. |
| **Toegestane geometrie** | **Eén** gebaar: een volle-breedte diagonaal achtervlak achter de splitsing, waarvan een hoekpunt met de beeldrand uitlijnt. Percentages uitrekenen uit de eigen doosverhouding. |
| **Spacinggedrag** | Beeld en kaart delen een rand; de kaart houdt aan de andere zijden ruimte. Onder het blok volgt een gemeten lege hoogte of de volgende compositie. |
| **Bewijsvereisten** | Geen eigen bewijsplicht. Draagt de kaart een cijfer, dan geldt de claimpolicy en de metriekregel uit §3.10. |
| **CTA-gedrag** | Optioneel. Deze familie mag **zonder** uitgang bestaan als hij als ademhaling dient — zie DR-C-07 voor de vraag of dat ook op een conversiepagina mag. |
| **Toegankelijkheid** | De kaart mag het beeld niet zo afdekken dat de `alt`-inhoud van het beeld onvindbaar wordt. Leesvolgorde in de DOM: kop, beeld, kaart — de kaart staat ná het beeld, zodat de `order`-omzetting op mobiel geen DOM-herschikking nodig heeft. |
| **Voorbeeld Master v1** | S4-boven, `index.html:525-560` + `home-process.css:37-123`. |
| **Gedeelde CSS of compositierichtlijn?** | **Compositierichtlijn**, met één gedeeld stuk CSS: de mobiele overlapregel (`position:relative; z-index:2` op een element dat op vervangen inhoud ligt) is drie keer identiek in Master v1 en hoort als utility in de bibliotheek. De gedeelde rand zelf is per pagina een ander getal. |

---

### C5 · VOORTGANGSRIJ

| Veld | Specificatie |
|---|---|
| **Doel** | Een proces met een **richting** tonen als één horizontale beweging, zodat stap 4 verder leest dan stap 1. |
| **Geschikte archetypes** | B1 · B2 alle varianten (de implementatiesectie) · B6 (de stappen van het instrument) · B5. |
| **Ongeschikt gebruik** | Voor inhoud zonder volgorde — een set gelijkwaardige eigenschappen hoort in `C2` · voor meer dan vijf stappen · als kaartraster met randen en schaduwen (dan is het geen voortgang meer). |
| **Desktopanatomie** | Eén rij die de tekstmarge doorbreekt: gemeten 1584,0px tussen marges van 94,0 en 96,0px. Vier stappen van 292,0px met **chevrons ertussen**, uitgelijnd op de titelregel (`margin-top:3.0300cqw`). Geen kaarten, geen randen, geen schaduwen. Onder de rij een gemeten lege balk. |
| **Tabletgedrag** | 2×2-raster, de doorlopende verbindingslijn uit. |
| **Mobielgedrag** | Verticale tijdlijn met een doorlopende `::before`-lijn van 2px op `left:17px`. De chevrons worden de lijn; de voortgang blijft dus zichtbaar, alleen van richting veranderd. |
| **Aanbevolen inhoudsvolume** | **3 tot 5 stappen.** Per stap: badge/nummer (14,2px), kop (18,7px), body van 2-3 regels (15,3px). De graadval binnen de sectie loopt van de H2 tot 14,2px. |
| **Mediagedrag** | Geen beeld. Iconen per stap, lijndikte constant binnen de sectie (`§4.3.2`). |
| **Kaartgedrag** | **Geen kaarten.** Dit is de expliciete tegenhanger van het kaartraster. |
| **Toegestane geometrie** | **Nul** eigen gebaren. De chevron is iconografie, geen geometrie. Deelt de rij een sectie met `C4`, dan draagt `C4` het ene toegestane gebaar. |
| **Spacinggedrag** | 34,0px tussen icoon en tekst. Onder de rij een expliciet leegte-element met `aria-hidden` en een gemeten hoogte (56,9px in Master v1). |
| **Bewijsvereisten** | Geen. Een voortgangsmerkteken is **geen** bewijs. Als de voortgang visueel wordt gemarkeerd, moet die markering per stap verschillen — een segment dat op alle vier de stappen even lang is, is decoratie (zie anti-patroon A14). |
| **CTA-gedrag** | **Nul links is toegestaan en aanbevolen.** Master v1 heeft hier nul `<a>` in de hele sectie, en dat is de reden dat het blok als ademhaling werkt. Zie DR-C-07. |
| **Toegankelijkheid** | Gebruik `<ol>`: de volgorde is betekenis. Chevrons `aria-hidden`. Het leegte-element krijgt `aria-hidden="true"`. Het stapnummer staat in de tekst, niet alleen in een `::before`. |
| **Voorbeeld Master v1** | S4-onder, `index.html:563-609` + `home-process.css:152-204`. |
| **Gedeelde CSS of compositierichtlijn?** | **Gedeelde CSS.** Dit is de meest herbruikbare familie van het stel: de rij, de chevron, de graadval en de mobiele tijdlijn zijn per pagina identiek. Kandidaat voor een component `.vibe-steps` in de bibliotheek, met de rijbreedte als enige pagina-eigen waarde. |

---

### C6 · GEBOUWD OBJECT

| Veld | Specificatie |
|---|---|
| **Doel** | Een product of mechanisme tonen waarvan **geen fotografie bestaat**, zonder stockmockup en zonder verzonnen cijfers. |
| **Geschikte archetypes** | B1 · B2 variant *Systeem* (VIBE.CONTROL, EMS, meetketen) · B6 (de uitkomstweergave van de wizard) · B5. |
| **Ongeschikt gebruik** | Wanneer er wél een echt productbeeld is · voor een diagram dat kleiner is dan ca. 45% van de viewport — dan is het een illustratie naast de tekst en verliest het de rol van onderwerp · voor cijfers die nergens anders op de site zijn gepubliceerd. |
| **Desktopanatomie** | Objectblok links (gemeten 809,0px = 45,6% van de viewport), tekstkolom rechts (726,1px), daartussen 94,7px leeg. Binnen het objectblok twee elementen: een hoofdapparaat en een kleiner apparaat dat er **20-25px** overheen steekt, aan de **buitenkant**, en er verticaal volledig binnen valt. Geen mockup-frame, geen laptopdekselschaduw: alleen radius, 1px rand en twee schaduwlagen. |
| **Tabletgedrag** | Rail én stroomlijnen terug; kenmerkenrij als `repeat(4,1fr)`. |
| **Mobielgedrag** | `height:auto`; **volgorde omgedraaid** — het object `order:1`, de copy `order:2`. Telefoon, rail, stroomlijnen en linkerkolom van het scherm gaan uit, met gemeten winst ("ruim 190 px", `home-control.css:336`). Radii en paddings naar vaste px (`border-radius:8px`, `padding:10px`). |
| **Aanbevolen inhoudsvolume** | Eyebrow · H2 · lead · **vier** kenmerken in een 4-koloms raster waarin kop en toelichting dezelfde graad delen en alleen in gewicht verschillen · één CTA. Binnen het object: maximaal 6 railitems, 6 knooppunten, 1 hub. |
| **Mediagedrag** | **Nul fotografie.** Alle vlakken worden in eigen tokens gebouwd. Verplicht label "Voorbeeldweergave" of gelijkwaardig, zichtbaar in de figuur zelf. Elk getal in het object moet elders op de site gepubliceerd zijn. |
| **Kaartgedrag** | De apparaten zijn geen kaarten en dragen geen kaartradius; binnen het object mogen tegels met eigen, kleinere radii staan (gemeten `.32cqw`, `.28cqw`). |
| **Toegestane geometrie** | **Eén** gebaar, en bij voorkeur bijna onzichtbaar: in Master v1 is de vijfhoek op 52% al volledig transparant en leest alleen de linkerpunt. De vormtaal zit hier in het **diagram** (hub met stroomlijnen van links naar rechts), niet in de snede. |
| **Spacinggedrag** | ≥ 90px tussen object en tekstkolom; ≥ 60px rechts. De sectiehoogte mag ingebouwde lucht naar de volgende sectie bevatten (32px gemeten), in plaats van een aparte spacer. |
| **Bewijsvereisten** | Alle getoonde waarden vallen onder de claimpolicy en moeten elders gepubliceerd zijn. Een gebouwd object dat niet-gepubliceerde waarden toont, is een fabricage en valt onder `REMOVE/REWRITE REQUIRED`. |
| **CTA-gedrag** | Eén CTA in de tekstkolom. In Master v1 is dit de laagste primaire knop van de pagina (50,3px) — het object is de boodschap, niet de knop. |
| **Toegankelijkheid** | Het object is een `<figure>` met een `<figcaption>` die het als voorbeeldweergave benoemt. Alle iconen decoratief. Animatie start pas via `IntersectionObserver` op `threshold .25` en staat **volledig** uit onder `prefers-reduced-motion`. De kleinste letter in het object (gemeten 7,1px) mag geen informatie dragen die niet ook in de tekstkolom staat. |
| **Voorbeeld Master v1** | S5, `index.html:613-784` + `home-control.css:35-190`. |
| **Gedeelde CSS of compositierichtlijn?** | **Compositierichtlijn.** `§1A.4` punt 3 noemt de VIBE.CONTROL-dashboardcompositie expliciet als niet te abstraheren. Het inline script in de sectie (`index.html:751-783`) is een eenmalige oplossing en geen component. Gedeeld zijn alleen de tokens en de regel dat elk getal gepubliceerd moet zijn. |

---

### C7 · BEWIJSBAND

| Veld | Specificatie |
|---|---|
| **Doel** | Bewijs tonen in de hoeveelheid die er werkelijk is, zonder de breedte met lege slots te vullen. |
| **Geschikte archetypes** | B1 · B2 alle varianten · B3 · B4 · B5. Niet in B7 (een juridisch document toont geen klantbewijs). |
| **Ongeschikt gebruik** | Als er nul onderbouwde items zijn — dan geen band · als vulling tussen twee zware secties, waarvoor `C5` bestaat · voor meer dan vier items, dan wordt het een raster en gelden de regels van `C2`. |
| **Desktopanatomie** | Een smalle band over de volle sectiebreedte: kop links op 70-80 ref-px, bewijsitems rechts tegen de rechtermarge, **het midden blijft leeg**. Gemeten: bandhoogte 13,6cqw = 241,3px, kop op `x=78,0`, twee organisatiekaarten tot `x=1698,0`, circa 700px leeg ertussen. Het commentaar legt vast dat de band van 17,7 naar 13,6cqw is teruggebracht omdat de rechterhelft leeg bleef (`home-proof.css:36-38`). |
| **Tabletgedrag** | De band blijft één rij zolang kop en items samen binnen de breedte passen; anders kop boven, items eronder in `repeat(n,1fr)` met n = het werkelijke aantal items. |
| **Mobielgedrag** | Kop boven, items eronder, één of twee kolommen naar aantal. Items die geen bewijs dragen (de "alle projecten"-link, de quote) gaan uit — Master v1 zet `.vh-proof-alle` en de quote onder 1200px uit. |
| **Aanbevolen inhoudsvolume** | **2 tot 4 bewijsitems.** Per item: naam, één regel context. Geen logo's zonder onderbouwing. |
| **Mediagedrag** | Geen sectiebeeld. Een logo of thumbnail mag, maar dan als klein dekkend object binnen het item (gemeten 98 × 91 ref-px) met bewust lege `alt` als de naam al in tekst staat. |
| **Kaartgedrag** | Elk bewijsitem is een lichte kaart met radius 10,0px; hover mag een elevatiestap geven. Geen kaart mag over een andere liggen. |
| **Toegestane geometrie** | Maximaal **één**, en dat is de enige plek in het hele systeem waar een **vrijstaande** versiering mag staan — maximaal één per negen secties (`§4.1.5`). Gemeten: een massieve driehoek van 85 × 133 ref-px tegen `right:0`. |
| **Spacinggedrag** | De band heeft een eigen achtergrondwaarde die van de rest van de sectie verschilt; de grens tussen band en het blok eronder mag de **enige** harde horizontale kleurnaad van de pagina zijn (gemeten op `y=241,3`). |
| **Bewijsvereisten** | **Het bewijs bepaalt de breedte, niet andersom.** Twee onderbouwde organisaties in plaats van zes lege slots — de motivering staat woordelijk in `index.html:789-794`. Elke naam valt onder `§1A.7`; een sectorclaim volgt de canonieke taxonomie (`§1A.8`). |
| **CTA-gedrag** | Maximaal één tekstlink ("alle projecten"), die op mobiel mag vervallen. Geen primaire knop in de band. |
| **Toegankelijkheid** | De band is geen `<header>` maar gewone sectie-inhoud. Logo's krijgen een tekstueel alternatief of een lege `alt` als de naam ernaast staat. Hovertoestanden zijn niet de enige onderscheiding. |
| **Voorbeeld Master v1** | S6 deel A, `index.html:787-800` + `home-proof.css:34-57`, `:100-135`. |
| **Gedeelde CSS of compositierichtlijn?** | **Gedeelde CSS.** De band zelf is per pagina identiek op één variabele na: het aantal items. Kandidaat voor `.vibe-proofband` in de bibliotheek, met de harde regel dat het aantal kolommen gelijk is aan het aantal onderbouwde items — nooit een vast getal. |

---

### C8 · VERHAALBLOK MET BEELD, KAART EN STROOK

| Veld | Specificatie |
|---|---|
| **Doel** | Eén case uitschrijven in drie registers tegelijk: verhaal (tekst), resultaat (kaart met cijfers) en identiteit (strook met projectnaam). |
| **Geschikte archetypes** | B1 · B2 varianten *Oplossing* en *Sector* · B3 (kernfamilie) · B4. |
| **Ongeschikt gebruik** | Zonder echte case — zie de bevroren proofregels per B2-variant (`vibe-page-archetypes-v1.md §4.2`) · voor een case buiten de eigen sector · direct na `C3`, want dan staan er twee uitgelichte onderwerpen achter elkaar. |
| **Desktopanatomie** | Vier absolute blokken in één vlak: verhaalkolom links (gemeten 532,2px), fotovlak in het midden-rechts (734,4px), resultaatkaart rechts die **42,0px** over de foto valt, en een donkere strook die **volledig** binnen de fotodoos ligt in beide assen. `z-index` 1 · 2 · 3. Verhouding tekst/beeld **42/58**. |
| **Tabletgedrag** | Het blok wordt `1fr 1fr`: bewijs naast beeld. De vrijstaande versiering gaat uit. |
| **Mobielgedrag** | Flexkolom in de volgorde verhaal → foto → kaart → strook → CTA. De kaart met `margin-top:-28px`, `margin-left:16px` en `position:relative; z-index:2`. De fotosnede gaat uit (`clip-path:none`) en het beeld krijgt `border-radius:var(--m-radius-img)`. |
| **Aanbevolen inhoudsvolume** | Tweede kop (5-6px kleiner dan de sectiekop) · verhaal van 4-6 regels · in de kaart **maximaal vier** cijfers plus één resultaatregel · in de strook: eyebrow, projectnaam, één regel. |
| **Mediagedrag** | Eén foto met een diagonale snede linksboven, die **functioneel** is: hij haalt het beeld weg precies waar de tekstkolom eroverheen zou lopen. Gemeten: kolom tot `x=610,2`, fotodoos vanaf `x=547,6` — 62,6px overlap die de snede wegneemt. **Geen scrim**, want alles wat erop ligt is dekkend (P6). |
| **Kaartgedrag** | Eén lichte kaart die over de foto valt, en één donkere strook die er volledig op ligt. Beide dekkend. De kaart deelt geen rand met de foto maar valt er met een gemeten waarde overheen (42,0px) — dat is de toegestane variant van P2 voor een kaart die niet uitlijnt: **een gemeten overlapwaarde in plaats van een gedeelde rand**. |
| **Toegestane geometrie** | **Eén** functionele fotosnede. De vrijstaande driehoek van `C7` telt bij de band, niet bij dit blok. |
| **Spacinggedrag** | De rechteronderhoek onder de kaart blijft leeg. De donkere strook raakt geen enkele vlakrand. |
| **Bewijsvereisten** | Bindend en bevroren: `vibe-page-archetypes-v1.md §4.2`. Aanvullend compositioneel: **een testimonial die niet bestaat, wordt een resultaatbeschrijving in derde persoon** (`index.html:817-826`) — niet een leeg citaatblok en niet een verzonnen quote. Merkblauw als cijferkleur: één keer per pagina. |
| **CTA-gedrag** | Eén tekstlink naar de volledige case. Geen primaire knop; die hoort in `C10`. |
| **Toegankelijkheid** | Leesvolgorde in de DOM = verhaal, foto, kaart, strook. De strook mag de `alt`-inhoud van de foto niet vervangen. Contrast van de witte strooktekst op `#01234C` controleren, en van de blauwe cijfers `#0073FE` op wit. |
| **Voorbeeld Master v1** | S6 deel B, `index.html:803-872` + `home-proof.css:138-341`. |
| **Gedeelde CSS of compositierichtlijn?** | **Compositierichtlijn.** De drie blokken hangen aan coördinaten van één canvas; de snede is uit de doosverhouding berekend. Gedeeld zijn de kaart- en strookprimitieven en de mobiele overlapregel. |

---

### C9 · KAARTKOLOM OP BEELD

| Veld | Specificatie |
|---|---|
| **Doel** | Drie tot vier bestemmingen tonen **op** een beeld in plaats van ernaast, zodat het beeld drager wordt en niet illustratie. |
| **Geschikte archetypes** | B1 · B2 varianten *Sector* en *Gebied* · B4. Niet in B6 of B7. |
| **Ongeschikt gebruik** | Met meer dan vier kaarten · zonder richtingsverloop onder de kolom (dan zweven de kaarten, en dat is precies de fout die `home-infra.css:171-172` benoemt) · als de kaarten niet volledig binnen het beeldvlak passen · zonder eigen beeld. |
| **Desktopanatomie** | Drie verticale zones: tekstkolom links (gemeten 567,7px), fotovlak (1100,0px = 62,0% van de viewport) en daarbovenop een kolom van vier kaarten (422,0px breed) die **volledig** binnen het fotovlak vallen. Vaste steek 141,3px, kaarthoogte 126,0px. Tekstkolom en fotodoos raken elkaar met 1,9px speling. Verhouding **34/66**. |
| **Tabletgedrag** | Kaarten als `repeat(4,1fr)` op één rij onder de foto. `clip-path` en verloop blijven uit zodra de kolom van de foto af is. |
| **Mobielgedrag** | Kaarten onder de foto in `1fr 1fr`. **Snede én verloop gaan uit**, met de reden er letterlijk bij (`home-infra.css:340-346`) — de enige schakelregel die woordelijk in de code staat. Gemeten winst: "ruim 140 px korter". |
| **Aanbevolen inhoudsvolume** | **3 of 4 kaarten**, nooit meer. Per kaart: icoon, kop van één regel (18,6px), één regel toelichting (16,0px), pijl. Tekstkolom: eyebrow, H2 in twee kleuren, lead, ≤ 3 voordeelrijen, één knop plus één tekstlink. |
| **Mediagedrag** | Eén beeld als **grond**. Diagonale snede linksboven, functioneel: zij maakt lucht naast de H2 (gemeten 128,4px). `object-position` expliciet gekozen zodat het onderwerp **naast** de kaartkolom komt te staan, niet erachter (`26% 52%`, met de reden in het commentaar). Een richtingsverloop op `::after` dat alleen onder de kolom verdonkert. |
| **Kaartgedrag** | Gelijke steek, gelijke hoogte, gelijke graad. Dit is de enige familie waar kaarten **wél** gelijk mogen zijn, omdat de asymmetrie uit de compositie komt (kolom op beeld, 34/66) en niet uit de kaarten. Elke kaart volledig binnen het beeldvlak; onder de laatste kaart blijft beeld vrij (gemeten 93,5px). |
| **Toegestane geometrie** | **Eén**: de fotosnede. De hoek volgt uit de doosverhouding en valt daardoor buiten de merkfamilie (gemeten 9,8° bij een doos van 1100 × 736 ref-px). Dat is toegestaan en verklaarbaar (`§4.1.3`); een percentage overnemen is dat niet. |
| **Spacinggedrag** | Speling tussen tekstkolom en fotodoos mag tot enkele pixels teruglopen, mits de snede bovenin lucht maakt. Onder de kolom blijft beeld over. |
| **Bewijsvereisten** | Geen eigen bewijsplicht, maar de sectorlabels volgen de canonieke taxonomie (`§1A.8`): geen sector zonder inhoud, geen case toeschrijven aan een sector waarin zij niet valt. |
| **CTA-gedrag** | Eén primaire knop plus één tekstlink in de tekstkolom. Elke kaart is zelf een link met pijl. |
| **Toegankelijkheid** | Kaartcontrast wordt bepaald door het verloop eronder, niet door de foto — het verloop is dus functioneel en mag niet worden weggelaten. Kaartkop draagt de naam van de link; de pijl is decoratief. |
| **Voorbeeld Master v1** | S7, `index.html:875-943` + `home-infra.css:148-231`, schakelregel `:340-346`. |
| **Gedeelde CSS of compositierichtlijn?** | **Beide, met een open punt.** De kaart, de steek en het verloop zijn herbruikbaar; de bovengrens en de verplichte uitlijningseis zijn nog niet vastgelegd — zie **DR-C-06**. Tot dat besluit geldt de gemeten bovengrens van vier kaarten als harde grens. |

---

### C10 · SLOTCOMPOSITIE

| Veld | Specificatie |
|---|---|
| **Doel** | De pagina afsluiten met de grootste typografische en compositionele escalatie die zij heeft, zodat het laatste moment niet van het midden te onderscheiden is. |
| **Geschikte archetypes** | B1 · B2 alle varianten · B3 · B4 · B5 · B6. **Niet B7**: een juridisch document met een conversieknop is een vertrouwensprobleem (`vibe-page-archetypes-v1.md §4.1`). |
| **Ongeschikt gebruik** | Als de pagina al een `C3` draagt met hetzelfde beeld · als het beeld hetzelfde bestand is als de hero · als er geen escalatie in kopgraad of mediaschaal mogelijk is. |
| **Desktopanatomie** | Twee **geneste** vormen over de volle sectiehoogte: een wig op `inset:0` en daarbinnen een fotochevron die op **exact dezelfde lijn** begint (`left:47.31%`) en **exact hetzelfde punt** deelt (`55.75%`). Links de tekstkolom (674,1px), onderaan een bewijsrij (822,5px breed), rechtsonder een merkvlak (293,6px), over de foto een afspraakkaart die het vormpunt kruist. Vijf `z-index`-niveaus. Verhouding **42/58**. |
| **Tabletgedrag** | Foto 340px, kaart `max-width:430px`. Wig en merkvlak uit. |
| **Mobielgedrag** | Flexkolom: copy 1 → voordelen 2 → foto 3 (204px) → kaart 4 met `margin:-34px`. Wig en blauw vlak uit; het blauw keert terug als `::before` op het beeld zelf — 44% × 58%, 52,3°, met het commentaar "blauwe slotwig hoort bij het beeld zelf, niet als los vlak". |
| **Aanbevolen inhoudsvolume** | Eyebrow · **de grootste H2 van de pagina** · lead van 2-3 regels · twee knoppen · **drie** geruststellingen · één kaart met kop en 2-3 regels. Eén boodschap, niet twee. |
| **Mediagedrag** | De foto **is** de vorm: geen rechthoek maar een chevron. Scrim verplicht (er komt wit op te liggen), drie stops. `object-position` expliciet gekozen en in het commentaar verantwoord. |
| **Kaartgedrag** | Eén kaart, die een vormpunt **mag** kruisen. Een tekst**rij** houdt daarentegen ≥ 25px afstand tot een schuine beeldrand (gemeten speling in Master v1). |
| **Toegestane geometrie** | Tot **drie** gebaren — de derde en laatste ankerrol van de pagina. Alle drie delen een lijn of een punt met elkaar; geneste vormen die één rand delen lezen als diepte, niet als twee vormen. |
| **Spacinggedrag** | In de linkerkolom circa 145px leeg tussen de knoppen en de bewijsrij: rust vlak vóór de conversie. Rechts is de leegte juist weggehaald — elk vlak raakt een ander vlak. |
| **Bewijsvereisten** | Drie geruststellingen, elk één regel, elk toetsbaar. Een belofte zonder asset valt onder `NO ASSET → NO DOWNLOAD PROMISE` (`§1A.10`). |
| **CTA-gedrag** | Twee knoppen: één primair, één secundair. De afspraakkaart mag naar dezelfde flow wijzen als de primaire knop. Nooit sticky (C-04). Onder 768px volle breedte met de vaste anatomie. |
| **Toegankelijkheid** | Witte tekst op gescrimde fotografie: contrast meten op het lichtste deel van de uitsnede. De afspraakkaart is een link of een knop met een tekstlabel, nooit alleen een icoon. Het merkvlak is `pointer-events:none`. |
| **Voorbeeld Master v1** | S8, `index.html:946-1002` + `home-final.css:37-104`, `:148`. |
| **Gedeelde CSS of compositierichtlijn?** | **Compositierichtlijn.** `§1A.4` punt 3 noemt de final CTA diagonal composition expliciet als niet te abstraheren. De chevroncoördinaten horen bij het 2103 × 748-canvas. Gedeeld: de knopprimitieve, de bewijsrij en de mobiele fallbackdriehoek. |

---

### C11 · NAVIGATIEVOET DIE RIJMT

| Veld | Specificatie |
|---|---|
| **Doel** | De pagina sluiten met de hoogste linkdichtheid en de vlakste hiërarchie van de pagina, in een vorm die **rijmt** op de slot-CTA. |
| **Geschikte archetypes** | Alle. De footer is sitebreed; de rijmvorm is per bouwtype gelijk zolang `C10` erboven staat. |
| **Ongeschikt gebruik** | Als `C10` niet direct erboven staat vervalt het rijm en wordt dit een gewone footer — dan géén beeldwig. |
| **Desktopanatomie** | Vier kolommen op absolute posities: merkkolom, drie navigatiekolommen, contactblok. Rechts een beeldwig tegen de schermrand (350,1px = 19,7%). Onderaan een hairline plus de juridische regel, samen 1605,2px breed — een vierde marge-breker (zie DR-C-01). Gemeten: dezelfde hoogte (631,0px), hetzelfde referentiecanvas (2103 × 748) en dezelfde vormfamilie als `C10`. |
| **Tabletgedrag** | Grid `minmax(0,1fr)`; navigatiekolommen `repeat(3,1fr)`. Bij 1000-1199px `minmax(0,1fr) minmax(0,1.6fr)`. |
| **Mobielgedrag** | Flexkolom; navigatie `1fr 1fr`. Wig, notitie en tweede checklist uit, met gemeten winst ("ruim 160 px"). |
| **Aanbevolen inhoudsvolume** | Woordmerk plus één regel · drie navigatiegroepen van 4-7 bestemmingen · drie contactregels · vier juridische links. Gemeten dichtheid: 23 `<a>` en 21 `<li>`. |
| **Mediagedrag** | Eén beeldvlak als chevron tegen de rechterrand, dat **precies één ding** draagt: een notitie. De scrim bestaat uitsluitend voor die notitie (`inset:0 0 42% 0`). Draagt de wig niets, dan is er geen wig (P7). |
| **Kaartgedrag** | Geen kaarten. Navigatie zonder kolomranden, uitsluitend gescheiden door positie. |
| **Toegestane geometrie** | **Eén**: de beeldwig. Wijkt de hoek af van de merkfamilie (gemeten 28,1° tegenover 31,6°-36,2°), dan moet de reden aanwijsbaar zijn in de **doosverhouding** — hier: 350,1 breed tegen 525,5 hoog; bij de standaardhelling zou de wig de navigatiekolommen raken. |
| **Spacinggedrag** | De leegte zit **onder** de inhoud, niet ernaast. Het contactblok houdt ≥ 16px afstand tot de wigpunt (gemeten 16,1px). Geen kop in de footer: de zwaarste letter is het woordmerk (32,1px). |
| **Bewijsvereisten** | Geen claims in de footer behalve `VERIFIED` bedrijfsgegevens (telefoon, e-mail, adres, KvK, BTW — `§4.3` van het archetypedocument). |
| **CTA-gedrag** | Geen primaire CTA. **Wat er niet is, wordt niet aangekondigd** (geen nieuwsbriefformulier zonder werkende flow, `index.html:1099-1102`) en een niet-bestaande pagina wordt niet gelinkt (`index.html:1063-1065`). |
| **Toegankelijkheid** | `<footer>` met `<nav>`-groepen die elk een toegankelijke naam dragen. De juridische regel in `#6A768F` en de KvK/BTW-regel in `#8A93A8` op licht: contrast expliciet controleren — dit zijn de twee lichtste teksten van de pagina. |
| **Voorbeeld Master v1** | S9, `index.html:1012-1129` + `home-footer.css:42-282`. |
| **Gedeelde CSS of compositierichtlijn?** | **Gedeelde CSS**, met één waarschuwing. De homepage verbergt de geïnjecteerde footer via `.vh-footer ~ footer.ftr.v1a{display:none!important}` (`home-footer.css:32-35`), wat alleen werkt omdat `_footer.js` ná deze footer injecteert. Een gedeelde footer mag die zusterselector niet overnemen; hij lost het probleem op door de injectie niet te laden. |

---

### C12 · REGISTER (SPECIFICATIE OF VRAAG) — `DECISION REQUIRED`

| Veld | Specificatie |
|---|---|
| **Status** | **Niet afgeleid uit Master v1.** De homepage bevat geen specificatietabel en geen accordeon. Deze familie is daarom een *voorstel met vastgelegde ondergrens*, geen vastgesteld patroon. Zie **DR-C-03**. |
| **Doel** | Een reeks label/waarde-paren of vraag/antwoord-paren tonen zonder dat het een tabel zonder gewicht wordt. |
| **Geschikte archetypes** | B2 variant *Systeem* (specificaties) · alle B-typen (FAQ) · B7. |
| **Ongeschikt gebruik** | Direct vóór de slot-CTA, waar de pagina juist zou moeten oplopen — in de B2-kandidaat staat de accordeon precies daar en vlakt de pagina af · als derde herhaling van feiten die al in twee eerdere secties stonden. |
| **Desktopanatomie** | Tweedeling met de lichtste kant ≤ 42% (§3.1): kop en inleiding links, het register rechts. Het register is **geen** raster van gelijke rijen: het draagt ten minste één gewichtsverschil, bijvoorbeeld een uitgelichte eerste rij of een groepering met tussenkop. |
| **Tabletgedrag** | Eén kolom; het register behoudt zijn interne tweedeling label/waarde. |
| **Mobielgedrag** | Label boven waarde, gap ≤ 4px, geen kolomraster. Voor een accordeon: `<details>`/`<summary>` blijft, met een raakvlak van ≥ 44px. |
| **Aanbevolen inhoudsvolume** | 5-8 rijen. Meer dan acht vraagt om groepering met tussenkoppen. |
| **Mediagedrag** | Geen beeld. |
| **Kaartgedrag** | Geen kaarten; 1px-lijnen als scheiding. |
| **Toegestane geometrie** | **Nul.** |
| **Spacinggedrag** | Gelijke rijhoogte is toegestaan; gelijk gewicht niet. |
| **Bewijsvereisten** | Elke specificatiewaarde valt onder `VERIFIED` (productspecificatie is een primaire bron, `§1A.7`) en mag niet elders op dezelfde pagina in een andere vorm herhaald worden. |
| **CTA-gedrag** | Eén knop of tekstlink in de linkerkolom. |
| **Toegankelijkheid** | `<dl>` met `<dt>`/`<dd>` voor specificaties; `<details>`/`<summary>` voor vragen, met zichtbare focusring (`vibe-system.css:129-131`). De chevron is decoratief. |
| **Voorbeeld Master v1** | **Geen.** Het dichtstbijzijnde precedent is P9: twee graden binnen één sectie verschillen 5-6px, of delen de graad en verschillen in gewicht 700/400. |
| **Gedeelde CSS of compositierichtlijn?** | **Onbeslist.** Het register is bij uitstek een kandidaat voor gedeelde CSS, maar de anatomie is nog niet vastgesteld. Tot DR-C-03 is beslist geldt uitsluitend de ondergrens hierboven: minstens 5px graadverschil of een gewichtssprong tussen label en waarde, en geen n identieke rijen zonder enig gewichtsverschil. |

---

## §5 · Vibe Geometry

Deze paragraaf werkt de compositionele kant van de vormtaal uit. De **vormdefinities** zelf staan al bevroren in `vibe-web-brandbook-v1.md §4.1.2` (negentien vormen met exacte polygonen) en `§4.1.3` (de hellingfamilie). V1.1 voegt toe: wanneer welke vormsoort mag, en hoe vaak.

### 5.1 Diagonale snedes

**Gemeten hellingen van de vrije randen** (`§4.1.3`):

| Vorm | dx/dy | Graden |
|---|---:|---:|
| S1 hoofddiagonaal en lichtband (beide randen) | −0,684 | 34,4° |
| S1 inkeping (terugslag) | +0,645 | 32,8° |
| S1 SVG-accentwig | −0,722 | 35,8° |
| S1 SVG-navyvorm | −0,725 | 35,9° |
| S3 topvlak | −0,669 | 33,8° |
| S3 wig | −0,725 | 35,9° |
| S4 achtervlak | −0,668 | 33,7° |
| S6 accentdriehoek | +0,639 | 32,6° |
| S8 wig boven / onder | −0,640 / +0,710 | 32,6° / 35,4° |
| S8 blauw merkvlak | −0,733 | 36,2° |
| S9 wig boven / onder | −0,534 / +0,615 | 28,1° / 31,6° |

**Twaalf van de zestien vrije randen liggen tussen 0,615 en 0,733 = 31,6° tot 36,2°, ongeveer 1 : 1,4.** Dat is de merkhoek.

De vier uitschieters zijn verklaarbaar en toegestaan: de fotosnedes staan in **procenten van hun eigen doos**, en die dozen zijn hoog (S6 734 × 557 ref-px → 13,0°; S7 1100 × 736 ref-px → 9,8°) of klein (de mobiele driehoeken → 48,1° en 52,3°). De hoek is daar een gevolg van de doosverhouding, niet van een keuze.

- **SHOULD** — een nieuw vrij vlak ligt tussen 31,6° en 36,2°. Wie dat in een nieuwe doos wil bereiken, **rekent het percentage uit** de doosverhouding. Een percentage overnemen levert een andere hoek op.
- **SHOULD** — wijkt een hoek af, dan is de reden aanwijsbaar in de doosverhouding. De footer-wig van 28,1° is het gemeten precedent: 350,1 breed tegen 525,5 hoog; bij 34° zou hij de navigatiekolommen raken.
- **SHOULD** — een lichtband op een snede deelt **beide** randen met die snede (S1: beide op −0,684). Dan is het één vorm met een lichtstreep, geen tweede vorm.
- **SHOULD NOT** — twee verschillende hoeken in één sectie die geen punt of lijn delen.
- **Let op de bevroren correctie:** bij het overnemen van een vorm gelden de **coördinaten**, niet de in proza genoemde hellingen. Twee commentaren in de code zijn aantoonbaar fout (`home-hero.css:52` noemt (621,545) waar de `clip-path` 623,9 geeft; `home-footer.css:39-40` noemt −0,5486/+0,6493 waar de eigen coördinaten −0,534/+0,615 geven) — `§4.1.7`.

### 5.2 Blauwe randvlakken

Drie op desktop, alle drie tegen de **rechter** schermrand, alle drie `pointer-events:none`:

| Vlak | Definitie | Bron |
|---|---|---|
| S1 SVG-accentwig | `points="1774,50 1270,748 1774,748"`, `fill="url(#vhAccent)"`, `opacity=".92"` | `index.html:119`, verloop `:97-103` |
| S3 SVG-accentwig + lichtrand | `points="2056,296 1776,682 2056,682"` plus `stroke="#BFD9FF" stroke-opacity=".55" stroke-width="2.6"` | `index.html:491-492` |
| S8 blauw merkvlak | `polygon(100% 0, 100% 100%, 0 100%)`, `right:0`, `top:36.50%`, `width:16.55%` (293,6px), `height:63.50%`, `linear-gradient(205deg, rgba(11,113,226,.88) 0%, rgba(1,92,208,.92) 48%, rgba(1,68,141,.94) 100%)` | `home-final.css:93-104` |

- **SHOULD** — een blauw randvlak is een rechthoekige driehoek of een wig tegen een schermrand, met de schuine zijde in de merkfamilie, en ligt **boven** het beeld (z3 gemeten).
- **SHOULD** — het blauw is een verloop, geen vlakke kleur, en eindigt donkerder dan het begint (alle drie gemeten).
- **SHOULD** — een lichtrand langs de schuine zijde is toegestaan, maar gemeten één keer op negen secties (`#BFD9FF`, dikte 2,6, opacity .55). Twee lichtranden op één pagina heeft geen precedent.
- **SHOULD NOT** — een blauw randvlak in een sectie die geen ankerrol is. Alle drie de gemeten vlakken staan in S1, S3 en S8: precies de drie ankerrollen.
- **Mobiel:** het blauwe randvlak wordt een steilere driehoek **op het beeld zelf**: S1 46% × 62% (48,1°) met `rgba(0,115,254,.90) → rgba(0,60,150,.92)`; S8 44% × 58% (52,3°) met `.92/.94`. Commentaar: "blauwe slotwig hoort bij het beeld zelf, niet als los vlak" (`home-final.css:387`).

### 5.3 Lichtblauwe achtergrondgeometrie

Vijf gemeten vlakken, en op één na **doven ze allemaal uit voordat ze een sectierand raken**:

| Vlak | Vulling | Uitdoofpunt |
|---|---|---|
| S1 lichtband | `linear-gradient(180deg, rgba(255,255,255,.50), .22 op 29%, 0 op 62%)` | 62% van de podiumhoogte |
| S1 zachte wig | `rgba(182,215,252,0) 72.86% → #B6D7FC 72.86% → #D8EBFC 80.2% → #E4F2FC 85.6% → rgba(232,244,253,0) 91%` | 91% |
| S3 radiale gloed | `#DFEDFD`, hoogte 195,1px, brandpunt op 58% breedte | vóór het paneel |
| S4 achtervlak | `linear-gradient(180deg, #E1F1FE 0%, #E9F5FE 52%, #EFF8FE 100%)` | eindigt op bijna-wit |
| S5 vijfhoek | `linear-gradient(100deg, rgba(186,220,252,.52), .16 op 30%, 0 op 52%)` | **52%** — de rechterrand op 62% leest niet |
| S6 accentdriehoek | massief `#B8DCFB`, 85 × 133 ref-px | dooft niet uit — de uitzondering |

- **SHOULD** — achtergrondgeometrie is een verloop dat transparant wordt vóór het de sectierand bereikt.
- **SHOULD** — achtergrondgeometrie ligt op `z-index 0` of lager dan alle inhoud, en `pointer-events:none`.
- **SHOULD** — een achtervlak lijnt met een hoekpunt uit op de inhoud erop. Gemeten: het bovenste hoekpunt van het S4-achtervlak staat op `x=750,4`, de linkerrand van de foto op `x=751,6` — 1,2px.
- **SHOULD NOT** — een massief lichtblauw vlak dat niet aan iets vastzit. Maximaal **één per pagina** (§5.8).

### 5.4 Beeldclipping

Vijf beelden op desktop worden geknipt; elk knipsel heeft een aanwijsbare reden:

| Beeld | Polygoon | Reden |
|---|---|---|
| S1 fotolaag | `polygon(56.223% 0, 100% 0, 100% 100%, 42.537% 100%, 35.169% 72.861%)` | snijdt het beeld volledig weg uit de linker tekstkolom |
| S6 fotosnede | `polygon(17.55% 0, 100% 0, 100% 100%, 0 100%)` | haalt 7,3cqw beeld weg precies waar de kop staat, bij 3,5cqw overlap van kolom en fotodoos |
| S7 fotosnede | `polygon(11.5% 0, 100% 0, 100% 100%, 0 100%)` | geeft 7,1cqw extra lucht naast de H2; "zonder deze snede is dit vlak een kale rechthoek met zwevende kaarten" |
| S8 fotochevron | `polygon(24.19% 0, 100% 0, 100% 100%, 21.21% 100%, 0 55.75%)`, `left:47.31%` | de vorm van het beeld **is** het gebaar; binnenrand valt samen met de buitenrand van de wig |
| S9 beeldwig | `polygon(38.07% 0, 100% 0, 100% 100%, 48.43% 100%, 0 47.51%)` | draagt de notitie, met een eigen scrim `inset:0 0 42% 0` |

- **SHOULD** — een beeldsnede doet één van twee dingen: beeld wegsnijden van een tekstkolom, of zelf het gebaar zijn. Doet hij geen van beide, dan is hij overtollig (`§4.1.5`).
- **SHOULD** — `object-position` wordt bij elke geknipte foto expliciet gezet en, waar de uitsnede een inhoudelijk besluit is, in het commentaar verantwoord. Vijf gemeten gevallen: `50% 50%` (S1, uitsnede zit in het derivaat zelf), `54% 62%` (S3), `26% 52%` (S7, "nu staan ze links, naast de kaartkolom"), `78% 56%` (S8, "zet de carportrijen en de skyline in beeld"), `46% 54%` (S9).
- **SHOULD** — de kniplaag draagt een achtergrondkleur die als lege ruimte leest zolang het beeld niet geladen is (`#E3ECF4`, `#DCE8F4`, `#E8F1FB` gemeten). De bevroren primitieve doet dat al: `.vibe-media{ background:var(--vibe-blue-050) }` met de reden in het commentaar (`vibe-system.css:289-291`).
- **SHOULD NOT** — een snede toepassen op een beeld dat op mobiel niets meer draagt. Dan `clip-path:none` plus `border-radius:var(--m-radius-img)` (P7).

### 5.5 Zwevende kaarten

Vier gemeten relaties tussen een kaart en het beeld eronder. **Elke zwevende kaart volgt er precies één:**

| Relatie | Gemeten voorbeeld | Waarde |
|---|---|---|
| **Gedeelde rand** | `.vh-proc-kaart` en `.vh-proc-beeld` | beide eindigen op `x=1708,0` |
| **Gemeten overlapwaarde** | `.vh-proof-kaart` over `.vh-proof-foto` | 42,0px (foto eindigt 1282,0, kaart begint 1240,0) |
| **Volledige insluiting** | `.vh-proof-strip` in de fotodoos; de vier `.vh-infra-kaart`en | in beide assen binnen het beeldvlak |
| **Vormpunt kruisen** | `.vh-final-kaart` over het chevronpunt | kaart `y=290,2..562,7`, punt op `y=351,8` |

- **SHOULD** — elke zwevende kaart is aan één van deze vier relaties toe te wijzen.
- **SHOULD NOT** — een vijfde relatie ("ergens op het beeld"). Dat is de enige plek waar het verschil tussen laag en rommel ligt.
- **SHOULD** — een **tekstrij** (geen kaart) houdt ≥ 25px afstand tot een schuine beeldrand. Gemeten: de S8-bewijsrij stopt op `x=910,2` terwijl de fotorand op die hoogte op circa `x=935` ligt.
- **SHOULD** — een kaartkolom op beeld krijgt een richtingsverloop dat alleen onder die kolom werkt; zonder dat verloop zweven de kaarten (`home-infra.css:171-172`).

### 5.6 Gecontroleerde overlap

- **SHOULD** — `z-index`-ladder per sectie oplopend vanaf 0, met een maximum van 11 in Master v1. Gemeten ladders: S3 `0 · 1 · 2 · 3`, S8 `1 · 2 · 3 · 4 · 5`, S1 `1 · 2 · 3 · 4 · 10 · 11 · 11`.
- **SHOULD** — de header staat op een eigen niveau (`z-index:10` in het podium, `z-index:40` in de gedeelde shell `vibe-system.css:337`) en overlapt geen inhoudslaag.
- **SHOULD NOT** — een negatieve marge op desktop. **Nul** in Master v1.
- **SHOULD** — op mobiel wordt dezelfde laag een negatieve marge, en het element krijgt `position:relative` — nooit `static`, omdat vervangen inhoud zich anders over de kaartachtergrond tekent. Drie keer identiek toegelicht in Master v1.
- **Gemeten spreiding per sectie**, als ijkpunt voor nieuw werk: 6 · 6 · 2 · 0 · 3 · 6 · 5 · 5 · 8 — gemiddeld 5,3 per sectie, met één sectie op nul.

### 5.7 Pijl- en chevrontaal

Drie rollen, die niet door elkaar mogen lopen:

| Rol | Vorm | Maat | Bron |
|---|---|---|---|
| **Knoppijl** | glyph `M4 12h15m-6-6 6 6-6 6`, lijndikte 2.1 | svg 23px desktop, 19 × 19px onder 768px | `§1A.9` punt 1, `index.html:157-159` |
| **Cirkelpijl** | witte cirkel met blauwe glyph, schuift `translateX(.22cqw)` op hover | 38px standaard, 46px op de hoofdkaart; primitieve `.vibe-arrow` 44 × 44px met svg 17 × 17px en `--elev-1` | `home-solutions.css:226-249`, `vibe-system.css:255-264` |
| **Voortgangschevron** | losse glyph tússen twee stappen, `viewBox="0 0 10 18"`, kleur `#B9C7D8` | 9,4 × 17,7px, `margin-top:3.0300cqw` zodat hij op de titelregel staat | `home-process.css:196-202` |

**De chevron als VORM is iets anders dan de chevron als glyph.** De chevrons van S8 en S9 zijn geknipte vlakken van honderden pixels (`§5.1`); de chevron van S4 is een icoon van 9,4px. Ze delen een naam en verder niets.

- **SHOULD** — binnen één sectie is de lijndikte van alle iconen constant; over secties heen mag zij variëren (gemeten 1.5 tot 3.4, `§4.3.2`).
- **SHOULD** — een pictogram dat een **waarde** uitdrukt is massief; alles wat een ding, een actie of een navigatie aanduidt is een lijntekening. Gemeten: 79× `fill="none"` tegenover 6× `fill="currentColor"`.
- **SHOULD NOT** — een svg als enige label van een knop of link. Dat patroon bestaat nergens in Master v1 (0× `role="img"`, 0× `aria-label` op een svg, 0× `<title>`).

### 5.8 Radii

**Gemeten radiusreeks op 1774px** (exclusief de dode regelblokken):

| cqw | px | Rol | Bron |
|---:|---:|---|---|
| `.5139` | 9,1 | metrieklijn-accent in het projectpaneel | `home-project.css:183` |
| `.5637` | **10,0** | **kaartradius** — de meest gebruikte waarde | `home.css:55` (`--vibe-radius-kaart`), `home-hero.css:213`, `home-solutions.css:74`/`:149`, `home-proof.css:125`/`:202`/`:321`, `home-infra.css:118`, `home-footer.css:227` |
| `.6595` | 11,7 | kaart op beeld | `home-process.css:120` |
| `.6657` | 11,8 | knop en tegel in de slotsectie | `home-final.css:178`/`:197`/`:234` |
| `.7328` / `.7329` | 13,0 | icoontegel | `home-infra.css:79`, `home-control.css:58` |
| `.7608` | 13,5 | afspraakkaart | `home-final.css:269` |
| `.7892` / `.7893` | 14,0 | **beeldkader** | `home-process.css:97`, `home-infra.css:215` |
| `.9019` | 16,0 | resultaatkaart | `home-proof.css:247` |
| `1.0147` | 18,0 | groot beeldvlak | `home-infra.css:154` |
| `1.0541` | 18,7 | apparaat | `home-control.css:70` |
| `1.1274` | 20,0 | projectstrook | `home-proof.css:307` |
| `3.5507` | **63,0** | **paneelradius, uitsluitend aan de margezijde** | `home-project.css:52` |
| `50%` | — | cirkelpijl, hub, live-indicator | zes gemeten declaraties |

- **SHOULD** — kaarten 10,0px, beeldkaders 14,0px, cirkels `50%`. Dat zijn de drie waarden met meerdere gemeten dragers.
- **SHOULD** — een paneel dat aan één zijde van het scherm afloopt krijgt radius **uitsluitend** aan de kant die de marge raakt: `3.5507cqw 0 0 3.5507cqw`. Een afgeronde hoek aan een aflopende rand is een fout.
- **SHOULD** — mobiel gaat alles naar vaste px: `var(--m-radius)`, `var(--m-radius-img)`, plus 8/9/10/12px op de kleinere elementen.
- **Meetopmerking, geen regel:** tussen 9,1 en 20,0px staan **elf** verschillende waarden. Dat is drift, geen systeem; de consolidatie hoort in `vibe-design-tokens-v1.md §5` en `§7`, niet in dit document. V1.1 voegt geen radiustoken toe.

### 5.9 FREQUENTIEREGEL — wat voorkomt dat elke sectie vol diagonalen komt

**Eerst de telling, want zij spreekt de intuïtie tegen.**

| Meting | Uitkomst |
|---|---|
| Homepagesecties met **ten minste één** geometrisch gebaar op desktop | **9 van 9** |
| Homepagesecties met **precies één** gebaar | **6 van 9** (S2, S4, S5, S6, S7, S9) |
| Homepagesecties met **drie of meer** gebaren | **3 van 9** (S1 vijf, S3 drie, S8 drie) |
| Homepagesecties met **nul** gebaren op desktop | **0 van 9** |
| Geknipte vlakken totaal op desktop | **18** |
| Daarvan **functioneel** (beeld wegsnijden van tekst, of donkere plaat voor witte tekst) | **6** |
| Daarvan **decoratief** (merkvocabulaire) | **12** |
| **Vrijstaande** versiering (hangt aan niets) | **1** van 18 |
| Homepagesecties die op mobiel geometrie **houden** | **3 van 9** (S1, S2, S8) |
| Homepagesecties die op mobiel geometrie **verliezen** | **6 van 9** |

**De regel is dus niet "niet elke sectie krijgt geometrie".** Elke sectie krijgt er één. De verzadiging zit ergens anders, en daar staan vier grenzen:

1. **DRIE ANKERROLLEN PER PAGINA — EN DAT GETAL SCHAALT NIET MEE MET DE PAGINALENGTE.**
 Een meerdelige compositie (≥ 3 gebaren) is voorbehouden aan pagina-opening, één uitgelicht paneel en één slot-CTA. Master v1 heeft negen secties en drie ankerrollen. Een B2-pagina met twaalf secties heeft er **ook drie**, niet vier. Dit is de enige V1.1-aanscherping op `§4.1.5`, en zij is nodig omdat de bevroren regel de verhouding niet expliciet vastzet en een pagina van twaalf secties anders 3/9 naar 4/12 zou afronden.

2. **ALLE OVERIGE SECTIES: PRECIES ÉÉN GEBAAR — EN MINSTENS ÉÉN DAARVAN IS BIJNA ONZICHTBAAR.**
 Gemeten precedent: de S5-vijfhoek is op 52% al volledig transparant; alleen de linkerpunt rond 46% hoogte leest. Twee gebaren in een niet-ankersectie hebben geen precedent in deze codebase.

3. **ÉÉN VRIJSTAANDE VERSIERING PER PAGINA.**
 Zeventien van de achttien vlakken hangen aan een fotorand, een tekstplaat, een kaart of een apparaatblok. Precies één staat vrij: `.vh-proof-wig` (85 × 133 ref-px). De bevroren formulering is "maximaal één per negen secties" (`§4.1.5`); V1.1 leest dat als **één per pagina**, want anders zou een pagina van achttien secties er twee mogen hebben, en dat is niet wat de meting laat zien.

4. **ELK NIEUW VLAK IS TOE TE WIJZEN AAN EEN WERKSOORT, OF HET VERVALT.**
 Twee werksoorten: (a) beeld wegsnijden van een tekstkolom, (b) een donkere plaat leveren waar witte tekst op staat. Slechts 6 van de 18 vlakken doen dat werk; de andere 12 zijn merkvocabulaire en dáár is de pagina al verzadigd. Wie een dertiende decoratief vlak toevoegt, voegt ruis toe aan een verzadigde groep.

**Vijfde grens, mobiel:** hoogstens een derde van de secties houdt geometrie. Gemeten 3 van 9. En de schakelaar staat op naam van de **inhoud**: een vlak gaat uit omdat wat erop lag verdwenen is, niet omdat het scherm smaller is (`home-infra.css:340-346`).

---

## §6 · Paginaritme

### 6.1 De drie niveaus

| | **HIGH IMPACT** | **MEDIUM** | **QUIET** |
|---|---|---|---|
| **Dichtheid** | **onder** het paginagemiddelde. Gemeten: S1 nul koppen onder de H1; S3 twee `<a>` (laagste van de pagina); S8 drie `<a>` | op of boven het gemiddelde. Gemeten: S2 7 koppen en 16 `<svg>`; S7 13 `<svg>` | laag aantal elementen én lage hoogte. Gemeten: S4 nul `<a>` en 453,2px hoog; S9 geen H2 |
| **Mediaschaal** | ≥ 50% van de viewport, of een vlak dat van het scherm afloopt. Gemeten: 1704,0 (96,1%) · 934,7 (52,7%) · het hele podium | 40-65%. Gemeten: 809,0 (45,6%) · 734,4 (41,4%) · 1100,0 (62,0%) | geen fotografie, of < 25%. Gemeten: S4-onder geen fotografie · S9 350,1 (19,7%) |
| **Contrast** | bevat het donkerste of meest verzadigde vlak van de pagina. Gemeten: `#001632` · het blauwe merkvlak `rgba(11,113,226,.88)` | licht met **één** donker object. Gemeten: `#011731` console · `#01234C` strook | geen donker vlak. Gemeten: S4 het lichtste blok van de pagina; S9 zes grijswaarden, nul donker |
| **Geometrie** | 3 tot 5 gebaren | precies 1 | 0 of 1, bij voorkeur bijna onzichtbaar |
| **Lagen** | ≥ 4 gestapelde vlakken | 1-3 overlappingen | 0-1 overlapping |
| **Sectiehoogte** | boven het paginagemiddelde, of met een eigen verhouding | rond het gemiddelde | onder het gemiddelde |
| **Aantal per pagina** | **exact 3** (§5.9 grens 1) | het merendeel | ten minste 2, waarvan één de kortste sectie van de pagina |

### 6.2 Het gemeten ritme van Master v1

```
S1      S2       S3      S4      S5       S6       S7       S8      S9
HIGH    MEDIUM   HIGH    QUIET   MEDIUM   MEDIUM   MEDIUM   HIGH    QUIET
908,0   ~884     765,0   453,2   588,5    887,0    887,0    631,0   631,0  px
C1      C2       C3      C4+C5   C6       C7+C8    C9       C10     C11
```

**Leesnoot bij S4.** Die sectie draagt twee families onder elkaar: `C4` (MEDIUM) boven en `C5` (QUIET) eronder. Als geheel leest zij QUIET, en dat is een meting, geen afronding: 453,2px (de kortste sectie), nul `<a>`, geen donker vlak, en het enige leegte-element van de pagina. Een sectie wordt dus op haar **totaal** ingedeeld, niet op haar zwaarste onderdeel.

Vier eigenschappen van die reeks, die als regel gelden:

1. **Nooit twee HIGH achter elkaar.** Elke HIGH wordt gescheiden door minstens één MEDIUM of QUIET.
2. **De langste MEDIUM-reeks is drie** (S5, S6, S7) — en die drie dragen **drie verschillende families** (C6, C7+C8, C9) met mediabreedtes 809,0 / 734,4 / 1100,0px. De laatste is 50% breder dan de middelste. Een MEDIUM-reeks is toegestaan zolang familie én mediaschaal verschuiven.
3. **De QUIET-sectie is de kortste sectie van de pagina** en draagt het enige leegte-element (453,2px; 56,9px `aria-hidden`).
4. **De pagina sluit HIGH → QUIET.** De slot-CTA escaleert (grootste H2, 934,7px beeld, vijf lagen), de footer zakt terug (geen H2, 350,1px beeld, twee overlappingen) — en de twee **rijmen**: gedeelde hoogte 631,0px, gedeeld referentiecanvas 2103 × 748, gedeelde vormfamilie.

**Eén open punt in deze reeks:** S6 en S7 hebben exact dezelfde hoogte (beide `50cqw` = 887,0px) en staan achter elkaar. Overal elders wisselt de hoogte. Er staat geen commentaar bij, dus het is niet vast te stellen of dat een besluit is of een gevolg van het gedeelde 1774 × 887-canvas — zie **DR-C-08**. Het compositionele verschil draagt daar het onderscheid (band+blok tegenover kolom-op-beeld), niet de hoogte.

### 6.3 Ritmepatronen per archetype

De patronen verschillen per bouwtype. Zij zijn **aanbevolen reeksen**, geen vaste sectievolgordes — `§1A.3` punt 2 blijft gelden.

#### B2 · Propositiepagina — 10 tot 12 secties, exact 3 HIGH

| # | Niveau | Familie | Rol |
|---:|---|---|---|
| 1 | **HIGH** | C1 | opening |
| 2 | QUIET | C7 | bewijsband — vervalt als er nul onderbouwde items zijn |
| 3 | MEDIUM | C2 | het probleem of het aanbod |
| 4 | MEDIUM | C4 | het mechanisme |
| 5 | QUIET | C5 | implementatie als voortgangsrij |
| 6 | **HIGH** | C3 | uitgelicht projectbewijs |
| 7 | MEDIUM | C9 | toepassing per sector of per gebied |
| 8 | QUIET | C12 | specificatieregister |
| 9 | MEDIUM | C6 of C4 | model, exploitatie of VIBE.CONTROL |
| 10 | QUIET | C12 | vragen |
| 11 | **HIGH** | C10 | slot |
| 12 | QUIET | C11 | footer |

**Variantafwijkingen** (bevroren proofregels, `vibe-page-archetypes-v1.md §4.2`):
- *SYSTEM* — slot 3 draagt drie technische pijnpunten; slot 8 is verplicht en draagt de specificaties, want dít is de proofregel van de variant. Bestaat er geen eigen case, dan vervalt slot 6 en heeft de pagina **twee** HIGH; drie is een maximum, geen minimum.
- *SOLUTION* — slot 3 draagt de vraag/aanbod-vergelijking; **slot 6 is verplicht**: een oplossingspagina zonder projectbewijs is een belofte, geen propositie.
- *SECTOR* — slot 7 draagt de zes sectoruitdagingen onder eigen labels; slot 6 alleen met een case **in die sector**, anders `CASE PROOF = PENDING` en geen casesectie.
- *GEBIED* — slot 6 vervalt bij gebrek aan lokale onderbouwing; slot 5 krijgt dan extra gewicht. Geen gesuggereerd bewijs.

#### B3 · Casepagina — 8 tot 10 secties, 2 tot 3 HIGH

`HIGH C1 · MEDIUM C4 · HIGH C3 · MEDIUM C8 · QUIET C5 · QUIET C12 · MEDIUM C2 · HIGH C10 · QUIET C11`

De case **is** het bewijs, dus het uitgelichte paneel komt vroeg (slot 3) en het verhaalblok direct erna. Het kaartmozaïek staat achteraan en draagt verwante cases — nooit vooraan, want dan concurreert het met het onderwerp. Twee varianten (*asset* en *portefeuille*) verschillen in slot 4: één locatie tegenover meerdere panden.

#### B4 · Indexpagina — 5 tot 7 secties, 2 HIGH

`HIGH C1 · MEDIUM C2 · QUIET C7 · MEDIUM (de lijst) · QUIET C5 of leegte · HIGH C10 · QUIET C11`

**De lijst is één MEDIUM-blok.** Hij wordt geen drie MEDIUM-blokken door paginering of door filtering in secties op te knippen. Dit is het bouwtype met het hoogste risico op een eindeloos gelijk raster; de tegenmaatregel is dat de nieuwste of zwaarste case als hoofdtegel in slot 2 groter wordt getoond dan de rest (C2-principe: één kaart krijgt een eigen graad).

#### B5 · Standpuntpagina — 7 tot 9 secties, 2 HIGH

`HIGH C1 · QUIET (proza in C4 zonder kaart) · MEDIUM C4 · QUIET C5 · MEDIUM C8 · QUIET C7 · MEDIUM C2 · HIGH C10 · QUIET C11`

Redactioneel bouwtype: meer QUIET, langere proza, minder kaarten. Prozabreedte blijft onder 730px (§3.3). Het tweede slot is bewust een kale tekstsectie — dat is toegestaan en het is de enige plek in het systeem waar dat aanbevolen wordt.

#### B6 · Conversie-instrument — 4 tot 6 secties, 1 HIGH

`MEDIUM (gereduceerde opening) · HIGH C6 (het instrument op sectieschaal) · QUIET C7 · QUIET C12 · QUIET C11`

**Geen C10.** Het instrument **is** de conversie; een tweede CTA-sectie is een afleiding. De wizardvariant "biedt precies één pad en verbiedt elke afleiding" (`vibe-page-archetypes-v1.md §4.1`). De opening is hier geen podium met foto maar een gereduceerde kop-plus-lead, omdat `C1` een LCP-beeld inbrengt dat op een formulierpagina niets doet.

### 6.4 Twee expliciet verboden reeksen

**VERBODEN — `HIGH · HIGH · HIGH · HIGH`.**
Vier ankerrollen op één pagina bestaan niet. De gemeten bovengrens is drie (S1, S3, S8) en die schaalt niet mee met de paginalengte (§5.9 grens 1). Met vier ankers is er geen anker meer: alles concurreert met alles, de kopgraadladder (76,5 → 66,0 → 64,0 → …) verliest haar top, en de regel "de grootste H2 hoort in de slot-CTA" wordt onuitvoerbaar.

**VERBODEN — `GENERIEK · GENERIEK · GENERIEK · GENERIEK`.**
Een sectie heet hier GENERIEK als zij aan **alle vier** deze voorwaarden voldoet:
1. tweedeling binnen 46/54-54/46 óf een gelijkverdeeld raster;
2. dezelfde containerbreedte als de vorige sectie;
3. een achtergrondstap van ΔRGB ≤ 11 per kanaal, of een harde flip zonder vormdrager;
4. nul cross-element-overlappingen.

Vier zulke secties achter elkaar maken een pagina onleesbaar als structuur: de lezer ziet één doorlopend ritme van gelijke rechthoeken en kan niet zien waar te beginnen. **Aanvullende grenzen uit dezelfde meting:**
- **SHOULD NOT** — drie opeenvolgende gelijkverdelingen. Gemeten in de B2-kandidaat: 08 (zes gelijke `dl`-rijen) → 09 (drie gelijke panelen) → 10 (vier gelijke kolommen).
- **SHOULD NOT** — drie secties op één pagina die achtergrond, containerbreedte, verticale padding én rasterritme delen. Gemeten: de B2-secties 03, 07 en 10 delen `#F6FAFE`, 1240/1080px, 106,44px en `.vibe-grid--3`/`repeat(4,…)` — drie visueel uitwisselbare secties verspreid over de pagina.
- **SHOULD NOT** — drie vierdelingen met een onderling maatverschil onder 1%. Gemeten: 246,0 / 255,0 / 252,0px = 0,8% op een inhoudsbox van 1080px. Optisch is dat drie keer dezelfde rij.

---

## §7 · Anti-patronen

Zestien patronen, elk met **waarom het faalt** en **wat in plaats daarvan**, onderbouwd met wat de B2-diagnose aantrof. Deze lijst werkt als extra reviewpoort naast de QA-poorten P1-P12 uit `vibe-migration-checklist-v1.md §5`.

---

**A1 · ÉÉN CONTAINERBREEDTE VOOR ELKE SECTIE**
*Gemeten:* 13 × `.vibe-container` op `systeem-energieopslag.html:119, 145, 168, 202, 239, 280, 314, 379, 406, 427, 458, 497, 527`; `--container-max:1240px` (`vibe-system.css:85`), gutter 80px bij 1774 → inhoudsbox 1080px, van `x=347` tot `x=1427`, op alle twaalf secties.
*Waarom het faalt:* twaalf identieke verticale lijnen over de volle paginahoogte lezen als één lange kolom. 694px (39,1%) van het scherm blijft op elke sectie ongebruikt, terwijl de homepage daar juist haar ritme maakt.
*Wat in plaats daarvan:* drie breedteklassen (P3). Ten minste één inhoudsvlak per pagina doorbreekt de tekstmarge; beeld- en decoratievlakken lopen volle breedte of van één schermrand af. Zie **DR-C-01** voor de vraag tot welke breedte een subpagina mag doorbreken.

---

**A2 · BYTE-IDENTIEKE VERTICALE PADDING OP ELKE SECTIE**
*Gemeten:* 10 van de 12 secties dragen `padding-block:var(--section-y)` = 106,44px bij 1774 (`vibe-system.css:149`, `vibe-storage.css:228`). Alleen sectie 01 wijkt af (92/76px). Er is **geen enkele ontworpen sectiehoogte**: hoogte = inhoud + 212,88px.
*Waarom het faalt:* zonder ontworpen hoogte kan een pagina geen ritme dragen. De homepage heeft zeven verschillende hoogten tussen 453,2 en 908,0px, en de kortste sectie is precies de ademhaling.
*Wat in plaats daarvan:* geef ten minste de ankersecties een ontworpen hoogte of verhouding, en maak één sectie aantoonbaar korter dan de rest (P12).

---

**A3 · DE HALF-HALF-SPLIT**
*Gemeten:* zeven tweedelingen, zes binnen 46/54-52/48 (`vibe-storage.css:21`, `:64`, `:86`, `:152`, `:169`, `:232`).
*Waarom het faalt:* binnen 4 procentpunt van half is een split optisch niet van half-half te onderscheiden. Er ontstaat een middenas die de hele pagina doorloopt, en geen van beide kanten wint.
*Wat in plaats daarvan:* de lichtste kant krijgt maximaal 42% (§3.1). Master v1 meet 31/69 · 34/66 · 39/61 · 42/58 · 42/58.

---

**A4 · MEER DAN TWEE GELIJKE KAARTRASTERS**
*Gemeten:* vijf gelijke rasters, waaronder drie vierdelingen van 246,0 / 255,0 / 252,0px.
*Waarom het faalt:* een gelijk raster zegt "deze items zijn gelijkwaardig". Vijf keer achter elkaar zegt het dat de hele pagina gelijkwaardig is, en dan is er geen ingang.
*Wat in plaats daarvan:* maximaal twee per pagina, nooit twee achter elkaar; daarna dominant beeld, een asymmetrische redactionele compositie of bewuste leegte. Binnen een set krijgt één kaart een eigen graad (§3.9).

---

**A5 · TWEE OPEENVOLGENDE GELIJKVERDELINGEN**
*Gemeten:* 02 → 03 (vier dan drie gelijke kolommen, ΔRGB ca. 2 per kanaal) en 08 → 09 → 10 (zes `dl`-rijen, drie panelen, vier kolommen).
*Waarom het faalt:* tussen twee zulke secties verandert alleen het **aantal**. Een telverschil is geen compositieverschil; er ontstaat geen hiërarchie en de lezer ziet één doorlopend ritme.
*Wat in plaats daarvan:* wissel van familie, niet van kolomaantal. C2 → C5 → C4 wisselt drie keer van compositie met dezelfde inhoudssoort.

---

**A6 · BEELD ALS KOLOMBEWONER**
*Gemeten:* geen enkel beeld breder dan 28,4% van 1774 (503,0 · 486,8 · 3 × 346,7 · 500,0px).
*Waarom het faalt:* een beeld van 28% is een illustratie naast de tekst. Het kan een sectie niet dragen, dus elke sectie valt terug op tekst plus een plaatje, en dat is precies wat "generiek" betekent.
*Wat in plaats daarvan:* ten minste één beeld per pagina ≥ 50% van de viewportbreedte, dat aan één zijde tot de schermrand loopt of door een snede tot vorm wordt gemaakt (§3.2). Master v1 heeft er vijf.

---

**A7 · BEELD ALS KAARTBOVENRAND VOOR HET STERKSTE MATERIAAL**
*Gemeten:* sectie 07 verdeelt het gerealiseerde werk over drie kaarten van 346,7 × 216,7px, `aspect 16/10`, `border-radius:0`, met het label absoluut in de hoek (`vibe-storage.css:132-138`).
*Waarom het faalt:* het beeld is inhoud **van** de kaart geworden in plaats van drager **van** de sectie. Het sterkste materiaal van de pagina krijgt 19,5% schermbreedte per stuk.
*Wat in plaats daarvan:* `C3` — één paneel van 1704 × 565px dat rechts van het scherm afloopt, met de tekst in vier lagen erover. Of `C8`, met kaart en strook op het beeld.

---

**A8 · GELEEND OF HERHAALD BEELD**
*Gemeten:* `assets/microgrids-hero.jpg` (`systeem-energieopslag.html:229`) is het herobeeld van `microgrids.html` en staat ook op `index.html`. `assets/energieopslag-hero.jpg` staat twee keer op dezelfde pagina (`:135` en `:517`), beide rechts in de kolom, beide met `.vibe-cut-tl`.
*Waarom het faalt:* een sectie met een geleend beeld kan compositioneel niets claimen; een pagina die haar eigen herobeeld in de slotsectie herhaalt, eindigt visueel waar zij begon.
*Wat in plaats daarvan:* eigen beeld, of `C6` (gebouwd object met label) of het getekende vlak uit P14. Zolang er geen asset is: `CONTENT PENDING` (`§6.3` van het brandbook), geen plaatshouder en geen gegenereerd beeld. Zie **DR-C-04**.

---

**A9 · ÉÉN KOPGRAAD VOOR ALLE SECTIES**
*Gemeten:* tien `<h2>` op exact 44px (`--fs-h2` clamp maximaal 44px, `vibe-system.css:90`); spreiding factor **1,00**. Master v1: 66,0 tot 53,0px, factor **1,25**, met drie expliciete commentaren die de treden verantwoorden.
*Waarom het faalt:* als elke kop even zwaar is, weegt een bijzin even zwaar als de kernpropositie. In de B2-kandidaat staat "Goed om te weten." (FAQ) op dezelfde graad als "De batterij is de spier. Het EMS is het brein."
*Wat in plaats daarvan:* kopgraad volgt de **rol**, niet de volgorde (P8). De slot-CTA krijgt de grootste H2; de tweede inhoudelijke sectie wordt bewust teruggezet. Zie **DR-C-02** voor de ladder bij tien of meer koppen.

---

**A10 · SLOT DAT DE HERO HERHAALT**
*Gemeten:* vijf punten tegelijk — dezelfde verloopfamilie en starthoek (`168deg` vanaf `#F4F9FE`, `vibe-storage.css:18` en `:229`), dezelfde kolomverdeling (1.02/1 tegen 1.04/1), dezelfde `.vibe-cut-tl` op dezelfde rasterplek, dezelfde primaire knoptekst, letterlijk dezelfde foto.
*Waarom het faalt:* er is geen escalatie. Het laatste moment van de pagina is typografisch en compositioneel niet van het eerste te onderscheiden, dus de pagina eindigt niet — zij houdt op.
*Wat in plaats daarvan:* `C10`. Escaleer in minstens twee van drie: kopgraad, mediaschaal, aantal lagen. Master v1 escaleert in alle drie (66,0px; 934,7px chevronfoto; vijf lagen).

---

**A11 · GEEN ENKELE LAAG**
*Gemeten:* vijf overlappingen op twaalf secties; tien secties met nul. Alle vijf zitten binnen een kaart of binnen een beeldkader (`vibe-storage.css:134`, `:191`, `:246`). Geen element kruist een sectiegrens of een kolomgrens.
*Waarom het faalt:* zonder laagwerk is er geen diepte en geen verband tussen twee vlakken; elke sectie is een gesloten doos. De homepage maakt haar samenhang juist met 48 overlappingen.
*Wat in plaats daarvan:* `position:absolute` binnen een `position:relative`-sectie, `z-index` 0..11, nul negatieve marges op desktop (P1), en elke overlapping verdiend op de uitlijning (P2). Streefwaarde: ten minste de helft van de secties draagt ≥ 1 cross-element-overlapping.

---

**A12 · GEOMETRIE ALS HOEKJE**
*Gemeten:* `.vibe-cut-tl` = `polygon(12% 0, 100% 0, 100% 100%, 0 100%)` (`vibe-system.css:308`) is het **enige** geometrische gebaar op twaalf secties, en het staat twee keer op dezelfde plek in het raster.
*Waarom het faalt:* één afgeschuinde hoek van één rechthoek snijdt niets door. De Vibe-diagonaal is een vorm die twee vlakken scheidt; als hoekje is het een decoratief detail dat evengoed weg kan.
*Wat in plaats daarvan:* geometrie doet werk (§5.4): beeld wegsnijden van een tekstkolom, of de vorm van het beeld zelf zijn. Het commentaar bij de primitieve zegt het al: "Alleen inzetten waar hij een beeldvlak van een tekstvlak scheidt; niet als decoratie per sectie herhalen" (`vibe-system.css:306-307`) — de pagina volgt haar eigen commentaar niet.

---

**A13 · ONZICHTBARE SECTIEOVERGANG**
*Gemeten:* elf grenzen — 4 harde licht/donker-flips, 4 met ΔRGB ≤ 11 per kanaal, 3 kleine stappen, **0 geometrisch**. De hero wordt afgesloten met een haarlijn van 1px over 1240px (`vibe-storage.css:30`).
*Waarom het faalt:* een grens die niets doet, bestaat niet voor de lezer; een grens die alleen een harde kleurflip is, valt uit de compositie omdat geen enkele vorm hem kruist. Beide uitersten op één pagina laten de secties los van elkaar staan.
*Wat in plaats daarvan:* kleuruitdoving naar dezelfde waarde, een gloed met ≥ 100px padding, of een gemeten lege band (P13). Een harde flip wordt gedragen door een vorm die de naad kruist.

---

**A14 · VOORTGANG ZONDER VOORTGANG**
*Gemeten:* `ol.st-steps` met `repeat(4,minmax(0,1fr))` en op elke `li` een identiek `::before` van 38% breedte in `--color-action` (`vibe-storage.css:182-197`).
*Waarom het faalt:* een voortgangsmerkteken dat op stap 4 even lang is als op stap 1, markeert geen voortgang — het is decoratie. En dit is de enige inhoud op de pagina die een richting **heeft**.
*Wat in plaats daarvan:* `C5` — één horizontale rij met chevrons ertussen en een graadval van de H2 tot 14,2px. Als een markering de voortgang toont, verschilt zij per stap; doet zij dat niet, dan vervalt zij.

---

**A15 · DEZELFDE FEITEN IN DRIE NEUTRALE RASTERS**
*Gemeten:* vijf van de zes waarden in het specificatieregister van sectie 08 stonden al in de snapshotband van 02 en/of in de syslist van 04 — telkens in een andere gelijkverdeelde vorm.
*Waarom het faalt:* drie keer dezelfde feiten in drie neutrale rasters geeft de lezer geen nieuw houvast, alleen een derde lijst. De pagina lijkt langer maar wordt niet sterker.
*Wat in plaats daarvan:* één plek per feit. Wat in de opening staat, komt niet terug in het register; wat in het register staat, komt niet terug in de slotsectie. De B2-toetsvraag uit `vibe-page-archetypes-v1.md §4.2` geldt onverkort: welk blok zou op geen enkele andere B2-pagina kunnen staan?

---

**A16 · COMPOSITIONEEL GEWICHT OP DE ZWAKSTE INHOUD**
*Gemeten:* de enige echt asymmetrische kolomverhouding van de pagina (41/59, `vibe-storage.css:204`) valt op de FAQ. De accordeon staat bovendien direct vóór de slot-CTA en bestaat uit zes horizontale lijnen op gelijke afstand — het platste verticale ritme dat een sectie kan hebben, precies waar de pagina zou moeten oplopen.
*Waarom het faalt:* asymmetrie is het duurste middel dat een layout heeft. Wordt zij op de lichtste inhoud ingezet, dan wijst de compositie de lezer naar het verkeerde blok, en de zwaarste inhoud krijgt de neutraalste vorm.
*Wat in plaats daarvan:* het zwaarste compositionele middel valt op de kernpropositie. Een vragenregister staat niet direct vóór de slot-CTA, en als het daar toch moet staan, dan als QUIET met expliciet minder gewicht dan de sectie erna (§6.3).

---

**Twee aanvullende observaties uit dezelfde diagnose, zonder eigen anti-patroonnummer, omdat zij geen compositiefout zijn maar een systeemsignaal:**

- **Twee identieke donkere banden.** De secties 04 en 09 zijn beide `#001632` en delen letterlijk dezelfde vulling en rand (`rgba(255,255,255,.05)` + `rgba(255,255,255,.10)`, `vibe-storage.css:101` en `:175`). Twee even zware ankers in plaats van één klimaks. Zie §3.7.
- **Het systeem draagt meer vormtaal dan de pagina inzet.** Zes primitives zijn 0× gebruikt: `.vibe-cut-bl` (`vibe-system.css:309`), `.vibe-arrow` (`:255-264`), `.vibe-card--dark` (`:230-235`, terwijl `vibe-storage.css:92` het verloop handmatig dupliceert), `.vibe-grid--2` (`:314`), `.vibe-media--scrim` (`:294`), `.vibe-section--light`/`--tight` (`:150`/`:155`). De pagina kiest in elke sectie de neutraalste variant. Dat is geen bibliotheekprobleem; het is de gedragsoorzaak achter A1 tot A16.

---

## §8 · DECISION REQUIRED

Elf punten die **niet** uit Master v1 volgen. Elk punt noemt de meting, de vraag en het gevolg als er niets wordt besloten. Geen van deze punten mag stilzwijgend in een implementatie worden opgelost.

---

**DR-C-01 · Containerbreedte en doorbraakbeleid voor een subpagina**
*Meting:* Master v1 kent **geen** gedeelde containerbreedte. Tekstmarges liggen tussen 70,0 en 105 ref-px; drie inhoudsvlakken breken die marge (1740,0 / 1704,0 / 1584,0px); decoratie loopt volle breedte. De `1240px` van `vibe-system.css:85` volgt níét uit Master v1 en is in het bevroren V1.0 geïntroduceerd. Statisch berekend hoort `.vh-footer-lijn`/`.vh-footer-legal` met **1605,2px** (`home-footer.css:259-282`, `left`/`right` `4,7551cqw` = 84,4px) ook in die reeks; dat vlak staat niet in de overgenomen browser-top-3, en de browsermeting is in deze sessie niet zelf gedraaid, dus de telconventie is niet vast te stellen.
*Vraag:* (a) welke inhoudsvlakken mag een subpagina buiten de 1240px voeren, en tot welke breedte? (b) telt een juridische regel als inhoudsvlak (vier breedteklassen) of als sectiechroom (drie)?
*Gevolg als onbeslist:* elke nieuwe pagina blijft binnen 1240px omdat dat de veiligste keuze is, en A1 herhaalt zich op zeventien B2-pagina's.

---

**DR-C-02 · Koppenladder bij tien of meer sectiekoppen**
*Meting:* Master v1 heeft zeven H2's met een expliciet becommentarieerde ladder van 53,0 tot 66,0px (factor 1,25). De B2-kandidaat heeft er tien, alle op 44px (factor 1,00). Het token `--fs-h2` (`vibe-system.css:90`) kent één waarde.
*Vraag:* krijgt de H2 twee of drie gedefinieerde treden (bijvoorbeeld *slot* / *sectie* / *subsectie*), of blijft het één token met een pagina-eigen uitzondering voor de slotkop?
*Gevolg als onbeslist:* A9 blijft bestaan; de regel "de grootste H2 hoort in de slot-CTA" is niet uitvoerbaar met één token.

---

**DR-C-03 · Compositiefamilie voor een specificatieregister en een vragenregister (C12)**
*Meting:* Master v1 bevat **geen** specificatietabel en **geen** accordeon. Beide secties zijn op de B2-kandidaat zelf bedacht en vallen daardoor terug op het neutrale tweekolomsraster. Het dichtstbijzijnde precedent is P9 (5-6px graadverschil of een gewichtssprong).
*Vraag:* wordt `C12` een vastgestelde familie met eigen anatomie, of blijft het een compositierichtlijn met alleen de ondergrens uit §3.11?
*Gevolg als onbeslist:* elke B2-pagina bedenkt opnieuw een register, en de 2,5px-inversie uit `vibe-storage.css:160-161` wordt zeventien keer gekopieerd.

---

**DR-C-04 · Eigen beeld voor de B2-master**
*Meting:* sectie 04 leent `assets/microgrids-hero.jpg` van `microgrids.html` en `index.html`; sectie 06 heeft helemaal geen productbeeld (`CONTROL PRODUCT ASSET = PENDING`, `systeem-energieopslag.html:275-278`); `assets/energieopslag-hero.jpg` wordt twee keer op dezelfde pagina gebruikt.
*Vraag:* komt er een eigen asset, of wordt de sectie een `C6` (gebouwd object met label) conform P14?
*Gevolg als onbeslist:* `C3` en `C9` zijn op deze pagina niet voorschrijfbaar — beide families vereisen een beeld dat de sectie kan dragen. De pagina valt dan terug op A6 en A8.

---

**DR-C-05 · Eyebrow-tracking: drift of systeem**
*Meting:* negen eyebrows dragen negen verschillende `letter-spacing`-waarden: `.022em` (`home-control.css:207`) · `.045em` (`home-project.css:113`) · `.050em` (`home-process.css:68`) · `.092em` (`home-hero.css:253`) · `.101em` (`home-proof.css:167`) · `.133em` (`home-proof.css:73`) · `.134em` (`home-final.css:142`) · `.137em` (`home-infra.css:46`) · `.175em` (`home-solutions.css:43`). Een spreiding van factor 8. De graad ligt tussen 15,4 en 18,2px. **Mobiel worden ze wél geharmoniseerd op `.14em`** in alle acht sectiebestanden.
*Vraag:* wordt `.14em` ook de desktopwaarde, of krijgt de eyebrow twee gedefinieerde varianten (sectie-eyebrow en blok-eyebrow)?
*Gevolg als onbeslist:* elke nieuwe sectie kiest opnieuw een tracking en de drift zet zich voort. De B2-kandidaat heeft de keuze intussen al gemaakt (11 × 13px met `.14em`), zonder dat dat als besluit is vastgelegd.

---

**DR-C-06 · Is een kaartkolom op beeld (C9) grammatica of eenmalig?**
*Meting:* S7 is de enige sectie met vier kaarten op één beeldvlak (`home-infra.css:209-231`, steek 141,3px). S2 heeft zes kaarten maar in een raster; S4, S6 en S8 hebben er precies één op een beeld.
*Vraag:* mag een archetype dit patroon overnemen, en zo ja met welke bovengrens (vier? de gemeten steek van 141,3px?) en met welke eis aan het verloop eronder?
*Gevolg als onbeslist:* dit is het patroon dat het snelst ontaardt in "kaarten die op een foto zweven". Zonder bovengrens en zonder de uitlijningseis uit P2 komt er een sectie met zes of acht kaarten op beeld. Tot het besluit geldt de gemeten bovengrens van vier als hard.

---

**DR-C-07 · Mag een B-bouwtype een sectie zonder uitgang hebben?**
*Meting:* S4 heeft **nul** `<a>` in de hele sectie; de acht andere secties hebben er tussen 2 en 23. S4 is tegelijk de kortste sectie (453,2px) en draagt het enige leegte-element (`home-process.css:204`).
*Vraag:* is "één sectie zonder uitgang als ademhaling" een regel voor alle bouwtypes, of een homepagevrijheid die op een conversiepagina niet geldt?
*Gevolg als onbeslist:* onduidelijk of `C5` op een B2- of B6-pagina zonder CTA mag staan. Dit raakt de bevroren CTA-policy (`§1A.9`) en mag daar niet mee botsen — daarom is het hier een vraag en geen regel.

---

**DR-C-08 · S6 en S7 hebben dezelfde hoogte en staan achter elkaar**
*Meting:* beide `50cqw` = 887,0px (`home-proof.css:18`, `home-infra.css:17`), direct opeenvolgend. Overal elders wisselt de hoogte; het enige andere paar (S8/S9) rijmt aantoonbaar bewust (gedeeld canvas, gedeelde vormfamilie, gedeeld commentaar). Bij S6/S7 staat **geen** commentaar.
*Vraag:* is die gelijke hoogte een besluit (twee zware blokken van gelijk gewicht) of een gevolg van het gedeelde 1774 × 887-referentiecanvas?
*Gevolg als onbeslist:* P12 kan niet als harde regel worden geschreven ("nooit twee gelijke hoogtes achter elkaar") zolang deze twee er staan. §6.2 formuleert het daarom als observatie met een open punt.

---

**DR-C-09 · Zeven dode regelblokken: verwijderen of als DEFERRED bewaren?**
*Meting:* zeven regelblokken hebben nul treffers in `index.html`: `.vh-infra-kpi` (`home-infra.css:282-328`) · `.vh-infra-note` (`:185-204`) · `.vh-final-note` (`home-final.css:106-125`) · `.vh-sol-stats` (`home-solutions.css:253-286`) · `.vh-proof-quote` (`home-proof.css:263-269`) · `.vh-zoek` (`home-hero.css:193-202`) · `.vh-footer-wig-ongebruikt` (`home-footer.css:373-381`). Drie daarvan beschrijven de handgeschreven notitie uit de referentie die op S7 en S8 bewust is weggelaten. `vibe-component-library-v1.md §6` heeft hier al een paragraaf voor; deze telling bevestigt die en is additief.
*Vraag:* worden deze blokken in V1.1 als niet-bestaand behandeld, of blijven ze staan als vastgelegde variant voor een latere sectie?
*Gevolg als onbeslist:* een volgende bouwer leest `.vh-infra-kpi` als een bestaand component en bouwt een KPI-balk die op de homepage nooit heeft bestaan. **Dit is een READ-ONLY vaststelling: er is niets gewijzigd.**

---

**DR-C-10 · `cqw` of `clamp()` voor een compositiefamilie**
*Meting:* alle twaalf families in §4 zijn afgeleid uit secties die in `cqw` rekenen, met vijf verschillende referentiecanvassen en `container-type:inline-size` op negen wortels. `§1A.6` punt 2 en 3 stellen daarentegen vast dat `clamp()` de default is, dat `cqw` uitsluitend voor bewust canvas-proportionele composities geldt, en dat **nieuw werk de cqw-erfenis niet overneemt**. De B2-kandidaat volgt die regel: nul `cqw`, alles `clamp()`.
*Vraag:* zijn `C1`, `C3`, `C8` en `C10` "bewust canvas-proportioneel" — en mogen zij dus `cqw` gebruiken — of moeten ook die families in `clamp()` worden gebouwd, met het verlies aan proportionele precisie dat dat oplevert?
*Gevolg als onbeslist:* de vier zwaarste families zijn niet implementeerbaar zonder dat de bouwer zelf een eenheidsbesluit neemt. Dat besluit raakt bovendien het gemeten `cqw`-vangnetgat: dertien `box-shadow`-declaraties in `cqw` waarvan er elf onder 1200px niet worden overschreven (`vibe-web-brandbook-v1.md §5.3`).

---

**DR-C-11 · Hoeveel HIGH IMPACT-secties mag een pagina van twaalf secties hebben?**
*Meting:* Master v1 heeft negen secties en drie ankerrollen (S1, S3, S8) — een verhouding van 1 : 3. De bevroren regel (`§4.1.5`) zegt "een pagina heeft er hooguit drie van", zonder de paginalengte te noemen. Een B2-pagina heeft er tien tot twaalf.
*Vraag:* blijft drie het absolute maximum ongeacht de paginalengte (zoals §5.9 grens 1 en §6.4 voorstellen), of schaalt het mee?
*Gevolg als onbeslist:* §5.9 grens 1 en het verbod op `HIGH · HIGH · HIGH · HIGH` in §6.4 zijn als aanscherping geformuleerd, niet als afgeleid besluit. Ze zijn daarmee de enige twee plekken waar V1.1 verder gaat dan wat Master v1 letterlijk aantoont, en dat is hier expliciet gemarkeerd in plaats van verborgen.

---

---

## §9 · Het compositieplan voor `systeem-energieopslag.html`

Toepassing van dit systeem op de bestaande B2-reviewkandidaat. **Dit is papier: er is in deze ronde geen regel productiecode gewijzigd.** De inhoudsarchitectuur blijft staan — twaalf secties, dezelfde onderwerpen, dezelfde geverifieerde claims. Wat verandert is de compositie.

### 9.1 De gemeten aanleiding, per sectie

Op 1774 px, na volledige scroll:

| | Master v1 | B2-kandidaat |
|---|---|---|
| Kopgraad per sectie | 76 · 61 · 58 · 64 · 54 · 53 · 61 · 66 px | 62, daarna **tienmaal exact 44 px** |
| Breedste inhoudsvlak | 1774 in 7 van 9 secties | 1774 alleen in de hero, daarna **elfmaal exact 1240 px** |
| Overlappende elementen | 6 · 6 · 2 · 0 · 3 · 6 · 5 · 5 · 8 | **0 in tien van de twaalf secties** |

Drie generieke patronen verklaren het beeld: **vier gelijke kaartrasters** (03, 05, 07, 10), **vier 50/50-splitsingen** (04, 06, 09, 12) en **elf identieke containerbreedtes**. Dat is `A1`, `A4` en `A6` uit §7, alle drie tegelijk.

### 9.2 Plan per sectie

Niveau volgens §6.3, patroon B2/SYSTEM: drie HIGH, de rest MEDIUM of QUIET.

---

**01 · HERO** — HIGH · `C1 Openingspodium`

- **Huidige compositie** — tweekoloms 1.02/1 binnen een container van 1240 px; foto als afgeronde rechthoek met één diagonaal; nul overlap.
- **Probleem** — de enige sectie die de container doorbreekt is deze, en zelfs hier raakt het beeld de schermrand niet. Het beeld staat *náást* de tekst in plaats van eronder door te lopen. Geen enkel element kruist een grens, dus de pagina opent vlak.
- **Nieuwe compositie** — beeldvlak loopt door tot de rechter schermrand (1774), tekstvlak legt zich eroverheen met een negatieve marge, de Vibe-diagonaal scheidt beide. De snapshotband kruist de onderrand van het beeld in plaats van eronder te beginnen.
- **Echt asset** — `assets/energieopslag-hero.jpg` (2400×1802, STRONG: eigen BESS-kasten met logo).
- **Inhoudshiërarchie** — eyebrow → H1 → lead → twee CTA's → snapshot.
- **Desktop** — beeld 58% breed tot de rand, tekstplaat 46% met `z-index` erover; kopgraad ≥ 62 px.
- **Tablet** — beeld onder de tekst, volle breedte tot de rand, diagonaal vervalt (§5.9).
- **Mobiel** — beeld 16:9 tussen lead en snapshot; snapshot in één kolom.
- **Waarom dit meer Vibe is** — het herstelt het enige principe dat Master v1 in acht van de negen secties toepast en deze pagina in tien van de twaalf mist: lagen in plaats van stapelen.

---

**02 · SNAPSHOT** — QUIET · `C7 Bewijsband`

- **Huidige compositie** — vier gelijke metrieken op een halftransparante band.
- **Probleem** — leest als een voettekst van de hero, niet als bewijs. Alle vier de items hebben hetzelfde gewicht terwijl drie productspecificatie zijn en één een propositie.
- **Nieuwe compositie** — band blijft, maar wordt visueel aan de heronaad gekoppeld en scheidt de drie specificaties typografisch van de propositie.
- **Echt asset** — geen.
- **Desktop / tablet / mobiel** — 4 → 2 → 1 kolom, ongewijzigd.
- **Waarom** — QUIET hoort QUIET te blijven; de winst zit in de koppeling, niet in meer nadruk.

---

**03 · HET PROBLEEM** — MEDIUM · `C2 Ongelijk kaartmozaïek`

- **Huidige compositie** — drie gelijke kaarten van gelijke breedte en hoogte.
- **Probleem** — `A1`. Het eerste van vier identieke rasters. Geen van de drie problemen is belangrijker dan de andere, terwijl de knellende aansluiting het hele verhaal draagt.
- **Nieuwe compositie** — één dominante kaart (de aansluiting) over twee kolomeenheden, twee kleinere ernaast.
- **Echt asset** — geen; dit blijft tekst.
- **Desktop** — 2fr/1fr/1fr. **Tablet** — dominante kaart volle breedte, twee eronder. **Mobiel** — één kolom, dominante kaart eerst.
- **Waarom** — Master v1 doet dit in S2: de zonkaart is groter dan de vijf andere. Ongelijke kaarten dragen hiërarchie; gelijke kaarten dragen niets.

---

**04 · HET SYSTEEM** — MEDIUM · `C4 Redactionele splitsing met gedeelde rand`

- **Huidige compositie** — 50/50 met foto in een afgeronde rechthoek.
- **Probleem** — `A6`, de eerste van vier 50/50's. De foto is inhoud *in* een kaart, geen compositiedrager.
- **Nieuwe compositie** — beeld loopt tot de linker schermrand door; de viergedeelde systeemlijst legt zich met een negatieve marge over de beeldrand.
- **Echt asset** — `assets/microgrids-hero.jpg` (USABLE, tweede BESS-opstelling).
- **Desktop** — beeld 52% tot de rand, lijst 44% eroverheen. **Tablet** — beeld boven, lijst onder, beeld tot de rand. **Mobiel** — beeld 16:9, lijst eronder.
- **Waarom** — S3 en S6 van Master v1 laten beeld de sectierand raken; niets op deze pagina doet dat.

---

**05 · WAT DE BATTERIJ DOET** — MEDIUM · opgaan in `C4`

- **Huidige compositie** — vier gelijke kaarten met icoontegel.
- **Probleem** — `A1` én `A3`: generieke SaaS-icoonkaarten, en het tweede gelijke raster binnen twee secties.
- **Nieuwe compositie** — geen eigen sectie meer. De vier taken worden de rechterkolom van sectie 04, als genummerde regels naast het systeembeeld. Dat verwijdert één raster én maakt de relatie expliciet: dít levert Vibe, en dít doet het.
- **Waarom** — §3.9 staat maximaal twee gelijke rasters op een pagina toe; deze pagina had er vier.

---

**06 · VIBE.CONTROL** — MEDIUM · `C6 Gebouwd object`

- **Huidige compositie** — 50/50, schema als donkere kaart rechts.
- **Probleem** — de tweede 50/50. Het schema is het meest onderscheidende element van de pagina maar krijgt precies dezelfde ruimte als elke andere sectie.
- **Nieuwe compositie** — het schema wordt het dominante object: breder dan de container, met de tekst ernaast in een smallere kolom. Geen dashboard, geen realtime-waarden — het bijschrift "schematische weergave" blijft verplicht.
- **Echt asset** — geen. **`CONTROL PRODUCT ASSET = PENDING`** blijft staan.
- **Desktop** — object 58%, tekst 36%, object tot 1560 px. **Tablet** — object boven, tekst onder. **Mobiel** — bronnen/hub/verbruikers gestapeld.
- **Waarom** — S5 van Master v1 laat het dashboard links uit de container lopen; dat is wat het product onderscheidend maakt.

---

**07 · PROJECTBEWIJS** — **HIGH** · `C3 Uitgelicht paneel`

- **Huidige compositie** — drie gelijke casekaarten.
- **Probleem** — `A1`, derde raster. Het sterkste bewijs van de pagina — Ratio 16, met vier geverifieerde cijfers — krijgt hetzelfde gewicht als de twee andere.
- **Nieuwe compositie** — Ratio 16 als volvlaks paneel met de foto tot beide randen, cijfers als kaart die over de beeldrand valt; Hedin Alkmaar en Amsterdam als compacte rij eronder.
- **Echt asset** — `assets/projects/ratio-16.jpg` (STRONG), `hedin-alkmaar.jpg`, `hedin-amsterdam.jpg`.
- **Desktop** — paneel 1774 breed, cijferkaart met negatieve marge. **Tablet** — paneel volle breedte, cijfers eronder. **Mobiel** — foto, cijfers, dan twee compacte kaarten.
- **Waarom** — dit is het `C3`-patroon van S3 én de kaart-over-beeld van S6. Bewijs hoort de tweede HIGH van de pagina te zijn.

---

**08 · TECHNIEK** — QUIET · `C12 Register` · ongewijzigd

Specificatielijst naast redactionele kolom. Dit is voor de SYSTEM-variant de **verplichte** proofregel (§6.3). Blijft bewust stil.

---

**09 · EXPLOITATIEMODEL** — MEDIUM · `C4`, donkere variant

- **Probleem** — derde 50/50, en het enige donkere vlak na sectie 04 staat direct naast twee andere donkere secties in de huidige opzet.
- **Nieuwe compositie** — asymmetrisch 58/38 met de drie routes als verspringende kaarten in plaats van een gelijke kolom.
- **Waarom** — §3.7: donker is een accent dat impact verliest zodra het het derde donkere vlak op rij is.

---

**10 · IMPLEMENTATIE** — QUIET · `C5 Voortgangsrij`

- **Probleem** — vierde gelijke raster; vier losse kaarten tonen geen volgorde.
- **Nieuwe compositie** — horizontale voortgangsrij met doorlopende lijn en verspringende hoogtes, zoals S4 van Master v1.
- **Mobiel** — verticale tijdlijn.

---

**11 · FAQ** — QUIET · `C12 Register` · ongewijzigd

---

**12 · FINAL CTA** — **HIGH** · `C10 Slotcompositie`

- **Probleem** — vierde 50/50; de pagina eindigt in dezelfde compositie waarin hij elke andere sectie voerde.
- **Nieuwe compositie** — beeld tot de rechter schermrand met blauw wigvlak, CTA-module zwevend over de beeldrand, bewijsregels eronder.
- **Echt asset** — `assets/energieopslag-hero.jpg`, andere uitsnede dan de hero.
- **Waarom** — S8 van Master v1; de derde en laatste HIGH.

### 9.3 Het resultaat als ritme

```
01 HIGH · 02 QUIET · 03 MEDIUM · 04 MEDIUM · 06 MEDIUM
07 HIGH · 08 QUIET · 09 MEDIUM · 10 QUIET · 11 QUIET · 12 HIGH
```

Elf secties in plaats van twaalf (05 gaat op in 04), drie HIGH op de voorgeschreven posities, geen twee HIGH naast elkaar, en **nul** opeenvolgende gelijke kaartrasters. Kopgraad varieert dan van 44 px (QUIET) tot ≥ 62 px (HIGH) in plaats van tienmaal 44.

---

## §10 · Herbruikbaarheidstoets

De toets uit stap 9: zijn de families breed genoeg dat andere pagina's ze kunnen gebruiken zonder klonen te worden, en smal genoeg dat ze niet elke pagina maatwerk laten blijven? **Geen van deze pagina's is herontworpen; dit is uitsluitend een toets op papier.**

| Pagina | Bouwtype | Voorgestelde reeks | Waarin het verschilt van de B2-master |
|---|---|---|---|
| `systeem-zonnepanelen.html` | B2/SYSTEM | C1 · C7 · C2 · C4 · C5 · C12 · C10 | **Geen `C3`**: er is geen zonproject met een eigen case op deze site. Twee HIGH in plaats van drie; `C2` draagt de opbrengstlogica in plaats van drie pijnpunten. |
| `systeem-laadpalen.html` | B2/SYSTEM | C1 · C7 · C2 · C9 · C4 · C3 · C12 · C10 | `C9` draagt de laadscenario's als kaartkolom op beeld; `C3` gebruikt Hedin Amsterdam (20 laadplekken binnen 215 kW) — een ánder project dan de opslagmaster. |
| `systeem-ems.html` | B2/SYSTEM | C1 · C6 · C4 · C5 · C12 · C10 | **`C6` wordt de tweede sectie en de HIGH**: op de EMS-pagina ís het gebouwde object het onderwerp, niet een bewijslaag. Omgekeerde gewichtsverdeling ten opzichte van de opslagmaster. |
| `oplossing-exploitatie.html` | B2/SOLUTION | C1 · C4 · C2 · C3 · C12 · C10 | `C3` is **verplicht** (proofregel SOLUTION) en gebruikt de 14-locatiecase; geen `C6`, want er is geen gebouwd object — het onderwerp is een model. |
| `industrie-recreatie.html` | B2/SECTOR | C1 · C2 · C9 · C3 · C12 · C10 | `C3` mag alleen Dormio Medemblik tonen, want dat is de enige case *in deze sector*; `C9` draagt de zes sectoruitdagingen. |
| `project-ratio-16.html` | B3/case | C1 · C7 · C8 · C4 · C12 · C10 | Ander ritme (§6.3 B3): `C8` draagt het verhaal, `C7` de vier geverifieerde cijfers direct onder de opening. `C2` komt niet voor — een case heeft geen kaartraster nodig. |

**Uitkomst.** Zes pagina's, zes verschillende reeksen, en geen enkele gebruikt dezelfde combinatie als de opslagmaster. De families die op élke pagina terugkomen zijn `C1`, `C12` en `C10` — opening, register en slot — precies de drie die structureel horen te rijmen. De onderscheidende families (`C3`, `C6`, `C8`, `C9`) verschijnen alleen waar het onderwerp of het bewijs ze rechtvaardigt.

Twee grenzen die de toets blootlegt:

1. **Zonder case geen `C3`.** Drie van de zes pagina's hebben geen eigen projectbewijs. Die pagina's krijgen twee HIGH in plaats van drie. Dat is een uitkomst van de claim policy, geen compositiekeuze — en het is beter dan een gesuggereerde case.
2. **`C6` is schaars.** Alleen systemen met een gebouwd of gestuurd object verdienen hem. Bij meer dan één `C6` op een pagina, of `C6` op een pagina zonder object, is het decoratie.

## Verantwoording

**Wat in deze sessie zelf is gemeten (statisch, uit de broncode):**
- De clip-path-telling: 20 declaraties in de tien `home-*.css`, waarvan 5 × `none`, 2 mobiele driehoeken en 2 op pseudo-elementen → 11 DOM-dragers, gelijk aan de overgenomen browsermeting.
- De drie breedtes 1740,0 / 1704,0 / 1584,0px, nagerekend uit `home-hero.css:337`, `home-project.css:49` en `home-process.css:155`.
- Alle polygonen, hellingen, radii, kleurwaarden en regelnummers in §2, §4 en §5, elk tegen het bronbestand gecontroleerd.
- De vier load-bearing commentaren, woordelijk gecontroleerd: `home-final.css:148`, `home-process.css:75`, `home-proof.css:173`, `home-infra.css:158-172`.
- De B2-waarden in §3 en §7, gecontroleerd tegen `vibe-system.css` en `vibe-storage.css` in de werkboom.

**Wat is overgenomen en niet zelf opnieuw gedraaid:**
- De browsermeting op 1774px na volledige scroll (5 / 48 overlappingen, 2 / 11 clip-paths, 1240-1080-716 / 1740-1704-1584, 15 / 25 volle-breedte vlakken) en de per-sectie-verdelingen. Overgenomen uit de opdracht en uit `art-directie.json` / `b2-diagnose.json`; statisch gecorroboreerd waar dat kon, zie hierboven.

**Wat NIET is gedraaid:**
- Er is in deze sessie **geen browser gestart** en geen enkele meting opnieuw in een viewport uitgevoerd. De telconventie achter de browsermeting is daardoor niet vast te stellen — dat is precies wat DR-C-01 (b) openhoudt.
- Er is **geen productiecode gewijzigd, gelint, gebouwd of getest**. Dit document is de enige wijziging in de werkboom.
