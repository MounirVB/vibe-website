/* ============================================================
   TEST — de alerteerder, zonder database en zonder netwerk
   ------------------------------------------------------------
   De vier soorten, de deduplicatie, de bundeling, de opmaak, de
   tijdzone en de injectiegrendels. Elk geval voert een invoer in die
   HOORT te worden behandeld zoals beschreven, en stelt dan vast dat het
   ook op de JUISTE grond gebeurt.

   DE DRIE RENDO-SIGNALEN ZIJN DE MAAT. Ze staan letterlijk zoals
   productie ze op 14 oktober 2026 logde. Elke wijziging in de bundeling
   moet op die drie teksten blijven werken, want dat is het geval dat de
   opdracht met naam noemt.
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import type { Signaal } from "../../src/ops/gezondheid.ts";
import {
  bundelVan,
  ernstStijgt,
  ernstVan,
  normaliseerMeting,
  vingerafdrukVan,
} from "../../src/ops/meldernst.ts";
import { nederlandseTijd, onderwerpVeilig } from "../../src/ops/mail.ts";
import { bouwMailBericht, escape } from "../../src/ops/mailopmaak.ts";
import {
  BACKOFF_MINUTEN,
  bouwMeldplan,
  dagsleutel,
  volgendePoging,
  type Meldingrij,
} from "../../src/ops/meldmail.ts";

/* De drie signalen zoals productie ze logde, woord voor woord. */
const RENDO: readonly Signaal[] = [
  {
    groep: "ingestie",
    naam: "bronnen met opeenvolgende fouten",
    niveau: "FOUT",
    meting: "1 van 20 actieve bronnen met >= 3 fouten achtereen: rendo-nieuws",
  },
  {
    groep: "ingestie",
    naam: "storingssoort TOEGANG_BEPERKT",
    niveau: "FOUT",
    meting:
      "1 bron(nen), waarvan 1 actief: rendo-nieuws — detail: rendo-nieuws http=403 " +
      "foutsoort=http sinds=2026-10-13T16:01Z tot=2026-10-20T16:01Z",
  },
  {
    groep: "ingestie",
    naam: "brondekking",
    niveau: "FOUT",
    meting:
      "29 bronnen: 20 actief (0 toe, 20 nog niet toe), SUCCESS 19, DEGRADED 0, FAILED 1, " +
      "ACCESS_RESTRICTED 8, DISABLED 1, ONBEKEND 0 — FAILED: rendo-nieuws",
  },
];

let volgnummer = 0;
function rij(over: Partial<Meldingrij> = {}): Meldingrij {
  volgnummer += 1;
  return {
    id: volgnummer,
    sleutel: "ingestie/brondekking",
    groep: "ingestie",
    niveau: "FOUT",
    laatste_meting: "29 bronnen: FAILED: rendo-nieuws",
    laatste_advies: "npm run bronaudit voor de reden per bron",
    geopend_op: "2026-10-13T16:01:00.000Z",
    laatst_gezien_op: "2026-10-14T04:01:00.000Z",
    gesloten_op: null,
    keren_gezien: 5,
    bundel: "bron:rendo-nieuws",
    ernst: "FOUT",
    ...over,
  };
}

const PLAN = (over: Partial<Parameters<typeof bouwMeldplan>[0]> = {}) =>
  bouwMeldplan({
    open: [],
    gesloten: [],
    gemeldeBundels: new Set(),
    ooitGemeld: true,
    nu: new Date("2026-10-14T04:05:00Z"),
    ...over,
  });

