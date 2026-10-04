# Vibe Energy — claimregister voor de Stitch-redesign

Status: vastgesteld bij de herbouw van de publieke site op het Stitch Master Brand System.

> **Interne governance.** Dit register stuurt de redactie; het is geen propositie.
> De website zegt nergens dat Vibe "geen cijfers publiceert" — er staan simpelweg
> alleen gedragen cijfers op. Neem geen tekst uit dit document over in paginacopy.

Dit register bepaalt **welke cijfers de nieuwe site wel en niet publiceert**. Het volgt de lijn die
de codebase zelf al had: `systeem-energieopslag.html` blokkeerde claims in commentaar, en
`index.html` verwierp de herostatistieken van `projecten.html` expliciet. Die besluiten zijn hier
overgenomen en uitgebreid.

**Regel:** een pagina die een cijfer herhaalt is geen bron. Een getal mag alleen op de site staan
als het terug te voeren is op één eenduidige primaire opgave.

---

## 1. Verwijderd — tegengesproken door de eigen site

| Claim | Stond op | Waarom weg |
|---|---|---|
| 47 opgeleverde projecten | `projecten.html` | Dezelfde pagina toont 11 cases. Geen bron. |
| 12 MWp zon geïnstalleerd | `projecten.html` | Geen enkele projectpagina noemt kWp/MWp; de enige vermogensopgave op de site is 97,7 kW (Purmerend). Bovendien claimt `oplossing-exploitatie.html` 24 MWp voor één portefeuille — twee keer het bedrijfsbrede totaal. |
| 98% gemiddelde uptime | `projecten.html` | Geen meetbron, periode of scope. Uptime is expliciet een verboden categorie. |
| "het afgelopen jaar opgeleverd" | `projecten.html` | Opleverdata lopen juli 2023 – maart 2026 (33 maanden). |
| 645 kWh batterijopslag | `project-ratio-16.html`, `project-hedin-alkmaar.html` | **Conflict:** dezelfde energiecapaciteit staat op twee verschillende projecten, met verschillend vermogen (157 kW resp. 300 kW). De site wijst 645 kWh ook aan beide toe. Tot een primaire bron uitwijst welk project welke capaciteit heeft, publiceert de site alleen de **vermogens**, die wél uniek en onbetwist zijn. |
| +70% netvermogen (Alkmaar) | `project-hedin-alkmaar.html` | Dezelfde pagina zegt "verdrievoudigt" (×3); `microgrids.html` zegt "×3". +70% en ×3 kunnen niet allebei. |
| 240 kW PV voor Ratio 16 | `systeem-zonnepanelen.html` | 240 is het **aantal panelen**, geen vermogen. |
| 7 waardestromen · 0 jr wachttijd · −22% netinkoop | `_leadpopup.js` | Alle drie tegengesproken door andere pagina's (vier resp. zes stromen elders). |
| −40% piekreductie · −25% energiekosten · +30% eigen verbruik · −31% verlichting · −38% netbelasting | `systeem-ems.html` | Geen meetbestand, geen locatielijst. Bronregels ("N=12 locaties · 2024") verwijzen naar niet-bestaande steekproeven. |
| −22% HVAC over 50 panden | `systeem-ems.html` | Een portefeuille van 50 panden bestaat nergens op de site. |
| 70–85% eigen verbruik, bron "N=14 sites · 2024" | `systeem-zonnepanelen.html` | Zelfde patroon van een niet-bestaande steekproef. |
| −38% servicekosten | `oplossing-energielabel.html` e.a. | Hetzelfde percentage wordt op vier pagina's aan vier verschillende grootheden gehangen. |
| 14 weken van scan tot werkend systeem | `oplossing-netcongestie.html` | Geen case noemt 14 weken; gepubliceerde doorlooptijden zijn 4 dagen tot 4 weken. |
| 3–4× zoveel laadpunten | `systeem-laadpalen.html` | De site voert vier verschillende waarden voor dezelfde belofte. |
| € 1–5 mln per locatie | `oplossing-exploitatie.html` | Geen enkele case noemt een bedrag. |
| 25 jaar vermogensgarantie, Tier-1, NEN/IEC | `systeem-zonnepanelen.html` | Geen merk, type of normnummer. De site doet verder **geen enkele certificeringsclaim** — en krijgt er dus ook geen. |

## 2. Niet overgenomen — anonieme "praktijkcases"

`oplossing-netcongestie.html`, `oplossing-laadplein.html`, `netcongestie-oplossen.html`,
`laadplein-zonder-verzwaring.html` en `capaciteit-als-dienst.html` dragen cases zonder klant,
locatie of projectpagina, met cijfers die alles overstijgen wat de site als gerealiseerd
publiceert (1.500 kWh opslag, 1.250 kVA aansluiting, 24 MWp, "van 6 naar 28 laadpunten").
Ze staan er zelf bij als "Cijfers indicatief".

