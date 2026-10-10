# Vibe Energy Intelligence Platform — architectuur

Release 2. Branch `feat/vibe-energy-intelligence`, worktree
`~/projects/vibe-wt-intelligence`, afgetakt van `main` op `e2faa3b`.

Alles in dit document is in deze sessie gemeten. Waar iets niet gemeten is, staat
NIET GEMETEN.

---

## 1. Waarom dit platform hier staat, en niet in costa-select-dashboard

De opdracht gaat uit van een bestaand applicatieframework met database, workers en
dashboard. In `vibe-website` bestaat dat niet. Gemeten:

| Meting | Uitkomst |
|---|---|
| Tracked bestanden | 506, waarvan 51 `.html` in de wortel |
| Framework | geen. Wortel-`package.json` heeft één script: `qa:assets` |
| Lockfile | alleen `api/package-lock.json` (npm) |
| Database, ORM, queue, worker, cron | **nul hits** over `main`, `lead-intake-platform`, `fix/brochure-download`, `fix/asset-structure` |
| Serverapplicatie | één: `api/server.js`, Express 4, brochuremailer via Resend, state in `Map`'s in het geheugen |
| Deploy | `railpack.json` → `provider: "staticfile"` |

Tegelijk bestaat er wél een volwassen platform met precies deze vorm — in
`costa-select-dashboard`, op `origin/main` (`708a6637`): `lib/nieuws/` met 60
bestanden, 11 `supabase-nieuws-*.sql`-migraties, drie cronroutes, een beheerpagina,
plus een SEO Control Center met sleutelloze GSC-ingest (`lib/seo/`, 17 bestanden).

**Dat platform is niet de plek voor Release 2, om drie gemeten redenen:**

1. **Het mikt op een ander merk.** De hele nieuwsketen daar is
   consumentgericht en gericht op `vibehome.nl`. `scripts/run-gsc-ingest.ts` draait
   op `ENTITEIT_CODE='VIBEHOME'` en `SITEMAP='https://www.vibehome.nl/sitemap.xml'`.
2. **Het publiceert niet naar een Vibe-website.** `lib/nieuws/publicatiepakket.ts`
   staat er letterlijk: *"schrijft niet naar de Vibe Home-repo, opent geen pull
   request, raakt geen sitemap aan en triggert geen deploy."*
   `nieuws_publicaties.transport` staat standaard op `HANDMATIGE_COMMIT`; de enige
   andere waarde, `GEAUTOMATISEERD`, is ongebruikt. De enige datastroom tussen
   website en dashboard is **inkomend**: `app/api/public/site/lead/route.ts`.
3. **Het is productie van vijf producten.** Die repo heeft 131 worktrees en de
   checkout loopt 329–401 commits achter op `origin/main`. Release 2 daarin bouwen
   betekent werken in een draaiend meerproductenplatform, en dat is precies wat de
   opdracht voor Release 1 verbiedt.

Release 1 (`seo-geo-fundament`) staat in `vibe-website`. Release 2 hoort daarom in
dezelfde repository, in een eigen worktree, met een eigen database.

> **Dit is wel een reëel dubbelingsrisico en het hoort op tafel.** De machinerie
> voor bronverzameling, clustering, claimboekhouding en artikelvalidatie bestaat al
> één keer voor het zustermerk. Zie §9 voor de integratieopties.

---

## 2. De stack, en waarom

| Laag | Keuze | Waarom |
|---|---|---|
| Runtime | Node 24.14.1, TypeScript via native type-stripping | Gemeten aanwezig. Geen buildstap, geen bundler; `tsc` alleen voor `--noEmit`. `erasableSyntaxOnly` staat aan, dus geen `enum`/`namespace` die in runtime zou breken. |
| Pakketbeheerder | npm | Enige lockfile in de repo is `api/package-lock.json`. |
| Afhankelijkheden | `express`, `pg` (+ 3 typepakketten) | Het huis heeft precies één runtime-afhankelijkheid in `api/`. Een ORM, queuebibliotheek of frontendframework toevoegen zou de repo van karakter veranderen. |
| Database | PostgreSQL, eigen schema `intel` | Lokaal gemeten: PG 17.11 op `:5433`, PG 16.14 op `:5432`. |
| Tests | `node --test` | De repo heeft een eigen harnas in `api/test/api.test.mjs`; `node --test` is de standaardvariant daarvan zonder nieuwe afhankelijkheid. |
| Wachtrij | tabel + `for update skip locked` + lease | Geen Redis nodig voor deze volumes, en de wachtrij blijft zichtbaar in SQL. |
| Dashboard | server-gerenderde HTML uit dezelfde Node-service | De site zelf is HTML + CSS + vanilla JS. React/Next zou een toolchain introduceren die hier nergens bestaat. |
| Model | OpenAI | Gemeten: `OPENAI_API_KEY` staat in de omgeving, `ANTHROPIC_API_KEY` niet. De provider zit achter een interface. |

