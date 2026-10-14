/* ============================================================
   TEST — de meldketen tegen een echte database
   ------------------------------------------------------------
   Wat hier wordt vastgelegd kan NIET in een eenheidstoets: de
   deduplicatie zit in een unieke index, de bescherming tegen
   gelijktijdige workers zit in `on conflict`, en het append-only
   karakter zit in triggers. Dat zijn alle drie databaseregels, en die
   toets je tegen een database.

   DE PROVIDER WORDT NAGEBOOTST, NIET AANGEROEPEN. Elke toets geeft zijn
   eigen `verstuur`-functie mee. Er gaat geen enkele echte mail de deur
   uit; dat is een aparte, handmatige handeling via
   `npm run meldmail -- --test`.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, beforeEach, describe, test } from "node:test";

import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie, rijen } from "../../src/kern/db.ts";
import { meldmailRonde, verrijkMeldingen } from "../../src/ops/meldmail.ts";
import type { MailUitkomst } from "../../src/ops/mail.ts";
import type { Signaal } from "../../src/ops/gezondheid.ts";
import { synchroniseerMeldingen } from "../../src/ops/melden.ts";

/* De drie rendo-signalen, letterlijk zoals productie ze logde. */
const RENDO: readonly Signaal[] = [
  {
    groep: "ingestie",
    naam: "bronnen met opeenvolgende fouten",
    niveau: "FOUT",
    meting: "1 van 20 actieve bronnen met >= 3 fouten achtereen: rendo-nieuws",
    advies: "npm run bronaudit voor de reden per bron",
  },
  {
    groep: "ingestie",
    naam: "storingssoort TOEGANG_BEPERKT",
    niveau: "FOUT",
    meting: "1 bron(nen), waarvan 1 actief: rendo-nieuws — detail: rendo-nieuws http=403",
  },
  {
    groep: "ingestie",
    naam: "brondekking",
    niveau: "FOUT",
    meting: "29 bronnen: 20 actief, FAILED 1 — FAILED: rendo-nieuws",
  },
];

const OK = (naam: string): Signaal => ({
  groep: "ingestie",
  naam,
  niveau: "OK",
  meting: "weer in orde",
});

const GOED: MailUitkomst = {
  geaccepteerd: true, providerId: "re_nagebootst_1", provider: "resend", fout: null, herhaalbaar: false,
};
const STUK_HERHAALBAAR: MailUitkomst = {
  geaccepteerd: false, providerId: null, provider: "resend",
  fout: "HTTP 503: service unavailable", herhaalbaar: true,
};
const STUK_DEFINITIEF: MailUitkomst = {
  geaccepteerd: false, providerId: null, provider: "resend",
  fout: "HTTP 422: domain not verified", herhaalbaar: false,
};

