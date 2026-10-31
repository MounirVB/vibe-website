# Release- en acceptatiedocument — volledige tekst, documentsoort v2 en de juridische claimpoort

> **Status: NIET UITGEROLD. Eindoordeel NO-GO op de v2-kern.**
> Branch `feat/fulltext-bevoegd-gezag` @ `0250679`, 12 commits voor op
> `origin/main` (`f7351a27`). Niet gemerged. Productie draait `f7351a27`.
>
> Dit document bestond niet toen het nodig was. De negen oorspronkelijke
> commits verwijzen op twee plekken naar "het acceptatierapport"
> (`src/cli/droogloop-v2.ts:31`, `src/pijplijn/claimpoort.ts:267`) terwijl
> `find . -iname "*acceptatie*"` buiten `node_modules` nul treffers geeft.
> Dat kader leefde alleen in een sessie die door een laptopuitval verloren
> ging. Daarom staat het nu hier, in de repo.

Alle getallen in dit document zijn in de sessie van 31 oktober 2026
gemeten, met het commando of het bestandspad erbij. Wat niet gemeten is,
staat als **ONBEKEND** of **NIET GEDRAAID** met de reden.

---

## 1 · Wat deze release doet

| # | Commit | Onderdeel |
|---|---|---|
| 1 | `cad42ea` | Volledige-tekstophaling — de laag zelf (`src/bronnen/volledigetekst.ts`, 387 regels) |
| 2 | `4ac4ae4` | De gemeten grondslag per bron |
| 3 | `f8c8158` | Aansluiting op de collector, met de versiegeschiedenis heel |
| 4 | `9a1cae8` | Zelfcorrectie: `minIntervalSeconden: 10` voor de ACM (robots vraagt Crawl-delay 10) |
| 5 | `febd922` | Documentvormherkenning — vijf vormen (`src/pijplijn/documentvorm.ts`) |
| 6 | `8f2db05` | Documentsoort v2 — vaststellen vraagt uitgever, inhoud **én** vorm |
| 7 | `2bda667` | `bepaalWijziging`: een verschoven termijn is materieel |
| 8 | `6ecc589` | Droge simulatie van de herclassificatie (`src/cli/droogloop-v2.ts`) |
| 9 | `2f40c93` | Juridische claimpoort — een nieuwsbericht is geen rechtsbron |
| 10 | `6681a3f` | **fix** — de netwerknoodstop hing achter de databaseconfiguratie |
| 11 | `6561f60` | **fix(api)** — `proxy-addr`, `body-parser`, `qs` binnen de bestaande ranges |
| 12 | `0250679` | **feat** — een plannerpauze die een deploy niet kan opheffen |

Commits 10–12 zijn op 31 oktober 2026 toegevoegd naar aanleiding van de
herstelcontrole. Commits 1–9 komen uit de verloren sessie en zijn
ongewijzigd.

Migraties: **0045** (documentvorm en de twee nieuwe soorten) en **0046**
(de plannerpauze). Beide puur toevoegend: 0 DML, 0 destructieve DDL,
getoetst door `intelligence/ops/migratiepoort.mjs` → PASS.

---

## 2 · Testresultaten

Gemeten op een eigen PostgreSQL **17.11**-cluster (de productieversie),
met per toets een wegwerpdatabase. Nooit tegen de productiedatabase.

| Poort | Uitkomst |
|---|---|
| `npm run typecheck` | **PASS** — 0 fouten. Meethaak bewezen: een geïnjecteerde fout geeft aantoonbaar TS2322 |
| Eenheidstoetsen | **668 / 668**, 0 gefaald, 0 overgeslagen |
| Integratietoetsen (echte database, applicatierol, RLS actief) | **411 / 411** |
| Adversariële toetsen | **133 / 133** |
| API-suite (`api/`) | **24 / 24** |
| `npm run poort` | **EINDOORDEEL = PASS** — invarianten 0 bevindingen, migraties 46/46 drift 0, applicatierol geen superuser/BYPASSRLS/eigenaar |
| `ops/migratiepoort.mjs` | **PASS** |
| `ops/geheimenscan.mjs` | **PASS** — 907 gevolgde bestanden |
| `scripts/seo/audit.mjs` | **EINDOORDEEL POORT = PASS** (met bestaande adviesregels) |
| CI-run `41230485510` op de gepushte branch | **success** op alle drie de jobs |

