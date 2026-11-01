# Acceptatie — stabilisatieronde Vibe News + SEO/GEO

**Datum:** 1 november 2026
**Basis:** `origin/main` = `3bf89aa` → **`3969cf6`** (PR #58, squash-merge)
**Migratiestand:** 47 → **48** (`0048_herbeoordeling_stempel.sql`)

---

## A · De rode draad, en drie weerlegde premissen

Eén klasse fout verbindt bijna alle bevindingen: **een laag die zijn eigen greep
kwijtraakt en dan stil groen geeft.** Niet een rode poort, niet een foutregel —
een getal dat op niets rust.

Drie dingen die de opdracht veronderstelde, bleken bij het nameten niet te
kloppen. Dat staat hieronder per onderdeel, want een reparatie op een onjuiste
premisse is geen reparatie.

| premisse van de opdracht | gemeten werkelijkheid |
|---|---|
| "de meldketen bezorgt niets" | Het **mailkanaal werkt**: 27/27 door Resend geaccepteerd met `provider_id`, 0 mislukt, 0 opgegeven. Alleen de webhook staat uit. |
| "de 403 van RENDO is het probleem" | De bindende grond is een **Artikel 4-voorbehoud**, niet de 403. Met een HTTP 200 mogen we de inhoud evenmin verwerken. |
| "nul koppelingen betekent dat de verificatie te streng is" | De trefferkant van de join is **structureel leeg**. Geen enkele voorwaarde binnen `verifieerBijGezag()` is de knellende factor. |

---

## B · §2 Claimherbeoordeling — structureel gerepareerd

**De gemeten fout.** 3753 van 3753 brondocumentversies op `documentsoort-v2`,
`npm run herbeoordeel` selecteerde **0** claims, en claim 29 stond op
`bewijs_kwaliteit` 2 terwijl v2 voor ONTWERPBESLUIT bij BELANGENBEHARTIGER
plafond **1** geeft.

**De oorzaak.** De greep luidde
`u.modaliteit_versie is distinct from <X> or bv.documentsoort_versie is distinct from <Y>`.
De tweede helft leest een veld van het **brondocument**, en de taak
`documentclassificatie` werkt dat bij op **prioriteit 21** terwijl
`herbeoordeling` op **22** staat. In dezelfde ronde was de greep al weg voordat
de herbeoordeling keek. De classificatie **wiste het versieverschil waarop de
herbeoordeling selecteert** — geen fout in een van beide taken, maar in hun orde.

**De reparatie.** Migratie 0048 zet de stempel op de **claim**
(`intel.uitspraken.herbeoordeeld_onder`), onafhankelijk van de classificatie. De
kolom start NULL, dus elke bestaande claim werd eenmalig selecteerbaar — de
bedoelde gecontroleerde sweep. Geen DML in de migratie.

Drie schrijfpaden stempelen: `schrijfUitspraken()` (een claim wordt bij zijn
**geboorte** gewogen), `herbeoordeelClaims()`, en `schaalcorrectie.ts` — waar de
stempel **erft** en niet geforceerd wordt, want een kloon van een ongewogen claim
moet ongewogen blijven.

**De verwachte correctie is gemeten.**

| | vóór | ná |
|---|---|---|
| claim 29 `bewijs_kwaliteit` | 2 | **1** |
| claim 29 `bewijskracht_plafond` | 2 | **1** |
| `herbeoordeeld_onder` | NULL | `documentsoort-v2 + claimmodaliteit-v1` |

Auditspoor (`intel.audit_gebeurtenissen`, append-only):
`{"bewijs_kwaliteit": 2}` → `{"bewijs_kwaliteit": 1, "bewijskracht_plafond": 1, "documentsoort": "ONTWERPBESLUIT", "documentsoort_gezag": "BELANGENBEHARTIGER"}`.

**Ronde-uitslag:** 59 bekeken, 59 herbeoordeeld, 5 bevestigingen **behouden**, 0
ingetrokken, **1 bewijskracht verlaagd**, 0 menselijke oordelen geraakt.
**Idempotent:** ronde 2 en 3 zien 0.

**Invarianten ná de ronde:** claims openstaand **0**, claiminvarianten **0**,
claims boven hun plafond **0**.

**De tegenproef zit in de toets.** `herbeoordeling-stempel.test.ts` speelt de
productiestand na — versie al geclassificeerd, claim al op de huidige
modaliteitsversie — en rekent de **oude** voorwaarde letterlijk na met de eis dat
die **nul** vindt. Met de oude greep terug in de code: **4 van de 7 zaken vallen
om.**

---

## C · §3 Primaire-bronverificatie — nul koppelingen is juist

**Er is niets geforceerd om een hoger getal te halen.** Over de hele database
hangen **0** claims met rol `primair` aan een OFFICIEEL_BESLUIT of
OFFICIELE_REGELGEVING. Voorwaarde `documentsoort in (...)` geeft al nul vóórdat
het tijdvenster, de modaliteitseis of het bundelfilter iets kan uitsluiten.

De uitslag staat **twee lagen eerder** vast:

- **0 van de 28** ACM-versies wordt ooit een gebeurtenis — `herkenOnderwerpen()`
  geeft er nul treffers, en zonder gebeurtenis schrijft `clusteren.ts` geen
  claims;
- de 19 ankers zijn RSS-fragmenten van 146–454 tekens, en **0 van de 19** bevat
  een getal met een eenheid. 17 van de 19 gaan over mededinging, openbaarheid of
  de Data Governance Act.

Een koppeling zou dus ook met een soepeler motor onvindbaar zijn.

**Drie reparaties, geen van drie een versoepeling** (`BRONVERIFICATIE_VERSIE` →
`bronverificatie-v4`):

1. **AMBIGU telde claimrijen in plaats van documenten.** Twee claims uit
   hetzelfde besluit gaven "welke van die besluiten beschrijft deze
   navertelling". In productie: **6 groepen** claims op dezelfde versie met
   identieke grootheid. Het samenvouwen gebeurt uitsluitend **binnen** één
   document; twee documenten geven nog steeds AMBIGU, dus de richting is
   asymmetrisch.
2. **Een claim die de werkvoorraad verlaat hield zijn oordeel.** Claim 29 droeg
   een v3-oordeel met gezag ACM terwijl zijn versie nu ONTWERPBESLUIT is met
   gezag NULL. `ruimVervallenOordelenOp()` schrijft **uitsluitend** naar "niet
   bevestigd" en kan per constructie geen bevestiging toekennen.
3. **Het commentaar sprak de code tegen.** `bronnenVanGezag('TenneT')` = `[]` —
   een netbeheerder is geen bevoegd gezag. De filter is bewust **ongewijzigd**;
   alleen de tekst is gelijkgetrokken, en `gezagsbronnen.test.ts` (10 zaken) zet
   nu beide leesrichtingen vast.

**Eigen fout, door een eigen toets gevonden:** mijn opruimstap was eerst **niet
idempotent** — de stempel bleef gevuld, dus elke ronde pakte de rij opnieuw.

---

## D · §4 Nieuwsselectie en de twee DLQ-taken

**De DLQ-taken zijn langs de bedoelde weg hervat**
(`npm run worker -- --dlq-hervat --soort nieuwsselectie`, pogingen op nul). De
oorzaak was aantoonbaar weg: de ronde van 07:05 leest
`context GELDIGE_CONTEXT_MET_EIGENAARS via artefact (13 clusters met eigenaar)`.
Beide taken **slaagden** in plaats van terug te vallen.

| | vóór | ná |
|---|---|---|
| taken in DLQ | 2 | **0** |
| `nieuwsselectie` gereed | 59 | **61** |

**Het echte gat stond erachter** — zie §F.

De nieuwsselectie zelf levert 1 geschikt van 207, en dat is inhoudelijk juist:
de zwaarste gronden zijn 68× "geen bevestigde uitspraak" en 63× "materialiteit
onder de drempel". Dat is geen motorprobleem maar de bewijsdrempel die doet wat
hij moet doen.

---

## E · §5 RENDO — gecontroleerd geblokkeerd op de TDM-grond

Gemeten vanaf de **productie-egress** met de platform-UA (HTTP 200, 2.676 bytes,
server cloudflare):

```
Content-Signal: search=yes,ai-train=no,use=reference
# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF
# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ...
```

plus **32** user-agentgroepen met `Disallow: /`, waarvan **13** op onze eigen
TDM-lijst. Het register zei `geen_voorbehoud`; Cloudflare serveert twee varianten
en productie krijgt de **strengere** (zonder Yoast-blok, zonder lege `Disallow`).
`bepaalToestemming()` geeft `ai_crawler_uitgesloten` en `mogenVerwerken=false` —
**het platform zegt hier zelf nee**, op stap 2 van de ladder, die zwaarder weegt
dan de syndicatiegrond waarop deze bron leunde.

**Productiestand ná `zaai`:** `rendo-nieuws` = `actief=false`,
`tdm_status=voorbehoud`. `robotsStatus` blijft `toegestaan`: **crawlen mag,
hergebruiken niet.**

**De conceptbrief is INGETROKKEN.** `docs/TOEGANGSVERZOEK-RENDO.md` vroeg om een
firewalluitzondering op de grond dat de uitgever niets had voorbehouden —
precies wat hij wél had gedaan. Verzenden zou RENDO's beleid verkeerd weergeven
en toegang vragen die we daarna niet mogen gebruiken.

**Er is geen rechtmatig alternatief kanaal.** Een Artikel 4-voorbehoud geldt het
**werk** van de uitgever, niet een adres; een ander endpoint of een zusterhost is
niet rechtmatiger. Kosten in dekking: **nul** — deze bron heeft in 8
ophaalpogingen nooit één document geleverd.

Bijvangst: `storing_sinds` = 20 oktober is niet het begin van de storing maar het
moment waarop de classificatie van `TOEGANG_BEPERKT` naar `CDN_BLOKKADE` sprong.
De eerste 403 staat op **2026-10-10 12:02:56Z**, tien dagen eerder dan elk
signaal meldde.

---

## F · §9 De nieuws-naar-conversieketen — de harde stop is weg

De nieuwsselectie schrijft `NEWS_ITEM`, en die soort stond in **geen enkele**
selectie: `cli/concept.ts` had een handgeschreven lijst zonder NEWS_ITEM, de taak
`voorstel` eist `UPDATE_EXISTING` **mét** een `doel_pagina_id`, en het dashboard
importeert `maakConcept` niet. Kandidaat 199 (score 70, open sinds 29 oktober)
tegenover **0** rijen in `intel.inhoud_versies` — terwijl `concept.ts` NEWS_ITEM
wél ondersteunt en hem op soort `nieuw_artikel` afbeeldt.

De lijst staat nu **één keer**, als `CONCEPTEERBARE_BESLUITEN` in
`inhoud/concept.ts`. Negatieve proef: NEWS_ITEM uit die constante halen maakt 2
van de 3 zaken in `concepteerbare-besluiten.test.ts` rood.

**De keten is end-to-end bewezen in productie**, op kandidaat 199, zonder
modelaanroep:

```
GEBLOKKEERD  kandidaat 199   versie 1   /nieuws/ondernemers-krijgen-in-2026-meer-tijd-voor-subsidieaanvraag-sde
             model: deterministisch
             !! hoog_risico_vereist_mens
```

| | vóór | ná |
|---|---|---|
| `intel.inhoud_versies` | 0 | **1** (`ter_review`, `poorten_geslaagd=false`, `goedgekeurd_door=NULL`) |
| `intel.publicatiebesluiten` | 0 | **1** (de blokkade, auditeerbaar) |
| `intel.publicaties` | 0 | **0** |

Dat is precies het ontworpen gedrag: het concept wordt **gebouwd**, en de poort
**blokkeert** het tot een mens goedkeurt. Er is niets gepubliceerd.

---

## G · §6 Monitoring — vijf gaten in de signalering

De bezorging werkt; de **signalering** was stuk.

| # | gat | gemeten bewijs | reparatie |
|---|---|---|---|
| 1 | het alerteringssignaal ontkende het werkende kanaal | 438 rondes `NIET_GECONFIGUREERD` naast 27 geaccepteerde Resend-berichten | weegt nu **beide** kanalen; nul kanalen geeft nog steeds NIET GEMETEN |
| 2 | verkeerde tokennaam in het advies | `INTEL_MELD_WEBHOOK_TOKEN` komt 1× voor (de adviestekst), `INTEL_MELD_TOKEN` is wat de code leest | gecorrigeerd; wie het oude advies volgde kreeg stil een **ongeauthenticeerde** POST |
| 3 | DLQ-groei kon nooit alarmeren | in de **hele historie** van `intel.meldingen` bestaat geen rij met niveau `LET OP`; ondertussen 2 taken in de DLQ bij drempel 1 | DLQ-signaal nu **FOUT** boven de drempel — bewust alleen dit signaal |
| 4 | motorpariteit had geen meethaak | `grep` over de repo: alleen de drie CLI's en een toets; nul treffers in `gezondheid.ts` | signaal in groep `database`, dus **CRITICAL** bij FOUT; mislukte probe geeft NIET GEMETEN |
| 5 | een verdwenen signaal sloot zijn melding nooit | 3 van de 6 open FOUT-meldingen waren zombies terwijl er nog **één** bron met een storingssoort stond | elke soort uit de taxonomie wordt nu uitgegeven, bij nul bronnen op OK |

**Wat er NIET is gedaan en waarom:** `LET OP` breed meldwaardig maken. Dat zou
elk bestaand LET OP-signaal in één ronde een melding laten openen en het
dagoverzicht van toestand doen veranderen — een **mailburst als neveneffect van
een reparatie**. De onjuiste belofte in `meldernst.ts` is gecorrigeerd in plaats
van laten staan.

**`INTEL_MELD_WEBHOOK` blijft uit.** Aan de codekant is niets te bouwen:
`bezorgMeldingen()` is compleet, met retry, timeout, geredigeerde fout en host in
de bestemming. Wat ontbreekt is één **invoer** die ik niet mag verzinnen: een
https-URL die een mens als bestemming voor bedrijfsgegevens heeft goedgekeurd.
Die hoort op `vibe-intel-worker` (de service die de gezondheidstaak uitvoert),
niet op de planner.

---

## H · §7 Alle 29 bronnen en de officiële routes

**Nul drift tussen code en productie** voor alle 29 bronnen op `actief`,
`betrouwbaarheid`, `robots_status` en `tdm_status` — vooraf gemeten, want
`npm run zaai` draait in het `preDeployCommand` en raakt álle 29. De
genormaliseerde diff gaf **exact twee regels**: `rendo-nieuws` en
`rvo-subsidie-sitemap`. Geen bijvangst.

**`rvo-subsidie-sitemap` staat weer AAN — de latere meting geldt.** De
`inactiefReden` beweerde "HTTP 500 bij onze user-agent". Niet meer
reproduceerbaar: met **exact dezelfde** platform-UA geeft
`https://www.rvo.nl/sitemap.xml` HTTP 200, 1.860.473 bytes `application/xml`, 3
van 3 pogingen vanaf een werkstation **en** vanaf de productie-egress. 12.973
`<url>`-blokken, 12.973 `<lastmod>`. Er is niets omzeild: de serverkant is
veranderd, niet onze kant. Toestemming dubbel en citeerbaar — robots.txt kondigt
de sitemap zelf aan (0 uitgesloten user-agents) en RVO verklaart hergebruik in
eigen woorden. Dit is de **enige** van de zes BEVOEGD_GEZAG-bronnen die vandaag
met bewijs aan kan.

*Eerlijk over de opbrengst:* 0 van zijn 400 eerdere versies had tekst. Een
sitemap levert url, lastmod en titel. Verwacht hier geen claims van, wél de
houdbaarheidssignalen waarvoor `intel.uitspraken` is gebouwd. Het is een
ophaling van 1,86 MB per dag.

**KOOP / Staatscourant / Gemeenteblad: GEEN rechtmatige route.** Zeven hosts
hermeten, alle zeven HTTP 200 op robots.txt:

| host | robots.txt | uitkomst |
|---|---|---|
| `repository.overheid.nl` | 26 bytes: `User-agent: *` / `Disallow: /` | **NEE** — poort 1 valt, onvoorwaardelijk |
| `zoek.` en `www.officielebekendmakingen.nl` | 196 bytes, sluit alleen AhrefsBot uit | poorten open, maar **geen machineleesbare route** (`/sru` en `/atom/stcrt` → 404) en geen `Sitemap:`-regel → `geen_grondslag` |
| `data.overheid.nl` | 4.458 bytes, `Disallow: /` voor ClaudeBot, CCBot, GPTBot, OAI-SearchBot, Google-Extended, PerplexityBot, Applebot(-Extended), Bytespider, TikTokSpider | **NEE** — `ai_crawler_uitgesloten`, ondanks de landelijke open-datacatalogus |
| `wetten.overheid.nl` | 5.918 bytes, 70 groepen, kop `# AI/LLM crawlers ... Disallow` | **NEE** — zelfde grond |
| `www.koopoverheid.nl` | 64 bytes, geen enkele Disallow, sitemap aangekondigd | **JA** — en waardeloos: KOOP's organisatiesite, draagt geen bekendmakingen |
| `www.rvo.nl` | 583 bytes, 9 Disallows onder `/tvl/`, sitemap aangekondigd | **JA** — zie hierboven |

**De botsing, geciteerd omdat ze de kern van het beleidsbesluit is.**
`www.overheid.nl/over-deze-site/informatie-hergebruiken` zegt letterlijk: *"Om
het hergebruik van deze data mogelijk te maken, is er een technische koppeling
(ook wel webservice of API genoemd) beschikbaar"*, met een link naar de
Handleiding SRU 2.0. De uitgever **nodigt met woorden uit en sluit met robots
af** — op twee hosts tegelijk, want `www.overheid.nl` zelf sluit ClaudeBot en
GPTBot ook volledig uit. De doorverwijzing naar de hergebruikpagina geeft **404**:
die verklaring is **niet gevonden**, niet weerlegd.

**De route die wél bestaat is een afspraak, geen crawler.**
`wetten.overheid.nl` laat twee **met naam genoemde** juridische
onderzoekscrawlers toe (`AstralLaw`, `45weg-legal-research`, elk met `Allow: /`
en `Crawl-delay: 30`) terwijl alle generieke AI-crawlers `Disallow: /` krijgen.
Dat is het bewijs dat KOOP per aanvrager een uitzondering maakt. De weg is een
schriftelijke aanvraag met de hergebruikverklaring als grondslag. **Bereikbaarheid
is hier niet hetzelfde als toestemming** — en dat is nu vastgelegd, zodat de
volgende ronde `data.overheid.nl` niet als "open data, dus mag" voorstelt.

**De drie andere uitgezette bronnen met een robotsgrond zijn hermeten en hun
redenen staan overeind:** `elaad-laadinfra` (CCBot met `Disallow: /` onder
`# Block high load scrapers`), `solar-magazine` (GPTBot `Disallow: /`),
`logistiek-hotspots` (robots.txt onbereikbaar: 3× HTTP 429, redirect naar
`wp-login.php` — unreachable volgens RFC 9309, dus geen leesbaar beleid).

---

## I · §8 De SEO/GEO-meetlaag

**Wat zonder autorisatie kon, draait nu.** `meetLive()` meet per URL de
HTTP-status, de aanwezigheid in sitemap.xml en of de canonical klopt, en heeft
**geen credential** nodig: het is onze eigen site. Maar de enige aanroeper was
`npm run analytics -- --meet`, en die werd in productie door niets gestart.
`intel.indexatie_status` stond daardoor op **0** rijen terwijl de code er al was.

De dagelijkse plannertaak `indexatie` doet hem nu, mét `--alles`-semantiek, en
bouwt het rapport **ná** de meting. Een mislukte meting sleept de dagstand niet
mee — die is de primaire opbrengst van de taak.

**Gemeten in productie:**

| | vóór | ná |
|---|---|---|
| `intel.indexatie_status` | 0 rijen | **431** rijen |
| HTTP-verdeling | — | **431× 200**, 431 in sitemap, 431 `geindexeerd='onbekend'` |
| `CURRENT_PAGE_INDEXATION` | `NOT_AVAILABLE` | **431, UNVERIFIED** |
| `GOOGLE_INDEXED` | `NOT_AVAILABLE` | `NOT_AVAILABLE` (bron `gsc`) |

`UNVERIFIED` en niet `MEASURED`, want één dag eigen meting is geen trend; dat
wordt `MEASURED` zodra er twee dagstanden staan. En **geen cijfer is
opgewaardeerd**: `bron` staat hard op `eigen_meting`, `geindexeerd` op
`onbekend`, het bewijsveld begint met *"LET OP: dit is bereikbaarheid, niet
indexatie"*, en `bewaakScheiding()` werpt bij vermenging.

**Twee manifestdefecten gerepareerd.** `args` stond op
`["src/cli/analytics.ts", "--ingest"]`, en de string `ingest` komt **nul** keer
voor in die CLI: de job zou dagelijks **groen** draaien zonder iets te
ingesteren. En `INTEL_GOOGLE_AUTH` wordt door **geen enkele regel code** gelezen
(1 yaml, 4 markdownregels, 0 TypeScript) — dat staat er nu bij, want een
variabele die niemand uitleest suggereert een workload-identity-stroom die er
niet is.

**De GSC-property is ONBESLIST, en dat is nu op beide plekken vastgelegd.**
`R2-GSC-TOEGANG.md` (29 okt) zegt URL-prefix mét een expliciete afwijzing van de
domeinproperty; `seo-meetplan-en-analytics.md` (13 okt) zegt domeinproperty en
"hoeft niet gewijzigd te worden"; `seo-release-3-2.md` noemt het nog als open
actie. Het nieuwere document draait het oudere terug **zonder het te noemen**, en
het manifest volgt het oudere niet. Welk propertytype **bestaat** is alleen binnen
Search Console te zien — precies de ontbrekende autorisatie. Een keuze maken zou
een besluit verzinnen. Zonder dit besluit faalt de eerste koppeling met 403/404
op een property die wél bestaat, en dat **leest als "geen data"** in plaats van
"verkeerde identiteit".

**Twee verouderde documentregels gecorrigeerd:** de dagelijkse Cloud Run Job is
niet uitgerold maar de bewaring **is** geautomatiseerd (de Railway-planner doet
`indexatie` dagelijks), en `CURRENT_CANONICAL_INVENTORY` is **431 van 431** en
niet "430 van 447" — dat laatste mengde 448 HTML-bestanden met 431
sitemap-URL's en 433 registerrijen.

**GEO betekent in deze repo GEOGRAFIE.** Er is geen benchmarkset, geen meettabel
en geen vastgelegde methode voor zichtbaarheid in AI-antwoorden; `intel.geo_*` is
een regiolaag. De `ai_*`-tabellen horen bij inhoud**generatie**, en
`src/cli/benchmark.ts` is een **prestatie**benchmark. Dit is een **bouwbesluit**,
geen credentialprobleem: er is niets om te autoriseren. Een methode moet eerst
bepalen wat een meetpunt is — welke promptset, welk model, welke datum, wat telt
als vermelding — anders ontstaat er een cijfer zonder noemer, en
`koppelingen.ts:21` verbiedt dat expliciet.

---

## J · Twee bevindingen die zijn GEMETEN en NIET gebouwd

Omdat bouwen hier dekking zou verzinnen. Beide staan met hun getal in de code,
op de plek waar ze gelden.

**1 · `elektrificatie` is een dode sleutel in `ZAKELIJKE_THEMACLUSTERS`** — geen
onderwerp, geen cluster, geen route, dus de 8 punten van het
`zakelijk_thema`-component zijn onbereikbaar. Maar een **zakelijk** vocabulaire
zou vandaag **nul** documenten raken. Over alle 3753 versies, titels:

| patroon | treffers |
|---|---|
| `industri\w* warmtepomp` | **0** |
| `e-boiler` / `elektrische boiler` | **0** |
| `procesverwarming` / `proceswarmte` | **0** |
| `elektrificat\w*` | **0** |
| `warmtepomp` (generiek) | 57, waarvan **11** met een expliciet particulier signaal |
| `elektrificat\w*` in de **body** | 24 |

En die 57 halen de zeef niet: `raakt()` eist één sterke of twee zwakke
titeltermen, en `warmtepomp` is een zwakke. **Dit is een brongat, niet een
vocabulairegat** — net als bij `ems` (0 van 3753 titels met een van de vijf
sterke termen). Wat dit thema nodig heeft is een **bron**, en het kiezen daarvan
is een eigenaarsbesluit met een eigen toestemmingstoets.

**2 · `vastgoedverduurzaming` kan per constructie nooit nieuws worden** —
`gebeurtenisSoortVan()` beeldt het af op soort `vastgoedontwikkeling`, en die
staat in `SIGNAALSOORTEN`. Elke gebeurtenis over energielabel, label-C-plicht of
Paris Proof wordt dus afgewezen, **ongeacht bewijs of materialiteit**. Maar:

- gemeten impact **vandaag is nul** — de twee gebeurtenissen (218, 259) staan op
  materialiteit **36**, onder de drempel van 45, dus ze vallen ook zonder deze
  grond af;
- de zuivere reparatie vraagt een **migratie**:
  `markt_gebeurtenissen_gebeurtenis_soort_check` draagt **elf vaste waarden**,
  gemeten op productie;
- hij raakt `commercieel/bouwkansen.ts` en `commercieel/signalen.ts`, die op de
  huidige naam rekenen.

Bij nul impact, een schemawijziging en twee afnemers is dit een eigenaarsbesluit
en geen stille reparatie.

---

## K · §10 Poort en regressie

Verse database, alle 48 migraties, `INTEL_NETWERK_TOEGESTAAN=1` voor de
sitekennisstap:

```
TYPECHECK           PASS   tsc --noEmit, 0 fouten
BRONREGISTER        PASS   29 bronnen, 20 actief, alle actieve met gemeten toestemming
MIGRATIES           PASS   48/48 toegepast, drift 0
APPLICATIEROL       PASS   vibe_intel_app: geen superuser, geen BYPASSRLS, geen eigenaar
INVARIANTEN         PASS   RLS, functierechten, auditspoor, bewijsplicht en claims: 0 bevindingen
SITEKENNIS          PASS   artefact gelijk aan de website (431 gepubliceerde pagina's)
TESTS EENHEID       PASS   701 geslaagd, 0 gefaald
TESTS INTEGRATIE    PASS   430 geslaagd, 0 gefaald
TESTS ADVERSARIEEL  PASS   135 geslaagd, 0 gefaald

EINDOORDEEL = PASS
```

**De poort draaide de toetsen eerst anders dan `npm test`**, en dat was een echt
gat: hij liet `--import ./test/netwerk-uit.ts` weg en gaf de operatoromgeving
door. Met netwerk aan (nodig voor sitekennis) ging `volledigetekst.test.ts`
**werkelijk het internet op** en viel om op zijn eigen assertie. De poort was dus
**strenger dan de suite** om een reden die niets met de code te maken had — en
had bij een andere vlag net zo goed **milder** kunnen zijn. Dat laatste is het
echte risico.

**Nieuwe toetsen in deze ronde:**

| bestand | zaken | wat het vastzet |
|---|---|---|
| `test/integratie/herbeoordeling-stempel.test.ts` | 7 | de stempel op de claim, mét de oude greep als tegenproef |
| `test/eenheid/gezagsbronnen.test.ts` | 10 | beide leesrichtingen van `EIGEN_GEZAG_NAMEN`, met de reden per lege uitkomst |
| `test/eenheid/concepteerbare-besluiten.test.ts` | 3 | één bron van waarheid voor de concepteerbare besluiten |
| `bronverificatie-grenzen.test.ts` zaak 12 en 13 | 2 | AMBIGU per document; de opruimstap mét idempotentie |
| `plannerpauze.test.ts` zaak 8c | 1 | de 0048-tak in de motorpariteit, op een database op stand 47 |

---

## L · §11 Uitrol, en een gat in mijn eigen werk

**Route:** `main` is beschermd (3 verplichte checks, strict, `enforce_admins`),
dus uitsluitend via PR. **PR #58**, alle drie de checks SUCCESS, squash-merge →
`3969cf6`.

**Het deployvenster was eerst NIET gedekt.** De nieuwe code **leest**
`intel.uitspraken.herbeoordeeld_onder` in de claimpoort, en die poort staat vóór
de besluitmotor, de nieuwsselectie, de voorstellenlaag en de conceptgeneratie.
Alleen `vibe-intel-api` draagt een `preDeployCommand`, dus in het venster loopt
de nieuwe worker- en plannercode tegen het oude schema. Productie stond op 47.
Zonder pariteitstak is dat een **kryptische 42703** op elk van die paden — exact
het gat dat ik eerder bij 0046 vond en hier eerst opnieuw liet staan.

Twee dingen heb ik daarbij fout gedaan, en een eigen toets vond beide: de tak
stond **vóór** de v2-as (zodat de weigering naar 0048 wees terwijl 0045 het
lagere nummer is), en hij meldde hardgecodeerd `databaseVersie: "v1"` —
feitelijk onjuist op stand 47, waar de database wél v2 is.

**Uitrolverificatie:**

| controle | uitkomst |
|---|---|
| migraties | 47 → **48**, `0048_herbeoordeling_stempel.sql` |
| kolom `herbeoordeeld_onder` | bestaat |
| functie `intel_priv.controleer_claiminvarianten` | bestaat |
| `zaai` wijzigde | **exact 2** bronnen (rendo uit, rvo-sitemap aan); 20 actief, ongewijzigd aantal |
| claims zonder stempel direct ná de migratie | 59 → poort **dicht** (bedoelde sweep) |
| ná de herbeoordeling | **0** openstaand, poort **open** |
| invarianten (3 functies) | **0 / 0 / 0** bevindingen |
| taken in DLQ | **0** |
| taken mislukt (laatste uur) | **0** |
| publicaties | **0** |

**De uitrolorde klopt en is gemeten:** `herbeoordeling` staat op prioriteit **22**,
vóór `beoordelen` (30), `nieuwsselectie` (35) en `voorstel` (60). De eerste
planner­ronde na de migratie stempelt dus alle claims vóórdat een laag bewijs
wil wegen.

**Niet gedaan, met reden:**

- **geen plannerpauze** — de herbeoordeling is eenzijdig (kan alleen intrekken)
  en idempotent, en de taakorde dekt het venster. Een pauze zou hier geen risico
  wegnemen.
- **geen `bronnen --verifieer`-ronde** — die schrijft `robots_gecontroleerd_op`
  voor alle 29 bronnen en valt buiten deze opdracht. Daarom staan 27 bronnen
  terecht nog op meetdatum 10 oktober en de twee hermeten bronnen op 1 november.
- **geen Google Cloud-sleutelrotatie** — expliciet buiten deze opdracht.
- **geen productiesecrets gewijzigd.**

---

## EINDOORDEEL

```
BASE SHA / FINAL SHA  = 3bf89aa / 3969cf6
TYPECHECK   = PASS (0 fouten)
BUILD       = n.v.t. (geen bundelstap in intelligence/)
TESTS       = eenheid 701/701, integratie 430/430, adversarieel 135/135
POORT       = PASS (9 van 9 stappen)
MIGRATIES   = 48/48 toegepast in productie, drift 0
INVARIANTEN = 0 / 0 / 0 bevindingen
NIET GEDRAAID = npm run lint — bestaat niet als script in intelligence/
                bronnen --verifieer — buiten de opdracht, schrijft 29 rijen
                GEO als AI-zichtbaarheid — bestaat niet; bouwbesluit
RODE POORTEN  = geen
PUSHED = YES   DEPLOYED = YES
EINDOORDEEL = PASS
```

### Wat op een beslissing van de eigenaar wacht

1. **Het GSC-propertytype** (`sc-domain:` of URL-prefix). Alleen binnen Search
   Console te zien. Zonder dit besluit faalt de eerste koppeling met 403/404 en
   leest dat als "geen data".
2. **Een webhookbestemming**, als er een tweede meldkanaal moet komen. Eén
   goedgekeurde https-URL op `vibe-intel-worker`, optioneel met
   `INTEL_MELD_TOKEN`. Het mailkanaal werkt al.
3. **Een bron voor industriële elektrificatie en EMS.** Beide thema's hebben nu
   nul dekking, en dat is een brongat met een eigen toestemmingstoets.
4. **Een eigen `gebeurtenis_soort` voor vastgoedverduurzaming**, als dat thema
   nieuws moet kunnen worden. Vraagt een migratie; impact vandaag nul.
5. **Een aanvraag bij KOOP** voor een benoemde user-agent op
   `repository.overheid.nl`, als Staatscourant en Gemeenteblad commercieel nodig
   zijn. Dat is de enige citeerbare route; elke andere is omzeiling.
