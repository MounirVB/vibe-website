# REDACTIENORM VAN HET NIEUWSKANAAL

**Status:** canoniek. Dit is de thuisbasis van de redactienorm van `/nieuws`.
**Vastgesteld:** 2026-10-10 (Release 2.1) · **Verplaatst naar binnen:** 2026-11-06.

Deze norm stond tot 6 november 2026 als zichtbare tekst op de publieke pagina
`https://www.vibeenergy.nl/nieuws`. Daar hoort hij niet: een bezoeker die nieuws
zoekt, krijgt dan het redactieproces te lezen in plaats van inhoud. De norm is
niet versoepeld en niet ingetrokken — hij is verhuisd naar deze plek en wordt
hier door een poort bewaakt. Zie `data/seo/nieuws-architectuur.json`,
`_correctie_op_dit_contract_4`.

**Waarom hier.** Dit bestand staat onder `intelligence/`, de map die als
`rootDirectory` meereist in de container van de Railway-service `vibe-intel-api`
— het Vibe Intel-platform waar de mensen werken die dit kanaal bedienen. Het
wordt niet door de website geserveerd: gemeten op 6 november 2026 geeft
`https://www.vibeenergy.nl/intelligence/docs/RUNBOOK.md` HTTP 404, net als elk
ander niet-HTML bestand uit de repo.

**Wat deze plek NIET is.** Er is in deze repo geen ingelogde markdownviewer: het
dashboard in `intelligence/src/dashboard/server.ts` leest geen bestanden van
schijf. "Intern" betekent hier dus *niet door de website geserveerd en alleen
bereikbaar voor wie toegang heeft tot de repo en de intel-container* — niet
*achter een wachtwoord*. Wil je dat laatste letterlijk, dan is er één weg:
een route `/redactienorm` achter `vereistInlog` + `vereistRecht` in dat
dashboard, met een browsertoets naar het model van
`intelligence/test/browser/studio.browser.test.ts`.

---

## De vier voorwaarden

Een bericht verschijnt op `/nieuws` pas als alle vier tegelijk gelden.

<!-- VOORWAARDE: VRIJGAVE_DOOR_EEN_MENS -->

### 1. Een mens heeft het vrijgegeven

Een bericht gaat nooit vanzelf live, ook niet als het technisch in orde is. De
goedkeuring draagt een naam en een datum.

Afgedwongen in `scripts/seo/bouw-routes.mjs`, `weigerNieuws()` regel 429-436:
alleen `redactionele_staat: 'GOEDGEKEURD'` mag door, en dan nog alleen met een
gevulde `goedgekeurd_door` en een geldige ISO-datum in `goedgekeurd_op`.

<!-- VOORWAARDE: DRAGENDE_BRON -->

### 2. Er is een dragende bron

Wetgeving, een toezichthouder, een netbeheerder of een statistiekbureau. Een
persbericht van een marktpartij is een belanghebbende en telt op zichzelf niet
als vaststelling — ook niet als wij die marktpartij zijn.

Afgedwongen in `scripts/seo/bouw-routes.mjs` regel 410 (`DRAGENDE_BRONSOORTEN`)
en 448-450. Elke bron moet bovendien een geldige raadpleegdatum dragen.

<!-- VOORWAARDE: PEILDATUM_PER_CIJFER -->

### 3. Elk cijfer draagt zijn peildatum

Een bedrag, een percentage of een vermogen zonder de datum waarop het is
nagekeken veroudert onzichtbaar. Die datum staat zichtbaar op de pagina, niet
alleen in de broncode.

Afgedwongen in `scripts/seo/bouw-routes.mjs` regel 456-457 (elke claim heeft
`bron_url` én `bron_datum`), in poort 10 van `scripts/seo/audit.mjs` voor
subsoort `nieuws`, en zichtbaar op de artikelpagina door de bronnensectie die
poort 16 eist (`audit.mjs` regel 821-834).

<!-- VOORWAARDE: GELEEND_ONDERWERP -->

### 4. Het bericht leent zijn onderwerp

Een nieuwsbericht claimt zelf geen commercieel onderwerp; het verwijst naar de
pagina die dat onderwerp behandelt. Zo blijft duidelijk wat een ontwikkeling is
en wat een propositie.

Afgedwongen in `scripts/seo/bouw-routes.mjs` regel 460-462 (`onderwerp_eigenaar`
is verplicht en moet een bestaande INDEX-route zijn) en in `audit.mjs` regel
852-857 (het artikel moet ook werkelijk naar die eigenaar linken).

---

## Wat deze verhuizing NIET verandert

- `weigerNieuws()` toetst onverkort alle voorwaarden. Geen enkele artikelpoort
  is versoepeld.
- GOEDGEKEURD blijft een menselijke handeling met naam en datum.
- De hub staat alleen op INDEX door de sleutel `nieuws` in
  `data/seo/publicatiebesluit.json`. Haal die weg en `/nieuws` valt terug op
  PENDING en dus op 404.
- Er wordt geen bericht verzonnen of automatisch gepubliceerd om de pagina te
  vullen.

## Hoe dit document bewaakt wordt

Poort 16 (`scripts/seo/audit.mjs`, "16 Nieuwskanaal") toetst blokkerend dat dit
bestand bestaat en alle vier de `VOORWAARDE:`-markeringen hierboven draagt, en
dat de publieke hub de interne werking juist NIET toont. Verdwijnt dit document
of een voorwaarde eruit, dan faalt de poort en daarmee de generatorketen.

De markeringen zijn er zodat de toets niet op proza hoeft te matchen: de tekst
mag worden aangescherpt, de vier voorwaarden mogen niet stilletjes verdwijnen.
