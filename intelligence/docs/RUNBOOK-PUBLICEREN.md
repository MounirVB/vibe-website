# Runbook — een goedgekeurd nieuwsbericht publiceren

Dit is de hele weg van een goedgekeurd concept naar een gecontroleerde
publieke URL. Elke stap heeft een commando, een verwachte uitkomst en een
terugweg. Niets in dit runbook publiceert iets zonder dat je het zelf
intikt.

## 0. Wat je nodig hebt, en waarom

De keten heeft drie dingen **tegelijk** nodig:

| | waar het staat |
|---|---|
| de intel-database | binnen het Railway-privénet (`postgres.railway.internal`); **geen** publiek eindpunt |
| de volledige repository + `git` | op jouw machine (een werkboom van `vibe-website`) |
| een geautoriseerde `gh` | op jouw machine |

De database is het enige dat opgesloten zit. Daarom draait de keten op
**jouw machine**, met een **SSH-doorsturing** naar de privédatabase. Dat
is weg 2 uit `deploy/railway.md` (`railway ssh`), met een poortdoorsturing
erbij.

**Wat hier met opzet NIET gebeurt**

- de database krijgt geen publiek eindpunt en geen TCP-proxy;
- er komt geen GitHub-token in een Railway-service;
- er wordt geen nieuwe Railway-service aangemaakt;
- er wordt geen credential in de repository of in een logregel gezet.

Gemeten (6 november 2026): de containers van `vibe-intel-api` hebben node
en npm en kunnen `api.github.com` bereiken, maar hebben **geen git, geen
gh en geen repository** — `rootDirectory` is `intelligence`, dus `/app`
IS die map. In de container kan de keten dus niet draaien, en dat is de
hele reden dat de tunnel bestaat.

## 1. De tunnel openen

```bash
# sessie 1 — laat deze open staan
ssh -N -L 15433:postgres.railway.internal:5432 railway-vibe-intel-api
```

Staat de host nog niet in je SSH-config, dan zet `railway ssh config
--service vibe-intel-api` hem erin (of bekijk hem eerst met `--dry-run`).

**Verifiëren** — de database antwoordt door de tunnel:

```bash
npm run publicatieomgeving
```

Verwacht: alle regels PASS, inclusief *de intel-database is bereikbaar*.
Werkt de tunnel niet, dan stopt het runbook hier.

## 2. De omgeving klaarzetten

```bash
# sessie 2 — in de werkboom van vibe-website
cd ~/projects/vibe-website            # of je eigen werkboom
git fetch origin && git status         # moet SCHOON zijn en op main
export INTEL_SITE_WORTEL="$PWD"
export INTEL_DB_URL="$(railway variables -s vibe-intel-api --json \
  | jq -r '.INTEL_DB_URL' \
  | sed 's#postgres\.railway\.internal:5432#127.0.0.1:15433#')"
cd intelligence
```

De `sed` herschrijft alleen de host; het wachtwoord wordt niet geprint en
niet opgeslagen. Sluit de terminal als je klaar bent.

> **Schone werkboom is een harde eis.** Grendel 5 van de keten weigert op
> een vuile boom, omdat andermans werk dan in de publicatiecommit zou
> meekomen.

## 3. Je identificeren

Elke schrijvende handeling vraagt **wie** en **bewijs**:

```bash
# wie
--door beheer@vibeenergy.nl
# bewijs: het intel_sessie-koekje uit het dashboard na inloggen
export INTEL_SESSIE='<waarde van het intel_sessie-koekje>'
```

De CLI leest het koekje met `leesSessieCookie()`, houdt de sessie-epoch
tegen de database (een ingetrokken sessie werkt niet), eist dat het adres
bij diezelfde gebruiker hoort, en toetst server-side het recht
`inhoud.publiceren`. Een kaal gebruikers-id is géén identiteitsbewijs.

## 4. De keten, stap voor stap

De vijf fasen zijn uitdrukkelijk verschillend. **Een geopende pull request
is geen publicatie.**