**Totaal: 1236 toetsen groen, 0 rood.**

**Niet gedraaid**, met reden:

- **Lint bestaat niet** in deze repo — geen script, geen configuratie in
  `package.json` (root, `intelligence`, `api`). Een rapport dat hier een
  lintgetal noemt, kan dat niet gemeten hebben.
- **Build** — de statische service heeft geen buildstap
  (`railpack.json` = `staticfile`).
- **De browsersuite** — buiten het bereik van deze ronde.

### De claim "1.217 toetsen" is niet reproduceerbaar

Het vorige rapport noemde 1.217. Gemeten in een schone CI-omgeving:
668 + 400 + 133 = **1201**. Na deze ronde 668 + 411 + 133 = **1212**
(+11 door `test/integratie/plannerpauze.test.ts`), plus 24 in `api/`.
Het getal 1.217 is nergens gemeten en moet niet worden overgenomen.

---

## 3 · Database- en migratierisico's

### 0045 is NIET in productie

`intel.migraties` staat op **44** (hoogste `0044_invariant_kernclaim_draagt.sql`,
toegepast 2026-10-30 19:00:10.924+00). De kolom
`intel.brondocument_versies.documentvorm` bestaat daar niet en de CHECK
`versies_documentsoort` kent alleen de tien v1-soorten.

### `DOCUMENTSOORT_VERSIE` is een codeconstante, geen vlag

`origin/main`: `documentsoort.ts:98` = `"documentsoort-v1"`.
Deze branch: regel 161 = `"documentsoort-v2"`.
Productie logt dat ook letterlijk: `documentclassificatie GEREED — motor documentsoort-v1`.

**Gevolg:** de versie wisselt door de *deploy* en niet door een schakelaar.
`claimpoort.ts:536` faalt **dicht** op een versieverschil, dus de eerste
plannerronde na een deploy zonder pauze sluit de claimpoort voor élke
bestaande v1-claim — en daarmee de besluitmotor, de nieuwsselectie, de
voorstellenlaag en de conceptgeneratie.

Alle **3740** rijen dragen vandaag `documentsoort-v1`; nul v2, nul NULL.
De herclassificatie is dus een volledige ronde over de hele voorraad.

### Twee grendels die dit nu opvangen (commit `0250679`)

1. **`intel.plannerpauze`** (0046) — append-only logboek, de jongste rij is
   de stand. De stand leeft in de **database** en niet in de code of de
   omgeving, dus een deploy kan hem niet opheffen. Een verse database is
   níet gepauzeerd.
2. **`src/ops/motorpariteit.ts`** — een schemaprobe (geen migratietelling)
   die weigert als de code v2 draagt en het schema v1 is, met de
   ontbrekende kolom erbij. De omgekeerde stand — 0045 vooruit toegepast,
   code nog v1 — **mag**, want zonder die stand kun je 0045 niet los
   uitrollen.

### De simulatie, twee keer op verse productiedata

Identieke uitkomst op twee onafhankelijke read-only exports:

```
OFFICIEEL_BESLUIT      v1 0 -> v2 19 (+19)
ONTWERPBESLUIT         v1 0 -> v2  4 (+4)
VERSCHUIVINGEN         24 van 3740 versies
PRIMAIRE-BRONANKERS    v1 0 -> v2 19
CLAIMS   ingetrokken 0 · nieuw 0 · gedaald 1 · gestegen 0   (126 -> 125)
CLAIMPOORT             3 van 59 juridisch, 0 bevestigd
EINDOORDEEL SIMULATIE = PASS
```

De winst is dus **niet** het repareren van bestaande claims (één daalt)
maar het ontstaan van **19 primaire-bronankers waar er nu nul zijn**.

**Nevenbevinding:** v2 haalt **5 versies uit de werkvoorraad** van de
primaire-bronverificatie. Vier nieuwsartikelen over een ACM-ontwerpbesluit
(versies 1090, 1151, 1209, 1263) verliezen `beschrijft_besluit_van = 'ACM'`
en worden `ONTWERPBESLUIT` met `null`; hun claims kunnen daarna nooit meer
aan een ACM-origineel geankerd worden, want de werkvoorraad eist juist die
naam.

---

## 4 · Waarom dit document NO-GO zegt op de v2-kern

Twee gemeten defecten in de laag waar deze release om begonnen is.

### 4.1 · Een officiële documentsoort bevestigt claims die het document niet beslist

