# Productie — topologie, variabelen, migratieveiligheid en uitrol

**Gemeten op 10 oktober 2026, op de integratiebranch
`feat/vibe-energy-intelligence-integratie`.**

> ## De belangrijkste regel van dit document
>
> **Het intelligenceplatform is NOOIT uitgerold.** Er is geen
> productiedatabase, geen productieservice, geen draaiende worker en geen
> draaiende planner. Alles hieronder is ONTWERP plus LOKAAL BEWIJS.
>
> Wat wél in productie staat, is Release 1: de statische site. Die is
> gemeten, niet aangenomen.
>
> Waar hieronder "lokaal bewezen" staat, betekent dat: het werkt op deze
> machine tegen een lokale database. Het betekent NIET dat het
> operationeel is.

---

## 1. Wat er nu echt in productie staat

Gemeten via de Railway-API en tegen de live site.

| | |
|---|---|
| Railway-project | `authentic-eagerness` (`7c8d796e-bf0a-4ee5-88c8-6bcfa1b5c10a`) |
| Omgeving | `production` (`3d83cc3e-ddb5-400c-96b2-4cea2bdd5993`) |
| Workspace | mounirvb's Projects, plan `hobby` |

Het project draagt **twee** services, beide op dezelfde repository
`MounirVB/vibe-website`:

| service | id | rol | branch | commit | deploy |
|---|---|---|---|---|---|
| **`vibe-website`** | `0e3c1eee-47ad-4e52-aaf6-7eb9892e0229` | de statische site | `main` | `a2fbad7` | 2026-10-10 05:36Z, RUNNING |
| `vibe-website-api` | `e225ebbc-7bc4-4eed-b9b8-ff7166367895` | Express-brochuredienst | `main` | `59535f3` | 2026-08-19 22:50Z, RUNNING |

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
moet er dus een back-up met een **geverifieerde restore** staan. Die
bestaat nu niet, want er is geen productiedatabase.

> **Niet gedraaid:** er is geen restoretest uitgevoerd, want er is niets
> om te restoren. Dit is een openstaand punt, geen afgevinkt punt.

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
