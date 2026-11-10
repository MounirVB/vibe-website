# Generatorbreed visueel redesign — eindrapport

Branch `redesign/hallmark-v3-20261109`, werkboom `~/projects/vibe-wt-v3`.
Preview: `http://127.0.0.1:8795`. Het origineel staat op `8793` ter vergelijking.
**Niets gepusht, niets gemerged, niets gedeployed.**

---

## 1. De scope, gemeten

448 HTML-bestanden. 397 staan in `data/seo/gegenereerd.json` en worden door de
generator geschreven; 51 zijn handgeschreven.

| categorie | familie | aantal | bronmodule |
|---|---|---|---|
| **B — herontworpen** | gemeentepagina's | 337 | `genereer.mjs` → `bouwGemeente` |
| | provinciepagina's | 12 | `genereer.mjs` → `bouwProvincie` |
| | kennisartikelen (blog) | 17 | `genereer-nationaal.mjs` |
| | sectorpagina's | 11 | `genereer-nationaal.mjs` |
| | toepassingen (product-SEO) | 10 | `genereer-nationaal.mjs` |
| | dienstenpagina's (oplossing) | 4 | `genereer-nationaal.mjs` |
| | hubpagina's | 6 | `genereer-nationaal.mjs` + `genereer.mjs` |
| | subsidiepagina | 1 | `genereer-nationaal.mjs` |
| | nieuwsartikelen | 0 gepubliceerd, sjabloon wel | `genereer-nieuws.mjs` |
| **A — ongemoeid** | projectpagina's | 16 | handgeschreven |
| | industrie-pagina's | 5 | handgeschreven |
| | systeem-/productpagina's | 4 | handgeschreven |
| | wortelpagina's (index, over-ons, projecten, …) | 26 | handgeschreven |

**Categorie A is in deze ronde niet aangeraakt.** Gemeten met
`git diff --name-only 901b19a..HEAD` over alle 51 bestanden: **0 gewijzigd**.
`vibe/vibe.css` en `vibe/chrome.js` zijn in deze ronde evenmin gewijzigd — er
is dus ook werkelijk geen CSS bijgekomen.

Er zijn op dit moment nul gepubliceerde nieuwsartikelen. Het sjabloon is
gemeten en herontworpen via het fixture-mechanisme uit `scripts/seo/qa-nieuws.mjs`,
dat een testbericht neerzet, de keten draait en het weer opruimt.

---

## 2. Wat de gegenereerde pagina's miste

Het verschil met de handgeschreven pagina's was niet smaak, maar telbaar. Per
sectie binnen `<main>`, DOCUMENT = louter tekst:

| | secties | DOCUMENT | CANVAS | langste tekstreeks | beeld | tekens per visuele gebeurtenis |
|---|---|---|---|---|---|---|
| `index.html` (hand) | 10 | 1 | 2 | 1 | 12 | 691 |
| `energy-hubs.html` (hand) | 9 | 4 | 1 | 2 | 6 | 1.322 |
| `laadplein.html` (gen) | 15 | **15** | **0** | **15** | **0** | **22.140** |
| `toepassingen/pieken-in-verbruik` (gen) | 11 | 11 | 0 | 11 | 0 | 18.362 |
| `kennis/peak-shaving` (gen) | 13 | 13 | 0 | 13 | 0 | 16.397 |

Alle acht gemeten gegenereerde pagina's hadden **nul beelden** en **nul
donkere secties**.

### De oorzaak

Drie dingen, alle drie structureel:

1. **De generator sprak de eigen ontwerptaal niet.** `index.html` gebruikt 23
   componenten die de generator nooit uitstuurde — `ve-split`, `ve-rails`,
   `ve-feiten`, `ve-grid12`, `ve-canvas`, `ve-metriek`, `ve-fase`. De
   generator bouwde alles uit `ve-sec` (36× op één pagina) en `ve-kaart` (14×).
2. **Eén vorm per sectiesoort.** De inhoudsbestanden kennen drie soorten:
   tekst, kaarten, specs. Elke soort kreeg precies één vorm. Gemeten over de
   46 inhoudsbestanden: **258 tekstsecties waarvan 173 boven de 1.500 tekens**,
   **56 met twee of meer `<h3>`-tussenkoppen**, **50 kaartrijen met drie of
   meer gelijke kaarten**, 48 specsecties.
