# Nieuws R2 — operationalisering van het nieuwskanaal

**Branch** `feat/nieuws-r2-operationalisering` · **basis** `b2de0c4` · **kop** `de16e87`
**6 commits · 26 bestanden (13 gewijzigd, 13 nieuw) · uitsluitend onder `intelligence/`**

> De telling stond hier eerst op *5 commits, 25 bestanden*. Dat was de stand
> vóórdat dit document zelf werd gecommitteerd; het is het 26e bestand en de
> zesde commit. De basis is nog steeds de kop van `main`, dus de branch is een
> zuivere fast-forward: 6 vooruit, 0 achter.

> GEEN MERGE. GEEN PRODUCTIEDEPLOYMENT. GEEN GEPUBLICEERD ARTIKEL.
> `data/inhoud/nieuws/` bestaat na deze branch nog niet; er is nul
> registerrecord geschreven en nul artikel goedgekeurd.

---

## De kern in één alinea

Het nieuwskanaal stond compleet — `weigerNieuws()`, de generator, poort 16, de
QA, de schrijvende adapter — en had nul artikelen. Dat is tot nu toe gelezen
als een uitgestelde redactionele keuze. Dat was het niet: **er was nooit iets
om goed te keuren.** Over 144 echte kandidaten uit 2.171 brondocumenten gaf de
besluitmotor NEW_ARTICLE **0** keer. De oorzaak is een structurele uitsluiting
tussen twee regels die elk afzonderlijk juist zijn, plus vijf defecten verderop
in de keten die elk afzonderlijk fataal waren.

## Wat er structureel misging

`besluit/motor.ts:252` — bezit een pagina de zoekintentie al, dan is het
UPDATE_EXISTING. `bouw-routes.mjs:460` (`weigerNieuws`) — een nieuwsartikel
**eist** een `onderwerp_eigenaar` die op INDEX staat.

Gemeten: 12 van de 15 clusters hebben een eigenaar → daar is NEW_ARTICLE
onbereikbaar. De 3 zonder eigenaar (`aanbesteding`, `statistiek`, `vergunning`)
staan niet in `CLUSTER_NAAR_ROUTE` → daar weigert `publiceerViaRegister()`.
**De twee verzamelingen zijn disjunct.**

Het contract lost dit zelf op, en het stond er al:

> "Een nieuwsartikel bezit NOOIT zelf een commerciële zoekintentie; het leent
> die van zijn eigenaar en linkt ernaartoe."
> — `data/seo/nieuws-architectuur.json`, `artikelschema.onderwerp_eigenaar`

Een nieuwsbericht *vereist* dus een eigenaar waar NEW_ARTICLE er geen mag
hebben. Spiegelbeelden, geen varianten. Daarom een eigen besluit `NEWS_ITEM`
(migratie 0041) met een eigen `motor_versie`, zodat de 19 bestaande
paginavoorstellen onaangeroerd blijven.

## De zes defecten in de keten

| # | Defect | Gemeten bewijs |
|---|---|---|
| A | `bouwConcept()` bouwde `/nieuws-<slug>` met koppelteken | `isNieuwsPad()` → `false`; `publiceer.ts:473` weigerde élk nieuw artikel |
| B | `injectieInBron: false` als constante in de poortaanroep | `motor.ts:374-378` leest hetzelfde feit wél uit `v.injectie_verdacht` |
| C | Een kernclaim moest een getal hebben | 17 van 53 bevestigde uitspraken hebben geen `waarde_numeriek` |
| D | `markdownNaarSecties()` leverde secties zonder `soort` | `sectieHtml()` doet `default: throw`; de sitebouw klapt ná INDEX-promotie |
| E | `oplossingLinks/kennisLinks/regioLinks` hard op `[]` | alle 7 inhoudsversies dragen `["/contact","/projecten"]`, weggegooid bij de naad |
| F | `keurGoed()` toetste geen recht; vier ogen werkte leeg | `rol_rechten` komt 0× voor in de publicerende laan; 7 rijen, 0 met `aangemaakt_door` |

Defect D is het gevaarlijkste: `weigerNieuws()` kijkt niet naar secties, dus het
artikel staat al op INDEX voordat de generator omvalt. `bouw.mjs` komt dan niet
verder dan stap 6 van 9 — sitemap en audit draaien niet meer.

Defect F is het ernstigste: er zijn **twee goedkeurlanen** met een ongelijk
beveiligingsniveau. `intel.inhoud_voorstellen` toetst het recht, de hashbinding
en de websiteversie — en **publiceert niets**. `intel.inhoud_versies` leidt tot
een bestand op schijf en een pull request — en had geen van die grendels.

## Wat deze branch NIET doet

- **Geen enkele publicatiepoort is versoepeld.** `weigerNieuws()` is niet
  aangeraakt; `toetsConcept()` houdt al zijn 16 poorten. De selectie weigert
  juist *vooraf* wat verderop toch zou stranden.
