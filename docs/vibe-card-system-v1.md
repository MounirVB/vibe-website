> **STATUS V1.3 — BEWIJSBIJLAGE, NIET NORMATIEF.**
> Dit document is V1.2. Zijn forensische metingen blijven geldig als BEWIJS; zijn regels en
> poorten zijn **niet aanvaard** en zijn vervangen door `docs/04-visual-language-v1.3.md`.
> Zie `docs/00-changelog.md` §3 voor de reden en §4 voor de twee intrekkingen.

# Vibe kaartsysteem V1 — de acht kaartfamilies en hun compositieregels

Onderdeel van **Vibe Web Design System V1.2 — visuele taal**. Dit document beschrijft wat de
Homepage Master v1 met kaartvlakken DOET, gemeten, en leidt daar regels uit af.
**Het wijzigt niets.** Voorstellen staan hier als voorstel, niet als wijziging.

| | |
|---|---|
| Bron van waarheid | Homepage Master v1, commit `aae26bf`. `git diff aae26bf -- index.html 'home*.css'` is in deze sessie gedraaid en leeg: de werkboom is byte-identiek. |
| Tegenhanger | `systeem-energieopslag.html` (B2-kandidaat), zelfde server, zelfde breedtes. |
| Meetbreedte | 1774px primair, 1440px als controle op proportionele invariantie. |
| Server | `http://127.0.0.1:8033/index.html` en `.../systeem-energieopslag.html` |
| Eigen meetharnassen (deze sessie) | `kaarten.mjs` → `kaarten-home-1774.txt`, `kaarten-home-1440.txt` · `raster2.mjs` → `raster2-1774.txt` · `variatie.mjs` → `variatie.txt` · `grond.mjs` → `grond-1774.txt` · `hover.mjs` |
| Aangeleverd bewijs | `home-forensics.json`, `b2-forensics.json`, `home-1774-1440-1199.txt`, `kerndelta.txt`, `forensics-homepage.md`, `shots/home/*.png` (acht sectieafdrukken bekeken) |

Alle harnassen staan in
`/private/tmp/claude-501/-Users-mounirvanbinsbergen/558a3754-0b2a-4c28-9b1b-65c98bf67823/scratchpad/v12/`.

**Elke regel hieronder is toetsbaar:** een getal, een verhouding, een telling of een waarneembaar
ja/nee, met een meetwaarde of een `bestand:regel` erachter. Waar iets niet te meten was staat
**NIET GEMETEN** met de reden.

---

## 0. Definitie en telling

### 0.1 Wat in dit document een KAARTVLAK heet

Een element telt als kaartvlak als het **alle** van het volgende waar maakt (`raster2.mjs`):

1. eigen oppervlak dat afwijkt van dat van de ouder, **of** een rand, **of** een schaduw;
2. én minstens één van: schaduw, rand, of een grond met luminantie < 140 (donker vlak);
3. breedte ≥ 150px en hoogte ≥ 70px;
4. eigen tekst of een eigen beeld erin;
5. geen sectie-achtergrond (uitgesloten: breder dan 90% vw én hoger dan 55% van de sectie).

Met die definitie, gemeten op 1774px:

| | Homepage Master v1 | B2-kandidaat |
|---|---|---|
| kaartvlakken op de pagina | **18** | **19** |
| secties | 9 | 11 |
| kaartvlakken per sectie | 0 · 6 · 0 · 1 · 2 · 4 · 4 · 1 · 0 — **mediaan 1, drie secties met nul** | 1 · 0 · 3 · 4 · 1 · 3 · 2 · 3 · 0 · 1 · 1 — mediaan 1 |
| kaartvlakken die ≥50% op een beeld liggen | **12 van 18 (66,7%)** | **1 van 19 (5,3%)** |

De familie-telling ligt hoger dan de vlak-telling, omdat **K7** en **K8** bewust géén vlak hebben
(gemeten: `background: rgba(0,0,0,0)`, radius 0, schaduw geen — in alle 8 gemeten K7-elementen
(2 banden + 6 cellen) en alle 17 K8-regels):

| familie | aantal | secties |
|---|---|---|
| K1 MEDIAKAART | 6 | 02 |
| K2 ZWEVEND INFOVLAK | 3 | 04 · 06 · 08 |
| K3 STROOK | 1 | 06 |
| K4 REGISTERKAART | 4 | 07 |
| K5 LOGOKAART | 2 | 06 |
| K6 APPARAATVLAK | 2 | 05 |
| K7 BEWIJSBAND | 2 banden (3 + 3 cellen) | 01 · 03 |
| K8 ICOONREGEL | 17 regels in 5 rijen | 02 · 04 · 05 · 07 · 08 |

> **Afwijking van de vaste taxonomie, gemeten.** De taxonomie noemt K2 in S4, S6, **S7** en S8.
> In sectie 07 staat gemeten géén K2: het enige witte zwevende vlak daar is **K4 REGISTERKAART**
> (4 × 422×126, `home-infra.css:209-231`). Ik reken S7 daarom volledig bij K4 en noteer de
> afwijking hier in plaats van hem weg te schrijven.

### 0.2 Kaartfamilies per sectie — de belangrijkste telling van dit document

| sectie | families mét vlak | families zónder vlak |
|---|---|---|
| 01 Hero | — | K7 |
| 02 Oplossingen | K1 (×6) | K8 (×3) |
| 03 Project | — | K7 |
| 04 Aanpak | K2 (×1) | K8 (×4) |
| 05 VIBE.CONTROL | K6 (×2) | K8 (×4) |
| 06 Projectresultaat | **K5 (×2) · K2 (×1) · K3 (×1)** | — |
| 07 Infrastructuur | K4 (×4) | K8 (×3) |
| 08 Final CTA | K2 (×1) | K8 (×3) |
| 09 Footer | — | — |

**In 8 van de 9 secties staat hoogstens ÉÉN kaartfamilie met een eigen vlak.** Sectie 06 is de
enige uitzondering met drie — en die drie verschillen dan ook in élke eigenschap:
wit-met-rand-zonder-schaduw 289×81 · wit-zonder-rand-met-dubbele-schaduw 448×374 ·
donker-zonder-rand-zonder-schaduw 629×124.

---

## 1. Waarom één generieke `.vibe-card` dit niet dekt

De generieke kaart bestaat al in deze repo: `vibe-system.css:238-254`. Hij levert één radius
(`--radius-card:14px`, `vibe-system.css:69`), één padding (`clamp(20px,2vw,30px)` = **30px rondom**
op elke breedte boven 1500px), twee schaduwtokens (`--elev-1`, `--elev-2`, `vibe-system.css:75-76`,
beide in vaste px) en vier varianten (`--light`, `--dark`, `--media`, `--outline`).
`index.html` laadt dat bestand niet (`index.html:56-67`: `tokens.css` + elf `home*.css`, gemeten
12 `<link rel="stylesheet">`), de B2-kandidaat wel.

Gemeten op dezelfde 18 respectievelijk 19 kaartvlakken (`variatie.txt`):

| gemeten eigenschap | Homepage Master v1 | B2-kandidaat (`.vibe-card`) |
|---|---|---|
| unieke radiuswaarden | **8**: 10 · 11,7 · 13 · 13,5 · 14 · 16 · 18,7 · 20 | **2**: 0 · 14 |
| radius bij 1440px | **alle acht geschaald met 0,8117**: 8,12 · 9,50 · 10,55 · 10,96 · 11,36 · 12,99 · 15,18 · 16,23 (`kaarten-home-1440.txt`) | **onveranderd 0 en 14** |
| unieke schaduwrecepten | **7 + 1× geen** | **3 + 1× geen** |
| unieke schaduwinkten | **5**: `rgba(23,84,150)` · `(12,38,72)` · `(26,86,156)` · `(16,58,110)` · `(9,38,78)` | 2: `(12,38,72)` · wit-inset |
| unieke randbehandelingen | **4**: geen · 1px `rgba(16,28,58,.12)` · 1px `rgba(120,175,240,.20)` · **2px `#16202F`** | 4: geen · 1px wit .14 · 1px wit .12 · 1px `rgba(16,28,58,.12)` |
| unieke gronden | **6**: doorzichtig · `#FFFFFF` · `#FCFDFE` · `#01234C` · `#011731` · `#050E1B` | 4: `#FFFFFF` · doorzichtig · `#04122A` · wit 5,5% |
| unieke paddingcombinaties | **6**, waarvan **0** met vier gelijke zijden > 0 | 9, waarvan **30/30/30/30** en **16/16/16/16** |
| kaartvlak ≥50% op een beeld | **12 van 18** | **1 van 19** |
| aandeel van de viewport, 1774 → 1440 | **invariant over 15 vergelijkbare kaarten**: 27,45→27,45 · 19,03→19,03 · 25,25→25,25 · 35,46→35,46 · 23,79→23,78 · 17,16→17,17 — **maximale drift 0,03 procentpunt** | **loopt op over 18 vergelijkbare kaarten**: 72,15→90,80 · 24,74→31,35 · 36,30→46,31 · 33,82→41,67 · 35,51→44,71 · 30,40→38,91 — **mediane drift +8,2 procentpunt, maximaal +18,65** |

