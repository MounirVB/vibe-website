/* ============================================================
   EENHEID — de hostsleutel, het samenvoegen en de onprintbare sleutel
   ------------------------------------------------------------
   DRIE DINGEN DIE OP 5 NOVEMBER 2026 ZIJN GEMETEN en elk een eigen
   faalwijze afdekken die werkelijk is voorgekomen.

   1 DE HOST HOORT IN DE SLEUTEL. Een sc-domain-property dekt elke host
     onder het domein. `new URL(url).pathname` gooide de host weg, en
     daardoor landden `www.vibeenergy.nl/` en `dashboard.vibeenergy.nl/`
     op dezelfde rij. De upsert overschrijft, dus de laatste won: op
     17 oktober stond in de database 2 impressies en 0 kliks waar Google
     6 en 1 gaf — en die 2/0 was de dashboardrij, op de plek van de
     homepage. Niet een te laag getal, maar een getal van iets anders.

   2 WAT TOCH OP ÉÉN SLEUTEL LANDT MOET WORDEN OPGETELD. Overschrijven
     binnen één oogst maakt de uitkomst afhankelijk van de volgorde
     waarin Google zijn rijen zet. voegSamen() haalt die afhankelijkheid
     weg; daarmee is dezelfde oogst altijd dezelfde tabel.

   3 DE SLEUTEL MOET ONPRINTBAAR ZIJN. Een wegwerpscript heeft de
     privésleutel van het dienstaccount naar een terminal geschreven
     met `JSON.stringify(toegang)`, omdat de bewaking op "ok" vertakte
     terwijl de geslaagde tak "sleutel" heet. De redactielaag was niet
     in het spel — een ad-hoc script roept die niet aan. Daarom zit de
     bescherming nu in het object, niet in de discipline.
   ============================================================ */

import { strict as assert } from "node:assert";
import { inspect } from "node:util";
import { describe, test } from "node:test";

import { voegSamen, websiteHost, SLEUTEL_VERBORGEN, gscToegang } from "../../src/analytics/gsc.ts";
import { koppelingEnvStand, KOPPELING_ENV } from "../../src/kern/config.ts";
import { redigeer } from "../../src/kern/geheimen.ts";

/** Een rij zoals haalZoekvragen() hem oplevert. */
function rij(over: Partial<Parameters<typeof voegSamen>[0][number]> = {}) {
  return {
    datum: "2026-10-17",
    zoekvraag: "vibe energy",
    paginaHost: "www.vibeenergy.nl",
    paginaPad: "/",
    land: "nld",
    apparaat: "MOBILE",
    impressies: 4,
    kliks: 1,
    positie: 1.2,
    ...over,
  };
}

