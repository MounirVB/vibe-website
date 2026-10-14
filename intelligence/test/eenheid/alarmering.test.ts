/* ============================================================
   EENHEID — planningsbewaking, back-upidempotentie en de geldpoort
   ------------------------------------------------------------
   WAAROM DIT BESTAND BESTAAT — drie gemeten situaties.

   1 EEN GEMISTE RESTORETESTRONDE ZOU VIER WEKEN ONZICHTBAAR ZIJN. Het
     signaal `backup/restoretest` reageert op een drempel van 30 dagen.
     Dat is de juiste drempel voor BEWIJS en de verkeerde voor de
     PLANNING: valt de wekelijkse ronde stil, dan merkt niemand het een
     maand lang.

   2 EEN HERSTART KAN EEN TWEEDE DUMP MAKEN. De keten staat in de code:
     `geefVerlopenTerug()` legt een taak terug zonder `beschikbaar_op`
     vooruit te zetten en zonder `pogingen` te verhogen, en `pakTaak()`
     kent geen pogingenplafond — dat zit alleen in `laatMislukken`, dat
     enkel draait als de handler WERPT. Gemeten: exact drie
     back-uptaken, een per dag, alle met `pogingen = 1`. Het mechanisme
     is echt, de gebeurtenis is niet aangetoond.

   3 DE GELDPOORT HEEFT PRECIES EEN AANROEPPLEK. `budgetStand()` wordt
     op één plek vóór een betaalde modelaanroep gecontroleerd
     (inhoud/concept.ts). Komt er een tweede AI-proces, dan is er niets
     dat het door die poort dwingt.

   DE E-MAILALARMERING ZELF STAAT HIER NIET. Die komt uit release 3.0.9
   (#35): ops/meldmail.ts, ops/meldernst.ts en intel.meld_berichten, met
   eigen toetsen in test/eenheid/meldmail.test.ts. Wat deze release daar
   wél aan toevoegt is één regel in `bundelVan()` — het vastgelegde
   bronfeit gaat voor de tekstvondst — en dat wordt onderaan gegrendeld.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  backupStandVoorPeriode,
  beoordeelPlanning,
  laatsteVerschuldigdMoment,
  RESTORETESTRONDE_VANAF,
} from "../../src/ops/restorebewijs.ts";

describe("de wekelijkse planning bewaken", () => {
  const REGEL = { weekdagUtc: 0, vanafUurUtc: 3 };

  it("vóór de eerste afgesproken zondag is er niets verschuldigd", () => {
    assert.equal(laatsteVerschuldigdMoment(new Date("2026-10-15T12:00:00Z"), REGEL), null);
    const o = beoordeelPlanning({ nu: new Date("2026-10-15T12:00:00Z"), regel: REGEL, laatsteRonde: null });
    assert.equal(o.toestand, "NOG_NIET_VERSCHULDIGD");
    assert.match(o.grond, new RegExp(RESTORETESTRONDE_VANAF));
  });

  it("op de afgesproken zondag, binnen de marge, is er nog niets mis", () => {
    const o = beoordeelPlanning({ nu: new Date("2026-10-18T05:00:00Z"), regel: REGEL, laatsteRonde: null });
    assert.equal(o.toestand, "NOG_NIET_VERSCHULDIGD");
    assert.match(o.grond, /binnen de marge/);
  });

  it("NA de marge zonder ronde is hij GEMIST — op dezelfde zondag", () => {
    /* Dit is de hele reden dat dit signaal bestaat: met alleen het
       bewijssignaal (drempel 30 dagen) zou een gemiste ronde vier weken
       onzichtbaar zijn. */
    const o = beoordeelPlanning({ nu: new Date("2026-10-18T10:00:00Z"), regel: REGEL, laatsteRonde: null });
    assert.equal(o.toestand, "GEMIST");
    assert.match(o.grond, /nooit een ronde gedraaid/);
  });

  it("een ronde in de wachtrij of bezig is LOOPT, en dat gaat vóór alles", () => {
    for (const status of ["wachtend", "bezig"]) {
      const o = beoordeelPlanning({
        nu: new Date("2026-10-18T23:00:00Z"),
        regel: REGEL,
        laatsteRonde: { status, venster: "2026-10-18", aangemaaktOp: "2026-10-18T03:00:00Z" },
      });
      assert.equal(o.toestand, "LOOPT", status);
    }
  });

  it("een geslaagde ronde van DEZE week is GEREED", () => {
    const o = beoordeelPlanning({
      nu: new Date("2026-10-18T10:00:00Z"),
      regel: REGEL,
      laatsteRonde: { status: "gereed", venster: "2026-10-18", aangemaaktOp: "2026-10-18T03:00:00Z" },
    });
    assert.equal(o.toestand, "GEREED");
  });

  it("een geslaagde ronde van VORIGE week dekt deze week niet", () => {
    const o = beoordeelPlanning({
      nu: new Date("2026-10-25T10:00:00Z"),
      regel: REGEL,
      laatsteRonde: { status: "gereed", venster: "2026-10-18", aangemaaktOp: "2026-10-18T03:00:00Z" },
    });
    assert.equal(o.toestand, "GEMIST");
    assert.match(o.grond, /'gereed' van 2026-10-18/);
  });

  it("een MISLUKTE ronde is MISLUKT en niet GEMIST", () => {
    for (const status of ["mislukt", "dlq"]) {
      const o = beoordeelPlanning({
        nu: new Date("2026-10-18T23:00:00Z"),
        regel: REGEL,
        laatsteRonde: { status, venster: "2026-10-18", aangemaaktOp: "2026-10-18T03:00:00Z" },
      });
      assert.equal(o.toestand, "MISLUKT", status);
    }
  });

  it("het verschuldigde moment is de LAATSTE zondag 03:00, niet de volgende", () => {
    const m = laatsteVerschuldigdMoment(new Date("2026-10-21T12:00:00Z"), REGEL);
    assert.equal(m?.toISOString(), "2026-10-18T03:00:00.000Z");
    /* Op zondag vóór 03:00 is de VORIGE zondag het laatste moment. */
    const n = laatsteVerschuldigdMoment(new Date("2026-10-25T02:00:00Z"), REGEL);
    assert.equal(n?.toISOString(), "2026-10-18T03:00:00.000Z");
  });
});

