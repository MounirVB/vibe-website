# Onderzoek: een eigen categorie BRANCHEORGANISATIE

**Status: ONDERZOCHT, NIET GEÏNTEGREERD.** Er is in deze release geen
publicatiepoortuitzondering gemaakt voor Netbeheer Nederland of voor enige
andere brancheorganisatie. `BRONSOORT_UIT_UITGEVER` in
`src/site/nieuwsregister.ts` is onaangeroerd: `branchevereniging` blijft
`MARKTPARTIJ`, en een marktpartij kan een nieuwsbericht niet alleen dragen.

Dit document draagt de meting en de afweging, zodat de eigenaar kan besluiten.

---

## Waarom deze vraag op tafel ligt

De oogst van R2 is **één** publiceerbare kandidaat. De bindende grond is niet
de inhoud en niet de techniek, maar de bronsoort: van de 20 gebeurtenissen die
alle inhoudelijke drempels halen (cluster, eigenaar op INDEX, bevestigde
uitspraak, bewijskwaliteit ≥ 4, geen tegenspraak) dragen er **2** een dragende
bronsoort langs de join die `publiceerViaRegister()` gebruikt.

Het contract laat vier soorten een bericht zelfstandig dragen: `WETGEVING`,
`TOEZICHTHOUDER`, `NETBEHEERDER`, `STATISTIEK`.

## De meting

Alleen-lezen gemeten op `de16e87` tegen de ontwikkeldatabase, met de echte
`bronOpSleutel()` uit het coderegister:

| | kandidaten |
|---|---|
| Haalbaar op alle inhoudelijke drempels | 20 |
| Met dragende bron **nu** | **2** |
| Met dragende bron **als `branchevereniging` zou dragen** | **19** |
| Winst, uitsluitend door die wijziging | **+17** |

Drie bronnen hebben `uitgeverSoort: "branchevereniging"`:
`netbeheer-nederland-nieuws` (actief), `energy-storage-nl` (actief),
`elaad-laadinfra` (inactief wegens TDM-voorbehoud).

Eén wijziging van één woord zou de oogst dus van 1 naar dubbele cijfers
brengen. Dat is precies waarom hij niet zonder besluit gemaakt mag worden.

## Wat er dan door zou komen

Dit is de kern van de afweging. De 17 kandidaten die uitsluitend door deze
wijziging zouden kwalificeren, op relevantie gesorteerd:

| rel | cluster | titel | wat het IS |
|---|---|---|---|
| 47 | netcongestie | Bouw versnelt opnieuw, maar de vraag loopt nog steeds op | brancherapportage |
| 45 | netcongestie | Netcongestie vraagt volle inzet van overheden, netbeheerders én … | **standpunt** |
| 34 | netcongestie | Zo werkt het: nieuwe werkwijze voor stroomaanvragen | uitleg van eigen proces |
| 34 | netcongestie | Zo werkt het: de wachtlijst voor netcapaciteit | uitleg van eigen proces |
| 34 | netcongestie | Inbreng voor het eerste debat Netcongestie van de nieuwe Kamer | **lobbydocument** |
| 21 | netbeheer | Nettarieven 2027 stijgen maar slimme keuzes kunnen stijging remmen | bericht **mét** advies |
| 21 | netbeheer | Variabele nettarieven zijn eerlijker en slimmer | **opinie** |
| 21 | netbeheer | Nieuwe nettarieven ontlasten stroomnet en beperken de kosten | **standpunt** |
| 21 | netbeheer | 'Kantelpunt voor Klimaat en Industrie' biedt stevige handvatten | **opinie** |
| 17 | regelgeving | Wetsvoorstel bijmengverplichting groen gas ingediend | verslag van wetgeving |
| 17 | regelgeving | Raad van State geeft groen licht voor wetsvoorstel | verslag van een advies |
| 17 | netbeheer | Voorstel voor een nieuw, tijdsafhankelijk nettariefstelsel | **eigen voorstel** |
| 17 | netbeheer | Reflectie op RES-voortgangsrapportages | **opinie** |
| 17 | netbeheer | Waarom het verlagen van piekbelasting altijd slim is | **opinie** |
| 12 | netbeheer | ACM stelt de nettarieven voor 2026 vast | verslag van een **toezichthoudersbesluit** |
| 12 | netbeheer | Zo werkt het: flexibele tarieven voor consumenten | **consumenten**, niet B2B |
| 12 | regelgeving | Nieuwe energiewet vereist vervangen oudere meters | verslag van wetgeving |

