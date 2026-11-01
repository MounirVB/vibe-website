# Acceptatie — SEO/GEO- en publicatie-integratie Vibe News

**Datum:** 1 november 2026
**Basis:** `d1ec7f0` → **`85043b8`** (PR #60 en #62)
**Migratiestand:** 48 → **49** (`0049_geo_zichtbaarheid.sql`)

> **Leeswijzer.** Per onderdeel staat er expliciet of iets **GEBOUWD**, **GETEST**, **LIVE**,
> **OPERATIONEEL BEWEZEN** of **WACHTEND OP EXTERNE TOEGANG** is. Die vijf zijn niet
> hetzelfde, en dat onderscheid is de helft van dit rapport.

---

## A · Productie-SHA's en migratiestand

| | |
|---|---|
| vorige productie-SHA | `d1ec7f0` |
| **huidige productie-SHA** | **`85043b8`** |
| PR's | #60 (integratie), #62 (zelfcorrectie, zie L) |
| migraties | 48 → **49/49 toegepast, drift 0** |
| nieuwe migratie | `0049_geo_zichtbaarheid.sql` — drie tabellen, één view, geen DML |
| bronnen | 29 → **31**, actief 20 → **22** |

PR #61 is **gesloten zonder merge**: na de squash-merge van #60 conflicteerde die branch.
De wijziging is op een verse branch vanaf `main` opnieuw aangeboden (#62). Geen
force-push.

---

## B · Testresultaten

```
TYPECHECK           PASS   tsc --noEmit, 0 fouten
BRONREGISTER        PASS   31 bronnen, 22 actief, alle actieve met gemeten toestemming
MIGRATIES           PASS   49/49 toegepast, drift 0
APPLICATIEROL       PASS   vibe_intel_app: geen superuser, geen BYPASSRLS, geen eigenaar
INVARIANTEN         PASS   RLS, functierechten, auditspoor, bewijsplicht en claims: 0 bevindingen
SITEKENNIS          PASS   artefact gelijk aan de website (431 gepubliceerde pagina's)
TESTS EENHEID       PASS   714 geslaagd, 0 gefaald
TESTS INTEGRATIE    PASS   458 geslaagd, 0 gefaald
TESTS ADVERSARIEEL  PASS   135 geslaagd, 0 gefaald

EINDOORDEEL = PASS
```

**Totaal 1.307 toetsen**, waarvan 41 nieuw in deze ronde.

De API-toetsen zitten in de integratiesuite (`studio-http.test.ts`,
`autorisatie-goedkeuren.test.ts`) en zijn groen.

### De SITEKENNIS-poort was eerst rood, en terecht

Hij regenereert het artefact uit de echte website en vergelijkt byte voor byte.
WebsiteVersie, paginatelling (431) en soortverdeling waren **identiek**; alleen de
`inhoudsHash` week af. Oorzaak: mijn eigen vocabulairewijziging. Het artefact annoteert
elke pagina met de termen die erin voorkomen, en `congestierapport` bestond gisteren
nog niet. De diff is twee regels:

```
+ "congestierapport": 1,
- inhoudsHash 9723be9f635fd1…
+ inhoudsHash 1fcaa6a3542bd9…
```

Eén websitepagina registreert die treffer. De **onderwerp**verdeling verandert niet, dus
dit raakt geen classificatie-uitkomst. Geregenereerd en gecommit.

### Een bestaande rode suite, eerlijk gemeld — NIET van deze ronde

`test/browser/*.test.ts` geeft **23 van 27**, met 4 falende zaken in de goedkeurflow
(*"De beoordeling kon niet worden vastgelegd"*, en een 409).

**Ik heb de baseline gemeten** in een losse werkboom op `origin/main` = `d1ec7f0`, de
toenmalige productie-SHA: **identiek 23/4, dezelfde vier zaken.** Dit is dus geen
regressie van deze ronde.

Die suite zit **in géén npm-script en in geen CI-stap**, en is daardoor ongemerkt
weggedreven — precies de klasse "poort die niet draait" die dit platform elders al
heeft opgeruimd. Conform de staande regel gerapporteerd en **niet** ongevraagd
gerepareerd: het is een eigen, afgebakend spoor.

---

## C · GSC-property en actuele meetstatus

**GEBOUWD, GETEST, LIVE — en wachtend op twee externe handelingen.**

De namen `INTEL_GSC_*` bestonden tot deze ronde **uitsluitend als labels** in
`kern/config.ts`. Geen regel code las ze, geen API-client, geen dependency.
`GSC_IMPORT_CONTRACT` beschreef een pad dat niet bestond. `src/analytics/gsc.ts` is dat
pad, zonder dependency erbij.

### De autorisatie is gemeten, en in twee stappen gesplitst

Gemeten in productie na de uitrol, via `npm run gsc -- --properties`:

```
identiteit: intel-backup-schrijver@vibe-energy-509410.iam.gserviceaccount.com
herkomst:   INTEL_GCS_SLEUTEL
token:      VERKREGEN (de sleutel werkt)

API UIT — De Google Search Console API staat UIT in het GCP-project 982954656950.
Inschakelen: https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=982954656950
```

**De sleutel werkt; de API staat uit.** Twee verschillende blokkades, twee verschillende
handelingen, en de module houdt ze apart.

**Let op de identiteit.** Dit is het **back-upschrijver**-dienstaccount. Zelfs met de API
aan moet dát account in Search Console aan de property worden toegevoegd — of er moet
een eigen credential komen. Een apart dienstaccount met alleen `webmasters.readonly` is
netter dan het back-upaccount uitbreiden; dat is een eigenaarskeuze.

### De property: nog ONBESLIST, en dat wordt niet meer geraden

Drie documenten spraken elkaar tegen. `kiesProperty()` beslist het niet meer: één
property → die; een voorkeur die **echt bestaat** → die; meerdere zonder voorkeur →
**weigeren met de lijst erbij**. Een voorkeur die níet bestaat valt **niet** terug op een
andere — dat is de gevaarlijkste variant, want een dashboard met cijfers van de
verkeerde property ziet volkomen normaal uit.

Zodra de API aan staat, zegt `npm run gsc -- --properties` in één regel welk
propertytype er werkelijk bestaat. Daarmee is de tegenspraak in de documenten geen
leesprobleem meer maar een meting.

### Actuele meetstatus

| | |
|---|---|
| dekkingsvensters | **0** |
| zoekvraagrijen | **0** |
| laatste ophaling | **NOOIT** |

> **Nul dekkingsvensters betekent niet nul vertoningen.** Het betekent dat er nooit iets
> is opgehaald. Dat onderscheid staat in `intel.analytics_dekking`, in de CLI-uitvoer, in
> het dashboard en in het gezondheidssignaal.

### Wat er is geïmplementeerd

authenticatie (JWT-bearer, `webmasters.readonly`) · propertyontdekking via `sites.list` ·
propertyselectie met drie benoemde uitkomsten · Search Analytics met de dimensies
`date, query, page, country, device` · klikken, vertoningen, CTR en positie ·
zoekopdrachten en landingspagina's · **dagelijkse** synchronisatie (plannertaak,
prioriteit 94, dus vóór `indexatie`) · historische opslag met `epoch_versie` voor een
herverwerkte dag · foutafhandeling met benoemde fasen · dashboardweergave.

### Drie contractregels, elk met een eigen val

1. **`positie_som` is nul-gebaseerd.** De view rekent
   `sum(positie_som)/sum(impressies) + 1`; GSC levert 1-gebaseerd, dus de teller is
   `(positie − 1) × impressies`. Een toets rekent de rondgang na: GSC 3,0 bij 100
   vertoningen → teller 200 → view 3,0. Eén keer verkeerd omrekenen geeft een positie die
   er **een hele plek** naast zit, en dat is aan het getal niet te zien.
2. **`positie_conventie` wordt gemeten**, niet aangenomen — ook niet als de API hem
   documenteert. Een positie onder 1 sluit 1-gebaseerd uit; zonder rijen `onbekend`.
3. **`epoch_versie`** gaat omhoog bij een hersynchronisatie, zodat een herverwerkte dag
   niet stil wordt overschreven.

### De vier toestanden, apart gehouden

| toestand | waar | bron |
|---|---|---|
| technisch bereikbaar | `http_status = 200` | `eigen_meting` |
| in een sitemap | `in_sitemap = true` | `eigen_meting` |
| indexatie **VASTGESTELD** | `geindexeerd = 'ja'` | **alleen `gsc`** |
| indexatie **ONBEKEND** | `geindexeerd = 'onbekend'` | — |

**HTTP 200 wordt nooit als Google-indexering gerapporteerd**, en dat is in vier lagen
afgedwongen: de eigen meting zet `geindexeerd` hard op `onbekend`; alleen een
GSC-waarneming mag `ja`/`nee` zetten; de unieke sleutel bevat de **bron** zodat beide
waarnemingen náást elkaar leven; en `bewaakScheiding()` gooit bij vermenging.

*Zou die sleutel alleen de URL zijn, dan overschreef een eigen meting een GSC-waarneming
met "onbekend" — dan verliest het systeem indexatie door naar zijn eigen site te kijken.*

Huidige stand: **431 bereikbaar, 431 in sitemap, 0 vastgesteld, 431 onbekend.**

---

## D · GEO-meetfunctionaliteit en daadwerkelijk beschikbare metingen

**GEBOUWD, GETEST, LIVE — en nul metingen, bij gebrek aan een modelsleutel.**

"GEO" betekende in deze repository **overal geografie**. Nul tabellen over zichtbaarheid
in AI-antwoorden, geen benchmarkset, geen methode. Migratie 0049 maakt die laag:
`geo_prompts` (met versiebeheer), `geo_metingen` (één rij per **poging**),
`geo_vermeldingen`, en de view `geo_zichtbaarheid_per_prompt`.

### Wat er is geïmplementeerd

beheer van een vaste promptset (8 prompts, de acht gevraagde onderwerpen) ·
**versiebeheer per sleutel** · gecontroleerde periodieke meting (`npm run geozicht`) ·
vastleggen van provider, model en modelversie · merkvermelding mét **positie** ·
bronverwijzingen · geciteerde eigen pagina's · historische vergelijking via de view ·
meetdatum en methodeversie per rij · kosten- en rate-limitbewaking via de **bestaande**
modellaag · dashboard met trends.

### De kerneis: een gecontroleerde modelmeting is geen zichtbaarheid

Elke meting draagt **zes velden** die hem herhaalbaar maken: provider, model,
modelversie, promptversie, methodeversie, meetmoment. Zonder die zes is een getal niet
te herhalen en dus geen meting. Het voorbehoud staat in de migratiekop, in de
kolomcommentaren, in de CLI-uitvoer en **bovenaan** het dashboardblok — niet in een
voetnoot.

### En een ontbrekende meting is geen slechte zichtbaarheid

Drie lagen:

1. **elke poging krijgt een rij**, ook een mislukte, met een *verplichte* reden
   (CHECK-constraint `geo_metingen_niet_gemeten_heeft_reden`);
2. **het aandeel is NULL** bij nul gemeten pogingen — in de view, in `geoStand()` en in
   `geoRonde()`. 0 van 0 is geen nul procent;
3. **de ronde weigert op de deterministische provider.** Dit is de grendel die vandaag
   echt afgaat.

### Daadwerkelijk beschikbare metingen: nul, met de reden

Gemeten in productie na de uitrol:

```
actieve prompts:   8
pogingen totaal:   0
waarvan GEMETEN:   0
aandeel met merk:  NIET GEMETEN

REDEN: er is geen modelsleutel gezet, dus kiesProvider() valt terug op de
DETERMINISTISCHE provider. Die heeft geen kennis van de wereld en kan zichtbaarheid
niet meten; zijn uitvoer als meting boeken zou een verzonnen nulmeting zijn.
```

Dat laatste is de val die zonder deze grendel zou zijn dichtgeslagen: de
deterministische provider noemt zich **wél** beschikbaar.

### Geen GEO-plannertaak, met opzet

Zonder modelsleutel zou elke ronde falen en in de DLQ landen — een zelfgemaakte rode
poort over een bekende grens. De CLI is de gecontroleerde ingang; de monitor meldt
"nooit gemeten" in plaats van "niet zichtbaar". Zodra er een sleutel is, is het
toevoegen van de planregel één wijziging.

**Geen nieuwe betaalde dienst geactiveerd.** De module gebruikt de bestaande modellaag
met zijn allowlist, stroomonderbreker, dagbudget en boekhouding; elke aanroep wordt in
`intel.ai_aanroepen` geboekt, geslaagd of niet.

---

## E · Nieuwe actieve bronnen

**LIVE en OPERATIONEEL BEWEZEN** — acht kandidaten gemeten vanaf de productie-egress met
de platform-UA; het eigen `bepaalToestemming()` had het laatste woord.

| bron | uitkomst |
|---|---|
| **nkl-laadinfra** (NKL Nederland) | ✅ **actief**. robots 173 bytes permissief + Sitemap, 0 uitgesloten user-agents. `/feed` → 200 RSS, 142.143 bytes, 10 items, nieuwste 2026-10-02. Grondslag `syndicatieformaat`. |
| **energie-nederland-nieuws** | ✅ **actief**. robots **14 bytes** (`User-agent: *`, verder niets). `/feed` → 200 RSS, 47.344 bytes, 8 items, nieuwste 2026-10-22. |

`nkl-laadinfra` dicht het grootste dekkingsgat: laadinfrastructuur had **11 van 3.753**
titels, en de inhoudelijk kansrijkste bron (`elaad-laadinfra`) staat terecht uit omdat
zijn robots.txt CCBot uitsluit.

`energie-nederland-nieuws` is inhoudelijk de scherpste: *"wachtrij voor het stroomnet
blijft te lang"*, *"Benut elke beschikbare megawatt"*, *"tijdsafhankelijke nettarieven"*,
*"Voortgang aanpak netcongestie"*.

**Beide met `isPrimaireBron: false`**, en dat is een geleerde les: zo leverde
`netbeheer-nederland-nieuws` 45 lobbyclaims die bij de herbeoordeling allemaal zijn
ingetrokken. Een belangenplatform mag zichzelf niet bevestigen.

### Zes afgewezen, met hun reden in de registerkop

| kandidaat | reden |
|---|---|
| **hollandsolar.nl** | **geen grondslag**, en subtiel — zie hieronder |
| **gopacs.eu** | rechtmatig (`syndicatieformaat`) maar **leeg**: één item, *"Hello world!"*, 28 november 2024. Technisch bereikbaar ≠ technisch betrouwbaar. |
| vemw.nl | geen feed; sitemap op `/l/sitemaps/index`, een vorm die de parser niet kent. Inhoudelijk zeer relevant → vraagt een eigen parsertoets. |
| technieknederland.nl | Sitemap wijst naar een **andere host** (`tnverzekeringen.livits.net`) |
| topsectorenergie.nl | Sitemap wijst naar `energy-innovation.nl` |
| fme.nl | sitemap zonder tekst: wijzigingsdetector, geen nieuwsbron. Afgewezen op **opbrengst**, niet op toestemming. |

**hollandsolar is het leerzame geval, en het laat zien waarom één probe niet genoeg is.**
Mijn eerste meting vlagde `content_signal: true` en `tdm in woorden: true` — dat leest
als een voorbehoud, net als bij RENDO. Het **ruw uitlezen weerlegde dat**: de 1.248 bytes
bevatten uitsluitend de Content-Signals-**toelichting**, zonder user-agentgroep, zonder
Disallow en **zonder directieve `Content-Signal:`-regel**. Volgens hun eigen clausule (c)
wordt er dan *"neither granted nor restricted"*. Niet verboden dus — maar ook niet
uitgenodigd, en zonder feed of Sitemap valt de ladder door naar `geen_grondslag`.

Ze zijn met opzet **geen Bron-rij**: een bron die we nooit ophalen hoort niet in de
bronnenmonitoring mee te tellen.

---

## F · Status KOOP-toegangsverzoek

**VERZENDKLAAR — wachtend op een handeling van een mens.**
`docs/TOEGANGSVERZOEK-KOOP.md`.

De grondslag is **geciteerd**, niet beredeneerd:

> *"Om het hergebruik van deze data mogelijk te maken, is er een technische koppeling
> (ook wel webservice of API genoemd) beschikbaar"* — `overheid.nl`, met de Handleiding
> SRU 2.0 beschreven als *"bedoeld voor ontwikkelaars van partijen die de data van
> Overheid.nl willen ontsluiten"*.

Terwijl `repository.overheid.nl/robots.txt` **26 bytes** `User-agent: * / Disallow: /`
serveert. De doorverwijspagina die het had kunnen oplossen geeft **404**, op beide gemeten
paden.

**Het precedent maakt dit geen uitzonderingsverzoek zonder grond.**
`wetten.overheid.nl/robots.txt` wijst onder de kop `# AI/LLM crawlers` negen generieke
crawlers af met `Disallow: /`, maar geeft **AstralLaw** en **45weg-legal-research** elk
`Allow: /` met `Crawl-delay: 30`. KOOP maakt die uitzonderingen dus al, met naam.

**De officiële route is gemeten**, want de verkeerde route betekent dat het verzoek
nergens aankomt:

| route | uitkomst |
|---|---|
| **`servicedesk.publicatie@logius.nl`** | de Servicedesk Publicatie — **aanbevolen** |
| contactformulier `koopoverheid.nl/service/contact` | tweede weg |
| `overheid.nl/over-deze-site/contact` | **HTTP 410 Gone** |
| `data.overheid.nl/ondersteuning/contact` | HTTP 404 |

**Wat er nodig is om te verzenden:** een afzender met naam en functie, de
verzendhandeling zelf, en een besluit over wat er na een toelating gebeurt. Alle drie
buiten mijn mandaat.

Zolang het openstaat blijven de twee KOOP-bronnen uit, gaat er geen verzoek naar
`repository.overheid.nl`, en wordt er **geen** alternatieve host of andere user-agent
gezocht.

---

## G · Vocabulaire en gebeurtenissoorten

**LIVE en OPERATIONEEL BEWEZEN.**

`congestierapport` en `tariefbeschikking` toegevoegd, elk in enkelvoud en meervoud. Alle
vijf documenten die ze raken worden nu herkend, waar het er **nul** waren:

| versie | bron | nu herkend als |
|---|---|---|
| 18 | acm-besluiten | netbeheer |
| 3673 | acm-besluiten | netcongestie |
| 1325, 1405 | liander-sitemap | netcongestie |
| 3025 | netbeheer-nederland-nieuws | netcongestie |

### Geen onterechte juridische claimbevestiging — gemeten, niet aangenomen

Dit is de kern van de eis. Versie 3673 is een `OFFICIEEL_BESLUIT` van een
`BEVOEGD_GEZAG`, en `magZelfBevestigen()` laat die soort juist **wél** zichzelf
bevestigen. Zou hij claims produceren, dan werden die direct bevestigd.

Gemeten met `extraheerUitspraken()` op de echte `ruwe_tekst`: **nul claims** uit 18, 3673,
1325 en 1405 — ze bevatten geen getal met een eenheid. Versie 3025 geeft één datumclaim
zonder waarde of eenheid, uit een `SECUNDAIRE_BERICHTGEVING` die zichzelf niet mag
bevestigen.

Geen overreik: een losse `congestie` of `tarief` raakt de onderwerpen niet; dat staat als
eigen zaak in de toets.

### `vastgoedverduurzaming` krijgt GEEN eigen gebeurtenissoort

Op het criterium van de opdracht zelf — *"alleen wanneer er een aantoonbaar functioneel
voordeel is"*. Gemeten:

| | |
|---|---|
| gebeurtenissen met soort `vastgoedontwikkeling` | 2 |
| daarvan boven de materialiteitsdrempel (45) | **0** |
| hoogste materialiteit van die twee | 36 |
| brondocumentversies die het vocabulaire raken | 8 (van 3.753) |

Een eigen soort zou vandaag **nul** gebeurtenissen redden. De prijs is wel reëel:
`markt_gebeurtenissen_gebeurtenis_soort_check` draagt elf vaste waarden, dus het is een
**migratie**, en `bouwkansen.ts` en `signalen.ts` rekenen op de huidige naam. Nul voordeel
tegen een schemawijziging plus twee afnemers: **niet uitgevoerd**. De regressietoetsen
leggen het gevolg vast, inclusief de drempel waarop het besluit rust.

---

## H · Nieuwsconcepten en publicatiestatus

**De keten is OPERATIONEEL BEWEZEN. Publicaties: nul, wachtend op menselijke goedkeuring.**

| | |
|---|---|
| `intel.inhoud_versies` | **1** (`ter_review`, `poorten_geslaagd=false`, `goedgekeurd_door=NULL`) |
| `intel.publicatiebesluiten` | 1 — de blokkade, auditeerbaar |
| **`intel.publicaties`** | **0** |

Het concept (`/nieuws/ondernemers-krijgen-in-2026-meer-tijd-voor-subsidieaanvraag-sde`)
is geblokkeerd op `hoog_risico_vereist_mens`. Het draagt `/contact` als CTA in zijn body
en haalt dus ook de nieuwe commerciële poort.

### Hoeveel concepten de bronnen ondersteunen: één, niet drie

| meting | aantal |
|---|---|
| `markt_gebeurtenissen` | 207 |
| met minstens één **bevestigde** claim | **2** |
| daarvan boven de materialiteitsdrempel (45) | 2 |
| daarvan geen signaalsoort | 2 |

Van die twee is er al een concept (kandidaat 199, gebeurtenis 30, SDE++). De andere —
gebeurtenis 35, *"In 2025 ruim € 3 miljard aan milieu-investeringen"*, **4** bevestigde
claims, materialiteit 60 — is **158 dagen oud** (nieuwsgrens 120) en is door de
besluitmotor terecht naar `UPDATE_EXISTING` gerouteerd. Dat is de kernregel van die
motor: bestaat er al een pagina die deze zoekintentie bezit, dan verbeteren we die.

**Drie concepten zou betekenen: de bewijsdrempel verlagen, of nieuws van vijf maanden
oud publiceren.** De opdracht verbiedt beide in zoveel woorden — *"kwaliteit en
commerciële relevantie gaan vóór publicatievolume"*.

De twee nieuwe bronnen veranderen dat op korte termijn niet: beide zijn
`BELANGENBEHARTIGER` met `isPrimaireBron: false`, dus ze kunnen per **ontwerp** geen
bevestigde claim opleveren. Ze verhogen de dekking en de materialiteit, niet het bewijs.

### Geen automatische publicatie — zes constraints, onaangeroerd

`inhoud_versies_goedkeuring_heeft_mens` · `inhoud_versies_vier_ogen` ·
`inhoud_versies_goedkeuring_bindt` · `inhoud_versies_publicatie_vereist_poorten` ·
`voorstellen_goedkeuring_bindt` · `publicatiebeleid_hoog_risico_nooit_automatisch`.
Beleid: `v1-propose-only`, `auto_publiceren_aan = FALSE`.

---

## I · SEO-technische gezondheid

**LIVE.**

| | |
|---|---|
| sitekennisartefact | gelijk aan de website, **431** gepubliceerde pagina's |
| `CURRENT_CANONICAL_INVENTORY` | 431 van 431, **MEASURED** |
| `TECHNICALLY_INDEXABLE` | 431, **MEASURED** |
| `CURRENT_PAGE_INDEXATION` | **431, UNVERIFIED** → wordt MEASURED bij twee dagstanden |
| `GOOGLE_INDEXED` | **NOT_AVAILABLE** (bron `gsc`) |
| sitemap-paden zonder bestand | geen |
| indexeerbaar maar niet in sitemap | 0 |
| interne links in het artefact | 10.622 |

De gates die §4 eist, als poorten: `titel_lengte`, `meta_lengte`, `canoniek_correct`,
`structured_data`, `interne_links_bestaan`, `bronvermelding`, `geen_verzonnen_getallen`,
`kernclaim_heeft_bewijs`, `geen_verlopen_claim`, `geen_onhoudbare_belofte`,
`geen_bronherpublicatie`, `eigendom_van_pagina` — en nieuw:
**`commerciele_doorverwijzing`**.

---

## J · Conversieattributie en beschikbare resultaten

**GEBOUWD: de structurele helft. WACHTEND OP EXTERNE TOEGANG: de meethelft.**

### Wat er nu wel is

De poort **`commerciele_doorverwijzing`**. `interne_links_bestaan` toetst of een link
ergens naartoe gaat dat **bestaat** — een nieuwsbericht dat alleen naar andere
nieuwsberichten linkt haalt die poort en leidt commercieel nergens heen. Dat gat is
gedicht:

- de CTA wordt **in de body** gezocht: een CTA die als metadata bestaat maar niet in de
  tekst staat, bestaat voor een lezer niet;
- **alleen blokkerend voor `nieuw_artikel`**; voor een kennisupdate een advies, want die
  tot een CTA dwingen zou een commerciële zin in een neutrale uitleg persen;
- **een leeg register wordt benoemd** als registerprobleem, zodat een redacteur niet zijn
  tekst gaat herschrijven voor iets dat hij niet kan oplossen.

De 17 commerciële paden: 10 × `oplossing` (`/toepassingen/*`), 6 × `systeem`
(`/energy-hubs`, `/microgrids`, `/systeem-energieopslag`, `/systeem-laadpalen`,
`/systeem-zonnepanelen`, `/vibe-control`) en `/contact`. `regio` is met 349 rijen de
grootste groep maar **geen** commerciële bestemming: dat zijn landingspagina's per gebied,
en een bericht dat daarnaartoe linkt stuurt de lezer naar een variant van zichzelf.

De CTA-koppeling per cluster (`OPLOSSING_PER_CLUSTER`) bestond al en koppelt elk
onderwerp aan een passende product- of dienstenpagina.

### Wat er niet is, en waarom

| eis | status | reden |
|---|---|---|
| doorklikken naar commerciële pagina's meten | **WACHTEND** | GA4 niet aangesloten (3 variabelen ontbreken) |
| offerte- en adviesaanvragen meten | **WACHTEND** | CRM niet aangesloten (2 variabelen); en het leadeindpunt is `dashboard.vibeenergy.nl/api/public/site/lead` — een **ander systeem** |
| conversie koppelen aan landingspagina en kanaal | **WACHTEND** | `intel.attributies` en `intel.funnel_metingen` hebben geen schrijver |
| zakelijke zoekintentie per artikel bepalen | **NIET GEBOUWD** | `intel.zoekintenties` heeft nul verwijzingen in de code; dit vraagt GSC-data om niet-verzonnen te zijn |

**Beschikbare conversieresultaten: nul, en dat is geen nul conversies.** Er is geen
meetkanaal. Zodra GA4 of het CRM is aangesloten, is `intel.funnel_metingen` het
registratiepunt — en `intel.analytics_dekking` zorgt dat "geen rij" dan niet als "nul"
leest.

---

## K · Monitoring en meldingen

**LIVE.** Het e-mailkanaal via Resend blijft het werkende kanaal; een tweede
webhookkanaal is niet vereist en niet gebouwd.

Het signaal `melden/alerteringsbestemming` weegt sinds de vorige ronde **beide** kanalen
en meldt niet langer onterecht `NIET_GECONFIGUREERD`.

### Twee nieuwe signalen, met een drieledige niveaukeuze

| | nooit gemeten | gemeten en recent | gemeten en **gestopt** |
|---|---|---|---|
| `gsc/synchronisatie` | NIET GEMETEN | OK | **FOUT** na 3 dagen |
| `geo/zichtbaarheidsmeting` | NIET GEMETEN | OK | **FOUT** na 8 dagen |

Die derde tak is het punt: een koppeling die een maand werkte en daarna stilviel is
precies wat een monitor moet vinden, en met alleen "is er data" zou dat onzichtbaar
blijven. Drempels zijn gemotiveerd: GSC drie dagen (de taak is dagelijks en Google levert
met twee dagen vertraging), GEO acht dagen (die ronde kost modelaanroepen).

**Geen valse alarmen:** "nooit gemeten" is NIET GEMETEN en geen FOUT — dat wacht op
externe toegang, niet op een reparatie. Een mislukte probe geeft NIET GEMETEN in plaats
van stil OK.

Wat §9 noemt is gedekt: bronnen (`ingestie/*`), planner (`planner/hartslag`), worker
(`worker/hartslag`, `wachtrijachterstand`, `verlopen leases`, `dead-letter queue`),
claims (`database/motorpariteit` + de drie invariantfuncties), nieuwsconcepten en
publicaties (`publicatie/*`), GSC-synchronisatie, GEO-metingen. **Conversie-events**
blijven `koppelingen/analytics en CRM` → NIET GEMETEN, want er is niets om te meten.

---

## L · Exacte resterende externe afhankelijkheden

Vijf, en geen ervan is technisch geblokkeerd door dit platform.

1. **Search Console API inschakelen** in GCP-project `vibe-energy-509410` (nummer
   982954656950).
   → `https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=982954656950`
   *Eén handeling. Daarna zegt `npm run gsc -- --properties` welk propertytype bestaat.*
2. **Een dienstaccount aan de Search Console-property toevoegen**, met minstens de
   machtiging *Beperkt*. Een GCP-rol geeft die toegang niet. De huidige identiteit is het
   **back-upschrijver**-account; een apart account met alleen `webmasters.readonly` is
   netter.
3. **Een modelsleutel** (`OPENAI_API_KEY`) op `vibe-intel-worker`, als de GEO-meting
   echt moet draaien. Zonder sleutel weigert de ronde met opzet.
4. **Het KOOP-verzoek verzenden** naar `servicedesk.publicatie@logius.nl`, met een
   afzender met naam en functie.
5. **GA4 en/of CRM aansluiten**, als doorklikken en conversies gemeten moeten worden.
   GA4: 3 variabelen. CRM: 2 variabelen.

### En een zelfcorrectie die ik moet melden

**De `gsc`-taak maakte van een bekende grens een dagelijkse DLQ-rij.** Mijn eerste
handler gooide op *elke* blokkade met `herhaalbaar: false`, en zo'n fout gaat in dit
platform rechtstreeks naar de DLQ. De taak is **dagelijks** en de API staat uit in
afwachting van handeling 1 — dus elke dag een nieuwe DLQ-rij, en het DLQ-signaal dat ik
in dezelfde ronde juist van `LET OP` naar **FOUT** zette zou daar permanent rood op
staan. Twee veranderingen die los verdedigbaar zijn en samen een zelfgemaakt vals alarm
opleveren.

Gevonden door door te denken over de consequentie, niet door een rode toets — en vóór de
eerste plannerronde. Gerepareerd in PR #62: de vier fasen die op een **mens** wachten
(`credential`, `api_uit`, `propertytoegang`, `propertykeuze`) zijn geen taakfout meer; een
echte storing (`token`, `sites.list`, `searchAnalytics`) gooit wel, en **herhaalbaar**.

De eis uit §10 blijft gedekt, want die werd nooit door die `throw` afgedwongen maar door
de module: bij elke blokkade **geen dekkingsrij**, en zonder venster leest niets als "nul
vertoningen".

---

## M · Definitief GO/NO-GO

```
BASE SHA / FINAL SHA  = d1ec7f0 / 85043b8
TYPECHECK   = PASS (0 fouten)
BUILD       = n.v.t. (geen bundelstap in intelligence/)
TESTS       = eenheid 714/714, integratie 458/458, adversarieel 135/135
POORT       = PASS (9 van 9 stappen)
MIGRATIES   = 49/49 toegepast in productie, drift 0
INVARIANTEN = 0 / 0 / 0 bevindingen
BRONNEN     = 31, waarvan 22 actief
NIET GEDRAAID = npm run lint — bestaat niet als script in intelligence/
                bronnen --verifieer — schrijft 31 rijen, buiten deze opdracht
RODE POORTEN  = test/browser/*.test.ts geeft 23/27. BASELINE GEMETEN op de
                vorige productie-SHA d1ec7f0: identiek 23/4, dezelfde vier
                zaken. GEEN regressie van deze ronde; die suite zit in geen
                npm-script en in geen CI-stap.
PUSHED = YES   DEPLOYED = YES
EINDOORDEEL = GO
```

**GO**, met deze grens er expliciet bij: de engine is **gebouwd, getest en live**, en
**operationeel bewezen** voor alles wat zonder externe toegang te bewijzen is — de
ingestieketen, de claimverificatie, de conceptbouw met zijn poorten, de eigen
indexatiemeting, de twee nieuwe bronnen, de monitoring.

Wat **nog niet is bewezen** is wat per definitie buiten dit platform ligt: er staan nul
GSC-rijen en nul GEO-metingen, en dat zijn geen nullen maar **ontbrekende metingen**. Elke
laag die ze toont zegt dat ook — in de database, in de CLI, in het dashboard en in de
monitor. Dat was de eis, en dat is waar dit rapport op staat.