**Dit is de controle die faalt.** De poort vraagt uitsluitend *"is dit
DOCUMENT een authentieke rechtsbron"* (`gezag == BEVOEGD_GEZAG` en
`vormKanVaststellen`) en nergens *"beslist dit document DÉZE claim"*.

Geforceerd en gemeten: een echt ACM-concentratiebesluit
(`OFFICIEEL_BESLUIT` / `BEKENDMAKING` / plafond 5) waarin één
achtergrondzin twee vreemde juridische vaststellingen noemt — *"het
maximumtarief bedraagt vanaf 1 juli 2027 nog 45 euro per maand"* en *"de
verplichte gegevensdeling voor netbeheerders geldt vanaf 1 juli 2027"* —
**bevestigt die beide**.

Bijkomend: `documentvorm.ts:62-71` belooft dat tekst de bewijskracht alleen
kan verlágen. Dat geldt voor een niet-bevoegde uitgever (gemeten: vakmedium
met dezelfde geplante markeringen → plafond 1), maar **niet** bij bevoegd
gezag. Een rijksoverheidspagina wordt gered door het `/actueel/nieuws/`-pad;
`acm.nl` publiceert onder `/nl/publicaties/`, dat géén van de drie
padpatronen raakt, en komt dan op plafond 4 met `authentiekeGrondslag = true`.

Herstelrichting en de val erbij: een strengere eis (de claim moet in het
dictum staan) kan een écht tariefbesluit blokkeren voor zijn eigen claim —
precies de afweging die het commentaar bij `uitspraken.ts:556-572` al
beschrijft. Dit moet mét de labelset gemeten worden, niet op gevoel.

### 4.2 · De beloofde terugvalroute bestaat niet

`uitspraken.ts` en `claimaard.ts` zeggen op drie plekken dat een
geblokkeerde juridische claim "via bronverificatie het origineel bij het
bevoegde gezag moet vinden". Die route is er niet:
`bronverificatie.ts:510-511` selecteert **uitsluitend**
`documentsoort = 'SECUNDAIRE_BERICHTGEVING' and beschrijft_besluit_van is not null`.
Een claim die door de nieuwe poort wordt gestopt komt uit een
`FEITELIJKE_MEDEDELING` of `NIEUWSBERICHT_REGELGEVING` met `null` en valt
dus buiten elke verificatieronde. Hij faalt dicht en komt nooit meer open.

### 4.3 · Twee kleinere, benoemde gaten

- **De herbeoordeling kent de juridische poort niet.** `bepaalClaimAard()`
  wordt in heel `src/` alleen aangeroepen in `uitspraken.ts` (schrijfpad) en
  in de simulatie-CLI. Een juridische claim die eerder bevestigd is geraakt,
  wordt door `npm run herbeoordeel` niet ingetrokken. Vandaag kosteloos:
  3 van 59 claims zijn juridisch en daarvan is 0 bevestigd. Zodra er één
  bijkomt, is hij niet meer intrekbaar.
- **Meetgat in de labelset.** `test/vast/gelabelde-documenten.ts` bevat
  **geen ACM-nieuwsbericht**: alle 10 ACM-documenten zijn `BEKENDMAKING`,
  alle 13 nieuwsberichten komen van `rijksoverheid-nieuws`. Het onderscheid
  "officieel ACM-besluit versus ACM-nieuwsbericht" is door geen enkel
  gelabeld voorbeeld gedekt.

### Wat wél bevestigd is

**Een nieuwsbericht over wetgeving wordt niet als authentieke rechtsbron
gebruikt** — maar niet door de regel waar je hem zoekt. Een
rijksoverheid-nieuwsbericht over een wetswijziging krijgt vorm
`NIEUWSBERICHT` en soort `FEITELIJKE_MEDEDELING`, plafond **4**, en
`magZelfBevestigen = true`. De authentieke regeling krijgt `BEKENDMAKING` /
`OFFICIELE_REGELGEVING`, plafond **5**. Op documentniveau is het verschil dus
een plafond van 4 tegen 5, niet "mag wel" tegen "mag niet". Het
`NIEUWSBERICHT_REGELGEVING`-pad (plafond 3, `magZelfBevestigen = false`)
bestaat en werkt, maar is **smal**: het eist "treedt in werking"
aaneengesloten of een van vier andere formuleringen.

---

## 5 · Beveiligingsrisico's

