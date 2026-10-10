# Runbook — Vibe Energy Intelligence Platform

**Gemeten op 10 oktober 2026, branch
`feat/vibe-energy-intelligence-integratie`.**

> **Status van de infrastructuur: NIET UITGEROLD.** Dit runbook beschrijft
> procedures die lokaal zijn uitgevoerd en bewezen. Waar een procedure
> alleen lokaal is bewezen staat dat erbij. Lokaal bewezen is niet
> operationeel.

---

## 1. Back-up

### Wat er wel en niet op het spel staat

De bronlaag is **herbouwbaar**. `npm run migreer`, `zaai`, `geo` en
`collector` leverden in twee aparte sessies exact dezelfde 2.103
documenten en 2.103 versies op. Een verloren bronlaag kost rekentijd en
netwerkverkeer, geen informatie.

Niet herbouwbaar, en dus de hele reden dat back-up bestaat:

| tabel | waarom onvervangbaar |
|---|---|
| `inhoud_versies` (goedkeuringen) | wie wat heeft vrijgegeven, en aan welke inhoudsafdruk dat bond |
| `publicatiebesluiten` | append-only besluitgeschiedenis |
| `audit_gebeurtenissen` | append-only auditspoor |
| `publicaties` | wat er werkelijk is weggeschreven, met de vorige inhoud voor terugdraaien |
| `gebruikers`, `gebruiker_rollen` | wie toegang heeft |
| `regio_impacts`, `commerciele_signalen` | beoordeelde voorstellen met hun onderbouwing |

### De procedure

```bash
cd intelligence
npm run backup                  # dump + manifest + retentie
npm run backup -- --lijst       # wat er staat
npm run backup -- --controleer  # integriteit zonder terugzetten
```

Doelmap: `intelligence/backups/`, in `.gitignore`. **Deze repository is
publiek** (gemeten), dus een dump mag daar nooit in.

### De valkuil die dit script afdekt

Deze machine heeft twee `pg_dump`-binaries en de eerste in `PATH` is de
verkeerde:

```
/opt/homebrew/opt/postgresql@16/bin/pg_dump   16.14   <- eerst in PATH
/opt/homebrew/opt/postgresql@17/bin/pg_dump   17.11
```

De server is 17.11. Gemeten uitkomst van de 16-client:

```
pg_dump: error: aborting because of server version mismatch
pg_dump: detail: server version: 17.11; pg_dump version: 16.14
```

Een back-upscript dat gewoon `pg_dump` aanroept faalt hier dus, en een
cron die zijn uitvoer niet leest zou dat maanden niet merken. `vindPgGereedschap()`
zoekt daarom actief de binary die bij de **server** past en weigert een
te oude client. Een stille back-upfout is erger dan geen back-up.

### Retentiebeleid

| | |
|---|---|
| standaard retentie | **30 dagen** (`--retentie <dagen>`) |
| uitzondering | de **nieuwste** dump wordt nooit opgeruimd, ook niet als hij ouder is dan de retentie |
| waarom die uitzondering | een machine die een maand uit stond zou bij de eerste run anders zijn enige back-up weggooien voordat er een nieuwe is |

### Integriteit

Drie controles, want "het bestand bestaat" zegt niets — een dump van nul
bytes bestaat ook:

1. **sha256** vastgelegd in het manifest en opnieuw gemeten bij `--controleer`.
2. **`pg_restore --list` moet de inhoudsopgave kunnen lezen.** Dat bewijst
   dat het archief structureel heel is. Gemeten: 612 regels.
3. **Rijtellingen van de kritieke tabellen** in het manifest, gemeten op
   de LIVE bron. Daarmee is een restore te *verifiëren* in plaats van
   alleen te laten slagen.

---

## 2. RPO en RTO

| doel | waarde | onderbouwing |
|---|---|---|
| **RPO** (maximaal gegevensverlies) | **24 uur** voor de niet-herbouwbare laag | bij een dagelijkse back-up. De bronlaag heeft feitelijk RPO 0, want die is opnieuw op te halen. |
| **RTO** (maximale hersteltijd) | **1 uur** | gemeten restoreduur **708 ms** voor 772 kB; de rest van het uur is menselijke reactietijd en het opnieuw opstarten van de diensten |
| RPO bij hogere frequentie | 1 uur | haalbaar: de dump duurt seconden. Een uurlijkse back-up kost ~770 kB per keep |