**Vier dingen die één generieke kaart structureel niet kan.**

1. **Radius is hier geen waarde maar een percentage.** Alle acht gemeten kaartradii schalen exact
   met de viewport (factor 0,8117 van 1774 naar 1440, gelijk aan 1440/1774).
   Een token van `14px` staat per definitie stil en wordt op 1440px 1,23× te groot ten opzichte van
   de rest van de compositie. Toets: meet een radius op twee breedtes; verandert hij niet mee, dan
   is het niet deze taal.
2. **Padding is hier asymmetrisch en per familie anders.** Gemeten paddings van de drie K2-vlakken:
   21,3/23,1/30,5/32,7 · 38,0/32,0/35,0/42,0 · 25,3/26,0/31,7/32,1. In alle drie is de linkerpadding
   groter dan de rechter (factor 1,42 · 1,31 · 1,23). Nul van de zes gemeten paddingcombinaties op
   de master heeft vier gelijke zijden groter dan nul; de generieke kaart heeft er maar één vorm:
   30/30/30/30.
3. **De schaduw is hier een functie van wat eronder ligt, niet van een niveau.** Gemeten
   achtergrondluminantie onder elk kaartvlak (`grond-1774.txt`) loopt van 0,048 tot 0,981 — een
   factor 20. Eén `--elev-1` kan dat bereik niet bedienen; de master gebruikt zeven recepten in vijf
   verschillende inkten.
4. **Het oppervlak is hier vaak géén oppervlak.** K1 heeft `background: rgba(0,0,0,0)` en laat een
   foto met `inset:0` het vlak vullen (`home-solutions.css:155-163`); K7 en K8 hebben helemaal geen
   vlak. Een kaartcomponent die altijd een grond tekent, kan drie van de acht families niet maken.

---

## 2. De acht families

Maten, kleuren en typografie hieronder zijn **gerenderd gemeten op 1774px** tenzij anders vermeld;
de `bestand:regel`-verwijzing geeft aan waar het gedeclareerd staat.

### K1 MEDIAKAART — `.vh-sol-mod`, sectie 02, 6 stuks

| | |
|---|---|
| **Maten / verhoudingen** | bovenrij 487×498 (0,98) · 302×498 (0,61) · 292×498 (0,59); onderrij 371×230 (1,61) · 353×230 (1,53) · 355×230 (1,54). Aandeel vw: 27,45 · 17,02 · 16,46 · 20,91 · 19,90 · 20,01%. Bovenrij is **2,17× hoger** dan de onderrij; breedteverhouding bovenrij max/min = **1,668**, onderrij **1,051**. Kolomgat 26px, rijgat 23px (`home-solutions.css:130-131`). |
| **Radius** | 10,00 px = `var(--sol-radius)` = `.5637cqw` (`home-solutions.css:23, 149`); 8,12 px op 1440. Gelijk op alle zes. |
| **Oppervlak** | gemeten `rgba(0,0,0,0)` — **de kaart heeft geen eigen grond**. De foto vult hem met `inset:0; object-fit:cover; z-index:0` (`home-solutions.css:155-163`), daarboven een leesbaarheidsverloop op `z1` (`:164-198`) met per rij een andere stopverdeling: bovenrij dicht aan de **bovenkant** (.92 → 0 op 72%), onderrij dicht aan de **onderkant** (.62 → .90 op 46%). `overflow: hidden` snijdt de foto op de kaartradius. |
| **Rand** | geen (0,00px, alle zes). |
| **Schaduw** | `rgba(23,84,150,.10) 0 9,93 25,90 0` (`home-solutions.css:152`). **Eén laag, geen spread, laagste alfa van de pagina (.10)** — de enige kaartfamilie met een enkellaagse schaduw. Gemeten ondergrond: egaal `#FCFDFE`, spreiding 1,00:1 (`grond-1774.txt`). |
| **Padding** | kaart 0/0/0/0; de inhoud zit in `.vh-sol-mod-inhoud` met 31,0 boven / 33,0 zijkant (`home-solutions.css:206`). |
| **Icoon** | kaal wit SVG van 40px, 44px op de dominante kaart (`:208, :241`) — **geen tintvlak**. Daarnaast een ronde witte pijlknop, radius 50%, 38 / 39 / 46px, grond `#FFF`, kleur `#0073FE` (`:226-236, :244-249, :293-300`). |
| **Typografie** | kop 18,4 / lh 23,9 / 700 / ls −0,004em wit; dominante kaart 26,6 / lh 34,6 (factor **1,45**). Body 16,5 / lh 24 in `rgba(255,255,255,.90)`; dominante kaart 19 / lh 27. Alleen de dominante kaart draagt een statistiekbalk van drie cellen met 1px lijnen `rgba(255,255,255,.28)` (`:253-269`). |
| **Beeld** | verplicht en integraal: het beeld is het oppervlak. 5 van 6 dragen een foto, de zesde (HVAC) een gebouwd grafisch vlak van 289×285 met een 25°-snede omdat de fotografie ontbreekt (`home-solutions.css:303-320`). |
| **CTA** | de hele kaart is een `<a>`; zichtbare CTA is de ronde pijl — bovenrij rechtsboven, onderrij rechtsonder (`:293-300`). |
| **Hover** | gedeclareerd: `transform: translateX(.22cqw)` op de pijl = 3,9px (`home-solutions.css:238`). **Render NIET GEMETEN** — zie §6. |
| **Overlap** | beeld ∩ kaart = 100% (het beeld zit ín de kaart). De kaart zelf steekt 0px buiten zijn rastercel. |
| **Geschikte context** | een rij van 3 tot 6 aanbod-items waarvan er één dominant moet zijn, elk met een eigen foto. |
| **VERBODEN context** | zonder foto per item (de hele behandeling is een tekstvlak op een beeldverloop); in een rij waarin alle kaarten even breed zijn; op een donkere sectiegrond (de .10-schaduw is gemeten tegen `#FCFDFE` en verdwijnt op donker); met meer dan twee tekstregels body (gemeten 48px = 2 regels, 54px = 2 regels op de dominante kaart). |

### K2 ZWEVEND INFOVLAK — `.vh-proc-kaart` · `.vh-proof-kaart` · `.vh-final-kaart`, secties 04 · 06 · 08

| | S04 | S06 | S08 |
|---|---|---|---|
| **Maat** | 337,6×253,7 (1,33) · 19,03% vw | 448×374 (1,20) · 25,25% vw | 304,5×272,5 (1,12) · 17,16% vw |
| **Radius** | 11,70 (`.6595cqw`, `home-process.css:120`) | 16,00 (`.9019cqw`, `home-proof.css:247`) | 13,50 (`.7608cqw`, `home-final.css:269`) |
| **Oppervlak** | `#FFFFFF` | `#FCFDFE` | `#FFFFFF` |
| **Rand** | geen | geen | geen |
| **Schaduw** | `rgba(12,38,72,.06) 0 3,19 7,98` + `rgba(12,38,72,.22) 0 26,61 56,77 −19,51` | `rgba(26,86,156,.22) 0 23,95 47,90 −19,51` + `.14 0 4,97 12,06 −6,03` | `rgba(9,38,78,.30) 0 21,29 46,12 −17,74` + `.18 0 4,26 11,00 −5,32` |
| **Padding** | 21,3 / 23,1 / 30,5 / 32,7 | 38,0 / 32,0 / 35,0 / 42,0 | 25,3 / 26,0 / 31,7 / 32,1 |
| **Icoon** | vierkant tintvlak 35,1px, radius 7,10, grond `#DFEEFE` | géén tintvlak; blauw citaatteken 38×28 (`home-proof.css:263-269`) | **ronde, vol blauwe schijf 57,4px**, radius 50%, grond `#0073FE`, wit glyph — enige op de pagina |
| **Typografie** | h3 19,9 / lh 25,7 / 700 / −0,004em `#08203C`; p 15,3 / lh 21 / 400 `#6F7A95` | badge 13 / 700 / ls **0,160em** `#0073FE`; citaat 20 / lh 26,5 / 400 `#16243F`; dl 21/700 blauw + 14/400 `#7C88A2` | b 21 / lh 24 / 700 `#0C1424`; p 16,4 / lh 22 / 400 `#4A5578`; link 16,3 / 600 `#0073FE` |
| **Overlap met het beeld** | **80,8% van het kaartoppervlak**; kruist de fotorand **55,8px naar rechts en 8,0px naar onder** | **9,4%**: de linkerrand ligt 42,0px binnen de rechter fotorand (x1240 tegen x1282), de rest hangt rechts van de foto | **100%**, en 214,3px voorbij de chevronpunt op x839,3 |
| **Contrast kaartgrond : ondergrond** | **2,29 : 1** (ondergrond L=0,409, spreiding 20,66:1) | **1,24 : 1** (ondergrond L=0,778) | **5,65 : 1** (ondergrond L=0,136) |
| **CTA** | geen | geen (de vier cijfers zijn de lading) | één tekstlink met pijl |
| **Hover** | geen op de kaart | geen op de kaart | alleen op de link: `opacity:.78` (`home-final.css:316`) |

