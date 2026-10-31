# Release- en acceptatiedocument — volledige tekst, documentsoort v2 en de juridische claimpoort

> **Status: NIET UITGEROLD. Eindoordeel GO voor de gecontroleerde
> uitrol volgens §7.4.** Branch `feat/fulltext-bevoegd-gezag`, 14 commits
> voor op `origin/main` (`f7351a27`). Niet gemerged. Productie draait
> `f7351a27` met migratiestand 44.
>
> Op 1 november 2026 zijn de twee defecten uit §4 gerepareerd die dit
> document eerder NO-GO maakten.
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
| 13 | `c585dff` | **fix** — een officieel stuk bevestigt alleen de claim die het ZELF vaststelt (+ migratie 0047) |
| 14 | `a20ba53` | **fix** — de worker bewaakte de motorpariteit niet, en juist hij voert uit |

Commits 10–12 zijn op 31 oktober toegevoegd naar aanleiding van de
herstelcontrole; 13–14 op 1 november naar aanleiding van de
correctieronde. Commits 1–9 komen uit de verloren sessie en zijn
ongewijzigd.

Migraties: **0045** (documentvorm en de twee nieuwe soorten), **0046**
(de plannerpauze) en **0047** (het claimbeoordelingsregister). Alle drie
puur toevoegend: 0 DML, 0 destructieve DDL, getoetst door
`intelligence/ops/migratiepoort.mjs` → PASS.

Nieuwe lagen in 13–14: `src/pijplijn/vaststelling.ts` (stelt dit stuk
déze claim vast), `src/pijplijn/claimbeoordeling.ts` (de doorverwijzing),
en de motorpariteitstoets in `src/cli/worker.ts`.

---

## 2 · Testresultaten

Gemeten op een eigen PostgreSQL **17.11**-cluster (de productieversie),
met per toets een wegwerpdatabase. Nooit tegen de productiedatabase.

| Poort | Uitkomst |
|---|---|
| `npm run typecheck` | **PASS** — 0 fouten. Meethaak bewezen: een geïnjecteerde fout geeft aantoonbaar TS2322 |
| Eenheidstoetsen | **688 / 688**, 0 gefaald, 0 overgeslagen |
| Integratietoetsen (echte database, applicatierol, RLS actief) | **421 / 421** |
| Adversariële toetsen | **133 / 133** — ongewijzigd, dus de bestaande claimpoorttoets is niet gebroken |
| API-suite (`api/`) | **24 / 24** |
| `npm run poort` | **EINDOORDEEL = PASS** — invarianten 0 bevindingen, migraties 47/47 drift 0, applicatierol geen superuser/BYPASSRLS/eigenaar |
| `ops/migratiepoort.mjs` | **PASS** — 0047 heeft geen destructieve DDL |
| `ops/geheimenscan.mjs` | **PASS** — 914 gevolgde bestanden |
| `scripts/seo/audit.mjs` | **EINDOORDEEL POORT = PASS** (met bestaande adviesregels) |
| CI op de gepushte branch | **success** op alle drie de jobs (run `41233866288`, commit `ca06e29`) |

**Totaal: 1242 toetsen groen plus 24 in `api/`, 0 rood.**

Nieuw in de correctieronde: 20 toetsen in `test/eenheid/vaststelling.test.ts`
(waarvan twee **tegenproeven** die vastzetten wat NIET geblokkeerd mag
worden), 9 in `test/integratie/claimbeoordeling.test.ts`, en 1 inbouwtoets
die vastzet dat zowel de planner als de worker de motorpariteit werkelijk
aanroept — met het commentaar eerst gestript, en met een bewezen meethaak
(de aanroep vervangen maakt hem rood).

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

## 4 · De twee defecten in de bewijsketen — GEREPAREERD op 1 november 2026

Deze paragraaf zei tot 1 november **NO-GO**. Beide defecten zijn nu
gerepareerd en met toetsen vastgezet; de beschrijving blijft staan omdat
de faalwijze het belangrijkste deel van de documentatie is.

| Defect | Status |
|---|---|
| 4.1 een officieel stuk bevestigt een claim die het niet vaststelt | **GEREPAREERD** — `c585dff`, `src/pijplijn/vaststelling.ts` |
| 4.2 de terugvalroute dekt de geblokkeerde claims niet | **GEREPAREERD** — `c585dff`, migratie 0047 + `claimbeoordeling.ts` |
| 4.3 de herbeoordeling kent de poort niet · meetgat in de labelset | **OPEN**, met reden — zie 4.3 |

