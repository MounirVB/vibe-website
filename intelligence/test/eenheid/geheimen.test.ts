/* ============================================================
   TEST — een geheim mag nergens uit komen
   ------------------------------------------------------------
   Het defect dat deze toetsen vastleggen is gemeten op 13 oktober 2026:

     ops/backup.ts gaf de verbindings-URL als laatste argv-element aan
     pg_dump, en kern/wachtrij.ts schreef `fout.message` ruw in
     intel.taken.laatste_fout. Node zet bij een mislukte execFile de
     HELE commandoregel in die message. Het productiewachtwoord stond
     daarmee in de database.

   Hier staan de PURE toetsen. De databasekant staat in
   test/integratie/geheimlek.test.ts, want die heeft een echte tabel
   nodig om te bewijzen dat de kolom schoon blijft.

   Het wachtwoord hieronder is verzonnen en hoort nergens te werken.
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import { redigeer, VERBORGEN, wachtwoordUit } from "../../src/kern/geheimen.ts";
import { schoon } from "../../src/kern/log.ts";
import { draaiPgGereedschap, pgOmgevingVan } from "../../src/ops/pgomgeving.ts";

/* Synthetisch. Lang genoeg om ook letterlijk geredigeerd te worden. */
const WACHTWOORD = "zW9-synthetisch-wachtwoord-niet-echt";
const URL = `postgresql://vibe_intel_app:${WACHTWOORD}@db.intern:5432/vibe_intel?sslmode=require`;

/** Een melding mag het geheim niet bevatten, in geen enkele vorm. */
function geenGeheim(tekst: string, waar: string): void {
  assert.ok(!tekst.includes(WACHTWOORD), `${waar} bevat het wachtwoord: ${tekst.slice(0, 300)}`);
  assert.ok(
    !/:\/\/[^/@\s:]+:[^@\s]+@/.test(tekst),
    `${waar} bevat nog een credential-URL: ${tekst.slice(0, 300)}`,
  );
}

describe("redigeer", () => {
  test("haalt het credential uit een verbindings-URL", () => {
    const uit = redigeer(`verbinden met ${URL} mislukte`);
    geenGeheim(uit, "de geredigeerde tekst");
    assert.ok(uit.includes(VERBORGEN));
    /* De host mag blijven staan: die helpt bij diagnose en is geen geheim. */
    assert.ok(uit.includes("db.intern"), "de host hoort leesbaar te blijven voor diagnose");
  });

  test("haalt een LOS wachtwoord weg als we het kennen", () => {
    const ruw = `psql: error: password authentication failed (gebruikt: ${WACHTWOORD})`;
    const zonder = redigeer(ruw);
    assert.ok(zonder.includes(WACHTWOORD), "zonder kennis van het geheim kan het patroon dit niet zien");
    const met = redigeer(ruw, [WACHTWOORD]);
    geenGeheim(met, "de tekst met letterlijke redactie");
  });

  test("haalt PGPASSWORD uit een omgevingsdump", () => {
    const uit = redigeer(`env: PGHOST=db.intern PGPASSWORD=${WACHTWOORD} PGUSER=app`);
    geenGeheim(uit, "de geredigeerde omgevingsdump");
    assert.ok(uit.includes("PGHOST=db.intern"), "niet-geheime variabelen horen te blijven");
  });

  test("negeert een te kort 'geheim', anders wordt gewone tekst onleesbaar", () => {
    const uit = redigeer("de test slaagde op de testserver", ["test"]);
    assert.equal(uit, "de test slaagde op de testserver");
  });

  test("laat tekst zonder geheim ongemoeid", () => {
    const ruw = "pg_dump mislukte: could not write to file: No space left on device";
    assert.equal(redigeer(ruw), ruw);
  });
});

describe("wachtwoordUit", () => {
  test("leest het wachtwoord uit een geldige URL", () => {
    assert.equal(wachtwoordUit(URL), WACHTWOORD);
  });

  test("geeft null zonder wachtwoord, en werpt nooit", () => {
    assert.equal(wachtwoordUit("postgresql://app@db.intern:5432/vibe"), null);
    assert.equal(wachtwoordUit(""), null);
    assert.equal(wachtwoordUit(undefined), null);
    assert.equal(wachtwoordUit("dit is geen url"), null);
  });
});