**Taal:** Nederlands, in code, commentaar en commits. De `git log` van deze repo is
gemengd (17 Nederlands / 14 Engels, gesplitst per tijdvak), maar de staande regel
voor `vibe-website` is Nederlands, en `docs/` en `api/server.js` zijn dat ook.

---

## 3. De publieke webroot is de repositorywortel

Gemeten op de live site:

| URL | Status |
|---|---|
| `https://www.vibeenergy.nl/api/server.js` | **200**, 9.781 bytes |
| `https://www.vibeenergy.nl/docs/vibe-claims-register-v2.md` | **200**, 7.959 bytes |
| `https://www.vibeenergy.nl/package.json` | **200** |
| `https://www.vibeenergy.nl/.git/HEAD` | 404 |
| `https://www.vibeenergy.nl/.env` | 404 |
| `robots.txt` | `User-agent: *` / `Allow: /` — geen enkele `Disallow` |

De staticfile-provider serveert dus **de hele repository**, op dotbestanden na.
Gevolgen die in het ontwerp zitten:

- **Geen enkel geheim in de repository.** `intelligence/.gitignore` sluit `.env`
  af; de wortel-`.gitignore` deed dat niet.
- **Geen beveiliging door obscuriteit.** Broncode van dit platform is in beginsel
  openbaar. Authenticatie, autorisatie en de publicatiepoorten moeten dus standhouden
  terwijl de aanvaller de code kent.
- **Blijft staan als integratiepunt:** zie §9. De intelligence-service hoort een
  eigen Railway-service te worden; het statische serveren van `intelligence/`
  uitzetten raakt de deployconfiguratie van Release 1 en is daarom *niet* gedaan.

---

## 4. Het feitenmodel

De scheiding die alles draagt:

```
BRON ──► BRONDOCUMENT ──► VERSIE (inhoudshash)
                             │
                             ├──► UITSPRAAK ──► GEBEURTENIS
                             │      (atomair)     (genormaliseerd)
                             │         │
                             │         ▼
                             │    INTERPRETATIE  (expliciet gelabeld, nooit feit)
                             │         │
                             ▼         ▼
                        INHOUDSKANDIDAAT ──► INHOUDSVERSIE ──► PUBLICATIEBESLUIT ──► PUBLICATIE
                                                   │                                     │
                                                   └──────────► PRESTATIE ◄──────────────┘
```

43 tabellen in schema `intel`, 103 check-constraints, 38 RLS-policies.
De volledige lijst staat in `db/migraties/`.

Vijf regels die in de **database** staan, niet alleen in code:

1. Een uitspraak kan niet op `bevestigd` staan zonder minstens één primaire
   bronversie — constraint trigger `uitspraken_bewijsplicht`.
2. Een interpretatie kan niet de soort `feit` hebben, en het vertrouwensplafond
   hangt af van de soort (feit 1.00, cijfer/prijs/specificatie 0.90, berekening
   0.80, interpretatie 0.70).
3. Een regionale netcapaciteitsclaim kan niet bestaan op grondslag `afgeleid` —
   constraint `regio_impacts_netclaim_vereist_bronbewijs`.
4. Goedkeuren bindt aan een afdruk van de inhoud; daarna tekst wijzigen maakt de
   versie onpubliceerbaar — `inhoud_versies_goedkeuring_bindt`. Plus vier ogen:
   de goedkeurder is noch de auteur noch de laatste bewerker.
