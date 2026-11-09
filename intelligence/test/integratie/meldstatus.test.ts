/* ============================================================
   TEST — geaccepteerd is niet afgeleverd, en een bounce is zichtbaar
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET.

   Gemeten op 9 november 2026 in productie: 54 meldberichten, 54
   `geaccepteerd_op`, 0 `opgegeven_op`, en `afgeleverd_op` leeg bij alle
   54. Een bounce was daarmee onzichtbaar: een melding naar een postbus
   die niet bestaat leest in het dashboard als geaccepteerd en dus als
   geslaagd.

   Deze zaken toetsen de vijf standen tegen een echte database, met een
   GEÏNJECTEERD statuspad. Er wordt dus geen enkele e-mail verzonden en
   geen enkele aanroep naar Resend gedaan — zaak 7 bewijst dat laatste
   apart, want een vergeten mock zou een stille HTTPS-aanvraag worden.

   DE TWEE REGELS DIE HET ZWAARST WEGEN
     · een onbekend antwoord laat de rij ONGEMOEID. Er wordt nooit een
       stand geraden, want een geraden 'afgeleverd' verbergt een bounce.
     · 401 is NIET GEMETEN en niet 'niet afgeleverd'. Dat is de
       werkelijke stand van vandaag: de sleutel is send-only.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, beforeEach, describe, test } from "node:test";
import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie, rijen } from "../../src/kern/db.ts";
import {
  pasStandToe,
  resendStatuspad,
  standUitProvider,
  werkBezorgstandenBij,
  type Statuspad,
} from "../../src/ops/meldstatus.ts";

describe("de bezorgstand van een melding", () => {
  let db: Wegwerpdatabase;
  let org: number;

  before(async () => {
    db = await maakWegwerpdatabase("meldstatus");
  });

  after(async () => {
    await db?.opruimen();
  });

  /* ELKE ZAAK KRIJGT EEN EIGEN ORGANISATIE, en dat is geen luxe:
     intel.meld_berichten is APPEND-ONLY (migratie 0039 draagt een
     trigger die DELETE weigert; alleen de bezorgvelden mogen worden
     bijgewerkt). Opruimen tussen de zaken kan dus niet, en zonder
     isolatie zou elke ronde de berichten van de vorige zaak meetellen.
     De RLS hangt aan app.organisatie_id, dus een eigen organisatie is
     de schone scheiding die het schema zelf aanbiedt. */
  let teller = 0;
  beforeEach(async () => {
    teller += 1;
    org = await maakOrganisatie(db, `meldstatus-${teller}`);
  });

  /** Eén bericht dat de provider heeft aangenomen. */
  async function bericht(providerId: string): Promise<number> {
    let id = 0;
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const r = await c.query<{ id: number }>(
        `insert into intel.meld_berichten
           (organisatie_id, soort, bundel, vingerafdruk, onderwerp, html, tekst, melding_ids,
            aangeboden_op, geaccepteerd_op, provider, provider_id, pogingen)
         values ($1,'CRITICAL','backup',$2,'[CRITICAL] proef','<p>x</p>','x',array[]::bigint[],
                 now(), now(), 'resend', $3, 1)
         returning id`,
        /* De vingerafdruk moet 16-64 hextekens zijn
           (meldberichten_vingerafdruk_vorm); een leesbare naam mag daar
           niet in. */
        [org, providerId.replace(/[^0-9a-f]/g, "0").padEnd(16, "a").slice(0, 16), providerId],
      );
      id = r.rows[0]!.id;
    });
    return id;
  }

  async function stand(id: number) {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<{
        afgeleverd_op: Date | null;
        gelezen_op: Date | null;
        geweigerd_op: Date | null;
        laatste_fout: string | null;
      }>(
        c,
        `select afgeleverd_op, gelezen_op, geweigerd_op, laatste_fout
           from intel.meld_berichten where organisatie_id = $1 and id = $2`,
        [org, id],
      ),
    );
    return r[0]!;
  }

  const pad = (lichaam: unknown, status = 200): Statuspad => async () => ({ status, lichaam });

  test("1 · de afbeelding van het provider-antwoord raadt nooit", () => {
    assert.equal(standUitProvider({ last_event: "delivered" }).stand, "AFGELEVERD");
    assert.equal(standUitProvider({ last_event: "bounced" }).stand, "GEWEIGERD");
    assert.equal(standUitProvider({ last_event: "opened" }).stand, "GELEZEN");
    assert.equal(standUitProvider({ last_event: "queued" }).stand, "GEACCEPTEERD");
    /* Een spamklacht is AANGEKOMEN; dat is een redactioneel signaal en
       geen bezorgfout. */
    assert.equal(standUitProvider({ last_event: "complained" }).stand, "AFGELEVERD");
    /* En het hart van de zaak: alles wat hij niet kent is NIET GEMETEN. */
    assert.equal(standUitProvider({ last_event: "iets_nieuws" }).stand, "NIET GEMETEN");
    assert.equal(standUitProvider({}).stand, "NIET GEMETEN");
    assert.equal(standUitProvider(null).stand, "NIET GEMETEN");
    assert.equal(standUitProvider("delivered").stand, "NIET GEMETEN");
  });

  test("2 · delivered zet afgeleverd_op, en een tweede ronde verschuift hem NIET", async () => {
    const id = await bericht("a1");
    const een = await werkBezorgstandenBij(db.pool, org, { pad: pad({ last_event: "delivered" }) });
    assert.equal(een.gewijzigd, 1, JSON.stringify(een));
    const na1 = await stand(id);
    assert.ok(na1.afgeleverd_op, "afgeleverd_op hoort gezet te zijn");

    /* IDEMPOTENT. Een herhaalde ronde mag het MOMENT van aflevering niet
       opschuiven; anders liegt de tijdlijn bij elke poll. */
    const twee = await werkBezorgstandenBij(db.pool, org, { pad: pad({ last_event: "delivered" }) });
    assert.equal(twee.bekeken, 0, "een afgeleverd bericht hoort niet meer in de werkvoorraad");
    const na2 = await stand(id);
    assert.equal(
      na2.afgeleverd_op?.toISOString(),
      na1.afgeleverd_op?.toISOString(),
      "het tijdstempel is onveranderd",
    );
  });

  test("3 · bounced krijgt een EIGEN tijdstempel, met de grond, en is NIET afgeleverd", async () => {
    const id = await bericht("a2");
    const r = await werkBezorgstandenBij(db.pool, org, { pad: pad({ last_event: "bounced" }) });
    assert.equal(r.gewijzigd, 1);
    const na = await stand(id);
    assert.ok(na.geweigerd_op, "een harde weigering hoort een eigen tijdstempel te krijgen");
    assert.equal(na.afgeleverd_op, null, "en hij is NIET afgeleverd");
    assert.match(na.laatste_fout ?? "", /^GEWEIGERD DOOR DE ONTVANGER/, na.laatste_fout ?? "");
    assert.match(na.laatste_fout ?? "", /bounced/);
  });

  test("4 · opened zet ook afgeleverd, want de orde is onomkeerbaar", async () => {
    /* Migratie 0039 draagt `gelezen_op is null or afgeleverd_op is not
       null`. Een 'opened' zonder eerdere 'delivered' betekent dat we de
       aflevering hebben gemist, niet dat hij niet is gebeurd. */
    const id = await bericht("a3");
    const r = await werkBezorgstandenBij(db.pool, org, { pad: pad({ last_event: "opened" }) });
    assert.equal(r.gewijzigd, 1);
    const na = await stand(id);
    assert.ok(na.gelezen_op, "gelezen_op hoort gezet te zijn");
    assert.ok(na.afgeleverd_op, "en afgeleverd_op mag niet leeg blijven");
  });

  test("5 · HTTP 401 is NIET GEMETEN en verandert niets", async () => {
    /* DE WERKELIJKE STAND VAN 9 NOVEMBER 2026: de Resend-sleutel is
       send-only en geeft `This API key is restricted to only send
       emails`. Dat is geen bezorgfout. */
    const id = await bericht("a4");
    const r = await werkBezorgstandenBij(db.pool, org, {
      pad: pad({ message: "This API key is restricted to only send emails" }, 401),
    });
    assert.equal(r.bekeken, 1);
    assert.equal(r.gewijzigd, 0, "er mag niets zijn gewijzigd");
    assert.equal(r.nietGemeten, 1);
    assert.match(r.toepassingen[0]?.grond ?? "", /alleen verzenden/);
    const na = await stand(id);
    assert.equal(na.afgeleverd_op, null);
    assert.equal(na.geweigerd_op, null, "een 401 mag geen bericht als geweigerd boeken");
  });

  test("6 · een ONBEKEND antwoord laat de rij ongemoeid", async () => {
    const id = await bericht("a5");
    const r = await werkBezorgstandenBij(db.pool, org, { pad: pad({ last_event: "zweeft" }) });
    assert.equal(r.gewijzigd, 0);
    assert.equal(r.nietGemeten, 1);
    assert.match(r.toepassingen[0]?.grond ?? "", /er wordt niets geraden/);
    const na = await stand(id);
    assert.equal(na.afgeleverd_op, null);
  });

  test("6b · een gooiend statuspad is NIET GEMETEN en geen uitzondering", async () => {
    const id = await bericht("a6");
    const stuk: Statuspad = async () => {
      throw new Error("ECONNRESET");
    };
    const r = await werkBezorgstandenBij(db.pool, org, { pad: stuk });
    assert.equal(r.nietGemeten, 1, "de ronde hoort door te lopen");
    assert.match(r.toepassingen[0]?.grond ?? "", /mislukte/);
    assert.equal((await stand(id)).afgeleverd_op, null);
  });

  test("7 · zonder leespad wordt er NIETS gevraagd", async () => {
    /* Met INTEL_NETWERK_TOEGESTAAN=0 (test/netwerk-uit.ts) mag
       resendStatuspad() geen pad teruggeven, ook niet als er een sleutel
       in de omgeving staat. Een vergeten mock wordt dan geen stille
       HTTPS-aanvraag naar een echte provider. */
    const bewaard = process.env["RESEND_API_KEY"];
    process.env["RESEND_API_KEY"] = "re_nep_voor_de_toets";
    try {
      assert.equal(resendStatuspad(), null, "het netwerk staat uit; er hoort geen pad te zijn");
      await bericht("a7");
      const r = await werkBezorgstandenBij(db.pool, org, {});
      assert.equal(r.bekeken, 0);
      assert.match(r.reden ?? "", /NIET GEMETEN; dat is iets anders dan niet afgeleverd/);
    } finally {
      if (bewaard === undefined) delete process.env["RESEND_API_KEY"];
      else process.env["RESEND_API_KEY"] = bewaard;
    }
  });

  test("8 · pasStandToe is apart aanroepbaar, zodat een webhook dezelfde regels gebruikt", async () => {
    /* Komt er ooit een ondertekende providerwebhook, dan schrijft die in
       DEZELFDE kolommen via DEZELFDE functie. Daarom is hij apart
       geëxporteerd en niet in de ronde begraven. */
    const id = await bericht("a8");
    const gewijzigd = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pasStandToe(c, org, id, { stand: "AFGELEVERD", grond: "webhook: email.delivered" }),
    );
    assert.equal(gewijzigd, true);
    assert.ok((await stand(id)).afgeleverd_op);

    const nogmaals = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pasStandToe(c, org, id, { stand: "AFGELEVERD", grond: "webhook: herhaling" }),
    );
    assert.equal(nogmaals, false, "een herhaalde webhook verandert niets");
  });

  test("9 · GEACCEPTEERD en NIET GEMETEN schrijven per definitie niets", async () => {
    const id = await bericht("a9");
    for (const s of ["GEACCEPTEERD", "NIET GEMETEN"] as const) {
      const w = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
        pasStandToe(c, org, id, { stand: s, grond: "proef" }),
      );
      assert.equal(w, false, `${s} hoort niets te schrijven`);
    }
    const na = await stand(id);
    assert.equal(na.afgeleverd_op, null);
    assert.equal(na.geweigerd_op, null);
  });
});