describe("de alerteerder — classificatie en bundeling", () => {
  test("1. de DRIE rendo-signalen worden EEN bundel", () => {
    const bundels = new Set(RENDO.map(bundelVan));
    assert.equal(
      bundels.size,
      1,
      `drie signalen over een bron horen een bundel te zijn, kreeg: ${[...bundels].join(", ")}`,
    );
    assert.equal([...bundels][0], "bron:rendo-nieuws");
  });

  test("2. en ze leveren samen EEN bericht op, niet drie", () => {
    const plan = PLAN({ open: RENDO.map((s, i) => rij({ sleutel: `${s.groep}/${s.naam}`, id: 100 + i })) });
    assert.equal(plan.length, 1, `verwachtte een bericht, kreeg ${plan.length}`);
    assert.equal(plan[0]!.soort, "FOUT");
    assert.equal(plan[0]!.meldingIds.length, 3, "alle drie de meldingen horen in het bericht te zitten");
    assert.match(plan[0]!.onderwerp, /rendo-nieuws/, "het onderwerp hoort de bron te noemen");
  });

  test("3. een AANVAARDE grens belt niemand", () => {
    const aanvaard: Signaal = {
      groep: "backup",
      naam: "aanwezigheid",
      niveau: "NIET GEMETEN",
      meting: "de bucket draagt een verse dump",
      aanvaard: true,
    };
    assert.equal(ernstVan(aanvaard), null);
    /* En zonder die vlag is hetzelfde signaal wel kritiek — anders meet
       deze toets niets. */
    assert.equal(ernstVan({ ...aanvaard, aanvaard: false }), "CRITICAL");
  });

  test("4. CRITICAL is afgebakend: back-up is kritiek, een nieuwsbron niet", () => {
    const basis = { niveau: "FOUT" as const, meting: "x", naam: "n" };
    assert.equal(ernstVan({ ...basis, groep: "backup" }), "CRITICAL");
    assert.equal(ernstVan({ ...basis, groep: "database" }), "CRITICAL");
    assert.equal(ernstVan({ ...basis, groep: "beveiliging" }), "CRITICAL");
    assert.equal(ernstVan({ ...basis, groep: "publicatie" }), "CRITICAL");
    assert.equal(ernstVan({ ...basis, groep: "ingestie" }), "FOUT");
    assert.equal(ernstVan({ ...basis, groep: "redactie" }), "FOUT");
    /* LET OP is nooit kritiek buiten die groepen. */
    assert.equal(ernstVan({ ...basis, niveau: "LET OP", groep: "ingestie" }), "WARNING");
    assert.equal(ernstVan({ ...basis, niveau: "OK", groep: "backup" }), null);
  });

  test("5. 'back-upmap' in een backupmeting wordt GEEN bronbundel", () => {
    /* Gevonden tijdens het bouwen: de kebab-regex las 'back-upmap' als
       bronsleutel en zou twee losse backupstoringen onder een valse
       noemer samenvoegen. De grens is de GROEP. */
    const b = bundelVan({
      groep: "backup",
      naam: "aanwezigheid",
      niveau: "FOUT",
      meting: "geen dump in de back-upmap /app/backups",
    });
    assert.equal(b, "signaal:backup/aanwezigheid");
    assert.doesNotMatch(b, /^bron:/);
  });
});

describe("de alerteerder — deduplicatie", () => {
  test("6. een oplopende teller geeft GEEN nieuw bericht", () => {
    const a = vingerafdrukVan("FOUT", [
      { sleutel: "x", meting: "1 van 20 actieve bronnen met >= 3 fouten achtereen: rendo-nieuws" },
    ]);
    const b = vingerafdrukVan("FOUT", [
      { sleutel: "x", meting: "1 van 20 actieve bronnen met >= 9 fouten achtereen: rendo-nieuws" },
    ]);
    assert.equal(a, b, "een teller die oploopt is dezelfde storing en mag niet opnieuw mailen");
  });

  test("7. een WEZENLIJK andere toestand geeft WEL een nieuw bericht", () => {
    const a = vingerafdrukVan("FOUT", [{ sleutel: "x", meting: "rendo-nieuws http=403" }]);
    const b = vingerafdrukVan("FOUT", [{ sleutel: "x", meting: "rendo-nieuws http=401" }]);
    assert.notEqual(a, b, "een andere HTTP-status is een andere storing");

    /* En een ernststijging ook. */
    const laag = vingerafdrukVan("FOUT", [{ sleutel: "x", meting: "zelfde meting" }]);
    const hoog = vingerafdrukVan("CRITICAL", [{ sleutel: "x", meting: "zelfde meting" }]);
    assert.notEqual(laag, hoog);
    assert.equal(ernstStijgt("FOUT", "CRITICAL"), true);
    assert.equal(ernstStijgt("CRITICAL", "FOUT"), false);
    assert.equal(ernstStijgt(null, "WARNING"), true);
    assert.equal(ernstStijgt("WARNING", null), false, "verdwijnen is geen stijging");
  });

  test("8. een TIJDSTEMPEL in de meting geeft geen nieuw bericht", () => {
    /* Zonder deze normalisatie zou elk kwartier een nieuwe mail uitgaan,
       want de meting draagt 'sinds' en 'tot'. */
    const a = normaliseerMeting("rendo http=403 sinds=2026-10-13T16:01Z tot=2026-10-20T16:01Z");
    const b = normaliseerMeting("rendo http=403 sinds=2026-10-14T17:02Z tot=2026-10-21T17:02Z");
    assert.equal(a, b);
    assert.match(a, /http=403/, "de status moet BLIJVEN staan; die betekent wel iets");
  });

  test("9. de vingerafdruk is ordeonafhankelijk", () => {
    const een = [{ sleutel: "a", meting: "m1" }, { sleutel: "b", meting: "m2" }];
    const twee = [{ sleutel: "b", meting: "m2" }, { sleutel: "a", meting: "m1" }];
    assert.equal(vingerafdrukVan("FOUT", een), vingerafdrukVan("FOUT", twee));
  });

  test("10. de vorm past in de constraint van migratie 0039", () => {
    /* meldberichten_vingerafdruk_vorm eist ^[0-9a-f]{16,64}$. */
    assert.match(vingerafdrukVan("FOUT", [{ sleutel: "a", meting: "b" }]), /^[0-9a-f]{16,64}$/);
  });
});

