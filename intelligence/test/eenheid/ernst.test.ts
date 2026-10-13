/* ============================================================
   EENHEID — ernstmodel per domein (par. 18)
   ------------------------------------------------------------
   Twee regels moeten hard zijn en blijven:

     een aanvaarde beperking tilt de totaalernst niet op
     niet gemeten is nooit HEALTHY

   Ze trekken tegengestelde kanten op — de eerste maakt het model
   milder, de tweede strenger — en juist daarom staan ze hier naast
   elkaar. Zou iemand de eerste te ruim maken, dan wordt 'niet gemeten'
   stil groen.
   ============================================================ */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bouwErnstRapport, ernstVan, zwaarsteErnst } from "../../src/ops/ernst.ts";
import type { Signaal } from "../../src/ops/gezondheid.ts";

const sig = (over: Partial<Signaal> & Pick<Signaal, "groep" | "niveau">): Signaal => ({
  naam: over.naam ?? "meting",
  meting: over.meting ?? "gemeten",
  ...over,
});

/** Een volledig gezonde meting voor elk domein, zodat niets ontbreekt. */
function alleDomeinenOk(): Signaal[] {
  return [
    sig({ groep: "planner", niveau: "OK" }),
    sig({ groep: "database", niveau: "OK" }),
    sig({ groep: "beveiliging", niveau: "OK" }),
    sig({ groep: "sitekennis", niveau: "OK" }),
    sig({ groep: "redactie", niveau: "OK" }),
    sig({ groep: "ingestie", niveau: "OK" }),
    sig({ groep: "backup", niveau: "OK" }),
    sig({ groep: "publicatie", niveau: "OK" }),
  ];
}