**Gedeelde kenmerken, gemeten over de drie:** altijd wit of bijna-wit · altijd zonder rand · altijd
een **dubbele** schaduw met negatieve spread · altijd **linkerpadding > rechterpadding** (1,42 ·
1,31 · 1,23) · altijd **precies één per sectie** · altijd gedeeltelijk of volledig op een beeld.

- **Geschikte context:** één enkel vlak dat een beeld verankert of een claim naast een beeld zet.
- **VERBODEN context:** in een rij van twee of meer (gemeten: 1 per sectie, zonder uitzondering);
  op een egale witte grond zonder beeld — bij een gemeten grondcontrast van 1,24:1 (S06) is de
  dubbele schaduw met −19,5px spread de **enige** scheiding; als drager van meer dan vier
  inhoudsblokken (gemeten lading: 2 · 4 · 3 blokken, lopende tekst 84 · 159 · 66px hoog).

> **Gemeten geometriefout, geen voorstel tot wijziging.** `.vh-proc-kaart` is als enige van de vier
> witte zwevende vlakken **niet** op `box-sizing: border-box` gezet (wel: `home-proof.css:245`,
> `home-infra.css:214`, `home-final.css:267`; niet: `home-process.css:114-123`), en er is geen
> globale `box-sizing`-regel in `home*.css` of `tokens.css`. Daardoor telt de horizontale padding
> bij de gedeclareerde breedte op: 281,8 + 23,1 + 32,7 = **337,6px gemeten**. De overschrijding van
> **55,8px** voorbij de fotorand is dus exact gelijk aan de horizontale padding. Zie **DR-V-61**.

### K3 STROOK — `.vh-proof-strip`, sectie 06, 1 stuk

| | |
|---|---|
| **Maten** | 629×124, ratio **5,07** — de platste gevlakte kaart van de pagina; 35,46% vw; hoogte = 14,0% van de sectiehoogte. |
| **Radius** | **20,00** (`1.1274cqw`, `home-proof.css:307`) — de grootste kaartradius van de pagina; 16,23 op 1440. |
| **Oppervlak** | `#01234C` (`--pf-strip`, `home-proof.css:29`) — het enige donkere horizontale kaartvlak. |
| **Rand** | geen. |
| **Schaduw** | **geen** — de enige kaart die 100% op een beeld ligt zonder schaduw. Gemeten contrast kaartgrond : ondergrond = **5,08 : 1** (ondergrond L=0,292). |
| **Padding** | 17,0 / 22,0 / 17,0 / 18,0 — verticaal symmetrisch (17/17), net als K5; alle drie de K2-vlakken zijn verticaal asymmetrisch. |
| **Icoon** | géén icoon maar een **duimnagelfoto** 98×91, radius 10, `object-position: 50% 38%` (`home-proof.css:317-324`) = 15,6% van de strookbreedte. |
| **Typografie** | eyebrow 11,2 / 700 / ls **0,220em** `#0097FE` — de wijdste tracking van de pagina en de kleinste graad buiten het apparaatvlak K6 (dat 7,1–14,2px gebruikt); titel 22 / 700 wit; spec 15 / 400 `#C3D2E6`; CTA 16 / 500 wit, onderstreept met offset 4px (`home-proof.css:326-361`). |
| **Beeld** | twee rollen tegelijk: duimnagel ín de strook, en de strook ligt zelf **100% op de sectiefoto**, 84,4px van de linkerrand en 32,1px boven de onderrand daarvan. |
| **CTA** | tekst + pijl, rechts uitgelijnd, 100,8px breed (16,0% van de strook). |
| **Hover** | gedeclareerd: grond → `#042B5C` (`home-proof.css:316`). **Render NIET GEMETEN.** |
| **Geschikte context** | één uitgelicht project of item met duimnagel, liggend op een beeld, één per sectie. |
| **VERBODEN context** | op een lichte grond (de leesbaarheid komt van de donkere grond tégen een lichter beeld; gemeten 5,08:1); meer dan één per sectie; zonder duimnagel (die draagt 15,6% van de breedte en is het enige dat de strook van een knop onderscheidt); als tweede donkere vlak in dezelfde sectie. |

### K4 REGISTERKAART — `.vh-infra-kaart`, sectie 07, 4 stuks

| | |
|---|---|
| **Maten** | 4 × 422×126, ratio 3,35, **23,79% vw per kaart — identiek, de enige gelijke kaartfamilie van de pagina**. Verticale steek 141,3px, tussenruimte **15,3px = 12,1% van de kaarthoogte**; tops op 8,1 / 16,0677 / 24,0343 / 31,9998cqw (`home-infra.css:228-231`). Stapel 549,9px hoog = **74,7% van de fotohoogte**; 422px breed = **38,4% van de fotobreedte**. |
| **Radius** | 14,00 (`.7892cqw`, `home-infra.css:215`); 11,36 op 1440. |
| **Oppervlak** | `#FFFFFF`. |
| **Rand** | geen. |
| **Schaduw** | `rgba(16,58,110,.22) 0 15,97 31,93 −14,19` + `rgba(16,58,110,.14) 0 3,19 7,98 −4,26` (`home-infra.css:217-218`). |
| **Padding** | 0/0/0/0 — alle vier de onderdelen staan absoluut geplaatst (`home-infra.css:233-277`). |
| **Icoon** | icoonzone 82×70 **zonder tintvlak**, kleur `#16325A` (`:233-242`); plus een ronde pijl 37px, radius 50%, grond `#E7F2FE`, kleur `#0073FE` (`:265-273`). |
| **Typografie** | b 18,6 / lh 18,6 / 700 `#0C1424`; regel 16,0 / lh 24 / 400 `#45527A`. Gemeten 48px bodyhoogte = exact **twee regels in alle vier**. |
| **Beeld** | geen beeld in de kaart; **alle vier liggen 100% op de sectiefoto**, rechterrand 25,6px binnen de fotorand. |
| **Ondergrond** | gemeten L = **0,048** onder kaart 1 en **0,084** onder kaart 4 → contrast **10,68:1** en **7,85:1** (kaart 2 en 3 zijn niet apart gemeten). Die waarden worden gemaakt door een gerichte verdonkering onder de kaartkolom: `linear-gradient(268deg, rgba(3,20,44,.52) → .30 (26%) → .06 (46%) → 0 (62%))` (`home-infra.css:173-183`). |
| **CTA** | de hele kaart is een `<a>`; zichtbare CTA is de ronde pijl. |
| **Hover** | gedeclareerd: `translateY(-.16cqw)` = −2,8px plus een zwaardere schaduw (`home-infra.css:223-226`). **Render NIET GEMETEN.** |
| **Geschikte context** | een gesloten register van 3 tot 5 gelijkwaardige doelgroepen of toepassingen, **verticaal gestapeld op een beeld**. |
| **VERBODEN context** | naast elkaar in een horizontale rij (gemeten: de enige gelijke familie van de master staat verticaal); zonder scrim onder de kolom — zonder de 268°-verdonkering komt de gemeten achtergrondluminantie niet onder 0,14; met meer dan twee tekstregels; met een icoon in een tintvlak (dat maakt er K8 van). |

### K5 LOGOKAART — `.vh-proof-org`, sectie 06, 2 stuks

