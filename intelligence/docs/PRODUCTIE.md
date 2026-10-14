# Productie — topologie, variabelen, migratieveiligheid en uitrol

**Gemeten op 10 oktober 2026. `main` staat op `2886583`.**

> ## De belangrijkste regel van dit document
>
> **Het intelligenceplatform IS uitgerold.** Sinds 10 oktober 2026 draaien
> er drie services en een privaat bereikbare PostgreSQL 17.11 in
> Railway-project `authentic-eagerness`, env `production`. De 14 migraties
> zijn toegepast, er is uit live bronnen opgehaald, en het dashboard is
> over HTTPS geauthenticeerd bereikbaar.
>
> Dit document beschreef tot deze versie het tegenovergestelde. Die regel
> is vervangen, niet aangevuld: hij is onwaar geworden.
>
> **Wat nog NIET waar is, en waarom dat hier staat:**
>
> - ~~**Er is geen duurzame back-upretentie.**~~ **ACHTERHAALD — gemeten
>   14 oktober 2026.** Deze regel zei dat de back-up alleen naar een
>   ephemere containerschijf schrijft. Dat is niet meer waar: er is een
>   externe bestemming in Google Cloud Storage, en de garanties zijn
>   nagemeten op `vibe-intel-worker`:
>
>   | | gemeten |
>   |---|---|
>   | externe kopie | **11 dumps** in `gs://vibe-energy-intel-backups`, nieuwste **1,1 uur** oud (974 kB) |
>   | frequentie | dagelijkse taak; `intel.taken` toont drie geslaagde runs (12, 13 en 14 oktober) |
>   | RPO | 24 uur, met een signaaldrempel op **26 uur** (`DREMPELS.backupLeeftijdUren`) |
>   | checksum | sha256 per dump, bij upload naar GCS opnieuw berekend en vergeleken; manifest met rijtellingen per tabel; `pg_restore --list` bewijst de structuur |
>   | restorebewijs | **PASS**, 10/10 controles, restore in 2979 ms op de echte productieback-up (14 oktober 03:26 UTC, `--doel-url`-vorm); vastgelegd in `intel.taken` id 547 |
>   | retentie | levensduurbeleid van de bucket: **35 dagen** live, **7 dagen** voor niet-actuele versies (overgenomen uit `ops/gcsopslag.ts`; zie hieronder — niet verifieerbaar) |
>   | verwijderrecht | de dienstaccount heeft `objectCreator` + `objectViewer` en **GEEN delete** — een proces dat alles opruimt bestaat niet |
>
>   Wat Railway's eigen back-upschema's betreft blijft gelden dat die een
>   Pro-workspace vragen en dat de workspace `hobby` is. Dat is hier
>   alleen niet langer het hele verhaal: de retentie loopt niet via
>   Railway maar via de bucket.
>
>   **Niet onafhankelijk geverifieerd:** of het levensduurbeleid van de
>   bucket werkelijk op 35/7 dagen staat. Dat is overgenomen uit de
>   toelichting in `ops/gcsopslag.ts`; het uitlezen van bucketconfiguratie
>   vraagt een recht dat `objectViewer` niet heeft. De 11 aanwezige dumps
>   zijn met dat beleid consistent, maar bewijzen het niet.
>
>   **Let op bij het meten.** `npm run gezondheid` moet op
>   **`vibe-intel-worker`** draaien. Alleen die service draagt
>   `INTEL_GCS_*` en voert de back-uptaak uit; op `vibe-intel-api` meldde
>   dezelfde code `CRITICAL — map /app/backups bestaat niet` omdat hij de
>   bucket niet kan zien. Sinds 3.0.7 leest het signaal daarom ook
>   `intel.taken`, dat op elke service hetzelfde zegt.
>
>   **En sinds 3.0.8 geldt dat ook voor het RESTOREbewijs.** Dat was het
>   laatste back-upsignaal dat nog van de meetplaats afhing: het bewijs
>   lag alleen in de bucket, dus `vibe-intel-api` meldde
>   `NIET GEMETEN — geen bewijs van een restoretest gevonden` en dat werd
>   in een kritiek domein `CRITICAL`. `npm run restoretest` legt het
>   bewijs nu op **drie** plekken vast:
>
>   | bestemming | rol |
>   |---|---|
>   | `gs://…/restoretest/<ISO-tijd>-<runid>.json` | het originele bewijs, duurzaam en **onveranderbaar** — ook bij een FAIL, want de lezer kiest de nieuwste en nooit de beste |
>   | `intel.taken`, soort `restoretest` | de **gezaghebbende** stand: gedeeld, dus op elke service hetzelfde. Payload draagt tijdstip, uitslag, aantal controles, restoreduur, dumpnaam, sha256 en de URI van het originele bewijs |
>   | `backups/.laatste-restoretest.json` | lokale terugval voor een machine zonder bucket |
>
>   De regel staat in `ops/restorebewijs.ts`: status `gereed` alleen bij
>   PASS **met alle** `VEREISTE_RESTORETOETSEN` geslaagd; ontbrekend,
>   verlopen (> 30 dagen), onvolledig of mislukt bewijs is nooit OK; en
>   spreken de bucket en het logboek elkaar tegen, dan is dát de
>   bevinding — niet de gunstigste van de twee. De back-up-RPO (26 uur)
>   en de restoreleeftijd (30 dagen) zijn **onafhankelijke** eisen: een
>   verse dump bevredigt de restore-eis niet.
>
>   **En sinds 3.0.8 is het bucketbewijs ONVERANDERBAAR.** Dat moest,
>   want het vaste pad werkte precies één keer. Gemeten op 14 oktober
>   2026, 03:26 UTC, tijdens de eerste productieproef met registratie:
>
>   ```
>   HTTP 403 — intel-backup-schrijver@…iam.gserviceaccount.com does not
>   have storage.objects.delete access to the Google Cloud Storage object
>   ```
>
>   Overschrijven is in GCS intern delete + create. Google bevestigde de
>   rechten zelf via `testIamPermissions`:
>
>   | recht | stand |
>   |---|---|
>   | `storage.objects.create` | **toegekend** |
>   | `storage.objects.get` | **toegekend** |
>   | `storage.objects.list` | **toegekend** |
>   | `storage.objects.delete` | **NIET toegekend** |
>   | `storage.buckets.get` | **NIET toegekend** (403 op de bucketconfiguratie) |
>
>   Dat ontbrekende delete-recht is een gewenste eigenschap en is **niet
>   aangevraagd**. In plaats daarvan schrijft elke run naar een eigen
>   naam — `restoretest/<ISO-tijd>-<runid>.json` — met
>   `ifGenerationMatch=0`, zodat onveranderbaarheid uit de aanroep volgt
>   en niet uit een IAM-besluit dat morgen anders kan zijn. Een herhaalde
>   poging van dezelfde run geeft dan HTTP **412** ("bestaat al") in
>   plaats van een 403 die niet van een rechtenprobleem te onderscheiden
>   is. `restoretest/laatste.json` blijft staan als bevroren legacy-object
>   (483 bytes, 13 oktober 13:28 UTC) en wordt niet verwijderd.
>
>   **Retentie en kosten van het bewijs — wat meetbaar is en wat niet.**
>
>   | | stand op 14 oktober 2026 |
>   |---|---|
>   | objecten in de bucket | **25**, samen **9,1 MB** |
>   | waarvan dumps | 11, oudste 2026-10-12, nieuwste 2026-10-14 |
>   | waarvan restorebewijs | 1 (`laatste.json`, 483 bytes) |
>   | groei van het bewijs | ~500 bytes per run, **één run per week** → ~26 kB per jaar |
>   | levensduurbeleid | **NIET verifieerbaar**: `storage.buckets.get` geeft 403 |
>
>   De kosten van onveranderbaar bewijs zijn dus verwaarloosbaar; de
>   dumps domineren de bucket volledig. Het risico zit elders en is
>   eerlijk gezegd niet weg te meten: **als het levensduurbeleid
>   werkelijk 35 dagen is, worden bewijsobjecten ouder dan 35 dagen
>   verwijderd.** Voor het SIGNAAL is dat geen probleem — dat kijkt naar
>   de nieuwste en de drempel is 30 dagen — maar het betekent dat de
>   bucket geen langetermijnarchief van restorebewijs is. Dat archief is
>   `intel.taken`: daar staat geen retentie op en er bestaat geen
>   delete-recht voor de applicatierol.
>
>   **De cadans is sinds 3.0.8 automatisch:** `restoretestronde`,
>   wekelijks op **zondag 03:00 UTC**, via de bestaande planner en worker
>   (`PLAN` in `kern/taken.ts`). Vier kansen binnen één drempel van 30
>   dagen, dus één gemiste week kan het bewijs nooit laten verlopen.
>   Overlappende runs zijn uitgesloten met een advisory lock
>   (`pg_try_advisory_lock`, het eerste in deze codebase); een tweede
>   proef die start terwijl de eerste loopt, meldt dat en registreert
>   niets.
>
>   **Drie bekende grenzen van deze opzet, niet gerepareerd:**
>
>   1. `worker/verlopen leases` gaat op LET OP bij een restore die langer
>      dan `LEASE_SECONDEN` (300) duurt, met het advies "de volgende ronde
>      legt ze terug" — maar `geefVerlopenTerug()` draait uitsluitend bij
>      het **opstarten** van een worker. De productieproef deed 2979 ms,
>      dus dit is voorlopig theoretisch; de adviestekst is wel onjuist.
>   2. **Geen enkel signaal meet of de wekelijkse ronde ooit draait.**
>      Valt de cadans stil, dan merkt alleen `backup/restoretest` dat, en
>      pas na 30 dagen. Dat is de bedoelde werking — vier kansen binnen
>      één drempel — maar het betekent dat een kapotte planning vier weken
>      onzichtbaar is.
>   3. `ops/gcsopslag.ts` heeft **geen tokencache**: elke `lijstGcs` en
>      elke `downloadUitGcs` vraagt een eigen OAuth-token. De
>      inventarisatie kost daarmee tot vier tokenaanvragen per uurlijkse
>      gezondheidsmeting (`maxKandidaten` staat op 3, niet 5, juist
>      hierom). Goedkoop in geld, niet gratis in latency en quota.
> - ~~**Er is geen meldbestemming voor alerts.**~~ **GEDEELTELIJK
>   ACHTERHAALD — 3.0.9.** De bestemming is aangewezen
>   (`marketing@vibeenergy.nl`) en het hele pad is gebouwd en getoetst,
>   maar **nog niet aangezet**: `INTEL_MELD_WEBHOOK` staat op geen enkele
>   service. Zolang dat zo is, verstuurt het platform niets — dat is de
>   afspraak, geen tekort.
>
>   | | |
>   |---|---|
>   | weg | `POST /api/meld` op `vibe-website-api`, met bearer-token, dat de JSON van `bezorgMeldingen()` omzet in een Nederlandse zakelijke mail |
>   | provider | **Resend**, hergebruikt; dezelfde sleutel en hetzelfde geverifieerde afzenderdomein (`no-reply@vibeenergy.nl`) als de brochuremail sinds augustus 2026. Geen tweede provider, geen abonnement |
>   | ontvanger | `marketing@vibeenergy.nl`, **vast op de server**. Een aanroeper die zijn eigen ontvanger mag opgeven, maakt van dit pad een open mailrelay |
>   | aanzetten | `INTEL_MELD_WEBHOOK=https://vibe-website-api-production.up.railway.app/api/meld` plus `INTEL_MELD_TOKEN` gelijk aan `MELD_TOKEN` op de api |
>
>   **Vier niveaus, drie ritmes.** KRITIEK (FOUT of NIET GEMETEN in een
>   kritiek domein: database, authenticatie, backup) en FOUT gaan
>   direct; NIET GEMETEN daarbuiten gaat in **één dagelijkse
>   samenvatting** (taaksoort `meldsamenvatting`, prioriteit 97); een
>   melding die sluit levert één HERSTEL-bericht. Retries met
>   exponentiële back-off van 1, 4, 16 en 64 minuten — vóór 3.0.9 werd
>   er elke ronde opnieuw geprobeerd, dus bij een uurlijkse taak was de
>   teller na vijf uur leeg en gebeurde er daarna nooit meer iets.
>
>   **Bundeling.** Meldingen die over dezelfde bron gaan worden één
>   bericht. De bronsleutel is een **vastgelegd feit** (`bron_sleutel`,
>   migratie 0040) dat de gezondheidsmeting alleen zet als er
>   aantoonbaar precies één bron in het spel is — niet een vondst in de
>   meettekst, want die wordt op 160 tekens afgekapt en dan zou een
>   signaal over vijf bronnen er één tonen.
>
>   **De tien die openstonden worden geen tien mails.** Gemeten
>   routering van de stand van 14 oktober: drie directe berichten (de
>   drie RENDO-signalen als één bundel, plus `ingestie/storingssoort
>   TIJDELIJKE_STORING` en `backup/aanwezigheid`) en één
>   dagsamenvatting met de overige vijf. **Vier mails voor tien
>   meldingen.** Boven drie losse berichten in één ronde wordt het
>   bovendien één achterstandsoverzicht.
> - **Vijf koppelingen zijn NIET AANGESLOTEN** (GSC, Bing, GA4, CRM,
>   AI-model). Elke funnelstap blijft daarmee ONBEKEND, en dat is geen nul.
> - ~~**Er is geen AI-maandplafond.**~~ **PRECIEZER GEMETEN — 3.0.9.**
>   De technische begrenzing BESTAAT en wordt afgedwongen:
>   `budgetStand()` wordt vóór elke betaalde modelaanroep gecontroleerd
>   (`inhoud/concept.ts`), en `ops/aibeheer.ts` **weigert** een betaalde
>   aanroep zolang er geen monetair maandplafond is óf zolang er
>   aanroepen met onbekende kosten in de maand staan. Onbeperkte
>   AI-kosten zijn dus nu al onmogelijk — niet omdat er een plafond
>   staat, maar omdat er geen staat.
>
>   | soort begrenzing | stand |
>   |---|---|
>   | administratief budget | **bestaat niet**; een bedrag is een besluit van de eigenaar en staat nergens in code |
>   | interne softwarematige limiet | **actief**. Dag: 200 aanroepen, 400k uittokens, 2000 ophalingen. Maand: alle drie de kolommen **NULL** → elke betaalde aanroep wordt geweigerd |
>   | door de provider afgedwongen | **niet gezet en niet vanuit code te zetten**; een bestedingslimiet in het OpenAI-account zelf is de enige die ook aanroepen buiten dit platform stopt |
>
>   Wat er nodig is om de interne limiet te ACTIVEREN in plaats van te
>   blokkeren: (1) een bedrag, via het nieuwe
>   `npm run ai -- --plafond --kosten-per-maand <bedrag> --valuta EUR`;
>   (2) een tarief in `intel.ai_prijzen` (nu **0 rijen**), want zonder
>   prijs per miljoen tokens blijven de kosten ONBEKEND en weigert de
>   poort alsnog; (3) een model op de allowlist, die nu leeg is. Gemeten:
>   0 AI-aanroepen ooit, 0 geschatte kosten.
> - **Er is nul inhoud gepubliceerd.** Dat is de bedoelde uitkomst van het
>   publicatiecontract, geen tekort.
>
> Waar hieronder "lokaal bewezen" staat, betekent dat nog steeds: het werkt
> op deze machine tegen een lokale database, en níét dat het in productie
> is aangetoond. Wat in productie is gemeten, staat als zodanig benoemd.

