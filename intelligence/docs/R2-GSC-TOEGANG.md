# Google Search Console — exact wat er nodig is

**Status: NIET AANGESLOTEN.** Dit document noemt per onderdeel de exacte
vereiste, en bij elk onderdeel of het er is. Er is in R2 geen enkel
indexatiecijfer geschat; de acht GSC-afhankelijke metrieken staan op
`NOT_AVAILABLE` met hun reden.

---

## 1. De gemeten nulstand

| Onderdeel | Vereist | Aanwezig op `de16e87` |
|---|---|---|
| API-client in de code | ja | **NEE** |
| `googleapis` / `google-auth` in `package.json` | ja | **NEE** — alleen `express` en `pg` |
| `INTEL_GSC_CLIENT_EMAIL` / `_PRIVATE_KEY` / `_SITE_URL` gezet | een van de twee paden | **NEE** — gedefinieerd, nergens gelezen |
| Dienstaccount | ja | **NEE** — 0 in het project |
| `searchconsole.googleapis.com` ingeschakeld | ja | **NEE** |
| Property-verificatie van het dienstaccount in GSC | ja | **NEE** |
| Rijen in `intel.zoekvraag_metingen` | — | **0** |
| `gsc_inventaris._status` in `data/seo/historische-urls.json` | — | **`NOT_AVAILABLE`**, 0 URL's |

De drie env-variabelen hebben **exact één** verwijzing in de hele repository:
`src/kern/config.ts:189`, waar hun NAMEN staan. Geen enkele regel code leest
hun waarde. `grep -rniE "searchconsole|googleapis|oauth|\bjwt\b|service_account|RS256"`
over `intelligence/` en `scripts/` geeft alleen commentaar in het Cloud
Run-manifest, de VERBODEN-patronen in `test/eenheid/indexatiemonitor.test.ts`
en `src/ops/gcsopslag.ts` — dat laatste is een JWT-bearer-stroom voor Google
Cloud **Storage** (`devstorage.read_write`), niet voor Search Console.

## 2. Propertytoegang — welke property, en in welke vorm

**Property:** `https://www.vibeenergy.nl/` (URL-prefix).

Dat staat zo in `deploy/analytics-cloudrun-job.yaml` en het is een
betekenisvolle keuze, niet een formaliteit:

- **URL-prefix `https://www.vibeenergy.nl/`** levert alleen die host en dat
  schema. Dat past bij deze site, en dat is gemeten op 29 oktober 2026:

  ```
  http://vibeenergy.nl/       301 -> https://vibeenergy.nl/
  https://vibeenergy.nl/      301 -> https://www.vibeenergy.nl/
  http://www.vibeenergy.nl/   301 -> https://www.vibeenergy.nl/
  ```

  en van de 431 sitemap-URL's staan er **431 van 431** onder
  `https://www.vibeenergy.nl/`. Er is dus geen verkeer dat een URL-prefix op
  `https://www` zou missen.
- **Domain-property `sc-domain:vibeenergy.nl`** zou óók subdomeinen en
  `http` meenemen. Dat is hier ongewenst: het zou cijfers van een eventueel
  subdomein in dezelfde tabel mengen zonder dat de rij vertelt waar ze
  vandaan komen.

> **De grens die hier bewaakt moet worden.** Vibe **Home** heeft een eigen
> property en eigen GTM-container (`GTM-WFWS7DRN`). Die twee mogen nooit in
> dezelfde database belanden: `intel.zoekvraag_metingen` is per
> `organisatie_id` gescoopt, maar een verkeerd gekozen property zou cijfers
> van het andere merk ónder de Vibe Energy-organisatie schrijven, en dan is
> de RLS-scheiding wel intact en het cijfer toch fout.

## 3. Scopes

Precies één, read-only:

```
https://www.googleapis.com/auth/webmasters.readonly
```

**Niet** `webmasters` (read-write). Dat scope staat sitemap-inzending en het
verwijderen van property-eigenaren toe, en dit platform doet geen van beide.
Sterker: `test/eenheid/indexatiemonitor.test.ts:362-372` houdt een lijst
VERBODEN patronen bij, waaronder de Indexing API en sitemap-inzending — een
poort die faalt als iemand die alsnog inbouwt. Het bredere scope aanvragen
zou die poort zinloos maken.

Voor GA4 (los van GSC, nu evenmin aangesloten) zou
`https://www.googleapis.com/auth/analytics.readonly` gelden.

## 4. Dienstaccountrechten — twee lagen, en ze worden vaak verward

### 4a. IAM in het GCP-project (`vibe-energy-509410`)

| Rol | Waarop | Waarvoor |
|---|---|---|
| `roles/secretmanager.secretAccessor` | secret `vibe-intel-db-url` | de databaseverbinding lezen |
| `roles/run.invoker` | de job | Cloud Scheduler mag hem starten |
| `roles/artifactregistry.reader` | het repo | het image trekken |

Geen `roles/owner`, geen `roles/editor`, en **geen sleutelbestand**
(`iam.serviceAccountKey`) — zie §5.

In te schakelen API's: `run`, `searchconsole`, `secretmanager`,
`artifactregistry` (en `analyticsdata` zodra GA4 erbij komt). Alle vier staan
nu uit.

### 4b. Verificatie in Search Console zelf

**Dit is de stap die het vaakst wordt vergeten, en zonder deze stap geeft de
API 403 ongeacht de IAM-rollen.** Een GCP-rol geeft géén toegang tot een
GSC-property; die toegang wordt in Search Console verleend.