| | |
|---|---|
| **Maten** | 288,8×80,7 (3,58) en 197,1×80,7 (2,44). **Gelijke hoogte, ongelijke breedte, verhouding 1,465** — contentgedreven (`flex:none` + `white-space:nowrap`, `home-proof.css:118, 141, 148`). |
| **Radius** | 10,00 (`.5637cqw`, `home-proof.css:125`). |
| **Oppervlak** | `#FFFFFF`. |
| **Rand** | **1px `rgba(16,28,58,.12)`** (`home-proof.css:124`) — dezelfde waarde als het token `--vibe-lijn` (`home.css:52`), maar hardgeschreven; de token wordt nergens via `var()` gebruikt. |
| **Schaduw** | **geen in rust.** Gemeten ondergrond `#FAFCFE`, contrast **1,03 : 1** — de 1px rand is hier dus dragend, niet decoratief. |
| **Padding** | 17,0 / 26,0 / 17,0 / 26,0 — **de enige padding met gelijke boven/onder én gelijke links/rechts** (afgezien van de nulpaddings van K1, K4, K6, K7 en K8). |
| **Icoon** | geen. Expliciet géén nagebouwd logo (`home-proof.css:135`): de klantnaam staat in onze eigen letter. |
| **Typografie** | naam 18 / lh 22,5 / 700 / ls 0,010em `#101C3A`; ondertitel 14 / lh 18,2 / 400 `#5B6B86`. |
| **Beeld** | geen, en **0 van 2 ligt op een beeld**. |
| **CTA** | de hele kaart is een `<a>` naar de projectpagina; geen zichtbare CTA. |
| **Hover** | gedeclareerd: randkleur → `rgba(0,115,254,.42)`, schaduw `0 .68cqw 1.58cqw -.9cqw rgba(26,86,156,.30)` **verschijnt**, `translateY(-1px)` (`home-proof.css:130-134`). De enige familie die bij hover een schaduw krijgt. **Render NIET GEMETEN.** |
| **Schaalgedrag** | **de enige familie die niet proportioneel invariant is**: 16,28% vw op 1774 → 16,69% op 1440 (+0,41 procentpunt), omdat de breedte uit de tekst volgt en niet gedeclareerd is. |
| **Geschikte context** | 2 tot 4 klantnamen op een lichte grond, rechts uitgelijnd, bewust ongelijk van breedte. |
| **VERBODEN context** | met een nagebouwd logo; met een schaduw in rust; op een beeld — bij een grondcontrast van 1,03:1 is de 1px rand het enige onderscheid en op fotopixels verdwijnt die; in een rij van vier of meer gelijke breedtes. |

### K6 APPARAATVLAK — `.vh-ctrl-dash` + `.vh-ctrl-phone`, sectie 05, 2 stuks

| | dashboard | telefoon |
|---|---|---|
| **Maat** | 687,1×428,7 (1,60) · 38,73% vw | 151,3×308 (0,49) · 8,53% vw |
| **Radius** | 13,00 (`.7329cqw`, `home-control.css:58`) | **18,70** (`1.0541cqw`, `:70`) — 1,44× groter op een 4,5× kleiner vlak |
| **Oppervlak** | `#011731` (`--ct-scr`) | `#050E1B` — de twee diepste gronden van de pagina |
| **Rand** | **1px** `rgba(120,175,240,.20)`, vaste px (`:60`) | **2,00px** `#16202F`, gedeclareerd als `.115cqw` (`:72`) — de enige rand die als percentage staat; gerenderd 2,00px op 1774 en **1,00px op 1440**, want de browser legt randbreedtes op hele pixels |
| **Schaduw** | `rgba(26,86,156,.30) 0 19,51 39,03 −16,32` + `.20 0 3,90 9,76 −5,32` | `rgba(26,86,156,.34) 0 14,19 28,38 −11,71` + `.22 0 2,84 7,45 −3,90` |
| **Padding** | 0 (geneste rasters: rail/hoofdvlak 19,1/80,9, tegels `repeat(3,1fr)`, stroomschema 40,8/18,4/40,8) | 0 |

| | |
|---|---|
| **Icoon** | geen icoonvlak op de kaart zelf; binnenin een ronde hub van 48,1px met gloed (`home-control.css:154-162`). |
| **Typografie** | **7,1 – 14,2px**: kop 14,2/600/−0,012em · merk 9,2/700/ls 0,040em · live-label 8,1/ls 0,130em · knooptitel 7,8/600 · knoopregel 7,1/400. **De hele familie werkt onder de kleinste leesmaat van de pagina** (de kleinste tekst elders is 11,2px, de kleinste bodytekst 14px). |
| **Beeld** | **nul `img`-elementen in de hele sectie** — het is een gebouwd object, geen screenshot. |
| **CTA** | geen op het vlak; de sectie-CTA staat buiten de apparaten. |
| **Overlap** | de telefoon overlapt de linkerrand van het dashboard met **27,3px** en staat 100,5px lager; `z-index:2` over het dashboard (`home-control.css:75`). |
| **Ondergrond** | gemeten L = 0,8335 → contrast **15,13 : 1**. |
| **Hover** | geen gedeclareerd. Binnenin twee animaties: `vhCtrlPuls` 1,8s en `vhCtrlStroom` 1,1s (`home-control.css:94-96, 164-166`) — **render NIET GEMETEN** (stilstaande afdrukken). |
| **Interne gelijkheid** | de drie tegels binnen het dashboard zijn 3 × 166×51, radius 5,68 — **een gelijk raster**, maar binnen een afgebeelde interface (zie §4.8). |
| **Geschikte context** | het eigen product tonen als werkend apparaat; minimaal twee vlakken die elkaar met ≥25px overlappen. |
| **VERBODEN context** | als drager van verkooptekst (de typografie is 7–14px en niet bedoeld om gelezen te worden); één enkel apparaatvlak zonder tweede; een screenshot in plaats van een gebouwd object; op een donkere sectiegrond (gemeten contrast 15,13:1 komt van een lichte sectie, `#EFF7FE`). |

### K7 BEWIJSBAND — `.vh-kpi-grid` (S01) · `.vh-pr-metrics` (S03)

| | hero (S01) | project (S03) |
|---|---|---|
| **Maten** | band 1740×160 (`98.084cqw`, `home-hero.css:337`), 3 cellen van **exact 580×169 = 33,33% elk** | band 470×49,4; cellen **120 / 140 / 139,6px** — contentgedreven **ongelijk**, max/min = 1,167 |
| **Oppervlak / radius / schaduw** | geen · 0 · geen | geen · 0 · geen |
| **Scheiding** | 1px `#DCE7F3`, 69px hoog, tussen de cellen (`home-hero.css:353-360`) | 1px `rgba(255,255,255,.22)` met 35,2px padding links (`home-project.css:148-152`) |
| **Padding** | 0 / 20 / 9 / 0 per cel | 0 / 0 / 0 / 35,2 vanaf de tweede cel |
| **Icoon** | kaal icoon 49,2px, kleur `#0062FE` (`home-hero.css:362`) | geen |
| **Typografie** | getal 28 / lh 33 / 700 / −0,004em `#061B36`; label 16 / lh 20,8 / 400 `#475771` | getal 28,4 / lh 21,6 / 700 / −0,012em wit; label 17,4 / 400 `#93A5BC` |
| **Ondergrond** | L = 0,968, spreiding 1,10:1 (eigen verloopband) | L = **0,0103**, spreiding 2,44:1 — de band ligt 100% op het paneelbeeld, in het volledig dekkende deel van de scrim |

- **Geschikte context:** precies drie bewijswaarden, direct onder een kop of binnen een donker paneel.
- **VERBODEN context:** met een eigen kaartvlak (gemeten: beide uitvoeringen hebben grond
  `rgba(0,0,0,0)`, radius 0 en geen schaduw); met meer dan drie cellen; op een beeld zonder scrim —
  de projectband haalt zijn leesbaarheid uit een gemeten ondergrond van L=0,0103.

### K8 ICOONREGEL — 17 regels in 5 rijen, secties 02 · 04 · 05 · 07 · 08