---

## 1. Wat er nu echt in productie staat

Gemeten via de Railway-API en tegen de live site.

| | |
|---|---|
| Railway-project | `authentic-eagerness` (`7c8d796e-bf0a-4ee5-88c8-6bcfa1b5c10a`) |
| Omgeving | `production` (`3d83cc3e-ddb5-400c-96b2-4cea2bdd5993`) |
| Workspace | mounirvb's Projects, plan `hobby` |

Het project draagt **zes** services. Vijf staan op dezelfde repository
`MounirVB/vibe-website`; Postgres is een image:

| service | id | rol | branch | deploy |
|---|---|---|---|---|
| **`vibe-website`** | `0e3c1eee-47ad-4e52-aaf6-7eb9892e0229` | de statische site | `main` | `2886583`, SUCCESS |
| `vibe-website-api` | `e225ebbc-7bc4-4eed-b9b8-ff7166367895` | Express-brochuredienst | `main` | `59535f3`, RUNNING |
| `vibe-intel-api` | `05a8cf60-b579-4498-99c9-8994f48b95c5` | dashboard, `/gereed` | `main` | SUCCESS |
| `vibe-intel-worker` | `61e563db-3941-4705-80a0-c00b7c81de3f` | wachtrijverwerker | `main` | SUCCESS |
| `vibe-intel-planner` | `1022a174-e360-47dd-9bee-9a249e1c5348` | cron `0 * * * *` | `main` | SUCCESS |
| `Postgres` | `eb4591cb-c6ef-4e05-b31c-4200378f23e2` | PostgreSQL 17.11 | image | SUCCESS |