**Gemeten, niet aangenomen:** dump 772 kB, restore 708 ms, 13 migraties,
612 TOC-regels, 44 tabellen.

> **Nog niet geldig voor productie.** Deze cijfers komen van een lokale
> database met 2.103 documenten. Een productiedatabase die maanden
> ingest zal groter zijn; RPO/RTO moeten opnieuw gemeten worden zodra de
> werkelijke omvang bekend is.

---

## 3. Restoreprocedure

### De geteste procedure

```bash
cd intelligence
npm run restoretest              # nieuwste back-up, geïsoleerde container
npm run restoretest -- --houd    # container laten staan om in te kijken
```

Wat het doet: start een verse `postgres:17-alpine` in Docker op een eigen
poort met een eigen wachtwoord, maakt de drie applicatierollen aan, zet de
dump terug en **verifieert** het resultaat. Daarna wordt de container
weggegooid. **De brondatabase wordt niet aangeraakt; er wordt nooit iets
verwijderd om een restore te kunnen tonen.**

### Uitkomst van de laatste run

```
pg_restore gereed in 708 ms
geslaagd 10   mislukt 0
EINDOORDEEL RESTORETEST = PASS
```

Geverifieerd: 13/13 migraties, elke kritieke tabel op de rijtelling uit
het manifest, auditspoor volledig, **append-only bescherming werkt na de
restore**, elke tabel met `organisatie_id` heeft nog RLS, de tabellen
zonder RLS zijn exact de zes verantwoorde uitzonderingen, 38 policies,
21 triggers, 103 check-constraints.

### De stap die een ongeteste restoreprocedure mist

**De rollen zitten niet in de dump.** De dump is met `--no-owner`
gemaakt, maar RLS-policies en grants verwijzen bij naam naar
`vibe_intel_app`, `vibe_intel_lezer` en `vibe_intel_onderhoud`. In een
verse database bestaan die niet, en dan faalt de restore of komt de
beveiliging niet mee. De procedure maakt ze daarom eerst aan. Dit is
precies het soort detail dat je alleen vindt door een restore echt te
doen.

### Handmatige restore naar een nieuw doel

```bash
# 1. rollen aanmaken (ZONDER login; de app logt in met de URL-identiteit)
psql "$DOEL" -c "create role vibe_intel_app nologin"
psql "$DOEL" -c "create role vibe_intel_lezer nologin"
psql "$DOEL" -c "create role vibe_intel_onderhoud nologin"

# 2. terugzetten met de binary die bij de SERVER past
/opt/homebrew/opt/postgresql@17/bin/pg_restore \
  --dbname "$DOEL" --no-owner --no-privileges --exit-on-error \
  backups/vibe-intel-<stempel>.dump

# 3. verifiëren tegen het manifest
cat backups/vibe-intel-<stempel>.dump.manifest.json
```

### Goedkeuringen en auditspoor na een restore verifiëren

Dat is apart getoetst, want in de ontwikkeldatabase staan nul
goedkeuringen en dan bewijst "goedkeuringen zijn teruggezet" niets.
`test/integratie/backup-restore.test.ts` zet een echte goedkeuring,
dumpt, zet terug in een tweede database en controleert:

- de goedgekeurde versie bestaat, met **de goedkeurder bij naam**
- `inhoud_afdruk` **en** `goedgekeurde_afdruk` zijn identiek teruggekomen
  (de binding tussen goedkeuring en inhoud)
- het goedkeuringsmoment is bewaard
- het publicatiebesluit staat er, met `actor_soort = 'mens'`
- de auditregel staat er, met de actornaam
- `update` op het auditspoor wordt **nog steeds geweigerd**
- `delete` op publicatiebesluiten wordt **nog steeds geweigerd**
- de **vier-ogenconstraint geldt nog**: de auteur alsnog als goedkeurder
  zetten faalt

