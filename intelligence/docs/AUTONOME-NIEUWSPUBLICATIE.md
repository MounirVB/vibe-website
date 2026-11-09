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
| 3 | **concept** | taak `concept` (prioriteit 38), **uitsluitend `NEWS_ITEM`** | een inhoudsversie met status `in_concept`, de poortuitslag en een inhoudsafdruk |
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

**Stap 3 verwerkt sinds V1.1 alleen nog NEWS_ITEM, en dat is een
reparatie en geen versmalling uit netheid.** De werkvoorraad van de taak
selecteerde op alle vier de besluitsoorten en wierp niets weg op
doelpad. Drie kennisvoorstellen naar dezelfde doelpagina vulden daarmee
de drie plekken van een ronde — `concept.ts` geeft een `pagina_update`
het pad van de DOELPAGINA, en het versienummer loopt per pad op, dus ze
verdrongen elkaar niet maar stapelden tot v1, v2 en v3, alle drie
geblokkeerd. De nieuwsketen kwam niet aan de beurt, en een geblokkeerde
versie is niet te verwijderen: de applicatierol heeft geen `delete` op
`intel.inhoud_versies`. Voorkomen moet dus in de SELECTIE gebeuren.

Daar staan nu drie eerlijkheidssleutels: één concept per gebeurtenis, één
per padsleutel (de genormaliseerde TITEL — een `NEWS_ITEM` wordt
`nieuw_artikel` en krijgt `/nieuws/<slug(titel)>`; `doel_pagina_id` stuurt
dat pad niet) en ten hoogste twee van de drie plekken per onderwerp.
Achter die voorspelling zit een vangrail: het echte pad komt pas uit
`bouwConcept()`, dus bij een tweede versie op hetzelfde pad stopt de
ronde en zegt dat in de uitkomstregel. Gevolg voor wie het leest:
`UPDATE_EXISTING`, `KNOWLEDGE_UPDATE`, `NEW_ARTICLE` en `REGIONAL_PATCH`
hebben geen geplande route meer — alleen `npm run concept`, de menselijke
weg. Een cadans voor die kennisstroom is een eigen taak met een eigen
budget, niet een verruiming van deze.

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

**De identiteit van de uitvoerder: GitHub ondertekent zelf.** Een
werkstroom met `permissions: id-token: write` vraagt bij GitHub een JWT
op met de repository, het werkstroompad, de run-id, de poging, de
commit, de ref, de actor en het event erin. `dashboard/oidc.ts` doet
acht controles, en elk punt staat er om één weg af te sluiten:

| | controle | wat het afsluit |
|---|---|---|
| 1 | de vorm: drie delen, base64url | rommel komt niet verder dan de voordeur |
| 2 | alleen `RS256` | `alg: none` en elke HMAC-variant — de klassieke aanval waarbij de aanroeper het algoritme kiest en de server hem gelooft. Bij HS256 is de PUBLIEKE sleutel het "geheim", en die is openbaar |
| 3 | de sleutel op `kid` uit de JWKS van GitHub | een token ondertekend met een sleutel die GitHub niet heeft. Bij een onbekende `kid` wordt de cache één keer weggegooid, zodat een sleutelrotatie geen storing geeft |
| 4 | de ondertekening, RSA-SHA256 over kop en lading | alles; dit is het enige punt dat niet te omzeilen is door iets anders mee te sturen |
| 5 | de uitgever, letterlijk | een token van een andere uitgever |
| 6 | het publiek (`aud`), letterlijk — **en ook als `aud` een lijst is** | een token dat GitHub voor een ÁNDERE dienst heeft uitgegeven. GitHub geeft dat token aan elke werkstroom die erom vraagt, dus zonder deze controle is elke andere werkstroom hier welkom. Een verificatie die alleen de stringvorm kent, toetst bij een lijst stilletjes niets |
| 7 | `exp`, `nbf`, `iat`, 60s klokmarge en een EIGEN maximumleeftijd van 600s | een onderschept token dat nog een kwartier bruikbaar blijft. De werkstroom vraagt zijn token per aanroep op, dus hij heeft die ruimte niet nodig |
| 8 | repository, werkstroompad, ref en event tegen de allowlist | een andere repository, een andere werkstroom in dezelfde repository, een kopie van de werkstroom op een eigen branch, en elk ander event dan `schedule` of `workflow_dispatch` — een `pull_request`-run van een fork komt er dus niet langs |