**Gemeten impact op verse read-only productiedata** (3741 versies, 59 claims):

```
bestaande juridische claims opnieuw gewogen   3
uitkomst anders dan onder de oude poort       0
versies met authentieke grondslag            21
juridische zinnen daarin                      0
tegengehouden                                 0
```

De reparatie is dus **aantoonbaar niet-regressief** en vandaag **inert**:
de 21 stukken die zouden kunnen zelfbevestigen dragen nul juridische
zinnen. Haar waarde is dat ze het gat dicht **voordat** de full-textlaag
het bereikbaar maakt. De simulatie rapporteert dit sinds `c585dff` zelf
in sectie **6c**, dus het releasebesluit rust niet op een simulatie die
de reparatie mist.

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

**DE REPARATIE.** `steltStukDeClaimVast()` beantwoordt nu de vraag die
ontbrak, met zes uitslagen waarvan vijf niet bevestigen:
`GEEN_AUTHENTIEK_STUK`, `ONTWERP`, `NIET_VASTSTELLENDE_MODALITEIT`,
`ACHTERGRONDPASSAGE`, `ANDER_GEZAG` en `STELT_VAST`. De oude eis is de
**eerste** van die zes — er is dus geen drempel verlaagd, er zijn er vier
bijgekomen.

**De passagetoets is eenzijdig, en dat is het dragende ontwerpbesluit.**
Hij blokkeert alleen bij *positief bewijs* van achtergrond. "Bewijs dat de
zin in het dictum staat" zou strenger lijken en de keten breken: een écht
tariefbesluit ("Gelet op artikel 41 … Het maximumtarief bedraagt …") komt
uit op `FEITELIJKE_MEDEDELING` en draagt géén dictummarkering. Zou ik die
eisen, dan blokkeert de authentieke bron zijn eigen claim en heeft
bronverificatie nergens meer een anker. Die twee tegenproeven staan als
**eerste** in `test/eenheid/vaststelling.test.ts`, zodat een latere
verscherping er meteen op stukloopt.

**Geen ACM-padmarkering.** Een voorstel wilde `/nl/publicaties/` als
bekendmakingspad toevoegen. Gemeten: dat **verbreedt** het lek — de
ACM-versies met `authentiekeGrondslag` gaan van 21 naar **28**, alle 28,
doordat zeven documenten van `ARTIKEL` naar `BEKENDMAKING` schuiven. Niet
gedaan, en dat is een expliciet besluit.

### 4.2 · De terugvalroute bestaat, maar niet voor de claims die hem nodig hebben

`uitspraken.ts` en `claimaard.ts` zeggen op drie plekken dat een
geblokkeerde juridische claim "via bronverificatie het origineel bij het
bevoegde gezag moet vinden".

Die route bestaat — maar alleen voor **navertellingen**. De werkvoorraad
(`bronverificatie.ts:510-511`) selecteert
`documentsoort = 'SECUNDAIRE_BERICHTGEVING' and beschrijft_besluit_van is not null`,
en onder v2 blijven daar 108 versies met 27 claims in zitten. Voor die
groep werkt de verwijzing dus wél.

**De claims die door de nieuwe poort worden gestopt vallen er buiten**, en
dat is de groep waarvoor de toelichting hem belooft: zij komen uit een
`FEITELIJKE_MEDEDELING` of `NIEUWSBERICHT_REGELGEVING` met
`beschrijft_besluit_van = null`. `verifieerBijGezag()` stapt bij zo'n claim
op `bronverificatie.ts:261` onmiddellijk uit met `NIET_VAN_TOEPASSING`.

**De voor de hand liggende reparatie werkt niet.** De werkvoorraad
verbreden naar "claim is juridisch en niet bevestigd" repareert niets,
juist door die uitstap op regel 261: zonder gezagsnaam komt de claim nooit
voorbij de eerste controle.

**DE REPARATIE: de route is MENSELIJKE BEOORDELING, niet bronverificatie.**
Migratie 0047 geeft `intel.claimbeoordeling`, een register waarin een
geblokkeerde claim zichtbaar, telbaar en beslisbaar wordt in plaats van
stil. Drie eigenschappen, elk een eis uit de opdracht:

| Eigenschap | Hoe hij wordt afgedwongen |
|---|---|
| **geen lus** | unieke index op `(organisatie, uitspraak, motorversies)` + `on conflict do nothing`. Hoe vaak de uurlijkse ronde ook draait, dezelfde claim vraagt **één** keer om beoordeling. Een nieuwe motorversie is bewust een nieuwe vraag — binnen een versie nooit |
| **geen opwaardering** | géén code leest dit register om een uitspraak op `bevestigd` te zetten. Zelfs `BEVESTIGBAAR` **mét** autorisatie laat de claim op `ongeverifieerd` — vastgezet door toets 6. Daarmee is een historische claim per constructie veilig |
| **`BEVESTIGBAAR` vraagt autorisatie** | `check claimbeoordeling_bevestigbaar_vraagt_autorisatie`, in de **database** en niet in code. `AFGEWEZEN` en `ONBESLIST` mogen zonder: dat zijn de veilige kanten |

Een mislukte doorverwijzing laat de ingestie niet vallen; de claim blijft
dan gewoon `ongeverifieerd` (toets 8).

**En één voorstel moet uitdrukkelijk NIET worden uitgevoerd:** een
padmarkering voor `acm.nl` toevoegen (zodat `/nl/publicaties/` als
bekendmakingspad geldt) werkt de verkeerde kant op. Gemeten: het aantal
ACM-versies met `authentiekeGrondslag = true` stijgt dan van **21 naar 28**
— alle 28 — doordat 7 documenten van vorm `ARTIKEL` naar `BEKENDMAKING`
schuiven. Dat **verbreedt** het lek van §4.1 in plaats van het te dichten.

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
| Omvang | 1 van 55 logbestanden draagt de sleutel. Materiaal: **1622** base64-datatekens over 25 regels van 64 → behandel als volledig gecompromitteerd |
| Verspreiding | lokaal: `~/.claude` is geen git-repo, geen iCloud/Dropbox, bestandsmodus 0600 |

**Waarom "volledig gecompromitteerd" en niet "misschien afgekapt".** Een
naïeve vergelijking misleidt hier: 1622 tekens is net *onder* de ~1624 die
een RSA-2048-PKCS8-body nodig heeft, en `END PRIVATE KEY` ontbreekt. Toch
is afkapping niet de verklaring. In dezelfde string staat **26×** de
markering `<REDACTED>`: de redactor heeft stukken *uitgesneden* en daarbij
juist de slotregel met de END-marker geraakt. Een sleutel waarvan het
grootste deel plus de structuur bekend is, geldt als gecompromitteerd. Het
materiaal is bewust **niet** getoetst op bruikbaarheid — dat zou betekenen
de sleutel reconstrueren en gebruiken.

**Er is ÉÉN geheimklasse, niet twee.** Een eerdere versie van dit document
stelde dat ook het productie-databasewachtwoord in de logmap stond. Een
hermeting weerlegt dat: het wachtwoord van de productie-Postgres staat er
**niet** in. Het enige andere echte inloggegeven is 4× een wachtwoord op
`127.0.0.1:5432` — een lokale wegwerpdatabase, zonder betekenis buiten deze
machine. Er is dus **geen** tweede rotatiespoor nodig.

**Blinde vlek in de eigen scanner, en die is hier bewezen.**
`ops/geheimenscan.mjs` zoekt op de BEGIN-marker. De redactor vernietigde
juist de END-marker en liet BEGIN staan; omgekeerd zou dezelfde scanner een
sleutel met geknipte BEGIN volledig missen. Een scanner die op één marker
leunt, dekt een meerregelig geheim niet.

De rotatie staat in §7.3. Alleen `vibe-intel-worker` draagt
`INTEL_GCS_SLEUTEL`, dus er is precies één plek om te vervangen.

**NIET GEMETEN:** of Railway zelf retentie van de back-ups houdt. De
bewering "álle externe retentie stopt bij intrekken" rust op een
codecommentaar en niet op een meting. Hij draagt wel de urgentie van de
rotatie, dus hij hoort als onbewezen gemarkeerd te staan.

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

### 7.0 · DE ORDE UIT DE OPDRACHT KAN NIET, EN DIT IS WAAROM

De gevraagde volgorde begon met "planner veilig pauzeren" en zette
"migratie 0046 activeren" op stap 3. **Dat kan niet in die orde**, en dat
is geen detail maar de kern van het plan.

