/* ============================================================
   TEST — opgeven is een toestand (issue #45)
   ------------------------------------------------------------
   `herhaalbaar: false` stopte niets. De verzendlus zette bij een
   definitieve fout `volgende_poging_op = null`, en de selectie leest
   `volgende_poging_op is null` als "nu te verzenden". Een definitieve
   fout werd daardoor de volgende ronde direct opnieuw aangeboden —
   SNELLER dan een herhaalbare, die 5/15/60/240 minuten wacht — tot
   `pogingen` de grens raakte. Gemeten: aangeboden 1,1,1,1,1,0 over zes
   rondes, met `opgegeven 1` al in de eerste.

   De oorzaak is dat `null` in die kolom twee dingen betekende: 'er is
   geen wachtmoment' en 'er komt geen poging meer'. Migratie 0040 geeft
   het tweede zijn eigen kolom, `opgegeven_op`.

   WAT HIER NIET MAG GEBEUREN. Een te brede ontdubbelingsregel verliest
   meldingen. Daarom toetst dit bestand niet alleen dat opgeven werkt,
   maar ook dat het NIET te veel afsluit: een inhoudelijk gewijzigde
   storing gaat gewoon uit (toets 4), een tijdelijke fout wordt gewoon
   opnieuw geprobeerd (toets 6), en een ONBEKENDE uitkomst wordt nooit
   opgegeven (toets 10b) — dat laatste is de invariant uit PR #44.

   De provider wordt nagebootst; er gaat geen enkele echte mail uit.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import pg from "pg";

import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie, rijen } from "../../src/kern/db.ts";
import { BACKOFF_MINUTEN, meldmailRonde, verrijkMeldingen } from "../../src/ops/meldmail.ts";
import { synchroniseerMeldingen } from "../../src/ops/melden.ts";
import type { MailUitkomst } from "../../src/ops/mail.ts";
import type { Signaal } from "../../src/ops/gezondheid.ts";

describe("de meldketen — opgeven is een toestand (issue #45)", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  const ENV: Record<string, string> = {
    // geheimenscan: ok — nepsleutel voor de toets, nooit een echte
    RESEND_API_KEY: "re_nagebootst_nooit_een_echte",
    INTEL_MAIL_ONTVANGER: "marketing@vibeenergy.nl",
    INTEL_MAIL_AFZENDER: "alerts@vibeenergy.nl",
    INTEL_MAIL_ACTIEF: "1",
    INTEL_OMGEVING: "test",
  };
  const oud: Record<string, string | undefined> = {};

  before(async () => {
    db = await maakWegwerpdatabase("opgeven");
    org = await maakOrganisatie(db, "opgeven");
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
    await alsEigenaar(db, async (c) => {
      await c.query("alter table intel.meld_berichten disable trigger meldberichten_geen_verwijdering");
      await c.query("delete from intel.meld_berichten where organisatie_id = $1", [org]);
      await c.query("alter table intel.meld_berichten enable trigger meldberichten_geen_verwijdering");
      await c.query("delete from intel.meldingen where organisatie_id = $1", [org]);
    });
  });

  /* De projectie draagt `opgegeven` — zonder die kolom bestaat de nieuwe
     toestand voor een toets niet, en dat is precies hoe toets 7 van
     meldmailketen.test.ts een valse groene werd. */
  type Bericht = {
    id: number;
    soort: string;
    bundel: string;
    vingerafdruk: string;
    pogingen: number;
    aangeboden: string | null;
    geaccepteerd: string | null;
    volgende: string | null;
    opgegeven: string | null;
    provider_id: string | null;
    laatste_fout: string | null;
  };

  const berichten = () =>
    metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<Bericht>(
        c,
        `select id, soort, bundel, vingerafdruk, pogingen,
                aangeboden_op::text as aangeboden, geaccepteerd_op::text as geaccepteerd,
                volgende_poging_op::text as volgende, opgegeven_op::text as opgegeven,
                provider_id, laatste_fout
           from intel.meld_berichten where organisatie_id = $1 order by id`,
        [org],
      ),
    );

  const ronde = (
    verstuur: (b: unknown, s?: string) => Promise<MailUitkomst>,
    nu: Date,
    pool: pg.Pool = db.pool,
  ) => metOrganisatie(pool, { organisatieId: org }, (c) => meldmailRonde(c, org, { nu, verstuur }));

  /** Een ronde MET signaalstap, zoals taken.ts hem draait. */
  const volledigeRonde = (
    signalen: readonly Signaal[],
    verstuur: (b: unknown, s?: string) => Promise<MailUitkomst>,
    nu: Date,
  ) =>
    metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await synchroniseerMeldingen(c, org, signalen);
      await verrijkMeldingen(c, org, signalen);
      return meldmailRonde(c, org, { nu, verstuur });
    });

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

  const NU = new Date("2026-10-19T06:00:00Z");
  const later = (minuten: number) => new Date(NU.getTime() + minuten * 60_000);

  function provider(uitkomst: () => MailUitkomst) {
    const sleutels: string[] = [];
    return {
      get aanroepen() {
        return sleutels.length;
      },
      get sleutels() {
        return sleutels;
      },
      verstuur: async (_b: unknown, s?: string): Promise<MailUitkomst> => {
        sleutels.push(s ?? "(geen sleutel)");
        return uitkomst();
      },
    };
  }

  const GOED: MailUitkomst = {
    geaccepteerd: true, providerId: "re_nagebootst_ok", provider: "resend", fout: null, herhaalbaar: false,
  };
  const DEFINITIEF: MailUitkomst = {
    geaccepteerd: false, providerId: null, provider: "resend",
    fout: "HTTP 422: the domain is not verified", herhaalbaar: false,
  };
  const TIJDELIJK: MailUitkomst = {
    geaccepteerd: false, providerId: null, provider: "resend",
    fout: "HTTP 503: service unavailable", herhaalbaar: true,
  };
  const ONBEKEND: MailUitkomst = {
    geaccepteerd: false, providerId: null, provider: "resend",
    fout: "The operation was aborted due to timeout", herhaalbaar: true, uitkomstBekend: false,
  };

  /* ---------------------------------------------------------------- 1 */

  test("1. de EERSTE aanbieding van een nieuwe melding gaat gewoon uit", async () => {
    await zetKlaar();
    const p = provider(() => GOED);
    const stand = await ronde(p.verstuur, NU);
    assert.equal(p.aanroepen, 1, "precies een aanbieding");
    assert.equal(stand.aangeboden, 1);
    assert.equal(stand.geaccepteerd, 1);
    assert.equal(stand.opgegeven, 0, "een geslaagde verzending geeft niemand op");
    assert.equal(stand.opgegevenTotaal, 0);
    const b = await berichten();
    assert.equal(b[0]!.opgegeven, null, "en de rij is NIET opgegeven");
    assert.ok(b[0]!.geaccepteerd);
    assert.equal(b[0]!.volgende, null, "een geslaagde rij heeft geen volgende poging");
  });

  /* ---------------------------------------------------------------- 2 */

  test("2. na de terminale status wordt dezelfde melding NIET opnieuw aangeboden", async () => {
    await zetKlaar();
    const p = provider(() => DEFINITIEF);

    const eerste = await ronde(p.verstuur, NU);
    assert.equal(eerste.aangeboden, 1, "de eerste poging gaat wel");
    assert.equal(eerste.opgegeven, 1, "en wordt meteen opgegeven");

    /* DE TELLERS SPREKEN ZICH NIET TEGEN. Issue #45 noemt dit apart: een
       rij die in deze ronde is afgesloten mag niet in dezelfde ronde ook
       als wachtend meetellen. Zonder `opgegeven_op is null` in de
       uitgesteld-telling staat hier 1 en 1 naast elkaar voor dezelfde
       rij. */
    assert.equal(
      eerste.uitgesteld,
      0,
      "een bericht dat deze ronde is opgegeven hoort niet ook als uitgesteld te worden geteld",
    );
    assert.equal(eerste.opgegevenTotaal, 1, "en staat als opgegeven in de stand");

    /* Vijf rondes later, elk een uur verder. Vroeger stond hier
       aangeboden 1,1,1,1 — nu hoort het nul te zijn. */
    for (const n of [60, 120, 180, 240, 1440]) {
      const stand = await ronde(p.verstuur, later(n));
      assert.equal(stand.aangeboden, 0, `ronde op +${n} min hoort NIETS aan te bieden`);
      assert.equal(stand.opgegeven, 0, "en niemand opnieuw op te geven");
    }
    assert.equal(p.aanroepen, 1, "de provider is in totaal EEN keer aangeroepen");

    const b = await berichten();
    assert.equal(b.length, 1);
    assert.equal(b[0]!.pogingen, 1, "en er staat EEN poging geregistreerd, niet vijf");
    assert.ok(b[0]!.opgegeven, "de rij draagt een opgegeven-moment");
  });

  /* ---------------------------------------------------------------- 3 */

  test("3. DE REPRODUCTIE UIT ISSUE #45: zes rondes op dezelfde klok", async () => {
    /* Letterlijk het scenario uit het issue. Oud: aangeboden
       1,1,1,1,1,0 en `opgegeven 1` in elke ronde waarin werd
       aangeboden. Nieuw: 1,0,0,0,0,0 en `opgegeven 1` exact een keer. */
    await zetKlaar();
    const p = provider(() => DEFINITIEF);
    const aangeboden: number[] = [];
    const opgegeven: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const stand = await ronde(p.verstuur, NU);
      aangeboden.push(stand.aangeboden);
      opgegeven.push(stand.opgegeven);
    }
    assert.deepEqual(
      aangeboden,
      [1, 0, 0, 0, 0, 0],
      `zes rondes gaven aangeboden ${aangeboden.join(",")}; issue #45 meette 1,1,1,1,1,0`,
    );
    assert.deepEqual(
      opgegeven,
      [1, 0, 0, 0, 0, 0],
      `de teller gaf ${opgegeven.join(",")}; hij hoort EEN keer te vuren, niet elke ronde`,
    );
    const b = await berichten();
    assert.equal(b[0]!.pogingen, 1, "een definitieve fout kost EEN poging");
    assert.equal(p.aanroepen, 1);
  });

  /* ---------------------------------------------------------------- 4 */

  test("4. een INHOUDELIJK GEWIJZIGDE storing gaat wel opnieuw uit", async () => {
    /* De grens tegen een te brede ontdubbeling. Opgeven geldt voor EEN
       bericht, niet voor een bundel en niet voor een bron. Een andere
       toestand geeft een andere vingerafdruk en dus een nieuwe rij. */
    const METING = "1 bron(nen), waarvan 1 actief: rendo-nieuws — detail: rendo-nieuws http=403";
    const basis = { groep: "ingestie", naam: "storingssoort TOEGANG_BEPERKT" } as const;

    const p1 = provider(() => DEFINITIEF);
    await volledigeRonde([{ ...basis, niveau: "FOUT", meting: METING }], p1.verstuur, NU);
    const na1 = await berichten();
    const opgegevenRij = na1.find((x) => x.opgegeven);
    assert.ok(opgegevenRij, "de eerste melding is opgegeven");

    /* Nu verandert de MEETTEKST: andere toestand, andere vingerafdruk. */
    const p2 = provider(() => GOED);
    const tweede = await volledigeRonde(
      [{ ...basis, niveau: "FOUT", meting: METING.replace("http=403", "http=500") }],
      p2.verstuur,
      later(60),
    );
    assert.equal(p2.aanroepen, 1, "de gewijzigde toestand hoort wel aangeboden te worden");
    assert.equal(tweede.geaccepteerd, 1);

    const na2 = await berichten();
    const nieuwe = na2.filter((x) => x.id !== opgegevenRij.id);
    assert.ok(nieuwe.length >= 1, "een gewijzigde toestand hoort een NIEUWE rij te geven");
    const verstuurd = nieuwe.find((x) => x.geaccepteerd && x.pogingen > 0);
    assert.ok(verstuurd, `verwachtte een verstuurde nieuwe rij, kreeg: ${JSON.stringify(nieuwe.map((x) => [x.soort, x.pogingen, !!x.geaccepteerd]))}`);
    assert.equal(verstuurd.opgegeven, null, "de nieuwe rij is niet opgegeven");
    assert.notEqual(
      verstuurd.vingerafdruk,
      opgegevenRij.vingerafdruk,
      "en draagt een andere vingerafdruk, want dat is wat haar een nieuw bericht maakt",
    );

    /* DE OPGEGEVEN RIJ BLIJFT STAAN ZOALS HIJ WAS. */
    const oudNa = na2.find((x) => x.id === opgegevenRij.id);
    assert.deepEqual(oudNa, opgegevenRij, "de opgegeven rij is niet herschreven");

    /* OPGEVEN VERBRUIKT 'DE EERSTE KEER' NIET, en dat is geen detail.
       `ooitGemeld` vraagt of de provider ooit een alarm van ons heeft
       AANGENOMEN; een opgegeven bericht is nooit aangenomen. De
       beginsamenvatting blijft dus gepland tot er echt een alarm is
       aangekomen — de operator die nog niets heeft gezien krijgt alsnog
       de hele stand te lezen in plaats van een los vervolgbericht.
       Zelfde fout als in PR #41, waar een TESTmail die eerste keer
       opsnoepte. */
    assert.equal(
      verstuurd.soort,
      "BEGINSAMENVATTING",
      "na een opgegeven eerste alarm hoort het volgende bericht weer de hele stand te beschrijven",
    );
  });

  /* ---------------------------------------------------------------- 5 */

  test("5. TWEE GELIJKTIJDIGE workers bieden een opgegeven rij niet alsnog aan", async () => {
    /* De garantie uit PR #44 blijft staan, en de nieuwe toestand mag er
       geen gat in maken: na het opgeven hoort ook een race niets meer
       te versturen. */
    await zetKlaar();
    const p = provider(() => DEFINITIEF);
    await ronde(p.verstuur, NU);
    assert.equal(p.aanroepen, 1);

    const p2 = provider(() => GOED);
    const beide = await Promise.all([ronde(p2.verstuur, later(60)), ronde(p2.verstuur, later(60))]);
    assert.equal(p2.aanroepen, 0, "geen van de twee rondes mag een opgegeven rij aanbieden");
    assert.deepEqual(beide.map((s) => s.aangeboden), [0, 0]);

    const b = await berichten();
    assert.equal(b.length, 1, "en er is geen tweede rij ontstaan");
    assert.equal(b[0]!.pogingen, 1);
  });

  /* ---------------------------------------------------------------- 6 */

  test("6. een TIJDELIJKE fout wordt gewoon opnieuw geprobeerd en NIET opgegeven", async () => {
    await zetKlaar();
    const pFout = provider(() => TIJDELIJK);
    const eerste = await ronde(pFout.verstuur, NU);
    assert.equal(eerste.mislukt, 1);
    assert.equal(eerste.opgegeven, 0, "een 503 is geen definitieve afwijzing");
    assert.equal(eerste.opgegevenTotaal, 0);

    const na1 = await berichten();
    assert.equal(na1[0]!.opgegeven, null, "de rij is NIET opgegeven");
    assert.ok(na1[0]!.volgende, "en heeft een volgende poging");
    assert.equal(na1[0]!.pogingen, 1);

    /* Binnen het wachtvenster gebeurt er niets. */
    const pNiets = provider(() => GOED);
    const tussen = await ronde(pNiets.verstuur, later(1));
    assert.equal(tussen.aangeboden, 0, "binnen de back-off wordt niets aangeboden");
    assert.equal(pNiets.aanroepen, 0);

    /* Erna wel, en dan slaagt hij. */
    const pGoed = provider(() => GOED);
    const derde = await ronde(pGoed.verstuur, later((BACKOFF_MINUTEN[1] ?? 5) + 1));
    assert.equal(derde.geaccepteerd, 1, "na de back-off slaagt de poging");
    const na2 = await berichten();
    assert.equal(na2[0]!.opgegeven, null, "en de rij is nooit opgegeven");
    assert.equal(na2[0]!.laatste_fout, null, "de oude fout is gewist");
  });

  /* ---------------------------------------------------------------- 7 */

  test("7. de POGINGENGRENS sluit een rij ook af, met de juiste reden", async () => {
    /* De tweede weg naar terminaal: niet een definitieve afwijzing maar
       een herhaalbare fout die de ladder uitloopt. Vroeger bleef zo'n
       rij eeuwig onverzonden liggen zonder in enige teller terug te
       komen — niet in `uitgesteld` (want pogingen >= max) en niet in
       `opgegeven` (want hij werd niet meer geselecteerd). */
    await zetKlaar();
    const p = provider(() => TIJDELIJK);
    let minuten = 0;
    const standen = [];
    for (let i = 0; i < BACKOFF_MINUTEN.length + 1; i += 1) {
      standen.push(await ronde(p.verstuur, later(minuten)));
      minuten += 24 * 60; /* ruim voorbij elke trede */
    }
    assert.equal(p.aanroepen, BACKOFF_MINUTEN.length, "precies maxPogingen aanbiedingen");

    const b = await berichten();
    assert.equal(b[0]!.pogingen, BACKOFF_MINUTEN.length);
    assert.ok(b[0]!.opgegeven, "bij de grens hoort de rij te worden afgesloten");
    assert.equal(
      standen.filter((s) => s.opgegeven > 0).length,
      1,
      "en de teller vuurt EEN keer, in de ronde waarin het gebeurt",
    );
    const laatste = standen[standen.length - 1]!;
    assert.equal(laatste.aangeboden, 0, "daarna gebeurt er niets meer");
    assert.equal(laatste.uitgesteld, 0, "en de rij staat niet meer als wachtend geteld");
    assert.equal(laatste.opgegevenTotaal, 1, "maar wel als opgegeven in de stand");
  });

  /* ---------------------------------------------------------------- 8 */

  test("8. na een HERSTART (verse pool) blijft een opgegeven rij opgegeven", async () => {
    await zetKlaar();
    const p = provider(() => DEFINITIEF);
    await ronde(p.verstuur, NU);

    const verse = new pg.Pool({ connectionString: db.url, max: 2 });
    try {
      const pNa = provider(() => GOED);
      const stand = await ronde(pNa.verstuur, later(600), verse);
      assert.equal(pNa.aanroepen, 0, "een verse verbinding biedt een opgegeven rij niet aan");
      assert.equal(stand.aangeboden, 0);
      assert.equal(stand.opgegevenTotaal, 1, "de toestand staat in de database, niet in het proces");
    } finally {
      await verse.end();
    }
  });

  /* ---------------------------------------------------------------- 9 */

  test("9. de REGISTRATIE is compleet: reden, moment, poging en keten", async () => {
    await zetKlaar();
    const p = provider(() => DEFINITIEF);
    await ronde(p.verstuur, NU);
    const b = (await berichten())[0]!;

    assert.ok(b.opgegeven, "er staat een opgegeven-moment");
    assert.ok(b.aangeboden, "en een aanbiedmoment");
    assert.equal(b.geaccepteerd, null, "opgegeven en geaccepteerd sluiten elkaar uit");
    assert.match(b.laatste_fout ?? "", /422/, "de reden staat in laatste_fout");
    assert.equal(b.pogingen, 1);

    /* De ketenregel uit 0040 is echt afgedwongen: geaccepteerd naast
       opgegeven hoort geweigerd te worden. De constraint staat NOT VALID
       voor bestaande rijen, maar bindt elke wijziging vanaf nu. */
    await assert.rejects(
      alsEigenaar(db, (c) =>
        c.query("update intel.meld_berichten set geaccepteerd_op = now() where id = $1", [b.id]),
      ),
      /meldberichten_opgeven_klopt/,
      "een opgegeven rij mag niet alsnog geaccepteerd worden",
    );

    /* En de operator ziet de toestand: de CLI leest de kolom. */
    const cli = readFileSync(new URL("../../src/cli/meldmail.ts", import.meta.url), "utf8");
    assert.match(cli, /opgegeven_op::text as opgegeven/, "de CLI leest de nieuwe toestand");
    assert.match(cli, /OPGEGEVEN \$\{nederlandseTijd/, "en toont hem in het logboek");
  });

  /* --------------------------------------------------------------- 10 */

  test("10a. de grendels uit PR #44 staan er nog, en de nieuwe term erbij", () => {
    const bron = readFileSync(new URL("../../src/ops/meldmail.ts", import.meta.url), "utf8");
    const code = bron.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    assert.match(code, /for update skip locked/, "de vergrendeling van PR #44");
    assert.match(
      code,
      /and geaccepteerd_op is null\s*\n\s*and pogingen = \$3\s*\n\s*and opgegeven_op is null/,
      "de claim is nog een compare-and-set, met opgegeven_op erbij",
    );
    assert.match(code, /savepoint meldmail_ronde/, "de transactie-eis van PR #44");
    assert.equal(
      (code.match(/pogingen = pogingen \+ 1/g) ?? []).length,
      1,
      "de poging wordt nog op EEN plek geteld",
    );
    /* En de selectie slaat opgegeven rijen over. */
    assert.match(
      code,
      /and geaccepteerd_op is null\s*\n\s*and opgegeven_op is null\s*\n\s*and pogingen < \$2/,
      "de verzendselectie hoort opgegeven rijen over te slaan",
    );
  });

  test("10b. een ONBEKENDE uitkomst wordt NOOIT opgegeven", async () => {
    /* De invariant uit PR #44: zonder antwoord weten we niet of de mail
       is aangekomen. De rij afsluiten zou een mogelijk NIET verzonden
       alarm definitief begraven, en de sleutel zou roteren. */
    await zetKlaar();
    const p = provider(() => ONBEKEND);
    const eerste = await ronde(p.verstuur, NU);
    assert.equal(eerste.mislukt, 1);
    assert.equal(eerste.opgegeven, 0, "een onbekende uitkomst geeft niemand op");
    assert.equal(eerste.opgegevenTotaal, 0);

    const na = await berichten();
    assert.equal(na[0]!.opgegeven, null, "de rij blijft in behandeling");
    assert.equal(na[0]!.pogingen, 0, "en de poging is niet geteld (PR #44)");

    /* Tien rondes lang blijft hij het proberen, met dezelfde sleutel. */
    const p2 = provider(() => ONBEKEND);
    for (let i = 1; i <= 10; i += 1) await ronde(p2.verstuur, later(i * 60));
    assert.equal(p2.aanroepen, 10, "een onbekende uitkomst blijft het proberen");
    assert.equal(new Set(p2.sleutels).size, 1, "en met steeds DEZELFDE idempotentiesleutel");
    const na2 = await berichten();
    assert.equal(na2[0]!.opgegeven, null, "nog altijd niet opgegeven");
  });
});
