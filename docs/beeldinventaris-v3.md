# Beeldinventaris — redesign V3

Opgesteld uit wat er op schijf ligt en wat de gebouwde HTML werkelijk aanroept.
Geen schattingen.

## Herkomst

Alle beelden hieronder stonden AL in de repository voordat dit werk begon. In
deze ronde is geen enkel beeldbestand toegevoegd, vervangen, bijgesneden of
anderszins bewerkt. Wat veranderd is, is WELKE pagina welk bestand aanroept.
De commits waarmee ze zijn binnengekomen:

| commit | datum | wat |
|---|---|---|
| `174be0f` | 2026-08-19 | Fix asset structure: move files into assets/ |
| `8a03ac3` | 2026-09-18 | optimalisatie van de beeldvarianten |
| `3c66c71` | 2026-10-04 | launch Vibe Energy website rebuild |

## Licentie — NIET VASTGELEGD, OPENSTAAND PUNT

De repository bevat geen licentiebestand, geen rechtenregister en geen
fotograafvermelding bij `assets/` of `img/`. Ik kan daarom niet vaststellen
onder welke voorwaarden dit materiaal gebruikt mag worden, en ik vul dat niet
in. Wat ik wel kan waarnemen: de batterijkasten dragen het VIBE-logo, twee
foto's tonen medewerkers in bedrijfskleding, en de projectfoto's horen bij
projecten die in `scripts/projecten.json` staan. Dat wijst op eigen materiaal,
maar het is een waarneming en geen licentiebewijs.

## Niet opgenomen, met reden

| bestand | reden |
|---|---|
| `assets/subsidies-hero.jpg` | Een plein met een kerktoren. Geen relatie met subsidies of energie — precies de losse stockfoto die hier niet hoort. |
| `assets/energiehandel-hero.jpg` | Hetzelfde beeld als `ems-hero.jpg`. |
| `assets/microgrids-hero-*.webp` | Bijna gelijk aan `netcongestie-hero`: dezelfde kasten, hetzelfde hek, andere uitsnede. |
| `assets/energieopslag-hero-*.webp` | Bijna gelijk aan `capaciteit-hero`. |

De laatste twee zijn uitgesloten omdat geen pagina twee bijna-gelijke foto's
mag krijgen. Dat leest als een fout, niet als ritme.

## De 29 beelden in het systeem

De alt-teksten zijn geschreven NA het bekijken van de beelden, niet afgeleid
uit de bestandsnaam. Drie namen dekten de lading niet. 'Pagina's' is het aantal
gebouwde HTML-bestanden dat het beeld daadwerkelijk aanroept.

