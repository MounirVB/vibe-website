# Autonome nieuwspublicatie

Dit document beschrijft de keten waarmee Vibe Intelligence zélf een
nieuwsbericht naar `www.vibeenergy.nl` kan brengen: wie welke stap doet,
wat er wordt vastgelegd, wat het tegenhoudt, en wat de eigenaar moet
zetten voordat er ook maar iets gebeurt.

**Niets in deze keten staat aan.** Dat is geen formulering maar een
gemeten stand; paragraaf 5 zegt per variabele dat hij niet is gezet.

---

## 1. Wat dit is, en wat het niet is

**Wat het is.** Een tweedelige machine. De server (de Railway-container
bij de database) beslíst wat er uitgegeven mag worden, bouwt het
registerrecord met alle poorten eraan, geeft een opdracht af, controleert
elke terugmelding, meet de publieke URL zelf en schrijft het auditspoor.
Een GitHub-werkstroom (`.github/workflows/uitgifte.yml`) is de
**uitvoerder**: hij schrijft de bytes die hij krijgt, draait de echte
generator, opent een pull request, merget die pas als GitHub zélf zegt
dat de drie vereiste checks groen zijn, wacht op de deploy en meldt elke
stap terug.

**Waarom het gesplitst is.** Gemeten in de productiecontainer op
9 november 2026: `git` ontbreekt, `/app/.git` bestaat niet, `gh`
ontbreekt, `/app/scripts` bestaat niet, `/data/inhoud` bestaat niet en
`INTEL_SITE_WORTEL` is leeg. De plek waar de database vanzelf bereikbaar
is, kan de git-helft dus niet draaien. En de plek waar de hele repository
wél staat — een GitHub-runner — kan de database niet bereiken, want die
hangt in een Railway-privénet zonder publieke poort, en dat blijft zo.

**Wat het niet is.**

- Het is **geen redactie**. De uitvoerder kan geen inhoud kiezen: er is
  geen veld in de machinepoort waarin hij tekst van een artikel kan
  meegeven. Hij meldt een hash; de server bouwt het record opnieuw uit de
  database en vergelijkt.
- Het is **geen goedkeuring**. De beleidsgoedkeuring is een ánder besluit
  met een eigen schakelaar (`auto_publiceren_aan`) en een eigen fase.
- Het raakt **geen hoogrisico-artikel** aan. Dat is op vier niveaus
  dicht: het beleid mag niet (migratie 0004), de versierij mag niet
  (0052), `autopublicatie.ts` weigert het, en de uitgiftewachtrij eist
  `goedkeuring_soort = 'beleid'` — wat bij hoog risico niet kan bestaan.
- Het **publiceert niets** zolang twee schakelaars in de database uit
  staan: `auto_publiceren_aan` en `auto_uitgifte_aan`. Beide staan
  standaard uit (migratie 0058). Zonder beide aan geeft de server een
  lege wachtrij met een stopreden, en stopt de werkstroom netjes zonder
  te falen. Dat is de normale uitkomst.
- Het **forceert geen merge**. De merge gaat via de gewone
  pull-request-API; de branchbescherming op `main` is de instantie die
  weigert.

---

## 2. De keten in één overzicht

| # | stap | wie doet het | wat er wordt vastgelegd |
|---|---|---|---|
| 1 | **gebeurtenis** | de collector (`npm run collector`), daarna de pijplijn | een rij in de gebeurtenissenlaag met bron en ophaalmoment |
| 2 | **kandidaat** | taak `nieuwsselectie` (prioriteit 35) | een `NEWS_ITEM`-kandidaat met een nieuwswaardescore |
| 3 | **concept** | taak `concept` (prioriteit 38) | een inhoudsversie met status `in_concept`, de poortuitslag en een inhoudsafdruk |
| 4 | **poorten** | `concept.ts` / `publiceer()` | `poorten_geslaagd`, `blokkades[]`, de bewijshertoets |
| 5 | **beleidsgoedkeuring** | taak `publiceren` (prioriteit 70) | status `goedgekeurd`, `goedkeuring_soort = 'beleid'`, `goedgekeurde_afdruk`, fase `GOEDGEKEURD` in `publicatiebesluiten` |
| 6 | **uitgifteopdracht** | de SERVER, `maakUitgifteWachtrij()` | **niets** — deze stap schrijft met opzet niet; een opdracht die onderweg verloren gaat, mag geen spoor achterlaten |
| 7 | **de bytes schrijven** | de UITVOERDER (stap 4b van de werkstroom) | nog niets in de database; het bestand staat op de runner |
| 8 | **record aanvaard** | de SERVER, na hashvergelijking | fase `RECORD_GESCHREVEN`, de `publicaties`-rij, het pagina-register, het besluit en de auditregel |
| 9 | **pull request** | de UITVOERDER | fase `PR_AANGEMAAKT` met branch, commit, PR-nummer en PR-URL; `herkomst: uitvoerder` |
| 10 | **poort** | GitHub Actions (`poort.yml`), drie jobs | geen databaseregel; de uitslag staat bij GitHub en is daar de merge-voorwaarde |
| 11 | **merge** | de UITVOERDER, via de API; GitHub mag weigeren | fase `PR_GEMERGED` met de mergecommit en de namen van de groene checks |
| 12 | **deploy** | Railway, op een push naar `main` | geen databaseregel; `/machine/stand` meldt de nieuwe `RAILWAY_GIT_COMMIT_SHA` |
| 13 | **live-verificatie** | de **SERVER**, met vier eigen HTTP-metingen | fase `LIVE_GEVERIFIEERD` met HTTP-status, canonical, kop en sitemap |