3. **Twee beeldregisters.** `genereer-nieuws.mjs` hield een eigen register bij
   met eigen alt-teksten voor dezelfde bestanden als `lib/beeld.mjs`.

---

## 3. Wat er gebouwd is

### 3.1 Het assetregister

Elk beeld is in een browser **bekeken** voordat het is beschreven. Dat leverde
vijf onjuiste alt-teksten op:

| bestand | stond er | staat er werkelijk op |
|---|---|---|
| `assets/netcongestie-hero` | twee batterijkasten achter een hekwerk | **drie** kasten op betonnen voeten (stond op 89 pagina's) |
| `img/ev-charging` | een elektrische auto aan een laadpunt | een **luchtfoto van een autobedrijf** met zonnecarports |
| `img/control-meting` | meetapparatuur in een schakelkast | een **monteur** die een installatie bedient |
| `img/ems-tech` | technische installatie | idem, met een persoon erop |
| `assets/home/s2-ems` | het energiemanagementsysteem | idem |

En een structureel probleem: **dertig bestanden tonen samen veertien
onderwerpen.** Dezelfde drie kasten staan in `netcongestie-hero`,
`home/s2-accu` en `systeem/s4-systeem`; dezelfde twee mensen bij dezelfde
tekening in `over-ons-hero` en `img/monteurs-werktekening`.

Elk beeld draagt nu een `groep`. `beeldenVoor()` levert nooit twee beelden uit
dezelfde groep; `controleerSets()` bewaakt dat als zelftest (nu 0 fouten over
52 sets). Elf sets zetten vóór deze regel twee uitsnedes van dezelfde foto op
één pagina.

**Mobiel.** Acht beelden bestaan alleen als grote jpg zonder webp-breedtes.
Die gaan nu naar het smalle middenslot, nooit naar het openingsbeeld of de
canvasband — anders haalt een telefoon het hele bestand binnen omdat er geen
kleinere variant is. Gemeten over 118 routes: **0 variantloze beelden in een
breed slot** (was 8).

**Niet opgenomen, met reden:** `subsidies-hero` (een plein met een kerktoren,
geen relatie met de inhoud), `energiehandel-hero` (identiek aan `ems-hero`),
`microgrids-hero` en `energieopslag-hero` (bijna-duplicaten).

De volledige inventaris staat in `docs/beeldinventaris-v3.md`.
**Licentie blijft een openstaand punt:** de repository bevat geen
licentiebestand, geen rechtenregister en geen fotograafvermelding.

### 3.2 Acht bouwstenen, nul nieuwe CSS

| bouwsteen | vorm | bestaande klassen |
|---|---|---|
| `artikelkop` | artikelhero met zichtbare datum en bijschrift | `.ve-feiten`, `.ve-media__voet` |
| `railsectie` | benoemde punten als accentlijst | `.ve-rails` / `.ve-rail` |
| `feitenstrook` | gemeten feiten op een rij | `.ve-feiten` |
| `specblok` | specificaties naast een beeld | `.ve-grid12`, `.ve-sp-7/5`, `.ve-spec` |
| `kaartrij12` | asymmetrische kaartrij | `.ve-grid12`, `.ve-stack--lg` |
| `artikelrij` | compacte gerelateerde artikelen | `.ve-projrij`, `.ve-regios` |
| `uitspraakband` | donkere uitspraak met kop | `.ve-sec--3xl --dark`, `.ve-citaat` |
| `noot` | korte eerlijke mededeling | `.ve-sec--tight`, `.ve-kaart--sunken` |

### 3.3 Vorm afgeleid uit inhoud, zonder één inhoudsbestand aan te raken

* Een tekstsectie met ≥2 `<h3>` wordt een `.ve-rails`-lijst. Die tussenkoppen
  stonden al in de alinea's; ze werden alleen als lopende tekst uitgeserveerd.
* Een kaartsectie met ≥3 kaarten wordt een asymmetrisch raster: de eerste
  kaart dragend over zeven kolommen, de rest gestapeld over vijf. Een rij
  gelijke kaarten is wat KP-07 in `docs/qa/composition-gate.mjs` afkeurt.
* Een specsectie komt naast een beeld te staan.
* Elke derde tekstsectie wordt een beeldband; er komt één canvasband ná de
  middelste sectie, niet onderaan.

**Er wordt geen tekst toegevoegd, verplaatst of herschreven.** Dezelfde
koppen, dezelfde alinea's, dezelfde volgorde, dezelfde links. De canvasband
draagt `og_titel` en `beschrijving` uit het inhoudsbestand — die stonden tot
nu toe alleen in de `<head>`.

### 3.4 Beeld per pagina, met fallback

Eén uitgifte per pagina houdt bij welke visuele groepen al gebruikt zijn. De
vaste slots zijn: 0 opening (breed), 1 band A, 2 canvasband (breed), 3 band B,
4 band C. Specificatieblokken en dragende kaarten vragen hun beeld daar op.

Een dragende kaart krijgt het **openingsbeeld van de pagina waar hij heen
wijst** — dezelfde foto die de bezoeker na de klik ziet.

Zijn de groepen op, dan komt er **geen beeld**: de kaart blijft de tekstkaart
die hij was. Dat is de fallbacklayout.

### 3.5 Per familie

* **Blog en nieuws** — artikelhero met zichtbare publicatiedatum, rubriek en
  bronaantal; beeld dat het ONDERWERP van het bericht volgt
  (`onderwerp_eigenaar`), niet de kop; afwisselende tekst- en beeldsecties;
  compacte bronnensectie. Het nieuwskanaal leest nu uit het centrale register;
  zijn eigen register is opgeheven.
* **Diensten, sectoren, toepassingen** — ritme met beeldbanden en een
  canvasband; specificaties naast beeld; asymmetrische kaartrijen.
* **Regio en gemeente** — de langste tekstsectie ("De zakelijke energiecontext
  van X") staat nu als beeldband met de foto ernaast, op alle 349 pagina's.
  Geen fictieve lokale projecten: de elf gemeenten met eigen werk tonen hun
  eigen projectfoto, de overige 326 een onderwerpsbeeld.
* **Hubs** — dragende kaarten met het beeld van hun bestemming.

---

## 4. Gemeten resultaat

Acht gegenereerde pagina's, origineel (8793) naast nieuw (8795):

| pagina | secties | DOCUMENT | CANVAS | langste tekstreeks | beeld | tekens per gebeurtenis |
|---|---|---|---|---|---|---|
| `laadplein` | 15 → 16 | 15 → 8 | 0 → 1 | 15 → 3 | 0 → 8 | 22.140 → 2.741 |
| `toepassingen/pieken-in-verbruik` | 11 → 12 | 11 → 6 | 0 → 1 | 11 → 3 | 0 → 6 | 18.362 → 3.050 |
| `kennis/peak-shaving` | 13 → 14 | 13 → 7 | 0 → 1 | 13 → 3 | 0 → 7 | 16.397 → 2.331 |
| `sectoren/retail` | 11 → 12 | 11 → 6 | 0 → 1 | 11 → 3 | 0 → 6 | 14.303 → 2.351 |
| `kennis` (hub) | 14 → 15 | 14 → 10 | 0 → 1 | 14 → 4 | 0 → 5 | 13.099 → 2.602 |
| `netcongestie` | 11 → 13 | 11 → 6 | 0 → 1 | 11 → 3 | 0 → 7 | 9.263 → 1.340 |
| `regios/gelderland` | 8 → 9 | 8 → 6 | 0 → 1 | 8 → 3 | 0 → 3 | 8.587 → 2.485 |
| `regios/gelderland/arnhem` | 9 → 10 | 9 → 7 | 0 → 1 | 9 → 3 | 0 → 3 | 7.567 → 2.133 |
| **samen** | | **92 → 56** | **0 → 8** | **15 → 4** | **0 → 45** | |

Ter ijking: `index.html` (handgeschreven) zit op 691 tekens per visuele
gebeurtenis, `energy-hubs.html` op 1.322.

Het nieuwssjabloon ging van 0 naar 3 beelden en van een kale tekstpagina naar
753 tekens per visuele gebeurtenis.

**Over de hele site:** 1.525 beelden in `<main>` over 449 pagina's;
**0 pagina's tonen hetzelfde beeld twee keer**; 21 pagina's zonder beeld
(privacy, cookiebeleid, voorwaarden, 404 — daar voegt een foto niets toe).

---

## 5. Poorten en tests

| | uitslag |
|---|---|
| SEO/GEO, 16 regels | **PASS** |
| poort 11 duplicatie | hoogste 0,5537 · marge 0,0463 (was 0,5546 / 0,0454 — **ruimer**) |
| poort 7 interne links | 28.633 links in 448 bestanden, 0 dood |
| poort 8 weespagina's | 0 zonder inkomende statische link |
| publiek artefact | **PASS** |
| QA lastmod | **PASS** |
| QA nieuwskanaal | **PASS** — 83 van 83 |
| vijandige QA | **PASS** — 17/17 scenario's vingen hun defect |
| bouw reproduceerbaar | `git status` leeg na een verse `bouw.mjs --offline` |
| axe-core, 9 pagina's × 390/1440px | **0 violations** |
| responsive, 10 pagina's × 320/390/768/1440/1920px | **0 keer schuiven, 0 onbereikbare elementen** |
| handgeschreven pagina's gewijzigd | **0 van 51** |

### Drie regressies uit deze ronde zelf, gevonden en hersteld

1. **42 pagina's toonden hetzelfde beeld twee keer.** De beeldbanden wisselden
   over slot 1 en 2, maar slot 2 is ook de canvasband; en `laadplein` heeft
   twee specsecties die allebei hetzelfde vaste beeld kregen. Opgelost met één
   uitgifte per pagina.
2. **Horizontaal schuiven op 768px**, 9px over, op vier pagina's. Oorzaak:
   `.ve-kaart` zet zelf geen `display`, en als `<a>` valt hij terug op
   `display:inline` — een inline element kan niet krimpen tot zijn
   gridkolom. Opgelost in de markup, niet in de CSS.
3. **De nieuwspoort viel op de zichtbare publicatiedatum.** Mijn artikelkop
   verving `datumregel()` door een eigen datumcel, en poort 16 pint zowel het
   attribuut `data-nieuws-datum` als de letterlijke tekst "Gepubliceerd op
   &lt;ISO&gt;". Dat is een contract over wat een bezoeker ziet, geen
   formaliteit. De datumregel staat terug; de feitenregel draagt de andere
   feiten.

---

## 6. Wat niet gedaan is

* **`.ve-balken` niet ingezet.** De CSS kent een balkencomponent die op geen
  enkele pagina wordt gebruikt. Op de 349 regiopagina's zou hij de
  bedrijfstaktabel visualiseren — maar daarmee zou de tabeltekst verdubbelen,
  en de duplicatiemarge van poort 11 is 0,0463. Niet gedaan, met die reden.
* **Geen Lighthouse-meting.** Er komen 3 tot 8 beelden per pagina bij. Alle
  zijn `loading="lazy"` behalve het openingsbeeld, dat `fetchpriority="high"`
  draagt, en brede slots krijgen alleen beelden met responsieve varianten. De
  verwachting is dat LCP gelijk blijft en het paginagewicht stijgt — maar dat
  is een verwachting, geen meting.
* **`luchtvve` (`assets/vve-hero.jpg`) blijft ongebruikt.** Er is geen
  gegenereerde route waar een VvE-luchtfoto inhoudelijk thuishoort.
* **Geen nieuwsartikelen gepubliceerd.** Het sjabloon is herontworpen en
  gemeten met de QA-fixture; die is na de meting weer opgeruimd. Publiceren is
  een redactioneel besluit, geen bouwstap.

---

## 7. Oplevering

```
BRANCH     redesign/hallmark-v3-20261109
BASIS      901b19a  (eindstand vorige ronde)
FINAL SHA  8a48364
WERKBOOM   schoon · bouw reproduceerbaar
PREVIEW    http://127.0.0.1:8795   (origineel: 8793)

PUSHED = NO    MERGED = NO    DEPLOYED = NO
```

Commits in deze ronde:

| commit | wat |
|---|---|
| `8179c62` | Het beeldregister beschreef vijf beelden verkeerd en kende de duplicaten niet |
| `61581e7` | Eén beeldregister voor de hele site, brede slots krijgen een beeld dat schaalt |
| `7926d09` | Drie vormen die in de inhoud zaten maar er nooit uit kwamen |
| `b88b9bc` | Eén beelduitgifte per pagina, want hetzelfde beeld stond er twee keer |
| `d545e54` | De 349 regiopagina's: de langste tekstsectie krijgt een beeld ernaast |
| `b2d0ad4` | Een kaartlink is display:inline, en dat brak de layout op 768px |
| `f3b0c50` | Een artikelhero met een zichtbare datum voor blogs en nieuws |
| `8a48364` | De nieuwspoort pint de datumvorm, en die herschrijf ik niet voor de vorm |
