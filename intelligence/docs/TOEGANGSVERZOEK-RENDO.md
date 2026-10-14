# Toegangsverzoek RENDO Groep — CONCEPT, NIET VERZONDEN

**Status: wacht op goedkeuring van de eigenaar. Er is niets verstuurd.**

Dit document bestaat omdat de bron `rendo-nieuws` sinds 13 oktober 2026 HTTP 403 geeft vanaf
de productieomgeving, terwijl RENDO het crawlen uitdrukkelijk toestaat. Het verzoek hieronder is
opgesteld om dat op te lossen langs de enige toegestane weg: het vragen van een uitzondering.

---

## 1. Wat er gemeten is

Alle regels hieronder zijn op 13 en 14 oktober 2026 gemeten; niets is aangenomen.

| meting | uitkomst |
|---|---|
| `https://www.rendogroep.nl/robots.txt` vanaf **Railway** | **HTTP 403**, `server: cloudflare`, `cf-ray: …-PDX`, titel *"Attention Required! \| Cloudflare"* |
| `https://www.rendogroep.nl/feed/` vanaf **Railway** | **HTTP 403**, idem |
| `https://www.rendogroep.nl/robots.txt` vanaf een **Nederlandse egress** | **HTTP 200** |
| `https://www.rendogroep.nl/feed/` vanaf een **Nederlandse egress** | **HTTP 200**, geldige RSS 2.0, **10 `<item>`** |
| user-agent in beide gevallen | **identiek** — `VibeEnergyIntelligence/0.1 (+https://www.vibeenergy.nl; contact: sales@vibeenergy.nl)` |
| inhoud van robots.txt | `User-agent: *` met een **lege `Disallow:`** — expliciete toestemming voor alles |
| TDM-voorbehoud | **geen** |
| bewaarde brondocumenten | **0** — deze bron heeft nog nooit iets geleverd |
| responstijd van de 403 | 13–62 ms — een edge-weigering, geen serverfout |

**Conclusie.** De user-agent maakt geen verschil; de netwerkherkomst wél. Dit is een
Cloudflare-regel die een hostingnetwerk weigert, niet een beslissing van RENDO. Daarom is de
storingssoort in het platform `CDN_BLOKKADE` en niet `TOEGANG_BEPERKT`: de uitgever heeft niets
verboden.

## 2. Wat er NIET is gedaan, en niet zal worden gedaan

- **Niet opgehaald via een andere egress of proxy.** Dat zou de firewallregel omzeilen. Dat een
  Nederlandse egress wél 200 geeft, is hier uitsluitend diagnostiek — het is geen route die in
  productie gebruikt wordt of mag worden.
- **Niet opgehaald met een andere user-agent.** Zou ook niet helpen, en het is verboden.
- **De bron is niet uitgezet en niet verwijderd.** Hij staat opgeschort tot **20 oktober 2026**,
  zodat de foutenteller niet verder oploopt en de blokkade automatisch opnieuw wordt getoetst.
- **Er is geen alternatief ingezet.** De vijf andere actieve netbeheerderbronnen (Liander, Enexis,
  Stedin, Coteq, Westland Infra) dekken wederzijds exclusieve verzorgingsgebieden en bevatten
  RENDO's eigen berichten niet. `energieonderbrekingen-storingen` is een storings-API, geen
  nieuwsfeed, en staat uit wegens onvastgestelde toestemming.

## 3. Conceptbericht

> **Aan:** RENDO Groep — t.a.v. de webredactie of de beheerder van www.rendogroep.nl
> **Onderwerp:** verzoek tot uitzondering firewallregel voor onze RSS-lezer
>
> Goedemiddag,
>
> Wij volgen de nieuwsberichten van netbeheerders om bedrijven in Nederland te informeren over
> netcongestie en aansluitcapaciteit. Uw RSS-feed `https://www.rendogroep.nl/feed/` hoort daarbij.
>
> Sinds 13 oktober 2026 krijgen wij op dat adres HTTP 403 met een Cloudflare-blokkadepagina. Het
> gaat niet om uw beleid: uw `robots.txt` bevat `User-agent: *` met een lege `Disallow:` en staat
> het uitlezen dus uitdrukkelijk toe, en er is geen TDM-voorbehoud. Vanaf een Nederlandse
> internetverbinding werkt de feed normaal; vanaf onze serveromgeving niet. Met exact dezelfde
> identificatie. Het lijkt dus een firewallregel die onze hostingprovider als netwerk weigert.
>
> Wij zouden u willen vragen een uitzondering te maken voor onze lezer. Onze gegevens:
>
> - **User-Agent:** `VibeEnergyIntelligence/0.1 (+https://www.vibeenergy.nl; contact: sales@vibeenergy.nl)`
> - **Opvraagfrequentie:** eenmaal per 24 uur, maximaal 10 items per keer
> - **Wat wij ophalen:** uitsluitend `/feed/`, geen andere paden
> - **Wat wij doen:** titel, datum en link vastleggen en naar uw bericht verwijzen; wij nemen geen
>   volledige artikelen over
> - **Hosting:** Railway (eu-west / europe-west4)
>
> Mocht een uitzondering niet mogelijk zijn, dan laten wij het hierbij — wij omzeilen de blokkade
> niet. Een alternatief adres of een andere afspraak horen wij in dat geval graag.
>
> Met vriendelijke groet,
>
> *(naam, functie)*
> Vibe Energy B.V. — sales@vibeenergy.nl — +31 85 060 0489

## 4. Wat de eigenaar moet beslissen vóór verzending

1. **Afzender en ondertekening.** Het concept laat naam en functie open.
2. **Het contactkanaal.** Er is geen e-mailadres van RENDO gemeten; dat is niet opgezocht omdat
   verzenden nog niet is goedgekeurd. Het algemene contactformulier op rendogroep.nl is de meest
   waarschijnlijke route.
3. **Of het IP-bereik erbij mag.** Een firewalluitzondering op user-agent is zwakker dan op IP,
   maar het delen van egress-adressen is een eigen afweging. Railway's egress is bovendien niet
   gegarandeerd stabiel.
4. **Wat er gebeurt als er geen antwoord komt.** Voorstel: de bron blijft staan en blijft
   opgeschort; de hercontrole elke zeven dagen merkt het automatisch als de regel wordt opgeheven.
   Parkeren is dan nog steeds niet de juiste stap, want de reden zou onwaar zijn.