Twee dingen aan deze tabel zijn het hele ontwerp.

**De hash is de grens tussen server en uitvoerder.** De opdracht draagt
de volledige bytes van het registerrecord plus hun sha256. Bij de
terugmelding bouwt `publiceer()` het record opnieuw uit de database en
vergelijkt zijn eigen hash met die van de uitvoerder. Komen ze niet
overeen, dan is er iets anders geschreven dan de poorten hebben gezien
en wordt er niets vastgelegd.

**Stap 13 is de enige die de server zelf MEET in plaats van aanneemt.**
Zou de uitvoerder mogen melden "hij staat live", dan kon een fout in zijn
eigen stappen zich als succes voordoen. Daarom haalt de server de
publieke URL op en kijkt. Dat is ook waarom een gelogen mergemelding
niets oplevert: zonder echte merge is er geen pagina om op te halen. Het
enige dat de uitvoerder hier mag beweren is `gemergedInMain`, want dat is
het enige dat de server niet kan nagaan — in de container is geen git.

### De fasen, en wat erop mag volgen

De overgangen staan als tabel in `uitgifte/opdracht.ts` en zijn geen
vrije melding:

```
RECORD_GESCHREVEN  mag alleen volgen op  GOEDGEKEURD
PR_AANGEMAAKT      mag alleen volgen op  RECORD_GESCHREVEN
PR_GEMERGED        mag alleen volgen op  PR_AANGEMAAKT
LIVE_GEVERIFIEERD  mag alleen volgen op  PR_GEMERGED
```

Dezelfde fase twee keer melden is **geen** fout (idempotent): de
uitvoerder kan opnieuw opstarten nadat hij heeft gemeld maar vóórdat hij
het antwoord zag. Elke andere overgang is een `409`.

De huidige fase is géén kolom maar **de laatste regel in het logboek**.
`publicatiebesluiten` is append-only; een eigen statuskolom zou een
tweede waarheid zijn die kan afwijken van het bewijs.

---

## 3. Het beveiligingsmodel

**Geen publieke databasepoort.** De intel-database hangt in het
Railway-privénet (`postgres.railway.internal`) zonder publiek eindpunt.
De afgewezen alternatieven en waarom ze afgewezen blijven, staan in de
kop van `src/dashboard/machine.ts`: een tunnel naar CI zou een
Railway-token in GitHub-secrets betekenen — een credential waarmee je ook
kunt herdeployen en alle omgevingsvariabelen kunt lezen.

**Geen DB-credential in CI.** De werkstroom heeft er geen en hoort er
geen te krijgen. Hij praat met twee endpoints: `GET /machine/stand` en
`GET`/`POST /machine/uitgifte`. Hij krijgt nooit SQL in handen.

**Geen GitHub-token in de Railway-applicatie.** De server kan niet
pushen, niet mergen en geen PR openen; hij heeft er ook geen `git` en
geen `gh` voor. Dat is een eigenschap van de splitsing, niet een
instelling die iemand kan omzetten.

**De hash als grens.** Zie paragraaf 2. De uitvoerder schrijft bytes die
hij niet kan kiezen.

**De organisatie komt uit de serverconfiguratie.** `INTEL_ORGANISATIE`,
nooit uit het verzoek. Anders zou een sleutel voor één organisatie er een
andere mee kunnen besturen.

**`'systeem'` met een grond uit het register.** Alles wat via de
machinepoort binnenkomt wordt vastgelegd als `actor_soort = 'systeem'`
met een grond als `uitgifte:record`, `uitgifte:pr`, `uitgifte:merge`,
`uitgifte:live` of `uitgifte:stop`. Een machinesleutel is geen persoon.
Migratie 0057 legde op `publicatiebesluiten` vast dat `'mens'` nooit
zonder gebruikers-id wordt geschreven; 0058 bracht diezelfde grendel naar
`audit_gebeurtenissen` (`audit_mens_heeft_account`).

**De machinesleutel.** `INTEL_MACHINE_SLEUTEL`, minimaal 32 tekens
(`MIN_SLEUTELLENGTE` in `machine.ts`). Niet gezet of te kort: elke route
antwoordt `503` en er is geen uitgifte. De vergelijking is in constante
tijd (`timingSafeEqual`), want een string-vergelijking lekt via de
responstijd hoeveel tekens kloppen. De sleutel staat **niet in de
database**: een geheim dat daar staat, komt in elke back-up terecht, ook
in de externe kopie in GCS.

De machinepoort staat vóór `vereistInlog` en heeft zijn eigen wacht
(gemeten: `app.use("/machine", maakMachineRouter(pool))` in
`dashboard/server.ts`). Hij hangt dus niet aan het sessiekoekje van een
mens, en de sessie-/CSRF-laag van het dashboard geldt er niet.