**Twee valkuilen die deze uitrol echt gekost hebben, en die je terugkrijgt
als je de database ooit opnieuw opbouwt:**

1. **Railway meldde `RUNNING` terwijl Postgres in een herstartlus zat.**
   Het volume hield een datadirectory van major 18; de pg17-image weigert
   die te openen. De enige aanwijzing stond in de logs:
   *"This image runs PostgreSQL 17 but the data directory holds major
   version 18."* Opgelost door `PGDATA` naar
   `/var/lib/postgresql/data/pgdata17` te zetten, zodat pg17 vers
   initialiseert — er is niets gewist. Dit is precies waarom een
   deploystatus geen bewijs van gezondheid is.
2. **`${{PORT}}` is geen Railway-variabele.** Hij loste op naar een lege
   string, waarna de config stil terugviel op zijn standaard. Zet `PORT`
   en `INTEL_DASHBOARD_POORT` expliciet.

De statische service:

- builder **RAILPACK**, `railpack.json` = `{"provider":"staticfile"}`,
  resolveert **Caddy 2.11.4**
- `buildCommand` **null**, `startCommand` **null**, `rootDirectory`
  **null**, `watchPatterns` **leeg**
- aangepast domein **`www.vibeenergy.nl`** → poort 8080; servicedomein
  `vibe-website-production.up.railway.app`
