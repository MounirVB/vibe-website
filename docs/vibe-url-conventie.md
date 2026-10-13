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
`<pad>.html`. Dat gedrag komt uit de Caddy-template die railpack zelf genereert
(`try_files {path} {path}.html {path}/index.html`) en niet uit dit repository; het blijkt ook
uit het feit dat de productiesite op die URL's draait en daar naar canonicaliseert.

**Vandaag staat er geen Caddyfile, nginx.conf, `_redirects` of `static.json` in de repository
die dit overschrijft.** Gemeten 13 oktober 2026: `git ls-files | grep -ci caddy` geeft `0`.

Hier stond "Er is in de repository geen Caddyfile … die dit overschrijft", zonder datum en zonder
onderscheid tussen *staat er niet* en *kan er niet staan*. Dat leest als het tweede, en het
tweede is gemeten onjuist: de staticfile-provider van railpack leest een `Caddyfile` in de
projectwortel **rechtstreeks van schijf** bij het plannen.
`core/providers/staticfile/staticfile.go` vraagt met `ctx.TemplateFiles` naar de namen
`Caddyfile.template` en `Caddyfile`, en `core/app/app.go` doet die bestandscontrole met
`os.Stat` **zonder** de excludematcher. De gevonden inhoud wordt als plan-asset geïnjecteerd
(`mkfile /app/Caddyfile`). Een eigen Caddyfile bereikt Caddy dus **zelfs als hij in
`railpack.json` onder `exclude` staat** — een exclude-regel is hier geen slot.

### Wat een eigen Caddyfile zou kosten

Hij **vervangt** de gegenereerde template, hij vult hem niet aan. Je neemt daarmee de
verantwoordelijkheid over voor alles wat die template nu levert, en elke regel die je vergeet
verlies je stil op alle 430 pagina's tegelijk:

| wat de gegenereerde template nu levert | meting, 13 oktober 2026 |
|---|---|
| `try_files {path} {path}.html {path}/index.html` | de hele conventie van dit document staat hierop |
| `handle_errors` naar `404.html` | `/onbekend-pad-xyz` geeft 404 met de 404-pagina als body |
| `respond /health 200` | `/health` geeft 200 |
| `content-security-policy` | aanwezig op `/systeem-energieopslag`: `default-src 'self'; … object-src 'none'; frame-src 'self' https: *;` |
| `referrer-policy` | `strict-origin-when-cross-origin` |
| `x-content-type-options` | `nosniff` |
| `x-xss-protection` | `1; mode=block` |

Die vier beveiligingskoppen — de CSP plus `referrer-policy`, `x-content-type-options` en
`x-xss-protection` — staan **nergens in deze repository**. Gemeten: zoeken op
`Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options` en
`Strict-Transport-Security` over alle `*.json`, `*.html`, `*.mjs`, `*.js` en `*.md` geeft **nul**
bestanden. Ze zijn dus niet terug te vinden door te lezen wat wij hebben geschreven; ze bestaan
alleen in de template van de provider. Twee dingen die daarbij horen, ook gemeten: `x-frame-options`
en `strict-transport-security` worden **niet** geserveerd, en de vier die wél komen, staan niet op
het 404-antwoord — ze hangen aan het pad dat een bestand vindt.

Daarom: geen eigen Caddyfile zonder dat eerst de volledige gegenereerde template is afgeschreven
en regel voor regel is overgenomen, en zonder dat deze tabel daarna op productie opnieuw is
gemeten. Natoetsen hoort op de versie die productie pint — caddy **2.11.4**, zie
`docs/seo-architectuur.md` beslissing 2.

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