**De repository is PUBLIEK.** Daarom: `permissions: contents: read` in de
werkstroom, geen secret in een `run:`-regel, geen `set -x` in enige stap,
en geen waarde — ook geen sleutellengte — in de uitvoer.

**Wat GITHUB zelf handhaaft, en dus niet wij.** Branchbescherming op
`main`, gemeten 9 november 2026:

| | |
|---|---|
| vereiste checks | `Release 1 — SEO/GEO-poorten en reproduceerbaarheid`, `Release 2 — typecheck, tests en invarianten`, `Geheimen, kwetsbaarheden en publicatiecontract` |
| `strict` | `true` (de branch moet bij zijn met main) |
| `enforce_admins` | `true` |
| verplichte reviewer | GEEN |
| `required_conversation_resolution` | `true` |

Een merge zonder groene checks weigert GitHub. De werkstroom wacht en
meet; hij beslist niet. Hij vraagt bovendien `mergeStateStatus` op en
gaat alleen door op `CLEAN`, en geeft bij de merge de verwachte
branch-SHA mee zodat een commit die ná de poort is bijgekomen niet
meeglipt.

**Waarom de standaard `GITHUB_TOKEN` hier niet volstaat.** Een push of
pull request die met die token wordt gemaakt, **start geen workflows**.
Gevolg: de drie vereiste checks zouden nooit lopen, de pull request zou
blijven staan op "waiting for status to be reported", en mergen zou —
terecht — onmogelijk zijn. Daarom een eigen, begrensde credential
(`UITGIFTE_TOKEN`) voor push, PR en merge.

**Wat de werkstroom zelf tegenhoudt voordat iets een bestand of
git-commando wordt.** `branch`, `bestandspad`, `slug`, `recordHash` en
`inhoudVersieId` komen over het netwerk binnen en worden op hun patroon
getoetst (dezelfde patronen als `TOEGESTAAN_AUTEURSPAD` en `branchVoor()`
in `publicatie/pr.ts`). Geen enkel opdrachtveld gaat via een
`${{ ... }}`-uitdrukking in een shellscript: zo'n uitdrukking wordt als
tekst in het script gezet, dus een waarde met `$(` erin zou worden
uitgevoerd. Alles uit de opdracht wordt met `jq` uit een bestand gelezen.

---

## 4. De stopcondities

`stopredenen()` meet ze alle in één keer, en **fail-closed**: elke
onzekerheid is een stop. Een harde stop is een lege wachtrij.

| sleutel | wanneer | terugzetten |
|---|---|---|
| `geen_beleid` | er is geen rij in `intel.publicatiebeleid` met `actief` | een actieve beleidsrij maken/activeren; `npm run zaai` zaait de productierij |
| `beleid_uit` | `auto_publiceren_aan` of `auto_uitgifte_aan` staat `false` | zie paragraaf 6; **beide** moeten aan, en de database weigert uitgifte-zonder-autogoedkeuring via de constraint `publicatiebeleid_uitgifte_vereist_autogoedkeuring` |
| `dagplafond` | er staan vandaag al `MAX_AUTONOME_PUBLICATIES_PER_DAG` (= 3) geslaagde autonome publicaties | niets doen; de teller loopt op `date_trunc('day', now())` en is morgen leeg. Het plafond staat in de code en niet in de database, zodat wie hem verruimt in dezelfde beweging de reden leest |
| `stroomonderbreker` | `MAX_OPEENVOLGENDE_FOUTEN` (= 3) `GEBLOKKEERD`-regels met een `uitgifte:`-grond ná de laatste geslaagde fase | een mens kijkt wat er aan de hand is en zorgt voor één geslaagde `PR_GEMERGED` of `LIVE_GEVERIFIEERD`; die zet de teller terug. Er is géén "reset"-knop, en dat is bedoeld |
| `artefact_onbruikbaar` | `siteKennisUitArtefact()` levert geen routes | het sitekennis-artefact herbouwen (`npm run sitekennis`); zonder dat artefact kan de server de onderwerp-eigenaar en de interne links niet vaststellen |

Het zijn **vijf** gemeten condities en niet vier: `geen_beleid` en
`beleid_uit` zijn twee verschillende gronden. Geen beleidsrij is iets
anders dan een beleidsrij met de schakelaars uit, en de herstelactie is
ook een andere.

**Een zesde sleutel bestaat wel, maar is NIET GEMETEN.**
`websiteversie_verschoven` staat in het type `Stopreden` van
`uitgifte/opdracht.ts`, maar wordt gemeten over `src/` door geen enkele
regel gepusht. `STOPREDEN_REGISTER` in `dashboard/server.ts` zet hem
daarom op `gemeten: false`. Reken er dus niet op dat die conditie een
main die onder een opdracht vandaan is verschoven, tegenhoudt. In de
werkstroom is het tegenwicht: **maximaal één opdracht per ronde**.

Bij `--droog` worden alleen `beleid_uit` en `geen_beleid` overgeslagen.
Het dagplafond, de stroomonderbreker en een onbruikbaar artefact gelden
ook droog, want die zeggen dat de méting zelf niet te vertrouwen is.