**Drie dingen die cryptografie niet kan zien, en waar ze staan.**

*Eenmaligheid.* Een onderschept token is ECHT; de ondertekening klopt.
Alleen een geheugen van wat al is gebruikt houdt hem tegen. De `jti` is
de primaire sleutel van `intel.machine_tokens` (migratie 0059), dus een
herhaling botst op de database en niet op een controle die iemand kan
vergeten — en dat werkt ook met twee instanties van de dienst, waar een
Map in het proces niets zou betekenen. Verlopen rijen worden bij elke
verificatie opgeruimd. Het token zelf komt er nooit in: een tabel met
JWT's is een tabel met credentials, en die komt in elke back-up terecht.

*Runbinding.* Een fase mag alleen worden gemeld door de run die de
VORIGE fase deed. Zonder die regel kon run B de fasen melden van werk
dat run A had gedaan: het token van B is echt en de fase-orde klopt. De
regel is niet strenger dan nodig — een keten die officieel is gestrand
(een `GEBLOKKEERD`-regel in het logboek) mag door een andere run worden
hervat, anders zou één 502 van GitHub een artikel voor altijd halverwege
laten staan.

*De run komt uit het TOKEN.* Een veld `run_id`, `repository` of
`organisatieId` in het lichaam van het verzoek doet niets. Dat is het
verschil tussen een bewijs en een bewering.

**Er is geen servergeheim meer.** Alleen de allowlist uit paragraaf 5.1.
Een geheim dat niet bestaat, kan niet lekken — en de eigenaar hoeft er
dus ook geen aan te maken of te rouleren.

**De identiteit van de uitvoerder.** Sinds V1.1 een GitHub-OIDC-token in
plaats van een statisch geheim; zie paragraaf 5.1 en
`intelligence/src/dashboard/oidc.ts`. De oude tekst hieronder staat er
nog omdat hij uitlegt waarom een geheim alléén niet volstond.

**De machinesleutel (V1, VERVALLEN).** `INTEL_MACHINE_SLEUTEL`, minimaal 32 tekens
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

**Er is sinds V1.1 geen servergeheim meer.** De machinepoort hing in V1
aan `INTEL_MACHINE_SLEUTEL`, een statisch bearer-token. Dat bewees dat
de aanroeper een string kende en verder niets — niet welke repository,
niet welke werkstroom, niet welke run — en het bleef geldig tot iemand
hem rouleerde. Nu ondertekent **GitHub zelf** een OIDC-token met al die
gegevens erin, en de server verifieert dat tegen de publieke sleutels
van GitHub. Wat de server nodig heeft is dus geen geheim maar een
**allowlist**:

| naam | waarde | nodig voor |
|---|---|---|
| `INTEL_OIDC_AUDIENCE` | `vibe-intel-uitgifte` (of een eigen reeks; moet gelijk zijn aan de GitHub-variabele) | het publiek waarvoor het token is uitgegeven; zonder deze controle is een token dat voor een ÁNDERE dienst is uitgegeven hier ook geldig |
| `INTEL_UITGIFTE_REPOSITORY` | `MounirVB/vibe-website` | alleen deze repository mag terugmelden |
| `INTEL_UITGIFTE_WORKFLOW` | `.github/workflows/uitgifte.yml` | alleen deze werkstroom, niet een andere in dezelfde repository |
| `INTEL_UITGIFTE_REF` | optioneel; standaard `refs/heads/main` | alleen op deze branch; zonder dit zou een kopie van de werkstroom op een eigen branch mogen melden |

Ontbreekt één van de eerste drie, dan antwoordt `/machine/*` met `503`
en is er geen uitgifte. Dat is dezelfde fail-closed regel als V1 had,
nu zonder een geheim dat kan lekken.

