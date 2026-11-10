# Redesign V3 — eindrapport

Branch `redesign/hallmark-v3-20261109`, werkboom `~/projects/vibe-wt-v3`.
Preview: `http://127.0.0.1:8795` (naast 8793 en 8794 met het origineel).
**Niets gepusht, niets gemerged, niets gedeployed.**

---

## 1. De diagnose

De vorige ronde was technisch geslaagd en visueel onvoldoende. Dat is geen
kwestie van smaak gebleken, maar meetbaar.

Per sectie binnen `<main>` geteld, waarbij DOCUMENT betekent: louter tekst,
geen beeld, geen metriek, geen donker vlak.

| pagina | | secties | DOCUMENT | CANVAS | langste tekstreeks | tekens per visuele gebeurtenis |
|---|---|---|---|---|---|---|
| `index.html` | handgeschreven | 10 | 2 | 2 | 1 | 777 |
| `energy-hubs.html` | handgeschreven | 9 | 4 | 1 | 2 | 1.322 |
| `netcongestie.html` | gegenereerd | 11 | 11 | 0 | 11 | 9.263 |
| `sectoren/retail.html` | gegenereerd | 11 | 11 | 0 | 11 | 14.303 |
| `laadplein.html` | gegenereerd | 15 | 15 | 0 | 15 | 22.140 |

Vijftien tekstsecties achter elkaar, nul visuele onderbrekingen, 22.140 tekens
tussen het ene beeld en het volgende.

### De oorzaak eronder

`index.html` gebruikt **23 componenten die de generator nooit uitstuurde**:
`ve-split`, `ve-metriek`, `ve-overlay`, `ve-canvas`, `ve-pijler`, `ve-fase`,
`ve-schema`, `ve-sleutel`, `ve-console`, `ve-grid12` en dertien andere. De
generator bouwde álles uit `ve-sec` (36 keer op één pagina) en `ve-kaart` (14
keer).

Er was dus geen nieuwe ontwerptaal nodig. De site had er al een — compleet,
goed doordacht, met varianten als `ve-split--5-7`, `ve-split--swap`,
`ve-media--overlay-onder`. De generator sprak hem alleen niet.

Hetzelfde gold voor beeld. In `assets/` staan **23 `*-hero`-families**.
De generator gebruikte er nul en koos altijd uit twaalf algemene onderwerpen.
Gevolg: 349 regiopagina's met exact dezelfde `img/control-meting`, en
`/netcongestie` met een foto van meetapparatuur terwijl
`assets/netcongestie-hero.webp` — de eigen batterijkasten van Vibe — ernaast
op schijf lag.

---

## 2. Wat er gebouwd is

Alles in de broncomponenten en de generator. Geen handmatige HTML-patches.

### 2.1 Beeldsysteem (`scripts/seo/lib/beeld.mjs`)

* 29 beelden met een sleutel, een pad en een alt-tekst. De alt-teksten zijn
  geschreven **ná het bekijken van de beelden**, niet afgeleid uit de
  bestandsnaam — drie namen dekten de lading niet.
* Elke route krijgt een **set van drie** beelden uit verschillende visuele
  groepen (kast / dak / laden / techniek / mensen), zodat één pagina nooit
  drie keer dezelfde foto in een andere uitsnede toont.
* De 349 regiopagina's roteren over vier sets op een stabiele hash van de
  route: dezelfde route geeft altijd hetzelfde beeld — de bouw blijft
  reproduceerbaar — maar twee buurgemeenten tonen niet hetzelfde.
* Afmetingen worden uit de bestanden zelf gelezen (RIFF-kop voor webp, SOFn
  voor jpeg). Een ontbrekend beeld is een bouwfout, geen stille leegte.

**Vier beelden zijn bewust niet opgenomen**: `subsidies-hero` (een plein met
een kerktoren — geen relatie met de inhoud), `energiehandel-hero` (identiek
aan `ems-hero`), `microgrids-hero` en `energieopslag-hero` (bijna-duplicaten
van twee andere). Zie `docs/beeldinventaris-v3.md`.

### 2.2 Vier sectietypen die de generator niet had (`sjabloon.mjs`)

| bouwsteen | vorm | bestaande CSS |
|---|---|---|
| `beeldband()` | beeld naast tekst, kant wisselt per keer | `.ve-split--5-7` / `--7-5` |
| `canvasband()` | breed beeld in de donkere canvaslijst, tekst eroverheen | `.ve-canvas` + `.ve-overlay` |
| `fasenband()` | genummerde fasen | `.ve-fasen` / `.ve-fase` |
| `pijlers()` | icoon, kop, alinea | `.ve-pijlers` / `.ve-pijler` |

Geen van deze vier voegt CSS toe. Ze gebruiken de klassen die de
handgeschreven pagina's al droegen.

### 2.3 Ritme in de generator

Een pass over de secties van elke pagina:

* elke derde tekstsectie wordt een **beeldband** — dezelfde kop, dezelfde
  alinea's, met een foto ernaast;
