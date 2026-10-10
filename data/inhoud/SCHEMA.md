# Inhoudsbestanden — schema en redactieregels

Eén JSON-bestand per pagina, onder `data/inhoud/<type>/<slug>.json`. Eén bestand = één schrijver,
zodat er nooit twee mensen of processen in dezelfde pagina zitten.

`scripts/seo/genereer-nationaal.mjs` zet het bestand om naar HTML in de taal van `vibe/vibe.css`.
`scripts/seo/audit.mjs` is de poort: een bestand dat de poort niet haalt, wordt niet gepubliceerd.

## Velden

| veld | verplicht | regel |
|---|---|---|
| `route` | ja | zonder schuine streep ervoor, exact zoals in `data/seo/nationaal-doel.json` |
| `type` | ja | `oplossing` \| `sector` \| `toepassing` \| `kennis` \| `subsidie` \| `hub` |
| `titel` | ja | de `<title>`. **40–60 tekens**, inclusief ` | Vibe Energy` |
| `beschrijving` | ja | meta description. **110–158 tekens**. Geen leeg beloftewoord, wel wat de pagina oplevert |
| `og_titel` | ja | zonder merkstaart, max 60 tekens |
| `h1` | ja | één H1, mag afwijken van de titel, geen merknaam |
| `lead` | ja | 1–3 zinnen, 180–400 tekens |
| `kruimels` | ja | `[{naam, route}]` zonder Home en zonder de pagina zelf |
| `kruimel_label` | ja | korte naam van deze pagina in het kruimelpad |
| `direct_antwoord` | ja | `{vraag, antwoord, voorbehoud}` — zie hieronder |
| `secties` | ja | minstens 3 |
| `faq` | nee | `[{vraag, antwoord}]`, alleen als de vragen ook zichtbaar op de pagina staan |
| `verwant` | ja | `[{kop, items:[{route, naam}]}]` |
| `conversie` | ja | `{kop, tekst, primair:{route,label}, secundair?}` |
| `claims` | ja als er een cijfer in de tekst staat | `[{tekst, bron, bron_url, bron_datum}]` |
| `gewijzigd` | ja | ISO-datum van de laatste inhoudelijke wijziging |

### `direct_antwoord` — de GEO-bouwsteen

Eén alinea die **los van de pagina te citeren is**. Een antwoordmachine moet hem kunnen overnemen
zonder de rest gelezen te hebben. Dus: geen "zoals hierboven beschreven", geen "wij", wel het
onderwerp voluit. 300–700 tekens. `voorbehoud` benoemt wat dit antwoord **niet** zegt.

### Sectiesoorten

```json
{ "soort": "tekst",    "id": "?", "kop": "", "lead": "?", "alineas": ["..."], "bronnen": [{"naam","url","datum"}], "variant": "?" }
{ "soort": "kaarten",  "kop": "", "lead": "?", "kaarten": [{"kop":"","tekst":"","route":"?","label":"?"}], "variant": "?" }
{ "soort": "specs",    "kop": "", "rijen": [["term","waarde"]], "noot": "?" }
```

`variant` mag zijn: `""`, `"ve-sec--paper ve-sec--line-y"`, `"ve-sec--sunken ve-sec--line-y"`.
Wissel af, maar niet meer dan twee gekleurde secties achter elkaar.
Een `alineas`-regel die begint met `<p`, `<ul`, `<table`, `<h3` of `<blockquote` wordt ongewijzigd
doorgegeven; al het andere wordt in een `<p>` gezet.

## Redactieregels — hier faalt de poort op

1. **Geen cijfer zonder claim.** Staat er een getal in de tekst dat een uitkomst, een bedrag, een
   percentage, een marktomvang of een status beweert, dan hoort er een regel in `claims` met een
   bron-URL en een brondatum. Algemene rekenkunde in een uitleg (`3 × 80 A`, `1 kW gedurende 1 uur
   is 1 kWh`) is geen claim.
2. **Het claimregister is bindend.** `docs/vibe-claims-register-v2.md` somt cijfers op die van de
   site zijn verwijderd omdat ze door de site zelf werden tegengesproken. Die getallen mogen
   nergens terugkomen. De poort zoekt er letterlijk op.
3. **Geen bedrijfsbrede totalen.** Geen aantal projecten, geen MWp, geen uptime, geen CO₂, geen
   aantal klanten. Die sectie blijft leeg tot de meting er is.
4. **Geen certificeringen, keurmerken, lidmaatschappen, klantcitaten of medewerkersnamen.** De
   site heeft ze niet en verzint ze niet.
5. **Geen anonieme praktijkcase.** Waar bewijs nodig is, staat een echt project met naam en plaats,
   met een link naar de projectpagina. Er zijn zestien echte projecten.
6. **kW is niet kWh.** Vermogen, energie, aansluitwaarde, gecontracteerd transportvermogen en
   fysieke aansluitcapaciteit zijn vijf verschillende dingen. Verwar ze niet, en schrijf nooit dat
   een batterij extra gecontracteerd transportvermogen *creëert* — dat doet hij niet. Hij maakt
   ruimte binnen wat er al is.
7. **Geen rankingbelofte en geen AI-citatiebelofte.**
8. **Geen link naar een PENDING-route.** Zet een route in `verwant` of in een kaart alleen als hij
   in `data/seo/routes.json` op INDEX staat. De generator filtert ze er anders uit, en dan mist de
   pagina de link die je bedoelde.
9. **Nederlands, zakelijk, u-vorm.** Volg de toon van `systeem-energieopslag.html`: korte zinnen,
   concrete woorden, geen superlatieven, geen uitroeptekens, geen "oplossing op maat".
10. **Geen tekstvariatie als inhoud.** Als een sectie net zo goed op een andere pagina zou kunnen
    staan met twee woorden anders, hoort hij er niet.

## Lengte

Een gepubliceerde pagina heeft **minstens 700 woorden** in `<main>`; een kennisartikel minstens
900. Dat is geen doel maar een ondergrens: eronder is er te weinig gezegd om een eigen pagina te
rechtvaardigen.

## Voorbeelden

`data/inhoud/oplossing/netcongestie.json` en `data/inhoud/kennis/kw-versus-kwh.json` zijn de
maatstaf. Lees er minstens één voor je begint.