| rij | selector | aantal × maat | gelijk? | icoon | typografie |
|---|---|---|---|---|---|
| S02 | `.vh-sol-punt` | 3 × 506×45 | ja | **kaal icoon 40px, geen tintvlak**, boven een 1px lijn `#E5EFFA` van 398px | b 18,2/700 `#08203C` + span 16,7/400 `#6F7A95`; rijsteek 79,5px |
| S04 | `.vh-proc-stap` | 4 × 292,1 breed (154,4 / 128,7 / 128,7 / 128,7 hoog) | ja, steek exact **430,7px** | kaal icoon 48px **plus** genummerde badge 36,2×35,1, radius 6,21, grond `#D8ECFE` | h3 18,7/700 + p 15,3/lh 25,7; chevrons `#B9C7D8` ertussen |
| S05 | `.vh-ctrl-feat` | 4 × 181,5×119,8 | ja | tintvlak 42,1, radius 7,45, grond `#D8ECFE` | b 16,8/700 + span 16,8/400 — **de enige K8 waar kop en regel dezelfde graad hebben** |
| S07 | `.vh-infra-vd` | 3 × 567,7×82 | ja | tintvlak **63,0**, radius 13,00, grond `#DEEFFD` | b 18,9/700 + span 17,0/400 |
| S08 | `.vh-final-vd` | 275 / 299,5 / 248 | **nee** — raster `326fr 355fr 294fr` (`home-final.css:221`), max/min 1,208 | tintvlak 59,9×58,2, radius 11,81, grond `#E8F3FE` | b 15,2/700 + span 14,3/400 |

| | |
|---|---|
| **Oppervlak / radius / rand / schaduw / padding** | geen · 0 · geen · geen · 0 — in alle 17 exemplaren gemeten. |
| **Beeld** | geen. Eén van de 17 raakt een beeld (de derde `.vh-final-vd`, 28,6% overlap met de chevronfoto). |
| **CTA** | geen. |
| **Hover** | geen gedeclareerd op welke K8 dan ook. |
| **Maatregel icoontegel** | 5 gemeten tintvlakken: 35,1 (K2) · 36,2 · 42,1 · 59,9 · 63,0. Radius/maat = 0,202 · 0,172 · 0,177 · 0,197 · 0,206 → **gemiddeld 0,191, spreiding 0,172–0,206**. Over vijf tegels in vier families is dat de enige maat die constant blijft. |
| **Tintkleuren** | **vijf verschillende**: `#DFEEFE` · `#D8ECFE` · `#DEEFFD` · `#E8F3FE` · `#E7F2FE`. Het token `--vibe-blauw-tint:#E4F0FC` (`home.css:38`) wordt door geen van de vijf gebruikt. Zie **DR-V-64**. |
| **Geschikte context** | 3 of 4 ondersteunende claims onder een kop of CTA, naast een gevlakte familie. |
| **VERBODEN context** | met een eigen vlak eronder (dan wordt het K2 of K4 en concurreert het met de hoofdkaart); meer dan vier stuks (gemeten maximum 4); als enige drager van de sectieboodschap; met een kop groter dan 18,9px (gemeten bereik 15,2–18,9). |

---

## 3. De acht families in één tabel

### 3.1 Vorm

| familie | n | maat (px) | ratio | % vw | radius | oppervlak | rand | schaduw | padding |
|---|---|---|---|---|---|---|---|---|---|
| **K1** MEDIAKAART | 6 | 487×498 · 302×498 · 292×498 · 371×230 · 353×230 · 355×230 | 0,59–1,61 | 16,5–27,5 | **10,00** | doorzichtig (foto vult) | geen | **1 laag** `rgba(23,84,150,.10)` 0/9,93/25,90/0 | 0 (inhoud 31/33) |
| **K2** ZWEVEND INFOVLAK | 3 | 338×254 · 448×374 · 305×273 | 1,12–1,33 | 17,2–25,3 | **11,70 · 16,00 · 13,50** | `#FFFFFF` / `#FCFDFE` | geen | **2 lagen**, drie inkten: `(12,38,72)` · `(26,86,156)` · `(9,38,78)` | 21,3/23,1/30,5/32,7 · 38/32/35/42 · 25,3/26/31,7/32,1 |
| **K3** STROOK | 1 | 629×124 | **5,07** | 35,5 | **20,00** | `#01234C` | geen | **geen** | 17/22/17/18 |
| **K4** REGISTERKAART | 4 | 4 × 422×126 | 3,35 | 23,8 | **14,00** | `#FFFFFF` | geen | **2 lagen** `rgba(16,58,110,.22/.14)` | 0 |
| **K5** LOGOKAART | 2 | 289×81 · 197×81 | 2,44–3,58 | 11,1–16,3 | **10,00** | `#FFFFFF` | **1px `rgba(16,28,58,.12)`** | **geen in rust** | 17/26/17/26 |
| **K6** APPARAATVLAK | 2 | 687×429 · 151×308 | 0,49 · 1,60 | 8,5 · 38,7 | **13,00 · 18,70** | `#011731` · `#050E1B` | **1px** `rgba(120,175,240,.20)` · **2px `#16202F`** | **2 lagen** `rgba(26,86,156,.30/.20)` · `(.34/.22)` | 0 |
| **K7** BEWIJSBAND | 2 banden | 1740×160 (3 cellen × 580×169) · 470×49 (cellen 120/140/140) | cel 3,43 · cellen 2,43–2,83 | 98,1 · 26,5 | **0** | **geen** | 1px scheidingslijn tussen cellen | **geen** | 0/20/9/0 · 0/0/0/35,2 |
| **K8** ICOONREGEL | 17 | 506×45 · 292×154 · 182×120 · 568×82 · 275–300×64 | 1,52–11,2 | 10,2–32,0 | **0** | **geen** | geen | **geen** | 0 |

### 3.2 Inhoud en gedrag

| familie | icoon | koptype | bodytype | beeld in de kaart | CTA | hover (gedeclareerd) | ligt op een beeld |
|---|---|---|---|---|---|---|---|
| **K1** | kaal 40 / 44px + ronde pijl 38–46px | 18,4 / 26,6 · 700 · −0,004em · wit | 16,5–19 / lh 24–27 · wit 90% | **ja, vult de kaart** | ronde pijl, hoek wisselt per rij | pijl `translateX(3,9px)` | n.v.t. (het beeld ís de kaart) |
| **K2** | tintvlak 35,1 / geen / **ronde blauwe schijf 57,4** | 19,9 · 20 (citaat) · 21 · 700 | 15,3 · 16,4 / lh 21–22 | nee | geen · geen · tekstlink | alleen op de link (S08) | 80,8% · 9,4% · 100% |
| **K3** | **duimnagelfoto 98×91** | 22 · 700 · wit | spec 15 · 400 | ja, als duimnagel | onderstreepte tekst + pijl | grond → `#042B5C` | **100%** |
| **K4** | kaal 82×70 + ronde pijl 37px | 18,6 · 700 | 16,0 / lh 24, **exact 2 regels** | nee | ronde pijl | `translateY(−2,8px)` + zwaardere schaduw | **100% (4 van 4)** |
| **K5** | **geen** | 18 · 700 · ls 0,010em | 14 · 400 | nee | geen | rand → blauw + schaduw verschijnt + −1px | **0% (0 van 2)** |
| **K6** | geen (hub 48,1px binnenin) | 14,2 · 600 | **7,1–9,2** | nee (0 img in de sectie) | geen | geen; 2 animaties binnenin | 0% |
| **K7** | kaal 49,2px (alleen S01) | getal 28 / 28,4 · 700 | label 16 / 17,4 · 400 | nee | geen | geen | 2,7% (S01) · **100% (S03)** |
| **K8** | tintvlak 36,2–63,0 (4 van 5 rijen) | 15,2–18,9 · 700 | 14,3–17,0 · 400 | nee | geen | geen | 1 van 17 |

### 3.3 Wat wél over alle families heen geldt

Vijf regels die uit de meting volgen in plaats van uit een token:

1. **Radius is proportioneel.** Alle acht gemeten radii schalen met de viewportbreedte
   (1774 → 1440, factor 0,8117 ± 0,001). Geen enkele kaartradius is een vaste px-waarde.
2. **Schaduwverschuiving = halve blur.** `y / blur` gemeten per familie: 0,500 (K2-S06) · 0,500 (K4)
   · 0,500 (K6-dash) · 0,500 (K6-telefoon) · 0,469 (K2-S04) · 0,462 (K2-S08) · 0,384 (K1).
   **Vier van de zeven exact 0,500; bereik 0,384–0,500.**
3. **Spread = −0,41 × blur.** Gemeten: −0,344 · −0,407 · −0,385 · −0,444 · −0,418 · −0,413.
   K1 is de enige zonder spread (0).
4. **De contactlaag is een kwart van de hoofdlaag.** Blur van laag 2 ÷ blur van laag 1:
   0,252 · 0,238 · 0,250 · 0,250 · 0,263 — **vijf van de zes op 0,25**; K2-S04 wijkt af met 0,141.
5. **Icoontegelradius = 0,19 × tegelmaat.** Gemeten 0,172–0,206 over vijf tegels van 35,1 tot 63,0px.