### 5.1 · Gelekte dienstaccountsleutel — open

Tijdens de read-only audit van 31 oktober is een sleutel in een agentlog
beland. De redactie knipte per **regel**, en een JSON-dienstaccount is
**meerregelig**.

| | |
|---|---|
| Project | `vibe-energy-509410` ("Vibe Energy Calender") |
| Dienstaccount | `intel-backup-schrijver@vibe-energy-509410.iam.gserviceaccount.com` — niet uitgezet |
| Gelekte sleutel | `f87be938dd29ef29cdbe69daaa2f007a3018401f`, USER_MANAGED, **geen verlooptijd** (geldig tot 9999-12-31) |
| Niet gelekt | `6da76f57…`, SYSTEM_MANAGED — Googles interne sleutel, wordt nooit uitgegeven |
| Rechten | **niets op projectniveau**; op `gs://vibe-energy-intel-backups`: `storage.objectCreator` **én** `storage.objectViewer` |
| Draagwijdte | die bucket bevat **30 volledige `pg_dump`s van de productiedatabase** → dit is een **exfiltratiepad naar de hele intel-productiedatabase**, niet alleen een schrijfrecht |
| Wat de schade begrenst | versioning aan, uniform access, `public_access_prevention = enforced`, levensduur 35/7 dagen, en de account mist `objects.delete` — niets kan publiek of gewist worden |
| Misbruik | **ONBEKEND en niet vast te stellen.** Het project heeft geen `auditConfigs`, dus GCS Data Access logs staan uit. Een lege Admin Activity-query bewijst **niets** |
| Omvang | 1 van 55 logbestanden draagt de sleutel; materiaal is lengte-volledig (1752 base64-tekens) → behandel als volledig gecompromitteerd |
| Verspreiding | lokaal: `~/.claude` is geen git-repo, geen iCloud/Dropbox, bestandsmodus 0600 |

**Tweede geheimklasse, apart spoor:** 3 logbestanden bevatten een
`postgres.railway.internal:5432`-URL **met inloggegevens** — het
productie-databasewachtwoord. Verzachtend: die host is privé-only en er is
geen publieke proxy.

De rotatie staat in §7.3. Alleen `vibe-intel-worker` draagt
`INTEL_GCS_SLEUTEL`, dus er is precies één plek om te vervangen.

### 5.2 · Kritieke kwetsbaarheid in `api/` — gerepareerd in code, niet in productie

`proxy-addr` 1.1.0–2.0.7 (GHSA-jqcg-44mw-7w3h, IP-spoofing) is **kritiek**
en niet theoretisch: deze service draagt een rate limit per IP. Plus
`body-parser` <1.20.9 (hoog) — dezelfde advisory die op 29 oktober in
`ad4580b` voor `intelligence/` is gerepareerd; `api/` ging toen niet mee.

Commit `6561f60` lost alle drie op binnen de bestaande ranges; `npm audit`
meldt 0 kwetsbaarheden. **Maar:** de Railway-service `vibe-website-api`
heeft **geen repoTrigger** en staat sinds 19 augustus op `59535f37`. Deze
reparatie bereikt productie dus pas na een aparte, bewuste handeling.

### 5.3 · Twee meetgaten in CI

- De stap "Kwetsbare dependencies" draait met `working-directory: intelligence`
  en auditeert `api/` **niet**.
- Geen enkele CI-stap draait de **api-suite**.

---

## 6 · Back-up- en restorevoorwaarden

De keten is vandaag aantoonbaar gezond: taak `backup` gereed op
2026-10-31 00:03 (4140 ms) en elke dag terug t/m 2026-10-21, alle met
`pogingen = 1` en zonder `laatste_fout`; `restoretestronde` gereed op
2026-10-25 03:03 (8195 ms). In de bucket: 30 `.dump` + 30 `.manifest.json`.

Drie bewijslagen, en **één overleeft een deploy niet**:

1. het bucketobject `restoretest/<stempel>-<runid8>.json` — duurzaam;
2. het lokale merkbestand `backups/.laatste-restoretest.json` — staat op de
   containerschijf en is na een redeploy **weg**;
3. een rij in `intel.taken` — duurzaam.

**Gebruik laag 2 nooit als bewijs na een deploy.** Hij meldt "geen bewijs"
terwijl de proef wel geslaagd is.