5. Automatisch publiceren bij risicoklasse `hoog` is onmogelijk, ongeacht beleid —
   `publicatiebeleid_hoog_risico_nooit_automatisch`.

### Geografie is bewijsgebonden

`uitspraak_geo.grondslag` en `gebeurtenis_geo.grondslag` kennen drie waarden:

- `bron_expliciet` — de bron noemt dit gebied zelf;
- `code_match` — exacte CBS- of postcodematch uit de bron;
- `afgeleid` — onze gevolgtrekking.

`bewijs` is een verplichte tekstkolom: welke veldwaarde of welke zin in welke
bronversie dit gebied noemt. Er is **geen** geometrische insluiting, juist omdat
"deze gemeente overlapt het gebied van deze netbeheerder" geen bewijs is dat een
netbeperking voor die gemeente geldt. `intel.geo_bereiken` is daarom ook geen
tenantdata: de applicatierol mag die tabel alleen lezen.

---

## 5. Beveiliging

| Maatregel | Hoe het gecontroleerd wordt |
|---|---|
| Organisatiescope | `organisatie_id` op elke gescoopte tabel + RLS-policy `organisatie_id = (select intel_priv.huidige_organisatie())`. Ontbreekt `app.organisatie_id`, dan matcht niets: faalt dicht. |
| De applicatie kan RLS niet omzeilen | `vibe_intel_app` is `nologin`, geen superuser, geen `BYPASSRLS`, geen eigenaar. Elke verbinding neemt de rol aan via de startupoptie `-c role=`, óók lokaal waar de ontwikkelaar superuser is. |
| Minimale rechten | Expliciete grants per tabel. `DELETE` bestaat alleen op zeven koppeltabellen. `public`-schema: `revoke all ... from public`, en `has_schema_privilege('vibe_intel_app','public','CREATE')` = `f`. |
| Geen gratis functierechten | Postgres geeft nieuwe functies standaard `EXECUTE` aan `PUBLIC`. Elke migratie neemt dat expliciet terug; de invariantencontrole faalt als er één overblijft. Gemeten: 0. |
| Onveranderlijk auditspoor | `intel.audit_gebeurtenissen` en `intel.publicatiebesluiten`: geen `UPDATE`/`DELETE`-grant, plus een statement-trigger die het ook voor de eigenaar weigert. |
| SECURITY DEFINER | Precies één: `intel_priv.actieve_organisaties()`. Geen parameters, `search_path = ''`, geeft alleen `id` en `sleutel` van actieve organisaties terug. `revoke all from public`, grant alleen aan de applicatierol. |
| Promptinjectie | Brontekst is data. `brondocument_versies.injectie_verdacht` wordt door een deterministische detector gezet; inhoud die uit zo'n versie komt kan niet goedgekeurd of gepubliceerd worden zonder menselijke goedkeurder (invariant `injectiebron_zonder_mens`). |
| Geheimen | Alleen uit de omgeving. Logregels scherpen verdachte sleutels én waardepatronen af (`sk-`, `ghp_`, JWT's, private keys, Postgres-DSN's met wachtwoord). |

Controleren: `select * from intel_priv.controleer_invarianten()` en
`intel_priv.controleer_inhoudsinvarianten()`. Geen rijen = alle aannames kloppen.
Gemeten na migratie 0009: beide leeg.

---

## 6. Autonomie: productie start op voorstellen

`intel.publicatiebeleid` staat standaard op `auto_publiceren_aan = false`. De
techniek om later wel automatisch te publiceren zit erin, maar:

- `auto_max_risico = 'hoog'` is onmogelijk in combinatie met `auto_publiceren_aan`;
- `auto_min_bronnen` (default 2) en `auto_min_bewijskwaliteit` (default 4) zijn harde
  drempels;
- externe kanalen (LinkedIn, nieuwsbrief) vereisen `machtiging_bewijs` om vrijgegeven
  te worden, en er bestaat **geen verzendcode** in dit platform. Autonome outreach is
  dus niet uitgeschakeld maar onbestaand.

Risicoklassen volgen de opdracht: juridische/regulatoire uitleg,
subsidiegerechtigdheid, rendement, batterijveiligheid, engineeringadvies en
contractuele netcapaciteit zijn `hoog` en vereisen altijd een mens.

