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
    // geheimenscan: ok — nepsleutel voor de toets, nooit een echte
    RESEND_API_KEY: "re_nagebootst_nooit_een_echte",
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
      idempotentieSleutel: "intel-productie-1-0a1b2c3d4e5f6a7b-a0",
    });
    assert.equal(uit.geaccepteerd, true);
    assert.equal(uit.providerId, "een-provider-id");
    assert.equal(f.gezien.length, 1);
    assert.equal(
      f.gezien[0]!.headers["idempotency-key"],
      "intel-productie-1-0a1b2c3d4e5f6a7b-a0",
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
    const uit = await verstuurMail(BERICHT, { fetchImpl: f.impl, idempotentieSleutel: "intel-productie-1-0a1b2c3d4e5f6a7b-a0" });
    assert.equal(uit.geaccepteerd, false);
    assert.equal(uit.herhaalbaar, true);
  });

  test("4. 409 invalid_idempotent_request is NIET herhaalbaar", async () => {
    /* Dezelfde sleutel met een andere payload. Dat hoort sinds de
       payloadhash in de sleutel zit niet meer te kunnen: een andere
       payload geeft per definitie een andere sleutel. Komt deze 409
       toch voorbij, dan is er een aanname gebroken. */
    const f = nepFetch(
      409,
      JSON.stringify({ name: "invalid_idempotent_request", message: "andere payload" }),
    );
    const uit = await verstuurMail(BERICHT, { fetchImpl: f.impl, idempotentieSleutel: "intel-productie-1-0a1b2c3d4e5f6a7b-a0" });
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

  test("8. GEEN ANTWOORD betekent uitkomstBekend=false", async () => {
    /* Hier hangt de hele idempotentie aan. Een time-out of een
       verbroken verbinding ná acceptatie is geen afwijzing maar een
       ONBEKENDE uitkomst: de mail kan verstuurd zijn. De aanroeper moet
       dat kunnen zien, want alleen dan hergebruikt hij dezelfde sleutel
       in plaats van een nieuwe te nemen. */
    const impl = (async () => {
      throw Object.assign(new Error("The operation was aborted due to timeout"), {
        name: "TimeoutError",
      });
    }) as unknown as typeof fetch;
    const uit = await verstuurMail(BERICHT, { fetchImpl: impl, idempotentieSleutel: "intel-test-1-abc-a0" });
    assert.equal(uit.geaccepteerd, false);
    assert.equal(uit.herhaalbaar, true, "een time-out is herhaalbaar");
    assert.equal(uit.uitkomstBekend, false, "en de uitkomst is ONBEKEND");
  });

  test("9. een ANTWOORD betekent uitkomstBekend is niet false, ook bij een fout", async () => {
    /* Een 4xx of 5xx is wel een antwoord: we weten dan dat hij het NIET
       heeft aangenomen, dus mag de sleutel roteren. */
    for (const status of [200, 422, 500] as const) {
      const f = nepFetch(status, JSON.stringify({ id: "x", name: "iets" }));
      const uit = await verstuurMail(BERICHT, { fetchImpl: f.impl });
      assert.notEqual(
        uit.uitkomstBekend,
        false,
        `HTTP ${status} is een antwoord, dus de uitkomst is bekend`,
      );
    }
  });

  test("10. de 409-classificatie leest het VELD name, niet de proza", async () => {
    /* Een substringtoets op het hele antwoord sloeg ook aan als de naam
       in `message` stond terwijl `name` iets anders zei. Dan werd een
       definitieve fout als herhaalbaar geclassificeerd. */
    const f = nepFetch(
      409,
      JSON.stringify({
        name: "invalid_idempotent_request",
        message: "subject contained: concurrent_idempotent_requests",
      }),
    );
    const uit = await verstuurMail(BERICHT, { fetchImpl: f.impl, idempotentieSleutel: "intel-test-1-abc-a0" });
    assert.equal(
      uit.herhaalbaar,
      false,
      "het veld name zegt invalid_idempotent_request; de prozaregel hoort niet mee te wegen",
    );
  });

  test("11. de sleutel wordt GEREDIGEERD en DAARNA afgekapt", async () => {
    /* Dit stond andersom, en dat lekte: een sleutel die op de
       afkapgrens ligt wordt doormidden geknipt, en het restfragment
       matcht daarna geen enkel redactiepatroon meer. Het fragment
       belandde vervolgens in intel.meld_berichten.laatste_fout. */
    const sleutel = process.env["RESEND_API_KEY"] ?? "";
    assert.ok(sleutel.length > 10, "de nepsleutel moet lang genoeg zijn om te kunnen lekken");
    const vulling = "x".repeat(295);
    const f = nepFetch(400, `${vulling}${sleutel} en nog wat tekst erachter`);
    const uit = await verstuurMail(BERICHT, { fetchImpl: f.impl });
    assert.equal(uit.geaccepteerd, false);
    for (let n = 6; n <= sleutel.length; n += 1) {
      assert.equal(
        (uit.fout ?? "").includes(sleutel.slice(0, n)),
        false,
        `geen enkel beginfragment van de sleutel mag in de fouttekst staan (lengte ${n})`,
      );
    }
    assert.ok((uit.fout ?? "").length <= 300, "en de tekst blijft begrensd");
  });
});