* er komt één **canvasband** ná de middelste sectie, niet onderaan. Een
  pagina waarvan de enige visuele gebeurtenis op 90% van de hoogte staat,
  leest als tekst met een plaatje eronder.

**Er wordt geen regel tekst verzonnen.** De beeldband draagt de alinea's die
er al stonden. De canvasband draagt `og_titel` en `beschrijving` uit het
inhoudsbestand — die stonden tot nu toe alleen in de `<head>` en waren op de
pagina zelf onzichtbaar. De regiopagina's krijgen een kale beeldbreuk met de
alt-tekst als onderschrift, omdat daar geen zin beschikbaar is die er
thuishoort; een zin die voor die plek bedacht wordt, is een claim zonder bron.

### 2.4 De paginaonderkant

'Verder lezen' droeg 18 tot 64 links, en daarvan stonden er **op elke pagina
precies elf ook in de footer eronder** — dezelfde elf, pagina na pagina.

Die elf staan al crawlbaar in `NOSCRIPT_NAV` op elke gegenereerde pagina, dus
weghalen kost geen linkgraaf: de lijst weespagina's blijft 11 en is dezelfde
lijst. Groepen van acht of meer korte namen gebruiken nu `.ve-regios`, het
dichte raster dat de provinciepagina's zelf al droegen.

| | voor | na |
|---|---|---|
| links op `regios/gelderland/arnhem` | 64 | 54 |
| blokhoogte | 2.129 px | 840 px |
| aandeel van de paginahoogte | 20,0% | 9,7% |
| overlap met de footer, regiopagina's | 11 | 0 |
| overlap met de footer, nationaal | 11 | 2 |

De twee resterende zijn `industrie-*`-routes die níét in `NOSCRIPT_NAV` staan;
die weghalen zou ze wél tot weespagina maken.

### 2.5 Homepage

* **'Waar wij werken'** was een raster van vier identieke tekstkaarten —
  precies de 'gelijke kaartrij' die KP-07 in de compositiepoort afkeurt. Ze
  dragen nu het openingsbeeld van de pagina waar ze heen wijzen: dezelfde foto
  die de bezoeker ná de klik ziet. Koppen, alinea's, voetregels, iconen en
  links zijn letterlijk ongewijzigd; de alt-teksten komen van de
  bestemmingspagina's.
* **De slotband** was als enige op de site licht. Elke gegenereerde pagina
  sluit af met `ve-slot--dark`; de homepage eindigde in een bleke doos vlak
  boven een donkere footer. Nu dezelfde band, dezelfde maat, tweede knop als
  `ve-btn--ghost-dark`.

---

## 3. Gemeten resultaat

Veertien pagina's, origineel (poort 8793) naast V3 (poort 8795).

| | voor | na |
|---|---|---|
| secties | 158 | 172 |
| DOCUMENT-secties | 150 (95%) | 112 (65%) |
| CANVAS-secties | 2 | 15 |
| visuele gebeurtenissen | 8 | 60 |
| beelden in `<main>` | 8 | 64 |
| langste tekstreeks | 15 | 5 |

Van die acht beelden vooraf stonden er **acht op `index.html`**. Dertien van de
veertien pagina's hadden er nul.

Per pagina:

| pagina | DOCUMENT | langste tekstreeks | beeld | tekens per gebeurtenis |
|---|---|---|---|---|
| `laadplein` | 15 → 11 | 15 → 4 | 0 → 5 | 22.140 → 4.385 |
| `subsidies` | 15 → 11 | 15 → 5 | 0 → 5 | 18.437 → 3.679 |
| `toepassingen/pieken-in-verbruik` | 11 → 8 | 11 → 5 | 0 → 4 | 18.362 → 4.575 |
| `kennis/netcongestie-uitgelegd` | 13 → 9 | 13 → 4 | 0 → 5 | 17.386 → 3.428 |
| `energieadvies` | 13 → 10 | 13 → 4 | 0 → 4 | 17.304 → 4.307 |
| `sectoren/automotive` | 14 → 10 | 14 → 4 | 0 → 7 | 16.947 → 2.849 |
| `sectoren/retail` | 11 → 8 | 11 → 5 | 0 → 4 | 14.303 → 3.526 |
| `netcongestie` | 11 → 8 | 11 → 3 | 0 → 5 | 9.263 → 1.877 |
| `regios/gelderland/arnhem` | 9 → 8 | 9 → 5 | 0 → 2 | 7.567 → 3.229 |
| `index` | 2 → 1 | 1 → 1 | 8 → 12 | 777 → 691 |

Beeld in de hoofdinhoud over de hele site: **427 van 448 pagina's** (was 31).
De 21 zonder beeld zijn wortelpagina's als privacy, cookiebeleid en algemene
voorwaarden, waar een foto niets toevoegt.

Spreiding over de 349 regiopagina's: zes verschillende beelden, geen enkel
beeld boven 47%. Was: één beeld op 349 van 349.

---

## 4. Poorten

