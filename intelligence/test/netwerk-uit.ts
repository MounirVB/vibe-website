/* ============================================================
   TEST — de netwerkpreambule
   ------------------------------------------------------------
   HET HARNAS ZEI HET AL, MAAR ALLEEN TEGEN INTEGRATIETOETSEN.

   test/harnas.ts draagt de regel "een test die stil het internet op
   gaat is geen test maar een meting", en zet INTEL_NETWERK_TOEGESTAAN
   op 0. Maar dat gebeurt in `maakWegwerpdatabase()`, en een
   EENHEIDStoets roept die functie nooit aan. Daar stond de vlag dus op
   zijn standaard, en die is `true` (kern/config.ts, vlag-aanroep bij
   netwerkToegestaan).

   Gemeten op 31 oktober 2026: twee toetsen in
   test/eenheid/volledigetekst.test.ts deden daardoor bij elke lokale
   run een echte HTTPS-aanvraag naar www.acm.nl — 895 ms en 660 ms, met
   HTTP 404 als antwoord. Ze waren groen om de verkeerde reden: de
   assertie vroeg alleen OF er een reden was, niet WELKE. In CI waren ze
   groen om de juiste reden, want de werkstroom zet de vlag zelf op 0.
   Precies het soort verschil tussen lokaal en CI dat je niet wilt.

   Deze preambule wordt met `--import` geladen vóór elk testbestand, dus
   de grens hangt niet langer aan de discipline van wie de toets
   schrijft. Wil een toets echt verkeer, dan zet hij de vlag expliciet
   zelf om en legt in zijn commentaar uit waarom dat verantwoord is.

   Niet overschrijven wat al bewust gezet is: staat de variabele al,
   dan laat de preambule hem staan. Anders kan een bewuste meting niet
   meer bestaan.
   ============================================================ */

if (process.env["INTEL_NETWERK_TOEGESTAAN"] === undefined) {
  process.env["INTEL_NETWERK_TOEGESTAAN"] = "0";
}