---

## 4. Kaartcompositieregels

Dit is het deel dat bepaalt of een nieuwe pagina eruitziet als de master of als een template.
Elke regel heeft een toets en een gemeten bewijsbasis; waar die basis klein is (n=1 of n=2), staat
dat erbij.

### 4.1 C1 — ONGELIJKE KAARTEN

**Wanneer:** zodra er drie of meer kaarten van één familie in één rij staan.

Gemeten op de master, sectie 02 (`home-solutions.css:126-143`):

| rij | kolommen | aandeel van de rij | max/min | verticale naden |
|---|---|---|---|---|
| boven | 487 · 302 · 292 | 45,1 / 27,9 / 27,0% | **1,668** | x1063–1089 · x1391–1417 |
| onder | 371 · 353 · 355 | 32,8 / 31,2 / 31,4% | **1,051** | x947–973 · x1326–1352 |

De naden verspringen **116px** en **65px** tussen de twee rijen: het raster wordt bewust gebroken.

**Regel.** In een rij van drie kaarten is `max/min` ófwel **≥ 1,55** (echt ongelijk) ófwel
**≤ 1,06** (praktisch gelijk). De zone **1,06 < max/min < 1,55** is verboden: daar ziet een rij er
"bijna gelijk maar net niet" uit.

**Bewijs (n=4 rijen, twee per pagina).** Master: 1,668 en 1,051 — beide buiten de zone.
B2-kandidaat: 1,459 (sectie 03, 439·301·301) en 1,110 (sectie 08, 787·748·709) — **beide erin**.
Dit is de enige gemeten maat **op kaartrijniveau** waarop de twee pagina's elkaar uitsluiten; de
raster-telling in §4.8 doet dat niet.

**Toets:** meet de breedte van elke kaart in de rij, deel de grootste door de kleinste.

### 4.2 C2 — ÉÉN DOMINANTE PLUS ONDERGESCHIKTE KAARTEN

**Wanneer:** als één item van de rij meer waard is dan de andere.

Gemeten op de dominante kaart van sectie 02 (487×498) ten opzichte van zijn buren (302×498):

| eigenschap | dominant | ondergeschikt | factor |
|---|---|---|---|
| oppervlak | 242.526 px² | 150.396 px² | **1,613** |
| kopgraad | 26,6 px | 18,4 px | **1,446** |
| bodygraad / regelafstand | 19 / 27 | 16,5 / 24 | 1,152 / 1,125 |
| icoon | 44 px | 40 px | 1,100 |
| ronde pijl | 46 px | 38 px | 1,211 |
| statistiekbalk | **ja, als enige** | nee | — |

**Regel.** Een dominante kaart schaalt zijn **kop met ~1,45×** en zijn **icoon met ~1,10×** —
dus de typografie springt harder dan het icoon — en draagt **precies één element dat de andere
kaarten niet hebben**. Radius, schaduw en grond blijven identiek aan de buren (gemeten: alle zes
hebben radius 10,00 en dezelfde schaduw).

**Toets:** vergelijk kopgraad en icoonmaat van de grootste en de kleinste kaart in de rij; staat de
kopfactor niet boven de icoonfactor, dan is de hiërarchie niet gemaakt.

### 4.3 C3 — HORIZONTALE STROOK

**Wanneer:** één item uitlichten binnen een sectie die al een andere kaartfamilie bevat.

Gemeten (K3, sectie 06): 629×124, ratio **5,07**, hoogte 14,0% van de sectie, breedte 35,5% vw.
Drie zones over de breedte: duimnagel **98px (15,6%)** | tekstkolom | CTA **100,8px (16,0%)**, met
gaten van 20px (`1.1274cqw`) en padding 18 links / 22 rechts (`home-proof.css:306, 311`).
Grond `#01234C`, radius 20, **geen schaduw**, ligt **100% op een beeld**.

**Regel.** Een strook is ≥ 5 : 1 van verhouding, donker, zonder schaduw, met een duimnagel die
15–16% van de breedte neemt en een CTA die er ongeveer even breed tegenover staat. Hij ligt altijd
volledig op een beeld; op een egale grond is hij een balk, geen strook.

**Bewijsbasis n=1.** Zie **DR-V-65**.

### 4.4 C4 — OVERLAY OP BEELD

**Wanneer:** een informatievlak op fotopixels leggen. Dit is de scherpste scheidslijn met de
B2-kandidaat: **12 van 18 kaartvlakken op de master liggen op een beeld, tegen 1 van 19 op B2.**

Gemeten achtergrondluminantie ónder elk vlak, met het vlak zelf verborgen (`grond-1774.txt`):

| vlak | ondergrond L | spreiding ondergrond | eigen grond L | contrast |
|---|---|---|---|---|
| K4 kaart 1 (100% op beeld) | **0,048** | 10,72 : 1 | 1,000 | **10,68 : 1** |
| K4 kaart 4 (100% op beeld) | **0,084** | 13,12 : 1 | 1,000 | **7,85 : 1** |
| K2 S08 (100% op beeld) | **0,136** | 7,17 : 1 | 1,000 | **5,65 : 1** |
| K3 (100% op beeld, donker vlak) | 0,292 | 19,48 : 1 | 0,017 | **5,08 : 1** |
| K7 S03 (100% op paneelbeeld, geen vlak) | **0,010** | 2,44 : 1 | n.v.t. | — |
| K2 S04 (80,8% op beeld) | **0,409** | 20,66 : 1 | 1,000 | **2,29 : 1** |
| K2 S06 (9,4% op beeld) | 0,778 | 17,99 : 1 | 0,981 | **1,24 : 1** |
| K5 (0% op beeld) | 0,971 | 1,00 : 1 | 1,000 | **1,03 : 1** |

**Regels.**

1. **Een wit vlak mag alleen op een beeld liggen waar de gemeten achtergrondluminantie ≤ 0,14 is.**
   Gemeten: 0,048 · 0,084 · 0,136 — alle drie onder de grens, en alle drie gemaakt door een
   gerichte verdonkering (`home-infra.css:173-183`, `home-final.css:77`), niet door de ruwe foto.
2. **Boven die grens moet er een tweede scheidingsmiddel bij.** Gemeten: bij 2,29:1 (K2-S04) draagt
   de zwaarste schaduw van de pagina (blur 56,8px, spread −19,5px) en hangt 19% van de kaart buiten
   de foto; bij 1,24:1 (K2-S06) draagt alleen de dubbele schaduw; bij 1,03:1 (K5) draagt een 1px rand.
3. **Een donker vlak op een beeld heeft geen schaduw nodig.** Gemeten: K3, 5,08:1, schaduw geen.
4. **De zone tussen 2,5:1 en 5,0:1 komt op de master niet voor** — geen enkel vlak landt daar.
   Daar is dus geen gemeten regel voor; zie §6.

**Toets:** verberg het vlak, maak een afdruk van exact zijn rechthoek, reken de gemiddelde
luminantie uit (`grond.mjs`). Komt een wit vlak boven 0,14 uit, dan ontbreekt de scrim.

### 4.5 C5 — AANGEHECHTE KAARTEN

**Wanneer:** een kaart aan een beeldrand koppelen zonder hem erin op te sluiten.

Gemeten afstanden tussen een kaartrand en de dichtstbijzijnde beeldrand:

| kaart | gedrag | afstand tot de dichtstbijzijnde beeldrand |
|---|---|---|
| K4 (4×) | **binnen** | rechterrand **25,6px binnen** de fotorand |
| K3 | **binnen** | **84,4px** van de linker fotorand, **32,1px** boven de onderrand, **21,0px** binnen de rechterrand |
| K2 S04 | **kruist naar buiten** | **55,8px voorbij** de rechter fotorand en **8,0px voorbij** de onderrand; eindigt 10,2px van de schermrand |
| K2 S06 | **dekt een beeldrand af van buitenaf** | linkerrand **42,0px binnen** de rechter fotorand; 9,4% van de kaart ligt op de foto |

Drie verschillende aanhechtingen dus — binnen blijven, de rand kruisen, en een rand van buitenaf
afdekken — en geen vierde.

**Regel.** Een kaartrand valt **nooit** samen met een beeldrand. Gemeten afwijkingen over zeven
kaart-/beeldrandparen: **8,0 · 21,0 · 25,6 · 32,1 · 42,0 · 55,8 · 84,4px**. De kleinste is 8,0px;
de waarde 0 komt niet voor.

**Toets:** trek per kaartrand de x of y van de dichtstbijzijnde beeldrand af; is het verschil
kleiner dan 8px, dan lijkt het uitgelijnd zonder het te zijn, en is het fout.