Zet ze **niet** op `vibe-intel-worker` of `vibe-intel-planner`: daar
draait geen HTTP-server. Alle andere variabelen van `vibe-intel-api`
(`INTEL_OMGEVING`, `INTEL_DB_URL`, `INTEL_DB_APP_ROL`,
`INTEL_DB_ONDERHOUD_ROL`, `INTEL_ORGANISATIE`, `INTEL_SITE_BASIS_URL`,
`INTEL_NETWERK_TOEGESTAAN`, `INTEL_LOG_NIVEAU`, `INTEL_SESSIE_GEHEIM`,
`INTEL_DASHBOARD_POORT`, `INTEL_DASHBOARD_BIND`,
`INTEL_DASHBOARD_ACHTER_TLS_PROXY`) blijven zoals ze zijn; zie
`deploy/railway.md` §3.

**LET OP: de server moet `token.actions.githubusercontent.com` kunnen
bereiken** om de publieke sleutels (JWKS) van GitHub op te halen. Die
worden tien minuten gecached en bij een onbekende `kid` één keer
opnieuw gehaald, zodat een sleutelrotatie bij GitHub geen storing geeft.

**Controleren** (toont namen, geen waarden):

```bash
railway variables -s vibe-intel-api --json | jq -r 'keys[]' | grep -E 'OIDC|UITGIFTE'
```

**Controleren dat de poort fail-closed staat** — dit kan van elke
machine, want er is geen geheim voor nodig:

```bash
curl -sS "$INTEL_API_BASIS/machine/stand" | jq .
# zonder allowlist: 503 en de drie variabelenamen in de fout
# met allowlist, zonder token: 401 "geen Bearer-token"
# een verzonnen token: 401, met de reden erbij
```

Een geldige meting van `/machine/stand` kan **alleen uit een
GitHub-run** komen: het token moet door GitHub zijn ondertekend. Dat is
precies de bedoeling — er is geen credential meer die een mens kan
dragen.

### 5.2 GitHub — secrets op `MounirVB/vibe-website`

| naam | soort | inhoud | minimale rechten |
|---|---|---|---|
| `UITGIFTE_TOKEN` | repository secret | een fine-grained personal access token, **alleen** op `MounirVB/vibe-website` | `Contents: Read and write` (pushen en een branch verwijderen), `Pull requests: Read and write` (PR openen en mergen), `Checks: Read` (de conclusie van de drie vereiste checks lezen), en `Metadata: Read` dat GitHub altijd verplicht meegeeft. **Geen** Actions, **geen** Secrets, **geen** Administration, **geen** Workflows. |
| `INTEL_OIDC_AUDIENCE` | repository **variabele** (geen secret) | dezelfde waarde als in Railway; standaard `vibe-intel-uitgifte` | het is geen geheim: het token is alleen geldig mét de ondertekening van GitHub |
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
| migratie 0059 toegepast | nodig voor de machinepoort; zonder `intel.machine_tokens` weigert elke aanroep | `npm run migreer` |

Deze twee kolommen zijn de enige echte aan/uit van de hele keten. Er is
geen pad in de code dat ze zelf aanzet.

**Migratie 0059 is additief en bevat geen inhoud.** Eén tabel,
`intel.machine_tokens`, met de `jti` van een gebruikt OIDC-token als
primaire sleutel; dat is de herhaalbescherming uit paragraaf 3. Het token
ZELF komt er nooit in — een tabel met JWT's is een tabel met credentials,
en die belandt in elke back-up. RLS staat aan met een policy op
`app.organisatie_id`, en de rol krijgt `select, insert, delete` maar
bewust GEEN `update`: een gebruikt bewijs mag niet worden teruggedraaid.
Verlopen rijen worden bij elke verificatie opgeruimd, dus de tabel groeit
niet mee met het aantal runs.

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