- de **repowortel is de webroot**, en de gegenereerde HTML staat gecommit

**Gevolg: elke push naar `main` is een productiedeploy van de hele
repowortel.** Er is geen filter op paden.

> **Val waar deze sessie in trapte, en die blijft liggen:** de checkout
> `~/projects/vibe-website` is met `railway link` verbonden aan
> `vibe-website-api`, niet aan de statische service. `railway status` in
> die map wijst dus naar een service die de site niet serveert en die
> maanden achterloopt. Vraag altijd het project op en kies de service
> expliciet.

### Wat er NIET in productie staat

| onderdeel | status |
|---|---|
| intelligenceplatform (de Node-app) | **NIET UITGEROLD** — geen service, geen container, geen host |
| productiedatabase | **BESTAAT NIET** — alleen `vibe_intel_dev` op `localhost:5433` |
| wachtrijworker | **NIET UITGEROLD** — lokaal bewezen, zie §5 |
| planner | **NIET UITGEROLD** — lokaal bewezen, zie §5 |
| Intelligence Center (dashboard) | **NIET UITGEROLD** — lokaal bewezen op `127.0.0.1` |
| `/nieuws` op de live site | **NIET GEPUBLICEERD** — route staat op PENDING, 0 goedgekeurde artikelen |

---

