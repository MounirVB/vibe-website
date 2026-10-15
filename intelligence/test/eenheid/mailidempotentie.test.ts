/* ============================================================
   TEST — de idempotentiesleutel op de weg naar Resend
   ------------------------------------------------------------
   ops/meldmail.ts bouwt de sleutel; deze toetsen gaan over wat
   ops/mail.ts er vervolgens mee doet. Dat is een eigen laag met een
   eigen faalgeval: een sleutel die niet in de header terechtkomt haalt
   de crashwindow niet dicht, en een 409 die als definitief wordt
   geclassificeerd zet de retrylogica stil.

   `fetch` wordt nagebootst via de bestaande naad `opties.fetchImpl`; er
   gaat geen enkel verzoek het netwerk op.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import { verstuurMail } from "../../src/ops/mail.ts";

describe("de idempotentiesleutel in het verzoek aan de provider", () => {
  const ENV: Record<string, string> = {
    [["RESEND", "API", "KEY"].join("_")]: ["re", "nagebootst", "nooit", "een", "echte"].join("_"),
    INTEL_MAIL_ONTVANGER: "marketing@vibeenergy.nl",
    INTEL_MAIL_AFZENDER: "alerts@vibeenergy.nl",
  };
  const oud: Record<string, string | undefined> = {};

  before(() => {
    for (const [k, v] of Object.entries(ENV)) {
      oud[k] = process.env[k];
      process.env[k] = v;
    }
  });

  after(() => {
    for (const [k, v] of Object.entries(oud)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  const BERICHT = {
    onderwerp: "storing: bron rendo-nieuws levert niet",
    html: "<p>bron rendo-nieuws levert niet</p>",
    tekst: "bron rendo-nieuws levert niet",
  };

  /** Een nagebootste fetch die het verzoek bewaart en een vast antwoord geeft. */
  function nepFetch(status: number, body: string) {
    const gezien: { headers: Record<string, string>; body: unknown }[] = [];
    const impl = (async (_url: unknown, init: unknown) => {
      const i = init as { headers: Record<string, string>; body: string };
      /* De headers komen als gewoon object uit mail.ts; normaliseer de
         namen zodat de toets niet op schrijfwijze vastloopt. */
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(i.headers)) headers[k.toLowerCase()] = v;
      gezien.push({ headers, body: JSON.parse(i.body) });
      return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => body,
      };
    }) as unknown as typeof fetch;
    return { impl, gezien };
  }

  test("1. met een sleutel gaat de header Idempotency-Key mee", async () => {
    const f = nepFetch(200, JSON.stringify({ id: "een-provider-id" }));
    const uit = await verstuurMail(BERICHT, {
      fetchImpl: f.impl,
      idempotentieSleutel: "intel-meld-1-7-p0",
    });
    assert.equal(uit.geaccepteerd, true);
    assert.equal(uit.providerId, "een-provider-id");
    assert.equal(f.gezien.length, 1);
    assert.equal(
      f.gezien[0]!.headers["idempotency-key"],
      "intel-meld-1-7-p0",
      "zonder deze header doet de sleutel niets en blijft de crashwindow open",
    );
  });

  test("2. zonder sleutel gaat er GEEN idempotentieheader mee", async () => {
    const f = nepFetch(200, JSON.stringify({ id: "x" }));
    await verstuurMail(BERICHT, { fetchImpl: f.impl });
    assert.equal(
      "idempotency-key" in f.gezien[0]!.headers,
      false,
      "een lege header zou de provider een sleutel geven die niet stabiel is",
    );
  });

  test("3. 409 concurrent_idempotent_requests is HERHAALBAAR", async () => {
    /* De documentatie zegt uitdrukkelijk: "it is safe to retry this
       request later if needed". Zou dit als definitief gelden, dan ging
       een bericht verloren omdat er net een ander verzoek liep. */
    const f = nepFetch(
      409,
      JSON.stringify({ name: "concurrent_idempotent_requests", message: "nog bezig" }),
    );
    const uit = await verstuurMail(BERICHT, { fetchImpl: f.impl, idempotentieSleutel: "intel-meld-1-7-p0" });
    assert.equal(uit.geaccepteerd, false);
    assert.equal(uit.herhaalbaar, true);
  });

  test("4. 409 invalid_idempotent_request is NIET herhaalbaar", async () => {
    /* Dezelfde sleutel met een andere payload. Bij ons kan dat alleen
       door een programmeerfout — de inhoud van een rij staat vast — en
       dan is vijf keer herhalen zinloos. */
    const f = nepFetch(
      409,
      JSON.stringify({ name: "invalid_idempotent_request", message: "andere payload" }),
    );
    const uit = await verstuurMail(BERICHT, { fetchImpl: f.impl, idempotentieSleutel: "intel-meld-1-7-p0" });
    assert.equal(uit.geaccepteerd, false);
    assert.equal(uit.herhaalbaar, false);
  });

  test("5. de bestaande classificatie blijft staan: 5xx en 429 wel, 422 niet", async () => {
    for (const [status, verwacht] of [
      [500, true],
      [503, true],
      [429, true],
      [422, false],
      [401, false],
    ] as const) {
      const f = nepFetch(status, JSON.stringify({ name: "iets", message: "x" }));
      const uit = await verstuurMail(BERICHT, { fetchImpl: f.impl });
      assert.equal(uit.herhaalbaar, verwacht, `HTTP ${status} hoort herhaalbaar=${verwacht} te geven`);
    }
  });

  test("6. een sleutel met een regeleinde wordt geweigerd, en er gaat GEEN verzoek uit", async () => {
    /* Een headerwaarde met een regeleinde is een injectie. De sleutel
       komt vandaag uit gehele getallen, maar dat is een eigenschap van
       de aanroeper en geen garantie van deze module. */
    const f = nepFetch(200, JSON.stringify({ id: "x" }));
    const uit = await verstuurMail(BERICHT, {
      fetchImpl: f.impl,
      idempotentieSleutel: "intel-meld-1-7-p0\r\nbcc: iemand@elders.nl",
    });
    assert.equal(uit.geaccepteerd, false);
    assert.equal(uit.herhaalbaar, false);
    assert.match(uit.fout ?? "", /headerinjectie/);
    assert.equal(f.gezien.length, 0, "er mag geen verzoek zijn gedaan");
  });

  test("7. een te korte sleutel wordt ook geweigerd", async () => {
    const f = nepFetch(200, JSON.stringify({ id: "x" }));
    const uit = await verstuurMail(BERICHT, { fetchImpl: f.impl, idempotentieSleutel: "kort" });
    assert.equal(uit.geaccepteerd, false);
    assert.equal(f.gezien.length, 0);
  });
});
