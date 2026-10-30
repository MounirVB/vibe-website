# Nieuws R3 — documentclassificatie en claimmodaliteit

Vertrekpunt `dc9b8cc`. Eén migratie (0042, puur toevoegend), vier nieuwe
modules, vier nieuwe testbestanden. De SEO-generator, het publicatiecontract
en het rechtenmodel zijn niet aangeraakt.

## 1. De hoofdoorzaak, gemeten

De bewijskracht van elke claim kwam van de **uitgever** en niet van het
**document**. In `src/pijplijn/uitspraken.ts` stond het op twee regels:

```ts
magBevestigen    = invoer.isPrimaireBron && invoer.betrouwbaarheid >= 4
bewijs_kwaliteit = min(5, max(1, invoer.betrouwbaarheid))
```

Beide getallen staan in `intel.bronnen` en horen bij de partij.
`netbeheer-nederland-nieuws` staat daar met `betrouwbaarheid 5` en
`is_primaire_bron true`. Gemeten in productie op 30 oktober 2026:

| bron | claims | bevestigd | max bk | gem. bk |
|---|---|---|---|---|
| **netbeheer-nederland-nieuws** | **45** | **45** | **5** | **5,0** |
| rvo-opendata-artikelen | 5 | 5 | 5 | 5,0 |
| tenderned-publicaties | 1 | 1 | 5 | 5,0 |
| solar365 | 3 | 0 | 3 | 3,0 |
| installatie-nl | 2 | 0 | 3 | 3,0 |
| warmte365 | 2 | 0 | 3 | 3,0 |
| energy-storage-nl | 1 | 0 | 4 | 4,0 |

**45 van de 51 bevestigde claims in het hele platform kwamen uit één
branchevereniging, alle met de hoogste bewijskracht die het systeem kent.**
En de documenten eronder zijn niet van één soort. Drie uit precies die 45:

| document | wat het werkelijk is |
|---|---|
| *ACM stelt de nettarieven voor 2026 vast* | een branchevereniging die een besluit van de **toezichthouder** navertelt |
| *Bouw versnelt opnieuw, maar de vraag loopt nog steeds op* | eigen wachtlijstcijfers, waarvan zij wél de bron zijn |
| *Inbreng voor het eerste debat Netcongestie van de nieuwe Kamer* | een **lobbydocument** |

De claim die uit dat laatste document kwam, bevestigd en met bewijskracht 5:

> *"Schaal daarom de bestaande Flex-E-regeling op naar een Flex-E regeling XL
> van structureel €125 miljoen per jaar (2027–2030)."*

Een verzoek aan de Tweede Kamer, opgeslagen als vastgesteld feit. Een artikel
dat daarop bouwt publiceert een lobbywens als beleid.

## 2. Architectuurkeuzes

### Twee assen in plaats van één

`documentsoort` × `gezag` bepaalt nu het **plafond** voor
`bewijs_kwaliteit`, en of een document op eigen kracht een claim mag
bevestigen. Een plafond en geen waarde: de betrouwbaarheid van de bron blijft
gelden en kan alleen verlaagd worden. Een uitgever die om een andere reden op
3 staat, komt niet door een mooie documentsoort op 5.

### Puur, deterministisch, zonder taalmodel

`documentsoort.ts` en `claimmodaliteit.ts` kennen geen database, geen netwerk
en geen model. Dat is een eis, geen zuinigheid: een classificatie die van een
modelaanroep afhangt is niet reproduceerbaar, niet uitlegbaar in een audit, en
in de productiecontainer bovendien dood — `OPENAI_API_KEY` staat daar niet.
Een eenheidstoets eist dat dezelfde invoer dezelfde uitslag geeft.

### Per versie, niet per document

De classificatie hangt aan `brondocument_versies` en niet aan
`brondocumenten`. De tekst kan tussen versies veranderen en dan verandert de
soort mee; `intel.uitspraak_bronnen` verwijst al naar `versie_id`, dus het
oordeel hangt aan precies het stuk tekst waarop een claim rust.

### Hergebruik, geen tweede motor

Geen tweede nieuwsengine, geen tweede bronregister, geen parallelle workflow.
De classificatie hangt in de bestaande `clusterNieuweVersies()`; de modaliteit
in de bestaande `schrijfUitspraken()`; de poorten in de bestaande
`beoordeelNieuwswaarde()`; het concept in de bestaande `bouwConcept()`; de
keten in de bestaande studio-pagina. Het gezag komt uit het bestaande
`bronnen/register.ts`.

## 3. De tien soorten en hun plafond