## 2. Omgevingsvariabelen

Alleen namen. Waarden horen in de secret store van de host, niet in een
document en niet in de repository (`intelligence/.gitignore` sluit
`.env` uit).

### Verplicht om te starten

| variabele | waarvoor | gedrag als hij ontbreekt |
|---|---|---|
| `INTEL_OMGEVING` | `ontwikkel` \| `test` \| `productie` | valt terug op `ontwikkel`; dan géén Secure-cookie en géén HSTS |
| `INTEL_DB_URL` | Postgres-verbinding | elke CLI stopt met een configuratiefout |
| `INTEL_ORGANISATIE` | tenantsleutel, nu `vibe-energy` | `organisatie 'undefined' bestaat niet` |
| `INTEL_SESSIE_GEHEIM` | HMAC voor het sessiekoekje, ≥32 tekens | **het dashboard weigert te starten** |

### Verplicht voor een veilige productieopstelling

| variabele | standaard | waarom |
|---|---|---|
| `INTEL_DB_APP_ROL` | `vibe_intel_app` | de rol die de applicatie aanneemt; bezit niets, geen BYPASSRLS |
| `INTEL_DB_ONDERHOUD_ROL` | `vibe_intel_onderhoud` | alleen voor geo-synchronisatie |
| `INTEL_DASHBOARD_BIND` | `127.0.0.1` | zie §4 |
| `INTEL_DASHBOARD_ACHTER_TLS_PROXY` | `false` | moet expliciet aan vóór een niet-loopback binding in productie |
| `INTEL_DASHBOARD_POORT` | `4320` | |
| `INTEL_SITE_WORTEL` | de repowortel | waar het routeregister staat |
| `INTEL_SITE_BASIS_URL` | — | `https://www.vibeenergy.nl` |
| `INTEL_NETWERK_TOEGESTAAN` | `1` | de testsuite zet dit op `0` |
| `INTEL_LOG_NIVEAU` | `info` | |

### Optioneel — zolang ze ontbreken blijft de laag NIET AANGESLOTEN

