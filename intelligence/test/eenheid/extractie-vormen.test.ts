/* ============================================================
   EENHEID — de getalvormen die de extractie liet liggen
   ------------------------------------------------------------
   GEMETEN OP DE ECHTE BRONTEKST, 5 november 2026. Tien claimloze
   gebeurtenissen van samen 85.000 tekens uit netbeheer-nederland-nieuws
   leverden samen NUL ruwe uitspraken, terwijl er feiten in stonden:

     "Het uitvoeren van alle IBO-maatregelen kan tot 30 miljard euro
      besparen."
     "Netbeheerders investeren tot 2040 meer dan 200 miljard euro."
     "De tarieven voor grootverbruikers dalen in 2026 met 12 procent."

   Twee oorzaken, en geen van beide was een ontwerpkeuze.

   1 DE PLAATS VAN HET SCHAALWOORD. Het euro-patroon kende '€200
     miljard' (symbool, getal, schaal) en '200 euro miljard' (een vorm
     die niemand schrijft), maar niet '200 miljard euro' — getal,
     schaal, dan het woord. Dat is juist de dominante Nederlandse vorm.

   2 HET WOORD NAAST HET TEKEN. '%' stond in EENHEDEN, 'procent' niet,
     terwijl deze bronnen het even vaak uitschrijven.

   DIT WAS EEN ASYMMETRIE, GEEN ONTBREKENDE FUNCTIE. uitdrukking.ts
   kende de vorm '200 miljoen euro' al, en kende 'biljoen' en 'mille'
   die in uitspraken.ts ontbraken. semantiek.ts laat die twee lagen
   elkaar KRUISCONTROLEREN via rijmtMetUitdrukking() — en als de ene
   laag een vorm of een schaalwoord niet kent dat de andere wel kent,
   valt een correct geëxtraheerd bedrag af omdat de twee lagen een
   ander woordenboek hebben.

   De zaken hieronder zetten beide richtingen vast: de nieuwe vormen
   moeten gevonden worden, en de oude vormen moeten BLIJVEN werken —
   want dat patroon is twee keer eerder gerepareerd en elke reparatie
   introduceerde bijna een nieuwe factorfout.
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import { extraheerUitspraken } from "../../src/pijplijn/uitspraken.ts";
import { leesUitdrukkingen } from "../../src/pijplijn/uitdrukking.ts";

/** De numerieke waarden die de extractie uit één zin haalt. */
function waarden(zin: string): number[] {
  return extraheerUitspraken("", zin)
    .map((u) => u.waardeNumeriek)
    .filter((v): v is number => v !== null);
}

