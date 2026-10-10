# Securityreview — Release 2.2

**Uitgevoerd 10 oktober 2026 op branch
`feat/vibe-energy-intelligence-integratie`.**

Deze review heeft **vier echte defecten** gevonden, waarvan twee met
beveiligingsimpact. Alle vier zijn gerepareerd en met een toets
afgedekt. Ze staan vooraan, want een review die met een
samenvattingstabel begint leest als een afvinklijst.

---

## 1. Gevonden en gerepareerd

### 1.1 IPv6-loopback glipte door de SSRF-poortwacht — ERNSTIG

```
new URL("https://[::1]/x").hostname === "[::1]"
```

`hostname` geeft een IPv6-adres **met vierkante haken** terug. De
controle in `schemaEnDoelToegestaan()` vergeleek met `"::1"` zonder
haken, dus die matchte nooit en de IPv6-loopback werd **doorgelaten**.

**Waarom dit echt is:** een uitgever bepaalt waar zijn feed naartoe
redirect. Dit was dus een pad om het platform te laten praten met
iets op de loopback van de host — en in een containeropstelling met
een sidecar is dat niet theoretisch.

**Gerepareerd:** haken worden gestript, en meteen is gedekt wat er
verder aan interne IPv6 bestaat: `::` (ongespecificeerd), `fe80::/10`
link-local, `fc00::/7` unique-local en IPv4-gemapte vormen als
`::ffff:127.0.0.1`. Aan de IPv4-kant zijn `127.0.0.0/8` (niet alleen
`127.0.0.1`), `0.0.0.0` en `*.localhost` toegevoegd.

**Getoetst:** 11 IPv4-paden en 6 IPv6-paden worden geweigerd, inclusief
het cloud-metadata-endpoint `169.254.169.254`. Eén toets controleert dat
een *publiek* IPv6-adres juist wél door mag, want een te strakke regel
is ook een defect.

**Gecontroleerd dat dit geen bron raakt:** 21 van 21 actieve bronnen
blijven actief.

### 1.2 Een rauwe NUL-byte maakte een bronbestand onzichtbaar voor grep — ERNSTIG

`src/inhoud/concept.ts` bevatte een **letterlijke** NUL-byte in de
string van `inhoudAfdruk()`. Gevolg:

```
$ file src/inhoud/concept.ts
src/inhoud/concept.ts: data          # niet "text"

$ grep -n kiesProvider src/inhoud/concept.ts
(niets)                              # terwijl de aanroep op regel 472 staat
```

**Waarom dit echt is:** `grep` slaat binaire bestanden stil over. Elke
beveiligingsscan, audit of codezoekactie die op grep leunt — en dat
zijn de meeste — zou dit hele bestand hebben gemist. Dit is bovendien
precies het bestand met de functie waaraan **goedkeuringen binden**.

**Gerepareerd:** de escape in plaats van de rauwe byte. NUL als
scheidingsteken is juist een goede keuze (het kan in normale tekst niet
voorkomen, dus de afdruk is ondubbelzinnig); alleen de notatie was fout.

**Gecontroleerd dat goedkeuringen geldig blijven:** de afdruk is
byte-identiek voor en na (`0805a016…`). Was dat niet zo, dan zou elke
bestaande goedkeuring ongeldig zijn geworden.

### 1.3 Weigeringen meldden 302 in plaats van hun eigen status

De CSRF-grendel en de snelheidsbegrenzer gebruikten
`res.status(403).redirect(...)`. Express' `redirect()` zet de status
**altijd** op 302, ook na `res.status()`.

De grendels *werkten* — er kwam geen sessiekoekje — maar een client die
op de statuscode let zag geen weigering. Gevonden doordat E2E-scenario
21 en 22 er samen over omvielen. Nu dragen weigeringen hun eigen status:
403 bij CSRF, 429 met `Retry-After` bij tempolimiet en accountslot.