**Besluit:** de nieuwe site gebruikt geen anonieme cases. Waar bewijs nodig is, staat een
**echt project met naam en plaats**. Er zijn elf echte projecten; dat is genoeg.

## 3. Niet overgenomen — nepdata in interfaces

`systeem-ems.html` ("5 assets online · dispatch AUTO", "09:00:14 › peak forecast +340 kVA") en het
microgrid-dashboard op `oplossing-energielabel.html` (412 kW opwek, 78% SoC, PLAFOND 1.250 kVA)
zijn gedecoreerde demo-strings die als live telemetrie lezen.

**Besluit:** de VIBE.CONTROL-weergave op de nieuwe site is een **schema zonder waarden**, met
onder het beeld letterlijk: *"Schematische weergave van de regelstrategie. Geen meetdata van een
bestaande installatie."* Er bestaat geen productscreenshot in deze codebase.

## 4. Gemarkeerd — publiceren onder voorbehoud

Deze projectcijfers staan op de bronpagina maar zijn intern inconsistent. Ze blijven op de
projectpagina staan zoals de bron ze geeft, maar worden **niet** naar overzichts- of
oplossingspagina's getild:

| Project | Twijfel |
|---|---|
| Burchtstraat (52 won.) / Arnhem (60 won.) | Beide 254 panelen, met woordelijk identieke tekst. |
| Nieuw-Schoonoord (180 won., 300 panelen) | 1,67 paneel per woning; elders 3,3–5,1. |
| Ketsheuvel (+5 labelstappen) | Grootste labelsprong op het kleinste project. |
| Schouwburgring | Bron bevat letterlijke `—`-placeholders voor label en doorlooptijd; die velden blijven leeg. |
| Ratio 16 "78% besparing" | Geen eenheid en geen basislijn in de bron. Alleen op de projectpagina, met de formulering van de bron. |

## 5. Wel gepubliceerd — eenduidig en uniek per project

| Project | Waarden |
|---|---|
| Ratio 16, Duiven (juli 2024) | 51 kW transportvermogen (ongewijzigd) · 240 zonnepanelen · 157 kW batterijopslag · 132 kW laadplein · 12 laadplekken |
| Hedin Amsterdam (maart 2026) | 215 kW bestaande aansluiting · 460 kWh batterijopslag · 20 laadplekken · 4 weken realisatie · 160–170 kWh/uur gemiddeld verbruik |
| Hedin Alkmaar (mei 2025) | 300 kW energieopslag · 4 dagen installatie |
| Dormio Medemblik (okt 2024) | 215 kWh batterijopslag · 219 zonnepanelen · 73% besparing · +4 labelstappen |
| Van Beethovenstraat, Nijmegen (juni 2024) | 62 woningen · 302 panelen · +4 labelstappen · 2 weken |
| Burchtstraat, Nijmegen (okt 2024) | 52 woningen · 254 panelen · +4 labelstappen · 2 weken |
| Arnhem (dec 2024) | 60 woningen · 254 panelen · +3 labelstappen · 3 weken |
| Ketsheuvel, Renkum (dec 2024) | 32 woningen · 162 panelen · +5 labelstappen · 2 weken |
| Nieuw-Schoonoord, Velp (juni 2024) | 180 woningen · 300 panelen · +4 labelstappen · 2 weken |
| Schouwburgring, Tilburg (dec 2023) | 160 woningen · 534 panelen |
| Purmerend, Edisonweg 16 (juli 2023) | 216 panelen · 97,7 kW · +3 labelstappen · dynamische vermogensregeling |

Bedrijfsgegevens: Vibe Energy B.V. · Utrechtseweg 310 B46 · 6812 AR Arnhem · KvK 92191487 ·
btw NL865924910B01 · +31 85 060 0489 · info@vibeenergy.nl

Servicebeloftes die blijven staan (toezeggingen, geen metingen): reactie binnen één werkdag,
telefonisch bereikbaar op werkdagen 08:30–17:30, exploitatie mogelijk zonder eigen investering
(per situatie beoordeeld), betrokken na oplevering.

## 6. Wat de site bewust níét heeft

- **Geen certificeringen, keurmerken of lidmaatschappen.** De oude site claimde er geen enkele;
  de nieuwe verzint er dus ook geen en heeft geen trust-badgerij.
- **Geen namen of foto's van medewerkers.** `over-ons.html` had drie rollen zonder naam.
- **Geen klantcitaten.** Nergens in de codebase staat een citaat met attributie.
- **Geen bedrijfsbrede totalen** (aantal projecten, MWp, uptime, CO₂, aantal klanten).
  `over-ons.html` legde die regel zelf al vast: *"Cijfers worden niet ingevuld zolang ze niet
  kloppen."* Die sectie blijft leeg tot de meting er is.