describe("ernstmodel", () => {
  it("noemt een volledig gemeten platform HEALTHY", () => {
    const r = bouwErnstRapport(alleDomeinenOk());
    assert.equal(r.totaal, "HEALTHY");
    assert.equal(r.domeinen.length, 8, "par. 18 noemt acht domeinen");
    assert.equal(r.nietGemeten.length, 0);
  });

  it("een AANVAARDE beperkte bron maakt het platform niet ongezond", () => {
    /* De expliciete eis uit par. 18. Vijf bronnen die ons bewust
       buitensluiten staan geparkeerd; de rest werkt. Het totaal mag dan
       niet CRITICAL of ACTION_REQUIRED worden — want dan staat het
       dashboard permanent rood en kijkt niemand er nog naar. */
    const r = bouwErnstRapport([
      ...alleDomeinenOk(),
      sig({
        groep: "ingestie",
        naam: "storingssoort TOEGANG_BEPERKT",
        niveau: "FOUT",
        meting: "5 bron(nen), waarvan 0 actief",
        aanvaard: true,
      }),
    ]);
    assert.equal(r.totaal, "DEGRADED", `kreeg ${r.totaal}: ${r.samenvatting}`);
    assert.equal(r.aanvaardTotaal, 1);
  });

  it("maar hij verdwijnt NIET uit het rapport", () => {
    /* Par. 20: niets wegmoffelen voor een groen dashboard. Milder
       wegen is iets anders dan verbergen. */
    const beperkt = sig({
      groep: "ingestie",
      naam: "storingssoort TOEGANG_BEPERKT",
      niveau: "FOUT",
      meting: "5 bron(nen), waarvan 0 actief",
      aanvaard: true,
    });
    const r = bouwErnstRapport([...alleDomeinenOk(), beperkt]);
    const connectoren = r.domeinen.find((d) => d.domein === "connectoren")!;
    assert.ok(
      connectoren.signalen.some((s) => s.naam === "storingssoort TOEGANG_BEPERKT"),
      "het signaal hoort zichtbaar te blijven in zijn domein",
    );
    assert.equal(connectoren.aanvaard, 1);
    assert.match(r.samenvatting, /aanvaarde beperking/);
  });

  it("een ACTIEVE beperking is niet aanvaard en vraagt wel actie", () => {
    /* Een bron die nog actief is en tegen een beperking aanloopt is
       nieuw. Daar moet iemand naar kijken. */
    const r = bouwErnstRapport([
      ...alleDomeinenOk(),
      sig({
        groep: "ingestie",
        naam: "storingssoort TOEGANG_BEPERKT",
        niveau: "FOUT",
        meting: "1 bron(nen), waarvan 1 actief",
        aanvaard: false,
      }),
    ]);
    assert.equal(r.totaal, "ACTION_REQUIRED");
  });

  it("NIET GEMETEN is nooit HEALTHY", () => {
    const r = bouwErnstRapport([
      ...alleDomeinenOk().filter((s) => s.groep !== "publicatie"),
      sig({ groep: "publicatie", niveau: "NIET GEMETEN", meting: "geen meting" }),
    ]);
    assert.notEqual(r.totaal, "HEALTHY");
    assert.equal(r.nietGemeten.length, 1);
  });

  it("NIET GEMETEN in een kritiek domein is CRITICAL", () => {
    /* Een back-up waarvan niemand weet of hij bestaat is net zo
       onbruikbaar als geen back-up. */
    const r = bouwErnstRapport([
      ...alleDomeinenOk().filter((s) => s.groep !== "backup"),
      sig({ groep: "backup", niveau: "NIET GEMETEN", meting: "INTEL_GCS_BUCKET ontbreekt" }),
    ]);
    assert.equal(r.totaal, "CRITICAL");
  });

  it("een FOUT in een connector is geen CRITICAL", () => {
    /* Een kapotte connector is hinder; de gegevens zijn niet in gevaar.
       Alles FOUT noemen maakt het onderscheid waardeloos. */
    const r = bouwErnstRapport([
      ...alleDomeinenOk(),
      sig({ groep: "ingestie", naam: "versheid", niveau: "FOUT", meting: "40 uur oud" }),
    ]);
    assert.equal(r.totaal, "ACTION_REQUIRED");
  });

  it("een domein zonder enkele meting komt NIET als HEALTHY door", () => {
    /* Gemeten geval: het domein 'redactie' had geen enkele meting en
       zou als lege verzameling stilletjes groen zijn geworden. Daarmee
       kon het platform niet zeggen of de redactionele keten werkte —
       precies de keten waar deze release over gaat. */
    const r = bouwErnstRapport(alleDomeinenOk().filter((s) => s.groep !== "redactie"));
    const redactie = r.domeinen.find((d) => d.domein === "redactie")!;
    assert.equal(redactie.ernst, "ACTION_REQUIRED");
    assert.match(redactie.reden, /geen enkele meting/);
    assert.notEqual(r.totaal, "HEALTHY");
  });

  it("een aanvaard signaal dat OK meet blijft HEALTHY", () => {
    assert.equal(
      ernstVan(sig({ groep: "ingestie", niveau: "OK", aanvaard: true }), "connectoren"),
      "HEALTHY",
    );
  });

  it("zwaarsteErnst kiest de hoogste trap", () => {
    assert.equal(zwaarsteErnst(["HEALTHY", "DEGRADED", "ACTION_REQUIRED"]), "ACTION_REQUIRED");
    assert.equal(zwaarsteErnst(["CRITICAL", "HEALTHY"]), "CRITICAL");
    assert.equal(zwaarsteErnst([]), "HEALTHY");
  });

  it("noemt in de samenvatting WELK domein het zwaarst is", () => {
    /* Een totaal zonder domein is niet bruikbaar: 'CRITICAL' zegt niet
       waar je moet kijken. */
    const r = bouwErnstRapport([
      ...alleDomeinenOk().filter((s) => s.groep !== "backup"),
      sig({ groep: "backup", niveau: "FOUT", meting: "geen back-up" }),
    ]);
    assert.equal(r.totaal, "CRITICAL");
    assert.match(r.samenvatting, /Back-up/);
  });
});