describe("de alerteerder — de vier soorten", () => {
  test("11. tien openstaande meldingen geven EEN beginsamenvatting, geen tien alarmen", () => {
    const open = Array.from({ length: 10 }, (_, i) =>
      rij({
        id: 200 + i,
        sleutel: `groep${i}/naam${i}`,
        bundel: `signaal:groep${i}/naam${i}`,
        ernst: i < 3 ? "CRITICAL" : "FOUT",
      }),
    );
    const plan = PLAN({ open, ooitGemeld: false });
    assert.equal(plan.length, 1, `verwachtte EEN samenvatting, kreeg ${plan.length} berichten`);
    assert.equal(plan[0]!.soort, "BEGINSAMENVATTING");
    assert.equal(plan[0]!.meldingIds.length, 10, "alle tien horen erin te staan");
    assert.equal(plan[0]!.ernst, "CRITICAL", "de zwaarste ernst hoort in het onderwerp");
  });

  test("12. daarna geldt het normale regime: per bundel een bericht", () => {
    const open = [
      rij({ id: 301, bundel: "bron:rendo-nieuws", ernst: "FOUT" }),
      rij({ id: 302, bundel: "signaal:backup/restoretest", groep: "backup", ernst: "CRITICAL" }),
    ];
    const plan = PLAN({ open, ooitGemeld: true });
    assert.equal(plan.length, 2);
    assert.deepEqual(plan.map((p) => p.soort).sort(), ["CRITICAL", "FOUT"]);
  });

  test("13. WARNING is EEN overzicht per dag, niet een mail per waarschuwing", () => {
    const open = Array.from({ length: 6 }, (_, i) =>
      rij({ id: 400 + i, sleutel: `w${i}/x`, bundel: `signaal:w${i}/x`, ernst: "WARNING", niveau: "LET OP" }),
    );
    const plan = PLAN({ open, ooitGemeld: true });
    assert.equal(plan.length, 1, "zes waarschuwingen horen EEN overzicht te zijn");
    assert.equal(plan[0]!.soort, "WARNING");
    assert.equal(plan[0]!.bundel, "dagoverzicht");
    assert.equal(plan[0]!.meldingIds.length, 6);

    /* De DAG zit in de vingerafdruk: morgen is het een nieuw bericht. */
    const morgen = bouwMeldplan({
      open, gesloten: [], gemeldeBundels: new Set(), ooitGemeld: true,
      nu: new Date("2026-10-15T04:05:00Z"),
    });
    assert.notEqual(
      plan[0]!.vingerafdruk,
      morgen[0]!.vingerafdruk,
      "een nieuwe dag hoort een nieuw overzicht te geven",
    );
  });

  test("14. HERSTEL alleen voor wat EERDER is gemeld", () => {
    const dicht = rij({
      id: 500,
      bundel: "bron:rendo-nieuws",
      gesloten_op: "2026-10-14T04:00:00.000Z",
    });
    /* Niet eerder gemeld: geen herstelbericht. */
    assert.equal(PLAN({ gesloten: [dicht], gemeldeBundels: new Set() }).length, 0);
    /* Eerder gemeld: wel. */
    const plan = PLAN({ gesloten: [dicht], gemeldeBundels: new Set(["bron:rendo-nieuws"]) });
    assert.equal(plan.length, 1);
    assert.equal(plan[0]!.soort, "HERSTEL");
    assert.match(plan[0]!.onderwerp, /\[HERSTEL\]/);
  });

  test("15. GEEN herstel zolang er in dezelfde bundel nog iets OPEN staat", () => {
    const plan = PLAN({
      open: [rij({ id: 600, bundel: "bron:rendo-nieuws", ernst: "FOUT" })],
      gesloten: [rij({ id: 601, bundel: "bron:rendo-nieuws", gesloten_op: "2026-10-14T04:00:00.000Z" })],
      gemeldeBundels: new Set(["bron:rendo-nieuws"]),
    });
    assert.ok(
      !plan.some((p) => p.soort === "HERSTEL"),
      "een half opgeloste storing is niet opgelost",
    );
  });
});