Handeling: in Search Console → property `https://www.vibeenergy.nl/` →
*Instellingen* → *Gebruikers en machtigingen* → het e-mailadres van het
dienstaccount toevoegen:

```
vibe-analytics-ingest@vibe-energy-509410.iam.gserviceaccount.com
```

met machtiging **Beperkt** (`Restricted`). Dat is voldoende voor
`searchanalytics.query` en `sites.get`. **Niet** *Volledig* en zeker niet
*Eigenaar*: die kunnen gebruikers verwijderen en de property ontverifiëren.

## 5. Uitvoeromgeving — en waarom niet op Railway

**Cloud Run Job**, dagelijks via Cloud Scheduler (`30 4 * * *`,
`Europe/Amsterdam`), met **workload identity** — geen sleutel die kan lekken.

De reden dat dit niet op Railway kan, is gemeten en niet aangenomen: **Railway
heeft geen OIDC-identity-token en geen tokenendpoint.** Workload identity
federation is daar dus onmogelijk, en wat overblijft is een langlevende
private key in een omgevingsvariabele. Dat is precies wat het ontwerp wil
vermijden, en het is bovendien riskanter dan normaal omdat de statische site
**de hele repository** vanaf de wortel serveert (gemeten:
`https://www.vibeenergy.nl/package.json` geeft HTTP 200).

Op Cloud Run haalt de adapter zijn token bij de metadataserver op met de
identiteit van de job. Daarom staan `INTEL_GSC_CLIENT_EMAIL` en
`INTEL_GSC_PRIVATE_KEY` bewust **niet** in het manifest; er is
`INTEL_GOOGLE_AUTH=workload-identity` in plaats daarvan.

> **Twee defecten in dat manifest, nu gemeten.** `INTEL_GOOGLE_AUTH` wordt
> door **geen enkele** regel code gelezen — `grep` over de hele repository
> geeft exact die ene treffer in de yaml. En de job geeft
> `args: ["src/cli/analytics.ts", "--ingest"]` mee, terwijl `cli/analytics.ts`
> alleen `--meet`, `--alles`, `--max`, `--offset`, `--gelijktijdig`,
> `--bewaar` en `--json` kent: `--ingest` wordt stil genegeerd en de job zou
> alleen het rapport printen. Beide moeten mee in de implementatieronde.

## 6. Wat er dan te meten valt, en wat nu al kan

| Metriek | Nu | Met GSC |
|---|---|---|
| `TECHNICALLY_INDEXABLE` | **431**, gemeten | ongewijzigd |
| `CURRENT_CANONICAL_INVENTORY` | **430 van 447**, gemeten | ongewijzigd |
| `GOOGLE_INDEXED` | `NOT_AVAILABLE` | klikken/vertoningen per URL |
| `ORGANIC_IMPRESSIONS` / `_CLICKS` / `SEARCH_QUERIES` | `NOT_AVAILABLE` | ja |
| CTR en gemiddelde positie | niet in het rapport | kolommen bestaan al in `intel.zoekvraag_metingen` |
| 7/28/90-dagenvergelijking | **werkt**, credentialvrij, `ONBEKEND` tot er twee dagstanden zijn | met echte zoekcijfers erbij |
| Segmentatie nieuws/kennis/commercieel | **werkt**: 0 / 17 / 413 (+19 buiten) | per segment ook zoekcijfers |

**Positie-aggregatie: niet opnieuw bedenken.** `intel.zoekvraag_metingen`
heeft `positie_som` náást `impressies`, en de view
`intel.zoekvraag_per_vraag` rekent Google's formule
`SUM(sum_position)/SUM(impressions)+1`. Een gemiddelde van gemiddelden is
fout zodra dagen verschillende vertoningsaantallen hebben; dat is een geleende
les uit migratie 0009 en de kolommen staan er al voor.

**En een ontbrekende rij blijft geen nul.** De GSC-export bevat alleen rijen
met ≥ 1 vertoning. `intel.analytics_dekking` legt per bron vast welke periode
écht is opgehaald; alles buiten die dekking is `ONBEKEND`. Die tabel heeft nu
**0 rijen en geen schrijver** — dat is werk voor de implementatieronde.

## 7. De volgorde van handelingen

Elke stap hieronder is billbaar of configuratiewijzigend en vraagt dus een
eigen akkoord.

1. API's inschakelen: `run`, `searchconsole`, `secretmanager`,
   `artifactregistry`.
2. Dienstaccount `vibe-analytics-ingest` aanmaken — **zonder** sleutel.
3. Secret `vibe-intel-db-url` aanmaken en `secretAccessor` eraan binden.
4. **In Search Console** het dienstaccount als *Beperkt* toevoegen aan
   `https://www.vibeenergy.nl/`.
5. De API-client bouwen: scope `webmasters.readonly`, token van de
   metadataserver, `searchanalytics.query` per dag met `positie_som`.
6. `--ingest` in `cli/analytics.ts` implementeren en `INTEL_GOOGLE_AUTH`
   daadwerkelijk lezen.
7. Image bouwen, job aanmaken, Scheduler aanmaken.
8. Verifiëren met één dag: `intel.analytics_dekking` krijgt een rij en
   `GOOGLE_INDEXED` gaat van `NOT_AVAILABLE` naar `MEASURED`.

**Stap 4 is de autorisatiegrens.** Stappen 1 t/m 3 en 7 kan een operator met
`roles/owner` zelf; stap 4 vraagt iemand met eigenaarsrechten op de
GSC-property, en dat is een andere bevoegdheid dan een GCP-rol.