Naast de stopcondities **weigert** de server per artikel. Die weigeringen
staan in `geweigerd[]` van de wachtrij en in de stapsamenvatting van de
werkstroom, met reden. De werkvoorraad is smal met opzet: status
`goedgekeurd`, `goedkeuring_soort = 'beleid'`, risico niet `hoog`,
`poorten_geslaagd`, nul blokkades, en `goedgekeurde_afdruk =
inhoud_afdruk` — anders is de tekst na de goedkeuring veranderd.

---

## 5. Exacte productieconfiguratie

> **Niets hiervan is aangezet.** Er is in deze sessie geen secret, geen
> variabele, geen token, geen account en geen rol aangemaakt of
> gewijzigd. Onderstaande tabellen zijn wat de eigenaar zelf moet zetten,
> met de minimale rechten erbij.

### 5.1 Railway — service `vibe-intel-api`

| naam | waarde | minimale rol | nodig voor |
|---|---|---|---|
| `INTEL_MACHINE_SLEUTEL` | ≥ 32 tekens, gegenereerd, **nergens anders gebruikt** | alleen deze service | de machinepoort; zonder deze variabele antwoordt `/machine/*` met `503` en is er geen uitgifte |

Deze variabele is **nieuw** en staat niet in `deploy/railway.md`. Alle
andere variabelen van die service (`INTEL_OMGEVING`, `INTEL_DB_URL`,
`INTEL_DB_APP_ROL`, `INTEL_DB_ONDERHOUD_ROL`, `INTEL_ORGANISATIE`,
`INTEL_SITE_BASIS_URL`, `INTEL_NETWERK_TOEGESTAAN`, `INTEL_LOG_NIVEAU`,
`INTEL_SESSIE_GEHEIM`, `INTEL_DASHBOARD_POORT`, `INTEL_DASHBOARD_BIND`,
`INTEL_DASHBOARD_ACHTER_TLS_PROXY`) blijven zoals ze zijn; zie
`deploy/railway.md` §3.

Zet hem **niet** op `vibe-intel-worker` of `vibe-intel-planner`: daar
draait geen HTTP-server, dus de sleutel zou daar alleen een extra plek
zijn waar hij kan weglekken.

**Controleren** (toont namen, geen waarden):

```bash
railway variables -s vibe-intel-api --json | jq -r 'keys[]' | grep MACHINE
```

**Controleren dat de poort leeft** — vanaf een machine met de sleutel,
tegen het servicedomein van `vibe-intel-api`:

```bash
curl -sS -H "Authorization: Bearer $INTEL_MACHINE_SLEUTEL" \
  "$INTEL_API_BASIS/machine/stand" | jq .
# verwacht: {"sha":"<40 hex>","omgeving":"productie","dienst":"vibe-intel-api","op":"..."}
# 503 = sleutel niet gezet of < 32 tekens
# 401 = sleutel klopt niet
```

### 5.2 GitHub — secrets op `MounirVB/vibe-website`

| naam | soort | inhoud | minimale rechten |
|---|---|---|---|
| `UITGIFTE_TOKEN` | repository secret | een fine-grained personal access token, **alleen** op `MounirVB/vibe-website` | `Contents: Read and write` (pushen en een branch verwijderen), `Pull requests: Read and write` (PR openen en mergen), `Checks: Read` (de conclusie van de drie vereiste checks lezen), en `Metadata: Read` dat GitHub altijd verplicht meegeeft. **Geen** Actions, **geen** Secrets, **geen** Administration, **geen** Workflows. |
| `INTEL_MACHINE_SLEUTEL` | repository secret | dezelfde waarde als in Railway | — |
| `INTEL_API_BASIS` | repository secret (of variable) | de basis-URL van `vibe-intel-api`, **zonder** afsluitende slash, bijvoorbeeld `https://<servicedomein>` | — |

**Waarom `Checks: Read` erbij hoort.** De server weigert een
`PR_GEMERGED`-melding zonder de namen van de groene checks
(`aanvaardMerge` in `uitgifte/opdracht.ts`). Die namen horen gemeten te
zijn bij GitHub in plaats van aangenomen; daarvoor leest de werkstroom
`GET /repos/{owner}/{repo}/commits/{sha}/check-runs`. Op een publieke
repository kan dat leesrecht overbodig blijken, maar erop vertrouwen is
een aanname en geen meting — geef de grant expliciet.

**Waarom `INTEL_API_BASIS` niet in de repository staat.** Deze
repository is publiek. Het servicedomein van `vibe-intel-api` is niet
geraden maar wel publiek adresseerbaar, en de beveiliging mag er niet van
afhangen (en doet dat niet: er is een sleutel). Hem toch niet publiceren
is een gratis laag.

**Optioneel**, als repository *variable* (geen secret):

| naam | waarde | gevolg als je hem weglaat |
|---|---|---|
| `UITGIFTE_GIT_NAAM` | de naam die in de commit als auteur komt | de naam valt terug op de GitHub-actor van de run; het adres op de noreply-vorm `<actor_id>+<actor>@users.noreply.github.com` die GitHub zelf voor dat account hanteert |