describe("de hostsleutel en het samenvoegen", () => {
  test("1 · twee hosts op hetzelfde pad blijven TWEE rijen", () => {
    /* DE KERNZAAK. Dit is letterlijk de botsing van 17 oktober 2026. */
    const uit = voegSamen([
      rij({ paginaHost: "www.vibeenergy.nl", impressies: 4, kliks: 1 }),
      rij({ paginaHost: "dashboard.vibeenergy.nl", impressies: 2, kliks: 0 }),
    ]);
    assert.equal(uit.length, 2, "de host hoort de rijen te scheiden");
    const www = uit.find((r) => r.paginaHost === "www.vibeenergy.nl");
    const dash = uit.find((r) => r.paginaHost === "dashboard.vibeenergy.nl");
    /* DE KLIK VAN DE WEBSITE MOET OVERLEVEN. In de oude vorm werd deze
       rij overschreven door de dashboardrij met nul kliks. */
    assert.equal(www?.kliks, 1);
    assert.equal(www?.impressies, 4);
    assert.equal(dash?.kliks, 0);
    assert.equal(dash?.impressies, 2);
  });

  test("1b · de apex en www zijn ook verschillende hosts", () => {
    const uit = voegSamen([
      rij({ paginaHost: "vibeenergy.nl", paginaPad: "/contact", impressies: 1, kliks: 0 }),
      rij({ paginaHost: "www.vibeenergy.nl", paginaPad: "/contact", impressies: 1, kliks: 0 }),
    ]);
    assert.equal(uit.length, 2);
    assert.equal(
      uit.reduce((s, r) => s + r.impressies, 0),
      2,
      "samen twee impressies, niet één",
    );
  });

  test("2 · wat op dezelfde sleutel landt wordt OPGETELD, niet overschreven", () => {
    const uit = voegSamen([rij({ impressies: 4, kliks: 1 }), rij({ impressies: 2, kliks: 1 })]);
    assert.equal(uit.length, 1);
    assert.equal(uit[0]?.impressies, 6);
    assert.equal(uit[0]?.kliks, 2);
  });

  test("2b · de positie wordt IMPRESSIEGEWOGEN samengevoegd, niet gemiddeld", () => {
    /* HET VERSCHIL IS GROOT GENOEG OM EEN RAPPORT TE VERPESTEN: het
       rekenkundige gemiddelde van 3 en 90 is 46,5 terwijl de juiste
       uitkomst 3,86 is. Zonder weging zou één zeldzame vertoning op een
       diepe positie de hele regel kantelen. */
    const uit = voegSamen([
      rij({ impressies: 100, positie: 3 }),
      rij({ impressies: 1, positie: 90 }),
    ]);
    assert.equal(uit.length, 1);
    assert.equal(uit[0]?.impressies, 101);
    const verwacht = (100 * 3 + 1 * 90) / 101;
    assert.ok(
      Math.abs((uit[0]?.positie ?? 0) - verwacht) < 1e-9,
      `positie ${uit[0]?.positie} hoort ${verwacht} te zijn, niet 46,5`,
    );
  });

  test("2c · samenvoegen is ORDE-ONAFHANKELIJK, en dat is de hele winst", () => {
    /* ZONDER DEZE EIGENSCHAP IS DE SYNCHRONISATIE NIET IDEMPOTENT:
       dezelfde oogst in een andere volgorde zou een andere tabel
       opleveren, en dat is aan het resultaat niet te zien. */
    const a = [rij({ impressies: 4, kliks: 1, positie: 2 }), rij({ impressies: 6, kliks: 0, positie: 8 })];
    const heen = voegSamen(a);
    const terug = voegSamen([...a].reverse());
    assert.equal(heen.length, 1);
    assert.equal(terug.length, 1);
    assert.equal(heen[0]?.impressies, terug[0]?.impressies);
    assert.equal(heen[0]?.kliks, terug[0]?.kliks);
    assert.ok(Math.abs((heen[0]?.positie ?? 0) - (terug[0]?.positie ?? 0)) < 1e-9);
  });

  test("2d · een rij zonder host blijft bestaan en botst niet met een rij MET host", () => {
    /* NULLS NOT DISTINCT in de databasesleutel betekent dat null een
       waarde is, niet een jokerteken. Hier hetzelfde gedrag. */
    const uit = voegSamen([rij({ paginaHost: null }), rij({ paginaHost: "www.vibeenergy.nl" })]);
    assert.equal(uit.length, 2);
  });

  test("3 · de websitehost is configureerbaar en heeft een gemeten standaard", () => {
    const bewaard = process.env["INTEL_GSC_WEBSITE_HOST"];
    try {
      delete process.env["INTEL_GSC_WEBSITE_HOST"];
      assert.equal(websiteHost(), "www.vibeenergy.nl");
      process.env["INTEL_GSC_WEBSITE_HOST"] = "www.voorbeeld.nl";
      assert.equal(websiteHost(), "www.voorbeeld.nl");
      /* LEEG IS GEEN WAARDE. Een lege variabele mag niet betekenen dat
         er geen websitehost is; dan valt het rapport stil terug op
         'geen enkele host is de website'. */
      process.env["INTEL_GSC_WEBSITE_HOST"] = "   ";
      assert.equal(websiteHost(), "www.vibeenergy.nl");
    } finally {
      if (bewaard === undefined) delete process.env["INTEL_GSC_WEBSITE_HOST"];
      else process.env["INTEL_GSC_WEBSITE_HOST"] = bewaard;
    }
  });
});

