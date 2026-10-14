/* ============================================================
   EENHEID — alarmering, planningsbewaking en de geldpoort
   ------------------------------------------------------------
   WAAROM DIT BESTAND BESTAAT — drie gemeten situaties.

   1 TIEN OPEN MELDINGEN, NUL BEZORGD. Gemeten op productie, 14 oktober
     2026: tien open meldingen, de oudste sinds 12 oktober, alle met
     `bezorgpogingen = 0`. Er was geen bestemming, dus er is nooit iets
     verstuurd. Vier ervan zijn FOUT, zes NIET GEMETEN, en DRIE van die
     vier gaan over dezelfde bron:

       ingestie/brondekking                       "FAILED: rendo-nieuws"
       ingestie/bronnen met opeenvolgende fouten  "1 van 20 ... rendo-nieuws"
       ingestie/storingssoort TOEGANG_BEPERKT     "1 bron ... rendo-nieuws"

     Tien mails voor vier problemen, waarvan drie dezelfde blokkade, is
     geen alarmering maar ruis. De eigenaar verbood het expliciet.

   2 EEN GEMISTE RONDE ZOU VIER WEKEN ONZICHTBAAR ZIJN. Het signaal
     `backup/restoretest` reageert op een drempel van 30 dagen. Dat is
     de juiste drempel voor BEWIJS en de verkeerde voor de PLANNING.

   3 DE GELDPOORT HEEFT PRECIES EEN AANROEPPLEK. `budgetStand()` wordt
     op één plek vóór een betaalde modelaanroep gecontroleerd
     (inhoud/concept.ts). Komt er een tweede AI-proces, dan is er niets
     dat het door die poort dwingt.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  ACHTERSTANDSGRENS,
  alarmniveauVan,
  backoffSeconden,
  bouwBerichten,
  bundelVan,
  DIRECT,
  type TeBezorgen,
} from "../../src/ops/melden.ts";
import {
  backupStandVoorPeriode,
  beoordeelPlanning,
  laatsteVerschuldigdMoment,
  RESTORETESTRONDE_VANAF,
} from "../../src/ops/restorebewijs.ts";

let volgend = 1;
function melding(over: Partial<TeBezorgen> = {}): TeBezorgen {
  return {
    id: volgend++,
    sleutel: "ingestie/brondekking",
    groep: "ingestie",
    niveau: "FOUT",
    laatste_meting: "29 bronnen: SUCCESS 19, FAILED 1 — FAILED: rendo-nieuws",
    laatste_advies: "npm run bronaudit",
    geopend_op: "2026-10-13T15:00:00Z",
    keren_gezien: 14,
    bron_sleutel: "rendo-nieuws",
    ...over,
  };
}

describe("alarmniveau: wie gaat direct, wie wacht op de dagsamenvatting", () => {
  it("een storing in een KRITIEK domein is KRITIEK", () => {
    /* De kritieke DOMEINEN zijn database, authenticatie en backup
       (ops/ernst.ts). Maar een signaal draagt een GROEP, en die twee
       zijn niet hetzelfde: de groep van het authenticatiedomein heet
       `beveiliging`. Mijn eerste versie van deze toets gebruikte de
       domeinnaam en kreeg terecht WAARSCHUWING — de afbeelding staat in
       GROEP_DOMEIN en is hier nagemeten, niet aangenomen. */
    assert.equal(alarmniveauVan({ groep: "backup", niveau: "FOUT" }), "KRITIEK");
    assert.equal(alarmniveauVan({ groep: "database", niveau: "FOUT" }), "KRITIEK");
    assert.equal(alarmniveauVan({ groep: "beveiliging", niveau: "NIET GEMETEN" }), "KRITIEK");
    /* En een NIET GEMETEN back-upsignaal is óók kritiek: een back-up
       waarvan niemand weet of hij bestaat is net zo onbruikbaar als
       geen back-up. */
    assert.equal(alarmniveauVan({ groep: "backup", niveau: "NIET GEMETEN" }), "KRITIEK");
    /* De domeinnaam is GEEN groep; die valt terug op platform. */
    assert.equal(alarmniveauVan({ groep: "authenticatie", niveau: "NIET GEMETEN" }), "WAARSCHUWING");
  });

  it("een storing daarbuiten is FOUT", () => {
    assert.equal(alarmniveauVan({ groep: "ingestie", niveau: "FOUT" }), "FOUT");
    assert.equal(alarmniveauVan({ groep: "worker", niveau: "FOUT" }), "FOUT");
  });

  it("NIET GEMETEN buiten een kritiek domein is een WAARSCHUWING", () => {
    /* En dat is de kern van de ruisreductie: de zes NIET
       GEMETEN-meldingen die structureel openstaan gaan naar de
       dagsamenvatting en niet elk uur de deur uit. */
    assert.equal(alarmniveauVan({ groep: "koppelingen", niveau: "NIET GEMETEN" }), "WAARSCHUWING");
    assert.equal(alarmniveauVan({ groep: "ai", niveau: "NIET GEMETEN" }), "WAARSCHUWING");
    assert.equal(alarmniveauVan({ groep: "melden", niveau: "NIET GEMETEN" }), "WAARSCHUWING");
  });

  it("de drie directe niveaus zijn KRITIEK, FOUT en HERSTEL", () => {
    assert.deepEqual([...DIRECT].sort(), ["FOUT", "HERSTEL", "KRITIEK"]);
    assert.equal(DIRECT.has("WAARSCHUWING"), false, "een waarschuwing hoort te wachten");
  });
});

