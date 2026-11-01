# Toegangsverzoek RENDO Groep — INGETROKKEN op 1 november 2026

> **STATUS: INGETROKKEN. NIET VERZENDEN.**
>
> Dit verzoek is nooit verstuurd en mag dat ook niet worden. De twee feiten waarop het rust zijn
> op 1 november 2026 gemeten en blijken **onjuist**:
>
> | bewering in dit document | meting 1 november 2026, productie-egress, platform-UA |
> |---|---|
> | "inhoud van robots.txt: `User-agent: *` met een lege `Disallow:` — expliciete toestemming voor alles" | De productie-egress krijgt 2.676 bytes **zonder** Yoast-blok en **zonder** lege `Disallow:`. Cloudflare serveert twee varianten; die van productie is de strengere. |
> | "TDM-voorbehoud: **geen**" | `Content-Signal: search=yes,ai-train=no,use=reference`, mét de regel dat restricties via Content Signals een *express reservation of rights* onder **Artikel 4 van richtlijn 2019/790** zijn. 32 user-agentgroepen met `Disallow: /`, waarvan **13 op onze eigen TDM-lijst**. |
>
> **Waarom intrekken en niet herschrijven.** Dit verzoek vraagt om een firewalluitzondering op de
> grond dat de uitgever niets heeft voorbehouden. Dat is precies wat hij wél heeft gedaan. Het
> verzenden zou RENDO's eigen beleid verkeerd weergeven en toegang vragen die we daarna niet
> mogen gebruiken: met een HTTP 200 mogen we de inhoud evenmin verwerken. Gevoed met deze
> robots.txt geeft `bepaalToestemming()` grondslag `ai_crawler_uitgesloten` en
> `mogenVerwerken=false` — het platform zegt hier zelf nee, op stap 2 van de ladder in
> `toestemmingsbeleid.ts`, die zwaarder weegt dan de syndicatiegrond waarop deze bron leunde.
>
> **Ook de datum in dit document klopt niet.** Regel hieronder zegt "sinds 13 oktober 2026 HTTP
> 403"; de eerste 403 in `intel.bron_ophalingen` staat op **2026-10-10 12:02:56Z**, tien dagen
> eerder dan elk signaal meldde. (`storing_sinds` = 20 oktober is het moment waarop de
> classificatie van `TOEGANG_BEPERKT` naar `CDN_BLOKKADE` sprong, niet het begin van de storing —
> `verzamelen.ts` zet die datum opnieuw zodra de soort verandert.)
>
> **Wat er in plaats hiervan is gebeurd.** De bron staat gecontroleerd geblokkeerd: in
> `src/bronnen/register.ts` is `tdmStatus` op `voorbehoud` gezet en `actief` op `false`, met de
> gemeten grond in `inactiefReden`. Er is **geen rechtmatig alternatief kanaal** — een Artikel
> 4-voorbehoud geldt het werk van de uitgever en niet een adres, dus een ander endpoint of een
> zusterhost van RENDO Groep is niet rechtmatiger. Het kost geen gemeten dekking: deze bron heeft
> in 8 ophaalpogingen nooit één document geleverd.
>
> De tekst hieronder blijft staan als **meetspoor** van wat er op 13/14 oktober is vastgesteld.
> Lees hem niet als een opdracht.

---

## 1. Wat er gemeten is

Alle regels hieronder zijn op 13 en 14 oktober 2026 gemeten; niets is aangenomen.
**De twee regels over robots.txt en het TDM-voorbehoud zijn op 1 november weerlegd — zie de
kop.**

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

## 3. Conceptbericht — NIET VERZENDBAAR

> Dit bericht stelt dat RENDO "het crawlen uitdrukkelijk toestaat" en dat er geen TDM-voorbehoud
> is. Beide zijn op 1 november 2026 weerlegd. Verzenden zou het beleid van de uitgever verkeerd
> weergeven. Bewaard als meetspoor, niet als concept.

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

## 4. Wat de eigenaar moest beslissen vóór verzending — VERVALLEN

> Er valt niets meer te beslissen: het verzoek is ingetrokken. De bron staat gecontroleerd
> geblokkeerd op de gemeten TDM-grond. Zou RENDO het voorbehoud ooit intrekken, dan begint dit
> opnieuw met een nieuwe meting van robots.txt — niet met deze tekst.

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