---

## 7. Geleende lessen (migratie 0009)

Overgenomen uit het zusterplatform, dat deze fouten al betaald heeft. Elk punt is
daar gemeten, niet bedacht.

| Les | Wat het hier is |
|---|---|
| **GSC-positie is nul-gebaseerd** en Google's formule is `SUM(sum_position)/SUM(impressions)+1`. Een gemiddelde van gemiddelden is fout zodra dagen verschillende vertoningsaantallen hebben. | `zoekvraag_metingen.positie_som` (teller) naast `impressies` (noemer); nooit een voorgerekend gemiddelde aggregeren. View `intel.zoekvraag_per_vraag` rekent het juist. |
| **Een ontbrekende rij is geen nul.** De export bevat alleen rijen met ≥1 vertoning. | `check (impressies >= 1)`, plus `intel.analytics_dekking` dat per bron vastlegt welke periode écht is opgehaald. Alles buiten die dekking is ONBEKEND. |
| **Herverwerking** hoort aan een epoch te hangen, niet aan `max(datum)`. | `zoekvraag_metingen.epoch_versie`. |
| **TDM-voorbehoud is iets anders dan robots.txt.** TenneT noemt AI/TDM-crawlers in robots.txt en geeft 403 op een botuseragent; NOS, NU.nl en Solar Magazine blokkeren ClaudeBot/GPTBot/CCBot/Google-Extended/PerplexityBot. | `bronnen.tdm_status` + constraint `bronnen_actief_vereist_toestemming`: een actieve bron zonder gemeten toestemming kan niet bestaan. |
| **Redirects zijn een gat.** Een feed kan naar een willekeurige host verwijzen. | `bronnen.toegestane_hosts` — allowlist, en een redirect buiten de lijst wordt geweigerd in plaats van gevolgd. |
| **Bronnen schelen een factor honderd in grootte.** | `bronnen.max_bytes` per bron. |
| **Datumherkomst** — een feeddatum is geen sitemap-`lastmod`. | `brondocumenten.datum_herkomst`. |
| **Vertrouwensplafond per claimsoort.** | `uitspraken_vertrouwensplafond`. |
| **Vier ogen + goedkeuring bindt aan een afdruk.** | `inhoud_versies_vier_ogen`, `inhoud_versies_goedkeuring_bindt`. |
| **Een vertrouwensklink, geen featurevlag.** "De data mag bestaan, maar hij is nog niet te VERTROUWEN." | `koppelingen.vertrouwd` + `gevalideerd_op` + `validatie_bewijs`, met constraint. Het dashboard toont dan "wacht op validatie", niet 0. |
| **Idempotentie via een unique index**, niet via een boolean `draait` (die heeft een race). Een dubbele sleutel is `23505` en betekent *overgeslagen met succes*, geen fout. | `taken_idempotent_uniek`, `planner_runs_uniek`. |
| **Cron niet via een HTTP-route.** Daar werd het webproces 154,8 s vastgehouden terwijl het niets anders deed. | Planner en worker zijn eigen CLI-processen. |
| **Een naam die vrij lijkt is niet vrij zolang er code naar wijst.** | Eigen schema `intel` in een eigen database; geen botsing mogelijk. |
| **Geen bewegende modelaliassen.** Dezelfde afdruk zou dan twee verschillende modellen kunnen betekenen. | Het gebruikte model wordt per aanroep vastgelegd in `ai_aanroepen.model`; de generator waarschuwt bij een alias zonder versie. |

---

## 7b. GECORRIGEERD — de repository IS wel wat live staat

> **Deze paragraaf stond fout in Release 2 en is in Release 2.1
> weerlegd met directe configuratie- en productiebewijzen.** De oude
> conclusie luidde "de repository is niet wat live staat". Dat was een
> verkeerde gevolgtrekking, geen meting. Hij is hieronder blijven staan
> omdat de manier waarop hij misging leerzaam is.