### 4.6 C6 — GESTAPELDE KAARTEN

**Wanneer:** 3 tot 5 gelijkwaardige items naast een beeld dat genoeg hoogte heeft.

Gemeten (K4, sectie 07): 4 × 422×126, verticale steek **141,3px**, tussenruimte **15,3px =
12,1% van de kaarthoogte**. De stapel is 549,9px hoog = **74,7% van de fotohoogte** (736,2) en
422px breed = **38,4% van de fotobreedte** (1100). Alle vier liggen 100% op de foto, met een
verdonkering die exact onder die kolom is aangebracht (`home-infra.css:173-183`).

**Regel.** Een stapel neemt **70–80% van de beeldhoogte** en **ten hoogste 40% van de beeldbreedte**,
met een tussenruimte van **12% van de kaarthoogte**. De kaarten zijn onderling identiek
(zie §4.8: dit is de enige vorm waarin dat mag).

**Bewijsbasis n=1.** Zie **DR-V-65**.

### 4.7 C7 — ÉÉN GEÏSOLEERD ZWEVEND VLAK

**Wanneer:** er is precies één ding te zeggen naast een beeld.

Gemeten: K2 komt voor in drie secties, en in alle drie **exact één keer**. Sectie 06 bevat drie
kaartfamilies, maar nooit twee K2's. De drie exemplaren verschillen in radius (11,7 / 16 / 13,5),
in schaduwinkt (drie verschillende) en in overlap (80,8% / 9,4% / 100%), maar niet in aantal.

**Regel.** Hoogstens één zwevend wit vlak per sectie. Wie er twee nodig heeft, heeft K4 nodig.

### 4.8 WANNEER EEN GELIJK KAARTRASTER VERBODEN IS

**Eigen telling, strikte kaartdefinitie (§0.1), 1774px (`raster2-1774.txt`):**

| | Homepage Master v1 | B2-kandidaat |
|---|---|---|
| groepen van ≥3 kaarten | 3 | 3 |
| waarvan **gelijk** (identieke breedte én hoogte) | **1** | **1** |
| waarvan ongelijk | 2 | 2 |
| **horizontale rijen van ≥3 kaarten met identieke breedte** | **0 — in alle negen secties** | **0** |
| de enige gelijke groep | K4: **verticale stapel**, 4 × 422×126, **4 van 4 op een beeld**, met eigen scrim | `ul.st-functies`: **verticale lijst**, 4 × 644×111, radius 0, geen schaduw, **0 van 4 op een beeld** |
| kaartvlakken op een beeld | **12 van 18 (66,7%)** | **1 van 19 (5,3%)** |

**Eerlijk gelezen scheidt het kale aantal gelijke rasters de twee pagina's niet: beide hebben er
één, en beide hebben nul horizontale rijen van gelijke kaarten.** Wat ze wel scheidt, is wáár dat
raster staat en wat ernaast gebeurt. Daaruit volgt de harde grens in drie delen:

> **GRENS 1 — Een gelijk kaartraster (≥3 kaarten met identieke breedte én hoogte) is toegestaan in
> precies één vorm: verticaal gestapeld op een beeld, met een scrim die de gemeten
> achtergrondluminantie onder elke kaart op ≤ 0,14 brengt.** Gemeten: K4, 0,048–0,084.
> In elke andere vorm is het verboden.
>
> **GRENS 2 — Nul horizontale rijen van drie of meer kaarten met identieke breedte.**
> Gemeten op de Homepage Master: 0 in alle negen secties. Eén zo'n rij op een V1.2-pagina is één
> afwijking van de master.
>
> **GRENS 3 — Elke rij van drie kaarten heeft max/min ≤ 1,06 of ≥ 1,55** (§4.1). De B2-kandidaat
> zit met 1,459 en 1,110 tweemaal in de verboden zone; de master met 1,668 en 1,051 tweemaal
> erbuiten.

**Twee uitzonderingen, allebei gemeten:**

- **Binnen een afgebeelde interface mag alles gelijk zijn.** De drie tegels in het dashboard
  (3 × 166×51, radius 5,68, `home-control.css:122-128`) zijn een perfect gelijk raster — maar ze
  verbeelden een scherm, ze zijn geen pagina-compositie.
- **Familie K8 mag gelijk zijn, want K8 heeft geen vlak.** Gemeten: 4 van de 5 K8-rijen zijn
  exact gelijk van breedte (3×506 · 4×292,1 · 4×181,5 · 3×567,7) en de vijfde bewust ongelijk
  (275/299,5/248). Omdat er geen oppervlak is, leest een gelijke K8-rij als tekstkolommen en niet
  als een tegelraster. **Dit is de goedkoopste manier om drie of vier gelijkwaardige punten te
  tonen zonder een gelijk kaartraster te maken** — en de master gebruikt hem in 5 van de 9 secties.

**Toets per sectie, drie tellingen:**
`A` = aantal horizontale rijen met ≥3 kaarten van gelijke breedte (moet 0 zijn) ·
`B` = max/min per kaartrij (moet ≤1,06 of ≥1,55 zijn) ·
`C` = aandeel kaartvlakken dat op een beeld ligt (master: 66,7%; B2: 5,3%).

---

## 5. Beslisboom — inhoud in, kaartfamilie uit

Loop van boven naar beneden; de eerste treffer wint.

```
1. Is het een afbeelding van ons eigen product, als werkend scherm?
   ja  -> K6 APPARAATVLAK
          eisen: minimaal 2 vlakken, overlap >= 25px (gemeten 27,3),
                 typografie 7-14px, 0 img-elementen, donkere grond.
   nee -> 2

2. Heeft ELK item een eigen foto, en moet de tekst OP die foto staan?
   ja, 3-6 items  -> K1 MEDIAKAART
          eisen: rij met max/min >= 1,55 of <= 1,06; een van de kaarten
                 dominant (kop x1,45, icoon x1,10, een extra element);
                 leesbaarheidsverloop aan de kant waar de tekst staat.
   ja, 1 item dat uitgelicht moet worden -> K3 STROOK
          eisen: ratio >= 5, donker vlak, geen schaduw, duimnagel 15-16%
                 van de breedte, ligt 100% op een beeld.
   nee -> 3

3. Moet het vlak OP een beeld liggen?
   ja, 3-5 gelijkwaardige items -> K4 REGISTERKAART
          eisen: verticale stapel, identieke maten, tussenruimte 12% van
                 de kaarthoogte, stapel 70-80% van de beeldhoogte en
                 <= 40% van de beeldbreedte, scrim tot L <= 0,14,
                 maximaal 2 tekstregels per kaart.
   ja, 1 item dat het beeld verankert -> K2 ZWEVEND INFOVLAK
          eisen: precies 1 per sectie, wit, geen rand, dubbele schaduw
                 met spread -0,41 x blur, linkerpadding > rechterpadding,
                 overlap met het beeld 9% of 80-100%, nooit ertussenin
                 uitgelijnd (minimaal 8px afwijking van elke beeldrand).
   nee -> 4

4. Zijn het bewijswaarden (getal + label), precies drie?
   ja  -> K7 BEWIJSBAND
          eisen: geen vlak, geen radius, geen schaduw; 1px scheidingslijnen;
                 gelijke cellen op een lichte grond, contentgedreven ongelijke
                 cellen binnen een donker paneel.
   nee -> 5

5. Zijn het 3 of 4 ondersteunende claims (icoon + 1-2 regels)?
   ja  -> K8 ICOONREGEL
          eisen: geen vlak; icoontegel met radius = 0,19 x tegelmaat, of
                 bewust geen tegel; kop 15,2-18,9px; staat naast een
                 gevlakte familie, nooit alleen.
   nee -> 6

6. Is het een klantnaam of organisatie?
   ja  -> K5 LOGOKAART
          eisen: 1px rand, geen schaduw in rust, symmetrische padding,
                 contentgedreven ongelijke breedte, nooit op een beeld,
                 nooit een nagebouwd logo.
   nee -> 7

7. Geen van alle -> GEEN KAART.
   Gemeten: drie van de negen secties van de master (01, 03, 09) hebben
   nul kaartvlakken, en de mediaan over alle negen is 1. Een sectie zonder
   kaart is de normale uitkomst, niet de uitzondering.
```

**Twee grendels op de uitkomst.**

- **Grendel A:** staan er na de boom twee of meer gevlakte families in één sectie, ga dan terug.
  Gemeten: 8 van de 9 secties hebben er hoogstens één. De enige sectie met drie (06) laat die drie
  in élke eigenschap verschillen — grond, rand, schaduw, radius, maat.