Autoritatief gemeten via de Railway-API op 1 november 2026:

```
vibe-intel-api      preDeploy: npm run migreer && npm run zaai && npm run geo
vibe-intel-planner  preDeploy: null     start: npm run planner
vibe-intel-worker   preDeploy: null     start: npm run worker
vibe-website        preDeploy: null
vibe-website-api    preDeploy: null     (en GEEN repoTrigger)
```

Daaruit volgen drie harde beperkingen:

1. **De pauze bestaat niet voordat 0046 is toegepast.** De stand leeft in
   `intel.plannerpauze`; die tabel komt er pas met 0046. Pauzeren vóór
   stap 3 is dus letterlijk onmogelijk.
2. **`npm run migreer` past ALLE openstaande migraties in één keer toe.**
   Er is geen `--tot` in het deploypad. Eén deploy van de volle branch
   zet 0045, 0046 én 0047 samen, dus de gevraagde scheiding tussen stap 3
   en stap 4 bestaat niet binnen één deploy.
3. **Alleen `vibe-intel-api` migreert, en de vier services deployen
   parallel.** De worker kan dus met v2-code opstarten terwijl die
   migratie nog loopt. Daarom staat de motorpariteitstoets sinds
   `a20ba53` óók in de worker, met exitcode 1 en een herstart.

**De oplossing is een eerste, aparte deploy.** Een branch vanaf
`origin/main` met alleen `6681a3f 6561f60 0250679` bevat **0046 en niet
0045/0047**. Die deploy brengt de pauze in productie zonder de v2-kern
aan te raken, en daarna is de gevraagde orde wél uitvoerbaar.

### 7.1 · Nog te beslissen (niet blokkerend meer)

| | Besluit |
|---|---|
| **AKKOORD** | §4.3 — de labelset uitbreiden met ACM-nieuwsberichten: vóór of ná de uitrol? Nu is dat onderscheid door nul gelabelde voorbeelden gedekt |
| **AKKOORD** | §4.3 — moet `herbeoordeling.ts` de juridische poort overnemen? Vandaag kosteloos (3 juridische claims, 0 bevestigd); zodra er één bijkomt is hij niet meer intrekbaar |
| **AKKOORD** | §9 — de KOOP-licentie laten lezen door een mens, zodat de claimpoort ooit open kan |

Geen van deze drie blokkeert de uitrol. §4.1 en §4.2 zijn gerepareerd.

### 7.2 · De veilige voorhoede (kan los, zonder de v2-kern)

> **LET OP — deze branch is niet los uit te rollen zoals hij is.**
> `feat/fulltext-bevoegd-gezag` bundelt nu de v2-kern (**NO-GO**,
> commits 1–9) met de plannerpauze en de twee fixes (**GO**,
> commits 10–12). Een merge van de hele branch rolt dus ook de NO-GO-kern
> uit. Wie alleen de veilige voorhoede wil, maakt een aparte branch vanaf
> `origin/main` en cherry-pickt in deze orde:
>
> ```
> git cherry-pick 6681a3f 6561f60 0250679
> ```
>
> **Eén conflict is voorspeld en nagemeten.** Van de vijftien bestanden die
> commits 10–12 raken, bestaat er precies **één** niet op `main`:
> `intelligence/test/eenheid/volledigetekst.test.ts`. Dat bestand wordt
> door de v2-kern *toegevoegd* en door `6681a3f` alleen *gewijzigd*. Laat
> die ene hunk bij de cherry-pick dus vallen — hij hoort bij de v2-kern.
> Alle andere veertien bestanden bestaan op main of zijn nieuw, dus die
> gaan schoon mee.
>
> `src/ops/motorpariteit.ts` compileert op main: hij leest
> `DOCUMENTSOORT_VERSIE` (daar `"documentsoort-v1"`) en noemt de v2-soorten
> alleen als string. `test/integratie/plannerpauze.test.ts` is bewust
> versiebewust geschreven en toetst op main de v1-op-v1-stand.
>
> Toets dit met de volledige poort op de nieuwe branch voordat er iets naar
> main gaat; neem de uitslag niet over uit dit document.