### 1.4 De CLI probeerde zijn eigen rechten te overschrijden

De eerste versie van `npm run ai -- --tarief` deed de insert als
applicatierol en kreeg `permission denied for table ai_prijzen`.

**Dat was niet een ongemak maar het rechtenmodel:** de applicatie mag
haar eigen model niet toestaan en haar eigen prijzen niet zetten. Dat
zijn operatorbesluiten. Lezen gaat nu via de applicatiepool, schrijven
via de eigenaar — en dat de applicatierol het **niet** mag is nu een
toets.

---

## 2. De review per vlak

### Geheimen

| | |
|---|---|
| repository | **PUBLIEK** (gemeten: `gh repo view` → visibility PUBLIC) |
| scan | 9 patronen over 368 gevolgde tekstbestanden, in CI |
| `.env` | genegeerd; `.env.voorbeeld` zonder waarden |
| `backups/` | genegeerd — een dump bevat goedkeuringen, gebruikers en het auditspoor |
| sleutel in logs | nooit; alleen prefix, laatste vier tekens en lengte |
| sleutel in CI-uitvoer | nooit; de scanner logt de treffer niet, alleen de bestandsnaam en het regelnummer |

De scanner matcht op de **vorm** van echte credentials en niet op het
woord "secret". Een brede regex op "key" of "secret" zou in een
codebase met `sessieGeheim` en `INTEL_SESSIE_GEHEIM` permanent rood
staan, en een scan die altijd rood staat wordt genegeerd.

Uitzonderingen zijn **per regel** met een reden
(`// geheimenscan: ok — …`), nooit per bestand. Een bestand uitsluiten
zou een echt geheim dat er later in belandt stil doorlaten. Dat de
regel per regel geldt bleek meteen: de scanner ving een tweede
fixtureregel die ik vergeten was te markeren.

### Authenticatie

| maatregel | bewijs |
|---|---|
| scrypt | `maakWachtwoordHash` |
| HMAC-ondertekend sessiekoekje | een ander geheim maakt het koekje ongeldig (toets) |
| `HttpOnly`, `SameSite=Strict` | altijd |
| `Secure` | **alleen in productie** — over http op de loopback zou de vlag inloggen onmogelijk maken |
| HSTS | alleen in productie, om dezelfde reden |
| sessieduur | 8 uur |
| tempolimiet | 10 per minuut per IP, glijdend venster |
| accountslot | 5 pogingen, 15 minuten, **tijdelijk** |
| blokkade in het auditspoor | ja — de teller is vluchtig, het spoor niet |

Het slot is bewust tijdelijk. Een permanent slot maakt een
denial-of-service op een bekende gebruiker triviaal: drie verkeerde
pogingen en iemand is buiten.

Het venster is glijdend en niet vast. Een vast venster laat op de
overgang het dubbele door.

**Beperking, eerlijk benoemd:** de tellers staan in procesgeheugen. Met
meer dan één instantie heeft elke instantie zijn eigen teller, en een
herstart wist ze. De beoogde opstelling is één instantie; bij opschalen
hoort dit naar een gedeelde teller. Dat staat als voorbehoud in
`src/dashboard/bescherming.ts` en niet alleen in dit document.

### Autorisatie en RLS

| | |
|---|---|
| per route | `vereistRecht(<recht>)`, rechten **per verzoek uit de database** |
| bewijs | redacteur 403 op `/instellingen`, beheerder 200 (E2E 18) |
| applicatierol | geen superuser, geen BYPASSRLS, bezit niets |
| RLS | 38 van 44 tabellen; de 6 zonder staan in `intel.rls_uitzonderingen` met reden |
| invariant | elke tabel **met** `organisatie_id` heeft RLS — 0 afwijkingen |
| cross-tenant | een andere organisatie ziet 0 rijen (meerdere toetsen) |
| na een restore | RLS, 38 policies, 21 triggers en 103 constraints komen mee |