describe("back-off: 1, 4, 16, 64 minuten", () => {
  it("de wachttijd groeit exponentieel en vlakt af", () => {
    assert.equal(backoffSeconden(0), 0, "de eerste poging wacht niet");
    assert.equal(backoffSeconden(1), 60);
    assert.equal(backoffSeconden(2), 240);
    assert.equal(backoffSeconden(3), 960);
    assert.equal(backoffSeconden(4), 3840);
    assert.equal(backoffSeconden(9), 3840, "boven vier pogingen blijft de wachttijd gelijk");
  });

  it("factor vier en niet twee, want de gezondheidstaak draait per uur", () => {
    /* Met factor twee zou de vijfde poging na 1+2+4+8 = 15 minuten
       komen en zou de teller binnen een kwartier leeg zijn. Dan is de
       back-off een formaliteit. */
    const totaal = [1, 2, 3, 4].reduce((s, p) => s + backoffSeconden(p), 0);
    assert.ok(totaal > 3600, `vier pogingen horen meer dan een uur te overspannen, kreeg ${totaal}s`);
  });
});

describe("bundeling: drie signalen, één blokkade", () => {
  it("een vastgelegde bron levert een bundelsleutel", () => {
    assert.equal(bundelVan({ bron_sleutel: "rendo-nieuws" }), "bron rendo-nieuws");
  });

  it("geen bron betekent geen bundel", () => {
    /* De gezondheidsmeting zet `bron` ALLEEN als er aantoonbaar precies
       één bron in het spel is. Bij vijf bronnen — gemeten geval:
       `ingestie/toestemming niet vastgesteld` — blijft het veld leeg, en
       dan hoort er niets gebundeld te worden. */
    assert.equal(bundelVan({ bron_sleutel: null }), null);
    assert.equal(bundelVan({}), null);
    assert.equal(bundelVan({ bron_sleutel: "   " }), null, "witruimte is geen bron");
  });

  it("de bundel komt NIET uit de meettekst", () => {
    /* DE REDEN DAT DIT GEEN TEKSTVONDST IS. De meetteksten van de
       ingestiesignalen worden afgekapt op 160 tekens; een signaal over
       vijf bronnen kan er daardoor één tonen. Zou de bundel uit die
       tekst komen, dan zou hij beweren dat twee signalen dezelfde
       oorzaak hebben terwijl dat niet vaststaat.

       Deze melding NOEMT rendo-nieuws in zijn tekst maar heeft geen
       vastgelegde bron — en dan hoort er niet gebundeld te worden. */
    assert.equal(
      bundelVan({ bron_sleutel: null } as { bron_sleutel: string | null }),
      null,
    );
    const berichten = bouwBerichten([
      melding({ sleutel: "ingestie/a", laatste_meting: "FAILED: rendo-nieuws", bron_sleutel: null }),
      melding({ sleutel: "ingestie/b", laatste_meting: "ook rendo-nieuws", bron_sleutel: null }),
    ]);
    assert.equal(berichten.length, 2, "zonder vastgelegde bron hoort er niet gebundeld te worden");
  });
});