| Stap | Handeling | Akkoord |
|---|---|---|
| 1 | Migratie **0046** vooruit toepassen. Puur toevoegend, geen DML, en hij zet de pauze **niet** aan | **AKKOORD** |
| 2 | `npm run plannerpauze -- --status` → verwacht exitcode 0 en "planner LOOPT" | nee (lezen) |
| 3 | De cherry-pick-branch naar main → productiedeploy | **AKKOORD** |
| 4 | `vibe-website-api` een repoTrigger geven, anders bereikt 5.2 productie nooit | **AKKOORD** |

### 7.3 · De sleutelrotatie (los van de release, hoogste urgentie)

Eigenschap van deze volgorde: er bestaat **geen moment zonder geldige
sleutel**.

| Stap | Handeling | Akkoord | Omkeerbaar |
|---|---|---|---|
| 1 | Basislijn vastleggen: `keys list` + `gcloud storage ls -l restoretest/` | nee | ja |
| 2 | **Nieuwe** sleutel aanmaken naar `~/.secrets/`, `umask 077`. Daarna zijn **beide** geldig | **AKKOORD** | ja |
| 3 | Bewijs dat de nieuwe sleutel LEEST (`lijstGcs`), lokaal, vóór productie | nee | ja |
| 4 | Bewijs dat hij SCHRIJFT, met `alleenAlsNieuw` onder een eigen voorvoegsel | **AKKOORD** | **ja, dubbel** — de dienstaccount mist `objects.delete`, maar het **eigenaarsaccount** wist het proefobject direct (`gcloud storage rm`), en het soft-deletebeleid houdt het daarna nog 7 dagen herstelbaar |
| 5 | De variabele op `vibe-intel-worker` zetten — **dit veroorzaakt een redeploy**. **Plat de JSON eerst tot één regel**, anders kan een newline de waarde afkappen — precies de vorm die dit incident veroorzaakte | **AKKOORD** | ja, mits vooraf een rollback-doel bewaard |
| 6 | End-to-end toetsen op de **natuurlijke cadans**: `backup` 00:00 UTC en `restoretestronde` zondag vanaf 03:00 UTC. Niets forceren | nee | ja |
| 7 | De oude sleutel **uitzetten** (`keys disable`), niet verwijderen | **AKKOORD** | ja (`keys enable`) |
| 8 | Soak: een volledige dag, liefst een week, met de oude sleutel uit | nee | ja |
| 9 | De oude sleutel **verwijderen** | **AKKOORD** | **NEE** |
| 10 | GCS Data Access logging aanzetten; variabelen voortaan alleen als NAMEN lezen | **AKKOORD** | deels |

Overweeg daarnaast een apart spoor voor het productie-databasewachtwoord
uit §5.1.

### 7.4 · HET DEFINITIEVE RELEASEPLAN voor de v2-kern

Tien stappen, in de enige orde die technisch uitvoerbaar is. Elke stap
met **AKKOORD** vraagt toestemming in dát moment; eerdere toestemming
geldt niet opnieuw.