Die laatste is de niet-vanzelfsprekende: `pg_restore --no-owner` zet
data terug, maar of de **beveiliging** meekomt is een aparte vraag. De
restoretest stelt hem.

De rechten komen uit de database en niet uit de sessie. Een rol die
tijdens een sessie wordt afgenomen werkt dus bij het volgende verzoek
niet meer.

### Injectie

| soort | maatregel |
|---|---|
| SQL | uitsluitend geparameteriseerde queries; geen string-concatenatie met invoer |
| HTML | `veiligeInline()` op alles wat het platform naar het register schrijft |
| prompt | brontekst wordt omhuld en als data behandeld; `injectie_verdacht` blokkeert publicatie zonder mens |
| log | correlatie-ID uit een header moet `^[A-Za-z0-9_-]{8,64}$` zijn |
| SSRF | zie 1.1 |

`veiligeInline()` bestaat omdat de generator van Release 1 `lead`,
`alineas` en `direct_antwoord` **rauw** in de pagina zet — een alinea
mag immers HTML bevatten, dat staat zo in SCHEMA.md. Dat was veilig
toen een mens die bestanden schreef. Nu een machine ze schrijft uit
externe brontekst, zou een `<script>` in een brondocument via
`body_markdown` als echte scripttag op de pagina komen.

De logfilter is geen theorie: een ID belandt in logregels, en een
ongefilterde headerwaarde is dan een injectiepad naar het logbestand.
Zeven vuile varianten worden getoetst.

### Redirects en hostbeperking

| | |
|---|---|
| alleen https | ja; de gemeten TenderNed-keten had een http-hop |
| per hop | robots **en** allowlist worden per redirecthop opnieuw gecontroleerd |
| maximum | 5 hops |
| allowlist | exacte host, of een subdomeinregel die met een punt begint |
| `endsWith`-val | `kwaadcbs.nl` en `www.acm.nl.kwaad.tld` worden geweigerd (toets) |

### Auditonveranderlijkheid

Append-only triggers op onder meer `audit_gebeurtenissen`,
`publicatiebesluiten` en `brondocument_versies`. Getoetst:

- `update` op het auditspoor wordt geweigerd
- `delete` op publicatiebesluiten wordt geweigerd
- **ook na een restore** geldt dat nog
- de applicatierol mag taken niet verwijderen

### Goedkeuring omzeilen

Vijf onafhankelijke grendels, en dat is met opzet geen keten maar een
stapel:

1. `publicatiebeleid_hoog_risico_nooit_automatisch` — databaseconstraint
2. `inhoud_versies_vier_ogen` — de auteur kan zijn eigen werk niet
   goedkeuren; een poging faalt met een constraintfout
3. `inhoud_versies_goedkeuring_bindt` — de goedkeuring bindt aan een
   inhoudsafdruk
4. `publiceer()` weigert een status die niet `goedgekeurd` is en een
   afdruk die niet klopt
5. de publicatie-PR berekent de afdruk **nog een keer** en weigert bij
   verschil

Getoetst: goedkeuren, daarna de tekst wijzigen, dan publiceren → de PR
wordt geweigerd met de reden erbij.

### Publicatierechten

| | |
|---|---|
| auteurspad | **precies één**: `data/inhoud/nieuws/<slug>.json` |
| alles daarbuiten | geweigerd met reden; het voorstel blijft in de database |
| HTML en sitemap | van de generator van Release 1; het platform raakt ze niet aan |
| naar `main` pushen | onmogelijk gemaakt: de branchnaam begint altijd met `publicatie/` |
| vuile werkboom | breekt de publicatie af, zodat andermans werk niet meekomt |
| mislukte nacontrole | `draaiTerug()`; een mislukte deploy blijft nooit 'gepubliceerd' |

### Toeleveringsketen