Uitkomst: **4/4 PASS**.

---

## 4. Herstel van een mislukte migratie

| situatie | wat te doen |
|---|---|
| migratie faalt halverwege | **niets doen.** Elke migratie loopt in één transactie; er is niets half toegepast. Repareer het bestand en draai opnieuw. |
| migratie is toegepast en blijkt verkeerd | **geen down-migratie.** Herstel is een nieuwe, voorwaartse migratie. Een down-migratie op append-only tabellen zou een leugen zijn. |
| migratiebestand is na toepassing gewijzigd | de runner **weigert** te draaien en meldt drift. Dat is bedoeld. Maak een nieuwe migratie in plaats van een oude te herschrijven. |
| schema is onherstelbaar | restore uit de laatste back-up volgens §3, dan de ontbrekende migraties opnieuw. |

**Vóór elke productiemigratie:** `npm run backup`, dan
`npm run backup -- --controleer`. Pas daarna migreren.

---

## 4b. Het ophaalschema, en waarom het zo staat

De planner draait **elk uur** en zet één `ophalen`-taak neer. Dat lijkt
veel, maar de collector beslist per bron of die bron al aan de beurt is.
Gemeten verdeling over de 21 actieve bronnen:

| interval | bronnen | voorbeeld |
|---|---|---|
| 60 min | 1 | `tenderned-laatste-publicatie` — de snelst bewegende feed |
| 180 min | 1 | `rijksoverheid-nieuws` |
| 360 min | 3 | `acm-besluiten`, `netbeheer-nederland-nieuws`, `tenderned-publicaties` |
| 480 min | 1 | `solar365` |
| 720 min | 7 | netbeheerder-sitemaps, `rvo-opendata-artikelen`, `energy-charts` |
| 1440 min | 6 | `cbs-datasets-catalogus`, kleinere netbeheerders, `rvo-subsidie-sitemap` |
| 10080 min | 2 | `pdok-bestuurlijke-gebieden`, `mijnaansluiting-netbeheergebieden` — referentiegeografie |

Daarbovenop geldt een **minimum van 5 seconden tussen twee verzoeken aan
dezelfde host**, en conditionele verzoeken met ETag en
`If-Modified-Since`. Gemeten in de laatste ronde: 16 bronnen `ok`,
**5 `niet_gewijzigd`** — die laatste leverden dus een 304 en kostten de
uitgever niets.

**Waarom een uurlijkse planner en niet een cron per bron.** Eén cron is
één ding dat kan falen en één ding om te monitoren. De
intervalbeslissing hoort bij de bron, niet bij de planner; die staat in
`intel.bronnen.ophaalinterval_minuten` en is daar per bron te
verantwoorden. De planner is dus een dom hartje en de bron is de
autoriteit.

**Kosten.** Een uurlijkse ronde die niets te doen heeft kost één
databasequery en een paar milliseconden. De geo-bronnen staan op
wekelijks omdat de gemeente-indeling wekelijks niet verandert — die
werden in Release 2 eenmalig voor 342 gemeenten opgehaald en zijn
daarna referentiedata.

---

## 4c. Dead-letter queue

```bash
npm run worker -- --dlq            # wat staat er in, en waarom
npm run worker -- --dlq-hervat     # alles terugzetten in de wachtrij
npm run worker -- --dlq-hervat --soort ophalen   # alleen één soort
```

**Hervatten is met opzet een menselijke handeling.** Een worker die zijn
eigen dlq leegtrekt is geen dlq: dan draait een kapotte taak eeuwig rond
en is het enige effect dat de fout vaker in het log staat. Een taak komt
in de dlq omdat er iets te *beslissen* valt — een bron die van vorm
veranderde, een ontbrekende variabele, een uitgever die blokkeert.

Hervatten zet de pogingenteller op nul, want anders is de taak na één
hervatting meteen weer op.

Een taak met een **niet-herhaalbare** fout (`IntelFout` met soort
`configuratie`) gaat direct naar de dlq zonder de pogingen op te maken.
Een vierde poging vindt dezelfde ontbrekende variabele niet alsnog.