describe("de getalvormen die de extractie liet liggen", () => {
  /* ---------- de nieuwe vorm: getal, schaal, euro ---------- */

  test("1 · '30 miljard euro' levert 30 miljard, niet 30", () => {
    /* LETTERLIJK DE ZIN UIT GEBEURTENIS 118. Vóór deze reparatie: nul
       uitspraken uit een document van 10.040 tekens. */
    const w = waarden("Het uitvoeren van alle IBO-maatregelen kan tot 30 miljard euro besparen.");
    assert.ok(w.includes(30_000_000_000), `gevonden: [${w.join(", ")}]`);
    assert.ok(!w.includes(30), "30 zonder schaal zou een factor miljard ernaast zijn");
  });

  test("1b · '200 miljard euro' idem", () => {
    const w = waarden("Netbeheerders investeren tot 2040 meer dan 200 miljard euro in het net.");
    assert.ok(w.includes(200_000_000_000), `gevonden: [${w.join(", ")}]`);
  });

  test("1c · 'EUR 125 miljoen' met de spelling EUR", () => {
    /* uitdrukking.ts accepteerde al drie spellingen (€, EUR, euro);
       uitspraken.ts maar twee. */
    const w = waarden("Structureel EUR 125 miljoen per jaar is toegezegd.");
    assert.ok(w.includes(125_000_000), `gevonden: [${w.join(", ")}]`);
  });

  test("1d · 'biljoen' wordt nu ook gelezen", () => {
    /* STOND IN uitdrukking.ts EN IN schaalcorrectie.ts, maar niet hier.
       Een schaalwoord dat de ene laag kent en de andere niet is precies
       de asymmetrie die de kruiscontrole onbruikbaar maakt. */
    const w = waarden("De totale opgave loopt op tot 1 biljoen euro.");
    assert.ok(w.includes(1_000_000_000_000), `gevonden: [${w.join(", ")}]`);
  });

  /* ---------- het woord 'procent' ---------- */

  test("2 · '12 procent' levert 12 met eenheid %", () => {
    const u = extraheerUitspraken("", "De tarieven voor grootverbruikers dalen in 2026 met 12 procent.");
    const p = u.find((x) => x.waardeNumeriek === 12);
    assert.ok(p !== undefined, `gevonden: ${JSON.stringify(u.map((x) => x.waardeNumeriek))}`);
    assert.equal(p?.eenheid, "%", "het woord hoort dezelfde eenheid te geven als het teken");
    assert.equal(p?.soort, "cijfer");
  });

  test("2b · een decimaal percentage in woorden: '19,4 procent'", () => {
    /* UIT GEBEURTENIS 59, letterlijk. */
    const w = waarden("Zonne-energie was in 2025 goed voor 19,4 procent van de Nederlandse elektriciteitsproductie.");
    assert.ok(w.includes(19.4), `gevonden: [${w.join(", ")}]`);
  });

  test("2c · '99,99 procent' blijft 99,99 en wordt geen 99", () => {
    const w = waarden("Netbeheerders houden de betrouwbaarheid op ruim 99,99 procent.");
    assert.ok(w.includes(99.99), `gevonden: [${w.join(", ")}]`);
  });

  test("2d · het TEKEN blijft onveranderd werken", () => {
    const w = waarden("De tarieven stijgen met 12%.");
    assert.ok(w.includes(12), `gevonden: [${w.join(", ")}]`);
  });

  /* ---------- de oude vormen mogen niet breken ----------
     Dit patroon is twee keer eerder gerepareerd en bij beide keren lag
     een factorfout op de loer. Deze zaken zijn de regressiegrens. */

  test("3 · '164,09 euro' blijft 164,09 en wordt geen 9", () => {
    /* DE GEMETEN FOUT UIT EEN EERDERE RONDE: '164.09 euro' leverde
       '9 EUR', een factor 18 eraf met de hoogste bewijskwaliteit die
       dit systeem kent. */
    const w = waarden("Een tarief van 164,09 euro per maand.");
    assert.ok(w.includes(164.09), `gevonden: [${w.join(", ")}]`);
    assert.ok(!w.includes(9), "9 zou de oude afkapfout zijn");
    assert.ok(!w.includes(164), "164 zou het decimaaldeel verliezen");
  });

  test("3b · '€200 miljard' blijft werken (symbool eerst)", () => {
    const w = waarden("De investering bedraagt €200 miljard.");
    assert.ok(w.includes(200_000_000_000), `gevonden: [${w.join(", ")}]`);
  });

  test("3c · '1.250 euro' leest de duizendscheiding", () => {
    const w = waarden("Een bedrag van 1.250 euro per aansluiting.");
    assert.ok(w.includes(1250), `gevonden: [${w.join(", ")}]`);
    assert.ok(!w.includes(250), "250 zou de duizendscheiding verliezen");
  });

  test("3d · '1.250,5 kW' houdt zowel de duizendscheiding als de decimaal", () => {
    const w = waarden("Het vermogen is 1.250,5 kW.");
    assert.ok(w.includes(1250.5), `gevonden: [${w.join(", ")}]`);
  });

  test("3e · '849 MW' blijft onveranderd", () => {
    const u = extraheerUitspraken("", "De aansluitcapaciteit bedraagt 849 MW.");
    const c = u.find((x) => x.waardeNumeriek === 849);
    assert.equal(c?.eenheid, "MW");
  });

  /* ---------- de kruiscontrole moet nu RIJMEN ---------- */

  test("4 · de twee lagen komen op DEZELFDE waarde uit", () => {
    /* DIT IS WAAROM DE ASYMMETRIE ERTOE DEED. semantiek.ts houdt de
       uitkomst van uitspraken.ts tegen die van uitdrukking.ts aan. Zou
       de ene laag 30 zeggen en de andere 30 miljard, dan valt de claim
       af op een verschil tussen twee lagen in plaats van op een fout in
       de bron. */
    for (const zin of [
      "Het uitvoeren van alle IBO-maatregelen kan tot 30 miljard euro besparen.",
      "Structureel EUR 125 miljoen per jaar is toegezegd.",
      "De investering bedraagt €200 miljard.",
      "Een bedrag van 1.250 euro per aansluiting.",
    ]) {
      const uit = extraheerUitspraken("", zin)
        .map((u) => u.waardeNumeriek)
        .filter((v): v is number => v !== null);
      const expr = leesUitdrukkingen(zin);
      assert.ok(expr.length > 0, `uitdrukking.ts leest niets uit: ${zin}`);
      for (const e of expr) {
        assert.ok(
          uit.includes(e.waarde),
          `de lagen wijken af: uitspraken [${uit.join(", ")}] tegen uitdrukking ${e.waarde} — ${zin}`,
        );
      }
    }
  });

  /* ---------- wat er met opzet NIET bijkomt ---------- */

  test("5 · getallen IN WOORDEN worden niet geëxtraheerd, en dat is een keuze", () => {
    /* GEMETEN: gebeurtenis 84 schrijft "tien tot vijftien jaar",
       "zestig jaar", "levensduur – vijftig jaar". Die omzetten vraagt
       een woordenboek én een bereikbeslissing ("tien tot vijftien" is
       geen waarde maar een bereik), en een verkeerde gok levert een
       getal dat niemand in de bron kan terugvinden.

       Deze zaak legt de GRENS vast, niet een gebrek. Wie hem later
       verlegt, ziet hier waarom hij er stond. */
    assert.deepEqual(waarden("Een netaansluiting kan technisch gezien wel zestig jaar mee."), []);
    assert.deepEqual(waarden("Na een concessieperiode van tien tot vijftien jaar wisselt de exploitant."), []);
  });

  test("5b · een JAARTAL alleen is geen datumclaim", () => {
    /* "vanaf 2029" draagt geen dag en geen maand. Als datumclaim zou
       hij niets zeggen over wat er op welke dag geldt, en de
       verwoordbaarheidspoort kan er niets mee. */
    assert.deepEqual(waarden("De normering van de hybride warmtepomp gaat vanaf 2029 gelden."), []);
  });

  test("5c · een KLOKTIJD is geen hoeveelheid", () => {
    /* "tussen 16 en 21 uur" is een tijdvak, geen grootheid. Als
       'cijfer' met eenheid uur zou het een duur beweren die er niet
       staat. */
    const w = waarden("Vooral tussen 16 en 21 uur gebruiken veel mensen tegelijk stroom.");
    assert.ok(!w.includes(16) && !w.includes(21), `gevonden: [${w.join(", ")}]`);
  });
});