**Controleren** (toont namen, geen waarden):

```bash
gh secret list   --repo MounirVB/vibe-website
gh variable list --repo MounirVB/vibe-website
```

### 5.3 Repository-instellingen

| instelling | nodige stand | waarom |
|---|---|---|
| squash-merge toegestaan | **aan** | stap 8 merget met `merge_method=squash`; staat squash uit, dan geeft GitHub `405` en strandt de ronde |
| branchbescherming `main` | ongewijzigd laten | de drie vereiste checks, `strict` en `enforce_admins` zijn precies wat de merge afdwingt |

### 5.4 De database

| wat | stand | waar |
|---|---|---|
| migratie 0058 toegepast | nodig; de kolom `auto_uitgifte_aan` bestaat anders niet | `npm run migreer`, daarna `npm run migreer -- --droog` voor drift 0 |
| `auto_publiceren_aan` | **false** (standaard) | `intel.publicatiebeleid` |
| `auto_uitgifte_aan` | **false** (standaard, migratie 0058) | `intel.publicatiebeleid` |

Deze twee kolommen zijn de enige echte aan/uit van de hele keten. Er is
geen pad in de code dat ze zelf aanzet.

### 5.5 Wat NIET gezet wordt, bewust

```
een Railway-token in GitHub-secrets      zou herdeploy en alle variabelen openen
een DB-credential in GitHub-secrets      de database blijft zonder publieke poort
een GitHub-token op een Railway-service  de server hoort niet te kunnen mergen
een eigen domein voor vibe-intel-api     vraagt een DNS-wijziging en een aparte goedkeuring
```

---

## 6. Activeren in stappen

Zet de stappen niet samen. Na elke stap hoort een verwachting die je
kunt zien; klopt die niet, dan stop je daar.

### Stap 0 — de poort droog draaien, zonder iets te configureren

```bash
# in intelligence/, met de tunnel uit docs/RUNBOOK-PUBLICEREN.md paragraaf 1
npm run uitgifte                 # de stand: beleid en stopcondities
npm run uitgifte -- --wachtrij   # plus de opdrachten die klaarstaan
npm run uitgifte -- --droog      # alsof beide schakelaars AAN staan
npm run uitgifte -- --json       # machineleesbaar
```

**Verwacht:** `goedkeuren uit`, `uitgeven uit`, en een
`STOP beleid_uit`-regel. `--droog` laat zien welke opdrachten er zouden
zijn, inclusief branch, bestandspad en recordhash. Dit commando schrijft
niets.

> Het script staat als `uitgifte` in `intelligence/package.json` en wijst
> naar `src/cli/uitgifte.ts` (gemeten op de werkboom van `56c7b0a`,
> waarin `package.json` nog ongecommit is gewijzigd). Staat de alias in
> jouw checkout niet, draai dan `node src/cli/uitgifte.ts`.

### Stap 1 — de machinepoort aanzetten (nog geen publicatie mogelijk)

1. `INTEL_MACHINE_SLEUTEL` op `vibe-intel-api` zetten (paragraaf 5.1).
2. Dezelfde waarde als GitHub-secret zetten, plus `INTEL_API_BASIS` en
   `UITGIFTE_TOKEN` (paragraaf 5.2).

**Verwacht:** `curl .../machine/stand` geeft `200` met
`"omgeving":"productie"`. Zonder de sleutel: `503`. Met een verkeerde
sleutel: `401`.

### Stap 2 — de werkstroom droog draaien

Actions → **Autonome uitgifte** → *Run workflow*, met `droog`
**aangevinkt** (dat is de standaard).

**Verwacht:** de run is groen en de stapsamenvatting toont het beleid,
beide schakelaars op `false`, en een stopconditie `beleid_uit`. Er is
geen checkout gedaan, geen bestand geschreven, geen pull request geopend
en niets gemerged. Dit is óók de uitkomst die de geplande ronden geven
zolang het beleid uit staat — met dit verschil dat een geplande ronde
niet droog is en dus wél door zou gaan als er een opdracht lag.

### Stap 3 — `auto_publiceren_aan` aan

Zet in `intel.publicatiebeleid` de actieve rij op
`auto_publiceren_aan = true`. Laat `auto_uitgifte_aan` op `false`.

**Verwacht:** de taak `publiceren` (prioriteit 70) begint laagrisico-
concepten door beleid goed te keuren: status `goedgekeurd`,
`goedkeuring_soort = 'beleid'`, fase `GOEDGEKEURD`. De uitgifte doet nog
**niets**: `npm run uitgifte` blijft `STOP beleid_uit` melden,
want `auto_uitgifte_aan` staat nog uit. Draai hier een paar dagen op en
lees wat er wordt goedgekeurd. Dit is terug te draaien met één `update`.

### Stap 4 — `auto_uitgifte_aan` aan

Zet `auto_uitgifte_aan = true`. De database weigert deze stand zonder
stap 3 (constraint `publicatiebeleid_uitgifte_vereist_autogoedkeuring`).