---

## 5. Dagelijkse controle

```bash
cd intelligence
npm run poort                  # typecheck, migraties, rollen, invarianten, 232 tests
npm run backup -- --lijst      # staat er een recente back-up?
npm run bronnen                # bronstatus en toestemming
```

Bij een incident in de keten:

```bash
npm run worker -- --leeg       # draai de wachtrij leeg en kijk wat faalt
```

De wachtrijstatus per soort staat onderaan die uitvoer, inclusief de
dead-letter queue.

---

## 5b. Monitoring en alertering

```bash
npm run gezondheid              # volledig rapport
npm run gezondheid -- --kort    # alleen wat niet OK is
npm run gezondheid -- --json    # voor een alerteerder
```

Twintig signalen over acht groepen: database, ingestie, worker,
planner, publicatie, AI, beveiliging, koppelingen en back-up.

### Vier niveaus, en NIET GEMETEN is ernstiger dan LET OP

| niveau | betekenis | exitcode |
|---|---|---|
| `OK` | binnen de norm | 0 |
| `FOUT` | iets staat stil of is kapot; hier hoort een melding bij | 1 |
| `NIET GEMETEN` | deze monitor kan het niet vaststellen | 2 |
| `LET OP` | loopt op, niets kapot | 3 |

**NIET GEMETEN staat bewust boven LET OP.** Een monitor die bij een
ontbrekende meting groen zegt is erger dan geen monitor: dan denk je
dat je het weet. Geen enkel signaal kan OK worden zonder meting.

### De drempels komen uit de gemeten werkelijkheid

| signaal | drempel | waarom juist deze |
|---|---|---|
| ingestieversheid | 26 uur | zes bronnen hebben een interval van 24 uur, twee van een week. Een uur zou permanent rood staan en daarmee waardeloos zijn |
| bronfouten | 3 achtereen | één of twee is een hik, drie is een storing |
| wachtrijachterstand | 25 taken | de planner maakt er 5 per uur; 25 betekent vijf uur geen worker |
| back-upleeftijd | 26 uur | haalt de RPO van 24 uur niet |
| restoretest | 30 dagen | ouder bewijs is geen bewijs meer |
| AI-budget | 80% van de maand | genoeg marge om in te grijpen |

### Stand op deze commit

```
SIGNALEN 20   OK 19   LET OP 0   NIET GEMETEN 1   FOUT 0
EINDOORDEEL = NIET GEMETEN
```

Het enige NIET GEMETEN signaal is **analytics**: vier van vijf
koppelingen zijn NIET AANGESLOTEN. Dat is geen defect maar een
ontbrekende autorisatie, en het hoort zichtbaar te blijven tot die er
is.

### Waar de meldingen naartoe gaan

**Nergens.** Er is geen goedgekeurd meldkanaal in deze omgeving: geen
Slack-webhook, geen alerteerdienst, geen afgesproken e-mailadres voor
operationele meldingen. Een adres verzinnen zou betekenen dat
meldingen in het niets verdwijnen terwijl het dashboard zegt dat ze
verstuurd zijn.

Wat er wél is: een exitcode en JSON-uitvoer. Zodra er een kanaal is,
is dit de hele koppeling:

```bash
# cron, elk kwartier
cd /pad/naar/intelligence
npm run gezondheid -- --json > /tmp/gezondheid.json || \
  <stuur /tmp/gezondheid.json naar het goedgekeurde kanaal>
```

**Benodigde autorisatie:** één meldbestemming. Tot die er is draait de
monitor wel, maar moet iemand hem lezen.

---

## 6. Wat dit runbook nog niet dekt

Deze onderdelen bestaan als code of configuratie maar zijn **niet
uitgerold**, en hun procedures zijn dus niet in hun doelomgeving
bewezen:

- de Intelligence API als dienst
- de worker en de planner als permanente processen
- geautomatiseerde back-up op een schema
- monitoring en alertering
- de productiedatabase zelf

Zie `docs/PRODUCTIE.md` voor de topologie en de openstaande punten.