1. De drie allowlistvariabelen op `vibe-intel-api` zetten (paragraaf 5.1). Er is géén geheim om te genereren.
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
machinepoort dicht: verwijder `INTEL_UITGIFTE_REPOSITORY` van
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
| **de echte GitHub-API** — `gh pr create`, `gh pr view`, `gh api .../check-runs`, `PUT .../pulls/{n}/merge`, `DELETE .../git/refs/heads/...` | dat vraagt een echte push naar een publieke repository en een echte pull request. Daar is geen droge stand voor, en een testbranch op `MounirVB/vibe-website` is zichtbaar voor iedereen. **Gevolg:** of de drie vereiste checks werkelijk starten op een push met `UITGIFTE_TOKEN` is beredeneerd (de standaard `GITHUB_TOKEN` start ze niet), **niet gemeten**. Dit punt staat na V1.1 ongewijzigd: de machinepoort is op een echte GitHub-run gemeten, de PUSH-weg niet. |
| **de echte Railway-deploy** — of `/machine/stand` na een merge de mergecommit als `sha` meldt, en binnen welke tijd | dat vereist een echte merge naar `main`, en dat is een productiedeploy. De 30 minuten in `DEPLOY_POGINGEN × DEPLOY_INTERVAL` zijn een ruime schatting op grond van wat de deploy doet (`npm run migreer && npm run zaai && npm run geo` als `preDeployCommand`), **geen gemeten duur**. |
| **de vier HTTP-metingen van de live-verificatie tegen een vers gepubliceerd artikel** | er is langs deze weg nog niets gepubliceerd. `verifieerLivePublicatie()` bestaat al uit #79 en wordt hier hergebruikt; dat die weg werkt, is in die release gemeten, maar niet op een artikel dat door de autonome keten is gegaan. |
| **de branchbescherming zoals hierboven beschreven** | de stand in paragraaf 3 is overgenomen uit de opdracht van deze release en in déze sessie niet opnieuw bij GitHub opgevraagd. |
| **`node scripts/seo/bouw.mjs --offline` binnen deze werkstroom** | de aanroep is dezelfde als in `poort.yml`, en `poort.yml` draait hem bij elke pull request. Dat hij in de uitgifte-werkstroom op een branch met één nieuw nieuwsrecord dezelfde uitvoer geeft, is niet apart gedraaid. |
| **een ronde die twee opdrachten tegenkomt** | de werkstroom neemt er met opzet één. Het tweede-opdrachtpad bestaat dus niet. |

### Wat er WEL is gemeten

| | |
|---|---|
| de YAML is geldig | `ruby -ryaml` parst het bestand; 2 triggers, 15 stappen, `permissions: {contents: read, id-token: write}`, `cancel-in-progress: false`. **LET OP: geldige YAML is niet hetzelfde als een werkstroom die GitHub kan starten** — zie de V1.1-regels hieronder |
| elk `run:`-blok is geldige bash | `bash -n` per blok, na het vervangen van de `${{ }}`-uitdrukkingen; alle 14 run-blokken groen, alle met `set -euo pipefail`. Ook de gegenereerde `poort.sh` met de vijf hulpfuncties is apart met `bash -n` getoetst |
| geen secret in een `run:`-regel, geen `set -x` | `secrets.*` komt uitsluitend in `env:`-blokken voor; `set -x` alleen in commentaar |
| geen opdrachtveld via `${{ }}` in een script | gemeten: de enige `${{ }}` in `run:`-blokken zijn de eigen, gevalideerde step-outputs |
| **`jq -j` houdt de bytes van het record heel en `jq -r` niet** | op een record met aanhalingstekens, newlines, een tab en non-ASCII: `jq -j` → `9563a576e1829e56…` = de verwachte sha256; `jq -r` → `54ae3f0d197a99b7…`. De hele keten zou op die ene extra newline stranden |
| de hashcontrole van stap 4b | een nagebouwde opdracht geschreven met `jq -j` gaf `598f60c0…`, gelijk aan de `recordHash` uit de opdracht; het bestand eindigt op byte `0a` |
| de veldvalidatie weigert wat ze moet weigeren | `test$(touch …)`, `test\`id\``, `../../etc/passwd`, `data/inhoud/nieuws/../../../x.json`, `scripts/seo/bouw.mjs`, `main`, `--upload-pack=…`, `412; rm -rf /` — alle negen geweigerd, geen bijeffect op de schijf; de geldige waarden gaan door |
| de checkmatcher | vijf scenario's op een nagebouwde `check-runs`-uitvoer: alles groen (ook met een herstart: de laatste run wint), één rood, één bezig, een lege uitvoer, en een check waarvan de naam als deeltekst in een andere voorkomt — die laatste wordt terecht **niet** als groen geteld |
| `haal` en `meld` tegen het contract van de machinepoort | tegen een nepserver op `127.0.0.1:4399` die `machine.ts` nabootst: `200` op `/machine/stand` en `/machine/uitgifte`, `401` bij een verkeerde sleutel, `503` zonder sleutel, `400` bij een onbekende fase, `409` bij een fase die niet kan. In alle gevallen de juiste exitcode en een foutregel voor de `GEBLOKKEERD`-melding, en nergens een sleutel in de uitvoer |

