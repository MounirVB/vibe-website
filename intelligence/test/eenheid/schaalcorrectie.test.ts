/* ============================================================
   EENHEID — schaalverliesdetectie
   ------------------------------------------------------------
   De poort die '€200 miljard' van '€200' onderscheidt. Hij moet twee
   dingen kunnen: het verlies vinden waar het echt is, en er NIET
   overheen vlaggen waar het getal zijn eigen schaal niet mist.
   ============================================================ */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { vindSchaalverlies } from "../../src/pijplijn/schaalcorrectie.ts";

describe("vindSchaalverlies", () => {
  it("vindt het schaalwoord dat direct naast het getal staat", () => {
    const r = vindSchaalverlies(
      "Tot 2040 investeren de netbeheerders meer dan €200 miljard in het elektriciteitsnet.",
      200,
    );
    assert.ok(r);
    assert.equal(r.schaalwoord, "miljard");
    assert.equal(r.nieuweWaarde, 200_000_000_000);
  });

  it("kiest per getal het JUISTE schaalwoord als er twee in één zin staan", () => {
    /* Gemeten geval: gebeurtenis 40 noemt €235 miljard en €33 miljard
       in dezelfde zin. Elke uitspraak hoort zijn eigen schaalwoord te
       krijgen, niet het eerste dat in de zin voorkomt. */
    const zin =
      "Uit het IBO blijkt dat gerichte keuzes de investeringsopgave van €235 miljard " +
      "tot 2040 met circa €33 miljoen kunnen beperken.";
    const a = vindSchaalverlies(zin, 235);
    const b = vindSchaalverlies(zin, 33);
    assert.equal(a?.schaalwoord, "miljard");
    assert.equal(a?.nieuweWaarde, 235_000_000_000);
    assert.equal(b?.schaalwoord, "miljoen");
    assert.equal(b?.nieuweWaarde, 33_000_000);
  });

  it("vlagt een percentage NIET in een zin die verder over miljarden gaat", () => {
    /* Dit is de valse positieve die de oude poort maakte: hij zocht
       'miljard' ergens in de tekst en keurde daarmee een correcte
       percentage-uitspraak af. Zo'n afwijzing kost een goed voorstel. */
    const r = vindSchaalverlies(
      "De netbeheerders investeren €200 miljard in het net; het nettarief stijgt met 8%.",
      8,
    );
    assert.equal(r, null);
  });

  it("ziet een getal binnen een jaartal niet als het getal zelf", () => {
    /* '3' zit in '2035'. Zonder grens zou een uitspraak met waarde 3
       het schaalwoord van een heel ander getal oppikken. */
    const r = vindSchaalverlies("In 2035 is er 3 GW aan opslag nodig, naast 12 miljard euro.", 3);
    assert.equal(r, null);
  });

  it("vlagt niet wanneer de schaal al in de waarde zit", () => {
    const r = vindSchaalverlies("De netbeheerders investeren €200 miljard in het net.", 200_000_000_000);
    assert.equal(r, null);
  });

  it("leest witruimte tussen bedrag en schaalwoord", () => {
    const r = vindSchaalverlies("In 2025 ruim € 3 miljard aan milieu-investeringen.", 3);
    assert.equal(r?.nieuweWaarde, 3_000_000_000);
  });

  it("kent de afkortingen mln en mld", () => {
    assert.equal(vindSchaalverlies("een budget van 125 mln euro", 125)?.nieuweWaarde, 125_000_000);
    assert.equal(vindSchaalverlies("een opgave van 9 mld euro", 9)?.nieuweWaarde, 9_000_000_000);
  });

  it("leest de Nederlandse duizendpunt en decimaalkomma", () => {
    assert.equal(vindSchaalverlies("ruim 1.200 miljoen kubieke meter", 1200)?.nieuweWaarde, 1.2e9);
    assert.equal(vindSchaalverlies("circa 3,5 miljard euro", 3.5)?.nieuweWaarde, 3.5e9);
  });

  it("levert een vindplaats uit de brontekst als bewijs", () => {
    const r = vindSchaalverlies("Bedrijven maakten in 2025 voor ruim € 3 miljard gebruik van MIA.", 3);
    assert.ok(r);
    assert.match(r.vindplaats, /€ 3 miljard/);
  });

  it("vlagt niets zonder schaalwoord naast het getal", () => {
    assert.equal(vindSchaalverlies("Het nettarief daalt met 10% in 2026.", 10), null);
    assert.equal(vindSchaalverlies("Een batterij van 2 MW en 4 MWh.", 2), null);
  });
});
