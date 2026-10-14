/* ============================================================
   TEST — alleen GEZAGHEBBEND bewijs mag een bewaard feit veranderen
   ------------------------------------------------------------
   DE OPDRACHT: corrigeer uitsluitend feiten waarvoor gezaghebbend
   bronbewijs beschikbaar is, en laat onzekere correcties GEBLOKKEERD.

   Tot 3.0.7 was `herstelSchaal(toepassen:true)` alles-of-niets: elke
   gedetecteerde correctie werd aangebracht. Het oordeel staat NA de
   detectie, dus het kan alleen minder toepassen en nooit meer.

   DE VIER ECHTE GEVALLEN. Op productie stonden vier correcties open. Ze
   zijn op 14 oktober 2026 bij de ORIGINELE uitgever nagetrokken, niet
   bij een overnemer:

     uitspraak 12 en 13 — Netbeheer Nederland, 14 september 2026,
       "Nettarieven 2027 stijgen maar slimme keuzes kunnen stijging
       remmen". Letterlijk, één zin met beide getallen:
         "gerichte keuzes van de overheid de investeringsopgave van
          EUR235 miljard tot 2040 met circa EUR33 miljard kunnen
          beperken"

     uitspraak 3 en 4 — RVO, jaarverslag MIA\\Vamil 2025,
       "In 2025 ruim EUR 3 miljard aan milieu-investeringen met
       belastingvoordeel". Eén keer uit de TITEL en één keer uit de
       BODY: dat is EEN feit in TWEE rijen, met dezelfde bronversie.

   WAT HET OORDEEL NIET BEOORDEELT. Of een bedrag voorwaardelijk is
   ("kunnen beperken") of een ondergrens ("ruim"), is een
   verwoordbaarheidsvraag. Een schaalcorrectie haalt een ONWAAR GETAL uit
   de rijenstroom; ze maakt geen publiceerbaar feit. Dat onderscheid
   staat ook in de kop van schaalcorrectie.ts en toets 9 hieronder legt
   het vast.
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import {
  beoordeelSchaalbewijs,
  vindSchaalverlies,
  type Bewijsoordeel,
} from "../../src/pijplijn/schaalcorrectie.ts";

/* De letterlijke bronzinnen. Niet de afgekapte logfragmenten: die zijn
   DUBBEL vervormd (een venster van plus-minus 40 tekens rond de match,
   daarna nog eens afgekapt op 70), en meten op een venster geeft
   aantoonbaar een valse positief. Zie toets 5. */
const NETBEHEER =
  "Volgens het IBO Bekostiging Elektriciteitsinfrastructuur kunnen gerichte keuzes van " +
  "de overheid de investeringsopgave van €235 miljard tot 2040 met circa €33 miljard " +
  "kunnen beperken.";
const RVO_TITEL = "In 2025 ruim € 3 miljard aan milieu-investeringen met belastingvoordeel MIA/Vamil.";

/** Een gezonde invoer waar elke toets precies één ding van afwijkt. */
function invoer(over: Partial<Parameters<typeof beoordeelSchaalbewijs>[0]> = {}) {
  return beoordeelSchaalbewijs({
    tekst: NETBEHEER,
    oudeWaarde: 235,
    eenheid: "EUR",
    fenomeen: "netinvestering",
    horizon: "tot 2040",
    periode: null,
    isPrimaireBron: true,
    ...over,
  });
}

const redenen = (o: Bewijsoordeel) => o.redenen.join(" | ");