describe("bouwBerichten: routeren, bundelen en afkappen", () => {
  it("de drie RENDO-signalen worden ÉÉN bericht", () => {
    const berichten = bouwBerichten(
      [
        melding({ sleutel: "ingestie/brondekking", laatste_meting: "FAILED: rendo-nieuws" }),
        melding({ sleutel: "ingestie/bronnen met opeenvolgende fouten", laatste_meting: "1 van 20: rendo-nieuws" }),
        melding({ sleutel: "ingestie/storingssoort TOEGANG_BEPERKT", laatste_meting: "1 bron: rendo-nieuws" }),
      ],
    );
    assert.equal(berichten.length, 1, "drie signalen over één bron horen één mail te zijn");
    assert.equal(berichten[0]?.items.length, 3);
    assert.equal(berichten[0]?.bundel, "bron rendo-nieuws");
    assert.equal(berichten[0]?.ids.length, 3, "alle drie de meldingen worden door dit bericht gedekt");
  });

  it("een bundel van ÉÉN is geen bundel", () => {
    /* "deze 1 signalen horen bij één probleem" zou alleen verwarren. */
    const berichten = bouwBerichten([melding()]);
    assert.equal(berichten.length, 1);
    assert.equal(berichten[0]?.bundel, null);
  });

  it("WAARSCHUWINGEN komen NIET in de directe ronde", () => {
    const berichten = bouwBerichten([melding({ groep: "koppelingen", niveau: "NIET GEMETEN", sleutel: "koppelingen/analytics en CRM" })],
    );
    assert.equal(berichten.length, 0);
  });

  it("de dagsamenvatting is ALTIJD precies één bericht", () => {
    const zes = Array.from({ length: 6 }, (_, i) =>
      melding({ groep: "koppelingen", niveau: "NIET GEMETEN", sleutel: `koppelingen/x${i}`, bron_sleutel: null }),
    );
    const berichten = bouwBerichten(zes, { alleenDirect: false });
    assert.equal(berichten.length, 1);
    assert.equal(berichten[0]?.niveau, "WAARSCHUWING");
    assert.equal(berichten[0]?.items.length, 6);
    assert.match(berichten[0]?.titel ?? "", /6 waarschuwing/);
  });

  it("DE TIEN VAN PRODUCTIE worden geen tien alarmen", () => {
    /* De gemeten stand van 14 oktober 2026, letterlijk. Vier FOUT
       (waarvan drie over rendo-nieuws) en zes NIET GEMETEN. */
    const tien: TeBezorgen[] = [
      melding({ groep: "koppelingen", niveau: "NIET GEMETEN", sleutel: "koppelingen/analytics en CRM", bron_sleutel: null, laatste_meting: "5 van 5 NIET AANGESLOTEN" }),
      melding({ groep: "ai", niveau: "NIET GEMETEN", sleutel: "ai/maandbudget aanroepen", bron_sleutel: null, laatste_meting: "0 aanroepen deze maand" }),
      melding({ groep: "backup", niveau: "NIET GEMETEN", sleutel: "backup/aanwezigheid", bron_sleutel: null, laatste_meting: "map /app/backups bestaat niet" }),
      melding({ sleutel: "ingestie/bronnen met opeenvolgende fouten", laatste_meting: "1 van 20: rendo-nieuws" }),
      melding({ groep: "ingestie", niveau: "NIET GEMETEN", sleutel: "ingestie/toestemming niet vastgesteld", laatste_meting: "5 bronnen: energieonderbrekingen-storingen, koop-gemeenteblad-vergunningen", bron_sleutel: null }),
      melding({ groep: "koppelingen", niveau: "NIET GEMETEN", sleutel: "koppelingen/alerteringsbestemming", bron_sleutel: null, laatste_meting: "NIET_GECONFIGUREERD" }),
      melding({ groep: "melden", niveau: "NIET GEMETEN", sleutel: "melden/alerteringsbestemming", bron_sleutel: null, laatste_meting: "NIET_GECONFIGUREERD" }),
      melding({ sleutel: "ingestie/brondekking", laatste_meting: "FAILED: rendo-nieuws" }),
      melding({ sleutel: "ingestie/storingssoort TOEGANG_BEPERKT", laatste_meting: "1 bron: rendo-nieuws" }),
      melding({ sleutel: "ingestie/storingssoort TIJDELIJKE_STORING", laatste_meting: "1 bron: tenderned-publicaties", bron_sleutel: "tenderned-publicaties" }),
    ];

    const direct = bouwBerichten(tien);
    const dag = bouwBerichten(tien, { alleenDirect: false });

    /* GEMETEN, NIET AANGENOMEN — en mijn eerste verwachting was fout.
       Direct gaan: de drie RENDO-signalen als ÉÉN bundel, de losse
       TIJDELIJKE_STORING, en `backup/aanwezigheid`. Die laatste is
       NIET GEMETEN maar staat in de groep `backup`, en dat is een
       kritiek domein — een back-up waarvan niemand weet of hij bestaat
       is net zo onbruikbaar als geen back-up. Drie berichten dus, en
       dat is precies OP de achterstandsgrens, dus ze gaan apart.

       De vijf overige waarschuwingen gaan in één samenvatting. */
    assert.equal(direct.length, 3, `verwachtte 3 directe berichten, kreeg ${direct.length}`);
    assert.equal(dag.length, 1, "de vijf waarschuwingen horen in één samenvatting");

    /* VIER mails voor tien meldingen in plaats van tien. */
    assert.equal(direct.length + dag.length, 4);
    const gedekt = [...direct, ...dag].flatMap((b) => b.ids);
    assert.equal(new Set(gedekt).size, 10, "elke melding hoort door precies één bericht gedekt te zijn");
  });

  it("boven de achterstandsgrens wordt het ÉÉN overzicht", () => {
    /* De grendel voor de eerste ronde na het aanzetten: vier losse
       storingen zonder gedeelde bron zouden vier mails zijn. */
    const vier = ["a", "b", "c", "d"].map((x) =>
      melding({ sleutel: `worker/${x}`, groep: "worker", laatste_meting: "kapot", bron_sleutel: null }),
    );
    const berichten = bouwBerichten(vier);
    assert.equal(berichten.length, 1, `boven ${ACHTERSTANDSGRENS} hoort het één overzicht te zijn`);
    assert.match(berichten[0]?.titel ?? "", /achterstand/);
    assert.equal(berichten[0]?.items.length, 4);
    assert.equal(berichten[0]?.ids.length, 4);
  });

  it("precies OP de grens gaan ze nog apart", () => {
    const drie = ["a", "b", "c"].map((x) =>
      melding({ sleutel: `worker/${x}`, groep: "worker", laatste_meting: "kapot", bron_sleutel: null }),
    );
    assert.equal(bouwBerichten(drie).length, ACHTERSTANDSGRENS);
  });

  it("de afdruk verandert NIET als alleen de meting of de teller verandert", () => {
    /* Anders zou een bron die van 14 naar 15 waarnemingen gaat een
       nieuwe mail opleveren, en dan is de deduplicatie weg. */
    const a = bouwBerichten([melding({ keren_gezien: 14 })])[0];
    const b = bouwBerichten([melding({ keren_gezien: 15, laatste_meting: "FAILED: rendo-nieuws (nu 15x)" })])[0];
    assert.equal(a?.afdruk, b?.afdruk);
  });

  it("een KRITIEKE bundel erft het zwaarste niveau", () => {
    const berichten = bouwBerichten(
      [
        melding({ groep: "backup", sleutel: "backup/een", laatste_meting: "rendo-nieuws" }),
        melding({ groep: "ingestie", sleutel: "ingestie/twee", laatste_meting: "rendo-nieuws" }),
      ],
    );
    assert.equal(berichten.length, 1);
    assert.equal(berichten[0]?.niveau, "KRITIEK", "één kritiek signaal maakt de bundel kritiek");
  });
});

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

  it("de meldbestemming blijft https-only", () => {
    const t = readFileSync(new URL("../../src/ops/melden.ts", import.meta.url), "utf8");
    assert.match(t, /startsWith\("https:\/\/"\)/, "een melding mag niet over http");
  });

  it("de ontvanger van een melding staat VAST op de server", () => {
    /* Een aanroeper die zijn eigen ontvanger mag opgeven, maakt van de
       api een open mailrelay — en dat pad kan mail namens vibeenergy.nl
       versturen. */
    const t = readFileSync(new URL("../../../api/server.js", import.meta.url), "utf8");
    assert.match(t, /const MARKETING = "marketing@vibeenergy\.nl"/);
    assert.match(t, /to: \[MARKETING\]/, "de ontvanger komt niet uit een constante");
    assert.doesNotMatch(t, /to: \[?b\.to/, "de ontvanger komt uit de body");
    assert.match(t, /timingSafeEqual/, "het token wordt niet in constante tijd vergeleken");
  });
});