| # | Handeling | Bewijs dat je afwacht | Akkoord |
|---|---|---|---|
| **1** | **Back-up en restorecontrole eerst.** `backup` moet geslaagd zijn en in de bucket staan: `select soort,status,gereed_op,pogingen from intel.taken where soort='backup' order by gereed_op desc limit 3` plus `gcloud storage ls -l "gs://vibe-energy-intel-backups/"`. **Gebruik `backups/.laatste-restoretest.json` NOOIT als bewijs** — die staat op de containerschijf en is na elke deploy weg | een `backup`-rij op `gereed` van vandaag, en een `.dump` in de bucket | nee |
| **2** | **Deploy de voorhoede** (`6681a3f 6561f60 0250679` vanaf `origin/main`; laat de ene hunk in `volledigetekst.test.ts` vallen). De preDeploy past **alleen 0046** toe — 0045 en 0047 zitten niet in die tree | `select max(nummer) from intel.migraties` → **46** | **AKKOORD** |
| **3** | **Pauzeer de planner.** Nu bestaat de tabel. `npm run plannerpauze -- --pauzeer --door "<naam>" --reden "<waarom>"` | — | **AKKOORD** |
| **4** | **Toets de pauze.** `npm run plannerpauze` moet exitcode **2** geven. Een gedraaid commando is geen bewijs | exitcode 2 + "planner GEPAUZEERD" | nee |
| **5** | **Wacht tot de wachtrij leeg is.** `select count(*) from intel.taken where status='bezig'` → 0. Een al geclaimde taak loopt áf; er komt niets bij | 0 | nee |
| **6** | **Deploy de volle branch** naar main. De preDeploy past **0045 en 0047** toe en de vier services herstarten. De planner start en plant **niets** (de pauze zit in de database en overleeft de deploy). Start de worker vóór de migratie, dan weigert hij op motorpariteit met exitcode 1 en herstart | `max(nummer)` → **47**; `railway status --json` → `meta.commitHash` = de verwachte SHA | **AKKOORD** |
| **7** | **Herclassificeer gecontroleerd, met de planner NOG gepauzeerd.** Eerst droog: `npm run documentsoort -- --droog`. Dan echt: `npm run documentsoort`. Hij schrijft **uitsluitend de zes classificatiekolommen** op `brondocument_versies` — geen claim, geen gebeurtenis, geen kandidaat — is idempotent, en pakt **2000** rijen per run. Met 3741 versies zijn dat **twee** runs; een derde doet niets | `select documentsoort_versie, count(*) from intel.brondocument_versies group by 1` → alles op `documentsoort-v2`, 0 op v1 | **AKKOORD** |
| **8** | **Herbeoordeel de claims gecontroleerd.** `npm run herbeoordeel`. `herbeoordeelClaim()` kan een bevestiging alleen **intrekken**, nooit toekennen | verwacht uit de simulatie: 0 ingetrokken, 0 nieuw, 1 gedaald, som 126 → 125 | **AKKOORD** |
| **9** | **Controleer de primaire-bronverificatie.** `select count(*) from intel.uitspraken where primaire_bron_bevestigd` en de telling van vaststellende documenten | 19 verwachte ankers uit de simulatie; vandaag 0 claims op die 21 versies, dus 0 is óók een geldige uitkomst | nee |
| **10** | **Hervat met autorisatie**, en meet daarna. `npm run plannerpauze -- --hervat --door "<naam>" --autorisatie "<grond>" --reden "<waarom>"`. De CLI weigert te hervatten als de motorpariteit niet sluit | de eerste ronde logt `motor documentsoort-v2`; 431 sitemap-URL's onveranderd; `gezondheid` zonder nieuwe FOUT; 0 nieuwe DLQ | **AKKOORD** |

**Terugvalpunt per stap.** Tot en met stap 6 is `git revert` + redeploy
genoeg en kost 0045 geen data (puur toevoegend). **Ná stap 7 niet meer
zonder meer:** dan staan er rijen met `NIEUWSBERICHT_REGELGEVING` of
`ONTWERPBESLUIT` die de oude CHECK afkeurt, en moet je eerst terug naar
v1 herclassificeren. **Dat is precies de reden dat de pauze vóór de
deploy staat.**

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
| `www.rvo.nl` | open, robots declareert de sitemap zelf. **De vastgelegde HTTP 500 bestaat niet meer:** met onze eigen user-agent is het op 2026-10-31 HTTP **200**. `register.ts:512-513` is daarmee achterhaald |
| `opendata.overheid.nl` | bestaat niet (DNS faalt) |

Alle twaalf hosten zijn met de **platform-user-agent** gemeten, nergens
vermomd als browser. (Een eerste ronde gebruikte een browserstring; die is
hermeten en de uitkomsten zijn identiek.) Eén nuance:
`linkeddata.overheid.nl` faalde eerst met een TLS-SNI-fout en gaf daarna
200 — één meting op die host is niet betrouwbaar.

### De ontdekking, en de grens eromheen

Met het identificatienummer dat het register al heeft vastgelegd
(`stcrt-2023-35277`) geeft
`https://zoek.officielebekendmakingen.nl/stcrt-2023-35277.html` HTTP 200,
22.604 bytes. De **zoekdienst** staat dicht, het **document** niet.

**Maar "bereikbaar" is niet "toegestaan", en dat onderscheid is hier het
hele punt.** `robotsStatus` wordt `toegestaan` (`robots.ts:403`) en het
document geeft 200, maar `bepaalToestemming()` zegt **nee** met grondslag
`geen_grondslag`. Gemeten is dus alleen: *robots verbiedt het niet.*
Zolang er voor die host geen licentie of `hergebruikVerklaring` is
vastgelegd, blijft de bron volgens het eigen toestemmingsbeleid uit.

