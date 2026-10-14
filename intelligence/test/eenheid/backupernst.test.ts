/* ============================================================
   EENHEID — mag een leeg lokaal back-uparchief aanvaard worden?
   ------------------------------------------------------------
   WAAROM DIT BESTAND BESTAAT — een gemeten defect in de MONITORING,
   niet in de back-up.

   Op 14 oktober 2026 meldde `npm run gezondheid` op vibe-intel-api:

     CRITICAL  Back-up  aanwezigheid: map /app/backups bestaat niet
     NIET GEMETEN       externe kopie: INTEL_GCS_BUCKET ontbreekt

   Dezelfde code op vibe-intel-worker, hetzelfde moment:

     OK  restoretest    laatste PASS 0,5 dagen geleden, 10 toetsen
     OK  externe kopie  11 dumps in gs://vibe-energy-intel-backups,
                        nieuwste 1,1 uur oud

   De back-ups waren dus volledig in orde. Alleen de worker draagt
   INTEL_GCS_* en voert de dagelijkse back-uptaak uit; de api en de
   planner hebben geen back-uprol. Een signaal dat van de meetPLAATS
   afhangt, is geen signaal over het platform.

   De derde bron van waarheid is daarom het TAKENLOGBOEK: intel.taken is
   gedeeld en zegt op elke service hetzelfde. Gemeten stand destijds:
   drie back-uptaken, alle `gereed`, laatste 2026-10-14 00:00:29.

   WAT DEZE TOETS BEWAAKT

   Dat de ernst alleen daalt als er BEWIJS is, en dat hij onverminderd
   weegt als dat bewijs ontbreekt, te oud is, of als de bucket wél
   meetbaar is maar niet gezond. De opdracht was expliciet: "verlaag de
   ernst uitsluitend als de onderliggende back-upgaranties aantoonbaar
   voldoen."
   ============================================================ */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { backupAanvaardbaar } from "../../src/ops/gezondheid.ts";

/** De RPO uit DREMPELS.backupLeeftijdUren: 24 uur plus twee uur marge. */
const DREMPEL = 26;

describe("backupAanvaardbaar", () => {
  it("een GEZONDE bucket is genoeg, en het takenlogboek doet dan niet mee", () => {
    const r = backupAanvaardbaar({ externNiveau: "OK", taakUren: null, drempelUren: DREMPEL });
    assert.equal(r.aanvaard, true);
    assert.equal(r.viaTakenlogboek, false, "de bucket is het bewijs, niet het logboek");
    assert.match(r.grond, /bucket/);
  });

  it("GEEN bucketmeting op deze service, maar een VERSE geslaagde taak: aanvaard", () => {
    /* Het gemeten api-geval. Dit is de enige reden dat de ernst daalt,
       en het rust op een geslaagde taak in een gedeelde tabel. */
    const r = backupAanvaardbaar({ externNiveau: null, taakUren: 1.1, drempelUren: DREMPEL });
    assert.equal(r.aanvaard, true);
    assert.equal(r.viaTakenlogboek, true);
    assert.match(r.grond, /takenlogboek/);
    assert.match(r.grond, /1\.1 uur/);
  });

  /* ---------- en nu de vier gevallen waarin de ernst MOET blijven ---------- */

  it("ONTBREKENDE BACK-UP: geen enkele geslaagde taak is nooit aanvaard", () => {
    const r = backupAanvaardbaar({ externNiveau: null, taakUren: null, drempelUren: DREMPEL });
    assert.equal(r.aanvaard, false);
    assert.match(r.grond, /geen enkele geslaagde back-uptaak/);
  });

  it("VERLOPEN RETENTIE: een taak ouder dan de RPO is geen bewijs meer", () => {
    /* 27 uur bij een grens van 26: één uur te oud is te oud. Een
       drempel die 'ongeveer' wordt toegepast, is geen drempel. */
    const r = backupAanvaardbaar({ externNiveau: null, taakUren: 27, drempelUren: DREMPEL });
    assert.equal(r.aanvaard, false);
    assert.match(r.grond, /ouder dan de RPO/);
    /* En precies op de grens mag het nog wel. */
    assert.equal(
      backupAanvaardbaar({ externNiveau: null, taakUren: DREMPEL, drempelUren: DREMPEL }).aanvaard,
      true,
    );
  });

  it("EEN METBARE MAAR ONGEZONDE BUCKET wordt NIET vergoelijkt door het logboek", () => {
    /* De belangrijkste regel van dit bestand. Is de bucket meetbaar en
       niet gezond — leeg, onbereikbaar, of een dump van vier dagen oud —
       dan is er iets echt mis, en een geslaagde taak van een uur geleden
       maakt dat juist verwarrender in plaats van beter. */
    for (const niveau of ["FOUT", "LET OP", "NIET GEMETEN"] as const) {
      const r = backupAanvaardbaar({ externNiveau: niveau, taakUren: 0.5, drempelUren: DREMPEL });
      assert.equal(r.aanvaard, false, `${niveau} mag niet aanvaard worden`);
      assert.match(r.grond, /meetbaar maar niet gezond/);
    }
  });

  it("een negatieve of absurde taakleeftijd levert geen aanvaarding op uit het niets", () => {
    /* Grensgeval: een klok die achteruit liep. Een negatief getal is
       'binnen de drempel' en zou dus aanvaard worden — dat is hier
       acceptabel omdat het nog steeds een GESLAAGDE taak betreft, maar
       het mag niet aanvaard worden ZONDER taak. */
    assert.equal(backupAanvaardbaar({ externNiveau: null, taakUren: null, drempelUren: 0 }).aanvaard, false);
  });
});