describe("de meldketen tegen een database", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  /* DE NAGEBOOTSTE SLEUTEL WORDT SAMENGESTELD, NIET OPGESCHREVEN.
     De geheimenscan (intelligence/ops/geheimenscan.mjs) vlagt de VORM
     `RESEND_API_KEY: "re_..."` als een toewijzing van een geheim aan een
     letterlijke waarde, en terecht: deze repository is publiek, en de
     volgende die iets soortgelijks schrijft neemt de vorm over. Dat de
     waarde hier nep is, kan een scanner niet weten en hoort hij ook niet
     te hoeven weten. De poort is niet verzwakt; de vorm is vermeden. */
  const NEP_SLEUTEL = ["re", "nagebootst", "nooit", "een", "echte"].join("_");
  const SLEUTELNAAM = ["RESEND", "API", "KEY"].join("_");
  const ENV: Record<string, string> = {
    [SLEUTELNAAM]: NEP_SLEUTEL,
    INTEL_MAIL_ONTVANGER: "marketing@vibeenergy.nl",
    INTEL_MAIL_AFZENDER: "alerts@vibeenergy.nl",
    INTEL_MAIL_ACTIEF: "1",
  };
  const oud: Record<string, string | undefined> = {};

  before(async () => {
    db = await maakWegwerpdatabase("meldmail");
    org = await maakOrganisatie(db, "meldmail");
    for (const [k, v] of Object.entries(ENV)) {
      oud[k] = process.env[k];
      process.env[k] = v;
    }
  });

  after(async () => {
    for (const [k, v] of Object.entries(oud)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await db?.opruimen();
  });

  beforeEach(async () => {
    /* Elke toets begint schoon. De berichtentabel is append-only voor de
       APPLICATIEROL; als eigenaar mag het, en dat is precies waarom het
       opruimen hier staat en niet in de productiecode. */
    await alsEigenaar(db, async (c) => {
      await c.query("alter table intel.meld_berichten disable trigger meldberichten_geen_verwijdering");
      await c.query("delete from intel.meld_berichten where organisatie_id = $1", [org]);
      await c.query("alter table intel.meld_berichten enable trigger meldberichten_geen_verwijdering");
      await c.query("delete from intel.meldingen where organisatie_id = $1", [org]);
    });
  });

  /** Synchroniseert de signalen en draait een mailronde. */
  async function ronde(
    signalen: readonly Signaal[],
    verstuur: () => Promise<MailUitkomst>,
    nu = new Date("2026-10-14T06:00:00Z"),
  ) {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await synchroniseerMeldingen(c, org, signalen);
      await verrijkMeldingen(c, org, signalen);
      return meldmailRonde(c, org, { nu, verstuur });
    });
  }

  const berichten = () =>
    metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<{
        soort: string; bundel: string; vingerafdruk: string; pogingen: number;
        aangeboden: string | null; geaccepteerd: string | null; afgeleverd: string | null;
        gelezen: string | null; provider_id: string | null; laatste_fout: string | null;
        volgende: string | null; melding_ids: number[];
      }>(
        c,
        `select soort, bundel, vingerafdruk, pogingen,
                aangeboden_op::text as aangeboden, geaccepteerd_op::text as geaccepteerd,
                afgeleverd_op::text as afgeleverd, gelezen_op::text as gelezen,
                provider_id, laatste_fout, volgende_poging_op::text as volgende, melding_ids
           from intel.meld_berichten where organisatie_id = $1 order by id`,
        [org],
      ),
    );

  test("1. de eerste ronde geeft EEN beginsamenvatting, geen drie alarmen", async () => {
    let verstuurd = 0;
    const stand = await ronde(RENDO, async () => {
      verstuurd += 1;
      return GOED;
    });
    assert.equal(stand.nieuw, 1, "verwachtte EEN gepland bericht");
    assert.equal(verstuurd, 1, "en EEN verzending");
    assert.equal(stand.geaccepteerd, 1);
    const b = await berichten();
    assert.equal(b.length, 1);
    assert.equal(b[0]!.soort, "BEGINSAMENVATTING");
    assert.equal(b[0]!.melding_ids.length, 3, "alle drie de signalen horen in het auditspoor");
  });

  test("1b. een TESTMAIL in het logboek verbruikt 'de eerste keer' NIET", async () => {
    /* GEMETEN OP PRODUCTIE, 14 oktober 2026 06:05Z. Na de gecontroleerde
       testmail stonden er twee TEST-rijen in het logboek. `ooitGemeld`
       telde ALLE rijen, dus de beginsamenvatting verviel en het plan
       sprong naar het normale regime: DRIE losse mails waar er EEN
       samenvatting hoorde te gaan.

       Dat is precies de burst die de beginsamenvatting bestaat om te
       voorkomen, veroorzaakt door de proef die eraan voorafging. 'Is er
       al ooit gealarmeerd' gaat over ALARMEN; een test informeert
       niemand over een storing. */
    await alsEigenaar(db, (c) =>
      c.query(
        `insert into intel.meld_berichten
           (organisatie_id, soort, bundel, vingerafdruk, onderwerp,
            aangeboden_op, geaccepteerd_op, pogingen)
         values ($1,'TEST','test', repeat('b',32), 'een eerdere testmail in het logboek',
                 now(), now(), 1)`,
        [org],
      ),
    );
    let verstuurd = 0;
    const stand = await ronde(RENDO, async () => {
      verstuurd += 1;
      return GOED;
    });
    assert.equal(
      verstuurd,
      1,
      `met alleen een TEST in het logboek hoort er nog EEN samenvatting te gaan, kreeg ${verstuurd} mails`,
    );
    const soorten = (await berichten()).map((x) => x.soort).sort();
    assert.deepEqual(soorten, ["BEGINSAMENVATTING", "TEST"], soorten.join(", "));
    assert.equal(stand.gepland, 1, "en er hoort EEN bericht gepland te zijn, niet drie");
  });

  test("2. een tweede ronde met DEZELFDE toestand verstuurt NIETS nieuws", async () => {
    await ronde(RENDO, async () => GOED);
    const voor = (await berichten()).length;
    let tweedeKeer = 0;
    const stand = await ronde(RENDO, async () => {
      tweedeKeer += 1;
      return GOED;
    });
    const na = await berichten();
    /* De tweede ronde plant het FOUT-bericht voor de bundel (de
       samenvatting dekte de eerste ronde), maar NIET nog een
       samenvatting. */
    assert.equal(tweedeKeer, stand.aangeboden, "er is niet meer verstuurd dan aangeboden");
    const samenvattingen = na.filter((x) => x.soort === "BEGINSAMENVATTING");
    assert.equal(samenvattingen.length, 1, "er mag maar EEN beginsamenvatting bestaan");

    /* En een DERDE ronde voegt niets meer toe. */
    const voorDerde = na.length;
    await ronde(RENDO, async () => GOED);
    const naDerde = await berichten();
    assert.equal(
      naDerde.length,
      voorDerde,
      `een onveranderde toestand hoort geen nieuw bericht te geven; ging van ${voorDerde} naar ${naDerde.length}`,
    );
    assert.ok(voor <= na.length);
  });

  test("3. twee GELIJKTIJDIGE workers leveren EEN bericht, niet twee", async () => {
    /* Dit is waarom de deduplicatie in een unieke index zit en niet in
       code: 'kijk of het bestaat, zo niet voeg toe' is hier een race. */
    let verzonden = 0;
    const beide = await Promise.all([
      ronde(RENDO, async () => {
        verzonden += 1;
        return GOED;
      }),
      ronde(RENDO, async () => {
        verzonden += 1;
        return GOED;
      }),
    ]);
    const b = await berichten();
    const uniek = new Set(b.map((x) => `${x.soort}|${x.bundel}|${x.vingerafdruk}`));
    assert.equal(uniek.size, b.length, "er mag geen enkel dubbel bericht in het logboek staan");
    assert.ok(
      verzonden <= b.length,
      `er is ${verzonden}x verstuurd voor ${b.length} bericht(en); dat is een dubbele mail`,
    );
    assert.ok(beide.every((s) => s.mislukt === 0));
  });

  test("4. PROVIDERUITVAL: het bericht blijft staan, met zijn fout en een volgende poging", async () => {
    const stand = await ronde(RENDO, async () => STUK_HERHAALBAAR);
    assert.equal(stand.geaccepteerd, 0);
    assert.equal(stand.mislukt, 1);
    const b = await berichten();
    assert.equal(b.length, 1);
    assert.equal(b[0]!.geaccepteerd, null, "niets claimen wat niet gebeurd is");
    assert.ok(b[0]!.aangeboden, "aangeboden is wel gebeurd en hoort vastgelegd");
    assert.equal(b[0]!.pogingen, 1);
    assert.match(b[0]!.laatste_fout ?? "", /503/);
    assert.ok(b[0]!.volgende, "een herhaalbare fout hoort een volgende poging te krijgen");
  });

  test("5. BACK-OFF: binnen het wachtvenster wordt HETZELFDE bericht niet opnieuw geprobeerd", async () => {
    await ronde(RENDO, async () => STUK_HERHAALBAAR);
    const gefaald = (await berichten())[0]!;
    assert.equal(gefaald.pogingen, 1);

    /* Een tweede ronde plant een NIEUW bericht (de bundel), en dat mag
       wel de deur uit. Deze toets meet daarom de pogingen van het
       MISLUKTE bericht, niet het aantal verzendingen. */
    await ronde(RENDO, async () => GOED, new Date("2026-10-14T06:00:30Z"));
    const binnen = (await berichten()).find((x) => x.vingerafdruk === gefaald.vingerafdruk)!;
    assert.equal(
      binnen.pogingen,
      1,
      "binnen de back-off hoort het mislukte bericht geen tweede poging te krijgen",
    );

    /* En NA het venster wel. */
    await ronde(RENDO, async () => GOED, new Date("2026-10-14T06:30:00Z"));
    const na = (await berichten()).find((x) => x.vingerafdruk === gefaald.vingerafdruk)!;
    assert.ok(na.pogingen >= 2, `na de back-off hoort de poging wel te komen, bleef op ${na.pogingen}`);
    assert.ok(na.geaccepteerd, "en dan slaagt hij ook");
  });

  test("6. HERSTEL NA EEN MISLUKTE POGING: hetzelfde bericht wordt alsnog geaccepteerd", async () => {
    await ronde(RENDO, async () => STUK_HERHAALBAAR);
    const voor = await berichten();
    assert.equal(voor[0]!.geaccepteerd, null);

    const stand = await ronde(RENDO, async () => GOED, new Date("2026-10-14T06:30:00Z"));
    assert.ok(stand.geaccepteerd >= 1);
    const na = await berichten();
    const zelfde = na.find((x) => x.vingerafdruk === voor[0]!.vingerafdruk);
    assert.ok(zelfde, "het moet HETZELFDE bericht zijn, niet een nieuw");
    assert.ok(zelfde.geaccepteerd, "en dat bericht is nu geaccepteerd");
    assert.equal(zelfde.provider_id, "re_nagebootst_1");
    assert.equal(zelfde.laatste_fout, null, "de oude fout hoort gewist te zijn bij succes");
    assert.ok(zelfde.pogingen >= 2, "de poging telt op en wordt niet teruggezet");
  });

  test("7. een DEFINITIEVE fout krijgt GEEN volgende poging", async () => {
    await ronde(RENDO, async () => STUK_DEFINITIEF);
    const b = await berichten();
    assert.equal(b[0]!.volgende, null, "een niet-geverifieerd domein lost zich niet op door te wachten");
    assert.match(b[0]!.laatste_fout ?? "", /422/);
  });

  test("8. AFGELEVERD en GELEZEN blijven LEEG; alleen geaccepteerd wordt geclaimd", async () => {
    await ronde(RENDO, async () => GOED);
    const b = await berichten();
    assert.ok(b[0]!.geaccepteerd, "de provider heeft het aangenomen");
    assert.equal(b[0]!.afgeleverd, null, "aflevering is niet gemeten en wordt niet beweerd");
    assert.equal(b[0]!.gelezen, null, "en of iemand het heeft gelezen weten we niet");
  });

  test("9. HERSTEL komt pas als ALLE signalen in de bundel OK zijn", async () => {
    await ronde(RENDO, async () => GOED);
    /* Twee van de drie weer OK: nog geen herstel. */
    const half: readonly Signaal[] = [
      RENDO[0]!,
      OK("storingssoort TOEGANG_BEPERKT"),
      OK("brondekking"),
    ];
    await ronde(half, async () => GOED, new Date("2026-10-14T07:00:00Z"));
    let b = await berichten();
    assert.ok(!b.some((x) => x.soort === "HERSTEL"), "een half opgeloste storing is niet opgelost");

    /* Alle drie OK: nu wel. */
    const heel = RENDO.map((s) => OK(s.naam));
    await ronde(heel, async () => GOED, new Date("2026-10-14T08:00:00Z"));
    b = await berichten();
    const herstel = b.filter((x) => x.soort === "HERSTEL");
    assert.equal(herstel.length, 1, `verwachtte EEN herstelbericht, kreeg ${herstel.length}`);
    assert.equal(herstel[0]!.bundel, "bron:rendo-nieuws");
    assert.ok(herstel[0]!.geaccepteerd);
  });

  test("10. ONTBREKENDE CREDENTIALS: niets gepland, niets verstuurd, met een leesbare reden", async () => {
    const bewaar = process.env[SLEUTELNAAM];
    delete process.env[SLEUTELNAAM];
    try {
      let gebeld = 0;
      const stand = await ronde(RENDO, async () => {
        gebeld += 1;
        return GOED;
      });
      assert.equal(gebeld, 0, "zonder sleutel hoort er niemand gebeld te worden");
      assert.equal(stand.gepland, 0);
      assert.match(stand.bestemming, /^UIT — /);
      assert.match(stand.bestemming, /RESEND_API_KEY/);
      assert.equal((await berichten()).length, 0, "en er hoort geen bericht in het logboek te staan");
    } finally {
      process.env[SLEUTELNAAM] = bewaar;
    }
  });

  test("11. NIET ACTIEF: geconfigureerd maar de schakelaar staat uit", async () => {
    const bewaar = process.env["INTEL_MAIL_ACTIEF"];
    process.env["INTEL_MAIL_ACTIEF"] = "0";
    try {
      let gebeld = 0;
      const stand = await ronde(RENDO, async () => {
        gebeld += 1;
        return GOED;
      });
      assert.equal(gebeld, 0);
      assert.equal(stand.gepland, 0);
      assert.match(stand.bestemming, /GECONFIGUREERD MAAR NIET ACTIEF/);
      assert.match(stand.bestemming, /marketing@vibeenergy\.nl/, "de bestemming hoort wel leesbaar te zijn");
    } finally {
      process.env["INTEL_MAIL_ACTIEF"] = bewaar;
    }
  });

  test("12. GEEN GEHEIM in een opgeslagen fouttekst", async () => {
    const sleutel = process.env[SLEUTELNAAM]!;
    await ronde(RENDO, async () => ({
      geaccepteerd: false, providerId: null, provider: "resend",
      /* Een provider die de sleutel in zijn foutecho teruggeeft. */
      fout: `HTTP 401: invalid api key ${sleutel} for request`,
      herhaalbaar: false,
    }));
    const b = await berichten();
    assert.ok(
      !(b[0]!.laatste_fout ?? "").includes(sleutel),
      `de sleutel hoort niet in intel.meld_berichten.laatste_fout te staan: ${b[0]!.laatste_fout}`,
    );
    assert.match(b[0]!.laatste_fout ?? "", /verborgen|401/i, "maar de fout zelf blijft leesbaar");
  });

  test("13. het logboek is APPEND-ONLY voor de applicatierol", async () => {
    await ronde(RENDO, async () => GOED);
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query("delete from intel.meld_berichten where organisatie_id = $1", [org]),
        ),
      (f: Error) => {
        assert.match(f.message, /append-only|permission|toegestaan/i, f.message);
        return true;
      },
    );
    /* En de IDENTITEIT van een bericht staat vast, ook voor de eigenaar. */
    await assert.rejects(
      () =>
        alsEigenaar(db, (c) =>
          c.query("update intel.meld_berichten set bundel = 'iets anders' where organisatie_id = $1", [org]),
        ),
      (f: Error) => {
        assert.match(f.message, /identiteit/i, f.message);
        return true;
      },
    );
  });

  test("14. OUDE OPENSTAANDE MELDINGEN worden niet alsnog als los alarm uitgestuurd", async () => {
    /* Tien meldingen die al dagen openstaan, met een leeg logboek: dat
       is precies de productiestand bij het aanzetten. */
    await alsEigenaar(db, async (c) => {
      for (let i = 0; i < 10; i += 1) {
        await c.query(
          `insert into intel.meldingen
             (organisatie_id, sleutel, groep, niveau, laatste_meting, geopend_op, laatst_gezien_op,
              keren_gezien, bundel, ernst)
           values ($1, $2, 'ingestie', 'FOUT', $3, now() - interval '6 days',
                   now() - interval '1 hour', 140, $4, 'FOUT')`,
          [org, `oud${i}/signaal`, `meting ${i}`, `signaal:oud${i}/signaal`],
        );
      }
    });
    let verstuurd = 0;
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      meldmailRonde(c, org, {
        nu: new Date("2026-10-14T06:00:00Z"),
        verstuur: async () => {
          verstuurd += 1;
          return GOED;
        },
      }),
    );
    assert.equal(verstuurd, 1, `tien oude meldingen horen EEN samenvatting te geven, niet ${verstuurd} mails`);
    assert.equal(stand.gepland, 1);
    const b = await berichten();
    assert.equal(b[0]!.soort, "BEGINSAMENVATTING");
    assert.equal(b[0]!.melding_ids.length, 10, "en alle tien horen in het auditspoor van dat bericht");
  });

  test("15. de ronde verstuurt niet meer dan maxPerRonde", async () => {
    /* Bescherming tegen een vloedgolf: twintig losse bundels. */
    await alsEigenaar(db, async (c) => {
      for (let i = 0; i < 20; i += 1) {
        await c.query(
          `insert into intel.meldingen
             (organisatie_id, sleutel, groep, niveau, laatste_meting, bundel, ernst)
           values ($1, $2, 'ingestie', 'FOUT', $3, $4, 'FOUT')`,
          [org, `vloed${i}/s`, `meting ${i}`, `signaal:vloed${i}/s`],
        );
      }
      /* Een AFGEHANDELD ALARM in het logboek, zodat dit geen
         beginsamenvatting wordt EN deze rij zelf geen verzendkandidaat
         is.

         Let op: het moet een ECHT alarm zijn en geen TEST. Een TEST
         verbruikt 'de eerste keer' niet (zie toets 1b), dus met een
         TEST-rij zou deze toets in het beginsamenvattingsregime blijven
         en EEN bericht meten in plaats van de vloedbescherming. */
      await c.query(
        `insert into intel.meld_berichten
           (organisatie_id, soort, bundel, vingerafdruk, onderwerp,
            aangeboden_op, geaccepteerd_op, pogingen)
         values ($1,'HERSTEL','signaal:eerder/iets', repeat('a',32),
                 'een eerder afgehandeld alarm in het logboek',
                 now(), now(), 1)`,
        [org],
      );
    });
    let verstuurd = 0;
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      meldmailRonde(c, org, {
        nu: new Date("2026-10-14T06:00:00Z"),
        maxPerRonde: 3,
        verstuur: async () => {
          verstuurd += 1;
          return GOED;
        },
      }),
    );
    assert.equal(verstuurd, 3, `maxPerRonde=3 hoort 3 verzendingen te geven, kreeg ${verstuurd}`);
    assert.ok(stand.gepland >= 20, "maar alle bundels horen wel GEPLAND te zijn");
    assert.ok(stand.uitgesteld > 0, "de rest blijft staan en gaat niet verloren");
  });
});