| | |
|---|---|
| runtime-dependencies | **twee**: `express` en `pg` |
| `npm audit --audit-level=high` | 0 bevindingen, en blokkeert in CI |
| lockfile | `npm ci`, en CI faalt als de lockfile wijzigt |
| buildstap | geen — Node 24 leest TypeScript direct, dus geen bundler in de keten |

Twee dependencies is zelf een beveiligingsmaatregel: er is bijna geen
toeleveringsketen om te compromitteren.

### CI en tokens

| | |
|---|---|
| `permissions` | `contents: read` |
| `pull_request_target` | **niet gebruikt** — dat zou forkcode met schrijfrechten laten draaien |
| productiecredentials in CI | geen; de database is een wegwerpcontainer |
| netwerk in CI | uit (`INTEL_NETWERK_TOEGESTAAN=0`) |
| `gh`-token | scopes `gist, read:org, repo, workflow` — **geen admin** |

Dat laatste is relevant voor §9: branch protection instellen kan niet
met dit token, en mag ook niet zonder autorisatie. De aanbeveling staat
in de activeringsaanvraag.

---

## 3. Wat deze review NIET heeft kunnen vaststellen

Een review die dit weglaat suggereert een dekking die er niet is.

| onderwerp | waarom niet |
|---|---|
| gedrag in de productieomgeving | niets is uitgerold; alles is lokaal gemeten |
| TLS-configuratie in productie | er is geen productieservice |
| gedrag van de reverse proxy | Railway termineert TLS, maar dat is niet geverifieerd omdat de service niet bestaat |
| de analyticsadapters | NIET AANGESLOTEN; de workload-identityvariant is nog niet geschreven |
| de GitHub-PR-route end-to-end | getoetst tegen een lokale bare remote, niet tegen GitHub |
| een echte modelaanroep | de allowlist is leeg; alleen `GET /v1/models` is gedaan |
| penetratietest | niet uitgevoerd en niet gevraagd |
| gedrag onder gelijktijdige last | niet gemeten; de wachtrij is wel op twee gelijktijdige workers getoetst |

---

## 4. Openstaande beveiligingspunten

| # | punt | ernst | wie |
|---|---|---|---|
| 1 | `data/`, `scripts/` en `docs/` zijn publiek opvraagbaar via de staticfile-host. `robots.txt` sluit ze van crawlen uit maar niet van ophalen. Er staat niets geheims in, maar wel de volledige bouwinvoer. | laag, bekend | eigenaar — vraagt een wijziging in de deployconfiguratie van Release 1 |
| 2 | Snelheidsbegrenzer in procesgeheugen; bij meer dan één instantie per instantie. | laag bij 1 replica | bij opschalen |
| 3 | Branch protection op `main` staat niet aan. Een push naar `main` is een productiedeploy. | **middel** | eigenaar; token mist admin-scope |
| 4 | Geen meldkanaal voor beveiligingsgebeurtenissen. De monitor ziet accountblokkades, maar niemand wordt gewekt. | middel | eigenaar — één bestemming |
| 5 | Twee kapotte assetreferenties in `vibe/chrome.js` staan live (CASE MISMATCH op de logo-SVG's). Geen beveiligingsprobleem, wel een bestaand defect op de gedeployde commit. | laag | eigenaar; Release 1-gebied |

---

## 5. Eindoordeel

Voor de **lokale, geïntegreerde** staat van het platform: de
beveiligingsmaatregelen zijn aanwezig, afgedwongen op de laag waar ze
horen (database waar het kan, applicatie waar het moet) en
**getoetst op hun faalgeval** in plaats van op hun gelukkige pad.

Twee ernstige defecten zijn in deze review gevonden en gerepareerd. Dat
beide door een nieuwe toets zijn gevonden en niet door inspectie, is het
argument om die toetsen in CI te houden.

Voor **productie** is er geen oordeel mogelijk: er is geen
productieomgeving. Punt 3 uit §4 is het enige dat ik als blokkerend
beschouw voor het moment dat er wél naar `main` gepusht gaat worden.