| sleutel | bestand | varianten | grootste | op schijf | pagina's | binnengekomen | alt-tekst |
|---|---|---|---|---|---|---|---|
| `kast` | `assets/bedrijf-hero` | 4 | 537 kB | 642 kB | 178 | 3c66c71 2026-10-04 | Batterijkast van Vibe Energy tegen de gevel van een bedrijfspand |
| `platdak` | `assets/dakvlak-hero` | 4 | 829 kB | 1131 kB | 178 | 3c66c71 2026-10-04 | Zonnepanelen op een plat bedrijfsdak, met de kabelgoot langs de rij |
| `omkasting` | `assets/capaciteit-hero` | 3 | 356 kB | 510 kB | 107 | 174be0f 2026-08-19 | Twee batterijkasten in een houten omkasting naast een bedrijfspand |
| `luchtvastgoed` | `assets/vastgoed-hero` | 3 | 425 kB | 614 kB | 97 | 174be0f 2026-08-19 | Luchtfoto van een bedrijfspand met parkeerterrein |
| `panelen` | `assets/zonnepanelen-hero` | 4 | 1361 kB | 1949 kB | 92 | 174be0f 2026-08-19 | Zonnepanelen op een dak tegen een bewolkte lucht |
| `hekwerk` | `assets/netcongestie-hero` | 4 | 849 kB | 1293 kB | 89 | 174be0f 2026-08-19 | Twee batterijkasten van Vibe Energy achter een hekwerk op het terrein |
| `meters` | `assets/ems-hero` | 1 | 204 kB | 204 kB | 23 | 174be0f 2026-08-19 | Een rij kilowattuurmeters in een meterkast |
| `laadpaal` | `assets/laadpalen-hero` | 4 | 726 kB | 1009 kB | 11 | 174be0f 2026-08-19 | Een auto aan een laadpunt, met de laadkabel aangesloten |
| `meting` | `img/control-meting` | 4 | 329 kB | 441 kB | 10 | 3c66c71 2026-10-04 | Meetapparatuur in een schakelkast |
| `carport` | `assets/laadplein-hero` | 4 | 1245 kB | 1903 kB | 10 | 174be0f 2026-08-19 | Luchtfoto van een parkeerterrein met een overkapping van zonnepanelen |
| `binnenwerk` | `img/batterij-binnenwerk` | 4 | 1145 kB | 1663 kB | 8 | 3c66c71 2026-10-04 | Het binnenwerk van een batterijsysteem |
| `emstech` | `img/ems-tech` | 3 | 134 kB | 195 kB | 8 | 174be0f 2026-08-19 | Technische installatie van het energiemanagementsysteem |
| `werktekening` | `img/monteurs-werktekening` | 3 | 176 kB | 279 kB | 8 | 3c66c71 2026-10-04 | Monteurs bij een werktekening op locatie |
| `wandlader` | `assets/exploitatie-hero` | 4 | 719 kB | 987 kB | 8 | 174be0f 2026-08-19 | Wandlaadpunt met kabel naast geparkeerde auto's |
| `luchtkantoor` | `assets/kantoor-hero` | 4 | 500 kB | 937 kB | 6 | 174be0f 2026-08-19 | Luchtfoto van een kantoorpand met zonnepanelen op het dak en een parkeerterrein ernaast |
| `luchtcomplex` | `assets/energielabel-hero` | 1 | 766 kB | 766 kB | 6 | 174be0f 2026-08-19 | Luchtfoto van een gebouwencomplex met zonnepanelen op de daken |
| `montage` | `assets/waarom-vibe-hero` | 1 | 277 kB | 277 kB | 6 | 174be0f 2026-08-19 | Monteur op een ladder bij een staalconstructie |
| `luchtwonen` | `assets/residentieel-hero` | 4 | 835 kB | 1830 kB | 4 | 174be0f 2026-08-19 | Luchtfoto van een woonblok met een volledig belegd zonnedak |
| `werkplaats` | `assets/over-ons-hero` | 4 | 752 kB | 1056 kB | 4 | 174be0f 2026-08-19 | Twee medewerkers van Vibe Energy bij een tekening op de werkplek |
| `logistiek` | `assets/logistiek-hero` | 1 | 598 kB | 598 kB | 3 | 174be0f 2026-08-19 | Luchtfoto van een bedrijventerrein met zonnecarports en een windturbine |
| `laden` | `assets/home/s2-laad` | 4 | 87 kB | 187 kB | 2 | 8a03ac3 2026-09-18 | Laadinfrastructuur op een bedrijfsterrein |
| `ems` | `assets/home/s2-ems` | 2 | 27 kB | 38 kB | 2 | 8a03ac3 2026-09-18 | Het energiemanagementsysteem van Vibe Energy |
| `systeem` | `assets/systeem/s4-systeem` | 5 | 198 kB | 521 kB | 2 | 3c66c71 2026-10-04 | Opstelling van een energieopslagsysteem |
| `accu` | `assets/home/s2-accu` | 4 | 132 kB | 241 kB | 1 | 8a03ac3 2026-09-18 | Batterijsysteem van Vibe Energy naast een bedrijfspand |
| `opslag` | `assets/home/s7-opslag` | 3 | 266 kB | 392 kB | 1 | 8a03ac3 2026-09-18 | Batterijkasten van Vibe Energy in een houten omkasting naast een bedrijfspand |
| `zon` | `assets/home/s2-zon` | 4 | 159 kB | 271 kB | 1 | 8a03ac3 2026-09-18 | Zonnepanelen op een bedrijfsdak |
| `dak` | `img/comm-rooftop` | 1 | 256 kB | 256 kB | 1 | 174be0f 2026-08-19 | Zonnepanelen op het dak van een commercieel pand |
| `laadpunt` | `img/ev-charging` | 1 | 258 kB | 258 kB | 1 | 174be0f 2026-08-19 | Een elektrische auto aan een laadpunt |
| `luchtvve` | `assets/vve-hero` | 1 | 621 kB | 621 kB | 0 | 174be0f 2026-08-19 | Luchtfoto van een rij woningen met zonnepanelen en achtertuinen |

Totaal 29 beelden, 89 bestanden,
20.6 MB aan varianten.

Nog niet aangeroepen: `luchtvve` — deze blijven
bestaan als vangnet voor routes zonder eigen beeldset.

## Spreiding over de regiopagina's

Vóór deze ronde deelden alle 349 regiopagina's één beeld: `img/control-meting`.
De set rouleert nu op een stabiele hash van de route, zodat twee buurgemeenten
niet hetzelfde tonen en de bouw toch reproduceerbaar blijft.

| beeld | pagina's | aandeel |
|---|---|---|
| `assets/bedrijf-hero` | 167 | 47% |
| `assets/dakvlak-hero` | 167 | 47% |
| `assets/capaciteit-hero` | 96 | 27% |
| `assets/vastgoed-hero` | 93 | 26% |
| `assets/zonnepanelen-hero` | 84 | 24% |
| `assets/netcongestie-hero` | 81 | 23% |

Gemeten over 349 regiopagina's. Elf gemeenten met een eigen project tonen hun
eigen projectfoto; die staan hier niet in omdat ze elk op één pagina staan.