| koppeling | variabelen | huidige status |
|---|---|---|
| AI-model | `OPENAI_API_KEY` | **geconfigureerd, `vertrouwd=false`** — nog niet tegen de echte API gevalideerd |
| Search Console | `INTEL_GSC_CLIENT_EMAIL`, `INTEL_GSC_PRIVATE_KEY`, `INTEL_GSC_SITE_URL` | **NIET AANGESLOTEN**, alle 3 ontbreken |
| GA4 | `INTEL_GA4_PROPERTY_ID`, `INTEL_GA4_CLIENT_EMAIL`, `INTEL_GA4_PRIVATE_KEY` | **NIET AANGESLOTEN**, alle 3 ontbreken |
| Bing | `INTEL_BING_API_KEY`, `INTEL_BING_SITE_URL` | **NIET AANGESLOTEN**, beide ontbreken |
| CRM | `INTEL_CRM_SOORT`, `INTEL_CRM_TOKEN` | **NIET AANGESLOTEN**, beide ontbreken |

Zonder die variabelen blijft elke funnelstap **ONBEKEND** — en ONBEKEND
is niet nul. Dat is afgedwongen en getoetst (E2E-scenario 16, plus een
adversariële toets).

### Twee dingen die hier bewust NIET gebeuren

1. **Geen meet-ID's van Vibe Home.** Gemeten: de site gebruikt
   `GTM-KM2V7VQ3`, Vibe Home gebruikt `GTM-WFWS7DRN`. Geen overlap, en
   het blijft zo.
2. **Geen langlevende service-accountsleutel om analytics "aangesloten"
   te laten lijken.** Railway heeft geen OIDC-identity-token en geen
   tokenendpoint, dus workload identity federation kan daar niet. De
   GSC-ingest hoort daarom als Cloud Run Job te draaien met workload
   identity — dezelfde conclusie als in het zusterplatform. Een sleutel
   in een Railway-variabele is géén alternatief.

---

## 3. Database en migratieveiligheid

### De migratierunner

- 13 migraties, **drift 0** op deze commit
- elke migratie in **één transactie**; faalt er iets, dan is er niets
  half toegepast
- de runner hasht elk bestand en **weigert** te draaien als een al
  toegepaste migratie op schijf is gewijzigd, tenzij `driftToestaan`
  expliciet aan staat
- `npm run migreer -- --droog` toont wat hij zou doen

### Het herstelpad — en waar het stopt

| situatie | herstel |
|---|---|
| migratie faalt halverwege | niets toegepast; de transactie rolt terug |
| migratie is toegepast en blijkt verkeerd | **geen down-migratie.** Herstel is een nieuwe, voorwaartse migratie. Dat is een keuze: een down-migratie op append-only tabellen is een leugen |
| data is per ongeluk weggeschreven | **append-only triggers verhinderen `update` en `delete`** op onder meer `audit_gebeurtenissen`, `publicatiebesluiten`, `brondocument_versies`, `commerciele_signalen`, `ai_aanroepen`. Herstel vraagt een restore, geen `delete` |
| volledige database kwijt | **de bronlaag is herbouwbaar**: `npm run migreer`, `npm run zaai`, `npm run geo`, `npm run collector`. Dat leverde in deze sessie exact dezelfde 2.103 documenten op als in de vorige. De afgeleide lagen volgen uit `npm run pijplijn`, `besluit`, `regio`, `signalen` |

**Wat NIET herbouwbaar is:** menselijke besluiten. Goedkeuringen,
publicatiebesluiten, afwijzingen met motivatie en de auditketen bestaan
alleen in de database. Vóór de eerste echte goedkeuring in productie
moet er dus een back-up met een **geverifieerde restore** staan.

~~Die bestaat nu niet, want er is geen productiedatabase.~~
~~**Niet gedraaid:** er is geen restoretest uitgevoerd, want er is niets
om te restoren.~~

**ACHTERHAALD — gemeten 14 oktober 2026.** Er is een productiedatabase
(`postgres.railway.internal`, 38 migraties toegepast) en er IS een
geverifieerde restore gedraaid: PASS, 10 controles, restore in 639 ms,
bewijs in `gs://vibe-energy-intel-backups/restoretest/laatste.json`.

Wat er over dit punt nog wél waar is, en preciezer:

- die proef draaide **vanaf een laptop** met `--uit-gcs`, tegen een
  Docker-container. Dat bewijst de hele keten dump → upload → terughalen
  → restore, en het is geldig bewijs. Het zegt alleen niets over
  terugzetten **op de productieserver zelf**;