describe("de logger gebruikt dezelfde grendel", () => {
  test("schoon() verbergt een credential-URL in een waarde", () => {
    const uit = schoon({ fout: `Command failed: pg_dump --file /tmp/x ${URL}` });
    geenGeheim(JSON.stringify(uit), "de structuurlogregel");
  });

  test("schoon() verbergt een verdachte SLEUTEL ongeacht de waarde", () => {
    const uit = schoon({ wachtwoord: WACHTWOORD, PGPASSWORD: WACHTWOORD });
    geenGeheim(JSON.stringify(uit), "de structuurlogregel met verdachte sleutels");
  });

  test("schoon() verbergt een Error-message met credential", () => {
    const uit = schoon({ fout: new Error(`Command failed: pg_dump ${URL}`) });
    geenGeheim(JSON.stringify(uit), "de geserialiseerde Error");
  });
});

describe("pgOmgevingVan", () => {
  test("zet de verbinding in PG*-variabelen", () => {
    const o = pgOmgevingVan(URL);
    assert.equal(o.PGHOST, "db.intern");
    assert.equal(o.PGPORT, "5432");
    assert.equal(o.PGUSER, "vibe_intel_app");
    assert.equal(o.PGPASSWORD, WACHTWOORD);
    assert.equal(o.PGDATABASE, "vibe_intel");
    assert.equal(o.PGSSLMODE, "require");
  });

  test("werpt op een onparseerbare URL in plaats van stil de DEFAULTverbinding te pakken", () => {
    assert.throws(() => pgOmgevingVan("dit is geen url"), /niet te parseren/i);
  });

  test("de melding bij een onparseerbare URL bevat de URL zelf niet", () => {
    try {
      pgOmgevingVan(`${URL} kapot`);
      /* Als dit niet werpt is de URL toch parseerbaar; dan is er niets te toetsen. */
    } catch (e) {
      geenGeheim((e as Error).message, "de parseerfout");
    }
  });
});

describe("draaiPgGereedschap", () => {
  test("weigert een credential in argv — dat is een programmeerfout", async () => {
    await assert.rejects(
      () => draaiPgGereedschap("/bin/echo", ["--file", "/tmp/x", URL], URL),
      /bevat een credential/i,
    );
  });

  test("ADVERSARIEEL: ook als het gereedschap het wachtwoord zelf uitschreeuwt, blijft de fout schoon", async () => {
    /* Dit is het scherpste geval. We zetten een 'gereedschap' neer dat
       zijn eigen PGPASSWORD naar stderr schrijft en dan faalt — precies
       wat een onhandige psql-build zou kunnen doen. De fout die wij
       doorgeven mag het geheim niet dragen. */
    await assert.rejects(
      () =>
        draaiPgGereedschap(
          "/bin/sh",
          ["-c", 'echo "connection: $PGUSER:$PGPASSWORD@$PGHOST" >&2; exit 3'],
          URL,
        ),
      (e: Error) => {
        geenGeheim(e.message, "de doorgegeven fout");
        assert.ok(/code 3/.test(e.message), `de exitcode hoort behouden: ${e.message}`);
        return true;
      },
    );
  });

  test("geeft de verbinding mee via de omgeving, niet via argv", async () => {
    const { stdout } = await draaiPgGereedschap(
      "/bin/sh",
      ["-c", 'echo "host=$PGHOST db=$PGDATABASE user=$PGUSER"'],
      URL,
    );
    assert.match(stdout, /host=db\.intern/);
    assert.match(stdout, /db=vibe_intel/);
    assert.match(stdout, /user=vibe_intel_app/);
  });

  test("een fout zonder geheim blijft wél leesbaar — redactie mag diagnose niet slopen", async () => {
    await assert.rejects(
      () => draaiPgGereedschap("/bin/sh", ["-c", 'echo "No space left on device" >&2; exit 1'], URL),
      /No space left on device/,
    );
  });
});