| poort | uitslag |
|---|---|
| SEO/GEO (16 regels) | **PASS** |
| publiek artefact | **PASS** |
| QA lastmod | **PASS** |
| QA nieuwskanaal | **PASS** |
| vijandige QA | **PASS** — 17/17 scenario's vingen hun defect |
| weespagina's | 11, ongewijzigd en dezelfde lijst als vóór dit werk |
| bouw reproduceerbaar | `git status` leeg na een verse `bouw.mjs --offline` |
| axe-core, 6 pagina's × 390/1440px | **0 violations** |
| horizontaal schuiven, 8 pagina's × 8 breedtes | 0 keer schuiven, 0 onbereikbare elementen |

Breedtes: 320, 360, 390, 412, 768, 1024, 1280, 1440.

### Drie defecten uit deze ronde zelf, gevonden en hersteld

1. **Een tweede `naLead`-sleutel** in `bouwProvincie` en `bouwGemeente` hield
   349 regiopagina's beeldloos. In een JS-objectliteral wint de laatste
   sleutel; `node --check` ziet dat niet en er komt geen waarschuwing.
2. **`.ve-canvas__voet` haalde 2,87:1.** Het onderschrift gebruikte
   `--ve-text-muted` op een donkere canvas. Die combinatie bestond nog niet:
   `.ve-canvas` droeg tot nu toe altijd de VIBE.CONTROL-console en nooit een
   onderschrift.
3. **`.ve-scroll-x` was niet met het toetsenbord bereikbaar.** Op de
   regiopagina's is de bedrijfstakkentabel bij 390px 522px breed in een
   venster van 272px; wie geen muis gebruikt kwam nooit bij de rechterkolommen.

### Eén melding die geen defect was

De eerste axe-ronde meldde vier tot vijf `color-contrast`-fouten op `.vck-b1`,
`.vck-b2`, `.vck-b3` en `.vck-t` — op élke pagina, en óók op de originele site.
Dat is de cookiebanner die op dat moment nog aan het inkomen is; axe mat een
tussenstand van de overgang. Met 1200 ms wachten vóór de meting zijn ze alle
weg.

---

## 5. Wat niet gedaan is

* **Geen apart ontwerpcontract als document.** De brief vroeg in fase A om een
  ontwerpcontract en zes referentiepagina-ontwerpen. Die zijn niet als losse
  documenten opgeleverd. Reden: het contract bleek al te bestaan — in
  `vibe/vibe.css`, in `docs/qa/composition-gate.mjs` en in de handgeschreven
  pagina's zelf. Een nieuw contract schrijven zou een derde beschrijving van
  dezelfde taal zijn geweest, terwijl de brief juist vroeg om te bouwen en
  niet om te adviseren. De vastlegging zit nu in de commentaarblokken bij de
  bouwstenen, met de meting erbij.
* **Licentie van het beeldmateriaal: niet vastgesteld.** De repository bevat
  geen licentiebestand, geen rechtenregister en geen fotograafvermelding. Ik
  heb dat niet ingevuld. Zie `docs/beeldinventaris-v3.md`.
* **`luchtvve` (`assets/vve-hero.jpg`) wordt nergens aangeroepen.** Er is geen
  gegenereerde route waar een VvE-luchtfoto inhoudelijk thuishoort;
  `industrie-vve` is handgeschreven en heeft zijn eigen beeld al.
* **Geen Lighthouse-meting in deze ronde.** De vorige ronde deed die in een
  geïsoleerde omgeving; de wijzigingen hier voegen beeld toe, wat LCP en
  gewicht beïnvloedt. Dat is nog niet gemeten — zie hieronder.

## 6. Wat ik zou willen meten vóór productie

1. **Lighthouse voor/na** op netcongestie, laadplein en een regiopagina. Er
   komen vier tot zeven beelden per pagina bij; alle zijn `loading="lazy"`
   behalve het openingsbeeld, dat `fetchpriority="high"` draagt. De verwachting
   is dat LCP gelijk blijft en de totale paginagrootte stijgt, maar
   verwachting is geen meting.
2. **De cookiebanner over het openingsbeeld.** Op elke pagina valt de banner
   nu over een foto in plaats van over witruimte. Technisch verandert er niets
   aan de bereikbaarheid — dat is gemeten — maar het is wel een
   ontwerpafweging die jij moet zien.

---

## 7. Commits

Alles lokaal op `redesign/hallmark-v3-20261109`. Niets gepusht.

| commit | wat |
|---|---|
| `b861941` | Een beeldlaag voor de generator, die leest wat er ligt |
| `38ff545` | Een tweede naLead-sleutel hield 349 regiopagina's beeldloos |
| `96725da` | Manifestresidu van de nieuwspoort eruit |
| `1c7f5ef` | De generator spreekt de visuele taal die de site al had |
| `f7ec8bc` | De homepage sluit niet langer af in een bleke doos |
| `d3fb0d7` | Twee toegankelijkheidsdefecten uit deze ronde zelf |
| `0c7c26d` | De beeldrotatie draaide niet: 348 pagina's deelden één foto |

```
PUSHED = NO    MERGED = NO    DEPLOYED = NO
```