**Wat er werkelijk aan de hand was.** De vergelijking was gemaakt tussen
de *live* sitemap en de *lokale* `main` (`e2faa3b`). Die lokale branch
liep twee commits achter op `origin/main`, en juist die twee commits
zijn Release 1 — het SEO/GEO-fundament dat de 62 "ontbrekende" pagina's
toevoegt. Er is nooit `git fetch` gedaan voordat de conclusie werd
getrokken. De 62 URL's ontbraken niet in de repository; ze ontbraken in
de *checkout*.

**Het bewijs dat het omkeert** (gemeten 10 oktober 2026):

| meting | uitkomst |
|---|---|
| `git ls-remote origin refs/heads/main` | `a2fbad7` |
| branch `seo-geo-fundament` | `a2fbad7` — identiek |
| Railway-service `vibe-website`, actieve deploy | branch `main`, commit **`a2fbad7`** |
| sitemap op branch `a2fbad7` vs. live | **96 locs tegen 96**, verschilset leeg |
| `kennis/netcongestie-uitgelegd`, `regios/gelderland/arnhem`, `subsidies` | **byte-identiek**, SHA-256 gelijk |
| responseheader live | `server: railway-hikari` |
| aangepast domein op de service | `www.vibeenergy.nl` → poort 8080 |

De keten is dus: `github.com/MounirVB/vibe-website` → branch `main` →
Railway-project `authentic-eagerness`, service `vibe-website`
(railpack `provider: staticfile`, Caddy 2.11.4, repowortel als webroot,
geen buildcommando) → `www.vibeenergy.nl`. Een push naar `main` is een
productiedeploy.

**Waarom de verwarring zo hardnekkig was.** Hetzelfde Railwayproject
draagt twee services op dezelfde repository. De checkout
`~/projects/vibe-website` is gelinkt aan de *andere*: `vibe-website-api`,
de Express-brochuredienst, die sinds 19 augustus op `59535f3` staat.
`railway status` in die map wijst dus naar een service die de site niet
serveert en die maanden achterloopt. De statische service staat er los
naast en is nooit bekeken.

**De les, en die is algemener dan dit geval:** "ik zie het niet in mijn
werkboom" is geen meting van wat live staat. `git fetch` en de
deployconfiguratie van de host zijn dat wel. Een afwezigheid is pas een
bevinding als je hebt vastgesteld dat je op de juiste plek keek.

### De oorspronkelijke, onjuiste tekst

Hieronder staat wat er stond. De tabel zelf was correct gemeten; alleen
de linkerkolom beschrijft een achterlopende checkout en niet "de
repository".

| | repository (`main`, `e2faa3b` — **achterlopend**) | live `www.vibeenergy.nl` |
|---|---|---|
| sitemap `<loc>` | 34 | **96** |
| host in sitemap | `https://vibeenergy.nl` (apex) | `https://www.vibeenergy.nl` |
| canonical op `/microgrids` | apex | www |

62 live URL's bestonden niet in die worktree — ze stonden op
`origin/main`, dat niet was opgehaald:

- **`/kennis` plus 18 kennispagina's**: `batterij-dimensioneren`,
  `netcongestie-uitgelegd`, `peak-shaving`, `subsidiemechanismen`,
  `kw-versus-kwh`, `load-balancing`, `terugleverbeperking`,
  `batterijveiligheid`, `ems-energiemanagementsysteem`,
  `businesscase-batterij`, `normen-en-keuringen`,
  `laadinfrastructuur-dimensioneren`, `energiehandel-en-flexibiliteit`,
  `transportvermogen-versus-aansluitwaarde`, `energieprestatie-meten`,
  `batterijdegradatie`, `netaansluiting-aanvragen`, `energieadvies`
- **`/regios`** met een provincie→gemeentehierarchie:
  `gelderland/{arnhem,nijmegen,duiven,renkum,rheden}`,
  `noord-brabant/tilburg`,
  `noord-holland/{alkmaar,amsterdam,medemblik,purmerend}`,
  `overijssel/hengelo`
- **`/sectoren`**, en `/netcongestie`, `/laadplein`, `/energieadvies`
  als echte pagina's in plaats van noindex-stubs

Dat de repository op 2026-08-19 begint met vier "Add files via
upload"-commits en alles daarvoor mist, blijft waar — maar dat is een
gat in de *historie*, niet in de huidige inhoud. De huidige `main` is
compleet en staat live.