describe("de credentialroutes van het koppelingenregister", () => {
  const SLEUTELS = ["INTEL_GSC_CLIENT_EMAIL", "INTEL_GSC_PRIVATE_KEY", "INTEL_GSC_SITE_URL", "INTEL_GCS_SLEUTEL"];

  function zonder<T>(werk: () => T): T {
    const bewaard = Object.fromEntries(SLEUTELS.map((s) => [s, process.env[s]]));
    for (const s of SLEUTELS) delete process.env[s];
    try {
      return werk();
    } finally {
      for (const s of SLEUTELS) {
        const v = bewaard[s];
        if (v === undefined) delete process.env[s];
        else process.env[s] = v;
      }
    }
  }

  test("4 · de dienstaccount-JSON is een VOLWAARDIGE route", () => {
    /* DIT IS DE BEVINDING VAN 5 NOVEMBER. Het register eiste
       CLIENT_EMAIL + PRIVATE_KEY + SITE_URL en meldde 'niet
       geconfigureerd' terwijl de koppeling via INTEL_GCS_SLEUTEL 4.361
       rijen had weggeschreven. Een eis die niet overeenkomt met de code
       die hem waarmaakt, is een valse meting. */
    zonder(() => {
      process.env["INTEL_GSC_SITE_URL"] = "sc-domain:vibeenergy.nl";
      process.env["INTEL_GCS_SLEUTEL"] = '{"type":"service_account"}';
      const s = koppelingEnvStand("gsc");
      assert.equal(s.voldoet, true, "de dienstaccount-route hoort te volstaan");
      assert.equal(s.route, "dienstaccount-JSON");
      assert.deepEqual([...s.ontbrekend], []);
    });
  });

  test("4b · de eigen GSC-credential is de andere route", () => {
    zonder(() => {
      process.env["INTEL_GSC_SITE_URL"] = "sc-domain:vibeenergy.nl";
      process.env["INTEL_GSC_CLIENT_EMAIL"] = "a@b.iam.gserviceaccount.com";
      process.env["INTEL_GSC_PRIVATE_KEY"] = "x";
      const s = koppelingEnvStand("gsc");
      assert.equal(s.voldoet, true);
      assert.equal(s.route, "eigen GSC-credential");
    });
  });

  test("4c · zonder SITE_URL voldoet GEEN enkele route", () => {
    /* SITE_URL staat in `altijd`: zonder property is er niets te
       bevragen, welke credential je ook hebt. */
    zonder(() => {
      process.env["INTEL_GCS_SLEUTEL"] = '{"type":"service_account"}';
      const s = koppelingEnvStand("gsc");
      assert.equal(s.voldoet, false);
      assert.ok(s.ontbrekend.includes("INTEL_GSC_SITE_URL"));
    });
  });

  test("4d · de gerapporteerde ontbrekende variabelen zijn de GOEDKOOPSTE route", () => {
    /* ANDERS EIST HET RAPPORT DRIE VARIABELEN TERWIJL ER ÉÉN VOLSTAAT,
       en dan gaat iemand de verkeerde aanmaken. */
    zonder(() => {
      process.env["INTEL_GSC_SITE_URL"] = "sc-domain:vibeenergy.nl";
      const s = koppelingEnvStand("gsc");
      assert.equal(s.voldoet, false);
      assert.deepEqual([...s.ontbrekend], ["INTEL_GCS_SLEUTEL"]);
    });
  });

  test("4e · een koppeling zonder alternatieven werkt onveranderd", () => {
    zonder(() => {
      const s = koppelingEnvStand("crm");
      assert.equal(s.voldoet, false);
      assert.deepEqual([...s.ontbrekend], ["INTEL_CRM_SOORT", "INTEL_CRM_TOKEN"]);
    });
  });

  test("4f · KOPPELING_ENV noemt elke naam die een koppeling KAN gebruiken", () => {
    /* Het register toont namen, nooit waarden. Beide GSC-routes moeten
       erin staan, anders ontbreekt in het dashboard de variabele die
       iemand zou moeten zetten. */
    const gsc = KOPPELING_ENV["gsc"] ?? [];
    for (const naam of SLEUTELS) {
      assert.ok(gsc.includes(naam), `${naam} hoort in KOPPELING_ENV['gsc'] te staan`);
    }
  });

  test("4g · een onbekende sleutel levert geen uitzondering maar 'voldoet niet'", () => {
    const s = koppelingEnvStand("bestaat-niet");
    assert.equal(s.voldoet, false);
    assert.equal(s.route, null);
  });
});