### En wat V1.1 eraan heeft toegevoegd

De eerste echte run van deze werkstroom faalde in **0 seconden**, drie
keer, met nul jobs en nul check-runs. Dat is wat de regels hierboven niet
dekten: alles was lokaal groen en GitHub kon het bestand niet lezen.

| | |
|---|---|
| **de werkelijke startfout, bewezen en niet vermoed** | de dispatch-API is het ENIGE kanaal dat hem noemt: `failed to parse workflow: (Line: 232, Col: 14): An expression was expected`. De oorzaak was een COMMENTAARREGEL binnen een `run:`-blok met een leeg expressiehaakje erin. Actions vouwt expressies in een run-blok uit vóórdat de shell het script ziet, dus een shell-`#` beschermt niets. Mijn eerste hypothese (`inputs.droog` op jobniveau) was FOUT en is weerlegd door run 42594508325, waarin `DROOG: ja` gewoon uitkomt |
| **die defectklasse kan niet terugkomen** | `ops/werkstroompoort.mjs`, 11 van 11 PASS, en hij hangt in de securityjob van `poort.yml`. Hij toetst: geen Actions-expressie binnen een `run:`-blok, expliciete `permissions`, geen secret in een `echo`, `set -euo pipefail` in elke meerregelige uitgiftestap, `id-token: write` aanwezig, geen `secrets.INTEL_MACHINE_SLEUTEL`, een OIDC-token per aanroep, geen `--admin` en geen kale `--force`. Mutatiebewijs: de oude commentaarregel teruggezet → FAIL met regelnummer |
| **de werkstroom is fail-closed op een echte run** | run 42594508325 op `fa193303`: de werkstroom start, stap 1 meet dat de configuratie ontbreekt, en alle 15 stappen worden overgeslagen zonder één aanroep naar de server |
| **de machinepoort, met echte sleutels** | 28 van 28 in `test/integratie/machinepoort.test.ts`: een eigen JWKS op `127.0.0.1`, zelfondertekende tokens, en de acht controles uit paragraaf 3 elk met hun eigen weigering — `alg: none`, HS256 met de publieke sleutel als geheim, verkeerde sleutel, onbekende `kid`, verkeerde uitgever, verkeerd publiek (ook als lijst), verlopen/te oud/in de toekomst, verkeerde repository/werkstroom/branch/event, hergebruikte `jti`, en een `run_id` uit het lichaam die niets doet |
| **een meldfout beschadigt het auditspoor niet** | zaak 6 en 7 in `test/integratie/uitgifte-melden.test.ts` roepen het meldpad met een gegarandeerd kapot pad aan binnen de transactie die de auditregels schrijft, zonder `try/catch`; beide regels staan er daarna. Zaak `2c` in `uitgifte-keten.test.ts` meet de naad met een lege bestemming — rood bewezen door de aanroep weg te halen |

---

## 9. Operationele meldingen: het pad bestaat, en het mailkanaal levert af

### Wat er is gemeten, 9 november 2026, PER SERVICE