describe("het bewijsoordeel op een schaalcorrectie", () => {
  test("1. de €235 miljard van Netbeheer Nederland is GEZAGHEBBEND", () => {
    const o = invoer();
    assert.equal(o.klasse, "GEZAGHEBBEND", redenen(o));
    assert.match(redenen(o), /miljard/, "de grondslag hoort het schaalwoord te noemen");
    assert.match(redenen(o), /tot 2040/, "de tijdgrens hoort navraagbaar te zijn");
    assert.match(redenen(o), /PRIMAIRE bron/);
  });

  test("2. de circa €33 miljard uit dezelfde zin is ook GEZAGHEBBEND", () => {
    /* Twee verschillende feiten in ÉÉN zin, en dat is precies waarom de
       detectie op de WAARDE werkt en niet op de zin: op tekst alleen
       zouden deze twee niet te scheiden zijn. */
    const o = invoer({ oudeWaarde: 33 });
    assert.equal(o.klasse, "GEZAGHEBBEND", redenen(o));
    const verlies = vindSchaalverlies(NETBEHEER, 33);
    assert.ok(verlies);
    assert.equal(verlies.nieuweWaarde, 33_000_000_000);
  });

  test("3. de €3 miljard van RVO is GEZAGHEBBEND op een PERIODE in plaats van een horizon", () => {
    const o = invoer({
      tekst: RVO_TITEL,
      oudeWaarde: 3,
      fenomeen: "subsidiebudget",
      horizon: null,
      periode: "in 2025",
    });
    assert.equal(o.klasse, "GEZAGHEBBEND", redenen(o));
    assert.match(redenen(o), /periode 'in 2025'/);
  });

  test("4. een tijdgebonden fenomeen ZONDER tijdgrens is ONZEKER", () => {
    const o = invoer({ horizon: null, periode: null });
    assert.equal(o.klasse, "ONZEKER");
    assert.match(
      redenen(o),
      /geen horizon en geen periode/,
      `de reden hoort de ontbrekende tijdgrens te noemen: ${redenen(o)}`,
    );
  });

  test("5. DE VENSTERVAL: een treffer op een afgekapt fragment is geen bewijs", () => {
    /* GEMETEN, en dit is de hele reden dat het oordeel op de VOLLEDIGE
       tekst herrekent. De linkergrens van vindSchaalverlies kan niet
       kijken naar tekens die door een venster zijn weggesneden; aan het
       begin van een string slaagt de lookbehind altijd. Dat is dezelfde
       klasse fout als de parserbug die in PR #28 is gerepareerd, nu
       veroorzaakt door de MEETMETHODE. */
    const heel = "De opgave bedraagt 1235 miljard eenheden volgens het rapport.";
    assert.equal(
      vindSchaalverlies(heel, 235),
      null,
      "op de volledige tekst hoort 235 geen treffer te zijn: er staat 1235",
    );
    const venster = heel.slice(20);
    assert.ok(
      vindSchaalverlies(venster, 235),
      "op het VENSTER geeft dezelfde aanroep wel een treffer — dat is de val",
    );

    const o = invoer({ tekst: heel, eenheid: "MWh", fenomeen: null });
    assert.equal(o.klasse, "ONZEKER");
    assert.match(redenen(o), /VOLLEDIGE uitspraaktekst/);
  });

  test("6. zonder PRIMAIRE bron is het ONZEKER", () => {
    /* Een overnemer kan het getal verkeerd hebben overgeschreven. Dan
       corrigeren we een fout naar een andere fout. */
    const o = invoer({ isPrimaireBron: false });
    assert.equal(o.klasse, "ONZEKER");
    assert.match(redenen(o), /niet aan een primaire bron/);
  });

  test("7. een percentage of een lege eenheid is ONZEKER", () => {
    const procent = invoer({ tekst: "De tarieven stijgen 8 miljard procent.", oudeWaarde: 8, eenheid: "%" });
    assert.equal(procent.klasse, "ONZEKER");
    assert.match(redenen(procent), /geen geld-, energie- of vermogenseenheid/);

    const leeg = invoer({ eenheid: null });
    assert.equal(leeg.klasse, "ONZEKER");
    assert.match(redenen(leeg), /geen eenheid/);
  });

  test("8. 'biljoen' wordt nu wel gevlagd", () => {
    /* Het stond niet in SCHAALFACTOR, terwijl uitdrukking.ts het kende
       en rijmtMetUitdrukking() er ook op toetste. Een
       biljoen-schaalverlies werd dus nooit gedetecteerd. */
    const zin = "Tot 2040 investeren de netbeheerders in Europa meer dan €1 biljoen in het net.";
    const v = vindSchaalverlies(zin, 1);
    assert.ok(v, "een biljoen naast het getal hoort gedetecteerd te worden");
    assert.equal(v.schaalwoord, "biljoen");
    assert.equal(v.nieuweWaarde, 1e12);
  });

  test("9. het oordeel gaat over de SCHAAL, niet over de bewering", () => {
    /* De €33 miljard is voorwaardelijk ("kunnen beperken") en benaderd
       ("circa"), en de €3 miljard is een ondergrens ("ruim"). Alle drie
       blijven GEZAGHEBBEND voor de schaal: de bron zegt letterlijk dat
       bedrag. Of de BEWERING publiceerbaar is, beslist de
       verwoordbaarheidspoort — en op productie is gemeten dat de
       gecorrigeerde rijen daar op CONTEXT_ONVOLLEDIG uitkomen. Een
       correctie haalt een onwaar getal weg; ze levert geen feit op.

       Deze toets bestaat zodat niemand het oordeel later uitbreidt met
       een modaliteitscontrole en zo twee vragen in één functie legt. */
    assert.equal(invoer({ oudeWaarde: 33 }).klasse, "GEZAGHEBBEND");
    assert.equal(
      invoer({ tekst: RVO_TITEL, oudeWaarde: 3, fenomeen: "subsidiebudget", horizon: null, periode: "in 2025" })
        .klasse,
      "GEZAGHEBBEND",
    );
    /* En de modaliteit mag de UITKOMST niet veranderen. Dezelfde zin met
       en zonder 'circa'/'kunnen' hoort dezelfde klasse te geven. Dat is
       de meting; een assertie op de reden TEKST zou hier falen omdat de
       grondslag het bronfragment letterlijk citeert, en daarin staan die
       woorden gewoon. */
    const zonderModaliteit = invoer({
      tekst: "Volgens het IBO bedraagt de investeringsopgave €235 miljard tot 2040.",
    });
    assert.equal(
      zonderModaliteit.klasse,
      invoer().klasse,
      "het weghalen van 'kunnen' en 'circa' hoort de bewijsklasse niet te veranderen",
    );
  });
});