KOOP verklaart hergebruik wél in eigen woorden, op de volledig open
`www.koopoverheid.nl`, en dat voldoet aan de maat van
`toestemmingsbeleid.ts:124-132` (zelfde categorie als het
TenderNed-precedent op `register.ts:750`). Dat is de kandidaat-grondslag —
maar hij moet aan de **documenthost** worden gekoppeld, niet aan de
zoekdienst.

**En zelfs met een rechtmatige KOOP-route is de poort nog niet open:**
beide KOOP-bronnen staan in `GEBUNDELDE_BEKENDMAKINGEN`
(`documentsoort.ts:521-522`), dus een Staatscourant- of
Gemeentebladdocument moet het bevoegd gezag ook **zelf noemen** voordat het
een claim kan bevestigen. En `bronverificatie.ts:56-80` stelt ruim **tien**
eisen boven de documentsoort, niet vier.

**Wat ontbreekt:** de licentie zelf is **NIET gemeten**. De drie pagina's
die de voorwaarden dragen staan op `www.overheid.nl`, dat ClaudeBot
uitsluit. Dit vraagt **een mens die de pagina in een browser leest** en het
letterlijke citaat met datum in `register.ts` zet. Een geautomatiseerde
ophaling van die host is **niet toelaatbaar**, ook niet met de
platform-user-agent, en al helemaal niet met een vermomde.

De SRU-getallen die het register noemt (637 records, en in de notities
5149 ACM-codebesluiten / 3999 Kamerstukken / 2104 en 15 Gemeenteblad)
zijn de **registermeting van 2026-10-10**. Ze zijn in deze sessie niet
nagemeten en zijn ook niet na te meten zonder de `Disallow` op
`repository.overheid.nl` te schenden. Neem ze niet over als eigen bewijs.

**Het goedkoopste alternatief bestaat al en is niet uitgerold:** deze branch
zet volledige tekst aan voor twee van de drie `BEVOEGD_GEZAG`-bronnen.
`acm.nl/robots.txt` sluit geen AI- of TDM-crawler uit en vraagt Crawl-delay
10 — vandaar `minIntervalSeconden: 10`. Let op de formulering: er is
**geen expliciete `Allow`** voor `/nl/publicaties/*`; dat pad valt alleen
onder geen enkele `Disallow` en is dus bij afwezigheid toegestaan. Dat is
een zwakkere grondslag dan "expliciet toegestaan", en `register.ts:373-374`
moet dat zo zeggen vóór de uitrol.

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
| Plannerpauze (0046) + motorpariteit, nu óók in de worker | **GO** — additief, 12 eigen toetsen groen, meethaak bewezen |
| Netwerknoodstop (`6681a3f`) | **GO** |
| API-security (`6561f60`) | **GO** in code; bereikt productie pas na een repoTrigger op `vibe-website-api` |
| Bewijslogica — stelt dit stuk déze claim vast (`c585dff`) | **GO** — 20 eigen toetsen, 0 verandering op de 59 productieclaims |
| Claimbeoordelingsregister (0047) | **GO** — 9 eigen toetsen; geen lus, geen opwaardering, autorisatie in de database |
| Volledige tekst + documentvorm + documentsoort v2 | **GO**, uitsluitend via het plan in §7.4 |
| Juridische claimpoort | **GO** — de controle "een officiële documentsoort bevestigt niet automatisch een specifieke claim" **slaagt** nu (§4.1) |
| Sleutelrotatie | **GO en urgent**, los van deze release en buiten deze opdracht |

**GO voor de gecontroleerde productie-uitrol**, op drie voorwaarden die
geen van drieën een ontwerpvraag zijn:

1. de orde van §7.4 wordt gevolgd, met de **voorhoededeploy eerst** —
   pauzeren kan niet voordat 0046 in productie staat;
2. elke **AKKOORD**-stap krijgt zijn eigen toestemming op dat moment;
3. stap 7 en 8 worden **gemeten** en niet aangenomen, met de verwachte
   getallen uit de simulatie ernaast.

De techniek is gereed en groen: **1242 toetsen** plus 24 in `api/`,
typecheck 0 fouten, elke poort PASS, en de simulatie tweemaal identiek op
verse productiedata. Wat openstaat (§7.1) is documentatie en
meetdekking — geen van die punten raakt de veiligheid van de uitrol.