| fase | commando | wat er vastligt |
|---|---|---|
| 1 Goedgekeurd | in de Content Studio, `/studio/<id>` | `publicatiebesluiten` fase `GOEDGEKEURD` met de goedkeurder |
| 2 Record geschreven | `--pr` (of `--pr --droog` om alleen te toetsen) | fase `RECORD_GESCHREVEN` |
| 3 PR aangemaakt | `--pr --open-pr` | fase `PR_AANGEMAAKT` met branch, commit en PR-URL |
| 4 PR gemerged + uitgerold | de PR mergen op GitHub | niets automatisch; fase 5 meet het |
| 5 Publieke URL gecontroleerd | `--verifieer` | fase `LIVE_GEVERIFIEERD` met HTTP-status, canonical en sitemap |

```bash
# 4a. eerst droog: alleen de grendels, er wordt niets geschreven
npm run publiceer -- --versie <id> --pr --droog --door beheer@vibeenergy.nl

# 4b. het record schrijven, de generator draaien, lokaal committen
npm run publiceer -- --versie <id> --pr --door beheer@vibeenergy.nl

# 4c. pushen en de pull request openen
npm run publiceer -- --versie <id> --pr --open-pr --door beheer@vibeenergy.nl
```

Elke run print een grendeltabel. Eén FAIL betekent: niets geschreven, of
alles teruggedraaid.

### 4d. De PR mergen

Dat doet een mens op GitHub, na de drie verplichte checks. **Die merge is
de productiedeploy van www.vibeenergy.nl.**

### 4e. Meten of het er werkelijk staat

```bash
git fetch origin                       # anders kent git de merge niet
npm run publiceer -- --versie <id> --verifieer --door beheer@vibeenergy.nl
```

Dit schrijft alleen iets als **alle** vijf de metingen kloppen: de commit
zit in `origin/main`, de URL geeft 200, de canonical wijst naar zichzelf,
de kop staat op de pagina en de URL staat in de sitemap. Anders komt er
een FAIL-tabel en blijft het logboek leeg.

## 5. Terugweg per fase

| waar het misgaat | terugweg |
|---|---|
| grendel faalt in 4a/4b | niets gebeurd; de keten draait zelf terug en laat een schone boom achter |
| PR-stap faalt (4c) | de publicatie wordt teruggedraaid, de versie gaat terug naar `goedgekeurd`, de boom is schoon; opnieuw proberen mag |
| PR geopend maar niet gewenst | PR sluiten zonder merge; publiek is er niets gebeurd |
| al gemerged, inhoud blijkt fout | `npm run publiceer -- --terugdraaien <publicatieId> --door <adres>` zet het record terug (de volledige vorige inhoud staat in `publicaties.vorige_inhoud`); daarna een revert-PR, want `main` is beschermd |
| applicatierelease fout | Railway-rollback naar de vorige deploy; de database blijft |

## 6. Wat je NOOIT hoeft te doen

- `auto_publiceren_aan` aanzetten — de hele keten werkt met de hand;
- een wachtwoord of token in een bestand zetten;
- de database publiek maken;
- `npm run herbeoordeel` draaien om te kunnen publiceren (dat is een
  claimonderhoudstaak en loopt uurlijks mee).

## 7. Twee accounts, vier ogen

`keurGoed()` weigert een goedkeuring door wie het concept heeft
aangemaakt of als laatste heeft bewerkt. Met één bruikbaar account loopt
dat vast zodra die persoon de tekst aanraakt: daarna mag hij niet meer
goedkeuren. De werkbare verdeling is dus:

- **redacteur** (`redactie@vibeenergy.nl`) bereidt voor en bewerkt;
- **beheerder** (`beheer@vibeenergy.nl`) keurt goed — ook hoog risico,
  want `inhoud.hoogrisico.goedkeuren` zit alleen bij die rol.

`redactie@` heeft op dit moment **geen wachtwoord** (gemeten: geen hash,
nul bruikbare instelsleutels). Activeren gaat met
`npm run wachtwoordtoken -- --email redactie@vibeenergy.nl`, en dat is
een handeling met gevolgen: het commando **wist het huidige wachtwoord**
van dat account en verhoogt de sessie-epoch, waardoor lopende sessies
omvallen. Draai het dus nooit terloops voor `beheer@`.