**Voorwaarde vóór de uitrol:** de back-up van 00:00 UTC moet geslaagd zijn
en in de bucket staan. Dat is het terugvalpunt als 0045 onverwacht
misgaat — al is 0045 puur toevoegend en daarmee laag risico.

---

## 7 · Productie-uitrolvolgorde

Elke stap met **AKKOORD** vraagt expliciete toestemming van de eigenaar in
dát moment. Eerdere toestemming geldt niet opnieuw.

### 7.1 · Eerst beslissen (blokkerend voor de v2-kern)

| | Besluit |
|---|---|
| **AKKOORD** | §4.1 — bevestigt een officiële documentsoort claims die het document niet beslist? Repareren, of bewust accepteren met de reden vastgelegd? |
| **AKKOORD** | §4.2 — de terugvalroute repareren, of de drie toelichtingen aanpassen zodat ze niet naar een route verwijzen die niet bestaat? |
| **AKKOORD** | §4.3 — de labelset uitbreiden met ACM-nieuwsberichten vóór of ná de uitrol? |

Zonder deze drie besluiten is het eindoordeel **NO-GO**. De plannerpauze
(0046) en de twee fixes kunnen wél vooruit — zie 7.2.

### 7.2 · De veilige voorhoede (kan los, zonder de v2-kern)

| Stap | Handeling | Akkoord |
|---|---|---|
| 1 | Migratie **0046** vooruit toepassen. Puur toevoegend, geen DML, en hij zet de pauze **niet** aan | **AKKOORD** |
| 2 | `npm run plannerpauze -- --status` → verwacht exitcode 0 en "planner LOOPT" | nee (lezen) |
| 3 | Commits `6681a3f` (netwerknoodstop) en `6561f60` (api-security) naar main | **AKKOORD** |
| 4 | `vibe-website-api` een repoTrigger geven, anders bereikt 5.2 productie nooit | **AKKOORD** |

### 7.3 · De sleutelrotatie (los van de release, hoogste urgentie)

Eigenschap van deze volgorde: er bestaat **geen moment zonder geldige
sleutel**.

| Stap | Handeling | Akkoord | Omkeerbaar |
|---|---|---|---|
| 1 | Basislijn vastleggen: `keys list` + `gcloud storage ls -l restoretest/` | nee | ja |
| 2 | **Nieuwe** sleutel aanmaken naar `~/.secrets/`, `umask 077`. Daarna zijn **beide** geldig | **AKKOORD** | ja |
| 3 | Bewijs dat de nieuwe sleutel LEEST (`lijstGcs`), lokaal, vóór productie | nee | ja |
| 4 | Bewijs dat hij SCHRIJFT, met `alleenAlsNieuw` onder een eigen voorvoegsel | **AKKOORD** | nee — de account mist `objects.delete`, het proefobject blijft tot het levensduurbeleid |
| 5 | De variabele op `vibe-intel-worker` zetten — **dit veroorzaakt een redeploy** | **AKKOORD** | ja, mits vooraf een rollback-doel bewaard |
| 6 | End-to-end toetsen op de **natuurlijke cadans**: `backup` 00:00 UTC en `restoretestronde` zondag vanaf 03:00 UTC. Niets forceren | nee | ja |
| 7 | De oude sleutel **uitzetten** (`keys disable`), niet verwijderen | **AKKOORD** | ja (`keys enable`) |
| 8 | Soak: een volledige dag, liefst een week, met de oude sleutel uit | nee | ja |
| 9 | De oude sleutel **verwijderen** | **AKKOORD** | **NEE** |
| 10 | GCS Data Access logging aanzetten; variabelen voortaan alleen als NAMEN lezen | **AKKOORD** | deels |

Overweeg daarnaast een apart spoor voor het productie-databasewachtwoord
uit §5.1.

### 7.4 · De v2-kern, pas na 7.1

| Stap | Handeling | Akkoord |
|---|---|---|
| 1 | `npm run plannerpauze -- --pauzeer --door "<naam>" --reden "<waarom>"` | **AKKOORD** |
| 2 | **Toets** de pauze: `npm run plannerpauze` moet exitcode **2** geven. Een gedraaid commando is geen bewijs | nee |
| 3 | Wacht tot de lopende ronde leeg is: `select count(*) from intel.taken where status='bezig'` → 0 | nee |
| 4 | Migratie **0045** toepassen | **AKKOORD** |
| 5 | Motorpariteit toetsen: de database is nu v2, de code nog v1 — dat **mag** en wordt benoemd | nee |
| 6 | De branch naar main → productiedeploy van vier services | **AKKOORD** |
| 7 | Verifieer de gedeployde SHA via `railway status --json` → `meta.commitHash` | nee |
| 8 | Hervatten met autorisatie: `--hervat --autorisatie "<grond>"` | **AKKOORD** |
| 9 | Meet de eerste ronde: `documentclassificatie` moet nu `motor documentsoort-v2` loggen | nee |