- **Geen artikel is goedgekeurd of gepubliceerd.** Het enige geschikte concept
  blokkeert op `hoog_risico_vereist_mens` — precies de bedoelde uitkomst.
- **Geen inactieve bron geactiveerd.** 29 bronnen / 20 actief, ongewijzigd.
- **Geen productiedata gemuteerd.** Alle metingen draaiden op de lokale
  ontwikkeldatabase en op wegwerpdatabases.
- **Geen nieuwe externe dienst.** Het weekrapport schrijft naar de
  structuurlogger, net als de bestaande `meting`-taak.

## Pariteit — gemeten voor en na

| Meting | b2de0c4 | de16e87 |
|---|---|---|
| INDEX-routes | 431 | **431** |
| NOINDEX-stubs | 17 | **17** |
| Sitemap-URL's | 431 | **431** |
| Bestanden buiten `intelligence/` gewijzigd | — | **0** |
| `data/inhoud/nieuws/` | bestaat niet | **bestaat niet** |
| `body-parser` / `qs` | 1.20.9 / 6.16.2 | **1.20.9 / 6.16.2** |

## Poorten

```
POORT (intelligence)              EINDOORDEEL = PASS
  TYPECHECK          PASS   tsc --noEmit, 0 fouten
  BRONREGISTER       PASS   29 bronnen, 20 actief, alle met gemeten toestemming
  MIGRATIES          PASS   41/41 toegepast, drift 0
  APPLICATIEROL      PASS   geen superuser, geen BYPASSRLS, geen eigenaar
  INVARIANTEN        PASS   0 bevindingen
  SITEKENNIS         PASS   431 gepubliceerde pagina's
  TESTS              PASS   551 + 333 + 83 = 967, 0 gefaald   (was 901)

BROWSER-QA           26/26  desktop en mobiel, 0 consolefouten   (was 14)
seo:poort            PASS
qa:nieuws            PASS   59/0
seo:vijandig         PASS   17/17 scenario's vingen hun defect
qa:assets            OK     1703 referenties, 0 kapot
publicatiecontract   PASS   10/0
migratiepoort        PASS
geheimenscan         PASS   geen credentialvormen
assetpoort           PASS   precies de verantwoorde basislijn
```

## Zes defecten in dit werk, gevonden door de eigen nieuwe toetsen

1. Ontdubbelen van interne links gebeurde op de *ruwe* string, dus `/contact`
   en `contact` kwamen beide door.
2. `2026-13-45` haalde de ISO-*vorm*controle terwijl die datum niet bestaat —
   en `weigerNieuws()` gebruikt dezelfde vormcontrole.
3. De conceptdetailpagina scrollde 127px horizontaal op 390px breed.
4. Het weekrapport telde `besluit = 'geweigerd'`, een waarde die de
   check-constraint niet kent → eeuwig stil `0`.
5. Drie verkeerde kolomnamen (`aangemaakt_op` waar het `gestart_op` of `op` is).
6. Twee keer een backtick in een SQL/CSS-commentaar binnen een template
   literal, wat de literal afsluit.

## Nieuwe commando's

```bash
npm run nieuws            # nieuwswaarde wegen, NEWS_ITEM-kandidaten schrijven
npm run nieuws -- --droog # alleen rekenen
npm run weekrapport       # de tien operationele cijfers van de afgelopen week
```

## Drie planregels erbij

| Soort | Cadans | Waarom |
|---|---|---|
| `nieuwsselectie` | uurlijks, ná `beoordelen` | leest de relevantie die `clusteren` zet |
| `indexatie` | dagelijks | zonder dagstand bestaat er geen trend |
| `weekrapport` | wekelijks, ma 06:00 UTC | een rapportage is voor een mens aan het begin van zijn week |

Publiceren staat **niet** in het plan. Een tijdslot is geen goedkeuring.

## Search Console — de autorisatiegrens, exact

**Niet aangesloten, en de ontbrekende stap is bekend.** Er is geen API-client:
`grep -rniE "searchconsole|googleapis|oauth|service_account|RS256"` over
`intelligence/` en `scripts/` geeft alleen commentaar, de VERBODEN-patronen in
een toets, en `ops/gcsopslag.ts` (dat is Cloud *Storage*). `package.json` heeft
als dependencies alleen `express` en `pg`.

De drie variabelen `INTEL_GSC_CLIENT_EMAIL`, `INTEL_GSC_PRIVATE_KEY` en
`INTEL_GSC_SITE_URL` bestaan en hebben **exact één** verwijzing: `config.ts:189`.
Het GCP-project staat op nul (0 service accounts; `run`, `searchconsole`,
`analyticsdata`, `secretmanager`, `artifactregistry` alle níet ingeschakeld).

**Wat er wél is gebouwd tot die grens:** de dagelijkse dagstand, de vergelijking
over 7/28/90 dagen en de segmentatie nieuws/kennis/commercieel — alle drie
credentialvrij. Gemeten eerste dagstand: 10 regels, 1 MEASURED, 1 INFERRED,
**8 NOT_AVAILABLE** met hun reden. Geen enkel indexatiecijfer is verzonnen.