- voor die tweede vorm bestaat `--doel-url`. Hij maakt een
  wegwerpdatabase op een bestaande server en dropt die daarna, met een
  grendel op de doelnaam. In productie zou die server de productieserver
  zijn, dus **één run raakt twee productieresources**: de wegwerpdatabase
  én (sinds 3.0.8) een registratierij in de productiedatabase.
  `INTEL_RESTORETEST_DOEL_URL` staat daarom op geen enkele service
  gezet — gemeten op worker en api;
- ~~`npm run restoretest` draait in **geen enkele poort**.~~
  **ACHTERHAALD sinds 3.0.8.** Er is nu een cadans: de taaksoort
  `restoretestronde` staat in `PLAN` en wordt wekelijks gepland op
  **zondag 03:00 UTC**. De worker-handler start de CLI als subproces met
  `INTEL_RESTORETEST_DOEL_URL` uit `INTEL_DB_URL`, met een tijdslimiet
  van 20 minuten.

  Waarom een subproces en geen functie: de CLI roept `sluitAllePools()`
  aan nadat hij zijn bewijs heeft geregistreerd, en in proces zou dat de
  pool van de wórker sluiten midden in zijn ronde. Een subproces heeft
  eigen pools. Daarbij gebruikt het exact dezelfde implementatie, dus er
  is geen tweede waarheid over wat een restoretest is.

  Wat daarbij hoort en gemeten is: `worker/hartslag` meet
  `max(gereed_op)` over `intel.taken` met een drempel van 26 uur. Een
  taak die één keer per week afrondt zou die vraag verkeerd
  beantwoorden, dus `restoretestronde` is daar expliciet uitgezonderd
  (`NIET_HARTSLAGWAARDIGE_SOORTEN`). **Bevinding die daarbij opviel en
  NIET is gewijzigd:** `backup` en `meting` zijn dagelijks en vallen
  binnen die 26 uur, dus die kunnen de hartslag tot een dag rekken. Dat
  is een bestaande eigenschap van die drempel, geen gevolg van deze
  release.

### Een consequentie die in de vorige sessie verraste

`npm run herbouw` wist de afgeleide lagen en laat de bronlaag staan,
maar **weigert zodra `publicatiebesluiten` rijen heeft** — die tabel is
append-only. Na een publicatietest is een verse database de enige route.
Dat is bedoeld gedrag.

---

## 4. Het dashboard in productie

De opdracht eist: niet publiek, geauthenticeerd, server-side
geautoriseerd, en **localhost-binding is niet het beveiligingsmodel**.

Zo is dat uitgewerkt:

| laag | maatregel | bewijs |
|---|---|---|
| binding | `INTEL_DASHBOARD_BIND`, standaard `127.0.0.1` | E2E-scenario 17 |
| weigering | in productie + niet-loopback + geen verklaarde TLS-proxy ⇒ **de app start niet** | `startWeigering()`, 4 eenheidstoetsen |
| authenticatie | elke route achter `vereistInlog`; sessiekoekje HMAC-ondertekend | scenario 17: `GET /` geeft 302 naar `/inloggen` |
| autorisatie | `vereistRecht(<recht>)` per route; **rechten komen per verzoek uit de database**, niet uit de sessie | scenario 18: redacteur 403, beheerder 200 |
| cookie | `HttpOnly`, `SameSite=Strict`, `Secure` **in productie** | `cookieSecure()` |
| transport | HSTS **in productie** | |
| headers | `x-robots-tag: noindex, nofollow`, `x-frame-options: DENY`, `referrer-policy: no-referrer`, `x-content-type-options: nosniff`, strikte CSP | scenario 17: 0 ontbrekend |
| wachtwoorden | scrypt | |

**De aanbevolen productieopstelling:** bind op de loopback en zet er een
geauthenticeerde tunnel voor (Tailscale of een reverse proxy met TLS).
Zet `INTEL_DASHBOARD_ACHTER_TLS_PROXY` alleen aan als die proxy er
echt is.

---

## 5. Worker en planner

**Status: lokaal bewezen, NIET UITGEROLD.**

### Lokaal gemeten

| | |
|---|---|
| planner, eerste run | 5 taken gepland (`ophalen`, `clusteren`, `beoordelen`, `regio`, `signaleren`) |
| planner, tweede run in hetzelfde uurvenster | **0 taken**, gemeld als bedoeld gedrag |
| worker `--leeg` | 5 van 5 gereed, 0 opnieuw gepland, 0 naar dlq |
| wachtrijtoetsen | 14 integratietoetsen tegen een echte database |