---

## 8 · Rollback- en stopprocedures

**Stoppen, op elk moment:**

```
npm run plannerpauze -- --pauzeer --door "<naam>" --reden "<waarom>"
```

Pauzeren mag altijd en van iedereen — stilstaan is de veilige kant. De
planner plant niets meer en `pakTaak` deelt niets meer uit; een al
geclaimde taak loopt wél af, dus de wachtrij raakt leeg in plaats van
afgekapt. De cron blijft staan en legt elke ronde vast als
`resultaat = 'overgeslagen'`, want een stille cron is niet te
onderscheiden van een kapotte cron.

**Terugdraaien van de code:** `git revert` van de merge en opnieuw
deployen. Let op de motorpariteit: terug naar v1 op een database die v2
kent is een **toegestane** stand en wordt benoemd — de keten blijft
werken, `documentvorm` blijft alleen leeg.

**Terugdraaien van 0045:** `alter table intel.brondocument_versies drop column documentvorm;`
plus de CHECK en de invariantfunctie terug naar hun 0044-vorm. Volledig
additief, dus terugdraaien kost geen data. **Maar:** is de herclassificatie
al gelopen, dan staan er rijen met `NIEUWSBERICHT_REGELGEVING` of
`ONTWERPBESLUIT` die de oude CHECK afkeurt. Terugdraaien vraagt dan eerst
een herclassificatie terug naar v1. **Dat is de reden dat de pauze vóór de
deploy moet staan.**

**Terugdraaien van 0046:** `drop table intel.plannerpauze;` plus de twee
functies in `intel_priv`. Verwijder de tabel **niet** terwijl een pauze
actief is: `pakTaak` roept `intel.planner_gepauzeerd()` aan en faalt dan
met 42883 op elke claim.

**Een pauze opheffen gaat nooit door de PAUZEER-rij te wissen.** Het
logboek is append-only in twee lagen: de applicatierol heeft geen DELETE
of UPDATE (`permission denied`) en de eigenaar stuit op de trigger.

---

## 9 · Officiële bronnen — de structurele beperking

De claimpoort uit `2f40c93` eist een authentiek vaststellend document
(`ALLEEN_BEVOEGD_GEZAG = OFFICIEEL_BESLUIT, OFFICIELE_REGELGEVING`).
Gemeten in productie: van **3740** documentversies is er **nul** een
`OFFICIEEL_BESLUIT` of `OFFICIELE_REGELGEVING`. Van de 20 actieve bronnen
dragen er drie `BEVOEGD_GEZAG` — `acm-besluiten`, `rvo-opendata-artikelen`,
`rijksoverheid-nieuws` — en alle drie zijn nieuws-/artikelkanalen.

De poort staat dus vandaag **structureel dicht** voor juridische claims, en
`primaire_bron_bevestigd` kan niet van `false` af: alle 59 uitspraken staan
op `false`.

**Gemeten toegangsbeleid (31 oktober 2026):**

| Host | Stand |
|---|---|
| `repository.overheid.nl` | 26 bytes, `User-agent: * / Disallow: /` — **dicht** |
| `zoek.officielebekendmakingen.nl` | 196 bytes — **open**; alleen AhrefsBot uitgesloten, géén AI/TDM-uitsluiting |
| `www.officielebekendmakingen.nl` | byte-identiek — **open** |
| `www.koopoverheid.nl` | 64 bytes, geen enkele Disallow — **open** |
| `data.overheid.nl` | sluit GPTBot, ClaudeBot, CCBot, PerplexityBot e.a. expliciet uit — **dicht voor ons** |
| `wetten.overheid.nl` | sluit ClaudeBot/Claude-Web/anthropic uit — **dicht voor ons** |
| `www.rvo.nl` | open, robots declareert de sitemap zelf — de HTTP 500 is serverzijdig op de user-agent |
| `opendata.overheid.nl` | bestaat niet (DNS faalt) |

