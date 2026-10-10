# Uitrolconfiguratie — Intelligence API, worker en planner

**NIET UITGEROLD.** Dit document beschrijft wat er aangemaakt moet
worden en met welke waarden. Elk commando hieronder maakt een billbare
resource aan of wijzigt productieconfiguratie, en staat daarom in de
goedkeuringsaanvraag.

---

## 1. Waarom Railway, en waarom in hetzelfde project

Gemeten op 10 oktober 2026:

| | |
|---|---|
| Railway-project | `authentic-eagerness` (`7c8d796e-bf0a-4ee5-88c8-6bcfa1b5c10a`) |
| bestaande services | `vibe-website` (statisch, Caddy) en `vibe-website-api` (Express) |
| Postgres in dit project | **bestaat niet** |
| volumes | **0** |
| `RAILWAY_PRIVATE_DOMAIN` | aanwezig op beide services |

Dat laatste is de reden om in hetzelfde project te blijven: Railway
geeft services binnen een project een privénetwerk. De database hoeft
dan **geen publiek adres** te hebben, en de API, de worker en de
planner bereiken hem over `*.railway.internal`.

Een database in een ander project zou over het publieke internet
moeten, en dat is een onnodig aanvalsvlak voor een database met
goedkeuringen en een auditspoor erin.

> **Scheiding blijft overeind.** Dezelfde infrastructuur, maar vier
> aparte services met eigen processen, eigen logs en eigen herstarts.
> De statische site valt niet om als de worker omvalt, en omgekeerd.
> Dat is de eis uit §4, en die gaat over logische isolatie, niet over
> aparte facturen.

---

## 2. De vier nieuwe services

| service | soort | commando | replica's |
|---|---|---|---|
| `vibe-intel-db` | Railway PostgreSQL **17** | — | 1 |
| `vibe-intel-api` | web | `npm run dashboard` | 1 |
| `vibe-intel-worker` | worker | `npm run worker` | 1 |
| `vibe-intel-planner` | cron, `0 * * * *` | `npm run planner` | — |

Alle drie de Node-services bouwen uit **dezelfde repository** met
`rootDirectory: intelligence`.

### Waarom één worker en niet twee

De wachtrij ondersteunt meerdere workers (`for update skip locked` is
daarvoor gebouwd en getoetst), maar meer workers maken de ingest niet
sneller: die is begrensd door het ophaalinterval per bron en door vijf
seconden minimum tussen twee verzoeken aan dezelfde host. Twee workers
zouden alleen vaker "niets te doen" rapporteren.

Opschalen heeft wél zin zodra er AI-generatie bij komt, want die is
latencygebonden. Dan moet ook de snelheidsbegrenzer van het dashboard
naar een gedeelde teller; dat staat als voorbehoud in
`src/dashboard/bescherming.ts`.

### Waarom de planner een cron is en geen permanent proces

Een permanent proces dat zelf de klok bijhoudt moet zijn eigen
herstart, zijn eigen gemiste venster en zijn eigen dubbele uitvoering
afhandelen. Railway's cron doet dat, en de planner is al idempotent per
uurvenster — gemeten: een tweede run in hetzelfde venster plant 0
taken. De combinatie is dus veilig bij een overlappende of
dubbelgevuurde cron.

---

## 3. Omgevingsvariabelen per service

Alleen namen. Waarden horen in Railway's variabelen, niet in dit
document en niet in de repository. **Deze repository is publiek.**

### Gedeeld door api, worker en planner

```
INTEL_OMGEVING=productie
INTEL_DB_URL=${{vibe-intel-db.DATABASE_URL}}
INTEL_DB_APP_ROL=vibe_intel_app
INTEL_DB_ONDERHOUD_ROL=vibe_intel_onderhoud
INTEL_ORGANISATIE=vibe-energy
INTEL_SITE_BASIS_URL=https://www.vibeenergy.nl
INTEL_NETWERK_TOEGESTAAN=1
INTEL_LOG_NIVEAU=info
```

`${{vibe-intel-db.DATABASE_URL}}` is een Railway-verwijzing: de waarde
staat nergens in platte tekst en volgt automatisch een
wachtwoordrotatie.

### Alleen `vibe-intel-api`

```
INTEL_SESSIE_GEHEIM=<32+ tekens, gegenereerd, nergens anders gebruikt>
INTEL_DASHBOARD_POORT=${{PORT}}
INTEL_DASHBOARD_BIND=0.0.0.0
INTEL_DASHBOARD_ACHTER_TLS_PROXY=1
```

Die laatste twee horen bij elkaar en nergens anders. `startWeigering()`
**weigert te starten** bij productie plus een niet-loopback binding
zonder die verklaring — gemeten in vier eenheidstoetsen. Railway
termineert TLS voor de service, dus de verklaring is hier waar. Zet hem
nooit aan zonder proxy ervoor.

### Niet zetten, bewust