Negen van de zeventien zijn opinie, standpunt, lobby of eigen voorstel. Eén
gaat over consumenten en is daarmee buiten de doelgroep. Vier zijn een
**verslag van** een besluit van iemand anders — en voor precies die vier zegt
het contract al wat er moet gebeuren:

> `url`: "de primaire bron, niet een artikel dat erover schrijft"
> — `data/seo/nieuws-architectuur.json`, `artikelschema.bronnen`

Dat `ACM stelt de nettarieven voor 2026 vast` nu als `MARKTPARTIJ` geldt is
dus **geen fout maar het contract dat werkt**: dat item kwam binnen via de
feed van Netbeheer Nederland en niet via `acm-besluiten`. De juiste reparatie
daar is de ACM-feed dat item laten leveren, niet de brancheorganisatie
promoveren.

## De werkelijke conclusie: de grens ligt niet bij de UITGEVER

Netbeheer Nederland is niet "een marktpartij" in de zin van een leverancier
met een commercieel belang — het is het samenwerkingsverband van álle
netbeheerders. Als zij een tariefbesluit of een capaciteitscijfer publiceren,
spreken ze namens de netbeheerders en is dat materieel een
`NETBEHEERDER`-bron.

Maar als ze "Inbreng voor het eerste debat Netcongestie" publiceren, zijn ze
een belangenbehartiger die een standpunt verdedigt. Dezelfde uitgever, twee
volstrekt verschillende soorten document.

**Een categorie per UITGEVER kan dat onderscheid niet maken.** Een
`BRANCHEORGANISATIE` die draagt, laat de lobby binnen; een die niet draagt,
houdt het tariefbesluit buiten. Beide zijn fout, en dat is de reden dat deze
release de bestaande conservatieve keuze niet wijzigt: hij is niet optimaal,
maar hij faalt naar de veilige kant.

## Drie opties voor de eigenaar

**1 — Laten zoals het is.** Oogst blijft klein tot de primaire feeds (ACM,
rijksoverheid, netbeheerders zelf, CBS) hun items leveren. Nul risico, nul
werk. De kandidaten die nu afvallen blijven vindbaar in de database met hun
afwijsgrond.

**2 — `branchevereniging` → `NETBEHEERDER` voor uitsluitend Netbeheer
Nederland.** Eén regel in `BRONSOORT_UIT_UITGEVER`. Oogst 2 → 19. Haalt
aantoonbaar lobby en opinie binnen; `VERBODEN_BELOFTEN` in `poorten.ts` vangt
een deel daarvan ("altijd" in "Waarom het verlagen van piekbelasting altijd
slim is" blokkeert), maar een standpunt zonder absolute bewoording komt door.
**Niet aanbevolen zonder optie 3 erbij.**

**3 — Een eigen soort `BRANCHEORGANISATIE` die draagt onder één voorwaarde:
het DOCUMENT is een vaststelling en geen standpunt.** Dat is een
documentoordeel en geen bronoordeel, dus het hoort bij de uitspraak en niet
bij de bron. Benodigd werk, zoals het er nu uitziet:

- een migratie die de bronsoort toevoegt aan het contract in
  `nieuws-architectuur.json` én aan `DRAGENDE_BRONSOORTEN` in
  `bouw-routes.mjs` — dat laatste is een wijziging in een publicatiepoort en
  vraagt dus een eigen vijandig QA-scenario;
- een deterministische detector voor standpunt-taal ("inbreng", "reflectie",
  "pleidooi", "oproep", "wij vinden", "zou moeten"), in de geest van de
  `DEMPERS` in `pijplijn/relevantie.ts` — en net als daar afgeleid van ECHTE
  productietitels, waarvan er nu zeventien zijn;
- een toets die bewijst dat een lobbydocument van een brancheorganisatie niet
  draagt en een tariefvaststelling van dezelfde uitgever wel.

Optie 3 is de enige die het onderscheid maakt dat er werkelijk is. Hij is ook
de enige die een publicatiepoort aanraakt, en dat is geen werk voor een
integratieronde die ook nog vijf andere defecten repareert.

## Wat deze release wél heeft gedaan

De afwijsgrond is nu **zichtbaar en geteld** in plaats van onvindbaar.
`npm run nieuws` rapporteert per bindende grond hoeveel kandidaten erop
stranden, en `nieuws_oordeel` op de kandidaat draagt de volle reden. Zonder
dat zou "één kandidaat" een onverklaarbare uitkomst zijn in plaats van een
meting met een lever eraan.