**De eerste meting van deze paragraaf was in de verkeerde container
gedaan, en de conclusie eruit was fout.** Hij stond in
`vibe-intel-api`, en daar is geen enkele meldvariabele gezet — maar
`meldmailRonde()` draait niet daar. Hij draait op `vibe-intel-worker`,
en die heeft het mailkanaal volledig ingericht. Hieronder staat wat er
werkelijk is gemeten, per service, want dat onderscheid IS het antwoord:

| variabele | `vibe-intel-api` | `vibe-intel-worker` |
|---|---|---|
| `INTEL_MAIL_ACTIEF` | niet gezet | **`1`** |
| `INTEL_MAIL_ONTVANGER` | niet gezet | **`marketing@vibeenergy.nl`** |
| `INTEL_MAIL_AFZENDER` | niet gezet | **gezet** |
| `RESEND_API_KEY` | niet gezet | **gezet** |
| `INTEL_MELD_WEBHOOK` | niet gezet | niet gezet |
| `INTEL_MELD_TOKEN` | niet gezet | niet gezet |
| `INTEL_MONITOR_URL` | niet gezet | niet gezet |
| `INTEL_GCS_BUCKET` | niet gezet | **gezet** |

**En het kanaal levert werkelijk af.** `intel.meld_berichten`: 54
berichten, 54 door Resend geaccepteerd, 0 opgegeven. Twee voorbeelden uit
de afgelopen twee dagen:

```
2026-11-08T20:03  CRITICAL  kritieke storing: backup/restorebewijs…   geaccepteerd
2026-11-09T09:05  HERSTEL   opgelost: backup/externe kopie            geaccepteerd
```

Eén grens eerlijk benoemd: `afgeleverd_op` is bij alle 54 berichten
leeg. Resend heeft ze GEACCEPTEERD; dat ze in de postbus zijn aangekomen
is niet gemeten, want er komt geen bezorgsignaal terug.

**Wat dat betekent voor de uitgifte.** `meldUitgifteStoring()` vult
`ernst`, en dat is precies de voorwaarde waarop `meldmailRonde()` open
meldingen selecteert. Een gestrande publicatie krijgt dus **wel** een
bestemming: asynchroon, via de bestaande mailronde op de worker, naar
`marketing@vibeenergy.nl`. Wat ontbreekt is het SYNCHRONE kanaal: zonder
`INTEL_MELD_WEBHOOK` op de service die de uitgifte draait, levert de
aanroep zelf niets af en meldt hij eerlijk `afgeleverd: false`.

**Twee dingen om te weten.** Controleer of `marketing@vibeenergy.nl`
werkelijk de bedoelde ontvanger is voor een operationele storing — een
eigen adres (`storing@…`) is beter. En een melding die nooit meer als
signaal wordt uitgegeven, sluit nooit meer: op 9 november stond
`backup/restorebewijs leesbaar` nog op CRITICAL terwijl de oorzaak (de
GCS-billingstoring) bewezen weg was en de gezondheidsronde `FOUT 0`
meldde. Dat signaal wordt alleen bij een probleem uitgegeven, dus er komt
geen OK om hem op te sluiten; dat is een handmatige afsluiting.

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

### Wat de uitgifte sinds V1.1 zelf doet

**Tot V1.1 meldde `meldUitgifteFout()` niets.** De naam leest als een
alarm, maar de functie schreef uitsluitend een `GEBLOKKEERD`-regel, een
auditregel en één logregel. Een gestrande publicatie bereikte dus
niemand, en dat is bij een fail-closed keten (drie fouten en hij staat
stil) precies het verkeerde stiltepunt.

`src/uitgifte/melden.ts` sluit dat gat, op de BESTAANDE infrastructuur en
zonder nieuwe tabel, nieuwe dienst of nieuwe grant:

* De storing komt in `intel.meldingen` (migratie 0016) met groep
  `uitgifte` en sleutel `uitgifte/<stap>`. De partiële unieke index
  `meldingen_een_open_per_sleutel` IS de deduplicatie — tien mislukte
  generatorstappen geven één open melding met een teller, geen tien
  regels.
* De **ernst** komt uit `ernstVan()` en wordt meegevuld, want
  `meldmail.ts` selecteert open meldingen op `ernst is not null`. Een rij
  zonder ernst staat alleen in het dashboard, en een melding die geen
  kanaal kan halen is geen melding.