**Verwacht:** `npm run uitgifte -- --wachtrij` meldt geen
stopconditie meer en toont opdrachten. De eerstvolgende geplande ronde
(twee keer per werkdag) neemt er één, schrijft het record, draait de
generator, opent een pull request, wacht op de drie checks, merget,
wacht op de deploy en laat de server de publieke URL meten. De
stapsamenvatting eindigt met **LIVE**.

> **Dit is de onomkeerbare stap.** Stap 3 is terug te draaien met een
> `update`. Vanaf stap 4 is terugdraaien een tweede merge, een tweede
> deploy en een URL die Google al gezien kan hebben. Zet hem niet aan op
> een vrijdag.

Wil je stap 4 eerst één keer met de hand onder toezicht zien, start dan
de werkstroom handmatig met `droog` **uit** in plaats van op de planning
te wachten.

---

## 7. Terugdraaien, per fase

| waar het strandde | wat er publiek is gebeurd | herstelactie |
|---|---|---|
| wachtrij of stopconditie | niets | niets te doen; de werkstroom eindigt groen zonder iets te schrijven |
| `4b` — de bytes schrijven of de hashcontrole | niets; geen push, geen PR | een `GEBLOKKEERD`-regel in het logboek. Een afwijkende hash betekent dat de bytes op de runner niet zijn wat de server bouwt: zoek dat uit, probeer niet opnieuw |
| `4c` — de generator faalt | niets | `GEBLOKKEERD`. Draai `node scripts/seo/bouw.mjs --offline` lokaal op `main` en los het daar op |
| `4d` — de push | een branch `publicatie/<slug>-v<id>` op de remote, geen PR | de branch mag blijven staan; een volgende ronde overschrijft hem met `--force-with-lease`. Of verwijder hem: `gh api -X DELETE repos/MounirVB/vibe-website/git/refs/heads/publicatie/<slug>-v<id>` |
| `5` — de server weigert `RECORD_GESCHREVEN` (`409`) | een branch, geen PR, **geen** publicatierij | de reden staat in het antwoord in de log. Bij een hashverschil: niets forceren; de branch verwijderen en de oorzaak zoeken |
| `6` — de PR | een open pull request | sluit hem zonder merge. Publiek is er niets gebeurd. Fase blijft `RECORD_GESCHREVEN`; de publicatierij staat er wel, dus de `--terugdraaien`-weg uit `RUNBOOK-PUBLICEREN.md` §5 is de nette correctie |
| `7` — een rode check | een open pull request, niets gemerged | de PR blijft open voor een mens. Repareer op een eigen branch; de autonome weg probeert deze versie niet nog eens zolang de fase op `PR_AANGEMAAKT` staat |
| `7` — `mergeStateStatus` is niet `CLEAN` | idem | meestal: de branch is niet bij met `main` (`strict: true`) of er staat een onafgerond gesprek. Rebase of los het gesprek op met de hand |
| `8` — de merge faalt | een open pull request | GitHub heeft geweigerd en dat is de bedoeling. `405` wijst op de bescherming of op een uitgezette squash-merge |
| `9` — de deploy komt niet | **de merge IS gebeurd**, `main` is verschoven, het logboek staat op `PR_GEMERGED` | kijk naar de Railway-deploy van `vibe-intel-api` en van `vibe-website`. Komt hij goed, meld de laatste fase dan met de hand na: `npm run publiceer -- --versie <id> --verifieer --door <adres>` (zie `RUNBOOK-PUBLICEREN.md` §4e) |
| `10` — de server weigert de live-verificatie (`409`) | **het artikel is gemerged en uitgerold, maar staat niet goed publiek** | het antwoord noemt welke van de vier metingen faalde (status, canonical, kop, sitemap). Dit is een echte bevinding: de generator heeft iets anders opgeleverd dan verwacht. Terugweg: `npm run publiceer -- --terugdraaien <publicatieId> --door <adres>` plus een revert-PR, want `main` is beschermd |
| gemerged en uitgerold, maar de inhoud blijkt fout | het artikel staat publiek | `npm run publiceer -- --terugdraaien <publicatieId> --door <adres>` zet het record terug (de volledige vorige inhoud staat in `publicaties.vorige_inhoud`), daarna een revert-PR |
| drie keer op rij mislukt | niets extra | de stroomonderbreker staat uit; de wachtrij blijft leeg tot er één geslaagde `PR_GEMERGED` of `LIVE_GEVERIFIEERD` is. Zet hem niet "even terug": de bedoeling is dat een mens kijkt |

**De noodstop.** Zet `auto_uitgifte_aan = false` op de actieve
beleidsrij. De volgende ronde meldt `STOP beleid_uit` en doet niets. Wil
je ook de goedkeuring stil: `auto_publiceren_aan = false`. Wil je de hele
machinepoort dicht: verwijder `INTEL_MACHINE_SLEUTEL` van
`vibe-intel-api`; dan antwoordt elke route `503` en stopt de werkstroom
op stap 2. Een lopende ronde wordt daarmee niet afgebroken — de
`concurrency`-groep staat met opzet op `cancel-in-progress: false`, want
een ronde die tussen de merge en de live-verificatie wordt afgekapt,
laat een publicatie achter die publiek staat maar in het logboek op
`PR_GEMERGED` blijft hangen.

---

## 8. Wat er NIET is getest, en waarom

