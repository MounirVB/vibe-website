# Toegangsverzoek KOOP — VERZENDKLAAR, nog niet verstuurd

**Status: verzendklaar. Er is niets verstuurd.** Het verzenden vraagt één handeling van een mens;
zie paragraaf 5.

Dit verzoek vraagt KOOP om een benoemde user-agent toe te laten op `repository.overheid.nl`, zodat
de SRU-webservice gebruikt kan worden waarvoor de uitgever hem zelf aanbiedt.

---

## 1 · Waarom dit nodig is: de uitgever nodigt uit en sluit af

Twee feiten van dezelfde uitgever, beide op **1 november 2026** gemeten vanaf onze
productieomgeving met onze eigen user-agent.

**De uitnodiging.** `https://www.overheid.nl/over-deze-site/informatie-hergebruiken` (HTTP 200)
zegt letterlijk:

> "Om het hergebruik van deze data mogelijk te maken, is er een technische koppeling (ook wel
> webservice of API genoemd) beschikbaar waarmee eenvoudig kan worden gezocht in de data van
> Overheid.nl."

met een verwijzing naar de **Handleiding SRU 2.0**, en die handleiding is daar beschreven als
*"bedoeld voor ontwikkelaars van partijen die de data van Overheid.nl willen ontsluiten"*. Dat is
precies wat wij zijn.

**De afsluiting.** `https://repository.overheid.nl/robots.txt` is exact **26 bytes**:

```
User-agent: *
Disallow: /
```

En dat is de host waar de SRU-service staat. Wij respecteren dat: de bron staat bij ons **uit** en
er gaat geen enkel verzoek naartoe. Ook `www.overheid.nl` zelf sluit ClaudeBot, GPTBot, CCBot,
OAI-SearchBot, Google-Extended, PerplexityBot, Applebot, Bytespider en TikTokSpider volledig uit.

**De doorverwijzing die het had kunnen oplossen, bestaat niet.** De uitnodigingspagina verwijst
naar *"Op officielebekendmakingen.nl vindt u meer informatie over het hergebruik van publicaties"*.
Die pagina geeft **HTTP 404** (gemeten op 1 november 2026, zowel op
`/informatie-hergebruiken` als op `/help/officiele-bekendmakingen/bestanden-en-hergebruik`).

---

## 2 · Waarom een benoemde user-agent de gangbare weg is

Dit is geen uitzonderingsverzoek zonder precedent. KOOP maakt die uitzonderingen **al**, met naam.

Gemeten in `https://wetten.overheid.nl/robots.txt` (HTTP 200, 5.918 bytes, 70
user-agentgroepen): onder de kop `# AI/LLM crawlers` krijgen GPTBot, ChatGPT-User, OAI-SearchBot,
ClaudeBot, Claude-Web, anthropic-ai, CCBot, PerplexityBot en cohere-ai elk `Disallow: /`.

Maar **twee met naam genoemde juridische onderzoekscrawlers krijgen juist toegang**:

```
User-agent: AstralLaw
Allow: /
Crawl-delay: 30

User-agent: 45weg-legal-research
Allow: /
Crawl-delay: 30
```

Dat is het bewijs dat KOOP per aanvrager afweegt en toelaat. Wij vragen hetzelfde, op dezelfde
voorwaarden.

---

## 3 · Het conceptbericht