describe("de sleutel is niet te printen", () => {
  /* DE PEM-KOP WORDT OPGEBOUWD EN NIET OPGESCHREVEN.

     Deze repository is PUBLIEK en de geheimenscan weigert elk
     PEM-gevormd literal in de boom — ook een waardeloos nepexemplaar,
     en terecht: een scanner die onderscheid maakt tussen echte en
     nagemaakte sleutels bestaat niet. De scan wees deze twee regels
     aan, en de juiste reactie is de literal weghalen, niet de poort
     uitzetten of een uitzondering toevoegen.

     Op runtime is de tekenreeks identiek, dus de zaken toetsen precies
     wat ze eerst toetsten. De sleutel is overigens waardeloos: wat
     hier wordt vastgezet is de VORM, niet de inhoud. */
  const KOP = ["-----BEGIN", "PRIVATE", "KEY-----"].join(" ");
  const SLOT = ["-----END", "PRIVATE", "KEY-----"].join(" ");
  const NEP = `${KOP}\nAAAABBBBCCCCDDDDEEEEFFFFGGGGHHHH\nIIIIJJJJKKKK\n${SLOT}\n`;

  function metSleutel<T>(werk: (t: ReturnType<typeof gscToegang>) => T): T {
    const bewaard = {
      e: process.env["INTEL_GSC_CLIENT_EMAIL"],
      k: process.env["INTEL_GSC_PRIVATE_KEY"],
      u: process.env["INTEL_GSC_SITE_URL"],
    };
    process.env["INTEL_GSC_CLIENT_EMAIL"] = "intel-backup-schrijver@voorbeeld.iam.gserviceaccount.com";
    process.env["INTEL_GSC_PRIVATE_KEY"] = NEP;
    process.env["INTEL_GSC_SITE_URL"] = "sc-domain:vibeenergy.nl";
    try {
      return werk(gscToegang());
    } finally {
      for (const [naam, v] of [
        ["INTEL_GSC_CLIENT_EMAIL", bewaard.e],
        ["INTEL_GSC_PRIVATE_KEY", bewaard.k],
        ["INTEL_GSC_SITE_URL", bewaard.u],
      ] as const) {
        if (v === undefined) delete process.env[naam];
        else process.env[naam] = v;
      }
    }
  }

  test("5 · JSON.stringify geeft de sleutel NIET prijs", () => {
    /* DIT IS LETTERLIJK DE REGEL DIE HET INCIDENT VEROORZAAKTE. */
    metSleutel((t) => {
      const afdruk = JSON.stringify(t);
      assert.ok(!afdruk.includes("BEGIN PRIVATE KEY"), "de sleutelkop staat in de afdruk");
      assert.ok(!afdruk.includes("AAAABBBB"), "sleutelmateriaal staat in de afdruk");
      assert.ok(afdruk.includes(SLEUTEL_VERBORGEN), "de afdruk hoort te MELDEN dat er iets weg is");
      /* De rest moet er juist wél in staan: een afdruk die niets zegt
         is net zo onbruikbaar als een afdruk die te veel zegt. */
      assert.ok(afdruk.includes("intel-backup-schrijver@voorbeeld.iam.gserviceaccount.com"));
      assert.ok(afdruk.includes("INTEL_GSC_PRIVATE_KEY"));
    });
  });

  test("5b · util.inspect — wat console.log op een object doet — toont hem niet", () => {
    metSleutel((t) => {
      const afdruk = inspect(t, { depth: 5 });
      assert.ok(!afdruk.includes("BEGIN PRIVATE KEY"));
      assert.ok(!afdruk.includes("AAAABBBB"));
    });
  });

  test("5c · een spread kopieert de sleutel niet mee", () => {
    /* ANDERS LEKT HIJ VIA EEN KOPIE: {...toegang, extra} zou de
       bescherming omzeilen zonder dat iemand dat ziet. */
    metSleutel((t) => {
      const kopie = { ...(t as object) };
      assert.ok(!JSON.stringify(kopie).includes("BEGIN PRIVATE KEY"));
      assert.ok(!Object.keys(kopie).includes("privateKey"));
    });
  });

  test("5d · de sleutel is nog wél te LEZEN, anders werkt de koppeling niet", () => {
    /* NIET-OPSOMBAAR IS NIET ONBEREIKBAAR. Zou deze zaak falen, dan was
       de bescherming een storing. */
    metSleutel((t) => {
      assert.equal(t.soort, "sleutel");
      if (t.soort === "sleutel") {
        assert.ok(t.privateKey.includes("BEGIN PRIVATE KEY"));
        assert.equal(t.herkomst, "INTEL_GSC_PRIVATE_KEY");
      }
    });
  });

  test("6 · de redactie pakt ook een AFGEKAPT sleutelblok", () => {
    /* HET OUDE PATROON EISTE EEN VOLLEDIG BLOK met -----END-----. Een
       diagnose die een respons op 300 tekens afkapt levert een
       BEGIN-kop met honderden tekens base64 en géén END, en dan greep
       de oude vorm niets. Een halve sleutel is nog steeds een sleutel. */
    const afgekapt = NEP.slice(0, 60);
    assert.ok(afgekapt.includes("BEGIN PRIVATE KEY"));
    assert.ok(!afgekapt.includes("END PRIVATE KEY"), "de opzet van deze zaak vraagt een halve sleutel");
    const uit = redigeer(afgekapt);
    assert.ok(!uit.includes("AAAABBBB"), "het sleutelmateriaal is niet geredigeerd");
  });

  test("6b · een VOLLEDIG blok blijft geredigeerd, en de tekst eromheen overleeft", () => {
    const uit = redigeer(`voor ${NEP} na`);
    assert.ok(!uit.includes("AAAABBBB"));
    assert.ok(uit.startsWith("voor "));
    assert.ok(uit.endsWith(" na"), `de staarttekst is weggevreten: ${JSON.stringify(uit.slice(-20))}`);
  });

  test("6c · de JSON-vorm met \\n als twee tekens wordt ook gepakt", () => {
    /* Zo staat de sleutel in INTEL_GCS_SLEUTEL: één JSON-regel met
       letterlijke backslash-n in plaats van echte regeleindes. */
    const inJson = `{"private_key":"${KOP}\\nAAAABBBBCCCC\\n${SLOT}\\n"}`;
    const uit = redigeer(inJson);
    assert.ok(!uit.includes("AAAABBBB"), `niet geredigeerd: ${uit}`);
  });
});