- **Grendel B:** telt de sectie meer dan vier kaartvlakken, ga dan terug. Gemeten maximum: 6 (K1 in
  sectie 02) en 4 (K4 in sectie 07, K5+K2+K3 in sectie 06).

---

## 6. Wat ik NIET heb gemeten

| onderwerp | reden |
|---|---|
| **Alle hover-toestanden** | `:hover` sloeg in het harnas niet aan: na `page.mouse.move()` naar het middelpunt gaf `el.matches(':hover')` **false** op alle 18 geteste doelen (`hover.mjs`, uitvoer in deze sessie), en geen enkele computed waarde veranderde. De hovergedragingen in §2 zijn daarom **als CSS-declaratie gelezen**, met `bestand:regel`, en niet gerenderd geverifieerd. |
| Contrast van tekst op de kaarten | Gemeten is de ondergrond van het *vlak*, niet die van elke tekstregel. `home-solutions.css:171-175` bevat een eerdere tekstcontrastmeting (slechtste geval 1,00:1 vóór de correctie) die ik niet heb herhaald. |
| De vier animaties in K6 | Als declaratie gelezen (`home-control.css:94-96, 164-166`); het harnas maakt stilstaande afdrukken. |
| Gedrag onder 1200px | Dit document beschrijft de desktopcompositie (1774 met controle op 1440). `home-mobile.css` herdefinieert de kaartfamilies onder 1200px; dat is een eigen ontwerp en een eigen document waard. |
| K5 en de telefoon in de 1440-telling | Mijn kaartfilter eist breedte ≥150 en hoogte ≥70; op 1440 vallen K5 (240×66) en de telefoon (122×249) daardoor uit de telling van 15 in `variatie.txt`. Dat is een filterartefact, geen ontwerpverschil: beide zijn apart gemeten in `kaarten-home-1440.txt` (aandeel 16,69% en 8,4% vw, radius 8,12 en 15,18). |
| Of de gemeten `ref`-annotaties bedoeld zijn | Gemeten feit: de `/* ref … */`-commentaren verwijzen per bestand naar een ander canvas — `home-hero/solutions/proof/infra.css` naar **1774** (26/34/26/29 treffers), `home-process/control.css` naar **≈1517**, `home-final/footer.css` naar **2103**. Wie een ref-waarde met een gemeten px vergelijkt, zit er een factor 1,17 of 0,84 naast. Welke schaal de juiste is, is een besluit. |

---

## 7. Open besluiten voor V1.2

Genummerd in het blok **DR-V-60 … DR-V-69**, gereserveerd voor dit document, zodat het niet botst
met DR-V-01 … DR-V-10 uit `forensics-homepage.md`. Elk besluit volgt uit een gemeten spreiding;
geen ervan is een voorstel om nu iets te wijzigen.

- **DR-V-60 — Kaartradius.** Acht unieke waarden over zes gevlakte families (10 · 11,7 · 13 · 13,5 ·
  14 · 16 · 18,7 · 20); K2 gebruikt er in zijn eentje drie en K6 twee. Wordt dat een trap van vaste
  stappen per familie, of blijft elke familie zijn eigen waarde kiezen? Vaststaand feit dat in beide
  gevallen geldt: de waarde moet in `cqw` staan, want alle acht schalen nu mee (factor 0,8117 bij
  1440).
- **DR-V-61 — `box-sizing` op K2.** Drie van de vier witte zwevende vlakken staan op
  `border-box` (`home-proof.css:245`, `home-infra.css:214`, `home-final.css:267`), `.vh-proc-kaart`
  niet (`home-process.css:114-123`). Daardoor is de gemeten breedte 337,6 in plaats van 281,8 en
  steekt de kaart 55,8px voorbij de fotorand — exact de horizontale padding. Wordt de 55,8px
  vastgelegd als bedoeld middel van C5 (aangehechte kaart die de rand kruist), of wordt het
  `box-sizing` toegevoegd en de overschrijding apart gedeclareerd?
- **DR-V-62 — Schaduwtokens.** `--vibe-elev-1` en `--vibe-elev-2` (`home.css:60-63`) worden op
  desktop **nul keer** via `var()` gebruikt; alleen `--vibe-elev-mob` wordt één keer gebruikt, in
  een mobiele media query (`home-infra.css:402`). Tegenover die twee ongebruikte tokens staan zeven
  gemeten recepten in vijf inkten. Worden de tokens herschreven naar wat er werkelijk staat, of
  verdwijnen ze?
- **DR-V-63 — Schaduwinkt.** Vijf inkten in gebruik: `rgba(23,84,150)` · `(12,38,72)` ·
  `(26,86,156)` · `(16,58,110)` · `(9,38,78)`. Eén inkt met een variabele alfa, of blijft de inkt
  per familie meebewegen met de grond waarop hij landt?
- **DR-V-64 — Icoontint.** Vijf hardgeschreven tinten (`#DFEEFE` · `#D8ECFE` · `#DEEFFD` ·
  `#E8F3FE` · `#E7F2FE`) voor dezelfde functie, terwijl `--vibe-blauw-tint:#E4F0FC` (`home.css:38`)
  door geen van de vijf wordt gebruikt. Eén tint, of de spreiding toestaan?
- **DR-V-65 — Bewijsbasis van C3 en C6.** De strookregel (§4.3) en de stapelregel (§4.6) steunen
  elk op **één** gemeten exemplaar. Worden ze als regel vastgelegd, of als "zo doet de master het"
  beschreven totdat er een tweede exemplaar is?
- **DR-V-66 — De verboden zone 1,06–1,55.** Afgeleid uit vier rijen (twee master, twee B2).
  Wordt die grens normatief, of eerst breder gemeten op de overige V1.2-pagina's?
- **DR-V-67 — Luminantiedrempel 0,14.** Afgeleid uit drie witte vlakken op een beeld (0,048 ·
  0,084 · 0,136) tegenover één dat eroverheen gaat (0,409, contrast 2,29:1). Wordt 0,14 de harde
  poort voor "wit vlak op foto", en hoort daar een verplichte scrimdeclaratie bij?
- **DR-V-68 — Hover.** Vier families hebben een hover-declaratie (K1 pijl, K4 lift, K5 rand+schaduw,
  K3 grond), vier niet (K2 op de kaart zelf, K6, K7, K8). Wordt hover een eigenschap van alle
  klikbare families, of blijft het aan de families met een `<a>`-wrapper? Dit besluit kan pas
  **gerenderd** getoetst worden als het hoverharnas werkt (zie §6).
- **DR-V-69 — Referentiecanvas in de commentaren.** Drie canvassen in één codebase: 1774 (vier
  bestanden), ≈1517 (`home-process.css`, `home-control.css`), 2103 (`home-final.css`,
  `home-footer.css`). Wordt één canvas vastgelegd voor alle `/* ref … */`-annotaties?

---

## 8. Toetslijst voor een nieuwe V1.2-pagina

Elf tellingen, allemaal met een harnas te meten, met de gemeten waarde van de master ernaast.

| # | toets | master | B2-kandidaat |
|---|---|---|---|
| 1 | horizontale rijen van ≥3 kaarten met identieke breedte | **0** | 0 |
| 2 | `max/min` per kaartrij buiten de zone 1,06–1,55 | **2 van 2** | 0 van 2 |
| 3 | kaartvlakken die ≥50% op een beeld liggen | **12 van 18 (66,7%)** | 1 van 19 (5,3%) |
| 4 | gevlakte kaartfamilies per sectie ≤ 1 | **8 van 9 secties** | n.v.t. |
| 5 | kaartradius schaalt mee van 1774 naar 1440 | **8 van 8 unieke waarden** | 0 van 2 |
| 6 | aandeel vw per kaart invariant (drift ≤ 0,05 procentpunt) | **15 van 15** | **0 van 18** |
| 7 | witte vlakken die ≥50% op een beeld liggen met ondergrond L ≤ 0,14 | **3 van 4 gemeten** (K2-S04 is de uitzondering op 0,409) | n.v.t. (1 vlak op een beeld, niet gemeten) |
| 8 | kaartrand valt samen met een beeldrand (0px) | **0 van 7 randparen** | n.v.t. |
| 9 | paddings met vier gelijke zijden > 0 | **0 van 6** | 2 van 9 |
| 10 | secties zonder enig kaartvlak | **3 van 9** | 2 van 11 |
| 11 | gelijke rij zonder vlak (K8) als alternatief voor een tegelraster | **5 van 9 secties** | n.v.t. |