> **Aan:** KOOP — Servicedesk Publicatie (Logius)
> **Onderwerp:** verzoek tot toelating van een benoemde user-agent op repository.overheid.nl (SRU)
>
> Geachte heer, mevrouw,
>
> Wij zijn Vibe Energy B.V., een Nederlandse aanbieder van zakelijke energieoplossingen. Wij
> volgen officiële publicaties over netcongestie, nettarieven en energieregelgeving om onze
> zakelijke klanten feitelijk juist te informeren.
>
> Op `www.overheid.nl/over-deze-site/informatie-hergebruiken` biedt u de SRU-webservice aan en
> beschrijft u de Handleiding SRU 2.0 als bedoeld voor ontwikkelaars van partijen die de data van
> Overheid.nl willen ontsluiten. Wij willen daar graag gebruik van maken.
>
> De SRU-service staat op `repository.overheid.nl`, en die host serveert
> `User-agent: * / Disallow: /`. Wij respecteren dat en halen daar op dit moment **niets** op. In
> `wetten.overheid.nl/robots.txt` zien wij dat u twee met naam genoemde juridische
> onderzoekscrawlers wél toelaat, met `Allow: /` en `Crawl-delay: 30`. Daarom dit verzoek: wij
> zouden graag op dezelfde manier worden toegelaten.
>
> **Onze gegevens:**
>
> - **User-Agent:** `VibeEnergyIntelligence/0.1 (+https://www.vibeenergy.nl; contact: sales@vibeenergy.nl)`
> - **Beoogd gebruik:** het volgen van publicaties in de Staatscourant en het Gemeenteblad over
>   energieonderwerpen (netcongestie, nettarieven, energieregelgeving, omgevingsvergunningen voor
>   energieprojecten), om zakelijke klanten feitelijk juist te informeren.
> - **Welke paden:** uitsluitend `/sru` met een zoekvraag; geen bulkdownload, geen volledige
>   oogst van het archief.
> - **Frequentie:** eenmaal per 24 uur, maximaal 50 records per opvraging.
> - **Crawl-delay:** wij houden ons aan elke `Crawl-delay` die u opgeeft; 30 seconden is voor ons
>   geen bezwaar.
> - **Wat wij bewaren:** titel, publicatiedatum, officiële URL en een eigen samenvatting. Wij
>   nemen geen publicatieteksten integraal over en wij publiceren geen afgeleide bestanden.
> - **Bronvermelding:** elke verwijzing noemt de officiële publicatie en linkt ernaar.
> - **Hosting:** Railway (europe-west4).
> - **Contact:** sales@vibeenergy.nl
>
> Mocht toelating niet mogelijk zijn, dan laten wij het hierbij — wij omzeilen de robotsregels
> niet en zoeken geen alternatieve host. Een andere route of een andere afspraak horen wij in dat
> geval graag.
>
> Met vriendelijke groet,
>
> *(naam, functie)*
> Vibe Energy B.V. — sales@vibeenergy.nl — +31 85 060 0489

---

## 4 · De officiële route, gemeten

KOOP valt onder **Logius**. Gemeten op 1 november 2026:

| route | uitkomst |
|---|---|
| `https://www.koopoverheid.nl/contact` | HTTP 200, leidt naar `/service/contact` |
| Servicedesk | **`servicedesk.publicatie@logius.nl`** — "Onze Servicedesk helpt u met vragen over de producten of diensten van Logius" |
| Secretariaat | `secretariaat.publicatie@logius.nl` en `secretariaat@koop.overheid.nl` |
| Contactformulier | op `koopoverheid.nl/service/contact`, met het blok "Contact met KOOP" |
| `https://www.overheid.nl/over-deze-site/contact` | **HTTP 410 Gone** — deze route bestaat niet meer |
| `https://data.overheid.nl/ondersteuning/contact` | HTTP 404 |

**De aanbevolen route is de Servicedesk Publicatie van Logius**, met het contactformulier op
koopoverheid.nl als tweede weg. De oude contactpagina van overheid.nl is weg (410), dus een verzoek
dat daarop mikt komt nergens aan.

---

## 5 · Wat er nodig is om dit te verzenden

Drie dingen, alle drie buiten wat ik kan doen:

1. **Een afzender met naam en functie.** Het concept laat dat open; een verzoek om een
   uitzondering hoort van een aanspreekbaar persoon te komen.
2. **De verzendhandeling zelf.** Een e-mail naar `servicedesk.publicatie@logius.nl` of het
   contactformulier. Ik verstuur geen bericht naar een externe partij.
3. **Een besluit over wat er daarna gebeurt.** Wordt de user-agent toegelaten, dan moeten in
   `src/bronnen/register.ts` de twee KOOP-bronnen van `actief: false` naar `true`, en moet de
   `inactiefReden` vervangen worden door de toelating met de datum erbij. Dat is een aparte,
   kleine wijziging — niet iets om vooruit te bouwen op een toelating die er nog niet is.

**Wat er NIET gebeurt zolang dit verzoek openstaat.** De twee KOOP-bronnen blijven uit, er gaat
geen verzoek naar `repository.overheid.nl`, en er wordt geen alternatieve host of andere
user-agent gezocht. Dat laatste is uitdrukkelijk geen optie: dat zou omzeiling zijn, en dat het
technisch zou werken is geen argument.

---

## 6 · Wat deze toegang zou opleveren

Eerlijk over de waarde, want een verzoek zonder inzet is ook niet eerlijk.

De Staatscourant en het Gemeenteblad zijn **de enige bron voor OFFICIEEL_BESLUIT buiten de ACM**.
Gemeten op 1 november 2026: van de 3.753 brondocumentversies in productie zijn er **19** een
OFFICIEEL_BESLUIT, en alle 19 komen van één bron (`acm-besluiten`). Die 19 zijn RSS-fragmenten van
146–454 tekens en bevatten geen enkel getal met een eenheid, waardoor er geen verifieerbare claim
uit komt.

Met de SRU zouden er volledige besluitteksten binnenkomen van een bevoegd gezag — precies het
documentsoort dat in dit platform een claim mag bevestigen. Dat is de ontbrekende schakel in de
juridische keten, en de reden dat dit verzoek de moeite waard is.
