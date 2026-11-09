/* ============================================================
   TOETS — de meldketen van de uitgifte
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET, EN WAAROM EEN ECHTE DATABASE DAARVOOR
   NODIG IS.

   De deduplicatie van een melding zit in een PARTIËLE UNIEKE INDEX
   (migratie 0016) en niet in applicatiecode, en de auditregel van een
   mislukte uitgifte wordt in een TRANSACTIE geschreven. Beide
   eigenschappen bestaan alleen tegen een echte Postgres; een mock zou
   hier groen zijn zonder iets te bewijzen.

   DE BELANGRIJKSTE ZAAK IS ZAAK 6: een meldpad dat GEGARANDEERD faalt
   mag de auditregistratie niet beschadigen. Die wordt twee keer
   gemeten — met het meldpad aangeroepen BINNEN de transactie die de
   auditregels schrijft, en met een meldpad waarvan ook de DATABASEKANT
   kapot is (een pool naar een database die niet bestaat). In beide
   gevallen hoort de auditregel er daarna nog te staan.

   ER GAAT NIETS DE DEUR UIT. Geen echte ontvanger, geen echte webhook,
   geen mailcredential: het afleverpad wordt geïnjecteerd. Zaak 9 toetst
   bovendien dat het STANDAARD pad met het netwerk uit niets probeert,
   zodat een vergeten injectie geen stille HTTPS-aanvraag wordt.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import {
  maakDragendeVersie,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { eenRij, maakPool, metOrganisatie, rijen } from "../../src/kern/db.ts";
import {
  legPublicatieAuditVast,
  legPublicatiebesluitVast,
  systeemActor,
} from "../../src/inhoud/actor.ts";
import {
  leesUitgifteMeldstand,
  meldUitgifteStoring,
  uitgifteMeldconfiguratie,
  uitgifteMeldsleutel,
  UITGIFTE_MELDGROEP,
  type Meldlading,
} from "../../src/uitgifte/melden.ts";

const BELEIDSVERSIE = "meldketen-uitgifte-v1";

/** Elke zaak zet zijn eigen omgeving; dit maakt de lei schoon. */
function omgevingSchoon(): void {
  for (const naam of [
    "INTEL_MELD_WEBHOOK",
    "INTEL_MELD_TOKEN",
    "RESEND_API_KEY",
    "INTEL_MAIL_ONTVANGER",
    "INTEL_MAIL_AFZENDER",
    "INTEL_MAIL_ACTIEF",
    "INTEL_MONITOR_URL",
  ]) {
    delete process.env[naam];
  }
}