```
OPENAI_API_KEY            de allowlist is leeg; generatie staat uit
INTEL_GSC_*               NIET AANGESLOTEN tot de Cloud Run Job er is
INTEL_GA4_*               idem
INTEL_BING_*              idem
INTEL_CRM_*               idem
```

Zolang die ontbreken blijft elke funnelstap **ONBEKEND**, en dat is
geen nul. Dat is afgedwongen en getoetst.

---

## 4. Het dashboard is niet publiek

`vibe-intel-api` krijgt **geen aangepast domein**. Bereikbaar via het
servicedomein `*.up.railway.app`, en dat is niet geraden maar wel
publiek adresseerbaar — dus de beveiliging mag er niet van afhangen,
en dat doet ze niet:

- elke route achter een sessie; `GET /` geeft 302 naar `/inloggen`
- rechten per verzoek uit de database; redacteur krijgt 403 op
  `/instellingen`, beheerder 200
- `Secure`-cookie en HSTS in productie
- tien inlogpogingen per minuut per IP, vijf per account dan vijftien
  minuten op slot, elke blokkade in het auditspoor
- CSRF met een dubbel token
- `noindex, nofollow`, `DENY` in een frame, strikte CSP

**Geen DNS-wijziging.** Een eigen subdomein zou een aanpassing in de
zone van vibeenergy.nl vragen, en dat is een aparte goedkeuring. Tot
die tijd is het servicedomein genoeg: het staat op `noindex` en achter
authenticatie.

---

## 5. De commando's

Niet uitgevoerd. Elk hiervan maakt een billbare resource aan.

```bash
# 1. PostgreSQL 17 in hetzelfde project, bereikbaar over het privénet
railway add --database postgres --service vibe-intel-db

# 2. De drie Node-services uit intelligence/
railway add --service vibe-intel-api     --repo MounirVB/vibe-website
railway add --service vibe-intel-worker  --repo MounirVB/vibe-website
railway add --service vibe-intel-planner --repo MounirVB/vibe-website

# 3. Per service: rootDirectory intelligence, startCommand, variabelen
#    (via de Railway-UI of `railway variables --set`)

# 4. Migreren. EERST een back-up van de nieuwe database, ook al is hij
#    leeg: de procedure moet vanaf dag een kloppen.
railway run --service vibe-intel-api npm run backup
railway run --service vibe-intel-api npm run migreer
railway run --service vibe-intel-api npm run migreer -- --droog   # drift 0

# 5. Zaaien en de referentiegeografie
railway run --service vibe-intel-api npm run zaai
railway run --service vibe-intel-api npm run geo

# 6. Een beheerder met een wachtwoord
railway run --service vibe-intel-api npm run wachtwoord -- --email <adres> --wachtwoord <geheim>

# 7. Verifiëren in de DOELOMGEVING, niet lokaal
railway run --service vibe-intel-api npm run poort
railway run --service vibe-intel-api npm run gezondheid
curl -fsS https://<servicedomein>/gezond
curl -fsS https://<servicedomein>/gereed
```

Stap 7 is de stap die van "uitgerold" naar "operationeel" gaat. Zonder
die uitvoer in de doelomgeving blijft de status READY_FOR_ACTIVATION.

---

## 6. Terugdraaien

| wat | hoe |
|---|---|
| een slechte release van api/worker/planner | Railway-rollback naar de vorige deploy; de database blijft |
| een slechte migratie | voorwaarts repareren; zie `docs/RUNBOOK.md` §4 |
| de hele intelligencelaag uit | de drie services pauzeren. **De website blijft staan**: andere service, geen database, geen afhankelijkheid |
| database kwijt | restore volgens `docs/RUNBOOK.md` §3 |

Dat derde punt is de belangrijkste eigenschap van deze opzet en is te
controleren: `vibe-website` heeft geen `INTEL_*`-variabele, geen
databaseverbinding en geen verwijzing naar een intelligenceservice.
De site is statische HTML die door Caddy geserveerd wordt.

---

## 7. Kosten

| resource | verwachting |
|---|---|
| PostgreSQL | **ONBEKEND tot gemeten.** Databaseomvang nu 12 MB lokaal met 2.103 documenten |
| api | permanent proces, 1 replica |
| worker | permanent proces, 1 replica; meestal idle |
| planner | cron, een paar seconden per uur |
| Cloud Run analytics | per run, enkele seconden per dag |

**Niet geschat in euro's.** Het project staat op het `hobby`-plan
(gemeten in de deploymetadata) en Railway rekent per gebruik. Een
bedrag noemen zonder de actuele tarieven en zonder een meting van het
werkelijke gebruik zou een verzonnen getal zijn — precies wat dit
platform in zijn eigen inhoud niet doet, en dan ook niet in zijn eigen
documentatie.

De eerste maand na activering levert de meting. Tot die tijd is dit
**ONBEKEND**, en dat is een eerlijker antwoord dan een schatting.
