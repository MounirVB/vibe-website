/* ============================================================
   TEST — de plannerpauze en de motorpariteit
   ------------------------------------------------------------
   WAAROM DEZE TOETS BESTAAT.

   Tot 31 oktober 2026 was er geen manier om de keten stil te zetten.
   Gemeten: 57 tabellen in het intel-schema en geen schakelaar, geen
   omgevingsvariabele in de planner, niets in ops/. De enige onderbreker
   die bestond (intel.ai_stroomonderbreker) raakt alleen AI-aanroepen.

   Dat is een probleem omdat een push naar `main` in deze repo de
   productiedeploy IS en de cron `0 * * * *` daar dwars door loopt. Bij
   de documentsoort-v2-release is dat niet theoretisch: de claimpoort
   faalt DICHT op een versieverschil, dus de eerste ronde na een halve
   uitrol sluit de poort voor elke bestaande v1-claim.

   WAT HIERONDER WORDT VASTGEZET, per eis:

     1 een verse database is NIET gepauzeerd (de migratie zet niets aan)
     2 pauzeren blokkeert het PLANNEN van nieuw werk
     3 pauzeren blokkeert het PAKKEN van nieuw werk
     4 een AL GECLAIMDE taak loopt gewoon af — gecontroleerd afgehandeld
     5 de stand is aantoonbaar: hij staat in een append-only logboek
     6 hervatten zonder autorisatie wordt door de DATABASE geweigerd
     7 hervatten met autorisatie zet de keten weer in beweging
     8 een halve uitrol (code v2, database v1) wordt BENOEMD geweigerd

   Eis 8 wordt echt nagebootst en niet nagedaan: het harnas kan een
   database tot een bepaald migratienummer bouwen, dus `totNummer: 44`
   geeft precies de database van vóór 0045.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import pg from "pg";

import { maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie, zonderOrganisatie } from "../../src/kern/db.ts";
import { leesMigraties } from "../../src/db/migraties.ts";
import { pakTaak, rondAf, zetInWachtrij } from "../../src/kern/wachtrij.ts";
import { hervat, pauzeer, pauzeStand } from "../../src/ops/plannerpauze.ts";
import { motorpariteit } from "../../src/ops/motorpariteit.ts";
import { DOCUMENTSOORT_VERSIE } from "../../src/pijplijn/documentsoort.ts";

describe("de plannerpauze", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("plannerpauze");
    org = await maakOrganisatie(db, "plannerpauze");
  });

  after(async () => {
    await db?.opruimen();
  });

  /** Zet één wachtende taak klaar en geef zijn id terug. */
  async function zetTaakKlaar(sleutel: string): Promise<number> {
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      zetInWachtrij(c, org, {
        soort: "gezondheid",
        idempotentieSleutel: sleutel,
        prioriteit: 5,
        payload: {},
      }),
    );
    assert.equal(uit.nieuw, true, "de taak hoort nieuw te zijn");
    assert.ok(uit.id !== null, "een nieuwe taak hoort een id te hebben");
    return uit.id;
  }

  test("1 · een verse database is NIET gepauzeerd", async () => {
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pauzeStand(c, org),
    );
    assert.equal(stand.gepauzeerd, false);
    assert.equal(
      stand.laatste,
      null,
      "zonder besluit hoort er geen besluit te staan; een migratie die de keten " +
        "stilzet zou bij de volgende deploy de productie stoppen",
    );
  });

  test("2+3 · pauzeren blokkeert het pakken van nieuw werk", async () => {
    await zetTaakKlaar("gezondheid:pauzetoets-1");

    // Vóór de pauze pakt hij wel.
    const voor = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pakTaak(c, org, "toetsworker"),
    );
    assert.ok(voor, "zonder pauze hoort er werk uit te komen");
    await metOrganisatie(db.pool, { organisatieId: org }, (c) => rondAf(c, voor!.id, 1));

    await zetTaakKlaar("gezondheid:pauzetoets-2");
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pauzeer(c, org, {
        reden: "releasevoorbereiding documentsoort-v2",
        door: "toets",
      }),
    );

    const na = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pakTaak(c, org, "toetsworker"),
    );
    assert.equal(
      na,
      null,
      "tijdens een pauze hoort pakTaak NIETS uit te delen, ook niet als er werk wacht",
    );

    // En de stand zegt het ook.
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pauzeStand(c, org),
    );
    assert.equal(stand.gepauzeerd, true);
    assert.equal(stand.laatste?.actie, "PAUZEER");
    assert.equal(stand.laatste?.door, "toets");
  });

  test("4 · een AL GECLAIMDE taak loopt gewoon af tijdens een pauze", async () => {
    /* Dit is de eis "bestaande actieve taken worden gecontroleerd
       afgehandeld". De wachtrij hoort leeg te RAKEN, niet te worden
       afgekapt: een taak die al een lease heeft moet nog kunnen
       afronden, anders verliest hij halverwege zijn werk. */
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      hervat(c, org, {
        reden: "even vrijgeven om een claim te kunnen zetten",
        door: "toets",
        autorisatie: "toets",
      }),
    );
    await zetTaakKlaar("gezondheid:pauzetoets-3");
    const taak = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pakTaak(c, org, "toetsworker"),
    );
    assert.ok(taak, "de claim hoort te lukken vóór de pauze");

    // NU pauzeren, met de taak al in de hand.
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pauzeer(c, org, { reden: "pauze met werk in de hand", door: "toets" }),
    );

    // Afronden moet nog kunnen.
    await metOrganisatie(db.pool, { organisatieId: org }, (c) => rondAf(c, taak!.id, 7));
    const rij = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ status: string }>(
        `select status from intel.taken where id = $1`,
        [taak!.id],
      );
      return r.rows[0];
    });
    assert.equal(rij?.status, "gereed", "een geclaimde taak hoort te kunnen afronden");
  });

  test("5 · het logboek is append-only, in TWEE lagen", async () => {
    /* GEMETEN, NIET AANGENOMEN. De eerste versie van deze toets
       verwachtte op beide paden de triggerboodschap en was daarmee fout.
       De werkelijkheid is beter dan die verwachting:

         · als APPLICATIEROL komt hij niet eens bij de trigger —
           'permission denied', want 0046 geeft alleen select en insert
         · als EIGENAAR is er wél een pad naar de tabel, en daar staat de
           trigger die het tegenhoudt

       Twee lagen dus, en beide horen vast te staan. De applicatierol is
       de dagelijkse weg; de eigenaar is de weg die tijdens een release
       wordt gebruikt, en juist daar is de trigger het enige dat de
       geschiedenis beschermt. */
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query(`delete from intel.plannerpauze where organisatie_id = $1`, [org]),
        ),
      /permission denied/,
      "de applicatierol hoort geen DELETE-recht te hebben",
    );
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query(`update intel.plannerpauze set reden = 'herschreven' where organisatie_id = $1`, [
            org,
          ]),
        ),
      /permission denied/,
      "en ook geen UPDATE-recht",
    );

    // En nu als eigenaar, waar de trigger het werk moet doen.
    const eigenaar = new pg.Client({
      connectionString: db.url,
      options: "-c search_path=intel,public",
    });
    await eigenaar.connect();
    try {
      await assert.rejects(
        () => eigenaar.query(`delete from intel.plannerpauze where organisatie_id = ${org}`),
        /append-only/,
        "wissen hoort te worden geweigerd, anders verdwijnt het bewijs dat er gepauzeerd was",
      );
      await assert.rejects(
        () =>
          eigenaar.query(
            `update intel.plannerpauze set reden = 'herschreven' where organisatie_id = ${org}`,
          ),
        /append-only/,
        "herschrijven hoort ook te worden geweigerd, ook door de eigenaar",
      );
    } finally {
      await eigenaar.end();
    }
  });

  test("6 · hervatten zonder autorisatie wordt door de DATABASE geweigerd", async () => {
    /* De eis staat als CHECK in 0046 en niet alleen in de CLI. Een
       controle in code kan worden omzeild door wie rechtstreeks in de
       database zit, en dat is juist het pad dat tijdens een release
       wordt gebruikt. */
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query(
            `insert into intel.plannerpauze (organisatie_id, actie, reden, door)
             values ($1, 'HERVAT', 'zonder autorisatie proberen', 'toets')`,
            [org],
          ),
        ),
      /plannerpauze_hervatten_vraagt_autorisatie/,
      "een HERVAT zonder autorisatie hoort op de constraint te stuiten",
    );
  });

  test("6b · een te korte reden wordt geweigerd", async () => {
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query(
            `insert into intel.plannerpauze (organisatie_id, actie, reden, door)
             values ($1, 'PAUZEER', 'x', 'toets')`,
            [org],
          ),
        ),
      /plannerpauze_reden_niet_leeg/,
      "een pauze zonder echte reden is een pauze die niemand durft op te heffen",
    );
  });

  test("7 · hervatten met autorisatie zet de keten weer in beweging", async () => {
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      hervat(c, org, {
        reden: "acceptatie afgerond, keten weer vrij",
        door: "toets",
        autorisatie: "acceptatieronde 2026-10-31",
      }),
    );
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pauzeStand(c, org),
    );
    assert.equal(stand.gepauzeerd, false);
    assert.equal(stand.laatste?.actie, "HERVAT");
    assert.equal(stand.laatste?.autorisatie, "acceptatieronde 2026-10-31");

    await zetTaakKlaar("gezondheid:pauzetoets-4");
    const taak = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pakTaak(c, org, "toetsworker"),
    );
    assert.ok(taak, "na hervatten hoort er weer werk uit te komen");
  });

  test("het laatste besluit wint, ook bij gelijke tijdstempels", async () => {
    /* De sortering is (gezet_op desc, id desc). Twee besluiten in
       dezelfde transactie dragen dezelfde now() — Postgres' now() is de
       transactietijd — dus zonder het id als tweede sleutel is de
       uitkomst willekeurig. */
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await c.query("begin");
      await pauzeer(c, org, { reden: "eerst pauzeren in een transactie", door: "toets" });
      await hervat(c, org, {
        reden: "en daarna hervatten in dezelfde transactie",
        door: "toets",
        autorisatie: "toets",
      });
      await c.query("commit");
    });
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      pauzeStand(c, org),
    );
    assert.equal(
      stand.gepauzeerd,
      false,
      "het JONGSTE besluit (HERVAT) hoort te winnen, ook met een identieke gezet_op",
    );
  });
});