**De exacte volgende stap:** een dienstaccount met `webmasters.readonly`, als
Cloud Run Job (Railway heeft geen OIDC-tokenendpoint, dus workload identity
federation kan daar niet). Het manifest ligt al in
`deploy/analytics-cloudrun-job.yaml`.

De volledige vereiste — property, scope, de twee lagen dienstaccountrechten,
de uitvoeromgeving en de volgorde van handelingen — staat in
**[`docs/R2-GSC-TOEGANG.md`](R2-GSC-TOEGANG.md)**. Daar staan ook twee gemeten
defecten in het bestaande manifest: `INTEL_GOOGLE_AUTH` wordt door geen enkele
regel code gelezen, en de job geeft een `--ingest`-vlag mee die de CLI niet
kent en dus stil negeert.

## Netbeheer Nederland — onderzocht, NIET geïntegreerd

Er is **geen** publicatiepoortuitzondering gemaakt.
`BRONSOORT_UIT_UITGEVER` is onaangeroerd: `branchevereniging` blijft
`MARKTPARTIJ`.

Gemeten wat een categorie `BRANCHEORGANISATIE` zou doen: de oogst gaat van
**2 naar 19** kandidaten met een dragende bron. Van de 17 die erbij komen zijn
er negen opinie, standpunt, lobby of eigen voorstel, één over consumenten, en
vier een *verslag van* een besluit van iemand anders — waaronder "ACM stelt de
nettarieven voor 2026 vast", precies het geval waarvoor het contract al zegt
"de primaire bron, niet een artikel dat erover schrijft".

De werkelijke conclusie: **de grens ligt niet bij de uitgever maar bij het
document.** Netbeheer Nederland is het samenwerkingsverband van álle
netbeheerders — bij een tariefvaststelling spreken ze namens hen, bij "Inbreng
voor het debat Netcongestie" zijn ze belangenbehartiger. Eén categorie per
uitgever kan dat onderscheid niet maken. De volledige afweging met drie opties
staat in **[`docs/R2-BRANCHEORGANISATIE.md`](R2-BRANCHEORGANISATIE.md)**.

## Resterende risico's

1. **De oogst is één kandidaat, niet tien.** Bindend: van de 20 gebeurtenissen
   die alle inhoudelijke drempels halen, dragen er **2** een dragende bronsoort
   langs de join die `publiceer()` gebruikt. Netbeheer Nederland staat als
   `branchevereniging` → MARKTPARTIJ. Dat is bewust conservatief en níet
   versoepeld; of die bron als NETBEHEERDER mag gelden is een eigenaarsbesluit.
2. **De semantieklaag dekt alleen numerieke claims.** 17 van 53 bevestigde
   uitspraken hebben geen `uitdrukking` en krijgen daarom nooit een
   `verwoorde_zin`. Het concept markeert dat nu expliciet voor de redactie in
   plaats van het te verzwijgen, maar de laag zelf uitbreiden is nieuw werk.
3. **`clusteren` haalt de wachtrij niet leeg.** 2.286 versies, een deel zonder
   herkend onderwerp blijft eeuwig kandidaat; de worker draait met `max 500`
   geordend op `gepubliceerd_op desc`.
4. **Geen retries met backoff op het data-endpoint.** `haalOp()` doet één fetch
   per redirecthop; `Retry-After` wordt niet gelezen en `Crawl-delay` uit
   robots.txt heeft geen lezer. De rem is drievoudig en werkt, maar is grover
   dan wat een uitgever vraagt.
5. **`poort 16` blijft FAIL zolang `vibe/chrome.js` de zichtbare `/nieuws`-link
   mist** — dat is bedoeld gedrag en een handmatige activeringsstap.

## Rollback

Deze branch is niet gemerged en niet gedeployed, dus er is niets terug te
draaien. Voor het geval hij later wél wordt gemerged:

- **Code:** `git revert de16e87 7e94497 3b4eb7a 70aa78e e92f7ff d6191b2` — alle zes
  commits zijn additief op `intelligence/` en raken geen sitebestand.
- **Database:** migratie 0041 is additief. De besluitcheck *verruimen*
  terugdraaien vraagt eerst `delete from intel.inhoud_kandidaten where besluit
  = 'NEWS_ITEM'`; de twee kolommen zijn nullable en kunnen blijven staan.
  Let op: een toegepaste migratie wijzig je nooit — een terugdraai is een
  nieuwe migratie.
- **Site:** geen enkel bestand buiten `intelligence/` is geraakt, dus de
  statische site heeft geen rollbackpad nodig.

## Eindoordeel

**GO voor review.** Alle poorten groen, pariteit bewezen, geen artikel
gepubliceerd of goedgekeurd. De twee openstaande eigenaarsbesluiten — de
bronsoort van Netbeheer Nederland en het GSC-dienstaccount — bepalen of de
oogst van één kandidaat naar tien kan groeien.