* De webhook levert af **tijdens** de aanroep, met dezelfde
  JSON-sleutels en dezelfde bezorgkolommen (`bezorgd_op`,
  `bezorgpogingen`, `laatste_bezorgfout`) die `bezorgMeldingen()` al
  gebruikt — dus een mislukte aflevering wordt later door de bestaande
  monitorronde opnieuw geprobeerd, met dezelfde pogingengrens (5).
* Het mailkanaal levert **niet** mee met de aanroep. Dat wordt eerlijk
  gerapporteerd als kanaal `mail (asynchroon)` met `afgeleverd: false`,
  in plaats van een acceptatie te claimen die niet is gemeten.

**Een meldfout mag het auditspoor niet beschadigen**, en dat is op drie
manieren vastgelegd in plaats van afgesproken:

1. **Eigen verbinding.** Het meldpad krijgt de POOL en nooit de client
   van de aanroeper, dus het schrijft in zijn eigen transactie en kan die
   van `legPublicatiebesluitVast()` niet laten terugrollen. De aanroep
   staat bovendien NA de commit.
2. **Hij werpt nooit.** Elke fout — kapotte webhook, onbereikbare
   database, gooiend afleverpad, uitgeputte pool — komt terug als
   `{afgeleverd: false, kanaal, reden}`.
3. **Harde tijdslimiet van 10 s.** Een hangende ontvanger houdt de
   uitgifteketen niet vast.

Toets `2c` in `test/integratie/uitgifte-keten.test.ts` meet de naad met
een LEGE bestemming: de melding staat open, er is niets afgeleverd, en
het auditspoor staat er ondanks dat. Zaak 6 en 7 in
`test/integratie/uitgifte-melden.test.ts` roepen het meldpad met een
gegarandeerd kapot pad aan BINNEN de transactie die de auditregels
schrijft — zonder `try/catch` eromheen, zodat een worp die transactie
zou terugrollen — en bewijzen daarna dat beide regels er staan.

**En het is zichtbaar.** `/uitgifte` heeft vier nieuwe secties: de
meldketen in tegels (open meldingen, laatste GELUKTE aflevering, open
met bezorgfout, ontbrekende configuratie), de twee kanalen met per kanaal
of hij tijdens de uitgifte aflevert, welke variabelen ontbreken (de
namen, nooit de waarden), en de open meldingen met hun bezorgstand. Eén
meting staat daar bewust als **niet gemeten**: `intel.meldingen` heeft
geen tijdstempel per POGING, dus "wanneer mislukte de laatste aflevering"
is niet te beantwoorden — `laatst_gezien_op` is het moment van de laatste
DETECTIE en betekent iets anders.

Daarnaast blijven de drie dingen gelden die ook zonder kanaal werken: een
mislukte werkstroom faalt in GitHub Actions (en GitHub mailt de eigenaar
van de repository), de stroomonderbreker staat op `/uitgifte` onder
"Waarom er NU niets gebeurt", en elke mislukking staat als besluit met
fase `GEBLOKKEERD` in `intel.publicatiebesluiten`.

### Wat er nog te beslissen valt

Het mailkanaal is ingericht en levert af (zie de meting hierboven), dus
de vraag is niet meer OF een storing iemand bereikt, maar of dat snel
genoeg is en bij de juiste persoon. Staat er op de service die de
uitgifte draait géén `INTEL_MELD_WEBHOOK`, dan levert de aanroep zelf
niets af en wacht de melding op de volgende mailronde. Het logboek zegt dat
dan ook letterlijk; dit is een echte regel uit een testrun:

> `"meldkanaal":"geen","meldingAfgeleverd":false,"meldreden":"er is geen
> enkel meldkanaal geconfigureerd, dus deze storing bereikt op dit moment
> NIEMAND. De melding staat open in intel.meldingen (id 6). Niet gezet:
> INTEL_MELD_WEBHOOK, RESEND_API_KEY, INTEL_MAIL_ONTVANGER,
> INTEL_MAIL_AFZENDER, INTEL_MAIL_ACTIEF."`

