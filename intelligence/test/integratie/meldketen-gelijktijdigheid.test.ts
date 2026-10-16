/* ============================================================
   TEST — gelijktijdigheid, crashwindow en herstart in de meldketen
   ------------------------------------------------------------
   DIT BESTAND BEGON ROOD. Het reproduceerde een gemeten defect: twee
   gelijktijdige rondes verstuurden dezelfde onverzonden rij twee keer
   ("er is 2x verstuurd voor EEN onverzonden rij", 15 oktober 2026 op
   fb65932). Het stond daarom tijdelijk buiten `npm test`, in
   test/bevinding/. Nu de grendels er zijn hoort het in de poort, en dat
   is waar het staat.

   DE TWEE GRENDELS DIE HIER GETOETST WORDEN

   1 `for update skip locked` op de selectie in ops/meldmail.ts. Twee
     rondes kunnen dezelfde rij niet meer samen selecteren; de tweede
     slaat hem over in plaats van te blokkeren, want de eerste
     transactie loopt door tot NA de netwerkaanroep.
   2 De claim: een voorwaardelijke UPDATE die `pogingen` verhoogt en de
     voorwaarden als predicaat herhaalt. Een UPDATE die op een
     rijvergrendeling wacht herbeoordeelt onder READ COMMITTED zijn
     WHERE op de nieuwe rijversie, dus wie als tweede komt krijgt
     rowCount 0 en biedt niets aan. Dat dekt ook aanroepers die niet
     langs dezelfde selectie komen.

   WAT GEEN DATABASEGRENDEL KAN: DE CRASHWINDOW. Accepteert de provider
   het bericht en valt onze transactie daarna weg, dan weet de database
   van niets en biedt een volgende ronde hetzelfde bericht opnieuw aan.
   Dat is geen race maar het ontbreken van een gedeelde transactie met
   een externe partij, en het is alleen bij de provider op te lossen.
   Daarom draagt elke aanbieding een idempotentiesleutel, en daarom
   toetsen toets 2 en 3 hieronder niet wat er verstuurd wordt maar WELKE
   SLEUTEL meegaat: stabiel over een crash, nieuw na een vastgelegde
   mislukking.

   De provider wordt nagebootst; er gaat geen enkele echte mail uit.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import pg from "pg";

import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie, rijen } from "../../src/kern/db.ts";
import { BACKOFF_MINUTEN, meldmailRonde } from "../../src/ops/meldmail.ts";
import type { MailUitkomst } from "../../src/ops/mail.ts";

describe("de meldketen — gelijktijdigheid, crashwindow en herstart", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  /* De nepsleutel staat er letterlijk, met de gedocumenteerde
     per-regelmarkering van ops/geheimenscan.mjs erboven (zie
     docs/SECURITYREVIEW.md). Dat is beter dan de waarde samenstellen om
     de scanner te ontwijken: zo'n constructie maakt die regel voor ALLE
     toekomstige waarden onzichtbaar, ook voor een echte sleutel. */
  const ENV: Record<string, string> = {
    // geheimenscan: ok — nepsleutel voor de toets, nooit een echte
    RESEND_API_KEY: "re_nagebootst_nooit_een_echte",
    INTEL_MAIL_ONTVANGER: "marketing@vibeenergy.nl",
    INTEL_MAIL_AFZENDER: "alerts@vibeenergy.nl",
    INTEL_MAIL_ACTIEF: "1",
  };
  const oud: Record<string, string | undefined> = {};

  before(async () => {
    db = await maakWegwerpdatabase("gelijktijdig");
    org = await maakOrganisatie(db, "gelijktijdig");
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
    /* Het logboek is append-only voor de APPLICATIEROL; als eigenaar mag
       het, en daarom staat dit in de toets en niet in productiecode. */
    await alsEigenaar(db, async (c) => {
      await c.query("alter table intel.meld_berichten disable trigger meldberichten_geen_verwijdering");
      await c.query("delete from intel.meld_berichten where organisatie_id = $1", [org]);
      await c.query("alter table intel.meld_berichten enable trigger meldberichten_geen_verwijdering");
      await c.query("delete from intel.meldingen where organisatie_id = $1", [org]);
    });
  });

  type Bericht = {
    id: number;
    pogingen: number;
    aangeboden: string | null;
    geaccepteerd: string | null;
    volgende: string | null;
    provider_id: string | null;
    laatste_fout: string | null;
  };

  const berichten = () =>
    metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<Bericht>(
        c,
        `select id, pogingen, aangeboden_op::text as aangeboden,
                geaccepteerd_op::text as geaccepteerd, volgende_poging_op::text as volgende,
                provider_id, laatste_fout
           from intel.meld_berichten where organisatie_id = $1 order by id`,
        [org],
      ),
    );

  /** Een ronde ZONDER signaalstap, voor een stand die al in de database staat. */
  const ronde = (
    verstuur: (b: unknown, s?: string) => Promise<MailUitkomst>,
    nu: Date,
    pool: pg.Pool = db.pool,
  ) => metOrganisatie(pool, { organisatieId: org }, (c) => meldmailRonde(c, org, { nu, verstuur }));

  /** Eén gepland, onverzonden bericht in het logboek. */
  const zetKlaar = (vinger = "c") =>
    alsEigenaar(db, (c) =>
      c.query(
        `insert into intel.meld_berichten
           (organisatie_id, soort, bundel, vingerafdruk, ernst, onderwerp, html, tekst, pogingen)
         values ($1,'FOUT','bron:rendo-nieuws', repeat($2,32), 'FOUT',
                 'storing: bron rendo-nieuws levert niet',
                 '<p>bron rendo-nieuws levert niet</p>',
                 'bron rendo-nieuws levert niet', 0)`,
        [org, vinger],
      ),
    );

  /**
   * Een barriere die losmaakt zodra `aantal` deelnemers er zijn, en in
   * elk geval na `maxWachtMs`.
   *
   * De tijdgrens is geen slordigheid maar de voorwaarde om deze toets te
   * kunnen draaien NU de selectie vergrendelt: er arriveert maar een
   * deelnemer, en zonder grens zou de barriere blijven hangen. Dat de
   * toets daardoor zijn volle wachttijd duurt is zelf een signaal — hij
   * duurde 1,9 s met de grendel en 15 ms zonder.
   */
  function maakBarriere(aantal: number, maxWachtMs: number) {
    let gearriveerd = 0;
    let losmaken: () => void = () => {};
    const poort = new Promise<void>((los) => {
      losmaken = los;
    });
    let timer: ReturnType<typeof setTimeout> | null = null;
    return {
      get gearriveerd() {
        return gearriveerd;
      },
      async wacht(): Promise<void> {
        gearriveerd += 1;
        if (gearriveerd >= aantal) {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          losmaken();
        } else if (!timer) {
          timer = setTimeout(() => {
            timer = null;
            losmaken();
          }, maxWachtMs);
        }
        await poort;
      },
    };
  }

  const NU = new Date("2026-10-14T06:00:00Z");

  test("1. twee GELIJKTIJDIGE rondes versturen EEN BESTAANDE onverzonden rij EEN keer", async () => {
    /* GEEN synchroniseerMeldingen(). Die stap zou de twee rondes op
       rijvergrendelingen in intel.meldingen serialiseren voordat de
       verzendlus in zicht komt, en dan meet de toets de planning in
       plaats van de verzending — precies waarom toets 3 van
       meldmailketen.test.ts dit gat openliet. Hier staat de rij al
       klaar en is het plan leeg, dus het enige dat deze ronde doet is
       VERZENDEN UIT HET LOGBOEK. */
    await zetKlaar();
    const voor = await berichten();
    assert.equal(voor.length, 1, "de opzet hoort EEN rij te zijn");
    assert.equal(voor[0]!.geaccepteerd, null, "en die rij is nog niet verzonden");
    assert.equal(voor[0]!.volgende, null, "en hij wacht niet op een volgende poging");

    const barriere = maakBarriere(2, 1_500);
    const sleutels: string[] = [];
    const verstuur = async (_b: unknown, s?: string): Promise<MailUitkomst> => {
      sleutels.push(s ?? "(geen sleutel)");
      await barriere.wacht();
      return {
        geaccepteerd: true,
        providerId: `re_nagebootst_${sleutels.length}`,
        provider: "resend",
        fout: null,
        herhaalbaar: false,
      };
    };

    const beide = await Promise.all([ronde(verstuur, NU), ronde(verstuur, NU)]);
    const na = await berichten();

    /* DE BESLISSENDE ASSERTIE. Niet 'hoeveel rijen staan er' — dat
       bewaakt de unieke index per constructie en kan dus niet rood
       worden — maar hoe vaak de provider werkelijk is aangeroepen. */
    assert.equal(
      sleutels.length,
      1,
      `er is ${sleutels.length}x verstuurd voor EEN onverzonden rij; ` +
        `${barriere.gearriveerd} van de 2 rondes kwam bij de provider, ` +
        `de rondes meldden aangeboden ${beide.map((s) => s.aangeboden).join(" en ")} ` +
        `en pogingen staat na afloop op ${na[0]!.pogingen}. ` +
        "Een tweede verzending van dezelfde rij is een dubbele mail naar de ontvanger.",
    );

    /* GEEN DUBBELE CLAIM. Precies een van de twee rondes heeft de rij
       aangeboden, en de andere exact nul. */
    assert.deepEqual(
      beide.map((s) => s.aangeboden).sort(),
      [0, 1],
      "precies EEN ronde hoort de rij aan te bieden en de andere nul",
    );
    assert.deepEqual(beide.map((s) => s.geaccepteerd).sort(), [0, 1]);

    /* DE POGINGEN WORDEN EEN KEER GETELD. Zou de claim en de
       uitkomsttak beide verhogen, dan stond hier 2 en was het
       retrybudget gehalveerd. */
    assert.equal(na.length, 1, "de unieke index hoort er EEN rij van te maken");
    assert.equal(na[0]!.pogingen, 1, "een aanbieding is EEN poging");
    assert.ok(na[0]!.geaccepteerd, "en de rij staat als geaccepteerd geregistreerd");
    assert.ok(na[0]!.aangeboden, "met een aanbiedmoment");
    assert.equal(na[0]!.provider_id, "re_nagebootst_1");
    assert.equal(na[0]!.volgende, null, "en zonder volgende poging");
  });

  test("2. CRASHWINDOW: na een rollback na acceptatie gaat dezelfde sleutel mee", async () => {
    /* Dit is het scenario dat geen vergrendeling kan dekken: de provider
       zegt ja, en daarna valt onze transactie weg. De database weet van
       niets, dus de volgende ronde biedt hetzelfde bericht opnieuw aan.
       Wat de tweede mail tegenhoudt is niet onze code maar de provider,
       op grond van de sleutel — dus is de sleutel wat hier getoetst
       wordt. */
    await zetKlaar();
    const sleutels: string[] = [];
    const geaccepteerd = async (_b: unknown, s?: string): Promise<MailUitkomst> => {
      sleutels.push(s ?? "(geen sleutel)");
      return {
        geaccepteerd: true,
        providerId: `re_nagebootst_${sleutels.length}`,
        provider: "resend",
        fout: null,
        herhaalbaar: false,
      };
    };

    /* DE CRASH. De provider accepteert, en daarna gooit het werk — dus
       rolt metOrganisatie de hele transactie terug, inclusief de claim.
       Precies wat een weggevallen verbinding of een statement timeout
       tussen de 200 en de commit doet. */
    await assert.rejects(
      metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
        await meldmailRonde(c, org, { nu: NU, verstuur: geaccepteerd });
        throw new Error("nagebootste crash na provideracceptatie");
      }),
      /nagebootste crash/,
    );

    const naCrash = await berichten();
    assert.equal(naCrash.length, 1, "de rij bestaat nog");
    assert.equal(naCrash[0]!.geaccepteerd, null, "en is NIET als geaccepteerd geregistreerd");
    assert.equal(
      naCrash[0]!.pogingen,
      0,
      "en de poging is niet geteld, want de claim rolde mee terug — " +
        "een crash mag geen retrybudget opsouperen",
    );
    assert.equal(naCrash[0]!.aangeboden, null, "ook het aanbiedmoment is teruggedraaid");

    /* GEEN VASTGELOPEN BERICHT. De volgende ronde pakt hem gewoon op,
       zonder lease, zonder opruimtaak. */
    const tweede = await ronde(geaccepteerd, new Date(NU.getTime() + 60_000));
    assert.equal(tweede.aangeboden, 1, "de volgende ronde biedt hem opnieuw aan");
    assert.equal(sleutels.length, 2, "er zijn twee aanbiedingen gedaan");
    assert.equal(
      sleutels[1],
      sleutels[0],
      "na een crash hoort DEZELFDE idempotentiesleutel mee te gaan; anders stuurt " +
        "de provider een tweede mail voor een bericht dat hij al heeft aangenomen",
    );
    assert.match(
      sleutels[0]!,
      /^intel-[a-z0-9]+-\d+-[0-9a-f]{16}-a0$/,
      "de sleutel hoort omgeving, organisatie, een payloadhash en het antwoordnummer te dragen",
    );
  });

  test("3. RETRY: na een VASTGELEGDE mislukking gaat er een NIEUWE sleutel mee", async () => {
    /* De keerzijde van toets 2. Zou de sleutel alleen van de rij
       afhangen, dan zou de provider 24 uur lang het oude foutantwoord
       teruggeven en zou de retrylogica stilvallen. Een vastgelegde
       mislukking verhoogt `pogingen`, en dus hoort de sleutel te
       veranderen. */
    await zetKlaar();
    const sleutels: string[] = [];
    const faalt = async (_b: unknown, s?: string): Promise<MailUitkomst> => {
      sleutels.push(s ?? "(geen sleutel)");
      return {
        geaccepteerd: false,
        providerId: null,
        provider: "resend",
        fout: "HTTP 503: service unavailable",
        herhaalbaar: true,
      };
    };
    const lukt = async (_b: unknown, s?: string): Promise<MailUitkomst> => {
      sleutels.push(s ?? "(geen sleutel)");
      return {
        geaccepteerd: true,
        providerId: "re_nagebootst_na_retry",
        provider: "resend",
        fout: null,
        herhaalbaar: false,
      };
    };

    const eerste = await ronde(faalt, NU);
    assert.equal(eerste.mislukt, 1, "de eerste poging mislukt");
    const naFout = await berichten();
    assert.equal(naFout[0]!.pogingen, 1, "en is geteld als EEN poging");
    assert.ok(naFout[0]!.laatste_fout, "met de fout erbij");
    assert.ok(naFout[0]!.volgende, "en met een volgende poging");
    assert.ok(naFout[0]!.aangeboden, "het aanbiedmoment staat er, ook bij een mislukking");

    /* BINNEN HET WACHTVENSTER GEBEURT ER NIETS. */
    const tussendoor = await ronde(lukt, new Date(NU.getTime() + 60_000));
    assert.equal(tussendoor.aangeboden, 0, "binnen de back-off wordt niets aangeboden");
    assert.equal(sleutels.length, 1, "en de provider is niet aangeroepen");

    /* NA HET WACHTVENSTER WEL, MET EEN ANDERE SLEUTEL. */
    const wacht = (BACKOFF_MINUTEN[1] ?? 5) + 1;
    const derde = await ronde(lukt, new Date(NU.getTime() + wacht * 60_000));
    assert.equal(derde.geaccepteerd, 1, "na de back-off slaagt de poging");
    assert.equal(sleutels.length, 2);
    assert.notEqual(
      sleutels[1],
      sleutels[0],
      "na een VASTGELEGDE mislukking hoort de sleutel te veranderen; anders geeft de " +
        "provider 24 uur lang hetzelfde foutantwoord terug",
    );
    assert.match(sleutels[0]!, /-a0$/, "de eerste poging draagt a0");
    assert.match(sleutels[1]!, /-a1$/, "na EEN bekend antwoord draagt de tweede a1");

    const naRetry = await berichten();
    assert.equal(naRetry[0]!.pogingen, 2, "twee aanbiedingen zijn twee pogingen");
    assert.equal(naRetry[0]!.laatste_fout, null, "en de oude fout is gewist");
    assert.equal(naRetry[0]!.volgende, null);
  });

  test("4. BEIDE GRENDELS STAAN ER, en dat is structureel getoetst", () => {
    /* WAAROM DIT NODIG IS NAAST TOETS 1. Gemeten met een mutatieproef op
       15 oktober 2026: haal `for update skip locked` weg en toets 1
       blijft groen (de claim vangt het op); haal het claimpredicaat weg
       en toets 1 blijft ook groen (skip locked vangt het op); haal ze
       BEIDE weg en toets 1 wordt rood met de oorspronkelijke fout.

       Elke grendel is dus zelfstandig voldoende, en precies daarom pint
       de gedragstoets geen van de twee afzonderlijk vast: wie er een
       weghaalt houdt een groene suite. Dat is geen reden om er een te
       laten vallen — de een dekt rondes die langs dezelfde selectie
       komen, de ander elke andere aanroeper — maar wel een reden om hun
       aanwezigheid apart te bewaken. Zelfde aanpak als
       test/eenheid/alarmering.test.ts, dat de brontekst leest. */
    const bron = readFileSync(new URL("../../src/ops/meldmail.ts", import.meta.url), "utf8");
    const zonderCommentaar = bron.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

    assert.match(
      zonderCommentaar,
      /for update skip locked/,
      "de selectie van te verzenden berichten hoort `for update skip locked` te dragen; " +
        "zonder vergrendeling selecteren twee rondes dezelfde rij",
    );
    assert.match(
      zonderCommentaar,
      /pogingen = pogingen \+ 1\s*\n\s*where id = \$1\s*\n\s*and organisatie_id = \$2\s*\n\s*and geaccepteerd_op is null\s*\n\s*and pogingen = \$3/,
      "de claim hoort een compare-and-set te zijn op organisatie EN op het pogingnummer dat de " +
        "selectie zag; zonder die binding claimt een tweede aanroeper dezelfde rij zodra de " +
        "eerste op een niet-herhaalbare fout eindigt",
    );
    /* EN DE POGING WORDT MAAR EEN KEER GETELD. Zou een uitkomsttak hem
       opnieuw verhogen, dan kost een geslaagde verzending twee pogingen
       en halveert het retrybudget — toets 1 en 3 zouden dat zien, maar
       dit maakt de bedoeling leesbaar. */
    const verhogingen = zonderCommentaar.match(/pogingen = pogingen \+ 1/g) ?? [];
    assert.equal(
      verhogingen.length,
      1,
      `\`pogingen = pogingen + 1\` hoort EEN keer in de bron te staan, gevonden ${verhogingen.length}`,
    );
  });

  test("5. ONBEKENDE UITKOMST: geen antwoord geeft DEZELFDE sleutel en kost geen poging", async () => {
    /* HET GEVAL WAARVOOR DE SLEUTEL BESTAAT, en het geval dat de eerste
       versie van deze reparatie juist MISTE. De provider neemt de mail
       aan, maar ons antwoord komt niet aan: `AbortSignal.timeout` vuurt,
       of de verbinding valt weg. `verstuurMail` geeft dan
       `uitkomstBekend: false` — geen uitzondering, dus GEEN rollback,
       dus de claim met `pogingen + 1` zou gewoon committen. Met het
       pogingnummer in de sleutel kreeg de volgende ronde daardoor een
       NIEUWE sleutel en stuurde de provider een tweede mail. Gemeten op
       16 oktober 2026.

       Daarom telt een onbekende uitkomst niet als poging: de verhoging
       wordt teruggedraaid, de rij krijgt een korte wachttijd, en de
       volgende aanbieding draagt dezelfde sleutel. */
    await zetKlaar();
    const sleutels: string[] = [];
    const geenAntwoord = async (_b: unknown, s?: string): Promise<MailUitkomst> => {
      sleutels.push(s ?? "(geen sleutel)");
      return {
        geaccepteerd: false,
        providerId: null,
        provider: "resend",
        fout: "The operation was aborted due to timeout",
        herhaalbaar: true,
        uitkomstBekend: false,
      };
    };
    const lukt = async (_b: unknown, s?: string): Promise<MailUitkomst> => {
      sleutels.push(s ?? "(geen sleutel)");
      return {
        geaccepteerd: true,
        providerId: "re_nagebootst_na_onbekend",
        provider: "resend",
        fout: null,
        herhaalbaar: false,
      };
    };

    const eerste = await ronde(geenAntwoord, NU);
    assert.equal(eerste.aangeboden, 1, "de rij is aangeboden");
    assert.equal(eerste.mislukt, 1, "en als mislukt geteld, want geaccepteerd is hij niet");
    const naOnbekend = await berichten();
    assert.equal(
      naOnbekend[0]!.pogingen,
      0,
      "een ONBEKENDE uitkomst mag geen poging kosten; anders verandert de sleutel",
    );
    assert.ok(naOnbekend[0]!.volgende, "er staat wel een korte wachttijd");
    assert.match(naOnbekend[0]!.laatste_fout ?? "", /uitkomst onbekend/);
    assert.equal(naOnbekend[0]!.geaccepteerd, null);

    const tweede = await ronde(lukt, new Date(NU.getTime() + 2 * 60_000));
    assert.equal(tweede.geaccepteerd, 1, "de volgende ronde biedt hem opnieuw aan");
    assert.equal(sleutels.length, 2);
    assert.equal(
      sleutels[1],
      sleutels[0],
      "na een onbekende uitkomst hoort DEZELFDE sleutel mee te gaan; anders stuurt de " +
        "provider een tweede mail voor een bericht dat hij misschien al heeft aangenomen",
    );
    assert.match(sleutels[1]!, /-a0$/, "het antwoordnummer is niet opgeschoven");
  });

  test("6. DEZE RONDE EIST EEN TRANSACTIE en weigert zonder", async () => {
    /* Beide grendels hangen eraan: in autocommit valt een
       rijvergrendeling weg aan het eind van het statement, en dan
       selecteren twee rondes alsnog dezelfde rij — gemeten: twee
       aanbiedingen met twee verschillende sleutels. Alle huidige
       aanroepers gaan via metOrganisatie, maar niets verbood het
       andersom. Nu faalt het hard in plaats van stil. */
    await zetKlaar();
    const client = await db.pool.connect();
    try {
      await client.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await assert.rejects(
        meldmailRonde(client, org, {
          nu: NU,
          verstuur: async () => {
            throw new Error("hier had de ronde nooit mogen komen");
          },
        }),
        /savepoint|transaction/i,
        "zonder transactie hoort de ronde te weigeren, niet te verzenden",
      );
    } finally {
      client.release();
    }
    const na = await berichten();
    assert.equal(na[0]!.pogingen, 0, "en er is niets aangeboden");
    assert.equal(na[0]!.aangeboden, null);
  });

  test("7. HERSTART: een nieuwe verbindingspool verstuurt niets opnieuw", async () => {
    /* De ontdubbeling mag niet in procesgeheugen zitten. Een tweede
       pool is geen echte herstart — dat kan een toets niet nabootsen —
       maar hij verlaat wel de verbinding en de poolstaat van de eerste
       ronde. Dat procesgeheugen er niet IS, wordt structureel getoetst
       in test/integratie/meldketen-garanties.test.ts; hier gaat het om
       het gedrag over een verbindingsgrens. */
    await zetKlaar();
    const sleutels: string[] = [];
    const verstuur = async (_b: unknown, s?: string): Promise<MailUitkomst> => {
      sleutels.push(s ?? "(geen sleutel)");
      return {
        geaccepteerd: true,
        providerId: `re_nagebootst_${sleutels.length}`,
        provider: "resend",
        fout: null,
        herhaalbaar: false,
      };
    };

    const eerste = await ronde(verstuur, NU);
    assert.equal(eerste.geaccepteerd, 1, "de eerste ronde verstuurt hem");

    const verse = new pg.Pool({ connectionString: db.url, max: 2 });
    try {
      const tweede = await ronde(verstuur, new Date(NU.getTime() + 3_600_000), verse);
      assert.equal(tweede.aangeboden, 0, "een verse pool biedt niets opnieuw aan");
      assert.equal(sleutels.length, 1, "en de provider is EEN keer aangeroepen");
    } finally {
      await verse.end();
    }

    const na = await berichten();
    assert.equal(na.length, 1);
    assert.equal(na[0]!.pogingen, 1, "en er staat EEN poging geregistreerd");
  });
});