Dit is de eerlijke lijst. Elk punt hier is een stap die bij de eerste
echte ronde voor het eerst draait.

| wat | waarom niet |
|---|---|
| **de echte GitHub-API** — `gh pr create`, `gh pr view`, `gh api .../check-runs`, `PUT .../pulls/{n}/merge`, `DELETE .../git/refs/heads/...` | dat vraagt een echte push naar een publieke repository en een echte pull request. Daar is geen droge stand voor, en een testbranch op `MounirVB/vibe-website` is zichtbaar voor iedereen. **Gevolg:** of de drie vereiste checks werkelijk starten op een push met `UITGIFTE_TOKEN` is beredeneerd (de standaard `GITHUB_TOKEN` start ze niet), **niet gemeten**. |
| **de echte Railway-deploy** — of `/machine/stand` na een merge de mergecommit als `sha` meldt, en binnen welke tijd | dat vereist een echte merge naar `main`, en dat is een productiedeploy. De 30 minuten in `DEPLOY_POGINGEN × DEPLOY_INTERVAL` zijn een ruime schatting op grond van wat de deploy doet (`npm run migreer && npm run zaai && npm run geo` als `preDeployCommand`), **geen gemeten duur**. |
| **de vier HTTP-metingen van de live-verificatie tegen een vers gepubliceerd artikel** | er is langs deze weg nog niets gepubliceerd. `verifieerLivePublicatie()` bestaat al uit #79 en wordt hier hergebruikt; dat die weg werkt, is in die release gemeten, maar niet op een artikel dat door de autonome keten is gegaan. |
| **de branchbescherming zoals hierboven beschreven** | de stand in paragraaf 3 is overgenomen uit de opdracht van deze release en in déze sessie niet opnieuw bij GitHub opgevraagd. |
| **`node scripts/seo/bouw.mjs --offline` binnen deze werkstroom** | de aanroep is dezelfde als in `poort.yml`, en `poort.yml` draait hem bij elke pull request. Dat hij in de uitgifte-werkstroom op een branch met één nieuw nieuwsrecord dezelfde uitvoer geeft, is niet apart gedraaid. |
| **een ronde die twee opdrachten tegenkomt** | de werkstroom neemt er met opzet één. Het tweede-opdrachtpad bestaat dus niet. |

### Wat er WEL is gemeten

| | |
|---|---|
| de YAML is geldig | `ruby -ryaml` parst het bestand; 2 triggers, 15 stappen, `permissions: {contents: read}`, `cancel-in-progress: false` |
| elk `run:`-blok is geldige bash | `bash -n` per blok, na het vervangen van de `${{ }}`-uitdrukkingen; alle 14 run-blokken groen, alle met `set -euo pipefail`. Ook de gegenereerde `poort.sh` met de vijf hulpfuncties is apart met `bash -n` getoetst |
| geen secret in een `run:`-regel, geen `set -x` | `secrets.*` komt uitsluitend in `env:`-blokken voor; `set -x` alleen in commentaar |
| geen opdrachtveld via `${{ }}` in een script | gemeten: de enige `${{ }}` in `run:`-blokken zijn de eigen, gevalideerde step-outputs |
| **`jq -j` houdt de bytes van het record heel en `jq -r` niet** | op een record met aanhalingstekens, newlines, een tab en non-ASCII: `jq -j` → `9563a576e1829e56…` = de verwachte sha256; `jq -r` → `54ae3f0d197a99b7…`. De hele keten zou op die ene extra newline stranden |
| de hashcontrole van stap 4b | een nagebouwde opdracht geschreven met `jq -j` gaf `598f60c0…`, gelijk aan de `recordHash` uit de opdracht; het bestand eindigt op byte `0a` |
| de veldvalidatie weigert wat ze moet weigeren | `test$(touch …)`, `test\`id\``, `../../etc/passwd`, `data/inhoud/nieuws/../../../x.json`, `scripts/seo/bouw.mjs`, `main`, `--upload-pack=…`, `412; rm -rf /` — alle negen geweigerd, geen bijeffect op de schijf; de geldige waarden gaan door |
| de checkmatcher | vijf scenario's op een nagebouwde `check-runs`-uitvoer: alles groen (ook met een herstart: de laatste run wint), één rood, één bezig, een lege uitvoer, en een check waarvan de naam als deeltekst in een andere voorkomt — die laatste wordt terecht **niet** als groen geteld |
| `haal` en `meld` tegen het contract van de machinepoort | tegen een nepserver op `127.0.0.1:4399` die `machine.ts` nabootst: `200` op `/machine/stand` en `/machine/uitgifte`, `401` bij een verkeerde sleutel, `503` zonder sleutel, `400` bij een onbekende fase, `409` bij een fase die niet kan. In alle gevallen de juiste exitcode en een foutregel voor de `GEBLOKKEERD`-melding, en nergens een sleutel in de uitvoer |

---

## 9. Operationele meldingen: er is vandaag geen kanaal

### Wat er is gemeten, 9 november 2026, in de productiecontainer