describe("de alerteerder — opmaak, tijd en veiligheid", () => {
  test("16. het onderwerp heeft de voorgeschreven vorm", () => {
    const plan = PLAN({ open: [rij({ ernst: "CRITICAL", groep: "backup" })], ooitGemeld: true });
    assert.match(
      plan[0]!.onderwerp,
      /^\[Vibe Energy Intelligence\] \[CRITICAL\] .+/,
      plan[0]!.onderwerp,
    );
  });

  test("17. de mail draagt alle velden die de opdracht eist", () => {
    const plan = PLAN({ open: [rij()], ooitGemeld: true, monitorUrl: "https://monitor.test/x" });
    const { html, tekst } = plan[0]!;
    for (const veld of ["Ernst", "Betrokken", "Eerst gezien", "Laatst gemeten", "Status", "Aanbevolen actie", "Melding-ID"]) {
      assert.ok(html.includes(veld), `veld '${veld}' ontbreekt in de HTML`);
      assert.ok(tekst.includes(veld), `veld '${veld}' ontbreekt in het tekstalternatief`);
    }
    assert.ok(tekst.includes("https://monitor.test/x"), "de monitorlink hoort erin als hij er is");
    assert.ok(html.includes("rendo-nieuws"), "de betrokken bron hoort erin");
    /* En zonder monitorlink staat er geen lege link. */
    const zonder = PLAN({ open: [rij()], ooitGemeld: true, monitorUrl: null });
    assert.ok(!zonder[0]!.html.includes("Monitoring openen"));
  });

  test("18. GEEN verzonnen oorzaak: zonder advies staat er geen oorzaak", () => {
    const plan = PLAN({ open: [rij({ laatste_advies: null })], ooitGemeld: true });
    assert.match(plan[0]!.tekst, /geen geautomatiseerd advies beschikbaar/);
  });

  test("19. HTML-injectie uit een meting wordt ge-escaped", () => {
    const gif = '<script>alert(1)</script><img src=x onerror="steal()">';
    const plan = PLAN({ open: [rij({ laatste_meting: gif })], ooitGemeld: true });
    /* De maat is niet 'het woord onerror komt niet voor' — dat woord
       mag er als ZICHTBARE tekst staan. De maat is dat er geen
       ONGE-ESCAPETE constructie in staat: geen eigen tag, en geen rauw
       aanhalingsteken dat een attribuut kan afsluiten. */
    assert.ok(!plan[0]!.html.includes("<script"), "een script uit de meting hoort niet in de HTML");
    assert.ok(!plan[0]!.html.includes("<img"), "en geen tag uit de meting");
    assert.ok(
      plan[0]!.html.includes('onerror=&quot;'),
      "het attribuut hoort ge-escaped in de tekst te staan, niet als attribuut",
    );
    assert.ok(plan[0]!.html.includes("&lt;script&gt;"), "wel ge-escaped zichtbaar");
    assert.equal(escape("<&>\"'"), "&lt;&amp;&gt;&quot;&#39;");
  });

  test("20. HEADER-injectie in een onderwerp wordt geweigerd", () => {
    const vuil = "storing\r\nBcc: dief@elders.test\r\nSubject: iets anders";
    const schoon = onderwerpVeilig(vuil);
    assert.ok(!/[\r\n]/.test(schoon), `het onderwerp mag geen regeleinde dragen: ${JSON.stringify(schoon)}`);
    assert.match(schoon, /^storing Bcc: dief@elders.test/, "de tekst blijft, de regeleindes zijn weg");
    /* Ook de unicode-regelscheiders. */
    assert.ok(!/[\u2028\u2029]/.test(onderwerpVeilig("a\u2028b")));
  });

  test("21. een onderwerp uit een melding bevat nooit een regeleinde", () => {
    const plan = PLAN({
      open: [rij({ laatste_meting: "a\r\nBcc: x@y.test", sleutel: "ingestie/x\r\ny" })],
      ooitGemeld: true,
    });
    assert.ok(!/[\r\n]/.test(plan[0]!.onderwerp));
  });

  test("22. ZOMERTIJD: dezelfde UTC-tijd leest anders in juli dan in januari", () => {
    /* Niet een vaste offset: Intl kent de overgangen. Dit is de fout die
       in release 3.0.7 in een signaalregel zat. */
    const zomer = nederlandseTijd("2026-07-01T12:00:00Z");
    const winter = nederlandseTijd("2026-01-01T12:00:00Z");
    assert.match(zomer, /14:00/, `juli is UTC+2: ${zomer}`);
    assert.match(winter, /13:00/, `januari is UTC+1: ${winter}`);
    assert.match(zomer, /CEST/);
    assert.match(winter, /CET/);
    assert.equal(nederlandseTijd(null), "onbekend");
    assert.equal(nederlandseTijd("geen datum"), "onbekend");
  });

  test("23. de DAGSLEUTEL kantelt op de Nederlandse middernacht, niet de UTC-middernacht", () => {
    /* In de zomer is 23:30Z al de volgende dag in Amsterdam. Zonder
       tijdzone zou het dagoverzicht op het verkeerde moment kantelen. */
    assert.equal(dagsleutel(new Date("2026-07-01T21:30:00Z")), "2026-07-01");
    assert.equal(dagsleutel(new Date("2026-07-01T22:30:00Z")), "2026-07-02");
    /* En in de winter een uur later. */
    assert.equal(dagsleutel(new Date("2026-01-01T22:30:00Z")), "2026-01-01");
    assert.equal(dagsleutel(new Date("2026-01-01T23:30:00Z")), "2026-01-02");
  });

  test("24. de back-off loopt op en eindigt", () => {
    const nu = new Date("2026-10-14T04:00:00Z");
    const wachten = BACKOFF_MINUTEN.map((_, i) => volgendePoging(i, nu));
    for (const w of wachten) assert.ok(w instanceof Date);
    /* Oplopend. */
    for (let i = 1; i < wachten.length; i += 1) {
      assert.ok(
        wachten[i]!.getTime() > wachten[i - 1]!.getTime(),
        "elke volgende poging hoort later te zijn dan de vorige",
      );
    }
    /* En eindig: na de laatste is er geen volgende. */
    assert.equal(volgendePoging(BACKOFF_MINUTEN.length, nu), null);
    assert.equal(volgendePoging(99, nu), null);
  });

  test("25. een HERSTEL-mail bevat geen alarmkleur en zegt dat er niets te doen is", () => {
    const plan = PLAN({
      gesloten: [rij({ gesloten_op: "2026-10-14T04:00:00.000Z" })],
      gemeldeBundels: new Set(["bron:rendo-nieuws"]),
    });
    const b = plan[0]!;
    assert.match(b.html, /HERSTELD/);
    assert.match(b.tekst, /geen actie nodig/i);
    assert.ok(!b.html.includes("#b3261e"), "de kritieke kleur hoort niet op een herstelmelding");
  });

  test("26. de opmaak werkt ook zonder meldingen (lege lijst breekt niets)", () => {
    const o = bouwMailBericht({
      soort: "TEST",
      ernst: null,
      titel: "een testbericht met een voldoende lang onderwerp",
      bundel: "test",
      meldingen: [],
      meldingId: "TEST-abc",
      monitorUrl: null,
      nu: "14 oktober 2026 om 06:00 CEST",
    });
    assert.match(o.onderwerp, /\[TEST\]/);
    assert.ok(o.html.length > 200);
    assert.ok(o.tekst.includes("onbekend"), "zonder meldingen is 'eerst gezien' onbekend, niet leeg");
  });
});