**Drie gevolgen die in de code zitten** — deze blijven alle drie geldig,
want ze leunen op "bestaat deze pagina ergens aantoonbaar", en dat is
nu juist beter onderbouwd dan eerst:

1. Het pagina-register leest nu de live sitemap erbij. `bestaat_in_repo`
   en `in_sitemap` zijn aparte feiten — die kolommen stonden er al voor.
   Uitkomst: 51 pagina's in de worktree, 62 die alleen live bestaan.
2. De onderwerpclusters verwijzen naar de live kennispagina's in plaats
   van naar noindex-stubs in de repo. Twaalf van de vijftien clusters
   hebben daarmee een echte eigenaar.
3. De besluitmotor telt een pagina als eigenaar als hij bestaat, in de
   worktree óf live. Het effect:

   | pagina-register | NEW_ARTICLE | UPDATE_EXISTING |
   |---|---|---|
   | alleen repo | 9 | 5 |
   | repo + live | **0** | **19** |

   Nul nieuwe URL's. De regel "verbeter een bestaande pagina als de
   zoekintentie al gedekt is" werkt alleen als je weet welke pagina's er
   echt zijn.

**Wat de correctie verandert voor de publicatieketen.** De oude tekst
zei: "een publicatie naar deze worktree komt niet op vibeenergy.nl, en
wie de echte publisher is weten we niet." Dat is omgekeerd. Een
registerrecord in deze repository komt wél op `vibeenergy.nl`, zodra
iemand de generator draait, committeert en naar `main` pusht. Dat maakt
de keten niet gevaarlijker dan bedoeld — er zitten drie menselijke
handelingen tussen, en poort 16 houdt het nieuwskanaal tegen zolang de
zichtbare navigatie in `vibe/chrome.js` de link mist — maar het betekent
dat `git push origin main` in deze repository een productiedeploy is.

---

## 8. De publicatiegrens met Release 1

`intel.pagina_register` bezit de canonieke waarheid over wie welke URL mag
schrijven: `eigenaar_release` ∈ {`release1`, `release2`, `onbekend`} en `beheer` ∈
{`handmatig`, `intelligence`}. Alleen `beheer = 'intelligence'` mag door dit
platform geschreven worden; voor de rest komt er een patchvoorstel.

Gemeten over de bestaande site, zodat het register op feiten gevuld kan worden:

- 51 `.html` = **35 echte pagina's** + **16 meta-refresh-stubs** (`noindex, follow`).
- `title` 51/51, `description` 51/51, `canonical` 50/51 (`404.html` mist hem),
  `og:*` 33/51, `twitter:card` 31/51, **JSON-LD 1/51** (alleen `index.html`),
  `hreflang` 0/51.
- `sitemap.xml` is handgeschreven, 34 `<loc>`, alleen `<priority>`, **geen
  `lastmod`** — en dekt exact de 34 indexeerbare pagina's, nul drift beide kanten op.
- Chrome (header, nav, footer) wordt in runtime geïnjecteerd door `vibe/chrome.js`.
  Een nieuwe pagina heeft nodig: `<script src="vibe/chrome.js" defer>`,
  `<body data-pagina="…">`, een `<noscript data-chrome-fallback>`-blok en
  `<div data-chrome-footer>`. Navigatie-items staan in **hardgecodeerde JS-arrays**;
  een rubriek `/nieuws` of `/kennis` bestaat daar niet en komt er niet automatisch in.
- **Er is geen nieuws-, blog- of kennisrubriek en geen enkele provincie- of
  gemeentepagina.** Nul hits over alle 51 bestanden.
- Het enige templatemechanisme is `scripts/maak-projecten.mjs` +
  `scripts/projecten.json` (16 records): JSON-records → één templatefunctie →
  gegenereerde pagina's + een overzichtspagina met facetfilter. Dat patroon is
  direct herbruikbaar en wordt door de publicatie-adapter nagevolgd.
- `docs/vibe-claims-register-v2.md` is al een claimgovernance-document, maar in
  prozatabellen, gebonden aan pagina's via **blote bestandsnamen**, zonder claim-ID.
  Kernregel daar, die dit platform overneemt: *"een pagina die een cijfer herhaalt is
  geen bron. Een getal mag alleen op de site staan als het terug te voeren is op één
  eenduidige primaire opgave."*