describe("de modelkeuze weigert een bewegende alias", () => {
  test("6 · met een sleutel maar een NIET-vastgepind model valt hij terug op deterministisch", async () => {
    /* GEMETEN OP 5 NOVEMBER 2026: INTEL_AI_MODEL heeft als DEFAULT
       'gpt-5', en isGepindModel() noemt die niet vastgezet. Zodra er
       een sleutel komt zou de eerste aanroep naar een bewegende alias
       gaan — en dan betekent dezelfde promptafdruk over tijd een ander
       model.

       Deze zaak is er om te voorkomen dat die weigering ooit weer een
       waarschuwing wordt. */
    const { kiesProvider, isGepindModel } = await import("../../src/inhoud/model.ts");
    const { configVergeten } = await import("../../src/kern/config.ts");
    const bewaard = {
      k: process.env["OPENAI_API_KEY"],
      m: process.env["INTEL_AI_MODEL"],
      p: process.env["INTEL_AI_PROVIDER"],
      n: process.env["INTEL_NETWERK_TOEGESTAAN"],
    };
    try {
      process.env["OPENAI_API_KEY"] = "sleutel-die-niet-gebruikt-wordt";
      process.env["INTEL_AI_PROVIDER"] = "openai";
      /* HET HARNAS ZET HET NETWERK UIT, en beschikbaar() meldt dat
         terecht als eerste reden — waardoor beide varianten
         deterministisch zouden opleveren en deze zaak niets zou
         onderscheiden. kiesProvider() doet zelf GEEN aanroep, dus de
         vlag hier omzetten verstuurt niets; hij wordt in finally
         teruggezet. */
      process.env["INTEL_NETWERK_TOEGESTAAN"] = "1";

      process.env["INTEL_AI_MODEL"] = "gpt-5";
      configVergeten();
      assert.equal(isGepindModel("gpt-5"), false, "een naam zonder versie is niet vastgepind");
      assert.equal(
        kiesProvider().naam,
        "deterministisch",
        "een bewegende alias hoort niet naar de echte provider te gaan",
      );

      process.env["INTEL_AI_MODEL"] = "gpt-5-mini-2026-08-01";
      configVergeten();
      assert.equal(isGepindModel("gpt-5-mini-2026-08-01"), true);
      assert.equal(kiesProvider().naam, "openai", "een vastgepinde versie mag wel");
    } finally {
      for (const [n, v] of [
        ["OPENAI_API_KEY", bewaard.k],
        ["INTEL_AI_MODEL", bewaard.m],
        ["INTEL_AI_PROVIDER", bewaard.p],
        ["INTEL_NETWERK_TOEGESTAAN", bewaard.n],
      ] as const) {
        if (v === undefined) delete process.env[n];
        else process.env[n] = v;
      }
      configVergeten();
    }
  });
});