**(a) Het bestaande MAILKANAAL — AL AAN.** Op `vibe-intel-worker` staan
`INTEL_MAIL_ACTIEF=1`, `RESEND_API_KEY`, `INTEL_MAIL_ONTVANGER` en
`INTEL_MAIL_AFZENDER`; 54 van 54 berichten zijn door Resend geaccepteerd.
Er is hier dus niets te zetten. Twee dingen blijven open:
`INTEL_MONITOR_URL` is niet gezet (dat is alleen de link in het bericht),
en de ontvanger is een marketingpostbus — controleer of dat de bedoelde
plek is voor een operationele storing.

**(b) Een webhook, en dan op TWEE plekken.** `INTEL_MELD_WEBHOOK` moet
https zijn (`melden.ts` weigert http) en mag een `INTEL_MELD_TOKEN`
meekrijgen als `Authorization: Bearer`. Zet hem op elke service die de
uitgifteketen draait (worker/planner) **én** op de dashboardservice:
`uitgifteMeldconfiguratie()` leest de omgeving van zijn eigen proces, dus
staat hij alleen op de worker, dan toont `/uitgifte` "UIT" terwijl er wel
wordt afgeleverd. Let op twee bestaande vallen: een LEEG token is een
geldige stand, dus een ontvanger zonder authenticatie geeft geen
foutmelding, en de naam `INTEL_MELD_WEBHOOK_TOKEN` wordt NERGENS gelezen.

**(c) Niets, en dat bewust vastleggen.** Verdedigbaar zolang de eigenaar
`/uitgifte` en het weekrapport leest. Dan hoort er wel ergens te staan
DAT dit de afspraak is, want nu leest het als een vergeten variabele.

**Twee dingen die bewust NIET zijn veranderd.** `MELDWAARDIG` in
`src/ops/melden.ts` bevat nog steeds alleen `FOUT` en `NIET GEMETEN`, dus
een `LET OP`-signaal alarmeert structureel niet; dat breed meldwaardig
maken zou in één ronde elk bestaand LET OP-signaal een melding laten
openen — een mailburst als neveneffect. En een uitgiftemelding sluit
nooit automatisch: `synchroniseerMeldingen()` sluit alleen meldingen
waarvan de sleutel in de gezondheidssignalen voorkomt, en `gezondheid.ts`
maakt geen signaal met groep `uitgifte`. Dat is zo gelaten omdat de
uitgiftelaag niet namens een mens mag beweren dat een gestrande
publicatie is opgelost — maar het betekent dat die lijst groeit tot
iemand kijkt.

**Wat hier níét is gedaan:** geen variabele gezet, geen webhook
aangemaakt, geen ontvanger gewijzigd, geen mailcredential aangeraakt. Het
PAD is gebouwd en getoetst; het mailkanaal was al ingericht en is niet
door mij aangezet.

---

## 10. Verwante documenten

| | |
|---|---|
| `docs/RUNBOOK-PUBLICEREN.md` | dezelfde keten **met de hand**, door een mens, met de tunnel naar de privédatabase |
| `src/uitgifte/opdracht.ts` | de beslisser: de wachtrij, de stopcondities, de toestandsmachine en de vijf fasen |
| `src/dashboard/machine.ts` | het contract van de drie endpoints, en wat die poort niet aanneemt van de aanroeper |
| `src/dashboard/oidc.ts` | de acht controles op het GitHub-OIDC-token, met per controle wat hij afsluit |
| `src/uitgifte/melden.ts` | het meldpad: waar een storing landt, welke twee kanalen er zijn, en waarom hij nooit werpt |
| `ops/werkstroompoort.mjs` | de poort die de startfout van 9 november 2026 voor altijd tegenhoudt |
| `.github/workflows/uitgifte.yml` | de uitvoerder |
| `.github/workflows/poort.yml` | de drie vereiste checks |
| `db/migraties/0058_uitgifte_is_een_tweede_besluit.sql` | waarom uitgifte een tweede schakelaar is en niet dezelfde |
| `deploy/railway.md` | de services en hun bestaande variabelen |