| # | soort | bevoegd gezag | netbeheerder | statistiek | belangen&shy;behartiger | markt |
|---|---|---|---|---|---|---|
| 1 | `OFFICIEEL_BESLUIT` | **5** | — | — | — | — |
| 2 | `OFFICIELE_REGELGEVING` | **5** | — | — | — | — |
| 3 | `FEITELIJKE_MEDEDELING` | 4 | 4 | **5** | 3 | 2 |
| 4 | `ONDERZOEKSRAPPORT` | 4 | 4 | **5** | 3 | 3 |
| 5 | `SECTORANALYSE` | 3 | 3 | 3 | 2 | 2 |
| 6 | `PERSBERICHT` | 3 | 3 | 3 | 2 | 2 |
| 7 | `OPINIE` | 1 | 1 | 1 | 1 | 1 |
| 8 | `LOBBYDOCUMENT` | 1 | 1 | 1 | 1 | 1 |
| 9 | `SECUNDAIRE_BERICHTGEVING` | 2 | 2 | 2 | 2 | 1 |
| 10 | `ONVOLDOENDE_VERIFIEERBAAR` | 1 | 1 | 1 | 1 | 1 |

Een streep betekent *onbereikbaar*, niet *laag*.

## 4. De veiligheidsregel: tekst kan alleen verlagen

De opdracht eist dat een branchevereniging nooit automatisch de status van een
toezichthouder, ministerie, wetgever of netbeheerder krijgt. Dat is hier geen
controle achteraf maar een eigenschap van de constructie:

- de twee zwaarste soorten zijn alleen bereikbaar bij `BEVOEGD_GEZAG`, en dat
  gezag komt uit **code die door een review gaat** — niet uit de brontekst en
  niet uit een kolom die in productie te wijzigen is;
- lobby- en opiniesignalen worden **vóór** de besluitsignalen getoetst, dus
  ook een ministerie dat een pleidooi publiceert krijgt bewijskracht 1;
- een onbekende uitgeverssoort én een onbekende bronsleutel vallen naar het
  **laagste** gezag. "Ik weet de bevoegdheid niet" mag geen "bevoegd" worden;
- een tweede, expliciete eindcontrole in `uitslag()` zet een onbereikbare
  soort alsnog terug, zodat een latere wijziging in de signaallogica de regel
  niet stil kan omzeilen.

`test/adversarieel/documentsoort-manipulatie.test.ts` probeert dat te breken
met **96 pogingen**: twaalf aanvalsteksten × acht niet-bevoegde
uitgeverssoorten. Daaronder een verzonnen ACM-kenmerk, een nagebootste
Staatscourant-verwijzing, een `SYSTEM:`-regel die de soort dicteert, een
instructie aan de lezer, en dezelfde tekst in het Engels. Alle 96 blijven
buiten de vaststellende soorten.

## 5. Claimmodaliteit

`intel.uitspraken` kende `soort` en `verificatie_status`, maar niet of een zin
iets **vaststelt**, **voorstelt** of **verwacht**. Dat is per claim nodig en
niet per document: ook in een besluit van de minister staan voorstellen naast
vaststellingen.

Drie waarden plus een zekerheid. Een zin zonder enig signaal krijgt
`VASTGESTELD` met zekerheid **0,35** en is daarmee **niet draagbaar** — de
veilige kant is hier niet "vastgesteld".

**Zelfcorrectie, gevonden op de 59 productieclaims.** De eerste versie zette
`ongeveer` bij de verwachtingssignalen. Gevolg:

> *"Netbeheerders hebben vorig jaar ongeveer 8% van de aanvragen van de
> wachtlijst kunnen honoreren."* → `VERWACHTING`

Dat is een gemeten jaarcijfer, afgerond opgeschreven. Het praktische gevolg
was toevallig goed, maar het **label loog**, en een redacteur die
"verwachting" leest bij een jaarcijfer zoekt de verkeerde kant op. Een
afronding verlaagt nu de zekerheid en laat de modaliteit staan.

## 6. Primaire-bronverificatie

Een navertelling draagt geen eigen bewijs. `bronverificatie.ts` zoekt het
origineel binnen de **eigen** documentverzameling, bij een bron die het gezag
van dat besluit is, en koppelt op `waarde_numeriek` + `eenheid` — niet op
woordovereenkomst, want dat zou precies de bevestiging opleveren die R3
verwijdert.

**Geen netwerkaanroep**, om drie redenen: de collector heeft al een robots- en
TDM-discipline die een losse fetch omzeilt; een derde partij maakt de uitslag
dagafhankelijk (gemeten 29 oktober: tenderned gaf 503 op zijn `robots.txt` en
de ophaling werd terecht geweigerd); en de uitslag moet reproduceerbaar zijn.

De uitslag is daarom scherper dan *het besluit bestaat*: hij is **TERUGGEVONDEN**
of **NIET_TERUGGEVONDEN**, en dat laatste is geen bewering dat het besluit niet
bestaat.

## 7. R2.1 versus R3 — gemeten op 202 productiegebeurtenissen

Een niet-muterende simulatie met de echte documenten, claims en gebeurtenissen.

| | A · R2.1 | B · R3 classificatie | C · R3 + bronverificatie |
|---|---|---|---|
| beoordeeld | 202 | 202 | 202 |
| **geschikt** | **1** | **1** | **1** |
| afgewezen | 201 | 201 | 201 |
| score van de kandidaat | 71 | 70 | 70 |

