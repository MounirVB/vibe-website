# Vibe Energy — URL-conventie

**Besluit: de publieke URL's zijn extensieloos.** `/systeem-energieopslag`, niet
`/systeem-energieopslag.html`.

## Waarom

Dit is geen keuze maar een voortzetting. De productiesite had die conventie al; dat is
in de repository op drie onafhankelijke plekken vastgelegd:

| Bewijs | Bevinding |
|---|---|
| `canonical` in elke pagina vóór de herbouw | 100% extensieloos (`https://vibeenergy.nl/projecten`) |
| `og:url` in elke pagina vóór de herbouw | 100% extensieloos |
| `sitemap.xml` vóór de herbouw | alle 39 URL's extensieloos |
| interne `href`s (`_footer.js`, `_header.js`, projectkaarten) | overwegend extensieloos |

De indexeerbare URL-set van de live site was dus extensieloos. Een overstap naar `.html`
zou een onnodige SEO-migratie zijn geweest: elke bestaande ranking en backlink wijst naar
de extensieloze vorm.

## Hoe het werkt

De host (Railway, `railpack.json` → provider `staticfile`) serveert `/<pad>` vanuit
`<pad>.html`. Dat gedrag is niet in dit repository geconfigureerd maar blijkt uit het feit
dat de productiesite op die URL's draait en daar ook naar canonicaliseert. Er is in de
repository geen Caddyfile, nginx.conf, `_redirects` of `static.json` die dit overschrijft.

## Afspraken

- **Op schijf** houdt elk bestand `.html`. Dat is wat de host mapt.
- **In `href`, `canonical`, `og:url` en `sitemap.xml`** staat de extensieloze vorm.
- De homepage is `/`, niet `/index`.
- `scripts/maak-projecten.mjs` genereert links extensieloos maar schrijft `.html`-bestanden.
  Verander dat niet zonder dit document bij te werken.

## Lokaal testen

`python3 -m http.server` kent geen try_files en geeft dan 404 op elke pagina. Gebruik de
meegeleverde dev-server die het hostgedrag nabootst (zie het QA-script in de sessiemap),
of test op de `.html`-paden met de wetenschap dat de publieke vorm anders is.