describe("de dagelijkse back-up: idempotent, maar herstel niet geblokkeerd", () => {
  const dag = "2026-10-14";
  const obj = (n: string) => ({ naam: n });

  it("een dump MET manifest betekent: al af, niets doen", () => {
    const s = backupStandVoorPeriode(
      [obj(`vibe-intel-${dag}T00-00-25.dump`), obj(`vibe-intel-${dag}T00-00-25.dump.manifest.json`)],
      dag,
    );
    assert.equal(s.alAf, true);
    assert.match(s.grond, /is af/);
  });

  it("een dump ZONDER manifest is GEEN back-up: de poging moet doorgaan", () => {
    /* Dit is de eis "zonder noodzakelijke herstelpogingen te
       blokkeren". Een halve dump is geen back-up, dus een tweede
       poging is niet overbodig maar nodig. */
    const s = backupStandVoorPeriode([obj(`vibe-intel-${dag}T00-00-25.dump`)], dag);
    assert.equal(s.alAf, false);
    assert.match(s.grond, /noodzakelijke herstelpoging/);
    assert.deepEqual([...s.halfAfgebroken], [`vibe-intel-${dag}T00-00-25.dump`]);
  });

  it("geen dump van vandaag: gewoon doen", () => {
    const s = backupStandVoorPeriode([obj("vibe-intel-2026-10-13T00-02-58.dump"), obj("vibe-intel-2026-10-13T00-02-58.dump.manifest.json")], dag);
    assert.equal(s.alAf, false);
    assert.match(s.grond, /geen dump voor 2026-10-14/);
  });

  it("een dump van een ANDERE dag maakt vandaag niet af", () => {
    const s = backupStandVoorPeriode([obj("vibe-intel-2026-10-13T00-02-58.dump")], dag);
    assert.equal(s.alAf, false);
  });

  it("twee dumps van vandaag waarvan één compleet: al af, met de halve erbij genoemd", () => {
    /* De gemeten situatie van 14 oktober: er staat een dump van 00:00
       en een van 03:48. Zou de tweede geen manifest hebben, dan hoort
       dat zichtbaar te zijn zonder dat er een derde bij komt. */
    const s = backupStandVoorPeriode(
      [
        obj(`vibe-intel-${dag}T00-00-25.dump`),
        obj(`vibe-intel-${dag}T00-00-25.dump.manifest.json`),
        obj(`vibe-intel-${dag}T03-48-19.dump`),
      ],
      dag,
    );
    assert.equal(s.alAf, true);
    assert.equal(s.halfAfgebroken.length, 1);
    assert.match(s.grond, /half afgebroken/);
  });
});