| variabele | stand |
|---|---|
| `INTEL_MELD_WEBHOOK` | **niet gezet** |
| `INTEL_MELD_TOKEN` | niet gezet |
| `INTEL_MAIL_ACTIEF` | **niet gezet** |
| `INTEL_MONITOR_URL` | niet gezet |

De gezondheidstaak meldt dat ook zelf, letterlijk: *"bestemming UIT —
INTEL_MELD_WEBHOOK is niet gezet. Er is geen door een mens goedgekeurde
bestemming voor operationele meldingen"*, met daarachter
`mail[resend -> marketing@vibeenergy.nl] gepland 8, nieuw 0, aangeboden 0,
geaccepteerd 0`.

Er staat dus wel een mailbestemming klaar, maar `INTEL_MAIL_ACTIEF` staat
niet aan, en `meldmail.ts` noemt die stand dan ook "GECONFIGUREERD MAAR
NIET ACTIEF". De acht geplande berichten zijn nooit aangeboden.

**De conclusie die daaruit volgt, en hij is ongemakkelijk:** een
operationele melding uit de database bereikt vandaag niemand. Niet via
een webhook (die bestaat niet), niet via mail (die staat uit). Wie nu
niet in het dashboard kijkt, ziet een storing niet.

### Waarom de webhook ontbreekt, en waarom dat een keuze was

`src/ops/melden.ts` legt het uit in zijn kop: er is geen bestemming
omdat er geen door een MENS goedgekeurde bestemming is. Een melding naar
een verkeerde plek sturen is erger dan hem niet sturen: de melding kan
een storingsdetail, een bron-URL of een stuk artikeltekst bevatten, en
dat hoort niet in een kanaal dat niemand heeft gekozen.

Twee dingen die daarbij horen en die je moet weten:

* **`LET OP` alarmeert structureel niet.** `MELDWAARDIG` bevat alleen
  `FOUT` en `NIET GEMETEN` (melden.ts). Een signaal dat op LET OP staat
  — zoals `ingestie/brondekking` vandaag — komt dus nooit in
  `intel.meldingen` en kan het weekrapport niet halen.
* **Een melding sluit alleen op een gemeten OK.** Hernoem je een
  signaal, dan blijft de oude melding eeuwig open staan.

### Wat de autonome uitgifte hier zelf aan doet

De uitgifte leunt met opzet **niet** op dit kanaal:

1. **Een mislukte werkstroom is de melding.** Faalt een stap, dan faalt
   de GitHub Actions-run, en GitHub mailt de eigenaar van de repository.
   Dat kanaal werkt, is al ingericht en vraagt geen configuratie.
2. **De stroomonderbreker is zichtbaar.** Na drie mislukkingen stopt de
   uitgifte en staat de reden op `/uitgifte` onder "Waarom er NU niets
   gebeurt".
3. **Het logboek is volledig.** Elke mislukking staat als besluit met
   fase `GEBLOKKEERD`, stap en reden in `intel.publicatiebesluiten`.

### Het voorstel, met de drie opties in volgorde van voorkeur

**(a) Zet het bestaande MAILKANAAL aan — aanbevolen.** Eén variabele,
`INTEL_MAIL_ACTIEF=1`, en een ontvanger die een mens heeft gekozen. Het
pad bestaat, is getoetst en loopt via Resend; de bestemming staat al
ingevuld. Controleer vóór het aanzetten of `marketing@vibeenergy.nl`
werkelijk de bedoelde ontvanger is — een operationele storing hoort niet
in een marketingpostbus. Een eigen adres (`storing@…`) is beter.

**(b) Een webhook naar een privékanaal.** `INTEL_MELD_WEBHOOK` moet
https zijn (melden.ts weigert http) en mag een `INTEL_MELD_TOKEN`
meekrijgen als `Authorization: Bearer`. Voorwaarden: het kanaal is
privé, de URL is zelf een geheim (een Slack- of Teams-webhookadres is
een credential), en de ontvanger is een mens die er iets mee doet.

**(c) Niets, en dat bewust vastleggen.** Verdedigbaar zolang de eigenaar
dagelijks `/uitgifte` en het weekrapport leest. Dan hoort er wel ergens
te staan DAT dit de afspraak is, want nu leest het als een vergeten
variabele.

**Wat hier níét is gedaan:** geen variabele gezet, geen webhook
aangemaakt, geen ontvanger gewijzigd, geen mail aangezet. Dit is een
voorstel en een meting, geen handeling.

---

## 10. Verwante documenten

| | |
|---|---|
| `docs/RUNBOOK-PUBLICEREN.md` | dezelfde keten **met de hand**, door een mens, met de tunnel naar de privédatabase |
| `src/uitgifte/opdracht.ts` | de beslisser: de wachtrij, de stopcondities, de toestandsmachine en de vijf fasen |
| `src/dashboard/machine.ts` | het contract van de twee endpoints, en wat die poort niet aanneemt van de aanroeper |
| `.github/workflows/uitgifte.yml` | de uitvoerder |
| `.github/workflows/poort.yml` | de drie vereiste checks |
| `db/migraties/0058_uitgifte_is_een_tweede_besluit.sql` | waarom uitgifte een tweede schakelaar is en niet dezelfde |
| `deploy/railway.md` | de services en hun bestaande variabelen |