De garanties, elk met een eigen toets: `for update skip locked` (twee
workers krijgen nooit dezelfde taak), een lease als tijdstip (een
omgevallen worker verliest zijn taak niet), venster-idempotentie (de
planner mag dubbel draaien), en backoff → dlq (een taak die blijft falen
blokkeert de rest niet).

### Hoe het uitgerold zou moeten worden

Dit is een **voorstel**, niet een configuratie die draait:

| onderdeel | vorm | commando |
|---|---|---|
| planner | cron, elk uur | `npm run planner` |
| worker | langlopend proces, 1–2 instanties | `npm run worker` |
| dashboard | langlopend proces | `npm run dashboard` |
| database | beheerde Postgres 17 met back-up en **geverifieerde restore** | — |

Aandachtspunten die uit de meting volgen:

- De planner is **veilig om dubbel te draaien**, dus overlappende cron
  of een herstart is geen probleem. Dat is expres zo gebouwd.
- De worker verwerkt `SIGINT`/`SIGTERM` door de huidige ronde af te
  maken en dan te stoppen — geschikt voor een rolling restart.
- `ophalen` doet netwerkverzoeken naar 21 externe bronnen en respecteert
  per bron het ophaalinterval, robots en een minimale
  verzoeksinterval. Meer workers maakt dat niet sneller en is niet
  nodig.
- De worker publiceert **niet**. Er is geen taaksoort die een pagina
  live zet.

---

## 6. De publicatieketen, van bron tot live

Zeven schakels. De eerste vier zijn machine, de laatste drie mens.

1. **Ophalen** — robots en TDM gemeten per bron; een verboden bron
   blijft uitgeschakeld met vastgelegde reden.
2. **Claimen** — elke uitspraak bindt aan een bronversie; de database
   weigert een bevestigde uitspraak zonder primaire bron
   (`uitspraken_bewijsplicht`).
3. **Besluiten** — de motor verkiest een patch boven een nieuwe URL
   zodra de pagina bestaat. Gemeten: **0 NEW_ARTICLE, 19
   UPDATE_EXISTING**.
4. **Concept** — 15 deterministische poorten, waarvan
   `geen_verzonnen_getallen` de strengste is: elk getal moet naar een
   gebonden claim te herleiden zijn.
5. **Goedkeuren (MENS)** — vier ogen is een databaseconstraint
   (`inhoud_versies_vier_ogen`), en de goedkeuring bindt aan een
   inhoudsafdruk (`inhoud_versies_goedkeuring_bindt`). Wordt de tekst na
   goedkeuring gewijzigd, dan weigert `publiceer()`.
6. **Registerrecord (MACHINE, op opdracht)** — `npm run publiceer`
   schrijft **alleen** `data/inhoud/nieuws/<slug>.json`. Geen HTML, geen
   sitemapregel. Een voorstel voor een bestaande Release 1-pagina wordt
   geweigerd met reden.
7. **Genereren, committen, pushen (MENS)** — drie handelingen. Pas de
   push naar `main` zet iets live.

Daarnaast: **poort 16 FAALT** zolang de hub op INDEX staat en
`vibe/chrome.js` de `/nieuws`-link mist. Het kanaal kan dus niet live
staan zonder dat een bezoeker het kan vinden.

---

## 7. Openstaande punten vóór productie

| # | punt | aard |
|---|---|---|
| 1 | Er is geen host voor de Node-app gekozen. | besluit van de eigenaar |
| 2 | Er is geen productiedatabase, dus ook geen back-up en geen **geverifieerde restore**. | blokkerend vóór de eerste goedkeuring |
| 3 | Analytics is NIET AANGESLOTEN. Aansluiten vraagt een Cloud Run Job met workload identity, niet een sleutel in een Railway-variabele. | ontwerp plus autorisatie |
| 4 | `OPENAI_API_KEY` is aanwezig maar `vertrouwd=false`: nog niet tegen de echte API gevalideerd in deze opstelling. | meting |
| 5 | `intel.ai_prijzen` is leeg, dus kosten blijven **ONBEKEND**. | data |
| 6 | Geen CI: alle poorten draaien met de hand. | proces |
| 7 | `vibe/chrome.js` mist de `/nieuws`-link. Nodig zodra het kanaal opengaat; poort 16 dwingt het af. | redactioneel |
| 8 | De data-, scripts- en docsmappen zijn publiek opvraagbaar via de staticfile-host; `robots.txt` sluit ze uit van crawlen maar niet van ophalen. | bekend, laag risico |