describe("structurele grendels", () => {
  it("elke modelaanroep gaat door de GELDPOORT", () => {
    /* GEMETEN: er is precies één plek die `provider.genereer(` aanroept
       (inhoud/concept.ts), en daar wordt `budgetStand()` ervóór
       gecontroleerd. Die poort weigert een BETAALDE aanroep zolang er
       geen monetair maandplafond is — daarom kan een AI-proces nu geen
       onbeperkte kosten maken.

       Komt er een tweede aanroepplek zonder die controle, dan is die
       bescherming weg en valt geen enkele gedragstoets om. Vandaar deze
       grendel: elk bestand dat een model aanroept, moet in hetzelfde
       bestand budgetStand gebruiken. */
    const bestanden = ["src/inhoud/concept.ts", "src/inhoud/model.ts"];
    let aanroepplekken = 0;
    for (const b of bestanden) {
      const t = readFileSync(new URL(`../../${b}`, import.meta.url), "utf8");
      const n = (t.match(/\bprovider\.genereer\(/g) ?? []).length;
      if (n === 0) continue;
      aanroepplekken += n;
      assert.match(
        t,
        /budgetStand\(/,
        `${b} roept een model aan zonder budgetStand() in hetzelfde bestand`,
      );
      assert.match(t, /if \(!budget\.mag\)/, `${b} controleert de uitkomst van budgetStand niet`);
    }
    assert.equal(aanroepplekken, 1, `verwachtte precies één aanroepplek, vond ${aanroepplekken}`);
  });

  it("de geldpoort weigert een BETAALDE aanroep zonder monetair maandplafond", () => {
    const t = readFileSync(new URL("../../src/ops/aibeheer.ts", import.meta.url), "utf8");
    assert.match(
      t,
      /betaald && stand\.maandKosten\.plafond === null/,
      "de regel 'geen monetair plafond, dus geen betaalde aanroep' is weg",
    );
    assert.match(
      t,
      /onbekendeAanroepen > 0/,
      "de regel 'onbekende kosten maken het plafond onhandhaafbaar' is weg",
    );
  });

  it("het vastgelegde bronfeit gaat VOOR de tekstvondst in de bundeling", () => {
    /* De bundeling van 3.0.9 (#35) leest de bronsleutel met een regex
       uit de meettekst. Die tekst wordt bij alle drie de
       ingestiesignalen afgekapt op 160 tekens, dus een signaal over
       VIJF bronnen kan er één tonen — en dan zou de bundel beweren dat
       twee signalen dezelfde oorzaak hebben zonder dat dat vaststaat.

       Deze release zet daar `Signaal.bron` voor: een feit uit de
       TELLING. Een gedragstoets dekt dit niet volledig, want de regex
       blijft bestaan als terugval; daarom een grendel op de ORDE. */
    const t = readFileSync(new URL("../../src/ops/meldernst.ts", import.meta.url), "utf8");
    const iFeit = t.indexOf("if (s.bron && s.bron.trim())");
    const iRegex = t.indexOf("matchAll(BRONSLEUTEL)");
    assert.ok(iFeit > 0, "de voorkeur voor het vastgelegde bronfeit is weg");
    assert.ok(iRegex > 0, "de regexterugval is weg");
    assert.ok(iFeit < iRegex, "de tekstvondst staat VOOR het feit; dan is het feit nutteloos");

    /* En het feit moet ook echt gezet worden, op precies de drie
       signalen waar het over een enkele bron kan gaan. */
    const g = readFileSync(new URL("../../src/ops/gezondheid.ts", import.meta.url), "utf8");
    assert.match(g, /bron: \(b\?\.met_fouten \?\? 0\) === 1/, "opeenvolgende fouten zet geen bron");
    assert.match(g, /bron: st\.aantal === 1/, "storingssoort zet geen bron");
    assert.match(g, /dekking\.perKlasse\.FAILED === 1/, "brondekking zet geen bron");
  });

  it("de bundeling leest het feit alleen als er PRECIES EEN bron is", () => {
    /* De tegenproef op de code die het feit zet: bij meer dan een bron
       moet het veld LEEG blijven, want dan is er geen gedeelde oorzaak
       maar een lijst. */
    const g = readFileSync(new URL("../../src/ops/gezondheid.ts", import.meta.url), "utf8");
    for (const re of [/=== 1 \? \(b\?\.sleutels_met_fouten \|\| undefined\) : undefined/, /st\.aantal === 1 \? \(st\.sleutels \|\| undefined\) : undefined/]) {
      assert.match(g, re, "het bronveld wordt ook bij meerdere bronnen gezet");
    }
  });

});