**De ontdekking: het DOCUMENT is rechtmatig bereikbaar, alleen de
ZOEKDIENST niet.** Met het identificatienummer dat het register al heeft
vastgelegd (`stcrt-2023-35277`) geeft
`https://zoek.officielebekendmakingen.nl/stcrt-2023-35277.html` HTTP 200,
22.604 bytes — één authentiek vaststellend document, op een host zonder
verbod. En KOOP verklaart hergebruik in eigen woorden op de volledig open
`www.koopoverheid.nl`.

**Wat ontbreekt:** de licentie zelf is **NIET gemeten**. De drie pagina's
die de voorwaarden dragen staan op `www.overheid.nl`, dat ClaudeBot
uitsluit. Dit vraagt een mens. Niets hiervan mag met een vermomde
user-agent worden opgehaald.

**Meetvoorbehoud, eerlijk vermeld:** de zeven hosts zijn opgehaald met een
browser-user-agentstring omdat de opdracht "normale user-agent" vroeg.
`robots.txt` is onder RFC 9309 altijd opvraagbaar, dus er is geen
toegangscontrole omzeild, maar de identificatie was niet die van het
platform. Een hermeting met de productie-UA is aan te raden voordat hier
een besluit op rust.

**Het goedkoopste alternatief bestaat al en is niet uitgerold:** deze branch
zet volledige tekst aan voor twee van de drie `BEVOEGD_GEZAG`-bronnen.
`acm.nl/robots.txt` staat `/nl/publicaties/*` expliciet toe, sluit geen AI-
of TDM-crawler uit, en vraagt Crawl-delay 10 — vandaar `minIntervalSeconden: 10`.

Er is **geen** `TOEGANGSVERZOEK-KOOP.md`; het patroon staat in
`TOEGANGSVERZOEK-RENDO.md` (status: concept, niet verzonden).
`register.ts:1121` verwijst naar `ARCHITECTUUR.md` sectie 9, en die sectie
noemt KOOP en SRU **nergens** — het KOOP-besluit is buiten `register.ts`
niet gedocumenteerd.

---

## 10 · Wat principieel ONBEKEND blijft

| Onbekend | Waarom |
|---|---|
| Of de gelekte sleutel is misbruikt | Geen `auditConfigs`; GCS Data Access logs staan uit. Een lege query bewijst niets |
| Of het gelekte materiaal cryptografisch bruikbaar is | Bewust niet getoetst: dat vraagt de sleutel reconstrueren en gebruiken |
| De licentie van de KOOP-collecties | De voorwaardenpagina's sluiten ClaudeBot uit. Vraagt een mens |
| Of de v2-herclassificatie in productie hetzelfde doet als de simulatie | De simulatie draait op een export en schrijft per constructie niets |
| Of de geforceerde bevestiging uit §4.1 ooit in productie is voorgekomen | Nu 21 versies met `authentiekeGrondslag = true` en daaruit 0 juridische bevestigingen; over verwijderde historische versies is geen uitspraak mogelijk |
| Wie het cronschema wijzigde | Railway biedt geen leesbaar wijzigingslogboek. `0 * * * *` live tegen `0 3 * * 1` in het deploymanifest |
| Of de volledige-tekstlaag ooit heeft gedraaid | Per constructie niet meetbaar: geen kolom `volledige_tekst`, en `intel.bron_ophalingen` heeft geen `opmerking`-kolom |

---

## 11 · Eindoordeel

| Onderdeel | Oordeel |
|---|---|
| Plannerpauze (0046) + motorpariteit | **GO** — los uitrolbaar, additief, 11 eigen toetsen groen |
| Netwerknoodstop (`6681a3f`) | **GO** |
| API-security (`6561f60`) | **GO** in code; bereikt productie pas na een repoTrigger |
| Sleutelrotatie | **GO en urgent**, los van deze release |
| Volledige tekst + documentvorm + documentsoort v2 | **NO-GO** tot §4.1 en §4.2 beslist zijn |
| Juridische claimpoort | **NO-GO** — de controle "een officiële documentsoort bevestigt niet automatisch een specifieke claim" **faalt** (§4.1) |

De techniek is gereed en groen: 1236 toetsen, typecheck 0 fouten, elke
poort PASS. Het blokkerende punt is geen testfout maar een **ontwerpvraag**
die alleen de eigenaar kan beslissen.