- Vijf QA-poorten in `docs/qa/*.mjs`, geen van alle in `package.json` en er is geen CI.
  `composition-gate.mjs` kent alleen archetypes B1–B7 en S2, dus een nieuw
  nieuws-archetype zou daar falen op KP-01 "onbekend archetype".

**Bijgewerkt in Release 2.1.** De publicatie-adapter schrijft nu precies één
soort bestand: `data/inhoud/nieuws/<slug>.json`, het registerrecord uit het
contract in `data/seo/nieuws-architectuur.json`. Geen HTML en geen
sitemapregel — die bezit de generator van Release 1. Alle andere mappen onder
`data/inhoud/` zijn van de redactie van Release 1; een voorstel voor zo'n
pagina wordt geweigerd met reden en blijft als patchvoorstel in de database
en het dashboard staan. Zie `src/site/nieuwsregister.ts`.

---

## 9. Integratiepunten die openstaan

0. ~~**De echte publisher van vibeenergy.nl is onbekend.**~~
   **OPGELOST in Release 2.1, en de conclusie was omgekeerd.** Deze
   repository publiceert de site wél: `origin/main` = `a2fbad7` staat als
   actieve deploy op de Railway-service `vibe-website` in project
   `authentic-eagerness`, met `www.vibeenergy.nl` als aangepast domein.
   De sitemap op die commit is identiek aan live (96 van 96) en drie
   steekproefpagina's zijn byte-identiek. Zie §7b voor het volledige
   bewijs en voor hoe de onjuiste conclusie ontstond (een lokale `main`
   die twee commits achterliep, plus een Railway-link die naar de
   brochure-API wees in plaats van naar de statische service).

   **Gevolg:** `git push origin main` in deze repository is een
   productiedeploy. Dat is geen openstaand integratiepunt meer maar een
   staande waarschuwing.

1. **Dubbeling met het zusterplatform.** Afweging: (a) zo laten — twee merken, twee
   ketens, geen gedeelde productierisico's; (b) later de bronverzamelaar en
   claimboekhouding naar een gedeelde bibliotheek tillen; (c) Release 2 naar
   costa-select-dashboard verplaatsen als tweede entiteit. (c) geeft het meeste
   hergebruik en het grootste risico. Dit is een besluit voor de eigenaar, niet voor
   een implementatiesessie.
2. **Broncode publiek via de statische service.** Zie §3. Oplossing vraagt een
   wijziging in de deployconfiguratie van Release 1.
3. **GSC op Railway.** Gemeten in het zusterplatform: Railway heeft geen
   OIDC/identity-token en geen tokenendpoint, dus workload identity federation is
   daar onmogelijk en alleen een langlevende sleutel zou overblijven. Daarom draait
   de GSC-ingest daar als Cloud Run Job. Hetzelfde geldt hier.
4. **Navigatie.** Half opgelost in Release 2.1. De crawlbare
   `<noscript>`-navigatie draagt `/nieuws` nu automatisch, maar alleen als
   de hub op INDEX staat — `zetNavToets()` in
   `scripts/seo/lib/sjabloon.mjs`, toegepast door zowel de generator als
   `herstel-bestaand.mjs`. De zichtbare navigatie zit in
   `vibe/chrome.js`, en dat bestand kan het routeregister niet lezen; daar
   hoort de link met de hand bij zodra het kanaal opengaat. Poort 16
   FAALT zolang dat niet gebeurd is, zodat het kanaal niet live kan staan
   zonder dat een bezoeker het kan vinden.
5. **Composition gate.** Een nieuw archetype voor artikelen moet in
   `docs/qa/composition-gate.mjs` geregistreerd worden. Ook Release 1-gebied.

---

## 10. Draaien

```bash
cd intelligence
npm install
cp .env.voorbeeld .env        # vul INTEL_DB_URL
npm run migreer               # schema toepassen
npm run migreer -- --status   # overzicht + driftdetectie
npm run poort                 # alle invarianten en controles
npm test                      # eenheid, integratie, adversarieel
```