**R3 levert niet méér kandidaten. Dat is de uitkomst, en het is de goede.**
De opdracht zegt het zelf: *"Doel is niet om zoveel mogelijk kandidaten goed te
keuren."* Wat er verandert is de **basis** waarop die ene kandidaat staat, en
wat er met de andere 201 gebeurt:

| bindende grond | A | B |
|---|---|---|
| geen bevestigde uitspraak | 54 | **68** (+14) |
| materialiteit onder de drempel | 62 | 62 |
| `geen dragende bronsoort` | **14** | **0** |
| geen dragende claim (nieuw) | — | 1 |
| overige gronden | ongewijzigd | ongewijzigd |

De 14 gebeurtenissen die in A tot aan de bronsoortpoort kwamen, falen in B
eerder en op de eerlijke grond: er is geen bevestigde uitspraak. Ze kwamen zo
ver omdat hun claims op uitgeversbetrouwbaarheid waren bevestigd.

**Effect op de 59 bestaande claims:** 46 van de 51 bevestigde claims verliezen
hun bevestiging. De 5 die blijven komen alle van `rvo-opendata-artikelen`
(rijksoverheid, bevoegd gezag) — en daaronder zit de claim áchter de bestaande
kandidaat: *"Zij kunnen van 27 oktober tot 26 november 2026 een aanvraag
indienen bij de Rijksdienst voor Ondernemend Nederland."*

**Scenario C voegt niets toe, en dat is informatie.** `acm-besluiten` bevat
één tariefgerelateerd document (*Beslissingen op bezwaren tegen
tariefbeschikkingen Bonaire 2026*) en geen Nederlands 2027-tariefbesluit. De
Netbeheer Nederland-tariefclaims zijn dus niet te schragen — niet omdat de
verificatie niet werkt, maar omdat het origineel niet in de verzameling zit.
**Dat is een concrete, aanwijsbare dekkingsopdracht voor de ACM-bron.**

## 8. Terecht afgewezen documenten — voorbeelden uit productie

| document | soort | bk | bevestigt |
|---|---|---|---|
| *Inbreng voor debat Klimaatbeleid gebouwde omgeving* | `LOBBYDOCUMENT` | 5 → **1** | ja → **nee** |
| *Netwerkbedrijven roepen gemeenten op duidelijke keuzes te maken* | `LOBBYDOCUMENT` | 5 → **1** | ja → **nee** |
| *Netbeheerders op koers met betere benutting van het elektriciteitsnet* | `SECUNDAIRE_BERICHTGEVING` (besluit van ACM) | 5 → **2** | ja → **nee** |
| *Nettarieven 2027 stijgen maar slimme keuzes kunnen stijging remmen* | `SECUNDAIRE_BERICHTGEVING` (besluit van ACM) | 5 → **2** | ja → **nee** |
| *Nieuw rapport: groen gas vooral van waarde voor gebouwde omgeving* | `SECTORANALYSE` | 5 → **2** | ja → **nee** |
| *Aanvraagperiode subsidieregeling* (RVO) | `FEITELIJKE_MEDEDELING` | 5 → **4** | **ja → ja** |

De verdeling over alle 3.483 productiedocumentversies:
`ONVOLDOENDE_VERIFIEERBAAR` 1.809, `FEITELIJKE_MEDEDELING` 1.522,
`SECUNDAIRE_BERICHTGEVING` 103, `SECTORANALYSE` 21, `LOBBYDOCUMENT` 20,
`PERSBERICHT` 4, `ONDERZOEKSRAPPORT` 3, `OPINIE` 1.

De 1.809 onverifieerbare zijn sitemap- en catalogusregels: **1.760 hebben
minder dan 20 tekens body** en geen van de 1.809 levert ook maar één claim op.