describe("de motorpariteit weigert een halve uitrol", () => {
  let volledig: Wegwerpdatabase;
  let tot44: Wegwerpdatabase;
  /** 44 + ALLEEN 0046: de werkelijke productiestand na de fase-1-uitrol. */
  let fase1: Wegwerpdatabase;

  before(async () => {
    volledig = await maakWegwerpdatabase("pariteitvol");
    // Precies de database van VOOR 0045: geen documentvorm, oude CHECK.
    tot44 = await maakWegwerpdatabase("pariteit44", { totNummer: 44 });

    /* De fase-1-stand is met totNummer niet uit te drukken — dat zou
       0045 meenemen — dus 0046 wordt hier LOS op een 44-database gezet,
       precies zoals de geïsoleerde release het doet.

       ALLE FIXTURES HOREN IN before() EN NIET IN EEN TOETS. Het harnas
       sluit bij opruimen() ALLE pools (sluitAllePools), dus een fixture
       die midden in een toets wordt opgeruimd trekt de pools van de
       andere fixtures mee onderuit. Gemeten: dat liet de laatste toets
       van dit blok omvallen op een fout die niets met zijn onderwerp
       te maken had. */
    fase1 = await maakWegwerpdatabase("fase1stand", { totNummer: 44 });
    const m0046 = (await leesMigraties()).find((m) => m.nummer === 46);
    if (m0046 !== undefined) {
      const eigenaar = new pg.Client({
        connectionString: fase1.url,
        options: "-c search_path=intel,public",
      });
      await eigenaar.connect();
      try {
        await eigenaar.query(m0046.sql);
        await eigenaar.query(
          "insert into intel.migraties (naam, nummer, hash, duur_ms) values ($1,$2,$3,0)",
          [m0046.naam, m0046.nummer, m0046.hash],
        );
      } finally {
        await eigenaar.end();
      }
    }
  });

  after(async () => {
    await volledig?.opruimen();
    await tot44?.opruimen();
    await fase1?.opruimen();
  });

  test("een volledig gemigreerde database wordt NOOIT geweigerd", async () => {
    /* DEZE TOETS WAS FOUT, en de fase-1-releasebranch vond het.
       Hij stelde hard `databaseVersie === "v2"` voor een "volledig
       gemigreerde" database. Dat is alleen waar als 0045 in de boom
       zit. Op een release die 0045 BEWUST weglaat — precies de
       geïsoleerde fase-1-uitrol — is de volledig gemigreerde database
       v1, en viel de toets om op een aanname in plaats van op een
       defect.

       De verwachting komt nu uit de MIGRATIESET die werkelijk is
       toegepast, niet uit een hardgecodeerde versiestring. Daarmee is
       de toets correct op elke tak die dit harnas gebruikt, en toetst
       hij iets sterkers: dat de probe de database leest zoals hij is. */
    const migraties = await leesMigraties();
    const heeft0045 = migraties.some((m) => m.nummer === 45);

    const p = await zonderOrganisatie(volledig.pool, (c) => motorpariteit(c));
    assert.equal(
      p.sluit,
      true,
      `een volledig gemigreerde database hoort nooit geweigerd te worden — ${p.bewijs}`,
    );
    assert.equal(p.codeVersie, DOCUMENTSOORT_VERSIE);
    assert.equal(
      p.databaseVersie,
      heeft0045 ? "v2" : "v1",
      heeft0045
        ? "met 0045 in de boom hoort de probe v2 te lezen"
        : "zonder 0045 hoort de probe v1 te lezen; de kolom documentvorm bestaat dan niet",
    );
  });

  test("8a · een database van VOOR 0046 wordt geweigerd, met 0046 in de reden", async () => {
    /* GEMETEN OP 1 NOVEMBER 2026 met de fase-1-releasecode tegen een
       database op stand 44: de planner viel om met `relation
       "intel.plannerpauze" does not exist` en de worker met `function
       intel.planner_gepauzeerd(integer) does not exist` — 42883, per
       claimpoging. Kryptisch, en precies de faalwijze die motorpariteit
       moet voorkomen.

       Alleen vibe-intel-api draagt een preDeployCommand, dus tijdens
       elke deploy loopt de nieuwe planner- en workercode kortstondig
       tegen het oude schema. Deze eis staat daarom VOOROP in de probe:
       hij is de goedkoopste en hij raakt elke tak, v1 of v2. */
    const p = await zonderOrganisatie(tot44.pool, (c) => motorpariteit(c));
    assert.equal(p.sluit, false, "zonder de pauzeobjecten hoort hij te weigeren");
    assert.match(p.bewijs, /plannerpauze|planner_gepauzeerd/, "de reden moet ZEGGEN wat er mist");
    assert.match(p.bewijs, /0046/, "en naar de migratie wijzen die het oplost");
  });

  test("8b · de FASE-1-stand (44 + alleen 0046) weegt de v2-as apart", async () => {
    const p = await zonderOrganisatie(fase1.pool, (c) => motorpariteit(c));
    assert.equal(p.databaseVersie, "v1", "zonder 0045 is de database v1");

    if (DOCUMENTSOORT_VERSIE.endsWith("-v2")) {
      assert.equal(p.sluit, false, "v2-code op een v1-schema hoort geweigerd te worden");
      assert.match(p.bewijs, /documentvorm/, "en nu moet de reden over de v2-as gaan");
      assert.match(p.bewijs, /0045/, "en naar 0045 wijzen");
    } else {
      /* Precies de fase-1-productiestand: v1-code op 44+0046. Dit MOET
         mogen, anders is de geïsoleerde release niet uitrolbaar. */
      assert.equal(p.sluit, true, `de fase-1-stand hoort te mogen draaien — ${p.bewijs}`);
    }
  });

  test("ZOWEL de planner als de worker weigert op een halve uitrol", async () => {
    /* WAAROM DIT EEN TOETS IS. Gemeten op 31 oktober 2026 via de
       Railway-API: alleen vibe-intel-api draagt een preDeployCommand met
       `npm run migreer`; de andere services niet. De vier services
       deployen PARALLEL met lege watchPatterns, dus de WORKER kan met
       v2-code opstarten terwijl die migratie nog loopt. De planner
       alleen bewaken is dus niet genoeg — de worker is juist degene die
       `documentclassificatie` uitvoert.

       Dit is een INBOUWTOETS en geen gedragsbewijs: het gedrag van
       motorpariteit() staat in de toetsen hierboven. Hier wordt alleen
       vastgezet dat beide CLI's hem werkelijk aanroepen.

       COMMENTAAR EERST WEG. Een toets die op een patroon zoekt in ruwe
       broncode kan zijn eigen uitleg lezen: dit bestand noemt
       'motorpariteit' zelf tientallen keren, en de CLI's beschrijven de
       grens in hun commentaar. Zonder strippen zou de toets groen
       blijven nadat iemand de aanroep weghaalt en de uitleg laat staan.
       Dezelfde klasse val als een poort die zijn eigen patroon draagt. */
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { resolve, dirname } = await import("node:path");
    const hier = dirname(fileURLToPath(import.meta.url));

    for (const pad of ["../../src/cli/planner.ts", "../../src/cli/worker.ts"]) {
      const ruw = readFileSync(resolve(hier, pad), "utf8");
      const zonderCommentaar = ruw
        .replace(/\/\*[\s\S]*?\*\//gu, "")
        .replace(/(^|[^:])\/\/.*$/gmu, "$1");
      assert.match(
        zonderCommentaar,
        /motorpariteit\s*\(/u,
        `${pad} hoort motorpariteit() werkelijk AAN TE ROEPEN, niet alleen te beschrijven`,
      );
      assert.match(
        zonderCommentaar,
        /process\.exit\(1\)/u,
        `${pad} hoort met exitcode 1 te stoppen, zodat Railway de ronde ROOD toont`,
      );
    }
  });

  test("een vooruit toegepaste 0045 mag, en wordt benoemd", async () => {
    /* De stand tussen een vooruit toegepaste migratie en de codedeploy
       moet BESTAAN, anders kun je 0045 niet los uitrollen — en juist dat
       losse uitrollen is wat de releaseprocedure veilig maakt. */
    const p = await zonderOrganisatie(volledig.pool, (c) => motorpariteit(c));
    assert.equal(p.sluit, true);
    assert.ok(p.bewijs.length > 0, "er hoort altijd een bewijsregel te zijn");
  });
});