describe("meldketen van de uitgifte", () => {
  let db: Wegwerpdatabase;
  let organisatieId = 0;
  let versieId = 0;

  before(async () => {
    db = await maakWegwerpdatabase("uitgiftemelden");
    organisatieId = await maakOrganisatie(db, "vibe-energy");
    const v = await maakDragendeVersie(db, organisatieId, { slug: "meldketen-uitgifte" });
    versieId = v.versieId;
    omgevingSchoon();
  });

  after(async () => {
    omgevingSchoon();
    await db?.opruimen();
  });

  type Rij = {
    id: number;
    sleutel: string;
    groep: string;
    niveau: string;
    ernst: string | null;
    bundel: string | null;
    keren_gezien: number;
    laatste_meting: string;
    laatste_advies: string | null;
    bezorgd_op: string | null;
    bezorgpogingen: number;
    laatste_bezorgfout: string | null;
    bestemming: string | null;
  };

  const meldingen = () =>
    metOrganisatie(db.pool, { organisatieId }, (c) =>
      rijen<Rij>(
        c,
        `select id, sleutel, groep, niveau, ernst, bundel, keren_gezien, laatste_meting,
                laatste_advies, bezorgd_op::text as bezorgd_op, bezorgpogingen,
                laatste_bezorgfout, bestemming
           from intel.meldingen
          where organisatie_id = $1 and groep = $2 and gesloten_op is null
          order by sleutel`,
        [organisatieId, UITGIFTE_MELDGROEP],
      ),
    );

  const eenMelding = async (stap: string): Promise<Rij> => {
    const alle = await meldingen();
    const m = alle.find((x) => x.sleutel === uitgifteMeldsleutel(stap));
    assert.ok(m, `er is geen open melding met sleutel ${uitgifteMeldsleutel(stap)}`);
    return m;
  };

  /** Een afleverpad dat ALTIJD faalt, en dat vastlegt dat het is geprobeerd. */
  function kapotPad(ladingen: Meldlading[]) {
    return async (lading: Meldlading) => {
      ladingen.push(lading);
      throw new Error("de ontvanger weigerde: HTTP 503");
    };
  }

  test("1. een mislukte uitgifte opent een melding met groep, ernst en bundel", async () => {
    const uit = await meldUitgifteStoring(
      db.pool,
      organisatieId,
      {
        inhoudVersieId: versieId,
        stap: "generator",
        fout: "scripts/seo/bouw.mjs gaf exitcode 1 op poort 11",
        beleidVersie: BELEIDSVERSIE,
      },
      { afleverpad: async () => undefined },
    );
    assert.equal(uit.afgeleverd, true, uit.reden);

    const m = await eenMelding("generator");
    assert.equal(m.groep, UITGIFTE_MELDGROEP);
    assert.equal(m.niveau, "FOUT");
    /* DE ERNST IS DE VOORWAARDE WAAROP meldmailRonde() SELECTEERT
       (`ernst is not null`). Zonder ernst zou de melding voor het
       mailkanaal onzichtbaar zijn. En hij hoort FOUT te zijn en niet
       CRITICAL: 'uitgifte' staat buiten de kritieke groepen van
       ops/meldernst.ts. */
    assert.equal(m.ernst, "FOUT");
    assert.equal(m.bundel, `signaal:${UITGIFTE_MELDGROEP}/generator`);
    assert.match(m.laatste_meting, /exitcode 1 op poort 11/);
    assert.match(m.laatste_meting, new RegExp(`inhoudsversie ${versieId}`));
    assert.match(m.laatste_meting, new RegExp(BELEIDSVERSIE));
    assert.ok(m.laatste_advies && m.laatste_advies.includes("fail-closed"));
  });

  test("2. dezelfde stap twee keer DEDUPLICEERT in plaats van te stapelen", async () => {
    const voor = await eenMelding("generator");
    await meldUitgifteStoring(
      db.pool,
      organisatieId,
      {
        inhoudVersieId: versieId,
        /* Andere schrijfwijze, dezelfde stap: de sleutel is
           genormaliseerd, dus dit is één storing en geen twee. */
        stap: "  GENERATOR ",
        fout: "opnieuw gestrand, nu op poort 12",
        beleidVersie: BELEIDSVERSIE,
      },
      { afleverpad: async () => undefined },
    );
    const na = await eenMelding("generator");
    assert.equal(na.id, voor.id, "dezelfde melding, geen tweede rij");
    assert.equal(na.keren_gezien, voor.keren_gezien + 1);
    assert.match(na.laatste_meting, /poort 12/, "de laatste meting hoort bijgewerkt te zijn");
    const alle = await meldingen();
    assert.equal(alle.length, 1, `verwacht één uitgiftemelding, kreeg ${alle.length}`);
  });

  test("3. zonder enig kanaal komt de melding NERGENS aan, en dat staat er ook zo", async () => {
    omgevingSchoon();
    const conf = uitgifteMeldconfiguratie();
    assert.equal(conf.kanWerken, false, "zonder configuratie werkt er geen kanaal");
    assert.ok(
      conf.ontbrekend.includes("INTEL_MELD_WEBHOOK"),
      "de exacte variabelenaam hoort in de ontbrekendlijst te staan",
    );

    const uit = await meldUitgifteStoring(db.pool, organisatieId, {
      inhoudVersieId: versieId,
      stap: "pr",
      fout: "de uitvoerder kon geen pull request openen",
      beleidVersie: BELEIDSVERSIE,
    });
    assert.equal(uit.afgeleverd, false);
    assert.equal(uit.kanaal, "geen");
    assert.match(uit.reden, /INTEL_MELD_WEBHOOK/, "de reden hoort de exacte variabelenaam te noemen");
    assert.match(uit.reden, /NIEMAND/, "een melding die nergens aankomt hoort dat te zeggen");
    /* En de melding staat er wel: zonder bestemming verdwijnt hij niet. */
    const m = await eenMelding("pr");
    assert.equal(m.bezorgd_op, null);
    assert.equal(m.bezorgpogingen, 0, "er is geen poging gedaan, dus de teller blijft 0");
  });

  test("4. een GESLAAGDE aflevering markeert bezorgd_op en wist de laatste fout", async () => {
    const ladingen: Meldlading[] = [];
    const uit = await meldUitgifteStoring(
      db.pool,
      organisatieId,
      {
        inhoudVersieId: versieId,
        stap: "merge",
        fout: "GitHub weigerde de merge: checks niet groen",
        beleidVersie: BELEIDSVERSIE,
      },
      {
        afleverpad: async (l) => {
          ladingen.push(l);
        },
      },
    );
    assert.equal(uit.afgeleverd, true, uit.reden);
    const m = await eenMelding("merge");
    assert.ok(m.bezorgd_op !== null, "een geslaagde aflevering hoort bezorgd_op te zetten");
    assert.equal(m.laatste_bezorgfout, null);
    assert.ok(m.bezorgpogingen >= 1);
    assert.equal(m.bestemming, uit.kanaal, "de bestemming hoort het gebruikte kanaal te zijn");

    /* De LADING draagt wat een ontvanger nodig heeft, met dezelfde
       sleutelnamen als bezorgMeldingen() al post. */
    const l = ladingen[0]!;
    assert.equal(l.signaal, uitgifteMeldsleutel("merge"));
    assert.equal(l.stap, "merge");
    assert.equal(l.niveau, "FOUT");
    assert.equal(l.ernst, "FOUT");
    assert.equal(l.inhoud_versie_id, versieId);
    assert.equal(l.beleid_versie, BELEIDSVERSIE);
    assert.equal(l.melding_id, m.id);
  });

  test("5. een KAPOT afleverpad werpt niet en legt de fout vast", async () => {
    const ladingen: Meldlading[] = [];
    const uit = await meldUitgifteStoring(
      db.pool,
      organisatieId,
      {
        inhoudVersieId: versieId,
        stap: "live",
        fout: "de publieke URL gaf HTTP 404",
        beleidVersie: BELEIDSVERSIE,
      },
      { afleverpad: kapotPad(ladingen) },
    );
    assert.equal(uit.afgeleverd, false);
    assert.match(uit.reden, /HTTP 503/, "de reden van de mislukte aflevering hoort erin te staan");
    assert.equal(ladingen.length, 1, "er is wel geprobeerd");

    const m = await eenMelding("live");
    assert.equal(m.bezorgd_op, null);
    assert.ok(m.laatste_bezorgfout && m.laatste_bezorgfout.includes("HTTP 503"));
    assert.equal(m.bezorgpogingen, 1);
  });

  test("6. EEN MELDFOUT KOST GEEN AUDITREGEL — ook niet binnen dezelfde transactie", async () => {
    /* DE OPZET SPEELT DE PRODUCTIEVORM NA: de auditregels van een
       mislukte uitgifte gaan via legPublicatiebesluitVast() en
       legPublicatieAuditVast() binnen ÉÉN transactie van
       metOrganisatie(). Het meldpad wordt hier BINNEN die transactie
       aangeroepen — de ongunstigste plek — en het faalt gegarandeerd.
       Het mag die transactie niet kunnen laten mislukken en niet kunnen
       terugrollen. */
    const actor = systeemActor("uitgifte:stop", { beleidVersie: BELEIDSVERSIE });
    const ladingen: Meldlading[] = [];
    let binnen = { afgeleverd: true, kanaal: "", reden: "" };

    await metOrganisatie(db.pool, { organisatieId }, async (c) => {
      await legPublicatiebesluitVast(c, {
        organisatieId,
        inhoudVersieId: versieId,
        besluit: "automatisch_geblokkeerd",
        fase: "GEBLOKKEERD",
        actor,
        motivatie: "de uitgifte strandde bij 'generator': toetsopzet van zaak 6",
        meting: { stap: "generator", faseVoorFout: null, gemetenDoor: "toets" },
      });
      await legPublicatieAuditVast(c, {
        organisatieId,
        actor,
        handeling: "uitgifte_mislukt",
        objectId: versieId,
        naWaarde: { stap: "generator", zaak: 6 },
        motivatie: "toetsopzet van zaak 6",
        herkomst: "toets",
      });
      /* Het meldpad, met een eigen verbinding en een gegarandeerd kapot
         afleverpad. GEEN try/catch hier: werpt deze aanroep, dan rolt de
         transactie terug en is de eis geschonden. Dat is precies wat
         deze zaak meet. */
      binnen = await meldUitgifteStoring(
        db.pool,
        organisatieId,
        {
          inhoudVersieId: versieId,
          stap: "zaak6-binnen-transactie",
          fout: "de webhook is kapot",
          beleidVersie: BELEIDSVERSIE,
        },
        { afleverpad: kapotPad(ladingen) },
      );
    });

    assert.equal(binnen.afgeleverd, false, "het meldpad hoorde te falen");
    assert.equal(ladingen.length, 1);

    /* EN NU HET BEWIJS: de auditregels staan er, na de commit. */
    const besluit = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      eenRij<{ n: number; motivatie: string }>(
        c,
        `select count(*)::int as n, max(motivatie) as motivatie
           from intel.publicatiebesluiten
          where organisatie_id = $1 and inhoud_versie_id = $2
            and poortresultaten->>'fase' = 'GEBLOKKEERD'`,
        [organisatieId, versieId],
      ),
    );
    assert.equal(besluit?.n, 1, "de GEBLOKKEERD-regel hoort er te staan");
    assert.match(besluit!.motivatie, /toetsopzet van zaak 6/);
    assert.match(besluit!.motivatie, /uitgifte:stop/, "de grond hoort in de motivatie te staan");

    const audit = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      eenRij<{ n: number }>(
        c,
        `select count(*)::int as n
           from intel.audit_gebeurtenissen
          where organisatie_id = $1 and handeling = 'uitgifte_mislukt'
            and object_id = $2 and motivatie = 'toetsopzet van zaak 6'`,
        [organisatieId, String(versieId)],
      ),
    );
    assert.equal(audit?.n, 1, "de auditregel hoort er te staan");

    /* En de melding zelf is ook geschreven, in zijn EIGEN transactie: de
       mislukking zat in de aflevering en niet in het vastleggen. Dat de
       rij er na de commit van de aanroeper staat, bewijst tegelijk dat
       de twee transacties los van elkaar staan. */
    const m = await eenMelding("zaak6-binnen-transactie");
    assert.match(m.laatste_meting, /de webhook is kapot/);
    assert.ok(
      m.laatste_bezorgfout && m.laatste_bezorgfout.includes("HTTP 503"),
      `de bezorgfout hoort vastgelegd te zijn, kreeg: ${m.laatste_bezorgfout}`,
    );
  });

  test("7. ook een KAPOTTE MELDDATABASE kost geen auditregel", async () => {
    /* De zwaarste variant: niet alleen het afleverpad is stuk, de
       databasekant van het meldpad is onbereikbaar. Een pool naar een
       database die niet bestaat geeft bij connect() een harde fout. Het
       meldpad hoort die te slikken en de aanroeper ongemoeid te laten. */
    const stukkeUrl = (() => {
      const u = new URL(db.url);
      u.pathname = `/${db.naam}_bestaat_niet`;
      return u.toString();
    })();
    const stukkePool = maakPool({ databaseUrl: stukkeUrl, rol: "vibe_intel_app", max: 1 });

    const actor = systeemActor("uitgifte:stop", { beleidVersie: BELEIDSVERSIE });
    let uit = { afgeleverd: true, kanaal: "", reden: "" };
    await metOrganisatie(db.pool, { organisatieId }, async (c) => {
      await legPublicatieAuditVast(c, {
        organisatieId,
        actor,
        handeling: "uitgifte_mislukt",
        objectId: versieId,
        naWaarde: { stap: "generator", zaak: 7 },
        motivatie: "toetsopzet van zaak 7",
        herkomst: "toets",
      });
      uit = await meldUitgifteStoring(
        stukkePool,
        organisatieId,
        {
          inhoudVersieId: versieId,
          stap: "zaak7-database-weg",
          fout: "wat er ook misging",
          beleidVersie: BELEIDSVERSIE,
        },
        { afleverpad: async () => undefined },
      );
    });

    assert.equal(uit.afgeleverd, true, "het afleverpad zelf was in orde");
    assert.match(
      uit.reden,
      /niet in intel\.meldingen worden vastgelegd/,
      `de reden hoort te melden dat het vastleggen mislukte, kreeg: ${uit.reden}`,
    );

    const audit = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      eenRij<{ n: number }>(
        c,
        `select count(*)::int as n
           from intel.audit_gebeurtenissen
          where organisatie_id = $1 and motivatie = 'toetsopzet van zaak 7'`,
        [organisatieId],
      ),
    );
    assert.equal(audit?.n, 1, "de auditregel hoort er te staan ondanks de kapotte melddatabase");

    await stukkePool.end().catch(() => undefined);
  });

  test("8. de pogingengrens stopt het bestoken van een kapotte bestemming", async () => {
    const ladingen: Meldlading[] = [];
    for (let i = 0; i < 4; i += 1) {
      await meldUitgifteStoring(
        db.pool,
        organisatieId,
        {
          inhoudVersieId: versieId,
          stap: "zaak8-grens",
          fout: `poging ${i}`,
          beleidVersie: BELEIDSVERSIE,
        },
        { afleverpad: kapotPad(ladingen), maxPogingen: 2 },
      );
    }
    const m = await eenMelding("zaak8-grens");
    assert.equal(m.bezorgpogingen, 2, `pogingen begrensd op 2, kreeg ${m.bezorgpogingen}`);
    assert.equal(ladingen.length, 2, "er horen precies twee afleverpogingen te zijn gedaan");
    assert.ok(m.laatste_bezorgfout !== null, "de melding blijft staan met zijn laatste fout");
    /* En de melding is wél elke ronde bijgewerkt: de storing is vier keer
       gezien, ook al is er twee keer afgeleverd geprobeerd. */
    assert.equal(m.keren_gezien, 4);
  });

  test("9. met het netwerk uit probeert het STANDAARD pad niets", async () => {
    /* Zonder injectie zou een vergeten mock een echte HTTPS-aanvraag
       worden. De netwerknoodstop (INTEL_NETWERK_TOEGESTAAN=0, door
       test/netwerk-uit.ts en het harnas gezet) hoort dat tegen te
       houden, met een leesbare reden in plaats van een stille poging. */
    assert.equal(process.env["INTEL_NETWERK_TOEGESTAAN"], "0", "het harnas hoort het netwerk uit te zetten");
    process.env["INTEL_MELD_WEBHOOK"] = "https://voorbeeld.invalid/hook";
    try {
      const uit = await meldUitgifteStoring(db.pool, organisatieId, {
        inhoudVersieId: versieId,
        stap: "zaak9-netwerk-uit",
        fout: "er moest iets gemeld worden",
        beleidVersie: BELEIDSVERSIE,
      });
      assert.equal(uit.afgeleverd, false);
      assert.match(uit.kanaal, /^webhook voorbeeld\.invalid$/);
      assert.match(uit.reden, /INTEL_NETWERK_TOEGESTAAN/);
    } finally {
      omgevingSchoon();
    }
  });

  test("10. een afleverpad dat blijft hangen of synchroon gooit, hangt de uitgifte niet op", async () => {
    const begin = Date.now();
    const hangend = await meldUitgifteStoring(
      db.pool,
      organisatieId,
      {
        inhoudVersieId: versieId,
        stap: "zaak10-hangend",
        fout: "de ontvanger antwoordt nooit",
        beleidVersie: BELEIDSVERSIE,
      },
      { afleverpad: () => new Promise<void>(() => undefined), tijdslimietMs: 60 },
    );
    const duur = Date.now() - begin;
    assert.equal(hangend.afgeleverd, false);
    assert.match(hangend.reden, /geen antwoord/);
    assert.ok(duur < 5_000, `de aanroep duurde ${duur} ms; de tijdslimiet hoort hem af te kappen`);

    /* En een pad dat SYNCHROON gooit levert geen belofte op; dat mag
       evenmin naar de aanroeper ontsnappen. */
    const synchroon = await meldUitgifteStoring(
      db.pool,
      organisatieId,
      {
        inhoudVersieId: versieId,
        stap: "zaak10-synchroon",
        fout: "de ontvanger bestaat niet",
        beleidVersie: BELEIDSVERSIE,
      },
      {
        afleverpad: (() => {
          throw new Error("synchrone stuk");
        }) as never,
      },
    );
    assert.equal(synchroon.afgeleverd, false);
    assert.match(synchroon.reden, /synchrone stuk/);
  });

  test("11. een geheim in de fouttekst wordt geredigeerd vóór opslag en verzending", async () => {
    const ladingen: Meldlading[] = [];
    await meldUitgifteStoring(
      db.pool,
      organisatieId,
      {
        inhoudVersieId: versieId,
        stap: "zaak11-geheim",
        /* DEZE REGEL MOET CREDENTIALVORM HEBBEN, anders toetst de zaak
           niets: het hele punt is dat redigeer() hem uit de database, uit
           het log en uit de lading haalt. De markering hieronder is het
           bedoelde mechanisme van ops/geheimenscan.mjs — per REGEL en met
           een reden, zodat een echt geheim dat hier later belandt alsnog
           wordt gevonden. */
        // geheimenscan: ok — verzonnen verbindingsreeks naar een niet bestaande host
        fout: "pg_dump faalde: postgresql://vibe:hetgeheimpje@db.intern:5432/intel",
        beleidVersie: BELEIDSVERSIE,
      },
      {
        afleverpad: async (l) => {
          ladingen.push(l);
        },
      },
    );
    const m = await eenMelding("zaak11-geheim");
    assert.ok(
      !m.laatste_meting.includes("hetgeheimpje"),
      `het geheim staat in de database: ${m.laatste_meting}`,
    );
    assert.ok(
      !ladingen[0]!.meting.includes("hetgeheimpje"),
      "het geheim hoort ook niet over de lijn te gaan",
    );
  });

  test("12. de configuratiemeting noemt de kanalen en de exacte variabelenamen", async () => {
    omgevingSchoon();
    const uit = uitgifteMeldconfiguratie();
    const namen = uit.variabelen.map((v) => v.naam);
    for (const naam of [
      "INTEL_MELD_WEBHOOK",
      "INTEL_MELD_TOKEN",
      "RESEND_API_KEY",
      "INTEL_MAIL_ONTVANGER",
      "INTEL_MAIL_AFZENDER",
      "INTEL_MAIL_ACTIEF",
      "INTEL_MONITOR_URL",
    ]) {
      assert.ok(namen.includes(naam), `${naam} hoort in het variabelenregister te staan`);
    }
    assert.equal(uit.variabelen.every((v) => v.gezet === false), true, "niets is gezet in deze toets");
    /* De optionele variabelen horen NIET als ontbrekend te gelden: een
       leeg token is een geldige stand. */
    assert.ok(!uit.ontbrekend.includes("INTEL_MELD_TOKEN"));
    assert.ok(!uit.ontbrekend.includes("INTEL_MONITOR_URL"));

    const webhook = uit.kanalen.find((k) => k.kanaal === "webhook")!;
    assert.equal(webhook.werkt, false);
    assert.equal(webhook.directAflevert, true, "alleen de webhook levert tijdens de uitgifte af");
    const mail = uit.kanalen.find((k) => k.kanaal === "mail")!;
    assert.equal(mail.directAflevert, false, "de mail gaat via de meldmailronde en dus later");

    /* Met een http-URL blijft het kanaal UIT: een melding gaat niet over
       http. Die regel staat in ops/melden.ts en wordt hier niet
       nagebouwd — deze zaak bewijst dat hij geldt. */
    process.env["INTEL_MELD_WEBHOOK"] = "http://voorbeeld.invalid/hook";
    try {
      assert.equal(uitgifteMeldconfiguratie().kanalen[0]!.werkt, false);
    } finally {
      omgevingSchoon();
    }
  });

  test("13. de meldstand voor het scherm leest dezelfde rijen terug", async () => {
    const stand = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      leesUitgifteMeldstand(c, organisatieId),
    );
    assert.ok(stand.openTotaal >= 1);
    assert.equal(stand.totaal, stand.openTotaal, "in deze toets is nog niets gesloten");
    assert.ok(
      stand.open.some((m) => m.sleutel === uitgifteMeldsleutel("merge")),
      "de bezorgde melding hoort in de stand te staan",
    );
    assert.ok(stand.laatstBezorgd !== null, "zaak 4 leverde af, dus er is een laatste aflevering");
    assert.ok(stand.metBezorgfout >= 1, "zaak 5 en 8 lieten een bezorgfout achter");
    /* Zonder mailkanaal is er geen enkel meldbericht, en dat hoort null
       te zijn en niet een bericht over iets anders. */
    assert.equal(stand.mail, null);
  });
});