**Zelfcorrectie op de ondergrens.** Die stond eerst op 120 tekens en liet een
korte maar echte bekendmaking vallen (*"De subsidieregeling wordt verlengd met
een plafond van 90 MW per 1 juli 2027."* — 76 tekens, drie claims). De gemeten
verdeling:

| bodylengte | documenten | met claims |
|---|---|---|
| < 20 | 1.760 | 0 |
| 20–39 | 2 | 0 |
| 40–79 | 12 | 0 |
| 80–119 | 35 | 0 |
| ≥ 120 | 1.674 | 26 |

De grens ligt nu op 40. De oude grens sloot 47 documenten uit op een
eigenschap die niets met verifieerbaarheid te maken had.

## 9. Redactionele nieuwsproductie

`bouwConcept()` scheidt nu wat vaststaat van wat gevraagd of verwacht wordt.
Een bevestigde claim met een getal kwam eerder altijd onder *Wat er is
vastgelegd*; de Flex-E-claim zou daar als **"125000000 EUR — vastgelegd door
Netbeheer Nederland"** zijn beland, onder een kop die zegt dat het vastligt.

Nu gaat een niet-draagbare claim naar een eigen sectie — hij **verdwijnt niet**,
dat zou de redacteur informatie onthouden:

> ## Wat is voorgesteld of verwacht
> *De onderstaande cijfers staan NIET vast. Ze komen uit een voorstel, een
> verwachting of een bronzin waarvan de strekking niet eenduidig is.*
> - **125000000 EUR** — VOORSTEL — nog niet vastgesteld. Genoemd door Netbeheer Nederland.

De bronnenlijst draagt de documentsoort, en bij een navertelling of het
origineel is teruggevonden:

```
- RVO, 2026-10-30 [FEITELIJKE_MEDEDELING] — <https://www.rvo.nl/subsidies/sde-2026>
```

## 10. Redactioneel dashboard

De studio-pagina toont de keten **bron → document → claim → verificatie** met
negen kolommen: rol (met `draagt`-vlag), waarde, status, kwaliteit, modaliteit,
documentsoort (met *besluit van X* en of het origineel is teruggevonden),
gezag, bron (met de grondslag uitklapbaar) en datum. Daaronder één regel:
*Claims die dragen: N van M*.

Browsertoets 18b bewijst dat in een echte browser, met twee claims uit
hetzelfde document: `OFFICIEEL_BESLUIT`, `vastgesteld 0.80`,
`voorstel — geen feit`, en `Claims die dragen: 1 van 2`.

## 11. Eindproef op de echte kandidaat

`test/integratie/r3-eindproef-sdepp.test.ts` haalt
*Ondernemers krijgen in 2026 meer tijd voor subsidieaanvraag SDE++* door de
hele keten, in een wegwerpdatabase — want `maakConcept()` **schrijft** een
inhoudsversie en dat is een redactionele mutatie die niemand heeft gevraagd.

Negen stappen, alle groen: classificatie → bevoegd gezag; claim bevestigd,
vastgesteld, draagt; selectie levert NEWS_ITEM; concept met SEO-velden en
interne links; status `ter_review`; goedkeuren zonder recht **geweigerd**; de
maker kan zijn eigen concept **niet** goedkeuren; met recht én tweede paar ogen
wél; en daarna **nul** publicaties.

De preview is eerlijk over zijn grens. De RVO-claim is van het soort `datum`
zonder numerieke waarde, en de semantieklaag maakt daar geen verwoordbare vorm
van. Het concept zegt dat dan ook:

> **TE VERWOORDEN DOOR DE REDACTIE.** … Dit bericht is niet publiceerbaar
> zolang dat niet gebeurd is.

Dat is precies wat §9 van de opdracht vraagt: niet forceren.

## 12. Beveiliging — onaangeroerd

Rechtencontrole, vier-ogenregel, hoogrisicorechten, controle van de
inhoudsafdruk, bronverificatie, promptinjectiebescherming, publicatiecontract
en auditlogging zijn alle ongewijzigd. `src/inhoud/publiceer.ts`,
`src/inhoud/beoordeling.ts`, `src/site/nieuwsregister.ts` en
`scripts/seo/bouw-routes.mjs` staan niet in de diff.

Promptinjectie blijft werken en wordt door R3 **versterkt**: een
`injectie_verdacht`-versie wordt altijd `ONVOLDOENDE_VERIFIEERBAAR` met
bewijskracht 1, ongeacht de tekst. Twaalf aanvalsteksten bewijzen dat.

### De operationele situatie met twee gebruikers

Gemeten: `beheer@vibeenergy.nl` (beheerder) en `redactie@vibeenergy.nl`
(redacteur). `inhoud.hoogrisico.goedkeuren` zit **alleen** op `beheerder`.
Gevolg: hoogrisico-inhoud die de beheerder zelf aanmaakt of als laatste
bewerkt, kan door **niemand** worden goedgekeurd — de vierogenregel sluit de
maker uit en de redacteur mist het hoogrisicorecht.

Dat is de regel die werkt, geen defect. **Geen wijziging aan het rechtenmodel
in deze PR.** De veilige organisatorische oplossing, ter besluit:

1. **Een tweede beheerder** (voorkeur). Eén extra account met de rol
   `beheerder` heft de blokkade op zonder één regel code of beleid te wijzigen.
   Vier ogen blijft volledig intact, en het is omkeerbaar.
2. Een rol `hoofdredacteur` die `inhoud.goedkeuren` +
   `inhoud.hoogrisico.goedkeuren` draagt maar géén `gebruiker.beheren` of
   `beleid.beheren`. Scheidt redactionele van technische bevoegdheid, maar
   vraagt een wijziging in `intel.rol_rechten`.
3. Afspreken dat de beheerder geen hoogrisico-inhoud aanmaakt of bewerkt.
   Werkt, maar hangt op discipline in plaats van op een grendel — en is daarmee
   de zwakste van de drie.

## 13. Database en migraties

`0042_documentsoort_en_claimmodaliteit.sql`, puur toevoegend:

- `brondocument_versies`: `documentsoort`, `documentsoort_gezag`,
  `documentsoort_grondslag`, `documentsoort_versie`,
  `documentsoort_onzekerheid`, `beschrijft_besluit_van` + één partiële index;
- `uitspraken`: `modaliteit`, `modaliteit_zekerheid`, `modaliteit_versie`,
  `modaliteit_grondslag`, `bewijskracht_plafond`, `primaire_bron_bevestigd` +
  één partiële index.

| eigenschap | uitkomst |
|---|---|
| DML-statements | **0** |
| destructieve DDL | **0** |
| `set not null` | 0 |
| nullable | alles, behalve twee kolommen met een default (`{}`, `false`) |
| RLS | 49 van 58 tabellen, **ongewijzigd** |
| invariantbevindingen na toepassing | **0** |
| migratiedrift | **0** |
| migraties totaal | 41 → 42 |

`NULL` betekent *nog niet beoordeeld* en nooit een waarde — dezelfde keuze als
bij `uitspraken.toepassingsgebied` in 0038. Een default zou 3.483
documentversies en 59 claims een oordeel geven dat niemand heeft gevormd.

**Rollback.** Terugdraaien vraagt geen databaseactie: de kolommen zijn nullable
en worden alleen gelezen door code die met deze release meekomt. Een revert van
de code laat ze ongebruikt achter. Wie ze echt weg wil doet een eigen migratie
met `drop column`; dat is een eigen besluit en geen onderdeel van een
terugdraaiing.

**Let op:** de `preDeployCommand` op `vibe-intel-api` draait
`npm run migreer && npm run zaai && npm run geo`. Een merge naar main is dus
tevens de productiemigratie.

## 14. Testresultaten

| poort | uitslag |
|---|---|
| `tsc --noEmit` | PASS |
| intelligence-tests | **1040/1040** (basislijn main 987 — **+53**, nul gebroken) |
| eenheid / integratie / adversarieel | 595 / 355 / 90 |
| browser-QA (echte chromium) | **27/27** (was 26 — +1) |
| `npm run poort` | PASS |
| migratiepoort | PASS |
| `migreer -- --status` | openstaand 0, **drift 0** |
| RLS + invarianten (wegwerpdatabase) | 49/58, 0 bevindingen |
| `scripts/seo/bouw.mjs --offline` | PASS |
| bouw 18 maanden vooruit | byte-identiek |
| generator reproduceerbaar | `git status` buiten `intelligence/` leeg |
| `qa-lastmod` / `qa-nieuws` / `qa-assets` | PASS |
| `qa-vijandig` | PASS — 17/17 scenario's |
| `publiek-artefact` | PASS |
| `geheimenscan` | PASS |
| `publicatiecontract` | PASS |
| `npm audit` | 0 kwetsbaarheden |
| 431 / 17 / 431 | INDEX 431, NOINDEX 17, sitemap 431, grootboek 431 — pariteit gelijk |

De 53 nieuwe toetsen gebruiken **echte productietekst**: de vier titels in de
eenheidstoets, de Flex-E-claim, de ACM-navertelling en de RVO-bekendmaking
komen uit `intel.brondocumenten`. Een zelfbedachte zin bevestigt alleen het
patroon dat je er zelf in hebt gezet.

## 15. Resterende risico's

1. **De signalen zijn Nederlands en regexgebaseerd.** Een lobbydocument dat
   geen van de vijf lobbyformuleringen gebruikt, valt in
   `FEITELIJKE_MEDEDELING`. Beperkt door het plafond: bij een
   belangenbehartiger is dat 3, dus het bevestigt nog steeds niets. De
   schadekant is *te laag classificeren*, niet te hoog.
2. **`ONVOLDOENDE_VERIFIEERBAAR` is 52% van de documenten.** Correct voor
   sitemapregels, maar het betekent ook dat de classificatie over de helft van
   de verzameling niets zinvols zegt. Een rijkere ophaling van die bronnen zou
   dat veranderen — dat is een collectoropdracht, niet een classificatieopdracht.
3. **De corroboratie vindt vandaag niets.** Zie §7. Vraagt bredere
   ACM-dekking.
4. **Herclassificatie raakt bestaande claims niet.** `documentclassificatie`
   schrijft alleen op `brondocument_versies`. Een claim die op de oude regels
   is bevestigd blijft bevestigd tot de pijplijn hem opnieuw langs ziet komen.
   Dat is bewust — stil de geschiedenis herschrijven is erger dan een oordeel
   dat een ronde achterloopt — maar het betekent dat de **46 bestaande
   onterecht bevestigde claims in productie onterecht bevestigd blijven** tot
   een herverwerking. Dat is een eigen besluit met een eigen opdracht.
5. **Het gezagregister is een handmatige kaart.** `GEZAG_UIT_UITGEVER` en
   `BRONNEN_VAN_GEZAG` staan in code en gaan door een review. Een verkeerde
   regel daar is een echte fout; de tweede eis in `bronnenVanGezag()` (de bron
   moet óók `BEVOEGD_GEZAG` zijn) dempt dat, maar heft het niet op.

---

# R3 — definitieve acceptatie

Toegevoegd na de acceptatieronde van 30 oktober 2026. Drie commits boven
`633862f`: historische claimbeveiliging, het herverwerkingsmechanisme, en
de verificatiecorrecties.

## 16. De twee pull requests, en hun overlap

| | PR #54 | PR #55 |
|---|---|---|
| titel | de observatiepunten in het rollbackplan | Nieuws R3 |
| branch | `fix/r21-verwijzing-naar-werkelijke-observatiepunten` | `feat/nieuws-r3-documentclassificatie` |
| head | `e40a588b563711b6855f1365ed09acad421ad3b4` | zie §24 |
| merge-base | `dc9b8cc` | `dc9b8cc` |
| omvang | 2 bestanden, +42/−7 | zie §24 |

**Beide raken `intelligence/src/kern/taken.ts`** — #54 het commentaar op
regel 439-440, #55 de taakhandlers. Beide mergeordes zijn getest in een
losse worktree en **conflictvrij**; in beide uitkomsten blijft de
correctie staan (nul foute verwijzingen) en is de R3-taak aanwezig. De
twee blijven dus afzonderlijk beoordeelbaar en in willekeurige orde
mergebaar.

## 17. De historische claims — gemeten, niet aangenomen

Read-only over de volledige productiedataset op 30 oktober 2026, met de
R3-regels toegepast:

| | |
|---|---|
| claims in `intel.uitspraken` | **59** |
| oorspronkelijk bevestigd | **51** |
| oorspronkelijk ongeverifieerd | 8 |
| opnieuw beoordeeld | 59 (alle) |
| bevestiging **behouden** | **5** |
| bevestiging **ingetrokken** | **46** |
| bewijskracht verlaagd | **59** |
| claims zonder brongegevens | **0** |
| getroffen gebeurtenissen | **18** |

De 46 is dus exact bevestigd, en de populatie is volledig: er zijn geen
andere historische claims door dezelfde fout geraakt, want **alle** 59
krijgen een lagere bewijskracht en alle 51 bevestigde zijn gewogen.

Per documentsoort × gezag:

| soort / gezag | claims | was bevestigd | ingetrokken |
|---|---|---|---|
| `SECUNDAIRE_BERICHTGEVING` / BELANGENBEHARTIGER | 25 | 25 | **25** |
| `FEITELIJKE_MEDEDELING` / BELANGENBEHARTIGER | 11 | 11 | **11** |
| `FEITELIJKE_MEDEDELING` / MARKT | 6 | 1 | 1 |
| `LOBBYDOCUMENT` / BELANGENBEHARTIGER | 5 | 5 | **5** |
| `FEITELIJKE_MEDEDELING` / BEVOEGD_GEZAG | 5 | 5 | **0** |
| `PERSBERICHT` / BELANGENBEHARTIGER | 4 | 4 | **4** |
| `SECUNDAIRE_BERICHTGEVING` / MARKT | 2 | 0 | 0 |
| `SECTORANALYSE` / BELANGENBEHARTIGER | 1 | 0 | 0 |

Per bron:

| bron | claims | was bevestigd | ingetrokken | bewijskracht |
|---|---|---|---|---|
| `netbeheer-nederland-nieuws` | 45 | 45 | **45** | 5→1, 5→2, 5→3 |
| `rvo-opendata-artikelen` | 5 | 5 | **0** | 5→4 |
| `tenderned-publicaties` | 1 | 1 | **1** | 5→2 |
| `solar365` | 3 | 0 | 0 | 3→1, 3→2 |
| `installatie-nl` / `warmte365` | 4 | 0 | 0 | 3→2 |
| `energy-storage-nl` | 1 | 0 | 0 | 4→2 |

De vijf behouden bevestigingen zijn alle van RVO — bevoegd gezag — en
**alle vijf dragen** na de modaliteitscorrectie uit §21. Daaronder de
claim achter de bestaande kandidaat g30.

**Impact op de keten, gemeten:** `inhoud_versies` **0**,
`inhoud_uitspraken` **0**, `publicaties` **0**, `publicatiebesluiten`
**0**. Er bestaat in productie geen enkel concept, dus geen onterecht
bevestigde claim heeft ooit een concept of een publicatie bereikt. De
impact is volledig beperkt tot de kandidaat- en scorelaag.

## 18. Het herverwerkingsmechanisme

De tien eisen uit sectie 4, en waar ze zitten:

| eis | hoe |
|---|---|
| 1 geen verlies van broninformatie | `brondocumenten` en `brondocument_versies` worden niet aangeraakt |
| 2 geen verlies van auditgeschiedenis | één rij per wijziging in `intel.audit_gebeurtenissen`, append-only sinds 0001 |
| 3 geen overschrijving van menselijke beoordelingen | `oordeel_bron = 'mens'` wordt niet eens geselecteerd |
| 4 reproduceerbaar | dezelfde pure functies, met de publicatiedatum als peildatum in plaats van de klok |
| 5 idempotent | selectie op motorversie; tweede en derde ronde zien **0** |
| 6 herleidbaar naar een classificatieversie | `modaliteit_versie`, `documentsoort_versie`, `bewijskracht_plafond`, `herbeoordeeld_op` |
| 7 koppelingen intact | geen `delete`; `uitspraak_bronnen`, `inhoud_uitspraken` en `gebeurtenis_documenten` onaangeroerd |
| 8 veilig hervatbaar | id-orde met een limiet; een afgebroken ronde laat af wat af is |
| 9 een halve ronde laat niets doorstromen | de claimpoort staat dicht zolang er iets openstaat — getoetst halverwege een ronde van `max 1` |
| 10 nieuw en historisch onder dezelfde regels | beide gaan door `bepaalModaliteit` en `bewijskrachtPlafond` |

**Geen tweede claimsysteem.** Twee nullable kolommen voor de herkomst en
drie voor de verificatiegrondslag; geen nieuwe tabel.

**De richting is eenzijdig, en dat is code.** De oude voorwaarde was
`isPrimaireBron && betrouwbaarheid >= 4`; de nieuwe is diezelfde
voorwaarde **plus** `magZelfBevestigen`. De nieuwe verzameling is een
deelverzameling van de oude, dus de verwerking kan een bevestiging
alleen intrekken. Een toets loopt alle vijftig combinaties van soort ×
gezag langs en eist dat geen enkele een bevestiging toekent.

## 19. Bewijs dat oude claims niet doorstromen

Een audit over elke laag die bevestigde claims verbruikt vond **31
plekken** die de oude waarde als waarheid behandelen, waarvan **9
blokkerend** omdat ze naar een publiceerbaar artefact leiden:

```
besluit/motor.ts     233  de enige bewijspoort is 'minstens één bevestigde claim'
                     251  de tak UPDATE_EXISTING kent geen bewijsdrempel
                     268  magNieuw hangt aan bewijs_kwaliteit >= 4, niet aan het plafond
                     368  uitspraken_bevestigd telt puur op verificatie_status
                     372  beste_bewijskwaliteit neemt max() zonder statusfilter
inhoud/concept.ts    189  splitsNaarModaliteit toetst gezag noch plafond
                     552  élke bevestigde claim wordt kernclaim
                    1011  hertoetsInhoudVersie haalt geen R3-veld op
inhoud/publiceer.ts  642  bronsoort uit de UITGEVER, niet uit de documentsoort
                     649  élke gebonden claim wordt een gepubliceerde claimregel
```

**De gekozen oplossing is niet tien filters maar één voorwaarde vooraf.**
Tien voorwaarden lopen uiteen, een elfde plek wordt vergeten, en
`and u.modaliteit is not null` in een subquery is voor een lezer niet te
onderscheiden van een optimalisatie. `eisHerbeoordeling()` staat nu voor
**beoordelen, nieuwsselectie, voorstel en conceptgeneratie** en gooit een
niet-herhaalbare `IntelFout` zolang de populatie gemengd is. Is de
herbeoordeling klaar, dan staat in de kolommen wat er hoort te staan en
is elke bestaande query vanzelf juist.

**Geen terugval.** Er is geen vlag die de poort overslaat en geen pad
terug naar de uitgeversbetrouwbaarheid. Een toets eist dat de foutregel
dat ook zegt.

Twee plekken zijn daarnaast direct gerepareerd omdat ze het artefact
raken en niet alleen het moment: `publiceer.ts` verlaagt de bronsoort van
het registerrecord naar `MARKTPARTIJ` zodra het document zelf niets
vaststelt (en ook als het ongeclassificeerd is), en laat niet-dragende
claimregels weg met een logregel die zegt waarom. `concept.ts` bindt
alleen dragende claims als **kernclaim**.

## 20. De primaire-bronverificatie

Zie de commitboodschap van `cbcd3e4` voor de acht bevindingen en hun
reparatie. Wat de koppeling nu eist staat in de kop van
`src/pijplijn/bronverificatie.ts`.

**21 adversariële regressietoetsen** in
`test/adversarieel/bronverificatie-grenzen.test.ts`, elk met een echte
database: de acht scenario's uit de opdracht plus de rol van de binding,
de afgeleide gezagkaart en de grondslag. Met een **positieve tegenproef**
bovenaan, want een toets die groen wordt doordat de koppeling niets meer
vindt bewijst niets.

`NIET_TERUGGEVONDEN` behoudt zijn betekenis: niet aangetroffen in de
beschikbare verzameling, **niet** bewezen afwezig. Dat staat in de
uitslag én in de grondslag.

## 21. De modaliteitscorrectie, en wat hij oplevert

Vier RVO-claims kwamen uit op zekerheid 0,20 en droegen niet. Na de
correctie uit `cbcd3e4` dragen **alle vijf** behouden bevestigingen.

Dat levert geen extra geschikte kandidaat op, en de reden is een
legitieme redactionele regel: gebeurtenis **g35** (*In 2025 ruim € 3
miljard aan milieu-investeringen met belastingvoordeel MIA\\Vamil*) heeft
nu **4 dragende claims en score 71**, en valt af op

> de nieuwste bron is 156 dagen oud, boven de grens van 120; dat is geen
> nieuws meer

De kandidaat is dus verschoven van *geblokkeerd door een detectorgat*
naar *geblokkeerd door een redactionele regel*, zonder dat één drempel
is verlaagd. Dat is precies wat sectie 6 van de R3-opdracht vraagt.

## 22. De read-only proefronde

Op een database gevuld met de **echte 59 productieclaims**, 26
documenten en 28 versies. De classificatieverdeling reproduceert de
productiemeting exact (27 / 22 / 5 / 4 / 1).

| | droge ronde | echte ronde |
|---|---|---|
| bekeken | 59 | 59 |
| herbeoordeeld | 59 | 59 |
| bevestiging behouden | 5 | 5 |
| bevestiging ingetrokken | **46** | **46** |
| bewijskracht verlaagd | 59 | 59 |
| claims zonder brongegevens | 0 | 0 |
| vraagt menselijke controle | 0 | 0 |
| wachtend ná de ronde | **59** (ongewijzigd) | **0** |
| auditregels | **0** | **59** |

De droge ronde laat de populatie aantoonbaar ongemoeid: het aantal
wachtende claims blijft 59 en er is geen auditregel.

**Primaire-bronverificatie** over de 27 navertellingen: **0
teruggevonden, 0 ambigu**, 13 niet teruggevonden, 14 niet van
toepassing. Dat is geen tekortkoming van de verificatie maar een
dekkingsopdracht: `acm-besluiten` bevat één tariefgerelateerd document
(*Beslissingen op bezwaren tegen tariefbeschikkingen Bonaire 2026*) en
geen Nederlands 2027-tariefbesluit.

**Eindstand van de claims:** 5 bevestigd met bewijskracht 4, 54
ongeverifieerd met bewijskracht 1–3.

*Onderscheid in de herkomst van deze cijfers.* De tellingen in §17 zijn
**gemeten productiegegevens** (read-only query's tegen de
productiedatabase, met de R3-functies lokaal toegepast). De tabel in deze
paragraaf komt uit een **lokale kopie** van die gegevens; bij het zaaien
zijn `onderwerp` en `soort` genormaliseerd, wat alleen de
bronverificatiekoppeling raakt en niet de classificatie. De A/B/C-tabel
in §7 is een **simulatie**: hij draait de echte beoordelingsfuncties over
de echte gegevens zonder iets te schrijven.

## 23. Gecontroleerde productievolgorde

Drie stappen die **niet** samen mogen vallen, met de reden per grens.

**A · Schemawijziging.** Merge van PR #55 draait via de
`preDeployCommand` op `vibe-intel-api` automatisch `npm run migreer`, dus
0042 en 0043 worden bij de merge toegepast. Beide zijn puur toevoegend:
0 DML, 0 destructieve DDL, alles nullable. Na deze stap draait de R3-code
en staat de **claimpoort dicht** — de besluitmotor, de nieuwsselectie, de
voorstellenlaag en de conceptgeneratie weigeren, met een
configuratiefout die zegt wat er moet gebeuren. Dat is de bedoeling: er
wordt niets besloten op een gemengde populatie.

*Stopvoorwaarde:* faalt de migratie of staat er drift, dan stoppen. Er is
geen datamutatie om terug te draaien.

**B · Historische herbeoordeling.** `npm run herbeoordeel -- --droog`
eerst, en de uitslag vergelijken met §22. Pas daarna zonder `--droog`,
desgewenst in porties met `--max`. Elke wijziging landt in het
append-only auditlogboek.

*Stopvoorwaarde:* wijkt de droge uitslag af van §22, dan stoppen en
rapporteren — dan is de populatie anders dan gemeten. Loopt de echte
ronde vast, dan is dat veilig: wat gedaan is blijft, en de claimpoort
houdt de rest buiten elke beslissing.

**C · Activering.** De poort gaat vanzelf open zodra het aantal
wachtende claims nul is. Daarna de pijplijn draaien en de uitslag van de
nieuwsselectie vergelijken met de verwachting: **1 geschikte kandidaat**
(g30). Pas daarna is R3 werkelijk actief.

*Waarom deze orde en geen andere.* B kan niet voor A, want hij heeft de
kolommen van 0042 en 0043 nodig. C kan niet voor B, want dan zou een
laag beslissen op een gemengde populatie — en precies dat houdt de
claimpoort tegen. A zonder B is een veilige tussentoestand waarin het
nieuwskanaal stilstaat; dat is aanvaardbaar en zichtbaar, en het is beter
dan een halve waarheid.

**Herstelmogelijkheden.** Na A: revert van de merge of een
Railway-rollback; geen databaseactie nodig. Na B: het auditlogboek draagt
per claim de voor- en nawaarde, dus een gerichte terugzetting is te
construeren — maar dat is een eigen besluit met een eigen opdracht, geen
automatisme. Na C: de pijplijn opnieuw draaien; er is tot een menselijke
goedkeuring niets gepubliceerd.

**Geen productieherverwerking uitgevoerd.** Migratie 0042 en 0043 staan
niet in productie (gemeten: 41 toegepast, 0 openstaand, 0 drift), er is
geen herbeoordeling gedraaid en er is geen artikel gepubliceerd.
